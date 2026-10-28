// Skill model. The SKeyDB export only has prose for skills, so this game uses
// its own small "effect archetype" vocabulary and builds a 7-slot kit for every
// awakener from (type, realm), with hand-written signature overrides.
//
// effect := { t, ... }   t in dmg | heal | shield | buff | debuff | dot | gauge
// target ('to'): foe | foes | foeLow | foeRand | self | ally | allies

const E = {
  dmg: (m, o = {}) => ({ t: 'dmg', m, hits: 1, to: 'foe', ...o }),
  heal: (m, to = 'ally') => ({ t: 'heal', m, to }),
  shield: (m, to = 'self') => ({ t: 'shield', m, to }),
  buff: (stat, v, dur, to = 'self') => ({ t: 'buff', stat, v, dur, to }),
  debuff: (stat, v, dur, to = 'foe') => ({ t: 'debuff', stat, v, dur, to }),
  dot: (m, dur, to = 'foe') => ({ t: 'dot', m, dur, to }),
  gauge: (k, v, to = 'self') => ({ t: 'gauge', k, v, to }),
  status: (s, n, dur, to = 'foe') => ({ t: 'status', s, n, dur, to }),
};
export { E as fx };

import { STATUS } from './constants.js';

const STAT_ZH = { atk: '攻击', def: '防御', crit: '暴击率', amp: '增伤', vuln: '受伤' };
const TO_ZH = {
  foe: '单体敌人', foes: '全体敌人', foeLow: '血量最低的敌人', foeRand: '随机敌人',
  self: '自身', ally: '血量最低的队友', allies: '全体队友',
};

export function describeEffect(e) {
  const pct = (x) => Math.round(x * 100) + '%';
  switch (e.t) {
    case 'dmg': return `对${TO_ZH[e.to]}造成 ${pct(e.m)}攻击的伤害${e.hits > 1 ? ` ×${e.hits}` : ''}`;
    case 'heal': return `治疗${TO_ZH[e.to]}，量为 ${pct(e.m)}攻击`;
    case 'shield': return `为${TO_ZH[e.to]}施加护盾（${pct(e.m)}）`;
    case 'buff': return `${TO_ZH[e.to]}${STAT_ZH[e.stat]}+${e.v}%，持续 ${e.dur} 回合`;
    case 'debuff': return `${TO_ZH[e.to]}${STAT_ZH[e.stat]}${e.stat === 'vuln' ? '+' : '-'}${e.v}%，持续 ${e.dur} 回合`;
    case 'dot': return `对${TO_ZH[e.to]}附加流血：每回合 ${pct(e.m)}攻击，持续 ${e.dur} 回合`;
    case 'gauge': return `${TO_ZH[e.to]}${e.k === 'aliemus' ? '共鸣能量' : '超共鸣能量'}+${e.v}`;
    case 'status': return `${TO_ZH[e.to]}${e.s === 'poison' ? `施加 ${e.n} 层` : e.s === 'counter' ? `获得 ${e.n} 层` : e.s === 'fortress' ? `获得 ${e.n}% 减伤的` : e.s === 'barrier' ? `获得 ${e.n} 层` : '陷入'}${STATUS[e.s].zh}${e.dur < 90 ? `，持续 ${e.dur} 回合` : ''}`;
    case 'lifesteal': return `吸血 ${e.v}%`;
    default: return '';
  }
}
export const describeSkill = (sk) => sk.effects.map(describeEffect).join('；');

const STRIKE = { ASSAULT: '锐击', WARDEN: '盾击', CHORUS: '低吟' };

// flavour per realm: extra rider on Strike / Skill1
function realmRider(realm) {
  switch (realm) {
    case 'CHAOS': return { strike: [], s1: [E.buff('crit', 15, 2)] };
    case 'CARO': return { strike: [E.dot(0.35, 3)], s1: [{ t: 'lifesteal', v: 25 }] };
    case 'AEQUOR': return { strike: [E.shield(0.4)], s1: [E.debuff('def', 15, 2)] };
    case 'ULTRA': return { strike: [], s1: [E.gauge('aliemus', 15)] };
    default: return { strike: [], s1: [] };
  }
}

