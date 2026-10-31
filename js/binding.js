// 「校猫的结合」——以撒式房间地牢，主角是弥萨格大学的校猫（就叫弥萨格校猫）。
//
// 结构：
//   G.mode  title → play →（dead / win）       暂停只是 play 上的一个开关
//   run     = 一局的全部状态（血量、造物、楼层、房间表）
//   room    = 网格里的一格，第一次进去才生成内容（build）
// 每帧的顺序固定：输入 → 移动/碰撞 → 射击 → 敌人 → 掉落 → 清房判定 → 画。
import { TUNE, DIFFS, FURS, EYES, COSTUMES, BUILDS, ITEMS, TRINKETS, ACTIVES, ENEMIES, BOSSES, FLOORS, TEXT } from './binding-data.js';
import { loadArt, drawCat, drawPortrait, artImage } from './binding-cat.js';
import { bakeRoom, drawDoorState, drawEnemy, drawBoss, drawPickup, drawHeart, WALL } from './binding-draw.js';
import { ART } from './binding-art.js';
import { Audio2 } from './binding-audio.js';
import { WORLD, SCENES, DEATHS, LORE } from './binding-story.js';
import { drawScene } from './binding-scene.js';
import { startGameCloud } from './gamecloud.js';

const T = TUNE.tile;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const DIRS = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const OPP = { n: 's', s: 'n', w: 'e', e: 'w' };
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ 存档
const SAVE_KEY = 'zjtt:binding';
const SAVE_VER = 1;

function defaultMeta() {
  return {
    v: SAVE_VER,
    fur: 'coal', eye: 'gold', costume: 'plain',
    unlock: ['fur:coal', 'eye:gold', 'cos:plain'],
    stats: { kills: 0, deaths: 0, runs: 0, clears: 0, itemsMax: 0, coinsMax: 0, bestFloor: 0, bestScore: 0, rooms: 0, bossKills: 0, madClears: 0 },
    diff: 'hard',    // 上次选的难度：三层简单 / 五层困难 / 八层癫狂
    byDiff: {},      // 按难度分开记：{ easy: { runs, clears, bestFloor, bestScore }, ... }
    muted: false,
    autoFire: false,  // 自动攻击：猫自己瞄准最近的敌人并持续开火，只需要走位
    codex: {},       // 已读的世界观条目（设定集）
    seen: {},        // 已看过的剧情场景，避免每次重开都重播
  };
}
function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || raw.v !== SAVE_VER) return defaultMeta();
    const m = Object.assign(defaultMeta(), raw);
    m.stats = Object.assign(defaultMeta().stats, raw.stats || {});
    if (!Array.isArray(m.unlock)) m.unlock = defaultMeta().unlock;
    if (!m.codex || typeof m.codex !== 'object') m.codex = {};
    if (!m.seen || typeof m.seen !== 'object') m.seen = {};
    // 老存档没有难度：默认困难（五层），并按现有最深纪录反推一次分项成绩
    if (!DIFFS.some((d) => d.k === m.diff)) m.diff = 'hard';
    if (!m.byDiff || typeof m.byDiff !== 'object') m.byDiff = {};
    for (const d of DIFFS) if (!m.byDiff[d.k] || typeof m.byDiff[d.k] !== 'object') m.byDiff[d.k] = {};
    return m;
  } catch (e) { return defaultMeta(); }
}
function saveMeta() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.meta)); } catch (e) { /* 无痕模式就算了 */ }
}
const hasUnlock = (id) => G.meta.unlock.includes(id);

// ------------------------------------------------------------------ 全局
const G = {
  mode: 'title',
  meta: loadMeta(),
  run: null,
  W: 0, H: 0,             // 当前房间的逻辑尺寸
  cols: 15, rows: 9,
  scale: 1, ox: 0, oy: 0, dpr: 1,
  t: 0, lastTime: 0,
  paused: false,
  ui: {},
  keys: {},
  mouse: { x: 0, y: 0, down: false, active: false },
  touch: { move: null, aim: null },
  toastTimer: 0,
  fx: [],
  shake: 0,
  banner: null,
  story: null,          // 剧情状态机：{ id, scene, i, reveal, full, onDone }
  bg: { cv: null, ctx: null, on: false, w: 0, h: 0 },
};
const run = () => G.run;
const room = () => G.run && G.run.room;

// 难度：一局开始就把 meta 里选的档拷进 run，局中不再受存档变动影响（重开才算）
const diffOf = () => {
  const k = (G.run && G.run.diff) || G.meta.diff;
  return DIFFS.find((d) => d.k === k) || DIFFS[1];
};
// 这一局打到第几层为止。FLOORS 始终是完整的八层，难度只是「敢走多深」
const floorCount = () => diffOf().floors;
const diffStat = (k) => {
  const d = G.meta.byDiff || (G.meta.byDiff = {});
  if (!d[k]) d[k] = {};
  return d[k];
};

// ------------------------------------------------------------------ 画布
const cv = $('cv');
const ctx = cv.getContext('2d');
const stage = $('stage');

// A whole floor may contain dozens of rooms. Keep only the two most recently
// rendered floor canvases; room game state stays intact and backgrounds can re-bake.
const bakedRooms = [];
function releaseBaked(room) {
  if (!room?.baked) return;
  const old = room.baked;
  room.baked = null;
  // Clearing dimensions releases the backing pixel allocation rather than only
  // dropping the JS reference (important for GPU canvas resource retention).
  old.width = 0; old.height = 0;
}
function cacheRoomBackdrop(rm, theme, W, H) {
  const oldIdx = bakedRooms.indexOf(rm);
  if (oldIdx >= 0) bakedRooms.splice(oldIdx, 1);
  releaseBaked(rm);
  rm.baked = bakeRoom(rm, theme, W, H);
  bakedRooms.push(rm);
  while (bakedRooms.length > 2) releaseBaked(bakedRooms.shift());
}
function clearBakedRooms() {
  for (const rm of bakedRooms) releaseBaked(rm);
  bakedRooms.length = 0;
}

function fit() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(matchMedia('(pointer:coarse)').matches ? 1.5 : 2, window.devicePixelRatio || 1);
  G.dpr = dpr;
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px';
  cv.style.height = r.height + 'px';
  const W = G.W || G.cols * T, H = G.H || G.rows * T;
  G.scale = Math.min(r.width / W, r.height / H) * 0.98;
  G.ox = (r.width - W * G.scale) / 2;
  G.oy = (r.height - H * G.scale) / 2;
  if (room()) cacheRoomBackdrop(room(), FLOORS[G.run.floor].theme, W, H);
}

const toWorld = (clientX, clientY) => {
  const r = cv.getBoundingClientRect();
  return { x: (clientX - r.left - G.ox) / G.scale, y: (clientY - r.top - G.oy) / G.scale };
};

// ------------------------------------------------------------------ 音效
// 合成器在 js/binding-audio.js：音效 + 每层一套程序化和声，页面不带音频文件。
// 这里只负责在正确的时机点一下。


// ------------------------------------------------------------------ 属性
function baseStats() {
  return {
    hp: TUNE.baseHp + (diffOf().extraHp || 0), dmg: TUNE.dmg, rate: TUNE.rate, shots: 1, pierce: 0,
    crit: TUNE.crit, critMul: TUNE.critMul, speed: TUNE.speed, tearSpeed: TUNE.tearSpeed,
    range: TUNE.range, luck: 0, coinMul: 1, chargeMul: 1, vision: 0, thorns: 0,
    healKill: 0, healRoom: 0, revive: 0, autoAim: false, explodeKill: false,
    invulnBonus: 0, dmgTaken: 1, tearSize: 1, floorCoins: 0, roomCoins: 0, alternator: 0, dmgMul: 1,
  };
}

function recalcStats() {
  const p = run().p;
  const s = baseStats();
  for (const k of run().items) {
    const eff = (ITEMS.find((i) => i.k === k) || {}).eff || {};
    for (const [key, v] of Object.entries(eff)) {
      if (key === 'dmgMul') s.dmgMul *= v;
      else if (['rate', 'speed', 'tearSpeed', 'range', 'coinMul', 'chargeMul'].includes(key)) s[key] *= v;
      else s[key] = (s[key] || 0) + v;
    }
  }
  if (run().trinket) {
    const tr = TRINKETS.find((x) => x.k === run().trinket);
    if (tr) for (const [key, v] of Object.entries(tr.eff)) {
      if (key === 'dmgMul') s.dmgMul *= v;
      else if (['rate', 'speed', 'tearSpeed', 'range', 'coinMul', 'chargeMul'].includes(key)) s[key] *= v;
      else s[key] = (s[key] || 0) + v;
    }
  }
  const prevMax = p.maxHp || TUNE.baseHp;
  p.maxHp = Math.round(s.hp);
  p.hp = clamp(p.hp + Math.max(0, p.maxHp - prevMax), 0, p.maxHp);
  p.stats = s;
  refreshHud();
}

const accs = () => run().items.map((k) => (ITEMS.find((i) => i.k === k) || {}).look).filter(Boolean);

// ------------------------------------------------------------------ 楼层 / 房间生成
function makeFloor(idx) {
  const F = FLOORS[idx];
  const cells = new Map();
  const key = (x, y) => x + ',' + y;
  const start = { x: 4, y: 4, type: 'start' };
  cells.set(key(4, 4), start);
  const list = [start];
  let guard = 0;
  while (list.length < F.rooms && guard++ < 5000) {
    const base = pickOne(list);
    const d = pickOne(Object.values(DIRS));
    const nx = base.x + d[0], ny = base.y + d[1];
    if (nx < 1 || nx > 7 || ny < 1 || ny > 7 || cells.has(key(nx, ny))) continue;
    const cell = { x: nx, y: ny, type: 'fight' };
    cells.set(key(nx, ny), cell);
    list.push(cell);
  }
  // 连通关系
  for (const c of list) {
    c.doors = { n: false, e: false, s: false, w: false };
    for (const [d, dd] of Object.entries(DIRS)) if (cells.has(key(c.x + dd[0], c.y + dd[1]))) c.doors[d] = true;
  }
  // 广度优先算距离：最远的当首领房，其余死胡同分别当宝箱房 / 商店
  const q = [start];
  const seen = new Map([[key(start.x, start.y), 0]]);
  while (q.length) {
    const c = q.shift();
    for (const dd of Object.values(DIRS)) {
      const nk = key(c.x + dd[0], c.y + dd[1]);
      if (cells.has(nk) && !seen.has(nk)) { seen.set(nk, seen.get(key(c.x, c.y)) + 1); q.push(cells.get(nk)); }
    }
  }
  const rest = list.filter((c) => c !== start).sort((a, b) => (seen.get(key(b.x, b.y)) || 0) - (seen.get(key(a.x, a.y)) || 0));
  const boss = rest.shift();
  if (boss) boss.type = 'boss';
  // 死胡同优先拿来当特殊房，走到底才有东西，比在半路上撞见更像「一间屋子」
  const deadEnds = rest.filter((c) => Object.values(c.doors).filter(Boolean).length === 1);
  const item = deadEnds.shift() || rest.shift();
  if (item) item.type = 'item';
  // 祭坛房：拿半颗心换一件造物。二层之后才出现——第一层就让新手割血太狠了
  if (idx >= 1) {
    const altar = deadEnds.shift() || rest.shift();
    if (altar) altar.type = 'altar';
  }
  // 挑战房：一群精英挤在一起，清完给两件
  const chal = deadEnds.shift() || rest.shift();
  if (chal) chal.type = 'challenge';
  const shop = deadEnds.shift() || rest.shift();
  if (shop) shop.type = 'shop';
  for (const c of list) c.seed = Math.floor(Math.random() * 1e9);
  return { cells, start, boss, floorIdx: idx, F };
}

// 从某扇门进来时玩家站的位置（goRoom 和出怪都要用，免得两边各写一套对不上）
const ENTRY_GAP = 26;
function entryPoint(fromDir) {
  const W = G.W, H = G.H;
  if (fromDir === 'n') return { x: W / 2, y: H - WALL - ENTRY_GAP };
  if (fromDir === 's') return { x: W / 2, y: WALL + ENTRY_GAP };
  if (fromDir === 'w') return { x: W - WALL - ENTRY_GAP, y: H / 2 };
  return { x: WALL + ENTRY_GAP, y: H / 2 };
}
// 进门后的安全区：敌人不会刷在这个半径内（开门杀的根源——以前只躲房间正中心，门口随便刷）
const DOOR_SAFE = 250;
const DOOR_GRACE = 1.1;     // 进门后敌人愣住的秒数（不动、不开火、不碰伤害），期间玩家也无敌

