// 蚀界方块的核心规则：方块从上方落下、左右移动、落地堆叠、满行消除。
// 这里不碰任何 DOM，node 里可以直接 import 跑模拟（scripts/block-sim.mjs）。
//
// 一条容易踩错的约定：board 是 [行][列]，行 0 在最上面。渲染层的 y 也是这个方向。
// 「洋流上升」往数组前面塞行，「压实」往数组后面走 —— 别搞反。

// ------------------------------------------------------------------ 界域
// 配色抄 data/duel-lore.json 的 realms：混沌红、血肉橙、深海蓝、超维金。
export const REALMS = [
  { id: 'chaos', n: '混沌', en: 'CHAOS', c: '#e8656f', d: '#7c2531', l: '#ffb9c0' },
  { id: 'caro', n: '血肉', en: 'CARO', c: '#d98b6a', d: '#76422c', l: '#ffcba9' },
  { id: 'aqua', n: '深海', en: 'AEQUOR', c: '#5b9bd5', d: '#234669', l: '#a9d4ff' },
  { id: 'ultra', n: '超维', en: 'ULTRA', c: '#e3b341', d: '#785813', l: '#ffe9a8' },
];

// ------------------------------------------------------------------ 形状
// 一格到四格。竖条在 5 列的窄盘上最容易卡住，所以形状池按列数过滤（见 shapePool）。
export const SHAPES = [
  { id: 's1', c: [[0, 0]], w: 9 },
  { id: 'h2', c: [[0, 0], [1, 0]], w: 16 },
  { id: 'v2', c: [[0, 0], [0, 1]], w: 16 },
  { id: 'h3', c: [[0, 0], [1, 0], [2, 0]], w: 13 },
  { id: 'v3', c: [[0, 0], [0, 1], [0, 2]], w: 13 },
  { id: 'h4', c: [[0, 0], [1, 0], [2, 0], [3, 0]], w: 8 },
  { id: 'v4', c: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 8 },
  { id: 'q4', c: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 9 },
];

export const BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

// 五列窄盘放不下横四，直接剔掉，否则会生成一个怎么都塞不进去的方块
function shapePool(cols) {
  return SHAPES.filter((s) => Math.max(...s.c.map((x) => x[0])) + 1 <= cols);
}

// ------------------------------------------------------------------ 特殊块
export const SPECIALS = {
  crystal: { n: '结晶', d: '要消两次，第一次只裂开' },
  bomb: { n: '爆破', d: '被消掉时把周围一圈也炸掉' },
  line: { n: '贯穿', d: '被消掉时清空整行整列' },
  prism: { n: '棱彩', d: '万能色，被消掉时多掉一个造物' },
};

