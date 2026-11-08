// 界面冒烟：① 大运 / 树海 结算弹窗里「回主页」要关窗 ② 领奖跳过没拿到的奖励（不再 undefined）
// ③ 赌徒之骰真的给四个选项
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9361 + (process.pid % 40);
const URL_BASE = 'http://127.0.0.1:8799/index.html';
const OUT = 'H:/Temp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const profile = 'H:/Temp/edgeprof-luck-' + Date.now();
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
  // 临时配置目录（每个几百 MB）用完就删：以前只创建不清理，跑几十次临时盘就被 edgeprof-* 堆满。
  // 先 taskkill 连子进程一起收（只 kill 父进程的话，Edge 的子进程还会捏着目录句柄，删不掉）。
  const dropProfile = () => {
    try { if (process.platform === 'win32') require('child_process').spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已经退了 */ }
    try { proc.kill(); } catch { /* 已经退了 */ }
    try { require('fs').rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 }); } catch { /* 还是删不掉就留给系统 */ }
  };
  process.on('exit', dropProfile);
  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); target = l.find((t) => t.type === 'page'); } catch { /* 还没起来 */ }
    if (!target) await sleep(250);
  }
  if (!target) { console.log('浏览器没起来'); proc.kill(); process.exit(1); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let seq = 0; const pend = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++seq; pend.set(i, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); };

  const errs = [];
  await send('Page.enable'); await send('Runtime.enable');
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || 'err'); });

  const checks = [];
  const check = (name, ok, extra = '') => { checks.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

  await send('Page.navigate', { url: URL_BASE });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { await sleep(500); try { up = await ev('!!(window.__game && window.__game.state && window.__game.data)'); } catch { /* boot */ } }
  if (!up) { console.log('启动超时'); ws.close(); proc.kill(); process.exit(1); }
  await sleep(1200);
  await ev(`(()=>{const b=document.querySelector('[data-gskip]'); if(b) b.click(); window.__game.state.guide=1; window.__game.save(); document.querySelectorAll('.modal-bg').forEach(m=>m.remove()); return 1;})()`);

  // ---- ① 结算弹窗里「回大运主页」：切页同时要关窗
  await ev(`(async()=>{
    const U = await import('/src/ui/util.js');
    const g = window.__game;
    g.app ? 0 : 0;
    U.openModal('<h3>打通三层</h3><div class="row"><button class="btn gold" data-act="go-luck">回大运主页</button></div>', 'wide');
    return !!document.querySelector('.modal-bg');
  })()`);
  check('弹窗已打开（前置条件）', await ev(`!!document.querySelector('.modal-bg')`));
  await ev(`document.querySelector('[data-act="go-luck"]').click()`);
  await sleep(500);
  check('点「回大运主页」后弹窗消失', (await ev(`document.querySelectorAll('.modal-bg').length`)) === 0);
  check('并且确实切到了大运页', (await ev(`document.body.dataset.tab`)) === 'luck');

  // 树海同理
  await ev(`(async()=>{ const U = await import('/src/ui/util.js'); U.openModal('<h3>止步第 2 层</h3><div class="row"><button class="btn gold" data-act="go-tree">回树海主页</button></div>','wide'); return 1; })()`);
  await ev(`document.querySelector('[data-act="go-tree"]').click()`);
  await sleep(500);
  check('点「回树海主页」后弹窗也消失', (await ev(`document.querySelectorAll('.modal-bg').length`)) === 0);
  check('确实切到了树海页', (await ev(`document.body.dataset.tab`)) === 'tree');

  // ---- ② 领奖文案：满载而归（没有召唤券）
  const before = await ev(`(()=>{const s=window.__game.state; s.luck=s.luck||{}; s.luck.ach=s.luck.ach||{}; s.luck.ach['a_relic12']=Date.now(); return JSON.stringify(s.luck.ach);})()`);
  await ev(`(()=>{
    const b=document.createElement('button'); b.dataset.act='luck-ach'; b.dataset.id='a_relic12';
    // 随便一个 id，走的是同一套 onAct（不需要在页面上）
    window.__t = b; document.body.appendChild(b); b.click(); setTimeout(()=>b.remove(), 10); return 1;
  })()`);
  await sleep(600);
  const toastText = await ev(`(()=>{const t=document.querySelector('.toast'); return t? t.textContent : '';})()`);
  check('领奖 toast 里有奖励内容', /银芯\+70/.test(toastText) || /金币\+3500/.test(toastText), toastText);
  check('领奖 toast 里没有 undefined', !/undefined/.test(toastText), toastText);
  await shot('s_luck_claim.png');

  // ---- ③ 赌徒之骰：四个选项
  const n3 = await ev(`(async()=>{
    const L = await import('/src/core/luckrun.js');
    const LK = await import('/src/ui/luck.js');
    const g = window.__game;
    document.querySelectorAll('.modal-bg').forEach(m=>m.remove());
    const run = L.startRun(g.state, g.data, 'dim');
    run.offer = L.offerPool(g.state, g.data, run, 3);
    window.__run = run;
    LK.luckOfferModal(g, run);
    return document.querySelectorAll('.lkpick').length;
  })()`);
  check('没有赌徒之骰时是三选一', n3 === 3, String(n3));
  const n4 = await ev(`(async()=>{
    const L = await import('/src/core/luckrun.js');
    const LK = await import('/src/ui/luck.js');
    const g = window.__game, run = window.__run;
    run.relics.push('r_gambler');
    run.offer = L.offerPool(g.state, g.data, run, 3);
    LK.luckOfferModal(g, run);
    return document.querySelectorAll('.lkpick').length;
  })()`);
  check('拿到赌徒之骰后变四选一', n4 === 4, String(n4));
  check('四张卡都渲染了标题（没有空卡）', (await ev(`Array.from(document.querySelectorAll('.lkpick b')).filter(b=>b.textContent.trim()).length`)) === 4);
  await shot('s_luck_offer4.png');

  check('全程没有 JS 异常', errs.length === 0, errs[0] || '');

  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} 通过`);
  ws.close(); proc.kill();
  process.exit(bad.length ? 1 : 0);
})();
