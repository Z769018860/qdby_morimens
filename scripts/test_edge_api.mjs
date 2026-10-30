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

// 假 Blob：按 @edgeone/pages-blob 的真实语义造 —— set / get(key,{type,consistency}) / delete / list。
// 线上默认存储就是 Blob（不需要开 KV 命名空间），所以业务断言尽量跑在它上面。
function fakeBlob() {
  const m = new Map();
  const reads = { strong: 0, eventual: 0 };
  return {
    _m: m, _reads: reads,
    async set(key, value) { m.set(String(key), typeof value === 'string' ? value : String(value)); },
    async get(key, opts = {}) {
      if (opts.consistency === 'strong') reads.strong++;
      else reads.eventual++;
      const v = m.get(String(key));
      if (v === undefined) return null;
      return opts.type === 'json' ? JSON.parse(v) : v;
    },
    async delete(key) { m.delete(String(key)); },
    async list({ prefix = '' } = {}) {
      return { blobs: [...m.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k, etag: '' })) };
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
// 测试环境没有 Blob 凭据（要连 STS），所以默认把存储钉到 KV 的假实现上，
// 这样下面所有业务断言都跑在 fakeKV 上；要验证「默认行为」就显式传 ZJTT_STORE: ''。
function makeCaller(env) {
  const e = { ZJTT_STORE: 'kv', ...(env || {}) };
  return async function call(path, { method = 'GET', body, headers = {}, origin = '' } = {}) {
    const h = { ...headers };
    if (origin) h.Origin = origin;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const req = new Request('https://morimens.qingdengbuyi.top/api' + path, {
      method, headers: h, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const res = await onRequest({ request: req, env: e, params: {}, waitUntil: () => {} });
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

console.log('\n[2] 没有任何存储时给出可读错误');
{
  const call = makeCaller({ ZJTT_STORE: '' });   // 不钉死，也没有 Blob 凭据、没有 KV
  const r = await call('/health');
  eq('→ 503（探活仍能答话，只是 ok:false）', r.status, 503);
  eq('→ ok:false', r.json.ok, false);
  eq('→ storeOk:false', r.json.storeOk, false);
  eq('→ store:null', r.json.store, null);
  eq('→ no_store', r.json.error, 'no_store');
  check('提示里写了 Blob 凭据怎么补', /ZJTT_BLOB_TOKEN/.test(String(r.json.detail)));

  // 业务接口没存储时仍然是 500，前端按「后端不可用」降级
  const rb = await call('/likes?ids=a');
  eq('业务接口 → 500', rb.status, 500);
  eq('业务接口 → no_store', rb.json.error, 'no_store');
}

console.log('\n[2b] 绑定名字挂在全局变量上也要认（EdgeOne 官方示例就是这种注入方式）');
{
  const kv = fakeKV();
  globalThis.zjtt_kv = kv;
  try {
    const call = makeCaller({});           // env 里没有 KV，只有全局变量
    const r = await call('/health');
    eq('→ 200', r.status, 200);
    eq('→ store:kv', r.json.store, 'kv');
    eq('→ kvBound:true', r.json.kvBound, true);
  } finally {
    delete globalThis.zjtt_kv;
  }
}

console.log('\n[2c] env 里有同名但不像 KV 的东西时不能误判');
{
  const call = makeCaller({ zjtt_kv: 'oops', KV: { foo: 1 }, ZJTT_STORE: '' });
  const r = await call('/health');
  eq('→ 503 而不是当成可用存储', r.status, 503);
  eq('→ kvBound:false', r.json.kvBound, false);
}

console.log('\n[2d] ZJTT_STORE 可以钉死存储，避免 KV 审核通过后突然切库');
{
  const kv = fakeKV();
  // 钉成 kv：明明有 KV 就用它
  const callKv = makeCaller({ zjtt_kv: kv, ZJTT_STORE: 'kv' });
  const r1 = await callKv('/health');
  eq('钉 kv → store:kv', r1.json.store, 'kv');
  eq('钉 kv → pin:kv', r1.json.pin, 'kv');

  // 钉成 blob：有 KV 也不用，而 Blob 没凭据 → 明确报错，而不是偷偷切回 KV
  const callBlob = makeCaller({ zjtt_kv: kv, ZJTT_STORE: 'blob' });
  const r2 = await callBlob('/health');
  eq('钉 blob 但没凭据 → 503', r2.status, 503);
  eq('钉 blob 但没凭据 → no_store', r2.json.error, 'no_store');
  check('错误里点明是钉死导致的', /ZJTT_STORE/.test(String(r2.json.detail)));
}

console.log('\n[2e] 默认不碰 KV：绑了 KV 也不会被悄悄拿来当主存储');
{
  // 线上就是这种状态：Blob 在跑（真实凭据只有部署时才有），KV 绑不绑都无所谓。
  // 这里没有 Blob 凭据，所以只能 503 —— 关键是「不能因为 env 里有 KV 就切过去」。
  const kv = fakeKV();
  kv._m.set('cnt_x', '7');
  const call = makeCaller({ zjtt_kv: kv, ZJTT_STORE: '' });
  const r = await call('/health');
  eq('有 KV 但默认仍走 Blob → 503', r.status, 503);
  eq('错误里点明默认不用 KV', /KV/.test(String(r.json.detail)) && /ZJTT_STORE/.test(String(r.json.detail)), true);
  eq('kvBound 仍然如实回报 true', r.json.kvBound, true);
  eq('KV 里的旧赞数没有被当成主数据读出来', r.json.store, null);
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

console.log('\n[11] Blob 适配层：换个存储引擎，规则必须一条不少');
{
  const blob = fakeBlob();

  const kv = MOD.blobKV(blob);
  const call = makeCaller({ zjtt_kv: kv });

  const h = await call('/health');
  eq('health → store:blob', h.json.store, 'blob');
  eq('health → ok', h.json.ok, true);

  await kv.put('sess_' + sha('t:' + TOKEN), JSON.stringify({ uid: UID, name: 'tester', at: Date.now() }));

  const l1 = await call('/like', { method: 'POST', headers: auth, body: { puzzle: 'blob-1' } });
  eq('首次点赞 ok', l1.json.ok, true);
  eq('赞数 1', l1.json.count, 1);
  const l2 = await call('/like', { method: 'POST', headers: auth, body: { puzzle: 'blob-1' } });
  eq('重复赞 duplicate', l2.json.duplicate, true);
  eq('重复赞不涨数', l2.json.count, 1);

  const lk = await call('/likes?ids=blob-1', { headers: auth });
  eq('查回来 count=1', lk.json.counts['blob-1'], 1);
  eq('voted=true', lk.json.voted['blob-1'], true);
  eq('今日额度剩 9', lk.json.left, 9);

  const p1 = await call('/account', { method: 'PUT', headers: auth, body: { doc: { cr: 5 }, ver: 0 } });
  eq('首次写档案 ver=1', p1.json.ver, 1);
  const p2 = await call('/account', { method: 'PUT', headers: auth, body: { doc: { cr: 6 }, ver: 0 } });
  eq('拿旧版本号写 → 409', p2.status, 409);
  const acc = await call('/account', { headers: auth });
  eq('读回 cr=5', acc.json.doc.cr, 5);

  const pu = await call('/puzzle', { method: 'POST', headers: auth, body: { id: 'b-9', title: '适配层题', payload: { id: 'b-9', team: [] } } });
  eq('上传题目 ok', pu.json.ok, true);
  const list = await call('/puzzles?limit=5');
  check('题库列表里有它', (list.json.items || []).some((x) => x.id === 'b-9'));

  // 别人（游客身份）赞这道题，作者再结算：应只发一次钱
  const g = await call('/like', { method: 'POST', headers: { 'X-Dev-Id': 'blob-voter' }, body: { puzzle: 'b-9' } });
  eq('游客点赞 ok', g.json.ok, true);
  const c1 = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['b-9'] } });
  eq('首次结算 gain=1', c1.json.gain, 1);
  const c2 = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['b-9'] } });
  eq('再结算 gain=0（不重复发钱）', c2.json.gain, 0);

  check('写入路径走了强一致（reads.strong > 0）', blob._reads.strong > 0, blob._reads);
  check('显示用赞数吃了缓存（reads.eventual > 0）', blob._reads.eventual > 0, blob._reads);
}


