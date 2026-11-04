// 第二段冒烟：天赋「岔路生枝」→ 三岔路；通用唤醒券 → 券匣第 5 个 tab
const http = require('node:http');
const PORT = Number(process.argv[2]) || 9367;
delete process.env.HTTP_PROXY; delete process.env.HTTPS_PROXY;
const getJson = (p) => new Promise((res, rej) => { http.get({ host: '127.0.0.1', port: PORT, path: p, agent: false }, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej); });
(async () => {
  const list = await getJson('/json/list');
  const page = list.find((t) => t.type === 'page' && !String(t.url).startsWith('chrome-extension://'));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0; const pending = new Map(); const errs = [];
  const send = (m, p = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EX ' + (m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') errs.push('CE ' + (m.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '));
  });
  await new Promise((r) => ws.addEventListener('open', r));
  await send('Runtime.enable'); await send('Page.enable');
  const ev = async (x) => { const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r?.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + x.slice(0, 60)); return r?.result?.value; };
  const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); require('node:fs').writeFileSync(`H:/Temp/tree-${n}.png`, Buffer.from(r.data, 'base64')); };

  const out = {};
  // 直接改存档：清掉进行中的一趟，塞天赋点与通用券
  await ev(`(() => {
    const s = __game.state;
    s.tree.cur = null; s.tree.tp = 12; s.tree.talents = {};
    s.vouchers.univ = 2;
    s.vouchers.awaken = { CHAOS: 0, CARO: 0, AEQUOR: 0, ULTRA: 0 };
    __game.save(); return true;
  })()`);
  await ev(`document.querySelector('#tabs [data-group="challenge"]').click()`);
  await ev(`document.querySelector('#subnav [data-sub="tree"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  // 点「岔路生枝」
  await ev(`document.querySelector('[data-act="tree-talent"][data-id="b_paths"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  out.talent = await ev(`({ done: document.querySelectorAll('.lktal.done').length, tp: __game.state.tree.talents.b_paths, left: __game.state.tree.tp })`);
  await shot('talent');

  // 开一局（选第一支分队），看岔路是不是 3 条
  await ev(`document.querySelector('.lkdiff [data-act="tree-open-draft"]').click()`);
  await new Promise((r) => setTimeout(r, 350));
  await ev(`(() => { const c = [...document.querySelectorAll('.lkpicks [data-act="tree-draft-toggle"]')].filter((b) => !b.disabled)[0]; c && c.click(); })()`);
  await new Promise((r) => setTimeout(r, 300));
  await ev(`document.querySelector('[data-act="tree-depart"]').click()`);
  await new Promise((r) => setTimeout(r, 900));
  out.run = await ev(`({ branchBtns: document.querySelectorAll('[data-act="tree-branch"]').length, tags: [...document.querySelectorAll('.lktag')].map((x) => x.textContent) })`);
  await shot('run3');

  // 通用券：回主页点券匣的通用按钮
  await ev(`(() => { __game.state.tree.cur = null; __game.save(); })()`);
  await ev(`document.querySelector('#subnav [data-sub="tree"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  await ev(`document.querySelector('[data-act="tree-use-awaken"][data-realm="ANY"]').click()`);
  await new Promise((r) => setTimeout(r, 400));
  out.univ = await ev(`({
    tabs: [...document.querySelectorAll('[data-act="tree-use-awaken"][data-realm]')].map((b) => b.dataset.realm),
    head: (document.body.innerText.match(/通用唤醒券 · 剩 \\d+ 张/) || [''])[0],
    cards: document.querySelectorAll('[data-act="tree-awaken-pick"]').length
  })`);
  await shot('univ');

  out.errors = errs;
  console.log(JSON.stringify(out, null, 2));
  ws.close(); process.exit(0);
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
