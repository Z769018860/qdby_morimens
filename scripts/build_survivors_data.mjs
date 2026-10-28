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
