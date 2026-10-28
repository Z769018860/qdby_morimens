// Real monster design -> battle skills.
// tools/build_monsters.py ships each skill as { n, t, i, g, a }: name, Chinese text with {1}{2}… placeholders,
// intent icon id, target and the formula arguments ([ 'a'|'d'|'n'|'x', value ]; a = ×ATK, d = ×DEF, n = plain number).
// This turns that into the game's effect vocabulary, keeping the real multipliers, hit counts, layers and durations.
import { fx, lineToSkill } from './skills.js';

const strip = (t) => String(t || '').replace(/⟦[^|⟧]+\|([^⟧]*)⟧/g, '$1');
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const round2 = (x) => Math.round(x * 100) / 100;
const ATTACK_ICONS = new Set(['001', '002', '008', '009', '010']);

// "{3}" -> readable value for the tooltip text
export function fillText(rec) {
  const A = rec.a || [];
  return rec.t.replace(/\{(\d+)\}(\s*点|\s*层)?(\s*⟦[^|⟧]+\|力量⟧|\s*力量)?/g, (_, n, unit, str) => {
    const a = A[+n - 1];
    if (!a || a[0] === 'x') return 'X' + (unit || '') + (str || '');
    const u = unit ? unit.trim() : '';
    if (a[0] === 'n') return a[1] + u + (str || '');
    if (str) return `${round2(a[1] * 100)}%${str.trim()}`;
    if (u === '层') return `${clamp(Math.round(a[1] * 12), 1, 8)}层`;
    return a[0] === 'a' ? `${round2(a[1] * 100)}%攻击` + (u ? ' ' : '') : `${round2(a[1] * 100)}%防御` + (u ? ' ' : '');
  });
}

const argAt = (A, token) => (token == null ? null : /^\{(\d+)\}$/.test(token) ? A[+token.slice(1, -1) - 1] || null : ['n', +token]);

export function compileSkill(rec, rank = 'Normal') {
  const A = rec.a || [];
  const raw = rec.t, plain = strip(raw);
  const base = lineToSkill(raw, 0, rank);
  // keep the status/utility effects of the keyword reader, replace damage/shield/strength with real numbers
  let eff = base.effects.filter((e) => !(e.t === 'dmg' || e.t === 'shield' || (e.t === 'buff' && e.stat === 'atk' && e.to === 'self')));
  const aoe = /全体唤醒体|所有唤醒体|全队|全体敌人|全部/.test(plain);
  const to = aoe ? 'foes' : 'foe';
  const real = [];

  // damage / bleed
  const dm = plain.match(/造成\s*(\{\d+\}|\d+)\s*点(伤害|出血)/);
  const hm = plain.match(/(\{\d+\}|\d+)\s*次/);
  let dmgArg = dm ? argAt(A, dm[1]) : null;
  if (!dmgArg && ATTACK_ICONS.has(rec.i)) dmgArg = A.find((x) => x[0] === 'a') || null;
  if (dmgArg && dmgArg[0] === 'a' || dmgArg && dmgArg[0] === 'n' && ATTACK_ICONS.has(rec.i)) {
    let m = dmgArg[0] === 'a' ? dmgArg[1] : 1;
    let hits = 1;
    if (hm) { const h = argAt(A, hm[1]); if (h && h[0] === 'n') hits = clamp(Math.round(h[1]), 1, 6); else if (h) hits = 2; }
    m = clamp(m, 0.08, 4);
    if (dm && dm[2] === '出血') eff = [...eff, fx.dot(clamp(m, 0.15, 1), 3, to)];
    else {
      let total = m * hits;
      if (total > 3.4) m = 3.4 / hits;            // keep one action from exceeding a big-hit budget
      if (aoe) m *= 0.65;
      real.push(fx.dmg(round2(m), { hits, to }));
    }
  }
  // shield
  const sm = plain.match(/获得\s*(\{\d+\}|\d+)\s*(?:点)?护盾/);
  if (sm) {
    const a = argAt(A, sm[1]);
    if (a && (a[0] === 'd' || a[0] === 'a')) real.push(fx.shield(round2(clamp(a[1] * 0.5, 0.3, 3.2)), 'self'));
    else if (a) real.push(fx.shield(0.8, 'self'));
  }
  // strength (client: ATK-scaled flat amount)
  const pm = plain.match(/获得\s*(\{\d+\}|\d+)\s*(?:点|层)力量/);
  if (pm) {
    const a = argAt(A, pm[1]);
    const v = a && a[0] === 'a' ? clamp(a[1] * 100, 6, 40) : a && a[0] === 'n' ? clamp(a[1] * 8, 8, 40) : 15;
    real.push(fx.buff('atk', Math.round(v), 3, 'self'));
  } else if (base.effects.some((e) => e.t === 'buff' && e.stat === 'atk' && e.to === 'self')) real.push(fx.buff('atk', 20, 3, 'self'));

  // real durations / layers on statuses
  const dur = plain.match(/(\{\d+\}|\d+)\s*回合/), lay = plain.match(/施加\s*(\{\d+\}|\d+)\s*层/);
  const d = dur ? argAt(A, dur[1]) : null, l = lay ? argAt(A, lay[1]) : null;
  eff = eff.map((e) => {
    if (e.t === 'status' && ['weakness', 'fragile', 'sealed'].includes(e.s) && d && d[0] === 'n') return { ...e, dur: clamp(Math.round(d[1]), 1, 4) };
    if (e.t === 'status' && e.s === 'poison' && l) return { ...e, n: l[0] === 'a' ? clamp(Math.round(l[1] * 12), 1, 8) : l[0] === 'n' ? clamp(Math.round(l[1]), 1, 8) : e.n };
    return e;
  });
  let effects = [...real, ...eff];
  // every enemy action that the client labels as an attack must hurt
  if (!effects.some((e) => e.t === 'dmg') && ATTACK_ICONS.has(rec.i) && !/出血/.test(plain.slice(0, 12))) effects = [fx.dmg(0.7, { to }), ...effects];
  return { name: rec.n || base.name, effects, text: fillText(rec), ic: rec.i, plain: strip(fillText(rec)), g: rec.g };
}

// monster record + skill table -> enemy pattern { opening, cycle }
export function patternOf(m, msk, rank) {
  const mk = (id) => compileSkill(msk[id], rank);
  const cycle = m.cy.map(mk), opening = (m.op || []).map(mk);
  if (!cycle.some((s) => s.effects.some((e) => e.t === 'dmg')) && !opening.some((s) => s.effects.some((e) => e.t === 'dmg'))) {
    cycle.push({ name: '撕咬', effects: [fx.dmg(0.8)], text: '', ic: '001', plain: '' });
  }
  return { opening, cycle };
}
