// 周 Boss 的「伤害体检」：毒 / 反击 / 直伤三路，各层实际打多少，以及有没有吃到不该吃的封顶。
//
// 两件容易搞混的事，这里分开验：
//   1) 毒反队的**输出**：周 Boss 的关卡模板是「第 48 + stageAdd 关」，第 7 / 8 层是 96 / 104，
//      越过主线曲线拐点（90）之后该跟主线一样乘 lateDotBoost。漏传的话毒反队越深越弱。
//      本脚本把「不乘补偿」与「乘补偿」并排跑，差额就是漏掉的那一份。
//   2) Boss 打在**我方身上的毒 / 反击**：0.17.2 起按「挨打方（我方）生命上限」的 15% / 20% 单次封顶，
//      这是主线高层防秒人的保护，周 Boss 里同样生效。想确认真被削了多少，看「受毒/受反」两列
//      在 hitCaps:false 下的差值——差得越多说明封顶咬得越狠。
//
// 用法：node tools/weekly-dot-audit.mjs
import fs from 'node:fs';
import * as G from '../src/core/game.js';
import * as W from '../src/core/weekly.js';
import { simulate } from '../src/core/battle.js';
import { lateDotBoost } from '../src/core/enemies.js';

const pack = JSON.parse(fs.readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
pack.orders = JSON.parse(fs.readFileSync(new URL('../public/data/orders.json', import.meta.url))).items || [];
let sp = {};
try { sp = JSON.parse(fs.readFileSync(new URL('../public/data/special.json', import.meta.url))); } catch {}
const data = G.indexData({ ...pack, special: sp });

const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
const w = (x) => (x >= 10000 ? (Math.round(x / 1000) / 10) + 'w' : Math.round(x).toString());

const s = G.newState(data, 1);
s.roster = {};
for (const a of data.awakeners) s.roster[a.slug] = { lv: 159, star: 99, brk: 6, od: 99, law: 30 };
s.gold = 50000000; s.tickets = 2000;
for (let i = 0; i < 60; i++) G.equipPull(s, data, 10);
G.autoLoadout(s, data);
// 毒 + 反击队：周 Boss 里最能看出「毒反吃没吃补偿」的阵容
const POISON = ['agrippa', 'castor', 'faros', 'karen', 'lily', 'liz', 'miryam', 'nymphaea', 'pollux', 'ratking', 'saya', 'thais', 'tulu', 'xu', 'vivian', 'doll-inferno'];
s.team = POISON.filter((x) => s.roster[x]).slice(0, 4);
G.fillLoadout(s, data, s.team, { equip: s.gear.equip });
s.strategy = { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' };
const team = G.teamDefs(s, data, s.team);
const HP = team.list.reduce((x, d) => x + d.hp, 0);
console.log(`队伍：${team.list.map((d) => `${d.name}(${d.type})`).join(' / ')}   总血 ${HP}`);
console.log('');

const SEED = 20261107;
function run(tier, { boost, caps }) {
  const boss = W.weeklyEnemy(data, undefined, tier);
  s.seed = SEED;   // battleSeed 会推进 state.seed，两次对照必须从同一个种子出发
  const res = simulate({
    allies: team.list, enemies: [boss], seed: G.battleSeed(s), strategy: s.strategy, maxRounds: W.WEEKLY_ROUNDS,
    dotBoost: boost ? lateDotBoost(boss.stage) : 1,
    ...(caps === false ? { hitCaps: false } : {}),
  });
  const o = { dmg: 0, dot: 0, counter: 0, takeDot: 0, takeCounter: 0 };
  for (const e of res.events) {
    if (e.amt == null) continue;
    const toFoe = (e.who || '').startsWith('e'), toAlly = (e.who || '').startsWith('a');
    if (toFoe && e.k === 'dmg') o.dmg += e.amt;
    if (toFoe && e.k === 'dot') o.dot += e.amt;
    if (toFoe && e.k === 'counter') o.counter += e.amt;
    // 护盾吸收的量也算「Boss 打出来多少」——按 amt 统计会被盾吃掉，看不出封顶的痕迹
    const gross = e.amt + (e.absorbed || 0);
    if (toAlly && e.k === 'dot') o.takeDot += gross;
    if (toAlly && e.k === 'counter') o.takeCounter += gross;
  }
  o.total = o.dmg + o.dot + o.counter;
  return o;
}

console.log(pad('层', 4) + pad('模板关', 8) + pad('补偿', 7)
  + padl('毒(无)', 8) + padl('毒', 8) + padl('反击(无)', 9) + padl('反击', 8) + padl('直伤', 9) + padl('总(无)', 9) + padl('总', 9) + padl('提升', 7)
  + padl('受毒', 8) + padl('受反', 8));
for (let t = 1; t <= W.WEEKLY_TIERS; t++) {
  const stage = W.weeklyEnemy(data, undefined, t).stage;
  const a = run(t, { boost: false, caps: true }), b = run(t, { boost: true, caps: true });
  const c = run(t, { boost: true, caps: false });
  console.log(pad(t, 4) + pad(stage, 8) + pad('×' + lateDotBoost(stage).toFixed(2), 7)
    + padl(w(a.dot), 8) + padl(w(b.dot), 8) + padl(w(a.counter), 9) + padl(w(b.counter), 8)
    + padl(w(b.dmg), 9) + padl(w(a.total), 9) + padl(w(b.total), 9)
    + padl((b.total > 0 ? ((b.total / a.total - 1) * 100).toFixed(0) + '%' : '-'), 7)
    + padl(w(b.takeDot) + (c.takeDot !== b.takeDot ? '!' : ''), 8)
    + padl(w(b.takeCounter) + (c.takeCounter !== b.takeCounter ? '!' : ''), 8));
}
console.log('');
console.log('「受毒 / 受反」带 ! 表示不封顶时数字会变 —— 即 Boss 打我方这一路吃到了 15% / 20% 生命上限封顶。');