// ------------------------------------------------------------------ 造物（道具）
export const ITEMS = [
  { id: 'hammer', n: '碎击锤', d: '砸掉任意一格', icon: 'hammer', aim: 1 },
  { id: 'bomb', n: '爆裂瓶', d: '清掉 3×3 一片', icon: 'bomb', aim: 1 },
  { id: 'purge', n: '净化液', d: '清空最底一行', icon: 'flask', aim: 0 },
  { id: 'freeze', n: '冻结钟', d: '八秒内不自动下落', icon: 'clock', aim: 0 },
  { id: 'reroll', n: '重抽签', d: '换掉下一块', icon: 'scroll', aim: 0 },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ------------------------------------------------------------------ 关卡
// 十二关递进 + 一个无尽关。goal 是「消满多少行」，moves 是「放了多少块」的上限。
// speed 越大下落越快（1.0 大约一秒一格）。
export const LEVELS = [
  {
    id: 1, t: '无光区深潜 1', sub: '浅层 · 无声', cols: 6, rows: 12,
    goal: 10, moves: 60, speed: 0.9, mods: [],
    tip: '先学会把地填平，别在一列上叠高。',
  },
  {
    id: 2, t: '无光区深潜 2', sub: '浅层 · 落影', cols: 6, rows: 12,
    goal: 12, moves: 58, speed: 0.96, mods: ['rain:0.12'],
    tip: '棋盘上方偶尔会掉下孤块，看箭头躲开那一列。',
  },
  {
    id: 3, t: '无光区深潜 3', sub: '中层 · 涨潮', cols: 6, rows: 12,
    goal: 13, moves: 58, speed: 1.02, mods: ['tide:9'],
    tip: '洋流会从底下顶上来，别让顶层留着方块。',
  },
  {
    id: 4, t: '无光区深潜 4', sub: '中层 · 浪与光', cols: 6, rows: 12,
    goal: 14, moves: 56, speed: 1.08, mods: ['rain:0.16', 'tide:10'],
    tip: '落影和涨潮一起来，节奏会比前一关快一截。',
  },
  {
    id: 5, t: '无光区深潜 5', sub: '深层 · 起雾', cols: 6, rows: 12,
    goal: 15, moves: 56, speed: 1.14, mods: ['fog'],
    tip: '雾里看不见下一块，只能凭手上的形状走。',
  },
  {
    id: 6, t: '无光区深潜 6', sub: '深层 · 结晶', cols: 6, rows: 12,
    goal: 16, moves: 54, speed: 1.2, mods: ['harden:0.2'],
    tip: '带壳的结晶要消两次，第一次只会裂开。',
  },
  {
    id: 7, t: '无光区深潜 7', sub: '窄道 · 五列', cols: 5, rows: 12,
    goal: 15, moves: 54, speed: 1.26, mods: [],
    tip: '只剩五列，横四会变少，竖条更卡人。',
  },
  {
    id: 8, t: '无光区深潜 8', sub: '废墟 · 残块', cols: 6, rows: 12,
    goal: 19, moves: 52, speed: 1.32, mods: ['rubble:8'],
    tip: '开局就有一堆残块压在底下，先啃平再谈消行。',
  },
  {
    id: 9, t: '无光区深潜 9', sub: '暴雨 · 无星', cols: 6, rows: 12,
    goal: 21, moves: 52, speed: 1.38, mods: ['rain:0.26', 'fog'],
    tip: '落影变密，而且看不见下一块 —— 留好退路。',
  },
  {
    id: 10, t: '无光区深潜 10', sub: '暗流 · 双压', cols: 6, rows: 12,
    goal: 24, moves: 50, speed: 1.44, mods: ['tide:7', 'harden:0.24'],
    tip: '涨潮变勤，结晶更多，别指望慢慢磨。',
  },
  {
    id: 11, t: '无光区深潜 11', sub: '断崖 · 五列', cols: 5, rows: 12,
    goal: 24, moves: 50, speed: 1.5, mods: ['rubble:9', 'fog'],
    tip: '五列加残块，起手就是半残的盘面。',
  },
  {
    id: 12, t: '无光区深潜 12', sub: '最深处 · 无光', cols: 6, rows: 12,
    goal: 25, moves: 48, speed: 1.58,
    mods: ['rain:0.22', 'tide:6', 'harden:0.26'],
    tip: '这一关的机制全开。撑到二十二行，就算走到头了。',
  },
  {
    id: 13, t: '无尽 · 忘却回廊', sub: '走不到头', cols: 6, rows: 12,
    goal: 0, moves: 0, speed: 1.5, endless: true,
    mods: ['rain:0.2', 'tide:9'],
    tip: '没有回合上限，速度随着消行一路加快，直到你撑不住。',
  },
];

// 无尽关按已消行数慢慢加热，别让人一辈子不输
export function endlessSpeed(lines) {
  return Math.min(3.4, 1.5 + lines * 0.045);
}

// ------------------------------------------------------------------ 随机
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr, weightOf) {
  let total = 0;
  for (const x of arr) total += weightOf(x);
  let r = rng() * total;
  for (const x of arr) {
    r -= weightOf(x);
    if (r <= 0) return x;
  }
  return arr[arr.length - 1];
}

// ------------------------------------------------------------------ 关卡机制解析
function parseMods(mods) {
  const m = { rain: 0, tide: 0, fog: false, harden: 0, rubble: 0 };
  for (const s of mods || []) {
    const [k, v] = s.split(':');
    if (k === 'fog') m.fog = true;
    else m[k] = Number(v) || 0;
  }
  return m;
}

