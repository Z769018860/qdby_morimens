// 后端客户端：所有需要服务端记账的请求都从这里走。
//
// 服务端是 Cloudflare Worker + D1（代码在 server/），三个模块：
//   · 点赞     —— (题目, 身份) 唯一 + 每日额度由服务端计
//   · 账号档案 —— 带版本号，多端同时改不会互相覆盖
//   · 工坊题库 —— 自建题存在服务端，别人按 id 直接拉
//
// 地址优先取 store 里的 apiBase（设置里可改，方便临时指向本地 wrangler dev），
// 其次是下面的常量。本地开发（localhost 且不是 Worker 自己的 8787 端口）自动指向 127.0.0.1:8787。
import { store } from './common.js';

// 部署后把这里换成自己的 Worker 地址（wrangler deploy 会把地址打出来）
// 用 `node scripts/set_api_base.mjs https://…workers.dev` 改这一行，别手改错。
export const API_BASE = 'https://zjtt-api.workers.dev';

// 还是占位符就当作「没配后端」：各模块退回纯本机模式，不会去打一个不存在的域名
const PLACEHOLDER = 'https://zjtt-api.workers.dev';

// 本地开发：站点由 scripts/preview.mjs 起在 8899（可用 PREVIEW_SITE_PORT 改），
// 后端用 `node server/node.js`（默认 8787，这里按 8795 起；换端口就改这一行，
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
