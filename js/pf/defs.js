// 《忘却协议》规则层：棋盘几何、星阶、羁绊、敌人、波次、经济。
//
// 这里只放「数值和规则」，绘制在 render.js，流程在 engine.js，界面在 ui.js。
// 改平衡就改这里：
//   羁绊（TRAITS）—— 界域 4 种 × 职阶 3 种，各自 2/3/4 或 2/4/6 三档；
//   敌人（ENEMY）—— 出场怪物与基础数值，图集里的立绘按 id 取；
//   波次（WAVES）—— 12 波，第 5/10/12 波是首领波。
//
// 所有百分比都是「叠加」而不是连乘，玩家能心算。

// ---------------------------------------------------------------- 棋盘
// 尖顶六边形（pointy-top）：宽 HEX_W、高 2R，隔行错开半格。
// 这些都是「逻辑单位」，绘制时整体等比缩放到屏幕（见 render.js 的 view()）。
export const COLS = 6;
export const ROWS = 5;
export const HEX_W = 94;
export const R = HEX_W / Math.sqrt(3);
export const HEX_H = R * 2;
export const ROW_PITCH = R * 1.5;
export const BOARD_W = COLS * HEX_W + HEX_W / 2;
export const BOARD_H = (ROWS - 1) * ROW_PITCH + HEX_H;
export const CORE_X = -118;                 // 协议核心（漏怪扣血的地方）
export const SPAWN_X = BOARD_W + 96;        // 敌人在这个 x 之外出生（要留在战场板子的来敌通道里）
export const DEPLOY_COLS = 4;               // 只能部署在前 4 列
export const CELLS = COLS * ROWS;

// 格位序号：row * COLS + col
export const cellOf = (col, row) => row * COLS + col;
export const colOf = (cell) => cell % COLS;
export const rowOf = (cell) => (cell / COLS) | 0;

export function cellXY(cell) {
  const col = cell % COLS;
  const row = (cell / COLS) | 0;
  return {
    x: HEX_W / 2 + col * HEX_W + (row & 1 ? HEX_W / 2 : 0),
    y: HEX_H / 2 + row * ROW_PITCH,
  };
}

// 逻辑坐标 → 最近的格位（六边形的 Voronoi 正好是「最近格心」，不用做点与多边形判定）
export function cellAt(x, y) {
  let best = -1;
  let bd = 1e9;
  for (let c = 0; c < CELLS; c++) {
    const p = cellXY(c);
    const d = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  return { cell: best, d: Math.sqrt(bd) };
}

// 六边形邻接表（尖顶布局）。相邻格中心距离正好等于 HEX_W，
// 直接按距离筛，不用写奇偶行的六向公式，也就不会把某一行的邻居写错。
export const NEIGHBORS = (() => {
  const out = [];
  for (let a = 0; a < CELLS; a++) {
    const p = cellXY(a);
    const arr = [];
    for (let b = 0; b < CELLS; b++) {
      if (a === b) continue;
      const q = cellXY(b);
      if (Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - HEX_W) < 4) arr.push(b);
    }
    out.push(arr);
  }
  return out;
})();

// ---------------------------------------------------------------- 星阶
export const STARS = [0, 1, 1.9, 3.4];      // 1★ / 2★ / 3★ 的属性倍率
export const STAR_NAME = ['', '★', '★★', '★★★'];

// ---------------------------------------------------------------- 经济
export const START_GOLD = 12;
export const START_LEVEL = 2;
export const MAX_LEVEL = 8;
export const LEVEL_COST = 5;                // 升一级固定 5 金
// 刷新 1 金：池子 62 人、还要凑同名升星，2 金一次等于「一手好牌也不敢刷」。
// 降到 1 金之后一局平均能多刷十几次，凑同名才跟得上池子的稀释。
export const REROLL_COST = 1;
export const WAVE_GOLD = 4;                 // 每波清完的基础收入
export const INTEREST_CAP = 5;
export const BENCH_SIZE = 8;
export const MAX_STAR = 3;

