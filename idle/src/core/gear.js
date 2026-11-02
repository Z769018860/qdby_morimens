import { hash, mulberry32 } from './rng.js';
import { GEAR_MAX_LV, RELIC_BASE_SLOTS, RELIC_SLOTS, RELIC_UNLOCK } from './constants.js';

export const ZERO = () => ({
  atkPct: 0, hpPct: 0, defPct: 0, critRate: 0, critDmg: 0, amp: 0, aliGain: 0, keyGain: 0,
  healBonus: 0, shieldBonus: 0, steal: 0, surviveChance: 0, openAli: 0, openKey: 0, firstBoost: 0, gold: 0,
});

// Wheel main stats (names come from the data) -> this game's stat keys.
// base 按「实战收益」排过一轮：共鸣/钥焰回复原来给 22，等于用一条主词条换到近 +10% 输出，
// 比增伤（8%）和攻击（8%）都值；暴击率偏小、暴击伤害偏大。现在把回复压到 16，
// 暴击率提到 8、暴击伤害提到 16，让 8 条主词条的可选性接近「看队伍缺什么」而不是「看谁数值最大」。
export const MAINSTAT = {
  CRIT_RATE: { zh: '暴击率', key: 'critRate', base: 8, unit: '%' },
  CRIT_DMG: { zh: '暴击伤害', key: 'critDmg', base: 16, unit: '%' },
  DMG_AMP: { zh: '伤害提升', key: 'amp', base: 8, unit: '%' },
  ALIEMUS_REGEN: { zh: '共鸣回复', key: 'aliGain', base: 16, unit: '%' },
  KEYFLARE_REGEN: { zh: '钥焰回复', key: 'keyGain', base: 16, unit: '%' },
  SIGIL_YIELD: { zh: '印记收益(金币)', key: 'gold', base: 8, unit: '%' },
  REALM_MASTERY: { zh: '领域精通(攻击)', key: 'atkPct', base: 8, unit: '%' },
  DEATH_RESISTANCE: { zh: '死扛', key: 'surviveChance', base: 0.12, unit: '', fmt: (v) => `${Math.round(v * 100)}%濒死存活` },
};

/* 器纹 / 特质：命轮以前只有 8 种（= 8 条主词条），同主词条的两件除了名字和界域一模一样；
   造物同理，310 件只有 10 个主题。这里按 id 哈希再挂一条**固定**的小加成，
   让每件都有自己的个性；不吃等级与精炼，所以不会随强化滚雪球、盖过主属性。 */
const SMALL_TRAITS = [
  { key: 'openAli', v: 6, zh: '起手共鸣 +6' },
  { key: 'openKey', v: 6, zh: '起手钥焰 +6' },
  { key: 'steal', v: 2, zh: '吸血 +2%' },
  { key: 'surviveChance', v: 0.02, zh: '濒死存活 +2%' },
  { key: 'gold', v: 4, zh: '金币 +4%' },
  { key: 'firstBoost', v: 8, zh: '首击增伤 +8%' },
  { key: 'amp', v: 2, zh: '增伤 +2%' },
  { key: 'healBonus', v: 3, zh: '治疗 +3%' },
];
// FNV 的低位很差：造物主题 = hash(id) % 10、特质 = hash(id+':r') % 8，两个数的奇偶会连在一起，
// 结果每个主题只能抽到 8 种特质里的 4 种（例如「蚀刻」永远没有起手钥焰、「祝福」永远没有首击增伤）。
// 特质这里先过一遍整数混合器再取模，和主题彻底脱钩。
const mixHash = (s) => {
  let h = hash(s);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  return (h ^ (h >>> 16)) >>> 0;
};
const TRAIT_BY_KEY = Object.fromEntries(SMALL_TRAITS.map((t) => [t.key, t]));
// 兜底用的老规则（按 id 哈希出一条）：只给「没有 rune 字段」的装备用（测试里手捏的、极老的存档在 migrate 之前）。
// 真实的装备在获得 / 迁移时就已经随机抽好了初始器纹（见 initialRune），不再有「固定属性」。
export const wheelRune = (def) => SMALL_TRAITS[mixHash(String(def?.id || '') + ':w') % SMALL_TRAITS.length];
export const relicTrait = (def) => SMALL_TRAITS[mixHash(String(def?.id || '') + ':r') % SMALL_TRAITS.length];
const RARITY_MULT = { N: 0.5, R: 0.7, SR: 1, SSR: 1.4 };
// 10 级以前每级 +10%（和原来一样，老存档的数不变）；10 级之后每级 +5%：满 40 级是 3.5 倍，
// 比原来的满级（2 倍）多 75%，但这 30 级要几十倍的金币，是给后期金币找的去处，不是白送战力。
const lvMult = (lv) => (lv <= 10 ? 1 + 0.1 * lv : 2 + 0.05 * (lv - 10));

