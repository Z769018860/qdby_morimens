// Waline v3 兼容层 —— 只实现忘忘看报真正用到的子集，存储复用本站 Blob（blobKV）
//
// 为什么不用官方 Waline 服务端：它原来跑在 Vercel 上，2026-11-27 因免费额度超额被平台暂停
// （全路径 402 DEPLOYMENT_DISABLED，连后台都进不去）。本站已经有 EdgeOne Blob + 一套
// 「读改写计数器」的成熟范式（见 hragg_ 那套），评论与赞踩的量级完全吃得下，还能和页面同域。
//
// 端点（Waline 客户端会把 serverURL 拼成 `${serverURL}/api/xxx`，所以下面两种前缀都认）：
//   GET  /waline/article?path=a,b&type=reaction0,reaction1   → 按 path 顺序返回计数
//   POST /waline/article {path,type,action}                  → 改一个计数并返回
//   GET  /waline/comment?path=&page=&pageSize=&sortBy=       → 分页列表
//   GET  /waline/comment?type=recent&count=50                → 全站最新 N 条（数组）
//   POST /waline/comment {...}                               → 提交评论
//   GET  /waline/user                                        → 空用户（本站关闭登录）
//   POST /waline/token                                       → 明确拒绝（login:'disable' 不会走到）
//
// 键（Blob 只认字母数字下划线，path 一律先散列）：
//   wa_{h}          = {time, reaction0..reaction9}   文章计数（PV 用 type=time）
//   wad_{h}_{vh}    = '0'|'1'                        这个访客对该 path 的 reaction，防重复
//   wc_{h}          = {v,n,list:[评论]}               该 path 的评论，新的在前
//   wcr             = [最近 100 条精简评论]            首页「最新留言」用
//   wlq_{vh}_{day}  = 当天提交条数                     限流
//
// 两个必须顺着的存储脾气（与主站一致）：
//   1. 没有原子自增：读改写在并发下可能丢一次，评论/赞踩量级小，可接受；
//   2. 最终一致：显示用计数读可以吃边缘缓存（opt.weak），写完立刻读自己的结果仍是最新的。

const MAX_BODY = 64 * 1024;
const PAGE_MAX = 100;
const TEXT_MAX = 20000;     // 结构化提交（融灾/互助）是 base64，比普通留言长得多
const LIST_CAP = 800;       // 单个 path 最多留多少条，超了丢最旧的
const RECENT_CAP = 100;
const DAILY_MAX = 40;       // 同一访客每天最多提交多少条
const ART_MAX = 50;         // 一次 GET 最多查多少个 path

const now = () => Date.now();

// ------------------------------------------------------------------ 小工具
function json(payload, status, cors) {
  return new Response(JSON.stringify(payload), {
    status: status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(cors || {}),
    },
  });
}

// Waline 的约定：成功 errno=0，失败 errno 非 0（前端按这个判断，不只看 HTTP 码）
// Waline 的约定：成功 errno=0，失败 errno 非 0（前端按这个判断，不只看 HTTP 码）。
// 注意 errno 有时是 1000 这种业务码，不能直接当 HTTP 状态用，否则 Response 构造会抛错。
const ok = (data, cors) => json({ errno: 0, errmsg: '', data }, 200, cors);
const fail = (code, message, cors) => json(
  { errno: code, errmsg: message, data: null },
  code >= 400 && code <= 599 ? code : 200,
  cors,
);

const str = (v, max) => String(v == null ? '' : v).slice(0, max);

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 各命名空间加前缀再散列，避免同一个字符串在不同表里撞 key
const H = (kind, v) => sha256(kind + ':' + v);

const dayKeyFlat = () => new Date(now() + 8 * 3600e3).toISOString().slice(0, 10).replace(/-/g, '');

// path 归一：去掉查询串和尾部斜杠，`/a/` 与 `/a` 视为同一个
function normPath(p) {
  return String(p || '/').split('?')[0].replace(/\/+$/, '') || '/';
}

async function readJson(request, limit = MAX_BODY) {
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > limit) throw Object.assign(new Error('too_large'), { status: 413 });
  const text = await request.text();
  if (text.length > limit) throw Object.assign(new Error('too_large'), { status: 413 });
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' ? v : {};
  } catch {
    throw Object.assign(new Error('bad_json'), { status: 400 });
  }
}

