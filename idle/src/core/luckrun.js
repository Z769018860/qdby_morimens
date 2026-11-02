// 疾驰欢愉的大运：类杀戮尖塔的三层挑战。
//
// 一局 = 3 层，每层 12 个节点（其中 10 场战斗：7 普通 + 2 精英 + 1 首领，另有 1 个事件、1 个商店）。
// 打完一场从「增益 / 造物 / 专属强化」里挑一个；血量在节点之间继承，不会自动回满——这是爬塔的压力来源。
//
// 这一层只放**纯逻辑**：地图模板、战斗准备、结算、奖励池、商店、事件、分数、等级、天赋、成就。
// 所有函数都吃 (state, data, run) 这三个纯数据，不碰 DOM、不读时间——所以能直接在 Node 里跑完整一局做体检。
import { hash, mulberry32 } from './rng.js';
import { simulate, roundLimitFor } from './battle.js';
import { buildEnemies, domainRules, lateDotBoost } from './enemies.js';
import { teamDefs } from './game.js';

export const LUCK_ACTS = 3;
export const LUCK_NODES = 12;        // 每层节点数（战斗 10 + 事件 1 + 商店 1）
export const LUCK_REROLLS = 1;       // 每局白送的奖励重掷次数

// 每层的节点模板。战斗节点在「首领」那一格收尾，精英放在第 5、第 10 格——
// 前后两段各一场硬仗，中间用事件 / 商店隔开，不至于连打四场把人打空。
export const NODE_PLAN = [
  'battle', 'battle', 'event', 'battle', 'elite', 'battle',
  'shop', 'battle', 'battle', 'elite', 'battle', 'boss',
];

/** 五档难度：scale 是敌人血量 / 攻击的倍率，mult 是结算分数倍率，lv 是推荐的平均等级 */
export const LUCK_DIFFS = [
  { id: 'stroll', zh: '闲庭', lv: 30, scale: 0.82, mult: 1.0, note: '给第一次坐上大运的旅人' },
  { id: 'ride', zh: '疾驰', lv: 60, scale: 1.0, mult: 1.6, note: '标准的车速，推荐从这里开始' },
  { id: 'fortune', zh: '大运', lv: 90, scale: 1.18, mult: 2.4, note: '怪物的血和拳头都厚一档' },
  { id: 'defy', zh: '逆天', lv: 120, scale: 1.38, mult: 3.4, note: '给已经打穿三层还想再快一点的人' },
  // 第五档：满配（叠位 + 超限 + 满装）才有意义，分数倍率单独拉高一截，
  // 30 级的那条长阶梯主要靠它推进
  { id: 'void', zh: '无疆', lv: 150, scale: 1.58, mult: 4.6, note: '怪物的身板和拳头都按满配算，给把逆天当日常的人' },
  // 前五档只调「同一关的敌人多硬」，主线通关 80 层的队伍能随便满血打穿。后三档多了两样东西：
  //   stage：敌人的强度档位整体往后挪（≈主线第 N 关 + stage），第 91 关起主线才有的域规（屏障 / 反震 / 压疗 / 重甲 / 封印）也跟着上；
  //   scale：在挪档之上再乘一层。分数倍率同步拉高，等级阶梯（60 级）靠它们推进。
  { id: 'ruin', zh: '劫数', lv: 190, scale: 1.7, stage: 14, mult: 6.4, note: '强度挪到主线 90 关档，域规开始出现：屏障、反震、压疗、重甲、封印轮着来' },
  { id: 'fate', zh: '天命', lv: 240, scale: 2.05, stage: 26, mult: 9.0, note: '主线 100+ 关的敌人加一层厚血，几乎每场都要带着解法才打得过' },
  { id: 'apex', zh: '终途', lv: 300, scale: 2.5, stage: 40, mult: 13.0, note: '给通关主线、阵容与装备都练到头的人：第一层就是连环硬仗，没有解法走不完' },
  // 后期队伍的两档：前面都能稳过之后再往上走。强度档位继续后挪（≈主线第 100~150 关），域规全程在线
  { id: 'cycle', zh: '轮回', lv: 360, scale: 3.0, stage: 56, mult: 18.0, note: '强度挪到主线 100 关以后：每一层都带域规，造物 / 天赋 / 专属强化缺一块就走不完' },
  { id: 'abyss', zh: '归墟', lv: 440, scale: 3.6, stage: 72, mult: 25.0, note: '大运的尽头：满配、满天赋、满造物构筑的队伍才有机会，容错几乎为零' },
];
export const diffOf = (id) => LUCK_DIFFS.find((d) => d.id === id) || LUCK_DIFFS[1];

// ------------------------------------------------------------------ 增益
// 战后三选一里最常见的一类：纯数值累加。key 直接对应 unit def 上的字段名，
// hp / atk / def 是百分比，其余按绝对值加点（critRate 是百分点，amp 同理）。
export const LUCK_BUFFS = [
  { id: 'b_atk', zh: '战意上涌', desc: '全队攻击 +9%', tag: '攻', key: 'atk', v: 9 },
  { id: 'b_hp', zh: '血脉贲张', desc: '全队生命 +11%', tag: '生', key: 'hp', v: 11 },
  { id: 'b_def', zh: '铁壁', desc: '全队防御 +10%', tag: '守', key: 'def', v: 10 },
  { id: 'b_crit', zh: '锋锐', desc: '全队暴击率 +5%', tag: '暴', key: 'critRate', v: 5 },
  { id: 'b_cdmg', zh: '致命', desc: '全队暴击伤害 +16%', tag: '暴', key: 'critDmg', v: 16 },
  { id: 'b_amp', zh: '穿透', desc: '全队增伤 +11%（毒 / 流血 / 反击一样吃）', tag: '伤', key: 'amp', v: 11 },
  { id: 'b_heal', zh: '回春', desc: '全队治疗加成 +22%', tag: '愈', key: 'healBonus', v: 22 },
  { id: 'b_shield', zh: '护壁', desc: '全队护盾加成 +25%', tag: '盾', key: 'shieldBonus', v: 25 },
  { id: 'b_steal', zh: '嗜血', desc: '全队吸血 +7%', tag: '血', key: 'steal', v: 7 },
  { id: 'b_first', zh: '先手', desc: '全队首击加成 +18%', tag: '先', key: 'firstBoost', v: 18 },
  { id: 'b_ali', zh: '共鸣', desc: '全队共鸣回复 +18%', tag: '鸣', key: 'aliGain', v: 18 },
  { id: 'b_key', zh: '钥焰', desc: '全队钥焰回复 +18%', tag: '钥', key: 'keyGain', v: 18 },
  // 两条「保命」取向的增益：生存压力大的中后期，比再多的攻击都实在
  { id: 'b_survive', zh: '韧性', desc: '全队濒死存活 +7%（触发一次后概率折半，可连续触发）', tag: '韧', key: 'surviveChance', v: 0.07 },
  { id: 'b_shieldopen', zh: '铁幕', desc: '每场战斗开局全队获得 12% 最大生命的护盾', tag: '幕', key: 'shield', v: 12 },
];

