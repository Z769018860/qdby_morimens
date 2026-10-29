// 预加载层：只把桌面版需要的能力暴露给页面，不放开 Node。
const { contextBridge, ipcRenderer } = require('electron');

const arg = process.argv.find((a) => a.startsWith('--zjtt-version=')) || '';

contextBridge.exposeInMainWorld('zjttDesktop', {
  version: arg.split('=')[1] || '',
  checkUpdate: () => ipcRenderer.invoke('app:check-update'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
});
