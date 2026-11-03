// Arena (PvP). Two parts:
//  · 天梯: LADDER ranks of bots (人机). Their teams are generated deterministically from the rank (higher = stronger).
//    Everyone starts unranked (LADDER+1); beating rank r takes that rank.
//    名次越多，单场能跨的跨度越大（STEPS），否则爬完 1000 名要两百多场。
//  · 好友对战: fight a friend's team from a battle code (see friend.js). No server, no rewards, no limits.
import { hash, mulberry32 } from './rng.js';
import { simulate, ROUND_LIMIT } from './battle.js';
import { newState, teamDefs, stageGold, battleSeed } from './game.js';
import { skillLevel } from './stats.js';

export const LADDER = 1000, UNRANKED = LADDER + 1, ARENA_DAILY = 5, WINDOW = 5;
// 登顶之后的「层数」：名次 1 之上再接 FLOORS 层，名次写成 0、-1、-2…（第 n 层 = 名次 1-n）。
// 以前打到第 1 名就没有更高的对手了，而第 1 名那只人机只有 100 级 / 20 叠位——满养成的队伍随便碾过去，
// 有人已经登顶、竞技场就此没东西可打。现在第 1 名之上还有 100 层，一层比一层强，第 100 层远超满养成的裸队。
export const FLOORS = 100, MIN_RANK = 1 - FLOORS;
export const floorOf = (rank) => (rank <= 0 ? 1 - rank : 0);                    // 名次 → 第几层（没登顶 = 0）
export const rankZh = (rank) => (rank >= UNRANKED ? '未上榜' : rank <= 0 ? `登顶第 ${floorOf(rank)} 层` : `第 ${rank} 名`);
// 候选对手的名次跨度：从自己名次开始依次往上减 1、2、4、8、16，
// 也就是实际差距 1 / 3 / 7 / 15 / 31 名 —— 名次越多，单场能跨的跨度越大。
const STEPS = [1, 2, 4, 8, 16];
// 登顶层里的候选：比自己高 1 / 2 / 4 / 7 / 12 层（层与层之间差得多，跨度不用像名次那么大）
const FSTEPS = [1, 1, 2, 3, 5];
const SURNAME = ['雾', '灰', '沉', '蚀', '潮', '霜', '烬', '夜', '铁', '白', '赤', '墨', '星', '黯', '琥珀', '银'];
const GIVEN = ['行者', '看守', '拾荒人', '缝补匠', '巡礼者', '守夜人', '调香师', '摆渡人', '誊写员', '旅伴', '歌者', '猎手'];
const day = () => new Date().toISOString().slice(0, 10);

export function arenaState(state) {
  const a = (state.arena ||= { name: '', rank: UNRANKED, best: UNRANKED, wins: 0, losses: 0, day: '', tries: ARENA_DAILY, rewardDay: '' });
  a.name ||= '旅人';
  a.friends ||= [];
  // 名次夹在 [第 100 层, 未上榜] 里（手改 / 老存档里的怪值不能让天梯算出 NaN 对手）
  a.rank = Math.max(MIN_RANK, Math.min(UNRANKED, Math.round(Number(a.rank) || UNRANKED)));
  a.best = Math.max(MIN_RANK, Math.min(UNRANKED, Math.round(Number(a.best) || UNRANKED)));
  return a;
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
    const lv = Math.max(1, Math.min(159, +s.lv || 1)), star = Math.max(0, Math.min(99, +s.star || 0));
    const d = { slug: s.slug, name: a.zh, img: a.portrait, type: a.type, realm: a.realm, lv, star, kit: data.kit(s.slug, skillLevel(lv, star)), boss: false };
    for (const k of KEYS) d[k] = Math.max(k === 'hp' ? 1 : 0, Math.min(CAP[k], +s[k] || 0));
    return d;
  });
}

// ---- bots
const RANK1_POWER = 8200;                                      // 第 1 名人机的战力（测过：snapshot 口径 hp/10+atk+0.8def）
const FLOOR_TOP = 22;                                          // 第 100 层的战力是第 1 名人机的多少倍
export function botEntry(rank, data) {
  const rng = mulberry32(hash(`arena-bot${rank}`));
  const floor = floorOf(rank);                                // 登顶层数（名次 ≥ 1 时是 0）
  const f = Math.min(1, (LADDER - rank) / (LADDER - 1));      // 0 at the last rank … 1 at rank 1（登顶层都按 1 算）
  // 天梯顶端要对得起玩家 159 级 / 99 叠位的上限，否则 1000 名只有前 100 名有难度
  // 登顶层：等级 100 → 159（前 30 层），叠位 20 → 99（前 60 层）
  const lv = floor ? Math.round(100 + 59 * Math.min(1, (floor - 1) / 30)) : Math.round(2 + 98 * Math.pow(f, 1.15));
  const star = floor ? Math.round(20 + 79 * Math.min(1, (floor - 1) / 60)) : Math.min(20, Math.floor(f * 22));
  const all = data.awakeners.map((a) => a.slug).sort();
  const realms = ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'], main = realms[Math.floor(rng() * 4)];
  const pickFrom = (arr, n) => { const a = [...arr], out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return out; };
  const inRealm = all.filter((s) => data.bySlug[s].realm === main);
  let slugs = f > 0.45 ? pickFrom(inRealm, 3) : pickFrom(all, 2);
  slugs = [...slugs, ...pickFrom(all.filter((s) => !slugs.includes(s)), 4 - slugs.length)];
  const fake = newState(data, 1);
  fake.roster = Object.fromEntries(slugs.map((s) => [s, { lv, star }]));
  const team = teamDefs(fake, data, slugs);
  let gear = 1 + 0.8 * f;                                     // stands in for wheels / covenants / relics / orders
  const raw = snapshot(team);
  const powOf = (arr, g) => arr.reduce((s, x) => s + (x.hp * g) / 10 + x.atk * g + x.def * g * 0.8, 0);
  if (floor) {
    // 登顶层的目标战力按「第 1 名那只人机」的倍数给：第 1 层 1.3 倍，第 100 层 FLOOR_TOP 倍，指数过渡；
    // 再按这一层的裸属性反推「装备倍率」。满养成的裸队（159 级 / 99 叠位 / 超限 99 / 法则 60）约是第 1 名人机的 5.5 倍。
    const target = RANK1_POWER * 1.3 * Math.pow(FLOOR_TOP / 1.3, (floor - 1) / (FLOORS - 1));
    gear = target / powOf(raw, 1);
  }
  const snap = raw.map((s) => ({ ...s, hp: Math.round(s.hp * gear), atk: Math.round(s.atk * gear), def: Math.round(s.def * gear) }));
  const name = `${SURNAME[Math.floor(rng() * SURNAME.length)]}${GIVEN[Math.floor(rng() * GIVEN.length)]}`;
  return { rank, type: 'bot', id: `bot${rank}`, name, snap, power: snap.reduce((s, x) => s + x.hp / 10 + x.atk + x.def * 0.8, 0) | 0 };
}

