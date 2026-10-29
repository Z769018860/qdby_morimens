// 管理后台 —— 只有「姜酒」这个账号能进。
//
// 权限判定全在服务端（edge-functions 的 /whoami 与 /admin/*）：
// 前端这个页面只是个界面，就算有人直接打开 admin.html，拿不到 /admin/overview
// 也什么都看不到。第一次认领时服务端会把 uid 钉进 admin_uid，
// 之后别人把昵称改成「姜酒」也进不来。
import { $, h, toast, store } from './common.js';
import { auth, openLogin } from './auth.js';
import * as sitestats from './sitestats.js';
// 不用 js/api.js：那份在 GitHub Pages 上认为「没有后端」（ready() 为 false → 直接抛 no_api），
// 而镜像站其实能跨域打到 EdgeOne 的函数（对方回了 CORS）。这里自己拼请求，
// 地址从 sitestats.base() 拿，跟统计口径保持一致。

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

// ------------------------------------------------------------------ 请求
// 自己拼，不吃 js/api.js 的「github.io 就当没后端」
function tokenOf() {
  try { return store.get('authToken', '') || ''; } catch { return ''; }
}

async function req(path, { method = 'GET', body } = {}) {
  const b = sitestats.base();
  if (!b) {
    const e = new Error('no_api'); e.status = 0; e.code = 'no_api'; throw e;
  }
  const headers = { Accept: 'application/json' };
  const t = tokenOf();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(b + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    const e = new Error('offline'); e.status = 0; e.code = 'offline'; throw e;
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) {
    const e = new Error(j.error || ('http_' + res.status));
    e.status = res.status;
    e.code = j.error || '';
    e.detail = j.detail || null;
    throw e;
  }
  return j;
}

// ------------------------------------------------------------------ 门禁
function gate(title, ...parts) {
  app.replaceChildren(h('section', { class: 'card gate' }, h('h1', {}, title), ...parts));
}

// 诊断块：把「前端以为的」和「服务端看到的」都摊开。
// 之前这里只写一句「不是站长账号」，站长本人看到了也无从下手——
// 搞不清是昵称不对、位置被占、还是函数根本没部署。
function diag(rows) {
  return h('div', { class: 'diag' },
    rows.map(([k, v]) => h('div', { class: 'diagrow' },
      h('span', {}, k),
      h('b', {}, String(v == null || v === '' ? '—' : v)))));
}

function needsLogin() {
  gate('需要登录', h('p', {}, '这个页面只对站长的账号开放。请先用「姜酒」登录。'),
    h('div', {}, h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册')));
}

function denied(d) {
  const name = (d && d.name) || (auth.user && auth.user.name) || '未知';
  const uid = String((d && d.uid) || '');
  const pinned = d && d.pinned ? String(d.pinned) : '';
  gate('没有权限',
    h('p', {}, d && d.hint ? d.hint : `当前登录的是「${name}」，不是站长账号。`),
    diag([
      ['当前显示名', name],
      ['当前 UID', uid ? uid.slice(0, 16) + '…' : ''],
      ['服务端钉住的 UID', pinned ? pinned.slice(0, 16) + '…' : '还没被认领'],
      ['后端地址', sitestats.base()],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页'),
      h('button', { class: 'btn ghost', onclick: () => location.reload() }, '重新判定')));
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
      const r = await req('/admin/grant', { method: 'POST', body: { uid: u.uid, amount, note: noteEl.value.trim() } });
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

function render(data, h0) {
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
      h('p', {}, `当前登录：${who} · 只对站长可见。用户数据是「登录过本站的账号」，不是 Waline 全站注册表。`),
      h('p', { class: 'sub' }, `后端 ${(h0 && h0.base) || sitestats.base()} · 接口 v${(h0 && h0.v) || 0} · 存储 ${(h0 && h0.store) || '未知'}${h0 && h0.storeOk === false ? '（不可写！）' : ''}`)),
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
let BACKEND = { base: '', v: 0, store: '', storeOk: true };

const retryBtn = () => h('button', { class: 'btn ghost', onclick: () => location.reload() }, '重试');

function noBackend(h0) {
  gate('连不上后端',
    h('p', {}, '统计和管理都放在站点后端里，但这一次一个地址都没探通。GitHub Pages 那份镜像自己没有函数，只能借 EdgeOne 的；那边要是没部署或挂了，这里就是空的。'),
    diag([
      ['试过的地址', sitestats.EDGE_API],
      ['当前页面', location.host],
      ['本机配置的后端', (() => { try { return store.get('apiBase', '') || '（没配）'; } catch { return ''; } })()],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
}

function oldBackend(h0) {
  gate('后端还是旧版本',
    h('p', {}, `线上这版函数是 v${h0.v}，只有点赞 / 账号档案 / 工坊题库，没有 /stats、/whoami、/admin/*。`),
    h('p', {}, '代码已经在仓库里了，去 EdgeOne 控制台把这个项目重新部署一次就会生效。数据不会丢——存储还是同一个 Blob 命名空间（zjtt），新函数读的是同一份。'),
    diag([
      ['探测到的后端', h0.base],
      ['接口版本', 'v' + h0.v],
      ['存储', (h0.store || '未知') + (h0.storeOk ? '' : '（不可写）')],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('a', { class: 'btn ghost', href: 'https://console.cloud.tencent.com/edgeone/pages', target: '_blank', rel: 'noopener' }, '打开 EdgeOne 控制台'),
      retryBtn()));
}

async function load() {
  try {
    const data = await req('/admin/overview');
    USERS = data.users || [];
    render(data, BACKEND);
  } catch (e) {
    if (e.status === 401) { needsLogin(); return; }
    if (e.status === 403) { denied(e.detail); return; }
    if (e.code === 'not_found' || e.status === 404) { oldBackend(BACKEND); return; }
    if (e.status === 0) { noBackend(BACKEND); return; }
    gate('载入失败',
      h('p', {}, `接口没返回数据：${e.message || '未知错误'}。`),
      diag([['后端地址', sitestats.base()], ['状态码', e.status || ''], ['错误码', e.code || '']]),
      h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
  }
}

// 先问后端版本，再决定是「没部署」「没权限」还是真的坏了。
// 这三种在前端看起来都是「进不去」，但要做的事完全不同。
async function boot() {
  gate('正在检查后端…', h('p', {}, '先确认站点函数是哪一版，再决定给不给看。'));
  const h0 = await sitestats.health(true);
  BACKEND = h0;
  if (!h0.base) { noBackend(h0); return; }
  if (h0.v < 3) { oldBackend(h0); return; }
  await load();
}

if (!auth.logged) {
  needsLogin();
} else {
  boot();
}
