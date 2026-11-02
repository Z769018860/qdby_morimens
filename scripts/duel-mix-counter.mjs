// 唤醒王：决斗链接 · 量「混合卡组打每套预组」的对位胜率。
//
// foeBand 是按 COUNTER 表排序挑对手的，混合卡组没有行就会一律当 50%，
// 于是高档位「专挑死克你的」这条对它们直接失效。这个脚本把表补上。
//
// 方法与 duel-sim 一致：每对两个方向各 N 局（先手各占一半），只让同一方先手会偏 5~10 个百分点。
// 用法：node scripts/duel-mix-counter.mjs [每方向局数，默认 40]
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { DECKS, CARDS } from '../js/duel/gen.js';

const N = Number(process.argv[2] || 40);
const MIX = DECKS.filter((d) => d.mix);
const PRE = DECKS.filter((d) => !d.mix && !d.foeOnly);

function runOne(A, B, seed) {
  let G;
  try { G = E.createGame({ cards: A.cards, extra: A.extra }, { cards: B.cards, extra: B.extra }, { seed }); }
  catch { return null; }
  let steps = 0, lastTurn = 0, actsThisTurn = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) return null;
      const side = G.active;
      const act = nextAction(G, side, 'normal');
      if (!act) return null;
      if (G.turn !== lastTurn) { lastTurn = G.turn; actsThisTurn = 0; }
      if (++actsThisTurn > 120) return null;
      G.trapPolicy = aiPolicyFor(G, side, act, 'normal');
      E.applyAction(G, side, act);
      G.trapPolicy = null;
    }
  } catch { return null; }
  return G.over ? (G.winner === 0 ? 0 : (G.winner === 1 ? 1 : 'draw')) : 'timeout';
}

console.log(`${MIX.length} 套混合 × ${PRE.length} 套预组，每方向 ${N} 局`);
const rows = {};
for (let mi = 0; mi < MIX.length; mi++) {
  const M = MIX[mi];
  const row = {};
  let tw = 0, tn = 0;
  for (let pi = 0; pi < PRE.length; pi++) {
    const P = PRE[pi];
    let w = 0, n = 0;
    for (let s = 0; s < N; s++) {
      const seed = (911003 + mi * 7919 + pi * 104729 + s * 977) >>> 0;
      // 前一半混牌在 0 号位；后一半把预组放到 0 号位，抹掉先手优势
      const r = s % 2 === 0 ? runOne(M, P, seed) : runOne(P, M, seed);
      if (r === null || r === 'timeout' || r === 'draw') continue;
      n++;
      const mixWin = s % 2 === 0 ? r === 0 : r === 1;
      if (mixWin) w++;
    }
    if (!n) continue;
    row[P.id] = Math.round(100 * w / n);
    tw += w; tn += n;
  }
  rows[M.id] = { row, wr: tn ? 100 * tw / tn : 0 };
  console.log(`${M.id} ${M.n}  整体 ${rows[M.id].wr.toFixed(1)}%  ${JSON.stringify(row)}`);
}

// 输出成 rank.js 里的 COUNTER 片段
const fmt = (o) => '{ ' + Object.entries(o).map(([k, v]) => `${k}: ${v}`).join(', ') + ' }';
console.log('\n— 粘进 js/duel/rank.js 的 COUNTER（键是「混合卡组」，值 = 它打这套预组的胜率）—');
for (const id of Object.keys(rows)) console.log(`  ${id}: ${fmt(rows[id].row)},`);
