// 数值标定：给定关卡配置，跑 N 局「不设目标、不设回合上限」看真实能消多少行，
// 再按分位数反推 goal / moves。避免拍脑袋。
import { LEVELS, newRun, cellsOf, slideRange, commit } from '../js/block-core.js';

const N = Number(process.argv[2] || 40);
const SEED = Number(process.argv[3] || 20261103);

const cloneBoard = (st) => st.board.map((row) => row.map((c) => (c ? { ...c } : null)));

function simulate(board, cols, rows, bid, d) {
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (board[r][c] && board[r][c].b === bid) cells.push({ r, c });
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
    for (let r = 0; r < rows; r++) { if (board[r][c]) seen = true; else if (seen) holes++; }
  }
  return { full, height, holes };
}

function bestMove(st) {
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
  const top = cands.filter((x) => x.s >= cands[0].s - 1);
  return top[(Math.random() * top.length) | 0];
}

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];

console.log('关  列  cover  中位行  p25  p75  中位回合  →建议 goal(≈p30) / moves(≈p55)');
for (const lv of LEVELS) {
  const L = [];
  const M = [];
  for (let i = 0; i < N; i++) {
    const st = newRun(lv.id, SEED + i * 7919);
    st.goal = 0;
    st.maxMoves = 0;
    let guard = 0;
    while (!st.over && guard++ < 4000) {
      const mv = bestMove(st);
      if (!mv) break;
      if (!commit(st, mv.bid, mv.d).ok) break;
    }
    L.push(st.lines);
    M.push(st.moves);
  }
  L.sort((a, b) => a - b);
  M.sort((a, b) => a - b);
  console.log(
    String(lv.id).padStart(2),
    String(lv.cols).padStart(3),
    String(lv.cover).padStart(6),
    String(pct(L, 0.5)).padStart(6),
    String(pct(L, 0.25)).padStart(4),
    String(pct(L, 0.75)).padStart(4),
    String(pct(M, 0.5)).padStart(8),
    `  → ${pct(L, 0.3)} / ${pct(M, 0.55)}`,
  );
}
