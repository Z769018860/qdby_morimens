// 蚀界方块 v3 的平衡模拟：让一个贪心 AI 把每一关跑 N 局，看通关率、行数和评级分布。
// 用法：node scripts/block-sim.mjs [局数] [种子]
//
// v3 是回合制的（松手才会上浮），所以不用按时间推进；AI 每回合枚举所有列，
// 用「消行最多 → 堆得最低 → 洞最少」挑一个，然后直接落定。

import {
  LEVELS, newRun, moveTo, release, settle, floatTarget,
} from '../js/block-core.js';

const N = Number(process.argv[2]) || 60;
const SEED = Number(process.argv[3]) || 20261103;

// 在不动 st 的前提下试摆一块，返回落点与结果
function probe(st, ox) {
  const p = st.cur;
  if (!p) return null;
  const ty = floatTarget(st, p, ox);
  if (ty < 0) return { ty, ok: false };

  const added = [];
  for (const cl of p.cells) {
    const r = ty + cl.dr;
    const c = ox + cl.dc;
    if (r >= 0 && r < st.rows && c >= 0 && c < st.cols) {
      st.board[r][c] = { r: p.realm, sp: cl.sp, hp: cl.hp || 1, __t: 1 };
      added.push([r, c]);
    }
  }

  // 满行
  let full = 0;
  for (let r = 0; r < st.rows; r++) {
    let ok = true;
    for (let c = 0; c < st.cols; c++) if (!st.board[r][c]) { ok = false; break; }
    if (ok) full++;
  }

  // 高度（行 0 在最上面）：最高的一块离水面有多远
  let top = st.rows;
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) if (st.board[r][c]) { top = Math.min(top, r); }
  }
  const height = st.rows - top;

  // 洞：某一列有方块，它下面还有空格
  let holes = 0;
  for (let c = 0; c < st.cols; c++) {
    let seen = false;
    for (let r = 0; r < st.rows; r++) {
      if (st.board[r][c]) seen = true;
      else if (seen) holes++;
    }
  }

  // 水面平整度：每一列方块的顶端高度
  const surf = [];
  for (let c = 0; c < st.cols; c++) {
    let t2 = st.rows;
    for (let r = 0; r < st.rows; r++) if (st.board[r][c]) { t2 = r; break; }
    surf.push(st.rows - t2);
  }
  let rough = 0;
  for (let i = 1; i < surf.length; i++) rough += Math.abs(surf[i] - surf[i - 1]);

  for (const [r, c] of added) st.board[r][c] = null;

  return { ty, ok: true, full, height, holes, rough };
}

function choose(st) {
  const p = st.cur;
  const best = { ox: p.ox, score: -Infinity };
  for (let ox = 0; ox + p.w <= st.cols; ox++) {
    const r = probe(st, ox);
    if (!r || !r.ok) continue;
    // 消行最值钱；其次压低高度；再其次少留洞、表面别起伏
    const score = r.full * 1000 - r.height * 6 - r.holes * 14 - r.rough * 3;
    if (score > best.score) {
      best.score = score;
      best.ox = ox;
    }
  }
  return best.ox;
}

function playOne(lv, seed) {
  const st = newRun(lv.id, seed);
  st.goal = 0; // 跑到底，看它这一局到底能消多少行，而不是刚够目标就停
  let guard = 0;
  while (!st.over && !st.win && guard++ < 500) {
    if (!st.cur) break;
    const ox = choose(st);
    moveTo(st, ox);
    release(st);
    settle(st);
  }
  return st;
}

const pad = (s, n) => String(s).padStart(n);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

let totalWin = 0;
let totalN = 0;

console.log(`局数 ${N}/关，种子 ${SEED}`);
console.log('关  目标  回合  达标率  平均行  中位行  平均分  最高行  25%~75%');
for (const lv of LEVELS) {
  let wins = 0;
  let lines = 0;
  let score = 0;
  let best = 0;
  const arr = [];
  for (let i = 0; i < N; i++) {
    const st = playOne(lv, SEED + i * 7919);
    if (st.win) wins++;
    lines += st.lines;
    score += st.score;
    best = Math.max(best, st.lines);
    arr.push(st.lines);
  }
  arr.sort((a, b) => a - b);
  const med = arr[(arr.length / 2) | 0];
  // 按实测分布估「达标率」：goal 是关卡写死的那个数
  let reach = 0;
  for (const v of arr) if (lv.goal && v >= lv.goal) reach++;
  const p25 = arr[Math.floor(arr.length * 0.25)];
  const p75 = arr[Math.floor(arr.length * 0.75)];
  totalWin += reach;
  totalN += N;
  console.log(
    `${pad(lv.id, 2)}  ${pad(lv.goal || '—', 4)}  ${pad(lv.moves || '—', 4)}  `
    + `${pad(pct(reach, N) + '%', 6)}  ${pad((lines / N).toFixed(1), 6)}  ${pad(med, 6)}  `
    + `${pad(Math.round(score / N), 6)}  ${pad(best, 6)}   ${pad(p25, 4)}~${pad(p75, 4)}`,
  );
}
console.log(`平均达标率 ${pct(totalWin, totalN)}%`);
