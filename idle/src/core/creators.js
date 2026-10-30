// 彩蛋唤醒体：把《忘却前夜》社区里几位常驻主播做成可上阵的角色。
//
// 三件事决定了这个文件长什么样：
//   1. 他们**不进抽卡池**（avail = 'GIFT'，pullOnce 里按 a.creator 过滤），只走签到与活动赠送；
//      赠送**可以重复**：同一人再送一次就是叠位 +1。叠位上限 99，光靠银芯共鸣太贵，
//      所以签到一天发一份、活动人气每 100 点换一张征召券，日常打卡就能慢慢叠满。
//   2. 技能是手写的（CREATOR_KITS），不吃 skills.js 的「类型模板 + 原作文本反推」，因为他们在原作里不存在；
//   3. 数值刻意压在史诗（SSR）之下、初始四人之上——彩蛋归彩蛋，不能破坏养成曲线。
//
// 9 位主播**都是男性**，所以文案里的第三人称统一用「他」——别按昵称 / 头像想当然。
//
// creator.bio 一律**照录 B 站个人签名原文**（快照见 tools/faces/source.json 的 sign 字段），
// 不要自己编写人物设定或事迹——签名是空的就留空，界面上会显示「没有填写签名」。
// 唯一例外是萨摩不耶（samo）：他的简介是定制的，按需求保留，不改回签名原文。
// creator.nick 只放社区里真实流传的外号（如「一哥」「安卓佬」），同样不编。
//
// 技能设计一律从**昵称里的意象**出发（雪橇犬、流苏、兔子洞、鼠群、龙、零氪、茉莉、晨星、遛弯的老人），
// 这样既贴人又没有替本人编造言论；界域 / 类型按各自的气质分配，保证四个界域都能凑出同域加成。
//
// 想换成真人立绘？tools/build_creators.py 支持自定义源图：
//   python tools/build_creators.py --portrait samo=D:/图/samo.png --card samo=D:/图/samo-card.png
// 该脚本的默认行为是用姓名首字画一枚符印头像（无素材时的占位，风格与游戏内卡片一致）。
import { fx as E } from './skills.js';
import { MAX_AWAKEN } from './constants.js';

// 与 skills.js 的 GROWTH 保持同一口径：技能等级 0..4 对应 Lv.1–5
const G = (lv) => 0.98 + 0.03 * (lv || 0);
const D = (m, lv, o = {}) => E.dmg(+(m * G(lv)).toFixed(3), o);
const S = (m, lv, to = 'self') => E.shield(+(m * G(lv)).toFixed(3), to);
const H = (m, lv, to = 'ally') => E.heal(+(m * G(lv)).toFixed(3), to);

export const CREATOR_TAG = '联名嘉宾';
export const CREATOR_GIFT = '签到 / 活动赠送';

// 统一的小属性表（SR 档，接近初始四人的水准）
const SUB = { CritRate: 5, CritDamage: 50, AliemusRegen: 0.4, KeyflareRegen: 15, RealmMastery: 0, SigilYield: 0, DamageAmplification: 0, DeathResistance: 0 };
const SUB_SCALE = { CritRate: 0, CritDamage: 0, AliemusRegen: 0.4, KeyflareRegen: 0, RealmMastery: 0, SigilYield: 0, DamageAmplification: 0, DeathResistance: 0 };

const portraitOf = (slug) => `img/awk/${slug}.webp`;
const cardOf = (slug) => `img/card/${slug}.webp`;

/**
 * @typedef {{ id:string, slug:string, zh:string, en:string, realm:string, type:string,
 *   rarity:string, avail:string, base:object, scale:object, sub:object, subScale:object,
 *   portrait:string, card:string, creator:{ uid:string, url:string, color:string, tag:string,
 *   emoji:string, bio:string, hook:string, nick?:string, since?:string } }} Creator
 */