console.log('\n[12] 首页评分 / BUG 反馈（跑在 Blob 上，不开 KV 命名空间）');
{
  // 线上就是这套：storeOf() 默认取 Blob，评分与反馈跟赞数、档案、题库挤在同一份 Blob 里。
  // makeCaller 内建的 ZJTT_STORE=kv 只是为了让测试绕开真凭据，这里塞进去的仍是 blobKV 适配层。
  const blob = fakeBlob();
  const store = MOD.blobKV(blob);
  const call = makeCaller({ zjtt_kv: store });

  // 一个人第一次打分：人数 1，均分就是他给的
  const r1 = await call('/home/rate', { method: 'POST', headers: { 'X-Device': 'dev-home-a' }, body: { game: 'merge', stars: 4, text: '好玩' } });
  eq('首次打分 ok', r1.json.ok, true);
  eq('人数 = 1', r1.json.item.n, 1);
  eq('均分 = 4', r1.json.item.avg, 4);

  // 同一个人改分：人数不变，只换星数
  const r2 = await call('/home/rate', { method: 'POST', headers: { 'X-Device': 'dev-home-a' }, body: { game: 'merge', stars: 5 } });
  eq('改分后人数仍是 1', r2.json.item.n, 1);
  eq('改分后均分 5', r2.json.item.avg, 5);

  // 第二个人打 3 星 → 均分 4
  await call('/home/rate', { method: 'POST', headers: { 'X-Device': 'dev-home-b' }, body: { game: 'merge', stars: 3 } });
  const list = await call('/home/ratings?games=merge,bird', { headers: { 'X-Device': 'dev-home-a' } });
  eq('两个人 → n=2', list.json.items.merge.n, 2);
  eq('均分 4', list.json.items.merge.avg, 4);
  eq('没投过的游戏 n=0', list.json.items.bird.n, 0);
  eq('返回我的评分', list.json.mine.merge.stars, 5);

  // 校验
  const bad = await call('/home/rate', { method: 'POST', headers: { 'X-Device': 'dev-home-a' }, body: { game: 'merge', stars: 9 } });
  eq('星数越界 → 400', bad.status, 400);
  const noDev = await call('/home/rate', { method: 'POST', headers: {}, body: { game: 'merge', stars: 5 } });
  eq('没有身份 → 401', noDev.status, 401);

  // BUG 反馈：返回可读编号
  const bug = await call('/home/bug', { method: 'POST', headers: { 'X-Device': 'dev-home-a' }, body: { game: 'idle', text: '融灾第 12 层点了开始没反应，刷新后次数被扣了' } });
  if (!bug.json.ok) console.log('    DEBUG bug →', bug.status, JSON.stringify(bug.json));
  eq('反馈 ok', bug.json.ok, true);
  check('编号形如 B-XXX-XXX', /^B-[A-Z0-9]+-[A-Z0-9]+$/.test(String(bug.json.id)), bug.json.id);
  const short = await call('/home/bug', { method: 'POST', body: { game: 'idle', text: '太短' } });
  eq('太短 → 400', short.status, 400);

  const idx = JSON.parse(await store.get('bug_idx'));
  check('bug_idx 里记了这条', Array.isArray(idx) && idx[0] === bug.json.id, idx);

  // 数据确实落在 Blob 里，而且键名全是字母数字下划线（换回真 KV 也不会被拒）
  const keys = [...blob._m.keys()];
  check('综合分写进了 blob：hragg_merge', blob._m.has('hragg_merge'), keys);
  check('bug 正文写进了 blob', keys.some((k) => k.startsWith('bug_B')), keys);
  check('所有键名都是 [A-Za-z0-9_]', keys.every((k) => /^[A-Za-z0-9_]+$/.test(k)), keys);
  check('存的是 JSON 文本而不是对象', typeof blob._m.get('hragg_merge') === 'string', typeof blob._m.get('hragg_merge'));

  // health 报的就是 blob（不会再出现「要先建 KV 命名空间」这回事）
  const h = await call('/health');
  eq('health → store:blob', h.json.store, 'blob');
}

