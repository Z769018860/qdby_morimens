// 归因审计：毒 / 流血 / 反击 / 反震 的伤害在结算面板里记给了谁
import fs from 'node:fs';
import * as G from '../src/core/game.js';
import { analyzeBattle } from '../src/core/report.js';

const pack = JSON.parse(fs.readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
let sp = {};
try { sp = JSON.parse(fs.readFileSync(new URL('../public/data/special.json', import.meta.url))); } catch {}
const data = G.indexData({ ...pack, special: sp });
const s = G.newState(data, 1);
const cheap = data.awakeners.slice(0, 16);
for (const a of cheap) s.roster[a.slug] = { lv: 120, star: 20, brk: 3 };
s.team = cheap.slice(0, 4).map((a) => a.slug);

const tally = { dot: 0, counter: 0, dmg: 0, selfAmt: 0, selfDot: 0, dotAmt: 0, counterAmt: 0, thorns: 0 };
let bad = 0, checked = 0;
const samples = [];
const dotExamples = [];

for (const stage of [20, 35, 50, 65, 80, 95, 110, 125, 140, 155]) {
  for (let k = 0; k < 6; k++) {
    s.stage = stage;
    const r = G.runBattle(s, data, stage);
    const rep = analyzeBattle(r, r.prep.allies, r.prep.enemies);
    checked++;
    const side = (uid) => (uid || '').slice(0, 1);
    let crossA = 0, crossE = 0, sameA = 0, sameE = 0;
    for (const e of r.events) {
      if (!['dmg', 'dot', 'counter'].includes(e.k) || e.amt == null) continue;
      tally[e.k]++;
      if (e.k === 'dot') tally.dotAmt += e.amt;
      if (e.k === 'counter') tally.counterAmt += e.amt;
      if (e.thorns) tally.thorns += e.amt;
      const sb = side(e.by), sw = side(e.who);
      if (sb === sw) {
        if (sb === 'a') sameA += e.amt; else sameE += e.amt;
        if (e.by === e.who) { tally.selfAmt += e.amt; if (e.k === 'dot') tally.selfDot += e.amt; }
      } else if (sb === 'a') crossA += e.amt;
      else crossE += e.amt;
      // 采集毒/反击样本：谁打谁
      if (dotExamples.length < 14 && (e.k === 'dot' || e.k === 'counter') && sb !== sw) {
        const nm = (uid) => (uid || '').slice(0, 1) === 'a' ? (rep.A.find((u) => u.uid === uid) || {}).name : (rep.E.find((u) => u.uid === uid) || {}).name;
        dotExamples.push({ stage, k: e.k, by: e.by, who: e.who, byName: nm(e.by), whoName: nm(e.who), amt: e.amt, s: e.s, thorns: !!e.thorns });
      }
    }
    const sum = (arr, k) => arr.reduce((x, u) => x + u[k], 0);
    const aDmg = sum(rep.A, 'dmg'), eDmg = sum(rep.E, 'dmg'), aTaken = sum(rep.A, 'taken'), eTaken = sum(rep.E, 'taken');
    // 面板 A.dmg 应 = 跨阵营 A→E + A 内部（毒/反击/自伤，但不含同阵营 dmg）
    const expA = crossA + sameA, expE = crossE + sameE;
    const diff = { a: aDmg - expA, e: eDmg - expE, at: aTaken - (crossE + sameA), et: eTaken - (crossA + sameE) };
    if (Object.values(diff).some((v) => Math.abs(v) > 1)) {
      bad++;
      if (samples.length < 6) samples.push({ stage, aDmg, eDmg, aTaken, eTaken, crossA, crossE, sameA, sameE, diff });
    }
  }
}
console.log(`对局 ${checked} 场，归因不一致 ${bad} 场`);
console.log('事件计数', tally);
console.log('跨阵营 dot/counter 样本：');
for (const d of dotExamples) console.log(' ', JSON.stringify(d));
console.log('不一致样本：', samples.length ? JSON.stringify(samples, null, 1) : '无');
