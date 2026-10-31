// 唤醒王：决斗链接 · 无头体检：N×N 套预组 AI 对 AI（规则抛错 / 死循环 / 卡牌总数守恒 / 手牌上限 / LP 异常）+ 数据校验。
// 用法：node scripts/duel-sim.mjs [每对每方向局数，默认 12]
//
// 关于局数：每局的结果对洗牌种子敏感得离谱——同一个种子下 17 个对手会看到相似的起手
// 质量（共模），所以「用同一个种子跑所有对手」时，N 局其实只有 1 个样本，胜率能在
// 14%~89% 之间乱跳。这里改成每局独立种子（对手 × 方向 × 局号），N=12 大约还有
// ±3 个百分点的误差，要判 45%~55% 这种窄区间请用 N≥40。
import * as E from '../js/duel/engine.js';
import { nextAction } from '../js/duel/ai.js';
import { DECKS, CARDS, PACKS, BONDS, ART } from '../js/duel/gen.js';
const N = Number(process.argv[2] || 12);
const total = (G) => G.players.reduce((n, p) => n + p.deck.length + p.hand.length + p.grave.length + p.mons.filter(Boolean).length + p.spells.filter(Boolean).length + p.extra.length, 0);
const problems = new Map(); const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);
const res = { win0: 0, win1: 0, draw: 0, timeout: 0, turns: 0, games: 0 };
const byDeck = {};
for (let ia = 0; ia < DECKS.length; ia++) for (let ib = 0; ib < DECKS.length; ib++) for (let s = 0; s < N; s++) {
  const a = DECKS[ia], b = DECKS[ib];
  const seed = (777001 + ia * 7919 + ib * 104729 + s * 77) >>> 0;
  let G;
  try { G = E.createGame({ cards: a.cards, extra: a.extra }, { cards: b.cards, extra: b.extra }, { seed }); } catch (e) { note('createGame 抛错 ' + e.message); continue; }
  const t0 = total(G); let steps = 0, lastTurn = 0, actsThisTurn = 0;
  try {
    while (!G.over && G.turn <= 60) {
      if (++steps > 12000) { note('死循环/步数过多'); break; }
      const side = G.active;
      const act = nextAction(G, side, 'normal');
      if (!act) { note('AI 没给动作'); break; }
      if (G.turn !== lastTurn) { lastTurn = G.turn; actsThisTurn = 0; }
      if (++actsThisTurn > 120) { note('一个回合内动作 >120（卡死）'); break; }
      const r = E.applyAction(G, side, act);
      if (r && r.ok === false && act.t !== 'attack' && act.t !== 'pos') note(`AI 动作被拒绝 ${act.t}: ${String(r.msg || r.err || '').slice(0, 40)}`);
      for (const p of G.players) {
        if (p.hand.length > E.HAND_MAX + 1) note('手牌超过上限 ' + p.hand.length);
        if (p.lp < 0 && !G.over) note('LP 为负但没结束');
        if (!Number.isFinite(p.lp)) note('LP 非有限');
      }
    }
  } catch (e) { note('运行抛错 ' + String(e.message).slice(0, 80) + ' @' + (e.stack || '').split('\n')[1]?.trim().slice(0, 70)); }
  res.games++; res.turns += G.turn;
  if (!G.over) { res.timeout++; } else if (G.winner === 0) res.win0++; else if (G.winner === 1) res.win1++; else res.draw++;
  byDeck[a.id] = byDeck[a.id] || { w: 0, n: 0 }; byDeck[b.id] = byDeck[b.id] || { w: 0, n: 0 };
  byDeck[a.id].n++; byDeck[b.id].n++; if (G.over && G.winner === 0) byDeck[a.id].w++; if (G.over && G.winner === 1) byDeck[b.id].w++;
  // 衍生物是「凭空多出来的身位」，会把总数顶上去，所以算守恒要把它们扣掉
  const tok = G.players.reduce((n, p) => n + p.mons.filter((m) => m && CARDS[m.id] && CARDS[m.id].token).length, 0);
  const t1 = total(G) - tok; if (t1 !== t0) note(`卡牌总数变了 ${t0} → ${t1}`);
}
console.log(res, '平均回合', (res.turns / res.games).toFixed(1));
console.log('卡组胜率', Object.entries(byDeck).map(([k, v]) => `${k}:${Math.round(v.w / v.n * 100)}%`).join(' '));
console.log('问题:', [...problems.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15));