console.log('\n[13] 审计修复：结算只认有记录的本人题 / 删题清赞 / whoami 不泄露站长 uid / 按 IP 限额');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID);
  seedSession(kv, 'tok-b', OTHER, '路人');
  const auth = { Authorization: `Bearer ${TOKEN}` };

  // 官方题（服务端没有归属记录）上的赞，任何账号都领不走
  for (const d of ['o1', 'o2', 'o3']) await call('/like', { method: 'POST', headers: { 'X-Dev-Id': d }, body: { puzzle: 'official-1' } });
  const stolen = await call('/claim', { method: 'POST', headers: auth, body: { puzzles: ['official-1', 'never-uploaded'] } });
  eq('无归属记录的题 gain=0', stolen.json.gain, 0);

  // 删题把赞数一起清掉，别人用同一个 id 重传不会继承
  await call('/puzzle', { method: 'POST', headers: auth, body: { id: 'w-del', payload: { id: 'w-del', team: [] } } });
  await call('/like', { method: 'POST', headers: { 'X-Dev-Id': 'd1' }, body: { puzzle: 'w-del' } });
  await call('/puzzle/w-del', { method: 'DELETE', headers: auth });
  await call('/puzzle', { method: 'POST', headers: { Authorization: 'Bearer tok-b' }, body: { id: 'w-del', payload: { id: 'w-del', team: [] } } });
  const inherit = await call('/claim', { method: 'POST', headers: { Authorization: 'Bearer tok-b' }, body: { puzzles: ['w-del'] } });
  eq('重传同 id 不继承旧赞', inherit.json.gain, 0);

  // whoami 对非管理员不带站长 uid；管理页 403 的 detail 也不带
  await call('/whoami', { headers: auth });                       // 第一个叫姜酒的人才会认领；这里是 tester
  const w = await call('/whoami', { headers: { Authorization: 'Bearer tok-b' } });
  check('whoami 不含 pinned', !('pinned' in w.json), w.json);
  const ov = await call('/admin/overview', { headers: { Authorization: 'Bearer tok-b' } });
  check('admin 403 detail 不含 pinned', ov.status === 403 && !(ov.json.detail && 'pinned' in ov.json.detail), ov.json);

  // 按 IP 限额：评分 / BUG 反馈
  const ipH = (n) => ({ 'EO-Connecting-IP': '9.9.9.' + n });
  let lastStatus = 200;
  for (let i = 0; i < 12; i++) {
    const r = await call('/home/bug', { method: 'POST', headers: ipH(1), body: { text: '这是一条足够长的反馈 ' + i } });
    lastStatus = r.status;
  }
  eq('同一 IP 反馈超过每日 10 条 → 429', lastStatus, 429);
  const other = await call('/home/bug', { method: 'POST', headers: ipH(2), body: { text: '换个 IP 还能提交的反馈' } });
  eq('换 IP 不受影响', other.status, 200);
}

