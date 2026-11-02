// 「蚀界方块」的纯逻辑：棋盘、形状、落子、消除、计分。
// 这里不碰 DOM，node 也能直接 import（scripts/block-sim.mjs 用它跑平衡）。

export const N = 8;          // 8×8
export const MAX_STEPS = 100; // 一局一百回合
export const ENERGY_MAX = 8;  // 溢出强化攒满 8 次
export const TOOL_HAMMER = 3; // 碎击可用次数
export const TOOL_SHUFFLE = 2;// 换牌可用次数

// ---------------------------------------------------------------- 形状池
// 用 '#' 和 '.' 表示，'|' 分行。w 是权重，越大越常出。
const RAW = [
  { id: 'dot',  p: '#',              w: 3.0 },
  { id: 'i2h',  p: '##',             w: 6.5 },
  { id: 'i2v',  p: '#|#',            w: 6.5 },
  { id: 'i3h',  p: '###',            w: 6.0 },
  { id: 'i3v',  p: '#|#|#',          w: 6.0 },
  { id: 'i4h',  p: '####',           w: 3.2 },
  { id: 'i4v',  p: '#|#|#|#',        w: 3.2 },
  { id: 'i5h',  p: '#####',          w: 1.4 },
  { id: 'i5v',  p: '#|#|#|#|#',      w: 1.4 },
  { id: 'sq2',  p: '##|##',          w: 6.6 },
  { id: 'l3a',  p: '#.|##',          w: 3.4 },
  { id: 'l3b',  p: '.#|##',          w: 3.4 },
  { id: 'l3c',  p: '##|#.',          w: 3.4 },
  { id: 'l3d',  p: '##|.#',          w: 3.4 },
  { id: 'l4a',  p: '#..|###',        w: 2.4 },
  { id: 'l4b',  p: '..#|###',        w: 2.4 },
  { id: 'l4c',  p: '###|#..',        w: 2.4 },
  { id: 'l4d',  p: '###|..#',        w: 2.4 },
  { id: 'l4e',  p: '#.|#.|##',       w: 2.0 },
  { id: 'l4f',  p: '.#|.#|##',       w: 2.0 },
  { id: 'l4g',  p: '##|#.|#.',       w: 2.0 },
  { id: 'l4h',  p: '##|.#|.#',       w: 2.0 },
  { id: 't4a',  p: '.#.|###',        w: 2.4 },
  { id: 't4b',  p: '###|.#.',        w: 2.4 },
  { id: 't4c',  p: '#.|##|#.',       w: 2.4 },
  { id: 't4d',  p: '.#|##|.#',       w: 2.4 },
  { id: 's4a',  p: '.##|##.',        w: 2.0 },
  { id: 's4b',  p: '##.|.##',        w: 2.0 },
  { id: 's4c',  p: '#.|##|.#',       w: 1.6 },
  { id: 's4d',  p: '.#|##|#.',       w: 1.6 },
  { id: 'r23',  p: '###|###',        w: 2.3 },
  { id: 'r32',  p: '##|##|##',       w: 2.3 },
];

export const SHAPES = RAW.map((s) => {
  const rows = s.p.split('|');
  const cells = [];
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') cells.push([r, c]); }));
  const h = rows.length;
  const w2 = Math.max(...rows.map((r) => r.length));
  const n = cells.length;
  // 长条和单块不该被当成「大块」参与保底判断
  return { id: s.id, w: s.w, cells, rows: h, cols: w2, n, name: s.id };
});

const TOTAL_W = SHAPES.reduce((a, s) => a + s.w, 0);

// 加权抽一个形状
function pickOne(rng, exclude) {
  for (let guard = 0; guard < 24; guard++) {
    let x = rng() * TOTAL_W;
    for (const s of SHAPES) {
      x -= s.w;
      if (x <= 0) {
        if (exclude && s.id === exclude) break;
        return s;
      }
    }
  }
  return SHAPES[0];
}

// 发三张牌：尽量不重样，且至少有一张小牌（全是 3×3 之类会直接把局面做死）
export function deal(rng) {
  const out = [];
  for (let i = 0; i < 3; i++) {
    let s = pickOne(rng, out.length ? out[out.length - 1].sh.id : '');
    out.push({ sh: s, kind: (rng() * 3) | 0, relic: rng() < 0.22 ? (rng() * s.n) | 0 : -1 });
  }
  if (out.every((c) => c.sh.n >= 4)) {
    const small = SHAPES.filter((s) => s.n <= 2);
    const s = small[(rng() * small.length) | 0];
    out[2] = { sh: s, kind: (rng() * 3) | 0, relic: -1 };
  }
  return out;
}