// 访客身份：IP + UA 散列。不存原值，只留指纹，用来做 reaction 去重与提交限流。
async function visitorOf(request) {
  const ip = str(request.headers.get('EO-Connecting-IP')
    || request.headers.get('CF-Connecting-IP')
    || (request.headers.get('X-Forwarded-For') || '').split(',')[0], 64).trim();
  const ua = str(request.headers.get('User-Agent'), 200);
  return H('vh', ip + '|' + ua);
}

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 渲染成 HTML：先转义，换行转 <br>。
// 但 <!--machine payload--> 这段要原样保留 —— 融灾/互助提交把结构化数据藏在注释里，
// 前端要从 DOM 里把它读回来，转义了就成可见文本了。
function renderComment(raw) {
  const holes = [];
  let out = String(raw || '').replace(/<!--[\s\S]*?-->/g, (m) => {
    holes.push(m);
    return `\u0000${holes.length - 1}\u0000`;
  });
  out = escapeHtml(out).replace(/\r\n|\r|\n/g, '<br>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => holes[Number(i)]);
}

async function readObj(kv, key, weak) {
  try {
    const v = await kv.get(key, { type: 'json', weak: Boolean(weak) });
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

const writeObj = (kv, key, value) => kv.put(key, JSON.stringify(value));

// 有上限的并发：Blob 每次强一致读都是一次回源
async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, list.length) }, async () => {
    for (;;) {
      const k = i++;
      if (k >= list.length) return;
      out[k] = await fn(list[k], k);
    }
  }));
  return out;
}

// ------------------------------------------------------------------ MD5 / phpass
// Waline 的密码用的是 phpass 的 Portable 模式（库里形如 `$P$B<8 字符 salt><22 字符 hash>`），
// 底层是「md5(salt+password) 再循环 md5(hash+password) 2^cost 次」。WebCrypto 不提供 MD5，
// 只能自己实现一份 —— 迁移时老用户才能用原密码登录。
const MD5_S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
const MD5_K = new Uint32Array(64);
for (let i = 0; i < 64; i++) MD5_K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;

function md5(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(String(input));
  const len = bytes.length;
  const total = (((len + 8) >> 6) + 1) * 64;
  const buf = new Uint8Array(total);
  buf.set(bytes);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  const bits = len * 8;
  dv.setUint32(total - 8, bits >>> 0, true);
  dv.setUint32(total - 4, Math.floor(bits / 4294967296) >>> 0, true);

  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  const M = new Uint32Array(16);

  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) M[i] = dv.getUint32(off + i * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F, g;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) & 15; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) & 15; }
      else { F = C ^ (B | ~D); g = (7 * i) & 15; }
      F = (F + A + MD5_K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      B = (B + (((F << MD5_S[i]) | (F >>> (32 - MD5_S[i]))) >>> 0)) >>> 0;
    }
    a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
  }

  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  odv.setUint32(0, a0, true);
  odv.setUint32(4, b0, true);
  odv.setUint32(8, c0, true);
  odv.setUint32(12, d0, true);
  return out;
}

const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// phpass 自己的 base64：每 3 字节吐 4 字符，字母表与标准 base64 不同
function phpEncode64(input, count) {
  let out = '';
  let i = 0;
  do {
    let value = input[i++];
    out += ITOA64[value & 0x3f];
    if (i < count) value |= input[i] << 8;
    out += ITOA64[(value >> 6) & 0x3f];
    if (i++ >= count) break;
    if (i < count) value |= input[i] << 16;
    out += ITOA64[(value >> 12) & 0x3f];
    if (i++ >= count) break;
    out += ITOA64[(value >> 18) & 0x3f];
  } while (i < count);
  return out;
}

// 把 password 拼在 16 字节 hash 后面（md5 的输入既有二进制也有字符串）
function md5OfHashAndPassword(hash, password) {
  const pwd = new TextEncoder().encode(password);
  const buf = new Uint8Array(hash.length + pwd.length);
  buf.set(hash);
  buf.set(pwd, hash.length);
  return md5(buf);
}

function phpassCrypt(password, setting, delta = 0) {
  const s = String(setting || '');
  const id = s.slice(0, 3);
  if (id !== '$P$' && id !== '$H$') return null;
  const countLog2 = ITOA64.indexOf(s[3]);
  if (countLog2 < 7 || countLog2 > 30) return null;
  const salt = s.slice(4, 12);
  if (salt.length !== 8) return null;

  // PHP 的 do { } while (--$count) 实际是 2^log2 次「额外」迭代。
  // 不同移植对边界的理解不一致（见过少算一轮的），所以 delta 允许校准，
  // 验证时两种都试一遍，老库里的哈希才不会因为差一轮就全员登不上。
  const rounds = Math.max(0, (1 << countLog2) + delta);
  let hash = md5(salt + password);
  for (let i = 0; i < rounds; i++) hash = md5OfHashAndPassword(hash, password);

  return s.slice(0, 12) + phpEncode64(hash, 16);
}

