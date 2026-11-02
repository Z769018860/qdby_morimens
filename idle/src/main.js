import './ui/orient.js';   // 横屏 / 竖屏开关（顶栏那颗方向按钮）
import {
  indexData, newState, migrate, offlineReport, claimOffline, claimGifts, levelUp, levelUpMax, setTeam, autoTeam, autoLoadout, setPreset, setUltMode, moveUltOrder,
  equipItem, unequipItem, enhanceItem, enhanceAllEquipped, dismantleMatching, autoDismantle, dismantle, summon, equipPull, isEquipped, summonCores, equipPullCores, refineItem, rewindGear,
  dismantleCores, breakThrough, awakenUp, overdriveUp, lawUp, upgradeOrder, rewindLevel,
} from './core/game.js';
import { setOrderSlot } from './core/orders.js';
import { gearRewindPlan } from './core/gear.js';
import { TEAM_SIZE } from './core/constants.js';
import { BattleView } from './ui/battleView.js';
import * as P from './ui/pages.js';
import * as P2 from './ui/pages2.js';
import * as P3 from './ui/pages3.js';
import { doWeekly, claimWeekly, claimAllWeekly, weeklyState, weeklyOpen } from './core/weekly.js';
import { doRTower, TOWER_NAME } from './core/rtower.js';
import { arenaState, arenaTries, fightArena, applyArena, claimArenaDaily } from './core/arena.js';
import { localOpponents, localSettle, fightFriend } from './core/arena.js';
import { encodeCode, decodeCode } from './core/friend.js';
import { codexPage, monsterModal } from './ui/codex.js';
import { sound } from './ui/audio.js';
import { TRACK_ZH } from './ui/audio.js';
import { saveSquad, loadSquad, clearSquad, setSquadPick, teamSlugsFor, SQUAD_ZH, rtModeOf, squadKeyFor, withLoadout, loadoutOf } from './core/squad.js';
import { watchOrSkip, replayOf, watchMode } from './ui/replay.js';
import { emptyGacha } from './core/gacha.js';
import { fxMode } from './ui/fx.js';
import { settleMode } from './ui/report.js';
import { doTower, doTrial } from './core/challenge.js';
import { doRift } from './core/rift.js';
import { claimAchievement, claimAllAchievements, claimableCount } from './core/achievements.js';
import { signToday, backfill, claimCum } from './core/signin.js';
import { buy as shopBuy, SHOP, buyTicketWithGold } from './core/shop.js';
import { signinPage, eventPage } from './ui/pages4.js';
import * as LK from './ui/luck.js';
import * as AF from './ui/affinity.js';
import { affTick, giveGift, buyGift } from './core/affinity.js';
import {
  luckState, startRun as luckStart, fightNode as luckFight, takeOffer as luckTakeOffer, rerollOffer as luckReroll,
  applyEvent as luckApplyEvent, eventOf as luckEventOf, shopStock as luckShopStock, shopBuy as luckShopBuy,
  leaveNode as luckLeaveNode, abandonRun as luckAbandon, claimLevel as luckClaimLevel, buyTalent as luckBuyTalent,
  claimLuckAch, offerPool as luckOfferPool,
} from './core/luckrun.js';
import { claimDaily, redeemGuest, claimMile, dailyView, milePending } from './core/event.js';
import { syncSigninGifts } from './core/creators.js';
import { claimWelcome, claimSeven, portalUser, welcomeStatus } from './core/welcome.js';
import { startGuide } from './ui/guide.js';
import * as Cloud from './core/cloud.js';
import { readWallet, writeWallet, reconcile, WALLET_KEY } from './core/wallet.js';
import { $, $$, fmt, esc, dur, store, askPersist, toast, closeModal, openModal, modalEl, showKwPop } from './ui/util.js';

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
  { k: 'challenge', zh: '挑战', icon: ICON.challenge, tabs: [['challenge', '无限塔'], ['rift', '融灾禁区'], ['weekly', '周Boss'], ['rtower', '属性塔'], ['arena', '竞技场'], ['luck', '疾驰欢愉的大运']] },
  { k: 'more', zh: '更多', icon: ICON.more, tabs: [['signin', '签到'], ['event', '联动'], ['aff', '同调'], ['codex', '图鉴'], ['ach', '成就'], ['settings', '设置']] },
];

/* 每个页面用一张典藏室（原作 CG 壁纸）当底，压暗后铺在内容后面。
   同一组内换个页面也换背景，切换底部主导航时观感差别最明显。
   hall-01..12 是早期的一批，13 以后是 tools/build_bg.py 从典藏室重新压的一批。 */
const BG = {
  battle: '17', team: '13', roster: '14', gear: '15', orders: '16', summon: '18',
  challenge: '19', weekly: '20', rtower: '21', arena: '22', signin: '23', codex: '24', ach: '25', settings: '26', rift: '33',
  event: '34', luck: '35',
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
  signin: 'home', codex: 'home', ach: 'home', settings: 'home', event: 'home',
};
const gachaSound = (out) => (out.some((p) => p.rarity === 'Genesis') ? 'reveal3' : out.some((p) => p.rarity === 'SSR') ? 'reveal2' : 'reveal1');

