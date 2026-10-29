#!/usr/bin/env node
// 把官方数据整理成《唤醒体幸存者》能直接吃的表：data/survivors-data.json
//
// 素材全部来自游戏本身：
//   角色 → dictionary.awakener（62 名，含界域 / 定位 / 头像格位）
//   武器 → skills.json 里每名唤醒体的 Skill1 / Skill2（124 条技能），
//          名字和原文照搬，玩法上归到 12 种「原型」之一
//   天赋 → 每名唤醒体的 Rouse（灵知觉醒）名字，效果按界域 + 定位给
//   敌人 / 造物 / 命轮 / 契物 → dictionary 里对应的分类
//
// 这里只做「归类 + 清洗文本」，不改一个字的名字；数值在 js/sv/defs.js 里调。
//
// 用法：node scripts/build_survivors_data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const dict = readJson('data/dictionary.json');
const skills = readJson('data/skills.json');
const atlas = readJson('data/survivors-atlas.json');

// ---------------------------------------------------------------- 文本清洗
// 技能原文里有 ⟦key|显示名⟧ 这种富文本标记，去掉标记留显示名；
// 再把「抑郁人格：…」这类分支说明截掉，只留第一段能做风味描述的部分。
const clean = (s) => String(s || '')
  .replace(/⟦([^|⟧]*)\|([^⟧]*)⟧/g, '$2')
  .replace(/⟦([^⟧]*)⟧/g, '$1')
  .replace(/\s+/g, ' ')
  .trim();

const flavor = (s) => {
  const t = clean(s);
  const cut = t.split(/。(?=\S)|：/)[0];
  return (cut.length > 46 ? cut.slice(0, 44) + '…' : cut).replace(/。$/, '');
};

// ------------------------------------------------------------ 技能 → 原型
// 18 种原型决定「这个技能在幸存者里长什么样」。匹配顺序即优先级：
// 越具体的先判，最后落回单发弹道。
//
// 2026-10 扩容：原来 12 种，field 一家吃掉 22 把、beam 14 把、nova 13 把，
// 124 个技能里有一半是「放个圈 / 打道光 / 爆一下」，玩十局也见不到新花样。
// 新增 totem / mine / meteor / vortex / saw / rain 六种，并把判定顺序排到
// field 之前 —— 否则「陨石坠落」会被 field 的「燃烧」或 strike 的「坠落」抢走。
const RULES = [
  ['summon', /召唤|仆从|群鼠|鼠群|傀儡|随行|出动/],
  ['totem', /图腾|方尖碑|圣像|祭坛|哨塔|立牌/],
  ['mine', /地雷|炸弹|引爆|火药|雷区|埋设/],
  ['meteor', /陨石|陨星|流星|坠星|天火/],
  ['vortex', /漩涡|涡流|牵引|重力|吸附|聚拢|吸纳/],
  ['saw', /锯|旋齿|刃轮|切割/],
  ['rain', /光雨|箭雨|万箭|齐射|光柱|落光/],
  ['heal', /治疗|回复|愈合|恢复生命|抚慰|慈悲/],
  ['chain', /链|弹射|跳跃|连锁|传导/],
  ['beam', /光束|射线|贯穿|直线|耀斑|裁决|激光/],
  ['orbit', /环绕|旋转|回旋|鞭|刃舞/],
  ['boomerang', /投掷|掷出|飞回|抛|回收/],
  ['missile', /追踪|锁定|飞弹|导弹|引导|射击|枪声|装填|蓄力/],
  ['field', /领域|沼泽|燃烧|灼烧|持续伤害|地面|毒|花|潮/],
  ['nova', /全体|爆发|冲击|震荡|爆炸|轰炸|粉碎/],
  ['strike', /坠落|天降|落雷|降临|打击|重击|锤/],
  ['shield', /护盾|屏障|守护|防御|鳞甲|白骨/],
];

