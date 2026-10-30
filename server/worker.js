// 战报侦探 后端 —— Cloudflare Worker + D1
//
// 站点是 GitHub Pages 静态页，之前把「账号档案」和「点赞」都借用 Waline 的评论表：
// 一条评论存 base64 文档、一个路径下的评论数当赞数。读写既受发帖限频和格式约束，
// 「每人每天 10 次点赞」也只能在前端判断，清一下 localStorage 就能绕过。
//
// 这里把三类数据搬到自己的库，规则由服务端执行：
//   · 账号档案 —— 一位用户一条文档，带版本号做乐观锁（多端同时改不会互相覆盖）
//   · 点赞     —— (题目, 身份) 主键唯一，每日额度服务端计数
//   · 工坊题库 —— 自建题存在服务端，别人按 id 直接拉，不再依赖 jsonblob / Gist
//
// 身份仍复用 Waline：前端登录拿到的 token 原样带上来，这里回源校验一次后缓存。

const LIKE_MAX = 10;              // 每人每天最多点赞数
const GUEST_IP_MAX = 40;          // 游客同一 IP 每天上限（换 dev id 刷不动的兜底）
const SESSION_TTL = 7 * 86400e3;  // token 校验结果缓存 7 天
const MAX_BODY = 512 * 1024;      // 请求体上限（档案里塞了几百条历史，留够余量）