function buildRoom(rm, fromDir = null) {
  const W = G.W, H = G.H;
  rm.ents = [];
  rm.shots = [];
  rm.eshot = [];
  rm.pickups = [];
  rm.fx = [];
  rm.boss = null;
  rm.obstacles = [];
  const F = FLOORS[G.run.floor];
  const spawnPt = { x: W / 2, y: H / 2 };
  const door = fromDir ? entryPoint(fromDir) : null;

  if (rm.type === 'fight' || rm.type === 'boss' || rm.type === 'challenge') {
    // 课桌：避开门口和中心
    const n = rm.type === 'boss' ? 0 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const w = rnd(58, 96), h = rnd(34, 46);
      for (let tryN = 0; tryN < 24; tryN++) {
        const x = rnd(WALL + 26, W - WALL - w - 26), y = rnd(WALL + 26, H - WALL - h - 26);
        const cx = x + w / 2, cy = y + h / 2;
        if (dist(cx, cy, spawnPt.x, spawnPt.y) < 92) continue;
        if (Math.abs(cx - W / 2) < 42 || Math.abs(cy - H / 2) < 42) continue;
        if (rm.obstacles.some((o) => Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < 40)) continue;
        rm.obstacles.push({ x, y, w, h });
        break;
      }
    }
  }

  if (rm.type === 'fight' || rm.type === 'challenge') {
    const chal = rm.type === 'challenge';
    const cap = chal ? 9 : 7;
    let cnt = 2 + G.run.floor + Math.floor(Math.random() * 2) + Math.floor(G.run.roomsCleared / 3);
    if (chal) cnt += 2;
    cnt = Math.min(cap, cnt);
    let guard = 0;
    for (let i = 0; i < cnt; i++) {
      const pts = { x: rnd(WALL + 50, W - WALL - 50), y: rnd(WALL + 50, H - WALL - 50) };
      // 先躲中心；再躲进门的那扇门（试得久了放宽，免得窄屏小房间死循环）
      const safe = door ? Math.max(120, DOOR_SAFE - Math.floor(guard / 40) * 30) : 0;
      if (dist(pts.x, pts.y, spawnPt.x, spawnPt.y) < 110 || (door && dist(pts.x, pts.y, door.x, door.y) < safe)) { if (++guard < 400) { i--; continue; } }
      const key = chal ? pickOne(elitePool(F)) : pickOne(F.pool);
      rm.ents.push(makeEnemy(key, pts.x, pts.y, chal ? 1.12 : 1));
    }
  } else if (rm.type === 'item') {
    const key = rollItemKeyFor(rm);
    rm.pickups.push({ kind: 'item', x: W / 2, y: H / 2 - 10, item: key, icon: (ITEMS.find((i) => i.k === key) || {}).ic, seed: 0 });
  } else if (rm.type === 'altar') {
    // 祭坛房：东西摆在那儿，拿走要留半颗心。血不够就先别碰，拿走就没有回头路
    const key = rollItemKeyFor(rm);
    rm.pickups.push({
      kind: 'item', x: W / 2, y: H / 2 - 10, item: key,
      icon: (ITEMS.find((i) => i.k === key) || {}).ic, seed: 0, hpCost: 1,
    });
  } else if (rm.type === 'shop') {
    const opts = [
      { kind: 'heart', half: false, price: 6 },
      { kind: 'item', item: rollItemKeyFor(rm), price: 18 },
      { kind: 'trinket', trinket: pickOne(TRINKETS).k, price: 12 },
    ];
    opts.forEach((o, i) => {
      const p = { x: W / 2 + (i - 1) * 96, y: H / 2 - 6, price: o.price, seed: i, taken: false };
      if (o.kind === 'item') { p.kind = 'item'; p.item = o.item; p.icon = (ITEMS.find((x) => x.k === o.item) || {}).ic; }
      else if (o.kind === 'trinket') { p.kind = 'trinket'; p.trinket = o.trinket; p.icon = (TRINKETS.find((x) => x.k === o.trinket) || {}).ic; }
      else { p.kind = 'heart'; p.half = false; }
      rm.pickups.push(p);
    });
  } else if (rm.type === 'boss') {
    const B = BOSSES[F.boss];
    const bh = Math.round(B.hp * diffOf().hp);
    rm.boss = {
      k: F.boss, n: B.n, sub: B.sub, art: B.art, x: W / 2, y: H / 2 - 20,
      hp: bh, maxHp: bh, r: B.r, sp: B.sp, atks: B.atks, ringN: B.ringN, ringSp: B.ringSp,
      phase: 1, atkCd: 1.6, atkIdx: 0, windup: 0, dash: 0, dvx: 0, dvy: 0, hurt: 0,
      t: 0, a: 0, seed: Math.random() * 9,
    };
  }
  rm.cleared = !(rm.type === 'fight' || rm.type === 'boss' || rm.type === 'challenge');
  rm.built = true;
}

// 挑战房优先放这一层的精英，没有精英就退回普通池
function elitePool(F) {
  const e = F.pool.filter((k) => ENEMIES[k].cls === '精英');
  return e.length ? e : F.pool;
}

function rollItemKey() { return pickOne(ITEMS).k; }
// 已经拿过的少出，避免满地黄装同一样
function rollItemKeyFor(rm) {
  const owned = G.run.items;
  const pool = ITEMS.filter((i) => !owned.includes(i.k));
  const chosen = pickOne(pool.length ? pool : ITEMS);
  return chosen.k;
}

// 没有立绘时退回几何形状画，按 AI 挑一个差不多意思的
const SHAPE_BY_AI = { chase: 'blob', keep: 'eye', orbit: 'eye', dash: 'spider', blink: 'wraith' };
function makeEnemy(type, x, y, scale) {
  const d = ENEMIES[type];
  const sc = scale || 1;
  const dm = diffOf();
  return {
    type, art: d.art || null, draw: d.draw || SHAPE_BY_AI[d.ai] || 'blob', ai: d.ai, n: d.n, x, y, r: d.r * sc,
    hp: d.hp * sc * dm.hp, maxHp: d.hp * sc * dm.hp, sp: d.sp, dmg: d.dmg, c: d.c, c2: d.c2,
    shoot: d.shoot, keep: d.keep, split: d.split, art: d.art,
    vx: 0, vy: 0, hurt: 0, seed: Math.random() * 9, cd: rnd(0.6, 1.8), state: 0, timer: 0, aimA: 0,
  };
}

// ------------------------------------------------------------------ 开始一局
function startRun() {
  clearBakedRooms();
  G.cols = stage.clientWidth / stage.clientHeight < 0.95 ? 9 : 15;
  G.rows = G.cols === 9 ? 13 : 9;
  G.W = G.cols * T;
  G.H = G.rows * T;
  // 难度在开局这一刻定死：不能靠 diffOf() 现读，那一局还没建出来，读到的是上一局的档
  const dm = DIFFS.find((d) => d.k === G.meta.diff) || DIFFS[1];
  G.run = {
    floor: 0, p: null, room: null, items: [], trinket: null, active: null,
    coins: 0, hp: TUNE.baseHp, maxHp: TUNE.baseHp, score: 0, kills: 0, roomsCleared: 0,
    startTime: performance.now(), map: null, visitedRooms: 0, t: 0, dead: false, minFloorReached: 0,
    diff: dm.k,
  };
  const maxHp0 = TUNE.baseHp + (dm.extraHp || 0);
  G.run.hp = maxHp0;
  G.run.maxHp = maxHp0;
  const p = {
    x: G.W / 2, y: G.H / 2, vx: 0, vy: 0, r: TUNE.playerR,
    hp: maxHp0, maxHp: maxHp0, invuln: 0, fireCd: 0, hurt: 0, blink: 0, blinkT: rnd(2, 5),
    aim: -Math.PI / 2, moving: false, stats: baseStats(), alt: 0,
  };
  G.run.p = p;
  const m = makeFloor(0);
  G.run.map = m;
  G.run.room = m.start;
  buildRoom(m.start);
  m.start.visited = true;
  p.x = G.W / 2;
  p.y = G.H / 2;
  // 钥令优先给还没见过的：十种钥令，前十局一局一个，不用靠运气
  const unseen = ACTIVES.filter((a) => !G.meta.codex['ac:' + a.k]);
  const act = pickOne(unseen.length ? unseen : ACTIVES);
  G.run.active = { k: act.k, cd: 0, max: act.cd, twinT: 0, slowT: 0 };
  G.run.fxFresh = true;
  G.mode = 'play';
  G.paused = false;
  document.body.classList.remove('titlestate');
  hideOverlays();
  fit();
  refreshHud();
  renderMinimap();
  banner(FLOORS[0].n, FLOORS[0].tip);
  toast(`${dm.n} · 打到第 ${dm.floors} 层为止 · 钥令：${act.n}（空格 / 右下角按钮）`);
  Audio2.door();
  Audio2.music('hall');
  G.meta.codex['ac:' + act.k] = 1;
  saveMeta();
}

// 真正的开局：先看开场，再落地。开场看完才建房间，这样剧情里不会有人在背后开枪
function beginRun() {
  Audio2.ensure();
  Audio2.setMuted(G.meta.muted);
  // 开场只放一段：以前这里紧接着又播 f1，等于把两段独白摞在门外面，
  // 人还没摸到手就以为在放视觉小说。f1 改成第一次推开普通房门时再说。
  playScene('intro', () => startRun());
}

// ------------------------------------------------------------------ 移动与碰撞
function collideRect(e, ob) {
  const cx = clamp(e.x, ob.x, ob.x + ob.w);
  const cy = clamp(e.y, ob.y, ob.y + ob.h);
  let dx = e.x - cx, dy = e.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    e.x = cx + (dx / d) * e.r;
    e.y = cy + (dy / d) * e.r;
  } else {
    const dl = e.x - ob.x, dr = ob.x + ob.w - e.x, dt = e.y - ob.y, db = ob.y + ob.h - e.y;
    const mn = Math.min(dl, dr, dt, db);
    if (mn === dl) e.x = ob.x - e.r;
    else if (mn === dr) e.x = ob.x + ob.w + e.r;
    else if (mn === dt) e.y = ob.y - e.r;
    else e.y = ob.y + ob.h + e.r;
  }
  return true;
}

function clampInside(e, allowDoor) {
  const W = G.W, H = G.H, rm = room();
  const cx = W / 2, cy = H / 2;
  const open = (d) => allowDoor && rm.doors[d] && rm.cleared;
  const nGap = open('n') && Math.abs(e.x - cx) < 26;
  const sGap = open('s') && Math.abs(e.x - cx) < 26;
  const wGap = open('w') && Math.abs(e.y - cy) < 26;
  const eGap = open('e') && Math.abs(e.y - cy) < 26;
  // 门口开着时，边界要放到墙外——不然「夹在墙里」比 checkDoorLeave 的判定线还远，永远出不去。
  // （以前这里写的是 4，玩家的半径 12 一夹就成了 16，而判定线在 12，门等于死的。）
  const OUT = -e.r * 2;
  const minX = (wGap ? OUT : WALL) + e.r, maxX = (eGap ? W + e.r * 2 : W - WALL) - e.r;
  const minY = (nGap ? OUT : WALL) + e.r, maxY = (sGap ? H + e.r * 2 : H - WALL) - e.r;
  e.x = clamp(e.x, minX, maxX);
  e.y = clamp(e.y, minY, maxY);
}

// ------------------------------------------------------------------ 输入
// 自动瞄准有两个来源：义眼（造物，永久）和「自动攻击」开关（设置里手动开）。
// 区别是：义眼只管瞄，扣扳机还是你自己；自动攻击开关连扳机一起管。
const autoAimOn = () => !!(G.meta.autoFire || (G.run && G.run.p && G.run.p.stats.autoAim));

function aimAngle() {
  const p = run().p;
  const auto = autoAimOn();
  const lock = !!G.meta.autoFire;   // 自动攻击开着时，手动瞄准得「明确表态」才抢得走
  // 右摇杆（触屏）：手上还在搓，就听手的
  if (G.touch.aim && (G.touch.aim.dx || G.touch.aim.dy)) return Math.atan2(G.touch.aim.dy, G.touch.aim.dx);
  // 鼠标（桌面）
  if (G.mouse.active && (G.mouse.down || !lock)) {
    const w = toWorld(G.mouse.x, G.mouse.y);
    return Math.atan2(w.y - p.y, w.x - p.x);
  }
  // 方向键（正统以撒）
  const k = G.keys;
  let ax = 0, ay = 0;
  if (k.ArrowLeft) ax -= 1;
  if (k.ArrowRight) ax += 1;
  if (k.ArrowUp) ay -= 1;
  if (k.ArrowDown) ay += 1;
  if ((ax || ay) && !lock) return Math.atan2(ay, ax);
  // 自动锁定最近的敌人（自动攻击时范围放宽一点，省的差两像素就不打）
  const tgt = auto ? nearestEnemy(p.x, p.y, lock ? 620 : 520) : null;
  if (tgt) return Math.atan2(tgt.y - p.y, tgt.x - p.x);
  if (ax || ay) return Math.atan2(ay, ax);
  return p.aim;
}

function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const e of room().ents) {
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (room().boss) {
    const d = dist(x, y, room().boss.x, room().boss.y);
    if (d < bd) { bd = d; best = room().boss; }
  }
  return best;
}

function wantShoot() {
  if (G.mouse.down) return true;
  if (G.touch.aim) return true;
  const k = G.keys;
  if (k.ArrowLeft || k.ArrowRight || k.ArrowUp || k.ArrowDown) return true;
  // 自动攻击：房间里有活东西才开火。空房间一直放声音，是自己给自己制造噪音
  if (G.meta.autoFire) {
    const rm = room();
    if (rm && (rm.ents.length > 0 || rm.boss)) return true;
  }
  return false;
}

