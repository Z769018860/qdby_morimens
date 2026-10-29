// 首页 / 离线页的截图 + 控制台检查（无头 Edge + CDP，零依赖）
// 用法：node scripts/shot_home.mjs [http://127.0.0.1:8899]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = (process.argv[2] || 'http://127.0.0.1:8899').replace(/\/+$/, '');
const PORT = 9500 + Math.floor(Math.random() * 300);
const OUT = process.env.SHOT_DIR || join(tmpdir(), 'qdby-home-shots');
mkdirSync(OUT, { recursive: true });

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find((p) => existsSync(p));
if (!EDGE) { console.error('找不到 Edge/Chrome'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const prof = mkdtempSync(join(tmpdir(), 'edgeprof-'));
const child = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,900', 'about:blank'],
  { stdio: 'ignore' });
const cleanup = () => { try { spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} };
process.on('exit', cleanup);

async function wsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = j.find((t) => t.type === 'page');
      if (p) return p.webSocketDebuggerUrl;
    } catch {}
    await sleep(250);
  }
  throw new Error('CDP 没起来');
}

const ws = new WebSocket(await wsUrl());
await new Promise((r) => { ws.onopen = r; });

let id = 0;
const pending = new Map();
const errors = [];
const http = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); return; }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errors.push('CE ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && !/\/api\//.test(m.params.response.url)) http.push(`${m.params.response.status} ${m.params.response.url}`);
};
const send = (method, params = {}) => { const n = ++id; ws.send(JSON.stringify({ id: n, method, params })); return new Promise((resolve, reject) => pending.set(n, { resolve, reject })); };
const evalIife = async (code) => {
  const r = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
};
const viewport = (w, h, mobile = false) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

async function visit(path, name, opts = {}) {
  errors.length = 0; http.length = 0;
  await viewport(opts.w || 1280, opts.h || 900, !!opts.mobile);
  await send('Page.navigate', { url: BASE + path });
  await sleep(opts.wait || 1600);
  if (opts.before) await opts.before();
  // 公告弹窗会盖住首页：截一张带弹窗的，关掉再截一张干净的
  await shot(name);
  return { errors: [...errors], http: [...http] };
}

const report = {};
report.homeDesktop = await visit('/index.html', 'home-desktop', {
  before: async () => {
    await evalIife(`document.querySelectorAll('dialog[open]').forEach(d => d.close())`);
    await sleep(250);
  },
});

// 交互检查：评分弹层、BUG 弹层、卡片版本号、频道链接（必须在首页上下文里跑）
report.homeDesktop.checks = await evalIife(`(() => {
  const q = (s) => document.querySelector(s);
  const cards = [...document.querySelectorAll('.proj[data-game]')];
  return {
    cards: cards.length,
    versions: cards.map(c => c.dataset.game + '@' + c.dataset.version),
    hasNotice: !!q('#noticeDlg'),
    hasBug: !!q('#bugDlg'),
    hasRate: !!q('#rateDlg'),
    links: [...document.querySelectorAll('.links a')].map(a => a.href),
    stars: [...document.querySelectorAll('.rate .score')].map(e => e.textContent),
  };
})()`);

// 公告弹窗的两条断言：自动弹一次、关掉之后不再弹
report.notice = await (async () => {
  errors.length = 0;
  // 先把这个版本的「已看过」标记清掉，模拟新访客：应当自动弹一次
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(800);
  await evalIife("localStorage.removeItem('zjtt:noticeSeen')");
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1600);
  const r = { open: await evalIife("!!document.querySelector('#noticeDlg[open]')") };
  r.seenKey = await evalIife("localStorage.getItem('zjtt:noticeSeen')");
  // 同一版本再进一次：不该再糊一脸
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1400);
  r.openAgain = await evalIife("!!document.querySelector('#noticeDlg[open]')");
  r.errors = [...errors];
  return r;
})();

// 三个弹层的截图：公告 / BUG 反馈 / 评分
report.dialogs = await (async () => {
  errors.length = 0; http.length = 0;
  await viewport(1280, 900, false);
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1600);
  await evalIife("document.querySelectorAll('dialog[open]').forEach(d => d.close())");
  await evalIife("document.querySelector('#noticeBtn').click()");
  await sleep(400); await shot('home-notice');
  await evalIife("document.querySelector('#noticeDlg').close()");
  await evalIife("document.querySelector('[data-bug=\"idle\"]').click()");
  await sleep(400); await shot('home-bug');
  const sel = await evalIife("document.querySelector('#bugGame').value");
  await evalIife("document.querySelector('#bugDlg').close()");
  await evalIife("document.querySelector('[data-rate-btn]').click()");
  await sleep(400); await shot('home-rate');
  await evalIife("document.querySelector('#rateDlg').close()");
  return { bugPreselect: sel, errors: [...errors], http: [...http] };
})();

report.homeMobile = await visit('/index.html', 'home-mobile', { w: 390, h: 844, mobile: true, wait: 1200 });
report.offline = await visit('/offline.html', 'offline', { w: 1280, h: 900 });

// 竖屏/横屏控件：只在游戏页出现（构建注入），这里抽查 merge.html
report.orient = (await (async () => {
  errors.length = 0; http.length = 0;
  await viewport(390, 844, true);
  await send('Page.navigate', { url: BASE + '/merge.html' });
  await sleep(2000);
  await shot('merge-orient');
  return { errors: [...errors], http: [...http] };
})());

// 窄屏只有一颗「循环切换」的钮，宽屏是三颗；两种都验一遍
report.orient.checks = await evalIife(`(() => {
  const bar = document.querySelector('.zj-orient');
  const before = localStorage.getItem('zjtt:orient:merge');
  const narrow = !!(bar && bar.classList.contains('narrow'));
  const buttons = bar ? bar.querySelectorAll('button').length : 0;
  if (bar) {
    const direct = bar.querySelector('button[data-k="port"]');
    if (direct) direct.click();
    else for (let i = 0; i < 3 && localStorage.getItem('zjtt:orient:merge') !== 'port'; i++) {
      bar.querySelector('button').click();
    }
  }
  return new Promise((res) => setTimeout(() => res({
    hasBar: !!bar, narrow, buttons, before,
    after: localStorage.getItem('zjtt:orient:merge'),
    attr: document.documentElement.getAttribute('data-orient')
  }), 600));
})()`);

// 宽屏（桌面浏览器）下应该是三颗按钮
report.orientWide = await (async () => {
  errors.length = 0; http.length = 0;
  await viewport(1280, 900, false);
  await send('Page.navigate', { url: BASE + '/bird.html' });
  await sleep(1800);
  await shot('bird-orient-wide');
  const r = await evalIife(`(() => {
    const bar = document.querySelector('.zj-orient');
    return { hasBar: !!bar, narrow: !!(bar && bar.classList.contains('narrow')),
             buttons: bar ? bar.querySelectorAll('button').length : 0 };
  })()`);
  r.errors = [...errors]; r.http = [...http];
  return r;
})();

console.log(JSON.stringify(report, null, 2));
console.log('shots ->', OUT);
ws.close();
process.exit(0);
