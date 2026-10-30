// 战报侦探 后端 —— 腾讯 EdgeOne Pages 版（Edge Functions + Blob 存储，KV 可选但默认不用）
//
// 为什么有这个版本：站点已经部署在 EdgeOne Pages 上（自定义域名 + 免费 SSL），
// 而 Waifly / Cloudflare 那套要么只有 http（https 页面调用会被 mixed content 拦掉），
// 要么授权登不上。放在 EdgeOne 里，接口和页面同源同证书，跨域问题直接消失。
//
// 代价：EdgeOne 只给 KV（键值）和 Blob，没有 SQL。所以原来 D1 里的 5 张表要拆成键：
//
//   SQL 表                     KV 键
//   likes(puzzle, voter)  →   lk_{题目hash}_{身份hash}   = '1'（存在即点过，天然去重）
//   likes 的 COUNT(*)     →   cnt_{题目hash}             = 数字（赞数）
//   likes 的每日额度       →   q_{身份hash}_{yyyyMMdd}   = 数字
//   游客按 IP 兜底         →   gi_{IPhash}_{yyyyMMdd}     = 数字
//   accounts(uid)         →   acct_{uidhash}             = JSON {doc, ver, at}
//   puzzles(id)           →   pz_{题目hash}              = JSON {payload…}
//   puzzles 列表/排序      →   meta_idx                  = JSON [{id, at}]，新的在前
//   claims(author,puzzle) →   cl_{uidhash}_{题目hash}    = 数字（已折银芯的赞数）
//   sessions(thash)       →   sess_{tokenhash}           = JSON {uid, name, at}
//   home_ratings(game,voter) → hragg_{game}                = JSON {n, sum}（综合分只存这两个数）
//                              hrv_{game}_{身份hash}        = JSON {stars, text, at}（一人一游戏一条）
//   home_bugs(id)          →   bug_{编号去横线}            = JSON {game, text, contact, ver, ua, at}
//   home_bugs 索引         →   bug_idx                     = JSON [编号…]，最新在前，只留 500 条
//   站点浏览               →   pv                          = JSON {t 总浏览, d 今天, n 今天浏览}
//   登录过本站的账号       →   usr_{uidhash}               = JSON {uid, name, at, seen}；usr_n 是计数
//   管理员                 →   admin_uid                   = uid（第一次由显示名「姜酒」认领后钉死）
//   赠礼（管理员发放）     →   grant_{id} / grant_idx / gm_{uidhash}
//
// KV 的两个脾气，改数据模型时必须顺着它：
//   1. 最终一致（跨节点最长 60 秒才看到别人的写）。所以「赞数」用计数器而不是
//      数 key，同一节点读自己的写是立刻可见的，正常使用看不出延迟。
//   2. 没有原子自增，读改写之间可能撞车。点赞量级很小，偶尔少记一个赞比
//      维护分布式锁划算；作者结算用的是「只升不降」的最大值，不会重复发钱。
//
// 存储用 Blob（免审核、部署时平台自动注入凭据，线上已实测可写）：
//            a) 平台注入（部署时把 {{PAGES_BLOB_DEPLOY_CREDENTIAL}} 换掉，零配置）
//            b) 自己在「项目设置 → 环境变量」里配 ZJTT_BLOB_TOKEN + ZJTT_BLOB_PROJECT
//            Blob 只有 set/get/delete/list，没有原子自增，语义和 KV 一致，
//            下面套一层 blobKV 抹平差异；读默认强一致，显示用的赞数走边缘缓存。
// KV 仍然保留实现（控制台绑命名空间即可），但**默认不启用**：它要白名单审核，
// 而且与 Blob 的数据互不相通，中途换库会让所有赞数像被清零。要换必须显式
// 配 ZJTT_STORE=kv。详见 storeOf()。
//
// 部署路径：edge-functions/api/[[default]].js  →  线上 /api/*，下面会自己剥掉 /api 前缀。

import { getStore as blobGetStore } from './_lib/pages-blob.js';

// 本地用不到 EdgeOne CLI，就手写一个 KV 兜底，方便 node 直接跑测试
const LIKE_MAX = 10;              // 每人每天最多点赞数
const GUEST_IP_MAX = 40;          // 游客同一 IP 每天上限
const SESSION_TTL = 7 * 86400e3;  // token 校验结果缓存 7 天
const MAX_BODY = 512 * 1024;      // 请求体上限
const IDX_MAX = 300;              // 题库索引最多记多少条（超出丢最旧的）
const IDX_CAP = 300;

const DEFAULT_ORIGINS = [
  'https://z769018860.github.io',
  'https://morimens.qingdengbuyi.top',
  'https://morimens-sumon.edgeone.dev',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// ------------------------------------------------------------------ 基础工具
const dayKey = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const dayKeyFlat = () => dayKey().replace(/-/g, ''); // key 统一只用字母数字下划线：Blob 与 KV 都这么写最稳

const str = (v, max) => String(v == null ? '' : v).slice(0, max);

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 各命名空间加前缀再散列，避免「同一个字符串在不同表里算出同一个 key」
const phash = (id) => sha256('p:' + id);
const vhash = (voter) => sha256('v:' + voter);
const uhash = (uid) => sha256('u:' + uid);
const ihash = (ip) => sha256('i:' + ip);
const thash = (token) => sha256('t:' + token);

class HttpError extends Error {
  constructor(status, code, detail) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function corsHeaders(origin, env) {
  const allow = String((env && env.ALLOWED_ORIGINS) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const list = allow.length ? allow : DEFAULT_ORIGINS;
  const h = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Dev-Id,X-Device',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  // 预览域每次部署都会换（xxx.edgeone.dev），按后缀放行，别让预览页调不通
  const preview = /^https:\/\/[a-z0-9-]+\.(edgeone\.dev|edgeone\.app|edgeone\.run)$/i.test(origin);
  if (origin && (local || preview || list.includes('*') || list.includes(origin))) {
    h['Access-Control-Allow-Origin'] = origin;
  }
  return h;
}

function reply(payload, status, cors) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...cors,
    },
  });
}

async function readJson(request, limit = MAX_BODY) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > limit) throw new HttpError(413, 'too_large');
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, 'too_large');
  if (!text) return {};
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== 'object') throw new Error('not object');
    return v;
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

// EdgeOne 会把客户端 IP 放进这两处之一，都取不到就退回空串
const clientIp = (request) =>
  str(request.headers.get('EO-Connecting-IP')
    || request.headers.get('CF-Connecting-IP')
    || (request.headers.get('X-Forwarded-For') || '').split(',')[0], 64).trim();

// ---------------------------------------------------------------- 存储：KV 或 Blob
// 统一成 { get(key, opt), put(key, value), delete(key) }。
// opt.type='json' 取对象；opt.weak=true 表示「显示用，可以吃缓存」。
function looksLikeKV(x) {
  return Boolean(x) && typeof x.get === 'function' && typeof x.put === 'function';
}

// 把 Blob Store 包成 KV 语义。
// 差异只有三处：set→put 改名、get 的 type 参数同构（text/json 都支持）、
// 另加一致性开关（Blob 默认走边缘缓存，强一致会回源）。
function blobKV(store) {
  const cons = (opt) => (opt && opt.weak ? 'eventual' : 'strong');
  return {
    __kind: 'blob',
    async get(key, opt) {
      const type = opt && opt.type === 'json' ? 'json' : 'text';
      const v = await store.get(String(key), { type, consistency: cons(opt) });
      return v === undefined ? null : v;
    },
    async put(key, value) {
      await store.set(String(key), typeof value === 'string' ? value : JSON.stringify(value));
    },
    async delete(key) {
      await store.delete(String(key));
    },
    // 前缀列举：管理员要「全部注册用户」，只能靠 list。limit 直接透给 COS 的 max-keys。
    async list(prefix, limit = 1000) {
      const r = await store.list({ prefix: prefix || undefined, limit });
      return ((r && r.blobs) || []).map((b) => String(b.key));
    },
  };
}

