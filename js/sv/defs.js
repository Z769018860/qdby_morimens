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
  // ---- 2026-10 彩蛋角色（B 站主播唤醒体）的专属原型
  // 这七种只出现在彩蛋角色身上（build_survivors_data.mjs 不产出它们，
  // 普通角色的抽取池也会跳过带 egg 标记的武器），所以可以做得更「像那个人」：
  // 萨摩的拍子、流苏的丝带、爱丽丝的洞、鼠王的鼠群、魔龙的吐息、0 氪的誓、茉琳的花。
  cadence: {
    name: '节拍连打', color: '#ff7a9c', cd: 0.42, dmg: 9, n: 1, nStep: 3,
    desc: (lv) => `按拍子连打，每 ${4} 拍补一记重音；${1 + Math.floor(lv / 3)} 拍一次加花`,
  },
  ribbon: {
    name: '幻梦丝带', color: '#9d8bff', cd: 2.0, dmg: 13, n: 1, nStep: 2,
    desc: (lv) => `丝带绕身扫出一整圈，扫到的敌人被缠住减速 ${(2.2 + lv * 0.3).toFixed(1)} 秒`,
  },
  burrow: {
    name: '兔子洞', color: '#5fd0ff', cd: 2.4, dmg: 26, n: 1, nStep: 2,
    desc: (lv) => `在敌群中心开洞，把 ${(1.4 + lv * 0.15).toFixed(1)} 秒内靠近的敌人拽进去，收口时炸开`,
  },
  swarm: {
    name: '鼠群奔涌', color: '#c8e06a', cd: 1.3, dmg: 11, n: 3, nStep: 2,
    desc: (lv) => `放出 ${3 + Math.floor(lv / 2)} 只小鼠各自扑咬，撞上就散`,
  },
  breath: {
    name: '龙息', color: '#ff9a4d', cd: 2.2, dmg: 9, n: 1, nStep: 2,
    desc: (lv) => `朝最近敌人喷出 ${(2.4 + lv * 0.2).toFixed(1)} 秒锥形火焰，持续灼烧并迟滞`,
  },
  vow: {
    name: '立誓之刃', color: '#ffd76a', cd: 2.6, dmg: 30, n: 1, nStep: 2,
    desc: (lv) => `以誓约换一次爆发：震开四周，同时获得 ${10 + lv * 7} 点护盾`,
  },
  bloom: {
    name: '茉香花海', color: '#8ce0a8', cd: 2.8, dmg: 8, n: 1, nStep: 2,
    desc: (lv) => `脚下开出 ${(3.2 + lv * 0.3).toFixed(1)} 秒花海，自己在里面回血，敌人踩进来掉血`,
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
  skip: 12,            // 三选一点「这次不要」的补偿：放弃一次成长，换一小截狂气
  dur: 6,              // 爆发持续（秒）
  atk: 0.6,            // 爆发期攻击力 +60%
  cd: 0.7,             // 爆发期冷却 ×0.7
  spd: 0.15,           // 爆发期移速 +15%
  blast: 130,          // 释放瞬间的冲击波伤害（会被 atk 再乘一次）
};

