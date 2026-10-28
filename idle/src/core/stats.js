import { MAX_LV } from './constants.js';

// Level-1 numbers and per-level scaling come straight from the SKeyDB export;
// the multipliers below turn them into this game's own battle scale.
export function baseStats(a, lv, star = 0) {
  const m = 1 + 0.08 * star;
  const g = (k) => a.base[k] + a.scale[k] * (lv - 1);
  const s = (k) => a.sub[k] + (a.subScale[k] || 0) * (lv - 1) / 10;
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

export const power = (st) => Math.round(st.hp / 10 + st.atk + st.def * 0.8);
export const lvUpCost = (lv) => Math.round(40 * Math.pow(lv, 1.45));
export const canLevel = (lv) => lv < MAX_LV;
