// 高级设置 · 自动行动顺序：UI 冒烟（Edge headless + 手写 CDP）
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9341;
const URL_BASE = 'http://127.0.0.1:8799/index.html';
const OUT = 'H:/Temp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const profile = 'H:/Temp/edgeprof-order-' + Date.now();
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
  const click = (sel) => ev(`(()=>{const b=document.querySelector(${JSON.stringify(sel)}); if(!b) return 'no-btn'; b.click(); return 'ok';})()`);

  const errs = [];
  await send('Page.enable'); await send('Runtime.enable');
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails?.exception?.description || 'err'); });
  await send('Page.navigate', { url: URL_BASE });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) { await sleep(500); try { up = await ev('!!(window.__game && window.__game.state && window.__game.data)'); } catch { /* boot */ } }
  if (!up) { console.log('启动超时'); ws.close(); proc.kill(); process.exit(1); }
  await sleep(1200);
  await ev(`(()=>{const b=document.querySelector('[data-gskip]'); if(b) b.click(); return 1;})()`);
  await sleep(400);
  // 停掉主线挂机，免得结算弹窗反复挡镜头
  await ev(`(()=>{window.__game.bv && window.__game.bv.stop && window.__game.bv.stop(); return 1;})()`);

  // 造一支 4 人队
  await ev(`(()=>{const g=window.__game,s=g.state; const c=g.data.awakeners.slice(0,6);
    for(const a of c) s.roster[a.slug]={lv:80,star:5,brk:3};
    s.team=c.slice(0,4).map(a=>a.slug); g.save(); return s.team.length;})()`);
  await ev(`(()=>{document.querySelector('[data-group=team]').click(); return 1;})()`);
  await sleep(600);
  await click('[data-sub=team]');
  await sleep(700);
  await ev(`(()=>{document.querySelectorAll('.modal-bg').forEach(m=>m.remove()); return 1;})()`);

  const checks = [];
  const check = (name, ok, extra = '') => { checks.push({ name, ok, extra }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

  // 1) 高级设置区块存在且默认收起
  check('高级设置区块存在', await ev(`!!document.querySelector('.advbox')`));
  check('默认收起', (await ev(`document.querySelector('.advbox').open`)) === false);
  // 2) 展开
  await ev(`(()=>{const d=document.querySelector('.advbox'); d.open=true; return 1;})()`);
  await sleep(300);
  const rows = await ev(`document.querySelectorAll('.advbox .uo-row').length`);
  check('四行顺序', rows === 4, `实际 ${rows}`);
  await shot('s_order_closed.png');

  const orderOf = () => ev(`(()=>{const s=window.__game.state; return JSON.stringify(s.strategy.order);})()`);
  const teamOf = () => ev(`(()=>{const s=window.__game.state; return JSON.stringify(s.team);})()`);
  const uidsOf = () => ev(`JSON.stringify([...document.querySelectorAll('.advbox .uo-row')].map(r=>r.dataset.slug || ''))`);

  const team0 = JSON.parse(await teamOf());
  const ord0 = JSON.parse(await orderOf());
  check('初始顺序=站位', JSON.stringify(ord0) === JSON.stringify(team0), `${ord0}`);

  // 3) 点第一位的 ↓
  const firstSlug = ord0[0];
  await ev(`(()=>{const b=document.querySelector('.advbox .uo-row .btn.xs[data-dir="1"]'); if(!b) return 'no'; b.click(); return 'ok';})()`);
  await sleep(500);
  const ord1 = JSON.parse(await orderOf());
  check('下移生效', ord1[1] === firstSlug && ord1[0] === ord0[1], `${ord0} → ${ord1}`);
  check('存档已写', (await ev(`JSON.stringify(window.__game.state.strategy.order)`)) === JSON.stringify(ord1));
  check('摘要标已自定义', await ev(`!!document.querySelector('.advbox summary .new')`));
  check('恢复按钮可用', (await ev(`(()=>{const b=document.querySelector('[data-act="order-reset"]'); return b && !b.disabled;})()`)) === true);
  await shot('s_order_custom.png');

  // 4) 刷新后还在
  const saved = ord1;
  await send('Page.reload', {});
  await sleep(3500);
  let up2 = false;
  for (let i = 0; i < 40 && !up2; i++) { await sleep(400); try { up2 = await ev('!!(window.__game && window.__game.state)'); } catch { /* boot */ } }
  const afterReload = JSON.parse(await ev(`JSON.stringify(window.__game.state.strategy.order)`));
  check('刷新后顺序保留', JSON.stringify(afterReload) === JSON.stringify(saved), `${afterReload}`);

  // 5) 恢复默认
  await ev(`(()=>{window.__game.bv && window.__game.bv.stop && window.__game.bv.stop(); document.querySelector('[data-group=team]').click(); return 1;})()`);
  await sleep(600);
  await ev(`(()=>{const d=document.querySelector('.advbox'); if(d) d.open=true; return 1;})()`);
  await sleep(300);
  await click('[data-act="order-reset"]');
  await sleep(500);
  const ord2 = JSON.parse(await orderOf());
  const team2 = JSON.parse(await teamOf());
  check('恢复默认', JSON.stringify(ord2) === JSON.stringify(team2), `${ord2}`);
  check('摘要标已消失', (await ev(`!!document.querySelector('.advbox summary .new')`)) === false);

  // 6) 顺序真的影响出手：跑两场同一 seed 的战斗
  const cmp = await ev(`(async()=>{
    const B = await import('./src/core/battle.js');
    const G = await import('./src/core/game.js');
    const g = window.__game, s = g.state;
    const p = G.prepareBattle(s, g.data, 30);
    const a = B.simulate({ allies: p.allies, enemies: p.enemies, seed: 77, strategy: { order: [] }, maxRounds: 18 });
    const rev = [...p.allies].reverse().map(d=>d.slug);
    const b = B.simulate({ allies: p.allies, enemies: p.enemies, seed: 77, strategy: { order: rev }, maxRounds: 18 });
    const seq = (r) => { let round=0; const out=[]; for(const e of r.events){ if(e.k==='round'){round=e.n;continue;} if(round===1&&e.k==='act'&&String(e.who).startsWith('a')) out.push(e.who);} return out; };
    return JSON.stringify({ def: seq(a), rev: seq(b), revOrder: rev });
  })()`);
  const c = JSON.parse(cmp);
  check('默认按站位出手', JSON.stringify(c.def) === JSON.stringify(['a0', 'a1', 'a2', 'a3']), `${c.def}`);
  check('反转后按新顺序出手', JSON.stringify(c.rev) === JSON.stringify(['a3', 'a2', 'a1', 'a0']), `${c.rev}`);

  console.log('\n结果:', checks.filter((x) => x.ok).length + '/' + checks.length);
  console.log(errs.length ? '页面报错:\n' + errs.join('\n') : '无 JS 报错');
  ws.close(); proc.kill(); process.exit(0);
})().catch((e) => { console.log('脚本失败', e.message); process.exit(1); });
