// 满超限 / 满最终法则 的专属技能：每位唤醒体各两个，名字独一份。
//
//   超限技（超限 Lv 99 解锁）：每行动 3 次，在普通行动之后免费追加一次；
//   终焉技（最终法则 Lv 99 解锁）：每行动 4 次，在普通行动之后免费追加一次，效果比超限技更重。
//
// 每位唤醒体的两个技能都是手写的一份效果列表（见下面的 SKILLS），每位的终焉技围绕一个自己的「主机制」展开：
// 斩杀 / 按比例扣血 / 净化 / 驱散 / 复苏 / 嘲讽 / 反射 / 眩晕 / 连锁 / 溅射 / 回响 / 重置冷却 /
// 护盾转伤害 / 献祭 / 按损失生命治疗 / 延迟爆发 / 残血增伤——这些是专属技能新加的战斗机制（core/battle.js 的 run）。
// 同一个主机制由 3~5 位使用，但每位搭配的副机制和数值都不同，test 里校验没有两位的技能组合完全一样。
import { fx as E, describeSkill } from './skills.js';

export const EXTRA_OD_AT = 99;      // 超限满级
export const EXTRA_LAW_AT = 99;     // 法则达到 99 级算「满」（法则本身没有上限，这一档只是解锁终焉技）
export const EXTRA_EVERY = { Od: 3, Law: 4 };

// slug -> [超限技名, 终焉技名]
export const EXTRA_NAMES = {
  '24': ['二十四道回响', '终局·二十四相'],
  agrippa: ['炼金术的第一次沸腾', '大衍·万物归一'],
  aigis: ['赤盾共振', '血誓不落之盾'],
  alva: ['雪线之誓', '凛冬终章'],
  aurita: ['潮声穿刺', '深渊回潮'],
  caecus: ['盲眼壁垒', '无光守望'],
  casiah: ['星幕低语', '超维祈愿'],
  castor: ['双子叠影', '终焉双生'],
  celeste: ['天穹祝祷', '群星垂落'],
  clementine: ['怜悯之环', '万千慈悲'],
  corposant: ['桅火乍现', '圣艾尔摩之焰'],
  daffodil: ['水仙折镜', '自恋的终点'],
  doll: ['玩偶的小把戏', '提线断裂'],
  doresain: ['血宴开席', '终席·饕餮'],
  erica: ['荆棘守誓', '花冠凋零'],
  faint: ['微光不熄', '昏黄尽头'],
  faros: ['灯塔扫掠', '永夜航标'],
  'doll-inferno': ['熔毁之舞', '焚尽提线'],
  'helot-catena': ['血链缚魂', '锁链终响'],
  'ramona-timeworn': ['环行回廊', '时轮倒转'],
  goliath: ['巨人之拳', '歌利亚坠落'],
  hameln: ['魔笛引路', '鼠群终曲'],
  helot: ['奴隶的反抗', '断镣者'],
  horla: ['不可见者', '寄生终章'],
  jenkin: ['詹金的把戏', '超维折叠'],
  karen: ['珈伦的圆舞', '终幕谢礼'],
  'kathigu-ra': ['凯蒂古拉之吼', '蒙昧之王'],
  leigh: ['雷娅的低温', '血浆回环'],
  lily: ['百合守夜', '白花葬礼'],
  liz: ['莉兹的猎场', '超维猎杀'],
  lotan: ['萝坦的浪', '倾覆之潮'],
  miryam: ['弥利亚姆的歌', '海渊安魂曲'],
  mouchette: ['茉夏的尖爪', '狂乱终末'],
  murphy: ['墨菲定律', '必然之壁'],
  'murphy-fauxborn': ['诞妄之誓', '虚妄新生'],
  nautila: ['诺缔拉的铁律', '混沌堡垒'],
  nymphaea: ['睡莲绽放', '夜莲盛开'],
  ogier: ['奥吉尔之盾', '不灭之誓'],
  pandia: ['潘狄娅的满月', '月蚀审判'],
  pickman: ['画家的模特', '肖像·最后一笔'],
  pollux: ['波吕克斯之光', '天狼回声'],
  ramona: ['拉蒙娜的钟摆', '末日钟声'],
  ryker: ['莱克的节拍', '终场加演'],
  salvador: ['救世者的重担', '十字终局'],
  sanga: ['珊瑚之环', '深潮屏障'],
  sorel: ['索蕾尔的烈焰', '炎涌终章'],
  tawil: ['塔薇的织线', '命运收束'],
  thais: ['泰旖丝的香气', '盛宴余韵'],
  tinct: ['染色炼成', '终极配方'],
  tulu: ['图鲁的潮汐', '海啸终焉'],
  uvhash: ['尤乌哈希的撕裂', '血肉终局'],
  wanda: ['旺达的幻视', '双生之壁'],
  winkle: ['温柯尔的小窃盗', '偷天换日'],
  xu: ['徐的药引', '百草终章'],
  vortice: ['漩涡回旋', '终焉之涡'],
  arachne: ['阿拉克涅的织网', '命运之蛛'],
  saya: ['沙耶的低语', '血色安魂'],
  pontos: ['庞托斯的海', '渊底之壁'],
  'lotan-cetarchon': ['蚀灭之潮', '鲸王降临'],
  caraboo: ['卡拉布的真话', '假面终场'],
  'ogier-oathbound': ['负誓之盾', '誓约·不朽'],
  vivian: ['薇薇安的轻吟', '终曲·薇薇安'],
  // 彩蛋角色（只送不抽）：名字按昵称里的意象原创，和本人设定无关
  samo: ['雪团冲撞', '万里追风'],
  mengyi: ['流苏摇曳', '梦里花落'],
  alice: ['兔子洞', '镜中世界'],
  ratking: ['鼠群奔涌', '王座之下'],
  dragond: ['龙息吐纳', '龙魂苏醒'],
  zerok: ['零氪之誓', '分文不取的奇迹'],
  xiamolin: ['夏日茉莉', '花雨纷飞'],
  chaoxing: ['晨星坠落', '破晓星轨'],
  maodie: ['路过的风景', '长者的一瞥'],
};