export function levelMods(lv) {
  return parseMods(lv.mods);
}

// ------------------------------------------------------------------ 开局
export function newRun(levelId, seed, opts) {
  const lv = LEVELS.find((x) => x.id === levelId) || LEVELS[0];
  const rng = makeRng(seed || Date.now());
  const mods = parseMods(lv.mods);
  void opts;

  const st = {
    lv,
    lvId: lv.id,
    cols: lv.cols,
    rows: lv.rows,
    rng,
    mods,
    board: [],
    cur: null,
    next: null,
    score: 0,
    lines: 0,
    moves: 0,
    maxMoves: lv.moves || 0,
    goal: lv.goal || 0,
    combo: 0,
    maxCombo: 0,
    bestClear: 0,
    items: [],
    itemCap: 4,
    pity: 0, // 连着几行没掉造物，用来保底
    acc: 0,
    dropSec: 1 / (0.82 * (lv.speed || 1)),
    frozen: 0,
    tideTick: 0,
    pending: [], // 雨的预告：[{col, realm, t}]
    over: false,
    win: false,
    reason: '',
    fx: [],
    clearedCells: 0,
    resonate: 0,
    gained: 0, // 本局拿到的造物总数（结算展示用）
  };

  for (let i = 0; i < st.rows; i++) st.board.push(new Array(st.cols).fill(null));

  // 残块：开局就在底部堆几格，逼玩家绕开
  if (mods.rubble) {
    let placed = 0;
    let guard = 0;
    while (placed < mods.rubble && guard++ < 500) {
      const c = (rng() * st.cols) | 0;
      // 只堆在下面四行，否则一开局就是死局
      const r = st.rows - 1 - ((rng() * 4) | 0);
      if (st.board[r][c]) continue;
      st.board[r][c] = { r: (rng() * REALMS.length) | 0, sp: null, hp: 1, grit: true };
      placed++;
    }
    compact(st);
  }

  st.next = rollPiece(st);
  spawn(st);
  return st;
}

// ------------------------------------------------------------------ 出块
function rollPiece(st) {
  const pool = shapePool(st.cols);
  const sh = pick(st.rng, pool, (s) => s.w);
  const realm = (st.rng() * REALMS.length) | 0;
  const cells = sh.c.map(([dc, dr]) => ({ dc, dr, sp: null, hp: 1 }));

  // 结晶：随关卡给其中一格加壳，逼玩家为它多留一手
  if (st.mods.harden && st.rng() < st.mods.harden) {
    const i = (st.rng() * cells.length) | 0;
    cells[i].sp = 'crystal';
    cells[i].hp = 2;
  }
  // 稀有特殊块：越靠后的关卡越常见
  const lucky = st.lvId >= 2 ? 0.03 + st.lvId * 0.004 : 0;
  if (st.rng() < lucky && !cells.some((c) => c.sp)) {
    const i = (st.rng() * cells.length) | 0;
    const roll = st.rng();
    cells[i].sp = roll < 0.4 ? 'bomb' : roll < 0.75 ? 'line' : 'prism';
  }
  // 棱彩单独再摇一次，它算万能色，能让玩家凑同色共鸣
  if (st.rng() < 0.03 && !cells.some((c) => c.sp)) {
    const i = (st.rng() * cells.length) | 0;
    cells[i].sp = 'prism';
  }

  return {
    sh: sh.id,
    realm,
    cells,
    w: Math.max(...sh.c.map((x) => x[0])) + 1,
    h: Math.max(...sh.c.map((x) => x[1])) + 1,
  };
}

