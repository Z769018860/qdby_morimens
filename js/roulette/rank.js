// 弥萨格轮盘的段位（只算人机对战，和「唤醒王：决斗链接」共用一套段位表）。
//
// 为什么共用 duel/tiers.js：站上只有一个段位体系，玩家在两个游戏里看到的
// 「铜钥级 / 金印级 / 唤醒王」应该是同一件事，不然个人中心会出现两套不相干的称号。
//
// 积分只增不减——理由和决斗那边一样（见 js/duel/rank.js 开头）：云端档案是逐项取大合并的，
// 允许掉分两台设备就会互相拉回去。水平差距靠三件事体现：
//   1. 连胜加成：赢得连贯爬得快；
//   2. 段位越高，人机档位至少抬到「普通 / 认真」（见 floorFor），难度定起点、段位往上抬；
//   3. 段位越高，人机挑的出战唤醒体越强（见 foePool，用的是实测胜率分位）。
import { TIERS } from '../duel/tiers.js';

// 赢一局的基础分。五局三胜是长盘，同样的胜负给的更多（1.4 倍）。
const WIN_BASE = { easy: 70, normal: 95, hard: 120 };
const LOSE_BASE = 12;

export function gainFor(opt) {
  const o = opt || {};
  const diff = WIN_BASE[o.diff] != null ? o.diff : 'normal';
  const tier = Math.max(0, Math.min(TIERS.length - 1, Number(o.tier) || 0));
  const streak = Math.max(0, Number(o.streak) || 0);
  if (!o.win) return LOSE_BASE;
  const raw = WIN_BASE[diff] + tier * 10 + Math.min(streak, 5) * 8;
  return Math.round(raw * (Number(o.best) === 5 ? 1.4 : 1));
}

export const DIFF_RANK = { easy: 0, normal: 1, hard: 2 };

// 这一档段位下，人机至少是几档：段位越高，你自己选的「看心情」也会被抬上去。
export function floorFor(tier) {
  const t = Math.max(0, Number(tier) || 0);
  if (t >= 6) return 'hard';
  if (t >= 3) return 'normal';
  return 'easy';
}

export function effectiveDiff(tier, diff) {
  const mine = DIFF_RANK[diff] != null ? DIFF_RANK[diff] : 1;
  const floor = DIFF_RANK[floorFor(tier)];
  return mine >= floor ? diff : floorFor(tier);
}

// 人机挑人的范围：低段位随便挑，中段位从中上开始，高段位只挑最会打的。
// POWER 是 scripts/roulette-power.mjs 测出来的胜率分位（0~1），没有这份数据就退回全名单。
export function foePool(tier, POWER, list) {
  const t = Math.max(0, Number(tier) || 0);
  if (!POWER) return list.slice();
  const worst = t >= 6 ? 0.72 : t >= 3 ? 0.45 : 0;
  const pool = list.filter((id) => (POWER[id] == null ? 0.5 : POWER[id]) >= worst);
  return pool.length ? pool : list.slice();
}
