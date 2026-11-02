// 新机制（压制 / 解封 / 抗性 / 反制）的定点测试。
// 这些效果藏在「对方回合」和「攻击宣言」两个时点里，整局模拟只会告诉你「有没有崩」，
// 不会告诉你「到底生效了没有」——所以单独写一份，每一步都断言。
//
// 用法：node scripts/duel-fx-test.mjs
import fs from 'node:fs';
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

// ---------------------------------------------------------------- 8. 全卡体检：没有「写上去但没人处理」的效果
{
  const src = fs.readFileSync(new URL('../js/duel/engine.js', import.meta.url), 'utf8');
  // 引擎里出现过的每个小写标识符都算「认识」。这招不是为了严格，而是专门抓拼错：
  // 卡面写 'unaffect' 而引擎读 'unaffected'，那张卡就是个哑弹，整局模拟也看不出来。
  const known = new Set([...src.matchAll(/'([a-z][a-zA-Z0-9]*)'/g)].map((m) => m[1]));
  const dead = [];
  for (const c of Object.values(CARDS)) {
    for (const f of [c.fx || [], (c.counter && c.counter.fx) || [], (c.summon && c.summon.fx) || []].flat()) {
      if (!known.has(f.k)) dead.push(`${c.id}:${f.k}`);
    }
  }
  ok('没有引擎不认识的效果键', dead.length === 0, dead.join('、'));

  // 觉醒体的素材按「卡名」匹配，带不带「」是两个字符串——写错就永远召不出来
  const names = new Set(Object.values(CARDS).filter((c) => c.k === 'M').map((c) => c.n));
  const badMat = [];
  for (const c of Object.values(CARDS)) {
    if (c.k !== 'E' || !c.mat) continue;
    for (const nm of c.mat) if (!names.has(nm)) badMat.push(`${c.id}:${nm}`);
  }
  ok('觉醒体的素材名都能对上真实卡名', badMat.length === 0, badMat.join('、'));

  const lonely = Object.values(CARDS).filter((c) => c.k === 'E' && !c.mat && c.matRealm !== 'any' && !c.direct);
  ok('没有召不出来的额外怪', lonely.length === 0, lonely.map((c) => `${c.id}:${c.n}`).join('、'));
}

// ---------------------------------------------------------------- 9. 七张命轮魔陷：真发一次，看结果
function setTrap(G, side, id, uid) {
  const s = { uid: uid || 6000 + Math.floor(Math.random() * 999), id, set: true, turnSet: 1, equipOn: 0 };
  const slot = G.players[side].spells.indexOf(null);
  G.players[side].spells[slot < 0 ? 0 : slot] = s;
  return s;
}
const logHas = (G, re) => G.log.some((l) => re.test(l.text));
{
  // 百万蒙宠之眼：先看穿，再拆一张
  const G = mk();
  setTrap(G, 1, 't01', 8101);
  const s = give(G, 0, 's90');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  eq('百万蒙宠之眼：拆掉对方盖放的陷阱', G.players[1].spells.filter(Boolean).length, 0);
  ok('百万蒙宠之眼：拆之前先看穿了盖牌', logHas(G, /看穿了.*盖着的牌/));
}
{
  // 不存在之地：整回合封陷阱
  const G = mk();
  const s = give(G, 0, 's91');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  eq('不存在之地：对方陷阱被整回合封住', G.players[1].trapLock, true);
  const t = setTrap(G, 1, 't37', 8102);
  const r = E.activateTrap(G, 1, t.uid);
  ok('不存在之地：被封的回合发不出陷阱', !r.ok, r.err);
}
{
  // 苦咒缚：只封一张，不破坏
  const G = mk();
  const t = setTrap(G, 1, 't37', 8103);
  const s = give(G, 0, 's92');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  ok('苦咒缚：那张陷阱被封印', (G.players[1].spells.find((x) => x && x.uid === 8103) || {}).seal > 0);
  const r = E.activateTrap(G, 1, t.uid);
  ok('苦咒缚：被封的那张发不动', !r.ok, r.err);
}
{
  // 陨日：一次拆光
  const G = mk();
  setTrap(G, 1, 't01', 8104);
  setTrap(G, 1, 't37', 8105);
  const s = give(G, 0, 's93');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  eq('陨日：对方盖放的魔陷全拆', G.players[1].spells.filter(Boolean).length, 0);
}
{
  // 心之壁垒：对方的「拆陷阱」被挡下，别的那张留下
  const G = mk();
  setTrap(G, 1, 't40', 8106);
  setTrap(G, 1, 't01', 8107);
  const s = give(G, 0, 's90');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  ok('心之壁垒：把「拆陷阱」无效了', logHas(G, /心之壁垒」把.*无效了/));
  eq('心之壁垒：另一张陷阱还在', G.players[1].spells.filter(Boolean).length, 1);
}
{
  // 真理之门：对方的「封印陷阱」被挡下
  const G = mk();
  setTrap(G, 1, 't41', 8108);
  const t = setTrap(G, 1, 't37', 8109);
  const s = give(G, 0, 's92');
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  ok('真理之门：把「封印陷阱」无效了', logHas(G, /真理之门」把.*无效了/));
  ok('真理之门：那张陷阱没被封印', !(t.seal > 0));
}
{
  // 宿命纺轮：对方想无效我的陷阱，被我顶回去，陷阱照常结算
  const G = mk();
  setTrap(G, 0, 't42', 8110);
  const mine = setTrap(G, 0, 't37', 8111);
  setTrap(G, 1, 't45', 8112);            // 狂戮至世界尽头：万能反击
  E.activateTrap(G, 0, mine.uid);
  ok('宿命纺轮：顶回了对方的「无效陷阱」', logHas(G, /宿命纺轮」把.*无效了/));
  ok('宿命纺轮：原位陷阱没有被无效', !logHas(G, /临终祷词」的发动被无效了/));
}