// 商店按人口出不同费用的概率（顺序：1 费 / 2 费 / 3 费 / 4 费）
export function shopOdds(level) {
  if (level <= 2) return [70, 26, 4, 0];
  if (level === 3) return [60, 30, 9, 1];
  if (level === 4) return [50, 34, 14, 2];
  if (level === 5) return [42, 34, 19, 5];
  if (level === 6) return [32, 34, 25, 9];
  if (level === 7) return [24, 30, 30, 16];
  return [18, 25, 33, 24];
}

// ---------------------------------------------------------------- 羁绊
// 四层：
//   kind:'realm'   界域（血肉 / 深海 / 混沌 / 超维）—— 全队生效，档位最高
//   kind:'role'    职阶（伤害 / 防御 / 辅助）—— 只对同职阶，人数要求高
//   kind:'fac'     所属组织 —— 来自 SKeyDB 的 faction 字段，只对同组织
//   kind:'gmk'     流派 —— 从角色关键词（中毒 / 触手 / 吞噬 / 反击 / 胚胎 / 穿透）提炼，
//                  只对同流派的单位生效，凑齐两个人就亮
// steps 里是「最少几个人」，eff 是与之一一对应的加成（由 engine 的 computeBonus 读）。
// stepsText 是给玩家看的文案，改 eff 的时候务必一起改。
export const TRAITS = [
  {
    key: 'caro', kind: 'realm', n: '血肉', color: '#e8695f',
    steps: [2, 3, 4],
    stepsText: ['全体攻击附带 6% 吸血', '全体攻击附带 10% 吸血', '全体攻击附带 16% 吸血'],
  },
  {
    key: 'aequor', kind: 'realm', n: '深海', color: '#5fe0d0',
    steps: [2, 3, 4],
    stepsText: ['深海单位攻速 +14%', '深海单位攻速 +24%', '深海单位攻速 +38%'],
  },
  {
    key: 'chaos', kind: 'realm', n: '混沌', color: '#b06bd9',
    steps: [2, 3, 4],
    stepsText: ['全体暴击率 +14%', '全体暴击率 +24%', '全体暴击率 +38%'],
  },
  {
    key: 'ultra', kind: 'realm', n: '超维', color: '#e3b341',
    steps: [2, 3, 4],
    stepsText: ['全体受到伤害 -6%', '全体受到伤害 -10%', '全体受到伤害 -16%'],
  },
  {
    key: 'dps', kind: 'role', n: '伤害型', color: '#ff8a7a',
    steps: [2, 4, 6],
    stepsText: ['伤害型攻击力 +16%', '伤害型攻击力 +30%', '伤害型攻击力 +50%'],
  },
  {
    key: 'tank', kind: 'role', n: '防御型', color: '#7fb3ff',
    steps: [2, 3, 4],
    stepsText: ['防御型生命 +24%', '防御型生命 +44%', '防御型生命 +68%'],
  },
  {
    key: 'sup', kind: 'role', n: '辅助型', color: '#8bd450',
    steps: [2, 3, 4],
    stepsText: ['全体攻速 +8%', '全体攻速 +14%', '全体攻速 +22%'],
  },

  // ---- 所属组织（SKeyDB 的 faction，中文直译，界面并列英文原名）----
  {
    key: 'fools', kind: 'fac', n: '愚者', en: 'The Fools', color: '#f0c674',
    steps: [2, 3, 4],
    stepsText: ['愚者攻速 +8%', '愚者攻速 +15%', '愚者攻速 +24%'],
  },
  {
    key: 'outlander', kind: 'fac', n: '界外者', en: 'Outlanders', color: '#c89b6a',
    steps: [2, 3, 4],
    stepsText: ['界外者生命 +10%', '界外者生命 +19%', '界外者生命 +30%'],
  },
  {
    key: 'hybrid', kind: 'fac', n: '混血者', en: 'Hybrid', color: '#e07a9a',
    steps: [2, 3, 4],
    stepsText: ['混血者攻击力 +10%', '混血者攻击力 +19%', '混血者攻击力 +30%'],
  },
  {
    key: 'unknowable', kind: 'fac', n: '不可知者', en: 'The Unknowable', color: '#9a8cd0',
    steps: [2, 3, 4],
    stepsText: ['不可知者狂气获取 +25%', '不可知者狂气获取 +45%', '不可知者狂气获取 +70%'],
  },
  {
    key: 'stars', kind: 'fac', n: '星之间', en: 'Among the Stars', color: '#8ecbff',
    steps: [2, 3, 4],
    stepsText: ['星之间暴击率 +12%', '星之间暴击率 +21%', '星之间暴击率 +32%'],
  },
  {
    key: 'aeons', kind: 'fac', n: '万古之外', en: 'Out of the Aeons', color: '#7fd4a8',
    steps: [2, 3, 4],
    stepsText: ['万古之外护甲 +8', '万古之外护甲 +15', '万古之外护甲 +24'],
  },
  {
    key: 'unknown', kind: 'fac', n: '未定', en: 'Unknown', color: '#8a93a8',
    steps: [2, 3, 4],
    stepsText: ['未定受到伤害 -5%', '未定受到伤害 -9%', '未定受到伤害 -14%'],
  },

  // ---- 流派（角色关键词）----
  {
    key: 'tentacle', kind: 'gmk', n: '触手', color: '#b06bd9',
    steps: [2, 3],
    stepsText: ['触手攻击溅射到相邻敌人 18% 伤害', '触手攻击溅射到相邻敌人 32% 伤害'],
  },
  {
    key: 'poison', kind: 'gmk', n: '中毒', color: '#8bd450',
    steps: [2, 3],
    stepsText: ['命中使目标中毒，每秒 2.5% 攻击力（3 秒）', '命中使目标中毒，每秒 4.5% 攻击力（3 秒）'],
  },
  {
    key: 'devour', kind: 'gmk', n: '吞噬', color: '#e8695f',
    steps: [2, 3],
    stepsText: ['击杀回复 6% 生命，永久 +2% 攻击（5 层）', '击杀回复 10% 生命，永久 +4% 攻击（5 层）'],
  },
  {
    key: 'counter', kind: 'gmk', n: '反击', color: '#7fb3ff',
    steps: [2, 3],
    stepsText: ['受击反弹 10% 伤害给攻击者', '受击反弹 18% 伤害给攻击者'],
  },
  {
    key: 'embryo', kind: 'gmk', n: '胚胎', color: '#5fe0d0',
    steps: [2, 3],
    stepsText: ['狂气获取 +15%，大招伤害 +12%', '狂气获取 +28%，大招伤害 +22%'],
  },
  {
    key: 'pierce', kind: 'gmk', n: '穿透', color: '#e3b341',
    steps: [2, 3],
    stepsText: ['攻击无视目标 20% 护甲', '攻击无视目标 35% 护甲'],
  },
];

