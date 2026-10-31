// 唤醒体羁绊：同一队里凑齐特定的人，就激活一条「全队被动」。
//
// 和造物羁绊（gear.js 的 RELIC_BONDS）是两套东西：
//   造物羁绊看的是**装备**，这里看的是**队伍里站着谁**。
//
// 为什么要有它：以前同界域 3 / 4 人是唯一的组队加成，于是「四同域」成了唯一正解，
// 混编队（不同界域搭着上）除了凑不出加成，还白白丢掉同域 +8%/+15%，基本没人玩。
// 这里补上三类羁绊：
//   · 同源双相：本体 + 异相（萝坦 / 蚀灭·萝坦 这种同一个人的两个面向）——跨稀有度也能凑
//   · 同域同心 / 职业阵型：三个同界域或同类型的人，给的是「不挑界域」的加成
//   · 联名主播 / 主播×唤醒体：10 位彩蛋主播各自的组合，彩蛋角色终于不是「只为了收藏」
//   · 本命羁绊：主播在《唤醒体幸存者》里各自带着的那位羁绊唤醒体（见下）
//   · 档案派系：原作档案里带同一枚派系标签的唤醒体（如「神国 · 利莫里亚」）
//   · 跨界同行：四个界域各出一个人——直接把混编队从「没加成」变成「最强的一档」
//
// 羁绊是**全队被动**：激活后加成本身不看站位、不看这个人是否还活着（和造物羁绊一个口径），
// 所以换阵容的时候只要看「这四个人能不能凑出东西」，不用算站位。
import { ZERO, addBonus } from './gear.js';

export const BOND_CATS = {
  starter: '初始之约',
  origin: '同源双相',
  realm: '同域同心',
  type: '职业阵型',
  crew: '联名主播',
  guest: '主播 × 唤醒体',
  patron: '本命羁绊',
  archive: '档案派系',
  mixed: '跨界同行',
};

// 谁是彩蛋主播：creators.js 里的角色都带 creator 字段，数据侧不用另开名单
export const isCreator = (a) => !!(a && a.creator);

/**
 * 一条羁绊：
 *   members  明确点名的成员（slug）；规则型羁绊不用它
 *   rule     规则型：'type'（同类型人数）/ 'guest'（某界域的主播 + 本界域官方唤醒体）/ 'mixed'（不同界域数）
 *   key      rule 的参数（类型名 / 界域名）
 *   tiers    { 人数: 加成 }，取「够得着的最高档」
 *   need     没达标时界面上提示「还差几个」
 */
