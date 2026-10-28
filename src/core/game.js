import { hash, mulberry32 } from './rng.js';
import { MAX_LV, MAX_STAR, TEAM_SIZE, RELIC_SLOTS, SAVE_VERSION, GEAR_MAX_LV } from './constants.js';
import { baseStats, lvUpCost, power } from './stats.js';
import { buildKit } from './skills.js';
import { ZERO, addBonus, wheelBonus, relicBonus, covenantBonus, gearCost, dismantleValue } from './gear.js';
import { buildEnemies, stageInfo } from './enemies.js';
import { simulate } from './battle.js';

export const BATTLE_SECONDS = 25;       // assumed wall-clock length of one farm battle (offline maths)
export const OFFLINE_CAP_HOURS = 8;
export const PULL_PITY_GENESIS = 50;
const STARTERS = ['ogier', 'lotan', 'doll', 'ramona'];

// ---------- data index ----------
export function indexData(pack) {
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const kits = {};
  const d = {
    ...pack,
    bySlug: Object.fromEntries(pack.awakeners.map((a) => [a.slug, a])),
    wheelById: by(pack.wheels), covById: by(pack.covenants), relicById: by(pack.relics),
    kit(slug) { return kits[slug] || (kits[slug] = buildKit(d.bySlug[slug])); },
  };
  return d;
}

// ---------- state ----------
export function newState(data, now = Date.now()) {
  const roster = {};
  for (const s of STARTERS) roster[s] = { lv: 1, star: 0 };
  return {
    v: SAVE_VERSION, created: now, lastSeen: now, seed: (now ^ 0x9e3779b9) >>> 0,
    gold: 600, tickets: 12, stage: 1, maxStage: 0,
    auto: true, speed: 2, skipAnim: false,
    strategy: { defend: 0.4, target: 'low', preset: 'balanced' },
    roster, team: [...STARTERS],
    gear: { items: {}, next: 1, equip: {}, relics: Array(RELIC_SLOTS).fill(null) },
    pity: { genesis: 0, ssr: 0 },
    stats: { battles: 0, wins: 0, pulls: 0, kills: 0, gold: 0 },
    daily: { day: '' }, log: [],
    tower: { best: 0, day: '', tries: 0, runs: 0 }, trials: { cleared: {} }, ach: {}, tutorial: false,
  };
}

export function migrate(s, data) {
  if (!s || typeof s !== 'object') return newState(data);
  const base = newState(data, s.created || Date.now());
  const m = { ...base, ...s, strategy: { ...base.strategy, ...s.strategy }, gear: { ...base.gear, ...s.gear }, stats: { ...base.stats, ...s.stats }, pity: { ...base.pity, ...s.pity }, tower: { ...base.tower, ...s.tower }, trials: { cleared: { ...(s.trials?.cleared || {}) } }, ach: { ...s.ach } };
  m.team = (m.team || []).filter((x) => m.roster[x] && data.bySlug[x]).slice(0, TEAM_SIZE);
  if (!m.team.length) m.team = Object.keys(m.roster).slice(0, TEAM_SIZE);
  return m;
}

// ---------- stats pipeline ----------
export function allyDef(state, data, slug, teamSlugs = state.team) {
  const a = data.bySlug[slug];
  const r = state.roster[slug];
  const st = baseStats(a, r.lv, r.star);
  const bonus = ZERO();
  const eq = state.gear.equip[slug] || {};
  const wi = eq.wheel && state.gear.items[eq.wheel];
  if (wi) addBonus(bonus, wheelBonus(data.wheelById[wi.defId], wi.lv, a));
  const ci = eq.cov && state.gear.items[eq.cov];
  if (ci) {
    const count = teamSlugs.filter((t) => { const e = state.gear.equip[t]; const it = e?.cov && state.gear.items[e.cov]; return it && it.defId === ci.defId; }).length;
    addBonus(bonus, covenantBonus(ci.defId, ci.lv, count));
  }
  for (const uid of state.gear.relics) {
    const it = uid && state.gear.items[uid];
    if (it) addBonus(bonus, relicBonus(data.relicById[it.defId], it.lv));
  }
  if (r.star >= 3) bonus.amp += 10;
  const def = {
    slug, name: a.zh, img: a.portrait, type: a.type, realm: a.realm,
    hp: Math.round(st.hp * (1 + bonus.hpPct / 100)),
    atk: Math.round(st.atk * (1 + bonus.atkPct / 100)),
    def: Math.round(st.def * (1 + bonus.defPct / 100)),
    critRate: st.critRate + bonus.critRate, critDmg: st.critDmg + bonus.critDmg, amp: st.amp + bonus.amp,
    aliGain: st.aliGain + bonus.aliGain, keyGain: st.keyGain + bonus.keyGain,
    healBonus: bonus.healBonus, shieldBonus: bonus.shieldBonus, steal: bonus.steal,
    surviveChance: Math.min(0.9, bonus.surviveChance), openAli: bonus.openAli, openKey: bonus.openKey,
    firstBoost: bonus.firstBoost, kit: data.kit(slug), goldBonus: bonus.gold,
  };
  def.power = power(def);
  return def;
}

