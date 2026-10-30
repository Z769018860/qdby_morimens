// 管理后台 —— 只有「姜酒」这个账号能进。
//
// 权限判定全在服务端（edge-functions 的 /whoami 与 /admin/*）：
// 前端这个页面只是个界面，就算有人直接打开 admin.html，拿不到 /admin/overview
// 也什么都看不到。第一次认领时服务端会把 uid 钉进 admin_uid，
// 之后别人把昵称改成「姜酒」也进不来。
import { $, h, toast, store } from './common.js';
import { auth, openLogin } from './auth.js';
import * as sitestats from './sitestats.js';
// 九个游戏的字段名与显示顺序只在 js/gamestats.js 里写一遍（GD_SPEC），
// 后台按它渲染，跟 digest() 上报的数组一一对应。
import { GD_SPEC, fmtDur } from './gamestats.js';
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

async function req(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const b = sitestats.base();
  if (!b) {
    const e = new Error('no_api'); e.status = 0; e.code = 'no_api'; throw e;
  }
  const headers = { Accept: 'application/json' };
  const t = tokenOf();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // 一定要有上限：边缘函数的 /admin/overview 要扫全部用户，碰上慢请求能挂几十秒，
  // 没有超时的话页面就一直停在「正在检查后端…」，看起来像卡死。
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
  let res;
  try {
    res = await fetch(b + path, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ac ? ac.signal : undefined,
    });
  } catch (err) {
    const slow = err && err.name === 'AbortError';
    const e = new Error(slow ? 'timeout' : 'offline');
    e.status = 0; e.code = slow ? 'timeout' : 'offline'; e.ms = timeout;
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
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
  const t = tokenOf();
  gate('需要登录', h('p', {}, '这个页面只对站长的账号开放。请先用「姜酒」登录。'),
    t ? diag([
      ['本机登录状态', '有 token，但后端不认'],
      ['后端地址', sitestats.base() || '（一个都没探通）'],
      ['提示', '后端要是 v3 之前的版本，验票接口是坏的，重新部署 edge-functions 后再点重试'],
    ]) : null,
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'),
      t ? retryBtn() : null));
}

// 阶段提示：这一步可能要等十几秒，写清楚在等什么，别让人以为卡死了
function loading(title, sub) {
  gate(title, h('p', {}, sub || '最多等 20 秒；超时会自动报错并给重试按钮，不用刷新页面。'));
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
  sheetBox.classList.remove('wide');
  sheet.classList.add('on');
  amountEl.focus();
}
function closeSheet() { sheet.classList.remove('on'); }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ------------------------------------------------------------------ 九个游戏的详情
// 数据来自云端档案的 gd（js/gamestats.js 的 digest）：只有数字摘要，没有整份存档。
function openGames(u) {
  const a = u.acct || {};
  const gd = (a.gd && typeof a.gd === 'object' && !Array.isArray(a.gd)) ? a.gd : null;
  const cards = [];
  if (gd) {
    for (const spec of GD_SPEC) {
      const v = gd[spec.k];
      if (!Array.isArray(v) || !v.length) continue;
      cards.push(h('div', { class: 'gcard' },
        h('b', {}, spec.n),
        h('div', { class: 'ggrid' }, spec.f(v).map(([k, val]) =>
          h('span', {}, h('i', {}, k), h('em', {}, val))))));
    }
  }
  sheetBox.replaceChildren(
    h('h3', {}, `游戏数据 · ${u.name || '（未命名）'}`),    h('p', { class: 'who' }, `云端档案同步于 ${a.at ? when(a.at) : '—'}。九个游戏的进度都来自对方本机存档，只有数字摘要；换设备不会带走存档本体。`),
    cards.length
      ? h('div', { class: 'gwrap' }, cards)
      : h('p', { class: 'empty' }, '这个账号还没上报游戏数据——档案是旧版，或者他上次同步时还没带上（让对方再打开一次站点就会补上）。'),
    h('div', { class: 'acts' },
      h('button', { class: 'btn ghost', onclick: closeSheet }, '关闭'),
      h('button', { class: 'btn gold', onclick: () => { closeSheet(); openGrant(u, load); } }, '发放银芯')));
  sheetBox.classList.add('wide');
  sheet.classList.add('on');
}

