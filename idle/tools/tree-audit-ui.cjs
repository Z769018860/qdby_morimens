// 红流树海定向审计（不依赖 playwright：系统 Edge headless + 手写 CDP）。
// 只审计用户点名的三块：难度切换、天赋树、行囊。用法：先起 8799 静态服务器，再 node tools/tree-audit-ui.cjs
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9334;
const URL_BASE = 'http://127.0.0.1:8799/index.html';
const OUT = 'H:/Temp';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = [], bad = [];
const check = (name, cond, extra = '') => (cond ? ok : bad).push(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? '　' + extra : ''}`);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = 'H:/Temp/edgeprof-ta-' + Date.now();
  const proc = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--hide-scrollbars',
    '--window-size=430,940', 'about:blank',
  ], { stdio: 'ignore' });
  // 临时配置目录（每个几百 MB）用完就删：以前只创建不清理，跑几十次临时盘就被 edgeprof-* 堆满。
  // 先 taskkill 连子进程一起收（只 kill 父进程的话，Edge 的子进程还会捏着目录句柄，删不掉）。
  const dropProfile = () => {
    try { if (process.platform === 'win32') require('child_process').spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已经退了 */ }
    try { proc.kill(); } catch { /* 已经退了 */ }
    try { require('fs').rmSync(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 }); } catch { /* 还是删不掉就留给系统 */ }
  };
  process.on('exit', dropProfile);

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
  const clearModals = () => ev(`(()=>{const ms=[...document.querySelectorAll('.modal-bg')]; ms.forEach((m)=>m.remove()); return ms.length;})()`);
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64'));
  };

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: URL_BASE });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await sleep(500);
    try { up = await ev('!!(window.__game && window.__game.state && window.__game.data)'); } catch { /* 等 ready */ }
  }
  console.log('启动', up ? 'ok' : '超时');
  if (!up) { await shot('s_ta_boot_fail.png'); console.log(errs.join('\n') || 'no errors'); ws.close(); proc.kill(); process.exit(1); }
  await sleep(1000);
  await ev(`(()=>{const b=document.querySelector('[data-gskip]'); if(b){b.click(); return 1;} return 0;})()`);
  await sleep(500);
  await ev(`(()=>{window.__game.bv && window.__game.bv.stop && window.__game.bv.stop(); return 1;})()`);
  await clearModals();

  /* ============ 一、进树海主页 ============ */
  await click('[data-group=challenge]');
  await sleep(400);
  await click('[data-sub=tree]');
  await sleep(800);
  const diffCount = await ev(`document.querySelectorAll('.lkdiff').length`);
  check('难度卡渲染', diffCount === 5, `实际 ${diffCount} 张`);
  check('标题是红流树海', await ev(`document.body.textContent.includes('红流树海') && !document.querySelector('.page h2').textContent.includes('黑流')`));

  /* ============ 二、难度切换：逐档开募队弹窗，验证标题跟着变 ============ */
  const diffs = await ev(`Array.from(document.querySelectorAll('.lkdiff button[data-act="tree-open-draft"]')).map(b=>b.dataset.k)`);
  for (const k of diffs) {
    await click(`.lkdiff button[data-act="tree-open-draft"][data-k="${k}"]`);
    await sleep(350);
    const title = await ev(`(document.querySelector('.modal h3 small')||{}).textContent || ''`);
    const depart = await ev(`(()=>{const b=document.querySelector('[data-act="tree-depart"]'); return b? b.textContent : 'none';})()`);
    check(`难度 ${k} 弹窗`, title.includes(k === 'whisper' ? '低语' : k === 'shade' ? '树影' : k === 'root' ? '深根' : k === 'heart' ? '红流之心' : '微光'), `标题[${title}] 出发[${depart}]`);
    await click('[data-act="tree-draft-clear"]').catch(() => {});
    await clearModals();
    await sleep(200);
  }
  await shot('s_ta_diffs.png');

  /* ============ 三、选难度出发 → 弃局 → 换另一档难度再出发（核心：切难度不被上一局卡死） ============ */
  // 新档名册是空的，塞几个低 rarity 角色，黑露才有人可募；顺手给黑露和天赋点
  await ev(`(()=>{const g=window.__game; const s=g.state; s.gold=(s.gold||0)+3000;
    const cheap=g.data.awakeners.filter(a=>a.rarity==='R'||a.rarity==='SR').slice(0,8);
    for(const a of cheap) s.roster[a.slug]={lv:50,star:0,brk:3};
    const t=s.tree; t.tp=(t.tp||0)+3; g.save(); return cheap.length;})()`);
  console.log('名册', await ev(`Object.keys(window.__game.state.roster).length`), 'data.awakeners', await ev(`(window.__game.data.awakeners||[]).length`));
  await click('.lkdiff button[data-act="tree-open-draft"][data-k="whisper"]');
  await sleep(400);
  // 募两个人
  console.log('toggle 按钮', await ev(`document.querySelectorAll('[data-act="tree-draft-toggle"]').length`), '其中可点', await ev(`[...document.querySelectorAll('[data-act="tree-draft-toggle"]')].filter(x=>!x.disabled).length`));
  for (let i = 0; i < 2; i++) {
    const step = await ev(`(()=>{const b=[...document.querySelectorAll('[data-act="tree-draft-toggle"]')].find(x=>!x.disabled && !x.classList.contains('relic')); if(b){b.click(); return b.dataset.s;} return 'none';})()`);
    await sleep(300);
    console.log(`toggle#${i}`, step, '→ team', await ev(`window.__game.ui.treeDraft? window.__game.ui.treeDraft.team.length : 'draft-gone'`), 'modals', await ev(`document.querySelectorAll('.modal-bg').length`));
  }
  const teamN = await ev(`(()=>{const d=window.__game.ui.treeDraft; return d? d.team.length : -1;})()`);
  check('募队选人', teamN === 2, `选了 ${teamN} 人`);
  const diffInDraft = await ev(`(()=>{const d=window.__game.ui.treeDraft; return d? d.diff : 'none';})()`);
  check('弹窗难度=所选难度', diffInDraft === 'whisper', diffInDraft);
  await click('[data-act="tree-depart"]');
  await sleep(800);
  const runDiff1 = await ev(`(()=>{const t=window.__game.state.tree; return t&&t.cur? t.cur.diff : 'none';})()`);
  check('低语出发', runDiff1 === 'whisper', `run.diff=${runDiff1}`);
  await shot('s_ta_run1.png');
  // 弃局
  await ev(`(()=>{window.confirm=()=>true; return 1;})()`); // 静默确认
  await click('[data-act="tree-abandon"]').catch(() => {});
  await sleep(1200);
  const hasEnd = await ev(`!!document.querySelector('.modal h3')`);
  console.log('弃局后弹窗', hasEnd, await ev(`(document.querySelector('.modal h3')||{}).textContent`));
  await clearModals();
  await sleep(300);
  const curAfter = await ev(`(()=>{const t=window.__game.state.tree; return t&&t.cur? 'still-running' : 'cleared';})()`);
  check('弃局后回到主页', curAfter === 'cleared', curAfter);
  // 换一档难度再出发
  await click('.lkdiff button[data-act="tree-open-draft"][data-k="heart"]');
  await sleep(400);
  for (let i = 0; i < 2; i++) {
    await ev(`(()=>{const b=[...document.querySelectorAll('[data-act="tree-draft-toggle"]')].find(x=>!x.disabled && !x.classList.contains('relic')); if(b){b.click(); return 1;} return 0;})()`);
    await sleep(250);
  }
  await click('[data-act="tree-depart"]');
  await sleep(800);
  const runDiff2 = await ev(`(()=>{const t=window.__game.state.tree; return t&&t.cur? t.cur.diff : 'none';})()`);
  check('弃局后能切红流之心', runDiff2 === 'heart', `run.diff=${runDiff2}`);
  const diffZh = await ev(`document.querySelector('.page h2 small') ? document.querySelector('.page h2 small').textContent : ''`);
  check('局内难度标签正确', (diffZh || '').includes('红流之心'), diffZh);
  // 弃掉第二局，保持存档干净
  await ev(`(()=>{window.confirm=()=>true; return 1;})()`);
  await click('[data-act="tree-abandon"]').catch(() => {});
  await sleep(1000);
  await clearModals();

  /* ============ 四、天赋树：给点 → UI 点一级 → 面板与生效检查 ============ */
  await ev(`(()=>{const t=window.__game.state.tree; t.tp=(t.tp||0)+2; window.__game.save(); return t.tp;})()`);
  // 强制重渲染：上面只改了存档，页面上的按钮还是旧的禁用态
  await click('[data-group=battle]').catch(() => {});
  await sleep(250);
  await click('[data-group=challenge]');
  await sleep(250);
  await click('[data-sub=tree]');
  await sleep(500);
  // 找一支能点的天赋按钮
  const tal = await ev(`(()=>{const b=[...document.querySelectorAll('[data-act="tree-talent"]')].find(x=>!x.disabled); return b? b.dataset.id : 'none';})()`);
  await click(`[data-act="tree-talent"][data-id="${tal}"]`).catch(() => {});
  await sleep(400);
  const lvAfter = await ev(`(()=>{const t=window.__game.state.tree; return (t.talents&&t.talents[${JSON.stringify(tal)}])||0;})()`);
  check('天赋点一级', lvAfter === 1, `${tal} → ${lvAfter}`);
  // 再点一级验证累加
  await click(`[data-act="tree-talent"][data-id="${tal}"]`).catch(() => {});
  await sleep(300);
  const lvAfter2 = await ev(`(()=>{const t=window.__game.state.tree; return (t.talents&&t.talents[${JSON.stringify(tal)}])||0;})()`);
  check('天赋再点一级', lvAfter2 === 2, `${tal} → ${lvAfter2}`);
  // 满级/没点禁用状态
  const disabledOk = await ev(`(()=>{const b=[...document.querySelectorAll('[data-act="tree-talent"]')]; return b.some(x=>x.disabled);})()`);
  check('有禁用状态的天赋按钮', disabledOk);
  await shot('s_ta_talent.png');

  /* ============ 五、行囊：结算带走 → 主页可见 → 新局仓库面板带上 → 取用不消耗 ============ */
  const carryN = await ev(`(async()=>{ const m=await import('./src/core/treerun.js');
    const g=window.__game; const s=g.state; const T=m;
    const run={ gear:{ pool:[{uid:'u1',defId:T.TREE_GEAR[0].id},{uid:'u2',defId:T.TREE_GEAR[1].id}] }, relics:[T.TREE_RELICS[0].id] };
    const carry=T.carryOptions(run);
    s.tree.lastRun={ carry, stashed:null, win:true, score:260, act:2, pool:4, gear:3, bless:2, enh:2, at:Date.now() };
    g.save(); return carry.length; })()`);
  check('结算候选>=2', carryN >= 2, `候选 ${carryN}`);
  // 直接驱动 UI：把结算弹窗画出来（treeEndModal 走 lastRun）
  await ev(`(async()=>{ const m=await import('./src/ui/tree.js'); m.treeEndModal(window.__game, window.__game.state.tree.lastRun); return 1; })()`);
  await sleep(400);
  check('结算弹窗有行囊区块', await ev(`document.body.textContent.includes('带一件回去')`));
  await click('[data-act="tree-stash-put"]');
  await sleep(500);
  check('结算带走一件', await ev(`(window.__game.state.tree.stash||[]).length`) === 1);
  const putR = await ev(`(async()=>{ const m=await import('./src/core/treerun.js'); const g=window.__game;
    const r=m.stashPut(g.state, g.state.tree.lastRun.carry[1].key); return r.err||'ok'; })()`);
  check('第二件被拒（一趟限一件）', putR !== 'ok', putR);
  // 回主页看行囊卡
  await click('.modal .btn.gold').catch(() => {});
  await sleep(400);
  check('主页行囊卡显示', await ev(`document.body.textContent.includes('跨局保留')`));
  await shot('s_ta_stash_home.png');
  // 新局 → 仓库面板带上
  await click('.lkdiff button[data-act="tree-open-draft"][data-k="whisper"]');
  await sleep(400);
  for (let i = 0; i < 2; i++) {
    await ev(`(()=>{const b=[...document.querySelectorAll('[data-act="tree-draft-toggle"]')].find(x=>!x.disabled && !x.classList.contains('relic')); if(b){b.click(); return 1;} return 0;})()`);
    await sleep(250);
  }
  await click('[data-act="tree-depart"]');
  await sleep(900);
  check('第三局出发成功', await ev(`(()=>{const t=window.__game.state.tree; return t&&t.cur? t.cur.diff : 'none';})()`) === 'whisper');
  // 出发后回的是局内页面，仓库面板要自己打开（真实流程也是点「仓库」按钮）
  check('局内有仓库按钮', await ev(`!!document.querySelector('[data-act="tree-depot"]')`));
  await click('[data-act="tree-depot"]');
  await sleep(600);
  check('仓库面板有行囊入口', await ev(`!!document.querySelector('[data-act="tree-bag-take"]')`));
  check('行囊按钮未禁用', await ev(`(()=>{const b=document.querySelector('[data-act="tree-bag-take"]'); return b&&!b.disabled;})()`));
  await click('[data-act="tree-bag-take"]');
  await sleep(500);
  check('带上后 bagUsed=true', await ev(`(()=>{const t=window.__game.state.tree; return t.cur? t.cur.bagUsed : 'no-run';})()`) === true);
  check('取用不消耗行囊', await ev(`(window.__game.state.tree.stash||[]).length`) === 1);
  check('按钮变禁用', await ev(`(()=>{const b=document.querySelector('[data-act="tree-bag-take"]'); return b&&b.disabled;})()`));
  check('道具真的进了这一局的仓库', await ev(`(()=>{const run=window.__game.state.tree.cur; return !!(run.gear&&run.gear.pool.length)||!!(run.relics&&run.relics.length);})()`));
  await shot('s_ta_stash_take.png');
  // 弃局收尾
  await ev(`(()=>{window.confirm=()=>true; return 1;})()`);
  await click('[data-act="tree-abandon"]').catch(() => {});
  await sleep(900);
  await clearModals();

  console.log('\n===== 结果 =====');
  ok.forEach((l) => console.log(l));
  bad.forEach((l) => console.log(l));
  console.log(`通过 ${ok.length} / ${ok.length + bad.length}`);
  console.log(errs.length ? 'JS 错误：\n' + errs.join('\n') : '全程零 JS 报错');
  ws.close();
  proc.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.log('FAIL', e.message); bad.forEach((l) => console.log(l)); process.exit(1); });