function spawn(st) {
  const p = st.next || rollPiece(st);
  st.next = rollPiece(st);
  const mid = ((st.cols - p.w) / 2) | 0;
  const oy = -p.h; // 整个方块先藏在棋盘上方，逐格掉进来
  const cur = { ...p, ox: mid, oy, cells: p.cells.map((c) => ({ ...c })) };

  // 中心列被顶住了就往两边找最近的空位，能找到就还能继续 —— 一上来就判负太粗暴了
  if (!canPlace(st, cur, mid, oy)) {
    let found = -1;
    for (let d = 1; d < st.cols && found < 0; d++) {
      for (const ox of [mid - d, mid + d]) {
        if (ox < 0 || ox + p.w > st.cols) continue;
        if (canPlace(st, cur, ox, oy) || liftTo(st, cur, ox, oy)) {
          cur.ox = ox;
          if (!canPlace(st, cur, ox, oy)) {
            let y = oy;
            while (y < 0 && !canPlace(st, cur, ox, y)) y++;
            cur.oy = y;
          }
          found = ox;
          break;
        }
      }
    }
    if (found < 0) {
      st.over = true;
      st.reason = '棋盘堵到了顶';
      st.cur = null;
      st.fx.push({ k: 'over', reason: st.reason });
      return;
    }
  }
  st.cur = cur;
  st.acc = 0;
}

// 方块完全在棋盘上方时，只要这一列的顶部几行没被占死，就还能落进来
function liftTo(st, p, ox, oy) {
  let y = oy;
  while (y <= 0) {
    if (canPlace(st, p, ox, y)) return true;
    y++;
  }
  return canPlace(st, p, ox, 0);
}

// ------------------------------------------------------------------ 碰撞
export function canPlace(st, p, ox, oy) {
  for (const cl of p.cells) {
    const c = ox + cl.dc;
    const r = oy + cl.dr;
    if (c < 0 || c >= st.cols) return false;
    if (r >= st.rows) return false;
    if (r >= 0 && st.board[r][c]) return false;
  }
  return true;
}

// 方块落地后会停在哪一行（渲染画影子用）
export function ghostY(st, p) {
  let y = p.oy;
  while (canPlace(st, p, p.ox, y + 1)) y++;
  return y;
}

// ------------------------------------------------------------------ 移动
export function move(st, dx) {
  if (st.over || !st.cur) return false;
  const nx = st.cur.ox + dx;
  if (!canPlace(st, st.cur, nx, st.cur.oy)) return false;
  st.cur.ox = nx;
  return true;
}

export function moveTo(st, col) {
  if (st.over || !st.cur) return false;
  const target = Math.max(0, Math.min(st.cols - st.cur.w, col));
  if (target === st.cur.ox) return false;
  // 一格一格挪，中途被挡就停下（不会穿墙）
  const dir = target > st.cur.ox ? 1 : -1;
  let moved = false;
  while (st.cur.ox !== target && canPlace(st, st.cur, st.cur.ox + dir, st.cur.oy)) {
    st.cur.ox += dir;
    moved = true;
  }
  return moved;
}

function stepDown(st) {
  if (!st.cur) return false;
  if (canPlace(st, st.cur, st.cur.ox, st.cur.oy + 1)) {
    st.cur.oy++;
    return true;
  }
  return false;
}

export function softDrop(st) {
  if (st.over || !st.cur) return false;
  if (stepDown(st)) {
    st.acc = 0;
    st.score += 1;
    return true;
  }
  lock(st);
  return true;
}

export function hardDrop(st) {
  if (st.over || !st.cur) return;
  let n = 0;
  while (stepDown(st)) n++;
  st.score += n * 2;
  lock(st);
}

// ------------------------------------------------------------------ 时间推进
export function tick(st, dt) {
  if (st.over || !st.cur) return false;
  if (st.frozen > 0) {
    st.frozen = Math.max(0, st.frozen - dt);
    return true;
  }
  st.acc += dt;
  let changed = false;
  let guard = 0;
  while (st.acc >= st.dropSec && guard++ < 40) {
    st.acc -= st.dropSec;
    if (!stepDown(st)) {
      lock(st);
      return true;
    }
    changed = true;
  }
  return changed;
}

// ------------------------------------------------------------------ 锁定
function lock(st) {
  const p = st.cur;
  st.cur = null;
  if (!p) return;
  let buried = 0;
  for (const cl of p.cells) {
    const r = p.oy + cl.dr;
    const c = p.ox + cl.dc;
    if (r < 0) {
      buried++;
      continue;
    }
    if (r < st.rows && c >= 0 && c < st.cols) {
      st.board[r][c] = {
        r: cl.sp === 'prism' ? -1 : p.realm, // -1 表示棱彩，算万能色
        sp: cl.sp,
        hp: cl.hp || 1,
      };
    }
  }
  st.moves++;
  st.fx.push({ k: 'lock' });

  if (buried > 0) {
    st.over = true;
    st.reason = '棋盘堵到了顶';
    st.fx.push({ k: 'over', reason: st.reason });
    return;
  }

  resolve(st);
  if (st.over) return;
  if (!checkState(st)) return;
  afterMove(st);
}

