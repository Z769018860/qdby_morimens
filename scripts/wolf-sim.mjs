#!/usr/bin/env node
// 弥萨格狼人杀：无头对局跑分 + 台词库体检
//
// 引擎不碰 DOM，所以能直接在 node 里跑。玩家用脚本玩家代替，检查四件事：
//   1. 规则不会卡死（事件流有终点）
//   2. 胜率不会一边倒（四档难度分别统计）
//   3. 台词库不漏项（每个角色每种场合都有话说，第一天不能出现「昨天」这类出戏词）
//   4. 同一局里不重复说同一句话
//
// 用法：
//   node scripts/wolf-sim.mjs            # 每档 400 局 + 台词体检
//   node scripts/wolf-sim.mjs 2000       # 每档 2000 局
//   node scripts/wolf-sim.mjs 200 audit  # 只跑台词体检
import { createGame, nextEvent, submit, nightOptions, playerFindings, canCall } from '../js/wolf/engine.js';
import { alive, mulberry32 } from '../js/wolf/util.js';
import { WOLF_SIDE, ROLES, CHARS, DIFFS } from '../js/wolf/data.js';
import { LINES, pickLine } from '../js/wolf/lines.js';

const N = Number(process.argv[2] || 400);
const MODE = process.argv[3] || 'all';

// 每种场合至少要写几句。数字是按「一局里会被用到几次」定的：
// 一个人一晚说八到十句，其中大半是指认和沉默，所以 accuse / idle 要最深。
const MIN_POOL = { accuse: 6, idle: 4, vote: 3, refuse: 2, comment: 2, defend: 2, defendSelf: 2 };

// 最长公共子串长度：用来抓「同一句话换了个说法」
function lcsub(a, b) {
  let best = 0;
  let prev = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        cur[j] = prev[j - 1] + 1;
        if (cur[j] > best) best = cur[j];
      }
    }
    prev = cur;
  }
  return best;
}

