// 唤醒王：决斗链接 · 引擎抗压测试（fuzz）。
// 和 duel-sim.mjs 的区别：那边走的是 AI 的「合法动作」，这里故意乱按——
// 不存在的 uid、空的 tribs、已经不在场上的怪、付不起的代价、重复觉醒、
// 对手回合出牌……凡是界面/好友房能拼出来的动作都往引擎里塞一遍，看它是不是
// 每一项都老老实实回 ok:false，而不是抛异常或者把状态改坏。
// 用法：node scripts/duel-fuzz.mjs [局数，默认 300]
import * as E from '../js/duel/engine.js';
import { CARDS, DECKS } from '../js/duel/gen.js';

const GAMES = Number(process.argv[2] || 300);
const total = (G) => G.players.reduce((n, p) => n + p.deck.length + p.hand.length + p.grave.length
  + p.mons.filter(Boolean).length + p.spells.filter(Boolean).length + p.extra.length, 0);

const problems = new Map();
const note = (k) => problems.set(k, (problems.get(k) || 0) + 1);

// 可复现的伪随机
let sd = 20261031;
const rnd = () => ((sd = (sd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pickOne = (arr) => arr[Math.floor(rnd() * arr.length)];
const int = (n) => Math.floor(rnd() * n);

// 从全卡池里随机拼一副 40 张（同名 ≤3），额外随机 0~4 张（不吃素材限制，故意炸）
const monsters = Object.keys(CARDS).filter((id) => CARDS[id].k === 'M' && !CARDS[id].token);
const spells = Object.keys(CARDS).filter((id) => CARDS[id].k === 'S' || CARDS[id].k === 'T');
const extras = Object.keys(CARDS).filter((id) => CARDS[id].k === 'E');

function randomDeck() {
  const bag = new Map();
  let n = 0, guard = 0;
  while (n < 40 && guard++ < 4000) {
    const id = rnd() < 0.55 ? pickOne(monsters) : pickOne(spells);
    if ((bag.get(id) || 0) >= 3) continue;
    bag.set(id, (bag.get(id) || 0) + 1); n++;
  }
  const extra = [];
  for (let i = 0, k = int(5); i < k; i++) extra.push(pickOne(extras));
  return { cards: [...bag.entries()], extra };
}

// 乱按：每次都在「看起来像动作」的动作里随机挑一个，参数故意错乱
function chaosAction(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  const alive = p.mons.filter(Boolean);
  const oAlive = o.mons.filter(Boolean);
  const junkUid = 90000 + int(50);          // 根本不存在的怪兽
  // 一半用手牌里真有的那张，一半用不存在的 uid —— 两条路径都要走到
  const U = () => (rnd() < 0.5 ? (handUid(p) ?? junkUid) : junkUid);
  return [
    () => ({ t: 'summon', uid: U(), tribs: [] }),
    () => ({ t: 'summon', uid: U(), tribs: [junkUid, junkUid] }),
    () => ({ t: 'setMon', uid: U() }),
    () => ({ t: 'spell', uid: U() }),
    () => ({ t: 'trap', uid: U() }),
    () => ({ t: 'pos', uid: alive.length ? pickOne(alive).uid : junkUid }),
    () => ({ t: 'battle' }),
    () => ({ t: 'attack', uid: alive.length ? pickOne(alive).uid : junkUid,
      target: oAlive.length && rnd() < 0.8 ? pickOne(oAlive).uid : junkUid }),
    () => ({ t: 'awaken', id: p.extra.length ? pickOne(p.extra) : pickOne(extras) }),
    () => ({ t: 'direct', id: p.extra.length ? pickOne(p.extra) : pickOne(extras) }),
    () => ({ t: pickOne(['summon', 'setMon', 'spell', 'trap', 'pos', 'attack', 'awaken', 'direct']) }),  // 缺参数
    () => ({ t: '不存在的动作' }),
    () => ({ t: 'end' }),
  ];
}
// 手牌在引擎里是 {uid, id} 还是 id 数组？两条都兜住，取不到就让参数错乱（正是要测的）
function handUid(p) {
  const c = p.hand[int(Math.max(1, p.hand.length))];
  if (!c) return undefined;
  return typeof c === 'object' ? (c.uid != null ? c.uid : c.id) : c;
}

let games = 0;
for (let gi = 0; gi < GAMES; gi++) {
  const A = randomDeck(), B = randomDeck();
  let G;
  try { G = E.createGame({ cards: A.cards, extra: A.extra }, { cards: B.cards, extra: B.extra }, { seed: (4001 + gi * 7919) >>> 0 }); }
  catch (e) { note('createGame 抛错 ' + e.message); continue; }
  games++;
  const t0 = total(G);
  for (let step = 0; step < 900 && !G.over; step++) {
    const side = rnd() < 0.78 ? G.active : 1 - G.active;   // 偶尔在对手回合动手（真实场景：乱点/延迟包）
    const mk = pickOne(chaosAction(G, side));
    // 一半用「手牌里真的那张」，一半用不存在的 uid，确保两类路径都跑到
    const a = mk();
    let r;
    try { r = E.applyAction(G, side, a); }
    catch (e) { note(`applyAction 抛错 ${a.t}: ${e.message}`); break; }
    if (r && r.ok === undefined) note('返回值没有 ok 字段 ' + a.t);
    if (r && r.ok === false && !(r.err || r.msg)) note('拒绝时没给原因 ' + a.t);
    // 状态不变量
    for (const p of G.players) {
      if (!Number.isFinite(p.lp)) note('LP 非有限');
      if (p.lp > p.lpMax) note(`LP 超过上限 ${p.lp} > ${p.lpMax}`);
      if (p.lp < 0 && !G.over) note('LP 为负但没结束');
      if (p.hand.length > E.HAND_MAX + 1) note('手牌超过上限 ' + p.hand.length);
      if (p.mons.length !== 3) note('怪兽区格子数异常 ' + p.mons.length);
      if (p.spells.length !== 3) note('魔陷区格子数异常 ' + p.spells.length);
      if (p.mons.filter(Boolean).length > 3) note('怪兽超过 3 只');
      if (p.spells.filter(Boolean).length > 3) note('魔陷超过 3 张');
      if (p.mons.some((m) => m && (m.pos === 'def') && m.set && CARDS[m.id] && CARDS[m.id].lv >= 5)) note('5 星以上被里侧盖放');
    }
    const tok = G.players.reduce((n, p) => n + p.mons.filter((m) => m && CARDS[m.id] && CARDS[m.id].token).length, 0);
    const t1 = total(G) - tok;
    if (t1 !== t0) { note(`卡牌总数变了 ${t0} → ${t1}`); break; }
  }
  // 收尾：强行结束回合若干次，看回合流转本身会不会卡死
  for (let i = 0; i < 6 && !G.over; i++) {
    try { E.applyAction(G, G.active, { t: 'end' }); } catch (e) { note('endTurn 抛错 ' + e.message); break; }
  }
}

console.log(`抗压测试 ${games} 局（随机牌表 + 随机动作）`);
console.log('问题:', [...problems.entries()].sort((x, y) => y[1] - x[1]).slice(0, 15));
if (problems.size) process.exitCode = 1; else console.log('没有异常');