// ---------------------------------------------------------------- 角色台词
// 台词文本来自灰机 wiki 的角色页「语音」段（data/sv-voices.json → js/sv/voices.js），
// 这里只定「什么时候说、说多久、多容易说」。wiki 上没有音频，所以是纯文字气泡，
// 靠时机而不是配音来塑造角色感：技能、爆发、觉醒、挨打、升级各一句。
export const VOICE = {
  dur: 3.4,          // 一句停留时长（秒）
  cd: 4.2,           // 全局冷却：再有意思也别刷屏
  wakeDelay: 1.6,    // 开场「唤醒」台词延后，避开选人面板与首屏 UI
  skillChance: 0.16, // 每次技能触发说话的概率（技能一秒好几次，不能次次都念）
  hurtChance: 0.34,
  lvChance: 0.5,
  maxChars: 46,      // 超过这个长度就截断加省略号，气泡放不下
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
//
// 2026-10 扩充：原来只有 12 类，42 件造物平均 3.5 件共用同一个效果，
// 抽到「肉冻」「幸运风衣」「偏方骰子」感觉完全一样。现在 26 类，
// 按「攻击 / 投射物 / 生存 / 节奏 / 资源」五组铺开，每类都在引擎里真实生效
// （改这里必须同时改 engine 的 applyCreation，否则就是描述骗人）。
export const CREATION_FX = {
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
export const EVOS = [
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
  // ---------------- 彩蛋角色的专武超武：都是「这把技能」的质变，条件统一 4 级
  {
    id: 'sw_samo', char: 'egg-samo', n: '不耶终章', color: '#ff7a9c',
    need: { level: 4 },
    fx: { cd: 0.62, dmg: 0.5, count: 2 },
    txt: '萨摩不耶专属：冷却 -38%，伤害 +50%，多打两拍',
  },
  {
    id: 'sw_susu', char: 'egg-susu', n: '长梦不醒', color: '#9d8bff',
    need: { level: 4 },
    fx: { area: 0.55, dmg: 0.4 },
    txt: '梦依流苏专属：丝带扫过范围 +55%，伤害 +40%',
  },
  {
    id: 'sw_alice', char: 'egg-alice', n: '洞底茶会', color: '#5fd0ff',
    need: { level: 4 },
    fx: { area: 0.4, dmg: 0.55, count: 1 },
    txt: '爱丽丝专属：洞更大、更深，伤害 +55%',
  },
  {
    id: 'sw_ratking', char: 'egg-ratking', n: '万鼠之王', color: '#c8e06a',
    need: { level: 4 },
    fx: { count: 3, dmg: 0.35 },
    txt: '鼠王专属：鼠群 +3 只，伤害 +35%',
  },
  {
    id: 'sw_dragon', char: 'egg-dragon', n: '古龙之怒', color: '#ff9a4d',
    need: { level: 4 },
    fx: { area: 0.45, dmg: 0.45 },
    txt: '魔龙_D 专属：吐息更宽，伤害 +45%',
  },
  {
    id: 'sw_zerokr', char: 'egg-zerokr', n: '永不充值', color: '#ffd76a',
    need: { level: 4 },
    fx: { area: 0.35, dmg: 0.5 },
    txt: '立誓0氪专属：誓约范围 +35%，伤害 +50%',
  },
  {
    id: 'sw_moreen', char: 'egg-moreen', n: '花开不败', color: '#8ce0a8',
    need: { level: 4 },
    fx: { area: 0.5, dmg: 0.3 },
    txt: '夏茉琳专属：花海范围 +50%，伤害 +30%',
  },
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
// 精英原来是固定 70 秒刷 2 只，整局节奏一条直线：第 14 分钟和第 1 分钟一样稀。
// 现在间隔随时间收紧（每分钟 ×0.93，最快 20 秒），同时数量分三档抬上去，
// 中后期才会出现「刚清完一波又来一群」的压迫感 —— 但压的是精英，不是小怪数量，
// 小怪那条曲线动一下就会把 300 上限塞满。
export const ELITE_EVERY = 70;
export const eliteGap = (t) => Math.max(20, ELITE_EVERY * Math.pow(0.93, t / 60));
export const eliteCount = (t) => (t >= 720 ? 3 : t >= 360 ? 2 : 1);

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

// ---------------------------------------------------------------- 神秘唤醒体
// 四位没有立绘的唤醒体（选人面板上是黑色剪影）。他们不进普通卡池，
// 要先满足条件才放出来 —— 条件写在 UNLOCKS 里，进度存在 js/sv/unlock.js。
//
// 条件设计的取舍：四条线分别考「广度 / 难度 / 深度 / 全面」，
// 而不是「通关 N 次」这种同一件事数量堆叠，否则四条会变成同一件事的四种写法。
export const UNLOCKS = {
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
export const MECHS = {
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
  // ---------------- 彩蛋角色（B 站主播唤醒体）的机制
  // 和上面四位一样是「这名角色的规则」，不走 mods。数值都刻意做得不夸张：
  // 彩蛋是给熟人玩梗的，不该变成强度榜上的第一梯队。
  'egg-samo': {
    id: 'samobeat', n: '不耶节拍', color: '#ff7a9c',
    text: '每击杀 1 名敌人积 1 拍（上限 30 拍），每拍攻击 +1.5%；满拍时放出一次节拍冲击清出一圈，然后重新计数',
    short: '节拍',
  },
  'egg-susu': {
    id: 'dreamgate', n: '入梦', color: '#9d8bff',
    text: '每局第一次致命伤改为入梦：免除伤害，2 秒无敌并回复 35% 生命',
    short: '入梦',
  },
  'egg-alice': {
    id: 'rabbitfall', n: '掉进洞里', color: '#5fd0ff',
    text: '周围 7 名内敌人超过 7 只时，自动跳进兔子洞瞬移脱身（18 秒冷却），落地炸开一圈',
    short: '兔子洞',
  },
  'egg-ratking': {
    id: 'ratcrown', n: '鼠王加冕', color: '#c8e06a',
    text: '每累计击杀 20 名敌人，脚边涌出一波鼠群冲向四周，撞到的敌人被推退并受伤',
    short: '鼠群',
  },
  'egg-dragon': {
    id: 'dragonscale', n: '龙鳞', color: '#ff9a4d',
    text: '受到伤害 -15%，护盾上限 +40%；每 8 秒向最近的敌人喷一口龙焰',
    short: '龙鳞',
  },
  'egg-zerokr': {
    id: 'zerokr', n: '立誓', color: '#ffd76a',
    text: '开局 90 秒内攻击 +50%、移速 +12%；90 秒后攻击 +8%',
    short: '立誓',
  },
  'egg-moreen': {
    id: 'blossom', n: '花信风', color: '#8ce0a8',
    text: '每 9 秒在脚下开一片花海：站在里面每秒回复 2 点生命，敌人进来被减速并持续受伤',
    short: '花信',
  },
};

// ---------------------------------------------------------------- 后期成长
// 6 格技能全满级之后，武器/造物这两条线会同时见底，三选一就只剩「跳过」。
// 这里补两组「不会见底」的选项：极限淬炼（永久小幅成长）与一次性道具。
export const GROWTHS = [
  { id: 'g_atk', n: '淬炼 · 锋', icon: '⚔', txt: '攻击力 +3%', fx: { atk: 0.03 } },
  { id: 'g_crit', n: '淬炼 · 锐', icon: '✦', txt: '暴击率 +2%，暴击伤害 +4%', fx: { crit: 0.02, critMul: 0.04 } },
  { id: 'g_hp', n: '淬炼 · 韧', icon: '❤', txt: '最大生命 +8，每秒回复 +0.3', fx: { maxHpBonus: 8, regen: 0.3 } },
  { id: 'g_cd', n: '淬炼 · 疾', icon: '⚡', txt: '冷却 -2%，移速 +2%', fx: { cd: 0.98, spd: 1.02 } },
  { id: 'g_reach', n: '淬炼 · 广', icon: '◎', txt: '作用范围、领域半径、持续时间各 +3%', fx: { area: 0.03, fieldRadius: 0.03, dur: 0.03 } },
  { id: 'g_edge', n: '淬炼 · 极', icon: '✧', txt: '暴击伤害 +8%，但最大生命 -3', fx: { critMul: 0.08, maxHpBonus: -3 } },
];

// 一次性道具：持有上限 3 件，用掉就没了。它们不占技能格、不进 mods，
// 只在关键时刻给一次「翻盘权」，所以数值可以做得比长线成长大方。
export const ITEMS = [
  { id: 'i_medkit', n: '应急针剂', icon: '✚', color: '#8ce0a8', txt: '立刻回复 45% 最大生命' },
  { id: 'i_nuke', n: '湮灭符', icon: '☄', color: '#ff7a45', txt: '对全屏敌人造成一次重击（约 3 秒的输出量）' },
  { id: 'i_rage', n: '狂气血清', icon: '☣', color: '#ff9350', txt: '狂气直接充满，可立刻释放一次爆发' },
  { id: 'i_dice', n: '命运骰子', icon: '⚄', color: '#6ea8ff', txt: '立刻重掷本次三选一' },
];
export const ITEM_MAX = 3;