const DEFAULT_ORIGINS = [
  'https://z769018860.github.io',
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

// ------------------------------------------------------------------ 基础工具
const dayKey = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

const str = (v, max) => String(v == null ? '' : v).slice(0, max);

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

class HttpError extends Error {
  constructor(status, code, detail) {
    super(code);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function corsHeaders(origin, env) {
  const allow = String(env.ALLOWED_ORIGINS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const list = allow.length ? allow : DEFAULT_ORIGINS;
  const h = {
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Dev-Id,X-Device',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  // 本地调试：静态服务换端口很常见，localhost 一律放行；线上域名仍走白名单
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && (local || list.includes('*') || list.includes(origin))) {
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

const clientIp = (request) => str(request.headers.get('CF-Connecting-IP'), 64);

// ------------------------------------------------------------------ 身份
// 前端把 Waline 登录得到的 token 放在 Authorization 里；这里回源验一次，验过缓存进 sessions。
async function whoami(request, env) {
  const raw = String(request.headers.get('Authorization') || '');
  const m = raw.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : '';
  if (!token) return null;

  const thash = await sha256(token);
  const hit = await env.DB.prepare('SELECT uid, name, at FROM sessions WHERE thash = ?').bind(thash).first();
  if (hit && Date.now() - Number(hit.at) < SESSION_TTL) {
    return { uid: String(hit.uid), name: String(hit.name || ''), token };
  }

  const base = String(env.WALINE_URL || '').replace(/\/+$/, '');
  if (!base) return null;

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
  await env.DB
    .prepare('INSERT OR REPLACE INTO sessions (thash, uid, name, at) VALUES (?,?,?,?)')
    .bind(thash, String(data.objectId), name, Date.now())
    .run();
  return { uid: String(data.objectId), name, token };
}

// 点赞身份：登录用户由服务端从 token 推出（前端伪造不了），游客用本机随机 id
function voterOf(me, request) {
  if (me) return 'u' + me.uid;
  const dev = str(request.headers.get('X-Dev-Id'), 32).replace(/[^A-Za-z0-9_-]/g, '');
  return dev ? 'd' + dev : null;
}

// ------------------------------------------------------------------ 点赞
async function countOf(env, puzzle) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE puzzle = ?').bind(puzzle).first();
  return Number(row && row.n) || 0;
}

async function usedToday(env, voter, day) {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE voter = ? AND day = ?').bind(voter, day).first();
  return Number(row && row.n) || 0;
}

// GET /likes?ids=a,b,c
async function getLikes(request, env, url, cors) {
  const ids = [...new Set(
    String(url.searchParams.get('ids') || '')
      .split(',').map((s) => s.trim()).filter(Boolean),
  )].slice(0, 60);

  const counts = {};
  for (const id of ids) counts[id] = 0;

  if (ids.length) {
    const ph = ids.map(() => '?').join(',');
    const rows = await env.DB
      .prepare(`SELECT puzzle, COUNT(*) AS n FROM likes WHERE puzzle IN (${ph}) GROUP BY puzzle`)
      .bind(...ids).all();
    for (const row of rows.results || []) counts[String(row.puzzle)] = Number(row.n) || 0;
  }

  const me = await whoami(request, env);
  const voter = voterOf(me, request);
  const voted = {};
  let left = LIKE_MAX;

  if (voter) {
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      const rows = await env.DB
        .prepare(`SELECT puzzle FROM likes WHERE voter = ? AND puzzle IN (${ph})`)
        .bind(voter, ...ids).all();
      for (const row of rows.results || []) voted[String(row.puzzle)] = true;
    }
    left = Math.max(0, LIKE_MAX - (await usedToday(env, voter, dayKey())));
  }

  return reply({ ok: true, counts, voted, left, day: dayKey() }, 200, cors);
}

// POST /like { puzzle }
async function postLike(request, env, cors) {
  const b = await readJson(request, 8 * 1024);
  const pid = str(b.puzzle, 64).trim();
  if (!pid) throw new HttpError(400, 'bad_puzzle');

  const me = await whoami(request, env);
  const voter = voterOf(me, request);
  if (!voter) throw new HttpError(400, 'no_voter');

  const day = dayKey();

  // 自己的题不能自己刷赞
  if (me) {
    const own = await env.DB.prepare('SELECT author FROM puzzles WHERE id = ?').bind(pid).first();
    if (own && String(own.author || '') === me.uid) throw new HttpError(403, 'self');
  }

  const dup = await env.DB
    .prepare('SELECT 1 FROM likes WHERE puzzle = ? AND voter = ?').bind(pid, voter).first();
  if (dup) {
    const count = await countOf(env, pid);
    const left = Math.max(0, LIKE_MAX - (await usedToday(env, voter, day)));
    return reply({ ok: true, duplicate: true, count, left, voted: true }, 200, cors);
  }

  const used = await usedToday(env, voter, day);
  if (used >= LIKE_MAX) {
    return reply({ ok: false, error: 'quota', count: await countOf(env, pid), left: 0 }, 429, cors);
  }

  // 游客没有稳定身份，按 IP 兜一层，避免换 dev id 无限刷
  if (!me) {
    const ip = clientIp(request);
    if (ip) {
      const row = await env.DB
        .prepare('SELECT COUNT(*) AS n FROM likes WHERE ip = ? AND day = ?').bind(ip, day).first();
      if ((Number(row && row.n) || 0) >= GUEST_IP_MAX) {
        return reply({ ok: false, error: 'rate', left: Math.max(0, LIKE_MAX - used) }, 429, cors);
      }
    }
  }

  try {
    await env.DB
      .prepare('INSERT INTO likes (puzzle, voter, uid, day, at, ip) VALUES (?,?,?,?,?,?)')
      .bind(pid, voter, me ? me.uid : null, day, Date.now(), me ? null : clientIp(request))
      .run();
  } catch (e) {
    // 并发下撞主键：当作已经点过
    if (/UNIQUE|constraint/i.test(String(e && e.message))) {
      const count = await countOf(env, pid);
      return reply({ ok: true, duplicate: true, count, left: Math.max(0, LIKE_MAX - used), voted: true }, 200, cors);
    }
    throw e;
  }

  const count = await countOf(env, pid);
  return reply({ ok: true, count, left: Math.max(0, LIKE_MAX - (used + 1)), voted: true }, 200, cors);
}

// POST /claim { puzzles: [] } —— 作者把「还没折成银芯的赞」领走，服务端保证幂等
async function postClaim(request, env, cors) {
  const me = await whoami(request, env);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request, 16 * 1024);
  const ids = [...new Set((Array.isArray(b.puzzles) ? b.puzzles : []).map((x) => str(x, 64)).filter(Boolean))].slice(0, 100);
  if (!ids.length) return reply({ ok: true, gain: 0, counts: {} }, 200, cors);

  const counts = {};
  let gain = 0;

  for (const pid of ids) {
    const own = await env.DB.prepare('SELECT author FROM puzzles WHERE id = ?').bind(pid).first();
    // 只认服务端有归属记录、且作者就是本人的题（以前没记录的题也能结算，官方题的赞会被各账号分别领走）
    if (!own || !String(own.author || '') || String(own.author) !== me.uid) continue;

    const count = await countOf(env, pid);
    counts[pid] = count;

    const row = await env.DB
      .prepare('SELECT credited FROM claims WHERE author = ? AND puzzle = ?').bind(me.uid, pid).first();
    const prev = Math.max(0, Number(row && row.credited) || 0);
    if (count > prev) gain += count - prev;

    await env.DB
      .prepare('INSERT INTO claims (author, puzzle, credited, at) VALUES (?,?,?,?) ON CONFLICT(author, puzzle) DO UPDATE SET credited = excluded.credited, at = excluded.at')
      .bind(me.uid, pid, Math.max(prev, count), Date.now())
      .run();
  }

  return reply({ ok: true, gain, counts }, 200, cors);
}

// ------------------------------------------------------------------ 账号档案
async function getAccount(request, env, cors) {
  const me = await whoami(request, env);
  if (!me) throw new HttpError(401, 'need_login');

  const row = await env.DB
    .prepare('SELECT doc, ver, at FROM accounts WHERE uid = ?').bind(me.uid).first();
  if (!row) return reply({ ok: true, doc: null, ver: 0, at: 0 }, 200, cors);

  let doc = null;
  try { doc = JSON.parse(row.doc); } catch { doc = null; }
  return reply({ ok: true, doc, ver: Number(row.ver) || 1, at: Number(row.at) || 0 }, 200, cors);
}

// PUT /account { doc, ver }
// ver 是客户端上次拿到的版本号：对不上说明别处已经写过，返回 409 + 服务端最新文档让前端合并重推。
async function putAccount(request, env, cors) {
  const me = await whoami(request, env);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request);
  if (!b.doc || typeof b.doc !== 'object') throw new HttpError(400, 'bad_doc');

  const body = JSON.stringify(b.doc);
  const cur = await env.DB
    .prepare('SELECT doc, ver FROM accounts WHERE uid = ?').bind(me.uid).first();
  const curVer = Number(cur && cur.ver) || 0;
  const myVer = Number(b.ver) || 0;

  if (cur && myVer !== curVer) {
    let doc = null;
    try { doc = JSON.parse(cur.doc); } catch { doc = null; }
    return reply({ ok: false, error: 'conflict', doc, ver: curVer }, 409, cors);
  }

  const nextVer = curVer + 1;
  await env.DB
    .prepare('INSERT INTO accounts (uid, doc, ver, at) VALUES (?,?,?,?) ON CONFLICT(uid) DO UPDATE SET doc = excluded.doc, ver = excluded.ver, at = excluded.at')
    .bind(me.uid, body, nextVer, Date.now())
    .run();

  return reply({ ok: true, ver: nextVer, at: Date.now() }, 200, cors);
}

// ------------------------------------------------------------------ 工坊题库
async function postPuzzle(request, env, cors) {
  const me = await whoami(request, env);
  if (!me) throw new HttpError(401, 'need_login');

  const b = await readJson(request);
  const payload = b.payload && typeof b.payload === 'object' ? b.payload : null;
  if (!payload || !Array.isArray(payload.team)) throw new HttpError(400, 'bad_puzzle');

  let id = str(b.id || payload.id, 64).trim();
  if (!id) id = 'w-' + Math.random().toString(36).slice(2, 10);

  const cur = await env.DB.prepare('SELECT author FROM puzzles WHERE id = ?').bind(id).first();
  if (cur && String(cur.author || '') && String(cur.author) !== me.uid) {
    // id 撞了别人的题：让前端换个 id 重试，不要悄悄覆盖
    throw new HttpError(409, 'dup_id');
  }

  const now = Date.now();
  const title = str(b.title || payload.title || '', 80);
  await env.DB
    .prepare('INSERT INTO puzzles (id, author, author_name, title, payload, at, updated_at) VALUES (?,?,?,?,?,?,?) ' +
      'ON CONFLICT(id) DO UPDATE SET author = excluded.author, author_name = excluded.author_name, ' +
      'title = excluded.title, payload = excluded.payload, updated_at = excluded.updated_at')
    .bind(id, me.uid, me.name, title, JSON.stringify(payload), now, now)
    .run();

  return reply({ ok: true, id, likes: await countOf(env, id) }, 200, cors);
}

async function getPuzzle(env, id, cors) {
  const row = await env.DB
    .prepare('SELECT id, author, author_name, title, payload, at, updated_at FROM puzzles WHERE id = ?')
    .bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');

  let payload = null;
  try { payload = JSON.parse(row.payload); } catch { payload = null; }

  return reply({
    ok: true,
    id: row.id,
    author: row.author || '',
    authorName: row.author_name || '',
    title: row.title || '',
    at: Number(row.at) || 0,
    updatedAt: Number(row.updated_at) || 0,
    likes: await countOf(env, id),
    puzzle: payload,
  }, 200, cors);
}

async function listPuzzles(request, env, url, cors) {
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const author = str(url.searchParams.get('author'), 64).trim();
  const sort = url.searchParams.get('sort') === 'likes' ? 'likes' : 'new';

  const where = author ? 'WHERE author = ?' : '';
  const binds = author ? [author] : [];

  const rows = await env.DB
    .prepare(`SELECT id, author, author_name, title, at, updated_at,
                     (SELECT COUNT(*) FROM likes WHERE likes.puzzle = puzzles.id) AS likes
              FROM puzzles ${where}
              ORDER BY ${sort === 'likes' ? 'likes DESC, updated_at DESC' : 'updated_at DESC'}
              LIMIT ? OFFSET ?`)
    .bind(...binds, limit, offset)
    .all();

  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM puzzles ${where}`)
    .bind(...binds).first();

  const items = (rows.results || []).map((r) => ({
    id: r.id,
    author: r.author || '',
    authorName: r.author_name || '',
    title: r.title || '',
    at: Number(r.at) || 0,
    updatedAt: Number(r.updated_at) || 0,
    likes: Number(r.likes) || 0,
  }));

  return reply({ ok: true, items, total: Number(totalRow && totalRow.n) || 0, limit, offset }, 200, cors);
}

async function deletePuzzle(request, env, id, cors) {
  const me = await whoami(request, env);
  if (!me) throw new HttpError(401, 'need_login');

  const row = await env.DB.prepare('SELECT author FROM puzzles WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'not_found');
  if (String(row.author || '') !== me.uid) throw new HttpError(403, 'not_author');

  await env.DB.prepare('DELETE FROM puzzles WHERE id = ?').bind(id).run();
  // 赞一起清掉，别人用同一个 id 重传不会继承
  await env.DB.prepare('DELETE FROM likes WHERE puzzle = ?').bind(id).run();
  return reply({ ok: true }, 200, cors);
}

// ------------------------------------------------------------------ 路由

// ------------------------------------------------------------------ 首页评分 / BUG 反馈
// 规则和 EdgeOne 版一致：一人一游戏一条评分（重复提交 = 改分），
// 综合分 = SUM(stars)/COUNT(*)。表结构见 schema.sql 的 home_ratings / home_bugs。
const HOME_GAMES = new Set(['detective', 'merge', 'bird', 'binding', 'idle', 'survivors', 'protocol', 'wolf', 'deathreport']);

async function homeVoter(request, env) {
  const me = await whoami(request, env);
  if (me && me.uid) return 'u:' + me.uid;
  const dev = str(request.headers.get('X-Device') || request.headers.get('X-Dev-Id'), 40)
    .replace(/[^A-Za-z0-9_-]/g, '');
  return dev ? 'd:' + dev : '';
}

// GET /home/ratings?games=a,b
async function getHomeRatings(request, env, url, cors) {
  const games = [...new Set(String(url.searchParams.get('games') || '')
    .split(',').map((x) => x.trim()).filter((g) => HOME_GAMES.has(g)))].slice(0, 20);

  const items = {};
  for (const g of games) items[g] = { n: 0, sum: 0, avg: 0 };
  if (games.length) {
    const ph = games.map(() => '?').join(',');
    const rows = await env.DB
      .prepare(`SELECT game, COUNT(*) AS n, SUM(stars) AS sum FROM home_ratings WHERE game IN (${ph}) GROUP BY game`)
      .bind(...games).all();
    for (const row of rows.results || []) {
      const n = Number(row.n) || 0;
      const sum = Number(row.sum) || 0;
      items[String(row.game)] = { n, sum, avg: n ? Math.round((sum / n) * 10) / 10 : 0 };
    }
  }

  const voter = await homeVoter(request, env);
  const mine = {};
  if (voter && games.length) {
    const ph = games.map(() => '?').join(',');
    const rows = await env.DB
      .prepare(`SELECT game, stars, body FROM home_ratings WHERE voter = ? AND game IN (${ph})`)
      .bind(voter, ...games).all();
    for (const row of rows.results || []) mine[String(row.game)] = { stars: Number(row.stars) || 0, text: String(row.body || '') };
  }

  return reply({ ok: true, items, mine, canVote: Boolean(voter) }, 200, cors);
}

// POST /home/rate { game, stars, text }
async function postHomeRate(request, env, cors) {
  const b = await readJson(request, 4 * 1024);
  const game = str(b.game, 32).trim();
  const stars = Math.round(Number(b.stars));
  if (!HOME_GAMES.has(game)) throw new HttpError(400, 'bad_game');
  if (!(stars >= 1 && stars <= 5)) throw new HttpError(400, 'bad_stars');

  const voter = await homeVoter(request, env);
  if (!voter) throw new HttpError(401, 'need_device');

  await env.DB
    .prepare('INSERT INTO home_ratings (game, voter, stars, body, at) VALUES (?,?,?,?,?) '
      + 'ON CONFLICT(game, voter) DO UPDATE SET stars = excluded.stars, body = excluded.body, at = excluded.at')
    .bind(game, voter, stars, str(b.text, 120), Date.now())
    .run();

  const row = await env.DB
    .prepare('SELECT COUNT(*) AS n, SUM(stars) AS sum FROM home_ratings WHERE game = ?')
    .bind(game).first();
  const n = Number(row && row.n) || 0;
  const sum = Number(row && row.sum) || 0;

  return reply({
    ok: true,
    item: { n, sum, avg: n ? Math.round((sum / n) * 10) / 10 : 0 },
    mine: { stars, text: str(b.text, 120) },
  }, 200, cors);
}

// POST /home/bug { game, text, contact, ver, ua }
async function postHomeBug(request, env, cors) {
  const b = await readJson(request, 16 * 1024);
  const text = str(b.text, 1200).trim();
  if (text.length < 8) throw new HttpError(400, 'too_short');
  const game = HOME_GAMES.has(str(b.game, 32)) ? str(b.game, 32) : 'home';
  const id = 'B-' + Date.now().toString(36).slice(-6).toUpperCase() + '-' +
    Math.random().toString(36).slice(2, 5).toUpperCase();

  await env.DB
    .prepare('INSERT INTO home_bugs (id, game, body, contact, ver, ua, at) VALUES (?,?,?,?,?,?,?)')
    .bind(id, game, text, str(b.contact, 80), str(b.ver, 16), str(b.ua || request.headers.get('User-Agent'), 300), Date.now())
    .run();

  return reply({ ok: true, id }, 200, cors);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const path = url.pathname.replace(/\/+$/, '') || '/';
    const method = request.method;

    try {
      if (path === '/health' || path === '/') {
        return reply({ ok: true, service: 'zjtt', v: 1, day: dayKey() }, 200, cors);
      }

      if (path === '/likes' && method === 'GET') return await getLikes(request, env, url, cors);
      if (path === '/like' && method === 'POST') return await postLike(request, env, cors);
      if (path === '/claim' && method === 'POST') return await postClaim(request, env, cors);

      if (path === '/home/ratings' && method === 'GET') return await getHomeRatings(request, env, url, cors);
      if (path === '/home/rate' && method === 'POST') return await postHomeRate(request, env, cors);
      if (path === '/home/bug' && method === 'POST') return await postHomeBug(request, env, cors);

      if (path === '/account' && method === 'GET') return await getAccount(request, env, cors);
      if (path === '/account' && method === 'PUT') return await putAccount(request, env, cors);

      if (path === '/puzzles' && method === 'GET') return await listPuzzles(request, env, url, cors);
      if (path === '/puzzle' && method === 'POST') return await postPuzzle(request, env, cors);

      const one = path.match(/^\/puzzle\/([^/]+)$/);
      if (one) {
        const id = decodeURIComponent(one[1]);
        if (method === 'GET') return await getPuzzle(env, id, cors);
        if (method === 'DELETE') return await deletePuzzle(request, env, id, cors);
      }

      throw new HttpError(404, 'not_found');
    } catch (e) {
      if (e instanceof HttpError) {
        return reply({ ok: false, error: e.code, detail: e.detail || null }, e.status, cors);
      }
      return reply({ ok: false, error: 'server', detail: String((e && e.message) || e) }, 500, cors);
    }
  },
};
