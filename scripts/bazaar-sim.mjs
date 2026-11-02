#!/usr/bin/env node
// 《大巴扎：银钥》平衡实测：拿 js/bazaar-core.js 直接跑无头对局。
//
// 用法：
//   node scripts/bazaar-sim.mjs [局数] [策略]       默认 400 局、buyer
//   策略：buyer（会算着买）/ naive（乱买）/ idle（只靠开局）
//   SB=<种子基数>  换一批种子（≥2 个基数结论一致才算数）
//   D=<难度 id>    normal | hard | nightmare | abyss
//   H=<英雄名>     只测某一个唤醒体
//   V=1            额外打印每天的双方 DPS 与平均拍数
//
// 关心两个数：每天胜率（逐日大致下降，不能中段突然塌）和整轮通关率。

import {
  newRun, createFight, autoFight, settle, buy, canBuy, planOf, freeSlots,
  expandCore, coreCostOf, moveHero, addHero,
  TUNING, PACTS, diffOf, heroOf, wheelOf, itemOf, HEROES,
} from '../js/bazaar-core.js';

const N = Number(process.argv[2] || 400);
const STRAT = process.argv[3] || 'buyer';
const SB = Number(process.env.SB || 20261103);
const ONLY = process.env.H || '';
const DIFF = process.env.D || 'normal';
const diff = diffOf(DIFF);

// 一个唤醒体每拍产多少算力（含自己能给邻位的部分估个半价）
const heroRate = (h) => h.gen / h.cd;
const heroAura = (h) => (h.aura ? (h.aura.k === 'gen' ? h.aura.v * 0.5 : h.aura.k === 'cd' ? 0.5 : 0.3) : 0);
const heroScore = (h) => (heroRate(h) + heroAura(h)) * 4 + (h.act[0].k === 'shield' ? 0.6 : 0.2);

const wheelDps = (w) => {
  let d = 0;
  for (const o of w.op) {
    if (o.k === 'dmg') d += o.v * (o.hits || 1);
    else if (o.k === 'poison') d += o.v * 2.2;
    else if (o.k === 'shield') d += o.v * 0.15;
  }
  return d / w.wcd;
};
// 算力吃得狠的命轮价值要打折：产出不够它就是块砖
const wheelScore = (w, plan) => {
  const dmgPerCpu = (() => {
    let d = 0;
    for (const o of w.op) if (o.k === 'dmg') d += o.v * (o.hits || 1);
    return d / w.cpu;
  })();
  const supply = Math.min(1, (plan.gen * 1.0) / Math.max(0.1, plan.need + w.cpu / w.wcd));
  return wheelDps(w) * (0.45 + 0.55 * supply) + dmgPerCpu * 0.6;
};

const relicScore = (it, plan) => {
  const m = it.m;
  const squeeze = plan.cap < plan.gen * 5 ? 1 : 0.4;   // 上限不够时先补上限
  switch (m.k) {
    case 'cap': return 1.4 * m.v * squeeze;
    case 'gen': return 40 * m.v;
    case 'amp': return 30 * m.v;
    case 'crit': return 45 * m.v;
    case 'cdmg': return 18 * m.v;
    case 'wcd': return 5 * m.v;
    case 'start': return 0.5 * m.v;
    case 'shcap': return 0.35 * m.v;
    case 'regen': return 0.5 * m.v;
    case 'thorns': return 0.3 * m.v;
    case 'gold': return 2 * m.v;
    default: return 0;
  }
};

// 站位：左右交换到产出最高为止（光环只认相邻，所以顺序是有意义的）
function arrange(run) {
  if (STRAT === 'naive') return;
  const rate = () => planOf(run).gen;
  let best = rate();
  for (let guard = 0; guard < 24; guard++) {
    let moved = false;
    for (let i = 0; i + 1 < run.squad.length; i++) {
      const a = run.squad[i].uid;
      const b = run.squad[i + 1].uid;
      moveHero(run, a, i + 1);
      const g = rate();
      if (g > best + 1e-6) { best = g; moved = true; }
      else { moveHero(run, b, i); if (rate() < best - 1e-9) moveHero(run, b, i); }
    }
    if (!moved) break;
  }
}

function scoreOffer(o, plan) {
  if (o.kind === 'hero') return heroScore(heroOf(o.key)) / Math.max(1, o.price * 0.35);
  if (o.kind === 'wheel') return wheelScore(wheelOf(o.key), plan) / Math.max(1, o.price * 0.35);
  return relicScore(itemOf(o.key), plan) / Math.max(1, o.price * 0.35);
}