// ------------------------------------------------------------------ 射击
function fire() {
  const p = run().p, s = p.stats;
  const a = aimAngle();
  p.aim = a;
  const n = Math.max(1, Math.round(s.shots));
  const spread = n > 1 ? Math.min(0.5, 0.16 * (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * spread;
    let dmg = s.dmg * s.dmgMul;
    if (s.alternator) { p.alt = (p.alt || 0) + 1; if (p.alt % 2 === 0) dmg *= 1 + s.alternator; }
    const crit = Math.random() < s.crit;
    if (crit) dmg *= s.critMul;
    room().shots.push({
      x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * s.tearSpeed, vy: Math.sin(ang) * s.tearSpeed,
      r: TUNE.tearR * s.tearSize, dmg, life: (s.range / s.tearSpeed), pierce: s.pierce,
      crit, hit: [], t: 0,
    });
  }
  Audio2.shoot();
  G.shake = Math.max(G.shake, 0.6);
}

// ------------------------------------------------------------------ 更新
function update(dt) {
  const r = G.run, p = r.p, rm = r.room;
  // Bound visual-only particles even when a high-damage build produces more
  // hit bursts than the renderer can drain. Never discard rewards or enemies.
  if (G.fx.length > 280) G.fx.splice(0, G.fx.length - 280);
  r.t += dt;
  G.t += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurt = Math.max(0, p.hurt - dt * 3);
  G.shake *= 0.86;

  // ---- 移动
  let mx = 0, my = 0;
  const k = G.keys;
  if (k.KeyA) mx -= 1;
  if (k.KeyD) mx += 1;
  if (k.KeyW) my -= 1;
  if (k.KeyS) my += 1;
  if (G.touch.move) { mx = G.touch.move.dx; my = G.touch.move.dy; }
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  p.moving = ml > 0.05;
  const sp = p.stats.speed * (p.slow ? 0.55 : 1);
  p.vx = mx * sp;
  p.vy = my * sp;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  clampInside(p, true);
  for (const ob of rm.obstacles) collideRect(p, ob);

  // 走路时的轻微上下起伏
  p.bobT = (p.bobT || 0) + dt * (p.moving ? 1 : 0.35);
  // 眨眼
  p.blinkT -= dt;
  if (p.blinkT < 0) { p.blink = 0.12; p.blinkT = rnd(2.4, 6); }
  p.blink = Math.max(0, p.blink - dt);

  // 残血心跳：血越少跳得越急。画布四边的红晕用的也是 0.34 这个门槛，两边一个节奏。
  const hpR = p.maxHp > 0 ? p.hp / p.maxHp : 1;
  if (hpR <= 0.34) {
    p.heartT = (p.heartT || 0) - dt;
    if (p.heartT <= 0) { p.heartT = 0.72 + hpR * 1.6; Audio2.heartbeat(); }
  } else p.heartT = 0;

  // ---- 射击
  p.fireCd -= dt;
  if (wantShoot() && p.fireCd <= 0) {
    fire();
    p.fireCd = 1 / (p.stats.rate || 1);
  }

  // ---- 眼泪
  for (let i = rm.shots.length - 1; i >= 0; i--) {
    const s = rm.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.t += dt;
    if (s.life <= 0) { rm.shots.splice(i, 1); continue; }
    let dead = false;
    for (const ob of rm.obstacles) {
      if (s.x > ob.x && s.x < ob.x + ob.w && s.y > ob.y && s.y < ob.y + ob.h) { splash(s, 4); dead = true; break; }
    }
    if (dead) { rm.shots.splice(i, 1); continue; }
    if (s.x < WALL || s.x > G.W - WALL || s.y < WALL || s.y > G.H - WALL) {
      splash(s, 3); rm.shots.splice(i, 1); continue;
    }
    // 打敌人
    const targets = rm.ents.concat(rm.boss ? [rm.boss] : []);
    for (const e of targets) {
      if (s.hit.includes(e)) continue;
      if (dist(s.x, s.y, e.x, e.y) > e.r + s.r) continue;
      hurtEnemy(e, s.dmg, s.crit, s.vx, s.vy);
      s.hit.push(e);
      splash(s, 6);
      if (s.hit.length > s.pierce) { dead = true; }
      break;
    }
    if (dead) rm.shots.splice(i, 1);
  }

  // ---- 敌人
  updateEnemies(dt);

  // ---- 敌方弹幕
  for (let i = rm.eshot.length - 1; i >= 0; i--) {
    const b = rm.eshot[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { rm.eshot.splice(i, 1); continue; }
    let gone = false;
    for (const ob of rm.obstacles) {
      if (b.x > ob.x && b.x < ob.x + ob.w && b.y > ob.y && b.y < ob.y + ob.h) { gone = true; break; }
    }
    if (!gone && (b.x < WALL || b.x > G.W - WALL || b.y < WALL || b.y > G.H - WALL)) gone = true;
    if (gone) { splash(b, 3, true); rm.eshot.splice(i, 1); continue; }
    if (p.invuln <= 0 && dist(b.x, b.y, p.x, p.y) < p.r + b.r) {
      hurtPlayer(b.dmg || 1);
      rm.eshot.splice(i, 1);
    }
  }

  // ---- 掉落物
  for (const pk of rm.pickups) {
    if (pk.taken) continue;
    // Pickups have no collision physics: clamp out of walls, then push off tables.
    // This also repairs already spawned drops after enemy knockback near the wall.
    if (!Number.isFinite(pk.x) || !Number.isFinite(pk.y)) { pk.x = G.W / 2; pk.y = G.H / 2; }
    pk.x = clamp(pk.x, WALL + 22, G.W - WALL - 22);
    pk.y = clamp(pk.y, WALL + 22, G.H - WALL - 22);
    for (const ob of rm.obstacles) {
      const pad = 20;
      if (pk.x > ob.x - pad && pk.x < ob.x + ob.w + pad && pk.y > ob.y - pad && pk.y < ob.y + ob.h + pad) {
        const edges = [
          { d: pk.x - (ob.x - pad), x: ob.x - pad, y: pk.y },
          { d: ob.x + ob.w + pad - pk.x, x: ob.x + ob.w + pad, y: pk.y },
          { d: pk.y - (ob.y - pad), x: pk.x, y: ob.y - pad },
          { d: ob.y + ob.h + pad - pk.y, x: pk.x, y: ob.y + ob.h + pad },
        ].sort((a, b) => a.d - b.d);
        pk.x = clamp(edges[0].x, WALL + 22, G.W - WALL - 22);
        pk.y = clamp(edges[0].y, WALL + 22, G.H - WALL - 22);
      }
    }
    const d = dist(pk.x, pk.y, p.x, p.y);
    if (pk.kind === 'coin' && d < 44) {
      // 磁吸
      pk.x += (p.x - pk.x) * Math.min(1, dt * 7);
      pk.y += (p.y - pk.y) * Math.min(1, dt * 7);
    }
    const reach = pk.kind === 'item' ? 22 : 16;
    if (d < p.r + reach) tryPickup(pk);
  }

  // ---- 特效
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    // 特效里有些是不动的（爆炸、闪电），它们没有 vx/vy。以前直接 += f.vx 会算成 NaN，
    // 下一帧 createRadialGradient 拿 NaN 就抛，整帧渲染断在那儿。
    f.x += (f.vx || 0) * dt;
    f.y += (f.vy || 0) * dt;
    if (f.vx) f.vx *= 0.94;
    if (f.vy) f.vy *= 0.94;
    f.life -= dt;
    if (f.life <= 0) G.fx.splice(i, 1);
  }

  // ---- 钥令冷却
  if (r.active) {
    r.active.cd = Math.max(0, r.active.cd - dt * (p.stats.chargeMul || 1));
    if (r.active.slowT > 0) r.active.slowT -= dt;
    if (r.active.twin && r.active.twinT > 0) {
      r.active.twinT -= dt;
      // 分身自己打
      r.active.twinCd = (r.active.twinCd || 0) - dt;
      if (r.active.twinCd <= 0) {
        r.active.twinCd = 0.45;
        const tg = nearestEnemy(r.active.twin.x, r.active.twin.y, 480);
        if (tg) {
          const a = Math.atan2(tg.y - r.active.twin.y, tg.x - r.active.twin.x);
          rm.shots.push({
            x: r.active.twin.x, y: r.active.twin.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
            r: 5, dmg: 2.4, life: 1.1, pierce: 0, crit: false, hit: [], t: 0, twin: true,
          });
        }
      }
    }
  }

  // ---- 清房 / 门
  if (!rm.cleared && rm.ents.length === 0 && !rm.boss) onRoomClear();
  if (rm.boss && rm.boss.hp <= 0) onBossDown();
  if (rm.cleared) checkDoorLeave();

  // ---- 计时类
  if (rm.boss) updateBoss(dt);
}

function updateEnemies(dt) {
  const r = G.run, p = r.p, rm = r.room;
  const slow = r.active && r.active.slowT > 0 ? 0.4 : 1;
  const frozen = rm.grace > 0;
  if (frozen) rm.grace = Math.max(0, rm.grace - dt);
  for (const e of rm.ents) {
    e.hurt = Math.max(0, e.hurt - dt * 4);
    // 瘟疫：每秒结一次账，零头留在 acc 里，不然 3 点/秒会被帧率吃掉
    if (e.psn) {
      e.psn.t -= dt;
      e.psn.acc += dt * e.psn.dps;
      if (e.psn.acc >= 1) {
        const d = Math.floor(e.psn.acc);
        e.psn.acc -= d;
        hurtEnemy(e, d, false, 0, 0);
      }
      if (Math.random() < dt * 5) {
        G.fx.push({ x: e.x + rnd(-9, 9), y: e.y + rnd(-9, 9), vx: 0, vy: -20, life: 0.55, kind: 'dot', c: '#8ad07a', s: 2.2 });
      }
      if (e.psn.t <= 0) delete e.psn;
    }
    const dp = dist(e.x, e.y, p.x, p.y);
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.aimA = ang;
    // 进门缓冲：愣住，第一次出手也要再等一会儿（出手冷却不再从 0.6 秒起跳）
    if (frozen) { e.cd = Math.max(e.cd, 0.7 + (e.seed % 1) * 0.6); continue; }
    e.cd -= dt * slow;
    let vx = 0, vy = 0;

    if (e.ai === 'chase') {
      vx = Math.cos(ang) * e.sp;
      vy = Math.sin(ang) * e.sp;
      if (e.wobble) { vx += Math.cos(r.t * 6 + e.seed) * e.sp * 0.5; vy += Math.sin(r.t * 6 + e.seed) * e.sp * 0.5; }
    } else if (e.ai === 'keep') {
      const want = e.keep || 130;
      const dir = dp < want - 20 ? -1 : dp > want + 30 ? 1 : 0;
      vx = Math.cos(ang) * e.sp * dir;
      vy = Math.sin(ang) * e.sp * dir;
      // 侧移
      vx += Math.cos(ang + Math.PI / 2) * e.sp * 0.4 * Math.sin(r.t * 1.2 + e.seed);
      vy += Math.sin(ang + Math.PI / 2) * e.sp * 0.4 * Math.sin(r.t * 1.2 + e.seed);
      if (e.cd <= 0 && dp < 320) { shootAt(e, ang); e.cd = e.shoot.cd; }
    } else if (e.ai === 'orbit') {
      const want = 150;
      const dir = dp < want - 24 ? -1 : dp > want + 24 ? 1 : 0;
      vx = Math.cos(ang) * e.sp * dir + Math.cos(ang + Math.PI / 2) * e.sp * 0.9;
      vy = Math.sin(ang) * e.sp * dir + Math.sin(ang + Math.PI / 2) * e.sp * 0.9;
      if (e.cd <= 0) { shootAt(e, ang); e.cd = e.shoot.cd; }
    } else if (e.ai === 'dash') {
      if (e.state === 0) {
        vx = Math.cos(ang) * e.sp * 0.5; vy = Math.sin(ang) * e.sp * 0.5;
        e.timer += dt;
        if (e.timer > 1.5) { e.state = 1; e.timer = 0; }
      } else if (e.state === 1) {
        // 蓄力（站着抖）
        e.timer += dt;
        if (e.timer > 0.55) { e.state = 2; e.timer = 0; e.dvx = Math.cos(ang) * e.sp * 4.2; e.dvy = Math.sin(ang) * e.sp * 4.2; }
      } else {
        vx = e.dvx; vy = e.dvy;
        e.timer += dt;
        if (e.timer > 0.42) { e.state = 0; e.timer = 0; }
      }
    } else if (e.ai === 'blink') {
      vx = Math.cos(ang) * e.sp * 0.5; vy = Math.sin(ang) * e.sp * 0.5;
      e.timer += dt;
      if (e.timer > 2.6) {
        e.timer = 0;
        for (let i = 0; i < 5; i++) {
          const nx = rnd(WALL + 40, G.W - WALL - 40), ny = rnd(WALL + 40, G.H - WALL - 40);
          if (dist(nx, ny, p.x, p.y) > 90) { e.x = nx; e.y = ny; break; }
        }
        burst(e.x, e.y, 8, 'rgba(180,160,255,.7)');
      }
      if (e.cd <= 0) { shootAt(e, ang); e.cd = e.shoot.cd; }
    }

    // 相互推开，避免叠成一坨
    for (const o of rm.ents) {
      if (o === e) continue;
      const d = dist(e.x, e.y, o.x, o.y);
      const min = e.r + o.r - 2;
      if (d > 0.01 && d < min) {
        e.x += ((e.x - o.x) / d) * (min - d) * 0.5;
        e.y += ((e.y - o.y) / d) * (min - d) * 0.5;
      }
    }

    e.x += vx * dt * slow;
    e.y += vy * dt * slow;
    clampInside(e, false);
    for (const ob of rm.obstacles) collideRect(e, ob);

    // 接触伤害
    if (dp < e.r + p.r - 2 && p.invuln <= 0) {
      hurtPlayer(1);
      if (p.stats.thorns > 0) hurtEnemy(e, p.stats.thorns, false, 0, 0);
    }
  }
}

function shootAt(e, ang) {
  const sh = e.shoot;
  if (!sh) return;
  const n = sh.n || 1;
  const full = sh.spread >= TAU - 0.001;
  for (let i = 0; i < n; i++) {
    const a = full ? (i / n) * TAU : ang + (i - (n - 1) / 2) * (sh.spread || 0.25);
    room().eshot.push({
      x: e.x + Math.cos(a) * (e.r + 2), y: e.y + Math.sin(a) * (e.r + 2),
      vx: Math.cos(a) * sh.sp, vy: Math.sin(a) * sh.sp, r: 5, life: 3.2, dmg: sh.dmg || 1,
    });
  }
  Audio2.blip(320, 0.06, 'sawtooth', 0.02, 0.7);
}

function hurtEnemy(e, dmg, crit, vx, vy) {
  e.hp -= dmg;
  e.hurt = 1;
  const d = Math.hypot(vx, vy) || 1;
  e.x += (vx / d) * 4;
  e.y += (vy / d) * 4;
  G.fx.push({ x: e.x, y: e.y - 4, vx: rnd(-30, 30), vy: rnd(-40, -10), life: 0.35, kind: crit ? 'crit' : 'hit', s: crit ? 9 : 5 });
  Audio2.hit();
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;        // 只结算一次
    const rm = G.run && G.run.room;
    if (rm && e === rm.boss) {
      // 首领不走 killEnemy：它的收尾由 update() 里的 onBossDown 负责（掉落 / 楼梯 / 剧情）。
      // 以前也走 killEnemy，而 killEnemy 带「击杀爆炸」时会再去 hurtEnemy(rm.boss)——
      // 首领这时血量已经 ≤ 0，于是 hurtEnemy → killEnemy → hurtEnemy……无限递归，栈溢出，
      // 每一帧都在同一处报错，onBossDown 永远跑不到：打完首领、剧情还没进就卡死。
      G.run.kills += 1;
      G.run.score += 12 + G.run.floor * 6;
    } else killEnemy(e);
  }
}

function killEnemy(e) {
  const r = G.run, rm = r.room;
  const idx = rm.ents.indexOf(e);
  if (idx >= 0) rm.ents.splice(idx, 1);
  r.kills += 1;
  r.score += 12 + r.floor * 6;
  burst(e.x, e.y, 12, e.c2 || '#9fb0d8');
  Audio2.kill();
  if (r.p.stats.explodeKill) {
    G.fx.push({ x: e.x, y: e.y, life: 0.4, kind: 'boom', s: 44 });
    Audio2.boom();
    for (const o of rm.ents.slice()) if (!o.dead && o.hp > 0 && dist(o.x, o.y, e.x, e.y) < 46) hurtEnemy(o, 6, false, 0, 0);
    if (rm.boss && !rm.boss.dead && rm.boss.hp > 0 && dist(rm.boss.x, rm.boss.y, e.x, e.y) < 60) hurtEnemy(rm.boss, 6, false, 0, 0);
  }
  // 分裂
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const c = makeEnemy('crawler', e.x + rnd(-14, 14), e.y + rnd(-14, 14), 0.72);
      rm.ents.push(c);
    }
  }
  // 掉落
  const luck = r.p.stats.luck;
  const dr = diffOf().drop;
  const coinChance = (0.42 + luck * 0.05) * dr;
  if (Math.random() < coinChance) dropCoin(e.x, e.y, Math.random() < 0.12 + luck * 0.04 ? 5 : 1);
  if (Math.random() < (0.035 + luck * 0.012) * dr) rm.pickups.push({ kind: 'heart', x: e.x, y: e.y, half: true, seed: Math.random() * 9 });
  if (r.p.stats.healKill) {
    r.healCounter = (r.healCounter || 0) + 1;
    if (r.healCounter >= r.p.stats.healKill) { r.healCounter = 0; heal(1); }
  }
  refreshHud();
}

