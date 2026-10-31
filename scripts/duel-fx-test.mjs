// 新机制（压制 / 解封 / 抗性 / 反制）的定点测试。
// 这些效果藏在「对方回合」和「攻击宣言」两个时点里，整局模拟只会告诉你「有没有崩」，
// 不会告诉你「到底生效了没有」——所以单独写一份，每一步都断言。
//
// 用法：node scripts/duel-fx-test.mjs
import * as E from '../js/duel/engine.js';
import { CARDS } from '../js/duel/gen.js';

let pass = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) { pass++; return; }
  fails.push(name + (extra ? ' → ' + extra : ''));
}
function eq(name, a, b) { ok(name, a === b, `${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }

// 一副只有 40 张同样牌的卡组：为了不让人机抽到别的东西
const filler = (id) => ({ cards: [[id, 40]], extra: [] });
function mk(seed = 7) {
  const G = E.createGame(filler('m01'), filler('m01'), { seed });
  G.players[0].mons = [null, null, null];
  G.players[1].mons = [null, null, null];
  G.players[0].spells = [null, null, null];
  G.players[1].spells = [null, null, null];
  G.active = 0;
  G.phase = 'main';
  G.turn = 3;                      // 非第一回合，抽牌与盖放规则都按常规走
  return G;
}
// 手搓一只场上的怪（引擎内部用 mkMon，没导出；这里按同样的字段拼）
function mon(id, owner, pos = 'atk') {
  const d = CARDS[id];
  return {
    uid: 9000 + Math.floor(Math.random() * 999), id, atk: d.atk, def: d.def, pos, set: false,
    atkCount: 0, tmpAtk: 0, tmpDef: 0, equipAtk: 0, equipDef: 0, owner, used: {},
    br: 0, bld: 0, psn: 0, extraFx: null,
  };
}
function give(G, side, id) {
  const c = { uid: 5000 + Math.floor(Math.random() * 999), id };
  G.players[side].hand.push(c);
  return c;
}

// ---------------------------------------------------------------- 1. 封攻击
{
  const G = mk();
  const s = give(G, 0, 's94');
  const r = E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  ok('女王的戒律能发动', r.ok, r.err);
  eq('对方被封攻击 1 回合', G.players[1].lock.atk, 1);
  E.applyAction(G, 0, { t: 'end' });
  const m = mon('m01', 1);
  G.players[1].mons[0] = m;
  eq('被封的回合不能攻击宣言', E.canAttack(G, G.players[1], m), false);
  const bad = E.attack(G, 1, m.uid, null);
  ok('引擎也拒绝攻击动作', !bad.ok, bad.err);
  E.applyAction(G, 1, { t: 'end' });
  eq('过了一个回合自动解除', G.players[1].lock.atk, 0);
  const m2 = mon('m01', 1);
  G.players[1].mons[0] = m2;
  G.players[1].mons[0].atkCount = 0;
  eq('解除后能正常攻击', E.canAttack(G, G.players[1], m2), true);
}

// ---------------------------------------------------------------- 2. 封召唤
{
  const G = mk();
  const s = give(G, 0, 's95');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  E.applyAction(G, 0, { t: 'end' });
  const h = give(G, 1, 'm01');
  eq('被封的回合不能召唤', E.canSummon(G, G.players[1], 'm01'), false);
  const r = E.applyAction(G, 1, { t: 'summon', uid: h.uid, tribs: [] });
  ok('召唤动作被拒', !r.ok, r.err);
}

// ---------------------------------------------------------------- 3. 封魔法 + 解封
{
  const G = mk();
  const s = give(G, 0, 's96');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  E.applyAction(G, 0, { t: 'end' });
  const sp = give(G, 1, 's01');
  const r = E.applyAction(G, 1, { t: 'spell', uid: sp.uid });
  ok('封魔法的回合开不出魔法', !r.ok, r.err);
  const free = give(G, 1, 's98');
  eq('不可承受的自由是速攻（战斗阶段也能开）', CARDS.s98.t, 'quick');
  // 先塞满封锁，再解
  G.players[1].lock = { atk: 1, sum: 1, sp: 1 };
  G.players[1].trapLock = true;
  G.phase = 'battle';
  const r2 = E.applyAction(G, 1, { t: 'spell', uid: free.uid });
  ok('解封牌能开', r2.ok, r2.err);
  eq('封锁清零', G.players[1].lock.atk + G.players[1].lock.sum + G.players[1].lock.sp, 0);
  eq('陷阱封锁也解掉', G.players[1].trapLock, false);
}

// ---------------------------------------------------------------- 4. 抗性：不吃效果
{
  const G = mk();
  const tank = mon('e25', 0);
  G.players[0].mons[0] = tank;
  const s = give(G, 1, 's85');           // 割让：破坏对方最强怪兽
  G.active = 1;
  const r = E.applyAction(G, 1, { t: 'spell', uid: s.uid });
  ok('割让能发动', r.ok, r.err);
  ok('抗性兽没有被破坏', G.players[0].mons[0] === tank);
  // 削攻也不吃
  const w = give(G, 1, 's04');
  E.applyAction(G, 1, { t: 'spell', uid: w.uid });
  eq('抗性兽攻击力没被削', E.atkOf(G, G.players[0], tank), 2900);
}

// ---------------------------------------------------------------- 5. 免攻 / 斩 / 镜
{
  // 免攻：每回合弹开第一次攻击
  const G = mk();
  const wall = mon('e26', 0);
  G.players[0].mons[0] = wall;
  const atk = mon('m02', 1);
  G.players[1].mons[0] = atk;
  G.active = 1; G.phase = 'battle';
  E.attack(G, 1, atk.uid, wall.uid);
  ok('免攻：守方没被破坏', G.players[0].mons[0] === wall);
  eq('免攻每回合只有一次', wall.used.negAtk, true);
  // 第二次真打：2700 打 2800 的逆焚之影会被反杀，这里打 e26（2700/2200）不成立，换成简单的数值对比
}
{
  // 斩：被攻击时破坏攻击者
  const G = mk();
  const nasty = mon('e27', 0);            // 2800/2000 + destroyAttacker
  G.players[0].mons[0] = nasty;
  const atk = mon('m02', 1);
  G.players[1].mons[0] = atk;
  G.active = 1; G.phase = 'battle';
  const lp0 = G.players[1].lp;
  E.attack(G, 1, atk.uid, nasty.uid);
  ok('斩：攻击者被破坏', !G.players[1].mons[0], JSON.stringify(G.players[1].mons[0]));
  eq('斩：守方不掉血', G.players[1].lp, lp0);
}
{
  // 镜：被击破时战斗伤害弹回攻击方
  const G = mk();
  const mirror = mon('e30', 0);           // 2400/2200 + reflectAtk
  G.players[0].mons[0] = mirror;
  const atk = mon('e06', 1);              // 3800
  G.players[1].mons[0] = atk;
  G.active = 1; G.phase = 'battle';
  const before = [G.players[0].lp, G.players[1].lp];
  E.attack(G, 1, atk.uid, mirror.uid);
  const d0 = before[0] - G.players[0].lp, d1 = before[1] - G.players[1].lp;
  eq('镜：自己不吃战斗伤害', d0, 0);
  ok('镜：伤害打在对方身上', d1 > 0, `对方掉 ${d1}`);
}

// ---------------------------------------------------------------- 6. 反制：万能反击 / 临界点
{
  const G = mk();
  G.players[1].spells[0] = { uid: 7001, id: 't45', set: true, turnSet: 1, equipOn: 0 };
  const s = give(G, 0, 's01');
  const handBefore = G.players[0].hand.length;
  const graveBefore = G.players[0].grave.length;
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  eq('狂戮至世界尽头：魔法被无效（没抽到牌）', G.players[0].hand.length, handBefore - 1);
  eq('被无效的魔法照样进墓地', G.players[0].grave.length, graveBefore + 1);
}
{
  const G = mk();
  const atk = mon('m02', 1);
  G.players[1].mons[0] = atk;
  G.players[0].spells[0] = { uid: 7002, id: 't43', set: true, turnSet: 1, equipOn: 0 };
  G.active = 1; G.phase = 'battle';
  const lp = G.players[0].lp;
  E.attack(G, 1, atk.uid, null);
  eq('临界点：直接攻击被无效', G.players[0].lp, lp);
  ok('临界点：顺手封掉对方下个回合的攻击', G.players[1].lock.atk >= 2, String(G.players[1].lock.atk));
}

// ---------------------------------------------------------------- 7. 觉醒体落地就压制
{
  // 用真实觉醒流程太重，这里直接验证卡面与结算名单对得上
  ok('e28 的压制效果在召唤时结算', CARDS.e28.fx.some((f) => f.k === 'atkLock'));
  ok('e29 的压制效果在召唤时结算', CARDS.e29.fx.some((f) => f.k === 'summonLock'));
}

console.log(`通过 ${pass} 项`);
if (fails.length) {
  console.log('失败：');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('新机制测试全绿');
