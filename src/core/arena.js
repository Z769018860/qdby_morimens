// Arena (PvP ladder). 100 ranks. Everyone starts unranked (101) and the ladder is full of bots (人机): their teams are
// generated deterministically from the rank. Real players only meet each other after climbing into the top HUMAN_ZONE
// ranks — only there are players' team snapshots published as defenders (asynchronous PvP: you fight a saved snapshot,
// the server never simulates). Below the zone every opponent is a bot, even when a real player is sitting on that rank.
// Local mode (no server) works with the same rules but without humans. Win = take that rank; everyone between shifts down by one.
import { hash, mulberry32 } from './rng.js';
import { simulate } from './battle.js';
import { newState, teamDefs, stageGold, battleSeed } from './game.js';
import { skillLevel } from './stats.js';

export const LADDER = 100, HUMAN_ZONE = 30, UNRANKED = LADDER + 1, ARENA_DAILY = 5, WINDOW = 5;
const SURNAME = ['雾', '灰', '沉', '蚀', '潮', '霜', '烬', '夜', '铁', '白', '赤', '墨', '星', '黯', '琥珀', '银'];
const GIVEN = ['行者', '看守', '拾荒人', '缝补匠', '巡礼者', '守夜人', '调香师', '摆渡人', '誊写员', '旅伴', '歌者', '猎手'];
const day = () => new Date().toISOString().slice(0, 10);

export function arenaState(state) {
  return (state.arena ||= { pid: '', name: '', rank: UNRANKED, best: UNRANKED, wins: 0, losses: 0, day: '', tries: ARENA_DAILY, rewardDay: '' });
}
export function arenaTries(state) {
  const a = arenaState(state);
  if (a.day !== day()) { a.day = day(); a.tries = ARENA_DAILY; }
  return a.tries;
}

// ---- team snapshots (no kits; the kit is rebuilt from slug + skill level when it is fought)
const KEYS = ['hp', 'atk', 'def', 'critRate', 'critDmg', 'amp', 'aliGain', 'keyGain', 'healBonus', 'shieldBonus', 'steal', 'surviveChance', 'openAli', 'openKey', 'firstBoost'];
export function snapshot(team) {
  return team.list.map((d) => ({ slug: d.slug, lv: d.lv, star: d.star, ...Object.fromEntries(KEYS.map((k) => [k, d[k] || 0])) }));
}
const CAP = { hp: 5e6, atk: 2e5, def: 2e5, critRate: 100, critDmg: 400, amp: 300, aliGain: 300, keyGain: 300, healBonus: 300, shieldBonus: 300, steal: 100, surviveChance: 0.9, openAli: 100, openKey: 100, firstBoost: 300 };
export function hydrate(snap, data) {
  return (snap || []).filter((s) => data.bySlug[s.slug]).slice(0, 4).map((s) => {
    const a = data.bySlug[s.slug];
    const lv = Math.max(1, Math.min(60, +s.lv || 1)), star = Math.max(0, Math.min(5, +s.star || 0));
    const d = { slug: s.slug, name: a.zh, img: a.portrait, type: a.type, realm: a.realm, lv, star, kit: data.kit(s.slug, skillLevel(lv, star)), boss: false };
    for (const k of KEYS) d[k] = Math.max(k === 'hp' ? 1 : 0, Math.min(CAP[k], +s[k] || 0));
    return d;
  });
}

// ---- bots
export function botEntry(rank, data) {
  const rng = mulberry32(hash(`arena-bot${rank}`));
  const f = (LADDER - rank) / (LADDER - 1);                  // 0 at rank 100 … 1 at rank 1
  const lv = Math.round(2 + 58 * Math.pow(f, 1.2)), star = Math.min(5, Math.floor(f * 4.4));
  const all = data.awakeners.map((a) => a.slug).sort();
  const realms = ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'], main = realms[Math.floor(rng() * 4)];
  const pickFrom = (arr, n) => { const a = [...arr], out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  const inRealm = all.filter((s) => data.bySlug[s].realm === main);
  let slugs = f > 0.45 ? pickFrom(inRealm, 3) : pickFrom(all, 2);
  slugs = [...slugs, ...pickFrom(all.filter((s) => !slugs.includes(s)), 4 - slugs.length)];
  const fake = newState(data, 1);
  fake.roster = Object.fromEntries(slugs.map((s) => [s, { lv, star }]));
  const team = teamDefs(fake, data, slugs);
  const gear = 1 + 0.55 * f;                                  // stands in for wheels / covenants / relics
  const snap = snapshot(team).map((s) => ({ ...s, hp: Math.round(s.hp * gear), atk: Math.round(s.atk * gear), def: Math.round(s.def * gear) }));
  const name = `${SURNAME[Math.floor(rng() * SURNAME.length)]}${GIVEN[Math.floor(rng() * GIVEN.length)]}`;
  return { rank, type: 'bot', id: `bot${rank}`, name, snap, power: snap.reduce((s, x) => s + x.hp / 10 + x.atk + x.def * 0.8, 0) | 0 };
}

// ---- local ladder: only the player's rank is stored; the occupant of every rank is the bot of that rank
export function localOpponents(state, data) {
  const a = arenaState(state), out = [];
  for (let r = Math.min(a.rank, UNRANKED) - 1; r >= 1 && out.length < WINDOW; r--) out.push(botEntry(r, data));
  return out;
}
// winning rank r inserts you there; the ones in between shift down (the server does the same for real players)
export const localSettle = (state, entry, win) => ({ rank: win ? Math.min(arenaState(state).rank, entry.rank) : arenaState(state).rank });

// ---- fighting & rewards
export function fightArena(state, data, entry) {
  const team = teamDefs(state, data);
  const foes = hydrate(entry.snap, data);
  const seed = battleSeed(state);
  const res = simulate({ allies: team.list, enemies: foes, seed, strategy: state.strategy });
  return { ...res, team, foes, entry };
}
export const dailyRankReward = (rank) => (rank <= 1 ? 20 : rank <= 3 ? 15 : rank <= 10 ? 12 : rank <= 30 ? 8 : rank <= 60 ? 5 : rank <= LADDER ? 3 : 0);

// apply the outcome (rank already decided by the ladder) to the player's state
export function applyArena(state, data, fight, newRank) {
  const a = arenaState(state);
  a.tries--;
  state.stats.battles++;
  const rw = { gold: 0, tickets: 0, up: 0 };
  if (fight.win) {
    a.wins++; state.stats.wins++;
    rw.gold = Math.round(stageGold(20 + (LADDER - fight.entry.rank) * 0.45) * 0.7);
    const prevBest = a.best;
    a.rank = newRank;
    if (newRank < prevBest) { rw.up = prevBest - newRank; rw.tickets = Math.max(1, Math.floor(rw.up / 2)); a.best = newRank; }
  } else { a.losses++; rw.gold = Math.round(stageGold(15) * 0.15); }
  state.gold += rw.gold; state.tickets += rw.tickets; state.stats.gold += rw.gold;
  return rw;
}
export function claimArenaDaily(state) {
  const a = arenaState(state);
  if (a.rank > LADDER || a.rewardDay === day()) return null;
  a.rewardDay = day();
  const t = dailyRankReward(a.rank);
  state.tickets += t; state.gold += 1500;
  return { tickets: t, gold: 1500 };
}
export const canClaimArenaDaily = (state) => { const a = arenaState(state); return a.rank <= LADDER && a.rewardDay !== day(); };
