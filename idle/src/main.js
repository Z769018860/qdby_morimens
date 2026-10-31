import './ui/orient.js';   // 横屏 / 竖屏开关（顶栏那颗方向按钮）
import {
  indexData, newState, migrate, offlineReport, claimOffline, claimGifts, levelUp, levelUpMax, setTeam, autoTeam, autoLoadout, setPreset, setUltMode, moveUltOrder,
  equipItem, unequipItem, enhanceItem, dismantle, summon, equipPull, isEquipped, summonCores, equipPullCores, refineItem,
  dismantleCores, breakThrough, awakenUp, overdriveUp, lawUp, upgradeOrder, rewindLevel,
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
import { saveSquad, loadSquad, clearSquad, setSquadPick, teamSlugsFor, SQUAD_ZH, rtModeOf, squadKeyFor, withLoadout } from './core/squad.js';
import { watchOrSkip, replayOf, watchMode } from './ui/replay.js';
import { emptyGacha } from './core/gacha.js';
import { fxMode } from './ui/fx.js';
import { settleMode } from './ui/report.js';
import { doTower, doTrial } from './core/challenge.js';
import { doRift } from './core/rift.js';
import { claimAchievement, claimAllAchievements } from './core/achievements.js';
import { signToday, backfill, claimCum } from './core/signin.js';
import { buy as shopBuy, SHOP } from './core/shop.js';
import { signinPage, eventPage } from './ui/pages4.js';
import { claimDaily, redeemGuest, claimMile } from './core/event.js';
import { syncSigninGifts } from './core/creators.js';
import { claimWelcome, claimSeven, portalUser, welcomeStatus } from './core/welcome.js';
import { startGuide } from './ui/guide.js';
import * as Cloud from './core/cloud.js';
import { readWallet, writeWallet, reconcile, WALLET_KEY } from './core/wallet.js';
import { $, $$, fmt, esc, store, askPersist, toast, closeModal, openModal, modalEl, showKwPop } from './ui/util.js';

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
  { k: 'challenge', zh: '挑战', icon: ICON.challenge, tabs: [['challenge', '无限塔'], ['rift', '融灾禁区'], ['weekly', '周Boss'], ['rtower', '属性塔'], ['arena', '竞技场']] },
  { k: 'more', zh: '更多', icon: ICON.more, tabs: [['signin', '签到'], ['event', '联动'], ['codex', '图鉴'], ['ach', '成就'], ['settings', '设置']] },
];

/* 每个页面用一张典藏室（原作 CG 壁纸）当底，压暗后铺在内容后面。
   同一组内换个页面也换背景，切换底部主导航时观感差别最明显。
   hall-01..12 是早期的一批，13 以后是 tools/build_bg.py 从典藏室重新压的一批。 */
const BG = {
  battle: '17', team: '13', roster: '14', gear: '15', orders: '16', summon: '18',
  challenge: '19', weekly: '20', rtower: '21', arena: '22', signin: '23', codex: '24', ach: '25', settings: '26', rift: '33',
  event: '34',
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
  noSave: false,                     // 重置 / 导入过程中不能再写盘（beforeunload 会把旧状态写回去）
  save() {
    if (this.noSave || !this.state) return;
    walletSync();
    if (!this.offlinePending) this.state.lastSeen = Date.now();
    this.state.rev = (this.state.rev || 0) + 1;
    const ok = store.write(this.state);
    // 浏览器存不下（配额满 / 无痕）：进度只在 IndexedDB 镜像里，提示一次，让玩家去导出
    cloudSoon();
    if (!ok && !this.warnedSave) { this.warnedSave = true; toast('⚠ 浏览器拒绝保存进度（存储空间满或无痕模式），建议到「设置」导出存档备份', 6000); }
  },
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
  let hadSave = !!saved;
  if (Cloud.account() && Cloud.config().auto) {
    app.booting = true;
    const before = app.state;
    try { await Promise.race([cloudRun('boot'), new Promise((r) => setTimeout(r, 8000))]); } catch { /* 离线 / 没登录：按本机结算 */ }
    // 有冲突框：等玩家选完（选哪份都要在结算之前定下来），最多等 5 分钟
    for (let i = 0; i < 1200 && modalEl(); i++) await new Promise((r) => setTimeout(r, 250));
    app.booting = false;
    if (app.bootSeen) { app.state.lastSeen = app.bootSeen; app.bootSeen = 0; }
    if (app.state !== before) hadSave = true;      // 新设备：本机原来是空的，存档是从云端拉的
  }
  const rep = hadSave ? offlineReport(app.state, app.data) : null;
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
    app.offlinePending = true;
    P.offlineModal(app, rep, () => { app.offlinePending = false; claimOffline(app.state, rep); app.save(); app.refreshTop(); toast('已领取离线收益'); app.bv.start(); maybeGuide(); });
  } else { claimOffline(app.state, rep || null); app.bv.start(); maybeGuide(); }
  // 累计签到送的那几位：达标就自动进包（老存档首次进游戏也会补发）
  checkSigninGifts();
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
    const got = claimGifts(app.state, app.data, items.filter((g) => Array.isArray(g.awk) && g.awk.length));
    if (!got.length) return;
    app.save(); render(); app.refreshTop();
    const names = got.map((g) => (g.isNew ? `${g.zh}（新）` : `${g.zh} 叠位+1`)).join('、');
    toast(`收到站长赠礼：${names}`, 5000);
  } catch { /* 没网 / 没登录：下次进游戏再领 */ }
}

