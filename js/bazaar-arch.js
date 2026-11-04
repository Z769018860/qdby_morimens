// 《大巴扎：银钥》的**流派设计层**。
//
// js/bazaar-gen.js 是客户端数据的直译：73 个唤醒体只有三套数值（1 格产 3 / 2 格产 6 / 3 格产 10），
// 149 条命轮全是「直伤 + 一点毒或盾」，310 件造物只有 11 种属性。名字不同、打起来一模一样。
//
// 这一层负责把它们拆开：按「界域 × 类型」定 12 个流派，每个流派有自己的出手方式、光环和本命造物；
// 命轮按界域分到各自的机制族；造物按原表里的 arch 标签换成真正有区别的加成（吸血 / 穿透 / 反伤 / 减速…）。
// 生成表不手改，设计全在这里——改数值只改这个文件。

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// 占格 → 产出 / 节拍 / 效果倍率。和原来的三档基座一致，只是现在由流派决定落在哪一档。
const TIER = {
  gen: [3, 6, 10],
  cd: [3, 4, 5],
  mul: [1, 1.85, 2.9],
};

// ---------------------------------------------------------------- 光环
// 光环是「只喂左右相邻两家」的加成。原来一个流派共用一种（全游戏只有「多产算力 +1」
// 和「节拍 -1」两句），挑人时看不出差别。现在按类型拆成 10 种，每个流派各排 5 个变体，
// 按成员序号轮着发——同一个流派里，同占格的两个唤醒体不会再拿到一模一样的光环。
//   gen    相邻唤醒体每次多产 v 算力
//   cost   相邻命轮开火少耗 v 算力
//   cd     相邻节拍 -v
//   pow    相邻动作 / 命轮效果 +v
//   dmg    相邻伤害 +v
//   crit   相邻暴击率 +v
//   dot    相邻施加的中毒 / 冻伤 +v
//   shd    相邻护盾 +v
//   heal   相邻治疗 +v
//   pierce 相邻命轮的开火穿盾 +v（给人是伤害穿盾，一样生效）
//   leech  相邻单位造成伤害的 v 回血
const AURA_V = {
  gen: [1, 2, 2],
  cost: [3, 4, 5],
  cd: [1, 1, 2],
  pow: [0.30, 0.38, 0.46],
  dmg: [0.26, 0.34, 0.42],
  crit: [0.13, 0.17, 0.22],
  dot: [0.30, 0.42, 0.56],
  shd: [0.34, 0.48, 0.62],
  heal: [0.34, 0.48, 0.62],
  pierce: [0.15, 0.22, 0.30],
  leech: [0.10, 0.15, 0.20],
};
export const AURA_SHORT = {
  gen: '供能', cost: '节流', cd: '加速', pow: '增幅', dmg: '锐锋', crit: '锐利',
  dot: '蚀刻', shd: '壁垒', heal: '生息', pierce: '穿隙', leech: '汲血',
};
const AURA_ZH = {
  gen: (v) => `相邻唤醒体每次多产 ${v} 算力`,
  cost: (v) => `相邻命轮开火少耗 ${v} 算力`,
  cd: (v) => `相邻单位的节拍 -${v}`,
  pow: (v) => `相邻单位的动作效果 +${Math.round(v * 100)}%`,
  dmg: (v) => `相邻单位的伤害 +${Math.round(v * 100)}%`,
  crit: (v) => `相邻单位的暴击率 +${Math.round(v * 100)}%`,
  dot: (v) => `相邻单位的中毒与冻伤 +${Math.round(v * 100)}%`,
  shd: (v) => `相邻单位的护盾 +${Math.round(v * 100)}%`,
  heal: (v) => `相邻单位的治疗 +${Math.round(v * 100)}%`,
  pierce: (v) => `相邻命轮的开火穿盾 +${Math.round(v * 100)}%`,
  leech: (v) => `相邻单位造成伤害的 ${Math.round(v * 100)}% 回血`,
};
export function auraOf(k, tier) {
  const base = AURA_V[k] || AURA_V.pow;
  const v = base[Math.min(2, Math.max(0, tier))];
  return { k, v };
}
export const auraText = (k, v) => (AURA_ZH[k] || AURA_ZH.pow)(v);

