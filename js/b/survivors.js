// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持顶层 await，顺序即依赖顺序。

// ---- js/sv/defs.js
const m_defs = await (async () => {

// 《唤醒体幸存者》规则层：原型参数、被动/命轮/契物效果、波次曲线。
//
// 这里只放「数值和规则」，不放绘制也不放流程。改平衡就改这里：
//   武器原型 12 种（PROTOS）—— 决定一个技能在场上长什么样、多久触发一次；
//   造物 42 件（叠在 CREATIONS 上）—— 通用被动；
//   命轮 18 张、契物 9 件 —— 稀有 / 超稀有的质变装备；
//   波次（waves）—— 15 分钟里敌人怎么变强。
//
// 所有百分比都是「叠加」而不是连乘：玩家能心算，写进面板也不会出现
// 「+20% 和 +20% 只涨了 44%」的错觉。

// ---------------------------------------------------------------- 原型
// cd   基础冷却（秒），每级 ×0.94（6 级约 -26%）
// dmg  基础伤害，每级 +22%
// n    基础数量，按 nStep 每几级 +1
// 伤害最终会乘上玩家的 atk（攻击力倍率）。
const PROTOS = {
  bolt: {
    name: '单发弹道', color: '#7fb3ff', cd: 0.78, dmg: 15, n: 1, nStep: 2,
    desc: (lv) => `向最近的敌人打出 ${1 + Math.floor(lv / 2)} 发追身弹，穿透 ${lv >= 4 ? 2 : 0} 次`,
  },
  orbit: {
    name: '环绕光刃', color: '#9d7bff', cd: 0.55, dmg: 9, n: 2, nStep: 1,
    desc: (lv) => `${2 + lv} 枚光刃绕身旋转，贴身连续切割`,
  },
  nova: {
    name: '近身爆发', color: '#ff8a5c', cd: 1.2, dmg: 30, n: 1, nStep: 99,
    desc: (lv) => `以自身为中心爆开 ${(90 + lv * 14).toFixed(0)} 范围，击退周围敌人`,
  },
  beam: {
    name: '贯穿射线', color: '#5fe0d0', cd: 1.35, dmg: 20, n: 1, nStep: 3,
    desc: (lv) => `朝最近的敌人打出一道穿透射线，持续 ${(0.3 + lv * 0.05).toFixed(2)} 秒`,
  },
  chain: {
    name: '连锁传导', color: '#ffe066', cd: 1.2, dmg: 13, n: 2, nStep: 1,
    desc: (lv) => `命中后向周围传导 ${2 + lv} 次，每次伤害递减 8%`,
  },
  field: {
    name: '持续领域', color: '#8bd450', cd: 2.4, dmg: 7, n: 1, nStep: 2,
    desc: (lv) => `在敌群脚下留下一片 ${(2.4 + lv * 0.3).toFixed(1)} 秒的侵蚀领域，持续造成伤害`,
  },
  summon: {
    name: '召唤随行', color: '#ff9ecb', cd: 3.2, dmg: 11, n: 1, nStep: 2,
    desc: (lv) => `召出 ${1 + Math.floor(lv / 2)} 个随从，自动扑向最近的敌人`,
  },
  boomerang: {
    name: '回旋投掷', color: '#c8e06a', cd: 1.15, dmg: 16, n: 1, nStep: 3,
    desc: (lv) => `掷出 ${1 + Math.floor(lv / 3)} 枚回旋镖，去程与回程都能造成伤害`,
  },
  missile: {
    name: '追踪飞弹', color: '#ff6f91', cd: 1.05, dmg: 11, n: 2, nStep: 1,
    desc: (lv) => `射出 ${2 + lv} 枚追踪弹，自动拐弯追向最近的敌人`,
  },
  strike: {
    name: '天降打击', color: '#f2c94c', cd: 1.6, dmg: 24, n: 1, nStep: 2,
    desc: (lv) => `在 ${1 + Math.floor(lv / 2)} 个敌人头顶落下重击，落点提前预警 0.45 秒`,
  },
  shield: {
    name: '护盾反击', color: '#6ea8ff', cd: 2.0, dmg: 14, n: 1, nStep: 99,
    desc: (lv) => `获得 ${8 + lv * 6} 点护盾，并向四周放出一道冲击波`,
  },
  heal: {
    name: '圣光回响', color: '#8ce0a8', cd: 3.0, dmg: 10, n: 1, nStep: 99,
    desc: (lv) => `回复 ${2 + lv} 点生命，并震开周围敌人`,
  },
  // ---- 2026-10 新增的 6 种原型
  // 原来的 12 种里 field/beam/nova 三种就占了 49 把（field 一家 22 把），
  // 一局下来场上永远在放领域、射线和爆圈。这 6 种各有自己的场面表现：
  // 涡流是「聚」，陨石与光雨是「砸」，图腾是「守」，锯轮是「穿」，地雷是「埋」。
  vortex: {
    name: '引力涡流', color: '#9b8bff', cd: 2.6, dmg: 8, n: 1, nStep: 2,
    desc: (lv) => `在敌群中心撕开 ${(1.6 + lv * 0.2).toFixed(1)} 秒的涡流，把敌人拽向中心`,
  },
  meteor: {
    name: '陨星坠落', color: '#ff7a45', cd: 2.2, dmg: 26, n: 1, nStep: 2,
    desc: (lv) => `召来 ${1 + Math.floor(lv / 2)} 颗陨石砸向敌群，落点预警 0.55 秒`,
  },
  totem: {
    name: '图腾雷击', color: '#5ad1ff', cd: 3.4, dmg: 12, n: 1, nStep: 2,
    desc: (lv) => `放下 ${1 + Math.floor(lv / 2)} 座图腾，每 0.9 秒向最近的敌人放电`,
  },
  saw: {
    name: '裂轮切割', color: '#d9e36a', cd: 1.0, dmg: 13, n: 1, nStep: 2,
    desc: (lv) => `甩出 ${1 + Math.floor(lv / 2)} 枚锯轮，直线往返切割，穿透一切`,
  },
  mine: {
    name: '地雷布阵', color: '#ffb14e', cd: 1.8, dmg: 34, n: 1, nStep: 2,
    desc: (lv) => `在脚下埋 ${1 + Math.floor(lv / 2)} 颗地雷，敌人靠近即引爆`,
  },
  rain: {
    name: '光雨轰击', color: '#ffe9a8', cd: 2.9, dmg: 9, n: 3, nStep: 2,
    desc: (lv) => `向随机敌人落下 ${3 + Math.floor(lv / 2)} 道光柱`,
  },
  // ---- 2026-10 四位「神秘唤醒体」的专属原型
  // 这四种不参与普通角色的技能分配（build_survivors_data.mjs 里只给 EXTRA 用），
  // 所以每一种的场面表现都能做得更极端：一根柱子、一次回响、一盏灯、一页封印。
  judge: {
    name: '审判之柱', color: '#ffd76a', cd: 2.8, dmg: 18, n: 1, nStep: 2,
    desc: (lv) => `在敌群中心插下 ${1 + Math.floor(lv / 2)} 座审判柱，3 秒内持续灼烧并迟滞敌人`,
  },
  paradox: {
    name: '悖论回响', color: '#c69bff', cd: 3.8, dmg: 14, n: 1, nStep: 99,
    desc: (lv) => `把你最近 3 秒造成的伤害复现 ${25 + lv * 5}%，在身周炸开`,
  },
  lantern: {
    name: '长明灯', color: '#ffe9a8', cd: 4.2, dmg: 6, n: 1, nStep: 99,
    desc: (lv) => `点燃长明灯，${(5 + lv * 0.5).toFixed(1)} 秒内持续灼烧并迟滞范围内的敌人`,
  },
  seal: {
    name: '封印书页', color: '#9aa7ff', cd: 2.4, dmg: 22, n: 1, nStep: 2,
    desc: (lv) => `封住最近的 ${1 + Math.floor(lv / 2)} 名敌人，定身 1.2 秒并造成伤害`,
  },
};

// 12 原型里各挑一个「代表武器」的兜底顺序：某个原型一把都抽不到时不至于空池。
const PROTO_ORDER = Object.keys(PROTOS);

// 每级成长（等级从 0 计，最高 5 级 = 6 档）
const LV = {
  dmg: (lv) => 1 + lv * 0.22,
  cd: (lv) => Math.pow(0.94, lv),
  count: (lv, w) => (w.nStep ? w.n + Math.floor(lv / w.nStep) : w.n),
  max: 5,
};

// 技能栏：6 格。满了之后不再「抽不到新技能」，而是出现「替换」选项——
// 幸存者类的乐趣一半在Build 试错，卡死在上限会让人后半局没得选。
const MAX_WEAPON = 6;
// 每个原型往候选池里放几把。原本只放 1 把，整局最多见到 13 个技能，
// 124 条里九成永远抽不到；放到 2 把之后候选池 24 把左右，每局都长得不一样。
const POOL_PER_PROTO = 2;

// ---------------------------------------------------------------- 狂气
// 原作里「狂气」是打出来的资源，这里落成一条能量槽：
// 造成伤害与击杀都攒，攒满可以主动放一次爆发（攻击力/攻速/移速一起抬）。
// 释放期间不再积攒，所以它是「一波流」而不是常驻增益。
// 这两个数是按「整局 15 分钟」实测调出来的，别只看前 200 秒：
// 前 200 秒 bot 只放了 6~7 次，同一套参数跑到 900 秒会变成 86 次 —— 后期击杀
// 密度是指数上涨的，按击杀线性攒能量必然失控。现在整局约 20 次（平均 45 秒一波），
// 爆发期占全局时间约 13%，是「憋出来的一波」而不是常驻增益。
const RAGE = {
  max: 100,
  perKill: 0.1,        // 每击杀
  perDmg: 0.0012,      // 每一丝丝伤害（按点算）
  dur: 6,              // 爆发持续（秒）
  atk: 0.6,            // 爆发期攻击力 +60%
  cd: 0.7,             // 爆发期冷却 ×0.7
  spd: 0.15,           // 爆发期移速 +15%
  blast: 130,          // 释放瞬间的冲击波伤害（会被 atk 再乘一次）
};

// ---------------------------------------------------------------- 地形
// 15 分钟切五段地貌，只改视觉不动数值 —— 这条平衡曲线微调 20% 就能让
// 普通难度从「打满 15 分钟」变成「10 分钟团灭」，地形不该是第六个变量。
//   base   地面底色        blob 深浅斑块用的颜色（rgba 前缀）
//   grid   网格线颜色      glow 该地形的氛围光（屏幕边缘）
//   deco   地面装饰物类型（绘制细节在 render.js 里按 k 分派）
const TERRAINS = [
  {
    k: 'ash', n: '灰烬废土', base: '#111621', blob: 'rgba(105,140,200,',
    grid: 'rgba(130,160,215,0.06)', glow: 'rgba(110,168,255,0.10)',
    deco: ['rubble', 'crack', 'pebble'],
  },
  {
    k: 'swamp', n: '蚀水沼泽', base: '#0d1512', blob: 'rgba(90,170,110,',
    grid: 'rgba(120,200,150,0.05)', glow: 'rgba(90,200,140,0.10)',
    deco: ['pool', 'reed', 'pebble'],
  },
  {
    k: 'snow', n: '骨白雪原', base: '#141a24', blob: 'rgba(190,215,245,',
    grid: 'rgba(200,225,255,0.07)', glow: 'rgba(180,215,255,0.12)',
    deco: ['snowdrift', 'ice', 'pebble'],
  },
  {
    k: 'ember', n: '熔核裂谷', base: '#170f10', blob: 'rgba(220,110,60,',
    grid: 'rgba(240,130,80,0.06)', glow: 'rgba(240,110,60,0.11)',
    deco: ['lava', 'crack', 'rubble'],
  },
  {
    k: 'void', n: '虚空回廊', base: '#0d0b16', blob: 'rgba(150,110,220,',
    grid: 'rgba(170,140,240,0.06)', glow: 'rgba(150,110,230,0.12)',
    deco: ['star', 'rune', 'crack'],
  },
];
// 每 3 分钟换一次；第 15 分钟刚好走完最后一段
const TERRAIN_AT = [0, 180, 360, 540, 720];
const terrainAt = (t) => {
  let i = 0;
  for (let k = 0; k < TERRAIN_AT.length; k++) if (t >= TERRAIN_AT[k]) i = k;
  return i;
};

// ---------------------------------------------------------------- 造物（被动）
// 官方造物本身是战斗内效果，跟这里的实时动作游戏对不上，所以按它的
// tags（dmg / crit / guard / draw / energy / rage / str / exhaust）映射成
// 通用加成，名字和图标保持原样。同一件造物最多叠 3 层。
//
// 2026-10 扩充：原来只有 12 类，42 件造物平均 3.5 件共用同一个效果，
// 抽到「肉冻」「幸运风衣」「偏方骰子」感觉完全一样。现在 26 类，
// 按「攻击 / 投射物 / 生存 / 节奏 / 资源」五组铺开，每类都在引擎里真实生效
// （改这里必须同时改 engine 的 applyCreation，否则就是描述骗人）。
const CREATION_FX = {
  // ---- 攻击
  dmg: { k: 'atk', v: 0.08, txt: '攻击力 +8%' },
  str: { k: 'atk', v: 0.12, txt: '攻击力 +12%，受伤 +3%' },
  crit: { k: 'crit', v: 0.06, txt: '暴击率 +6%' },
  critdmg: { k: 'critMul', v: 0.15, txt: '暴击伤害 +15%' },
  exhaust: { k: 'dmgTaken', v: 0.03, txt: '受伤 +3%，全伤害 +6%' },
  // ---- 投射物
  count: { k: 'count', v: 1, txt: '投射物 +1（多发技能多打一份）' },
  pierce: { k: 'pierce', v: 1, txt: '所有弹道额外穿透 1 次' },
  projspd: { k: 'projSpd', v: 0.12, txt: '弹道飞行速度 +12%' },
  projrange: { k: 'projRange', v: 0.12, txt: '投射物射程 +12%' },
  area: { k: 'area', v: 0.1, txt: '技能作用范围 +10%' },
  fieldr: { k: 'fieldRadius', v: 0.15, txt: '领域与涡流半径 +15%' },
  dur: { k: 'dur', v: 0.12, txt: '领域与射线持续时间 +12%' },
  // ---- 生存
  guard: { k: 'maxHp', v: 18, txt: '最大生命 +18' },
  shieldup: { k: 'maxShield', v: 20, txt: '护盾上限 +20' },
  regen: { k: 'regen', v: 0.3, txt: '每秒回复 +0.3' },
  lifesteal: { k: 'lifesteal', v: 0.03, txt: '造成伤害的 3% 转为治疗' },
  thorns: { k: 'thorns', v: 10, txt: '受击时反弹 10 点伤害' },
  // ---- 节奏
  speed: { k: 'spd', v: 0.06, txt: '移动速度 +6%' },
  energy: { k: 'cd', v: -0.05, txt: '技能冷却 -5%' },
  knock: { k: 'knock', v: 0.25, txt: '击退强度 +25%' },
  // ---- 资源
  draw: { k: 'pick', v: 0.3, txt: '拾取范围 +30%，经验 +6%' },
  magnet: { k: 'pick', v: 0.45, txt: '拾取范围 +45%' },
  expup: { k: 'exp', v: 0.1, txt: '经验获取 +10%' },
  rage: { k: 'rage', v: 0.12, txt: '狂气积攒 +12%，攻击力 +2%' },
  healup: { k: 'healBoost', v: 0.2, txt: '治疗量 +20%' },
  summonup: { k: 'summon', v: 1, txt: '召唤物 +1' },
};
const CREATION_STACK = 3;

// ---------------------------------------------------------------- 命轮
// 18 张，每张一个明确的质变效果；一级就能感觉到差别。
// key 是效果句柄，引擎里按 key 生效（见 engine 的装备结算）。
const WHEEL_FX = [
  { key: 'regen_pulse', txt: '每 8 秒回复 4 点生命' },
  { key: 'all_dmg20', txt: '所有武器伤害 +20%' },
  { key: 'slow15', txt: '敌人移动速度 -15%' },
  { key: 'critdmg80', txt: '暴击伤害 +80%' },
  { key: 'pierce2', txt: '所有弹道额外穿透 2 次' },
  { key: 'killburst', txt: '击杀时爆开一圈血雾，造成 12 点伤害' },
  { key: 'atkspd20', txt: '所有武器冷却 -20%' },
  { key: 'exp25', txt: '经验获取 +25%' },
  { key: 'armor3', txt: '每次受到的伤害减 3 点' },
  { key: 'shield_start', txt: '护盾上限 +30，破盾时清场一圈' },
  { key: 'lifesteal5', txt: '造成伤害的 5% 转为治疗' },
  { key: 'revive', txt: '濒死时以 40% 生命复活一次' },
  { key: 'summon_extra', txt: '召唤物 +2，且伤害 +25%' },
  { key: 'field_wide', txt: '领域与爆发范围 +35%' },
  { key: 'golden_touch', txt: '血量低于 75% 时，击杀有 6% 概率掉落治疗光球' },
  { key: 'thorns', txt: '受击时对周围反弹 25 点伤害' },
  { key: 'first_strike', txt: '进入战斗时立刻触发一次全武器齐射' },
  { key: 'time_dilate', txt: '每次升级后 3 秒内敌人减速 60%' },
];

// ---------------------------------------------------------------- 契物
// 9 件，比命轮更极端，只在 10 分钟后出现。
const COVENANT_FX = [
  { key: 'c_area35', txt: '全作用范围 +35%，伤害 +15%' },
  { key: 'c_revive2', txt: '复活次数 +1（可与命轮叠加）' },
  { key: 'c_magnet', txt: '经验与治疗全部自动飞向你，拾取范围翻倍' },
  { key: 'c_burst', txt: '每 15 秒自动引爆一次全屏冲击，造成 60 点伤害' },
  { key: 'c_echo', txt: '武器有 30% 概率连续触发两次' },
  { key: 'c_blood', txt: '击杀回复 1 点生命，攻击力 +10%' },
  { key: 'c_haste', txt: '移动速度 +18%，冷却 -12%' },
  { key: 'c_guard', txt: '最大生命 +60，减伤 8%' },
  { key: 'c_frenzy', txt: '生命越低伤害越高（最多 +45%）' },
];

// ---------------------------------------------------------------- 超武（进化）
// 机制：一把技能「升格」成超武需要凑条件，条件只有四种可判定的形式 ——
//   creation: { fx, n }  某类造物累计 n 层（同一件叠 3 层算 3 层）
//   wheel:    'key'      拥有某张命轮
//   level:    n          这把技能自身达到 n 级
//   proto:    'xxx'      队伍里还有一把别的原型的技能（双流派型）
// 满足后 `w.evo` 指向这张表，效果是质变（多一发、多穿透、范围翻倍），
// 不是再造物那种 +8%。专武额外带 char，只对那一名唤醒体的技能生效。
//
// fx 字段含义（全部在 engine 的 fireProto / damageEnemy 里真实生效）：
//   dmg 伤害乘数加成   cd 冷却乘数   count 投射数 +n   pierce 穿透 +n
//   area 范围加成      crit 暴击率   critMul 暴击伤害   onHit:'burst' 命中溅射
const EVOS = [
  // ---------------- 通用超武：按原型，靠造物/命轮组合解锁
  {
    id: 'evo_bolt', proto: 'bolt', n: '追猎弩炮', color: '#7fb3ff',
    need: { creation: { fx: 'crit', n: 2 } },
    fx: { count: 2, pierce: 2, dmg: 0.35 },
    txt: '额外 +2 发，全部穿透，伤害 +35%',
  },
  {
    id: 'evo_orbit', proto: 'orbit', n: '绞杀之环', color: '#9d7bff',
    need: { creation: { fx: 'speed', n: 2 } },
    fx: { count: 3, dmg: 0.25, area: 0.15 },
    txt: '光刃 +3 枚，伤害 +25%',
  },
  {
    id: 'evo_nova', proto: 'nova', n: '崩解核心', color: '#ff8a5c',
    need: { creation: { fx: 'str', n: 2 } },
    fx: { area: 0.45, dmg: 0.5, onHit: 'burst' },
    txt: '爆发范围 +45%，伤害 +50%，命中溅射',
  },
  {
    id: 'evo_beam', proto: 'beam', n: '贯日长虹', color: '#5fe0d0',
    need: { creation: { fx: 'projspd', n: 2 } },
    fx: { dmg: 0.4, area: 0.3, pierce: 4 },
    txt: '射线加宽 30%，伤害 +40%，穿透一切',
  },
  {
    id: 'evo_field', proto: 'field', n: '永蚀之土', color: '#8bd450',
    need: { creation: { fx: 'dur', n: 2 } },
    fx: { area: 0.4, dmg: 0.3 },
    txt: '领域半径 +40%，伤害 +30%',
  },
  {
    id: 'evo_chain', proto: 'chain', n: '雷霆万钧', color: '#ffe066',
    need: { creation: { fx: 'critdmg', n: 2 } },
    fx: { count: 3, dmg: 0.25 },
    txt: '额外跳跃 +3 次，伤害 +25%',
  },
  {
    id: 'evo_summon', proto: 'summon', n: '军团召唤', color: '#ff9ecb',
    need: { creation: { fx: 'summonup', n: 2 } },
    fx: { count: 2, dmg: 0.4 },
    txt: '召唤物 +2，伤害 +40%',
  },
  {
    id: 'evo_strike', proto: 'strike', n: '审判之锤', color: '#f2c94c',
    need: { creation: { fx: 'knock', n: 2 } },
    fx: { count: 2, dmg: 0.4, area: 0.25 },
    txt: '落点 +2 处，伤害 +40%',
  },
  {
    id: 'evo_vortex', proto: 'vortex', n: '黑洞坍缩', color: '#9b8bff',
    need: { creation: { fx: 'fieldr', n: 2 } },
    fx: { area: 0.5, dmg: 0.35 },
    txt: '涡流半径 +50%，吸力翻倍，伤害 +35%',
  },
  {
    id: 'evo_saw', proto: 'saw', n: '裂空锯', color: '#d9e36a',
    need: { creation: { fx: 'pierce', n: 2 } },
    fx: { count: 2, dmg: 0.3 },
    txt: '锯轮 +2 枚，伤害 +30%',
  },
  {
    id: 'evo_mine', proto: 'mine', n: '连锁爆破', color: '#ffb14e',
    need: { creation: { fx: 'area', n: 2 } },
    fx: { area: 0.5, dmg: 0.35 },
    txt: '爆炸范围 +50%，伤害 +35%',
  },
  {
    id: 'evo_rain', proto: 'rain', n: '万钧光雨', color: '#ffe9a8',
    need: { creation: { fx: 'projrange', n: 2 } },
    fx: { count: 3, dmg: 0.3 },
    txt: '光柱 +3 道，伤害 +30%',
  },
  {
    id: 'evo_totem', proto: 'totem', n: '雷神祭坛', color: '#5ad1ff',
    need: { creation: { fx: 'energy', n: 2 } },
    fx: { count: 1, dmg: 0.3, cd: 0.75 },
    txt: '图腾 +1，放电更快，伤害 +30%',
  },
  {
    id: 'evo_missile', proto: 'missile', n: '蜂群导弹', color: '#ff6f91',
    need: { creation: { fx: 'count', n: 1 } },
    fx: { count: 3, dmg: 0.2 },
    txt: '导弹 +3 枚，伤害 +20%',
  },
  {
    id: 'evo_boomerang', proto: 'boomerang', n: '千回之刃', color: '#c8e06a',
    need: { creation: { fx: 'projrange', n: 1 } },
    fx: { count: 2, dmg: 0.3 },
    txt: '回旋镖 +2 枚，伤害 +30%',
  },
  {
    id: 'evo_shield', proto: 'shield', n: '不动壁垒', color: '#6ea8ff',
    need: { creation: { fx: 'shieldup', n: 2 } },
    fx: { area: 0.5, dmg: 0.4 },
    txt: '护盾与冲击波范围 +50%，伤害 +40%',
  },
  {
    id: 'evo_heal', proto: 'heal', n: '圣愈领域', color: '#8ce0a8',
    need: { creation: { fx: 'healup', n: 2 } },
    fx: { area: 0.5, dmg: 0.3 },
    txt: '治疗回合范围 +50%，伤害 +30%',
  },

  // ---------------- 专武：只属于某一名唤醒体，条件是技能练到 4 级
  {
    id: 'sw_24', char: '15601', n: '共生·完全体', color: '#ff6a5a',
    need: { level: 3 },
    fx: { dmg: 0.45, area: 0.3, onHit: 'burst' },
    txt: '「24」专属：伤害 +45%，范围 +30%，命中溅射',
  },
  {
    id: 'sw_dur', char: '95786', n: '血肉曼陀罗', color: '#ff9ecb',
    need: { level: 3 },
    fx: { count: 1, dmg: 0.35 },
    txt: '杜勒赛因专属：投射/召唤 +1，伤害 +35%',
  },
  {
    id: 'sw_katy', char: '77913', n: '千兆圣裁', color: '#5fe0d0',
    need: { level: 3 },
    fx: { dmg: 0.5, pierce: 3 },
    txt: '凯蒂古拉专属：伤害 +50%，穿透一切',
  },
  {
    id: 'sw_gol', char: '15564', n: '断首者', color: '#ff8a5c',
    need: { level: 3 },
    fx: { crit: 0.18, critMul: 0.6, dmg: 0.2 },
    txt: '戈利亚专属：暴击率 +18%，暴击伤害 +60%',
  },
  {
    id: 'sw_ray', char: '15597', n: '苦痛共鸣', color: '#8ce0a8',
    need: { level: 3 },
    fx: { cd: 0.75, dmg: 0.3 },
    txt: '雷娅专属：冷却 -25%，伤害 +30%',
  },
  {
    id: 'sw_pan', char: '15560', n: '疯狂之鞭', color: '#c8e06a',
    need: { level: 3 },
    fx: { count: 2, cd: 0.85, dmg: 0.2 },
    txt: '潘狄娅专属：投射 +2，冷却 -15%，伤害 +20%',
  },

  // ---------------- 四种神秘原型自己的超武
  {
    id: 'evo_judge', proto: 'judge', n: '王座永临', color: '#ffd76a',
    need: { creation: { fx: 'knock', n: 2 } },
    fx: { count: 1, area: 0.4, dmg: 0.3 },
    txt: '审判柱 +1，范围 +40%，伤害 +30%',
  },
  {
    id: 'evo_paradox', proto: 'paradox', n: '因果崩塌', color: '#c69bff',
    need: { creation: { fx: 'critdmg', n: 2 } },
    fx: { dmg: 0.6, area: 0.3 },
    txt: '回响伤害 +60%，范围 +30%',
  },
  {
    id: 'evo_lantern', proto: 'lantern', n: '不灭灯火', color: '#ffe9a8',
    need: { creation: { fx: 'fieldr', n: 2 } },
    fx: { area: 0.55, dmg: 0.4 },
    txt: '灯光半径 +55%，灼烧伤害 +40%',
  },
  {
    id: 'evo_seal', proto: 'seal', n: '禁书全卷', color: '#9aa7ff',
    need: { creation: { fx: 'crit', n: 2 } },
    fx: { count: 2, dmg: 0.35 },
    txt: '封印目标 +2，伤害 +35%',
  },

  // ---------------- 神秘唤醒体的专武
  {
    id: 'sw_tulu', char: '90001', n: '王权永续', color: '#ffd76a',
    need: { level: 3 },
    fx: { dmg: 0.5, area: 0.35, onHit: 'burst' },
    txt: '图鲁专属：伤害 +50%，范围 +35%，命中溅射',
  },
  {
    id: 'sw_n', char: '90002', n: '自指悖论', color: '#c69bff',
    need: { level: 3 },
    fx: { cd: 0.7, dmg: 0.4 },
    txt: 'N 专属：冷却 -30%，伤害 +40%',
  },
  {
    id: 'sw_wil', char: '90003', n: '长夜不熄', color: '#7fb3ff',
    need: { level: 3 },
    fx: { area: 0.45, dmg: 0.4 },
    txt: '威廉专属：范围 +45%，伤害 +40%',
  },
  {
    id: 'sw_keeper', char: '90004', n: '终章之印', color: '#9aa7ff',
    need: { level: 3 },
    fx: { count: 1, dmg: 0.45 },
    txt: '守密人专属：投射/封印 +1，伤害 +45%',
  },
];

// ---------------------------------------------------------------- 波次
// 15 分钟一局。hp/spd 会随时间再乘一次增长曲线，所以这里的数字是「起点」。
// kind 决定刷新点位置：ring 围一圈、edge 从屏幕边、cluster 成群。
const RUN_TIME = 15 * 60;

// hp 是「敌人有多硬 / 有多少」，dmg 是「挨一下多疼」。两者分开是必要的：
// 之前一个 hp 同时管血量和伤害，困难 1.45 倍的伤害配上 1.3 倍的刷怪量，
// 实测 4 分钟就被磨死；而调低它又会让敌人变脆、场上更空。
const DIFFS = [
  { k: 'easy', n: '简单', hp: 0.72, dmg: 0.72, spd: 0.9, rate: 0.8, mul: 0.8, tip: '敌人更少更脆，适合先认识操作' },
  { k: 'normal', n: '普通', hp: 1, dmg: 1, spd: 1, rate: 1, mul: 1, tip: '标准强度，15 分钟打满算通关' },
  { k: 'hard', n: '困难', hp: 1.35, dmg: 1.12, spd: 1.06, rate: 1.3, mul: 1.6, tip: '敌人更硬也更多，得分 ×1.6' },
  { k: 'frenzy', n: '癫狂', hp: 1.75, dmg: 1.22, spd: 1.12, rate: 1.5, mul: 2.4, tip: '成群结队压过来，得分 ×2.4' },
];

// 刷怪曲线：t 秒时的基础刷怪间隔（秒）
// 这条曲线不是「难度」，而是「供给」：玩家的输出会随武器升级一路涨，刷怪
// 跟不上就会出现「满屏空荡荡，跑半天没怪打」。现在约 2.9 只/秒起手、
// 5 分钟 4 只/秒、15 分钟 9 只/秒。
// 早期版本把加压写成「每波数量递增」，乘出来是二十几只/秒，几分钟就把
// 300 上限塞满——压力该来自「敌人变强 + 包围」，不是靠瞬间堆数量。
const spawnGap = (t) => Math.max(0.09, 0.34 * Math.pow(0.99, t / 6));
// 敌人血量随时间线性放大：每分钟 +70%，15 分钟约 11.5 倍。
// 用线性而不是指数 —— 指数到后期会变成「怎么打都不掉血」，
// 玩家真正该追的是自己的升级速度，而不是跟一条算不完的曲线赛跑。
const hpScale = (t) => 1 + (t / 60) * 0.7;
// 敌人攻击随时间放大
const dmgScale = (t) => 1 + t / 300;

// 关键节点（秒）：精英与 Boss。时间一到就刷，同时给一段压力峰值。
const BOSS_AT = [300, 600, 900];
// 精英原来是固定 70 秒刷 2 只，整局节奏一条直线：第 14 分钟和第 1 分钟一样稀。
// 现在间隔随时间收紧（每分钟 ×0.93，最快 20 秒），同时数量分三档抬上去，
// 中后期才会出现「刚清完一波又来一群」的压迫感 —— 但压的是精英，不是小怪数量，
// 小怪那条曲线动一下就会把 300 上限塞满。
const ELITE_EVERY = 70;
const eliteGap = (t) => Math.max(20, ELITE_EVERY * Math.pow(0.93, t / 60));
const eliteCount = (t) => (t >= 720 ? 3 : t >= 360 ? 2 : 1);

// ---------------------------------------------------------------- 玩家
const PLAYER = {
  r: 13,
  hp: 110,
  speed: 108,
  iframe: 0.55,        // 受伤无敌时间
  pickR: 42,
  magnetR: 128,        // 经验吸附半径
  critBase: 0.05,
  critMul: 1.8,
};

// 升级所需经验：1 级 → 2 级要 12，之后每级 +32%，60 级左右封顶
// 升级经验：每级 ×1.15。15 分钟打到 25~30 级，正好够把 4~5 把武器点到满级。
// （×1.32 时 20 级要杀 120 只，实际跑下来角色卡在 5 级再也升不动。）
const expNeed = (lv) => Math.round(8 * Math.pow(1.15, lv - 1));

// 得分：击杀 + 存活 + 等级 + Boss；难度倍率在结算时乘
const scoreOf = (st) => Math.round(st.kills * 2 + st.t * 5 + st.lv * 30 + st.bossKills * 250);

// 得分换银芯（与合成大杜勒同一个钱包，阶梯式，取到达的最高档）
const CREDIT_TIERS = [
  [400, 2], [900, 4], [1600, 7], [2600, 11], [3800, 15],
  [5200, 20], [7000, 26], [9200, 33], [12000, 42], [16000, 55], [22000, 75],
];
const creditsAt = (score) => {
  let base = 0;
  for (const [s, c] of CREDIT_TIERS) if (score >= s) base = c;
  return base;
};
const nextTier = (score) => CREDIT_TIERS.find(([s]) => score < s) || null;

// ---------------------------------------------------------------- 神秘唤醒体
// 四位没有立绘的唤醒体（选人面板上是黑色剪影）。他们不进普通卡池，
// 要先满足条件才放出来 —— 条件写在 UNLOCKS 里，进度存在 js/sv/unlock.js。
//
// 条件设计的取舍：四条线分别考「广度 / 难度 / 深度 / 全面」，
// 而不是「通关 N 次」这种同一件事数量堆叠，否则四条会变成同一件事的四种写法。
const UNLOCKS = {
  // 广度：换着人玩
  90001: {
    need: '用 10 名不同的唤醒体各通关一次（普通及以上）',
    prog: (p) => `${Math.min(10, p.clears.length)}/10`,
    cond: (p) => new Set(p.clears).size >= 10,
  },
  // 难度：至少把最硬的那档打穿
  90002: {
    need: '在「癫狂」难度下撑满 15 分钟',
    prog: (p) => (p.diffs.includes('frenzy') ? '已达成' : '未达成'),
    cond: (p) => p.diffs.includes('frenzy'),
  },
  // 深度：硬碰硬地清强敌
  90003: {
    need: '累计击败 60 名强敌，且至少通关过一次',
    prog: (p) => `${Math.min(60, p.bosses)}/60`,
    cond: (p) => p.bosses >= 60 && p.clears.length >= 1,
  },
  // 全面：四个界域各自打穿一遍
  90004: {
    need: '用混沌 / 血肉 / 深海 / 超维四个界域各通关一次',
    prog: (p) => `${new Set(p.realms).size}/4`,
    cond: (p) => new Set(p.realms).size >= 4,
  },
};

// 每名神秘唤醒体的独有机制。数值在引擎里读，文案在 HUD 与选人面板直接显示。
// 这些机制不走 mods —— mods 是「装备加成」，机制是「这名角色的规则」。
const MECHS = {
  90001: {
    id: 'royalty', n: '王权', color: '#ffd76a',
    text: '每击杀 20 名敌人累积 1 层王权（最多 25 层）：每层攻击 +1.2%、范围 +0.4%；15 层起每秒回复 1 点生命',
    short: '王权',
  },
  90002: {
    id: 'paradox', n: '悖论', color: '#c69bff',
    text: '每次升级有 35% 概率多获得 1 次三选一；技能冷却 -8%，但最大生命 -10%',
    short: '悖论',
  },
  90003: {
    id: 'nightwatch', n: '守夜', color: '#7fb3ff',
    text: '受伤时向四周放出反击冲击波；生命低于 40% 时攻击 +35%、护盾上限 +50%',
    short: '守夜',
  },
  90004: {
    id: 'seal', n: '缄默契约', color: '#9aa7ff',
    text: '敌人生命 +12%，但经验 +45%；每升 1 级累积 1 道封印，满 5 道处决场上最虚弱的 4 名敌人',
    short: '封印',
  },
};

// ---------------------------------------------------------------- 后期成长
// 6 格技能全满级之后，武器/造物这两条线会同时见底，三选一就只剩「跳过」。
// 这里补两组「不会见底」的选项：极限淬炼（永久小幅成长）与一次性道具。
const GROWTHS = [
  { id: 'g_atk', n: '淬炼 · 锋', icon: '⚔', txt: '攻击力 +3%', fx: { atk: 0.03 } },
  { id: 'g_crit', n: '淬炼 · 锐', icon: '✦', txt: '暴击率 +2%，暴击伤害 +4%', fx: { crit: 0.02, critMul: 0.04 } },
  { id: 'g_hp', n: '淬炼 · 韧', icon: '❤', txt: '最大生命 +8，每秒回复 +0.3', fx: { maxHpBonus: 8, regen: 0.3 } },
  { id: 'g_cd', n: '淬炼 · 疾', icon: '⚡', txt: '冷却 -2%，移速 +2%', fx: { cd: 0.98, spd: 1.02 } },
  { id: 'g_reach', n: '淬炼 · 广', icon: '◎', txt: '作用范围、领域半径、持续时间各 +3%', fx: { area: 0.03, fieldRadius: 0.03, dur: 0.03 } },
  { id: 'g_edge', n: '淬炼 · 极', icon: '✧', txt: '暴击伤害 +8%，但最大生命 -3', fx: { critMul: 0.08, maxHpBonus: -3 } },
];

// 一次性道具：持有上限 3 件，用掉就没了。它们不占技能格、不进 mods，
// 只在关键时刻给一次「翻盘权」，所以数值可以做得比长线成长大方。
const ITEMS = [
  { id: 'i_medkit', n: '应急针剂', icon: '✚', color: '#8ce0a8', txt: '立刻回复 45% 最大生命' },
  { id: 'i_nuke', n: '湮灭符', icon: '☄', color: '#ff7a45', txt: '对全屏敌人造成一次重击（约 3 秒的输出量）' },
  { id: 'i_rage', n: '狂气血清', icon: '☣', color: '#ff9350', txt: '狂气直接充满，可立刻释放一次爆发' },
  { id: 'i_dice', n: '命运骰子', icon: '⚄', color: '#6ea8ff', txt: '立刻重掷本次三选一' },
];
const ITEM_MAX = 3;
return { PROTOS, PROTO_ORDER, LV, MAX_WEAPON, POOL_PER_PROTO, RAGE, TERRAINS, TERRAIN_AT, terrainAt, CREATION_FX, CREATION_STACK, WHEEL_FX, COVENANT_FX, EVOS, RUN_TIME, DIFFS, spawnGap, hpScale, dmgScale, BOSS_AT, ELITE_EVERY, eliteGap, eliteCount, PLAYER, expNeed, scoreOf, CREDIT_TIERS, creditsAt, nextTier, UNLOCKS, MECHS, GROWTHS, ITEMS, ITEM_MAX };
})();

