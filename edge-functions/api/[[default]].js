// 战报侦探 后端 —— 腾讯 EdgeOne Pages 版（Edge Functions + KV）
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
const dayKeyFlat = () => dayKey().replace(/-/g, ''); // KV 的 key 只允许字母数字下划线

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
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Dev-Id',
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
// 前端把 Waline 登录得到的 token 放在 Authorization 里；这里回源验一次，验过缓存进 sess
async function whoami(request, env, kv) {
  const raw = String(request.headers.get('Authorization') || '');
  const m = raw.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : '';
  if (!token) return null;

  const th = await thash(token);
  const hit = await kvJson(kv, 'sess_' + th);
  if (hit && Date.now() - Number(hit.at) < SESSION_TTL) {
    return { uid: String(hit.uid), name: String(hit.name || ''), token };
  }

  const base = String((env && env.WALINE_URL) || 'https://textbox.qingdengbuyi.top').replace(/\/+$/, '');

  let data = null;
  try {
    const r = await fetch(`${base}/api/user`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!r.ok) return null;
    const j = await r.json();
    data = j && j.data;
  } catch {
    return null;
  }
  if (!data || !data.objectId) return null;

  const name = str(data.display_name || data.nick || '', 40);
  await kv.put('sess_' + th, JSON.stringify({ uid: String(data.objectId), name, at: Date.now() }));
  return { uid: String(data.objectId), name, token };
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
    // 上传过的题要认作者；只在本地的题没有归属记录，允许本人结算
    if (own && String(own.author || '') && String(own.author) !== me.uid) continue;

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
  const idx = (await readIndex(kv)).filter((x) => String(x && x.id) !== id);
  await writeIndex(kv, idx);
  return reply({ ok: true }, 200, cors);
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
        ok: Boolean(store), service: 'zjtt', v: 2, runtime: 'edgeone',
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
