// 红流树海 UI 冒烟：连一个已经开着的无头 Edge（CDP），走一遍
// 挑战 → 红流树海 → 选分队 → 募队 → 出发 → 局内，检查关键 DOM 与零 JS 报错。
// 用法：先起 http 服务与 Edge（--remote-debugging-port=9367），再 node tools/tree-smoke.cjs [port]
const http = require('node:http');

const PORT = Number(process.argv[2]) || 9367;
const URL_GAME = 'http://127.0.0.1:8799/index.html';
delete process.env.HTTP_PROXY; delete process.env.HTTPS_PROXY;
delete process.env.http_proxy; delete process.env.https_proxy;

const getJson = (p) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path: p, agent: false }, (r) => {
    let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  const list = await getJson('/json/list');
  const page = list.find((t) => t.type === 'page' && !String(t.url).startsWith('chrome-extension://'));
  if (!page) throw new Error('没有可用的 page target');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const errs = [];
  const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EX ' + (m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') errs.push('CE ' + (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
  });
  await new Promise((r) => ws.addEventListener('open', r));
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 1400, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_GAME });
  await new Promise((r) => setTimeout(r, 2200));

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r?.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + expr);
    return r?.result?.value;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    require('node:fs').writeFileSync(`H:/Temp/tree-${name}.png`, Buffer.from(r.data, 'base64'));
  };

  const out = {};
  // 进树海主页
  await ev(`document.querySelector('#tabs [data-group="challenge"]').click()`);
  await new Promise((r) => setTimeout(r, 300));
  await ev(`document.querySelector('#subnav [data-sub="tree"]').click()`);
  await new Promise((r) => setTimeout(r, 500));
  out.home = await ev(`({
    lvCard: !!document.querySelector('.lkxp'),
    branches: document.querySelectorAll('.lkbranch').length,
    talents: document.querySelectorAll('.lktal').length,
    ruleBranch: document.querySelectorAll('.lkbranch.rule').length,
    univBtn: [...document.querySelectorAll('[data-act="tree-use-awaken"]')].some((b) => b.dataset.realm === 'ANY'),
    diffs: document.querySelectorAll('.lkdiff').length
  })`);
  await shot('home');

  // 募队弹窗：6 支分队
  await ev(`document.querySelector('.lkdiff [data-act="tree-open-draft"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  out.draft = await ev(`({
    squads: document.querySelectorAll('.lksquads .lkpick').length,
    title: (document.querySelector('.modal h3, .modal-hd, h3') || {}).textContent || '',
    budgetBtn: !!document.querySelector('[data-act="tree-depart"]')
  })`);
  await shot('draft');

  // 选后勤分队：预算该从 100 变 130
  const budgetBefore = await ev(`(document.querySelector('.modal, .sheet, #modal') || document.body).innerText.match(/预算 (\\d+)/)?.[1] || ''`);
  await ev(`document.querySelectorAll('.lksquads .lkpick')[1].click()`);
  await new Promise((r) => setTimeout(r, 350));
  const budgetAfter = await ev(`(document.querySelector('.modal, .sheet, #modal') || document.body).innerText.match(/预算 (\\d+)/)?.[1] || ''`);
  out.budget = { before: budgetBefore, after: budgetAfter };
  await shot('draft-squad');

  // 募 4 个人再出发（点每个可用的人卡）
  await ev(`(() => {
    const cards = [...document.querySelectorAll('.lkpicks [data-act="tree-draft-toggle"]')].filter((b) => !b.disabled);
    for (const c of cards.slice(0, 4)) c.click();
    return cards.length;
  })()`);
  await new Promise((r) => setTimeout(r, 400));
  await ev(`document.querySelector('[data-act="tree-depart"]').click()`);
  await new Promise((r) => setTimeout(r, 900));
  out.run = await ev(`({
    rules: !!document.querySelector('.lkside'),
    ruleTags: [...document.querySelectorAll('.lktag')].map((x) => x.textContent).filter((t) => /分队|上场|仓库|三选一|留手|猎场|祭坛|余晖|结算/.test(t)).slice(0, 8),
    branchBtns: document.querySelectorAll('[data-act="tree-branch"]').length,
    path: document.querySelectorAll('.lknode').length,
    head: (document.querySelector('#view h2') || {}).textContent || ''
  })`);
  await shot('run');

  // 开一次仓库面板，确认上限随分队变
  await ev(`document.querySelector('[data-act="tree-depot"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  out.depot = await ev(`(document.querySelector('.modal, .sheet, #modal') || document.body).innerText.match(/仓库 [^\\n]{0,24}/)?.[0] || ''`);
  await shot('depot');

  out.errors = errs;
  console.log(JSON.stringify(out, null, 2));
  ws.close();
  process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
