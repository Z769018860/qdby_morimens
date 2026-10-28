// 《忘却协议》规则引擎：商店、布阵、波次战斗、经济结算。
//
// 结构上跟「幸存体幸存者」一样拆成「状态 + update(dt)」：渲染只是读 G 画出来，
// 所以整局可以在无头环境里用固定步长跑完（js/protocol.js 的 ?_test=1 入口），
// 平衡调参不用守着屏幕。
//
// 战斗是实时的，但只有一格一格的六边形站位：唤醒体站桩不移动，敌人从右边
// 走进来，被挡住就跟拦路的人对砍；走到底就扣协议核心的血。

import { UNITS, ART } from './gen.js';
import {
  COLS, ROWS, CELLS, HEX_W, BOARD_W, SPAWN_X, CORE_X, DEPLOY_COLS,
  cellXY, colOf, rowOf, cellOf, NEIGHBORS, STARS, MAX_STAR, MAX_LEVEL, LEVEL_COST, REROLL_COST,
  WAVE_GOLD, INTEREST_CAP, BENCH_SIZE, START_GOLD, START_LEVEL, shopOdds,
  TRAITS, TRAIT_BY_KEY, ENEMY, WAVES, waveHpMul, waveAtkMul, HEAL_PER_WAVE, creditsAt,
  TERRAIN, TERRAIN_PLAN, WHEELS, CREATIONS, ITEM_SLOTS, ITEM_REROLL, INV_SIZE,
  MERGE_REWARD, LEVEL_REWARD,
} from './defs.js';

export const UNITS_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u]));
export const ALL_IDS = UNITS.map((u) => u.id);

