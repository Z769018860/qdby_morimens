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
  expandCore, coreCostOf, moveHero, addHero, applyEvent, setShopRealm, eventOf,
  TUNING, PACTS, diffOf, heroOf, wheelOf, itemOf, HEROES,
} from '../js/bazaar-core.js';

const N = Number(process.argv[2] || 400);
const STRAT = process.argv[3] || 'buyer';
const SB = Number(process.env.SB || 20261103);
const ONLY = process.env.H || '';
const DIFF = process.env.D || 'normal';
const diff = diffOf(DIFF);
// HP= / DPS= 临时缩放敌人曲线，用来一次性扫平衡（不改 bazaar-data.js）
const HP_MUL = Number(process.env.HP || 1);
const DPS_MUL = Number(process.env.DPS || 1);
if (HP_MUL !== 1) TUNING.dayHp = TUNING.dayHp.map((v) => v * HP_MUL);
if (DPS_MUL !== 1) TUNING.dayDps = TUNING.dayDps.map((v) => v * DPS_MUL);
// DUP=0 / 0.3：临时改「升启报价」的出现概率，用来单独看它对构筑速度的影响
if (process.env.DUP != null) TUNING.dupRate = Number(process.env.DUP);

// 一个唤醒体每拍产多少算力（含自己能给邻位的部分估个半价）
const heroRate = (h) => h.gen / h.cd;
// 光环也是钱：按各自的量纲折成「等效产出」。这 10 种在玩家眼里价值不同，
// 机器人要是只会认 gen / cd / pow，新加的防御型光环就会被白白错过。
const AURA_W = {
  gen: 0.5, cost: 0.06, cd: 0.5, pow: 1.6, dmg: 1.2, crit: 3,
  dot: 0.9, shd: 0.8, heal: 0.8, pierce: 0.9, leech: 1.5,
};
const heroAura = (h) => (h.aura ? h.aura.v * (AURA_W[h.aura.k] || 0.3) : 0);
// 出手的副效果也算钱：盾 / 奶是保命，毒 / 灼烧 / 力量 / 易伤 / 减速是输出曲线
const actValue = (a) => {
  switch (a.k) {
    case 'dmg': return a.v * (a.hits || 1) / 3;
    case 'poison': return a.v * 0.8;
    case 'burn': return a.v * 0.7;
    case 'shield': return a.v * 0.07;
    case 'heal': return a.v * 0.05;
    case 'str': return a.v * 1.2;
    case 'vuln': return a.v * 6;
    case 'slow': return a.v * 2;
    default: return 0;
  }
};
const heroScore = (h) => (heroRate(h) + heroAura(h)) * 4 + h.act.reduce((n, a) => n + actValue(a), 0) / Math.max(1, h.cd);

