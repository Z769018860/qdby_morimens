// 个人中心：账号资料、头像、偏好唤醒体、推理记录、工坊战报、典藏进度、云端同步
import { $, h, store, nav, t, lang, wallet, failedBank, unlocked, loadDict, imgEl, nameOf, toast, markDirty, REPLAY, statsOf, scIcon, emptyState } from './common.js';
import { auth, openLogin, avatarLib, nameOfMail } from './auth.js';
import { account, CAP } from './account.js';
import { checkinBar } from './checkin.js';
import { galleryLib } from './theme.js';
import * as likes from './likes.js';

document.body.prepend(nav('profile'));
const root = $('#app');

const stat = () => statsOf();
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const stamp = (ms) => {
  const d = new Date(Number(ms) || 0);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

let DICT = null;
let GAL = [];

const awakOf = (tid) => {
  const e = DICT && DICT.awakener ? DICT.awakener.find((x) => String(x.id) === String(tid)) : null;
  return e || null;
};

function meter(label, value, sub) {
  return h('div', { class: 'statbox' }, h('small', {}, label), h('b', {}, value), sub ? h('small', { class: 'dim' }, sub) : null);
}

// ------------------------------------------------------------------ 未登录：游客
function guestView() {
  const hists = account.history().length;
  return h('section', { class: 'card authhero' },
    h('div', { class: 'authart' }, h('img', { src: 'assets/avatars/cg-CG_C201_001.webp', alt: '' })),
    h('div', {},
      h('h2', {}, t('pfGuestTitle')),
      h('p', { class: 'note' }, t('pfGuestSub')),
      h('div', { class: 'pfstats four' },
        meter(t('credits'), [scIcon(18), ` ${wallet.get()}`]),
        meter(t('pfPlayed'), stat().played),
        meter(t('pfUnlockedCg'), unlocked.list().length),
        meter(t('pfHistTitle'), hists)),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, t('pfLoginBtn')),
        h('a', { class: 'btn ghost', href: 'detective.html' }, t('navGame')))));
}

// ------------------------------------------------------------------ 已登录：账号概览
function hero(u) {
  const sync = account.lastSync();
  return h('section', { class: 'card pfhero' },
    h('img', { class: 'pfavatar', src: auth.avatarOf(u), alt: '', width: 96, height: 96 }),
    h('div', { class: 'pfmeta' },
      h('h2', {}, u.name || t('pfNoName')),
      h('p', { class: 'note' }, `@${nameOfMail(u.mail)} · ${t('pfJoined')} ${day(u.created)}`),
      h('p', { class: 'note dim', id: 'pf-sync-line' },
        sync ? t('pfLastSync', { t: stamp(sync) }) : t('pfSyncNever'))),
    h('div', { class: 'pfstats' },
      meter(t('credits'), [scIcon(18), ` ${wallet.get()}`]),
      meter(t('pfPlayed'), stat().played, `${t('pfWinRate')} ${pct(stat().won, stat().played)}%`),
      meter(t('pfUnlockedCg'), `${unlocked.list().length}`),
      meter(t('pfFailed'), failedBank.list().length)));
}

// ------------------------------------------------------------------ 资料与头像
const isLocalAvatar = (s) => /^assets\//.test(String(s || ''));

