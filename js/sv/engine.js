// 《唤醒体幸存者》引擎：状态、刷新、战斗、掉落、升级结算。
//
// 分工：本文件只管「世界里发生了什么」，绘制在 render.js，界面在 ui.js。
// 坐标用一个固定的世界单位（视口高度固定 620 世界单位，见 camera），
// 这样手机竖屏和桌面宽屏看到的身位比例一致，不会出现「手机上被贴脸打死」。
//
// 性能上的三条硬约束（手机上要稳 60 帧）：
//   1. 敌人、子弹、粒子全部用对象池，跑起来不再 new；
//   2. 敌人碰撞用网格哈希，O(n) 而不是 O(n²)；
//   3. 每帧最多 300 个敌人、700 发子弹，超了就不再刷（宁可少刷也不掉帧）。

import {
  PROTOS, LV, CREATION_FX, CREATION_STACK, WHEEL_FX, COVENANT_FX,
  RUN_TIME, DIFFS, spawnGap, hpScale, dmgScale, BOSS_AT, ELITE_EVERY,
  PLAYER, expNeed, scoreOf,
  MAX_WEAPON, POOL_PER_PROTO, RAGE, TERRAINS, terrainAt,
} from './defs.js';
import { META, CHARS, WEAPONS, MOBS, CREATIONS, WHEELS, COVENANTS } from './gen.js';

const TAU = Math.PI * 2;
export const VIEW_H = 620;                 // 视口固定高度（世界单位）
const MAX_ENEMY = 300;
const MAX_BULLET = 700;

