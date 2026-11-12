// EdgeOne 版后端的本地测试：用 Map 假装 KV，直接调 onRequest，不需要部署。
//
// 为什么要有：EdgeOne 的 KV 语义和 SQL 差得远（没有事务、没有唯一约束、没有自增），
// 光看代码看不出「每日 10 次」「同一人一题只能赞一次」「结算只发一次钱」还成不成立。
// 这个脚本把 SQL 版的每条规则原样跑一遍，跑绿了再推。
//
// 用法：node scripts/test_edge_api.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';

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
  // 自己站点的打点不限流：同一 IP 连打 700 次（原上限 600）都是 200
  let visitOk = 0;
  for (let i = 0; i < 700; i++) { const v = await call('/visit', { method: 'POST', headers: { 'EO-Connecting-IP': '1.2.3.4' }, body: { p: 'x' } }); if (v.status === 200) visitOk++; }
  eq('打点不限流', visitOk, 700);
  // 让两个用户「登录过」：任意带 token 的请求都会 touchUser
  await call('/grants/mine', { headers: U1 }); await call('/grants/mine', { headers: U2 }); await call('/whoami', { headers: AD });
  const ov = await call('/admin/overview', { headers: AD });
  check('后台概览列出已登录的用户并带 listed/failed', ov.json.ok && ov.json.users.length === 3 && ov.json.stats.failed === 0 && ov.json.stats.listed === 3, ov.json.stats);
  // 名册走快照：新用户注册后（usr_n 变大）快照落后，会自动重建
  seedSession(kv, 'u4', '9104', '丁'); await call('/grants/mine', { headers: { Authorization: 'Bearer u4' } });
  eq('新注册的人立刻出现在后台', (await call('/admin/overview', { headers: AD })).json.users.length, 4);
  eq('?fresh=1 强制重建', (await call('/admin/overview?fresh=1', { headers: AD })).json.users.length, 4);
  eq('非管理员不能批量发', (await call('/admin/grant-batch', { method: 'POST', headers: U1, body: { all: true, amount: 5 } })).status, 403);
  eq('什么都不发 → 400', (await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { all: true, amount: 0 } })).status, 400);
  const b1 = await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { all: true, amount: 50, awk: ['ogier', 'bad slug!', 'ogier'], note: '全服补偿' } });
  check('全员发放成功（含管理员自己，共 4 人）', b1.json.ok && b1.json.sent === 4 && b1.json.failed === 0 && b1.json.awk.length === 1, b1.json);
  const g1 = await call('/grants/mine', { headers: U1 });
  check('用户拿到银芯 + 唤醒体', g1.json.items.length === 1 && g1.json.items[0].amount === 50 && g1.json.items[0].awk[0] === 'ogier', g1.json);
  // 全员发放之后才注册的新账号：不该白捡一份旧赠礼
  await new Promise((res) => setTimeout(res, 5));
  seedSession(kv, 'u9', '9109', '后来者'); await call('/whoami', { headers: { Authorization: 'Bearer u9' } });
  eq('发放之后才注册的账号拿不到全员赠礼', (await call('/grants/mine', { headers: { Authorization: 'Bearer u9' } })).json.items.length, 0);
  // 召唤券 / 金币 / 回溯券：单人接口发给后来者（只有这一个人受影响）；超上限的会被夹住，什么都不带 → 400
  const g9 = await call('/admin/grant', { method: 'POST', headers: AD, body: { uid: '9109', rw: 3, tk: 20000, gold: 5000000000, note: 'BUG 奖励' } });
  check('单人发回溯券 + 召唤券 + 金币', g9.json.ok && g9.json.rw === 3 && g9.json.tk === 9999 && g9.json.gold === 1e9, g9.json);
  const g9m = await call('/grants/mine', { headers: { Authorization: 'Bearer u9' } });
  check('拿到的赠礼带 rw / tk / gold（上限夹住）', g9m.json.items.length === 1 && g9m.json.items[0].rw === 3 && g9m.json.items[0].tk === 9999 && g9m.json.items[0].gold === 1e9, g9m.json);
  eq('只带 0 的券 → 400', (await call('/admin/grant', { method: 'POST', headers: AD, body: { uid: '9109', rw: 0, tk: 0, gold: 0 } })).status, 400);
  // 后台看 BUG 反馈详情
  eq('非管理员读不了 BUG 反馈', (await call('/admin/bugs', { headers: U1 })).status, 403);
  await call('/home/bug', { method: 'POST', headers: { 'X-Device': 'dev-admin-bug' }, body: { game: 'lovelive', text: '点了开始以后画面卡在载入，原曲没有声音', contact: 'qq123' } });
  const bl = await call('/admin/bugs?limit=20', { headers: AD });
  check('管理员读到 BUG 反馈详情（含正文 / 游戏 / 联系方式）', bl.json.ok && bl.json.total >= 1 && bl.json.items.length >= 1 && bl.json.items[0].text.length >= 8 && bl.json.items[0].game === 'lovelive' && bl.json.items[0].contact === 'qq123' && /^B-/.test(bl.json.items[0].id), bl.json);
  const b2 = await call('/admin/grant-batch', { method: 'POST', headers: AD, body: { uids: ['9102'], awk: ['lotan'] } });
  eq('只发唤醒体、不发银芯 → 成功 1 人', b2.json.sent, 1);
  eq('乙有 2 条赠礼', (await call('/grants/mine', { headers: U2 })).json.items.length, 2);
  eq('甲仍是 1 条', (await call('/grants/mine', { headers: U1 })).json.items.length, 1);
  // 单人接口也支持只发唤醒体
  eq('单人发唤醒体', (await call('/admin/grant', { method: 'POST', headers: AD, body: { uid: '9101', awk: ['doll'] } })).json.ok, true);

  // 榜单：档案摘要 + 挂机云存档摘要
  await call('/account', { method: 'PUT', headers: U1, body: { doc: { cr: 1, gd: { dt: [10, 3, 0, 8, 6], dr: [20, 15, 9], mg: [1234], bd: [30, 800], il: [100, 6, 40, 41, 0] } }, ver: 0 } });
  await call('/account', { method: 'PUT', headers: U2, body: { doc: { cr: 1, gd: { dr: [30, 15, 12], mg: [900] } }, ver: 0 } });
  await call('/save/idle', { method: 'PUT', headers: U1, body: { data: JSON.stringify({ roster: {} }), ver: 0, meta: { maxStage: 55, roster: 6, team: [{ s: 'ogier', lv: 60, st: 2 }, { s: 'x y', lv: 1 }] } } });
  // 老客户端：摘要里没有 team，只有正文——榜单要从正文补出阵容
  await call('/save/idle', { method: 'PUT', headers: U2, body: { data: JSON.stringify({ roster: { aa: { lv: 7, star: 1 }, bb: { lv: 3 }, cc: { lv: 1 } }, team: ['bb', 'aa', 'zz'] }), ver: 0, meta: { maxStage: 20, roster: 3 } } });
  // 没有 gd 的老档案：只有 mb / bb / bs 也要上榜；gd 比老字段旧时取大
  seedSession(kv, 'u3', '9103', '丙'); const U3 = { Authorization: 'Bearer u3' };
  await call('/grants/mine', { headers: U3 });
  await call('/account', { method: 'PUT', headers: U3, body: { doc: { cr: 1, mb: 15000, bb: 40, bs: 2200 }, ver: 0 } });
  // 唤醒王：决斗链接：段位分（只增不减）+ 段位下标，副标要能翻成段位名
  await call('/account', { method: 'PUT', headers: U3, body: { doc: { cr: 1, mb: 15000, bb: 40, bs: 2200, gd: { dl: [1200, 12, 4, 3] } }, ver: 1 } });
  // 弥萨格王权：按结局数排，同数比最长任期；没有门槛（1 个结局也上榜）
  await call('/account', { method: 'PUT', headers: U1, body: { doc: { cr: 1, gd: { dt: [10, 3, 0, 8, 6], dr: [20, 15, 9], mg: [1234], bd: [30, 800], rg: [12, 40, 7, 1], kp: [30, 6, 4], bf: [2400, 2, 5], ll: [123456, 310, 6] } }, ver: 1 } });
  await call('/account', { method: 'PUT', headers: U2, body: { doc: { cr: 1, gd: { dr: [30, 15, 12], mg: [900], rg: [12, 55, 9, 0], kp: [30, 9, 2], bf: [2400, 4, 6] } }, ver: 1 } });
  await call('/account', { method: 'PUT', headers: U3, body: { doc: { cr: 1, mb: 15000, bb: 40, bs: 2200, gd: { dl: [1200, 12, 4, 3], rg: [1, 5, 1, 0], kp: [7, 3, 1] } }, ver: 2 } });
  const bd = await call('/board');
  eq('老档案（只有 mb）也上合成榜且排第一', bd.json.games.mg.items[0], { name: '丙', score: 15000, sub: '' });
  eq('老档案的鸟弟分也进榜', bd.json.games.bd.items.find((x) => x.name === '丙').score, 2200);
  eq('老客户端的挂机榜从正文补阵容（顺序按 team，缺角色的跳过）', bd.json.games.il.items.find((x) => x.name === '乙').team, [{ s: 'bb', lv: 3, st: 0 }, { s: 'aa', lv: 7, st: 1 }]);
  check('榜单可公开读', bd.json.ok && bd.json.games, bd.json);
  eq('合成榜按分数降序', bd.json.games.mg.items.map((x) => [x.name, x.score]), [['丙', 15000], ['甲', 1234], ['乙', 900]]);
  eq('鸟弟榜带最深层数', bd.json.games.bd.items.find((x) => x.name === '甲').sub, '最深 30 层');
  eq('挂机榜用云存档的关数', bd.json.games.il.items[0].score, 55);
  eq('挂机榜带阵容（slug 里的非法字符被清掉）', bd.json.games.il.items[0].team, [{ s: 'ogier', lv: 60, st: 2 }, { s: 'xy', lv: 1, st: 0 }]);
  eq('侦探榜按答对题数排，同分正确率高者在前，副标带正确率', bd.json.games.dr.items.map((x) => [x.name, x.score, x.sub]), [['甲', 15, '正确率 75% · 共答 20 题'], ['乙', 15, '正确率 50% · 共答 30 题']]);
  eq('弥萨格大逃杀榜：确认报告数 + 提交数与正确率', bd.json.games.dt.items.map((x) => [x.name, x.score, x.sub]), [['甲', 6, '提交 8 份 · 正确率 75%']]);
  check('侦探榜单位是题', bd.json.games.dr.unit === '题' && !('tb' in bd.json.games.dr.items[0]));
  eq('决斗榜按段位分排，副标写段位名与战绩', bd.json.games.dl.items.map((x) => [x.name, x.score, x.sub]), [['丙', 1200, '金印级 · 12 胜 4 负']]);
  check('决斗榜单位是分', bd.json.games.dl.unit === '分' && bd.json.games.dl.label === '段位分');
  eq('王权榜按结局数排，同数最长任期长者在前，没有门槛', bd.json.games.rg.items.map((x) => [x.name, x.score, x.sub]), [['乙', 12, '最长任期第 55 天 · 当过 9 任'], ['甲', 12, '最长任期第 40 天 · 当过 7 任'], ['丙', 1, '最长任期第 5 天 · 当过 1 任']]);
  check('王权榜单位与标签', bd.json.games.rg.unit === '个结局' && bd.json.games.rg.label === '结局数' && !('tb' in bd.json.games.rg.items[0]));
  eq('守密人榜按结局数排，同数见过的形态多的在前，副标写形态与下冢次数', bd.json.games.kp.items.map((x) => [x.name, x.score, x.sub]), [['乙', 30, '见过 9 种形态 · 下过 2 趟钥冢'], ['甲', 30, '见过 6 种形态 · 下过 4 趟钥冢'], ['丙', 7, '见过 3 种形态 · 下过 1 趟钥冢']]);
  {
    // 后端抄了一份段位名：必须和前端段位表逐项一致（以前只抄了 9 段，高段位在榜单上没有段位名）
    const { TIERS } = await import('../js/duel/tiers.js');
    const src = fs.readFileSync(new URL('../edge-functions/api/[[default]].js', import.meta.url), 'utf8');
    const m = src.match(/const DUEL_TIERS = (\[[^\]]*\]);/);
    const names = m ? JSON.parse(m[1].replace(/'/g, '"')) : [];
    eq('后端的段位名 = 前端 13 段', names, TIERS.map((x) => x.n));
  }
  eq('lovelive 榜按最高分排，副标写最长连击与谱面数', bd.json.games.ll.items.map((x) => [x.name, x.score, x.sub]), [['甲', 123456, '最长连击 310 · 玩过 6 张谱面']]);
  eq('斗蛐蛐榜按最高荷包排，同分夺冠桌数多的在前', bd.json.games.bf.items.map((x) => [x.name, x.score, x.sub]), [['乙', 2400, '夺冠 4 桌 · 共 6 桌'], ['甲', 2400, '夺冠 2 桌 · 共 5 桌']]);
  check('守密人榜单位与标签', bd.json.games.kp.unit === '个结局' && bd.json.games.kp.label === '结局数' && !('tb' in bd.json.games.kp.items[0]));
  check('没分的游戏榜单为空', bd.json.games.sv.items.length === 0);
}