function checkState(st) {
  if (st.win || st.over) return false;
  if (st.goal && st.lines >= st.goal) {
    st.win = true;
    st.fx.push({ k: 'win' });
    return false;
  }
  if (st.maxMoves && st.moves >= st.maxMoves) {
    st.over = true;
    st.reason = '回合用完了';
    st.fx.push({ k: 'over', reason: st.reason });
    return false;
  }
  return true;
}

function afterMove(st) {
  dropRain(st);
  if (st.over) return;
  tickTide(st);
  if (st.over) return;
  spawn(st);
}

// ------------------------------------------------------------------ 消除
function fullRows(st) {
  const rows = [];
  for (let r = 0; r < st.rows; r++) {
    const row = st.board[r];
    let full = true;
    for (let c = 0; c < st.cols; c++) {
      if (!row[c]) {
        full = false;
        break;
      }
    }
    if (full) rows.push(r);
  }
  return rows;
}

function resolve(st) {
  let chain = 0;
  let totalRows = 0;
  while (true) {
    const rows = fullRows(st);
    if (!rows.length) break;
    chain++;

    const del = new Map(); // key -> {r,c}
    for (const r of rows) for (let c = 0; c < st.cols; c++) del.set(r * st.cols + c, { r, c });

    // 特殊块连锁：爆破炸一圈、贯穿清行列。新清出来的格子也要检查，所以走队列
    const queue = [...del.values()];
    let guard = 0;
    while (queue.length && guard++ < 4000) {
      const { r, c } = queue.pop();
      const cell = st.board[r][c];
      if (!cell) continue;
      if (cell.sp === 'bomb') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
            const k = rr * st.cols + cc;
            if (!del.has(k) && st.board[rr][cc]) {
              del.set(k, { r: rr, c: cc });
              queue.push({ r: rr, c: cc });
            }
          }
        }
      } else if (cell.sp === 'line') {
        for (let cc = 0; cc < st.cols; cc++) {
          const k = r * st.cols + cc;
          if (!del.has(k) && st.board[r][cc]) {
            del.set(k, { r, c: cc });
            queue.push({ r, c: cc });
          }
        }
        for (let rr = 0; rr < st.rows; rr++) {
          const k = rr * st.cols + c;
          if (!del.has(k) && st.board[rr][c]) {
            del.set(k, { r: rr, c });
            queue.push({ r: rr, c });
          }
        }
      }
    }

    // 结晶：还有两层时只裂不开
    const cracked = [];
    const cleared = [];
    for (const { r, c } of del.values()) {
      const cell = st.board[r][c];
      if (!cell) continue;
      if (cell.sp === 'crystal' && cell.hp > 1) {
        cell.hp--;
        cracked.push({ r, c });
        continue;
      }
      cleared.push({ r, c, realm: cell.r, sp: cell.sp });
    }

    // 全被结晶挡住 -> 这轮没真消掉东西，跳出，免得死循环
    if (!cleared.length) {
      for (const { r, c } of cracked) st.fx.push({ k: 'crack', r, c });
      break;
    }

    for (const x of cleared) st.board[x.r][x.c] = null;
    for (const { r, c } of cracked) st.fx.push({ k: 'crack', r, c });

    // ---- 结算
    const nRows = rows.length;
    totalRows += nRows;
    st.lines += nRows;
    st.clearedCells += cleared.length;
    st.combo = chain;
    // 连消 = 一次下去消掉几行（含连锁），这才是玩家看得懂的数
    st.maxCombo = Math.max(st.maxCombo, nRows + chain - 1);
    st.bestClear = Math.max(st.bestClear, nRows);

    const gain = nRows * nRows * 120 + cleared.length * 8 + (chain - 1) * 90;
    st.score += gain;

    // 同色共鸣：整行一个界域（棱彩算万能）额外加分 + 一件造物
    let resonate = 0;
    for (const r of rows) if (rowSameColor(st, r, cleared)) resonate++;
    if (resonate) {
      st.score += resonate * 200;
      st.resonate += resonate;
    }

    // 造物掉落：每行三成，连着两轮一行不掉就补一个
    let drops = 0;
    for (let i = 0; i < nRows; i++) if (st.rng() < 0.34) drops++;
    if (st.pity >= 3) drops++;
    if (resonate) drops++;
    for (const x of cleared) if (x.sp === 'prism' && st.rng() < 0.5) drops++;
    st.pity = drops ? 0 : st.pity + nRows;
    for (let i = 0; i < drops; i++) {
      const it = pick(st.rng, ITEMS, (x) => (x.id === 'reroll' ? 0.7 : 1));
      st.gained++;
      if (st.items.length < st.itemCap) {
        st.items.push(it.id);
        st.fx.push({ k: 'item', id: it.id });
      }
    }

    st.fx.push({
      k: 'clear',
      rows: rows.slice(),
      cells: cleared.map((x) => ({ r: x.r, c: x.c, realm: x.realm, sp: x.sp })),
      gain,
      combo: chain,
      resonate,
    });

    compact(st);
  }

  if (chain > 3) st.score += 400; // 三连以上给一笔链赏
  st.combo = 0;
  return totalRows;
}

