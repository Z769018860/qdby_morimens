// 《忘却前夜 · 唤醒王：决斗链接》规则引擎。
//
// 这一层不碰 DOM：所有操作都是 (状态, 参数) → 改状态 + 往 G.log 追加日志，
// 返回 { ok, err }。网页（view.js）和 AI（ai.js）都只是调用它，
// 所以同一套规则可以被人和机器共用，也方便在 node 里无头跑自测。
import { CARDS, BONDS } from './gen.js';

export const LP_MAX = 8000;
export const ZONES = 3;
export const HAND_MAX = 7;
// 界域色是「按名字对色」的：血肉红、深海蓝、混沌黄、超维紫，无界中性灰。
// 记反过一次（混沌原来给的是红、超维是金），卡面边框和筛选按钮都会跟着错。
export const REALM = {
  chaos: { n: '混沌', en: 'CHAOS', c: '#e3b341' },
  caro: { n: '血肉', en: 'CARO', c: '#e05c5c' },
  aqua: { n: '深海', en: 'AQUOR', c: '#5b9bd5' },
  ultra: { n: '超维', en: 'ULTRA', c: '#a07cff' },
  any: { n: '无界', en: 'NONE', c: '#8a93a8' },
};

// 怪兽卡里「召唤成功时」才结算的效果；其余（贯穿、守备、光环……）是静态的，
// 只要在场就一直生效，不在召唤时执行。
const SUMMON_FX = new Set([
  'draw', 'burn', 'heal', 'discardOpp', 'recall', 'search', 'bounce',
  'snipe', 'trapSeal', 'reveal', 'weaken', 'pumpSelf', 'costLp', 'destroyStrongest', 'bothDraw',
  // 沙耶：墓地怪兽数量 × 回复，只有她在怪兽上用了这条（以前 graveHeal 只做过魔法卡）
  'graveHeal',
  // 中毒 / 流血 / 屏障：登场时给对方挂状态（bp07 起大量使用）。
  // barrierMon 不在这里——mkMon 建怪时已经把层数算进 mon.br，再走一次会变双倍。
  'poison', 'bleed', 'barrier', 'poisonMon',
  // 召唤机制：登场即叫一只衍生物（衍生物自己没 fx，不会套娃）
  'token',
  // 压制：觉醒体落地就封住对方的下个回合（缄口·无声王座 / 闭门·永夜门扉）
  'atkLock', 'summonLock', 'spellLock',
]);

// 压制的三条路，文案集中在这里：改一处，日志和界面提示一起变。
const LOCK_TXT = { atk: '不能进行攻击宣言', sum: '不能召唤·特殊召唤怪兽', sp: '不能发动魔法卡' };

const ok = () => ({ ok: true });
const fail = (msg) => ({ ok: false, err: msg });

function fx(card) { return (card && card.fx) || []; }
function pname(p) { return p.idx === 0 ? '你' : '对手'; }
function realmOf(id) { const d = CARDS[id]; return d ? d.r : 'any'; }

// 线性同余不够随机（同种子下开手牌会重复得太明显），用 mulberry32：
// 同样的种子能复现同一局，调试时省事。
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(G, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(G.rng() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// 把一张牌放进手牌；手牌满了就挤进墓地（和抽牌爆手牌同一条规则），而不是凭空消失。
// 以前检索 / 弹回 / 复活这几处写的是「手牌没满才 push」，满了牌就直接丢了：
// 对手的「潮汐逆转」把你的怪兽弹回满手牌，那只怪兽连墓地都没进，整副牌少一张。
export function handAdd(G, p, id, why) {
  if (p.hand.length < HAND_MAX) { p.hand.push({ uid: G.uid++, id }); return true; }
  p.grave.push(id);
  log(G, `${pname(p)}手牌已满，「${CARDS[id].n}」被挤进墓地${why ? `（${why}）` : ''}`, 'info');
  return false;
}

export function log(G, text, kind) {
  // seq 是给界面用的：日志只留最近 120 条，按下标比对会错位，
  // 用自增序号才能准确知道「这一帧新出现了哪几条」。
  G.logSeq = (G.logSeq || 0) + 1;
  G.log.push({ text, kind: kind || 'info', turn: G.turn, seq: G.logSeq });
  if (G.log.length > 120) G.log.shift();
}

// ------------------------------------------------------------------ 建局
function mkPlayer(G, idx, def) {
  const p = {
    idx, lp: LP_MAX, lpMax: LP_MAX,
    deck: [], hand: [], mons: [null, null, null], spells: [null, null, null],
    grave: [], extra: [], bonds: [], normalUsed: false, normalExtra: 0,
    // 额外卡组的「直接召唤」每回合只能用一次（见 canDirect / directSummon）
    directUsed: false,
    // 手牌的特殊召唤（怪兽卡的 sp 条件）本回合已经用了几次：不占通常召唤，但每回合最多 2 次
    spCount: 0,
    // 中毒层数 / 屏障次数：挂在玩家身上的两种状态，回合开始与受伤时结算
    psn: 0, br: 0,
    // 「捕网·维度缠丝」这类：本回合剩下的特殊召唤被掐掉（只管特召，不管通常召唤）。
    // 单独一个字段而不是复用 lock.sum，是因为它们要表达的封锁范围不一样：
    // 「被囚禁的疯狂」封的是召唤+特召，「捕网」只管特召。
    spLock: 0,
    // 压制：对方用「女王的戒律」这类牌封住的下个回合，key 是 atk / sum / sp。
    // 数字是「还要封几个回合」，每次自己的回合结束减 1，所以封一下正好停一回合。
    lock: { atk: 0, sum: 0, sp: 0 },
  };
  for (const pair of def.cards || []) {
    for (let i = 0; i < pair[1]; i++) p.deck.push(pair[0]);
  }
  shuffle(G, p.deck);
  p.extra = (def.extra || []).slice();
  // 预组的平衡偏移（命轮值 ±N）：强的预组略少、弱的略多，模拟器按胜率调出来的
  if (def.lp) { p.lp += def.lp; p.lpMax += def.lp; }
  p.startHand = def.hand || 0;      // 起手张数偏移（同上：模拟器调出来的平衡项）
  return p;
}

// 羁绊判定：只看主卡组（额外卡组的觉醒体不算「卡组里有这个人」，
// 否则玩家把素材全塞额外就能白拿羁绊）。
export function evalBonds(deckCardIds) {
  const names = new Set();
  const ids = new Set(deckCardIds);
  const realms = new Set();
  for (const id of deckCardIds) {
    const d = CARDS[id];
    if (!d) continue;
    if (d.k === 'M' && d.n) names.add(d.n);
    if (d.r && d.r !== 'any') realms.add(d.r);
  }
  return BONDS.filter((b) => {
    if (b.need) return b.need.every((n) => names.has(n));
    if (b.cond === 'realms4') return realms.size >= 4;
    if (b.cond && b.cond.indexOf('hasCard:') === 0) return ids.has(b.cond.slice(8));
    return false;
  });
}

function bondNum(p, k) {
  let v = 0;
  for (const b of p.bonds) for (const f of b.fx || []) if (f.k === k && f.v) v += f.v;
  return v;
}

export function createGame(userDeck, aiDeck, opts) {
  const o = opts || {};
  const G = {
    turn: 0, active: 1, phase: 'main', over: false, winner: -1,
    uid: 1, rng: makeRng((o.seed || Date.now()) >>> 0), log: [], players: [],
    stats: { turns: 0, damage: [0, 0] },
  };
  G.players.push(mkPlayer(G, 0, userDeck));
  G.players.push(mkPlayer(G, 1, aiDeck));
  if (o.aiLp) { G.players[1].lp = o.aiLp; G.players[1].lpMax = o.aiLp; }

  for (const p of G.players) {
    p.bonds = evalBonds(p.deck.slice());
    for (const b of p.bonds) log(G, `${pname(p)}触发羁绊「${b.n}」`, 'bond');
  }

  // 起手 5 张
  for (const p of G.players) drawCards(G, p, 5 + (p.startHand || 0), true);

  // 羁绊的开局效果：加血 / 抽牌 / 检索陷阱
  for (const p of G.players) {
    for (const b of p.bonds) {
      for (const f of b.fx || []) {
        if (f.k === 'lp') { p.lp += f.v; p.lpMax += f.v; log(G, `${pname(p)}的羁绊让命轮值上限 +${f.v}`, 'bond'); }
        if (f.k === 'draw') drawCards(G, p, f.v);
        if (f.k === 'searchTrap') {
          const i = p.deck.findIndex((id) => CARDS[id] && CARDS[id].k === 'T');
          if (i >= 0) {
            const id = p.deck.splice(i, 1)[0];
            p.hand.push({ uid: G.uid++, id });
            log(G, `${pname(p)}用羁绊把「${CARDS[id].n}」放进了手牌`, 'bond');
          }
        }
      }
    }
  }

  G.turn = 1;
  G.active = 0;
  beginTurn(G);
  return G;
}

// ------------------------------------------------------------------ 抽牌
export function drawCards(G, p, n, silent) {
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) {
      p.lp -= 1000;
      log(G, `${pname(p)}的卡组已空，命轮反噬 1000`, 'damage');
      checkOver(G);
      continue;
    }
    const id = p.deck.pop();
    if (p.hand.length >= HAND_MAX) {
      p.grave.push(id);
      log(G, `${pname(p)}手牌已满，「${CARDS[id].n}」被挤进墓地`, 'info');
    } else {
      p.hand.push({ uid: G.uid++, id });
      if (!silent) log(G, `${pname(p)}抽了 1 张牌`, 'draw');
    }
  }
}

function heal(G, p, v) {
  const add = v + bondNum(p, 'healBonus');
  p.lp = Math.min(p.lpMax, p.lp + add);
  log(G, `${pname(p)}回复 ${add} 点命轮值`, 'heal');
}

function damagePlayer(G, p, v, kind) {
  if (v <= 0) return;
  // 屏障：抵挡一次「战斗伤害或效果伤害」（代价/自伤不挡）。
  // 放在这里而不是各调用点，是因为烧血、贯穿、反击三条路最后都走到这一处。
  if (p.br > 0 && kind !== 'cost') {
    p.br--;
    log(G, `${pname(p)}的屏障挡下了 ${v} 点伤害（剩余 ${p.br} 层）`, 'buff');
    return;
  }
  p.lp -= v;
  G.stats.damage[p.idx] += v;
  log(G, `${pname(p)}受到 ${v} 点伤害`, kind || 'damage');
  checkOver(G);
}

function checkOver(G) {
  if (G.over) return;
  const dead = G.players.findIndex((p) => p.lp <= 0);
  if (dead >= 0) {
    G.over = true;
    G.winner = 1 - dead;
    log(G, `${pname(G.players[dead])}的命轮断了。${pname(G.players[G.winner])}赢下这场对决。`, 'over');
  }
}

// ------------------------------------------------------------------ 攻守
function eachFx(card, fn) {
  for (const f of fx(card)) fn(f);
}

export function atkOf(G, p, m) {
  if (!m) return 0;
  const d = CARDS[m.id];
  let v = m.atk;
  for (const o of p.mons) {
    if (!o || o === m) continue;
    eachFx(CARDS[o.id], (f) => {
      if (f.k === 'aura' && (f.r === 'any' || f.r === d.r)) v += f.v;
    });
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    eachFx(CARDS[s.id], (f) => {
      if (f.k === 'aura' && (f.r === 'any' || f.r === d.r)) v += f.v;
    });
  }
  for (const b of p.bonds) {
    for (const f of b.fx || []) {
      if (f.k === 'atkRealm' && f.r === d.r) v += f.v;
      else if (f.k === 'atkAll') v += f.v;
      else if (f.k === 'atkNames' && (f.list || []).indexOf(d.n) >= 0) v += f.v;
    }
  }
  v += (m.equipAtk || 0) + (m.tmpAtk || 0);
  return Math.max(0, v);
}

export function defOf(G, p, m) {
  if (!m) return 0;
  const d = CARDS[m.id];
  let v = m.def;
  for (const o of p.mons) {
    if (!o || o === m) continue;
    eachFx(CARDS[o.id], (f) => { if (f.k === 'auraDef') v += f.v; });
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    eachFx(CARDS[s.id], (f) => { if (f.k === 'auraDef') v += f.v; });
  }
  for (const b of p.bonds) {
    for (const f of b.fx || []) {
      if (f.k === 'defRealm' && f.r === d.r) v += f.v;
      else if (f.k === 'defAll') v += f.v;
    }
  }
  v += (m.equipDef || 0) + (m.tmpDef || 0);
  return Math.max(0, v);
}

// 一只怪兽「实际拥有」的效果：卡面写的 + 装备卡授予的（extraFx）。
// 装备原本只加攻击力/守备力，造物那批卡需要「装上去以后这只怪会贯穿/会反击」，
// 所以从这里合并，hasFx / fxV / destroyMon 全部走这一处。
function monFx(m) {
  const base = (CARDS[m.id].fx || []);
  return m.extraFx && m.extraFx.length ? base.concat(m.extraFx) : base;
}
function hasFx(m, k) {
  return monFx(m).some((f) => f.k === k);
}
function fxV(m, k) {
  const f = monFx(m).find((x) => x.k === k);
  return f ? (f.v || 0) : 0;
}