// 命轮机制族很多（直伤 / 毒 / 灼烧 / 叠力量 / 处决 / 回响…），估值要按各自的曲线折算，
// 否则买手机器人只会买「数字最大的那条」，测出来的平衡是假的。
const wheelDps = (w) => {
  let d = 0;
  for (const o of w.op) {
    if (o.k === 'dmg') d += o.v * (o.hits || 1) * (o.execute ? 1.3 : 1) * (o.pierce ? 1.1 : 1);
    else if (o.k === 'poison') d += o.v * 2.6;
    else if (o.k === 'burn') d += o.v * 2.2;
    else if (o.k === 'str') d += o.v * 3.2;          // 叠力量在长局里越滚越大
    else if (o.k === 'shield') d += o.v * 0.18;
    else if (o.k === 'heal') d += o.v * 0.35;
    else if (o.k === 'vuln') d += o.v * 20;
    else if (o.k === 'slow') d += 4;
    else if (o.k === 'echo') d += 7;
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
    // 新机制：都按「一件 SSR 大概值多少」折算，别让机器人凭 0 分把它们全跳过
    case 'flat': return 4 * m.v;
    case 'ward': return 1.6 * m.v;
    case 'leech': return 30 * m.v;
    case 'pierce': return 35 * m.v;
    case 'venom': return 30 * m.v;
    case 'fear': return 40 * m.v;
    case 'hp': return 0.5 * m.v;
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

function scoreOffer(o, plan, run) {
  let s;
  if (o.kind === 'hero') s = heroScore(heroOf(o.key));
  else if (o.kind === 'wheel') s = wheelScore(wheelOf(o.key), plan);
  else s = relicScore(itemOf(o.key), plan);
  s /= Math.max(1, o.price * 0.35);
  // 升启报价（同名卡）：不占格，但只把已有的一张往上顶一档，按「大半个新单位」估值。
  // 队伍还没搭起来时先别把钱花在叠卡上——缺人比缺启灵致命得多。
  if (o.dup) s *= process.env.RANKCHASE === '1' ? 2.2 : (run && run.squad.length >= 4 ? 0.75 : 0.12);
  // 开局 squad 还没凑起来时，优先把唤醒体买齐（光环 / 产出都靠人，没人就什么都转不动）
  if (o.kind === 'hero' && run && run.squad.length < 3) s *= 3;
  return s;
}

// REALM=1：模拟「玩家会跟着队伍选界域商店」——场上最多的那个界域（≥2 人）就开它的店
const PICK_REALM = process.env.REALM === '1';
function chooseRealm(run) {
  const cnt = {};
  for (const h of run.squad) { const r = (heroOf(h.key) || {}).realm; if (r) cnt[r] = (cnt[r] || 0) + 1; }
  const best = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  const realm = best && best[1] >= 2 ? best[0] : null;
  if ((run.shopRealm || null) !== realm) setShopRealm(run, realm);
}

// 事件的选项值：理智最贵（一次掉理智可能直接结束一局），金币按 1:1，造物 / 人 / 升启按 12 金估
function eventValue(o) {
  let v = 0;
  switch (o.k) {
    case 'gold': v += o.v; break;
    case 'gamble': v += (o.win * o.odds - o.v * (1 - o.odds)) * 0.7; break;
    case 'maxhp': v += 1.4 * o.v; break;
    case 'relic': case 'hero': case 'rank': v += 12; break;
    case 'reroll': v += 3 * o.v; break;
    case 'realm': v += 1; break;
    default: break;
  }
  if (o.cost) v -= o.cost;
  if (o.gold) v += o.gold;
  if (o.maxhp) v += 1.4 * o.maxhp;
  if (o.sane) v += 14 * o.sane;
  return v;
}

function shopStep(run, strat) {
  if (strat === 'idle') return;
  if (PICK_REALM) chooseRealm(run);
  for (let pass = 0; pass < 3; pass++) {
    const plan = planOf(run);
    const cands = run.shop
      .map((o, i) => ({ o, i }))
      .filter(({ o, i }) => !o.sold && canBuy(run, i))
      .sort((a, b) => scoreOffer(b.o, plan, run) - scoreOffer(a.o, plan, run));
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

// 开局不再预选唤醒体：给固定金币，靠 shopStep 在集市里自己挑人 / 买轮 / 买造物
function draft(seed, heroPool, pactId) {
  return newRun({ seed, pactId, diffId: DIFF });
}

const pool = HEROES.filter((h) => !ONLY || h.n === ONLY || h.id === ONLY);
const pactIds = PACTS.map((p) => p.id);
const dayStat = {};
const foeStat = {};
let runs = 0, cleared = 0, daysSum = 0, scoreSum = 0;
let evStat = 0, rankMaxSum = 0, rankSum = 0;
const rankHist = [0, 0, 0, 0, 0, 0];
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
    // 战后事件：机器人按「期望值」挑一项（掉理智 / 掉血上限 / 赌钱都算代价）。
    // EV=0 关掉，用来做有 / 无事件的对照。
    if (run.pendingEvent && process.env.EV !== '0') {
      const ev = eventOf(run.pendingEvent);
      let best = 0, bestV = -1e9;
      (ev ? ev.opts : []).forEach((o, i) => {
        const v = eventValue(o);
        if (v > bestV) { bestV = v; best = i; }
      });
      const msg = applyEvent(run, run.pendingEvent, best);
      if (msg && msg !== '金币不够') evStat += 1;
      else if (run.pendingEvent) applyEvent(run, run.pendingEvent, 1 - best);
    }
  }
  runs += 1;
  {
    const all = [...run.squad, ...run.wheels, ...(run.bench || [])].map((r) => r.rank || 0);
    const mx = all.length ? Math.max(...all) : 0;
    rankMaxSum += mx;
    rankHist[Math.min(5, mx)] += 1;
    rankSum += all.reduce((a, b) => a + b, 0);
  }
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
console.log(`平均推进 ${(daysSum / runs).toFixed(2)} 天 · 通关 ${pc(cleared, runs)} · 均价 ${Math.round(scoreSum / runs)} 分 · 每拍均产 ${(genSum / daySum2).toFixed(1)} 均耗 ${(needSum / daySum2).toFixed(1)}`
  + ` · 事件 ${(evStat / Math.max(1, daySum2) * 100).toFixed(0)}%`
  + ` · 队内最高启灵 ${(rankMaxSum / runs).toFixed(2)}（总启灵 ${(rankSum / runs).toFixed(1)}）`);
if (process.env.V) console.log('最高启灵分布 0/1/2/3/超限/终：' + rankHist.map((n) => (n / runs * 100).toFixed(0) + '%').join(' / '));

const worst = Object.entries(foeStat)
  .filter(([, s]) => s.n >= 20)
  .map(([k, s]) => [k, s.win / s.n, s.n])
  .sort((a, b) => a[1] - b[1])
  .slice(0, 8);
console.log('最难打的几场：' + worst.map(([k, r, n]) => `${k} ${(r * 100).toFixed(0)}%(${n})`).join(' · '));
