// 「蚀界方块」平衡模拟：一局一局地跑，看分数分布、能活多少步。
// 用法：node scripts/block-sim.mjs [局数] [种子]
// 两种打法各跑一遍：贪心（会挑消除和紧凑位置）与随机（等价于瞎点）。
import {
  N, MAX_STEPS, ENERGY_MAX, emptyBoard, deal, canPlace, applyPlace,
  fullLines, clearLines, anyPlacement, bestWindow, clearWindow,
  countFilled, scorePlace, scoreClear, rankOf, creditOf,
} from '../js/block-core.js';

const RUNS = Number(process.argv[2] || 300);
const SEED0 = Number(process.argv[3] || 20261103);

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 空洞：一个空格，四邻都被占（或出界）就算埋死
function holes(b) {
  let h = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (b[r][c]) continue;
      const up = r === 0 || b[r - 1][c];
      const dn = r === N - 1 || b[r + 1][c];
      const lf = c === 0 || b[r][c - 1];
      const rt = c === N - 1 || b[r][c + 1];
      if (up && dn && lf && rt) h++;
    }
  }
  return h;
}

function adjacency(b) {
  let n = 0;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!b[r][c]) continue;
      if (r + 1 < N && b[r + 1][c]) n++;
      if (c + 1 < N && b[r][c + 1]) n++;
    }
  }
  return n;
}

function evalPlace(b, card, r0, c0) {
  const cp = b.map((row) => row.slice());
  applyPlace(cp, card, r0, c0);
  const lines = fullLines(cp);
  const nLines = lines.rows.length + lines.cols.length;
  let clearN = 0;
  if (nLines) clearN = clearLines(cp, lines).n;
  let s = 0;
  s += nLines * 130 + clearN * 4;
  s -= holes(cp) * 11;
  s += adjacency(cp) * 1.6;
  // 贴着边和角放更安全
  if (r0 === 0 || c0 === 0) s += 3;
  s -= countFilled(cp) * 0.3;
  return s;
}

function bestMove(b, cards) {
  let best = null;
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    for (let r0 = 0; r0 <= N - card.sh.rows; r0++) {
      for (let c0 = 0; c0 <= N - card.sh.cols; c0++) {
        if (!canPlace(b, card.sh, r0, c0)) continue;
        const s = evalPlace(b, card, r0, c0);
        if (!best || s > best.s) best = { i, r0, c0, s };
      }
    }
  }
  return best;
}

function randomMove(b, cards, rng) {
  const opts = [];
  for (let i = 0; i < cards.length; i++) {
    for (let r0 = 0; r0 <= N - cards[i].sh.rows; r0++) {
      for (let c0 = 0; c0 <= N - cards[i].sh.cols; c0++) {
        if (canPlace(b, cards[i].sh, r0, c0)) opts.push({ i, r0, c0 });
      }
    }
  }
  return opts.length ? opts[(rng() * opts.length) | 0] : null;
}

function play(seed, smart) {
  const rng = mulberry(seed);
  const b = emptyBoard();
  let score = 0, steps = 0, combo = 0, energy = 0, lines = 0, bestCombo = 0;
  let cards = deal(rng);
  let useWindow = false;

  while (steps < MAX_STEPS) {
    // 三张都放不下：有溢出就用，没有就结束
    while (cards.length && !cards.some((c) => anyPlacement(b, c.sh))) {
      if (energy >= ENERGY_MAX) {
        const w = bestWindow(b);
        score += clearWindow(b, w) * 6;
        energy = 0;
        continue;
      }
      return { score, steps, lines, bestCombo, dead: true, cards };
    }
    if (!cards.length) { cards = deal(rng); continue; }

    const mv = smart ? bestMove(b, cards) : randomMove(b, cards, rng);
    if (!mv) return { score, steps, lines, bestCombo, dead: true, cards };

    const card = cards[mv.i];
    applyPlace(b, card, mv.r0, mv.c0);
    score += scorePlace(card);
    steps++;

    const fl = fullLines(b);
    const nLines = fl.rows.length + fl.cols.length;
    if (nLines) {
      const cl = clearLines(b, fl);
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      score += scoreClear(cl.n, nLines, combo) + cl.relics * 28;
      energy = Math.min(ENERGY_MAX, energy + nLines + cl.relics);
      lines += nLines;
    } else {
      combo = 0;
    }

    cards.splice(mv.i, 1);
    if (!cards.length) cards = deal(rng);
  }
  return { score, steps, lines, bestCombo, dead: false, cards };
}

function report(label, fn) {
  const scores = [], steps = [], lines = [];
  let dead = 0;
  for (let i = 0; i < RUNS; i++) {
    const r = fn(SEED0 + i * 7919);
    scores.push(r.score); steps.push(r.steps); lines.push(r.lines);
    if (r.dead) dead++;
  }
  scores.sort((a, b) => a - b);
  steps.sort((a, b) => a - b);
  const p = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(arr.length * q))];
  const avg = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  const dist = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  for (const s of scores) dist[rankOf(s).k]++;
  console.log(
    `${label.padEnd(8)} 均分 ${String(avg(scores)).padStart(7)}  ` +
    `p10 ${String(p(scores, .1)).padStart(6)} p50 ${String(p(scores, .5)).padStart(6)} p90 ${String(p(scores, .9)).padStart(6)} p99 ${String(p(scores, .99)).padStart(7)}  ` +
    `步数 均 ${String(avg(steps)).padStart(3)} p50 ${String(p(steps, .5)).padStart(3)} p90 ${String(p(steps, .9)).padStart(3)}  ` +
    `提前死 ${Math.round(dead / RUNS * 100)}%`
  );
  const pct = (n) => (n / RUNS * 100).toFixed(1) + '%';
  console.log(
    `         评级 S ${pct(dist.S)} / A ${pct(dist.A)} / B ${pct(dist.B)} / C ${pct(dist.C)} / D ${pct(dist.D)}` +
    `   银芯中位 ${creditOf(p(scores, .5))}`
  );
}

console.log(`跑 ${RUNS} 局，种子 ${SEED0}\n`);
report('贪心', (s) => play(s, true));
report('随机', (s) => play(s, false));
