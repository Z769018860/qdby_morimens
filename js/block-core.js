// 「蚀界方块」的核心规则（v4）—— 照《Slidey: Block Puzzle》和《Slydris》的玩法重做。
//
// 三句话概括：
//   1. 盘面上本来就有方块，没有「下一块」这种东西，玩家不往盘里放东西。
//   2. 唯一操作：按住某一块**左右滑**。滑开之后，它上方失去支撑的方块会往下掉，
//      填进空位 —— 一行填满就消掉。
//   3. 松手算走一步，**底部升起一整行新的方块**，整盘被顶上去一格。
//      （这就是「移动后下方方块会上浮」的意思，不是手上那块往上浮。）
//
// 约定：board 是 [行][列]，行 0 在最上面、行 rows-1 贴着地面。行号只会因为两件事变化 ——
// 消行让上面的行塌下来（行号变大），升行让整盘被顶上去（行号变小）。没有别的。
//
// 格子对象 { k, sp, hp, b }：k = 界域下标（-1 = 棱彩万能色），b = 方块 id（同一块的所有格共用一个 b）。
// 这里的「一块」= 同一行里连续的一段，不会跨行。b 用来保证横向滑动时整段一起走。

// ------------------------------------------------------------------ 界域
// 四界域按用户定的口径配色：混沌金、血肉红、深海蓝、超维紫。
export const REALMS = [
  { id: 'chaos', n: '混沌', en: 'CHAOS', c: '#e3b341', d: '#785813', l: '#ffe9a8' },
  { id: 'caro', n: '血肉', en: 'CARO', c: '#e8656f', d: '#7c2531', l: '#ffb9c0' },
  { id: 'aqua', n: '深海', en: 'AQUA', c: '#5b9bd5', d: '#234669', l: '#a9d4ff' },
  { id: 'ultra', n: '超维', en: 'ULTRA', c: '#a86cf0', d: '#43226e', l: '#dcc2ff' },
];

// ------------------------------------------------------------------ 特殊块
export const SPECIALS = {
  crystal: { n: '结晶', d: '要消两次，第一次只裂开' },
  bomb: { n: '爆破', d: '被消掉时把周围一圈也炸掉' },
  line: { n: '贯穿', d: '被消掉时清空整行整列' },
  prism: { n: '棱彩', d: '万能色，被消掉时多掉一个造物' },
  lock: { n: '锚定', d: '推不动，只能等它被消掉' },
};

