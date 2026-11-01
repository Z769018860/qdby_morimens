// 电子斗蛐蛐 · 无头体检
// 用法：node scripts/bugfight-sim.mjs [局数，默认 400]
//
// 查四件事：
//   1) 配对：两队的战力比是否落在「看得出来、又不敢确定」的区间
//   2) 标定：战力比 → 真实胜率 的曲线，和 ai.js 里 K=4.7 的估计对不对得上
//      （K 是 2000 局 logistic 拟合出来的，改 ai.js 的 K 记得重跑这个看桶差）
//   3) 一桌：十个人打满，钱是不是守恒（彩池不能凭空造钱）
//   4) 淘汰：人机在多少局之后开始出局，会不会一上来就全光
import fs from 'node:fs';
import * as E from '../js/bugfight/engine.js';
import * as T from '../js/bugfight/table.js';
import * as A from '../js/bugfight/ai.js';

const N = Number(process.argv[2] || 400);
const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const data = JSON.parse(fs.readFileSync(ROOT + '/data/bugfight-mobs.json', 'utf8'));
const seatsRaw = JSON.parse(fs.readFileSync(ROOT + '/data/bugfight-seats.json', 'utf8'));

const problems = new Map();
const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);

/* ---------------------------------------------------------------- 1+2 配对与标定 */
const buckets = new Map();   // |ln(pL/pR)| 分桶 → {n, w0}
let turns = [], draws = 0, maxTurns = 0, summoned = 0, hits = 0, slow = 0;
const ratioList = [];
for (let g = 0; g < N; g++) {
  const s = T.newTable(data, [], 20000 + g * 7717);
  const fx = T.makeFixture(s.rnd, data);
  const b = E.newBattle(fx.L, fx.R, 900 + g, data);
  E.run(b);
  const lr = Math.log(fx.pL / fx.pR);
  ratioList.push(Math.abs(lr));
  const key = (lr >= 0 ? '左强' : '右强') + Math.min(0.8, Math.round(Math.abs(lr) * 10) / 10).toFixed(1);
  const cur = buckets.get(key) || { n: 0, w0: 0, est: 0 };
  cur.n += 1;
  if (b.winner === 0) cur.w0 += 1;
  cur.est += 1 / (1 + Math.pow(fx.pR / fx.pL, A.K));
  buckets.set(key, cur);
  turns.push(b.turn);
  maxTurns = Math.max(maxTurns, b.turn);
  if (b.winner === 'draw') draws += 1;
  // 打满 20 回合按血量判胜：两边都是高血高防低攻的阵容时本来就会这样，
  // 属于「打得难看但没坏」，只统计不报警（否则每次都挂着一行红字，真问题就被淹了）
  if (b.reason.includes('打满')) slow += 1;
  if (b.turn <= 2) note('2 回合内就结束（太快，看不出过程）');
  summoned += b.log.filter((l) => l.k === 'summon').length;
  hits += b.log.filter((l) => l.k === 'hit').length;
}

console.log(`\n== 配对 / 标定（${N} 局） ==`);
console.log('战力比 |ln| 中位', ratioList.sort((a, b) => a - b)[Math.floor(N / 2)].toFixed(2),
  '｜>0.4 的比例', (ratioList.filter((x) => x > 0.4).length / N * 100).toFixed(1) + '%');
console.log('桶           局数   实测左胜   估计左胜   差');
for (const k of [...buckets.keys()].sort()) {
  const v = buckets.get(k);
  if (v.n < 8) continue;
  const real = v.w0 / v.n, est = v.est / v.n;
  console.log(`  ${k.padEnd(6)}  ${String(v.n).padStart(4)}   ${(real * 100).toFixed(1).padStart(6)}%   ${(est * 100).toFixed(1).padStart(6)}%   ${((real - est) * 100).toFixed(1)}`);
}
turns.sort((a, b) => a - b);
console.log('回合 p10/50/90/max', turns[Math.floor(N * 0.1)], turns[Math.floor(N / 2)], turns[Math.floor(N * 0.9)], maxTurns);
console.log('平均每局命中', Math.round(hits / N), '次｜召唤', summoned, '次｜平局', draws,
  `｜打满 ${E.MAX_TURN} 回合按血量判胜`, slow, `局（${(slow / N * 100).toFixed(1)}%）`);

