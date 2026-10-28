// Realm towers: one tower per realm (混沌 / 血肉 / 深海 / 超维). Only awakeners of that realm may climb it
// (the best four you own are picked automatically, so the 3+/4 realm synergy always applies); enemies are drawn from
// monsters with the matching trait where the roster has them. One battle per floor, first clears give rewards.
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { buildEnemies } from './enemies.js';
import { allyDef, teamDefs, stageGold, battleSeed, addItem, rollItem, recordCodex } from './game.js';
import { power } from './stats.js';

export const REALM_TOWERS = ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'];
export const REALM_TRAIT = { CHAOS: null, CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra' };
export const TOWER_NAME = { CHAOS: '混沌尖塔', CARO: '血肉之塔', AEQUOR: '深海回廊', ULTRA: '超维阶梯' };
export const rtStage = (f) => Math.round(8 + f * 1.05);
export const rtInfo = (f) => ({ stage: rtStage(f), boss: f % 10 === 0, elite: f % 5 === 0 && f % 10 !== 0, node: f % 10 === 9 ? 9 : 3 });

export function rtPool(realm, data) {
  const t = REALM_TRAIT[realm];
  if (!t) return data.monsters;
  const own = data.monsters.filter((m) => m.traits.includes(t));
  const ok = ['Normal', 'Elite', 'Boss'].every((r) => own.some((m) => m.rank === r));
  return ok ? own : data.monsters;
}
export const rtEnemies = (realm, f, data) => buildEnemies(rtStage(f), rtPool(realm, data), { seed: `rt${realm}${f}`, info: rtInfo(f), msk: data.msk });

export function rtTeam(state, data, realm) {
  const owned = Object.keys(state.roster).filter((s) => data.bySlug[s]?.realm === realm);
  if (!owned.length) return null;
  const ranked = owned.map((s) => ({ s, p: power(allyDef(state, data, s, [s])) })).sort((a, b) => b.p - a.p).slice(0, 4).map((x) => x.s);
  return { slugs: ranked, ...teamDefs(state, data, ranked) };
}
export const rtBest = (state, realm) => (state.rtower?.[realm]?.best || 0);

export function doRTower(state, data, realm) {
  const team = rtTeam(state, data, realm);
  if (!team) return null;
  state.rtower ||= {};
  const t = (state.rtower[realm] ||= { best: 0 });
  const floor = t.best + 1;
  const enemies = rtEnemies(realm, floor, data);
  const seed = battleSeed(state);
  const res = simulate({ allies: team.list, enemies, seed, strategy: state.strategy });
  state.stats.battles++;
  recordCodex(state, enemies, res.win);
  const rw = { gold: 0, tickets: 0, items: [] };
  if (res.win) {
    state.stats.wins++; state.stats.kills += res.kills;
    t.best = floor;
    const rng = mulberry32(seed ^ 0x77aa);
    rw.gold = Math.round(stageGold(rtStage(floor)) * 0.8);
    if (floor % 3 === 0) rw.tickets += 1;
    if (floor % 10 === 0) { rw.tickets += 3; rw.items.push(addItem(state, ...Object.values(rollItem(rng, rtStage(floor), data)))); }
    state.gold += rw.gold; state.tickets += rw.tickets; state.stats.gold += rw.gold;
  }
  return { ...res, floor, realm, team, enemies, rw };
}
