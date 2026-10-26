import { $, $$, h, loadDict, imgEl, nav, KINDS, store, KW, KW_TYPE, renderText, slugsIn, kwIcon } from './common.js';

document.body.prepend(nav('codex'));
const root = $('#app');
root.textContent = '载入中…';
const { D } = await loadDict();
let SK = null;
const skills = async () => SK || (SK = await (await fetch('data/skills.json')).json());

const TABS = ['awakener', 'wheel', 'covenant', 'key', 'creation', 'monster', 'keyword'];
const LABEL = { ...KINDS, keyword: '关键词' };
const COUNT = { ...Object.fromEntries(Object.keys(KINDS).map(k => [k, D[k].length])), keyword: KW.list.length };
const FILTERS = {
  awakener: [['realm', '阵营'], ['role', '定位'], ['rarity', '稀有度']],
  wheel: [['realm', '阵营'], ['rarity', '稀有度']],
  covenant: [],
  key: [['realm', '阵营']],
  creation: [['kind', '类型'], ['rarity', '稀有度']],
  monster: [['cls', '阶级']],
  keyword: [['t', '类别']],
};

// ------------------------------------------------------------------ state (kept in the URL hash)
let tab = 'awakener', q = '', filt = {}, sort = 'default', kwSel = [], kwMode = 'all';
function readHash() {
  const raw = location.hash.slice(1);
  const p = new URLSearchParams(raw.includes('=') ? raw : `tab=${raw}`);
  const t = p.get('tab');
  tab = TABS.includes(t) ? t : store.get('codexTab', 'awakener');
  kwSel = (p.get('kw') || '').split(',').filter(s => KW.by[s]);
  kwMode = p.get('mode') === 'any' ? 'any' : 'all';
}
function writeHash() {
  const p = new URLSearchParams({ tab });
  if (kwSel.length) p.set('kw', kwSel.join(','));
  if (kwSel.length > 1 && kwMode === 'any') p.set('mode', 'any');
  history.replaceState(null, '', '#' + p.toString());
  store.set('codexTab', tab);
}
readHash();
window.addEventListener('hashchange', () => { readHash(); filt = {}; render(); });

const dlg = h('dialog', { class: 'detail' });
document.body.append(dlg);
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

function sub(e) {
  const t = [];
  if (e.realm) t.push(e.realm);
  if (e.role) t.push(e.role);
  if (e.rarity) t.push(e.rarity);
  if (e.kind) t.push(e.kind);
  if (e.owner) t.push('专属：' + e.owner);
  if (e.meta) t.push(e.meta);
  if (e.cls) t.push(e.cls);
  return t.join(' · ');
}

const highlight = () => $$('.kw[data-s]', dlg).forEach(c => c.classList.toggle('hl', kwSel.includes(c.dataset.s)));

// ------------------------------------------------------------------ detail dialogs
async function openDetail(kind, e) {
  const art = kind === 'awakener' ? e.card : kind === 'wheel' ? e.big : null;
  dlg.replaceChildren(
    h('button', { class: 'close', onclick: () => dlg.close() }, '×'),
    h('div', { class: 'dbody' },
      art ? h('div', { class: 'dart' }, imgEl(art, e.zh)) : h('div', { class: 'dart small' }, imgEl(e.img, e.zh)),
      h('div', { class: 'dtext' },
        h('h2', {}, e.zh || e.en), e.en && e.en !== e.zh ? h('div', { class: 'en' }, e.en) : null,
        h('div', { class: 'chips' }, sub(e).split(' · ').filter(Boolean).map(x => h('span', { class: 'chip' }, x)),
          (e.traits || []).map(x => h('span', { class: 'chip dim' }, x)),
          e.use != null ? h('span', { class: 'chip gold' }, `第 ${D.usageSeason} 期融灾使用率 ${e.use}%`) : null),
        typeof e.desc === 'string' && e.desc ? h('p', { class: 'prewrap' }, renderText(e.desc)) : null,
        Array.isArray(e.desc) ? e.desc.map(x => h('div', { class: 'dblock' }, h('b', {}, x.h), h('p', { class: 'prewrap' }, renderText(x.t)))) : null,
        e.skills && e.skills.length ? h('div', { class: 'dblock' }, h('b', {}, '技能'), h('ul', {}, e.skills.map(s => h('li', {}, renderText(s))))) : null,
        kind !== 'awakener' && e.kw && e.kw.length ? kwRow(e.kw) : null,
        e.real === false ? h('p', { class: 'note' }, '该条目尚未出现在融灾榜单队伍中。') : null,
        kind === 'awakener' ? h('div', { class: 'skillbox' }, h('p', { class: 'note' }, '载入技能…')) : null)));
  dlg.showModal();
  highlight();
  if (kind === 'awakener') await fillSkills(e);
}