// 按控制台里的变量名取 Blob；取不到返回 null（不抛，让上层给可读错误）
function blobOf(env) {
  const e = env || {};
  const name = String(e.ZJTT_BLOB_STORE || e.BLOB_STORE || 'zjtt');
  const token = String(e.ZJTT_BLOB_TOKEN || e.BLOB_TOKEN || '');
  const project = String(e.ZJTT_BLOB_PROJECT || e.BLOB_PROJECT || e.PAGES_PROJECT_ID || '');
  try {
    // 显式凭据优先（可控、可测）；否则交给平台注入的 deployCredential
    const store = token && project
      ? blobGetStore({ name, projectId: project, token })
      : blobGetStore(name);
    return store ? blobKV(store) : null;
  } catch {
    return null;   // 没有凭据：MISSING_ENVIRONMENT
  }
}

// KV 绑定探测：控制台里变量名怎么填都可能，这里挨个认一遍。
// 注意 EdgeOne 的绑定是「注入同名全局变量」（官方示例直接 my_kv.put()），
// 不一定出现在 env 上，所以两边都找：先 env 再 globalThis。
function kvBinding(env) {
  const g = typeof globalThis !== 'undefined' ? globalThis : {};
  const hit = (env && (env.zjtt_kv || env.ZJTT_KV || env.KV || env.KV_STORE))
    || g.zjtt_kv || g.ZJTT_KV || g.KV || null;
  // 只认真正实现了存储接口的对象，别把 env 里别的配置当成存储
  return looksLikeKV(hit) ? hit : null;
}

// 主存储固定为 Blob。理由：
//   · KV 要白名单审核，Blob 免审核，部署时平台自动注入凭据，零配置就能写；
//   · 两套存储的数据互不相通，KV 哪天审核通过一绑，默认实现就会切到一个空库，
//     所有赞数像被清零 —— 这种「悄悄换库」比「没有 KV」危险得多。
// 所以默认只认 Blob。真要换回 KV，必须显式配 ZJTT_STORE=kv。
function storeOf(env) {
  const pin = String((env && env.ZJTT_STORE) || '').toLowerCase();
  const kv = kvBinding(env);

  if (pin === 'kv') {
    if (kv) return kv;
    throw new HttpError(500, 'no_store', '存储钉死为 KV（ZJTT_STORE=kv），但这套环境里没有绑定 KV 命名空间');
  }

  const blob = blobOf(env);
  if (blob) return blob;

  const why = pin ? `（ZJTT_STORE 钉死为 ${pin}）` : '';
  throw new HttpError(500, 'no_store',
    '没有可用的存储：Blob 没拿到凭据'
    + '（正常情况下部署时平台会自动注入；若报这个错，检查项目是否开通了 Blob 存储，'
    + '或在「项目设置 → 环境变量」里补 ZJTT_BLOB_TOKEN 与 ZJTT_BLOB_PROJECT）'
    + (kv ? '。注意：KV 已绑定但本服务默认不用 KV（两套数据不互通，换库会让赞数看起来清零），'
      + '确实要用就配 ZJTT_STORE=kv' : '')
    + why);
}

// 列键：Blob 封装返回字符串数组；真 KV（ZJTT_STORE=kv）的 list 要传对象、返回 { keys: [{ key }] }，这里抹平
async function listKeys(kv, prefix, limit = 1000) {
  let r = null;
  try { r = await kv.list(prefix, limit); } catch { r = null; }
  if (!Array.isArray(r) && !(r && Array.isArray(r.keys))) { try { r = await kv.list({ prefix, limit }); } catch { r = null; } }
  const arr = Array.isArray(r) ? r : (r && Array.isArray(r.keys) ? r.keys : []);
  return [...new Set(arr.map((x) => String(x && x.key != null ? x.key : x)))].filter((k) => k.startsWith(prefix));
}

// 有上限的并发：Blob 的每次强一致读都是一次源站请求，一口气发 120 个会被限流
async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    for (;;) {
      const k = i++;
      if (k >= list.length) return;
      out[k] = await fn(list[k], k);
    }
  });
  await Promise.all(workers);
  return out;
}

// weak=true：显示用，允许吃边缘缓存（Blob 上能少一轮源站往返）
async function kvJson(kv, key, weak = false) {
  const raw = await kv.get(key, { type: 'json', weak });
  return raw || null;
}

