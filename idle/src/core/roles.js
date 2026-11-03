// 定位特性：同一「类型」里的人怎么再分得开。
//
// 为什么要有它：合唱（辅助）全队用的是同一套模板 —— 战技治疗、技能一是治疗、
// 技能二给全队 +攻击、大招治疗 + 充能，24 个人只有附带的 rider 不一样。
// 于是「五个辅助」和「同一个辅助放五遍」在体验上没区别，编队时也没得选：
// 反正都是 +攻击，谁的面板高上谁。
//
// 司疗与守律的光环额外带 4% 增伤：这两个子定位自己不出手，而挂机判负几乎都是
// 「打满回合没清场」—— 纯续航在胜率上等于零贡献，所以把「队伍活得更久」折算一点推进力。
//
// 这里给合唱再切五刀（司疗 / 咏唱 / 击拍 / 蚀咏 / 守律），每一刀换掉的不是名字，
// 是**技能构成**：司疗的技能一是大治疗 + 小盾，咏唱的是 +攻击，击拍是伤害 + 暴击，
// 蚀咏是易伤 / 降防 / 持续伤害，守律是全队护盾。再各给一条只在队里生效的光环，
// 让「带哪一位」这件事有答案 —— 毒队要蚀咏、脆皮队要守律、速刷要击拍。
//
// 守护那边同理：纯盾型的几位（护盾堆得比谁都厚、伤害低得可怜）在挂机里是负资产
// （判负几乎都是「打满回合没清场」），给它们一条「铁壁」—— 回合结束时把没消耗掉的
// 护盾按比例砸回去，让「堆盾」这件事本身有输出。
//
// 这个文件只放数据与纯函数，不 import battle / skills，避免循环依赖。

/* 效果构造器（和 skills.js 里那套同构，但那边 import 本文件，所以这里自带一份） */
const D = (m, o = {}) => ({ t: 'dmg', m, hits: 1, to: 'foe', ...o });
const HEAL = (m, to = 'ally') => ({ t: 'heal', m, to });
const SH = (m, to = 'self') => ({ t: 'shield', m, to });
const BUF = (stat, v, dur, to = 'allies') => ({ t: 'buff', stat, v, dur, to });
const DEB = (stat, v, dur, to = 'foe') => ({ t: 'debuff', stat, v, dur, to });
const GAUGE = (v, to = 'allies') => ({ t: 'gauge', k: 'aliemus', v, to });
const CLN = (to = 'allies') => ({ t: 'cleanse', to });
const DOT = (m, dur, to = 'foe') => ({ t: 'dot', m, dur, to });

/**
 * 合唱的五个子定位。
 *   kit    换掉合唱的四个技能槽（Strike / Defense / Rouse 不变）
 *   aura   队伍光环，同类最多叠 2 层（stack 上限见 AURA_CAP）
 *   auraZh 界面上的一句话
 */
