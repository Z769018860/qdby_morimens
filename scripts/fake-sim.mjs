// 《寻找伪人：Morimens》v4 的平衡模拟：机器人按真实玩家能拿到的信息做判断，跑 N 局统计结局。
//
// 机器人拿不到「谁是真」这种答案，只能：
//   · 卡面 / 答话 —— 和档案对（档案随时可查）
//   · 自称 / 瞳色 / 随身物 / 动物 / 口头禅 —— 只有图鉴**核实过**的才拿来对
// 和玩家的差别只有一处：它会把自己听到的真值写进图鉴（靠模拟的 localStorage），
// 所以「跑 N 局」等于「同一个玩家玩了 N 个周目」，图鉴是累积的。
//
// 用法：node scripts/fake-sim.mjs 400 [seedBase]
//   DIFF=intro|std|hard|night   选难度（默认 intro）
//   STYLE=0|1|2                 机器人性格：保守 / 平衡 / 大胆
//   FRESH=1                     每局清图鉴（＝第一周目）

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const E = await import('file:///H:/work/qdby_morimens/js/fake/engine.js');

const N = +(process.argv[2] || 200);
const BASE = +(process.argv[3] || 20261103);
// 机器人性格：0=保守（看不懂就不放） 1=平衡 2=大胆（能放就放）
const STYLE = process.env.STYLE || '1';
const DIFF = process.env.DIFF || 'intro';

const TR = ['self', 'eye', 'item', 'pet', 'line'];

function knownLies(p) {
  const out = [];
  for (const f of TR) {
    if (!E.isKnown(p.cid, f)) continue;
    if ((p.shown[f] || '') !== (p.c.tr[f] || '')) out.push(f);
  }
  return out;
}
// 卡面上印的那几行才有得对；别偷看 claims 里没印出来的字段
function paperLies(p) {
  const out = [];
  for (const f of (p.c.card || [])) {
    if (p.c.facts[f] != null && p.claims[f] !== p.c.facts[f]) out.push(f);
  }
  return out;
}

function playVisit(s) {
  const v = E.currentVisitor(s);
  if (!v) return;
  // 1) 卡面先看（免费）
  let lie = paperLies(v).length > 0;
  // 2) 问话：先问没问过的
  const askOrder = (v.c.ask || []).slice();
  for (const f of askOrder) {
    if (v.acts <= 0 || lie) break;
    const r = E.ask(s, f);
    if (r && !r.ok) lie = true;
  }
  // 3) 听 / 看（不占问话次数）
  if (E.canHear(s, v)) E.hear(s);
  if (E.canPeek(s, v)) { const pk = E.peek(s, v); if (pk && pk.odd >= 0) lie = true; }
  if (knownLies(v).length) lie = true;

  if (lie) { E.decide(s, 'refuse'); return; }
  // 没查出问题：按性格决定放不放
  const roomy = !E.roomFull(s);
  const admit = STYLE === '2' ? roomy : (STYLE === '1' ? (roomy && s.sanity > 45) : (roomy && s.sanity > 70));
  const r = E.decide(s, admit ? 'admit' : 'refuse');
  if (!r) E.decide(s, 'refuse');   // 屋子满了：放不进来，只能让他走
}

function playDay(s) {
  // 白天：先把卡面核一遍（最便宜），再按图鉴核底细
  for (const h of E.homeAlive(s)) {
    if (s.over) return;
    const topics = ['card', 'fact', 'self', 'eye', 'item'];
    let lie = false;
    for (const t of topics) {
      if (lie) break;
      if (!E.canTalk(s, h, t)) continue;
      // 底细类：图鉴里没有就先记一笔（不判），有才拿来对
      if (t === 'self' || t === 'eye' || t === 'item') {
        const pre = ['self'].map((f) => [f]).length; // 占位，保持可读
        void pre;
        const field = t;
        const wasKnown = E.isKnown(h.cid, field) || (t === 'item' && E.isKnown(h.cid, 'item'));
        const r = E.talk(s, h.cid, t);
        if (!r) continue;
        if (wasKnown && (r.lie === field || (t === 'item' && r.lie === 'pet'))) lie = true;
      } else {
        const r = E.talk(s, h.cid, t);
        if (!r) continue;
        if (r.lie) lie = true;
        if (r.odd >= 0) lie = true;
      }
    }
    if (lie && s.bullets > 0) {
      const res = E.shoot(s, h.cid);
      if (res && s.over) return;
    }
  }
}

const tally = {};
const sanity = [];
let runs = 0, totalDeaths = 0, shots = 0, leaks = 0, caught = 0, gain = 0, taskAll = 0;
const dayEnd = [];
const cfgDays = E.diffOf(DIFF).days;

for (let i = 0; i < N; i++) {
  // FRESH=1 时每局清空图鉴：模拟一个从零开始的新玩家（第一周目的真实难度）
  if (process.env.FRESH) store.clear();
  const s = E.newRun((BASE + i * 7919) >>> 0, DIFF);
  playDay(s);
  for (let n = 0; n < s.days; n++) {
    if (s.over) break;
    E.startNight(s);
    const nv = s.nights[s.night] ? s.nights[s.night].visits : 0;
    for (let k = 0; k < nv; k++) {
      playVisit(s);
      if (s.over) break;
      if (k < nv - 1) E.nextVisitor(s);
    }
    if (s.over) break;
    E.endNight(s);
    if (s.over) break;
    playDay(s);
  }
  if (!s.over) E.finish(s);
  runs++;
  tally[s.ending] = (tally[s.ending] || 0) + 1;
  sanity.push(s.sanity);
  totalDeaths += s.deaths.filter((d) => d.how === 'night').length;
  shots += s.killedReal;
  leaks += s.leaked;
  caught += s.caught;
  gain += E.rewardOf(s).gain;
  if (E.tasksDone(s) === s.tasks.length) taskAll++;
  dayEnd.push(s.day);
}

const pct = (n) => (n / runs * 100).toFixed(1) + '%';
const all = ['doctrine', 'archive', 'perfect', 'deaf', 'host', 'crowd', 'tenant', 'cockroach',
  'split', 'broadcast', 'keeper', 'dawn', 'alone', 'shut', 'leak', 'san', 'kill'];
console.log(`局数 ${runs} · 难度 ${DIFF}（${cfgDays} 夜） · 性格 ${STYLE} · 种子基数 ${BASE}`);
console.log('结局：' + all.map((k) => `${k} ${((tally[k] || 0) / runs * 100).toFixed(1)}%`).join(' · '));
console.log('平均：理智 ' + (sanity.reduce((a, b) => a + b, 0) / runs).toFixed(1)
  + ' · 夜里死人 ' + (totalDeaths / runs).toFixed(2)
  + ' · 误杀 ' + (shots / runs).toFixed(2)
  + ' · 放进伪人 ' + (leaks / runs).toFixed(2)
  + ' · 看破 ' + (caught / runs).toFixed(2)
  + ' · 撑到第 ' + (dayEnd.reduce((a, b) => a + b, 0) / runs + 1).toFixed(1) + ' 天'
  + ' · 银芯 ' + (gain / runs).toFixed(0)
  + ' · 三任务全达 ' + pct(taskAll));
console.log('图鉴核实 ' + E.knownCount() + ' / ' + E.KNOWN_MAX);
