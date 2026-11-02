// 蚀界方块的核心规则（v3）：方块从**下方**浮上来，左右移动，松手后一路升到顶，
// 撞到东西就锁住。满行消除、上方压实。这里不碰任何 DOM，node 里可以直接 import
// 跑模拟（scripts/block-sim.mjs）。
//
// 一条容易踩错的约定：board 是 [行][列]，行 0 在最上面，行 rows-1 在最下面（贴着水面）。
// 「上浮」= 行号变小。别和上一版的「下落」搞混 —— 这一版没有任何东西往下掉。

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
  { id: 's1', c: [[0, 0]], w: 10 },
  { id: 'h2', c: [[0, 0], [1, 0]], w: 16 },
  { id: 'v2', c: [[0, 0], [0, 1]], w: 13 },
  { id: 'h3', c: [[0, 0], [1, 0], [2, 0]], w: 14 },
  { id: 'v3', c: [[0, 0], [0, 1], [0, 2]], w: 9 },
  { id: 'h4', c: [[0, 0], [1, 0], [2, 0], [3, 0]], w: 9 },
  { id: 'q4', c: [[0, 0], [1, 0], [0, 1], [1, 1]], w: 10 },
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
  { id: 'purge', n: '净化液', d: '清空紧贴水面的那一行', icon: 'flask', aim: 0 },
  { id: 'sink', n: '压舱石', d: '整盘往水里沉一行', icon: 'stone', aim: 0 },
  { id: 'reroll', n: '重抽签', d: '换掉正在上浮的这一块', icon: 'scroll', aim: 0 },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ------------------------------------------------------------------ 关卡
// 十二关递进 + 一个无尽关。
// goal = 要消满多少行，moves = 放多少块的上限，fill = 开局就堆在水面几行。
// 这一版没有「下落速度」这回事 —— 节奏完全由玩家松手决定，难度靠「回合上限 + 开局堆得更高 +
// 每回合浮上来几块 + 机制」堆。
export const LEVELS = [
  {
    id: 1, t: '无光区深潜 1', sub: '浅层 · 无声', cols: 8, rows: 12,
    goal: 12, moves: 60, fill: 2, lift: 3, mods: [],
    tip: '横着拖，松手它自己会浮上去。先把水面铺平。',
  },
  {
    id: 2, t: '无光区深潜 2', sub: '浅层 · 落影', cols: 8, rows: 12,
    goal: 13, moves: 58, fill: 2, lift: 3, mods: ['rain:0.16'],
    tip: '顶上偶尔会砸下一格，别把某一列堆太高。',
  },
  {
    id: 3, t: '无光区深潜 3', sub: '中层 · 涨潮', cols: 8, rows: 12,
    goal: 14, moves: 56, fill: 3, lift: 3, mods: ['tide:9'],
    tip: '洋流会突然把整盘顶上去一行，留点余量。',
  },
  {
    id: 4, t: '无光区深潜 4', sub: '中层 · 浪与光', cols: 8, rows: 12,
    goal: 15, moves: 54, fill: 3, lift: 3, mods: ['rain:0.18', 'tide:8'],
    tip: '落影和涨潮一起来，节奏会比前一关快一截。',
  },
  {
    id: 5, t: '无光区深潜 5', sub: '深层 · 起雾', cols: 8, rows: 12,
    goal: 16, moves: 54, fill: 3, lift: 2, mods: ['fog', 'tide:9'],
    tip: '雾里看不见下一块，只能凭手上这块走。',
  },
  {
    id: 6, t: '无光区深潜 6', sub: '深层 · 结晶', cols: 8, rows: 12,
    goal: 16, moves: 52, fill: 3, lift: 2, mods: ['harden:0.22', 'tide:8'],
    tip: '带壳的结晶要消两次，第一次只会裂开。',
  },
  {
    id: 7, t: '无光区深潜 7', sub: '窄道 · 七列', cols: 7, rows: 12,
    goal: 16, moves: 52, fill: 3, lift: 2, mods: ['tide:9'],
    tip: '只剩七列，横四变少，竖条更卡人。',
  },
  {
    id: 8, t: '无光区深潜 8', sub: '废墟 · 残块', cols: 8, rows: 12,
    goal: 17, moves: 50, fill: 4, lift: 2, mods: ['rubble:6', 'tide:8'],
    tip: '开局水面上就压着一层残块，先啃平。',
  },
  {
    id: 9, t: '无光区深潜 9', sub: '暴雨 · 无星', cols: 8, rows: 12,
    goal: 15, moves: 56, fill: 3, lift: 1, mods: ['rain:0.26', 'fog', 'tide:7'],
    tip: '落影变密，而且看不见下一块 —— 留好退路。',
  },
  {
    id: 10, t: '无光区深潜 10', sub: '暗流 · 双压', cols: 8, rows: 12,
    goal: 12, moves: 56, fill: 3, lift: 1, mods: ['tide:7', 'harden:0.2'],
    tip: '洋流变勤，结晶更多，别指望慢慢磨。',
  },
  {
    id: 11, t: '无光区深潜 11', sub: '断崖 · 七列', cols: 7, rows: 12,
    goal: 12, moves: 52, fill: 3, lift: 1, mods: ['rubble:7', 'harden:0.2', 'tide:7'],
    tip: '七列加残块，起手就是半残的盘面。',
  },
  {
    id: 12, t: '无光区深潜 12', sub: '最深处 · 无光', cols: 8, rows: 12,
    goal: 12, moves: 52, fill: 3, lift: 1,
    mods: ['rain:0.24', 'tide:7', 'harden:0.24'],
    tip: '这一关的机制全开。撑到二十一行，就算走到头了。',
  },
  {
    id: 13, t: '无尽 · 忘却回廊', sub: '走不到头', cols: 8, rows: 12,
    goal: 0, moves: 0, fill: 3, lift: 2, endless: true,
    mods: ['rain:0.2', 'tide:9'],
    tip: '没有回合上限，每消八行洋流就快一档，直到你撑不住。',
  },
];