const kwRow = (slugs) => h('div', { class: 'kwrow' }, h('small', {}, '涉及关键词：'),
  slugs.map(s => KW.by[s]).filter(Boolean).map(k => h('button', { type: 'button', class: 'chip kwtag', onclick: () => { kwSel = [k.s]; dlg.close(); render(); } }, kwIcon(k, 16), k.n)));

async function fillSkills(e) {
  const box = $('.skillbox', dlg);
  const rec = (await skills())[e.pid];
  if (!rec) { box.replaceChildren(h('p', { class: 'note' }, '暂无技能数据')); return; }
  const sk = (x) => {
    const match = kwSel.length && kwSel.some(s => slugsIn(x.d).includes(s));
    return h('div', { class: `skill${match ? ' match' : ''}` },
      h('header', {}, h('b', {}, x.n), x.e && x.e !== x.n ? h('small', { class: 'en' }, x.e) : null,
        x.ty ? h('span', { class: 'chip' }, x.ty) : null, x.cost != null && x.cost !== '' ? h('span', { class: 'chip' }, `算力 ${x.cost}`) : null),
      h('p', { class: 'prewrap' }, renderText(x.d)));
  };
  const used = [...new Set([...rec.skills, ...rec.talents, ...rec.enlightens, ...rec.derived].flatMap(x => slugsIn(x.d)))];
  box.replaceChildren(...[
    used.length ? kwRow(used) : null,
    h('div', { class: 'sec' }, '指令卡牌'), rec.skills.map(sk),
    rec.talents.length ? [h('div', { class: 'sec' }, '天赋'), rec.talents.map(sk)] : null,
    rec.enlightens.length ? [h('div', { class: 'sec' }, '启灵'), rec.enlightens.map(sk)] : null,
    rec.derived.length ? [h('div', { class: 'sec' }, '衍生卡牌'), rec.derived.map(sk)] : null,
    rec.builds.length ? [h('div', { class: 'sec' }, '推荐配置（SKeyDB）'), rec.builds.map(b => h('div', { class: 'skill' },
      h('b', {}, b.label), h('p', { class: 'prewrap' }, `密契：${b.covenants.join('、') || '—'}\n命轮：${b.wheels.map(w => w.join(' / ')).join('；') || '—'}`)))] : null,
    h('p', { class: 'note' }, '技能与关键词的中文为译文（AI 辅助翻译，尚未经官方文本校对），英文原名见标题旁；数据来源 SKeyDB（CC BY-NC-SA 4.0）。'),
  ].flat(Infinity).filter(Boolean));
  highlight();
}

function openKeyword(k) {
  const cnt = k.cnt || {};
  dlg.replaceChildren(
    h('button', { class: 'close', onclick: () => dlg.close() }, '×'),
    h('div', { class: 'dbody' },
      h('div', { class: 'dart small' }, kwIcon(k, 96)),
      h('div', { class: 'dtext' },
        h('h2', {}, k.n), h('div', { class: 'en' }, [k.e, ...k.a].join(' · ')),
        h('div', { class: 'chips' }, h('span', { class: 'chip' }, KW_TYPE[k.t] || k.t)),
        h('div', { class: 'dblock' }, h('p', { class: 'prewrap' }, renderText(k.d))),
        h('div', { class: 'sec' }, '查找包含该关键词的条目'),
        h('div', { class: 'kwfind' }, Object.keys(KINDS).map(kind => h('button', { type: 'button', class: 'btn ghost sm', disabled: !cnt[kind],
          onclick: () => { tab = kind; kwSel = [k.s]; filt = {}; q = ''; dlg.close(); render(); } }, `${KINDS[kind]} ${cnt[kind] || 0}`))))));
  dlg.showModal();
}

// ------------------------------------------------------------------ list + filters
function pool() {
  return tab === 'keyword' ? KW.list.map(k => ({ ...k, zh: k.n, en: k.e, id: k.s })) : D[tab];
}

function list() {
  let items = pool().filter(e => {
    if (q && !((e.zh || '') + (e.en || '') + (e.owner || '') + (e.a || []).join('')).toLowerCase().includes(q)) return false;
    for (const [k, v] of Object.entries(filt)) if (v && e[k] !== v) return false;
    if (tab !== 'keyword' && kwSel.length) {
      const have = e.kw || [];
      if (kwMode === 'all' ? !kwSel.every(s => have.includes(s)) : !kwSel.some(s => have.includes(s))) return false;
    }
    return true;
  });
  if (sort === 'use') items = [...items].sort((a, b) => (b.use || 0) - (a.use || 0));
  if (sort === 'name') items = [...items].sort((a, b) => (a.zh || '').localeCompare(b.zh || '', 'zh'));
  return items;
}

