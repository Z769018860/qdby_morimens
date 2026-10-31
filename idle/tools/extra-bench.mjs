// 专属技能（超限技 / 终焉技）的边际价值体检。
//
// 每位唤醒体的 kit 强度本来就不一样，所以不能比「带专属技能的胜率」，
// 要比「带上它比不带它多赢了多少」——同一套关卡、同一个陪跑阵容、同一批种子，
// 只切换自己身上的 extra，差值就是这两个技能真正给这位角色补的价值。
//
// 用法：
//   node tools/extra-bench.mjs                 # 默认档
//   BENCH_OD=99 BENCH_LAW=99 node ...          # 已解锁
//   BENCH_STAGES=30,38,46,54 BENCH_SEEDS=3 node tools/extra-bench.mjs
import { readFileSync } from 'node:fs';
import { indexData, newState, prepareBattle } from '../src/core/game.js';
import { stageInfo } from '../src/core/enemies.js';
import { simulate, roundLimitFor } from '../src/core/battle.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);

const LV = +(process.env.BENCH_LV || 60);
const STAR = +(process.env.BENCH_STAR || 10);
const STAGES = (process.env.BENCH_STAGES || '44,52,60,68,76').split(',').map(Number);
const SEEDS = +(process.env.BENCH_SEEDS || 3);
const SEEDBASE = +(process.env.BENCH_SEEDBASE || 1000);
const FILLERS = ['ogier', 'doll', 'aurita', 'alva', 'thais', 'lotan'];

const state = newState(data, 1);
state.roster = {};
for (const a of data.awakeners) state.roster[a.slug] = { lv: LV, star: STAR, brk: 6, od: 99, law: 99 };

/**
 * 连续打分，避免 0/1 的粗糙分辨率：
 *   赢：0.70 ~ 1.00（越少回合越高，省下来的回合就是实打实的强度）
 *   输：0.00 ~ 0.70（按打掉敌人多少血算，打到一半约 0.35）
 */
function score(res) {
  const foes = res.prep.enemies;
  const left = new Map(foes.map((e) => [e.uid, e.hp]));
  for (const ev of res.events) {
    if (!ev.who || !left.has(ev.who)) continue;
    if (ev.k === 'die') left.set(ev.who, 0);
    else if (typeof ev.hp === 'number' && (ev.k === 'dmg' || ev.k === 'dot' || ev.k === 'counter')) left.set(ev.who, Math.max(0, ev.hp));
  }
  if (res.win) return 0.7 + 0.3 * (1 - res.rounds / (res.roundLimit || 20));
  const total = foes.reduce((s, e) => s + e.hp, 0) || 1;
  const rest = [...left.values()].reduce((s, x) => s + x, 0);
  return 0.7 * Math.max(0, Math.min(1, 1 - rest / total));
}

const MODES = ['none', 'od', 'law', 'both'];
const rows = [];
for (const a of data.awakeners) {
  const team = [a.slug, ...FILLERS.filter((x) => x !== a.slug)].slice(0, 4);
  state.team = team;
  state.strategy = { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' };
  const acc = { none: 0, od: 0, law: 0, both: 0 };
  let n = 0;
  for (const st of STAGES) {
    for (let k = 0; k < SEEDS; k++) {
      state.seed = (SEEDBASE + k * 7919 + st * 13) >>> 0;
      const prep = prepareBattle(state, data, st);
      const base = prep.allies.map((d) => d);
      for (const m of MODES) {
        // 陪跑位一律不带专属技能：差值只归被测的这一个人
        const allies = base.map((d, i) => {
          if (i !== 0) return { ...d, extra: null };
          if (m === 'none') return { ...d, extra: null };
          if (m === 'od') return { ...d, extra: { Od: d.extra.Od } };
          if (m === 'law') return { ...d, extra: { Law: d.extra.Law } };
          return d;
        });
        const res = simulate({ allies, enemies: prep.enemies, seed: prep.seed, strategy: state.strategy, maxRounds: roundLimitFor(stageInfo(st)) });
        acc[m] += score(res);
      }
      n++;
    }
  }
  for (const m of MODES) acc[m] /= n;
  rows.push({ slug: a.slug, type: a.type, realm: a.realm, ...acc, odGain: acc.od - acc.none, lawGain: acc.law - acc.none, bothGain: acc.both - acc.none });
}

const f = (x) => (x * 100).toFixed(1).padStart(6);
rows.sort((a, b) => a.bothGain - b.bothGain);
if (process.env.BENCH_VERBOSE || true) {
  for (const r of rows) console.log(`${f(r.bothGain)}  od${f(r.odGain)}  law${f(r.lawGain)}  base${f(r.none)}  ${r.type.padEnd(8)} ${r.realm.padEnd(6)} ${r.slug}`);
}
const st = (xs) => {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  const sd = Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
  return { m, sd };
};
const all = st(rows.map((r) => r.bothGain));
console.log(`--- lv${LV} ★${STAR} stages ${STAGES.join('/')} × ${SEEDS} ---`);
console.log(`边际增益 均值 ${(all.m * 100).toFixed(1)}  sd ${(all.sd * 100).toFixed(1)}  最好 ${(rows[rows.length - 1].bothGain * 100).toFixed(1)}(${rows[rows.length - 1].slug})  最差 ${(rows[0].bothGain * 100).toFixed(1)}(${rows[0].slug})`);
const g = (k) => st(rows.map((r) => r[k]));
console.log(`超限技 ${(g('odGain').m * 100).toFixed(1)}±${(g('odGain').sd * 100).toFixed(1)}   终焉技 ${(g('lawGain').m * 100).toFixed(1)}±${(g('lawGain').sd * 100).toFixed(1)}`);
const byType = {};
for (const r of rows) { const t = (byType[r.type] ||= []); t.push(r.bothGain); }
console.log('按定位：' + Object.entries(byType).map(([t, v]) => `${t} ${(st(v).m * 100).toFixed(1)}±${(st(v).sd * 100).toFixed(1)}`).join('  '));
const byRealm = {};
for (const r of rows) { const t = (byRealm[r.realm] ||= []); t.push(r.bothGain); }
console.log('按界域：' + Object.entries(byRealm).map(([t, v]) => `${t} ${(st(v).m * 100).toFixed(1)}`).join('  '));