// ------------------------------------------------------------------ 主体
let USERS = [];
let Q = '';
const SEL = new Set();          // 勾选的 uid（批量发放用）
let AWK = null;                  // 挂机前夜唤醒体清单（slug / 中文名），第一次打开批量面板时再读

function kpis(s, users) {
  const synced = users.filter((u) => u.acct).length;
  const withGd = users.filter((u) => u.acct && u.acct.gd && typeof u.acct.gd === 'object').length;
  const active7 = users.filter((u) => Date.now() - (u.seen || u.at || 0) < 7 * 86400e3).length;
  const box = (label, value, sub) => h('div', { class: 'kpi' }, h('small', {}, label), h('b', {}, value), h('span', {}, sub || ''));
  return h('div', { class: 'kpis' },
    box('注册用户', fmt(s.users), `最近 7 天活跃 ${active7}`),
    box('今日浏览', fmt(s.today), ''),
    box('总浏览', fmt(s.total), ''),
    box('有云端档案', String(synced), `占 ${pct(synced, users.length)}%`),
    box('有游戏数据', String(withGd), '九个游戏的进度摘要'),
    box('BUG 反馈', String(s.bugs || 0), '历史累计'));
}

function row(u) {
  const a = u.acct || null;
  const gd = (a && a.gd && typeof a.gd === 'object' && !Array.isArray(a.gd)) ? a.gd : null;
  const il = gd && Array.isArray(gd.il) ? gd.il : null;
  const cb = h('input', { type: 'checkbox', checked: SEL.has(String(u.uid)), 'aria-label': '选择 ' + (u.name || u.uid) });
  cb.addEventListener('change', () => { if (cb.checked) SEL.add(String(u.uid)); else SEL.delete(String(u.uid)); batchHint(); });
  return h('tr', {},
    h('td', {}, cb),
    h('td', {}, h('div', { class: 'namecell' },
      h('b', {}, u.name || '（未命名）'),
      a ? h('span', { class: 'badge ok' }, '已同步') : h('span', { class: 'badge no' }, '未同步'))),
    h('td', {}, ago(u.seen || u.at)),
    h('td', {}, when(u.at)),
    h('td', { class: 'num' }, a ? String(a.cr) : '—'),
    h('td', { class: 'num' }, a ? (a.played ? `${a.played} 局 · ${pct(a.won, a.played)}%` : '0 局') : '—'),
    h('td', { class: 'num' }, a ? String(a.cg) : '—'),
    h('td', { class: 'num' }, a ? String(a.mb) : '—'),
    h('td', { class: 'num' }, a ? String(a.bb) : '—'),
    h('td', {}, il ? fmtDur(il[0]) : '—'),
    h('td', { class: 'num' }, il ? String(il[1]) : '—'),
    h('td', {}, a ? when(a.at) : '—'),
    h('td', {}, h('div', { class: 'rowacts' },
      h('button', { class: 'btn sm ghost', onclick: () => openGames(u) }, '游戏'),
      h('button', { class: 'btn sm gold', onclick: () => openGrant(u, load) }, '发放'))));
}

const matched = () => (Q
  ? USERS.filter((u) => (u.name || '').toLowerCase().includes(Q) || String(u.uid).includes(Q))
  : USERS);

function table() {
  const list = matched();
  if (!list.length) return h('p', { class: 'empty' }, Q ? '没有匹配的用户。' : '还没有任何账号登录过本站。');
  return h('div', { class: 'tblwrap' },
    h('table', {},
      h('thead', {}, h('tr', {},
        h('th', {}, ''), h('th', {}, '账号'), h('th', {}, '最近活跃'), h('th', {}, '首次登录'),
        h('th', {}, '银芯'), h('th', {}, '推理'), h('th', {}, 'CG'),
        h('th', {}, '合成'), h('th', {}, '鸟弟'),
        h('th', {}, '挂机时长'), h('th', {}, '角色'),
        h('th', {}, '同步时间'), h('th', {}, '操作'))),
      h('tbody', {}, list.slice(0, 300).map(row))));
}


// ------------------------------------------------------------------ 批量发放
// 银芯是账号级的（所有游戏共用钱包），唤醒体是挂机前夜的：对方下次打开站点 / 进挂机前夜时到账。
let batchHintEl = null;
function batchHint() {
  if (batchHintEl) batchHintEl.textContent = `已勾选 ${SEL.size} 人 · 当前搜索结果 ${matched().length} 人 · 全部 ${USERS.length} 人`;
}

