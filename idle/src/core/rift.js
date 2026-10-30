// 融灾禁区：五队齐上的长线爬塔。一层要派 5 支队伍各打一组敌人，全胜才继续往上；
// 每两周（14 天）换一期：敌人重排、奖励重发、层数从头爬，最高 100 层。
//
// 和无限塔的区别：无限塔是「一支队伍、生命继承、一次爬到全灭」；
// 融灾禁区每层都是满状态，看的是你手上到底能凑出几套能打的队伍。
import { hash, mulberry32 } from './rng.js';
import { simulate, roundLimitFor } from './battle.js';
import { buildEnemies } from './enemies.js';
import { teamDefs, allyDef, fillLoadout, stageGold, battleSeed, addItem, rollItem, addOrder, rollOrder, recordCodex } from './game.js';
import { RIFT_SQUAD_KEYS, SQUAD_ZH, squadMembers, loadoutOf, withLo, autoSquadSlugs } from './squad.js';

export const RIFT_FLOORS = 100;          // 本期层数上限
export const RIFT_TEAMS = 5;             // 每层出战的队伍数
export const RIFT_DAILY = 3;             // 每日挑战次数
export const RIFT_CYCLE_DAYS = 14;       // 每两周换一期
export const RIFT_RUN_MAX = 10;          // 一次挑战最多连爬多少层（避免一次点出几十层 ×5 场）
const EPOCH = Date.UTC(2026, 0, 5);      // 第 1 期的起点（周一）
const REWARD_STAGE_CAP = 120;            // 金币曲线封顶，100 层的 stageGold 会大到没法显示

const dayKey = (d) => d.toISOString().slice(0, 10);
const utcMid = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** 当前这一期：id 单调递增，另给起止日期与剩余天数 */
export function riftCycle(d = new Date()) {
  const days = Math.floor((utcMid(d) - EPOCH) / 86400000);
  const idx = Math.floor(days / RIFT_CYCLE_DAYS);
  const start = EPOCH + idx * RIFT_CYCLE_DAYS * 86400000;
  const end = start + RIFT_CYCLE_DAYS * 86400000;
  const left = Math.max(1, Math.ceil((end - utcMid(d)) / 86400000));
  const fmt = (ms) => {
    const t = new Date(ms);
    return `${t.getUTCMonth() + 1}/${t.getUTCDate()}`;
  };
  return { id: `R${idx + 1}`, idx, start, end, daysLeft: left, startText: fmt(start), endText: fmt(end - 86400000) };
}

/** 层数 → 等效关卡。第 1 层 ≈ 第 11 关，第 100 层 ≈ 第 65 关（一期内爬得完，但要养到终盘） */
export const riftStage = (f) => Math.round(10 + f * 0.55);
export const riftRewardStage = (f) => Math.min(REWARD_STAGE_CAP, riftStage(f));
// 一层 5 场，允许漏一队：4 胜即通过。5 队全硬碰硬会让「怪物组合」的运气大过队伍强度。
export const RIFT_PASS = 4;
export const riftInfo = (f) => ({
  stage: riftStage(f),
  boss: f % 10 === 0,
  elite: f % 5 === 0 && f % 10 !== 0,
  node: f % 10 === 9 ? 9 : 3,
  reward: f % 25 === 0,                  // 每 25 层一场「校猫」奖励战
});

/**
 * 第 slot 队这一层的敌人。第五队负责顶 Boss / 精英（一层最多一场硬仗），
 * 其余四队打普通组，所以「谁去打 Boss」也是一层里的取舍。
 */
export function riftEnemies(f, data, slot = 0, cycle = riftCycle().id) {
  const b = riftInfo(f);
  const front = slot === RIFT_TEAMS - 1;
  const info = {
    ...b,
    boss: front && b.boss,
    elite: front && b.elite,
    // 普通组 2 个、精英组 3 个、Boss 组 Boss+2；奖励层由 buildEnemies 换成校猫
    node: front ? (b.boss ? 10 : b.elite ? 5 : 3) : b.elite ? 3 : 2,
    reward: front && b.reward,
  };
  return buildEnemies(b.stage, data.monsters, { seed: `rift${cycle}:${f}:${slot}`, info, msk: data.msk });
}

/** 本期状态：换期把层数清零（最高层永久记着），每日刷新次数 */
export function riftState(state, now = new Date()) {
  const c = riftCycle(now);
  const r = (state.rift ||= { cycle: c.id, floor: 0, best: 0, day: '', tries: RIFT_DAILY, tkFrac: 0, coFrac: 0, runs: 0 });
  if (r.cycle !== c.id) Object.assign(r, { cycle: c.id, floor: 0, day: '', tries: RIFT_DAILY });
  const today = dayKey(now);
  if (r.day !== today) { r.day = today; r.tries = RIFT_DAILY; }
  r.floor = Math.max(0, Math.min(RIFT_FLOORS, Math.floor(r.floor || 0)));
  return r;
}