function shopStep(run, strat) {
  if (strat === 'idle') return;
  for (let pass = 0; pass < 3; pass++) {
    const plan = planOf(run);
    const cands = run.shop
      .map((o, i) => ({ o, i }))
      .filter(({ o, i }) => !o.sold && canBuy(run, i))
      .sort((a, b) => scoreOffer(b.o, plan) - scoreOffer(a.o, plan));
    let bought = 0;
    for (const { i } of cands) {
      if (!canBuy(run, i)) continue;
      if (strat === 'naive' && Math.random() < 0.45) continue;
      buy(run, i);
      bought += 1;
      if (strat === 'naive' && Math.random() < 0.4) break;
    }
    if (!bought) break;
  }
  arrange(run);
  // 算力上限压着产出就扩容
  let guard = 0;
  while (guard++ < 4) {
    const plan = planOf(run);
    if (run.gold < coreCostOf(run) + 6) break;
    if (plan.cap > plan.gen * 5.5) break;
    if (!expandCore(run)) break;
  }
}

// 开局抽人：6 格预算里塞下产出最高的几个
function draft(seed, heroPool, pactId) {
  const sorted = heroPool.slice().sort((a, b) => heroScore(b) - heroScore(a));
  const picks = [];
  let used = 0;
  for (const h of sorted) {
    if (used + h.slots > TUNING.draftSlots) continue;
    picks.push(h.id);
    used += h.slots;
    if (picks.length >= 3) break;
  }
  if (!picks.length) picks.push(sorted[0].id);
  return newRun({ seed, heroIds: picks, pactId, diffId: DIFF });
}

const pool = HEROES.filter((h) => !ONLY || h.n === ONLY || h.id === ONLY);
const pactIds = PACTS.map((p) => p.id);
const dayStat = {};
const foeStat = {};
let runs = 0, cleared = 0, daysSum = 0, scoreSum = 0;
let genSum = 0, needSum = 0, daySum2 = 0;
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  const seed = SB + i * 7919;
  const pact = pactIds[(i * 3) % pactIds.length];
  const shift = i % Math.max(1, pool.length);
  const rotated = pool.slice(shift).concat(pool.slice(0, shift));
  const run = draft(seed, rotated, pact);
  let guard = 0;
  while (!run.over && guard++ < 40) {
    shopStep(run, STRAT);
    const plan = planOf(run);
    genSum += plan.gen;
    needSum += plan.need;
    daySum2 += 1;
    const f = createFight(run);
    autoFight(f);
    const d = run.day;
    if (!dayStat[d]) dayStat[d] = { n: 0, win: 0, pdps: 0, edps: 0, beats: 0, gen: 0, need: 0, slots: 0 };
    dayStat[d].n += 1;
    dayStat[d].gen += plan.gen;
    dayStat[d].need += plan.need;
    dayStat[d].slots += plan.slots;
    if (f.win) dayStat[d].win += 1;
    dayStat[d].pdps += (f.e.maxHp - Math.max(0, f.e.hp)) / Math.max(1, f.t);
    dayStat[d].edps += f.taken / Math.max(1, f.t);
    dayStat[d].beats += f.t;
    const fk = `${d}|${f.foe.n}`;
    if (!foeStat[fk]) foeStat[fk] = { n: 0, win: 0 };
    foeStat[fk].n += 1;
    if (f.win) foeStat[fk].win += 1;
    settle(run, f);
  }
  runs += 1;
  const reached = Math.min(run.day - 1, run.totalDays);
  daysSum += reached;
  if (run.cleared) cleared += 1;
  scoreSum += reached * 120 + Math.max(0, run.sane) * 60 + run.gold * 2;
}

const pc = (a, b) => (b ? (a / b * 100).toFixed(1) : '—') + '%';
console.log(`难度 ${diff.n}（${diff.days} 天）· 策略 ${STRAT} · ${runs} 局 · 唤醒体池 ${pool.length} · 种子基数 ${SB}`);
const line = [];
for (let d = 1; d <= diff.days; d++) {
  const s = dayStat[d];
  line.push(`D${d} ${s ? pc(s.win, s.n) : '—'}`);
}
console.log('每日胜率：' + line.join('  '));
if (process.env.V) {
  const dl = [];
  for (let d = 1; d <= diff.days; d++) {
    const s = dayStat[d];
    if (!s) continue;
    dl.push(`D${d} 产${(s.gen / s.n).toFixed(1)} 耗${(s.need / s.n).toFixed(1)} 格${(s.slots / s.n).toFixed(1)} 我${(s.pdps / s.n).toFixed(1)} 敌${(s.edps / s.n).toFixed(1)} ${(s.beats / s.n).toFixed(0)}拍`);
  }
  console.log('节奏：' + dl.join(' | '));
}
console.log(`平均推进 ${(daysSum / runs).toFixed(2)} 天 · 通关 ${pc(cleared, runs)} · 均价 ${Math.round(scoreSum / runs)} 分 · 每拍均产 ${(genSum / daySum2).toFixed(1)} 均耗 ${(needSum / daySum2).toFixed(1)}`);

const worst = Object.entries(foeStat)
  .filter(([, s]) => s.n >= 20)
  .map(([k, s]) => [k, s.win / s.n, s.n])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 8);
console.log('最难打的几场：' + worst.map(([k, r, n]) => `${k} ${(r * 100).toFixed(0)}%(${n})`).join(' · '));