async function loadAwk() {
  if (AWK) return AWK;
  try {
    const r = await fetch('idle/public/data/game-data.json', { cache: 'no-cache' });
    const d = await r.json();
    AWK = (d.awakeners || []).filter((a) => a && a.slug).map((a) => ({ slug: a.slug, zh: a.zh || a.slug, rarity: a.rarity || '' }));
  } catch { AWK = []; }
  return AWK;
}

function batchCard(onDone) {
  const picked = new Set();
  let target = 'all';
  const amountEl = h('input', { type: 'number', min: '0', max: '100000', value: '100', placeholder: '银芯数量（0 = 不发）' });
  const noteEl = h('input', { type: 'text', maxlength: '120', placeholder: '备注（会显示给用户，例如「全服补偿」）' });
  const awkBox = h('div', { class: 'awkbox' }, h('span', { class: 'sub' }, '读取唤醒体清单…'));
  const awkSearch = h('input', { type: 'text', placeholder: '搜唤醒体名字', style: 'width:160px' });
  const pickedEl = h('p', { class: 'sub' }, '没有选唤醒体（只发银芯）');
  const okBtn = h('button', { class: 'btn gold', onclick: send }, '确认批量发放');
  batchHintEl = h('p', { class: 'sub' });
  batchHint();

  const tgt = h('div', { class: 'tgt' }, [
    ['all', '所有人'], ['sel', '表格里勾选的人'], ['filter', '当前搜索结果'],
  ].map(([k, label]) => {
    const r = h('input', { type: 'radio', name: 'tgt', value: k, checked: k === 'all' });
    r.addEventListener('change', () => { target = k; });
    return h('label', {}, r, ' ' + label);
  }));

  function paintPicked() {
    pickedEl.textContent = picked.size
      ? `唤醒体 ${picked.size} 名：` + [...picked].map((s) => (AWK.find((a) => a.slug === s) || {}).zh || s).join('、') + '（已有的会叠位 +1）'
      : '没有选唤醒体（只发银芯）';
  }
  function paintAwk() {
    const q = awkSearch.value.trim().toLowerCase();
    awkBox.replaceChildren(...AWK.filter((a) => !q || a.zh.toLowerCase().includes(q) || a.slug.includes(q)).map((a) => {
      const b = h('button', { type: 'button', class: 'chip' + (picked.has(a.slug) ? ' on' : ''), title: a.slug }, a.zh);
      b.addEventListener('click', () => { if (picked.has(a.slug)) picked.delete(a.slug); else picked.add(a.slug); b.classList.toggle('on'); paintPicked(); });
      return b;
    }));
    if (!AWK.length) awkBox.replaceChildren(h('span', { class: 'sub' }, '读不到唤醒体清单（idle/public/data/game-data.json），只能发银芯。'));
  }
  loadAwk().then(() => { paintAwk(); });
  awkSearch.addEventListener('input', paintAwk);

  async function send() {
    const amount = Math.round(Number(amountEl.value) || 0);
    const awk = [...picked];
    if (!(amount > 0) && !awk.length) { toast('银芯和唤醒体至少发一样'); return; }
    let body = { amount, awk, note: noteEl.value.trim() };
    let who = '';
    if (target === 'all') { body.all = true; who = `全部 ${USERS.length} 个账号`; }
    else {
      const list = target === 'sel' ? USERS.filter((u) => SEL.has(String(u.uid))) : matched();
      if (!list.length) { toast(target === 'sel' ? '还没有勾选任何人' : '当前搜索没有结果'); return; }
      body.uids = list.map((u) => String(u.uid));
      who = `${list.length} 个账号`;
    }
    const what = [amount > 0 ? `${amount} 银芯` : '', awk.length ? `${awk.length} 名唤醒体` : ''].filter(Boolean).join(' + ');
    if (!confirm(`给 ${who} 各发放：${what}。\n\n发出去收不回，确定？`)) return;
    okBtn.disabled = true; okBtn.textContent = '发放中…';
    try {
      const r = await req('/admin/grant-batch', { method: 'POST', body, timeout: 60000 });
      toast(`已发放给 ${r.sent}/${r.total} 个账号（对方下次打开站点 / 进挂机前夜时到账）`);
      if (onDone) onDone();
    } catch (e) {
      toast('批量发放失败：' + (e.message || e.code || '未知错误'));
    } finally { okBtn.disabled = false; okBtn.textContent = '确认批量发放'; }
  }

  return h('section', { class: 'card' },
    h('h2', {}, '批量发放'),
    h('p', { class: 'sub' }, '银芯进账号钱包（所有游戏通用），唤醒体进挂机前夜的角色库——没有就新增，已有就叠位 +1。可以只发其中一样。'),
    tgt, batchHintEl,
    h('div', { class: 'quick' }, [50, 100, 300, 1000, 3000].map((v) => h('button', { type: 'button', onclick: () => { amountEl.value = String(v); } }, String(v)))),
    h('div', { class: 'row' }, amountEl, noteEl),
    h('div', { class: 'row' }, awkSearch, h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { picked.clear(); paintAwk(); paintPicked(); } }, '清空唤醒体')),
    awkBox, pickedEl,
    h('div', { class: 'acts' }, okBtn));
}