/* ---------------------------------------------------------------- 3+4 整桌 */
console.log('\n== 十个人打一桌（400 桌） ==');
const agg = { rounds: [], aliveEnd: [], champ: {}, broke: 0, youOut: 0, zeroRound: 0, youRank: [] };
for (let g = 0; g < 400; g++) {
  const s = T.newTable(data, seatsRaw.seats, 50000 + g * 331);
  const total0 = [s.you, ...s.ai].reduce((n, p) => n + p.bank, 0);
  let guard = 0;
  while (!s.over && guard++ < 40) {
    T.nextRound(s);
    A.idle || 0;
    // 你（模拟脚本里）按 sharp 策略下
    const youBet = A.decideBet({ bank: s.you.bank, style: 'sharp' }, s.fixture,
      { 0: 0, 1: 0 }, s, data, T.minStake(s.round), s.rnd);
    if (youBet) T.placeBet(s, youBet.side, youBet.amt);
    T.aiBet(s, (p, f, pool, tb, MIN) => A.decideBet(p, f, pool, tb, data, MIN, s.rnd));
    T.startBattle(s);
    let k = 0;
    while (!s.battle.over && k++ < 400) E.step(s.battle);
    const r = T.settle(s);
    // 桌上的 carry（没人押中滚下来的注）也要算进总量，否则会误报「钱凭空消失」
    const total1 = [s.you, ...s.ai].reduce((n, p) => n + p.bank, 0) + (s.carry || 0);
    if (total1 !== total0) note(`彩池不守恒：${total0} → ${total1}（第 ${s.round} 局）`);
    if (r && r.rows.length === 0) agg.zeroRound += 1;
    if (s.you.out) break;
  }
  agg.rounds.push(s.round);
  agg.aliveEnd.push(T.alivePlayers(s).length);
  if (s.you.out) { agg.youOut += 1; agg.youRank.push(T.rankOf(s, 'you')); }
  const champ = s.champion ? ([s.you, ...s.ai].find((p) => p.id === s.champion) || {}) : {};
  agg.champ[champ.n || '（你出局，桌上继续）'] = (agg.champ[champ.n || '（你出局，桌上继续）'] || 0) + 1;
  agg.broke += [s.you, ...s.ai].filter((p) => p.out).length;
}
agg.rounds.sort((a, b) => a - b);
console.log('打到第几局结束 p10/50/90', agg.rounds[40], agg.rounds[200], agg.rounds[360],
  `｜打满 ${T.MAX_ROUNDS} 局的桌数`, agg.rounds.filter((x) => x >= T.MAX_ROUNDS).length);
console.log('结束时还坐着的人数 平均', (agg.aliveEnd.reduce((a, b) => a + b, 0) / 400).toFixed(2),
  '｜全员淘汰的桌数', agg.aliveEnd.filter((x) => x === 0).length);
console.log('单局无人下注的次数', agg.zeroRound, '｜你出局的桌数', agg.youOut, '/400');
if (agg.youRank.length) {
  agg.youRank.sort((a, b) => a - b);
  console.log('你出局时的名次 中位', agg.youRank[Math.floor(agg.youRank.length / 2)], '（共 10 人）');
}
const top = Object.entries(agg.champ).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log('冠军分布（前 12）', top.map(([k, v]) => `${k}:${v}`).join('  '));
console.log('\n问题：', problems.size ? '' : '无');
for (const [k, v] of problems) console.log('  ×' + v, k);