function dropCoin(x, y, value) {
  room().pickups.push({
    kind: 'coin', x: x + rnd(-6, 6), y: y + rnd(-6, 6), value, seed: Math.random() * 9,
  });
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(30, 150);
    G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.2, 0.55), kind: 'dot', c: color, s: rnd(1.5, 3.4) });
  }
}

function splash(s, n, enemy) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = rnd(20, 80);
    G.fx.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.12, 0.3), kind: 'dot', c: enemy ? '#ff9aa2' : '#bfe4ff', s: rnd(1, 2.4) });
  }
}

function heal(n) {
  const p = run().p;
  p.hp = Math.min(p.maxHp, p.hp + n);
  refreshHud();
}

function hurtPlayer(dmg) {
  const r = G.run, p = r.p;
  if (p.invuln > 0) return;
  // 难度的伤害倍率统一乘在这里：接触、弹幕、爆裂全走这一条路径，不会漏
  const amount = Math.max(1, Math.round(dmg * (p.stats.dmgTaken || 1) * diffOf().dmg));
  p.hp -= amount;
  p.invuln = TUNE.invuln + (p.stats.invulnBonus || 0);
  p.hurt = 1;
  G.shake = 9;
  Audio2.hurt();
  burst(p.x, p.y, 10, '#ff7a7a');
  refreshHud();
  if (p.hp <= 0) onDeath();
}

function onDeath() {
  const r = G.run;
  if (r.p.stats.revive > 0 && !r.usedRevive) {
    r.usedRevive = true;
    r.p.stats.revive -= 1;
    r.p.hp = 2;
    r.p.invuln = 2.4;
    banner('人鱼泪珠碎了', '你还有一次机会');
    refreshHud();
    return;
  }
  r.dead = true;
  G.mode = 'dead';
  Audio2.die();
  finishRun(false);
}

function onRoomClear() {
  const r = G.run, rm = r.room;
  rm.cleared = true;
  r.roomsCleared += 1;
  r.score += rm.type === 'challenge' ? 60 : 20;
  Audio2.door();
  banner(rm.type === 'boss' ? '门开了' : rm.type === 'challenge' ? '挑战完成' : '清空', '');
  // 掉落
  const bonus = r.p.stats.roomCoins || 0;
  const n = 1 + Math.floor(Math.random() * 2) + bonus;
  for (let i = 0; i < n; i++) dropCoin(G.W / 2, G.H / 2 + 8, 1);
  // 挑战房：一次给两件，摆在房间中间
  if (rm.type === 'challenge') {
    const pool = ITEMS.filter((i) => !r.items.includes(i.k));
    for (let i = 0; i < 2; i++) {
      const it = pickOne(pool.length ? pool : ITEMS);
      rm.pickups.push({
        kind: 'item', x: G.W / 2 + (i === 0 ? -48 : 48), y: G.H / 2 - 14,
        item: it.k, icon: it.ic, seed: i + 3,
      });
    }
  }
  if (r.p.stats.healRoom) heal(r.p.stats.healRoom / 2);
  if (Math.random() < (0.09 + r.p.stats.luck * 0.02) * diffOf().drop) {
    rm.pickups.push({ kind: 'trinket', x: G.W / 2 + rnd(-30, 30), y: G.H / 2 + 30, icon: pickOne(TRINKETS).ic, trinket: pickOne(TRINKETS).k, seed: Math.random() * 9 });
  }
  renderMinimap();
  refreshHud();
}

function onBossDown() {
  const r = G.run, rm = r.room;
  if (rm.bossDone) return;
  rm.bossDone = true;
  rm.boss = null;
  rm.cleared = true;
  r.score += 150 + r.floor * 100;
  r.bossKills = (r.bossKills || 0) + 1;
  G.meta.stats.bossKills = (G.meta.stats.bossKills || 0) + 1;
  burst(G.W / 2, G.H / 2, 40, '#ffd98a');
  Audio2.boom();
  // 掉落：一堆银芯 + 一颗心
  for (let i = 0; i < 6; i++) dropCoin(G.W / 2 + rnd(-40, 40), G.H / 2 + rnd(-30, 30), 1);
  rm.pickups.push({ kind: 'heart', x: G.W / 2 + 46, y: G.H / 2, half: false, seed: 1 });
  if (r.floor < floorCount() - 1) rm.pickups.push({ kind: 'stair', x: G.W / 2, y: G.H / 2 + 26, seed: 2 });
  if (r.p.stats.floorCoins) r.coins += r.p.stats.floorCoins;
  renderMinimap();
  refreshHud();
  saveMeta();
  if (r.floor >= floorCount() - 1) {
    // 最后一只首领倒下 → 结局。这里不放楼梯：上面已经没有地方可以去了。
    // 三个难度各有各的收尾——三层从蜡像馆爬回去、五层从通风井爬回去、八层才是真结局
    playScene(diffOf().end || 'win', () => { finishRun(true); });
  } else {
    playScene('b' + (r.floor + 1) + 'post', () => {
      banner('首领倒下', '楼梯出现了');
      Audio2.item();
    });
  }
}

// ------------------------------------------------------------------ 首领
function updateBoss(dt) {
  const r = G.run, rm = r.room, b = rm.boss, p = r.p;
  if (!b) return;
  b.hurt = Math.max(0, b.hurt - dt * 4);
  // 首领也吃瘟疫，不然这一招只对小怪有用
  if (b.psn) {
    b.psn.t -= dt;
    b.psn.acc += dt * b.psn.dps;
    if (b.psn.acc >= 1) {
      const d = Math.floor(b.psn.acc);
      b.psn.acc -= d;
      hurtEnemy(b, d, false, 0, 0);
    }
    if (b.psn.t <= 0) delete b.psn;
  }
  if (rm.grace > 0) { b.atkCd = Math.max(b.atkCd, 1.0); return; }   // 进门缓冲：首领先亮相，不立刻出招
  b.t += dt;
  b.phase = b.hp / b.maxHp < 0.45 ? 2 : 1;
  const ang = Math.atan2(p.y - b.y, p.x - b.x);

  if (b.windup > 0) {
    b.windup -= dt;
    if (b.windup <= 0) {
      // 冲撞
      b.dash = 0.55;
      b.dvx = Math.cos(b.a) * b.sp * 5.2;
      b.dvy = Math.sin(b.a) * b.sp * 5.2;
    }
  } else if (b.dash > 0) {
    b.dash -= dt;
    b.x += b.dvx * dt;
    b.y += b.dvy * dt;
    if (b.x < WALL + b.r || b.x > G.W - WALL - b.r) { b.dvx *= -0.5; b.x = clamp(b.x, WALL + b.r, G.W - WALL - b.r); }
    if (b.y < WALL + b.r || b.y > G.H - WALL - b.r) { b.dvy *= -0.5; b.y = clamp(b.y, WALL + b.r, G.H - WALL - b.r); }
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r && p.invuln <= 0) hurtPlayer(1);
  } else {
    // 缓慢靠近玩家（保持一点距离）
    const d = dist(b.x, b.y, p.x, p.y);
    const want = 150;
    const dir = d > want + 20 ? 1 : d < want - 20 ? -1 : 0;
    b.x += Math.cos(ang) * b.sp * dir * dt;
    b.y += Math.sin(ang) * b.sp * dir * dt;
    b.x = clamp(b.x, WALL + b.r, G.W - WALL - b.r);
    b.y = clamp(b.y, WALL + b.r, G.H - WALL - b.r);
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r && p.invuln <= 0) hurtPlayer(1);

    b.atkCd -= dt;
    if (b.atkCd <= 0) {
      const atk = b.atks[b.atkIdx % b.atks.length];
      b.atkIdx++;
      b.atkCd = b.phase === 2 ? 1.5 : 2.2;
      b.a = ang;
      if (atk === 'ring') bossRing(b);
      else if (atk === 'aimed') bossAimed(b, ang);
      else if (atk === 'summon') bossSummon(b);
      else if (atk === 'charge') { b.windup = 0.75; }
      else if (atk === 'spiral') bossSpiral(b);
      else if (atk === 'rain') bossRain(b);
    }
  }
  // 首领也算「敌人」，让子弹能打中（在 update 的眼泪循环里已包含 rm.boss）
}

function bossRing(b) {
  const n = b.ringN + (b.phase === 2 ? 6 : 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + b.t * 0.4;
    room().eshot.push({ x: b.x, y: b.y, vx: Math.cos(a) * b.ringSp, vy: Math.sin(a) * b.ringSp, r: 5.5, life: 3.4, dmg: 1 });
  }
  Audio2.blip(260, 0.14, 'sawtooth', 0.03, 0.6);
}

function bossAimed(b, ang) {
  const n = b.phase === 2 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.16;
    room().eshot.push({ x: b.x, y: b.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 5.5, life: 3, dmg: 1 });
  }
  Audio2.blip(300, 0.1, 'sawtooth', 0.03, 0.7);
}

function bossSummon(b) {
  const F = FLOORS[G.run.floor];
  for (let i = 0; i < 2; i++) {
    const a = Math.random() * TAU;
    room().ents.push(makeEnemy(pickOne(F.pool), b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, 0.9));
  }
  burst(b.x, b.y, 14, '#b0a0ff');
}

// 螺旋：三条旋臂，波与波之间靠速度差拉开，所以看起来是在转而不是三圈一起到
function bossSpiral(b) {
  const n = 8 + (b.phase === 2 ? 3 : 0);
  for (let w = 0; w < 3; w++) {
    const off = b.t * 0.9 + w * 0.5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + off;
      const sp = 68 + w * 34;
      room().eshot.push({ x: b.x, y: b.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, life: 4.2, dmg: 1 });
    }
  }
  Audio2.blip(220, 0.2, 'sawtooth', 0.03, 0.55);
}

// 落弹：从房间上沿砸到玩家周围。看得见它下来，所以躲得开——这是唯一一个「讲道理」的招
function bossRain(b) {
  const n = b.phase === 2 ? 8 : 5;
  const p = G.run.p;
  for (let i = 0; i < n; i++) {
    const tx = clamp(p.x + rnd(-120, 120), WALL + 10, G.W - WALL - 10);
    room().eshot.push({ x: tx, y: WALL + 2, vx: 0, vy: 260 + rnd(0, 60), r: 5.5, life: 3.2, dmg: 1 });
  }
  Audio2.blip(180, 0.22, 'square', 0.03, 0.5);
}

// ------------------------------------------------------------------ 拾取
function tryPickup(pk) {
  const r = G.run, p = r.p;
  if (pk.kind === 'heart' && p.hp >= p.maxHp) { toast('血是满的，先别浪费'); return; }
  if (pk.kind === 'stair') { pk.taken = true; goNext(); return; }
  // 祭坛：标价是血。留一口气才换得动，只剩半颗心的时候碰它等于自杀
  if (pk.hpCost != null && !pk.taken) {
    if (p.hp <= pk.hpCost) { toast('血不够换（要半颗心）'); return; }
    p.hp -= pk.hpCost;
    refreshHud();
    Audio2.hurt();
  }
  if (pk.price != null && !pk.taken) {
    if (r.coins < pk.price) { toast('银芯不够（要 ' + pk.price + '）'); pk.afford = false; return; }
    r.coins -= pk.price;
    pk.taken = true;
  }
  if (pk.kind === 'coin') {
    r.coins += Math.round(pk.value * (p.stats.coinMul || 1));
    r.score += 2;
    pk.dead = true;
    Audio2.coin();
    G.fx.push({ x: pk.x, y: pk.y, vx: 0, vy: -40, life: 0.5, kind: 'text', txt: '+' + pk.value, c: '#e3b341' });
  } else if (pk.kind === 'heart') {
    heal(pk.half ? 1 : 2);
    pk.dead = true;
    Audio2.item();
  } else if (pk.kind === 'item') {
    takeItem(pk.item);
    pk.dead = true;
  } else if (pk.kind === 'trinket') {
    r.trinket = pk.trinket;
    const t = TRINKETS.find((x) => x.k === pk.trinket);
    recalcStats();
    const tl = LORE[pk.trinket];
    showItemCard(t.n, '密契 · 小饰品', (tl ? '「' + tl + '」\n' : '') + t.t, ART_ICON_T(t.ic));
    Audio2.item();
    G.meta.codex['tr:' + pk.trinket] = 1;
    saveMeta();
    pk.dead = true;
  }
  // 清理
  if (pk.dead) {
    const rm = room();
    const i = rm.pickups.indexOf(pk);
    if (i >= 0) rm.pickups.splice(i, 1);
    refreshHud();
  }
}

function takeItem(key) {
  const r = G.run;
  const it = ITEMS.find((i) => i.k === key);
  if (!it) return;
  r.items.push(key);
  recalcStats();
  // 物品卡上多给一句档案原话：数值看得懂，但那句话才是它原本属于谁
  const lore = LORE[key];
  showItemCard(it.n, '造物 · ' + it.q, (lore ? '「' + lore + '」\n' : '') + it.t, ART_ICON(it.ic));  Audio2.item();
  G.shake = 4;
  G.meta.codex['it:' + key] = 1;
  saveMeta();
  refreshHud();
}

// ------------------------------------------------------------------ 门 / 楼层
function checkDoorLeave() {
  const r = G.run, p = r.p, rm = r.room;
  const W = G.W, H = G.H;
  const cx = W / 2, cy = H / 2;
  let dir = null;
  if (rm.doors.n && Math.abs(p.x - cx) < 26 && p.y < 12) dir = 'n';
  else if (rm.doors.s && Math.abs(p.x - cx) < 26 && p.y > H - 12) dir = 's';
  else if (rm.doors.w && Math.abs(p.y - cy) < 26 && p.x < 12) dir = 'w';
  else if (rm.doors.e && Math.abs(p.y - cy) < 26 && p.x > W - 12) dir = 'e';
  if (!dir) return;
  const [dx, dy] = DIRS[dir];
  const nx = rm.x + dx, ny = rm.y + dy;
  const next = r.map.cells.get(nx + ',' + ny);
  if (!next) return;
  goRoom(next, dir);
}