const KIT_NAMES = {
  ASSAULT: { Skill1: '裂隙斩', Skill2: '连环杀阵', Exalt: '狂想终章', OverExalt: '万象崩落' },
  WARDEN: { Skill1: '铁壁回响', Skill2: '群体庇护', Exalt: '不倒之誓', OverExalt: '终局壁垒' },
  CHORUS: { Skill1: '愈合咏叹', Skill2: '鼓舞圣咏', Exalt: '众声合唱', OverExalt: '回响终曲' },
};

function typeKit(type) {
  switch (type) {
    case 'ASSAULT': return {
      Skill1: [E.dmg(1.7)],
      Skill2: [E.dmg(0.75, { hits: 3, to: 'foeRand' })],
      Exalt: [E.dmg(2.8), E.buff('atk', 20, 2)],
      OverExalt: [E.dmg(1.6, { to: 'foes', hits: 2 }), E.buff('amp', 20, 3)],
    };
    case 'WARDEN': return {
      Skill1: [E.shield(1.6), E.dmg(0.8)],
      Skill2: [E.shield(0.9, 'allies')],
      Exalt: [E.shield(1.5, 'allies'), E.dmg(1.3)],
      OverExalt: [E.shield(2.4, 'allies'), E.dmg(1.5, { to: 'foes' }), E.debuff('atk', 20, 2, 'foes')],
    };
    default: return {
      Skill1: [E.heal(1.5)],
      Skill2: [E.buff('atk', 18, 2, 'allies')],
      Exalt: [E.heal(1.1, 'allies'), E.gauge('aliemus', 22, 'allies')],
      OverExalt: [E.heal(2.0, 'allies'), E.buff('atk', 25, 3, 'allies'), E.dmg(1.6)],
    };
  }
}

export function buildKit(a) {
  const n = KIT_NAMES[a.type];
  const t = typeKit(a.type);
  const r = realmRider(a.realm);
  const k = {
    Strike: { slot: 'Strike', name: `${STRIKE[a.type]}`, effects: [E.dmg(a.type === 'ASSAULT' ? 1.1 : 0.9), ...r.strike] },
    Defense: { slot: 'Defense', name: '架势', effects: [E.shield(1.2), E.gauge('aliemus', 10)] },
    Skill1: { slot: 'Skill1', name: n.Skill1, effects: [...t.Skill1, ...r.s1] },
    Skill2: { slot: 'Skill2', name: n.Skill2, effects: t.Skill2 },
    Rouse: { slot: 'Rouse', name: '唤醒', effects: [E.buff('atk', 12, 4, 'allies'), E.gauge('keyflare', 20)] },
    Exalt: { slot: 'Exalt', name: n.Exalt, effects: t.Exalt },
    OverExalt: { slot: 'OverExalt', name: n.OverExalt, effects: t.OverExalt },
  };
  const sig = SIGNATURES[a.slug];
  if (sig) for (const [slot, o] of Object.entries(sig)) k[slot] = { slot, ...k[slot], ...o };
  // real card names + keyword-driven riders (the real text only has prose, so numbers stay ours)
  for (const slot of Object.keys(k)) {
    const rk = a.rk?.[slot];
    if (!rk) continue;
    k[slot].name = rk.n;
    k[slot].real = { d: rk.d, e: rk.e, tags: rk.tags || [] };
    const f = flagsOf(rk);
    let eff = k[slot].effects;
    if (f.aoe && ['Skill1', 'Skill2', 'Exalt'].includes(slot)) {
      const i = eff.findIndex((x) => x.t === 'dmg' && x.to === 'foe' && (x.hits || 1) === 1);
      if (i >= 0) eff = eff.map((x, j) => (j === i ? { ...x, to: 'foes', m: +(x.m * 0.7).toFixed(2) } : x));
    }
    k[slot].effects = [...eff, ...riders(slot, rk, a, f).filter((r) => !['shield', 'heal'].includes(r.t) || !eff.some((x) => x.t === r.t))];
  }
  return k;
}

