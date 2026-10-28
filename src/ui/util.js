export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const img = (p) => (p ? `public/${p}` : '');
export const fmt = (n) => {
  n = Math.round(n);
  if (Math.abs(n) >= 1e8) return (n / 1e8).toFixed(2) + '亿';
  if (Math.abs(n) >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
};
export const dur = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}小时${m}分` : `${m}分钟`; };

const KEY = 'morimens-idle-save-v1';
export const store = {
  read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
  write(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export function toast(msg, ms = 2200) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

let modalRoot;
export function openModal(html, cls = '') {
  closeModal();
  modalRoot = document.createElement('div');
  modalRoot.className = 'modal-bg';
  modalRoot.innerHTML = `<div class="modal ${cls}"><button class="modal-x" data-act="close">✕</button>${html}</div>`;
  modalRoot.addEventListener('click', (e) => { if (e.target === modalRoot || e.target.closest('[data-act="close"]')) closeModal(); });
  document.body.appendChild(modalRoot);
  return modalRoot;
}
export function closeModal() { if (modalRoot) { modalRoot.remove(); modalRoot = null; } }
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
