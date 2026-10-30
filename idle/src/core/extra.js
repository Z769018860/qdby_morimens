// 满超限 / 满最终法则 的专属技能：每位唤醒体各两个，名字独一份。
//
//   超限技（超限 Lv 99 解锁）：每行动 3 次，在普通行动之后免费追加一次；
//   终焉技（最终法则 Lv 99 解锁）：每行动 4 次，在普通行动之后免费追加一次，效果比超限技更重。
//
// 效果取自战斗里已有的效果词汇（伤害 / 治疗 / 护盾 / 增减益 / 流血 / 中毒 / 反击 / 护垒 / 屏障 / 能量）：
// 按职阶（突击 / 守护 / 合唱）选一组各 6 种的套路，用 slug 的哈希挑其中一种、再微调倍率，
// 最后按界域（混沌 / 血肉 / 深海 / 超维）附加一条界域特效。名字和描述是每位专属的。
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

const hashOf = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const r1 = (x) => Math.round(x * 100) / 100;

// 套路：每个职阶 6 种 × (超限技, 终焉技)；k 是该位的倍率微调（0.92 ~ 1.08）
const RECIPES = {
  ASSAULT: [
    (k, L) => [E.dmg(r1((L ? 1.7 : 0.9) * k), { to: 'foes' }), L ? E.debuff('vuln', 20, 2, 'foes') : E.debuff('def', 15, 2, 'foes')],
    (k, L) => [E.dmg(r1((L ? 3.8 : 2.4) * k), { to: 'foeLow' }), L ? E.dmg(r1(0.5 * k), { to: 'foes' }) : E.gauge('aliemus', 20)],
    (k, L) => [E.dot(r1((L ? 0.8 : 0.45) * k), L ? 4 : 3, 'foes'), E.dmg(r1((L ? 1.0 : 0.6) * k), { to: 'foes' }), ...(L ? [E.gauge('keyflare', 20)] : [])],
    (k, L) => [E.dmg(r1((L ? 1.0 : 0.7) * k), { to: 'foeRand', hits: L ? 5 : 4 }), ...(L ? [E.buff('crit', 25, 2)] : [])],
    (k, L) => [E.buff('atk', L ? 50 : 35, L ? 3 : 2), ...(L ? [E.buff('amp', 30, 3)] : []), E.dmg(r1((L ? 3.0 : 2.0) * k), { to: 'foe' })],
    (k, L) => [E.status('poison', L ? 15 : 8, 3, 'foes'), E.dmg(r1((L ? 1.0 : 0.6) * k), { to: 'foes' }), ...(L ? [E.debuff('def', 25, 2, 'foes')] : [])],
  ],
  WARDEN: [
    (k, L) => [E.shield(r1((L ? 1.6 : 0.9) * k), 'allies'), ...(L ? [E.status('fortress', 30, 3, 'allies')] : [])],
    (k, L) => [E.status('fortress', L ? 35 : 20, L ? 3 : 2, 'allies'), E.shield(r1((L ? 1.4 : 0.8) * k), 'self')],
    (k, L) => [E.status('counter', L ? 6 : 3, 3, 'self'), E.dmg(r1((L ? 1.2 : 0.5) * k), { to: 'foes' }), ...(L ? [E.shield(r1(1.0 * k), 'self')] : [])],
    (k, L) => [E.debuff('atk', L ? 40 : 25, 2, 'foes'), E.shield(r1((L ? 1.5 : 0.9) * k), 'self'), ...(L ? [E.dmg(r1(1.0 * k), { to: 'foes' })] : [])],
    (k, L) => [E.buff('def', L ? 60 : 40, 2, 'allies'), E.heal(r1((L ? 1.0 : 0.6) * k), 'ally')],
    (k, L) => [E.status('barrier', L ? 3 : 2, 3, 'allies'), ...(L ? [E.shield(r1(1.0 * k), 'allies')] : [])],
  ],
  CHORUS: [
    (k, L) => [E.heal(r1((L ? 1.5 : 0.8) * k), 'allies'), ...(L ? [E.shield(r1(0.8 * k), 'allies')] : [])],
    (k, L) => [E.gauge('aliemus', L ? 45 : 25, 'allies'), ...(L ? [E.gauge('keyflare', 20, 'allies')] : [])],
    (k, L) => [E.buff('atk', L ? 50 : 30, 2, 'allies'), ...(L ? [E.buff('crit', 20, 2, 'allies')] : [])],
    (k, L) => [E.shield(r1((L ? 1.2 : 0.7) * k), 'allies'), E.heal(r1((L ? 1.0 : 0.5) * k), 'ally')],
    (k, L) => [E.debuff('vuln', L ? 40 : 25, 2, 'foes'), E.dmg(r1((L ? 1.2 : 0.5) * k), { to: 'foes' })],
    (k, L) => [E.buff('crit', L ? 30 : 20, 2, 'allies'), E.gauge('aliemus', L ? 30 : 15, 'allies'), ...(L ? [E.heal(r1(0.8 * k), 'allies')] : [])],
  ],
};

// 界域附加特效：混沌 = 自身暴击；血肉 = 自疗；深海 = 自盾；超维 = 超共鸣能量
function realmRider(realm, L) {
  switch (realm) {
    case 'CHAOS': return [E.buff('crit', L ? 30 : 20, 2)];
    case 'CARO': return [E.heal(L ? 0.8 : 0.4, 'self')];
    case 'AEQUOR': return [E.shield(L ? 1.0 : 0.6, 'self')];
    case 'ULTRA': return [E.gauge('keyflare', L ? 25 : 15)];
    default: return [];
  }
}

function build(slug, a, L) {
  const names = EXTRA_NAMES[slug] || [`${a.zh}·超限`, `${a.zh}·终焉`];
  const h = hashOf(slug);
  const recipes = RECIPES[a.type] || RECIPES.ASSAULT;
  const k = 0.92 + (h % 17) / 100;               // 0.92 ~ 1.08
  const effects = [...recipes[h % recipes.length](k, L), ...realmRider(a.realm, L)];
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