export const BONDS = [
  /* ---------- 初始之约：开局四人（不花钱就能凑的那一套） ---------- */
  {
    id: 'starter-four', zh: '初始之约', cat: 'starter', members: ['ogier', 'lotan', 'doll', 'ramona'], need: 2,
    tiers: { 2: { hpPct: 5, atkPct: 5 }, 3: { hpPct: 9, atkPct: 9, defPct: 5 }, 4: { hpPct: 13, atkPct: 13, amp: 6 } },
    desc: '奥吉尔 / 萝坦 / 朵尔 / 拉蒙娜：开局就在队里的四个人，凑得越多越硬——新手不用等抽卡也能吃到第一份羁绊。',
  },

  /* ---------- 同源双相：本体与异相同时在场 ---------- */
  {
    id: 'apex-lotan', zh: '血潮双相', cat: 'origin', members: ['lotan', 'lotan-cetarchon'], need: 2,
    tiers: { 2: { atkPct: 12, amp: 8 } },
    desc: '萝坦与蚀灭·萝坦同队：同一股血潮的两个面向叠在一起，攻击与增伤一起抬。',
  },
  {
    id: 'apex-ogier', zh: '守誓双相', cat: 'origin', members: ['ogier', 'ogier-oathbound'], need: 2,
    tiers: { 2: { hpPct: 14, defPct: 12, shieldBonus: 10 } },
    desc: '奥吉尔与负誓·奥吉尔同队：一份誓言被两个人扛，生命、防御与护盾一起涨。',
  },
  {
    id: 'apex-doll', zh: '焚声双相', cat: 'origin', members: ['doll', 'doll-inferno'], need: 2,
    tiers: { 2: { aliGain: 12, openAli: 18, healBonus: 12 } },
    desc: '朵尔与熔毁·朵尔同队：合唱的两张嘴同时开，起始共鸣与治疗更高。',
  },
  {
    id: 'apex-ramona', zh: '回环双相', cat: 'origin', members: ['ramona', 'ramona-timeworn'], need: 2,
    tiers: { 2: { keyGain: 15, openKey: 18 } },
    desc: '拉蒙娜与环行·拉蒙娜同队：一条时间线走两遍，钥焰回得更快。',
  },
  {
    id: 'apex-murphy', zh: '妄海双相', cat: 'origin', members: ['murphy', 'murphy-fauxborn'], need: 2,
    tiers: { 2: { hpPct: 12, surviveChance: 0.06, healBonus: 8 } },
    desc: '墨菲与诞妄·墨菲同队：真假两个守门人，队伍更耐打、濒死更容易站住。',
  },
  {
    id: 'apex-helot', zh: '锁链双相', cat: 'origin', members: ['helot', 'helot-catena'], need: 2,
    tiers: { 2: { atkPct: 10, critRate: 6, critDmg: 12 } },
    desc: '希洛与血链·希洛同队：锁链收紧，暴击与攻击一起上。',
  },

  /* ---------- 同域同心：三个同界域、气质相近的人 ---------- */
  {
    id: 'realm-chaos', zh: '雾港低语', cat: 'realm', members: ['kathigu-ra', 'nymphaea', 'tawil'], need: 3,
    tiers: { 3: { amp: 9, critDmg: 14 } },
    desc: '凯蒂古拉 / 宁菲亚 / 塔薇：混沌界域的三声低语，增伤与暴击伤害一起抬。',
  },
  {
    id: 'realm-caro', zh: '血肉圣堂', cat: 'realm', members: ['agrippa', 'aigis', 'thais'], need: 3,
    tiers: { 3: { hpPct: 12, defPct: 10, healBonus: 8 } },
    desc: '阿格里帕 / 艾继丝 / 泰旖丝：血肉界域的三根梁，生命、防御与治疗一起涨。',
  },
  {
    id: 'realm-aequor', zh: '回廊潮声', cat: 'realm', members: ['celeste', 'sanga', 'faros'], need: 3,
    tiers: { 3: { aliGain: 14, shieldBonus: 10, openAli: 12 } },
    desc: '希莱斯特 / 珊 / 法洛思：深海界域的三重潮声，共鸣回得更快、盾更厚。',
  },
  {
    id: 'realm-ultra', zh: '镜阶同影', cat: 'realm', members: ['castor', 'pollux', 'erica'], need: 3,
    tiers: { 3: { keyGain: 14, critRate: 6, openKey: 12 } },
    desc: '卡斯托尔 / 波吕克斯 / 艾瑞卡：超维界域的三道同影，钥焰与暴击一起抬。',
  },

  /* ---------- 职业阵型：同类型三人（不看界域，混编也能凑） ---------- */
  {
    id: 'type-assault', zh: '锋线三连', cat: 'type', rule: 'type', key: 'ASSAULT', need: 3,
    tiers: { 3: { atkPct: 8, critDmg: 18 }, 4: { atkPct: 14, critDmg: 30, amp: 6 } },
    desc: '三名以上突击：全队攻击与暴击伤害抬升，第四名突击再上一档。',
  },
  {
    id: 'type-warden', zh: '铁壁三连', cat: 'type', rule: 'type', key: 'WARDEN', need: 3,
    tiers: { 3: { defPct: 15, hpPct: 10 }, 4: { defPct: 22, hpPct: 16, surviveChance: 0.05 } },
    desc: '三名以上守护：全队防御与生命抬升，第四名守护再给濒死存活。',
  },
  {
    id: 'type-chorus', zh: '合唱三连', cat: 'type', rule: 'type', key: 'CHORUS', need: 3,
    tiers: { 3: { aliGain: 14, healBonus: 12 }, 4: { aliGain: 22, healBonus: 20, openAli: 16 } },
    desc: '三名以上合唱：全队共鸣回复与治疗抬升，第四名合唱再给起始共鸣。',
  },

  /* ---------- 联名主播：主播和主播 ---------- */
  {
    id: 'crew-chaos', zh: '混沌双播', cat: 'crew', members: ['samo', 'dragond'], need: 2,
    tiers: { 2: { atkPct: 10, firstBoost: 20 } },
    desc: '萨摩不耶 + 魔龙_D：两位混沌主播同框，开局那一下特别重。',
  },
  {
    id: 'crew-aequor', zh: '深海双声', cat: 'crew', members: ['mengyi', 'xiamolin'], need: 2,
    tiers: { 2: { aliGain: 12, healBonus: 12 } },
    desc: '梦依流苏 + 夏茉琳：深海两人对唱，共鸣与治疗一起抬。',
  },
  {
    id: 'crew-ultra', zh: '超维双枪', cat: 'crew', members: ['alice', 'chaoxing'], need: 2,
    tiers: { 2: { critRate: 8, critDmg: 16 } },
    desc: '爱丽丝 + 朝星：两位超维主播同台，暴击与暴击伤害一起上。',
  },
  {
    id: 'crew-caro', zh: '血肉三播', cat: 'crew', members: ['ratking', 'zerok', 'maodie'], need: 3,
    tiers: { 3: { hpPct: 12, atkPct: 8 } },
    desc: '鼠王 + 立誓0氪 + 路过的耄耋：血肉三人连麦，能扛也能打。',
  },

  /* ---------- 主播 × 唤醒体：一位本界域主播带两名本界域唤醒体 ---------- */
  {
    id: 'guest-chaos', zh: '混沌连麦', cat: 'guest', rule: 'guest', key: 'CHAOS', need: 3,
    tiers: { 3: { amp: 8, openKey: 12 }, 4: { amp: 13, openKey: 20, atkPct: 8 } },
    desc: '混沌主播 + 两名混沌唤醒体同队：主播带来的人气变成增伤与起始钥焰。',
  },
  {
    id: 'guest-caro', zh: '血肉连麦', cat: 'guest', rule: 'guest', key: 'CARO', need: 3,
    tiers: { 3: { hpPct: 10, healBonus: 10 }, 4: { hpPct: 16, healBonus: 16, defPct: 8 } },
    desc: '血肉主播 + 两名血肉唤醒体同队：直播间的血条更厚，治疗也更足。',
  },
  {
    id: 'guest-aequor', zh: '深海连麦', cat: 'guest', rule: 'guest', key: 'AEQUOR', need: 3,
    tiers: { 3: { aliGain: 12, shieldBonus: 10 }, 4: { aliGain: 18, shieldBonus: 16, hpPct: 8 } },
    desc: '深海主播 + 两名深海唤醒体同队：共鸣与护盾一起抬。',
  },
  {
    id: 'guest-ultra', zh: '超维连麦', cat: 'guest', rule: 'guest', key: 'ULTRA', need: 3,
    tiers: { 3: { critRate: 6, firstBoost: 15 }, 4: { critRate: 10, firstBoost: 25, critDmg: 12 } },
    desc: '超维主播 + 两名超维唤醒体同队：首击与暴击一起抬。',
  },

  /* ---------- 本命羁绊：主播 × 他在《唤醒体幸存者》里带的那位官方唤醒体 ----------
     这 13 条不是编的，来源是 data/survivors-extra.json 里每位主播的 bonds 表
     （cid 是官方唤醒体 id，按 dictionary.json 的 pid 对到本作的 slug）。原表里那句
     「攻击 +12%，伤害的 3% 转为治疗」是幸存者的数值口径，这里换算成本作的加成池字段：
     攻击/生命/防御/暴击/增伤/吸血/共鸣/钥焰，冷却与拾取范围这类没有对应字段的改给增伤。
     两位主播共用一个搭档（萨摩 & 立誓0氪 → 血链·希洛，鼠王 & 白云出岫 → 詹金）时，
     各自算一条、名字和数值不同——所以「本命」认的是人，不是那位唤醒体。 */
  {
    id: 'patron-samo', zh: '血色节拍', cat: 'patron', members: ['samo', 'helot-catena'], need: 2,
    tiers: { 2: { atkPct: 12, steal: 3 } },
    desc: '萨摩不耶 + 血链·希洛：拍子踩在心跳上，攻击抬一档，伤害的 3% 转成治疗。',
  },
  {
    id: 'patron-mengyi-kathi', zh: '烤地瓜的余温', cat: 'patron', members: ['mengyi', 'kathigu-ra'], need: 2,
    tiers: { 2: { critDmg: 30, healBonus: 10 } },
    desc: '梦依流苏 + 凯蒂古拉：梦里也闻得到那股焦糖味，暴击伤害与治疗一起抬。',
  },
  {
    id: 'patron-mengyi-pollux', zh: '梦里也有鸟', cat: 'patron', members: ['mengyi', 'pollux'], need: 2,
    tiers: { 2: { amp: 6, aliGain: 10 } },
    desc: '梦依流苏 + 波吕克斯：他在梦里飞，她在梦里睡，谁也不吵谁——增伤与共鸣回复。',
  },
  {
    id: 'patron-alice-pandia', zh: '予取予求的洞', cat: 'patron', members: ['alice', 'pandia'], need: 2,
    tiers: { 2: { gold: 18, keyGain: 8 } },
    desc: '爱丽丝 + 潘狄娅：洞的另一头什么都捡得到，金币收益与钥焰回复一起抬。',
  },
  {
    id: 'patron-alice-wanda', zh: '活死人的茶会', cat: 'patron', members: ['alice', 'wanda'], need: 2,
    tiers: { 2: { hpPct: 10, defPct: 8 } },
    desc: '爱丽丝 + 旺达：茶凉了也照喝，生命与防御一起厚一层。',
  },
  {
    id: 'patron-ratking', zh: '一窝鼠', cat: 'patron', members: ['ratking', 'jenkin'], need: 2,
    tiers: { 2: { atkPct: 7, amp: 7 } },
    desc: '鼠王 + 詹金：数不清的从来不止他一家，攻击与增伤各抬一档。',
  },
  {
    id: 'patron-dragond', zh: '参数调优', cat: 'patron', members: ['dragond', 'erica'], need: 2,
    tiers: { 2: { critRate: 5, amp: 6 } },
    desc: '魔龙_D + 艾瑞卡：在数据的噪音里听得出哪一格是信号，暴击率与增伤。',
  },
  {
    id: 'patron-zerok', zh: '一分不花的血誓', cat: 'patron', members: ['zerok', 'helot-catena'], need: 2,
    tiers: { 2: { atkPct: 10, critRate: 8 } },
    desc: '立誓0氪 + 血链·希洛：别人的誓要代价，他这个不要钱，攻击与暴击率。',
  },
  {
    id: 'patron-xiamolin', zh: '红色沙漠', cat: 'patron', members: ['xiamolin', 'sorel'], need: 2,
    tiers: { 2: { amp: 8, healBonus: 8 } },
    desc: '夏茉琳 + 索蕾尔：沙是红的，花也是——增伤与治疗。',
  },
  {
    id: 'patron-chaoxing', zh: '摇篮里的星', cat: 'patron', members: ['chaoxing', 'faint'], need: 2,
    tiers: { 2: { critDmg: 20, amp: 5 } },
    desc: '朝星 + 菲茵特：神赐的那点野性落下来就是星，暴击伤害与增伤。',
  },
  {
    id: 'patron-maodie', zh: '路过也挡', cat: 'patron', members: ['maodie', 'ogier'], need: 2,
    tiers: { 2: { shieldBonus: 12, defPct: 8 } },
    desc: '路过的耄耋 + 奥吉尔：他只是路过，但路口归他管——护盾上限与防御。',
  },
  {
    id: 'patron-baiyun-tawil', zh: '这条世界线我走过', cat: 'patron', members: ['baiyun', 'tawil'], need: 2,
    tiers: { 2: { critDmg: 18, keyGain: 10 } },
    desc: '白云出岫 + 塔薇：这一期被塔薇限制了，限制他的东西他照样能算清。',
  },
  {
    id: 'patron-baiyun-jenkin', zh: '1t 速杀', cat: 'patron', members: ['baiyun', 'jenkin'], need: 2,
    tiers: { 2: { atkPct: 12, critDmg: 20 } },
    desc: '白云出岫 + 詹金：开局 1t 把对面直接带走，而詹金是他手里最快的那把刀。',
  },

  /* ---------- 档案派系：原作档案「特性」标签相同的人 ----------
     标签来自 data/dictionary.json 的 traits（维基档案的 |特性= 字段），全 62 人里只有两枚：
     「利莫里亚」5 人（法洛思 / 戈利亚 / 弥利亚姆 / 诞妄·墨菲 / 图鲁）与「主宰」1 人（茉夏）。
     主宰只有一个成员，凑不成组，等官方放出第二位再补；所以这一组现在只有神国。
     数值照官方的节奏：原作里弥利亚姆那类灵塑写的是「队伍中存在 1/2/3 名其它利莫里亚唤醒体时，
     触腕伤害 +6%/15%/30%」——本作没有触腕伤害，换算成增伤（主）+ 共鸣 / 护盾（次）。
     神国 = 沉没的利莫里亚，图鲁是末代神王、弥利亚姆是他身边的大祭司，戈利亚与法洛思都是蹈海者。 */
  {
    id: 'archive-lemuria', zh: '神国余晖', cat: 'archive',
    members: ['faros', 'goliath', 'miryam', 'murphy-fauxborn', 'tulu'], need: 2,
    // 每一档都带一点生命：战力（power = 生命/10 + 攻击 + 防御×0.8）只认生命 / 攻击 / 防御，
    // 纯增伤 / 共鸣的羁绊在战力上看不出来，玩起来像没生效
    tiers: {
      2: { amp: 6, aliGain: 8, hpPct: 4 },
      3: { amp: 13, aliGain: 14, shieldBonus: 10, hpPct: 8 },
      4: { amp: 22, aliGain: 20, shieldBonus: 15, hpPct: 14 },
    },
    desc: '利莫里亚人：法洛思 / 戈利亚 / 弥利亚姆 / 诞妄·墨菲 / 图鲁。神国沉了，触腕还在长——同队人越多，增伤、共鸣与护盾越高（照原作「1/2/3 名其它利莫里亚人 → 触腕伤害 +6%/15%/30%」的节奏换算）。',
  },


  /* ---------- 跨界同行：四个界域各出一个人（混编队的正解） ---------- */
  {
    id: 'mixed-four', zh: '四域同行', cat: 'mixed', rule: 'mixed', need: 4,
    tiers: { 3: { hpPct: 7, atkPct: 7 }, 4: { hpPct: 14, atkPct: 14, amp: 10, critRate: 5, openAli: 15 } },
    desc: '队伍里凑齐 3 / 4 个不同界域：跨界互补，全队生命、攻击与增伤一起抬——混编队从此不是「没加成」。',
  },
];