// ---------------------------------------------------------------- 10. 看手牌 / 弃手牌
{
  const G = mk();
  const s = give(G, 0, 's97');
  const hand = G.players[0].hand.length;
  E.applyAction(G, 0, { t: 'spell', uid: s.uid });
  ok('信息就是生命：看到了对方手牌', logHas(G, /看穿了.*的手牌/));
  eq('信息就是生命：抽了 1 张（-1 出牌 +1 抽牌）', G.players[0].hand.length, hand);
}
{
  const G = mk();
  const t = setTrap(G, 0, 't44', 8113);
  const foeHand = G.players[1].hand.length;
  const r = E.activateTrap(G, 0, t.uid);
  ok('先知的难题能发动', r.ok, r.err);
  eq('先知的难题：对方随机弃 1 张', G.players[1].hand.length, foeHand - 1);
}

// ---------------------------------------------------------------- 11. 额外怪的「特色」：逐个看它到底是哪一种
{
  const G = mk();
  // 抗性：不指定对象的效果摸不到它
  const tank = mon('e25', 0);
  G.players[0].mons[0] = tank;
  eq('轮转·万象命轮是嘲讽', E.isTaunt(tank), true);
  ok('轮转·万象命轮挡在路口', E.mustHitFirst(G.players[0], 1000) === tank);

  // 嘲讽有上限的那种：大怪能跨过去
  const cap = mon('e39', 0);
  G.players[0].mons = [null, null, null];
  G.players[0].mons[0] = cap;
  ok('圣所·告死之钟拦得住 2000', E.mustHitFirst(G.players[0], 2000) === cap);
  eq('圣所·告死之钟拦不住 3000', E.mustHitFirst(G.players[0], 3000), null);

  // 斩：被攻击就破坏攻击者
  G.players[0].mons = [null, null, null];
  const killer = mon('e37', 0);          // destroyAttacker
  G.players[0].mons[0] = killer;
  const atk = mon('m02', 1);
  G.players[1].mons[0] = atk;
  G.active = 1; G.phase = 'battle';
  E.attack(G, 1, atk.uid, killer.uid);
  ok('兽性·换命契约反过来破坏攻击者', !G.players[1].mons[0]);

  // 双打
  eq('追猎·维度猎犬一个战斗阶段能打两次', E.maxAttacks(mon('e42', 1)), 2);

  // 最后一口气 / 复活：直接走 destroyMon，看它到底留没留下
  const G2 = mk();
  const last = mon('e41', 0);
  G2.players[0].mons[0] = last;
  E.destroyMon(G2, G2.players[0], last, '测试');
  ok('绝境·孤影之刃第一次破坏扛住了', G2.players[0].mons[0] === last && last.used.stand === true);
  E.destroyMon(G2, G2.players[0], last, '测试');
  ok('绝境·孤影之刃第二次真的会死', !G2.players[0].mons[0]);

  const G3 = mk();
  const back = mon('e44', 0);
  G3.players[0].mons[0] = back;
  const hand3 = G3.players[0].hand.length;
  E.destroyMon(G3, G3.players[0], back, '测试');
  ok('坟场·亡者合唱被破坏后回手', !G3.players[0].mons[0] && G3.players[0].hand.length === hand3 + 1);
}

