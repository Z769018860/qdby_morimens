// shared helpers for the game and the codex
import { I18N } from './i18n.js';

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];

export const store = {
  get(k, d) { try { const v = localStorage.getItem('zjtt:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('zjtt:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem('zjtt:' + k); } catch { /* private mode */ } },
};

// ------------------------------------------------------------------ language
// 中英文切换：语言偏好存在 localStorage，名称类字段（en/zh）随语言切换。
export const lang = {
  cur: (store.get('lang', 'zh') === 'en' ? 'en' : 'zh'),
  set(l) { this.cur = (l === 'en' ? 'en' : 'zh'); store.set('lang', this.cur); document.documentElement.lang = this.cur === 'en' ? 'en' : 'zh-CN'; },
  toggle() { this.set(this.cur === 'en' ? 'zh' : 'en'); },
};
document.documentElement.lang = lang.cur === 'en' ? 'en' : 'zh-CN';

// t(key, vars)：取当前语言文案，支持 {x} 占位符
export function t(key, vars = {}) {
  let s = (I18N[lang.cur] && I18N[lang.cur][key]) ?? I18N.zh[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

// 根据当前语言取条目的显示名（e 有 en/zh 字段）
export const nameOf = (e) => (e ? (lang.cur === 'en' ? (e.en || e.zh) : (e.zh || e.en)) : '');

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

// 空状态占位（虚线框 + 居中说明），各面板共用一套视觉
export const emptyState = (text) => h('p', { class: 'empty' }, text);

export function toast(msg, ms = 1800) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

// 本机数据改动 → 通知 js/account.js 排队同步到账号（登录态才推）
export function markDirty(what = '') {
  document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: what }));
}

// 战绩统计的标准字段。云端档案可能是旧版本（或空对象）写进来的，
// 所以读取一律走 statsOf() 补默认值，避免界面出现 undefined。
export const STAT0 = { played: 0, won: 0, streak: 0, best: 0, last: '', fields: 0, totalFields: 0 };
export const statsOf = () => {
  const v = store.get('stats', null);
  return { ...STAT0, ...(v && typeof v === 'object' ? v : {}) };
};

// 主题皮肤：js/theme.js 把算好的变量写进 store('theme')，这里同步恢复，
// 这样任何页面（只要调了 nav）都会立刻带上上次选的 CG 背景。
export function applyThemeSkin() {
  const th = store.get('theme', null);
  const root = document.documentElement;
  if (!th || !th.vars) return;
  for (const [k, v] of Object.entries(th.vars)) root.style.setProperty(`--${k}`, v);
  if (th.img) root.style.setProperty('--theme-img', `url("${new URL(th.img, document.baseURI).href}")`);
  root.setAttribute('data-themed', th.dark ? 'dark' : 'light');
  document.body.classList.add('themed');
}

// 账号（js/auth.js 写入，nav 只读，避免循环依赖）
export const authUser = () => store.get('authUser', null);

export const KINDS = {
  awakener: '唤醒体', wheel: '命轮', covenant: '密契', key: '钥令', creation: '造物', monster: '怪物',
};

// ------------------------------------------------------------------ 银芯 / 失败题库 / 回放
// 银芯就是原来叫「积分」的货币：答对按难度拿银芯，提示与 CG 解锁花银芯。
// 名字与图标都对齐游戏内货币（维基 银芯.png），标识统一走 scIcon()。
export const SC_ICON = 'assets/ui/silvercore.webp';
export function scIcon(size = 14) {
  return h('img', { class: 'sc-ico', src: SC_ICON, alt: '', width: size, height: size, decoding: 'async' });
}
// 图标 + 数字，例如 nav 里的「🪙 500」
export function scNum(n, size = 14) {
  return h('span', { class: 'sc-num' }, scIcon(size), h('b', {}, String(n)));
}

export const wallet = {
  get() { return Number(store.get('credits', 0)) || 0; },
  add(n) { const v = this.get() + Math.max(0, Math.round(n)); store.set('credits', v); markDirty('credits'); return v; },
  spend(n) {
    if (this.get() < n) return false;
    store.set('credits', this.get() - n);
    markDirty('credits');
    return true;
  },
};

// 彻底失败（用完次数仍未还原）的题目 id：永久移出题池，只能去失败题库看答案
export const failedBank = {
  list() { return store.get('failed', []); },
  has(id) { return this.list().includes(id); },
  add(id) {
    const l = this.list();
    if (!l.includes(id)) { l.push(id); store.set('failed', l); markDirty('failed'); }
  },
};

// 官方回放 & 忘忘看报的复盘工具
export const REPLAY = {
  json: (uuid) => `https://z1g-warreport.qookkagames.com/publish/BattleReplay_${uuid}.json`,
  review: 'https://z769018860.github.io/qdby_chinese/morimens-tools.html#replay',
};

// 典藏馆解锁记录
export const unlocked = {
  list() { return store.get('cg', []); },
  has(id) { return this.list().includes(id); },
  add(id) { const l = this.list(); if (!l.includes(id)) { l.push(id); store.set('cg', l); markDirty('cg'); } return l; },
};

// 题目分享码：ZJ2-<base64url(JSON)>，工坊与推理页共用
function b64uEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - b.length % 4) % 4));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
export const shareCode = {
  enc(obj) { return 'ZJ2-' + b64uEncode(JSON.stringify(obj)); },
  dec(code) {
    try {
      const s = String(code || '').trim();
      if (!s) return null;
      return JSON.parse(b64uDecode(s.replace(/^ZJ2-/, '')));
    } catch { return null; }
  },
};