async function kvNum(kv, key, weak = false) {
  const raw = await kv.get(key, { weak });
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// ------------------------------------------------------------------ 身份
// 「本站用过这个账号」的名册。个人中心左上角要显示注册用户量、管理员页要列出全部用户，
// 都靠这份 usr_ 前缀的键。写得很省：只有第一次见到这个 uid 才落一条，昵称改了才补写一次。
// 注意别把它当 Waline 的注册表 —— 它记的是「登录过本站的账号」，没来过的 Waline 用户不在里面。
async function touchUser(kv, me) {
  if (!me || !me.uid) return;
  const key = 'usr_' + (await uhash(me.uid));
  let raw = null;
  try { raw = await kv.get(key, { weak: true }); } catch { raw = null; }
  const name = str(me.name, 40);
  if (raw) {
    let old = null;
    try { old = JSON.parse(raw); } catch { old = null; }
    if (!old || old.name !== name) {
      await kv.put(key, JSON.stringify({ uid: String(me.uid), name, at: Number(old && old.at) || Date.now(), seen: Date.now() }));
    }
    return;
  }
  await kv.put(key, JSON.stringify({ uid: String(me.uid), name, at: Date.now(), seen: Date.now() }));
  // 计数单独存：列表要扫全表，计数只要一次读
  const n = await kvNum(kv, 'usr_n');
  await kv.put('usr_n', String(n + 1));
}

// 前端把 Waline 登录得到的 token 放在 Authorization 里；这里回源验一次，验过缓存进 sess
async function whoami(request, env, kv) {
  const raw = String(request.headers.get('Authorization') || '');
  const m = raw.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : '';
  if (!token) return null;

  const th = await thash(token);
  const hit = await kvJson(kv, 'sess_' + th);
  if (hit && Date.now() - Number(hit.at) < SESSION_TTL) {
    const me = { uid: String(hit.uid), name: String(hit.name || ''), token };
    await touchUser(kv, me);
    return me;
  }

  const base = String((env && env.WALINE_URL) || 'https://textbox.qingdengbuyi.top').replace(/\/+$/, '');

  // 验身份打的是「带 Bearer 的 GET /api/token」，不是 GET /api/user。
  // Waline 的 /api/user 只有 POST(注册) / PUT(改资料) / DELETE(注销)，压根没有 GET ——
  // 打它固定回 500 {"errmsg":"(unknown path) …Cannot read properties of null"}。
  // 之前这里就是打 /api/user 的，于是 whoami 永远返回 null：
  //   · 管理页永远停在「需要登录」
  //   · /account 读写一律 401，云端档案从来没同步成功过（usr_n 一直是 0）
  // 而 GET /api/token 带有效 token 时回 {errno:0, data:{objectId, display_name, …}}，
  // 无效或缺 token 时回 {errno:0, data:{}} —— 用 data.objectId 判真假就够了。
  let data = null;
  try {
    const r = await fetch(`${base}/api/token`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const j = await r.json().catch(() => null);
    data = (j && j.data) || null;
    // 老版本 Waline 若是只认 /api/user 的，再兜一次（同一个 token，代价一次往返）
    if ((!data || !data.objectId) && r.status === 404) {
      const r2 = await fetch(`${base}/api/user`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      const j2 = await r2.json().catch(() => null);
      data = (j2 && j2.data) || null;
    }
  } catch {
    return null;
  }
  if (!data || !data.objectId) return null;

  const name = str(data.display_name || data.nick || '', 40);
  await kv.put('sess_' + th, JSON.stringify({ uid: String(data.objectId), name, at: Date.now() }));
  const me = { uid: String(data.objectId), name, token };
  await touchUser(kv, me);
  return me;
}

// 点赞身份：登录用户由服务端从 token 推出（前端伪造不了），游客用本机随机 id
function voterOf(me, request) {
  if (me) return 'u' + me.uid;
  const dev = str(request.headers.get('X-Dev-Id'), 32).replace(/[^A-Za-z0-9_-]/g, '');
  return dev ? 'd' + dev : null;
}

// ------------------------------------------------------------------ 点赞
async function countOf(kv, pid) {
  return kvNum(kv, 'cnt_' + (await phash(pid)));
}

async function usedToday(kv, voter, dayFlat) {
  return kvNum(kv, 'q_' + (await vhash(voter)) + '_' + dayFlat);
}

// GET /likes?ids=a,b,c
async function getLikes(request, env, kv, url, cors) {
  const ids = [...new Set(
    String(url.searchParams.get('ids') || '')
      .split(',').map((s) => s.trim()).filter(Boolean),
  )].slice(0, 60);

  const me = await whoami(request, env, kv);
  const voter = voterOf(me, request);
  const day = dayKeyFlat();

  const counts = {};
  const voted = {};
  const vh = voter ? await vhash(voter) : '';

  // 一次把 60 个题的赞数 / 是否点过并发读掉；串行会堆成一长串 RTT。
  // 赞数只用于显示，吃边缘缓存（weak）；「我点过没」必须准，走强一致。
  await mapLimit(ids, 10, async (id) => {
    const ph = await phash(id);
    const [c, hit] = await Promise.all([
      kvNum(kv, 'cnt_' + ph, true),
      vh ? kv.get(`lk_${ph}_${vh}`) : Promise.resolve(null),
    ]);
    counts[id] = c;
    if (hit) voted[id] = true;
  });

  // 并发读回来的顺序是完成顺序，这里按入参顺序重排，输出稳定（也方便前端 diff 和测试）
  const outCounts = {};
  const outVoted = {};
  for (const id of ids) {
    outCounts[id] = Number(counts[id]) || 0;
    if (voted[id]) outVoted[id] = true;
  }

  const left = voter ? Math.max(0, LIKE_MAX - (await usedToday(kv, voter, day))) : LIKE_MAX;

  return reply({ ok: true, counts: outCounts, voted: outVoted, left, day: dayKey() }, 200, cors);
}

// POST /like { puzzle }
async function postLike(request, env, kv, cors) {
  const b = await readJson(request, 8 * 1024);
  const pid = str(b.puzzle, 64).trim();
  if (!pid) throw new HttpError(400, 'bad_puzzle');

  const me = await whoami(request, env, kv);
  const voter = voterOf(me, request);
  if (!voter) throw new HttpError(400, 'no_voter');

  const day = dayKeyFlat();
  const ph = await phash(pid);
  const vh = await vhash(voter);

  // 自己的题不能自己刷赞
  if (me) {
    const own = await kvJson(kv, 'pz_' + ph);
    if (own && String(own.author || '') === me.uid) throw new HttpError(403, 'self');
  }

  const lkKey = `lk_${ph}_${vh}`;
  const dup = await kv.get(lkKey);
  if (dup) {
    return reply({
      ok: true, duplicate: true, count: await kvNum(kv, 'cnt_' + ph),
      left: Math.max(0, LIKE_MAX - (await usedToday(kv, voter, day))), voted: true,
    }, 200, cors);
  }

  const used = await usedToday(kv, voter, day);
  if (used >= LIKE_MAX) {
    return reply({ ok: false, error: 'quota', count: await kvNum(kv, 'cnt_' + ph), left: 0 }, 429, cors);
  }

  // 游客没有稳定身份，按 IP 兜一层，避免换 dev id 无限刷
  if (!me) {
    const ip = clientIp(request);
    if (ip) {
      const ipKey = 'gi_' + (await ihash(ip)) + '_' + day;
      const n = await kvNum(kv, ipKey);
      if (n >= GUEST_IP_MAX) {
        return reply({ ok: false, error: 'rate', left: Math.max(0, LIKE_MAX - used) }, 429, cors);
      }
      await kv.put(ipKey, String(n + 1));
    }
  }

  // 先写「点过」这条，再改计数：两个请求同时进来时，后到的会被上面的 dup 拦住
  await kv.put(lkKey, '1');
  const count = (await kvNum(kv, 'cnt_' + ph)) + 1;
  await kv.put('cnt_' + ph, String(count));
  await kv.put('q_' + vh + '_' + day, String(used + 1));

  return reply({ ok: true, count, left: Math.max(0, LIKE_MAX - (used + 1)), voted: true }, 200, cors);
}

// POST /claim { puzzles: [] } —— 作者把「还没折成银芯的赞」领走，服务端保证幂等
async function postClaim(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request, 16 * 1024);
  const ids = [...new Set((Array.isArray(b.puzzles) ? b.puzzles : []).map((x) => str(x, 64)).filter(Boolean))].slice(0, 100);
  if (!ids.length) return reply({ ok: true, gain: 0, counts: {} }, 200, cors);

  const uh = await uhash(me.uid);
  const counts = {};
  let gain = 0;

  for (const pid of ids) {
    const ph = await phash(pid);
    const own = await kvJson(kv, 'pz_' + ph);
    // 只认服务端有归属记录、且作者就是本人的题。以前「没有记录的题」也允许结算，
    // 结果任何账号都能把官方题 / 随手编的 id 上的赞折成银芯领走。
    if (!own || !String(own.author || '') || String(own.author) !== me.uid) continue;

    const count = await kvNum(kv, 'cnt_' + ph);
    counts[pid] = count;

    const clKey = `cl_${uh}_${ph}`;
    const prev = Math.max(0, await kvNum(kv, clKey));
    if (count > prev) gain += count - prev;
    // 只升不降：并发或重复领取时不会二次发钱
    await kv.put(clKey, String(Math.max(prev, count)));
  }

  return reply({ ok: true, gain, counts }, 200, cors);
}

// ------------------------------------------------------------------ 账号档案
async function getAccount(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');

  const row = await kvJson(kv, 'acct_' + (await uhash(me.uid)));
  if (!row) return reply({ ok: true, doc: null, ver: 0, at: 0 }, 200, cors);
  return reply({ ok: true, doc: row.doc || null, ver: Number(row.ver) || 1, at: Number(row.at) || 0 }, 200, cors);
}

// PUT /account { doc, ver }
// ver 是客户端上次拿到的版本号：对不上说明别处已经写过，返回 409 + 服务端最新文档让前端合并重推
async function putAccount(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request);
  if (!b.doc || typeof b.doc !== 'object') throw new HttpError(400, 'bad_doc');

  const key = 'acct_' + (await uhash(me.uid));
  const cur = await kvJson(kv, key);
  const curVer = Number(cur && cur.ver) || 0;
  const myVer = Number(b.ver) || 0;

  if (cur && myVer !== curVer) {
    return reply({ ok: false, error: 'conflict', doc: cur.doc || null, ver: curVer }, 409, cors);
  }

  const nextVer = curVer + 1;
  const at = Date.now();
  await kv.put(key, JSON.stringify({ doc: b.doc, ver: nextVer, at }));
  return reply({ ok: true, ver: nextVer, at }, 200, cors);
}

// ------------------------------------------------------------------ 游戏存档（整份上云）
// 账号档案（/account）只放轻量的积分 / 解锁 / 最高分；挂机前夜这类「整份进度」是大对象，
// 单独一个键 sv_{uid哈希}_{游戏}，带版本号做乐观锁：版本对不上返回 409 + 云端的摘要，
// 由客户端决定用哪份（不会悄悄互相覆盖）。
const SAVE_GAMES = new Set(['idle', 'deathreport', 'binding', 'survivors', 'protocol', 'wolf', 'merge', 'bird']);
const SAVE_MAX = 480 * 1024;

function saveGameOf(g) {
  const game = str(g, 24);
  if (!SAVE_GAMES.has(game)) throw new HttpError(400, 'bad_game');
  return game;
}

// GET /save/:game[?meta=1] —— meta=1 只回摘要（版本 / 时间 / 进度），不带存档正文
async function getSave(request, env, kv, game, url, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');
  const row = await kvJson(kv, 'sv_' + (await uhash(me.uid)) + '_' + game);
  if (!row) return reply({ ok: true, save: null }, 200, cors);
  const out = { ver: Number(row.ver) || 1, at: Number(row.at) || 0, rev: Number(row.rev) || 0, meta: row.meta || null };
  if (url.searchParams.get('meta') !== '1') out.data = row.data;
  return reply({ ok: true, save: out }, 200, cors);
}

// PUT /save/:game { data, ver, rev, meta }
async function putSave(request, env, kv, game, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');
  const b = await readJson(request, SAVE_MAX + 8 * 1024);
  const data = typeof b.data === 'string' ? b.data : JSON.stringify(b.data || null);
  if (!data || data.length > SAVE_MAX) throw new HttpError(413, 'too_large');
  let parsed = null;
  try { parsed = JSON.parse(data); } catch { parsed = null; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new HttpError(400, 'bad_save');

  const key = 'sv_' + (await uhash(me.uid)) + '_' + game;
  const cur = await kvJson(kv, key);
  const curVer = Number(cur && cur.ver) || 0;
  if (cur && Number(b.ver) !== curVer) {
    return reply({ ok: false, error: 'conflict', ver: curVer, at: Number(cur.at) || 0, rev: Number(cur.rev) || 0, meta: cur.meta || null }, 409, cors);
  }
  const meta = b.meta && typeof b.meta === 'object' ? {
    maxStage: Number(b.meta.maxStage) || 0, roster: Number(b.meta.roster) || 0, play: Number(b.meta.play) || 0,
    gold: Number(b.meta.gold) || 0, lastSeen: Number(b.meta.lastSeen) || 0,
    // 通用游戏存档（js/gamecloud.js）：内容哈希 + 键数，客户端用哈希判断「两边其实一样」
    hash: str(b.meta.hash, 16).replace(/[^A-Za-z0-9]/g, ''), n: Number(b.meta.n) || 0,
    // 挂机前夜：主线出战阵容（榜单上展示「通关阵容」）。只收 slug + 等级 + 叠位，其它一律丢掉
    team: (Array.isArray(b.meta.team) ? b.meta.team : []).slice(0, 5).map((t) => ({
      s: str(t && t.s, 40).replace(/[^A-Za-z0-9_-]/g, ''), lv: Math.min(999, Number(t && t.lv) || 0), st: Math.min(20, Number(t && t.st) || 0),
    })).filter((t) => t.s),
  } : null;
  const ver = curVer + 1, at = Date.now();
  await kv.put(key, JSON.stringify({ data, ver, at, rev: Number(b.rev) || 0, meta }));
  return reply({ ok: true, ver, at }, 200, cors);
}

// ------------------------------------------------------------------ 工坊题库
// 索引就一份文档：新题 unshift 到最前，读的时候再按赞数排（题量小，够用）
async function readIndex(kv) {
  const raw = await kvJson(kv, 'meta_idx');
  return Array.isArray(raw) ? raw : [];
}

async function writeIndex(kv, list) {
  await kv.put('meta_idx', JSON.stringify(list.slice(0, IDX_CAP)));
}

async function postPuzzle(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request);
  const payload = b.payload && typeof b.payload === 'object' ? b.payload : null;
  if (!payload || !Array.isArray(payload.team)) throw new HttpError(400, 'bad_puzzle');

  let id = str(b.id || payload.id, 64).trim();
  if (!id) id = 'w-' + Math.random().toString(36).slice(2, 10);

  const ph = await phash(id);
  const cur = await kvJson(kv, 'pz_' + ph);
  if (cur && String(cur.author || '') && String(cur.author) !== me.uid) {
    // id 撞了别人的题：让前端换个 id 重试，不要悄悄覆盖
    throw new HttpError(409, 'dup_id');
  }

  const now = Date.now();
  const title = str(b.title || payload.title || '', 80);
  const at = Number(cur && cur.at) || now;

  const rec = {
    id, author: me.uid, authorName: me.name, title,
    // 单值上限 1MB，正常题目几十 KB，超了就是前端把不该带的带上了
    payload, at, updatedAt: now,
  };
  const body = JSON.stringify(rec);
  if (body.length > 900 * 1024) throw new HttpError(413, 'too_large');

  await kv.put('pz_' + ph, body);

  const idx = (await readIndex(kv)).filter((x) => String(x && x.id) !== id);
  idx.unshift({ id, at });
  await writeIndex(kv, idx);

  return reply({ ok: true, id, likes: await kvNum(kv, 'cnt_' + ph) }, 200, cors);
}

async function getPuzzle(env, kv, id, cors) {
  const ph = await phash(id);
  const row = await kvJson(kv, 'pz_' + ph);
  if (!row) throw new HttpError(404, 'not_found');

  return reply({
    ok: true,
    id: row.id,
    author: row.author || '',
    authorName: row.authorName || '',
    title: row.title || '',
    at: Number(row.at) || 0,
    updatedAt: Number(row.updatedAt) || 0,
    likes: await kvNum(kv, 'cnt_' + ph),
    puzzle: row.payload || null,
  }, 200, cors);
}

async function listPuzzles(request, env, kv, url, cors) {
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const author = str(url.searchParams.get('author'), 64).trim();
  const sort = url.searchParams.get('sort') === 'likes' ? 'likes' : 'new';

  // 索引只存 id 与时间，正文和赞数按需再读（列表一页最多 50 条）
  let idx = (await readIndex(kv)).filter((x) => x && x.id);
  if (author) {
    // 按作者筛需要正文里的 author，先把候选的 pz 读出来
    const own = [];
    for (const x of idx) {
      const row = await kvJson(kv, 'pz_' + (await phash(x.id)));
      if (row && String(row.author || '') === author) own.push(x);
    }
    idx = own;
  }

  const total = idx.length;

  if (sort === 'likes') {
    const scored = await Promise.all(idx.map(async (x) => ({
      x, likes: await kvNum(kv, 'cnt_' + (await phash(x.id))),
    })));
    scored.sort((a, b) => (b.likes - a.likes) || (Number(b.x.at) - Number(a.x.at)));
    idx = scored.map((s) => s.x);
  }

  const page = idx.slice(offset, offset + limit);
  const items = [];
  for (const x of page) {
    const ph = await phash(x.id);
    const row = await kvJson(kv, 'pz_' + ph);
    if (!row) continue; // 索引里残留的旧键，跳过就好
    items.push({
      id: row.id,
      author: row.author || '',
      authorName: row.authorName || '',
      title: row.title || '',
      at: Number(row.at) || 0,
      updatedAt: Number(row.updatedAt) || 0,
      likes: await kvNum(kv, 'cnt_' + ph),
    });
  }

  return reply({ ok: true, items, total, limit, offset }, 200, cors);
}

async function deletePuzzle(request, env, kv, id, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');

  const ph = await phash(id);
  const row = await kvJson(kv, 'pz_' + ph);
  if (!row) throw new HttpError(404, 'not_found');
  if (String(row.author || '') !== me.uid) throw new HttpError(403, 'not_author');

  await kv.delete('pz_' + ph);
  // 赞数一并清掉：否则别人拿同一个 id 重新上传会白捡这道题的赞（再配合结算就是银芯）
  await kv.put('cnt_' + ph, '0');
  const idx = (await readIndex(kv)).filter((x) => String(x && x.id) !== id);
  await writeIndex(kv, idx);
  return reply({ ok: true }, 200, cors);
}


// 按 IP 的每日限额（评分 / BUG / 浏览打点用）：X-Device 之类的身份头是客户端自己报的，
// 光靠它防不住刷。拿不到 IP 就不限（本地测试），拿得到就按天计数。
const HOME_IP_MAX = { rate: 40, bug: 10, visit: 600 };
async function ipLimit(kv, request, tag) {
  const ip = clientIp(request);
  if (!ip) return;
  const key = 'hl_' + tag + '_' + (await ihash(ip)) + '_' + dayKeyFlat();
  const n = await kvNum(kv, key);
  if (n >= HOME_IP_MAX[tag]) throw new HttpError(429, 'rate');
  await kv.put(key, String(n + 1));
}

// ------------------------------------------------------------------ 首页评分 / BUG 反馈
// 表结构（KV）：
//   hragg_{game}           = JSON {n, sum}     综合分：人数与总星数
//   hrv_{game}_{voterhash} = JSON {stars, at, text}  一个人对一个游戏只有一条，重复提交是改分
//   bug_{id}               = JSON {game, text, contact, ver, ua, at}
//   bug_idx                = JSON [id...]      最新的在前，只留 500 条给作者看
// 为什么不做严格去重/防刷：这是同人站的评分，量级小、收益低。
// 但 agg 用「读改写」会有并发丢失，所以写入时用 after-write 重算兜底（见 postHomeRate）。
const HOME_GAMES = new Set(['detective', 'merge', 'bird', 'binding', 'idle', 'survivors', 'protocol', 'wolf', 'deathreport']);
const BUG_IDX_MAX = 500;

// 评分身份：登录用 uid，没登录用本机随机 id（前端 X-Device），都没有就不给投
async function homeVoter(request, env, kv) {
  const me = await whoami(request, env, kv);
  if (me && me.uid) return 'u:' + me.uid;
  const dev = str(request.headers.get('X-Device'), 40).replace(/[^A-Za-z0-9_-]/g, '');
  return dev ? 'd:' + dev : '';
}

// 显示名：登录用户用昵称，游客不留名（评分详情里显示「匿名玩家」）
async function homeName(request, env, kv) {
  const me = await whoami(request, env, kv);
  return me && me.name ? str(me.name, 20) : '';
}

// 评分详情索引：hri_{game} = [{v, s, t, at, n}]，新的在前，最多 200 条。
// v 是投票人哈希的前 12 位（只用来判断「这条是不是我的」，不可逆），s 星数，t 短评，n 昵称。
const REVIEW_MAX = 200;
async function readReviews(kv, game, weak = false) {
  const raw = await kvJson(kv, 'hri_' + game, weak);
  return Array.isArray(raw) ? raw : null;
}
async function saveReview(kv, game, vh, stars, text, name) {
  const list = (await readReviews(kv, game)) || [];
  const v = vh.slice(0, 12);
  const at = Date.now();
  const rest = list.filter((x) => x && x.v !== v);
  rest.unshift({ v, s: stars, t: text, at, n: name });
  await kv.put('hri_' + game, JSON.stringify(rest.slice(0, REVIEW_MAX)));
}

// GET /home/reviews?game=x&limit=50 —— 一个游戏的评分详情：综合分、各星人数分布、最近的短评
async function getHomeReviews(request, env, kv, url, cors) {
  const game = str(url.searchParams.get('game'), 32).trim();
  if (!HOME_GAMES.has(game)) throw new HttpError(400, 'bad_game');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const agg = await kvJson(kv, 'hragg_' + game, true);
  const n = Number(agg && agg.n) || 0;
  const sum = Number(agg && agg.sum) || 0;

  let list = await readReviews(kv, game);
  // 老数据（详情索引上线之前的评分）：存储支持列举时，第一次来看详情就补建一次
  if (!list && n > 0 && typeof kv.list === 'function') {
    try {
      const keys = (await kv.list('hrv_' + game + '_', 300)).slice(0, 300);
      const rows = await mapLimit(keys, 6, async (k) => {
        const r = await kvJson(kv, k);
        return r && r.stars ? { v: String(k).slice(('hrv_' + game + '_').length, ('hrv_' + game + '_').length + 12), s: Number(r.stars) || 0, t: str(r.text, 120), at: Number(r.at) || 0, n: '' } : null;
      });
      list = rows.filter(Boolean).sort((a, b) => b.at - a.at).slice(0, REVIEW_MAX);
      await kv.put('hri_' + game, JSON.stringify(list));
    } catch { list = null; }
  }
  list = list || [];

  const voter = await homeVoter(request, env, kv);
  const mineV = voter ? (await vhash(voter)).slice(0, 12) : '';
  const dist = [0, 0, 0, 0, 0];
  for (const x of list) if (x.s >= 1 && x.s <= 5) dist[x.s - 1] += 1;
  const items = list.slice(0, limit).map((x) => ({
    s: x.s, t: x.t || '', at: x.at || 0, n: x.n || '', mine: !!mineV && x.v === mineV,
  }));
  return reply({
    ok: true, game, n, sum, avg: n ? Math.round((sum / n) * 10) / 10 : 0,
    dist, sample: list.length, items,
  }, 200, cors);
}

// GET /home/ratings?games=a,b
async function getHomeRatings(request, env, kv, url, cors) {
  const games = [...new Set(String(url.searchParams.get('games') || '')
    .split(',').map((x) => x.trim()).filter((g) => HOME_GAMES.has(g)))].slice(0, 20);

  const voter = await homeVoter(request, env, kv);
  const vh = voter ? await vhash(voter) : '';
  const items = {};
  const mine = {};

  await Promise.all(games.map(async (g) => {
    const agg = await kvJson(kv, 'hragg_' + g, true);
    const n = Number(agg && agg.n) || 0;
    const sum = Number(agg && agg.sum) || 0;
    items[g] = { n, sum, avg: n ? Math.round((sum / n) * 10) / 10 : 0 };
    if (vh) {
      const own = await kvJson(kv, 'hrv_' + g + '_' + vh);
      if (own && own.stars) mine[g] = { stars: Number(own.stars) || 0, text: String(own.text || '') };
    }
  }));

  return reply({ ok: true, items, mine, canVote: Boolean(voter) }, 200, cors);
}

// POST /home/rate { game, stars, text }
async function postHomeRate(request, env, kv, cors) {
  const b = await readJson(request, 4 * 1024);
  const game = str(b.game, 32).trim();
  const stars = Math.round(Number(b.stars));
  if (!HOME_GAMES.has(game)) throw new HttpError(400, 'bad_game');
  if (!(stars >= 1 && stars <= 5)) throw new HttpError(400, 'bad_stars');

  const voter = await homeVoter(request, env, kv);
  if (!voter) throw new HttpError(401, 'need_device');
  await ipLimit(kv, request, 'rate');
  const vh = await vhash(voter);

  const key = 'hrv_' + game + '_' + vh;
  const old = await kvJson(kv, key);
  const prev = old && old.stars ? Number(old.stars) : 0;

  const agg = await kvJson(kv, 'hragg_' + game);
  const n0 = Number(agg && agg.n) || 0;
  const sum0 = Number(agg && agg.sum) || 0;
  // 第一次投：人数 +1；改分：人数不变，只换星数
  const n = prev ? n0 : n0 + 1;
  const sum = Math.max(0, sum0 - prev + stars);

  await kv.put(key, JSON.stringify({ stars, text: str(b.text, 120), at: Date.now() }));
  await kv.put('hragg_' + game, JSON.stringify({ n, sum }));
  await saveReview(kv, game, vh, stars, str(b.text, 120), await homeName(request, env, kv));

  return reply({
    ok: true,
    item: { n, sum, avg: n ? Math.round((sum / n) * 10) / 10 : 0 },
    mine: { stars, text: str(b.text, 120) },
  }, 200, cors);
}

// POST /home/bug { game, text, contact, ver, ua }
async function postHomeBug(request, env, kv, cors) {
  const b = await readJson(request, 16 * 1024);
  const text = str(b.text, 1200).trim();
  if (text.length < 8) throw new HttpError(400, 'too_short');
  await ipLimit(kv, request, 'bug');

  const game = HOME_GAMES.has(str(b.game, 32)) ? str(b.game, 32) : 'home';
  // 编号好念一点：B-日期后六位-三位随机
  const id = 'B-' + Date.now().toString(36).slice(-6).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 5).toUpperCase();

  // key 命名统一只用字母数字下划线（真 KV 会拒掉短横线，Blob 也别指望它能转义），编号里的 - 抹掉再当 key
  await kv.put('bug_' + id.replace(/-/g, ''), JSON.stringify({
    id, game, text,
    contact: str(b.contact, 80),
    ver: str(b.ver, 16),
    ua: str(b.ua || request.headers.get('User-Agent'), 300),
    at: Date.now(),
  }));
  const idx = await kvJson(kv, 'bug_idx') || [];
  idx.unshift(id);
  await kv.put('bug_idx', JSON.stringify(idx.slice(0, BUG_IDX_MAX)));

  return reply({ ok: true, id }, 200, cors);
}