// ---------------------------------------------------------------- 随机
// 可复现的伪随机：同一把种子重开能复现同一局，测试和「再来一次」都好办。
let seed = 1;
export function setSeed(s) { seed = (s >>> 0) || 1; }
const rnd = () => {
  seed = (seed + 0x6D2B79F5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rr = (a, b) => a + rnd() * (b - a);
const pickOne = (arr) => arr[(rnd() * arr.length) | 0];

// ---------------------------------------------------------------- 状态
export const G = {
  phase: 'idle',          // idle | run | levelup | over | win
  t: 0, dt: 0,
  W: 0, H: 0, s: 1,       // 画布 CSS 尺寸与缩放（世界 → 屏幕）
  cam: { x: 0, y: 0 },
  shake: 0, flash: 0,
  diff: DIFFS[1],
  char: null,
  player: {
    x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0,
    hp: PLAYER.hp, maxHp: PLAYER.hp, shield: 0, maxShield: 0,
    inv: 0, face: 1, walk: 0,
  },
  enemies: [], bullets: [], fields: [], orbs: [], summons: [], pickups: [], fx: [], texts: [],
  weapons: [], passives: [], wheels: [], covs: [],
  pool: { enemies: [], bullets: [], fx: [], texts: [] },
  mods: null,
  kills: 0, lv: 1, exp: 0, expNext: expNeed(1),
  bossKills: 0, pending: 0, choices: [],
  revived: 0, killTimer: 0, bloodTimer: 0, burstTimer: 0, dilate: 0,
  spawnT: 0, eliteT: 0, bossIdx: 0, pressure: 0,
  // 狂气槽
  rage: 0, rageT: 0, rageReady: false, rageUsed: 0,
  // Boss 警报：bossEta 是「还有几秒出现」（<2.5 时渲染层做边缘预警），
  // warn 是「已经出现、横幅还剩几秒淡出」。
  bossEta: 999, warn: 0, warnName: '',
  // 地形：idx 变一次，渲染层就重建一次地面 pattern；fade 负责交叉淡化
  terrainIdx: 0, terrainFade: 0,
  // 主动收兵：和「被打死」一样走 over，只是结算文案与得分口径要区别对待
  gaveUp: false,
  world: { w: 2400, h: 2400 },  // 只在绘制里当地面参考，玩家其实不设边界
  stats: { dmg: 0, taken: 0 },
};

const emptyMods = () => ({
  atk: 1, cd: 1, area: 1, spd: 1, pick: 1, exp: 1,
  crit: PLAYER.critBase, critMul: PLAYER.critMul,
  dmgTaken: 1, regen: 0, armor: 0, lifesteal: 0,
  pierce: 0, dmgMul: 1, enemySlow: 1, revives: 0,
  summonBonus: 0, fieldWide: 1, healDrop: 0, thorns: 0,
  maxHpBonus: 0, maxShieldBonus: 0, frenzy: 0, echo: 0,
  rageGain: 0,
  autoMagnet: false, autoBurst: 0, firstStrike: false, timeDilate: false,
});

// ---------------------------------------------------------------- 对象池
const take = (kind, make) => (G.pool[kind].pop() || make());
const give = (kind, o) => { if (G.pool[kind].length < 400) G.pool[kind].push(o); };

// ---------------------------------------------------------------- 伤害数字
export function addText(x, y, txt, kind) {
  if (G.texts.length > 90) return;
  const o = take('texts', () => ({}));
  // 数值一律取整：伤害是浮点数，直接写进 canvas 会出现「49.3」这种
  // 在几百个飘字里格外扎眼的小数。
  if (typeof txt === 'number') txt = Math.round(txt);
  o.x = x; o.y = y; o.txt = txt; o.kind = kind || 0; o.life = 0.7; o.vy = -34; o.vx = rr(-12, 12);
  G.texts.push(o);
}

function burst(x, y, n, color, spd) {
  for (let i = 0; i < n; i++) {
    if (G.fx.length > 420) break;
    const o = take('fx', () => ({}));
    const a = rnd() * TAU;
    const v = rr(spd * 0.35, spd);
    o.x = x; o.y = y; o.vx = Math.cos(a) * v; o.vy = Math.sin(a) * v;
    o.life = rr(0.22, 0.5); o.max = o.life; o.color = color; o.r = rr(1.4, 3.4);
    G.fx.push(o);
  }
}

// ---------------------------------------------------------------- 开局
export function reset(charId, diffKey) {
  const c = CHARS.find((x) => x.id === String(charId)) || CHARS[0];
  const d = DIFFS.find((x) => x.k === diffKey) || DIFFS[1];
  G.diff = d;
  G.char = c;
  G.t = 0;
  G.phase = 'run';
  G.shake = 0; G.flash = 0;
  G.kills = 0; G.lv = 1; G.exp = 0; G.expNext = expNeed(1);
  G.bossKills = 0; G.pending = 0; G.choices = [];
  G.revived = 0; G.killTimer = 0; G.bloodTimer = 0; G.burstTimer = 0; G.dilate = 0;
  G.spawnT = 1.2; G.eliteT = ELITE_EVERY; G.bossIdx = 0; G.pressure = 0;
  G.rage = 0; G.rageT = 0; G.rageReady = false; G.rageUsed = 0;
  G.bossEta = BOSS_AT[0]; G.warn = 0; G.warnName = '';
  G.terrainIdx = terrainAt(0); G.terrainFade = 0;
  G.gaveUp = false;
  G.stats = { dmg: 0, taken: 0, rageDmg: 0 };
  for (const k of ['enemies', 'bullets', 'fields', 'orbs', 'summons', 'pickups', 'fx', 'texts']) G[k].length = 0;
  G.weapons = []; G.passives = []; G.wheels = []; G.covs = [];
  G.mods = emptyMods();

  // 角色天赋：界域给主属性，定位给次属性 —— 62 个人因此不是同一个手感。
  const realmFx = {
    混沌: () => { G.mods.crit += 0.08; G.mods.critMul += 0.3; },
    深海: () => { G.mods.dmgTaken *= 0.92; G.mods.regen += 0.6; },
    血肉: () => { G.mods.lifesteal += 0.03; G.mods.atk += 0.1; },
    超维: () => { G.mods.cd *= 0.9; G.mods.area += 0.1; },
  };
  (realmFx[c.realm] || (() => {}))();
  if (c.role === '伤害型') G.mods.atk += 0.08;
  if (c.role === '防御型') G.mods.maxHpBonus += 25;
  if (c.role === '辅助型') G.mods.exp += 0.12;

  const P = G.player;
  P.x = 0; P.y = 0; P.vx = 0; P.vy = 0; P.kx = 0; P.ky = 0;
  P.maxHp = PLAYER.hp + G.mods.maxHpBonus;
  P.hp = P.maxHp; P.shield = 0; P.inv = 0; P.face = 1; P.walk = 0;

  // 开局武器：角色自己的两个技能各一把，等级 1；另一把先放进候选池，
  // 玩家可以在升级时选它，也可以走别的流派。
  const mine = WEAPONS.filter((w) => w.char === c.id);
  if (mine.length) addWeapon(mine[0].id);
  G.starterWeapon = mine[1] ? mine[1].id : null;
  G.candidatePool = buildPool(c, mine);
  recompute();
  return G;
}

// 候选武器池：本命第二把 + 每个原型随机 POOL_PER_PROTO 把。
//
// 原来每个原型只放 1 把，一整局牌堆里最多出现 13 个技能 —— 62 名唤醒体的
// 124 条技能绝大部分永远抽不到，也谈不上「用技能组出流派」。现在每原型放
// 2 把（约 24 把），再叠加「技能栏满了可以替换」，每局的 Build 都不一样。
function buildPool(c, mine) {
  const pool = new Set();
  if (mine[1]) pool.add(mine[1].id);
  const byProto = {};
  for (const w of WEAPONS) {
    if (pool.has(w.id) || (mine[0] && w.id === mine[0].id)) continue;
    (byProto[w.proto] = byProto[w.proto] || []).push(w);
  }
  for (const k of Object.keys(PROTOS)) {
    const arr = byProto[k];
    if (!arr || !arr.length) continue;
    // 洗牌后取前 N 个，而不是独立随机抽 N 次 —— 后者会抽重
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rnd() * (i + 1)) | 0;
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    for (let i = 0; i < Math.min(POOL_PER_PROTO, arr.length); i++) pool.add(arr[i].id);
  }
  // 治疗类保底：heal 原型一共十几把，按「每原型随机 2 把」很容易一把都抽不到，
  // 那一局就完全没有主动续航，只能靠升级回的那 8% 硬撑。
  const hasHeal = [...pool].some((id) => {
    const w = WEAPONS.find((x) => x.id === id);
    return w && w.proto === 'heal';
  });
  if (!hasHeal) {
    const hl = WEAPONS.filter((w) => w.proto === 'heal' && !(mine[0] && w.id === mine[0].id));
    if (hl.length) pool.add(hl[(rnd() * hl.length) | 0].id);
  }
  return [...pool];
}

// ---------------------------------------------------------------- 装配
export function recompute() {
  const m = G.mods;
  // 每次重算都从「角色天赋」的底座起算，避免反复叠加
  const base = emptyMods();
  const c = G.char;
  if (c) {
    if (c.realm === '混沌') { base.crit += 0.08; base.critMul += 0.3; }
    if (c.realm === '深海') { base.dmgTaken *= 0.92; base.regen += 0.6; }
    if (c.realm === '血肉') { base.lifesteal += 0.03; base.atk += 0.1; }
    if (c.realm === '超维') { base.cd *= 0.9; base.area += 0.1; }
    if (c.role === '伤害型') base.atk += 0.08;
    if (c.role === '防御型') base.maxHpBonus += 25;
    if (c.role === '辅助型') base.exp += 0.12;
  }
  Object.assign(m, base);

  for (const p of G.passives) {
    for (let i = 0; i < p.stack; i++) applyCreation(p, m);
  }
  for (const w of G.wheels) applyWheel(w.key, m);
  for (const v of G.covs) applyCovenant(v.key, m);

  G.player.maxHp = Math.round(PLAYER.hp + m.maxHpBonus);
  G.player.maxShield = Math.round(30 + m.maxShieldBonus);
  if (G.player.hp > G.player.maxHp) G.player.hp = G.player.maxHp;
}

function applyCreation(p, m) {
  const fx = CREATION_FX[p.fx];
  if (!fx) return;
  switch (fx.k) {
    case 'atk': m.atk += fx.v; if (p.fx === 'str') m.dmgTaken += 0.03; break;
    case 'crit': m.crit += fx.v; break;
    case 'maxHp': m.maxHpBonus += fx.v; break;
    case 'pick': m.pick += fx.v; if (p.fx === 'draw') m.exp += 0.06; break;
    case 'cd': m.cd *= (1 + fx.v); break;
    case 'rage': m.rageGain += fx.v; m.atk += 0.02; break;
    case 'dmgTaken': m.dmgTaken += fx.v; m.dmgMul += 0.06; break;
    case 'spd': m.spd += fx.v; break;
    case 'regen': m.regen += fx.v; break;
    case 'area': m.area += fx.v; break;
    default: break;
  }
}

function applyWheel(key, m) {
  switch (key) {
    case 'all_dmg20': m.dmgMul += 0.2; break;
    case 'slow15': m.enemySlow *= 0.85; break;
    case 'critdmg80': m.critMul += 0.8; break;
    case 'pierce2': m.pierce += 2; break;
    case 'atkspd20': m.cd *= 0.8; break;
    case 'exp25': m.exp += 0.25; break;
    case 'armor3': m.armor += 3; break;
    case 'shield_start': m.maxShieldBonus += 30; break;
    case 'lifesteal5': m.lifesteal += 0.05; break;
    case 'revive': m.revives += 1; break;
    case 'summon_extra': m.summonBonus += 2; break;
    case 'field_wide': m.fieldWide += 0.35; break;
    case 'golden_touch': m.healDrop += 0.06; break;
    case 'thorns': m.thorns += 25; break;
    case 'first_strike': m.firstStrike = true; break;
    case 'time_dilate': m.timeDilate = true; break;
    default: break;
  }
}

function applyCovenant(key, m) {
  switch (key) {
    case 'c_area35': m.area += 0.35; m.dmgMul += 0.15; break;
    case 'c_revive2': m.revives += 1; break;
    case 'c_magnet': m.pick += 1; m.autoMagnet = true; break;
    case 'c_burst': m.autoBurst = 15; break;
    case 'c_echo': m.echo += 0.3; break;
    case 'c_blood': m.lifesteal += 0.02; m.atk += 0.1; break;
    case 'c_haste': m.spd += 0.18; m.cd *= 0.88; break;
    case 'c_guard': m.maxHpBonus += 60; m.dmgTaken *= 0.92; break;
    case 'c_frenzy': m.frenzy += 0.45; break;
    default: break;
  }
}

export function addWeapon(wid, replaceId) {
  const def = WEAPONS.find((w) => w.id === wid);
  if (!def) return null;
  const have = G.weapons.find((w) => w.def.id === wid);
  if (have) {
    if (have.lv < LV.max) { have.lv++; return have; }
    return null;
  }
  const cdMax = PROTOS[def.proto] ? PROTOS[def.proto].cd : 1;
  // 技能栏满了也能换：替换掉调用方指定的那把，没指定就换等级最低的。
  // 新技能从 0 级起算，这是「转流派」的代价 —— 否则槽位一满就只剩升级，
  // 后半局的三选一只剩造物和命轮，Build 完全定型。
  if (G.weapons.length >= MAX_WEAPON) {
    const target = G.weapons.find((x) => x.def.id === replaceId)
      || G.weapons.reduce((a, b) => (a.lv <= b.lv ? a : b), G.weapons[0]);
    if (!target) return null;
    // 环绕光刃是常驻实体，换掉武器时要把对应的刀刃也作废，
    // 否则场上会留下一圈没人维护、伤害不再更新的刀刃。召唤物同理。
    for (const o of G.orbs) if (o.w === target) o.dead = true;
    for (let i = G.summons.length - 1; i >= 0; i--) if (G.summons[i].src === target) G.summons.splice(i, 1);
    target.def = def;
    target.lv = 0;
    target.timer = rr(0.1, 0.4);
    target.orb = null;
    target.cdMax = cdMax;
    target.swapped = 1;
    return target;
  }
  const w = { def, lv: 0, timer: rr(0.1, 0.5), ang: rnd() * TAU, cdMax, cdLeft: 0 };
  G.weapons.push(w);
  return w;
}

export function addCreation(creationId) {
  const meta = CREATIONS.find((c) => String(c.id) === String(creationId));
  if (!meta) return;
  const have = G.passives.find((p) => p.id === String(creationId));
  if (have) { have.stack = Math.min(CREATION_STACK, have.stack + 1); recompute(); return; }
  if (G.passives.length >= 8) return;
  G.passives.push({ id: String(creationId), n: meta.n, r: meta.r, fx: meta.fx || creationFx(meta), stack: 1 });
  recompute();
}

// 造物的效果由其 tags 决定（官方数据里 tags 就是它在卡组里干的活）
function creationFx(meta) {
  const tags = meta.t || [];
  for (const t of tags) if (CREATION_FX[t]) return t;
  const keys = ['dmg', 'crit', 'guard', 'speed', 'area', 'magnet', 'regen'];
  return keys[Number(meta.id) % keys.length];
}

export function addWheel(index) {
  const meta = WHEELS[index];
  if (!meta) return;
  G.wheels.push({ key: WHEEL_FX[index % WHEEL_FX.length].key, id: String(meta.id), n: meta.n, idx: index });
  recompute();
}

export function addCovenant(index) {
  const meta = COVENANTS[index];
  if (!meta) return;
  G.covs.push({ key: COVENANT_FX[index % COVENANT_FX.length].key, id: String(meta.id), n: meta.n, idx: index });
  recompute();
}

// ---------------------------------------------------------------- 升级选项
// 三选一：新武器 / 武器升级 / 造物 / 命轮 / 契物。
// 稀有度不是权重，而是「先满足条件才进池」，所以金框出现时一定是能用的。
export function rollChoices() {
  const out = [];
  const seen = new Set();
  // 去重用「类别 + id」拼出来的键。之前读的是 o.key，而选项上根本没这个字段，
  // 三张卡全被当成同一个 key=undefined，结果永远只弹一张。
  const keyOf = (o) => {
    if (o.kind === 'wlv') return 'w:' + o.w.def.id;
    if (o.kind === 'wnew' || o.kind === 'wswap') return 'w:' + o.def.id;
    if (o.kind === 'creation') return 'k:' + o.c.id;
    if (o.kind === 'wheel') return 'wl:' + o.i;
    return 'cv:' + o.i;
  };
  const add = (o) => { const k = keyOf(o); if (!seen.has(k)) { seen.add(k); out.push(o); } };

  // 1. 武器：优先已拥有且未满级的（升级），再补候选池里的新武器
  const ups = G.weapons.filter((w) => w.lv < LV.max);
  const news = G.candidatePool
    .map((id) => WEAPONS.find((w) => w.id === id))
    .filter((d) => d && !G.weapons.some((w) => w.def.id === d.id));
  const weaponSlot = G.weapons.length < MAX_WEAPON;
  const wpool = [];
  for (const w of ups) wpool.push({ kind: 'wlv', w });
  if (weaponSlot) {
    for (const d of news) wpool.push({ kind: 'wnew', def: d });
  } else {
    // 满了也照抽，只是变成「替换」：drop 是要让位的那一把。
    // 默认挑等级最低的（同等看谁先拿），玩家在卡面上能直接看到换掉谁。
    const weakest = G.weapons.reduce((a, b) => (a.lv <= b.lv ? a : b), G.weapons[0]);
    for (const d of news) wpool.push({ kind: 'wswap', def: d, drop: weakest });
  }

  // 2. 造物：未满 8 件时进池，已有的可以叠到 3 层
  const cpool = CREATIONS
    .filter((c) => {
      const have = G.passives.find((p) => p.id === String(c.id));
      return have ? have.stack < CREATION_STACK : G.passives.length < 8;
    })
    .map((c) => ({ kind: 'creation', c }));

  // 命轮 3 分钟才开第一个槽，之后每 4 分钟多一个（最多 3 张）：
  // 开局就塞质变装备会让前两分钟的节奏直接崩掉
  const wheelOk = G.t >= 180 && G.wheels.length < Math.min(3, 1 + Math.floor((G.t - 180) / 240));
  const wlpool = wheelOk
    ? WHEELS.map((w, i) => ({ kind: 'wheel', i, w })).filter((o) => !G.wheels.some((x) => x.idx === o.i))
    : [];

  // 4. 契物：10 分钟后才出现，全局限 1 件（够强了）
  const covOk = G.t >= 600 && G.covs.length < 1;
  const cvpool = covOk
    ? COVENANTS.map((c, i) => ({ kind: 'cov', i, c }))
    : [];

  // 类别权重：武器升级 42% / 新武器 18% / 造物 30% / 命轮 8% / 契物 2%。
  // 先按类别抽，再从类别内部均匀抽 —— 之前把类别权重除以了池子大小，
  // 结果造物（42 件）把武器（十来件）的份额整个吃掉了，十几次升级一次武器都升不到。
  const groups = [
    { w: 42, list: wpool.filter((o) => o.kind === 'wlv') },
    { w: 18, list: wpool.filter((o) => o.kind === 'wnew') },
    { w: 16, list: wpool.filter((o) => o.kind === 'wswap') },
    { w: 30, list: cpool },
    { w: 8, list: wlpool },
    { w: 2, list: cvpool },
  ].filter((g) => g.list.length);

  for (let k = 0; k < 3 && groups.length; k++) {
    let total = 0;
    for (const g of groups) total += g.w;
    let r = rnd() * total;
    let gi = 0;
    for (let i = 0; i < groups.length; i++) { r -= groups[i].w; if (r <= 0) { gi = i; break; } }
    const g = groups[gi];
    const o = g.list.splice((rnd() * g.list.length) | 0, 1)[0];
    if (g.list.length === 0) groups.splice(gi, 1);
    if (o) add(o);
  }
  return out;
}


export function applyChoice(o) {
  if (!o) { skipChoice(); return; }
  if (o.kind === 'wlv') { o.w.lv = Math.min(LV.max, o.w.lv + 1); }
  else if (o.kind === 'wnew') addWeapon(o.def.id);
  else if (o.kind === 'wswap') addWeapon(o.def.id, o.drop && o.drop.def ? o.drop.def.id : null);
  else if (o.kind === 'creation') addCreation(o.c.id);
  else if (o.kind === 'wheel') addWheel(o.i);
  else if (o.kind === 'cov') addCovenant(o.i);
  if (G.mods.timeDilate) G.dilate = 3;
  advancePending();
}

// 什么都不选：玩家明确要的「这次不要」。技能栏满了、造物都叠满了之后，
// 强行塞东西反而是负收益，所以留一个出口。
export function skipChoice() {
  advancePending();
}

// 消耗一次待选次数，并把下一屏准备好。
// 关键点：如果池子真的空了（武器全满级 + 造物叠满 + 命轮契物都拿过），
// 一次 rollChoices 会返回空数组 —— 旧代码照样进入 levelup，于是弹出一个
// 「一张卡都没有」的死面板，游戏直接卡住。这里把空的 pending 就地消化掉。
function advancePending() {
  G.pending = Math.max(0, G.pending - 1);
  while (G.pending > 0) {
    const next = rollChoices();
    if (next.length) { G.choices = next; return; }
    G.pending--;
  }
  G.choices = [];
  G.phase = 'run';
}

// ---------------------------------------------------------------- 敌人
function enemyDef(i) {
  const m = MOBS[i % MOBS.length];
  const tier = m.cls === 'Boss' ? 2 : m.cls === '精英' ? 1 : 0;
  // 接触伤害：三档主要差在「一只怪有多疼」，而不是「一只怪有多硬」。
  // 首领的 26 是灾难性的——它冲刺时速度 ×2.4（182 > 玩家 108），贴上你
  // 之后 0.45 秒的接触冷却意味着一次冲刺能连打两下，300 秒时单发 52 点，
  // 110 血当场归零。首领应该是「站桩很痛、但给你反应时间」，所以基础伤害
  // 压到 16，接触冷却单独拉长（见 updateEnemies）。
  const base = [
    { hp: 20, dmg: 5, spd: 92, r: 15 },
    { hp: 150, dmg: 12, spd: 84, r: 26 },
    { hp: 900, dmg: 16, spd: 76, r: 40 },
  ][tier];
  return { m, tier, base, img: META.frames['m:' + m.id] };
}

function spawnEnemy(tier, ax, ay) {
  if (G.enemies.length >= MAX_ENEMY) return null;
  const normals = [];
  for (let i = 0; i < MOBS.length; i++) if (enemyDef(i).tier === tier) normals.push(i);
  if (!normals.length) return null;
  const idx = normals[(rnd() * normals.length) | 0];
  const d = enemyDef(idx);
  const e = take('enemies', () => ({}));
  // 出生点贴着「视野矩形」的外沿，而不是贴着视野的对角圆。
  //
  // 早先按对角半径算：竖屏下对角半径约 452，而横向半视野只有 168，于是从
  // 左右两侧刷出来的怪出生在屏幕外 280 单位处，等它走进画面玩家早跑没影了
  // ——表现成「满屏空旷，一只怪都没有」。另外椭圆也不行：45° 方向会算出
  // (142, 309)，两个分量都小于半视野 168/364，等于直接刷在画面里。
  // 所以这里老老实实按矩形周长取点，任何方向都刚好在边框外一点。
  const s = G.s || 1;
  const hw = (G.W || 430) / 2 / s;
  const hh = (G.H || 900) / 2 / s;
  const k = ay == null ? rr(1.08, 1.22) : ay;   // 相对视野边缘的外扩倍数
  const px = hw * k, py = hh * k;
  let ox, oy;
  if (ax != null) {
    // 指定方向（包围用）：沿射线打到扩展矩形的边上
    const cs = Math.cos(ax), sn = Math.sin(ax);
    const hit = Math.min(px / Math.max(1e-4, Math.abs(cs)), py / Math.max(1e-4, Math.abs(sn)));
    ox = cs * hit; oy = sn * hit;
  } else {
    // 沿四条边按弧长均匀取点
    let u = rnd() * 4 * (px + py);
    if (u < 2 * px) { ox = -px + u; oy = -py; }
    else if ((u -= 2 * px) < 2 * py) { ox = px; oy = -py + u; }
    else if ((u -= 2 * py) < 2 * px) { ox = px - u; oy = py; }
    else { u -= 2 * px; ox = -px; oy = py - u; }
  }
  const hpMul = G.diff.hp * hpScale(G.t);
  e.x = G.player.x + ox;
  e.y = G.player.y + oy;
  e.r = d.base.r;
  e.maxHp = Math.round(d.base.hp * hpMul * (tier === 2 ? 1 : rr(0.9, 1.1)));
  e.hp = e.maxHp;
  e.dmg = d.base.dmg * G.diff.dmg * dmgScale(G.t);
  e.spd = d.base.spd * G.diff.spd * G.mods.enemySlow * rr(0.94, 1.06);
  e.tier = tier;
  e.img = d.img;
  e.n = d.m.n;
  e.flash = 0; e.kx = 0; e.ky = 0; e.wob = rnd() * TAU;
  e.hitCd = 0;
  e.windT = 0; e.lungeT = 0;
  e.boss = tier === 2;
  e.dashT = 0;
  G.enemies.push(e);
  return e;
}

function spawnRing(count) {
  // 一圈均匀铺开（之前全丢在随机方向上，所谓「包围」其实经常只从一侧来）
  const a0 = rnd() * TAU;
  for (let i = 0; i < count; i++) spawnEnemy(0, a0 + (i / count) * TAU);
}

// ---------------------------------------------------------------- 子弹
function shot(x, y, vx, vy, opt) {
  if (G.bullets.length >= MAX_BULLET) return null;
  const b = take('bullets', () => ({}));
  b.x = x; b.y = y; b.vx = vx; b.vy = vy;
  b.r = opt.r || 6;
  b.dmg = opt.dmg;
  b.life = opt.life || 1.4;
  b.pierce = (opt.pierce || 0) + G.mods.pierce;
  b.hitSet = null;
  b.color = opt.color || '#9ecbff';
  b.kind = opt.kind || 'orb';     // orb | blade | bolt | missile | boomerang | ray
  b.spin = 0;
  b.home = opt.home || 0;         // >0 表示追踪强度
  b.back = opt.back || 0;         // >0 表示回旋镖的剩余飞行时间
  b.tag = opt.tag || '';
  b.w = opt.w || 0;               // 射线宽度
  b.src = opt.src || null;
  G.bullets.push(b);
  return b;
}

// ---------------------------------------------------------------- 主循环
export function update(dt) {
  if (G.phase !== 'run') { tickFx(dt); return; }
  G.dt = dt;
  const P = G.player;

  if (G.dilate > 0) G.dilate -= dt;
  const slow = G.dilate > 0 ? 0.4 : 1;

  G.t += dt;

  // ---- 狂气爆发计时
  if (G.rageT > 0) {
    G.rageT -= dt;
    if (G.rageT <= 0) { G.rageT = 0; addText(P.x, P.y - 30, '狂气消退', 5); }
  }

  // ---- 地形推进：每 3 分钟换一段地貌，只换视觉，不动任何数值
  const ti = terrainAt(G.t);
  if (ti !== G.terrainIdx) {
    G.terrainIdx = ti;
    G.terrainFade = 1;
    addText(P.x, P.y - 76, '进入 · ' + (TERRAINS[ti] ? TERRAINS[ti].n : ''), 5);
  }
  if (G.terrainFade > 0) G.terrainFade = Math.max(0, G.terrainFade - dt / 1.4);

  // ---- 玩家移动（摇杆/键盘向量在 input.js 里写入 P.ix / P.iy）
  const ix = P.ix || 0, iy = P.iy || 0;
  const len = Math.hypot(ix, iy) || 1;
  const nx = ix / len, ny = iy / len;
  const spd = PLAYER.speed * G.mods.spd * (G.rageT > 0 ? 1 + RAGE.spd : 1);
  P.vx = nx * spd * (ix || iy ? 1 : 0);
  P.vy = ny * spd * (ix || iy ? 1 : 0);
  P.x += (P.vx + P.kx) * dt;
  P.y += (P.vy + P.ky) * dt;
  P.kx *= Math.pow(0.001, dt);
  P.ky *= Math.pow(0.001, dt);
  if (ix) P.face = ix > 0 ? 1 : -1;
  P.walk += Math.hypot(P.vx, P.vy) * dt * 0.05;
  if (P.inv > 0) P.inv -= dt;

  // 相机跟随（带一点滞后，跑起来不至于晕）
  const targetX = P.x, targetY = P.y;
  G.cam.x += (targetX - G.cam.x) * Math.min(1, dt * 9);
  G.cam.y += (targetY - G.cam.y) * Math.min(1, dt * 9);

  // ---- 再生 / 命轮脉冲
  if (G.mods.regen > 0) {
    P.hp = Math.min(P.maxHp, P.hp + G.mods.regen * dt);
  }
  G.killTimer += dt;
  if (G.wheels.some((w) => w.key === 'regen_pulse') && G.killTimer > 8) {
    G.killTimer = 0;
    P.hp = Math.min(P.maxHp, P.hp + 4);
    addText(P.x, P.y - 24, '+4', 2);
  }
  if (G.mods.autoBurst > 0) {
    G.burstTimer += dt;
    if (G.burstTimer >= G.mods.autoBurst) {
      G.burstTimer = 0;
      shockwave(P.x, P.y, 220 * G.mods.area, 60 * G.mods.atk * G.mods.dmgMul, '#ffd479');
    }
  }

  updateWeapons(dt);
  updateEnemies(dt, slow);
  updateBullets(dt);
  updateFields(dt);
  updateSummons(dt);
  updateOrbs(dt);
  updatePickups(dt);
  tickFx(dt);
  if (G.warn > 0) G.warn = Math.max(0, G.warn - dt);

  // ---- 刷怪
  updateSpawns(dt);

  // ---- 结束判定
  if (G.t >= RUN_TIME && G.phase === 'run') {
    G.phase = 'win';
  }
}

function tickFx(dt) {
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.life -= dt;
    if (f.life <= 0) { give('fx', f); G.fx.splice(i, 1); continue; }
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.vx *= Math.pow(0.02, dt); f.vy *= Math.pow(0.02, dt);
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    const t = G.texts[i];
    t.life -= dt;
    if (t.life <= 0) { give('texts', t); G.texts.splice(i, 1); continue; }
    t.y += t.vy * dt; t.x += t.vx * dt;
    t.vy += 52 * dt;
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 3.2);
}

