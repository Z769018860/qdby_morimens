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
export const PROTOS = {
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
    desc: (lv) => `在敌群脚下留下一片 ${(2.4 + lv * 0.3).toFixed(1)} 秒的侵蚀领域，每秒结算`,
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
    desc: (lv) => `射出 ${2 + lv} 枚追踪弹，绕开遮挡直取敌人`,
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
    desc: (lv) => `回复 ${2 + lv} 点生命，同时灼烧周围敌人`,
  },
};

// 12 原型里各挑一个「代表武器」的兜底顺序：某个原型一把都抽不到时不至于空池。
export const PROTO_ORDER = Object.keys(PROTOS);

// 每级成长（等级从 0 计，最高 5 级 = 6 档）
export const LV = {
  dmg: (lv) => 1 + lv * 0.22,
  cd: (lv) => Math.pow(0.94, lv),
  count: (lv, w) => (w.nStep ? w.n + Math.floor(lv / w.nStep) : w.n),
  max: 5,
};

// 技能栏：6 格。满了之后不再「抽不到新技能」，而是出现「替换」选项——
// 幸存者类的乐趣一半在Build 试错，卡死在上限会让人后半局没得选。
export const MAX_WEAPON = 6;
// 每个原型往候选池里放几把。原本只放 1 把，整局最多见到 13 个技能，
// 124 条里九成永远抽不到；放到 2 把之后候选池 24 把左右，每局都长得不一样。
export const POOL_PER_PROTO = 2;

// ---------------------------------------------------------------- 狂气
// 原作里「狂气」是打出来的资源，这里落成一条能量槽：
// 造成伤害与击杀都攒，攒满可以主动放一次爆发（攻击力/攻速/移速一起抬）。
// 释放期间不再积攒，所以它是「一波流」而不是常驻增益。
// 这两个数是按「整局 15 分钟」实测调出来的，别只看前 200 秒：
// 前 200 秒 bot 只放了 6~7 次，同一套参数跑到 900 秒会变成 86 次 —— 后期击杀
// 密度是指数上涨的，按击杀线性攒能量必然失控。现在整局约 20 次（平均 45 秒一波），
// 爆发期占全局时间约 13%，是「憋出来的一波」而不是常驻增益。
export const RAGE = {
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
export const TERRAINS = [
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
export const TERRAIN_AT = [0, 180, 360, 540, 720];
export const terrainAt = (t) => {
  let i = 0;
  for (let k = 0; k < TERRAIN_AT.length; k++) if (t >= TERRAIN_AT[k]) i = k;
  return i;
};

// ---------------------------------------------------------------- 造物（被动）
// 官方造物本身是战斗内效果，跟这里的实时动作游戏对不上，所以按它的
// tags（dmg / crit / guard / draw / energy / rage / str / exhaust）映射成
// 通用加成，名字和图标保持原样。同一件造物最多叠 3 层。
export const CREATION_FX = {
  dmg: { k: 'atk', v: 0.08, txt: '攻击力 +8%' },
  crit: { k: 'crit', v: 0.06, txt: '暴击率 +6%' },
  guard: { k: 'maxHp', v: 18, txt: '最大生命 +18' },
  draw: { k: 'pick', v: 0.3, txt: '拾取范围 +30%，经验 +6%' },
  energy: { k: 'cd', v: -0.05, txt: '冷却 -5%' },
  rage: { k: 'rage', v: 0.12, txt: '狂气积攒 +12%' },
  str: { k: 'atk', v: 0.12, txt: '攻击力 +12%，受伤 +3%' },
  exhaust: { k: 'dmgTaken', v: 0.03, txt: '受伤 +3%，全伤害 +6%' },
  speed: { k: 'spd', v: 0.06, txt: '移动速度 +6%' },
  magnet: { k: 'pick', v: 0.45, txt: '拾取范围 +45%' },
  regen: { k: 'regen', v: 0.3, txt: '每秒回复 +0.3' },
  area: { k: 'area', v: 0.1, txt: '作用范围 +10%' },
};
export const CREATION_STACK = 3;

// ---------------------------------------------------------------- 命轮
// 18 张，每张一个明确的质变效果；一级就能感觉到差别。
// key 是效果句柄，引擎里按 key 生效（见 engine 的装备结算）。
export const WHEEL_FX = [
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
export const COVENANT_FX = [
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

// ---------------------------------------------------------------- 波次
// 15 分钟一局。hp/spd 会随时间再乘一次增长曲线，所以这里的数字是「起点」。
// kind 决定刷新点位置：ring 围一圈、edge 从屏幕边、cluster 成群。
export const RUN_TIME = 15 * 60;

// hp 是「敌人有多硬 / 有多少」，dmg 是「挨一下多疼」。两者分开是必要的：
// 之前一个 hp 同时管血量和伤害，困难 1.45 倍的伤害配上 1.3 倍的刷怪量，
// 实测 4 分钟就被磨死；而调低它又会让敌人变脆、场上更空。
export const DIFFS = [
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
export const spawnGap = (t) => Math.max(0.09, 0.34 * Math.pow(0.99, t / 6));
// 敌人血量随时间线性放大：每分钟 +70%，15 分钟约 11.5 倍。
// 用线性而不是指数 —— 指数到后期会变成「怎么打都不掉血」，
// 玩家真正该追的是自己的升级速度，而不是跟一条算不完的曲线赛跑。
export const hpScale = (t) => 1 + (t / 60) * 0.7;
// 敌人攻击随时间放大
export const dmgScale = (t) => 1 + t / 300;

// 关键节点（秒）：精英与 Boss。时间一到就刷，同时给一段压力峰值。
export const BOSS_AT = [300, 600, 900];
export const ELITE_EVERY = 70;

// ---------------------------------------------------------------- 玩家
export const PLAYER = {
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
export const expNeed = (lv) => Math.round(8 * Math.pow(1.15, lv - 1));

// 得分：击杀 + 存活 + 等级 + Boss；难度倍率在结算时乘
export const scoreOf = (st) => Math.round(st.kills * 2 + st.t * 5 + st.lv * 30 + st.bossKills * 250);

// 得分换银芯（与合成大杜勒同一个钱包，阶梯式，取到达的最高档）
export const CREDIT_TIERS = [
  [400, 2], [900, 4], [1600, 7], [2600, 11], [3800, 15],
  [5200, 20], [7000, 26], [9200, 33], [12000, 42], [16000, 55], [22000, 75],
];
export const creditsAt = (score) => {
  let base = 0;
  for (const [s, c] of CREDIT_TIERS) if (score >= s) base = c;
  return base;
};
export const nextTier = (score) => CREDIT_TIERS.find(([s]) => score < s) || null;
