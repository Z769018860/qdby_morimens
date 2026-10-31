// 本地预览 + 控制台错误捕获 + 截图
// 用法: node scripts/preview.mjs [页面名...]  例: node scripts/preview.mjs index gallery workshop codex about
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// 仓库搬到 H 盘之后这里还写着旧路径，改成从脚本位置推：拷到哪都能跑
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.preview');
fs.mkdirSync(OUT, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0]);
  let p = path.join(ROOT, u === '/' ? 'index.html' : u);
  const rel = path.relative(ROOT, p);
  if (rel.startsWith('..') || path.isAbsolute(rel)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { res.writeHead(404).end('404'); return; }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream',
    // 预览时必须禁缓存，否则改完 JS 复用的 profile 还在跑旧代码
    'Cache-Control': 'no-store, must-revalidate',
  });
  fs.createReadStream(p).pipe(res);
});

const PORT = Number(process.env.PREVIEW_SITE_PORT) || 8787;
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// PREVIEW_PROFILE=某个目录可复用同一份浏览器数据（localStorage 会保留），
// 这样可以「第一次跑探针写状态，第二次纯截图」。
const profile = process.env.PREVIEW_PROFILE || fs.mkdtempSync(path.join(os.tmpdir(), 'zjtt-'));
fs.mkdirSync(profile, { recursive: true });
const proc = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  // 无头模式下没这几个开关，页面失焦后 rAF 会被节流到 1fps 左右，
  // 游戏类页面测出来的「跑了几秒」全是假的（合成大杜勒那次就吃过这个亏）。
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', '--disable-features=CalculateNativeWinOcclusion',
  `--remote-debugging-port=${process.env.PREVIEW_PORT || 9333}`, `--user-data-dir=${profile}`,
  `--window-size=${process.env.PREVIEW_SIZE || '1440,1500'}`, '--hide-scrollbars', '--force-device-scale-factor=1',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`http://127.0.0.1:${process.env.PREVIEW_PORT || 9333}/json/version`);
    wsUrl = (await r.json()).webSocketDebuggerUrl;
    if (wsUrl) break;
  } catch { /* not ready */ }
  await sleep(250);
}
if (!wsUrl) { console.error('无法连接 Edge 调试端口'); proc.kill(); server.close(); process.exit(1); }

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let seq = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  } else if (m.method) {
    for (const f of listeners) f(m);
  }
};
const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
  const id = ++seq;
  pending.set(id, { res, rej });
  ws.send(JSON.stringify({ id, method, params, sessionId }));
});

const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index', 'gallery', 'workshop', 'codex', 'about'];
let bad = 0;

for (const name of pages) {
  // 允许「index?p=ZJ2-xxx」这种带参数的页面（截图文件名只取路径部分）
  const [nm, qs] = name.split('?');
  const url = `http://127.0.0.1:${PORT}/${nm}.html` + (qs ? `?${qs}` : '');
  const slug = qs ? `${nm}-q` : nm;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  const errs = [];
  const onEvt = (m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push('EXC ' + (d.exception?.description || d.text).split('\n').slice(0, 3).join(' | '));
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errs.push('ERR ' + m.params.args.map((a) => a.description || a.value || a.type).join(' ').slice(0, 300));
    } else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
      errs.push('LOG ' + m.params.entry.text.slice(0, 200) + ' @' + (m.params.entry.url || ''));
    }
  };
  listeners.push(onEvt);

  // PREVIEW_SCHEME=dark|light 可强制配色方案（headless Edge 默认 light，暗色主题会被隐藏）
  if (process.env.PREVIEW_SCHEME) {
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: process.env.PREVIEW_SCHEME }],
    }, sessionId);
  }
  // PREVIEW_VIEWPORT=390x844：按手机逻辑视口截图。headless 的 --window-size 会被「最小窗口宽度」
  // 卡住（传 320 量出来还是 492），窄屏布局只能靠 CDP 覆盖尺寸才测得准。
  // 默认按二倍屏出图，PREVIEW_DPR=1 可以改回来。
  if (process.env.PREVIEW_VIEWPORT) {
    const [w, h] = process.env.PREVIEW_VIEWPORT.split('x').map(Number);
    if (w > 0 && h > 0) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: w, height: h, mobile: true, deviceScaleFactor: Number(process.env.PREVIEW_DPR || 2),
      }, sessionId);
    }
  }
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);

  const loaded = new Promise((r) => {
    const f = (m) => { if (m.sessionId === sessionId && m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(f), 1); r(); } };
    listeners.push(f);
  });
  await send('Page.navigate', { url }, sessionId);
  await Promise.race([loaded, sleep(15000)]);
  await sleep(2200);

  // 可选：注入一段交互脚本（PROBE=path/to/probe.js），用于点开弹窗等
  if (process.env.PROBE && fs.existsSync(process.env.PROBE)) {
    const code = fs.readFileSync(process.env.PROBE, 'utf8');
    const out = await send('Runtime.evaluate', { expression: code, awaitPromise: true, returnByValue: true }, sessionId);
    console.log(`      probe -> ${String(out.result && out.result.value).slice(0, 1200)}`);
    await sleep(900);
    // PROBE_RELOAD=1：交互脚本只改 localStorage 时，导航到同一地址再截图
    if (process.env.PROBE_RELOAD) {
      await send('Page.navigate', { url: url + (process.env.PROBE_RELOAD === '1' ? '' : '') }, sessionId).catch(() => {});
      await sleep(2800);
    }
  }

  // PREVIEW_FULL=0：只截当前视口（长页面整页截图很慢，调试布局够用了）
  const full = process.env.PREVIEW_FULL !== '0';
  const { data } = await send('Page.captureScreenshot', full ? { format: 'png', captureBeyondViewport: true } : { format: 'png' }, sessionId);
  const file = path.join(OUT, slug + '.png');
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  const top = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  fs.writeFileSync(path.join(OUT, slug + '-top.png'), Buffer.from(top.data, 'base64'));

  const { result } = await send('Runtime.evaluate', {
    expression: `(() => {
      const t = document.title || '';
      const h = document.body ? document.body.innerText.length : 0;
      return JSON.stringify({ title: t, textLen: h, imgs: document.images.length,
        broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length });
    })()`, returnByValue: true,
  }, sessionId);

  listeners.splice(listeners.indexOf(onEvt), 1);
  await send('Target.closeTarget', { targetId });

  const info = JSON.parse(result.value || '{}');
  if (errs.length) bad++;
  console.log(`${errs.length ? 'FAIL' : 'OK  '} ${slug.padEnd(9)} text=${String(info.textLen).padStart(5)} img=${info.imgs} broken=${info.broken} title="${info.title}" -> .preview/${slug}.png`);
  for (const e of errs.slice(0, 8)) console.log('      ' + e);
}

ws.close();
proc.kill();
server.close();
setTimeout(() => process.exit(bad ? 1 : 0), 200);