// 流派 → 5 个光环变体（按成员序号轮发）。第一个是这一派的招牌，其余按「这个流派
// 玩家会想怎么搭」往后排：直伤派给暴击 / 供能，回复派给护盾 / 治疗，毒派给蚀刻。
// 数字是相对强度：护盾、治疗、蚀刻这些窄效果给足一点，通用增幅压一点。
const AURAS = {
  berserk: [['pow', 1], ['dmg', 1], ['crit', 1], ['leech', 1], ['gen', 1]],
  // 9 个人，按占格分组排满：2 格的三个人（0/3/6）与 1 格的六个人（1/2/4/5/7/8）各用各的，
  // 否则同占格的两个人会拿到一模一样的光环。
  overload: [['cost', 1], ['dmg', 1.1], ['crit', 1.1], ['pow', 1], ['cd', 1],
    ['pierce', 1], ['shd', 1], ['gen', 1], ['leech', 1]],
  blast: [['shd', 1], ['pierce', 1], ['pow', 1], ['dmg', 0.95], ['heal', 1]],

  leech: [['dmg', 1], ['leech', 1.1], ['heal', 1], ['crit', 1], ['pierce', 1]],
  tide: [['heal', 1], ['shd', 1], ['leech', 0.9], ['pow', 0.9], ['cost', 1]],
  bulwark: [['shd', 1.1], ['heal', 0.9], ['cd', 1], ['pow', 1], ['leech', 1]],

  frost: [['dot', 1], ['pow', 1], ['crit', 1], ['dmg', 0.9], ['heal', 1]],
  venom: [['dot', 1.1], ['gen', 1], ['heal', 1], ['shd', 1], ['leech', 1], ['crit', 1], ['dmg', 0.95]],
  slowtide: [['dot', 0.9], ['cd', 1], ['shd', 1], ['gen', 1], ['heal', 1]],

  haste: [['cd', 1], ['crit', 1.2], ['cost', 1], ['dmg', 1], ['pow', 0.9]],
  vuln: [['crit', 1.1], ['pow', 1], ['dmg', 0.95], ['pierce', 1], ['cd', 1]],
  phase: [['pierce', 1.1], ['crit', 1.15], ['shd', 1], ['leech', 1], ['pow', 1]],
};

// ---------------------------------------------------------------- 唤醒体流派
// 一个流派 = 一种打法：谁负责叠力量、谁负责下毒、谁负责把对面节拍拖慢。
// act(s) 里的 s 是占格倍率；光环按格数微调（大个子光环更强，但更贵、更占地方）。
export const ARCH = {
  // ---- 混沌：直伤。三个流派都是「这一拍砸下去多少血」，区别只在怎么把伤害堆起来
  berserk: {
    n: '狂乱', realm: 'CHAOS', type: 'ASSAULT', tag: '叠力量',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(4.25 * s) }, { k: 'str', v: r2(0.45 * s) }],
    fate: { k: 'amp', v: 0.08 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，本场每次伤害 +${a[1].v}（可叠加）。`,
  },
  overload: {
    n: '过载', realm: 'CHAOS', type: 'CHORUS', tag: '榨算力换一发',
    genOff: 1, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(3.6 * s) }],
    fate: { k: 'gen', v: 0.08 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，再把算力灌成一发 ${a[0].v} 点直伤（不分段，全砸在一起）。`,
  },
  blast: {
    n: '爆燃', realm: 'CHAOS', type: 'WARDEN', tag: '盾后爆发',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6 * s) }, { k: 'dmg', v: r1(2.2 * s) }],
    fate: { k: 'amp', v: 0.07 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，烧出 ${Math.round(a[0].v)} 点护盾，并撞出 ${a[1].v} 点直伤。`,
  },

  // ---- 血肉：回复。吸血、血泉、盾墙——都往「血条」上做，长局里靠续命和护盾上限滚
  leech: {
    n: '噬血', realm: 'CARO', type: 'ASSAULT', tag: '吸血',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(3.8 * s), leech: 0.35 }],
    fate: { k: 'leech', v: 0.06 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，并把这发的 35% 吸回自己身上。`,
  },
  tide: {
    n: '血泉', realm: 'CARO', type: 'CHORUS', tag: '回血续航',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'heal', v: r1(3.2 * s) }, { k: 'shield', v: r1(3.6 * s) }],
    fate: { k: 'regen', v: 1.5 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，回复 ${Math.round(a[0].v)} 点生命，并架起 ${Math.round(a[1].v)} 点护盾。`,
  },
  bulwark: {
    n: '血壁', realm: 'CARO', type: 'WARDEN', tag: '护盾',
    genOff: -1, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6.5 * s) }, { k: 'dmg', v: r1(1.2 * s) }],
    fate: { k: 'shcap', v: 8 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，架起 ${Math.round(a[0].v)} 点护盾，并撞出 ${a[1].v} 点伤害。`,
  },

  // ---- 深海：持续伤害。冻伤、中毒、滞潮——不靠这一拍，靠「还在掉」的三拍
  frost: {
    n: '霜蚀', realm: 'AEQUOR', type: 'ASSAULT', tag: '冻伤',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(1.9 * s) }, { k: 'burn', v: Math.round(1.2 * s) }],
    fate: { k: 'crit', v: 0.04 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，并给对手挂上 ${a[1].v} 层冻伤。`,
  },
  venom: {
    n: '腐潮', realm: 'AEQUOR', type: 'CHORUS', tag: '下毒',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'poison', v: Math.round(1.6 * s) }, { k: 'dmg', v: r1(1.1 * s) }],
    fate: { k: 'venom', v: 0.12 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，施加 ${a[0].v} 层中毒，并补 ${a[1].v} 点伤害。`,
  },
  slowtide: {
    n: '滞潮', realm: 'AEQUOR', type: 'WARDEN', tag: '毒 + 拖节拍',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'poison', v: Math.round(1.1 * s) }, { k: 'slow', v: r2(0.4 * s) }],
    fate: { k: 'fear', v: 0.05 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，下 ${a[0].v} 层中毒，并让对手的技能延后 ${a[1].v} 拍。`,
  },

  // ---- 超维：多段。伤害拆成好几下打出去，段数越多越吃「每段加成」和暴击
  haste: {
    n: '速律', realm: 'ULTRA', type: 'ASSAULT', tag: '快节拍连击',
    genOff: -1, cdOff: -1,
    act: (s) => [{ k: 'dmg', v: r1(0.95 * s), hits: 3 }, { k: 'str', v: r2(0.15 * s) }],
    fate: { k: 'crit', v: 0.04 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，连打三次、每次 ${a[0].v} 点，本场每次伤害 +${a[1].v}。节拍比别人快一拍。`,
  },
  vuln: {
    n: '虚隙', realm: 'ULTRA', type: 'CHORUS', tag: '易伤 + 连击',
    genOff: 1, cdOff: 0,
    act: (s) => [{ k: 'vuln', v: r2(0.07 * s) }, { k: 'dmg', v: r1(0.45 * s), hits: 2 }],
    fate: { k: 'amp', v: 0.06 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，让对手易伤 +${Math.round(a[0].v * 100)}%（3 拍），并连打两次、每次 ${a[1].v} 点。`,
  },
  phase: {
    n: '折跃', realm: 'ULTRA', type: 'WARDEN', tag: '穿盾连击',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6 * s) }, { k: 'dmg', v: r1(0.48 * s), hits: 3, pierce: 1 }],
    fate: { k: 'pierce', v: 0.15 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，架起 ${Math.round(a[0].v)} 点护盾，并穿盾连打三次、每次 ${a[1].v} 点。`,
  },
};