// ---------------------------------------------------------------- 武器开火
function updateWeapons(dt) {
  const P = G.player;
  // 狂气爆发期间：攻击力抬升、冷却缩短。两个都乘在这里而不是写进 mods，
  // 免得 recompute 之后被覆盖掉。
  const rageAtk = G.rageT > 0 ? 1 + RAGE.atk : 1;
  const rageCd = G.rageT > 0 ? RAGE.cd : 1;
  for (const w of G.weapons) {
    const proto = PROTOS[w.def.proto];
    if (!proto) continue;
    w.timer -= dt;
    // 给 HUD 的冷却环用：cdLeft/cdMax 是「这一发还要多久」和「整格多长」
    w.cdLeft = Math.max(0, w.timer);
    if (w.timer > 0) continue;
    const cd = proto.cd * LV.cd(w.lv) * G.mods.cd * rageCd * (G.mods.echo && rnd() < G.mods.echo ? 0.4 : 1);
    w.timer = cd;
    w.cdMax = cd;
    w.cdLeft = cd;
    const dmg = proto.dmg * LV.dmg(w.lv) * G.mods.atk * G.mods.dmgMul * rageAtk;
    fireProto(w, proto, dmg);
    // 契物「回响」：30% 概率立刻再触发一次
    if (G.mods.echo > 0 && rnd() < G.mods.echo * 0.35) fireProto(w, proto, dmg * 0.7);
  }
}