function goRoom(next, fromDir) {
  const r = G.run;
  r.room = next;
  const firstBuild = !next.built;
  if (firstBuild) buildRoom(next, fromDir);
  if (!next.visited) {
    next.visited = true;
    r.visitedRooms += 1;
    if (r.p.stats.healRoom && r.trinket === 'april') {
      r.aprilCount = (r.aprilCount || 0) + 1;
      if (r.aprilCount % 3 === 0) heal(1);
    }
  }
  const p = r.p;
  const W = G.W, H = G.H;
  // 从对面那扇门进来
  if (fromDir === 'n') { p.x = W / 2; p.y = H - WALL - 26; }
  else if (fromDir === 's') { p.x = W / 2; p.y = WALL + 26; }
  else if (fromDir === 'w') { p.x = W - WALL - 26; p.y = H / 2; }
  else { p.x = WALL + 26; p.y = H / 2; }
  // 开门杀防护：清掉飘在空中的弹幕，把贴在门口的敌人推开，进门后给一小段缓冲
  next.eshot = [];
  if (!next.cleared) {
    const door = entryPoint(fromDir);
    for (const e of next.ents || []) {
      const d = dist(e.x, e.y, door.x, door.y);
      if (d < DOOR_SAFE * 0.7) {
        const a = Math.atan2(e.y - door.y, e.x - door.x);
        e.x = clamp(door.x + Math.cos(a) * DOOR_SAFE * 0.7, WALL + e.r, W - WALL - e.r);
        e.y = clamp(door.y + Math.sin(a) * DOOR_SAFE * 0.7, WALL + e.r, H - WALL - e.r);
      }
    }
    next.grace = DOOR_GRACE;
    p.invuln = Math.max(p.invuln, DOOR_GRACE);
  }
  cacheRoomBackdrop(next, FLOORS[r.floor].theme, W, H);
  G.fx.length = 0;
  renderMinimap();
  Audio2.door();
  if (next.type === 'boss' && next.boss) {
    Audio2.boom();
    // 每层的首领都有一段开场白：先说话，再动手（说过一次就不再打断）
    playScene('b' + (r.floor + 1) + 'pre', () => {
      banner('首领 · ' + next.boss.n, next.boss.sub);
      Audio2.roar();
    });
  } else if (next.type === 'shop') {
    banner('商店', '银芯换东西，价格贴在下面');
  } else if (next.type === 'item') {
    banner('宝箱房', '基座上的东西碰一下就拿走');
  } else if (next.type === 'altar') {
    banner('祭坛房', '东西白拿，代价是半颗心');
  } else if (next.type === 'challenge') {
    banner('挑战房', '这一层最不好惹的都在这儿，清完给两件');
    Audio2.boom();
  }
  // 第一层第一次推开普通房门时，才把「一层 · 晚自习走廊」那段环境描写补上
  if (next.type === 'fight' && r.floor === 0 && !r.f1Done) {
    r.f1Done = true;
    playScene('f1');
  }
}

function goNext() {
  const r = G.run;
  r.floorClear = (r.floorClear || 0) + 1;
  G.meta.stats.floorClear = Math.max(G.meta.stats.floorClear || 0, r.floorClear);
  Audio2.item();
  if (r.floor + 1 >= floorCount()) { finishRun(true); return; }
  nextFloor();
}

function nextFloor() {
  clearBakedRooms();
  const r = G.run;
  r.floor += 1;
  if (r.floor >= floorCount()) { finishRun(true); return; }
  r.map = makeFloor(r.floor);
  r.room = r.map.start;
  buildRoom(r.map.start);
  r.map.start.visited = true;
  r.p.x = G.W / 2;
  r.p.y = G.H / 2;
  if (r.p.stats.floorCoins) r.coins += r.p.stats.floorCoins;
  r.baked = null;
  fit();
  renderMinimap();
  refreshHud();
  banner(FLOORS[r.floor].n, FLOORS[r.floor].tip);
  Audio2.item();
  Audio2.music(FLOORS[r.floor].music || 'hall');
  // 新一层开场：说完再把操作还给人
  playScene('f' + (r.floor + 1));
}

// ------------------------------------------------------------------ 结算 / 解锁
function finishRun(win) {
  clearBakedRooms();
  const r = G.run;
  const st = G.meta.stats;
  const dm = diffOf();
  const reached = win ? floorCount() : r.floor + 1;
  const sc = Math.round(r.score * (dm.score || 1));
  r.finalScore = sc;
  st.runs += 1;
  st.kills += r.kills;
  if (!win) st.deaths += 1;
  if (win) st.clears += 1;
  if (win && dm.k === 'mad') st.madClears = (st.madClears || 0) + 1;
  st.itemsMax = Math.max(st.itemsMax, r.items.length);
  st.coinsMax = Math.max(st.coinsMax, r.coins);
  st.bestFloor = Math.max(st.bestFloor, reached);
  st.floorClear = Math.max(st.floorClear || 0, r.floorClear || 0);
  st.bestScore = Math.max(st.bestScore, sc);
  st.rooms += r.roomsCleared;
  // 按难度分开记一份：三层的最深和八层的最深不能混在一个数里比较
  const ds = diffStat(dm.k);
  ds.runs = (ds.runs || 0) + 1;
  if (win) ds.clears = (ds.clears || 0) + 1;
  ds.bestFloor = Math.max(ds.bestFloor || 0, reached);
  ds.bestScore = Math.max(ds.bestScore || 0, sc);
  const fresh = checkUnlocks();
  // 设定集和解锁一起结算：进度到了但没读过的东西，在这一刻补进档案
  for (const e of unlockCodexByProgress()) fresh.push({ id: 'codex:' + e.k, name: e.t, kind: '设定' });
  saveMeta();
  G.mode = win ? 'win' : 'dead';
  Audio2.music(win ? 'dawn' : 'none');
  document.body.classList.add('titlestate');
  showEnd(win, fresh);
}

function meets(u) {
  const s = G.meta.stats;
  if (!u) return true;
  if (u.type === 'floor') return (s.floorClear || 0) >= u.v;
  if (u.type === 'clear') return (s.clears || 0) >= u.v;
  if (u.type === 'mad') return (s.madClears || 0) >= u.v;
  if (u.type === 'boss') return (s.bossKills || 0) >= u.v;
  if (u.type === 'win') return (s.clears || 0) >= (u.v || 1);
  if (u.type === 'kills') return (s.kills || 0) >= u.v;
  if (u.type === 'deaths') return (s.deaths || 0) >= u.v;
  if (u.type === 'items') return (s.itemsMax || 0) >= u.v;
  if (u.type === 'coins') return (s.coinsMax || 0) >= u.v;
  return false;
}

function checkUnlocks() {
  const fresh = [];
  const add = (id, name, kind) => {
    if (!G.meta.unlock.includes(id)) { G.meta.unlock.push(id); fresh.push({ id, name, kind }); }
  };
  for (const f of FURS) if (meets(f.unlock)) add('fur:' + f.k, f.n, '毛色');
  for (const e of EYES) if (meets(e.unlock)) add('eye:' + e.k, e.n, '瞳色');
  for (const c of COSTUMES) if (meets(c.unlock)) add('cos:' + c.k, c.n, '造型');
  return fresh;
}

function unlockHint(u) {
  if (!u) return '';
  const map = {
    floor: (v) => `通过第 ${v} 层解锁`,
    clear: (v) => `通关一次解锁`,
    kills: (v) => `累计击杀 ${v} 解锁`,
    deaths: (v) => `累计死亡 ${v} 次解锁`,
    items: (v) => `单局捡到 ${v} 件造物解锁`,
    coins: (v) => `单局拿到 ${v} 银芯解锁`,
  };
  return map[u.type] ? map[u.type](u.v) : '';
}

// ------------------------------------------------------------------ 剧情
// 一条时间线：标题 →（开场）→ 一层 →（首领前 / 后）→ 二层 → …… → 结局。
// 场景是纯数据（js/binding-story.js），这里只做三件事：推进、打字、画背景。
// 剧情期间 G.mode='story'，update() 不跑，但 render() 不画房间——整块画布交给场景背景，
// 所以「对话」不是盖在游戏上的弹窗，而是真的换了一个地方。
function sceneArt(id, scene) {
  if (scene.art) return scene.art;
  const m = /^b(\d)/.exec(id);
  return m ? 'b' + m[1] : null;
}

function storySpeaker(line) {
  if (line.k === 'cat') return '弥萨格校猫';
  if (line.k === 'narr') return '旁白';
  if (line.k === 'voice') return line.who || '通讯器';
  if (line.k === 'boss') return line.who || '？？？';
  return line.who || '';
}

function playScene(id, onDone) {
  const scene = SCENES[id];
  if (!scene || !scene.lines || !scene.lines.length) { if (onDone) onDone(); return; }
  // 除结局外，看过的戏不重播（重开一局不该再看一遍同样的独白）。结局三个难度各一段，都叫 win*
  if (!/^win/.test(id) && G.meta.seen[id]) { if (onDone) onDone(); return; }
  G.meta.seen[id] = 1;
  saveMeta();
  G.story = { id, scene, i: 0, reveal: 0, onDone };
  G.mode = 'story';
  G.paused = false;
  hideOverlays();            // 开局时标题页还盖在上面，不清掉的话剧情在下面演
  document.body.classList.add('storymode');
  $('dlg').classList.add('on');
  $('dlg').className = 'dlg on k-' + (scene.lines[0].k || 'narr');
  $('stage').classList.add('storying');
  Audio2.music(scene.music || 'hall');
  Audio2.duck(true);
  const fresh = unlockCodexByProgress();
  if (fresh.length) toast('设定集解锁：' + fresh.map((e) => e.t).join('、'));
  renderStoryLine();
}

function renderStoryLine() {
  const st = G.story;
  if (!st) return;
  const line = st.scene.lines[st.i];
  const name = storySpeaker(line);
  $('dlgName').textContent = name;
  $('dlg').className = 'dlg on k-' + (line.k || 'narr');
  $('dlgText').textContent = '';
  st.full = line.t;
  st.reveal = 0;
  st.typed = 0;
  drawSpeaker(line);
}

function advanceStory() {
  const st = G.story;
  if (!st) return;
  const line = st.scene.lines[st.i];
  // 第一下先把这句话吐完，第二下才翻页——不然手快的人永远读不完
  if (st.reveal < st.full.length) { st.reveal = st.full.length; $('dlgText').textContent = st.full; return; }
  st.i += 1;
  if (st.i >= st.scene.lines.length) { endStory(); return; }
  renderStoryLine();
  Audio2.blip(520, 0.05, 'triangle', 0.02);
}

function endStory() {
  const st = G.story;
  G.story = null;
  $('dlg').classList.remove('on');
  $('stage').classList.remove('storying');
  document.body.classList.remove('storymode');
  Audio2.duck(false);
  const done = st && st.onDone;
  if (G.run && !G.run.dead) {
    G.mode = 'play';
    const F = FLOORS[G.run.floor];
    Audio2.music(G.run.room && G.run.room.type === 'boss' ? 'boss' : (F ? F.music : 'hall'));
  } else {
    G.mode = 'title';
    Audio2.music('title');
  }
  if (done) done();
}

// 一步推进打字机：每帧按字数补，遇到标点略停（读起来有呼吸）
let storyDrawElapsed = 0;
function tickStory(dt) {
  const st = G.story;
  if (!st) return;
  if (st.reveal < st.full.length) {
    const prev = Math.floor(st.reveal);
    st.reveal = Math.min(st.full.length, st.reveal + dt * 34);
    const now = Math.floor(st.reveal);
    if (now > prev) {
      $('dlgText').textContent = st.full.slice(0, now);
      const ch = st.full[now - 1];
      if (ch && '，。！？…—、'.includes(ch)) st.reveal += 3;
      if (now % 3 === 1) Audio2.type();
    }
  }
  // Story backgrounds use layered gradients and portraits; drawing them at 60+ FPS
  // after a boss defeat can saturate mobile GPUs despite no gameplay occurring.
  storyDrawElapsed += dt;
  if (storyDrawElapsed >= 1 / 20) { storyDrawElapsed = 0; drawStoryBg(); }
}

function drawStoryBg() {
  const cv = $('storyCv');
  if (!cv || !G.story) return;
  const dpr = Math.min(matchMedia('(pointer:coarse)').matches ? 1 : 1.5, window.devicePixelRatio || 1);
  const w = cv.clientWidth || stage.clientWidth;
  const h = cv.clientHeight || stage.clientHeight;
  const pw = Math.max(1, Math.round(w * dpr)), ph = Math.max(1, Math.round(h * dpr));
  if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sc = G.story.scene;
  drawScene(c, sc.bg, G.t, w, h);
  // 首领场：把真立绘摆在场景里，而不是只让旁白说「走廊尽头站着一个人」
  if (sc.fig) {
    const r = Math.min(w, h) * 0.155;
    const cx = w * 0.5, cy = h * 0.44 + Math.sin(G.t * 1.1) * r * 0.05;
    // 地面投影：不然圆框像贴纸一样浮在画面中间
    const sh = c.createRadialGradient(cx, cy + r * 1.5, 1, cx, cy + r * 1.5, r * 1.5);
    sh.addColorStop(0, 'rgba(0,0,0,.5)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh;
    c.beginPath(); c.ellipse(cx, cy + r * 1.5, r * 1.5, r * 0.28, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.6);
    g.addColorStop(0, 'rgba(255,120,110,.20)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(cx - r * 2.6, cy - r * 2.6, r * 5.2, r * 5.2);
    drawPortrait(c, { x: cx, y: cy, r, t: G.t, art: sc.fig, glow: 'rgba(255,110,100,.4)' });
  }
}

// 说话人立绘：猫用当前皮肤现画，首领用真立绘套圆框，通讯器画一条波形
function drawSpeaker(line) {
  const cv = $('spkCv');
  if (!cv) return;
  const on = line.k === 'cat' || line.k === 'boss' || line.k === 'voice';
  cv.style.display = on ? 'block' : 'none';
  if (!on) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = 92, h = 92;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(10,14,21,.72)';
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
  c.save();
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 3, 0, 7); c.clip();
  if (line.k === 'cat') {
    drawCat(c, {
      x: w / 2, y: h * 0.99, size: w * 0.98,
      fur: furObj(), eye: eyeObj(), costume: cosObj(), t: G.t, accs: accs(), blink: false,
    });
  } else if (line.k === 'boss') {
    const art = sceneArt(G.story.id, G.story.scene);
    if (art) drawPortrait(c, { x: w / 2, y: h / 2, r: w * 0.42, t: G.t, art, glow: 'rgba(255,120,110,.3)' });
  } else {
    // 通讯器：一圈跳动的波形
    c.strokeStyle = 'rgba(120,200,255,.9)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * w;
      const a = Math.sin(i * 0.7 + G.t * 6) * (h * 0.13) * (0.4 + 0.6 * Math.sin(i * 0.22 + G.t * 2));
      if (i === 0) c.moveTo(x, h / 2 + a); else c.lineTo(x, h / 2 + a);
    }
    c.stroke();
  }
  c.restore();
  c.strokeStyle = line.k === 'boss' ? 'rgba(232,105,95,.6)' : 'rgba(140,160,200,.45)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2.5, 0, 7); c.stroke();
}

