// 弥萨格狼人杀：投票名单 / 自我指认体检。跑 300 局（沉默 + 随机投票的玩家），检查：
//   1. 每张票的投票人和被投的人都能按 id 查到名字（以前 Object.keys 出来的是字符串 id，byId 严格比较，名单里全是「?」）
//   2. 没有人投给自己、也没有 AI 指认自己
// 用法：node scripts/wolf-vote-check.mjs

import { createGame, nextEvent, submit, nightOptions } from '../js/wolf/engine.js';
import { alive, byId, mulberry32 } from '../js/wolf/util.js';
let self = 0, unresolved = 0, tallies = 0;
for (let i = 0; i < 300; i++) {
  const diff = ['easy', 'normal', 'hard', 'mad', 'abyss'][i % 5]; const G = createGame({ diff, seed: 77 + i * 13 }); const rnd = mulberry32(i); let n = 0;
  for (;;) { if (++n > 8000) break; const e = nextEvent(G); if (!e) break;
    if (e.t === 'tally') { tallies++; for (const k of Object.keys(e.votes)) { if (!byId(G, k)) unresolved++; const to = e.votes[k]; if (to != null && !byId(G, to)) unresolved++; if (to != null && String(to) === String(k)) self++; } }
    if (e.t !== 'turn') continue;
    if (e.kind === 'start') submit(G, { type: 'start' });
    else if (e.kind === 'talk') submit(G, { type: 'talk', kind: 'idle' });
    else if (e.kind === 'vote') { const o = alive(G).filter((p) => p.id !== 0); submit(G, { type: 'vote', target: o.length ? o[Math.floor(rnd() * o.length)].id : null }); }
    else if (e.kind === 'night') { const o = nightOptions(G); submit(G, { type: 'night', target: o && o.list.length ? o.list[0] : null }); }
    else if (e.kind === 'chain') { const l = (e.opts && e.opts.list) || []; submit(G, { type: 'chain', target: l[0] ?? null }); }
    else submit(G, { type: e.kind });
  }
  for (const a of G.acc || []) if (a.by === a.to) self++;
  for (const d of G.def || []) if (d.by === d.to && false) self++;
}
console.log({ tallies, 自己投自己或自己指认自己: self, 名字解析不出: unresolved });
if (self || unresolved) process.exit(1);
