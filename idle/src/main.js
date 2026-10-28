import {
  indexData, newState, migrate, offlineReport, claimOffline, levelUp, levelUpMax, setTeam, autoTeam, setPreset,
  equipItem, unequipItem, enhanceItem, dismantle, summon, equipPull, claimDaily, isEquipped,
} from './core/game.js';
import { TEAM_SIZE } from './core/constants.js';
import { BattleView } from './ui/battleView.js';
import * as P from './ui/pages.js';
import { $, $$, fmt, esc, store, toast, closeModal, openModal } from './ui/util.js';

const TABS = [['battle', '战斗'], ['team', '队伍'], ['roster', '唤醒体'], ['gear', '装备'], ['summon', '召唤'], ['settings', '设置']];

const app = {
  ui: {}, tab: 'battle',
  save() { this.state.lastSeen = Date.now(); store.write(this.state); },
  itemName(it) { return P.itemDef(this, it).zh + (it.lv ? ` Lv${it.lv}` : ''); },
  refreshTop() {
    $('#gold').textContent = fmt(this.state.gold);
    $('#tickets').textContent = this.state.tickets;
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
  app.refreshTop();
}
function render() {
  const f = { team: P.teamPage, roster: P.rosterPage, gear: P.gearPage, summon: P.summonPage, settings: P.settingsPage }[app.tab];
  if (f) { const y = window.scrollY; $('#view').innerHTML = f(app); window.scrollTo(0, y); }
  app.refreshTop();
}
const rerender = () => { app.save(); render(); };

function onChange(e) {
  const t = e.target.closest('[data-filter]');
  if (!t) return;
  const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false });
  f[t.dataset.filter] = t.type === 'checkbox' ? t.checked : t.value;
  render();
}

function onAct(e) {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const s = app.state, d = app.data, a = el.dataset.act;
  switch (a) {
    case 'detail': P.detailModal(app, el.dataset.slug); break;
    case 'lvup': levelUp(s, el.dataset.slug, +el.dataset.n); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
    case 'lvmax': levelUpMax(s, el.dataset.slug); app.save(); P.detailModal(app, el.dataset.slug); render(); break;
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
    case 'pull': { const out = summon(s, d, +el.dataset.n); if (out) { app.save(); render(); P.showPulls(app, out); } break; }
    case 'epull': { const out = equipPull(s, d, +el.dataset.n); if (out) { app.save(); render(); P.showItems(app, out); } break; }
    case 'daily': { const r = claimDaily(s); if (r) toast(`领取成功：召唤券+${r.tickets} 金币+${r.gold}`); rerender(); break; }
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
