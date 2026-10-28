import {
  indexData, newState, migrate, offlineReport, claimOffline, levelUp, levelUpMax, setTeam, autoTeam, setPreset,
  equipItem, unequipItem, enhanceItem, dismantle, summon, equipPull, isEquipped, summonCores, equipPullCores, refineItem, dismantleCores,
} from './core/game.js';
import { TEAM_SIZE } from './core/constants.js';
import { BattleView } from './ui/battleView.js';
import * as P from './ui/pages.js';
import * as P2 from './ui/pages2.js';
import * as P3 from './ui/pages3.js';
import { doWeekly, claimWeekly } from './core/weekly.js';
import { doRTower } from './core/rtower.js';
import { arenaState, arenaTries, fightArena, applyArena, claimArenaDaily } from './core/arena.js';
import { localOpponents, localSettle, fightFriend } from './core/arena.js';
import { encodeCode, decodeCode } from './core/friend.js';
import { codexPage, monsterModal } from './ui/codex.js';
import { sound } from './ui/audio.js';
import { fxMode } from './ui/fx.js';
import { settleMode } from './ui/report.js';
import { doTower, doTrial } from './core/challenge.js';
import { claimAchievement, claimAllAchievements } from './core/achievements.js';
import { signToday, backfill, claimCum } from './core/signin.js';
import { buy as shopBuy, SHOP } from './core/shop.js';
import { signinPage } from './ui/pages4.js';
import { claimWelcome, claimSeven, portalUser, welcomeStatus } from './core/welcome.js';
import { $, $$, fmt, esc, store, toast, closeModal, openModal, showKwPop } from './ui/util.js';

const TABS = [['battle', '战斗'], ['team', '队伍'], ['roster', '唤醒体'], ['gear', '装备'], ['summon', '召唤'], ['challenge', '挑战'], ['signin', '签到'], ['weekly', '周Boss'], ['rtower', '属性塔'], ['arena', '竞技场'], ['codex', '图鉴'], ['ach', '成就'], ['settings', '设置']];

const app = {
  ui: {}, tab: 'battle',
  save() { this.state.lastSeen = Date.now(); store.write(this.state); },
  itemName(it) { return P.itemDef(this, it).zh + (it.lv ? ` Lv${it.lv}` : ''); },
  refreshTop() {
    $('#gold').textContent = fmt(this.state.gold);
    $('#tickets').textContent = this.state.tickets;
    $('#cores').textContent = fmt(this.state.cores || 0);
  },
};

