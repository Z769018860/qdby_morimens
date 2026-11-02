// 唤醒王：决斗链接 · 人机难度梯度的实测表。
//
// 为什么单独一个脚本：难度是不是「一路往上变凶」，不能靠看 sloppy 数值猜。
// 这里按玩家实际会遇到的那条路径复现一遍——难度 × 段位 → 档位 → 抽对手牌组 → 开局，
// 玩家一侧固定用「不犯错」的 AI 代打（sloppy=0），量出每一级、每一段的玩家胜率。
// 判据：相邻档位胜率单调下降，三条难度线的九段各自不许出现「升段反而更好打」的凸起。
//
// 用法：
//   node scripts/duel-ladder.mjs             # 每格 24 局
//   node scripts/duel-ladder.mjs 40          # 更稳（±1.5 个百分点），慢一倍
//   node scripts/duel-ladder.mjs 24 0.16     # 玩家一侧也带 16% 打错牌（模拟普通玩家）
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { PRESETS, DECKS } from '../js/duel/gen.js';
import { AI_LV, aiFor, foePick } from '../js/duel/rank.js';
import { TIERS } from '../js/duel/tiers.js';

const N = Number(process.argv[2] || 30);
const PLAYER_SKILL = process.argv[3] != null ? Number(process.argv[3]) : 0;
// SB 换一组种子基数复核（同一个基数下结果完全可复现，换一个能看出结论是不是种子挑出来的）
const SB = Number(process.env.SB || 0);

// 线性同余：只为了让「抽哪套对手牌」可复现，别和 G.rng() 混用同一个流
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const IDS = PRESETS.map((d) => d.id);
const deckById = (id) => DECKS.find((d) => d.id === id) || DECKS[0];

function play(myDeck, foeDeck, seed, foeSkill) {
  let G;
  try {
    G = E.createGame({ cards: myDeck.cards, extra: myDeck.extra, lp: myDeck.lp, hand: myDeck.hand }, { cards: foeDeck.cards, extra: foeDeck.extra, lp: foeDeck.lp, hand: foeDeck.hand }, { seed });
  } catch (e) { return { r: 'err', e: e.message }; }
  let steps = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) return { r: 'timeout' };
      const side = G.active;
      const act = nextAction(G, side, side === 0 ? PLAYER_SKILL : foeSkill);
      if (!act) return { r: 'stuck' };
      G.trapPolicy = aiPolicyFor(G, side, act, side === 0 ? PLAYER_SKILL : foeSkill);
      E.applyAction(G, side, act);
      G.trapPolicy = null;
    }
  } catch (e) { return { r: 'err', e: e.message }; }
  if (!G.over) return { r: 'timeout' };
  return { r: G.winner === 0 ? 'win' : G.winner === 1 ? 'lose' : 'draw' };
}

// 一组 (sloppy, pool) × 一套玩家牌组：N 局，对手按 foePick 抽（与线上同一条路径）
function cell(myId, row, tag, n) {
  let win = 0, game = 0, err = 0;
  const rnd = lcg(0x9e3779b9 ^ (tag * 131071) ^ (IDS.indexOf(myId) * 7919));
  for (let s = 0; s < n; s++) {
    const foeId = foePick(row.pool, myId, IDS, rnd);
    const out = play(deckById(myId), deckById(foeId), (555001 + SB * 104729 + tag * 7919 + IDS.indexOf(myId) * 104729 + s * 77) >>> 0, row.sloppy);
    game++;
    if (out.r === 'win') win++;
    else if (out.r === 'err' || out.r === 'stuck') { err++; console.log('!!', myId, 'vs', foeId, out); }
  }
  return { win, game, pct: game ? win / game * 100 : 0, err };
}


// 按目标玩家胜率反推每档的 sloppy（pool 沿用 rank.js 里的）
const TARGET = (process.argv[3] || '76,73,70,67,63,59,55,51,47,43').split(',').map(Number);
const out = [];
for (let lv = 1; lv <= AI_LV.length; lv++) {
  const base = AI_LV[lv - 1];
  let best = null;
  for (let s = 0; s <= 0.7001; s += 0.025) {
    const row = { sloppy: s, pool: base.pool };
    let win = 0, game = 0;
    for (const id of IDS) { const c = cell(id, row, lv * 10 + Math.round(s * 1000), N); win += c.win; game += c.game; }
    const pct = win / game * 100;
    if (!best || Math.abs(pct - TARGET[lv - 1]) < Math.abs(best.pct - TARGET[lv - 1])) best = { s: +s.toFixed(3), pct };
  }
  out.push(best);
  console.log(`Lv${lv} ${base.n} 目标 ${TARGET[lv - 1]}% → sloppy ${best.s}（实测 ${best.pct.toFixed(1)}%）`);
}
console.log(JSON.stringify(out.map((o) => o.s)));
