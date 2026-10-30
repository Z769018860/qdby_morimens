// 极简 DOM 打桩，用来跑通各页面的模块初始化（发现运行期错误）
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';

import { fileURLToPath } from 'node:url';
// 仓库根目录：脚本在 scripts/ 下，往上一级（不再写死某台开发机的盘符）
const ROOT = process.env.MORIMENS_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

class El {
  constructor(tag = 'div') {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.style = {};
    this.dataset = {};
    this._attrs = {};
    this._text = '';
    this.className = '';
    this.hidden = false;
    this.open = false;
    this.classList = {
      add: (...c) => { this.className += ' ' + c.join(' '); },
      remove: () => {},
      toggle: () => {},
      contains: () => false,
    };
  }
  set innerHTML(v) { this._html = v; }
  get innerHTML() { return this._html || ''; }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map(c => c.textContent || '').join(''); }
  setAttribute(k, v) { this._attrs[k] = v; if (k === 'class') this.className = v; }
  getAttribute(k) { return this._attrs[k]; }
  removeAttribute(k) { delete this._attrs[k]; }
  addEventListener() {}
  removeEventListener() {}
  append(...kids) { for (const k of kids) if (k && k.nodeType !== 3) this.children.push(k); }
  prepend(...kids) { this.children.unshift(...kids); }
  replaceChildren(...kids) { this.children = kids.filter(Boolean); }
  remove() { this.removed = true; }
  closest() { return null; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
  showModal() { this.open = true; }
  close() { this.open = false; }
  getBoundingClientRect() { return { left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0 }; }
  get offsetHeight() { return 0; }
  get firstChild() { return this.children[0] || null; }
}

const body = new El('body');
const html = new El('html');

globalThis.document = {
  body, documentElement: html,
  createElement: (t) => new El(t),
  createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
  createDocumentFragment: () => new El('fragment'),
  querySelector: (s) => (s === '.foot' ? null : new El()),
  querySelectorAll: () => [],
  addEventListener: () => {},
};
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.location = { href: 'http://x/', search: '', hash: '', reload() {} };
globalThis.history = { replaceState() {} };
try { Object.defineProperty(globalThis, 'navigator', { value: { clipboard: null }, configurable: true }); } catch (e) { /* ignore */ }
/* crypto 在 Node 22 上已是全局，无需注入 */
globalThis.innerWidth = 1200;
globalThis.innerHeight = 800;
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
globalThis.fetch = async (url) => {
  const p = path.join(ROOT, String(url).split('?')[0]);
  if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  const txt = fs.readFileSync(p, 'utf8');
  return { ok: true, status: 200, json: async () => JSON.parse(txt), text: async () => txt, headers: { get: () => '' } };
};

const pages = ['game', 'gallery', 'workshop', 'codex'];
for (const name of pages) {
  try {
    await import('file:///' + path.join(ROOT, 'js', name + '.js').replace(/\\/g, '/') + '?v=' + Date.now());
    console.log('OK  ', name);
  } catch (e) {
    console.log('FAIL', name, '->', e.message);
    console.log((e.stack || '').split('\n').slice(0, 4).join('\n'));
  }
}