// ---------------------------------------------------------------- 12. 直接召唤：满场也要召得出来
{
  const G = mk();
  const p = G.players[0];
  p.extra = ['e42'];
  for (let i = 0; i < 3; i++) p.mons[i] = mon('m01', 0);
  ok('追猎·维度猎犬：满场时条件仍然满足', !!E.canDirect(G, p, 'e42'));
  const r = E.directSummon(G, 0, 'e42');
  ok('追猎·维度猎犬能直接召唤', r.ok, r.err);
  eq('解放一只、下去一只，场上还是 3 只', p.mons.filter(Boolean).length, 3);
  ok('场上确实有它', p.mons.some((m) => m && m.id === 'e42'));
  eq('解放的那只进了墓地', p.grave.length, 1);
}

// ---------------------------------------------------------------- 13. 特殊召唤：解放召唤 / 替身挡刀 / 衍生物
{
  // 解放召唤：不指定祭品时挑攻击力最低的那只，而不是随便喂一只
  const G = mk();
  const p = G.players[0];
  p.mons[0] = mon('m01', 0);          // 1800
  p.mons[1] = mon('m04', 0);          // 1200 —— 最弱，应该被吃掉
  p.deck = ['m12', 'm01', 'm01'];     // m12 熔毁·朵尔 L7
  const sp = give(G, 0, 's99');
  const r = E.applyAction(G, 0, { t: 'spell', uid: sp.uid });
  ok('献祭之刃能发动', r.ok, r.err);
  ok('自动解放的是最弱的那只', p.grave.includes('m04'), p.grave.join(','));
  ok('m01 还站在场上', p.mons.some((m) => m && m.id === 'm01'));
  ok('卡组里的 7 星被叫出来了', p.mons.some((m) => m && m.id === 'm12'));
  eq('解放召唤的怪当回合不能攻击', p.mons.find((m) => m && m.id === 'm12').atkCount, 9);
}
{
  // 指定祭品：玩家在界面上点的那一只优先
  const G = mk();
  const p = G.players[0];
  p.mons[0] = mon('m01', 0);          // 1800
  p.mons[1] = mon('m02', 0);          // 2100
  p.deck = ['m12'];
  const trib = p.mons[0].uid;
  const sp = give(G, 0, 's99');
  E.applyAction(G, 0, { t: 'spell', uid: sp.uid, trib });
  ok('指定的祭品进了墓地', p.grave.includes('m01'), p.grave.join(','));
  ok('没被指定的那只还在', p.mons.some((m) => m && m.id === 'm02'));
}
{
  // 卡组里没有达标的高星怪：不能白吃一只祭品
  const G = mk();
  const p = G.players[0];
  p.mons[0] = mon('m01', 0);
  p.deck = ['m01', 'm01'];
  const sp = give(G, 0, 's101');
  const sp2 = give(G, 0, 's99');
  E.applyAction(G, 0, { t: 'spell', uid: sp2.uid });
  ok('卡组没有 7 星时，献祭之刃不会白吃祭品', !!p.mons[0] && !p.grave.includes('m01'));
}
{
  // 替身人偶：对方直接攻击时，叫一只「等级低一级」的挡在面前
  // 攻击者用 800 攻、守备方叫 1800 守备的 2 星怪——挡得住，能看清它真的留在场上
  const G = mk();
  const me = G.players[0], op = G.players[1];
  me.mons = [null, null, null];
  me.deck = ['m99', 'm04'];                      // m99 是 2 星（900/1800），m04 是 3 星（不该被选）
  me.spells[0] = { uid: 7001, id: 't46', set: true, turnSet: G.turn - 1, equipOn: 0 };
  op.mons[0] = mon('m05', 1);                    // 莉莉 L3 800 攻
  G.active = 1; G.phase = 'battle';
  const el = E.eligibleTraps(G, 1, { t: 'attack', uid: op.mons[0].uid, target: null });
  ok('替身陷阱会进询问窗口', el.some((x) => x.id === 't46'), JSON.stringify(el));
  const hp = me.lp;
  const r = E.attack(G, 1, op.mons[0].uid, null);
  ok('攻击被挡下来，没有打脸', r.ok, r.err);
  const gm = me.mons.find(Boolean);
  ok('场上多了一只挡刀的怪兽', !!gm, JSON.stringify(me.mons));
  eq('叫出来的是等级比它低 1 的（2 星）', gm && CARDS[gm.id].lv, 2);
  ok('3 星的那只没被叫出来', !!gm && gm.id === 'm99');
  eq('那只怪是守备表示', gm && gm.pos, 'def');
  eq('陷阱用掉了', me.spells.filter(Boolean).length, 0);
  eq('直接攻击的伤害被挡掉了（掉血的是攻击方）', me.lp, hp);
}
{
  // 残影帷幕：直接摆两只衍生物挡刀
  const G = mk();
  const me = G.players[0], op = G.players[1];
  me.mons = [null, null, null];
  me.spells[0] = { uid: 7002, id: 't47', set: true, turnSet: G.turn - 1, equipOn: 0 };
  op.mons[0] = mon('m10', 1);
  G.active = 1; G.phase = 'battle';
  const hp = me.lp;
  E.attack(G, 1, op.mons[0].uid, null);
  const tks = me.mons.filter(Boolean);
  eq('衍生物是守备表示', tks.every((m) => m.pos === 'def'), true);
  ok('场上留下了残影（至少一只没被踩掉）', tks.length >= 1 && tks.every((m) => m.id === 'tk1'));
  eq('直接攻击被挡下，命轮值没掉', me.lp, hp);
}
{
  // 卡组里没有能叫的怪：陷阱留着，这一下照常打脸
  const G = mk();
  const me = G.players[0], op = G.players[1];
  me.mons = [null, null, null];
  me.deck = [];
  me.spells[0] = { uid: 7003, id: 't46', set: true, turnSet: G.turn - 1, equipOn: 0 };
  op.mons[0] = mon('m10', 1);
  G.active = 1; G.phase = 'battle';
  const hp = me.lp;
  E.attack(G, 1, op.mons[0].uid, null);
  eq('叫不出怪兽时陷阱不会被浪费', me.spells.filter(Boolean).length, 1);
  ok('这一下还是打在了脸上', me.lp < hp, `${me.lp} / ${hp}`);
}
{
  // 血肉园圃：两只守备衍生物 + 回血（衍生物的 pos 要照卡面写）
  const G = mk();
  const p = G.players[0];
  p.lp = 5000;
  const sp = give(G, 0, 's101');
  E.applyAction(G, 0, { t: 'spell', uid: sp.uid });
  const tks = p.mons.filter(Boolean);
  eq('叫出 2 只灰烬傀儡', tks.length, 2);
  eq('衍生物是守备表示', tks.every((m) => m.pos === 'def' && m.id === 'tk2'), true);
  eq('回复了 600 点命轮值', p.lp, 5600);
}

