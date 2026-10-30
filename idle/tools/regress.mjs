// 无头回归：用 Edge 的 CDP 跑一遍 16 个页面，检查报错 / 4xx，
// 以及 M10 的三处新交互（命轮密契页换装 / 一键配队 / 手动挂机不推进）。
// 用法：node tools/regress.mjs [http://127.0.0.1:8777/index.html]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL0 = process.argv[2] || 'http://127.0.0.1:8777/index.html';
// 每次换一个随机端口：上一轮要是异常退出留下了无头实例，固定端口会让新实例连不上，
// 报出来的却是「页面没起来」这种驴唇不对马嘴的错。
const PORT = 9330 + Math.floor(Math.random() * 200);
const OUT = process.env.SHOT_DIR || join(tmpdir(), 'qdby-shots');
mkdirSync(OUT, { recursive: true });

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) { console.error('找不到 Edge/Chrome'); process.exit(1); }

// 无头 Edge 会派生子进程，只 kill 父进程会留一堆孤儿；用 taskkill /T 连子树一起收，
// 并且挂在 exit 上——脚本中途抛错也要收干净，否则下次跑会被旧实例的端口挡住。
const cleanup = () => {
  try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* 已经退了 */ }
  try { child.kill(); } catch { /* 已经退了 */ }
};
process.on('exit', cleanup);
process.on('SIGINT', () => { cleanup(); process.exit(130); });

const prof = mkdtempSync(join(tmpdir(), 'edgeprof-'));
const child = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=430,932', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function targetWs() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = j.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('CDP 没起来');
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map();
    this.logs = []; this.runtime = []; this.http = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); return; }
      if (m.method === 'Runtime.exceptionThrown') this.runtime.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
      if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
        const txt = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        if (!/navigator\.vibrate|AudioContext/i.test(txt)) this.runtime.push('CE ' + txt);
      }
      if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/favicon/.test(m.params.entry.url || '')
        && !/navigator\.vibrate/i.test(m.params.entry.text || '')) this.logs.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
      if (m.method === 'Network.responseReceived') { const r = m.params.response; if (r.status >= 400 && !/favicon/.test(r.url)) this.http.push(`${r.status} ${r.url}`); }
      if (m.method === 'Network.loadingFailed' && !/ERR_ABORTED/.test(m.params.errorText || '')) this.http.push(`FAIL ${m.params.errorText} ${m.params.type}`);
    };
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async evalIife(code) {
    const r = await this.send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
  async shot(name) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  }
  async boot(url) {
    // 偶发：上一个无头实例刚退、或本地静态服务还在收尾时，首次导航会撞上连接被拒。
    // 重试一次再判死，并把收集到的报错一起抛出来，别只丢一句「__game 未定义」。
    for (let tryNo = 0; tryNo < 2; tryNo++) {
      await this.send('Page.navigate', { url });
      for (let i = 0; i < 70; i++) {
        try { if ((await this.evalIife('typeof window.__game')) === 'object') { await sleep(500); return; } } catch { /* 还在导航 */ }
        await sleep(300);
      }
      this.http.length = 0; this.logs.length = 0;
    }
    const why = [...this.runtime.slice(0, 4), ...this.http.slice(0, 4)].join('\n  ');
    throw new Error('页面没起来：__game 未定义' + (why ? '\n  ' + why : ''));
  }
}

const ws = new WebSocket(await targetWs());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
const cdp = new CDP(ws);
await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable'); await cdp.send('Network.enable');

const fails = [];
const check = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${msg}`); if (!ok) fails.push(msg); };

const HELPERS = `
  window.__go = (tab) => {
    const G = { battle: 'battle', team: 'team', roster: 'team', gear: 'team', orders: 'team', summon: 'summon',
      challenge: 'challenge', weekly: 'challenge', rtower: 'challenge', arena: 'challenge', rift: 'challenge',
      signin: 'more', event: 'more', codex: 'more', ach: 'more', settings: 'more' };
    document.querySelector('[data-group="' + G[tab] + '"]').click();
    const sub = document.querySelector('[data-sub="' + tab + '"]');
    if (sub) sub.click();
    return tab;
  };
  window.__view = () => (document.querySelector('#view').hidden ? document.querySelector('#battle') : document.querySelector('#view'));
  window.__closeModal = () => { const x = document.querySelector('.modal-x'); if (x) x.click(); return !!x; };
  true;
