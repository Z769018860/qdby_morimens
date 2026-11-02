// 电子斗蛐蛐 · 一桌人的账（纯逻辑，不碰 DOM）
//
// 玩法一句话：两个人一组的怪关进同一个笼子，谁先被打空谁出局；
// 围观的人（你 + 九个人机）在两队之间押注，彩池制结算——
//   押对的人按自己注额占总池的比例，把整池分掉（本金和输家的钱一起）；
//   押错的人那一注留在池里。
// 荷包低于最低注就下不了桌了。最后一个还坐着的拿走全部。
//
// 这里不实现战斗本身（在 engine.js），只负责：配对、收注、开打、分钱、淘汰。

import { makeUnit, newBattle, LV } from './engine.js';

export const MIN_STAKE = 50;      // 第一局的底注；低于它下不了桌
export const START_BANK = 1000;   // 玩家开局筹码
export const MAX_ROUNDS = 12;     // 打满这么多局还没分完，按荷包排名
export const STAKE_STEP = 3;      // 每这么多局，底注翻倍（钱不会凭空虚耗，只会越来越集中）

/** 第 n 局的底注：50·50·50 / 100·100·100 / 200·200·200 / 400…。拖到后期谁都得押大的。 */
export function minStake(round) {
  const step = Math.floor(Math.max(0, round - 1) / STAKE_STEP);
  return MIN_STAKE * Math.pow(2, Math.min(step, 4));
}
export const ROUND_TEAM = [1, 2, 3];   // 一队 1~3 只

/** 一只怪的面板战力：血 × 每回合输出倍率。用来配对与给人机估算，不进结算。 */
export function powerOf(mob, lv, data) {
  const u = makeUnit(mob, lv, 0, 0);
  const seq = (mob.op || []).concat(mob.cy || []);
  if (!seq.length) return u.maxHp * 0.2;
  let sum = 0;
  for (const sid of seq) {
    const sk = data.skills[sid];
    if (!sk) continue;
    let per = 0;
    for (const f of sk.fx) {
      if (f.k === 'hit') per += f.m * f.t;
      else if (f.k === 'str') per += f.v * 0.6;
      else if (f.k === 'bleed') per += 0.35;
      else if (f.k === 'poison') per += (f.v || 0) / Math.max(1, u.atk);
      else if (f.k === 'shield') per += f.m * 0.35;
      else per += 0.1;
    }
    sum += per;
  }
  const dps = (sum / seq.length) * u.atk;
  // 护盾/治疗类越多的队越耐打，给一点加成
  return Math.max(1, u.maxHp + dps * 6);
}

export function teamPower(team, data) {
  return team.reduce((n, x) => n + powerOf(x.mob, x.lv, data), 0);
}

/** 一支队的几项门面数据：人机各有各的看法（只看血 / 只看只数 / 只看输出）。 */
export function teamStats(team, data) {
  let hp = 0, atk = 0, power = 0;
  for (const x of team) {
    const u = makeUnit(x.mob, x.lv, 0, 0);
    hp += u.maxHp;
    atk += u.atk;
    power += powerOf(x.mob, x.lv, data);
  }
  return { hp, atk, n: team.length, power };
}

function gauss(rnd) {
  // Box–Muller，够用
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

/** 随机一支队伍：1~3 只，队里至多一只首领。 */
export function rollTeam(rnd, data, lvBias) {
  const n = pick(rnd, ROUND_TEAM);
  const out = [];
  const used = new Set();
  let bossUsed = false;
  for (let i = 0; i < n; i++) {
    let mob = null;
    for (let k = 0; k < 40; k++) {
      const m = pick(rnd, data.mobs);
      if (used.has(m.id)) continue;
      if (m.rank === 'Boss' && (bossUsed || n > 2)) continue;
      mob = m;
      break;
    }
    if (!mob) continue;
    used.add(mob.id);
    if (mob.rank === 'Boss') bossUsed = true;
    // 势级：同一队大体齐整，偶尔有一只高半档
    const lv = Math.max(0, Math.min(LV.length - 1,
      (lvBias ?? 1) + (rnd() < 0.18 ? (rnd() < 0.5 ? -1 : 1) : 0)));
    out.push({ mob, lv });
  }
  return out.length ? out : rollTeam(rnd, data, lvBias);
}

/**
 * 摆一局：左边随机，右边凑一个「看着接近、但不完全一样」的战力。
 * tilt 是右边相对左边的战力倍率，0.85~1.18 是常局，偶尔甩到 1.35。
 */
export function makeFixture(rnd, data) {
  const lvBias = rnd() < 0.25 ? 0 : 1 + Math.floor(rnd() * 2);
  const tilt = Math.exp(gauss(rnd) * 0.26) * (rnd() < 0.12 ? (rnd() < 0.5 ? 0.62 : 1.55) : 1);
  let best = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const L = rollTeam(rnd, data, lvBias);
    const pL = teamPower(L, data);
    const target = pL * tilt;
    let cand = null;
    for (let k = 0; k < 90; k++) {
      const R = rollTeam(rnd, data, lvBias);
      const pR = teamPower(R, data);
      const score = Math.abs(Math.log(pR / target));
      if (!cand || score < cand.score) cand = { R, pR, score };
      if (score < 0.06) break;
    }
    const total = Math.abs(Math.log(cand.pR / target));
    if (!best || total < best.total) best = { L, R: cand.R, pL, pR: cand.pR, total };
    if (total < 0.08) break;
  }
  return {
    L: best.L, R: best.R, pL: best.pL, pR: best.pR,
    sl: teamStats(best.L, data), sr: teamStats(best.R, data),
  };
}