export const TRAIT_BY_KEY = Object.fromEntries(TRAITS.map((t) => [t.key, t]));
export const TRAIT_KINDS = [
  ['realm', '界域'], ['role', '职阶'], ['fac', '组织'], ['gmk', '流派'],
];

// 组织 / 流派的数值。key 必须与上面 TRAITS 对应，数组长度必须与 steps 一致。
// 阵营只加到「同组织」的单位身上，流派只加到「同流派」的单位身上 —— 这是它们
// 能比界域（全队）给得更猛的原因，也是凑人的动力。
export const FAC_EFF = {
  fools: { aspd: [0.08, 0.15, 0.24] },
  outlander: { hp: [0.10, 0.19, 0.30] },
  hybrid: { atk: [0.10, 0.19, 0.30] },
  unknowable: { ultGain: [0.25, 0.45, 0.70] },
  stars: { crit: [0.12, 0.21, 0.32] },
  aeons: { armor: [8, 15, 24] },
  unknown: { dmgCut: [0.05, 0.09, 0.14] },
};
export const GMK_EFF = {
  tentacle: { splash: [0.18, 0.32] },
  poison: { poison: [0.025, 0.045] },
  devour: { killHeal: [0.06, 0.10], killAtk: [0.02, 0.04] },
  counter: { thorns: [0.10, 0.18] },
  embryo: { ultGain: [0.15, 0.28], ultPower: [0.12, 0.22] },
  pierce: { pierce: [0.20, 0.35] },
};