// ---------------------------------------------------------------- 台词体检
function audit() {
  const HIST = /昨天|昨夜|前天|上次|上一回|那晚|前几天|改口|换了说法|三天前|昨天说|昨夜说/;
  const ROLE_KEYS = Object.keys(ROLES);
  const problems = [];
  const seenText = new Map();
  let total = 0;
  let dup = 0;

  for (const c of CHARS) {
    const o = LINES[c.zh];
    if (!o) { problems.push(`${c.zh}：没有台词`); continue; }
    const say = o.say || {};
    // 第一天能用的指认句至少两句
    const acc = (say.accuse || []).filter((s) => !HIST.test(s));
    if (acc.length < 2) problems.push(`${c.zh}：第一天可用的指认句只有 ${acc.length} 句`);
    // 各种场合都要有
    for (const k of ['claimCrew', 'claimWolf', 'claimThird', 'accuse', 'defend', 'defendSelf', 'idle', 'vote', 'death', 'refuse', 'comment']) {
      if (!(say[k] && say[k].length)) problems.push(`${c.zh}：缺 ${k}`);
    }
    if (!say.react) problems.push(`${c.zh}：缺 react`);
    // 12 种身份都要有一句
    const role = o.role || {};
    for (const rk of ROLE_KEYS) {
      if (typeof role[rk] !== 'string' || !role[rk]) problems.push(`${c.zh}：身份「${ROLES[rk].zh}」没有专属台词`);
    }
    const rp = o.report || (o.say && o.say.report) || {};
    for (const k of ['wolf', 'clean', 'void']) {
      if (!rp[k] || !rp[k].length) problems.push(`${c.zh}：缺 report.${k}`);
    }
    const ls = o.last || (o.say && o.say.last) || {};
    for (const k of ['crew', 'wolf', 'third']) {
      if (!ls[k] || !ls[k].length) problems.push(`${c.zh}：缺遗言 last.${k}`);
    }
    // 真跑一遍取句：键名对不上（比如查验结果的 eroded / wolf）会整段退化成「……」
    // 池子里本来就有「……」这种沉默台词，所以单次撞上不算数，多抽几次看有没有真话
    const probe = (kind, ctx) => {
      let ok = false;
      for (let k = 0; k < 5 && !ok; k++) {
        const g = { rnd: Math.random, day: 2, recentSaid: [] };
        const pp = { char: c, saidSet: new Set() };
        const t = pickLine(g, pp, kind, ctx || {});
        if (t && t !== '……') ok = true;
      }
      if (!ok) problems.push(`${c.zh}：${kind} 取不到台词`);
    };
    for (const res of ['eroded', 'clean', 'void']) probe('report', { who: '某人', res });
    for (const k of ['accuse', 'defend', 'defendSelf', 'idle', 'vote', 'refuse', 'comment']) probe(k, { who: '某人' });
    probe('react', { sit: 'safe' });
    probe('react', { sit: 'dead' });
    for (const fac of ['crew', 'wolf', 'third']) probe('death', { faction: fac });
    for (const rk of ROLE_KEYS) probe('claim', { role: ROLES[rk].zh, roleKey: rk });

    // 池子深度：一局里一个人要说十来句，高频场合太浅就是明着轮播
    for (const [k, need] of Object.entries(MIN_POOL)) {
      const n = (say[k] || []).length;
      if (n < need) problems.push(`${c.zh}：${k} 只有 ${n} 句（至少要 ${need}）`);
    }

    // 近似重复：同一场合里两句共享一长段，读起来就是同一句话换了个说法
    for (const k of Object.keys(say)) {
      const arr = say[k];
      if (!Array.isArray(arr) || arr.length < 2) continue;
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = String(arr[i]).replace(/\{who\}/g, '');
          const b = String(arr[j]).replace(/\{who\}/g, '');
          const short = Math.min(a.length, b.length);
          if (short < 8) continue;
          const shared = lcsub(a, b);
          if (shared / short >= 0.6) {
            problems.push(`${c.zh}：${k} 有两句几乎一样 ——「${a.slice(0, 14)}…」/「${b.slice(0, 14)}…」`);
          }
        }
      }
    }

    // 统计总量 + 查重（同一批里重复的句子会让两个人说同样的话）
    const flat = (v) => (Array.isArray(v) ? v : (typeof v === 'string' ? [v] : []));
    const all = [];
    for (const k of Object.keys(say)) {
      const v = say[k];
      if (Array.isArray(v)) all.push(...v);
      else if (v && typeof v === 'object') for (const s of Object.keys(v)) all.push(...flat(v[s]));
    }
    for (const k of Object.keys(role)) all.push(...flat(role[k]));
    for (const k of Object.keys(rp)) all.push(...flat(rp[k]));
    for (const k of Object.keys(ls)) all.push(...flat(ls[k]));
    total += all.length;
    for (const t of all) {
      const n = t.replace(/\{who\}/g, '').trim();
      if (n.length < 4) continue;
      if (seenText.has(n)) dup++;
      else seenText.set(n, c.zh);
    }
  }
  console.log(`台词总量：${total} 句 / ${CHARS.length} 名唤醒体`);
  if (dup) console.log(`提示：${dup} 句在不同角色之间重复（作为兜底可以接受，但越少越好）`);
  if (problems.length) {
    console.log(`\n体检未通过（${problems.length} 项）：`);
    for (const p of problems.slice(0, 40)) console.log('  · ' + p);
    process.exitCode = 1;
  } else {
    console.log('体检通过：每位唤醒体 12 种身份 + 12 类场合 + 查验 + 遗言均已覆盖；高频场合池子够深，也没有换汤不换药的近似重复。');
  }
}

