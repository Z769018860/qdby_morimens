// 满超限 / 满最终法则 的专属技能：每位唤醒体各两个，名字独一份。
//
//   超限技（超限 Lv 99 解锁）：每行动 N 次，在普通行动之后免费追加一次；
//   终焉技（最终法则 Lv 99 解锁）：每行动 M 次，在普通行动之后免费追加一次，效果比超限技更重。
//   N / M 逐位不同（2 快节奏轻、5 慢重击重），这是每位专属技能的一个额外维度。
//
// 设计口径（详见下面 SKILLS 的注释）：超限技是「节奏位」，把这位 kit 里最顺手的事做成循环；
// 终焉技是「收束位」，把自家 kit 造出来的状态（毒 / 流血 / 反击层 / 屏障 / 能量 / 护盾 / 血线）
// 兑换成一记爆发。71 位逐条手写，mechanic 词汇见 core/battle.js 的 run()。
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

// slug -> { theme, od, law, odEvery?, lawEvery? }
//
// 设计规矩（71 位逐条手写，没有两个人共用一套）：
//   超限技 = 这位自己的「节奏位」：把他 kit 里最顺手的那件事，做成每几个行动免费来一次的循环。
//   终焉技 = 这位自己的「收束位」：把自家 kit 造出来的战场状态（毒 / 流血 / 反击层 / 屏障 / 能量 /
//            护盾 / 血线）兑换成一记爆发——所以同一个机制家族里的人，收束的「燃料」也各不相同。
//   every  = 每行动几次追加一次。快节奏(2)单次轻，慢重击(5)单次重，是第三个性别维度。
//
// 共用的机制词汇见 core/battle.js 的 run()：斩杀 / 比例扣血 / 净化 / 驱散 / 复苏 / 嘲讽 / 反射 / 眩晕 /
// 连锁 / 溅射 / 回响 / 重置冷却 / 护盾转伤害 / 献祭 / 按损失生命治疗 / 延迟 / 残血增伤 / 引爆中毒 /
// 引爆流血 / 追击号令 / 反击爆发 / 屏障化疗 / 能量超载 / 以毒养身 / 毒甲 / 流血扩散。
const CBR = (m) => ({ t: 'counterBurst', m });
const BRH = (pct) => ({ t: 'barrierHeal', pct });
const GBR = (m, to = 'foe') => ({ t: 'gaugeBurn', m, to });
const PHL = (pct) => ({ t: 'poisonHeal', pct });
const PSH = (pct) => ({ t: 'poisonShield', pct });
const DSPR = (m, dur) => ({ t: 'dotSpread', m, dur });

