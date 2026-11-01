// 曲库体检：每首曲子过一遍四档难度，看谱面能不能正常生成。
//
// 加曲目之后跑一下：
//   node scripts/ll-song-check.mjs          全曲目
//   node scripts/ll-song-check.mjs dangzhan 只查一首
//
// 查的几件事：音符数别太少（<30 说明旋律密度不够，会是一首空曲）、
// 长条占比别超难度上限（超了说明旋律里长音太多，打起来像在按着不放）、
// 同一轨别出现「上一条还没结束、下一条就来了」（长条尾音压到下一个音符会判定错乱）、
// 音符时间别跑到曲子外面去。
import { SONGS, arrange } from '../js/ll/songs.js';
import { chartFromArr } from '../js/ll/analyze.js';

// 跟 js/lovelive.js 的 DIFFS 保持一致（改了那边记得改这边）
const DIFFS = [
  { k: 'easy', n: 'EASY', win: 0.075, lead: 1.85, gap: 0.40, hold: 0.55, holdCap: 0.14, holdAt: 1, maxTail: 1.2, jump: 1, tapQ: 0.36, dbl: 0, dblHold: 0 },
  { k: 'normal', n: 'NORMAL', win: 0.058, lead: 1.55, gap: 0.235, hold: 0.75, holdCap: 0.16, holdAt: 2, maxTail: 1.5, jump: 2, tapQ: 0.24, dbl: 0.07, dblHold: 0.30 },
  { k: 'hard', n: 'HARD', win: 0.05, lead: 1.28, gap: 0.17, hold: 0.88, holdCap: 0.18, holdAt: 2, maxTail: 1.8, jump: 3, tapQ: 0.14, dbl: 0.11, dblHold: 0.55 },
  { k: 'expert', n: 'EXPERT', win: 0.042, lead: 1.08, gap: 0.135, hold: 0.95, holdCap: 0.20, holdAt: 2, maxTail: 2.0, jump: 4, tapQ: 0.07, dbl: 0.13, dblHold: 0.70 },
];

const only = process.argv[2];
const list = only ? SONGS.filter((s) => s.id === only || s.n === only) : SONGS;
if (!list.length) {
  console.error('没有这首：' + only);
  process.exit(2);
}

let bad = 0;
for (const s of list) {
  const arr = arrange(s);
  const cells = [];
  for (const d of DIFFS) {
    const c = chartFromArr(arr, d, 12345);
    const holds = c.notes.filter((n) => n.kind === 'hold').length;
    const ratio = c.notes.length ? holds / c.notes.length : 0;
    const laneEnd = {};
    let clash = 0;
    for (const n of c.notes) {
      const end = n.kind === 'hold' ? n.tail : n.t;
      if (laneEnd[n.lane] != null && laneEnd[n.lane] > n.t + 1e-6) clash++;
      laneEnd[n.lane] = end;
    }
    // 结尾会补一个收尾音符（落点略晚于 dur），留 2 秒余量
    const outside = c.notes.filter((n) => n.t < 0 || n.t > arr.dur + 2).length;
    const why = [];
    if (c.notes.length < 30) why.push('音符太少');
    if (ratio > d.holdCap + 0.06) why.push('长条偏多');
    if (clash) why.push('同轨 ' + clash + ' 处冲突');
    if (outside) why.push('越界 ' + outside);
    if (why.length) bad++;
    cells.push(d.k + ':' + String(c.notes.length).padStart(3) + (why.length ? ' ✗' + why.join('/') : ''));
  }
  console.log(s.id.padEnd(12) + s.n.padEnd(22) + (arr.dur.toFixed(1) + 's').padStart(7) + '  ' + cells.join('  '));
}
console.log('\n' + list.length + ' 首，问题 ' + bad + ' 处');
process.exit(bad ? 1 : 0);