const app = {
  ui: { lastTab: {} }, tab: 'battle',
  // 离线收益弹窗还没点「领取」时不能推进 lastSeen，否则刷新 / 关页 / 切后台都会把这段离线时间吞掉
  offlinePending: false,
  bgSince: 0,                        // 页面切到后台的时刻（最小化 / 熄屏 / 换标签页），回来按它结算后台挂机
  noSave: false,                     // 重置 / 导入过程中不能再写盘（beforeunload 会把旧状态写回去）
  save() {
    if (this.noSave || !this.state) return;
    walletSync();
    // 切到后台（最小化 / 熄屏 / 换标签页）时不推进 lastSeen：这段时间要么由「后台挂机」结算，
    // 要么被直接关掉、由下次启动按 lastSeen 结算。以前后台每 15 秒照样写一次，lastSeen 永远
    // 是「刚刚」，最小化两小时回来也被当成没离线过，收益就白丢了。
    if (!this.offlinePending && !document.hidden) this.state.lastSeen = Date.now();
    this.state.rev = (this.state.rev || 0) + 1;
    const ok = store.write(this.state);
    // 浏览器存不下（配额满 / 无痕）：进度只在 IndexedDB 镜像里，提示一次，让玩家去导出
    cloudSoon();
    if (!ok && !this.warnedSave) { this.warnedSave = true; toast('⚠ 浏览器拒绝保存进度（存储空间满或无痕模式），建议到「设置」导出存档备份', 6000); }
  },
  itemName(it) { return P.itemDef(this, it).zh + (it.lv ? ` Lv${it.lv}` : ''); },
  saveSoon() {
    clearTimeout(this._ss);
    this._ss = setTimeout(() => this.save(), 700);
  },
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
  const best = await store.readBest();
  const saved = best.state;
  app.state = saved ? migrate(saved, app.data) : newState(app.data);
  askPersist();
  if (best.from === 'idb' || best.from === 'idb-newer') setTimeout(() => toast('已从备份恢复上次的进度', 3500), 1200);
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
  // 先对云存档，再结算离线收益：
  // 原来是先按本机存档算离线、过 2.5 秒才同步，而「拉取云端」会把 lastSeen 重置成现在——
  // 云端更新的存档一落地，这一段离线时间就被吞了，离线收益白白消失。
  // 现在启动时先把云端对一遍（最多等 8 秒），拉下来的存档保留它自己的 lastSeen，之后再按最终的存档结算。
  // 账号可能是页面加载之后才由门户交过来的（手机端从门户里打开时最常见）：
  // 不等它的话，「云端有没有更新」这一步会被整个跳过，离线收益就先结算弹出去了，
  // 等账号到位再同步就成了「云端 vs 本机」的冲突——玩家刚点领取的挂机收益会被云端那份盖掉。
  if (!Cloud.account() && Cloud.config().auto) {
    const a = await accountMod().catch(() => null);
    if (a && a.ready) await Promise.race([a.ready().catch(() => {}), new Promise((r) => setTimeout(r, 4000))]);
  }
  let hadSave = !!saved;
  if (Cloud.account() && Cloud.config().auto) {
    app.booting = true;
    const before = app.state;
    try { await Promise.race([cloudRun('boot'), new Promise((r) => setTimeout(r, 8000))]); } catch { /* 离线 / 没登录：按本机结算 */ }
    // 有冲突框：等玩家选完（选哪份都要在结算之前定下来），最多等 5 分钟
    for (let i = 0; i < 1200 && modalEl(); i++) await new Promise((r) => setTimeout(r, 250));
    // 冲突框里点「用云端的」是异步的：框一关就要等那份存档真的落地。
    // 不等的话结算会拿本机存档去算——金币按本机的挂机关卡，进度却是云端的。
    await waitCloudIdle();
    app.booting = false;
    if (app.bootSeen) { app.state.lastSeen = app.bootSeen; app.bootSeen = 0; }
    if (app.state !== before) hadSave = true;      // 新设备：本机原来是空的，存档是从云端拉的
  }
  app.hadSave = hadSave;
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
  /* 离线结算单拎出来：云端存档有可能在结算「之后」才落地（网络慢、玩家在冲突框里选了云端的），
     那一刻必须换云端那份重算——否则金币是按本机挂机关卡结的，进度却是云端的。
     settleToken 用来作废已经作废的那一份：弹窗被关掉时它会被触发一次「领取」，token 对不上就重算。 */
  let settleToken = 0;
  app.cancelSettle = () => { settleToken++; app.offlinePending = false; };
  app.settleOffline = (since = 0) => {
    if (app.bootSeen) { app.state.lastSeen = app.bootSeen; app.bootSeen = 0; }   // 云存档的 lastSeen 可能被中间的 save() 冲掉过
    const token = ++settleToken;
    const rep = app.hadSave ? offlineReport(app.state, app.data, Date.now(), since) : null;
    if (rep && (rep.gold || rep.tickets)) {
      app.offlinePending = true;
      P.offlineModal(app, rep, () => {
        if (token !== settleToken) { app.settleOffline(); return; }   // 这份是按旧存档算的，作废重来
        app.offlinePending = false;
        claimOffline(app.state, rep); app.save(); app.refreshTop();
        // 记一笔「刚领、还没传上云」：万一云端那份在同步回来之后才落地（手机网络慢的常见路径），
        // applyCloudSave 会把这笔补回到新存档上，不会白领。
        app.claim = { ...rep, at: Date.now() };
        toast('已领取离线收益'); app.bv.start(); maybeGuide();
        // 领完立刻推一次：别留一个「本机多一笔、云端还没有」的分叉，等下一次自动同步就变成冲突了
        cloudRun('auto');
      });
    } else {
      app.offlinePending = false;
      claimOffline(app.state, rep || null);
      app.bv.start(); maybeGuide();
    }
  };
  app.settleOffline();
  // 累计签到送的那几位：达标就自动进包（老存档首次进游戏也会补发）
  checkSigninGifts();
  // 同调率：跨天补给礼物（花束 ×2 / 唱片 ×1），自动进包，不用点领取
  {
    const got = affTick(app.state);
    if (got) {
      app.save();
      const txt = Object.entries(got).map(([k, n]) => `${({ flower: '共鸣花束', record: '旧唱片', crystal: '共鸣水晶' })[k] || k} ×${n}`).join(' · ');
      setTimeout(() => toast(`🎁 今日同调补给：${txt}（更多 → 同调）`, 3600), 1200);
    }
  }
  document.addEventListener('visibilitychange', onVisibility);
  setTimeout(() => cloudRun('auto'), 2500);
  setTimeout(giftRun, 4000);
  walletBoot();
  window.addEventListener('storage', (e) => { if (e.key === WALLET_KEY && app.state) { walletSync(); app.refreshTop(); } });
  // 另一个标签页存档了：当前窗口在后台就先不管（回到前台时 onVisibility 会同步），在前台就立刻同步
  window.addEventListener('storage', (e) => { if (e.key === store.KEY && !document.hidden && !app.offlinePending) adoptNewerDisk(); });
  window.addEventListener('pagehide', () => { app.save(); store.flush(); cloudPush(true); });
  window.addEventListener('beforeunload', () => app.save());
  // 每 5 秒记一次「游玩时长」（只算页面可见的那段时间，切到后台就停），
  // 顺便每 15 秒存一次盘——原来只有一个 15s 的 save 定时器。
  // 这个数是给个人中心 / 站长后台看的（state.play，秒）。
  let lastPlay = Date.now();
  let tickN = 0;
  setInterval(() => {
    const now = Date.now();
    if (!document.hidden) app.state.play = Math.round((Number(app.state.play) || 0) + (now - lastPlay) / 1000);
    lastPlay = now;
    if (++tickN >= 3) { tickN = 0; app.save(); }
  }, 5000);
  let dmAcc = { n: 0, gold: 0, cores: 0 }, dmLast = 0;
  setInterval(() => {
    if (!app.state || app.booting || document.hidden || !app.state.autoDm?.on) return;
    const r = autoDismantle(app.state, app.data);
    if (!r.n) return;
    dmAcc.n += r.n; dmAcc.gold += r.gold; dmAcc.cores += r.cores;
    app.refreshTop(); app.saveSoon();
    if (app.tab === 'gear' && !document.querySelector('.modal-bg, .modal')) render();
    if (Date.now() - dmLast > 8000) { dmLast = Date.now(); toast(`自动分解 ${dmAcc.n} 件：金币 +${fmt(dmAcc.gold)}${dmAcc.cores ? `，银芯 +${dmAcc.cores}` : ''}`, 2400); dmAcc = { n: 0, gold: 0, cores: 0 }; }
  }, 4000);
  window.__game = app; // handy for debugging / tests
}

/* ---------- 银芯 = 全站钱包 ----------
   state.cores 是站点钱包（zjtt:credits）的镜像，见 core/wallet.js。每次存档前对账；钱包变了就让账号档案去推送。
   账号同步（拉别的设备的钱包、领管理员发放的银芯）借用站点的 js/account.js，动态引入：失败就只用本机钱包。 */
let acctMod = null;
function accountMod() {
  if (!acctMod) acctMod = import('../../js/account.js').then((m) => m.account || m).catch(() => null);
  return acctMod;
}
function walletSync() {
  const st = app.state;
  if (!st) return;
  const w = readWallet();
  const total = reconcile(st, w);
  if (total !== w) { writeWallet(total); accountMod().then((a) => a && a.schedule && a.schedule()).catch(() => {}); }
}
// 进游戏：先用本机钱包对一次账，再等账号同步（别的设备的钱包 / 管理员发放的银芯）落地后再对一次
async function walletBoot() {
  walletSync();
  const a = await accountMod();
  if (!a || !a.ready) return;
  try { await a.ready(); } catch { /* 离线 / 没登录 */ }
  walletSync();
  app.refreshTop();
  if (app.tab === 'settings' || app.tab === 'more' || app.tab === 'summon') render();
}

/* ---------- 站长赠礼（唤醒体） ----------
   管理后台批量发的唤醒体挂在账号上（/grants/mine 的 awk），进游戏时领：没有的新增、已有的叠位 +1。
   放在云同步之后一点（4 秒）：新设备要先让云端存档落地，否则会领进一个马上被覆盖的空档。 */
async function giftRun() {
  if (!Cloud.account() || !app.state || app.offlinePending) return;
  if (app.cloud && (app.cloud.busy || app.cloud.hold || app.cloud.status === 'conflict')) { setTimeout(giftRun, 6000); return; }
  try {
    const items = await Cloud.fetchGrants();
    const got = claimGifts(app.state, app.data, items.filter((g) => (Array.isArray(g.awk) && g.awk.length) || Number(g.rw) > 0 || Number(g.tk) > 0 || Number(g.gold) > 0));
    if (!got.length) return;
    app.save(); render(); app.refreshTop();
    const names = got.map((g) => (g.voucher ? `回溯券 ×${g.voucher}` : g.tickets ? `召唤券 ×${g.tickets}` : g.gold ? `金币 +${fmt(g.gold)}` : g.isNew ? `${g.zh}（新）` : `${g.zh} 叠位+1`)).join('、');
    toast(`收到站长赠礼：${names}`, 5000);
  } catch { /* 没网 / 没登录：下次进游戏再领 */ }
}

/* ---------- 云端存档 ----------
   登录了本站账号就自动同步整份存档（core/cloud.js）。状态放在 app.cloud，设置页读它显示。 */