// ------------------------------------------------------------------ 造物（道具）
export const ITEMS = [
  { id: 'hammer', n: '碎击锤', d: '砸掉任意一格', icon: 'hammer', aim: 1 },
  { id: 'bomb', n: '爆裂瓶', d: '清掉 3×3 一片', icon: 'bomb', aim: 1 },
  { id: 'purge', n: '净化液', d: '清空贴着地面的那一行', icon: 'flask', aim: 0 },
  { id: 'reroll', n: '重抽签', d: '换掉正在预告的下一行', icon: 'scroll', aim: 0 },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ------------------------------------------------------------------ 关卡
// 十二关递进 + 一个无尽关。这一版没有速度、没有「下一块」，难度全靠这几根旋钮：
//   fill   开局就铺好几行（越靠后铺得越满）
//   cover  每次升上来的那一行占几成宽（越高越难补）
//   maxRun 新块最长几格（4 → 3 之后只能靠拼）
//   hard   结晶概率（要消两次）
//   lock   锚定块概率（推不动）
//   surge  每 N 回合额外顶上来一行（不占玩家回合）
//   moves  回合上限；goal 要消几行
export const LEVELS = [
  {
    id: 1, t: '无光区深潜 1', sub: '浅层 · 无声', cols: 8, rows: 12,
    goal: 5, moves: 30, fill: 3, cover: 0.5, maxRun: 4, mods: [],
    tip: '按住一块左右滑。滑开之后上面会往下掉，一行填满就消。',
  },
  {
    id: 2, t: '无光区深潜 2', sub: '浅层 · 落影', cols: 8, rows: 12,
    goal: 6, moves: 34, fill: 3, cover: 0.52, maxRun: 4, mods: ['hard:0.06'],
    tip: '带壳的结晶要消两次，第一次只会裂开。',
  },
  {
    id: 3, t: '无光区深潜 3', sub: '中层 · 涨潮', cols: 8, rows: 12,
    goal: 7, moves: 38, fill: 4, cover: 0.55, maxRun: 4, mods: ['hard:0.08'],
    tip: '开局就压着四行，先把最底下几行啃平。',
  },
  {
    id: 4, t: '无光区深潜 4', sub: '中层 · 浪与光', cols: 8, rows: 12,
    goal: 7, moves: 38, fill: 4, cover: 0.55, maxRun: 4, mods: ['hard:0.1', 'surge:10'],
    tip: '每隔十回合会自己顶上来一行，别拖。',
  },
  {
    id: 5, t: '无光区深潜 5', sub: '深层 · 锚定', cols: 8, rows: 12,
    goal: 8, moves: 42, fill: 4, cover: 0.58, maxRun: 4, mods: ['lock:0.1'],
    tip: '带锚的块推不动，只能等它下面腾空让它掉下去。',
  },
  {
    id: 6, t: '无光区深潜 6', sub: '深层 · 结晶', cols: 8, rows: 12,
    goal: 9, moves: 46, fill: 5, cover: 0.64, maxRun: 4, mods: ['hard:0.16', 'surge:9'],
    tip: '结晶变多，水也开始自己涨。两行的路要提前留出来。',
  },
  {
    id: 7, t: '无光区深潜 7', sub: '窄道 · 锚索', cols: 8, rows: 12,
    goal: 9, moves: 46, fill: 4, cover: 0.6, maxRun: 4, mods: ['lock:0.08', 'surge:9'],
    tip: '锚定加自涨，别把高的那几列留到最后。',
  },
  {
    id: 8, t: '无光区深潜 8', sub: '废墟 · 残块', cols: 8, rows: 12,
    goal: 10, moves: 50, fill: 5, cover: 0.6, maxRun: 4, mods: ['lock:0.08', 'surge:9'],
    tip: '起手就是半残的盘面，先找能一口气消两行的位置。',
  },
  {
    id: 9, t: '无光区深潜 9', sub: '暴雨 · 无星', cols: 8, rows: 12,
    goal: 10, moves: 50, fill: 5, cover: 0.65, maxRun: 4, mods: ['hard:0.18', 'surge:8'],
    tip: '一行比一行塞得满，能把两行凑一起就一起消。',
  },
  {
    id: 10, t: '无光区深潜 10', sub: '暗流 · 双压', cols: 8, rows: 12,
    goal: 11, moves: 54, fill: 5, cover: 0.62, maxRun: 4,
    mods: ['lock:0.10', 'hard:0.14', 'surge:8'],
    tip: '三个机制一起压，回合要省着用。',
  },
  {
    id: 11, t: '无光区深潜 11', sub: '断崖 · 塌方', cols: 8, rows: 12,
    goal: 12, moves: 58, fill: 6, cover: 0.7, maxRun: 4,
    mods: ['lock:0.12', 'hard:0.18', 'surge:7'],
    tip: '开局六行，锚定满地，能推的块本来就不多。',
  },
  {
    id: 12, t: '无光区深潜 12', sub: '最深处 · 无光', cols: 8, rows: 12,
    goal: 13, moves: 62, fill: 6, cover: 0.72, maxRun: 4,
    mods: ['lock:0.14', 'hard:0.2', 'surge:6'],
    tip: '这一关的机制全开。撑到十三行，就算走到头了。',
  },
  {
    id: 13, t: '无尽 · 忘却回廊', sub: '走不到头', cols: 8, rows: 12,
    goal: 0, moves: 0, fill: 4, cover: 0.6, maxRun: 4, endless: true,
    mods: ['hard:0.14', 'surge:9'],
    tip: '没有回合上限，每消八行就难一档，直到你撑不住。',
  },
];

export const LEVEL_BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));

// mods 是字符串数组：'hard:0.2' / 'lock:0.12' / 'surge:8' / 'cover:0.7'
export function levelMods(lv) {
  const m = { hard: 0, lock: 0, surge: 0, cover: lv.cover || 0.6, maxRun: lv.maxRun || 4 };
  for (const s of lv.mods || []) {
    const [k, v] = String(s).split(':');
    if (k === 'hard') m.hard = Number(v);
    else if (k === 'lock') m.lock = Number(v);
    else if (k === 'surge') m.surge = Number(v);
    else if (k === 'cover') m.cover = Number(v);
  }
  return m;
}

// 无尽关：每消八行就再难一档
export function endlessCover(lines) {
  return Math.min(0.74, 0.6 + Math.floor(lines / 8) * 0.02);
}