// ---------------------------------------------------------------- 一局
function playOne(diffKey, seed, style) {
  const G = createGame({ diff: diffKey, seed });
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  let steps = 0;
  const saidTexts = [];

  for (;;) {
    if (++steps > 6000) throw new Error('事件太多，可能在死循环：' + diffKey + ' seed=' + seed);
    const e = nextEvent(G);
    if (!e) {
      if (!G.over) throw new Error('事件流断了但游戏没结束：' + diffKey + ' seed=' + seed + ' phase=' + G.phase);
      break;
    }
    if (e.t === 'say' && e.pid !== 0) saidTexts.push(e.text);
    if (e.t !== 'turn') continue;

    const others = alive(G).filter((p) => p.id !== 0);

    if (e.kind === 'start') { submit(G, { type: 'start' }); continue; }

    if (e.kind === 'talk') {
      const me = G.player;
      const findings = playerFindings(G);
      const r = rnd();
      if (findings.length && r < 0.5) {
        const f = findings[0];
        submit(G, { type: 'talk', kind: 'report', target: f.to, res: f.res });
      } else if (r < 0.62 && canCall(G)) {
        submit(G, { type: 'talk', kind: 'call' });
      } else if (r < 0.74 && me.role && !G.claims[0]) {
        submit(G, { type: 'talk', kind: 'claim', role: me.role });
      } else if (r < 0.92 && others.length) {
        const t = others[Math.floor(rnd() * others.length)];
        submit(G, { type: 'talk', kind: 'accuse', target: t.id });
      } else {
        submit(G, { type: 'talk', kind: 'idle' });
      }
      continue;
    }

    if (e.kind === 'vote') {
      const pool = e.opts && e.opts.tied && e.opts.tied.length
        ? alive(G).filter((p) => e.opts.tied.includes(p.id))
        : others;
      let target = null;
      if (pool.length) {
        if (style === 'wolf' && G.player && WOLF_SIDE.has(G.player.role)) {
          const foes = pool.filter((p) => !WOLF_SIDE.has(p.role));
          target = (foes.length ? foes : pool)[Math.floor(rnd() * (foes.length || pool.length))].id;
        } else {
          target = pool[Math.floor(rnd() * pool.length)].id;
        }
      }
      submit(G, { type: 'vote', target });
      continue;
    }

    if (e.kind === 'night') {
      const o = nightOptions(G);
      if (!o) throw new Error('夜间没有可选项：' + G.player.role + ' seed=' + seed);
      if (!o.list.length) { submit(G, { type: 'night', target: null }); continue; }
      const target = o.list[Math.floor(rnd() * o.list.length)];
      submit(G, { type: 'night', target });
      continue;
    }

    if (e.kind === 'chain') {
      const list = (e.opts && e.opts.list) || [];
      submit(G, { type: 'chain', target: list.length ? list[Math.floor(rnd() * list.length)] : null });
      continue;
    }

    if (e.kind === 'revive') {
      submit(G, { type: 'revive', yes: rnd() < 0.6 });
      continue;
    }

    throw new Error('没见过的回合类型：' + e.kind);
  }

  // 同一局里的重复发言
  const uniq = new Set(saidTexts);
  return {
    winner: G.winner, day: G.day, role: G.player.role,
    sayN: saidTexts.length, sayUniq: uniq.size,
  };
}

const STYLES = ['random', 'wolf'];

if (MODE === 'audit') { audit(); process.exit(process.exitCode || 0); }

audit();
console.log('');

const rows = [];
let dupRate = 0;
for (const diff of DIFFS) {
  const stat = { games: 0, win: 0, days: 0, byWinner: {}, roles: {}, say: 0, uniq: 0 };
  for (let i = 0; i < N; i++) {
    const seed = (i * 2654435761 + diff.k.length * 97) >>> 0;
    const r = playOne(diff.k, seed, STYLES[i % STYLES.length]);
    stat.games++;
    stat.days += r.day;
    stat.say += r.sayN;
    stat.uniq += r.sayUniq;
    stat.byWinner[r.winner] = (stat.byWinner[r.winner] || 0) + 1;
    const faction = WOLF_SIDE.has(r.role) ? 'wolf' : (r.role === 'forgotten' ? 'forgotten' : 'crew');
    if (faction === r.winner) stat.win++;
    stat.roles[ROLES[r.role].zh] = (stat.roles[ROLES[r.role].zh] || 0) + 1;
  }
  const pct = (x) => (100 * x / stat.games).toFixed(1) + '%';
  dupRate += 1 - stat.uniq / Math.max(1, stat.say);
  rows.push({
    难度: diff.n,
    玩家胜率: pct(stat.win),
    平均天数: (stat.days / stat.games).toFixed(2),
    清醒胜: pct(stat.byWinner.crew || 0),
    融蚀胜: pct(stat.byWinner.wolf || 0),
    忘却胜: pct(stat.byWinner.forgotten || 0),
    每局发言: (stat.say / stat.games).toFixed(1),
    重复率: (100 * (1 - stat.uniq / Math.max(1, stat.say))).toFixed(1) + '%',
  });
}
console.table(rows);
console.log(`总重复率（同一局内重复的句子占比）：${(100 * dupRate / rows.length).toFixed(1)}%`);