console.log('\n[14] 评分详情：分布 + 短评 + 我的那条 + 老数据补建');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID, '测试员');
  const dev = (d) => ({ 'X-Device': d, 'EO-Connecting-IP': '8.8.8.' + d.length });
  await call('/home/rate', { method: 'POST', headers: dev('dev-a'), body: { game: 'idle', stars: 5, text: '很好玩' } });
  await call('/home/rate', { method: 'POST', headers: dev('dev-bb'), body: { game: 'idle', stars: 3, text: '' } });
  await call('/home/rate', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'EO-Connecting-IP': '8.8.8.99' }, body: { game: 'idle', stars: 4, text: '挂机很舒服<b>' } });
  // 同一个人改分：只留一条，分布跟着变
  await call('/home/rate', { method: 'POST', headers: dev('dev-a'), body: { game: 'idle', stars: 2, text: '改主意了' } });
  const r = await call('/home/reviews?game=idle', { headers: dev('dev-a') });
  eq('详情 200', r.status, 200);
  eq('人数 3', r.json.n, 3);
  eq('分布 2/3/4 星各 1', JSON.stringify(r.json.dist), '[0,1,1,1,0]');
  eq('条目 3 条', r.json.items.length, 3);
  check('我的那条被标出来', r.json.items.filter((x) => x.mine).length === 1 && r.json.items.find((x) => x.mine).t === '改主意了', r.json.items);
  check('登录用户带昵称', r.json.items.some((x) => x.n === '测试员'), r.json.items);
  check('最新的在前', r.json.items[0].t === '改主意了', r.json.items);
  const bad = await call('/home/reviews?game=nope');
  eq('未知游戏 400', bad.status, 400);
  // 老数据：只有 hrv_ / hragg_，没有 hri_ 索引 → 第一次看详情时补建（FakeKV 不支持 list 时返回空列表，不报错）
  const kv2 = fakeKV(); const call2 = makeCaller({ zjtt_kv: kv2 });
  kv2.put('hragg_wolf', JSON.stringify({ n: 2, sum: 9 }));
  const old = await call2('/home/reviews?game=wolf');
  eq('老数据不报错', old.status, 200);
  eq('老数据综合分仍在', old.json.avg, 4.5);
}

