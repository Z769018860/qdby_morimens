// 逆潮守关冒烟（不依赖 playwright：直接用系统 Edge 的 CDP 走一遍界面）。
// 用法：先起静态服务器（python -m http.server 8799），再 node tools/den-smoke.cjs
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 本机 ms-playwright 里的 chromium 起不来（被安全软件拦），但系统 Edge 的 headless 可以，直接借它
const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const URL_BASE = process.env.DEN_URL || 'http://127.0.0.1:8799/index.html';
const OUT = 'H:/Temp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, '--user-data-dir=H:/Temp/edgeprof-den',
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--window-size=430,940', 'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* 还没起来 */ }
    if (!target) await sleep(250);
  }
  if (!target) { console.log('浏览器没起来'); proc.kill(); process.exit(1); }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let seq = 0;
  const pend = new Map();
  const errs = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') errs.push('EX ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('CE ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++seq;
    pend.set(i, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)));
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const click = (sel) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) return false; e.click(); return true;})()`);
  // 挂机主线不停在打，胜利结算框一个接一个弹出来挡镜头；截图前顺手全清（结算框截图除外）
  const clearModals = () => ev(`(()=>{const ms=[...document.querySelectorAll('.modal-bg')]; ms.forEach((m)=>m.remove()); return ms.length;})()`);
  const shot = async (name, keepModal = false) => {
    if (!keepModal) await clearModals();
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL_BASE });
  // 等游戏真的启动（数据包大，冷启动要几秒）
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(500);
    try { up = await ev('!!(window.__game && window.__game.state && window.__game.data)'); } catch { /* 页面还没 ready */ }
  }
  console.log('启动', up ? 'ok' : '超时');
  if (!up) { await shot('s_den_boot_fail.png'); console.log(errs.join('\n') || 'no errors'); ws.close(); proc.kill(); process.exit(1); }
  await sleep(1000);
  // 新存档会有新手引导，先跳过免得挡住界面
  await ev(`(()=>{const b=document.querySelector('[data-gskip]'); if(b){b.click(); return 1;} return 0;})()`);
  await sleep(600);

  // 停掉主线挂机链：不然它的胜利结算会不停地往弹窗层里挤
  await ev(`(()=>{window.__game.bv && window.__game.bv.stop && window.__game.bv.stop(); return 1;})()`);
  await sleep(400);
  // 装一点进度：解锁前 10 关，省得从第 1 关一路打
  await ev(`(()=>{const s=window.__game.state; s.den={best:9,stars:{1:3,2:2,3:1},lineups:{},runs:4,wins:3,claim:{},played:3}; window.__game.save(); return 1;})()`);
  await click('[data-group=challenge]');
  await sleep(400);
  await click('[data-sub=den]');
  await sleep(700);
  await shot('s_den_list.png');
  console.log('关卡格', await ev(`document.querySelectorAll('.dencell').length`), '锁定', await ev(`document.querySelectorAll('.dencell.lock').length`), '章节', await ev(`document.querySelectorAll('.dencells').length`));

  await click('.dencell[data-n="3"]');
  await sleep(600);
  await shot('s_den_stage.png');
  console.log('玩家卡', await ev(`document.querySelectorAll('.denpcard').length`), '可选怪', await ev(`document.querySelectorAll('.denmon').length`));

  for (let i = 0; i < 3; i++) {
    await ev(`(()=>{const e=document.querySelectorAll('.denmon')[${i}]; if(e) e.click(); return 1;})()`);
    await sleep(250);
  }
  console.log('已上场', await ev(`document.querySelectorAll('.denslot:not(.empty)').length`), '算力', await ev(`(document.querySelector('.denbar em')||{}).textContent`));
  await shot('s_den_team.png');

  await click('.denslot .btn.xs[data-tier="t1"]');
  await sleep(300);
  console.log('切幼体后算力', await ev(`(document.querySelector('.denbar em')||{}).textContent`));
  await shot('s_den_team2.png');

  const canFight = await ev(`!!document.querySelector('.btn.gold[data-act="den-fight"]:not([disabled])')`);
  console.log('可以开打', canFight, 'picks', await ev(`JSON.stringify(window.__game.ui.denPicks||[])`), 'runs', await ev(`window.__game.state.den.runs`));
  if (canFight) {
    await click('.btn.gold[data-act="den-fight"]');
    await sleep(2200);
    await shot('s_den_fight.png', true);    // 这张是回放面板本身，别把它当弹窗清掉
    await click('[data-rp="skip"]');        // 跳过回放
    await sleep(1500);
    // 先抢在下一场主线结算弹出来之前把标题读走
    console.log('结算框标题', await ev(`(document.querySelector('.modal h3')||{}).textContent`),
      'runs', await ev(`window.__game.state.den.runs`),
      'modalCount', await ev(`document.querySelectorAll('.modal-bg').length`));
    await shot('s_den_result.png', true);   // 这张就是要看结算弹窗
    await clearModals();
    await click('.modal .btn.gold');
    await sleep(800);
  }

  console.log('存档', await ev(`JSON.stringify(window.__game.state.den)`));
  console.log('回到关卡列表', await ev(`!!document.querySelector('.dencells')`));
  await shot('s_den_after.png');
  console.log(errs.length ? errs.join('\n') : 'no errors');
  ws.close();
  proc.kill();
  process.exit(0);
})().catch((e) => { console.log('FAIL', e.message); process.exit(1); });
