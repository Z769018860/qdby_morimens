// Weekly boss: one real boss per ISO week. Every attempt is a 12-round fight against an (effectively) endless HP pool;
// the damage dealt is what counts. Weekly damage is cumulative and unlocks milestone rewards (claim once per week).
//
// 三层（tier）：同一个 Boss，从第二层开始数值更硬、词缀更狠、奖励更多，但要先把前一层打出足够伤害才解锁。
// 为什么加层：羁绊上线后满编队的单次伤害比之前高一截，一层很快就打满了；分层让「我能不能上一层」变成每周的新目标。
//   第 1 层 = 原来的周 Boss，一点没动（老存档的累计伤害与已领档位直接落在这层）。
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { makeEnemy } from './enemies.js';
import { teamDefs, battleSeed, addItem, rollItem, addOrder, rollOrder, recordCodex } from './game.js';

export const WEEKLY_DAILY = 3, WEEKLY_ROUNDS = 12, WEEKLY_STAGE = 48;
export const WEEKLY_TIERS = 3;
/**
 * 一层一层往上：
 *   stageAdd  这一层的 Boss 按「第 48+stageAdd 关」的模板出数值（Boss 档 5.5 倍生命 / 1.3 倍攻击）
 *   atkMul/defMul  在这一层之上再乘一次，越往上越难啃
 *   rewardMul 领取同一档里程碑时，券 / 银芯 / 金币各乘这个数
 *   unlock    上一层本期累计伤害达到这个数才开
 */
export const WEEKLY_TIER = [
  { n: 1, zh: '第 1 层', stageAdd: 0, atkMul: 1, defMul: 1, rewardMul: 1, unlock: 0, affix: null, tip: '基准难度，老存档的进度都在这层' },
  { n: 2, zh: '第 2 层', stageAdd: 8, atkMul: 1.35, defMul: 1.25, rewardMul: 1.6, unlock: 120000, affix: 'fury', tip: '第 1 层累计 12 万伤害后解锁 · 奖励 ×1.6' },
  { n: 3, zh: '第 3 层', stageAdd: 16, atkMul: 1.7, defMul: 1.5, rewardMul: 2.4, unlock: 700000, affix: 'shell', tip: '第 2 层累计 70 万伤害后解锁 · 奖励 ×2.4' },
];
export const TIER_LAST = WEEKLY_TIERS;
export const tierOf = (n) => WEEKLY_TIER[Math.max(0, Math.min(WEEKLY_TIERS - 1, (Number(n) || 1) - 1))];

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

const blankTrack = () => ({ damage: 0, best: 0, runs: 0, claimed: [] });
/** 一层一条进度：{ damage, best, runs, claimed:[] } */
export function wkTrack(w, tier) { return (w.tiers ||= {})[tierOf(tier).n] ||= blankTrack(); }

/** 本期状态：换周清空三层、每日刷新次数；老存档（没有 tiers）把旧的累计伤害落在第 1 层 */
export function weeklyState(state, wk = weekId()) {
  const w = (state.weekly ||= {});
  if (w.week !== wk) Object.assign(w, { week: wk, day: '', tries: WEEKLY_DAILY, tier: 1, tiers: {} });
  if (!w.tiers || typeof w.tiers !== 'object') w.tiers = {};
  // 老存档迁移：以前 damage / best / runs / claimed 都在顶层，现在一律算第 1 层
  if (!w.tiers[1] && (w.damage || w.claimed?.length)) {
    w.tiers[1] = { damage: Number(w.damage) || 0, best: Number(w.best) || 0, runs: Number(w.runs) || 0, claimed: Array.isArray(w.claimed) ? [...w.claimed] : [] };
  }
  delete w.damage; delete w.best; delete w.runs; delete w.claimed;
  for (const t of WEEKLY_TIER) w.tiers[t.n] ||= blankTrack();
  if (!w.tier || !w.tiers[w.tier]) w.tier = 1;
  if (w.day !== dayKey()) { w.day = dayKey(); w.tries = WEEKLY_DAILY; }
  return w;
}

/** 这一层开了没有：上一层本期累计伤害够 unlock 就开（第 1 层永远开） */
export function weeklyOpen(state, tier) {
  const t = tierOf(tier);
  const prev = WEEKLY_TIER[t.n - 2];
  if (!prev) return true;
  return (wkTrack(weeklyState(state), prev.n).damage || 0) >= t.unlock;
}