// ------------------------------------------------------------------ 造物
// 造物是「整局一直生效」的被动，同一件不会重复出现。
// mod 只写它会碰到的那几个字段（跑战斗前累加到 modsOf 的结果上），
// run 级的（战后回血 / 商店折扣 / 结算加成……）在下面各处的计算里单独读。
export const LUCK_RELICS = [
  { id: 'r_bloodpact', zh: '血契', desc: '全队攻击 +16%，但每场战斗后全队失去 6% 生命', mod: { atk: 16 }, after: -6 },
  { id: 'r_bulwark', zh: '不破之壁', desc: '全队防御 +18%，开局护盾 12% 最大生命', mod: { def: 18, shield: 12 } },
  { id: 'r_vitality', zh: '生之鼓动', desc: '全队生命 +18%', mod: { hp: 18 } },
  { id: 'r_ember', zh: '余烬', desc: '全队增伤 +9%', mod: { amp: 9 } },
  { id: 'r_edge', zh: '锋刃', desc: '全队暴击率 +8%、暴击伤害 +20%', mod: { critRate: 8, critDmg: 20 } },
  { id: 'r_haste', zh: '疾行之靴', desc: '全队首击加成 +28%', mod: { firstBoost: 28 } },
  { id: 'r_vampire', zh: '饮血', desc: '全队吸血 +10%', mod: { steal: 10 } },
  { id: 'r_phoenix', zh: '不死鸟之羽', desc: '全队获得 25% 濒死存活', mod: { surviveChance: 0.25 } },
  { id: 'r_spring', zh: '涌泉', desc: '每场战斗结束后全队回复 14% 生命', after: 14 },
  { id: 'r_glutton', zh: '饕餮', desc: '每场战斗额外获得 8 余晖', glow: 8 },
  { id: 'r_purse', zh: '鼓胀钱袋', desc: '开局额外带 40 余晖，商店价格 -15%', start: 40, discount: 0.15 },
  { id: 'r_gambler', zh: '赌徒之骰', desc: '战后的奖励多一个选项（四选一）', extra: 1 },
  { id: 'r_scout', zh: '斥候', desc: '事件里的收益 +60%', event: 0.6 },
  { id: 'r_lantern', zh: '长明灯', desc: '全队治疗加成 +30%', mod: { healBonus: 30 } },
  { id: 'r_aegis', zh: '黑铁壁障', desc: '全队护盾加成 +35%', mod: { shieldBonus: 35 } },
  { id: 'r_tide', zh: '潮汐', desc: '全队共鸣回复 +25%、钥焰回复 +25%', mod: { aliGain: 25, keyGain: 25 } },
  { id: 'r_twin', zh: '双生纹章', desc: '全队暴击率 +6%，首击加成 +14%', mod: { critRate: 6, firstBoost: 14 } },
  { id: 'r_mercy', zh: '慈悲之证', desc: '每场战斗结束后回复 8% 生命，事件收益 +30%', after: 8, event: 0.3 },
  { id: 'r_greed', zh: '贪婪之眼', desc: '结算分数 +12%', score: 0.12 },
  { id: 'r_lucky', zh: '幸运星', desc: '奖励重掷次数 +2', reroll: 2 },
  // ---- 第二批：给「整局节奏」类的新机制，而不只是数值 ----
  { id: 'r_revive', zh: '不灭余烬', desc: '每层一次：有队员倒下时，以 30% 生命把他拉起来', revive: 0.3 },
  { id: 'r_sniper', zh: '猎手徽记', desc: '精英战与首领战的分数 +40%', eliteScore: 0.4 },
  { id: 'r_anchor', zh: '压舱石', desc: '每层开局全队额外回复 12% 生命', act: 12 },
  { id: 'r_cache', zh: '藏宝匣', desc: '每打赢一场额外得 5 余晖，商店价格 -10%', glow: 5, discount: 0.1 },
  { id: 'r_frenzy', zh: '狂乱', desc: '全队攻击 +12%、暴击率 +10%，但每场战斗后失去 4% 生命', mod: { atk: 12, critRate: 10 }, after: -4 },
  { id: 'r_siphon', zh: '汲魂', desc: '全队吸血 +6%、增伤 +6%', mod: { steal: 6, amp: 6 } },
  { id: 'r_ledger', zh: '旅团账本', desc: '开局额外带 60 余晖，事件收益 +30%', start: 60, event: 0.3 },
  { id: 'r_torch', zh: '长明火把', desc: '全队增伤 +7%、首击加成 +12%', mod: { amp: 7, firstBoost: 12 } },
];
export const relicOf = (id) => LUCK_RELICS.find((r) => r.id === id) || null;

// ------------------------------------------------------------------ 专属强化
// 每个唤醒体都有自己的两档强化，按「定位」给方向：突击吃伤害、守护吃身板与护盾、合唱吃治疗与增伤。
// 名字是「角色名 · 强化名」，所以 70 多位角色一共能凑出上百条，不用逐条手写也不会重复。
const UP_THEME = {
  ASSAULT: [
    { zh: '破阵', desc: (z) => `${z} 攻击 +22%、暴击伤害 +25%`, mod: { atk: 22, critDmg: 25 } },
    { zh: '追猎', desc: (z) => `${z} 攻击 +14%、暴击率 +12%、增伤 +10%`, mod: { atk: 14, critRate: 12, amp: 10 } },
  ],
  WARDEN: [
    { zh: '不动', desc: (z) => `${z} 生命 +25%、防御 +30%`, mod: { hp: 25, def: 30 } },
    { zh: '守望', desc: (z) => `${z} 生命 +16%、护盾加成 +45%、濒死存活 +20%`, mod: { hp: 16, shieldBonus: 45, surviveChance: 0.2 } },
  ],
  CHORUS: [
    { zh: '共奏', desc: (z) => `${z} 治疗加成 +50%、共鸣回复 +30%`, mod: { healBonus: 50, aliGain: 30 } },
    { zh: '和声', desc: (z) => `${z} 增伤 +16%、钥焰回复 +30%、暴击率 +8%`, mod: { amp: 16, keyGain: 30, critRate: 8 } },
  ],
};
const upTheme = (type) => UP_THEME[type] || UP_THEME.ASSAULT;

/** 某个角色的第 i 档专属强化（0 / 1）。确定性生成，同一角色永远同样两条。 */
export function charUp(slug, data, i = 0) {
  const a = data.bySlug[slug];
  if (!a) return null;
  const th = upTheme(a.type)[i % 2];
  return { id: `u_${slug}_${i % 2}`, slug, zh: `${a.zh} · ${th.zh}`, desc: th.desc(a.zh), mod: th.mod };
}