app.cloud = { status: 'idle', at: 0, err: '', busy: false, hold: false };
app.cloudJob = null;          // 正在进行的「拉云端 / 套云端」：启动结算离线收益前要等它落地
app.claim = null;             // 刚领、还没传上云的离线收益（云端存档若在此之后落地，要原样补回来）
let keepCloudSeen = false;    // 这一轮拉下来的云存档保留它自己的 lastSeen（这段时间还没在哪儿结算过）
let cloudTimer = 0;
const CLOUD_GAP = 25000;     // 本机改动后，最多隔这么久推一次
function cloudSoon() {
  if (!Cloud.config().auto || app.cloud.hold || cloudTimer || !Cloud.account()) return;
  cloudTimer = setTimeout(() => { cloudTimer = 0; cloudPush(false); }, CLOUD_GAP);
}
let cloudRetryAt = 0, cloudRetryN = 0;     // 同步失败后的退避重试
function setCloud(status, err = '', extra = {}) {
  app.cloud.status = status; app.cloud.err = err;
  Object.assign(app.cloud, extra);
  if (status === 'ok') { app.cloud.at = Date.now(); cloudRetryN = 0; app.claim = null; }
  if (app.tab === 'settings') render();
}
/** 失败了自己再试（15 秒起，指数退避，封顶 5 分钟）。
    以前只在「下一次存档」时才重试，玩家挂着看战斗 / 停在设置页时，那条「稍后会自动重试」其实永远不会重试。 */
function cloudRetryLater() {
  if (cloudRetryAt || !Cloud.config().auto || app.cloud.hold || !Cloud.account()) return;
  const wait = Math.min(300000, 15000 * 2 ** Math.min(cloudRetryN, 4));
  cloudRetryN++;
  cloudRetryAt = Date.now() + wait;
  setTimeout(() => { cloudRetryAt = 0; cloudRun('auto'); }, wait);
}

// 把云端那份存档套到本机：lastSeen 重置为现在（这段时间已经在另一台设备上结算过，不重复发离线收益）
async function applyCloudSave(save) {
  const doc = await Cloud.unpackSave(save.data);   // 大存档是 gz1: 压缩包，老存档是明文
  if (!doc || !doc.roster) throw new Error('bad_cloud_save');
  app.state = migrate(doc, app.data);
  // 启动 / 手机切回来这两种情况，这段时间还没在哪儿结算过：保留云端存档自己的 lastSeen，随后按它结算；
  // 游戏中途同步的才重置成现在（那段时间已经在另一台设备上过了，这里不重复发）
  const keepSeen = app.booting || keepCloudSeen;
  app.state.lastSeen = keepSeen ? (Number(doc.lastSeen) || Date.now()) : Date.now();
  if (keepSeen) app.bootSeen = app.state.lastSeen;      // 启动阶段中间若有谁调了 save()，lastSeen 会被冲成现在：记下来，结算前还原
  app.state.rev = Math.max(app.state.rev || 0, 0) + 1;
  app.hadSave = true;          // 云端有进度：这台设备现在也有存档了，离线结算按它算
  // 上一份存档刚领过离线收益、还没来得及传上去，云端这份就落地了：
  // 那笔收益是「这段时间没玩」的补偿，不该因为换了存档就蒸发——补回到新存档上再往下走。
  // （claimOffline 会顺手把 lastSeen 推到现在，所以这段时长不会被重复发一次。）
  const carry = app.claim;
  app.claim = null;
  if (carry) {
    claimOffline(app.state, carry);
    app.bootSeen = 0;          // 已经按「现在」结算过了，别让启动结算再把 lastSeen 倒回去发一遍
    toast(`刚领的挂机收益已经保住了：金币 +${fmt(carry.gold || 0)}`, 4000);
  }
  // 存档整份换了：正在显示的离线结算如果是按旧档算的，作废（关掉弹窗会让它「领取」一次，靠 token 拦住）并重算
  if (app.offlinePending) { app.cancelSettle?.(); closeModal(); }
  else if (!app.booting) app.offlinePending = false;
  store.write(app.state);
  walletSync();
  Cloud.markSynced(app.state, save.ver);
  if (app.bv) { app.bv.app = app; app.bv.restart?.(); }
  if (app.root && !app.booting) { render(); app.refreshTop(); }
}

/** 拉云端存档并套上：整个动作挂到 app.cloudJob 上，启动结算前可以先等它落地 */
async function pullCloudSave() {
  const job = (async () => {
    const save = await Cloud.fetchSave();
    if (save) await applyCloudSave(save);
    return save;
  })();
  app.cloudJob = job;
  try { return await job; } finally { if (app.cloudJob === job) app.cloudJob = null; }
}

/** 等云端那边「拉存档 / 套存档」做完（最多 ms 毫秒）。
    启动时结算离线收益必须先等这一步：存档还没落地就算，算的是本机那份。 */
async function waitCloudIdle(ms = 15000) {
  const t0 = Date.now();
  while (app.cloudJob && Date.now() - t0 < ms) {
    await Promise.race([app.cloudJob, new Promise((r) => setTimeout(r, 120))]);
  }
}

async function cloudPush(keepalive) {
  const acct = Cloud.account();
  if (!acct || app.cloud.hold || !app.state) return;
  const sync = Cloud.syncRecord();
  // 没有同步记录（第一次）或换了账号：走完整流程（先问云端有什么）
  if (!sync || sync.acct !== acct.name) return cloudRun('first');
  if ((app.state.rev || 0) <= (sync.rev || 0)) return;           // 没有新改动
  try {
    const r = await Cloud.pushSave(app.state, sync.ver, { keepalive });
    if (r.conflict) return cloudRun('conflict');
    setCloud('ok');
  } catch (e) { setCloud('error', e.message, { bytes: e.bytes || 0 }); cloudRetryLater(); }
}

export async function cloudRun(reason = 'auto') {
  const acct = Cloud.account();
  if (!acct) { setCloud('nologin'); return; }
  if (app.cloud.busy) return;
  if (reason === 'auto' && (!Cloud.config().auto || app.cloud.hold)) return;
  app.cloud.busy = true; setCloud('syncing');
  try {
    const cm = await Cloud.fetchMeta();
    const act = Cloud.plan({ state: app.state, cloudMeta: cm, sync: Cloud.syncRecord(), acct: acct.name });
    if (act === 'push') {
      const r = await Cloud.pushSave(app.state, cm ? cm.ver : 0);
      if (r.conflict) { cloudConflict(r.cloud); setCloud('conflict'); }
      else setCloud('ok');
    } else if (act === 'pull') {
      // 离线收益弹窗还开着（还没领）时不能把存档换掉——否则这份离线收益就吞了；过几秒再来
      if (app.offlinePending) { setCloud('idle'); setTimeout(() => cloudRun('auto'), 4000); return; }
      await pullCloudSave();
      toast('已从云端同步最新进度', 3200);
      setCloud('ok');
    } else if (act === 'same') {
      // 本机和云端内容一样：只把版本号对上，不打扰玩家
      Cloud.markSynced(app.state, cm.ver); setCloud('ok');
    } else if (act === 'conflict') {
      // 弹框之前再核一遍：云端老存档的摘要里没有哈希，取整份下来对一下，一样就别问了
      let same = false;
      try {
        const doc = await Cloud.unpackSave((await Cloud.fetchSave()).data);
        same = !!doc && Cloud.contentHash(migrate(doc, app.data)) === Cloud.contentHash(app.state);
      } catch { same = false; }
      if (same) { Cloud.markSynced(app.state, cm.ver); setCloud('ok'); }
      else { cloudConflict(cm); setCloud('conflict'); }
    } else {
      if (cm) Cloud.markSynced(app.state, cm.ver);
      setCloud('ok');
    }
  } catch (e) {
    setCloud(e.message === 'need_login' ? 'nologin' : 'error', e.message, { bytes: e.bytes || 0 });
    if (e.message !== 'need_login') cloudRetryLater();
  } finally { app.cloud.busy = false; if (app.tab === 'settings') render(); }
}