export const REALM_NAME = { caro: '血肉', aequor: '深海', chaos: '混沌', ultra: '超维' };
export const REALM_COLOR = { caro: '#e8695f', aequor: '#5fe0d0', chaos: '#b06bd9', ultra: '#e3b341' };
export const ROLE_NAME = { dps: '伤害型', tank: '防御型', sup: '辅助型' };
export const ROLE_COLOR = { dps: '#ff8a7a', tank: '#7fb3ff', sup: '#8bd450' };
export const ROLE_SHORT = { dps: '伤', tank: '防', sup: '辅' };

// 界域改用自己的官方徽记（assets/realm/*.webp，构建时裁掉外圈灰雾、内联成 data URI 写进
// js/pf/gen.js 的 REALM_ART，所以仍然不额外请求图片）。没有图的时候退回下面的内联 SVG。
export const REALM_ICON = {
  caro: 'M6 1.2C7.9 3.6 10 5.4 10 7.5A4 4 0 0 1 2 7.5C2 5.4 4.1 3.6 6 1.2Z',
  aequor: 'M6 1.3c2.5 3 3.5 4.5 3.5 6a3.5 3.5 0 0 1-7 0c0-1.5 1-3 3.5-6z',
  chaos: 'M6 1l1.3 3.7L11 6 7.3 7.3 6 11 4.7 7.3 1 6l3.7-1.3z',
  ultra: 'M6 1l4.6 5L6 11 1.4 6z',
};
export const ROLE_ICON = {
  dps: 'M2.2 9.8 9.4 2.6l.9.9-7.2 7.2zM9.6 1.4l1 .6-.2 1.4-1.4.2z',
  tank: 'M6 1l4.6 1.7v3.5c0 2.4-1.9 4.2-4.6 4.8-2.7-.6-4.6-2.4-4.6-4.8V2.7z',
  sup: 'M5 1.6h2V5h3.4v2H7v3.4H5V7H1.6V5H5z',
};
// 组织的纹章：都是 12×12 的简单几何，不追求「看得出是什么」，只求七个之间互相不像。
// （官方没有为组织出过图标，自造一个比继续用界域图标冒充要诚实。）
export const FAC_ICON = {
  // 愚者：歪着的菱形 + 一个点，牌面上的傻瓜
  fools: 'M6 1 11 6 6 11 1 6zM4.6 4.6 7.4 7.4 6 8.8 3.2 6z',
  // 界外者：缺了一角的方框
  outlander: 'M1.6 1.6h6.2v2H3.6v6.8h-2zM6 8.2l1.5 1.5L10.4 6.8l-1.5-1.5zM8.6 1.6h1.8v1.8H8.6z',
  // 混血者：两个交叠的环
  hybrid: 'M5 2.2a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 1 0 0-6.8zm0 1.5a1.9 1.9 0 1 1 0 3.8 1.9 1.9 0 1 1 0-3.8zM7.8 3.6a3.4 3.4 0 0 1 0 4.8 3.4 3.4 0 0 0 0-4.8z',
  // 不可知者：一只眼睛
  unknowable: 'M6 2.6c2.6 0 4.6 2 5.2 3.4-.6 1.4-2.6 3.4-5.2 3.4S1.4 7.4.8 6C1.4 4.6 3.4 2.6 6 2.6zm0 1.6a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z',
  // 星之间：四芒星
  stars: 'M6 .8l1.4 3.8L11.2 6 7.4 7.4 6 11.2 4.6 7.4.8 6l3.8-1.4z',
  // 万古之外：螺旋（三段等距弧）
  aeons: 'M6 1.4a4.6 4.6 0 1 0 0 9.2A3.4 3.4 0 1 1 6 4.2a1.8 1.8 0 1 0 0 3.6',
  // 未定：虚线方框里的问号
  unknown: 'M1.4 1.4h3v1.2h-1.8v1.8H1.4zM9.6 1.4h1.2v3H9.6V2.6H7.8V1.4zM6 3.8c1.3 0 2.2.8 2.2 1.9 0 .9-.5 1.3-1.1 1.7-.5.4-.6.6-.6 1.1H5c0-1 .3-1.4.9-1.9.5-.4.7-.6.7-1 0-.4-.3-.7-.7-.7-.5 0-.7.3-.8.7l-1.4-.3c.3-1 1.1-1.5 2.3-1.5zM5.1 9h1.6v1.3H5.1z',
};
// 流派的记号
export const GMK_ICON = {
  // 触手：一条卷曲的线
  tentacle: 'M2 10.6c0-3.2 1.4-4.4 3-4.4 1.4 0 2.2 1 2.2 2 0 .9-.6 1.5-1.3 1.5-.6 0-1-.4-1-.9',
  // 中毒：水滴加一颗核
  poison: 'M6 1.2c2.2 2.7 3.2 4.2 3.2 5.6A3.2 3.2 0 0 1 2.8 6.8c0-1.4 1-2.9 3.2-5.6z',
  // 吞噬：张开的嘴
  devour: 'M1.4 4.4c3-.8 6.2-.8 9.2 0-.6 2.6-2.6 4.4-4.6 4.4S2 7 1.4 4.4z',
  // 反击：折返箭头
  counter: 'M2 3.4h5.4v2.2H4.2v2.6h3.4l-3.4 3.2-3.4-3.2h1.2z',
  // 胚胎：卵
  embryo: 'M6 1.4c2.3 0 3.9 2.2 3.9 4.6S8.3 10.6 6 10.6 2.1 8.4 2.1 6 3.7 1.4 6 1.4zm0 2.4a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z',
  // 穿透：箭头穿过一条线
  pierce: 'M1 6h2.2v-1.6L6.6 6 3.2 7.6V6H1zm7.4-4.2 2.4 4.2-2.4 4.2-.7-1.2 1.6-3-1.6-3z',
};


