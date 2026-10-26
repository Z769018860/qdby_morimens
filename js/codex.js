import { $, h, loadDict, imgEl, nav, KINDS, store } from './common.js';

document.body.prepend(nav('codex'));
const root = $('#app');
root.textContent = '载入中…';
const { D } = await loadDict();
let SK = null;
const skills = async () => SK || (SK = await (await fetch('data/skills.json')).json());

const TABS = ['awakener', 'wheel', 'covenant', 'key', 'creation', 'monster'];
const FILTERS = {
  awakener: [['realm', '阵营'], ['role', '定位'], ['rarity', '稀有度']],
  wheel: [['realm', '阵营'], ['rarity', '稀有度']],
  covenant: [],
  key: [['realm', '阵营']],
  creation: [['kind', '类型'], ['rarity', '稀有度']],
  monster: [['cls', '阶级']],
};
let tab = (location.hash || '').slice(1);
if (!TABS.includes(tab)) tab = store.get('codexTab', 'awakener');
let q = '', filt = {}, sort = 'default', onlyUsed = false;

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
        typeof e.desc === 'string' && e.desc ? h('p', {}, e.desc) : null,
        Array.isArray(e.desc) ? e.desc.map(x => h('div', { class: 'dblock' }, h('b', {}, x.h), h('p', {}, x.t))) : null,
        e.skills && e.skills.length ? h('div', { class: 'dblock' }, h('b', {}, '技能'), h('ul', {}, e.skills.map(s => h('li', {}, s)))) : null,
        e.real === false ? h('p', { class: 'note' }, '该条目尚未出现在融灾榜单队伍中。') : null,
        kind === 'awakener' ? h('div', { class: 'skillbox' }, h('p', { class: 'note' }, '载入技能…')) : null)));
  dlg.showModal();
  if (kind === 'awakener') fillSkills(e);
}

async function fillSkills(e) {
  const box = $('.skillbox', dlg);
  const rec = (await skills())[e.pid];
  if (!rec) { box.replaceChildren(h('p', { class: 'note' }, '暂无技能数据')); return; }
  const sk = (x) => h('div', { class: 'skill' }, h('header', {}, h('b', {}, x.name),
    x.type ? h('span', { class: 'chip' }, x.type) : null, x.cost != null && x.cost !== '' ? h('span', { class: 'chip' }, `算力 ${x.cost}`) : null),
    h('p', {}, x.desc));
  const order = ['Strike', 'Defense', 'Skill1', 'Skill2', 'Rouse', 'Exalt', 'OverExalt'];
  const cards = [...rec.skills].sort((a, b) => order.indexOf(a.slot) - order.indexOf(b.slot));
  box.replaceChildren(...[
    h('div', { class: 'sec' }, '指令卡牌'), cards.map(sk),
    rec.talents.length ? [h('div', { class: 'sec' }, '天赋'), rec.talents.map(sk)] : null,
    rec.enlightens.length ? [h('div', { class: 'sec' }, '启灵'), rec.enlightens.map(x => sk({ ...x, type: x.slot }))] : null,
    rec.builds.length ? [h('div', { class: 'sec' }, '推荐配置（SKeyDB）'), rec.builds.map(b => h('div', { class: 'skill' },
      h('b', {}, b.label), h('p', {}, `密契：${b.covenants.join('、') || '—'}\n命轮：${b.wheels.map(w => w.join(' / ')).join('；') || '—'}`)))] : null,
    h('p', { class: 'note' }, '技能文本来自 SKeyDB 英文原文，术语按本站词表中文化；游戏内中文原文暂无公开数据源。')].flat(Infinity).filter(Boolean));
}

function list() {
  let items = D[tab].filter(e => {
    if (q && !((e.zh || '') + (e.en || '') + (e.owner || '')).toLowerCase().includes(q)) return false;
    for (const [k, v] of Object.entries(filt)) if (v && e[k] !== v) return false;
    if (onlyUsed && !e.use) return false;
    return true;
  });
  if (sort === 'use') items = [...items].sort((a, b) => (b.use || 0) - (a.use || 0));
  if (sort === 'name') items = [...items].sort((a, b) => (a.zh || '').localeCompare(b.zh || '', 'zh'));
  return items;
}

function render() {
  const hasUse = D[tab].some(e => e.use != null);
  const items = list();
  const fs = (FILTERS[tab] || []).map(([k, label]) => {
    const vals = [...new Set(D[tab].map(e => e[k]).filter(Boolean))].sort();
    if (!vals.length) return null;
    return h('select', { onchange: ev => { filt[k] = ev.target.value; render(); } },
      h('option', { value: '' }, `全部${label}`), vals.map(v => h('option', { value: v, selected: filt[k] === v }, v)));
  });
  root.replaceChildren(
    h('div', { class: 'tabs' }, TABS.map(k => h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; filt = {}; sort = 'default'; store.set('codexTab', k); location.hash = k; render(); } },
      KINDS[k], h('small', {}, D[k].length)))),
    h('div', { class: 'toolbar' },
      h('input', { type: 'search', placeholder: '搜索中文 / 英文名', value: q, oninput: ev => { q = ev.target.value.trim().toLowerCase(); renderGrid(); } }),
      fs,
      h('select', { onchange: ev => { sort = ev.target.value; render(); } },
        h('option', { value: 'default' }, '默认顺序'), h('option', { value: 'name' }, '按名称'),
        hasUse ? h('option', { value: 'use', selected: sort === 'use' }, '按使用率') : null),
      h('span', { class: 'note' }, `${items.length} 项`)),
    h('div', { class: 'cgrid', id: 'cgrid' }, items.map(card)));
  const s = $('input[type=search]'); if (s && document.activeElement !== s && q) s.value = q;
}

function renderGrid() {
  const items = list();
  $('#cgrid').replaceChildren(...items.map(card));
  $('.toolbar .note').textContent = `${items.length} 项`;
}

function card(e) {
  return h('button', { class: 'ccard', type: 'button', onclick: () => openDetail(tab, e) },
    imgEl(e.img, e.zh),
    h('b', {}, e.zh || e.en),
    h('small', {}, sub(e) || ' '),
    e.use != null && e.use > 0 ? h('em', {}, `${e.use}%`) : null);
}

render();