function kwCounts() {
  const c = {};
  for (const e of D[tab] || []) for (const s of e.kw || []) c[s] = (c[s] || 0) + 1;
  return c;
}

function kwBar() {
  if (tab === 'keyword') return null;
  const counts = kwCounts();
  if (!Object.keys(counts).length) return null;
  const avail = KW.list.filter(k => counts[k.s] && !kwSel.includes(k.s));
  const quick = [...avail].sort((a, b) => counts[b.s] - counts[a.s]).slice(0, 12);
  const sel = h('select', { class: 'kwsel', onchange: ev => { if (ev.target.value) { kwSel = [...kwSel, ev.target.value]; render(); } } },
    h('option', { value: '' }, '＋ 按关键词筛选…'),
    Object.entries(KW_TYPE).map(([t, label]) => {
      const ks = avail.filter(k => k.t === t);
      return ks.length ? h('optgroup', { label }, ks.map(k => h('option', { value: k.s }, `${k.n}（${counts[k.s]}）`))) : null;
    }));
  return h('div', { class: 'kwbar' },
    h('div', { class: 'kwline' }, h('small', {}, '关键词：'),
      kwSel.map(s => { const k = KW.by[s]; return h('button', { type: 'button', class: 'chip kwtag on', title: '点击移除', onclick: () => { kwSel = kwSel.filter(x => x !== s); render(); } }, kwIcon(k, 16), k.n, ' ×'); }),
      sel,
      kwSel.length > 1 ? h('select', { onchange: ev => { kwMode = ev.target.value; render(); } },
        h('option', { value: 'all', selected: kwMode === 'all' }, '同时包含'), h('option', { value: 'any', selected: kwMode === 'any' }, '包含任一')) : null,
      kwSel.length ? h('button', { type: 'button', class: 'link', onclick: () => { kwSel = []; render(); } }, '清除') : null),
    quick.length ? h('div', { class: 'kwline quick' }, h('small', {}, '常见：'),
      quick.map(k => h('button', { type: 'button', class: 'chip kwtag', onclick: () => { kwSel = [...kwSel, k.s]; render(); } }, kwIcon(k, 16), `${k.n} ${counts[k.s]}`))) : null);
}

function render() {
  writeHash();
  const hasUse = (D[tab] || []).some(e => e.use != null);
  const items = list();
  const fs = (FILTERS[tab] || []).map(([k, label]) => {
    const vals = [...new Set(pool().map(e => e[k]).filter(Boolean))].sort();
    if (!vals.length) return null;
    return h('select', { onchange: ev => { filt[k] = ev.target.value; render(); } },
      h('option', { value: '' }, `全部${label}`), vals.map(v => h('option', { value: v, selected: filt[k] === v }, tab === 'keyword' && k === 't' ? KW_TYPE[v] || v : v)));
  });
  root.replaceChildren(...[
    h('div', { class: 'tabs' }, TABS.map(k => h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; filt = {}; sort = 'default'; render(); } },
      LABEL[k], h('small', {}, COUNT[k])))),
    h('div', { class: 'toolbar' },
      h('input', { type: 'search', placeholder: '搜索中文 / 英文名', value: q, oninput: ev => { q = ev.target.value.trim().toLowerCase(); renderGrid(); } }),
      fs,
      h('select', { onchange: ev => { sort = ev.target.value; render(); } },
        h('option', { value: 'default' }, '默认顺序'), h('option', { value: 'name' }, '按名称'),
        hasUse ? h('option', { value: 'use', selected: sort === 'use' }, '按使用率') : null),
      h('span', { class: 'note', id: 'cnt' }, `${items.length} 项`)),
    kwBar(),
    h('div', { class: 'cgrid', id: 'cgrid' }, items.map(card)),
  ].filter(Boolean));
}

function renderGrid() {
  const items = list();
  $('#cgrid').replaceChildren(...items.map(card));
  $('#cnt').textContent = `${items.length} 项`;
}

function card(e) {
  if (tab === 'keyword') {
    const k = KW.by[e.s];
    const total = Object.values(k.cnt || {}).reduce((a, b) => a + b, 0);
    return h('button', { class: 'ccard kwcard', type: 'button', onclick: () => openKeyword(k) },
      kwIcon(k, 56), h('b', {}, k.n), h('small', {}, `${KW_TYPE[k.t] || k.t}${total ? ` · ${total} 处` : ''}`));
  }
  return h('button', { class: 'ccard', type: 'button', onclick: () => openDetail(tab, e) },
    imgEl(e.img, e.zh),
    h('b', {}, e.zh || e.en),
    h('small', {}, sub(e) || ' '),
    e.use != null && e.use > 0 ? h('em', {}, `${e.use}%`) : null);
}

render();