console.log('\n[21] 用户索引：老用户补全 + 后台/榜单只读索引');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid', ZJTT_ADMIN_UIDS: '9001' });
  seedSession(kv, 'adm', '9001', '姜酒');
  const AD = { Authorization: 'Bearer adm' };
  // 索引上线之前注册的老用户：只有 usr_ / acct_ / sv_ 键，没有索引
  const uh = (uid) => sha('u:' + uid).slice(0, 32);
  void uh;
  await call('/whoami', { headers: AD });
  const keysBefore = (await call('/admin/reindex-keys', { headers: AD })).json.keys;
  check('键名清单包含管理员自己', keysBefore.length >= 1, keysBefore);
  eq('非管理员读不到清单', (await call('/admin/reindex-keys')).status, 401);
  const ov0 = await call('/admin/overview', { headers: AD });
  check('概览带索引人数', ov0.json.ok && ov0.json.stats.indexed >= 1, ov0.json.stats);
  const r = await call('/admin/reindex', { method: 'POST', headers: AD, body: { keys: [...keysBefore, 'bad key!', '../x'] } });
  check('补全只认合法的 usr_ 键', r.json.ok && r.json.asked === keysBefore.length && r.json.done === keysBefore.length, r.json);
}

console.log('\n[22] 管理员查看挂机存档');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid', ZJTT_ADMIN_UIDS: '9001' });
  seedSession(kv, 'adm', '9001', '姜酒'); seedSession(kv, 'u1', '9101', '甲');
  const AD = { Authorization: 'Bearer adm' }, U1 = { Authorization: 'Bearer u1' };
  const save = { v: 3, created: 1000, lastSeen: 9000 * 1000, play: 1560, maxStage: 200, stage: 200, gold: 5, stats: { battles: 90, wins: 60, pulls: 3 },
    roster: { a: { lv: 159, star: 99 }, b: { lv: 159, star: 99 }, c: { lv: 159, star: 99 }, d: { lv: 10, star: 0 }, e: { lv: 159, star: 99, od: 99 } } };
  await call('/save/idle', { method: 'PUT', headers: U1, body: { data: JSON.stringify(save), ver: 0, rev: 5, meta: { maxStage: 200, roster: 4 } } });
  eq('非管理员不能看', (await call('/admin/idle-save?uid=9101', { headers: U1 })).status, 403);
  eq('没有存档 → found:false', (await call('/admin/idle-save?uid=9999', { headers: AD })).json.found, false);
  const r = await call('/admin/idle-save?uid=9101', { headers: AD });
  check('能读到摘要并给出异常对照', r.json.found && r.json.summary.maxStage === 200 && r.json.top[0].lv === 159 && r.json.flags.length >= 2 && !('data' in r.json), r.json);
  check('摘要带超限 od', r.json.top.find((t) => t.slug === 'e').od === 99, r.json.top);
  check('认得旧版直升券签名（超限 99）', r.json.directFix.hit === 1 && r.json.directFix.chars[0].slug === 'e', r.json.directFix);
  check('带存档版本与修复标记', r.json.saveVersion === 3 && r.json.directFix.fixed === 0, r.json);
  check('命中的账号会带一条提示', r.json.flags.some((f) => f.includes('旧版直升券')), r.json.flags);
}