export const CHORUS_ROLES = {
  heal: {
    names: { Skill1: '愈合咏叹', Skill2: '汩汩生息', Exalt: '安魂长歌', OverExalt: '万籁回春' },
    zh: '司疗', tag: '疗', color: '#7ee2a8',
    desc: '治疗专精：单体大治疗附带护盾并净化，大招是全队治疗 + 全队净化（解毒）；输出几乎为零，作用是让队伍扛住伤害。',
    kit: {
      Skill1: [HEAL(1.9), SH(0.45, 'ally'), CLN('ally')],
      Skill2: [HEAL(0.8, 'allies'), BUF('atk', 12, 2)],
      Exalt: [HEAL(1.6, 'allies'), SH(0.5, 'allies'), CLN('allies'), GAUGE(18)],
      OverExalt: [HEAL(2.6, 'allies'), BUF('def', 20, 3), D(1.0)],
    },
    aura: { healBonus: 12, amp: 4 },
    auraZh: '全队受疗 +12%、增伤 +4%',
  },
  song: {
    names: { Skill1: '奋进咏叹', Skill2: '激昂圣咏', Exalt: '万民齐唱', OverExalt: '凯旋终曲' },
    zh: '咏唱', tag: '咏', color: '#f2c66d',
    desc: '攻击增益专精：技能二给全队最高一档的攻击加成并充能，大招再叠一层增伤；队里攻击越高，收益越大。',
    kit: {
      Skill1: [HEAL(1.1), BUF('atk', 14, 2)],
      Skill2: [BUF('atk', 26, 2), GAUGE(12)],
      Exalt: [BUF('atk', 22, 3), HEAL(0.8, 'allies'), GAUGE(18)],
      OverExalt: [BUF('atk', 34, 3), BUF('amp', 12, 3), HEAL(1.2, 'allies')],
    },
    aura: { atkPct: 6 },
    auraZh: '全队攻击 +6%',
  },
  beat: {
    names: { Skill1: '节拍咏叹', Skill2: '骤雨强拍', Exalt: '轰鸣重奏', OverExalt: '崩裂终曲' },
    zh: '击拍', tag: '击', color: '#f28a8a',
    desc: '暴击与增伤专精：自身带伤害，给的是暴击率 / 暴伤 / 增伤而不是攻击力；队伍暴伤堆得越高越吃香。',
    kit: {
      Skill1: [D(1.2), HEAL(0.9)],
      Skill2: [BUF('crit', 18, 2), BUF('amp', 8, 2)],
      Exalt: [D(1.9), BUF('crit', 15, 3), GAUGE(18)],
      OverExalt: [D(2.3), BUF('amp', 20, 3), BUF('crit', 18, 3)],
    },
    aura: { critDmg: 10 },
    auraZh: '全队暴击伤害 +10%',
  },
  blight: {
    names: { Skill1: '腐蚀咏叹', Skill2: '孱弱圣咏', Exalt: '衰朽合唱', OverExalt: '凋亡终曲' },
    zh: '蚀咏', tag: '蚀', color: '#b98af2',
    desc: '减益与持续伤害专精：易伤、降防、降攻打在敌人身上，大招铺持续伤害；毒队 / 流血队的核心拐。',
    kit: {
      Skill1: [HEAL(1.1), DEB('vuln', 20, 2)],
      Skill2: [DEB('def', 20, 2, 'foes'), DEB('atk', 15, 2, 'foes')],
      Exalt: [D(1.1, { to: 'foes' }), DEB('vuln', 22, 2, 'foes'), GAUGE(18)],
      OverExalt: [DOT(0.9, 3, 'foes'), DEB('vuln', 30, 3, 'foes'), HEAL(0.8, 'allies')],
    },
    aura: { amp: 5 },
    auraZh: '全队增伤 +5%（持续伤害同样吃）',
  },
  ward: {
    names: { Skill1: '庇护咏叹', Skill2: '壁垒圣咏', Exalt: '同心合唱', OverExalt: '永固终曲' },
    zh: '守律', tag: '律', color: '#6fc2e8',
    desc: '护盾专精：技能二与两个大招都是全队护盾，附带防御加成；没有任何输出，但能把脆皮队抬成活人。',
    kit: {
      Skill1: [HEAL(1.0), SH(0.9, 'allies'), CLN('ally')],
      Skill2: [SH(1.3, 'allies'), BUF('def', 15, 2)],
      Exalt: [SH(1.9, 'allies'), HEAL(0.6, 'allies'), GAUGE(18)],
      OverExalt: [SH(2.5, 'allies'), HEAL(1.0, 'allies'), BUF('def', 20, 3)],
    },
    aura: { shieldBonus: 15, amp: 4 },
    auraZh: '全队护盾 +15%、增伤 +4%',
  },
};

export const CHORUS_ROLE_IDS = Object.keys(CHORUS_ROLES);

/* 一个人的子定位。按「原作档案里的打法标签 + 现有 kit 偏向」定的，不是按稀有度或界域。
   改这里之前先跑 tools/balance-audit.mjs：分组会整体移动队伍的输出结构。 */
export const CHORUS_OF = {
  // ---- 咏唱：纯增益，自己几乎不出手 ----
  casiah: 'song', clementine: 'song', ramona: 'song', hameln: 'song',
  // ---- 击拍：带伤害 + 暴击 / 增伤 ----
  'doll-inferno': 'beat', 'ramona-timeworn': 'beat', ryker: 'beat', tawil: 'beat', vivian: 'beat',
  // ---- 蚀咏：毒 / 易伤 / 降防 ----
  celeste: 'blight', faros: 'blight', horla: 'blight', karen: 'blight', miryam: 'blight', tinct: 'blight', xu: 'blight',
  // ---- 守律：全队护盾 ----
  aigis: 'ward', 'murphy-fauxborn': 'ward', arachne: 'ward',
  // ---- 司疗：治疗 / 吸血续航 ----
  doll: 'heal', leigh: 'heal', pickman: 'heal', thais: 'heal', saya: 'heal',
  // ---- 彩蛋主播（creators.js） ----
  zerok: 'song', baiyun: 'song', xiamolin: 'song', banxing: 'beat', mengyi: 'heal',
};

/** 没登记的合唱（以后新加的角色）落到哪个子定位：保守给「咏唱」，至少是能用的增益 */
export const chorusRoleOf = (a) => CHORUS_ROLES[CHORUS_OF[a?.slug]] || CHORUS_ROLES.song;
export const chorusRoleId = (a) => (CHORUS_OF[a?.slug] && CHORUS_ROLE_IDS.includes(CHORUS_OF[a.slug]) ? CHORUS_OF[a.slug] : 'song');

/* 光环叠加上限：三种辅助各带两个同类，收益封顶 ——
   不封顶的话「四辅助」队会靠光环滚雪球，把编队的取舍又压回一个解。 */
export const AURA_CAP = 2;

/**
 * 一队人的光环合计。传 slugs + data（要 bySlug），返回加到每个单位上的字段。
 * 和羁绊一个口径：不看站位、不看存活，只要人在队里就生效。
 */
