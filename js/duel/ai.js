// 对手 AI。它不直接改状态：每一拍返回「下一步想做什么」，
// 由页面（view.js）执行 + 等待一下再问下一拍，这样玩家能看清对手在干什么。
//
// 设计取向：会算数值，但不算未来的牌。它的强度来自「不浪费」——
// 不做亏本交换、不在能斩杀的时候去盖牌、该打脸的时候不打墙。
import { CARDS } from './gen.js';
import { atkOf, defOf, canAttack, canSummon, canAwaken, tributeNeed } from './engine.js';

function d(id) { return CARDS[id]; }

// 这张魔法现在值不值得开？返回分数，0 表示不该开。
function scoreSpell(G, p, o, card) {
  const def = d(card.id);
  let s = 0;
  for (const f of def.fx || []) {
    if (f.k === 'draw') s += 6;
    if (f.k === 'echoDraw') s += 5;
    if (f.k === 'tradeDraw') s += 4;
    if (f.k === 'lpDraw') s += p.lp > 2500 ? 5 : -20;
    if (f.k === 'selfBurnDraw') s += p.lp > 2500 ? 5 : -20;
    if (f.k === 'realmDraw') s += 4;
    if (f.k === 'burn') s += (f.v || 0) >= o.lp ? 20 : (f.v || 600) / 200;
    if (f.k === 'graveBurn') s += p.grave.length >= 3 ? 4 : 1;
    if (f.k === 'destroyWeak') {
      const t = o.mons.filter(Boolean).sort((a, b) => b.atk - a.atk)[0];
      s += t && atkOf(G, o, t) <= 1800 ? 8 : -5;
    }
    if (f.k === 'bounce' || f.k === 'bounce' ) s += o.mons.filter(Boolean).length ? 6 : -5;
    if (f.k === 'snipeDraw' || f.k === 'snipe') s += o.spells.some((x) => x && x.set) ? 7 : 1;
    if (f.k === 'pumpHighest') s += p.mons.filter(Boolean).length ? 5 : -5;
    if (f.k === 'quickAtkAll') s += p.mons.filter(Boolean).length >= 2 ? 5 : 1;
    if (f.k === 'quickDef') s += p.mons.filter(Boolean).length ? 3 : 0;
    if (f.k === 'quickDirect') s += p.mons.filter(Boolean).length ? 6 : 0;
    if (f.k === 'heal' || f.k === 'healDraw') s += p.lp < 3000 ? 5 : 1;
    if (f.k === 'graveHeal') s += p.lp < 3500 && p.grave.length >= 2 ? 5 : 0;
    if (f.k === 'sacrificeHeal') s += p.mons.filter(Boolean).length >= 2 ? 3 : -10;
    if (f.k === 'discardOpp') s += o.hand.length ? 5 : -2;
    if (f.k === 'sweepWeak') {
      const mine = p.mons.filter(Boolean).filter((m) => atkOf(G, p, m) <= 1500).length;
      const theirs = o.mons.filter(Boolean).filter((m) => atkOf(G, o, m) <= 1500).length;
      s += theirs > mine ? 6 : -10;
    }
    if (f.k === 'weakenEnemyAll' || f.k === 'weakenHighest') s += o.mons.filter(Boolean).length ? 4 : -5;
    if (f.k === 'equipAtk' || f.k === 'equipDef') s += p.mons.filter(Boolean).length ? 4 : -5;
    if (f.k === 'contHeal' || f.k === 'contBoth') s += p.lp < 4500 ? 5 : 2;
    if (f.k === 'contBurn') s += 4;
    if (f.k === 'extraDraw') s += 7;
    if (f.k === 'summonTaxDiscard') s += 4;
    if (f.k === 'searchMonster' || f.k === 'search') s += 5;
    if (f.k === 'bothDraw') s += 1;
  }
  // 开局手牌多的时候先铺场，别一上来就把资源全换成抽牌
  if (p.mons.filter(Boolean).length === 0 && def.k === 'S' && def.t !== 'cont' && s <= 6) s -= 2;
  return s;
}

function bestSpell(G, p, o) {
  let best = null;
  let bestScore = 0;
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'S') continue;
    const isCont = def.t === 'cont' || def.t === 'equip';
    if (isCont && p.spells.indexOf(null) < 0) continue;
    const s = scoreSpell(G, p, o, h);
    if (s > bestScore) { bestScore = s; best = h; }
  }
  return bestScore >= 4 ? best : null;
}

function summonOptions(G, p) {
  const out = [];
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'M') continue;
    if (!canSummon(G, p, h.id)) continue;
    const need = tributeNeed(h.id);
    let tribs = [];
    if (need > 0) {
      const own = p.mons.filter(Boolean).sort((a, b) => atkOf(G, p, a) - atkOf(G, p, b));
      if (own.length < need) continue;
      tribs = own.slice(0, need).map((m) => m.uid);
    }
    out.push({ uid: h.uid, id: h.id, need, tribs, atk: def.atk });
  }
  return out;
}

