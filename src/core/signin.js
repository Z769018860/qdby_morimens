// 签到: a monthly calendar (UTC months). One claim per day; missed days can be backfilled with 银芯;
// cumulative-days chests at 5/10/15/20/25/28 days.
import { hash, mulberry32 } from './rng.js';
import { addItem, rollItem } from './game.js';

export const BACKFILL_COST = 40;
export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
export const daysInMonth = (d = new Date()) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

export const dayReward = (d) => (d % 7 === 0 ? { tickets: 8, gold: 1500, cores: 40, item: true } : { tickets: 3, gold: 400 + 40 * d, cores: 10 });
export const CUM = [
  { n: 5, tickets: 5, cores: 40 }, { n: 10, tickets: 8, cores: 80, item: true }, { n: 15, tickets: 10, cores: 120 },
  { n: 20, tickets: 15, cores: 160, item: true }, { n: 25, tickets: 20, cores: 200 }, { n: 28, tickets: 30, cores: 300, item: true },
];

export function signinState(state, now = new Date()) {
  const m = monthKey(now);
  if (!state.signin || state.signin.month !== m) state.signin = { month: m, claimed: [], cum: [] };
  return state.signin;
}
function grant(state, data, r, tag) {
  state.tickets += r.tickets || 0; state.gold += r.gold || 0; state.cores += r.cores || 0;
  const items = r.item ? [addItem(state, ...Object.values(rollItem(mulberry32(hash(`${tag}${state.seed}`)), Math.max(20, state.maxStage), data)))] : [];
  return { ...r, items };
}
export const canSignToday = (state, now = new Date()) => !signinState(state, now).claimed.includes(now.getUTCDate());

export function signToday(state, data, now = new Date()) {
  const s = signinState(state, now), d = now.getUTCDate();
  if (s.claimed.includes(d)) return null;
  s.claimed.push(d);
  state.stats.signins = (state.stats.signins || 0) + 1;
  return grant(state, data, dayReward(d), `sg${s.month}${d}`);
}
export function backfill(state, data, day, now = new Date()) {
  const s = signinState(state, now);
  if (!(day >= 1 && day < now.getUTCDate()) || s.claimed.includes(day) || state.cores < BACKFILL_COST) return null;
  state.cores -= BACKFILL_COST; s.claimed.push(day);
  state.stats.signins = (state.stats.signins || 0) + 1;
  return grant(state, data, dayReward(day), `sb${s.month}${day}`);
}
export function claimCum(state, data, i, now = new Date()) {
  const s = signinState(state, now), c = CUM[i];
  if (!c || s.claimed.length < c.n || s.cum.includes(i)) return null;
  s.cum.push(i);
  return grant(state, data, c, `sc${s.month}${i}`);
}