// ------------------------------------------------------------------ 站点统计（注册用户 / 今日浏览 / 总浏览）
// 存储只有两个键，读一次写一次，别为了「好看」拆成四个：
//   pv  = { t: 总浏览, d: 'YYYY-MM-DD', n: 当天浏览 }
//   usr_n = 登录过本站的账号数（touchUser 里维护）
// 为什么不做 UV / 来源分析：Blob 没有自增也没有查询，量级小的时候多记一个维度就是多一次写入。
const ADMIN_NAME = '姜酒';       // 首次认领用显示名，认领后钉死 uid（见 isAdmin）

async function getStats(request, env, kv, cors) {
  const pv = await kvJson(kv, 'pv', true);
  const day = dayKey();
  const total = Number(pv && pv.t) || 0;
  const today = pv && pv.d === day ? (Number(pv.n) || 0) : 0;
  const users = await kvNum(kv, 'usr_n', true);
  return reply({ ok: true, users, today, total, day }, 200, cors);
}

// POST /visit { p } —— 页面自己打点。不做去重：PV 本来就是「看了几次」。
async function postVisit(request, env, kv, cors) {
  await ipLimit(kv, request, 'visit');
  const day = dayKey();
  const pv = await kvJson(kv, 'pv');
  const total = (Number(pv && pv.t) || 0) + 1;
  const today = (pv && pv.d === day ? (Number(pv.n) || 0) : 0) + 1;
  await kv.put('pv', JSON.stringify({ t: total, d: day, n: today }));
  const users = await kvNum(kv, 'usr_n', true);
  return reply({ ok: true, users, today, total, day }, 200, cors);
}