// 少量手工覆盖：规则看不准的（名字和实际效果对不上），按官方技能描述改判。
const OVERRIDE = {
  临战体势: 'shield', 心眼利刃: 'saw', 共生畸变: 'nova', 狂乱斩击: 'orbit',
  无色螺旋: 'vortex', 石质分解: 'nova', 永恒编织: 'field', 缚命之网: 'field',
  腺体分裂: 'summon', 友情的力量: 'heal', 破碎长戟: 'chain',
  奇迹祝福: 'heal', 雪夜魔咒: 'field', 念动力: 'missile', 噗: 'nova',
  暗影飞行: 'boomerang', 冥河之翼: 'orbit', 无色之梦: 'field', 永恒幻影: 'summon',
  痛苦榨取: 'beam', 精神抚慰: 'heal', 惩戒雷霆: 'rain', 不祥信号: 'totem',
  裂颅者: 'strike', 异质潮汐: 'vortex', 自毁: 'mine', 命运坠落: 'meteor',
  体外手术: 'beam', 等价交换: 'heal', 陨落者的挽歌: 'meteor', 冥府之路: 'summon',
  '释放：机甲': 'summon', 函数过载: 'beam', 养分吸收: 'heal', 萌芽: 'field',
  欢欣之海: 'vortex', 深海暗流: 'chain', 断首之伤: 'saw', 最强者的法则: 'nova',
  灵魂序曲: 'chain', 记忆轮舞曲: 'orbit', 恨意宣泄: 'nova', 鲜血链条: 'chain',
  粉碎一击: 'strike', 绵长憎恶: 'field', 颂歌圣咏: 'heal', 挽歌圣咏: 'rain',
  群鼠集结: 'summon', '布朗出动！': 'summon', 蟾蜍浓汤: 'field', 静默守望: 'totem',
  末路枪声: 'bolt', 千兆耀斑: 'rain', 欲求不满之痛: 'heal', 苦痛与欢愉: 'chain',
  报偿打击: 'shield', 禁忌沼泽: 'field', 扑蛾之火: 'missile', 绿色火焰: 'meteor',
  '长刃：殒灭': 'beam', '短刃：吞噬': 'saw', 桀骜之刃: 'saw', 傲慢之潮: 'vortex',
  升华火刑: 'nova', 被选中之人: 'heal', 致命冲击: 'missile', '闪耀☆粉碎': 'nova',
  利莫里亚华尔兹: 'orbit', 深渊圣歌: 'totem', 逆转漩涡: 'vortex', 圣女诞生: 'heal',
  禁止入内: 'shield', 短期记忆: 'field', 午夜之潮: 'chain', 死亡丧钟: 'strike',
  罪染之枪: 'beam', 无尽之影: 'summon', 不稳屏障: 'shield', '「穿刺」之枪': 'saw',
  疯狂之鞭: 'saw', 蜡烛般炽热的渴望: 'field', 噬色者: 'chain', 栩栩如生的描绘: 'summon',
  灼魂之光: 'meteor', 净化裁决: 'rain', 憔悴肆虐: 'field', 憔悴者的召唤: 'summon',
  命定之剑: 'saw', 无拘之视: 'missile', 女王之剑: 'orbit', 突击论题: 'boomerang',
  意外之财: 'bolt', 摊牌: 'mine', 受祝福的白骨: 'totem', 应消之苦: 'nova',
  美丽的慈悲: 'heal', 孤绝乐章: 'field', 脏腑之花: 'summon', 仿生: 'shield',
  玫瑰的优雅: 'orbit', 璞玉: 'beam', 全知真理: 'beam', 时之羽翼: 'boomerang',
  远古爱抚: 'heal', 圣血本能: 'field', 安魂曲: 'field', 远方旋律: 'missile',
  深渊秩序: 'chain', 当利莫里亚回归: 'nova', '沸腾吧，鲜血！': 'field',
  '尖啸吧，鲜血！': 'nova', 天降汤雨: 'rain', 就地取材: 'mine', 蓄力: 'bolt',
  '装填！': 'missile', 迷途之守: 'totem', 脊刺锁链: 'chain', 能量光束: 'beam',
  精神重建: 'heal', 思骨之苦: 'chain', 扇封之吻: 'heal', 打击: 'bolt', 防御: 'shield',
};

function protoOf(name, text, role) {
  if (OVERRIDE[name]) return OVERRIDE[name];
  const hay = name + ' ' + text;
  for (const [p, re] of RULES) if (re.test(hay)) return p;
  return role === '防御型' ? 'shield' : 'bolt';
}