/** 界域 / 类型的中文名，界面文案用（不引 constants 以免循环依赖） */
const REALM_ZH = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' };
const TYPE_ZH = { ASSAULT: '突击', WARDEN: '守护', CHORUS: '合唱' };
const catName = (b) => BOND_CATS[b.cat] || '';
export const bondLabel = (b) => `${b.zh}`;

/**
 * 一条羁绊现在凑了几个。
 * ctx 由 teamBonds 预先算好（每个界域的主播数 / 官方唤醒体数、类型人数、界域数……）。
 */
function countOf(b, ctx) {
  if (!b.rule) return b.members.reduce((n, s) => n + (ctx.has.has(s) ? 1 : 0), 0);
  if (b.rule === 'type') return ctx.typeCount[b.key] || 0;
  if (b.rule === 'mixed') return ctx.realms.length;
  if (b.rule === 'guest') {
    // 主播≥1 才算：没有主播的「三个同界域」是同域同心的事，不重复算。
    // 计法固定为「1 位主播 + 本界域唤醒体数」——两个主播也只是 1，免得双主播把档位虚高到 4。
    if (!ctx.creatorRealm[b.key]) return 0;
    return 1 + ctx.ownRealm[b.key];
  }
  return 0;
}

/** 差多少才凑得出来（界面提示用）：达不到 need 时返回还差几个人 */
function gapOf(b, ctx, n) {
  const need = b.need || 2;
  if (n >= need) return 0;
  return need - n;
}

