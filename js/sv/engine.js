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
  PROTOS, LV, CREATION_FX, CREATION_STACK, WHEEL_FX, COVENANT_FX, EVOS,
  RUN_TIME, DIFFS, spawnGap, hpScale, dmgScale, BOSS_AT, ELITE_EVERY, eliteGap, eliteCount,
  PLAYER, expNeed, scoreOf,
  MAX_WEAPON, POOL_PER_PROTO, RAGE, TERRAINS, terrainAt,
  MECHS, GROWTHS, ITEMS, ITEM_MAX, VOICE, ERODE,
} from './defs.js';
import { isUnlocked, recordRun } from './unlock.js';
import { META, CHARS, WEAPONS, MOBS, CREATIONS, WHEELS, COVENANTS, BOSS_CAT, BOSS_MIJIU } from './gen.js';
import { sfx } from './audio.js';
import { VOICES } from './voices.js';

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
  // 「这次不要」补的狂气，攒到回到战斗再飘字
  skipPop: 0,
  // Boss 警报：bossEta 是「还有几秒出现」（<2.5 时渲染层做边缘预警），
  // warn 是「已经出现、横幅还剩几秒淡出」。
  bossEta: 999, warn: 0, warnName: '',
  // 地形：idx 变一次，渲染层就重建一次地面 pattern；fade 负责交叉淡化
  terrainIdx: 0, terrainFade: 0,
  // 主动收兵：和「被打死」一样走 over，只是结算文案与得分口径要区别对待
  gaveUp: false,
  // 超武觉醒播报队列（由 refreshEvo 入队，update 在战斗帧里消费）
  evoQueue: [],
  // 已经播报过、等界面取走弹「超武觉醒」卡的条目。UI 每帧取一次，
  // 取空就什么都不做 —— 这样引擎不用知道 DOM 长什么样。
  evoPops: [],
  // 场上有没有首领：BGM 靠它切到 boss 层（每 0.4 秒扫一次，不逐帧算）
  bossAlive: false, bossScanT: 0,
  // 神秘唤醒体与彩蛋角色的独有机制状态：stacks 是累积层（王权 / 节拍 / 鼠群），
  // low 是威廉的「血量低于 40%」开关，t 是通用冷却计时，flag 是一次性开关
  // （入梦免死用过没有、90 秒是否已经切过档）。
  mech: { id: null, stacks: 0, low: false, procs: 0, t: 0, flag: false, cd: 0 },
  // 最终隐藏首领：弥萨格校猫。三只首领都清掉、且撑到最后 30 秒才登场，
  // 一局只来一次 —— spawned/killed 都要进存档摘要，用来给结算加一行。
  catSpawned: false, catKilled: false, catIdx: -1,
  // 第二位隐藏首领：米酒（脑缸组的战斗设计师）。校猫放学之后他才来验收，
  // 条件挂在 catKilled 上而不是时间上 —— 没打到校猫这一步，他不必出场。
  mjSpawned: false, mjKilled: false, mjIdx: -1, mjT: 0,
  // 角色台词气泡。voice 是当前这句（t 倒数到 0 收），voiceAt 是上一次说话的
  // 时间戳（全局冷却），voiceDelay 用来把开场的「唤醒」台词延后一点，
  // 免得和选人面板/首屏 UI 同时出现。
  voice: null, voiceAt: -99, voiceDelay: 0,
  // 后期成长与一次性道具
  growth: [], items: [],
  // 悖论的伤害回响池：每 0.5 秒把这段时间的输出记一笔，滚动保留 3 秒
  echo: [],
  world: { w: 2400, h: 2400 },  // 只在绘制里当世界参考，玩家其实不设边界
  stats: { dmg: 0, taken: 0 },
};