function phpassHash(password, log2 = 8) {
  const rnd = new Uint8Array(6);
  crypto.getRandomValues(rnd);
  const salt = phpEncode64(rnd, 6).slice(0, 8);
  const setting = '$P$' + ITOA64[Math.min(log2 + 5, 30)] + salt;
  return phpassCrypt(password, setting);
}

function phpVerify(password, stored) {
  const s = String(stored || '');
  if (!s) return false;
  // 理论上都该是 $P$，但历史上也见过明文/其它格式，退一步认
  if (s[0] !== '$') return s === String(password);
  if (phpassCrypt(password, s, 0) === s) return true;
  // 少数移植少算一轮，兜一下（旧库可能是那种实现生成的）
  if (phpassCrypt(password, s, -1) === s) return true;
  return false;
}

// ------------------------------------------------------------------ 令牌（自签 HMAC，不用 JWT 库）
const b64url = (bytes) => btoa(String.fromCharCode(...bytes))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function b64urlDecode(text) {
  const s = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  return Uint8Array.from(atob(s + pad), (c) => c.charCodeAt(0));
}

async function hmacSha256(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

// 密钥优先取 env；没配就生成一次存进存储（重启/换实例后仍能验旧票）
async function tokenSecret(env, kv) {
  const fromEnv = String((env && env.WALINE_JWT_SECRET) || '');
  if (fromEnv) return fromEnv;
  let s = await kv.get('wt_secret');
  if (!s) {
    const rnd = new Uint8Array(32);
    crypto.getRandomValues(rnd);
    s = [...rnd].map((b) => b.toString(16).padStart(2, '0')).join('');
    await kv.put('wt_secret', s);
  }
  return String(s);
}

const TOKEN_TTL = 90 * 86400e3;

async function signToken(uid, name, env, kv) {
  const payload = { u: String(uid), n: String(name || ''), e: now() + TOKEN_TTL };
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await hmacSha256(await tokenSecret(env, kv), body);
  return body + '.' + b64url(sig);
}

async function verifyToken(token, env, kv) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const expect = b64url(await hmacSha256(await tokenSecret(env, kv), parts[0]));
  if (expect !== parts[1]) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    if (!payload || !payload.u) return null;
    if (Number(payload.e) && Number(payload.e) < now()) return null;
    return payload;
  } catch {
    return null;
  }
}

const bearerOf = (request) => {
  const raw = String(request.headers.get('Authorization') || '');
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  return m ? m[1].trim() : '';
};

// ------------------------------------------------------------------ 用户
// 小游戏站的账号是「昵称 → <name>@zjtt.local」的伪邮箱，和其它站的真实邮箱共用一张表。
// 键：wu_{email 散列} = {id,email,name,pass,type,url,avatar,at}；wu_id_{id} = email 散列
const emailHash = (email) => H('u', String(email || '').trim().toLowerCase());

async function userByEmail(kv, email) {
  return await readObj(kv, 'wu_' + await emailHash(email));
}

async function userById(kv, id) {
  const eh = await kv.get('wu_id_' + String(id));
  if (!eh) return null;
  return await readObj(kv, 'wu_' + eh);
}

async function nextUserId(kv) {
  const cur = Number(await kv.get('wu_seq')) || 0;
  const id = cur + 1;
  await kv.put('wu_seq', String(id));
  return id;
}

function publicUser(u) {
  if (!u) return {};
  return {
    objectId: u.id,
    display_name: u.name || '',
    email: u.email || '',
    type: u.type || 'guest',
    url: u.url || '',
    avatar: u.avatar || '',
    createdAt: u.at || '',
  };
}

// POST /waline/user —— 注册
async function registerUser(request, kv, cors) {
  const b = await readJson(request, 16 * 1024);
  const email = str(b.email, 255).trim();
  const password = String(b.password == null ? '' : b.password);
  const name = str(b.name || b.display_name, 255).trim();
  const url = str(b.url, 255).trim();

  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) return fail(1000, 'INVALID_EMAIL', cors);
  if (password.length < 6) return fail(1000, 'PASSWORD_TOO_SHORT', cors);

  const vh = await visitorOf(request);
  const qkey = 'wuq_' + vh + '_' + dayKeyFlat();
  const used = Number(await kv.get(qkey)) || 0;
  if (used >= 20) return fail(1000, 'TOO_MANY_ACCOUNTS', cors);

  const eh = await emailHash(email);
  const exists = await readObj(kv, 'wu_' + eh);
  if (exists) return fail(1000, 'USER_EXIST', cors);

  const id = await nextUserId(kv);
  const rec = {
    id,
    email,
    name: name || email.split('@')[0],
    pass: phpassHash(password),
    type: 'guest',
    url,
    avatar: '',
    at: new Date(now()).toISOString(),
  };
  await writeObj(kv, 'wu_' + eh, rec);
  await kv.put('wu_id_' + id, eh);
  await kv.put(qkey, String(used + 1));

  return ok(publicUser(rec), cors);
}