// ---- js/sv/unlock.js
const m_unlock = await (async () => {
const { UNLOCKS } = m_defs;
// 「神秘唤醒体」的解锁进度。
//
// 只存本机 localStorage（与银芯同一个 zjtt 前缀），不读云端：解锁记录属于
// 单机进度，跟着账号走反而会出现「换设备就全解锁/全锁」的怪事，而这几名角色
// 的设计初衷就是「自己一层层打出来」。
//
// 存档结构刻意做得很小，四件事就够所有条件判定了：
//   clears  通关过的唤醒体 id 列表（去重后长度 = 用多少个不同角色通关过）
//   realms  通关过的界域
//   diffs   通关过的难度
//   bosses  累计击败的强敌数（败局也累计，否则「60 只强敌」会非常劝退）


const PKEY = 'zjtt:survivors:progress';

const blank = () => ({ clears: [], realms: [], diffs: [], bosses: 0, best: 0, runs: 0 });

function svProgress() {
  try {
    const raw = localStorage.getItem(PKEY);
    if (!raw) return blank();
    const o = JSON.parse(raw) || {};
    return {
      ...blank(), ...o,
      clears: Array.isArray(o.clears) ? o.clears : [],
      realms: Array.isArray(o.realms) ? o.realms : [],
      diffs: Array.isArray(o.diffs) ? o.diffs : [],
    };
  } catch {
    // 隐私模式下 localStorage 会抛异常，这时按「全新账号」处理即可，别让整局崩掉
    return blank();
  }
}

function saveProgress(p) {
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* 忽略 */ }
}

// 官方 62 名没有条目，默认就是开着的 —— UNLOCKS 只管四位神秘唤醒体。
function isUnlocked(id) {
  const u = UNLOCKS[id];
  if (!u) return true;
  return !!u.cond(svProgress());
}

function unlockNeed(id) {
  const u = UNLOCKS[id];
  return u ? u.need : '';
}

function unlockProg(id) {
  const u = UNLOCKS[id];
  return u ? u.prog(svProgress()) : '';
}

// 一局结束时记账。注意「输掉的局也要记」：强敌数是累计项，
// 否则全部条件都要靠通关才推进，输十局的玩家一点进度都看不到。
function recordRun(sm) {
  const p = svProgress();
  p.runs += 1;
  p.bosses += Math.max(0, sm.bossKills | 0);
  if (sm.score > p.best) p.best = sm.score;
  // 简单难度不算「通关」：它本来就是给新玩家认识操作的，算进来会让
  // 「用 10 个不同唤醒体通关」变成「随便换十个人打简单」。
  if (sm.win && sm.diff !== 'easy') {
    if (sm.charId && !p.clears.includes(String(sm.charId))) p.clears.push(String(sm.charId));
    if (sm.realm && !p.realms.includes(sm.realm)) p.realms.push(sm.realm);
    if (sm.diff && !p.diffs.includes(sm.diff)) p.diffs.push(sm.diff);
  }
  saveProgress(p);
  return p;
}

// 这一局刚好把谁放出来了？结算面板用它弹「新唤醒体解锁」。
function unlockedByRun(before, after) {
  const out = [];
  for (const id of Object.keys(UNLOCKS)) {
    if (!UNLOCKS[id].cond(before) && UNLOCKS[id].cond(after)) out.push(id);
  }
  return out;
}
return { svProgress, saveProgress, isUnlocked, unlockNeed, unlockProg, recordRun, unlockedByRun };
})();