// ---------------------------------------------------------------- 敌人
// 每一项的 id 对应 data/protocol-art.json 里 mobs 的键（图集帧表）。
// spd 是逻辑像素/秒：棋盘一格 94px，所以 45 就是「一秒一格多一点」。
export const ENEMY = {
  grunt: { art: '13970', n: '提灯教众', cls: '普通', hp: 105, atk: 27, spd: 44, leak: 1 },
  dog: { art: '13962', n: '融蚀野犬', cls: '普通', hp: 83, atk: 24, spd: 66, leak: 1 },
  blob: { art: '13965', n: '双生脓疱', cls: '普通', hp: 175, atk: 32, spd: 30, leak: 1 },
  gent: { art: '13969', n: '蜡像绅士', cls: '普通', hp: 205, atk: 38, spd: 38, leak: 1 },
  pastor: { art: '13950', n: '提灯教牧', cls: '普通', hp: 147, atk: 34, spd: 42, leak: 1 },
  collab: { art: '13974', n: '协作型融蚀体', cls: '普通', hp: 230, atk: 43, spd: 35, leak: 1 },
  horse: { art: '13954', n: '创痛疯马', cls: '精英', hp: 430, atk: 64, spd: 58, leak: 2, big: 1 },
  digger: { art: '13955', n: '疯狂碎石工', cls: '精英', hp: 620, atk: 58, spd: 27, leak: 2, big: 1 },
  repl: { art: '13960', n: '「替代品」', cls: '精英', hp: 530, atk: 74, spd: 40, leak: 2, big: 1 },
  skirt: { art: '13963', n: '大裙摆', cls: '精英', hp: 735, atk: 67, spd: 25, leak: 2, big: 1 },
  deacon: { art: '13967', n: '「永恒助祭」', cls: '精英', hp: 660, atk: 80, spd: 35, leak: 2, big: 1 },
  lamp: { art: '13956', n: '「守灯人」', cls: 'Boss', hp: 1400, atk: 106, spd: 24, leak: 5, big: 1 },
  lawrence: { art: '13958', n: '「劳伦斯先生」', cls: 'Boss', hp: 1600, atk: 118, spd: 22, leak: 5, big: 1 },
  garm: { art: '13961', n: '「嘉尔姆？」', cls: 'Boss', hp: 1750, atk: 131, spd: 30, leak: 5, big: 1 },
  song: { art: '13964', n: '「波纳佩颂歌」', cls: 'Boss', hp: 1900, atk: 144, spd: 20, leak: 5, big: 1 },
};