/**
 * 五队：禁区一队~五队，**唤醒体和装备都不许重复**（五队同时出战，每队各用各的人、各的命轮 / 密契 / 造物 / 钥令）。
 *   · 自己编了的队：按编队来；某个唤醒体或装备已经被前面的队占了，这一队里就把它拿掉
 *     （缺的人补一个最强的没被占用的，缺的装备留空），队伍卡上标「有重复，已自动调整」。
 *   · 没编的队：从没被占用的唤醒体里自动补最强的 4 个，装备也从没被占用的里面自动配齐。
 *   以前没编的队会借通用编队或「当前队伍」顶上，五队就可能是同一批人、同一套装备——这里不再那样。
 * 返回的每一项带 lo（这队实际生效的配装），战斗和界面都按它算。
 */
export function riftParty(state, data) {
  const usedC = new Set(), usedI = new Set(), usedO = new Set();
  const powerOf = (slug) => allyDef(state, data, slug, [slug]).power;
  const claim = (lo) => {
    for (const e of Object.values(lo.equip || {})) { if (e?.wheel) usedI.add(e.wheel); if (e?.cov) usedI.add(e.cov); }
    for (const u of lo.relics || []) if (u) usedI.add(u);
    for (const o of lo.orders || []) if (o) usedO.add(o);
  };
  const slots = RIFT_SQUAD_KEYS.map((key, slot) => ({ key, slot, own: squadMembers(state, key).slice(0, 4), lo: loadoutOf(state, key) }));

  // 第一遍：自己编了的队先占位（按一队→五队的顺序，后面的队让给前面的）
  for (const sl of slots) {
    sl.slugs = sl.own.filter((x) => { if (usedC.has(x)) return false; usedC.add(x); return true; });
    sl.dupChars = sl.own.length - sl.slugs.length;
    sl.conflict = sl.dupChars > 0;
    if (sl.lo) {
      const lo = { equip: {}, relics: [], orders: [] };
      const take = (uid) => { if (!uid || usedI.has(uid)) { if (uid) sl.conflict = true; return null; } usedI.add(uid); return uid; };
      for (const slug of sl.slugs) {
        const e = sl.lo.equip?.[slug] || {};
        const o = {}; const w = take(e.wheel), c = take(e.cov);
        if (w) o.wheel = w; if (c) o.cov = c;
        lo.equip[slug] = o;
      }
      lo.relics = (sl.lo.relics || []).map(take);
      lo.orders = (sl.lo.orders || []).map((id) => { if (!id || usedO.has(id)) { if (id) sl.conflict = true; return null; } usedO.add(id); return id; });
      sl.eff = lo;
    }
  }
  // 第二遍：没编的队补人；有重复被拿掉人的队补回缺口
  for (const sl of slots) {
    const need = sl.own.length ? sl.dupChars : 4;
    if (need > 0) {
      const add = autoSquadSlugs(state, data, '', powerOf, need, [...usedC]);
      for (const x of add) usedC.add(x);
      sl.slugs = sl.slugs.concat(add);
    }
    if (!sl.eff) {
      const lo = { equip: {} };
      const r = fillLoadout(state, data, sl.slugs, { equip: lo.equip, exclude: { items: usedI, orders: usedO } });
      lo.relics = r.relics; lo.orders = r.orders;
      claim(lo);
      sl.eff = lo;
    }
  }
  return slots.map((sl) => ({
    key: sl.key, zh: SQUAD_ZH[sl.key], slot: sl.slot, slugs: sl.slugs, lo: sl.eff,
    filled: sl.own.length > 0, from: sl.own.length ? 'rift' : 'auto', conflict: sl.conflict,
    hasLo: !!sl.lo,
    team: withLo(state, sl.eff, () => teamDefs(state, data, sl.slugs)),
  }));
}