// ------------------------------------------------------------------ 管理员
// 「仅姜酒可见」怎么保证：先看 kv 里钉住的 admin_uid；没有钉的时候，
// 显示名必须是「姜酒」的那次登录才能认领，认领后 uid 写死，
// 别人把昵称改成「姜酒」也进不来（昵称可以重名、可以随时改，拿它当钥匙是不安全的）。
// 也可以在环境变量里配 ZJTT_ADMIN_UIDS（逗号分隔）直接指定，省掉认领这一步。
function adminPinned(env) {
  return String((env && env.ZJTT_ADMIN_UIDS) || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
}

// 昵称里常有首尾空格、全角空格、零宽字符；比较前先归一化，否则「姜酒 」认领不了
const normName = (s) => String(s || '').replace(/[\s\u3000\u200b-\u200d\ufeff]/g, '').toLowerCase();

async function isAdmin(env, kv, me) {
  if (!me || !me.uid) return false;
  const fixed = adminPinned(env);
  if (fixed.length) return fixed.includes(String(me.uid));
  const pin = await kv.get('admin_uid');
  if (pin) return String(pin) === String(me.uid);
  if (normName(me.name) === normName(ADMIN_NAME)) {
    await kv.put('admin_uid', String(me.uid));
    return true;
  }
  return false;
}

// 403 时把「为什么不是」一起回给前端。不给的话管理页只能写「你不是站长」，
// 站长本人看到了也没法判断是昵称不对、还是这个位置已经被别人的账号占了。
async function adminWhy(env, kv, me) {
  const name = (me && me.name) || '';
  const uid = (me && me.uid) || '';
  const fixed = adminPinned(env);
  if (fixed.length) {
    return { name, uid, pinned: null, reason: 'allowlist',
      hint: '服务端配了 ZJTT_ADMIN_UIDS，只认名单里的 uid。把下面这个 uid 加进去再重新部署。' };
  }
  const pin = await kv.get('admin_uid');
  if (pin) {
    const same = String(pin) === String(uid);
    return { name, uid, pinned: String(pin), reason: same ? 'ok' : 'pinned',
      hint: same ? '' : 'admin_uid 已经被另一个账号占住了（可能是同名的另一个人先登录过）。删掉这个键，或改用 ZJTT_ADMIN_UIDS 指定。' };
  }
  return { name, uid, pinned: null, reason: 'name',
    hint: `当前显示名是「${name}」，第一次认领要求正好是「${ADMIN_NAME}」（不区分首尾空格）。` };
}

// 403 的原因给前端看，但不带站长的 uid
const publicWhy = (w) => { if (w && typeof w === 'object') { const { pinned, ...rest } = w; return rest; } return w; };

// 从账号档案里挑出「数据情况」——只取概览用的几个数，别把整份文档甩给列表
function acctBrief(doc) {
  const d = doc && typeof doc === 'object' ? doc : null;
  if (!d) return null;
  const st = d.st && typeof d.st === 'object' ? d.st : {};
  return {
    cr: Number(d.cr) || 0,
    played: Number(st.played) || 0,
    won: Number(st.won) || 0,
    cg: Array.isArray(d.cg) ? d.cg.length : 0,
    mb: Number(d.mb) || 0,
    bb: Number(d.bb) || 0,
    hi: Array.isArray(d.hi) ? d.hi.length : 0,
    at: Number(d.at) || 0,
    // 九个游戏的进度摘要（前端 js/gamestats.js 的 digest）：原样透传，后台按固定顺序读。
    // 老档案没有这个字段 → null，后台显示「还没上报」，不是 0。
    gd: (d.gd && typeof d.gd === 'object' && !Array.isArray(d.gd)) ? d.gd : null,
  };
}

// GET /admin/overview
// 读一次失败就再试一次，还不行给默认值：后台概览一口气读几百个键，Blob 偶尔限流，
// 不能因为某一个键读挂就整页 500
async function softly(fn, dflt) {
  try { return await fn(); } catch { /* 再试一次 */ }
  try { return await fn(); } catch { return dflt; }
}

async function getAdminOverview(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');
  if (!(await isAdmin(env, kv, me))) throw new HttpError(403, 'not_admin', publicWhy(await adminWhy(env, kv, me)));

  const keys = (await softly(() => listKeys(kv, 'usr_', 1000), [])).filter((k) => k !== 'usr_n');
  const rows = await mapLimit(keys.slice(0, 300), 6, async (k) => {
    try {
      let u = null;
      try { u = JSON.parse((await softly(() => kv.get(k, { weak: true }), null)) || 'null'); } catch { u = null; }
      if (!u || !u.uid) return null;
      const doc = await softly(async () => (await kvJson(kv, 'acct_' + (await uhash(u.uid)), true) || {}).doc, null);
      let acct = null;
      try { acct = acctBrief(doc); } catch { acct = null; }
      return { uid: String(u.uid), name: String(u.name || ''), at: Number(u.at) || 0, seen: Number(u.seen) || 0, acct };
    } catch { return null; }
  });

  const users = rows.filter(Boolean).sort((a, b) => (b.seen || b.at) - (a.seen || a.at));
  const pv = await softly(() => kvJson(kv, 'pv', true), null);
  const day = dayKey();
  const bugs = await softly(() => kvJson(kv, 'bug_idx', true), null);
  const usrN = await softly(() => kvNum(kv, 'usr_n', true), 0);

  return reply({
    ok: true,
    me: { uid: me.uid, name: me.name },
    stats: {
      users: Number(usrN) || users.length,
      today: pv && pv.d === day ? (Number(pv.n) || 0) : 0,
      total: Number(pv && pv.t) || 0,
      bugs: Array.isArray(bugs) ? bugs.length : 0,
      synced: users.filter((u) => u.acct).length,
    },
    users,
  }, 200, cors);
}

// 赠礼记录：银芯 amount 和/或挂机前夜唤醒体 awk（slug 列表）。两样可以只发一样。
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/i;
function cleanAwk(v) {
  const list = Array.isArray(v) ? v : [];
  return [...new Set(list.map((x) => str(x, 40).trim()).filter((x) => SLUG_RE.test(x)))].slice(0, 20);
}

// 追加一条赠礼：全局索引一份（后台看历史），按人存一份（领取时只读一个键，不用扫全表）
async function putGrant(kv, uid, rec) {
  const mineKey = 'gm_' + (await uhash(uid));
  const mine = await kvJson(kv, mineKey) || [];
  mine.unshift(rec);
  await kv.put(mineKey, JSON.stringify(mine.slice(0, 100)));
}
async function putGrantIndex(kv, rec) {
  await kv.put('grant_' + rec.id, JSON.stringify(rec));
  const idx = await kvJson(kv, 'grant_idx') || [];
  idx.unshift(rec.id);
  await kv.put('grant_idx', JSON.stringify(idx.slice(0, 500)));
}
function grantRecord(b, me, to) {
  const amount = Math.round(Number(b.amount) || 0);
  const awk = cleanAwk(b.awk);
  const note = str(b.note, 120).trim();
  if (!(amount >= 0 && amount <= 100000)) throw new HttpError(400, 'bad_amount');
  if (!amount && !awk.length) throw new HttpError(400, 'bad_amount');
  const id = 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = { id, amount, note, at: Date.now(), by: me.name || me.uid };
  if (awk.length) rec.awk = awk;
  if (to != null) rec.to = to;
  return rec;
}

// POST /admin/grant { uid, amount, awk?, note }
// 走「赠礼」而不是直接改别人的档案：账号档案有版本号乐观锁，管理员硬写会和
// 用户那次同步撞车。赠礼是追加式记录，用户下次同步时幂等领取（js/account.js 的 claimGrants）。
async function postAdminGrant(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');
  if (!(await isAdmin(env, kv, me))) throw new HttpError(403, 'not_admin', publicWhy(await adminWhy(env, kv, me)));

  const b = await readJson(request, 4 * 1024);
  const uid = str(b.uid, 64).trim();
  if (!uid) throw new HttpError(400, 'bad_uid');
  const rec = grantRecord(b, me, null);
  await putGrantIndex(kv, rec);
  await putGrant(kv, uid, rec);
  return reply({ ok: true, id: rec.id, amount: rec.amount, awk: rec.awk || [], uid, note: rec.note }, 200, cors);
}

// POST /admin/grant-batch { uids?: string[], all?: boolean, amount, awk?, note }
// 一次发给多人（或所有登录过本站的账号）。同一条赠礼共用一个 id：每个账号在自己本机各领一次。
async function postAdminGrantBatch(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) throw new HttpError(401, 'need_login');
  if (!(await isAdmin(env, kv, me))) throw new HttpError(403, 'not_admin', publicWhy(await adminWhy(env, kv, me)));

  const b = await readJson(request, 32 * 1024);
  let uids = [];
  if (b.all === true) {
    const keys = await listKeys(kv, 'usr_', 1000);
    const rows = await mapLimit(keys.filter((k) => k !== 'usr_n').slice(0, 500), 6, async (k) => {
      try { const u = JSON.parse((await kv.get(k, { weak: true })) || 'null'); return u && u.uid ? String(u.uid) : ''; } catch { return ''; }
    });
    uids = rows.filter(Boolean);
  } else {
    uids = (Array.isArray(b.uids) ? b.uids : []).map((x) => str(x, 64).trim()).filter(Boolean);
  }
  uids = [...new Set(uids)].slice(0, 500);
  if (!uids.length) throw new HttpError(400, 'bad_uid');
  const rec = grantRecord(b, me, uids.length);
  await putGrantIndex(kv, rec);
  let ok = 0;
  await mapLimit(uids, 6, async (uid) => { try { await putGrant(kv, uid, rec); ok++; } catch { /* 个别失败不影响其余 */ } });
  return reply({ ok: true, id: rec.id, amount: rec.amount, awk: rec.awk || [], sent: ok, total: uids.length, note: rec.note }, 200, cors);
}