// ---------------------------------------------------------------- 角色
const frames = atlas.frames;
const byPid = new Map();
const chars = [];
for (const a of dict.awakener) {
  const sk = (skills[a.pid] && skills[a.pid].skills) || [];
  const s1 = sk.find((s) => s.slot === 'Skill1');
  const s2 = sk.find((s) => s.slot === 'Skill2');
  const rouse = sk.find((s) => s.slot === 'Rouse');
  const frame = frames['c:' + a.id];
  if (frame == null) throw new Error('头像格位缺失：' + a.zh);
  const weapons = [s1, s2].filter(Boolean).map((s) => ({
    n: clean(s.n),
    e: clean(s.e || ''),
    proto: protoOf(clean(s.n), clean(s.d), a.role),
    text: flavor(s.d),
  }));
  const c = {
    id: String(a.id),
    pid: a.pid,
    n: a.zh,
    en: a.enName || a.en,
    realm: a.realm,
    realmCode: a.realmCode,
    role: a.role,
    roleCode: a.roleCode,
    rarity: a.rarity,
    img: frame,
    talent: rouse ? clean(rouse.n) : '天赋',
    talentText: rouse ? flavor(rouse.d) : '',
    weapons,
  };
  chars.push(c);
  byPid.set(a.pid, c);
}