function editBox(u) {
  let picked = u.avatar || '';
  const nameEl = h('input', { type: 'text', value: u.name || '', maxlength: 20, placeholder: t('pfNamePh') });
  const urlEl = h('input', { type: 'text', value: u.avatar && !isLocalAvatar(u.avatar) ? u.avatar : '', placeholder: 'https://…' });
  const preview = h('img', { class: 'pfavatar small', src: auth.avatarOf(u), alt: '' });
  const grid = h('div', { class: 'avgv' });
  const tabs = h('div', { class: 'avtabs' });
  const count = h('small', { class: 'note' });
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
    count.textContent = t('pfAvatarN', { n: list.length });
    tabs.querySelectorAll('.avtab').forEach((b) => b.classList.toggle('on', b.dataset.g === cur));
  };

  avatarLib().then((lib) => {
    all = lib.items || [];
    const mk = (g, label) => h('button', {
      type: 'button', class: `avtab${g === cur ? ' on' : ''}`, 'data-g': g,
      onclick: () => { cur = g; drawGrid(); },
    }, label);
    tabs.replaceChildren(
      mk('all', t('pfAvatarAll', { n: all.length })),
      ...(lib.groups || []).map((gp) => mk(gp.k, lang.cur === 'en' ? gp.en : gp.n)));
    drawGrid();
    if (!picked && all[0]) setPick(all[0].src);
  });

  urlEl.addEventListener('input', () => {
    const v = urlEl.value.trim();
    if (v) setPick(v);
  });

  const saveBtn = h('button', { class: 'btn', onclick: save }, t('save'));
  async function save() {
    saveBtn.disabled = true;
    try {
      const avatar = (urlEl.value.trim() || picked || '').slice(0, 250);
      await auth.update({ name: nameEl.value.trim() || u.name, avatar });
      toast(t('pfSaved'));
      render();
    } catch (e) {
      // auth.update 会按注册同一套规则校验昵称（长度 / 字符 / 归一化）
      const why = {
        tooShort: '昵称至少 2 个字', tooLong: '昵称最多 20 个字',
        badChar: '昵称只能用中文、字母、数字和 _ - ·（不要空格和标点）',
      };
      toast(`${t('pfSaveFail')}：${why[e.message] || e.message}`);
    } finally {
      saveBtn.disabled = false;
    }
  }

  return h('section', { class: 'card' },
    h('h3', {}, t('pfEdit')),
    h('div', { class: 'pfeditrow' },
      preview,
      h('div', { class: 'pfeditflds' },
        h('label', { class: 'fld' }, h('small', {}, `${t('pfNick')}（${t('pfNickNote')}）`), nameEl),
        h('label', { class: 'fld' }, h('small', {}, t('pfAvatarUrl')), urlEl))),
    h('div', { class: 'avpick' },
      h('div', { class: 'avpickhead' }, h('b', {}, t('pfAvatarPick')), count),
      tabs,
      grid),
    h('div', { class: 'actions' },
      saveBtn,
      h('button', {
        class: 'btn ghost',
        onclick: () => { auth.logout(); account.forget(); toast(t('pfLoggedOut')); setTimeout(() => location.reload(), 400); },
      }, t('pfLogout'))));
}

// ------------------------------------------------------------------ 偏好唤醒体
function favBox() {
  const prof = store.get('profile', { favs: [] });
  let favs = new Set((prof.favs || []).map(String));
  const list = (DICT ? DICT.awakener : []).filter((a) => a.id != null);
  const counter = h('span', { class: 'note' }, `${t('pfFavPicked')} ${favs.size}`);
  const grid = h('div', { class: 'favgrid' });

  const paint = () => {
    grid.replaceChildren(...list.map((a) => {
      const on = favs.has(String(a.id));
      return h('button', {
        type: 'button', class: `fav${on ? ' on' : ''}`, title: nameOf(a),
        onclick: () => {
          const id = String(a.id);
          if (favs.has(id)) favs.delete(id); else favs.add(id);
          paint();
        },
      }, imgEl(a.img, nameOf(a)), h('small', {}, nameOf(a)));
    }));
    counter.textContent = `${t('pfFavPicked')} ${favs.size}`;
  };
  paint();

  const save = () => {
    prof.favs = [...favs];
    store.set('profile', prof);
    // 偏好变了，之前的筛选索引作废
    Object.keys(localStorage).filter((k) => k.startsWith('zjtt:favIdx:')).forEach((k) => localStorage.removeItem(k));
    markDirty('favs');
    account.schedule(400);
    toast(t('pfFavSaved'));
    render();
  };

  return h('section', { class: 'card', id: 'fav' },
    h('h3', {}, t('pfFavTitle'), ' ', counter),
    h('p', { class: 'note' }, t('pfFavNote')),
    grid,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: save }, t('pfFavSave')),
      h('button', { class: 'btn ghost', onclick: () => { favs = new Set(); paint(); } }, t('pfFavClear'))));
}