// ------------------------------------------------------------------ 随机
export function makeRng(seed) {
  let s = (seed >>> 0) || 1;
  return function rng() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const pick = (rng, arr) => arr[(rng() * arr.length) | 0];

// ------------------------------------------------------------------ 开局
let BID = 1;

export function newRun(levelId, seed) {
  const lv = LEVEL_BY_ID[levelId] || LEVELS[0];
  const mods = levelMods(lv);
  const st = {
    lvId: lv.id, lv, mods,
    cols: lv.cols, rows: lv.rows,
    board: Array.from({ length: lv.rows }, () => new Array(lv.cols).fill(null)),
    next: null,          // 下一行的「预生成」，画在棋盘下方当预告
    goal: lv.goal || 0,
    maxMoves: lv.moves || 0,
    moves: 0, lines: 0, score: 0,
    combo: 0, maxCombo: 0, bestClear: 0,
    items: ['hammer', 'bomb'], itemCap: 4,
    clearedCells: 0, gained: 0, resonate: 0, pity: 0,
    over: false, win: false, reason: '',
    fx: [], anim: [],
    endless: !!lv.endless,
    seed: seed >>> 0,
    rng: makeRng(seed),
  };
  // 开局铺几行：从地面往上堆，越靠上的越稀
  for (let i = 0; i < (lv.fill || 0); i++) {
    const row = mkRow(st, Math.max(0.32, mods.cover - i * 0.05));
    writeRow(st, st.rows - 1 - i, row);
  }
  settleGravity(st);
  clearRows(st, true);
  settleGravity(st);
  st.next = mkRow(st, curCover(st));
  return st;
}

// 当前这一行该铺多满（无尽关随行数变密）
function curCover(st) {
  return st.endless ? endlessCover(st.lines) : st.mods.cover;
}

// 生成一行：2~4 段，段与段之间留 1~2 个空格。空格是留给上面掉下来填的。
function mkRow(st, cover) {
  const cols = st.cols;
  const maxRun = st.mods.maxRun;
  const want = Math.max(2, Math.min(cols - 1, Math.round(cols * cover)));
  const runs = [];
  let filled = 0;
  let c = (st.rng() * 2) | 0;
  let guard = 0;
  while (filled < want && c < cols && guard++ < 24) {
    let len = 1 + ((st.rng() * maxRun) | 0);
    len = Math.min(len, maxRun, cols - c, Math.max(1, want - filled));
    if (len <= 0) break;
    let sp = null;
    const roll = st.rng();
    const pHard = st.mods.hard;
    const pLock = st.mods.lock;
    if (roll < pLock) sp = 'lock';
    else if (roll < pLock + pHard) sp = 'crystal';
    else if (roll < pLock + pHard + 0.04) sp = st.rng() < 0.5 ? 'bomb' : 'line';
    else if (roll < pLock + pHard + 0.06) sp = 'prism';
    runs.push({ c0: c, len, k: (st.rng() * REALMS.length) | 0, sp });
    filled += len;
    c += len + 1 + ((st.rng() * 2) | 0);
  }
  if (!runs.length) runs.push({ c0: 0, len: Math.min(2, cols), k: (st.rng() * REALMS.length) | 0, sp: null });
  return runs;
}

function writeRow(st, r, runs) {
  st.board[r] = new Array(st.cols).fill(null);
  for (const run of runs) {
    const bid = ++BID;
    for (let i = 0; i < run.len; i++) {
      const c = run.c0 + i;
      if (c < 0 || c >= st.cols) continue;
      st.board[r][c] = {
        k: run.sp === 'prism' ? -1 : run.k,
        sp: run.sp || null,
        hp: run.sp === 'crystal' ? 2 : 1,
        b: bid,
      };
    }
  }
}

// ------------------------------------------------------------------ 方块（同一行里连续的一段）
export function cellsOf(st, bid) {
  const out = [];
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const cell = st.board[r][c];
      if (cell && cell.b === bid) out.push({ r, c });
    }
  }
  return out;
}

export function blockAt(st, r, c) {
  const cell = st.board[r] && st.board[r][c];
  return cell ? cell.b : null;
}

// 这块左右还能挪几格（撞墙、撞别的块、锚定块都算 0）
export function slideRange(st, bid) {
  const cells = cellsOf(st, bid);
  if (!cells.length) return { left: 0, right: 0, locked: true };
  const r = cells[0].r;
  if (cells.some((x) => st.board[x.r][x.c].sp === 'lock')) return { left: 0, right: 0, locked: true };
  const c0 = Math.min(...cells.map((x) => x.c));
  const c1 = Math.max(...cells.map((x) => x.c));
  let left = 0;
  while (c0 - left - 1 >= 0 && !st.board[r][c0 - left - 1]) left++;
  let right = 0;
  while (c1 + right + 1 < st.cols && !st.board[r][c1 + right + 1]) right++;
  return { left, right, locked: false };
}

