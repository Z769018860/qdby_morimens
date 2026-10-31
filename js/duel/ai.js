// 对手 AI。它不直接改状态：每一拍返回「下一步想做什么」，
// 由页面（view.js）执行 + 等待一下再问下一拍，这样玩家能看清对手在干什么。
//
// 设计取向：会算数值，但不算未来的牌。它的强度来自「不浪费」——
// 不做亏本交换、不在能斩杀的时候去盖牌、该打脸的时候不打墙。
import { CARDS } from './gen.js';
import { atkOf, defOf, canAttack, canSummon, canAwaken, canDirect, tributeNeed, mustHitFirst } from './engine.js';

function d(id) { return CARDS[id]; }
function fxv(mon, k) {
  const f = (d(mon.id).fx || []).find((x) => x.k === k);
  return f ? (f.v || 0) : 0;
}

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
    if (f.k === 'equipGrant') s += p.mons.filter(Boolean).length ? 4 : -5;
    if (f.k === 'contHeal' || f.k === 'contBoth') s += p.lp < 4500 ? 5 : 2;
    if (f.k === 'contBurn') s += 4;
    // ---- 新机制：毒/流血要「对面还站得住」才值，屏障要「自己快挨打了」才值 ----
    if (f.k === 'poison') s += (f.v || 1) * 2 + (o.lp < 2500 ? 3 : 0);
    if (f.k === 'contPoison') s += o.lp < 3500 ? 6 : 4;
    if (f.k === 'bleed') s += o.mons.filter(Boolean).length ? 4 + (f.v || 1) : -4;
    if (f.k === 'contBleed') s += o.mons.filter(Boolean).length ? 5 : 0;
    if (f.k === 'barrier') s += (p.lp < 4000 ? 6 : 3) * (f.v || 1);
    if (f.k === 'contBarrier') s += p.lp < 4500 ? 6 : 2;
    if (f.k === 'barrierMon') s += p.mons.filter(Boolean).length ? 4 : 1;
    if (f.k === 'counter') s += 2;
    if (f.k === 'counterBoost') s += p.mons.filter(Boolean).length ? 5 : -3;
    if (f.k === 'counterDraw') s += 3;
    if (f.k === 'taunt') s += 2;
    if (f.k === 'tauntMax' || f.k === 'tauntOnce') s += 3;
    // ---- 召唤机制 ----
    if (f.k === 'poisonMon') s += o.mons.filter(Boolean).length ? 5 + (f.v || 1) : -4;
    if (f.k === 'token') s += p.mons.filter((x) => !x).length ? 6 : -3;
    if (f.k === 'specialSummon') {
      s += f.f === 'grave' ? (p.grave.length ? 5 : -4) : (p.hand.length > 1 ? 5 : -3);
    }
    if (f.k === 'extraNormal') s += p.hand.some((h) => d(h.id) && d(h.id).k === 'M') ? 7 : 1;
    if (f.k === 'extraDraw') s += 7;
    if (f.k === 'summonTaxDiscard') s += 4;
    if (f.k === 'searchMonster' || f.k === 'search') s += 5;
    if (f.k === 'bothDraw') s += 1;
    // ---- 造物那批（bp16）----
    if (f.k === 'millOpp') s += o.deck.length > 8 ? 5 : 2;
    if (f.k === 'millSelf') s += p.grave.length < 6 ? 3 : 0;
    if (f.k === 'recycle') s += p.grave.length >= 5 ? 4 : 0;
    if (f.k === 'stealMon') {
      const t = o.mons.filter(Boolean).sort((a, b) => b.atk - a.atk)[0];
      s += t && p.mons.indexOf(null) >= 0 ? 6 + Math.min(6, (t.atk || 0) / 400) : -6;
    }
    if (f.k === 'lpPump') s += p.lp < p.lpMax - 1500 ? 5 : 0;
    if (f.k === 'fieldAtk' || f.k === 'fieldDef') s += 3;
    if (f.k === 'trapPoison') s += 3;
    if (f.k === 'trapCounter') s += 4;
    if (f.k === 'trapCounterMon') s += 4;
    if (f.k === 'trapBarrier') s += 3;
    if (f.k === 'negateAttack') s += 2;
  }
  // 命轮代价：付不起就直接判死（-99 保证排到最后），快没命了就别乱开
  const cost = (def.cost && def.cost.lp) || 0;
  if (cost > 0) {
    if (p.lp <= cost) return -99;
    s -= cost / 260;
    if (p.lp - cost < 1500) s -= 6;
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
    // 场地魔法也占一格，但它能顶掉自己旧的场地，所以满了也还能开
    if (isCont && p.spells.indexOf(null) < 0 && def.t !== 'field') continue;
    if (def.cost && def.cost.lp && p.lp <= def.cost.lp) continue;
    const s = scoreSpell(G, p, o, h);
    if (s > bestScore) { bestScore = s; best = h; }
  }
  return bestScore >= 4 ? best : null;
}