/** 界面上的「怎么凑」文案；传了 bySlug 就把 slug 换成中文名 */
export function bondHint(b, bySlug = null) {
  if (b.rule === 'type') return `${TYPE_ZH[b.key] || b.key} ×${b.need}`;
  if (b.rule === 'mixed') return `不同界域 ×${b.need}`;
  if (b.rule === 'guest') return `${REALM_ZH[b.key] || b.key}主播 1 + ${REALM_ZH[b.key] || b.key}唤醒体 ${b.need - 1}`;
  const name = (s) => (bySlug && bySlug[s]?.zh) || s;
  return b.members.map(name).join(' + ');
}

/**
 * 一队人的羁绊结算。
 * slugs: 队伍里的 slug 数组；data: indexData 的产物（要 bySlug）。
 * 返回 { active:[{...bond, n, tier, bonus}], near:[{...bond, n, gap}], bonus, count, realms }
 */
export function teamBonds(slugs = [], data) {
  const bySlug = data?.bySlug || {};
  const list = [];
  const seen = new Set();
  for (const s of slugs) {
    if (!s || seen.has(s)) continue;
    const a = bySlug[s];
    if (!a) continue;
    seen.add(s); list.push(a);
  }
  const typeCount = {}, creatorRealm = {}, ownRealm = {};
  for (const a of list) {
    typeCount[a.type] = (typeCount[a.type] || 0) + 1;
    const r = a.realm || 'NONE';
    if (isCreator(a)) creatorRealm[r] = (creatorRealm[r] || 0) + 1;
    else ownRealm[r] = (ownRealm[r] || 0) + 1;
  }
  const ctx = { has: seen, typeCount, creatorRealm, ownRealm, realms: [...new Set(list.map((a) => a.realm).filter(Boolean))] };

  const active = [], near = [];
  for (const b of BONDS) {
    const n = countOf(b, ctx);
    const tiers = Object.keys(b.tiers).map(Number).sort((x, y) => x - y);
    const tier = tiers.filter((t) => n >= t).pop() || 0;
    if (tier) active.push({ ...b, n, tier, bonus: b.tiers[tier] });
    else near.push({ ...b, n, gap: gapOf(b, ctx, n) });
  }
  // 「差 1 人」的排前面：羁绊表长到三十多条以后，按声明顺序排的话界面只会一直显示
  // 那几条永远凑不出来的（初始之约、四域同行），真正差一步的反而沉底。
  near.sort((a, b) => a.gap - b.gap || (a.need || 2) - (b.need || 2) || (a.n < b.n ? 1 : a.n > b.n ? -1 : 0));
  const bonus = ZERO();
  for (const a of active) addBonus(bonus, a.bonus);
  return { active, near, bonus, count: active.length, realms: ctx.realms, members: list };
}

/** 这个唤醒体参与哪些羁绊（详情页用）：点名的、按类型的、主播×唤醒体对应的界域、以及四域同行 */
export function bondsOf(slug, data) {
  const a = data?.bySlug?.[slug];
  if (!a) return [];
  return BONDS.filter((b) => {
    if (b.members) return b.members.includes(slug);
    if (b.rule === 'type') return a.type === b.key;
    if (b.rule === 'guest') return a.realm === b.key;
    if (b.rule === 'mixed') return true;       // 谁都能凑「四域同行」，只要队伍够散
    return false;
  });
}

/** 羁绊加成读成一行字（界面 / 日志共用），和造物羁绊同一套格式 */
export { bonusText } from './gear.js';

/** 主播在队伍里时，给「主播 × 唤醒体」用的界域列表（图鉴 / 提示用） */
export const GUEST_REALMS = Object.keys(REALM_ZH);
export const REALM_ZH_OF = REALM_ZH;
export const TYPE_ZH_OF = TYPE_ZH;
export const bondCatName = catName;