/* ---------- 器纹刷取 ----------
   命轮的「器纹」原来是按 id 哈希固定的一条小加成。现在每件命轮都可以花金币刷：
   · 16 种属性（ZERO() 里的 16 个加成字段，一个不少）随机抽一种；
   · 5 个品阶：凡 / 良 / 精 / 极 / 绝，品阶决定数值倍率（精 = 原来的固定值 ×1.0）；
   · 不吃强化等级与精炼：器纹是固定的小加成，不会跟着强化滚雪球盖过主属性。
   没刷过的命轮沿用老规则（哈希出的那一条，按「精」算），所以老存档的数一个都不变。 */
export const RUNE_KEYS = ['atkPct', 'hpPct', 'defPct', 'critRate', 'critDmg', 'amp', 'aliGain', 'keyGain', 'healBonus', 'shieldBonus', 'steal', 'surviveChance', 'openAli', 'openKey', 'firstBoost', 'gold'];
// 「精」档的基础值：前 8 项与旧的固定器纹完全一致（起手共鸣 / 钥焰 +6、吸血 +2、濒死 +2%、金币 +4、首击 +8、增伤 +2、治疗 +3）
export const RUNE_BASE = {
  atkPct: 3, hpPct: 4, defPct: 4, critRate: 2, critDmg: 4, amp: 2, aliGain: 4, keyGain: 4,
  healBonus: 3, shieldBonus: 4, steal: 2, surviveChance: 0.02, openAli: 6, openKey: 6, firstBoost: 8, gold: 4,
};
export const RUNE_TIERS = [
  { t: 1, zh: '凡', m: 0.5, w: 40, color: '#9aa3b2' },
  { t: 2, zh: '良', m: 0.75, w: 30, color: '#7fd18b' },
  { t: 3, zh: '精', m: 1, w: 18, color: '#6aa8ff' },
  { t: 4, zh: '极', m: 1.5, w: 9, color: '#b07cff' },
  { t: 5, zh: '绝', m: 2.2, w: 3, color: '#ffc857' },
];
export const RUNE_DEFAULT_TIER = 3;
const fmtRune = (key, v) => (key === 'surviveChance' ? `${Math.round(v * 1000) / 10}%` : key === 'openAli' || key === 'openKey' ? `${Math.round(v * 10) / 10}` : `${Math.round(v * 10) / 10}%`);
/** 某件命轮当前生效的器纹：玩家刷过的（it.rune）优先，没刷过按老规则（哈希出的一条，「精」档） */
export function runeOf(def, rune, kind = 'wheel') {
  if (rune && RUNE_BASE[rune.key] != null && rune.t >= 1 && rune.t <= 5) return { key: rune.key, t: rune.t, rolled: true };
  return { key: (kind === 'relic' ? relicTrait(def) : wheelRune(def)).key, t: RUNE_DEFAULT_TIER, rolled: false };
}
export const runeValue = (key, t) => RUNE_BASE[key] * (RUNE_TIERS[(t || RUNE_DEFAULT_TIER) - 1] || RUNE_TIERS[2]).m;
export const runeLabel = (r) => `${STAT_ZH[r.key]} +${fmtRune(r.key, runeValue(r.key, r.t))}（${RUNE_TIERS[r.t - 1].zh}）`;
/** 初始器纹 / 特质：装备获得的那一刻随机抽（16 种属性 × 5 个品阶，和后面花金币刷取同一张表）。
 *  按「装备编号 + 存档种子」播种：同一件装备每次读档结果一致，但每个存档、每件装备各不相同。 */
export const initialRune = (uid, seed) => rollRuneWith(mulberry32(hash(`rune:${uid}:${seed}`)));
/** 抽一条器纹：品阶按权重，属性 16 选 1。rng 是 0~1 的函数 */
export function rollRuneWith(rng) {
  const total = RUNE_TIERS.reduce((n, x) => n + x.w, 0);
  let r = rng() * total, tier = RUNE_TIERS[0];
  for (const x of RUNE_TIERS) { if (r < x.w) { tier = x; break; } r -= x.w; }
  return { key: RUNE_KEYS[Math.min(RUNE_KEYS.length - 1, Math.floor(rng() * RUNE_KEYS.length))], t: tier.t };
}

