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
// ---- 反制陷阱 / 反制反制 ----
{
  const setup = () => { const G = fresh(); G.turn = 5; G.active = 0; G.phase = 'main'; return G; };
  // 窥陷之眼：破坏对方盖着的一张
  let G = setup(); let a = G.players[0], b = G.players[1]; a.hand = []; E.handAdd(G, a, 's90');
  b.spells[0] = mk('t03', 0);
  check('窥陷之眼：破坏对方盖放的陷阱', E.applyAction(G, 0, { t: 'spell', uid: a.hand[0].uid }).ok && !b.spells[0] && b.grave.includes('t03'));
  // 对方盖了「破坏之盾」：窥陷之眼的破坏被无效
  G = setup(); a = G.players[0]; b = G.players[1]; a.hand = []; E.handAdd(G, a, 's90');
  b.spells[0] = mk('t03', 0); b.spells[1] = mk('t40', 0);
  E.applyAction(G, 0, { t: 'spell', uid: a.hand[0].uid });
  check('护符把「破坏盖放陷阱」顶回去：缄默之壁还在', !!b.spells.find((s) => s && s.id === 't03') && b.grave.includes('t40'));
  // 断线：对方这个回合发不了陷阱
  G = setup(); a = G.players[0]; b = G.players[1]; a.hand = []; E.handAdd(G, a, 's91');
  b.spells[0] = mk('t03', 0);
  E.applyAction(G, 0, { t: 'spell', uid: a.hand[0].uid });
  check('断线之后对方没有可响应的陷阱', E.eligibleTraps(G, 0, { t: 'attack', uid: 1, target: null }).length === 0 && !!b.trapLock);
  const lpb = b.lp;
  a.mons[0] = { uid: 821, id: 'm01', pos: 'atk', set: false, atkCount: 0, atk: 1800 }; G.phase = 'battle';
  E.applyAction(G, 0, { t: 'attack', uid: 821, target: null });
  check('断线：缄默之壁没发动，直接攻击照常命中', b.lp < lpb && !b.grave.includes('t03'));
  check('断线只管这一个回合', (E.endTurn(G), !b.trapLock));
  // 反制反制：对方的无效陷阱把我的主动陷阱顶掉，我的护符再顶回去
  G = setup(); a = G.players[0]; b = G.players[1];
  a.spells[0] = mk('t04', 0); a.spells[1] = mk('t42', 0); b.spells[0] = mk('t19', 0);
  const h0 = a.hand.length;
  E.applyAction(G, 0, { t: 'activateTrap', uid: a.spells[0].uid });
  check('反制反制：顶回之环顶回了对方的「无效陷阱」，逆流之忆照常抽牌', a.grave.includes('t42') && b.grave.includes('t19') && a.hand.length > h0, `hand ${h0}→${a.hand.length}`);
  G = setup(); a = G.players[0]; b = G.players[1];
  a.spells[0] = mk('t04', 0); b.spells[0] = mk('t19', 0);
  const h1 = a.hand.length;
  E.applyAction(G, 0, { t: 'activateTrap', uid: a.spells[0].uid });
  check('没有护符：被对方的「无效陷阱」顶掉，什么也没抽', a.hand.length === h1 && b.grave.includes('t19'));
  // 询问窗口：对方发动魔法「窥陷之眼」时，护符持有者能收到询问
  G = setup(); a = G.players[0]; b = G.players[1]; a.hand = []; E.handAdd(G, a, 's90');
  b.spells[0] = mk('t40', 0);
  check('窥陷之眼会触发「破坏之盾」的询问', E.eligibleTraps(G, 0, { t: 'spell', uid: a.hand[0].uid }).length === 1);
}
// ---- 三种护符各管一种 / 暂时与永久破坏 / 怪兽的反制与抗性 ----
{
  const setup = () => { const G = fresh(); G.turn = 5; G.active = 0; G.phase = 'main'; return G; };
  const cast = (G, id) => { const a = G.players[0]; a.hand = []; E.handAdd(G, a, id); return E.applyAction(G, 0, { t: 'spell', uid: a.hand[0].uid }); };
  const monOf = (id, uid) => ({ uid, id, pos: 'atk', set: false, atkCount: 0, atk: CARDS[id].atk, def: CARDS[id].def });
  // 缄默咒：暂时封印，不破坏，过了就恢复
  let G = setup(); let a = G.players[0], b = G.players[1];
  b.spells[0] = mk('t03', 0);
  cast(G, 's92');
  check('缄默咒：陷阱还在，但被封印', b.spells[0] && b.spells[0].seal > 0);
  check('被封印的陷阱不会响应攻击', E.eligibleTraps(G, 0, { t: 'attack', uid: 1, target: null }).length === 0);
  E.endTurn(G); E.endTurn(G);
  check('过了两个回合封印解除（没有被破坏）', b.spells[0] && !(b.spells[0].seal > 0));
  // 清陷令：永久破坏全部，付命轮值
  G = setup(); a = G.players[0]; b = G.players[1]; b.spells[0] = mk('t03', 0); b.spells[1] = mk('t04', 0);
  const lp0 = a.lp; cast(G, 's93');
  check('清陷令：对方盖放的全部进墓地、付了命轮值', b.spells.every((s) => !s) && b.grave.includes('t03') && b.grave.includes('t04') && a.lp === lp0 - 1500);
  // 破坏之盾 / 封锁之匙：各管各的
  G = setup(); a = G.players[0]; b = G.players[1]; b.spells[0] = mk('t03', 0); b.spells[1] = mk('t41', 0); cast(G, 's90');
  check('封锁之匙挡不住「拆」：窥陷之眼照样破坏', !b.spells.find((s) => s && s.id === 't03'));
  G = setup(); a = G.players[0]; b = G.players[1]; b.spells[0] = mk('t03', 0); b.spells[1] = mk('t40', 0); cast(G, 's92');
  check('破坏之盾挡不住「封印」：缄默咒照样生效', b.spells[0] && b.spells[0].seal > 0 && !b.grave.includes('t40'));
  G = setup(); a = G.players[0]; b = G.players[1]; b.spells[0] = mk('t03', 0); b.spells[1] = mk('t41', 0); cast(G, 's92');
  check('封锁之匙：缄默咒被无效', !(b.spells[0].seal > 0) && b.grave.includes('t41'));
  G = setup(); a = G.players[0]; b = G.players[1]; b.spells[0] = mk('t03', 0); b.spells[1] = mk('t40', 0);
  check('窥陷之眼询问「破坏之盾」，缄默咒不会', E.eligibleTraps(G, 0, (a.hand = [], E.handAdd(G, a, 's90'), { t: 'spell', uid: a.hand[0].uid })).length === 1
    && E.eligibleTraps(G, 0, (a.hand = [], E.handAdd(G, a, 's92'), { t: 'spell', uid: a.hand[0].uid })).every((x) => x.id !== 't40'));
  // 怪兽：泰旖丝封印、沙耶拆除、温柯尔守陷、艾尔瓦无视陷阱、奥吉尔·反咒无效一张
  const summonMon = (G, id) => { const a = G.players[0]; a.hand = []; E.handAdd(G, a, id); a.normalUsed = false; return E.applyAction(G, 0, { t: 'summon', uid: a.hand[0].uid, tribs: [] }); };
  G = setup(); b = G.players[1]; b.spells[0] = mk('t04', 0); summonMon(G, 'm218');
  check('泰旖丝·封印：召唤时暂时封印一张', b.spells[0] && b.spells[0].seal > 0);
  G = setup(); b = G.players[1]; b.spells[0] = mk('t04', 0); G.players[0].hand = []; E.handAdd(G, G.players[0], 'm219'); G.players[0].mons = [monOf('m01', 900), monOf('m02', 901), null];
  const r5 = E.applyAction(G, 0, { t: 'summon', uid: G.players[0].hand[0].uid, tribs: [900] });
  check('沙耶·拆陷：召唤时永久破坏一张', r5.ok && !b.spells[0] && b.grave.includes('t04'), r5.err);
  G = setup(); b = G.players[1]; b.spells[0] = mk('t04', 0); b.mons[0] = monOf('m220', 902); cast(G, 's92');
  check('温柯尔·守陷在场：缄默咒不能封印', b.spells[0] && !(b.spells[0].seal > 0));
  G = setup(); b = G.players[1]; b.spells[0] = mk('t04', 0); b.mons[0] = monOf('m220', 902); cast(G, 's90');
  check('温柯尔·守陷在场：窥陷之眼不能破坏', !!b.spells[0] && b.spells[0].id === 't04');
  G = setup(); a = G.players[0]; b = G.players[1]; a.mons[0] = monOf('m221', 903); G.phase = 'battle'; b.spells[0] = mk('t03', 0);
  const lpb = b.lp; E.applyAction(G, 0, { t: 'attack', uid: 903, target: null });
  check('艾尔瓦·无陷：攻击时对方陷阱不能发动', b.lp < lpb && !b.grave.includes('t03'));
  G = setup(); a = G.players[0]; b = G.players[1]; a.mons[0] = monOf('m223', 904); a.mons[1] = monOf('m01', 905); G.phase = 'battle'; b.spells[0] = mk('t03', 0);
  const lpb2 = b.lp; E.applyAction(G, 0, { t: 'attack', uid: 905, target: null });
  check('奥吉尔·反咒：对方的陷阱被无效、攻击命中，并记下「本场已用」', b.lp < lpb2 && b.grave.includes('t03') && G.negUsed && G.negUsed[0] === true);
  b.spells[0] = mk('t03', 0); G.players[0].mons[1].atkCount = 0;
  const lpb3 = b.lp; E.applyAction(G, 0, { t: 'attack', uid: 905, target: null });
  check('第二次（本场限一次）：陷阱照常发动，攻击被无效', b.lp === lpb3);
}
// ---- 预组里都带了反制 / 抗性设计 ----
{
  const COUNTER_FX = ['trapSeal', 'snipe', 'snipeAttack', 'snipeAll', 'reveal', 'trapLock', 'trapWard', 'trapImmune', 'negateTrapOnce', 'shieldSnipe', 'shieldLock', 'shieldNegate'];
  for (const d of DECKS) {
    const n = d.cards.reduce((s, [id, k]) => s + ((CARDS[id].fx || []).some((f) => COUNTER_FX.includes(f.k)) ? k : 0), 0);
    check(`${d.id} ${d.n} 带反制 / 抗性牌 ≥ 4 张`, n >= 4, n);
  }
  const mons = Object.values(CARDS).filter((c) => c.k === 'M' && (c.fx || []).some((f) => ['trapWard', 'trapImmune', 'negateTrapOnce', 'trapSeal'].includes(f.k)));
  check('原有怪兽里有一批带了抗性 / 反制', mons.length >= 15, mons.length);
}
// ---- 卡面文字必须和实际数据一致（以前出过：兽性·换命契约写「索蕾尔」、实际要「血链·希洛」；万象命轮写不受陷阱影响却被陷阱破坏）----
{
  const strip = (s) => String(s).replace(/^「|」$/g, '');
  const bad = [];
  for (const c of Object.values(CARDS).filter((x) => x.k === 'E' && x.mat && x.mat.length === 2)) {
    const m = String(c.text).match(/^「([^」]+)」＋「([^」]+)」/);
    if (m && JSON.stringify([m[1], m[2]].map(strip)) !== JSON.stringify(c.mat.map(strip))) bad.push(`${c.n}：写 ${m[1]}＋${m[2]}，实际 ${c.mat.join('＋')}`);
  }
  check('额外卡组的素材：卡面文字 = 实际素材', bad.length === 0, bad.join('；'));
  // 文字写「贯穿」的怪兽必须真有 pierce
  const noPierce = Object.values(CARDS).filter((c) => /贯穿/.test(c.text || '') && c.k === 'M' && !(c.fx || []).some((f) => f.k === 'pierce'));
  check('写「贯穿」的怪兽都有 pierce', noPierce.length === 0, noPierce.map((c) => c.n).join('、'));
}
// ---- 「不受对方魔法·陷阱效果影响」：陷阱的破坏 / 削攻击对它无效，也不弹询问 ----
{
  const e25 = Object.values(CARDS).find((c) => c.n === '轮转·万象命轮'), t = Object.values(CARDS).find((c) => c.n === '融蚀之槛');
  const G = fresh(); const a = G.players[0], b = G.players[1];
  G.turn = 5; G.active = 0; G.phase = 'battle';
  a.mons[0] = { uid: 951, id: e25.id, pos: 'atk', set: false, atkCount: 0, atk: e25.atk, def: e25.def };
  b.spells[0] = mk(t.id, 0);
  const el = E.eligibleTraps(G, 0, { t: 'attack', uid: 951, target: null });
  const ent = el.find((x) => x.id === t.id);
  check('万象命轮攻击时，「融蚀之槛」仍在询问里，但标成「无法选中」（只能取消）', !!ent && !!ent.blocked, JSON.stringify(el));
  G.trapPolicy = { 1: new Set([ent.uid]) };       // 就算硬把它选进策略，也不会真的生效
  const lpb = b.lp;
  const r = E.applyAction(G, 0, { t: 'attack', uid: 951, target: null });
  check('万象命轮没有被「融蚀之槛」破坏，攻击照常命中', r.ok && a.mons[0] && a.mons[0].id === e25.id && b.lp < lpb, JSON.stringify([r.ok, !!a.mons[0], b.lp, lpb]));
  // 普通怪兽照旧会被破坏
  const G2 = fresh(); const a2 = G2.players[0], b2 = G2.players[1];
  G2.turn = 5; G2.active = 0; G2.phase = 'battle';
  const plain = Object.values(CARDS).find((c) => c.k === 'M' && !(c.fx || []).some((f) => f.k === 'unaffected'));
  a2.mons[0] = { uid: 952, id: plain.id, pos: 'atk', set: false, atkCount: 0, atk: plain.atk, def: plain.def };
  b2.spells[0] = mk(t.id, 0);
  E.applyAction(G2, 0, { t: 'attack', uid: 952, target: null });
  check('普通怪兽撞上「融蚀之槛」仍然被破坏', !a2.mons[0] || a2.mons[0].id !== plain.id);
}