// ---------------------------------------------------------------- 启灵 / 叠位
// 五档成长不是全游戏一张表：每个流派按自己的打法往上长。
//   mul    —— 这一档把哪些 op 放大（dmg 伤害 / dot 毒与冻伤 / str 力量 / shield 护盾 /
//             heal 治疗 / vuln 易伤 / slow 延后 / leech 吸血 / hits 段数 / exec 处决线 / pierce 穿盾）
//   gen / cd  —— 产算力、节拍（唤醒体）；cost / wcd —— 耗算力、节拍（命轮）
//   extra  —— 每次出手追加的东西（函数，参数是这条流派 / 这条命轮的基础 op）
//   follow —— 出手后再来一次这个比例的追击
//   aura   —— 超限（第 4 档）时相邻光环一起变强
//   echo   —— 命轮每场能回响几次
// 唤醒体叫「启灵」：1 启 / 2 启 / 3 启 / 超限 / 最终法则。
// 命轮叫「叠位」：1 叠 / 2 叠 / 3 叠 / 超叠 / 终式——它不是「觉醒」，是这条轮盘叠了几层。
const opVal = (ops, k) => {
  const o = ops.find((x) => x.k === k);
  return o ? o.v : 0;
};

export const HERO_RANKS = {
  // 混沌·直伤：狂乱滚力量、过载灌算力、爆燃靠盾换伤害
  berserk: [
    {},
    { mul: { str: 1.4 }, d: '力量叠得更凶：每次叠加 ×1.4。' },
    { mul: { dmg: 1.18, str: 1.8 }, d: '伤害 +18%，力量叠层 ×1.8。' },
    { cd: 1, d: '节拍 -1：力量滚得更快。' },
    { mul: { dmg: 1.35, str: 2.4 }, aura: true, d: '超限：伤害 ×1.35、力量 ×2.4，光环也变强。' },
    { mul: { dmg: 1.5, str: 3.2 }, extra: (ops) => [{ k: 'str', v: r2(opVal(ops, 'str') * 0.35) }],
      d: '最终法则：伤害 ×1.5、力量 ×3.2，每次出手再叠一次力量。' },
  ],
  overload: [
    {},
    { gen: 1, d: '产算力 +1——算力就是弹药。' },
    { gen: 1, mul: { dmg: 1.15 }, d: '产算力再 +1，直伤 +15%。' },
    { cd: 1, d: '节拍 -1：弹药进得更快。' },
    { gen: 1, mul: { dmg: 1.35 }, aura: true, d: '超限：产算力再 +1、直伤 ×1.35，光环也变强。' },
    { gen: 1, mul: { dmg: 1.55 }, d: '最终法则：产算力再 +1（累计 +4），直伤 ×1.55。' },
  ],
  blast: [
    {},
    { mul: { shield: 1.3 }, d: '护盾 +30%。' },
    { mul: { shield: 1.6, dmg: 1.2 }, d: '护盾 ×1.6，直伤 +20%。' },
    { cd: 1, d: '节拍 -1：盾补得更勤。' },
    { mul: { shield: 2.0, dmg: 1.4 }, aura: true, d: '超限：护盾 ×2.0、直伤 ×1.4，光环也变强。' },
    { mul: { shield: 2.4, dmg: 1.6 }, extra: (ops) => [{ k: 'dmg', v: r1(opVal(ops, 'shield') * 0.4) }],
      d: '最终法则：护盾 ×2.4、直伤 ×1.6，架盾后追加相当于护盾 40% 的直伤。' },
  ],

  // 血肉·回复：噬血靠吸血比例、血泉靠治疗量、血壁靠盾
  leech: [
    {},
    { mul: { leech: 0.12 }, d: '吸血 35% → 47%。' },
    { mul: { dmg: 1.15, leech: 0.2 }, d: '伤害 +15%，吸血 → 55%。' },
    { cd: 1, d: '节拍 -1：回血更频繁。' },
    { mul: { dmg: 1.3, leech: 0.32 }, aura: true, d: '超限：伤害 ×1.3，吸血 → 67%，光环也变强。' },
    { mul: { dmg: 1.45, leech: 0.45 }, d: '最终法则：伤害 ×1.45，吸血 → 80%。' },
  ],
  tide: [
    {},
    { mul: { heal: 1.35 }, d: '治疗 +35%。' },
    { mul: { heal: 1.6, shield: 1.35 }, d: '治疗 ×1.6、护盾 +35%。' },
    { cd: 1, d: '节拍 -1：治疗更密。' },
    { mul: { heal: 1.9, shield: 1.7 }, aura: true, d: '超限：治疗 ×1.9、护盾 ×1.7，光环也变强。' },
    { mul: { heal: 2.3, shield: 2.0 }, extra: (ops) => [{ k: 'shield', v: r1(opVal(ops, 'heal') * 0.35) }],
      d: '最终法则：治疗 ×2.3，每次治疗额外架起相当于治疗量 35% 的护盾。' },
  ],
  bulwark: [
    {},
    { mul: { shield: 1.35 }, d: '护盾 +35%。' },
    { mul: { shield: 1.7, dmg: 1.25 }, d: '护盾 ×1.7，撞击 +25%。' },
    { cd: 1, d: '节拍 -1：盾墙更厚。' },
    { mul: { shield: 2.1, dmg: 1.45 }, aura: true, d: '超限：护盾 ×2.1、撞击 ×1.45，光环也变强。' },
    { mul: { shield: 2.5, dmg: 1.6 }, follow: 0.5, d: '最终法则：护盾 ×2.5、撞击 ×1.6，出手后追一次半效果的撞击。' },
  ],

  // 深海·持续伤害：冻伤 / 中毒越叠越狠，滞潮顺手拖对面节拍
  frost: [
    {},
    { mul: { dot: 1.5 }, d: '冻伤 +50%。' },
    { mul: { dmg: 1.15, dot: 2.0 }, d: '伤害 +15%，冻伤 ×2.0。' },
    { cd: 1, d: '节拍 -1：冻伤挂得更勤。' },
    { mul: { dmg: 1.25, dot: 2.6 }, aura: true, d: '超限：伤害 ×1.25、冻伤 ×2.6，光环也变强。' },
    { mul: { dmg: 1.35, dot: 3.2 }, extra: (ops) => [{ k: 'burn', v: Math.max(1, Math.round(opVal(ops, 'burn') * 0.4)) }],
      d: '最终法则：冻伤 ×3.2，每次出手再补一层冻伤。' },
  ],
  venom: [
    {},
    { mul: { dot: 1.5 }, d: '中毒 +50%。' },
    { mul: { dot: 2.0, dmg: 1.15 }, d: '中毒 ×2.0，补刀 +15%。' },
    { cd: 1, d: '节拍 -1：毒层不断。' },
    { mul: { dot: 2.5, dmg: 1.25 }, aura: true, d: '超限：中毒 ×2.5、补刀 ×1.25，光环也变强。' },
    { mul: { dot: 3.0, dmg: 1.35 }, extra: (ops) => [{ k: 'poison', v: Math.max(1, Math.round(opVal(ops, 'poison') * 0.4)) }],
      d: '最终法则：中毒 ×3.0，每次出手再叠半层毒。' },
  ],
  slowtide: [
    {},
    { mul: { dot: 1.4, slow: 1.3 }, d: '中毒 +40%，延后 ×1.3。' },
    { mul: { dot: 1.8, slow: 1.6 }, d: '中毒 ×1.8，延后 ×1.6。' },
    { cd: 1, d: '节拍 -1：拖得更勤。' },
    { mul: { dot: 2.2, slow: 1.9 }, aura: true, d: '超限：中毒 ×2.2、延后 ×1.9，光环也变强。' },
    { mul: { dot: 2.6, slow: 2.2 }, follow: 0.5, d: '最终法则：中毒 ×2.6、延后 ×2.2，出手后追一次半效果。' },
  ],

  // 超维·多段：每档多半是「多打一段」或「每段更疼」，段数吃满就是这套体系的爽点
  haste: [
    {},
    { mul: { dmg: 1.15 }, d: '每段 +15%。' },
    { mul: { dmg: 1.3, hits: 1 }, d: '每段 ×1.3，段数 +1（4 段）。' },
    { cd: 1, d: '节拍 -1：连击更密。' },
    { mul: { dmg: 1.45, hits: 1 }, aura: true, d: '超限：每段 ×1.45，段数再 +1（5 段），光环也变强。' },
    { mul: { dmg: 1.6 }, follow: 0.5, d: '最终法则：每段 ×1.6，出手后追一次半效果的连击。' },
  ],
  vuln: [
    {},
    { mul: { vuln: 1.4 }, d: '易伤 +40%。' },
    { mul: { vuln: 1.8, dmg: 1.15 }, d: '易伤 ×1.8，每段 +15%。' },
    { cd: 1, d: '节拍 -1：易伤不断档。' },
    { mul: { vuln: 2.2, dmg: 1.3, hits: 1 }, aura: true, d: '超限：易伤 ×2.2，段数 +1（3 段），光环也变强。' },
    { mul: { vuln: 2.6, dmg: 1.45, hits: 1 }, follow: 0.5, d: '最终法则：易伤 ×2.6，4 段连击，出手后追一次半效果。' },
  ],
  phase: [
    {},
    { mul: { dmg: 1.2 }, d: '每段 +20%。' },
    { mul: { dmg: 1.3, shield: 1.3, hits: 1 }, d: '段数 +1（4 段），每段 ×1.3，护盾 +30%。' },
    { cd: 1, d: '节拍 -1：折跃更频。' },
    { mul: { dmg: 1.45, shield: 1.5, hits: 1 }, aura: true, d: '超限：5 段、每段 ×1.45，光环也变强。' },
    { mul: { dmg: 1.6 }, follow: 0.5, d: '最终法则：每段 ×1.6，出手后追一次半效果的穿盾连击。' },
  ],
};