`;

// 先把「结算弹窗」关掉，否则无头环境里没人点关闭，战斗链会停住
await cdp.boot(URL0);
await cdp.evalIife(`localStorage.setItem('morimens-idle-settle', 'off')`);
await cdp.boot(URL0);
await cdp.evalIife(`(() => { const s = __game.state; s.skipAnim = true; s.speed = 16; return 1; })()`);
await cdp.evalIife(HELPERS);
// 首进会弹新手引导（boot 后 420ms 才挂上去），等它出来再跳过，免得挡住截图和点击
await sleep(900);
await cdp.evalIife(`(() => {
  __game.state.guide = 1; __game.state.tutorial = true;
  const b = document.querySelector('[data-gskip]'); if (b) b.click();
  document.querySelectorAll('.guide-bg,.guide-box,.guide-pop').forEach((n) => n.remove());
  return !!b;
})()`);

// 1) 16 个页面都能渲染
const TABS = ['battle', 'team', 'roster', 'gear', 'orders', 'summon', 'challenge', 'rift', 'weekly', 'rtower', 'arena', 'signin', 'event', 'codex', 'ach', 'settings'];
const rendered = await cdp.evalIife(`(() => {
  const out = [];
  for (const t of ${JSON.stringify(TABS)}) {
    try { window.__go(t); out.push([t, (window.__view().innerText || '').trim().length]); }
    catch (e) { out.push([t, -1]); }
  }
  return out;
})()`);
const blank = rendered.filter(([, n]) => !(n > 100)).map(([t, n]) => `${t}(${n})`);
check(blank.length === 0, `16 个页面都有内容${blank.length ? '，可疑：' + blank.join(', ') : ''}`);

// 2) 先抽一批装备（真实路径：召唤页的祈愿），后面配队才有货可用
const pulled = await cdp.evalIife(`(() => {
  const s = __game.state;
  s.gold = 4000000; s.cores = 4000000;
  window.__go('summon');
  const before = Object.keys(s.gear.items).length;
  let guard = 0;
  while (Object.keys(s.gear.items).length - before < 60 && guard++ < 40) {
    const b = document.querySelector('[data-act="epull"][data-n="5"]') || document.querySelector('[data-act="epull"]');
    if (!b) break;
    b.click(); window.__closeModal();
  }
  return { items: Object.keys(s.gear.items).length - before, guard };
})()`);
check(pulled.items >= 40, `祈愿抽到 ${pulled.items} 件装备（${pulled.guard} 次点击）`);

// 3) 命轮密契页：4 人槽位 + 点槽位换装
await cdp.evalIife(`window.__go('gear')`);
await sleep(250);
const gearInfo = await cdp.evalIife(`(() => {
  const v = window.__view();
  return {
    who: v.querySelectorAll('.eqrow .eqwho').length,
    slots: v.querySelectorAll('.eqslot').length,
    title: (v.querySelector('h2')?.innerText || '').replace(/\\s+/g, ' ').trim(),
    hint: (v.querySelector('.hint')?.innerText || '').slice(0, 30),
  };
})()`);
check(gearInfo.title.includes('命轮') && gearInfo.title.includes('密契'), `装备页标题：${gearInfo.title}`);
check(gearInfo.who === 4 && gearInfo.slots >= 8, `${gearInfo.who} 名队员 / ${gearInfo.slots} 个命轮·密契槽位`);

const slotSwap = await cdp.evalIife(`(() => {
  const btn = window.__view().querySelector('.eqslot[data-kind="wheel"]');
  if (!btn) return { err: '没找到命轮槽位' };
  const slug = btn.dataset.slug, s = __game.state;
  const before = s.gear.equip[slug]?.wheel || null;
  btn.click();
  const modal = document.querySelector('.modal');
  const cand = modal ? modal.querySelectorAll('.item').length : 0;
  // 选第一个候选，验证换装真的写进 state.gear.equip
  const pick = [...modal.querySelectorAll('[data-pick]')].find((b) => b.dataset.pick);
  if (pick) pick.click();
  return { slug, modal: !!modal, cand, before, after: s.gear.equip[slug]?.wheel || null };
})()`);
check(!slotSwap.err && slotSwap.modal && slotSwap.cand > 0, `点 ${slotSwap.slug} 的命轮槽位弹出 ${slotSwap.cand} 个候选`);
check(slotSwap.after && slotSwap.after !== slotSwap.before, `选中后直接换成另一件命轮（${slotSwap.before} → ${slotSwap.after}）`);
await cdp.shot('gear');

// 4) 一键配队
await cdp.evalIife(`window.__go('team')`);
await sleep(250);
const teamOut = await cdp.evalIife(`(() => {
  document.querySelector('[data-act="autoteam"]').click();
  const s = __game.state;
  const t = document.querySelector('.toast');
  const eq = s.team.map((x) => s.gear.equip[x] || {});
  const v = window.__view();
  const heads = [...v.querySelectorAll('h3')].map((h) => h.innerText.replace(/\\s+/g, ' ').trim());
  return {
    toast: t ? t.textContent : '',
    team: s.team.length,
    wheels: eq.filter((e) => e.wheel).length,
    covs: eq.filter((e) => e.cov).length,
    relics: (s.gear.relics || []).filter(Boolean).length,
    orders: (s.orders.slots || []).filter(Boolean).length,
    heads,
    slots: v.querySelectorAll('.eqpanel .eqslot').length,
    filled: v.querySelectorAll('.eqpanel .eqslot.on').length,
  };
})()`);
check(/一键配队完成/.test(teamOut.toast), `toast：${teamOut.toast}`);
check(teamOut.team === 4 && teamOut.wheels === 4 && teamOut.covs === 4,
  `一键配队：队伍 ${teamOut.team} 人 / 命轮 ${teamOut.wheels} / 密契 ${teamOut.covs}`);
check(teamOut.relics > 0 && teamOut.orders > 0, `造物 ${teamOut.relics} 件 / 钥令 ${teamOut.orders} 个`);
check(teamOut.heads.some((h) => h.includes('命轮') && h.includes('密契')), `队伍页有命轮·密契区块：${teamOut.heads.join(' | ')}`);
check(teamOut.slots === 8 && teamOut.filled === 8, `队伍页槽位 ${teamOut.slots} 格 / 已装 ${teamOut.filled} 格`);
await cdp.shot('team');
// 往下滚一屏，把命轮 · 密契面板整块拍下来
await cdp.evalIife(`(() => { window.__view().querySelector('.eqpanel')?.scrollIntoView({ block: 'start' }); return 1; })()`);
await sleep(300);
await cdp.shot('team-gear');

// 5) 钥令页：原作图标真的加载出来了（lazy 图得先滚进视口）
await cdp.evalIife(`window.__go('orders')`);
await sleep(300);
const ordersInfo = await cdp.evalIife(`(async () => {
  const v = window.__view();
  const imgs = [...v.querySelectorAll('.oglyph img')];
  for (const i of imgs) i.loading = 'eager';
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 1500));
  return { n: imgs.length, loaded: imgs.filter((i) => i.naturalWidth > 0).length, src: imgs[0]?.getAttribute('src') || '' };
})()`);
check(ordersInfo.n > 0 && ordersInfo.loaded === ordersInfo.n,
  `钥令图标 ${ordersInfo.loaded}/${ordersInfo.n} 张加载成功（${ordersInfo.src}）`);
await cdp.shot('orders');

// 6) 手动挂机：横幅出现、关卡不再往前推
// maxStage 抬到 14，让第 12 关不是首通，横幅里才会出现「留在第 12 关继续挂机」
await cdp.evalIife(`(() => { const s = __game.state;
  for (const k of Object.keys(s.roster)) s.roster[k].lv = 80;
  s.maxStage = Math.max(s.maxStage, 14); s.stage = 12; s.auto = true; window.__go('battle'); })()`);
await sleep(500);
const manual = await cdp.evalIife(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('#bv-auto').click();           // 切到手动挂机
  const s = __game.state;
  await wait(500);
  const note = (document.querySelector('.manual-note')?.innerText || '').replace(/\\s+/g, ' ');
  const stage0 = s.stage, b0 = s.stats.battles;
  // 等「真打完 2 场」而不是死等 12 秒：机器负载高时一场能拖到七八秒，死等会误判成 0 场
  const t0 = Date.now();
  while (s.stats.battles - b0 < 2 && Date.now() - t0 < 30000) await wait(400);
  return { auto: s.auto, note, stage0, stage1: s.stage,
    fought: s.stats.battles - b0, label: document.querySelector('#bv-auto')?.textContent || '',
    banner: (document.querySelector('#bv-rw')?.innerText || '').replace(/\\s+/g, ' ') };
})()`);
check(manual.auto === false && /停在第 12 关/.test(manual.note),
  `手动挂机提示条：${manual.note.slice(0, 56)}…`);
