// 弥萨格轮盘 · 无头体检：所有唤醒体两两对打（规则不变量 / 死循环 / 状态非法 / 胜率 / 局长）。
// 用法：node scripts/roulette-sim.mjs [每个配对每个方向的局数，默认 3]
//
// 74 位出战者 → 74×73×2 个方向，默认 3 局/方向就是 3 万多场，跑完约一分钟；
// 想只看总数可以传 1。
//
// 为什么每个配对都要跑：轮盘的胜负对种子敏感（同一发实弹在第几颗就能决定整局），
// 一个配对 N 局只有 N 个样本，只看总胜率会把「某个角色明显偏强」抹平。
// 这里按配对 × 方向 × 种子各开一局，最后既给总榜也给「最极端的那几对」。
//
// 还有一件正事：好友房是「双方重放同一串动作」，所以引擎必须是确定性的。
// 脚本最后会拿同一个种子把同一局重放一遍，比对状态指纹——对不上就是同步隐患。
import * as E from '../js/roulette/engine.js';
import { aiStep } from '../js/roulette/ai.js';
import { CHARS, CHAR_ORDER } from '../js/roulette/gen.js';
import { ITEMS } from '../js/roulette/items.js';

const N = Number(process.argv[2] || 3);
const SB = Number(process.env.SB || 20261101);

const problems = new Map();
const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);

// 状态指纹：用来验「同一串动作重放两遍，结果一模一样」
function fingerprint(s) {
  return [
    s.r, s.round, s.turn, s.phase, s.winner,
    s.hp.join(','), s.shield.join(','), s.wins.join(','),
    s.shells.map((x) => (x ? 1 : 0)).join(''),
    s.items.map((arr) => arr.map((i) => i.id).join('|')).join('//'),
    s.saw.join(','), s.cuff.join(','), s.blood.join(','), s.mute.join(','),
    s.rev.join(','), s.rounds.length, s.need,
  ].join('#');
}

function check(s, tag) {
  if (s.turn !== 0 && s.turn !== 1) note('回合值非法 ' + tag);
  if (s.hp.some((h, i) => h < 0 || h > s.max[i])) note('理智越界 ' + tag);
  if (s.shield.some((x) => x < 0)) note('护盾为负 ' + tag);
  if (s.mute.some((x) => x !== 0 && x !== 1)) note('压制标记越界 ' + tag);
  if (s.need !== (s.best === 5 ? 3 : 2)) note('赛制与胜场数对不上 ' + tag);
  if (s.round < 1 || s.round > s.rounds.length) note('局数越界 ' + tag);
  if (s.phase === 'play' && (s.hp[0] <= 0 || s.hp[1] <= 0)) note('有人零血还在打 ' + tag);
  if (s.items.some((arr) => arr.length > E.SLOT_MAX)) note('道具超过槽位 ' + tag);
  const uids = new Set();
  for (const arr of s.items) for (const it of arr) {
    if (uids.has(it.uid)) note('uid 重复 ' + tag);
    uids.add(it.uid);
    if (!ITEMS[it.id]) note('未知道具 ' + it.id + ' ' + tag);
  }
  if (s.shells.length > 0 && s.know.some((k) => k.length !== s.shells.length)) note('知情数组长度和枪膛不一致 ' + tag);
}

const tally = {};   // 角色 → {w,l}
for (const id of CHAR_ORDER) tally[id] = { w: 0, l: 0 };
const pair = new Map(); // "a>b" → {w,l}
const res = { games: 0, timeout: 0, acts: 0, sweep: 0, third: 0 };
const roundsOf = { 2: 0, 3: 0 };
const itemUse = {};
let fpMismatch = 0;

