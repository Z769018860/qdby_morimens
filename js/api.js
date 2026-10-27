// 后端客户端：所有需要服务端记账的请求都从这里走。
//
// 线上跑的是 EdgeOne Pages 的 Edge Functions + KV（代码在 edge-functions/api/），
// 和站点同域同证书，所以没有跨域、也没有 https 页面调 http 接口被拦的问题。
// 另外还留着两份等价实现，规则逐条对齐：
//   · server/worker.js  —— Cloudflare Worker + D1
//   · server/node.js    —— Node + 内置 SQLite（自托管 / Docker）
//
// 三个模块：点赞（每人每天 10 次、同题只能赞一次）、账号档案（带版本号乐观锁）、工坊题库。
//
// 地址优先取 store 里的 apiBase（设置里可改，方便临时指向本地后端），其次是下面的常量。
import { store } from './common.js';

// 部署后把这里换成接口地址（末尾要带 /api）。只有「站点不在自家域名下」时才会用到它，
// 比如 GitHub Pages 那份镜像站；站点本身就部署在 EdgeOne 上时走同源 /api，不用配。
// 用 `node scripts/set_api_base.mjs https://<你的域名>/api` 改这一行，别手改错。
export const API_BASE = 'https://zjtt-api.workers.dev';

// 还是占位符就当作「没配后端」：各模块退回纯本机模式，不会去打一个不存在的域名
const PLACEHOLDER = 'https://zjtt-api.workers.dev';

// 本地开发：站点由 scripts/preview.mjs 起在 8899（可用 PREVIEW_SITE_PORT 改），
// 后端用 `node server/node.js`（这里按 8795 起；换端口就改这一行，
// 或在控制台 store.set('apiBase', 'http://127.0.0.1:端口') 临时覆盖）
const LOCAL = 'http://127.0.0.1:8795';

export class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.data = data || null;
  }
}

function isLocalDev() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

export const api = {
  get base() {
    const custom = String(store.get('apiBase', '') || '').trim().replace(/\/+$/, '');
    if (custom) return custom;
    if (isLocalDev()) return LOCAL;
    // 站点和函数在同一个项目里（EdgeOne 的自定义域名、预览域都算）就直接同源调，
    // 好处是换域名、换预览地址都不用改代码，也不会因为域名写错打到别人的站上
    if (!/\.github\.io$/i.test(location.hostname)) return location.origin + '/api';
    // 只剩 GitHub Pages 镜像站这种异源情况，才需要绝对地址
    return String(API_BASE || '').replace(/\/+$/, '');
  },

  set base(v) {
    const s = String(v || '').trim().replace(/\/+$/, '');
    if (s) store.set('apiBase', s); else store.del('apiBase');
  },

  // 有没有可用的后端地址（没配好时各模块自动退回本机模式）
  ready() {
    const b = this.base;
    return Boolean(b) && b !== PLACEHOLDER;
  },

  // 本机随机身份：游客点赞、未登录时的「我赞过谁」都靠它
  devId() {
    let v = store.get('likeDev', '');
    if (!v) {
      v = Math.random().toString(36).slice(2, 10);
      store.set('likeDev', v);
    }
    return v;
  },

  token() { return store.get('authToken', '') || ''; },

  async call(path, { method = 'GET', body, timeout = 9000 } = {}) {
    const base = this.base;
    if (!this.ready()) throw new ApiError(0, 'no_api');

    const headers = { Accept: 'application/json', 'X-Dev-Id': this.devId() };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const tmr = ac ? setTimeout(() => ac.abort(), timeout) : 0;
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ac ? ac.signal : undefined,
      });
    } catch (e) {
      throw new ApiError(0, /abort/i.test(String((e && e.name) || e)) ? 'timeout' : 'offline');
    } finally {
      if (tmr) clearTimeout(tmr);
    }

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok || (data && data.ok === false)) {
      throw new ApiError(res.status, (data && data.error) || `http_${res.status}`, data);
    }
    return data;
  },

  get(path) { return this.call(path); },
  post(path, body) { return this.call(path, { method: 'POST', body }); },
  put(path, body) { return this.call(path, { method: 'PUT', body }); },
  del(path) { return this.call(path, { method: 'DELETE' }); },
};
