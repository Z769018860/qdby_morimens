// 平衡审计：① 每位唤醒体的胜率 / 伤害占比 / 存活率，② 四种队伍原型（毒、反击、多段、直伤）的横向对比。
// 用法：node tools/balance-audit.mjs [lv] [star]
// 目的：回答「有没有明显过强 / 过弱的角色」「毒反在吃过防御与增伤之后还站不站得住」。
import { readFileSync } from 'node:fs';
import { indexData, newState, prepareBattle } from '../src/core/game.js';
import { stageInfo } from '../src/core/enemies.js';
import { simulate, roundLimitFor } from '../src/core/battle.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);

const LV = +(process.argv[2] || process.env.LV) || 60;
const STAR = +(process.argv[3] || process.env.STAR) || 10;
const STAGES = (process.env.STAGES || '20,28,36,44,52').split(',').map(Number);
const SEEDS = +(process.env.SEEDS || 3);
const FILLERS = ['ogier', 'doll', 'aurita', 'alva', 'thais', 'lotan'];
const TYPE_ZH = { ASSAULT: '突击', WARDEN: '守护', CHORUS: '合唱' };
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);

function mkState(team) {
  const s = newState(data, 1);
  s.roster = {};
  for (const a of data.awakeners) s.roster[a.slug] = { lv: LV, star: STAR, brk: 6, od: 0, law: 0 };
  s.team = team;
  s.strategy = { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' };
  return s;
}

/** 跑一位 / 一队的指标：胜率、被测者伤害占比、结束时会战人数 */
function measure(s, focus /* 'a0' | null */) {
  let win = 0, n = 0, dmg = 0, allDmg = 0, alive = 0, rounds = 0;
  for (const st of STAGES) {
    for (let k = 0; k < SEEDS; k++) {
      s.seed = (1000 + k * 7919 + st * 13) >>> 0;
      const p = prepareBattle(s, data, st);
      const r = simulate({
        allies: p.allies, enemies: p.enemies, seed: s.seed, strategy: s.strategy,
        maxRounds: roundLimitFor(stageInfo(st)), rules: p.rules, dotBoost: p.dotBoost,
      });
      n++;
      if (r.win) win++;
      rounds += r.rounds;
      alive += r.allies.filter((a) => a.alive).length;
      const st2 = r.stats || {};
      const tot = Object.values(st2).filter((x) => x && x.dmg > 0).reduce((a, b) => a + b.dmg, 0);
      allDmg += tot;
      if (focus && st2[focus]) dmg += st2[focus].dmg || 0;
    }
  }
  return {
    rate: win / n, share: focus ? (allDmg ? dmg / allDmg : 0) : null,
    alive: alive / n, rounds: rounds / n,
  };
}

/* ---------- ① 全角色 ---------- */
const rows = [];
for (const a of data.awakeners) {
  const team = [a.slug, ...FILLERS.filter((x) => x !== a.slug)].slice(0, 4);
  const m = measure(mkState(team), 'a0');
  rows.push({ slug: a.slug, zh: a.zh, type: a.type, ...m });
}
const mean = {
  rate: rows.reduce((x, r) => x + r.rate, 0) / rows.length,
  share: rows.reduce((x, r) => x + r.share, 0) / rows.length,
};
const byType = {};
for (const r of rows) {
  const b = (byType[r.type] ||= { n: 0, rate: 0, share: 0 });
  b.n++; b.rate += r.rate; b.share += r.share;
}
console.log(`--- 全角色 ${LV} 级 ★${STAR}，关卡 ${STAGES.join('/')} × ${SEEDS} 种子 ---`);
console.log(`均值：胜率 ${(mean.rate * 100).toFixed(1)}%　伤害占比 ${(mean.share * 100).toFixed(1)}%`);
for (const [k, v] of Object.entries(byType)) {
  console.log(`　${pad(TYPE_ZH[k] || k, 4)} ${padl(v.n, 2)} 人　胜率 ${(v.rate / v.n * 100).toFixed(1)}%　伤害占比 ${(v.share / v.n * 100).toFixed(1)}%`);
}

const sorted = rows.slice().sort((a, b) => b.rate - a.rate || b.share - a.share);

/* FULL=1：把 62 位逐人打出来，按定位分组、组内按胜率排。
   审计要动的就是「同一定位里明显掉队的那几个」，只给前后八看不出组内相对位置。 */
if (process.env.FULL) {
  for (const t of ['ASSAULT', 'WARDEN', 'CHORUS']) {
    const g = rows.filter((r) => r.type === t).sort((a, b) => b.rate - a.rate || b.share - a.share);
    console.log(`\n=== ${TYPE_ZH[t]}（${g.length} 人，均值 ${(g.reduce((x, r) => x + r.rate, 0) / g.length * 100).toFixed(1)}%）===`);
    for (const r of g) {
      const gap = ((r.rate - mean.rate) * 100).toFixed(0);
      console.log(`　${pad(r.zh, 12)} 胜率 ${padl((r.rate * 100).toFixed(0), 3)}% (${gap >= 0 ? '+' : ''}${gap})　占比 ${padl((r.share * 100).toFixed(1), 5)}%　存活 ${r.alive.toFixed(2)}　回合 ${r.rounds.toFixed(1)}`);
    }
  }
}
console.log('\n前八（过强候选）：');
for (const r of sorted.slice(0, 8)) console.log(`　${pad(r.zh, 10)} ${TYPE_ZH[r.type]}　胜率 ${(r.rate * 100).toFixed(0)}%　伤害占比 ${(r.share * 100).toFixed(1)}%　存活 ${r.alive.toFixed(2)}`);
console.log('后八（过弱候选）：');
for (const r of sorted.slice(-8)) console.log(`　${pad(r.zh, 10)} ${TYPE_ZH[r.type]}　胜率 ${(r.rate * 100).toFixed(0)}%　伤害占比 ${(r.share * 100).toFixed(1)}%　存活 ${r.alive.toFixed(2)}`);

const hi = rows.filter((r) => r.rate >= 0.99 && r.share > mean.share * 1.15);
const lo = rows.filter((r) => r.rate < mean.rate - 0.15);
console.log(`\n离群：过强 ${hi.length} 位${hi.length ? `（${hi.map((r) => r.zh).join('、')}）` : ''}；过弱 ${lo.length} 位${lo.length ? `（${lo.map((r) => r.zh).join('、')}）` : ''}`);

/* ---------- ② 队伍原型 ---------- */
/* 四套「按机制组起来」的队，比的是「这套玩法还能不能打」，不是某个人强不强。
   毒 / 流血 / 反击在被改成吃防御 + 吃增伤之后，就是靠这里确认没有掉档。 */
const ARCH = [
  { zh: '毒队', team: ['castor', 'lily', 'agrippa', 'karen'] },
  { zh: '反击队', team: ['lotan', 'helot-catena', 'ogier', 'ramona'] },
  { zh: '多段队', team: ['castor', 'aurita', 'mouchette', 'pollux'] },
  { zh: '直伤队', team: ['24', 'alice', 'mouchette', 'sorel'] },
  { zh: '初始四人', team: ['ogier', 'lotan', 'doll', 'ramona'] },
].filter((a) => a.team.every((x) => data.bySlug[x]));

console.log('\n队伍原型（同一批关卡、同一批种子）：');
for (const a of ARCH) {
  const m = measure(mkState(a.team.slice()));
  console.log(`　${pad(a.zh, 6)} 胜率 ${(m.rate * 100).toFixed(0)}%　平均回合 ${m.rounds.toFixed(1)}　平均存活 ${m.alive.toFixed(2)}/4`);
}