/** @type {Creator[]} */
export const CREATORS = [
  {
    id: 'creator-01', slug: 'samo', zh: '萨摩不耶', en: 'Samo-Buya', realm: 'CHAOS', type: 'WARDEN', rarity: 'SR', avail: 'GIFT',
    base: { CON: 40, ATK: 28, DEF: 40 }, scale: { CON: 1.75, ATK: 1.35, DEF: 1.9 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('samo'), card: cardOf('samo'),
    // 专属特性：社区管他叫「一哥」，见了弥萨格那只校猫就来劲。
    // vs 里的 key 是敌人的 id（special.json 里校猫 = catboss），战斗里按目标 id 乘倍率。
    trait: {
      zh: '一哥',
      desc: '对上奖励首领「校猫」时，造成的伤害 +50%。',
      vs: { catboss: 0.5 },
    },
    creator: {
      uid: '345114332', url: 'https://space.bilibili.com/345114332', color: '#e8dcc8', tag: CREATOR_TAG, emoji: '🐾',
      bio: '把「雪橇三傻」精神带进忘却前夜的主播：全场最白、最热情、也最容易把校猫的台拆了。社区里都叫他「一哥」。',
      hook: '雪原守望 · 拆家',
    },
  },
  {
    id: 'creator-02', slug: 'mengyi', zh: '梦依流苏', en: 'Mengyi Liusu', realm: 'AEQUOR', type: 'CHORUS', rarity: 'SR', avail: 'GIFT',
    base: { CON: 36, ATK: 30, DEF: 30 }, scale: { CON: 1.65, ATK: 1.45, DEF: 1.45 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('mengyi'), card: cardOf('mengyi'),
    creator: {
      uid: '1800901917', url: 'https://space.bilibili.com/1800901917', color: '#b9a7e0', tag: CREATOR_TAG, emoji: '🧵',
      bio: '融灾主线深潜pvp请+q1839055149\nmyls的忘却银夜群（个人粉丝向）：884208560\n最近因现生问题减少开播时长',
      hook: '织梦 · 千丝缠',
    },
  },
  {
    id: 'creator-03', slug: 'alice', zh: '爱丽丝', en: 'Alice', realm: 'ULTRA', type: 'ASSAULT', rarity: 'SR', avail: 'GIFT',
    base: { CON: 30, ATK: 36, DEF: 26 }, scale: { CON: 1.5, ATK: 1.7, DEF: 1.25 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('alice'), card: cardOf('alice'),
    creator: {
      uid: '545164270', url: 'https://space.bilibili.com/545164270', color: '#7fb8e8', tag: CREATOR_TAG, emoji: '🫖',
      bio: '主播的粉丝群：1098633910 二群：698722677',
      hook: '兔子洞 · 砍头！',
    },
  },
  {
    id: 'creator-04', slug: 'ratking', zh: '鼠王', en: 'Rat King', realm: 'CARO', type: 'ASSAULT', rarity: 'SR', avail: 'GIFT',
    base: { CON: 32, ATK: 35, DEF: 28 }, scale: { CON: 1.55, ATK: 1.68, DEF: 1.3 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('ratking'), card: cardOf('ratking'),
    creator: {
      uid: '399273416', url: 'https://space.bilibili.com/399273416', color: '#8d7b6a', tag: CREATOR_TAG, emoji: '🐀',
      bio: '',
      hook: '鼠群奔涌 · 瘟疫之牙',
    },
  },
  {
    id: 'creator-05', slug: 'dragond', zh: '魔龙_D', en: 'Dragon_D', realm: 'CHAOS', type: 'ASSAULT', rarity: 'SR', avail: 'GIFT',
    base: { CON: 34, ATK: 37, DEF: 30 }, scale: { CON: 1.6, ATK: 1.72, DEF: 1.35 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('dragond'), card: cardOf('dragond'),
    creator: {
      uid: '190977084', url: 'https://space.bilibili.com/190977084', color: '#d94f3d', tag: CREATOR_TAG, emoji: '🐉',
      bio: 'PKU 本硕 | AI | 在数据的噪音中寻找信号| 深度解构《忘却前夜》等卡牌游戏',
      hook: '龙息 · 灭世咆哮',
    },
  },
  {
    id: 'creator-06', slug: 'zerok', zh: '立誓0氪', en: 'Zero Pull', realm: 'CARO', type: 'CHORUS', rarity: 'SR', avail: 'GIFT',
    base: { CON: 37, ATK: 30, DEF: 31 }, scale: { CON: 1.68, ATK: 1.44, DEF: 1.5 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('zerok'), card: cardOf('zerok'),
    creator: {
      uid: '3493105187687321', url: 'https://space.bilibili.com/3493105187687321', color: '#c9b458', tag: CREATOR_TAG, emoji: '🪙',
      bio: '（忘却前夜神秘玩家）主播的校车群：498236522（最近在做新手攻略）',
      hook: '零氪宣言 · 攒着不花',
    },
  },
  {
    id: 'creator-07', slug: 'xiamolin', zh: '夏茉琳', en: 'Xia Molin', realm: 'AEQUOR', type: 'CHORUS', rarity: 'SR', avail: 'GIFT',
    base: { CON: 36, ATK: 29, DEF: 32 }, scale: { CON: 1.66, ATK: 1.42, DEF: 1.5 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('xiamolin'), card: cardOf('xiamolin'),
    creator: {
      uid: '515298109', url: 'https://space.bilibili.com/515298109', color: '#8ec9a4', tag: CREATOR_TAG, emoji: '🌿',
      bio: '红色沙漠真好玩',
      hook: '一盏茉莉 · 满庭芳',
    },
  },
  {
    id: 'creator-08', slug: 'chaoxing', zh: '朝星', en: 'Chaoxing', realm: 'ULTRA', type: 'ASSAULT', rarity: 'SR', avail: 'GIFT',
    base: { CON: 31, ATK: 36, DEF: 27 }, scale: { CON: 1.52, ATK: 1.7, DEF: 1.28 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('chaoxing'), card: cardOf('chaoxing'),
    creator: {
      uid: '14997071', url: 'https://space.bilibili.com/14997071', color: '#8fa8ff', tag: CREATOR_TAG, emoji: '⭐',
      bio: '神赐予野性，人得了愚昧',
      hook: '星光坠落 · 破晓',
    },
  },
  {
    id: 'creator-09', slug: 'maodie', zh: '路过的耄耋', en: 'Passing Maodie', realm: 'CARO', type: 'WARDEN', rarity: 'SR', avail: 'GIFT',
    base: { CON: 42, ATK: 27, DEF: 41 }, scale: { CON: 1.8, ATK: 1.3, DEF: 1.95 }, sub: { ...SUB }, subScale: { ...SUB_SCALE },
    portrait: portraitOf('maodie'), card: cardOf('maodie'),
    creator: {
      uid: '1475217387', url: 'https://space.bilibili.com/1475217387', color: '#a9a29a', tag: CREATOR_TAG, emoji: '🚶',
      bio: '1033650434，安卓科研群',
      hook: '让让，路过 · 耄耋之年', nick: '安卓佬',
    },
  },
];

export const CREATOR_BY_SLUG = Object.fromEntries(CREATORS.map((a) => [a.slug, a]));
export const isCreator = (a) => !!(a && a.creator);

/* ---------------- 手写技能组 ----------------
   槽位与官方角色一致（7 槽），数值按 SR 预算给：
   Strike ≈ 1.0 / Skill1 ≈ 1.7 / Skill2 ≈ 1.9 / Exalt ≈ 2.6 / OverExalt ≈ 2.0 + 增益。 */
const kit = (slots) => (level = 2) => Object.fromEntries(
  Object.entries(slots).map(([slot, [name, effects]]) => [slot, { slot, name, effects: effects(level) }]),
);

export const CREATOR_KITS = {
  // 萨摩不耶：雪橇犬式守护 —— 护盾铺全队，顺手把敌人的攻击按下去
  samo: kit({
    Strike: ['雪爪', (lv) => [D(0.95, lv), E.debuff('def', 10, 2)]],
    Defense: ['雪堆打滚', (lv) => [S(1.5, lv), H(0.3, lv, 'self')]],
    Skill1: ['雪原守望', (lv) => [S(1.05, lv, 'allies'), E.debuff('atk', 15, 2, 'foes')]],
    Skill2: ['拆家', (lv) => [D(0.55, lv, { hits: 2, to: 'foe' }), E.debuff('def', 15, 2)]],
    Rouse: ['耶！', () => [E.buff('atk', 14, 4, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['雪崩', (lv) => [S(1.4, lv, 'allies'), D(1.2, lv, { to: 'foes' }), E.status('weakness', 1, 2, 'foes')]],
    OverExalt: ['极夜雪橇', (lv) => [S(2.2, lv, 'allies'), D(1.4, lv, { to: 'foes' }), E.buff('def', 25, 3, 'allies')]],
  }),

  // 梦依流苏：丝线缝合 —— 治疗 + 护盾 + 用线把敌人缠住（降攻/虚弱）
  mengyi: kit({
    Strike: ['流苏拂', (lv) => [D(0.8, lv), E.gauge('aliemus', 8)]],
    Defense: ['绣帷', (lv) => [S(1.4, lv), H(0.3, lv, 'allies')]],
    Skill1: ['织梦', (lv) => [H(1.2, lv, 'allies'), S(0.5, lv, 'allies')]],
    Skill2: ['千丝缠', () => [E.debuff('atk', 22, 2, 'foes'), E.status('weakness', 1, 2, 'foes')]],
    Rouse: ['梦呓', () => [E.buff('crit', 15, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['流苏漫卷', (lv) => [H(1.6, lv, 'allies'), E.buff('amp', 20, 2, 'allies'), E.gauge('aliemus', 20, 'allies')]],
    OverExalt: ['长梦不醒', (lv) => [H(2.2, lv, 'allies'), S(1.0, lv, 'allies'), E.buff('atk', 25, 3, 'allies')]],
  }),

  // 爱丽丝：兔子洞与砍头 —— 随机多段 + 单体处决 + 封印
  alice: kit({
    Strike: ['怀表轻敲', (lv) => [D(1.05, lv), E.gauge('keyflare', 4)]],
    Defense: ['缩小药水', (lv) => [S(1.3, lv), E.status('barrier', 1, 3, 'self')]],
    Skill1: ['坠入兔子洞', (lv) => [D(0.7, lv, { hits: 3, to: 'foeRand' })]],
    Skill2: ['砍头！', (lv) => [D(1.9, lv), E.debuff('vuln', 18, 2)]],
    Rouse: ['三点钟的茶会', () => [E.buff('crit', 18, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['镜中奇遇', (lv) => [D(2.6, lv), E.status('sealed', 1, 2)]],
    OverExalt: ['红心女王的判决', (lv) => [D(1.7, lv, { to: 'foes' }), E.buff('amp', 25, 3), D(1.2, lv)]],
  }),

  // 鼠王：鼠群 + 瘟疫 —— 多段随机伤害，靠中毒滚雪球
  ratking: kit({
    Strike: ['鼠啮', (lv) => [D(0.9, lv), E.dot(0.2, 3)]],
    Defense: ['钻回洞里', (lv) => [S(1.2, lv), E.status('barrier', 1, 2, 'self')]],
    Skill1: ['鼠群奔涌', (lv) => [D(0.5, lv, { hits: 4, to: 'foeRand' }), E.status('poison', 2, 4)]],
    Skill2: ['瘟疫之牙', (lv) => [D(1.4, lv), E.status('poison', 4, 4), E.debuff('vuln', 15, 2)]],
    Rouse: ['笛声', () => [E.buff('atk', 20, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['千鼠噬骨', (lv) => [D(1.1, lv, { to: 'foes' }), E.status('poison', 3, 4, 'foes')]],
    OverExalt: ['鼠王加冕', (lv) => [D(1.5, lv, { to: 'foes' }), E.status('poison', 5, 4, 'foes'), E.dot(0.4, 3, 'foes')]],
  }),

  // 魔龙_D：龙息与龙鳞 —— 群体灼烧，自身带反击
  dragond: kit({
    Strike: ['龙爪', (lv) => [D(1.15, lv)]],
    Defense: ['龙鳞', (lv) => [S(1.5, lv), E.status('counter', 2, 3, 'self')]],
    Skill1: ['龙息', (lv) => [D(1.0, lv, { to: 'foes' }), E.dot(0.3, 3, 'foes')]],
    Skill2: ['俯冲', (lv) => [D(2.0, lv), E.debuff('def', 15, 2)]],
    Rouse: ['龙威', () => [E.buff('atk', 24, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['灭世咆哮', (lv) => [D(2.4, lv), E.debuff('vuln', 20, 2), E.buff('amp', 20, 3)]],
    OverExalt: ['赤龙焚天', (lv) => [D(1.8, lv, { to: 'foes', hits: 2 }), E.dot(0.5, 3, 'foes')]],
  }),

  // 立誓0氪：一分不花也能转 —— 低倍率高回能，全靠狂气/钥焰循环打输出
  zerok: kit({
    Strike: ['白嫖一记', (lv) => [D(0.85, lv), E.gauge('aliemus', 6), E.gauge('keyflare', 6)]],
    Defense: ['攒着不花', (lv) => [S(1.2, lv), E.gauge('aliemus', 15)]],
    Skill1: ['零氪宣言', (lv) => [E.buff('atk', 16, 3, 'allies'), H(0.8, lv, 'allies')]],
    Skill2: ['不氪也能赢', () => [E.buff('amp', 18, 2, 'allies'), E.gauge('aliemus', 18, 'allies')]],
    Rouse: ['立誓', () => [E.buff('crit', 12, 3, 'allies'), E.gauge('keyflare', 25)]],
    Exalt: ['白嫖的胜利', (lv) => [H(1.3, lv, 'allies'), E.buff('atk', 22, 3, 'allies'), E.gauge('keyflare', 15, 'allies')]],
    OverExalt: ['0 元通关', (lv) => [H(1.8, lv, 'allies'), E.buff('amp', 28, 3, 'allies'), D(1.2, lv, { to: 'foes' })]],
  }),

  // 夏茉琳：一盏茉莉 —— 纯治疗 + 减伤，最稳的奶
  xiamolin: kit({
    Strike: ['茉莉露', (lv) => [D(0.8, lv), H(0.2, lv, 'ally')]],
    Defense: ['花荫', (lv) => [S(1.5, lv), H(0.4, lv, 'self')]],
    Skill1: ['一盏茉莉', (lv) => [H(1.4, lv, 'ally'), E.buff('def', 15, 3, 'ally')]],
    Skill2: ['夏夜凉风', (lv) => [S(0.9, lv, 'allies'), E.debuff('atk', 15, 2, 'foes')]],
    Rouse: ['花开', (lv) => [H(0.9, lv, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['满庭芳', (lv) => [H(1.5, lv, 'allies'), E.buff('atk', 20, 3, 'allies'), E.debuff('vuln', 15, 2, 'foes')]],
    OverExalt: ['盛夏长明', (lv) => [H(2.0, lv, 'allies'), S(1.2, lv, 'allies'), E.buff('amp', 20, 3, 'allies')]],
  }),

  // 朝星：星轨与破晓 —— 暴击流单体，破晓给全队上暴击
  chaoxing: kit({
    Strike: ['微光', (lv) => [D(1.0, lv), E.gauge('aliemus', 6)]],
    Defense: ['星幕', (lv) => [S(1.3, lv), E.buff('crit', 10, 3)]],
    Skill1: ['星光坠落', (lv) => [D(1.9, lv), E.buff('crit', 12, 2)]],
    Skill2: ['星轨', (lv) => [D(0.65, lv, { hits: 3, to: 'foeRand' })]],
    Rouse: ['破晓', () => [E.buff('crit', 20, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['晨星', (lv) => [D(2.7, lv), E.debuff('vuln', 18, 2)]],
    OverExalt: ['星海黎明', (lv) => [D(1.5, lv, { to: 'foes', hits: 2 }), E.buff('amp', 25, 3, 'allies')]],
  }),

  // 路过的耄耋：挡在路口 —— 最硬的盾，屏障 + 嘲讽式降攻
  maodie: kit({
    Strike: ['拐杖敲', (lv) => [D(0.85, lv), E.debuff('atk', 10, 2)]],
    Defense: ['挡在路口', (lv) => [S(1.6, lv), E.status('fortress', 15, 3, 'self')]],
    Skill1: ['让让，路过', (lv) => [S(1.1, lv, 'allies'), E.status('barrier', 1, 3, 'allies')]],
    Skill2: ['我什么都没看见', () => [E.debuff('atk', 25, 2, 'foes'), E.status('weakness', 1, 2, 'foes')]],
    Rouse: ['老骨头', () => [E.buff('def', 25, 3, 'allies'), E.gauge('keyflare', 20)]],
    Exalt: ['散散步', (lv) => [S(1.8, lv, 'allies'), D(1.0, lv, { to: 'foes' }), E.status('counter', 2, 3, 'allies')]],
    OverExalt: ['耄耋之年', (lv) => [S(2.4, lv, 'allies'), H(1.0, lv, 'allies'), E.debuff('atk', 22, 2, 'foes')]],
  }),
};

export function creatorKit(slug, level = 2) {
  const f = CREATOR_KITS[slug];
  return f ? f(level) : null;
}

/* ---------------- 赠送 ---------------- */
// 签到：累计每 SIGNIN_PER 天发一份「嘉宾征召」，按 CREATORS 的顺序轮着给——
// 先把手上的空位补齐，九个人都到手之后继续轮，每轮给每个人多叠一级。
// 一天一份是有意的：彩蛋角色不进池，只能靠这个和活动券叠位，量太小就永远停在 0 星。
export const SIGNIN_PER = 1;
export const GIFT_ROUND = CREATORS.map((a) => a.slug);
export const signinPicks = (state) => Math.floor(Math.max(0, state.stats?.signins || 0) / SIGNIN_PER);

/** 下一份发给谁：还没到手的按固定顺序补齐，全齐了再按顺序轮转叠位 */
export function nextGiftSlug(state, sent = 0) {
  const missing = GIFT_ROUND.filter((s) => !state.roster?.[s]);
  if (missing.length) return missing[0];
  return GIFT_ROUND[sent % GIFT_ROUND.length];
}

/** 把一名彩蛋角色发到存档里：没有就是新获得，有了就是叠位 +1（满了返回 full） */
export function grantCreator(state, slug) {
  const a = CREATOR_BY_SLUG[slug];
  if (!a) return null;
  state.roster ||= {};
  const own = state.roster[slug];
  if (!own) {
    state.roster[slug] = { lv: 1, star: 0, brk: 0 };
    return { slug, zh: a.zh, isNew: true, star: 0 };
  }
  const star = Math.max(0, Math.floor(own.star || 0));
  if (star >= MAX_AWAKEN) return { slug, zh: a.zh, isNew: false, full: true, star };
  own.star = star + 1;
  return { slug, zh: a.zh, isNew: false, star: own.star };
}

/** 检查签到赠礼：按累计签到的份数补发（老玩家进游戏也会一次补齐），返回这次发出去的那些 */
export function syncSigninGifts(state) {
  state.gift ||= { signin: 0 };
  const want = signinPicks(state);
  const got = [];
  let guard = 0;
  while ((state.gift.signin || 0) < want && guard++ < 999) {
    const sent = state.gift.signin || 0;
    state.gift.signin = sent + 1;
    const r = grantCreator(state, nextGiftSlug(state, sent));
    if (r) got.push(r);
  }
  return got;
}
