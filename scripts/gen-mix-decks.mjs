// 唤醒王：决斗链接 · 生成「人机用的混合卡组」。
//
// 混合卡组 = 把两套预组各拆一半拼成的一副牌，也就是玩家自组卡组最典型的形态。
// 人机一直只会用 22 套预组，玩家自己混着组一套（尤其满编特召 + 速攻）就能压着打；
// 这一批是给对手也发几副混牌，让「混」不再是玩家单方面的优势。
//
// 生成是**确定性**的：同一次运行、同一个种子，拼出来的牌完全一样，所以结果是数据不是算法——
// 跑一次写进 data/duel-packs.json，之后 build 只是读它。
//
// 用法：
//   node scripts/gen-mix-decks.mjs            # 只体检：生成 24 组候选，量整体胜率
//   node scripts/gen-mix-decks.mjs --write    # 把挑中的 12 组写进 data/duel-packs.json
import fs from 'node:fs';
import * as E from '../js/duel/engine.js';
import { nextAction, aiPolicyFor } from '../js/duel/ai.js';
import { DECKS, CARDS } from '../js/duel/gen.js';

const WRITE = process.argv.includes('--write');
const N = Number(process.env.N || 12);        // 每对局数
const BASE = DECKS.filter((d) => !d.foeOnly && !d.mix);   // 只拿预组当原料
const MAX_COPY = 3, DECK_SIZE = 40, EXTRA_MAX = 10, DIRECT_MAX = 2;

const flat = (d) => { const out = []; for (const [id, n] of d.cards) for (let i = 0; i < n; i++) out.push(id); return out; };

// 均匀抽样而不是切前 20 张：预组把同名牌写在相邻位置，直接切会拿到清一色。
function pick(arr, want) {
  const step = arr.length / want;
  return Array.from({ length: want }, (_, i) => arr[Math.min(arr.length - 1, Math.floor((i + 0.5) * step))]);
}