// ------------------------------------------------------------------ 事件
// 每个事件两三个选项，代价和收益都写在明面上——爬塔里的选择应该能算，而不是赌。
// 收益统一走 gain 里的字段：glow（余晖）/ heal（回血 %）/ maxhp（生命上限 %）/ relic（白给造物）/
// buff（白给增益）/ score（分数）。
export const LUCK_EVENTS = [
  {
    id: 'e_merchant', zh: '流浪商队', text: '篷车停在路边，商人掀开帘子：「赶路的人，要不要换点东西？」',
    opts: [
      { k: '买下护符', desc: '花 30 余晖，换一件造物', cost: 30, gain: { relic: 1 } },
      { k: '卖点旧货', desc: '得 35 余晖，全队失去 8% 生命', gain: { glow: 35, heal: -8 } },
      { k: '聊两句就走', desc: '得 10 余晖', gain: { glow: 10 } },
    ],
  },
  {
    id: 'e_spring', zh: '温热的泉眼', text: '石头缝里冒出一股热水，硫磺味呛人，但水是干净的。',
    opts: [
      { k: '泡一会儿', desc: '全队回复 28% 生命', gain: { heal: 28 } },
      { k: '灌满水袋', desc: '全队回复 12% 生命，得 20 余晖', gain: { heal: 12, glow: 20 } },
    ],
  },
  {
    id: 'e_shrine', zh: '无名的祭坛', text: '祭坛上摆着一枚磨得发亮的硬币，看起来已经放了很久。',
    opts: [
      { k: '投一枚硬币', desc: '花 20 余晖，队伍生命上限 +6%', cost: 20, gain: { maxhp: 6 } },
      { k: '把硬币拿走', desc: '得 40 余晖，全队失去 10% 生命', gain: { glow: 40, heal: -10 } },
      { k: '绕过去', desc: '什么都不发生', gain: {} },
    ],
  },
  {
    id: 'e_wreck', zh: '失控的货车', text: '一辆大运歪在路边，车厢里散落着不少东西，也散落着不少碎片。',
    opts: [
      { k: '翻找车厢', desc: '得 45 余晖，全队失去 12% 生命', gain: { glow: 45, heal: -12 } },
      { k: '拆下轮轴', desc: '全队首击加成永久 +10%', gain: { buff: 'b_first' } },
    ],
  },
  {
    id: 'e_mirror', zh: '照不出人的镜子', text: '镜面很干净，但里面没有你。',
    opts: [
      { k: '伸手触碰', desc: '全队增伤永久 +12%，失去 9% 生命', gain: { buff: 'b_amp', heal: -9 } },
      { k: '砸了它', desc: '得 25 余晖，分数 +60', gain: { glow: 25, score: 60 } },
    ],
  },
  {
    id: 'e_dice', zh: '掷骰的旅人', text: '「赌一把？赢了归你，输了……留下点东西。」',
    opts: [
      { k: '押上 25 余晖', desc: '五成得一件造物，五成失去 12% 生命', cost: 25, gain: { gamble: 0.5 } },
      { k: '不赌', desc: '得 8 余晖', gain: { glow: 8 } },
    ],
  },
  {
    id: 'e_pilgrim', zh: '同行的旅人', text: '对方背着和你一样的行囊，笑着说：「前面的路我熟。」',
    opts: [
      { k: '听他讲讲', desc: '全队生命 +8%', gain: { heal: 15, maxhp: 8 } },
      { k: '换点补给', desc: '花 25 余晖，全队回复 35% 生命', cost: 25, gain: { heal: 35 } },
    ],
  },
  {
    id: 'e_bell', zh: '路边的铜钟', text: '钟身上刻着看不清的字，绳子就在手边。',
    opts: [
      { k: '敲一下', desc: '分数 +120，全队失去 7% 生命', gain: { score: 120, heal: -7 } },
      { k: '敲三下', desc: '分数 +260，全队失去 18% 生命', gain: { score: 260, heal: -18 } },
      { k: '不碰', desc: '得 12 余晖', gain: { glow: 12 } },
    ],
  },
  // ---- 第二批事件：把「生命上限 / 重掷 / 专属强化」这些之前没用上的收益写进来 ----
  {
    id: 'e_blackmarket', zh: '黑市摊位', text: '摊主把货压在布下面，只露出一角：「不看是什么，价钱好说。」',
    opts: [
      { k: '买一只封好的匣子', desc: '花 45 余晖，换一件造物', cost: 45, gain: { relic: 1 } },
      { k: '买两次手气', desc: '花 30 余晖，重掷次数 +2', cost: 30, gain: { reroll: 2 } },
      { k: '只看不买', desc: '得 12 余晖', gain: { glow: 12 } },
    ],
  },
  {
    id: 'e_scavenger', zh: '拾荒的老人', text: '老人蹲在废墟边分拣铁片，抬头看你一眼，又低头继续分。',
    opts: [
      { k: '帮他分一会儿', desc: '得 30 余晖，重掷次数 +1', gain: { glow: 30, reroll: 1 } },
      { k: '买下他捡到的护符', desc: '花 35 余晖，换一件造物', cost: 35, gain: { relic: 1 } },
      { k: '分他半份干粮', desc: '全队回复 16% 生命', gain: { heal: 16 } },
    ],
  },
  {
    id: 'e_idol', zh: '没有脸的神像', text: '石像的脸被磨平了，底座上还堆着没烂完的供品。',
    opts: [
      { k: '献上血', desc: '全队生命上限 +12%，失去 15% 当前生命', gain: { maxhp: 12, heal: -15 } },
      { k: '拿走供品', desc: '得 35 余晖，全队失去 6% 生命', gain: { glow: 35, heal: -6 } },
      { k: '行礼后离开', desc: '分数 +80', gain: { score: 80 } },
    ],
  },
  {
    id: 'e_thorn', zh: '藤蔓拦路', text: '整条路被带刺的藤蔓封住了，另一侧是看不到底的坡。',
    opts: [
      { k: '硬砍过去', desc: '全队失去 14% 生命，得 50 余晖', gain: { heal: -14, glow: 50 } },
      { k: '从坡上绕下去', desc: '全队失去 5% 生命，分数 +120', gain: { heal: -5, score: 120 } },
      { k: '花时间清出一条路', desc: '花 25 余晖，重掷次数 +2', cost: 25, gain: { reroll: 2 } },
    ],
  },
  {
    id: 'e_chorus', zh: '月下的合唱', text: '不知道是谁先起的头，营地那头有人在唱，调子很旧。',
    opts: [
      { k: '跟着一起唱', desc: '全队回复 18% 生命，随机一人获得专属强化', gain: { heal: 18, up: 1 } },
      { k: '安静地听', desc: '分数 +140，全队回复 6% 生命', gain: { score: 140, heal: 6 } },
    ],
  },
  {
    id: 'e_veteran', zh: '断手的老兵', text: '他正用一只手给刀上油，动作比很多两只手的人都稳。',
    opts: [
      { k: '请他喝一杯', desc: '花 20 余晖，全队攻击永久 +9%', cost: 20, gain: { buff: 'b_atk' } },
      { k: '听他讲过去', desc: '全队生命上限 +6%，回复 12% 生命', gain: { maxhp: 6, heal: 12 } },
      { k: '帮他把行李搬过去', desc: '得 25 余晖', gain: { glow: 25 } },
    ],
  },
  {
    id: 'e_well', zh: '枯井', text: '井绳还在，桶放下去很久才听到回声。',
    opts: [
      { k: '打一桶上来', desc: '全队回复 22% 生命', gain: { heal: 22 } },
      { k: '往井里扔石头', desc: '得 20 余晖，分数 +60', gain: { glow: 20, score: 60 } },
      { k: '在井边歇一会儿', desc: '重掷次数 +1，回复 10% 生命', gain: { reroll: 1, heal: 10 } },
    ],
  },
  {
    id: 'e_auction', zh: '路边的竞拍', text: '一群人围着一只箱子叫价，主持的人笑得很有把握。',
    opts: [
      { k: '出价 60 余晖', desc: '花 60 余晖，换一件造物，分数 +100', cost: 60, gain: { relic: 1, score: 100 } },
      { k: '抬价之后退出', desc: '得 30 余晖，全队失去 5% 生命', gain: { glow: 30, heal: -5 } },
      { k: '站着看热闹', desc: '分数 +90', gain: { score: 90 } },
    ],
  },
];