// 两边都有进度：把两份的关键数字摆出来，让玩家选
function cloudConflict(cm) {
  const s = app.state, mine = Cloud.metaOf(s), c = cm?.meta || {};
  const t = (ms) => (ms ? new Date(ms).toLocaleString() : '—');
  const col = (title, m, at) => `<div class="cfcol"><b>${title}</b><p>最高通关 <b>${m.maxStage ?? '—'}</b> 关</p><p>唤醒体 <b>${m.roster ?? '—'}</b> 个</p><p>游玩 <b>${Math.round((m.play || 0) / 60)}</b> 分钟</p><p class="dim">最后保存 ${t(at)}</p></div>`;
  // 本机这笔挂机收益还没传上云：选云端等于把本机存档整份丢掉，这里必须提前说清楚
  const keep = app.claim
    ? `<p class="hint">这台设备上刚领了一笔挂机收益（金币 +${fmt(app.claim.gold || 0)}${app.claim.tickets ? `、券 +${fmt(app.claim.tickets)}` : ''}），还没传上云端。<br>选「用云端的」时这笔会<b>自动补回</b>到云端那份存档上，不会白领。</p>`
    : '';
  const m = openModal(`<h3>本机和云端的进度不一样</h3>
    <p class="hint">这个账号在云端有一份存档，和这台设备上的不同。选一份留下，<b>另一份会被覆盖</b>。</p>
    <div class="cfrow">${col('本机', mine, mine.lastSeen)}${col('云端', c, cm?.at)}</div>${keep}
    <div class="row"><button class="btn gold" data-cf="cloud">用云端的</button><button class="btn" data-cf="local">用本机的（覆盖云端）</button></div>
    <div class="row"><button class="btn sm" data-cf="later">先不处理</button></div>`, 'wide');
  m.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    const k = b.dataset.cf;
    if (k === 'later') { app.cloud.hold = true; closeModal(); setCloud('hold'); return; }
    closeModal();
    try {
      if (k === 'cloud') { const sv = await pullCloudSave(); if (!sv) throw new Error('云端还没有存档'); toast('已换成云端的进度', 3000); }
      else { const r = await Cloud.pushSave(s, cm.ver); if (r.conflict) throw new Error('conflict'); toast('已用本机的进度覆盖云端', 3000); }
      app.cloud.hold = false; setCloud('ok');
    } catch (err) { setCloud('error', err.message); }
  });
}

function adoptNewerDisk() {
  const disk = store.read();
  if (!disk || (disk.rev || 0) <= (app.state.rev || 0)) return false;
  app.state = migrate(disk, app.data);
  app.bv.app = app;
  app.bv.restart?.();
  app.render?.();
  app.refreshTop();
  toast('检测到另一个窗口存了更新的进度，已同步', 3000);
  return true;
}

/** 后台挂机结算：最小化 / 手机熄屏回来，把「切走的那段时间」按挂机收益补上。
    跟启动时的离线结算同一套公式，但不弹结算框（那条路径是重新进游戏才用的），只发一条 toast 报账。 */
function settleBackground(since) {
  const rep = app.hadSave ? offlineReport(app.state, app.data, Date.now(), since) : null;
  if (!rep || (!rep.gold && !rep.tickets && !rep.drops.length)) {
    claimOffline(app.state, rep || null);       // 只把 lastSeen 推到现在，免得下次重复算
    app.bv.start();
    return false;
  }
  claimOffline(app.state, rep);
  app.save(); app.refreshTop();
  const bits = [`金币 +${fmt(rep.gold)}`];
  if (rep.tickets) bits.push(`召唤券 +${rep.tickets}`);
  if (rep.cores) bits.push(`银芯 +${rep.cores}`);
  if (rep.drops.length) bits.push(`装备 ${rep.drops.length} 件`);
  toast(`后台挂机 ${dur(rep.secs)}：${bits.join('，')}`, 4200);
  app.bv.start();
  return true;
}

function onVisibility() {
  if (document.hidden) {
    if (!app.bgSince) app.bgSince = Date.now();     // 记下「什么时候切走的」，回来按它算后台挂机
    app.bv.stop(); app.save(); cloudPush(true); return;
  }
  // 上一份离线收益还挂在弹窗里没领，就别再算第二份（lastSeen 没动，会把同一段时间算两遍）
  if (app.offlinePending) { setTimeout(() => cloudRun('auto'), 1200); return; }
  // 这段时间别的窗口 / 标签页如果存过更新的进度，就用它——否则这个旧窗口的内存状态会把新进度覆盖掉（看起来像「进度回档」）
  adoptNewerDisk();
  // 后台挂机：从「切走的时刻」算，而不是 lastSeen（后台期间存档还在写，lastSeen 一直是刚刚）
  const bgFrom = app.bgSince; app.bgSince = 0;
  const last = Number(app.state.lastSeen) || Date.now();
  const since = bgFrom ? Math.min(bgFrom, last) : last;
  const away = Date.now() - since;
  // 就切出去几秒：没什么可结算的，直接开打，别为它等云端
  if (away < 60000) { app.bv.start(); setTimeout(() => cloudRun('auto'), 1200); return; }
  // 离线超过一分钟：先把云端对一遍再结算。以前这里 1.2 秒后才同步，
  // 结算早就按本机存档算完了——金币按本机的挂机关卡发，进度却是云端那份。
  (async () => {
    if (Cloud.account() && Cloud.config().auto) {
      keepCloudSeen = true;        // 拉下来的存档保留它自己的 lastSeen，随后按它结算
      try {
        await Promise.race([cloudRun('auto'), new Promise((r) => setTimeout(r, 6000))]);
        await waitCloudIdle(6000);
      } catch { /* 离线 / 没登录：按本机结算 */ } finally { keepCloudSeen = false; }
    } else {
      setTimeout(() => cloudRun('auto'), 1200);
    }
    if (app.offlinePending) return;      // 拉存档的时候就弹出了结算，别再算第二份
    settleBackground(since);
  })();
}

// 顶栏那个喇叭：一声点击就能静音，不用钻到设置页
function syncSnd() {
  const b = $('#sndq');
  if (!b) return;
  b.textContent = sound.cfg.mute ? '🔇' : '🔊';
  b.classList.toggle('off', !!sound.cfg.mute);
  b.title = sound.cfg.mute ? '已静音，点击开启' : '声音开，点击静音';
}
function keywordGuide() {
  const kw = app.data?.kw || {};
  const entries = Object.entries(kw).filter(([, k]) => k && k.n && k.d)
    .sort((a, b) => String(a[1].n).localeCompare(String(b[1].n), 'zh'));
  /* 伤害乘区放在最前面：列表里那几十条只是各自的说明，讲不清「为什么这两个一起上更划算」。
     实际结算见 battle.js 的 damage() / guarded()：同一乘区里是加法（会稀释），跨乘区才是再乘一遍。 */
  const zones = `<div class="zonebox">
    <h4>伤害乘区 <small>同一乘区内相加，跨乘区相乘</small></h4>
    <p class="zhint">一次伤害是几块乘数连乘出来的。同一条乘区里再加一项只是加法（越叠越稀释），换一条乘区则是实打实的再乘一遍——所以要「分开放」。</p>
    <div class="zonelist">
      <div class="zonerow"><b>① 攻击 × 倍率</b><span>面板攻击 ×（1 + 攻击加成%）× 技能倍率</span></div>
      <div class="zonerow"><b>② 增伤 amp</b><span>所有「伤害提升 X%」先<em>相加</em>，再整体 ×（1 + 总增伤%）</span></div>
      <div class="zonerow"><b>③ 暴击</b><span>暴击时 ×（1 + 暴击伤害%），不暴击 ×1；暴伤默认 50%</span></div>
      <div class="zonerow"><b>④ 防御</b><span>×（1 − 防御 ÷（防御 + 150））：防御 150 ＝ 减伤一半，再往上每点越来越不值</span></div>
      <div class="zonerow"><b>⑤ 易伤 vuln</b><span>挨打方身上的「受到伤害 +X%」，和增伤各乘一次，所以两样一起上最划算</span></div>
      <div class="zonerow"><b>⑥ 持续与反击</b><span>毒 / 流血 / 反击只吃<em>半量</em>防御，增伤与易伤照乘（另有 ×1.2 补偿，免得它们被重甲甩开）</span></div>
    </div>
    <p class="zoneeg">例：攻击 100、技能倍率 1.0、增伤 +50%、暴击且暴伤 +100%、敌方防御 150（减伤一半）、易伤 +20% → 100 × 1.5 × 2.0 × 0.5 × 1.2 ＝ <b>180</b>。</p>
  </div>`;
  const html = '<h2>词条说明</h2>' + zones + '<p class="hint">点击词条查看完整说明；包括战斗状态、技能机制与界域。</p>' +
    '<div class="idle-glossary">' + entries.map(([id, k]) =>
      '<button type="button" class="idle-glossary-item" data-kw="' + esc(id) + '">' + esc(k.n) + '</button>'
    ).join('') + '</div>';
  openModal(html, 'glossary-modal');
}
/* 底部导航红点：成就、联动任务（今日任务 + 推图里程碑）里还有多少奖励没点。
   组按钮上只亮一个小红点（手机上没地方写数字），二级页签上直接写数量。 */