// ---- local ladder: only the player's rank is stored; the occupant of every rank is the bot of that rank
export function localOpponents(state, data) {
  const a = arenaState(state), out = [], seen = new Set();
  let r = Math.min(a.rank, UNRANKED);
  if (r <= MIN_RANK) return out;
  for (let i = 0; i < STEPS.length; i++) {
    r = Math.max(MIN_RANK, r - (r <= 1 ? FSTEPS : STEPS)[i]);
    if (seen.has(r)) break;
    seen.add(r); out.push(botEntry(r, data));
    if (r === MIN_RANK) break;                                // 第 100 层是最后一层
    if (out.length >= WINDOW) break;
  }
  return out;
}
// winning rank r inserts you there; the ones in between shift down (the server does the same for real players)
export const localSettle = (state, entry, win) => ({ rank: win ? Math.min(arenaState(state).rank, entry.rank) : arenaState(state).rank });

// ---- fighting & rewards
export function fightArena(state, data, entry, slugs = null) {
  const team = teamDefs(state, data, slugs && slugs.length ? slugs : state.team);
  const foes = hydrate(entry.snap, data);
  const seed = battleSeed(state);
  const res = simulate({ allies: team.list, enemies: foes, seed, strategy: state.strategy, maxRounds: ROUND_LIMIT.boss });
  return { ...res, team, foes, entry };
}
export const dailyRankReward = (rank) => (rank <= 0 ? 20 + Math.min(10, Math.ceil(floorOf(rank) / 10)) : rank <= 1 ? 20 : rank <= 5 ? 16 : rank <= 20 ? 13 : rank <= 100 ? 10 : rank <= 300 ? 7 : rank <= 600 ? 5 : rank <= LADDER ? 3 : 0);

// apply the outcome (rank already decided by the ladder) to the player's state
export function applyArena(state, data, fight, newRank) {
  const a = arenaState(state);
  a.tries--;
  state.stats.battles++;
  const rw = { gold: 0, tickets: 0, cores: 0, up: 0 };
  if (fight.win) {
    a.wins++; state.stats.wins++;
    // 金币按「对手在这条天梯上的相对高度」算（与 LADDER 名次数无关），顶端约等于第 60 关的收益
    const f = Math.max(0, Math.min(1, (LADDER - fight.entry.rank) / (LADDER - 1)));
    rw.gold = Math.round(stageGold(Math.round(20 + 45 * f)) * 0.7);
    const prevBest = a.best;
    a.rank = newRank;
    if (newRank < prevBest) { rw.up = prevBest - newRank; rw.tickets = Math.max(1, Math.floor(rw.up / 4)); rw.cores = Math.min(120, Math.round(rw.up * 0.8)); a.best = newRank;
      const nf = Math.max(0, floorOf(newRank) - floorOf(prevBest)); // 首次踏上的新层：额外奖励
      if (nf) { rw.tickets += 2 * nf; rw.cores += 40 * nf; }
    }
  } else { a.losses++; rw.gold = Math.round(stageGold(15) * 0.15); }
  state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
  return rw;
}
export function claimArenaDaily(state) {
  const a = arenaState(state);
  if (a.rank > LADDER || a.rewardDay === day()) return null;
  a.rewardDay = day();
  const t = dailyRankReward(a.rank);
  state.tickets += t; state.gold += 1500; state.cores += t * 5;
  return { tickets: t, gold: 1500, cores: t * 5 };
}
export const canClaimArenaDaily = (state) => { const a = arenaState(state); return a.rank <= LADDER && a.rewardDay !== day(); };

// friendly match against a decoded battle code; only the record is stored (no rewards)
export function fightFriend(state, data, friend, slugs = null) {
  const res = fightArena(state, data, { rank: 0, type: 'friend', name: friend.name, snap: friend.snap }, slugs);
  const a = arenaState(state);
  const rec = a.friends.find((f) => f.name === friend.name) || (a.friends.unshift({ name: friend.name, wins: 0, losses: 0, power: friend.power }), a.friends[0]);
  rec.power = friend.power; if (res.win) rec.wins++; else rec.losses++;
  a.friends = a.friends.slice(0, 20);
  state.stats.battles++;
  return res;
}