// 整行是否一个颜色（棱彩当万能，不计入杂色）
function rowSameColor(st, r, cleared) {
  const set = new Map();
  for (const x of cleared) {
    if (x.r !== r || x.realm < 0) continue;
    set.set(x.realm, (set.get(x.realm) || 0) + 1);
  }
  if (!set.size) return false;
  let total = 0;
  for (const v of set.values()) total += v;
  return total >= st.cols * 0.75 && set.size === 1;
}

// 压实：每一列各自往下掉，中间不留空洞
function compact(st) {
  for (let c = 0; c < st.cols; c++) {
    let write = st.rows - 1;
    for (let r = st.rows - 1; r >= 0; r--) {
      const v = st.board[r][c];
      if (!v) continue;
      if (r !== write) {
        st.board[write][c] = v;
        st.board[r][c] = null;
      }
      write--;
    }
    for (let r = write; r >= 0; r--) st.board[r][c] = null;
  }
}

// ------------------------------------------------------------------ 机制：投射光线
function dropRain(st) {
  // 上一轮预告到点的落下来
  const due = st.pending.filter((x) => x.t <= 0);
  st.pending = st.pending.filter((x) => x.t > 0);
  for (const d of due) landRain(st, d.col, d.realm);
  for (const x of st.pending) x.t--;
  if (st.over) return;

  const p = st.mods.rain;
  if (p > 0 && st.rng() < p) {
    const col = (st.rng() * st.cols) | 0;
    if (!st.pending.some((x) => x.col === col)) {
      st.pending.push({ col, realm: (st.rng() * REALMS.length) | 0, t: 1 });
    }
  }
}