function badgeCounts() {
  if (!app.state || !app.data) return { ach: 0, event: 0 };
  let ach = 0, ev = 0;
  try { ach = claimableCount(app.state, app.data); } catch { ach = 0; }
  try {
    ev = dailyView(app.state).filter((t) => t.done && !t.claimed).length;
    if (milePending(app.state)) ev++;   // 推图里程碑能领时也算一条
  } catch { ev = 0; }
  return { ach, event: ev };
}
function refreshBadges() {
  const n = badgeCounts();
  app.badges = n;
  $$('#tabs button[data-group]').forEach((b) => {
    const g = GROUP_BY_K[b.dataset.group];
    if (!g) return;
    const sum = g.tabs.reduce((x, [k]) => x + (n[k] || 0), 0);
    const dot = b.querySelector('.rdot');
    if (dot) dot.hidden = !sum;
    b.title = sum ? `${g.zh} · ${sum} 个奖励可领取` : g.zh;
  });
  $$('#subnav button[data-sub]').forEach((b) => {
    const c = n[b.dataset.sub] || 0, dot = b.querySelector('.rdot');
    if (!dot) return;
    dot.hidden = !c;
    dot.textContent = c ? (c > 99 ? '99+' : String(c)) : '';   // 0 不留 "0"，否则按钮上会多出个哑字符
    b.title = c ? `${c} 个奖励可领取` : '';
  });
}
function buildChrome() {  $('#tabs').innerHTML = GROUPS.map((g) => `<button data-group="${g.k}" title="${g.zh}"><i class="ti">${g.icon}</i><span>${g.zh}</span><i class="rdot" hidden></i></button>`).join('');
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-group]');
    if (!b) return;
    const g = GROUP_BY_K[b.dataset.group];
    // 回到该组上次停留的页面，比每次都跳回第一页更符合直觉
    show((app.ui.lastTab || {})[g.k] || g.tabs[0][0]);
  });
  $('#subnav').addEventListener('click', (e) => { const b = e.target.closest('[data-sub]'); if (b) show(b.dataset.sub); });
  const help = document.createElement('button');
  help.type = 'button'; help.className = 'idle-terms-btn'; help.textContent = '词条说明';
  help.setAttribute('aria-label', '查看战斗词条说明');
  help.addEventListener('click', keywordGuide);
  document.querySelector('.top .res')?.prepend(help);
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
    ? g.tabs.map(([k, z]) => `<button data-sub="${k}" class="${k === tab ? 'on' : ''}">${z}<i class="rdot" hidden></i></button>`).join('')
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
  refreshBadges();
}
function refreshArena() {
  app.ui.arena = { ...(app.ui.arena || {}), list: localOpponents(app.state, app.data) };
  if (app.tab === 'arena') render();
}
function render() {
  const f = { team: P.teamPage, roster: P.rosterPage, gear: P.gearPage, orders: P.ordersPage, summon: P.summonPage, settings: P.settingsPage, challenge: P2.challengePage, codex: codexPage, signin: signinPage, weekly: P3.weeklyPage, rtower: P3.rtowerPage, arena: P3.arenaPage, rift: P3.riftPage, ach: P2.achievementPage, event: eventPage, luck: LK.luckPage, aff: AF.affinityPage }[app.tab];
  if (f) { const y = window.scrollY; $('#view').innerHTML = f(app); window.scrollTo(0, y); }
  app.refreshTop();
  refreshBadges();
}
const rewardLine = (r) => [`召唤券+${r.tickets}`, `银芯+${r.cores}`, `金币+${r.gold}`, r.rw ? `回溯券+${r.rw}` : ''].filter(Boolean).join(' ');
const rerender = () => { app.save(); render(); };

/* 大运：一场打完之后的出口——还活着就出「三选一」，全灭 / 通关就直接结算。 */
function afterLuckBattle(app, r) {
  const s = app.state;
  app.save(); render();
  const run = luckState(s).cur;
  if (!run) { const end = luckState(s).lastRun; if (end) LK.luckEndModal(app, end); return; }
  if (r?.res?.win) { run.offer = luckOfferPool(s, app.data, run, 3); LK.luckOfferModal(app, run); }
}

/* 累计签到送的联名嘉宾（core/creators.js 的 SIGNIN_GIFTS）：达标自动进包，
   已拥有就什么都不做，所以可以放心每次签到后都调一次。 */
function checkSigninGifts() {
  if (!app.state) return [];
  const got = syncSigninGifts(app.state);
  if (!got.length) return [];
  app.save();
  sound.play('summonSSR');
  toast(`🎁 累计签到赠礼：${got.map((g) => g.zh).join('、')} 已加入队伍（更多 → 联动 可查看）`, 4200);
  return got;
}