/* ---------- 云端存档 ----------
   登录了本站账号就自动同步整份存档（core/cloud.js）。状态放在 app.cloud，设置页读它显示。 */
app.cloud = { status: 'idle', at: 0, err: '', busy: false, hold: false };
let cloudTimer = 0;
const CLOUD_GAP = 25000;     // 本机改动后，最多隔这么久推一次
function cloudSoon() {
  if (!Cloud.config().auto || app.cloud.hold || cloudTimer || !Cloud.account()) return;
  cloudTimer = setTimeout(() => { cloudTimer = 0; cloudPush(false); }, CLOUD_GAP);
}
function setCloud(status, err = '') { app.cloud.status = status; app.cloud.err = err; if (status === 'ok') app.cloud.at = Date.now(); if (app.tab === 'settings') render(); }

// 把云端那份存档套到本机：lastSeen 重置为现在（这段时间已经在另一台设备上结算过，不重复发离线收益）
function applyCloudSave(save) {
  const doc = store.parse(save.data);
  if (!doc || !doc.roster) throw new Error('bad_cloud_save');
  app.state = migrate(doc, app.data);
  // 启动时拉到的存档保留它自己的 lastSeen（从那之后到现在就是离线时间，随后按它结算）；
  // 游戏运行中途拉到的才重置成现在（这段时间已经在另一台设备上过了）
  app.state.lastSeen = app.booting ? (Number(doc.lastSeen) || Date.now()) : Date.now();
  if (app.booting) app.bootSeen = app.state.lastSeen;      // 启动阶段中间若有谁调了 save()，lastSeen 会被冲成现在：记下来，结算前还原
  app.state.rev = Math.max(app.state.rev || 0, 0) + 1;
  if (!app.booting) app.offlinePending = false;
  store.write(app.state);
  walletSync();
  Cloud.markSynced(app.state, save.ver);
  if (app.bv) { app.bv.app = app; app.bv.restart?.(); }
  if (app.root && !app.booting) { render(); app.refreshTop(); }
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
  } catch (e) { setCloud('error', e.message); }
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
      const save = await Cloud.fetchSave();
      applyCloudSave(save);
      toast('已从云端同步最新进度', 3200);
      setCloud('ok');
    } else if (act === 'same') {
      // 本机和云端内容一样：只把版本号对上，不打扰玩家
      Cloud.markSynced(app.state, cm.ver); setCloud('ok');
    } else if (act === 'conflict') {
      // 弹框之前再核一遍：云端老存档的摘要里没有哈希，取整份下来对一下，一样就别问了
      let same = false;
      try {
        const doc = store.parse((await Cloud.fetchSave()).data);
        same = !!doc && Cloud.contentHash(migrate(doc, app.data)) === Cloud.contentHash(app.state);
      } catch { same = false; }
      if (same) { Cloud.markSynced(app.state, cm.ver); setCloud('ok'); }
      else { cloudConflict(cm); setCloud('conflict'); }
    } else {
      if (cm) Cloud.markSynced(app.state, cm.ver);
      setCloud('ok');
    }
  } catch (e) {
    setCloud(e.message === 'need_login' ? 'nologin' : 'error', e.message);
  } finally { app.cloud.busy = false; if (app.tab === 'settings') render(); }
}

