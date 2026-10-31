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
import { nextAction } from '../js/duel/ai.js';
import { DECKS } from '../js/duel/gen.js';
import { AI_LV, aiFor, foePick } from '../js/duel/rank.js';
import { TIERS } from '../js/duel/tiers.js';

const N = Number(process.argv[2] || 24);
const PLAYER_SKILL = process.argv[3] != null ? Number(process.argv[3]) : 0;
// SB 换一组种子基数复核（同一个基数下结果完全可复现，换一个能看出结论是不是种子挑出来的）
const SB = Number(process.env.SB || 0);

// 线性同余：只为了让「抽哪套对手牌」可复现，别和 G.rng() 混用同一个流
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const IDS = DECKS.map((d) => d.id);
const deckById = (id) => DECKS.find((d) => d.id === id) || DECKS[0];

function play(myDeck, foeDeck, seed, foeSkill) {
  let G;
  try {
    G = E.createGame({ cards: myDeck.cards, extra: myDeck.extra }, { cards: foeDeck.cards, extra: foeDeck.extra }, { seed });
  } catch (e) { return { r: 'err', e: e.message }; }
  let steps = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) return { r: 'timeout' };
      const side = G.active;
      const act = nextAction(G, side, side === 0 ? PLAYER_SKILL : foeSkill);
      if (!act) return { r: 'stuck' };
      E.applyAction(G, side, act);
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

function line(row, tag) {
  let win = 0, game = 0; const per = [];
  for (const id of IDS) {
    const c = cell(id, row, tag, N);
    win += c.win; game += c.game; per.push([id, c.pct]);
  }
  per.sort((a, b) => a[1] - b[1]);
  return { pct: win / game * 100, low: per[0], high: per[per.length - 1] };
}

const t0 = Date.now();
console.log(`每格 ${N} 局 · 玩家侧 sloppy=${PLAYER_SKILL} · 玩家牌组 ${IDS.length} 套`);
console.log('— 逐档（每档 = 22 套玩家牌组各自 N 局）—');
const byLv = [];
for (let lv = 1; lv <= AI_LV.length; lv++) {
  const r = AI_LV[lv - 1];
  const o = line(r, lv * 10);
  byLv.push(o.pct);
  console.log(`Lv${String(lv).padStart(2)} ${r.n.padEnd(5, '　')} sloppy=${r.sloppy.toFixed(2)} pool=${r.pool.toFixed(2)}`
    + `  玩家胜率 ${o.pct.toFixed(1)}%   (最惨 ${o.low[0]}:${o.low[1].toFixed(0)}%  最爽 ${o.high[0]}:${o.high[1].toFixed(0)}%)`);
}

console.log('\n— 三条难度线的九段 —');
const diffs = ['easy', 'normal', 'hard'];
const grid = {};
for (const df of diffs) {
  const arr = [];
  for (let ti = 0; ti < TIERS.length; ti++) {
    const ai = aiFor(df, ti);
    const o = line(ai, 500 + ti * 10 + (df === 'easy' ? 0 : df === 'normal' ? 1 : 2));
    arr.push({ ti, ai, pct: o.pct });
  }
  grid[df] = arr;
  console.log(df.padEnd(7) + arr.map((x) => `T${x.ti + 1}(Lv${x.ai.x.toFixed(1)}) ${x.pct.toFixed(0)}%`).join('  '));
}

console.log('\n— 体检 —');
let bad = 0;
for (let i = 1; i < byLv.length; i++) {
  const d = byLv[i] - byLv[i - 1];
  const flag = d > 1.0 ? '  ✗ 反而更好打' : d > -1.5 ? '  · 几乎没变' : '';
  if (flag.includes('✗')) bad++;
  console.log(`Lv${i}→Lv${i + 1}: ${d >= 0 ? '+' : ''}${d.toFixed(1)}pp${flag}`);
}
for (const df of diffs) {
  let up = 0;
  for (let i = 1; i < grid[df].length; i++) if (grid[df][i].pct - grid[df][i - 1].pct > 1.5) up++;
  if (up) { bad++; console.log(`${df}: 有 ${up} 处「升段更好打」`); }
}
console.log(bad ? `结论：梯度有问题（${bad} 处）` : '结论：梯度单调，没有凸起');
console.log(`耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
