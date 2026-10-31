// 段位与积分（只算人机对战）+ 人机难度。
//
// 为什么积分只增不减：云端档案同步是「逐项取大」（js/account.js 的 mergeDigest），
// 手机和电脑各打几局、合并时取高的那个；一旦允许扣分，两台设备就会互相把分数拉回去，
// 而且打输了掉段会让人不敢再开一局。水平差距靠两件事体现：
//   1. 连胜加成——赢得越连贯爬得越快，断一次就得重新攒；
//   2. 段位越高，人机本身越强（见下面的 AI_LV），高分不是靠磨局数磨出来的。
//
// 段位表本身在 tiers.js（个人中心也要用，别把对位表带进每一页）。
import { TIERS } from './tiers.js';

// 每局得分：基础分按难度、段位越高给得越多（对手更强，赢下来更值钱），连胜有额外加成。
// 输了给一点「读档分」，让新手不至于卡在第一段；给得不多，磨局数爬不快。
const WIN_BASE = { easy: 80, normal: 110, hard: 140 };
const LOSE_BASE = 15;

export function gainFor(opt) {
  const o = opt || {};
  const diff = WIN_BASE[o.diff] != null ? o.diff : 'normal';
  const tier = Math.max(0, Math.min(TIERS.length - 1, Number(o.tier) || 0));
  const streak = Math.max(0, Number(o.streak) || 0);
  if (!o.win) return LOSE_BASE;
  return WIN_BASE[diff] + tier * 10 + Math.min(streak, 5) * 8;
}

// 人机档位：难度决定起点，段位往上抬档。九段 + 认真 = 顶格。
//
// 命轮值（血量）两边永远是 8000，抬高段位**不靠加血**。难度只来自两件事：
//   · sloppy —— 对手「打错牌」的概率：该召唤不召唤、随手上一只小的、把该盖的怪
//               摊在攻击表示上、有好目标却拿最弱的去撞最硬的（见 ai.js 的 nextAction）；
//   · pool   —— 挑对手牌组的偏袒程度：0 均匀抽，0.55 时明显偏向「克你这套」的预组。
// 八个档位。为什么是八档：难度分轻/普/认三档，起点分别在 1 / 3 / 5，
// 九段里每档最多抬 3~5 级，所以最高档要留到 8 才铺得开。
//
// sloppy 是主旋钮：对手越会打，玩家胜率从七成多一路掉到四成（d1 vs d2 实测
// 0→0.8 对应 65%→20%）。pool 只当配菜——段位高了顺便挑一套克你的预组，
// 但幅度压在 0.55 以内，免得难度变成「看谁牌组相克」。
export const AI_LV = [
  { n: '心不在焉', sloppy: 0.72, pool: 0.00 },
  { n: '照本宣科', sloppy: 0.62, pool: 0.06 },
  { n: '有来有回', sloppy: 0.52, pool: 0.14 },
  { n: '初窥门径', sloppy: 0.42, pool: 0.22 },
  { n: '老练', sloppy: 0.30, pool: 0.30 },
  { n: '锋利', sloppy: 0.18, pool: 0.38 },
  { n: '步步紧逼', sloppy: 0.08, pool: 0.46 },
  { n: '命轮本身', sloppy: 0, pool: 0.55 },
];

// 对位胜率表：COUNTER[对手牌组][你的牌组] = 对手赢的概率。
//
// 这张表不是拍脑袋写的，是跑出来的：九套预组两两对打，每对 140 局、先手各占一半
// （只让同一方先手会偏 5~10 个百分点），两个方向互相校正后取平均压噪声。
// 为什么要它：九套牌的强弱差得不远（整体胜率 44~52），但克制关系很硬——
// d5 打 d2 有 70%、d3 打 d5 只有 33%，所以「按整体强弱挑对手」反而会挑错
// （以前固定给高段位发 d1/d2/d9/d8，结果 d3 这套玩家在高段位反而更好打）。
// 换成按这张表挑，同一套玩家牌组才会真的越往上越难。
export const COUNTER = {
  d1: { d1: 50, d2: 52, d3: 54, d4: 55, d5: 47, d6: 47, d7: 55, d8: 48, d9: 56 },
  d2: { d1: 48, d2: 50, d3: 47, d4: 48, d5: 30, d6: 36, d7: 49, d8: 47, d9: 48 },
  d3: { d1: 46, d2: 53, d3: 50, d4: 40, d5: 67, d6: 68, d7: 48, d8: 40, d9: 47 },
  d4: { d1: 45, d2: 52, d3: 60, d4: 50, d5: 58, d6: 53, d7: 48, d8: 45, d9: 57 },
  d5: { d1: 53, d2: 70, d3: 33, d4: 42, d5: 50, d6: 65, d7: 47, d8: 61, d9: 48 },
  d6: { d1: 53, d2: 64, d3: 32, d4: 47, d5: 35, d6: 50, d7: 49, d8: 55, d9: 52 },
  d7: { d1: 45, d2: 51, d3: 53, d4: 53, d5: 53, d6: 51, d7: 50, d8: 55, d9: 50 },
  d8: { d1: 53, d2: 45, d3: 55, d4: 55, d5: 39, d6: 45, d7: 45, d8: 50, d9: 55 },
  d9: { d1: 44, d2: 53, d3: 53, d4: 43, d5: 53, d6: 48, d7: 50, d8: 45, d9: 50 },
};

// 这套对手打你这套的胜率（百分数）。表里没有的一律当五五开，别让新牌组炸掉选牌。
export function foeWinRate(foeId, myId) {
  const row = COUNTER[foeId];
  const v = row ? row[myId] : null;
  return typeof v === 'number' ? v : 50;
}

// 挑一套对手牌组：pool=0 时九套里均匀抽（好打），pool=1 时几乎只挑最克你的那套。
//
// 最早试过「按强弱分三档各取三套」，问题是窗口只有几种取值，相邻档位会整批换对手，
// 实测中段出现「升了一段反而更好打」的凸起。改成加权抽样：每套的权重按它对你这套的
// 克制强度指数放大，pool 就是放大倍数。难度随段位连续上升，对手也不会总是那几套。
// ids 传全部预组 id，返回一个 id。
export function foePick(pool, myId, ids) {
  const list = (ids || []).filter((id) => id !== myId);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const p = Math.max(0, Math.min(1, Number(pool) || 0));
  const t = p * 1.5;                                   // 0 = 均匀，1.5 = 几乎只挑最克的
  const ws = list.map((id) => Math.exp(t * (foeWinRate(id, myId) - 50) / 10));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= ws[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// 起点按难度：轻松 1 / 普通 3 / 认真 5；九段之内往上抬几档，三条线不一样：
//   · 轻松只爬到第 4 档（「轻松」就该一直轻松，不该在顶段突然变凶）；
//   · 普通 / 认真爬满五档，第 9 段都能碰到最顶的「命轮本身」。
// 这样每条难度线自己的九段都是完整的一条难度曲线，而不是爬到一半就封顶。
const CLIMB = { easy: 3, normal: 5, hard: 5 };

export function aiFor(diff, tierIdx) {
  const key = CLIMB[diff] ? diff : 'normal';
  const base = key === 'easy' ? 1 : key === 'hard' ? 5 : 3;
  const t = Math.max(0, Math.min(TIERS.length - 1, Number(tierIdx) || 0));
  const add = Math.round((t / (TIERS.length - 1)) * CLIMB[key]);
  const lv = Math.max(1, Math.min(AI_LV.length, base + add));
  const row = AI_LV[lv - 1];
  return { lv, n: row.n, sloppy: row.sloppy, pool: row.pool, max: AI_LV.length };
}

