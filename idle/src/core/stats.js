import {
  MAX_LV, MAX_AWAKEN, MAX_LV_HARD, AWAKEN_STAT_PER, AWAKEN_AMP_EVERY, AWAKEN_AMP_PER,
  AWAKEN_SKILL_EVERY, AWAKEN_SKILL_MAX, LEVEL_GATE, SKILL_MAX,
  OVERDRIVE_STAT_PER, OVERDRIVE_AMP_EVERY, OVERDRIVE_AMP_PER, OVERDRIVE_MAX,
} from './constants.js';

// ---------- 超限（叠满 99 后的无限成长） ----------
export const overdrive = (od = 0) => Math.max(0, Math.min(OVERDRIVE_MAX, Math.floor(Number(od) || 0)));
export const overdriveStatPct = (od = 0) => Math.round(overdrive(od) * OVERDRIVE_STAT_PER * 10) / 10;
export const overdriveAmp = (od = 0) => Math.floor(overdrive(od) / OVERDRIVE_AMP_EVERY) * OVERDRIVE_AMP_PER;
/** 从 od 级升到 od+1 级的花费：金币指数涨，银芯线性涨 */
export const overdriveCost = (od = 0) => ({ gold: Math.round(2e6 * Math.pow(1.10, overdrive(od))), cores: 100 + 20 * overdrive(od) });

// ---------- 叠位 ----------
// 叠位是唯一的等级上限来源：0 叠位封顶 60 级，每 1 叠位 +1 级，99 叠位封顶 159 级。
export const awaken = (r) => Math.max(0, Math.min(MAX_AWAKEN, Math.floor(r?.star || 0)));
export const levelCap = (star = 0) => Math.min(MAX_LV_HARD, MAX_LV + Math.max(0, Math.min(MAX_AWAKEN, Math.floor(star || 0))));
export const awakenStatPct = (star = 0) => Math.round(awaken({ star }) * AWAKEN_STAT_PER * 10) / 10;
export const awakenAmp = (star = 0) => Math.floor(awaken({ star }) / AWAKEN_AMP_EVERY) * AWAKEN_AMP_PER;
export const awakenSkill = (star = 0) => Math.min(AWAKEN_SKILL_MAX, Math.floor(awaken({ star }) / AWAKEN_SKILL_EVERY));
// 下一档叠位奖励（用于详情页的「再抽 3 次到 +6% 增伤」这类提示）
export const nextAwakenMilestone = (star = 0) => {
  const n = awaken({ star });
  const toAmp = AWAKEN_AMP_EVERY - (n % AWAKEN_AMP_EVERY);
  const toSkill = AWAKEN_SKILL_EVERY - (n % AWAKEN_SKILL_EVERY);
  return { amp: n >= MAX_AWAKEN ? 0 : toAmp, skill: n >= MAX_AWAKEN || awakenSkill(n) >= AWAKEN_SKILL_MAX ? 0 : toSkill };
};

// Level-1 numbers and per-level scaling come straight from the SKeyDB export;
// the multipliers below turn them into this game's own battle scale.
export function baseStats(a, lv, star = 0, od = 0) {
  const m = (1 + (AWAKEN_STAT_PER / 100) * awaken({ star })) * (1 + (OVERDRIVE_STAT_PER / 100) * overdrive(od));   // 超限是叠在叠位之上的乘区
  const safe = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  lv = Math.max(1, safe(lv) || 1);
  const g = (k) => safe(a.base?.[k]) + safe(a.scale?.[k]) * (lv - 1);
  const s = (k) => safe(a.sub?.[k]) + safe(a.subScale?.[k]) * (lv - 1) / 10;
  return {
    hp: Math.round(g('CON') * 10 * m),
    atk: Math.round(g('ATK') * 2.2 * m),
    def: Math.round(g('DEF') * 1.6 * m),
    critRate: s('CritRate'),
    critDmg: s('CritDamage'),
    amp: s('DamageAmplification'),
    aliGain: s('AliemusRegen') * 5,
    keyGain: s('KeyflareRegen'),
    surviveChance: 0,
  };
}

// 每级成长（详情页展示用，取自同一套公式）
export function growthPerLevel(a, star = 0, od = 0) {
  const m = (1 + (AWAKEN_STAT_PER / 100) * awaken({ star })) * (1 + (OVERDRIVE_STAT_PER / 100) * overdrive(od));   // 超限是叠在叠位之上的乘区
  const safe = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
  return {
    hp: Math.round(safe(a.scale?.CON) * 10 * m * 10) / 10,
    atk: Math.round(safe(a.scale?.ATK) * 2.2 * m * 10) / 10,
    def: Math.round(safe(a.scale?.DEF) * 1.6 * m * 10) / 10,
  };
}

export const power = (st) => Math.round(st.hp / 10 + st.atk + st.def * 0.8);
export const lvUpCost = (lv) => Math.round(40 * Math.pow(lv, 1.45));
export const canLevel = (lv, star = 0) => lv < levelCap(star);

// 突破：每 20 级一次，材料 = 金币 + 银芯。只卡等级，不额外给上限（上限归叠位）。
export const breakNeeded = (lv, brk = 0) => lv >= LEVEL_GATE && lv % LEVEL_GATE === 0 && Math.floor(lv / LEVEL_GATE) > (brk || 0);
export function breakCost(lv) {
  return { gold: Math.round(lvUpCost(lv) * 4), cores: 20 + lv };
}
export const nextBreakLevel = (lv, brk = 0) => {
  const step = Math.floor((brk || 0) + 1) * LEVEL_GATE;
  return Math.max(step, Math.ceil((lv + 1) / LEVEL_GATE) * LEVEL_GATE);
};

// 回溯：花固定 100 银芯，直接把等级倒回 1 级，当初升级和突破花的材料（金币 + 银芯）全部返还。
// 只动等级，不动叠位（等级上限归叠位，所以也不变）。
export const REWIND_COST = 100;
export function rewindPlan(r) {
  const lv = Math.max(1, Math.floor(r?.lv || 1));
  if (lv <= 1) return { to: 1, refund: 0, refundCores: 0, cost: 0, back: 0 };
  let refund = 0, refundCores = 0;
  for (let l = 1; l < lv; l++) refund += lvUpCost(l);
  const brk = Math.floor(r?.brk || 0);
  for (let k = 1; k <= brk; k++) { const g = k * LEVEL_GATE; if (g <= lv) { const c = breakCost(g); refund += c.gold; refundCores += c.cores; } }
  return { to: 1, back: lv - 1, refund, refundCores, cost: REWIND_COST };
}

// 叠位（银芯共鸣）：抽不到重复时也能推进，成本随叠位线性上升
export const awakenCost = (star = 0) => 20 + 5 * awaken({ star });

// 技能等级 0..4（显示 Lv.1–5）：每 15 级 +1 级（46 级到 Lv.4），叠位每 40 层再 +1（最多 +2）。
// 用固定 15 级一档而不是按等级上限比例，否则提升等级上限反而会把技能等级算低。
export const skillLevel = (lv, star = 0) => {
  const byLv = Math.min(3, Math.floor((Math.max(1, lv) - 1) / 15));
  return Math.max(0, Math.min(SKILL_MAX, byLv + awakenSkill(star)));
};
