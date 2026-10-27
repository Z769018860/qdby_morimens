// EdgeOne 版后端的本地测试：用 Map 假装 KV，直接调 onRequest，不需要部署。
//
// 为什么要有：EdgeOne 的 KV 语义和 SQL 差得远（没有事务、没有唯一约束、没有自增），
// 光看代码看不出「每日 10 次」「同一人一题只能赞一次」「结算只发一次钱」还成不成立。
// 这个脚本把 SQL 版的每条规则原样跑一遍，跑绿了再推。
//
// 用法：node scripts/test_edge_api.mjs
import crypto from 'node:crypto';

const MOD = await import('../edge-functions/api/[[default]].js');
const onRequest = MOD.onRequest || MOD.default;

// ---------------------------------------------------------------- 假 KV
function fakeKV() {
  const m = new Map();
  return {
    _m: m,
    async get(key, opts) {
      const v = m.get(key);
      if (v === undefined) return null;
      const type = typeof opts === 'string' ? opts : opts && opts.type;
      return type === 'json' ? JSON.parse(v) : v;
    },
    async put(key, value) {
      // 真 KV 的 key 只允许字母数字下划线、长度 ≤512B，这里一并卡住
      if (!/^[A-Za-z0-9_]+$/.test(key)) throw new Error('非法 key（含转义字符）: ' + key);
      if (Buffer.byteLength(key) > 512) throw new Error('key 超过 512B: ' + key.slice(0, 40));
      m.set(key, String(value));
    },
    async delete(key) { m.delete(key); },
    async list({ prefix = '', limit = 256, cursor = '' } = {}) {
      const keys = [...m.keys()].filter((k) => k.startsWith(prefix)).sort();
      const start = cursor ? keys.indexOf(cursor) : 0;
      const page = keys.slice(Math.max(0, start), Math.max(0, start) + limit);
      return { complete: start + limit >= keys.length, cursor: page[page.length - 1] || null, keys: page.map((k) => ({ key: k })) };
    },
  };
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ---------------------------------------------------------------- 断言工具
let pass = 0;
let fail = 0;
const fails = [];

function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; fails.push(name + (extra ? ' → ' + JSON.stringify(extra) : '')); console.log('  ✗ ' + name + (extra ? ' → ' + JSON.stringify(extra) : '')); }
}
const eq = (name, got, want) => check(name, JSON.stringify(got) === JSON.stringify(want), { got, want });

// ---------------------------------------------------------------- 请求工具
function makeCaller(env) {
  return async function call(path, { method = 'GET', body, headers = {}, origin = '' } = {}) {
    const h = { ...headers };
    if (origin) h.Origin = origin;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const req = new Request('https://morimens.qingdengbuyi.top/api' + path, {
      method, headers: h, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await onRequest({ request: req, env, params: {}, waitUntil: () => {} });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
    return { status: res.status, json, headers: res.headers };
  };
}

const TOKEN = 'test-token-abc';
const UID = '50001';
const OTHER = '50002';

function seedSession(kv, token, uid, name = 'tester') {
  kv._m.set('sess_' + sha('t:' + token), JSON.stringify({ uid, name, at: Date.now() }));
}
const auth = { Authorization: 'Bearer ' + TOKEN };

// ---------------------------------------------------------------- 开始跑
console.log('\n[1] 健康检查 / 路由 /api 前缀剥离');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid' });
  const r = await call('/health');
  eq('GET /api/health → 200', r.status, 200);
  eq('返回 runtime=edgeone', r.json.runtime, 'edgeone');
  const r404 = await call('/nope');
  eq('未知路径 → 404', r404.status, 404);
  eq('错误码 not_found', r404.json.error, 'not_found');
}

console.log('\n[2] 没绑 KV 时给出可读错误');
{
  const call = makeCaller({});
  const r = await call('/health');
  eq('→ 500', r.status, 500);
  eq('→ no_kv', r.json.error, 'no_kv');
  check('提示里写了怎么绑定', /zjtt_kv/.test(String(r.json.detail)));
}

console.log('\n[3] CORS 白名单');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  const ok = await call('/health', { origin: 'https://z769018860.github.io' });
  eq('github.io 放行', ok.headers.get('access-control-allow-origin'), 'https://z769018860.github.io');
  const preview = await call('/health', { origin: 'https://abc123.edgeone.dev' });
  eq('预览域放行', preview.headers.get('access-control-allow-origin'), 'https://abc123.edgeone.dev');
  const evil = await call('/health', { origin: 'https://evil.example' });
  eq('陌生域不给 ACAO', evil.headers.get('access-control-allow-origin'), null);
  const pre = await call('/like', { method: 'OPTIONS', origin: 'https://morimens.qingdengbuyi.top' });
  eq('OPTIONS → 204', pre.status, 204);
}

