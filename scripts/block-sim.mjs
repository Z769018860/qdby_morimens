// 蚀界方块 v4 数值模拟：贪心 AI 每关跑 N 局，看达标率和实际能撑多久。
//   node drafts/block/block-sim.mjs [每关局数] [种子]
//
// 贪心不是要证明「能过」，是要证明「想过的人过得去、乱摆的人过不去」。
// 所以除了完美贪心，还会额外跑一遍「手抖版」（有一定概率随机选），看梯度。
import {
  LEVELS, newRun, cellsOf, slideRange, commit,
} from '../js/block-core.js';

const N = Number(process.argv[2] || 30);
const SEED = Number(process.argv[3] || 20261103);

// ---------------------------------------------------------------- 复制盘面
const cloneBoard = (st) => st.board.map((row) => row.map((c) => (c ? { ...c } : null)));

// 在一块「假盘面」上执行：横移 → 重力 → 数满行。不动真状态。
function simulate(board, cols, rows, bid, d) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (board[r][c] && board[r][c].b === bid) cells.push({ r, c });
  }
  if (!cells.length) return null;
  const r0 = cells[0].r;
  if (cells.some((x) => board[x.r][x.c].sp === 'lock')) return null;
  const c0 = Math.min(...cells.map((x) => x.c));
  const c1 = Math.max(...cells.map((x) => x.c));
  let left = 0;
  while (c0 - left - 1 >= 0 && !board[r0][c0 - left - 1]) left++;
  let right = 0;
  while (c1 + right + 1 < cols && !board[r0][c1 + right + 1]) right++;
  const dd = Math.max(-left, Math.min(right, d));
  if (!dd) return null;
  const vals = cells.map((x) => ({ c: x.c, v: board[r0][x.c] }));
  for (const x of vals) board[r0][x.c] = null;
  for (const x of vals) board[r0][x.c + dd] = x.v;

  // 重力：整段一起掉，只要有一格有支撑就架住
  let guard = 0;
  while (guard++ < 240) {
    const bids = new Set();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (board[r][c]) bids.add(board[r][c].b);
    let any = false;
    for (const b of bids) {
      const cs = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (board[r][c] && board[r][c].b === b) cs.push({ r, c });
      if (!cs.length) continue;
      const rr = cs[0].r;
      if (rr + 1 >= rows) continue;
      if (cs.some((x) => board[rr + 1][x.c])) continue;
      for (const x of cs) { board[rr + 1][x.c] = board[x.r][x.c]; board[x.r][x.c] = null; }
      any = true;
    }
    if (!any) break;
  }

  // 统计
  let full = 0;
  for (let r = 0; r < rows; r++) {
    let f = true;
    for (let c = 0; c < cols; c++) if (!board[r][c]) { f = false; break; }
    if (f) full++;
  }
  let height = 0;
  let holes = 0;
  for (let c = 0; c < cols; c++) {
    let top = rows;
    for (let r = 0; r < rows; r++) if (board[r][c]) { top = r; break; }
    height += rows - top;
    let seen = false;
    for (let r = 0; r < rows; r++) {
      if (board[r][c]) seen = true;
      else if (seen) holes++;
    }
  }
  return { full, height, holes };
}

// 同分随机用的是全局 Math.random，会让「同一粒种子跑两次结果不同」，
// 于是每次比数值都在跟噪声较劲。这里换成每局一枚固定种子的 LCG。
let TIE = 123456789;
function rnd() {
  TIE = (TIE * 1103515245 + 12345) & 0x7fffffff;
  return TIE / 0x80000000;
}

function bestMove(st, noise) {
  const cands = [];
  const seen = new Set();
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const cell = st.board[r][c];
      if (!cell || seen.has(cell.b)) continue;
      seen.add(cell.b);
      const lim = slideRange(st, cell.b);
      if (lim.locked) continue;
      for (let d = -lim.left; d <= lim.right; d++) {
        if (!d) continue;
        const board = cloneBoard(st);
        const ev = simulate(board, st.cols, st.rows, cell.b, d);
        if (!ev) continue;
        cands.push({ bid: cell.b, d, s: ev.full * 1000 - ev.height * 8 - ev.holes * 14 });
      }
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.s - a.s);
  if (noise && rnd() < noise) return cands[(rnd() * cands.length) | 0];
  // 同分随机一点，免得每局一模一样
  const top = cands.filter((x) => x.s >= cands[0].s - 1);
  return top[(rnd() * top.length) | 0];
}

function playOne(levelId, seed, noise) {
  TIE = (seed ^ 0x9e3779b9) & 0x7fffffff;  // 每局固定，可复现
  const st = newRun(levelId, seed);
  let guard = 0;
  while (!st.over && !st.win && guard++ < 4000) {
    const mv = bestMove(st, noise);
    if (!mv) break; // 一个能动的都没有
    const r = commit(st, mv.bid, mv.d);
    if (!r.ok) break;
  }
  return st;
}

const rows = [];
for (const lv of LEVELS) {
  let win = 0;
  let sumLines = 0;
  let sumMoves = 0;
  let sumScore = 0;
  const lines = [];
  for (let i = 0; i < N; i++) {
    const st = playOne(lv.id, SEED + i * 7919, 0);
    if (st.win) win++;
    lines.push(st.lines);
    sumLines += st.lines;
    sumMoves += st.moves;
    sumScore += st.score;
  }
  lines.sort((a, b) => a - b);
  rows.push({
    id: lv.id, goal: lv.goal, moves: lv.moves,
    rate: Math.round((win / N) * 100),
    avg: sumLines / N,
    med: lines[(N / 2) | 0],
    score: sumScore / N,
    used: sumMoves / N,
    q1: lines[(N * 0.25) | 0],
    q3: lines[(N * 0.75) | 0],
  });
}

console.log(`局数 ${N}/关，种子 ${SEED}`);
console.log('关  目标  回合  达标率  平均行  中位行  平均分  实际回合  25%~75%');
let rateSum = 0;
for (const r of rows) {
  rateSum += r.rate;
  console.log(
    String(r.id).padStart(2),
    String(r.goal || '—').padStart(4),
    String(r.moves || '—').padStart(4),
    (r.rate + '%').padStart(6),
    r.avg.toFixed(1).padStart(6),
    String(r.med).padStart(6),
    String(Math.round(r.score)).padStart(6),
    r.used.toFixed(1).padStart(7),
    `${String(r.q1).padStart(4)}~${String(r.q3).padStart(4)}`,
  );
}
console.log(`平均达标率 ${Math.round(rateSum / rows.length)}%`);

// 手抖 30% 的梯度（只看有目标的关）
const noiseRows = [];
for (const lv of LEVELS) {
  if (!lv.goal) continue;
  let win = 0;
  for (let i = 0; i < N; i++) {
    const st = playOne(lv.id, SEED + i * 104729, 0.3);
    if (st.win) win++;
  }
  noiseRows.push(Math.round((win / N) * 100));
}
console.log('30% 手抖达标率：' + noiseRows.join('/') + ' %');
