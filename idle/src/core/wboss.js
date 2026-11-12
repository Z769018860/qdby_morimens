// 世界 Boss（逆潮·共讨）：全服共用一条血池，所有人打的是同一只。
//
// 和周 Boss 的区别：
//   · 周 Boss 是「你自己的伤害进度条」，八层各算各的；世界 Boss 的血池是**全服共享**的，
//     别人打掉的伤害会实时从总量里扣，血池清零即本期结束（提前结算）。
//   · 每周一只，每天 3 次，按本期累计伤害排名，周结算发奖（排名分档 + 参与奖）。
//   · 伤害上报到后端（edge-functions 的 /wboss），服务端是唯一权威：
//     次数、血池、排名都以服务端为准，本机只做展示缓存（断网也能看到自己打了多少）。
//
// 这一层只放纯逻辑（选 Boss / 出数值 / 跑战斗 / 算奖励 / 合并服务端状态），
// 网络请求在下面的 net 里，UI 在 ui/wboss.js。
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { makeEnemy, lateDotBoost } from './enemies.js';
import { teamDefs, battleSeed, recordCodex, addItem, rollItem } from './game.js';
import { weekId } from './weekly.js';
import * as Cloud from './cloud.js';

export const WBOSS_DAILY = 3;          // 每天挑战次数
export const WBOSS_ROUNDS = 12;        // 每次打 12 回合，比这段时间的伤害
export const WBOSS_STAGE = 80;         // Boss 数值按主线第 80 关档出（比周 Boss 第 2 层略硬）
export const WBOSS_ATK_MUL = 1.4;
export const WBOSS_DEF_MUL = 1.15;
export const WBOSS_HP_BASE = 1.2e7;    // 血池基准：3~5 个活跃玩家打一周的量级（满配单次 30~40 万，21 次约 700~800 万）
export const WBOSS_MAX_HIT = 2e7;      // 单次上报上限（服务端也会夹这个数）

/** 排名奖励：max 是「名次 ≤ max」这一档，从上往下取第一档 */
export const WBOSS_RANK_TIERS = [
  { max: 1, key: 'r1', zh: '第 1 名', tickets: 12, cores: 400, gold: 60000, item: true },
  { max: 3, key: 'r3', zh: '第 2~3 名', tickets: 8, cores: 260, gold: 40000 },
  { max: 10, key: 'r10', zh: '第 4~10 名', tickets: 5, cores: 160, gold: 24000 },
  { max: 30, key: 'r30', zh: '第 11~30 名', tickets: 3, cores: 100, gold: 14000, item: true },
  { max: 100, key: 'r100', zh: '第 31~100 名', tickets: 2, cores: 60, gold: 8000 },
  { max: Infinity, key: 'join', zh: '参与奖', tickets: 1, cores: 30, gold: 3000 },
];
/** 血池打空时，所有参与者额外一份（服务端只判 killed，奖励仍由客户端按这份表发） */
export const WBOSS_KILL_BONUS = { tickets: 1, cores: 120, gold: 10000 };

const dayKey = () => new Date().toISOString().slice(0, 10);
export const wbossWeek = (d = new Date()) => weekId(d);

/** 本周的 Boss：从首领池里按周哈希挑一只（和普通周 Boss 用不同前缀，允许撞同一只） */
export function wbossBoss(data, week = wbossWeek()) {
  const pool = (data.monsters || []).filter((m) => m.rank === 'Boss' && m.cy && m.cy.length >= 2).sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!pool.length) return null;
  return pool[hash(`wboss:${week}`) % pool.length];
}

/** 本期词缀：每周轮换一条，让同一只 Boss 的手感不完全一样 */
export function wbossAffix(week = wbossWeek()) {
  return ['fury', 'shell', 'both'][hash(`wboss:affix:${week}`) % 3];
}

/** 战斗用的 Boss：血量给到几乎无限（只比伤害），词缀与数值按本期固定 */
export function wbossEnemy(data, week = wbossWeek()) {
  const m = wbossBoss(data, week);
  if (!m) return null;
  const rng = mulberry32(hash(`wboss:enemy:${week}`));
  const e = makeEnemy(m, 'Boss', WBOSS_STAGE, rng, { affixes: false, msk: data.msk });
  e.hp = 1e12; e.maxHp = 1e12; e.wboss = true; e.stage = WBOSS_STAGE;
  e.atk = Math.round(e.atk * WBOSS_ATK_MUL);
  e.def = Math.round(e.def * WBOSS_DEF_MUL);
  const fx = wbossAffix(week);
  if (fx === 'fury' || fx === 'both') { e.atk = Math.round(e.atk * 1.18); e.name = `狂暴的${e.name}`; }
  if (fx === 'shell' || fx === 'both') { e.def = Math.round(e.def * 1.25); e.name = `坚壳的${e.name}`; }
  e.name = `逆潮·${e.name}`;
  e.affix = fx;
  return e;
}

/** 血池上限：固定值（服务端与客户端同一口径，避免两边算出来的血量不一样） */
export const wbossHpMax = () => WBOSS_HP_BASE;

/** 本机记账：每周一份 { week, day, tries, dmg, best, runs, claimed:{} } */
export function wbossState(state, week = wbossWeek()) {
  const w = (state.wboss ||= {});
  if (w.week !== week) {
    w.week = week; w.day = ''; w.tries = WBOSS_DAILY; w.dmg = 0; w.best = 0; w.runs = 0;
  }
  if (w.day !== dayKey()) { w.day = dayKey(); w.tries = WBOSS_DAILY; }
  w.tries = Math.max(0, Math.min(WBOSS_DAILY, Math.floor(Number(w.tries) || 0)));
  w.dmg = Math.max(0, Math.round(Number(w.dmg) || 0));
  w.best = Math.max(0, Math.round(Number(w.best) || 0));
  w.runs = Math.max(0, Math.floor(Number(w.runs) || 0));
  w.claimed = { ...(w.claimed || {}) };
  return w;
}

