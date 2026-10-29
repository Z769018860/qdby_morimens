import {
  indexData, newState, migrate, offlineReport, claimOffline, levelUp, levelUpMax, setTeam, autoTeam, autoLoadout, setPreset,
  equipItem, unequipItem, enhanceItem, dismantle, summon, equipPull, isEquipped, summonCores, equipPullCores, refineItem,
  dismantleCores, breakThrough, awakenUp, upgradeOrder,
} from './core/game.js';
import { setOrderSlot } from './core/orders.js';
import { TEAM_SIZE } from './core/constants.js';
import { BattleView } from './ui/battleView.js';
import * as P from './ui/pages.js';
import * as P2 from './ui/pages2.js';
import * as P3 from './ui/pages3.js';
import { doWeekly, claimWeekly } from './core/weekly.js';
import { doRTower, TOWER_NAME } from './core/rtower.js';
import { arenaState, arenaTries, fightArena, applyArena, claimArenaDaily } from './core/arena.js';
import { localOpponents, localSettle, fightFriend } from './core/arena.js';
import { encodeCode, decodeCode } from './core/friend.js';
import { codexPage, monsterModal } from './ui/codex.js';
import { sound } from './ui/audio.js';
import { TRACK_ZH } from './ui/audio.js';
import { saveSquad, loadSquad, clearSquad, setSquadPick, teamSlugsFor, SQUAD_ZH, rtModeOf } from './core/squad.js';
import { watchOrSkip, replayOf, watchMode } from './ui/replay.js';
import { emptyGacha } from './core/gacha.js';
import { fxMode } from './ui/fx.js';
import { settleMode } from './ui/report.js';
import { doTower, doTrial } from './core/challenge.js';
import { claimAchievement, claimAllAchievements } from './core/achievements.js';
import { signToday, backfill, claimCum } from './core/signin.js';
import { buy as shopBuy, SHOP } from './core/shop.js';
import { signinPage } from './ui/pages4.js';
import { claimWelcome, claimSeven, portalUser, welcomeStatus } from './core/welcome.js';
import { startGuide } from './ui/guide.js';
import { $, $$, fmt, esc, store, toast, closeModal, openModal, showKwPop } from './ui/util.js';

/* 底部导航按「功能域」分 5 组。13 个平铺页签在手机上要横滚，一眼看不到全貌，
   而且签到、设置这类低频页和战斗平起平坐也不合理。组内多页用顶部胶囊二级导航。 */
