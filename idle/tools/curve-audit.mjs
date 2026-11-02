// 难度曲线体检：对每一关，扫一档「队伍等级」，看胜率从 100% 掉到 0% 的过渡有多陡。
// 用法：node tools/curve-audit.mjs [最大关数] [种子数]
// 输出一张表：关卡 / 各等级胜率。断崖（相邻 10 级胜率从 ≥80% 掉到 ≤20%）会被标出来。
import { readFileSync } from 'node:fs';
import { newState, runBattle, indexData } from '../src/core/game.js';
import { levelCap } from '../src/core/stats.js';
const STARTERS = ['ogier', 'lotan', 'doll', 'ramona'];

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);

const MAX = Number(process.argv[2]) || 120;
const SEEDS = Number(process.argv[3]) || 2;
// 队伍：默认用初始四人（新手一路带下去的那套），可以用 TEAM=a,b,c,d 换成别人
const TEAM = (process.env.TEAM || STARTERS.join(',')).split(',');
const STARS = Number(process.env.STAR || 0);
const LEVELS = (process.env.LEVELS || '20,30,40,50,60,70,80,90,99').split(',').map(Number);

function rateAt(stage, lv, seeds = SEEDS) {
  const s = newState(data, 1);
  s.team = TEAM.slice();
  // 等级上限是 60 + 叠位：想测 Lv80 就得给 20 层叠位（顺带吃到叠位的属性），
  // 否则 lv 会被夹回 60，测出来 60 级以后全是 0% 的假曲线
  const star = Math.max(STARS, lv - 60);
  for (const k of TEAM) s.roster[k] = { lv: Math.min(lv, levelCap(star)), star, brk: Math.floor(lv / 10) };
  s.maxStage = Math.max(0, stage - 1);
  let w = 0;
  for (let i = 0; i < seeds; i++) { s.seed = 1000 + i * 7919; if (runBattle(s, data, stage).win) w++; }
  return w / seeds;
}

const rows = [];
for (let st = 1; st <= MAX; st++) {
  const r = LEVELS.map((lv) => rateAt(st, lv));
  rows.push({ st, r });
}

const pad = (s, n) => String(s).padStart(n);
console.log(`队伍 ${TEAM.join(' / ')}　★${STARS}　种子 ${SEEDS}`);
console.log('关卡 | ' + LEVELS.map((l) => pad('Lv' + l, 4)).join(' '));
for (const { st, r } of rows) {
  const mark = st % 10 === 0 ? 'B' : st % 5 === 0 ? 'E' : ' ';
  console.log(pad(st, 4) + mark + ' | ' + r.map((x) => pad(Math.round(x * 100) + '%', 4)).join(' '));
}

// 断崖检测：对每个相邻等级对，找胜率跨过 50% 的位置，再看这段区间有多宽
console.log('\n=== 断崖 ===');
let worst = [];
for (let i = 1; i < rows.length; i++) {
  const a = rows[i - 1].r, b = rows[i].r;
  for (let j = 1; j < LEVELS.length; j++) {
    // 「这一关在 Lv(LEVELS[j-1]) 时还能赢，到 Lv(LEVELS[j]) 就基本输了」= 需要的等级落在这段
    if (a[j - 1] >= 0.5 && b[j] <= 0.5 && a[j - 1] - a[j] > 0.6) worst.push(`${i}→${i + 1} 关之间`);
  }
}
console.log(worst.length ? worst.slice(0, 20).join('，') + `　（共 ${worst.length} 处）` : '没有明显断崖');