// ------------------------------------------------------------------ 榜单
// GET /board —— 各游戏榜单（公开）。数据全来自玩家自己的云端档案摘要（gd）与挂机云存档的摘要，
// 没登录 / 没同步过的人不会上榜。每次重算要读几百个键，所以缓存 3 分钟。
const BOARD_TTL = 3 * 60 * 1000;
// [游戏键, gd 键, 取分的下标, 说明, 副标]
const BOARD_SPEC = [
  // 战报侦探：按答对的题数排，副标写正确率；答对数相同时正确率高的在前
  { k: 'dr', gd: 'dr', i: 1, unit: '题', label: '答对题数',
    sub: (v) => (Number(v[0]) > 0 ? `正确率 ${Math.round((Number(v[1]) || 0) / Number(v[0]) * 100)}% · 共答 ${Number(v[0])} 题` : ''),
    tb: (v) => (Number(v[0]) > 0 ? (Number(v[1]) || 0) / Number(v[0]) : 0) },
  { k: 'mg', gd: 'mg', i: 0, unit: '分', label: '最高分' },
  { k: 'bd', gd: 'bd', i: 1, unit: '分', label: '最高分', sub: (v) => (v[0] ? `最深 ${Number(v[0])} 层` : '') },
  { k: 'bn', gd: 'bn', i: 0, unit: '层', label: '最深楼层', sub: (v) => (v[1] ? `通关 ${Number(v[1])} 次` : '') },
  { k: 'sv', gd: 'sv', i: 0, unit: '分', label: '最高分' },
  { k: 'pf', gd: 'pf', i: 1, unit: '分', label: '最高分', sub: (v) => (v[0] ? `最远第 ${Number(v[0])} 波` : '') },
  { k: 'wf', gd: 'wf', i: 1, unit: '胜', label: '胜场', sub: (v) => (v[0] ? `共 ${Number(v[0])} 局` : '') },
  { k: 'dt', gd: 'dt', i: 0, unit: '条', label: '已复原记录', sub: (v) => (v[2] ? `结案 ${Number(v[2])}` : '') },
];
async function buildBoard(kv) {
  const keys = (await softly(() => listKeys(kv, 'usr_', 1000), [])).filter((k) => k !== 'usr_n').slice(0, 500);
  const rows = await mapLimit(keys, 6, async (k) => {
    let u = null;
    try { u = JSON.parse((await softly(() => kv.get(k, { weak: true }), null)) || 'null'); } catch { u = null; }
    if (!u || !u.uid || !u.name) return null;
    const uh = await uhash(u.uid);
    let gd = null, il = null;
    try { const a = await softly(() => kvJson(kv, 'acct_' + uh, true), null); gd = a && a.doc && a.doc.gd && typeof a.doc.gd === 'object' ? a.doc.gd : null; } catch { gd = null; }
    try { const sv = await softly(() => kvJson(kv, 'sv_' + uh + '_idle', true), null); il = sv && sv.meta ? sv.meta : null; } catch { il = null; }
    return { name: String(u.name).slice(0, 24), gd, il };
  });
  const users = rows.filter(Boolean);
  const out = {};
  for (const sp of BOARD_SPEC) {
    const list = [];
    for (const u of users) {
      const v = u.gd && Array.isArray(u.gd[sp.gd]) ? u.gd[sp.gd] : null;
      const score = v ? Math.round(Number(v[sp.i]) || 0) : 0;
      if (score > 0) list.push({ name: u.name, score, sub: sp.sub ? sp.sub(v) : '', tb: sp.tb ? sp.tb(v) : 0 });
    }
    list.sort((a, b) => b.score - a.score || b.tb - a.tb);
    out[sp.k] = { label: sp.label, unit: sp.unit, items: list.slice(0, 20).map(({ tb, ...it }) => it) };
  }
  // 挂机前夜：主线通关进度 + 通关阵容（云存档摘要里的 team），没上传云存档的退回档案里的最高关卡
  const il = [];
  for (const u of users) {
    const m = u.il, g = u.gd && Array.isArray(u.gd.il) ? u.gd.il : null;
    const stage = Math.max(Number(m && m.maxStage) || 0, Number(g && g[2]) || 0);
    if (stage > 0) il.push({ name: u.name, score: stage, team: m && Array.isArray(m.team) ? m.team : [] });
  }
  il.sort((a, b) => b.score - a.score);
  out.il = { label: '主线通关', unit: '关', items: il.slice(0, 20) };
  return out;
}
async function getBoard(request, env, kv, cors) {
  const cur = await kvJson(kv, 'board_cache', true);
  if (cur && Date.now() - Number(cur.at) < BOARD_TTL && cur.games) return reply({ ok: true, at: cur.at, games: cur.games }, 200, cors);
  const games = await buildBoard(kv);
  const at = Date.now();
  try { await kv.put('board_cache', JSON.stringify({ at, games })); } catch { /* 缓存写失败也要给结果 */ }
  return reply({ ok: true, at, games }, 200, cors);
}