const SVG = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}${extra}</svg>`;
const ICON = {
  battle: SVG('<path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/>'),
  team: SVG('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
  summon: SVG('<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 15 .7 1.8 1.8.7-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7z"/>'),
  challenge: SVG('<path d="M7 21V9l5-5 5 5v12"/><path d="M4 21h16"/><path d="M10 21v-4h4v4"/>'),
  more: SVG('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'),
};

const GROUPS = [
  { k: 'battle', zh: '战斗', icon: ICON.battle, tabs: [['battle', '战斗']] },
  { k: 'team', zh: '养成', icon: ICON.team, tabs: [['team', '队伍'], ['roster', '唤醒体'], ['gear', '命轮密契'], ['orders', '钥令']] },
  { k: 'summon', zh: '召唤', icon: ICON.summon, tabs: [['summon', '召唤']] },
  { k: 'challenge', zh: '挑战', icon: ICON.challenge, tabs: [['challenge', '挑战'], ['weekly', '周Boss'], ['rtower', '属性塔'], ['arena', '竞技场']] },
  { k: 'more', zh: '更多', icon: ICON.more, tabs: [['signin', '签到'], ['codex', '图鉴'], ['ach', '成就'], ['settings', '设置']] },
];

/* 每个页面用一张典藏室（原作 CG 壁纸）当底，压暗后铺在内容后面。
   同一组内换个页面也换背景，切换底部主导航时观感差别最明显。
   hall-01..12 是早期的一批，13 以后是 tools/build_bg.py 从典藏室重新压的一批。 */
const BG = {
  battle: '17', team: '13', roster: '14', gear: '15', orders: '16', summon: '18',
  challenge: '19', weekly: '20', rtower: '21', arena: '22', signin: '23', codex: '24', ach: '25', settings: '26',
};
let bgNow = '';
function setBg(tab) {
  const n = BG[tab] || '01';
  if (n === bgNow) return;
  bgNow = n;
  const el = document.getElementById('bg');
  if (!el) return;
  el.style.opacity = '0';
  setTimeout(() => { el.style.backgroundImage = `url(public/img/bg/hall-${n}.webp)`; el.style.opacity = '1'; }, 160);
}
const GROUP_BY_K = Object.fromEntries(GROUPS.map((g) => [g.k, g]));
const GROUP_OF = Object.fromEntries(GROUPS.flatMap((g) => g.tabs.map(([k]) => [k, g.k])));
// 每个页面配一首 BGM（audio.js 里的六首）。战斗页由 BattleView 按是否 Boss 战自己切。
const MOOD_OF = {
  team: 'home', roster: 'home', gear: 'home', orders: 'home', summon: 'summon',
  challenge: 'tower', weekly: 'tower', rtower: 'tower', arena: 'battle',
  signin: 'home', codex: 'home', ach: 'home', settings: 'home',
};
const gachaSound = (out) => (out.some((p) => p.rarity === 'Genesis') ? 'reveal3' : out.some((p) => p.rarity === 'SSR') ? 'reveal2' : 'reveal1');

const app = {
  ui: { lastTab: {} }, tab: 'battle',
  save() { this.state.lastSeen = Date.now(); store.write(this.state); },
  itemName(it) { return P.itemDef(this, it).zh + (it.lv ? ` Lv${it.lv}` : ''); },
  refreshTop() {
    $('#gold').textContent = fmt(this.state.gold);
    $('#tickets').textContent = this.state.tickets;
    $('#cores').textContent = fmt(this.state.cores || 0);
  },
};

async function boot() {
  const [pack, orders, special] = await Promise.all([
    fetch('public/data/game-data.json').then((r) => r.json()),
    fetch('public/data/orders.json').then((r) => r.json()).catch(() => ({ items: [] })),
    fetch('public/data/special.json').then((r) => r.json()).catch(() => null),
  ]);
  pack.orders = orders.items || [];
  if (special) pack.special = special;
  app.data = indexData(pack);
  const saved = store.read();
  app.state = saved ? migrate(saved, app.data) : newState(app.data);
  app.root = $('#view');
  buildChrome();
  syncSnd();
  $('#sndq')?.addEventListener('click', () => {
    sound.set('mute', !sound.cfg.mute);
    syncSnd();
    toast(sound.cfg.mute ? '已静音（点右上角喇叭恢复）' : '声音已开启');
    sound.play('click');
  });
  app.render = render;   // 弹窗里的操作（编队编辑器等）保存后要刷新当前页
  app.bv = new BattleView($('#battle'), app);
  app.onBattleDone = () => { if (app.tab !== 'battle') app.refreshTop(); };
  const rep = saved ? offlineReport(app.state, app.data) : null;
  show('battle');
  if (welcomeStatus(app.state, portalUser()).canClaim) setTimeout(() => toast('🎁 注册福利可领取：去「更多 → 签到」领取银芯', 4000), 1500);
  // 引导必须排在离线结算之后：结算弹窗是 z-index 50，引导层是 60，先弹引导会把结算盖住
  const maybeGuide = () => {
    if (app.state.guide) return;
    setTimeout(() => {
      startGuide(app, (skipped, go) => {
        app.state.guide = 1; app.state.tutorial = true; app.save();
        if (go) show(go);
        else if (!skipped) toast('想再看一遍？设置页有「重看新手引导」', 3500);
      });
    }, 420);
  };
  if (rep && (rep.gold || rep.tickets)) {
    P.offlineModal(app, rep, () => { claimOffline(app.state, rep); app.save(); app.refreshTop(); toast('已领取离线收益'); app.bv.start(); maybeGuide(); });
  } else { claimOffline(app.state, null); app.bv.start(); maybeGuide(); }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('beforeunload', () => app.save());
  setInterval(() => app.save(), 15000);
  window.__game = app; // handy for debugging / tests
}

function onVisibility() {
  if (document.hidden) { app.bv.stop(); app.save(); return; }
  const rep = offlineReport(app.state, app.data);
  if (rep && (rep.gold || rep.tickets)) P.offlineModal(app, rep, () => { claimOffline(app.state, rep); app.save(); app.refreshTop(); app.bv.start(); });
  else { claimOffline(app.state, null); app.bv.start(); }
}

// 顶栏那个喇叭：一声点击就能静音，不用钻到设置页
function syncSnd() {
  const b = $('#sndq');
  if (!b) return;
  b.textContent = sound.cfg.mute ? '🔇' : '🔊';
  b.classList.toggle('off', !!sound.cfg.mute);
  b.title = sound.cfg.mute ? '已静音，点击开启' : '声音开，点击静音';
}
function buildChrome() {  $('#tabs').innerHTML = GROUPS.map((g) => `<button data-group="${g.k}" title="${g.zh}"><i class="ti">${g.icon}</i><span>${g.zh}</span></button>`).join('');
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-group]');
    if (!b) return;
    const g = GROUP_BY_K[b.dataset.group];
    // 回到该组上次停留的页面，比每次都跳回第一页更符合直觉
    show((app.ui.lastTab || {})[g.k] || g.tabs[0][0]);
  });
  $('#subnav').addEventListener('click', (e) => { const b = e.target.closest('[data-sub]'); if (b) show(b.dataset.sub); });
  document.body.addEventListener('click', onAct);
  document.body.addEventListener('change', onChange);
}

export function show(tab) {
  if (!GROUP_OF[tab]) tab = 'battle';
  const prev = app.tab;
  app.tab = tab;
  const gk = GROUP_OF[tab];
  (app.ui.lastTab ||= {})[gk] = tab;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.group === gk));
  // 组内不止一页时才出二级导航；单页的组（战斗、召唤）不占这行空间
  const g = GROUP_BY_K[gk], sub = $('#subnav'), multi = g.tabs.length > 1;
  sub.hidden = !multi;
  sub.innerHTML = multi
    ? g.tabs.map(([k, z]) => `<button data-sub="${k}" class="${k === tab ? 'on' : ''}">${z}</button>`).join('')
    : '';
  $('#battle').hidden = tab !== 'battle';
  const v = $('#view');
  v.hidden = tab === 'battle';
  if (tab !== 'battle') render();
  if (tab === 'arena') refreshArena();
  setBg(tab);
  document.body.dataset.tab = tab;
  // 切页淡入，避免内容「啪」地整块换掉
  v.classList.remove('fadein'); void v.offsetWidth; v.classList.add('fadein');
  if (prev !== tab) {
    sound.play('nav');
    // 只有跨组才给触感，组内切二级页太密会发麻
    if (GROUP_OF[prev] !== gk) navigator.vibrate?.(6);
  }
  // 背景音乐跟着页面走（用户在设置里锁了曲目时 setMood 会自己忽略）
  if (tab === 'battle') sound.setMood(app.bv?.bossNow ? 'boss' : 'field');
  else sound.setMood(MOOD_OF[tab] || 'home');
  app.refreshTop();
}
function refreshArena() {
  app.ui.arena = { ...(app.ui.arena || {}), list: localOpponents(app.state, app.data) };
  if (app.tab === 'arena') render();
}
function render() {
  const f = { team: P.teamPage, roster: P.rosterPage, gear: P.gearPage, orders: P.ordersPage, summon: P.summonPage, settings: P.settingsPage, challenge: P2.challengePage, codex: codexPage, signin: signinPage, weekly: P3.weeklyPage, rtower: P3.rtowerPage, arena: P3.arenaPage, ach: P2.achievementPage }[app.tab];
  if (f) { const y = window.scrollY; $('#view').innerHTML = f(app); window.scrollTo(0, y); }
  app.refreshTop();
}
const rewardLine = (r) => `召唤券+${r.tickets} 银芯+${r.cores} 金币+${r.gold}`;
const rerender = () => { app.save(); render(); };

function onChange(e) {
  if (e.target.matches('[data-settle]')) { settleMode.set(e.target.value); toast('结算弹窗：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-fx]')) { fxMode.set(e.target.value); toast('战斗特效：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-watch]')) { watchMode.set(e.target.value); toast('挑战过程：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-arena-name]')) { arenaState(app.state).name = e.target.value.trim().slice(0, 12) || '旅人'; app.save(); return; }
  const au = e.target.closest('[data-aud]');
  if (au) { sound.set(au.dataset.aud, au.type === 'checkbox' ? au.checked : +au.value / 100); if (au.dataset.aud === 'sfx') sound.play('hit'); syncSnd(); return; }
  const c = e.target.closest('[data-cf]');
  if (c) { const f = (app.ui.codex ||= { q: '', rank: '', trait: '', seen: false, more: 1 }); f[c.dataset.cf] = c.type === 'checkbox' ? c.checked : c.value; f.more = 1; render(); return; }
  const t = e.target.closest('[data-filter]');
  if (!t) return;
  const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false });
  f[t.dataset.filter] = t.type === 'checkbox' ? t.checked : t.value;
  render();
}

function onAct(e) {
  const kwEl = e.target.closest('[data-kw]');
  if (kwEl) { showKwPop(app.data.kw, kwEl.dataset.kw, kwEl); return; }
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const s = app.state, d = app.data, a = el.dataset.act;
  if (el.tagName === 'BUTTON' && !['pull', 'epull', 'ach-claim', 'tower-go', 'trial-go', 'lvup', 'lvmax', 'sign-today', 'welcome-claim', 'welcome-7', 'cpull', 'cepull', 'shop-buy', 'ach-all', 'snd-test', 'awaken', 'brk', 'order-up'].includes(a)) sound.play('click');
  switch (a) {
    case 'snd-test': sound.play(el.dataset.k); break;
    case 'bgm-track': sound.pickTrack(el.dataset.k); toast(`背景音乐：${TRACK_ZH[el.dataset.k] || el.dataset.k}`); render(); break;
    case 'bgm-auto': sound.followPage(); toast('背景音乐：跟随页面'); render(); break;
    case 'gacha-log': sound.play('open'); P.gachaLogModal(app); break;
    case 'gacha-filter': app.ui.gachaLog = { ...(app.ui.gachaLog || {}), filter: el.dataset.k }; P.gachaLogModal(app); break;
    case 'gacha-clear':
      if (confirm(`清空抽卡记录？累计 ${s.gacha?.agg?.pulls || 0} 抽的统计也会一起归零（已获得的唤醒体、叠位不受影响）。`)) {
        s.gacha = emptyGacha(); app.save(); render(); toast('抽卡记录已清空');
      }
      break;
    case 'squad-save': {
      const k = el.dataset.k, r = saveSquad(s, k);
      if (r) { sound.play('stamp'); app.save(); rerender(); toast(`已把当前 ${r.length} 人存为「${SQUAD_ZH[k]}」`); }
      else toast('当前队伍是空的，先选人');
      break;
    }
    case 'squad-load': {
      const r = loadSquad(s, el.dataset.k);
      if (r) { sound.play('open'); app.save(); rerender(); toast(`「${SQUAD_ZH[el.dataset.k]}」已上阵：${r.length} 人`); }
      break;
    }
    case 'squad-clear': {
      if (clearSquad(s, el.dataset.k)) { sound.play('deny'); app.save(); rerender(); toast(`「${SQUAD_ZH[el.dataset.k]}」已清空`); }
      break;
    }
    case 'squad-pick': {
      if (setSquadPick(s, el.dataset.mode, el.dataset.k)) {
        sound.play('click'); app.save(); rerender();
        const k = el.dataset.k;
        if (k !== 'cur' && !(s.squads?.[k]?.team || []).length) toast(`「${SQUAD_ZH[k]}」还是空的，先去队伍页存一套`);
      }
      break;
    }
    case 'squad-edit': P.squadEditor(app, { key: el.dataset.k || 'a', mode: el.dataset.mode || null }); break;
    case 'roster-sort': {
      const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false, sort: 'rarity', dir: -1 });
      if (f.sort === el.dataset.k) f.dir = -f.dir; else { f.sort = el.dataset.k; f.dir = -1; }
      render(); break;
    }
    case 'guide-growth': P.growthGuideModal(app); break;
    case 'go-orders': show('orders'); break;
    case 'pick-order': {
      const i = +el.dataset.i;
      P.pickOrder(app, i, (id) => { setOrderSlot(s, i, id); rerender(); });
      break;
    }
    case 'order-up': {
      if (upgradeOrder(s, el.dataset.id)) { sound.play('lvup'); toast('钥令淬炼成功'); render(); }
      break;
    }
    case 'brk': {
      const r = breakThrough(s, el.dataset.slug);
      if (r) { sound.play('lvup'); toast(`突破成功：金币-${fmt(r.gold)} 银芯-${r.cores}`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('材料不足');
      break;
    }
    case 'awaken': {
      const c = awakenUp(s, el.dataset.slug);
      if (c) { sound.play('lvup'); toast(`叠位 +1（银芯 -${c}）`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('银芯不足');
      break;
    }
    case 'weekly-go': {
      const r = doWeekly(s, d, teamSlugsFor(s, 'weekly'));
      if (!r) break;
      app.save(); render(); sound.play(r.win ? 'win' : 'lose');
      // 先看过程再出结算；设置里选了「跳过」就直接弹结算
      watchOrSkip(replayOf(r, { title: `周 Boss · ${r.boss.zh}`, sub: `限 ${r.roundLimit} 回合 · 比这一段时间的伤害`, kw: d.kw }),
        () => P3.weeklyResultModal(app, r));
      break;
    }
    case 'weekly-claim': { const r = claimWeekly(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`领取成功：召唤券+${r.tickets} 金币+${r.gold}${r.items.length ? ' 装备+1' : ''}${r.orders?.length ? ' 钥令+1' : ''}`); if (r.orders?.length) P.showOrders(app, r.orders); rerender(); } break; }
    case 'rt-go': case 'rt-auto': {
      const out = [];
      const realm = el.dataset.realm;
      const slugs = teamSlugsFor(s, rtModeOf(realm));   // 四座塔各用各的编队
      for (let i = 0; i < (a === 'rt-auto' ? 10 : 1); i++) { const r = doRTower(s, d, realm, slugs); if (!r) break; out.push(r); if (!r.win) break; }
      if (out.length) {
        const last = out[out.length - 1];
        app.save(); render(); sound.play(last.win ? 'win' : 'lose');
        watchOrSkip(replayOf(last, { title: `${TOWER_NAME[realm]} · 第 ${last.floor} 层${out.length > 1 ? '（最后一战）' : ''}`, sub: `已通关 ${last.floor - (last.win ? 0 : 1)} 层`, kw: d.kw }),
          () => P3.rtResultModal(app, out));
      }
      break;
    }
    case 'arena-daily': { const r = claimArenaDaily(s); if (r) { sound.play('gold'); toast(`每日排名奖励：召唤券+${r.tickets} 金币+${r.gold}`); rerender(); } break; }
    case 'arena-go': {
      const entry = app.ui.arena?.list?.find((x) => x.rank === +el.dataset.rank);
      if (!entry || arenaTries(s) <= 0) break;
      const fight = fightArena(s, d, entry, teamSlugsFor(s, 'arena'));
      const rw = applyArena(s, d, fight, localSettle(s, entry, fight.win).rank);
      app.save(); sound.play(fight.win ? 'win' : 'lose');
      watchOrSkip(replayOf(fight, { title: `天梯 · 对手 ${entry.name}（原第 ${entry.rank} 名）`, kw: d.kw }),
        () => { refreshArena(); P3.arenaResultModal(app, fight, rw, arenaState(s).rank); });
      break;
    }
    case 'friend-make': { app.ui.arena = { ...(app.ui.arena || {}), code: encodeCode(s, d, arenaState(s).name) }; render(); break; }
    case 'friend-copy': {
      const t = app.ui.arena?.code || '';
      (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => toast('对战码已复制'), () => { const ta = $('#my-code'); if (ta) { ta.select(); toast('请手动复制（Ctrl+C）'); } });
      break;
    }
    case 'friend-go': {
      const f = decodeCode($('#friend-code')?.value, d);
      if (f.error) { toast(f.error); break; }
      const fight = fightFriend(s, d, f, teamSlugsFor(s, 'arena'));
      fight.entry = { type: 'friend', name: f.name, rank: 0 };
      app.save(); sound.play(fight.win ? 'win' : 'lose');
      render();
      watchOrSkip(replayOf(fight, { title: `好友对战 · ${f.name}`, kw: d.kw }), () => P3.arenaResultModal(app, fight, {}, 0));
      break;
    }
    case 'monster': monsterModal(app, el.dataset.id); break;
    case 'codex-more': app.ui.codex.more++; render(); break;
    case 'detail': P.detailModal(app, el.dataset.slug); break;
    case 'zoom': sound.play('open'); P.artModal(app, el.dataset.slug); break;
    case 'guide': startGuide(app, () => {}); break;
    case 'lvup': sound.play('lvup'); levelUp(s, el.dataset.slug, +el.dataset.n); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
    case 'lvmax': sound.play('lvup'); levelUpMax(s, el.dataset.slug); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
    case 'pick-slot': {
      const i = +el.dataset.i;
      P.pickAwakener(app, '选择上场唤醒体', (slug) => { const t = [...s.team]; const old = t.indexOf(slug); if (old >= 0) t[old] = t[i] || null; t[i] = slug; setTeam(s, t.filter(Boolean)); rerender(); });
      break;
    }
    case 'autoteam': { const r = autoLoadout(s, d); app.save(); rerender(); toast(`一键配队完成：${r.team.length} 人 · 命轮/密契已换 · 造物 ${r.relics} 件 · 钥令 ${r.orders} 个`); break; }
    case 'preset': setPreset(s, el.dataset.k); rerender(); break;
    case 'pick-relic': {
      const i = +el.dataset.i;
      P.pickItem(app, 'relic', '选择造物', (uid) => { s.gear.relics = s.gear.relics.map((x) => (x === uid ? null : x)); s.gear.relics[i] = uid || null; rerender(); });
      break;
    }
    case 'equip-slot': {
      const { slug, kind } = el.dataset;
      P.pickItem(app, kind, kind === 'wheel' ? '选择命轮' : '选择密契', (uid) => { if (uid) equipItem(s, d, slug, uid); else { const e2 = s.gear.equip[slug] || {}; unequipItem(s, e2[kind === 'wheel' ? 'wheel' : 'cov']); } app.save(); P.detailModal(app, slug); render(); });
      break;
    }
    case 'gear-tab': app.ui.gearTab = el.dataset.k; render(); break;
    // 命轮 / 密契页里的 4 人槽位：点一下就能换（不用先回角色详情）
    case 'gear-slot': {
      const { slug, kind } = el.dataset;
      P.pickItem(app, kind, `${d.bySlug[slug].zh} · ${kind === 'wheel' ? '命轮' : '密契'}`, (uid) => {
        if (uid) equipItem(s, d, slug, uid);
        else { const e2 = s.gear.equip[slug] || {}; unequipItem(s, e2[kind === 'wheel' ? 'wheel' : 'cov']); }
        app.save(); rerender();
      });
      break;
    }
    case 'gear-up': enhanceItem(s, el.dataset.uid); rerender(); break;
    case 'gear-dis': { const v = dismantle(s, d, el.dataset.uid); if (v) toast(`分解获得 ${v} 金币`); rerender(); break; }
    case 'gear-equip': {
      const it = s.gear.items[el.dataset.uid];
      if (it.kind === 'relic') { if (isEquipped(s, it.uid)) unequipItem(s, it.uid); else equipItem(s, d, null, it.uid); rerender(); break; }
      P.pickAwakener(app, `装备给…`, (slug) => { equipItem(s, d, slug, it.uid); rerender(); toast('已装备'); });
      break;
    }
    case 'pull': { const out = summon(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(gachaSound(out)); P.showPulls(app, out); } break; }
    case 'epull': { const out = equipPull(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play('summon'); P.showItems(app, out); } break; }
    case 'tower-go': {
      const r = doTower(s, d, { slugs: teamSlugsFor(s, 'tower') });
      if (!r) break;
      app.save(); render(); sound.play(r.reached > 0 ? 'win' : 'lose');
      // 塔能连打几十层，只回放决出胜负的那一层
      const rp = r.replay ? replayOf(r.replay, { title: `倒悬回廊 · 第 ${r.replay.floor} 层`, sub: `本次到达第 ${r.reached} 层`, note: '只回放最后一战', kw: d.kw }) : null;
      watchOrSkip(rp, () => P2.towerResultModal(app, r));
      break;
    }
    case 'trial-go': {
      const r = doTrial(s, d, el.dataset.id, +el.dataset.i, teamSlugsFor(s, 'trial'));
      if (!r) break;
      app.save(); render(); sound.play(r.win ? 'win' : 'lose');
      watchOrSkip(replayOf(r, { title: `融灾试炼 · ${r.trial.name} ${r.th.k}`, kw: d.kw }), () => P2.trialResultModal(app, r));
      break;
    }
    case 'ach-claim': { const r = claimAchievement(s, el.dataset.id, app.data); if (r) { sound.play('ach'); toast('成就奖励已领取'); rerender(); } break; }
    case 'cpull': { const out = summonCores(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(gachaSound(out)); P.showPulls(app, out); } break; }
    case 'cepull': { const out = equipPullCores(s, d, 1); if (out) { app.save(); render(); sound.play('summon'); P.showItems(app, out); } break; }
    case 'shop-buy': { const r = shopBuy(s, d, el.dataset.id); if (r) { sound.play('gold'); toast(`已购买：${SHOP.find((x) => x.id === el.dataset.id).zh}`); if (r.items.length) P.showItems(app, r.items); if (r.orders?.length) P.showOrders(app, r.orders); rerender(); } break; }
    case 'gear-refine': if (refineItem(s, el.dataset.uid)) { sound.play('lvup'); rerender(); } break;
    case 'welcome-claim': { const r = claimWelcome(s, d, portalUser()); if (r) { sound.play('summonSSR'); toast(`注册福利已到账：银芯+${r.cores} 召唤券+${r.tickets} 金币+${r.gold}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'welcome-7': { const r = claimSeven(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`新手福利：银芯+${r.cores} 召唤券+${r.tickets}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'sign-today': { const r = signToday(s, d); if (r) { sound.play('ach'); toast(`签到成功：${rewardLine(r)}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'sign-back': { const r = backfill(s, d, +el.dataset.d); if (r) { sound.play('gold'); toast(`补签成功：${rewardLine(r)}`); rerender(); } break; }
    case 'sign-cum': { const r = claimCum(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`累计奖励：${rewardLine(r)}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'ach-cat': app.ui.achCat = el.dataset.k; render(); break;
    case 'ach-all': { const r = claimAllAchievements(s, d); if (r) { sound.play('ach'); toast(`领取 ${r.n} 个成就：召唤券+${r.tickets} 银芯+${r.cores} 金币+${r.gold}`); rerender(); } break; }
    case 'export': {
      const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = `morimens-idle-${Date.now()}.json`; l.click(); break;
    }
    case 'import': {
      const m = openModal('<h3>导入存档</h3><textarea id="imp" rows="8" placeholder="粘贴存档 JSON，或选择文件"></textarea><input type="file" id="impf" accept=".json"><div class="row"><button class="btn" data-act="do-import">导入</button></div>');
      $('#impf', m).addEventListener('change', async (ev) => { $('#imp', m).value = await ev.target.files[0].text(); });
      break;
    }
    case 'do-import': {
      try { const j = JSON.parse($('#imp').value); if (!j.roster) throw new Error('bad'); app.state = migrate(j, d); app.save(); closeModal(); app.bv.app = app; app.bv.restart(); render(); toast('导入成功'); } catch { toast('存档格式不正确'); }
      break;
    }
    case 'reset': if (confirm('确定重置所有进度吗？此操作不可撤销。')) { store.clear(); location.reload(); } break;
  }
}

boot().catch((err) => { document.body.insertAdjacentHTML('beforeend', `<pre class="fatal">加载失败：${esc(err.message)}</pre>`); console.error(err); });