// ---------- keyword riders ----------
const strip = (t) => String(t || '').replace(/⟦[^|⟧]+\|([^⟧]*)⟧/g, '$1');
const SLOT_SCALE = { Strike: 0.55, Defense: 0.55, Skill1: 0.8, Skill2: 0.9, Rouse: 0.9, Exalt: 1.15, OverExalt: 1.4 };
export function flagsOf(rk) {
  const t = strip(rk.d);
  return {
    tg: new Set(rk.tags || []), aoe: /全体敌人|所有敌人/.test(t), ally: /全体唤醒体|其他唤醒体|全队|队友/.test(t),
    heal: /回复[^。；]{0,8}生命|治疗|生命回复/.test(t), shield: /护盾/.test(t), dmg: /伤害/.test(t),
  };
}
export function riders(slot, rk, a, f = flagsOf(rk)) {
  const s = SLOT_SCALE[slot] ?? 1, tg = f.tg, out = [];
  const foe = f.aoe ? 'foes' : 'foe';
  const add = (e) => { if (out.length < 2) out.push(e); };
  if (tg.has('poison') || tg.has('corrosion')) add(E.status('poison', Math.round((f.aoe ? 2 : 3) + 3 * s), 4, foe));
  if (tg.has('vulnerable')) add(E.debuff('vuln', Math.round(15 + 12 * s), 2, foe));
  if (tg.has('weakness')) add(E.status('weakness', 1, 2, foe));
  if (tg.has('strength')) add(E.debuff('atk', Math.round(10 + 10 * s), 2, foe));
  if (tg.has('counter')) add(E.status('counter', Math.round(1 + 2 * s), 3, f.ally ? 'allies' : 'self'));
  if (tg.has('barrier')) add(E.status('barrier', 1, 3, 'self'));
  if (tg.has('fortress')) add(E.status('fortress', Math.round(12 + 10 * s), 3, 'self'));
  if (tg.has('bleed')) add(E.dot(0.15 + 0.25 * s, 3, foe));
  if (tg.has('str') && slot !== 'Strike') add(E.buff('atk', Math.round(8 + 10 * s), 3, f.ally ? 'allies' : 'self'));
  if (f.heal && a.type !== 'CHORUS') add(E.heal(0.45 * s, 'self'));
  if (f.shield && a.type !== 'WARDEN') add(E.shield(0.4 * s, 'self'));
  return out;
}

// Hand-tuned identities. Names/text are this game's own flavour, not official text.
const SIGNATURES = {
  '24': {
    Skill2: { name: '人格轮换', effects: [E.dmg(0.6, { hits: 4, to: 'foeRand' })] },
    Exalt: { name: '二十四重奏', effects: [E.dmg(0.7, { hits: 5, to: 'foeRand' }), E.buff('crit', 20, 2)] },
    OverExalt: { name: '无名之众', effects: [E.dmg(0.9, { hits: 4, to: 'foes' }), E.buff('amp', 30, 3)] },
  },
  agrippa: {
    Skill1: { name: '圣肉护持', effects: [E.shield(1.8), E.heal(0.6, 'self')] },
    Exalt: { name: '血肉壁障', effects: [E.shield(1.8, 'allies'), E.heal(0.8, 'allies')] },
  },
  aigis: {
    Skill1: { name: '圣盾庇佑', effects: [E.shield(1.4, 'ally'), E.heal(1.0)] },
    OverExalt: { name: '永恒庇护', effects: [E.shield(3, 'allies'), E.heal(1.6, 'allies')] },
  },
  alva: {
    Skill2: { name: '破阵', effects: [E.dmg(1.0, { to: 'foes' }), E.debuff('def', 20, 2, 'foes')] },
  },
  aurita: {
    Skill1: { name: '潮汐斩', effects: [E.dmg(1.8), E.debuff('def', 20, 2)] },
    Exalt: { name: '深海回响', effects: [E.dmg(2.4), E.dmg(1.0, { to: 'foes' })] },
  },
  caecus: {
    Skill1: { name: '反击姿态', effects: [E.shield(1.5), E.buff('atk', 30, 2)] },
    Exalt: { name: '无眼之击', effects: [E.dmg(3.0), E.shield(1.0)] },
  },
  doll: {
    Skill1: { name: '缝合术', effects: [E.heal(1.8)] },
    Exalt: { name: '针线编织', effects: [E.heal(1.3, 'allies'), E.shield(0.6, 'allies')] },
  },
  ogier: {
    Skill1: { name: '誓约之盾', effects: [E.shield(1.8), E.dmg(0.8)] },
    Skill2: { name: '号令', effects: [E.shield(1.0, 'allies'), E.buff('def', 20, 2, 'allies')] },
  },
  lotan: {
    Skill1: { name: '裂地击', effects: [E.dmg(1.9)] },
    Exalt: { name: '怒涛', effects: [E.dmg(2.6), E.dmg(1.0, { to: 'foes' })] },
  },
  ramona: {
    Skill1: { name: '祈祷', effects: [E.heal(1.4), E.buff('def', 15, 2)] },
    Skill2: { name: '赞歌', effects: [E.buff('atk', 20, 2, 'allies'), E.buff('crit', 10, 2, 'allies')] },
  },
  hameln: {
    Skill2: { name: '笛音召集', effects: [E.buff('atk', 25, 3, 'allies'), E.gauge('aliemus', 15, 'allies')] },
  },
  thais: {
    Skill1: { name: '孕育', effects: [E.heal(1.2, 'allies')] },
    Exalt: { name: '慈悲哺育', effects: [E.heal(1.6, 'allies'), E.gauge('keyflare', 15, 'allies')] },
  },
  pandia: {
    Skill1: { name: '银辉', effects: [E.heal(1.2), E.buff('amp', 15, 2, 'allies')] },
  },
};