check(manual.fought > 0 && manual.stage1 === manual.stage0,
  `${manual.fought} 场之后关卡没被推进（${manual.stage0} → ${manual.stage1}）`);
check(manual.label === '手动挂机', `按钮文案：${manual.label}`);
check(/留在第 12 关继续挂机/.test(manual.banner), `结算横幅：${manual.banner.slice(0, 40) || '(空)'}`);
await cdp.shot('manual');

// 7) 切回自动：横幅消失、又能往前推
const back = await cdp.evalIife(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('#bv-auto').click();
  const s = __game.state; const from = s.stage;
  await wait(12000);
  return { auto: s.auto, from, to: s.stage, note: document.querySelector('.manual-note') ? 1 : 0 };
})()`);
check(back.auto === true && back.note === 0, `切回自动挂机：提示条消失，关卡 ${back.from} → ${back.to}`);

// 7b) 挂机收益：券/银芯的关数加成随关卡提升（面板上真的看得见）
const farm = await cdp.evalIife(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const s = __game.state;
  for (const k of Object.keys(s.roster)) s.roster[k].lv = 90;
  const read = () => {
    const t = (document.querySelector('.farmc .farmbst')?.innerText || '').replace(/\\s+/g, ' ');
    const per = +(t.match(/(\\d+) 场 1 张/) || [])[1];
    const core = +(t.match(/(\\d+) 场 1 枚/) || [])[1];
    return { note: t, per, core };
  };
  s.maxStage = 80; s.stage = 6; __game.bv.refreshHead(); await wait(400);
  const lo = read();
  s.stage = 70; __game.bv.refreshHead(); await wait(400);
  const hi = read();
  return { lo, hi };
})()`);
check(/关数加成/.test(farm.lo.note), `收益面板关数加成：${farm.lo.note.slice(0, 60)}`);
check(farm.lo.per > farm.hi.per && farm.lo.core > farm.hi.core,
  `挂机越深越值钱：券 ${farm.lo.per} → ${farm.hi.per} 场 1 张、银芯 ${farm.lo.core} → ${farm.hi.core} 场 1 枚`);
await cdp.shot('farm');

