import { mulberry32 } from './rng.js';

export const DEF_K = 150;
const MAX_ROUNDS = 30;
const WEIGHT = { WARDEN: 3, ASSAULT: 1.6, CHORUS: 1 };

// A unit is a plain object so the whole simulation is serialisable and
// deterministic given (allies, enemies, seed, strategy).
export function makeUnit(def, side, idx) {
  return {
    uid: `${side}${idx}`, side, idx,
    name: def.name, img: def.img, type: def.type || 'ASSAULT', realm: def.realm,
    maxHp: def.hp, hp: def.hp, atk: def.atk, def: def.def,
    critRate: def.critRate || 0, critDmg: def.critDmg || 50, amp: def.amp || 0,
    aliGain: def.aliGain || 0, keyGain: def.keyGain || 0,
    healBonus: def.healBonus || 0, shieldBonus: def.shieldBonus || 0, steal: def.steal || 0,
    surviveChance: def.surviveChance || 0, survived: false,
    openAli: def.openAli || 0, openKey: def.openKey || 0,
    firstBoost: def.firstBoost || 0,
    kit: def.kit || null, pattern: def.pattern || null, boss: !!def.boss, affix: def.affix || null,
    ali: def.openAli || 0, key: def.openKey || 0, shield: 0, buffs: [], dots: [], cd: {},
    roused: false, patIdx: 0, enrage: 0, alive: true, acted: 0,
  };
}

const sumBuff = (u, stat) => u.buffs.reduce((s, b) => (b.stat === stat ? s + b.v : s), 0);
const alive = (arr) => arr.filter((u) => u.alive);
const hpPct = (u) => u.hp / u.maxHp;

