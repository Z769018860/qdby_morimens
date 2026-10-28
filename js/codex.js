import { $, $$, h, loadDict, imgEl, nav, KINDS, kindName, store, KW, KW_TYPE, renderText, slugsIn, kwIcon, t, nameOf, lang } from './common.js';

document.body.prepend(nav('codex'));
const root = $('#app');
if (!document.getElementById('boot')) root.textContent = t('loading');
const { D } = await loadDict();
let SK = null;
const skills = async () => SK || (SK = await (await fetch('data/skills.json')).json());

const TABS = ['awakener', 'wheel', 'covenant', 'key', 'creation', 'monster', 'keyword'];
const LABEL = { ...KINDS, keyword: '关键词' };
const LABEL_EN = { awakener: 'Awakener', wheel: 'Wheel', covenant: 'Covenant', key: 'Key', creation: 'Relic', monster: 'Monster', keyword: 'Keyword' };
const tabName = (k) => (lang.cur === 'en' ? LABEL_EN[k] : LABEL[k]);
const KW_TYPE_EN = { realm: 'Realm', mechanic: 'Mechanic', tag: 'Tag', help: 'Help' };
// 机制分类（站内整理）：只影响标签配色与筛选，不改名称
const KW_GROUP = { dmg: '伤害', debuff: '减益', buff: '增益', res: '资源', rule: '规则', realm: '界域', misc: '其他' };
const KW_GROUP_EN = { dmg: 'Damage', debuff: 'Debuff', buff: 'Buff', res: 'Resource', rule: 'Rule', realm: 'Realm', misc: 'Other' };
const FILTERS = {
  awakener: [['realm', 'Realm'], ['role', 'Role'], ['rarity', 'Rarity']],
  wheel: [['realm', 'Realm'], ['rarity', 'Rarity']],
  covenant: [],
  key: [['realm', 'Realm']],
  creation: [['kind', 'Type'], ['rarity', 'Rarity']],
  monster: [['cls', 'Class']],
  keyword: [['t', 'Category'], ['g', 'Use']],
};
const FILTERS_ZH = {
  awakener: [['realm', '阵营'], ['role', '定位'], ['rarity', '稀有度']],
  wheel: [['realm', '阵营'], ['rarity', '稀有度']],
  covenant: [],
  key: [['realm', '阵营']],
  creation: [['kind', '类型'], ['rarity', '稀有度']],
  monster: [['cls', '阶级']],
  keyword: [['t', '类别'], ['g', '用途']],
};
const filterLabel = (k, i) => ((lang.cur === 'en' ? FILTERS : FILTERS_ZH)[k] || [])[i]?.[1] || '';

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