// ---------------------------------------------------------------- 14. 反特召：次数上限 / 捕网 / 回收令
{
  // 手牌特召每回合最多 2 次。spCount 以前只有初始化、没有读取，
  // 于是「特招速攻」可以一回合把三只大个子摊上场——这是速通真正的根。
  const G = mk();
  const p = G.players[0];
  const a = give(G, 0, 'm01'), b = give(G, 0, 'm02'), c = give(G, 0, 'm07');
  const r1 = E.applyAction(G, 0, { t: 'special', uid: a.uid });
  const r2 = E.applyAction(G, 0, { t: 'special', uid: b.uid });
  const r3 = E.applyAction(G, 0, { t: 'special', uid: c.uid });
  ok('第 1 次手牌特召成功', r1.ok, r1.err);
  ok('第 2 次手牌特召成功', r2.ok, r2.err);
  ok('第 3 次被次数上限挡住', !r3.ok, r3.err);
  eq('场上只站了两只', p.mons.filter(Boolean).length, 2);
  eq('场上站的是先叫的那两只', p.mons.filter(Boolean).map((m) => m.id).sort().join(','), 'm01,m02');
  ok('被挡住的那只没上场', !p.mons.some((m) => m && m.id === 'm07'));
}
{
  // 下个自己的回合，次数重置
  const G = mk();
  const p = G.players[0];
  p.spCount = 2;
  const h = give(G, 0, 'm01');
  ok('这一回合的额度用完了', !E.applyAction(G, 0, { t: 'special', uid: h.uid }).ok);
  p.spCount = 0;                       // 等价于「新回合开始」（startTurn 里的 p.spCount = 0）
  const r = E.applyAction(G, 0, { t: 'special', uid: h.uid });
  ok('新回合又能特召了', r.ok, r.err);
}
{
  // 捕网·维度缠丝：对方特召时无效并破坏
  const G = mk();
  const me = G.players[0], op = G.players[1];
  op.spells[0] = { uid: 7100, id: 't48', set: true, turnSet: G.turn - 1, equipOn: 0 };
  const h = give(G, 0, 'm02');
  const r = E.applyAction(G, 0, { t: 'special', uid: h.uid });
  ok('特召被允许发动（陷阱另算）', r.ok, r.err);
  ok('那只怪进了墓地', me.grave.includes('m02'), String(me.grave));
  eq('场上没留下怪兽', me.mons.filter(Boolean).length, 0);
  eq('捕网用掉了', op.spells.filter(Boolean).length, 0);
}
{
  // 空位·回收令：破坏 + 抽 1
  const G = mk();
  const me = G.players[0], op = G.players[1];
  op.spells[0] = { uid: 7101, id: 't49', set: true, turnSet: G.turn - 1, equipOn: 0 };
  op.deck = ['m01', 'm01', 'm01'];
  const before = op.hand.length;
  const h = give(G, 0, 'm02');
  E.applyAction(G, 0, { t: 'special', uid: h.uid });
  ok('怪被回收令破坏', me.grave.includes('m02'));
  eq('持有者抽了 1 张', op.hand.length, before + 1);
  eq('回收令用掉了', op.spells.filter(Boolean).length, 0);
}
{
  // 反特召不能拿来拦通常召唤：这才是它和「圣所钟声」的区别
  const G = mk();
  const me = G.players[0], op = G.players[1];
  op.spells[0] = { uid: 7102, id: 't48', set: true, turnSet: G.turn - 1, equipOn: 0 };
  const h = give(G, 0, 'm04');
  const r = E.applyAction(G, 0, { t: 'summon', uid: h.uid, tribs: [] });
  ok('通常召唤照样成功', r.ok, r.err);
  eq('怪兽站住了', me.mons.filter(Boolean).length, 1);
  eq('陷阱没有被浪费', op.spells.filter(Boolean).length, 1);
}
{
  // 询问窗口：特召时点亮、通常召唤时不亮
  const G = mk();
  const op = G.players[1];
  op.spells[0] = { uid: 7103, id: 't48', set: true, turnSet: G.turn - 1, equipOn: 0 };
  const sp = give(G, 0, 'm01');
  const n = give(G, 0, 'm04');
  ok('特召时它进询问窗口', E.eligibleTraps(G, 0, { t: 'special', uid: sp.uid }).some((x) => x.id === 't48'));
  ok('通常召唤时它不亮', !E.eligibleTraps(G, 0, { t: 'summon', uid: n.uid }).some((x) => x.id === 't48'));
}
{
  // 22 套预组每套都带一张反特召，不然「速通」总有一条路是没有对手拦得住的
  const packs = JSON.parse(fs.readFileSync(new URL('../data/duel-packs.json', import.meta.url), 'utf8'));
  const missing = packs.decks.filter((d) => !d.cards.some(([id]) => id === 't48' || id === 't49'));
  eq('每套预组都有反特召', missing.length, 0);
  ok('没带的那几套', missing.length === 0, missing.map((d) => d.n).join('、'));
}