// 8) 编队：存两套 → 挑战页给周 Boss 指定其中一套
const squad = await cdp.evalIife(`(() => {
  const s = __game.state;
  window.__go('team');
  // 队伍页现在是标签页，编队卡片在「编队库」那一栏里
  const tabs = document.querySelectorAll('.ttab').length;
  document.querySelector('.ttab[data-k="squads"]').click();
  const cur = s.team.slice();
  document.querySelector('[data-act="squad-save"][data-k="a"]').click();
  const a = (s.squads.a.team || []).slice();
  // 换掉一个人再存「二队」，让两队确实不一样（新存档只有 4 个初始唤醒体，先补一个）
  let spare = Object.keys(s.roster).find((x) => !cur.includes(x));
  if (!spare) {
    spare = Object.keys(__game.data.bySlug).find((x) => !cur.includes(x));
    s.roster[spare] = { lv: 60, star: 2, brk: 2 };
  }
  const mixed = cur.slice();
  if (spare) mixed[3] = spare;
  s.team = mixed;
  document.querySelector('[data-act="squad-save"][data-k="b"]').click();
  const b = (s.squads.b.team || []).slice();
  window.__go('weekly');
  const bar = document.querySelectorAll('.squadbar').length;
  document.querySelector('[data-act="squad-pick"][data-mode="weekly"][data-k="a"]').click();
  const on = document.querySelectorAll('.sqchip.on').length;
  return { cur, a, b, tabs, different: a.join() !== b.join(), pick: s.squadPick.weekly, on, bar,
    note: (document.querySelector('.sqchip.on')?.innerText || '').replace(/\\s+/g, ' ') };
})()`);
check(squad.tabs === 7, `队伍页标签 ${squad.tabs} 个（主线 / 无限塔 / 融灾禁区 / 周Boss / 属性塔 / 竞技场 / 编队库）`);
check(squad.a.length === 4 && squad.different, `编队：一队 ${squad.a.length} 人 · 二队与一队不同（${squad.a.join('>')} / ${squad.b.join('>')}）`);
check(squad.bar >= 1 && squad.pick === 'a' && squad.on >= 1, `周 Boss 出战阵容切到「${squad.note}」（${squad.on} 个选中）`);
await cdp.shot('squad');
// 再回队伍页确认编队卡片上写了「挑战在用」
const usage = await cdp.evalIife(`(() => {
  window.__go('team');
  document.querySelector('.ttab[data-k="squads"]').click();
  const card = document.querySelector('.squad[data-squad="a"]');
  return { cards: document.querySelectorAll('.squad').length, use: (card?.querySelector('.squse')?.innerText || '') };
})()`);
check(usage.cards === 10 && /周Boss/.test(usage.use), `编队库 10 套（通用 5 + 禁区 5），一队标注「${usage.use}」`);
await cdp.evalIife(`(() => { document.querySelector('.squads')?.scrollIntoView({ block: 'center' }); return 1; })()`);
await sleep(300);
await cdp.shot('team-squad');

// 9) 抽卡记录 + 欧非评估
const gacha = await cdp.evalIife(`(() => {
  const s = __game.state;
  s.tickets = Math.max(s.tickets, 500);
  window.__go('summon');
  document.querySelector('[data-act="pull"][data-n="10"]').click();
  window.__closeModal();
  const card = document.querySelector('.luckcard');
  const txt = (card?.innerText || '').replace(/\\s+/g, ' ');
  const idx = txt.match(/幸运指数\\s*(\\d+)/);
  const pulls = s.gacha.agg.pulls, log = s.gacha.log.length;
  const chips = document.querySelectorAll('.gchip').length;
  document.querySelector('[data-act="gacha-log"]').click();
  const modal = document.querySelector('.modal');
  const rows = modal ? modal.querySelectorAll('.glog').length : 0;
  const crow = modal ? modal.querySelectorAll('.gcrow > div').length : 0;
  window.__closeModal();
  return { pulls, log, chips, idx: idx && idx[1], txt: txt.slice(0, 96), rows, crow };
})()`);
check(gacha.pulls >= 10 && gacha.log >= 10, `抽卡记录写入 ${gacha.pulls} 抽 / 明细 ${gacha.log} 条`);
check(!!gacha.idx && gacha.chips > 0, `面板显示幸运指数 ${gacha.idx} · 最近 ${gacha.chips} 条：${gacha.txt}`);
check(gacha.rows >= 10 && gacha.crow === 3, `完整记录弹窗 ${gacha.rows} 条明细 · ${gacha.crow} 组稀有度对照`);
await cdp.shot('gacha');

// 10) BGM 曲目可以手动锁定，顶栏喇叭能静音 / 恢复
const audio = await cdp.evalIife(`(() => {
  window.__go('settings');
  const tracks = document.querySelectorAll('[data-act="bgm-track"]').length;
  document.querySelector('[data-act="bgm-track"][data-k="boss"]').click();
  const q = document.querySelector('#sndq');
  q.click(); const muted = q.classList.contains('off');
  q.click(); const unmuted = !q.classList.contains('off');
  const on = [...document.querySelectorAll('.tracks .btn.on')].map((b) => b.innerText.trim());
  // 再点「跟随页面」，恢复自动换曲
  document.querySelector('[data-act="bgm-auto"]').click();
  const autoOn = [...document.querySelectorAll('.tracks .btn.on')].map((b) => b.innerText.trim());
  return { tracks, muted, unmuted, on, autoOn };
})()`);
check(audio.tracks >= 6, `设置页有 ${audio.tracks} 首 BGM 可选`);
check(audio.muted && audio.unmuted, '顶栏喇叭可以静音 / 恢复');
check(audio.on.some((x) => /威压/.test(x)), `手动锁定曲目：${audio.on.join(' / ') || '(无)'}`);
check(audio.autoOn.some((x) => /跟随页面/.test(x)), `恢复跟随页面：${audio.autoOn.join(' / ') || '(无)'}`);
await cdp.evalIife(`(() => { document.querySelector('.tracks')?.scrollIntoView({ block: 'center' }); return 1; })()`);
await sleep(300);
await cdp.shot('settings-audio');


