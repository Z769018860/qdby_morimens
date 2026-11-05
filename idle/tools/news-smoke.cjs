// 游戏内更新公告：UI 冒烟（Edge headless + 手写 CDP）
// 1) 老玩家进游戏会不会弹最新公告  2) 弹的内容是不是最新版本  3) 设置页能翻历史
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9347;
const URL_BASE = 'http://127.0.0.1:8799/index.html';
const OUT = 'H:/Temp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const profile = 'H:/Temp/edgeprof-news-' + Date.now();
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
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

  const boot = async () => {
    await send('Page.navigate', { url: URL_BASE });
    let up = false;
    for (let i = 0; i < 80 && !up; i++) { await sleep(500); try { up = await ev('!!(window.__game && window.__game.state && window.__game.data)'); } catch { /* boot */ } }
    return up;
  };

  if (!(await boot())) { console.log('启动超时'); ws.close(); proc.kill(); process.exit(1); }
  await sleep(1500);
  await ev(`(()=>{const b=document.querySelector('[data-gskip]'); if(b) b.click(); return 1;})()`);
  await ev(`(()=>{window.__game.bv && window.__game.bv.stop && window.__game.bv.stop(); document.querySelectorAll('.modal-bg').forEach(m=>m.remove()); return 1;})()`);

  // 让存档看起来「玩过」，并且把已读清空 —— 等于老玩家更新后第一次进游戏
  await ev(`(()=>{const g=window.__game; g.state.newsSeen=''; g.state.guide=1; g.hadSave=true; g.save(); return g.state.newsSeen;})()`);

  // 2) 重新进游戏，等公告自己弹出来
  if (!(await boot())) { console.log('二次启动超时'); ws.close(); proc.kill(); process.exit(1); }
  let popped = false;
  for (let i = 0; i < 24 && !popped; i++) { await sleep(500); popped = await ev(`!!document.querySelector('.news-modal')`); }
  await sleep(600);
  const modalText = await ev(`document.querySelector('.news-modal').innerText`);
  check('老玩家进游戏自动弹出公告', popped);
  check('弹出的是最新一条 0.16.2', modalText.includes('0.16.2'));
  check('新内容在公告里（高级设置 · 行动顺序）', modalText.includes('高级设置'));
  check('守关页排版修复也写进公告', modalText.includes('逆潮守关界面'));
  check('公告里没有开发者术语', !/回归测试|策略对象|undefined/.test(modalText));
  check('弹窗最多最近 3 条（不把 0.12.x 的老公告也糊上来）', !modalText.includes('流血改时序'));
  await shot('s_news_popup.png');
  check('弹出即记已读', (await ev(`window.__game.state.newsSeen`)) === '2026-11-05c');

  // 2.5) 弹窗里就地展开「往期公告」
  check('弹窗里有「往期公告」折叠入口', await ev(`!!document.querySelector('.news-modal .newspast')`));
  check('默认收起', (await ev(`!!document.querySelector('.newspast').open`)) === false);
  const sumText = await ev(`document.querySelector('.newspast>summary').innerText`);
  check('折叠标题写明还有几条', /往期公告/.test(sumText) && /更早的 \d+ 条/.test(sumText), sumText.replace(/\s+/g, ' '));
  await ev(`document.querySelector('.newspast>summary').click()`);
  await sleep(400);
  check('点开后就地展开', (await ev(`!!document.querySelector('.newspast').open`)) === true);
  const pastText = await ev(`document.querySelector('.newspast .news').innerText`);
  check('往期里能看到更老的公告（0.12.x）', pastText.includes('0.12.11') || pastText.includes('流血改时序'));
  check('往期条目不是空壳（展开后条数 = 标题里的数字）', (await ev(`document.querySelectorAll('.newspast .news-item').length`)) === Number((sumText.match(/更早的 (\d+) 条/) || [])[1] || 0));
  check('展开后「知道了」仍在', await ev(`!!document.querySelector('[data-act=news-ok]')`));
  await ev(`(()=>{const b=document.querySelector('.news-modal .modal-body'); b.scrollTop = b.scrollHeight; return b.scrollHeight;})()`);
  await sleep(300);
  await shot('s_news_past.png');

  // 3) 设置页 → 更新公告，历史能翻到
  await ev(`(()=>{document.querySelectorAll('.modal-bg').forEach(m=>m.remove()); const g=document.querySelector('[data-group=more]'); if(g) g.click(); return 1;})()`);
  await sleep(500);
  await ev(`(()=>{const s=document.querySelector('[data-sub=settings]'); if(s) s.click(); return 1;})()`);
  await sleep(600);
  const hasBtn = await ev(`!!document.querySelector('[data-act=news]')`);
  check('设置页有「查看更新公告」入口', hasBtn);
  if (hasBtn) {
    await ev(`document.querySelector('[data-act=news]').click()`);
    await sleep(500);
    const all = await ev(`document.querySelector('.news').innerText`);
    check('历史公告里 0.16.0 / 0.16.1 / 0.16.2 都在', ['0.16.2', '0.16.1', '0.16.0'].every((v) => all.includes(v)));
    check('历史里有「逆潮守关」新玩法', all.includes('逆潮守关'));
    check('设置页是完整列表（不再套一层折叠）', !(await ev(`!!document.querySelector('.newspast')`)));
    await shot('s_news_history.png');
  }
  check('全程无 JS 报错', errs.length === 0, errs[0] || '');

  const bad = checks.filter((c) => !c.ok).length;
  console.log(`\n${checks.length - bad}/${checks.length} 通过`);
  ws.close(); proc.kill();
  process.exit(bad ? 1 : 0);
})();