// 把一块横向挪 d 格（d 会被夹到合法范围里）。返回实际挪了几格。
export function slideBy(st, bid, d) {
  const lim = slideRange(st, bid);
  if (lim.locked) return 0;
  const dd = Math.max(-lim.left, Math.min(lim.right, d | 0));
  if (!dd) return 0;
  const cells = cellsOf(st, bid);
  const r = cells[0].r;
  const vals = cells.map((x) => ({ c: x.c, v: st.board[r][x.c] }));
  for (const x of vals) st.board[r][x.c] = null;
  for (const x of vals) st.board[r][x.c + dd] = x.v;
  return dd;
}

// ------------------------------------------------------------------ 重力：整段一起掉，只要有一段有支撑就不动
function settleGravity(st) {
  let guard = 0;
  let moved = 0;
  while (guard++ < 240) {
    const bids = new Set();
    for (let r = st.rows - 1; r >= 0; r--) {
      for (let c = 0; c < st.cols; c++) if (st.board[r][c]) bids.add(st.board[r][c].b);
    }
    // 先处理靠下的，免得同一步里来回挪
    const list = [...bids].map((bid) => {
      const cells = cellsOf(st, bid);
      return { bid, cells, r: cells.length ? cells[0].r : st.rows };
    }).sort((a, b) => b.r - a.r);

    let any = false;
    for (const it of list) {
      if (!it.cells.length) continue;
      const r = it.cells[0].r;
      if (r + 1 >= st.rows) continue;
      // 只要有一格下面有东西，整段就架住了（所以会留出屋檐，屋檐下面是死洞）
      if (it.cells.some((x) => st.board[r + 1][x.c])) continue;
      for (const x of it.cells) {
        st.board[r + 1][x.c] = st.board[x.r][x.c];
        st.board[x.r][x.c] = null;
      }
      any = true;
      moved++;
    }
    if (!any) break;
  }
  return moved;
}

// ------------------------------------------------------------------ 消行
function fullRows(st) {
  const out = [];
  for (let r = 0; r < st.rows; r++) {
    let full = true;
    for (let c = 0; c < st.cols; c++) if (!st.board[r][c]) { full = false; break; }
    if (full) out.push(r);
  }
  return out;
}

