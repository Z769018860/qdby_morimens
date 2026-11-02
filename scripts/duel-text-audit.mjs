// 决斗链接：卡面文字里写的「限制 / 约束」逐类实测——文字写了，引擎就得真的做到。
// 以前出过：衍生物写着「不能作为觉醒素材」却能当素材；「不受陷阱影响」的怪被陷阱破坏；素材名写错。
// 用法：node scripts/duel-text-audit.mjs
import * as E from '../js/duel/engine.js';
import { CARDS, DECKS } from '../js/duel/gen.js';
let bad = 0, n = 0;
const check = (name, ok, extra) => { n++; if (!ok) { bad++; console.log('✗', name, extra || ''); } };
const fresh = () => { const G = E.createGame(DECKS[0], DECKS[1], { seed: 7 }); G.turn = 5; G.active = 0; G.phase = 'main'; return G; };
const mon = (id, uid, pos = 'atk') => ({ uid, id, pos, set: false, atkCount: 0, atk: CARDS[id].atk || 0, def: CARDS[id].def || 0, used: {} });
const byName = (nm) => Object.values(CARDS).find((c) => c.n === nm);
const all = Object.values(CARDS);

// 1. 衍生物：不能作为觉醒素材（任意界域 / 指定名字两种觉醒都不行）；不能通常召唤
{
  const tk = all.filter((c) => c.token);
  check('有衍生物', tk.length >= 2);
  const anyE = all.find((c) => c.k === 'E' && c.matRealm === 'any');
  const realmOther = all.find((c) => c.k === 'M' && !c.token && c.r !== tk[0].r);
  for (const t of tk) {
    const G = fresh(); const p = G.players[0];
    p.extra = [anyE.id]; p.hand = [];
    p.mons[0] = mon(t.id, 801); p.mons[1] = mon(realmOther.id, 802);
    check(`「${t.n}」+ 一只别的界域怪兽：不能当「${anyE.n}」的觉醒素材`, !E.canAwaken(G, p, anyE.id), t.text);
    check(`「${t.n}」不能通常召唤`, !E.canSummon(G, p, t.id));
  }
}
// 2. 守备守护 / 嘲讽 / 嘲讽上限 / 只拦一次
{
  for (const c of all.filter((x) => x.k === 'M' && (x.fx || []).some((f) => f.k === 'guard') && !(x.fx || []).some((f) => f.k === 'taunt'))) {
    const G = fresh(); const p = G.players[0];
    p.mons[0] = mon(c.id, 811, 'def');
    check(`「${c.n}」守备表示时必须优先攻击它`, E.mustHitFirst(p, 3000) && E.mustHitFirst(p, 3000).uid === 811);
    p.mons[0].pos = 'atk';
    check(`「${c.n}」攻击表示时不拦路`, !E.mustHitFirst(p, 3000));
  }
  for (const c of all.filter((x) => (x.fx || []).some((f) => f.k === 'tauntMax'))) {
    const cap = c.fx.find((f) => f.k === 'tauntMax').v, G = fresh(), p = G.players[0];
    p.mons[0] = mon(c.id, 821);
    check(`「${c.n}」拦 ≤${cap} 的怪兽，更大的跨过去`, E.mustHitFirst(p, cap) && !E.mustHitFirst(p, cap + 1));
  }
  for (const c of all.filter((x) => (x.fx || []).some((f) => f.k === 'taunt') && (x.fx || []).some((f) => f.k === 'tauntOnce'))) {
    const G = fresh(), p = G.players[0]; p.mons[0] = mon(c.id, 831);
    check(`「${c.n}」每回合只拦一次`, !!E.mustHitFirst(p, 9999) && (p.mons[0].used.taunt = true, !E.mustHitFirst(p, 9999)));
  }
}
// 3. 「当回合不能攻击」：直接召唤 / 夺取
{
  for (const c of all.filter((x) => x.k === 'E' && x.direct && /当回合不能攻击/.test(x.text))) {
    const G = fresh(); const p = G.players[0];
    p.extra = [c.id]; p.lp = c.direct.cond === 'lpHalf' ? 2000 : 3000; p.grave = [...all.filter((x) => x.k === 'S').slice(0, 4).map((x) => x.id), ...all.filter((x) => x.k === 'M' && !x.token).slice(0, 4).map((x) => x.id)]; p.mons[0] = mon(all.find((x) => x.k === 'M' && !x.token).id, 841); p.mons[1] = mon(all.find((x) => x.k === 'M' && !x.token && x.id !== p.mons[0].id).id, 842); if (c.direct.cond === 'mons3') p.mons[2] = mon(p.mons[0].id, 843);   // 场上留一个空位，除非条件本身就是「3 只」
    const r = E.directSummon(G, 0, c.id);
    const m = p.mons.find((x) => x && x.id === c.id);
    check(`「${c.n}」直接召唤成功`, r.ok && !!m, r.err);
    if (m) check(`「${c.n}」直接召唤的当回合不能攻击`, !E.canAttack(G, p, m));
  }
}
// 4. 不死类：lastStand「第一次不会被战斗破坏」；revive「被破坏时回手牌，每场一次」
{
  for (const c of all.filter((x) => x.k !== 'S' && x.k !== 'T' && (x.fx || []).some((f) => f.k === 'lastStand') && !(x.fx || []).some((f) => f.k === 'destroyAttacker') && /每场决斗限 1 次|第一次/.test(x.text))) {   // 带「破坏攻击者」的第二次攻击者已经没了，没法测
    const G = fresh(); const p = G.players[0], o = G.players[1];
    p.mons[0] = mon(c.id, 851); o.mons[0] = { ...mon(all.find((x) => x.k === 'M' && x.atk >= 2600 && !(x.fx || []).some((f) => ['pierce'].includes(f.k))).id, 852), atk: (c.atk || 0) + 600 };   // 刚好压过它，伤害不会把命轮值打空
    G.active = 1; G.phase = 'battle';
    E.applyAction(G, 1, { t: 'attack', uid: 852, target: 851 });
    check(`「${c.n}」第一次被战斗破坏时没有被破坏`, p.mons[0] && p.mons[0].id === c.id);
    if (o.mons[0]) o.mons[0].atkCount = 0;
    E.applyAction(G, 1, { t: 'attack', uid: 852, target: 851 });
    check(`「${c.n}」第二次就会被破坏（每场限一次）`, !p.mons[0] || p.mons[0].id !== c.id);
  }
}
// 5. 封印 / 封锁
{
  const seal = byName('苦咒缚'), lock = byName('不存在之地'), trap = all.find((x) => x.k === 'T' && (x.fx || []).some((f) => f.k === 'negateAttack'));
  const G = fresh(); const me = G.players[0], foe = G.players[1];
  foe.spells[0] = { uid: 861, id: trap.id, set: true, turnSet: 0, equipOn: 0 };
  me.hand = []; E.handAdd(G, me, seal.id);
  const r = E.applyAction(G, 0, { t: 'spell', uid: me.hand[0].uid });
  check('苦咒缚能发动', r.ok, r.err);
  check('被封印的陷阱：这个回合不能发动，也不弹询问', !E.eligibleTraps(G, 0, { t: 'attack', uid: 1, target: null }).some((x) => x.uid === 861));
  check('被封印的陷阱没有被破坏', !!foe.spells[0] && foe.spells[0].id === trap.id);
  const G2 = fresh(); const me2 = G2.players[0], foe2 = G2.players[1];
  foe2.spells[0] = { uid: 862, id: trap.id, set: true, turnSet: 0, equipOn: 0 };
  me2.hand = []; E.handAdd(G2, me2, lock.id);
  const r2 = E.applyAction(G2, 0, { t: 'spell', uid: me2.hand[0].uid });
  check('不存在之地能发动', r2.ok, r2.err);
  check('不存在之地：对方的盖放陷阱不能发动', E.eligibleTraps(G2, 0, { t: 'attack', uid: 1, target: null }).filter((x) => !x.blocked).length === 0 || foe2.trapLock === true);
}
// 6. 「此卡攻击宣言时，对方的陷阱不能发动（无视陷阱的攻击）」：询问里不该出现任何陷阱
{
  const trap = all.find((x) => x.k === 'T' && (x.fx || []).some((f) => f.k === 'negateAttack'));
  for (const c of all.filter((x) => x.k !== 'S' && x.k !== 'T' && (x.fx || []).some((f) => f.k === 'trapImmune'))) {
    const G = fresh(); const a = G.players[0], b = G.players[1];
    G.phase = 'battle'; a.mons[0] = mon(c.id, 871); b.spells[0] = { uid: 872, id: trap.id, set: true, turnSet: 0, equipOn: 0 };
    check(`「${c.n}」攻击时，对方的陷阱不会被询问（不能发动）`, E.eligibleTraps(G, 0, { t: 'attack', uid: 871, target: null }).length === 0);
    const lp0 = b.lp; E.applyAction(G, 0, { t: 'attack', uid: 871, target: null });
    check(`「${c.n}」的攻击没被陷阱挡掉`, b.lp < lp0);
  }
}
// 7. 下个回合的封锁：不能攻击 / 不能召唤 / 不能发动魔法
{
  const cases = [['女王的戒律', 'atk'], ['被囚禁的疯狂', 'sum'], ['无声欢宴', 'sp']];
  for (const [nm, key] of cases) {
    const c = byName(nm); if (!c) { check(`找不到 ${nm}`, false); continue; }
    const G = fresh(); const me = G.players[0], foe = G.players[1]; me.hand = []; E.handAdd(G, me, c.id);
    const r = E.applyAction(G, 0, { t: 'spell', uid: me.hand[0].uid });
    check(`${nm} 能发动`, r.ok, r.err);
    check(`${nm}：对方 lock.${key} 生效`, foe.lock && foe.lock[key] > 0, JSON.stringify(foe.lock));
  }
}
// 8. 衍生物「离场即消失」：被破坏 / 被战斗打死都不进墓地（不然墓地条件的卡能拿它凑数）
{
  const tk = all.find((c) => c.token), foeBig = all.find((x) => x.k === 'M' && !x.token && x.atk >= 2600);
  const G = fresh(); const p = G.players[0], o = G.players[1];
  p.mons[0] = mon(tk.id, 881, 'def'); o.mons[0] = { ...mon(foeBig.id, 882), atk: 3000 };
  G.active = 1; G.phase = 'battle'; const g0 = p.grave.length;
  E.applyAction(G, 1, { t: 'attack', uid: 882, target: 881 });
  check(`「${tk.n}」被打死之后消失，不进墓地`, !p.mons[0] && p.grave.length === g0 && !p.grave.includes(tk.id), JSON.stringify(p.grave.slice(-3)));
}
// 9. 数字一致：卡面写的拦截上限 / 代价和数据里的值对得上
{
  for (const c of all) {
    const t = c.text || '';
    const tm = (c.fx || []).find((f) => f.k === 'tauntMax');
    if (tm) { const m = t.match(/攻击力\s*(\d+)\s*以下/); check(`「${c.n}」嘲讽上限：卡面 ${m && m[1]} = 数据 ${tm.v}`, !!m && Number(m[1]) === tm.v); }
    if (c.cost && c.cost.lp) { const m = t.match(/献出\s*(\d+)\s*点命轮值/); check(`「${c.n}」代价：卡面 ${m && m[1]} = 数据 ${c.cost.lp}`, !!m && Number(m[1]) === c.cost.lp); }
    if (c.direct && c.direct.lp) { const m = t.match(/献出\s*(\d+)\s*点命轮值/); check(`「${c.n}」直接召唤代价：卡面 ${m && m[1]} = 数据 ${c.direct.lp}`, !!m && Number(m[1]) === c.direct.lp); }
    const dst = (c.fx || []).find((f) => f.k === 'destroySummon');
    if (dst && dst.v) { const m = t.match(/攻击力(?:不高于)?\s*(\d+)\s*(?:以下)?/); check(`「${c.n}」破坏召唤的上限：卡面 ${m && m[1]} = 数据 ${dst.v}`, !!m && Number(m[1]) === dst.v); }
  }
}
console.log(`\n共 ${n} 项检查，${bad ? bad + ' 项失败' : '全部通过 ✓'}`);
process.exit(bad ? 1 : 0);
