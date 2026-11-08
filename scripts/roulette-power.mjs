// 量一遍「谁比较会打」：全名单两两采样，算出每个人的实测胜率，折算成分位（0~1）落到
// data/roulette-power.json。高段位的人机会照这张表挑人——不是给它加血，是让它挑对手。
//
// 用法：node scripts/roulette-power.mjs [局数，默认 30000]
// 数据改过（理智 / 随身道具 / 新增角色）就重跑一次，否则段位越高越难这条会走样。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as E from '../js/roulette/engine.js';
import { aiStep } from '../js/roulette/ai.js';
import { CHARS, CHAR_ORDER } from '../js/roulette/gen.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const GAMES = Number(process.argv[2] || 30000);
const N = CHAR_ORDER.length;
const t = {};
for (const id of CHAR_ORDER) t[id] = { w: 0, n: 0 };

let rnd = 20261101;
const nx = () => { rnd = (rnd + 0x6d2b79f5) | 0; let x = Math.imul(rnd ^ (rnd >>> 15), 1 | rnd); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

let played = 0;
for (let k = 0; k < GAMES; k++) {
  const i = Math.floor(nx() * N);
  let j = Math.floor(nx() * N);
  if (j === i) j = (j + 1) % N;
  const G = E.create((20261101 + k * 2654435761) >>> 0, [CHAR_ORDER[i], CHAR_ORDER[j]], { best: k % 5 === 0 ? 5 : 3 });
  let steps = 0;
  while (G.phase === 'play' && steps++ < 3000) {
    const a = aiStep(G, G.turn, 'hard') || { t: 'shoot', target: 'foe' };
    const r = a.t === 'shoot' ? E.shoot(G, G.turn, a.target) : E.useItem(G, G.turn, a.uid);
    if (!r.ok) { const r2 = E.shoot(G, G.turn, 'foe'); if (!r2.ok) break; }
  }
  if (G.phase !== 'over') continue;
  played++;
  t[G.chars[G.winner]].w++; t[G.chars[1 - G.winner]].n++; t[G.chars[G.winner]].n++;
}

const rows = CHAR_ORDER.map((id) => ({ id, n: t[id].n, rate: t[id].n ? t[id].w / t[id].n : 0.5 }))
  .sort((a, b) => a.rate - b.rate);
const chars = {};
rows.forEach((x, i) => { chars[x.id] = Math.round((i / Math.max(1, rows.length - 1)) * 100) / 100; });
const doc = {
  note: '弥萨格轮盘：同水平 AI 互打的实测胜率与分位。高段位人机按分位挑人（见 js/roulette/rank.js 的 foePool）。由 scripts/roulette-power.mjs 生成，别手改。',
  games: played,
  pct: chars,
  rate: Object.fromEntries(rows.map((x) => [x.id, Math.round(x.rate * 1000) / 10])),
};
fs.writeFileSync(path.join(ROOT, 'data/roulette-power.json'), JSON.stringify(doc, null, 1) + '\n');
console.log(`${played} 场：最低 ${(rows[0].rate * 100).toFixed(1)}% · 最高 ${(rows[rows.length - 1].rate * 100).toFixed(1)}% · 中位 ${(rows[Math.floor(rows.length / 2)].rate * 100).toFixed(1)}%`);
console.log('已写 data/roulette-power.json');