// ------------------------------------------------------------------ 推理记录
function histBox() {
  const list = account.history();
  const modeName = (m) => (m === 'daily' ? t('pfModeDaily') : m === 'random' ? t('pfModeRandom') : t('pfModeCustom'));
  const rows = list.slice(0, 40).map((e) => h('div', { class: 'hrow' },
    h('span', { class: 'htime' }, stamp(e.at)),
    h('span', { class: 'hname' }, e.ti || e.i || '—'),
    h('span', { class: 'chip dim' }, modeName(e.m)),
    h('span', { class: 'chip' }, `${t('lvShort', { n: e.l || 1 })}`),
    h('span', { class: `hres ${e.w ? 'win' : 'lose'}` }, e.w ? `${t('pfWinTag')} ${e.g || ''}` : `${t('pfLoseTag')} ${e.g || ''}`),
    h('span', { class: 'hsc' }, `${e.sc ?? '—'}`),
    e.u ? h('a', { class: 'link', href: REPLAY.json(e.u), target: '_blank', rel: 'noopener' }, t('replayTitle')) : h('span', {})));
  return h('section', { class: 'card' },
    h('h3', {}, `${t('pfHistTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('pfHistNote', { n: CAP.hist })),
    list.length
      ? h('div', { class: 'hlist' }, rows)
      : emptyState(t('pfHistEmpty')));
}

// ------------------------------------------------------------------ 工坊战报
function impBox() {
  const list = store.get('myPuzzles', []);
  const counts = likes.cachedCounts();
  const opened = (p) => (p.uuid ? REPLAY.json(p.uuid) : '');
  return h('section', { class: 'card' },
    h('h3', {}, `${t('pfImpTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('pfImpNote')),
    list.length ? h('div', { class: 'implist' }, list.map((p, i) => {
      const team = (p.team || []).filter((a) => a.tid);
      return h('div', { class: 'imp' },
        h('div', { class: 'imphead' },
          h('b', {}, p.title || p.id),
          counts[String(p.id)] ? h('span', { class: 'likebadge' }, `❤ ${counts[String(p.id)]}`) : null,
          h('small', { class: 'note' }, `${team.length} ${t('pfImpTeam')} · ${(p.relics || []).length} ${t('relicLabel')} · ${stamp(p.at)}`)),
        h('div', { class: 'improw' }, team.map((a) => {
          const e = awakOf(a.tid);
          return h('span', { class: 'impawk', title: e ? nameOf(e) : a.tid },
            imgEl(e && e.img, e ? nameOf(e) : a.tid), h('small', {}, e ? nameOf(e) : a.tid));
        })),
        h('div', { class: 'impact' },
          h('a', { class: 'link', href: `detective.html?p=${encodeURIComponent(shareCodeOf(p))}` }, t('pfImpPlay')),
          opened(p) ? h('a', { class: 'link', href: opened(p), target: '_blank', rel: 'noopener' }, t('pfImpReplay')) : null,
          h('button', { class: 'link', onclick: () => { const l = store.get('myPuzzles', []); l.splice(i, 1); store.set('myPuzzles', l); markDirty('mine'); account.schedule(400); render(); } }, t('pfImpDel'))));
    })) : emptyState(t('pfImpEmpty')));
}

// 工坊里同一套分享码逻辑（避免循环依赖，这里内联一份最小实现）
function shareCodeOf(d) {
  const payload = {
    v: 2, id: d.id, title: d.title, uuid: d.uuid,
    rounds: d.rounds, cards: d.cards, maxBout: d.maxBout, deathResist: d.deathResist,
    hp: d.hp, left: d.left, playerDmg: d.playerDmg, score: d.score, diff: d.diff, diffScore: d.diffScore,
    key: d.key, relics: d.relics, team: d.team,
    h: (Array.isArray(d.hints) ? d.hints : []).map(c => [c.n || '', c.v || '', c.c || 5]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return 'ZJ2-' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ------------------------------------------------------------------ 典藏进度
function cgBox() {
  const got = new Set(unlocked.list());
  const items = GAL || [];
  const total = items.length || 438;
  const recent = [...got].slice(-8).reverse();
  return h('section', { class: 'card' },
    h('h3', {}, t('pfCgTitle')),
    h('p', { class: 'note' }, t('pfCgNote', { a: got.size, b: total })),
    h('div', { class: 'prog' }, h('div', { class: 'progbar', style: `width:${Math.min(100, got.size / total * 100)}%` })),
    recent.length ? h('div', { class: 'cgmini' }, recent.map((id) => {
      const it = items.find((x) => x.id === id);
      return h('a', { class: 'cgm', href: 'gallery.html', title: it ? nameOf(it) : id }, imgEl(it && it.f, it ? nameOf(it) : id));
    })) : null);
}

// ------------------------------------------------------------------ 存档与同步
function storeBox(u) {
  const syncBtn = h('button', {
    class: 'btn ghost sm',
    onclick: async () => {
      syncBtn.disabled = true;
      const old = syncBtn.textContent;
      syncBtn.textContent = t('pfSyncing');
      const r = await account.push();
      syncBtn.textContent = r.ok ? t('pfSyncOk') : t('pfSyncFail');
      setTimeout(() => { syncBtn.textContent = old; syncBtn.disabled = false; render(); }, 1400);
    },
  }, t('pfSyncNow'));

  return h('section', { class: 'card' },
    h('h3', {}, t('pfSyncTitle')),
    h('p', { class: 'note' }, u ? t('pfAccNote') : t('pfLocalNote')),
    h('div', { class: 'actions' },
      u ? syncBtn : null,
      h('button', {
        class: 'btn ghost danger',
        onclick: async () => {
          if (!confirm(t('pfClearAsk'))) return;
          ['credits', 'cg', 'failed', 'stats', 'myPuzzles', 'profile', 'hist', 'bird:best', 'bird:bestLv'].forEach((k) => store.del(k));
          if (u) await account.push().catch(() => {});
          toast(t('pfCleared'));
          setTimeout(() => location.reload(), 500);
        },
      }, t('pfClear'))));
}

// ------------------------------------------------------------------ 小游戏
// 合成大杜勒的最高分存在账号档案的 mb 字段（js/account.js），这里只负责显示。
// 未登录 / 没同步过时读的就是本机那个键，所以数字始终对得上。
function miniBox() {
  const best = account.mergeBest();
  const bird = account.birdBest();
  // 把「最高 {n} 分」拆成前后两段，中间的数字单独加粗显示（中英文语序都能对上）
  const [pre, post] = t('pfMiniBest', { n: '\u0000' }).split('\u0000');
  const line = best > 0
    ? ['合成大杜勒 · ', pre, h('b', {}, String(best)), post || '']
    : `合成大杜勒 · ${t('pfMiniNone')}`;
  // 鸟弟这边记的是「下到过第几层」，比分数更能说明水平
  const [bpre, bpost] = t('pfMiniBird', { n: '\u0000' }).split('\u0000');
  const bline = bird.lv > 0
    ? ['是鸟弟就下100层 · ', bpre, h('b', {}, String(bird.lv)), bpost || '']
    : `是鸟弟就下100层 · ${t('pfMiniNone')}`;
  return h('section', { class: 'card' },
    h('h3', {}, t('pfMiniTitle')),
    h('p', { class: 'note' }, t('pfMiniNote')),
    h('div', { class: 'minirow' },
      h('span', { class: 'note dim' }, line),
      h('a', { class: 'btn ghost sm', href: 'merge.html' }, t('pfMiniGo'))),
    h('div', { class: 'minirow' },
      h('span', { class: 'note dim' }, bline),
      h('a', { class: 'btn ghost sm', href: 'bird.html' }, t('pfMiniGo'))));
}

function render() {
  const u = auth.user;
  const kids = [
    h('section', { class: 'pagehead' }, h('h1', {}, t('pfTitle')), h('p', { class: 'note' }, t('pfSub'))),
    u ? hero(u) : guestView(),
    h('section', { class: 'card ckcard' }, checkinBar('wide', () => render())),
    u ? editBox(u) : null,
    u ? favBox() : null,
    u ? histBox() : null,
    u ? impBox() : null,
    u ? cgBox() : null,
    miniBox(),
    storeBox(u),
  ].filter(Boolean);
  // 顶栏里也有头像和昵称，一起刷新
  const old = document.querySelector('.top');
  if (old) { old.remove(); document.body.prepend(nav('profile')); }
  root.replaceChildren(...kids);
  if (location.hash === '#fav') {
    const el = document.getElementById('fav');
    if (el) el.scrollIntoView({ block: 'start' });
  }
}

// 先把云端档案合并下来（登录态才有效），再渲染
await account.ready();
try { GAL = (await galleryLib()).list || []; } catch { GAL = []; }
try { DICT = (await loadDict()).D; } catch { DICT = null; }
render();
window.__pfRender = render;   // 供 scripts/preview.mjs 的交互探针重绘

// 我的题目：拉一次赞数（有新赞折算银芯，结果下次渲染就能看到徽标）
likes.syncMine(store.get('myPuzzles', [])).then((r) => {
  if (r.ok && r.gain > 0) { render(); toast(t('likeGain', { n: r.gain })); }
}).catch(() => {});
likes.resume();