function clearRows(st, quiet) {
  let chain = 0;
  let total = 0;
  let guard = 0;
  while (guard++ < 40) {
    const rows = fullRows(st);
    if (!rows.length) break;
    chain++;

    // 特殊块连锁：爆破炸一圈、贯穿清行列，新清出来的格子也要看，所以走队列
    const del = new Map();
    for (const r of rows) for (let c = 0; c < st.cols; c++) del.set(r * st.cols + c, { r, c });
    const queue = [...del.values()];
    let q = 0;
    while (queue.length && q++ < 4000) {
      const { r, c } = queue.pop();
      const cell = st.board[r][c];
      if (!cell) continue;
      if (cell.sp === 'bomb') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = r + dr;
            const cc = c + dc;
            if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
            const key = rr * st.cols + cc;
            if (!del.has(key) && st.board[rr][cc]) { del.set(key, { r: rr, c: cc }); queue.push({ r: rr, c: cc }); }
          }
        }
      } else if (cell.sp === 'line') {
        for (let cc = 0; cc < st.cols; cc++) {
          const key = r * st.cols + cc;
          if (!del.has(key) && st.board[r][cc]) { del.set(key, { r, c: cc }); queue.push({ r, c: cc }); }
        }
        for (let rr = 0; rr < st.rows; rr++) {
          const key = rr * st.cols + c;
          if (!del.has(key) && st.board[rr][c]) { del.set(key, { r: rr, c }); queue.push({ r: rr, c }); }
        }
      }
    }

    // 结晶：还有两层时只裂不开
    const cracked = [];
    const cleared = [];
    for (const { r, c } of del.values()) {
      const cell = st.board[r][c];
      if (!cell) continue;
      if (cell.sp === 'crystal' && cell.hp > 1) { cell.hp--; cracked.push({ r, c }); continue; }
      cleared.push({ r, c, k: cell.k, sp: cell.sp });
    }
    if (!cleared.length) {
      for (const { r, c } of cracked) st.fx.push({ k: 'crack', r, c });
      break;
    }
    for (const x of cleared) st.board[x.r][x.c] = null;
    for (const { r, c } of cracked) st.fx.push({ k: 'crack', r, c });

    const nRows = rows.length;
    total += nRows;
    st.lines += nRows;
    st.clearedCells += cleared.length;
    st.combo = chain;
    st.bestClear = Math.max(st.bestClear, nRows);
    st.maxCombo = Math.max(st.maxCombo, nRows + chain - 1);

    const gain = nRows * nRows * 120 + cleared.length * 8 + (chain - 1) * 90;
    st.score += gain;

    let resonate = 0;
    for (const r of rows) if (rowSameColor(st, r, cleared)) resonate++;
    if (resonate) { st.score += resonate * 200; st.resonate += resonate; }

    let drops = 0;
    for (let i = 0; i < nRows; i++) if (st.rng() < 0.34) drops++;
    if (st.pity >= 3) drops++;
    if (resonate) drops++;
    for (const x of cleared) if (x.sp === 'prism' && st.rng() < 0.5) drops++;
    st.pity = drops ? 0 : st.pity + nRows;
    for (let i = 0; i < drops; i++) {
      const it = pick(st.rng, ITEMS);
      st.gained++;
      if (st.items.length < st.itemCap) { st.items.push(it.id); st.fx.push({ k: 'item', id: it.id }); }
    }

    if (!quiet) {
      st.fx.push({
        k: 'clear', rows: rows.slice(),
        cells: cleared.map((x) => ({ r: x.r, c: x.c, k: x.k, sp: x.sp })),
        gain, combo: chain, resonate,
      });
    }

    // 整层塌下来：把这几行抽掉，顶上补同样数量的空行
    const sorted = rows.slice().sort((a, b) => b - a);
    for (const r of sorted) st.board.splice(r, 1);
    for (let i = 0; i < sorted.length; i++) st.board.unshift(new Array(st.cols).fill(null));

    settleGravity(st);
  }
  if (chain > 3) st.score += 400;
  st.combo = 0;
  return total;
}

function rowSameColor(st, r, cleared) {
  const set = new Map();
  for (const x of cleared) {
    if (x.r !== r || x.k < 0) continue;
    set.set(x.k, (set.get(x.k) || 0) + 1);
  }
  if (!set.size) return false;
  let total = 0;
  for (const v of set.values()) total += v;
  return total >= st.cols * 0.75 && set.size === 1;
}

// ------------------------------------------------------------------ 升行
// 底部升起一整行，整盘被顶上去一格。顶到天花板还有方块就结束。
function pushRow(st, runs) {
  if (st.board[0].some(Boolean)) {
    st.over = true;
    st.reason = '方块顶穿了天花板';
    st.fx.push({ k: 'over', reason: st.reason });
    return false;
  }
  st.board.shift();
  st.board.push(new Array(st.cols).fill(null));
  writeRow(st, st.rows - 1, runs);
  st.fx.push({ k: 'rise' });
  return true;
}

// ------------------------------------------------------------------ 一步
// 只有「真的挪动了」才算一步。挪不动（左右都顶死）不算，玩家可以换一块再试。
export function commit(st, bid, delta) {
  if (st.over || st.win) return { ok: false, moved: 0 };
  const moved = bid == null ? 0 : slideBy(st, bid, delta);
  if (!moved) return { ok: false, moved: 0 };

  st.moves++;
  settleGravity(st);
  clearRows(st);
  if (checkState(st)) return { ok: true, moved };

  // 每走一步，底部顶上来一行新的
  const runs = st.next || mkRow(st, curCover(st));
  st.next = mkRow(st, curCover(st));
  if (!pushRow(st, runs)) return { ok: true, moved };

  settleGravity(st);
  clearRows(st);
  checkState(st);

  // 自涨：每 N 回合额外顶一行
  const surge = st.mods.surge;
  if (surge && !st.over && !st.win && st.moves % surge === 0) {
    if (pushRow(st, mkRow(st, curCover(st)))) {
      st.fx.push({ k: 'surge' });
      settleGravity(st);
      clearRows(st);
      checkState(st);
    }
  }
  return { ok: true, moved };
}

