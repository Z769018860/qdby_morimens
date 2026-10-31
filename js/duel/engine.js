// 《忘却前夜 · 唤醒王：决斗链接》规则引擎。
//
// 这一层不碰 DOM：所有操作都是 (状态, 参数) → 改状态 + 往 G.log 追加日志，
// 返回 { ok, err }。网页（view.js）和 AI（ai.js）都只是调用它，
// 所以同一套规则可以被人和机器共用，也方便在 node 里无头跑自测。
import { CARDS, BONDS } from './gen.js';

export const LP_MAX = 8000;
export const ZONES = 3;
export const HAND_MAX = 7;
export const REALM = {
  chaos: { n: '混沌', en: 'CHAOS', c: '#e8656f' },
  caro: { n: '血肉', en: 'CARO', c: '#d98b6a' },
  aqua: { n: '深海', en: 'AQUOR', c: '#5b9bd5' },
  ultra: { n: '超维', en: 'ULTRA', c: '#e3b341' },
  any: { n: '无界', en: 'NONE', c: '#8a93a8' },
};

// 怪兽卡里「召唤成功时」才结算的效果；其余（贯穿、守备、光环……）是静态的，
// 只要在场就一直生效，不在召唤时执行。
const SUMMON_FX = new Set([
  'draw', 'burn', 'heal', 'discardOpp', 'recall', 'search', 'bounce',
  'snipe', 'weaken', 'pumpSelf', 'costLp', 'destroyStrongest', 'bothDraw',
  // 沙耶：墓地怪兽数量 × 回复，只有她在怪兽上用了这条（以前 graveHeal 只做过魔法卡）
  'graveHeal',
]);

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
  G.log.push({ text, kind: kind || 'info', turn: G.turn });
  if (G.log.length > 120) G.log.shift();
}

// ------------------------------------------------------------------ 建局
function mkPlayer(G, idx, def) {
  const p = {
    idx, lp: LP_MAX, lpMax: LP_MAX,
    deck: [], hand: [], mons: [null, null, null], spells: [null, null, null],
    grave: [], extra: [], bonds: [], normalUsed: false,
  };
  for (const pair of def.cards || []) {
    for (let i = 0; i < pair[1]; i++) p.deck.push(pair[0]);
  }
  shuffle(G, p.deck);
  p.extra = (def.extra || []).slice();
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
  for (const p of G.players) drawCards(G, p, 5, true);

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

function hasFx(m, k) {
  return (CARDS[m.id].fx || []).some((f) => f.k === k);
}
function fxV(m, k) {
  const f = (CARDS[m.id].fx || []).find((x) => x.k === k);
  return f ? f.v : 0;
}

export function maxAttacks(m) { return hasFx(m, 'twin') ? 2 : 1; }
export function canAttack(G, p, m) {
  return !!m && m.pos === 'atk' && !m.set && m.atkCount < maxAttacks(m) && !G.over;
}

function guardOf(p) {
  return p.mons.find((m) => m && !m.set && m.pos === 'def' && hasFx(m, 'guard'));
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
  if (p.normalUsed) return false;
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
  if (p.normalUsed) return fail('本回合已经通常召唤过了');
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
  p.normalUsed = true;
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
  p.normalUsed = true;
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
  return {
    uid: G.uid++, id, atk: d.atk, def: d.def, pos: 'atk', set: false,
    atkCount: 0, tmpAtk: 0, tmpDef: 0, equipAtk: 0, equipDef: 0,
    owner: side, used: {},
  };
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
      const t = strongest(o);
      if (t) {
        removeMon(G, o, t);
        log(G, `「${CARDS[t.id].n}」被弹回${pname(o)}的手牌`, 'spell');
        handAdd(G, o, t.id, '弹回');
      }
      break;
    }
    case 'snipe':
    case 'snipeDraw': {
      const s = o.spells.find((x) => x && x.set);
      if (s) {
        o.spells[o.spells.indexOf(s)] = null;
        o.grave.push(s.id);
        log(G, `${pname(p)}破坏了${pname(o)}盖放的「${CARDS[s.id].n}」`, 'spell');
      }
      if (f.k === 'snipeDraw') drawCards(G, p, 1);
      break;
    }
    case 'weaken': {
      const t = strongest(o);
      if (t) {
        t.atk = Math.max(0, t.atk - (f.v || 0));
        log(G, `「${CARDS[t.id].n}」攻击力下降 ${f.v}`, 'spell');
      }
      break;
    }
    case 'pumpSelf': if (mon) { mon.atk += f.v || 0; log(G, `「${CARDS[mon.id].n}」攻击力永久 +${f.v}`, 'buff'); } break;
    case 'destroyStrongest': {
      const t = strongest(o);
      if (t) destroyMon(G, o, t, '效果破坏');
      break;
    }
    case 'destroyWeak': {
      const t = strongest(o);
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
      for (const m of o.mons) if (m) m.tmpAtk -= f.v || 0;
      log(G, `${pname(o)}的全部怪兽本回合攻击力 -${f.v}`, 'spell');
      break;
    }
    case 'weakenHighest': {
      const t = strongest(o);
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
          if (m && atkOf(G, pl, m) <= (f.v || 1500)) destroyMon(G, pl, m, '效果破坏');
        }
      }
      break;
    }
    case 'discardOpp2': discardRandom(G, o, 2); break;
    case 'tradeDraw': drawCards(G, o, 1); drawCards(G, p, 2); break;
    case 'healDraw': heal(G, p, f.v || 1000); drawCards(G, p, 1); break;
    case 'reflect': break; // 由战斗流程处理
    case 'contHeal': case 'contBurn': case 'contBoth': case 'contPunish':
    case 'summonTaxDiscard': case 'extraDraw': case 'equipAtk': case 'equipDef':
    case 'turnHeal': case 'atkUpTurn': case 'onKillAtk': case 'onKillDraw':
    case 'onDestroyDraw': case 'onDestroyBurn': case 'revive': case 'lastStand':
    case 'pierce': case 'guard': case 'aura': case 'auraDef': case 'drain':
    case 'directDiscard': case 'snipeAttack': case 'negateTrapOnce': case 'spellShield':
    case 'twin': case 'destroyAttacker': case 'negateAttack': case 'negateSpell':
    case 'negateSummon': case 'destroySummon': case 'negateSpellSnipe': case 'negateTrap':
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
  p.grave.push(mon.id);
  log(G, `「${d.n}」${reason || '被破坏'}，送去墓地`, 'grave');
}