// ---- js/sv/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 生成，请勿手改。
// 源：assets/survivors/atlas.webp + data/survivors-atlas.json + data/survivors-data.json
const ATLAS = "data:image/webp;base64,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I8QSIZYIsUSIJUIsEWKJEEuEWM7//Oc///nPf/7zn//85z//+c9//vOf//znP//5z3/+8//8z//NjhZaaKGFFlpooXX+D3CEWCLEEiGWCLFEiCVCLBFiiRDL+Z///Oc///nPf/7zn//85z//+c9//vOf//znP//5z3/+85//mx0ttNBCCy200ELr/B/gCLFEiCVCLBFiiRBLhFgixBIhlvM///nPf/7zn//85z//+c9//vOf//znP//5z3/+85//5//zP/83O1pooYUWWmihhdb5P8ARYokQS4RYIsQSIZYIsUSIJUIs53/+85///Oc///nPf/7zn//85z//+c9//vOf//znP//P/+d//m92tNBCCy200EILrfN/gCPEEiGWCLFEiCVCLBFiiRBLhFjO//znP//5z3/+85///Oc///nPf/7zn//85z//+c9//vP//M//zY4WWmihhRZaaKF1/g9whFgixBIhlgixRIglQiwRYokQy/mf//znP//5z3/+85///Oc///nPf/7zn//85z//+c9//vOf///f7NFCCy200EILLb5hnf8DHCGWCLFEiCVCLBFiiRBLhNgkKdJ15utOCGPzdPe4hKfOfsJiLfI9zOc//v4YHgD3+EetLPX2Cy6J1NUF0f59SQ9ew6hCXeJQsDxrO/8VQLR6VI32jTcnHn0sQEgPA5k757wWPFqg7u687nuAxdqI9vQhoJBx6DvPx90CjXTt/PyjjzyG4S6pmml6Gjzko4zp559eJJqot1epuvNvn32UMc4v4nCvDE5+zkSi0cgYqziCte+8f/eG9sWLJ051Enq+8Z3TssM8ytj73OVEicagEYDHkO7a9uCcxRMT3Js4vCsonHis4aLRMlWDaFTXHsShXmfxyfOIRhOqiruBgyPgHuIhHjkHH4ojmtgR4IzYmzi8KyYfOZcoWtDFfwFTzD8wiRL/pU3HsoW4aEFH/xWE5G3TcPHf27OXs8z4r21i6SSc/+aeXYLsv7eEzhSEw9tEKwNxeFtIEIXD24pHfnVOLP33lnz5x/eKBf5rWz7hZcfK+C8u5p/X7vxX92FLMvtvrhjOcfy/uETXfEn/xQXDA4j/4nYb+gPR/4sL8feNIf43V9Sqm/Ac8TpFB/23ilt6A+b5UVd3EgHxv1SAW/uNvHR2+ZgiQax84PFKhf9WjTz2FHkZ+cdbcK8t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";
const META = {"cell":120,"cols":8,"w":960,"h":2400,"frames":{"c:15601":0,"c:15600":1,"c:15591":2,"c:15588":3,"c:15573":4,"c:15594":5,"c:15572":6,"c:77923":7,"c:15566":8,"c:77925":9,"c:77922":10,"c:15590":11,"c:15570":12,"c:95786":13,"c:15603":14,"c:15577":15,"c:15575":16,"c:15602":17,"c:15567":18,"c:15568":19,"c:15564":20,"c:54117":21,"c:15587":22,"c:15583":23,"c:15593":24,"c:15571":25,"c:77913":26,"c:15597":27,"c:15581":28,"c:15562":29,"c:15569":30,"c:15582":31,"c:94450":32,"c:15576":33,"c:15589":34,"c:15565":35,"c:15580":36,"c:15585":37,"c:15560":38,"c:77926":39,"c:77917":40,"c:15595":41,"c:15604":42,"c:15599":43,"c:15592":44,"c:15584":45,"c:54116":46,"c:15596":47,"c:15574":48,"c:15563":49,"c:15598":50,"c:15586":51,"c:15579":52,"c:125346":53,"c:130901":54,"c:77918":55,"c:130226":56,"c:141302":57,"c:145363":58,"c:77921":59,"c:148578":60,"c:151844":61,"c:90001":62,"c:90002":63,"c:90003":64,"c:90004":65,"m:13950":66,"m:13951":67,"m:13962":68,"m:13965":69,"m:13969":70,"m:13970":71,"m:13974":72,"m:13954":73,"m:13955":74,"m:13960":75,"m:13963":76,"m:13967":77,"m:13956":78,"m:13958":79,"m:13961":80,"m:13964":81,"m:13966":82,"m:13971":83,"k:83510":84,"k:78667":85,"k:70797":86,"k:70751":87,"k:70738":88,"k:70700":89,"k:70761":90,"k:70759":91,"k:57737":92,"k:57736":93,"k:98380":94,"k:98389":95,"k:57735":96,"k:70730":97,"k:98408":98,"k:98396":99,"k:98381":100,"k:70706":101,"k:98367":102,"k:70739":103,"k:70701":104,"k:98394":105,"k:98416":106,"k:70765":107,"k:98384":108,"k:98393":109,"k:70770":110,"k:98409":111,"k:98390":112,"k:70779":113,"k:70734":114,"k:70760":115,"k:98371":116,"k:70789":117,"k:70766":118,"k:70788":119,"k:70776":120,"k:70712":121,"k:98424":122,"k:70703":123,"k:98386":124,"k:70780":125,"w:130053":126,"w:9827":127,"w:94448":128,"w:9881":129,"w:48828":130,"w:125195":131,"w:78774":132,"w:9516":133,"w:54113":134,"w:77859":135,"w:9817":136,"w:77893":137,"w:9947":138,"w:9667":139,"w:9786":140,"w:77889":141,"w:9856":142,"w:9644":143,"v:18344":144,"v:18346":145,"v:18353":146,"v:18341":147,"v:18358":148,"v:18360":149,"v:18352":150,"v:18338":151,"v:18339":152}};
const CHARS = [{"id":"15601","pid":"awakener-0001","n":"24","en":"Mason","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":0,"talent":"调停人格","talentText":"「24」获得 25–50 点狂气","weapons":[{"n":"共生畸变","e":"Symbiotic Aberration","proto":"nova","text":"对全体敌人造成 35–70%（攻击力） 点伤害"},{"n":"狂乱斩击","e":"Frenzied Slash","proto":"orbit","text":"随机造成 18.75–37.5%（攻击力） 点伤害 3 次。 抑郁人格"}]},{"id":"15600","pid":"awakener-0002","n":"阿格里帕","en":"Agrippa","realm":"血肉","realmCode":"CARO","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":1,"talent":"迷途之路","talentText":"阿格里帕获得 25–50 点狂气","weapons":[{"n":"不耐的施舍","e":"Reluctant Alms","proto":"shield","text":"获得 12.5–25%（防御力） 点护盾"},{"n":"无色螺旋","e":"Colorless Spiral","proto":"vortex","text":"造成 15–30%（攻击力） 点伤害，并施加等量中毒"}]},{"id":"15591","pid":"awakener-0003","n":"艾继丝","en":"Aigis","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":2,"talent":"凝滞诅咒","talentText":"艾继丝获得 25–50 点狂气","weapons":[{"n":"小小愿望","e":"A Small Wish","proto":"bolt","text":"造成 20–40%（攻击力） 点伤害，并施加 1 回合易伤"},{"n":"石质分解","e":"Decomposition","proto":"nova","text":"造成 80–160%（攻击力） 点伤害，享受 2 倍力量加成"}]},{"id":"15588","pid":"awakener-0004","n":"艾尔瓦","en":"Alva","realm":"混沌","realmCode":"CHAOS","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":3,"talent":"杰出老兵","talentText":"艾尔瓦获得 25–50 点狂气","weapons":[{"n":"临战体势","e":"Combat Stance","proto":"shield","text":"获得 10–20%（防御力） 点护盾"},{"n":"心眼利刃","e":"Precision Slash","proto":"saw","text":"造成 60–120%（攻击力） 点伤害"}]},{"id":"15573","pid":"awakener-0005","n":"奥瑞塔","en":"Aurita","realm":"深海","realmCode":"AEQUOR","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":4,"talent":"自我增殖","talentText":"奥瑞塔获得 25–50 点狂气","weapons":[{"n":"腺体分裂","e":"Gland Division","proto":"summon","text":"造成 12–24%（攻击力） 点伤害"},{"n":"友情的力量","e":"Power of Friendship","proto":"heal","text":"触腕伤害 +7.5–15%（攻击力）"}]},{"id":"15594","pid":"awakener-0006","n":"凯刻斯","en":"Caecus","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":5,"talent":"蜕变之躯","talentText":"凯刻斯获得 25–50 点狂气","weapons":[{"n":"护身鳞甲","e":"Protective Scales","proto":"shield","text":"获得 25–50%（防御力） 点护盾"},{"n":"破碎长戟","e":"Shattered Halberd","proto":"chain","text":"造成 10–20%（攻击力） 点伤害，并获得等量反击，享受 50% 的触腕伤害加成"}]},{"id":"15572","pid":"awakener-0007","n":"卡茜亚","en":"Casiah","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":6,"talent":"开幕","talentText":"卡茜亚获得 25–50 点狂气","weapons":[{"n":"念动力","e":"Telekinesis","proto":"missile","text":"视为「打击」"},{"n":"噗！","e":"Poof!","proto":"bolt","text":"获得 10–15 点狂气"}]},{"id":"77923","pid":"awakener-0008","n":"卡斯托尔","en":"Castor","realm":"超维","realmCode":"ULTRA","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":7,"talent":"凌空之誓","talentText":"卡斯托尔获得 25–50 点狂气","weapons":[{"n":"暗影飞行","e":"Umbral Flight","proto":"boomerang","text":"造成 35–70%（攻击力） 点伤害 3 次，使其他队友的临时暴击伤害提高 25–35%"},{"n":"冥河之翼","e":"Stygian Wings","proto":"orbit","text":"获得 25–50%（防御力） 点护盾，对全体敌人施加 1 回合虚弱"}]},{"id":"15566","pid":"awakener-0009","n":"希莱斯特","en":"Celeste","realm":"深海","realmCode":"AEQUOR","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":8,"talent":"祝福之力","talentText":"希莱斯特获得 25–50 点狂气","weapons":[{"n":"无色之梦","e":"Tintless Dream","proto":"field","text":"回复 10–20%（体质） 点生命"},{"n":"永恒幻影","e":"Everlasting Phantasm","proto":"summon","text":"回复 32–64%（体质） 点生命"}]},{"id":"77925","pid":"awakener-0010","n":"克莱门汀","en":"Clementine","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":9,"talent":"妖虫的呼唤","talentText":"克莱门汀获得 25–50 点狂气","weapons":[{"n":"痛苦榨取","e":"Pain Extraction","proto":"beam","text":"造成 20–40%（攻击力） 点伤害 3 次"},{"n":"精神抚慰","e":"Soulsalve","proto":"heal","text":"回复 22.5–45%（体质） 点生命，临时移除全体敌人的疯狂，并临时使其力量降低降低 …"}]},{"id":"77922","pid":"awakener-0011","n":"克珀珊特","en":"Corposant","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":10,"talent":"沉于深渊","talentText":"克珀珊特获得 25–50 点狂气","weapons":[{"n":"惩戒雷霆","e":"Lightning Retribution","proto":"rain","text":"随机造成 35–70%（攻击力） 点伤害 5 次，享受 75–100% 触腕伤害加成，每…"},{"n":"不祥信号","e":"Ominous Semaphore","proto":"totem","text":"获得 20–30 点狂气"}]},{"id":"15590","pid":"awakener-0012","n":"达芙黛尔","en":"Daffodil","realm":"超维","realmCode":"ULTRA","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":11,"talent":"维度投影","talentText":"达芙黛尔获得 25–50 点狂气","weapons":[{"n":"裂颅者","e":"Skull Reaver","proto":"strike","text":"对生命最低的敌人造成 50–100%（攻击力） 点伤害，享受 5 倍力量加成"},{"n":"异质潮汐","e":"Heterogeneous Tides","proto":"vortex","text":"获得 2–4%（攻击力） 点力量并对全体敌人施加易伤"}]},{"id":"15570","pid":"awakener-0013","n":"朵尔","en":"Doll","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SR","img":12,"talent":"血肉剥离","talentText":"朵尔获得 25–50 点狂气","weapons":[{"n":"体外手术","e":"Outer Surgery","proto":"beam","text":"回复 15–30%（体质） 点生命"},{"n":"等价交换","e":"Equivalent Exchange","proto":"heal","text":"回复 25–50%（体质） 点生命"}]},{"id":"95786","pid":"awakener-0014","n":"杜勒赛因","en":"Doresain","realm":"血肉","realmCode":"CARO","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":13,"talent":"猩红邀约","talentText":"杜勒赛因获得 25–50 点狂气","weapons":[{"n":"陨落者的挽歌","e":"Dirge of the Fallen","proto":"meteor","text":"对生命最低的敌人造成 80–160%（攻击力） 点伤害"},{"n":"冥府之路","e":"Netherward Path","proto":"summon","text":"失去 10% 当前生命，对全体敌人造成 50–100%（攻击力） 点伤害并施加 1 回合…"}]},{"id":"15603","pid":"awakener-0015","n":"艾瑞卡","en":"Erica","realm":"超维","realmCode":"ULTRA","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":14,"talent":"参数拟合","talentText":"艾瑞卡获得 25–50 点狂气","weapons":[{"n":"释放：机甲","e":"Unleash: Mecha","proto":"summon","text":"获得 15–30%（攻击力） 点临时力量"},{"n":"函数过载","e":"Function Overload","proto":"beam","text":"若消耗的算力为偶数，则造成 22.5–45%（攻击力） 点伤害 X+2 次；否则获得 7…"}]},{"id":"15577","pid":"awakener-0016","n":"菲茵特","en":"Faint","realm":"血肉","realmCode":"CARO","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":15,"talent":"无尽星光","talentText":"菲茵特获得 25–50 点狂气","weapons":[{"n":"养分吸收","e":"Nutrient Absorption","proto":"heal","text":"获得 12–24%（攻击力） 点力量"},{"n":"萌芽","e":"Sprouting Bud","proto":"field","text":"获得 15–30%（防御力） 点护盾，并回复 15–30%（体质） 点生命"}]},{"id":"15575","pid":"awakener-0017","n":"法洛思","en":"Faros","realm":"深海","realmCode":"AEQUOR","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":16,"talent":"深渊执念","talentText":"法洛思获得 25–50 点狂气","weapons":[{"n":"欢欣之海","e":"Ocean of Elation","proto":"vortex","text":"造成 16–32%（攻击力） 点伤害及等量中毒，享受 50% 触腕伤害加成"},{"n":"深海暗流","e":"Deep Currents","proto":"chain","text":"本回合内，造成触腕伤害后，对全体敌人施加 【中毒】Arg1 层中毒"}]},{"id":"15602","pid":"awakener-0018","n":"熔毁·朵尔","en":"Doll: Inferno","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"Genesis","img":17,"talent":"灵魂瘟疫","talentText":"熔毁·朵尔获得 25–50 点狂气","weapons":[{"n":"自毁","e":"Self-Destruct","proto":"mine","text":"选择「欢欣」或「诅咒」。 「自毁·终章」"},{"n":"命运坠落","e":"Fate's Descent","proto":"meteor","text":"获得 35–50 点狂气"}]},{"id":"15567","pid":"awakener-0019","n":"血链·希洛","en":"Helot: Catena","realm":"血肉","realmCode":"CARO","role":"伤害型","roleCode":"ASSAULT","rarity":"Genesis","img":18,"talent":"索魂者宣言","talentText":"血链·希洛获得 25–50 点狂气","weapons":[{"n":"恨意宣泄","e":"Hatred Unleashed","proto":"nova","text":"对全体敌人造成 40–80%（攻击力） 点伤害，并施加等量出血"},{"n":"鲜血链条","e":"Crimson Shackles","proto":"chain","text":"失去 10% 当前生命，随机造成 2 次 20–40%（攻击力） 点伤害，并施加相当于所…"}]},{"id":"15568","pid":"awakener-0020","n":"环行·拉蒙娜","en":"Ramona: Timeworn","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"Genesis","img":19,"talent":"熵增逆转","talentText":"环行·拉蒙娜获得 25–50 点狂气","weapons":[{"n":"命定之剑","e":"Predetermined Strike","proto":"saw","text":"造成 50–100%（攻击力） 点伤害，力量对「命定之剑」的效果提高 3 倍"},{"n":"无拘之视","e":"Sight Unbound","proto":"missile","text":"获得 3–6%（攻击力） 点力量"}]},{"id":"15564","pid":"awakener-0021","n":"戈利亚","en":"Goliath","realm":"深海","realmCode":"AEQUOR","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":20,"talent":"先发复仇","talentText":"戈利亚获得 25–50 点狂气","weapons":[{"n":"断首之伤","e":"Decapitation Damage","proto":"saw","text":"造成 60–120%（攻击力） 点伤害"},{"n":"最强者的法则","e":"Law of the Strongest","proto":"nova","text":"获得 2–4%（攻击力） 点力量"}]},{"id":"54117","pid":"awakener-0022","n":"哈姆林","en":"Hameln","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":21,"talent":"可嘉杰作","talentText":"哈姆林获得 25–50 点狂气","weapons":[{"n":"灵魂序曲","e":"Soul Overture","proto":"chain","text":"随机造成 3 段 20–40%（攻击力） 点穿透伤害"},{"n":"记忆轮舞曲","e":"Memory Rondo","proto":"orbit","text":"获得 2–4%（攻击力） 点力量"}]},{"id":"15587","pid":"awakener-0023","n":"希洛","en":"Helot","realm":"血肉","realmCode":"CARO","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":22,"talent":"向汝复仇","talentText":"希洛获得 25–50 点狂气","weapons":[{"n":"粉碎一击","e":"Shattering Strike","proto":"strike","text":"视为「打击」"},{"n":"绵长憎恶","e":"Lasting Loathe","proto":"field","text":"失去 10% 当前生命"}]},{"id":"15583","pid":"awakener-0024","n":"奥尔拉","en":"Horla","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":23,"talent":"序曲诗节","talentText":"奥尔拉获得 25–50 点狂气","weapons":[{"n":"颂歌圣咏","e":"Carol Psalm","proto":"heal","text":"选择 1 名其他唤醒体获得 10–15 点狂气"},{"n":"挽歌圣咏","e":"Dirge Psalm","proto":"rain","text":"获得 10–20%（攻击力） 点力量"}]},{"id":"15593","pid":"awakener-0025","n":"詹金","en":"Jenkin","realm":"超维","realmCode":"ULTRA","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":24,"talent":"空间折叠","talentText":"詹金获得 25–50 点狂气","weapons":[{"n":"群鼠集结","e":"Mice Assemble","proto":"summon","text":"将 1 张造成 30–60%（攻击力） 点伤害 X+4 次的「群鼠冲击」洗入抽牌堆顶"},{"n":"布朗出动！","e":"Get 'em! Brown!","proto":"summon","text":"对全体敌人造成 15–30%（攻击力） 点伤害"}]},{"id":"15571","pid":"awakener-0026","n":"珈伦","en":"Karen","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":25,"talent":"盈凸月之舞","talentText":"珈伦获得 25–50 点狂气","weapons":[{"n":"蟾蜍浓汤","e":"Toad Stew","proto":"field","text":"对全体敌人施加 【中毒】Arg1 层中毒与 1 回合虚弱，并回复 10–20%（体质） …"},{"n":"静默守望","e":"Silent Fealty","proto":"totem","text":"回复 5–10%（体质） 点生命并获得 5–10%（防御力） 点护盾"}]},{"id":"77913","pid":"awakener-0027","n":"凯蒂古拉","en":"Kathigu-Ra","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":26,"talent":"业火重燃","talentText":"凯蒂古拉获得 25–50 点狂气","weapons":[{"n":"末路枪声","e":"Last Stand Salvo","proto":"bolt","text":"造成 25–50%（攻击力） 点伤害两次，获得 3–6%（攻击力） 点力量"},{"n":"千兆耀斑","e":"Solarflare","proto":"rain","text":"对全体敌人造成 50–100%（攻击力） 点伤害，享受 300% 力量加成"}]},{"id":"15597","pid":"awakener-0028","n":"雷娅","en":"Leigh","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":27,"talent":"噬血者","talentText":"雷娅获得 25–50 点狂气","weapons":[{"n":"欲求不满之痛","e":"Pain of Unfulfilled Desires","proto":"heal","text":"失去 10% 当前生命"},{"n":"苦痛与欢愉","e":"Pain and Pleasure","proto":"chain","text":"随机造成 30–60%（攻击力） 点伤害 3 次"}]},{"id":"15581","pid":"awakener-0029","n":"莉莉","en":"Lily","realm":"混沌","realmCode":"CHAOS","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":28,"talent":"黏液汇聚","talentText":"莉莉获得 25–50 点狂气","weapons":[{"n":"报偿打击","e":"Strike to Protect","proto":"shield","text":"造成 75–150%（攻击力） 点伤害，触发目标 50% 的中毒"},{"n":"禁忌沼泽","e":"Forbidden Swamp","proto":"field","text":"获得 12–24%（防御力） 点护盾，并对全体敌人施加 【中毒】Arg2 层中毒"}]},{"id":"15562","pid":"awakener-0030","n":"莉兹","en":"Liz","realm":"超维","realmCode":"ULTRA","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":29,"talent":"翡翠倒影","talentText":"莉兹获得 25–50 点狂气","weapons":[{"n":"扑蛾之火","e":"Moth-Trapping Fire","proto":"missile","text":"获得 20–40%（防御力） 点护盾，将 1 张带消耗的「绿色火焰」加入手牌"},{"n":"绿色火焰","e":"Green Flames","proto":"meteor","text":"造成 15–30%（攻击力） 点穿透伤害，并将 50% 的伤害转为中毒"}]},{"id":"15569","pid":"awakener-0031","n":"萝坦","en":"Lotan","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SR","img":30,"talent":"战欲难平","talentText":"萝坦获得 25–50 点狂气","weapons":[{"n":"桀骜之刃","e":"Blade of Defiance","proto":"saw","text":"对随机敌人造成 7.5–15%（攻击力） 点伤害，重复 3 次"},{"n":"傲慢之潮","e":"Tides of Hubris","proto":"vortex","text":"对全体敌人造成 7.5–15%（攻击力） 点伤害，获得 2.5–5%（攻击力） 点力量"}]},{"id":"15582","pid":"awakener-0032","n":"弥利亚姆","en":"Miryam","realm":"深海","realmCode":"AEQUOR","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":31,"talent":"信仰之证","talentText":"弥利亚姆获得 25–50 点狂气","weapons":[{"n":"升华火刑","e":"Exalted Pyre","proto":"nova","text":"造成 60–120%（攻击力） 点穿透伤害并施加等量中毒"},{"n":"被选中之人","e":"The Chosen One","proto":"heal","text":"选择 1 名其他唤醒体获得 35–50 点狂气"}]},{"id":"94450","pid":"awakener-0033","n":"茉夏","en":"Mouchette","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":32,"talent":"雾界遗痕","talentText":"茉夏获得 25–50 点狂气","weapons":[{"n":"致命冲击","e":"Mortal Blast","proto":"missile","text":"视为「打击」"},{"n":"闪耀☆粉碎","e":"Shining☆Crush","proto":"nova","text":"视为「打击」"}]},{"id":"15576","pid":"awakener-0034","n":"墨菲","en":"Murphy","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":33,"talent":"造物成形","talentText":"墨菲获得 25–50 点狂气","weapons":[{"n":"逆转漩涡","e":"Vortex Reversed","proto":"vortex","text":"对全体敌人造成 25–50%（攻击力） 点伤害，享受 35–50% 的触腕伤害加成"},{"n":"圣女诞生","e":"Divine Maiden's Birth","proto":"heal","text":"共获得（最大生命 5% + 10–20%（防御力））点护盾与 1 点算力"}]},{"id":"15589","pid":"awakener-0035","n":"诞妄·墨菲","en":"Murphy: Fauxborn","realm":"深海","realmCode":"AEQUOR","role":"辅助型","roleCode":"CHORUS","rarity":"Genesis","img":34,"talent":"潮汐圣礼","talentText":"诞妄·墨菲获得 25–50 点狂气","weapons":[{"n":"利莫里亚华尔兹","e":"Waltz of Lemuria","proto":"orbit","text":"获得相当于银钥充能 200–300% 的银钥"},{"n":"深渊圣歌","e":"Abyss Hymns","proto":"totem","text":"获得 2 点算力并抽 2 张牌"}]},{"id":"15565","pid":"awakener-0036","n":"诺缔拉","en":"Nautila","realm":"混沌","realmCode":"CHAOS","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":35,"talent":"维护专家","talentText":"诺缔拉获得 25–50 点狂气","weapons":[{"n":"禁止入内","e":"No Trespassing","proto":"shield","text":"获得 20–40%（防御力） 点护盾与 120–240%（攻击力） 层临时反击"},{"n":"短期记忆","e":"Short-Term Memory","proto":"field","text":"获得 10–20%（防御力） 点护盾"}]},{"id":"15580","pid":"awakener-0037","n":"宁菲亚","en":"Nymphaea","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":36,"talent":"沉溺悲伤","talentText":"宁菲亚获得 25–50 点狂气","weapons":[{"n":"午夜之潮","e":"Midnight Tide","proto":"chain","text":"对生命最高的敌人造成 22.5–45%（攻击力） 点伤害并施加等量中毒，享受 2 倍力量…"},{"n":"死亡丧钟","e":"Knell of Death","proto":"strike","text":"对全体敌人施加 【中毒】Arg1 层中毒，持续 1 回合，并施加虚弱与易伤"}]},{"id":"15585","pid":"awakener-0038","n":"奥吉尔","en":"Ogier","realm":"混沌","realmCode":"CHAOS","role":"防御型","roleCode":"WARDEN","rarity":"SR","img":37,"talent":"骑士之热忱","talentText":"奥吉尔获得 25–50 点狂气","weapons":[{"n":"不稳屏障","e":"Unstable Barrier","proto":"shield","text":"获得 7–14%（防御力） 点护盾 X+1 次"},{"n":"「穿刺」之枪","e":"Piercing Strike","proto":"saw","text":"造成 25–50%（攻击力） 点穿透伤害，施加 1 回合易伤，享受 200% 的力量加成"}]},{"id":"15560","pid":"awakener-0039","n":"潘狄娅","en":"Pandia","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":38,"talent":"予取予求","talentText":"潘狄娅获得 25–50 点狂气","weapons":[{"n":"疯狂之鞭","e":"Whip of Madness","proto":"saw","text":"造成 20–40%（攻击力） 点伤害 3 次，并获得相当于所造成伤害 50% 的临时反击"},{"n":"蜡烛般炽热的渴望","e":"Wax-Hot Desire","proto":"field","text":"获得 10–20%（攻击力） 层反击"}]},{"id":"77926","pid":"awakener-0040","n":"皮克曼","en":"Pickman","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":39,"talent":"停尸间工作室","talentText":"皮克曼获得 25–50 点狂气","weapons":[{"n":"噬色者","e":"Chromaphage","proto":"chain","text":"对全体敌人造成 3 次 30–60%（攻击力） 点必定暴击的伤害，每次从目标处「窃取」 …"},{"n":"栩栩如生的描绘","e":"Lifelike Rendition","proto":"summon","text":"胚胎融合 +20–30"}]},{"id":"77917","pid":"awakener-0041","n":"波吕克斯","en":"Pollux","realm":"超维","realmCode":"ULTRA","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":40,"talent":"洗礼之路","talentText":"波吕克斯获得 25–50 点狂气","weapons":[{"n":"灼魂之光","e":"Soulsearing Light","proto":"meteor","text":"对全体敌人造成 40–80%（攻击力） 点伤害，并抽取 2 张算力消耗最低的指令卡"},{"n":"净化裁决","e":"Cleansing Judgement","proto":"rain","text":"造成 70–140%（攻击力） 点伤害 2 次"}]},{"id":"15595","pid":"awakener-0042","n":"拉蒙娜","en":"Ramona","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SR","img":41,"talent":"第一教义","talentText":"拉蒙娜获得 25–50 点狂气","weapons":[{"n":"女王之剑","e":"Queen's Sword","proto":"orbit","text":"造成 15–30%（攻击力） 点伤害 2 次"},{"n":"突击论题","e":"Assault Thesis","proto":"boomerang","text":"临时使全体敌人的力量降低降低 7.5–15%（防御力）"}]},{"id":"15604","pid":"awakener-0043","n":"莱克","en":"Ryker","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":42,"talent":"非凡好运","talentText":"莱克获得 25–50 点狂气","weapons":[{"n":"意外之财","e":"Unexpected Gain","proto":"bolt","text":"造成 20–40%（攻击力） 点伤害"},{"n":"摊牌","e":"Showdown","proto":"mine","text":"造成 20–40%（攻击力） 点伤害 1~6 次，获得 10–15 点狂气"}]},{"id":"15599","pid":"awakener-0044","n":"萨尔瓦多","en":"Salvador","realm":"血肉","realmCode":"CARO","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":43,"talent":"祝福","talentText":"萨尔瓦多获得 25–50 点狂气","weapons":[{"n":"受祝福的白骨","e":"Blessed are the Bones","proto":"totem","text":"对全体敌人施加 1 回合虚弱"},{"n":"应消之苦","e":"End of Suffering","proto":"nova","text":"选择"}]},{"id":"15592","pid":"awakener-0045","n":"珊","en":"Sanga","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":44,"talent":"忘却之境","talentText":"珊获得 25–50 点狂气","weapons":[{"n":"美丽的慈悲","e":"Beauty's Mercy","proto":"heal","text":"获得 24–48%（防御力） 点护盾"},{"n":"孤绝乐章","e":"Opus of Isolation","proto":"field","text":"下回合开始时，驱散自身脆弱状态并获得 30–60%（防御力） 点护盾"}]},{"id":"15584","pid":"awakener-0046","n":"索蕾尔","en":"Sorel","realm":"血肉","realmCode":"CARO","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":45,"talent":"女主人的特权","talentText":"索蕾尔获得 25–50 点狂气","weapons":[{"n":"玫瑰的优雅","e":"Elegance of Rose","proto":"orbit","text":"随机造成 16–32%（攻击力） 点伤害 4 次"},{"n":"璞玉","e":"Diamond in the Rough","proto":"beam","text":"失去 10% 当前生命"}]},{"id":"54116","pid":"awakener-0047","n":"塔薇","en":"Tawil","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":46,"talent":"银钥之门","talentText":"塔薇获得 25–50 点狂气","weapons":[{"n":"全知真理","e":"Omniscient Verity","proto":"beam","text":"在手牌中时，若抽牌堆顶的牌是指令卡，则变为其复制"},{"n":"时之羽翼","e":"Pinions of Time","proto":"boomerang","text":"获得 3–6%（攻击力） 点力量"}]},{"id":"15596","pid":"awakener-0048","n":"泰旖丝","en":"Thais","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":47,"talent":"呼唤母亲","talentText":"泰旖丝获得 25–50 点狂气","weapons":[{"n":"远古爱抚","e":"Ancient Caress","proto":"heal","text":"选择 1 名其他唤醒体，使该唤醒体与「被选中之人」均获得 15–20 点狂气"},{"n":"圣血本能","e":"Sacred Blood's Instinct","proto":"field","text":"胚胎融合 +30–40，获得相当于泰旖丝银钥充能 2 倍的银钥"}]},{"id":"15574","pid":"awakener-0049","n":"汀克特","en":"Tinct","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":48,"talent":"彼岸之声","talentText":"汀克特获得 25–50 点狂气","weapons":[{"n":"安魂曲","e":"Requiem","proto":"field","text":"驱散自身脆弱、虚弱与易伤状态"},{"n":"远方旋律","e":"Distant Melody","proto":"missile","text":"获得 50–100%（防御力） 点护盾，下回合暴击率 +15%"}]},{"id":"15563","pid":"awakener-0050","n":"图鲁","en":"Tulu","realm":"深海","realmCode":"AEQUOR","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":49,"talent":"不朽威仪","talentText":"图鲁获得 25–50 点狂气","weapons":[{"n":"深渊秩序","e":"Abyss Order","proto":"chain","text":"对全体敌人造成 60–120%（攻击力） 点穿透伤害，额外享受 0% 的触腕伤害与力量加成"},{"n":"当利莫里亚回归","e":"When Lemuria Returns","proto":"nova","text":"驱散自身虚弱状态"}]},{"id":"15598","pid":"awakener-0051","n":"尤乌哈希","en":"Uvhash","realm":"血肉","realmCode":"CARO","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":50,"talent":"朱红仪式","talentText":"尤乌哈希获得 25–50 点狂气","weapons":[{"n":"沸腾吧，鲜血！","e":"Boil, Blood!","proto":"field","text":"造成 12–24%（攻击力） 点伤害三次"},{"n":"尖啸吧，鲜血！","e":"Screech, Blood!","proto":"nova","text":"失去 10% 当前生命"}]},{"id":"15586","pid":"awakener-0052","n":"旺达","en":"Wanda","realm":"超维","realmCode":"ULTRA","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":51,"talent":"活死人的谵妄","talentText":"旺达获得 25–50 点狂气","weapons":[{"n":"迷途之守","e":"Keeper of the Lost","proto":"totem","text":"获得 30–60%（攻击力） 层反击"},{"n":"脊刺锁链","e":"Spine Needle Chains","proto":"chain","text":"随机造成 35–70%（攻击力） 点伤害 5 次；此伤害享受 15–20% 的反击加成"}]},{"id":"15579","pid":"awakener-0053","n":"温柯尔","en":"Winkle","realm":"超维","realmCode":"ULTRA","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":52,"talent":"自我囚禁","talentText":"温柯尔获得 25–50 点狂气","weapons":[{"n":"能量光束","e":"Energy Beam","proto":"beam","text":"移除所有敌人的屏障，造成 40–80%（攻击力） 点伤害并施加 1 回合虚弱"},{"n":"精神重建","e":"Psyche Reforged","proto":"heal","text":"获得 20–40%（防御力） 点护盾，弃置全部手牌，每弃置一张，所获护盾 +50%"}]},{"id":"125346","pid":"awakener-0054","n":"徐","en":"Xu","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":53,"talent":"无梦之地的女士","talentText":"徐获得 25–50 点狂气","weapons":[{"n":"思骨之苦","e":"Bonesick Longing","proto":"chain","text":"对全体敌人造成 150–300%（攻击力） 点必定暴击的伤害并触发 80% 的中毒"},{"n":"扇封之吻","e":"Fan-Sealed Kiss","proto":"heal","text":"对全体敌人施加 【中毒】Arg1 层中毒，并临时使其力量降低降低 15–30%（防御力）"}]},{"id":"130901","pid":"awakener-0055","n":"莫丝","en":"Vortice","realm":"深海","realmCode":"AEQUOR","role":"伤害型","roleCode":"ASSAULT","rarity":"SSR","img":54,"talent":"漩涡来了！","talentText":"莫丝获得 25–50% 基础狂气","weapons":[{"n":"蓄力","e":"Charge!","proto":"bolt","text":"获得 50–75 点狂气，莫丝的下一次狂气爆发暴击率 +25–35%"},{"n":"装填！","e":"Reload!","proto":"missile","text":"获得 1 层「涡流装填」，「可使用3次」"}]},{"id":"77918","pid":"awakener-0056","n":"阿拉克涅","en":"Arachne","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":55,"talent":"偶人舞台揭幕","talentText":"阿拉克涅获得相当于其基础狂气 25–50% 的狂气","weapons":[{"n":"永恒编织","e":"Eternal Weave","proto":"field","text":"对全体敌人施加 300–600%（攻击力） 层「终局裁决」，然后创造 1 张「引导之线」"},{"n":"缚命之网","e":"Fate-Binding Web","proto":"field","text":"获得 35–70%（防御力） 点护盾"}]},{"id":"130226","pid":"awakener-0057","n":"沙耶","en":"Saya","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":56,"talent":"认知篡改","talentText":"沙耶获得相当于其基础狂气 25–50% 的狂气","weapons":[{"n":"脏腑之花","e":"Viscera Blossoms","proto":"summon","text":"失去 10% 当前生命，对全体敌人施加 5500–11000%（攻击力） 层侵蚀"},{"n":"仿生","e":"Biomimicry","proto":"shield","text":"胚胎融合 +30–40"}]},{"id":"141302","pid":"awakener-0058","n":"庞托斯","en":"Pontos","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":57,"talent":"深渊之怒","talentText":"庞托斯获得 25–50% 基础狂气","weapons":[{"n":"憔悴肆虐","e":"Gaunt Ravage","proto":"field","text":"对全体敌人造成 30–60%（攻击力） 点必定暴击的伤害"},{"n":"憔悴者的召唤","e":"Gauntwards' Call","proto":"summon","text":"若本场战斗首次释放，将 3 张不同的「憔悴者」生成到手牌并获得 30–60%（防御力） …"}]},{"id":"145363","pid":"awakener-0059","n":"蚀灭·萝坦","en":"Lotan: Cetarchon","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"Genesis","img":58,"talent":"原初回归","talentText":"蚀灭·萝坦获得 25–50% 基础狂气","weapons":[{"n":"长刃：殒灭","e":"Long Blade: Perish","proto":"beam","text":"视为「打击」"},{"n":"短刃：吞噬","e":"Short Blade: Devour","proto":"saw","text":"视为「打击」"}]},{"id":"77921","pid":"awakener-0060","n":"卡拉布","en":"Caraboo","realm":"血肉","realmCode":"CARO","role":"防御型","roleCode":"WARDEN","rarity":"SSR","img":59,"talent":"诱人的蜜果","talentText":"卡拉布获得 25–50% 基础狂气","weapons":[{"n":"奇迹祝福","e":"Miracle Blessing","proto":"heal","text":"获得 35–70%（防御力） 点护盾"},{"n":"雪夜魔咒","e":"Snowy Hex","proto":"field","text":"对生命最高的敌人造成 5000–10000%（攻击力） 点固定伤害"}]},{"id":"148578","pid":"awakener-0061","n":"负誓·奥吉尔","en":"Ogier: Oathbound","realm":"混沌","realmCode":"CHAOS","role":"防御型","roleCode":"WARDEN","rarity":"Genesis","img":60,"talent":"血肉为垒","talentText":"负誓·奥吉尔获得 25–50% 基础狂气","weapons":[{"n":"罪染之枪","e":"Sin-Stained Spear","proto":"beam","text":"造成 100–200%（攻击力） 点伤害，享受 300% 的力量加成"},{"n":"无尽之影","e":"Endless Shadow","proto":"summon","text":"临时使全体敌人的力量降低降低 4–8%（防御力）"}]},{"id":"151844","pid":"awakener-0062","n":"薇薇安","en":"Vivian","realm":"混沌","realmCode":"CHAOS","role":"辅助型","roleCode":"CHORUS","rarity":"SSR","img":61,"talent":"羊皮卷轴","talentText":"薇薇安获得 25–50% 基础狂气","weapons":[{"n":"天降汤雨","e":"Soup Rains from Above","proto":"rain","text":"对全体敌人施加 5000–10000%（攻击力）（+1000% 力量）层侵蚀"},{"n":"就地取材","e":"Whatever's at Hand","proto":"mine","text":"选择 1 名其他唤醒体获得 20–30 点狂气"}]},{"id":"90001","pid":"hidden-tulu","n":"神王·图鲁","en":"Tulu the Godking","realm":"混沌","realmCode":"CHAOS","role":"伤害型","roleCode":"ASSAULT","rarity":"UR","img":62,"lock":"90001","talent":"王权","talentText":"每击杀 20 名敌人累积 1 层王权，攻击与范围随之增长","kind":"唤醒体 · 本源降临","bio":"「顺应天命，不好吗？为什么要反抗命运的意志。」年幼的王沉睡于王座之上，于梦醒时分示下诏谕，权威遍及天下王土。他厌倦了自身的权能，也厌倦了超人的智慧与信徒狂热的崇拜，也厌倦了超越万古的长梦——没人知道他在漫长的睡眠里梦见了什么，但他们应当庆幸自己享有此等无知的。","bioSrc":"灰机wiki · 唤醒体档案「图鲁」（神王形态为其本源降临）","weapons":[{"n":"断罪王座","e":"Throne of Judgement","proto":"judge","text":"王座自天而降，柱下无人得以站立"},{"n":"王土加冕","e":"Coronation of Ash","proto":"nova","text":"以王座为中心，把整片土地掀翻"}]},{"id":"90002","pid":"hidden-n","n":"N","en":"N","realm":"超维","realmCode":"ULTRA","role":"辅助型","roleCode":"CHORUS","rarity":"UR","img":63,"lock":"90002","talent":"悖论","talentText":"每次升级有几率多获得一次三选一，代价是更薄的血","kind":"原初投影 · 首领（NPC）","bio":"「伏行世间的混沌之雾，祂因人类的痛苦与绝望而愉悦。」——名录上还留着另一行：「N?」，注解只有四个字：一个玩笑。","bioSrc":"灰机wiki · 怪物「N」/「N?」（原初投影·欢愉眷属）","weapons":[{"n":"无限递归","e":"Infinite Recursion","proto":"paradox","text":"把已经发生过的伤害，再发生一次"},{"n":"逻辑闭环","e":"Closed Loop","proto":"shield","text":"一个自洽的圆，挡下所有不自洽的东西"}]},{"id":"90003","pid":"hidden-william","n":"威廉","en":"William","realm":"深海","realmCode":"AEQUOR","role":"防御型","roleCode":"WARDEN","rarity":"UR","img":64,"lock":"90003","talent":"守夜","talentText":"受伤时反击，越是濒死越是难缠","kind":"剧情角色（NPC）","bio":"威廉·德拉普尔。弥萨格的资深调查员，被守密人尊称为「学长」的存在。曾因某些无法言说的原因害怕外出，在校内学习的同时兼任情报组人员。好友死后，一改以往的作风转投前线，以「做他曾经做过的事」的方式来纪念逝去的朋友。随身携带一把破碎的银钥匙，艰难地维持着那些日渐消逝的记忆。","bioSrc":"灰机wiki · 剧情角色「威廉·德拉普尔」","weapons":[{"n":"长明灯","e":"Everlasting Lamp","proto":"lantern","text":"灯亮着的时候，雾里的东西不敢靠太近"},{"n":"夜巡","e":"Night Watch","proto":"orbit","text":"绕着灯走的一圈脚步，从不熄灭"}]},{"id":"90004","pid":"hidden-keeper","n":"守密人","en":"The Keeper","realm":"血肉","realmCode":"CARO","role":"辅助型","roleCode":"SUPPORT","rarity":"UR","img":65,"lock":"90004","talent":"缄默契约","talentText":"缄默者知道得更多，也老得更快","kind":"守密人（玩家）","bio":"弥萨格的调查员，持银钥匙者。所谓守密人，是与唤醒体「链接」、把祂们带进密境又带回来的人。守密人分男女两版：男版西维斯特、女版西尔维斯，本作取男版。他的记忆一直在漏——那是链接的代价，也是他还在往前走的理由。","bioSrc":"灰机wiki · 剧情角色「西维斯特」（守密人男版；女版为西尔维斯）","weapons":[{"n":"封页之印","e":"Sealing Sigil","proto":"seal","text":"把敌人夹进书页，让它连呼吸都停住"},{"n":"禁书记忆","e":"Forbidden Recollection","proto":"chain","text":"不该被读到的东西，沿着锁链爬出来"}]}];
const WEAPONS = [{"id":"awakener-0001:0","n":"共生畸变","proto":"nova","char":"15601","charName":"24","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对全体敌人造成 35–70%（攻击力） 点伤害"},{"id":"awakener-0001:1","n":"狂乱斩击","proto":"orbit","char":"15601","charName":"24","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"随机造成 18.75–37.5%（攻击力） 点伤害 3 次。 抑郁人格"},{"id":"awakener-0002:0","n":"不耐的施舍","proto":"shield","char":"15600","charName":"阿格里帕","realm":"血肉","realmCode":"CARO","role":"防御型","text":"获得 12.5–25%（防御力） 点护盾"},{"id":"awakener-0002:1","n":"无色螺旋","proto":"vortex","char":"15600","charName":"阿格里帕","realm":"血肉","realmCode":"CARO","role":"防御型","text":"造成 15–30%（攻击力） 点伤害，并施加等量中毒"},{"id":"awakener-0003:0","n":"小小愿望","proto":"bolt","char":"15591","charName":"艾继丝","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"造成 20–40%（攻击力） 点伤害，并施加 1 回合易伤"},{"id":"awakener-0003:1","n":"石质分解","proto":"nova","char":"15591","charName":"艾继丝","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"造成 80–160%（攻击力） 点伤害，享受 2 倍力量加成"},{"id":"awakener-0004:0","n":"临战体势","proto":"shield","char":"15588","charName":"艾尔瓦","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"获得 10–20%（防御力） 点护盾"},{"id":"awakener-0004:1","n":"心眼利刃","proto":"saw","char":"15588","charName":"艾尔瓦","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"造成 60–120%（攻击力） 点伤害"},{"id":"awakener-0005:0","n":"腺体分裂","proto":"summon","char":"15573","charName":"奥瑞塔","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"造成 12–24%（攻击力） 点伤害"},{"id":"awakener-0005:1","n":"友情的力量","proto":"heal","char":"15573","charName":"奥瑞塔","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"触腕伤害 +7.5–15%（攻击力）"},{"id":"awakener-0006:0","n":"护身鳞甲","proto":"shield","char":"15594","charName":"凯刻斯","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"获得 25–50%（防御力） 点护盾"},{"id":"awakener-0006:1","n":"破碎长戟","proto":"chain","char":"15594","charName":"凯刻斯","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"造成 10–20%（攻击力） 点伤害，并获得等量反击，享受 50% 的触腕伤害加成"},{"id":"awakener-0007:0","n":"念动力","proto":"missile","char":"15572","charName":"卡茜亚","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"视为「打击」"},{"id":"awakener-0007:1","n":"噗！","proto":"bolt","char":"15572","charName":"卡茜亚","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"获得 10–15 点狂气"},{"id":"awakener-0008:0","n":"暗影飞行","proto":"boomerang","char":"77923","charName":"卡斯托尔","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"造成 35–70%（攻击力） 点伤害 3 次，使其他队友的临时暴击伤害提高 25–35%"},{"id":"awakener-0008:1","n":"冥河之翼","proto":"orbit","char":"77923","charName":"卡斯托尔","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"获得 25–50%（防御力） 点护盾，对全体敌人施加 1 回合虚弱"},{"id":"awakener-0009:0","n":"无色之梦","proto":"field","char":"15566","charName":"希莱斯特","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"回复 10–20%（体质） 点生命"},{"id":"awakener-0009:1","n":"永恒幻影","proto":"summon","char":"15566","charName":"希莱斯特","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"回复 32–64%（体质） 点生命"},{"id":"awakener-0010:0","n":"痛苦榨取","proto":"beam","char":"77925","charName":"克莱门汀","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"造成 20–40%（攻击力） 点伤害 3 次"},{"id":"awakener-0010:1","n":"精神抚慰","proto":"heal","char":"77925","charName":"克莱门汀","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"回复 22.5–45%（体质） 点生命，临时移除全体敌人的疯狂，并临时使其力量降低降低 …"},{"id":"awakener-0011:0","n":"惩戒雷霆","proto":"rain","char":"77922","charName":"克珀珊特","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"随机造成 35–70%（攻击力） 点伤害 5 次，享受 75–100% 触腕伤害加成，每…"},{"id":"awakener-0011:1","n":"不祥信号","proto":"totem","char":"77922","charName":"克珀珊特","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"获得 20–30 点狂气"},{"id":"awakener-0012:0","n":"裂颅者","proto":"strike","char":"15590","charName":"达芙黛尔","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"对生命最低的敌人造成 50–100%（攻击力） 点伤害，享受 5 倍力量加成"},{"id":"awakener-0012:1","n":"异质潮汐","proto":"vortex","char":"15590","charName":"达芙黛尔","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"获得 2–4%（攻击力） 点力量并对全体敌人施加易伤"},{"id":"awakener-0013:0","n":"体外手术","proto":"beam","char":"15570","charName":"朵尔","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"回复 15–30%（体质） 点生命"},{"id":"awakener-0013:1","n":"等价交换","proto":"heal","char":"15570","charName":"朵尔","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"回复 25–50%（体质） 点生命"},{"id":"awakener-0014:0","n":"陨落者的挽歌","proto":"meteor","char":"95786","charName":"杜勒赛因","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"对生命最低的敌人造成 80–160%（攻击力） 点伤害"},{"id":"awakener-0014:1","n":"冥府之路","proto":"summon","char":"95786","charName":"杜勒赛因","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"失去 10% 当前生命，对全体敌人造成 50–100%（攻击力） 点伤害并施加 1 回合…"},{"id":"awakener-0015:0","n":"释放：机甲","proto":"summon","char":"15603","charName":"艾瑞卡","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"获得 15–30%（攻击力） 点临时力量"},{"id":"awakener-0015:1","n":"函数过载","proto":"beam","char":"15603","charName":"艾瑞卡","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"若消耗的算力为偶数，则造成 22.5–45%（攻击力） 点伤害 X+2 次；否则获得 7…"},{"id":"awakener-0016:0","n":"养分吸收","proto":"heal","char":"15577","charName":"菲茵特","realm":"血肉","realmCode":"CARO","role":"防御型","text":"获得 12–24%（攻击力） 点力量"},{"id":"awakener-0016:1","n":"萌芽","proto":"field","char":"15577","charName":"菲茵特","realm":"血肉","realmCode":"CARO","role":"防御型","text":"获得 15–30%（防御力） 点护盾，并回复 15–30%（体质） 点生命"},{"id":"awakener-0017:0","n":"欢欣之海","proto":"vortex","char":"15575","charName":"法洛思","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"造成 16–32%（攻击力） 点伤害及等量中毒，享受 50% 触腕伤害加成"},{"id":"awakener-0017:1","n":"深海暗流","proto":"chain","char":"15575","charName":"法洛思","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"本回合内，造成触腕伤害后，对全体敌人施加 【中毒】Arg1 层中毒"},{"id":"awakener-0018:0","n":"自毁","proto":"mine","char":"15602","charName":"熔毁·朵尔","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"选择「欢欣」或「诅咒」。 「自毁·终章」"},{"id":"awakener-0018:1","n":"命运坠落","proto":"meteor","char":"15602","charName":"熔毁·朵尔","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"获得 35–50 点狂气"},{"id":"awakener-0019:0","n":"恨意宣泄","proto":"nova","char":"15567","charName":"血链·希洛","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"对全体敌人造成 40–80%（攻击力） 点伤害，并施加等量出血"},{"id":"awakener-0019:1","n":"鲜血链条","proto":"chain","char":"15567","charName":"血链·希洛","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"失去 10% 当前生命，随机造成 2 次 20–40%（攻击力） 点伤害，并施加相当于所…"},{"id":"awakener-0020:0","n":"命定之剑","proto":"saw","char":"15568","charName":"环行·拉蒙娜","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"造成 50–100%（攻击力） 点伤害，力量对「命定之剑」的效果提高 3 倍"},{"id":"awakener-0020:1","n":"无拘之视","proto":"missile","char":"15568","charName":"环行·拉蒙娜","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"获得 3–6%（攻击力） 点力量"},{"id":"awakener-0021:0","n":"断首之伤","proto":"saw","char":"15564","charName":"戈利亚","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"造成 60–120%（攻击力） 点伤害"},{"id":"awakener-0021:1","n":"最强者的法则","proto":"nova","char":"15564","charName":"戈利亚","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"获得 2–4%（攻击力） 点力量"},{"id":"awakener-0022:0","n":"灵魂序曲","proto":"chain","char":"54117","charName":"哈姆林","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"随机造成 3 段 20–40%（攻击力） 点穿透伤害"},{"id":"awakener-0022:1","n":"记忆轮舞曲","proto":"orbit","char":"54117","charName":"哈姆林","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"获得 2–4%（攻击力） 点力量"},{"id":"awakener-0023:0","n":"粉碎一击","proto":"strike","char":"15587","charName":"希洛","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"视为「打击」"},{"id":"awakener-0023:1","n":"绵长憎恶","proto":"field","char":"15587","charName":"希洛","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"失去 10% 当前生命"},{"id":"awakener-0024:0","n":"颂歌圣咏","proto":"heal","char":"15583","charName":"奥尔拉","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"选择 1 名其他唤醒体获得 10–15 点狂气"},{"id":"awakener-0024:1","n":"挽歌圣咏","proto":"rain","char":"15583","charName":"奥尔拉","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"获得 10–20%（攻击力） 点力量"},{"id":"awakener-0025:0","n":"群鼠集结","proto":"summon","char":"15593","charName":"詹金","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"将 1 张造成 30–60%（攻击力） 点伤害 X+4 次的「群鼠冲击」洗入抽牌堆顶"},{"id":"awakener-0025:1","n":"布朗出动！","proto":"summon","char":"15593","charName":"詹金","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"对全体敌人造成 15–30%（攻击力） 点伤害"},{"id":"awakener-0026:0","n":"蟾蜍浓汤","proto":"field","char":"15571","charName":"珈伦","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"对全体敌人施加 【中毒】Arg1 层中毒与 1 回合虚弱，并回复 10–20%（体质） …"},{"id":"awakener-0026:1","n":"静默守望","proto":"totem","char":"15571","charName":"珈伦","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"回复 5–10%（体质） 点生命并获得 5–10%（防御力） 点护盾"},{"id":"awakener-0027:0","n":"末路枪声","proto":"bolt","char":"77913","charName":"凯蒂古拉","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"造成 25–50%（攻击力） 点伤害两次，获得 3–6%（攻击力） 点力量"},{"id":"awakener-0027:1","n":"千兆耀斑","proto":"rain","char":"77913","charName":"凯蒂古拉","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对全体敌人造成 50–100%（攻击力） 点伤害，享受 300% 力量加成"},{"id":"awakener-0028:0","n":"欲求不满之痛","proto":"heal","char":"15597","charName":"雷娅","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"失去 10% 当前生命"},{"id":"awakener-0028:1","n":"苦痛与欢愉","proto":"chain","char":"15597","charName":"雷娅","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"随机造成 30–60%（攻击力） 点伤害 3 次"},{"id":"awakener-0029:0","n":"报偿打击","proto":"shield","char":"15581","charName":"莉莉","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"造成 75–150%（攻击力） 点伤害，触发目标 50% 的中毒"},{"id":"awakener-0029:1","n":"禁忌沼泽","proto":"field","char":"15581","charName":"莉莉","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"获得 12–24%（防御力） 点护盾，并对全体敌人施加 【中毒】Arg2 层中毒"},{"id":"awakener-0030:0","n":"扑蛾之火","proto":"missile","char":"15562","charName":"莉兹","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"获得 20–40%（防御力） 点护盾，将 1 张带消耗的「绿色火焰」加入手牌"},{"id":"awakener-0030:1","n":"绿色火焰","proto":"meteor","char":"15562","charName":"莉兹","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"造成 15–30%（攻击力） 点穿透伤害，并将 50% 的伤害转为中毒"},{"id":"awakener-0031:0","n":"桀骜之刃","proto":"saw","char":"15569","charName":"萝坦","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对随机敌人造成 7.5–15%（攻击力） 点伤害，重复 3 次"},{"id":"awakener-0031:1","n":"傲慢之潮","proto":"vortex","char":"15569","charName":"萝坦","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对全体敌人造成 7.5–15%（攻击力） 点伤害，获得 2.5–5%（攻击力） 点力量"},{"id":"awakener-0032:0","n":"升华火刑","proto":"nova","char":"15582","charName":"弥利亚姆","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"造成 60–120%（攻击力） 点穿透伤害并施加等量中毒"},{"id":"awakener-0032:1","n":"被选中之人","proto":"heal","char":"15582","charName":"弥利亚姆","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"选择 1 名其他唤醒体获得 35–50 点狂气"},{"id":"awakener-0033:0","n":"致命冲击","proto":"missile","char":"94450","charName":"茉夏","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"视为「打击」"},{"id":"awakener-0033:1","n":"闪耀☆粉碎","proto":"nova","char":"94450","charName":"茉夏","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"视为「打击」"},{"id":"awakener-0034:0","n":"逆转漩涡","proto":"vortex","char":"15576","charName":"墨菲","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"对全体敌人造成 25–50%（攻击力） 点伤害，享受 35–50% 的触腕伤害加成"},{"id":"awakener-0034:1","n":"圣女诞生","proto":"heal","char":"15576","charName":"墨菲","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"共获得（最大生命 5% + 10–20%（防御力））点护盾与 1 点算力"},{"id":"awakener-0035:0","n":"利莫里亚华尔兹","proto":"orbit","char":"15589","charName":"诞妄·墨菲","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"获得相当于银钥充能 200–300% 的银钥"},{"id":"awakener-0035:1","n":"深渊圣歌","proto":"totem","char":"15589","charName":"诞妄·墨菲","realm":"深海","realmCode":"AEQUOR","role":"辅助型","text":"获得 2 点算力并抽 2 张牌"},{"id":"awakener-0036:0","n":"禁止入内","proto":"shield","char":"15565","charName":"诺缔拉","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"获得 20–40%（防御力） 点护盾与 120–240%（攻击力） 层临时反击"},{"id":"awakener-0036:1","n":"短期记忆","proto":"field","char":"15565","charName":"诺缔拉","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"获得 10–20%（防御力） 点护盾"},{"id":"awakener-0037:0","n":"午夜之潮","proto":"chain","char":"15580","charName":"宁菲亚","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对生命最高的敌人造成 22.5–45%（攻击力） 点伤害并施加等量中毒，享受 2 倍力量…"},{"id":"awakener-0037:1","n":"死亡丧钟","proto":"strike","char":"15580","charName":"宁菲亚","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"对全体敌人施加 【中毒】Arg1 层中毒，持续 1 回合，并施加虚弱与易伤"},{"id":"awakener-0038:0","n":"不稳屏障","proto":"shield","char":"15585","charName":"奥吉尔","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"获得 7–14%（防御力） 点护盾 X+1 次"},{"id":"awakener-0038:1","n":"「穿刺」之枪","proto":"saw","char":"15585","charName":"奥吉尔","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"造成 25–50%（攻击力） 点穿透伤害，施加 1 回合易伤，享受 200% 的力量加成"},{"id":"awakener-0039:0","n":"疯狂之鞭","proto":"saw","char":"15560","charName":"潘狄娅","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"造成 20–40%（攻击力） 点伤害 3 次，并获得相当于所造成伤害 50% 的临时反击"},{"id":"awakener-0039:1","n":"蜡烛般炽热的渴望","proto":"field","char":"15560","charName":"潘狄娅","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"获得 10–20%（攻击力） 层反击"},{"id":"awakener-0040:0","n":"噬色者","proto":"chain","char":"77926","charName":"皮克曼","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"对全体敌人造成 3 次 30–60%（攻击力） 点必定暴击的伤害，每次从目标处「窃取」 …"},{"id":"awakener-0040:1","n":"栩栩如生的描绘","proto":"summon","char":"77926","charName":"皮克曼","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"胚胎融合 +20–30"},{"id":"awakener-0041:0","n":"灼魂之光","proto":"meteor","char":"77917","charName":"波吕克斯","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"对全体敌人造成 40–80%（攻击力） 点伤害，并抽取 2 张算力消耗最低的指令卡"},{"id":"awakener-0041:1","n":"净化裁决","proto":"rain","char":"77917","charName":"波吕克斯","realm":"超维","realmCode":"ULTRA","role":"伤害型","text":"造成 70–140%（攻击力） 点伤害 2 次"},{"id":"awakener-0042:0","n":"女王之剑","proto":"orbit","char":"15595","charName":"拉蒙娜","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"造成 15–30%（攻击力） 点伤害 2 次"},{"id":"awakener-0042:1","n":"突击论题","proto":"boomerang","char":"15595","charName":"拉蒙娜","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"临时使全体敌人的力量降低降低 7.5–15%（防御力）"},{"id":"awakener-0043:0","n":"意外之财","proto":"bolt","char":"15604","charName":"莱克","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"造成 20–40%（攻击力） 点伤害"},{"id":"awakener-0043:1","n":"摊牌","proto":"mine","char":"15604","charName":"莱克","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"造成 20–40%（攻击力） 点伤害 1~6 次，获得 10–15 点狂气"},{"id":"awakener-0044:0","n":"受祝福的白骨","proto":"totem","char":"15599","charName":"萨尔瓦多","realm":"血肉","realmCode":"CARO","role":"防御型","text":"对全体敌人施加 1 回合虚弱"},{"id":"awakener-0044:1","n":"应消之苦","proto":"nova","char":"15599","charName":"萨尔瓦多","realm":"血肉","realmCode":"CARO","role":"防御型","text":"选择"},{"id":"awakener-0045:0","n":"美丽的慈悲","proto":"heal","char":"15592","charName":"珊","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"获得 24–48%（防御力） 点护盾"},{"id":"awakener-0045:1","n":"孤绝乐章","proto":"field","char":"15592","charName":"珊","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"下回合开始时，驱散自身脆弱状态并获得 30–60%（防御力） 点护盾"},{"id":"awakener-0046:0","n":"玫瑰的优雅","proto":"orbit","char":"15584","charName":"索蕾尔","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"随机造成 16–32%（攻击力） 点伤害 4 次"},{"id":"awakener-0046:1","n":"璞玉","proto":"beam","char":"15584","charName":"索蕾尔","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"失去 10% 当前生命"},{"id":"awakener-0047:0","n":"全知真理","proto":"beam","char":"54116","charName":"塔薇","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"在手牌中时，若抽牌堆顶的牌是指令卡，则变为其复制"},{"id":"awakener-0047:1","n":"时之羽翼","proto":"boomerang","char":"54116","charName":"塔薇","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"获得 3–6%（攻击力） 点力量"},{"id":"awakener-0048:0","n":"远古爱抚","proto":"heal","char":"15596","charName":"泰旖丝","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"选择 1 名其他唤醒体，使该唤醒体与「被选中之人」均获得 15–20 点狂气"},{"id":"awakener-0048:1","n":"圣血本能","proto":"field","char":"15596","charName":"泰旖丝","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"胚胎融合 +30–40，获得相当于泰旖丝银钥充能 2 倍的银钥"},{"id":"awakener-0049:0","n":"安魂曲","proto":"field","char":"15574","charName":"汀克特","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"驱散自身脆弱、虚弱与易伤状态"},{"id":"awakener-0049:1","n":"远方旋律","proto":"missile","char":"15574","charName":"汀克特","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"获得 50–100%（防御力） 点护盾，下回合暴击率 +15%"},{"id":"awakener-0050:0","n":"深渊秩序","proto":"chain","char":"15563","charName":"图鲁","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"对全体敌人造成 60–120%（攻击力） 点穿透伤害，额外享受 0% 的触腕伤害与力量加成"},{"id":"awakener-0050:1","n":"当利莫里亚回归","proto":"nova","char":"15563","charName":"图鲁","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"驱散自身虚弱状态"},{"id":"awakener-0051:0","n":"沸腾吧，鲜血！","proto":"field","char":"15598","charName":"尤乌哈希","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"造成 12–24%（攻击力） 点伤害三次"},{"id":"awakener-0051:1","n":"尖啸吧，鲜血！","proto":"nova","char":"15598","charName":"尤乌哈希","realm":"血肉","realmCode":"CARO","role":"伤害型","text":"失去 10% 当前生命"},{"id":"awakener-0052:0","n":"迷途之守","proto":"totem","char":"15586","charName":"旺达","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"获得 30–60%（攻击力） 层反击"},{"id":"awakener-0052:1","n":"脊刺锁链","proto":"chain","char":"15586","charName":"旺达","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"随机造成 35–70%（攻击力） 点伤害 5 次；此伤害享受 15–20% 的反击加成"},{"id":"awakener-0053:0","n":"能量光束","proto":"beam","char":"15579","charName":"温柯尔","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"移除所有敌人的屏障，造成 40–80%（攻击力） 点伤害并施加 1 回合虚弱"},{"id":"awakener-0053:1","n":"精神重建","proto":"heal","char":"15579","charName":"温柯尔","realm":"超维","realmCode":"ULTRA","role":"防御型","text":"获得 20–40%（防御力） 点护盾，弃置全部手牌，每弃置一张，所获护盾 +50%"},{"id":"awakener-0054:0","n":"思骨之苦","proto":"chain","char":"125346","charName":"徐","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"对全体敌人造成 150–300%（攻击力） 点必定暴击的伤害并触发 80% 的中毒"},{"id":"awakener-0054:1","n":"扇封之吻","proto":"heal","char":"125346","charName":"徐","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"对全体敌人施加 【中毒】Arg1 层中毒，并临时使其力量降低降低 15–30%（防御力）"},{"id":"awakener-0055:0","n":"蓄力","proto":"bolt","char":"130901","charName":"莫丝","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"获得 50–75 点狂气，莫丝的下一次狂气爆发暴击率 +25–35%"},{"id":"awakener-0055:1","n":"装填！","proto":"missile","char":"130901","charName":"莫丝","realm":"深海","realmCode":"AEQUOR","role":"伤害型","text":"获得 1 层「涡流装填」，「可使用3次」"},{"id":"awakener-0056:0","n":"永恒编织","proto":"field","char":"77918","charName":"阿拉克涅","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"对全体敌人施加 300–600%（攻击力） 层「终局裁决」，然后创造 1 张「引导之线」"},{"id":"awakener-0056:1","n":"缚命之网","proto":"field","char":"77918","charName":"阿拉克涅","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"获得 35–70%（防御力） 点护盾"},{"id":"awakener-0057:0","n":"脏腑之花","proto":"summon","char":"130226","charName":"沙耶","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"失去 10% 当前生命，对全体敌人施加 5500–11000%（攻击力） 层侵蚀"},{"id":"awakener-0057:1","n":"仿生","proto":"shield","char":"130226","charName":"沙耶","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"胚胎融合 +30–40"},{"id":"awakener-0058:0","n":"憔悴肆虐","proto":"field","char":"141302","charName":"庞托斯","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"对全体敌人造成 30–60%（攻击力） 点必定暴击的伤害"},{"id":"awakener-0058:1","n":"憔悴者的召唤","proto":"summon","char":"141302","charName":"庞托斯","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"若本场战斗首次释放，将 3 张不同的「憔悴者」生成到手牌并获得 30–60%（防御力） …"},{"id":"awakener-0059:0","n":"长刃：殒灭","proto":"beam","char":"145363","charName":"蚀灭·萝坦","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"视为「打击」"},{"id":"awakener-0059:1","n":"短刃：吞噬","proto":"saw","char":"145363","charName":"蚀灭·萝坦","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"视为「打击」"},{"id":"awakener-0060:0","n":"奇迹祝福","proto":"heal","char":"77921","charName":"卡拉布","realm":"血肉","realmCode":"CARO","role":"防御型","text":"获得 35–70%（防御力） 点护盾"},{"id":"awakener-0060:1","n":"雪夜魔咒","proto":"field","char":"77921","charName":"卡拉布","realm":"血肉","realmCode":"CARO","role":"防御型","text":"对生命最高的敌人造成 5000–10000%（攻击力） 点固定伤害"},{"id":"awakener-0061:0","n":"罪染之枪","proto":"beam","char":"148578","charName":"负誓·奥吉尔","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"造成 100–200%（攻击力） 点伤害，享受 300% 的力量加成"},{"id":"awakener-0061:1","n":"无尽之影","proto":"summon","char":"148578","charName":"负誓·奥吉尔","realm":"混沌","realmCode":"CHAOS","role":"防御型","text":"临时使全体敌人的力量降低降低 4–8%（防御力）"},{"id":"awakener-0062:0","n":"天降汤雨","proto":"rain","char":"151844","charName":"薇薇安","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"对全体敌人施加 5000–10000%（攻击力）（+1000% 力量）层侵蚀"},{"id":"awakener-0062:1","n":"就地取材","proto":"mine","char":"151844","charName":"薇薇安","realm":"混沌","realmCode":"CHAOS","role":"辅助型","text":"选择 1 名其他唤醒体获得 20–30 点狂气"},{"id":"hidden-tulu:0","n":"断罪王座","proto":"judge","char":"90001","charName":"神王·图鲁","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"王座自天而降，柱下无人得以站立"},{"id":"hidden-tulu:1","n":"王土加冕","proto":"nova","char":"90001","charName":"神王·图鲁","realm":"混沌","realmCode":"CHAOS","role":"伤害型","text":"以王座为中心，把整片土地掀翻"},{"id":"hidden-n:0","n":"无限递归","proto":"paradox","char":"90002","charName":"N","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"把已经发生过的伤害，再发生一次"},{"id":"hidden-n:1","n":"逻辑闭环","proto":"shield","char":"90002","charName":"N","realm":"超维","realmCode":"ULTRA","role":"辅助型","text":"一个自洽的圆，挡下所有不自洽的东西"},{"id":"hidden-william:0","n":"长明灯","proto":"lantern","char":"90003","charName":"威廉","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"灯亮着的时候，雾里的东西不敢靠太近"},{"id":"hidden-william:1","n":"夜巡","proto":"orbit","char":"90003","charName":"威廉","realm":"深海","realmCode":"AEQUOR","role":"防御型","text":"绕着灯走的一圈脚步，从不熄灭"},{"id":"hidden-keeper:0","n":"封页之印","proto":"seal","char":"90004","charName":"守密人","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"把敌人夹进书页，让它连呼吸都停住"},{"id":"hidden-keeper:1","n":"禁书记忆","proto":"chain","char":"90004","charName":"守密人","realm":"血肉","realmCode":"CARO","role":"辅助型","text":"不该被读到的东西，沿着锁链爬出来"}];
const MOBS = [{"id":"13950","n":"提灯教牧","cls":"普通"},{"id":"13951","n":"「海伦」","cls":"普通"},{"id":"13962","n":"融蚀野犬","cls":"普通"},{"id":"13965","n":"双生脓疱","cls":"普通"},{"id":"13969","n":"蜡像绅士","cls":"普通"},{"id":"13970","n":"提灯教众","cls":"普通"},{"id":"13974","n":"协作型融蚀体","cls":"普通"},{"id":"13954","n":"创痛疯马","cls":"精英"},{"id":"13955","n":"疯狂碎石工","cls":"精英"},{"id":"13960","n":"「替代品」","cls":"精英"},{"id":"13963","n":"大裙摆","cls":"精英"},{"id":"13967","n":"「永恒助祭」","cls":"精英"},{"id":"13956","n":"「守灯人」","cls":"Boss"},{"id":"13958","n":"「劳伦斯先生」","cls":"Boss"},{"id":"13961","n":"「嘉尔姆？」","cls":"Boss"},{"id":"13964","n":"「波纳佩颂歌」","cls":"Boss"},{"id":"13966","n":"吞噬之吠","cls":"Boss"},{"id":"13971","n":"「斯特里戈伊之心？」","cls":"Boss"}];
const CREATIONS = [{"id":"83510","n":"血肉戒指","r":"SSR","t":[],"fx":"projrange"},{"id":"78667","n":"诡术礼帽","r":"","t":["draw"],"fx":"area"},{"id":"70797","n":"活性注射器","r":"N","t":["energy"],"fx":"fieldr"},{"id":"70751","n":"弥萨格徽章","r":"N","t":["energy"],"fx":"dur"},{"id":"70738","n":"恩赐之血","r":"N","t":[],"fx":"speed"},{"id":"70700","n":"哭泣烟斗","r":"N","t":["dmg"],"fx":"dmg"},{"id":"70761","n":"春之祭","r":"N","t":["dmg"],"fx":"str"},{"id":"70759","n":"恶童","r":"N","t":["dmg"],"fx":"crit"},{"id":"57737","n":"幸运风衣","r":"SR","t":["crit"],"fx":"critdmg"},{"id":"57736","n":"偏方骰子","r":"SR","t":["draw"],"fx":"magnet"},{"id":"98380","n":"过往的贡物","r":"N","t":[],"fx":"count"},{"id":"98389","n":"日月轮盘","r":"N","t":["energy","draw"],"fx":"energy"},{"id":"57735","n":"大嘴纽扣","r":"SR","t":["dmg","crit"],"fx":"exhaust"},{"id":"70730","n":"红宝石胸针","r":"N","t":["str"],"fx":"dmg"},{"id":"98408","n":"彩蛋时间","r":"N","t":["rage"],"fx":"expup"},{"id":"98396","n":"万花筒","r":"N","t":["dmg"],"fx":"str"},{"id":"98381","n":"旅行阳伞","r":"N","t":[],"fx":"guard"},{"id":"70706","n":"瘟疫诊断书","r":"N","t":[],"fx":"knock"},{"id":"98367","n":"怪蛇残蜕","r":"N","t":["guard"],"fx":"shieldup"},{"id":"70739","n":"蝴蝶标本","r":"N","t":["guard"],"fx":"regen"},{"id":"70701","n":"原型电池","r":"N","t":["rage"],"fx":"rage"},{"id":"98394","n":"幸运兔脚","r":"N","t":["exhaust"],"fx":"crit"},{"id":"98416","n":"普特尼晨报","r":"N","t":["dmg","energy"],"fx":"critdmg"},{"id":"70765","n":"缠丝玛瑙","r":"N","t":["dmg","str"],"fx":"exhaust"},{"id":"98384","n":"被遗忘者之血","r":"N","t":["dmg","rage"],"fx":"dmg"},{"id":"98393","n":"伶牙俐齿","r":"N","t":[],"fx":"lifesteal"},{"id":"70770","n":"定向罗盘","r":"N","t":["draw"],"fx":"healup"},{"id":"98409","n":"妙手空空","r":"N","t":["str"],"fx":"str"},{"id":"98390","n":"寂静序曲","r":"N","t":["draw","str"],"fx":"crit"},{"id":"70779","n":"可疑的药膏","r":"N","t":[],"fx":"summonup"},{"id":"70734","n":"秘典星象仪","r":"N","t":["dmg"],"fx":"critdmg"},{"id":"70760","n":"神经毒素","r":"N","t":[],"fx":"pierce"},{"id":"98371","n":"失衡的天平","r":"N","t":["rage"],"fx":"draw"},{"id":"70789","n":"蒙尘缝纫机","r":"N","t":[],"fx":"thorns"},{"id":"70766","n":"守护之手","r":"N","t":["guard"],"fx":"guard"},{"id":"70788","n":"桂叶袖扣","r":"N","t":["rage"],"fx":"magnet"},{"id":"70776","n":"刺荨麻背心","r":"N","t":[],"fx":"projspd"},{"id":"70712","n":"我们的家","r":"N","t":["str"],"fx":"exhaust"},{"id":"98424","n":"莱茵德纸草书","r":"N","t":["dmg","draw"],"fx":"dmg"},{"id":"70703","n":"锈蚀柳叶刀","r":"N","t":["dmg"],"fx":"str"},{"id":"98386","n":"医生手提箱","r":"N","t":["dmg","draw","energy"],"fx":"crit"},{"id":"70780","n":"异种喉舌","r":"N","t":["dmg"],"fx":"critdmg"}];
const WHEELS = [{"id":"130053","n":"愿世界化作芬芳","realm":"血肉"},{"id":"9827","n":"巨人之刃","realm":"深海"},{"id":"94448","n":"狂戮至世界尽头","realm":"混沌"},{"id":"9881","n":"慈悲的哺育","realm":"血肉"},{"id":"48828","n":"极夜与破晓","realm":"通用"},{"id":"125195","n":"枉蹙眉","realm":"血肉"},{"id":"78774","n":"黑暗中的安眠","realm":"深海"},{"id":"9516","n":"星天之兽","realm":"混沌"},{"id":"54113","n":"坠入虚无的人偶","realm":"混沌"},{"id":"77859","n":"不可承受的自由","realm":"超维"},{"id":"9817","n":"溯洄时计","realm":"混沌"},{"id":"77893","n":"永世编织之网","realm":"超维"},{"id":"9947","n":"无法完成的演算","realm":"超维"},{"id":"9667","n":"吞噬摇篮曲","realm":"血肉"},{"id":"9786","n":"冬夜追忆","realm":"血肉"},{"id":"77889","n":"扭曲的骑士诗","realm":"超维"},{"id":"9856","n":"记忆螺旋","realm":"混沌"},{"id":"9644","n":"神王的颂歌","realm":"深海"}];
const COVENANTS = [{"id":"18344","n":"机械降神"},{"id":"18346","n":"再衍化"},{"id":"18353","n":"猩红之拥"},{"id":"18341","n":"猩红之悸"},{"id":"18358","n":"扭曲双子·黑"},{"id":"18360","n":"埋骨地絮语"},{"id":"18352","n":"扭曲双子·白"},{"id":"18338","n":"诅咒兔"},{"id":"18339","n":"二律背反"}];
return { ATLAS, META, CHARS, WEAPONS, MOBS, CREATIONS, WHEELS, COVENANTS };
})();