// ---- 效果构造（缩写）----
const D = (m, to = 'foe', hits = 1) => E.dmg(m, { to, hits });
const H = (m, to = 'ally') => E.heal(m, to);
const S = (m, to = 'self') => E.shield(m, to);
const B = (stat, v, dur, to = 'self') => E.buff(stat, v, dur, to);
const Db = (stat, v, dur, to = 'foe') => E.debuff(stat, v, dur, to);
const Dot = (m, dur, to = 'foe') => E.dot(m, dur, to);
const G = (k, v, to = 'self') => E.gauge(k, v, to);
const St = (s, n, dur, to = 'foe') => E.status(s, n, dur, to);
const LS = (v) => ({ t: 'lifesteal', v });
// 新机制
const EXE = (m, thr = 0.3, to = 'foe') => ({ t: 'execute', m, thr, to });
const PCT = (pct, to = 'foe') => ({ t: 'pctHp', pct, to });
const CLN = (to = 'allies') => ({ t: 'cleanse', to });
const DSP = (to = 'foes') => ({ t: 'dispel', to });
const REV = (pct) => ({ t: 'revive', pct });
const TNT = (dur, to = 'self') => ({ t: 'taunt', dur, to });
const RFL = (pct, dur, to = 'self') => ({ t: 'reflect', pct, dur, to });
const STN = (to = 'foe', n = 1) => ({ t: 'stun', n, to });
const CHN = (m, hits, grow) => ({ t: 'chain', m, hits, grow });
const SPL = (m, share) => ({ t: 'splash', m, share });
const ECH = (n) => ({ t: 'echo', n });
const CDR = (to = 'allies') => ({ t: 'cdReset', to });
const SHD = (m) => ({ t: 'shieldDmg', m });
const BLD = (cost, m, to = 'foes') => ({ t: 'blood', cost, m, to });
const MH = (pct, to = 'allies') => ({ t: 'missingHeal', pct, to });
const DLY = (m, rounds) => ({ t: 'delay', m, rounds });
const LHB = (m, to = 'foe') => ({ t: 'lowHpBoost', m, to });
const PSB = (m) => ({ t: 'poisonBurst', m });
const DTB = (m) => ({ t: 'dotBurst', m });
const XT = () => ({ t: 'extraTurn' });

