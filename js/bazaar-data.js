// 《弥萨格大巴扎》数据表 —— 造物 / 命轮 / 密契 / 唤醒体 / 怪物全部取自《忘却前夜》原素材。
//
// 这一份是「设计」，图在 js/bazaar-art.js（由 scripts/build_bazaar_art.mjs 把用到的图
// 内联成 data URI，避免一局里几十个小图各发一个请求）。新增条目只要写 `im` 路径，
// 跑一次构建就会把图收进去。
//
// `assets/bazaar/` 是原件（assets/awakener、assets/creation、assets/wheel、assets/covenant、
// assets/monster）的等比压缩副本（长边 88 / 112，webp q78）：一局要用一百来张图，
// 原件那套 396KB 内联成 base64 是 535KB，压过之后 382KB。换图照旧改原件，再重跑一次
// scripts/build_bazaar_shots.mjs 重新压。
//
// op 的词表（js/bazaar-core.js 解释，卡面文本由 op 现算，保证「写的和打的一致」）：
//   dmg    {v, hits?, pierce?, leech?, vsPoison?}   伤害 / 段数 / 无视护盾 / 吸血 / 对中毒目标加伤
//   poison {v}      施加中毒（每拍掉 层数 点，无视护盾，然后层数 -1）
//   burn   {v}      施加灼烧（每拍掉 层数 点，被护盾挡，然后层数 -1）
//   shield {v}      获得护盾
//   heal   {v}      回复生命
//   gold   {v}      战斗结束时进账的金币
//   haste  {v}      相邻造物冷却 -v（最低 2 拍，整场有效）
//   charge {v}      相邻造物计时立刻 +v 拍（可能当场触发）
//   slow   {v}      敌方全部技能冷却 +v（整场有效，最多 +3）
//   aura   {v}      光环：相邻造物伤害 +v（无冷却，不触发）

export const TUNING = {
  beats: 40,          // 一场最多 40 拍，打不完算输
  beatMs: 520,        // 一拍在屏幕上的时长
  startHp: 130,       // 战斗生命（每场重置）
  startGold: 12,
  slotN: 6,
  sane: 3,            // 理智（输三场就散场）
  upgradeCost: 9,
  rerollCost: 2,
  sellRate: 0.5,
  tierMul: [0, 1, 1.5, 2.25],
  // 每天：怪物生命 / 敌方「每拍造成多少伤害」的目标值 / 战后收入
  //   敌方技能数值是按 rawDps 归一过的，所以同一天里不管几只怪，出手重量都一致；
  //   越到后面越狠，靠 dayDps 这条曲线控制，别去单独改某只怪的技能。
  dayHp: [0, 123, 178, 211, 264, 319, 380, 407, 473, 517, 578, 618, 715],
  dayDps: [0, 4.5, 5.3, 5.6, 5.5, 5.4, 5.5, 5.7, 5.6, 5.7, 6.0, 5.9, 6.2],
  income: [0, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14],
};