// 两边都有进度：把两份的关键数字摆出来，让玩家选
function cloudConflict(cm) {
  const s = app.state, mine = Cloud.metaOf(s), c = cm?.meta || {};
  const t = (ms) => (ms ? new Date(ms).toLocaleString() : '—');
  const col = (title, m, at) => `<div class="cfcol"><b>${title}</b><p>最高通关 <b>${m.maxStage ?? '—'}</b> 关</p><p>唤醒体 <b>${m.roster ?? '—'}</b> 个</p><p>游玩 <b>${Math.round((m.play || 0) / 60)}</b> 分钟</p><p class="dim">最后保存 ${t(at)}</p></div>`;
  const m = openModal(`<h3>本机和云端的进度不一样</h3>
    <p class="hint">这个账号在云端有一份存档，和这台设备上的不同。选一份留下，<b>另一份会被覆盖</b>。</p>
    <div class="cfrow">${col('本机', mine, mine.lastSeen)}${col('云端', c, cm?.at)}</div>
    <div class="row"><button class="btn gold" data-cf="cloud">用云端的</button><button class="btn" data-cf="local">用本机的（覆盖云端）</button></div>
    <div class="row"><button class="btn sm" data-cf="later">先不处理</button></div>`, 'wide');
  m.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-cf]'); if (!b) return;
    const k = b.dataset.cf;
    if (k === 'later') { app.cloud.hold = true; closeModal(); setCloud('hold'); return; }
    closeModal();
    try {
      if (k === 'cloud') { applyCloudSave(await Cloud.fetchSave()); toast('已换成云端的进度', 3000); }
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

function onVisibility() {
  if (document.hidden) { app.bv.stop(); app.save(); cloudPush(true); return; }
  setTimeout(() => cloudRun('auto'), 1200);
  // 上一份离线收益还挂在弹窗里没领，就别再算第二份（lastSeen 没动，会把同一段时间算两遍）
  if (app.offlinePending) return;
  // 这段时间别的窗口 / 标签页如果存过更新的进度，就用它——否则这个旧窗口的内存状态会把新进度覆盖掉（看起来像「进度回档」）
  adoptNewerDisk();
  const rep = offlineReport(app.state, app.data);
  if (rep && (rep.gold || rep.tickets)) {
    app.offlinePending = true;
    P.offlineModal(app, rep, () => { app.offlinePending = false; claimOffline(app.state, rep); app.save(); app.refreshTop(); app.bv.start(); });
  }
  else { claimOffline(app.state, rep || null); app.bv.start(); }
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
  const html = '<h2>词条说明</h2><p class="hint">点击词条查看完整说明；包括战斗状态、技能机制与界域。</p>' +
    '<div class="idle-glossary">' + entries.map(([id, k]) =>
      '<button type="button" class="idle-glossary-item" data-kw="' + esc(id) + '">' + esc(k.n) + '</button>'
    ).join('') + '</div>';
  openModal(html, 'glossary-modal');
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
  const f = { team: P.teamPage, roster: P.rosterPage, gear: P.gearPage, orders: P.ordersPage, summon: P.summonPage, settings: P.settingsPage, challenge: P2.challengePage, codex: codexPage, signin: signinPage, weekly: P3.weeklyPage, rtower: P3.rtowerPage, arena: P3.arenaPage, rift: P3.riftPage, ach: P2.achievementPage, event: eventPage }[app.tab];
  if (f) { const y = window.scrollY; $('#view').innerHTML = f(app); window.scrollTo(0, y); }
  app.refreshTop();
}
const rewardLine = (r) => `召唤券+${r.tickets} 银芯+${r.cores} 金币+${r.gold}`;
const rerender = () => { app.save(); render(); };

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
      (async () => { try { const save = await Cloud.fetchSave(); if (!save) { toast('云端还没有存档'); return; } applyCloudSave(save); toast('已用云端存档覆盖本机', 3000); setCloud('ok'); } catch (err) { setCloud('error', err.message); } })();
      break;
    }
    case 'tip-close': { (s.tips ||= {})[el.dataset.k] = 1; app.ui.tipOpen = null; app.save(); render(); break; }
    case 'tip-open': { app.ui.tipOpen = el.dataset.k; render(); break; }
    case 'rewind': {
      const r0 = s.roster[el.dataset.slug];
      if (!r0 || r0.lv <= 1) break;
      if (!confirm(`花 100 银芯把 ${d.bySlug[el.dataset.slug].zh} 回溯到 1 级？升级和突破的金币、银芯全部返还，叠位不变。`)) break;
      const r = rewindLevel(s, el.dataset.slug);
      if (r) { sound.play('lvup'); toast(`回溯到 1 级：银芯-${r.cost}${r.refundCores ? ` +${r.refundCores}` : ''} 金币+${fmt(r.refund)}`); app.save(); P.detailModal(app, el.dataset.slug); render(); }
      else toast('银芯不足（回溯要 100 银芯）');
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
    case 'weekly-go': {
      const r = withLoadout(s, squadKeyFor(s, 'weekly'), () => doWeekly(s, d, teamSlugsFor(s, 'weekly')));
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
      const rtKey = squadKeyFor(s, rtModeOf(realm));
      for (let i = 0; i < (a === 'rt-auto' ? 10 : 1); i++) { const r = withLoadout(s, rtKey, () => doRTower(s, d, realm, slugs)); if (!r) break; out.push(r); if (!r.win) break; }
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
    case 'relic-detail': P.relicModal(app, el.dataset.uid); break;
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
