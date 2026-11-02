// 蚀界方块的关卡难度模拟。
// 用法：node scripts/block-sim.mjs [每关局数] [种子基数]
// 输出每一关的通关率、平均消行、平均回合、平均分。
//
// AI 是贪心的：把每一块拖到每一列，评估「消行数 / 落地高度 / 空洞 / 表面凹凸」，
// 挑分最高的落点。它不会规划连消、也不会主动用造物 —— 所以它代表「手不算太差
// 也不算强」的玩家。关卡难度就按它的通关率定：前三关 ≥90%，后三关 25%~50%，
// 中间平滑下降。

import {
  newRun, tick, moveTo, canPlace, ghostY, useItem,
  LEVELS, rankOf,
} from '../js/block-core.js';

const N = Number(process.argv[2]) || 120;
const BASE = Number(process.argv[3]) || 20261103;

function evalPlacement(st, col) {
  const p = st.cur;
  if (!canPlace(st, p, col, p.oy)) return null;
  const y = ghostY(st, { ...p, ox: col });
  const rows = st.rows;
  const cols = st.cols;
  const shadow = st.board.map((r) => r.map(Boolean));
  for (const cl of p.cells) {
    const r = y + cl.dr;
    const c = col + cl.dc;
    if (r >= 0 && r < rows && c >= 0 && c < cols) shadow[r][c] = true;
  }

  let clearedRows = 0;
  for (let r = 0; r < rows; r++) if (shadow[r].every(Boolean)) clearedRows++;

  const heights = new Array(cols).fill(0);
  let holes = 0;
  let maxH = 0;
  for (let c = 0; c < cols; c++) {
    let first = -1;
    for (let r = 0; r < rows; r++) {
      if (shadow[r][c]) {
        first = r;
        break;
      }
    }
    heights[c] = first < 0 ? 0 : rows - first;
    maxH = Math.max(maxH, heights[c]);
    if (first >= 0) {
      for (let r = first + 1; r < rows; r++) if (!shadow[r][c]) holes++;
    }
  }
  let bump = 0;
  for (let c = 1; c < cols; c++) bump += Math.abs(heights[c] - heights[c - 1]);

  let score = 0;
  score += clearedRows * 900;
  score -= holes * 42;
  score -= maxH * 6;
  score -= bump * 5;
  score -= heights[col] * 3;

  const freeTop = st.rows - maxH;
  if (freeTop <= 2) score -= 800;

  return { col, score, clearedRows };
}

function bestMove(st) {
  let best = null;
  for (let col = 0; col <= st.cols - st.cur.w; col++) {
    const ev = evalPlacement(st, col);
    if (!ev) continue;
    if (!best || ev.score > best.score) best = ev;
  }
  return best;
}

function topHeight(st) {
  for (let r = 0; r < st.rows; r++) if (st.board[r].some(Boolean)) return st.rows - r;
  return 0;
}

function playOne(levelId, seed) {
  const st = newRun(levelId, seed);
  let guard = 0;
  while (!st.over && !st.win && guard++ < 4000) {
    if (!st.cur) break;
    const mv = bestMove(st);
    if (!mv) {
      st.over = true;
      st.reason = '无处可放';
      break;
    }
    moveTo(st, mv.col);
    // 快进到底：一直推进时间，直到这一块锁住（moves 变化）就停 ——
    // 不能只看 st.cur 是否为空，锁定后 spawn 会立刻补上新块，
    // 那样会连带把下一块也推到中间去，整局就变成原地叠高。
    const before = st.moves;
    let spin = 0;
    while (st.cur && !st.over && !st.win && st.moves === before && spin++ < 3000) {
      tick(st, st.dropSec);
    }
    if (st.moves === before) tick(st, st.dropSec * 4);

    // 快堆到顶了就丢个冻结，模拟玩家会用手上的道具
    if (st.items.includes('freeze') && st.rows - topHeight(st) <= 2) useItem(st, 'freeze');
  }
  return st;
}

function pad(s, n, dir) {
  s = String(s);
  let w = 0;
  for (const ch of s) w += /[\u4e00-\u9fa5·]/.test(ch) ? 2 : 1;
  const need = Math.max(0, n - w);
  return dir === -1 ? ' '.repeat(need) + s : s + ' '.repeat(need);
}

function pct(x, n) {
  return `${((x / n) * 100).toFixed(0)}%`;
}

console.log(`每关 ${N} 局，种子基数 ${BASE}`);
const head = ['关卡', '列', '目标', '回合', '通关', '均消行', '均用块', '均分', 'S/A/B/C', '耗时'];
const widths = [14, 3, 5, 5, 6, 7, 7, 7, 9, 7];
console.log(head.map((s, i) => pad(s, widths[i])).join(''));

for (const lv of LEVELS) {
  let wins = 0;
  let lines = 0;
  let moves = 0;
  let score = 0;
  const ranks = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const st = playOne(lv.id, BASE + i * 7919);
    if (st.win) wins++;
    moves += st.moves;
    lines += st.lines;
    score += st.score;
    if (st.win) ranks[rankOf(st)]++;
  }
  const cells = [
    lv.t, String(lv.cols), String(lv.goal || '—'), String(lv.moves || '—'),
    lv.endless ? '—' : pct(wins, N), (lines / N).toFixed(1), (moves / N).toFixed(1),
    String(Math.round(score / N)), `${ranks.S}/${ranks.A}/${ranks.B}/${ranks.C}`,
    `${Date.now() - t0}ms`,
  ];
  console.log(cells.map((s, i) => pad(s, widths[i])).join(''));
}
