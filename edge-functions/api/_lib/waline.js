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

// 表情图：Waline 客户端在提交前把 `:名字:` 展开成 <img class="wl-emoji" src=... alt=...>，
// 服务端必须原样放行这类标签。客户端渲染走 marked，**不会**替我们反转义 HTML 实体，
// 一旦转义就变成满屏「<img class="wl-emoji" ...>」的可见文字（2026-11-27 的问题）。
const EMOJI_IMG_RE = /<img\b[^>]*\bclass\s*=\s*["'][^"']*\bwl-emoji\b[^"']*["'][^>]*>/gi;
const tagAttr = (tag, name) => {
  const m = new RegExp('\\b' + name + '\\s*=\\s*["\']([^"\']*)["\']', 'i').exec(tag);
  return m ? m[1] : '';
};

// 历史评论里的表情地址写死在旧域名上（qingdengbuyi.top、z769018860.github.io/qdby_chinese），
// 换站点/换域名就 404。统一压成站点相对路径，跟着当前页面走。
function normalizeEmojiSrc(src) {
  const s = String(src || '').trim();
  if (!s) return '';
  if (/^data:image\//i.test(s)) return s;
  let clean = s.split(/[?#]/)[0];
  // 只认 http(s)、协议相对、或本来就相对的路径；javascript: 之类一律拒掉
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(clean);
  if (scheme && !/^https?$/i.test(scheme[1])) return '';
  if (!clean.startsWith('/')) clean = '/' + clean;
  const at = clean.indexOf('/assets/waline-emojis/');
  if (at < 0) return '';
  return clean.slice(at + 1);
}

// 渲染成 HTML：先转义，换行转 <br>。
// 两类片段原样保留：
//   1) <!--machine payload--> 结构化数据注释，前端要从 DOM 里读回来，转义就看不见了；
//   2) <img class="wl-emoji"> 表情图，只认自家表情目录 / data:image，别的 img 一律当文本。
function renderComment(raw) {
  const holes = [];
  const keep = (html) => { holes.push(html); return `\u0000${holes.length - 1}\u0000`; };
  let out = String(raw || '').replace(/<!--[\s\S]*?-->/g, keep);
  out = out.replace(EMOJI_IMG_RE, (tag) => {
    const src = normalizeEmojiSrc(tagAttr(tag, 'src'));
    if (!src) return tag;                       // 外站图片：按普通文本转义
    const alt = tagAttr(tag, 'alt').replace(/[<>"'&]/g, '');
    return keep(`<img class="wl-emoji" src="${src}" alt="${alt}">`);
  });
  out = escapeHtml(out).replace(/\r\n|\r|\n/g, '<br>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => holes[Number(i)]);
}

// 头像：Waline v3 只在 comment.avatar 非空时才画 <img class="wl-user-avatar">，
// 为空连头像位都不渲染（前端那几个补 Q 版头像的脚本于是没处下手）。
// 旧库迁移过来时没有算好的头像地址，这里给一张按昵称散列的首字头像：
// data URI，不产生额外请求、不会 404，前端脚本仍会把它换成本地 Q 版头像。
const AVATAR_CACHE = new Map();
function defaultAvatar(nick) {
  const name = String(nick || '匿名')
    .replace(/[\u2062\u2063\u200B\u200C]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || '匿名';
  const hit = AVATAR_CACHE.get(name);
  if (hit) return hit;
  const ch = [...name][0] || '匿';
  let h = 0;
  for (const c of name) h = (h * 31 + c.codePointAt(0)) >>> 0;
  const hue = h % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">`
    + `<rect width="96" height="96" rx="48" fill="hsl(${hue} 30% 24%)"/>`
    + `<text x="48" y="50" text-anchor="middle" dominant-baseline="central" font-size="40" `
    + `font-family="system-ui,-apple-system,'Noto Sans SC',sans-serif" fill="hsl(${hue} 72% 84%)">`
    + `${escapeHtml(ch)}</text></svg>`;
  const url = 'data:image/svg+xml,' + encodeURIComponent(svg);
  if (AVATAR_CACHE.size > 400) AVATAR_CACHE.clear();
  AVATAR_CACHE.set(name, url);
  return url;
}

// 对外输出前统一整形：comment 一律按 orig 重算（把历史数据里被转义的表情救回来），
// avatar 空了补兜底。读路径和写入回显都走这里，避免两处漂移。
// 哪些「评论」其实是机器写的存档，不该出现在首页的「全站最新」里。
//   · ZJ1D:        —— account.js 的云端档案（整份 base64 文档）
//   · MORIMENS_*   —— 各游戏提交的结构化数据（融灾/互助/点赞之类）
//   · path 在 /zjtt/ 下 —— 内部记录（档案、点赞队列），一律不算人话
const isMachineNote = (raw, path) => /^(?:ZJ1D:|MORIMENS_[A-Z_]+_V\d+:)/.test(String(raw || ''))
  || /^\/zjtt\//.test(String(path || ''));

function presentComment(c) {
  if (!c || typeof c !== 'object') return c;
  const raw = typeof c.orig === 'string' && c.orig ? c.orig : String(c.comment || '');
  const out = { ...c, comment: renderComment(raw) };
  if (!out.avatar) out.avatar = defaultAvatar(out.nick);
  return out;
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

// ------------------------------------------------------------------ bcrypt
// 只做密码校验，不做随机盐生成：历史 Waline 库（2026-11 之前）的用户密码是
// bcrypt `$2a$`，而我们新注册用 phpass `$P$`，两种都要能验。
//
// Blowfish / EksBlowfish 那 1000 多个常量与 _encipher 全部来自 bcryptjs 2.4.3
// （MIT，Copyright (c) 2012 Nevins Bartolomeo / Shane Girish / 2014 Daniel Wirtz），
// 按原样保留以降低抄错风险；只裁掉了异步分片与随机数部分。
// 删掉注释里的 JSDoc 是因为边缘函数有体积限制，算法一行没改。

var stringFromCharCode = String.fromCharCode;

var BASE64_CODE = "./ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');

    var BASE64_INDEX = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 0,
        1, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, -1, -1, -1, -1, -1, -1,
        -1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
        20, 21, 22, 23, 24, 25, 26, 27, -1, -1, -1, -1, -1, -1, 28, 29, 30,
        31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
        48, 49, 50, 51, 52, 53, -1, -1, -1, -1, -1];

var BCRYPT_SALT_LEN = 16;

var BLOWFISH_NUM_ROUNDS = 16;

var MAX_EXECUTION_TIME = 100;

    var P_ORIG = [
        0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822,
        0x299f31d0, 0x082efa98, 0xec4e6c89, 0x452821e6, 0x38d01377,
        0xbe5466cf, 0x34e90c6c, 0xc0ac29b7, 0xc97c50dd, 0x3f84d5b5,
        0xb5470917, 0x9216d5d9, 0x8979fb1b
    ];

    var S_ORIG = [
        0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7, 0xb8e1afed,
        0x6a267e96, 0xba7c9045, 0xf12c7f99, 0x24a19947, 0xb3916cf7,
        0x0801f2e2, 0x858efc16, 0x636920d8, 0x71574e69, 0xa458fea3,
        0xf4933d7e, 0x0d95748f, 0x728eb658, 0x718bcd58, 0x82154aee,
        0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013, 0xc5d1b023,
        0x286085f0, 0xca417918, 0xb8db38ef, 0x8e79dcb0, 0x603a180e,
        0x6c9e0e8b, 0xb01e8a3e, 0xd71577c1, 0xbd314b27, 0x78af2fda,
        0x55605c60, 0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440,
        0x55ca396a, 0x2aab10b6, 0xb4cc5c34, 0x1141e8ce, 0xa15486af,
        0x7c72e993, 0xb3ee1411, 0x636fbc2a, 0x2ba9c55d, 0x741831f6,
        0xce5c3e16, 0x9b87931e, 0xafd6ba33, 0x6c24cf5c, 0x7a325381,
        0x28958677, 0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193,
        0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032, 0xef845d5d,
        0xe98575b1, 0xdc262302, 0xeb651b88, 0x23893e81, 0xd396acc5,
        0x0f6d6ff3, 0x83f44239, 0x2e0b4482, 0xa4842004, 0x69c8f04a,
        0x9e1f9b5e, 0x21c66842, 0xf6e96c9a, 0x670c9c61, 0xabd388f0,
        0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3, 0x6eef0b6c,
        0x137a3be4, 0xba3bf050, 0x7efb2a98, 0xa1f1651d, 0x39af0176,
        0x66ca593e, 0x82430e88, 0x8cee8619, 0x456f9fb4, 0x7d84a5c3,
        0x3b8b5ebe, 0xe06f75d8, 0x85c12073, 0x401a449f, 0x56c16aa6,
        0x4ed3aa62, 0x363f7706, 0x1bfedf72, 0x429b023d, 0x37d0d724,
        0xd00a1248, 0xdb0fead3, 0x49f1c09b, 0x075372c9, 0x80991b7b,
        0x25d479d8, 0xf6e8def7, 0xe3fe501a, 0xb6794c3b, 0x976ce0bd,
        0x04c006ba, 0xc1a94fb6, 0x409f60c4, 0x5e5c9ec2, 0x196a2463,
        0x68fb6faf, 0x3e6c53b5, 0x1339b2eb, 0x3b52ec6f, 0x6dfc511f,
        0x9b30952c, 0xcc814544, 0xaf5ebd09, 0xbee3d004, 0xde334afd,
        0x660f2807, 0x192e4bb3, 0xc0cba857, 0x45c8740f, 0xd20b5f39,
        0xb9d3fbdb, 0x5579c0bd, 0x1a60320a, 0xd6a100c6, 0x402c7279,
        0x679f25fe, 0xfb1fa3cc, 0x8ea5e9f8, 0xdb3222f8, 0x3c7516df,
        0xfd616b15, 0x2f501ec8, 0xad0552ab, 0x323db5fa, 0xfd238760,
        0x53317b48, 0x3e00df82, 0x9e5c57bb, 0xca6f8ca0, 0x1a87562e,
        0xdf1769db, 0xd542a8f6, 0x287effc3, 0xac6732c6, 0x8c4f5573,
        0x695b27b0, 0xbbca58c8, 0xe1ffa35d, 0xb8f011a0, 0x10fa3d98,
        0xfd2183b8, 0x4afcb56c, 0x2dd1d35b, 0x9a53e479, 0xb6f84565,
        0xd28e49bc, 0x4bfb9790, 0xe1ddf2da, 0xa4cb7e33, 0x62fb1341,
        0xcee4c6e8, 0xef20cada, 0x36774c01, 0xd07e9efe, 0x2bf11fb4,
        0x95dbda4d, 0xae909198, 0xeaad8e71, 0x6b93d5a0, 0xd08ed1d0,
        0xafc725e0, 0x8e3c5b2f, 0x8e7594b7, 0x8ff6e2fb, 0xf2122b64,
        0x8888b812, 0x900df01c, 0x4fad5ea0, 0x688fc31c, 0xd1cff191,
        0xb3a8c1ad, 0x2f2f2218, 0xbe0e1777, 0xea752dfe, 0x8b021fa1,
        0xe5a0cc0f, 0xb56f74e8, 0x18acf3d6, 0xce89e299, 0xb4a84fe0,
        0xfd13e0b7, 0x7cc43b81, 0xd2ada8d9, 0x165fa266, 0x80957705,
        0x93cc7314, 0x211a1477, 0xe6ad2065, 0x77b5fa86, 0xc75442f5,
        0xfb9d35cf, 0xebcdaf0c, 0x7b3e89a0, 0xd6411bd3, 0xae1e7e49,
        0x00250e2d, 0x2071b35e, 0x226800bb, 0x57b8e0af, 0x2464369b,
        0xf009b91e, 0x5563911d, 0x59dfa6aa, 0x78c14389, 0xd95a537f,
        0x207d5ba2, 0x02e5b9c5, 0x83260376, 0x6295cfa9, 0x11c81968,
        0x4e734a41, 0xb3472dca, 0x7b14a94a, 0x1b510052, 0x9a532915,
        0xd60f573f, 0xbc9bc6e4, 0x2b60a476, 0x81e67400, 0x08ba6fb5,
        0x571be91f, 0xf296ec6b, 0x2a0dd915, 0xb6636521, 0xe7b9f9b6,
        0xff34052e, 0xc5855664, 0x53b02d5d, 0xa99f8fa1, 0x08ba4799,
        0x6e85076a, 0x4b7a70e9, 0xb5b32944, 0xdb75092e, 0xc4192623,
        0xad6ea6b0, 0x49a7df7d, 0x9cee60b8, 0x8fedb266, 0xecaa8c71,
        0x699a17ff, 0x5664526c, 0xc2b19ee1, 0x193602a5, 0x75094c29,
        0xa0591340, 0xe4183a3e, 0x3f54989a, 0x5b429d65, 0x6b8fe4d6,
        0x99f73fd6, 0xa1d29c07, 0xefe830f5, 0x4d2d38e6, 0xf0255dc1,
        0x4cdd2086, 0x8470eb26, 0x6382e9c6, 0x021ecc5e, 0x09686b3f,
        0x3ebaefc9, 0x3c971814, 0x6b6a70a1, 0x687f3584, 0x52a0e286,
        0xb79c5305, 0xaa500737, 0x3e07841c, 0x7fdeae5c, 0x8e7d44ec,
        0x5716f2b8, 0xb03ada37, 0xf0500c0d, 0xf01c1f04, 0x0200b3ff,
        0xae0cf51a, 0x3cb574b2, 0x25837a58, 0xdc0921bd, 0xd19113f9,
        0x7ca92ff6, 0x94324773, 0x22f54701, 0x3ae5e581, 0x37c2dadc,
        0xc8b57634, 0x9af3dda7, 0xa9446146, 0x0fd0030e, 0xecc8c73e,
        0xa4751e41, 0xe238cd99, 0x3bea0e2f, 0x3280bba1, 0x183eb331,
        0x4e548b38, 0x4f6db908, 0x6f420d03, 0xf60a04bf, 0x2cb81290,
        0x24977c79, 0x5679b072, 0xbcaf89af, 0xde9a771f, 0xd9930810,
        0xb38bae12, 0xdccf3f2e, 0x5512721f, 0x2e6b7124, 0x501adde6,
        0x9f84cd87, 0x7a584718, 0x7408da17, 0xbc9f9abc, 0xe94b7d8c,
        0xec7aec3a, 0xdb851dfa, 0x63094366, 0xc464c3d2, 0xef1c1847,
        0x3215d908, 0xdd433b37, 0x24c2ba16, 0x12a14d43, 0x2a65c451,
        0x50940002, 0x133ae4dd, 0x71dff89e, 0x10314e55, 0x81ac77d6,
        0x5f11199b, 0x043556f1, 0xd7a3c76b, 0x3c11183b, 0x5924a509,
        0xf28fe6ed, 0x97f1fbfa, 0x9ebabf2c, 0x1e153c6e, 0x86e34570,
        0xeae96fb1, 0x860e5e0a, 0x5a3e2ab3, 0x771fe71c, 0x4e3d06fa,
        0x2965dcb9, 0x99e71d0f, 0x803e89d6, 0x5266c825, 0x2e4cc978,
        0x9c10b36a, 0xc6150eba, 0x94e2ea78, 0xa5fc3c53, 0x1e0a2df4,
        0xf2f74ea7, 0x361d2b3d, 0x1939260f, 0x19c27960, 0x5223a708,
        0xf71312b6, 0xebadfe6e, 0xeac31f66, 0xe3bc4595, 0xa67bc883,
        0xb17f37d1, 0x018cff28, 0xc332ddef, 0xbe6c5aa5, 0x65582185,
        0x68ab9802, 0xeecea50f, 0xdb2f953b, 0x2aef7dad, 0x5b6e2f84,
        0x1521b628, 0x29076170, 0xecdd4775, 0x619f1510, 0x13cca830,
        0xeb61bd96, 0x0334fe1e, 0xaa0363cf, 0xb5735c90, 0x4c70a239,
        0xd59e9e0b, 0xcbaade14, 0xeecc86bc, 0x60622ca7, 0x9cab5cab,
        0xb2f3846e, 0x648b1eaf, 0x19bdf0ca, 0xa02369b9, 0x655abb50,
        0x40685a32, 0x3c2ab4b3, 0x319ee9d5, 0xc021b8f7, 0x9b540b19,
        0x875fa099, 0x95f7997e, 0x623d7da8, 0xf837889a, 0x97e32d77,
        0x11ed935f, 0x16681281, 0x0e358829, 0xc7e61fd6, 0x96dedfa1,
        0x7858ba99, 0x57f584a5, 0x1b227263, 0x9b83c3ff, 0x1ac24696,
        0xcdb30aeb, 0x532e3054, 0x8fd948e4, 0x6dbc3128, 0x58ebf2ef,
        0x34c6ffea, 0xfe28ed61, 0xee7c3c73, 0x5d4a14d9, 0xe864b7e3,
        0x42105d14, 0x203e13e0, 0x45eee2b6, 0xa3aaabea, 0xdb6c4f15,
        0xfacb4fd0, 0xc742f442, 0xef6abbb5, 0x654f3b1d, 0x41cd2105,
        0xd81e799e, 0x86854dc7, 0xe44b476a, 0x3d816250, 0xcf62a1f2,
        0x5b8d2646, 0xfc8883a0, 0xc1c7b6a3, 0x7f1524c3, 0x69cb7492,
        0x47848a0b, 0x5692b285, 0x095bbf00, 0xad19489d, 0x1462b174,
        0x23820e00, 0x58428d2a, 0x0c55f5ea, 0x1dadf43e, 0x233f7061,
        0x3372f092, 0x8d937e41, 0xd65fecf1, 0x6c223bdb, 0x7cde3759,
        0xcbee7460, 0x4085f2a7, 0xce77326e, 0xa6078084, 0x19f8509e,
        0xe8efd855, 0x61d99735, 0xa969a7aa, 0xc50c06c2, 0x5a04abfc,
        0x800bcadc, 0x9e447a2e, 0xc3453484, 0xfdd56705, 0x0e1e9ec9,
        0xdb73dbd3, 0x105588cd, 0x675fda79, 0xe3674340, 0xc5c43465,
        0x713e38d8, 0x3d28f89e, 0xf16dff20, 0x153e21e7, 0x8fb03d4a,
        0xe6e39f2b, 0xdb83adf7, 0xe93d5a68, 0x948140f7, 0xf64c261c,
        0x94692934, 0x411520f7, 0x7602d4f7, 0xbcf46b2e, 0xd4a20068,
        0xd4082471, 0x3320f46a, 0x43b7d4b7, 0x500061af, 0x1e39f62e,
        0x97244546, 0x14214f74, 0xbf8b8840, 0x4d95fc1d, 0x96b591af,
        0x70f4ddd3, 0x66a02f45, 0xbfbc09ec, 0x03bd9785, 0x7fac6dd0,
        0x31cb8504, 0x96eb27b3, 0x55fd3941, 0xda2547e6, 0xabca0a9a,
        0x28507825, 0x530429f4, 0x0a2c86da, 0xe9b66dfb, 0x68dc1462,
        0xd7486900, 0x680ec0a4, 0x27a18dee, 0x4f3ffea2, 0xe887ad8c,
        0xb58ce006, 0x7af4d6b6, 0xaace1e7c, 0xd3375fec, 0xce78a399,
        0x406b2a42, 0x20fe9e35, 0xd9f385b9, 0xee39d7ab, 0x3b124e8b,
        0x1dc9faf7, 0x4b6d1856, 0x26a36631, 0xeae397b2, 0x3a6efa74,
        0xdd5b4332, 0x6841e7f7, 0xca7820fb, 0xfb0af54e, 0xd8feb397,
        0x454056ac, 0xba489527, 0x55533a3a, 0x20838d87, 0xfe6ba9b7,
        0xd096954b, 0x55a867bc, 0xa1159a58, 0xcca92963, 0x99e1db33,
        0xa62a4a56, 0x3f3125f9, 0x5ef47e1c, 0x9029317c, 0xfdf8e802,
        0x04272f70, 0x80bb155c, 0x05282ce3, 0x95c11548, 0xe4c66d22,
        0x48c1133f, 0xc70f86dc, 0x07f9c9ee, 0x41041f0f, 0x404779a4,
        0x5d886e17, 0x325f51eb, 0xd59bc0d1, 0xf2bcc18f, 0x41113564,
        0x257b7834, 0x602a9c60, 0xdff8e8a3, 0x1f636c1b, 0x0e12b4c2,
        0x02e1329e, 0xaf664fd1, 0xcad18115, 0x6b2395e0, 0x333e92e1,
        0x3b240b62, 0xeebeb922, 0x85b2a20e, 0xe6ba0d99, 0xde720c8c,
        0x2da2f728, 0xd0127845, 0x95b794fd, 0x647d0862, 0xe7ccf5f0,
        0x5449a36f, 0x877d48fa, 0xc39dfd27, 0xf33e8d1e, 0x0a476341,
        0x992eff74, 0x3a6f6eab, 0xf4f8fd37, 0xa812dc60, 0xa1ebddf8,
        0x991be14c, 0xdb6e6b0d, 0xc67b5510, 0x6d672c37, 0x2765d43b,
        0xdcd0e804, 0xf1290dc7, 0xcc00ffa3, 0xb5390f92, 0x690fed0b,
        0x667b9ffb, 0xcedb7d9c, 0xa091cf0b, 0xd9155ea3, 0xbb132f88,
        0x515bad24, 0x7b9479bf, 0x763bd6eb, 0x37392eb3, 0xcc115979,
        0x8026e297, 0xf42e312d, 0x6842ada7, 0xc66a2b3b, 0x12754ccc,
        0x782ef11c, 0x6a124237, 0xb79251e7, 0x06a1bbe6, 0x4bfb6350,
        0x1a6b1018, 0x11caedfa, 0x3d25bdd8, 0xe2e1c3c9, 0x44421659,
        0x0a121386, 0xd90cec6e, 0xd5abea2a, 0x64af674e, 0xda86a85f,
        0xbebfe988, 0x64e4c3fe, 0x9dbc8057, 0xf0f7c086, 0x60787bf8,
        0x6003604d, 0xd1fd8346, 0xf6381fb0, 0x7745ae04, 0xd736fccc,
        0x83426b33, 0xf01eab71, 0xb0804187, 0x3c005e5f, 0x77a057be,
        0xbde8ae24, 0x55464299, 0xbf582e61, 0x4e58f48f, 0xf2ddfda2,
        0xf474ef38, 0x8789bdc2, 0x5366f9c3, 0xc8b38e74, 0xb475f255,
        0x46fcd9b9, 0x7aeb2661, 0x8b1ddf84, 0x846a0e79, 0x915f95e2,
        0x466e598e, 0x20b45770, 0x8cd55591, 0xc902de4c, 0xb90bace1,
        0xbb8205d0, 0x11a86248, 0x7574a99e, 0xb77f19b6, 0xe0a9dc09,
        0x662d09a1, 0xc4324633, 0xe85a1f02, 0x09f0be8c, 0x4a99a025,
        0x1d6efe10, 0x1ab93d1d, 0x0ba5a4df, 0xa186f20f, 0x2868f169,
        0xdcb7da83, 0x573906fe, 0xa1e2ce9b, 0x4fcd7f52, 0x50115e01,
        0xa70683fa, 0xa002b5c4, 0x0de6d027, 0x9af88c27, 0x773f8641,
        0xc3604c06, 0x61a806b5, 0xf0177a28, 0xc0f586e0, 0x006058aa,
        0x30dc7d62, 0x11e69ed7, 0x2338ea63, 0x53c2dd94, 0xc2c21634,
        0xbbcbee56, 0x90bcb6de, 0xebfc7da1, 0xce591d76, 0x6f05e409,
        0x4b7c0188, 0x39720a3d, 0x7c927c24, 0x86e3725f, 0x724d9db9,
        0x1ac15bb4, 0xd39eb8fc, 0xed545578, 0x08fca5b5, 0xd83d7cd3,
        0x4dad0fc4, 0x1e50ef5e, 0xb161e6f8, 0xa28514d9, 0x6c51133c,
        0x6fd5c7e7, 0x56e14ec4, 0x362abfce, 0xddc6c837, 0xd79a3234,
        0x92638212, 0x670efa8e, 0x406000e0, 0x3a39ce37, 0xd3faf5cf,
        0xabc27737, 0x5ac52d1b, 0x5cb0679e, 0x4fa33742, 0xd3822740,
        0x99bc9bbe, 0xd5118e9d, 0xbf0f7315, 0xd62d1c7e, 0xc700c47b,
        0xb78c1b6b, 0x21a19045, 0xb26eb1be, 0x6a366eb4, 0x5748ab2f,
        0xbc946e79, 0xc6a376d2, 0x6549c2c8, 0x530ff8ee, 0x468dde7d,
        0xd5730a1d, 0x4cd04dc6, 0x2939bbdb, 0xa9ba4650, 0xac9526e8,
        0xbe5ee304, 0xa1fad5f0, 0x6a2d519a, 0x63ef8ce2, 0x9a86ee22,
        0xc089c2b8, 0x43242ef6, 0xa51e03aa, 0x9cf2d0a4, 0x83c061ba,
        0x9be96a4d, 0x8fe51550, 0xba645bd6, 0x2826a2f9, 0xa73a3ae1,
        0x4ba99586, 0xef5562e9, 0xc72fefd3, 0xf752f7da, 0x3f046f69,
        0x77fa0a59, 0x80e4a915, 0x87b08601, 0x9b09e6ad, 0x3b3ee593,
        0xe990fd5a, 0x9e34d797, 0x2cf0b7d9, 0x022b8b51, 0x96d5ac3a,
        0x017da67d, 0xd1cf3ed6, 0x7c7d2d28, 0x1f9f25cf, 0xadf2b89b,
        0x5ad6b472, 0x5a88f54c, 0xe029ac71, 0xe019a5e6, 0x47b0acfd,
        0xed93fa9b, 0xe8d3c48d, 0x283b57cc, 0xf8d56629, 0x79132e28,
        0x785f0191, 0xed756055, 0xf7960e44, 0xe3d35e8c, 0x15056dd4,
        0x88f46dba, 0x03a16125, 0x0564f0bd, 0xc3eb9e15, 0x3c9057a2,
        0x97271aec, 0xa93a072a, 0x1b3f6d9b, 0x1e6321f5, 0xf59c66fb,
        0x26dcf319, 0x7533d928, 0xb155fdf5, 0x03563482, 0x8aba3cbb,
        0x28517711, 0xc20ad9f8, 0xabcc5167, 0xccad925f, 0x4de81751,
        0x3830dc8e, 0x379d5862, 0x9320f991, 0xea7a90c2, 0xfb3e7bce,
        0x5121ce64, 0x774fbe32, 0xa8b6e37e, 0xc3293d46, 0x48de5369,
        0x6413e680, 0xa2ae0810, 0xdd6db224, 0x69852dfd, 0x09072166,
        0xb39a460a, 0x6445c0dd, 0x586cdecf, 0x1c20c8ae, 0x5bbef7dd,
        0x1b588d40, 0xccd2017f, 0x6bb4e3bb, 0xdda26a7e, 0x3a59ff45,
        0x3e350a44, 0xbcb4cdd5, 0x72eacea8, 0xfa6484bb, 0x8d6612ae,
        0xbf3c6f47, 0xd29be463, 0x542f5d9e, 0xaec2771b, 0xf64e6370,
        0x740e0d8d, 0xe75b1357, 0xf8721671, 0xaf537d5d, 0x4040cb08,
        0x4eb4e2cc, 0x34d2466a, 0x0115af84, 0xe1b00428, 0x95983a1d,
        0x06b89fb4, 0xce6ea048, 0x6f3f3b82, 0x3520ab82, 0x011a1d4b,
        0x277227f8, 0x611560b1, 0xe7933fdc, 0xbb3a792b, 0x344525bd,
        0xa08839e1, 0x51ce794b, 0x2f32c9b7, 0xa01fbac9, 0xe01cc87e,
        0xbcc7d1f6, 0xcf0111c3, 0xa1e8aac7, 0x1a908749, 0xd44fbd9a,
        0xd0dadecb, 0xd50ada38, 0x0339c32a, 0xc6913667, 0x8df9317c,
        0xe0b12b4f, 0xf79e59b7, 0x43f5bb3a, 0xf2d519ff, 0x27d9459c,
        0xbf97222c, 0x15e6fc2a, 0x0f91fc71, 0x9b941525, 0xfae59361,
        0xceb69ceb, 0xc2a86459, 0x12baa8d1, 0xb6c1075e, 0xe3056a0c,
        0x10d25065, 0xcb03a442, 0xe0ec6e0e, 0x1698db3b, 0x4c98a0be,
        0x3278e964, 0x9f1f9532, 0xe0d392df, 0xd3a0342b, 0x8971f21e,
        0x1b0a7441, 0x4ba3348c, 0xc5be7120, 0xc37632d8, 0xdf359f8d,
        0x9b992f2e, 0xe60b6f47, 0x0fe3f11d, 0xe54cda54, 0x1edad891,
        0xce6279cf, 0xcd3e7e6f, 0x1618b166, 0xfd2c1d05, 0x848fd2c5,
        0xf6fb2299, 0xf523f357, 0xa6327623, 0x93a83531, 0x56cccd02,
        0xacf08162, 0x5a75ebb5, 0x6e163697, 0x88d273cc, 0xde966292,
        0x81b949d0, 0x4c50901b, 0x71c65614, 0xe6c6c7bd, 0x327a140a,
        0x45e1d006, 0xc3f27b9a, 0xc9aa53fd, 0x62a80f00, 0xbb25bfe2,
        0x35bdd2f6, 0x71126905, 0xb2040222, 0xb6cbcf7c, 0xcd769c2b,
        0x53113ec0, 0x1640e3d3, 0x38abbd60, 0x2547adf0, 0xba38209c,
        0xf746ce76, 0x77afa1c5, 0x20756060, 0x85cbfe4e, 0x8ae88dd8,
        0x7aaaf9b0, 0x4cf9aa7e, 0x1948c25c, 0x02fb8a8c, 0x01c36ae4,
        0xd6ebe1f9, 0x90d4f869, 0xa65cdea0, 0x3f09252d, 0xc208e69f,
        0xb74e6132, 0xce77e25b, 0x578fdfe3, 0x3ac372e6
    ];

    var C_ORIG = [
        0x4f727068, 0x65616e42, 0x65686f6c, 0x64657253, 0x63727944,
        0x6f756274
    ];

    function base64_encode(b, len) {
        var off = 0,
            rs = [],
            c1, c2;
        if (len <= 0 || len > b.length)
            throw Error("Illegal len: "+len);
        while (off < len) {
            c1 = b[off++] & 0xff;
            rs.push(BASE64_CODE[(c1 >> 2) & 0x3f]);
            c1 = (c1 & 0x03) << 4;
            if (off >= len) {
                rs.push(BASE64_CODE[c1 & 0x3f]);
                break;
            }
            c2 = b[off++] & 0xff;
            c1 |= (c2 >> 4) & 0x0f;
            rs.push(BASE64_CODE[c1 & 0x3f]);
            c1 = (c2 & 0x0f) << 2;
            if (off >= len) {
                rs.push(BASE64_CODE[c1 & 0x3f]);
                break;
            }
            c2 = b[off++] & 0xff;
            c1 |= (c2 >> 6) & 0x03;
            rs.push(BASE64_CODE[c1 & 0x3f]);
            rs.push(BASE64_CODE[c2 & 0x3f]);
        }
        return rs.join('');
    }

    function base64_decode(s, len) {
        var off = 0,
            slen = s.length,
            olen = 0,
            rs = [],
            c1, c2, c3, c4, o, code;
        if (len <= 0)
            throw Error("Illegal len: "+len);
        while (off < slen - 1 && olen < len) {
            code = s.charCodeAt(off++);
            c1 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
            code = s.charCodeAt(off++);
            c2 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
            if (c1 == -1 || c2 == -1)
                break;
            o = (c1 << 2) >>> 0;
            o |= (c2 & 0x30) >> 4;
            rs.push(stringFromCharCode(o));
            if (++olen >= len || off >= slen)
                break;
            code = s.charCodeAt(off++);
            c3 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
            if (c3 == -1)
                break;
            o = ((c2 & 0x0f) << 4) >>> 0;
            o |= (c3 & 0x3c) >> 2;
            rs.push(stringFromCharCode(o));
            if (++olen >= len || off >= slen)
                break;
            code = s.charCodeAt(off++);
            c4 = code < BASE64_INDEX.length ? BASE64_INDEX[code] : -1;
            o = ((c3 & 0x03) << 6) >>> 0;
            o |= c4;
            rs.push(stringFromCharCode(o));
            ++olen;
        }
        var res = [];
        for (off = 0; off<olen; off++)
            res.push(rs[off].charCodeAt(0));
        return res;
    }

    function _encipher(lr, off, P, S) { // This is our bottleneck: 1714/1905 ticks / 90% - see profile.txt
        var n,
            l = lr[off],
            r = lr[off + 1];

        l ^= P[0];

        /*
        for (var i=0, k=BLOWFISH_NUM_ROUNDS-2; i<=k;)
            // Feistel substitution on left word
            n  = S[l >>> 24],
            n += S[0x100 | ((l >> 16) & 0xff)],
            n ^= S[0x200 | ((l >> 8) & 0xff)],
            n += S[0x300 | (l & 0xff)],
            r ^= n ^ P[++i],
            // Feistel substitution on right word
            n  = S[r >>> 24],
            n += S[0x100 | ((r >> 16) & 0xff)],
            n ^= S[0x200 | ((r >> 8) & 0xff)],
            n += S[0x300 | (r & 0xff)],
            l ^= n ^ P[++i];
        */

        //The following is an unrolled version of the above loop.
        //Iteration 0
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[1];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[2];
        //Iteration 1
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[3];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[4];
        //Iteration 2
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[5];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[6];
        //Iteration 3
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[7];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[8];
        //Iteration 4
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[9];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[10];
        //Iteration 5
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[11];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[12];
        //Iteration 6
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[13];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[14];
        //Iteration 7
        n  = S[l >>> 24];
        n += S[0x100 | ((l >> 16) & 0xff)];
        n ^= S[0x200 | ((l >> 8) & 0xff)];
        n += S[0x300 | (l & 0xff)];
        r ^= n ^ P[15];
        n  = S[r >>> 24];
        n += S[0x100 | ((r >> 16) & 0xff)];
        n ^= S[0x200 | ((r >> 8) & 0xff)];
        n += S[0x300 | (r & 0xff)];
        l ^= n ^ P[16];

        lr[off] = r ^ P[BLOWFISH_NUM_ROUNDS + 1];
        lr[off + 1] = l;
        return lr;
    }

    function _streamtoword(data, offp) {
        for (var i = 0, word = 0; i < 4; ++i)
            word = (word << 8) | (data[offp] & 0xff),
            offp = (offp + 1) % data.length;
        return { key: word, offp: offp };
    }

    function _key(key, P, S) {
        var offset = 0,
            lr = [0, 0],
            plen = P.length,
            slen = S.length,
            sw;
        for (var i = 0; i < plen; i++)
            sw = _streamtoword(key, offset),
            offset = sw.offp,
            P[i] = P[i] ^ sw.key;
        for (i = 0; i < plen; i += 2)
            lr = _encipher(lr, 0, P, S),
            P[i] = lr[0],
            P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
            lr = _encipher(lr, 0, P, S),
            S[i] = lr[0],
            S[i + 1] = lr[1];
    }

    function _ekskey(data, key, P, S) {
        var offp = 0,
            lr = [0, 0],
            plen = P.length,
            slen = S.length,
            sw;
        for (var i = 0; i < plen; i++)
            sw = _streamtoword(key, offp),
            offp = sw.offp,
            P[i] = P[i] ^ sw.key;
        offp = 0;
        for (i = 0; i < plen; i += 2)
            sw = _streamtoword(data, offp),
            offp = sw.offp,
            lr[0] ^= sw.key,
            sw = _streamtoword(data, offp),
            offp = sw.offp,
            lr[1] ^= sw.key,
            lr = _encipher(lr, 0, P, S),
            P[i] = lr[0],
            P[i + 1] = lr[1];
        for (i = 0; i < slen; i += 2)
            sw = _streamtoword(data, offp),
            offp = sw.offp,
            lr[0] ^= sw.key,
            sw = _streamtoword(data, offp),
            offp = sw.offp,
            lr[1] ^= sw.key,
            lr = _encipher(lr, 0, P, S),
            S[i] = lr[0],
            S[i + 1] = lr[1];
    }

    function _crypt(b, salt, rounds, callback, progressCallback) {
        var cdata = C_ORIG.slice(),
            clen = cdata.length,
            err;

        // Validate
        if (rounds < 4 || rounds > 31) {
            err = Error("Illegal number of rounds (4-31): "+rounds);
            if (callback) {
                nextTick(callback.bind(this, err));
                return;
            } else
                throw err;
        }
        if (salt.length !== BCRYPT_SALT_LEN) {
            err =Error("Illegal salt length: "+salt.length+" != "+BCRYPT_SALT_LEN);
            if (callback) {
                nextTick(callback.bind(this, err));
                return;
            } else
                throw err;
        }
        rounds = (1 << rounds) >>> 0;

        var P, S, i = 0, j;

        //Use typed arrays when available - huge speedup!
        if (Int32Array) {
            P = new Int32Array(P_ORIG);
            S = new Int32Array(S_ORIG);
        } else {
            P = P_ORIG.slice();
            S = S_ORIG.slice();
        }

        _ekskey(salt, b, P, S);

        /**
         * Calcualtes the next round.
         * @returns {Array.<number>|undefined} Resulting array if callback has been omitted, otherwise `undefined`
         * @inner
         */
        function next() {
            if (progressCallback)
                progressCallback(i / rounds);
            if (i < rounds) {
                var start = Date.now();
                for (; i < rounds;) {
                    i = i + 1;
                    _key(b, P, S);
                    _key(salt, P, S);
                    if (Date.now() - start > MAX_EXECUTION_TIME)
                        break;
                }
            } else {
                for (i = 0; i < 64; i++)
                    for (j = 0; j < (clen >> 1); j++)
                        _encipher(cdata, j << 1, P, S);
                var ret = [];
                for (i = 0; i < clen; i++)
                    ret.push(((cdata[i] >> 24) & 0xff) >>> 0),
                    ret.push(((cdata[i] >> 16) & 0xff) >>> 0),
                    ret.push(((cdata[i] >> 8) & 0xff) >>> 0),
                    ret.push((cdata[i] & 0xff) >>> 0);
                if (callback) {
                    callback(null, ret);
                    return;
                } else
                    return ret;
            }
            if (callback)
                nextTick(next);
        }

        // Async
        if (typeof callback !== 'undefined') {
            next();

            // Sync
        } else {
            var res;
            while (true)
                if (typeof(res = next()) !== 'undefined')
                    return res || [];
        }
    }

function _bcryptBytes(str) {
  return new TextEncoder().encode(str);
}

function _eq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// hash 形如 $2a$08$<22 位盐><31 位摘要>
function bcryptVerify(password, hash) {
  const m = /^\$2([abxy]?)\$(\d\d)\$([./A-Za-z0-9]{22})([./A-Za-z0-9]{31})$/.exec(String(hash || ''));
  if (!m) return false;
  const minor = m[1] || '';
  const rounds = parseInt(m[2], 10);
  if (!(rounds >= 4 && rounds <= 31)) return false;
  let saltB;
  try {
    saltB = base64_decode(m[3], BCRYPT_SALT_LEN);
  } catch {
    return false;
  }
  if (!saltB || saltB.length !== BCRYPT_SALT_LEN) return false;
  // $2a$ / $2b$ / $2y$ 都要在密码尾部补一个 NUL 字节，这是 bcrypt 的历史包袱
  const pw = _bcryptBytes(String(password) + (minor >= 'a' ? '\x00' : ''));
  let bytes;
  try {
    bytes = _crypt(pw, saltB, rounds);
  } catch {
    return false;
  }
  return _eq(base64_encode(bytes, 23), m[4]);
}

// 统一校验入口：旧 Waline 库的用户是 bcrypt（$2a$/$2b$），新注册走 phpass（$P$）
function verifyPassword(password, stored) {
  const s = String(stored || '');
  if (!s) return false;
  if (s.startsWith('$2')) return bcryptVerify(password, s);
  // 理论上都该是 $P$，但历史上也见过明文/其它格式，退一步认
  if (s[0] !== '$') return s === String(password);
  if (phpassCrypt(password, s, 0) === s) return true;
  // 少数移植少算一轮，兜一下（旧库可能是那种实现生成的）
  if (phpassCrypt(password, s, -1) === s) return true;
  return false;
}

function phpVerify(password, stored) {
  return verifyPassword(password, stored);
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
  const data = pageTops.map((c) => ({ ...presentComment(c), children: [] }));
  const dataById = new Map(data.map((c) => [Number(c.objectId), c]));

  for (const c of list) {
    const pid = Number(c.pid) || 0;
    if (!pid || !wanted.has(pid)) continue;
    const parent = dataById.get(pid);
    if (parent) parent.children.push({ ...presentComment(c), children: [] });
  }
  for (const c of data) c.children.sort((a, b) => when(a) - when(b));

  return { page, pageSize, count: tops.length, total: tops.length, data };
}

async function listComments(url, kv, cors) {
  // 全站最新 N 条：只看精简索引，别去翻每个 path
  if (String(url.searchParams.get('type') || '') === 'recent') {
    const count = Math.min(50, Math.max(1, Number(url.searchParams.get('count')) || 10));
    const recent = (await readObj(kv, 'wcr', true)) || [];
    // 早先写进去的机器记录（云档案 ZJ1D:、点赞 /zjtt/like/…）也一并滤掉，
    // 不然首页留言板会一直顶着一串 base64，等 50 条真人留言挤掉它要好几天。
    const human = (Array.isArray(recent) ? recent : [])
      .filter((c) => !isMachineNote(String((c && c.orig) || ''), String((c && c.url) || '')));
    return ok(human.slice(0, count).map(presentComment), cors);
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
  const isMachine = isMachineNote(raw, path);
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

  return ok(presentComment(row), cors);
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
        objectId: c.objectId, nick: c.nick, url: c.url, avatar: c.avatar || '',
        link: c.link, comment: renderComment(c.orig || c.comment), orig: c.orig,
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
      // 旧库的 comment 是「渲染好的 HTML」，但表情图被 HTML 转义成了可见文字，
      // 客户端又不会反转义，所以统一按 orig 重渲染（只放行 wl-emoji，别的一律转义）。
      const html = renderComment(orig);
      const at = Date.parse(r.insertedAt) || Date.parse(r.createdAt) || id;
      list.push({
        objectId: id,
        nick: str(r.nick, 40).trim() || '匿名',
        mail: '',
        link: str(r.link, 200),
        url: p,
        avatar: '',
        comment: html,
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

    // 评论数：Waline 的 commentCount 期望 [{ url, count }]，给空数组会让计数永远显示 0。
    // 计数含回复（和官方 SQL 的 count(*) 一致）。
    if (sub === '/comment/count') {
      const paths = [...new Set(String(url.searchParams.get('path') || '')
        .split(',').map((x) => normPath(x.trim())).filter(Boolean))].slice(0, ART_MAX);
      if (!paths.length) return ok([], cors);
      const rows = await mapLimit(paths, 8, async (p) => {
        const doc = await readObj(kv, 'wc_' + await H('c', p), true);
        return { url: p, count: Array.isArray(doc && doc.list) ? doc.list.length : 0 };
      });
      return ok(rows, cors);
    }
    // 点赞/浏览计数（Waline 的 /counter）前端没用，留着返回空壳免得 404
    if (sub === '/counter') return ok([], cors);

    return fail(404, 'not_found', cors);
  } catch (error) {
    const status = (error && error.status) || 500;
    const msg = (error && error.message) || 'internal_error';
    return fail(status, msg, cors);
  }
}

// 供 scripts/waline-selftest 使用：密码层单独暴露，方便和独立实现交叉验证
export const __crypto = { md5, phpassCrypt, phpassHash, phpVerify, verifyPassword, bcryptVerify };
// 调试/单测用：评论渲染与头像兜底（scripts/waline_render_test.mjs）
export const __render = { renderComment, presentComment, defaultAvatar, normalizeEmojiSrc };
