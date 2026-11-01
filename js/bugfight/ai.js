// 电子斗蛐蛐 · 九个人机的下注脑子
//
// 每个席位只知道**看得到的东西**：两队的血、攻、技能意图，还有已经下过的注。
// 没有谁敢偷看这一局的结果（引擎在开打之前根本没掷骰子，看也看不到）。
// 差别只在两处：
//   1) 估得准不准（noise：阿格里帕是算过的，24 是听「她们」的）
//   2) 押多少（frac：杜勒赛因下大注，立誓0氪永远最低注）
// 跟随型（herd）与反向型（fade）还会读全场注额——所以 table.aiBet() 把
// 他们排在最后下注。

import { teamPower } from './table.js';

// 战力比 → 胜率 的斜率。用 scripts/bugfight-sim.mjs 的对局实测标定：
// 一方战力是另一方 x 倍时，真实胜率约 1/(1+x^-4.7)（2000 局 logistic 拟合，AUC 0.74）。
// 改动这里要重跑那个脚本。
export const K = 4.7;

// lens 是「他拿什么当强弱的依据」——这一条比 noise 更重要：
// 九个人如果都按同一套战力算，押注方向会高度一致，强队那边注额爆掉、赔率被压死，
// 谁都能靠押冷门白捡钱。所以各看各的（王只看血厚、立誓0氪只看只数、白云只看输出），
// 市场上自然有两边注，赔率才像话。
export const STYLE = {
  sharp: { noise: 0.16, frac: 0.09, pass: 0, lens: 'power', why: '血攻意图一起算' },
  titan: { noise: 0.24, frac: 0.22, pass: 0, lens: 'hp', why: '只认血厚的' },
  bold: { noise: 0.34, frac: 0.25, pass: 0, lens: 'atk', why: '只看谁打得疼' },
  dog: { noise: 0.46, frac: 0.15, side: 'under', lens: 'power', why: '专押不被看好的' },
  swing: { noise: 0.85, frac: 0.11, pass: 0.1, lens: 'power', why: '来回摇摆' },
  chill: { noise: 0.36, frac: 0.055, pass: 0.22, lens: 'power', why: '注小、不贪' },
  thrift: { noise: 0.42, frac: 0.03, pass: 0.12, cap: 2.2, lens: 'count', why: '只数多就押' },
  herd: { noise: 0.4, frac: 0.08, side: 'herd', lens: 'power', why: '跟着注多的一边' },
  contrarian: { noise: 0.3, frac: 0.12, side: 'fade', lens: 'power', why: '别人押哪边就反着来' },
};

/** 这个风格眼里的双方实力（用哪一项当尺子）。 */
function view(st, fixture) {
  const a = fixture.sl, b = fixture.sr;
  if (!a || !b) return [fixture.pL, fixture.pR];
  if (st.lens === 'hp') return [a.hp, b.hp];
  if (st.lens === 'atk') return [a.atk, b.atk];
  if (st.lens === 'count') return [a.n * 700 + a.hp * 0.15, b.n * 700 + b.hp * 0.15];
  return [fixture.pL, fixture.pR];
}

function gauss(rnd) {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** 两支队的胜率估计（左边赢的概率）。noise 越大越离谱。 */
export function estimateP(pL, pR, noise, rnd) {
  const base = 1 / (1 + Math.pow(Math.max(1, pR) / Math.max(1, pL), K));
  const z = Math.log(Math.max(1e-6, base) / Math.max(1e-6, 1 - base)) + gauss(rnd) * (noise || 0);
  return 1 / (1 + Math.exp(-z));
}

/**
 * 决定这一注。返回 null = 不下注，否则 {side, amt}。
 * seat: 席位对象（含 bank / style）；pool: {0: 左总注, 1: 右总注}
 */
export function decideBet(seat, fixture, pool, table, data, MIN, rnd) {
  const st = STYLE[seat.style] || STYLE.sharp;
  const r = rnd || table.rnd;
  const [vL, vR] = view(st, fixture);
  const p = estimateP(vL, vR, st.noise, r);

  if (st.pass && p > 0.42 && p < 0.58 && r() < st.pass) return null;

  let side = p >= 0.5 ? 0 : 1;

  if (st.side === 'under') side = p >= 0.5 ? 1 : 0;          // 反着押弱队
  else if (st.side === 'fade') {
    // 别人都押哪边就反着来；场上还没人下注时按自己算的押反边
    const lead = pool[0] === pool[1] ? (p >= 0.5 ? 0 : 1) : (pool[0] > pool[1] ? 0 : 1);
    side = 1 - lead;
  } else if (st.side === 'herd') {
    if (pool[0] === 0 && pool[1] === 0) side = p >= 0.5 ? 0 : 1;
    else side = pool[0] >= pool[1] ? 0 : 1;
  }

  const conf = Math.abs(p - 0.5) * 2;      // 0~1，把握有多大
  let amt = seat.bank * st.frac * (0.55 + conf * 0.9);
  if (st.cap) amt = Math.min(amt, MIN * st.cap);
  // 押弱队的人下得小一点：他自己也知道这是赌
  if (st.side === 'under' || st.side === 'fade') amt *= 0.8;
  amt = Math.max(MIN, Math.min(seat.bank, Math.round(amt / 10) * 10));

  return { side, amt };
}

/** 界面用：这个人下注时的那句话。 */
export function betLine(seat, bet, fixture) {
  if (!bet) return '这一手我不下。';
  const left = bet.side === 0;
  const st = STYLE[seat.style] || STYLE.sharp;
  if (st.side === 'fade') return left ? '你们全押右边？那我看左边。' : '都往左挤，我往右。';
  if (st.side === 'under') return left ? '没人看好左边，正好。' : '右边被人忘了，我记着。';
  if (st.side === 'herd') return left ? '大家都往左，我也往左。' : '右边注多，我跟这边。';
  if (bet.amt >= seat.bank * 0.18) return left ? '左边，压大。' : '右边，压大。';
  return left ? '左边稳一点。' : '右边稳一点。';
}