// 波次：e 里是 [敌人 key, 数量, 出场间隔秒]。
// 间隔是这一波节奏的关键：间隔大就变成「排队送人头」，一波拖到几十秒还没压力；
// 间隔小才是同时在场的多路压力，也是唯一能让前排漏人的机制。
export const WAVES = [
  { n: '第一波 · 试探', e: [['grunt', 6, 0.5]] },
  { n: '第二波 · 野犬', e: [['grunt', 6, 0.45], ['dog', 4, 0.45]] },
  { n: '第三波 · 脓疱', e: [['dog', 6, 0.4], ['blob', 3, 0.7]] },
  { n: '第四波 · 布道', e: [['pastor', 4, 0.5], ['gent', 3, 0.6], ['grunt', 4, 0.4]] },
  { n: '第五波 · 创痛疯马', boss: 1, e: [['horse', 1, 0], ['grunt', 6, 0.4], ['dog', 3, 0.4]] },
  { n: '第六波 · 绅士们', e: [['gent', 4, 0.5], ['blob', 4, 0.6], ['dog', 5, 0.35]] },
  { n: '第七波 · 碎石', e: [['digger', 1, 0], ['collab', 4, 0.5], ['dog', 6, 0.3]] },
  { n: '第八波 · 替代品', e: [['repl', 1, 0], ['gent', 4, 0.5], ['pastor', 3, 0.6], ['blob', 4, 0.55]] },
  { n: '第九波 · 大裙摆', e: [['skirt', 1, 0], ['horse', 2, 0.8], ['blob', 4, 0.6], ['dog', 4, 0.35]] },
  { n: '第十波 · 守灯人', boss: 1, e: [['lamp', 1, 0], ['grunt', 7, 0.35], ['dog', 3, 0.4]] },
  { n: '第十一波 · 潮声', e: [['deacon', 2, 0.9], ['repl', 1, 0], ['collab', 6, 0.4], ['dog', 5, 0.3]] },
  // 末波是全套里唯一的硬坎：实测机器人满编 16 人、18 星也会被打穿（8 局里 3 局零血）。
  // 颂歌本身 leak 5，再叠三匹精英就是「一次漏怪直接没命」。现在靠商店对已有角色的加权
  // （见 engine 的 rollOne）让玩家真能凑出二星去扛，所以阵容恢复成 3 马 4 协作。
  // 第七 / 八 / 十一波各加一只：之前这三波在 16 局里平均掉血不到 0.1，中段完全是走过场。
  { n: '第十二波 · 波纳佩颂歌', boss: 1, e: [['song', 1, 0], ['deacon', 2, 1.0], ['horse', 3, 0.7], ['collab', 4, 0.5]] },
];