// slug -> [超限技效果, 终焉技效果]
const SKILLS = {
  // —— 延迟爆发：先蓄力，几回合后全场开花 ——
  '24': [[D(1.2, 'foes'), DLY(1.0, 2)], [DLY(3.0, 2), B('amp', 40, 3), D(1.5, 'foes')]],
  chaoxing: [[DLY(1.3, 2), G('keyflare', 15)], [DLY(3.5, 3), CHN(1.0, 3, 0.3)]],
  alice: [[DLY(1.2, 2), B('crit', 20, 2)], [DLY(3.2, 2), STN('foes', 1), G('keyflare', 30)]],
  pickman: [[DLY(1.0, 2), H(0.5, 'allies')], [DLY(2.5, 2), Dot(0.8, 4, 'foes'), H(1.0, 'allies')]],
  // —— 斩杀：对残血的敌人伤害翻倍 ——
  aurita: [[EXE(1.6, 0.3), S(0.5)], [EXE(2.4, 0.4, 'foes'), DTB(1.0)]],
  jenkin: [[EXE(1.5, 0.3, 'foeLow'), G('keyflare', 15)], [EXE(2.8, 0.35, 'foes'), G('keyflare', 40), B('crit', 30, 3)]],
  tulu: [[St('poison', 6, 3, 'foes'), EXE(1.5, 0.3)], [St('poison', 12, 3, 'foes'), PSB(1.5), EXE(2.5, 0.4, 'foes')]],
  sorel: [[EXE(1.4, 0.3), Dot(0.4, 3)], [EXE(2.6, 0.4), DTB(1.5), LS(40)]],
  // —— 按最大生命比例扣血：专治厚血 ——
  goliath: [[PCT(7), S(0.5)], [PCT(10, 'foes'), D(1.5, 'foes'), Db('def', 30, 3, 'foes')]],
  doresain: [[PCT(6), LS(40)], [PCT(12, 'foes'), DTB(1.0), LS(50)]],
  uvhash: [[PCT(7), Dot(0.4, 3)], [PCT(10, 'foes'), BLD(25, 2.0)]],
  'kathigu-ra': [[PCT(5, 'foes'), B('crit', 20, 2)], [PCT(9, 'foes'), BLD(20, 2.5), B('atk', 40, 3)]],
  // —— 净化：清负面，再补一口 ——
  clementine: [[CLN(), H(0.6, 'allies')], [CLN(), H(1.4, 'allies'), St('barrier', 2, 3, 'allies')]],
  thais: [[CLN('ally'), MH(30, 'ally')], [CLN(), H(1.0, 'allies'), Dot(0.6, 3, 'foes')]],
  xu: [[CLN('ally'), H(0.7)], [CLN(), MH(50), H(1.0, 'allies')]],
  leigh: [[CLN(), MH(30, 'allies')], [CLN(), MH(60), B('def', 30, 3, 'allies')]],
  // —— 驱散：拆掉敌人的增益与护盾 ——
  casiah: [[DSP(), G('aliemus', 20, 'allies')], [DSP(), CLN(), G('aliemus', 40, 'allies'), B('crit', 30, 3, 'allies')]],
  tinct: [[DSP(), Db('def', 20, 2, 'foes')], [DSP(), Db('def', 40, 3, 'foes'), B('amp', 30, 3, 'allies')]],
  vivian: [[DSP(), H(0.5, 'allies')], [DSP(), CLN(), H(1.2, 'allies'), B('crit', 35, 3, 'allies')]],
  ryker: [[DSP(), B('atk', 25, 2, 'allies')], [DSP(), B('atk', 50, 3, 'allies'), B('crit', 25, 3, 'allies')]],
  // —— 复苏：让倒下的队友站起来（每场一次）——
  celeste: [[H(0.8, 'allies'), S(0.5, 'allies')], [REV(40), H(1.2, 'allies'), S(0.8, 'allies')]],
  miryam: [[MH(40, 'allies'), S(0.5, 'allies')], [REV(35), MH(70), S(1.0, 'allies')]],
  saya: [[H(0.6, 'allies'), Dot(0.4, 3, 'foes')], [REV(45), H(1.0, 'allies'), Dot(0.8, 4, 'foes')]],
  lily: [[S(0.8, 'allies'), H(0.4)], [REV(50), S(1.4, 'allies'), St('fortress', 30, 3, 'allies')]],
  // —— 嘲讽：把敌人的火力全吸到自己身上 ——
  ogier: [[TNT(2), St('counter', 2, 2)], [TNT(3), S(1.5), St('counter', 5, 3), RFL(40, 3)]],
  'ogier-oathbound': [[TNT(2), S(0.9), B('def', 30, 2)], [TNT(4), St('barrier', 3, 4), RFL(50, 4), S(1.6)]],
  alva: [[TNT(2), S(1.0)], [TNT(3), St('fortress', 45, 3), S(1.4), D(1.2, 'foes')]],
  caecus: [[TNT(2), St('barrier', 1, 2)], [TNT(3), St('barrier', 3, 3), Db('atk', 30, 3, 'foes')]],
  castor: [[TNT(2), B('def', 40, 2)], [TNT(3), ECH(1), S(1.2), D(1.5, 'foes')]],
  // —— 反射：把挨的打原样弹回去 ——
  agrippa: [[RFL(30, 2), S(0.8)], [RFL(60, 3, 'allies'), St('counter', 4, 3, 'allies'), S(1.0, 'allies')]],
  aigis: [[S(0.7, 'allies'), RFL(25, 2, 'allies')], [RFL(50, 3, 'allies'), H(1.2, 'allies'), B('def', 30, 3, 'allies')]],
  corposant: [[RFL(35, 2), D(0.9, 'foes')], [RFL(70, 3), D(1.8, 'foes'), St('fortress', 30, 3, 'allies')]],
  erica: [[RFL(30, 2, 'allies'), B('def', 30, 2, 'allies')], [RFL(55, 3, 'allies'), CLN(), S(1.2, 'allies')]],
  salvador: [[RFL(30, 2), H(0.4, 'self')], [RFL(65, 3, 'allies'), MH(50), S(1.2, 'allies')]],
  // —— 眩晕：让敌人白白丢掉行动（首领免疫）——
  horla: [[STN('foe', 1), G('keyflare', 15)], [STN('foes', 1), D(1.5, 'foes'), G('keyflare', 40)]],
  arachne: [[STN('foe', 1), Db('atk', 20, 2, 'foes')], [STN('foes', 2), Db('atk', 40, 3, 'foes'), G('aliemus', 30, 'allies')]],
  hameln: [[STN('foe', 1), B('crit', 20, 2, 'allies')], [STN('foes', 1), Db('vuln', 30, 3, 'foes'), G('aliemus', 30, 'allies')]],
  mouchette: [[STN('foe', 1), D(1.2)], [STN('foes', 1), D(2.2, 'foes'), B('crit', 40, 3)]],
  // —— 连锁：随机弹射，越弹越疼 ——
  pandia: [[CHN(1.0, 3, 0.3), Dot(0.3, 2)], [CHN(1.3, 4, 0.6), DTB(1.2), B('amp', 30, 3)]],
  nymphaea: [[CHN(0.9, 3, 0.4), B('crit', 15, 2)], [CHN(1.1, 5, 0.5), XT()]],
  daffodil: [[CHN(0.8, 3, 0.3)], [CHN(1.2, 5, 0.4), G('keyflare', 30)]],
  liz: [[CHN(0.7, 4, 0.25)], [CHN(1.0, 6, 0.35), B('crit', 30, 3), G('keyflare', 30)]],
  pollux: [[CHN(0.8, 4, 0.25), G('keyflare', 10)], [St('poison', 10, 3, 'foes'), CHN(1.2, 5, 0.3), PSB(1.5)]],
  // —— 溅射：主目标吃满，旁边的也跑不掉 ——
  lotan: [[SPL(1.5, 0.6)], [SPL(2.8, 0.8), B('amp', 30, 3), D(1.0, 'foes')]],
  'lotan-cetarchon': [[SPL(1.8, 0.5), B('amp', 20, 2)], [SPL(3.2, 0.9), BLD(20, 1.5), B('amp', 40, 3)]],
  vortice: [[SPL(1.5, 0.5), S(0.4)], [SPL(2.8, 0.75), Db('def', 30, 3, 'foes'), S(0.8)]],
  helot: [[SPL(1.4, 0.5), LS(30)], [SPL(2.6, 0.7), Db('def', 25, 3, 'foes'), B('atk', 30, 3)]],
  'helot-catena': [[SPL(1.6, 0.5), Dot(0.4, 3)], [SPL(3.0, 0.8), Dot(0.8, 3, 'foes'), LS(40)]],
  // —— 回响：之后的普通行动打两遍 ——
  karen: [[ECH(1), B('atk', 20, 2, 'allies')], [ECH(2), H(1.2, 'allies'), B('amp', 30, 3, 'allies')]],
  tawil: [[ECH(1), G('aliemus', 15, 'allies')], [ECH(2), G('aliemus', 40, 'allies'), S(0.8, 'allies')]],
  doll: [[ECH(1), H(0.5, 'allies')], [ECH(2), B('atk', 40, 3, 'allies'), H(1.0, 'allies')]],
  'doll-inferno': [[ECH(1), Dot(0.5, 3, 'foes')], [ECH(2), Dot(1.0, 4, 'foes'), DTB(1.2)]],
  // —— 重置冷却：让全队的技能立刻可用 ——
  ramona: [[CDR('allies')], [CDR('allies'), ECH(1), H(1.0, 'allies')]],
  'ramona-timeworn': [[CDR('allies'), G('aliemus', 10, 'allies')], [CDR('allies'), XT(), B('amp', 30, 3, 'allies')]],
  faros: [[CDR('self'), H(0.6, 'allies')], [CDR('allies'), G('aliemus', 30, 'allies'), B('atk', 30, 3, 'allies')]],
  faint: [[CDR('self'), S(0.8)], [CDR('allies'), S(1.2, 'allies'), H(0.8, 'allies')]],
  // —— 护盾转伤害：全队的盾，都是我的子弹 ——
  murphy: [[S(1.0, 'allies'), SHD(0.5)], [S(1.6, 'allies'), SHD(1.0), St('barrier', 2, 3, 'allies')]],
  'murphy-fauxborn': [[S(0.9, 'allies'), SHD(0.4), H(0.4, 'ally')], [S(1.4, 'allies'), SHD(1.2), H(1.0, 'allies')]],
  sanga: [[S(0.8), SHD(0.6)], [S(1.8), SHD(1.6), Db('atk', 30, 3, 'foes')]],
  pontos: [[S(0.9), SHD(0.5), Db('def', 15, 2, 'foes')], [S(1.5, 'allies'), SHD(1.3), TNT(2)]],
  caraboo: [[S(0.8), SHD(0.5), LS(30)], [S(1.6, 'allies'), SHD(1.4), LS(60)]],
  // —— 献祭：拿血换伤害 ——
  ratking: [[BLD(10, 1.2), LS(30)], [BLD(30, 2.2), Dot(0.7, 3, 'foes'), LS(50)]],
  dragond: [[BLD(12, 1.3), B('crit', 20, 2)], [BLD(35, 2.4), B('amp', 40, 3), B('crit', 30, 3)]],
  zerok: [[BLD(8, 0.9), H(0.6, 'allies')], [BLD(20, 1.8), H(1.5, 'allies'), CLN()]],
  samo: [[BLD(10, 1.0), S(0.6)], [BLD(25, 2.0), S(1.5), St('counter', 4, 3)]],
  // —— 按损失生命治疗：越惨，治得越多 ——
  xiamolin: [[MH(40, 'allies'), B('def', 20, 2, 'allies')], [MH(90, 'allies'), S(1.0, 'allies'), G('aliemus', 30, 'allies')]],
  maodie: [[MH(40, 'ally'), S(0.7)], [MH(100, 'allies'), RFL(35, 3, 'allies'), TNT(2)]],
  winkle: [[MH(35, 'ally'), B('def', 30, 2)], [MH(70, 'allies'), RFL(40, 3, 'allies'), B('def', 40, 3, 'allies')]],
  wanda: [[MH(40, 'allies'), S(0.6)], [MH(80, 'allies'), S(1.2, 'allies'), CLN()]],
  // —— 残血增伤：血越少，下手越狠 ——
  nautila: [[LHB(1.2, 'foes'), S(0.7)], [LHB(2.2, 'foes'), St('fortress', 35, 3), S(1.2)]],
  mengyi: [[H(0.5), LHB(1.0)], [LHB(2.0, 'foes'), MH(60, 'allies'), S(0.8, 'allies')]],
};

