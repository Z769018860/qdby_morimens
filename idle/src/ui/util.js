export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const img = (p) => (p ? `public/${p}` : '');
export const fmt = (n) => {
  n = Number(n);
  if (!Number.isFinite(n)) return '—';
  n = Math.round(n);
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
};
export const dur = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}小时${m}分` : `${m}分钟`; };

const KEY = 'morimens-idle-save-v1';
/* 存档放两处：localStorage（主）+ IndexedDB（镜像）。
   手机浏览器会在这几种情况下只丢掉其中一份：localStorage 配额被同源别的小游戏占满（写入静默失败）、
   内置浏览器 / 省电清理只清 localStorage、存档读出来损坏。镜像保证「再进来是上一次的进度」而不是从头开始。
   每次存档 state.rev +1，启动时两份取 rev 大的；rev 相同优先 localStorage。 */
const IDB = { name: 'morimens-idle', store: 'save', key: 'main' };
function idbOpen() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no idb'));
    const r = indexedDB.open(IDB.name, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB.store);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
const idbPut = (text) => idbOpen().then((db) => new Promise((res, rej) => {
  const tx = db.transaction(IDB.store, 'readwrite');
  tx.objectStore(IDB.store).put(text, IDB.key);
  tx.oncomplete = () => { db.close(); res(true); };
  tx.onerror = () => { db.close(); rej(tx.error); };
})).catch(() => false);
const idbGet = () => idbOpen().then((db) => new Promise((res) => {
  const q = db.transaction(IDB.store).objectStore(IDB.store).get(IDB.key);
  q.onsuccess = () => { db.close(); res(q.result || null); };
  q.onerror = () => { db.close(); res(null); };
})).catch(() => null);
const idbClear = () => idbOpen().then((db) => new Promise((res) => {
  const tx = db.transaction(IDB.store, 'readwrite');
  tx.objectStore(IDB.store).delete(IDB.key);
  tx.oncomplete = () => { db.close(); res(true); };
  tx.onerror = () => { db.close(); res(false); };
})).catch(() => false);
const parse = (t) => { try { const v = JSON.parse(t); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; } };

let lastMirror = 0, mirrorTimer = 0, pendingText = null;
export const store = {
  failed: 0,                                   // localStorage 写入失败次数（配额满 / 无痕模式）
  read() { try { return parse(localStorage.getItem(KEY)); } catch { return null; } },
  // 启动时用：两份里取 rev 大的。读出来损坏的那份先备份一下，别被下一次存档悄悄覆盖。
  async readBest() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { /* ignore */ }
    const ls = parse(raw);
    if (raw && !ls) { try { localStorage.setItem(KEY + '-corrupt', raw); } catch { /* ignore */ } }
    const idbText = await idbGet();
    const db = parse(idbText);
    if (db && (!ls || (db.rev || 0) > (ls.rev || 0))) return { state: db, from: ls ? 'idb-newer' : 'idb' };
    return { state: ls, from: ls ? 'ls' : 'none' };
  },
  write(s) {
    let text;
    try { text = JSON.stringify(s); } catch { return false; }
    let ok = true;
    try { localStorage.setItem(KEY, text); } catch { ok = false; store.failed++; }
    // IndexedDB 镜像：5 秒内最多落一次，免得每次存档都开事务
    pendingText = text;
    const now = Date.now();
    const flush = () => { mirrorTimer = 0; lastMirror = Date.now(); const t = pendingText; pendingText = null; if (t) idbPut(t); };
    if (now - lastMirror > 5000) flush();
    else if (!mirrorTimer) mirrorTimer = setTimeout(flush, 5000 - (now - lastMirror));
    return ok;
  },
  flush() { if (pendingText) { const t = pendingText; pendingText = null; idbPut(t); } },
  clear() { pendingText = null; try { localStorage.removeItem(KEY); } catch { /* ignore */ } return idbClear(); },
  parse,
  KEY,
};
// 申请「持久存储」：被允许后浏览器在空间紧张时不会优先清掉这份数据（iOS Safari / 部分安卓浏览器有效）
export const askPersist = () => { try { return navigator.storage?.persist?.() || Promise.resolve(false); } catch { return Promise.resolve(false); } };

// 单例 toast：后一条覆盖前一条，避免连点时两条叠在一起糊住屏幕
let toastEl = null, toastTimer = 0;
export function toast(msg, ms = 2200) {
  if (toastEl) { toastEl.remove(); toastEl = null; }
  clearTimeout(toastTimer);
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  toastEl = t;
  toastTimer = setTimeout(() => { t.classList.add('out'); setTimeout(() => { t.remove(); if (toastEl === t) toastEl = null; }, 400); }, ms);
}

let modalRoot;
let modalKey = '', modalScroll = 0;
// key：同一个弹窗被重新渲染（升级 / 叠位后刷新）时传同一个 key，滚动位置会保留——
// 否则每点一次「叠位 +1」弹窗都跳回最上面，要重新往下拉才能点下一次。
export function openModal(html, cls = '', key = '') {
  if (modalRoot && modalKey) { const m = modalRoot.querySelector('.modal'); if (m) modalScroll = m.scrollTop; }
  const keep = key && key === modalKey ? modalScroll : 0;
  closeModal();
  modalKey = key;
  modalRoot = document.createElement('div');
  modalRoot.className = 'modal-bg';
  modalRoot.innerHTML = `<div class="modal ${cls}"><button class="modal-x" data-act="close">✕</button>${html}</div>`;
  modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot || e.target.closest('[data-act="close"]')) closeModal(); });
  document.body.appendChild(modalRoot);
  if (keep) { const m = modalRoot.querySelector('.modal'); if (m) m.scrollTop = keep; }
  return modalRoot;
}
export function closeModal() { if (modalRoot) { modalRoot.remove(); modalRoot = null; } modalKey = ''; modalScroll = 0; }
export const modalEl = () => modalRoot;

// ---------- keywords (status / mechanic tags with icons) ----------
export const stripMarks = (t) => String(t ?? '').replace(/⟦[^|⟧]+\|([^⟧]*)⟧/g, '$1');
export function kwIcon(kw, slug, size = 16) {
  const k = kw?.[slug];
  return k?.i ? `<img class="kwi" src="${img(k.i)}" alt="" width="${size}" height="${size}">` : '';
}
// text with ⟦slug|文字⟧ markers -> HTML chips (tap for the description)
export function markup(text, kw) {
  return esc(text).replace(/⟦([^|⟧]+)\|([^⟧]*)⟧/g, (_, slug, t) => {
    const k = kw?.[slug];
    if (!k) return t;
    return `<span class="kw kc-${k.t === 'realm' ? 'realm-' + slug : (k.c || 'misc')}" data-kw="${slug}" title="${esc(k.n + '：' + stripMarks(k.d).replace(/\s+/g, ' ').slice(0, 120))}">${kwIcon(kw, slug, 14)}${t}</span>`;
  });
}
let pop;
export function showKwPop(kw, slug, anchor) {
  const k = kw?.[slug];
  if (!k) return;
  if (!pop) {
    pop = document.createElement('div');
    pop.className = 'kwpop';
    document.body.appendChild(pop);
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-kw],.kwpop')) pop.hidden = true; });
  }
  pop.innerHTML = `<div class="kwh">${kwIcon(kw, slug, 28)}<b>${esc(k.n)}</b><small>${esc(k.e)}</small></div><div class="kwd">${markup(k.d, kw)}</div>`;
  pop.hidden = false;
  const r = anchor.getBoundingClientRect(), w = Math.min(340, innerWidth - 16);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = '0px';
  const h = pop.offsetHeight;
  pop.style.top = (r.bottom + h + 10 > innerHeight && r.top > h + 10 ? r.top - h - 6 : r.bottom + 6) + 'px';
}

// reward object -> text ({ gold, tickets, cores })
export const rewardText = (r) => [r.gold ? `金币 +${fmt(r.gold)}` : '', r.tickets ? `召唤券 +${r.tickets}` : '', r.cores ? `银芯 +${r.cores}` : ''].filter(Boolean).join('　');