// POST /waline/token —— 登录（返回 data 里同时带 token，小游戏前端就是按这个解析的）
async function loginUser(request, env, kv, cors) {
  const b = await readJson(request, 16 * 1024);
  const email = str(b.email, 255).trim();
  const password = String(b.password == null ? '' : b.password);
  if (!email || !password) return fail(1000, 'INCORRECT_EMAIL_PASSWORD', cors);

  const rec = await userByEmail(kv, email);
  if (!rec || !phpVerify(password, rec.pass)) {
    return fail(1000, 'INCORRECT_EMAIL_PASSWORD', cors);
  }

  const token = await signToken(rec.id, rec.name, env, kv);
  return ok({ ...publicUser(rec), token }, cors);
}

// GET /waline/token —— 验票（小游戏后端的 whoami 打的就是这个）
async function whoAmI(request, env, kv, cors) {
  const payload = await verifyToken(bearerOf(request), env, kv);
  if (!payload) return ok({}, cors);
  const rec = await userById(kv, payload.u);
  if (!rec) return ok({}, cors);
  return ok(publicUser(rec), cors);
}

// PUT /waline/user —— 改资料（小游戏注册后会补一次 display_name）
async function updateUser(request, env, kv, cors) {
  const payload = await verifyToken(bearerOf(request), env, kv);
  if (!payload) return fail(1000, 'NEED_LOGIN', cors);
  const rec = await userById(kv, payload.u);
  if (!rec) return fail(1000, 'NEED_LOGIN', cors);

  const b = await readJson(request, 16 * 1024);
  if (b.display_name != null) {
    const name = str(b.display_name, 255).trim();
    if (name) rec.name = name;
  }
  if (b.url != null) rec.url = str(b.url, 255);
  if (b.avatar != null) rec.avatar = str(b.avatar, 512);
  if (b.password != null && String(b.password).length >= 6) {
    rec.pass = phpassHash(String(b.password));
  }
  await writeObj(kv, 'wu_' + await emailHash(rec.email), rec);
  return ok(publicUser(rec), cors);
}

async function deleteUser(request, env, kv, cors) {
  const payload = await verifyToken(bearerOf(request), env, kv);
  if (!payload) return fail(1000, 'NEED_LOGIN', cors);
  const rec = await userById(kv, payload.u);
  if (!rec) return ok({}, cors);
  const eh = await emailHash(rec.email);
  await kv.delete('wu_' + eh);
  await kv.delete('wu_id_' + String(rec.id));
  return ok({}, cors);
}


async function getArticle(url, kv, cors) {
  const paths = [...new Set(String(url.searchParams.get('path') || '')
    .split(',').map((x) => normPath(x.trim())).filter(Boolean))].slice(0, ART_MAX);
  const types = String(url.searchParams.get('type') || '')
    .split(',').map((x) => x.trim()).filter(Boolean);

  if (!paths.length) return ok([], cors);

  const rows = await mapLimit(paths, 8, async (p) => {
    const key = 'wa_' + await H('w', p);
    const row = await readObj(kv, key, true);
    const base = { time: Number(row && row.time) || 0 };
    if (types.length) {
      for (const t of types) base[t] = Number(row && row[t]) || 0;
    } else {
      for (let i = 0; i < 10; i++) {
        const k = 'reaction' + i;
        if (row && row[k] != null) base[k] = Number(row[k]) || 0;
      }
    }
    base.objectId = p;
    base.url = p;
    return base;
  });

  return ok(rows, cors);
}

// 只允许这几个 type 落地，别让请求体随便造键把存储写脏
const ART_TYPES = new Set(['time', ...Array.from({ length: 10 }, (_, i) => 'reaction' + i)]);