console.log('\n[23] 世界 Boss /wboss：全服共享血池、每日三次、排名与结算');
{
  const kv = fakeKV();
  const call = makeCaller({ zjtt_kv: kv, WALINE_URL: 'https://example.invalid' });
  seedSession(kv, 'a', '7001', '甲'); seedSession(kv, 'b', '7002', '乙'); seedSession(kv, 'c', '7003', '丙'); seedSession(kv, 'd', '7004', '丁');
  const A = { Authorization: 'Bearer a' }, B = { Authorization: 'Bearer b' }, C = { Authorization: 'Bearer c' }, D = { Authorization: 'Bearer d' };
  const weekId = (d = new Date()) => {
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const n = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - n);
    const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
    return `${y}-W${String(w).padStart(2, '0')}`;
  };
  const WK = weekId();
  const wkey = (w) => 'wb_' + w.replace(/[^A-Za-z0-9]/g, '_');
  // 领票 + 上报：世界里所有一击都得先在 /wboss/start 拿 seed
  const start = async (headers) => call('/wboss/start', { method: 'POST', headers });
  const hitAs = async (headers, dmg) => {
    const t = await start(headers);
    if (t.status !== 200) return { status: t.status, json: t.json };
    return await call('/wboss/hit', { method: 'POST', headers, body: { seed: t.json.seed, dmg } });
  };

  const g0 = await call('/wboss');
  eq('游客也能看血池', g0.status, 200);
  eq('游客没有个人数据', g0.json.me, null);
  check('首周没有参考人数，血池按下限 800 万开', g0.json.hp === g0.json.hpMax && g0.json.hpMax === 8e6, g0.json);
  check('单次上限随血池给出（这里是两成 160 万）', g0.json.cap === 1.6e6 && g0.json.rounds === 12, g0.json);
  eq('本周还没有结算信息以外的上期', g0.json.last, null);
  eq('没登录不能领票 → 401', (await start({})).status, 401);
  eq('没登录不能上报 → 401', (await call('/wboss/hit', { method: 'POST', body: { seed: 1, dmg: 100 } })).status, 401);
  eq('上报不带 seed（老页面）→ 400 need_update', (await call('/wboss/hit', { method: 'POST', headers: A, body: { dmg: 100 } })).json.error, 'need_update');
  // 这两条用「丁」来试：领票会扣次数，用甲会把后面的次数断言打乱
  eq('伤害为 0 → 400', (await hitAs(D, 0)).status, 400);
  eq('伤害是负数 → 400', (await hitAs(D, -5)).status, 400);

  // 领票就扣次数：并发两个请求不可能都通过（以前是先上报再扣，能并发刷出两刀）
  const t1 = await start(A);
  check('领票返回服务端 seed 与剩余次数', t1.json.ok && t1.json.seed > 0 && t1.json.me.tries === 2, t1.json);
  const seed1 = t1.json.seed;
  eq('拿错 seed 上报 → 403', (await call('/wboss/hit', { method: 'POST', headers: A, body: { seed: (seed1 + 1) >>> 0, dmg: 100 } })).status, 403);
  const h1 = await call('/wboss/hit', { method: 'POST', headers: A, body: { seed: seed1, dmg: 1000 } });
  eq('血池扣掉这一下', h1.json.hp, 8e6 - 1000);
  eq('个人累计伤害', h1.json.me.dmg, 1000);
  eq('次数在领票时就扣了（这里仍是 2）', h1.json.me.tries, 2);
  eq('自己是唯一参与者时排第 1', h1.json.me.rank, 1);
  eq('同一张票再用一次 → 403', (await call('/wboss/hit', { method: 'POST', headers: A, body: { seed: seed1, dmg: 1000 } })).status, 403);

  const h2 = await hitAs(B, 5000);
  eq('乙的伤害记上', h2.json.applied, 5000);
  eq('血池继续扣', h2.json.hp, 8e6 - 1000 - 5000);
  eq('乙排第 1', h2.json.me.rank, 1);
  eq('甲掉到第 2', (await call('/wboss', { headers: A })).json.me.rank, 2);

  for (let i = 0; i < 3; i++) await hitAs(C, 300 + i);
  eq('一天三次用完', (await call('/wboss', { headers: C })).json.me.tries, 0);
  eq('第四次领票被拒（409 no_tries）', (await start(C)).status, 409);
  eq('被拒的原因', (await start(C)).json.error, 'no_tries');
  eq('被拒不会白扣血池', (await call('/wboss', { headers: A })).json.hp, 8e6 - 1000 - 5000 - 903);

  // 票据过期：把 at 改到 16 分钟前
  await start(D);
  const dk = wkey(WK) + '_u_' + sha('u:7004');
  const drec = JSON.parse(kv._m.get(dk));
  drec.tk.at = Date.now() - 16 * 60e3;
  kv._m.set(dk, JSON.stringify(drec));
  eq('票据过期上报 → 403', (await call('/wboss/hit', { method: 'POST', headers: D, body: { seed: drec.tk.s, dmg: 100 } })).json.error, 'ticket_expired');

  const top = (await call('/wboss')).json;
  check('排行榜按伤害降序', top.top.length === 3 && top.top[0].name === '乙' && top.top[1].name === '甲' && top.top[2].name === '丙', top.top);
  eq('参与者计数', top.players, 3);
  eq('本周还没结束不能结算', (await call('/wboss/claim', { method: 'POST', headers: A, body: { week: WK } })).status, 409);
  eq('乱填周号 → 400', (await call('/wboss/claim', { method: 'POST', headers: A, body: { week: '2026-W99x' } })).status, 400);

  // 上一期（伪造一份上周的记录）
  const LW = weekId(new Date(Date.now() - 7 * 86400e3));
  const lk = wkey(LW);
  kv._m.set(lk, JSON.stringify({ week: LW, hpMax: 8e7, hp: 0, at: Date.now(), killed: true, closed: true }));
  kv._m.set(lk + '_u_' + sha('u:7001'), JSON.stringify({ u: '7001', n: '甲', dmg: 5000, best: 5000, runs: 2, day: '', tries: 0, claimed: false, at: Date.now() }));
  kv._m.set(lk + '_u_' + sha('u:7002'), JSON.stringify({ u: '7002', n: '乙', dmg: 9000, best: 9000, runs: 3, day: '', tries: 0, claimed: false, at: Date.now() }));
  const g1 = await call('/wboss', { headers: A });
  check('带回上一期：我的伤害 / 名次 / 未领', g1.json.last && g1.json.last.week === LW && g1.json.last.myDmg === 5000 && g1.json.last.myRank === 2 && g1.json.last.claimed === false && g1.json.last.killed === true, g1.json.last);
  const c1 = await call('/wboss/claim', { method: 'POST', headers: A, body: { week: LW } });
  check('结算给出名次与击杀标记', c1.json.ok && c1.json.rank === 2 && c1.json.dmg === 5000 && c1.json.killed === true && c1.json.players === 2, c1.json);
  const c2 = await call('/wboss/claim', { method: 'POST', headers: A, body: { week: LW } });
  check('重复领取幂等（不报错、仍是 claimed）', c2.status === 200 && c2.json.claimed === true && c2.json.rank === 2, c2.json);
  eq('领过之后 last.claimed 变 true', (await call('/wboss', { headers: A })).json.last.claimed, true);
  eq('没打过的人不能领 → 400', (await call('/wboss/claim', { method: 'POST', headers: D, body: { week: LW } })).status, 400);
  eq('没登录不能领 → 401', (await call('/wboss/claim', { method: 'POST', body: { week: LW } })).status, 401);
  eq('太旧的周不能结算 → 400', (await call('/wboss/claim', { method: 'POST', headers: A, body: { week: '2020-W01' } })).status, 400);

  // 单次伤害夹断：cap = min(绝对上限 200 万, 血池两成)
  const kvBig = fakeKV();
  const callBig = makeCaller({ zjtt_kv: kvBig, WALINE_URL: 'https://example.invalid' });
  seedSession(kvBig, 'a', '7201', '甲');
  await callBig('/wboss');
  kvBig._m.set(wkey(WK), JSON.stringify({ week: WK, hpMax: 1e8, hp: 1e8, at: Date.now(), killed: false, closed: false }));
  const AB = { Authorization: 'Bearer a' };
  const tb = await callBig('/wboss/start', { method: 'POST', headers: AB });
  eq('血池够大时按绝对上限 200 万', tb.json.cap, 2e6);
  const hb = await callBig('/wboss/hit', { method: 'POST', headers: AB, body: { seed: tb.json.seed, dmg: 1e12 } });
  eq('单次伤害夹到 200 万', hb.json.applied, 2e6);
  eq('夹断时会告诉客户端 capped', hb.json.capped, true);
  eq('夹住之后血池按上限扣', hb.json.hp, 1e8 - 2e6);
  eq('一发打不空一亿的血池（以前 2000 万上限时也打不空，但现在有 20% 的硬顶）', hb.json.killed, false);
  eq('触顶记进了个人档案', (JSON.parse(kvBig._m.get(wkey(WK) + '_u_' + sha('u:7201')))).over, 1);

  // 血池按上周人数伸缩
  const kvP = fakeKV();
  const callP = makeCaller({ zjtt_kv: kvP, WALINE_URL: 'https://example.invalid' });
  const LWp = weekId(new Date(Date.now() - 7 * 86400e3));
  kvP._m.set(wkey(LWp), JSON.stringify({ week: LWp, hpMax: 8e6, hp: 0, players: 40, killed: true, closed: true, at: Date.now() }));
  const gp = await callP('/wboss');
  eq('上周 40 人 → 本期血池 2400 万', gp.json.hpMax, 2.4e7);
  const kvQ = fakeKV();
  const callQ = makeCaller({ zjtt_kv: kvQ, WALINE_URL: 'https://example.invalid' });
  kvQ._m.set(wkey(LWp), JSON.stringify({ week: LWp, hpMax: 8e6, hp: 0, players: 500, killed: true, closed: true, at: Date.now() }));
  eq('人数再多也不超过 6000 万', (await callQ('/wboss')).json.hpMax, 6e7);

  // 血池打空：最后一下只按剩余血量计，Boss 关闭后不再接伤害
  const kv2 = fakeKV();
  const call2 = makeCaller({ zjtt_kv: kv2, WALINE_URL: 'https://example.invalid' });
  seedSession(kv2, 'a', '7101', '甲');
  const A2 = { Authorization: 'Bearer a' };
  await call2('/wboss');
  const k2 = wkey(WK);
  kv2._m.set(k2, JSON.stringify({ week: WK, hpMax: 1.2e7, hp: 500, at: Date.now(), killed: false, closed: false }));
  const tk2 = await call2('/wboss/start', { method: 'POST', headers: A2 });
  const k1 = await call2('/wboss/hit', { method: 'POST', headers: A2, body: { seed: tk2.json.seed, dmg: 5000 } });
  check('最后一下只结算剩余血量', k1.json.applied === 500 && k1.json.hp === 0 && k1.json.killed === true, k1.json);
  eq('击杀后个人伤害只记实际扣掉的', k1.json.me.dmg, 500);
  eq('血池空了之后不能再领票', (await call2('/wboss/start', { method: 'POST', headers: A2 })).status, 409);
  eq('血池空了之后也不能再上报', (await call2('/wboss/hit', { method: 'POST', headers: A2, body: { seed: tk2.json.seed, dmg: 100 } })).status, 409);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);if (fail) {
  console.log('\n失败项：');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('全部通过 ✓');