console.log('\n[4] 游客点赞、去重、每日额度');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  const dev = { 'X-Dev-Id': 'devA' };

  const a = await call('/like', { method: 'POST', headers: dev, body: { puzzle: 'p1' } });
  eq('首次点赞 200', a.status, 200);
  eq('赞数 1', a.json.count, 1);
  eq('剩余 9', a.json.left, 9);

  const b = await call('/like', { method: 'POST', headers: dev, body: { puzzle: 'p1' } });
  eq('再点同一题标记 duplicate', b.json.duplicate, true);
  eq('赞数没涨', b.json.count, 1);

  for (let i = 2; i <= 10; i++) {
    await call('/like', { method: 'POST', headers: dev, body: { puzzle: 'p' + i } });
  }
  const over = await call('/like', { method: 'POST', headers: dev, body: { puzzle: 'p11' } });
  eq('第 11 次 → 429', over.status, 429);
  eq('错误码 quota', over.json.error, 'quota');

  // 换一个 puzzle 但重复点已点过的，应仍算 duplicate 而不是 quota
  const dup = await call('/like', { method: 'POST', headers: dev, body: { puzzle: 'p2' } });
  eq('已点过的题优先报 duplicate', dup.json.duplicate, true);

  const list = await call('/likes?ids=p1,p2,p11', { headers: dev });
  eq('批量查赞数', list.json.counts, { p1: 1, p2: 1, p11: 0 });
  eq('voted 标记', list.json.voted, { p1: true, p2: true });
  eq('left 归零', list.json.left, 0);

  // 换设备就是新身份，额度重新算（但同 IP 有兜底，这里不看 IP）
  const other = await call('/like', { method: 'POST', headers: { 'X-Dev-Id': 'devB' }, body: { puzzle: 'p1' } });
  eq('另一台设备再点同一题 → 赞数 2', other.json.count, 2);
}

console.log('\n[5] 游客按 IP 兜底（换 dev id 刷不动）');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  const ip = { 'X-Forwarded-For': '203.0.113.9' };
  let last = null;
  for (let v = 0; v < 6; v++) {
    for (let i = 0; i < 10; i++) {
      last = await call('/like', {
        method: 'POST',
        headers: { ...ip, 'X-Dev-Id': 'dev' + v },
        body: { puzzle: 'q' + v + '_' + i },
      });
    }
  }
  eq('第 41 个赞被 IP 限流挡住', last.status, 429);
  eq('错误码 rate', last.json.error, 'rate');
}

console.log('\n[6] 登录态：token 校验与缓存');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid' });
  eq('无 token 读档案 → 401', (await call('/account')).status, 401);
  eq('无效 token → 401', (await call('/account', { headers: { Authorization: 'Bearer nope' } })).status, 401);

  seedSession(kv, TOKEN, UID);
  const r = await call('/account', { headers: auth });
  eq('有会话缓存 → 200', r.status, 200);
  eq('空档案返回 doc:null', r.json.doc, null);
}

console.log('\n[7] 账号档案：版本号乐观锁');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID);

  const w1 = await call('/account', { method: 'PUT', headers: auth, body: { doc: { cr: 5 }, ver: 0 } });
  eq('首次写入 ver 1', w1.json.ver, 1);

  const stale = await call('/account', { method: 'PUT', headers: auth, body: { doc: { cr: 6 }, ver: 0 } });
  eq('拿旧版本号写 → 409', stale.status, 409);
  eq('409 带回服务端文档', stale.json.doc, { cr: 5 });

  const w2 = await call('/account', { method: 'PUT', headers: auth, body: { doc: { cr: 42 }, ver: 1 } });
  eq('ver 1 写入 → 2', w2.json.ver, 2);

  const read = await call('/account', { headers: auth });
  eq('读回最新文档', read.json.doc, { cr: 42 });
  eq('读回版本号', read.json.ver, 2);
}