// 唤醒体扩到 62 名、装备与地形进场之后，敌人整体要抬一档才打得动：
// 这一组数是用无头机器人扫出来的（TUNE hp/atk 各档各 3 局，目标 12 波里
// 大部分能通、但后期真的会漏怪）。改这里等于改整局难度，改完必须重扫。
export const ENEMY_TUNE = { hp: 1.85, atk: 1.7 };
export const waveHpMul = (w) => ENEMY_TUNE.hp * (1 + 0.10 * (w - 1));
export const waveAtkMul = (w) => ENEMY_TUNE.atk * (1 + 0.17 * (w - 1));

// ---------------------------------------------------------------- 地形
// 每一局（同一个种子）在可部署区里随机摆几块特殊地格，摆上去的东西不一样：
// 高台给远程架枪、祭坛给大招、裂隙换伤害、岩壁直接堵死一格。
// 效果在 engine 的 restat() 里统一挂到站在这格上的单位身上。
// 地形。单位吃加成（见 engine 的 terrainStats），影怪吃惩罚：
// 岩壁直接不通（寻路要绕），裂隙 / 高台让它们慢下来 —— 地形对两边都有意义，不只是装饰。
export const TERRAIN = {
  high: { n: '高台', col: '#6f9fe0', glyph: '▲', desc: '射程 +0.6 格，攻速 +10%', eslow: 0.72 },
  altar: { n: '祭坛', col: '#b06bd9', glyph: '✦', desc: '狂气获取 +70%', eslow: 1 },
  rift: { n: '裂隙', col: '#e8695f', glyph: '✧', desc: '攻击力 +18%，但受到伤害 +12%', eslow: 0.55 },
  rock: { n: '岩壁', col: '#7d8598', glyph: '▮', desc: '不能部署，影怪也过不去', eslow: 0, block: 1 },
};

// 每局摆几块：数量不多，是为了让「这一局的地形」有存在感但不至于把棋盘切碎
export const TERRAIN_PLAN = [
  ['high', 2], ['altar', 1], ['rift', 2], ['rock', 3],
];

// ---------------------------------------------------------------- 装备
// 命轮 = 纯数值（攻/血/攻速/暴击/吸血/减伤/射程），一个单位一个槽；
// 造物 = 带机制的（追加伤害、反伤、回血、狂气联动），另一个槽。
// 名字全部取自 data/survivors-data.json 里的命轮与造物，效果是这套玩法自己的。
export const WHEELS = [
  { id: 'giantblade', n: '巨人之刃', realm: 'aequor', cost: 3, stat: { atk: 0.20 }, text: '攻击力 +20%' },
  { id: 'fragrant', n: '愿世界化作芬芳', realm: 'caro', cost: 3, stat: { lifesteal: 0.08, hp: 0.10 }, text: '攻击附带 8% 吸血，生命 +10%' },
  { id: 'carnage', n: '狂戮至世界尽头', realm: 'chaos', cost: 4, stat: { crit: 0.25, critDmg: 0.30 }, text: '暴击率 +25%，暴击伤害 +30%' },
  { id: 'nurture', n: '慈悲的哺育', realm: 'caro', cost: 2, stat: { hp: 0.22 }, text: '生命 +22%' },
  { id: 'freedom', n: '不可承受的自由', realm: 'ultra', cost: 3, stat: { dmgCut: 0.12 }, text: '受到伤害 -12%' },
  { id: 'nightfall', n: '极夜与破晓', realm: 'ultra', cost: 4, stat: { aspd: 0.22 }, text: '攻速 +22%' },
  { id: 'dollvoid', n: '坠入虚无的人偶', realm: 'chaos', cost: 3, stat: { atk: 0.12, ultGain: 0.20 }, text: '攻击力 +12%，狂气获取 +20%' },
  { id: 'silkweb', n: '永世编织之网', realm: 'ultra', cost: 2, stat: { armor: 25 }, text: '护甲 +25' },
  { id: 'lullaby', n: '吞噬摇篮曲', realm: 'caro', cost: 4, stat: { hp: 0.12, killHeal: 0.12 }, text: '生命 +12%，每次击杀回复 12% 生命' },
  { id: 'winter', n: '冬夜追忆', realm: 'caro', cost: 2, stat: { aspd: 0.12, hp: 0.08 }, text: '攻速 +12%，生命 +8%' },
  { id: 'spiral', n: '记忆螺旋', realm: 'chaos', cost: 2, stat: { crit: 0.15 }, text: '暴击率 +15%' },
  { id: 'hymn', n: '神王的颂歌', realm: 'aequor', cost: 4, stat: { rangeAdd: 0.5, atk: 0.12 }, text: '射程 +0.5 格，攻击力 +12%' },
];

