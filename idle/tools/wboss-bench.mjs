// 世界 Boss 数值标定：跑几档典型队伍，看 12 回合能打出多少伤害。
//
// 用途：
//   1) 定「单次伤害上限」（服务端用来夹伪造上报的那个数）——取满配上限再留一点余量；
//   2) 定血池大小——按「大部队一天的 3 次能打掉多少」倒推该开多大；
//   3) 改数值之后复跑，确认没把某一档打得没戏 / 一档独大。
//
// 用法：node tools/wboss-bench.mjs [seeds]
// 队伍不是手工挑的：用 autoTeam()（玩家点「一键上阵」会得到的那套）+ fillLoadout() 自动配装，
// 这样算出来的数更接近真实存档，而不是理想化的满级四人组。
import { readFileSync } from 'node:fs';
import {
  indexData, newState, teamDefs, fillLoadout, autoTeam, rollItem, addItem,
} from '../src/core/game.js';
import { simulate } from '../src/core/battle.js';
import { mulberry32 } from '../src/core/rng.js';
import { wbossEnemy, wbossWeek, WBOSS_ROUNDS, WBOSS_HP_MIN, WBOSS_MAX_HIT } from '../src/core/wboss.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);

const SEEDS = +(process.argv[2] || 8);
const WEEK = wbossWeek();

/* 五档存档快照。lv 与 star 必须满足 levelCap(star) = 60 + star 的约束，
   否则 newState 的校验会把等级压回去，标定就失真了。 */
const TIERS = [
  { k: '新手', lv: 45, star: 2, maxStage: 20, items: 4, ilv: 0, rf: 0, brk: 2 },
  { k: '大部队', lv: 65, star: 8, maxStage: 60, items: 14, ilv: 6, rf: 0, brk: 3 },
  { k: '活跃', lv: 85, star: 28, maxStage: 110, items: 26, ilv: 14, rf: 1, brk: 4 },
  { k: '高配', lv: 110, star: 52, maxStage: 170, items: 40, ilv: 24, rf: 2, brk: 6 },
  { k: '满配', lv: 159, star: 99, maxStage: 220, items: 60, ilv: 40, rf: 5, brk: 7 },
];

const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
const wan = (n) => (n >= 1e4 ? (n / 1e4).toFixed(1) + '万' : String(Math.round(n)));

function mkState(t) {
  const s = newState(data, 1);
  s.roster = {};
  for (const a of data.awakeners) s.roster[a.slug] = { lv: t.lv, star: t.star, brk: t.brk, od: 0, law: 0 };
  s.maxStage = t.maxStage;
  s.seed = 20261112;
  const rng = mulberry32(0x9e3779b9);
  for (let i = 0; i < t.items; i++) {
    const got = rollItem(rng, t.maxStage, data);
    const it = addItem(s, got.kind, got.defId);
    it.lv = t.ilv;
    if (it.rf != null || t.rf) it.rf = t.rf;
  }
  autoTeam(s, data);
  const lo = fillLoadout(s, data, s.team, { equip: s.gear.equip });
  s.gear.equip = s.gear.equip;              // fillLoadout 就地把 equip 写回来了
  s.gear.relics = lo.relics;
  s.orders.slots = lo.orders;
  return s;
}

const boss = wbossEnemy(data, WEEK);
if (!boss) { console.error('这一期没有 Boss，跑不了'); process.exit(1); }

const rows = [];
for (const t of TIERS) {
  const s = mkState(t);
  const team = teamDefs(s, data, s.team);
  const dmgs = [];
  let downed = 0;
  for (let k = 0; k < SEEDS; k++) {
    const seed = (1013 + k * 7919 + 17) >>> 0;
    const r = simulate({
      allies: team.list, enemies: [wbossEnemy(data, WEEK)], seed,
      strategy: { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' },
      maxRounds: WBOSS_ROUNDS,
    });
    const d = Object.entries(r.stats || {})
      .filter(([k2]) => k2[0] === 'a')
      .reduce((a, [, v]) => a + (v.dmg || 0), 0);
    dmgs.push(Math.round(d));
    if (r.allies && r.allies.every((a) => !a.alive)) downed++;
  }
  dmgs.sort((a, b) => a - b);
  const avg = dmgs.reduce((a, b) => a + b, 0) / dmgs.length;
  rows.push({
    k: t.k, power: Math.round(team.power), team: team.list.map((x) => x.name).join('/'),
    avg, min: dmgs[0], max: dmgs[dmgs.length - 1], downed,
    week: avg * WBOSS_ROUNDS / WBOSS_ROUNDS * 21,   // 一周 21 次（每天 3 次）
  });
}

console.log(`\n世界 Boss 伤害标定 · ${WEEK} · Boss：${boss.name}（攻 ${boss.atk} / 防 ${boss.def}）· ${WBOSS_ROUNDS} 回合 · ${SEEDS} 个种子\n`);
console.log(pad('档位', 8) + padl('战力', 8) + padl('均伤', 10) + padl('最低', 10) + padl('最高', 10) + padl('全灭', 6) + padl('一周21次', 12) + '  阵容');
for (const r of rows) {
  console.log(pad(r.k, 8) + padl(r.power, 8) + padl(wan(r.avg), 10) + padl(wan(r.min), 10) + padl(wan(r.max), 10)
    + padl(r.downed + '/' + SEEDS, 6) + padl(wan(r.week), 12) + '  ' + r.team);
}

/* 血池按「上周参与人数 × 每人 60 万」开，夹在 800 万 ~ 6000 万（服务端 wbPoolMax 同一口径）。
   所以这里按几种服务器规模各算一遍：多少人打一周能打空。 */
const poolOf = (n) => Math.round(Math.min(6e7, Math.max(WBOSS_HP_MIN, Math.max(1, n) * 6e5)));
const upper = Math.min(WBOSS_MAX_HIT, Math.round(poolOf(20) * 0.2));
console.log(`\n单次上限：绝对上限 ${wan(WBOSS_MAX_HIT)} 与「血池两成」取小（20 人局约 ${wan(Math.min(WBOSS_MAX_HIT, Math.round(poolOf(20) * 0.2)))}）`);
console.log('血池与人数的关系（每周每人 21 次）：\n');
console.log(pad('规模', 8) + padl('血池', 10) + padl('全是大部队', 14) + padl('全是活跃', 12) + padl('全是满配', 12));
for (const n of [3, 5, 10, 20, 40, 80]) {
  const pool = poolOf(n);
  const need = (r) => (pool / Math.max(1, r.avg * 21)).toFixed(1) + ' 人';
  console.log(pad(n + ' 人', 8) + padl(wan(pool), 10) + padl(need(rows[1]), 14) + padl(need(rows[2]), 12) + padl(need(rows[rows.length - 1]), 12));
}
const mid = rows[1];
console.log(`\n一局 20 人、血池 ${wan(poolOf(20))}：大部队每人一周打 ${wan(mid.avg * 21)}（占 ${(mid.avg * 21 / poolOf(20) * 100).toFixed(1)}%），`);
console.log(`20 个大部队合计 ${wan(mid.avg * 21 * 20)} —— 打空需要 ${Math.ceil(poolOf(20) / (mid.avg * 21))} 个这样的人。`);
console.log(`单人一发最多 ${wan(upper)}（血池两成），所以「一个人一天三发」最多打掉 ${(upper * 3 / poolOf(20) * 100).toFixed(0)}% 血池。`);
