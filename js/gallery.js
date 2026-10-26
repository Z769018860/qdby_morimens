// CG 典藏馆：灰机 wiki 收录的官方 CG，用积分解锁后放大观看
import { $, h, nav, t, lang, wallet, unlocked, imgEl } from './common.js';

document.body.prepend(nav('gallery'));
const root = $('#app');
root.textContent = t('loading');

const G = await (await fetch('data/gallery.json')).json();
const ITEMS = G.items;
const GROUPS = [{ k: '', zh: t('galleryAll'), en: t('galleryAll'), n: ITEMS.length }, ...G.groups];

// 解锁价：越稀有越贵（动态绘卷 / 典藏馆 最贵）
const COST = { hall: 60, dyn: 55, record: 45, story: 40, scene: 30, misc: 30 };
const costOf = (it) => COST[it.g] || 30;
const titleOf = (it) => (lang.cur === 'en' ? it.e : it.t);

let group = '';
let only = 'all';   // all | locked | unlocked
const params = new URLSearchParams(location.search);
let q = (params.get('q') || params.get('name') || '').trim();

const grid = h('div', { class: 'cggrid' });
const tabs = h('div', { class: 'cgtabs' });
const bar = h('div', { class: 'cgbar' });
const dlg = h('dialog', { class: 'cgview' });
document.body.append(dlg);

let idx = -1;
let view = [];

function statsLine() {
  const own = ITEMS.filter(i => unlocked.has(i.id)).length;
  return `${t('galleryProgress', { a: own, b: ITEMS.length })} · ${t('credits')} ◈${wallet.get()}`;
}

function drawTabs() {
  tabs.replaceChildren(...GROUPS.map(g => h('button', {
    type: 'button', class: `cgtab${group === g.k ? ' on' : ''}`,
    onclick: () => { group = g.k; render(); },
  }, `${lang.cur === 'en' ? g.en : g.zh}`, h('small', {}, ` ${g.n}`))));
}

function render() {
  drawTabs();
  bar.replaceChildren(
    h('span', { class: 'credits big' }, statsLine()),
    h('div', { class: 'cgtools' },
      h('input', {
        class: 'cgsearch', type: 'search', value: q, placeholder: t('gallerySearch'),
        oninput: (e) => { q = e.target.value.trim(); drawGrid(); },
      }),
      h('button', { type: 'button', class: `link${only === 'all' ? ' on' : ''}`, onclick: () => { only = 'all'; render(); } }, '全部'),
      h('button', { type: 'button', class: `link${only === 'locked' ? ' on' : ''}`, onclick: () => { only = 'locked'; render(); } }, '未解锁'),
      h('button', { type: 'button', class: `link${only === 'unlocked' ? ' on' : ''}`, onclick: () => { only = 'unlocked'; render(); } }, t('galleryUnlocked'))));

  drawGrid();
}

function drawGrid() {
  const kw = q.toLowerCase();
  view = ITEMS.filter(i => (!group || i.g === group)
    && (!kw || (i.t + ' ' + i.e + ' ' + i.n).toLowerCase().includes(kw))
    && (only === 'all' || (only === 'locked' ? !unlocked.has(i.id) : unlocked.has(i.id))));
  grid.replaceChildren(...view.map((it, i) => card(it, i)));
  if (q) {
    grid.prepend(h('div', { class: 'cggline' }, h('span', { class: 'chip gold' }, `🔍 ${q}`),
      h('button', { type: 'button', class: 'link', onclick: () => { q = ''; history.replaceState(null, '', 'gallery.html'); render(); } }, t('galleryClear') + ' ×')));
  }
  if (!view.length) grid.append(h('p', { class: 'note' }, t('galleryEmpty')));
}

function card(it, i) {
  const own = unlocked.has(it.id);
  const c = costOf(it);
  return h('button', {
    type: 'button', class: `cgcard${own ? ' own' : ' locked'}`, title: titleOf(it),
    onclick: () => {
      if (own) return open(i);
      if (wallet.spend(c)) {
        unlocked.add(it.id);
        bar.firstChild.textContent = statsLine();
        render();
        open(view.findIndex(x => x.id === it.id));
      } else {
        toast(t('noCredits'));
      }
    },
  },
    h('div', { class: 'cgthumb' }, imgEl(it.f, titleOf(it))),
    h('div', { class: 'cgmeta' },
      h('b', {}, titleOf(it)),
      own ? h('small', { class: 'own-tag' }, `✓ ${t('galleryUnlocked')}`) : h('small', { class: 'lock-tag' }, `🔒 ${t('galleryUnlock', { n: c })}`)));
}

function toast(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 1600);
}

function open(i) {
  idx = Math.max(0, i);
  const it = view[idx];
  if (!it) return;
  dlg.replaceChildren(
    h('div', { class: 'cgviewhead' },
      h('b', {}, titleOf(it)),
      h('small', { class: 'note' }, `${it.w}×${it.h} · ${it.g}`),
      h('a', { class: 'link', href: `https://morimens.huijiwiki.com/wiki/${encodeURIComponent('文件:' + it.n)}`, target: '_blank', rel: 'noopener' }, t('galleryOriginal')),
      h('button', { class: 'btn sm ghost', onclick: () => dlg.close() }, t('close'))),
    h('div', { class: 'cgstage' },
      h('button', { type: 'button', class: 'cgnav prev', onclick: () => open(idx - 1), disabled: idx === 0 }, '‹'),
      imgEl(it.f, titleOf(it), 'cgbig'),
      h('button', { type: 'button', class: 'cgnav next', onclick: () => open(idx + 1), disabled: idx >= view.length - 1 }, '›')));
  dlg.showModal();
}

document.addEventListener('keydown', e => {
  if (!dlg.open) return;
  if (e.key === 'ArrowLeft') open(idx - 1);
  if (e.key === 'ArrowRight') open(idx + 1);
});

root.replaceChildren(
  h('section', { class: 'card' },
    h('h2', {}, t('galleryTitle')),
    h('p', { class: 'note' }, t('gallerySub')),
    h('p', { class: 'note' }, t('galleryLockNote')),
    h('p', { class: 'note' }, G.license || '')),
  h('section', { class: 'card cgpanel' }, bar, tabs, grid));
render();