// ------------------------------------------------------------------ 天赋
// 大运专用天赋：花「天赋点」永久强化所有未来的局。价格递增。
// 30 级一共 30 点，这里 12 项合计 38 点上限——够点满一半多一点，得挑方向。
export const LUCK_TALENTS = [
  { id: 't_vigor', zh: '底子', desc: '全队生命 +6% / 级', cost: [1, 2, 3, 4], key: 'hp', per: 6 },
  { id: 't_edge', zh: '手感', desc: '全队攻击 +5% / 级', cost: [1, 2, 3, 4], key: 'atk', per: 5 },
  { id: 't_guard', zh: '护身', desc: '全队防御 +6% / 级', cost: [1, 2, 3], key: 'def', per: 6 },
  { id: 't_crit', zh: '眼力', desc: '全队暴击率 +3% / 级', cost: [1, 2, 3], key: 'critRate', per: 3 },
  { id: 't_cdmg', zh: '狠劲', desc: '全队暴击伤害 +8% / 级', cost: [1, 2, 3], key: 'critDmg', per: 8 },
  { id: 't_amp', zh: '狠手', desc: '全队增伤 +5% / 级', cost: [2, 3, 4], key: 'amp', per: 5 },
  { id: 't_aegis', zh: '壁垒', desc: '全队护盾加成 +12% / 级', cost: [1, 2, 2], key: 'shieldBonus', per: 12 },
  { id: 't_purse', zh: '路费', desc: '开局多带 20 余晖 / 级', cost: [1, 2, 2], key: 'start', per: 20 },
  { id: 't_discount', zh: '熟人', desc: '商店价格 -8% / 级', cost: [1, 2, 3], key: 'discount', per: 8 },
  { id: 't_insight', zh: '复盘', desc: '每场战斗后回复 5% 生命 / 级', cost: [1, 2, 3], key: 'after', per: 5 },
  { id: 't_score', zh: '好运', desc: '结算分数 +6% / 级', cost: [2, 3, 4], key: 'score', per: 6 },
  { id: 't_luck', zh: '手气', desc: '每局多 2 次奖励重掷 / 级', cost: [1, 2, 2], key: 'reroll', per: 2 },
];

// ------------------------------------------------------------------ 成就
export const LUCK_ACH = [
  { id: 'a_first', zh: '第一趟车', desc: '通过大运的第一层', reward: { gold: 1200, cores: 20 } },
  { id: 'a_clear', zh: '三层通关', desc: '完整走完三层', reward: { gold: 3000, cores: 60, tickets: 2 } },
  { id: 'a_defy', zh: '逆天而行', desc: '在「逆天」难度下通关', reward: { gold: 6000, cores: 120, tickets: 5 } },
  { id: 'a_1500', zh: '一路轰鸣', desc: '单局得分达到 1500', reward: { gold: 2000, cores: 40 } },
  { id: 'a_3500', zh: '疾驰如风', desc: '单局得分达到 3500', reward: { gold: 5000, cores: 100, tickets: 3 } },
  { id: 'a_relic8', zh: '收藏家', desc: '单局拿到 8 件造物', reward: { gold: 2500, cores: 50 } },
  { id: 'a_flawless', zh: '毫发无伤', desc: '通关时全队生命都在 70% 以上', reward: { gold: 4000, cores: 80, tickets: 2 } },
  { id: 'a_rich', zh: '余晖满仓', desc: '单局结束时持有 300 以上余晖', reward: { gold: 1800, cores: 30 } },
  // 第二批：给 30 级长阶梯配的里程碑，奖励里带免费回溯券
  { id: 'a_score6000', zh: '一骑绝尘', desc: '单局得分达到 6000', reward: { gold: 6000, cores: 120, tickets: 3, rw: 1 } },
  { id: 'a_relic12', zh: '满载而归', desc: '单局拿到 12 件造物', reward: { gold: 3500, cores: 70 } },
  { id: 'a_glow500', zh: '余晖堆成山', desc: '单局结束时持有 500 以上余晖', reward: { gold: 2600, cores: 45 } },
  { id: 'a_clear5', zh: '大运常客', desc: '累计通关 5 次', reward: { gold: 5000, cores: 90, tickets: 2, rw: 1 } },
  // 第三批：给「劫数 / 天命 / 终途」三档新难度和 60 级阶梯配的里程碑
  { id: 'a_ruin', zh: '劫数难逃', desc: '在「劫数」难度下通关', reward: { gold: 12000, cores: 200, tickets: 6, rw: 1 } },
  { id: 'a_fate', zh: '天命所归', desc: '在「天命」难度下通关', reward: { gold: 24000, cores: 320, tickets: 10, rw: 2 } },
  { id: 'a_apex', zh: '终途之上', desc: '在「终途」难度下通关', reward: { gold: 50000, cores: 600, tickets: 20, rw: 3 } },
  { id: 'a_cycle', zh: '轮回不止', desc: '在「轮回」难度下通关', reward: { gold: 90000, cores: 900, tickets: 30, rw: 3 } },
  { id: 'a_abyss', zh: '归于虚墟', desc: '在「归墟」难度下通关', reward: { gold: 200000, cores: 1500, tickets: 50, rw: 5 } },
  { id: 'a_score12000', zh: '万点轰鸣', desc: '单局得分达到 12000', reward: { gold: 9000, cores: 160, tickets: 4, rw: 1 } },
  { id: 'a_score30000', zh: '传说车速', desc: '单局得分达到 30000', reward: { gold: 30000, cores: 400, tickets: 12, rw: 2 } },
];