function nearest(x, y, maxD) {
  let best = null, bd = maxD ? maxD * maxD : Infinity;
  for (const e of G.enemies) {
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function fireProto(w, proto, dmg) {
  const P = G.player;
  const lv = w.lv;
  const cnt = LV.count(lv, proto);
  const color = proto.color;
  const src = w;
  switch (w.def.proto) {
    case 'bolt': {
      for (let i = 0; i < cnt; i++) {
        const tgt = nearest(P.x, P.y, 900);
        const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU;
        shot(P.x, P.y, Math.cos(a) * 470, Math.sin(a) * 470, { dmg, r: 6, life: 1.5, color, kind: 'bolt', pierce: lv >= 4 ? 1 : 0, src });
      }
      break;
    }
    case 'orbit': {
      // 环绕光刃作为常驻实体，由 updateOrbs 维护；这里只调数量
      syncOrbit(w, 2 + lv, 62 + lv * 7, dmg, color);
      break;
    }
    case 'nova': {
      const R = (90 + lv * 14) * G.mods.area;
      shockwave(P.x, P.y, R, dmg, color, src);
      G.shake = Math.min(9, G.shake + 2.4);
      break;
    }
    case 'beam': {
      const tgt = nearest(P.x, P.y, 900);
      const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU;
      const life = 0.3 + lv * 0.05;
      shot(P.x, P.y, Math.cos(a) * 900, Math.sin(a) * 900, { dmg, r: 13, life, color, kind: 'ray', pierce: 99, w: 13 + lv * 2, src });
      break;
    }
    case 'chain': {
      const tgt = nearest(P.x, P.y, 620);
      if (tgt) chainFrom(tgt, 2 + lv, dmg, color, src);
      break;
    }
    case 'field': {
      const tgt = nearest(P.x, P.y, 520) || { x: P.x + rr(-80, 80), y: P.y + rr(-80, 80) };
      for (let i = 0; i < cnt; i++) {
        addField(tgt.x + rr(-40, 40), tgt.y + rr(-40, 40), (2.4 + lv * 0.3), 52 * G.mods.area, dmg, color, false, src);
      }
      break;
    }
    case 'summon': {
      const want = cnt + G.mods.summonBonus;
      while (G.summons.length < want && G.summons.length < 8) addSummon(dmg, color, lv, src);
      break;
    }
    case 'boomerang': {
      for (let i = 0; i < cnt; i++) {
        const tgt = nearest(P.x, P.y, 700);
        const a = (tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU) + rr(-0.3, 0.3);
        shot(P.x, P.y, Math.cos(a) * 330, Math.sin(a) * 330, { dmg, r: 11, life: 1.9, color, kind: 'boomerang', back: 0.52, pierce: 99, src });
      }
      break;
    }
    case 'missile': {
      for (let i = 0; i < cnt; i++) {
        const a = rnd() * TAU;
        shot(P.x, P.y, Math.cos(a) * 150, Math.sin(a) * 150, { dmg, r: 7, life: 2.4, color, kind: 'missile', home: 6.5, pierce: 0, src });
      }
      break;
    }
    case 'strike': {
      for (let i = 0; i < cnt; i++) {
        const e = G.enemies[(rnd() * G.enemies.length) | 0];
        const x = e ? e.x : P.x + rr(-120, 120);
        const y = e ? e.y : P.y + rr(-120, 120);
        addField(x, y, 0.45, 46 * G.mods.area, dmg, color, true, src);
      }
      break;
    }
    case 'shield': {
      G.player.shield = Math.min(G.player.maxShield, G.player.shield + 8 + lv * 6);
      shockwave(P.x, P.y, 76 * G.mods.area, dmg, color, src);
      break;
    }
    case 'heal': {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + 2 + lv);
      shockwave(P.x, P.y, 66 * G.mods.area, dmg, color, src);
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------- 环绕体
function syncOrbit(w, count, radius, dmg, color) {
  w.orb = w.orb || { n: 0 };
  w.orb.n = count; w.orb.r = radius * G.mods.area; w.orb.dmg = dmg; w.orb.color = color;
  w.orb.id = w.orb.id || ('orb-' + w.def.id);
  if (!G.orbs.some((o) => o.id === w.orb.id)) {
    G.orbs.push({ id: w.orb.id, w, a: 0, hitCd: new Map() });
  }
}

function updateOrbs(dt) {
  const P = G.player;
  for (const o of G.orbs) {
    if (!G.weapons.includes(o.w)) { o.dead = true; continue; }
    o.a += dt * 2.1;
    const cfg = o.w.orb;
    if (!cfg) continue;
    for (const [k, v] of o.hitCd) { const nv = v - dt; if (nv <= 0) o.hitCd.delete(k); else o.hitCd.set(k, nv); }
    // 每一枚刃都是一条独立判定：n 枚刃均匀分布在圆周上
    for (const e of G.enemies) {
      if (o.hitCd.has(e)) continue;
      for (let i = 0; i < cfg.n; i++) {
        const ang = o.a + (TAU * i) / cfg.n;
        const x = P.x + Math.cos(ang) * cfg.r;
        const y = P.y + Math.sin(ang) * cfg.r;
        if ((e.x - x) ** 2 + (e.y - y) ** 2 < (e.r + 13) ** 2) {
          o.hitCd.set(e, 0.35);
          damageEnemy(e, cfg.dmg, x, y, o.w);
          break;
        }
      }
    }
  }
  G.orbs = G.orbs.filter((o) => !o.dead);
}

// ---------------------------------------------------------------- 范围与链
function shockwave(x, y, r, dmg, color, src) {
  G.fx.push({ x, y, vx: 0, vy: 0, life: 0.42, max: 0.42, color, r: 0, ring: r, kind: 'ring' });
  for (const e of G.enemies) {
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < r + e.r) {
      damageEnemy(e, dmg * (1 - (d / (r + e.r)) * 0.1), x, y, src);
      const a = Math.atan2(e.y - y, e.x - x);
      e.kx += Math.cos(a) * 90; e.ky += Math.sin(a) * 90;
    }
  }
}

function chainFrom(from, jumps, dmg, color, src) {
  let cur = from;
  let prev = { x: G.player.x, y: G.player.y };
  let d = dmg;
  const hit = new Set();
  for (let i = 0; i <= jumps; i++) {
    if (!cur) break;
    hit.add(cur);
    damageEnemy(cur, d, cur.x, cur.y, src);
    G.fx.push({ x: prev.x, y: prev.y, x2: cur.x, y2: cur.y, life: 0.22, max: 0.22, color, kind: 'line' });
    prev = { x: cur.x, y: cur.y };
    d *= 0.92;
    let best = null, bd = 190 * 190;
    for (const e of G.enemies) {
      if (hit.has(e)) continue;
      const dd = (e.x - prev.x) ** 2 + (e.y - prev.y) ** 2;
      if (dd < bd) { bd = dd; best = e; }
    }
    cur = best;
  }
}

// ---------------------------------------------------------------- 领域
function addField(x, y, life, r, dmg, color, delayed, src) {
  G.fields.push({ x, y, r, life, max: life, dmg, color, delay: delayed ? 0.45 : 0, tick: 0, src: src || null });
}

function updateFields(dt) {
  const P = G.player;
  for (let i = G.fields.length - 1; i >= 0; i--) {
    const f = G.fields[i];
    if (f.delay > 0) { f.delay -= dt; continue; }
    f.life -= dt;
    f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = 0.28;
      for (const e of G.enemies) {
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 < (f.r + e.r) ** 2) damageEnemy(e, f.dmg * 0.28 * G.mods.atk, f.x, f.y, f.src);
      }
    }
    if (f.life <= 0) G.fields.splice(i, 1);
  }
}

// ---------------------------------------------------------------- 召唤物
function addSummon(dmg, color, lv, src) {
  const a = rnd() * TAU;
  G.summons.push({
    x: G.player.x + Math.cos(a) * 40,
    y: G.player.y + Math.sin(a) * 40,
    r: 12, dmg: dmg * 1.25, color, cd: 0, life: 999, img: G.char ? G.char.img : 0, spin: rnd() * TAU,
    src: src || null,
  });
}

function updateSummons(dt) {
  for (const s of G.summons) {
    const tgt = nearest(s.x, s.y, 800);
    if (tgt) {
      const a = Math.atan2(tgt.y - s.y, tgt.x - s.x);
      s.x += Math.cos(a) * 150 * dt;
      s.y += Math.sin(a) * 150 * dt;
      if (Math.hypot(tgt.x - s.x, tgt.y - s.y) < tgt.r + s.r + 4 && (s.cd || 0) <= 0) {
        damageEnemy(tgt, s.dmg, s.x, s.y, s.src);
        s.cd = 0.5;
      }
    } else {
      const dx = G.player.x - s.x, dy = G.player.y - s.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > 60) { s.x += (dx / d) * 120 * dt; s.y += (dy / d) * 120 * dt; }
    }
    if (s.cd > 0) s.cd -= dt;
    s.spin += dt * 4;
  }
}