export const WHEEL_RANKS = {
  // 混沌：一发、残血翻倍、叠力量、易伤
  burst: [
    {}, { mul: { dmg: 1.15 }, d: '伤害 +15%。' },
    { cost: 1, mul: { dmg: 1.25 }, d: '耗算力 -1，伤害 ×1.25。' },
    { wcd: 1, d: '节拍 -1。' },
    { cost: 1, mul: { dmg: 1.45 }, d: '超叠：耗算力再 -1（累计 -2），伤害 ×1.45。' },
    { mul: { dmg: 1.7, pierce: 0.25 }, d: '终式：伤害 ×1.7，并穿 25% 护盾。' },
  ],
  execute: [
    {}, { mul: { exec: 0.55 }, d: '处决线 45% → 55%。' },
    { cost: 1, mul: { dmg: 1.15 }, d: '耗算力 -1，伤害 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { dmg: 1.3, exec: 0.65 }, d: '超叠：伤害 ×1.3，处决线 65%。' },
    { mul: { dmg: 1.5, exec: 0.75 }, d: '终式：伤害 ×1.5，残血 75% 以下就翻倍。' },
  ],
  str: [
    {}, { mul: { str: 1.5 }, d: '叠力量 ×1.5。' },
    { cost: 1, mul: { dmg: 1.15 }, d: '耗算力 -1，伤害 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { str: 2.2, dmg: 1.2 }, d: '超叠：力量 ×2.2、伤害 ×1.2。' },
    { mul: { str: 3.0, dmg: 1.35 }, extra: (ops) => [{ k: 'str', v: r2(opVal(ops, 'str') * 0.5) }],
      d: '终式：力量 ×3.0，每次开火再叠一次力量。' },
  ],
  vuln: [
    {}, { mul: { vuln: 1.5 }, d: '易伤 +50%。' },
    { cost: 1, mul: { dmg: 1.15 }, d: '耗算力 -1，伤害 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { vuln: 2.0, dmg: 1.25 }, d: '超叠：易伤 ×2.0、伤害 ×1.25。' },
    { mul: { vuln: 2.6, dmg: 1.4 }, d: '终式：易伤 ×2.6、伤害 ×1.4。' },
  ],

  // 血肉：吸血、盾墙、血泉
  leech: [
    {}, { mul: { leech: 0.15 }, d: '吸血 40% → 55%。' },
    { cost: 1, mul: { dmg: 1.15 }, d: '耗算力 -1，伤害 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { dmg: 1.3, leech: 0.3 }, d: '超叠：伤害 ×1.3，吸血 → 70%。' },
    { mul: { dmg: 1.55, leech: 0.5 }, d: '终式：伤害 ×1.55，吸血 → 90%。' },
  ],
  bulwark: [
    {}, { mul: { shield: 1.3 }, d: '护盾 +30%。' },
    { cost: 1, mul: { shield: 1.5 }, d: '耗算力 -1，护盾 ×1.5。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { shield: 1.9, dmg: 1.3 }, d: '超叠：护盾 ×1.9、伤害 ×1.3。' },
    { mul: { shield: 2.3, dmg: 1.5 }, d: '终式：护盾 ×2.3、伤害 ×1.5。' },
  ],
  tide: [
    {}, { mul: { heal: 1.35 }, d: '治疗 +35%。' },
    { cost: 1, mul: { shield: 1.3 }, d: '耗算力 -1，护盾 +30%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { heal: 1.7, shield: 1.6, dmg: 1.2 }, d: '超叠：治疗 ×1.7、护盾 ×1.6。' },
    { mul: { heal: 2.1, shield: 2.0, dmg: 1.4 }, extra: (ops) => [{ k: 'shield', v: r1(opVal(ops, 'heal') * 0.3) }],
      d: '终式：治疗 ×2.1、护盾 ×2.0，并额外架起治疗量 30% 的盾。' },
  ],

  // 深海：中毒、冻伤、滞潮
  venom: [
    {}, { mul: { dot: 1.4 }, d: '中毒 +40%。' },
    { cost: 1, mul: { dot: 1.6 }, d: '耗算力 -1，中毒 ×1.6。' },
    { wcd: 1, d: '节拍 -1。' },
    { cost: 1, mul: { dot: 2.0, dmg: 1.2 }, d: '超叠：中毒 ×2.0、伤害 ×1.2。' },
    { mul: { dot: 2.4, dmg: 1.3 }, d: '终式：中毒 ×2.4、伤害 ×1.3。' },
  ],
  burn: [
    {}, { mul: { dot: 1.4 }, d: '冻伤 +40%。' },
    { mul: { dmg: 1.15, dot: 1.6 }, d: '伤害 +15%，冻伤 ×1.6。' },
    { wcd: 1, d: '节拍 -1。' },
    { cost: 1, mul: { dot: 2.0, dmg: 1.3 }, d: '超叠：冻伤 ×2.0、伤害 ×1.3。' },
    { mul: { dot: 2.4, dmg: 1.45 }, d: '终式：冻伤 ×2.4、伤害 ×1.45。' },
  ],
  slow: [
    {}, { mul: { slow: 2 }, d: '延后 1 拍 → 2 拍。' },
    { cost: 1, mul: { dmg: 1.15 }, d: '耗算力 -1，伤害 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { dmg: 1.3, slow: 2.5 }, d: '超叠：伤害 ×1.3，延后 2.5 拍。' },
    { mul: { dmg: 1.5, slow: 3 }, d: '终式：伤害 ×1.5，延后 3 拍（上限）。' },
  ],

  // 超维：多段、回响、穿盾
  multi: [
    {}, { mul: { hits: 1 }, d: '段数 +1（5 段）。' },
    { mul: { dmg: 1.15 }, d: '每段 +15%。' },
    { wcd: 1, d: '节拍 -1。' },
    { cost: 1, mul: { dmg: 1.2, hits: 1 }, d: '超叠：段数再 +1（6 段），每段 ×1.2。' },
    { mul: { dmg: 1.35 }, d: '终式：每段 ×1.35。' },
  ],
  echo: [
    {}, { mul: { dmg: 1.15 }, d: '伤害 +15%。' },
    { cost: 1, d: '耗算力 -1。' },
    { wcd: 1, d: '节拍 -1。' },
    { mul: { dmg: 1.3 }, echo: 2, d: '超叠：每场回响两次。' },
    { mul: { dmg: 1.5 }, echo: 3, d: '终式：每场回响三次。' },
  ],
  pierce: [
    {}, { mul: { dmg: 1.15 }, d: '伤害 +15%。' },
    { cost: 1, d: '耗算力 -1。' },
    { wcd: 1, d: '节拍 -1。' },
    { cost: 1, mul: { dmg: 1.35 }, d: '超叠：耗算力再 -1（累计 -2），伤害 ×1.35。' },
    { mul: { dmg: 1.6 }, d: '终式：伤害 ×1.6（本就全穿盾）。' },
  ],
};

// 界域特性：同一个界域的人凑得越多，共鸣越强（2 / 3 / 4 人三档）。
// 四界的性格就是四种「伤害怎么算」：混沌比这一拍有多疼，血肉比谁先耗死谁，
// 深海比三拍后还在掉多少，超维比这一下拆成了几段。
export const REALM_TRAIT = {
  CHAOS: { n: '直伤', k: 'burst', v: [0.1, 0.18, 0.26], pierce: [0.08, 0.14, 0.2],
    txt: '全队造成的伤害 +10% / 18% / 26%，命轮再穿 8% / 14% / 20% 护盾（同界域 2 / 3 / 4 人）' },
  CARO: { n: '回复', k: 'heal', v: [0.2, 0.35, 0.5], sh: [4, 6, 9],
    txt: '治疗 +20% / 35% / 50%，每次治疗顺带 4 / 6 / 9 点护盾（同界域 2 / 3 / 4 人）' },
  AEQUOR: { n: '持续伤害', k: 'dot', v: [0.25, 0.45, 0.65],
    txt: '中毒与冻伤 +25% / 45% / 65%（同界域 2 / 3 / 4 人）' },
  ULTRA: { n: '多段', k: 'multi', v: [0.05, 0.08, 0.12],
    txt: '每一段伤害 +5% / 8% / 12%——三段就是 +15% / 24% / 36%（同界域 2 / 3 / 4 人）' },
};

// 界域 × 类型 → 流派。（十二格刚好十二个流派，老角色的定位不会被推翻）
const CELL = {
  CHAOS: { ASSAULT: 'berserk', CHORUS: 'overload', WARDEN: 'blast' },
  CARO: { ASSAULT: 'leech', CHORUS: 'tide', WARDEN: 'bulwark' },
  AEQUOR: { ASSAULT: 'frost', CHORUS: 'venom', WARDEN: 'slowtide' },
  ULTRA: { ASSAULT: 'haste', CHORUS: 'vuln', WARDEN: 'phase' },
};

export const ARCH_ZH = Object.entries(ARCH).reduce((a, [id, d]) => {
  a[id] = d.n;
  return a;
}, {});

// 占格：防御型撑 2~3 格，辅助多为 1~2 格，伤害型 1~3 格都有人——
// 十五格里怎么搭、是先上大件还是铺一地小件，变成真正的选择。
function tierFor(arch, i) {
  if (arch.type === 'WARDEN') return i % 2 ? 2 : 3;
  if (arch.type === 'CHORUS') return i % 3 === 0 ? 2 : 1;
  return 1 + (i % 3);
}

export function designHeroes(heroes) {
  const seen = {};
  return heroes.map((h) => {
    const cell = CELL[h.realm] || CELL.CHAOS;
    const id = cell[h.typeKey] || 'berserk';
    const arch = ARCH[id];
    const i = (seen[id] = (seen[id] || 0) + 1) - 1;
    const t = tierFor(arch, i);
    const s = TIER.mul[t - 1];
    const gen = Math.max(1, TIER.gen[t - 1] + arch.genOff);
    const cd = Math.max(2, TIER.cd[t - 1] + arch.cdOff);
    const act = arch.act(s);
    // 光环按流派内序号轮发 5 个变体：i%5 与占格周期（1/2/3 循环、或 3/2 交替）互质，
    // 所以同一个流派里不会出现「同占格、同光环」的两个人。
    const list = AURAS[id] || AURAS.berserk;
    const seq = list[i % list.length];
    const au = auraOf(seq[0], t - 1);
    const av = (au.k === 'gen' || au.k === 'cd' || au.k === 'cost')
      ? Math.max(1, Math.round(au.v * seq[1]))
      : r2(au.v * seq[1]);
    return {
      ...h,
      arch: id,
      archZh: arch.n,
      type: h.type,
      slots: t,
      gen,
      cd,
      act,
      txt: arch.txt(gen, cd, act),
      aura: { k: au.k, v: av },
      auraTxt: auraText(au.k, av),
      fate: { ...h.fate, k: arch.fate.k, v: arch.fate.v },
    };
  });
}

// ---------------------------------------------------------------- 命轮机制族
// 每条命轮按界域分到三四个机制族里：同样是「花算力换伤害」，但中毒 / 冻伤 / 穿盾 / 回响 / 叠力量
// 在长局里的曲线完全不同，配谁上场、先买哪条，就是流派。
export const WARCH = {
  burst: { n: '直伤', op: (s) => [{ k: 'dmg', v: r1(18 * s) }], cpu: 22, wcd: 5 },
  multi: { n: '裂击', op: (s) => [{ k: 'dmg', v: r1(5 * s), hits: 4 }], cpu: 21, wcd: 5 },
  venom: { n: '蚀毒', op: (s) => [{ k: 'dmg', v: r1(8.5 * s) }, { k: 'poison', v: Math.round(3 * s) }], cpu: 21, wcd: 5 },
  burn: { n: '霜噬', op: (s) => [{ k: 'dmg', v: r1(7 * s) }, { k: 'burn', v: Math.round(3.2 * s) }], cpu: 21, wcd: 5 },
  leech: { n: '噬血', op: (s) => [{ k: 'dmg', v: r1(14 * s), leech: 0.4 }], cpu: 21, wcd: 5 },
  execute: { n: '处决', op: (s) => [{ k: 'dmg', v: r1(15 * s), execute: 0.45 }], cpu: 22, wcd: 5 },
  pierce: { n: '折跃', op: (s) => [{ k: 'dmg', v: r1(13.5 * s), pierce: 1 }], cpu: 22, wcd: 5 },
  slow: { n: '滞潮', op: (s) => [{ k: 'dmg', v: r1(10 * s) }, { k: 'slow', v: 1 }], cpu: 20, wcd: 5 },
  vuln: { n: '虚隙', op: (s) => [{ k: 'dmg', v: r1(9 * s) }, { k: 'vuln', v: r2(0.22 * s) }], cpu: 20, wcd: 5 },
  str: { n: '蓄势', op: (s) => [{ k: 'dmg', v: r1(9 * s) }, { k: 'str', v: r2(1.1 * s) }], cpu: 20, wcd: 5 },
  bulwark: { n: '血壁', op: (s) => [{ k: 'shield', v: r1(24 * s) }, { k: 'dmg', v: r1(6 * s) }], cpu: 19, wcd: 5 },
  echo: { n: '回响', op: (s) => [{ k: 'dmg', v: r1(11 * s) }, { k: 'echo', v: 1 }], cpu: 23, wcd: 6 },
  tide: { n: '血泉', op: (s) => [{ k: 'shield', v: r1(14 * s) }, { k: 'heal', v: r1(10 * s) }, { k: 'dmg', v: r1(6 * s) }], cpu: 20, wcd: 5 },
};

const WPOOL = {
  CHAOS: ['burst', 'str', 'execute', 'vuln'],       // 直伤：一发、叠力量、残血翻倍、易伤放大
  CARO: ['leech', 'bulwark', 'tide'],                // 回复：吸血、盾墙、血泉
  AEQUOR: ['venom', 'burn', 'slow'],                 // 持续伤害：中毒、冻伤、滞潮
  ULTRA: ['multi', 'echo', 'pierce'],                // 多段：四连、回响、穿盾连击
};
const WNEUTRAL = ['burst', 'multi', 'venom', 'burn', 'execute', 'pierce', 'slow', 'leech'];
const RAR_S = { N: 0.88, SR: 1, SSR: 1.12 };

export function designWheels(wheels) {
  const seen = {};
  return wheels.map((w) => {
    const pool = WPOOL[w.realm] || WNEUTRAL;
    const i = (seen[w.realm || 'NEUTRAL'] = (seen[w.realm || 'NEUTRAL'] || 0) + 1) - 1;
    const id = pool[i % pool.length];
    const d = WARCH[id];
    const s = RAR_S[w.r] || 1;
    return { ...w, arch: id, archZh: d.n, cpu: d.cpu, wcd: d.wcd, op: d.op(s) };
  });
}

// ---------------------------------------------------------------- 造物加成
// 原来 310 件造物只有 11 种属性（伤害 / 暴击 / 上限…），同质化最严重的一层。
// 现在按原表的 arch 标签分发到「吸血 / 穿透 / 反伤 / 减速 / 每拍护盾 / 生命」这些真正有区别的机制上。
const INT_KEY = { flat: 1, shcap: 1, ward: 1, regen: 1, gold: 1, cap: 1, thorns: 1, hp: 1, wcd: 1 };
const ITEM_TABLE = {
  dmg: [['amp', 0.075], ['flat', 5.5], ['crit', 0.045]],
  str: [['flat', 6.5], ['amp', 0.06]],
  crit: [['crit', 0.055], ['cdmg', 0.18]],
  poison: [['venom', 0.18], ['amp', 0.06]],
  burn: [['amp', 0.07], ['flat', 5]],
  vuln: [['amp', 0.07], ['pierce', 0.18]],
  shield: [['shcap', 9], ['ward', 3]],
  heal: [['regen', 1.2], ['hp', 16]],
  regen: [['regen', 1.4], ['hp', 14]],
  gold: [['gold', 1.6]],
  haste: [['wcd', 1]],
  slow: [['fear', 0.06], ['hp', 14]],
  thorns: [['thorns', 3]],
  aura: [['cap', 8], ['gen', 0.06]],
};
const RAR_M = { N: 0.8, SR: 1, SSR: 1.2 };

export function designItems(items) {
  const seen = {};
  return items.map((it) => {
    const tab = ITEM_TABLE[it.arch];
    if (!tab) return it;                                   // 本命造物（FATE）不动
    const i = (seen[it.arch] = (seen[it.arch] || 0) + 1) - 1;
    const [k, base] = tab[i % tab.length];
    const m = RAR_M[it.r] || 1;
    const v = INT_KEY[k] ? Math.max(1, Math.round(base * m)) : r2(base * m);
    return { ...it, m: { k, v } };
  });
}
