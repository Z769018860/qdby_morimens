// 云题库：自建后端优先，公共存储兜底。
// 后端顺序：本站后端（server/worker.js 的 puzzles 表，需登录）→ 自建端点（store:cloudUrl）
//           → GitHub Gist（store:ghToken）→ jsonblob.com
// 保存返回 { id, backend }；读取用 load(id)，先问本站，不认识了再按 id 的老后端去找，
// 这样以前传到 jsonblob / Gist 的题仍然打得开。
import { store } from './common.js';
import { api } from './api.js';
import { auth } from './auth.js';

const PREFIX = 'zjtt-puzzle';
const FILE = 'zjtt-puzzle.json';

const ghToken = {
  get() { return store.get('ghToken', '') || ''; },
  set(v) { store.set('ghToken', String(v || '').trim()); },
};
const customUrl = {
  get() { return store.get('cloudUrl', '') || ''; },
  set(v) { store.set('cloudUrl', String(v || '').trim().replace(/\/+$/, '')); },
};

export const cloudConfig = { ghToken, customUrl };

// 记录 id → 后端，读取时优先直达
const idMap = {
  get() { return store.get('cloudMap', {}) || {}; },
  put(id, backend) {
    const m = this.get();
    m[id] = backend;
    store.set('cloudMap', m);
  },
};

// ---------------------------------------------------------------- 后端实现
const jsonblob = {
  id: 'jsonblob',
  label: 'jsonblob.com',
  async save(obj) {
    const r = await fetch('https://jsonblob.com/api/jsonBlob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(obj),
    });
    const loc = r.headers.get('Location') || '';
    const id = loc.split('/').filter(Boolean).pop() || r.headers.get('X-jsonblob') || '';
    if (!r.ok || !id) throw new Error('jsonblob: ' + r.status);
    return id;
  },
  async load(id) {
    const r = await fetch(`https://jsonblob.com/api/jsonBlob/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('jsonblob: ' + r.status);
    return r.json();
  },
};

const gist = {
  id: 'gist',
  label: 'GitHub Gist',
  async save(obj) {
    const token = ghToken.get();
    if (!token) throw new Error('gist: no token');
    const r = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
      body: JSON.stringify({ description: PREFIX, public: false, files: { [FILE]: { content: JSON.stringify(obj) } } }),
    });
    if (!r.ok) throw new Error('gist: ' + r.status);
    const j = await r.json();
    return j.id;
  },
  async load(id) {
    const r = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('gist: ' + r.status);
    const j = await r.json();
    const f = j.files && (j.files[FILE] || Object.values(j.files)[0]);
    if (!f) throw new Error('gist: empty');
    const raw = f.content ?? (f.raw_url ? await (await fetch(f.raw_url)).text() : '');
    return JSON.parse(raw);
  },
};

const custom = {
  id: 'custom',
  label: 'custom',
  async save(obj) {
    const base = customUrl.get();
    if (!base) throw new Error('custom: no url');
    const r = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(obj),
    });
    if (!r.ok) throw new Error('custom: ' + r.status);
    const j = await r.json().catch(() => ({}));
    const id = j.id || j.key || j.name || r.headers.get('X-Id') || '';
    if (!id) throw new Error('custom: no id');
    return id;
  },
  async load(id) {
    const base = customUrl.get();
    if (!base) throw new Error('custom: no url');
    const r = await fetch(`${base}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('custom: ' + r.status);
    return r.json();
  },
};

// 本站后端：题目进 puzzles 表，别人按 id 直接拉，赞数也跟着题目走
const server = {
  id: 'server',
  label: '本站',
  async save(obj) {
    if (!api.ready() || !auth.logged) throw new Error('server: no login');
    const puzzle = (obj && obj.puzzle) || obj;
    let id = String(puzzle.id || '');
    let data = puzzle;
    for (let i = 0; i < 2; i++) {
      try {
        const d = await api.post('/puzzle', { id, payload: data, title: data.title || '' });
        return String(d.id);
      } catch (e) {
        // id 撞了别人的题：换一个再传，不要覆盖
        if (e && e.code === 'dup_id' && i === 0) {
          id = 'w-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          data = { ...data, id };
          continue;
        }
        throw e;
      }
    }
    throw new Error('server: dup');
  },
  async load(id) {
    const d = await api.get(`/puzzle/${encodeURIComponent(id)}`);
    if (!d || !d.puzzle) throw new Error('server: empty');
    return { kind: PREFIX, v: 2, puzzle: d.puzzle, at: new Date(d.updatedAt || Date.now()).toISOString() };
  },
};

const ALL = { server, jsonblob, gist, custom };

// ---------------------------------------------------------------- 对外接口
export const cloud = {
  // 依次尝试，返回 { id, backend }
  async save(puzzle) {
    const body = { kind: PREFIX, v: 2, puzzle, at: new Date().toISOString() };
    const order = [];
    if (api.ready() && auth.logged) order.push(server);
    if (customUrl.get()) order.push(custom);
    if (ghToken.get()) order.push(gist);
    order.push(jsonblob);
    const errs = [];
    for (const b of order) {
      try {
        const id = await b.save(body);
        idMap.put(id, b.id);
        return { id, backend: b.id, label: b.label };
      } catch (e) {
        errs.push(b.id + ': ' + (e.message || e));
      }
    }
    const err = new Error(errs.join(' | '));
    err.detail = errs;
    throw err;
  },

  async load(id) {
    const known = idMap.get()[id];
    const order = known && ALL[known] ? [ALL[known]] : [];
    if (api.ready() && !order.includes(server)) order.push(server);
    for (const b of [custom, gist, jsonblob]) if (!order.includes(b)) order.push(b);
    const errs = [];
    for (const b of order) {
      try {
        const obj = await b.load(id);
        if (!obj) throw new Error('empty');
        idMap.put(id, b.id);
        return obj;
      } catch (e) {
        errs.push(b.id + ': ' + (e.message || e));
      }
    }
    const err = new Error(errs.join(' | '));
    err.detail = errs;
    throw err;
  },

  // 本站题库列表（别人出的题，可按新到旧或按赞数排）
  async list({ sort = 'new', author = '', limit = 20, offset = 0 } = {}) {
    if (!api.ready()) throw new Error('server: no api');
    const qs = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
    if (author) qs.set('author', author);
    const d = await api.get(`/puzzles?${qs.toString()}`);
    return { items: d.items || [], total: Number(d.total) || 0 };
  },

  // 是否配置了「更稳」的后端（用来在 UI 上提示）
  ready() { return Boolean(api.ready() || ghToken.get() || customUrl.get()); },
};
