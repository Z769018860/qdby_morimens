// Battle report: everything the settlement screen shows is derived from the event stream (no engine changes).
const SLOT_GROUP = { Strike: 'strike', Defense: 'defense', Skill1: 'skill', Skill2: 'skill', Rouse: 'rouse', Exalt: 'exalt', OverExalt: 'exalt' };

export function analyzeBattle(res, allies, enemies) {
  const units = {};
  const mk = (side, arr) => arr.forEach((d, i) => {
    units[`${side}${i}`] = {
      uid: `${side}${i}`, side, name: d.name, img: d.img, boss: !!d.boss, maxHp: d.hp || d.maxHp || 1, hp: d.hp || d.maxHp || 1,
      dmg: 0, dot: 0, counter: 0, hits: 0, crits: 0, maxHit: 0, taken: 0, absorbedByShield: 0, blocked: 0,
      heal: 0, healed: 0, shield: 0, kills: 0, deaths: 0, diedRound: null, saved: 0,
      acts: { strike: 0, defense: 0, skill: 0, rouse: 0, exalt: 0, other: 0 }, status: {},
    };
  });
  mk('a', allies); mk('e', enemies);
  const rounds = [{ n: 0, dmgA: 0, dmgE: 0, heal: 0 }];
  let round = 0, lastHit = {};
  for (const e of res.events) {
    const u = units[e.who], by = units[e.by];
    switch (e.k) {
      case 'round': round = e.n; rounds.push({ n: round, dmgA: 0, dmgE: 0, heal: 0 }); break;
      case 'act': if (u) u.acts[SLOT_GROUP[e.slot] || 'other']++; break;
      case 'dmg': case 'dot': case 'counter': {
        if (!u || e.amt == null) break;   // a bare 'dot' event is only "bleed applied"
        if (e.blocked) { u.blocked++; break; }
        u.taken += e.amt; u.absorbedByShield += e.absorbed || 0; u.hp = e.hp; if (e.saved) u.saved++;
        if (by && !(by.side === u.side && e.k === 'dmg')) {
          by.dmg += e.amt;
          if (e.k === 'dot') by.dot += e.amt; else if (e.k === 'counter') by.counter += e.amt; else { by.hits++; if (e.crit) by.crits++; by.maxHit = Math.max(by.maxHit, e.amt + (e.absorbed || 0)); }
          lastHit[e.who] = e.by;
          rounds[rounds.length - 1][by.side === 'a' ? 'dmgA' : 'dmgE'] += e.amt;
        }
        break;
      }
      case 'heal': if (u) { u.healed += e.amt; u.hp = e.hp; if (by) by.heal += e.amt; rounds[rounds.length - 1].heal += (u.side === 'a' ? e.amt : 0); } break;
      case 'shield': if (u) u.shield += e.amt; break;
      case 'status': if (u) u.status[e.s] = (u.status[e.s] || 0) + 1; break;
      case 'die': if (u) { u.deaths++; u.diedRound = round; u.hp = 0; const k = units[lastHit[e.who]]; if (k && k.side !== u.side) k.kills++; } break;
    }
  }
  for (const u of Object.values(units)) u.hpPct = Math.max(0, Math.min(1, u.hp / u.maxHp));
  const A = Object.values(units).filter((u) => u.side === 'a'), E = Object.values(units).filter((u) => u.side === 'e');
  const sum = (arr, k) => arr.reduce((s, u) => s + u[k], 0);
  const totalDmg = sum(A, 'dmg');
  for (const u of A) u.share = totalDmg ? u.dmg / totalDmg : 0;
  const best = (arr, k) => (arr.some((u) => u[k] > 0) ? arr.reduce((a, b) => (b[k] > a[k] ? b : a)).uid : null);
  const hitsAll = sum(A, 'hits');
  const totals = {
    dmg: totalDmg, taken: sum(A, 'taken'), heal: sum(A, 'heal'), shield: sum(A, 'shield'), kills: sum(A, 'kills'), crits: sum(A, 'crits'), hits: hitsAll,
    critRate: hitsAll ? sum(A, 'crits') / hitsAll : 0, maxHit: Math.max(0, ...A.map((u) => u.maxHit)), dpr: res.rounds ? totalDmg / res.rounds : 0,
    survivors: A.filter((u) => u.deaths === 0).length, hpLeft: A.reduce((s, u) => s + u.hp, 0) / Math.max(1, sum(A, 'maxHp')),
    exalts: sum(A.map((u) => ({ x: u.acts.exalt })), 'x'),
  };
  return { win: !!res.win, rounds: res.rounds, units, A, E, timeline: rounds.filter((r) => r.n > 0), totals, mvp: { dmg: best(A, 'dmg'), tank: best(A, 'taken'), heal: best(A, 'heal'), crit: best(A, 'maxHit') } };
}

// ★ rating: win, nobody fell, finished quickly. S needs 3★ and ≥70% HP left.
export function grade(rep, { fast = 12 } = {}) {
  if (!rep.win) return { stars: 0, rank: 'D', notes: [] };
  const t = rep.totals, allAlive = t.survivors === rep.A.length, quick = rep.rounds <= fast;
  const stars = 1 + Number(allAlive) + Number(quick);
  const rank = stars === 3 && t.hpLeft >= 0.7 ? 'S' : stars === 3 ? 'A' : stars === 2 ? 'B' : 'C';
  return { stars, rank, notes: [allAlive ? '全员存活' : `倒下 ${rep.A.length - t.survivors} 人`, quick ? `${rep.rounds} 回合速胜` : `超过 ${fast} 回合`, `剩余生命 ${Math.round(t.hpLeft * 100)}%`] };
}