// realm synergy: 3+ same realm in team => +8% atk/hp ; 4 => +15%
export function teamDefs(state, data, slugs = state.team) {
  const list = slugs.filter(Boolean).map((s) => allyDef(state, data, s, slugs));
  const realms = {};
  for (const d of list) realms[d.realm] = (realms[d.realm] || 0) + 1;
  const syn = Math.max(0, ...Object.values(realms));
  const k = syn >= 4 ? 0.15 : syn >= 3 ? 0.08 : 0;
  if (k) for (const d of list) { d.hp = Math.round(d.hp * (1 + k)); d.atk = Math.round(d.atk * (1 + k)); }
  const goldBonus = list.reduce((s, d) => s + d.goldBonus, 0);
  return { list, synergy: k, goldBonus, power: list.reduce((s, d) => s + power(d), 0) };
}

// ---------- rewards ----------
export const stageGold = (stage) => Math.round(18 * Math.pow(1.085, stage) + 9 * stage);
const DROP_RATE = 0.1;

export function rollItem(rng, stage, data) {
  const kinds = ['wheel', 'wheel', 'covenant', 'covenant', 'relic'];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const pool = kind === 'wheel' ? data.wheels : kind === 'covenant' ? data.covenants : data.relics;
  const boost = Math.min(0.25, stage / 200);
  const r = rng();
  const want = r < 0.04 + boost * 0.4 ? 'SSR' : r < 0.25 + boost ? 'SR' : r < 0.6 ? 'R' : 'N';
  let cand = kind === 'covenant' ? pool : pool.filter((x) => x.rarity === want);
  if (!cand.length) cand = pool.filter((x) => (x.rarity === 'SR' || x.rarity === 'SSR'));
  if (!cand.length) cand = pool;
  const def = cand[Math.floor(rng() * cand.length)];
  return { kind, defId: def.id };
}
export function addItem(state, kind, defId) {
  const uid = `g${state.gear.next++}`;
  state.gear.items[uid] = { uid, kind, defId, lv: 0 };
  return state.gear.items[uid];
}

export function battleSeed(state) { return (state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0); }

export function prepareBattle(state, data, stage = state.stage) {
  const t = teamDefs(state, data);
  const enemies = buildEnemies(stage, data.monsters);
  return { team: t, enemies, seed: battleSeed(state), allies: t.list };
}

export function runBattle(state, data, stage = state.stage) {
  const p = prepareBattle(state, data, stage);
  const res = simulate({ allies: p.allies, enemies: p.enemies, seed: p.seed, strategy: state.strategy });
  return { ...res, prep: p, stage };
}