// ---------------------------------------------------------------- 随机
// 自带 PRNG：同一个种子能复现同一局，调平衡时才好比对两次改动。
let seed = 1;
export function setSeed(n) { seed = (n >>> 0) || 1; }
function rnd() {
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[(rnd() * arr.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------- 状态
export const G = {
  phase: 'idle',          // idle | prep | fight | over | win
  wave: 0,                // 已经打完的波次
  core: 20, coreMax: 20,
  gold: START_GOLD,
  level: START_LEVEL,
  units: [],              // 全部单位（场上 + 备战席）
  board: new Map(),       // cell → unit
  bench: [],              // BENCH_SIZE 长，元素是 unit 或 null
  shop: [],               // 5 个 { id } 或 null
  itemShop: [],           // ITEM_SLOTS 个 { kind, id } 或 null
  inv: [],                // 装备栏：{ kind:'wheel'|'creation', id }（最多 INV_SIZE）
  terrain: {},            // cell → 'high'|'altar'|'rift'|'rock'
  paths: {},              // row → 该通道的格路径（开战时算一次，地形不变就一直有效）
  plan: [],               // 下一波的出兵计划：{ key, row, t, slot }，备战期就定下来给界面看
  enemies: [],
  fx: [], floats: [], shots: [],
  t: 0, waveT: 0, shake: 0,
  spawnQ: [],
  bonus: null,            // 当前羁绊加成（开场算一次）
  traitCount: {},         // key → 上场人数
  stats: { kills: 0, leaks: 0, dmg: 0, best: 0, merged: 0, items: 0, fallback: 0 },
  msg: '',                // 顶部滚动提示（最近发生的事）
  sel: null,              // 选中的单位 uid（ui 用）
  selItem: null,          // 选中待装备的装备在 inv 里的下标（ui 用）
};

let uidSeq = 1;

// 调平衡用的总旋钮：波次表给的是"基准值"，这三个倍率是整局的粗细调。
// 无头机器人测平衡时直接改这三个数跑对照，不用反复改波次表。
export const TUNE = { hp: 1, atk: 1, spd: 1 };

export function reset(s) {
  setSeed(s >>> 0);
  G.phase = 'prep';
  G.wave = 0;
  G.core = G.coreMax = 20;
  G.gold = START_GOLD;
  G.level = START_LEVEL;
  G.units = [];
  G.board = new Map();
  G.bench = new Array(BENCH_SIZE).fill(null);
  G.enemies = [];
  G.fx = []; G.floats = []; G.shots = [];
  G.t = 0; G.waveT = 0; G.shake = 0;
  G.spawnQ = [];
  G.stats = { kills: 0, leaks: 0, dmg: 0, best: 0, merged: 0, items: 0, fallback: 0 };
  G.msg = '布阵，然后开战。';
  G.sel = null; G.selItem = null;
  uidSeq = 1;
  G.inv = [];
  G.terrain = rollTerrain();
  G.paths = {};
  G.plan = planWave(1);
  G.shop = [];
  rollShop(true);
  rollItemShop(true);
  recount();
}

// 地形：只在可部署的列里挑，数量固定（TERRAIN_PLAN），同一个种子每次一样，
// 所以「这一局的地形」是可复现的 —— 无头回归才有意义。
function rollTerrain() {
  const pool = [];
  for (let c = 0; c < CELLS; c++) if (colOf(c) < DEPLOY_COLS) pool.push(c);
  // 洗牌（用同一套 PRNG，但地形在战斗外生成，不影响局内随机序列太多）
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  const out = {};
  let k = 0;
  for (const [type, n] of TERRAIN_PLAN) {
    for (let i = 0; i < n && k < pool.length; i++) out[pool[k++]] = type;
  }
  return out;
}

// ---------------------------------------------------------------- 单位
function makeUnit(id) {
  const def = UNITS_BY_ID[id];
  const u = {
    uid: uidSeq++, id, def, star: 1,
    cell: -1, bench: -1,
    hp: 0, hpMax: 0, shield: 0,
    atk: 0, aspd: 0, armor: 0, range: 0,
    timer: 0, ult: 0, ultCd: 0,
    hasteT: 0, atkBuff: 0, atkBuffT: 0, guardT: 0,
    hurtT: 0, atkAnim: 0, target: null, alive: true,
    x: 0, y: 0,
    // 装备：命轮一个槽、造物一个槽；killStacks 是「红宝石胸针」的永久叠加
    wheel: null, creation: null, killStacks: 0,
    crit: 0, critDmg: 1.75, lifesteal: 0, dmgCutExtra: 0, ultGainMul: 1,
    regenT: 0, healFx: 0,
  };
  restat(u, true);
  return u;
}

function baseStats(u) {
  const d = u.def;
  const s = STARS[u.star];
  return {
    hp: d.hp * s, atk: d.atk * s, aspd: d.aspd,
    armor: d.armor * (1 + (u.star - 1) * 0.35),
    range: d.range * HEX_W,
  };
}

// 命轮 / 造物里带数字的部分，加上「红宝石胸针」的击杀叠加
function equipStats(u) {
  const out = {
    hp: 0, atk: 0, aspd: 0, armor: 0, crit: 0, critDmg: 0,
    lifesteal: 0, dmgCut: 0, rangeAdd: 0, ultGain: 0,
  };
  const w = u.wheel && u.wheel.stat;
  if (w) for (const k in out) if (w[k]) out[k] += w[k];
  const fx = u.creation && u.creation.fx;
  if (fx === 'critChain') out.crit += 0.18;
  if (fx === 'ultGain') out.ultGain += 0.7;
  if (u.killStacks) out.atk += 0.04 * u.killStacks;
  return out;
}

// 地形对站在这一格上的单位的影响
function terrainStats(u) {
  const t = u.cell >= 0 ? G.terrain[u.cell] : null;
  if (t === 'high') return { aspd: 0.10, rangeAdd: 0.6 };
  if (t === 'altar') return { ultGain: 0.7 };
  if (t === 'rift') return { atk: 0.18, dmgCut: -0.12 };
  return null;
}

// 重算属性并挂上当前羁绊/装备/地形。fresh=true 用于升星/换阵时回满血。
export function restat(u, fresh) {
  const b = baseStats(u);
  const bn = G.bonus || {};
  const eq = equipStats(u);
  const tr = terrainStats(u) || {};
  const isTank = u.def.role === 'tank';
  const isDps = u.def.role === 'dps';
  const isAeq = u.def.realm === 'aequor';
  let hp = b.hp * (1 + (isTank ? (bn.tankHp || 0) : 0) + eq.hp + (tr.hp || 0));
  let atk = b.atk * (1 + (isDps ? (bn.dpsAtk || 0) : 0) + (u.atkBuff || 0) + eq.atk + (tr.atk || 0));
  let aspd = b.aspd * (1 + (bn.aspd || 0) + (isAeq ? (bn.aequorAspd || 0) : 0)
    + (u.hasteT > 0 ? 0.35 : 0) + eq.aspd + (tr.aspd || 0));
  const ratio = u.hpMax > 0 ? u.hp / u.hpMax : 1;
  u.hpMax = Math.round(hp);
  u.hp = fresh ? u.hpMax : Math.round(u.hpMax * clamp(ratio, 0, 1));
  u.atk = atk;
  u.aspd = aspd;
  u.armor = b.armor + eq.armor;
  u.range = b.range + (eq.rangeAdd + (tr.rangeAdd || 0)) * HEX_W;
  u.crit = (bn.crit || 0) + eq.crit;
  u.critDmg = 1.75 + eq.critDmg;
  u.lifesteal = (bn.lifesteal || 0) + eq.lifesteal;
  u.dmgCutExtra = (bn.dmgCut || 0) + eq.dmgCut + (tr.dmgCut || 0);
  u.ultGainMul = 1 + eq.ultGain + (tr.ultGain || 0);
}

export function unitAt(cell) { return G.board.get(cell) || null; }
export function benchIndex(u) { return G.bench.indexOf(u); }
export function deployed() {
  let n = 0;
  for (const u of G.units) if (u.cell >= 0) n++;
  return n;
}

export function unitPos(u) {
  if (u.cell >= 0) return cellXY(u.cell);
  return { x: 0, y: 0 };
}

// ---------------------------------------------------------------- 商店
// 商店抽人。池子有 60 多名唤醒体，纯均匀抽的话「凑三个同名」几乎不可能，
// 所以给已经拥有的角色加一点权重（不是必出）—— 三合一才做得出来。
function rollOne() {
  const odds = shopOdds(G.level);
  let r = rnd() * 100;
  let cost = 1;
  for (let i = 0; i < odds.length; i++) {
    if (r < odds[i]) { cost = i + 1; break; }
    r -= odds[i];
  }
  const pool = UNITS.filter((u) => u.cost === cost);
  if (!pool.length) return pick(ALL_IDS);
  const own = {};
  for (const u of G.units) own[u.id] = (own[u.id] || 0) + 1;
  const ws = pool.map((u) => 1 + 3.2 * (own[u.id] || 0));
  let total = 0;
  for (const w of ws) total += w;
  let k = rnd() * total;
  for (let i = 0; i < pool.length; i++) {
    k -= ws[i];
    if (k <= 0) return pool[i].id;
  }
  return pool[pool.length - 1].id;
}

export function rollShop(free) {
  if (!free && G.gold < REROLL_COST) return false;
  if (!free) G.gold -= REROLL_COST;
  G.shop = [];
  for (let i = 0; i < 5; i++) G.shop.push({ id: rollOne() });
  return true;
}

// 买下商店第 i 格：先上场（没位置就进备战席），再检查三合一。
export function buy(i) {
  const slot = G.shop[i];
  if (!slot || G.phase === 'fight' || G.phase === 'over' || G.phase === 'win') return false;
  const def = UNITS_BY_ID[slot.id];
  if (G.gold < def.cost) { G.msg = '金币不够'; return false; }
  if (G.units.length >= BENCH_SIZE + CELLS) { G.msg = '没有空位了'; return false; }
  G.gold -= def.cost;
  G.shop[i] = null;
  const u = makeUnit(slot.id);
  const cell = freeCell(def.role);
  if (deployed() < G.level && cell >= 0) {
    u.cell = cell; u.bench = -1; G.board.set(cell, u);
  } else {
    const b = G.bench.indexOf(null);
    if (b < 0) { G.msg = '备战席满了'; G.gold += def.cost; G.shop[i] = slot; return false; }
    u.cell = -1; u.bench = b; G.bench[b] = u;
  }
  G.units.push(u);
  mergeAll(slot.id, 1);
  recount();
  return true;
}

// 找一个空位落人：先补齐还没人守的通道，再按职阶分前后
// （防御型往前压，伤害 / 辅助往后站）。自动落位和测试用的机器人共用这一套。
export function freeCell(role) {
  const wantFront = role === 'tank';
  const rowCount = new Array(ROWS).fill(0);
  for (const u of G.units) if (u.cell >= 0) rowCount[rowOf(u.cell)]++;
  let best = -1;
  let bestScore = -1e9;
  for (let c = 0; c < CELLS; c++) {
    const col = colOf(c);
    if (col >= DEPLOY_COLS || G.board.has(c)) continue;
    if (G.terrain[c] === 'rock') continue;
    const row = rowOf(c);
    let score = -rowCount[row] * 2.6;
    // 别把人堆在最前排：挡住的位置越靠前，后排的射程就越够不着，
    // 整场 DPS 只有名义值的四成。防御型压到第 3 列，输出 / 辅助留在前两列。
    score -= Math.abs(col - (wantFront ? DEPLOY_COLS - 2 : 0)) * 0.9;
    // 同一列里偏中间的格子更好看一点，顺手加一点点分
    score += (row === 1 || row === 2 ? 0.15 : 0);
    // 高台 / 祭坛留给远程和辅助（按职阶粗分，不追求最优解）
    const t = G.terrain[c];
    if (t === 'high' && role !== 'tank') score += 0.8;
    if (t === 'altar' && role === 'sup') score += 0.8;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function removeUnit(u) {
  const i = G.units.indexOf(u);
  if (i >= 0) G.units.splice(i, 1);
  if (u.cell >= 0) G.board.delete(u.cell);
  const b = G.bench.indexOf(u);
  if (b >= 0) G.bench[b] = null;
  u.cell = -1;
}

// 三合一：同 id 同星三只 → 合一只 +1 星，可以连锁（3★ 封顶）。
// 升星顺带给奖励：2 星送一件命轮，3 星送一件造物并白刷一次商店 ——
// 池子大了之后三合一变慢，这一条是让「攒同名」仍然值得的主要动力。
function mergeAll(id, star) {
  if (star >= MAX_STAR) return;
  const same = G.units.filter((u) => u.id === id && u.star === star);
  if (same.length < 3) return;
  // 优先保住场上那只，省得玩家摆好的位置飞了
  same.sort((a, b) => (b.cell >= 0 ? 1 : 0) - (a.cell >= 0 ? 1 : 0));
  const keep = same[0];
  for (const u of same.slice(1, 3)) removeUnit(u);
  keep.star++;
  restat(keep, true);
  const p = keep.cell >= 0 ? cellXY(keep.cell) : { x: BOARD_W / 2, y: 120 };
  addFx({ k: 'ring', x: p.x, y: p.y, d: 0.6, r: 40, col: '#e3b341' });
  addFloat(p.x, p.y - 60, '★'.repeat(keep.star), '#e3b341', 1.1);
  G.stats.merged++;

  const rw = MERGE_REWARD[keep.star] || { gold: 0 };
  let extra = '';
  if (rw.gold) G.gold += rw.gold;
  if (rw.wheel) extra = ' · ' + grantItem('wheel');
  if (rw.creation) extra = ' · ' + grantItem('creation');
  if (keep.star >= MAX_STAR) { rollShop(true); extra += ' · 商店已刷新'; }
  G.msg = `${keep.def.n} 升到 ${keep.star} 星${extra}`;
  if (keep.star < MAX_STAR) mergeAll(id, keep.star);
}

// 往装备栏里塞一件装备；满了就折成金币（不让人白高兴一场）
export function grantItem(kind) {
  const pool = kind === 'wheel' ? WHEELS : CREATIONS;
  const it = pool[(rnd() * pool.length) | 0];
  return addItem({ kind, id: it.id });
}

function addItem(it) {
  const label = itemName(it);
  if (G.inv.length >= INV_SIZE) {
    const gold = it.kind === 'wheel' ? 2 : 3;
    G.gold += gold;
    return `装备栏已满，${label} 折成 ${gold} 金`;
  }
  G.inv.push(it);
  G.stats.items++;
  return `获得${it.kind === 'wheel' ? '命轮' : '造物'}「${label}」`;
}

export function itemDef(it) {
  const pool = it.kind === 'wheel' ? WHEELS : CREATIONS;
  return pool.find((x) => x.id === it.id) || null;
}
function itemName(it) {
  const d = itemDef(it);
  return d ? d.n : it.id;
}

// ---------------------------------------------------------------- 装备商店
function rollItemOne() {
  // 命轮 / 造物 各半，按人口给一点高费倾向
  const kind = rnd() < 0.5 ? 'wheel' : 'creation';
  const pool = kind === 'wheel' ? WHEELS : CREATIONS;
  const hi = G.level >= 6 ? 0.55 : G.level >= 4 ? 0.35 : 0.18;
  const cheap = pool.filter((x) => x.cost <= 2);
  const rich = pool.filter((x) => x.cost > 2);
  const use = rich.length && rnd() < hi ? rich : cheap;
  return { kind, id: (use[(rnd() * use.length) | 0] || pool[0]).id };
}

export function rollItemShop(free) {
  if (!free && G.gold < ITEM_REROLL) return false;
  if (!free) G.gold -= ITEM_REROLL;
  G.itemShop = [];
  for (let i = 0; i < ITEM_SLOTS; i++) G.itemShop.push(rollItemOne());
  return true;
}

export function buyItem(i) {
  const it = G.itemShop[i];
  if (!it || G.phase === 'fight') return false;
  const d = itemDef(it);
  if (!d) return false;
  if (G.inv.length >= INV_SIZE) { G.msg = '装备栏满了，先给唤醒体装上'; return false; }
  if (G.gold < d.cost) { G.msg = '金币不够'; return false; }
  G.gold -= d.cost;
  G.itemShop[i] = null;
  G.inv.push({ kind: it.kind, id: it.id });
  G.stats.items++;
  G.msg = `买到${it.kind === 'wheel' ? '命轮' : '造物'}「${d.n}」`;
  return true;
}

// 把装备栏第 idx 件装到某个单位身上：同类型已经有就替换下来（旧的回装备栏）
export function equip(uid, idx) {
  const u = G.units.find((x) => x.uid === uid);
  const it = G.inv[idx];
  if (!u || !it || G.phase === 'fight') return false;
  const slot = it.kind === 'wheel' ? 'wheel' : 'creation';
  const old = u[slot];
  u[slot] = itemDef(it);
  G.inv.splice(idx, 1);
  if (old) G.inv.splice(idx, 0, { kind: slot, id: old.id });
  restat(u, false);
  recount();
  G.msg = `${u.def.n} 装上「${itemName(it)}」`;
  return true;
}

export function unequip(uid, kind) {
  const u = G.units.find((x) => x.uid === uid);
  if (!u || G.phase === 'fight') return false;
  const slot = kind === 'wheel' ? 'wheel' : 'creation';
  const cur = u[slot];
  if (!cur) return false;
  if (G.inv.length >= INV_SIZE) { G.msg = '装备栏满了'; return false; }
  G.inv.push({ kind: slot, id: cur.id });
  u[slot] = null;
  restat(u, false);
  recount();
  G.msg = `卸下「${cur.n}」`;
  return true;
}

export function sell(uid) {
  const u = G.units.find((x) => x.uid === uid);
  if (!u || G.phase === 'fight') return;
  const refund = u.def.cost * [0, 1, 3, 9][u.star];
  G.gold += refund;
  // 身上的装备退回装备栏（栏满就只能跟着人一起走了）
  for (const slot of ['wheel', 'creation']) {
    const it = u[slot];
    if (it && G.inv.length < INV_SIZE) G.inv.push({ kind: slot, id: it.id });
  }
  removeUnit(u);
  if (G.sel === uid) G.sel = null;
  recount();
  G.msg = `${u.def.n} 卖出 +${refund} 金`;
}

// 拖动/点选布阵：cell<0 表示放回备战席。
export function place(uid, cell) {
  const u = G.units.find((x) => x.uid === uid);
  if (!u || G.phase === 'fight') return false;
  if (cell < 0) {
    if (u.cell < 0) return false;
    const b = G.bench.indexOf(null);
    if (b < 0) return false;
    G.board.delete(u.cell);
    u.cell = -1; u.bench = b; G.bench[b] = u;
    recount();
    return true;
  }
  if (colOf(cell) >= DEPLOY_COLS) { G.msg = '这一列不归你'; return false; }
  if (G.terrain[cell] === 'rock') { G.msg = '岩壁立不上去，换一格'; return false; }
  const other = G.board.get(cell);
  if (other === u) return false;
  if (other) {
    // 交换：备战席 ↔ 场上也算
    const from = u.cell;
    G.board.delete(u.cell);
    G.board.set(cell, u);
    if (from >= 0) { G.board.set(from, other); other.cell = from; other.bench = -1; }
    else { const b = G.bench.indexOf(u); if (b >= 0) G.bench[b] = other; other.cell = -1; other.bench = b; }
    u.cell = cell; u.bench = -1;
    recount();
    return true;
  }
  if (u.cell < 0) {
    if (deployed() >= G.level) { G.msg = `人口上限 ${G.level}，先升级`; return false; }
    const b = G.bench.indexOf(u);
    if (b >= 0) G.bench[b] = null;
    u.cell = cell; u.bench = -1;
    G.board.set(cell, u);
  } else {
    G.board.delete(u.cell);
    u.cell = cell;
    G.board.set(cell, u);
  }
  recount();
  return true;
}

// 放到备战席的指定格（点某个备战席格子）。跟 place 的 -1 区别是「放哪一格你说了算」：
// 空槽就放进去，有人的槽就跟它换 —— 场上的换下来、备战席的顶上去，人数不变。
export function placeBench(uid, idx) {
  const u = G.units.find((x) => x.uid === uid);
  if (!u || G.phase === 'fight') return false;
  if (idx == null || idx < 0 || idx >= BENCH_SIZE) return false;
  const other = G.bench[idx];
  if (other === u) return false;
  const fromCell = u.cell;
  const fromBench = u.bench;
  if (!other) {
    if (fromCell >= 0) G.board.delete(fromCell);
    else if (fromBench >= 0) G.bench[fromBench] = null;
    else return false;
    u.cell = -1; u.bench = idx; G.bench[idx] = u;
    recount();
    return true;
  }
  // 互换：场上 ↔ 备战席不查人口（一上一下，人数不变）
  if (fromCell >= 0) {
    G.board.delete(fromCell);
    other.cell = fromCell; other.bench = -1;
    G.board.set(fromCell, other);
  } else if (fromBench >= 0) {
    G.bench[fromBench] = other;
    other.cell = -1; other.bench = fromBench;
  }
  u.cell = -1; u.bench = idx; G.bench[idx] = u;
  recount();
  return true;
}

export function levelUp() {
  if (G.phase === 'fight' || G.level >= MAX_LEVEL) return false;
  if (G.gold < LEVEL_COST) { G.msg = '金币不够'; return false; }
  G.gold -= LEVEL_COST;
  G.level++;
  // 升级奖励：返 1 金 + 商店与装备商店白刷一次（不是白送人，但等于省 3 金刷新费）
  G.gold += LEVEL_REWARD.gold;
  rollShop(true);
  rollItemShop(true);
  G.msg = `人口 ${G.level} · 商店已刷新`;
  return true;
}

// ---------------------------------------------------------------- 羁绊
// 只数「场上」的单位，且同名只算一次（跟自走棋一样，不能靠叠同一只刷羁绊）。
export function recount() {
  const seen = new Map();
  for (const u of G.units) {
    if (u.cell < 0) continue;
    const hit = seen.get(u.id) || null;
    if (!hit || hit.star < u.star) seen.set(u.id, u);
  }
  const cnt = {};
  for (const [id, u] of seen) {
    cnt[u.def.realm] = (cnt[u.def.realm] || 0) + 1;
    cnt[u.def.role] = (cnt[u.def.role] || 0) + 1;
  }
  G.traitCount = cnt;
  G.bonus = computeBonus(cnt);
  for (const u of G.units) restat(u, false);
  return cnt;
}

export function computeBonus(cnt) {
  const b = {
    lifesteal: 0, crit: 0, dmgCut: 0, aspd: 0, dpsAtk: 0, tankHp: 0, aequorAspd: 0,
  };
  const step = (key, vals) => {
    const t = TRAIT_BY_KEY[key];
    const n = cnt[key] || 0;
    let idx = -1;
    for (let i = 0; i < t.steps.length; i++) if (n >= t.steps[i]) idx = i;
    return idx < 0 ? 0 : vals[idx];
  };
  b.lifesteal = step('caro', [0.06, 0.10, 0.16]);
  b.aequorAspd = step('aequor', [0.14, 0.24, 0.38]);
  b.crit = step('chaos', [0.14, 0.24, 0.38]);
  b.dmgCut = step('ultra', [0.06, 0.10, 0.16]);
  b.dpsAtk = step('dps', [0.16, 0.30, 0.50]);
  b.tankHp = step('tank', [0.24, 0.44, 0.68]);
  b.aspd = step('sup', [0.08, 0.14, 0.22]);
  return b;
}

// 面板用：每个羁绊当前人数 + 已达档位 + 下一档还差几人
export function traitList() {
  return TRAITS.map((t) => {
    const n = G.traitCount[t.key] || 0;
    let active = -1;
    for (let i = 0; i < t.steps.length; i++) if (n >= t.steps[i]) active = i;
    const next = active + 1 < t.steps.length ? t.steps[active + 1] : null;
    return { key: t.key, n, active, next, def: t };
  }).filter((x) => x.n > 0);
}

// ---------------------------------------------------------------- 战斗
// ---------------------------------------------------------------- 来敌路线
// 影怪不再直线穿过棋盘：从右侧通道格进，沿着六边形格子一格一格走到最左列，
// 再往左走出棋盘去戳协议核心。岩壁这一格它们也过不去（BFS 自己绕路），
// 裂隙和高台会把它们拖慢 —— 地形对两边都有意义，不只是装饰。
export function pathFor(row) {
  const start = cellOf(COLS - 1, row);
  const prev = new Map([[start, -1]]);
  const q = [start];
  let goal = -1;
  while (q.length) {
    const cur = q.shift();
    if (colOf(cur) === 0) { goal = cur; break; }
    for (const nb of NEIGHBORS[cur]) {
      if (prev.has(nb)) continue;
      const t = TERRAIN[G.terrain[nb]];
      if (t && t.block) continue;
      prev.set(nb, cur);
      q.push(nb);
    }
  }
  const out = [];
  if (goal < 0) { out.push(start); return out; }   // 理论上到不了，兜底成原地
  for (let c = goal; c >= 0; c = prev.get(c)) out.unshift(c);
  return out;
}

export function lanePath(row) {
  if (!G.paths[row]) G.paths[row] = pathFor(row);
  return G.paths[row];
}

// 这一波从哪几条通道、按什么顺序来。备战期就先算好，界面才能在开战前
// 把「怪物意图」画出来（从哪条通道进、来的是什么、几只）。
export function planWave(w) {
  const cfg = WAVES[w - 1];
  if (!cfg) return [];
  const lanes = [0, 1, 2, 3];
  for (let i = lanes.length - 1; i > 0; i--) {
    const j = (rnd() * (i + 1)) | 0;
    const t = lanes[i]; lanes[i] = lanes[j]; lanes[j] = t;
  }
  const plan = [];
  let t = 0.35;
  let ri = 0;
  for (const [key, count, gap] of cfg.e) {
    for (let i = 0; i < count; i++) plan.push({ key, row: lanes[ri++ % lanes.length], t });
    t += gap;
  }
  plan.sort((a, b) => a.t - b.t);
  // 同一条通道的第几只：在格子宽度里错开站位，不至于几张贴纸完全叠在一起
  const n = {};
  for (const s of plan) { n[s.row] = (n[s.row] || 0) + 1; s.slot = (n[s.row] - 1) % 3; }
  return plan;
}

export function beginWave() {
  if (G.phase !== 'prep') return false;
  if (G.wave >= WAVES.length) return false;
  const w = G.wave + 1;
  const cfg = WAVES[w - 1];
  // 开场前重新算一遍羁绊：布阵变了，数值要跟着变
  recount();
  G.wave = w;
  G.phase = 'fight';
  G.waveT = 0;
  G.enemies = [];
  // 计划是备战期算好的（界面已经把它当「怪物意图」显示过），开战直接照单出兵
  G.spawnQ = (G.plan.length ? G.plan : planWave(w)).map((x) => ({ ...x }));
  for (const u of G.units) { u.timer = rnd() * 0.4; u.target = null; }
  G.msg = cfg.n;
  return true;
}

function spawn(e) {
  const def = ENEMY[e.key];
  const w = G.wave;
  const mod = G.mod || { hp: 1, atk: 1 };
  const hp = def.hp * waveHpMul(w) * mod.hp * TUNE.hp;
  // 出生在通道里，先走到入口格，然后沿格子一路往左
  const path = lanePath(e.row);
  const p0 = cellXY(path[0]);
  const laneOff = ((e.slot || 0) - 1) * 15;
  G.enemies.push({
    key: e.key, def, row: e.row, path, pi: 0, cell: -1, laneOff,
    x: SPAWN_X + 8 + rnd() * 34, y: p0.y + laneOff,
    hp, hpMax: hp, atk: def.atk * waveAtkMul(w) * mod.atk * TUNE.atk, spd: def.spd * TUNE.spd,
    timer: 0.4, stunT: 0, hurtT: 0, atkAnim: 0, target: null, wound: 0,
    size: def.big ? 1.35 : 1,
  });
}

function unitAttack(u, e) {
  const crit = rnd() < (u.crit || 0);
  const fx = u.creation ? u.creation.fx : null;
  let dmg = u.atk * (crit ? (u.critDmg || 1.75) : 1) * (0.92 + rnd() * 0.16);
  const mit = e.def.cls === 'Boss' ? 0.18 : e.def.cls === '精英' ? 0.12 : 0.05;
  dmg *= 1 - mit;
  if (e.wound) dmg *= 1 + 0.03 * e.wound;      // 锈蚀柳叶刀的创口
  e.hp -= dmg;
  e.hurtT = 0.16;
  G.stats.dmg += dmg;
  const p = cellXY(u.cell);
  if (u.range > HEX_W * 1.9) {
    G.shots.push({
      x: p.x, y: p.y - 46, tx: e.x, ty: e.y, t: 0, d: 0.14,
      col: u.def.role === 'sup' ? '#8bd450' : '#8fc4ff',
    });
  } else {
    addFx({ k: 'slash', x: e.x - 6, y: e.y - 10, d: 0.18, col: crit ? '#ffe066' : '#ffd9d0' });
  }
  addFloat(e.x, e.y - 26, Math.round(dmg), crit ? '#ffe066' : '#ffb0a6', crit ? 1.15 : 0.9);
  if (crit) spark(e.x, e.y - 18, '#ffe066', 4);
  if (u.lifesteal > 0) u.hp = Math.min(u.hpMax, u.hp + dmg * u.lifesteal);

  // ---- 造物：命中时的附加效果
  if (fx === 'trueDmg') {
    const extra = e.hp * 0.04 * (e.def.cls === 'Boss' ? 0.5 : 1);
    e.hp -= extra; G.stats.dmg += extra;
    addFloat(e.x + 14, e.y - 44, Math.round(extra), '#b06bd9', 0.8);
  }
  if (fx === 'doubleHit' && rnd() < 0.25) {
    const extra = dmg * 0.6;
    e.hp -= extra; G.stats.dmg += extra;
    addFloat(e.x - 14, e.y - 40, Math.round(extra), '#8ecbff', 0.85);
    spark(e.x, e.y - 20, '#8ecbff', 3);
  }
  if (fx === 'wound') e.wound = Math.min(8, (e.wound || 0) + 1);
  if (fx === 'critChain' && crit) u.ult = Math.min(100, u.ult + 10);

  if (e.hp <= 0) killEnemy(e, u);
  u.ult = Math.min(100, u.ult + 13 * (u.ultGainMul || 1));
  // 打击动画按攻速定长：攻速高的时候压缩播放时间，保证每一帧都能走完
  // （固定 0.42 秒的话，攻速上了 2.4 就会被下一次攻击打断，动图永远只播个头）
  u.atkDur = Math.min(0.42, 0.9 / Math.max(0.7, u.aspd));
  u.atkAnim = u.atkDur;
}

// 命中火花：一次撒几粒，比一圈光环更「有手感」
function spark(x, y, col, n) {
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.284;
    const v = 40 + rnd() * 90;
    G.fx.push({
      k: 'spark', x, y, t: 0, d: 0.3 + rnd() * 0.2, col,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, r: 1.2 + rnd() * 1.4,
    });
  }
}

function killEnemy(e, by) {
  const i = G.enemies.indexOf(e);
  if (i >= 0) G.enemies.splice(i, 1);
  G.stats.kills++;
  addFx({ k: 'ring', x: e.x, y: e.y - 6, d: 0.42, r: 18 + e.size * 16, col: '#b06bd9' });
  spark(e.x, e.y - 20, '#c98cf0', 5);
  if (by) {
    const fx = by.creation ? by.creation.fx : null;
    if (fx === 'killAtk' && by.killStacks < 10) { by.killStacks++; restat(by, false); }
    if (by.wheel && by.wheel.stat && by.wheel.stat.killHeal) {
      by.hp = Math.min(by.hpMax, by.hp + by.hpMax * by.wheel.stat.killHeal);
    }
    if (fx === 'teamHeal') {
      for (const a of G.units) {
        if (a.cell < 0 || a.hp <= 0) continue;
        a.hp = Math.min(a.hpMax, a.hp + a.hpMax * 0.03);
      }
    }
  }
}

// 相邻（一格内）有没有别的友军 —— 守护之手的判定
function hasAllyNear(u) {
  const p = cellXY(u.cell);
  for (const a of G.units) {
    if (a === u || a.cell < 0 || a.hp <= 0) continue;
    const q = cellXY(a.cell);
    if (Math.hypot(q.x - p.x, q.y - p.y) < HEX_W * 1.15) return true;
  }
  return false;
}

function damageUnit(u, raw, src) {
  if (u.hp <= 0) return;
  let cut = 1 - (u.dmgCutExtra || 0);
  if (u.creation && u.creation.fx === 'bulwark' && hasAllyNear(u)) cut *= 0.88;
  let dmg = raw * cut * (70 / (70 + u.armor));
  if (u.shield > 0) {
    const use = Math.min(u.shield, dmg);
    u.shield -= use; dmg -= use;
  }
  u.hp -= dmg;
  u.hurtT = 0.18;
  u.ult = Math.min(100, u.ult + 7 * (u.ultGainMul || 1));
  const p = cellXY(u.cell);
  addFloat(p.x + (rnd() - 0.5) * 12, p.y - 60, Math.round(dmg), '#ff8a7a', 0.85);
  if (u.creation && u.creation.fx === 'thorns' && src && src.hp > 0) {
    src.hp -= dmg * 0.3;
    addFloat(src.x, src.y - 34, Math.round(dmg * 0.3), '#8bd450', 0.75);
    if (src.hp <= 0) killEnemy(src, u);
  }
  if (u.hp <= 0) {
    u.hp = 0;
    addFx({ k: 'ring', x: p.x, y: p.y - 30, d: 0.5, r: 46, col: '#e8695f' });
    spark(p.x, p.y - 40, '#e8695f', 6);
  }
}

// ---------------------------------------------------------------- 大招
function castUlt(u) {
  const p = cellXY(u.cell);
  const ult = u.def.ult;
  const allies = G.units.filter((x) => x.cell >= 0 && x.hp > 0);
  const near = G.enemies
    .map((e) => ({ e, d: Math.hypot(e.x - p.x, e.y - p.y) }))
    .sort((a, b) => a.d - b.d);
  u.ult = 0;
  // 放大招也播一遍打击动图：这一下是全场最该看到动作的时刻
  u.atkDur = 0.56;
  u.atkAnim = 0.56;
  addFx({ k: 'ring', x: p.x, y: p.y - 24, d: 0.5, r: 52, col: '#ffe066' });
  G.shake = Math.max(G.shake || 0, u.def.cost >= 3 ? 4.5 : 2.2);
  G.ultSeq = (G.ultSeq || 0) + 1;
  G.lastUlt = { n: u.def.n, name: ult.name, t: 0, seq: G.ultSeq };
  G.msg = `${u.def.n} 施放「${ult.name}」`;
  // 彩蛋时间：大招伤害 +35%
  const uMul = u.creation && u.creation.fx === 'ultPower' ? 1.35 : 1;
  // 定向罗盘：友军放大招时，其它带罗盘的友军回狂气
  for (const a of allies) {
    if (a !== u && a.creation && a.creation.fx === 'ultEcho') {
      a.ult = Math.min(100, a.ult + 12 * (a.ultGainMul || 1));
    }
  }
  if (ult.kind === 'nuke') {
    const tgt = near[0] ? near[0].e : null;
    if (tgt) {
      let mul = 3.2;
      if (u.id === 'soleil') mul += 0.8 * (1 - tgt.hp / tgt.hpMax);
      const dmg = u.atk * mul * uMul;
      tgt.hp -= dmg;
      tgt.hurtT = 0.3;
      G.stats.dmg += dmg;
      addFloat(tgt.x, tgt.y - 40, Math.round(dmg), '#ffe066', 1.5);
      addFx({ k: 'ring', x: tgt.x, y: tgt.y - 10, d: 0.4, r: 46, col: '#ffe066' });
      if (tgt.hp <= 0) killEnemy(tgt, u);
    }
  } else if (ult.kind === 'splash') {
    const tgt = near[0] ? near[0].e : null;
    const cx = tgt ? tgt.x : p.x + HEX_W * 2;
    const cy = tgt ? tgt.y : p.y;
    const R = HEX_W * 1.7;
    for (const e of [...G.enemies]) {
      if (Math.hypot(e.x - cx, e.y - cy) <= R) {
        const dmg = u.atk * 2.1 * uMul;
        e.hp -= dmg; e.hurtT = 0.24;
        G.stats.dmg += dmg;
        addFloat(e.x, e.y - 30, Math.round(dmg), '#ffd166', 1.1);
        if (e.hp <= 0) killEnemy(e, u);
      }
    }
    addFx({ k: 'ring', x: cx, y: cy - 10, d: 0.5, r: R, col: u.def.role === 'dps' ? '#ff8a5c' : '#b06bd9' });
  } else if (ult.kind === 'heal') {
    const low = allies.slice().sort((a, b) => a.hp / a.hpMax - b.hp / b.hpMax);
    const one = u.id === 'celeste' ? allies : low.slice(0, 1);
    for (const a of one) {
      const heal = a.hpMax * (u.id === 'celeste' ? 0.16 : 0.3) + u.atk * 1.6;
      a.hp = Math.min(a.hpMax, a.hp + heal);
      const q = cellXY(a.cell);
      addFloat(q.x, q.y - 66, '+' + Math.round(heal), '#8bd450', 1.0);
      addFx({ k: 'ring', x: q.x, y: q.y - 26, d: 0.45, r: 34, col: '#8bd450' });
      if (u.id === 'raya') { a.atkBuff = 0.2; a.atkBuffT = 6; restat(a, false); }
    }
  } else if (ult.kind === 'guard') {
    const targets = [u].concat(allies.filter((a) => a !== u && Math.hypot(cellXY(a.cell).x - p.x, cellXY(a.cell).y - p.y) < HEX_W * 2.4).slice(0, 1));
    for (const a of targets) {
      a.shield = Math.max(a.shield, a.hpMax * 0.3);
      const q = cellXY(a.cell);
      addFx({ k: 'ring', x: q.x, y: q.y - 24, d: 0.45, r: 40, col: '#7fb3ff' });
      addFloat(q.x, q.y - 62, '护盾', '#7fb3ff', 0.95);
    }
  } else if (ult.kind === 'haste') {
    for (const a of allies) { a.hasteT = 6; restat(a, false); }
    addFx({ k: 'ring', x: p.x, y: p.y - 24, d: 0.7, r: 90, col: '#8bd450' });
    addFloat(p.x, p.y - 74, '攻速 +35%', '#8bd450', 1.1);
  } else if (ult.kind === 'stun') {
    const R = HEX_W * 1.9;
    for (const e of [...G.enemies]) {
      if (Math.hypot(e.x - p.x, e.y - p.y) <= R) {
        e.stunT = Math.max(e.stunT, 1.8);
        const dmg = u.atk * 1.1 * uMul;
        e.hp -= dmg; e.hurtT = 0.2;
        G.stats.dmg += dmg;
        addFloat(e.x, e.y - 30, Math.round(dmg), '#8ecbff', 1.0);
        if (e.hp <= 0) killEnemy(e, u);
      }
    }
    addFx({ k: 'ring', x: p.x, y: p.y - 10, d: 0.55, r: R, col: '#8ecbff' });
  }
}

// ---------------------------------------------------------------- 特效队列
function addFx(o) { o.t = 0; G.fx.push(o); }
function addFloat(x, y, txt, col, size) {
  G.floats.push({ x, y, txt: String(txt), col, size: size || 1, t: 0, d: 0.75, vy: -34 });
}

// ---------------------------------------------------------------- 主更新
export function update(dt) {
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);
  if (G.lastUlt) { G.lastUlt.t += dt; if (G.lastUlt.t > 1.6) G.lastUlt = null; }
  if (G.phase !== 'fight') {
    // 备战期也让特效收尾，画面不会突然定住。
    // 出手/挨打的计时器同样要往下走：不然打完一波还停在打击帧上摆着，
    // 像所有人都僵在半空 —— 这是「战斗结束还在保持战斗立绘」的原因。
    for (const u of G.units) {
      if (u.atkAnim > 0) u.atkAnim = Math.max(0, u.atkAnim - dt);
      if (u.hurtT > 0) u.hurtT = Math.max(0, u.hurtT - dt);
      u.target = null;
    }
    tickFx(dt);
    return;
  }
  G.t += dt;
  G.waveT += dt;

  // 出兵
  while (G.spawnQ.length && G.spawnQ[0].t <= G.waveT) spawn(G.spawnQ.shift());

  // 单位
  for (const u of G.units) {
    if (u.cell < 0) continue;
    if (u.hasteT > 0) { u.hasteT -= dt; if (u.hasteT <= 0) restat(u, false); }
    if (u.atkBuffT > 0) { u.atkBuffT -= dt; if (u.atkBuffT <= 0) { u.atkBuff = 0; restat(u, false); } }
    if (u.hurtT > 0) u.hurtT -= dt;
    if (u.atkAnim > 0) u.atkAnim -= dt;
    if (u.hp <= 0) continue;
    u.ult = Math.min(100, u.ult + dt * 4.2 * (u.ultGainMul || 1));
    // 日月轮盘：战斗中每 8 秒回 8% 生命
    if (u.creation && u.creation.fx === 'regen') {
      u.regenT += dt;
      if (u.regenT >= 8 && u.hp < u.hpMax) {
        u.regenT = 0;
        const heal = u.hpMax * 0.08;
        u.hp = Math.min(u.hpMax, u.hp + heal);
        const q = cellXY(u.cell);
        addFloat(q.x, q.y - 66, '+' + Math.round(heal), '#8bd450', 0.95);
        addFx({ k: 'ring', x: q.x, y: q.y - 26, d: 0.4, r: 26, col: '#8bd450' });
      }
    }
    if (u.ult >= 100) castUlt(u);

    // 找目标：射程内最近的敌人。
    // 命中点统一取「敌人脚下往上 20」——判定阻挡用的也是这个点，
    // 两边口径不一致会出现「挡住了但打不着」的死锁（怪停在 116px，
    // 近战射程只有 108px，两边都动不了，波次永远清不掉）。
    const p = cellXY(u.cell);
    let best = null;
    let bd = u.range;
    for (const e of G.enemies) {
      const d = Math.hypot(e.x - p.x, e.y - 20 - p.y);
      if (d <= bd) { bd = d; best = e; }
    }
    u.target = best;
    u.timer -= dt;
    if (best && u.timer <= 0) {
      u.timer = 1 / Math.max(0.25, u.aspd);
      unitAttack(u, best);
    }
  }

  // 敌人：沿格子路径推进。不再「无视棋盘直线往左飘」——
  // 每一只都走在自己的通道路径上，路径的下一格站着人就被挡住，开打。
  for (const e of [...G.enemies]) {
    if (e.hurtT > 0) e.hurtT -= dt;
    if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.stunT > 0) { e.stunT -= dt; continue; }

    const nextCell = e.pi < e.path.length ? e.path[e.pi] : -1;
    const blocker = nextCell >= 0 ? G.board.get(nextCell) : null;
    if (blocker && blocker.hp > 0) {
      e.target = blocker;
      e.timer -= dt;
      if (e.timer <= 0) {
        e.timer = 1.05;
        e.atkAnim = 0.3;
        damageUnit(blocker, e.atk * (0.92 + rnd() * 0.16), e);
      }
      continue;                        // 停在原地打，不硬挤过这一格
    }
    e.target = null;

    // 目标点：下一格中心；走完最后一格就朝棋盘左侧外面去（那里是协议核心）
    const last = cellXY(e.path[e.path.length - 1]);
    const gp = nextCell >= 0 ? cellXY(nextCell) : { x: CORE_X + 26, y: last.y };
    const ty = gp.y + (e.laneOff || 0);
    const dx = gp.x - e.x;
    const dy = ty - e.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      if (nextCell >= 0) { e.cell = nextCell; e.pi++; }
      else {
        // 漏怪：扣协议核心
        G.core -= e.def.leak;
        G.stats.leaks++;
        const i = G.enemies.indexOf(e);
        if (i >= 0) G.enemies.splice(i, 1);
        addFloat(CORE_X + 30, e.y - 24, '-' + e.def.leak, '#e8695f', 1.2);
        if (G.core <= 0) { G.core = 0; G.phase = 'over'; }
      }
      continue;
    }
    // 走进裂隙 / 高台要减速（岩壁不会出现在路径里，BFS 已经绕开了）
    const terr = nextCell >= 0 ? TERRAIN[G.terrain[nextCell]] : null;
    const slow = terr && terr.eslow != null ? Math.max(0.25, terr.eslow) : 1;
    const stepLen = e.spd * slow * dt;
    if (stepLen >= dist) { e.x = gp.x; e.y = ty; }
    else { e.x += (dx / dist) * stepLen; e.y += (dy / dist) * stepLen; }
  }

  tickFx(dt);

  // 兜底：一波打超过 90 秒说明有东西卡住了（历史上是判定半径不一致导致
  // 「怪挡住了但打不着」）。宁可少打一会儿也不要卡死，直接把残兵清掉推进波次。
  if (G.waveT > 90 && (G.enemies.length || G.spawnQ.length)) {
    for (const e of [...G.enemies]) {
      G.stats.kills++;
      G.enemies.splice(G.enemies.indexOf(e), 1);
    }
    G.spawnQ = [];
    G.stats.fallback = (G.stats.fallback || 0) + 1;
    G.msg = '残余影怪退去了';
  }

  // 清波
  if (G.phase === 'fight' && !G.spawnQ.length && !G.enemies.length) clearWave();
}

function tickFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.t += dt;
    if (f.t >= f.d) G.fx.splice(i, 1);
  }
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.t += dt;
    if (s.t >= s.d) G.shots.splice(i, 1);
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    const f = G.floats[i];
    f.t += dt;
    f.y += f.vy * dt;
    f.vy *= 0.94;
    if (f.t >= f.d) G.floats.splice(i, 1);
  }
}