export function emptyBoard() {
  return Array.from({ length: N }, () => new Array(N).fill(null));
}

export function canPlace(b, sh, r0, c0) {
  for (const [dr, dc] of sh.cells) {
    const r = r0 + dr, c = c0 + dc;
    if (r < 0 || r >= N || c < 0 || c >= N) return false;
    if (b[r][c]) return false;
  }
  return true;
}

export function anyPlacement(b, sh) {
  for (let r0 = 0; r0 <= N - sh.rows; r0++) {
    for (let c0 = 0; c0 <= N - sh.cols; c0++) {
      if (canPlace(b, sh, r0, c0)) return true;
    }
  }
  return false;
}

export function applyPlace(b, card, r0, c0) {
  const out = [];
  card.sh.cells.forEach(([dr, dc], i) => {
    const r = r0 + dr, c = c0 + dc;
    b[r][c] = { k: card.kind, relic: i === card.relic };
    out.push([r, c]);
  });
  return out;
}

// 找出所有满行 / 满列
export function fullLines(b) {
  const rows = [], cols = [];
  for (let r = 0; r < N; r++) if (b[r].every(Boolean)) rows.push(r);
  for (let c = 0; c < N; c++) {
    let ok = true;
    for (let r = 0; r < N; r++) if (!b[r][c]) { ok = false; break; }
    if (ok) cols.push(c);
  }
  return { rows, cols };
}

export function clearLines(b, lines) {
  let n = 0, relics = 0;
  for (const r of lines.rows) {
    for (let c = 0; c < N; c++) {
      if (b[r][c]) { if (b[r][c].relic) relics++; b[r][c] = null; n++; }
    }
  }
  for (const c of lines.cols) {
    for (let r = 0; r < N; r++) {
      if (b[r][c]) { if (b[r][c].relic) relics++; b[r][c] = null; n++; }
    }
  }
  return { n, relics, lines: lines.rows.length + lines.cols.length };
}

// 溢出强化：找场上最挤的一块 5×5，整块抹掉
export function bestWindow(b, size = 5) {
  let best = { r: 0, c: 0, n: -1 };
  for (let r = 0; r + size <= N; r++) {
    for (let c = 0; c + size <= N; c++) {
      let n = 0;
      for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) if (b[r + i][c + j]) n++;
      }
      if (n > best.n) best = { r, c, n };
    }
  }
  return best;
}

export function clearWindow(b, w, size = 5) {
  let n = 0;
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (b[w.r + i][w.c + j]) { b[w.r + i][w.c + j] = null; n++; }
    }
  }
  return n;
}

export function countFilled(b) {
  let n = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (b[r][c]) n++;
  return n;
}

// ---------------------------------------------------------------- 计分
// 放置按格给分；消行按「格 + 线数平方」给，多线一起消才明显超线性。
// combo 是连续几个回合都有消除，倍率最高 2.5。
export function scorePlace(card) {
  return card.sh.n * 2;
}

export function scoreClear(nCells, nLines, combo) {
  const mult = Math.min(2.5, 1 + (combo - 1) * 0.35);
  return Math.round((nCells * 12 + nLines * nLines * 52) * mult);
}

// 评级：按本局分数
// 门槛是拿 scripts/block-sim.mjs 的贪心 AI 校的：它每步都挑最优落点、
// 几乎必然走满一百回合，中位 7.9k。所以 A 线压到它的中位，
// B 是「活着但消得不勤」，S 得靠多线同时消 + 溢出清场才够得着。
export const RANKS = [
  { k: 'S', at: 12000, color: '#ffd45e' },
  { k: 'A', at: 8000, color: '#8fd0ff' },
  { k: 'B', at: 4500, color: '#9ee6b4' },
  { k: 'C', at: 1800, color: '#c9c2ae' },
  { k: 'D', at: 0, color: '#8a93a8' },
];
export function rankOf(score) {
  for (const r of RANKS) if (score >= r.at) return r;
  return RANKS[RANKS.length - 1];
}

// 银芯：和「合成大杜勒」同一套口径，但分数分布小得多，门槛压平
export const CREDIT = [
  [400, 1], [1200, 2], [2500, 3], [4000, 5], [6000, 7], [8000, 9],
  [11000, 12], [15000, 16], [20000, 21], [28000, 27],
];
export function creditOf(score) {
  let c = 0;
  for (const [s, v] of CREDIT) if (score >= s) c = v;
  return c;
}