function summonOptions(G, p) {
  // 觉醒体的素材别拿去当祭品：凑齐了就能换一只大的
  const matNames = {};
  for (const id of p.extra) for (const nm of (d(id).mat || [])) matNames[nm] = 1;
  const out = [];
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'M') continue;
    if (!canSummon(G, p, h.id)) continue;
    const need = tributeNeed(h.id);
    let tribs = [];
    if (need > 0) {
      const own = p.mons.filter(Boolean).sort((a, b) => {
        const am = matNames[d(a.id).n] ? 1 : 0;
        const bm = matNames[d(b.id).n] ? 1 : 0;
        if (am !== bm) return am - bm;
        return atkOf(G, p, a) - atkOf(G, p, b);
      });
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
  // 嘲讽 / 守备守护：两者都得先处理，顺序由引擎的 mustHitFirst 统一。
  // 嘲讽的「灵活版」（tauntMax）是按攻击方多大决定拦不拦，所以在循环里逐只算。

  for (const a of p.mons) {
    if (!a || !canAttack(G, p, a)) continue;
    const av = atkOf(G, p, a);
    const guard = mustHitFirst(o, av);
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
      // 反击：撞上去自己要吃伤害；屏障：这一下打不死它
      const ctr = fxv(t, 'counter');
      const brk = t.br > 0 ? 1 : 0;
      if (av > tv) {
        const dmg = t.pos === 'atk' ? av - tv : (pierce ? av - tv : 0);
        const sc = tv + dmg * 2 + (t.pos === 'atk' ? 200 : 0) - ctr * 1.5 - brk * 200;
        if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: t.uid }; }
      } else if (av === tv && t.pos === 'atk') {
        if (300 - ctr - brk * 200 > bestScore) { bestScore = 300 - ctr - brk * 200; best = { uid: a.uid, target: t.uid }; }
      }
    }
  }
  return bestScore > 0 ? best : null;
}

// sloppy＝「打错牌」的概率（0~0.8）。历史上只有 easy/normal/hard 三个字符串，
// 现在段位要把对手一级一级往上顶，所以也接受直接给数字（见 duel/rank.js 的 aiFor）。
function sloppyOf(skill) {
  if (typeof skill === 'number' && isFinite(skill)) return Math.max(0, Math.min(0.8, skill));
  return skill === 'easy' ? 0.4 : skill === 'hard' ? 0 : 0.16;
}

// 乱召唤：手里能直接上的怪里随便挑一只（不挑最能打的）。只在不需要祭品的里面挑，
// 免得它把场上的墙献祭掉换一只更弱的——那就不是「打得差」，是「不会玩」了。
function lazySummon(G, p) {
  const free = summonOptions(G, p).filter((x) => !x.need);
  if (!free.length) return null;
  return free[Math.floor(G.rng() * free.length)];
}

// 乱撞：挑一个「打不过还要撞」的目标。真正的弱手不是不打，是见谁撞谁。
// 返回 null 表示场上没有可撞的目标（那就直接打脸）。
function worstAttack(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  const mine = p.mons.filter((m) => m && canAttack(G, p, m));
  if (!mine.length) return null;
  // 拿攻击力最低的那只，去撞对面攻击力最高的那只
  const a = mine.sort((x, y) => atkOf(G, p, x) - atkOf(G, p, y))[0];
  const foes = o.mons.filter(Boolean);
  if (!foes.length) return { uid: a.uid, target: null };
  // 守备守护 / 嘲讽的怪挡在前面时只能打它——这里原先直接从「攻击力最高的」里挑，
  // 绕过了拦截，规则会拒绝这次攻击（新卡把「奥吉尔」「温柯尔」做进来之后每局必现）。
  const wall = mustHitFirst(o, atkOf(G, p, a));
  if (wall) return { uid: a.uid, target: wall.uid };
  const t = foes.sort((x, y) => atkOf(G, o, y) - atkOf(G, o, x))[0];
  return { uid: a.uid, target: t.uid };
}

