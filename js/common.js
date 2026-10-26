// shared helpers for the game and the codex
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

export const store = {
  get(k, d) { try { const v = localStorage.getItem('zjtt:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('zjtt:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

export const KINDS = {
  awakener: '唤醒体', wheel: '命轮', covenant: '密契', key: '钥令', creation: '造物', monster: '怪物',
};

export async function loadDict() {
  const D = await (await fetch('data/dictionary.json')).json();
  const idx = {};
  for (const k of Object.keys(KINDS)) idx[k] = new Map(D[k].filter(e => e.id != null).map(e => [String(e.id), e]));
  return { D, idx };
}

export function imgEl(src, alt = '', cls = '') {
  const i = h('img', { src: src || '', alt, loading: 'lazy', class: cls });
  if (!src) i.style.visibility = 'hidden';
  i.addEventListener('error', () => { i.style.visibility = 'hidden'; });
  return i;
}

export const wan = n => {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + ' 万';
  return String(n);
};

export const RARITY_CLASS = { SSR: 'r-ssr', SR: 'r-sr', R: 'r-r' };

export function nav(active) {
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: 'index.html' }, h('b', {}, '战报侦探'), h('small', {}, '忘却前夜 · 同人推理')),
    h('nav', {},
      h('a', { href: 'index.html', class: active === 'game' ? 'on' : '' }, '推理'),
      h('a', { href: 'codex.html', class: active === 'codex' ? 'on' : '' }, '图鉴'),
      h('a', { href: 'about.html', class: active === 'about' ? 'on' : '' }, '说明')));
}
