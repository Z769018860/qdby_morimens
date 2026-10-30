// 桌面版主进程：把构建好的整站（web/）当成一个 app:// 站点发出去。
//
// 为什么不用 file:// 直接开：页面的脚本是 ES module，file:// 下会被 CORS 拦掉，
// fetch('data/*.json') 也读不到。自定义协议注册成 standard + secure 之后，
// 页面里的 module / fetch / cache 都按正常 http 源处理，和线上行为一致。
//
// 联网的地方只有一处：设置里的「检查更新」（GET latest.json，几 KB）。
// 其余请求全被协议处理器直接从本地磁盘读，不会有任何外网访问。
const { app, BrowserWindow, Menu, protocol, net, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const WEB = path.join(__dirname, 'web');
const STATE = path.join(app.getPath('userData'), 'window.json');
// 更新清单：仓库里维护，发版时改版本号 + 传新包即可
const UPDATE_URL = 'https://raw.githubusercontent.com/Z769018860/qdby_morimens/main/desktop/latest.json';

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch { return {}; }
}
function saveState(obj) {
  try { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(obj)); } catch { /* 写不了就算了 */ }
}

let win = null;

function createWindow() {
  const st = readState();
  win = new BrowserWindow({
    width: st.width || 1280,
    height: st.height || 820,
    x: st.x, y: st.y,
    minWidth: 880,
    minHeight: 600,
    backgroundColor: '#0e1118',
    title: '忘忘同人小游戏',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: ['--zjtt-version=' + app.getVersion()],
    },
  });

  // 记住窗口大小 / 位置，下次直接还原
  const persist = () => {
    if (!win || win.isDestroyed()) return;
    const b = win.getNormalBounds ? win.getNormalBounds() : win.getBounds();
    saveState({ x: b.x, y: b.y, width: b.width, height: b.height });
  };
  win.on('resize', persist);
  win.on('move', persist);
  win.on('close', persist);

  // 站内一律在窗口里开；外链（官网 / Steam / Discord / 忘忘看报）交给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });

  win.loadURL('app://local/index.html');
}

function buildMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '回首页', accelerator: 'CmdOrCtrl+H', click: () => win && win.loadURL('app://local/index.html') },
        { label: '离线版设置', click: () => win && win.loadURL('app://local/offline.html') },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新载入' },
        { role: 'togglefullscreen', label: '全屏' },
        { type: 'separator' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { role: 'resetZoom', label: '实际大小' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '检查更新', click: () => checkUpdate(true) },
        {
          label: '关于',
          click: () => dialog.showMessageBox(win, {
            type: 'info',
            title: '关于',
            message: '忘忘同人小游戏 · 桌面版 v' + app.getVersion(),
            detail: '《忘却前夜》非官方同人小游戏合集。\n\n无盈利、无充值，与官方无关；素材版权归原权利人所有。\n桌面版完全离线运行，只在你点「检查更新」的时候联网。',
            buttons: ['好'],
          }),
        },
        { label: '打开项目主页', click: () => shell.openExternal('https://github.com/Z769018860/qdby_morimens') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// 版本比较：只认 a.b.c，够用了
function cmpVersion(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function checkUpdate(showDialog) {
  const cur = app.getVersion();
  try {
    const res = await net.fetch(UPDATE_URL + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const info = await res.json();
    const latest = String(info.version || cur);
    const newer = cmpVersion(latest, cur) > 0;
    if (showDialog) {
      const buttons = newer ? ['去下载', '以后再说'] : ['好'];
      const r = await dialog.showMessageBox(win, {
        type: 'info',
        title: '检查更新',
        message: newer ? `有新版本 ${latest}（当前 ${cur}）` : `已经是最新的（${cur}）`,
        detail: newer ? (info.notes || '新版本可以在项目 Releases 页面下载，覆盖旧文件夹即可，存档不受影响。') : '没有可更新的内容。',
        buttons,
        defaultId: 0,
      });
      if (newer && r.response === 0) shell.openExternal(info.url || 'https://github.com/Z769018860/qdby_morimens/releases/latest');
    }
    return { version: latest, current: cur, newer, url: info.url || '' };
  } catch (e) {
    if (showDialog) {
      dialog.showMessageBox(win, {
        type: 'warning',
        title: '检查更新失败',
        message: '连不上更新服务器',
        detail: '离线版平时不联网，只有这一步需要网络。检查一下网络后再试。\n\n' + String(e && e.message ? e.message : e),
        buttons: ['好'],
      });
    }
    return { version: cur, current: cur, newer: false, error: String(e && e.message ? e.message : e) };
  }
}

app.whenReady().then(() => {
  protocol.handle('app', async (req) => {
    const u = new URL(req.url);
    let rel = decodeURIComponent(u.pathname || '/');
    if (rel === '/' || rel.endsWith('/')) rel += 'index.html';
    const file = path.join(WEB, rel);
    // 目录穿越保护：拼出来的路径必须还在 web/ 里
    // 带分隔符比较：只比前缀会放行 web-evil/ 这类同名前缀的兄弟目录
    const webRoot = path.resolve(WEB) + path.sep;
    if (!(path.resolve(file) + path.sep).startsWith(webRoot)) {
      return new Response('forbidden', { status: 403 });
    }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      return new Response('not found: ' + rel, { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return net.fetch(pathToFileURL(file).toString());
  });

  ipcMain.handle('app:check-update', () => checkUpdate(false));
  ipcMain.handle('app:open-external', (_e, url) => {
    if (/^https?:/i.test(String(url))) shell.openExternal(String(url));
  });

  buildMenu();
  createWindow();

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