async function postArticle(request, kv, cors) {
  const b = await readJson(request);
  const path = normPath(str(b.path, 512).trim());
  const type = str(b.type, 24).trim();
  const action = str(b.action, 16).trim() || 'inc';

  if (!path) return fail(400, 'missing_path', cors);
  if (!ART_TYPES.has(type)) return fail(400, 'bad_type', cors);

  const key = 'wa_' + await H('w', path);
  const cur = (await readObj(kv, key)) || {};
  const row = { ...cur };
  row.time = Number(row.time) || 0;

  if (type === 'time') {
    if (action !== 'desc') row.time += 1;
  } else {
    // reaction 去重：同一个访客对同一个 path 只保留一种态度
    const vh = await visitorOf(request);
    const dkey = 'wad_' + await H('w', path) + '_' + vh;
    const prev = await kv.get(dkey);
    const want = type.replace('reaction', '');
    row[type] = Math.max(0, Number(row[type]) || 0);

    if (action === 'desc') {
      if (prev === want) {
        row[type] = Math.max(0, row[type] - 1);
        await kv.delete(dkey);
      }
    } else if (prev !== want) {
      // 之前点过另一种态度，先把它撤掉再记新的
      if (prev) {
        const pk = 'reaction' + prev;
        row[pk] = Math.max(0, Number(row[pk]) || 0) - 1;
      }
      row[type] += 1;
      await kv.put(dkey, want);
    }
  }

  await writeObj(kv, key, row);
  const out = { objectId: path, url: path, time: row.time };
  for (let i = 0; i < 10; i++) {
    const k = 'reaction' + i;
    if (row[k] != null) out[k] = Number(row[k]) || 0;
  }
  return ok([out], cors);
}

// ------------------------------------------------------------------ 评论
// Waline 的语义：count / 分页都只算「顶层评论」，回复挂在 children 里。
// 存储是平铺的（方便导入去重），所以这里先挑顶层、再按页取、最后把回复挂回去。
function pageOf(doc, url) {
  const list = Array.isArray(doc && doc.list) ? doc.list : [];
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(PAGE_MAX, Math.max(1, Number(url.searchParams.get('pageSize')) || 10));
  const sortBy = str(url.searchParams.get('sortBy'), 24).trim() || 'insertedAt_desc';

  const byId = new Map();
  for (const c of list) byId.set(Number(c.objectId), c);

  // Waline 客户端对字符串才做 new Date()，数字会直接当 Date 用（NaN），
  // 所以对外一律给 ISO 字符串，排序时再解析回时间（objectId 是毫秒戳，可兜底）。
  const when = (c) => Date.parse(c.insertedAt) || Number(c.objectId) || 0;
  const compare = (a, b) => {
    if (sortBy === 'insertedAt_asc') return when(a) - when(b);
    if (sortBy === 'like_desc') return (Number(b.like) || 0) - (Number(a.like) || 0);
    return when(b) - when(a);
  };

  // 没有 pid，或父已经被 LIST_CAP 截掉了，都算顶层
  const tops = list.filter((c) => !c.pid || !byId.has(Number(c.pid))).sort(compare);
  const start = (page - 1) * pageSize;
  const pageTops = tops.slice(start, start + pageSize);

  const wanted = new Set(pageTops.map((c) => Number(c.objectId)));
  const data = pageTops.map((c) => ({ ...c, children: [] }));
  const dataById = new Map(data.map((c) => [Number(c.objectId), c]));

  for (const c of list) {
    const pid = Number(c.pid) || 0;
    if (!pid || !wanted.has(pid)) continue;
    const parent = dataById.get(pid);
    if (parent) parent.children.push({ ...c, children: [] });
  }
  for (const c of data) c.children.sort((a, b) => when(a) - when(b));

  return { page, pageSize, count: tops.length, total: tops.length, data };
}

async function listComments(url, kv, cors) {
  // 全站最新 N 条：只看精简索引，别去翻每个 path
  if (String(url.searchParams.get('type') || '') === 'recent') {
    const count = Math.min(50, Math.max(1, Number(url.searchParams.get('count')) || 10));
    const recent = (await readObj(kv, 'wcr', true)) || [];
    return ok(Array.isArray(recent) ? recent.slice(0, count) : [], cors);
  }

  const path = normPath(str(url.searchParams.get('path') || '/', 512));
  const doc = await readObj(kv, 'wc_' + await H('c', path));
  return ok(pageOf(doc, url), cors);
}