export function chorusAura(slugs = [], data) {
  const bySlug = data?.bySlug || {};
  const n = {};
  for (const s of slugs) {
    const a = bySlug[s];
    if (!a || a.type !== 'CHORUS') continue;
    const id = chorusRoleId(a);
    n[id] = (n[id] || 0) + 1;
  }
  const out = { atkPct: 0, critDmg: 0, amp: 0, healBonus: 0, shieldBonus: 0, roles: [] };
  for (const [id, c] of Object.entries(n)) {
    const r = CHORUS_ROLES[id];
    if (!r) continue;
    const k = Math.min(AURA_CAP, c);
    out.roles.push({ id, zh: r.zh, n: c, k });
    for (const [f, v] of Object.entries(r.aura)) out[f] = (out[f] || 0) + v * k;
  }
  return out;
}

/* ---------- 守护：铁壁 ---------- */
/* 纯盾型守护：护盾堆得最厚、伤害最低的那几位。挂机判负几乎都是「打满回合没清场」，
   于是「只会发盾」在胜率上等于没贡献（审计里这几位 60%~73%，同定位最强的 100%）。
   铁壁：回合结束时，把本回合没被消耗掉的护盾按 thorns% 反打回去（走固定伤害，
   吃半量防御、吃增伤与易伤）。不额外发盾、不加面板，只是让「堆盾」这件事本身有输出。
   名单来自 tools/balance-audit.mjs（2026-11）：守护组内胜率垫底的九位。 */
export const IRON_GUARD = {
  castor: 9, corposant: 9, faint: 8, murphy: 8, nautila: 7,
  sanga: 9, winkle: 7, pontos: 9, samo: 8, maodie: 10,
};

/* ---------- 定位补正 ---------- */
/* 2026-11 的那次全员审计（tools/balance-audit.mjs，60 级 ★10、20/28/36/44/52 关）里，
   这几位在自己的定位里垫底（60%~73%，同定位最强的 100%）。查下来原因不是数值低，
   而是**槽位被浪费**：技能二只发盾不打人、技能一挂着 0.29 倍率的伤害、整套 kit 一条输出都没有。
   挂机判负几乎都是「打满回合没清场」，所以这些槽位等于白拿一个回合。
   补法是在原有的槽位上追加一条 rider —— 不改模板、不改别人的数值，只让这几个人的空槽有事干。 */
export const ROLE_PATCH = {
  // 技能二原来是纯盾（1.4 倍），追加一段伤害
  sanga: { Skill2: [D(0.75)] },
  'ogier-oathbound': { Skill2: [D(0.7)] },
  xiamolin: { Skill2: [D(0.6)] },
  // 技能一的伤害只有 0.29 倍，太低
  corposant: { Skill1: [D(0.55)] },
  // 整套 kit 几乎没有伤害：给技能一补一段
  maodie: { Skill1: [D(0.6)] },
  arachne: { Skill1: [D(0.65)] },
  // 梦依流苏的技能二是纯减益，补一条给全队的增伤
  mengyi: { Skill2: [BUF('amp', 10, 2, 'allies')] },
};

/**
 * 把补丁套进一份 kit（不改原对象）。skill 表里没有这个槽就跳过。
 * 彩蛋角色（core/creators.js）的 kit 是手写的、不走 buildKit，所以那边也要单独调一次。
 */
export function applyRolePatch(slug, kit) {
  const patch = ROLE_PATCH[slug];
  if (!patch || !kit) return kit;
  const out = { ...kit };
  for (const [slot, extra] of Object.entries(patch)) {
    if (!out[slot]) continue;
    out[slot] = { ...out[slot], effects: [...out[slot].effects, ...extra.map((e) => ({ ...e }))] };
  }
  return out;
}

/** 这个单位有没有铁壁（没有就 0） */
export const thornsOf = (slug) => IRON_GUARD[slug] || 0;

/* 界面上「定位」那一栏的文案：类型 + 子定位（合唱）/ 特性（守护） */
export function roleChipOf(a) {
  if (!a) return null;
  if (a.type === 'CHORUS') {
    const r = chorusRoleOf(a);
    return { zh: `合唱 · ${r.zh}`, color: r.color, desc: r.desc, aura: r.auraZh };
  }
  if (a.type === 'WARDEN' && !thornsOf(a.slug)) {
    return { zh: '守护 · 反击盾', color: '#9fd0a8', desc: '盾没破时每挨一下攒 1 层反击；盾被打穿后反击清空，之后每挨一下让下一次出盾 +10%（最多 5 层）。回合末把剩余护盾的 30% 砸向敌方全体，并留 50% 进下一回合。场上有守护时，友方毒层每回合多褪 10%（最多 2 位）。', aura: '' };
  }
  if (a.type === 'WARDEN' && thornsOf(a.slug)) {
    return {
      zh: '守护 · 铁壁', color: '#9fd0a8',
      desc: `纯盾型守护：回合结束时把没被消耗的护盾按 ${thornsOf(a.slug)}% 反打回去，堆盾本身就是输出；同样享有反击盾、盾被打穿后的蓄盾、留盾与耐毒。`,
      aura: '',
    };
  }
  return null;
}
