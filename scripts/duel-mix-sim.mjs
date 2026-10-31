// 唤醒王：决斗链接 · 混合卡组体检。
// 「混合卡组」= 玩家把两套预组各拆一半拼成的一副牌（自组卡组的典型形态）：
// 主卡组 40 张、同名 ≤3、额外卡组只留素材还凑得齐 / 条件满足的那几张。
// 测两件事：
//   1) 每套混合卡组 vs 全部预组 —— 混合牌会不会被预组吊打，或者反过来碾压；
//   2) 混合 vs 混合 —— 混搭本身有没有哪一路组合强到失衡。
// 用法：node scripts/duel-mix-sim.mjs [每对局数，默认 6]
import * as E from '../js/duel/engine.js';
import { nextAction } from '../js/duel/ai.js';
import { DECKS, CARDS } from '../js/duel/gen.js';

const N = Number(process.argv[2] || 6);
const MAX_COPY = 3, DECK_SIZE = 40, EXTRA_MAX = 10, DIRECT_MAX = 2;

const total = (G) => G.players.reduce((n, p) => n + p.deck.length + p.hand.length + p.grave.length
  + p.mons.filter(Boolean).length + p.spells.filter(Boolean).length + p.extra.length, 0);

// ---- 拼一副混合卡组：两套各拆一半 ----
function flat(d) { const out = []; for (const [id, n] of d.cards) for (let i = 0; i < n; i++) out.push(id); return out; }

function mixDeck(a, b, seed) {
  // 均匀抽样（不是取前 20 张）：预组是把同名牌写在相邻位置的，直接切前 20 会拿到清一色
  const pick = (arr, want) => {
    const step = arr.length / want;
    return Array.from({ length: want }, (_, i) => arr[Math.min(arr.length - 1, Math.floor((i + 0.5) * step))]);
  };
  const pool = pick(flat(a), DECK_SIZE / 2).concat(pick(flat(b), DECK_SIZE / 2));
  const cnt = new Map();
  for (const id of pool) cnt.set(id, (cnt.get(id) || 0) + 1);
  const out = [];
  for (const [id, n] of cnt) for (let i = 0; i < Math.min(n, MAX_COPY); i++) out.push(id);
  // 同名被裁掉的部分用两边的牌补齐（补还放得下的那些）
  const spare = flat(a).concat(flat(b));
  let st = seed >>> 0 || 7;
  const rnd = () => ((st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let guard = 0;
  while (out.length < DECK_SIZE && guard++ < 4000) {
    const id = spare[Math.floor(rnd() * spare.length)];
    if (out.filter((x) => x === id).length < MAX_COPY) out.push(id);
  }
  const bag = new Map();
  for (const id of out) bag.set(id, (bag.get(id) || 0) + 1);
  const cards = [...bag.entries()];
  // 额外卡组：素材还在这副牌里的才留；直接召唤最多 2 张
  const names = new Set(out.map((id) => CARDS[id].n));
  const extra = [];
  let direct = 0;
  for (const id of a.extra.concat(b.extra)) {
    if (extra.includes(id) || extra.length >= EXTRA_MAX) continue;
    const e = CARDS[id];
    if (!e) continue;
    if (e.direct) { if (direct >= DIRECT_MAX) continue; direct++; extra.push(id); continue; }
    if ((e.mat || []).every((nm) => names.has(nm))) extra.push(id);
  }
  return { id: `${a.id}+${b.id}`, n: `${a.n} × ${b.n}`, cards, extra };
}

// ---- 跑一局 ----
const problems = new Map();
const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);

function runOne(A, B, seed) {
  let G;
  try { G = E.createGame({ cards: A.cards, extra: A.extra }, { cards: B.cards, extra: B.extra }, { seed }); }
  catch (e) { note('createGame 抛错 ' + e.message); return null; }
  const t0 = total(G);
  let steps = 0, lastTurn = 0, actsThisTurn = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) { note('死循环/步数过多'); break; }
      const side = G.active;
      const act = nextAction(G, side, 'normal');
      if (!act) { note('AI 没给动作'); break; }
      if (G.turn !== lastTurn) { lastTurn = G.turn; actsThisTurn = 0; }
      if (++actsThisTurn > 120) { note('一个回合内动作 >120（卡死）'); break; }
      const r = E.applyAction(G, side, act);
      if (r && r.ok === false && act.t !== 'attack' && act.t !== 'pos') note(`动作被拒绝 ${act.t}: ${String(r.msg || r.err || '').slice(0, 40)}`);
      for (const p of G.players) {
        if (p.hand.length > E.HAND_MAX + 1) note('手牌超过上限 ' + p.hand.length);
        if (p.lp < 0 && !G.over) note('LP 为负但没结束');
        if (!Number.isFinite(p.lp)) note('LP 非有限');
      }
    }
  } catch (e) { note('运行抛错 ' + String(e.message).slice(0, 90)); return null; }
  const tok = G.players.reduce((n, p) => n + p.mons.filter((m) => m && CARDS[m.id] && CARDS[m.id].token).length, 0);
  const t1 = total(G) - tok;
  if (t1 !== t0) note(`卡牌总数变了 ${t0} → ${t1}`);
  return (!G.over) ? 'timeout' : (G.winner === 0 ? 0 : (G.winner === 1 ? 1 : 'draw'));
}

