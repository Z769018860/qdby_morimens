// 按模拟胜率调每套预组的命轮值偏移（data/duel-packs.json 的 decks[].lp）。
// 用法：node scripts/tune_duel_lp.mjs [轮数 12] [每对局数 14] [--write]
import fs from 'node:fs';
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { DECKS } from '../js/duel/gen.js';
const ROUNDS = Number(process.argv[2] || 12), N = Number(process.argv[3] || 14), WRITE = process.argv.includes('--write');
const P = new URL('../data/duel-packs.json', import.meta.url);
const packs = JSON.parse(fs.readFileSync(P, 'utf8'));
const lp = Object.fromEntries(packs.decks.map((d) => [d.id, d.lp || 0]));
const hand = Object.fromEntries(packs.decks.map((d) => [d.id, d.hand || 0]));
function measure() {
  const w = {}, n = {};
  for (let ia = 0; ia < DECKS.length; ia++) for (let ib = 0; ib < DECKS.length; ib++) {
    if (ia === ib) continue;
    for (let s = 0; s < N; s++) {
      const a = DECKS[ia], b = DECKS[ib];
      const seed = (555001 + ia * 7919 + ib * 104729 + s * 77) >>> 0;
      const G = E.createGame({ cards: a.cards, extra: a.extra, lp: lp[a.id], hand: hand[a.id] }, { cards: b.cards, extra: b.extra, lp: lp[b.id], hand: hand[b.id] }, { seed });
      let steps = 0;
      while (!G.over && G.turn <= 60 && steps++ < 8000) {
        const act = nextAction(G, G.active, 'normal');
        if (!act) break;
        G.trapPolicy = aiPolicyFor(G, G.active, act, 'normal');
        E.applyAction(G, G.active, act);
        G.trapPolicy = null;
      }
      n[a.id] = (n[a.id] || 0) + 1; n[b.id] = (n[b.id] || 0) + 1;
      if (G.over && G.winner === 0) w[a.id] = (w[a.id] || 0) + 1;
      if (G.over && G.winner === 1) w[b.id] = (w[b.id] || 0) + 1;
    }
  }
  return Object.fromEntries(DECKS.map((d) => [d.id, (w[d.id] || 0) / n[d.id]]));
}
for (let r = 0; r < ROUNDS; r++) {
  const wr = measure();
  const spread = Math.max(...Object.values(wr)) - Math.min(...Object.values(wr));
  console.log(`轮 ${r}`, DECKS.map((d) => `${d.id}:${Math.round(wr[d.id] * 100)}`).join(' '), `极差 ${Math.round(spread * 100)}`);
  for (const d of DECKS) {
    const gap = 0.5 - wr[d.id];
    // 先用起手张数（-2 ~ +3，每次最多动 1 张）拉大头，命轮值（±2000，250 一档）做微调
    if (Math.abs(gap) > 0.06) hand[d.id] = Math.max(-2, Math.min(3, hand[d.id] + Math.sign(gap)));
    lp[d.id] = Math.max(-2000, Math.min(2000, Math.round((lp[d.id] + gap * 2500) / 250) * 250));
  }
}
const wr = measure();
console.log('最终', DECKS.map((d) => `${d.id}:${Math.round(wr[d.id] * 100)}(${lp[d.id] >= 0 ? '+' : ''}${lp[d.id]}/${hand[d.id] >= 0 ? '+' : ''}${hand[d.id]}张)`).join(' '));
if (WRITE) {
  for (const d of packs.decks) { if (lp[d.id]) d.lp = lp[d.id]; else delete d.lp; if (hand[d.id]) d.hand = hand[d.id]; else delete d.hand; }
  fs.writeFileSync(P, JSON.stringify(packs, null, 1));
  console.log('已写入 data/duel-packs.json');
}