function bestSummon(G, p) {
  const opts = summonOptions(G, p);
  if (!opts.length) return null;
  // 有祭品的选项要先算「亏不亏」：献出去的攻击力总和不能超过新怪兽带来的提升太多
  const scored = opts.map((x) => {
    const lost = x.tribs.reduce((s, u) => {
      const m = p.mons.find((y) => y && y.uid === u);
      return s + (m ? atkOf(G, p, m) : 0);
    }, 0);
    const gain = x.atk - lost;
    return { ...x, score: gain + (x.tribs.length ? 0 : 300) };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  // 献祭召唤只有在明显更强时才做（否则宁可留着墙）
  if (top.tribs.length && top.score < 400) return null;
  return top;
}

function bestAttack(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  let best = null;
  let bestScore = 0;
  const guard = o.mons.find((m) => m && !m.set && m.pos === 'def' && (d(m.id).fx || []).some((f) => f.k === 'guard'));

  for (const a of p.mons) {
    if (!a || !canAttack(G, p, a)) continue;
    const av = atkOf(G, p, a);
    const pierce = (d(a.id).fx || []).some((f) => f.k === 'pierce');
    const targets = guard ? [guard] : o.mons.filter(Boolean);

    if (!targets.length) {
      const sc = av + (o.lp <= av ? 100 : 0);
      if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: null }; }
      continue;
    }
    for (const t of targets) {
      if (t.set) {
        // 盖放的怪：只能赌它的守备力，低攻怪不去撞
        if (av >= 1500) {
          const sc = av - 1200 + (pierce ? 400 : 0);
          if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: t.uid }; }
        }
        continue;
      }
      const tv = t.pos === 'atk' ? atkOf(G, o, t) : defOf(G, o, t);
      if (av > tv) {
        const dmg = t.pos === 'atk' ? av - tv : (pierce ? av - tv : 0);
        const sc = tv + dmg * 2 + (t.pos === 'atk' ? 200 : 0);
        if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: t.uid }; }
      } else if (av === tv && t.pos === 'atk') {
        if (300 > bestScore) { bestScore = 300; best = { uid: a.uid, target: t.uid }; }
      }
    }
  }
  return bestScore > 0 ? best : null;
}

// 返回「下一步」：{ t: 'awaken'|'spell'|'summon'|'setMon'|'trap'|'pos'|'battle'|'attack'|'end', ... }
export function nextAction(G, side, skill) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return null;
  const sloppy = skill === 'easy' ? 0.35 : skill === 'hard' ? 0 : 0.12;

  if (G.phase === 'main') {
    // 1. 觉醒体优先：素材已经站住了就别再拖
    for (const id of p.extra) {
      if (canAwaken(G, p, id)) return { t: 'awaken', id };
    }
    // 2. 该斩杀了就直接烧
    for (const h of p.hand) {
      const def = d(h.id);
      if (!def || def.k !== 'S') continue;
      for (const f of def.fx || []) {
        if (f.k === 'burn' && (f.v || 0) >= o.lp) return { t: 'spell', uid: h.uid };
      }
    }
    // 3. 魔法
    if (G.rng() >= sloppy) {
      const sp = bestSpell(G, p, o);
      if (sp) return { t: 'spell', uid: sp.uid };
    }
    // 4. 召唤
    const sum = bestSummon(G, p);
    if (sum) return { t: 'summon', uid: sum.uid, tribs: sum.tribs };
    // 5. 盖一只守备怪（手里有高守备、场上又空的时候）
    if (p.mons.filter(Boolean).length < 2) {
      const cand = p.hand.filter((h) => {
        const def = d(h.id);
        return def && def.k === 'M' && tributeNeed(h.id) === 0;
      }).sort((a, b) => d(b.id).def - d(a.id).def)[0];
      if (cand && d(cand.id).def >= 1800 && !p.normalUsed) return { t: 'setMon', uid: cand.uid };
    }
    // 6. 盖陷阱（最多两张，别把手牌全变成盖牌）
    const traps = p.hand.filter((h) => d(h.id) && d(h.id).k === 'T');
    const setCount = p.spells.filter((s) => s && s.set).length;
    if (traps.length && setCount < 2 && p.spells.indexOf(null) >= 0) {
      return { t: 'trap', uid: traps[0].uid };
    }
    // 7. 低攻怪兽转守备
    const weakAtk = p.mons.find((m) => m && m.pos === 'atk' && !m.set && atkOf(G, p, m) < 1600);
    if (weakAtk && o.mons.filter(Boolean).some((m) => m.pos === 'atk' && atkOf(G, o, m) > atkOf(G, p, weakAtk))) {
      return { t: 'pos', uid: weakAtk.uid };
    }
    return { t: 'battle' };
  }

  if (G.phase === 'battle') {
    const atk = bestAttack(G, side);
    if (atk && G.rng() >= sloppy * 0.5) return { t: 'attack', uid: atk.uid, target: atk.target };
    return { t: 'end' };
  }
  return { t: 'end' };
}