// ---------------------------------------------------------------- 神秘唤醒体
// 这四名不是从官方图鉴里读出来的，是照着世界观补的「未登场者」：
// 解锁之前选人面板上只是一块黑色剪影，要靠解锁条件把真身放出来。
// 头像（assets/hidden/）与档案文案都来自灰机wiki·忘却前夜中文维基，
// 出处写在 bioSrc 里，界面会在档案块底部标出来。
//
// 他们的两条技能走 PROTOS 里 judge/paradox/lantern/seal 四种专属原型 ——
// 这四种不进 protoOf 的判定表，所以普通 62 名唤醒体的技能一条都不会落进来，
// 反过来这四名也永远不会出现在别人的卡池里（除非玩家已经把他们解锁）。
//
// img 指向图集格位（见 scripts/build_survivors_art.py 的 EXTRA_ART）；
// lock 字段既是解锁表的键，也是「未解锁时用剪影代替头像」和「要不要从卡池里
// 剔除」的判据 —— 有 img 但锁着，照样只画剪影。
const EXTRA = [
  {
    id: '90001', pid: 'hidden-tulu', n: '神王·图鲁', en: 'Tulu the Godking',
    realm: '混沌', realmCode: 'CHAOS', role: '伤害型', roleCode: 'ASSAULT', rarity: 'UR',
    img: 'c:90001', lock: '90001',
    talent: '王权',
    talentText: '每击杀 20 名敌人累积 1 层王权，攻击与范围随之增长',
    bio: '「顺应天命，不好吗？为什么要反抗命运的意志。」年幼的王沉睡于王座之上，于梦醒时分示下诏谕，权威遍及天下王土。他厌倦了自身的权能，也厌倦了超人的智慧与信徒狂热的崇拜，也厌倦了超越万古的长梦——没人知道他在漫长的睡眠里梦见了什么，但他们应当庆幸自己享有此等无知的。',
    bioSrc: '灰机wiki · 唤醒体档案「图鲁」（神王形态为其本源降临）',
    weapons: [
      { n: '断罪王座', e: 'Throne of Judgement', proto: 'judge', text: '王座自天而降，柱下无人得以站立' },
      { n: '王土加冕', e: 'Coronation of Ash', proto: 'nova', text: '以王座为中心，把整片土地掀翻' },
    ],
  },
  {
    id: '90002', pid: 'hidden-n', n: 'N', en: 'N',
    realm: '超维', realmCode: 'ULTRA', role: '辅助型', roleCode: 'CHORUS', rarity: 'UR',
    img: 'c:90002', lock: '90002',
    talent: '悖论',
    talentText: '每次升级有几率多获得一次三选一，代价是更薄的血',
    bio: '「伏行世间的混沌之雾，祂因人类的痛苦与绝望而愉悦。」——名录上还留着另一行：「N?」，注解只有四个字：一个玩笑。',
    bioSrc: '灰机wiki · 怪物「N」/「N?」（原初投影·欢愉眷属）',
    weapons: [
      { n: '无限递归', e: 'Infinite Recursion', proto: 'paradox', text: '把已经发生过的伤害，再发生一次' },
      { n: '逻辑闭环', e: 'Closed Loop', proto: 'shield', text: '一个自洽的圆，挡下所有不自洽的东西' },
    ],
  },
  {
    id: '90003', pid: 'hidden-william', n: '威廉', en: 'William',
    realm: '深海', realmCode: 'AEQUOR', role: '防御型', roleCode: 'WARDEN', rarity: 'UR',
    img: 'c:90003', lock: '90003',
    talent: '守夜',
    talentText: '受伤时反击，越是濒死越是难缠',
    bio: '威廉·德拉普尔。弥萨格的资深调查员，被守密人尊称为「学长」的存在。曾因某些无法言说的原因害怕外出，在校内学习的同时兼任情报组人员。好友死后，一改以往的作风转投前线，以「做他曾经做过的事」的方式来纪念逝去的朋友。随身携带一把破碎的银钥匙，艰难地维持着那些日渐消逝的记忆。',
    bioSrc: '灰机wiki · 剧情角色「威廉·德拉普尔」',
    weapons: [
      { n: '长明灯', e: 'Everlasting Lamp', proto: 'lantern', text: '灯亮着的时候，雾里的东西不敢靠太近' },
      { n: '夜巡', e: 'Night Watch', proto: 'orbit', text: '绕着灯走的一圈脚步，从不熄灭' },
    ],
  },
  {
    id: '90004', pid: 'hidden-keeper', n: '守密人', en: 'The Keeper',
    realm: '血肉', realmCode: 'CARO', role: '辅助型', roleCode: 'SUPPORT', rarity: 'UR',
    img: 'c:90004', lock: '90004',
    talent: '缄默契约',
    talentText: '缄默者知道得更多，也老得更快',
    bio: '弥萨格的调查员，持银钥匙者。所谓守密人，是与唤醒体「链接」、把祂们带进密境又带回来的人。他的记忆一直在漏——那是链接的代价，也是他还在往前走的理由。',
    bioSrc: '灰机wiki · 剧情页整理（该角色无独立条目，头像取自其默认头像「西维斯特」）',
    weapons: [
      { n: '封页之印', e: 'Sealing Sigil', proto: 'seal', text: '把敌人夹进书页，让它连呼吸都停住' },
      { n: '禁书记忆', e: 'Forbidden Recollection', proto: 'chain', text: '不该被读到的东西，沿着锁链爬出来' },
    ],
  },
];
for (const e of EXTRA) {
  if (chars.some((c) => c.id === e.id)) continue;
  // e.img 写的是图集里的帧**键名**（c:90001），这里要换成帧序号 —— atlasStyle()
  // 收的是数字，直接把键名塞进去会算出 NaN 的 background-position，
  // 浏览器会把它当 0 0，于是四个人全显示图集第一格（同一个头像）。
  const idx = frames[e.img];
  chars.push({
    id: e.id, pid: e.pid, n: e.n, en: e.en,
    realm: e.realm, realmCode: e.realmCode, role: e.role, roleCode: e.roleCode,
    rarity: e.rarity, img: idx == null ? null : idx, lock: e.lock,
    talent: e.talent, talentText: e.talentText,
    bio: e.bio, bioSrc: e.bioSrc,
    weapons: e.weapons,
  });
}

// 武器池：每名角色的两个技能各成一把，id 用 pid + 槽位，稳定不复用。
const WEAPONS = [];
for (const c of chars) {
  c.weapons.forEach((w, i) => {
    WEAPONS.push({
      id: c.pid + ':' + i,
      n: w.n,
      proto: w.proto,
      char: c.id,
      charName: c.n,
      realm: c.realm,
      realmCode: c.realmCode,
      role: c.role,
      text: w.text,
    });
  });
}
const missing = chars.filter((c) => c.weapons.length !== 2);
if (missing.length) console.warn('技能不全的角色：', missing.map((c) => c.n).join('、'));

