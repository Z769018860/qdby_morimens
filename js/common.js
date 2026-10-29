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
// 用 split/join 而不是 replaceAll：后者要 Chrome 85+ / Safari 13.1+，
// 老一点的手机内置浏览器直接抛 TypeError，整页文案全变成报错。
export function t(key, vars = {}) {
  let s = (I18N[lang.cur] && I18N[lang.cur][key]) ?? I18N.zh[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
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

// 页面上所有银芯数字都带 data-sc="图标尺寸"，花/加之后统一就地重绘，
// 免得顶栏还显示旧值（不用整页 render）。
export function syncCreditsDom() {
  const n = wallet.get();
  document.querySelectorAll('[data-sc]').forEach((el) => {
    el.replaceChildren(scNum(n, Number(el.getAttribute('data-sc')) || 14));
  });
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

// 主题面板色是 rgba(…, .72)：直接铺在明亮的 CG 上会把卡片冲成一片白。
// 这里按同色系提高不透明度再与底色混合，得到「实心」面板色给卡片用。
export function parseColor(c) {
  if (!c) return null;
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const q = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
    if (q.length >= 3 && q.slice(0, 3).every((x) => !Number.isNaN(x))) return [q[0], q[1], q[2], q.length > 3 ? q[3] : 1];
  }
  return null;
}

export function solidOf(panel, bg) {
  const p = parseColor(panel);
  const b = parseColor(bg) || [0, 0, 0, 1];
  if (!p) return panel;
  const a = Math.min(1, (p[3] == null ? 1 : p[3]) + 0.18);
  const mix = (x, y) => Math.round(x * a + y * (1 - a));
  return `rgb(${mix(p[0], b[0])}, ${mix(p[1], b[1])}, ${mix(p[2], b[2])})`;
}

// 主题皮肤：js/theme.js 把算好的变量写进 store('theme')，这里同步恢复，
// 这样任何页面（只要调了 nav）都会立刻带上上次选的 CG 背景。
export function themeVars(th) {
  const root = document.documentElement;
  if (!th || !th.vars) return;
  for (const [k, v] of Object.entries(th.vars)) root.style.setProperty(`--${k}`, v);
  const p2 = solidOf(th.vars.panel2, th.vars.bg);
  root.style.setProperty('--panel-solid', solidOf(th.vars.panel, th.vars.bg));
  root.style.setProperty('--panel2-solid', p2);
  // 卡片内部的小面板（统计块 / 签到条 / 槽位…）直接吃面板色，不再把 CG 透进来
  root.style.setProperty('--panel2', p2);
  if (th.img) root.style.setProperty('--theme-img', `url("${new URL(th.img, document.baseURI).href}")`);
  root.setAttribute('data-themed', th.dark ? 'dark' : 'light');
  document.body.classList.add('themed');
}

export function applyThemeSkin() {
  themeVars(store.get('theme', null));
  upgradeThemeImage();
}

// 早期版本把 900 宽缩略图存成了背景，这里在进页面后悄悄换成 1920 宽的大图。
// 走 store 而不是 theme.js，避免 common ←→ theme 循环依赖。
let themeImgChecked = false;
export async function upgradeThemeImage() {
  if (themeImgChecked) return;
  themeImgChecked = true;
  const th = store.get('theme', null);
  if (!th || !th.vars || !th.id) return;
  try {
    const r = await fetch('data/gallery.json', { cache: 'force-cache' });
    const g = await r.json();
    const it = (g.items || []).find((x) => x.id === th.id);
    const want = it && (it.big || it.f);
    if (want && want !== th.img) {
      th.img = want;
      store.set('theme', th);
      themeVars(th);
    }
  } catch { /* 没有图库就保持原样 */ }
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
  add(n) { const v = this.get() + Math.max(0, Math.round(n)); store.set('credits', v); markDirty('credits'); syncCreditsDom(); return v; },
  spend(n) {
    if (this.get() < n) return false;
    store.set('credits', this.get() - n);
    markDirty('credits');
    syncCreditsDom();
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

// ------------------------------------------------------------------ 配队规则
// 忘却前夜的界域（阵营）规则：除「混沌」外，唤醒体只能与「自身界域 + 混沌」同队。
// 换成可以直接判定的说法：一支队伍里，混沌以外的界域最多只能出现一种。
// 所以队伍已有「血肉」和「混沌」时，再填「超维」就是非法配队——填不进去。
export const REALM_CHAOS = '混沌';

// 队内已经确定的「锚界域」（混沌不算）：返回第一个非混沌界域，没有则空串
export const realmAnchor = (realms) => {
  const list = (realms || []).map(String).filter(Boolean);
  const hit = list.find(r => r !== REALM_CHAOS);
  return hit || '';
};

// 候选界域能不能进这支队伍
export function realmFits(realms, candidate) {
  const c = String(candidate || '');
  if (!c || c === REALM_CHAOS) return true;   // 混沌跟谁都能组
  const a = realmAnchor(realms);
  return !a || a === c;
}

// 界域名的中英显示（字典里只有中文名，英文界面按官方译名兜底）
export const REALM_EN_ZH = { 深海: 'Aequor', 混沌: 'Chaos', 血肉: 'Caro', 超维: 'Ultra', 褪色遗产: 'Faded Legacy', 通用: 'Universal', 其他: 'Other' };
export const realmName = (r) => (lang.cur === 'en' ? (REALM_EN_ZH[r] || r) : r);

// bootP：页面 HTML 里已经开拉的 data/boot.json（字典/标签/关键词/索引合成的一个请求）。
// 各页面不用自己传参，这里兜底复用，省掉「字典、关键词、标签各来一次」的三个轮次。
const bootDataP = () => (typeof window !== 'undefined' && window.__boot && window.__boot.data) || null;

export async function loadDict(prefetched, kwPrefetched) {
  const boot = bootDataP();
  const bootDict = (typeof window !== 'undefined' && window.__boot && window.__boot.dict) || null;
  const dictP = prefetched
    || bootDict
    || (boot ? boot.then(j => j.dict) : fetch('data/dictionary.json').then(r => r.json()));
  const kwP = kwPrefetched || (boot ? boot.then(j => j.kw) : null);
  const [D] = await Promise.all([dictP, loadKeywords(kwP)]);
  const idx = {};
  for (const k of Object.keys(KINDS)) idx[k] = new Map(D[k].filter(e => e.id != null).map(e => [String(e.id), e]));
  return { D, idx };
}

// ------------------------------------------------------------------ SHA-256
// 题库答案是拿 SHA-256 当密钥流异或出来的（见 scripts/build_data.py）。
// 优先用浏览器的 crypto.subtle —— 但它在「非安全上下文」里是 undefined：
// 手机上从 http 打开、或在某些内置浏览器 / WebView 里，题目就会「解码失败」、
// 一题都出不来。所以带一份纯 JS 的实现兜底，慢一点但一定能用。
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Raw(bytes) {
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length;
  // padding：0x80 + 若干 0 + 64 位长度
  const withPad = new Uint8Array((((len + 9) + 63) >> 6) << 6);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const bits = len * 8;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bits >>> 0, false);
  dv.setUint32(withPad.length - 8, Math.floor(bits / 4294967296), false);

  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  H.forEach((x, i) => odv.setUint32(i * 4, x >>> 0, false));
  return out;
}

// 字符串 → SHA-256 字节；crypto.subtle 不可用（http / 老内置浏览器）时走纯 JS
export async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof crypto !== 'undefined' && crypto && crypto.subtle && crypto.subtle.digest) {
    try { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); } catch { /* 落到下面 */ }
  }
  return sha256Raw(bytes);
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
  const credits = h('span', { class: 'credits', title: t('creditsTip'), 'data-sc': 17 }, scNum(wallet.get(), 17));
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: 'index.html', title: t('navHome') }, h('b', {}, t('brand')), h('small', {}, t('brandSub'))),
    h('nav', {},
      h('a', { href: 'detective.html', class: active === 'game' ? 'on' : '' }, t('navGame')),
      h('a', { href: 'gallery.html', class: active === 'gallery' ? 'on' : '' }, t('navGallery')),
      h('a', { href: 'workshop.html', class: active === 'workshop' ? 'on' : '' }, t('navWorkshop')),
      h('a', { href: 'codex.html', class: active === 'codex' ? 'on' : '' }, t('navCodex')),
      h('a', { href: 'about.html', class: active === 'about' ? 'on' : '' }, t('navAbout'))),
    h('div', { class: 'navright' }, credits, avatarEntry(), langBtn));
}

// ------------------------------------------------------------------ keywords
// Texts in data/*.json mark keywords as ⟦slug|文字⟧ (see scripts/i18n_lib.py)
export const KW = { list: [], by: {} };
export async function loadKeywords(prefetched) {
  if (!KW.list.length) {
    KW.list = prefetched
      ? await prefetched
      : await (await fetch('data/keywords.json')).json();
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