// 效果抗性（额外卡组那批「在场时不受对方魔法·陷阱效果影响」）。
// 只挡对方的效果，自己给自己上 buff 不受影响。
// 单独抽成一个入口，是因为弹回 / 削攻 / 破坏 / 夺怪 / 上毒五条路各写各的，
// 散着写一定会漏掉一条，最后变成「有些牌能打死它、有些不能」的玄学。
function effImmune(m) { return !!m && hasFx(m, 'unaffected'); }
function effTarget(G, mon, what) {
  if (!effImmune(mon)) return mon;
  log(G, `「${CARDS[mon.id].n}」不受效果影响，${what || '这个效果'}没有生效`, 'info');
  return null;
}

export function maxAttacks(m) { return hasFx(m, 'twin') ? 2 : 1; }
export function canAttack(G, p, m) {
  if (p.lock && p.lock.atk > 0) return false;     // 被「临界点 / 女王的戒律」按住的那个回合
  return !!m && m.pos === 'atk' && !m.set && m.atkCount < maxAttacks(m) && !G.over;
}

// 必须优先攻击的那只。三档，从严到宽：
//   taunt      无条件拦截（不管攻守、不管对面多大的怪都挡得住）
//   tauntMax   只拦攻击力 ≤ v 的怪兽——大怪可以直接跨过去打别人，这就是「灵活版」
//   guard      老规则：表侧守备表示的守护
// tauntOnce 是附加标记：这只怪每回合只拦一次，拦过之后这一回合就能被绕开。
// atk 传攻击方的攻击力；不传 = 不知道对面多大，按「挡得住」算（界面渲染时用）。
export function mustHitFirst(p, atk) {
  const av = atk == null ? Infinity : atk;
  for (const m of p.mons) {
    if (!m || m.set) continue;
    const cap = fxV(m, 'tauntMax');
    if (!hasFx(m, 'taunt') && !(cap > 0 && av <= cap)) continue;
    if (hasFx(m, 'tauntOnce') && m.used.taunt) continue;
    return m;
  }
  return p.mons.find((m) => m && !m.set && m.pos === 'def' && hasFx(m, 'guard')) || null;
}

// 这只怪是「嘲讽」还是「守备守护」——界面要给不同提示，AI 也不用猜
export function isTaunt(m) {
  return !!m && (hasFx(m, 'taunt') || fxV(m, 'tauntMax') > 0);
}

// ------------------------------------------------------------------ 召唤
export function tributeNeed(id) {
  const d = CARDS[id];
  if (!d || d.k !== 'M') return 0;
  if (d.lv >= 7) return 2;
  if (d.lv >= 5) return 1;
  return 0;
}

function freeSlot(arr) { return arr.indexOf(null); }

export function canSummon(G, p, id) {
  if (G.over || G.active !== p.idx || G.phase !== 'main') return false;
  if (p.lock && p.lock.sum > 0) return false;      // 被「被囚禁的疯狂」按住
  // 额外的通常召唤（「灯下夜谈」那类）：先用掉本回合的那一次，再吃额外的次数
  if (p.normalUsed && p.normalExtra <= 0) return false;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return false;
  const need = tributeNeed(id);
  const own = p.mons.filter(Boolean).length;
  if (own < need) return false;
  if (need === 0 && freeSlot(p.mons) < 0) return false;
  return true;
}

export function summon(G, side, uid, tribUids) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段召唤');
  if (p.lock && p.lock.sum > 0) return fail('这个回合你的召唤被「被囚禁的疯狂」压制住了');
  if (p.normalUsed && p.normalExtra <= 0) return fail('本回合已经通常召唤过了');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return fail('通常召唤只能放怪兽');
  const need = tributeNeed(id);
  const tribs = (tribUids || []).map((u) => p.mons.find((m) => m && m.uid === u)).filter(Boolean);
  if (tribs.length !== need) return fail(need ? `等级 ${d.lv} 需要 ${need} 只祭品` : '这张牌不需要祭品');
  if (need === 0 && freeSlot(p.mons) < 0) return fail('怪兽区已经满了');

  for (const t of tribs) {
    const zi = p.mons.indexOf(t);
    p.mons[zi] = null;
    toGrave(G, p, t, '祭品');
  }
  p.hand.splice(hi, 1);
  // 先消耗本回合那一次，再消耗「额外通常召唤」——这样额外次数不会被白白浪费掉
  if (p.normalUsed) p.normalExtra--; else p.normalUsed = true;
  const mon = mkMon(G, id, side);
  const slot = freeSlot(p.mons);
  p.mons[slot < 0 ? 0 : slot] = mon;
  log(G, `${pname(p)}召唤「${d.n}」（${REALM[d.r].n} · ${atkOf(G, p, mon)}/${defOf(G, p, mon)}）`, 'summon');

  // 对方召唤时的陷阱（先响应，被破坏了就不结算召唤效果）
  const killed = summonTraps(G, p, mon);
  if (!killed && !mon.set) triggerSummonFx(G, p, mon);
  return ok();
}

export function setMonster(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段盖放');
  if (p.normalUsed) return fail('本回合已经通常召唤过了');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return fail('只能盖放怪兽');
  if (tributeNeed(id) > 0) return fail('等级 5 以上的怪兽不能盖放');
  const slot = freeSlot(p.mons);
  if (slot < 0) return fail('怪兽区已经满了');
  p.hand.splice(hi, 1);
  if (p.normalUsed) p.normalExtra--; else p.normalUsed = true;
  const mon = mkMon(G, id, side);
  mon.pos = 'def';
  mon.set = true;
  p.mons[slot] = mon;
  log(G, `${pname(p)}盖放了一只怪兽`, 'summon');
  summonTraps(G, p, mon);
  return ok();
}

function mkMon(G, id, side) {
  const d = CARDS[id];
  const m = {
    uid: G.uid++, id, atk: d.atk, def: d.def, pos: 'atk', set: false,
    atkCount: 0, tmpAtk: 0, tmpDef: 0, equipAtk: 0, equipDef: 0,
    owner: side, used: {},
    // 屏障层数（抵掉一次破坏）/ 流血层数（每回合掉攻击力）/ 中毒层数（每回合掉攻守）
    // / 装备额外赋予的效果
    br: 0, bld: 0, psn: 0, extraFx: null,
  };
  for (const f of fx(d)) if (f.k === 'barrierMon') m.br += f.v || 1;
  return m;
}

function triggerSummonFx(G, p, mon) {
  const d = CARDS[mon.id];
  for (const f of fx(d)) {
    if (SUMMON_FX.has(f.k)) applyFx(G, p, f, { mon });
  }
}