// ---------------------------------------------------------------- 唤醒体
// pas.k 由 core 解释：surge / bulwark / tide / amp / tempo / ward / save / venom
export const HEROES = [
  {
    id: 'h24', n: '24', av: 'assets/bazaar/special-024.webp', realm: '混沌', role: '伤害型',
    wheel: { n: '畸体回噬', im: 'assets/bazaar/Weapon_Mini_C06.webp', main: 'ALIEMUS_REGEN' },
    pas: { k: 'surge', v: 5, txt: '狂气：每 5 拍，随机一件造物立刻触发一次。' },
    kit: ['i05', 'i09'],
    lore: '两个人格挤在同一具身体里，摊位上也一样吵。',
  },
  {
    id: 'hagrippa', n: '阿格里帕', av: 'assets/bazaar/agrippa.webp', realm: '血肉', role: '防御型',
    wheel: { n: '苍白后裔', im: 'assets/bazaar/Weapon_Mini_B06.webp', main: 'SIGIL_YIELD' },
    pas: { k: 'bulwark', v: 20, txt: '织网：护盾上限 +20；护盾没被打破时，受到的伤害再 -20%。' },
    kit: ['i10', 'i04'],
    lore: '蜘蛛把摊子织成了一张网，来买的人都得先粘一下。',
  },
  {
    id: 'hcaecus', n: '凯刻斯', av: 'assets/bazaar/caecus.webp', realm: '深海', role: '防御型',
    wheel: { n: '伤痛之鳍', im: 'assets/bazaar/Weapon_Mini_O04.webp', main: 'SIGIL_YIELD' },
    pas: { k: 'tide', v: 30, txt: '深潜：战斗生命上限 +30；生命低于一半时每拍回复 1 点。' },
    kit: ['i12', 'i11'],
    lore: '小鱼撑着一盏灯看摊，说深海里的东西比钱好使。',
  },
  {
    id: 'hcastor', n: '卡斯托尔', av: 'assets/bazaar/castor.webp', realm: '超维', role: '辅助型',
    wheel: { n: '不可承受的自由', im: 'assets/bazaar/Weapon_Mini_D11.webp', main: 'DMG_AMP' },
    pas: { k: 'amp', v: 0.12, txt: '双子：你所有造物造成的伤害 +12%。' },
    kit: ['i02', 'i21'],
    lore: '他和另一个自己轮流看摊，账目永远对不上。',
  },
  {
    id: 'hramona', n: '拉蒙娜', av: 'assets/bazaar/ramona.webp', realm: '混沌', role: '辅助型',
    wheel: { n: '溯洄时计', im: 'assets/bazaar/Weapon_Mini_C01.webp', main: 'KEYFLARE_REGEN' },
    pas: { k: 'tempo', v: 2, txt: '回溯：开战时所有造物的计时先走 2 拍。' },
    kit: ['i17', 'i01'],
    lore: '她把昨天卖出去的东西，今天又摆回了摊上。',
  },
  {
    id: 'hryker', n: '莱克', av: 'assets/bazaar/ryker.webp', realm: '混沌', role: '辅助型',
    wheel: { n: '好运时间', im: 'assets/bazaar/Weapon_Mini_C05.webp', main: 'SIGIL_YIELD' },
    pas: { k: 'ward', v: 6, txt: '错位外壳：每 6 拍获得 8 点护盾。' },
    kit: ['i15', 'i20'],
    lore: '他坚称自己不是狼，只是毛多了点、牙大了点。',
  },
  {
    id: 'hclementine', n: '克莱门汀', av: 'assets/bazaar/clementine.webp', realm: '超维', role: '辅助型',
    wheel: { n: '隐没的痛楚', im: 'assets/bazaar/Weapon_Mini_D13.webp', main: 'KEYFLARE_REGEN' },
    pas: { k: 'save', v: 40, txt: '催眠：每场战斗第一次生命跌破三成时，回复 40 点生命。' },
    kit: ['i13', 'i14'],
    lore: '医生开的药方是「多买点」，没人知道管不管用。',
  },
  {
    id: 'hsanga', n: '珊', av: 'assets/bazaar/sanga.webp', realm: '深海', role: '防御型',
    wheel: { n: '珊瑚女之死', im: 'assets/bazaar/Weapon_Mini_O08.webp', main: 'DEATH_RESISTANCE' },
    pas: { k: 'venom', v: 0.5, txt: '珊瑚毒：中毒伤害 +50%，每次施加中毒额外 +1 层。' },
    kit: ['i07', 'i08'],
    lore: '摊上摆的全是活的，会慢慢长满整张桌子。',
  },
];

