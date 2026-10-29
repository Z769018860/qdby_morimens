// 站点计数 + 打点 + 「我是不是管理员」。
//
// 左上角那三个数（注册用户 / 今日浏览 / 总浏览）来自 edge-functions 的 /stats。
// 边缘一个来回 1~2 秒，所以这里做三件事，避免每页都去问一遍：
//   1. 结果缓存 60 秒（localStorage），过期了先给旧数、后台再刷新；
//   2. 打点 POST /visit 走 keepalive 且不 await，页面跳走也不会被取消；
//   3. 后端不可用（GitHub Pages 镜像、纯静态预览）时静默返回 null，界面直接不显示这一块。
import { store } from './common.js';

const CACHE = 'site:stats';
const TTL = 60e3;

// 与 js/api.js 同一套判断：同源 /api；GitHub Pages 镜像没有后端，直接放弃
function apiBase() {
  try {
    const custom = String(store.get('apiBase', '') || '').trim().replace(/\/+$/, '');
    if (custom) return custom;
    if (/\.github\.io$/i.test(location.hostname)) return '';
    if (!/^https?:$/.test(location.protocol)) return '';
    return location.origin + '/api';
  } catch { return ''; }
}

const token = () => { try { return store.get('authToken', '') || ''; } catch { return ''; } };
const devId = () => {
  let v = store.get('did', '');
  if (!v) { v = 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('did', v); }
  return v;
};

const pick = (j) => ({
  users: Number(j && j.users) || 0,
  today: Number(j && j.today) || 0,
  total: Number(j && j.total) || 0,
});

export function cached() {
  const c = store.get(CACHE, null);
  return c && typeof c === 'object' && Number.isFinite(Number(c.total)) ? pick(c) : null;
}

// 拿最新数字：force=false 时优先给缓存（同时后台刷新）
export async function stats(force = false) {
  const base = apiBase();
  if (!base) return cached();
  const c = store.get(CACHE, null);
  const fresh = c && Date.now() - Number(c.at || 0) < TTL;
  if (c && fresh && !force) return pick(c);
  try {
    const r = await fetch(base + '/stats', { headers: { Accept: 'application/json' } });
    const j = await r.json();
    if (!r.ok || !j || j.ok === false) throw new Error('bad');
    const out = pick(j);
    store.set(CACHE, { ...out, at: Date.now() });
    return out;
  } catch {
    return cached();
  }
}

// 浏览打点。同一页面同一次会话只算一次（刷新算新的一次，符合 PV 口径），
// 免得 SPA 内部反复调用把数字刷飞。
let pinged = false;
export function ping() {
  if (pinged) return;
  pinged = true;
  const base = apiBase();
  if (!base) return;
  try {
    const key = 'pv:' + location.pathname;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* 隐私模式：照发 */ }
  try {
    fetch(base + '/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device': devId() },
      body: JSON.stringify({ p: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* 忽略 */ }
}

// 我是不是管理员（服务端判定，前端只拿来决定要不要显示入口）
export async function whoami() {
  const base = apiBase();
  const t = token();
  if (!base || !t) return { logged: false, admin: false };
  try {
    const r = await fetch(base + '/whoami', { headers: { Accept: 'application/json', Authorization: 'Bearer ' + t } });
    const j = await r.json();
    if (!r.ok || !j) return { logged: false, admin: false };
    return { logged: !!j.logged, admin: !!j.admin, name: j.name || '', uid: j.uid || '' };
  } catch {
    return { logged: false, admin: false };
  }
}

// 一万以上折成「1.2 万」，左上角位置很窄
export function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
}
