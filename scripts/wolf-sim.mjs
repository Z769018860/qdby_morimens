#!/usr/bin/env node
// 弥萨格狼人杀：无头对局跑分
//
// 引擎不碰 DOM，所以能直接在 node 里跑。玩家用几种不同的「脚本玩家」代替，
// 用来检查三件事：规则不会卡死、胜率不会一边倒、不同难度确实越玩越难。
//
// 用法：
//   node scripts/wolf-sim.mjs            # 每档 400 局
//   node scripts/wolf-sim.mjs 2000       # 每档 2000 局
import { createGame, nextEvent, submit, nightOptions, playerFindings } from '../js/wolf/engine.js';
import { alive, mulberry32 } from '../js/wolf/util.js';
import { WOLF_SIDE, ROLES } from '../js/wolf/data.js';

const N = Number(process.argv[2] || 400);

function playOne(diffKey, seed, style) {
  const G = createGame({ diff: diffKey, seed });
  const rnd = mulberry32(seed ^ 0x9e3779b9);
  let steps = 0;
  let lastTurn = null;
  for (;;) {
    if (++steps > 4000) throw new Error('事件太多，可能在死循环：' + diffKey + ' seed=' + seed);
    const e = nextEvent(G);
    if (!e) {
      if (!G.over) throw new Error('事件流断了但游戏没结束：' + diffKey + ' seed=' + seed + ' phase=' + G.phase);
      break;
    }
    if (e.t !== 'turn') { lastTurn = null; continue; }
    lastTurn = e;
    const others = alive(G).filter((p) => p.id !== 0);

    if (e.kind === 'start') { submit(G, { type: 'start' }); continue; }

    if (e.kind === 'talk') {
      const me = G.player;
      const findings = playerFindings(G);
      const r = rnd();
      if (findings.length && r < 0.55) {
        const f = findings[0];
        submit(G, { type: 'talk', kind: 'report', target: f.to, res: f.res });
      } else if (r < 0.68 && me.role && !G.claims[0]) {
        submit(G, { type: 'talk', kind: 'claim', role: me.role });
      } else if (r < 0.9 && others.length) {
        // 随机指认一个：模拟「瞎猜」的玩家
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
          // 狼玩家：投一个非同伴
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
      const target = o.list.length ? o.list[Math.floor(rnd() * o.list.length)] : null;
      submit(G, { type: 'night', target });
      continue;
    }

    if (e.kind === 'revive') {
      submit(G, { type: 'revive', yes: rnd() < 0.6 });
      continue;
    }

    throw new Error('没见过的回合类型：' + e.kind);
  }
  return { winner: G.winner, day: G.day, faction: G.player.faction || 'crew', role: G.player.role };
}

const STYLES = ['random', 'wolf'];
const rows = [];
for (const diff of ['easy', 'normal', 'hard', 'mad']) {
  const stat = { games: 0, win: 0, days: 0, byWinner: {}, roles: {} };
  for (let i = 0; i < N; i++) {
    const seed = (i * 2654435761 + diff.length * 97) >>> 0;
    const r = playOne(diff, seed, STYLES[i % STYLES.length]);
    stat.games++;
    stat.days += r.day;
    stat.byWinner[r.winner] = (stat.byWinner[r.winner] || 0) + 1;
    const faction = WOLF_SIDE.has(r.role) ? 'wolf' : (r.role === 'forgotten' ? 'forgotten' : 'crew');
    if (faction === r.winner) stat.win++;
    stat.roles[ROLES[r.role].zh] = (stat.roles[ROLES[r.role].zh] || 0) + 1;
  }
  const pct = (x) => (100 * x / stat.games).toFixed(1) + '%';
  rows.push({
    diff,
    玩家胜率: pct(stat.win),
    平均天数: (stat.days / stat.games).toFixed(2),
    清醒胜: pct(stat.byWinner.crew || 0),
    融蚀胜: pct(stat.byWinner.wolf || 0),
    忘却胜: pct(stat.byWinner.forgotten || 0),
  });
}
console.table(rows);