// ---------------------------------------------------------------- 造物
// r：N / SR / SSR；cd 单位是「拍」；aura 类 cd=0。
export const ITEMS = [
  { id: 'i01', n: '锈蚀钢锯', im: 'assets/bazaar/Icon_Creation_009.webp', r: 'N', cost: 3, cd: 5, op: [{ k: 'dmg', v: 7 }] },
  { id: 'i02', n: '渔叉', im: 'assets/bazaar/Icon_Creation_106.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'dmg', v: 10 }] },
  { id: 'i03', n: '遗落的祭祀刀', im: 'assets/bazaar/Icon_Creation_032.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'dmg', v: 6, leech: 0.5 }] },
  { id: 'i04', n: '刺荨麻背心', im: 'assets/bazaar/Icon_Creation_030.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'dmg', v: 5 }, { k: 'shield', v: 5 }] },
  { id: 'i05', n: '三棱镜', im: 'assets/bazaar/Icon_Creation_017.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'dmg', v: 3, hits: 3 }] },
  { id: 'i06', n: '双生人偶', im: 'assets/bazaar/Icon_Creation_100.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'dmg', v: 4, hits: 2 }] },
  { id: 'i07', n: '神经毒素', im: 'assets/bazaar/Icon_Creation_029.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'poison', v: 4 }] },
  { id: 'i08', n: '瘟疫诊断书', im: 'assets/bazaar/Icon_Creation_008.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'dmg', v: 3 }, { k: 'poison', v: 3 }] },
  { id: 'i09', n: '须臾的火', im: 'assets/bazaar/Icon_Creation_137.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'burn', v: 5 }] },
  { id: 'i10', n: '守护之手', im: 'assets/bazaar/Icon_Creation_031.webp', r: 'N', cost: 3, cd: 5, op: [{ k: 'shield', v: 10 }] },
  { id: 'i11', n: '潜水头盔', im: 'assets/bazaar/Icon_Creation_003.webp', r: 'N', cost: 3, cd: 6, op: [{ k: 'shield', v: 7 }, { k: 'heal', v: 4 }] },
  { id: 'i12', n: '活性注射器', im: 'assets/bazaar/Icon_Creation_023.webp', r: 'N', cost: 3, cd: 5, op: [{ k: 'heal', v: 8 }] },
  { id: 'i13', n: '应急食品', im: 'assets/bazaar/Icon_Creation_134.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'heal', v: 6 }, { k: 'shield', v: 4 }] },
  { id: 'i14', n: '崭新的钱包', im: 'assets/bazaar/Icon_Creation_043.webp', r: 'N', cost: 3, cd: 4, op: [{ k: 'gold', v: 3 }] },
  { id: 'i15', n: '幸运兔脚', im: 'assets/bazaar/Icon_Creation_046.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'gold', v: 2 }, { k: 'dmg', v: 4 }] },
  { id: 'i16', n: '精密计时器', im: 'assets/bazaar/Icon_Creation_038.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'haste', v: 1 }] },
  { id: 'i17', n: '超弦怀表', im: 'assets/bazaar/Icon_Creation_018.webp', r: 'N', cost: 4, cd: 7, op: [{ k: 'charge', v: 2 }] },
  { id: 'i18', n: '群星之酒', im: 'assets/bazaar/Icon_Creation_040.webp', r: 'N', cost: 5, cd: 0, op: [{ k: 'aura', v: 2 }] },
  { id: 'i19', n: '母亲造像', im: 'assets/bazaar/Icon_Creation_101.webp', r: 'N', cost: 6, cd: 0, op: [{ k: 'aura', v: 3 }] },
  { id: 'i20', n: '哭泣烟斗', im: 'assets/bazaar/Icon_Creation_087.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'slow', v: 1 }] },
  { id: 'i21', n: '精制义眼', im: 'assets/bazaar/Icon_Creation_010.webp', r: 'N', cost: 4, cd: 5, op: [{ k: 'dmg', v: 8 }] },
  { id: 'i22', n: '红宝石胸针', im: 'assets/bazaar/Icon_Creation_024.webp', r: 'N', cost: 4, cd: 6, op: [{ k: 'dmg', v: 6 }, { k: 'shield', v: 3 }] },

  { id: 'i23', n: '骸骨杯盏', im: 'assets/bazaar/Icon_Creation_167.webp', r: 'SR', cost: 6, cd: 5, op: [{ k: 'dmg', v: 8 }, { k: 'heal', v: 5 }] },
  { id: 'i24', n: '黑烛', im: 'assets/bazaar/Icon_Creation_112.webp', r: 'SR', cost: 6, cd: 5, op: [{ k: 'burn', v: 8 }] },
  { id: 'i25', n: '黑星燃烧之烬', im: 'assets/bazaar/Icon_Creation_070.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 6 }, { k: 'burn', v: 4 }] },
  { id: 'i26', n: '深海戒指', im: 'assets/bazaar/Icon_Creation_144_AT.webp', r: 'SR', cost: 7, cd: 6, op: [{ k: 'slow', v: 2 }] },
  { id: 'i27', n: '血肉戒指', im: 'assets/bazaar/Icon_Creation_144.webp', r: 'SR', cost: 6, cd: 5, op: [{ k: 'heal', v: 10 }, { k: 'poison', v: 3 }] },
  { id: 'i28', n: '混沌戒指', im: 'assets/bazaar/Icon_Creation_144_CT.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 10, leech: 0.3 }] },
  { id: 'i29', n: '猫的宝藏', im: 'assets/bazaar/Icon_Creation_116.webp', r: 'SR', cost: 6, cd: 4, op: [{ k: 'gold', v: 5 }] },
  { id: 'i30', n: '大嘴纽扣', im: 'assets/bazaar/Icon_Creation_161.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 9, vsPoison: 6 }] },
  { id: 'i31', n: '老旧拼图', im: 'assets/bazaar/Icon_Creation_076.webp', r: 'SR', cost: 7, cd: 6, op: [{ k: 'charge', v: 2 }, { k: 'shield', v: 6 }] },
  { id: 'i32', n: '深渊通信', im: 'assets/bazaar/Icon_Creation_089.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 7, hits: 2 }] },
  { id: 'i33', n: '螺湮的欢愉', im: 'assets/bazaar/Icon_Creation_006.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 4, hits: 4 }] },
  { id: 'i34', n: '春之祭', im: 'assets/bazaar/Icon_Creation_065.webp', r: 'SR', cost: 6, cd: 5, op: [{ k: 'burn', v: 6 }, { k: 'heal', v: 5 }] },
  { id: 'i35', n: '哈福德灵药', im: 'assets/bazaar/Icon_Creation_067.webp', r: 'SR', cost: 6, cd: 5, op: [{ k: 'heal', v: 13 }] },
  { id: 'i36', n: '异种喉舌', im: 'assets/bazaar/Icon_Creation_111.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'poison', v: 7 }] },
  { id: 'i37', n: '白鸦喙', im: 'assets/bazaar/Icon_Creation_072.webp', r: 'SR', cost: 7, cd: 5, op: [{ k: 'dmg', v: 8, vsPoison: 8 }] },

  { id: 'i38', n: '寂静序曲', im: 'assets/bazaar/Icon_Creation_092.webp', r: 'SSR', cost: 9, cd: 6, op: [{ k: 'slow', v: 1 }, { k: 'shield', v: 10 }] },
  { id: 'i39', n: '辉光沙漏', im: 'assets/bazaar/Icon_Creation_016.webp', r: 'SSR', cost: 9, cd: 6, op: [{ k: 'haste', v: 2 }] },
  { id: 'i40', n: '恩赐之血', im: 'assets/bazaar/Icon_Creation_085.webp', r: 'SSR', cost: 9, cd: 5, op: [{ k: 'dmg', v: 9, leech: 1 }] },
  { id: 'i41', n: '异形之心', im: 'assets/bazaar/Icon_Creation_099.webp', r: 'SSR', cost: 9, cd: 5, op: [{ k: 'dmg', v: 10 }, { k: 'heal', v: 6 }] },
  { id: 'i42', n: '万花筒', im: 'assets/bazaar/Icon_Creation_080.webp', r: 'SSR', cost: 10, cd: 5, op: [{ k: 'dmg', v: 3, hits: 5 }] },
  { id: 'i43', n: '祭司权杖', im: 'assets/bazaar/Icon_Creation_069.webp', r: 'SSR', cost: 10, cd: 5, op: [{ k: 'dmg', v: 12 }, { k: 'poison', v: 3 }] },
];

// ---------------------------------------------------------------- 命轮（装备栏，最多 3 个）
// main 沿用原作的命轮主词条，效果按词条统一换算，名字与图标都是真的。
export const WHEELS = [
  { id: 'w01', n: '以蔷薇之名', im: 'assets/bazaar/Weapon_Mini_B04.webp', main: 'CRIT_RATE', cost: 6 },
  { id: 'w02', n: '旋转，旋转', im: 'assets/bazaar/Weapon_Mini_D01.webp', main: 'CRIT_RATE', cost: 7 },
  { id: 'w03', n: '血肉狂宴', im: 'assets/bazaar/Weapon_Mini_B07.webp', main: 'CRIT_DMG', cost: 6 },
  { id: 'w04', n: '安息之吻', im: 'assets/bazaar/Weapon_Mini_B10.webp', main: 'CRIT_DMG', cost: 7 },
  { id: 'w05', n: '挣脱锁链之日', im: 'assets/bazaar/Weapon_Mini_B05.webp', main: 'DMG_AMP', cost: 7 },
  { id: 'w06', n: '沉入殷红', im: 'assets/bazaar/Weapon_Mini_B05EX.webp', main: 'DMG_AMP', cost: 8 },
  { id: 'w07', n: '冬夜追忆', im: 'assets/bazaar/Weapon_Mini_B03.webp', main: 'KEYFLARE_REGEN', cost: 6 },
  { id: 'w08', n: '慈悲的哺育', im: 'assets/bazaar/Weapon_Mini_B01.webp', main: 'KEYFLARE_REGEN', cost: 7 },
  { id: 'w09', n: '神言石板', im: 'assets/bazaar/Weapon_Mini_B02.webp', main: 'SIGIL_YIELD', cost: 6 },
  { id: 'w10', n: '骑士之心', im: 'assets/bazaar/Weapon_Mini_C03.webp', main: 'SIGIL_YIELD', cost: 7 },
  { id: 'w11', n: '饕餮寓言', im: 'assets/bazaar/Weapon_Mini_B08.webp', main: 'REALM_MASTERY', cost: 7 },
  { id: 'w12', n: '记忆螺旋', im: 'assets/bazaar/Weapon_Mini_C07.webp', main: 'REALM_MASTERY', cost: 7 },
  { id: 'w13', n: '吞噬摇篮曲', im: 'assets/bazaar/Weapon_Mini_B09.webp', main: 'DEATH_RESISTANCE', cost: 6 },
  { id: 'w14', n: '坚韧意志', im: 'assets/bazaar/Weapon_Mini_C11.webp', main: 'DEATH_RESISTANCE', cost: 7 },
  { id: 'w15', n: '写实主义悖谬', im: 'assets/bazaar/Weapon_Mini_B12.webp', main: 'ALIEMUS_REGEN', cost: 6 },
  { id: 'w16', n: '超越死亡', im: 'assets/bazaar/Weapon_Mini_C02.webp', main: 'ALIEMUS_REGEN', cost: 7 },
];

// 命轮主词条 → 效果（数值是「一个命轮」的量，叠几个就是几倍）
export const WHEEL_FX = {
  CRIT_RATE: { txt: '暴击率 +9%', crit: 0.09 },
  CRIT_DMG: { txt: '暴击伤害 +45%', cdmg: 0.45 },
  DMG_AMP: { txt: '全场伤害 +7%', amp: 0.07 },
  KEYFLARE_REGEN: { txt: '每拍回复 1 点生命', regen: 1 },
  SIGIL_YIELD: { txt: '每场战斗结束额外 +3 金币', gold: 3 },
  REALM_MASTERY: { txt: '相邻造物伤害 +3', aura: 3 },
  DEATH_RESISTANCE: { txt: '战斗生命上限 +18', hp: 18 },
  ALIEMUS_REGEN: { txt: '每 4 拍获得 3 点护盾', ward: 4 },
};

// ---------------------------------------------------------------- 密契（开局三选一，全局加成）
export const PACTS = [
  { id: 'p01', n: '机械降神', im: 'assets/bazaar/Icon_Trinket_001.webp', k: 'cddown', v: 1, txt: '所有造物冷却 -1 拍（最低 2）。' },
  { id: 'p02', n: '猩红之拥', im: 'assets/bazaar/Icon_Trinket_004.webp', k: 'openshield', v: 20, txt: '每场战斗开始获得 20 点护盾。' },
  { id: 'p03', n: '生机榨取', im: 'assets/bazaar/Icon_Trinket_015.webp', k: 'leech', v: 0.15, txt: '造成伤害的 15% 转化为生命。' },
  { id: 'p04', n: '诅咒兔', im: 'assets/bazaar/Icon_Trinket_010.webp', k: 'discount', v: 0.2, txt: '集市所有标价 -20%。' },
  { id: 'p05', n: '二律背反', im: 'assets/bazaar/Icon_Trinket_011.webp', k: 'firstcrit', v: 2, txt: '每场战斗里第一件触发的造物，伤害 ×2。' },
  { id: 'p06', n: '光合祭礼', im: 'assets/bazaar/Icon_Trinket_012.webp', k: 'grow', v: 8, txt: '每赢一场，战斗生命上限 +8。' },
  { id: 'p07', n: '海归线', im: 'assets/bazaar/Icon_Trinket_013.webp', k: 'weaken', v: 0.1, txt: '敌方生命上限 -10%。' },
  { id: 'p08', n: '少女之蛹', im: 'assets/bazaar/Icon_Trinket_023.webp', k: 'rich', v: 8, txt: '开局多 8 金币，第一天摊位 +1。' },
];

// ---------------------------------------------------------------- 怪物（对手）
// skills 的 v 是「基准值」，实际伤害再乘当天的 dayAtk。
const sk = (n, cd, op) => ({ n, cd, op });
export const FOES = [
  {
    id: 'f01', n: '融蚀鼠王', im: 'assets/bazaar/Portrait_Small_Monster_S0201.webp', rank: 'normal', tag: '变异',
    skills: [sk('啃咬', 3, [{ k: 'dmg', v: 4 }]), sk('鼠群', 6, [{ k: 'dmg', v: 3, hits: 2 }])],
    desc: '下水道里长得最大的一只，靠啃别人剩下的摊位过活。',
  },
  {
    id: 'f02', n: '融蚀野犬', im: 'assets/bazaar/Portrait_Small_Monster_S0202.webp', rank: 'normal', tag: '变异',
    skills: [sk('连续撕咬', 4, [{ k: 'dmg', v: 3, hits: 2 }])],
    desc: '咬住就不松口，摊主都备着棍子。',
  },
  {
    id: 'f03', n: '双生脓疱', im: 'assets/bazaar/Portrait_Small_Monster_C0302.webp', rank: 'normal', tag: '血肉',
    skills: [sk('毒素', 4, [{ k: 'poison', v: 4 }]), sk('捶打', 5, [{ k: 'dmg', v: 5 }])],
    desc: '两个长在一起，分不清谁在说话。',
  },
  {
    id: 'f04', n: '提灯', im: 'assets/bazaar/Portrait_Small_Monster_S0401.webp', rank: 'normal', tag: '提灯教会',
    skills: [sk('惊厥', 4, [{ k: 'dmg', v: 4 }]), sk('出血', 6, [{ k: 'dmg', v: 3 }, { k: 'burn', v: 3 }])],
    desc: '一盏会自己走路的灯，跟着它的人都不见了。',
  },
  {
    id: 'f05', n: '提灯教众', im: 'assets/bazaar/Portrait_Small_Monster_S0402.webp', rank: 'normal', tag: '提灯教会',
    skills: [sk('祈祷', 5, [{ k: 'shield', v: 8 }]), sk('明灭', 5, [{ k: 'dmg', v: 5 }])],
    desc: '他们说光会照到所有人，只是有的先照到。',
  },
  {
    id: 'f06', n: '蜡像绅士', im: 'assets/bazaar/Portrait_Small_Monster_C0202.webp', rank: 'normal', tag: '蜡像',
    skills: [sk('蜡像登场', 6, [{ k: 'shield', v: 10 }]), sk('凝固', 5, [{ k: 'dmg', v: 6 }])],
    desc: '彬彬有礼，只是手一直在化。',
  },
  {
    id: 'f07', n: '手术医生', im: 'assets/bazaar/Portrait_Small_Monster_C0103_AT.webp', rank: 'normal', tag: '医院',
    skills: [sk('手术切割', 5, [{ k: 'dmg', v: 5 }, { k: 'burn', v: 2 }]), sk('手术准备', 7, [{ k: 'heal', v: 8 }])],
    desc: '他不收钱，只收「样本」。',
  },
  {
    id: 'f08', n: '裁缝', im: 'assets/bazaar/Portrait_Small_Monster_C0102_AT.webp', rank: 'normal', tag: '蜡像',
    skills: [sk('缝合', 5, [{ k: 'dmg', v: 6 }])],
    desc: '它想给你量尺寸，别答应。',
  },
  {
    id: 'f09', n: '蹈海者', im: 'assets/bazaar/Portrait_Small_Monster_C0502.webp', rank: 'normal', tag: '深海',
    skills: [sk('猎物标记', 7, [{ k: 'slow', v: 1 }]), sk('猎矛突刺', 4, [{ k: 'dmg', v: 4 }])],
    desc: '从水里来的东西，走起路像在踩浪。',
  },
  {
    id: 'f10', n: '俯仰者', im: 'assets/bazaar/Portrait_Small_Monster_S0302_BT.webp', rank: 'normal', tag: '教会',
    skills: [sk('远古的呼唤', 6, [{ k: 'poison', v: 5 }]), sk('跪拜', 5, [{ k: 'dmg', v: 5 }])],
    desc: '它一直在往上看，没人知道在看什么。',
  },
  {
    id: 'f11', n: '创痛疯马', im: 'assets/bazaar/Portrait_Small_Monster_S0203.webp', rank: 'elite', tag: '梦魇',
    skills: [sk('垂死之挣', 3, [{ k: 'dmg', v: 4 }]), sk('践踏', 6, [{ k: 'dmg', v: 9 }])],
    desc: '被疼痛养大的马，跑起来会掉零件。',
  },
  {
    id: 'f12', n: '「永恒助祭」', im: 'assets/bazaar/Portrait_Small_Monster_C0503.webp', rank: 'elite', tag: '教会',
    skills: [sk('噬咬', 4, [{ k: 'dmg', v: 6 }]), sk('迟缓迷毒', 6, [{ k: 'poison', v: 6 }]), sk('试探', 5, [{ k: 'shield', v: 8 }])],
    desc: '教会里活得最久的那位，久到没人记得它原来是什么。',
  },
  {
    id: 'f13', n: '库姆', im: 'assets/bazaar/Portrait_Small_Monster_C0303.webp', rank: 'elite', tag: '血肉',
    skills: [sk('警戒', 6, [{ k: 'shield', v: 12 }]), sk('撕咬', 4, [{ k: 'dmg', v: 6 }])],
    desc: '一团会呼吸的肉，护着更里面的东西。',
  },
  {
    id: 'f14', n: '维度猎手', im: 'assets/bazaar/Portrait_Small_Monster_C0402.webp', rank: 'elite', tag: '超维',
    skills: [sk('封印', 7, [{ k: 'slow', v: 2 }]), sk('追猎', 4, [{ k: 'dmg', v: 5, hits: 2 }])],
    desc: '它在你转身的缝里等着。',
  },
  {
    id: 'f15', n: '「远洋回忆」', im: 'assets/bazaar/Portrait_Small_Monster_C0504_BT.webp', rank: 'elite', tag: '深海',
    skills: [sk('溺毙之怨', 5, [{ k: 'dmg', v: 7 }, { k: 'poison', v: 3 }]), sk('遗恨', 6, [{ k: 'burn', v: 7 }])],
    desc: '一整支船队压在水底，像一块没化开的墨。',
  },
  {
    id: 'f16', n: '「寄主」', im: 'assets/bazaar/Portrait_Small_Monster_C0602.webp', rank: 'elite', tag: '教会',
    skills: [sk('虔诚', 6, [{ k: 'heal', v: 12 }]), sk('标记猎物', 5, [{ k: 'dmg', v: 7 }])],
    desc: '它把摊主养得很好，只是为了以后。',
  },
  {
    id: 'f17', n: '超脱之俯仰', im: 'assets/bazaar/Portrait_Small_Monster_S0302_AT.webp', rank: 'elite', tag: '教会',
    skills: [sk('狂气吸收', 5, [{ k: 'dmg', v: 5, leech: 0.5 }]), sk('远古的呼唤', 6, [{ k: 'poison', v: 7 }])],
    desc: '它已经不需要眼睛了。',
  },
  {
    id: 'f18', n: '「恩瑟雷的回音」', im: 'assets/bazaar/Portrait_Small_Monster_C0603_AT.webp', rank: 'elite', tag: '深海',
    skills: [sk('恶诞', 5, [{ k: 'dmg', v: 8 }]), sk('深海洗礼', 7, [{ k: 'shield', v: 14 }, { k: 'heal', v: 6 }]), sk('离散', 6, [{ k: 'slow', v: 1 }])],
    desc: '海在它身体里回响，听得久了会想跟着唱。',
  },
  {
    id: 'f19', n: '「守灯人」', im: 'assets/bazaar/Portrait_Small_Monster_S0402_BOSSSIZE.webp', rank: 'boss', tag: '提灯教会',
    skills: [sk('惊厥', 4, [{ k: 'dmg', v: 5 }]), sk('出血', 5, [{ k: 'dmg', v: 4 }, { k: 'burn', v: 4 }]), sk('祈祷', 7, [{ k: 'shield', v: 16 }])],
    desc: '所有提灯都是从他手上点起来的。',
  },
  {
    id: 'f20', n: '「劳伦斯先生」', im: 'assets/bazaar/Portrait_Small_Monster_C0202_BOSSSIZE.webp', rank: 'boss', tag: '蜡像',
    skills: [sk('蜡油', 4, [{ k: 'burn', v: 6 }]), sk('隆重接待', 6, [{ k: 'dmg', v: 10 }]), sk('凝固', 6, [{ k: 'shield', v: 14 }])],
    desc: '他记得每一个来过店里的客人，连尺寸都记得。',
  },
  {
    id: 'f21', n: '「波纳佩颂歌」', im: 'assets/bazaar/Portrait_Small_Monster_C0503_BOSSSIZE.webp', rank: 'boss', tag: '深海',
    skills: [sk('群蛇撕裂', 5, [{ k: 'dmg', v: 4, hits: 3 }]), sk('迟滞入骨', 6, [{ k: 'slow', v: 2 }]), sk('迟滞', 7, [{ k: 'poison', v: 8 }])],
    desc: '一首没有唱完的颂歌，剩下的部分在它肚子里。',
  },
  {
    id: 'f22', n: '暴走猎颅者', im: 'assets/bazaar/Portrait_Small_Monster_DCD02_02_BOSSSIZE.webp', rank: 'boss', tag: '超维',
    skills: [sk('狩猎仪式', 5, [{ k: 'dmg', v: 7 }, { k: 'shield', v: 8 }]), sk('裂颅一击', 4, [{ k: 'dmg', v: 6 }]), sk('割喉挥砍', 6, [{ k: 'dmg', v: 9, leech: 0.5 }])],
    desc: '它收集的不是钱，是脑袋；你的摊位只是路过。',
  },
];

// 每天出场的怪物（12 天）。名称只是「这一档」，实际每局从对应池里抽。
export const SCHEDULE = [
  { day: 1, pool: ['f01', 'f02', 'f04'], boss: false },
  { day: 2, pool: ['f02', 'f03', 'f05'], boss: false },
  { day: 3, pool: ['f04', 'f06', 'f07'], boss: false },
  { day: 4, pool: ['f05', 'f08', 'f09'], boss: false },
  { day: 5, pool: ['f07', 'f09', 'f10'], boss: false },
  { day: 6, pool: ['f10', 'f08', 'f11'], boss: false },
  { day: 7, pool: ['f11', 'f12', 'f13'], boss: false },
  { day: 8, pool: ['f13', 'f14', 'f15'], boss: false },
  { day: 9, pool: ['f14', 'f16', 'f17'], boss: false },
  { day: 10, pool: ['f15', 'f17', 'f18'], boss: false },
  { day: 11, pool: ['f18', 'f16', 'f19'], boss: true },
  { day: 12, pool: ['f19', 'f20', 'f21', 'f22'], boss: true },
];

export const REALM_COLOR = { 混沌: '#b0483f', 血肉: '#8a5a2b', 深海: '#2f6b7a', 超维: '#5b4b8a' };