function render(data, h0) {
  const me = data.me || {};
  const stats = data.stats || { users: 0, today: 0, total: 0, bugs: 0 };
  const who = me.name || (auth.user && auth.user.name) || '管理员';
  const searchEl = h('input', { type: 'text', placeholder: '搜昵称或 UID', value: Q, style: 'width:200px' });
  searchEl.addEventListener('input', () => {
    Q = searchEl.value.trim().toLowerCase();
    body.replaceChildren(table());
    batchHint();
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
    batchCard(),
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

async function load(mode) {
  try {
    const data = await req('/admin/overview');
    USERS = data.users || [];
    render(data, BACKEND);
    void mode;
  } catch (e) {
    if (e.status === 401) { needsLogin(); return; }
    if (e.status === 403) { denied(e.detail); return; }
    if (e.code === 'not_found' || e.status === 404) { oldBackend(BACKEND); return; }
    if (e.code === 'timeout') {
      gate('读取超时',
        h('p', {}, `等了 ${Math.round((e.ms || 20000) / 1000)} 秒还没返回。这一屏要把全部用户和云端档案扫一遍，用户多了会慢；也可能是边缘函数那边卡住了。`),
        diag([
          ['后端地址', sitestats.base()],
          ['接口版本', 'v' + (BACKEND.v || 0)],
          ['状态', '请求已中止'],
        ]),
        h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
      return;
    }
    if (e.status === 0) { noBackend(BACKEND); return; }
    gate('载入失败',
      h('p', {}, `接口没返回数据：${e.message || '未知错误'}。`),
      diag([['后端地址', sitestats.base()], ['状态码', e.status || ''], ['错误码', e.code || ''], ['详情', typeof e.detail === 'string' ? e.detail : (e.detail ? JSON.stringify(e.detail).slice(0, 200) : '')]]),
      h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
  }
}

// 先问后端版本，再决定是「没部署」「没权限」还是真的坏了。
// 这三种在前端看起来都是「进不去」，但要做的事完全不同。
async function boot() {
  loading('正在检查后端…', '先确认站点函数是哪一版，再决定给不给看。最多等 20 秒。');
  let h0;
  try {
    h0 = await sitestats.health(true);
  } catch (e) {
    // 之前这里没有 catch：探测一抛异常，页面就永远停在「正在检查后端…」，
    // 站长看到的只有一句「载入中」，连错在哪都不知道。
    gate('检查后端出错',
      h('p', {}, `探测接口时抛了异常：${(e && e.message) || e}。`),
      diag([['当前页面', location.host], ['候选后端', sitestats.EDGE_API]]),
      h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
    return;
  }
  BACKEND = h0 || { base: '', v: 0, store: '', storeOk: true };
  if (!h0 || !h0.base) { noBackend(BACKEND); return; }
  if (h0.v < 3) { oldBackend(h0); return; }
  loading('正在读取用户列表…', `后端 ${h0.base} · 接口 v${h0.v}，这一屏要扫一遍用户表，最多等 20 秒。`);
  await load('boot');
}

if (!auth.logged) {
  needsLogin();
} else {
  boot();
}