// ---------------------------------------------------------------- 子弹更新
function updateBullets(dt) {
  const P = G.player;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.life -= dt;
    if (b.kind === 'ray') {
      // 射线：在原地拉出一道判定，每帧对线上敌人结算一次（0.12 秒的独立冷却）
      b.rx = b.x; b.ry = b.y;
      const nx2 = b.x + b.vx * dt, ny2 = b.y + b.vy * dt;
      for (const e of G.enemies) {
        if (segDist(e.x, e.y, b.x, b.y, nx2, ny2) < b.w + e.r) {
          e._rayCd = e._rayCd || 0;
          if (e._rayCd <= 0) { e._rayCd = 0.14; damageEnemy(e, b.dmg * 0.34, e.x, e.y, b.src); }
        }
      }
      b.x = nx2; b.y = ny2;
      if (b.life <= 0) G.bullets.splice(i, 1);
      continue;
    }

    if (b.home && b.kind === 'missile') {
      const tgt = nearest(b.x, b.y, 700);
      if (tgt) {
        const a = Math.atan2(tgt.y - b.y, tgt.x - b.x);
        const ca = Math.atan2(b.vy, b.vx);
        let da = a - ca;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        const na = ca + da * Math.min(1, b.home * dt);
        const sp = Math.min(460, Math.hypot(b.vx, b.vy) + 620 * dt);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
    }
    if (b.kind === 'boomerang') {
      if (b.back > 0) {
        b.back -= dt;
        if (b.back <= 0) { b.vx *= -1.15; b.vy *= -1.15; b.back = -99; }
      } else if (b.back === -99) {
        const a = Math.atan2(P.y - b.y, P.x - b.x);
        const sp = Math.hypot(b.vx, b.vy) || 300;
        b.vx += Math.cos(a) * 900 * dt; b.vy += Math.sin(a) * 900 * dt;
        const s2 = Math.hypot(b.vx, b.vy) || 1;
        b.vx = (b.vx / s2) * Math.min(480, sp + 260 * dt);
        b.vy = (b.vy / s2) * Math.min(480, sp + 260 * dt);
        if (Math.hypot(P.x - b.x, P.y - b.y) < 22) b.life = 0;
      }
      b.spin += dt * 18;
    }

    b.x += b.vx * dt; b.y += b.vy * dt;
    // 弹道类让朝向跟着速度走：追踪弹是三角形、单发弹是橄榄形，之前统一累加
    // 角度导致它们在斜着飞的时候「横着漂」，看起来像贴图没对齐。
    if (b.kind === 'bolt' || b.kind === 'missile') b.spin = Math.atan2(b.vy, b.vx);
    else b.spin += dt * 12;

    if (b.kind !== 'ray') {
      for (const e of G.enemies) {
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 > (e.r + b.r) ** 2) continue;
        if (b.hitSet && b.hitSet.has(e)) continue;
        if (!b.hitSet) b.hitSet = new Set();
        b.hitSet.add(e);
        damageEnemy(e, b.dmg, b.x, b.y, b.src);
        bustSmall(b.x, b.y, b.color, b.kind);
        if (b.pierce-- <= 0) { b.life = 0; break; }
      }
    }
    // 清理每帧的射线冷却标记
    if (b.life <= 0) { G.bullets.splice(i, 1); continue; }
  }
  for (const e of G.enemies) if (e._rayCd > 0) e._rayCd -= dt;
}

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function bustSmall(x, y, color, kind) {
  if (G.fx.length > 380) return;
  // 命中火花按弹种分：追踪弹炸得更散、单发弹更尖，回旋镖带一点横向拖尾。
  // 之前所有弹种都是「2 个火星」，满屏弹道时根本分不清哪发打中了什么。
  const n = kind === 'missile' ? 5 : kind === 'bolt' ? 3 : kind === 'boomerang' ? 4 : 2;
  const sp = kind === 'missile' ? 165 : kind === 'boomerang' ? 130 : 105;
  for (let i = 0; i < n; i++) {
    const o = take('fx', () => ({}));
    const a = kind === 'boomerang' ? (i / n) * TAU + 0.4 : rnd() * TAU;
    o.x = x; o.y = y;
    o.vx = Math.cos(a) * rr(sp * 0.5, sp);
    o.vy = Math.sin(a) * rr(sp * 0.5, sp);
    o.life = rr(0.16, 0.28); o.max = o.life; o.color = color; o.r = rr(1.6, 3);
    G.fx.push(o);
  }
}

