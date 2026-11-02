(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/block-core.js
const m_block_core = await (async () => {

// 蚀界方块的核心规则：方块从上方落下、左右移动、落地堆叠、满行消除。
// 这里不碰任何 DOM，node 里可以直接 import 跑模拟（scripts/block-sim.mjs）。
//
// 一条容易踩错的约定：board 是 [行][列]，行 0 在最上面。渲染层的 y 也是这个方向。
// 「洋流上升」往数组前面塞行，「压实」往数组后面走 —— 别搞反。

// ------------------------------------------------------------------ 界域
// 配色抄 data/duel-lore.json 的 realms：混沌红、血肉橙、深海蓝、超维金。
const REALMS = [
  { id: 'chaos', n: '混沌', en: 'CHAOS', c: '#e8656f', d: '#7c2531', l: '#ffb9c0' },
  { id: 'caro', n: '血肉', en: 'CARO', c: '#d98b6a', d: '#76422c', l: '#ffcba9' },
  { id: 'aqua', n: '深海', en: 'AEQUOR', c: '#5b9bd5', d: '#234669', l: '#a9d4ff' },
  { id: 'ultra', n: '超维', en: 'ULTRA', c: '#e3b341', d: '#785813', l: '#ffe9a8' },
];

// ------------------------------------------------------------------ 形状
// 一格到四格。竖条在 5 列的窄盘上最容易卡住，所以形状池按列数过滤（见 shapePool）。
const SHAPES = [
  { id: 's1', c: [[0, 0]], w: 9 },
  { id: 'h2', c: [[0, 0], [1, 0]], w: 16 },
  { id: 'v2', c: [[0, 0], [0, 1]], w: 16 },
  { id: 'h3', c: [[0, 0], [1, 0], [2, 0]], w: 13 },
  { id: 'v3', c: [[0, 0], [0, 1], [0, 2]], w: 13 },
  { id: 'h4', c: [[0, 0], [1, 0], [2, 0], [3, 0]], w: 8 },
  { id: 'v4', c: [[0, 0], [0, 1], [0, 2], [0, 3]], w: 8 },
  { id: 'q4', c: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 9 },
];

const BY_ID = Object.fromEntries(SHAPES.map((s) => [s.id, s]));

// 五列窄盘放不下横四，直接剔掉，否则会生成一个怎么都塞不进去的方块
function shapePool(cols) {
  return SHAPES.filter((s) => Math.max(...s.c.map((x) => x[0])) + 1 <= cols);
}

// ------------------------------------------------------------------ 特殊块
const SPECIALS = {
  crystal: { n: '结晶', d: '要消两次，第一次只裂开' },
  bomb: { n: '爆破', d: '被消掉时把周围一圈也炸掉' },
  line: { n: '贯穿', d: '被消掉时清空整行整列' },
  prism: { n: '棱彩', d: '万能色，被消掉时多掉一个造物' },
};

// ------------------------------------------------------------------ 造物（道具）
const ITEMS = [
  { id: 'hammer', n: '碎击锤', d: '砸掉任意一格', icon: 'hammer', aim: 1 },
  { id: 'bomb', n: '爆裂瓶', d: '清掉 3×3 一片', icon: 'bomb', aim: 1 },
  { id: 'purge', n: '净化液', d: '清空最底一行', icon: 'flask', aim: 0 },
  { id: 'freeze', n: '冻结钟', d: '八秒内不自动下落', icon: 'clock', aim: 0 },
  { id: 'reroll', n: '重抽签', d: '换掉下一块', icon: 'scroll', aim: 0 },
];
const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ------------------------------------------------------------------ 关卡
// 十二关递进 + 一个无尽关。goal 是「消满多少行」，moves 是「放了多少块」的上限。
// speed 越大下落越快（1.0 大约一秒一格）。
const LEVELS = [
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
function endlessSpeed(lines) {
  return Math.min(3.4, 1.5 + lines * 0.045);
}

// ------------------------------------------------------------------ 随机
function makeRng(seed) {
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

function levelMods(lv) {
  return parseMods(lv.mods);
}

// ------------------------------------------------------------------ 开局
function newRun(levelId, seed, opts) {
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
function canPlace(st, p, ox, oy) {
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
function ghostY(st, p) {
  let y = p.oy;
  while (canPlace(st, p, p.ox, y + 1)) y++;
  return y;
}

// ------------------------------------------------------------------ 移动
function move(st, dx) {
  if (st.over || !st.cur) return false;
  const nx = st.cur.ox + dx;
  if (!canPlace(st, st.cur, nx, st.cur.oy)) return false;
  st.cur.ox = nx;
  return true;
}

function moveTo(st, col) {
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

function softDrop(st) {
  if (st.over || !st.cur) return false;
  if (stepDown(st)) {
    st.acc = 0;
    st.score += 1;
    return true;
  }
  lock(st);
  return true;
}

function hardDrop(st) {
  if (st.over || !st.cur) return;
  let n = 0;
  while (stepDown(st)) n++;
  st.score += n * 2;
  lock(st);
}

// ------------------------------------------------------------------ 时间推进
function tick(st, dt) {
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

function riseOne(st) {
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
function useItem(st, id, r, c) {
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
function progress(st) {
  return st.goal ? Math.min(1, st.lines / st.goal) : 0;
}

function rankOf(st) {
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

const RANK_COLOR = {
  S: '#ffd45e',
  A: '#8fd0ff',
  B: '#9ee6b4',
  C: '#c9c2ae',
  D: '#8a93a8',
};

// 银芯：按本局消行折算
const CREDIT = [
  [6, 1], [12, 2], [18, 3], [24, 5], [30, 7], [40, 10], [50, 14], [65, 19], [80, 25],
];
function creditOf(lines) {
  let v = 0;
  for (const [at, n] of CREDIT) if (lines >= at) v = n;
  return v;
}
return { REALMS, SHAPES, BY_ID, SPECIALS, ITEMS, ITEM_BY_ID, LEVELS, endlessSpeed, makeRng, levelMods, newRun, canPlace, ghostY, move, moveTo, softDrop, hardDrop, tick, riseOne, useItem, progress, rankOf, RANK_COLOR, CREDIT, creditOf };
})();

// ---- js/block.js
const m_block = await (async () => {
const { LEVELS, REALMS, ITEMS, ITEM_BY_ID, SPECIALS, newRun, tick, move, moveTo, softDrop, hardDrop, useItem, ghostY, canPlace, rankOf, creditOf, progress, levelMods, endlessSpeed } = m_block_core;
// 「蚀界方块」——方块从上方落下，左右拖动，满一行就消掉。
//
// 这一页的约定：
// 1. 背景（夜空、船桅、月亮、浪）全是 canvas 现画，只有在改窗口大小时重绘一次；
//    方块的底色取界域色，块上的圆头像取该界域唤醒体的 Q 版头像（每关四张，进关时预载）。
// 2. 逻辑全在 js/block-core.js，这里只做「把状态画出来 + 把操作翻译成 core 的函数」。
// 3. 棋盘尺寸由容器算，不写死 —— 6 列和 5 列的关要共用同一套布局。


// ------------------------------------------------------------------ 四界域的代表唤醒体
// 每关从每个界域挑一个（按关卡序号轮换），一整局只用这四张头像，
// 所以进关时的图片请求固定是 4 个 —— 一个格子一张图的话，边缘会拖死人。
// 路径写全，不用模板拼接：scripts/build_offline_manifest.mjs 只认文本里出现的字面路径。
const WAKE = {
  0: [
    ['assets/avatars/a-15601.webp', '24'],
    ['assets/avatars/a-15588.webp', '艾尔瓦'],
    ['assets/avatars/a-54117.webp', '哈姆林'],
    ['assets/avatars/a-15571.webp', '珈伦'],
    ['assets/avatars/a-77913.webp', '凯蒂古拉'],
    ['assets/avatars/a-15581.webp', '莉莉'],
  ],
  1: [
    ['assets/avatars/a-15600.webp', '阿格里帕'],
    ['assets/avatars/a-15591.webp', '艾继丝'],
    ['assets/avatars/a-95786.webp', '杜勒赛因'],
    ['assets/avatars/a-15577.webp', '菲茵特'],
    ['assets/avatars/a-15587.webp', '希洛'],
    ['assets/avatars/a-15597.webp', '雷娅'],
  ],
  2: [
    ['assets/avatars/a-15573.webp', '奥瑞塔'],
    ['assets/avatars/a-15594.webp', '凯刻斯'],
    ['assets/avatars/a-15566.webp', '希莱斯特'],
    ['assets/avatars/a-77922.webp', '克珀珊特'],
    ['assets/avatars/a-15575.webp', '法洛思'],
    ['assets/avatars/a-15564.webp', '戈利亚'],
  ],
  3: [
    ['assets/avatars/a-15572.webp', '卡茜亚'],
    ['assets/avatars/a-77923.webp', '卡斯托尔'],
    ['assets/avatars/a-77925.webp', '克莱门汀'],
    ['assets/avatars/a-15590.webp', '达芙黛尔'],
    ['assets/avatars/a-15603.webp', '艾瑞卡'],
    ['assets/avatars/a-15583.webp', '奥尔拉'],
  ],
};

function wakeOf(levelId) {
  return REALMS.map((_, i) => WAKE[i][(levelId - 1) % 6]);
}

// ------------------------------------------------------------------ 小工具
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function readJSON(k, d) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : d;
  } catch {
    return d;
  }
}
function writeJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch { /* 存不进去不影响玩 */ }
}

// ------------------------------------------------------------------ 音效
// 没有音频文件，全部现场合成。第一次交互时才建 AudioContext（自动播放策略）。
let actx = null;
let sndOn = readJSON('zjtt:block:snd', true);
function audio() {
  if (!actx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) actx = new C();
  }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function beep(freq, dur, type, gain) {
  if (!sndOn) return;
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  const t0 = a.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.06, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
const sfx = {
  move: () => beep(320, 0.05, 'square', 0.02),
  drop: () => beep(150, 0.12, 'sine', 0.06),
  clear: (n) => {
    beep(380 + n * 70, 0.14, 'triangle', 0.07);
    setTimeout(() => beep(520 + n * 90, 0.16, 'triangle', 0.05), 55);
  },
  item: () => {
    beep(680, 0.1, 'sine', 0.05);
    setTimeout(() => beep(920, 0.12, 'sine', 0.04), 60);
  },
  win: () => [0, 110, 220, 340].forEach((d, i) => setTimeout(() => beep([523, 659, 784, 1047][i], 0.24, 'triangle', 0.06), d)),
  lose: () => [0, 120, 260].forEach((d, i) => setTimeout(() => beep([392, 330, 262][i], 0.3, 'sine', 0.06), d)),
};

// ------------------------------------------------------------------ 状态
const G = {
  lvId: 1,
  st: null,
  mode: 'select', // select | pre | play | over
  imgs: [], // 四张头像
  ready: 0,
  cell: { w: 40, h: 28 },
  board: { x: 0, y: 0, w: 240, h: 340 },
  bg: null,
  parts: [],
  floats: [],
  shake: 0,
  flash: 0,
  aim: null, // 正在瞄准的造物 id
  aimCell: null,
  paused: false,
  drag: null,
  dropBoost: 0,
  t: 0,
  lastFrame: 0,
  resultShown: false,
  hint: '',
};

const SAVE = 'zjtt:block:v2';
const seenSave = () => readJSON(SAVE, { best: {}, endless: 0, seen: {} });
function saveProgress() {
  const s = seenSave();
  writeJSON(SAVE, s);
  return s;
}

// ------------------------------------------------------------------ 画布
const cv = $('#cv');
const ctx = cv.getContext('2d');

function resize() {
  const box = $('#stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(160, box.clientWidth);
  const h = Math.max(200, box.clientHeight);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutBoard(w, h);
  paintBackdrop(w, h, dpr);
}

function layoutBoard(w, h) {
  const st = G.st;
  const cols = st ? st.cols : 6;
  const rows = st ? st.rows : 12;
  // 上方要留出两格多，正在掉进来的方块得看得见完整形状 —— 只露一格的话，
  // 玩家不知道手上是横三还是竖三，根本没法提前摆位。
  const padX = 8;
  const padBottom = 6;
  const topBands = 2.4;
  const availW = w - padX * 2;
  let cw = availW / cols;
  let ch = cw * 0.66;
  const need = (rows + topBands) * ch + padBottom;
  if (need > h) {
    ch = (h - padBottom) / (rows + topBands);
    cw = Math.min(ch / 0.66, availW / cols);
    ch = cw * 0.66;
  }
  const bw = cw * cols;
  const bh = ch * rows;
  G.cell = { w: cw, h: ch };
  G.board = {
    x: (w - bw) / 2,
    y: Math.max(ch * topBands, (h - bh) / 2),
    w: bw,
    h: bh,
  };
}

// 背景只在尺寸变化时重画一次（每帧重画这些渐变太费）
function paintBackdrop(w, h, dpr) {
  const c = G.bg || (G.bg = document.createElement('canvas'));
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = g.createLinearGradient(0, 0, w * 0.3, h);
  sky.addColorStop(0, '#060b1e');
  sky.addColorStop(0.45, '#0f1a3d');
  sky.addColorStop(0.78, '#182750');
  sky.addColorStop(1, '#14203a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  let seed = 20261103;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 80; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.8;
    const r = rnd() * 1.3 + 0.3;
    g.globalAlpha = 0.12 + rnd() * 0.42;
    g.fillStyle = '#cfe1ff';
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;

  const mx = w * 0.78;
  const my = h * 0.12;
  const mr = Math.max(22, Math.min(w * 0.08, 46));
  const halo = g.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3.4);
  halo.addColorStop(0, 'rgba(206,230,255,.5)');
  halo.addColorStop(0.34, 'rgba(150,196,255,.16)');
  halo.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = halo;
  g.beginPath();
  g.arc(mx, my, mr * 3.4, 0, 7);
  g.fill();
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, '#ffffff');
  moon.addColorStop(0.7, '#dfeaff');
  moon.addColorStop(1, '#b3c8ee');
  g.fillStyle = moon;
  g.beginPath();
  g.arc(mx, my, mr, 0, 7);
  g.fill();

  // 船桅剪影
  g.save();
  g.globalAlpha = 0.5;
  g.strokeStyle = '#080f22';
  g.lineCap = 'round';
  const mastX = w * 0.34;
  g.lineWidth = Math.max(6, w * 0.024);
  g.beginPath();
  g.moveTo(mastX, h * 0.05);
  g.lineTo(mastX - w * 0.012, h);
  g.stroke();
  g.lineWidth = Math.max(2.5, w * 0.01);
  for (let i = 0; i < 4; i++) {
    const y = h * (0.3 + i * 0.11);
    const halfW = w * (0.08 + i * 0.024);
    g.beginPath();
    g.moveTo(mastX, y);
    g.lineTo(mastX - halfW, y + h * 0.028);
    g.stroke();
    g.beginPath();
    g.moveTo(mastX, y);
    g.lineTo(mastX + halfW, y + h * 0.028);
    g.stroke();
  }
  g.restore();

  const wave = (y0, amp, alpha, color) => {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, y0);
    for (let x = 0; x <= w; x += w / 6) {
      g.quadraticCurveTo(x + w / 12, y0 - amp, x + w / 6, y0 + amp * 0.25);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  };
  wave(h * 0.9, h * 0.024, 0.45, '#0b1730');
  wave(h * 0.94, h * 0.018, 0.6, '#0e1d3b');
  wave(h * 0.975, h * 0.012, 0.8, '#122446');
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ 画的零件
function roundRect(g, x, y, w, h, r) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// 棱彩走彩虹，其余走界域色
function realmColors(idx) {
  if (idx < 0 || idx >= REALMS.length) return { c: '#cfd6e6', d: '#5a6478', l: '#ffffff' };
  const r = REALMS[idx];
  return { c: r.c, d: r.d, l: r.l };
}

// 一格方块：底色 + 上缘高光 + 头像 + 特殊块标记
function drawBlockCell(g, x, y, cw, ch, realm, sp, opt) {
  const o = opt || {};
  const pad = Math.min(cw, ch) * 0.06;
  const bx = x + pad;
  const by = y + pad;
  const bw = cw - pad * 2;
  const bh = ch - pad * 2;
  const rad = Math.min(bw, bh) * 0.26;
  const col = realmColors(realm);
  const alpha = o.alpha == null ? 1 : o.alpha;

  g.save();
  g.globalAlpha = alpha;

  // 影子
  if (!o.ghost) {
    g.fillStyle = 'rgba(2,6,16,.4)';
    roundRect(g, bx + 1, by + 2.5, bw, bh, rad);
    g.fill();
  }

  // 主体：上亮下暗的两段
  const grd = g.createLinearGradient(bx, by, bx, by + bh);
  grd.addColorStop(0, col.l);
  grd.addColorStop(0.42, col.c);
  grd.addColorStop(1, col.d);
  g.fillStyle = grd;
  roundRect(g, bx, by, bw, bh, rad);
  g.fill();

  if (realm < 0) {
    // 棱彩：斜着扫一道彩带
    g.save();
    roundRect(g, bx, by, bw, bh, rad);
    g.clip();
    const rb = g.createLinearGradient(bx, by, bx + bw, by + bh);
    rb.addColorStop(0, 'rgba(255,120,150,.85)');
    rb.addColorStop(0.35, 'rgba(150,210,255,.85)');
    rb.addColorStop(0.7, 'rgba(180,255,190,.85)');
    rb.addColorStop(1, 'rgba(255,235,150,.85)');
    g.globalAlpha = alpha * 0.55;
    g.fillStyle = rb;
    g.fillRect(bx, by, bw, bh);
    g.restore();
  }

  // 上缘高光
  g.globalAlpha = alpha * 0.55;
  g.fillStyle = 'rgba(255,255,255,.5)';
  roundRect(g, bx + bw * 0.1, by + bh * 0.09, bw * 0.8, bh * 0.26, rad * 0.7);
  g.fill();
  g.globalAlpha = alpha;

  // 头像：圆形裁切，贴在格子正中
  const img = G.imgs[clamp(realm, 0, 3)];
  const d = Math.min(bw, bh) * 0.62;
  const cx = bx + bw / 2;
  const cy = by + bh * 0.58;
  if (img && img.ok && !o.ghost) {
    g.save();
    g.beginPath();
    g.arc(cx, cy, d / 2, 0, 7);
    g.clip();
    g.globalAlpha = alpha;
    g.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    g.restore();
    // 头像外圈
    g.globalAlpha = alpha * 0.8;
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = Math.max(1, d * 0.05);
    g.beginPath();
    g.arc(cx, cy, d / 2, 0, 7);
    g.stroke();
  } else if (!o.ghost) {
    // 图还没到，先画个界域符号顶着，不要留空洞
    g.globalAlpha = alpha * 0.85;
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath();
    g.arc(cx, cy, d * 0.28, 0, 7);
    g.fill();
  }
  g.globalAlpha = alpha;

  // 特殊块标记
  if (sp === 'crystal') {
    g.globalAlpha = alpha * 0.9;
    g.strokeStyle = 'rgba(190,235,255,.95)';
    g.lineWidth = Math.max(1.4, bw * 0.07);
    roundRect(g, bx + bw * 0.06, by + bh * 0.08, bw * 0.88, bh * 0.84, rad * 0.8);
    g.stroke();
    // 两个角上点几粒冰碴
    g.fillStyle = 'rgba(220,245,255,.9)';
    for (const [px, py] of [[0.14, 0.2], [0.86, 0.26], [0.2, 0.84]]) {
      g.beginPath();
      g.arc(bx + bw * px, by + bh * py, Math.max(1, bw * 0.045), 0, 7);
      g.fill();
    }
  } else if (sp === 'bomb') {
    // 彩色底上直接画亮黄线看不清，先垫一层深色再画
    const sx = bx + bw * 0.2;
    const sy = by + bh * 0.22;
    const r = Math.min(bw, bh) * 0.2;
    g.globalAlpha = alpha * 0.72;
    g.fillStyle = 'rgba(12,6,4,.72)';
    g.beginPath();
    g.arc(sx, sy, r * 1.25, 0, 7);
    g.fill();
    g.globalAlpha = alpha;
    g.strokeStyle = '#ffd07a';
    g.lineWidth = Math.max(1.2, Math.min(bw, bh) * 0.055);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(sx + Math.cos(a) * r * 0.34, sy + Math.sin(a) * r * 0.34);
      g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      g.stroke();
    }
  } else if (sp === 'line') {
    g.globalAlpha = alpha * 0.8;
    const lw = Math.max(1.6, Math.min(bw, bh) * 0.1);
    // 先用深色描一遍，再叠亮线，任何底色上都看得见
    g.strokeStyle = 'rgba(8,14,26,.62)';
    g.lineWidth = lw * 2.1;
    g.beginPath();
    g.moveTo(bx + bw * 0.14, by + bh * 0.82);
    g.lineTo(bx + bw * 0.86, by + bh * 0.82);
    g.moveTo(bx + bw * 0.84, by + bh * 0.14);
    g.lineTo(bx + bw * 0.84, by + bh * 0.86);
    g.stroke();
    g.globalAlpha = alpha;
    g.strokeStyle = '#d6f2ff';
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(bx + bw * 0.14, by + bh * 0.82);
    g.lineTo(bx + bw * 0.86, by + bh * 0.82);
    g.moveTo(bx + bw * 0.84, by + bh * 0.14);
    g.lineTo(bx + bw * 0.84, by + bh * 0.86);
    g.stroke();
  } else if (sp === 'prism') {
    g.globalAlpha = alpha * 0.95;
    g.fillStyle = 'rgba(255,255,255,.92)';
    const sx = bx + bw * 0.76;
    const sy = by + bh * 0.2;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? bw * 0.05 : bw * 0.11;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }

  g.restore();
}

// ------------------------------------------------------------------ 主绘制
function draw() {
  const st = G.st;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (G.bg) ctx.drawImage(G.bg, 0, 0, w, h);
  if (!st) return;

  const { w: cw, h: ch } = G.cell;
  const B = G.board;

  // 震动
  let sx = 0;
  let sy = 0;
  if (G.shake > 0) {
    sx = (Math.random() - 0.5) * G.shake * 8;
    sy = (Math.random() - 0.5) * G.shake * 8;
  }
  ctx.save();
  ctx.translate(sx, sy);

  // 棋盘底
  ctx.save();
  ctx.fillStyle = 'rgba(9,16,34,.62)';
  roundRect(ctx, B.x - 3, B.y - 3, B.w + 6, B.h + 6, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,168,255,.28)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, B.x - 3, B.y - 3, B.w + 6, B.h + 6, 10);
  ctx.stroke();
  ctx.restore();

  // 网格
  ctx.save();
  ctx.strokeStyle = 'rgba(120,170,240,.10)';
  ctx.lineWidth = 1;
  for (let c = 1; c < st.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(B.x + c * cw, B.y);
    ctx.lineTo(B.x + c * cw, B.y + B.h);
    ctx.stroke();
  }
  for (let r = 1; r < st.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(B.x, B.y + r * ch);
    ctx.lineTo(B.x + B.w, B.y + r * ch);
    ctx.stroke();
  }
  ctx.restore();

  // 上场落好的方块
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const cell = st.board[r][c];
      if (!cell) continue;
      drawBlockCell(ctx, B.x + c * cw, B.y + r * ch, cw, ch, cell.r, cell.sp, null);
    }
  }

  // 落点影子
  const cur = st.cur;
  if (cur && !st.over) {
    const gy = ghostY(st, cur);
    if (gy !== cur.oy) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (const cl of cur.cells) {
        const r = gy + cl.dr;
        const c = cur.ox + cl.dc;
        if (r < 0) continue;
        const x = B.x + c * cw;
        const y = B.y + r * ch;
        ctx.strokeStyle = 'rgba(190,225,255,.75)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        roundRect(ctx, x + cw * 0.1, y + ch * 0.12, cw * 0.8, ch * 0.76, Math.min(cw, ch) * 0.2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    // 当前方块
    for (const cl of cur.cells) {
      const r = cur.oy + cl.dr;
      const c = cur.ox + cl.dc;
      if (r < -3) continue;
      drawBlockCell(ctx, B.x + c * cw, B.y + r * ch, cw, ch, cur.realm, cl.sp, null);
    }
  }

  // 上方预告：马上要从这一列掉下来的方块
  if (st.pending && st.pending.length) {
    for (const p of st.pending) {
      const x = B.x + p.col * cw;
      const col = realmColors(p.realm);
      ctx.save();
      ctx.globalAlpha = 0.85;
      // 小色块 + 向下箭头
      ctx.fillStyle = col.c;
      roundRect(ctx, x + cw * 0.24, B.y - 20, cw * 0.52, 11, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + cw * 0.34, B.y - 7);
      ctx.lineTo(x + cw * 0.66, B.y - 7);
      ctx.lineTo(x + cw * 0.5, B.y - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // 瞄准格
  if (G.aim && G.aimCell) {
    const { r, c } = G.aimCell;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,236,150,.95)';
    ctx.lineWidth = 2;
    const spread = G.aim === 'bomb' ? 1 : 0;
    for (let dr = -spread; dr <= spread; dr++) {
      for (let dc = -spread; dc <= spread; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
        roundRect(ctx, B.x + cc * cw + 2, B.y + rr * ch + 2, cw - 4, ch - 4, 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore();

  // 粒子
  for (const p of G.parts) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.c;
    const s = p.s * (0.4 + (p.life / p.max) * 0.6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  // 飘字
  for (const f of G.floats) {
    ctx.save();
    const k = 1 - f.life / f.max;
    ctx.globalAlpha = clamp(1 - k * k, 0, 1);
    ctx.fillStyle = f.c;
    ctx.font = `700 ${f.size}px "PingFang SC",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y - k * 34);
    ctx.restore();
  }

  // 连消大字
  if (G.comboText && G.comboText.life > 0) {
    const f = G.comboText;
    const k = 1 - f.life / f.max;
    ctx.save();
    ctx.globalAlpha = clamp(1.6 - k * 2.2, 0, 1);
    ctx.textAlign = 'center';
    const scale = 1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.18;
    ctx.translate(w / 2, B.y + B.h * 0.42);
    ctx.scale(scale, scale);
    ctx.font = '900 30px "PingFang SC",system-ui,sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(6,10,22,.75)';
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.c;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }

  // 冻结的提示
  if (st.frozen > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(160,220,255,.5)';
    ctx.lineWidth = 2;
    roundRect(ctx, B.x - 5, B.y - 5, B.w + 10, B.h + 10, 12);
    ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 特效
function burst(r, c, realm) {
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  const x = B.x + c * cw + cw / 2;
  const y = B.y + r * ch + ch / 2;
  const col = realmColors(realm);
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 40 + Math.random() * 130;
    G.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
      s: 1.4 + Math.random() * 2.6, c: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? col.c : col.l),
      life: 0.42 + Math.random() * 0.3, max: 0.72,
    });
  }
}

function pushFloat(x, y, text, color, size) {
  G.floats.push({ x, y, text, c: color, size: size || 18, life: 0.9, max: 0.9 });
}

// 把 core 记下的 fx 变成看得见的东西
function drainFx() {
  const st = G.st;
  if (!st || !st.fx.length) return;
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  for (const e of st.fx) {
    if (e.k === 'clear') {
      for (const x of e.cells) burst(x.r, x.c, x.realm);
      const topRow = Math.min(...e.rows);
      const gain = e.gain + (e.resonate ? e.resonate * 200 : 0);
      pushFloat(B.x + B.w / 2, B.y + topRow * ch + ch * 0.4, '+' + gain, e.resonate ? '#ffd7a8' : '#ffe9a8', 20);
      if (e.combo > 1 || e.resonate) {
        G.comboText = {
          text: e.resonate ? `${e.combo > 1 ? 'COMBO ' + e.combo : ''}${e.resonate ? ' 共鸣' : ''}`.trim() : 'COMBO ' + e.combo,
          c: e.resonate ? '#ffcf7a' : '#a9d8ff',
          life: 0.75,
          max: 0.75,
        };
      }
      G.shake = Math.min(1, 0.35 + e.rows.length * 0.2);
      sfx.clear(e.rows.length);
    } else if (e.k === 'item') {
      sfx.item();
      const it = ITEM_BY_ID[e.id];
      if (it) pushFloat(B.x + B.w - 24, B.y + B.h - 20, it.n, '#bff0c6', 14);
    } else if (e.k === 'crack' || e.k === 'hammer' || e.k === 'boom') {
      burst(e.r, e.c, -1);
      G.shake = Math.max(G.shake, 0.3);
      sfx.drop();
    } else if (e.k === 'lock') {
      sfx.drop();
    } else if (e.k === 'tide') {
      G.shake = Math.max(G.shake, 0.4);
      pushFloat(B.x + B.w / 2, B.y + B.h * 0.7, '洋流上升', '#9ed4ff', 15);
    } else if (e.k === 'rain') {
      burst(e.r, e.c, e.realm);
    } else if (e.k === 'win') {
      sfx.win();
      finish(true);
    } else if (e.k === 'over') {
      sfx.lose();
      finish(false);
    }
  }
  st.fx.length = 0;
}

// ------------------------------------------------------------------ 帧
function frame(now) {
  const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000);
  G.lastFrame = now;
  G.t += dt;

  if (G.st && G.mode === 'play' && !G.paused) {
    if (G.st.lvId === 13) {
      const sp = endlessSpeed(G.st.lines);
      G.st.dropSec = 1 / (0.82 * sp);
    }
    tick(G.st, dt * (G.dropBoost > 0 ? 8 : 1));
    drainFx();
    syncHud();
  }

  // 粒子与飘字
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.parts.splice(i, 1);
      continue;
    }
    p.vy += 620 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    G.floats[i].life -= dt;
    if (G.floats[i].life <= 0) G.floats.splice(i, 1);
  }
  if (G.comboText) {
    G.comboText.life -= dt;
    if (G.comboText.life <= 0) G.comboText = null;
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 3);

  draw();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ HUD
function liveRank(st) {
  if (st.lvId === 13) {
    if (st.lines >= 45) return 'S';
    if (st.lines >= 30) return 'A';
    if (st.lines >= 18) return 'B';
    if (st.lines >= 8) return 'C';
    return 'D';
  }
  if (st.lines >= st.goal) return 'S';
  // 才走两三块就报 S 太假；但已经消掉一半目标的，别压成 D
  if (st.moves < 4 && st.lines < st.goal * 0.5) return 'D';
  const left = st.maxMoves - st.moves;
  if (left <= 0) return 'D';
  const rate = st.lines / st.moves;
  const expect = st.lines + rate * left;
  const need = st.goal;
  if (expect >= need * 1.5) return 'S';
  if (expect >= need * 1.15) return 'A';
  if (expect >= need * 0.9) return 'B';
  if (expect >= need * 0.6) return 'C';
  return 'D';
}

let hudCache = {};
function syncHud() {
  const st = G.st;
  if (!st) return;
  const rk = liveRank(st);
  if (hudCache.rank !== rk) {
    hudCache.rank = rk;
    const el = $('#rank');
    el.textContent = rk;
    el.dataset.k = rk;
  }
  if (hudCache.score !== st.score) {
    hudCache.score = st.score;
    $('#score').textContent = st.score.toLocaleString('en-US');
  }
  if (hudCache.lines !== st.lines) {
    hudCache.lines = st.lines;
    $('#goalTxt').textContent = st.goal ? `${st.lines} / ${st.goal}` : `${st.lines}`;
    $('#goalBar').style.width = (st.goal ? Math.min(100, (st.lines / st.goal) * 100) : Math.min(100, (st.lines / 45) * 100)) + '%';
  }
  if (hudCache.moves !== st.moves || hudCache.maxMoves !== st.maxMoves) {
    hudCache.moves = st.moves;
    hudCache.maxMoves = st.maxMoves;
    $('#moveTxt').textContent = st.maxMoves ? `${st.moves} / ${st.maxMoves}` : `${st.moves}`;
  }
  const key = st.items.join(',') + '|' + st.next.sh + st.next.realm + (st.cur ? st.cur.sh : '');
  if (hudCache.items !== key) {
    hudCache.items = key;
    paintItems();
    paintNext();
  }
}

function paintItems() {
  const st = G.st;
  const bar = $('#itemBar');
  if (!st) return;
  bar.innerHTML = '';
  for (let i = 0; i < st.itemCap; i++) {
    const id = st.items[i];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (id ? ' has' : '') + (G.aim === id ? ' on' : '');
    if (id) {
      const it = ITEM_BY_ID[id];
      slot.title = `${it.n}：${it.d}`;
      slot.innerHTML = `<span class="ic ic-${it.icon}"></span>`;
      slot.addEventListener('click', () => tapItem(id));
    } else {
      slot.disabled = true;
    }
    bar.appendChild(slot);
  }
}

function paintNext() {
  const st = G.st;
  const box = $('#nextPv');
  if (!st) return;
  const p = st.next;
  const fog = st.mods.fog;
  box.innerHTML = '';
  const c = document.createElement('canvas');
  const size = 44;
  c.width = size * 2;
  c.height = size * 2;
  c.style.width = size + 'px';
  c.style.height = size + 'px';
  const g = c.getContext('2d');
  g.scale(2, 2);
  if (fog) {
    g.fillStyle = 'rgba(140,170,220,.55)';
    g.font = '700 26px "PingFang SC",system-ui';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('?', size / 2, size / 2);
  } else {
    const cw = Math.min(15, (size - 8) / p.w);
    const chh = cw * 0.72;
    const ox = (size - p.w * cw) / 2;
    const oy = (size - p.h * chh) / 2;
    // 预览里不画头像，画头像太挤，只给颜色和形状
    for (const cl of p.cells) {
      drawBlockCell(g, ox + cl.dc * cw, oy + cl.dr * chh, cw, chh, p.realm, cl.sp, { ghost: true });
      g.save();
      const col = realmColors(p.realm);
      g.fillStyle = col.c;
      roundRect(g, ox + cl.dc * cw + 1, oy + cl.dr * chh + 1, cw - 2, chh - 2, Math.min(cw, chh) * 0.24);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.4)';
      g.lineWidth = 1;
      roundRect(g, ox + cl.dc * cw + 1, oy + cl.dr * chh + 1, cw - 2, chh - 2, Math.min(cw, chh) * 0.24);
      g.stroke();
      g.restore();
    }
  }
  box.appendChild(c);
  box.setAttribute('aria-label', fog ? '下一块：看不见' : '下一块');
}

// ------------------------------------------------------------------ 交互
function cellFromPoint(clientX, clientY) {
  const rect = cv.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  const c = Math.floor((x - B.x) / cw);
  const r = Math.floor((y - B.y) / ch);
  if (r < 0 || r >= (G.st ? G.st.rows : 0) || c < 0 || c >= (G.st ? G.st.cols : 0)) return null;
  return { r, c, x, y };
}

function tapItem(id) {
  const st = G.st;
  if (!st || st.over || G.mode !== 'play') return;
  const it = ITEM_BY_ID[id];
  if (!it) return;
  audio();
  if (it.aim) {
    G.aim = G.aim === id ? null : id;
    G.aimCell = null;
    paintItems();
    showTip(G.aim ? '点棋盘上要用它的位置' : '');
    return;
  }
  if (useItem(st, id, -1, -1)) {
    G.aim = null;
    paintItems();
    drainFx();
    draw();
  }
}

function stageDown(e) {
  const st = G.st;
  if (!st || G.mode !== 'play' || st.over) return;
  audio();
  const pt = e.touches ? e.touches[0] : e;
  try { if (cv.setPointerCapture && e.pointerId != null) cv.setPointerCapture(e.pointerId); } catch { /* 合成事件没有有效 id */ }

  // 瞄准模式：这一下直接落子
  if (G.aim) {
    const cell = cellFromPoint(pt.clientX, pt.clientY);
    if (cell && useItem(st, G.aim, cell.r, cell.c)) {
      G.aim = null;
      G.aimCell = null;
      paintItems();
      drainFx();
      draw();
    }
    return;
  }

  G.drag = {
    x0: pt.clientX,
    y0: pt.clientY,
    col0: st.cur ? st.cur.ox : 0,
    moved: false,
    t0: performance.now(),
  };
}

function stageMove(e) {
  const st = G.st;
  if (!st) return;
  const pt = e.touches ? e.touches[0] : e;
  if (G.aim) {
    const cell = cellFromPoint(pt.clientX, pt.clientY);
    G.aimCell = cell;
    return;
  }
  if (!G.drag || !st.cur || st.over) return;
  const dx = pt.clientX - G.drag.x0;
  const dy = pt.clientY - G.drag.y0;
  const cw = G.cell.w;
  const steps = Math.round(dx / (cw * 0.72));
  if (steps !== 0) {
    const target = clamp(G.drag.col0 + steps, 0, st.cols - 1);
    if (moveTo(st, target)) {
      G.drag.moved = true;
      sfx.move();
    }
  }
  // 往下拖 = 加速下落
  G.dropBoost = dy > 26 ? 1 : 0;
}

function stageUp() {
  if (G.drag) {
    G.drag = null;
    G.dropBoost = 0;
  }
}

function bindStage() {
  cv.addEventListener('pointerdown', stageDown);
  cv.addEventListener('pointermove', stageMove);
  cv.addEventListener('pointerup', stageUp);
  cv.addEventListener('pointercancel', stageUp);
  cv.addEventListener('pointerleave', stageUp);
  // 触屏上 pointer 事件也要 preventDefault，否则会跟着滚页面
  cv.addEventListener('touchstart', (e) => { if (G.mode === 'play') e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', (e) => { if (G.mode === 'play') e.preventDefault(); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const st = G.st;
    if (!st || G.mode !== 'play' || G.paused) return;
    if (e.key === 'ArrowLeft') { if (move(st, -1)) sfx.move(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { if (move(st, 1)) sfx.move(); e.preventDefault(); }
    else if (e.key === 'ArrowDown') { softDrop(st); e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { hardDrop(st); drainFx(); e.preventDefault(); }
    else if (e.key === 'p' || e.key === 'P') togglePause();
  });
}

// ------------------------------------------------------------------ 提示
// 提示走底部那一行（关卡名与提示交替），不浮在棋盘上 —— 小屏浮条会压住最底一行。
let tipTimer = 0;
let baseName = '';
function showTip(text) {
  const el = $('#lvName');
  if (!el) return;
  clearTimeout(tipTimer);
  if (!text) {
    el.textContent = baseName;
    el.classList.remove('hl');
    return;
  }
  el.textContent = text;
  el.classList.add('hl');
  tipTimer = setTimeout(() => {
    el.textContent = baseName;
    el.classList.remove('hl');
  }, 2600);
}

// ------------------------------------------------------------------ 关卡选择 / 开战
function paintSelect() {
  const data = seenSave();
  const list = $('#lvList');
  list.innerHTML = '';
  // 前三关默认开着：新玩家可以先试试「落影」「涨潮」再决定从哪关啃；
  // 后面一律要前一关过了才开，无尽关要十二关全通。
  let unlocked = true;
  for (const lv of LEVELS) {
    const best = data.best[lv.id];
    const isEndless = lv.endless;
    const open = lv.id <= 3 || unlocked || !!best;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'lv' + (open ? '' : ' lock') + (isEndless ? ' endless' : '');
    card.dataset.id = lv.id;
    if (!open) card.disabled = true;
    const mods = levelMods(lv);
    const tags = [];
    if (mods.rain) tags.push('落影');
    if (mods.tide) tags.push('涨潮');
    if (mods.fog) tags.push('迷雾');
    if (mods.harden) tags.push('结晶');
    if (mods.rubble) tags.push('残块');
    if (lv.cols === 5) tags.push('五列');
    card.innerHTML = `
      <span class="no">${isEndless ? '∞' : String(lv.id).padStart(2, '0')}</span>
      <span class="meta">
        <b>${lv.t}</b>
        <i>${lv.sub}</i>
        <em>${isEndless ? `最高 ${data.endless || 0} 行` : `目标 ${lv.goal} 行 · ${lv.moves} 回合`}${tags.length ? ' · ' + tags.join('/') : ''}</em>
      </span>
      <span class="rk">${best ? `<b data-k="${best}">${best}</b>` : open ? '<b class="none">—</b>' : '锁'}</span>
    `;
    card.addEventListener('click', () => openPre(lv.id));
    list.appendChild(card);
    if (!best && !isEndless) unlocked = false;
  }
}

function openPre(id) {
  const lv = LEVELS.find((x) => x.id === id);
  if (!lv) return;
  G.lvId = id;
  audio();
  G.mode = 'pre';
  $('#scrSelect').hidden = true;
  $('#scrPre').hidden = false;

  $('#preTitle').textContent = lv.t;
  $('#preSub').textContent = lv.sub;
  $('#preGoal').textContent = lv.endless ? '不限' : `${lv.goal} 行`;
  $('#preMoves').textContent = lv.endless ? '不限' : `${lv.moves} 回合`;

  // 机制
  const modsBox = $('#preMods');
  modsBox.innerHTML = '';
  const mods = levelMods(lv);
  const modList = [];
  if (mods.rain) modList.push(['投射光线', `每回合有 ${Math.round(mods.rain * 100)}% 概率从上方掉下一块孤块，落点会提前标在棋盘顶上。`]);
  if (mods.tide) modList.push(['飘忽洋流', `每 ${mods.tide} 回合整盘上浮一行，底下涌上一排新方块。顶层不平就会被顶穿。`]);
  if (mods.fog) modList.push(['浓雾', '看不见下一块，只能凭手感走。']);
  if (mods.harden) modList.push(['结晶', `新方块有 ${Math.round(mods.harden * 100)}% 概率带一层壳，要消两次。`]);
  if (mods.rubble) modList.push(['残块', `开局就压着 ${mods.rubble} 个旧块在底下。`]);
  if (lv.cols === 5) modList.push(['窄道', '只有五列，横四几乎不会来。']);
  if (!modList.length) modList.push(['无附加机制', '这一关只看你消得快不快。']);
  for (const [n, d] of modList) {
    const el = document.createElement('div');
    el.className = 'mod';
    el.innerHTML = `<b>${n}</b><p>${d}</p>`;
    modsBox.appendChild(el);
  }

  // 方块预告：把本关会出现的形状画出来
  const pBox = $('#prePieces');
  pBox.innerHTML = '';
  const wake = wakeOf(id);
  const shapes = lv.cols === 5 ? ['s1', 'h2', 'v2', 'h3', 'v3', 'q4'] : ['s1', 'h3', 'v4', 'q4', 'h4', 'v2'];
  const cellsOf = { s1: [[0, 0]], h2: [[0, 0], [1, 0]], v2: [[0, 0], [0, 1]], h3: [[0, 0], [1, 0], [2, 0]], v3: [[0, 0], [0, 1], [0, 2]], h4: [[0, 0], [1, 0], [2, 0], [3, 0]], v4: [[0, 0], [0, 1], [0, 2], [0, 3]], q4: [[0, 0], [1, 0], [0, 1], [1, 1]] };
  shapes.forEach((sid, i) => {
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    c.style.width = '48px';
    c.style.height = '48px';
    const g = c.getContext('2d');
    g.scale(2, 2);
    const cs = cellsOf[sid];
    const realm = i % 4;
    const cw = 13;
    const ch2 = 9;
    const w = (Math.max(...cs.map((x) => x[0])) + 1) * cw;
    const h = (Math.max(...cs.map((x) => x[1])) + 1) * ch2;
    const ox = (48 - w) / 2;
    const oy = (48 - h) / 2;
    for (const [dc, dr] of cs) {
      drawBlockCell(g, ox + dc * cw, oy + dr * ch2, cw, ch2, realm, null, { ghost: true });
      const col = realmColors(realm);
      g.fillStyle = col.c;
      roundRect(g, ox + dc * cw + 1, oy + dr * ch2 + 1, cw - 2, ch2 - 2, 2.4);
      g.fill();
    }
    pBox.appendChild(c);
  });

  // 道具预告
  const iBox = $('#preItems');
  iBox.innerHTML = '';
  for (const it of ITEMS) {
    const el = document.createElement('div');
    el.className = 'pi';
    el.title = it.d;
    el.innerHTML = `<span class="ic ic-${it.icon}"></span><b>${it.n}</b>`;
    iBox.appendChild(el);
  }

  // 出战角色
  const wBox = $('#preWake');
  wBox.innerHTML = '';
  wake.forEach(([wid, name], i) => {
    const el = document.createElement('div');
    el.className = 'wk';
    el.innerHTML = `<img src="${wid}" alt="" width="34" height="34" loading="eager" decoding="async"><span>${name}</span>`;
    el.style.setProperty('--rc', REALMS[i].c);
    wBox.appendChild(el);
  });

  $('#preTip').textContent = lv.tip || '';
}

function startRun() {
  const lv = LEVELS.find((x) => x.id === G.lvId);
  if (!lv) return;
  audio();
  $('#scrSelect').hidden = true;
  $('#scrPre').hidden = true;
  $('#scrPlay').hidden = false;
  G.mode = 'play';
  G.paused = false;
  G.resultShown = false;
  G.parts.length = 0;
  G.floats.length = 0;
  G.comboText = null;
  G.aim = null;
  G.shake = 0;
  hudCache = {};
  G.st = newRun(lv.id, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);

  // 四张头像先挂上，loaded 之后重画
  G.imgs = [];
  G.ready = 0;
  wakeOf(lv.id).forEach(([src], i) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      im.ok = true;
      G.ready++;
      draw();
    };
    im.onerror = () => { G.ready++; };
    im.src = src;
    G.imgs[i] = im;
  });

  resize();
  paintItems();
  paintNext();
  syncHud();
  draw();
  baseName = lv.t;
  $('#lvName').textContent = lv.t;
  showTip(lv.tip || '');
}

// ------------------------------------------------------------------ 结束
function finish(win) {
  const st = G.st;
  if (!st || G.resultShown) return;
  G.resultShown = true;
  G.mode = 'over';

  const rank = win ? rankOf(st) : 'D';
  const data = seenSave();
  const prev = data.best[st.lvId];
  const order = { D: 0, C: 1, B: 2, A: 3, S: 4 };
  if (win && (!prev || order[rank] > order[prev])) data.best[st.lvId] = rank;
  if (st.lvId === 13 && st.lines > (data.endless || 0)) data.endless = st.lines;

  // 银芯按消行折算，只在第一次拿到这个评级时给（重刷不给，避免刷分）
  const credit = win && (!prev || order[rank] > order[prev]) ? creditOf(st.lines) : (win ? 1 : 0);
  if (credit > 0) payCredits(credit);
  writeJSON(SAVE, data);

  setTimeout(() => {
    const ov = $('#ovResult');
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('on'));
    $('#resRank').textContent = rank;
    $('#resRank').dataset.k = rank;
    $('#resTitle').textContent = win ? (st.lvId === 13 ? '走到尽头了' : '守住了') : '沉下去了';
    $('#resWhy').textContent = win
      ? (st.lvId === 13 ? `这一趟消了 ${st.lines} 行。` : `目标 ${st.goal} 行，你用了 ${st.moves} 回合。`)
      : (st.reason || '没撑住');
    $('#resLines').textContent = st.lines;
    $('#resScore').textContent = st.score.toLocaleString('en-US');
    $('#resCombo').textContent = st.maxCombo > 1 ? `×${st.maxCombo}` : '—';
    $('#resCredit').textContent = credit > 0 ? `+${credit}` : '+0';
    const nextLv = LEVELS.find((x) => x.id === st.lvId + 1);
    $('#resNext').hidden = !(win && nextLv);
    $('#resNext').textContent = nextLv ? `下一关：${nextLv.t}` : '';
    $('#resRetry').textContent = win ? '再打一次' : '重来';
  }, win ? 420 : 700);
}

function payCredits(n) {
  if (!(n > 0)) return;
  try {
    const cur = Number(JSON.parse(localStorage.getItem('zjtt:credits') || '0')) || 0;
    const v = Math.max(0, cur + Math.round(n));
    localStorage.setItem('zjtt:credits', JSON.stringify(v));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
  } catch { /* 钱包写不进去不影响游戏 */ }
}

function backToSelect() {
  G.mode = 'select';
  G.st = null;
  G.paused = false;
  $('#scrPlay').hidden = true;
  $('#scrPre').hidden = true;
  $('#ovResult').hidden = true;
  $('#ovResult').classList.remove('on');
  $('#ovPause').hidden = true;
  $('#ovPause').classList.remove('on');
  $('#scrSelect').hidden = false;
  paintSelect();
}

function togglePause(force) {
  if (G.mode !== 'play' || !G.st || G.st.over) return;
  G.paused = force == null ? !G.paused : force;
  const ov = $('#ovPause');
  ov.hidden = !G.paused;
  requestAnimationFrame(() => ov.classList.toggle('on', G.paused));
}

// ------------------------------------------------------------------ 绑定
function bindUi() {
  $('#preGo').addEventListener('click', startRun);
  $('#preBack').addEventListener('click', backToSelect);
  $('#btnPause').addEventListener('click', () => togglePause());
  $('#pContinue').addEventListener('click', () => togglePause(false));
  $('#pQuit').addEventListener('click', backToSelect);
  $('#resRetry').addEventListener('click', () => {
    $('#ovResult').hidden = true;
    $('#ovResult').classList.remove('on');
    startRun();
  });
  $('#resBack').addEventListener('click', backToSelect);
  $('#resNext').addEventListener('click', () => {
    $('#ovResult').hidden = true;
    $('#ovResult').classList.remove('on');
    openPre(G.st.lvId + 1);
  });
  $('#btnSnd').addEventListener('click', () => {
    sndOn = !sndOn;
    writeJSON('zjtt:block:snd', sndOn);
    $('#btnSnd').classList.toggle('off', !sndOn);
    if (sndOn) sfx.item();
  });
  $('#btnSnd').classList.toggle('off', !sndOn);

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (G.mode === 'play') resize();
    }, 120);
  });
}

// ------------------------------------------------------------------ 启动
function boot() {
  bindUi();
  bindStage();
  paintSelect();
  $('#scrSelect').hidden = false;
  $('#scrPre').hidden = true;
  $('#scrPlay').hidden = true;
  layoutBoard($('#stage').clientWidth || 360, $('#stage').clientHeight || 480);
  requestAnimationFrame(frame);
  // 页面里的「正在载入」由这里摘掉
  const b = document.getElementById('boot');
  if (b) b.classList.add('done');
}

// 自测入口（只在 ?_test=1 时挂）：无头浏览器要靠它跳关、摆盘、看内部状态
if (location.search.includes('_test=1')) {
  window.__block = {
    G,
    openPre,
    startRun,
    backToSelect,
    finish,
    unlockAll() {
      const d = seenSave();
      for (const lv of LEVELS) if (!lv.endless) d.best[lv.id] = d.best[lv.id] || 'B';
      writeJSON(SAVE, d);
      paintSelect();
    },
    // 无头浏览器会把 rAF 节流，靠这个手动推进时间，测试才可复现
    advance(sec) {
      const st = G.st;
      if (!st) return null;
      const n = Math.round(sec * 60);
      for (let i = 0; i < n; i++) {
        tick(st, 1 / 60);
        drainFx();
      }
      syncHud();
      draw();
      return this.state();
    },
    step(dt) {
      tick(G.st, dt);
      drainFx();
      return this.state();
    },
    paint() {
      paintItems();
      paintNext();
      syncHud();
      draw();
    },
    fill(rows) {
      // 用 '0-3' 或 '.' 摆一个盘面，方便截图看效果
      const st = G.st;
      if (!st) return null;
      for (let r = 0; r < st.rows; r++) {
        for (let c = 0; c < st.cols; c++) {
          const ch = rows[r] && rows[r][c];
          st.board[r][c] = ch && ch !== '.'
            ? { r: Number(ch) % 4, sp: null, hp: 1 }
            : null;
        }
      }
      draw();
      return 'ok';
    },
    state() {
      const st = G.st;
      if (!st) return null;
      return {
        lv: st.lvId, cols: st.cols, lines: st.lines, goal: st.goal, moves: st.moves,
        maxMoves: st.maxMoves, score: st.score, over: st.over, win: st.win, reason: st.reason,
        items: st.items.slice(), cur: st.cur ? { sh: st.cur.sh, ox: st.cur.ox, oy: st.cur.oy } : null,
        mode: G.mode, paused: G.paused,
      };
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

