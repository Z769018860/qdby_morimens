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
// 12 种原型决定「这个技能在幸存者里长什么样」。匹配顺序即优先级：
// 越具体的先判，最后落回单发弹道。
const RULES = [
  ['summon', /召唤|仆从|群鼠|鼠群|傀儡|随行|出动/],
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
  临战体势: 'shield', 心眼利刃: 'beam', 共生畸变: 'nova', 狂乱斩击: 'orbit',
  无色螺旋: 'orbit', 石质分解: 'nova', 永恒编织: 'field', 缚命之网: 'field',
  腺体分裂: 'summon', 友情的力量: 'heal', 破碎长戟: 'chain',
  奇迹祝福: 'heal', 雪夜魔咒: 'field', 念动力: 'missile', 噗: 'nova',
  暗影飞行: 'boomerang', 冥河之翼: 'orbit', 无色之梦: 'field', 永恒幻影: 'summon',
  痛苦榨取: 'beam', 精神抚慰: 'heal', 惩戒雷霆: 'strike', 不祥信号: 'field',
  裂颅者: 'strike', 异质潮汐: 'field', 自毁: 'nova', 命运坠落: 'strike',
  体外手术: 'beam', 等价交换: 'heal', 陨落者的挽歌: 'nova', 冥府之路: 'summon',
  '释放：机甲': 'summon', 函数过载: 'beam', 养分吸收: 'heal', 萌芽: 'field',
  欢欣之海: 'field', 深海暗流: 'chain', 断首之伤: 'beam', 最强者的法则: 'nova',
  灵魂序曲: 'chain', 记忆轮舞曲: 'orbit', 恨意宣泄: 'nova', 鲜血链条: 'chain',
  粉碎一击: 'strike', 绵长憎恶: 'field', 颂歌圣咏: 'heal', 挽歌圣咏: 'field',
  群鼠集结: 'summon', '布朗出动！': 'summon', 蟾蜍浓汤: 'field', 静默守望: 'shield',
  末路枪声: 'missile', 千兆耀斑: 'beam', 欲求不满之痛: 'heal', 苦痛与欢愉: 'chain',
  报偿打击: 'shield', 禁忌沼泽: 'field', 扑蛾之火: 'missile', 绿色火焰: 'field',
  '长刃：殒灭': 'beam', '短刃：吞噬': 'orbit', 桀骜之刃: 'orbit', 傲慢之潮: 'field',
  升华火刑: 'nova', 被选中之人: 'heal', 致命冲击: 'missile', '闪耀☆粉碎': 'nova',
  利莫里亚华尔兹: 'orbit', 深渊圣歌: 'field', 逆转漩涡: 'nova', 圣女诞生: 'heal',
  禁止入内: 'shield', 短期记忆: 'field', 午夜之潮: 'chain', 死亡丧钟: 'strike',
  罪染之枪: 'beam', 无尽之影: 'summon', 不稳屏障: 'shield', '「穿刺」之枪': 'beam',
  疯狂之鞭: 'orbit', 蜡烛般炽热的渴望: 'field', 噬色者: 'chain', 栩栩如生的描绘: 'summon',
  灼魂之光: 'beam', 净化裁决: 'strike', 憔悴肆虐: 'field', 憔悴者的召唤: 'summon',
  命定之剑: 'beam', 无拘之视: 'missile', 女王之剑: 'orbit', 突击论题: 'boomerang',
  意外之财: 'missile', 摊牌: 'nova', 受祝福的白骨: 'shield', 应消之苦: 'nova',
  美丽的慈悲: 'heal', 孤绝乐章: 'field', 脏腑之花: 'summon', 仿生: 'shield',
  玫瑰的优雅: 'orbit', 璞玉: 'beam', 全知真理: 'beam', 时之羽翼: 'boomerang',
  远古爱抚: 'heal', 圣血本能: 'field', 安魂曲: 'field', 远方旋律: 'missile',
  深渊秩序: 'chain', 当利莫里亚回归: 'nova', '沸腾吧，鲜血！': 'field',
  '尖啸吧，鲜血！': 'nova', 天降汤雨: 'strike', 就地取材: 'orbit', 蓄力: 'missile',
  '装填！': 'missile', 迷途之守: 'shield', 脊刺锁链: 'chain', 能量光束: 'beam',
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
// 没 tags 的按 id 轮转分一个，保证 42 件都能用。
const FX_KEYS = ['dmg', 'crit', 'guard', 'draw', 'energy', 'rage', 'str', 'exhaust'];
const creationFx = (c) => {
  for (const t of (c.t || [])) if (FX_KEYS.includes(t)) return t;
  const fallback = ['dmg', 'crit', 'guard', 'speed', 'area', 'magnet', 'regen'];
  return fallback[Number(c.id) % fallback.length];
};
for (const c of atlas.creations) c.fx = creationFx(c);

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