async function addComment(request, kv, cors) {
  const b = await readJson(request);
  const path = normPath(str(b.url || b.path || '/', 512));
  const raw = str(b.comment, TEXT_MAX).trim();
  if (!raw) return fail(400, 'empty_comment', cors);

  const vh = await visitorOf(request);
  const qkey = 'wlq_' + vh + '_' + dayKeyFlat();
  const used = Number(await kv.get(qkey)) || 0;
  if (used >= DAILY_MAX) return fail(429, 'too_many_comments', cors);

  const nick = str(b.nick, 40).trim() || '匿名';
  const mail = str(b.mail, 120).trim();
  const link = str(b.link, 200).trim();
  // 时间戳当 id：天然有序，同毫秒撞了就往后退一位
  let id = now();
  const existing = (await readObj(kv, 'wc_' + await H('c', path))) || { v: 1, n: 0, list: [] };
  const list = Array.isArray(existing.list) ? existing.list : [];
  while (list.some((c) => Number(c.objectId) === id)) id += 1;

  const row = {
    objectId: id,
    nick,
    mail,
    link,
    url: path,
    avatar: '',
    comment: renderComment(raw),
    orig: raw,
    time: id,
    createdAt: new Date(id).toISOString(),
    insertedAt: new Date(id).toISOString(),
    status: 'approved',
    sticky: false,
    like: 0,
    ua: str(request.headers.get('User-Agent'), 200),
    children: [],
    pid: b.pid != null ? Number(b.pid) || null : null,
    rid: b.rid != null ? Number(b.rid) || null : null,
  };

  // 平铺存储（读取时按 pid 组楼，见 nest()）：导入去重和分页都简单得多
  list.unshift(row);
  while (list.length > LIST_CAP) list.pop();

  await writeObj(kv, 'wc_' + await H('c', path), { v: 1, n: (Number(existing.n) || 0) + 1, list });
  await kv.put(qkey, String(used + 1));

  // 全站最新索引（首页只显示人写的话，机器提交不进去占位置）
  const isMachine = /MORIMENS_[A-Z_]+_V\d+:/.test(raw);
  if (!isMachine) {
    const recent = (await readObj(kv, 'wcr')) || [];
    const slim = {
      objectId: id, nick, url: path, avatar: '', link,
      comment: row.comment, orig: raw,
      time: id, createdAt: row.createdAt, insertedAt: row.insertedAt,
      like: 0, status: 'approved', sticky: false, children: [],
    };
    const next = [slim, ...(Array.isArray(recent) ? recent : []).filter((x) => Number(x.objectId) !== id)]
      .slice(0, RECENT_CAP);
    await writeObj(kv, 'wcr', next);
  }

  return ok(row, cors);
}

// ------------------------------------------------------------------ 全站最新索引
// 扫全部 wc_ 键重建 wcr。导入收尾与清理都要用，抽出来避免两处逻辑漂移。
// 机器提交（MORIMENS_*_V1: 这类 payload）不进「最新留言」，留言板不该显示它们。
async function rebuildRecent(kv) {
  let keys = [];
  try { keys = await kv.list('wc_'); } catch { keys = []; }
  const all = [];
  await mapLimit(keys.slice(0, 500), 6, async (key) => {
    const doc = await readObj(kv, key, true);
    for (const c of (doc && Array.isArray(doc.list) ? doc.list : [])) {
      if (/MORIMENS_[A-Z_]+_V\d+:/.test(String(c.orig || ''))) continue;
      all.push({
        objectId: c.objectId, nick: c.nick, url: c.url, avatar: '',
        link: c.link, comment: c.comment, orig: c.orig,
        time: Date.parse(c.insertedAt) || Number(c.objectId) || 0,
        createdAt: c.createdAt, insertedAt: c.insertedAt,
        like: c.like || 0, status: 'approved', sticky: Boolean(c.sticky), children: [],
      });
    }
  });
  all.sort((a, b2) => (Date.parse(b2.insertedAt) || 0) - (Date.parse(a.insertedAt) || 0));
  const top = all.slice(0, RECENT_CAP);
  await writeObj(kv, 'wcr', top);
  return top.length;
}