// 11) 队伍页的标签页：每个挑战入口单独一栏，属性塔里能锁界域现场编队
const assign = await cdp.evalIife(`(() => {
  const s = __game.state;
  // 先保证手里有混沌界域的人，否则「混沌塔一键上阵」会正确地返回空
  const chaos = __game.data.awakeners.filter((a) => a.realm === 'CHAOS').slice(0, 5).map((a) => a.slug);
  for (const x of chaos) s.roster[x] ||= { lv: 60, star: 3, brk: 3 };
  window.__go('team');
  const tabs = [...document.querySelectorAll('.ttab')].map((b) => b.innerText.trim());
  // 每个挑战入口的标签页里应该只有一块，不再把 9 个入口堆在一页
  const per = {};
  for (const t of ['tower', 'rt', 'weekly', 'arena', 'rift', 'squads']) {
    document.querySelector('.ttab[data-k="' + t + '"]').click();
    const v = document.querySelector('#view');
    per[t] = { blocks: v.querySelectorAll('.assign').length, lines: v.querySelectorAll('.riftline').length,
      squads: v.querySelectorAll('.squad').length, head: (v.querySelector('h2')?.innerText || '').split('\\n')[0] };
  }
  // 属性塔：切到混沌，再现场编队
  document.querySelector('.ttab[data-k="rt"]').click();
  document.querySelector('[data-act="team-rt"][data-k="CHAOS"]').click();
  const rtTitle = (document.querySelector('#view h2')?.innerText || '').split('\\n')[0];
  document.querySelector('[data-act="squad-edit"][data-mode="rt_CHAOS"]').click();
  const opened = !!document.querySelector('.sqeditor');
  const realmLocked = [...document.querySelectorAll('.sqrealms .sqchip')].filter((b) => b.disabled).map((b) => b.innerText.trim());
  document.querySelector('[data-sq="auto"]').click();
  const slots = [...document.querySelectorAll('.sqslot.on')];
  const picked = slots.map((x) => x.querySelector('b').innerText.trim());
  document.querySelector('[data-sq="save"][data-k="c"]').click();
  const team = (s.squads.c.team || []).slice();
  return { tabs, per, rtTitle, opened, realmLocked, slots: slots.length, picked, team,
    allChaos: team.every((x) => __game.data.bySlug[x].realm === 'CHAOS'),
    pick: s.squadPick.rt_CHAOS, closed: !document.querySelector('.sqeditor') };
})()`);
check(assign.tabs.length === 7 && assign.tabs[0] === '主线队伍' && assign.tabs[1] === '无限塔' && assign.tabs[2] === '融灾禁区',
  `队伍页 ${assign.tabs.length} 个标签：${assign.tabs.join(' / ')}`);
check(['tower', 'rt', 'weekly', 'arena'].every((k) => assign.per[k].blocks === 1) && assign.per.rift.blocks === 2,
  `每个挑战标签只放自己那一块（融灾禁区是「五队 + 区域首领」两块）：${Object.entries(assign.per).map(([k, v]) => `${k}=${v.blocks}`).join(' ')}`);
check(assign.per.rift.lines === 5, `融灾禁区标签里是五队逐行（${assign.per.rift.lines} 行）`);
check(assign.per.squads.squads === 10, `编队库里是通用五套 + 禁区专用五套（${assign.per.squads.squads} 套）`);
check(assign.opened && assign.slots === 4 && assign.allChaos, `属性塔现场编队一键上阵：${assign.picked.join('、')}（${assign.slots} 人，全混沌界域）`);
check(assign.pick === 'c' && assign.closed && assign.team.length === 4, `存为三队后「混沌尖塔」自动指向它（${assign.pick}）`);
check(assign.realmLocked.includes('血肉') && !assign.realmLocked.includes('混沌'), `混沌塔编辑器锁住其他界域（${assign.realmLocked.join('、') || '无'}）`);
await cdp.evalIife(`(() => { document.querySelector('.ttab[data-k="rt"]').click(); return 1; })()`);
await sleep(200);
await cdp.shot('team-assign');
await cdp.evalIife(`(() => { document.querySelector('.ttab[data-k="rift"]').click(); return 1; })()`);
await sleep(200);
await cdp.shot('team-rift');

// 12) 属性塔：四座塔各有自己的出战阵容条；挑战会先放一段战斗回放
const rt = await cdp.evalIife(`(() => {
  window.__go('rtower');
  const bars = document.querySelectorAll('.squadbar').length;
  const locked = [...document.querySelectorAll('[data-act="squad-pick"][data-mode^="rt_"]')].length;
  window.__go('challenge');
  return { bars, locked };
})()`);
check(rt.bars === 4, `属性塔四座塔各一条出战阵容（${rt.bars} 条 / ${rt.locked} 个选择按钮）`);

const replay = await cdp.evalIife(`(() => {
  window.__go('rtower');
  const btn = document.querySelector('[data-act="rt-go"][data-realm="CHAOS"]');
  if (!btn) return { err: '没有混沌塔的挑战按钮' };
  btn.click();
  const rp = document.querySelector('.rp-modal');
  const round = document.querySelector('#rp-round')?.innerText || '';
  const foes = document.querySelectorAll('.rp-field .side.enemies .unit').length;
  const allies = document.querySelectorAll('.rp-field .side.allies .unit').length;
  const units = document.querySelectorAll('.rp-field .unit').length;
  const log = document.querySelectorAll('.rp-log > div').length;
  const names = [...document.querySelectorAll('.rp-field .u-name')].map((x) => x.innerText.trim()).slice(0, 4);
  return { err: '', opened: !!rp, units, round, foes, allies, log, names };
})()`);
check(!replay.err && replay.opened && replay.units >= 2, `挑战先弹出战斗回放：${replay.allies} 打 ${replay.foes}（${replay.round}）`);
await sleep(1400);
const tick = await cdp.evalIife(`(() => ({
  log: document.querySelectorAll('.rp-log > div').length,
  round: document.querySelector('#rp-round')?.innerText || '',
  hp: [...document.querySelectorAll('.rp-field .bar.hp i')].map((i) => i.style.width).slice(0, 4).join(' / '),
}))()`);
check(tick.log >= 2 && tick.round !== replay.round, `回放逐条推进：${tick.log} 行日志 · ${tick.round} · 血量 ${tick.hp}`);
await cdp.shot('replay');
const replayCtl = await cdp.evalIife(`(() => {
  const speed = document.querySelector('[data-rp="speed"]');
  speed.click(); const s1 = speed.innerText;
  speed.click(); const s2 = speed.innerText;
  document.querySelector('[data-rp="skip"]').click();
  return { s1, s2, settled: !!document.querySelector('.modal-bg'), stillRp: !!document.querySelector('.rp-modal'),
    title: (document.querySelector('.modal h3')?.innerText || '').replace(/\s+/g, ' ').slice(0, 30) };
})()`);
check(replayCtl.s1 === '2×' && replayCtl.s2 === '4×', `回放可以加速（1× → ${replayCtl.s1} → ${replayCtl.s2}）`);
check(replayCtl.settled && !replayCtl.stillRp, `跳过过程后直接进结算弹窗（${replayCtl.title}）`);
await cdp.evalIife(`window.__closeModal()`);