// ------------------------------------------------------------------ 效果
function applyFx(G, p, f, ctx) {
  const o = G.players[1 - p.idx];
  const mon = ctx && ctx.mon;
  switch (f.k) {
    case 'draw': drawCards(G, p, f.v || 1); break;
    case 'burn': damagePlayer(G, o, (f.v || 0) + bondNum(p, 'burnBonus'), 'effect'); break;
    case 'heal': heal(G, p, f.v || 0); break;
    case 'costLp': damagePlayer(G, p, f.v || 0, 'cost'); break;
    case 'bothDraw': drawCards(G, p, f.v || 1); drawCards(G, o, f.v || 1); break;
    case 'discardOpp': discardRandom(G, o, f.v || 1); break;
    case 'recall': {
      const want = f.f || 'monster';
      const kk = want === 'monster' ? 'M' : want === 'spell' ? 'S' : 'T';
      for (let i = p.grave.length - 1; i >= 0; i--) {
        const d = CARDS[p.grave[i]];
        if (d && d.k === kk) {
          if (p.hand.length >= HAND_MAX) { log(G, `${pname(p)}手牌已满，没能从墓地取回「${d.n}」`, 'info'); break; }
          const id = p.grave.splice(i, 1)[0];
          p.hand.push({ uid: G.uid++, id });
          log(G, `${pname(p)}从墓地取回「${d.n}」`, 'spell');
          break;
        }
      }
      break;
    }
    case 'search': {
      const want = f.f || 'spell';
      const i = p.deck.findIndex((id) => {
        const d = CARDS[id];
        if (!d) return false;
        if (want === 'spell' && d.k !== 'S') return false;
        if (want === 'trap' && d.k !== 'T') return false;
        if (want === 'monster' && d.k !== 'M') return false;
        if (f.r && f.r !== 'any' && d.r !== f.r) return false;
        if (f.max && d.lv && d.lv > f.max) return false;
        return true;
      });
      if (i >= 0) {
        const id = p.deck.splice(i, 1)[0];
        log(G, `${pname(p)}检索了「${CARDS[id].n}」`, 'spell');
        handAdd(G, p, id, '检索');
      } else {
        log(G, `${pname(p)}想检索，但卡组里没有符合条件的牌`, 'info');
      }
      break;
    }
    case 'bounce': {
      const t = effTarget(G, strongest(o), '弹回');
      if (t && !barrierBlock(G, t, '这次弹回')) {
        removeMon(G, o, t);
        if (CARDS[t.id].token) {
          log(G, `衍生物「${CARDS[t.id].n}」被抹掉了`, 'spell');
          break;
        }
        log(G, `「${CARDS[t.id].n}」被弹回${pname(o)}的手牌`, 'spell');
        handAdd(G, o, t.id, '弹回');
      }
      break;
    }
    case 'trapSeal': {
      // 暂时封印：挑对方一张还没被封的盖放陷阱，到对方这个回合结束为止不能发动（不破坏）
      const s = o.spells.find((x) => x && x.set && !(x.seal > 0) && CARDS[x.id] && CARDS[x.id].k === 'T');
      if (!s) { log(G, `${pname(o)}没有可以封印的盖放陷阱`, 'spell'); break; }
      if (trapGuard(G, o, { kind: 'lock', text: '封印陷阱的效果' })) break;
      s.seal = 2;
      log(G, `${pname(p)}暂时封印了${pname(o)}盖放的一张陷阱`, 'spell');
      break;
    }
    case 'snipeAll': {
      const list = o.spells.filter((x) => x && x.set);
      if (!list.length) break;
      if (trapGuard(G, o, { kind: 'snipe', text: '陨日的破坏' })) break;
      for (const s of list) { o.spells[o.spells.indexOf(s)] = null; o.grave.push(s.id); }
      log(G, `${pname(p)}破坏了${pname(o)}盖放的全部 ${list.length} 张魔陷`, 'spell');
      break;
    }
    case 'reveal': {
      const names = o.spells.filter((x) => x && x.set).map((x) => `「${CARDS[x.id].n}」`);
      log(G, names.length ? `${pname(p)}看穿了${pname(o)}盖着的牌：${names.join('、')}` : `${pname(o)}没有盖放的牌`, 'spell');
      break;
    }
    case 'trapLock': {
      if (trapGuard(G, o, { kind: 'lock', text: '「不存在之地」' })) break;
      o.trapLock = true;
      log(G, `${pname(o)}这个回合不能发动陷阱了`, 'spell');
      break;
    }
    case 'snipe':
    case 'snipeDraw': {
      const s = o.spells.find((x) => x && x.set);
      if (s && trapGuard(G, o, { kind: 'snipe', text: '破坏盖放陷阱的效果' })) { if (f.k === 'snipeDraw') drawCards(G, p, 1); break; }
      if (s) {
        o.spells[o.spells.indexOf(s)] = null;
        o.grave.push(s.id);
        log(G, `${pname(p)}破坏了${pname(o)}盖放的「${CARDS[s.id].n}」`, 'spell');
      }
      if (f.k === 'snipeDraw') drawCards(G, p, 1);
      break;
    }
    case 'weaken': {
      const t = effTarget(G, strongest(o), '弱化');
      if (t && !barrierBlock(G, t, '这次弱化')) {
        t.atk = Math.max(0, t.atk - (f.v || 0));
        log(G, `「${CARDS[t.id].n}」攻击力下降 ${f.v}`, 'spell');
      }
      break;
    }
    case 'pumpSelf': if (mon) { mon.atk += f.v || 0; log(G, `「${CARDS[mon.id].n}」攻击力永久 +${f.v}`, 'buff'); } break;
    case 'destroyStrongest': {
      const t = effTarget(G, strongest(o), '破坏');
      if (t) destroyMon(G, o, t, '效果破坏');
      break;
    }
    case 'destroyWeak': {
      const t = effTarget(G, strongest(o), '破坏');
      if (t && atkOf(G, o, t) <= (f.v || 0)) destroyMon(G, o, t, '效果破坏');
      else log(G, `「忘却之楔」没能破坏任何怪兽`, 'info');
      break;
    }
    case 'pumpHighest': {
      const t = strongest(p);
      if (t) { t.atk += f.v || 0; log(G, `「${CARDS[t.id].n}」攻击力永久 +${f.v}`, 'buff'); }
      break;
    }
    case 'quickAtkAll': {
      for (const m of p.mons) if (m) m.tmpAtk += f.v || 0;
      log(G, `${pname(p)}的全部怪兽本回合攻击力 +${f.v}`, 'buff');
      break;
    }
    case 'quickDef': {
      for (const m of p.mons) if (m) m.tmpDef += f.v || 0;
      log(G, `${pname(p)}的全部怪兽本回合守备力 +${f.v}`, 'buff');
      break;
    }
    case 'quickDirect': {
      const t = p.mons.filter(Boolean).sort((a, b) => atkOf(G, p, b) - atkOf(G, p, a))[0];
      if (t) { t.direct = true; log(G, `「${CARDS[t.id].n}」本回合可以直接攻击`, 'buff'); }
      break;
    }
    case 'weakenEnemyAll': {
      let hit = 0;
      for (const m of o.mons) if (m && !effImmune(m)) { m.tmpAtk -= f.v || 0; hit++; }
      log(G, `${pname(o)}的 ${hit} 只怪兽本回合攻击力 -${f.v}`, 'spell');
      break;
    }
    case 'weakenHighest': {
      const t = effTarget(G, strongest(o), '弱化');
      if (t) { t.tmpAtk -= f.v || 0; log(G, `「${CARDS[t.id].n}」本回合攻击力 -${f.v}`, 'spell'); }
      break;
    }
    case 'battleBoost': {
      for (const m of p.mons) if (m) m.tmpAtk += f.v || 0;
      log(G, `「巡夜人的灯」：${pname(p)}全部怪兽本回合攻击力 +${f.v}`, 'buff');
      break;
    }
    case 'graveBurn': {
      const n = Math.min(f.max || 5, p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'M' && (!f.r || CARDS[id].r === f.r)).length);
      damagePlayer(G, o, n * (f.v || 0), 'effect');
      break;
    }
    case 'graveHeal': {
      const n = p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'M').length;
      if (n) heal(G, p, n * (f.v || 0));
      break;
    }
    case 'realmDraw': {
      const n = Math.min(f.v || 2, p.mons.filter((m) => m && realmOf(m.id) === f.r).length);
      if (n) drawCards(G, p, n);
      break;
    }
    case 'echoDraw': drawCards(G, p, 1); drawCards(G, o, 1); drawCards(G, p, 1); break;
    case 'selfBurnDraw': damagePlayer(G, p, f.v || 1000, 'cost'); drawCards(G, p, 2); break;
    case 'lpDraw': damagePlayer(G, p, f.v || 1000, 'cost'); drawCards(G, p, 2); break;
    case 'sacrificeHeal': {
      const t = weakest(p);
      if (t) {
        destroyMon(G, p, t, '祭品');
        heal(G, p, f.v || 1500);
        drawCards(G, p, 1);
      }
      break;
    }
    case 'sweepWeak': {
      for (let s = 0; s < 2; s++) {
        const pl = G.players[s];
        for (const m of pl.mons.slice()) {
          // 抗性兽不受对方的效果——但自己放的范围效果照样能扫自己人
          if (m && pl.idx !== p.idx && effImmune(m)) { effTarget(G, m, '扫场'); continue; }
          if (m && atkOf(G, pl, m) <= (f.v || 1500)) destroyMon(G, pl, m, '效果破坏');
        }
      }
      break;
    }
    case 'discardOpp2': discardRandom(G, o, 2); break;
    case 'tradeDraw': drawCards(G, o, 1); drawCards(G, p, 2); break;
    case 'discardDraw': discardRandom(G, p, 1); drawCards(G, p, f.v || 2); break;
    case 'healDraw': heal(G, p, f.v || 1000); drawCards(G, p, 1); break;
    // ---- 中毒 / 流血 / 屏障（bp07 起的新机制） ----
    case 'poison': {
      const add = f.v || 1;
      o.psn = Math.min(20, o.psn + add);
      log(G, `${pname(o)}中毒 ${add} 层（共 ${o.psn} 层，每回合开始掉 ${o.psn * 100}）`, 'effect');
      break;
    }
    case 'poisonMon': {
      // 挂在怪兽身上的毒：回合开始攻守一起掉，攻守都归 0 就化掉。
      // 和流血的分工——流血只削攻击力（削锋），毒连守备力一起啃（磨穿守备大墙）。
      const list = (f.on === 'all' ? o.mons.filter(Boolean)
        : [f.on === 'weak' ? weakest(o) : strongest(o)].filter(Boolean)).filter((t) => !effImmune(t));
      for (const t of list) {
        const add = f.v || 1;
        t.psn = Math.min(9, t.psn + add);
        log(G, `「${CARDS[t.id].n}」中毒 ${add} 层（共 ${t.psn} 层，每回合攻守 -${t.psn * 100}）`, 'effect');
      }
      break;
    }
    case 'bleed': {
      const list = (f.on === 'all' ? o.mons.filter(Boolean)
        : [f.on === 'weak' ? weakest(o) : strongest(o)].filter(Boolean)).filter((t) => !effImmune(t));
      for (const t of list) {
        const add = f.v || 1;
        t.bld = Math.min(9, t.bld + add);
        log(G, `「${CARDS[t.id].n}」开始流血 ${add} 层（共 ${t.bld} 层）`, 'effect');
      }
      break;
    }
    case 'barrier': {
      const add = f.v || 1;
      p.br = Math.min(5, p.br + add);
      log(G, `${pname(p)}获得 ${add} 层屏障（共 ${p.br} 层）`, 'buff');
      break;
    }
    case 'barrierMon': {
      const t = mon || strongest(p);
      if (t) {
        t.br += f.v || 1;
        log(G, `「${CARDS[t.id].n}」获得 ${f.v || 1} 层屏障`, 'buff');
      }
      break;
    }
    // ---- 召唤机制：衍生物 / 特殊召唤 / 额外通常召唤 ----
    case 'token': {
      // 衍生物：不占通常召唤、不触发召唤时的陷阱，纯粹多一个身位（当祭品 / 当墙 / 当嘲讽的靶子）
      const tid = f.id;
      if (!tid || !CARDS[tid]) { log(G, `[衍生物 ${tid} 不存在]`, 'warn'); break; }
      let n = f.v || 1;
      while (n-- > 0) {
        const slot = freeSlot(p.mons);
        if (slot < 0) { log(G, `${pname(p)}的怪兽区满了，「${CARDS[tid].n}」没能出现`, 'info'); break; }
        const tk = mkMon(G, tid, p.idx);
        // 卡面写「守备表示」的就摆守备：0/0 的残影摊在攻击表示上是白送，摆成墙才是它的用法
        if (f.pos === 'def') tk.pos = 'def';
        p.mons[slot] = tk;
        log(G, `${pname(p)}特殊召唤了「${CARDS[tid].n}」`, 'summon');
      }
      break;
    }
    case 'specialSummon': {
      // 特殊召唤：不占通常召唤权。素材默认从手牌挑，f.f==='grave' 时从自己墓地挑。
      // f.max 是星级上限（不给就当 4 星以下）。
      const maxLv = f.max || 4;
      const pick = (x) => {
        const c = CARDS[x];
        return c && c.k === 'M' && !c.token && (c.lv || 0) <= maxLv;
      };
      if (freeSlot(p.mons) < 0) { log(G, `${pname(p)}的怪兽区满了，特殊召唤失败`, 'info'); break; }
      if (f.f === 'grave') {
        let idx = -1;
        for (let i = p.grave.length - 1; i >= 0; i--) if (pick(p.grave[i])) { idx = i; break; }
        if (idx < 0) { log(G, `${pname(p)}的墓地里没有能唤回的怪兽`, 'info'); break; }
        const id = p.grave.splice(idx, 1)[0];
        const mm = mkMon(G, id, p.idx);
        p.mons[freeSlot(p.mons)] = mm;
        log(G, `${pname(p)}从墓地特殊召唤「${CARDS[id].n}」`, 'summon');
        triggerSummonFx(G, p, mm);
      } else {
        const cand = p.hand.filter((h) => pick(h.id))
          .sort((a, b) => (CARDS[b.id].atk || 0) - (CARDS[a.id].atk || 0))[0];
        if (!cand) { log(G, `${pname(p)}手牌里没有能特殊召唤的怪兽`, 'info'); break; }
        p.hand.splice(p.hand.indexOf(cand), 1);
        const mm = mkMon(G, cand.id, p.idx);
        p.mons[freeSlot(p.mons)] = mm;
        log(G, `${pname(p)}特殊召唤「${CARDS[cand.id].n}」`, 'summon');
        triggerSummonFx(G, p, mm);
      }
      break;
    }
    // 解放召唤：解放自己场上 1 只怪兽，从卡组（f.f==='hand' 时从手牌）拉 1 只高星怪兽。
    // 通常召唤 7 星要 2 只祭品，这张只收 1 只——省下的那 1 只就是这张牌换来的东西，
    // 所以它不能是永续、不能反复用，只能一张换一只。
    // 祭品默认挑最弱的那只（AI 与老调用都走这条路）；界面会让玩家先点选，把 uid 放进 ctx.trib。
    case 'tributeSummon': {
      const maxLv = f.max || 7;
      const pool = f.f === 'hand' ? p.hand.map((x) => x.id) : p.deck;
      let pick = null;
      for (const cid of pool) {
        const cd = CARDS[cid];
        if (!cd || cd.k !== 'M' || cd.token) continue;
        const lv = cd.lv || 0;
        if (lv > maxLv || (f.lv && lv !== f.lv)) continue;
        // 等级优先（越接近上限越值），同等级里挑攻击力最高的
        if (!pick || lv > pick.lv || (lv === pick.lv && (cd.atk || 0) > pick.atk)) {
          pick = { id: cid, lv, atk: cd.atk || 0 };
        }
      }
      if (!pick) { log(G, `${pname(p)}的${f.f === 'hand' ? '手牌' : '卡组'}里没有能解放召唤的怪兽`, 'info'); break; }
      const own = p.mons.filter(Boolean);
      const want = (ctx && ctx.trib) || 0;
      const trib = (want && p.mons.find((m) => m && m.uid === want))
        || own.slice().sort((a, b) => atkOf(G, p, a) - atkOf(G, p, b))[0];
      if (!trib) { log(G, `${pname(p)}场上没有可以解放的怪兽`, 'info'); break; }
      p.mons[p.mons.indexOf(trib)] = null;
      toGrave(G, p, trib, '被解放');
      if (f.f === 'hand') p.hand.splice(p.hand.findIndex((x) => x.id === pick.id), 1);
      else p.deck.splice(p.deck.indexOf(pick.id), 1);
      const mon = mkMon(G, pick.id, p.idx);
      mon.atkCount = 9;      // 和特殊召唤同一条规矩：白送的身位当回合不能攻击
      p.mons[freeSlot(p.mons)] = mon;
      log(G, `${pname(p)}解放「${CARDS[trib.id].n}」，特殊召唤等级 ${pick.lv} 的「${CARDS[pick.id].n}」`, 'summon');
      triggerSummonFx(G, p, mon);
      break;
    }
    case 'grantFx': {
      // 把一条静态效果贴到场上最强的怪兽身上（「这回合它也学会反击」）。
      // 和装备卡用的是同一套 extraFx，所以贯穿 / 嘲讽 / 反击 / 屏障全都能给。
      const t = mon || strongest(p);
      if (!t) { log(G, `${pname(p)}场上没有怪兽可以接受「${f.g}」`, 'info'); break; }
      t.extraFx = (t.extraFx || []).concat([{ k: f.g, v: f.v || 0 }]);
      if (f.g === 'barrierMon') t.br += f.v || 1;
      log(G, `「${CARDS[t.id].n}」获得了新的力量`, 'buff');
      break;
    }
    case 'extraNormal': {
      p.normalExtra += f.v || 1;
      log(G, `${pname(p)}本回合可以再通常召唤 ${p.normalExtra} 次`, 'buff');
      break;
    }
    // ---- 造物那批（bp16）用的四个新效果 ----
    case 'millOpp': {
      // 削卡组：对方卡组顶 N 张送墓。抽牌抽得再快也怕这个。
      const n = Math.min(f.v || 3, o.deck.length);
      for (let i = 0; i < n; i++) {
        const id = o.deck.pop();
        if (id == null) break;
        o.grave.push(id);
      }
      log(G, `${pname(o)}的卡组顶 ${n} 张被削进墓地`, 'effect');
      break;
    }
    case 'millSelf': {
      const n = Math.min(f.v || 3, p.deck.length);
      for (let i = 0; i < n; i++) {
        const id = p.deck.pop();
        if (id == null) break;
        p.grave.push(id);
      }
      log(G, `${pname(p)}把卡组顶 ${n} 张送进墓地`, 'cost');
      break;
    }
    case 'recycle': {
      // 墓地洗回卡组：造物「回溯沙漏」那种。回收的是最前面几张（墓地按时间顺序存）。
      const n = Math.min(f.v || 3, p.grave.length);
      if (!n) { log(G, '墓地是空的，没什么可回收', 'info'); break; }
      const back = p.grave.splice(0, n);
      for (const id of back) p.deck.push(id);
      shuffle(G, p.deck);
      log(G, `${pname(p)}把墓地 ${n} 张洗回卡组`, 'buff');
      break;
    }
    case 'stealMon': {
      // 夺取控制权：造物「牵丝」——把对方最能打的那只拉过来，自己得有空位。
      if (freeSlot(p.mons) < 0) { log(G, `${pname(p)}的怪兽区满了，抢不过来`, 'info'); break; }
      const cand = o.mons.filter(Boolean).filter((m) => !effImmune(m));
      if (!cand.length) {
        if (o.mons.filter(Boolean).length) log(G, `${pname(o)}的怪兽都不受效果影响，没能夺过来`, 'info');
        break;
      }
      const t = cand.sort((a, b) => atkOf(G, o, b) - atkOf(G, o, a))[0];
      if (CARDS[t.id].token) { log(G, `衍生物「${CARDS[t.id].n}」不能被夺取`, 'info'); break; }
      removeMon(G, o, t);
      t.pos = 'atk';
      t.atkCount = 9;      // 抢来的这只当回合不能动手
      t.used = {};
      p.mons[freeSlot(p.mons)] = t;
      log(G, `${pname(p)}夺取了「${CARDS[t.id].n}」的控制权`, 'effect');
      break;
    }
    case 'lpPump': {
      // 血怒：命轮值掉得越多，攻击力越高（每 1000 点换 v 点攻击）
      const lost = Math.max(0, p.lpMax - p.lp);
      const add = Math.floor(lost / 1000) * (f.v || 200);
      const t = mon || strongest(p);
      if (t && add > 0) {
        t.atk += add;
        log(G, `「${CARDS[t.id].n}」因失血而狂怒，攻击力 +${add}`, 'buff');
      } else if (t) {
        log(G, `命轮值还满着，「${CARDS[t.id].n}」怒不起来`, 'info');
      }
      break;
    }
    // ---- 压制：封住对方下个回合的一类行动 ----
    // 为什么值得单独做一套：没有它的时候，双方只能靠「抽到更大的怪」和「拆陷阱」互相干扰，
    // 先手铺完场就只剩比大小。有了封攻击 / 封召唤 / 封魔法，一回合的选择才变成
    // 「现在打，还是先把他按住」。
    case 'atkLock': case 'summonLock': case 'spellLock': {
      const key = f.k === 'atkLock' ? 'atk' : f.k === 'summonLock' ? 'sum' : 'sp';
      // 计数按「被封锁方的回合结束」减一，所以如果这张牌是在对方回合打出来的
      // （反击陷阱「临界点」），要多记一回合，否则对方这一回合结束时就被减没了，
      // 下个回合照样想打就打。
      const n = Math.max(1, f.v || 1) + (G.active !== p.idx ? 1 : 0);
      o.lock[key] = Math.max(o.lock && o.lock[key] ? o.lock[key] : 0, n);
      log(G, `${pname(o)}下个回合${LOCK_TXT[key]}`, 'trap');
      break;
    }
    case 'unlockAll': {
      const had = (p.lock ? p.lock.atk + p.lock.sum + p.lock.sp : 0) + (p.trapLock ? 1 : 0);
      p.lock = { atk: 0, sum: 0, sp: 0 };
      p.trapLock = false;
      log(G, had ? `${pname(p)}挣脱了身上的全部封锁` : `${pname(p)}身上没有封锁可以解除`, 'buff');
      break;
    }
    case 'revealHand': {
      const names = o.hand.map((h) => `「${CARDS[h.id].n}」`);
      log(G, names.length
        ? `${pname(p)}看穿了${pname(o)}的手牌：${names.join('、')}`
        : `${pname(p)}看过去，${pname(o)}手里是空的`, 'spell');
      break;
    }
    case 'counter': case 'taunt': case 'equipGrant':
    case 'counterBoost': case 'counterDraw': case 'tauntMax': case 'tauntOnce':
      break; // 静态 / 装备时处理，不进这里
    case 'reflect': break; // 由战斗流程处理
    case 'contHeal': case 'contBurn': case 'contBoth': case 'contPunish':
    case 'summonTaxDiscard': case 'extraDraw': case 'equipAtk': case 'equipDef':
    case 'turnHeal': case 'atkUpTurn': case 'onKillAtk': case 'onKillDraw':
    case 'onDestroyDraw': case 'onDestroyBurn': case 'revive': case 'lastStand':
    case 'pierce': case 'guard': case 'aura': case 'auraDef': case 'drain':
    case 'directDiscard': case 'snipeAttack': case 'negateTrapOnce': case 'spellShield': case 'trapImmune': case 'trapWard':
    case 'twin': case 'destroyAttacker': case 'negateAttack': case 'negateSpell':
    case 'negateSummon': case 'destroySummon': case 'negateSpellSnipe': case 'negateTrap':
    case 'negateAttackSelf': case 'unaffected': case 'reflectAtk': case 'negateAny':
      break;
    default:
      log(G, `[未实现的效果 ${f.k}]`, 'warn');
      break;
  }
}

