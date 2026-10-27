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

console.log('\n[2] 没有任何存储时给出可读错误');
{
  const call = makeCaller({});
  const r = await call('/health');
  eq('→ 503（探活仍能答话，只是 ok:false）', r.status, 503);
  eq('→ ok:false', r.json.ok, false);
  eq('→ kv:false', r.json.kv, false);
  eq('→ store:null', r.json.store, null);
  eq('→ no_store', r.json.error, 'no_store');
  check('提示里同时写了 KV 与 Blob 两条路', /KV/.test(String(r.json.detail)) && /ZJTT_BLOB_TOKEN/.test(String(r.json.detail)));

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
    const call = makeCaller({});           // env 里什么都没有
    const r = await call('/health');
    eq('→ 200', r.status, 200);
    eq('→ kv:true', r.json.kv, true);
  } finally {
    delete globalThis.zjtt_kv;
  }
}

console.log('\n[2c] env 里有同名但不像 KV 的东西时不能误判');
{
  const call = makeCaller({ zjtt_kv: 'oops', KV: { foo: 1 } });
  const r = await call('/health');
  eq('→ 503 而不是当成可用存储', r.status, 503);
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
  // 按 @edgeone/pages-blob 的真实语义造一个：set/get(key,{type,consistency})/delete/list
  const blob = (() => {
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
  })();

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

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);if (fail) {
  console.log('\n失败项：');
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
console.log('全部通过 ✓');