function onChange(e) {
  if (e.target.matches('[data-cloud-auto]')) { Cloud.setConfig({ auto: e.target.checked }); if (e.target.checked) { app.cloud.hold = false; cloudRun('auto'); } render(); return; }
  if (e.target.matches('[data-settle]')) { settleMode.set(e.target.value); toast('结算弹窗：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-fx]')) { fxMode.set(e.target.value); toast('战斗特效：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-watch]')) { watchMode.set(e.target.value); toast('挑战过程：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-arena-name]')) { arenaState(app.state).name = e.target.value.trim().slice(0, 12) || '旅人'; app.save(); return; }
  const eh = e.target.closest('[data-eh]');
  if (eh) {
    const cur = new Set(app.ui.eh || ['cur']);
    if (eh.checked) cur.add(eh.dataset.eh); else cur.delete(eh.dataset.eh);
    app.ui.eh = [...cur];
    closeModal(); P.enhanceModal(app); return;
  }
  const dm = e.target.closest('[data-dm]');
  if (dm) { P.dmFilter(app)[dm.dataset.dm] = dm.checked; app.saveSoon(); closeModal(); P.dismantleModal(app); return; }
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
  if (el.tagName === 'BUTTON' && !['pull', 'epull', 'ach-claim', 'tower-go', 'trial-go', 'lvup', 'lvmax', 'sign-today', 'welcome-claim', 'welcome-7', 'cpull', 'cepull', 'shop-buy', 'gold-ticket', 'ach-all', 'snd-test', 'awaken', 'brk', 'order-up'].includes(a)) sound.play('click');
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
      const key = el.dataset.k, hadLo = !!loadoutOf(s, key);
      const r = loadSquad(s, key);
      if (r) {
        // 上阵完直接切到「主线队伍」：人换了没换、战力变没变，一眼能看见（留在编队库只会觉得没反应）
        sound.play('open'); app.save();
        app.ui.teamTab = 'main';
        if (app.tab === 'team') render(); else show('team');
        toast(`「${SQUAD_ZH[key]}」已上阵：${r.length} 人${hadLo ? '，独立配装一起搬过来了' : ''}`, 3200);
      }
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
    case 'team-tab': app.ui.teamTab = el.dataset.k; sound.play('click'); render(); break;
    case 'team-rt': app.ui.rtTab = el.dataset.k; sound.play('click'); render(); break;
    case 'roster-sort': {
      const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false, sort: 'rarity', dir: -1 });
      if (f.sort === el.dataset.k) f.dir = -f.dir; else { f.sort = el.dataset.k; f.dir = -1; }
      render(); break;
    }
    case 'guide-growth': P.growthGuideModal(app); break;
    case 'go-orders': show('orders'); break;
    case 'go-rift': show('rift'); break;
    case 'go-luck': show('luck'); break;
    case 'go-aff': show('aff'); break;
    // ---- 同调率 ----
    case 'aff-gift': AF.giftModal(app, el.dataset.slug, el.dataset.back || 'aff'); break;
    case 'aff-send': {
      const slug = el.dataset.slug, r = giveGift(s, slug, el.dataset.k);
      if (!r.ok) { toast(r.why, 2000); break; }
      sound.play(r.up > 0 ? 'lvup' : 'coin');
      toast(AF.sendText(app, slug, r), r.up > 0 ? 3200 : 1800);
      app.save();
      // 送完接着弹同一个人的赠送框（可以连着送）；下面那一页顺手刷新，等级别显示成旧的
      if (el.dataset.back === 'detail') { closeModal(); render(); P.detailModal(app, slug); }
      else { render(); AF.giftModal(app, slug); }
      break;
    }
    case 'aff-buy': {
      const r = buyGift(s, el.dataset.k, 1);
      if (!r.ok) { toast(r.why, 2000); break; }
      sound.play('coin'); toast(`买到 ${r.n} 份，花了 ${fmt(r.cost)} 金币`, 2200);
      app.save(); render();
      break;
    }
    // ---- 疾驰欢愉的大运 ----
    case 'luck-start': {
      // 用「大运」入口选定的那一队（当前队伍 / 通用一~五队 / 大运专用队）；整趟固定，连装备配置也一起记下来
      const team = teamSlugsFor(s, 'luck').filter((x) => s.roster[x]);
      const run = luckStart(s, d, el.dataset.k, team);
      if (!run) { toast('先编好队伍再上车'); break; }
      run.sq = squadKeyFor(s, 'luck') || null;
      sound.play('nav'); app.save(); render();
      break;
    }
    case 'luck-fight': {
      const run = luckState(s).cur;
      if (!run) { render(); break; }
      const act = run.act + 1, nodeNo = run.node + 1;
      const r = withLoadout(s, run.sq || null, () => luckFight(s, d, run));   // 这一队有独立配装就按它的装备打
      if (!r) { app.save(); render(); break; }
      // 先渲染：这一场打完节点已经往前推了，页面上的按钮必须跟着换，
      // 否则回放还没结束时看到的还是旧节点（还能再点一次「开打」）
      app.save(); render();
      sound.play(r.res.win ? 'win' : 'lose');
      watchOrSkip(replayOf(r.res, {
        title: `大运 · 第 ${act} 层 · 第 ${nodeNo} 关`,
        sub: r.res.win ? `还剩 ${Math.round(r.res.allies.reduce((n, a) => n + a.hp, 0) / Math.max(1, r.res.allies.reduce((n, a) => n + a.maxHp, 0)) * 100)}% 生命` : '这一场没顶住',
        note: '跳过回放不影响结算', kw: d.kw,
      }), () => afterLuckBattle(app, r));
      break;
    }
    case 'luck-pick': {
      const run = luckState(s).cur;
      if (!run) { closeModal(); break; }
      const it = luckTakeOffer(s, d, run, el.dataset.id);
      closeModal(); app.save(); render();
      if (it) { sound.play('ach'); toast(`已获得：${it.zh}`, 2600); }
      break;
    }
    case 'luck-reroll': {
      const run = luckState(s).cur;
      if (!run) { closeModal(); break; }
      if (luckReroll(s, d, run)) { closeModal(); app.save(); LK.luckOfferModal(app, run); sound.play('click'); }
      else toast('没有重掷次数了');
      break;
    }
    case 'luck-ev': {
      const run = luckState(s).cur;
      if (!run) { render(); break; }
      const out = luckApplyEvent(s, d, run, +el.dataset.i);
      if (out?.err) { toast(out.err); break; }
      app.save(); render(); sound.play('gold');
      const bits = [];
      if (out?.glow) bits.push(`余晖 +${fmt(out.glow)}`);
      if (out?.heal > 0) bits.push(`回复 ${out.heal}% 生命`);
      if (out?.heal < 0) bits.push(`失去 ${-out.heal}% 生命`);
      if (out?.maxhp) bits.push(`生命上限 +${out.maxhp}%`);
      if (out?.reroll) bits.push(`重掷次数 +${out.reroll}`);
      if (out?.score) bits.push(`得分 +${fmt(out.score)}`);
      if (out?.got?.length) bits.push(`获得 ${out.got.join('、')}`);
      toast(bits.length ? bits.join('，') : '什么都没发生', 3200);
      break;
    }
    case 'luck-buy': {
      const run = luckState(s).cur;
      if (!run) { render(); break; }
      const r2 = luckShopBuy(s, d, run, +el.dataset.i);
      if (r2?.err) { toast(r2.err); break; }
      app.save(); render(); sound.play('gold');
      toast(`买下：${r2.zh}`);
      break;
    }
    case 'luck-leave': {
      const run = luckState(s).cur;
      if (!run) { render(); break; }
      luckLeaveNode(s, run); app.save(); render(); sound.play('nav');
      break;
    }
    case 'luck-abandon': {
      const run = luckState(s).cur;
      if (!run) { render(); break; }
      if (!confirm('放弃这一趟？已经拿到的分数会照常结算（这一局算失败）。')) break;
      const end = luckAbandon(s);
      app.save(); render(); sound.play('lose');
      if (end) LK.luckEndModal(app, end);
      break;
    }
    case 'luck-claim-lv': {
      const r2 = luckClaimLevel(s, +el.dataset.i);
      if (r2) { sound.play('ach'); toast(`Lv.${r2.lv} 奖励到账：${rewardLine(r2)}${r2.tp ? ` · 天赋点 +${r2.tp}` : ''}`); rerender(); }
      break;
    }
    case 'luck-talent': {
      if (luckBuyTalent(s, el.dataset.id)) { sound.play('lvup'); rerender(); } else toast('天赋点不够');
      break;
    }
    case 'luck-lv-toggle': { app.ui.luckAllLv = !app.ui.luckAllLv; render(); sound.play('click'); break; }
    case 'luck-ach': {
      const rw = claimLuckAch(s, el.dataset.id);
      if (rw) { sound.play('ach'); toast(`成就奖励：${rewardLine(rw)}`); rerender(); }
      break;
    }
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
    case 'cloud-sync': cloudRun('manual'); break;
    case 'cloud-pull': {
      if (!confirm('用云端的存档覆盖这台设备上的进度？本机现在的进度会丢。')) break;
      (async () => { try { const save = await pullCloudSave(); if (!save) { toast('云端还没有存档'); return; } toast('已用云端存档覆盖本机', 3000); setCloud('ok'); } catch (err) { setCloud('error', err.message); } })();
      break;
    }
    case 'tip-close': { (s.tips ||= {})[el.dataset.k] = 1; app.ui.tipOpen = null; app.save(); render(); break; }
    case 'tip-open': { app.ui.tipOpen = el.dataset.k; render(); break; }
    case 'rewind': {
      const r0 = s.roster[el.dataset.slug];
      if (!r0 || r0.lv <= 1) break;
      const rw = Math.max(0, Math.floor(Number(s.vouchers?.rewind) || 0));
      const ask = rw > 0
        ? `用一张免费回溯券把 ${d.bySlug[el.dataset.slug].zh} 回溯到 1 级？（还剩 ${rw} 张，不花银芯）升级和突破的金币、银芯全部返还，叠位不变。`
        : `花 100 银芯把 ${d.bySlug[el.dataset.slug].zh} 回溯到 1 级？升级和突破的金币、银芯全部返还，叠位不变。`;
      if (!confirm(ask)) break;
      const r = rewindLevel(s, el.dataset.slug);
      if (r) { sound.play('lvup'); toast(r.free ? `回溯到 1 级：用掉 1 张回溯券（剩 ${rw - 1} 张），金币+${fmt(r.refund)}` : `回溯到 1 级：银芯-${r.cost}${r.refundCores ? ` +${r.refundCores}` : ''} 金币+${fmt(r.refund)}`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('回溯券用完了，银芯也不够（回溯要 100 银芯）');
      break;
    }
    case 'law': {
      // 最终法则：超限满 99 之后真正无上限的成长，连续最多 10 级
      let k = 0, g = 0, c = 0;
      for (let i = 0, n = Math.max(1, Math.min(10, Number(el.dataset.n) || 1)); i < n; i++) { const x = lawUp(s, el.dataset.slug); if (!x) break; k++; g += x.gold; c += x.cores; }
      if (k) { sound.play('lvup'); toast(`最终法则 +${k}（金币 -${fmt(g)} 银芯 -${c}）`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('金币或银芯不足');
      break;
    }
    case 'od': {
      // 超限：叠满 99 后的无限成长，连续最多 10 级，钱不够就停
      let k = 0, g = 0, c = 0;
      for (let i = 0, n = Math.max(1, Math.min(10, Number(el.dataset.n) || 1)); i < n; i++) { const x = overdriveUp(s, el.dataset.slug); if (!x) break; k++; g += x.gold; c += x.cores; }
      if (k) { sound.play('lvup'); toast(`超限 +${k}（金币 -${fmt(g)} 银芯 -${c}）`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('金币或银芯不足');
      break;
    }
    case 'awaken': {
      // data-n：连续叠位（最多 10 次），银芯不够或叠满就停
      let c = 0, k = 0;
      for (let i = 0, n = Math.max(1, Math.min(10, Number(el.dataset.n) || 1)); i < n; i++) { const x = awakenUp(s, el.dataset.slug); if (!x) break; c += x; k++; }
      if (c) { sound.play('lvup'); toast(`叠位 +${k}（银芯 -${c}）`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('银芯不足');
      break;
    }
    case 'weekly-tier': {
      // 只是切到哪一层看/打：层没开就不让切（按钮那边也 disabled 了，这里再挡一次）
      const n = +el.dataset.n || 1;
      if (!weeklyOpen(s, n)) { toast(`先在第 ${n - 1} 层打够伤害才开这一层`); break; }
      weeklyState(s).tier = n; app.save(); render(); break;
    }
    case 'weekly-go': {
      const tier = weeklyState(s).tier || 1;
      const r = withLoadout(s, squadKeyFor(s, 'weekly'), () => doWeekly(s, d, teamSlugsFor(s, 'weekly'), tier));
      if (!r) break;
      app.save(); render(); sound.play(r.win ? 'win' : 'lose');
      // 先看过程再出结算；设置里选了「跳过」就直接弹结算
      watchOrSkip(replayOf(r, { title: `周 Boss · ${r.boss.zh}（${r.tier.zh}）`, sub: `限 ${r.roundLimit} 回合 · 比这一段时间的伤害`, kw: d.kw }),
        () => P3.weeklyResultModal(app, r));
      break;
    }
    case 'weekly-claim-all': {
      const rs = claimAllWeekly(s, d, weeklyState(s).tier || 1);
      if (rs.length) {
        sound.play('ach');
        const sum = (k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
        toast(`领取 ${rs.length} 档：召唤券+${sum('tickets')} 银芯+${sum('cores')} 金币+${sum('gold')}${rs.some((r) => r.items.length) ? ` 装备+${rs.reduce((a, r) => a + r.items.length, 0)}` : ''}`);
        const ods = rs.flatMap((r) => r.orders || []);
        if (ods.length) P.showOrders(app, ods);
        rerender();
      }
      break;
    }
    case 'weekly-claim': { const r = claimWeekly(s, d, +el.dataset.i, weeklyState(s).tier || 1); if (r) { sound.play('ach'); toast(`领取成功：召唤券+${r.tickets} 金币+${r.gold}${r.items.length ? ' 装备+1' : ''}${r.orders?.length ? ' 钥令+1' : ''}`); if (r.orders?.length) P.showOrders(app, r.orders); rerender(); } break; }
    case 'rt-go': case 'rt-auto': {
      const out = [];
      const realm = el.dataset.realm;
      const slugs = teamSlugsFor(s, rtModeOf(realm));   // 四座塔各用各的编队
      const rtKey = squadKeyFor(s, rtModeOf(realm));
      for (let i = 0; i < (a === 'rt-auto' ? 10 : 1); i++) { const r = withLoadout(s, rtKey, () => doRTower(s, d, realm, slugs)); if (!r || r.done) { if (r?.done) toast(`${TOWER_NAME[realm]}已经登顶`); break; } out.push(r); if (!r.win) break; }
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
      const fight = withLoadout(s, squadKeyFor(s, 'arena'), () => fightArena(s, d, entry, teamSlugsFor(s, 'arena')));
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
      const fight = withLoadout(s, squadKeyFor(s, 'arena'), () => fightFriend(s, d, f, teamSlugsFor(s, 'arena')));
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
    case 'ult-mode': setUltMode(s, el.dataset.k); app.save(); rerender(); if (s.strategy.ult === 'order') toast('按顺序开大：用下面的 ↑ ↓ 排先后，排在前面的还攒着大招没放时，后面的会先等一等', 4500); break;
    case 'ult-order': moveUltOrder(s, el.dataset.slug, +el.dataset.dir); app.save(); rerender(); break;
    case 'pick-relic': {
      const i = +el.dataset.i;
      P.pickItem(app, 'relic', '选择造物', (uid) => { s.gear.relics = s.gear.relics.map((x) => (x === uid ? null : x)); s.gear.relics[i] = uid || null; rerender(); });
      break;
    }
    // 队伍页 / 编队编辑器里的造物「详情」：原地强化、精炼，数字跟着变
    // 这里传 {} 是「主线上下文」：编队编辑器会在自己的监听里另开一层并带上草稿上下文，
    // 强化 / 精炼后重开的那一层则不传 opts，沿用上一次的上下文（否则编队里的换件又会打到主线）
    case 'relic-detail': P.relicModal(app, el.dataset.uid, {}); break;
    case 'relic-up': {
      const uid = el.dataset.uid;
      if (enhanceItem(s, uid)) { app.save(); rerender(); P.relicModal(app, uid); } else toast('金币不够');
      break;
    }
    case 'relic-refine': {
      const uid = el.dataset.uid;
      if (refineItem(s, uid)) { sound.play('lvup'); app.save(); rerender(); P.relicModal(app, uid); } else toast('银芯不够');
      break;
    }
    case 'relic-swap': {
      const i = +el.dataset.i;
      P.pickItem(app, 'relic', '选择造物', (uid) => {
        s.gear.relics = s.gear.relics.map((x) => (x === uid ? null : x)); s.gear.relics[i] = uid || null;
        app.save(); rerender();
      });
      break;
    }
    case 'equip-slot': {
      const { slug, kind } = el.dataset;
      P.pickItem(app, kind, kind === 'wheel' ? '选择命轮' : '选择密契', (uid) => { if (uid) equipItem(s, d, slug, uid); else { const e2 = s.gear.equip[slug] || {}; unequipItem(s, e2[kind === 'wheel' ? 'wheel' : 'cov']); } app.save(); P.detailModal(app, slug); render(); });
      break;
    }
    case 'gear-tab': app.ui.gearTab = el.dataset.k; app.ui.gearLimit = 60; render(); break;
    case 'gear-affix': {
      const f = (app.ui.gearAffix ||= { wheel: '', covenant: '', relic: '' });
      const k = app.ui.gearTab || 'wheel';
      f[k] = f[k] === el.dataset.affix ? '' : el.dataset.affix;   // 再点一次同一个词条 = 取消筛选
      app.ui.gearLimit = 60; render(); break;
    }
    case 'gear-more': app.ui.gearLimit = (app.ui.gearLimit || 60) + 60; render(); break;
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
    case 'gear-rewind': {
      const it = s.gear.items[el.dataset.uid]; if (!it) break;
      const p = gearRewindPlan(it);
      const rw = Math.max(0, Math.floor(Number(s.vouchers?.rewind) || 0));
      const ask = rw > 0
        ? `用一张免费回溯券回溯这件装备？（还剩 ${rw} 张）强化 Lv${p.lv}、精炼 +${p.rf} 倒回 0，返还 金币 ${fmt(p.refund)}${p.refundCores ? ` + 银芯 ${p.refundCores}` : ''}。`
        : `花 ${p.cost} 银芯回溯这件装备？强化 Lv${p.lv}、精炼 +${p.rf} 倒回 0，返还 金币 ${fmt(p.refund)}${p.refundCores ? ` + 银芯 ${p.refundCores}` : ''}。`;
      if (!confirm(ask)) break;
      const r = rewindGear(s, el.dataset.uid);
      if (r) { sound.play('lvup'); toast(`回溯完成：金币+${fmt(r.refund)}${r.refundCores ? ` 银芯+${r.refundCores}` : ''}（${r.free ? `用掉 1 张回溯券，剩 ${rw - 1} 张` : `花了 ${r.cost} 银芯`}）`); app.save(); rerender(); if (document.querySelector('.modal [data-act="relic-up"]')) P.relicModal(app, el.dataset.uid); }
      else toast('回溯券用完了，银芯也不够（回溯要 ' + p.cost + ' 银芯）');
      break;
    }
    case 'gear-up': enhanceItem(s, el.dataset.uid); rerender(); break;
    case 'gear-upall': {   // 只强化主线编队；要别的编队走「选择队伍…」
      const r = enhanceAllEquipped(s);
      if (r.n) { sound.play('gold'); toast(`一键强化主线编队：${r.items} 件装备共升了 ${r.n} 级，花了 ${fmt(r.spent)} 金币`); } else toast(r.total ? '金币不够升下一级，或者主线编队的装备都满级了' : '主线编队还没有穿装备');
      rerender(); break;
    }
    case 'gear-up-pick': P.enhanceModal(app); break;
    case 'gear-up-run': {
      const sel = (app.ui.eh || ['cur']);
      const r = enhanceAllEquipped(s, { scopes: sel });
      closeModal();
      if (r.n) { sound.play('gold'); toast(`一键强化：${r.items} 件装备共升了 ${r.n} 级，花了 ${fmt(r.spent)} 金币`); } else toast('金币不够升下一级，或者所选队伍的装备都满级了');
      rerender(); break;
    }
    case 'gear-dis': {
      const c0 = s.cores, v = dismantle(s, d, el.dataset.uid);
      if (v) {
        const c = s.cores - c0; toast(`分解获得 ${v} 金币${c ? ` + ${c} 银芯` : ''}`);
        el.closest('.item')?.remove?.();
        app.refreshTop(); app.saveSoon();
        if (!document.querySelector('#gearlist > *')) render();
      }
      break;
    }
    case 'gear-equip': {
      const it = s.gear.items[el.dataset.uid];
      if (it.kind === 'relic') { if (isEquipped(s, it.uid)) unequipItem(s, it.uid); else equipItem(s, d, null, it.uid); rerender(); break; }
      P.pickAwakener(app, `装备给…`, (slug) => { equipItem(s, d, slug, it.uid); rerender(); toast('已装备'); });
      break;
    }
    case 'pull': { const out = summon(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(gachaSound(out)); P.showPulls(app, out); } break; }
    case 'epull': {
      const n = +el.dataset.n, before = { ...(s.gear.dex || {}) }, gold0 = s.gold;
      const out = equipPull(s, d, n);
      if (out) { app.save(); render(); sound.play('summon'); if (n >= 50) P.showItemsSummary(app, out, before, gold0 - s.gold); else P.showItems(app, out); }
      break;
    }
    case 'dm-open': P.dismantleModal(app); break;
    case 'dm-kind': case 'dm-rar': {
      const f = P.dmFilter(app), key = a === 'dm-kind' ? 'kinds' : 'rarities', k = el.dataset.k;
      f[key] = f[key].includes(k) ? f[key].filter((x) => x !== k) : [...f[key], k];
      closeModal(); P.dismantleModal(app); break;
    }
    case 'dm-lv': { const v = el.dataset.k; P.dmFilter(app).maxLv = v === '' ? null : +v; closeModal(); P.dismantleModal(app); break; }
    case 'dm-run': {
      const f = P.dmFilter(app), r = dismantleMatching(s, d, f);
      closeModal(); app.save(); render();
      if (r.n) { sound.play('gold'); toast(`分解了 ${r.n} 件：金币 +${fmt(r.gold)}${r.cores ? `，银芯 +${r.cores}` : ''}`, 3200); } else toast('没有符合条件的装备');
      break;
    }
    case 'gear-dex': closeModal(); P.gearDexModal(app); break;
    case 'dex-tab': app.ui.dexTab = el.dataset.k; closeModal(); P.gearDexModal(app); break;
    case 'dex-rar': app.ui.dexRar = el.dataset.k; closeModal(); P.gearDexModal(app); break;
    case 'dex-only': app.ui.dexOnly = el.dataset.k; closeModal(); P.gearDexModal(app); break;
    case 'rift-go': {
      const r = doRift(s, d);
      if (!r) break;
      if (r.done) { toast('本期已经打穿 100 层了，等下期刷新'); break; }
      app.save(); render(); sound.play(r.reached ? 'win' : 'lose');
      // 一层五场，只回放「决定这一层」的那场（失败的那队，或全胜时的第五队）
      const rp = r.replay ? replayOf(r.replay, {
        title: `融灾禁区 · 第 ${r.replay.floor} 层 · ${r.replay.zh}`,
        sub: `本次通过 ${r.reached} 层 · ${r.replay.win ? '这一场赢了' : '这一场没顶住'}`,
        note: '一层五场，这里只回放决胜的那一场', kw: d.kw,
      }) : null;
      watchOrSkip(rp, () => P3.riftResultModal(app, r));
      break;
    }
    case 'tower-go': {
      const r = withLoadout(s, squadKeyFor(s, 'tower'), () => doTower(s, d, { slugs: teamSlugsFor(s, 'tower') }));
      if (!r) break;
      app.save(); render(); sound.play(r.reached > 0 ? 'win' : 'lose');
      // 塔能连打几十层，只回放决出胜负的那一层
      const rp = r.replay ? replayOf(r.replay, { title: `倒悬回廊 · 第 ${r.replay.floor} 层`, sub: `本次到达第 ${r.reached} 层`, note: '只回放最后一战', kw: d.kw }) : null;
      watchOrSkip(rp, () => P2.towerResultModal(app, r));
      break;
    }
    case 'trial-go': {
      const r = withLoadout(s, squadKeyFor(s, 'trial'), () => doTrial(s, d, el.dataset.id, +el.dataset.i, teamSlugsFor(s, 'trial')));
      if (!r) break;
      app.save(); render(); sound.play(r.win ? 'win' : 'lose');
      watchOrSkip(replayOf(r, { title: `融灾试炼 · ${r.trial.name} ${r.th.k}`, kw: d.kw }), () => P2.trialResultModal(app, r));
      break;
    }
    case 'ach-claim': { const r = claimAchievement(s, el.dataset.id, app.data); if (r) { sound.play('ach'); toast('成就奖励已领取'); rerender(); } break; }
    case 'cpull': { const out = summonCores(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(gachaSound(out)); P.showPulls(app, out); } break; }
    case 'cepull': { const out = equipPullCores(s, d, 1); if (out) { app.save(); render(); sound.play('summon'); P.showItems(app, out); } break; }
    case 'gold-ticket': { const r = buyTicketWithGold(s); if (r) { sound.play('gold'); toast(`换到 1 张召唤券（今日还可换 ${r.left} 张）`); rerender(); } break; }
    case 'shop-buy': { const r = shopBuy(s, d, el.dataset.id); if (r) { sound.play('gold'); toast(`已购买：${SHOP.find((x) => x.id === el.dataset.id).zh}`); if (r.items.length) P.showItems(app, r.items); if (r.orders?.length) P.showOrders(app, r.orders); rerender(); } break; }
    case 'gear-refine': if (refineItem(s, el.dataset.uid)) { sound.play('lvup'); rerender(); } break;
    case 'welcome-claim': { const r = claimWelcome(s, d, portalUser()); if (r) { sound.play('summonSSR'); toast(`注册福利已到账：银芯+${r.cores} 召唤券+${r.tickets} 金币+${r.gold}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'welcome-7': { const r = claimSeven(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`新手福利：银芯+${r.cores} 召唤券+${r.tickets}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    case 'sign-today': { const r = signToday(s, d); if (r) { sound.play('ach'); toast(`签到成功：${rewardLine(r)}`); if (r.items.length) P.showItems(app, r.items); rerender(); checkSigninGifts(); } break; }
    case 'sign-back': { const r = backfill(s, d, +el.dataset.d); if (r) { sound.play('gold'); toast(`补签成功：${rewardLine(r)}`); rerender(); checkSigninGifts(); } break; }
    case 'sign-cum': { const r = claimCum(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`累计奖励：${rewardLine(r)}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
    // ---- 联动活动「星辉直播间」 ----
    case 'event-daily': {
      const r = claimDaily(s, el.dataset.id);
      if (r) { sound.play('ach'); toast(`任务完成：人气 +${r.fame}`); rerender(); }
      break;
    }
    case 'event-mile': {
      const r = claimMile(s);
      if (r) { sound.play('gold'); toast(`推图里程碑：人气 +${r.fame}（${r.n} 档）`); rerender(); }
      break;
    }
    case 'event-summon': {
      const slug = el.dataset.slug;
      const r = redeemGuest(s, slug);
      if (r) {
        app.save();
        sound.play(r.isNew ? 'summonSSR' : 'lvup');
        toast(r.isNew
          ? `🎉 联名嘉宾「${d.bySlug[slug].zh}」加入队伍`
          : r.full ? `「${d.bySlug[slug].zh}」的叠位已经满了` : `「${d.bySlug[slug].zh}」叠位 +1（现在 ${r.star} 层）`, 2800);
        if (r.isNew) P.detailModal(app, slug);
        else render();
      } else toast('征召券不够，或者人气还没到这位的门槛');
      break;
    }
    case 'event-tier': {   // 老按钮，兼容一下
      const r = redeemGuest(s, el.dataset.slug);
      if (r) { app.save(); sound.play('summonSSR'); toast(`🎉 联名嘉宾「${d.bySlug[el.dataset.slug].zh}」加入队伍`); render(); }
      break;
    }
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
      try { const j = JSON.parse($('#imp').value); if (!j.roster) throw new Error('bad'); app.state = migrate(j, d); app.state.rev = Math.max(app.state.rev || 0, store.read()?.rev || 0) + 1; app.save(); closeModal(); app.bv.app = app; app.bv.restart(); render(); toast('导入成功'); } catch { toast('存档格式不正确'); }
      break;
    }
    case 'reset': if (confirm('确定重置所有进度吗？此操作不可撤销。')) { app.noSave = true; store.clear().then(() => location.reload()); } break;
  }
}

boot().catch((err) => { document.body.insertAdjacentHTML('beforeend', `<pre class="fatal">加载失败：${esc(err.message)}</pre>`); console.error(err); });