function strongest(p) {
  return p.mons.filter(Boolean).sort((a, b) => b.atk - a.atk)[0] || null;
}
function weakest(p) {
  return p.mons.filter(Boolean).sort((a, b) => a.atk - b.atk)[0] || null;
}

function discardRandom(G, p, n) {
  for (let i = 0; i < n; i++) {
    if (!p.hand.length) { log(G, `${pname(p)}没有手牌可弃`, 'info'); return; }
    const j = Math.floor(G.rng() * p.hand.length);
    const h = p.hand.splice(j, 1)[0];
    p.grave.push(h.id);
    log(G, `${pname(p)}丢弃了「${CARDS[h.id].n}」`, 'discard');
  }
}

// ------------------------------------------------------------------ 破坏
export function toGrave(G, p, mon, reason) {
  const d = CARDS[mon.id];
  // 装备卡跟着走
  for (let i = 0; i < p.spells.length; i++) {
    const s = p.spells[i];
    if (s && s.equipOn === mon.uid) { p.spells[i] = null; p.grave.push(s.id); }
  }
  // 衍生物离场即消失，不进墓地（否则「从墓地取回」能捡到一张 0/0 的废牌）
  if (d.token) {
    log(G, `「${d.n}」${reason || '离场'}，作为衍生物直接消失`, 'grave');
    return;
  }
  p.grave.push(mon.id);
  log(G, `「${d.n}」${reason || '被破坏'}，送去墓地`, 'grave');
}

export function removeMon(G, p, mon) {
  const i = p.mons.indexOf(mon);
  if (i >= 0) p.mons[i] = null;
}

// 怪兽屏障：抵消「一次破坏 / 一次效果」。战斗破坏和效果破坏都走 destroyMon，
// 弹回 / 弱化这类不改写墓地的不走，所以在各自的分支里单独问一下。
function barrierBlock(G, mon, what) {
  if (!mon || !(mon.br > 0)) return false;
  mon.br--;
  log(G, `「${CARDS[mon.id].n}」的屏障挡住了${what || '这次破坏'}（剩余 ${mon.br} 层）`, 'buff');
  return true;
}

export function destroyMon(G, p, mon, reason) {
  // 同一只怪一回合内可能被叫去死两次：被战斗破坏之后，目标的反击还会再
  // 削它一次「削到 0 就破坏」，同归于尽分支也会连着叫两次。不拦的话它会
  // 进两次墓地，卡牌总数就凭空多一张。
  if (!mon || mon.dead) return;
  const d = CARDS[mon.id];
  // 屏障：先吃掉一次破坏（比 lastStand 能叠层，也能被装备卡临时给）
  if (barrierBlock(G, mon, '这次破坏')) return;
  if (hasFx(mon, 'lastStand') && !mon.used.stand) {
    mon.used.stand = true;
    log(G, `「${d.n}」扛住了这一击，没有被战斗破坏`, 'buff');
    return;
  }
  if (hasFx(mon, 'revive') && !mon.used.revive) {
    mon.used.revive = true;
    mon.dead = true;
    removeMon(G, p, mon);
    log(G, `「${d.n}」回到${pname(p)}的手牌`, 'buff');
    handAdd(G, p, mon.id, '复活');
    return;
  }
  mon.dead = true;
  removeMon(G, p, mon);
  toGrave(G, p, mon, reason);
  for (const f of monFx(mon)) {
    if (f.k === 'onDestroyDraw') drawCards(G, p, f.v || 1);
    if (f.k === 'onDestroyBurn') damagePlayer(G, G.players[1 - p.idx], f.v || 0, 'effect');
  }
}

// ------------------------------------------------------------------ 魔法 / 陷阱
export function activateSpell(G, side, uid, trib) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'S') return fail('这不是魔法卡');
  // 解封牌（不可承受的自由）自己必須穿得过去，否则被封魔后就永远解不开了
  const isUnlock = fx(d).some((f) => f.k === 'unlockAll');
  if (p.lock && p.lock.sp > 0 && !isUnlock) return fail('这个回合你的魔法被「无声欢宴」封住了');
  // 速攻（钥令那批）：战斗阶段也能开，别的魔法只能在主要阶段
  if (G.phase !== 'main' && !(d.t === 'quick' && G.phase === 'battle')) {
    return fail(d.t === 'quick' ? '现在不能发动魔法' : '只能在主要阶段发动魔法');
  }
  const isCont = d.t === 'cont' || d.t === 'equip' || d.t === 'field';
  // 场地魔法能顶掉自己旧的场地，所以格子满了也还能开——只要满的那格就是场地
  const canReplaceField = d.t === 'field'
    && p.spells.some((x) => x && CARDS[x.id] && CARDS[x.id].t === 'field');
  if (isCont && freeSlot(p.spells) < 0 && !canReplaceField) return fail('魔法·陷阱区已经满了');
  // 命轮代价：卡面写了 cost.lp 就得先付，付不起这张牌根本发不动。
  // 不让「付完正好死」——那样等于自己给自己判负，AI 会拿去乱开。
  const cost = (d.cost && d.cost.lp) || 0;
  if (cost > 0 && p.lp <= cost) return fail(`命轮值不足（需要 ${cost}）`);

  // 对方的反击陷阱
  if (counterTrap(G, 1 - side, 'spell')) {
    p.hand.splice(hi, 1);
    p.grave.push(id);
    return ok();
  }

  p.hand.splice(hi, 1);
  log(G, `${pname(p)}发动魔法「${d.n}」`, 'spell');
  if (cost > 0) {
    log(G, `献出 ${cost} 点命轮值作为代价`, 'cost');
    damagePlayer(G, p, cost, 'cost');
    if (G.over) return ok();
  }

  if (d.t === 'field') {
    // 场地魔法：和永续一样占一格，但同一时间只能有一张——新的把旧的压掉
    for (let i = 0; i < p.spells.length; i++) {
      const s = p.spells[i];
      if (s && CARDS[s.id] && CARDS[s.id].t === 'field') {
        p.spells[i] = null;
        p.grave.push(s.id);
        log(G, `旧的场地「${CARDS[s.id].n}」被顶掉了`, 'info');
      }
    }
  }

  if (isCont) {
    const slot = freeSlot(p.spells);
    const card = { uid: G.uid++, id, set: false, turnSet: G.turn, equipOn: 0 };
    if (d.t === 'equip') {
      // 装备对象：卡上写了「装备给谁」就优先给他（造物那批都是「维度影像·某人」），
      // 否则挑场上最能打的那只。以前只认 strongest，"装备给 24" 的卡会贴到别人身上。
      const want = d.for;
      const t = (want && p.mons.find((m) => m && CARDS[m.id].n === want)) || strongest(p);
      if (!t) { p.grave.push(id); log(G, `没有可以装备的怪兽，「${d.n}」落空`, 'info'); return ok(); }
      card.equipOn = t.uid;
      for (const f of fx(d)) {
        if (f.k === 'equipAtk') t.atk += f.v || 0;
        if (f.k === 'equipDef') { t.def += f.v || 0; t.equipDef += f.v || 0; }
        if (f.k === 'equipGrant') {
          t.extraFx = (t.extraFx || []).concat([{ k: f.g, v: f.v || 0 }]);
          if (f.g === 'barrierMon') t.br += f.v || 1;
        }
      }
      log(G, `「${d.n}」装备在「${CARDS[t.id].n}」上`, 'buff');
    }
    p.spells[slot] = card;
    if (d.t === 'cont') {
      for (const f of fx(d)) {
        if (f.k === 'extraDraw') log(G, `「${d.n}」生效：每回合多抽 ${f.v} 张`, 'buff');
      }
    }
  } else {
    // ctx 里带上玩家点的祭品：解放召唤的魔法要在自己场上挑一只送墓，不给就自动挑最弱的
    for (const f of fx(d)) applyFx(G, p, f, { trib });
    p.grave.push(id);
  }
  return ok();
}

export function setTrap(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段盖放');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'T') return fail('只能盖放陷阱卡');
  const slot = freeSlot(p.spells);
  if (slot < 0) return fail('魔法·陷阱区已经满了');
  p.hand.splice(hi, 1);
  p.spells[slot] = { uid: G.uid++, id, set: true, turnSet: G.turn, equipOn: 0 };
  log(G, `${pname(p)}盖放了一张陷阱`, 'trap');
  return ok();
}

export function canUse(G, side, uid) {
  const p = G.players[side];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return null;
  const d = CARDS[h.id];
  if (!d) return null;
  if (d.k === 'M') return canSummon(G, p, h.id) ? 'summon' : null;
  if (d.k === 'S') return 'spell';
  if (d.k === 'T') return 'trap';
  return null;
}

