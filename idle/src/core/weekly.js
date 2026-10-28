// Weekly boss: one real boss per ISO week. Every attempt is a 12-round fight against an (effectively) endless HP pool;
// the damage dealt is what counts. Weekly damage is cumulative and unlocks milestone rewards (claim once per week).
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { makeEnemy } from './enemies.js';
import { teamDefs, battleSeed, addItem, rollItem, addOrder, rollOrder, recordCodex } from './game.js';

export const WEEKLY_DAILY = 3, WEEKLY_ROUNDS = 12, WEEKLY_STAGE = 48;
export const MILESTONES = [
  { dmg: 10000, tickets: 2, cores: 20, gold: 2000 }, { dmg: 30000, tickets: 3, cores: 30, gold: 4000 }, { dmg: 70000, tickets: 4, cores: 40, gold: 8000 },
  { dmg: 120000, tickets: 6, cores: 60, gold: 15000, item: true, order: true }, { dmg: 200000, tickets: 8, cores: 80, gold: 30000 },
  { dmg: 320000, tickets: 12, cores: 120, gold: 60000, item: true }, { dmg: 480000, tickets: 18, cores: 180, gold: 100000 }, { dmg: 700000, tickets: 30, cores: 300, gold: 200000, item: true, order: true },
];

const dayKey = () => new Date().toISOString().slice(0, 10);
// ISO week id, e.g. 2026-W44 (UTC)
export function weekId(d = new Date()) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}
export function weeklyBoss(data, wk = weekId()) {
  const pool = data.monsters.filter((m) => m.rank === 'Boss' && m.cy.length >= 2).sort((a, b) => (a.id < b.id ? -1 : 1));
  return pool[hash(`weekly${wk}`) % pool.length];
}
export function weeklyState(state, wk = weekId()) {
  const w = (state.weekly ||= { week: wk, damage: 0, best: 0, runs: 0, claimed: [], day: '', tries: WEEKLY_DAILY });
  if (w.week !== wk) Object.assign(w, { week: wk, damage: 0, best: 0, runs: 0, claimed: [], day: '', tries: WEEKLY_DAILY });
  if (w.day !== dayKey()) { w.day = dayKey(); w.tries = WEEKLY_DAILY; }
  return w;
}
export function weeklyEnemy(data, wk = weekId()) {
  const m = weeklyBoss(data, wk);
  const e = makeEnemy(m, 'Boss', WEEKLY_STAGE, mulberry32(hash(wk)), { affixes: false, msk: data.msk });
  e.hp = 1e12; e.weekly = true;
  return e;
}
export function doWeekly(state, data) {
  const w = weeklyState(state);
  if (w.tries <= 0) return null;
  w.tries--;
  const team = teamDefs(state, data), boss = weeklyEnemy(data);
  const res = simulate({ allies: team.list, enemies: [boss], seed: battleSeed(state), strategy: state.strategy, maxRounds: WEEKLY_ROUNDS });
  const dmg = Object.entries(res.stats).filter(([k]) => k[0] === 'a').reduce((s, [, v]) => s + v.dmg, 0);
  w.damage += dmg; w.runs++; state.stats.battles++;
  const newBest = dmg > w.best; if (newBest) w.best = dmg;
  recordCodex(state, [boss], false);
  state.weeklyTotal = (state.weeklyTotal || 0) + dmg;
  return { ...res, dmg, newBest, team, boss: data.monById[boss.mid], week: w };
}
export function claimWeekly(state, data, i) {
  const w = weeklyState(state), m = MILESTONES[i];
  if (!m || w.damage < m.dmg || w.claimed.includes(i)) return null;
  w.claimed.push(i);
  state.tickets += m.tickets; state.gold += m.gold; state.cores += m.cores;
  const rng = mulberry32(hash(`wk${w.week}${i}${state.seed}`));
  const items = m.item ? [addItem(state, ...Object.values(rollItem(rng, 60, data)))] : [];
  const orders = [];
  if (m.order) { const od = rollOrder(rng, data); if (od) { const got = addOrder(state, od.id); if (got.isNew) orders.push(got); else state.cores += got.cores; } }
  return { tickets: m.tickets, gold: m.gold, cores: m.cores, items, orders };
}
