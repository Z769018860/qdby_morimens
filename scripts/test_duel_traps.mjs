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
// ---- 觉醒素材必须在场上；手牌的特殊召唤不占通常召唤 ----
{
  const e = Object.values(CARDS).find((c) => c.k === 'E' && c.mat && c.mat.length === 2);
  const [n1, n2] = e.mat;
  const idOf = (n) => Object.values(CARDS).find((c) => c.k === 'M' && c.n === n).id;
  const G = fresh(); const p = G.players[0]; G.turn = 1; G.active = 0; G.phase = 'main';
  p.extra = [e.id]; p.hand = [];
  E.handAdd(G, p, idOf(n1)); E.handAdd(G, p, idOf(n2));
  check('素材都在手牌：不能觉醒', !E.canAwaken(G, p, e.id));
  p.mons[0] = { uid: 801, id: idOf(n1), pos: 'atk', set: false, atkCount: 0 };
  check('一只在场上、一只在手牌：仍不能觉醒', !E.canAwaken(G, p, e.id));
  p.mons[1] = { uid: 802, id: idOf(n2), pos: 'atk', set: false, atkCount: 0 };
  check('两只都在场上：能觉醒', !!E.canAwaken(G, p, e.id));
  check('觉醒不占通常召唤', (E.awaken(G, 0, e.id), p.normalUsed === false));
}
{
  const mons = Object.values(CARDS).filter((c) => c.k === 'M' && c.sp);
  check('素材角色都有特殊召唤方式', mons.length >= 30, mons.length);
  const empty = mons.find((c) => c.sp.cond === 'emptyField');
  const G = fresh(); const p = G.players[0]; G.turn = 1; G.active = 0; G.phase = 'main'; p.hand = [];
  E.handAdd(G, p, empty.id);
  const uid = p.hand[0].uid;
  check('场上没怪时能特殊召唤', !!E.canSpecial(G, p, uid));
  const r = E.applyAction(G, 0, { t: 'special', uid });
  check('特殊召唤成功且不占通常召唤', r.ok && p.mons.some((m) => m && m.id === empty.id) && p.normalUsed === false, r.err);
  p.hand = []; E.handAdd(G, p, empty.id);
  check('场上有怪时「场上没怪」条件不满足', !E.canSpecial(G, p, p.hand[0].uid));
  const lpc = mons.find((c) => c.sp.cond === 'lp');
  const G2 = fresh(); const q = G2.players[0]; G2.turn = 1; G2.active = 0; G2.phase = 'main'; q.hand = [];
  E.handAdd(G2, q, lpc.id); const lp0 = q.lp;
  check('献命轮值特召', E.applyAction(G2, 0, { t: 'special', uid: q.hand[0].uid }).ok && q.lp === lp0 - lpc.sp.v);
}
// ---- 陷阱询问：policy 为空集就不发动，不设 policy 才自动发动 ----
{
  const atk = (policy) => {
    const G = fresh(); const a = G.players[0], d = G.players[1]; G.turn = 5; G.active = 0; G.phase = 'battle';
    a.mons[0] = { uid: 811, id: Object.values(CARDS).find((c) => c.k === 'M').id, pos: 'atk', set: false, atkCount: 0, atk: 1500 };
    d.spells[0] = mk('t03', 0);
    const el = E.eligibleTraps(G, 0, { t: 'attack', uid: 811, target: null });
    if (policy) G.trapPolicy = { 1: new Set(policy === 'none' ? [] : el.map((x) => x.uid)) };
    const lp = d.lp; E.applyAction(G, 0, { t: 'attack', uid: 811, target: null });
    return { el: el.length, lost: lp - d.lp, grave: d.grave.includes('t03') };
  };
  const auto = atk(null), none = atk('none'), all = atk('all');
  check('直接攻击会列出可响应的陷阱', auto.el === 1);
  check('不设 policy：自动发动（攻击被无效）', auto.grave && auto.lost === 0);
  check('policy 为空：不发动，吃下伤害', !none.grave && none.lost > 0, JSON.stringify(none));
  check('policy 选中：发动', all.grave && all.lost === 0);
}
console.log(bad ? `\n${bad} 项失败` : '\n全部通过 ✓');
process.exit(bad ? 1 : 0);