const FALLBACK = (a, L) => [D(L ? 2.0 : 1.2, 'foes')];

function build(slug, a, L) {
  const names = EXTRA_NAMES[slug] || [`${a.zh}·超限`, `${a.zh}·终焉`];
  const effects = (SKILLS[slug] || [FALLBACK(a, false), FALLBACK(a, true)])[L ? 1 : 0].map((e) => ({ ...e }));
  const sk = { name: names[L ? 1 : 0], effects, extra: true, every: L ? EXTRA_EVERY.Law : EXTRA_EVERY.Od };
  sk.text = describeSkill(sk);
  return sk;
}

/** 这位唤醒体的两个专属技能（不管解锁没解锁，给详情页展示用） */
export function extraSkills(slug, a) {
  return { Od: build(slug, a, false), Law: build(slug, a, true) };
}
/** 战斗里生效的：只返回已解锁的那部分；都没解锁返回 null */
export function extraKit(slug, a, r) {
  if (!a || !r) return null;
  const od = (Number(r.od) || 0) >= EXTRA_OD_AT, lw = (Number(r.law) || 0) >= EXTRA_LAW_AT;
  if (!od && !lw) return null;
  const all = extraSkills(slug, a);
  return { ...(od ? { Od: all.Od } : {}), ...(lw ? { Law: all.Law } : {}) };
}
export const EXTRA_SKILL_SLUGS = Object.keys(SKILLS);