// ---- 主动发动陷阱 ----
// 陷阱除了盖放的那一回合，其他时点都能由持有者主动发动：自己的回合（主要 / 战斗阶段）、对方的回合都行。
// 「应对型」陷阱（无效攻击 / 召唤 / 魔法、反击伤害等）没有可以主动发动的效果，仍然只在对应的时点自动迎击；
// 其余（抽牌 / 回复 / 弹手牌 / 削攻 / 墓地烧伤 / 永续等）以前根本没有任何时点会触发它们——现在都能手动发动。
const REACTIVE_TRAP = new Set([
  'shieldSnipe', 'shieldLock', 'shieldNegate',
  'negateAttack', 'destroyAttacker', 'reflect', 'battleBoost', 'trapPoison', 'trapCounter', 'trapCounterMon',
  // 替身：只在对方向你宣言攻击时有用，自己回合主动翻开没有任何意义
  'summonOnAttack', 'tokenOnAttack',
  'destroySummon', 'negateSummon', 'negateSpell', 'negateSpellSnipe', 'negateTrap', 'shieldTraps',
  // 反特召：只在对方特殊召唤时点有用（含衍生物、解放召唤、额外卡组直接落地）
  'negateSpecial', 'destroySpecial',
]);
const CONT_TRAP = new Set(['contBoth', 'contBurn', 'contPunish', 'contBarrier', 'contHeal', 'contPoison', 'contBleed']);
/** 这张盖放的陷阱现在能不能由持有者主动发动；返回 null 表示可以，否则是原因 */
export function trapManualBlock(G, side, s) {
  const p = G.players[side];
  if (!s || !s.set) return '这张陷阱已经发动过了';
  const d = CARDS[s.id];
  if (!d || d.k !== 'T') return '不是陷阱卡';
  if (s.turnSet >= G.turn) return '盖放的这一回合不能发动';
  const list = fx(d);
  if (list.length && list.every((f) => REACTIVE_TRAP.has(f.k))) return '这张是应对型陷阱：对方做出对应动作时，会先问你发不发动';
  if (p.trapLock) return '这个回合被「不存在之地」封住了陷阱';
  if (s.seal > 0) return '这张陷阱被暂时封印了（到对方回合结束）';
  if (!canFire(p, s)) return '命轮值不够付代价';
  return null;
}
export function activateTrap(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  const s = p.spells.find((x) => x && x.uid === uid);
  if (!s) return fail('找不到这张陷阱');
  const why = trapManualBlock(G, side, s);
  if (why) return fail(why);
  const d = CARDS[s.id];
  const cont = fx(d).some((f) => CONT_TRAP.has(f.k));
  fire(G, p, s, cont);
  if (counterTrap(G, 1 - side, 'trap')) {
    // 反制的反制：我盖着的护符把对方的「无效陷阱」顶回去，这张陷阱照常结算
    if (!trapGuard(G, p, { kind: 'chain', text: `对「${d.n}」的无效` })) { log(G, `「${d.n}」的发动被无效了`, 'trap'); return ok(); }
  }
  for (const f of fx(d)) {
    if (CONT_TRAP.has(f.k)) continue;        // 永续效果：翻开后由回合开始 / 结束时结算
    applyFx(G, p, f.k === 'trapBarrier' ? { k: 'barrier', v: f.v || 1 } : f, {});
    if (G.over) break;
  }
  checkOver(G);
  return ok();
}

// ---- 陷阱的自动迎击：本作的陷阱不设「是否发动」的询问，
// 满足条件就开（规则页里写明了）。这样玩家不用在每个时点被弹窗打断，
// AI 也不用模拟对手的犹豫。
function trapActive(p) {
  return p.spells.filter((s) => s && !s.set && CARDS[s.id] && CARDS[s.id].k === 'T');
}
function fire(G, owner, s, keep) {
  const d = CARDS[s.id];
  log(G, `${pname(owner)}发动陷阱「${d.n}」`, 'trap');
  // 有命轮代价的陷阱（造物那批「献血陷阱」）：发动时立刻付。
  // 付不起的那张不会被选中——见 canFire，四个分派点都过一遍。
  const cost = (d.cost && d.cost.lp) || 0;
  if (cost > 0) {
    log(G, `献出 ${cost} 点命轮值作为代价`, 'cost');
    damagePlayer(G, owner, cost, 'cost');
  }
  if (!keep) {
    owner.spells[owner.spells.indexOf(s)] = null;
    owner.grave.push(s.id);
  } else {
    s.set = false;
  }
  return d;
}

// 盖放的陷阱能不能开：有命轮代价的必须付得起（付完不能正好死）
// 反制反制：三种护符各管一种拆法，另外还有「温柯尔」这类在场就生效的守卫怪兽。
//   shieldSnipe  对方的效果要破坏我盖放的魔陷（百万蒙宠之眼 / 陨日 / 拆陷怪兽 / 攻击宣言拆牌）
//   shieldLock   对方要封锁 / 封印我的陷阱（不存在之地 / 苦咒缚 / 泰旖丝）
//   shieldNegate 对方用「无效陷阱」顶掉我刚发动的陷阱（只在这条连锁里用，没有询问窗口，满足就自动发动）
// kind: 'snipe' | 'lock' | 'chain'
const GUARD_FX = { snipe: 'shieldSnipe', lock: 'shieldLock', chain: 'shieldNegate' };
function trapGuard(G, owner, why) {
  // 在场的守卫怪兽（不消耗）：温柯尔——对方不能破坏 / 封印 / 封锁我盖放的陷阱
  if (why.kind !== 'chain' && owner.mons.some((m) => m && !m.set && hasFx(m, 'trapWard'))) {
    const w = owner.mons.find((m) => m && !m.set && hasFx(m, 'trapWard'));
    log(G, `「${CARDS[w.id].n}」守住了${why.text}`, 'trap');
    return true;
  }
  for (const s of owner.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T' || !fx(d).some((f) => f.k === GUARD_FX[why.kind] || f.k === 'shieldTraps') || !canFire(owner, s)) continue;
    if (why.kind !== 'chain' && !trapAllowed(G, owner, s)) continue;
    fire(G, owner, s, false);
    log(G, `「${d.n}」把${why.text}无效了`, 'trap');
    return true;
  }
  return false;
}

// 「波吕克斯」「奥吉尔」：在场上表侧表示时，把对方对我这一步发动的 1 张陷阱无效（每场每方限 1 次）
function negateTrapOnce(G, actorSide, trapOwner, s) {
  const actor = G.players[actorSide];
  if (!actor || (G.negUsed && G.negUsed[actorSide])) return false;
  const m = actor.mons.find((x) => x && !x.set && hasFx(x, 'negateTrapOnce'));
  if (!m) return false;
  (G.negUsed ||= {})[actorSide] = true;
  fire(G, trapOwner, s, false);
  log(G, `「${CARDS[m.id].n}」把「${CARDS[s.id].n}」的发动无效了`, 'trap');
  return true;
}

function canFire(owner, s) {
  if (owner.trapLock) return false;          // 被「不存在之地」封了：这个回合发不了陷阱
  if (s && s.seal > 0) return false;         // 被「苦咒缚」「泰旖丝」暂时封印的那一张
  const d = CARDS[s.id];
  const cost = (d && d.cost && d.cost.lp) || 0;
  return cost <= 0 || owner.lp > cost;
}

function counterTrap(G, side, trigger) {
  const p = G.players[side];
  for (const s of p.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T' || d.t !== 'counter') continue;
    if (!canFire(p, s) || !trapAllowed(G, p, s)) continue;
    const hit = fx(d).some((f) => (
      (trigger === 'spell' && (f.k === 'negateSpell' || f.k === 'negateSpellSnipe' || f.k === 'negateAny'))
      || (trigger === 'trap' && (f.k === 'negateTrap' || f.k === 'negateAny'))
      || (trigger === 'summon' && f.k === 'negateSummon')
    ));
    if (!hit) continue;
    fire(G, p, s, false);
    for (const f of fx(d)) {
      if (f.k === 'negateSpellSnipe') {
        const o = G.players[1 - side];
        const t = o.spells.find((x) => x && x.set);
        if (t && !trapGuard(G, o, { kind: 'snipe', text: '连带破坏盖放牌的效果' })) { o.spells[o.spells.indexOf(t)] = null; o.grave.push(t.id); log(G, `「${CARDS[t.id].n}」被连带破坏`, 'trap'); }
      }
    }
    return true;
  }
  return false;
}

// kind：'normal'（通常召唤/盖放）或 'special'（手牌特召、解放召唤、额外卡组直接落地、衍生物）。
// 反特召的两张陷阱只在这一步是「特殊召唤」时才认——不然它们就和「圣所钟声」没区别，
// 而「圣所钟声」是反击通常召唤用的，玩家手里攥着它的时候应该能分得清自己在防什么。
function summonTraps(G, p, mon, kind) {
  const o = G.players[1 - p.idx];
  const isSp = kind === 'special';
  for (const s of o.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    if (!canFire(o, s) || !trapAllowed(G, o, s)) continue;
    if (negateTrapOnce(G, p.idx, o, s)) continue;
    const f = fx(d);
    const neg = f.find((x) => x.k === 'negateSummon');
    const dst = f.find((x) => x.k === 'destroySummon');
    const negSp = isSp ? f.find((x) => x.k === 'negateSpecial') : null;
    const dstSp = isSp ? f.find((x) => x.k === 'destroySpecial') : null;
    if (neg || negSp) {
      const lockSp = negSp && negSp.spLock;
      fire(G, o, s, false);
      log(G, isSp ? `「${CARDS[mon.id].n}」的特殊召唤被无效` : `「${CARDS[mon.id].n}」的召唤被无效`, 'trap');
      removeMon(G, p, mon);
      p.grave.push(mon.id);
      // 捕网额外把这一整个回合的剩余特召也掐掉：1 换 1 拦不住铺场，得让它这一回合铺不下去
      if (lockSp) {
        p.spLock = Math.max(p.spLock, lockSp);
        log(G, `${pname(p)}这一回合不能再用特殊召唤`, 'trap');
      }
      return true;
    }
    if ((dst && atkOf(G, p, mon) <= (dst.v || 2000)) || dstSp) {
      fire(G, o, s, false);
      destroyMon(G, p, mon, '被陷阱破坏');
      // 「空位·回收令」这类：破坏之后自己摸一张，因为是 1 换 1 的交换，不给牌就没人愿意盖
      const dr = dstSp && dstSp.draw;
      if (dr) drawCards(G, o, dr);
      return true;
    }
  }
  // 永续魔法「沉于深渊」：对方每次召唤都要丢牌
  for (const s of o.spells) {
    if (!s || s.set) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'S') continue;
    for (const f of fx(d)) if (f.k === 'summonTaxDiscard') discardRandom(G, p, f.v || 1);
  }
  return false;
}

// ---- 「打过来才叫出来的替身」 ----
// 两张陷阱共用这套：tokenOnAttack 直接摆衍生物，summonOnAttack 按攻击者的等级
// 从卡组里拽一只（卡面写「等级比他低一级」——没有正好这一档的才退一步挑最高的）。
// 拉出来的怪一律守备表示、当回合不能攻击；它们唯一的作用就是挡在攻击路径上。
function guardToken(G, p, f) {
  const tid = f.id;
  if (!tid || !CARDS[tid]) return null;
  let n = f.v || 1;
  let first = null;
  while (n-- > 0) {
    const slot = freeSlot(p.mons);
    if (slot < 0) break;
    const mm = mkMon(G, tid, p.idx);
    mm.pos = f.pos === 'atk' ? 'atk' : 'def';
    mm.atkCount = 9;
    if (f.br) mm.br += f.br;
    p.mons[slot] = mm;
    if (!first) first = mm;
  }
  return first;
}

function guardSummon(G, p, atkMon, f) {
  const off = f.lv == null ? -1 : f.lv;
  const atkLv = (CARDS[atkMon.id] && CARDS[atkMon.id].lv) || 1;
  const cap = atkLv + off;
  if (cap < 1 || freeSlot(p.mons) < 0) return null;
  const pool = f.f === 'hand' ? p.hand.map((x) => x.id) : (f.f === 'grave' ? p.grave : p.deck);
  const cands = [];
  for (const cid of pool) {
    const cd = CARDS[cid];
    if (!cd || cd.k !== 'M' || cd.token) continue;
    if ((cd.lv || 0) > cap) continue;
    cands.push({ id: cid, lv: cd.lv || 0, def: cd.def || 0 });
  }
  if (!cands.length) return null;
  // 「低一级」优先正好这一档；卡组里没有才退一步挑能叫出来的最高等级
  let list = cands.filter((c) => c.lv === cap);
  if (!list.length) { list = cands; log(G, `卡组里没有等级 ${cap} 的怪兽，退而求其次`, 'info'); }
  list.sort((a, b) => (b.lv - a.lv) || (b.def - a.def));
  const pick = list[0];
  if (f.f === 'hand') p.hand.splice(p.hand.findIndex((x) => x.id === pick.id), 1);
  else if (f.f === 'grave') p.grave.splice(p.grave.indexOf(pick.id), 1);
  else p.deck.splice(p.deck.indexOf(pick.id), 1);
  const mm = mkMon(G, pick.id, p.idx);
  mm.pos = f.pos === 'atk' ? 'atk' : 'def';
  mm.atkCount = 9;
  p.mons[freeSlot(p.mons)] = mm;
  log(G, `${pname(p)}从${f.f === 'hand' ? '手牌' : f.f === 'grave' ? '墓地' : '卡组'}特殊召唤等级 ${pick.lv} 的「${CARDS[pick.id].n}」`, 'summon');
  return mm;
}