// ------------------------------------------------------------------ 一次性导入（历史数据）
// 老 Waline 库导出的 JSON 分批灌进来，必须带 X-Import-Token（对应 env WALINE_IMPORT_TOKEN）。
// 这条路径能改写全部评论，绝不能留无鉴权的口子；没配 token 就直接 503。
// 幂等：按原 objectId 去重，重复投同一批不会产生重复楼层。
async function importDump(request, env, kv, cors) {
  const want = String((env && env.WALINE_IMPORT_TOKEN) || '');
  if (!want) return fail(503, 'import_disabled', cors);
  const got = String(request.headers.get('X-Import-Token') || '');
  if (got.length !== want.length || got !== want) return fail(401, 'bad_import_token', cors);

  const b = await readJson(request, 8 * 1024 * 1024);
  const comments = Array.isArray(b.comments) ? b.comments.slice(0, 200) : [];
  const counters = Array.isArray(b.counters) ? b.counters.slice(0, 200) : [];
  const users = Array.isArray(b.users) ? b.users.slice(0, 100) : [];
  const finalize = Boolean(b.finalize);

  // 清理：{"purge":["/__probe__"]}，删掉这些 path 下的全部评论、点赞记录与计数。
  // 只给迁移/排障用，同样受 X-Import-Token 保护；删完请顺带传 finalize:true 重建 recent 索引。
  const purgePaths = Array.isArray(b.purge)
    ? b.purge.map((p) => normPath(str(p, 512))).filter(Boolean).slice(0, 20)
    : [];
  let purged = 0;
  for (const p of purgePaths) {
    const h = await H('c', p);
    const doc = await readObj(kv, 'wc_' + h);
    if (doc) purged += Array.isArray(doc.list) ? doc.list.length : 0;
    await kv.delete('wc_' + h);
    await kv.delete('wa_' + await H('w', p));
    // 顺手清掉访客的点赞去重痕迹，别留孤儿键
    let dkeys = [];
    try { dkeys = await kv.list('wad_' + h + '_'); } catch { dkeys = []; }
    for (const k of dkeys.slice(0, 500)) await kv.delete(typeof k === 'string' ? k : k.key);
  }

  // 清理测试账号：{"purgeUsers":["probebot@zjtt.local"]}
  // 必须在导入之前跑 —— 否则测试账号占掉的 id=1 会和旧库里的真实用户（通常就是管理员）撞号。
  const purgeEmails = Array.isArray(b.purgeUsers)
    ? b.purgeUsers.map((x) => String(x || '').trim().toLowerCase()).filter(Boolean).slice(0, 20)
    : [];
  let purgedUsers = 0;
  if (purgeEmails.length) {
    for (const email of purgeEmails) {
      const key = 'wu_' + await emailHash(email);
      const rec = await readObj(kv, key);
      if (!rec) continue;
      await kv.delete(key);
      if (rec.id != null) await kv.delete('wu_id_' + rec.id);
      purgedUsers++;
    }
    // id 序列按剩下的用户重算，别让删掉的号被重复发放
    let maxId = 0;
    let idKeys = [];
    try { idKeys = await kv.list('wu_id_'); } catch { idKeys = []; }
    for (const k of idKeys) {
      const n = Number(String(typeof k === 'string' ? k : k.key).slice(6));
      if (Number.isFinite(n) && n > maxId) maxId = n;
    }
    await kv.put('wu_seq', String(maxId));
  }

  // 单纯清理时也要重建一次 recent，否则首页「最新留言」还挂着已删的条目
  const doFinalize = finalize || purgePaths.length > 0;

  let inserted = 0;
  let skipped = 0;

  // 评论按 path 分组，一个 path 只读改一次存储
  const byPath = new Map();
  for (const c of comments) {
    const p = normPath(str(c.url || '/', 512));
    if (!byPath.has(p)) byPath.set(p, []);
    byPath.get(p).push(c);
  }

  for (const [p, rows] of byPath) {
    const key = 'wc_' + await H('c', p);
    const doc = (await readObj(kv, key)) || { v: 1, n: 0, list: [] };
    const list = Array.isArray(doc.list) ? doc.list : [];
    const seen = new Set(list.map((x) => String(x.objectId)));

    for (const r of rows) {
      const id = Number(r.id);
      if (!Number.isFinite(id) || seen.has(String(id))) { skipped++; continue; }
      const orig = r.orig != null ? String(r.orig) : String(r.comment || '');
      const html = r.comment != null && r.orig != null ? String(r.comment) : renderComment(orig);
      const at = Date.parse(r.insertedAt) || Date.parse(r.createdAt) || id;
      list.push({
        objectId: id,
        nick: str(r.nick, 40).trim() || '匿名',
        mail: '',
        link: str(r.link, 200),
        url: p,
        avatar: '',
        // 旧库里存的是渲染好的 HTML；万一混进 script 标签就退回自己转义
        comment: /<script/i.test(html) ? renderComment(orig) : html,
        orig,
        time: at,
        createdAt: new Date(at).toISOString(),
        insertedAt: new Date(at).toISOString(),
        status: 'approved',
        sticky: Boolean(r.sticky),
        like: Math.max(0, Number(r.like) || 0),
        ua: '',
        children: [],
        pid: r.pid != null ? Number(r.pid) || null : null,
        rid: r.rid != null ? Number(r.rid) || null : null,
      });
      seen.add(String(id));
      inserted++;
    }

    list.sort((a, b2) => (Date.parse(b2.insertedAt) || 0) - (Date.parse(a.insertedAt) || 0));
    while (list.length > LIST_CAP) list.pop();
    await writeObj(kv, key, { v: 1, n: list.length, list });
  }

  // 计数：旧库是权威值，但别把线上已经积累的新数盖小
  for (const c of counters) {
    const p = normPath(str(c.url || '/', 512));
    const key = 'wa_' + await H('w', p);
    const cur = (await readObj(kv, key)) || {};
    const row = { ...cur, time: Math.max(Number(cur.time) || 0, Number(c.time) || 0) };
    for (let i = 0; i < 10; i++) {
      const k = 'reaction' + i;
      if (c[k] != null) row[k] = Math.max(Number(cur[k]) || 0, Number(c[k]) || 0);
    }
    await writeObj(kv, key, row);
  }

  // 账号：密码哈希（$P$ 开头）原样搬过来，登录时由 phpVerify 校验，
  // 老用户能继续用原来的密码，不需要重置。
  let insertedUsers = 0;
  let skippedUsers = 0;
  for (const u of users) {
    const email = str(u.email, 255).trim();
    if (!email) { skippedUsers++; continue; }
    const eh = await emailHash(email);
    const exists = await readObj(kv, 'wu_' + eh);
    if (exists) { skippedUsers++; continue; }

    const id = Number(u.id) || await nextUserId(kv);
    await writeObj(kv, 'wu_' + eh, {
      id,
      email,
      name: str(u.name || u.display_name, 255),
      pass: str(u.password, 255),
      type: str(u.type, 50) || 'guest',
      url: str(u.url, 255),
      avatar: str(u.avatar, 512),
      at: u.createdAt || '',
    });
    await kv.put('wu_id_' + id, eh);
    const seq = Number(await kv.get('wu_seq')) || 0;
    if (id > seq) await kv.put('wu_seq', String(id));
    insertedUsers++;
  }

  // 最后一批传 finalize:true，重建「全站最新留言」索引
  let recentCount = null;
  if (doFinalize) recentCount = await rebuildRecent(kv);

  return ok({
    inserted,
    skipped,
    users: insertedUsers,
    usersSkipped: skippedUsers,
    paths: byPath.size,
    recent: recentCount,
    ...(purgePaths.length ? { purged, purgePaths } : {}),
    ...(purgeEmails.length ? { purgedUsers, purgeUsers: purgeEmails } : {}),
  }, cors);
}

