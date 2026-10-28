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