const SKILLS = {
  // ============ 毒：谁下的毒，就由谁来收这笔账 ============
  agrippa: { theme: '毒 · 毒层转护盾', od: [S(0.7, 'allies'), St('poison', 5, 3, 'foe')], law: [PSH(3.5), S(1.2, 'allies'), St('poison', 7, 4, 'foes')] },
  castor: { theme: '毒 · 嘲讽盾、毒爆', od: [S(0.9), TNT(2), St('poison', 5, 3, 'foe')], law: [PSB(1.8), S(1.2, 'allies'), St('barrier', 2, 3, 'allies')] },
  faros: { theme: '毒 · 毒层转治疗', od: [St('poison', 4, 3, 'foes'), H(0.55, 'allies')], law: [PHL(4), S(1.0, 'allies'), Db('def', 25, 3, 'foes')] },
  karen: { theme: '毒 · 暴击毒疗', odEvery: 2, od: [St('poison', 5, 3, 'foes'), B('crit', 20, 2, 'allies')], law: [PHL(4.5), H(0.9, 'allies'), B('crit', 30, 3, 'allies')] },
  lily: { theme: '毒 · 毒甲毒爆', od: [S(1.0), St('poison', 5, 3, 'foe')], law: [PSB(1.6), S(1.4, 'allies'), St('poison', 8, 3, 'foes')] },
  liz: { theme: '毒 · 毒换狂气', odEvery: 2, od: [St('poison', 4, 3, 'foe'), G('keyflare', 12)], law: [PSB(1.8), G('keyflare', 35), B('crit', 30, 3)] },
  miryam: { theme: '毒 · 毒疗与复苏', od: [St('poison', 4, 3, 'foes'), Db('def', 20, 2, 'foes')], law: [PHL(5), REV(35), S(0.9, 'allies')] },
  nymphaea: { theme: '毒 · 毒爆连锁', od: [St('poison', 5, 3, 'foes'), B('crit', 18, 2)], law: [PSB(2.0), CHN(1.0, 4, 0.35), Db('vuln', 25, 3, 'foes')] },
  pollux: { theme: '毒 · 毒爆弹射', odEvery: 2, od: [St('poison', 5, 3, 'foes'), CHN(0.8, 3, 0.25)], law: [PSB(1.7), CHN(1.1, 4, 0.35), G('keyflare', 30)] },
  ratking: { theme: '毒 · 毒爆扩散', odEvery: 2, od: [St('poison', 6, 3, 'foes')], law: [PSB(1.6), DSPR(1.0, 3), Dot(0.45, 3, 'foes')] },
  saya: { theme: '毒 · 毒中复苏', od: [H(0.6, 'allies'), St('poison', 4, 3, 'foes')], law: [REV(45), H(1.1, 'allies'), St('poison', 8, 3, 'foes')] },
  thais: { theme: '毒 · 反击层收毒', od: [H(0.55, 'allies'), St('poison', 5, 3, 'foes'), St('counter', 1, 2, 'allies')], law: [CBR(0.13), PHL(3.5), H(0.85, 'allies')] },
  tulu: { theme: '毒 · 毒爆虚弱', od: [St('poison', 5, 3, 'foes'), St('weakness', 1, 2, 'foes')], law: [PSB(1.8), St('weakness', 1, 3, 'foes'), D(1.6, 'foes')] },
  xu: { theme: '毒 · 毒疗压攻', od: [St('poison', 5, 3, 'foes'), Db('atk', 25, 2, 'foes')], law: [PHL(4.5), CLN(), Db('atk', 35, 3, 'foes')] },
  vivian: { theme: '毒 · 毒疗驱散', od: [H(0.55, 'allies'), St('poison', 4, 3, 'foes'), B('crit', 15, 2, 'allies')], law: [DSP(), PHL(4), B('crit', 35, 3, 'allies')] },
  caraboo: { theme: '毒 · 毒爆吸血', od: [S(0.9), LS(30)], law: [S(1.3, 'allies'), PSB(1.5), SHD(0.8), LS(40)] },
  'doll-inferno': { theme: '毒 · 反击层收毒', od: [H(0.6, 'allies'), St('counter', 1, 2, 'allies')], law: [CBR(0.22), St('poison', 8, 3, 'foes'), H(1.0, 'allies')] },

  // ============ 流血：把伤口撕开、再让所有人一起流血 ============
  helot: { theme: '流血 · 溅射放血', od: [SPL(1.2, 0.5), Dot(0.4, 3, 'foe'), LS(30)], law: [DTB(1.5), Db('def', 30, 3, 'foes'), B('atk', 30, 3)] },
  'helot-catena': { theme: '流血 · 群体感染', od: [Dot(0.5, 3, 'foes'), SPL(1.0, 0.4), LS(30)], law: [DSPR(0.9, 3), DTB(1.1), LS(40)] },
  dragond: { theme: '流血 · 灼烧引爆', od: [Dot(0.5, 3, 'foes'), Db('def', 20, 2, 'foes')], law: [DTB(1.5), SPL(2.2, 0.6), Dot(0.5, 3, 'foes')] },
  sorel: { theme: '流血 · 斩杀引爆', odEvery: 2, od: [Dot(0.5, 3, 'foe'), LS(35)], law: [EXE(2.4, 0.4), DTB(1.5), LS(50)] },

  // ============ 反击：攒下来的每一层，都打回去 ============
  caecus: { theme: '反击 · 反击层收束', od: [S(1.0), St('counter', 2, 2, 'self')], law: [CBR(0.26), BRH(7), St('weakness', 1, 3, 'foes')] },
  faint: { theme: '反击 · 反击层收束', od: [S(0.9, 'allies'), St('counter', 1, 2, 'self')], law: [CBR(0.26), S(1.4, 'allies'), Db('atk', 30, 3, 'foes')] },
  nautila: { theme: '反击 · 残血反击爆发', od: [S(1.0), St('counter', 2, 2, 'self'), B('crit', 15, 2)], law: [CBR(0.15), LHB(1.6, 'foes'), S(1.0)] },
  pandia: { theme: '反击 · 弹射反击爆发', od: [CHN(0.85, 3, 0.3), St('counter', 2, 3, 'self')], law: [CBR(0.16), B('amp', 35, 3), D(1.4, 'foes')] },
  wanda: { theme: '反击 · 反击层转治疗', od: [S(0.85, 'allies'), St('counter', 1, 2, 'self'), Db('atk', 20, 2, 'foes')], law: [CBR(0.15), CLN(), H(1.1, 'allies')] },
  winkle: { theme: '反击 · 屏障与反击双收', od: [S(0.9, 'allies'), St('barrier', 1, 2, 'self')], law: [BRH(8), CBR(0.3), S(0.9, 'allies'), SHD(0.7)] },

  // ============ 守护：护盾、屏障、嘲讽，全部是燃料 ============
  ogier: { theme: '守护 · 嘲讽反击', od: [S(1.1), TNT(2)], law: [S(1.8), TNT(3), SHD(1.1), RFL(45, 3), St('counter', 3, 3, 'self')] },
  'ogier-oathbound': { theme: '守护 · 屏障反射', od: [S(1.0, 'allies'), B('def', 25, 2, 'allies'), St('barrier', 1, 2, 'self')], law: [S(1.7), TNT(3), St('barrier', 3, 4, 'self'), SHD(1.0), RFL(50, 4)] },
  alva: { theme: '守护 · 护垒嘲讽', od: [S(1.0), TNT(2), D(0.7, 'foes')], law: [S(1.6), TNT(3), St('fortress', 45, 3, 'allies'), D(1.5, 'foes')] },
  corposant: { theme: '守护 · 反射反噬', odEvery: 2, od: [RFL(35, 2), S(0.9)], law: [RFL(65, 3, 'allies'), D(1.8, 'foes'), St('fortress', 30, 3, 'allies')] },
  erica: { theme: '守护 · 屏障化疗', od: [S(1.0, 'allies'), D(0.6, 'foes'), St('barrier', 1, 2, 'self')], law: [BRH(8), S(1.5, 'allies'), D(1.5, 'foes')] },
  murphy: { theme: '守护 · 盾转伤害', od: [S(1.0, 'allies'), SHD(0.4)], law: [S(1.6, 'allies'), SHD(0.85), St('barrier', 2, 3, 'allies')] },
  'murphy-fauxborn': { theme: '守护 · 屏障化疗盾击', od: [S(0.7, 'allies'), H(0.5, 'allies')], law: [BRH(7), SHD(1.5), S(1.3, 'allies')] },
  sanga: { theme: '守护 · 盾转伤害', od: [S(0.9), SHD(0.5)], law: [S(1.8), SHD(1.15), St('barrier', 2, 3, 'allies'), Db('def', 25, 3, 'foes')] },
  pontos: { theme: '守护 · 盾转伤害嘲讽', od: [S(0.9), Db('def', 20, 2, 'foes')], law: [S(1.4, 'allies'), SHD(1.05), TNT(2)] },
  samo: { theme: '守护 · 屏障化疗反击', od: [S(0.8, 'allies'), Db('atk', 25, 2, 'foes')], law: [BRH(7), S(1.4, 'allies'), St('counter', 3, 3, 'allies')] },
  maodie: { theme: '守护 · 屏障化疗', od: [S(0.8, 'allies'), St('barrier', 1, 2, 'self'), Db('atk', 15, 2, 'foes')], law: [BRH(8), H(0.8, 'allies'), Db('atk', 35, 3, 'foes')] },
  salvador: { theme: '守护 · 反射苦疗', od: [RFL(30, 2), H(0.5)], law: [RFL(60, 3, 'allies'), D(1.3, 'foes'), S(1.2, 'allies'), MH(45)] },
  aigis: { theme: '守护 · 反射与屏障', odEvery: 2, od: [S(0.8, 'allies'), Db('vuln', 25, 2, 'foes')], law: [RFL(45, 3, 'allies'), H(1.1, 'allies'), St('barrier', 1, 3, 'allies')] },
  mengyi: { theme: '守护 · 损失生命治疗', od: [H(0.55, 'allies'), S(0.5, 'allies')], law: [MH(60), D(1.4, 'foes'), St('weakness', 1, 3, 'foes'), St('barrier', 1, 3, 'allies')] },

  // ============ 辅助：治疗、能量、时序 ============
  casiah: { theme: '辅助 · 能量超载', od: [H(0.8, 'allies'), G('aliemus', 18, 'allies')], law: [GBR(0.05, 'foes'), H(1.2, 'allies'), B('amp', 30, 3, 'allies')] },
  celeste: { theme: '辅助 · 复苏', od: [H(0.7, 'allies'), S(0.6, 'allies')], law: [REV(40), H(1.3, 'allies'), D(1.2, 'foes'), St('barrier', 2, 3, 'allies')] },
  clementine: { theme: '辅助 · 净化压攻', od: [H(0.7, 'allies'), B('atk', 20, 2, 'allies')], law: [CLN(), H(1.3, 'allies'), Db('atk', 30, 3, 'foes'), B('atk', 35, 3, 'allies')] },
  doll: { theme: '辅助 · 回响', odEvery: 2, od: [H(0.65, 'allies'), St('weakness', 1, 2, 'foe')], law: [ECH(2), H(1.0, 'allies'), B('atk', 35, 3, 'allies')] },
  hameln: { theme: '辅助 · 眩晕', od: [H(0.5, 'allies'), Db('atk', 15, 2, 'foes'), G('aliemus', 15, 'allies')], law: [STN('foes', 1), Db('vuln', 30, 3, 'foes'), G('aliemus', 30, 'allies')] },
  horla: { theme: '辅助 · 眩晕能量超载', od: [H(0.75, 'allies'), Db('atk', 20, 2, 'foes')], law: [STN('foe', 1), GBR(0.05), Db('vuln', 30, 3, 'foes'), H(0.8, 'allies')] },
  pickman: { theme: '辅助 · 延迟流血', od: [H(0.65, 'allies'), Dot(0.35, 3, 'foes'), LS(25)], law: [DLY(2.6, 2), Dot(0.7, 4, 'foes'), H(1.1, 'allies')] },
  ryker: { theme: '辅助 · 驱散鼓舞', odEvery: 2, od: [D(0.8, 'foe'), H(0.5, 'allies'), B('atk', 18, 2, 'allies')], law: [DSP(), B('atk', 42, 3, 'allies'), B('crit', 24, 3, 'allies')] },
  tawil: { theme: '辅助 · 回响充能', odEvery: 2, od: [H(0.55, 'allies'), B('crit', 20, 2, 'allies')], law: [ECH(2), G('aliemus', 35, 'allies'), S(0.8, 'allies')] },
  tinct: { theme: '辅助 · 能量超载驱散', lawEvery: 3, od: [H(0.55, 'allies'), Db('vuln', 25, 2, 'foes')], law: [DSP(), GBR(0.02, 'foes'), Db('vuln', 40, 3, 'foes'), B('amp', 30, 3, 'allies')] },
  arachne: { theme: '辅助 · 眩晕与能量', lawEvery: 5, od: [H(0.6, 'allies'), St('barrier', 1, 2, 'allies')], law: [STN('foes', 1), D(1.4, 'foes'), G('aliemus', 40, 'allies'), H(0.9, 'allies')] },
  zerok: { theme: '辅助 · 能量超载', od: [H(0.55, 'allies'), B('atk', 22, 2, 'allies'), G('aliemus', 8, 'allies')], law: [GBR(0.02, 'foes'), H(1.4, 'allies'), CLN()] },
  xiamolin: { theme: '辅助 · 损失生命治疗', od: [H(0.6, 'allies'), B('def', 25, 2, 'allies')], law: [MH(70), D(1.3, 'foes'), S(1.1, 'allies'), B('def', 35, 3, 'allies')] },
  leigh: { theme: '辅助 · 苦痛回疗', od: [H(0.65, 'allies'), LS(35)], law: [MH(55), D(1.3, 'foes'), CLN(), Db('vuln', 30, 3, 'foes')] },
  ramona: { theme: '辅助 · 重置冷却', odEvery: 4, lawEvery: 5, od: [CDR('allies'), H(0.5, 'allies')], law: [CDR('allies'), ECH(1), H(1.0, 'allies'), Db('atk', 30, 3, 'foes')] },
  'ramona-timeworn': { theme: '辅助 · 时序追击', odEvery: 4, lawEvery: 5, od: [CDR('allies'), G('aliemus', 12, 'allies')], law: [CDR('allies'), XT(), D(1.3, 'foes'), B('amp', 30, 3, 'allies')] },

  // ============ 突破：把伤害做成自己的形状 ============
  '24': { theme: '突破 · 多段与延迟', odEvery: 2, lawEvery: 5, od: [CHN(0.55, 3, 0.35), B('crit', 15, 2)], law: [DLY(2.6, 2), CHN(0.85, 6, 0.22), B('amp', 30, 3)] },
  aurita: { theme: '突破 · 斩杀破防', od: [EXE(1.6, 0.3), Db('def', 20, 2, 'foe')], law: [EXE(2.2, 0.4, 'foes'), D(1.2, 'foes'), S(0.6)] },
  daffodil: { theme: '突破 · 弹射', od: [CHN(0.8, 3, 0.3)], law: [CHN(1.0, 5, 0.3), B('amp', 30, 3), G('keyflare', 30)] },
  goliath: { theme: '突破 · 比例扣血', odEvery: 4, lawEvery: 5, od: [PCT(7), S(0.5)], law: [PCT(8, 'foes'), D(1.5, 'foes'), Db('def', 35, 3, 'foes')] },
  jenkin: { theme: '突破 · 斩杀充能', od: [EXE(1.5, 0.3), G('keyflare', 12)], law: [EXE(2.2, 0.4, 'foes'), CHN(0.9, 4, 0.3), G('keyflare', 30)] },
  'kathigu-ra': { theme: '突破 · 比例扣血献祭', odEvery: 4, lawEvery: 5, od: [PCT(5, 'foes'), B('crit', 20, 2)], law: [PCT(9, 'foes'), BLD(20, 2.2), B('atk', 40, 3)] },
  lotan: { theme: '突破 · 溅射', odEvery: 2, od: [SPL(1.5, 0.55)], law: [SPL(2.8, 0.8), B('amp', 30, 3), St('weakness', 1, 3, 'foes')] },
  'lotan-cetarchon': { theme: '突破 · 溅射献祭', lawEvery: 5, od: [SPL(1.6, 0.5), B('amp', 20, 2)], law: [SPL(3.2, 0.85), BLD(18, 1.6), B('amp', 40, 3)] },
  mouchette: { theme: '突破 · 眩晕重击', odEvery: 4, lawEvery: 5, od: [STN('foe', 1), D(1.3)], law: [STN('foes', 1), D(2.2, 'foes'), B('crit', 40, 3)] },
  uvhash: { theme: '突破 · 比例扣血献祭', od: [PCT(5.5), Dot(0.35, 3, 'foes'), LS(25)], law: [PCT(8, 'foes'), BLD(22, 1.5), LS(40)] },
  vortice: { theme: '突破 · 溅射破防', od: [SPL(1.4, 0.5), Db('def', 15, 2, 'foes')], law: [SPL(2.7, 0.75), Db('def', 35, 3, 'foes'), S(0.8)] },
  chaoxing: { theme: '突破 · 延迟弹射', od: [DLY(1.2, 2), B('crit', 18, 2)], law: [DLY(3.4, 3), CHN(1.0, 4, 0.35), B('crit', 25, 3)] },
  alice: { theme: '突破 · 延迟眩晕', od: [DLY(1.1, 2), Db('vuln', 25, 2, 'foes')], law: [DLY(3.2, 2), STN('foes', 1), G('keyflare', 30)] },
  doresain: { theme: '突破 · 比例扣血引爆', od: [PCT(5), LS(45)], law: [PCT(8.5, 'foes'), DTB(1.0), BLD(19, 1.2), LS(40)] },
};

