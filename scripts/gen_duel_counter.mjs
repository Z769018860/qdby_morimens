// 重量 rank.js 的 COUNTER 对位表：COUNTER[对手][你] = 对手赢的百分比（两个方向取平均，先后手各占一半）。
// 用法：node scripts/gen_duel_counter.mjs [每对每方向局数 60] --write
import fs from 'node:fs';
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { PRESETS } from '../js/duel/gen.js';
const N = Number(process.argv[2] || 60), WRITE = process.argv.includes('--write');
const win = {};
for (let ia = 0; ia < PRESETS.length; ia++) for (let ib = 0; ib < PRESETS.length; ib++) for (let s = 0; s < N; s++) {
  const a = PRESETS[ia], b = PRESETS[ib];
  const seed = (888001 + ia * 7919 + ib * 104729 + s * 77) >>> 0;
  const G = E.createGame({ cards: a.cards, extra: a.extra, lp: a.lp, hand: a.hand }, { cards: b.cards, extra: b.extra, lp: b.lp, hand: b.hand }, { seed });
  let steps = 0;
  while (!G.over && G.turn <= 60 && steps++ < 8000) {
    const act = nextAction(G, G.active, 'normal');
    if (!act) break;
    G.trapPolicy = aiPolicyFor(G, G.active, act, 'normal');
    E.applyAction(G, G.active, act);
    G.trapPolicy = null;
  }
  const k = (x, y) => x + '>' + y;
  if (G.over && G.winner === 0) win[k(a.id, b.id)] = (win[k(a.id, b.id)] || 0) + 1;
  if (G.over && G.winner === 1) win[k(b.id, a.id)] = (win[k(b.id, a.id)] || 0) + 1;
}
const games = N * 2;   // 每对 a-b：a 先手 N 局 + b 先手 N 局（对角线 a=b 是 N×1 局两个座位，不用管）
const rows = PRESETS.map((d) => `  ${d.id}: { ${PRESETS.map((e) => `${e.id}: ${Math.round(100 * ((win[d.id + '>' + e.id] || 0)) / (d.id === e.id ? N : games))}`).join(', ')} },`);
if (WRITE) {
  const p = new URL('../js/duel/rank.js', import.meta.url);
  let t = fs.readFileSync(p, 'utf8');
  const a = t.indexOf('export const COUNTER = {'), b = t.indexOf('\n};', a);
  // 混合卡组那几行是 duel-mix-counter.mjs 量的，预组的脚本重跑时原样接回去
  const old = t.slice(a, b), cut = old.indexOf('  // —— 人机专用的混合卡组');
  const tail = cut >= 0 ? '\n' + old.slice(cut) : '';
  t = t.slice(0, a) + 'export const COUNTER = {\n' + rows.join('\n') + tail + t.slice(b);
  fs.writeFileSync(p, t);
  console.log('已写入 rank.js 的 COUNTER');
} else console.log(rows.join('\n'));
