#!/usr/bin/env node
// 《弥萨格大巴扎》平衡实测：拿 js/bazaar-core.js 直接跑无头对局。
//
// 用法：
//   node scripts/bazaar-sim.mjs [局数] [策略]       默认 400 局、混合
//   策略：buyer（会买东西、会升级）/ naive（乱买）/ idle（只靠初始）
//   SB=<种子基数> 换一批种子；H=<英雄> 只测某一个唤醒体
//
// 关心两个数：每天胜率（必须逐日单调下降，不能中段突然塌）和整轮通关率。

import { newRun, createFight, autoFight, settle, buy, upgrade, canBuy, itemOf, WHEELS, TUNING, ADJ } from '../js/bazaar-core.js';
import { HEROES, ITEMS } from '../js/bazaar-data.js';

const N = Number(process.argv[2] || 400);
const STRAT = process.argv[3] || 'buyer';
const SB = Number(process.env.SB || 20261103);
const ONLY = process.env.H || '';

const power = (it) => {
  const def = itemOf(it.key);
  if (!def) return 0;
  const mul = TUNING.tierMul[it.tier];
  let p = 0;
  for (const o of def.op) {
    if (o.k === 'dmg') p += o.v * (o.hits || 1) * mul / def.cd;
    else if (o.k === 'poison' || o.k === 'burn') p += o.v * mul * 3 / def.cd;
    else if (o.k === 'heal') p += o.v * mul * 0.42 / def.cd;
    else if (o.k === 'shield') p += o.v * mul * 0.34 / def.cd;
    else if (o.k === 'gold') p += o.v * 0.05;
    else if (o.k === 'aura') p += o.v * 1.4;
    else if (o.k === 'slow' || o.k === 'haste') p += 1.4;
    else if (o.k === 'charge') p += 1.1;
  }
  if (def.cd === 0) p *= 1.1;
  return p;
};

// 布阵：光环往中间放，输出围着它
function arrange(run) {
  const items = run.items.filter(Boolean);
  const auras = items.filter((x) => itemOf(x.key).cd === 0);
  const rest = items.filter((x) => itemOf(x.key).cd > 0).sort((a, b) => power(b) - power(a));
  const out = new Array(6).fill(null);
  if (auras.length) out[4] = auras[0];
  let slot = 0;
  const order = [1, 3, 5, 0, 2];
  for (const it of rest) {
    while (order.length && out[order[0]]) order.shift();
    const s = order.shift();
    if (s === undefined) break;
    out[s] = it;
  }
  // 剩下的光环随便塞
  for (const a of auras.slice(1)) {
    const i = out.findIndex((x) => !x);
    if (i >= 0) out[i] = a;
  }
  run.items = out;
}

function shopStep(run, strat) {
  if (strat === 'idle') return;
  // 先买东西：优先输出，其次光环/辅助；排不下的跳过
  const offers = run.shop
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => !o.sold && o.kind === 'item')
    .sort((a, b) => power({ key: b.o.key, tier: 1 }) - power({ key: a.o.key, tier: 1 }));
  for (const { i } of offers) {
    if (!canBuy(run, i)) continue;
    buy(run, i);
    if (strat === 'naive' && Math.random() < 0.35) break;
  }
  arrange(run);
  // 有余钱就升级最强的
  if (strat === 'buyer') {
    let guard = 0;
    while (guard++ < 3) {
      const cand = run.items.filter(Boolean).filter((x) => x.tier < 3)
        .sort((a, b) => power(b) - power(a));
      if (!cand.length) break;
      const c = cand[0];
      const cost = TUNING.upgradeCost + (c.tier - 1) * 5;
      if (run.gold < cost + 4) break;
      if (!upgrade(run, c.uid)) break;
    }
  }
}

const heroes = HEROES.filter((h) => !ONLY || h.n === ONLY);
const pactIds = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08'];
const dayStat = {};   // day -> {n, win}
const foeStat = {};
let runs = 0, cleared = 0, daysSum = 0, scoreSum = 0;
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  const seed = SB + i * 7919;
  const hero = heroes[i % heroes.length];
  const pact = pactIds[(i * 3) % pactIds.length];
  const run = newRun({ seed, heroId: hero.id, pactId: pact });
  let guard = 0;
  while (!run.over && guard++ < 40) {
    shopStep(run, STRAT);
    const f = createFight(run);
    autoFight(f);
    const d = run.day;
    if (!dayStat[d]) dayStat[d] = { n: 0, win: 0, pdps: 0, edps: 0, beats: 0 };
    dayStat[d].n += 1;
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
  daysSum += Math.min(run.day - 1, 12);
  if (run.cleared) cleared += 1;
  scoreSum += Math.min(run.day - 1, 12) * 120 + Math.max(0, run.sane) * 60 + run.gold * 2;
}

const pc = (a, b) => (b ? (a / b * 100).toFixed(1) : '—') + '%';
console.log(`策略 ${STRAT} · ${runs} 局 · 英雄 ${heroes.length} 个 · 种子基数 ${SB}`);
let line = [];
for (let d = 1; d <= 12; d++) {
  const s = dayStat[d];
  line.push(`D${d} ${s ? pc(s.win, s.n) : '—'}`);
}
console.log('每日胜率：' + line.join('  '));
let dl = [];
for (let d = 1; d <= 12; d++) {
  const s = dayStat[d];
  if (!s) continue;
  dl.push(`D${d} 我${(s.pdps / s.n).toFixed(1)} 敌${(s.edps / s.n).toFixed(1)} ${(s.beats / s.n).toFixed(0)}拍`);
}
if (process.env.V) console.log('节奏：' + dl.join(' | '));
console.log(`平均推进 ${(daysSum / runs).toFixed(2)} 天 · 通关 ${pc(cleared, runs)} · 均价 ${Math.round(scoreSum / runs)} 分 · ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const worst = Object.entries(foeStat)
  .filter(([, s]) => s.n >= 20)
  .map(([k, s]) => [k, s.win / s.n, s.n])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 8);
console.log('最难打的几场：' + worst.map(([k, r, n]) => `${k} ${(r * 100).toFixed(0)}%(${n})`).join(' · '));