// apply result to state; returns reward summary
export function applyResult(state, data, res) {
  const rng = mulberry32(res.prep.seed ^ 0xabcdef);
  const rw = { gold: 0, tickets: 0, items: [], firstClear: false, advanced: false };
  state.stats.battles++;
  if (res.win) {
    state.stats.wins++;
    state.stats.kills += res.kills;
    const gb = 1 + res.prep.team.goldBonus / 100;
    rw.gold = Math.round(stageGold(res.stage) * gb);
    if (res.stage > state.maxStage) {
      state.maxStage = res.stage; rw.firstClear = true;
      rw.tickets = stageInfo(res.stage).boss ? 3 : 1;
      if (stageInfo(res.stage).boss) rw.items.push(addItem(state, ...Object.values(rollItem(rng, res.stage, data))));
    }
    if (rng() < DROP_RATE * (stageInfo(res.stage).boss ? 3 : 1)) {
      const it = rollItem(rng, res.stage, data);
      rw.items.push(addItem(state, it.kind, it.defId));
    }
    state.gold += rw.gold; state.tickets += rw.tickets; state.stats.gold += rw.gold;
    const alive = res.allies.filter((a) => a.alive).length;
    rw.comfortable = alive >= 3 && res.rounds <= (stageInfo(res.stage).boss ? 20 : 14);
    if (state.auto && res.stage === state.stage && rw.comfortable && state.stage <= state.maxStage) {
      state.stage = Math.min(state.maxStage + 1, state.stage + 1); rw.advanced = true;
    }
  } else if (state.stage > state.maxStage) {
    // lost on the frontier: fall back to the last cleared stage and farm there
    state.stage = Math.max(1, state.maxStage); rw.retreat = true;
  }
  return rw;
}

// ---------- offline ----------
export function offlineReport(state, data, now = Date.now()) {
  const secs = Math.max(0, (now - state.lastSeen) / 1000);
  if (secs < 60) return null;
  const capped = Math.min(secs, OFFLINE_CAP_HOURS * 3600);
  const n = Math.floor(capped / BATTLE_SECONDS);
  // estimate win rate on the stage we would be farming
  const stage = Math.max(1, Math.min(state.stage, state.maxStage || 1));
  const copy = JSON.parse(JSON.stringify(state));
  let wins = 0; const probes = 6;
  for (let i = 0; i < probes; i++) if (runBattle(copy, data, stage).win) wins++;
  const rate = wins / probes;
  const w = Math.round(n * rate);
  const t = teamDefs(state, data);
  const gold = Math.round(w * stageGold(stage) * (1 + t.goldBonus / 100));
  const tickets = Math.floor(w / 40);
  const rng = mulberry32(hash(String(state.lastSeen)));
  const drops = [];
  const nd = Math.min(25, Math.round(w * DROP_RATE));
  for (let i = 0; i < nd; i++) { const it = rollItem(rng, stage, data); drops.push(it); }
  return { secs, capped, battles: n, wins: w, rate, stage, gold, tickets, drops };
}
export function claimOffline(state, rep, now = Date.now()) {
  if (rep) {
    state.gold += rep.gold; state.tickets += rep.tickets;
    for (const d of rep.drops) addItem(state, d.kind, d.defId);
    state.stats.gold += rep.gold;
  }
  state.lastSeen = now;
}

// ---------- progression ----------
export function levelUp(state, slug, times = 1) {
  const r = state.roster[slug]; let n = 0;
  while (n < times && r.lv < MAX_LV && state.gold >= lvUpCost(r.lv)) { state.gold -= lvUpCost(r.lv); r.lv++; n++; }
  return n;
}
export function levelUpMax(state, slug) { return levelUp(state, slug, MAX_LV); }

export function setTeam(state, slots) {
  const seen = new Set();
  state.team = slots.filter((s) => s && state.roster[s] && !seen.has(s) && seen.add(s)).slice(0, TEAM_SIZE);
}
export function autoTeam(state, data) {
  const ranked = Object.keys(state.roster).map((s) => ({ s, p: allyDef(state, data, s, [s]).power, t: data.bySlug[s].type }))
    .sort((a, b) => b.p - a.p);
  const team = [];
  const need = ['WARDEN', 'CHORUS'];
  for (const t of need) { const c = ranked.find((x) => x.t === t && !team.includes(x.s)); if (c) team.push(c.s); }
  for (const x of ranked) if (team.length < TEAM_SIZE && !team.includes(x.s)) team.push(x.s);
  // front: warden, dps..., back: support
  const ord = { WARDEN: 0, ASSAULT: 1, CHORUS: 2 };
  team.sort((a, b) => ord[data.bySlug[a].type] - ord[data.bySlug[b].type]);
  state.team = team.slice(0, TEAM_SIZE);
}