export function weeklyEnemy(data, wk = weekId(), tier = 1) {
  const t = tierOf(tier);
  const m = weeklyBoss(data, wk);
  const e = makeEnemy(m, 'Boss', WEEKLY_STAGE + t.stageAdd, mulberry32(hash(wk)), { affixes: false, msk: data.msk });
  e.hp = 1e12; e.weekly = true;
  e.tier = t.n;
  if (t.n > 1) {
    e.atk = Math.round(e.atk * t.atkMul);
    e.def = Math.round(e.def * t.defMul);
    // 层数越高词缀越狠：第 2 层狂暴（攻击再抬一档），第 3 层再套一层坚壳（血厚防高）
    if (t.affix === 'fury') { e.atk = Math.round(e.atk * 1.2); e.name = `狂暴的${e.name}`; e.affix = 'fury'; }
    if (t.affix === 'shell') { e.def = Math.round(e.def * 1.3); e.name = `坚壳的${e.name}`; e.affix = 'shell'; }
  }
  return e;
}

export function doWeekly(state, data, slugs = null, tier = null) {
  const w = weeklyState(state);
  const t = tierOf(tier ?? w.tier);
  if (!weeklyOpen(state, t.n)) return null;
  if (w.tries <= 0) return null;
  w.tries--;
  w.tier = t.n;
  const tr = wkTrack(w, t.n);
  // 编队页存好的阵容可以单独指定（不传就用当前队伍）
  const team = teamDefs(state, data, slugs && slugs.length ? slugs : state.team), boss = weeklyEnemy(data, undefined, t.n);
  const res = simulate({ allies: team.list, enemies: [boss], seed: battleSeed(state), strategy: state.strategy, maxRounds: WEEKLY_ROUNDS });
  const dmg = Object.entries(res.stats).filter(([k]) => k[0] === 'a').reduce((s, [, v]) => s + v.dmg, 0);
  tr.damage += dmg; tr.runs++; state.stats.battles++;
  const newBest = dmg > tr.best; if (newBest) tr.best = dmg;
  recordCodex(state, [boss], false);
  state.weeklyTotal = (state.weeklyTotal || 0) + dmg;
  return { ...res, dmg, newBest, team, tier: t, track: tr, boss: data.monById[boss.mid], week: w };
}
/** 一键领取某层：把已达成、还没领的档位全领了，返回每档的结果（空数组 = 没有可领的） */
export function claimAllWeekly(state, data, tier = null) {
  const w = weeklyState(state);
  const t = tierOf(tier ?? w.tier);
  const tr = wkTrack(w, t.n);
  const out = [];
  MILESTONES.forEach((m, i) => { if (tr.damage >= m.dmg && !tr.claimed.includes(i)) { const r = claimWeekly(state, data, i, t.n); if (r) out.push(r); } });
  return out;
}
/** 一档的奖励：按层数乘 rewardMul（券 / 银芯 / 金币），装备与钥令数量不变 */
export function claimWeekly(state, data, i, tier = null) {
  const w = weeklyState(state);
  const t = tierOf(tier ?? w.tier);
  const tr = wkTrack(w, t.n);
  const m = MILESTONES[i];
  if (!m || tr.damage < m.dmg || tr.claimed.includes(i)) return null;
  tr.claimed.push(i);
  const mul = t.rewardMul;
  const r = { tickets: Math.round(m.tickets * mul), cores: Math.round(m.cores * mul), gold: Math.round(m.gold * mul), tier: t.n, items: [], orders: [] };
  state.tickets += r.tickets; state.gold += r.gold; state.cores += r.cores;
  const rng = mulberry32(hash(`wk${w.week}${t.n}${i}${state.seed}`));
  const items = m.item ? [addItem(state, ...Object.values(rollItem(rng, 60 + t.stageAdd, data)))] : [];
  const orders = [];
  if (m.order) { const od = rollOrder(rng, data); if (od) { const got = addOrder(state, od.id); if (got.isNew) orders.push(got); else state.cores += got.cores; } }
  r.items = items; r.orders = orders;
  return r;
}
