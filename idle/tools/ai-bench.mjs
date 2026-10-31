// 自动战斗 AI 体检：固定阵容、固定种子，逐角色跑同一批关卡。
//
// 为什么要逐角色：71 位唤醒体的 kit 是「类型骨架 + 界域附魔 + 真实卡面关键字」拼出来的，
// 同样是突破手，有人靠单体爆发、有人靠随机弹射、有人自带斩杀。同一套出牌规则对他们
// 的价值完全不同——只看「总通关数」是看不出谁被规则坑了的。
//
// 用法：node tools/ai-bench.mjs [lv] [star]
// 输出：每位唤醒体在固定关卡组上的胜率 / 平均回合数，以及全员的均值。
// 换 AI 前后各跑一次，比较「均值」和「掉队的角色」。
import { readFileSync } from 'node:fs';
import { indexData, newState, prepareBattle } from '../src/core/game.js';
import { stageInfo } from '../src/core/enemies.js';
import { simulate, roundLimitFor } from '../src/core/battle.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);

const LV = +(process.argv[2] || process.env.BENCH_LV) || 60;
const STAR = +(process.argv[3] || process.env.BENCH_STAR) || 10;
const STAGES = (process.env.BENCH_STAGES || '20,28,36,44,52').split(',').map(Number);
const SEEDS = +(process.env.BENCH_SEEDS || 4);
// 陪跑位：固定的守护 / 辅助 / 突击，保证每位的「队友质量」一样，差异只来自自己
const FILLERS = ['ogier', 'doll', 'aurita', 'alva', 'thais', 'lotan'];

const state = newState(data, 1);
state.roster = {};
for (const a of data.awakeners) state.roster[a.slug] = { lv: LV, star: STAR, brk: 6, od: 0, law: 0 };

const rows = [];
for (const a of data.awakeners) {
  const team = [a.slug, ...FILLERS.filter((x) => x !== a.slug)].slice(0, 4);
  state.team = team;
  state.strategy = { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' };
  let wins = 0, rounds = 0, n = 0;
  for (const st of STAGES) {
    for (let k = 0; k < SEEDS; k++) {
      state.seed = (1000 + k * 7919 + st * 13) >>> 0;
      const p = prepareBattle(state, data, st);
      const res = simulate({ allies: p.allies, enemies: p.enemies, seed: p.seed, strategy: state.strategy, maxRounds: roundLimitFor(stageInfo(st)) });
      n++; rounds += res.rounds; if (res.win) wins++;
    }
  }
  rows.push({ slug: a.slug, type: a.type, wr: wins / n, rounds: rounds / n });
}

const mean = rows.reduce((s, r) => s + r.wr, 0) / rows.length;
rows.sort((a, b) => a.wr - b.wr);
const f = (x) => (x * 100).toFixed(1).padStart(5);
if (process.env.BENCH_VERBOSE) for (const r of rows) console.log(`${f(r.wr)}%  ${r.rounds.toFixed(1)}R  ${r.type.padEnd(8)} ${r.slug}`);
console.log(`--- lv${LV} star${STAR} stages ${STAGES.join('/')} × ${SEEDS} seeds ---`);
console.log(`全员平均胜率 ${(mean * 100).toFixed(1)}%   中位 ${f(rows[Math.floor(rows.length / 2)].wr)}%   全胜角色 ${rows.filter((r) => r.wr === 1).length}/${rows.length}`);
console.log(`垫底十位：${rows.slice(0, 10).map((r) => `${r.slug}${f(r.wr)}%`).join('  ')}`);
const byType = {};
for (const r of rows) { const t = (byType[r.type] ||= { s: 0, n: 0 }); t.s += r.wr; t.n++; }
console.log('按定位：' + Object.entries(byType).map(([t, v]) => `${t} ${(v.s / v.n * 100).toFixed(1)}%`).join('   '));