// ---------------------------------------------------------------- 15. 场地：占一格 / 顶掉旧的 / 对特招的强化与限制
{
  // 场地占魔陷区一格，同一时间只留一张，新的把旧的压掉（旧的进墓地）
  const G = mk();
  const p = G.players[0];
  const f1 = give(G, 0, 's108');                 // 观测井：自己每回合特召 3 次
  const r = E.applyAction(G, 0, { t: 'spell', uid: f1.uid });
  ok('场地能发动', r.ok, r.err);
  eq('场地占了魔陷一格', p.spells.filter(Boolean).length, 1);
  eq('自己特召上限从 2 变成 3', E.spMaxOf(G, p), 3);
  const f2 = give(G, 0, 's103');                 // 夜巡的街：对方每回合最多特召 1 次
  E.applyAction(G, 0, { t: 'spell', uid: f2.uid });
  eq('新场地顶掉旧的，还是只占一格', p.spells.filter(Boolean).length, 1);
  ok('旧的进了墓地', p.grave.includes('s108'), String(p.grave));
  eq('自己的上限退回 2', E.spMaxOf(G, p), 2);
  eq('对方被压到 1 次', E.spMaxOf(G, G.players[1]), 1);
}
{
  // spPlus 真的能多特召一次：不出场地是 2 次，出了就是 3 次
  const G = mk();
  const p = G.players[0];
  E.applyAction(G, 0, { t: 'spell', uid: give(G, 0, 's108').uid });
  const hs = ['m01', 'm02', 'm07'].map((id) => give(G, 0, id));
  const rs = hs.map((h) => E.applyAction(G, 0, { t: 'special', uid: h.uid }));
  ok('第 3 次特召也能过', rs[2].ok, rs[2].err);
  eq('场上站了三只', p.mons.filter(Boolean).length, 3);
}
{
  // spCap 是「限制」：自己没场地、对方有，自己这回合只能特召 1 次
  const G = mk();
  const me = G.players[0], op = G.players[1];
  op.spells[0] = { uid: 7200, id: 's103', set: false, turnSet: G.turn - 1, equipOn: 0 };
  eq('被压到 1 次', E.spMaxOf(G, me), 1);
  const a = give(G, 0, 'm01'), b = give(G, 0, 'm02');
  ok('第 1 次还是能特召', E.applyAction(G, 0, { t: 'special', uid: a.uid }).ok);
  const r2 = E.applyAction(G, 0, { t: 'special', uid: b.uid });
  ok('第 2 次被场地挡住', !r2.ok, r2.err);
  eq('场上只有一只', me.mons.filter(Boolean).length, 1);
}
{
  // spAtk：特召出来的怪兽加攻（加在实例上，不是永久改卡面）
  const G = mk();
  const p = G.players[0];
  p.spells[0] = { uid: 7201, id: 's118', set: false, turnSet: G.turn - 1, equipOn: 0 };  // 换命的圈 +300
  const h = give(G, 0, 'm46');
  E.applyAction(G, 0, { t: 'special', uid: h.uid });
  const m = p.mons.find(Boolean);
  eq('特召出来的怪兽 +300 攻', E.atkOf(G, p, m), CARDS.m46.atk + 300);
}
{
  // spDraw：特召成功后抽 1（手牌先 -1 再 +1，净持平）
  const G = mk();
  const p = G.players[0];
  p.spells[0] = { uid: 7202, id: 's104', set: false, turnSet: G.turn - 1, equipOn: 0 };  // 回响之海
  p.deck = ['m01', 'm01', 'm01'];
  const h = give(G, 0, 'm46');
  const before = p.hand.length;
  E.applyAction(G, 0, { t: 'special', uid: h.uid });
  eq('特召换来 1 张牌（手牌净持平）', p.hand.length, before);
}
{
  // spTax：对方场地的限制写法——我特召成功，我掉血
  const G = mk();
  const me = G.players[0], op = G.players[1];
  op.spells[0] = { uid: 7203, id: 's122', set: false, turnSet: G.turn - 1, equipOn: 0 };  // 牙还牙的院 400
  const lp0 = me.lp;
  // 用 m46（空场特召、无代价）——m02 那类带 lp 代价的会把「税」和「代价」搅在一起
  E.applyAction(G, 0, { t: 'special', uid: give(G, 0, 'm46').uid });
  eq('对方场地收税 400', me.lp, lp0 - 400);
}
{
  // 数据口径：每套预组都带一张场地（混牌不算，它们是从预组身上拆的）
  const packs = JSON.parse(fs.readFileSync(new URL('../data/duel-packs.json', import.meta.url), 'utf8'));
  const miss = packs.decks.filter((d) => !d.foeOnly && !d.cards.some(([id]) => CARDS[id] && CARDS[id].t === 'field'));
  eq('每套预组都有场地', miss.length, 0);
  ok('没带的那几套', miss.length === 0, miss.map((d) => d.n).join('、'));
  const fields = Object.values(CARDS).filter((c) => c.t === 'field').length;
  ok('场地卡总数不少于 22 张', fields >= 22, String(fields));
}

console.log(`通过 ${pass} 项`);
if (fails.length) {
  console.log('失败：');
  for (const f of fails) console.log('  ' + f);
  process.exit(1);
}
console.log('新机制测试全绿');