// 无尽关：每消十行，洋流就快一档（压到最短 3 回合一次）
export function endlessTide(lines) {
  return Math.max(3, 9 - Math.floor(lines / 8));
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
    // cur 是「正在水上、还没浮上去」的那一块；oy 是它顶端所在的棋盘行，
    // 可以是 rows 甚至更大（完全在水面以下）。浮上去时 oy 一路减到 ty。
    cur: null,
    curList: [], // 一回合浮上来多块时，排队等待的其余几块（batch > 1）
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
    pity: 0,
    rise: 0, // 上浮动画还剩多少格要走（0 表示已经落定）
    riseSpeed: 26, // 格/秒
    tideTick: 0,
    pending: [],
    over: false,
    win: false,
    reason: '',
    fx: [],
    clearedCells: 0,
    resonate: 0,
    gained: 0,
    fill: lv.fill || 2,
    lift: lv.lift == null ? 2 : lv.lift,
  };

  for (let i = 0; i < st.rows; i++) st.board.push(new Array(st.cols).fill(null));

  // 开局就压在水面上的那几行。每行都留至少一个洞，否则一开局就白送消行。
  for (let r = st.rows - st.fill; r < st.rows; r++) {
    if (r < 0) continue;
    const holes = 1 + ((rng() < 0.35) ? 1 : 0);
    const free = [];
    for (let c = 0; c < st.cols; c++) free.push(c);
    for (let i = 0; i < st.cols - holes; i++) {
      const idx = (rng() * free.length) | 0;
      const c = free.splice(idx, 1)[0];
      st.board[r][c] = { r: (rng() * REALMS.length) | 0, sp: null, hp: 1 };
    }
  }

  // 残块：比开局的几行更高一点，逼玩家先啃
  if (mods.rubble) {
    let placed = 0;
    let guard = 0;
    while (placed < mods.rubble && guard++ < 400) {
      const c = (rng() * st.cols) | 0;
      const r = st.rows - st.fill - 1 - ((rng() * 2) | 0);
      if (r < 0 || st.board[r][c]) continue;
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

// 方块待在水面以下时的 oy：整块藏在棋盘底边之外
function restY(st) {
  return st.rows + 1;
}

// 方块浮上去会停在哪一行 —— 找**从水面往上第一个能整块放下的位置**。
//
// 这一行是整个手感的命门：如果按「浮到最高」算，方块会一路升到棋盘顶部，
// 堆在上头，跟录像里方块压着水面完全反着来。方块是从水下浮起来的，浮到
// 水面就顶住了，所以它只在「这一列被占住」的时候才继续往上走 —— 于是堆叠
// 自然从底下往上长，最下面是实的，上面是空的。
export function floatTarget(st, p, ox) {
  // 方块是从水里浮上来的，默认顶到水面就停（贴着底行那一格）。底行这一段的列
  // 被占死了它才继续往上钻，最多钻 `st.lift` 行 —— 这个上限是难度的旋钮：
  // 允许往上钻 = 还能往洞里去，钻不动 = 只能把整盘顶起来（见 release）。
  const from = st.rows - p.h;
  const up = Math.max(0, st.lift == null ? 2 : st.lift);
  for (let y = from; y >= from - up && y >= 0; y--) {
    if (canFit(st, p, ox, y)) return y;
  }
  return -1;
}

// 只是「这一行能不能整块放下」的碰撞检测
function canFit(st, p, ox, oy) {
  for (const cl of p.cells) {
    const c = ox + cl.dc;
    const r = oy + cl.dr;
    if (c < 0 || c >= st.cols) return false;
    if (r < 0) return false; // 顶到天花板
    if (r >= st.rows) continue; // 还在水面以下，随便占
    if (st.board[r][c]) return false;
  }
  return true;
}

// 回合开始时把一块放到「水面以下」，等玩家左右挪
function spawn(st) {
  const p = st.curList.length ? st.curList.shift() : (st.next || rollPiece(st));
  if (!p) return;
  if (!st.curList.length) st.next = rollPiece(st);
  const mid = ((st.cols - p.w) / 2) | 0;
  const cur = { ...p, ox: mid, oy: restY(st), ty: restY(st), cells: p.cells.map((c) => ({ ...c })) };

  // 中间列放不下就往两边找最近的能放下的位置 —— 一上来就判负太粗暴
  if (!canFit(st, cur, mid, cur.oy)) {
    let found = -1;
    for (let d = 1; d < st.cols && found < 0; d++) {
      for (const ox of [mid - d, mid + d]) {
        if (ox < 0 || ox + p.w > st.cols) continue;
        if (canFit(st, cur, ox, cur.oy)) { found = ox; break; }
      }
    }
    if (found < 0) {
      // 连水面下都塞不进去：底行已经彻底堵死
      st.over = true;
      st.reason = '水面被堵死了';
      st.cur = null;
      st.fx.push({ k: 'over', reason: st.reason });
      return;
    }
    cur.ox = found;
  }
  st.cur = cur;
  st.rise = 0;
}

// ------------------------------------------------------------------ 移动
export function move(st, dx) {
  if (st.over || !st.cur || st.rise > 0) return false;
  const nx = st.cur.ox + dx;
  if (nx < 0 || nx + st.cur.w > st.cols) return false;
  if (!canFit(st, st.cur, nx, st.cur.oy)) return false;
  st.cur.ox = nx;
  return true;
}

export function moveTo(st, col) {
  if (st.over || !st.cur || st.rise > 0) return false;
  const target = Math.max(0, Math.min(st.cols - st.cur.w, col));
  if (target === st.cur.ox) return false;
  const dir = target > st.cur.ox ? 1 : -1;
  let moved = false;
  while (st.cur.ox !== target && canFit(st, st.cur, st.cur.ox + dir, st.cur.oy)) {
    st.cur.ox += dir;
    moved = true;
  }
  return moved;
}

// 松手：这一块开始上浮。返回它将要停的行（-1 表示无处可去）。
//
// 关键一步：方块是浮上来的，底下的水面要是被整排堵死，它连棋盘都进不去。
// 这时候**整盘被顶上去一行**（水面升高），底行空出来它才钻得进来 —— 这就是
// 「移动之后下方会上浮」的那一下。可能连着顶好几行，所以走 while。
export function release(st) {
  if (st.over || !st.cur || st.rise > 0) return -1;
  const p = st.cur;
  let ty = floatTarget(st, p, p.ox);
  let risen = 0;
  while (ty < 0) {
    if (!liftBoard(st, '水面被堵死，方块挤不上来')) return -1; // 顶穿了，liftBoard 里已经置 over
    if (++risen > st.rows + 2) break;
    ty = floatTarget(st, p, p.ox);
  }
  if (ty < 0) {
    st.cur = null;
    st.over = true;
    st.reason = '水面被堵死了';
    st.fx.push({ k: 'over', reason: st.reason });
    return -1;
  }
  p.ty = ty;
  st.rise = p.oy - ty; // 还要走几格
  if (st.rise <= 0) {
    st.rise = 0;
    lock(st);
    return ty;
  }
  st.fx.push({ k: 'lift', ox: p.ox, from: p.oy, to: ty, w: p.w, h: p.h, risen });
  return ty;
}

// ------------------------------------------------------------------ 时间推进
// 这一版只有「上浮动画」和时间有关，方块不会自己往下掉。
export function tick(st, dt) {
  if (st.over) return false;
  if (!st.cur) return false;
  if (st.rise <= 0) return false;

  const move = st.riseSpeed * dt;
  if (move >= st.rise) {
    st.cur.oy = st.cur.ty;
    st.rise = 0;
    lock(st);
    return true;
  }
  st.rise -= move;
  st.cur.oy = st.cur.ty + st.rise;
  return true;
}

// 直接跳到锁定（模拟脚本用，省得逐帧推进）
export function settle(st) {
  if (st.over || !st.cur) return false;
  if (st.rise > 0) {
    st.cur.oy = st.cur.ty;
    st.rise = 0;
    lock(st);
    return true;
  }
  return false;
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
    st.reason = '方块的顶上就是天';
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
    st.reason = '块用完了';
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

    const del = new Map();
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

    // 造物掉落：每行三成，连着几轮一行不掉就补一个
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

  if (chain > 3) st.score += 400;
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
// 从天上砸一格下来。落到那一列最上面的空位（也就是堆叠的顶）。
function dropRain(st) {
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
  if (st.lv.endless) st.mods.tide = endlessTide(st.lines);
  if (!st.mods.tide) return;
  st.tideTick++;
  if (st.tideTick < st.mods.tide) return;
  st.tideTick = 0;
  riseOne(st);
}

// 整盘被顶上去一行，底行清空。顶到天花板上还有方块就结束。
// 这是「放不下 / 洋流」共用的那一层，只负责挪，不负责往底行塞东西。
export function liftBoard(st, reason) {
  if (st.board[0].some(Boolean)) {
    st.over = true;
    st.reason = reason || '洋流把棋盘顶穿了';
    st.fx.push({ k: 'over', reason: st.reason });
    return false;
  }
  st.board.shift();
  st.board.push(new Array(st.cols).fill(null));
  st.fx.push({ k: 'slide' });
  return true;
}

// 洋流：上浮一行，而且新露出来的底行还带着半排方块
export function riseOne(st) {
  if (!liftBoard(st)) return false;
  const row = st.board[st.rows - 1];
  const fill = Math.max(1, Math.round(st.cols * 0.45));
  const cols = [];
  for (let c = 0; c < st.cols; c++) cols.push(c);
  for (let i = 0; i < fill; i++) {
    const idx = (st.rng() * cols.length) | 0;
    const c = cols.splice(idx, 1)[0];
    row[c] = { r: (st.rng() * REALMS.length) | 0, sp: null, hp: 1 };
  }
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
  } else if (id === 'sink') {
    // 整盘下沉一行：最底下那一行直接丢进水里
    st.board.pop();
    st.board.unshift(new Array(st.cols).fill(null));
    st.fx.push({ k: 'sink' });
    used = true;
  } else if (id === 'reroll') {
    // 换掉正在上浮的这一块（连同排队的那几块一起重摇）
    st.curList = [];
    st.next = rollPiece(st);
    if (st.cur) {
      const p = rollPiece(st);
      const mid = ((st.cols - p.w) / 2) | 0;
      st.cur = { ...p, ox: Math.min(mid, st.cols - p.w), oy: restY(st), ty: restY(st), cells: p.cells.map((x) => ({ ...x })) };
    }
    st.fx.push({ k: 'reroll' });
    used = true;
  }

  if (!used) return false;
  st.items.splice(i, 1);

  if (id !== 'reroll') {
    compact(st);
    resolve(st);
    if (!st.over) checkState(st);
  }
  return true;
}

// ------------------------------------------------------------------ 查询
export function progress(st) {
  return st.goal ? Math.min(1, st.lines / st.goal) : 0;
}

// 某一列从下往上第一格空位（渲染画「这一块会停在哪」的引导线用）
export function columnTop(st, c) {
  for (let r = 0; r < st.rows; r++) if (!st.board[r][c]) return r;
  return -1;
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
  const spare = st.maxMoves ? (st.maxMoves - st.moves) / st.maxMoves : 0;
  let pt = 2;
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