// 试算：这块往 d 方向挪之后，会不会消行。给渲染层画「松手就消」的高亮用。
// 只在盘面副本上算，算完原样换回去。
export function previewMove(st, bid, d) {
  const keep = st.board;
  st.board = keep.map((row) => row.map((c) => (c ? { ...c } : null)));
  const moved = slideBy(st, bid, d);
  if (moved) settleGravity(st);
  const rows = moved ? fullRows(st) : [];
  st.board = keep;
  return { moved: !!moved, rows };
}

// 盘面上还有没有能推的块。没有的话只能让水顶一行（不然就死局了）。
export function hasMove(st) {
  const seen = new Set();
  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const cell = st.board[r][c];
      if (!cell || seen.has(cell.b)) continue;
      seen.add(cell.b);
      const lim = slideRange(st, cell.b);
      if (!lim.locked && (lim.left > 0 || lim.right > 0)) return true;
    }
  }
  return false;
}

// 一个都推不动时：水自己顶上来一行，给玩家换口气。不算回合。
export function pass(st) {
  if (st.over || st.win) return false;
  const runs = st.next || mkRow(st, curCover(st));
  st.next = mkRow(st, curCover(st));
  if (!pushRow(st, runs)) return false;
  st.fx.push({ k: 'surge' });
  settleGravity(st);
  clearRows(st);
  checkState(st);
  return true;
}

function checkState(st) {
  if (st.over || st.win) return true;
  if (st.goal && st.lines >= st.goal) {
    st.win = true;
    st.fx.push({ k: 'win' });
    return true;
  }
  if (st.maxMoves && st.moves >= st.maxMoves) {
    st.over = true;
    st.reason = '回合用完了';
    st.fx.push({ k: 'over', reason: st.reason });
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ 造物
export function useItem(st, id, r, c) {
  if (st.over || st.win) return false;
  const i = st.items.indexOf(id);
  if (i < 0) return false;
  const it = ITEM_BY_ID[id];
  if (!it) return false;

  if (it.aim) {
    if (r == null || c == null) return false;
    if (r < 0 || r >= st.rows || c < 0 || c >= st.cols) return false;
    if (!st.board[r][c]) return false;
    if (id === 'hammer') {
      st.board[r][c] = null;
      st.fx.push({ k: 'boom', r, c });
    } else if (id === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr;
          const cc = c + dc;
          if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
          st.board[rr][cc] = null;
        }
      }
      st.fx.push({ k: 'boom', r, c, big: 1 });
    }
  } else if (id === 'purge') {
    // 清掉贴着地面的那一行
    let r0 = st.rows - 1;
    while (r0 >= 0 && !st.board[r0].some(Boolean)) r0--;
    if (r0 < 0) return false;
    for (let cc = 0; cc < st.cols; cc++) st.board[r0][cc] = null;
    st.fx.push({ k: 'boom', r: r0, c: (st.cols / 2) | 0, big: 1 });
  } else if (id === 'reroll') {
    st.next = mkRow(st, curCover(st));
    st.fx.push({ k: 'reroll' });
  } else {
    return false;
  }

  st.items.splice(i, 1);
  settleGravity(st);
  clearRows(st);
  checkState(st);
  return true;
}

// ------------------------------------------------------------------ 给 UI 用的小东西
export function progress(st) {
  return st.goal ? Math.min(1, st.lines / st.goal) : 0;
}

export function columnTop(st, c) {
  for (let r = 0; r < st.rows; r++) if (st.board[r][c]) return r;
  return st.rows;
}

// 实时评级：按「完成度 + 连消」算
export function liveRank(st) {
  const p = st.goal ? st.lines / st.goal : Math.min(1, st.lines / 30);
  let pt = p * 70 + Math.min(20, st.maxCombo * 4) + Math.min(10, st.resonate * 2);
  if (st.over && !st.win) pt *= 0.6;
  return pt >= 92 ? 'S' : pt >= 78 ? 'A' : pt >= 58 ? 'B' : pt >= 34 ? 'C' : 'D';
}

export function rankOf(st) {
  if (st.win) {
    const spare = st.maxMoves ? Math.max(0, st.maxMoves - st.moves) / st.maxMoves : 0;
    const pt = 70 + spare * 40 + Math.min(20, st.maxCombo * 4) + Math.min(10, st.resonate * 2);
    return pt >= 100 ? 'S' : pt >= 86 ? 'A' : 'B';
  }
  if (st.endless) return st.lines >= 45 ? 'S' : st.lines >= 30 ? 'A' : st.lines >= 18 ? 'B' : st.lines >= 8 ? 'C' : 'D';
  return 'D';
}

export function creditOf(lines) {
  return Math.max(1, Math.round(lines * 1.6 + 2));
}