// 13) 唤醒体排序：6 种排序，再点一次反向，未获得的始终在后
await cdp.evalIife(`window.__go('roster')`);
await sleep(500);   // 先让 62 张立绘加载完，再连着换排序
const sortOut = await cdp.evalIife(`(() => {
  const keys = [...document.querySelectorAll('[data-act="roster-sort"]')].map((b) => b.dataset.k);
  const names = () => [...document.querySelectorAll('.grid .tile b')].slice(0, 6).map((b) => b.innerText.trim());
  const byRarity = names();
  document.querySelector('[data-act="roster-sort"][data-k="power"]').click();
  const byPower = names();
  const on1 = (document.querySelector('.sortbar .btn.on')?.innerText || '').trim();
  document.querySelector('[data-act="roster-sort"][data-k="power"]').click();
  const on2 = (document.querySelector('.sortbar .btn.on')?.innerText || '').trim();
  document.querySelector('[data-act="roster-sort"][data-k="order"]').click();
  const on3 = (document.querySelector('.sortbar .btn.on')?.innerText || '').trim();
  const lockedAtEnd = (() => {
    const tiles = [...document.querySelectorAll('.grid .tile')];
    const i = tiles.findIndex((t) => t.classList.contains('locked'));
    return i < 0 || tiles.slice(i).every((t) => t.classList.contains('locked'));
  })();
  return { keys, byRarity, byPower, on1, on2, on3, changed: byRarity.join() !== byPower.join(), lockedAtEnd };
})()`);
check(sortOut.keys.length === 6, `唤醒体可按 ${sortOut.keys.length} 种方式排序：${sortOut.keys.join(' / ')}`);
check(sortOut.changed, `切换排序后顺序变了（稀有度 → 战力：${sortOut.byPower.join('、')}）`);
check(/↓|↑/.test(sortOut.on1) && sortOut.on1 !== sortOut.on2, `再点一次反向：${sortOut.on1} → ${sortOut.on2}`);
check(sortOut.on3.startsWith('获取顺序') && sortOut.lockedAtEnd, `获取顺序生效（${sortOut.on3}），未获得的排在最后`);
await cdp.evalIife(`(() => { document.querySelector('.sortbar')?.scrollIntoView({ block: 'center' }); return 1; })()`);
await sleep(300);
await cdp.shot('roster-sort');


// 14) 融灾禁区：挑战页有入口、页面五队齐列、挑战先放回放再出结算
const rift = await cdp.evalIife(`(() => {
  const s = __game.state;
  // 造出五套能打的队伍：前 20 名都拉到 lv95，一队~五队各 4 人
  const all = __game.data.awakeners.slice(0, 20).map((a) => a.slug);
  for (const x of all) s.roster[x] = { lv: 95, star: 9, brk: 5 };
  ['a', 'b', 'c', 'd', 'e'].forEach((k, i) => { s.squads[k] = { team: all.slice(i * 4, i * 4 + 4) }; });
  ['r1', 'r2', 'r3', 'r4', 'r5'].forEach((k, i) => { s.squads[k] = { team: all.slice(i * 4, i * 4 + 4) }; });
  s.rift = { cycle: '', floor: 0, best: 0, day: '', tries: 3, tkFrac: 0, coFrac: 0, runs: 0 };
  window.__go('challenge');
  // 第一个标签是无限塔：只有塔的内容，不该再混着融灾禁区的卡或区域首领
  const firstTab = (document.querySelector('#subnav [data-sub="challenge"]')?.innerText || '').trim();
  const towerHead = (document.querySelector('#view h2')?.innerText || '').split('\\n')[0];
  const towerFloors = document.querySelectorAll('#view .tfline').length;
  const strayRift = !!document.querySelector('#view .riftcard');
  const strayTrials = document.querySelectorAll('#view .trials').length;
  window.__go('rift');
  const teams = [...document.querySelectorAll('.rt-teams .rt-team')];
  const bar = !!document.querySelector('.riftbar');
  const filled = teams.filter((t) => t.classList.contains('on')).length;
  const btn = document.querySelector('[data-act="rift-go"]');
  const label = (btn && btn.innerText.trim()) || '';
  const trials = document.querySelectorAll('#view .trials .trial').length;
  return { firstTab, towerHead, towerFloors, strayRift, strayTrials, teams: teams.length, bar, filled, label, trials,
    tab: document.querySelector('[data-sub="rift"]') ? '有二级导航' : '无' };
})()`);
check(rift.firstTab === '无限塔' && /无限塔/.test(rift.towerHead), `挑战组第一个标签是「${rift.firstTab}」，页头「${rift.towerHead}」`);
check(!rift.strayRift && !rift.strayTrials && rift.towerFloors === 5,
  `无限塔页只有塔的内容（${rift.towerFloors} 层预告，无融灾禁区卡 / 无区域首领）`);