// GET /grants/mine —— 登录用户拉自己还没领的赠礼（前端按已领 id 过滤，天然幂等）
async function getMyGrants(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) return reply({ ok: true, items: [] }, 200, cors);
  const list = await kvJson(kv, 'gm_' + (await uhash(me.uid))) || [];
  return reply({
    ok: true,
    items: (Array.isArray(list) ? list : []).map((g) => ({
      id: String(g.id || ''), amount: Number(g.amount) || 0, note: String(g.note || ''), at: Number(g.at) || 0,
      awk: cleanAwk(g.awk),
    })).filter((g) => g.id && (g.amount > 0 || g.awk.length)),
  }, 200, cors);
}

// GET /whoami —— 前端用来判断「我是不是管理员」（只回名字与 flag，不回 uid）
async function getWhoami(request, env, kv, cors) {
  const me = await whoami(request, env, kv);
  if (!me) return reply({ ok: true, logged: false, admin: false }, 200, cors);
  const admin = await isAdmin(env, kv, me);
  const why = admin ? {} : await adminWhy(env, kv, me);
  // pinned 是站长的 uid，不能发给别的账号；hint 里本来也不含它
  if (why && 'pinned' in why) delete why.pinned;
  return reply({ ok: true, logged: true, name: me.name, uid: me.uid, admin, ...why }, 200, cors);
}