// ---------------------------------------------------------------- 敌人更新
function updateEnemies(dt, slow) {
  const P = G.player;
  const grid = new Map();
  const CS = 64;
  for (const e of G.enemies) {
    const k = ((e.x / CS) | 0) + ',' + ((e.y / CS) | 0);
    let arr = grid.get(k);
    if (!arr) grid.set(k, (arr = []));
    arr.push(e);
  }

  // 「离屏回收」距离：大约 2.2 屏。
  //
  // 这条是必须的。玩家 108、小怪 92，只要一直朝一个方向跑，怪永远追不上，
  // 全堆在身后——实测跑两分钟身后攒了 300 只（正好撞上 MAX_ENEMY 上限），
  // 于是 spawnEnemy 直接被上限挡掉，画面里连一只新怪都不刷，玩家在一片
  // 空地里跑完全程。回收掉追不上的家伙，名额才能腾出来给玩家身边重新刷。
  const farR = Math.hypot(G.W || 430, G.H || 900) * 1.7 / (G.s || 1);
  const far2 = farR * farR;

  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    const dx = P.x - e.x, dy = P.y - e.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2) || 1;
    if (d2 > far2) {
      if (e.boss) {
        // 首领不能凭空消失，改成「追上来」：直接挪到视野边缘继续压
        const s = G.s || 1;
        const hw = (G.W || 430) / 2 / s, hh = (G.H || 900) / 2 / s;
        const a = rnd() * TAU;
        e.x = P.x + Math.cos(a) * hw * 1.15;
        e.y = P.y + Math.sin(a) * hh * 1.15;
        continue;
      } else {
        give('enemies', e);
        G.enemies.splice(i, 1);
        continue;
      }
    }
    let sp = e.spd * slow;
    if (e.boss) {
      // Boss 每 5 秒冲一次：最后 0.6 秒是预警（渲染层画一圈红环），
      // 冲刺本身持续 0.5 秒、速度 ×2.4，比玩家快，逼你提前横移。
      e.dashT += dt;
      if (e.dashT > 4.5) { e.dashT = -0.5; }
      if (e.dashT < 0) sp *= 2.4;
      e.windup = (e.dashT > 3.9 && e.dashT <= 4.5) ? (e.dashT - 3.9) / 0.6 : 0;
    }
    e.x += (dx / d) * sp * dt + (e.kx || 0) * dt;
    e.y += (dy / d) * sp * dt + (e.ky || 0) * dt;
    e.kx *= Math.pow(0.008, dt); e.ky *= Math.pow(0.008, dt);
    e.wob += dt * 3;
    if (e.flash > 0) e.flash -= dt;
    if (e.hitCd > 0) e.hitCd -= dt;

    // 分离：只和本格及相邻格的敌人互推，避免全量 O(n²)。
    // 每只最多比较 14 个邻居就收手：怪被挤成一团时单格可能塞进上百只，
    // 不设上限的话这一层会退化成 O(n²)（实测 300 只挤在一个格子附近，
    // 一场 15 分钟的仿真跑了 8 分钟还没出来）。少推几下肉眼看不出差别。
    const cx = (e.x / CS) | 0, cy = (e.y / CS) | 0;
    let budget = 14;
    for (let ox = -1; ox <= 1 && budget > 0; ox++) {
      for (let oy = -1; oy <= 1 && budget > 0; oy++) {
        const arr = grid.get((cx + ox) + ',' + (cy + oy));
        if (!arr) continue;
        for (const o of arr) {
          if (o === e) continue;
          if (--budget < 0) break;
          const ddx = e.x - o.x, ddy = e.y - o.y;
          const dist = Math.hypot(ddx, ddy);
          const want = e.r + o.r;
          if (dist > 0 && dist < want) {
            const push = (want - dist) * 0.5;
            e.x += (ddx / dist) * push; e.y += (ddy / dist) * push;
          }
        }
      }
    }

    // 贴身攻击：先蓄力 0.28 秒（渲染层画一圈红色爪光），蓄满才真正咬下去。
    //
    // 之前是「贴上来就直接掉血」，玩家既看不出是哪只怪打的，也没有任何躲避
    // 窗口——三档难度都在 300 秒团灭，一部分原因就是伤害来得无声无息。
    // 加了前摇之后，同一套数值变成了「看到红光就该横移」。
    // 接触冷却按体型分：小怪 0.45 秒，精英 0.65，首领 0.9 —— 首领体积 40，
    // 一旦贴上就是持续伤害，它的威胁应该来自「逼你走位」，而不是「贴住打死你」。
    if (e.lungeT > 0) e.lungeT -= dt;
    const strikeRange = e.r + PLAYER.r + 18;
    if (d < strikeRange) {
      if (e.windT > 0) {
        e.windT -= dt;
        if (e.windT <= 0 && d < strikeRange + 10 && e.hitCd <= 0) {
          e.hitCd = e.boss ? 0.9 : e.tier === 1 ? 0.65 : 0.45;
          e.lungeT = 0.3;
          hurtPlayer(e.dmg, e);
        }
      } else if (e.hitCd <= 0) {
        e.windT = 0.28;
      }
    } else if (e.windT > 0) {
      // 走开了就取消前摇，不然绕到背后会被一只「空气怪」咬
      e.windT = 0;
    }
  }
}