check(rift.trials > 0, `区域首领（融灾试炼）挪进了融灾禁区页：${rift.trials} 组`);
check(rift.teams === 5 && rift.filled === 5 && rift.bar, `融灾禁区页面五队齐列（${rift.filled}/5 已编，进度条正常）`);
check(/第 1 层/.test(rift.label), `挑战按钮指向当前层：${rift.label}`);
await cdp.shot('rift-page');
await cdp.evalIife(`(() => { document.querySelector('.rt-teams')?.scrollIntoView({ block: 'center' }); return 1; })()`);
await sleep(300);
await cdp.shot('rift-teams');
await cdp.evalIife(`window.scrollTo(0, 0)`);

const riftFight = await cdp.evalIife(`(() => {
  const btn = document.querySelector('[data-act="rift-go"]');
  btn.click();
  const rp = !!document.querySelector('.rp-modal');
  const title = (document.querySelector('.rp-top b')?.innerText || '').trim();
  return { rp, title };
})()`);
check(riftFight.rp && /融灾禁区/.test(riftFight.title), `融灾禁区挑战先放战斗回放：${riftFight.title}`);
await sleep(700);
await cdp.shot('rift-replay');
await cdp.evalIife(`(() => { document.querySelector('[data-rp="skip"]').click(); return 1; })()`);
await sleep(400);
await cdp.shot('rift-result');
const riftDone = await cdp.evalIife(`(() => {
  const m = document.querySelector('.modal h3');
  const body = document.querySelector('.modal')?.innerText || '';
  const rows = document.querySelectorAll('.rfls .rfl').length;
  const det = document.querySelectorAll('.riftdet .rd').length;
  window.__closeModal();
  return { title: (m?.innerText || '').replace(/\\s+/g, ' ').slice(0, 40), rows, det,
    passed: /通过/.test(m?.innerText || ''), state: __game.state.rift.floor, tries: __game.state.rift.tries };
})()`);
check(riftDone.passed && riftDone.rows >= 1 && riftDone.det === 5, `跳过回放后出结算：${riftDone.title}（${riftDone.rows} 层 · 最后一层 5 队）`);
check(riftDone.state >= 1 && riftDone.tries === 2, `层数推进到第 ${riftDone.state} 层，次数 3 → ${riftDone.tries}`);

// 14.5) M16：挂机层默认取「有收益的最高层」
// 上一段停在融灾禁区页，先切回战斗页再断言（面板是同一个 DOM，但截图要看得到）
await cdp.evalIife(`(async () => { window.__go('battle'); await new Promise((r) => setTimeout(r, 300)); return 1; })()`);
const farmStall = await cdp.evalIife(`(() => {
  const s = __game.state;
  s.auto = true; s.maxStage = 60; s.stage = 61; s.miss = { stage: 0, n: 0 };
  __game.save(); __game.bv.refreshHead();
  const box = document.querySelector('#bv-farm');
  const btn = box.querySelector('[data-bv="fallback"]');
  const warn = box.querySelector('.farmx.warn');
  return { warn: !!warn, text: warn ? warn.innerText.replace(/\\s+/g, ' ') : '', btn: btn ? btn.innerText.trim() : '', stage: s.stage };
})()`);
check(farmStall.warn && /胜率 0/.test(farmStall.text) && /有收益的最高层/.test(farmStall.text),
  `胜率 0 时警告并给出有收益的层：${farmStall.text.slice(0, 48)}…`);
await cdp.shot('farm-stall');

const farmBack = await cdp.evalIife(`(async () => {
  document.querySelector('#bv-farm [data-bv="fallback"]').click();
  await new Promise((r) => setTimeout(r, 400));
  return { stage: __game.state.stage, toast: document.querySelector('.toast')?.innerText || '' };
})()`);
check(farmBack.stage > 0 && farmBack.stage < 60, `点「${farmStall.btn}」后挂机层切到第 ${farmBack.stage} 关`);
check(/已退回第/.test(farmBack.toast), `toast：${farmBack.toast}`);

const offback = await cdp.evalIife(`(async () => {
  const g = await import('/src/core/game.js');
  const P = await import('/src/ui/pages.js');
  const s = __game.state;
  s.auto = true; s.maxStage = 60; s.stage = 61;
  s.lastSeen = Date.now() - 9 * 3600 * 1000;   // 假装离线 9 小时（封顶 8 小时）
  const r = g.offlineReport(s, __game.data, Date.now());
  P.offlineModal(__game, r, () => g.claimOffline(__game.state, r, Date.now()));
  await new Promise((x) => setTimeout(x, 200));
  const note = document.querySelector('.modal-bg .offback');
  document.querySelector('.modal-bg [data-act="claim-offline"]').click();
  await new Promise((x) => setTimeout(x, 300));
  return { w: r.wantStage, stage: r.stage, gold: r.gold, fellBack: !!r.fellBack,
    note: note ? note.innerText.replace(/\\s+/g, ' ') : '', now: s.stage };
})()`);
check(offback.fellBack && offback.stage < 60 && offback.gold > 0,
  `离线结算退回有收益的最高层：第 ${offback.w} 关 → 第 ${offback.stage} 关（金币 +${offback.gold}）`);