// ---- js/sv/engine.js
const m_engine = await (async () => {
const { PROTOS, LV, CREATION_FX, CREATION_STACK, WHEEL_FX, COVENANT_FX, EVOS, RUN_TIME, DIFFS, spawnGap, hpScale, dmgScale, BOSS_AT, ELITE_EVERY, eliteGap, eliteCount, PLAYER, expNeed, scoreOf, MAX_WEAPON, POOL_PER_PROTO, RAGE, TERRAINS, terrainAt, MECHS, GROWTHS, ITEMS, ITEM_MAX } = m_defs;
const { isUnlocked, recordRun } = m_unlock;
const { META, CHARS, WEAPONS, MOBS, CREATIONS, WHEELS, COVENANTS } = m_gen;
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





const TAU = Math.PI * 2;
const VIEW_H = 620;                 // 视口固定高度（世界单位）
const MAX_ENEMY = 300;
const MAX_BULLET = 700;

// ---------------------------------------------------------------- 随机
// 可复现的伪随机：同一把种子重开能复现同一局，测试和「再来一次」都好办。
let seed = 1;
function setSeed(s) { seed = (s >>> 0) || 1; }
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
const G = {
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
  // 超武觉醒播报队列（由 refreshEvo 入队，update 在战斗帧里消费）
  evoQueue: [],
  // 神秘唤醒体的独有机制状态：stacks 是累积层（王权 / 封印），low 是威廉的
  // 「血量低于 40%」开关（用它判断跨线，避免每帧重算 mods）。
  mech: { id: null, stacks: 0, low: false, procs: 0 },
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
function addText(x, y, txt, kind) {
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
function reset(charId, diffKey) {
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
  G.evoQueue = [];
  G.growth = [];
  G.items = [];
  G.echo = [];
  G.echoT = 0; G.echoMark = 0;
  G.mech = { id: null, stacks: 0, low: false, procs: 0 };
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
function recompute() {
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
  }
  Object.assign(m, base);

  for (const p of G.passives) {
    for (let i = 0; i < p.stack; i++) applyCreation(p, m);
  }
  for (const w of G.wheels) applyWheel(w.key, m);
  for (const v of G.covs) applyCovenant(v.key, m);
  // 后期成长：每一项都是永久叠加，所以和造物一样逐层重放
  for (const g of G.growth) applyGrowth(g, m);

  G.player.maxHp = Math.round(PLAYER.hp + m.maxHpBonus);
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
      G.evoQueue.push(evo.n);
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

function addWeapon(wid, replaceId) {
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

function addCreation(creationId) {
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

function addGrowth(id) {
  const meta = GROWTHS.find((g) => g.id === id);
  if (!meta) return null;
  G.growth.push({ id: meta.id, n: meta.n, icon: meta.icon, fx: meta.fx, stack: 1 });
  recompute();
  return G.growth[G.growth.length - 1];
}

// 一次性道具：拿到就进背包，用掉就没了。持有上限 3 件，
// 所以后期真正要做的是「留哪几件」而不是无脑全收。
function addItem(id) {
  const meta = ITEMS.find((i) => i.id === id);
  if (!meta) return null;
  if (G.items.length >= ITEM_MAX) return null;
  const o = { id: meta.id, n: meta.n, icon: meta.icon, color: meta.color, txt: meta.txt };
  G.items.push(o);
  return o;
}

// 使用一件道具。返回是否真的用掉了 —— UI 靠它决定要不要刷道具栏。
function useItem(id) {
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

function addWheel(index) {
  const meta = WHEELS[index];
  if (!meta) return;
  G.wheels.push({ key: WHEEL_FX[index % WHEEL_FX.length].key, id: String(meta.id), n: meta.n, idx: index });
  recompute();
}

function addCovenant(index) {
  const meta = COVENANTS[index];
  if (!meta) return;
  G.covs.push({ key: COVENANT_FX[index % COVENANT_FX.length].key, id: String(meta.id), n: meta.n, idx: index });
  recompute();
}

// ---------------------------------------------------------------- 升级选项
// 三选一：新武器 / 武器升级 / 造物 / 命轮 / 契物。
// 稀有度不是权重，而是「先满足条件才进池」，所以金框出现时一定是能用的。
function rollChoices() {
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
  const news = G.candidatePool
    .map((id) => WEAPONS.find((w) => w.id === id))
    .filter((d) => d && !G.weapons.some((w) => w.def.id === d.id));
  const weaponSlot = G.weapons.length < MAX_WEAPON;
  const wpool = [];
  for (const w of ups) wpool.push({ kind: 'wlv', w });
  if (weaponSlot) {
    for (const d of news) wpool.push({ kind: 'wnew', def: d });
  } else {
    // 满了也照抽，只是变成「替换」。要让位的那一把交给玩家自己选 ——
    // 以前固定换等级最低的，想换掉一把满级却不合流派的技能根本没门路。
    for (const d of news) wpool.push({ kind: 'wswap', def: d, drop: null });
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


function applyChoice(o) {
  if (!o) { skipChoice(); return; }
  if (o.kind === 'wlv') { o.w.lv = Math.min(LV.max, o.w.lv + 1); }
  else if (o.kind === 'wnew') addWeapon(o.def.id);
  else if (o.kind === 'wswap') {
    // dropId 来自「替换选择面板」：玩家自己指定让位的那把技能
    addWeapon(o.def.id, o.dropId || (o.drop && o.drop.def ? o.drop.def.id : null));
  }
  else if (o.kind === 'creation') addCreation(o.c.id);
  else if (o.kind === 'wheel') addWheel(o.i);
  else if (o.kind === 'cov') addCovenant(o.i);
  else if (o.kind === 'growth') addGrowth(o.g.id);
  else if (o.kind === 'item') addItem(o.it.id);
  // 专武的条件是「这把技能练到 4 级」，升级本身不会走 recompute，
  // 所以每次选完都要重判一次超武状态。
  refreshEvo();
  if (G.mods.timeDilate) G.dilate = 3;
  advancePending();
}

// 什么都不选：玩家明确要的「这次不要」。技能栏满了、造物都叠满了之后，
// 强行塞东西反而是负收益，所以留一个出口。
function skipChoice() {
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
function update(dt) {
  if (G.phase !== 'run') { tickFx(dt); return; }
  G.dt = dt;
  const P = G.player;

  if (G.dilate > 0) G.dilate -= dt;
  const slow = G.dilate > 0 ? 0.4 : 1;

  G.t += dt;

  // ---- 超武觉醒播报：升级弹窗里判定出来的超武，等回到战斗再飘出来
  if (G.evoQueue && G.evoQueue.length) {
    const evoName = G.evoQueue.shift();
    addText(P.x, P.y - 66, `超武 · ${evoName}`, 6);
    G.flash = Math.max(G.flash, 0.3);
    G.shake = Math.min(12, G.shake + 5);
  }

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
    const ev = w.evo ? w.evo.fx : null;
    const cd = proto.cd * LV.cd(w.lv) * G.mods.cd * rageCd
      * (ev && ev.cd ? ev.cd : 1)
      * (G.mods.echo && rnd() < G.mods.echo ? 0.4 : 1);
    w.timer = cd;
    w.cdMax = cd;
    w.cdLeft = cd;
    const dmg = proto.dmg * LV.dmg(w.lv) * G.mods.atk * G.mods.dmgMul * rageAtk
      * (ev && ev.dmg ? 1 + ev.dmg : 1);
    fireProto(w, proto, dmg);
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
  const cnt = LV.count(lv, proto) + (ev && ev.count ? ev.count : 0) + G.mods.count;
  // 范围：超武的 area 是「只强化这一把」，造物的 area 是全局
  const areaMul = (ev && ev.area ? 1 + ev.area : 1) * G.mods.area;
  const exPierce = ev && ev.pierce ? ev.pierce : 0;
  const color = proto.color;
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
  }
}

function releaseRage() {
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
function giveUp() {
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

function damageEnemy(e, amount, sx, sy, src) {
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

function hurtPlayer(amount, src) {
  const P = G.player;
  if (P.inv > 0 || G.phase !== 'run') return;
  let dmg = amount * G.mods.dmgTaken;
  dmg = Math.max(1, dmg - G.mods.armor);
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
      if (p.kind === 'exp') gainExp(p.val);
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
function summary() {
  const st = { kills: G.kills, t: G.t, lv: G.lv, bossKills: G.bossKills };
  const base = scoreOf(st);
  return {
    ...st,
    score: Math.round(base * G.diff.mul),
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

function remaining() { return Math.max(0, RUN_TIME - G.t); }
return { VIEW_H, setSeed, G, addText, reset, recompute, addWeapon, addCreation, addGrowth, addItem, useItem, addWheel, addCovenant, rollChoices, applyChoice, skipChoice, update, releaseRage, giveUp, damageEnemy, hurtPlayer, gainExp, summary, remaining };
})();

// ---- js/sv/render.js
const m_render = await (async () => {
const { G, VIEW_H } = m_engine;
const { META, ATLAS } = m_gen;
const { TERRAINS, RAGE } = m_defs;
// 《唤醒体幸存者》绘制层：地面、角色、敌人、弹道、特效、飘字。
//
// 全部用 canvas 2D。视觉上刻意做成「低饱和深色调 + 高饱和弹道」：
// 背景压暗，所有伤害表现都用亮色，几百个敌人糊在一起时也能一眼看清
// 自己的子弹在打哪儿。
//
// 贴图只有一张图集（js/sv/gen.js 里的 ATLAS，构建时内联的 data URI），
// 角色和怪物都从这张图上按格位取，所以整局游戏零图片请求。





let cv = null;
let ctx = null;
let img = null;
let glow = null;        // 预渲染的光晕精灵（三类敌人各一张）
let shadow = null;      // 预渲染的脚下椭圆阴影
let vignetteC = null;   // 暗角
let rageEdge = null;    // 狂气爆发时的红色边缘
let dpr = 1;

// 地形图块与 pattern 都按主题缓存：一共五种，512² 各一张，
// 切换时只在第一次生成，之后就是 createPattern + fillRect。
const tiles = {};
const pats = {};
let weather = null;     // 天气粒子（雪花/火星/灰烬）
let weatherKind = '';

function init(canvas) {
  cv = canvas;
  ctx = canvas.getContext('2d', { alpha: false });
  img = new Image();
  img.decoding = 'async';
  img.src = ATLAS;
  glow = { 0: makeGlow('150,120,190'), 1: makeGlow('227,179,65'), 2: makeGlow('232,105,95') };
  shadow = makeShadow();
  return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
}

// 地面：按地形生成一张 512×512 的 tile，之后用 pattern 平铺。
// 每帧画几百个石子会直接把帧率吃掉，pattern 一次 fill 就够。
function groundTile(T) {
  if (tiles[T.k]) return tiles[T.k];
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = T.base;
  g.fillRect(0, 0, S, S);

  // 底噪：几十块深浅不一的暗斑，让平铺时看不出接缝
  let seed = 20261029 + T.k.length * 7919;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 46;
    const a = 0.02 + rnd() * 0.06;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, T.blob + (a * 1.6).toFixed(3) + ')');
    grd.addColorStop(1, T.blob + '0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // 网格：每 64 一格，很淡，只用来提供移动参照
  g.strokeStyle = T.grid;
  g.lineWidth = 1;
  for (let i = 0; i <= S; i += 64) {
    g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, S); g.stroke();
    g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(S, i + 0.5); g.stroke();
  }
  tiles[T.k] = c;
  return c;
}

function patternOf(T) {
  if (!pats[T.k]) pats[T.k] = ctx.createPattern(groundTile(T), 'repeat');
  return pats[T.k];
}


// 光晕精灵：以前每个敌人每帧 createRadialGradient 一次，300 个敌人就是
// 300 次渐变对象分配 —— 实测直接掉到 30 帧。预渲染一张 64×64 的软圆，
// 之后只是 drawImage 缩放，同样的画面 60 帧稳。
function makeGlow(rgb) {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, `rgba(${rgb},0.42)`);
  grd.addColorStop(0.55, `rgba(${rgb},0.14)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return c;
}

// 脚下阴影同样预渲染：一个 300 次的 ellipse().fill() 也是每秒 1.8 万次路径构建
function makeShadow() {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 20;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(24, 10, 0, 24, 10, 24);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.save(); g.translate(24, 10); g.scale(1, 0.42); g.translate(-24, -10);
  g.fillRect(0, 0, 48, 20);
  g.restore();
  return c;
}

function resize() {
  const rect = cv.getBoundingClientRect();
  // DPR 封顶 1.5：这游戏全是软边贴图和发光圆，1.5 倍已经看不出锯齿，
  // 但像素数比 2 倍少 44% —— 满屏 300 个敌人时这就是 60 帧和 30 帧的差别。
  dpr = Math.min(1.5, window.devicePixelRatio || 1);
  G.W = Math.max(1, Math.round(rect.width));
  G.H = Math.max(1, Math.round(rect.height));
  // 可见面积固定，而不是可见宽高固定。
  //
  // 早先按「宽至少 400、高至少 660」约束，竖屏拿到的是 400×867 的世界视野：
  // 角色直径只有 30，占屏宽 7%，一整屏空得能跑马（实测 20 秒后画面里一只怪
  // 都没有）。现在反过来锁面积——不管横竖屏、不管桌面窗口多大，一屏看到的
  // 世界单位数基本恒定（约 336×729 或 729×336），角色占比、敌人密度、可见
  // 预警距离三件事就都稳住了。
  const AREA = 245000;                       // 目标可见面积（世界单位²）
  G.s = Math.min(2.0, Math.max(0.9, Math.sqrt((G.W * G.H) / AREA)));
  cv.width = Math.round(G.W * dpr);
  cv.height = Math.round(G.H * dpr);
}

// 图集取格
function frame(idx, x, y, size, alpha, flip) {
  if (idx == null || !img || !img.complete) return;
  const c = META.cell;
  const col = idx % META.cols;
  const row = (idx / META.cols) | 0;
  const a = alpha == null ? 1 : alpha;
  if (a <= 0) return;
  const old = ctx.globalAlpha;
  ctx.globalAlpha = a;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, col * c, row * c, c, c, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(img, col * c, row * c, c, c, x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = old;
}

function draw() {
  if (!ctx) return;
  const { W, H, s } = G;
  const sh = G.shake;
  const ox = sh ? (Math.sin(G.t * 61) * sh) : 0;
  const oy = sh ? (Math.cos(G.t * 47) * sh) : 0;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, W, H);

  // 世界变换：以相机为中心
  const cx = G.cam.x, cy = G.cam.y;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, (W / 2 - cx * s + ox) * dpr, (H / 2 - cy * s + oy) * dpr);

  const halfW = W / 2 / s, halfH = H / 2 / s;
  const L = cx - halfW - 60, R = cx + halfW + 60;
  const T = cy - halfH - 60, B = cy + halfH + 60;

  drawGround(L, T, R, B);
  drawFields(L, R, T, B);
  drawPickups(L, R, T, B);
  drawSummons();
  drawEnemies(L, R, T, B);
  drawPlayer();
  drawBullets(L, R, T, B);
  drawOrbs();
  drawFx();
  drawTexts();

  // 屏幕层：受伤红闪 / 狂气红晕 / Boss 警报 / 暗角 / 天气
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(232,80,70,${G.flash * 0.24})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.rageT > 0) drawRageVeil(W, H);
  drawBossWarn(W, H);
  vignette(W, H);
  drawWeather(W, H);
}

// ---------------------------------------------------------------- 天气
// 每种地貌一层很淡的大气：雪原下雪、熔谷飘火星、虚空浮星尘、废土落灰。
// 全在屏幕坐标里走，不为每个粒子建世界对象 —— 它们本来就该贴在镜头上。
function initWeather(k) {
  weatherKind = k;
  const n = k === 'snow' ? 44 : k === 'ember' ? 34 : k === 'void' ? 30 : k === 'ash' ? 24 : 16;
  weather = [];
  for (let i = 0; i < n; i++) {
    weather.push({
      x: Math.random(), y: Math.random(),
      r: 0.7 + Math.random() * 1.9,
      v: 0.018 + Math.random() * 0.05,
      p: Math.random() * Math.PI * 2,
    });
  }
}

function drawWeather(W, H) {
  const ter = TERRAINS[G.terrainIdx] || TERRAINS[0];
  if (weatherKind !== ter.k) initWeather(ter.k);
  if (!weather || !weather.length) return;
  const rising = ter.k === 'ember' || ter.k === 'void';
  const color = ter.k === 'snow' ? 'rgba(214,232,255,'
    : ter.k === 'ember' ? 'rgba(255,150,70,'
      : ter.k === 'void' ? 'rgba(190,165,255,'
        : 'rgba(150,163,190,';
  for (const p of weather) {
    const x = p.x * W + Math.sin(G.t * 0.7 + p.p) * 12;
    const span = H * 1.15;
    const y = rising
      ? H - ((p.y * span + G.t * p.v * H * 1.6) % span)
      : (p.y * span + G.t * p.v * H) % span;
    const a = 0.16 + Math.abs(Math.sin(G.t * 1.4 + p.p)) * 0.2;
    ctx.fillStyle = color + a.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------- 狂气
// 爆发期间屏幕四周泛一层红，像镜头被血糊住 —— 玩家不用看条也知道自己在爆发。
function drawRageVeil(W, H) {
  if (!rageEdge || rageEdge.w !== W || rageEdge.h !== H) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * 0.5));
    c.height = Math.max(1, Math.round(H * 0.5));
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.18,
      c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.62);
    grd.addColorStop(0, 'rgba(255,70,45,0)');
    grd.addColorStop(0.65, 'rgba(255,70,45,0.10)');
    grd.addColorStop(1, 'rgba(255,50,35,0.42)');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    rageEdge = { w: W, h: H, c };
  }
  // 结束前 0.6 秒淡出，不要「啪」地消失
  const k = Math.min(1, G.rageT / 0.6) * (0.85 + Math.sin(G.t * 9) * 0.15);
  ctx.globalAlpha = k;
  ctx.drawImage(rageEdge.c, 0, 0, W, H);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Boss 警报
// 两段：出现前 2.5 秒边缘红光脉动（预告），出现瞬间一条横幅（确认）。
// 全靠屏幕层绘制，不进世界坐标，所以不会因为玩家跑到地图角落就看不见。
function drawBossWarn(W, H) {
  const eta = G.bossEta;
  if (eta > 0 && eta <= 2.5) {
    // 越接近出现，脉动越急、越亮
    const k = 1 - eta / 2.5;
    const pulse = 0.5 + 0.5 * Math.sin(G.t * (7 + k * 9));
    const a = (0.10 + k * 0.22) * pulse;
    const th = Math.min(W, H) * 0.16;
    const g1 = ctx.createLinearGradient(0, 0, 0, th);
    g1.addColorStop(0, `rgba(235,70,60,${a})`);
    g1.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, th);
    const g2 = ctx.createLinearGradient(0, H, 0, H - th);
    g2.addColorStop(0, `rgba(235,70,60,${a})`);
    g2.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, H - th, W, th);
    const g3 = ctx.createLinearGradient(0, 0, th, 0);
    g3.addColorStop(0, `rgba(235,70,60,${a * 0.8})`);
    g3.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, th, H);
    const g4 = ctx.createLinearGradient(W, 0, W - th, 0);
    g4.addColorStop(0, `rgba(235,70,60,${a * 0.8})`);
    g4.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g4;
    ctx.fillRect(W - th, 0, th, H);
  }

  if (G.warn <= 0) return;
  const t = 1 - G.warn / 2.6;            // 0 → 1
  const fade = G.warn > 2.1 ? (2.6 - G.warn) / 0.5 : Math.min(1, G.warn / 0.7);
  const bandH = 54;
  const y = H * 0.28;
  ctx.globalAlpha = Math.min(1, fade);
  const bg = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);
  bg.addColorStop(0, 'rgba(30,8,10,0)');
  bg.addColorStop(0.5, 'rgba(38,8,12,0.82)');
  bg.addColorStop(1, 'rgba(30,8,10,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, y - bandH / 2, W, bandH);
  // 上下两条红线往两边拉开，制造「撕开」的感觉
  ctx.strokeStyle = 'rgba(255,90,75,0.85)';
  ctx.lineWidth = 2;
  const grow = Math.min(1, t / 0.35);
  const half = (W / 2) * grow;
  ctx.beginPath(); ctx.moveTo(W / 2 - half, y - bandH / 2 + 4); ctx.lineTo(W / 2 + half, y - bandH / 2 + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 - half, y + bandH / 2 - 4); ctx.lineTo(W / 2 + half, y + bandH / 2 - 4); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.min(26, W * 0.062);
  ctx.font = `800 ${size}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(20,4,6,0.9)';
  const label = `⚠ 强敌降临 · ${G.warnName || ''}`;
  ctx.strokeText(label, W / 2, y);
  ctx.fillStyle = '#ff6f5e';
  ctx.fillText(label, W / 2, y);
  ctx.globalAlpha = 1;
}

function drawGround(L, Tp, R, Bp) {
  const idx = G.terrainIdx || 0;
  const cur = TERRAINS[idx] || TERRAINS[0];
  const prev = TERRAINS[idx - 1];
  // 换地形时交叉淡化 1.4 秒：硬切像是画面闪了一下
  if (prev && G.terrainFade > 0) {
    const pa = patternOf(prev);
    if (pa) { ctx.fillStyle = pa; ctx.fillRect(L, Tp, R - L, Bp - Tp); }
    const pb = patternOf(cur);
    if (pb) {
      ctx.globalAlpha = 1 - G.terrainFade;
      ctx.fillStyle = pb;
      ctx.fillRect(L, Tp, R - L, Bp - Tp);
      ctx.globalAlpha = 1;
    }
  } else {
    const p = patternOf(cur);
    if (p) { ctx.fillStyle = p; ctx.fillRect(L, Tp, R - L, Bp - Tp); }
  }
  drawDeco(cur, L, Tp, R, Bp);
}

// 确定性 hash：同一个格子永远算出同一个值。
// 装饰物位置必须由格子坐标推出来，不能用 Math.random —— 否则每帧位置都在跳，
// 地上会是一片闪烁的噪点，而不是「几块石头」。
const hash2 = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function drawDeco(ter, L, Tp, R, Bp) {
  const CS = 140;
  const x0 = Math.floor(L / CS), x1 = Math.floor(R / CS);
  const y0 = Math.floor(Tp / CS), y1 = Math.floor(Bp / CS);
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const n = 1 + (((hash2(gx, gy) * 10) | 0) % 2);
      for (let i = 0; i < n; i++) {
        const h1 = hash2(gx * 37 + i * 11, gy * 53 + i * 7);
        const h2 = hash2(gx * 91 + i * 3, gy * 17 + i * 5);
        const h3 = hash2(gx * 13 + i * 101, gy * 29 + i * 41);
        const kind = ter.deco[((h3 * 10) | 0) % ter.deco.length];
        deco(kind, (gx + 0.14 + h1 * 0.72) * CS, (gy + 0.14 + h2 * 0.72) * CS, h1, h3);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// 地面装饰：每种地貌三样，全部是纯路径绘制（不用图片，零请求）。
// 每种都刻意压得很暗、很淡 —— 它们只是让地面有「走过的地方」的实感，
// 不该抢怪和弹道的注意力。
function deco(kind, x, y, h1, h3) {
  const s = 4 + h1 * 9;
  ctx.globalAlpha = 0.32 + h3 * 0.26;
  switch (kind) {
    case 'rubble': {
      ctx.fillStyle = '#2b3448';
      ctx.beginPath();
      ctx.moveTo(x - s, y + s * 0.5);
      ctx.lineTo(x - s * 0.4, y - s * 0.6);
      ctx.lineTo(x + s * 0.5, y - s * 0.4);
      ctx.lineTo(x + s, y + s * 0.6);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'crack': {
      ctx.strokeStyle = 'rgba(10,13,20,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.6, y - s * 0.5);
      ctx.lineTo(x - s * 0.2, y);
      ctx.lineTo(x + s * 0.7, y - s * 0.8);
      ctx.lineTo(x + s * 1.8, y + s * 0.3);
      ctx.stroke();
      break;
    }
    case 'pebble': {
      ctx.fillStyle = 'rgba(150,165,200,0.55)';
      ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.7, y + s * 0.4, s * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pool': {
      // 沼泽水洼：一潭死水 + 一圈亮边
      ctx.fillStyle = 'rgba(24,52,42,0.9)';
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.9, s * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,200,150,0.20)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'reed': {
      ctx.strokeStyle = 'rgba(110,170,120,0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.5 - s * 0.5, y + s * 0.6);
        ctx.quadraticCurveTo(x + i * s * 0.5, y - s * 0.4, x + i * s * 0.5 + s * 0.3, y - s * 1.1);
        ctx.stroke();
      }
      break;
    }
    case 'snowdrift': {
      ctx.fillStyle = 'rgba(215,232,255,0.16)';
      ctx.beginPath(); ctx.ellipse(x, y, s * 2, s * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'ice': {
      ctx.strokeStyle = 'rgba(190,225,255,0.42)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.55, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.55, y);
      ctx.closePath(); ctx.stroke();
      break;
    }
    case 'lava': {
      // 熔岩裂缝：靠自身发光，所以用 lighter 而不是普通描边
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,120,50,${0.16 + h3 * 0.16})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.7, y + s * 0.4);
      ctx.lineTo(x - s * 0.5, y - s * 0.3);
      ctx.lineTo(x + s * 0.4, y + s * 0.3);
      ctx.lineTo(x + s * 1.7, y - s * 0.4);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'star': {
      ctx.fillStyle = 'rgba(200,180,255,0.5)';
      ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= 0.4;
      ctx.beginPath(); ctx.arc(x + s * 1.3, y - s * 0.7, s * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rune': {
      ctx.strokeStyle = 'rgba(175,145,245,0.35)';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4);
      ctx.beginPath(); ctx.moveTo(x - s * 0.7, y); ctx.lineTo(x + s * 0.7, y); ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.globalAlpha = 1;
}

function drawPlayer() {
  const P = G.player;
  const c = G.char;
  if (!c) return;
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(P.x, P.y + 16, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 脚下的呼吸光环 —— 暗色背景里最容易跟丢自己，这圈光就是定位锚
  const pulse = 0.5 + Math.sin(G.t * 2.6) * 0.1;
  const grd = ctx.createRadialGradient(P.x, P.y, 6, P.x, P.y, 46);
  grd.addColorStop(0, 'rgba(110,168,255,0.28)');
  grd.addColorStop(0.6, 'rgba(110,168,255,0.07)');
  grd.addColorStop(1, 'rgba(110,168,255,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(P.x, P.y, 46, 0, Math.PI * 2); ctx.fill();

  // 头像（圆形裁切）
  const size = 52;
  ctx.save();
  ctx.beginPath(); ctx.arc(P.x, P.y, size / 2, 0, Math.PI * 2); ctx.clip();
  frame(c.img, P.x, P.y, size, 1, false);
  ctx.restore();
  // 外圈
  ctx.strokeStyle = P.inv > 0 && Math.sin(G.t * 40) > 0 ? 'rgba(255,255,255,0.95)' : `rgba(140,190,255,${pulse + 0.35})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 1, 0, Math.PI * 2); ctx.stroke();

  // 朝向小箭头
  ctx.fillStyle = 'rgba(190,220,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(P.x + P.face * (size / 2 + 7), P.y);
  ctx.lineTo(P.x + P.face * (size / 2 + 1), P.y - 4.5);
  ctx.lineTo(P.x + P.face * (size / 2 + 1), P.y + 4.5);
  ctx.closePath();
  ctx.fill();

  // 护盾
  if (P.shield > 0) {
    ctx.strokeStyle = `rgba(110,168,255,${0.35 + Math.min(0.45, P.shield / 90)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 6, 0, Math.PI * 2); ctx.stroke();
  }

  // 狂气爆发：一圈翻涌的红环，比任何 UI 条都直观
  if (G.rageT > 0) {
    const t = G.t * 8;
    ctx.strokeStyle = `rgba(255,110,70,${(0.35 + Math.sin(t) * 0.16).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 10 + Math.sin(t * 0.7) * 3, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawEnemies(L, R, T, B) {
  for (const e of G.enemies) {
    if (e.x < L || e.x > R || e.y < T || e.y > B) continue;
    // 扑击：咬下去的瞬间整只怪往前顶一下，看得出「它在打你」而不是贴着蹭
    const lunge = e.lungeT > 0 ? 1 + (e.lungeT / 0.3) * 0.22 : 1;
    const sz = e.r * 2.3 * lunge;
    const bob = Math.sin(e.wob) * 2;
    if (shadow) ctx.drawImage(shadow, e.x - e.r * 1.05, e.y + e.r * 0.58, e.r * 2.1, e.r * 0.9);
    // 一圈浅色描边：怪物立绘本身是深色剪影，压在深色地格上会糊成一团
    ctx.strokeStyle = e.tier === 2 ? 'rgba(255,150,140,0.30)' : e.tier === 1 ? 'rgba(255,215,130,0.26)' : 'rgba(190,200,230,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.98, 0, Math.PI * 2); ctx.stroke();
    const gs = e.r * 2.9;
    const sp = glow[e.tier] || glow[0];
    if (sp) ctx.drawImage(sp, e.x - gs / 2, e.y + bob - gs / 2, gs, gs);
    frame(e.img, e.x, e.y + bob, sz, 1, false);
    if (e.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, e.flash * 5)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 被封印：脚下压一圈方印 + 两道竖线，表示「它现在动不了」。
    // 定身是玩家最需要反馈的状态（打不动就白打），所以画得比迟滞更硬。
    if (e.bindT > 0) {
      ctx.strokeStyle = 'rgba(154,167,255,0.85)';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(e.x - e.r * 0.9, e.y + e.r * 0.5, e.r * 1.8, e.r * 0.34);
      ctx.beginPath();
      ctx.moveTo(e.x - e.r * 0.55, e.y - e.r * 0.9); ctx.lineTo(e.x + e.r * 0.55, e.y + e.r * 0.5);
      ctx.moveTo(e.x + e.r * 0.55, e.y - e.r * 0.9); ctx.lineTo(e.x - e.r * 0.55, e.y + e.r * 0.5);
      ctx.stroke();
    } else if (e.slowT > 0) {
      // 迟滞：脚下一圈雾，颜色跟着减速强度走，玩家能看出「柱子还压着它」
      ctx.strokeStyle = `rgba(180,220,255,${0.18 + (1 - (e.slowMul || 1)) * 0.5})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.62, e.r * 0.95, e.r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 攻击前摇：0.28 秒里一圈红环由外向内收拢，收到身上就是它咬下来的瞬间。
    // 这是「能躲」的前提 —— 没有前摇的贴身伤害只能挨着。
    if (e.windT > 0) {
      const k = 1 - e.windT / 0.28;
      ctx.strokeStyle = `rgba(255,92,80,${0.30 + k * 0.55})`;
      ctx.lineWidth = 1.4 + k * 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * (1.95 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    // 首领冲刺预警：0.6 秒里红环由细到粗，玩家能提前横移。场上首领最多三只，
    // 这点开销可以忽略。
    if (e.windup > 0) {
      ctx.strokeStyle = `rgba(255,96,86,${0.25 + e.windup * 0.6})`;
      ctx.lineWidth = 2 + e.windup * 3;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * (1.05 + e.windup * 0.35), 0, Math.PI * 2); ctx.stroke();
    }
    if (e.tier > 0) drawHpBar(e);
  }
}

function drawHpBar(e) {
  const w = e.r * 2.1;
  const hp = Math.max(0, e.hp / e.maxHp);
  const y = e.y - e.r * 1.3 - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(e.x - w / 2, y, w, 4);
  ctx.fillStyle = e.tier === 2 ? '#e8695f' : '#e3b341';
  ctx.fillRect(e.x - w / 2, y, w * hp, 4);
}

function drawBullets(L, R, T, B) {
  for (const b of G.bullets) {
    if (b.kind === 'ray') {
      const a = Math.atan2(b.vy, b.vx);
      const tail = 30;
      const x0 = b.x - Math.cos(a) * tail, y0 = b.y - Math.sin(a) * tail;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = b.w * 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(2, b.w * 0.35);
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x, b.y); ctx.stroke();
      // 射线头部一小团光 —— 不给的话高速射线看起来像一根断掉的棍子
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.w * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (b.x < L || b.x > R || b.y < T || b.y > B) continue;
    const spin = b.spin || 0;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(spin);
    if (b.kind === 'boomerang') {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0.4, Math.PI - 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, b.r, Math.PI + 0.4, Math.PI * 2 - 0.4);
      ctx.stroke();
    } else if (b.kind === 'missile') {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.r * 1.5, 0);
      ctx.lineTo(-b.r, b.r * 0.7);
      ctx.lineTo(-b.r, -b.r * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (b.kind === 'saw') {
      // 锯轮：八齿外环 + 亮心，靠旋转表现「在切」
      ctx.fillStyle = b.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.lineTo(Math.cos(a) * b.r * 1.5, Math.sin(a) * b.r * 1.5);
        ctx.lineTo(Math.cos(a + Math.PI / 8) * b.r * 0.86, Math.sin(a + Math.PI / 8) * b.r * 0.86);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.34, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'bolt') {
      // 单发弹拉成橄榄形：朝向已经跟着速度走，看起来是「射出去」而不是「飘着」
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 2.7, b.r * 1.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.55, b.r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.ellipse(b.r * 0.4, 0, b.r * 0.72, b.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 外层柔光 + 内芯，成本比 shadowBlur 低得多
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(0, 0, b.r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawOrbs() {
  const P = G.player;
  for (const o of G.orbs) {
    const cfg = o.w.orb;
    if (!cfg) continue;
    for (let i = 0; i < cfg.n; i++) {
      const a = o.a + (Math.PI * 2 * i) / cfg.n;
      const x = P.x + Math.cos(a) * cfg.r;
      const y = P.y + Math.sin(a) * cfg.r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = cfg.color;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawSummons() {
  for (const s of G.summons) {
    // 图腾是站桩的：画成方尖碑，不再套用会追人的随从外观
    if (s.static) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 13, 10, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 17); ctx.lineTo(s.x + 9, s.y - 4);
      ctx.lineTo(s.x + 6, s.y + 12); ctx.lineTo(s.x - 6, s.y + 12);
      ctx.lineTo(s.x - 9, s.y - 4);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // 顶端的电弧点在闪，表示它在工作
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + Math.sin(G.t * 9 + s.spin) * 0.4).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y - 8, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.range ? 15 : 13, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 12, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.clip();
    frame(s.img, s.x, s.y, 24, 0.95, false);
    ctx.restore();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawFields(L, R, T, B) {
  for (const f of G.fields) {
    if (f.x < L || f.x > R || f.y < T || f.y > B) continue;
    const t = f.delay > 0 ? f.delay / 0.45 : 1;
    // 地雷只有一个小圆点，不画领域那种大圆盘 —— 否则满地的「领域」看起来像踩在彩纸上
    // 审判柱与长明灯同理：它们各自有更像样的画法（光柱 / 灯晕），
    // 底下再糊一层大圆盘会把整片战场压成一片黄。
    if (!f.arm && !f.lamp && !(f.pillar && f.delay <= 0)) {
      ctx.globalAlpha = f.delay > 0 ? 0.35 + Math.sin(G.t * 40) * 0.15 : Math.min(0.5, f.life / f.max) * 0.55;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (f.delay > 0 ? (1.15 - t * 0.15) : 1), 0, Math.PI * 2); ctx.fill();
      if (f.delay > 0) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // 涡流：两圈反向旋转的弧，让「中心在拽东西」这件事一眼看得出来
    if (f.pull > 0) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = f.color;
      for (let k = 0; k < 2; k++) {
        const a0 = G.t * (k ? -2.2 : 2.6) + k * Math.PI;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.55 + k * 0.28), a0, a0 + 1.7); ctx.stroke();
      }
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    // 地雷：小圆点 + 引信闪烁，敌人靠近时才亮起来
    if (f.arm) {
      const warn = f.life < 4 ? 0.5 + Math.sin(G.t * 12) * 0.5 : 0.4;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.55 + warn * 0.4;
      ctx.beginPath(); ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // 悬空预警（陨石 / 光雨）：地面画一圈收缩的靶环，提示「马上砸这里」
    if (f.delay > 0 && (f.sky || f.pillar)) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 + t * 0.1), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(f.x - 8, f.y); ctx.lineTo(f.x + 8, f.y);
      ctx.moveTo(f.x, f.y - 8); ctx.lineTo(f.x, f.y + 8); ctx.stroke();
    }
    // 审判柱：不是「地上一个圈」，而是一根从天上钉下来的光柱 ——
    // 圈只说明范围，柱子才说明「这里站着会死」。
    if (f.pillar && f.delay <= 0) {
      const g = ctx.createLinearGradient(f.x, f.y - 320, f.x, f.y + 12);
      g.addColorStop(0, 'rgba(255,215,106,0)');
      g.addColorStop(0.55, 'rgba(255,215,106,0.16)');
      g.addColorStop(1, 'rgba(255,215,106,0.42)');
      ctx.globalAlpha = Math.min(1, f.life / f.max) * 0.9;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(f.x - f.r * 0.34, f.y + 8);
      ctx.lineTo(f.x - f.r * 0.6, f.y - 320);
      ctx.lineTo(f.x + f.r * 0.6, f.y - 320);
      ctx.lineTo(f.x + f.r * 0.34, f.y + 8);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.9, f.r * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 长明灯：暖色光晕 + 灯芯。灯光是威廉唯一的安全区，要一眼看得见边界。
    if (f.lamp) {
      const pulse = 0.85 + Math.sin(G.t * 3) * 0.15;
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * pulse);
      rg.addColorStop(0, 'rgba(255,233,168,0.5)');
      rg.addColorStop(0.7, 'rgba(255,196,110,0.16)');
      rg.addColorStop(1, 'rgba(255,196,110,0)');
      ctx.globalAlpha = Math.min(1, f.life / f.max);
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(f.x, f.y - 2, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,40,.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(f.x, f.y + 2); ctx.lineTo(f.x, f.y + 10); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawPickups(L, R, T, B) {
  for (const p of G.pickups) {
    if (p.x < L || p.x > R || p.y < T || p.y > B) continue;
    const bob = Math.sin(p.bob) * 2.5;
    if (p.kind === 'exp') {
      const s = 7 + Math.sin(p.bob * 1.6) * 0.8;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#6fe3ff';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, s * 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#bff4ff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bob - s); ctx.lineTo(p.x + s * 0.72, p.y + bob);
      ctx.lineTo(p.x, p.y + bob + s); ctx.lineTo(p.x - s * 0.72, p.y + bob);
      ctx.closePath(); ctx.fill();
    } else if (p.kind === 'heal') {
      // 治疗结晶：绿色六边形 + 十字，外面套一圈脉动光晕。
      // 血量见底时玩家是冲着它跑的，必须一眼能认出来 —— 原来只是个绿圆点，
      // 混在几十颗经验结晶里根本找不到。
      const pulse = 0.5 + Math.sin(p.bob * 2) * 0.5;
      ctx.globalAlpha = 0.16 + pulse * 0.18;
      ctx.fillStyle = '#5fe08a';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 17 + pulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7de3a0';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
        const r = 10;
        if (k) ctx.lineTo(p.x + Math.cos(a) * r, p.y + bob + Math.sin(a) * r);
        else ctx.moveTo(p.x + Math.cos(a) * r, p.y + bob + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0c2016';
      ctx.fillRect(p.x - 1.6, p.y + bob - 4.6, 3.2, 9.2);
      ctx.fillRect(p.x - 4.6, p.y + bob - 1.6, 9.2, 3.2);
    } else if (p.kind === 'rage') {
      // 狂气球：橙色火焰形，同样带脉动光晕
      const pulse = 0.5 + Math.sin(p.bob * 2.2) * 0.5;
      ctx.globalAlpha = 0.15 + pulse * 0.17;
      ctx.fillStyle = '#ff9350';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 16 + pulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff9350';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bob - 11);
      ctx.quadraticCurveTo(p.x + 7, p.y + bob - 2, p.x + 4, p.y + bob + 6);
      ctx.quadraticCurveTo(p.x, p.y + bob + 10, p.x - 4, p.y + bob + 6);
      ctx.quadraticCurveTo(p.x - 7, p.y + bob - 2, p.x, p.y + bob - 11);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,236,196,0.88)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + bob + 3, 2.6, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 宝箱 / 命轮：金色宝箱，脉动光圈提示「这块一定要捡」
      const r = p.kind === 'wheel' ? 15 : 12;
      ctx.globalAlpha = 0.25 + Math.sin(G.t * 4) * 0.12;
      ctx.fillStyle = p.kind === 'wheel' ? '#ffe066' : '#e3b341';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.kind === 'wheel' ? '#ffe9a8' : '#d8b26a';
      ctx.fillRect(p.x - r, p.y + bob - r * 0.75, r * 2, r * 1.5);
      ctx.fillStyle = 'rgba(30,24,12,0.85)';
      ctx.fillRect(p.x - r, p.y + bob - 1.6, r * 2, 3.2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFx() {
  for (const f of G.fx) {
    const a = Math.max(0, f.life / f.max);
    if (f.kind === 'ring') {
      const t = 1 - a;
      const rr = f.ring * (0.35 + t * 0.75);
      // 内层填充 + 主环 + 一道淡余波：只描一圈细线时，几百个弹道里看不出是「爆炸」
      ctx.globalAlpha = a * 0.11;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * 0.5;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.6 * a + 0.6;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.2;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr * 1.07, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'line') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else if (f.kind === 'claw') {
      // 三道爪痕，带方向 —— 玩家一眼能看出「从哪边抓过来的」
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 9, 0, 15, -0.95, 0.95);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + a * 0.8), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of G.texts) {
    const a = Math.min(1, t.life * 2.4);
    const big = t.kind === 1 || t.kind === 2 || t.kind === 4 || t.kind === 6;
    ctx.globalAlpha = a;
    ctx.font = `${big ? 700 : 600} ${big ? 15 : t.kind === 5 ? 13 : 12}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = t.kind === 1 ? '#ffd479'
      : t.kind === 2 ? '#8ce0a8'
        : t.kind === 3 ? '#ff7b72'
          : t.kind === 4 ? '#ff9350'
            : t.kind === 5 ? '#9fc4ff'
              : t.kind === 6 ? '#ffe9a8'
                : '#e6e9f0';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6,9,14,0.85)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// 暗角：预渲染一次，别每帧重建渐变（全屏渐变填充在软件渲染下很贵）
function vignette(W, H) {
  if (!vignette.cache || vignette.cache.w !== W || vignette.cache.h !== H) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * 0.5));
    c.height = Math.max(1, Math.round(H * 0.5));
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.32,
      c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.78);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    vignette.cache = { w: W, h: H, c };
  }
  ctx.drawImage(vignette.cache.c, 0, 0, W, H);
}
return { init, resize, draw };
})();

// ---- js/sv/ui.js
const m_ui = await (async () => {
const { G, applyChoice, skipChoice, summary, remaining, useItem, rollChoices } = m_engine;
const { CHARS, WEAPONS, META, ATLAS, CREATIONS, WHEELS, COVENANTS } = m_gen;
const { PROTOS, LV, WHEEL_FX, COVENANT_FX, CREATION_FX, DIFFS, RAGE, EVOS, creditsAt, nextTier, MECHS, GROWTHS } = m_defs;
const { isUnlocked, unlockNeed, unlockProg, svProgress, recordRun, unlockedByRun } = m_unlock;
// 《唤醒体幸存者》界面层：选人、HUD、升级三选一、暂停与结算。
//
// 界面全部是叠在 canvas 上的 DOM —— 文字排版、滚动列表、按钮反馈交给浏览器
// 比自己画省事得多，也自动适配中文换行。只有真正每帧变化的东西（血条、
// 经验条、计时）才走这里的高频更新，而且都做了「值没变就不动 DOM」的判断。
//
// 图标不额外请求：全部按格位从图集里用 background-position 切出来。






const ATLAS_URI = ATLAS;

const $ = (id) => document.getElementById(id);

const ui = {
  diff: 'normal',
  charId: null,
  onChoice: null,
  onRestart: null,
  onRage: null,
  last: {},
};

// ---------------------------------------------------------------- 图集取图
function atlasStyle(idx, size) {
  // 没有立绘的唤醒体（四位神秘唤醒体）走剪影：一块深色渐变圆，
  // 没有细节、没有配色，只留一个轮廓。这是「它是谁你得自己打出来」的一部分。
  if (idx == null) {
    // 三层叠出一个「有个人站在那儿」的剪影：头、肩、底光。
    // 只画一块纯黑方块的话，四位神秘人看起来像四个占位符。
    return [
      'background:',
      'radial-gradient(34% 32% at 50% 34%, #46516b 0%, #333c50 62%, transparent 74%),',
      'radial-gradient(50% 38% at 50% 98%, #3b4560 0%, #2a3345 60%, transparent 76%),',
      'radial-gradient(76% 76% at 50% 42%, #1a202b 0%, #0c0f16 100%);',
      'box-shadow:inset 0 0 0 1px rgba(150,170,210,.2), inset 0 -6px 12px rgba(0,0,0,.6);',
      `width:${size}px;height:${size}px;`,
    ].join('');
  }
  const col = idx % META.cols;
  const row = (idx / META.cols) | 0;
  const scale = size / META.cell;
  return [
    `background-image:url(${ATLAS_URI});`,
    `background-size:${META.w * scale}px ${META.h * scale}px;`,
    `background-position:${-col * size}px ${-row * size}px;`,
    `width:${size}px;height:${size}px;`,
  ].join('');
}
// ATLAS 是 data URI，直接拼进 style 会让字符串比较变慢，单独取出引用

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REALM_CLASS = { 混沌: 'r-chaos', 血肉: 'r-caro', 深海: 'r-aequor', 超维: 'r-ultra' };

// ---------------------------------------------------------------- 选人
function showPick() {
  const ov = $('ovPick');
  ov.hidden = false;
  $('ovUp').hidden = true;
  $('ovEnd').hidden = true;
  const sw = $('ovSwap');
  if (sw) sw.hidden = true;

  const list = $('charList');
  // 每次打开都重建：解锁状态会在结算后变化，缓存 DOM 会出现「已经解锁了
  // 但列表里还是剪影」的错觉。66 个按钮重建一次是毫秒级的，不值得为它做脏检查。
  list.innerHTML = CHARS.map((c) => {
    const locked = c.lock && !isUnlocked(c.lock);
    const cls = ['' , REALM_CLASS[c.realm] || ''];
    if (c.lock) cls.push('hidden-one');
    if (locked) cls.push('locked');
    const label = locked ? '???' : c.n;
    const tip = locked ? `${c.n} · 未解锁` : c.n;
    return `
      <button class="ch${cls.join(' ')}" data-id="${c.id}" title="${esc(tip)}">
        <i style="${atlasStyle(locked || c.img == null ? null : c.img, 54)}"></i>
        ${locked ? '<em class="lkb">锁</em>' : (c.lock ? '<em class="lkb open">✦</em>' : '')}
        <b>${esc(label)}</b>
      </button>`;
  }).join('');
  list.dataset.built = '1';

  const diffBox = $('diffBox');
  diffBox.innerHTML = DIFFS.map((d) => `<button data-k="${d.k}" class="${d.k === ui.diff ? 'on' : ''}">${d.n}</button>`).join('');
  $('diffTip').textContent = DIFFS.find((d) => d.k === ui.diff).tip;

  diffBox.onclick = (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    ui.diff = b.dataset.k;
    [...diffBox.children].forEach((x) => x.classList.toggle('on', x.dataset.k === ui.diff));
    $('diffTip').textContent = DIFFS.find((d) => d.k === ui.diff).tip;
  };

  list.onclick = (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    ui.charId = b.dataset.id;
    [...list.children].forEach((x) => x.classList.toggle('on', x.dataset.id === ui.charId));
    renderCharInfo();
  };

  if (!ui.charId) {
    ui.charId = CHARS[0].id;
    [...list.children].forEach((x) => x.classList.toggle('on', x.dataset.id === ui.charId));
  }
  renderCharInfo();
}

function renderCharInfo() {
  const c = CHARS.find((x) => x.id === ui.charId);
  if (!c) return;
  const locked = c.lock && !isUnlocked(c.lock);
  const mech = MECHS[c.id];
  const realmFx = {
    混沌: '暴击率 +8%，暴击伤害 +30%',
    血肉: '伤害的 3% 转为治疗，攻击力 +10%',
    深海: '受伤 -8%，每秒回复 0.6 生命',
    超维: '冷却 -10%，作用范围 +10%',
  }[c.realm];
  const roleFx = { 伤害型: '攻击力 +8%', 防御型: '最大生命 +25', 辅助型: '经验获取 +12%' }[c.role];
  // 未解锁时不剧透技能：只给剪影、名字和条件。名字本身是钩子，
  // 技能与机制留到解锁后自己看，才值得为它打那十把。
  const ws = (locked ? [] : c.weapons).map((w, i) => `
    <div class="wi">
      <span class="pk">${i === 0 ? '初始' : '可抽'}</span>
      <b>${esc(w.n)}</b>
      <em>${PROTOS[w.proto] ? PROTOS[w.proto].name : ''}</em>
    </div>`).join('');
  const lockBox = locked ? `
    <div class="ci-lock">
      <b>未解锁</b>
      <p>${esc(unlockNeed(c.lock))}</p>
      <u>进度 ${esc(unlockProg(c.lock))}</u>
    </div>` : '';
  const mechBox = mech && !locked ? `
    <p class="ci-mech"><b>机制 · ${esc(mech.n)}</b>${esc(mech.text)}</p>` : '';
  // 档案：解锁前连人都不给看，解锁后才亮出来 —— 和技能同一套逻辑。
  // 出处单独标在底部，别让「这是官方设定」和「这是我们编的」混在一起。
  const bioBox = !locked && c.bio ? `
    <div class="ci-bio"><b>档案</b><span>${esc(c.bio)}</span>${c.bioSrc ? `<u>出处 · ${esc(c.bioSrc)}</u>` : ''}</div>` : '';
  $('charInfo').innerHTML = `
    <div class="ci-top">
      <i class="ci-portrait${locked || c.img == null ? ' sil' : ''}" style="${atlasStyle(locked ? null : c.img, 72)}"></i>
      <div>
        <h3>${locked ? '???' : esc(c.n)} <small>${locked ? '未解锁' : esc(c.en)}</small></h3>
        <p class="ci-tags">
          <span class="tg ${REALM_CLASS[c.realm] || ''}">${esc(c.realm)}</span>
          <span class="tg">${esc(c.role)}</span>
          <span class="tg">${esc(c.rarity)}</span>
          ${!locked && c.kind ? `<span class="tg kind">${esc(c.kind)}</span>` : ''}
        </p>
        <p class="ci-line"><b>界域</b>${realmFx}</p>
        <p class="ci-line"><b>定位</b>${roleFx}</p>
      </div>
    </div>
    ${lockBox}
    ${mechBox}
    <p class="ci-talent"><b>天赋 · ${esc(c.talent)}</b>${esc(c.talentText || '')}</p>
    ${bioBox}
    <div class="ci-w">${ws}</div>`;
}

// ---------------------------------------------------------------- HUD
function buildHUD() {
  $('hud').innerHTML = `
    <div class="hud-top">
      <div class="hud-time"><b id="hTime">15:00</b><span id="hKill">0 击杀</span></div>
      <div class="hud-lv"><span>Lv.<b id="hLv">1</b></span><div class="xp"><i id="hXp"></i></div></div>
      <button class="hud-pause" id="hPause" title="暂停">❚❚</button>
    </div>
    <div class="hud-bars">
      <div class="bar hp"><i id="hHp"></i><em id="hHpTxt">100 / 100</em></div>
      <div class="bar sh" id="hShBox" hidden><i id="hSh"></i></div>
      <div class="ragebox" id="hRageBox">
        <div class="bar rage" id="hRageBar"><i id="hRage"></i><em id="hRageTxt">狂气 0</em></div>
        <button class="ragebtn" id="btnRage" title="狂气爆发（空格）" disabled>狂</button>
      </div>
    </div>
    <div class="hud-weapons" id="hWeapons"></div>
    <div class="hud-passives" id="hPassives"></div>
    <div class="hud-items" id="hItems" hidden></div>
    <div class="mechchip" id="hMech" hidden></div>
    <div class="bossbar" id="hBoss" hidden><span id="hBossName"></span><i><b id="hBossFill"></b></i></div>`;
  $('hPause').onclick = () => togglePause();
  $('btnRage').onclick = () => { if (ui.onRage) ui.onRage(); };
  // 点技能/造物/命轮 → 弹出构筑详情（会顺带暂停，否则一边看面板一边挨打）
  $('hWeapons').onclick = (e) => { if (e.target.closest('[data-info]')) openInfo(); };
  $('hPassives').onclick = (e) => { if (e.target.closest('[data-info]')) openInfo(); };
  // 道具是「点了就用」，没有二次确认：危急时刻多一步确认等于没有这个道具
  $('hItems').onclick = (e) => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    if (useItem(b.dataset.use)) hudCache.ikey = '';
  };
  const ic = $('btnInfoClose');
  if (ic) ic.onclick = closeInfo;
}

// ---------------------------------------------------------------- 构筑详情
// 一块面板把「我到底拿了什么、每个东西在干什么」列全。
// 战斗中随时可开（自动暂停），关掉继续打。
let infoPaused = false;

function openInfo() {
  const ov = $('ovInfo');
  if (!ov) return;
  infoPaused = G.phase === 'run';
  if (infoPaused) G.phase = 'pause';
  $('infoBody').innerHTML = buildInfo();
  ov.hidden = false;
}

function closeInfo() {
  const ov = $('ovInfo');
  if (!ov) return;
  ov.hidden = true;
  $('ovPause').hidden = true;
  if (infoPaused) { infoPaused = false; G.phase = 'run'; }
}

// 「这把技能的超武还差什么」：按 engine 相同的判定顺序（专武在前、通用原型在后）
// 找到第一个还没满足的条目，把条件翻译成人话。
function evoNeedText(w) {
  const list = EVOS.filter((e) => (e.char ? String(e.char) === String(w.def.char) : e.proto === w.def.proto));
  const next = list.find((e) => !w.evo || e.id !== w.evo.id);
  if (!next) return '';
  const n = next.need || {};
  const parts = [];
  if (n.level != null) parts.push(`这把技能升到 ${n.level + 1} 级`);
  if (n.creation) {
    const fx = CREATION_FX[n.creation.fx];
    parts.push(`${fx ? fx.txt.split('，')[0] : n.creation.fx} ×${n.creation.n} 层`);
  }
  if (n.wheel) {
    const wl = WHEEL_FX.find((x) => x.key === n.wheel);
    parts.push(`命轮「${wl ? wl.txt : n.wheel}」`);
  }
  if (n.proto) parts.push(`同时持有 ${n.proto} 类技能`);
  return `超武「${esc(next.n)}」：需要 ${esc(parts.join(' + ') || '未知条件')}`;
}

function buildInfo() {
  const ws = G.weapons.map((x) => {
    const proto = PROTOS[x.def.proto];
    const ev = x.evo ? x.evo.fx : null;
    const cd = proto ? proto.cd * LV.cd(x.lv) * G.mods.cd * (ev && ev.cd ? ev.cd : 1) : 0;
    const dmg = proto ? proto.dmg * LV.dmg(x.lv) * G.mods.atk * G.mods.dmgMul * (ev && ev.dmg ? 1 + ev.dmg : 1) : 0;
    // 没觉醒的武器给出「还差什么」—— 不给线索的话，玩家根本不知道有超武这回事
    const hint = x.evo ? '' : evoNeedText(x);
    return `<div class="if-row${x.evo ? ' has-evo' : ''}">
      <i style="${atlasStyle(charFrame(x.def.char), 34)}"></i>
      <div>
        <b>${esc(x.def.n)} <em>Lv.${x.lv + 1}</em>${x.evo ? `<em class="evo-tag">超武 · ${esc(x.evo.n)}</em>` : ''}</b>
        <span>${esc(x.def.charName)} · ${proto ? proto.name : ''} · 单发约 ${Math.round(dmg)} · 每 ${cd.toFixed(2)} 秒</span>
        <u>${esc(proto ? proto.desc(x.lv) : '')}</u>
        ${x.evo ? `<u class="evo-line">${esc(x.evo.txt)}</u>` : hint ? `<u class="evo-need">${hint}</u>` : ''}
      </div></div>`;
  }).join('') || '<p class="dim">还没有技能</p>';

  const ps = G.passives.map((x) => {
    const fx = CREATION_FX[x.fx];
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['k:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)} <em>×${x.stack}</em></b><span>${fx ? fx.txt : '通用强化'}</span></div></div>`;
  }).join('') || '<p class="dim">还没有造物</p>';

  const wheelRows = G.wheels.map((x) => {
    const fx = WHEEL_FX.find((f) => f.key === x.key);
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['w:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)}</b><span>${fx ? fx.txt : ''}</span></div></div>`;
  }).join('');
  const covRows = G.covs.map((x) => {
    const fx = COVENANT_FX.find((f) => f.key === x.key);
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['v:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)}</b><span>${fx ? fx.txt : ''}</span></div></div>`;
  }).join('');

  // 机制：神秘唤醒体的规则条目单独列，不和造物混在一起 ——
  // 它不是「捡到的」，而是「这个人自带」的，位置不同才不会看混。
  const mm = G.char ? MECHS[G.char.id] : null;
  const mechRow = mm ? (() => {
    let now = '';
    if (mm.id === 'royalty') now = `当前 ${G.mech.stacks}/25 层`;
    else if (mm.id === 'seal') now = `当前 ${G.mech.stacks}/5 道`;
    else if (mm.id === 'paradox') now = '已生效';
    else if (mm.id === 'nightwatch') now = G.mech.low ? '燃灯中' : '待触发';
    return `<div class="if-row mech">
      <i class="if-glyph" style="color:${mm.color}">◈</i>
      <div><b>${esc(mm.n)} <em>${esc(now)}</em></b><span>${esc(mm.text)}</span></div></div>`;
  })() : '';

  const growRows = G.growth.length ? G.growth.reduce((acc, g) => {
    const hit = acc.find((x) => x.id === g.id);
    if (hit) hit.n++;
    else acc.push({ id: g.id, n: 1, name: g.n, icon: g.icon, fx: g.fx });
    return acc;
  }, []).map((g) => `<div class="if-row sm">
      <i class="if-glyph" style="color:#ffd479">${g.icon}</i>
      <div><b>${esc(g.name)} <em>×${g.n}</em></b><span>${esc((GROWTHS.find((x) => x.id === g.id) || {}).txt || '')}</span></div></div>`).join('') : '';

  const itemRows = G.items.map((it) => `<div class="if-row sm">
      <i class="if-glyph" style="color:${it.color}">${it.icon}</i>
      <div><b>${esc(it.n)}</b><span>${esc(it.txt)}</span></div></div>`).join('');

  return `
    ${mechRow ? `<h3 class="if-h">机制</h3>${mechRow}` : ''}
    <h3 class="if-h">技能 · ${G.weapons.length}/6</h3>${ws}
    <h3 class="if-h">命轮 · ${G.wheels.length}</h3>${wheelRows || '<p class="dim">第 3 分钟开始出现</p>'}
    <h3 class="if-h">契物 · ${G.covs.length}</h3>${covRows || '<p class="dim">第 10 分钟后出现</p>'}
    <h3 class="if-h">造物 · ${G.passives.length}/8</h3>${ps}
    ${growRows ? `<h3 class="if-h">极限淬炼 · ${G.growth.length} 次</h3>${growRows}` : ''}
    ${itemRows ? `<h3 class="if-h">道具 · ${G.items.length}/3</h3>${itemRows}` : ''}`;
}

let hudCache = {};
function updateHUD() {
  if (G.phase === 'idle') return;
  const P = G.player;
  const t = Math.ceil(remaining());
  const tm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  if (hudCache.tm !== tm) { hudCache.tm = tm; $('hTime').textContent = tm; }
  if (hudCache.kill !== G.kills) { hudCache.kill = G.kills; $('hKill').textContent = `${G.kills} 击杀`; }
  if (hudCache.lv !== G.lv) { hudCache.lv = G.lv; $('hLv').textContent = G.lv; }
  const xp = Math.max(0, Math.min(1, G.exp / G.expNext));
  if (hudCache.xp == null || Math.abs(hudCache.xp - xp) > 0.008) {
    hudCache.xp = xp; $('hXp').style.width = (xp * 100).toFixed(1) + '%';
  }
  const hp = Math.max(0, Math.min(1, P.hp / P.maxHp));
  if (hudCache.hp == null || Math.abs(hudCache.hp - hp) > 0.004) {
    hudCache.hp = hp; $('hHp').style.width = (hp * 100).toFixed(1) + '%';
    $('hHpTxt').textContent = `${Math.max(0, Math.ceil(P.hp))} / ${P.maxHp}`;
  }
  const shOn = P.shield > 0;
  if (hudCache.shOn !== shOn) { hudCache.shOn = shOn; $('hShBox').hidden = !shOn; }
  if (shOn) {
    const sr = Math.max(0, Math.min(1, P.shield / Math.max(1, P.maxShield)));
    if (hudCache.sh == null || Math.abs(hudCache.sh - sr) > 0.01) {
      hudCache.sh = sr; $('hSh').style.width = (sr * 100).toFixed(1) + '%';
    }
  }
  // ---- 狂气：一条槽 + 一个「狂」按钮。满了按钮才可点，爆发期间显示倒计时。
  const rk = Math.max(0, Math.min(1, G.rage / RAGE.max));
  if (hudCache.rage == null || Math.abs(hudCache.rage - rk) > 0.008) {
    hudCache.rage = rk;
    $('hRage').style.width = (rk * 100).toFixed(1) + '%';
  }
  const rageTxt = G.rageT > 0 ? `狂气爆发 ${G.rageT.toFixed(1)}s` : `狂气 ${Math.floor(G.rage)}`;
  if (hudCache.rageTxt !== rageTxt) { hudCache.rageTxt = rageTxt; $('hRageTxt').textContent = rageTxt; }
  const rOn = G.rageReady || G.rageT > 0;
  const rBurst = G.rageT > 0;
  if (hudCache.rOn !== rOn || hudCache.rBurst !== rBurst) {
    hudCache.rOn = rOn; hudCache.rBurst = rBurst;
    $('hRageBox').classList.toggle('ready', G.rageReady && !rBurst);
    $('hRageBox').classList.toggle('burst', rBurst);
    $('btnRage').disabled = !G.rageReady || rBurst;
  }

  // Boss 血条：场上有强敌时出现在底部，没有就整块收起来
  const boss = G.enemies.find((e) => e.tier === 2);
  if (hudCache.boss !== !!boss) { hudCache.boss = !!boss; $('hBoss').hidden = !boss; }
  if (boss) {
    $('hBossName').textContent = boss.n;
    $('hBossFill').style.width = (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + '%';
  }
  const wkey = G.weapons.map((w) => w.def.id + w.lv + (w.evo ? 'E' : '')).join(',');
  if (hudCache.wkey !== wkey) {
    hudCache.wkey = wkey;
    // 超武的槽要一眼能认出来：金边 + 右上角「超」字角标。
    // 不标的话，玩家只会觉得「这把好像打得比别的疼」，根本不知道有机制。
    $('hWeapons').innerHTML = G.weapons.map((w) => `
      <div class="slot${w.evo ? ' evo' : ''}" data-info="1" title="${esc(w.def.n)} · ${esc(w.def.charName)}${w.evo ? ' · 超武「' + esc(w.evo.n) + '」' : ''}">
        <i style="${atlasStyle(charFrame(w.def.char), 30)}"></i>
        <b class="cdm"></b>
        ${w.evo ? '<em class="evb">超</em>' : ''}
        <span class="pips">${'<b class="on"></b>'.repeat(w.lv + 1)}${'<b></b>'.repeat(LV.max - w.lv)}</span>
      </div>`).join('');
    // 缓存遮罩节点：每帧 querySelector 会让这套 HUD 变成瓶颈
    hudCache.cdEls = [...$('hWeapons').children].map((el) => el.querySelector('.cdm'));
    hudCache.cdK = [];
  }
  // 冷却：一层从上往下收的暗色遮罩，收完就是这一发打出去的瞬间。
  // 只在变化超过 3% 时写 style —— 六个槽每帧无条件写会触发样式重算。
  if (hudCache.cdEls) {
    for (let i = 0; i < hudCache.cdEls.length; i++) {
      const w = G.weapons[i];
      const el = hudCache.cdEls[i];
      if (!w || !el) continue;
      const k = w.cdMax > 0.02 ? Math.max(0, Math.min(1, (w.cdLeft || 0) / w.cdMax)) : 0;
      if (hudCache.cdK[i] == null || Math.abs(hudCache.cdK[i] - k) > 0.03) {
        hudCache.cdK[i] = k;
        el.style.transform = `scaleY(${k.toFixed(2)})`;
      }
    }
  }
  const pkey = G.passives.map((p) => p.id + p.stack).join(',') + '|' + G.wheels.map((w) => w.idx).join(',') + '|' + G.covs.map((c) => c.idx).join(',');
  if (hudCache.pkey !== pkey) {
    hudCache.pkey = pkey;
    // 造物/命轮/契物全部换成真实图标 + 层数角标。
    // 之前造物是几根绿条、命轮只有个「命」字 —— 玩家根本不知道自己捡了什么、
    // 叠了几层、到底加的是什么。点一下会弹出构筑详情（含每条效果的原文）。
    const slot = (frameIdx, cls, title, badge) => `
      <div class="slot ${cls}" data-info="1" title="${esc(title)}">
        <i style="${atlasStyle(frameIdx, 26)}"></i>
        ${badge ? `<em class="stk">${badge}</em>` : ''}
      </div>`;
    const ps = G.passives.map((p) => {
      const fx = CREATION_FX[p.fx];
      return slot(META.frames['k:' + p.id], 'p', `${p.n} ×${p.stack} · ${fx ? fx.txt : '通用强化'}`, p.stack > 1 ? p.stack : '');
    }).join('');
    const ws = G.wheels.map((w) => {
      const fx = WHEEL_FX.find((x) => x.key === w.key);
      return slot(META.frames['w:' + w.id], 'w', `${w.n} · ${fx ? fx.txt : ''}`, '');
    }).join('');
    const cs = G.covs.map((c) => {
      const fx = COVENANT_FX.find((x) => x.key === c.key);
      return slot(META.frames['v:' + c.id], 'c', `${c.n} · ${fx ? fx.txt : ''}`, '');
    }).join('');
    $('hPassives').innerHTML = ws + cs + ps;
  }

  // ---- 道具栏：只在内容变化时重建（点一下用掉一件，key 就变了）
  const ikey = G.items.map((i) => i.id).join(',');
  if (hudCache.ikey !== ikey) {
    hudCache.ikey = ikey;
    const box = $('hItems');
    if (box) {
      box.hidden = G.items.length === 0;
      box.innerHTML = G.items.map((it) => `
        <button class="itm" data-use="${esc(it.id)}" title="${esc(it.n)} · ${esc(it.txt)}" style="--c:${it.color}">
          <b>${it.icon}</b><span>${esc(it.n)}</span>
        </button>`).join('');
    }
  }

  // ---- 机制角标：王权层数 / 封印道数 / 守夜的燃灯状态都在这里
  const mm = G.char ? MECHS[G.char.id] : null;
  let mkey = '';
  if (mm) {
    if (mm.id === 'royalty') mkey = `王权 ${G.mech.stacks}/25`;
    else if (mm.id === 'seal') mkey = `封印 ${G.mech.stacks}/5`;
    else if (mm.id === 'paradox') mkey = '悖论';
    else if (mm.id === 'nightwatch') mkey = G.mech.low ? '守夜 · 燃灯' : '守夜';
  }
  if (hudCache.mkey !== mkey) {
    hudCache.mkey = mkey;
    const el = $('hMech');
    if (el) {
      el.hidden = !mkey;
      el.textContent = mkey;
      el.style.color = mm ? mm.color : '';
      el.style.borderColor = mm ? mm.color + '55' : '';
      el.classList.toggle('hot', mm && mm.id === 'nightwatch' && G.mech.low);
    }
  }
}

function charFrame(id) {
  const c = CHARS.find((x) => x.id === String(id));
  return c ? c.img : null;
}

// ---------------------------------------------------------------- 升级三选一
const KIND_LABEL = {
  wnew: '新技能', wlv: '技能升级', wswap: '替换技能', creation: '造物', wheel: '命轮', cov: '契物',
  growth: '极限淬炼', item: '一次性道具',
};

function showUpgrade(choices) {
  const ov = $('ovUp');
  ov.hidden = false;
  const list = choices || [];
  // 逐张兜底：以前是一整段 map，任何一张卡取图/取文案出错就会让整块 innerHTML
  // 赋值失败，面板只剩标题和提示，既没有卡也点不动（只能刷新页面）。
  const html = [];
  for (let i = 0; i < list.length; i++) {
    try { html.push(upgradeCard(list[i], i)); }
    catch (e) { console.warn('[升级卡] 渲染失败，已跳过', list[i], e); }
  }
  $('upList').innerHTML = html.length
    ? html.join('')
    : '<p class="up-none">技能都满级了、造物也叠满了，这一轮确实没什么可给的</p>';
  // 一张卡都没有的时候还写「键盘 1 / 2 / 3」，玩家会以为是自己没看清
  $('upHint').textContent = html.length
    ? '选一个带走 · 键盘 1 / 2 / 3 · 0 跳过'
    : '按 0 或点下面直接继续';

  $('upList').onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    choose(Number(b.dataset.i));
  };
  $('btnSkipUp').onclick = () => choose(-1);
}

// 一张卡的文案拼装。抽出来是为了单独 try/catch —— 见 showUpgrade 里的说明。
function upgradeCard(o, i) {
  if (o.kind === 'wnew' || o.kind === 'wlv' || o.kind === 'wswap') {
    const isSwap = o.kind === 'wswap';
    const d = o.kind === 'wlv' ? o.w.def : o.def;
    const lv = o.kind === 'wlv' ? o.w.lv + 1 : 0;
    const proto = PROTOS[d.proto];
    const title = o.kind === 'wlv' ? `${d.n} → ${lv + 1} 级` : `${d.n}（${d.charName}）`;
    const desc = proto ? proto.desc(lv) : '';
    // 替换卡是两段式的：点开之后自己指定「换掉哪一把」，
    // 以前固定换等级最低的那把，想把满级但不合流派的技能换掉根本没门路
    const foot = isSwap
      ? '点开后可自选要换掉的技能（新技能从 1 级起）'
      : (d.text || '');
    return card(i, isSwap ? 'wswap' : o.kind === 'wlv' ? 'wlv' : 'wnew', title, desc, foot, atlasStyle(charFrame(d.char), 46), KIND_LABEL[o.kind]);
  }
  if (o.kind === 'creation') {
    const fx = CREATION_FX[o.c.fx];
    const desc = fx ? fx.txt : '通用强化';
    const have = G.passives.find((p) => p.id === String(o.c.id));
    return card(i, 'creation', o.c.n, desc, have ? `已叠 ${have.stack} 层 · 可叠 3 层` : '可叠 3 层', atlasStyle(META.frames['k:' + o.c.id], 46), KIND_LABEL[o.kind]);
  }
  if (o.kind === 'wheel') {
    const fx = WHEEL_FX[o.i % WHEEL_FX.length];
    return card(i, 'wheel', o.w.n, fx ? fx.txt : '命轮质变', '命轮 · 质变', atlasStyle(META.frames['w:' + o.w.id], 46), KIND_LABEL[o.kind]);
  }
  // 后期两条线：淬炼用文字图标（没有对应的图集格位），道具同样走 emoji 图标，
  // 这样不必为几张卡再占图集格位，也不会和已有的造物图标撞脸。
  if (o.kind === 'growth') {
    const n = (G.growth || []).filter((g) => g.id === o.g.id).length;
    return card(i, 'growth', o.g.n, o.g.txt, n ? `已淬炼 ${n} 次 · 可无限叠加` : '永久成长 · 可无限叠加',
      iconStyle('#ffd479'), KIND_LABEL[o.kind], o.g.icon);
  }
  if (o.kind === 'item') {
    return card(i, 'item', o.it.n, o.it.txt, `一次性 · 持有 ${G.items.length}/3`, iconStyle(o.it.color), KIND_LABEL[o.kind], o.it.icon);
  }
  const cfx = COVENANT_FX[o.i % COVENANT_FX.length];
  return card(i, 'cov', o.c.n, cfx ? cfx.txt : '契物强化', '契物 · 唯一', atlasStyle(META.frames['v:' + o.c.id], 46), KIND_LABEL[o.kind]);
}

// 文字图标：和立绘同尺寸的方块，中间放一个符号。宽度/高度必须在这里给全 ——
// 立绘是用 background-size 撑出来的，符号没有内在尺寸，不给就是一块 0px 的空格。
function iconStyle(color) {
  return [
    'display:flex;align-items:center;justify-content:center;',
    `color:${color};font-size:22px;line-height:1;width:46px;height:46px;`,
    `background:radial-gradient(circle at 50% 40%, ${color}33 0%, ${color}0d 62%, transparent 100%);`,
    `box-shadow:inset 0 0 0 1px ${color}55;border-radius:12px;`,
  ].join('');
}

function card(i, tier, title, sub, foot, imgStyle, tag, glyph) {
  return `
    <button class="up ${tier}" data-i="${i}">
      <span class="up-tag">${tag}</span>
      <span class="up-img" style="${imgStyle}">${glyph || ''}</span>
      <span class="up-txt">
        <b>${esc(title)}</b>
        <em>${esc(sub)}</em>
        ${foot ? `<u>${esc(foot)}</u>` : ''}
      </span>
      <span class="up-key">${i + 1}</span>
    </button>`;
}

function choose(i) {
  // i < 0 是「跳过」：不拿任何东西，但同样要消耗掉这次待选次数
  const o = i >= 0 ? G.choices[i] : null;
  if (i >= 0 && !o) return;
  // 替换卡要分两步：先让玩家点「哪一把技能让位」，再真正换上去
  if (o && o.kind === 'wswap') { openSwapPicker(o); return; }
  $('ovUp').hidden = true;
  if (o) applyChoice(o); else skipChoice();
  afterChoice();
}

// 一次选择之后的收尾：要么回到战斗（刷新 HUD），要么接着弹下一屏三选一
function afterChoice() {
  $('ovUp').hidden = true;
  if (G.phase === 'run') hudCache = {};
  else if (G.phase === 'levelup') showUpgrade(G.choices);
}

// ---------------------------------------------------------------- 替换目标选择
// 技能栏满了之后抽到的「替换」卡，点开先弹这一屏：六个技能槽全列出来，
// 显示等级与是否已升格成超武，玩家自己决定让谁下场。
let pendingSwap = null;

function openSwapPicker(o) {
  const ov = $('ovSwap');
  // 面板缺失时不能把玩家卡住：直接按「换等级最低的那把」兜底
  if (!ov) {
    applyChoice({ kind: 'wswap', def: o.def, dropId: null });
    afterChoice();
    return;
  }
  pendingSwap = o;
  $('ovUp').hidden = true;
  $('swapTitle').textContent = `用「${o.def.n}」替换掉哪一个？`;
  $('swapList').innerHTML = G.weapons.map((w, i) => `
    <button class="sw${w.evo ? ' evo' : ''}" data-i="${i}">
      <i style="${atlasStyle(charFrame(w.def.char), 32)}"></i>
      <b>${esc(w.def.n)}</b>
      <em>Lv.${w.lv + 1}</em>
      ${w.evo ? `<u class="evo-tag">超武 · ${esc(w.evo.n)}</u>` : ''}
    </button>`).join('');
  $('swapList').onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    confirmSwap(Number(b.dataset.i));
  };
  $('btnSwapCancel').onclick = closeSwap;
  ov.hidden = false;
}

function confirmSwap(idx) {
  const o = pendingSwap;
  const target = G.weapons[idx];
  if (!o || !target) return;
  pendingSwap = null;
  $('ovSwap').hidden = true;
  applyChoice({ kind: 'wswap', def: o.def, dropId: target.def.id });
  afterChoice();
}

// 键盘 1~6 在替换面板里直接选槽位
function pickSwap(i) {
  const ov = $('ovSwap');
  if (ov && !ov.hidden) confirmSwap(i);
}

// 「算了」/ Esc：关掉替换面板，回到三选一重新挑
function closeSwap() {
  const ov = $('ovSwap');
  if (!ov || ov.hidden) return false;
  ov.hidden = true;
  pendingSwap = null;
  showUpgrade(G.choices);
  return true;
}

// ---------------------------------------------------------------- 暂停 / 结算
function togglePause(force) {
  if (G.phase === 'run' && force !== false) {
    G.phase = 'pause';
    showPause();
  } else if (G.phase === 'pause' && force !== true) {
    G.phase = 'run';
    $('ovPause').hidden = true;
  }
}

function showPause() {
  const ov = $('ovPause');
  ov.hidden = false;
  $('pauseWeapons').innerHTML = G.weapons.map((w) => `
    <div class="pw"><i style="${atlasStyle(charFrame(w.def.char), 34)}"></i>
      <b>${esc(w.def.n)}</b><em>Lv.${w.lv + 1}</em></div>`).join('') || '<p class="dim">还没有技能</p>';
  $('pauseStats').innerHTML = `
    <span>击杀 <b>${G.kills}</b></span><span>等级 <b>${G.lv}</b></span>
    <span>存活 <b>${Math.floor(G.t / 60)}:${String(Math.floor(G.t % 60)).padStart(2, '0')}</b></span>
    <span>造物 <b>${G.passives.length}</b></span>`;
}

function showEnd(sm) {
  const ov = $('ovEnd');
  // 「放弃这局」是从暂停面板点出来的，不关掉它，结算卡就和暂停卡叠在一起；
  // 升级面板同理（极端情况下两者会同时在栈上）。
  $('ovPause').hidden = true;
  $('ovUp').hidden = true;
  ov.hidden = false;
  // 解锁记账：每局结束都要记（输掉的局也累计强敌数），再比对这一次刚好
  // 放出了谁。必须在渲染文案之前做，否则「新解锁」要等下一局才显示。
  const beforeP = svProgress();
  const afterP = recordRun(sm);
  const fresh = unlockedByRun(beforeP, afterP);
  $('endTitle').textContent = sm.win ? '撑到潮水退去' : sm.gaveUp ? '主动收兵' : '倒在了半路';
  const best0 = Number(localStorage.getItem('zjtt:survivors:best') || 0);
  // 不足 1 分钟别写成「第 0 分 04 秒」——刚开局就放弃/阵亡时特别刺眼
  const clock = sm.t >= 60
    ? `${Math.floor(sm.t / 60)} 分 ${String(Math.floor(sm.t % 60)).padStart(2, '0')} 秒`
    : `${Math.max(1, Math.floor(sm.t))} 秒`;
  // 主动收兵不是阵亡：文案要写清楚「战果照常算」，否则玩家会以为这一局白打了
  const sub = sm.win
    ? `15 分钟打满，${sm.char} 活着走了出来`
    : sm.gaveUp
      ? `${sm.char} 在第 ${clock}时主动收兵，战果照常结算`
      : `${sm.char} 在第 ${clock}时力竭`;
  $('endSub').textContent = sm.score > best0 ? `${sub} · 新纪录` : sub;
  const cred = creditsAt(sm.score);
  const nxt = nextTier(sm.score);
  const isBest = sm.score > best0;
  if (isBest) localStorage.setItem('zjtt:survivors:best', String(sm.score));
  $('endStats').innerHTML = `
    <div class="es"><b>${sm.score.toLocaleString()}</b><span>本局得分</span></div>
    <div class="es"><b>${sm.kills}</b><span>击杀</span></div>
    <div class="es"><b>${sm.lv}</b><span>等级</span></div>
    <div class="es"><b>${sm.bossKills}</b><span>强敌</span></div>
    <div class="es"><b>${cred > 0 ? '+' + cred : '—'}</b><span>银芯</span></div>`;
  // 得 0 银芯时别只写「+0」——那句话看不出是「打得太少」还是「奖励没发」。
  // 已入账的一次性说清楚，没够档的直接告诉还差多少。
  $('endTier').textContent = cred > 0
    ? `${cred} 银芯已存入账户${nxt ? ` · 再拿 ${(nxt[0] - sm.score).toLocaleString()} 分可换 ${nxt[1]} 银芯` : ' · 已达最高档'}`
    : nxt
      ? `本局还差 ${(nxt[0] - sm.score).toLocaleString()} 分够到 ${nxt[1]} 银芯（最低档 ${nxt[0].toLocaleString()} 分）`
      : '已达最高档';
  renderDmgBreakdown(sm);
  renderUnlockBox(fresh);
  if (cred > 0) grantCredits(cred);
}

// 结算里的「解锁」区块：平时不占位置（空着就整块收起来），
// 刚好放出神秘唤醒体时才出现 —— 这是长线玩家唯一能立刻拿到的反馈。
function renderUnlockBox(ids) {
  const box = $('endUnlock');
  if (!box) return;
  if (!ids || !ids.length) { box.innerHTML = ''; box.hidden = true; return; }
  box.hidden = false;
  const rows = ids.map((id) => {
    const c = CHARS.find((x) => String(x.id) === String(id));
    if (!c) return '';
    const m = MECHS[c.id];
    return `<div class="ul-row">
      <i style="${atlasStyle(c.img, 40)}"></i>
      <div><b>${esc(c.n)}</b><span>${esc(m ? m.text : c.talentText || '')}</span></div>
    </div>`;
  }).join('');
  box.innerHTML = `<div class="ul-box"><h3>新的神秘人已解锁</h3>${rows}
    <p class="ul-tip">回到选人面板即可选用 · 他们的技能从此会出现在抽取池里</p></div>`;
}

// ---------------------------------------------------------------- 结算伤害明细
// 「每个技能打了多少」是这局唯一能复盘的东西：谁在划水、谁是真主力。
// 条形按「本局最高那把」归一化，不是按占比 —— 占比会让主力条永远接近满格，
// 看不出第二名和第六名的差距。
function renderDmgBreakdown(sm) {
  const box = $('endDmg');
  if (!box) return;
  const ws = sm.weapons || [];
  const max = Math.max(1, ...ws.map((w) => w.dmg), sm.rageDmg || 0);
  const total = sm.totalDmg || 0;
  // 小于 0.5% 直接四舍五入会显示成 0%，看上去像「一点伤害都没打」，
  // 这种情况统一写 <1%，读者才不会误判成辅助技能。
  const pct = (v) => {
    if (total <= 0 || v <= 0) return '0';
    const p = (v / total) * 100;
    return p < 1 ? '<1' : String(Math.round(p));
  };
  const row = (imgHtml, name, sub, dmg, color) => `
    <div class="dmg-row">
      ${imgHtml}
      <div class="dmg-meta"><b>${esc(name)}</b><em>${esc(sub)}</em></div>
      <div class="dmg-bar"><u style="width:${Math.max(2, (dmg / max) * 100).toFixed(1)}%;background:${color}"></u></div>
      <span class="dmg-num">${dmg > 0 ? dmg.toLocaleString() : '—'}<em>${dmg > 0 ? pct(dmg) + '%' : '辅助'}</em></span>
    </div>`;
  const rows = ws.map((w) => row(
    `<i style="${atlasStyle(charFrame(w.charId), 24)}"></i>`,
    w.n + (w.evo ? ' · 超武' : ''), `Lv.${w.lv} · ${w.char}`, w.dmg, w.color,
  )).join('');
  const rageRow = sm.rageDmg > 0
    ? row('<i class="dmg-ico">狂</i>', '狂气爆发', `${sm.rageUsed} 次`, sm.rageDmg, '#ff9350')
    : '';
  box.innerHTML = `
    <h3 class="if-h">技能伤害 · 合计 ${total.toLocaleString()}</h3>
    ${rows || '<p class="dim">这局没有打出伤害</p>'}
    ${rageRow}
    <p class="dmg-sub">共承受 ${(sm.taken || 0).toLocaleString()} 点伤害</p>`;
}

// 银芯走与「合成大杜勒」「战报侦探」同一个钱包键（zjtt:credits）
function grantCredits(n) {
  try {
    const cur = Number(localStorage.getItem('zjtt:credits') || 0) || 0;
    localStorage.setItem('zjtt:credits', String(cur + n));
    document.dispatchEvent(new CustomEvent('zjtt:credits', { detail: { add: n } }));
  } catch { /* 隐私模式 */ }
}
return { ui, atlasStyle, showPick, buildHUD, openInfo, closeInfo, updateHUD, showUpgrade, choose, pickSwap, closeSwap, togglePause, showEnd };
})();

// ---- js/survivors.js
const m_survivors = await (async () => {
const { G, reset, update, summary, setSeed, applyChoice, skipChoice, rollChoices, addWeapon, addCreation, releaseRage, giveUp, recompute, addGrowth, addItem, useItem, gainExp, hurtPlayer } = m_engine;
const { init, resize, draw } = m_render;
const { showPick, showUpgrade, showEnd, buildHUD, updateHUD, choose, togglePause, ui, closeInfo, pickSwap, closeSwap } = m_ui;
const { DIFFS } = m_defs;
const { isUnlocked, unlockNeed, svProgress, saveProgress } = m_unlock;
const { WEAPONS, CHARS } = m_gen;
// 《唤醒体幸存者》入口：装配渲染、输入、主循环。
//
// 固定步长（1/60 秒）推进战斗，渲染跟着屏幕刷新率走。这样高刷屏上角色不会
// 跑得更快，掉帧时也不会瞬移穿过敌人 —— 每帧最多补 6 步，防止切标签页回来
// 一次补上千步直接把自己补死。








const FIXED = 1 / 60;
const cv = document.getElementById('cv');

let acc = 0;
let last = performance.now();
let upShown = false;
let ended = false;

// ---------------------------------------------------------------- 输入
const keys = new Set();
const KEYMAP = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
let stick = null;       // { id, ox, oy, x, y }

function applyInput() {
  let x = 0, y = 0;
  for (const k of keys) {
    const v = KEYMAP[k];
    if (v) { x += v[0]; y += v[1]; }
  }
  if (stick) {
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      const k = Math.min(1, d / 52) / d;
      x += dx * k * 1.6;
      y += dy * k * 1.6;
    }
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  G.player.ix = x;
  G.player.iy = y;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    // 构筑详情是「暂停态」的一种，Esc 应该先关它，而不是把游戏直接放跑
    const info = document.getElementById('ovInfo');
    if (info && !info.hidden) { closeInfo(); e.preventDefault(); return; }
    // 替换目标选择面板：Esc 退回三选一，而不是把整屏关掉
    if (closeSwap()) { e.preventDefault(); return; }
    // 三选一时 Esc 等同于「这次不要」：万一卡片没渲染出来，还有个退路
    if (G.phase === 'levelup') { choose(-1); e.preventDefault(); return; }
    if (G.phase === 'run' || G.phase === 'pause') { togglePause(); e.preventDefault(); }
    return;
  }
  // 空格放狂气：只在这一局进行中生效，弹窗上按空格不应该误触
  if (e.code === 'Space') {
    if (G.phase === 'run') { releaseRage(); e.preventDefault(); }
    return;
  }
  // 替换面板打开时，1~6 直接选槽位
  const swapOv = document.getElementById('ovSwap');
  if (swapOv && !swapOv.hidden) {
    const n = Number(e.key);
    if (n >= 1 && n <= 6) { pickSwap(n - 1); e.preventDefault(); }
    return;
  }
  if (G.phase === 'levelup') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) { choose(n - 1); e.preventDefault(); return; }
    if (e.key === '0') { choose(-1); e.preventDefault(); }
    return;
  }
  if (KEYMAP[e.code]) { keys.add(e.code); applyInput(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (keys.delete(e.code)) applyInput();
});
window.addEventListener('blur', () => { keys.clear(); stick = null; applyInput(); });

// 触屏摇杆：任意位置按下都能推，指哪走哪，不用找固定的虚拟摇杆
cv.addEventListener('pointerdown', (e) => {
  if (G.phase !== 'run') return;
  if (stick) return;
  cv.setPointerCapture(e.pointerId);
  stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  drawStick();
});
cv.addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  stick.x = e.clientX;
  stick.y = e.clientY;
  applyInput();
  drawStick();
});
const endStick = (e) => {
  if (!stick || (e && e.pointerId !== stick.id)) return;
  stick = null;
  applyInput();
  drawStick();
};
cv.addEventListener('pointerup', endStick);
cv.addEventListener('pointercancel', endStick);

function drawStick() {
  const el = document.getElementById('stick');
  if (!stick) { el.style.opacity = '0'; return; }
  const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
  const d = Math.min(52, Math.hypot(dx, dy)) || 0;
  const a = Math.atan2(dy, dx);
  el.style.opacity = '1';
  el.style.left = stick.ox + 'px';
  el.style.top = stick.oy + 'px';
  const knob = el.firstElementChild;
  knob.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
}

// ---------------------------------------------------------------- 主循环
function loop(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, raw);
  try {
    frame(dt);
  } catch (e) {
    // 一帧出错不应该让整局静悄悄地卡死：记下原因，继续跑下一帧。
    // （曾经因为这里没兜底，某个武器原型抛错后画面直接冻住，控制台却什么都没有。）
    window.__svErr = (window.__svErr || 0) + 1;
    window.__svErrMsg = String((e && e.stack) || e).slice(0, 400);
    if (window.__svErr > 60) throw e;
  }
  requestAnimationFrame(loop);
}

function frame(dt) {

  if (G.phase === 'run' && !window.__svFrozen) {
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard++ < 6) { update(FIXED); acc -= FIXED; }
  } else {
    acc = 0;
    // 非战斗状态也让粒子/飘字继续收尾，画面不会突然僵住
    if (G.phase !== 'idle') update(dt);
  }

  draw();
  updateHUD();

  if (G.phase === 'levelup' && !upShown) {
    upShown = true;
    showUpgrade(G.choices);
  } else if (G.phase !== 'levelup' && upShown) {
    upShown = false;
  }

  if ((G.phase === 'over' || G.phase === 'win') && !ended) {
    ended = true;
    // 结算数据在这里就取好：520ms 后如果玩家已经点了「再来一局」，
    // 回调用 summary() 会读到下一局的空状态（分数、存活时间全归零）。
    const sm = summary();
    setTimeout(() => {
      // 同理，重启后不要再把上一局的结算盖在新一局上
      if (G.phase === 'over' || G.phase === 'win') showEnd(sm);
    }, 520);
  }
}

// 点「进入融灾禁区」但角色未解锁时的提示。放在难度提示下面而不是弹窗：
// 弹窗要额外点一次才能关，而这里玩家只是想换个角色。
function startMsg(txt) {
  const el = document.getElementById('pickTip');
  if (!el) return;
  el.textContent = txt;
  el.hidden = false;
  clearTimeout(startMsg._t);
  startMsg._t = setTimeout(() => { el.hidden = true; }, 3600);
}

// ---------------------------------------------------------------- 装配
function startGame() {
  // 解锁守卫放在这里而不是「禁用按钮」：选人面板允许点开看条件，
  // 但进了这一层就得拦住 —— 未解锁的角色连初始技能都不该发出去。
  const c = CHARS.find((x) => String(x.id) === String(ui.charId));
  if (c && c.lock && !isUnlocked(c.lock)) {
    startMsg(`「${c.n}」还没解锁：${unlockNeed(c.lock)}`);
    return;
  }
  setSeed((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  reset(ui.charId, ui.diff);
  closeInfo();
  document.getElementById('ovPick').hidden = true;
  document.getElementById('ovEnd').hidden = true;
  document.getElementById('ovPause').hidden = true;
  document.getElementById('ovUp').hidden = true;
  const sw = document.getElementById('ovSwap');
  if (sw) sw.hidden = true;
  document.getElementById('hud').hidden = false;
  document.getElementById('stick').style.opacity = '0';
  ended = false;
  upShown = false;
  acc = 0;
  last = performance.now();
  if (G.mods.firstStrike) {
    G.weapons.forEach((w) => { w.timer = 0; });
  }
}

function restart() {
  // 所有弹层都要收干净：以前这里只关了结算层，一旦是从暂停面板出来的，
  // 暂停层就留在选角层上面，点「继续」又因为 phase 已经不是 run/pause 而无反应 ——
  // 玩家看到的是一张点不动的界面，只能刷新。
  for (const id of ['ovEnd', 'ovPause', 'ovUp', 'ovInfo', 'ovPick', 'ovSwap']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  document.getElementById('hud').hidden = true;
  closeInfo();
  ended = false;
  upShown = false;
  G.phase = 'idle';
  showPick();
}

async function boot() {
  buildHUD();
  const startBtn = document.getElementById('btnStart');
  // 页面里的载入守护会在 4 秒后把按钮文案改成「正在载入素材…」，等真的就绪了
  // 必须自己改回来并打上 ready 标记——否则素材早就好了，按钮永远挂着「载入中」，
  // 玩家以为进不去（截图里就是这么卡的）。
  startBtn.disabled = true;
  await init(cv);
  resize();
  window.addEventListener('resize', () => { resize(); });
  startBtn.textContent = '进入融灾禁区';
  startBtn.disabled = false;
  startBtn.dataset.ready = '1';
  startBtn.onclick = startGame;
  document.getElementById('btnAgain').onclick = restart;
  document.getElementById('btnMenu').onclick = restart;
  document.getElementById('btnResume').onclick = () => togglePause(false);
  // 放弃 = 立刻按当前战果结算（结算面板里给银芯）。以前这里直接 restart()，
  // 等于把打了一半的成绩静默丢掉，玩家还以为卡住了。
  document.getElementById('btnQuit').onclick = giveUp;
  // 狂气按钮走 ui 的回调：buildHUD 只在启动时建一次，不能直接绑死
  ui.onRage = releaseRage;
  document.getElementById('hud').hidden = true;
  showPick();
  requestAnimationFrame((t) => { last = t; loop(t); });
}

// 供无头测试用：?_test=1 时把状态挂到 window，并给一个「快进整局」的仿真入口。
// bot(n) 固定步长推进 n 秒，遇到升级就自动选第一张 —— 这样 15 分钟的平衡
// 可以在几秒内跑完，不用真的守着屏幕等。
if (/[?&]_test=1/.test(location.search)) {
  window.__sv = {
    G, summary, update, applyChoice, rollChoices, addWeapon, addCreation,
    rage: releaseRage,
    recompute,        // 测试用：直接改 G.passives 之后要重算 mods 与超武
    allWeapons: WEAPONS,  // 测试用：按原型挑武器来验证超武
    choose,           // 测试用：直接走一遍「点卡」的真实路径（替换面板两段式）
    openUp: (c) => showUpgrade(c || G.choices),
    skip: skipChoice, // 「这次不要」：测试里要能直接调
    seed: setSeed,   // 平衡测量用：固定种子才能把两次改动的差异看出来
    start: (c, d) => { ui.charId = c; ui.diff = d || 'normal'; startGame(); },
    // 神秘唤醒体 / 后期成长相关：解锁判定与存档直接暴露，方便在无头环境里
    // 造出「已经打了十把」的存档，而不必真的跑十局 15 分钟。
    allChars: CHARS,
    unlocked: isUnlocked,
    progress: svProgress,
    setProgress: saveProgress,
    addGrowth, addItem, useItem, gainExp, hurt: hurtPlayer,
    chars: CHARS,
    bot: (seconds) => {
      window.__svFrozen = true;
      const marks = [];
      let peak = 0;
      const frames = Math.round(seconds * 60);
      // 极简求生 AI：每 10 帧朝「八方向里怪最稀」的那个方向走，
      // 完全不躲不闪的话，任何平衡都测不出来（站着必死）。
      const dirs = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
      for (let i = 0; i < frames; i++) {
        if (G.phase === 'levelup') {
          const pick = G.choices.find((o) => o.kind === 'wlv')
            || G.choices.find((o) => o.kind === 'wnew')
            || G.choices[0];
          applyChoice(pick);
          continue;
        }
        if (G.phase !== 'run') break;
        if (G.rageReady && G.rageT <= 0) releaseRage();
        if (i % 10 === 0) {
          let best = dirs[0], bestD = -1;
          for (const [dx, dy] of dirs) {
            const px = G.player.x + dx * 90, py = G.player.y + dy * 90;
            let near = 1e9;
            for (const e of G.enemies) {
              const d = (e.x - px) ** 2 + (e.y - py) ** 2;
              if (d < near) near = d;
            }
            if (near > bestD) { bestD = near; best = [dx, dy]; }
          }
          G.player.ix = best[0]; G.player.iy = best[1];
        }
        update(1 / 60);
        if (G.enemies.length > peak) peak = G.enemies.length;
        if (i % (60 * 60) === 0) {
          marks.push({ t: Math.round(G.t), lv: G.lv, kills: G.kills, hp: Math.round(G.player.hp),
            dps: Math.round(G.stats.dmg / Math.max(1, G.t)), weapons: G.weapons.length,
            passives: G.passives.length, wheels: G.wheels.length, enemies: G.enemies.length });
        }
      }
      window.__svFrozen = false;
      return { phase: G.phase, marks, peak, sum: summary(), weapons: G.weapons.map((w) => w.def.n + ':' + w.lv) };
    },
  };
}

boot();
return {  };
})();

