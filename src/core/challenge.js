// Endgame modes: the infinite tower (HP carries over, climb until you fall) and the
// 融灾 trials (the real zone bosses of seasons 71/72, scaled by threat level).
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { buildEnemies, makeEnemy, enemyScale } from './enemies.js';
import { teamDefs, stageGold, battleSeed, addItem, rollItem, recordCodex } from './game.js';

// ---------- tower ----------
export const TOWER_DAILY = 3;
export const TOWER_HEAL = 0.3;                       // share of max HP restored between floors
export const towerStage = (floor) => Math.round(10 + floor * 0.95);
export const towerInfo = (floor) => ({ stage: towerStage(floor), boss: floor % 10 === 0, elite: floor % 5 === 0 && floor % 10 !== 0, node: floor % 10 === 9 ? 9 : 3 });
export const towerEnemies = (floor, data) => buildEnemies(towerStage(floor), data.monsters, { seed: `tower${floor}`, info: towerInfo(floor), msk: data.msk });

export function towerTries(state, today = day()) {
  if (state.tower.day !== today) { state.tower.day = today; state.tower.tries = TOWER_DAILY; }
  return state.tower.tries;
}
export const day = () => new Date().toISOString().slice(0, 10);

// Pure simulation of one climb. Does not touch the state.
export function simulateTower(state, data, { maxFloors = 150, seed = battleSeed({ seed: state.seed }) } = {}) {
  const team = teamDefs(state, data);
  let allies = team.list.map((d) => ({ ...d, hpNow: d.hp }));
  const floors = [];
  for (let f = 1; f <= maxFloors; f++) {
    const alive = allies.filter((a) => a.hpNow > 0);
    if (!alive.length) break;
    const res = simulate({ allies: alive, enemies: towerEnemies(f, data), seed: (seed ^ Math.imul(f, 2654435761)) >>> 0, strategy: state.strategy });
    floors.push({ floor: f, win: res.win, rounds: res.rounds, alive: res.allies.filter((a) => a.alive).length, stats: res.stats, allies: res.allies });
    if (!res.win) break;
    // survivors keep their HP and recover a little; the fallen stay down
    const next = [];
    for (const d of alive) {
      const r = res.allies.find((x) => x.uid === `a${alive.indexOf(d)}`);
      if (r && r.alive) next.push({ ...d, hpNow: Math.min(d.hp, r.hp + d.hp * TOWER_HEAL) });
    }
    allies = next;
  }
  const reached = floors.filter((x) => x.win).length;
  return { floors, reached, team };
}

export function towerReward(state, data, reached, rng) {
  const rw = { gold: 0, tickets: 0, cores: 0, items: [], newBest: false };
  const prev = state.tower.best;
  for (let f = prev + 1; f <= reached; f++) {
    rw.gold += Math.round(stageGold(towerStage(f)) * 0.9);
    if (f % 5 === 0) { rw.tickets += 2; rw.cores += 15; }
    if (f % 10 === 0) rw.items.push(addItem(state, ...Object.values(rollItem(rng, towerStage(f), data))));
  }
  rw.gold += Math.round(stageGold(towerStage(Math.max(1, reached))) * Math.min(reached, 10) * 0.2); // participation
  if (reached > prev) { state.tower.best = reached; rw.newBest = true; }
  state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
  return rw;
}

export function doTower(state, data, today = day()) {
  if (towerTries(state, today) <= 0) return null;
  state.tower.tries--;
  const sim = simulateTower(state, data);
  const rng = mulberry32(hash(`tw${state.seed}${state.tower.best}${sim.reached}`));
  const rw = towerReward(state, data, sim.reached, rng);
  state.tower.runs = (state.tower.runs || 0) + 1;
  return { ...sim, rw };
}

// ---------- 融灾 trials ----------
export const THREATS = [
  { k: 'C', stage: 26, tickets: 1 }, { k: 'B', stage: 34, tickets: 2 }, { k: 'A', stage: 42, tickets: 3 },
  { k: 'S', stage: 50, tickets: 5 }, { k: 'SS', stage: 60, tickets: 8 }, { k: 'SSS', stage: 72, tickets: 12 },
];
export const trialKey = (t, th) => `${t.id}-${th.k}`;
export const trialUnlocked = (state, t, i) => i === 0 || !!state.trials.cleared[trialKey(t, THREATS[i - 1])];

export function trialEnemies(trial, th, data) {
  const rng = mulberry32(hash(`trial${trial.id}${th.k}`));
  const get = (id) => data.trialMonsters[id];
  const out = trial.boss.map((id) => makeEnemy(get(id), 'Boss', th.stage, rng, { affixes: false, msk: data.msk }));
  if (trial.boss.length === 1) {
    // one boss is paired with an elite or two minions of the zone
    const pool = trial.elite.length ? [trial.elite[Math.floor(rng() * trial.elite.length)]] : trial.common.length ? [trial.common[Math.floor(rng() * trial.common.length)], trial.common[Math.floor(rng() * trial.common.length)]] : [];
    for (const id of pool) { const m = get(id); out.push(makeEnemy(m, m.rank === 'Elite' ? 'Elite' : 'Normal', th.stage, rng, { affixes: false, msk: data.msk })); }
  }
  // several bosses share the usual boss budget
  if (trial.boss.length > 1) for (const e of out) { e.hp = Math.round(e.hp * 0.65); e.atk = Math.round(e.atk * 0.85); }
  return out;
}

export function doTrial(state, data, trialId, thIdx) {
  const trial = data.trials.find((t) => t.id === trialId), th = THREATS[thIdx];
  if (!trial || !th || !trialUnlocked(state, trial, thIdx)) return null;
  const team = teamDefs(state, data);
  const seed = battleSeed(state);
  const res = simulate({ allies: team.list, enemies: trialEnemies(trial, th, data), seed, strategy: state.strategy });
  const rw = { gold: 0, tickets: 0, cores: 0, items: [], first: false };
  state.stats.battles++;
  recordCodex(state, trialEnemies(trial, th, data), res.win);
  if (res.win) {
    state.stats.wins++; state.stats.kills += res.kills;
    const key = trialKey(trial, th), rng = mulberry32(seed ^ 0x51ed);
    rw.gold = Math.round(stageGold(th.stage) * 0.6 * (1 + team.goldBonus / 100));
    if (!state.trials.cleared[key]) {
      state.trials.cleared[key] = true; rw.first = true; rw.tickets = th.tickets; rw.cores = th.tickets * 15;
      for (let i = 0; i < 1 + (thIdx >= 3 ? 1 : 0); i++) rw.items.push(addItem(state, ...Object.values(rollItem(rng, th.stage + 20, data))));
    }
    state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
  }
  return { ...res, trial, th, rw, team };
}