// ------------------------------------------------------------------ 设定集
function unlockCodexByProgress() {
  const fresh = [];
  for (const e of WORLD) {
    if (G.meta.codex[e.k]) continue;
    if (!meets(e.unlock)) continue;
    G.meta.codex[e.k] = 1;
    fresh.push(e);
  }
  if (fresh.length) saveMeta();
  return fresh;
}

function codexHint(u) {
  if (!u) return '';
  const map = {
    floor: (v) => `通过第 ${v} 层`,
    clear: () => '通关一次',
    kills: (v) => `累计击杀 ${v}`,
    deaths: (v) => `累计死亡 ${v} 次`,
    items: (v) => `单局捡到 ${v} 件造物`,
    coins: (v) => `单局拿到 ${v} 银芯`,
    boss: (v) => `打倒第 ${v} 层首领`,
    win: () => '通关一次',
  };
  return map[u.type] ? map[u.type](u.v) : '';
}

function openCodex() {
  G.mode = 'codex';
  $('ovCodex').classList.add('on');
  renderCodex(G.ui.codexTab || 'world');
}

function closeCodex() {
  $('ovCodex').classList.remove('on');
  if (G.run && !G.run.dead) G.mode = 'play';
  else if (G.run) { G.mode = 'dead'; $('ovEnd').classList.add('on'); }
  else { G.mode = 'title'; $('ovTitle').classList.add('on'); }
}

const CAT_NAME = { world: '世界', place: '地点', folk: '人与势力', cat: '校猫' };

function renderCodex(tab) {
  G.ui.codexTab = tab;
  for (const b of $('codexTabs').children) b.classList.toggle('on', b.dataset.tab === tab);
  const host = $('codexList');
  const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
  if (tab === 'world') {
    let html = `<p class="codexcount">已收录 ${got} / ${WORLD.length} 条。往下走、打倒首领、通关，都会往这里添东西。</p>`;
    for (const e of WORLD) {
      const has = !!G.meta.codex[e.k];
      html += `<article class="entry${has ? '' : ' locked'}">
        <h4>${has ? e.t : '？？？'}<span>${has ? (e.en || '') : ''}</span></h4>
        <em>${CAT_NAME[e.cat] || '世界'}</em>
        <p>${has ? e.body.replace(/\n/g, '<br>') : '未解锁 · ' + (codexHint(e.unlock) || '继续探索')}</p>
      </article>`;
    }
    host.innerHTML = html;
  } else {
    const rows = [];
    for (const it of ITEMS) rows.push({ k: 'it:' + it.k, n: it.n, q: it.q, ic: ART_ICON(it.ic), lore: LORE[it.k], t: it.t, kind: '造物' });
    for (const tr of TRINKETS) rows.push({ k: 'tr:' + tr.k, n: tr.n, q: '密契', ic: ART_ICON_T(tr.ic), lore: LORE[tr.k], t: tr.t, kind: '密契' });
    for (const ac of ACTIVES) rows.push({ k: 'ac:' + ac.k, n: ac.n, q: '钥令', ic: ART_ACTIVE(ac.ic), lore: LORE[ac.k], t: ac.t, kind: '钥令' });
    const own = rows.filter((r) => G.meta.codex[r.k]).length;
    // 捡到过的排前面，没捡到的按原顺序跟在后面（V8 的 sort 稳定，不用另存索引）
    rows.sort((a, b) => (G.meta.codex[b.k] ? 1 : 0) - (G.meta.codex[a.k] ? 1 : 0));
    let html = `<p class="codexcount">已拾得 ${own} / ${rows.length} 件。捡到过的东西会留下档案——包括官方收藏馆里那句原话。</p>`;
    for (const r of rows) {
      const has = !!G.meta.codex[r.k];
      html += `<article class="entry${has ? '' : ' locked'}">
        <h4>${has ? r.n : '？？？'}<span>${has ? r.kind : ''}</span></h4>
        <div class="row">${r.ic ? `<img src="${r.ic}" alt="">` : ''}<div>
          <em>${has ? (r.lore || '—') : '未拾得 · ' + r.kind}</em>
          <p>${has ? r.t : '还没在下面捡到过这件东西。'}</p>
        </div></div>
      </article>`;
    }
    host.innerHTML = html;
  }
  host.scrollTop = 0;
}

// ------------------------------------------------------------------ UI
function hideOverlays() {
  for (const id of ['ovTitle', 'ovPause', 'ovEnd', 'ovMap', 'ovCodex']) $(id).classList.remove('on');
}
function refreshHud() {
  const r = G.run;
  if (!r) return;
  const p = r.p;
  // ---- 心：整颗 / 半颗 / 空心，用内联 SVG 画，缩放不糊
  const hearts = $('hearts');
  const full = Math.floor(p.hp / 2), half = p.hp % 2;
  const total = Math.ceil(p.maxHp / 2);
  let html = '';
  for (let i = 0; i < total; i++) {
    const kind = i < full ? 'full' : i === full && half ? 'half' : 'empty';
    html += `<svg class="hp ${kind}" viewBox="0 0 16 16" aria-hidden="true"><path class="bg" d="M8 14.2C1.4 9.6 0 5.1 3.3 3.2 5.3 2.1 7.3 3.2 8 4.6 8.7 3.2 10.7 2.1 12.7 3.2 16 5.1 14.6 9.6 8 14.2Z"/><path class="fg" d="M8 14.2C1.4 9.6 0 5.1 3.3 3.2 5.3 2.1 7.3 3.2 8 4.6 8.7 3.2 10.7 2.1 12.7 3.2 16 5.1 14.6 9.6 8 14.2Z"/></svg>`;
  }
  hearts.innerHTML = html;
  // 残血：让 HUD 上这几颗心自己跳起来（CSS 动画），和画布四边的红晕同一个节奏
  const hpRatio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
  hearts.classList.toggle('low', hpRatio <= 0.34);
  $('coinNum').textContent = r.coins;
  // ---- 造物条：一件一张小图，多了折行
  const strip = $('itemStrip');
  strip.innerHTML = r.items.map((k) => {
    const it = ITEMS.find((i) => i.k === k);
    return `<img src="${ART_ICON(it.ic)}" alt="${it.n}" title="${it.n}：${it.t}">`;
  }).join('');
  $('itemCount').textContent = r.items.length;
  // ---- 密契
  const tr = $('trinketSlot');
  if (r.trinket) {
    const t = TRINKETS.find((x) => x.k === r.trinket);
    tr.classList.add('on');
    tr.querySelector('img').src = ART_ICON_T(t.ic);
    tr.title = t.n + '：' + t.t;
  } else {
    tr.classList.remove('on');
    tr.removeAttribute('title');
  }
  // ---- 钥令
  const ab = $('activeBtn');
  if (r.active) {
    ab.classList.add('on');
    const a = ACTIVES.find((x) => x.k === r.active.k);
    ab.querySelector('img').src = ART_ACTIVE(a.ic);
    ab.title = a.n + '：' + a.t;
    ab.querySelector('.ch').textContent = r.active.cd > 0 ? Math.ceil(r.active.cd) + 's' : '就绪';
    ab.classList.toggle('ready', r.active.cd <= 0);
  } else ab.classList.remove('on');
  $('floorName').textContent = FLOORS[r.floor].n;
  $('scoreNum').textContent = r.score;
}

// 图标直取（ART 里全是 data URI，直接查表，不再造 Image 对象）
const ART_ICON = (ic) => ART.items[ic] || '';
const ART_ICON_T = (ic) => ART.trinkets[ic] || '';
const ART_ACTIVE = (ic) => ART.actives[ic] || '';

// 舞台顶上那句话：现在到底该干什么。
// 空房间里没有敌人、门又只是墙上的一个洞，第一次玩的人会就地站住——这句就是给这种情况的。
let goalSig = '';
function updateGoal() {
  const el = $('goal');
  if (!el) return;
  const r = G.run, rm = r && r.room;
  if (!r || !rm || G.mode !== 'play') { el.classList.add('off'); goalSig = ''; return; }
  el.classList.remove('off');
  let html;
  if (rm.boss && !rm.cleared) {
    html = '打倒 <b>' + rm.boss.n + '</b>';
  } else if (!rm.cleared) {
    const n = rm.ents.length;
    html = '清掉这间房的 <b>' + n + '</b> 个东西 · 清空才开门';
  } else if (rm.pickups.some((p) => p.kind === 'stair' && !p.taken)) {
    html = '踩上 <b>楼梯</b> 下一层';
  } else if (rm.pickups.some((p) => p.hpCost != null && !p.taken)) {
    html = '碰一下 <b>祭坛上的东西</b> · 代价是半颗心';
  } else if (Object.values(rm.doors).some(Boolean)) {
    html = '走进 <b>亮着的门</b>';
  } else {
    html = '';
  }
  if (html === goalSig) return;
  goalSig = html;
  el.innerHTML = html;
  el.classList.toggle('off', !html);
}

function banner(title, sub) {
  G.banner = { title, sub, t: 0, life: 2.6 };
}

let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1900);
}

// 拾取卡片：不暂停游戏（以撒也不停），但会挂 5 秒，够看清名字和效果
let cardT = 0;
function showItemCard(name, kind, text, src) {
  const el = $('itemCard');
  el.querySelector('img').src = src || '';
  el.querySelector('h4').textContent = name;
  el.querySelector('em').textContent = kind;
  el.querySelector('p').textContent = text;
  el.classList.add('on');
  clearTimeout(cardT);
  cardT = setTimeout(() => el.classList.remove('on'), 5200);
}


// ------------------------------------------------------------------ 小地图
function drawMapTo(canvas, S) {
  const r = G.run;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = canvas.getContext('2d');
  canvas.width = 9 * S * dpr;
  canvas.height = 9 * S * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, 9 * S, 9 * S);
  if (!r) return;
  const PAD = Math.max(1, S * 0.12);
  const w = S - PAD * 2;
  const cx = (cell) => cell.x * S + S / 2;
  const cy = (cell) => cell.y * S + S / 2;
  // 先画连通线，再画房间块，视觉上像一张地图
  c.strokeStyle = 'rgba(150,168,200,.35)';
  c.lineWidth = Math.max(1, S * 0.12);
  for (const cell of r.map.cells.values()) {
    if (!cell.visited) continue;
    for (const [d, dd] of Object.entries(DIRS)) {
      if (!cell.doors[d]) continue;
      const nx = cell.x + dd[0], ny = cell.y + dd[1];
      const other = r.map.cells.get(nx + ',' + ny);
      if (!other || !other.visited) continue;
      c.beginPath();
      c.moveTo(cx(cell), cy(cell));
      c.lineTo(cx(other), cy(other));
      c.stroke();
    }
  }
  // 与已探索房间相邻、但还没进去过的格子：只画一圈虚框，给个「往哪走」的线索。
  // 大地图上只有一格会很没用（二层开局就是这种情况），但也不该把整层布局白送。
  for (const cell of r.map.cells.values()) {
    if (cell.visited) continue;
    let near = false;
    for (const [d, dd] of Object.entries(DIRS)) {
      if (!cell.doors[d]) continue;
      const other = r.map.cells.get((cell.x + dd[0]) + ',' + (cell.y + dd[1]));
      if (other && other.visited) { near = true; break; }
    }
    if (!near) continue;
    const x = cell.x * S + PAD, y = cell.y * S + PAD;
    c.strokeStyle = 'rgba(150,168,200,.30)';
    c.lineWidth = Math.max(1, S * 0.08);
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, w, Math.max(2, S * 0.16));
    else c.rect(x, y, w, w);
    c.stroke();
  }
  for (const cell of r.map.cells.values()) {
    if (!cell.visited) continue;
    const x = cell.x * S + PAD, y = cell.y * S + PAD;
    let col = '#414d68';
    if (cell.type === 'boss') col = '#8c3038';
    else if (cell.type === 'item') col = '#8a6a2a';
    else if (cell.type === 'shop') col = '#2f6b4f';
    else if (cell.type === 'altar') col = '#6b3a7a';
    else if (cell.type === 'challenge') col = '#7d5426';
    else if (cell.cleared) col = '#44536e';
    c.fillStyle = col;
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, w, Math.max(2, S * 0.16));
    else c.rect(x, y, w, w);
    c.fill();
    if (cell === r.room) {
      c.strokeStyle = '#eef2ff';
      c.lineWidth = Math.max(1.4, S * 0.09);
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(255,255,255,.12)';
      c.lineWidth = 1;
      c.stroke();
    }
  }
}

function renderMinimap() {
  if (!G.run) return;
  drawMapTo($('mm'), 18);
  const big = $('bigmap');
  if (big) drawMapTo(big, 26);
}