export function simulate({ allies, enemies, seed = 1, strategy = {}, maxRounds = MAX_ROUNDS }) {
  const rng = mulberry32(seed);
  const strat = { defend: 0.4, target: 'low', ...strategy };
  const A = allies.map((d, i) => makeUnit(d, 'a', i));
  const E = enemies.map((d, i) => makeUnit(d, 'e', i));
  const ev = [];
  const push = (e) => ev.push(e);
  let round = 0;
  let kills = 0;

  const foesOf = (u) => alive(u.side === 'a' ? E : A);
  const friendsOf = (u) => alive(u.side === 'a' ? A : E);

  function chooseFoe(u, mode) {
    const foes = foesOf(u);
    if (!foes.length) return null;
    if (u.side === 'a') {
      if (mode === 'foeLow') return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
      if (mode === 'foeRand') return foes[Math.floor(rng() * foes.length)];
      if (strat.target === 'first') return foes[0];
      if (strat.target === 'atk') return foes.reduce((a, b) => (b.atk > a.atk ? b : a));
      return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
    }
    if (mode === 'foeRand') return foes[Math.floor(rng() * foes.length)];
    const w = foes.map((f) => WEIGHT[f.type] || 1);
    let r = rng() * w.reduce((s, x) => s + x, 0);
    for (let i = 0; i < foes.length; i++) { r -= w[i]; if (r <= 0) return foes[i]; }
    return foes[foes.length - 1];
  }

  function targets(u, to) {
    switch (to) {
      case 'self': return [u];
      case 'allies': return friendsOf(u);
      case 'ally': { const f = friendsOf(u); return f.length ? [f.reduce((a, b) => (hpPct(b) < hpPct(a) ? b : a))] : []; }
      case 'foes': return foesOf(u);
      case 'foeLow': case 'foeRand': case 'foe': { const t = chooseFoe(u, to); return t ? [t] : []; }
      default: return [];
    }
  }

  function gainGauge(u, k, v) {
    if (!u.alive) return;
    const mult = 1 + (k === 'ali' ? u.aliGain : u.keyGain) / 100;
    u[k] = Math.min(100, u[k] + v * mult);
  }

  function damage(src, tgt, mult, ctx) {
    if (!tgt.alive) return 0;
    const crit = rng() < Math.min(1, (src.critRate + sumBuff(src, 'crit')) / 100);
    let raw = src.atk * (1 + sumBuff(src, 'atk') / 100) * mult;
    raw *= 1 + (src.amp + sumBuff(src, 'amp')) / 100;
    if (src.firstBoost && src.acted <= 1) raw *= 1 + src.firstBoost / 100;
    if (crit) raw *= 1 + src.critDmg / 100;
    if (src.enrage) raw *= 1 + src.enrage;
    raw *= 0.95 + rng() * 0.1;
    const d = tgt.def * (1 + sumBuff(tgt, 'def') / 100);
    let dmg = raw * (1 - d / (d + DEF_K)) * (1 + sumBuff(tgt, 'vuln') / 100);
    dmg = Math.max(1, Math.round(dmg));
    return applyDamage(src, tgt, dmg, crit, ctx);
  }

  function applyDamage(src, tgt, dmg, crit, ctx, kind = 'dmg') {
    let absorbed = 0;
    if (tgt.shield > 0) { absorbed = Math.min(tgt.shield, dmg); tgt.shield -= absorbed; dmg -= absorbed; }
    let saved = false;
    if (dmg >= tgt.hp && tgt.surviveChance && !tgt.survived && rng() < tgt.surviveChance) {
      tgt.survived = true; saved = true; dmg = tgt.hp - 1;
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    push({ k: kind, by: src.uid, who: tgt.uid, amt: dmg, absorbed, crit, hp: tgt.hp, shield: tgt.shield, saved });
    if (ctx) ctx.dealt += dmg;
    if (src.side !== tgt.side) {
      gainGauge(tgt, 'ali', 9);
      if (src.steal && dmg > 0) heal(src, src, dmg * src.steal / 100, true);
    }
    if (tgt.hp <= 0) {
      tgt.alive = false;
      if (tgt.side === 'e') kills++;
      push({ k: 'die', who: tgt.uid });
    }
    return dmg;
  }

  function heal(src, tgt, amt, silent) {
    if (!tgt.alive) return;
    amt = Math.round(amt);
    const real = Math.min(amt, tgt.maxHp - tgt.hp);
    tgt.hp += real;
    if (!silent || real > 0) push({ k: 'heal', by: src.uid, who: tgt.uid, amt: real, hp: tgt.hp });
  }

  function run(u, effects) {
    const ctx = { dealt: 0 };
    for (const e of effects) {
      if (!A.some((x) => x.alive) || !E.some((x) => x.alive)) break;
      switch (e.t) {
        case 'dmg': {
          const tl = targets(u, e.to);
          for (let h = 0; h < (e.hits || 1); h++) {
            const live = e.to === 'foes' ? tl.filter((t) => t.alive) : e.to === 'foeRand' ? targets(u, 'foeRand') : tl.filter((t) => t.alive);
            const list = live.length ? live : (e.to === 'foe' ? targets(u, 'foe') : []);
            for (const t of list) damage(u, t, e.m, ctx);
          }
          break;
        }
        case 'heal':
          for (const t of targets(u, e.to)) heal(u, t, u.atk * (1 + sumBuff(u, 'atk') / 100) * e.m * (1 + u.healBonus / 100));
          break;
        case 'shield':
          for (const t of targets(u, e.to)) {
            const amt = Math.round((u.def * 1.2 + u.maxHp * 0.08) * e.m * (1 + u.shieldBonus / 100));
            t.shield += amt;
            push({ k: 'shield', who: t.uid, amt, shield: t.shield });
          }
          break;
        case 'buff': case 'debuff':
          for (const t of targets(u, e.to)) {
            const v = e.t === 'debuff' ? (e.stat === 'vuln' ? e.v : -e.v) : e.v;
            t.buffs.push({ stat: e.stat, v, dur: e.dur });
            push({ k: 'buff', who: t.uid, stat: e.stat, v, dur: e.dur });
          }
          break;
        case 'dot':
          for (const t of targets(u, e.to)) { t.dots.push({ dmg: u.atk * e.m, dur: e.dur, by: u.uid }); push({ k: 'dot', who: t.uid }); }
          break;
        case 'gauge':
          for (const t of targets(u, e.to)) { gainGauge(t, e.k === 'aliemus' ? 'ali' : 'key', e.v); push({ k: 'gauge', who: t.uid, ali: t.ali, key: t.key }); }
          break;
        case 'lifesteal':
          if (ctx.dealt) heal(u, u, ctx.dealt * e.v / 100, true);
          break;
      }
    }
  }

  function chooseAllyCard(u) {
    const kit = u.kit;
    if (!u.roused) return 'Rouse';
    if (u.key >= 100) return 'OverExalt';
    if (u.ali >= 100) return 'Exalt';
    if (hpPct(u) < strat.defend && !(u.cd.Defense > 0)) return 'Defense';
    if (u.type === 'CHORUS' && !(u.cd.Skill1 > 0) && friendsOf(u).some((f) => hpPct(f) < 0.65)) return 'Skill1';
    if (!(u.cd.Skill2 > 0)) return 'Skill2';
    if (!(u.cd.Skill1 > 0)) return 'Skill1';
    return 'Strike';
  }

  function act(u) {
    u.acted++;
    u.shield = 0;
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k]--;
    let slot, sk;
    if (u.side === 'a') {
      slot = chooseAllyCard(u);
      sk = u.kit[slot];
    } else {
      sk = u.pattern[u.patIdx++ % u.pattern.length];
      slot = 'Strike';
    }
    push({ k: 'act', who: u.uid, slot, name: sk.name, round });
    if (u.side === 'a') {
      if (slot === 'Rouse') { u.roused = true; gainGauge(u, 'key', 0); }
      if (slot === 'Exalt') { u.ali = 0; gainGauge(u, 'key', 34); }
      else if (slot === 'OverExalt') { u.key = 0; }
      else if (slot === 'Strike') gainGauge(u, 'ali', 14);
      else if (slot === 'Skill1' || slot === 'Skill2') { gainGauge(u, 'ali', 20); gainGauge(u, 'key', 4); u.cd[slot] = slot === 'Skill1' ? 2 : 3; }
      else if (slot === 'Defense') u.cd.Defense = 3;
      if (slot === 'Strike') gainGauge(u, 'key', 4);
      push({ k: 'gauge', who: u.uid, ali: u.ali, key: u.key });
    }
    run(u, sk.effects);
    if (u.side === 'e' && u.affix === 'swift' && u.alive && rng() < 0.2) {
      push({ k: 'act', who: u.uid, slot: 'Strike', name: '疾袭', round });
      run(u, [{ t: 'dmg', m: 0.6, hits: 1, to: 'foe' }]);
    }
  }

  const finished = () => !A.some((x) => x.alive) || !E.some((x) => x.alive);

  while (round < maxRounds && !finished()) {
    round++;
    push({ k: 'round', n: round });
    for (const u of [...A, ...E]) {
      if (!u.alive) continue;
      for (const d of u.dots) {
        if (!u.alive) break;
        const src = [...A, ...E].find((x) => x.uid === d.by);
        applyDamage(src || u, u, Math.max(1, Math.round(d.dmg)), false, null, 'dot');
      }
      u.dots = u.dots.map((d) => ({ ...d, dur: d.dur - 1 })).filter((d) => d.dur > 0);
    }
    if (finished()) break;
    for (const u of [...A, ...E]) {
      if (finished()) break;
      if (u.alive) act(u);
    }
    for (const u of [...A, ...E]) {
      u.buffs = u.buffs.map((b) => ({ ...b, dur: b.dur - 1 })).filter((b) => b.dur > 0);
      if (u.side === 'e' && round >= 12) u.enrage += 0.08;
    }
  }

  const win = !E.some((x) => x.alive) && A.some((x) => x.alive);
  push({ k: 'end', win, rounds: round });
  return {
    win, rounds: round, events: ev, kills,
    allies: A.map((u) => ({ uid: u.uid, hp: u.hp, alive: u.alive })),
  };
}