// 攻击宣言时点：先结算已发动的永续陷阱，再结算盖放的陷阱。
// 返回值：'destroyed'（攻击者没了）/ 'negated'（攻击无效）/ 'reflect'（伤害反弹）
//        / { st:'guard', uid }（叫出了替身，这一下改打它）/ null
function attackTraps(G, atkSide, atkMon, direct) {
  const defSide = 1 - atkSide;
  const def = G.players[defSide];

  for (const s of trapActive(def)) {
    const d = CARDS[s.id];
    for (const f of fx(d)) {
      if (f.k === 'contPunish') {
        heal(G, def, 500);
        damagePlayer(G, G.players[atkSide], f.v || 300, 'trap');
      }
    }
  }

  // 「艾尔瓦」：攻击时对方的陷阱不能发动
  if (hasFx(atkMon, 'trapImmune')) return null;
  for (const s of def.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    if (!canFire(def, s) || !trapAllowed(G, def, s)) continue;
    if (negateTrapOnce(G, atkSide, def, s)) continue;
    const list = fx(d);
    const neg = list.find((x) => x.k === 'negateAttack');
    const dst = list.find((x) => x.k === 'destroyAttacker');
    const ref = list.find((x) => x.k === 'reflect');
    const boost = list.find((x) => x.k === 'battleBoost');
    // 密契那批（bp07）用的三个新触发：给屏障 / 下毒 / 直接反伤
    const bar = list.find((x) => x.k === 'trapBarrier');
    const psn = list.find((x) => x.k === 'trapPoison');
    const tct = list.find((x) => x.k === 'trapCounter');
    const tcm = list.find((x) => x.k === 'trapCounterMon');
    if (neg) {
      fire(G, def, s, false);
      log(G, '那次攻击被无效了', 'trap');
      // 「临界点」这类反击陷阱：无效攻击之外还顺手封掉对方下个回合的攻击
      for (const f2 of list) if (f2.k === 'atkLock') applyFx(G, def, f2, {});
      return 'negated';
    }
    if (dst) {
      fire(G, def, s, false);
      destroyMon(G, G.players[atkSide], atkMon, '被陷阱破坏');
      return 'destroyed';
    }
    // 替身：叫一只出来挡在攻击路径上。直接攻击会被它顶掉——这才是这类牌的全部意义；
    // 打的是场上怪兽时只算铺场（那张卡面也这么写），所以这里 continue，让后面的陷阱继续判。
    const gs = list.find((x) => x.k === 'summonOnAttack');
    const gt = list.find((x) => x.k === 'tokenOnAttack');
    if (gs || gt) {
      const gm = gs ? guardSummon(G, def, atkMon, gs) : guardToken(G, def, gt);
      if (gm) {
        fire(G, def, s, false);
        log(G, `「${CARDS[gm.id].n}」挡在了攻击路径上`, 'trap');
        if (direct) return { st: 'guard', uid: gm.uid };
        continue;
      }
    }
    if (ref && direct) { fire(G, def, s, false); damagePlayer(G, G.players[atkSide], ref.v || 1000, 'trap'); return 'reflect'; }
    if (boost) { fire(G, def, s, false); applyFx(G, def, boost, {}); }
    // 屏障陷阱要在这一下真正结算之前挂上（所以不能 return，接着走战斗流程）
    if (bar) { fire(G, def, s, false); applyFx(G, def, { k: 'barrier', v: bar.v || 1 }, {}); }
    if (psn) { fire(G, def, s, false); applyFx(G, def, { k: 'poison', v: psn.v || 1 }, {}); }
    if (tct) { fire(G, def, s, false); damagePlayer(G, G.players[atkSide], tct.v || 800, 'trap'); }
    // 「断牙」：不反伤，直接把攻击者咬掉一截攻击力，咬到 0 就破坏它
    if (tcm) {
      fire(G, def, s, false);
      atkMon.atk = Math.max(0, atkMon.atk - (tcm.v || 800));
      log(G, `「${CARDS[atkMon.id].n}」被反击咬掉 ${tcm.v || 800} 点攻击力`, 'trap');
      if (atkOf(G, G.players[atkSide], atkMon) <= 0) return 'destroyed';
    }
  }
  return null;
}