/** 一次挑战最多连爬 RIFT_RUN_MAX 层；每层五场全胜才算过 */
export function simulateRiftRun(state, data, { maxFloors = RIFT_RUN_MAX, party = null, cycle = riftCycle().id, startFloor = null, seed = null } = {}) {
  // 纯模拟：不碰 state.rift（次数、周期由 doRift / riftState 管），只读当前层数
  const ps = party || riftParty(state, data);
  const from = startFloor ?? (Math.floor(state.rift?.floor || 0) + 1);
  const base = seed ?? battleSeed(state);
  const floors = [];
  let replay = null;
  for (let f = from; f <= Math.min(RIFT_FLOORS, from + maxFloors - 1); f++) {
    const batch = ps.map((p, i) => {
      const enemies = riftEnemies(f, data, i, cycle);
      const res = simulate({
        allies: p.team.list,
        enemies,
        seed: (base ^ Math.imul(f, 40503) ^ Math.imul(i + 1, 2654435761)) >>> 0,
        strategy: state.strategy,
        maxRounds: roundLimitFor({ boss: riftInfo(f).boss && i === RIFT_TEAMS - 1 }),
      });
      return {
        slot: i, key: p.key, zh: p.zh, win: res.win, rounds: res.rounds, timeout: !!res.timeout,
        kills: res.kills, stats: res.stats, alive: res.allies.filter((a) => a.alive).length,
        total: res.allies.length, enemies, events: res.events, prep: res.prep, roundLimit: res.roundLimit,
      };
    });
    // 一层 5 场，4 胜即通过（漏掉的那队在结算里标红）
    const wins = batch.filter((b) => b.win).length;
    const win = wins >= RIFT_PASS;
    // 只留「决定这一层结果」的那场事件流：先找失败的那队，全胜则用最后一队
    const key = batch.findIndex((b) => !b.win);
    const keep = batch[key >= 0 ? key : batch.length - 1];
    replay = { ...keep, floor: f };
    floors.push({ floor: f, win, wins, battles: batch.map(({ events, prep, ...rest }) => rest) });
    if (!win) break;
  }
  const reached = floors.filter((x) => x.win).length;
  return { floors, reached, from, party: ps, replay, win: reached > 0 && floors.every((x) => x.win) };
}

/** 每层首次到达给奖励；跨层时零头存进 state.rift，不会因为抹零而丢 */
export function riftReward(state, data, from, to, rng) {
  const r = state.rift;
  const rw = { gold: 0, tickets: 0, cores: 0, items: [], orders: [], cat: 0 };
  let tk = r.tkFrac || 0, co = r.coFrac || 0;
  for (let f = from + 1; f <= to; f++) {
    rw.gold += Math.round(stageGold(riftRewardStage(f)) * 0.45);
    tk += 0.22 + f * 0.004;
    co += 2.4 + f * 0.03;
    const dt = Math.floor(tk); if (dt) { rw.tickets += dt; tk -= dt; }
    const dc = Math.floor(co); if (dc) { rw.cores += dc; co -= dc; }
    if (f % 5 === 0) { rw.tickets += 3; rw.cores += 30; }
    if (f % 10 === 0) rw.items.push(addItem(state, ...Object.values(rollItem(rng, riftRewardStage(f), data))));
    if (f % 25 === 0) {
      const od = rollOrder(rng, data);
      if (od) { const got = addOrder(state, od.id); if (got.isNew) rw.orders.push(got); else rw.cores += got.cores; }
      rw.cat += 1; rw.tickets += 6; rw.cores += 80;
    }
    if (f === RIFT_FLOORS) { rw.tickets += 40; rw.cores += 600; rw.items.push(addItem(state, ...Object.values(rollItem(rng, riftRewardStage(f) + 10, data)))); }
  }
  r.tkFrac = tk; r.coFrac = co;
  state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
  return rw;
}

/** 真正开打：扣次数、跑一层层、推进度、发奖励 */
export function doRift(state, data, { now = new Date(), maxFloors = RIFT_RUN_MAX, party = null } = {}) {
  const r = riftState(state, now);
  const c = riftCycle(now);
  if (r.floor >= RIFT_FLOORS) return { done: true, reason: 'cleared' };
  if (r.tries <= 0) return null;
  r.tries--;
  r.runs = (r.runs || 0) + 1;
  const ps = party || riftParty(state, data);
  const sim = simulateRiftRun(state, data, { maxFloors, party: ps, cycle: c.id });
  state.stats.battles += sim.floors.length * RIFT_TEAMS;
  for (const fl of sim.floors) {
    // 图鉴只按「打赢的敌人」记，输掉的那层不记
    const b = fl.battles.find((x) => x.win);
    if (b) recordCodex(state, b.enemies, true);
  }
  let rw = null, newBest = false;
  if (sim.reached > 0) {
    state.stats.wins += sim.reached * RIFT_TEAMS;
    state.stats.kills += sim.floors.reduce((s, fl) => s + fl.battles.reduce((a, b) => a + (b.win ? b.kills : 0), 0), 0);
    const before = r.floor;
    r.floor = Math.min(RIFT_FLOORS, r.floor + sim.reached);
    if (r.floor > (r.best || 0)) { r.best = r.floor; newBest = true; }
    rw = riftReward(state, data, before, r.floor, mulberry32((hash(`rift${c.id}`) ^ (before + 1) * 7919) >>> 0));
  }
  return { ...sim, rw, newBest, floor: r.floor, best: r.best || 0, cycle: c, state: r };
}

/** 本期的里程碑（界面上的刻度）：每 10 层一个，25/50/75/100 有额外奖励 */
export const RIFT_MILESTONES = [10, 25, 50, 75, 100];