// ---- 数据校验 ----
const bad = [];
const ids = Object.keys(CARDS);
for (const id of ids) { const c = CARDS[id];
  if (!c.n) bad.push(`${id} 没名字`);
  if ((c.k === 'M' || c.k === 'E') && !(c.atk >= 0 && c.def >= 0)) bad.push(`${id} ${c.n} 攻防缺失`);
  if (!['N', 'R', 'SR', 'UR', 'GR'].includes(c.rar)) bad.push(`${id} ${c.n} 稀有度 ${c.rar}`);
  if (!((c.art || c.n) in ART.index)) bad.push(`${id} ${c.n} 没有卡面图索引`);
}
const nm = new Map(); for (const id of ids) { if (nm.has(CARDS[id].n)) bad.push(`重名：${CARDS[id].n}`); nm.set(CARDS[id].n, id); }
const inPack = new Set(PACKS.flatMap((p) => p.cards));
for (const pk of PACKS) for (const id of pk.cards) if (!CARDS[id]) bad.push(`卡包 ${pk.id} 含不存在的卡 ${id}`);
// 衍生物不进卡包：它只能被效果叫出来，也没有收藏价值
for (const id of ids) if (!CARDS[id].token && !inPack.has(id)) bad.push(`${id} ${CARDS[id].n} 不在任何卡包里，开不出来`);
for (const pk of PACKS) if (!pk.cards.some((id) => ['SR', 'UR', 'GR'].includes(CARDS[id].rar))) bad.push(`卡包 ${pk.id} 没有 SR 以上，保底抽不出`);
// 主卡组 40~50、额外卡组 ≤10、额外里「直接召唤」≤2 —— 与 build.mjs / 编辑器同一套口径
const DECK_MIN = 40, DECK_MAX = 50, EXTRA_MAX = 10, DIRECT_MAX = 2;
for (const d of DECKS) {
  const n = d.cards.reduce((s, [, k]) => s + k, 0);
  if (n < DECK_MIN || n > DECK_MAX) bad.push(`卡组 ${d.n} 主卡组 ${n} 张（要求 ${DECK_MIN}~${DECK_MAX}）`);
  if (d.extra.length > EXTRA_MAX) bad.push(`卡组 ${d.n} 额外卡组 ${d.extra.length} 张（上限 ${EXTRA_MAX}）`);
  const directs = d.extra.filter((id) => CARDS[id] && CARDS[id].direct).length;
  if (directs > DIRECT_MAX) bad.push(`卡组 ${d.n} 有 ${directs} 张直接召唤（上限 ${DIRECT_MAX}）`);
  const copies = new Map();
  for (const [id, k] of d.cards) {
    if (!CARDS[id] || CARDS[id].k === 'E') bad.push(`卡组 ${d.n} 主卡组里的 ${id} 不合法`);
    copies.set(id, (copies.get(id) || 0) + k);
  }
  for (const [id, k] of copies) if (k > 3) bad.push(`卡组 ${d.n} 同名卡 ${CARDS[id] ? CARDS[id].n : id} 放了 ${k} 张（上限 3）`);
  for (const id of d.extra) if (!CARDS[id] || CARDS[id].k !== 'E') bad.push(`卡组 ${d.n} 额外卡组 ${id} 不是觉醒体`);
  // 素材不在这套牌里，这张觉醒体永远召不出来
  const have = new Set(d.cards.map(([cid]) => CARDS[cid] && CARDS[cid].n));
  for (const id of d.extra) {
    const e = CARDS[id];
    if (!e || e.matRealm || e.direct) continue;   // 直接召唤只看场面条件 / 命轮值，不要素材
    for (const nm of e.mat || []) if (!have.has(nm)) bad.push(`卡组 ${d.n} 的觉醒体「${e.n}」缺素材「${nm}」`);
  }
}
const names = new Set(ids.map((i) => CARDS[i].n));
for (const b of BONDS) for (const x of b.need || []) if (!names.has(x)) bad.push(`羁绊 ${b.n} 需要的「${x}」不在卡表里`);
for (const id of ids) if (CARDS[id].k === 'E') for (const x of CARDS[id].mat || []) if (!names.has(x)) bad.push(`觉醒体 ${CARDS[id].n} 素材「${x}」不存在`);
console.log(bad.length ? '数据问题：\n' + bad.join('\n') : '数据校验通过（' + ids.length + ' 张卡）');
if (bad.length || problems.size) process.exitCode = 1;
