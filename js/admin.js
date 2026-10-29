// 管理后台 —— 只有「姜酒」这个账号能进。
//
// 权限判定全在服务端（edge-functions 的 /whoami 与 /admin/*）：
// 前端这个页面只是个界面，就算有人直接打开 admin.html，拿不到 /admin/overview
// 也什么都看不到。第一次认领时服务端会把 uid 钉进 admin_uid，
// 之后别人把昵称改成「姜酒」也进不来。
import { $, h, toast } from './common.js';
import { auth, openLogin } from './auth.js';
import { api } from './api.js';
import * as sitestats from './sitestats.js';

const app = $('#app');
const sheet = $('#sheet');
const sheetBox = $('#sheetBox');

const fmt = sitestats.fmt;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const when = (ms) => {
  const n = Number(ms) || 0;
  if (!n) return '—';
  const d = new Date(n);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const ago = (ms) => {
  const n = Number(ms) || 0;
  if (!n) return '—';
  const s = Math.max(0, (Date.now() - n) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  if (s < 86400 * 30) return Math.floor(s / 86400) + ' 天前';
  return when(n).slice(0, 10);
};

// ------------------------------------------------------------------ 门禁
function gate(title, sub, extra) {
  app.replaceChildren(h('section', { class: 'card gate' },
    h('h1', {}, title),
    h('p', {}, sub),
    extra || null));
}

function needsLogin() {
  gate('需要登录', '这个页面只对站长的账号开放。请先用「姜酒」登录。',
    h('div', {}, h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册')));
}

function denied(name) {
  gate('没有权限', `当前登录的是「${name || '未知'}」，不是站长账号。`,
    h('div', {}, h('a', { class: 'btn ghost', href: 'index.html' }, '回首页')));
}

// ------------------------------------------------------------------ 发放面板
function openGrant(u, onDone) {
  const amountEl = h('input', { type: 'number', min: '1', max: '100000', value: '100', placeholder: '银芯数量' });
  const noteEl = h('input', { type: 'text', maxlength: '120', placeholder: '备注（会显示给用户，例如「BUG 反馈奖励」）' });
  const okBtn = h('button', { class: 'btn gold', onclick: send }, '确认发放');
  const quick = h('div', { class: 'quick' }, [50, 100, 300, 1000, 3000].map((v) => h('button', {
    type: 'button', onclick: () => { amountEl.value = String(v); },
  }, String(v))));

  async function send() {
    const amount = Math.round(Number(amountEl.value) || 0);
    if (!(amount > 0)) { toast('数量要大于 0'); return; }
    okBtn.disabled = true;
    okBtn.textContent = '发放中…';
    try {
      const r = await api.post('/admin/grant', { uid: u.uid, amount, note: noteEl.value.trim() });
      toast(`已给「${u.name || u.uid}」发放 ${r.amount} 银芯（对方下次打开站点时到账）`);
      closeSheet();
      if (onDone) onDone();
    } catch (e) {
      toast('发放失败：' + (e.message || e.code || '未知错误'));
      okBtn.disabled = false;
      okBtn.textContent = '确认发放';
    }
  }

  sheetBox.replaceChildren(
    h('h3', {}, '发放银芯'),
    h('p', { class: 'who' }, `${u.name || '（未命名）'} · 当前 ${u.acct ? u.acct.cr : 0} 银芯 · UID ${String(u.uid).slice(0, 10)}…`),
    quick,
    h('div', { class: 'row' }, amountEl),
    h('div', { class: 'row' }, noteEl),
    h('div', { class: 'acts' },
      h('button', { class: 'btn ghost', onclick: closeSheet }, '取消'), okBtn));
  sheet.classList.add('on');
  amountEl.focus();
}
function closeSheet() { sheet.classList.remove('on'); }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ------------------------------------------------------------------ 主体
let USERS = [];
let Q = '';

function kpis(s, users) {
  const synced = users.filter((u) => u.acct).length;
  const active7 = users.filter((u) => Date.now() - (u.seen || u.at || 0) < 7 * 86400e3).length;
  const box = (label, value, sub) => h('div', { class: 'kpi' }, h('small', {}, label), h('b', {}, value), h('span', {}, sub || ''));
  return h('div', { class: 'kpis' },
    box('注册用户', fmt(s.users), `最近 7 天活跃 ${active7}`),
    box('今日浏览', fmt(s.today), ''),
    box('总浏览', fmt(s.total), ''),
    box('有云端档案', String(synced), `占 ${pct(synced, users.length)}%`),
    box('BUG 反馈', String(s.bugs || 0), '历史累计'));
}

function row(u) {
  const a = u.acct || null;
  return h('tr', {},
    h('td', {}, h('div', { class: 'namecell' },
      h('b', {}, u.name || '（未命名）'),
      a ? h('span', { class: 'badge ok' }, '已同步') : h('span', { class: 'badge no' }, '未同步'))),
    h('td', {}, ago(u.seen || u.at)),
    h('td', {}, when(u.at)),
    h('td', { class: 'num' }, a ? String(a.cr) : '—'),
    h('td', { class: 'num' }, a ? String(a.played) : '—'),
    h('td', { class: 'num' }, a && a.played ? pct(a.won, a.played) + '%' : '—'),
    h('td', { class: 'num' }, a ? String(a.cg) : '—'),
    h('td', { class: 'num' }, a ? String(a.mb) : '—'),
    h('td', { class: 'num' }, a ? String(a.bb) : '—'),
    h('td', {}, a ? when(a.at) : '—'),
    h('td', {}, h('button', { class: 'btn sm gold', onclick: () => openGrant(u, load) }, '发放')));
}

function table() {
  const list = Q
    ? USERS.filter((u) => (u.name || '').toLowerCase().includes(Q) || String(u.uid).includes(Q))
    : USERS;
  if (!list.length) return h('p', { class: 'empty' }, Q ? '没有匹配的用户。' : '还没有任何账号登录过本站。');
  return h('div', { class: 'tblwrap' },
    h('table', {},
      h('thead', {}, h('tr', {},
        h('th', {}, '账号'), h('th', {}, '最近活跃'), h('th', {}, '首次登录'),
        h('th', {}, '银芯'), h('th', {}, '推理局数'), h('th', {}, '胜率'),
        h('th', {}, 'CG'), h('th', {}, '合成最高分'), h('th', {}, '鸟弟最深'),
        h('th', {}, '同步时间'), h('th', {}, '操作'))),
      h('tbody', {}, list.slice(0, 300).map(row))));
}

function render(data) {
  const me = data.me || {};
  const stats = data.stats || { users: 0, today: 0, total: 0, bugs: 0 };
  const who = me.name || (auth.user && auth.user.name) || '管理员';
  const searchEl = h('input', { type: 'text', placeholder: '搜昵称或 UID', value: Q, style: 'width:200px' });
  searchEl.addEventListener('input', () => {
    Q = searchEl.value.trim().toLowerCase();
    body.replaceChildren(table());
  });
  const body = h('div', {}, table());
  const refresh = h('button', { class: 'btn ghost sm', onclick: (e) => { e.target.disabled = true; load(); } }, '刷新');

  app.replaceChildren(
    h('section', { class: 'pagehead' },
      h('h1', {}, '管理后台'),
      h('p', {}, `当前登录：${who} · 只对站长可见。用户数据是「登录过本站的账号」，不是 Waline 全站注册表。`)),
    h('section', { class: 'card' },
      h('h2', {}, '站点概况'),
      h('p', { class: 'sub' }, '浏览数从 2026-10 起统计；注册用户指用过本站的账号。'),
      kpis(stats, data.users || [])),
    h('section', { class: 'card' },
      h('h2', {}, `用户列表 · ${(data.users || []).length}`),
      h('p', { class: 'sub' }, '「未同步」= 登录过但没传过云端档案，说明他只在游客模式下点过登录。发放的银芯在对方下次打开站点、同步档案时到账。'),
      h('div', { class: 'toolbar' }, searchEl, refresh),
      body));
}

// ------------------------------------------------------------------ 载入
async function load() {
  try {
    const data = await api.get('/admin/overview');
    USERS = data.users || [];
    render(data);
  } catch (e) {
    if (e.status === 401) { needsLogin(); return; }
    if (e.status === 403) { denied((auth.user && auth.user.name) || ''); return; }
    gate('载入失败', `接口没返回数据：${e.message || e.code || '未知错误'}。站点后端可能暂时不可用。`,
      h('div', {}, h('button', { class: 'btn ghost', onclick: () => location.reload() }, '重试')));
  }
}

if (!auth.logged) {
  needsLogin();
} else {
  // 先用 /whoami 判一次权限，再拉数据——不然被拒的人也会先看到一次 403 的错误页
  sitestats.whoami().then((me) => {
    if (!me.admin) { denied(me.name || (auth.user && auth.user.name) || ''); return; }
    load();
  }).catch(() => load());
}
