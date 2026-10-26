// 云题库：多后端存储。纯静态站点没有自己的服务器，所以按顺序尝试可用的公共存储。
// 后端顺序：自建端点（store:cloudUrl）→ GitHub Gist（store:ghToken）→ jsonblob.com
// 保存返回 { id, backend }；读取用 load(id)，会自动记住 id 属于哪个后端。
import { store } from './common.js';

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

const ALL = { jsonblob, gist, custom };

// ---------------------------------------------------------------- 对外接口
export const cloud = {
  // 依次尝试，返回 { id, backend }
  async save(puzzle) {
    const body = { kind: PREFIX, v: 2, puzzle, at: new Date().toISOString() };
    const order = [];
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

  // 是否配置了「更稳」的后端（用来在 UI 上提示）
  ready() { return Boolean(ghToken.get() || customUrl.get()); },
};