function clearWave() {
  G.gold += WAVE_GOLD + Math.min(INTEREST_CAP, Math.floor(G.gold / 10));
  for (const u of G.units) {
    u.hp = Math.min(u.hpMax, u.hp + u.hpMax * HEAL_PER_WAVE);
    // 收招：下一波之前所有人回到待机，别顶着打击帧站一整段备战期
    u.atkAnim = 0; u.hurtT = 0; u.target = null; u.timer = 0;
  }
  if (G.wave >= WAVES.length) {
    G.phase = 'win';
  } else {
    G.phase = 'prep';
    G.plan = planWave(G.wave + 1);
    G.msg = `第 ${G.wave} 波清完，下一波：${WAVES[G.wave].n}`;
    rollShop(true);
    rollItemShop(true);
  }
  recount();
}

// ---------------------------------------------------------------- 结算
export function summary() {
  // 打完的波数：战斗中和倒在当波都不算这一波打完
  const inWave = G.phase === 'fight' || G.phase === 'over';
  const cleared = G.phase === 'win' ? WAVES.length : Math.max(0, G.wave - (inWave ? 1 : 0));
  const starSum = G.units.reduce((a, u) => a + u.star, 0);
  const eqSum = G.units.reduce((a, u) => a + (u.wheel ? 1 : 0) + (u.creation ? 1 : 0), 0)
    + G.inv.length;
  const score = Math.round(
    cleared * 420 + G.core * 55 + G.gold * 9 + starSum * 24 + G.stats.kills * 3 + eqSum * 40,
  );
  return {
    cleared: Math.max(0, cleared),
    total: WAVES.length,
    core: G.core,
    coreMax: G.coreMax,
    gold: G.gold,
    level: G.level,
    units: G.units.length,
    kills: G.stats.kills,
    leaks: G.stats.leaks,
    dmg: Math.round(G.stats.dmg),
    stars: starSum,
    merged: G.stats.merged,
    equips: eqSum,
    fallback: G.stats.fallback || 0,
    score,
    credits: creditsAt(score),
    win: G.phase === 'win',
    phase: G.phase,
  };
}

// 供面板/渲染使用：当前这一波还剩几只（含未出场的）
export function waveLeft() {
  return G.enemies.length + G.spawnQ.length;
}