check(/有收益的最高层/.test(offback.note), '离线弹窗说明已按有收益的最高层结算');
check(offback.now === offback.stage, `领完收益后挂机层切到第 ${offback.now} 关`);

const catImg = await cdp.evalIife(`__game.data.monById.catboss.img`);
check(/catboss_black\.webp$/.test(catImg), `校猫用节奏榜那张头像：${catImg}`);

// 14.5) 联动「星辉直播间」：彩蛋角色不进池子 / 活动页能解锁 / 组队真能打
const crInfo = await cdp.evalIife(`(() => {
  const cr = __game.data.awakeners.filter((a) => a.creator);
  return { total: __game.data.awakeners.length, n: cr.length, names: cr.map((a) => a.zh), avail: [...new Set(cr.map((a) => a.avail))] };
})()`);
check(crInfo.n === 9 && crInfo.total === 71, `9 位联名嘉宾已并进唤醒体表（共 ${crInfo.total} 名）：${crInfo.names.join('、')}`);
check(crInfo.avail.length === 1 && crInfo.avail[0] === 'GIFT', '彩蛋角色 avail = GIFT，不进召唤池');

const crPull = await cdp.evalIife(`(async () => {
  const g = await import('/src/core/game.js');
  const s = __game.state; s.tickets = 2000; __game.save();
  const out = g.summon(s, __game.data, 200);
  return out.filter((p) => __game.data.bySlug[p.slug].creator).length;
})()`);
check(crPull === 0, '200 抽一个彩蛋角色都没出（池子确实排除了）');

await cdp.evalIife(`(async () => { window.__go('event'); await new Promise((r) => setTimeout(r, 400)); return 1; })()`);
const evPage = await cdp.evalIife(`(() => {
  const t = document.querySelector('#view').innerText || '';
  return { t: t.includes('星辉直播间'), guests: document.querySelectorAll('#view .guest').length,
    tasks: document.querySelectorAll('[data-act="event-daily"]').length,
    sub: document.querySelector('#subnav')?.innerText || '' };
})()`);
check(evPage.t && evPage.guests === 9 && evPage.tasks === 3, `活动页渲染：9 张嘉宾卡 + 3 条每日任务`);
check(/联动/.test(evPage.sub), '「更多」组里多了「联动」页签');
await cdp.shot('event-page');

const evUnlock = await cdp.evalIife(`(async () => {
  const s = __game.state; s.event.fame = 1000; __game.save();
  window.__go('event'); await new Promise((r) => setTimeout(r, 300));
  const tokens0 = document.querySelectorAll('[data-act="event-summon"]').length;
  const b = document.querySelector('[data-act="event-summon"]');
  const slug = b?.dataset.slug || '';
  const before = Object.keys(s.roster).length;
  const used0 = s.event.used || 0;
  b?.click(); await new Promise((r) => setTimeout(r, 350));
  document.querySelectorAll('.modal-bg').forEach((e) => e.remove());
  const star1 = s.roster[slug]?.star ?? -1;
  // 再换一次同一个人：应该变成叠位 +1，而不是第二个角色
  const b2 = document.querySelector('[data-act="event-summon"][data-slug="' + slug + '"]');
  b2?.click(); await new Promise((r) => setTimeout(r, 300));
  return { slug, delta: Object.keys(s.roster).length - before, tokens0,
    star1, star2: s.roster[slug]?.star ?? -1, used: (s.event.used || 0) - used0,
    zh: __game.data.bySlug[slug]?.zh || '' };
})()`);
check(evUnlock.delta === 1, `征召券换到联名「${evUnlock.zh}」，一次只进一位`);
check(evUnlock.used === 2 && evUnlock.star2 === evUnlock.star1 + 1,
  `同一人再换一次变成叠位：${evUnlock.star1} → ${evUnlock.star2}（共用券 ${evUnlock.used} 张）`);
await cdp.shot('event-guests');

const crFight = await cdp.evalIife(`(async () => {
  const g = await import('/src/core/game.js');
  const s = __game.state;
  const slugs = __game.data.awakeners.filter((a) => a.creator).slice(0, 4).map((a) => a.slug);
  for (const k of slugs) s.roster[k] = { lv: 40, star: 4, brk: 2 };
  s.team = slugs; s.stage = 12; s.maxStage = 20; s.auto = false;
  const r = g.runBattle(s, __game.data, 12);
  g.applyResult(s, __game.data, r);
  return { win: r.win, rounds: r.rounds, ev: r.events.length, battles: s.event.daily.battles };
})()`);
check(crFight.ev > 0 && crFight.battles > 0,
  `4 位联名嘉宾组队实打一场：${crFight.win ? '胜' : '负'} · ${crFight.rounds} 回合，并记进活动任务（${crFight.battles} 场）`);

// 15) 全局报错 / 4xx
const errs = [...new Set([...cdp.runtime, ...cdp.logs])];
check(errs.length === 0, errs.length ? '页面报错：\n  ' + errs.slice(0, 8).join('\n  ') : '0 个 JS 报错');
const http = [...new Set(cdp.http)];
check(http.length === 0, http.length ? '4xx / 资源失败：\n  ' + http.slice(0, 8).join('\n  ') : '0 个 4xx / 资源失败');

console.log(`\n截图目录：${OUT}`);
cleanup();
process.exit(fails.length ? 1 : 0);