console.log('\n[15] 游戏存档上云 /save/idle：登录才能用、乐观锁、元信息');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv });
  seedSession(kv, TOKEN, UID, '玩家甲');
  seedSession(kv, 'tok-2', OTHER, '玩家乙');
  const A = { Authorization: `Bearer ${TOKEN}` }, B = { Authorization: 'Bearer tok-2' };
  const save = { roster: { ogier: { lv: 9 } }, maxStage: 12, play: 600, gold: 5, rev: 3 };
  eq('没登录读 → 401', (await call('/save/idle')).status, 401);
  eq('没登录写 → 401', (await call('/save/idle', { method: 'PUT', body: { data: JSON.stringify(save), ver: 0 } })).status, 401);
  eq('不认识的游戏 → 400', (await call('/save/nope', { headers: A })).status, 400);
  const empty = await call('/save/idle', { headers: A });
  eq('还没有存档 → null', empty.json.save, null);
  const p1 = await call('/save/idle', { method: 'PUT', headers: A, body: { data: JSON.stringify(save), ver: 0, rev: 3, meta: { maxStage: 12, roster: 1, play: 600 } } });
  eq('第一次上传 ver=1', p1.json.ver, 1);
  const m = await call('/save/idle?meta=1', { headers: A });
  check('meta 不带正文', m.json.save && m.json.save.ver === 1 && !('data' in m.json.save) && m.json.save.meta.maxStage === 12, m.json);
  const g = await call('/save/idle', { headers: A });
  eq('取回正文一致', JSON.parse(g.json.save.data).maxStage, 12);
  // 乐观锁：另一台设备拿着旧 ver 写 → 409
  const stale = await call('/save/idle', { method: 'PUT', headers: A, body: { data: JSON.stringify({ ...save, maxStage: 99 }), ver: 0 } });
  eq('旧版本写入 → 409', stale.status, 409);
  eq('409 带云端 ver', stale.json.ver, 1);
  const p2 = await call('/save/idle', { method: 'PUT', headers: A, body: { data: JSON.stringify({ ...save, maxStage: 20 }), ver: 1 } });
  eq('带对版本 → ver=2', p2.json.ver, 2);
  eq('别的账号看不到', (await call('/save/idle', { headers: B })).json.save, null);
  for (const g of ['deathreport', 'binding', 'survivors', 'protocol', 'wolf', 'merge', 'bird']) {
    const r = await call(`/save/${g}`, { method: 'PUT', headers: A, body: { data: JSON.stringify({ v: 1, keys: { k: 'v' } }), ver: 0, meta: { hash: 'abc123', n: 1 } } });
    eq(`${g} 存档可上传`, r.json.ok, true);
  }
  eq('meta 里带内容哈希', (await call('/save/wolf?meta=1', { headers: A })).json.save.meta.hash, 'abc123');
  eq('没开放的游戏（侦探）→ 400', (await call('/save/detective', { headers: A })).status, 400);
  eq('非法存档 → 400', (await call('/save/idle', { method: 'PUT', headers: B, body: { data: '[1,2]', ver: 0 } })).status, 400);
  eq('过大 → 413', (await call('/save/idle', { method: 'PUT', headers: B, body: { data: JSON.stringify({ roster: {}, pad: 'x'.repeat(490 * 1024) }), ver: 0 } })).status, 413);
}

