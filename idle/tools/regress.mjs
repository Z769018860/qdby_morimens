// 无头回归：用 Edge 的 CDP 跑一遍 14 个页面，检查报错 / 4xx，
// 以及 M10 的三处新交互（命轮密契页换装 / 一键配队 / 手动挂机不推进）。
// 用法：node tools/regress.mjs [http://127.0.0.1:8777/index.html]
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL0 = process.argv[2] || 'http://127.0.0.1:8777/index.html';
const PORT = 9333;
const OUT = process.env.SHOT_DIR || join(tmpdir(), 'qdby-shots');
mkdirSync(OUT, { recursive: true });

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) { console.error('找不到 Edge/Chrome'); process.exit(1); }

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
    await this.send('Page.navigate', { url });
    for (let i = 0; i < 60; i++) {
      try { if ((await this.evalIife('typeof window.__game')) === 'object') { await sleep(500); return; } } catch { /* 还在导航 */ }
      await sleep(300);
    }
    throw new Error('页面没起来：__game 未定义');
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
      challenge: 'challenge', weekly: 'challenge', rtower: 'challenge', arena: 'challenge',
      signin: 'more', codex: 'more', ach: 'more', settings: 'more' };
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
// 首进会弹新手引导，跳过它，免得挡住截图和点击
await cdp.evalIife(`(() => { const b = document.querySelector('[data-gskip]'); if (b) b.click(); return !!b; })()`);

// 1) 14 个页面都能渲染
const TABS = ['battle', 'team', 'roster', 'gear', 'orders', 'summon', 'challenge', 'weekly', 'rtower', 'arena', 'signin', 'codex', 'ach', 'settings'];
const rendered = await cdp.evalIife(`(() => {
  const out = [];
  for (const t of ${JSON.stringify(TABS)}) {
    try { window.__go(t); out.push([t, (window.__view().innerText || '').trim().length]); }
    catch (e) { out.push([t, -1]); }
  }
  return out;
})()`);
const blank = rendered.filter(([, n]) => !(n > 100)).map(([t, n]) => `${t}(${n})`);
check(blank.length === 0, `14 个页面都有内容${blank.length ? '，可疑：' + blank.join(', ') : ''}`);

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
await cdp.evalIife(`(() => { const s = __game.state;
  for (const k of Object.keys(s.roster)) s.roster[k].lv = 80;
  s.maxStage = Math.max(s.maxStage, 12); s.stage = 12; s.auto = true; window.__go('battle'); })()`);
await sleep(500);
const manual = await cdp.evalIife(`(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.querySelector('#bv-auto').click();           // 切到手动挂机
  const s = __game.state;
  await wait(500);
  const note = (document.querySelector('.manual-note')?.innerText || '').replace(/\\s+/g, ' ');
  const stage0 = s.stage, b0 = s.stats.battles;
  await wait(12000);                                     // 让它连打几场
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

// 8) 全局报错 / 4xx
const errs = [...new Set([...cdp.runtime, ...cdp.logs])];
check(errs.length === 0, errs.length ? '页面报错：\n  ' + errs.slice(0, 8).join('\n  ') : '0 个 JS 报错');
const http = [...new Set(cdp.http)];
check(http.length === 0, http.length ? '4xx / 资源失败：\n  ' + http.slice(0, 8).join('\n  ') : '0 个 4xx / 资源失败');

console.log(`\n截图目录：${OUT}`);
child.kill();
process.exit(fails.length ? 1 : 0);