// ------------------------------------------------------------------ 渲染
function render() {
  const dpr = G.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G.run || !G.run.room) return;
  const r = G.run, rm = r.room, p = r.p;
  const sh = G.shake;
  const sx = sh ? rnd(-sh, sh) : 0, sy = sh ? rnd(-sh, sh) : 0;
  ctx.setTransform(G.scale * dpr, 0, 0, G.scale * dpr, (G.ox + sx) * dpr, (G.oy + sy) * dpr);

  // 房间
  if (rm.baked) ctx.drawImage(rm.baked, 0, 0, G.W, G.H);
  drawDoorState(ctx, rm, G.W, G.H, G.t, rm.cleared, (dir) => {
    const dd = DIRS[dir];
    const nb = G.run.map && G.run.map.cells.get((rm.x + dd[0]) + ',' + (rm.y + dd[1]));
    return nb ? nb.type : null;
  });

  // 掉落
  for (const pk of rm.pickups) drawPickup(ctx, pk, G.t);

  // 敌人
  for (const e of rm.ents) drawEnemy(ctx, e, G.t);
  if (rm.boss) drawBoss(ctx, rm.boss, G.t);

  // 敌方弹幕
  for (const b of rm.eshot) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, Math.min(25, b.r * 2.4));
    g.addColorStop(0, 'rgba(255,140,140,.95)');
    g.addColorStop(0.5, 'rgba(235,70,70,.55)');
    g.addColorStop(1, 'rgba(235,70,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, Math.min(25, b.r * 2.4), 0, 7); ctx.fill();
    ctx.restore();
  }

  // 眼泪
  for (const s of rm.shots) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glowR = Math.max(2, Math.min(28, (Number(s.r) || 2) * 1.6));
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
    g.addColorStop(0, 'rgba(205,230,255,.62)');
    g.addColorStop(0.45, s.crit ? 'rgba(255,214,125,.42)' : 'rgba(115,175,245,.35)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, glowR, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 分身
  if (r.active && r.active.twinT > 0) {
    const tw = r.active.twin;
    drawCat(ctx, {
      x: tw.x, y: tw.y, size: 40, fur: furObj(), eye: eyeObj(), costume: cosObj(),
      t: G.t, ghost: true, accs: [],
    });
  }

  // 玩家
  drawCat(ctx, {
    x: p.x, y: p.y, size: 44, fur: furObj(), eye: eyeObj(), costume: cosObj(),
    t: G.t, moving: p.moving, accs: accs(), hurt: p.hurt, ghost: furObj().pat === 'ghost',
    blink: p.blink > 0,
    flip: Math.cos(p.aim) < -0.2 ? -1 : 1,
    dim: p.invuln > 0 && Math.floor(G.t * 20) % 2 === 0,
  });

  // 特效
  for (const f of G.fx) {
    const a = clamp(f.life * 3, 0, 1);
    if (f.kind === 'text') {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.c || '#fff';
      ctx.font = 'bold 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.txt, f.x, f.y);
      ctx.restore();
    } else if (f.kind === 'bolt') {
      // 雷光的每一折：一段发光直线，几帧就没了
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#cfe9ff';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(140,190,255,.5)';
      ctx.lineWidth = 5.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
      ctx.restore();
    } else if (f.kind === 'boom') {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const k = clamp(1 - f.life / 0.4, 0, 1);
      const boomR = Math.max(3, Math.min(110, (Number(f.s) || 12) * (0.4 + k)));
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, boomR);
      g.addColorStop(0, `rgba(255,220,150,${0.7 * (1 - k)})`);
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, boomR, 0, 7); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.c || (f.kind === 'crit' ? '#ffd98a' : '#bfe4ff');
      ctx.beginPath(); ctx.arc(f.x, f.y, f.s || 2, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  // 灯光：以猫为中心的一圈亮，其余压暗
  const lightR = 250 + (p.stats.vision || 0);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const lg = ctx.createRadialGradient(p.x, p.y, lightR * 0.45, p.x, p.y, lightR * 1.35);
  lg.addColorStop(0, 'rgba(4,6,10,0)');
  lg.addColorStop(0.6, 'rgba(4,6,10,.12)');
  lg.addColorStop(1, 'rgba(4,6,10,.46)');
  // 猫身上那盏灯照出的暖色，和冷色环境拉一点对比
  const warm = ctx.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y - 6, 120 + (p.stats.vision || 0) * 0.4);
  warm.addColorStop(0, 'rgba(255,190,110,.10)');
  warm.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(-40, -40, G.W + 80, G.H + 80);
  ctx.fillStyle = lg;
  ctx.fillRect(-40, -40, G.W + 80, G.H + 80);
  ctx.restore();

  // 残血：四边红晕随心跳一涨一落。血越少越急，和 HUD 上那颗抖的心是同一件事。
  // 压在光照之后才看得见（光照那层会把边缘压暗）。
  const hpRatio = p.maxHp > 0 ? p.hp / p.maxHp : 1;
  if (hpRatio <= 0.34) {
    const k = 1 - hpRatio / 0.34;                 // 0（刚到）/ 1（只剩半颗心）
    const beat = 0.5 + 0.5 * Math.sin(G.t * (5.4 + k * 3.2));
    const a = (0.16 + 0.30 * k) * (0.55 + 0.45 * beat);
    ctx.save();
    const vg = ctx.createRadialGradient(
      G.W / 2, G.H / 2, Math.min(G.W, G.H) * (0.30 - 0.06 * k),
      G.W / 2, G.H / 2, Math.max(G.W, G.H) * 0.72,
    );
    vg.addColorStop(0, 'rgba(150,10,16,0)');
    vg.addColorStop(0.55, `rgba(150,10,16,${a * 0.42})`);
    vg.addColorStop(1, `rgba(120,4,10,${a})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, G.W, G.H);
    // 最外一圈描边，缩到很小的时候也能看见
    ctx.strokeStyle = `rgba(255,60,60,${a * 0.9})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, G.W - 6, G.H - 6);
    ctx.restore();
  }

  // 首领血条
  if (rm.boss) {
    const b = rm.boss;
    const w = G.W * 0.56, h = 8;
    // 拾取卡片是压在画布底部的 DOM，卡片在的时候把血条抬上去，别让一张 5 秒的卡片糊住首领血量
    const cardUp = $('itemCard').classList.contains('on');
    const x = (G.W - w) / 2, y = G.H - (cardUp ? 96 : 34);
    const ratio = clamp(b.hp / b.maxHp, 0, 1);
    const dying = ratio <= 0.3;                    // 残血：整条换成跳动的亮红
    const beat = 0.5 + 0.5 * Math.sin(G.t * 7.5);
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,16,.85)';
    ctx.strokeStyle = dying
      ? `rgba(255,${Math.round(90 + 60 * beat)},${Math.round(84 + 40 * beat)},${0.7 + 0.3 * beat})`
      : 'rgba(200,210,235,.35)';
    ctx.lineWidth = dying ? 2 : 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 4);
    else ctx.rect(x - 2, y - 2, w + 4, h + 4);
    ctx.fill(); ctx.stroke();
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (dying) {
      g.addColorStop(0, '#ff2a20');
      g.addColorStop(1, '#ff6a52');
    } else {
      g.addColorStop(0, b.phase > 1 ? '#ff5a5a' : '#c94a52');
      g.addColorStop(1, b.phase > 1 ? '#ff9a5a' : '#8a2f3a');
    }
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * ratio, h);
    // 残血时在血条尾部画一段「快没了」的闪
    if (dying) {
      ctx.fillStyle = `rgba(255,240,220,${0.25 + 0.45 * beat})`;
      ctx.fillRect(x + w * ratio - 2, y, 2, h);
    }
    ctx.fillStyle = dying ? `rgba(255,210,200,${0.8 + 0.2 * beat})` : 'rgba(255,255,255,.85)';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.n + (dying ? '　' + Math.ceil(ratio * 100) + '%' : ''), G.W / 2, y - 6);
    ctx.restore();
  }

  // 楼层 / 首领横幅：进出房间的提示，2.6 秒淡出
  if (G.banner) {
    const b = G.banner;
    const k = b.t / b.life;
    const a = k < 0.12 ? k / 0.12 : k > 0.72 ? Math.max(0, (1 - k) / 0.28) : 1;
    const h = b.sub ? 66 : 46;
    ctx.save();
    ctx.globalAlpha = a;
    const bg = ctx.createLinearGradient(0, G.H * 0.16, 0, G.H * 0.16 + h);
    bg.addColorStop(0, 'rgba(6,9,14,0)');
    bg.addColorStop(0.35, 'rgba(6,9,14,.72)');
    bg.addColorStop(1, 'rgba(6,9,14,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, G.H * 0.16, G.W, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef2ff';
    ctx.font = 'bold 19px system-ui,-apple-system,sans-serif';
    ctx.fillText(b.title, G.W / 2, G.H * 0.16 + 28);
    if (b.sub) {
      ctx.fillStyle = '#9aa4bb';
      ctx.font = '12px system-ui,-apple-system,sans-serif';
      ctx.fillText(b.sub, G.W / 2, G.H * 0.16 + 47);
    }
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const furObj = () => FURS.find((f) => f.k === G.meta.fur) || FURS[0];
const eyeObj = () => EYES.find((e) => e.k === G.meta.eye) || EYES[0];
const cosObj = () => COSTUMES.find((c) => c.k === G.meta.costume) || COSTUMES[0];

// ------------------------------------------------------------------ 帧循环
let lastWorldRender = 0;
function loop(now) {
  const dt = G.lastTime ? Math.min(0.05, (now - G.lastTime) / 1000) : 0;
  G.lastTime = now;
  requestAnimationFrame(loop);
  try {
    if (G.mode === 'play' && !G.paused) update(dt);
    if (G.mode === 'story') tickStory(dt);
    // 剧情期间横幅的计时也要停：不然回到房间时提示已经过期了
    if (G.banner && G.mode !== 'story') {
      G.banner.t += dt;
      if (G.banner.t > G.banner.life) G.banner = null;
    }
    G.t += dt;
    if (G.mode === 'play' || G.mode === 'pause') {
      const minFrame = matchMedia('(pointer:coarse)').matches ? 1000 / 30 : 1000 / 50;
      if (!lastWorldRender || now - lastWorldRender >= minFrame) {
        render();
        lastWorldRender = now;
      }
    } else lastWorldRender = 0;
    if (G.mode === 'title') { drawTitleCat(now / 1000); drawBgCanvas(); }
    if (G.mode === 'codex') drawBgCanvas();
    if (G.mode === 'story') drawSpeakerTick();
    // 顶上那句目标，四分之一秒刷一次就够（内部还做了去重，不会每帧写 DOM）
    if (G.t - (G.goalT || 0) > 0.25) { G.goalT = G.t; updateGoal(); }
  } catch (err) {
    // 游戏循环里任何一帧出错都不该把整局冻住：记一次日志，下一帧照常跑
    if (!G.warned) {
      G.warned = true;
      console.error('[binding] frame error', err);
    }
  }
}

// 标题页背后的夜景（校舍 + 星 + 月）。只在标题/设定集时出，进游戏就藏起来，
// 不然一张全屏渐变天天在 60fps 重画是白烧电。
function drawBgCanvas() {
  const cv = G.bg.cv;
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || window.innerWidth;
  const h = cv.clientHeight || window.innerHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = G.bg.ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(c, 'title', G.t, w, h);
}

let spkFrame = 0;
// 头像里的通讯器波形 / 首领刻痕在动，每 3 帧重画一次就够顺
function drawSpeakerTick() {
  if (!G.story) return;
  if (spkFrame++ % 6) return;
  const line = G.story.scene.lines[G.story.i];
  if (line && (line.k === 'voice' || line.k === 'boss')) drawSpeaker(line);
}

// 标题页那只猫（慢慢呼吸、眨眼）
function drawTitleCat(t) {
  const c = G.ui.titleCanvas;
  if (!c) return;
  const x = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth || 220, h = c.clientHeight || 220;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  const blink = (t % 4.2) > 4.05;
  drawCat(x, {
    x: w / 2, y: h * 0.92, size: Math.min(w, h) * 0.82,
    fur: furObj(), eye: eyeObj(), costume: cosObj(), t, accs: [], blink,
  });
}

// ------------------------------------------------------------------ 事件绑定
function bindUi() {
  G.ui.titleCanvas = $('titleCat');

  // 选择器
  const mkChips = (hostId, list, curKey, onPick, kind) => {
    const host = $(hostId);
    host.innerHTML = '';
    for (const it of list) {
      const id = kind + ':' + it.k;
      const locked = !hasUnlock(id);
      const b = document.createElement('button');
      b.className = 'chip' + (curKey === it.k ? ' on' : '') + (locked ? ' locked' : '');
      b.innerHTML = `<span>${it.n}</span>${locked ? '<i>锁</i>' : ''}`;
      b.title = locked ? (it.hint || '') + ' · ' + unlockHint(it.unlock) : (it.hint || '');
      b.onclick = () => {
        if (locked) { toast(unlockHint(it.unlock)); return; }
        onPick(it.k);
        mkChips(hostId, list, it.k, onPick, kind);
        Audio2.blip(700, 0.05, 'triangle', 0.03);
      };
      host.appendChild(b);
    }
  };
  const refreshChips = () => {
    mkChips('furChips', FURS, G.meta.fur, (k) => { G.meta.fur = k; saveMeta(); }, 'fur');
    mkChips('eyeChips', EYES, G.meta.eye, (k) => { G.meta.eye = k; saveMeta(); }, 'eye');
    mkChips('cosChips', COSTUMES, G.meta.costume, (k) => { G.meta.costume = k; saveMeta(); }, 'cos');
  };
  G.ui.refreshChips = refreshChips;
  refreshChips();

  // 标题页那行成绩：分难度记的，换一档就得跟着换，不然会显示上一档的数字
  const renderBest = () => {
    const st = G.meta.stats;
    const dm = DIFFS.find((d) => d.k === G.meta.diff) || DIFFS[1];
    const ds = diffStat(dm.k);
    $('bestInfo').innerHTML = `<b class="dname">${dm.n}</b> · 最深 <b>${ds.bestFloor || 0}</b>/${dm.floors} 层 · 最高分 <b>${ds.bestScore || 0}</b> · 通关 <b>${ds.clears || 0}</b> 次`;
    const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
    $('codexInfo').textContent = `累计击杀 ${st.kills} · 设定集 ${got} / ${WORLD.length}`;
  };
  G.ui.renderBest = renderBest;

  // 难度：整局的地图和数值都跟着这一档走，所以放在最显眼的位置、开局前才改
  const renderDiff = () => {
    const host = $('diffChips');
    if (!host) return;
    host.innerHTML = '';
    for (const d of DIFFS) {
      const on = G.meta.diff === d.k;
      const b = document.createElement('button');
      b.className = 'diffchip' + (on ? ' on' : '');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.innerHTML = `<b>${d.n}</b><i>${d.floors} 层</i>`;
      b.onclick = () => {
        G.meta.diff = d.k;
        saveMeta();
        renderDiff();
        Audio2.blip(700, 0.06, 'triangle', 0.03);
      };
      host.appendChild(b);
    }
    const cur = DIFFS.find((d) => d.k === G.meta.diff) || DIFFS[1];
    const hint = $('diffHint');
    if (hint) hint.textContent = cur.hint;
    renderBest();
  };
  G.ui.renderDiff = renderDiff;
  renderDiff();

  $('btnStart').onclick = () => beginRun();
  $('btnHelp').onclick = () => $('ovHelp').classList.toggle('on');
  $('btnCodex').onclick = () => openCodex();
  $('btnPauseCodex').onclick = () => openCodex();
  $('btnCodexClose').onclick = () => closeCodex();
  for (const b of $('codexTabs').children) b.onclick = () => renderCodex(b.dataset.tab);
  $('dlgSkip').onclick = (e) => { e.stopPropagation(); endStory(); };
  $('btnPause').onclick = () => togglePause();
  $('btnPauseBack').onclick = () => { G.paused = false; hideOverlays(); G.mode = 'play'; Audio2.duck(false); };
  $('btnPauseRetry').onclick = () => { hideOverlays(); Audio2.duck(false); startRun(); };
  $('btnPauseQuit').onclick = () => { G.paused = false; hideOverlays(); Audio2.duck(false); toTitle(); };
  $('btnAgain').onclick = () => { hideOverlays(); beginRun(); };
  $('btnQuit').onclick = () => { hideOverlays(); toTitle(); };
  $('btnMap').onclick = () => { renderMinimap(); $('ovMap').classList.add('on'); };
  $('btnMapClose').onclick = () => $('ovMap').classList.remove('on');
  $('coinIcon').src = ART.coin;
  // 开局的按键说明：第一次玩的人要多看一会儿（连「清空才开门」也写在这），老手 7 秒就够
  setTimeout(() => $('hintBar').classList.add('off'), G.meta.seen.intro ? 7000 : 17000);
  $('activeBtn').onclick = () => useActive();
  // 自动攻击开关：状态存进档案，下次打开还是你上次选的
  const syncAuto = () => {
    const b = $('autoBtn');
    b.classList.toggle('on', !!G.meta.autoFire);
    b.setAttribute('aria-pressed', G.meta.autoFire ? 'true' : 'false');
  };
  G.ui.syncAuto = syncAuto;
  $('autoBtn').onclick = () => {
    G.meta.autoFire = !G.meta.autoFire;
    saveMeta();
    syncAuto();
    Audio2.blip(760, 0.06, 'triangle', 0.03);
    toast(G.meta.autoFire ? '自动攻击：开 · 猫自己瞄最近的，你只管走位' : '自动攻击：关 · 自己瞄准再开火');
  };
  syncAuto();
  $('muteBtn').onclick = () => {
    G.meta.muted = !G.meta.muted;
    saveMeta();
    Audio2.ensure();
    Audio2.setMuted(G.meta.muted);
    $('muteLabel').textContent = G.meta.muted ? '静音' : '音效';
    $('muteBtn').classList.toggle('off', G.meta.muted);
    toast(G.meta.muted ? '已静音' : '音效已开');
  };
  $('muteLabel').textContent = G.meta.muted ? '静音' : '音效';
  $('muteBtn').classList.toggle('off', G.meta.muted);

  // 对话层：点哪儿都行。手机上不用找按钮
  $('dlg').onclick = () => advanceStory();

  // 键盘
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    // 剧情期间只认「推进」和「跳过」，别让方向键偷偷控制房间里那只猫
    if (G.story) {
      if (e.code === 'Space' || e.code === 'Enter') advanceStory();
      else if (e.code === 'Escape') endStory();
      return;
    }
    G.keys[e.code] = true;
    if (e.code === 'Escape') togglePause();
    if (e.code === 'Space') useActive();
    if (e.code === 'KeyF') $('autoBtn').click();
    if (e.code === 'KeyM') $('btnMap').click();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; G.mouse.down = false; });

  // 鼠标（桌面瞄准 + 射击）
  cv.addEventListener('mousemove', (e) => {
    G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.active = true;
  });
  cv.addEventListener('mousedown', (e) => {
    if (G.mode !== 'play') return;
    G.mouse.down = true;
    G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.active = true;
    Audio2.ensure();
  });
  window.addEventListener('mouseup', () => { G.mouse.down = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // 触屏：左半屏移动、右半屏瞄准射击（双摇杆）
  const touchStart = (e) => {
    if (G.mode !== 'play') return;
    Audio2.ensure();
    for (const tch of e.changedTouches) {
      const rect = cv.getBoundingClientRect();
      const left = tch.clientX - rect.left < rect.width * 0.5;
      const stick = { id: tch.identifier, x0: tch.clientX, y0: tch.clientY, dx: 0, dy: 0, x: tch.clientX, y: tch.clientY };
      if (left && !G.touch.move) G.touch.move = stick;
      else if (!left && !G.touch.aim) G.touch.aim = stick;
    }
    e.preventDefault();
  };
  const touchMove = (e) => {
    for (const tch of e.changedTouches) {
      for (const key of ['move', 'aim']) {
        const s = G.touch[key];
        if (s && s.id === tch.identifier) {
          s.x = tch.clientX; s.y = tch.clientY;
          const dx = s.x - s.x0, dy = s.y - s.y0;
          const d = Math.hypot(dx, dy);
          const max = 52;
          const k = d > max ? max / d : 1;
          s.dx = (dx * k) / max; s.dy = (dy * k) / max;
        }
      }
    }
    e.preventDefault();
  };
  const touchEnd = (e) => {
    for (const tch of e.changedTouches) {
      for (const key of ['move', 'aim']) {
        const s = G.touch[key];
        if (s && s.id === tch.identifier) G.touch[key] = null;
      }
    }
    e.preventDefault();
  };
  cv.addEventListener('touchstart', touchStart, { passive: false });
  cv.addEventListener('touchmove', touchMove, { passive: false });
  cv.addEventListener('touchend', touchEnd, { passive: false });
  cv.addEventListener('touchcancel', touchEnd, { passive: false });

  window.addEventListener('resize', () => { if (G.mode === 'play') fit(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'play' && !G.paused) togglePause();
  });
}

function togglePause() {
  if (G.mode !== 'play') return;
  G.paused = !G.paused;
  if (G.paused) {
    $('ovPause').classList.add('on');
    Audio2.duck(true);
  } else {
    $('ovPause').classList.remove('on');
    Audio2.duck(false);
  }
}

function toTitle() {
  G.mode = 'title';
  G.paused = false;
  G.run = null;
  if (G.ui.renderDiff) G.ui.renderDiff();
  else if (G.ui.renderBest) G.ui.renderBest();
  G.ui.refreshChips();
  document.body.classList.add('titlestate');
  $('ovTitle').classList.add('on');
  $('ovEnd').classList.remove('on');
  Audio2.duck(false);
  Audio2.music('title');
}

// ------------------------------------------------------------------ 钥令
function useActive() {
  const r = G.run;
  if (!r || G.mode !== 'play') return;
  if (!r.active) return;
  if (r.active.cd > 0) { toast('还在冷却 ' + Math.ceil(r.active.cd) + 's'); return; }
  const p = r.p, rm = r.room;
  const a = ACTIVES.find((x) => x.k === r.active.k);
  if (r.active.k === 'dash') {
    const ang = aimAngle();
    const nx = clamp(p.x + Math.cos(ang) * 120, WALL + p.r, G.W - WALL - p.r);
    const ny = clamp(p.y + Math.sin(ang) * 120, WALL + p.r, G.H - WALL - p.r);
    for (let i = 0; i < 10; i++) {
      const k = i / 10;
      G.fx.push({ x: p.x + (nx - p.x) * k, y: p.y + (ny - p.y) * k, vx: 0, vy: 0, life: 0.3, kind: 'dot', c: '#8fb8ff', s: 3 });
    }
    p.x = nx; p.y = ny;
    p.invuln = Math.max(p.invuln, 0.5);
    Audio2.blip(900, 0.14, 'sine', 0.05, 0.4);
  } else if (r.active.k === 'nova') {
    for (const e of rm.ents.slice()) if (dist(e.x, e.y, p.x, p.y) < 130) hurtEnemy(e, 26, false, e.x - p.x, e.y - p.y);
    if (rm.boss && dist(rm.boss.x, rm.boss.y, p.x, p.y) < 160) hurtEnemy(rm.boss, 26, false, 0, 0);
    for (const b of rm.eshot.slice()) if (dist(b.x, b.y, p.x, p.y) < 130) { rm.eshot.splice(rm.eshot.indexOf(b), 1); }
    G.fx.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.45, kind: 'boom', s: 130 });
    G.shake = 12;
    Audio2.boom();
  } else if (r.active.k === 'twin') {
    r.active.twin = { x: p.x, y: p.y + 10 };
    r.active.twinT = 12;
    r.active.twinCd = 0;
    Audio2.item();
  } else if (r.active.k === 'slow') {
    r.active.slowT = 6;
    for (const e of rm.ents) e.cd += 0.4;
    toast('仲夏之梦：敌人慢下来了');
    Audio2.blip(420, 0.3, 'sine', 0.04, 0.7);
  } else if (r.active.k === 'shield') {
    // 免疫 3 秒 + 顺手把身边的弹幕擦掉。用来穿那种「一圈全是弹」的局面
    p.invuln = Math.max(p.invuln, 3);
    let cleared = 0;
    for (const b of rm.eshot.slice()) {
      if (dist(b.x, b.y, p.x, p.y) < 150) { rm.eshot.splice(rm.eshot.indexOf(b), 1); cleared++; }
    }
    G.fx.push({ x: p.x, y: p.y, life: 0.5, kind: 'boom', s: 110 });
    toast(cleared ? `注射守护：3 秒免伤，擦掉 ${cleared} 发` : '注射守护：3 秒免伤');
    Audio2.item();
  } else if (r.active.k === 'snipe') {
    const ang = aimAngle();
    rm.shots.push({
      x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * 980, vy: Math.sin(ang) * 980,
      r: 9, dmg: 40, life: 1.6, pierce: 99, crit: false, hit: [], t: 0,
    });
    G.shake = 11;
    Audio2.shoot();
    Audio2.boom();
  } else if (r.active.k === 'plague') {
    for (const e of rm.ents) e.psn = { t: 8, dps: 3, acc: 0 };
    if (rm.boss) rm.boss.psn = { t: 8, dps: 3, acc: 0 };
    toast('虚无瘟疫：8 秒内一直在掉血');
    Audio2.blip(300, 0.3, 'sawtooth', 0.03, 0.6);
  } else if (r.active.k === 'chain') {
    // 雷光在敌人之间跳：每次跳到最近的一个，跳过的不会再跳回去
    let from = { x: p.x, y: p.y };
    const jumped = new Set();
    for (let i = 0; i < 6; i++) {
      let best = null, bd = 250;
      for (const e of rm.ents.concat(rm.boss ? [rm.boss] : [])) {
        if (jumped.has(e)) continue;
        const d = dist(from.x, from.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      jumped.add(best);
      // 折几段画成一道闪电，直的拉一条线不好看
      const seg = 4;
      for (let k = 0; k < seg; k++) {
        const a0 = k / seg, a1 = (k + 1) / seg;
        G.fx.push({
          x: from.x + (best.x - from.x) * a0, y: from.y + (best.y - from.y) * a0,
          x2: from.x + (best.x - from.x) * a1 + rnd(-7, 7),
          y2: from.y + (best.y - from.y) * a1 + rnd(-7, 7),
          life: 0.24, kind: 'bolt',
        });
      }
      hurtEnemy(best, 14, false, 0, 0);
      from = { x: best.x, y: best.y };
    }
    G.shake = 8;
    Audio2.blip(1300, 0.18, 'sawtooth', 0.035, 0.45);
  } else if (r.active.k === 'draw') {
    const pool = ITEMS.filter((i) => !r.items.includes(i.k));
    const it = pickOne(pool.length ? pool : ITEMS);
    takeItem(it.k);
    toast('不平等交换：' + it.n);
  } else if (r.active.k === 'mend') {
    heal(4);
    G.fx.push({ x: p.x, y: p.y, life: 0.5, kind: 'boom', s: 70 });
    toast('泣血的圣心：回了 2 颗心');
    Audio2.item();
  }
  r.active.cd = a.cd;
  refreshHud();
}

// ------------------------------------------------------------------ 结束页
function showEnd(win, fresh) {
  const r = G.run;
  const st = G.meta.stats;
  const secs = Math.round((performance.now() - r.startTime) / 1000);
  const dm = diffOf();
  $('endTitle').textContent = win ? TEXT.winTitle : TEXT.deadTitle;
  $('endSub').textContent = win ? TEXT.winSub : pickOne(DEATHS);
  const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
  const rows = [
    ['难度', dm.n + ' · ' + dm.floors + ' 层'],
    ['到达', win ? floorCount() + ' 层全部打通' : FLOORS[r.floor].n],
    ['击杀', r.kills],
    ['造物', r.items.length + ' 件'],
    ['银芯', r.coins],
    ['分数', r.finalScore != null ? r.finalScore : r.score],
    ['设定集', got + ' / ' + WORLD.length],
  ];
  $('endStats').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  const un = $('endUnlock');
  if (fresh.length) {
    un.innerHTML = '<h4>解锁了新东西</h4>' + fresh.map((f) => `<p>${f.kind} · <b>${f.name}</b></p>`).join('');
    un.classList.add('on');
  } else un.classList.remove('on');
  $('ovEnd').classList.add('on');
}

// ------------------------------------------------------------------ 入口
async function boot() {
  await loadArt();
  G.cols = window.innerWidth / window.innerHeight < 0.95 ? 9 : 15;
  G.rows = G.cols === 9 ? 13 : 9;
  G.W = G.cols * T;
  G.H = G.rows * T;
  // 标题底图：一张全屏 canvas，只在标题/结算时画
  G.bg.cv = $('bgcv');
  if (G.bg.cv) G.bg.ctx = G.bg.cv.getContext('2d');
  Audio2.muted = !!G.meta.muted;
  // 开局先结算一次「不看剧情也该有的」条目：弥萨格、融蚀、银芯、小煤球（那个名号）
  unlockCodexByProgress();
  bindUi();
  fit();
  toTitle();
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.remove();
  requestAnimationFrame(loop);
  // 调试钩子：?_test=1 时暴露状态，方便无头浏览器验收
  if (location.search.includes('_test=1')) {
    window.__binding = {
      G, startRun, beginRun, room, ITEMS, FURS, EYES, COSTUMES, TRINKETS, ACTIVES, WORLD, SCENES,
      FLOORS, BOSSES, ENEMIES, TEXT, DIFFS, diffOf, floorCount,
      useActive, nextFloor, goNext, goRoom, takeItem, recalcStats, refreshHud, renderMinimap,
      playScene, advanceStory, endStory, openCodex, renderCodex, unlockCodexByProgress, Audio2, toTitle,
      makeFloor, buildRoom, aimAngle, wantShoot, tryPickup, onRoomClear, hurtPlayer, makeEnemy,
      drawCat, BUILDS, EYES,
    };
  }
}

boot();

// 登录了本站账号就把这个游戏的存档同步到云端（js/gamecloud.js）
startGameCloud('binding');