console.log('\n[20] 后台批量赠礼 + 榜单');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid', ZJTT_ADMIN_UIDS: '9001' });
  seedSession(kv, 'adm', '9001', '姜酒'); seedSession(kv, 'u1', '9101', '甲'); seedSession(kv, 'u2', '9102', '乙');
  const AD = { Authorization: 'Bearer adm' }, U1 = { Authorization: 'Bearer u1' }, U2 = { Authorization: 'Bearer u2' };
  // 让两个用户「登录过」：任意带 token 的请求都会 touchUser
  await call('/grants/mine', { headers: U1 }); await call('/grants/mine', { headers: U2 }); await call('/whoami', { headers: AD });
  eq('非管理员不能批量发', (await call('/admin/grant-batch', { method: 'POST', headers: U1, body: { all: true, amount: 5 } })).status, 403);
  eq('什么都不发 → 400', (await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { all: true, amount: 0 } })).status, 400);
  const b1 = await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { all: true, amount: 50, awk: ['ogier', 'bad slug!', 'ogier'], note: '全服补偿' } });
  check('全员发放成功（含管理员自己 3 人）', b1.json.ok && b1.json.sent === 3 && b1.json.awk.length === 1, b1.json);
  const g1 = await call('/grants/mine', { headers: U1 });
  check('用户拿到银芯 + 唤醒体', g1.json.items.length === 1 && g1.json.items[0].amount === 50 && g1.json.items[0].awk[0] === 'ogier', g1.json);
  const b2 = await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { uids: ['9102'], awk: ['lotan'] } });
  eq('只发唤醒体、不发银芯 → 成功 1 人', b2.json.sent, 1);
  eq('乙有 2 条赠礼', (await call('/grants/mine', { headers: U2 })).json.items.length, 2);
  eq('甲仍是 1 条', (await call('/grants/mine', { headers: U1 })).json.items.length, 1);
  // 单人接口也支持只发唤醒体
  eq('单人发唤醒体', (await call('/admin/grant', { method: 'POST', headers: AD, body: { uid: '9101', awk: ['doll'] } })).json.ok, true);

  // 榜单：档案摘要 + 挂机云存档摘要
  await call('/account', { method: 'PUT', headers: U1, body: { doc: { cr: 1, gd: { mg: [1234], bd: [30, 800], il: [100, 6, 40, 41, 0] } }, ver: 0 } });
  await call('/account', { method: 'PUT', headers: U2, body: { doc: { cr: 1, gd: { mg: [900] } }, ver: 0 } });
  await call('/save/idle', { method: 'PUT', headers: U1, body: { data: JSON.stringify({ roster: {} }), ver: 0, meta: { maxStage: 55, roster: 6, team: [{ s: 'ogier', lv: 60, st: 2 }, { s: 'x y', lv: 1 }] } } });
  const bd = await call('/board');
  check('榜单可公开读', bd.json.ok && bd.json.games, bd.json);
  eq('合成榜按分数降序', bd.json.games.mg.items.map((x) => [x.name, x.score]), [['甲', 1234], ['乙', 900]]);
  eq('鸟弟榜带最深层数', bd.json.games.bd.items[0].sub, '最深 30 层');
  eq('挂机榜用云存档的关数', bd.json.games.il.items[0].score, 55);
  eq('挂机榜带阵容（slug 里的非法字符被清掉）', bd.json.games.il.items[0].team, [{ s: 'ogier', lv: 60, st: 2 }, { s: 'xy', lv: 1, st: 0 }]);
  check('没分的游戏榜单为空', bd.json.games.sv.items.length === 0);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);if (fail) {
  console.log('\n失败项：');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('全部通过 ✓');