/* ---------------------------------------------------------------- 一桌 */

export function newTable(data, seats, seed) {
  const s = {
    seed: seed >>> 0,
    rnd: null,
    round: 0,
    phase: 'idle',          // idle / bet / fight / settle / over
    you: {
      id: 'you', n: '你', bank: START_BANK, style: 'you', out: false, isYou: true,
      outRound: null,   // 第几局出局的：观战期间人机还在动账，座次得按出局先后排
    },
    ai: seats.map((x) => ({
      id: x.id, n: x.n, tag: x.tag, who: x.who, style: x.style, line: x.line, why: x.why,
      bank: x.bank, out: false, face: x.face || '',
      last: null,          // 上一局的下注结果，给界面做表情
    })),
    carry: 0,               // 上一局没人押中、压在桌上滚下来的注
    fixture: null,
    battle: null,
    bets: [],               // {id, side, amt, out?}
    data,
  };
  s.rnd = mulberry(seed);
  return s;
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 判出局：记下第几局走的。座次按出局先后排——先走的名次低，
 *  用「当前荷包」排会把先出局的人永远压在最底下，观战几局后座次就乱了。 */
function markOut(s, p) {
  if (p.out) return;
  p.out = true;
  p.outRound = s.round;
}

export function alivePlayers(s) {
  return [s.you, ...s.ai].filter((p) => !p.out);
}

export function standings(s) {
  return [s.you, ...s.ai].slice().sort((a, b) => {
    if (a.out !== b.out) return a.out ? 1 : -1;
    // 都出局了：谁走得晚谁在前（同局出局的再看荷包）。这才是淘汰赛的名次，
    // 不然观战到散桌时，先出局的人会一直垫在最底下。
    if (a.out && b.out && (a.outRound || 0) !== (b.outRound || 0)) {
      return (b.outRound || 0) - (a.outRound || 0);
    }
    return b.bank - a.bank;
  });
}

/** 开下一局：摆笼子、清注。 */
export function nextRound(s) {
  s.round += 1;
  s.phase = 'bet';
  s.fixture = makeFixture(s.rnd, s.data);
  s.bets = [];
  s.battle = null;
  s.result = null;
  return s.fixture;
}

/** 你押哪边、押多少。返回 {ok, why} */
export function placeBet(s, side, amt) {
  if (s.phase !== 'bet') return { ok: false, why: '现在不是下注的时候' };
  amt = Math.floor(amt / 10) * 10;
  const min = minStake(s.round);
  if (amt < min) return { ok: false, why: `这一局底注 ${min}` };
  if (amt > s.you.bank) return { ok: false, why: '荷包里没有这么多' };
  const i = s.bets.findIndex((b) => b.id === 'you');
  if (i >= 0) s.bets.splice(i, 1);
  s.bets.push({ id: 'you', side, amt });
  return { ok: true };
}

/** 人机依次下注。先让不看人的下完，跟随型最后看总量。 */
export function aiBet(s, decide) {
  const pool = { 0: 0, 1: 0 };
  for (const b of s.bets) pool[b.side] += b.amt;
  const order = s.ai.filter((p) => !p.out)
    .sort((a, b) => (a.style === 'herd' ? 1 : 0) - (b.style === 'herd' ? 1 : 0));
  const min = minStake(s.round);
  for (const p of order) {
    const bet = decide(p, s.fixture, pool, s, min);
    if (!bet) {
      s.bets.push({ id: p.id, side: -1, amt: 0, pass: true });
      p.last = { side: -1, amt: 0, pass: true };
      continue;
    }
    const side = bet.side;
    const amt = Math.min(p.bank, Math.max(min, Math.floor(bet.amt / 10) * 10));
    s.bets.push({ id: p.id, side, amt });
    pool[side] += amt;
    p.last = { side, amt };
  }
  return s.bets;
}

/** 开打：把两队的怪放进引擎，跑完整场。 */
export function startBattle(s) {
  const seed = Math.floor(s.rnd() * 0xffffffff) >>> 0;
  s.battle = newBattle(s.fixture.L, s.fixture.R, seed, s.data);
  s.phase = 'fight';
  return s.battle;
}

/** 结算彩池。 */
export function settle(s) {
  const b = s.battle;
  if (!b || !b.over) return null;
  const winner = b.winner;
  const all = [s.you, ...s.ai];
  const byId = new Map(all.map((p) => [p.id, p]));
  const placed = s.bets.filter((x) => !x.pass && x.amt > 0);
  const carry = s.carry || 0;
  const pool = placed.reduce((n, x) => n + x.amt, 0) + carry;   // 池子里含上一局没人押中的余注
  const winSide = winner === 0 ? 0 : 1;
  const winStake = placed.filter((x) => x.side === winSide).reduce((n, x) => n + x.amt, 0);
  const rows = [];

  // 全场没人押中：这一注不烧掉，原样压在桌上滚到下一局（彩池赛马的老规矩）。
  if (winStake === 0) {
    for (const x of placed) {
      const p = byId.get(x.id);
      if (!p) continue;
      p.bank -= x.amt;
      rows.push({ id: x.id, side: x.side, amt: x.amt, back: 0, net: -x.amt, win: false });
      if (p.bank < minStake(s.round + 1)) markOut(s, p);
    }
    s.carry = pool;
    s.result = { winner, pool, winStake: 0, rows, carry: pool, noOne: true, draw: winner === 'draw' };
    return afterSettle(s, rows);
  }

  // 彩池按注额比例分，取整会产生几块钱的零头：先按 floor 分，剩下的零头
  // 按小数部分从大到小补齐——否则每局都会凭空多出或烧掉几十块（sim 会报不守恒）。
  const winners = placed.filter((x) => x.side === winSide);
  const spare = new Map();
  let assigned = 0;
  for (const x of winners) {
    const exact = x.amt / winStake * pool;
    const base = Math.floor(exact);
    spare.set(x.id, { base, frac: exact - base });
    assigned += base;
  }
  let rest = pool - assigned;
  for (const x of [...winners].sort((a, b) => (spare.get(b.id).frac - spare.get(a.id).frac))) {
    if (rest <= 0) break;
    spare.get(x.id).base += 1;
    rest -= 1;
  }
  for (const x of placed) {
    const p = byId.get(x.id);
    if (!p) continue;
    if (x.side === winSide) {
      const back = spare.get(x.id).base;
      p.bank += back - x.amt;
      rows.push({ id: x.id, side: x.side, amt: x.amt, back, net: back - x.amt, win: true });
    } else {
      p.bank -= x.amt;
      rows.push({ id: x.id, side: x.side, amt: x.amt, back: 0, net: -x.amt, win: false });
    }
    if (p.bank < minStake(s.round + 1)) markOut(s, p);
  }
  s.carry = 0;
  s.result = { winner, pool, winStake, rows, carry: 0, draw: winner === 'draw' };
  return afterSettle(s, rows);
}

/** 淘汰判完之后收尾：还坐着的只剩一个人（或打满局数）就开总结算。 */
function afterSettle(s, rows) {
  // 注意：玩家出局后 alivePlayers 只剩人机，只要还坐着两个以上就继续开下一局
  // （观战就是这么来的）；散桌条件与正常局完全一致。
  s.phase = 'settle';
  const alive = alivePlayers(s);
  if (alive.length <= 1 || s.round >= MAX_ROUNDS) {
    s.phase = 'over';
    s.over = true;
    if (alive.length === 1) s.champion = alive[0].id;
    else {
      const best = standings(s).find((p) => !p.out) || standings(s)[0];
      s.champion = best ? best.id : null;
    }
  }
  return s.result;
}

/** 名次（1 起）：出局的按荷包排，还坐着的按荷包排。 */
export function rankOf(s, id) {
  return standings(s).findIndex((p) => p.id === id) + 1;
}