export function wheelBonus(def, lv, awakener, rune) {
  const b = ZERO();
  const m = MAINSTAT[def.main];
  if (!m) return b;
  const rm = RARITY_MULT[def.rarity] ?? 1;
  const realm = awakener && def.realm === awakener.realm ? 1.25 : 1;
  b[m.key] += m.base * rm * lvMult(lv) * realm;
  b.atkPct += 3 * rm * lvMult(lv);
  const r = runeOf(def, rune);
  b[r.key] += runeValue(r.key, r.t);
  if (b.surviveChance) b.surviveChance = Math.min(0.9, b.surviveChance);
  return b;
}
export function wheelText(def, lv, rf = 0, rune = null) {
  const m = MAINSTAT[def.main];
  if (!m) return '';
  const rm = RARITY_MULT[def.rarity] ?? 1;
  const v = m.base * rm * lvMult(lv) * refineMult({ rf });
  const main = m.fmt ? m.fmt(v) : `${m.zh} +${v.toFixed(1)}%`;
  return `${main} · 器纹 ${runeLabel(runeOf(def, rune))}`;
}

export const COV_THEMES = [
  { zh: '攻伐', two: { atkPct: 10 }, four: { atkPct: 15, amp: 10 } },
  { zh: '坚韧', two: { hpPct: 12 }, four: { hpPct: 15, shieldBonus: 25 } },
  { zh: '铁壁', two: { defPct: 15 }, four: { defPct: 20, hpPct: 10 } },
  { zh: '锋芒', two: { critRate: 8 }, four: { critRate: 8, critDmg: 25 } },
  { zh: '共鸣', two: { aliGain: 15 }, four: { aliGain: 15, openAli: 40 } },
  { zh: '燃焰', two: { keyGain: 15 }, four: { keyGain: 15, openKey: 40 } },
  { zh: '慈悲', two: { healBonus: 15 }, four: { healBonus: 20, steal: 15 } },
  { zh: '狂潮', two: { amp: 10 }, four: { amp: 10, firstBoost: 35 } },
];
export const covTheme = (id) => COV_THEMES[(parseInt(String(id).replace(/\D/g, ''), 10) || 0) % COV_THEMES.length];

export const RELIC_THEMES = [
  { zh: '战意', key: 'atkPct', per: 1 }, { zh: '生机', key: 'hpPct', per: 1.2 },
  { zh: '壁垒', key: 'defPct', per: 1.4 }, { zh: '星辉', key: 'critRate', per: 0.6 },
  { zh: '蚀刻', key: 'critDmg', per: 2 }, { zh: '回响', key: 'openAli', per: 3 },
  { zh: '祝福', key: 'healBonus', per: 1.5 }, { zh: '财富', key: 'gold', per: 1.2 },
  { zh: '引火', key: 'openKey', per: 3 }, { zh: '锋锐', key: 'amp', per: 0.9 },
];
const RELIC_BASE = { N: 3, SR: 6, SSR: 10 };
export const relicTheme = (id) => RELIC_THEMES[hash(id) % RELIC_THEMES.length];
// 造物单件加成：基础值（Lv 决定），精炼再乘上去
export function relicBase(def, lv) {
  const th = relicTheme(def.id);
  return { th, v: (RELIC_BASE[def.rarity] ?? 6) * th.per * lvMult(lv), open: th.key.startsWith('open') };
}
export function relicBonus(def, lv, rune = null) {
  const { th, v } = relicBase(def, lv);
  const b = ZERO();
  b[th.key] = v;
  // 特质和命轮的器纹同一套刷取规则（16 种属性 × 5 个品阶）；没刷过的按哈希出的老特质、「精」档，数值不变
  const t = runeOf(def, rune, 'relic');
  b[t.key] = (b[t.key] || 0) + runeValue(t.key, t.t);
  if (b.surviveChance) b.surviveChance = Math.min(0.9, b.surviveChance);
  return b;
}
/** 精炼给的增量：每阶 +8% 基础值（rf 阶就是 +8% × rf） */
export const relicRefineGain = (def, lv, rf = 0) => relicBase(def, lv).v * 0.08 * (rf || 0);
export const relicText = (def, lv, rf = 0, rune = null) => {
  const { th, v, open } = relicBase(def, lv);
  const total = v * refineMult({ rf });
  return `全队${th.zh}：${total.toFixed(1)}${open ? ' 点起始能量' : '%'} · 特质 ${runeLabel(runeOf(def, rune, 'relic'))}`;
};
/** 精炼前 / 后对照，弹窗里用：{ base, now, next, rf, max } */
export function relicRefineView(def, lv, rf = 0) {
  const { th, v, open } = relicBase(def, lv);
  const at = (n) => v * refineMult({ rf: n });
  return {
    zh: th.zh, open, base: v, now: at(rf), next: rf < REFINE_MAX ? at(rf + 1) : at(rf),
    rf, max: REFINE_MAX,
  };
}