const FALLBACK = { od: [D(1.2, 'foes')], law: [D(2.0, 'foes')] };

// 平衡系数：只缩放「力度」（伤害倍率 / 比例 / 增益数值），不动结构、层数、回合数，
// 所以每位的形状（谁靠毒、谁靠反击）保持原样，只是把数值拉到同一条线上。
// tools/extra-bench.mjs 量的是「带上它比不带它多赢多少」，这一列就是拿它校准出来的。
const TUNE = {
  "24": 1.361,
  "agrippa": 2.200,
  "aigis": 2.200,
  "alice": 0.954,
  "alva": 1.825,
  "arachne": 2.200,
  "aurita": 2.200,
  "caecus": 2.200,
  "caraboo": 1.711,
  "casiah": 2.200,
  "castor": 2.200,
  "celeste": 2.200,
  "chaoxing": 2.131,
  "clementine": 1.360,
  "corposant": 2.200,
  "daffodil": 1.222,
  "doll": 2.200,
  "doll-inferno": 2.200,
  "doresain": 0.822,
  "dragond": 1.322,
  "erica": 1.430,
  "faint": 2.200,
  "faros": 2.200,
  "goliath": 1.182,
  "hameln": 0.973,
  "helot": 1.290,
  "helot-catena": 1.157,
  "horla": 2.200,
  "jenkin": 2.080,
  "karen": 1.345,
  "kathigu-ra": 2.200,
  "leigh": 2.200,
  "lily": 2.200,
  "liz": 2.200,
  "lotan": 1.097,
  "lotan-cetarchon": 2.200,
  "maodie": 2.200,
  "mengyi": 2.200,
  "miryam": 1.310,
  "mouchette": 2.200,
  "murphy": 1.059,
  "murphy-fauxborn": 2.200,
  "nautila": 1.845,
  "nymphaea": 2.200,
  "ogier": 2.200,
  "ogier-oathbound": 2.200,
  "pandia": 1.398,
  "pickman": 1.349,
  "pollux": 1.218,
  "pontos": 1.010,
  "ramona": 2.200,
  "ramona-timeworn": 2.200,
  "ratking": 1.686,
  "ryker": 1.036,
  "salvador": 2.200,
  "samo": 2.200,
  "sanga": 0.789,
  "saya": 2.200,
  "sorel": 2.200,
  "tawil": 2.200,
  "thais": 2.200,
  "tinct": 1.796,
  "tulu": 2.200,
  "uvhash": 0.701,
  "vivian": 2.200,
  "vortice": 1.129,
  "wanda": 2.200,
  "winkle": 1.241,
  "xiamolin": 2.200,
  "xu": 2.200,
  "zerok": 2.200,
};

