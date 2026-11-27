// 预加载层：只把桌面版需要的能力暴露给页面，不放开 Node。
const { contextBridge, ipcRenderer } = require('electron');

const pick = (prefix) => {
  const a = process.argv.find((x) => x.startsWith(prefix)) || '';
  return a ? a.slice(prefix.length) : '';
};

const arg = '--zjtt-version=';
const apiArg = '--zjtt-api=';

// 正式后端地址：页面跑在 app://local 下没有同源 /api，必须给一个绝对地址，
// 否则登录、云存档、榜单、死亡报告工坊全是 404（旧版 1.3.0 就是这样）。
// main.js 会把它当启动参数传进来；读不到就用这份兜底。
const API = pick(apiArg) || 'https://morimens.qingdengbuyi.top/api';

// 只在本机没手动配过的时候写默认值：offline.html 里填的 apiBase 优先级更高，
// 用户在「离线版设置」里改过就别覆盖。
try {
  if (localStorage.getItem('zjtt:apiBase') == null) {
    localStorage.setItem('zjtt:apiBase', JSON.stringify(API));
  }
} catch { /* 存储不可用（极端情况）就让 api.js 的协议判断兜底 */ }

contextBridge.exposeInMainWorld('zjttDesktop', {
  version: pick(arg),
  apiBase: API,
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
});