// ---------------------------------------------------------------- 狂气
// 两条来路：造成伤害（细水长流）+ 击杀（爆发式）。爆发期间停止积攒，
// 所以节奏是「攒一波 → 放一波」，而不是攒满就永久变强。
function addRage(n, raw) {
  if (G.phase !== 'run' || G.rageT > 0 || G.rageReady) return;
  const gain = raw ? n : n * (1 + (G.mods ? G.mods.rageGain : 0));
  G.rage = Math.min(RAGE.max, G.rage + gain);
  if (G.rage >= RAGE.max) {
    G.rageReady = true;
    const P = G.player;
    addText(P.x, P.y - 46, '狂气已满 · 空格释放', 4);
    G.flash = Math.max(G.flash, 0.18);
  }
}

export function releaseRage() {
  if (!G.rageReady || G.rageT > 0 || G.phase !== 'run') return false;
  const P = G.player;
  G.rage = 0; G.rageReady = false; G.rageT = RAGE.dur; G.rageUsed++;
  G.shake = Math.min(18, G.shake + 10);
  G.flash = Math.max(G.flash, 0.35);
  shockwave(P.x, P.y, 260 * G.mods.area, RAGE.blast * G.mods.atk * G.mods.dmgMul, '#ff5f4a', 'rage');
  addText(P.x, P.y - 52, '狂气爆发', 4);
  return true;
}

// 主动收兵：暂停面板上的「放弃这局」。
// 以前这个按钮直接调 restart()，但 restart 只清了结算层，暂停层还盖在选角层
// 上面；此时点「继续」又因为 phase 已经不是 run/pause 而什么都不做 —— 整个页面
// 就这么僵在那儿，玩家只能刷新。现在改成一局正常收尾：照常结算、照常给银芯，
// 只是标题不对着「倒在了半路」写，避免主动放弃被当成阵亡。
export function giveUp() {
  if (G.phase !== 'run' && G.phase !== 'pause') return false;
  G.gaveUp = true;
  G.phase = 'over';
  return true;
}

// ---------------------------------------------------------------- 伤害
// src 是「这一下是谁打出来的」：武器对象、'rage'（狂气爆发）、或 null（环境伤害）。
// 结算面板要靠它把伤害分到每一把技能上 —— 不归因的话，玩家只能看到一个总数，
// 根本不知道哪把武器在真干活。
function creditDmg(src, dmg) {
  if (!src) return;
  if (src === 'rage') { G.stats.rageDmg = (G.stats.rageDmg || 0) + dmg; return; }
  if (typeof src === 'object') {
    src.dmgTotal = (src.dmgTotal || 0) + dmg;
    src.hits = (src.hits || 0) + 1;
  }
}

export function damageEnemy(e, amount, sx, sy, src) {
  if (e.hp <= 0) return;
  const crit = rnd() < G.mods.crit;
  let dmg = amount * (crit ? G.mods.critMul : 1);
  if (G.mods.frenzy > 0) {
    const miss = 1 - G.player.hp / G.player.maxHp;
    dmg *= 1 + G.mods.frenzy * miss;
  }
  e.hp -= dmg;
  e.flash = 0.1;
  G.stats.dmg += dmg;
  creditDmg(src, dmg);
  addRage(dmg * RAGE.perDmg);
  addText(e.x + rr(-6, 6), e.y - e.r * 0.7, Math.round(dmg), crit ? 1 : 0);
  if (G.mods.lifesteal > 0) {
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + dmg * G.mods.lifesteal);
  }
  if (e.hp <= 0) killEnemy(e, sx, sy);
}

function killEnemy(e, sx, sy) {
  e.hp = 0;
  const idx = G.enemies.indexOf(e);
  if (idx >= 0) G.enemies.splice(idx, 1);
  G.kills++;
  addRage(RAGE.perKill);
  burst(e.x, e.y, e.tier === 2 ? 22 : e.tier === 1 ? 12 : 5, e.tier ? '#ffd479' : '#9aa4bb', e.tier ? 190 : 120);
  give('enemies', e);

  // 掉落：经验结晶（精英/Boss 更多），精英掉宝箱，Boss 掉命轮
  const val = e.tier === 2 ? 60 : e.tier === 1 ? 14 : 1;
  dropExp(e.x, e.y, val, e.tier);
  if (e.tier === 1) G.pickups.push({ x: e.x, y: e.y, kind: 'chest', val: 1, vx: 0, vy: 0, life: 999, bob: rnd() * TAU });
  if (e.tier === 2) {
    G.bossKills++;
    G.pickups.push({ x: e.x, y: e.y, kind: 'wheel', val: 1, vx: 0, vy: 0, life: 999, bob: rnd() * TAU });
    G.shake = 12;
  }
  // 这类「按击杀判定」的掉落后期会失控：每秒几十杀时 12% 等于每秒三个药包，
  // 叠两层就是无限回血。和 dropLoot 一样加血量门控 —— 满血时不掉，供给自然收敛。
  if (G.mods.healDrop > 0 && G.player.hp < G.player.maxHp * 0.75 && rnd() < G.mods.healDrop) {
    G.pickups.push({ x: e.x, y: e.y, kind: 'heal', val: 8, vx: rr(-30, 30), vy: rr(-30, 30), life: 14, bob: rnd() * TAU });
  }
  dropLoot(e);
  if (G.wheels.some((w) => w.key === 'killburst')) {
    shockwave(e.x, e.y, 46, 12 * G.mods.atk, '#d94f6a');
  }
  void sx; void sy;
}

function dropExp(x, y, val, tier) {
  const n = tier ? Math.min(6, val) : 1;
  for (let i = 0; i < n; i++) {
    G.pickups.push({
      x: x + rr(-10, 10), y: y + rr(-10, 10), kind: 'exp',
      val: Math.max(1, Math.round(val / n)), vx: rr(-40, 40), vy: rr(-40, 40),
      life: 40, bob: rnd() * TAU,
    });
  }
}

// ---------------------------------------------------------------- 掉落
// 「有拾取范围，但场上没什么可捡」——经验结晶之外必须还有别的东西，
// 否则吸力这条属性完全没有体感，也让「回血」变成只能靠升级的那一下。
//
//   治疗结晶（绿）：普通 1.2%（且只在受伤后掉、地上最多 3 个）/ 精英 30% / 首领必掉 2 个
//   狂气球（橙）：普通 0.5% / 精英 25% / 首领必掉 1 个
//
// 概率是按「每分钟能捡到几个」估的：普通局每分钟杀十几只，约 1 个治疗；
// 精英每 70 秒刷两只，各有一小半概率带治疗，中期续航就接得上了。
// 早期版本按 1.8% + 12% 造物叠算，实测一局掉 498 个治疗（4104 点）而全局只承受 79 点，
// 等于配了 37 条命 —— 所以这里既压概率，也加了「受伤才掉 / 地上限 3 个」两道闸。
function dropLoot(e) {
  const heal = (val) => {
    if (G.pickups.filter((p) => p.kind === 'heal').length >= 3) return;
    G.pickups.push({
      x: e.x + rr(-12, 12), y: e.y + rr(-12, 12), kind: 'heal', val,
      vx: rr(-40, 40), vy: rr(-40, 40), life: 16, bob: rnd() * TAU,
    });
  };
  const rage = (val) => G.pickups.push({
    x: e.x + rr(-12, 12), y: e.y + rr(-12, 12), kind: 'rage', val,
    vx: rr(-40, 40), vy: rr(-40, 40), life: 16, bob: rnd() * TAU,
  });
  // 血量还富裕的时候小怪不掉治疗：满地药包既没人捡，也会把「回血」变成
  // 无限补给（实测普通难度曾掉出 498 个治疗 = 4104 点，而全局只承受 79 点）。
  // 治疗只在真的受伤之后才出现，玩家才会觉得「这个掉落是来救我的」。
  const needHeal = G.player.hp < G.player.maxHp * 0.75;
  if (e.tier === 2) {
    heal(16); heal(16);
    rage(45);
  } else if (e.tier === 1) {
    if (needHeal && rnd() < 0.30) heal(10);
    if (rnd() < 0.25) rage(22);
  } else {
    if (needHeal && rnd() < 0.012) heal(8);
    if (rnd() < 0.005) rage(15);
  }
}

