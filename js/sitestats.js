// 站点计数 + 打点 + 「我是不是管理员」。
//
// 左上角那三个数（注册用户 / 今日浏览 / 总浏览）来自 edge-functions 的 /stats。
// 边缘一个来回 1~2 秒，所以这里做三件事，避免每页都去问一遍：
//   1. 结果缓存 60 秒（localStorage），过期了先给旧数、后台再刷新；
//   2. 打点 POST /visit 走 keepalive 且不 await，页面跳走也不会被取消；
//   3. 后端不可用时给缓存值，界面显示「—」而不是把整块藏起来。
import { store } from './common.js';

const CACHE = 'site:stats';       // 上一次拿到的数字
const TTL = 60e3;
const LIVE = 'site:api';          // 探测结果：{ base, at, v, store, storeOk }
const LIVE_TTL = 10 * 60e3;

// GitHub Pages 那份镜像没有自己的后端。但 EdgeOne 那套函数回了 CORS
// （Access-Control-Allow-Origin 回显请求方，OPTIONS 也放行 Authorization），
// 所以镜像站可以跨域读统计、也能调管理接口。
//
// 这条别删：删了镜像站上三个数永远是「—」，管理页永远说「你不是站长」——
// 因为前端连请求都没发，只能当没登录/没权限。
export const EDGE_API = 'https://morimens.qingdengbuyi.top/api';

// 候选后端，按优先级排队：手填的 → 同源 → EdgeOne
function candidates() {
  const out = [];
  try {
    const custom = String(store.get('apiBase', '') || '').trim().replace(/\/+$/, '');
    if (custom) out.push(custom);
  } catch { /* 隐私模式 */ }
  try {
    if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname)) {
      out.push(location.origin + '/api');
    }
  } catch { /* 非浏览器环境 */ }
  if (out.indexOf(EDGE_API) < 0) out.push(EDGE_API);
  return out;
}

function liveCache() {
  const v = store.get(LIVE, null);
  return v && v.base && Date.now() - Number(v.at || 0) < LIVE_TTL ? v : null;
}

// 带超时的 fetch。
// 探活只是「顺手问一句」，一处来回本来 1~2 秒；没有上限的话，碰上挂住的后端
// 整个页面就停在那儿（管理页的「正在检查后端…」就是这么卡住的）。
// 不用 Promise.prototype.finally：Safari 11 没有，老浏览器会直接抛 TypeError。
function fetchT(url, opts, ms) {
  if (typeof AbortController !== 'function') return fetch(url, opts);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms || 6000);
  const stop = () => clearTimeout(timer);
  const o = Object.assign({}, opts, { signal: ac.signal });
  return fetch(url, o).then((r) => { stop(); return r; }, (e) => { stop(); throw e; });
}

// 当前该打哪个后端。管理页要自己拼 Authorization（不走 js/api.js），从这里取。
export function base() {
  const hit = liveCache();
  if (hit) return hit.base;
  const list = candidates();
  return list[0] || '';
}

// 探一次活的后端，结果缓存 10 分钟；返回 '' 表示一个都不通。
// 判定用 service==='zjtt' 而不是 r.ok：/health 在存储没配好时是 503，
// 但那种情况正需要报给用户（说明接口在、存储坏了），不能当成「后端不存在」。
export async function probe(force = false) {
  if (!force) {
    const hit = liveCache();
    if (hit) return hit.base;
  }
  for (const b of candidates()) {
    try {
      const r = await fetchT(b + '/health', { headers: { Accept: 'application/json' } }, 6000);
      const j = await r.json().catch(() => null);
      if (j && j.service === 'zjtt') {
        store.set(LIVE, {
          base: b, at: Date.now(), v: Number(j.v) || 0,
          store: String(j.store || ''), storeOk: !!j.storeOk,
        });
        return b;
      }
    } catch { /* 试下一个 */ }
  }
  return '';
}

// 后端版本 + 存储状态。管理页用它区分「函数没部署」和「你没权限」——
// 这两种情况在前端看起来都是「进不去」，但处理办法完全不同。
export async function health(force = true) {
  const b = await probe(force);
  if (!b) return { ok: false, base: '', v: 0, store: '', storeOk: false };
  const hit = store.get(LIVE, null) || {};
  return { ok: true, base: b, v: Number(hit.v) || 0, store: hit.store || '', storeOk: !!hit.storeOk };
}

const pick = (j) => ({
  users: Number(j && j.users) || 0,
  today: Number(j && j.today) || 0,
  total: Number(j && j.total) || 0,
});

export function cached() {
  const c = store.get(CACHE, null);
  return c && typeof c === 'object' && Number.isFinite(Number(c.total)) ? pick(c) : null;
}

// 拿最新数字：force=false 时优先给缓存（同时在后台刷新）
export async function stats(force = false) {
  const c = store.get(CACHE, null);
  const fresh = c && Date.now() - Number(c.at || 0) < TTL;
  if (c && fresh && !force) return pick(c);

  const b = await probe();
  if (!b) return c ? pick(c) : null;
  try {
    const r = await fetchT(b + '/stats', { headers: { Accept: 'application/json' } }, 8000);
    const j = await r.json();
    if (!r.ok || !j || j.ok === false) throw new Error('bad');
    const out = pick(j);
    store.set(CACHE, { ...out, at: Date.now() });
    return out;
  } catch {
    return c ? pick(c) : null;
  }
}

// 浏览打点。同一页面同一次会话只算一次（刷新算新的一次，符合 PV 口径），
// 免得 SPA 内部反复调用把数字刷飞。
let pinged = false;
export async function ping() {
  if (pinged) return;
  pinged = true;
  try {
    const key = 'pv:' + location.pathname;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* 隐私模式：照发 */ }

  const b = await probe();
  if (!b) return;
  try {
    fetch(b + '/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device': devId() },
      body: JSON.stringify({ p: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* 忽略 */ }
}

const token = () => { try { return store.get('authToken', '') || ''; } catch { return ''; } };
const devId = () => {
  let v = store.get('did', '');
  if (!v) { v = 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('did', v); }
  return v;
};

// 我是不是管理员（服务端判定，前端只拿来决定要不要显示入口）
//
// 返回值里的 error 很重要，别一律当「没权限」：
//   no_token  本机没登录
//   no_api    一个后端都连不上
//   old_api   后端是老版本，没有 /whoami（需要重新部署 edge-functions）
//   http_xxx  其他状态码
export async function whoami() {
  const t = token();
  if (!t) return { logged: false, admin: false, error: 'no_token' };

  const b = await probe();
  if (!b) return { logged: true, admin: false, error: 'no_api' };

  try {
    const r = await fetchT(b + '/whoami', {
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + t },
    }, 8000);
    const j = await r.json().catch(() => null);
    // 老后端没有这个路由，返回的是 404 + {"ok":false,"error":"not_found"}
    if (r.status === 404) return { logged: true, admin: false, error: 'old_api', status: 404, base: b };
    if (!r.ok || !j) return { logged: true, admin: false, error: 'http_' + r.status, status: r.status, base: b };
    return {
      logged: !!j.logged, admin: !!j.admin,
      name: j.name || '', uid: j.uid || '',
      reason: j.reason || '', pinned: j.pinned || '', hint: j.hint || '',
      base: b,
    };
  } catch {
    return { logged: true, admin: false, error: 'offline', base: b };
  }
}

// 一万以上折成「1.2 万」，左上角位置很窄
export function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
}