// ------------------------------------------------------------------ 分数等级
// 累积分数换等级，每级一份奖励；天赋点在看板上按等级发。
// 15 级以前沿用原来的 1.3 倍曲线（第 15 级约 6300 分）；再往后换成 1.06 倍——
// 继续按 1.3 走，第 30 级要几十万分，等于把台阶修到看不见的地方。
// 每 5 级两张召唤券，每 10 级一张免费回溯券。
export const LUCK_LEVEL_MAX = 60;
export const LUCK_LEVELS = Array.from({ length: LUCK_LEVEL_MAX }, (_, i) => {
  const lv = i + 1;
  return {
    lv,
    need: lv <= 15 ? Math.round(160 * Math.pow(1.3, i)) : lv <= 30 ? Math.round(6300 * Math.pow(1.06, lv - 15)) : Math.round(6300 * Math.pow(1.06, 15) * Math.pow(1.07, lv - 30)),
    gold: 400 + lv * 260,
    cores: 8 + lv * 6,
    tickets: lv % 5 === 0 ? 2 : 0,
    rw: lv % 10 === 0 ? 1 : 0,
    tp: lv <= 30 ? 1 : (lv % 4 === 0 ? 1 : 0),      // 30 级以前每级 1 点；31~60 级每 4 级 1 点（天赋总共 38 点可花，发多了就浪费）
  };
});
export function levelOf(pts) {
  let lv = 0;
  for (const L of LUCK_LEVELS) if (pts >= L.need) lv = L.lv;
  return lv;
}

// ------------------------------------------------------------------ 状态
export function luckState(state) {
  const s = (state.luck ||= {});
  s.pts ??= 0; s.best ??= 0; s.clears ??= 0; s.runs ??= 0;
  s.lvClaimed ||= {}; s.talents ||= {}; s.tp ||= 0; s.ach ||= {};
  if (s.cur === undefined) s.cur = null;
  return s;
}
export const talentLv = (s, id) => s.talents?.[id] || 0;
/** 天赋累加成的那几个数（跟着 run 走，不写进 state）。
 *  mod 类的键（hp/atk/critRate…）由 modsOf 直接并进 unit def，run 类的键（start/discount…）在各自的地方读。 */
export function talentMods(s) {
  const out = {
    hp: 0, atk: 0, def: 0, critRate: 0, critDmg: 0, amp: 0, shieldBonus: 0,
    start: 0, discount: 0, after: 0, score: 0, reroll: 0,
  };
  for (const t of LUCK_TALENTS) {
    const lv = talentLv(s, t.id);
    if (lv) out[t.key] += t.per * lv;
  }
  return out;
}

// ------------------------------------------------------------------ 开一局
export const nodeKindOf = (run) => NODE_PLAN[run.node] || 'battle';

/** 第 (act, node) 个节点对应的等效主线关卡：越往后越硬，但每层之间留一档落差 */
export const nodeStage = (act, node, off = 0) => Math.round(16 + act * 21 + node * 1.6) + (off || 0);