export function hurtPlayer(amount, src) {
  const P = G.player;
  if (P.inv > 0 || G.phase !== 'run') return;
  let dmg = amount * G.mods.dmgTaken;
  dmg = Math.max(1, dmg - G.mods.armor);
  if (P.shield > 0) {
    const absorbed = Math.min(P.shield, dmg);
    P.shield -= absorbed;
    dmg -= absorbed;
    if (P.shield <= 0 && G.wheels.some((w) => w.key === 'shield_start')) shockwave(P.x, P.y, 150, 40, '#8ec5ff');
  }
  if (dmg > 0) {
    P.hp -= dmg;
    G.stats.taken += dmg;
    addText(P.x, P.y - 26, '-' + Math.round(dmg), 3);
    P.inv = PLAYER.iframe;
    G.flash = 0.5;
    G.shake = Math.min(8, G.shake + 3);
    // 打击反馈：火花 + 一道爪痕。爪痕带方向，玩家能立刻知道该往哪边闪，
    // 「贴上来直接掉血」和「被这边抓了一下」在体感上完全是两回事。
    burst(P.x, P.y, 7, '#ff7a6a', 170);
    if (src) {
      G.fx.push({
        x: P.x, y: P.y, vx: 0, vy: 0, kind: 'claw',
        a: Math.atan2(P.y - src.y, P.x - src.x),
        life: 0.34, max: 0.34, color: '#ff9a88', r: 2,
      });
    }
    if (G.mods.thorns > 0) shockwave(P.x, P.y, 90, G.mods.thorns, '#ff9d6e');
  }
  if (P.hp <= 0) {
    if (G.mods.revives > G.revived && G.phase === 'run') {
      G.revived++;
      P.hp = P.maxHp * 0.4;
      P.inv = 2;
      shockwave(P.x, P.y, 240, 80, '#ffd479');
      addText(P.x, P.y - 40, '复活', 2);
      G.shake = 14;
    } else {
      P.hp = 0;
      G.phase = 'over';
    }
  }
}

// ---------------------------------------------------------------- 拾取
function updatePickups(dt) {
  const P = G.player;
  const magnet = (G.mods.autoMagnet ? 9999 : PLAYER.magnetR) * (1 + G.mods.pick);
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i];
    p.life -= dt;
    if (p.life <= 0) { G.pickups.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt);
    p.bob += dt * 4;
    const dx = P.x - p.x, dy = P.y - p.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < magnet) {
      const pull = 260 + (1 - d / magnet) * 420;
      p.x += (dx / d) * pull * dt;
      p.y += (dy / d) * pull * dt;
    }
    const grab = p.kind === 'chest' || p.kind === 'wheel' ? 26 : 22;
    if (d < grab) {
      G.pickups.splice(i, 1);
      if (p.kind === 'exp') gainExp(p.val);
      else if (p.kind === 'heal') {
        P.hp = Math.min(P.maxHp, P.hp + p.val);
        addText(P.x, P.y - 30, '+' + p.val, 2);
        burst(P.x, P.y, 5, '#7de3a0', 120);
      } else if (p.kind === 'rage') {
        addRage(p.val, true);
        addText(P.x, P.y - 30, '+' + Math.round(p.val) + ' 狂气', 4);
        burst(P.x, P.y, 5, '#ff9350', 130);
      } else if (p.kind === 'chest') { G.pending++; addText(P.x, P.y - 34, '宝箱', 2); }
      else if (p.kind === 'wheel') { G.pending += 2; P.hp = Math.min(P.maxHp, P.hp + 30); }
    }
  }
  if (G.pending > 0 && G.phase === 'run') {
    const ch = rollChoices();
    if (ch.length) { G.choices = ch; G.phase = 'levelup'; }
    // 一张都抽不出来就别开弹窗了 —— 开出来也是死路，直接把这些次数消化掉
    else G.pending = 0;
  }
}

function gainExp(n) {
  G.exp += n * G.mods.exp;
  while (G.exp >= G.expNext) {
    G.exp -= G.expNext;
    G.lv++;
    G.expNext = expNeed(G.lv);
    G.pending++;
    // 升级顺带回 8% 血。这游戏没有任何被动回血，指望玩家 15 分钟一次不挨打
    // 不现实——实测三档难度全在 5 分钟左右被磨死，反而是「武器太强、场上
    // 没怪」和「摸一下就永久掉血」两件事同时发生。等级回复把续航挂到成长上，
    // 升得越快越耐打，是玩家能自己控制的续航来源。
    const P = G.player;
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.08);
  }
}

// ---------------------------------------------------------------- 刷怪
function updateSpawns(dt) {
  const d = G.diff;
  G.spawnT -= dt;
  if (G.spawnT <= 0) {
    G.spawnT = spawnGap(G.t) / d.rate;
    // 六成怪刷在「玩家正在走的方向」前方 ±51° 的扇形里。
    //
    // 均匀刷一圈听起来更公平，实际是灾难：玩家 108、小怪 92，一路向前跑
    // 的时候，刷在身后的怪净速度差 6/秒，永远追不上，也不会进入画面——
    // 实测跑两分钟，身后堆了 200 多只（把 MAX_ENEMY 占满），视野里却只有
    // 2~8 只，玩起来像在空地上跑。往前方偏置之后，怪是真的迎面而来。
    // 站着不动时 ix/iy 接近 0，自动退回均匀刷一圈。
    const mvx = G.player.ix || 0, mvy = G.player.iy || 0;
    if (Math.hypot(mvx, mvy) > 0.3 && rnd() < 0.6) {
      const face = Math.atan2(mvy, mvx);
      spawnEnemy(0, face + rr(-0.9, 0.9));
    } else {
      spawnEnemy(0);
    }
    // 偶尔成对刷：单个刷的话分布太规整，几百只排成等距的一条线很假
    if (rnd() < 0.3) spawnEnemy(0);
    // 每 30 秒来一圈「包围」，逼玩家动起来
    if (rnd() < 0.08) spawnRing(6 + Math.min(10, Math.floor(G.t / 60)));
  }
  G.eliteT -= dt;
  if (G.eliteT <= 0) {
    G.eliteT = ELITE_EVERY;
    spawnEnemy(1);
    spawnEnemy(1);
  }
  // Boss 预警分两段：
  //   出现前 2.5 秒 —— 屏幕边缘红光脉动（渲染层读 bossEta），给玩家收拢的时间；
  //   出现瞬间     —— 横幅「强敌降临 · 名字」+ 强震屏 + 一圈冲击波。
  // 之前只有一句飘字，玩家往往一抬头发现自己已经被围在中间了。
  if (G.bossIdx < BOSS_AT.length) {
    G.bossEta = BOSS_AT[G.bossIdx] - G.t;
    if (G.bossEta <= 0) {
      G.bossIdx++;
      G.bossEta = G.bossIdx < BOSS_AT.length ? BOSS_AT[G.bossIdx] - G.t : 999;
      const b = spawnEnemy(2);
      if (b) {
        b.hp = b.maxHp = Math.round(b.maxHp * (1 + G.bossIdx * 0.4));
        G.shake = 18;
        G.flash = 0.7;
        G.warn = 2.6;
        G.warnName = b.n;
        // 降临冲击只做视觉（伤害为 0 会让 damageEnemy 刷出一堆「0」飘字）
        G.fx.push({
          x: b.x, y: b.y, vx: 0, vy: 0, kind: 'ring',
          life: 0.7, max: 0.7, color: '#ff6a5a', r: 0, ring: 210,
        });
      }
    }
  } else {
    G.bossEta = 999;
  }
}

// ---------------------------------------------------------------- 对外摘要
export function summary() {
  const st = { kills: G.kills, t: G.t, lv: G.lv, bossKills: G.bossKills };
  const base = scoreOf(st);
  return {
    ...st,
    score: Math.round(base * G.diff.mul),
    diff: G.diff.k,
    char: G.char ? G.char.n : '',
    charImg: G.char ? G.char.img : null,
    win: G.phase === 'win',
    gaveUp: !!G.gaveUp,
    // 每个技能的伤害明细：结算面板靠它回答「到底哪把武器在干活」。
    // 引擎只给原始数字，百分比和条形由 UI 算 —— 免得以后改算法还要动这里。
    weapons: G.weapons
      .map((w) => ({
        id: w.def.id, n: w.def.n, char: w.def.charName, charId: w.def.char,
        lv: w.lv + 1, proto: w.def.proto,
        color: (PROTOS[w.def.proto] || {}).color || '#9ecbff',
        dmg: Math.round(w.dmgTotal || 0), hits: w.hits || 0,
      }))
      .sort((a, b) => b.dmg - a.dmg),
    totalDmg: Math.round(G.stats.dmg || 0),
    rageDmg: Math.round(G.stats.rageDmg || 0),
    rageUsed: G.rageUsed,
    passives: G.passives.map((p) => ({ id: p.id, n: p.n, stack: p.stack, fx: p.fx })),
    wheels: G.wheels.map((w) => ({ idx: w.idx, n: w.n, key: w.key })),
    covs: G.covs.map((c) => ({ idx: c.idx, n: c.n, key: c.key })),
    taken: Math.round(G.stats.taken || 0),
  };
}

export function remaining() { return Math.max(0, RUN_TIME - G.t); }