// ------------------------------------------------------------------ 路由
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cors = corsHeaders(request.headers.get('Origin') || '', env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // 挂在 /api/[[default]] 下，先把 /api 前缀剥掉，后面按原来的路径分发
  let path = url.pathname;
  if (path === '/api' || path === '/api/') path = '/';
  else if (path.startsWith('/api/')) path = path.slice(4);
  path = path.replace(/\/+$/, '') || '/';

  const method = request.method;

  try {
    // /health 先于存储检查：存储不可用时也要能答话，否则探活永远是 500 说不清原因
    if (path === '/health' || path === '/') {
      let store = null;
      let why = null;
      try { store = storeOf(env); } catch (e) { store = null; why = (e && e.detail) || null; }
      const kind = store ? (store.__kind || 'kv') : null;
      const pin = String((env && env.ZJTT_STORE) || '').toLowerCase() || null;
      return reply({
        // v 是接口版本，不是代码版本：v2 只有点赞/档案/题库，
        // v3 才有 /stats /whoami /admin/*（管理页靠它判断要不要提示「重新部署」），
        // v4 修好 whoami 的验票地址（GET /api/token），管理页与云端档案才真正能用，
        // v8 多了 /board（各游戏榜单）与 /admin/grant-batch（批量发银芯 / 唤醒体）；
        // v7 多了 /save/:game（整份游戏存档上云，挂机前夜用），
        // v6 多了 /home/reviews（评分详情：分布 + 短评），
        // v5 档案里多了 gd（九个游戏的进度摘要），管理页能看全部游戏 + 挂机时长/角色数
        ok: Boolean(store), service: 'zjtt', v: 8, runtime: 'edgeone',
        store: kind, pin, storeOk: Boolean(store),
        // KV 是否绑上单独报：默认不用 KV，绑了也不影响（除非 ZJTT_STORE=kv）
        kvBound: Boolean(kvBinding(env)), day: dayKey(),
        ...(store ? {} : {
          error: 'no_store',
          detail: why || 'Blob 没拿到凭据（项目设置 → 环境变量，配 ZJTT_BLOB_TOKEN 与 ZJTT_BLOB_PROJECT）',
        }),
      }, store ? 200 : 503, cors);
    }

    const kv = storeOf(env);

    if (path === '/likes' && method === 'GET') return await getLikes(request, env, kv, url, cors);
    if (path === '/like' && method === 'POST') return await postLike(request, env, kv, cors);
    if (path === '/claim' && method === 'POST') return await postClaim(request, env, kv, cors);

    if (path === '/home/ratings' && method === 'GET') return await getHomeRatings(request, env, kv, url, cors);
    if (path === '/home/rate' && method === 'POST') return await postHomeRate(request, env, kv, cors);
    if (path === '/home/reviews' && method === 'GET') return await getHomeReviews(request, env, kv, url, cors);
    if (path === '/home/bug' && method === 'POST') return await postHomeBug(request, env, kv, cors);

    // 站点统计 / 赠礼 / 管理员
    if (path === '/stats' && method === 'GET') return await getStats(request, env, kv, cors);
    if (path === '/visit' && method === 'POST') return await postVisit(request, env, kv, cors);
    if (path === '/whoami' && method === 'GET') return await getWhoami(request, env, kv, cors);
    if (path === '/grants/mine' && method === 'GET') return await getMyGrants(request, env, kv, cors);
    if (path === '/admin/overview' && method === 'GET') return await getAdminOverview(request, env, kv, cors);
    if (path === '/admin/grant' && method === 'POST') return await postAdminGrant(request, env, kv, cors);
    if (path === '/admin/grant-batch' && method === 'POST') return await postAdminGrantBatch(request, env, kv, cors);
    if (path === '/board' && method === 'GET') return await getBoard(request, env, kv, cors);

    const sv = path.match(/^\/save\/([^/]+)$/);
    if (sv) {
      const game = saveGameOf(decodeURIComponent(sv[1]));
      if (method === 'GET') return await getSave(request, env, kv, game, url, cors);
      if (method === 'PUT') return await putSave(request, env, kv, game, cors);
    }

    if (path === '/account' && method === 'GET') return await getAccount(request, env, kv, cors);
    if (path === '/account' && method === 'PUT') return await putAccount(request, env, kv, cors);

    if (path === '/puzzles' && method === 'GET') return await listPuzzles(request, env, kv, url, cors);
    if (path === '/puzzle' && method === 'POST') return await postPuzzle(request, env, kv, cors);

    const one = path.match(/^\/puzzle\/([^/]+)$/);
    if (one) {
      const id = decodeURIComponent(one[1]);
      if (method === 'GET') return await getPuzzle(env, kv, id, cors);
      if (method === 'DELETE') return await deletePuzzle(request, env, kv, id, cors);
    }

    throw new HttpError(404, 'not_found');
  } catch (e) {
    if (e instanceof HttpError) {
      return reply({ ok: false, error: e.code, detail: e.detail || null }, e.status, cors);
    }
    return reply({ ok: false, error: 'server', detail: String((e && e.message) || e) }, 500, cors);
  }
}

// 本地测试用：不部署也能验证 Blob 适配层的语义（get/put/delete + 一致性开关）
export { blobKV };
