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
import * as savedata from './savedata.js';

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
// 离线版 / 桌面版导出的 .zjtt 就从这个面板导进来——放在个人中心而不是只留在
// offline.html，是因为「导入之后并进账号」发生在这里：导完直接 push 一次，
// 换机器的人不用再自己找「同步」按钮。
// 展开状态和密码存在模块里：account.ready() 回来后 render() 会整页重绘，
// 不记着的话用户正输密码时面板会突然收起、输入内容也没了。
const SAVE_UI = { open: false, pass: '' };

function saveBox(u) {
  const msg = h('p', { class: 'savemsg' });
  const say = (t, cls) => { msg.textContent = t || ''; msg.className = 'savemsg' + (cls ? ' ' + cls : ''); };
  const fail = (e) => say(String((e && e.message) || e || '出错了'), 'bad');

  const pass = h('input', {
    type: 'password',
    autocomplete: 'new-password',
    placeholder: '至少 6 位；导出和导入要用同一个',
    value: SAVE_UI.pass,
  });
  pass.addEventListener('input', () => { SAVE_UI.pass = pass.value; });

  const expBtn = h('button', {
    class: 'btn sm ghost',
    onclick: async () => {
      const n = savedata.count();
      if (!n) { say('本机还没有可导出的存档。', 'bad'); return; }
      expBtn.disabled = true;
      say('正在加密…');
      try {
        const r = await savedata.exportPack(pass.value);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.blob);
        a.download = r.name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        say(`已导出 ${r.count} 项（加密）。换设备时用同一个密码导入。`, 'ok');
      } catch (e) { fail(e); }
      expBtn.disabled = false;
    },
  }, '导出本机存档');

  const file = h('input', { type: 'file', accept: '.zjtt,.json', hidden: true });

  async function doImport(f) {
    say('正在解密…');
    try {
      const doc = await savedata.readPack(f, pass.value);
      const n = doc.keys.length;
      if (!n) throw new Error('文件里没有本站的存档项。');
      // 覆盖是有意的：导入语义就是「用这份文件恢复成导出那台机器的样子」。
      // 所以文件不是二次确认，谁都可能点错文件，写坏本机进度没法撤销。
      if (!confirm(`文件里有 ${n} 项存档。\n\n会写进这台设备并覆盖同名的本机进度（账号、银芯、各游戏纪录）。云端档案不会因此被删。继续？`)) {
        say('已取消。');
        return;
      }
      const cnt = savedata.write(doc);
      if (u) {
        say('已导入，正在并进云端档案…');
        // 用 sync() 而不是 push()：sync 会先拉云端再 mergeDoc（各数值取大），
        // 免得把「另一台设备上打出来的更高纪录」用这份文件压回去。
        const r = await account.sync().catch(() => ({ ok: false }));
        toast(r && r.ok ? `已导入 ${cnt} 项并同步到云端` : `已导入 ${cnt} 项，云端同步失败（稍后可点「立即同步」）`);
      } else {
        toast(`已导入 ${cnt} 项；登录后会随档案一起上传`);
      }
      setTimeout(() => location.reload(), 1000);
    } catch (e) {
      fail(e);
    }
  }

  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    file.value = '';
    if (f) doImport(f);
  });

  const impBtn = h('button', {
    class: 'btn sm',
    onclick: () => {
      if (!pass.value) { pass.focus(); say('先在下面填密码——就是导出那台机器上设的那个。', 'bad'); return; }
      file.click();
    },
  }, '导入离线存档');

  const panel = h('div', { class: 'savebox' },
    h('p', { class: 'savetip' }, '从离线版 / 桌面版的「存档」区导出的 .zjtt 文件，拷到这台设备后从这里导入。加密包里有账号、银芯、各小游戏进度，也包括挂机前夜和死亡调查报告（那两款不在主命名空间，别处导不到）。'),
    h('div', { class: 'saverow' }, pass, file),
    h('div', { class: 'actions' }, impBtn, expBtn),
    msg,
  );

  const moreBtn = h('button', {
    class: 'btn sm ghost',
    onclick: () => {
      SAVE_UI.open = panel.hidden;            // 现在是关着的 → 这次要打开
      panel.hidden = !SAVE_UI.open;
      moreBtn.textContent = SAVE_UI.open ? '收起' : '导入 / 导出离线存档';
      if (SAVE_UI.open) pass.focus();
    },
  }, SAVE_UI.open ? '收起' : '导入 / 导出离线存档');
  panel.hidden = !SAVE_UI.open;

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

  return h('section', { class: 'card', id: 'save' },
    h('h2', {}, '存档与同步'),
    h('p', { class: 'sub' }, u
      ? `云端档案最多保留 ${CAP.hist} 条推理记录；小游戏的最高分只增不减，手机上打的纪录不会覆盖电脑上的。换设备时用下面的加密存档整包搬。`
      : '现在是游客状态，进度只在这台设备上。登录后才会同步到云端；先登录再导入，导完会直接上传。'),
    h('div', { class: 'actions' }, u ? syncBtn : null, moreBtn, clearBtn),
    panel);
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
    saveBox(u),
    u && IS_ADMIN ? adminCard() : null,
  ].filter(Boolean);
  app.replaceChildren(...kids);
  paintHead(u);
}

// ------------------------------------------------------------------ 启动
// 先把本机数据画出来，再等云端档案合并完刷一次。
// 反过来（等 ready() 再 render）会出现整页转圈 3~4 秒——边缘一次往返 1~2 秒，
// 而本机数据本来就够画完这一页了。
//
// 从离线版/桌面版的「存档」区点「到个人中心导入」过来时带 #save：
// 直接把那个面板展开并滚到位，少点一次。
if (location.hash === '#save') SAVE_UI.open = true;
const jumpSave = () => {
  if (location.hash !== '#save') return;
  // 刚 replaceChildren 完时布局还没稳定，一次 scrollIntoView 会停在半路，
  // 所以硬滚一次、再等两帧补两次。
  const go = () => {
    const el = document.getElementById('save');
    if (el) el.scrollIntoView({ block: 'start' });
  };
  go();
  requestAnimationFrame(() => { go(); requestAnimationFrame(go); });
};
paintSiteStat();               // 不等账号，先把左上角点亮
render();
jumpSave();
account.ready().then((ok) => { if (ok) { render(); jumpSave(); } }).catch(() => {});
sitestats.whoami().then((me) => {
  IS_ADMIN = !!me.admin;
  if (IS_ADMIN) render();
}).catch(() => {});

window.__pfRender = render;
