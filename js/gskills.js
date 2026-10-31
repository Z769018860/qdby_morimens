// 小游戏「携带技能」：合成大杜勒与忘却 2048 共用的角色表和选择器。
//
// 72 个角色（62 名唤醒体 + 10 位主播）每人一个技能。技能名是原作 / 本站设定里这个人「狂气爆发」的名字，
// 具体效果由 界域 × 定位 决定（4 × 3 = 12 种），稀有度（SSR / SR）决定强度：SSR 比 SR 多一档。
// 效果本身在各游戏自己的文件里（它们各自有各自的棋盘 / 物理），这里只负责：角色表、分类、选择界面。
//
// 角色数据由 scripts/gen_gskills.mjs 生成（js/gskills-data.js），别手改。
import { GS_ROWS } from './gskills-data.js';

export const REALM_ZH = { c: '混沌', f: '血肉', a: '深海', u: '超维' };
export const ROLE_ZH = { a: '突击', w: '守护', h: '合唱' };
export const REALM_COLOR = { c: '#e8656f', f: '#d98b6a', a: '#5b9bd5', u: '#a07cff' };

export const CHARS = GS_ROWS.map(([id, n, realm, role, rar, sk, av, cr]) => ({
  id, n, realm, role, rar, sk: sk || '狂气爆发', av, creator: !!cr, kind: realm + role, mag: rar === 'SSR' ? 1 : 0,
}));
export const CHAR_BY_ID = Object.fromEntries(CHARS.map((c) => [c.id, c]));
export const charOf = (id) => CHAR_BY_ID[String(id || '')] || null;

const CSS = `
.gsk-mask{position:fixed;inset:0;z-index:90;background:rgba(4,6,10,.66);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center}
.gsk-card{width:min(560px,100%);max-height:86dvh;display:flex;flex-direction:column;background:var(--panel,#121722);color:var(--text,#e6e9f0);
  border:1px solid var(--line,#28324a);border-radius:16px 16px 0 0;box-shadow:0 -20px 50px -20px #000;padding:12px 12px calc(12px + env(safe-area-inset-bottom))}
@media(min-width:700px){.gsk-mask{align-items:center}.gsk-card{border-radius:16px;max-height:80dvh}}
.gsk-h{display:flex;align-items:center;gap:8px}
.gsk-h h3{margin:0;font-size:15px;letter-spacing:.04em}
.gsk-h button{margin-left:auto}
.gsk-b{font:inherit;font-size:12.5px;color:var(--text,#e6e9f0);background:var(--panel2,#1a2130);border:1px solid var(--line,#28324a);border-radius:9px;padding:5px 11px;cursor:pointer}
.gsk-b:hover{border-color:var(--gold,#e3b341)}
.gsk-b.on{border-color:var(--gold,#e3b341);color:var(--gold,#e3b341)}
.gsk-tip{margin:6px 0 8px;font-size:11.5px;color:var(--dim,#8892a8);line-height:1.6}
.gsk-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}
.gsk-list{overflow-y:auto;display:grid;gap:6px;padding:2px;overscroll-behavior:contain}
.gsk-it{display:grid;grid-template-columns:42px 1fr;gap:9px;align-items:center;text-align:left;font:inherit;color:inherit;cursor:pointer;
  background:var(--panel2,#1a2130);border:1px solid var(--line,#28324a);border-left:3px solid var(--rc,#888);border-radius:10px;padding:7px 9px}
.gsk-it:hover{border-color:var(--gold,#e3b341);border-left-color:var(--rc,#888)}
.gsk-it.on{outline:2px solid var(--gold,#e3b341);outline-offset:0}
.gsk-it img,.gsk-it .gsk-ph{width:42px;height:42px;border-radius:9px;object-fit:cover;background:var(--bg,#0a0d14);display:grid;place-items:center;font-weight:700}
.gsk-n{font-size:13.5px;font-weight:600;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.gsk-n i{font-style:normal;font-size:10.5px;font-weight:500;color:var(--dim,#8892a8)}
.gsk-s{font-size:12px;color:var(--gold,#e3b341);margin-top:1px}
.gsk-d{font-size:11.5px;color:var(--dim,#8892a8);line-height:1.5;margin-top:1px}
`;
let cssIn = false;
const ensureCss = () => { if (cssIn) return; cssIn = true; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); };
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

/**
 * 选择器。opts: { title, tip, current(id), describe(char)→一句话效果, onPick(char|null) }
 * 点一个角色就选中并关闭；「不带技能」选 null。
 */
export function openSkillPicker(opts) {
  ensureCss();
  const mask = h('div', 'gsk-mask');
  const card = h('div', 'gsk-card');
  mask.appendChild(card);
  const head = h('div', 'gsk-h');
  head.appendChild(h('h3', '', opts.title || '携带技能'));
  const x = h('button', 'gsk-b', '关闭');
  head.appendChild(x);
  card.appendChild(head);
  if (opts.tip) card.appendChild(h('p', 'gsk-tip', opts.tip));
  const tabs = h('div', 'gsk-tabs');
  const list = h('div', 'gsk-list');
  card.append(tabs, list);
  let tab = (charOf(opts.current) || {}).realm || 'all';
  const close = () => { mask.remove(); document.removeEventListener('keydown', onKey, true); };
  const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  document.addEventListener('keydown', onKey, true);
  x.onclick = close;
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });

  const draw = () => {
    tabs.replaceChildren();
    const mk = (k, label) => { const b = h('button', 'gsk-b' + (tab === k ? ' on' : ''), label); b.onclick = () => { tab = k; draw(); }; tabs.appendChild(b); };
    mk('all', '全部');
    for (const r of Object.keys(REALM_ZH)) mk(r, REALM_ZH[r]);
    mk('creator', '主播');
    const none = h('button', 'gsk-b' + (!opts.current ? ' on' : ''), '不带技能');
    none.onclick = () => { close(); opts.onPick(null); };
    tabs.appendChild(none);
    list.replaceChildren();
    const rows = CHARS.filter((c) => (tab === 'all' ? true : tab === 'creator' ? c.creator : c.realm === tab));
    for (const c of rows) {
      const it = h('button', 'gsk-it' + (c.id === opts.current ? ' on' : ''));
      it.style.setProperty('--rc', REALM_COLOR[c.realm]);
      if (c.av) { const im = new Image(); im.src = c.av; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 42; im.height = 42; it.appendChild(im); }
      else it.appendChild(h('div', 'gsk-ph', c.n.slice(0, 1)));
      const t = h('div');
      const n = h('div', 'gsk-n', c.n);
      n.appendChild(h('i', '', `${REALM_ZH[c.realm]} · ${ROLE_ZH[c.role]} · ${c.rar}${c.creator ? ' · 主播' : ''}`));
      t.append(n, h('div', 'gsk-s', c.sk), h('div', 'gsk-d', opts.describe(c)));
      it.appendChild(t);
      it.onclick = () => { close(); opts.onPick(c); };
      list.appendChild(it);
    }
  };
  draw();
  document.body.appendChild(mask);
  // 当前选中的滚到可见处
  const on = list.querySelector('.gsk-it.on'); if (on) on.scrollIntoView({ block: 'center' });
}