const REALM_EN = { CHAOS: 'Chaos', CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra', FADED_LEGACY: 'Faded Legacy' };
// 钥令/命轮只带中文阵营名（没有 realmCode），英文界面下按官方译名兜底
const REALM_ZH2EN = { 深海: 'Aequor', 混沌: 'Chaos', 血肉: 'Caro', 超维: 'Ultra', 褪色遗产: 'Faded Legacy', 通用: 'Universal', 其他: 'Other' };
const ROLE_EN = { ASSAULT: 'Damage', WARDEN: 'Defense', CHORUS: 'Support' };
const ROLE_ZH2EN = { 伤害型: 'Damage', 防御型: 'Defense', 辅助型: 'Support' };
const kwName = (k) => (lang.cur === 'en' ? (k.e || k.n) : k.n);
function sub(e) {
  const en = lang.cur === 'en';
  const t = [];
  if (e.realm) t.push(en ? (REALM_EN[e.realmCode] || REALM_ZH2EN[e.realm] || e.realm) : e.realm);
  if (e.role) t.push(en ? (ROLE_EN[e.roleCode] || e.role) : e.role);
  if (e.rarity) t.push(e.rarity);
  if (e.kind) t.push(e.kind);
  if (e.owner) t.push(en ? 'Owner: ' + e.owner : '专属：' + e.owner);
  if (e.meta) t.push(e.meta);
  if (e.cls) t.push(e.cls);
  return t.join(' · ');
}

const highlight = () => $$('.kw[data-s]', dlg).forEach(c => c.classList.toggle('hl', kwSel.includes(c.dataset.s)));

// ------------------------------------------------------------------ detail dialogs
async function openDetail(kind, e) {
  const art = kind === 'awakener' ? e.card : kind === 'wheel' ? e.big : null;
  const nm = nameOf(e);
  dlg.replaceChildren(
    h('button', { class: 'close', onclick: () => dlg.close() }, '×'),
    h('div', { class: 'dbody' },
      art ? h('div', { class: 'dart' }, imgEl(art, nm)) : h('div', { class: 'dart small' }, imgEl(e.img, nm)),
      h('div', { class: 'dtext' },
        h('h2', {}, nm), e.en && e.en !== nm ? h('div', { class: 'en' }, e.en) : null,
        h('div', { class: 'chips' }, sub(e).split(' · ').filter(Boolean).map(x => h('span', { class: 'chip' }, x)),
          (e.traits || []).map(x => h('span', { class: 'chip dim' }, x)),
          e.use != null ? h('span', { class: 'chip gold' }, `${lang.cur === 'en' ? `S${D.usageSeason} usage` : `第 ${D.usageSeason} 期融灾使用率`} ${e.use}%`) : null),
        typeof e.desc === 'string' && e.desc ? h('p', { class: 'prewrap' }, renderText(e.desc)) : null,
        Array.isArray(e.desc) ? e.desc.map(x => h('div', { class: 'dblock' }, h('b', {}, x.h), h('p', { class: 'prewrap' }, renderText(x.t)))) : null,
        kind === 'awakener' ? profileBlock(e) : null,
        e.skills && e.skills.length ? h('div', { class: 'dblock' }, h('b', {}, lang.cur === 'en' ? 'Skills' : '技能'), h('ul', {}, e.skills.map(s => h('li', {}, renderText(s))))) : null,
        kind !== 'awakener' && e.kw && e.kw.length ? kwRow(e.kw) : null,
        e.real === false ? h('p', { class: 'note' }, lang.cur === 'en' ? 'Not yet seen in a leaderboard team.' : '该条目尚未出现在融灾榜单队伍中。') : null,
        kind === 'awakener' ? h('div', { class: 'skillbox' }, h('p', { class: 'note' }, lang.cur === 'en' ? 'Loading skills…' : '载入技能…')) : null)));
  dlg.showModal();
  highlight();
  if (kind === 'awakener') await fillSkills(e);
}

// 唤醒体档案（灰机 wiki 基本资料 + 语音）
function profileBlock(e) {
  const en = lang.cur === 'en';
  const rows = [
    [en ? 'Birthday' : '生日', e.bd], [en ? 'Gender' : '性别', e.sex],
    [en ? 'Height' : '身高', e.height], [en ? 'Weight' : '体重', e.weight],
    [en ? 'Noss index' : '诺斯指数', e.nos],
    [en ? 'Acquired' : '获取途径', (e.acq || []).join(en ? ', ' : '、')],
    [en ? 'Aliases' : '别称', (e.aliases || []).join(en ? ', ' : '、')],
    [en ? 'Traits' : '特性', (e.traits || []).join(en ? ', ' : '、')],
    [en ? 'Related' : '相关人', (e.related || []).join(en ? ', ' : '、')],
    [en ? 'Other forms' : '其他形态', (e.forms || []).map(f => f.zh + (f.rarity ? `（${f.rarity}）` : '')).join(en ? ', ' : '、')],
  ].filter(([, v]) => v);
  const voice = e.voice || [];
  if (!rows.length && !voice.length) return null;
  return h('div', { class: 'dblock profile' },
    h('b', {}, en ? 'Profile (data: Huiji Wiki)' : '档案（数据：灰机 wiki）'),
    h('div', { class: 'pflist' }, rows.map(([k, v]) => h('div', { class: 'pfrow' }, h('small', {}, k), h('span', {}, v)))),
    voice.length ? h('details', { class: 'voicedet' },
      h('summary', {}, `${en ? 'Voice lines' : '语音'} · ${voice.length}`),
      h('ul', { class: 'voicelist' }, voice.map(v => h('li', {}, h('b', {}, v.t), h('p', {}, v.c))))) : null);
}

const kwRow = (slugs) => h('div', { class: 'kwrow' }, h('small', {}, lang.cur === 'en' ? 'Keywords:' : '涉及关键词：'),
  slugs.map(s => KW.by[s]).filter(Boolean).map(k => h('button', { type: 'button', class: 'chip kwtag', onclick: () => { kwSel = [k.s]; dlg.close(); render(); } }, kwIcon(k, 16), kwName(k))));

async function fillSkills(e) {
  const box = $('.skillbox', dlg);
  const rec = (await skills())[e.pid];
  if (!rec) { box.replaceChildren(h('p', { class: 'note' }, t('noSkills'))); return; }
  const en = lang.cur === 'en';
  const sk = (x) => {
    const match = kwSel.length && kwSel.some(s => slugsIn(x.d).includes(s));
    return h('div', { class: `skill${match ? ' match' : ''}` },
      h('header', {}, h('b', {}, en ? (x.e || x.n) : x.n), x.e && x.e !== (en ? (x.e || x.n) : x.n) ? h('small', { class: 'en' }, en ? x.n : x.e) : null,
        x.ty ? h('span', { class: 'chip' }, x.ty) : null, x.cost != null && x.cost !== '' ? h('span', { class: 'chip' }, `${en ? 'Cost' : '算力'} ${x.cost}`) : null),
      h('p', { class: 'prewrap' }, renderText(x.d)));
  };
  const used = [...new Set([...rec.skills, ...rec.talents, ...rec.enlightens, ...rec.derived].flatMap(x => slugsIn(x.d)))];
  box.replaceChildren(...[
    used.length ? kwRow(used) : null,
    h('div', { class: 'sec' }, en ? 'Command Cards' : '指令卡牌'), rec.skills.map(sk),
    rec.talents.length ? [h('div', { class: 'sec' }, en ? 'Talents' : '天赋'), rec.talents.map(sk)] : null,
    rec.enlightens.length ? [h('div', { class: 'sec' }, en ? 'Enlighten' : '启灵'), rec.enlightens.map(sk)] : null,
    rec.derived.length ? [h('div', { class: 'sec' }, en ? 'Derived Cards' : '衍生卡牌'), rec.derived.map(sk)] : null,
    rec.builds.length ? [h('div', { class: 'sec' }, en ? 'Recommended builds (SKeyDB)' : '推荐配置（SKeyDB）'), rec.builds.map(b => h('div', { class: 'skill' },
      h('b', {}, b.label), h('p', { class: 'prewrap' }, `${en ? 'Covenant' : '密契'}：${b.covenants.join('、') || '—'}\n${en ? 'Wheels' : '命轮'}：${b.wheels.map(w => w.join(' / ')).join('；') || '—'}`)))] : null,
    h('p', { class: 'note' }, en ? 'Skill descriptions are AI-assisted Chinese translations; English names shown beside titles. Data: SKeyDB (CC BY-NC-SA 4.0).' : '技能与关键词的中文为译文（AI 辅助翻译，尚未经官方文本校对），英文原名见标题旁；数据来源 SKeyDB（CC BY-NC-SA 4.0）。'),
  ].flat(Infinity).filter(Boolean));
  highlight();
}

// 译名来源：官方（维基/游戏文本表/客户端）与待核译名区分展示
const KW_SRC = {
  wiki: { zh: '官方译名 · 中文维基', en: 'Official · Chinese Wiki', cls: 'ok' },
  game: { zh: '官方译名 · 游戏文本表', en: 'Official · game text', cls: 'ok' },
  client: { zh: '官方译名 · 客户端', en: 'Official · client config', cls: 'ok' },
  table: { zh: '站内对照', en: 'Site table', cls: 'dim' },
  ambiguous: { zh: '译名待核', en: 'Unverified', cls: 'warn' },
  none: { zh: '非官方译名（站内译）', en: 'Unofficial (site rendering)', cls: 'warn' },
};

function openKeyword(k) {
  const cnt = k.cnt || {};
  const en = lang.cur === 'en';
  const src = KW_SRC[k.src];
  dlg.replaceChildren(
    h('button', { class: 'close', onclick: () => dlg.close() }, '×'),
    h('div', { class: 'dbody' },
      h('div', { class: 'dart small' }, kwIcon(k, 96)),
      h('div', { class: 'dtext' },
        h('h2', {}, kwName(k)), h('div', { class: 'en' }, [k.e, ...k.a].join(' · ')),
        h('div', { class: 'chips' },
          h('span', { class: 'chip' }, en ? (KW_TYPE_EN[k.t] || k.t) : (KW_TYPE[k.t] || k.t)),
          src ? h('span', { class: `chip ${src.cls}` }, en ? src.en : src.zh) : null,
          k.nOld ? h('span', { class: 'chip dim' }, `${en ? 'was' : '原译'}：${k.nOld}`) : null),
        h('div', { class: 'dblock' }, h('p', { class: 'prewrap' }, renderText(k.d))),
        src && (src.cls === 'warn') ? h('p', { class: 'note' },
          en ? 'This Chinese name has no confirmed match in official game text; treat it as a reference only.'
            : '该中文名未在官方文本中核实，仅供参考；如与官方/维基用词不同，以官方为准。') : null,
        h('div', { class: 'sec' }, en ? 'Find entries with this keyword' : '查找包含该关键词的条目'),
        h('div', { class: 'kwfind' }, Object.keys(KINDS).map(kind => h('button', { type: 'button', class: 'btn ghost sm', disabled: !cnt[kind],
          onclick: () => { tab = kind; kwSel = [k.s]; filt = {}; q = ''; dlg.close(); render(); } }, `${kindName(kind)} ${cnt[kind] || 0}`))))));
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
  const en = lang.cur === 'en';
  const counts = kwCounts();
  if (!Object.keys(counts).length) return null;
  const avail = KW.list.filter(k => counts[k.s] && !kwSel.includes(k.s));
  const quick = [...avail].sort((a, b) => counts[b.s] - counts[a.s]).slice(0, 12);
  const sel = h('select', { class: 'kwsel', onchange: ev => { if (ev.target.value) { kwSel = [...kwSel, ev.target.value]; render(); } } },
    h('option', { value: '' }, en ? '+ Filter by keyword…' : '＋ 按关键词筛选…'),
    Object.entries(KW_TYPE).map(([t, label]) => {
      const ks = avail.filter(k => k.t === t);
      return ks.length ? h('optgroup', { label: en ? (KW_TYPE_EN[t] || label) : label }, ks.map(k => h('option', { value: k.s }, `${kwName(k)}（${counts[k.s]}）`))) : null;
    }));
  return h('div', { class: 'kwbar' },
    h('div', { class: 'kwline' }, h('small', {}, en ? 'Keywords:' : '关键词：'),
      kwSel.map(s => { const k = KW.by[s]; return h('button', { type: 'button', class: 'chip kwtag on', title: en ? 'Remove' : '点击移除', onclick: () => { kwSel = kwSel.filter(x => x !== s); render(); } }, kwIcon(k, 16), kwName(k), ' ×'); }),
      sel,
      kwSel.length > 1 ? h('select', { onchange: ev => { kwMode = ev.target.value; render(); } },
        h('option', { value: 'all', selected: kwMode === 'all' }, en ? 'All' : '同时包含'), h('option', { value: 'any', selected: kwMode === 'any' }, en ? 'Any' : '包含任一')) : null,
      kwSel.length ? h('button', { type: 'button', class: 'link', onclick: () => { kwSel = []; render(); } }, en ? 'Clear' : '清除') : null),
    quick.length ? h('div', { class: 'kwline quick' }, h('small', {}, en ? 'Common:' : '常见：'),
      quick.map(k => h('button', { type: 'button', class: 'chip kwtag', onclick: () => { kwSel = [...kwSel, k.s]; render(); } }, kwIcon(k, 16), `${kwName(k)} ${counts[k.s]}`))) : null);
}

function render() {
  writeHash();
  const en = lang.cur === 'en';
  const COUNT = { ...Object.fromEntries(Object.keys(KINDS).map(k => [k, D[k].length])), keyword: KW.list.length };
  const hasUse = (D[tab] || []).some(e => e.use != null);
  const items = list();
  const fs = ((lang.cur === 'en' ? FILTERS : FILTERS_ZH)[tab] || []).map(([k, label]) => {
    const vals = [...new Set(pool().map(e => e[k]).filter(Boolean))].sort();
    if (!vals.length) return null;
    // 筛选下拉里的取值来自数据本身（阵营/定位只有中文），英文界面下同样要过一遍译名
    const optLabel = (v) => {
      if (!en) return tab === 'keyword' ? (k === 't' ? (KW_TYPE[v] || v) : (k === 'g' ? (KW_GROUP[v] || v) : v)) : v;
      if (tab === 'keyword') return k === 't' ? (KW_TYPE_EN[v] || v) : (k === 'g' ? (KW_GROUP_EN[v] || v) : v);
      if (k === 'realm') return REALM_ZH2EN[v] || v;
      if (k === 'role') return ROLE_ZH2EN[v] || v;
      return v;
    };
    return h('select', { onchange: ev => { filt[k] = ev.target.value; render(); } },
      h('option', { value: '' }, `${en ? 'All ' : '全部'}${label}`), vals.map(v => h('option', { value: v, selected: filt[k] === v }, optLabel(v))));
  });
  root.replaceChildren(...[
    h('div', { class: 'tabs' }, TABS.map(k => h('button', { class: k === tab ? 'on' : '', onclick: () => { tab = k; filt = {}; sort = 'default'; render(); } },
      tabName(k), h('small', {}, COUNT[k])))),
    h('div', { class: 'toolbar' },
      h('input', { type: 'search', placeholder: en ? 'Search CN / EN' : '搜索中文 / 英文名', value: q, oninput: ev => { q = ev.target.value.trim().toLowerCase(); renderGrid(); } }),
      fs,
      h('select', { onchange: ev => { sort = ev.target.value; render(); } },
        h('option', { value: 'default' }, en ? 'Default' : '默认顺序'), h('option', { value: 'name' }, en ? 'By name' : '按名称'),
        hasUse ? h('option', { value: 'use', selected: sort === 'use' }, en ? 'By usage' : '按使用率') : null),
      h('span', { class: 'note', id: 'cnt' }, `${items.length} ${en ? '' : '项'}`)),
    tab === 'keyword' ? h('div', { class: 'kwgline' },
      h('span', { class: 'kwg' }, en ? 'Group:' : '机制分类：'),
      Object.entries(en ? KW_GROUP_EN : KW_GROUP).filter(([g]) => g !== 'misc').map(([g, label]) =>
        h('span', { class: 'kwg' }, h('i', { class: g }), label))) : null,
    kwBar(),
    h('div', { class: 'cgrid', id: 'cgrid' }, items.map(card)),
  ].filter(Boolean));
}

function renderGrid() {
  const items = list();
  $('#cgrid').replaceChildren(...items.map(card));
  $('#cnt').textContent = `${items.length} ${lang.cur === 'en' ? '' : '项'}`;
}

function card(e) {
  if (tab === 'keyword') {
    const k = KW.by[e.s];
    const total = Object.values(k.cnt || {}).reduce((a, b) => a + b, 0);
    return h('button', { class: 'ccard kwcard', type: 'button', onclick: () => openKeyword(k) },
      kwIcon(k, 56), h('b', {}, kwName(k)), h('small', {}, `${lang.cur === 'en' ? (KW_TYPE_EN[k.t] || k.t) : (KW_TYPE[k.t] || k.t)}${total ? ` · ${total}` : ''}`));
  }
  const nm = nameOf(e);
  return h('button', { class: 'ccard', type: 'button', onclick: () => openDetail(tab, e) },
    imgEl(e.img, nm),
    h('b', {}, nm),
    h('small', {}, sub(e) || '\u00a0'),
    e.use != null && e.use > 0 ? h('em', {}, `${e.use}%`) : null);
}

render();