const counts = {};
for (const w of WEAPONS) counts[w.proto] = (counts[w.proto] || 0) + 1;

// 造物在游戏里变成什么被动。官方造物的 tags 就是它在卡组里干的活
// （dmg / crit / guard / draw / energy / rage / str / exhaust），照着映射即可；
// 造物属性：26 类，按「攻击 / 投射 / 生存 / 节奏 / 资源」五组铺开。
// 官方 tags 只决定「落在哪一组」，组内具体效果按顺序轮转 —— 以前 42 件造物
// 只有 12 种效果，光「攻击力 +8%」就压了 14 件，抽到什么都一个样。
// 组内轮转保证同类造物尽量不撞，最后再做一次兜底覆盖：26 个效果必须各出现
// 至少一次，否则依赖它的超武永远解锁不了。
const FX_GROUPS = [
  { tag: ['dmg', 'str', 'crit', 'exhaust'], keys: ['dmg', 'str', 'crit', 'critdmg', 'exhaust'] },
  { tag: ['area'], keys: ['count', 'pierce', 'projspd', 'projrange', 'area', 'fieldr', 'dur'] },
  { tag: ['guard'], keys: ['guard', 'shieldup', 'regen', 'lifesteal', 'thorns'] },
  { tag: ['energy', 'speed'], keys: ['speed', 'energy', 'knock'] },
  { tag: ['draw', 'rage'], keys: ['draw', 'magnet', 'expup', 'rage', 'healup', 'summonup'] },
];
const ALL_FX = FX_GROUPS.flatMap((g) => g.keys);
const groupOf = (key) => FX_GROUPS.findIndex((g) => g.keys.includes(key));

const fxOf = new Map();
const cursor = {};
const pickIn = (gi) => {
  const keys = FX_GROUPS[gi].keys;
  const i = cursor[gi] || 0;
  cursor[gi] = i + 1;
  return keys[i % keys.length];
};
for (const c of atlas.creations) {
  const tags = c.t || [];
  let gi = FX_GROUPS.findIndex((g) => g.tag.some((t) => tags.includes(t)));
  // 没有 tags 的造物：按 id 散到 1~4 组，避开攻击组（不然又是「攻击力 +8%」）
  if (gi < 0) gi = 1 + (Number(c.id) % 4);
  fxOf.set(String(c.id), pickIn(gi));
}
// 兜底：把还没出现过的效果，从「已经拿到 ≥2 件」的造物挪一件过来。
// 先在同组里找（语义最贴近），同组实在没有可挪的才跨组 —— 26 个效果必须
// 每个都至少有一件造物承载，否则依赖它的超武条件是永远凑不齐的。
const fxCount = {};
for (const v of fxOf.values()) fxCount[v] = (fxCount[v] || 0) + 1;
for (const key of ALL_FX) {
  if (fxCount[key]) continue;
  const gi = groupOf(key);
  const pool = atlas.creations.filter((c) => fxCount[fxOf.get(String(c.id))] > 1);
  const sameGroup = pool.find((c) => groupOf(fxOf.get(String(c.id))) === gi);
  const host = sameGroup || pool[0];
  if (!host) continue;
  const cur = fxOf.get(String(host.id));
  fxCount[cur]--;
  fxOf.set(String(host.id), key);
  fxCount[key] = 1;
}
for (const c of atlas.creations) c.fx = fxOf.get(String(c.id));
const fxMiss = ALL_FX.filter((k) => !fxCount[k]);
if (fxMiss.length) console.warn('没有造物承载的效果：', fxMiss.join('、'));

const out = {
  at: Date.now(),
  chars,
  weapons: WEAPONS,
  monsters: atlas.monsters,
  creations: atlas.creations,
  wheels: atlas.wheels,
  covenants: atlas.covenants,
};
fs.writeFileSync(path.join(ROOT, 'data/survivors-data.json'), JSON.stringify(out), 'utf8');

console.log(`角色 ${chars.length} / 武器 ${WEAPONS.length}`);
console.log('原型分布：', Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
