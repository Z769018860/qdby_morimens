// Realm towers: one tower per realm (混沌 / 血肉 / 深海 / 超维). Only awakeners of that realm may climb it
// (the best four you own are picked automatically, so the 3+/4 realm synergy always applies); enemies are drawn from
// monsters with the matching trait where the roster has them. One battle per floor, first clears give rewards.
import { hash, mulberry32 } from './rng.js';
import { simulate, roundLimitFor } from './battle.js';
import { buildEnemies } from './enemies.js';
import { allyDef, teamDefs, stageGold, battleSeed, addItem, rollItem, recordCodex } from './game.js';
import { power } from './stats.js';

export const REALM_TOWERS = ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'];
export const REALM_TRAIT = { CHAOS: null, CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra' };
export const TOWER_NAME = { CHAOS: '混沌尖塔', CARO: '血肉之塔', AEQUOR: '深海回廊', ULTRA: '超维阶梯' };
export const rtStage = (f) => Math.round(8 + f * 1.05);
export const rtInfo = (f) => ({ stage: rtStage(f), boss: f % 10 === 0, elite: f % 5 === 0 && f % 10 !== 0, node: f % 10 === 9 ? 9 : 3, reward: f % 20 === 0 });

export function rtPool(realm, data) {
  const t = REALM_TRAIT[realm];
  if (!t) return data.monsters;
  const own = data.monsters.filter((m) => m.traits.includes(t));
  const ok = ['Normal', 'Elite', 'Boss'].every((r) => own.some((m) => m.rank === r));
  return ok ? own : data.monsters;
}
// 每 20 层是「奖励首领」校猫的层：它不在任何界域的池子里，所以要显式补进候选（buildEnemies 会把它放在 Boss 位）
export const rtEnemies = (realm, f, data) => {
  const pool = rtPool(realm, data), cat = data.monsters.find((m) => m.reward);
  return buildEnemies(rtStage(f), cat && !pool.includes(cat) ? [...pool, cat] : pool, { seed: `rt${realm}${f}`, info: rtInfo(f), msk: data.msk });
};

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
  const res = simulate({ allies: team.list, enemies, seed, strategy: state.strategy, maxRounds: roundLimitFor(rtInfo(floor)) });
  state.stats.battles++;
  recordCodex(state, enemies, res.win);
  const rw = { gold: 0, tickets: 0, cores: 0, items: [] };
  if (res.win) {
    state.stats.wins++; state.stats.kills += res.kills;
    t.best = floor;
    const rng = mulberry32(seed ^ 0x77aa);
    rw.gold = Math.round(stageGold(rtStage(floor)) * 0.8);
    // 每层都有零头：券 / 银芯随层数缓慢变多，攒够 1 才发放（余数存在 t.drip 里，不会丢）
    t.drip ||= { tickets: 0, cores: 0 };
    t.drip.tickets += 0.08 + floor * 0.0008;
    t.drip.cores += 0.8 + floor * 0.012;
    const dt = Math.floor(t.drip.tickets); if (dt) { rw.tickets += dt; t.drip.tickets -= dt; }
    const dc = Math.floor(t.drip.cores); if (dc) { rw.cores += dc; t.drip.cores -= dc; }
    if (floor % 3 === 0) rw.tickets += 1;
    if (floor % 5 === 0) rw.cores += 12;
    if (floor % 10 === 0) { rw.tickets += 3; rw.cores += 20; rw.items.push(addItem(state, ...Object.values(rollItem(rng, rtStage(floor), data)))); }
    // 校猫层：额外给券与银芯（每 20 层一次）
    if (rtInfo(floor).reward) { rw.tickets += 3; rw.cores += 40; rw.items.push(addItem(state, ...Object.values(rollItem(rng, rtStage(floor) + 6, data)))); rw.cat = true; }
    state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
  }
  return { ...res, floor, realm, team, enemies, rw };
}
