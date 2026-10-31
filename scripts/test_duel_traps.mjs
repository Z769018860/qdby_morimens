// 陷阱主动发动：非应对型陷阱以前没有任何时点会触发它们（抽牌 / 回复 / 弹手牌 / 削攻 / 永续）。
// 用法：node scripts/test_duel_traps.mjs
import * as E from '../js/duel/engine.js';
import { CARDS, DECKS } from '../js/duel/gen.js';
let bad = 0;
const check = (name, ok, extra) => { if (!ok) { bad++; console.log('✗', name, extra || ''); } else console.log('✓', name); };
const mk = (id, turn) => ({ uid: 9000 + Math.floor(Math.random() * 1e6), id, set: true, turnSet: turn, equipOn: 0 });
const fresh = () => { const G = E.createGame(DECKS[0], DECKS[1], { seed: 42 }); return G; };

const traps = Object.values(CARDS).filter((c) => c.k === 'T');
const free = [], reactive = [];
for (const c of traps) {
  const G = fresh(); const me = G.players[0];
  me.spells[0] = mk(c.id, 0);
  G.turn = 5;
  const why = E.trapManualBlock(G, 0, me.spells[0]);
  (why ? reactive : free).push(c.id);
}
console.log('主动型', free.length, '张：', free.join(','), '\n应对型', reactive.length, '张');
check('主动型陷阱至少 10 张', free.length >= 10);
for (const id of free) {
  const G = fresh(); const me = G.players[0]; const o = G.players[1];
  me.spells[0] = mk(id, 0); G.turn = 5; me.lp = 3000; o.lp = 8000;
  for (let i = 0; i < 3; i++) o.hand.length < 4 && E.handAdd(G, o, DECKS[0].cards[0][0]);
  const r = E.applyAction(G, 0, { t: 'activateTrap', uid: me.spells[0].uid });
  check(`${id} ${CARDS[id].n} 能发动`, r.ok, r.err);
  const cont = CARDS[id].t === 'cont';
  const s = me.spells[0];
  check(`${id} 发动后${cont ? '留在场上翻开' : '进墓地'}`, cont ? (s && !s.set) : (!s || me.grave.includes(id)));
}
// 盖放的这一回合不能发动；对方回合可以
{
  const G = fresh(); const me = G.players[0];
  me.spells[0] = mk('t04', G.turn);
  check('盖放那一回合不能发动', !E.applyAction(G, 0, { t: 'activateTrap', uid: me.spells[0].uid }).ok);
  G.turn += 1; G.active = 1;
  check('对方回合（下一回合起）可以发动', E.applyAction(G, 0, { t: 'activateTrap', uid: me.spells[0].uid }).ok);
}
{
  const G = fresh(); const me = G.players[0]; me.spells[0] = mk('t03', 0); G.turn = 5;
  check('应对型陷阱不能主动发动', !E.applyAction(G, 0, { t: 'activateTrap', uid: me.spells[0].uid }).ok);
}
console.log(bad ? `\n${bad} 项失败` : '\n全部通过 ✓');
process.exit(bad ? 1 : 0);
