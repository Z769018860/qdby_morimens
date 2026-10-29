// 忘忘同人小游戏 · 个人中心
//
// 和原来的「战报侦探 个人中心」最大的区别：这个页面属于整个同人合集，
// 不是某一个游戏。所以：
//   · 顶栏自己写（不调 common.js 的 nav()，那份品牌是战报侦探、导航也是推理线）；
//   · 主体是一张「九个游戏进度总览」，数据全部来自 js/gamestats.js；
//   · 左上角显示站点计数（注册用户 / 今日浏览 / 总浏览），数据来自后端 /stats。
//
// 账号那部分（登录、昵称、头像、云端同步）沿用 auth.js / account.js，不重写。
import { $, h, store, wallet, toast, markDirty, scNum, emptyState } from './common.js';
import { auth, openLogin, avatarLib, nameOfMail } from './auth.js';
import { account, CAP } from './account.js';
import { GAMES, readAll, credits } from './gamestats.js';
import * as sitestats from './sitestats.js';

const app = $('#app');
const head = $('#pfhRight');
const stamp = (ms) => {
  const d = new Date(Number(ms) || 0);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const meter = (label, value, sub) => h('div', { class: 'statbox' },
  h('small', {}, label), h('b', {}, value), sub ? h('small', { class: 'dim' }, sub) : null);

// ------------------------------------------------------------------ 站点计数
// 先给缓存里的旧数（立即有内容），再拿新的。后端不可用就整块隐藏，不显示「0」骗人。
async function paintSiteStat() {
  const box = $('#sitestat');
  if (!box) return;
  const put = (s) => {
    if (!s || (!s.total && !s.users)) return;
    box.classList.remove('off');
    $('#st-users').textContent = sitestats.fmt(s.users);
    $('#st-today').textContent = sitestats.fmt(s.today);
    $('#st-total').textContent = sitestats.fmt(s.total);
    box.title = `注册用户 ${s.users} · 今日浏览 ${s.today} · 总浏览 ${s.total}`;
  };
  put(sitestats.cached());
  sitestats.ping();
  const fresh = await sitestats.stats(true);
  put(fresh);
}

// ------------------------------------------------------------------ 游戏总览
function gamesBox() {
  const all = readAll();
  const cards = GAMES.map((g) => {
    const d = all[g.k] || { items: [], extra: '' };
    return h('a', { class: 'gcard', href: g.href },
      h('div', { class: 'gh' },
        h('span', { class: 'ic' }, g.icon),
        h('span', { class: 'nm' }, g.n)),
      h('div', { class: 'items' }, d.items.map((it) => h('div', {},
        h('b', {}, it.v), h('small', {}, it.k)))),
      h('div', { class: 'extra' }, d.extra || g.tip),
      h('div', { class: 'go' }, '进入 →'));
  });
  return h('section', { class: 'card' },
    h('h2', {}, '我的游戏数据'),
    h('p', { class: 'sub' }, '九个同人小游戏的进度都存在这台设备上，登录后可以把账号数据同步到云端。'),
    h('div', { class: 'games' }, cards));
}

// ------------------------------------------------------------------ 账号概览
function guestCard() {
  return h('section', { class: 'card' },
    h('h2', {}, '还没有登录'),
    h('p', { class: 'sub' }, '不登录也能玩全部游戏，进度只存在这台设备上。登录后可以换设备继续，也能收到管理员发放的银芯。'),
    h('div', { class: 'pfstats' },
      meter('银芯', [scNum(wallet.get(), 17)]),
      meter('已解锁 CG', String((store.get('cg', []) || []).length)),
      meter('推理记录', String((store.get('hist', []) || []).length)),
      meter('失败题库', String((store.get('failed', []) || []).length))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'),
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页挑个游戏')));
}

function heroCard(u) {
  const st = store.get('stats', {}) || {};
  const played = Number(st.played) || 0;
  const won = Number(st.won) || 0;
  const sync = account.lastSync();
  return h('section', { class: 'card' },
    h('div', { class: 'hero' },
      h('img', { class: 'pfavatar', src: auth.avatarOf(u), alt: '', width: 76, height: 76 }),
      h('div', { class: 'meta' },
        h('h2', {}, u.name || '（未命名）'),
        h('p', {}, `@${nameOfMail(u.mail)} · 加入于 ${day(u.created)}`),
        h('p', { class: 'dim' }, sync ? `上次同步 ${stamp(sync)}` : '还没同步过云端档案'))),
    h('div', { class: 'pfstats' },
      meter('银芯', [scNum(wallet.get(), 17)]),
      meter('推理局数', String(played), played ? `胜率 ${pct(won, played)}%` : ''),
      meter('已解锁 CG', String((store.get('cg', []) || []).length)),
      meter('失败题库', String((store.get('failed', []) || []).length))));
}

// ------------------------------------------------------------------ 资料与头像
const isLocalAvatar = (s) => /^assets\//.test(String(s || ''));

function editCard(u) {
  let picked = u.avatar || '';
  const nameEl = h('input', { type: 'text', value: u.name || '', maxlength: 20, placeholder: '昵称' });
  const urlEl = h('input', { type: 'text', value: u.avatar && !isLocalAvatar(u.avatar) ? u.avatar : '', placeholder: 'https://…（也可以贴一张外链头像）' });
  const preview = h('img', { class: 'pfavatar small', src: auth.avatarOf(u), alt: '' });
  const grid = h('div', { class: 'avgv' });
  const tabs = h('div', { class: 'avtabs' });
  const count = h('small', { class: 'dim' });
  let all = [];
  let cur = 'all';

  const setPick = (src) => {
    picked = src;
    preview.src = src || auth.avatarOf(u);
    grid.querySelectorAll('.avg').forEach((b) => b.classList.toggle('on', b.dataset.src === picked));
    if (src && isLocalAvatar(src)) urlEl.value = '';
  };

  const drawGrid = () => {
    const list = cur === 'all' ? all : all.filter((a) => a.g === cur);
    grid.replaceChildren(...list.map((a) => h('button', {
      type: 'button', class: `avg${a.src === picked ? ' on' : ''}`, 'data-src': a.src, title: a.n,
      onclick: () => setPick(a.src),
    }, h('img', { src: a.src, alt: a.n, loading: 'lazy' }))));
    count.textContent = `共 ${list.length} 个`;
    tabs.querySelectorAll('.avtab').forEach((b) => b.classList.toggle('on', b.dataset.g === cur));
  };

  // 头像库有几百张，收进 details 里：不展开就完全不请求图片
  const picker = h('details', { class: 'avpick' },
    h('summary', {}, h('b', {}, '换头像'), ' ', count),
    tabs, grid);
  avatarLib().then((lib) => {
    all = lib.items || [];
    const mk = (g, label) => h('button', {
      type: 'button', class: `avtab${g === cur ? ' on' : ''}`, 'data-g': g,
      onclick: () => { cur = g; drawGrid(); },
    }, label);
    tabs.replaceChildren(mk('all', `全部 ${all.length}`), ...(lib.groups || []).map((gp) => mk(gp.k, gp.n)));
    drawGrid();
    if (!picked && all[0]) setPick(all[0].src);
  });

  urlEl.addEventListener('input', () => { const v = urlEl.value.trim(); if (v) setPick(v); });

  const saveBtn = h('button', { class: 'btn', onclick: save }, '保存资料');
  async function save() {
    saveBtn.disabled = true;
    try {
      const avatar = (urlEl.value.trim() || picked || '').slice(0, 250);
      await auth.update({ name: nameEl.value.trim() || u.name, avatar });
      toast('已保存');
      render();
    } catch (e) {
      const why = {
        tooShort: '昵称至少 2 个字', tooLong: '昵称最多 20 个字',
        badChar: '昵称只能用中文、字母、数字和 _ - ·（不要空格和标点）',
        nameTaken: '这个昵称已经被占用了',
      };
      toast(`保存失败：${why[e.message] || e.message}`);
    } finally {
      saveBtn.disabled = false;
    }
  }

  return h('section', { class: 'card' },
    h('h2', {}, '账号资料'),
    h('p', { class: 'sub' }, '昵称和头像会显示在「我的推理记录」、工坊题目作者等地方。'),
    h('div', { class: 'pfeditrow' },
      preview,
      h('div', { style: 'flex:1 1 240px;min-width:0' },
        h('label', { class: 'fld' }, h('small', {}, '昵称（2–20 个字，只能用中文/字母/数字/_ - ·）'), nameEl),
        h('label', { class: 'fld' }, h('small', {}, '外链头像'), urlEl),
        picker)),
    h('div', { class: 'actions' },
      saveBtn,
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页'),
      h('button', {
        class: 'btn ghost danger',
        onclick: () => { auth.logout(); account.forget(); toast('已退出登录'); setTimeout(() => location.reload(), 400); },
      }, '退出登录')));
}

// ------------------------------------------------------------------ 存档与同步
function syncCard(u) {
  const syncBtn = h('button', {
    class: 'btn sm',
    onclick: async () => {
      syncBtn.disabled = true;
      const old = syncBtn.textContent;
      syncBtn.textContent = '同步中…';
      const r = await account.push();
      syncBtn.textContent = r.ok ? '已同步 ✓' : '同步失败';
      setTimeout(() => { syncBtn.textContent = old; syncBtn.disabled = false; render(); }, 1400);
    },
  }, '立即同步到云端');

  const clearBtn = h('button', {
    class: 'btn ghost danger',
    onclick: async () => {
      if (!confirm('会清掉这台设备上的所有小游戏进度和银芯（云端档案不动），确定？')) return;
      const keys = [
        'credits', 'cg', 'failed', 'stats', 'myPuzzles', 'profile', 'hist', 'gr',
        'merge:best', 'merge:played', 'merge:skins', 'merge:best:easy', 'merge:best:normal', 'merge:best:hard', 'merge:best:frenzy',
        'bird:best', 'bird:bestLv', 'bird:diff',
        'survivors:best', 'survivors:progress', 'binding', 'pf:best', 'wolf:stat',
      ];
      keys.forEach((k) => store.del(k));
      ['easy', 'normal', 'hard', 'mad'].forEach((d) => { store.del(`bird:best:${d}`); store.del(`bird:bestLv:${d}`); });
      // 挂机版与死亡调查报告不在 zjtt 命名空间，单独清
      ['morimens-idle-save-v1', 'morimens-deathreport-save-v1', 'morimens-deathreport-save-ed62-v1', 'morimens-deathreport-save-ed61-v1']
        .forEach((k) => { try { localStorage.removeItem(k); } catch { /* 忽略 */ } });
      if (u) await account.push().catch(() => {});
      toast('本机进度已清空');
      setTimeout(() => location.reload(), 600);
    },
  }, '清空本机进度');

  return h('section', { class: 'card' },
    h('h2', {}, '存档与同步'),
    h('p', { class: 'sub' }, u
      ? `云端档案最多保留 ${CAP.hist} 条推理记录；小游戏的最高分只增不减，手机上打的纪录不会覆盖电脑上的。`
      : '现在是游客状态，进度只在这台设备上。登录后才会同步到云端。'),
    h('div', { class: 'actions' }, u ? syncBtn : null, clearBtn));
}

// ------------------------------------------------------------------ 管理员入口（只有姜酒能看到）
function adminCard() {
  return h('section', { class: 'card adminlink' },
    h('h2', {}, '管理员'),
    h('p', { class: 'sub' }, '查看全部注册用户与数据情况、给指定账号发放银芯。'),
    h('div', { class: 'actions' }, h('a', { class: 'btn', href: 'admin.html' }, '打开管理后台 →')));
}

// ------------------------------------------------------------------ 渲染
let IS_ADMIN = false;

function paintHead(u) {
  if (!head) return;
  const kids = [h('a', { class: 'ghost', href: 'index.html' }, '回首页')];
  if (u) {
    kids.push(h('a', { class: 'uchip', href: 'profile.html', title: '个人中心' },
      h('img', { src: auth.avatarOf(u), alt: '', loading: 'lazy' }), h('span', {}, u.name || '我')));
  } else {
    kids.push(h('button', { class: 'btn sm', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'));
  }
  head.replaceChildren(...kids);
}

function render() {
  const u = auth.user;
  const kids = [
    h('section', { class: 'pagehead' },
      h('h1', {}, '个人中心'),
      h('p', {}, '一个账号管九个同人小游戏：进度、银芯、存档同步都在这里。')),
    u ? heroCard(u) : guestCard(),
    gamesBox(),
    u ? editCard(u) : null,
    syncCard(u),
    u && IS_ADMIN ? adminCard() : null,
  ].filter(Boolean);
  app.replaceChildren(...kids);
  paintHead(u);
}

// ------------------------------------------------------------------ 启动
// 先把本机数据画出来，再等云端档案合并完刷一次。
// 反过来（等 ready() 再 render）会出现整页转圈 3~4 秒——边缘一次往返 1~2 秒，
// 而本机数据本来就够画完这一页了。
paintSiteStat();               // 不等账号，先把左上角点亮
render();
account.ready().then((ok) => { if (ok) render(); }).catch(() => {});
sitestats.whoami().then((me) => {
  IS_ADMIN = !!me.admin;
  if (IS_ADMIN) render();
}).catch(() => {});

window.__pfRender = render;
