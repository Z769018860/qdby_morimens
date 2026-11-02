// 唤醒王：决斗链接 · 自组卡组对抗性体检。
//
// 起因：玩家自己组一套「满编特召 + 速攻」的牌，人机拿它没办法，顺着段位一路推平。
// 那一轮加了三道对策（每回合特召 2 次上限、直接召唤也吃召唤陷阱、两张反特召陷阱），
// 这一轮补第四道：自组卡组现在会被按「最像哪几套预组」查对位表，对手真的会挑克你的。
//
// 这个脚本量最后这一道的效果：同一副速攻牌，在「对手按代理权重挑牌」和「一律当 50%」
// 两种设定下各打一遍，看玩家胜率差多少。数字越小越说明对手真的接住了。
//
// 用法：node scripts/duel-rush-check.mjs [每档局数，默认 60]
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { aiFor, foePick, foeIds, proxyWeights } from '../js/duel/rank.js';
import { DECKS, PRESETS } from '../js/duel/gen.js';

const N = Number(process.argv[2] || 60);

// 那副「速攻」自组牌：低费铺场 + 抽牌 + 特召素材，额外塞夺怪（e23 窃声·缠丝母体）与速攻觉醒体。
const RUSH = {
  id: 'mine-rush',
  n: '我的速攻',
  cards: [['m01', 3], ['m02', 3], ['m07', 3], ['m11', 3], ['m13', 3], ['m14', 3], ['m28', 2], ['m68', 2],
    ['s12', 2], ['s25', 2], ['s30', 2], ['s53', 1], ['s55', 1], ['s59', 1],
    ['s06', 2], ['s82', 2], ['s81', 2], ['s01', 1], ['s05', 2]],
  extra: ['e23', 'e19', 'e20', 'e21', 'e24'],
  lp: 0, hand: 0,
};

const IDS = DECKS.map((d) => d.id);
const myW = proxyWeights(RUSH.cards, PRESETS);

function play(myDeck, foeDeck, seed) {
  let G;
  try {
    G = E.createGame({ cards: myDeck.cards, extra: myDeck.extra, lp: myDeck.lp || 0, hand: myDeck.hand || 0 },
      { cards: foeDeck.cards, extra: foeDeck.extra, lp: foeDeck.lp || 0, hand: foeDeck.hand || 0 }, { seed });
  } catch { return null; }
  let steps = 0, lastTurn = 0, acts = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) return null;
      const side = G.active;
      const act = nextAction(G, side, 'normal');
      if (!act) return null;
      if (G.turn !== lastTurn) { lastTurn = G.turn; acts = 0; }
      if (++acts > 120) return null;
      G.trapPolicy = aiPolicyFor(G, side, act, 'normal');
      E.applyAction(G, side, act);
      G.trapPolicy = null;
    }
  } catch { return null; }
  return G.over ? (G.winner === 0 ? 'win' : (G.winner === 1 ? 'lose' : 'draw')) : 'timeout';
}

// 一个可复现的随机流：同一批种子喂给两种设定，差别才只剩「挑牌策略」这一项
const rndStream = (base) => {
  let s = base >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
};

const rows = [];
for (const [label, diff, tier] of [['Lv10 命轮本身', 'hard', 8], ['Lv14 弥萨格校猫', 'hard', 12]]) {
  const ai = aiFor(diff, tier);
  const pool = foeIds(IDS, ai.pool);
  const r = { label, lv: ai.lv, on: 0, off: 0, n: 0 };
  for (let i = 0; i < N; i++) {
    // 同一条种子流走两遍，第二遍把这个种子原样复用，先手/起手完全一样
    const rnd = rndStream(700001 + i * 131);
    const idOn = foePick(ai.pool, RUSH.id, pool, rnd, { ...ai, my: myW });
    const idOff = foePick(ai.pool, RUSH.id, pool, rndStream(700001 + i * 131), ai);
    const foeOn = DECKS.find((d) => d.id === idOn);
    const foeOff = DECKS.find((d) => d.id === idOff);
    if (!foeOn || !foeOff) continue;
    const seed = (900101 + i * 7919) >>> 0;
    const a = play(RUSH, foeOn, seed);
    const b = play(RUSH, foeOff, seed);
    if (!a || !b || a === 'timeout' || b === 'timeout') continue;
    r.n++;
    if (a === 'win') r.on++;
    if (b === 'win') r.off++;
  }
  rows.push(r);
  const on = 100 * r.on / r.n, off = 100 * r.off / r.n;
  console.log(`${label}（Lv${r.lv}） 速攻胜率：按代理权重挑 ${on.toFixed(1)}% ｜ 一律当 50% ${off.toFixed(1)}%`
    + `  → 压制 ${(off - on).toFixed(1)}pp   (${r.n} 局)`);
}

console.log('\n代理权重（这套速攻最像哪几套预组）：', myW);