function landRain(st, col, realm) {
  for (let r = st.rows - 1; r >= 0; r--) {
    if (!st.board[r][col]) {
      st.board[r][col] = { r: realm, sp: null, hp: 1 };
      st.fx.push({ k: 'rain', r, c: col, realm });
      resolve(st);
      return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------ 机制：飘忽洋流
function tickTide(st) {
  if (!st.mods.tide) return;
  st.tideTick++;
  if (st.tideTick < st.mods.tide) return;
  st.tideTick = 0;
  riseOne(st);
}

export function riseOne(st) {
  if (st.board[0].some(Boolean)) {
    st.over = true;
    st.reason = '洋流把棋盘顶穿了';
    st.fx.push({ k: 'over', reason: st.reason });
    return false;
  }
  st.board.shift();
  const row = new Array(st.cols).fill(null);
  // 新的一行只填一半左右，留出可操作的空隙
  const fill = Math.max(1, Math.round(st.cols * 0.45));
  const cols = [];
  for (let c = 0; c < st.cols; c++) cols.push(c);
  for (let i = 0; i < fill; i++) {
    const idx = (st.rng() * cols.length) | 0;
    const c = cols.splice(idx, 1)[0];
    row[c] = { r: (st.rng() * REALMS.length) | 0, sp: null, hp: 1 };
  }
  st.board.push(row);
  st.fx.push({ k: 'tide' });
  resolve(st);
  return true;
}

// ------------------------------------------------------------------ 造物
export function useItem(st, id, r, c) {
  if (st.over) return false;
  const i = st.items.indexOf(id);
  if (i < 0) return false;
  let used = false;

  if (id === 'hammer') {
    if (st.board[r] && st.board[r][c]) {
      const cell = st.board[r][c];
      if (cell.sp === 'crystal' && cell.hp > 1) {
        cell.hp--;
        st.fx.push({ k: 'crack', r, c });
      } else {
        st.board[r][c] = null;
        st.fx.push({ k: 'hammer', r, c });
      }
      used = true;
    }
  } else if (id === 'bomb') {
    let any = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
        if (st.board[rr][cc]) {
          st.board[rr][cc] = null;
          any = true;
        }
      }
    }
    st.fx.push({ k: 'boom', r, c });
    used = any;
  } else if (id === 'purge') {
    let any = false;
    for (let cc = 0; cc < st.cols; cc++) {
      if (st.board[st.rows - 1][cc]) {
        st.board[st.rows - 1][cc] = null;
        any = true;
      }
    }
    used = any;
    if (used) st.fx.push({ k: 'purge' });
  } else if (id === 'freeze') {
    st.frozen = 8;
    st.fx.push({ k: 'freeze' });
    used = true;
  } else if (id === 'reroll') {
    st.next = rollPiece(st);
    st.fx.push({ k: 'reroll' });
    used = true;
  }

  if (!used) return false;
  st.items.splice(i, 1);

  if (id !== 'reroll') {
    compact(st);
    resolve(st);
    if (!st.over) checkState(st);
    // 砸开之后可能又有地方放了，把误判的「堵顶」撤回
    if (st.over && st.reason === '棋盘堵到了顶' && !st.cur) {
      const trial = rollPiece(st);
      const ox = ((st.cols - trial.w) / 2) | 0;
      if (canPlace(st, trial, ox, -trial.h)) {
        st.over = false;
        st.reason = '';
        spawn(st);
      }
    }
  }
  return true;
}

// ------------------------------------------------------------------ 查询
export function progress(st) {
  return st.goal ? Math.min(1, st.lines / st.goal) : 0;
}

export function rankOf(st) {
  if (st.lvId === 13) {
    // 无尽线按人类定的：AI 能跑到几百行，人是做不到的，别拿它当标尺
    if (st.lines >= 45) return 'S';
    if (st.lines >= 30) return 'A';
    if (st.lines >= 18) return 'B';
    if (st.lines >= 8) return 'C';
    return 'D';
  }
  if (!st.win) return 'D';
  // 达标是 B。往上要靠两件事：省回合、连消。两条都做到才是 S。
  // 不能只看回合剩余 —— 前面几关回合本来就宽松，那样人人开局就 S。
  const spare = st.maxMoves ? (st.maxMoves - st.moves) / st.maxMoves : 0;
  let pt = 2; // 达标就至少是 B
  if (spare >= 0.2) pt++;
  if (spare >= 0.4) pt++;
  if (st.maxCombo >= 3) pt++;
  if (st.resonate >= 2) pt++;
  if (pt >= 5) return 'S';
  if (pt >= 4) return 'A';
  if (pt >= 2) return 'B';
  return 'C';
}

export const RANK_COLOR = {
  S: '#ffd45e',
  A: '#8fd0ff',
  B: '#9ee6b4',
  C: '#c9c2ae',
  D: '#8a93a8',
};

// 银芯：按本局消行折算
export const CREDIT = [
  [6, 1], [12, 2], [18, 3], [24, 5], [30, 7], [40, 10], [50, 14], [65, 19], [80, 25],
];
export function creditOf(lines) {
  let v = 0;
  for (const [at, n] of CREDIT) if (lines >= at) v = n;
  return v;
}