// 分类名称（中英）
export const KIND_EN = { awakener: 'Awakener', wheel: 'Wheel of Destiny', covenant: 'Covenant', key: 'Key Token', creation: 'Relic', monster: 'Monster' };
export const kindName = (k) => (lang.cur === 'en' ? KIND_EN[k] : KINDS[k]);

export async function loadDict() {
  const [D] = await Promise.all([fetch('data/dictionary.json').then(r => r.json()), loadKeywords()]);
  const idx = {};
  for (const k of Object.keys(KINDS)) idx[k] = new Map(D[k].filter(e => e.id != null).map(e => [String(e.id), e]));
  return { D, idx };
}

export function imgEl(src, alt = '', cls = '') {
  // 没有图就直接给个占位方块：既不会请求坏图，也不会在图片统计里算成 broken
  if (!src) return h('span', { class: `imgph ${cls}`.trim(), title: alt || '' });
  const i = h('img', { src, alt, loading: 'lazy', class: cls });
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

function avatarEntry() {
  const u = authUser();
  const src = (u && u.avatar) || 'assets/avatars-q/char-albino.webp';
  return h('a', { class: 'avatar-chip', href: 'profile.html', title: u ? t('myCenter') : t('login') },
    h('img', { src, alt: '', width: 26, height: 26, loading: 'lazy' }),
    h('span', {}, u ? u.name : t('login')));
}

export function nav(active) {
  applyThemeSkin();
  const langBtn = h('button', {
    class: 'langbtn', type: 'button', title: '中文 / English',
    onclick: () => { lang.toggle(); location.reload(); },
  }, lang.cur === 'en' ? '中文' : 'EN');
  // 同步页脚语言
  const foot = document.querySelector('.foot');
  if (foot) foot.textContent = t('aboutFoot');
  const credits = h('span', { class: 'credits', title: t('creditsTip') }, scNum(wallet.get(), 17));
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: 'index.html' }, h('b', {}, t('brand')), h('small', {}, t('brandSub'))),
    h('nav', {},
      h('a', { href: 'index.html', class: active === 'game' ? 'on' : '' }, t('navGame')),
      h('a', { href: 'gallery.html', class: active === 'gallery' ? 'on' : '' }, t('navGallery')),
      h('a', { href: 'workshop.html', class: active === 'workshop' ? 'on' : '' }, t('navWorkshop')),
      h('a', { href: 'codex.html', class: active === 'codex' ? 'on' : '' }, t('navCodex')),
      h('a', { href: 'about.html', class: active === 'about' ? 'on' : '' }, t('navAbout'))),
    h('div', { class: 'navright' }, credits, avatarEntry(), langBtn));
}

// ------------------------------------------------------------------ keywords
// Texts in data/*.json mark keywords as ⟦slug|文字⟧ (see scripts/i18n_lib.py)
export const KW = { list: [], by: {} };
export async function loadKeywords() {
  if (!KW.list.length) {
    KW.list = await (await fetch('data/keywords.json')).json();
    KW.by = Object.fromEntries(KW.list.map(k => [k.s, k]));
  }
  return KW;
}
export const KW_TYPE = { realm: '界域', mechanic: '状态 / 机制', tag: '标签', help: '说明' };
const MARK = /⟦([^|⟧]+)\|([^⟧]*)⟧/g;
export const plain = t => (t || '').replace(MARK, '$2');
export const slugsIn = t => [...new Set([...(t || '').matchAll(MARK)].map(m => m[1]))];

export function kwChip(slug, text) {
  const k = KW.by[slug];
  if (!k) return document.createTextNode(text);
  const cls = k.t === 'realm' ? `realm-${k.s}` : (k.c || 'misc');
  const b = h('button', { type: 'button', class: `kw kw-${cls}`, 'data-s': slug, title: `${k.n}：${plain(k.d).replace(/\s+/g, ' ').slice(0, 150)}`,
    onclick: e => { e.stopPropagation(); showKwPop(slug, b); } },
    k.i ? h('img', { src: k.i, alt: '' }) : null, text);
  return b;
}

export function renderText(t) {
  const frag = document.createDocumentFragment();
  let pos = 0;
  for (const m of (t || '').matchAll(MARK)) {
    if (m.index > pos) frag.append(t.slice(pos, m.index));
    frag.append(kwChip(m[1], m[2]));
    pos = m.index + m[0].length;
  }
  if (pos < (t || '').length) frag.append(t.slice(pos));
  return frag;
}

export function kwIcon(k, size = 28) {
  if (k.i) return h('img', { src: k.i, alt: '', class: 'kwicon', width: size, height: size });
  const cls = k.t === 'realm' ? `realm-${k.s}` : (k.c || 'misc');
  return h('span', { class: `kwicon glyph kw-${cls}`, style: `width:${size}px;height:${size}px;font-size:${size * .55}px` }, k.n.slice(0, 1));
}

let pop;
export function showKwPop(slug, anchor) {
  const k = KW.by[slug];
  if (!k) return;
  if (!pop) {
    pop = h('div', { class: 'kwpop', role: 'dialog' });
    document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) pop.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) pop.hidden = true; });
  }
  pop.replaceChildren(
    h('div', { class: 'kwhead' }, kwIcon(k, 32), h('b', {}, k.n), h('small', {}, k.e)),
    h('div', { class: 'kwdesc' }, renderText(k.d)),
    h('a', { class: 'kwlink', href: `codex.html#tab=awakener&kw=${slug}` }, '在图鉴中筛选包含此关键词的条目 →'));
  (anchor.closest('dialog') || document.body).append(pop); // keep it above modal dialogs
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = Math.min(360, innerWidth - 16);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = '0px';
  const hgt = pop.offsetHeight;
  pop.style.top = (r.bottom + hgt + 12 > innerHeight && r.top > hgt + 12 ? r.top - hgt - 6 : r.bottom + 6) + 'px';
}