// ---- 破坏 / 弹回 / 弱化怪兽的魔陷：可以发动，但「不受魔法·陷阱影响」的怪兽选不中；一只能选的都没有就只能取消 ----
{
  const e25 = Object.values(CARDS).find((c) => c.n === '轮转·万象命轮');
  const spell = Object.values(CARDS).find((c) => c.k === 'S' && (c.fx || []).some((f) => f.k === 'destroyStrongest'));
  const plain = Object.values(CARDS).find((c) => c.k === 'M' && !(c.fx || []).some((f) => f.k === 'unaffected') && c.atk <= 1500);
  const setup2 = () => { const G = fresh(); G.turn = 5; G.active = 0; G.phase = 'main'; return G; };
  const mon = (id, uid) => ({ uid, id, pos: 'atk', set: false, atkCount: 0, atk: CARDS[id].atk, def: CARDS[id].def });
  // 1) 对方只有不受影响的怪兽：这张魔法发不动（目标选不中，只能取消）
  let G = setup2(); const me = G.players[0], foe = G.players[1];
  foe.mons[0] = mon(e25.id, 961); me.hand = []; E.handAdd(G, me, spell.id);
  let r = E.applyAction(G, 0, { t: 'spell', uid: me.hand[0].uid });
  check(`「${spell.n}」遇到只有不受影响的怪兽：发动被拦下，卡还在手上`, !r.ok && /选不中|目标/.test(r.err || '') && me.hand.length === 1, JSON.stringify(r));
  check('那只不受影响的怪兽毫发无伤', foe.mons[0] && foe.mons[0].id === e25.id);
  // 2) 对方还有别的能选的怪兽：魔法照常发动，破坏的是能选中的那只（以前会因为最强的那只免疫而整张空发）
  G = setup2(); const me2 = G.players[0], foe2 = G.players[1];
  foe2.mons[0] = mon(e25.id, 962); foe2.mons[1] = mon(plain.id, 963); me2.hand = []; E.handAdd(G, me2, spell.id);
  r = E.applyAction(G, 0, { t: 'spell', uid: me2.hand[0].uid });
  check('还有能选中的怪兽：魔法正常发动并破坏它', r.ok && !foe2.mons[1] && foe2.mons[0] && foe2.mons[0].id === e25.id, JSON.stringify(r));
  // 3) 对方一只怪兽都没有：和以前一样可以发动
  G = setup2(); const me3 = G.players[0]; me3.hand = []; E.handAdd(G, me3, spell.id);
  r = E.applyAction(G, 0, { t: 'spell', uid: me3.hand[0].uid });
  check('对方没有怪兽：照旧可以发动（空发）', r.ok, JSON.stringify(r));
}
console.log(bad ? `\n${bad} 项失败` : '\n全部通过 ✓');
process.exit(bad ? 1 : 0);