const scale = (e, w) => {
  if (w === 1) return { ...e };
  const o = { ...e };
  // 上限：只放大力度，但不能放大到「一发清场 / 一个 buff 顶穿」的程度，否则手感会崩
  if (typeof o.m === 'number') o.m = Math.min(o.t === 'execute' ? 3.6 : 4.0, Math.round(o.m * w * 1000) / 1000);
  if (typeof o.pct === 'number') o.pct = Math.min(o.t === 'pctHp' ? 14 : 12, Math.round(o.pct * w * 10) / 10);
  if (typeof o.v === 'number') o.v = Math.min(o.t === 'lifesteal' ? 55 : 60, Math.round(o.v * w));
  return o;
};

function build(slug, a, L) {
  const names = EXTRA_NAMES[slug] || [`${a.zh}·超限`, `${a.zh}·终焉`];
  const def = SKILLS[slug] || FALLBACK;
  const list = (L ? def.law : def.od) || (L ? FALLBACK.law : FALLBACK.od);
  const w = TUNE[slug] ?? 1;
  const effects = list.map((e) => scale(e, w));
  const every = (L ? def.lawEvery : def.odEvery) || (L ? EXTRA_EVERY.Law : EXTRA_EVERY.Od);
  const sk = { name: names[L ? 1 : 0], effects, extra: true, every, theme: def.theme || '' };
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
