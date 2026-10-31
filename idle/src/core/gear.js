import { hash } from './rng.js';
import { GEAR_MAX_LV, RELIC_BASE_SLOTS, RELIC_SLOTS, RELIC_UNLOCK } from './constants.js';

export const ZERO = () => ({
  atkPct: 0, hpPct: 0, defPct: 0, critRate: 0, critDmg: 0, amp: 0, aliGain: 0, keyGain: 0,
  healBonus: 0, shieldBonus: 0, steal: 0, surviveChance: 0, openAli: 0, openKey: 0, firstBoost: 0, gold: 0,
});

// Wheel main stats (names come from the data) -> this game's stat keys.
export const MAINSTAT = {
  CRIT_RATE: { zh: '暴击率', key: 'critRate', base: 6, unit: '%' },
  CRIT_DMG: { zh: '暴击伤害', key: 'critDmg', base: 14, unit: '%' },
  DMG_AMP: { zh: '伤害提升', key: 'amp', base: 8, unit: '%' },
  ALIEMUS_REGEN: { zh: '共鸣回复', key: 'aliGain', base: 22, unit: '%' },
  KEYFLARE_REGEN: { zh: '钥焰回复', key: 'keyGain', base: 22, unit: '%' },
  SIGIL_YIELD: { zh: '印记收益(金币)', key: 'gold', base: 8, unit: '%' },
  REALM_MASTERY: { zh: '领域精通(攻击)', key: 'atkPct', base: 8, unit: '%' },
  DEATH_RESISTANCE: { zh: '死扛', key: 'surviveChance', base: 0.12, unit: '', fmt: (v) => `${Math.round(v * 100)}%濒死存活` },
};
const RARITY_MULT = { N: 0.5, R: 0.7, SR: 1, SSR: 1.4 };
// 10 级以前每级 +10%（和原来一样，老存档的数不变）；10 级之后每级 +5%：满 40 级是 3.5 倍，
// 比原来的满级（2 倍）多 75%，但这 30 级要几十倍的金币，是给后期金币找的去处，不是白送战力。
const lvMult = (lv) => (lv <= 10 ? 1 + 0.1 * lv : 2 + 0.05 * (lv - 10));

export function wheelBonus(def, lv, awakener) {
  const b = ZERO();
  const m = MAINSTAT[def.main];
  if (!m) return b;
  const rm = RARITY_MULT[def.rarity] ?? 1;
  const realm = awakener && def.realm === awakener.realm ? 1.25 : 1;
  b[m.key] += m.base * rm * lvMult(lv) * realm;
  b.atkPct += 3 * rm * lvMult(lv);
  if (b.surviveChance) b.surviveChance = Math.min(0.9, b.surviveChance);
  return b;
}
export function wheelText(def, lv, rf = 0) {
  const m = MAINSTAT[def.main];
  if (!m) return '';
  const rm = RARITY_MULT[def.rarity] ?? 1;
  const v = m.base * rm * lvMult(lv) * refineMult({ rf });
  return m.fmt ? m.fmt(v) : `${m.zh} +${v.toFixed(1)}%`;
}

export const COV_THEMES = [
  { zh: '攻伐', two: { atkPct: 10 }, four: { atkPct: 15, amp: 10 } },
  { zh: '坚韧', two: { hpPct: 12 }, four: { hpPct: 15, shieldBonus: 25 } },
  { zh: '铁壁', two: { defPct: 15 }, four: { defPct: 20, hpPct: 10 } },
  { zh: '锋芒', two: { critRate: 8 }, four: { critRate: 8, critDmg: 25 } },
  { zh: '共鸣', two: { aliGain: 15 }, four: { aliGain: 15, openAli: 40 } },
  { zh: '燃焰', two: { keyGain: 15 }, four: { keyGain: 15, openKey: 40 } },
  { zh: '慈悲', two: { healBonus: 15 }, four: { healBonus: 20, steal: 8 } },
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
export function relicBonus(def, lv) {
  const { th, v } = relicBase(def, lv);
  const b = ZERO();
  b[th.key] = v;
  return b;
}
/** 精炼给的增量：每阶 +8% 基础值（rf 阶就是 +8% × rf） */
export const relicRefineGain = (def, lv, rf = 0) => relicBase(def, lv).v * 0.08 * (rf || 0);
export const relicText = (def, lv, rf = 0) => {
  const { th, v, open } = relicBase(def, lv);
  const total = v * refineMult({ rf });
  return `全队${th.zh}：${total.toFixed(1)}${open ? ' 点起始能量' : '%'}`;
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