// ---- 取样：24 副混合卡组，两两不同，覆盖尽量多的预组 ----
const mixes = [];
const seen = new Set();
let sd = 20261031;
const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
while (mixes.length < 24 && seen.size < 600) {
  const i = Math.floor(rnd() * DECKS.length);
  const j = Math.floor(rnd() * DECKS.length);
  if (i === j) continue;
  const key = i < j ? `${i}-${j}` : `${j}-${i}`;
  if (seen.has(key)) continue;
  seen.add(key);
  mixes.push(mixDeck(DECKS[Math.min(i, j)], DECKS[Math.max(i, j)], 9001 + mixes.length * 137));
}

// ---- 1) 混合 vs 预组 ----
const vs = mixes.map(() => ({ w: 0, n: 0, worst: ['', 99], best: ['', 0] }));
for (let mi = 0; mi < mixes.length; mi++) {
  const M = mixes[mi];
  for (let di = 0; di < DECKS.length; di++) {
    const D = DECKS[di];
    let w = 0, n = 0;
    for (let s = 0; s < N; s++) {
      const seed = (313001 + mi * 7919 + di * 104729 + s * 233) >>> 0;
      // 两边互换位置各打一半，抹掉先手优势
      const r = s % 2 === 0 ? runOne(M, D, seed) : runOne(D, M, seed);
      if (r === 'timeout') continue;
      n++;
      if (r === (s % 2 === 0 ? 0 : 1)) w++;
    }
    if (!n) continue;
    const pct = Math.round((w / n) * 100);
    vs[mi].w += w; vs[mi].n += n;
    if (pct < vs[mi].worst[1]) vs[mi].worst = [D.n, pct];
    if (pct > vs[mi].best[1]) vs[mi].best = [D.n, pct];
  }
}

// ---- 2) 混合 vs 混合 ----
const mx = mixes.map(() => ({ w: 0, n: 0 }));
for (let i = 0; i < mixes.length; i++) {
  for (let j = 0; j < mixes.length; j++) {
    if (i === j) continue;
    for (let s = 0; s < 2; s++) {
      const seed = (613001 + i * 7919 + j * 104729 + s * 977) >>> 0;
      const r = runOne(mixes[i], mixes[j], seed);
      if (r === 'timeout' || r === 'draw') continue;
      mx[i].n++; mx[j].n++;
      if (r === 0) mx[i].w++; else mx[j].w++;
    }
  }
}

console.log('混合卡组（两套预组各拆一半，主卡组 40 张）');
for (let i = 0; i < mixes.length; i++) {
  const M = mixes[i], v = vs[i], m = mx[i];
  console.log(`  ${String(v.n ? Math.round((v.w / v.n) * 100) : 0).padStart(3)}% vs 预组`
    + `  ${String(m.n ? Math.round((m.w / m.n) * 100) : 0).padStart(3)}% vs 混合`
    + `  [${M.n}] 最差打「${v.worst[0]}」${v.worst[1]}%  最强打「${v.best[0]}」${v.best[1]}%  (${M.cards.reduce((s, [, k]) => s + k, 0)} 张 / 额外 ${M.extra.length})`);
}
const agg = vs.reduce((o, v) => ({ w: o.w + v.w, n: o.n + v.n }), { w: 0, n: 0 });
const agg2 = mx.reduce((o, v) => ({ w: o.w + v.w, n: o.n + v.n }), { w: 0, n: 0 });
console.log(`整体：混合打预组 ${Math.round((agg.w / agg.n) * 100)}%（${agg.n} 局）`
  + ` · 混合打混合 ${Math.round((agg2.w / agg2.n) * 100)}%（${agg2.n} 局）`);
console.log('问题:', [...problems.entries()].sort((x, y) => y[1] - x[1]).slice(0, 12));
if (problems.size) process.exitCode = 1;