// ---------- real monster skill lines -> enemy skills ----------
export const TAGS_OF = (t) => [...new Set([...String(t || '').matchAll(/⟦([^|⟧]+)\|/g)].map((m) => m[1]))];
export function lineToSkill(text, budget = 1, rank = 'Normal') {
  const plain = strip(text), tg = new Set(TAGS_OF(text));
  const aoe = /全体唤醒体|所有唤醒体|全队|全体敌人|全部/.test(plain);
  const hitsM = plain.match(/(\d+) 次/);
  const hits = /X 次/.test(plain) ? 2 : hitsM ? Math.min(3, +hitsM[1]) : 1;
  const eff = [];
  const to = aoe ? 'foes' : 'foe'; // enemies' "foe" = our team
  if (/伤害/.test(plain) && !/受到.{0,6}伤害/.test(plain.split('，')[0])) eff.push(E.dmg(+(budget * (aoe ? 0.6 : 1) * (hits > 1 ? 0.7 : 1)).toFixed(2), { to, hits: Math.min(3, hits) }));
  if (tg.has('poison') || tg.has('corrosion')) eff.push(E.status('poison', aoe ? 2 : 3, 4, to));
  if (tg.has('bleed')) eff.push(E.dot(0.3, 3, to));
  if (tg.has('weakness')) eff.push(E.status('weakness', 1, 2, to));
  if (tg.has('vulnerable')) eff.push(E.debuff('vuln', 20, 2, to));
  if (tg.has('strength')) eff.push(E.debuff('atk', 15, 2, to));
  if (tg.has('fragile')) eff.push(E.status('fragile', 1, 2, to));
  if (tg.has('sealed')) eff.push(E.status('sealed', 1, 2, 'foeRand'));
  if (tg.has('counter')) eff.push(E.status('counter', 2, 3, 'self'));
  if (tg.has('barrier')) eff.push(E.status('barrier', 1, 3, 'self'));
  if (tg.has('fortress')) eff.push(E.status('fortress', 20, 3, 'self'));
  if (/护盾/.test(plain) && /获得/.test(plain)) eff.push(E.shield(0.8, 'self'));
  if (/回复[^。，]{0,8}生命|治疗/.test(plain) && !/受到/.test(plain)) eff.push(E.heal(0.5, 'self'));
  if (tg.has('str') && /获得/.test(plain)) eff.push(E.buff('atk', 20, 3, 'self'));
  const label = tg.has('poison') ? '毒雾' : tg.has('bleed') ? '撕裂' : tg.has('weakness') ? '削弱' : tg.has('vulnerable') ? '破防' : tg.has('sealed') ? '封印'
    : tg.has('counter') ? '反击姿态' : /护盾/.test(plain) ? '固守' : /回复/.test(plain) ? '再生' : eff.some((e) => e.t === 'dmg') ? (aoe ? '横扫' : '重击') : '咆哮';
  return { name: label, effects: eff, text: plain };
}
