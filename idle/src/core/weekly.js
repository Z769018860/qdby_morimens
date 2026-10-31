// Weekly boss: one real boss per ISO week. Every attempt is a 12-round fight against an (effectively) endless HP pool;
// the damage dealt is what counts. Weekly damage is cumulative and unlocks milestone rewards (claim once per week).
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { makeEnemy } from './enemies.js';
import { teamDefs, battleSeed, addItem, rollItem, addOrder, rollOrder, recordCodex } from './game.js';

export const WEEKLY_DAILY = 3, WEEKLY_ROUNDS = 12, WEEKLY_STAGE = 48;
const BASE_MILESTONES = [
  { dmg: 10000, tickets: 2, cores: 20, gold: 2000 }, { dmg: 30000, tickets: 3, cores: 30, gold: 4000 }, { dmg: 70000, tickets: 4, cores: 40, gold: 8000 },
  { dmg: 120000, tickets: 6, cores: 60, gold: 15000, item: true, order: true }, { dmg: 200000, tickets: 8, cores: 80, gold: 30000 },
  { dmg: 320000, tickets: 12, cores: 120, gold: 60000, item: true }, { dmg: 480000, tickets: 18, cores: 180, gold: 100000 }, { dmg: 700000, tickets: 30, cores: 300, gold: 200000, item: true, order: true },
];
// 70 万以后接着往上：每档伤害 ×1.3，一共再加 48 档（最高约 2000 亿）。
// 为什么要这么多：叠位 99 的队伍单次就能打 21 万，一天三次一周 450 万；超限满 99 单次 47 万；最终法则练起来单次是几百万——
// 原来的最高档 70 万，强队第一天就领完了，之后每周的伤害再高也没有任何反馈。
// 奖励只缓慢上涨，不跟着伤害指数涨（越往后越难，不是越往后越肥）：
//   召唤券 1 + 每 12 档 +1、银芯 10 + 2×档数（封顶 60）、金币 ×1.12 滚、装备每 4 档一件、钥令每 8 档一个。
//   48 档全拿一共 约 124 券 / 约 2300 银芯，只有最终法则级别的队伍才拿得到后半段。
const sig2 = (n) => { const e = Math.floor(Math.log10(n)) - 1; return Math.round(n / 10 ** e) * 10 ** e; };
export const EXTRA_TIERS = 48;
const EXTRA_MILESTONES = Array.from({ length: EXTRA_TIERS }, (_, k) => {
  const i = k + 1;
  const m = {
    dmg: sig2(700000 * Math.pow(1.3, i)),
    tickets: 1 + Math.floor(i / 12),
    cores: Math.min(60, 10 + 2 * i),
    gold: Math.round(200000 * Math.pow(1.12, i)),
  };
  if (i % 4 === 0) m.item = true;
  if (i % 8 === 0) m.order = true;
  return m;
});
// 下标稳定：旧存档里 claimed 记的是下标，前 8 档保持原样，新档只往后追加
export const MILESTONES = [...BASE_MILESTONES, ...EXTRA_MILESTONES];

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
export function doWeekly(state, data, slugs = null) {
  const w = weeklyState(state);
  if (w.tries <= 0) return null;
  w.tries--;
  // 编队页存好的阵容可以单独指定（不传就用当前队伍）
  const team = teamDefs(state, data, slugs && slugs.length ? slugs : state.team), boss = weeklyEnemy(data);
  const res = simulate({ allies: team.list, enemies: [boss], seed: battleSeed(state), strategy: state.strategy, maxRounds: WEEKLY_ROUNDS });
  const dmg = Object.entries(res.stats).filter(([k]) => k[0] === 'a').reduce((s, [, v]) => s + v.dmg, 0);
  w.damage += dmg; w.runs++; state.stats.battles++;
  const newBest = dmg > w.best; if (newBest) w.best = dmg;
  recordCodex(state, [boss], false);
  state.weeklyTotal = (state.weeklyTotal || 0) + dmg;
  return { ...res, dmg, newBest, team, boss: data.monById[boss.mid], week: w };
}
/** 一键领取：把已达成、还没领的档位全领了，返回每档的结果（空数组 = 没有可领的） */
export function claimAllWeekly(state, data) {
  const w = weeklyState(state), out = [];
  MILESTONES.forEach((m, i) => { if (w.damage >= m.dmg && !w.claimed.includes(i)) { const r = claimWeekly(state, data, i); if (r) out.push(r); } });
  return out;
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