// 返回「下一步」：{ t: 'awaken'|'spell'|'summon'|'setMon'|'trap'|'pos'|'battle'|'attack'|'end', ... }
export function nextAction(G, side, skill) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return null;
  const sloppy = sloppyOf(skill);

  if (G.phase === 'main') {
    // 1. 觉醒体优先：素材已经站住了就别再拖（弱手会一直忘）
    if (G.rng() >= sloppy * 0.8) {
      for (const id of p.extra) {
        if (canAwaken(G, p, id)) return { t: 'awaken', id };
      }
    }
    // 1.5 额外卡组的直接召唤：条件满足就叫，不占通常召唤
    if (G.rng() >= sloppy * 0.8) {
      for (const id of p.extra) {
        if (canDirect(G, p, id)) return { t: 'direct', id };
      }
    }
    // 2. 该斩杀了就直接烧（弱手偶尔也会漏掉这一手）
    if (G.rng() >= sloppy * 0.5) {
      for (const h of p.hand) {
        const def = d(h.id);
        if (!def || def.k !== 'S') continue;
        // 有命轮代价的牌这里也要过一遍，否则会去开一张付不起的斩杀牌
        if (def.cost && def.cost.lp && p.lp <= def.cost.lp) continue;
        for (const f of def.fx || []) {
          if (f.k === 'burn' && (f.v || 0) >= o.lp) return { t: 'spell', uid: h.uid };
        }
      }
    }
    // 3. 魔法
    if (G.rng() >= sloppy) {
      const sp = bestSpell(G, p, o);
      if (sp) return { t: 'spell', uid: sp.uid };
    }
    // 4. 召唤：这里有两种错法——该上不上（空过），或者随手上一只小的
    if (G.rng() >= sloppy * 0.55) {
      if (G.rng() < sloppy) {
        const bad = lazySummon(G, p);
        if (bad) return { t: 'summon', uid: bad.uid, tribs: [] };
      } else {
        const sum = bestSummon(G, p);
        if (sum) return { t: 'summon', uid: sum.uid, tribs: sum.tribs };
      }
    }
    // 5. 盖一只守备怪（手里有高守备、场上又空的时候）。
    //    弱手会把它正面摊在攻击表示上——那不是「另一种打法」，是白送一个突破口。
    if (p.mons.filter(Boolean).length < 2) {
      const cand = p.hand.filter((h) => {
        const def = d(h.id);
        return def && def.k === 'M' && tributeNeed(h.id) === 0;
      }).sort((a, b) => d(b.id).def - d(a.id).def)[0];
      if (cand && d(cand.id).def >= 1800 && !p.normalUsed) {
        if (G.rng() < sloppy * 0.6) return { t: 'summon', uid: cand.uid, tribs: [] };
        return { t: 'setMon', uid: cand.uid };
      }
    }
    // 6. 盖陷阱（最多两张，别把手牌全变成盖牌）
    const traps = p.hand.filter((h) => d(h.id) && d(h.id).k === 'T');
    const setCount = p.spells.filter((s) => s && s.set).length;
    if (traps.length && setCount < 2 && p.spells.indexOf(null) >= 0) {
      if (G.rng() >= sloppy * 0.4) return { t: 'trap', uid: traps[0].uid };
    }
    // 6.5 守备的高攻怪翻回攻击：打得过对方全场就别一直缩着（守备卡组全靠这一步才有输出）
    //     弱手想不起来翻，整套牌就只会挨打
    const wall = p.mons.find((m) => m && m.pos === 'def' && !m.set && atkOf(G, p, m) >= 1700);
    if (wall && G.rng() >= sloppy) {
      const mine = atkOf(G, p, wall);
      const theirs = o.mons.filter(Boolean);
      const worst = theirs.length
        ? Math.max.apply(null, theirs.map((t) => (t.pos === 'atk' && !t.set ? atkOf(G, o, t) : 0)))
        : 0;
      if (mine > worst) return { t: 'pos', uid: wall.uid };
    }
    // 7. 低攻怪兽转守备（弱手会把一只小怪一直摊在场上挨打）
    const weakAtk = p.mons.find((m) => m && m.pos === 'atk' && !m.set && atkOf(G, p, m) < 1600);
    if (weakAtk && G.rng() >= sloppy
      && o.mons.filter(Boolean).some((m) => m.pos === 'atk' && atkOf(G, o, m) > atkOf(G, p, weakAtk))) {
      return { t: 'pos', uid: weakAtk.uid };
    }
    return { t: 'battle' };
  }

  if (G.phase === 'battle') {
    // 速攻魔法（钥令那批）在战斗阶段也能开：先开再打。弱手会忘，这就是「打错牌」的一种。
    if (G.rng() >= sloppy) {
      const q = p.hand.find((h) => {
        const def = d(h.id);
        return def && def.k === 'S' && def.t === 'quick' && scoreSpell(G, p, o, h) >= 4;
      });
      if (q) return { t: 'spell', uid: q.uid };
    }
    const atk = bestAttack(G, side);
    if (atk) {
      if (G.rng() >= sloppy * 0.5) return { t: 'attack', uid: atk.uid, target: atk.target };
      // 走神：明明有好目标，却拿最弱的那只去撞最硬的那只
      const bad = worstAttack(G, side);
      if (bad && G.rng() < 0.5) return { t: 'attack', uid: bad.uid, target: bad.target };
      return { t: 'end' };
    }
    // 没有好目标——弱手也会硬撞
    if (G.rng() < sloppy * 0.6) {
      const bad = worstAttack(G, side);
      if (bad) return { t: 'attack', uid: bad.uid, target: bad.target };
    }
    return { t: 'end' };
  }
  return { t: 'end' };
}