export const CREATIONS = [
  { id: 'fleshring', n: '血肉戒指', cost: 3, fx: 'trueDmg', text: '每次攻击追加目标当前生命 4% 的伤害（首领减半）' },
  { id: 'injector', n: '活性注射器', cost: 2, fx: 'ultGain', text: '狂气获取 +70%' },
  { id: 'dice', n: '偏方骰子', cost: 3, fx: 'critChain', text: '暴击率 +18%，暴击后额外回复 10 狂气' },
  { id: 'rubybron', n: '红宝石胸针', cost: 2, fx: 'killAtk', text: '每次击杀永久 +4% 攻击（最多 10 层）' },
  { id: 'snakeskin', n: '怪蛇残蜕', cost: 3, fx: 'thorns', text: '受到伤害时反弹 30% 给攻击者' },
  { id: 'rabbitfoot', n: '幸运兔脚', cost: 2, fx: 'doubleHit', text: '25% 几率追加一次 60% 伤害的追击' },
  { id: 'roulette', n: '日月轮盘', cost: 3, fx: 'regen', text: '战斗中每 8 秒回复 8% 生命' },
  { id: 'compass', n: '定向罗盘', cost: 2, fx: 'ultEcho', text: '友军施放大招时，自己获得 12 狂气' },
  { id: 'guardhand', n: '守护之手', cost: 2, fx: 'bulwark', text: '相邻格有友军时受到伤害 -12%' },
  { id: 'lancet', n: '锈蚀柳叶刀', cost: 4, fx: 'wound', text: '命中使目标后续受到伤害 +3%（最多 8 层）' },
  { id: 'eggtime', n: '彩蛋时间', cost: 4, fx: 'ultPower', text: '大招伤害 +35%' },
  { id: 'plague', n: '瘟疫诊断书', cost: 2, fx: 'teamHeal', text: '自己击杀敌人时，全体友军回复 3% 生命' },
];

export const WHEEL_BY_ID = Object.fromEntries(WHEELS.map((w) => [w.id, w]));
export const CREATION_BY_ID = Object.fromEntries(CREATIONS.map((c) => [c.id, c]));

// ---------------------------------------------------------------- 装备商店
export const ITEM_SLOTS = 3;            // 装备商店一次摆几件
export const ITEM_REROLL = 1;           // 单刷装备商店的价格
export const INV_SIZE = 8;              // 装备栏容量
export const MERGE_REWARD = {
  2: { gold: 1, wheel: 1 },
  3: { gold: 2, creation: 1 },
};
export const LEVEL_REWARD = { gold: 1 };

// ---------------------------------------------------------------- 结算
// 得分换银芯（与合成大杜勒、幸存者同一个钱包 zjtt:credits），阶梯取最高一档。
export const CREDIT_TIERS = [
  [0, 0], [700, 4], [1200, 9], [1800, 16], [2500, 26], [3400, 40], [4600, 60],
];
export function creditsAt(score) {
  let out = 0;
  for (const [s, c] of CREDIT_TIERS) if (score >= s) out = c;
  return out;
}
export function nextTier(score) {
  for (const t of CREDIT_TIERS) if (score < t[0]) return t;
  return null;
}

// 波次节奏：备战不限时；开战后一只怪都不剩就算清完。
export const HEAL_PER_WAVE = 0.4;      // 每波结束回 40% 最大生命
