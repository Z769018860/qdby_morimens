import { hash } from './rng.js';
import { GEAR_MAX_LV } from './constants.js';

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
const lvMult = (lv) => 1 + 0.1 * lv;

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
export function wheelText(def, lv) {
  const m = MAINSTAT[def.main];
  if (!m) return '';
  const rm = RARITY_MULT[def.rarity] ?? 1;
  const v = m.base * rm * lvMult(lv);
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
export function relicBonus(def, lv) {
  const th = relicTheme(def.id);
  const b = ZERO();
  b[th.key] = (RELIC_BASE[def.rarity] ?? 6) * th.per * lvMult(lv);
  return b;
}
export const relicText = (def, lv) => {
  const th = relicTheme(def.id);
  const v = (RELIC_BASE[def.rarity] ?? 6) * th.per * lvMult(lv);
  const open = th.key.startsWith('open');
  return `全队${th.zh}：${v.toFixed(1)}${open ? ' 点起始能量' : '%'}`;
};

export function covenantBonus(defId, lv, count) {
  const th = covTheme(defId);
  const b = ZERO();
  const add = (o) => { for (const [k, v] of Object.entries(o)) b[k] += v * (1 + 0.08 * lv); };
  if (count >= 2) add(th.two);
  if (count >= 4) add(th.four);
  return b;
}

export const gearCost = (kind, lv) => Math.round((kind === 'relic' ? 260 : 200) * Math.pow(1.5, lv));
export const canEnhance = (it) => it.lv < GEAR_MAX_LV;
export const dismantleValue = (rarity, lv) => Math.round(({ N: 40, R: 70, SR: 120, SSR: 260 }[rarity] || 80) * (1 + lv * 0.6));

export function addBonus(into, b) { for (const k of Object.keys(into)) into[k] += b[k] || 0; return into; }

// 精炼 (refine, paid in 银芯): +8% of an item's whole bonus per tier, up to 5 tiers
export const REFINE_MAX = 5;
export const REFINE_COST = [40, 80, 140, 220, 320];
export const refineMult = (it) => 1 + 0.08 * (it?.rf || 0);
export const refineCost = (it) => ((it?.rf || 0) >= REFINE_MAX ? 0 : REFINE_COST[it?.rf || 0]);
export function scaleBonus(b, m) { if (m === 1) return b; for (const k of Object.keys(b)) b[k] *= m; return b; }
