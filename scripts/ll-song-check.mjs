// 曲库体检：每首曲子过一遍四档难度，看谱面能不能正常生成、九格用得匀不匀。
//
// 加曲目之后跑一下：
//   node scripts/ll-song-check.mjs          全曲目
//   node scripts/ll-song-check.mjs dangzhan 只查一首
//
// 查的几件事：音符数别太少（<30 说明旋律密度不够，会是一首空曲）、
// 长条占比别超难度上限（超了说明旋律里长音太多，打起来像在按着不放）、
// 同一轨别出现「上一条还没结束、下一条就来了」（长条尾音压到下一个音符会判定错乱）、
// 音符时间别跑到曲子外面去，
// 九格用量别一边倒（最多的一格 / 平均 超过 1.6，或者有格子整首没用到，
// 都会出现「有框几乎没用过」的手感），
// 同一格别连着两条长条（刚松手又按下去，手指换不过来）。
import { SONGS, arrange } from '../js/ll/songs.js';
import { chartFromArr } from '../js/ll/analyze.js';
import { DIFFS } from '../js/ll/diffs.js';

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
    // 九格用量：一边倒的话会有格子整首摸不到，另几格挤成一团
    const use = new Array(9).fill(0);
    for (const n of c.notes) use[n.lane]++;
    const avg = c.notes.length / 9;
    const spread = Math.max.apply(null, use) / Math.max(1, avg);
    const idle = use.filter((v) => v < Math.max(1, Math.round(avg * 0.25))).length;
    // 同一格连着两条长条：中间没隔 holdCd，手指来不及换
    const byLane = new Map();
    for (const n of c.notes) {
      if (!byLane.has(n.lane)) byLane.set(n.lane, []);
      byLane.get(n.lane).push(n);
    }
    let chain = 0;
    const cd = d.holdCd == null ? 1.7 : d.holdCd;
    for (const q of byLane.values()) {
      q.sort((a, b) => a.t - b.t);
      for (let i = 1; i < q.length; i++) {
        if (q[i].kind !== 'hold' || q[i - 1].kind !== 'hold') continue;
        if (q[i].t - (q[i - 1].tail || q[i - 1].t) < cd - 1e-6) chain++;
      }
    }
    const why = [];
    if (c.notes.length < 30) why.push('音符太少');
    if (ratio > d.holdCap + 0.06) why.push('长条偏多');
    if (clash) why.push('同轨 ' + clash + ' 处冲突');
    if (outside) why.push('越界 ' + outside);
    if (spread > 1.6) why.push('九格不匀 ' + spread.toFixed(2));
    if (idle) why.push('闲置格 ' + idle);
    if (chain) why.push('连长条 ' + chain);
    if (why.length) bad++;
    cells.push(d.k + ':' + String(c.notes.length).padStart(3) + (why.length ? ' ✗' + why.join('/') : ''));
  }
  console.log(s.id.padEnd(12) + s.n.padEnd(22) + (arr.dur.toFixed(1) + 's').padStart(7) + '  ' + cells.join('  '));
}
console.log('\n' + list.length + ' 首，问题 ' + bad + ' 处');
process.exit(bad ? 1 : 0);