/** 服务端状态落地：次数 / 本期伤害以服务端为准（换设备、清缓存都靠它对齐） */
export function applyServer(state, remote) {
  if (!remote || !remote.week) return null;
  const w = wbossState(state, remote.week);
  if (Number.isFinite(remote.tries)) w.tries = Math.max(0, Math.min(WBOSS_DAILY, Math.floor(remote.tries)));
  if (Number.isFinite(remote.dmg)) w.dmg = Math.max(w.dmg, Math.round(remote.dmg));
  if (Number.isFinite(remote.best)) w.best = Math.max(w.best, Math.round(remote.best));
  if (Number.isFinite(remote.runs)) w.runs = Math.max(w.runs, Math.floor(remote.runs));
  return w;
}

/** 打一次：用指定阵容（不传就用当前队伍）打 12 回合，返回这一场的伤害 */
export function wbossFight(state, data, slugs = null) {
  const w = wbossState(state);
  if (w.tries <= 0) return { err: '今日次数已用完' };
  const boss = wbossEnemy(data, w.week);
  if (!boss) return { err: '这一期还没有 Boss' };
  const team = teamDefs(state, data, slugs && slugs.length ? slugs : state.team);
  if (!team || !team.list || !team.list.length) return { err: '还没有出战阵容' };
  w.tries--;
  w.runs++;
  const res = simulate({
    allies: team.list, enemies: [boss], seed: battleSeed(state),
    strategy: state.strategy, maxRounds: WBOSS_ROUNDS, dotBoost: lateDotBoost(boss.stage),
  });
  const dmg = Math.round(Object.entries(res.stats).filter(([k]) => k[0] === 'a').reduce((s, [, v]) => s + (v.dmg || 0), 0));
  const newBest = dmg > w.best;
  w.dmg += dmg;
  if (newBest) w.best = dmg;
  state.stats.battles++;
  recordCodex(state, [boss], false);
  return { ok: true, res, dmg, newBest, team, boss: data.monById[boss.mid], week: w.week, affix: boss.affix, track: w };
}

/** 名次 → 奖励档（服务端只给名次，奖励表只在这里一份） */
export function wbossTierOf(rank) {
  const r = Math.max(1, Math.floor(Number(rank) || 0));
  return WBOSS_RANK_TIERS.find((t) => r <= t.max) || WBOSS_RANK_TIERS[WBOSS_RANK_TIERS.length - 1];
}

/** 本期奖励：排名档 + 参与奖（打过就算）+ 击杀加成 */
export function wbossRewardOf({ rank = 0, dmg = 0, killed = false } = {}) {
  if (!(Number(dmg) > 0)) return null;
  const t = wbossTierOf(rank || 9999);
  const r = { key: t.key, zh: t.zh, rank: Math.max(1, Math.floor(Number(rank) || 0)) || null, tickets: t.tickets, cores: t.cores, gold: t.gold, item: !!t.item, killed: !!killed, bonus: null };
  if (killed) {
    r.bonus = { ...WBOSS_KILL_BONUS };
    r.tickets += WBOSS_KILL_BONUS.tickets;
    r.cores += WBOSS_KILL_BONUS.cores;
    r.gold += WBOSS_KILL_BONUS.gold;
  }
  return r;
}

/** 发奖（客户端落地）：金币 / 银芯 / 券，第一名与 31~100 名档再给一件装备 */
export function wbossGrant(state, data, reward) {
  if (!reward) return null;
  const out = { ...reward, items: [] };
  state.gold += out.gold || 0;
  state.cores += out.cores || 0;
  state.tickets += out.tickets || 0;
  state.stats.gold += out.gold || 0;
  if (reward.item) {
    const rng = mulberry32(hash(`wboss:item:${reward.key}:${state.seed}`));
    const got = rollItem(rng, WBOSS_STAGE, data);
    if (got) out.items.push(addItem(state, ...Object.values(got)));
  }
  return out;
}

/** 血池剩余比例（0~1），给进度条用 */
export function wbossHpLeft(wb) {
  const max = Number(wb && wb.hpMax) || 0;
  const hp = Math.max(0, Number(wb && wb.hp) || 0);
  return max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
}

// ------------------------------------------------------------------ 网络
// 薄封装：真正的鉴权 / 基址探测都在 core/cloud.js（和云存档同一套 token）。
export const net = {
  /** 拉本期状态：Boss / 血池 / 我的伤害与名次 / 排行榜 / 上期结算（游客也能看血池） */
  async fetch(opt) {
    return (await Cloud.api('GET', '/wboss', null, { anon: true, ...opt })).json;
  },
  /** 上报一次伤害：服务端夹上限、扣次数、扣血池 */
  async hit(dmg, opt) {
    const d = Math.max(1, Math.min(WBOSS_MAX_HIT, Math.round(Number(dmg) || 0)));
    return (await Cloud.api('POST', '/wboss/hit', { dmg: d }, opt)).json;
  },
  /** 领取上期奖励：服务端只回名次与是否已领，奖励内容由 wbossRewardOf 算 */
  async claim(week, opt) {
    return (await Cloud.api('POST', '/wboss/claim', { week }, opt)).json;
  },
};