console.log('\n[8] 工坊题库：上传 / 读 / 列 / 排序 / 删除');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID);

  const up = await call('/puzzle', {
    method: 'POST', headers: auth,
    body: { id: 'w-abc', title: '测试题', payload: { id: 'w-abc', title: '测试题', team: [{ tid: '1' }] } },
  });
  eq('上传 200', up.status, 200);
  eq('id 保持', up.json.id, 'w-abc');

  const one = await call('/puzzle/w-abc');
  eq('按 id 拉取', one.json.title, '测试题');
  eq('带出作者', one.json.author, UID);
  check('payload.team 完整', Array.isArray(one.json.puzzle.team));

  const noAuth = await call('/puzzle', { method: 'POST', body: { payload: { team: [] } } });
  eq('未登录上传 → 401', noAuth.status, 401);

  const badBody = await call('/puzzle', { method: 'POST', headers: auth, body: { payload: {} } });
  eq('没有 team 字段 → 400', badBody.status, 400);

  // 别人拿同一个 id 来覆盖
  const token2 = 'tok-other';
  seedSession(kv, token2, OTHER);
  const steal = await call('/puzzle', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token2 },
    body: { id: 'w-abc', payload: { team: [] } },
  });
  eq('覆盖别人的 id → 409', steal.status, 409);
  eq('错误码 dup_id', steal.json.error, 'dup_id');

  // 再传一道题，验证列表顺序
  await call('/puzzle', {
    method: 'POST', headers: auth,
    body: { id: 'w-def', title: '第二题', payload: { id: 'w-def', team: [] } },
  });
  const listNew = await call('/puzzles?sort=new&limit=10');
  eq('列表按新到旧', listNew.json.items.map((x) => x.id), ['w-def', 'w-abc']);
  eq('总数 2', listNew.json.total, 2);

  // 别人点 w-abc 一个赞 → 按赞数排应该反超
  await call('/like', { method: 'POST', headers: { 'X-Dev-Id': 'fan' }, body: { puzzle: 'w-abc' } });
  const listLikes = await call('/puzzles?sort=likes&limit=10');
  eq('按赞数排', listLikes.json.items.map((x) => x.id), ['w-abc', 'w-def']);
  eq('赞数带出来', listLikes.json.items[0].likes, 1);

  const byAuthor = await call('/puzzles?author=' + UID);
  eq('按作者筛', byAuthor.json.total, 2);

  const delOther = await call('/puzzle/w-abc', { method: 'DELETE', headers: { Authorization: 'Bearer ' + token2 } });
  eq('别人删 → 403', delOther.status, 403);
  const delOwn = await call('/puzzle/w-def', { method: 'DELETE', headers: auth });
  eq('作者删 → 200', delOwn.status, 200);
  const after = await call('/puzzles?limit=10');
  eq('删完剩 1 条', after.json.total, 1);
  eq('索引同步移除', after.json.items.map((x) => x.id), ['w-abc']);
}

console.log('\n[9] 自赞拦截 + 结算幂等');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID);

  await call('/puzzle', {
    method: 'POST', headers: auth,
    body: { id: 'w-self', payload: { id: 'w-self', team: [] } },
  });
  const self = await call('/like', { method: 'POST', headers: auth, body: { puzzle: 'w-self' } });
  eq('作者赞自己 → 403', self.status, 403);
  eq('错误码 self', self.json.error, 'self');

  // 三个不同游客各点一个赞
  for (const d of ['f1', 'f2', 'f3']) {
    await call('/like', { method: 'POST', headers: { 'X-Dev-Id': d }, body: { puzzle: 'w-self' } });
  }
  const c1 = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['w-self'] } });
  eq('首次结算 gain=3', c1.json.gain, 3);
  eq('结算带回赞数', c1.json.counts['w-self'], 3);

  const c2 = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['w-self'] } });
  eq('再结算 gain=0（不重复发钱）', c2.json.gain, 0);

  // 又来一个赞，只结算新增的那 1 个
  await call('/like', { method: 'POST', headers: { 'X-Dev-Id': 'f4' }, body: { puzzle: 'w-self' } });
  const c3 = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['w-self'] } });
  eq('增量结算 gain=1', c3.json.gain, 1);

  // 别人的题不能被领走
  seedSession(kv, 'tok-other', OTHER);
  const cOther = await call('/claim', {
    method: 'POST', headers: { Authorization: 'Bearer tok-other' }, body: { puzzles: ['w-self'] },
  });
  eq('领别人的题 gain=0', cOther.json.gain, 0);
}

console.log('\n[10] 请求体限制');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID);
  const big = { doc: { blob: 'x'.repeat(600 * 1024) }, ver: 0 };
  const r = await call('/account', { method: 'PUT', headers: auth, body: big });
  eq('超过上限 → 413', r.status, 413);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
if (fail) {
  console.log('\n失败项：');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('全部通过 ✓');