// ------------------------------------------------------------------ 入口
// subPath 已经剥掉了 `/api`，形如 `/waline/comment` 或 `/waline/api/comment`
export async function handleWaline(request, env, kv, url, cors, subPath) {
  if (!kv) return fail(503, 'no_store', cors);

  // Waline 客户端拼的是 `${serverURL}/api/comment`，所以这里可能多一层 /api；
  // 直接调 handleWaline 的调用方（本地模拟、单测）可能连最外层 /api 都没剥，两种都认。
  let sub = String(subPath || '');
  sub = sub.replace(/^\/api(?=\/waline)/, '');                  // /api/waline/... → /waline/...
  sub = sub.replace(/^\/waline/, '').replace(/^\/api(?=\/|$)/, ''); // /waline/api/x → /x
  sub = sub.replace(/\/+$/, '') || '/';

  const method = request.method.toUpperCase();

  try {
    if (sub === '/' || sub === '') {
      return json({ errno: 0, errmsg: '', data: { service: 'waline-edge', v: 1 } }, 200, cors);
    }

    // 一次性迁移入口：受 X-Import-Token 保护，导完可以把这个 env 删掉
    if (sub === '/import') {
      if (method === 'POST') return await importDump(request, env, kv, cors);
      return fail(405, 'method_not_allowed', cors);
    }

    if (sub === '/article') {
      if (method === 'GET') return await getArticle(url, kv, cors);
      if (method === 'POST') return await postArticle(request, kv, cors);
      return fail(405, 'method_not_allowed', cors);
    }

    if (sub === '/comment') {
      if (method === 'GET') return await listComments(url, kv, cors);
      if (method === 'POST') return await addComment(request, kv, cors);
      return fail(405, 'method_not_allowed', cors);
    }

    // 小游戏站的账号体系就打这两个（注册 POST /user，登录 POST /token，验票 GET /token）。
    // 看报站的留言板把 login 设成 disable，只会用到 /comment 与 /article。
    if (sub === '/user') {
      if (method === 'POST') return await registerUser(request, kv, cors);
      if (method === 'PUT') return await updateUser(request, env, kv, cors);
      if (method === 'DELETE') return await deleteUser(request, env, kv, cors);
      if (method === 'GET') return await whoAmI(request, env, kv, cors);
      return fail(405, 'method_not_allowed', cors);
    }

    if (sub === '/token') {
      if (method === 'GET') return await whoAmI(request, env, kv, cors);
      if (method === 'POST') return await loginUser(request, env, kv, cors);
      return fail(405, 'method_not_allowed', cors);
    }

    // 统计类：前端偶尔会探测这些，返回空而不是 404
    if (sub === '/counter' || sub === '/comment/count') return ok([], cors);

    return fail(404, 'not_found', cors);
  } catch (error) {
    const status = (error && error.status) || 500;
    const msg = (error && error.message) || 'internal_error';
    return fail(status, msg, cors);
  }
}

// 供 scripts/waline-selftest 使用：密码层单独暴露，方便和独立实现交叉验证
export const __crypto = { md5, phpassCrypt, phpassHash, phpVerify };