function mixDeck(a, b, seed) {
  const pool = pick(flat(a), DECK_SIZE / 2).concat(pick(flat(b), DECK_SIZE / 2));
  const cnt = new Map();
  for (const id of pool) cnt.set(id, (cnt.get(id) || 0) + 1);
  const out = [];
  for (const [id, n] of cnt) for (let i = 0; i < Math.min(n, MAX_COPY); i++) out.push(id);
  // 同名超 3 张被裁掉的部分，用两边的牌补齐（补还放得下的那些）
  const spare = flat(a).concat(flat(b));
  let st = seed >>> 0 || 7;
  const rnd = () => ((st = (st * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  let guard = 0;
  while (out.length < DECK_SIZE && guard++ < 4000) {
    const id = spare[Math.floor(rnd() * spare.length)];
    if (out.filter((x) => x === id).length < MAX_COPY) out.push(id);
  }
  // 每套混牌都要留一张反特召（t48/t49）。22 套预组都带一张，目的就是别让「满编特召 + 速攻」
  // 一路通到底；混牌是从它们身上各拆一半，抽漏了就等于给速通留了个口子。
  const ANTI = ['t48', 't49'];
  if (!out.some((id) => ANTI.includes(id))) {
    const cnt0 = new Map();
    for (const id of out) cnt0.set(id, (cnt0.get(id) || 0) + 1);
    const i = out.findIndex((id) => cnt0.get(id) >= 2);     // 优先让掉一张重复的
    out[i >= 0 ? i : out.length - 1] = ANTI[seed % 2];
  }
  const bag = new Map();
  for (const id of out) bag.set(id, (bag.get(id) || 0) + 1);

  // 额外卡组：素材还在这副牌里的才留；直接召唤最多 2 张（build.mjs 也会卡这条）
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
  return { cards: [...bag.entries()], extra };
}

// 短名：预组全名是「终天教团 · 熵火」，混合卡组只需要后半段
const short = (d) => String(d.n).split('·').pop().trim();

// 候选搭配：24 组互不相同的无序对，固定种子
const cands = [];
{
  const seen = new Set();
  let sd = 20261102;
  const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  while (cands.length < 40 && seen.size < 1400) {
    const i = Math.floor(rnd() * BASE.length);
    const j = Math.floor(rnd() * BASE.length);
    if (i === j) continue;
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const a = BASE[Math.min(i, j)], b = BASE[Math.max(i, j)];
    cands.push({ a, b, ...mixDeck(a, b, 4200 + cands.length * 331) });
  }
}

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

// 每组候选 vs 全部预组：量「预组一方」的胜率，也就是这套混牌有多强
console.log(`每对 ${N} 局（互换先手）· ${cands.length} 组候选 × ${BASE.length} 套预组`);
const rows = [];
for (let ci = 0; ci < cands.length; ci++) {
  const M = cands[ci];
  let w = 0, n = 0;
  for (let di = 0; di < BASE.length; di++) {
    const D = BASE[di];
    for (let s = 0; s < N; s++) {
      const seed = (517001 + ci * 7919 + di * 104729 + s * 233) >>> 0;
      // 互换先手：s 偶数时 0 号位是预组，奇数时 0 号位是混牌。
      // 判赢必须跟着座位走——直接写 r===0 会把一半的局判反（这一版踩过）。
      const r = s % 2 === 0 ? runOne(D, M, seed) : runOne(M, D, seed);
      if (r === null || r === 'timeout' || r === 'draw') continue;
      n++;
      if (s % 2 === 0 ? r === 0 : r === 1) w++;
    }
  }
  const wr = n ? (100 * w / n) : 0;
  rows.push({ ...M, n: n, deckWr: wr, mixWr: 100 - wr });
  console.log(`${String(ci + 1).padStart(2)} ${short(M.a)}＋${short(M.b)}`.padEnd(28)
    + `混牌胜率 ${(100 - wr).toFixed(1)}%  (${n} 局)`);
}

// 挑 12 组。两条讲究：
//   1) 强度必须贴 50（±8 以内）——太弱的混牌在 foeBand 的高段窗口里根本排不进去，
//      等于白占位；它们只在 pool 小的时候才可能被选，而那档位又不放混牌。
//   2) 同一套预组最多出现 2 次，免得 12 套混牌翻来覆去就那两套。
rows.sort((x, y) => Math.abs(x.mixWr - 50) - Math.abs(y.mixWr - 50));
const pickWith = (limit) => {
  const used = new Map();
  const out = [];
  for (const r of rows) {
    if (out.length >= 12) break;
    if (Math.abs(r.mixWr - 50) > limit) continue;
    const na = used.get(r.a.id) || 0, nb = used.get(r.b.id) || 0;
    if (na >= 2 || nb >= 2) continue;
    out.push(r);
    used.set(r.a.id, na + 1); used.set(r.b.id, nb + 1);
  }
  return out;
};
let chosen = pickWith(8);
if (chosen.length < 12) chosen = pickWith(12);
if (chosen.length < 12) chosen = pickWith(99);
console.log('\n— 挑中的 12 组 —');
for (const r of chosen) console.log(`${short(r.a)}＋${short(r.b)}`.padEnd(24) + `混牌胜率 ${r.mixWr.toFixed(1)}%`);

if (!WRITE) { console.log('\n（没有 --write，什么都没改）'); process.exit(0); }

// 写进 data/duel-packs.json：id x01..x12，标 foeOnly（玩家列表里不出现）。
// 这个文件是一行一套预组的手写格式（bonds 里的 fx 还压在一行里），整份 JSON.parse → stringify
// 会把整个文件重排成上万行 diff，所以这里只做**文本插入**：往 decks 数组末尾塞几行。
const P = 'data/duel-packs.json';
let s = fs.readFileSync(P, 'utf8');
// 已经写过一轮就先剥掉（它们一定在数组末尾、连成一段），不然会叠着插
s = s.replace(/,\n  \{"id":\s*"x\d\d"[\s\S]*?(?=\n \])/, '');
const TAIL = '\n ]\n}';
const at = s.lastIndexOf(TAIL);
if (at < 0) { console.error('没找到 decks 数组的结尾，文件结构变了'); process.exit(1); }
const lines = chosen.map((r, i) => JSON.stringify({
  id: 'x' + String(i + 1).padStart(2, '0'),
  n: `混合 · ${short(r.a)}＋${short(r.b)}`,
  en: 'HYBRID ARCHIVE',
  r: r.a.r,
  mix: [r.a.id, r.b.id],
  foeOnly: true,
  desc: `人机把「${r.a.n}」和「${r.b.n}」各拆一半拼起来的一副牌。混牌拼不出羁绊，换来的是两边最顺手的那几张都在。`,
  cards: r.cards,
  extra: r.extra,
}).replace(/","/g, '", "').replace(/":\[/g, '": ['));
s = s.slice(0, at) + ',\n' + lines.map((l) => '  ' + l).join(',\n') + s.slice(at);
JSON.parse(s);            // 插完就地验一遍，坏了立刻知道
fs.writeFileSync(P, s);
console.log(`\n已写入 ${P}（新增 ${chosen.length} 套混合卡组）`);