/* ---------- 造物栏位 & 造物羁绊 ----------
   栏位从 3 格起，按最高通关逐格解锁；同一主题（战意 / 生机 / …）的造物在栏位里
   凑够 2 / 4 / 6 件就激活该主题的羁绊，羁绊是「全队被动」，与单件加成叠加。 */
export const relicSlotCount = (maxStage = 0) => {
  let n = RELIC_BASE_SLOTS;
  for (const s of RELIC_UNLOCK) if (maxStage >= s) n++;
  return Math.min(RELIC_SLOTS, n);
};
export const relicLockedHint = (i, maxStage = 0) => RELIC_UNLOCK[i - RELIC_BASE_SLOTS] ?? null;

export const RELIC_BONDS = {
  战意: { 2: { atkPct: 6 }, 4: { atkPct: 10, amp: 6 }, 6: { atkPct: 15, amp: 12 } },
  生机: { 2: { hpPct: 8 }, 4: { hpPct: 12, healBonus: 10 }, 6: { hpPct: 18, shieldBonus: 12 } },
  壁垒: { 2: { defPct: 10 }, 4: { defPct: 14, hpPct: 8 }, 6: { defPct: 20, surviveChance: 0.05 } },
  星辉: { 2: { critRate: 5 }, 4: { critRate: 8, critDmg: 15 }, 6: { critRate: 12, critDmg: 26 } },
  蚀刻: { 2: { critDmg: 12 }, 4: { critDmg: 20, amp: 6 }, 6: { critDmg: 32, amp: 10 } },
  回响: { 2: { openAli: 12 }, 4: { openAli: 18, aliGain: 10 }, 6: { openAli: 28, aliGain: 18 } },
  祝福: { 2: { healBonus: 12 }, 4: { healBonus: 18, hpPct: 8 }, 6: { healBonus: 28, shieldBonus: 15 } },
  财富: { 2: { gold: 8 }, 4: { gold: 14, atkPct: 5 }, 6: { gold: 22, atkPct: 10 } },
  引火: { 2: { openKey: 12 }, 4: { openKey: 18, keyGain: 10 }, 6: { openKey: 28, keyGain: 18 } },
  锋锐: { 2: { amp: 5 }, 4: { amp: 9, firstBoost: 15 }, 6: { amp: 14, firstBoost: 30 } },
};
export const BOND_TIERS = [2, 4, 6];

// defs: 已装备造物的定义数组（null 忽略） -> { count, active, bonus }
export function relicBond(defs = []) {
  const count = {};
  for (const d of defs) { if (!d) continue; const th = relicTheme(d.id); count[th.zh] = (count[th.zh] || 0) + 1; }
  const bonus = ZERO(), active = [];
  for (const [zh, n] of Object.entries(count)) {
    const t = RELIC_BONDS[zh];
    if (!t) continue;
    for (const tier of [6, 4, 2]) if (n >= tier) { addBonus(bonus, t[tier]); active.push({ zh, tier }); }
  }
  return { count, active, bonus };
}

// stat key -> 中文，羁绊/钥令文案共用
export const STAT_ZH = {
  atkPct: '攻击', hpPct: '生命', defPct: '防御', critRate: '暴击率', critDmg: '暴击伤害', amp: '增伤',
  aliGain: '共鸣回复', keyGain: '钥焰回复', healBonus: '治疗', shieldBonus: '护盾', steal: '吸血',
  surviveChance: '濒死存活', openAli: '起始共鸣', openKey: '起始钥焰', firstBoost: '首击增伤', gold: '金币',
};
const PCT_KEYS = new Set(['surviveChance']);
export function bonusText(b = {}) {
  return Object.entries(b).filter(([, v]) => v).map(([k, v]) => {
    const n = PCT_KEYS.has(k) ? `${Math.round(v * 100)}%` : `+${Math.round(v * 10) / 10}${k.startsWith('open') ? '' : '%'}`;
    return `${STAT_ZH[k] || k} ${n}`;
  }).join(' · ');
}

