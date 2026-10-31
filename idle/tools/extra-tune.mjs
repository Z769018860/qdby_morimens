// 专属技能的数值平衡器：反复「量 → 调系数」，把 71 位的边际增益拉到同一条线。
//
// 量什么：tools/extra-bench.mjs 的边际增益（带上这对专属技能，比不带多赢多少）。
// 调什么：core/extra.js 的 TUNE 表（只缩放伤害 / 治疗 / 护盾的力度，不动结构、层数、回合数）。
//
// 用法：node tools/extra-tune.mjs [轮数]
//   TARGET=6.5        目标边际增益（百分点）
//   BENCH_STAGES=...  参与打分的关卡组
// 每一轮都用两套互不相干的种子各量一次再取平均，避免把随机噪声当成强度写进去。
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const ROUNDS = +(process.argv[2] || 3);
const TARGET = +(process.env.TARGET || 6.5);
const STAGES = process.env.BENCH_STAGES || '44,50,56,62,68,74';
const SEEDS = process.env.BENCH_SEEDS || '7';
const FILE = new URL('../src/core/extra.js', import.meta.url);

const readTune = (src) => {
  const m = src.match(/const TUNE = \{([\s\S]*?)\n\};/);
  if (!m) throw new Error('找不到 TUNE 表');
  const body = m[1].replace(/\/\/[^\n]*/g, '').trim();
  if (!body) return {};
  return JSON.parse('{' + body.replace(/,\s*$/, '') + '}');
};
const writeTune = (src, tune) => {
  const lines = Object.keys(tune).sort().map((k) => `  ${JSON.stringify(k)}: ${tune[k].toFixed(3)},`).join('\n');
  return src.replace(/const TUNE = \{([\s\S]*?)\n\};/, `const TUNE = {\n${lines}\n};`);
};

function measure(seedBase) {
  const out = execFileSync(process.execPath, ['tools/extra-bench.mjs'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, BENCH_STAGES: STAGES, BENCH_SEEDS: SEEDS, BENCH_SEEDBASE: String(seedBase) },
    encoding: 'utf8',
    maxBuffer: 32 << 20,
  });
  const rows = {};
  for (const line of out.split('\n')) {
    const b = line.match(/^\s*(-?\d+\.\d+)\s+od\s+(-?\d+\.\d+)\s+law\s+(-?\d+\.\d+)\s+base\s+(\d+\.\d+)\s+(\S+)\s+(\S+)\s+(\S+)$/);
    if (b) rows[b[7]] = { both: +b[1], od: +b[2], law: +b[3] };
  }
  return rows;
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const sd = (xs) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };

let tune = readTune(readFileSync(FILE, 'utf8'));
for (let round = 1; round <= ROUNDS; round++) {
  const A = measure(1000), B = measure(777001);
  const slugs = Object.keys(A).filter((k) => B[k]);
  const gains = slugs.map((k) => (A[k].both + B[k].both) / 2);
  const target = process.env.TARGET ? TARGET : mean(gains);
  console.log(`第 ${round} 轮：均值 ${mean(gains).toFixed(1)}  sd ${sd(gains).toFixed(1)}  目标 ${target.toFixed(1)}`);
  for (let i = 0; i < slugs.length; i++) {
    const g = Math.max(0.8, gains[i]);
    const adj = clamp((target / g) ** 0.5, 0.82, 1.22);
    tune[slugs[i]] = clamp((tune[slugs[i]] ?? 1) * adj, 0.5, 2.2);
  }
  const src = readFileSync(FILE, 'utf8');
  writeFileSync(FILE, writeTune(src, tune));
}
const A = measure(1000), B = measure(31337);
const gains = Object.keys(A).filter((k) => B[k]).map((k) => (A[k].both + B[k].both) / 2);
console.log(`校准后（含一套没参与调整的种子）：均值 ${mean(gains).toFixed(1)}  sd ${sd(gains).toFixed(1)}  最低 ${Math.min(...gains).toFixed(1)}  最高 ${Math.max(...gains).toFixed(1)}`);
