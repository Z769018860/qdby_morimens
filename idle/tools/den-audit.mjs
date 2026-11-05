// 逆潮守关平衡体检：在 Node 里把全部关卡跑一遍（不碰 DOM），按 10 关一章汇总。
//
// 两种「玩家」：
//   · 会玩的人：每关随机搜 K 套配队，取结果最好的那套（大致等于「认真配过的阵容」）
//   · 抄近路的人：只上一只最强的怪（验证「一个大怪碾压」不存在）
// 输出每 10 关的通过率、平均星级、平均回合，以及「单怪阵容」的通过率。
import fs from 'node:fs';
import * as G from '../src/core/game.js';
import * as D from '../src/core/denrun.js';

const pack = JSON.parse(fs.readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
let sp = {};
try { sp = JSON.parse(fs.readFileSync(new URL('../public/data/special.json', import.meta.url))); } catch {}
const data = G.indexData({ ...pack, special: sp });
const state = G.newState(data, 1);

const K = Number(process.argv[2]) || 24;
const DO_SOLO = process.argv.includes('--solo');
const rngOf = (seed) => { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); };

function randomPicks(n, rnd, maxSlots = 5) {
  const st = D.denStage(n);
  const pool = D.denPool(data, n).list;
  const picks = [];
  const seen = new Set();
  let used = 0;
  // 一直到塞不下为止：真玩家不会放着预算不用
  for (let guard = 0; guard < 40 && picks.length < maxSlots; guard++) {
    const t = ['t1', 't2', 't3'][Math.floor(rnd() * 3)];
    const cands = pool.filter((m) => !seen.has(m.id) && used + D.monCost(m, t) <= st.cpu + 1e-6);
    if (!cands.length) break;
    const m = cands[Math.floor(rnd() * cands.length)];
    used += D.monCost(m, t);
    seen.add(m.id);
    picks.push({ id: m.id, tier: t });
  }
  return picks;
}

function bestOf(n, tries) {
  const rnd = rngOf(0x9e3779b9 ^ (n * 2654435761));
  let best = null;
  for (let k = 0; k < tries; k++) {
    const picks = randomPicks(n, rnd);
    if (!picks.length) continue;
    const out = D.denFight(state, data, n, picks);
    if (!out.ok) continue;
    // 先看赢没赢，再看剩余血量与回合数
    const score = (out.win ? 10000 : 0) + out.hpLeft * 200 - out.playerLeft * 100 - out.res.rounds;
    if (!best || score > best.score) best = { picks, out, score };
  }
  return best;
}

function soloBest(n) {
  // 只上一只：在能负担的怪里挑「算力最高 / 属性最强」的那只
  const st = D.denStage(n);
  const pool = D.denPool(data, n).list;
  let best = null;
  for (const m of pool) {
    for (const t of ['t3', 't2', 't1']) {
      if (D.monCost(m, t) > st.cpu + 1e-6) continue;
      const out = D.denFight(state, data, n, [{ id: m.id, tier: t }]);
      if (!out.ok) continue;
      const score = (out.win ? 10000 : 0) + out.hpLeft * 200 - out.playerLeft * 100;
      if (!best || score > best.score) best = { picks: [{ id: m.id, tier: t }], out, score };
    }
  }
  return best;
}

const rows = [];
let totWin = 0, totStars = 0, totSolo = 0;
for (let n = 1; n <= D.DEN_MAX; n++) {
  const b = bestOf(n, K);
  const solo = DO_SOLO ? soloBest(n) : null;
  const win = b?.out.win ? 1 : 0;
  const stars = b?.out.stars || 0;
  totWin += win; totStars += stars; totSolo += solo?.out.win ? 1 : 0;
  rows.push({ n, win, stars, rounds: b?.out.res.rounds || 0, hp: b?.out.hpLeft || 0, solo: solo?.out.win ? 1 : 0, picks: b?.picks || [], cpu: D.denStage(n).cpu });
  if (n % 10 === 0) {
    const seg = rows.slice(n - 10);
    const w = seg.reduce((s, x) => s + x.win, 0), st2 = seg.reduce((s, x) => s + x.stars, 0);
    const so = seg.reduce((s, x) => s + x.solo, 0);
    const avgRound = seg.reduce((s, x) => s + (x.win ? x.rounds : 20), 0) / 10;
    console.log(`第 ${String(n / 10).padStart(2)} 章（${n - 9}–${n}）  通过 ${String(w).padStart(2)}/10  均星 ${(st2 / 10).toFixed(2)}  均回合 ${avgRound.toFixed(1)}  单体阵容通过 ${so}/10  预算 ${seg[0].cpu}→${seg[9].cpu}`);
  }
}
console.log(`\n总计：通过 ${totWin}/${D.DEN_MAX}　均星 ${(totStars / D.DEN_MAX).toFixed(2)}　单怪阵容通过 ${totSolo}/${D.DEN_MAX}`);

if (process.argv.includes('--detail')) {
  for (const r of rows) console.log(`#${String(r.n).padStart(3)} ${r.win ? '胜' : '负'} ${r.stars}★ ${String(r.rounds).padStart(2)}R 我方${(r.hp * 100).toFixed(0)}%  [${r.picks.map((p) => `${p.id}:${p.tier}`).join(',')}]`);
}