export const PRESETS = {
  balanced: { zh: '均衡', defend: 0.4, target: 'low' },
  aggressive: { zh: '强攻', defend: 0.2, target: 'low' },
  defensive: { zh: '稳守', defend: 0.65, target: 'first' },
  focus: { zh: '集火强敌', defend: 0.4, target: 'atk' },
};
export function setPreset(state, key) { const p = PRESETS[key]; state.strategy = { preset: key, defend: p.defend, target: p.target }; }

// ---------- gear ops ----------
export function equipItem(state, data, slug, uid) {
  const it = state.gear.items[uid]; if (!it) return false;
  if (it.kind === 'relic') {
    if (state.gear.relics.includes(uid)) return true;
    const i = state.gear.relics.indexOf(null);
    state.gear.relics[i < 0 ? 0 : i] = uid; return true;
  }
  const key = it.kind === 'wheel' ? 'wheel' : 'cov';
  // unequip from previous holder
  for (const [s, e] of Object.entries(state.gear.equip)) if (e[key] === uid) delete e[key];
  const e = (state.gear.equip[slug] ||= {});
  e[key] = uid; return true;
}
export function unequipItem(state, uid) {
  for (const e of Object.values(state.gear.equip)) for (const k of ['wheel', 'cov']) if (e[k] === uid) delete e[k];
  state.gear.relics = state.gear.relics.map((x) => (x === uid ? null : x));
}
export const isEquipped = (state, uid) => state.gear.relics.includes(uid) || Object.values(state.gear.equip).some((e) => e.wheel === uid || e.cov === uid);
export function enhanceItem(state, uid) {
  const it = state.gear.items[uid]; if (!it || it.lv >= GEAR_MAX_LV) return false;
  const c = gearCost(it.kind, it.lv); if (state.gold < c) return false;
  state.gold -= c; it.lv++; return true;
}
export function dismantle(state, data, uid) {
  const it = state.gear.items[uid]; if (!it || isEquipped(state, uid)) return 0;
  const def = (it.kind === 'wheel' ? data.wheelById : it.kind === 'cov' || it.kind === 'covenant' ? data.covById : data.relicById)[it.defId];
  const v = dismantleValue(def?.rarity || 'SR', it.lv);
  state.gold += v; delete state.gear.items[uid]; return v;
}
export const bestOwner = (state, data, def) => null;

// ---------- gacha ----------
export function pullOnce(state, data, rng) {
  const p = state.pity;
  p.genesis++; p.ssr++;
  let rarity;
  const gRate = p.genesis >= PULL_PITY_GENESIS ? 1 : 0.03 + Math.max(0, p.genesis - 38) * 0.06;
  const r = rng();
  if (r < gRate) rarity = 'Genesis';
  else if (p.ssr >= 10 || r < gRate + 0.37) rarity = 'SSR';
  else rarity = 'SR';
  if (rarity === 'Genesis') p.genesis = 0;
  if (rarity !== 'SR') p.ssr = 0;
  const pool = data.awakeners.filter((a) => a.rarity === rarity);
  const a = pool[Math.floor(rng() * pool.length)];
  const own = state.roster[a.slug];
  let dup = false, gold = 0;
  if (!own) state.roster[a.slug] = { lv: 1, star: 0 };
  else if (own.star < MAX_STAR) { own.star++; dup = true; }
  else { gold = 800; state.gold += gold; dup = true; }
  state.stats.pulls++;
  return { slug: a.slug, rarity, isNew: !own, dup, gold, star: state.roster[a.slug].star };
}
export function summon(state, data, n) {
  if (state.tickets < n) return null;
  state.tickets -= n;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  for (let i = 0; i < n; i++) out.push(pullOnce(state, data, rng));
  return out;
}
export const EQUIP_PULL_COST = 400;
export function equipPull(state, data, n) {
  const cost = EQUIP_PULL_COST * n;
  if (state.gold < cost) return null;
  state.gold -= cost;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  for (let i = 0; i < n; i++) { const it = rollItem(rng, Math.max(10, state.maxStage), data); out.push(addItem(state, it.kind, it.defId)); }
  return out;
}

export function claimDaily(state, today = new Date().toISOString().slice(0, 10)) {
  if (state.daily.day === today) return null;
  state.daily.day = today; state.tickets += 10; state.gold += 1000;
  return { tickets: 10, gold: 1000 };
}

export function serialize(state) { return JSON.stringify(state); }