export function removeMon(G, p, mon) {
  const i = p.mons.indexOf(mon);
  if (i >= 0) p.mons[i] = null;
}

export function destroyMon(G, p, mon, reason) {
  if (!mon) return;
  const d = CARDS[mon.id];
  if (hasFx(mon, 'lastStand') && !mon.used.stand) {
    mon.used.stand = true;
    log(G, `「${d.n}」扛住了这一击，没有被战斗破坏`, 'buff');
    return;
  }
  if (hasFx(mon, 'revive') && !mon.used.revive) {
    mon.used.revive = true;
    removeMon(G, p, mon);
    log(G, `「${d.n}」回到${pname(p)}的手牌`, 'buff');
    handAdd(G, p, mon.id, '复活');
    return;
  }
  removeMon(G, p, mon);
  toGrave(G, p, mon, reason);
  for (const f of fx(d)) {
    if (f.k === 'onDestroyDraw') drawCards(G, p, f.v || 1);
    if (f.k === 'onDestroyBurn') damagePlayer(G, G.players[1 - p.idx], f.v || 0, 'effect');
  }
}

// ------------------------------------------------------------------ 魔法 / 陷阱
export function activateSpell(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段发动魔法');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'S') return fail('这不是魔法卡');
  const isCont = d.t === 'cont' || d.t === 'equip';
  if (isCont && freeSlot(p.spells) < 0) return fail('魔法·陷阱区已经满了');

  // 对方的反击陷阱
  if (counterTrap(G, 1 - side, 'spell')) {
    p.hand.splice(hi, 1);
    p.grave.push(id);
    return ok();
  }

  p.hand.splice(hi, 1);
  log(G, `${pname(p)}发动魔法「${d.n}」`, 'spell');

  if (isCont) {
    const slot = freeSlot(p.spells);
    const card = { uid: G.uid++, id, set: false, turnSet: G.turn, equipOn: 0 };
    if (d.t === 'equip') {
      const t = strongest(p);
      if (!t) { p.grave.push(id); log(G, `没有可以装备的怪兽，「${d.n}」落空`, 'info'); return ok(); }
      card.equipOn = t.uid;
      for (const f of fx(d)) {
        if (f.k === 'equipAtk') t.atk += f.v || 0;
        if (f.k === 'equipDef') { t.def += f.v || 0; t.equipDef += f.v || 0; }
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
    for (const f of fx(d)) applyFx(G, p, f, {});
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

// ---- 陷阱的自动迎击：本作的陷阱不设「是否发动」的询问，
// 满足条件就开（规则页里写明了）。这样玩家不用在每个时点被弹窗打断，
// AI 也不用模拟对手的犹豫。
function trapActive(p) {
  return p.spells.filter((s) => s && !s.set && CARDS[s.id] && CARDS[s.id].k === 'T');
}
function fire(G, owner, s, keep) {
  const d = CARDS[s.id];
  log(G, `${pname(owner)}发动陷阱「${d.n}」`, 'trap');
  if (!keep) {
    owner.spells[owner.spells.indexOf(s)] = null;
    owner.grave.push(s.id);
  } else {
    s.set = false;
  }
  return d;
}

function counterTrap(G, side, trigger) {
  const p = G.players[side];
  for (const s of p.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T' || d.t !== 'counter') continue;
    const hit = fx(d).some((f) => (
      (trigger === 'spell' && (f.k === 'negateSpell' || f.k === 'negateSpellSnipe'))
      || (trigger === 'trap' && f.k === 'negateTrap')
      || (trigger === 'summon' && f.k === 'negateSummon')
    ));
    if (!hit) continue;
    fire(G, p, s, false);
    for (const f of fx(d)) {
      if (f.k === 'negateSpellSnipe') {
        const o = G.players[1 - side];
        const t = o.spells.find((x) => x && x.set);
        if (t) { o.spells[o.spells.indexOf(t)] = null; o.grave.push(t.id); log(G, `「${CARDS[t.id].n}」被连带破坏`, 'trap'); }
      }
    }
    return true;
  }
  return false;
}

function summonTraps(G, p, mon) {
  const o = G.players[1 - p.idx];
  for (const s of o.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    const f = fx(d);
    const neg = f.find((x) => x.k === 'negateSummon');
    const dst = f.find((x) => x.k === 'destroySummon');
    if (neg) {
      fire(G, o, s, false);
      log(G, `「${CARDS[mon.id].n}」的召唤被无效`, 'trap');
      removeMon(G, p, mon);
      p.grave.push(mon.id);
      return true;
    }
    if (dst && atkOf(G, p, mon) <= (dst.v || 2000)) {
      fire(G, o, s, false);
      destroyMon(G, p, mon, '被陷阱破坏');
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

// 攻击宣言时点：先结算已发动的永续陷阱，再结算盖放的陷阱。
// 返回值：'destroyed'（攻击者没了）/ 'negated'（攻击无效）/ 'reflect'（伤害反弹）/ null
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

  for (const s of def.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    const list = fx(d);
    const neg = list.find((x) => x.k === 'negateAttack');
    const dst = list.find((x) => x.k === 'destroyAttacker');
    const ref = list.find((x) => x.k === 'reflect');
    const boost = list.find((x) => x.k === 'battleBoost');
    if (neg) { fire(G, def, s, false); log(G, '那次攻击被无效了', 'trap'); return 'negated'; }
    if (dst) {
      fire(G, def, s, false);
      destroyMon(G, G.players[atkSide], atkMon, '被陷阱破坏');
      return 'destroyed';
    }
    if (ref && direct) { fire(G, def, s, false); damagePlayer(G, G.players[atkSide], ref.v || 1000, 'trap'); return 'reflect'; }
    if (boost) { fire(G, def, s, false); applyFx(G, def, boost, {}); }
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

  const guard = guardOf(o);
  const target = targetUid ? o.mons.find((m) => m && m.uid === targetUid) : null;
  if (guard && (!target || target !== guard)) return fail('「' + CARDS[guard.id].n + '」挡在前面，必须先打它');
  if (!target && o.mons.filter(Boolean).length && !a.direct) return fail('对方场上有怪兽，不能直接攻击');
  if (target && guard && target !== guard) return fail('必须先处理守备的怪兽');

  a.atkCount++;
  const av = atkOf(G, p, a);
  const direct = !target;

  // 攻击宣言效果（达芙黛尔之类）
  if (hasFx(a, 'snipeAttack')) {
    const s = o.spells.find((x) => x && x.set);
    if (s) { o.spells[o.spells.indexOf(s)] = null; o.grave.push(s.id); log(G, `「${CARDS[a.id].n}」破坏了盖放的「${CARDS[s.id].n}」`, 'monster'); }
  }

  const stop = attackTraps(G, side, a, direct);
  if (stop === 'destroyed' || G.over) return ok();

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
      damagePlayer(G, o, diff, 'battle');
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
        damagePlayer(G, o, diff, 'battle');
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
  const pool = [];
  for (const m of p.mons) if (m) pool.push({ uid: m.uid, id: m.id, hand: false });
  for (const h of p.hand) {
    const c = CARDS[h.id];
    if (c && c.k === 'M') pool.push({ uid: h.uid, id: h.id, hand: true });
  }
  const fit = (picked) => {
    // 至少要有一只素材已经在场上：全是手牌的话，等于凭空多出一只大怪，
    // 这样觉醒就变成「抽到两张牌就白赚」，场上怎么打都无所谓了。
    return picked.some((x) => !x.hand);
  };

  if (d.matRealm === 'any') {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (realmOf(pool[i].id) === realmOf(pool[j].id)) continue;
        const picked = [pool[i], pool[j]];
        if (fit(picked)) return picked.map((x) => x.uid);
      }
    }
    return null;
  }
  const need = (d.mat || []).slice();
  const picked = [];
  for (const name of need) {
    const m = pool.find((x) => CARDS[x.id].n === name && picked.indexOf(x) < 0);
    if (!m) return null;
    picked.push(m);
  }
  return fit(picked) ? picked.map((x) => x.uid) : null;
}

export function awaken(G, side, extraId) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段觉醒召唤');
  const mats = canAwaken(G, p, extraId);
  if (!mats) return fail('素材还没凑齐');
  const d = CARDS[extraId];
  // 素材本身就是位置：先把它们送墓，再拿空位（满场也能觉醒）
  for (const u of mats) {
    const m = p.mons.find((x) => x && x.uid === u);
    if (m) {
      removeMon(G, p, m);
      toGrave(G, p, m, '觉醒素材');
      continue;
    }
    const hi = p.hand.findIndex((x) => x.uid === u);
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
export function beginTurn(G) {
  const p = G.players[G.active];
  G.phase = 'main';
  p.normalUsed = false;
  for (const m of p.mons) if (m) { m.atkCount = 0; m.tmpAtk = 0; m.tmpDef = 0; m.direct = false; }

  // 回合横幅要排在回合开始效果前面，不然「+200」会记到上一回合名下
  log(G, `—— 第 ${Math.ceil(G.turn / 2)} 回合 · ${pname(p)} ——`, 'turn');
  // 回合开始效果
  for (const m of p.mons) {
    if (!m) continue;
    if (hasFx(m, 'turnHeal')) heal(G, p, fxV(m, 'turnHeal'));
    if (hasFx(m, 'atkUpTurn')) { m.atk += fxV(m, 'atkUpTurn'); log(G, `「${CARDS[m.id].n}」攻击力 +${fxV(m, 'atkUpTurn')}`, 'buff'); }
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) {
      if (f.k === 'contBoth') { heal(G, p, f.v || 300); damagePlayer(G, G.players[1 - p.idx], f.v || 300, 'effect'); }
    }
  }

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
    case 'spell': return activateSpell(G, side, a.uid);
    case 'trap': return setTrap(G, side, a.uid);
    case 'pos': return changePos(G, side, a.uid);
    case 'battle': return toBattle(G, side);
    case 'attack': return attack(G, side, a.uid, a.target == null ? null : a.target);
    case 'awaken': return awaken(G, side, a.id);
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
    };
  });
  return {
    turn: G.turn, phase: G.phase, active: G.active, over: G.over, winner: G.winner,
    me: { lp: p.lp, lpMax: p.lpMax, deck: p.deck.length, hand: p.hand, mons: mons(p, false), spells: p.spells, grave: p.grave.length, extra: p.extra, bonds: p.bonds, normalUsed: p.normalUsed },
    op: {
      lp: o.lp, lpMax: o.lpMax, deck: o.deck.length, hand: o.hand.length,
      mons: mons(o, true),
      spells: o.spells.map((s) => (s ? { uid: s.uid, id: s.set ? null : s.id, set: s.set } : null)),
      grave: o.grave.length, extra: o.extra.length, bonds: o.bonds,
    },
    log: G.log.slice(-40),
  };
}