async function boot() {
  const pack = await (await fetch('public/data/game-data.json')).json();
  app.data = indexData(pack);
  const saved = store.read();
  app.state = saved ? migrate(saved, app.data) : newState(app.data);
  app.root = $('#view');
  buildChrome();
  app.bv = new BattleView($('#battle'), app);
  app.onBattleDone = () => { if (app.tab !== 'battle') app.refreshTop(); };
  const rep = saved ? offlineReport(app.state, app.data) : null;
  show('battle');
  if (welcomeStatus(app.state, portalUser()).canClaim) setTimeout(() => toast('🎁 注册福利可领取：去「签到」页领取银芯', 4000), 1500);
  if (!app.state.tutorial) setTimeout(() => P2.tutorial(app, 0, () => { app.state.tutorial = true; app.save(); }), 300);
  if (rep && (rep.gold || rep.tickets)) {
    P.offlineModal(app, rep, () => { claimOffline(app.state, rep); app.save(); app.refreshTop(); toast('已领取离线收益'); app.bv.start(); });
  } else { claimOffline(app.state, null); app.bv.start(); }
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

function buildChrome() {
  $('#tabs').innerHTML = TABS.map(([k, z]) => `<button data-tab="${k}">${z}</button>`).join('');
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  document.body.addEventListener('click', onAct);
  document.body.addEventListener('change', onChange);
}

export function show(tab) {
  app.tab = tab;
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#battle').hidden = tab !== 'battle';
  const v = $('#view');
  v.hidden = tab === 'battle';
  if (tab !== 'battle') render();
  if (tab === 'arena') refreshArena();
  app.refreshTop();
}
function refreshArena() {
  app.ui.arena = { ...(app.ui.arena || {}), list: localOpponents(app.state, app.data) };
  if (app.tab === 'arena') render();
}
function render() {
  const f = { team: P.teamPage, roster: P.rosterPage, gear: P.gearPage, summon: P.summonPage, settings: P.settingsPage, challenge: P2.challengePage, codex: codexPage, signin: signinPage, weekly: P3.weeklyPage, rtower: P3.rtowerPage, arena: P3.arenaPage, ach: P2.achievementPage }[app.tab];
  if (f) { const y = window.scrollY; $('#view').innerHTML = f(app); window.scrollTo(0, y); }
  app.refreshTop();
}
const rewardLine = (r) => `召唤券+${r.tickets} 银芯+${r.cores} 金币+${r.gold}`;
const rerender = () => { app.save(); render(); };

function onChange(e) {
  if (e.target.matches('[data-settle]')) { settleMode.set(e.target.value); toast('结算弹窗：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-fx]')) { fxMode.set(e.target.value); toast('战斗特效：' + e.target.selectedOptions[0].textContent); return; }
  if (e.target.matches('[data-arena-name]')) { arenaState(app.state).name = e.target.value.trim().slice(0, 12) || '旅人'; app.save(); return; }
  const au = e.target.closest('[data-aud]');
  if (au) { sound.set(au.dataset.aud, au.type === 'checkbox' ? au.checked : +au.value / 100); if (au.dataset.aud === 'sfx') sound.play('hit'); return; }
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
  if (el.tagName === 'BUTTON' && !['pull', 'epull', 'ach-claim', 'tower-go', 'trial-go', 'lvup', 'lvmax', 'sign-today', 'welcome-claim', 'welcome-7', 'cpull', 'cepull', 'shop-buy', 'ach-all', 'snd-test'].includes(a)) sound.play('click');
  switch (a) {
    case 'snd-test': sound.play(el.dataset.k); break;
    case 'weekly-go': { const r = doWeekly(s, d); if (r) { app.save(); render(); sound.play('win'); P3.weeklyResultModal(app, r); } break; }
    case 'weekly-claim': { const r = claimWeekly(s, d, +el.dataset.i); if (r) { sound.play('ach'); toast(`领取成功：召唤券+${r.tickets} 金币+${r.gold}${r.items.length ? ' 装备+1' : ''}`); rerender(); } break; }
    case 'rt-go': case 'rt-auto': {
      const out = [];
      for (let i = 0; i < (a === 'rt-auto' ? 10 : 1); i++) { const r = doRTower(s, d, el.dataset.realm); if (!r) break; out.push(r); if (!r.win) break; }
      if (out.length) { app.save(); render(); sound.play(out[out.length - 1].win ? 'win' : 'lose'); P3.rtResultModal(app, out); }
      break;
    }
    case 'arena-daily': { const r = claimArenaDaily(s); if (r) { sound.play('gold'); toast(`每日排名奖励：召唤券+${r.tickets} 金币+${r.gold}`); rerender(); } break; }
    case 'arena-go': {
      const entry = app.ui.arena?.list?.find((x) => x.rank === +el.dataset.rank);
      if (!entry || arenaTries(s) <= 0) break;
      const fight = fightArena(s, d, entry);
      const rw = applyArena(s, d, fight, localSettle(s, entry, fight.win).rank);
      app.save(); sound.play(fight.win ? 'win' : 'lose');
      refreshArena();
      P3.arenaResultModal(app, fight, rw, arenaState(s).rank);
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
      const fight = fightFriend(s, d, f);
      fight.entry = { type: 'friend', name: f.name, rank: 0 };
      app.save(); sound.play(fight.win ? 'win' : 'lose');
      render();
      P3.arenaResultModal(app, fight, {}, 0);
      break;
    }
    case 'monster': monsterModal(app, el.dataset.id); break;
    case 'codex-more': app.ui.codex.more++; render(); break;
    case 'detail': P.detailModal(app, el.dataset.slug); break;
    case 'lvup': sound.play('lvup'); levelUp(s, el.dataset.slug, +el.dataset.n); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
    case 'lvmax': sound.play('lvup'); levelUpMax(s, el.dataset.slug); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
    case 'pick-slot': {
      const i = +el.dataset.i;
      P.pickAwakener(app, '选择上场唤醒体', (slug) => { const t = [...s.team]; const old = t.indexOf(slug); if (old >= 0) t[old] = t[i] || null; t[i] = slug; setTeam(s, t.filter(Boolean)); rerender(); });
      break;
    }
    case 'autoteam': autoTeam(s, d); rerender(); toast('已编成最优队伍'); break;
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
    case 'gear-up': enhanceItem(s, el.dataset.uid); rerender(); break;
    case 'gear-dis': { const v = dismantle(s, d, el.dataset.uid); if (v) toast(`分解获得 ${v} 金币`); rerender(); break; }
    case 'gear-equip': {
      const it = s.gear.items[el.dataset.uid];
      if (it.kind === 'relic') { if (isEquipped(s, it.uid)) unequipItem(s, it.uid); else equipItem(s, d, null, it.uid); rerender(); break; }
      P.pickAwakener(app, `装备给…`, (slug) => { equipItem(s, d, slug, it.uid); rerender(); toast('已装备'); });
      break;
    }
    case 'pull': { const out = summon(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(out.some((p) => ['SSR', 'Genesis'].includes(p.rarity) && p.isNew !== false) ? 'summonSSR' : 'summon'); P.showPulls(app, out); } break; }
    case 'epull': { const out = equipPull(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play('summon'); P.showItems(app, out); } break; }
    case 'tower-go': { const r = doTower(s, d); if (r) { app.save(); render(); sound.play(r.reached > 0 ? 'win' : 'lose'); P2.towerResultModal(app, r); } break; }
    case 'trial-go': { const r = doTrial(s, d, el.dataset.id, +el.dataset.i); if (r) { app.save(); render(); sound.play(r.win ? 'win' : 'lose'); P2.trialResultModal(app, r); } break; }
    case 'ach-claim': { const r = claimAchievement(s, el.dataset.id, app.data); if (r) { sound.play('ach'); toast('成就奖励已领取'); rerender(); } break; }
    case 'cpull': { const out = summonCores(s, d, +el.dataset.n); if (out) { app.save(); render(); sound.play(out.some((p) => ['SSR', 'Genesis'].includes(p.rarity)) ? 'summonSSR' : 'summon'); P.showPulls(app, out); } break; }
    case 'cepull': { const out = equipPullCores(s, d, 1); if (out) { app.save(); render(); sound.play('summon'); P.showItems(app, out); } break; }
    case 'shop-buy': { const r = shopBuy(s, d, el.dataset.id); if (r) { sound.play('gold'); toast(`已购买：${SHOP.find((x) => x.id === el.dataset.id).zh}`); if (r.items.length) P.showItems(app, r.items); rerender(); } break; }
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