// ------------------------------------------------------------------ 战斗
export function attack(G, side, monUid, targetUid) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'battle') return fail('现在不是战斗阶段');
  const a = p.mons.find((m) => m && m.uid === monUid);
  if (!a) return fail('找不到这只怪兽');
  if (!canAttack(G, p, a)) return fail('这只怪兽这个回合不能再攻击了');

  // 攻击力要先算出来：嘲讽的「灵活版」（tauntMax）是按攻击方多大来决定拦不拦的
  const av = atkOf(G, p, a);
  const guard = mustHitFirst(o, av);
  // target / direct 都要可写：替身陷阱会在结算前把「打脸」改成「打它」
  let target = targetUid ? o.mons.find((m) => m && m.uid === targetUid) : null;
  if (guard && (!target || target !== guard)) return fail('「' + CARDS[guard.id].n + '」挡在前面，必须先打它');
  if (!target && o.mons.filter(Boolean).length && !a.direct) return fail('对方场上有怪兽，不能直接攻击');
  if (target && guard && target !== guard) return fail('必须先处理挡在前面的怪兽');

  a.atkCount++;
  let direct = !target;

  // 攻击宣言效果（达芙黛尔之类）
  if (hasFx(a, 'snipeAttack')) {
    const s = o.spells.find((x) => x && x.set);
    if (s && !trapGuard(G, o, { kind: 'snipe', text: `「${CARDS[a.id].n}」破坏盖放牌的效果` })) { o.spells[o.spells.indexOf(s)] = null; o.grave.push(s.id); log(G, `「${CARDS[a.id].n}」破坏了盖放的「${CARDS[s.id].n}」`, 'monster'); }
  }

  const stop = attackTraps(G, side, a, direct);
  if (stop === 'destroyed' || G.over) return ok();
  // 替身陷阱：这一下原本是打脸，现在改成打那只新叫出来的守备怪
  if (stop && stop.st === 'guard') {
    const gm = o.mons.find((m) => m && m.uid === stop.uid);
    if (gm) { target = gm; direct = false; }
  }

  // 额外卡组那批的抗性与反制：被攻击时先过一遍，再进战斗结算。
  // 顺序按「先免掉、再反过来拆掉」，所以一只怪同时有两种本事时，
  // 每回合白白吃掉第一下，第二下才轮到拆人——这是「抗性」和「反制」的区别。
  if (target && stop !== 'negated' && stop !== 'reflect') {
    if (hasFx(target, 'negateAttackSelf') && !target.used.negAtk) {
      target.used.negAtk = true;
      log(G, `「${CARDS[target.id].n}」把这次攻击弹开了（这个回合不再有第二次）`, 'trap');
      return ok();
    }
    if (hasFx(target, 'destroyAttacker')) {
      log(G, `「${CARDS[target.id].n}」反过来咬住了攻击者！`, 'battle');
      destroyMon(G, p, a, '被反制破坏');
      return ok();
    }
  }

  if (direct) {
    if (stop === 'reflect') { log(G, `${pname(p)}的直接攻击被「忘却的代价」弹了回去`, 'trap'); return ok(); }
    if (stop === 'negated') return ok();
    log(G, `${pname(p)}直接攻击`, 'battle');
    damagePlayer(G, o, av, 'battle');
    if (hasFx(a, 'directDiscard') && fxV(a, 'directDiscard')) discardRandom(G, o, fxV(a, 'directDiscard'));
    afterBattleDamage(G, p, o, a, av);
    return ok();
  }

  if (stop === 'negated') return ok();
  if (stop === 'reflect') { log(G, '那次攻击被「忘却的代价」弹了回去', 'trap'); return ok(); }

  // 只拦一次的嘲讽：这一下真打上了才算用掉，本回合剩下的小怪就能绕开它
  if (guard === target && hasFx(target, 'tauntOnce')) target.used.taunt = true;

  const wasSet = target.set;
  if (wasSet) {
    target.set = false;
    log(G, `盖放的「${CARDS[target.id].n}」被翻开了`, 'info');
  }
  const dv = target.pos === 'atk' ? atkOf(G, o, target) : defOf(G, o, target);

  if (target.pos === 'atk') {
    // 攻击表示互殴
    if (av > dv) {
      const diff = av - dv;
      destroyMon(G, o, target, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」破坏了「${CARDS[target.id].n}」`, 'battle');
      if (hasFx(target, 'reflectAtk')) {
        log(G, `「${CARDS[target.id].n}」把 ${diff} 点战斗伤害弹了回去`, 'trap');
        damagePlayer(G, p, diff, 'battle');
      } else damagePlayer(G, o, diff, 'battle');
      afterKill(G, p, o, a);
      afterBattleDamage(G, p, o, a, diff);
    } else if (av < dv) {
      const diff = dv - av;
      destroyMon(G, p, a, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」被「${CARDS[target.id].n}」击破`, 'battle');
      damagePlayer(G, p, diff, 'battle');
    } else {
      destroyMon(G, o, target, '同归于尽');
      destroyMon(G, p, a, '同归于尽');
      log(G, '两只怪兽同归于尽', 'battle');
    }
  } else {
    // 打守备
    if (av > dv) {
      const diff = av - dv;
      destroyMon(G, o, target, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」破坏了守备的「${CARDS[target.id].n}」`, 'battle');
      if (hasFx(a, 'pierce')) {
        log(G, '贯穿！', 'battle');
        if (hasFx(target, 'reflectAtk')) {
          log(G, `「${CARDS[target.id].n}」把贯穿伤害弹了回去`, 'trap');
          damagePlayer(G, p, diff, 'battle');
        } else damagePlayer(G, o, diff, 'battle');
        afterBattleDamage(G, p, o, a, diff);
      }
      afterKill(G, p, o, a);
    } else if (av < dv) {
      const diff = dv - av;
      log(G, '攻击被挡下了', 'battle');
      damagePlayer(G, p, diff, 'battle');
    } else {
      log(G, '攻击力与守备力相同，什么也没发生', 'info');
    }
  }
  // 反击：被攻击的怪兽还手。默认打攻击方的命轮值（counter），
  // 写了 on:'mon' 的打攻击方怪兽本身（削攻击力，削到 0 就破坏）——
  // 后者是「以牙还牙」那套牌的核心，用来逼对手的大怪自己烂掉。
  // 这里不检查「它是不是已经被破坏了」——反击流的意义就是「打它要付代价」，
  // 加上这个判断之后整套牌就变成「挨打前先死」，等于没有反击。
  const cf = monFx(target).find((x) => x.k === 'counter');
  const cv = cf ? (cf.v || 0) : 0;
  if (cv > 0) {
    if (cf.on === 'mon') {
      log(G, `「${CARDS[target.id].n}」反击，咬住了「${CARDS[a.id].n}」！`, 'battle');
      a.atk = Math.max(0, a.atk - cv);
      if (atkOf(G, p, a) <= 0) destroyMon(G, p, a, '被反击耗尽');
      else log(G, `「${CARDS[a.id].n}」攻击力 -${cv}`, 'damage');
    } else {
      log(G, `「${CARDS[target.id].n}」反击！`, 'battle');
      damagePlayer(G, p, cv, 'effect');
    }
    const boost = fxV(target, 'counterBoost');
    if (boost) { target.atk += boost; log(G, `「${CARDS[target.id].n}」越打越硬，攻击力 +${boost}`, 'buff'); }
    const cdr = fxV(target, 'counterDraw');
    if (cdr) drawCards(G, o, cdr);
  }
  return ok();
}

function afterKill(G, p, o, a) {
  if (hasFx(a, 'onKillAtk')) { a.atk += fxV(a, 'onKillAtk'); log(G, `「${CARDS[a.id].n}」攻击力永久 +${fxV(a, 'onKillAtk')}`, 'buff'); }
  if (hasFx(a, 'onKillDraw')) drawCards(G, p, fxV(a, 'onKillDraw'));
}

function afterBattleDamage(G, p, o, a, dmg) {
  if (hasFx(a, 'drain')) {
    const pct = fxV(a, 'drain') || 100;
    const h = Math.floor(dmg * pct / 100);
    if (h > 0) { heal(G, p, h); }
  }
}

// ------------------------------------------------------------------ 觉醒召唤
// 素材可以从「场上」或「手牌」来。
// 只认场上的话：三格场地 + 30 张卡组，两只指定怪兽同时站住的概率低到可怜，
// 自测 200 局里只成功觉醒过 1 次——那等于额外卡组从来没有参与过对局。
export function canAwaken(G, p, extraId) {
  const d = CARDS[extraId];
  if (!d || d.k !== 'E') return null;
  if (p.extra.indexOf(extraId) < 0) return null;
  if (G.active !== p.idx || G.phase !== 'main' || G.over) return null;
  // 觉醒也是特殊召唤，一样被「被囚禁的疯狂」按住
  if (p.lock && p.lock.sum > 0) return null;
  // 素材必须都在自己场上：以前手牌（甚至墓地）里的牌也能当素材，觉醒就变成「谁先抽到两张素材」，
  // 场上怎么打都无所谓了。现在得先把素材叫上场（通常召唤，或者怪兽卡自带的「特殊召唤」，后者不占通常召唤）。
  const pool = [];
  for (const m of p.mons) if (m && !m.set) pool.push({ uid: m.uid, id: m.id, src: 'field' });

  if (d.matRealm === 'any') {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (realmOf(pool[i].id) === realmOf(pool[j].id)) continue;
        return [pool[i], pool[j]];
      }
    }
    return null;
  }
  const need = (d.mat || []).slice();
  if (!need.length) return null;          // 没有素材的额外卡（直接召唤那批）走 directSummon，不是觉醒
  const picked = [];
  for (const name of need) {
    const m = pool.find((x) => CARDS[x.id].n === name && picked.indexOf(x) < 0);
    if (!m) return null;
    picked.push(m);
  }
  return picked;
}

export function awaken(G, side, extraId) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段觉醒召唤');
  const mats = canAwaken(G, p, extraId);
  if (!mats) return fail('素材还没凑齐：觉醒的素材必须都在自己场上');
  const d = CARDS[extraId];
  // 素材本身就是位置：先把它们送墓，再拿空位（满场也能觉醒）
  for (const x of mats) {
    if (x.src === 'grave') {
      // 墓地素材用完还是留在墓地：本作没有「除外区」，真拿走就等于少一张牌。
      log(G, `「${CARDS[x.id].n}」从墓地作为觉醒素材被用掉`, 'grave');
      continue;
    }
    if (x.src === 'field') {
      const m = p.mons.find((mm) => mm && mm.uid === x.uid);
      if (m) {
        removeMon(G, p, m);
        toGrave(G, p, m, '觉醒素材');
      }
      continue;
    }
    const hi = p.hand.findIndex((h) => h.uid === x.uid);
    if (hi >= 0) {
      const card = p.hand.splice(hi, 1)[0];
      p.grave.push(card.id);
      log(G, `「${CARDS[card.id].n}」从手牌作为觉醒素材送去墓地`, 'grave');
    }
  }
  const slot = freeSlot(p.mons);
  if (slot < 0) return fail('怪兽区已经满了，先腾一个位置');
  p.extra.splice(p.extra.indexOf(extraId), 1);
  const mon = mkMon(G, extraId, side);
  // 刚醒过来的人这一回合还不能动手：否则 3300 的觉醒体落下来就能直接打脸，
  // 三格场地一清空，一回合 6000+ 的直伤把对局变成了「谁先抽到素材」。
  mon.atkCount = 9;
  p.mons[slot] = mon;
  log(G, `${pname(p)}觉醒召唤「${d.n}」！`, 'awaken');
  if (d.matRealm === 'any') {
    // 校猫：登场时猫叫一声，抽一张、对手丢一张，已经在 fx 里
  }
  triggerSummonFx(G, p, mon);
  return ok();
}

// ------------------------------------------------------------------ 回合
// ---- 手牌的「特殊召唤」----
// 觉醒体的素材必须在场上，所以给素材角色各自一种「不占通常召唤」的上场办法，写在怪兽卡的 sp 里：
//   sp: { cond: 'emptyField' }          自己场上没有怪兽时
//   sp: { cond: 'oppMore' }             对方场上的怪兽比自己多时
//   sp: { cond: 'sameRealm' }           自己场上有同界域的怪兽时
//   sp: { cond: 'lp', v: N }            献出 N 点命轮值
//   sp: { cond: 'tribute', v: N }       解放自己场上 1 只怪兽 + 献出 N 点命轮值（给 6 级以上的大个子，免掉 1~2 只祭品）
// 每回合最多 2 次（SP_PER_TURN），特殊召唤的怪兽当回合不能攻击（和觉醒体一样）。对方的召唤陷阱照样能响应。
//
// 这两句以前只写在注释里：spCount 有初始化、有每回合归零，但**从来没有人读它**，
// 于是「手牌特召不占通常召唤」等于没有次数上限——只要手牌够、怪兽区有空位，
// 一回合能连着把 3 只大个子摊上场，这就是「特招速攻速通」的根。上限补上之后，
// 第 3 次要点按钮会被拒绝，AI 的 bestSpecial 也会自动跳过。
export const SP_PER_TURN = 2;

// 场地卡上对「特殊召唤」的修正。只认场地（t: 'field'）：卡被顶掉、被拆掉，效果立刻失效。
//   spPlus  v=1    自己每回合能多特召几次
//   spCap   v=1    把**对方**每回合的特召次数压到 v 次（限制型场地）
//   spAtk   v=300  自己特召出来的怪兽 +v 攻
//   spDraw  v=1    自己特召成功后抽 v 张
//   spTax   v=300  对方特召成功时受到 v 点伤害（限制型的另一种写法）
// 每次现算不缓存：场地说顶掉就顶掉，缓存反而容易对不上。
function fieldFx(p, key) {
  let v = 0;
  for (const s of p.spells) {
    if (!s || !CARDS[s.id] || CARDS[s.id].t !== 'field') continue;
    for (const f of fx(CARDS[s.id])) if (f.k === key) v += f.v || 0;
  }
  return v;
}

// 这一方这回合还能特召几次：基础 2 次 + 自己场地的 spPlus，再被对方场地的 spCap 封顶。
export function spMaxOf(G, p) {
  const o = G.players[1 - p.idx];
  const cap = fieldFx(o, 'spCap');
  let n = SP_PER_TURN + fieldFx(p, 'spPlus');
  if (cap > 0) n = Math.min(n, cap);
  return Math.max(0, n);
}
export function spLeft(G, p) {
  return Math.max(0, spMaxOf(G, p) - (p.spCount || 0));
}
export function canSpecial(G, p, uid) {
  if (G.over || G.active !== p.idx || G.phase !== 'main') return null;
  if (p.lock && p.lock.sum > 0) return null;
  if (p.spLock > 0) return null;
  if (p.spCount >= spMaxOf(G, p)) return null;
  const h = p.hand.find((x) => x.uid === uid);
  const d = h && CARDS[h.id];
  if (!d || d.k !== 'M' || !d.sp) return null;
  const c = d.sp, o = G.players[1 - p.idx];
  const n = p.mons.filter(Boolean).length;
  if (c.cond === 'tribute') { if (n < 1 || p.lp <= (c.v || 0)) return null; return c; }
  if (freeSlot(p.mons) < 0) return null;
  if (c.cond === 'emptyField' && n > 0) return null;
  if (c.cond === 'oppMore' && !(o.mons.filter(Boolean).length > n)) return null;
  if (c.cond === 'sameRealm' && !p.mons.some((m) => m && !m.set && realmOf(m.id) === d.r)) return null;
  if (c.cond === 'lp' && p.lp <= (c.v || 0)) return null;
  return c;
}
export function specialSummon(G, side, uid, tribUid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段特殊召唤');
  const c = canSpecial(G, p, uid);
  if (!c) return fail('现在满足不了这张牌的特殊召唤条件');
  const hi = p.hand.findIndex((x) => x.uid === uid);
  const id = p.hand[hi].id, d = CARDS[id];
  if (c.cond === 'tribute') {
    const t = p.mons.find((m) => m && m.uid === tribUid);
    if (!t) return fail('要解放自己场上的 1 只怪兽');
    p.mons[p.mons.indexOf(t)] = null;
    toGrave(G, p, t, '特殊召唤的代价');
  }
  if (c.cond === 'lp' || c.cond === 'tribute') {
    const lp = c.v || 0;
    if (lp > 0) { log(G, `献出 ${lp} 点命轮值作为代价`, 'cost'); damagePlayer(G, p, lp, 'cost'); if (G.over) return ok(); }
  }
  p.hand.splice(hi, 1);
  // 宣言即计入：后面即使被「圣所钟声」这类召唤陷阱无效掉，这一次也算用掉了（规则一致）
  p.spCount++;
  const o = G.players[1 - side];
  const mon = mkMon(G, id, side);
  // 场地：自己特招出来的怪兽加攻。加在实例上，离场就没了——场地本身也占一格，等于拿一格换这段压制。
  const buff = fieldFx(p, 'spAtk');
  if (buff > 0) { mon.atk += buff; mon.fieldAtk = buff; }
  const slot = freeSlot(p.mons);
  p.mons[slot < 0 ? 0 : slot] = mon;
  mon.atkCount = 9;     // 特殊召唤是白送的一个身位：当回合不能攻击（和觉醒体一样），否则就是每回合白赚一脚
  log(G, `${pname(p)}特殊召唤「${d.n}」（${REALM[d.r].n} · ${atkOf(G, p, mon)}/${defOf(G, p, mon)}）`, 'summon');
  const killed = summonTraps(G, p, mon, 'special');
  if (!killed && !mon.set) triggerSummonFx(G, p, mon);
  if (!killed) {
    // 场地：特召成功就抽牌（强化）／对方特召成功我收税（限制），两条都由场地方的光环判定
    const dr = fieldFx(p, 'spDraw');
    if (dr > 0) { log(G, `「${pname(p)}」的场地让这次特召换来 ${dr} 张牌`, 'draw'); drawCards(G, p, dr); }
    const tax = fieldFx(o, 'spTax');
    if (tax > 0) {
      log(G, `场地反噬：${pname(p)}特召的代价是 ${tax} 点命轮值`, 'effect');
      damagePlayer(G, p, tax, 'effect');
    }
  }
  return ok();
}

// ---- 陷阱的询问 ----
// 应对型陷阱（无效攻击 / 召唤 / 魔法、反击伤害、屏障…）满足条件时，不再替持有者决定：
// 界面在对方动作结算之前，用 eligibleTraps 问出「现在有哪几张能发动」，让持有者挑，再把结果写进 G.trapPolicy[持有者] = Set(uid)
// 后面各个触发点只发动 Set 里的那几张。没设 policy（AI 持有、好友房）仍然是满足条件就自动发动。
function trapAllowed(G, owner, s) {
  const pol = G.trapPolicy && G.trapPolicy[owner.idx];
  return !pol || pol.has(s.uid);
}
// summonOnAttack / tokenOnAttack：攻击宣言时「叫一只怪挡在面前」。
// 它们也要走询问窗口——不然玩家盖着替身陷阱却从来不会被问，等于白盖。
const ATK_REACT = ['negateAttack', 'destroyAttacker', 'summonOnAttack', 'tokenOnAttack', 'reflect', 'battleBoost', 'trapBarrier', 'trapPoison', 'trapCounter', 'trapCounterMon'];
/** 行动者 side 要做动作 a：对方（陷阱持有者）有哪几张盖着的陷阱现在能响应。返回 [{ uid, id }] */
export function eligibleTraps(G, side, a) {
  const me = G.players[side], o = G.players[1 - side], out = [];
  if (!a || G.over) return out;
  let direct = false;
  if (a.t === 'attack') {
    const m = me.mons.find((x) => x && x.uid === a.uid);
    if (!m || !canAttack(G, me, m)) return out;
    direct = a.target == null;
  }
  for (const s of o.spells) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T' || !canFire(o, s)) continue;
    const ks = fx(d).map((f) => f.k);
    let hit = false;
    if (a.t === 'attack') hit = ks.some((k) => ATK_REACT.includes(k) && (k !== 'reflect' || direct));
    else if (a.t === 'summon' || a.t === 'special') {
      hit = ks.includes('negateSummon') || ks.includes('destroySummon');
      // 反特召那两张只在特殊召唤时点亮：牌摆在盖牌区，玩家要能一眼看出「这张现在能不能用」
      if (!hit && a.t === 'special') hit = ks.includes('negateSpecial') || ks.includes('destroySpecial');
    }
    else if (a.t === 'spell') hit = ks.includes('negateSpell') || ks.includes('negateSpellSnipe') || ks.includes('negateAny');
    else if (a.t === 'activateTrap') hit = ks.includes('negateTrap') || ks.includes('negateAny');
    // 护符：对方这一步的牌带「破坏盖放陷阱 / 封锁陷阱」的效果时可以响应（shieldNegate 只在连锁里自动用，不弹询问）
    const wantSnipe = ks.includes('shieldSnipe') || ks.includes('shieldTraps'), wantLock = ks.includes('shieldLock') || ks.includes('shieldTraps');
    if (!hit && (wantSnipe || wantLock)) {
      const cardOf = (uid) => { const h = me.hand.find((x) => x.uid === uid); return h && CARDS[h.id]; };
      let c = null;
      if (a.t === 'spell' || a.t === 'summon' || a.t === 'special') c = cardOf(a.uid);
      else if (a.t === 'attack') { const m = me.mons.find((x) => x && x.uid === a.uid); c = m && CARDS[m.id]; }
      else if (a.t === 'activateTrap') { const sp = me.spells.find((x) => x && x.uid === a.uid); c = sp && CARDS[sp.id]; }
      const SN = ['snipe', 'snipeDraw', 'snipeAttack', 'snipeAll', 'negateSpellSnipe'], LK = ['trapLock', 'trapSeal'];
      hit = !!c && fx(c).some((f) => (wantSnipe && SN.includes(f.k)) || (wantLock && LK.includes(f.k)));
    }
    if (hit) out.push({ uid: s.uid, id: s.id });
  }
  return out;
}

// ---- 额外卡组的「直接召唤」（bp16 起）----
// 和觉醒召唤的分工：觉醒要凑素材名（两张指定的人），直接召唤只看场面条件
// 或命轮值。它不占通常召唤，但每回合只能用一次，而且当回合不能攻击——
// 不然「场上两只怪 → 白叫一只 2600」就是每回合白赚一脚。
// 卡面写法：direct: { cond: 'mons2', v?: N }  免费条件召唤
//           direct: { lp: 2000 }              直接收命轮值
export function canDirect(G, p, extraId) {
  const d = CARDS[extraId];
  if (!d || d.k !== 'E' || !d.direct) return null;
  if (G.over || G.active !== p.idx || G.phase !== 'main') return null;
  if (p.lock && p.lock.sum > 0) return null;       // 直接召唤也算「召唤」
  if (p.extra.indexOf(extraId) < 0 || p.directUsed) return null;
  const c = d.direct;
  // 「自己场上有 3 只怪兽」这个条件本身就把怪兽区填满了，再要求「有空位」等于永远召不出来
  // （怪兽区只有 3 格）。这类卡允许自己腾位置：召唤时解放自己最弱的那只，见 directSummon。
  if (freeSlot(p.mons) < 0 && c.cond !== 'mons3') return null;
  const lp = c.lp || 0;
  if (lp > 0 && p.lp <= lp) return null;
  if (c.cond === 'mons2' && p.mons.filter(Boolean).length < 2) return null;
  if (c.cond === 'mons3' && p.mons.filter(Boolean).length < 3) return null;
  if (c.cond === 'graveMagic3' && p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'S').length < (c.v || 3)) return null;
  if (c.cond === 'graveMon3' && p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'M').length < (c.v || 3)) return null;
  if (c.cond === 'spell1' && !p.spells.some((s) => s && !s.set)) return null;
  if (c.cond === 'lpHalf' && p.lp > p.lpMax / 2) return null;
  return c;
}

export function directSummon(G, side, extraId) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段召唤');
  const c = canDirect(G, p, extraId);
  if (!c) return fail('条件还没满足');
  const d = CARDS[extraId];
  const lp = c.lp || 0;
  if (lp > 0) {
    log(G, `献出 ${lp} 点命轮值作为代价`, 'cost');
    damagePlayer(G, p, lp, 'cost');
    if (G.over) return ok();
  }
  p.extra.splice(p.extra.indexOf(extraId), 1);
  p.directUsed = true;
  const mon = mkMon(G, extraId, side);
  mon.atkCount = 9;
  // 「场上 3 只」那类：场是满的，把最弱的一只解放掉腾出位置（否则没有格子放它）
  if (freeSlot(p.mons) < 0) {
    const weak = p.mons.filter(Boolean).sort((x, y) => atkOf(G, p, x) - atkOf(G, p, y))[0];
    if (weak) {
      log(G, `「${CARDS[weak.id].n}」被解放，给「${d.n}」让出位置`, 'cost');
      p.mons[p.mons.indexOf(weak)] = null;
      toGrave(G, p, weak, '作为直接召唤的解放');
    }
  }
  p.mons[freeSlot(p.mons)] = mon;
  log(G, `${pname(p)}直接召唤「${d.n}」！`, 'awaken');
  // 直接召唤也是特殊召唤的一种，同样要吃对方的召唤陷阱。
  // 以前这里直接 triggerSummonFx 就结束了——额外卡组那批「付够命轮值/凑够场面就落地」的怪
  // 因此完全免疫所有反制，一条没有对手能拦的路，速攻铺场当然推得平。
  if (summonTraps(G, p, mon, 'special')) return ok();
  triggerSummonFx(G, p, mon);
  return ok();
}

export function beginTurn(G) {
  const p = G.players[G.active];
  G.phase = 'main';
  p.normalUsed = false;
  p.normalExtra = 0;
  p.directUsed = false;
  for (const q of G.players) { q.trapLock = false; for (const s of q.spells) if (s && s.seal > 0) s.seal--; }      // 「不存在之地」只管一个回合；封印数着回合掉
  p.spCount = 0;
  for (const m of p.mons) {
    if (!m) continue;
    m.atkCount = 0; m.tmpAtk = 0; m.tmpDef = 0; m.direct = false;
    m.used.taunt = false;   // tauntOnce：每回合重新给一次拦截机会
    m.used.negAtk = false;  // negateAttackSelf：每回合能弹开一次攻击
  }

  // 回合横幅要排在回合开始效果前面，不然「+200」会记到上一回合名下
  log(G, `—— 第 ${Math.ceil(G.turn / 2)} 回合 · ${pname(p)} ——`, 'turn');
  // 中毒：挂在自己身上的层数，回合开始扣血，然后掉一层（不衰减的话叠到 20 层就是一击必杀）
  if (p.psn > 0) {
    const dmg = p.psn * 100;
    const left = p.psn - 1;
    log(G, `中毒发作：${pname(p)}失去 ${dmg} 点命轮值（余 ${left} 层）`, 'damage');
    p.psn = left;
    damagePlayer(G, p, dmg, 'effect');
    if (G.over) return;
  }
  // 回合开始效果
  for (const m of p.mons) {
    if (!m) continue;
    // 中毒（怪兽）：攻守一起掉，掉到 0/0 就化掉。守备大墙最怕这个。
    if (m.psn > 0) {
      const cut = m.psn * 100;
      m.atk = Math.max(0, m.atk - cut);
      m.def = Math.max(0, m.def - cut);
      m.psn--;
      log(G, `「${CARDS[m.id].n}」中毒，攻守 -${cut}（余 ${m.psn} 层）`, 'damage');
      if (m.atk <= 0 && m.def <= 0) { destroyMon(G, p, m, '被中毒耗尽'); continue; }
    }
    if (m.bld > 0) {
      // 流血：怪兽没有血量，所以把持续伤害记在攻击力上（每回合 -100×层数，层数同时递减）
      const cut = m.bld * 100;
      m.atk = Math.max(0, m.atk - cut);
      m.bld--;
      log(G, `「${CARDS[m.id].n}」流血，攻击力 -${cut}（余 ${m.bld} 层）`, 'damage');
    }
    if (hasFx(m, 'turnHeal')) heal(G, p, fxV(m, 'turnHeal'));
    if (hasFx(m, 'atkUpTurn')) { m.atk += fxV(m, 'atkUpTurn'); log(G, `「${CARDS[m.id].n}」攻击力 +${fxV(m, 'atkUpTurn')}`, 'buff'); }
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) {
      if (f.k === 'contBoth') { heal(G, p, f.v || 300); damagePlayer(G, G.players[1 - p.idx], f.v || 300, 'effect'); }
      // 永续魔法版的毒/屏障/流血（命轮那批），复用同一套结算
      if (f.k === 'contPoison') applyFx(G, p, { k: 'poison', v: f.v || 1 }, {});
      if (f.k === 'contBleed') applyFx(G, p, { k: 'bleed', v: f.v || 1 }, {});
      if (f.k === 'contBarrier') applyFx(G, p, { k: 'barrier', v: f.v || 1 }, {});
      if (f.k === 'extraNormal') applyFx(G, p, { k: 'extraNormal', v: f.v || 1 }, {});
    }
  }
  if (G.over) return;

  // 抽卡（先手第一回合不抽）
  let n = 1;
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'extraDraw') n += f.v || 0;
  }
  if (!(G.turn === 1 && G.active === 0)) drawCards(G, p, n);
  checkOver(G);
}

export function endTurn(G) {
  if (G.over) return fail('对决已经结束了');
  const p = G.players[G.active];
  const o = G.players[1 - G.active];

  // 结束阶段：永续回复 / 持续伤害
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'contHeal') heal(G, p, f.v || 0);
  }
  for (const b of p.bonds) for (const f of b.fx || []) if (f.k === 'healPerTurn') heal(G, p, f.v || 0);
  // 对方的「终天之诗」在自己的回合结束时烧人
  for (const s of o.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'contBurn') damagePlayer(G, p, f.v || 0, 'trap');
  }
  if (G.over) return ok();

  // 压制按「自己的回合」计数：这一回合用掉的封锁在这里减一。
  // 所以对方在你回合封你一次，正好停掉你接下来的这一整个回合。
  if (p.lock) {
    p.lock.atk = Math.max(0, p.lock.atk - 1);
    p.lock.sum = Math.max(0, p.lock.sum - 1);
    p.lock.sp = Math.max(0, p.lock.sp - 1);
  }
  if (p.spLock > 0) p.spLock--;
  if (o.spLock > 0) o.spLock--;

  G.turn++;
  G.active = 1 - G.active;
  beginTurn(G);
  return ok();
}

export function toBattle(G, side) {
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('现在不是主要阶段');
  G.phase = 'battle';
  log(G, `${pname(G.players[side])}进入战斗阶段`, 'info');
  return ok();
}

export function toMain2(G, side) {
  if (G.active !== side) return fail('现在不是你的回合');
  G.phase = 'main';
  return ok();
}

export function changePos(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段改变表示');
  const m = p.mons.find((x) => x && x.uid === uid);
  if (!m) return fail('找不到这只怪兽');
  if (m.set) { m.set = false; m.pos = 'def'; log(G, `「${CARDS[m.id].n}」翻开了`, 'info'); return ok(); }
  m.pos = m.pos === 'atk' ? 'def' : 'atk';
  log(G, `「${CARDS[m.id].n}」改为${m.pos === 'atk' ? '攻击' : '守备'}表示`, 'info');
  return ok();
}

// 给 UI 用：这一页能看的信息（对手盖放的怪兽不暴露身份）
// ------------------------------------------------------------------ 动作
// 一套「可序列化的动作」。人机、同屏双人、好友房都从这一个入口进：
// 好友房把动作丢到房间里让对方重放，所以这里每个分支都必须只依赖 G 和参数
// （随机全部走 G.rng，seed 相同 + 动作序列相同 → 两边状态必然一致）。
export function applyAction(G, side, a) {
  if (!G || !a || !a.t) return fail('空动作');
  if (G.over) return fail('对决已经结束了');
  if (a.t === 'end' && G.active !== side) return fail('现在不是你的回合');
  switch (a.t) {
    case 'summon': return summon(G, side, a.uid, a.tribs || []);
    case 'setMon': return setMonster(G, side, a.uid);
    case 'spell': return activateSpell(G, side, a.uid, a.trib);
    case 'trap': return setTrap(G, side, a.uid);
    case 'activateTrap': return activateTrap(G, side, a.uid);
    case 'special': return specialSummon(G, side, a.uid, a.trib);
    case 'pos': return changePos(G, side, a.uid);
    case 'battle': return toBattle(G, side);
    case 'attack': return attack(G, side, a.uid, a.target == null ? null : a.target);
    case 'awaken': return awaken(G, side, a.id);
    case 'direct': return directSummon(G, side, a.id);
    case 'end': return endTurn(G);
    default: return fail('未知动作：' + a.t);
  }
}

export function publicView(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  const mons = (pl, hide) => pl.mons.map((m) => {
    if (!m) return null;
    const hidden = hide && m.set;
    return {
      uid: m.uid, id: hidden ? null : m.id, pos: m.pos, set: m.set,
      atk: hidden ? null : atkOf(G, pl, m),
      def: hidden ? null : defOf(G, pl, m),
      canAtk: !hide && canAttack(G, pl, m),
      guard: hidden ? false : hasFx(m, 'guard'),
      // 新机制的场上面板：屏障层数 / 流血层数 / 中毒层数 / 反击值 / 嘲讽三档
      br: hidden ? 0 : m.br,
      bld: hidden ? 0 : m.bld,
      psn: hidden ? 0 : m.psn,
      ctr: hidden ? 0 : fxV(m, 'counter'),
      ctrOnMon: hidden ? false : ((monFx(m).find((x) => x.k === 'counter') || {}).on === 'mon'),
      taunt: hidden ? false : hasFx(m, 'taunt'),
      tauntCap: hidden ? 0 : fxV(m, 'tauntMax'),
      tauntOnce: hidden ? false : hasFx(m, 'tauntOnce'),
      // bp18 的抗性 / 反制：界面要挂徽标，不然玩家算不出「这一下撞上去会不会白给」
      negAtk: hidden ? false : (hasFx(m, 'negateAttackSelf') && !m.used.negAtk),
      hate: hidden ? false : hasFx(m, 'destroyAttacker'),
      refl: hidden ? false : hasFx(m, 'reflectAtk'),
      immune: hidden ? false : hasFx(m, 'unaffected'),
    };
  });
  return {
    turn: G.turn, phase: G.phase, active: G.active, over: G.over, winner: G.winner,
    me: {
      lp: p.lp, lpMax: p.lpMax, deck: p.deck.length, hand: p.hand, mons: mons(p, false),
      spells: p.spells, grave: p.grave.length, extra: p.extra, bonds: p.bonds, normalUsed: p.normalUsed,
      normalExtra: p.normalExtra, directUsed: p.directUsed,
      psn: p.psn, br: p.br, lock: p.lock, trapLock: !!p.trapLock,
    },
    op: {
      lp: o.lp, lpMax: o.lpMax, deck: o.deck.length, hand: o.hand.length,
      mons: mons(o, true),
      spells: o.spells.map((s) => (s ? { uid: s.uid, id: s.set ? null : s.id, set: s.set } : null)),
      grave: o.grave.length, extra: o.extra.length, bonds: o.bonds, directUsed: o.directUsed,
      psn: o.psn, br: o.br, lock: o.lock, trapLock: !!o.trapLock,
    },
    log: G.log.slice(-40),
  };
}