for (let i = 0; i < CHAR_ORDER.length; i++) {
  for (let j = 0; j < CHAR_ORDER.length; j++) {
    if (i === j) continue; // 同角色对打没有意义（也测不出强弱）
    for (let d = 0; d < 2; d++) {
      const A = d === 0 ? CHAR_ORDER[i] : CHAR_ORDER[j];
      const B = d === 0 ? CHAR_ORDER[j] : CHAR_ORDER[i];
      for (let k = 0; k < N; k++) {
        const seed = (SB + i * 7919 + j * 104729 + k * 7717 + d * 31) >>> 0;
        let G;
        const best = (k + i) % 4 === 0 ? 5 : 3;   // 四分之一打五局三胜
        try { G = E.create(seed, [A, B], { best }); } catch (e) { note('create 抛错 ' + e.message); continue; }
        const acts = [];
        let steps = 0;
        try {
          while (G.phase === 'play') {
            if (++steps > 900) { note('死循环/行动过多'); res.timeout++; break; }
            const a = aiStep(G, G.turn, 'hard') || { t: 'shoot', target: 'foe' };
            const side = G.turn;
            let r;
            if (a.t === 'shoot') r = E.shoot(G, side, a.target);
            else r = E.useItem(G, side, a.uid);
            if (!r.ok) {
              // AI 提了个不合法的动作：记下来并兜底，别让它把体检卡死
              note('AI 动作被拒：' + (r.err || '') + ' @' + (a.t === 'item' ? a.uid : a.target));
              r = E.shoot(G, side, 'foe');
              if (!r.ok) { note('兜底动作也被拒'); break; }
            }
            acts.push(a);
            for (const ev of r.ev) if (ev.t === 'use') itemUse[ev.id] = (itemUse[ev.id] || 0) + 1;
            check(G, 'step' + steps);
          }
        } catch (e) {
          note('引擎抛错：' + e.message);
          continue;
        }
        if (G.phase !== 'over') continue;
        res.games++;
        res.acts += acts.length;
        roundsOf[G.round] = (roundsOf[G.round] || 0) + 1;
        if (G.wins[G.winner] === G.need && G.wins[1 - G.winner] === 0) res.sweep++;
        if (G.round === 3) res.third++;
        const winId = G.chars[G.winner];
        const loseId = G.chars[1 - G.winner];
        tally[winId].w++; tally[loseId].l++;
        const key = A + '>' + B;
        if (!pair.has(key)) pair.set(key, { w: 0, n: 0 });
        pair.get(key).w += (G.winner === 0 ? 1 : 0);
        pair.get(key).n += 1;

        // 确定性抽查：每局都重放一遍太慢，隔一局抽一次
        if (k % 2 === 0) {
          const G2 = E.create(seed, [A, B], { best });
          for (const a of acts) {
            if (G2.phase !== 'play') break;
            const side = G2.turn;
            if (a.t === 'shoot') E.shoot(G2, side, a.target);
            else E.useItem(G2, side, a.uid);
          }
          if (fingerprint(G) !== fingerprint(G2)) fpMismatch++;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- 报告
console.log(`弥萨格轮盘体检：${res.games} 场（每配对每方向 ${N} 局，种子基数 ${SB}）`);
if (fpMismatch) console.log(`！重放不一致 ${fpMismatch} 次 —— 好友房会分叉，必须修`);
console.log(`平均每场行动 ${(res.acts / Math.max(1, res.games)).toFixed(1)} 次 · 2:0 占 ${pct(res.sweep, res.games)} · 打满三局 ${pct(res.third, res.games)}`);
const roundLine = Object.entries(roundsOf).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k} 局 ${v}`).join(' / ');
console.log(`局数分布：${roundLine}`);
console.log('\n角色胜率（同水平 AI 互打）：');
const rows = CHAR_ORDER.map((id) => {
  const t = tally[id];
  const n = t.w + t.l;
  return { id, n, w: t.w, rate: n ? t.w / n : 0 };
}).sort((a, b) => b.rate - a.rate);
const show = rows.length > 24 ? [...rows.slice(0, 10), null, ...rows.slice(-10)] : rows;
for (const r of show) {
  if (!r) { console.log('  …'); continue; }
  const c = CHARS[r.id];
  console.log(`  ${(c.n + '　　').slice(0, 5)} ${(r.rate * 100).toFixed(1)}%  (${r.w}/${r.n})  理智 ${c.hp} · ${c.passive.n}`);
}
const allRates = rows.map((x) => x.rate);
const mean = allRates.reduce((a, b) => a + b, 0) / allRates.length;
const sd = Math.sqrt(allRates.reduce((a, b) => a + (b - mean) ** 2, 0) / allRates.length);
console.log(`  共 ${rows.length} 位 · 平均 ${(mean * 100).toFixed(1)}% · 标准差 ${(sd * 100).toFixed(1)}pp · 区间 ${(Math.min(...allRates) * 100).toFixed(1)}~${(Math.max(...allRates) * 100).toFixed(1)}%`);

// 极端配对：谁被谁克得最惨
const pairs = [...pair.entries()].map(([k, v]) => ({ k, w: v.w, n: v.n })).sort((a, b) => a.w / a.n - b.w / b.n);
const nm = (id) => CHARS[id].n;
console.log('\n最难受的三对（前者对后者胜率）：');
for (const p of pairs.slice(0, 3)) {
  const [a, b] = p.k.split('>');
  console.log(`  ${nm(a)} 打 ${nm(b)}：${pct(p.w, p.n)}`);
}
console.log('最好打的三对：');
for (const p of pairs.slice(-3).reverse()) {
  const [a, b] = p.k.split('>');
  console.log(`  ${nm(a)} 打 ${nm(b)}：${pct(p.w, p.n)}`);
}

const used = Object.entries(itemUse).sort((a, b) => b[1] - a[1]);
console.log('\n道具使用次数（' + used.reduce((n, x) => n + x[1], 0) + ' 次）：');
console.log('  ' + used.map(([id, n]) => `${ITEMS[id] ? ITEMS[id].n : id} ${n}`).join(' · '));

if (problems.size) {
  console.log('\n问题：');
  for (const [k, n] of [...problems.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k} ×${n}`);
  process.exitCode = 1;
} else {
  console.log('\n规则不变量全部通过（理智/护盾/槽位/uid/知情数组/回合/确定性）。');
}

function pct(a, b) { return ((a / Math.max(1, b)) * 100).toFixed(1) + '%'; }