export function startRun(state, data, diffId, slugs = state.team) {
  const s = luckState(state);
  const diff = diffOf(diffId);
  const team = (slugs || []).filter((x) => x && state.roster[x]).slice(0, 4);
  if (!team.length) return null;
  const base = (state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0);
  const tm = talentMods(s);
  const hp = {};
  for (const sl of team) hp[sl] = 1;
  const run = {
    seed: base, diff: diff.id, act: 0, node: 0, slugs: team, hp,
    glow: 30 + tm.start, buffs: {}, relics: [], ups: [],
    // maxhpPct：事件给的「生命上限 +%」（battlePrep 里乘在 def.hp 上，血量仍按比例记）
    // reviveAct：不灭余烬这一层的复活已经用掉了（-1 = 还没用）
    maxhpPct: 0, reviveAct: -1,
    offer: null, ev: null, shop: null,
    score: 0, kills: 0, battles: 0, reroll: LUCK_REROLLS + tm.reroll,
    started: Date.now(), end: null, log: [],
  };
  // 开局的造物直接生效（r_purse 之类要在发放时结算，所以走同一个 giveRelic）
  s.cur = run;
  s.runs++;
  return run;
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const runRng = (run, salt) => mulberry32(hash(`${run.seed}:${salt}`));

// ------------------------------------------------------------------ 战斗准备
/** 把这一局的增益 / 造物 / 专属强化 / 天赋累加成一个 mod 表。
 *  slug 有值就只算该角色的专属强化（专属强化只加在自己身上）。 */
function modsOf(s, run, slug = '') {
  const tm = talentMods(s);
  const m = { hp: 0, atk: 0, def: 0, critRate: 0, critDmg: 0, amp: 0, healBonus: 0, shieldBonus: 0, steal: 0, surviveChance: 0, firstBoost: 0, aliGain: 0, keyGain: 0, shield: 0 };
  const add = (o, times = 1) => { if (!o) return; for (const k of Object.keys(m)) if (o[k]) m[k] += o[k] * times; };
  // 天赋先垫底（后面每一级天赋都可能落在 m 里的任意一个键上）
  add(tm);
  // buffs 记的是层数：同一个增益抽到两次就叠两层
  for (const [id, n] of Object.entries(run.buffs || {})) {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    if (b) add({ [b.key]: b.v }, num(n, 1));
  }
  for (const id of run.relics) add(relicOf(id)?.mod);
  for (const u of run.ups) if (!slug || u.slug === slug) add(u.mod);
  return m;
}
const num = (x, f = 0) => { const v = Number(x); return Number.isFinite(v) ? v : f; };

/**
 * 这一节点的战斗：谁上场、带多少血、对面是谁。
 * 血量按 run.hp 的比例注入（hpNow），倒下的队员这一场不上。
 */
export function battlePrep(state, data, run) {
  const s = luckState(state);
  const diff = diffOf(run.diff);
  const kind = nodeKindOf(run);
  const alive = run.slugs.filter((x) => (run.hp[x] ?? 1) > 0.001);
  if (!alive.length) return null;
  const list = allyDefsOf(state, data, run, alive);
  const stage = nodeStage(run.act, run.node, diff.stage);
  const info = {
    boss: kind === 'boss', elite: kind === 'elite',
    node: kind === 'boss' ? 10 : kind === 'elite' ? 5 : 3,
  };
  // 高难度挪档之后，强度 ≥ 主线第 91 关就和主线一样带域规（屏障 / 反震 / 压疗 / 重甲 / 封印）和持续伤害补偿；
  // 敌人曲线用主线那条（90 关之后复利放缓，和玩家队伍的成长对得上）
  const enemies = buildEnemies(stage, data.monsters, { seed: `luck${run.seed}:${run.act}:${run.node}`, info, msk: data.msk, main: true })
    .map((e) => ({
      ...e,
      hp: Math.max(1, Math.round(e.hp * diff.scale)),
      atk: Math.max(1, Math.round(e.atk * diff.scale)),
      def: Math.round(e.def * diff.scale),
    }));
  return {
    allies: list, enemies, stage, kind,
    seed: hash(`${run.seed}:fight:${run.act}:${run.node}`) >>> 0,
    maxRounds: roundLimitFor(info),
    rules: domainRules(stage), dotBoost: lateDotBoost(stage),
  };
}

/** 队伍里每个人在这一趟里的「实际属性」：队伍基础值 + 天赋 / 增益 / 造物 / 专属强化。
 *  战斗里用的就是它，界面上「队伍状态」面板显示的也是它，所以两边永远对得上。slugs 默认是整队（含已倒下的）。 */
export function allyDefsOf(state, data, run, slugs = run.slugs) {
  const s = luckState(state);
  const t = teamDefs(state, data, slugs);
  return t.list.map((d) => {
    const m = modsOf(s, run, d.slug);
    const out = { ...d };
    out.hp = Math.max(1, Math.round(d.hp * (1 + (m.hp + num(run.maxhpPct)) / 100)));
    out.atk = Math.max(1, Math.round(d.atk * (1 + m.atk / 100)));
    out.def = Math.max(0, Math.round(d.def * (1 + m.def / 100)));
    out.critRate = (d.critRate || 0) + m.critRate;
    out.critDmg = (d.critDmg || 0) + m.critDmg;
    out.amp = (d.amp || 0) + m.amp;
    out.healBonus = (d.healBonus || 0) + m.healBonus;
    out.shieldBonus = (d.shieldBonus || 0) + m.shieldBonus;
    out.steal = (d.steal || 0) + m.steal;
    out.surviveChance = Math.min(0.9, (d.surviveChance || 0) + m.surviveChance);
    out.firstBoost = (d.firstBoost || 0) + m.firstBoost;
    out.aliGain = (d.aliGain || 0) + m.aliGain;
    out.keyGain = (d.keyGain || 0) + m.keyGain;
    out.shield = Math.round(out.hp * m.shield / 100);
    out.hpNow = Math.max(1, Math.round(out.hp * (run.hp[d.slug] ?? 1)));
    return out;
  });
}

/** 这一局手上某类造物的数值合计：glow / eliteScore / revive / act / discount / event 都按这个读，
 *  所以新造物只要在数据里写一个字段就行，不用再到结算里加分支。 */
const relicSum = (run, key) => (run.relics || []).reduce((n, id) => n + num(relicOf(id)?.[key]), 0);

/** 打完这一场：写回血量、加分、发余晖，然后往前推一格 */
export function applyBattle(state, data, run, res) {
  const s = luckState(state);
  const diff = diffOf(run.diff);
  const prep = res.__prep;
  // 血量写回：res.allies 的顺序和传进去的 defs 一致
  if (prep) {
    res.allies.forEach((a, i) => {
      const slug = prep.allies[i]?.slug;
      if (slug) run.hp[slug] = Math.max(0, Math.min(1, a.hp / Math.max(1, a.maxHp)));
    });
  }
  const kind = nodeKindOf(run);
  // 分数尺度：一局打穿大约 1400（闲庭）~ 4700（逆天）。等级表最高一级约 6300，
  // 也就是「同一难度连着打穿三五次」能爬满，不至于一趟就把阶梯刷完。
  const base = kind === 'boss' ? 45 : kind === 'elite' ? 24 : 12;
  const hpLeft = run.slugs.reduce((n, x) => n + (run.hp[x] || 0), 0) / Math.max(1, run.slugs.length);
  const roundBonus = res.win ? Math.round(10 * Math.max(0, 1 - res.rounds / Math.max(1, res.roundLimit || 20))) : 0;
  if (res.win) {
    // 猎手徽记：精英 / 首领战的分数单独加成（普通战不吃）
    const hunt = (kind === 'boss' || kind === 'elite') ? 1 + relicSum(run, 'eliteScore') : 1;
    run.score += Math.round((base + Math.round(25 * hpLeft) + roundBonus) * diff.mult * hunt);
    run.glow += (kind === 'boss' ? 30 : kind === 'elite' ? 18 : 10) + relicSum(run, 'glow');
    run.kills += res.kills || 0;
  }
  run.battles++;
  // 战后效果：天赋 / 造物的回血与掉血（血契、狂乱是负的）
  const afterPct = talentMods(s).after + relicSum(run, 'after');
  if (afterPct) healLiving(run, afterPct / 100);
  // 不灭余烬：每层一次，把第一个倒下的人以 30% 生命拉起来（在回血之后判定，免得刚拉起来就被血契压死）
  const revivePct = relicSum(run, 'revive');
  if (revivePct > 0 && run.reviveAct !== run.act) {
    const dead = run.slugs.find((x) => (run.hp[x] ?? 1) <= 0.001);
    if (dead) {
      run.hp[dead] = Math.min(1, revivePct);
      run.reviveAct = run.act;
      run.log.push({ k: 'revive', who: dead, at: run.act });
    }
  }
  run.log.push({ k: kind, win: !!res.win, rounds: res.rounds, score: Math.round(run.score) });

  const wiped = run.slugs.every((x) => (run.hp[x] ?? 0) <= 0.001);
  if (!res.win || wiped) { endRun(state, false); return { lost: true }; }

  // 通关一层：分数奖励 + 成就标记（第三层打完就是整局通关）
  const last = run.node >= LUCK_NODES - 1;
  if (last) {
    run.score += Math.round(30 * diff.mult);
    if (run.act >= LUCK_ACTS - 1) { endRun(state, true); return { cleared: true }; }
    run.act++; run.node = 0;
    // 每层之间给一口回血，否则第三层基本是拖着残血硬顶；压舱石再加 12%
    const actHeal = 0.15 + relicSum(run, 'act') / 100;
    healLiving(run, actHeal);
    return { newAct: run.act };
  }
  run.node++;
  return { next: run.node };
}

/** 分数 + 等级 + 成就一起结算；cur 清空，主页显示战绩 */
export function endRun(state, win) {
  const s = luckState(state);
  const run = s.cur;
  if (!run) return null;
  const diff = diffOf(run.diff);
  let score = Math.round(run.score);
  score = Math.round(score * (1 + relicSum(run, 'score')));
  score = Math.round(score * (1 + talentMods(s).score / 100));
  if (win) score += Math.round(100 * diff.mult);
  run.end = { win, score, act: run.act, node: run.node, glow: run.glow, at: Date.now() };
  s.pts += score;
  s.best = Math.max(s.best, score);
  if (win) s.clears++;
  // 成就判定（只记「达成过」，奖励另外领）
  const got = [];
  const mark = (id) => { if (!s.ach[id]) { s.ach[id] = Date.now(); got.push(id); } };
  if (run.act >= 1 || win) mark('a_first');
  if (win) mark('a_clear');
  if (win && run.diff === 'defy') mark('a_defy');
  if (win && run.diff === 'ruin') mark('a_ruin');
  if (win && run.diff === 'fate') mark('a_fate');
  if (win && run.diff === 'apex') mark('a_apex');
  if (win && run.diff === 'cycle') mark('a_cycle');
  if (win && run.diff === 'abyss') mark('a_abyss');
  if (score >= 12000) mark('a_score12000');
  if (score >= 30000) mark('a_score30000');
  if (score >= 1500) mark('a_1500');
  if (score >= 3500) mark('a_3500');
  if (run.relics.length >= 8) mark('a_relic8');
  if (win && run.slugs.every((x) => (run.hp[x] ?? 0) >= 0.7)) mark('a_flawless');
  if (run.glow >= 300) mark('a_rich');
  // 第二批里程碑
  if (score >= 6000) mark('a_score6000');
  if (run.relics.length >= 12) mark('a_relic12');
  if (run.glow >= 500) mark('a_glow500');
  if (s.clears >= 5) mark('a_clear5');
  s.cur = null;
  run.end.got = got;
  s.lastRun = run.end;
  // 天赋点按「已领的等级奖励」折算：领级的时候就到账，这里只重算一次余额
  s.tp = freeTp(s);
  return run.end;
}

/** 应该有的天赋点总数：偶数级的等级奖励 + 成就里的（成就里没写 tp，先只算等级） */
export function talentTotal(s) {
  let n = 0;
  for (const L of LUCK_LEVELS) if (L.tp && levelOf(s.pts) >= L.lv && s.lvClaimed?.[L.lv]) n += L.tp;
  return n;
}
export const spentTp = (s) => Object.values(s.talents || {}).reduce((n, v) => n + (v || 0), 0);
export const freeTp = (s) => Math.max(0, talentTotal(s) - spentTp(s));

/** 领某一级的奖励 */
export function claimLevel(state, lv) {
  const s = luckState(state);
  const L = LUCK_LEVELS.find((x) => x.lv === lv);
  if (!L || s.lvClaimed[lv] || s.pts < L.need) return null;
  s.lvClaimed[lv] = Date.now();
  state.gold += L.gold; state.cores += L.cores; state.tickets += L.tickets;
  if (L.rw) (state.vouchers ||= { rewind: 0 }).rewind += L.rw;
  state.stats.gold = (state.stats.gold || 0) + L.gold;
  const tp = L.tp || 0;
  s.tp = talentTotal(s) - spentTp(s);
  return { ...L, tp };
}

/** 点一级天赋：要有点数、且没满级 */
export function buyTalent(state, id) {
  const s = luckState(state);
  const t = LUCK_TALENTS.find((x) => x.id === id);
  if (!t) return false;
  const lv = talentLv(s, id);
  if (lv >= t.cost.length) return false;
  if (freeTp(s) <= 0) return false;
  s.talents[id] = lv + 1;
  s.tp = freeTp(s);
  return true;
}

/** 领成就奖励 */
export function claimLuckAch(state, id) {
  const s = luckState(state);
  const a = LUCK_ACH.find((x) => x.id === id);
  if (!a || !s.ach[id] || s.ach[id] === true) return null;
  s.ach[id] = true;
  state.gold += a.reward.gold || 0;
  state.cores += a.reward.cores || 0;
  state.tickets += a.reward.tickets || 0;
  if (a.reward.rw) (state.vouchers ||= { rewind: 0 }).rewind += a.reward.rw;
  state.stats.gold = (state.stats.gold || 0) + (a.reward.gold || 0);
  return a.reward;
}

// ------------------------------------------------------------------ 奖励三选一
function giveRelic(run, id) {
  const r = relicOf(id);
  if (!r || run.relics.includes(id)) return false;
  run.relics.push(id);
  if (r.start) run.glow += r.start;
  if (r.reroll) run.reroll += r.reroll;
  return true;
}

/** 全队回血 / 掉血（frac 是占生命上限的比例，负数是掉血）。**只作用在还活着的人身上**：
 *  以前倒下的人（血量 0）也会被「涌泉」「热汤」「泉眼」一并加上血，等于每次战后 / 商店 / 事件都把死人白白救活，
 *  倒下一次也不算数；真正的复活只有「不灭余烬」。 */
function healLiving(run, frac) {
  for (const x of run.slugs) {
    const hp = run.hp[x] ?? 1;
    if (hp <= 0.001) continue;
    run.hp[x] = Math.max(0, Math.min(1, hp + frac));
  }
}

/** 战后 / 商店的候选池：增益（可重复）+ 造物（唯一）+ 本队的专属强化（每档一次） */
export function offerPool(state, data, run, n = 3, skip = []) {
  // 种子里带上「已经重掷了几次」：以前同一个节点的种子固定，重掷出来的永远是同一批，重掷等于没用
  const rng = runRng(run, `offer:${run.act}:${run.node}:${run.battles}:${run.rr || 0}`);
  // skip：上一批里出现过的 id。重掷时尽量排开它们（剩下的候选不够凑数时才放回来）
  const fresh = (arr) => { const f = arr.filter((x) => !skip.includes(x.id)); return f.length ? f : arr; };
  const relics = shuffle(rng, fresh(LUCK_RELICS.filter((r) => !run.relics.includes(r.id))));
  const ups = shuffle(rng, fresh(run.slugs.flatMap((sl) => [0, 1].map((i) => charUp(sl, data, i))).filter((u) => u && !run.ups.some((x) => x.id === u.id))));
  const buffs = shuffle(rng, fresh(LUCK_BUFFS));
  const out = [];
  // 造物优先：它是整局唯一能改玩法的东西，先保证每次至少出现一件（有的话）
  if (relics.length) { const r = relics[0]; out.push({ type: 'relic', ...r }); }
  if (ups.length) { const u = ups[0]; out.push({ type: 'up', ...u }); }
  while (out.length < n) {
    if (buffs.length) { const b = buffs.pop(); out.push({ type: 'buff', ...b }); continue; }
    const rest = relics.filter((r) => !out.some((o) => o.id === r.id));
    if (!rest.length) break;
    out.push({ type: 'relic', ...rest[0] });
  }
  return out.slice(0, n + (run.relics.includes('r_gambler') ? 1 : 0));
}

/** 选一个奖励。buff 可叠（同名叠层），造物 / 专属强化各限一次。 */
export function takeOffer(state, data, run, id) {
  const it = (run.offer || []).find((x) => x.id === id);
  if (!it) return null;
  if (it.type === 'buff') run.buffs[id] = num(run.buffs[id], 0) + 1;
  else if (it.type === 'relic') giveRelic(run, id);
  else if (it.type === 'up' && !run.ups.some((u) => u.id === id)) run.ups.push({ id: it.id, slug: it.slug, zh: it.zh, desc: it.desc, mod: it.mod });
  run.offer = null;
  return it;
}

/** 重掷：次数够就重开一批候选 */
export function rerollOffer(state, data, run) {
  if (run.reroll <= 0) return false;
  run.reroll--;
  run.rr = (run.rr || 0) + 1;
  const prev = (run.offer || []).map((x) => x.id);
  run.offer = offerPool(state, data, run, 3, prev);
  return true;
}

// ------------------------------------------------------------------ 事件 / 商店
export function eventOf(run) {
  const rng = runRng(run, `ev:${run.act}:${run.node}`);
  return LUCK_EVENTS[Math.floor(rng() * LUCK_EVENTS.length)];
}

export function applyEvent(state, data, run, optIdx) {
  const ev = run.ev || (run.ev = { id: eventOf(run).id });
  const def = LUCK_EVENTS.find((e) => e.id === ev.id) || LUCK_EVENTS[0];
  const opt = def.opts[optIdx];
  if (!opt) return null;
  if (opt.cost && run.glow < opt.cost) return { err: '余晖不够' };
  if (opt.cost) run.glow -= opt.cost;
  const boost = 1 + relicSum(run, 'event');
  const g = opt.gain || {};
  const out = { zh: def.zh, k: opt.k, glow: 0, heal: 0, score: 0, maxhp: 0, reroll: 0, got: [] };
  if (g.glow) { const v = Math.round(g.glow * boost); run.glow += v; out.glow = v; }
  if (g.score) { const v = Math.round(g.score * boost); run.score += v; out.score = v; }
  if (g.heal) {
    healLiving(run, g.heal / 100);
    out.heal = g.heal;
  }
  // 生命上限：血量记的是「占上限的比例」，所以上限涨了、当前血也按比例跟上
  if (g.maxhp) { run.maxhpPct = num(run.maxhpPct) + g.maxhp; out.maxhp = g.maxhp; }
  if (g.reroll) { run.reroll += g.reroll; out.reroll = g.reroll; }
  if (g.buff) { run.buffs[g.buff] = (run.buffs[g.buff] || 0) + 1; out.got.push(LUCK_BUFFS.find((b) => b.id === g.buff)?.zh || g.buff); }
  // 白给一次本队还没拿到的专属强化（月下合唱这类）
  if (g.up) {
    const rng = runRng(run, `evup:${run.act}:${run.node}`);
    const pool = run.slugs.flatMap((sl) => [0, 1].map((i) => charUp(sl, data, i)))
      .filter((u) => u && !run.ups.some((x) => x.id === u.id));
    for (let i = 0; i < g.up && pool.length; i++) {
      const u = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      run.ups.push({ id: u.id, slug: u.slug, zh: u.zh, desc: u.desc, mod: u.mod });
      out.got.push(u.zh);
    }
  }
  if (g.relic) {
    const rng = runRng(run, `evrelic:${run.act}:${run.node}`);
    const pool = LUCK_RELICS.filter((r) => !run.relics.includes(r.id));
    if (pool.length) { const r = pool[Math.floor(rng() * pool.length)]; giveRelic(run, r.id); out.got.push(r.zh); }
  }
  if (g.gamble != null) {
    const rng = runRng(run, `gamble:${run.act}:${run.node}`);
    if (rng() < g.gamble) {
      const pool = LUCK_RELICS.filter((r) => !run.relics.includes(r.id));
      if (pool.length) { const r = pool[Math.floor(rng() * pool.length)]; giveRelic(run, r.id); out.got.push(r.zh); }
    } else {
      for (const x of run.slugs) run.hp[x] = Math.max(0, Math.min(1, (run.hp[x] ?? 1) - 0.12));
      out.heal = -12;
    }
  }
  run.ev = null;
  out.step = advanceNode(state, run);
  return out;
}

/** 商店货架：3 件造物/增益 + 一次治疗，价格随层数涨，天赋与造物打折 */
export function shopStock(state, data, run) {
  const rng = runRng(run, `shop:${run.act}:${run.node}`);
  const s = luckState(state);
  // 商店折扣：天赋「熟人」+ 造物（鼓胀钱袋 / 藏宝匣）各自写 discount，累加后封顶 60%
  const off = 1 - Math.min(0.6, talentMods(s).discount / 100 + relicSum(run, 'discount'));
  const pool = LUCK_RELICS.filter((r) => !run.relics.includes(r.id));
  const relics = shuffle(rng, pool).slice(0, 2).map((r) => ({ type: 'relic', id: r.id, zh: r.zh, desc: r.desc, price: Math.round((55 + run.act * 15) * off) }));
  const buffs = shuffle(rng, LUCK_BUFFS).slice(0, 2).map((b) => ({ type: 'buff', id: b.id, zh: b.zh, desc: b.desc, price: Math.round(35 * off) }));
  const heal = { type: 'heal', id: 's_heal', zh: '热汤', desc: '全队回复 30% 生命', price: Math.round(40 * off) };
  return [...relics, ...buffs, heal];
}

export function shopBuy(state, data, run, idx) {
  const it = (run.shop || [])[idx];
  if (!it || run.glow < it.price) return { err: '余晖不够' };
  if (it.type === 'heal') {
    run.glow -= it.price;
    healLiving(run, 0.3);
  } else if (it.type === 'relic') {
    run.glow -= it.price; giveRelic(run, it.id);
  } else {
    run.glow -= it.price; run.buffs[it.id] = (run.buffs[it.id] || 0) + 1;
  }
  run.shop = (run.shop || []).filter((_, i) => i !== idx);
  return { ok: true, zh: it.zh };
}

/** 离开商店 / 事件后往前走一格（事件和商店共用这一条） */
function advanceNode(state, run) {
  run.ev = null; run.shop = null; run.offer = null;
  if (run.node >= LUCK_NODES - 1) {
    if (run.act >= LUCK_ACTS - 1) { endRun(state, true); return { cleared: true }; }
    run.act++; run.node = 0;
    const actHeal = 0.15 + relicSum(run, 'act') / 100;
    healLiving(run, actHeal);
    return { newAct: run.act };
  }
  run.node++;
  return { next: run.node };
}
export const leaveNode = (state, run) => advanceNode(state, run);

/** 打这一场（给 UI 用：prepare + simulate + 结算）。非战斗节点直接拒绝，免得点空。 */
export function fightNode(state, data, run) {
  if (!run) return null;
  if (!['battle', 'elite', 'boss'].includes(nodeKindOf(run))) return null;
  const prep = battlePrep(state, data, run);
  if (!prep) { endRun(state, false); return null; }
  const res = simulate({ allies: prep.allies, enemies: prep.enemies, seed: prep.seed, strategy: state.strategy, maxRounds: prep.maxRounds, rules: prep.rules, dotBoost: prep.dotBoost });
  res.__prep = prep;
  const step = applyBattle(state, data, run, res);
  return { res, prep, step };
}

/** 放弃这一局（算失败，分数照给——不然半路想换难度的人会白打） */
export function abandonRun(state) {
  const s = luckState(state);
  if (!s.cur) return null;
  return endRun(state, false);
}