const emptyMods = () => ({
  atk: 1, cd: 1, area: 1, spd: 1, pick: 1, exp: 1,
  crit: PLAYER.critBase, critMul: PLAYER.critMul,
  dmgTaken: 1, regen: 0, armor: 0, lifesteal: 0,
  pierce: 0, dmgMul: 1, enemySlow: 1, revives: 0,
  summonBonus: 0, summonDmg: 1, fieldWide: 1, healDrop: 0, thorns: 0,
  maxHpBonus: 0, maxShieldBonus: 0, frenzy: 0, echo: 0,
  rageGain: 0,
  // 2026-10 造物扩容带来的新维度：投射物数量 / 飞行速度 / 射程 / 持续时间 /
  // 击退 / 领域半径 / 治疗量。每一个都在下面某个更新函数里真实生效，
  // 否则造物卡面就是骗人的（用户提的第 3 条要求）。
  count: 0, projSpd: 1, projRange: 1, dur: 1, knock: 1,
  fieldRadius: 1, healBoost: 1,
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

// ---------------------------------------------------------------- 角色台词
// 每个唤醒体在 wiki 上都有成套台词（技能·一 / 技能·二 / 狂气爆发 / 灵知觉醒 /
// 受击 / 获得提升 / 唤醒）。这里只负责「挑时机说一句」，气泡怎么画在 render.js。
//
// 三条克制：
//   1. 全局冷却 VOICE.cd —— 技能一秒能触发好几次，次次念就是噪音；
//   2. force 只给「爆发 / 觉醒 / 唤醒」这种一局没几次的事件；
//   3. 没有台词的角色（N / 威廉 / 守密人 在 wiki 上没有词条）就安静，
//      不拿别人的台词凑数。
function voiceOf(id) {
  return VOICES[id] || null;
}

export function say(slot, force) {
  const c = G.char;
  if (!c || G.phase !== 'run') return false;
  const v = voiceOf(c.id);
  if (!v) return false;
  let txt = v[slot];
  if (!txt) return false;
  if (!force) {
    if (G.t - G.voiceAt < VOICE.cd) return false;
    if (G.voice && G.voice.t > VOICE.dur * 0.45) return false;  // 上一句还没说完
  }
  if (txt.length > VOICE.maxChars) txt = `${txt.slice(0, VOICE.maxChars - 1)}…`;
  G.voice = { txt, t: VOICE.dur, max: VOICE.dur, name: c.n, slot };
  G.voiceAt = G.t;
  return true;
}

// 技能触发时说话：w.id 形如 "awakener-0001:0"，尾号 0/1 正好对上「技能·一/二」。
function maybeSkillVoice(w) {
  if (!G.char || String(w.def.char) !== String(G.char.id)) return;
  if (Math.random() > VOICE.skillChance) return;
  say(String(w.def.id).endsWith(':1') ? 's2' : 's1', false);
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
  G.skipPop = 0;
  G.bossEta = BOSS_AT[0]; G.warn = 0; G.warnName = '';
  G.terrainIdx = terrainAt(0); G.terrainFade = 0;
  G.gaveUp = false;
  G.evoQueue = [];
  G.evoPops = [];
  G.bondOn = {};
  G.bossAlive = false; G.bossScanT = 0;
  G.growth = [];
  G.items = [];
  G.echo = [];
  G.echoT = 0; G.echoMark = 0;
  // cr / crId / crKind / crN 是「融蚀」的运行时状态（萨摩不耶的第二机制）：
  // cr 是剩余秒数，crId 指向这一轮被按下去的那一格技能或造物。
  G.mech = { id: null, stacks: 0, low: false, procs: 0, t: 0, flag: false, cd: 0,
    cr: 0, crId: null, crKind: '', crN: '', crCd: 0, crTimes: 0 };
  G.catSpawned = false; G.catKilled = false;
  // MOBS 里带 cat 标记的那一条就是校猫。用 index 而不是 id 查，是因为
  // spawnEnemy 本身按数组下标取 def；查一次存起来，省得每帧 find。
  G.catIdx = MOBS.findIndex((m) => m && m.cat);
  G.mjSpawned = false; G.mjKilled = false; G.mjT = 0;
  G.mjIdx = MOBS.findIndex((m) => m && m.mj);
  G.voice = null; G.voiceAt = -99; G.voiceDelay = VOICE.wakeDelay;
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

  // 神秘唤醒体的机制是「这名角色的规则」，不随装备变化，但要在 recompute
  // 里一起算 —— 否则每次拿造物重算 mods 都会被抹掉。
  const mm = MECHS[c.id];
  G.mech.id = mm ? mm.id : null;

  const P = G.player;
  P.x = 0; P.y = 0; P.vx = 0; P.vy = 0; P.kx = 0; P.ky = 0;
  P.maxHp = PLAYER.hp + G.mods.maxHpBonus;
  P.hp = P.maxHp; P.shield = 0; P.inv = 0; P.face = 1; P.walk = 0;
  P.shieldBroke = false;

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
  // 未解锁的神秘唤醒体，技能一条都不进池 —— 这是「抽不到」而不是「抽到了
  // 但用不了」，玩家不会在选人面板之外的地方看到他们的名字（连技能卡都不出现）。
  // 解锁判定在这里读一次，整局不变：中途改 localStorage 也不该改变这一局的牌堆。
  const locked = new Set();
  for (const ch of CHARS) {
    if (ch.lock && !isUnlocked(ch.lock)) locked.add(String(ch.id));
  }
  const byProto = {};
  for (const w of WEAPONS) {
    if (pool.has(w.id) || (mine[0] && w.id === mine[0].id)) continue;
    if (locked.has(String(w.char))) continue;
    // 彩蛋角色的技能只在本人手上出现（mine[1] 已经在上面入池了）。
    // 否则 73 个人共用一副牌，普通角色一升级就能抽到「不耶连拍」，
    // 彩蛋就不再是彩蛋，而是所有人的常规武器。
    if (w.egg) continue;
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
    const hl = WEAPONS.filter((w) => w.proto === 'heal' && !w.egg && !(mine[0] && w.id === mine[0].id));
    if (hl.length) pool.add(hl[(rnd() * hl.length) | 0].id);
  }
  // 羁绊保底：彩蛋角色的羁绊对象必须抽得到，否则那条羁绊只是一行文案 ——
  // 三选一里永远不出现「血链·希洛」的技能，玩家再怎么打也达不成。
  // 已经因为「每原型两把」进池的就跳过，不白占位置；否则优先挑原型还没被占的那把。
  for (const b of c.bonds || []) {
    const owned = (id) => {
      const w = WEAPONS.find((x) => x.id === id);
      return w && String(w.char) === String(b.cid);
    };
    if ([...pool].some(owned)) continue;
    const cand = WEAPONS.filter((w) => String(w.char) === String(b.cid) && !w.egg
      && !(mine[0] && w.id === mine[0].id));
    const protoTaken = (proto) => [...pool].some((id) => {
      const o = WEAPONS.find((x) => x.id === id);
      return o && o.proto === proto;
    });
    const pick = cand.find((w) => !protoTaken(w.proto)) || cand[0];
    if (pick) pool.add(pick.id);
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
  // 神秘唤醒体的固有机制。王权的层数会随击杀变化，所以它必须走 recompute：
  // 击杀到整十的时候调一次，比每帧改 mods 便宜，也不会和造物互相覆盖。
  const mech = G.mech && G.mech.id;
  if (mech === 'royalty') {
    const s = G.mech.stacks || 0;
    base.atk += s * 0.012;
    base.area += s * 0.004;
  } else if (mech === 'paradox') {
    base.cd *= 0.92;
    base.maxHpBonus -= 12;
  } else if (mech === 'seal') {
    base.exp *= 1.45;
  } else if (mech === 'nightwatch' && G.mech.low) {
    base.atk += 0.35;
    base.maxShieldBonus += 50;
  } else if (mech === 'samobeat') {
    // 节拍：每拍 +1.5% 攻击，30 拍封顶 = +45%。层数只在击杀时变，
    // 所以和「王权」一样走 recompute，不做每帧改 mods。
    base.atk += (G.mech.stacks || 0) * 0.015;
    // 融蚀：拿命换的火力。触发与结束各重算一次就够，不每帧改 mods。
    if (G.mech.cr > 0) base.atk += ERODE.atk;
  } else if (mech === 'dragonscale') {
    base.dmgTaken *= 0.85;
    base.maxShieldBonus += 50;      // 基础 30 → 80，约 +40% 上限
  } else if (mech === 'zerokr') {
    // 立誓：前 90 秒猛，之后回落到一个小加成。90 秒那道坎由 updateMech 触发重算。
    base.atk += G.mech.flag ? 0.08 : 0.5;
    if (!G.mech.flag) base.spd += 0.12;
  } else if (mech === 'blossom') {
    base.regen += 0.4;
  } else if (mech === 'starlit') {
    base.crit += 0.08;
    base.critMul += 0.15;
  } else if (mech === 'gatekeep') {
    base.maxShieldBonus += 30;      // 基础 30 → 60，约 +30% 上限
    base.spd -= 0.08;               // 走得慢是设定：他本来就在遛弯
  }
  // 羁绊：彩蛋角色和某位官方唤醒体的专属联动。判定只看「手上有没有那个人的技能、
  // 练到几级」——技能被替换掉就自然失效，不需要额外的清理逻辑。
  const bonds = (c && c.bonds) || [];
  if (!G.bondOn) G.bondOn = {};
  for (const b of bonds) {
    const w = G.weapons.find((x) => String(x.def.char) === String(b.cid));
    const on = !!w && w.lv >= (b.need || 1);
    if (!on) { G.bondOn[b.n] = false; continue; }
    if (b.fx) {
      if (b.fx.mul) for (const k in b.fx.mul) if (typeof base[k] === 'number') base[k] *= b.fx.mul[k];
      if (b.fx.add) for (const k in b.fx.add) if (typeof base[k] === 'number') base[k] += b.fx.add[k];
    }
    // 第一次达成才播报，用 t > 1 当门槛就够了：开局 t=0 时弹出的卡莫名其妙，
    // 而升级那一刻 phase 是 levelup（不是 run），拿 phase 判会把播报整个吃掉。
    if (!G.bondOn[b.n] && G.t > 1) {
      if (!G.evoPops) G.evoPops = [];
      G.evoPops.push({
        kind: 'bond', char: c.id, n: b.n, from: b.alias || b.cname,
        txt: b.text, need: { level: b.need || 1 },
      });
      addText(G.player.x, G.player.y - 58, `羁绊 · ${b.n}`, 6);
      sfx.play('evo');
    }
    G.bondOn[b.n] = true;
  }
  Object.assign(m, base);

  // 融蚀压下去的是造物时，这一格的每一层加成都不参与本次重算 ——
  // 跳过比重算完再减回去干净，也不会在 ui 的加成明细里留下半条。
  const muteId = G.mech && G.mech.cr > 0 ? String(G.mech.crId) : null;
  for (const p of G.passives) {
    if (muteId && String(p.id) === muteId) continue;
    for (let i = 0; i < p.stack; i++) applyCreation(p, m);
  }
  for (const w of G.wheels) applyWheel(w.key, m);
  for (const v of G.covs) applyCovenant(v.key, m);
  // 后期成长：每一项都是永久叠加，所以和造物一样逐层重放
  for (const g of G.growth) applyGrowth(g, m);

  // 融蚀期间「命更薄」：上限按比例削，当前血在下一行统一夹一次。
  // 削上限而不是记一笔伤害 —— 融蚀退去时不该凭这笔「伤害」把血还回来。
  const erodeOn = !!(G.mech && G.mech.cr > 0);
  G.player.maxHp = Math.round((PLAYER.hp + m.maxHpBonus) * (erodeOn ? ERODE.hp : 1));
  G.player.maxShield = Math.round(30 + m.maxShieldBonus);
  if (G.player.hp > G.player.maxHp) G.player.hp = G.player.maxHp;
  refreshEvo();
}

// ---------------------------------------------------------------- 超武判定
// 一把武器是否升格成超武，只取决于「造物/命轮/自身等级」三件事，
// 所以每次 recompute（拿造物）和每次武器升级之后都要重判一次。
function evoFor(w) {
  for (const e of EVOS) {
    // 专武按角色绑定：只看「这把技能是不是这名唤醒体的」
    if (e.char) { if (String(e.char) !== String(w.def.char)) continue; }
    else if (e.proto !== w.def.proto) continue;
    if (checkNeed(e.need, w)) return e;
  }
  return null;
}

function checkNeed(need, w) {
  if (!need) return true;
  if (need.level != null && w.lv < need.level) return false;
  if (need.wheel && !G.wheels.some((x) => x.key === need.wheel)) return false;
  if (need.proto && !G.weapons.some((x) => x.def.proto === need.proto)) return false;
  if (need.creation) {
    const { fx, n } = need.creation;
    let got = 0;
    for (const p of G.passives) if (p.fx === fx) got += p.stack;
    if (got < n) return false;
  }
  return true;
}

// 重新判定并给出觉醒提示。只在「这一次真的变化了」时记一条，
// 否则每拿一件造物都会把整排武器的名字再飘一遍。
// 记进队列而不是直接飘字：拿造物发生在升级弹窗里，那一刻飘字会被弹窗盖住，
// 玩家什么都看不见。等回到战斗第一帧再放。
function refreshEvo() {
  for (const w of G.weapons) {
    const evo = evoFor(w);
    if (evo === w.evo) continue;
    w.evo = evo;
    if (evo) {
      if (!G.evoQueue) G.evoQueue = [];
      // 不能只记名字：玩家「突然就多了一个超武」，根本不知道是哪把技能变的、
      // 变成的这个东西到底干什么。所以连带来源技能、效果文案、达成条件一起带出去，
      // 界面才有东西可展示。
      G.evoQueue.push({
        id: evo.id, n: evo.n, txt: evo.txt, color: evo.color, need: evo.need,
        from: w.def.n, charName: w.def.charName, lv: w.lv,
        frame: META.frames['c:' + w.def.char], char: w.def.char,
      });
    }
  }
}

function applyCreation(p, m) {
  const fx = CREATION_FX[p.fx];
  if (!fx) return;
  switch (fx.k) {
    case 'atk': m.atk += fx.v; if (p.fx === 'str') m.dmgTaken += 0.03; break;
    case 'crit': m.crit += fx.v; break;
    case 'critMul': m.critMul += fx.v; break;
    case 'maxHp': m.maxHpBonus += fx.v; break;
    case 'maxShield': m.maxShieldBonus += fx.v; break;
    case 'pick': m.pick += fx.v; if (p.fx === 'draw') m.exp += 0.06; break;
    case 'cd': m.cd *= (1 + fx.v); break;
    case 'rage': m.rageGain += fx.v; m.atk += 0.02; break;
    case 'dmgTaken': m.dmgTaken += fx.v; m.dmgMul += 0.06; break;
    case 'spd': m.spd += fx.v; break;
    case 'regen': m.regen += fx.v; break;
    case 'area': m.area += fx.v; break;
    // ---- 2026-10 新增的造物维度
    case 'count': m.count += fx.v; break;
    case 'pierce': m.pierce += fx.v; break;
    case 'projSpd': m.projSpd += fx.v; break;
    case 'projRange': m.projRange += fx.v; break;
    case 'dur': m.dur += fx.v; break;
    case 'knock': m.knock += fx.v; break;
    case 'fieldRadius': m.fieldRadius += fx.v; break;
    case 'healBoost': m.healBoost += fx.v; break;
    case 'lifesteal': m.lifesteal += fx.v; break;
    case 'thorns': m.thorns += fx.v; break;
    case 'exp': m.exp += fx.v; break;
    case 'summon': m.summonBonus += fx.v; break;
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
    // 描述写的是「召唤物 +2，且伤害 +25%」，原来只加了数量 —— 少的那半句
    // 就是典型的「描述和实际对不上」，这里补上。
    case 'summon_extra': m.summonBonus += 2; m.summonDmg += 0.25; break;
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
    // 超武（质变）技能不能被替换下去。
    // 以前这里直接在所有技能里找「等级最低的那把」兜底，而通用超武往往是
    // 靠造物凑出来的、等级并不高 —— 于是「换流派」会静悄悄换掉一个超武，
    // 玩家只会觉得是 bug。现在让位对象只在没质变的技能里挑；
    // 六格全是质变时宁可不换（返回 null，调用方自己兜底）。
    const pool = G.weapons.filter((x) => !x.evo);
    if (!pool.length) return null;
    const target = pool.find((x) => x.def.id === replaceId)
      || pool.reduce((a, b) => (a.lv <= b.lv ? a : b), pool[0]);
    if (!target) return null;
    // 环绕光刃是常驻实体，换掉武器时要把对应的刀刃也作废，
    // 否则场上会留下一圈没人维护、伤害不再更新的刀刃。召唤物同理。
    for (const o of G.orbs) if (o.w === target) o.dead = true;
    for (let i = G.summons.length - 1; i >= 0; i--) if (G.summons[i].src === target) G.summons.splice(i, 1);
    target.def = def;
    target.lv = 0;
    target.timer = rr(0.1, 0.4);
    target.cdMax = cdMax;
    // HUD 的冷却遮罩读的是 cdLeft/cdMax，不重置的话新技能一上手就顶着满格暗条，
    // 要等自己放一次才恢复正常 —— 玩家会以为新技能在冷却里卡住了。
    target.cdLeft = target.timer;
    target.orb = null;
    // 伤害归因也要清空：不清的话结算面板会把上一把武器的战绩算到新技能头上，
    // 「替换后逻辑是否正确」在这一条上本来是错的。
    target.dmgTotal = 0;
    target.hits = 0;
    target.evo = null;
    refreshEvo();
    return target;
  }
  const w = { def, lv: 0, timer: rr(0.1, 0.5), ang: rnd() * TAU, cdMax, cdLeft: 0, evo: null };
  G.weapons.push(w);
  refreshEvo();
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

// ---------------------------------------------------------------- 后期成长
// 造物有 8 件上限、技能有 6 格上限、命轮契物各有张数上限 —— 一局打到 10 分钟
// 之后这些线会同时见底，三选一就只剩「这次不要」。极限淬炼就是补在见底之后
// 的那条线：数值小（3% 一档），但没有上限，玩家攒得再久都有东西可选。
function applyGrowth(g, m) {
  const fx = g.fx || {};
  if (fx.atk) m.atk += fx.atk;
  if (fx.crit) m.crit += fx.crit;
  if (fx.critMul) m.critMul += fx.critMul;
  if (fx.maxHpBonus) m.maxHpBonus += fx.maxHpBonus;
  if (fx.regen) m.regen += fx.regen;
  if (fx.cd) m.cd *= fx.cd;
  if (fx.spd) m.spd *= fx.spd;
  if (fx.area) m.area += fx.area;
  if (fx.fieldRadius) m.fieldRadius += fx.fieldRadius;
  if (fx.dur) m.dur += fx.dur;
}

export function addGrowth(id) {
  const meta = GROWTHS.find((g) => g.id === id);
  if (!meta) return null;
  G.growth.push({ id: meta.id, n: meta.n, icon: meta.icon, fx: meta.fx, stack: 1 });
  recompute();
  return G.growth[G.growth.length - 1];
}

// 一次性道具：拿到就进背包，用掉就没了。持有上限 3 件，
// 所以后期真正要做的是「留哪几件」而不是无脑全收。
export function addItem(id) {
  const meta = ITEMS.find((i) => i.id === id);
  if (!meta) return null;
  if (G.items.length >= ITEM_MAX) return null;
  const o = { id: meta.id, n: meta.n, icon: meta.icon, color: meta.color, txt: meta.txt };
  G.items.push(o);
  return o;
}

// 使用一件道具。返回是否真的用掉了 —— UI 靠它决定要不要刷道具栏。
export function useItem(id) {
  const i = G.items.findIndex((x) => x.id === id);
  if (i < 0) return false;
  const it = G.items[i];
  if (it.id === 'i_medkit') {
    const P = G.player;
    if (P.hp >= P.maxHp) return false;   // 满血就别浪费
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.45);
  } else if (it.id === 'i_nuke') {
    // 「约 3 秒的输出量」：取最近回响池的总和，保底给一个能在后期清场的数值
    const bank = (G.echo || []).reduce((a, b) => a + b, 0);
    const hit = Math.max(220, bank * 1.2);
    for (const e of G.enemies) damageEnemy(e, hit, G.player.x, G.player.y, null);
    G.flash = 0.6; G.shake = Math.max(G.shake, 14);
    G.fx.push({ x: G.player.x, y: G.player.y, vx: 0, vy: 0, life: 0.6, max: 0.6, color: '#ff7a45', r: 0, ring: 900, kind: 'ring' });
    addText(G.player.x, G.player.y - 60, '湮灭', 6);
  } else if (it.id === 'i_rage') {
    G.rage = RAGE.max; G.rageReady = true;
    addText(G.player.x, G.player.y - 50, '狂气满盈', 6);
  } else if (it.id === 'i_dice') {
    // 重掷本次三选一：只允许在升级面板开着的时候用，否则等于白扔
    if (G.phase !== 'levelup') return false;
    G.choices = rollChoices();
    addText(G.player.x, G.player.y - 50, '命运重掷', 6);
    return true;   // 不消耗：由 UI 在刷新卡面后再决定
  }
  G.items.splice(i, 1);
  return true;
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
    if (o.kind === 'growth') return 'g:' + o.g.id;
    if (o.kind === 'item') return 'i:' + o.it.id;
    return 'cv:' + o.i;
  };
  const add = (o) => { const k = keyOf(o); if (!seen.has(k)) { seen.add(k); out.push(o); } };

  // 1. 武器：优先已拥有且未满级的（升级），再补候选池里的新武器
  const ups = G.weapons.filter((w) => w.lv < LV.max);
  // 羁绊武器：buildPool 保底放进候选池的那一把是给羁绊留的。池子三十多把、
  // 「新武器」又只占 18%，纯均匀随机会变成整局一次都抽不到 —— 羁绊等于不存在。
  // 所以把它单独拎成一组给权重；已经拿到（或羁绊已达成）就和普通新武器一样。
  const bondDefs = [];
  for (const b of (G.char && G.char.bonds) || []) {
    if (G.bondOn && G.bondOn[b.n]) continue;
    for (const id of G.candidatePool) {
      const d = WEAPONS.find((w) => w.id === id);
      if (d && String(d.char) === String(b.cid)
        && !G.weapons.some((w) => w.def.id === d.id)
        && !bondDefs.includes(d)) bondDefs.push(d);
    }
  }
  const bondIds = new Set(bondDefs.map((d) => d.id));
  const news = G.candidatePool
    .map((id) => WEAPONS.find((w) => w.id === id))
    .filter((d) => d && !bondIds.has(d.id) && !G.weapons.some((w) => w.def.id === d.id));
  const weaponSlot = G.weapons.length < MAX_WEAPON;
  // 六格都是质变技能时不能换（换掉哪个都纯亏），wnew / 羁绊两组都要看这个
  const canSwap = G.weapons.some((w) => !w.evo);
  const wpool = [];
  for (const w of ups) wpool.push({ kind: 'wlv', w });
  if (weaponSlot) {
    for (const d of news) wpool.push({ kind: 'wnew', def: d });
  } else {
    // 满了也照抽，只是变成「替换」。要让位的那一把交给玩家自己选 ——
    // 以前固定换等级最低的，想换掉一把满级却不合流派的技能根本没门路。
    //
    // 但六格全是质变技能时不再给替换卡：换掉哪个都是纯亏，
    // 玩家只会觉得「我明明都超武了，怎么还逼我换」。这种情况直接不给新武器。
    if (canSwap) {
      for (const d of news) wpool.push({ kind: 'wswap', def: d, drop: null });
    }
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

  // 类别权重：武器升级 42 / 新武器 18 / 替换 16 / 造物 30 / 命轮 8 / 契物 2 / 羁绊 8。
  // 先按类别抽，再从类别内部均匀抽 —— 之前把类别权重除以了池子大小，
  // 结果造物（42 件）把武器（十来件）的份额整个吃掉了，十几次升级一次武器都升不到。
  //
  // 后期两条线（淬炼 / 道具）在「6 格技能全满级」之后才解锁：
  // 那时候 wlv/wnew/wswap 三个池子同时空了，只剩造物和命轮，
  // 而造物 8 件叠满也要不了多久 —— 不给新东西，后半局就只剩「这次不要」。
  const allMax = G.weapons.length >= MAX_WEAPON && G.weapons.every((w) => w.lv >= LV.max);
  const gpool = allMax ? GROWTHS.map((g) => ({ kind: 'growth', g })) : [];
  const ipool = allMax && G.items.length < ITEM_MAX
    ? ITEMS.filter((i) => !G.items.some((x) => x.id === i.id)).map((it) => ({ kind: 'item', it }))
    : [];

  const groups = [
    { w: 42, list: wpool.filter((o) => o.kind === 'wlv') },
    { w: 18, list: wpool.filter((o) => o.kind === 'wnew') },
    { w: 16, list: wpool.filter((o) => o.kind === 'wswap') },
    // 羁绊：权重给 8（每次三选一约 18% 会带出这张卡），不占大头但也绝不是摆设。
    // 试过 20，结果第一次升级就必出，羁绊变成白送；8 大概是「三四次升级内能遇到」。
    // 拿到之后这一组自动消失，不会长期挤占别人的份额。
    { w: 8, list: weaponSlot
      ? bondDefs.map((d) => ({ kind: 'wnew', def: d }))
      : (canSwap ? bondDefs.map((d) => ({ kind: 'wswap', def: d, drop: null })) : []) },
    { w: 30, list: cpool },
    { w: 8, list: wlpool },
    { w: 2, list: cvpool },
    { w: 16, list: gpool },
    { w: 9, list: ipool },
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
  else if (o.kind === 'wnew') {
    // 加不进去（六格全是质变技能时会返回 null）要说一声，
    // 否则这张卡像是凭空消失，玩家只会以为卡了。
    if (!addWeapon(o.def.id)) addText(G.player.x, G.player.y - 44, '六格都是超武 · 无法替换', 3);
  }
  else if (o.kind === 'wswap') {
    // dropId 来自「替换选择面板」：玩家自己指定让位的那把技能
    if (!addWeapon(o.def.id, o.dropId || (o.drop && o.drop.def ? o.drop.def.id : null))) {
      addText(G.player.x, G.player.y - 44, '六格都是超武 · 无法替换', 3);
    }
  }
  else if (o.kind === 'creation') addCreation(o.c.id);
  else if (o.kind === 'wheel') addWheel(o.i);
  else if (o.kind === 'cov') addCovenant(o.i);
  else if (o.kind === 'growth') addGrowth(o.g.id);
  else if (o.kind === 'item') addItem(o.it.id);
  // 专武的条件是「这把技能练到 4 级」，升级本身不会走 recompute，
  // 所以每次选完都要重判一次超武状态。
  // 技能等级 / 持有变了 → 羁绊可能刚好达成（或者被换掉后失效），必须重算一次。
  // recompute 内部会再调 refreshEvo，下面那行留着是为了「不加技能也重判超武」这条路径。
  if (o.kind === 'wlv' || o.kind === 'wnew' || o.kind === 'wswap') recompute();
  refreshEvo();
  if (G.mods.timeDilate) G.dilate = 3;
  advancePending();
}

// 什么都不选：玩家明确要的「这次不要」。技能栏满了、造物都叠满了之后，
// 强行塞东西反而是负收益，所以留一个出口。
//
// 出口不能白给：放弃的是一次成长，补一小截狂气（RAGE.skip），让「跳过」在
// 后期成为一种选择而不是一种损失。狂气已经满了就不给 —— 那会白白浪费。
export function skipChoice() {
  let gained = 0;
  if (!G.rageReady && G.rageT <= 0) {
    gained = Math.min(RAGE.skip, RAGE.max - G.rage);
    if (gained > 0) {
      G.rage = Math.min(RAGE.max, G.rage + gained);
      if (G.rage >= RAGE.max) G.rageReady = true;
      // 飘字留到回到战斗再放：现在 phase 还是 levelup，字会被弹窗盖住
      G.skipPop = Math.round(gained);
    }
  }
  sfx.play('skip');
  advancePending();
  return gained;
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

function spawnEnemy(tier, ax, ay, forceIdx) {
  if (G.enemies.length >= MAX_ENEMY) return null;
  const normals = [];
  if (forceIdx != null) {
    // 指定怪（隐藏首领用）：绕开随机池，直接按索引取
    normals.push(forceIdx);
  } else {
    for (let i = 0; i < MOBS.length; i++) {
      const d0 = enemyDef(i);
      // hidden 的那条（弥萨格校猫）不进普通首领轮换，否则第 5 分钟就能撞见它
      if (d0.m.hidden) continue;
      if (d0.tier === tier) normals.push(i);
    }
  }
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
  // 守密人的缄默契约：敌人整体更硬，换经验 +45%（在 recompute 里给的）
  if (G.mech && G.mech.id === 'seal') e.maxHp = Math.round(e.maxHp * 1.12);
  e.hp = e.maxHp;
  e.dmg = d.base.dmg * G.diff.dmg * dmgScale(G.t);
  e.spd = d.base.spd * G.diff.spd * G.mods.enemySlow * rr(0.94, 1.06);
  e.tier = tier;
  e.img = d.img;
  e.n = d.m.n;
  e.flash = 0; e.kx = 0; e.ky = 0; e.wob = rnd() * TAU;
  e.hitCd = 0;
  // 迟滞 / 定身：由审判柱、长明灯、封印书页写入，主循环里逐帧衰减
  e.slowT = 0; e.slowMul = 1; e.bindT = 0;
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
  // 造物的「弹道速度」对射线不生效：射线是持续拉出的判定，速度只影响它扫过
  // 画面的快慢，加速等于变相缩短存在时间，手感会变得莫名其妙。
  const ks = opt.kind === 'ray' ? 1 : G.mods.projSpd;
  b.x = x; b.y = y;
  b.vx = vx * ks; b.vy = vy * ks;
  b.r = opt.r || 6;
  b.dmg = opt.dmg;
  b.life = (opt.life || 1.4) * G.mods.projRange;
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

  // ---- 超武觉醒播报：升级弹窗里判定出来的超武，等回到战斗再飘出来。
  // 除了飘字，还要交给界面弹一张说明卡 —— 只在头顶飘个名字，玩家记不住效果。
  if (G.evoQueue && G.evoQueue.length) {
    while (G.evoQueue.length) {
      const evo = G.evoQueue.shift();
      addText(P.x, P.y - 66, `超武 · ${evo.n}`, 6);
      if (!G.evoPops) G.evoPops = [];
      G.evoPops.push(evo);
      sfx.play('evo');
      // 觉醒念的是「灵知觉醒」那句 —— 游戏里灵知觉醒就是这件事。
      say('evo', true);
    }
    G.flash = Math.max(G.flash, 0.3);
    G.shake = Math.min(12, G.shake + 5);
  }

  // ---- 角色台词：开场那句「唤醒」延后到 UI 稳定之后再念，其余是倒计时收尾
  if (G.voiceDelay > 0) {
    G.voiceDelay -= dt;
    if (G.voiceDelay <= 0) { G.voiceDelay = 0; say('wake', true); }
  } else if (G.voice) {
    G.voice.t -= dt;
    if (G.voice.t <= 0) G.voice = null;
  }

  // ---- 狂气爆发计时
  if (G.rageT > 0) {
    G.rageT -= dt;
    if (G.rageT <= 0) { G.rageT = 0; addText(P.x, P.y - 30, '狂气消退', 5); }
  }

  // ---- 「这次不要」补的狂气：跳过发生在升级弹窗里，那时飘字会被盖住，
  // 所以等回到战斗的第一帧再报出来。
  if (G.skipPop) {
    addText(P.x, P.y - 40, '+' + G.skipPop + ' 狂气', 4);
    G.skipPop = 0;
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
  // 王权 15 层起每秒回 1 点：图鲁的续航来源，和「升级回 8%」是两条线，
  // 后者靠经验，前者靠杀得动 —— 杀不动的时候它也救不了你。
  if (G.mech && G.mech.id === 'royalty' && G.mech.stacks >= 15) {
    P.hp = Math.min(P.maxHp, P.hp + dt);
  }
  // 威廉的守夜：跨过 40% 这条线时才重算一次 mods（atk +35%、护盾上限 +50%）。
  // 每帧都算的话 mods 会被反复覆盖，而且 maxShield 抖动会让护盾条一直闪。
  if (G.mech && G.mech.id === 'nightwatch') {
    const low = P.hp < P.maxHp * 0.4;
    if (low !== G.mech.low) {
      G.mech.low = low;
      recompute();
      if (low) addText(P.x, P.y - 46, '守夜 · 燃灯', 6);
    }
  }
  // 悖论的伤害回响池：每 0.5 秒记一笔，只保留最近 3 秒。
  // 它同时给 i_nuke（湮灭符）当「3 秒输出量」的估算依据。
  G.echoT = (G.echoT || 0) + dt;
  if (G.echoT >= 0.5) {
    G.echoT = 0;
    G.echo.push(G.stats.dmg - (G.echoMark || 0));
    G.echoMark = G.stats.dmg;
    if (G.echo.length > 6) G.echo.shift();
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
  // ---- 角色机制的定时部分 + 最终隐藏首领
  updateMech(dt);
  updateCatBoss();
  updateMijiuBoss(dt);

  // ---- 场上有没有首领：BGM 要据此切到 boss 层。
  // 每 0.4 秒扫一次数组就够了，没必要每帧遍历六十只怪。
  G.bossScanT = (G.bossScanT || 0) + dt;
  if (G.bossScanT >= 0.4) {
    G.bossScanT = 0;
    let alive = false;
    for (let i = 0; i < G.enemies.length; i++) {
      if (G.enemies[i].tier === 2) { alive = true; break; }
    }
    G.bossAlive = alive;
  }

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
  // 融蚀：被按下去的那一格整段冻住。timer 一起停，否则一解冻它会把
  // 冷却直接付清、立刻打出一发，看起来像「失效期间在偷偷蓄力」。
  const muteId = G.mech && G.mech.cr > 0 ? G.mech.crId : null;
  for (const w of G.weapons) {
    const proto = PROTOS[w.def.proto];
    if (!proto) continue;
    if (muteId && w.def.id === muteId) { w.cdLeft = Math.max(0, w.timer); continue; }
    w.timer -= dt;
    // 给 HUD 的冷却环用：cdLeft/cdMax 是「这一发还要多久」和「整格多长」
    w.cdLeft = Math.max(0, w.timer);
    if (w.timer > 0) continue;
    const ev = w.evo ? w.evo.fx : null;
    const cd = proto.cd * LV.cd(w.lv) * G.mods.cd * rageCd
      * (w.def.cdMul || 1)
      * (ev && ev.cd ? ev.cd : 1)
      * (G.mods.echo && rnd() < G.mods.echo ? 0.4 : 1);
    w.timer = cd;
    w.cdMax = cd;
    w.cdLeft = cd;
    const dmg = proto.dmg * LV.dmg(w.lv) * G.mods.atk * G.mods.dmgMul * rageAtk
      * (w.def.dmgMul || 1)
      * (ev && ev.dmg ? 1 + ev.dmg : 1);
    fireProto(w, proto, dmg);
    maybeSkillVoice(w);
    // 契物「回响」：30% 概率立刻再触发一次。
    // 原来这里乘了 0.35，实际只有 10.5%，和卡面写的 30% 对不上。
    if (G.mods.echo > 0 && rnd() < G.mods.echo) fireProto(w, proto, dmg * 0.7);
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
  const ev = w.evo ? w.evo.fx : null;
  // 投射数量的三个来源：原型等级成长 + 超武加成 + 造物「投射物 +1」。
  // 超武的 count 只给「凭空多出几发」的原型，范围类（nova/shield/heal）不吃。
  // 单把武器的数量系数（countMul）只影响「凭空多出几个」的原型，
  // 也就是原来就吃 cnt 的那几个；范围类的 cnt 本来就没被用到，乘了也无害。
  const cnt = Math.max(1, Math.round(
    (LV.count(lv, proto) + (ev && ev.count ? ev.count : 0) + G.mods.count) * (w.def.countMul || 1)));
  // 范围：超武的 area 是「只强化这一把」，造物的 area 是全局
  const areaMul = (ev && ev.area ? 1 + ev.area : 1) * G.mods.area;
  const exPierce = ev && ev.pierce ? ev.pierce : 0;
  // 彩蛋武器可以自带配色（鼠王的黄绿鼠群、朝星的蓝），没写就用原型的
  const color = w.def.color || proto.color;
  const src = w;
  switch (w.def.proto) {
    case 'bolt': {
      for (let i = 0; i < cnt; i++) {
        const tgt = nearest(P.x, P.y, 900);
        const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU;
        // 描述写的是「4 级起穿透 2 次」，实现一直只给 1 次，这里按描述补上
        shot(P.x, P.y, Math.cos(a) * 470, Math.sin(a) * 470, {
          dmg, r: 6, life: 1.5, color, kind: 'bolt',
          pierce: (lv >= 4 ? 2 : 0) + exPierce, src,
        });
      }
      break;
    }
    case 'orbit': {
      // 环绕光刃作为常驻实体，由 updateOrbs 维护；这里只调数量
      const n = 2 + lv + (ev && ev.count ? ev.count : 0);
      syncOrbit(w, n, (62 + lv * 7) * (ev && ev.area ? 1 + ev.area : 1), dmg, color);
      break;
    }
    case 'nova': {
      const R = (90 + lv * 14) * areaMul;
      shockwave(P.x, P.y, R, dmg, color, src);
      G.shake = Math.min(9, G.shake + 2.4);
      break;
    }
    case 'beam': {
      const tgt = nearest(P.x, P.y, 900);
      const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU;
      const life = (0.3 + lv * 0.05) * G.mods.dur;
      shot(P.x, P.y, Math.cos(a) * 900, Math.sin(a) * 900, {
        dmg, r: 13, life, color, kind: 'ray', pierce: 99,
        // 射线的「范围」就是宽度：超武的 area 在这里读作加粗
        w: (13 + lv * 2) * (ev && ev.area ? 1 + ev.area : 1), src,
      });
      break;
    }
    case 'chain': {
      const tgt = nearest(P.x, P.y, 620);
      if (tgt) chainFrom(tgt, 2 + lv + (ev && ev.count ? ev.count : 0), dmg, color, src);
      break;
    }
    case 'field': {
      const tgt = nearest(P.x, P.y, 520) || { x: P.x + rr(-80, 80), y: P.y + rr(-80, 80) };
      for (let i = 0; i < cnt; i++) {
        addField(tgt.x + rr(-40, 40), tgt.y + rr(-40, 40), (2.4 + lv * 0.3), 52 * areaMul, dmg, color, false, src);
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
        // 落点预警 0.45 秒后一次性砸下全额伤害（以前是 0.28 秒结算一次的领域，
        // 0.45 秒内只跳两下，实际只有描述的 56%，「重击」完全不重）
        addField(x, y, 0.12, 46 * areaMul, dmg, color, false, src, { delay: 0.45, burst: true });
      }
      break;
    }
    case 'shield': {
      G.player.shield = Math.min(G.player.maxShield, G.player.shield + 8 + lv * 6);
      G.player.shieldBroke = false;
      shockwave(P.x, P.y, 76 * areaMul, dmg, color, src);
      break;
    }
    case 'heal': {
      G.player.hp = Math.min(G.player.maxHp, G.player.hp + (2 + lv) * G.mods.healBoost);
      shockwave(P.x, P.y, 66 * areaMul, dmg, color, src);
      break;
    }
    // ------------------------------------------------ 2026-10 新增的 6 种
    case 'vortex': {
      // 涡流：领域 + 每 tick 把敌人往中心拽（pull 由 updateFields 处理）
      const tgt = nearest(P.x, P.y, 560) || { x: P.x + rr(-90, 90), y: P.y + rr(-90, 90) };
      addField(tgt.x, tgt.y, 1.6 + lv * 0.2, 70 * areaMul, dmg, color, false, src, { pull: 240 });
      break;
    }
    case 'meteor': {
      for (let i = 0; i < cnt; i++) {
        const e = G.enemies[(rnd() * G.enemies.length) | 0];
        const x = e ? e.x + rr(-26, 26) : P.x + rr(-140, 140);
        const y = e ? e.y + rr(-26, 26) : P.y + rr(-140, 140);
        addField(x, y, 0.16, 62 * areaMul, dmg, color, false, src, { delay: 0.55, burst: true, sky: true });
      }
      break;
    }
    case 'totem': {
      // 图腾是站桩不动的召唤物：不追人，只按固定节奏向最近的敌人放电
      let have = 0;
      for (const s of G.summons) if (s.static && s.src === w) have++;
      for (let i = have; i < cnt && G.summons.length < 10; i++) {
        const a = rnd() * TAU;
        G.summons.push({
          x: P.x + Math.cos(a) * rr(56, 92), y: P.y + Math.sin(a) * rr(56, 92),
          r: 13, dmg: dmg * 0.75, color, cd: rr(0.2, 0.8), life: 999,
          img: G.char ? G.char.img : 0, spin: 0, src: w,
          static: true, zap: 0.9, range: 270,
        });
      }
      break;
    }
    case 'saw': {
      for (let i = 0; i < cnt; i++) {
        const tgt = nearest(P.x, P.y, 700);
        const a = (tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU) + rr(-0.28, 0.28);
        // 复用回旋镖的往返逻辑（back），但速度更快、穿透一切
        shot(P.x, P.y, Math.cos(a) * 360, Math.sin(a) * 360, {
          dmg, r: 12, life: 1.8, color, kind: 'saw', back: 0.6, pierce: 99 + exPierce, src,
        });
      }
      break;
    }
    case 'mine': {
      for (let i = 0; i < cnt; i++) {
        const a = rnd() * TAU, dist = rr(28, 74);
        // arm=true：敌人踩上来才炸；12 秒没被踩就自己消失
        addField(P.x + Math.cos(a) * dist, P.y + Math.sin(a) * dist, 12, 48 * areaMul, dmg, color, false, src, { arm: true, burst: true });
      }
      break;
    }
    case 'rain': {
      for (let i = 0; i < cnt; i++) {
        const e = G.enemies[(rnd() * G.enemies.length) | 0];
        const x = e ? e.x + rr(-46, 46) : P.x + rr(-160, 160);
        const y = e ? e.y + rr(-46, 46) : P.y + rr(-160, 160);
        addField(x, y, 0.14, 34 * areaMul, dmg, color, false, src, { delay: 0.3, burst: true, pillar: true });
      }
      break;
    }
    // ------------------------------------------------ 四位神秘唤醒体的专属原型
    case 'judge': {
      // 审判柱：插在敌群中心，持续 3 秒并且一直迟滞 —— 它的价值不在伤害，
      // 而在于把「一堆怪」钉在原地，让别的技能打得实。
      const tgt = nearest(P.x, P.y, 620) || { x: P.x + rr(-90, 90), y: P.y + rr(-90, 90) };
      for (let i = 0; i < cnt; i++) {
        const x = tgt.x + (i ? rr(-70, 70) : 0);
        const y = tgt.y + (i ? rr(-70, 70) : 0);
        addField(x, y, 3, 54 * areaMul, dmg, color, false, src, { pillar: true, slow: 0.55 });
      }
      G.shake = Math.min(10, G.shake + 2);
      break;
    }
    case 'paradox': {
      // 悖论回响：把最近 3 秒的输出再复现一次。上限压到单发基准的 5 倍，
      // 否则后期输出一高，这一发会把整屏怪直接抹平（boss 也扛不住）。
      const bank = G.echo.reduce((a, b) => a + b, 0);
      const ratio = 0.25 + lv * 0.05;
      const hit = dmg + Math.min(bank * ratio, dmg * 5);
      shockwave(P.x, P.y, (86 + lv * 10) * areaMul, hit, color, src);
      G.fx.push({
        x: P.x, y: P.y, vx: 0, vy: 0, life: 0.45, max: 0.45,
        color, r: 0, ring: (86 + lv * 10) * areaMul * 1.2, kind: 'ring',
      });
      break;
    }
    case 'lantern': {
      // 长明灯：落在脚下不动，靠领域持续灼烧 + 迟滞维持一小片安全区。
      // 用领域而不是召唤物，是为了复用 updateFields 的 tick 与减速逻辑。
      addField(P.x, P.y, 5 + lv * 0.5, 112 * areaMul, dmg * 1.6, color, false, src, { lamp: true, slow: 0.7 });
      break;
    }
    case 'seal': {
      // 封印书页：只封「最近的几个」，定身 1.2 秒。它是控制技，
      // 伤害给得比同级 strike 还高一点，否则满场跑的小怪不值得为它占一格。
      const near = [];
      for (const e of G.enemies) {
        const d2 = (e.x - P.x) ** 2 + (e.y - P.y) ** 2;
        if (d2 < 420 * 420) near.push({ e, d2 });
      }
      near.sort((a, b) => a.d2 - b.d2);
      const n = Math.min(cnt, near.length);
      for (let i = 0; i < n; i++) {
        const e = near[i].e;
        e.bindT = 1.2; e.slowT = 1.2; e.slowMul = 0.0001;
        damageEnemy(e, dmg, P.x, P.y, src);
        G.fx.push({ x: e.x, y: e.y, vx: 0, vy: 0, life: 0.4, max: 0.4, color, r: 0, ring: 34, kind: 'ring' });
      }
      break;
    }
    // ------------------------------------------------ 彩蛋角色的专属原型
    case 'cadence': {
      // 节拍连打：基础 cd 只有 0.42 秒，所以单发很轻；真正的伤害在「每第 4 拍」。
      // 拍数存在武器对象上而不是全局 —— 换掉这把技能之后，新技能不该接着别人的拍子数。
      w.beat = ((w.beat || 0) + 1) % 4;
      const heavy = w.beat === 0;
      const tgt = nearest(P.x, P.y, 780);
      const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : rnd() * TAU;
      for (let i = 0; i < cnt; i++) {
        const aa = a + (i ? rr(-0.15, 0.15) : 0);
        const sp = heavy ? 640 : 520;
        shot(P.x, P.y, Math.cos(aa) * sp, Math.sin(aa) * sp, {
          dmg: heavy ? dmg * 2.6 : dmg, r: heavy ? 10 : 6,
          life: heavy ? 1.5 : 1.05, color, kind: 'bolt',
          pierce: heavy ? 3 : 0, src,
        });
      }
      if (heavy && tgt) {
        // 重音要看得见：目标身上一圈短促冲击 + 一点震屏
        G.fx.push({ x: tgt.x, y: tgt.y, vx: 0, vy: 0, life: 0.3, max: 0.3, color, r: 0, ring: 34, kind: 'ring' });
        G.shake = Math.min(6, G.shake + 1.1);
      }
      break;
    }
    case 'ribbon': {
      // 幻梦丝带：以自身为圆心扫一圈，附带迟滞。「缠住」必须留在原地才有意义，
      // 所以用短时领域而不是投射物 —— 丝带扫过去之后怪还站在原地发懵。
      const R = (132 + lv * 12) * areaMul;
      addField(P.x, P.y, 0.9, R, dmg, color, false, src, { slow: 0.5 });
      G.fx.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: 0.42, max: 0.42, color, r: 0, ring: R * 1.05, kind: 'ring' });
      break;
    }
    case 'burrow': {
      // 兔子洞：在敌群中心开一个会拽人的坑。不追求爆发伤害，
      // 价值在于把散开的怪堆成一坨，让别的技能打得实。
      const tgt = nearest(P.x, P.y, 660) || { x: P.x + rr(-90, 90), y: P.y + rr(-90, 90) };
      for (let i = 0; i < cnt; i++) {
        addField(tgt.x + (i ? rr(-64, 64) : 0), tgt.y + (i ? rr(-64, 64) : 0),
          (1.4 + lv * 0.15), 78 * areaMul, dmg, color, false, src, { pull: 320 });
      }
      break;
    }
    case 'swarm': {
      // 鼠群：从脚边四散窜出去，各自带弱追踪。单发很轻，靠数量压人。
      for (let i = 0; i < cnt; i++) {
        const a = rnd() * TAU;
        shot(P.x + Math.cos(a) * 16, P.y + Math.sin(a) * 16,
          Math.cos(a) * 250, Math.sin(a) * 250, {
            dmg, r: 5, life: 1.35, color, kind: 'orb', home: 4.2, pierce: 1, src,
          });
      }
      break;
    }
    case 'breath': {
      // 龙息：沿朝向铺三到四片重叠的领域，合起来读作一个锥形。
      // 用重叠圆而不是真的画锥形，是为了复用 updateFields 的 tick / 减速 / 伤害统计。
      const tgt = nearest(P.x, P.y, 720);
      const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : (P.face > 0 ? 0 : Math.PI);
      const dur = (2.4 + lv * 0.2);
      for (let i = 0; i < 3; i++) {
        const d0 = 76 + i * 44;
        addField(P.x + Math.cos(a) * d0, P.y + Math.sin(a) * d0,
          dur, (66 - i * 6) * areaMul, dmg, color, false, src, { slow: 0.55 });
      }
      break;
    }
    case 'vow': {
      // 立誓之刃：一次爆发换一层鳞。护盾给得不小，因为「立誓」的设定是
      // 先把自己押上去，再谈收益。
      shockwave(P.x, P.y, (96 + lv * 12) * areaMul, dmg, color, src);
      P.shield = Math.min(P.maxShield, P.shield + 10 + lv * 7);
      P.shieldBroke = false;
      G.shake = Math.min(8, G.shake + 1.6);
      break;
    }
    case 'bloom': {
      // 茉香花海：脚下一片会回血的花（lamp 效果由领域负责），
      // 开枪的瞬间顺手补一点，保证「站在花里」这件事立刻有反馈。
      addField(P.x, P.y, (3.2 + lv * 0.3), 96 * areaMul, dmg, color, false, src, { lamp: true, slow: 0.6 });
      P.hp = Math.min(P.maxHp, P.hp + 1 + lv * 0.4);
      break;
    }
    case 'starfall': {
      // 星轨：以最近的敌人为起点，沿一条随机方向依次落星。落点延迟递增，
      // 读起来是「一串星扫过去」—— 和光雨（同时散落）、陨石（单颗重击）都不像。
      const tgt = nearest(P.x, P.y, 760) || { x: P.x, y: P.y };
      const a = rnd() * TAU;
      for (let i = 0; i < cnt; i++) {
        addField(tgt.x + Math.cos(a) * i * 58, tgt.y + Math.sin(a) * i * 58,
          0.12, (44 + i * 4) * areaMul, dmg * (1 + i * 0.18), color, false, src,
          { delay: 0.22 + i * 0.16, burst: true });
      }
      break;
    }
    case 'stroll': {
      // 挡在路口：横着占一块地。伤害很低，价值是拖住 + 给一层护盾。
      const tgt = nearest(P.x, P.y, 460);
      const a = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : (P.face > 0 ? 0 : Math.PI);
      const R = (86 + lv * 8) * areaMul;
      for (let i = 0; i < cnt; i++) {
        const d0 = 78 + i * 40;
        addField(P.x + Math.cos(a) * d0, P.y + Math.sin(a) * d0,
          (2.2 + lv * 0.2), R, dmg, color, false, src, { slow: 0.7 });
      }
      P.shield = Math.min(P.maxShield, P.shield + 6 + lv * 5);
      P.shieldBroke = false;
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
    // 融蚀：环绕光刃是常驻实体，只冻开火逻辑它还会接着割人。
    // 直接撤掉，恢复后的第一次开火会靠 syncOrbit 把它挂回来。
    if (G.mech && G.mech.cr > 0 && o.w.def.id === G.mech.crId) { o.dead = true; continue; }
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
      e.kx += Math.cos(a) * 90 * G.mods.knock;
      e.ky += Math.sin(a) * 90 * G.mods.knock;
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
// 一个 addField 现在承担四种形态，靠 opt 区分：
//   默认        每 0.28 秒结算一次伤害的领域
//   { pull }    涡流：每帧把敌人往中心拽
//   { arm }     地雷：敌人踩进来才引爆，没踩到就静默消失
//   { delay, burst, sky/pillar }  陨石与光雨：先悬空预警，落下打全额
function addField(x, y, life, r, dmg, color, delayed, src, opt) {
  const o = opt || {};
  // 「持续时间」只拉长会持续结算的领域，不拉长地雷引信和一次性爆发
  const dur = o.arm || o.burst ? 1 : G.mods.dur;
  G.fields.push({
    x, y,
    r: r * G.mods.fieldRadius,
    life: life * dur, max: life * dur,
    dmg, color,
    delay: delayed ? 0.45 : (o.delay || 0),
    tick: 0, src: src || null,
    pull: o.pull || 0,
    arm: !!o.arm, burst: !!o.burst, sky: !!o.sky, pillar: !!o.pillar,
    // 迟滞：审判柱与长明灯靠它把敌人按在范围里；0 表示不减速。
    slow: o.slow || 0,
    lamp: !!o.lamp,
  });
}

function updateFields(dt) {
  for (let i = G.fields.length - 1; i >= 0; i--) {
    const f = G.fields[i];
    // 悬空预警阶段：只倒计时，不结算
    if (f.delay > 0) {
      f.delay -= dt;
      if (f.delay <= 0 && f.sky) {
        G.fx.push({
          x: f.x, y: f.y, vx: 0, vy: 0, life: 0.3, max: 0.3,
          color: f.color, r: 0, ring: f.r * 1.4, kind: 'ring',
        });
        G.shake = Math.min(10, G.shake + 2);
      }
      continue;
    }
    f.life -= dt;
    // 地雷：范围内有敌人就引爆，引信烧完还没人踩就直接消失（不是自爆）
    if (f.arm) {
      let trig = false;
      for (const e of G.enemies) {
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 < (f.r + e.r) ** 2) { trig = true; break; }
      }
      if (!trig) {
        if (f.life <= 0) G.fields.splice(i, 1);
        continue;
      }
      f.life = 0;
    }
    // 涡流引力：越靠外拉得越狠，首领只吃 35%
    if (f.pull > 0) {
      for (const e of G.enemies) {
        const dx = f.x - e.x, dy = f.y - e.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (f.r + e.r) ** 2 && d2 > 1) {
          const d = Math.sqrt(d2);
          const k = (0.35 + (1 - d / f.r) * 0.65) * f.pull * dt * (e.boss ? 0.35 : 1);
          e.x += (dx / d) * k; e.y += (dy / d) * k;
        }
      }
    }
    f.tick -= dt;
    if (f.tick <= 0) {
      // burst 型只结算一次全额；持续型每 0.28 秒按 0.28 倍摊
      f.tick = f.burst ? 99 : 0.28;
      const mult = f.burst ? 1 : 0.28;
      // 这里原来还乘了一次 G.mods.atk，而 f.dmg 进 addField 前就已经乘过 atk，
      // 等于领域伤害被攻击力平方放大 —— 面板上的「单发约 N」和实际打出来的对不上。
      for (const e of G.enemies) {
        if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 < (f.r + e.r) ** 2) {
          damageEnemy(e, f.dmg * mult, f.x, f.y, f.src);
          // 迟滞每 tick 续一次而不是一次给满：敌人走出范围就会慢慢恢复速度，
          // 这样「站在柱子里」和「刚从柱子里出来」的手感是不一样的。
          if (f.slow > 0 && e.bindT <= 0) { e.slowT = 0.42; e.slowMul = f.slow; }
        }
      }    }
    if (f.life <= 0) G.fields.splice(i, 1);
  }
}

// ---------------------------------------------------------------- 召唤物
function addSummon(dmg, color, lv, src) {
  const a = rnd() * TAU;
  G.summons.push({
    x: G.player.x + Math.cos(a) * 40,
    y: G.player.y + Math.sin(a) * 40,
    // summonDmg 是命轮「召唤物 +2，且伤害 +25%」里的那 25%
    r: 12, dmg: dmg * 1.25 * G.mods.summonDmg, color, cd: 0, life: 999,
    img: G.char ? G.char.img : 0, spin: rnd() * TAU,
    src: src || null,
  });
}

function updateSummons(dt) {
  for (const s of G.summons) {
    // 融蚀：被按下去的那一格召出来的东西也一起哑掉。只冻开火的话，
    // 场上已有的召唤物照样咬人，「技能失效」就成了空话。
    if (G.mech && G.mech.cr > 0 && s.src && s.src.def.id === G.mech.crId) continue;
    // 图腾：站桩不动，按固定节奏朝最近的敌人放电
    if (s.static) {
      if (s.cd > 0) s.cd -= dt;
      if (s.cd <= 0) {
        s.cd = s.zap || 0.9;
        const tgt = nearest(s.x, s.y, s.range || 260);
        if (tgt) {
          damageEnemy(tgt, s.dmg, s.x, s.y, s.src);
          G.fx.push({ x: s.x, y: s.y, x2: tgt.x, y2: tgt.y, life: 0.18, max: 0.18, color: s.color, kind: 'line' });
        }
      }
      s.spin += dt * 1.5;
      continue;
    }
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
    if (b.kind === 'boomerang' || b.kind === 'saw') {
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
    // 定身优先于减速：封印书页是「完全停住」，不能和迟滞叠加成 0.0001 倍速
    if (e.bindT > 0) {
      e.bindT -= dt;
      sp = 0;
    } else if (e.slowT > 0) {
      e.slowT -= dt;
      sp *= (e.slowMul == null ? 1 : e.slowMul);
    }
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
    sfx.play('rageFull');
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
  sfx.play('rage');
  // 「超限狂气爆发」留给首领战和本局第三次以后的爆发 —— 一局没几次的机会，
  // 用来给后期一点情绪上的升级，而不是每次都念同一句。
  say(G.bossAlive || G.rageUsed >= 3 ? 'rage2' : 'rage', true);
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
  // 超武可以把暴击率/暴击伤害加在「这一把武器」上，而全局暴击只来自造物与界域
  const ev = src && typeof src === 'object' && src.evo ? src.evo.fx : null;
  const critRate = G.mods.crit + (ev && ev.crit ? ev.crit : 0);
  const critMul = G.mods.critMul + (ev && ev.critMul ? ev.critMul : 0);
  const crit = rnd() < critRate;
  let dmg = amount * (crit ? critMul : 1);
  if (G.mods.frenzy > 0) {
    const miss = 1 - G.player.hp / G.player.maxHp;
    dmg *= 1 + G.mods.frenzy * miss;
  }
  e.hp -= dmg;
  e.flash = 0.1;
  sfx.play(crit ? 'crit' : 'hit');
  G.stats.dmg += dmg;
  creditDmg(src, dmg);
  addRage(dmg * RAGE.perDmg);
  addText(e.x + rr(-6, 6), e.y - e.r * 0.7, Math.round(dmg), crit ? 1 : 0);
  if (G.mods.lifesteal > 0) {
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + dmg * G.mods.lifesteal);
  }
  // 超武「命中溅射」：8% 概率在命中点炸开一小圈。
  // 溅射伤害的 src 传 null —— 否则会再触发一次溅射，直接递归到栈溢出。
  if (ev && ev.onHit === 'burst' && rnd() < 0.08) {
    const bx = sx == null ? e.x : sx;
    const by = sy == null ? e.y : sy;
    if (G.fx.length < 400) {
      G.fx.push({ x: bx, y: by, vx: 0, vy: 0, life: 0.26, max: 0.26, color: '#ffd479', r: 0, ring: 54, kind: 'ring' });
    }
    for (const o of G.enemies) {
      if (o === e) continue;
      if ((o.x - bx) ** 2 + (o.y - by) ** 2 < (54 + o.r) ** 2) damageEnemy(o, dmg * 0.35, bx, by, null);
    }
  }
  if (e.hp <= 0) killEnemy(e, sx, sy);
}

function killEnemy(e, sx, sy) {
  e.hp = 0;
  const idx = G.enemies.indexOf(e);
  if (idx >= 0) G.enemies.splice(idx, 1);
  G.kills++;
  // 精英与首领的死法要比小怪重：同一套「击杀」音在 boss 倒下时会被后面的
  // 结算音盖掉，所以按 tier 抬一下音量。
  sfx.play('kill', { vol: e.tier === 2 ? 2.4 : e.tier === 1 ? 1.5 : 1 });
  addRage(RAGE.perKill);
  // 契物「血债」的卡面写的是「击杀回复 1 点生命，攻击力 +10%」，
  // 实际只实现了攻击力那一半，这里补上回复。
  if (G.covs.some((c) => c.key === 'c_blood')) {
    G.player.hp = Math.min(G.player.maxHp, G.player.hp + 1);
  }
  // 神王·图鲁的王权：每 20 杀一层，满 25 层封顶。
  // 只在「层数真的变了」的时候重算一次 mods —— 每杀都算的话，后期一秒几十杀
  // 会把 recompute 跑成每秒几十次。
  if (G.mech && G.mech.id === 'royalty') {
    const s = Math.min(25, Math.floor(G.kills / 20));
    if (s !== G.mech.stacks) {
      G.mech.stacks = s;
      recompute();
      if (s === 15) addText(G.player.x, G.player.y - 46, '王权 15 层 · 开始回复', 6);
    }
  }
  // 不耶节拍：每杀 +1 拍（30 拍封顶）。每 5 拍才重算一次 mods ——
  // 后期一秒几十杀，每杀一次 recompute 会让主循环直接卡死。
  if (G.mech && G.mech.id === 'samobeat') {
    const s = Math.min(30, (G.mech.stacks || 0) + 1);
    G.mech.stacks = s;
    if (s % 5 === 0) recompute();
  }
  // 鼠王加冕：每 20 杀放一波
  if (G.mech && G.mech.id === 'ratcrown') {
    G.mech.stacks = (G.mech.stacks || 0) + 1;
    if (G.mech.stacks >= 20) { G.mech.stacks = 0; ratWave(); }
  }
  // 隐藏首领被清掉：结算里要单独记一行
  if (e.cat) {
    G.catKilled = true;
    addText(e.x, e.y - 60, '弥萨格校猫 · 已放学', 6);
    G.flash = 0.8;
    G.shake = 20;
  }
  // 第二位隐藏首领：关卡设计师被清掉，这一关才算真的验完
  if (e.mj) {
    G.mjKilled = true;
    const ls = (BOSS_MIJIU && BOSS_MIJIU.lines && BOSS_MIJIU.lines.die) || [];
    addText(e.x, e.y - 60, ls[0] || '米酒 · 这一关过了', 6);
    G.flash = 0.7;
    G.shake = 16;
  }
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
  // 梦依流苏的「入梦」：每局第一次致命伤直接免掉。
  // 判定放在扣血之前、护盾结算之后 —— 否则护盾刚好够挡的那一下也会被算成致命。
  if (dmg > 0 && dmg >= P.hp && G.mech && G.mech.id === 'dreamgate' && !G.mech.flag) {
    G.mech.flag = true;
    P.inv = 2;
    P.hp = Math.min(P.maxHp, Math.max(1, P.hp) + P.maxHp * 0.35);
    P.shield = 0;
    G.flash = 0.7;
    addText(P.x, P.y - 52, '入梦', 6);
    G.fx.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: 0.7, max: 0.7, color: '#9d8bff', r: 0, ring: 150, kind: 'ring' });
    sfx.play('evo');
    return;
  }
  if (P.shield > 0) {
    const absorbed = Math.min(P.shield, dmg);
    P.shield -= absorbed;
    dmg -= absorbed;
    // 「破盾时清场一圈」只该在护盾真正被打空的那一次触发。
    // 原来只要挨打时护盾是 0 就会炸，等于每 0.55 秒白送一发 40 点冲击波。
    if (P.shield <= 0 && !P.shieldBroke && G.wheels.some((w) => w.key === 'shield_start')) {
      P.shieldBroke = true;
      shockwave(P.x, P.y, 150, 40, '#8ec5ff');
    }
  }
  if (dmg > 0) {
    P.hp -= dmg;
    sfx.play('hurt');
    G.stats.taken += dmg;
    if (Math.random() < VOICE.hurtChance) say('hurt', false);
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
    // 威廉的守夜：挨打必反一下，不依赖造物。它是这名角色「越打越凶」的
    // 唯一进攻手段，所以给的是固定值而不是百分比 —— 前期靠它清场，后期靠它续命。
    if (G.mech && G.mech.id === 'nightwatch') {
      shockwave(P.x, P.y, 104, 14 + G.lv * 3, '#7fb3ff');
      G.mech.procs++;
    }
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
      if (p.kind === 'exp') { sfx.play('pickup'); gainExp(p.val); }
      else if (p.kind === 'heal') {
        // 造物「治疗量 +20%」对拾取物也要生效，否则卡面只对技能有效
        const gain = Math.max(1, Math.round(p.val * G.mods.healBoost));
        P.hp = Math.min(P.maxHp, P.hp + gain);
        addText(P.x, P.y - 30, '+' + gain, 2);
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

export function gainExp(n) {
  G.exp += n * G.mods.exp;
  while (G.exp >= G.expNext) {
    G.exp -= G.expNext;
    G.lv++;
    G.expNext = expNeed(G.lv);
    G.pending++;
    sfx.play('levelup');
    if (Math.random() < VOICE.lvChance) say('lv', false);
    // 升级顺带回 8% 血。这游戏没有任何被动回血，指望玩家 15 分钟一次不挨打
    // 不现实——实测三档难度全在 5 分钟左右被磨死，反而是「武器太强、场上
    // 没怪」和「摸一下就永久掉血」两件事同时发生。等级回复把续航挂到成长上，
    // 升得越快越耐打，是玩家能自己控制的续航来源。
    const P = G.player;
    P.hp = Math.min(P.maxHp, P.hp + P.maxHp * 0.08);

    // N 的悖论：35% 概率多给一次三选一。它不额外给经验，只是把一次升级
    // 变成「连选两次」，所以对强度的影响是可控的（牌还是那副牌）。
    if (G.mech && G.mech.id === 'paradox' && rnd() < 0.35) {
      G.pending++;
      addText(P.x, P.y - 52, '悖论 · 多一次选择', 6);
    }

    // 守密人的封印：每升 1 级攒 1 道，满 5 道处决场上最虚弱的 4 名敌人。
    // 处决按「当前生命最低」选，打 Boss 时它等于白送一次清场，
    // 所以对首领只造成 30% 的伤害而不是直接抹掉。
    if (G.mech && G.mech.id === 'seal') {
      G.mech.stacks++;
      if (G.mech.stacks >= 5) {
        G.mech.stacks = 0;
        const list = G.enemies.slice().sort((a, b) => a.hp - b.hp).slice(0, 4);
        for (const t of list) {
          damageEnemy(t, t.boss ? t.hp * 0.3 : t.hp * 999, P.x, P.y, null);
          G.fx.push({ x: t.x, y: t.y, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#9aa7ff', r: 0, ring: 46, kind: 'ring' });
        }
        if (list.length) addText(P.x, P.y - 52, '缄默 · 封印 ' + list.length, 6);
      }
    }
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
    // 间隔随时间收紧（70 秒 → 最快 20 秒），数量分三档抬到 3 只。
    // 以前固定 70 秒刷 2 只，第 14 分钟和第 1 分钟一样稀。
    G.eliteT = eliteGap(G.t);
    const n = eliteCount(G.t);
    for (let i = 0; i < n; i++) spawnEnemy(1);
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
        sfx.play('boss');
        G.bossAlive = true;
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

// ---------------------------------------------------------------- 融蚀
// 把一项技能或造物按下去 ERODE.dur 秒，换攻击力。
//
// 三条边界：
//   1. 一手空牌（只有本命一把技能、又没捡造物）不触发 —— 那几秒等于站着挨打，
//      融蚀是「拿命换火力」，不是「拿命换命」；
//   2. 只挑一格，挑中的技能连它的环绕体、召唤物一起哑掉，不能只停开火；
//   3. 生命上限的下滑写在 recompute 里，这里只负责计时与播报。
function startErode() {
  const P = G.player;
  const cand = [];
  for (const w of G.weapons) cand.push({ kind: 'w', id: w.def.id, n: w.def.n });
  for (const p of G.passives) cand.push({ kind: 'p', id: String(p.id), n: p.n });
  if (!cand.length || (G.weapons.length <= 1 && G.passives.length === 0)) return;
  const tgt = cand[(rnd() * cand.length) | 0];
  G.mech.cr = ERODE.dur;
  G.mech.crId = tgt.id;
  G.mech.crKind = tgt.kind;
  G.mech.crN = tgt.n;
  G.mech.crTimes = (G.mech.crTimes || 0) + 1;
  recompute();
  addText(P.x, P.y - 70, `融蚀 · ${tgt.n} 失效`, 3);
  addText(P.x, P.y - 50,
    `生命 -${Math.round((1 - ERODE.hp) * 100)}% · 攻击 +${Math.round(ERODE.atk * 100)}%`, 3);
  G.fx.push({
    x: P.x, y: P.y, vx: 0, vy: 0, kind: 'ring', color: '#b45cff', r: 0,
    life: 0.55, max: 0.55, ring: 168,
  });
  G.shake = Math.min(12, G.shake + 3);
  sfx.play('hurt');
}

function endErode() {
  G.mech.cr = 0;
  G.mech.crId = null;
  G.mech.crKind = '';
  G.mech.crN = '';
  recompute();
  addText(G.player.x, G.player.y - 56, '融蚀退去 · 上限回升', 2);
}

// ---------------------------------------------------------------- 机制运行时
// 机制里的被动加成走 recompute；这里只处理需要按时间推进的那几件：
// 节拍满槽、龙鳞周期吐息、花信风、兔子洞、立誓的 90 秒切档。
function updateMech(dt) {
  const id = G.mech && G.mech.id;
  if (!id) return;
  const P = G.player;
  G.mech.t = (G.mech.t || 0) + dt;
  if (G.mech.cd > 0) G.mech.cd = Math.max(0, G.mech.cd - dt);

  // 立誓：90 秒这道坎只重算一次。mods 是缓存值，不重算就会永远停在 +50%。
  if (id === 'zerokr' && !G.mech.flag && G.t >= 90) {
    G.mech.flag = true;
    recompute();
    addText(P.x, P.y - 54, '立誓期满 · 攻击回落', 6);
  }

  // 融蚀：后期才开闸，一次烧 ERODE.dur 秒；烧的过程中不再掷骰，
  // 所以它不会叠成两层，玩家也不用猜现在到底是几层。
  if (id === 'samobeat') {
    if (G.mech.cr > 0) {
      G.mech.cr = Math.max(0, G.mech.cr - dt);
      if (G.mech.cr <= 0) endErode();
    } else if (G.t >= ERODE.from) {
      G.mech.crCd = Math.max(0, (G.mech.crCd || 0) - dt);
      if (G.mech.crCd <= 0) {
        G.mech.crCd = ERODE.every;
        // 越往后越容易：3 分钟 ERODE.base，之后按局内时间线性升，封顶 base+ramp
        const p = ERODE.base
          + Math.min(ERODE.ramp, Math.max(0, G.t - ERODE.from) / ERODE.rampSec * ERODE.ramp);
        if (rnd() < p) startErode();
      }
    }
  }

  // 不耶节拍：满 30 拍放一次全拍冲击，然后从 0 重新数
  if (id === 'samobeat' && G.mech.stacks >= 30) {
    G.mech.stacks = 0;
    recompute();
    const R = 190;
    shockwave(P.x, P.y, R, 26 * G.mods.atk, '#ff7a9c');
    G.fx.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#ff7a9c', r: 0, ring: R * 1.15, kind: 'ring' });
    G.shake = Math.min(9, G.shake + 2.4);
    addText(P.x, P.y - 46, '节拍满 · 全拍', 6);
    sfx.play('evo');
  }

  // 龙鳞：每 8 秒朝最近的敌人补一口，不占技能格
  if (id === 'dragonscale' && G.mech.t >= 8) {
    G.mech.t = 0;
    const tgt = nearest(P.x, P.y, 420);
    if (tgt) {
      const a = Math.atan2(tgt.y - P.y, tgt.x - P.x);
      addField(P.x + Math.cos(a) * 70, P.y + Math.sin(a) * 70, 0.8, 62,
        9 * G.mods.atk, '#ff9a4d', false, null, { slow: 0.5 });
    }
  }

  // 花信风：每 9 秒在脚下开一片会回血的花
  if (id === 'blossom' && G.mech.t >= 9) {
    G.mech.t = 0;
    addField(P.x, P.y, 3.4, 88, 7 * G.mods.atk, '#8ce0a8', false, null, { lamp: true, slow: 0.6 });
    P.hp = Math.min(P.maxHp, P.hp + 1.5);
  }

  // 星轨：每 8 秒挑场上最远的三个，各落一颗星（距离越远越值得点掉）
  if (id === 'starlit' && G.mech.t >= 8) {
    G.mech.t = 0;
    const far = G.enemies.slice()
      .sort((a, b) => ((b.x - P.x) ** 2 + (b.y - P.y) ** 2) - ((a.x - P.x) ** 2 + (a.y - P.y) ** 2))
      .slice(0, 3);
    for (const e of far) {
      addField(e.x, e.y, 0.12, 40, 12 * G.mods.atk, '#8fa8ff', false, null, { delay: 0.3, burst: true });
    }
    if (far.length) sfx.play('shot');
  }

  // 挡路：每 12 秒在脚下横一道拖慢敌人的路障，顺便补一点护盾
  if (id === 'gatekeep' && G.mech.t >= 12) {
    G.mech.t = 0;
    addField(P.x, P.y, 2.6, 84, 6 * G.mods.atk, '#a9a29a', false, null, { slow: 0.65 });
    P.shield = Math.min(P.maxShield, P.shield + 4);
  }

  // 兔子洞：被围住时自动脱身。判定用 96 半径内的敌人数，超过 7 只才算「被围」；
  // 冷却 18 秒，落地炸一圈 —— 瞬移本身不该是无声的。
  if (id === 'rabbitfall' && G.mech.cd <= 0) {
    let near = 0;
    for (const e of G.enemies) {
      if ((e.x - P.x) ** 2 + (e.y - P.y) ** 2 < 96 * 96) { near++; if (near > 7) break; }
    }
    if (near > 7) {
      G.mech.cd = 18;
      let bx = P.x, by = P.y, best = -1;
      for (let i = 0; i < 12; i++) {
        const a = rnd() * TAU;
        const x = P.x + Math.cos(a) * 240, y = P.y + Math.sin(a) * 240;
        let cnt = 0;
        for (const e of G.enemies) if ((e.x - x) ** 2 + (e.y - y) ** 2 < 130 * 130) cnt++;
        if (best < 0 || cnt < best) { best = cnt; bx = x; by = y; if (cnt === 0) break; }
      }
      G.fx.push({ x: P.x, y: P.y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#5fd0ff', r: 0, ring: 60, kind: 'ring' });
      P.x = bx; P.y = by;
      P.inv = Math.max(P.inv, 0.7);
      shockwave(bx, by, 120, 30 * G.mods.atk, '#5fd0ff');
      G.fx.push({ x: bx, y: by, vx: 0, vy: 0, life: 0.45, max: 0.45, color: '#5fd0ff', r: 0, ring: 130, kind: 'ring' });
      addText(bx, by - 46, '掉进洞里', 6);
      sfx.play('evo');
    }
  }
}

// 鼠王加冕：每 20 杀放一波鼠群
function ratWave() {
  const P = G.player;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + rr(-0.1, 0.1);
    shot(P.x, P.y, Math.cos(a) * 430, Math.sin(a) * 430, {
      dmg: 16 * G.mods.atk, r: 6, life: 1.0, color: '#c8e06a', kind: 'orb', pierce: 3, src: null,
    });
  }
  addText(P.x, P.y - 44, '鼠王加冕', 6);
  G.shake = Math.min(8, G.shake + 2);
}

// ---------------------------------------------------------------- 隐藏首领
// 弥萨格校猫：三只首领都清掉、撑到最后 30 秒才登场，一局只来一次。
// 条件故意挂在 bossKills 上而不是时间上 —— 它是「你把这一局打赢了才配见」的东西，
// 光是苟到最后不该见到它。
function updateCatBoss() {
  const B = BOSS_CAT;
  if (!B || G.catSpawned || G.phase !== 'run') return;
  if (G.catIdx < 0) return;
  if (G.t < (B.from || 870)) return;
  if (G.bossKills < (B.needBossKills || 3)) return;
  const e = spawnEnemy(2, null, null, G.catIdx);
  if (!e) return;
  G.catSpawned = true;
  e.cat = true;
  e.r = B.r || 54;
  e.maxHp = Math.round(e.maxHp * (B.hpMul || 5));
  e.hp = e.maxHp;
  e.dmg *= 1.25;
  e.spd *= 0.86;
  e.n = B.n;
  G.warnName = B.n;
  G.warn = 3.4;
  G.shake = 24; G.flash = 0.9;
  sfx.play('boss');
  G.bossAlive = true;
  addText(G.player.x, G.player.y - 70, B.n + ' 来了', 6);
  G.fx.push({ x: e.x, y: e.y, vx: 0, vy: 0, kind: 'ring', life: 0.9, max: 0.9, color: '#ffd76a', r: 0, ring: 300 });
}

// 米酒：脑缸组的战斗设计师。校猫被清掉之后他才登场 —— 他不是来拦路的，
// 是来验收这一关的。他不追人（速度压到六成，站在场边翻那张画满网格的纸），
// 但每 addEvery 秒往场上补两只小怪。血量只有校猫的一半，威胁全在补充上。
function updateMijiuBoss(dt) {
  const B = BOSS_MIJIU;
  if (!B || G.phase !== 'run') return;
  if (G.mjIdx < 0) return;
  if (!G.mjSpawned) {
    if (B.afterCat && !G.catKilled) return;
    const e = spawnEnemy(2, null, null, G.mjIdx);
    if (!e) return;
    G.mjSpawned = true;
    G.mjT = 0;
    e.mj = true;
    e.r = B.r || 46;
    e.maxHp = Math.round(e.maxHp * (B.hpMul || 2));
    e.hp = e.maxHp;
    e.spd *= 0.58;
    e.n = B.n;
    G.warnName = B.n;
    G.warn = 3.2;
    G.shake = 16; G.flash = 0.6;
    sfx.play('boss');
    G.bossAlive = true;
    const ls = (B.lines && B.lines.spawn) || [];
    if (ls.length) addText(G.player.x, G.player.y - 76, ls[(rnd() * ls.length) | 0], 6);
    G.fx.push({ x: e.x, y: e.y, vx: 0, vy: 0, kind: 'ring', life: 0.9, max: 0.9, color: '#9fc4e8', r: 0, ring: 280 });
    return;
  }
  if (G.mjKilled) return;
  // 死了就停：场上没有他，规则就不再改。用「场上还有没有 mj」判断，
  // 而不是另开一个计时器归零 —— 如果他先被清掉，这里从一开始就不会补怪。
  if (!G.enemies.some((x) => x.mj)) return;
  G.mjT = (G.mjT || 0) + dt;
  if (G.mjT < (B.addEvery || 7)) return;
  G.mjT = 0;
  let n = 0;
  for (let i = 0; i < 2; i++) if (spawnEnemy(0)) n++;
  if (n) {
    const ls = (B.lines && B.lines.add) || [];
    if (ls.length) addText(G.player.x, G.player.y - 76, ls[(rnd() * ls.length) | 0], 5);
  }
}

// ---------------------------------------------------------------- 对外摘要
export function summary() {
  const st = { kills: G.kills, t: G.t, lv: G.lv, bossKills: G.bossKills };
  const base = scoreOf(st);
  return {
    ...st,
    cat: G.catKilled, catSpawned: G.catSpawned,
    // 校猫是一局一次的收尾彩蛋：打赢了额外记 1500 分（约等于六只首领的分数），
    // 打不过也没有惩罚 —— 它本来就不该出现在这里。
    catName: (BOSS_CAT && BOSS_CAT.n) || '弥萨格校猫',
    mj: G.mjKilled, mjSpawned: G.mjSpawned,
    mjName: (BOSS_MIJIU && BOSS_MIJIU.n) || '米酒',
    score: Math.round(base * G.diff.mul) + (G.catKilled ? 1500 : 0) + (G.mjKilled ? 2500 : 0),
    diff: G.diff.k,
    char: G.char ? G.char.n : '',
    charId: G.char ? G.char.id : '',
    realm: G.char ? G.char.realm : '',
    charImg: G.char ? G.char.img : null,
    win: G.phase === 'win',
    gaveUp: !!G.gaveUp,
    // 机制与后期成长要能在结算里复盘：王权叠到几层、封印触发几次、
    // 攒了多少次淬炼、包里还剩什么道具。
    mech: G.mech ? { ...G.mech, n: (MECHS[G.char && G.char.id] || {}).n || '' } : null,
    growth: G.growth.map((g) => ({ id: g.id, n: g.n, icon: g.icon })),
    items: G.items.map((i) => ({ id: i.id, n: i.n, icon: i.icon })),
    // 每个技能的伤害明细：结算面板靠它回答「到底哪把武器在干活」。
    // 引擎只给原始数字，百分比和条形由 UI 算 —— 免得以后改算法还要动这里。
    weapons: G.weapons
      .map((w) => ({
        id: w.def.id, n: w.def.n, char: w.def.charName, charId: w.def.char,
        lv: w.lv + 1, proto: w.def.proto,
        color: (PROTOS[w.def.proto] || {}).color || '#9ecbff',
        dmg: Math.round(w.dmgTotal || 0), hits: w.hits || 0,
        evo: w.evo ? w.evo.n : null,
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