/** 密契套装的档位数值（已含等级与精炼的缩放）。
 *  four 是**累计值**（2 件那档 + 4 件那档），和 covenantBonus 里两档相加的结果一致——
 *  以前文案直接印 th.four，玩家看到「4 件 +15%」实得 27%，对不上。 */
export function covenantTiers(defId, lv = 0, rf = 0) {
  const th = covTheme(defId);
  const m = (1 + 0.08 * lv) * (1 + 0.08 * rf);
  const scale = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v * m]));
  const four = { ...th.two };
  for (const [k, v] of Object.entries(th.four)) four[k] = (four[k] || 0) + v;
  return { th, two: scale(th.two), four: scale(four) };
}

// 件数按「全队同款」算（同一个 defId），**不是**同主题：同一套里的两件不同密契凑不成套装。
// 主题只用来分类（文案里的「坚韧系」、词条筛选），不参与判定。
export function covenantBonus(defId, lv, count) {
  const th = covTheme(defId);
  const b = ZERO();
  const add = (o) => { for (const [k, v] of Object.entries(o)) b[k] += v * (1 + 0.08 * lv); };
  if (count >= 2) add(th.two);
  if (count >= 4) add(th.four);
  return b;
}

// 10 级以前 ×1.5 一档（不变）；之后 ×1.28 一档：10→11 约 1.2 万，39→40 约 1500 万，一件从 10 升到满要 6 千多万，
// 全队 14 件装备升满约 9 亿，第 80 关起（每小时 187 万金币起）才有得花，第 100 关一小时 900 万。
export const gearCost = (kind, lv) => {
  const base = kind === 'relic' ? 260 : 200;
  return Math.round(lv <= 10 ? base * Math.pow(1.5, lv) : base * Math.pow(1.5, 10) * Math.pow(1.28, lv - 10));
};
export const canEnhance = (it) => it.lv < GEAR_MAX_LV;
export const dismantleValue = (rarity, lv) => Math.round(({ N: 40, R: 70, SR: 120, SSR: 260 }[rarity] || 80) * (1 + lv * 0.6));

export function addBonus(into, b) { for (const k of Object.keys(into)) { const value = Number(b?.[k]); into[k] = (Number.isFinite(into[k]) ? into[k] : 0) + (Number.isFinite(value) ? value : 0); } return into; }

// 精炼 (refine, paid in 银芯): +8% of an item's whole bonus per tier, up to 5 tiers
export const REFINE_MAX = 5;
export const REFINE_COST = [40, 80, 140, 220, 320];
export const refineMult = (it) => 1 + 0.08 * (it?.rf || 0);
export const refineCost = (it) => ((it?.rf || 0) >= REFINE_MAX ? 0 : REFINE_COST[it?.rf || 0]);
export function scaleBonus(b, m) { m = Number.isFinite(Number(m)) ? Number(m) : 1; if (m === 1) return b; for (const k of Object.keys(b)) b[k] = (Number.isFinite(b[k]) ? b[k] : 0) * m; return b; }

// 装备回溯：花固定银芯，把单件装备的强化等级和精炼阶数都倒回 0，当初强化花的金币、精炼花的银芯全部返还。
// 装备本身（种类、词条）不变；穿戴在身上的也能回溯，回溯后继续穿着。
export const GEAR_REWIND_COST = 50;
export function gearRewindPlan(it) {
  const lv = Math.max(0, Math.floor(it?.lv || 0)), rf = Math.max(0, Math.floor(it?.rf || 0));
  if (!it || (lv <= 0 && rf <= 0)) return { lv: 0, rf: 0, refund: 0, refundCores: 0, cost: 0 };
  let refund = 0;
  for (let l = 0; l < lv; l++) refund += gearCost(it.kind, l);
  const refundCores = REFINE_COST.slice(0, rf).reduce((a, x) => a + x, 0);
  return { lv, rf, refund, refundCores, cost: GEAR_REWIND_COST };
}
