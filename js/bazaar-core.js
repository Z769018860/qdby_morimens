// 《大巴扎：银钥》核心逻辑：商店、十格战场、自动战斗。
// 不碰 DOM，node 里能直接跑（scripts/bazaar-sim.mjs 就是拿它做平衡实测的）。
//
// 一场战斗的心跳是「拍」（beat），四个东西同时走：
//   唤酲体 —— 每 cd 拍产出 gen 点算力（顺手打一下 / 架盾 / 挂易伤），并对左右两家放光环；
//   命轮　 —— 攒够 cpu 算力就在自己的节拍上开一炮，主要输出；
//   造物　 —— 不占出手，纯静态加成（算力上限、产出、增伤、暴击……）；
//   地形　 —— 敌我同吃，熔岩掉血、雾障加盾、疾风加速、脆裂削血。
// 一直打到有人倒下。第 100 拍后出现「毒圈」：双方每拍同时掉同样的固定点数（真伤，无视护盾），越往后越疼，
// 直到有人倒下为止（固定点数，不按血量比例：血少的一方先撑不住）。TUNING.beats（1000）只是兜底，按剩余血量百分比判，正常碰不到。难度、当天曲线、地形表都在 js/bazaar-data.js。

import * as DATA from './bazaar-data.js';

// 这里的 build.mjs 只认 export const/let/function/class（没有 export {...} 重导出），
// 所以对外重新声明一遍，模拟脚本和界面都从这里拿。
export const TUNING = DATA.TUNING;
export const HEROES = DATA.HEROES;
export const ITEMS = DATA.ITEMS;
export const SHOP_ITEMS = DATA.SHOP_ITEMS;
export const WHEELS = DATA.WHEELS;
export const PACTS = DATA.PACTS;
export const FOES = DATA.FOES;
export const DIFFS = DATA.DIFFS;
export const SCHEDULE = DATA.SCHEDULE;
export const TERRAINS = DATA.TERRAINS;
export const MOD_ZH = DATA.MOD_ZH;
export const AURA_ZH = DATA.AURA_ZH;
export const REALM_COLOR = DATA.REALM_COLOR;
export const ARCH_ZH = DATA.ARCH_ZH;

const DOT_TURNS = 3;
const ITEM_BY_ID = new Map(ITEMS.map((x) => [x.id, x]));
const WHEEL_BY_ID = new Map(WHEELS.map((x) => [x.id, x]));
const FOE_BY_ID = new Map(FOES.map((x) => [x.id, x]));
const HERO_BY_ID = new Map(HEROES.map((x) => [x.id, x]));
const PACT_BY_ID = new Map(PACTS.map((x) => [x.id, x]));
const TER_BY_ID = new Map(TERRAINS.map((x) => [x.id, x]));

export const itemOf = (id) => ITEM_BY_ID.get(id);
export const wheelOf = (id) => WHEEL_BY_ID.get(id);
export const foeOf = (id) => FOE_BY_ID.get(id);
export const heroOf = (id) => HERO_BY_ID.get(id);
export const pactOf = (id) => PACT_BY_ID.get(id);
export const terrainOf = (id) => TER_BY_ID.get(id) || TERRAINS[0];
export const diffOf = (id) => DIFFS.find((d) => d.id === id) || DIFFS[0];

export function rngFrom(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ru = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

let UID = 1;
const uid = () => UID++;

// ---------------------------------------------------------------- 开局
export function heroPrice(def) {
  return 9 + (def.slots || 1) * 5;
}
export function wheelPrice(def) {
  return 7 + Math.round((def.cpu || 12) / 2);
}
export function relicPrice(def) {
  return 4 + (def.r === 'SSR' ? 6 : def.r === 'SR' ? 3 : 0) + (def.cost || 0) % 2;
}
export function sellPrice(kind, def) {
  const base = kind === 'hero' ? heroPrice(def) : kind === 'wheel' ? wheelPrice(def) : relicPrice(def);
  return Math.max(1, Math.floor(base * TUNING.sellRate));
}

export function newRun({ seed = Date.now() >>> 0, pactId, diffId = 'normal' } = {}) {
  const diff = diffOf(diffId);
  const pact = pactOf(pactId) || PACTS[0];
  const run = {
    seed, rnd: rngFrom(seed), pact, diff, totalDays: diff.days,
    day: 1, sane: diff.sane, gold: TUNING.startGold,
    squad: [], wheels: [], relics: [], cores: 0,
    shop: [], rerolls: 0, freeReroll: 0,
    foeId: null, terrain: 'plain',
    wins: 0, losses: 0, bonusHp: 0,
    over: false, cleared: false, history: [],
  };
  if (pact.k === 'rich') run.gold += pact.v;
  // 开局不自选：战场上空的，靠集市里用固定金币把队伍凑起来。
  // 第一个唤醒体的本命命轮白送（见 buy），其余靠买。
  pickFoe(run);
  rollShop(run, { free: true });
  return run;
}

// ---------------------------------------------------------------- 战场（十格）
export function usedSlots(run) {
  let n = 0;
  for (const h of run.squad) n += (heroOf(h.key) || {}).slots || 1;
  return n;
}
export function freeSlots(run) {
  return TUNING.fieldSlots - usedSlots(run);
}
// 队伍顺序即站位：0 号在最左，往后依次排开，每人占 slots 格
export function layoutOf(run) {
  let at = 0;
  return run.squad.map((h) => {
    const def = heroOf(h.key);
    const rec = { uid: h.uid, key: h.key, def, start: at, len: def.slots || 1 };
    at += rec.len;
    return rec;
  });
}
export function canAddHero(run, id) {
  const def = heroOf(id);
  return !!def && usedSlots(run) + def.slots <= TUNING.fieldSlots;
}
export function addHero(run, id) {
  if (!canAddHero(run, id)) return null;
  const rec = { uid: uid(), key: id };
  run.squad.push(rec);
  return rec;
}
export function moveHero(run, hid, to) {
  const from = run.squad.findIndex((h) => h.uid === hid);
  if (from < 0) return false;
  const t = Math.max(0, Math.min(run.squad.length - 1, to));
  if (t === from) return false;
  const [x] = run.squad.splice(from, 1);
  run.squad.splice(t, 0, x);
  return true;
}
export function removeHero(run, hid) {
  if (run.squad.length <= 1) return false;
  const i = run.squad.findIndex((h) => h.uid === hid);
  if (i < 0) return false;
  run.squad.splice(i, 1);
  return true;
}

// 面板上的「每拍产出 / 每拍消耗」——和 createFight 用同一套规则，免得显示和实际对不上
export function planOf(run) {
  const mod = modsOf(run);
  const ter = terrainOf(run.terrain);
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);
  const units = run.squad.map((h) => {
    const d = heroOf(h.key);
    return { gen: d.gen, cd: d.cd, pow: 1, aura: d.aura };
  });
  units.forEach((u, i) => {
    for (const j of [i - 1, i + 1]) {
      const nb = units[j];
      if (!nb || !nb.aura) continue;
      const a = nb.aura;
      if (a.k === 'gen') u.gen += a.v;
      else if (a.k === 'cd') u.cd -= a.v;
      else if (a.k === 'pow') u.pow += a.v;
    }
  });
  let gen = 0;
  for (const u of units) {
    const cd = Math.max(TUNING.cdMin, u.cd + cdTer);
    const g = Math.max(1, Math.round(u.gen * (1 + mod.gen)));
    gen += g / cd;
  }
  let need = 0;
  for (const w of run.wheels) {
    const d = wheelOf(w.key);
    if (d) need += d.cpu / Math.max(TUNING.wcdMin, d.wcd + cdTer - mod.wcdDown);
  }
  return {
    gen: Math.round(gen * 10) / 10,
    need: Math.round(need * 10) / 10,
    cap: TUNING.cpuBase + mod.cap + run.cores * TUNING.coreGain,
    slots: usedSlots(run),
  };
}

// ---------------------------------------------------------------- 商店
export function priceOf(run, base) {
  let p = 1;
  if (run.pact.k === 'discount') p -= run.pact.v;
  if (run.pact.k === 'greed') p += run.pact.v;
  return Math.max(1, Math.round(base * p));
}

function pickRarity(run, rnd) {
  const d = run.day;
  const wN = Math.max(1.2, 10 - d * 1.1);
  const wSR = 2 + d * 0.8;
  const wSSR = Math.max(0, d - 2.5) * 1.0;
  const tot = wN + wSR + wSSR;
  const x = rnd() * tot;
  if (x < wSSR) return 'SSR';
  if (x < wSSR + wSR) return 'SR';
  return 'N';
}

// 商店配比：前面几天先把「人 + 命轮」凑出来，造物只是调剂；第 5 天往后造物才慢慢变成主角。
// 这不是数值平衡，是体感——开局四条摊位全摆造物，玩家连一次「换人 / 换轮」的选择都做不了。
// 槽位满了 / 战场挤不进人时，对应那一类自动降权，免得刷出一堆买不了的东西。
export function shopMix(run) {
  const d = run.day;
  let hero = d <= 2 ? 0.46 : d <= 4 ? 0.36 : d <= 7 ? 0.28 : 0.22;
  let wheel = d <= 2 ? 0.40 : d <= 4 ? 0.36 : d <= 7 ? 0.32 : 0.28;
  // 队伍还不够三个人时，人再往上提一点（三个人刚好能吃到光环）
  if (run.squad.length < 3) hero += 0.06;
  // 命轮不足两条时，先把命轮补起来——没有命轮这局根本打不出伤害
  if (run.wheels.length < 2) wheel += 0.08;
  if (run.relics.length >= TUNING.relicSlots) hero += 0.05;
  if (run.wheels.length >= TUNING.wheelSlots) { wheel *= 0.25; hero += 0.05; }
  if (freeSlots(run) < 1) { hero *= 0.3; wheel += 0.04; }
  let relic = Math.max(0.06, 1 - hero - wheel);
  if (run.relics.length >= TUNING.relicSlots) relic *= 0.12;
  const sum = hero + wheel + relic;
  return { hero: hero / sum, wheel: wheel / sum, relic: relic / sum };
}

export function rollShop(run, { free = false } = {}) {
  const rnd = run.rnd;
  if (!free) {
    const cost = TUNING.rerollCost + run.rerolls;
    if (run.pact.k === 'freereroll' && run.freeReroll < 1) {
      run.freeReroll += 1;
    } else {
      if (run.gold < cost) return false;
      run.gold -= cost;
      run.rerolls += 1;
    }
  }
  const n = 4 + (run.pact.k === 'rich' && run.day === 1 ? 1 : 0);
  const out = [];
  const used = new Set();
  const ownHeroes = new Set(run.squad.map((h) => h.key));
  const ownWheels = new Set(run.wheels.map((w) => w.key));

  // 造一件指定类型的东西；造不出来（池子抽空 / 没槽位）返回 null
  const make = (kind, cheap = false) => {
    if (kind === 'hero') {
      const pool = HEROES.filter((h) => !ownHeroes.has(h.id) && h.slots <= freeSlots(run) && (!cheap || h.slots <= 1));   // 只摆装得下的：摊位上看到的，买了就能上场
      if (!pool.length) return null;
      const h = ru(rnd, pool);
      if (!h || used.has('h' + h.id)) return null;
      used.add('h' + h.id);
      return { kind: 'hero', key: h.id, price: priceOf(run, heroPrice(h)) };
    }
    if (kind === 'wheel') {
      if (run.wheels.length >= TUNING.wheelSlots) return null;
      const w = ru(rnd, WHEELS);
      if (used.has('w' + w.id) || ownWheels.has(w.id)) return null;
      used.add('w' + w.id);
      return { kind: 'wheel', key: w.id, price: priceOf(run, wheelPrice(w)) };
    }
    const r = pickRarity(run, rnd);
    const pool = SHOP_ITEMS.filter((x) => x.r === r);
    if (!pool.length) return null;
    const it = ru(rnd, pool);
    if (used.has(it.id)) return null;
    used.add(it.id);
    return { kind: 'relic', key: it.id, price: priceOf(run, relicPrice(it)) };
  };

  const mix = shopMix(run);
  for (let i = 0; i < n; i++) {
    let offer = null;
    for (let tries = 0; tries < 24 && !offer; tries++) {
      const roll = rnd();
      offer = make(roll < mix.hero ? 'hero' : roll < mix.hero + mix.wheel ? 'wheel' : 'relic');
    }
    if (offer) { offer.sold = false; out.push(offer); }
  }

  // 头三天保底：至少一条命轮、一个能上场的人。凑不齐构筑的前期最难玩，
  // 而造物这一层只是加成，晚两天拿不会死人。
  if (run.day <= 3) {
    const has = (k) => out.some((o) => o.kind === k);
    const swap = (kind, cheap = false) => {
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].kind !== 'relic') continue;
        const o = make(kind, cheap);
        if (o) { o.sold = false; out[i] = o; return true; }
      }
      return false;
    };
    if (!has('wheel')) swap('wheel');
    // 开局战场上没人：起手金币只够「两个 1 格的人」或「一人一轮」，所以摊位里保底摆两个买得起的 1 格唤醒体。
    if (run.day === 1 && run.squad.length === 0) {
      const cheap = () => out.filter((o) => o.kind === 'hero' && heroOf(o.key).slots <= 1).length;
      const rank = (o) => (o.kind === 'relic' ? 0 : o.kind === 'hero' ? 1 : 2);     // 先换造物，再换贵人，最后才动命轮
      while (cheap() < 2) {
        const i = out.map((o, k) => ({ o, k })).filter(({ o }) => !(o.kind === 'hero' && heroOf(o.key).slots <= 1) && !(o.kind === 'wheel' && out.filter((x) => x.kind === 'wheel').length <= 1))
          .sort((x, y) => rank(x.o) - rank(y.o))[0];
        const o = make('hero', true);
        if (!i || !o) break;
        o.sold = false; out[i.k] = o;
      }
    } else if (!has('hero') && freeSlots(run) >= 1) swap('hero');
  }

  run.shop = out;
  run.rerolls = 0;
  return true;
}

export function defOf(offer) {
  if (offer.kind === 'hero') return heroOf(offer.key);
  if (offer.kind === 'wheel') return wheelOf(offer.key);
  return itemOf(offer.key);
}

export function canBuy(run, idx) {
  const o = run.shop[idx];
  if (!o || o.sold) return false;
  if (run.gold < o.price) return false;
  if (o.kind === 'hero') return canAddHero(run, o.key);
  if (o.kind === 'wheel') return run.wheels.length < TUNING.wheelSlots;
  return run.relics.length < TUNING.relicSlots;
}

export function buy(run, idx) {
  if (!canBuy(run, idx)) return false;
  const o = run.shop[idx];
  run.gold -= o.price;
  o.sold = true;
  if (o.kind === 'hero') {
    const first = run.squad.length === 0;
    addHero(run, o.key);
    // 第一个唤醒体的本命命轮白送：开局没钱买齐命轮，先让领队能开出第一枪。
    if (first && run.wheels.length < TUNING.wheelSlots) {
      const d = heroOf(o.key);
      const nw = d && wheelOf(d.wheel);
      if (nw) run.wheels.push({ uid: uid(), key: nw.id, native: true });
    }
  } else if (o.kind === 'wheel') run.wheels.push({ uid: uid(), key: o.key });
  else run.relics.push({ uid: uid(), key: o.key });
  return true;
}

// uid 在三种东西里都可能，统一按 uid 找
export function owned(run, id) {
  const h = run.squad.find((x) => x.uid === id);
  if (h) return { kind: 'hero', rec: h, def: heroOf(h.key) };
  const w = run.wheels.find((x) => x.uid === id);
  if (w) return { kind: 'wheel', rec: w, def: wheelOf(w.key) };
  const r = run.relics.find((x) => x.uid === id);
  if (r) return { kind: 'relic', rec: r, def: itemOf(r.key) };
  return null;
}

export function sell(run, id) {
  const o = owned(run, id);
  if (!o) return 0;
  if (o.kind === 'hero') {
    if (run.squad.length <= 1) return 0;
    const back = sellPrice('hero', o.def);
    removeHero(run, id);
    run.gold += back;
    return back;
  }
  if (o.kind === 'wheel') {
    if (o.rec.native) return 0;
    const i = run.wheels.indexOf(o.rec);
    run.wheels.splice(i, 1);
    const back = sellPrice('wheel', o.def);
    run.gold += back;
    return back;
  }
  const i = run.relics.indexOf(o.rec);
  run.relics.splice(i, 1);
  const back = sellPrice('relic', o.def);
  run.gold += back;
  return back;
}

export function coreCostOf(run) {
  return TUNING.coreCost + run.cores * 3;
}
export function expandCore(run) {
  const c = coreCostOf(run);
  if (run.gold < c) return false;
  run.gold -= c;
  run.cores += 1;
  return true;
}

// ---------------------------------------------------------------- 对手与地形
export function rowOf(run, day = run.day) {
  return DATA.rowFor(day, run.diff.id);
}

export function pickFoe(run, day = run.day) {
  const row = rowOf(run, day);
  run.foeId = ru(run.rnd, row.pool);
  run.terrain = ru(run.rnd, TERRAINS).id;
  return FOE_BY_ID.get(run.foeId);
}

// 一只怪技能表折算出来的「每拍输出」（不含当天系数），用来把同一天的不同怪拉到同一档。
export function rawDps(foe) {
  let d = 0;
  for (const s of foe.skills) {
    let per = 0;
    for (const op of s.op) {
      if (op.k === 'dmg') per += (op.v || 0) * (op.hits || 1);
      else if (op.k === 'poison' || op.k === 'burn') per += (op.v || 0) * 3;
      else if (op.k === 'str') per += (op.v || 0) * 0.9;
    }
    d += per / Math.max(1, s.cd);
  }
  return Math.max(0.6, d);
}

const supDps = (foe) => {
  let d = 0;
  for (const s of foe.skills) {
    let per = 0;
    for (const op of s.op) {
      if (op.k === 'heal') per += op.v * 0.9;
      else if (op.k === 'shield') per += op.v * 0.7;
    }
    d += per / Math.max(1, s.cd);
  }
  return d;
};

export function foeStats(run, day = run.day) {
  const foe = FOE_BY_ID.get(run.foeId) || FOES[0];
  const row = rowOf(run, day);
  const diff = run.diff;
  const ter = terrainOf(run.terrain);
  const weaken = run.pact.k === 'weaken' ? 1 - run.pact.v : 1;
  const rankMul = row.boss && foe.rank !== 'boss' ? 1.06 : 1;
  const hpMul = foe.rank === 'boss' ? 1.12 : foe.rank === 'elite' ? 1.04 : 1;
  const sup = 1 + (day - 1) * 0.2;
  const t = Math.min(day, TUNING.dayHp.length - 1);
  // 难度的数值加成按天渐入：第一天只给四成，第五天给全。
  // 开局手里只有一两条命轮，高难度如果第一天就全量加成，等于开局抛硬币。
  const ramp = day >= 5 ? 1 : 0.4 + (day - 1) * 0.15;
  const hpDiff = 1 + (diff.hp - 1) * ramp;
  const dpsDiff = 1 + (diff.dps - 1) * ramp;
  const terHp = 1 + (ter.k === 'hp' ? ter.v : 0);
  const budget = TUNING.dayHp[t] * hpDiff * terHp * weaken * rankMul * hpMul;
  const sustain = supDps(foe) * sup * 22;
  return {
    foe,
    maxHp: Math.round(Math.max(budget * 0.55, budget - sustain)),
    atk: (TUNING.dayDps[t] * dpsDiff / rawDps(foe)) * 1.38,
    sup,
    boss: foe.rank === 'boss',
    elite: foe.rank === 'elite',
  };
}

// ---------------------------------------------------------------- 战斗
const MOD_KEYS = ['cap', 'gen', 'amp', 'crit', 'cdmg', 'shcap', 'regen', 'start', 'wcd', 'thorns', 'gold'];

function addMod(mod, k, v) {
  if (MOD_KEYS.indexOf(k) < 0) return;
  if (k === 'shcap') mod.shieldCap += v;
  else if (k === 'start') mod.startCpu += v;
  else if (k === 'wcd') mod.wcdDown += v;
  else mod[k] += v;
}

function addWheelMod(mod, w) {
  if (!w) return;
  const v = w.v || 0;
  switch (w.main) {
    case 'CRIT_RATE': mod.crit += v; break;
    case 'CRIT_DMG': mod.cdmg += v; break;
    case 'DMG_AMP': mod.amp += v; break;
    case 'KEYFLARE_REGEN': mod.regen += v; break;
    case 'SIGIL_YIELD': mod.gold += v; break;
    case 'REALM_MASTERY': mod.flat += v; break;
    case 'DEATH_RESISTANCE': mod.hp += v; break;
    case 'ALIEMUS_REGEN': mod.ward += v; break;
    default: break;
  }
  const p = w.perk;
  if (p) addMod(mod, p.k, p.v);
}

// 一局当前的所有加成（造物 / 命轮 / 本命 / 契约）。createFight 和 planOf 共用——
// 以前面板上的「产 / 耗 / 上限」只算了裸数，造物给的算力上限、产出加成、地形加减拍都没算，
// 买的和实际上场的对不上。
export function modsOf(run) {
  const pact = run.pact;
  const mod = {
    amp: 0, crit: 0.08, cdmg: 0.5, regen: 0, gold: 0, flat: 0, hp: 0, ward: 0,
    leech: 0, wcdDown: 0, openShield: 0, pierce: 0, thorns: 0, venom: 0, fear: 0,
    save: 0, dupFirst: 0, lowLeech: 0, startCpu: 0, shieldCap: 60,
    gen: 0, cap: 0,
  };
  for (const r of run.relics) addMod(mod, itemOf(r.key).m.k, itemOf(r.key).m.v);
  for (const w of run.wheels) addWheelMod(mod, wheelOf(w.key));
  for (const h of run.squad) {
    const f = heroOf(h.key).fate;
    if (f) addMod(mod, f.k, f.v);
  }

  switch (pact.k) {
    case 'cddown': mod.wcdDown += pact.v; break;
    case 'dupfirst': mod.dupFirst = 1; break;
    case 'openshield': mod.openShield += pact.v; break;
    case 'lowleech': mod.lowLeech = pact.v; break;
    case 'glass': mod.amp += pact.v; mod.hp -= 12; break;
    case 'save': mod.save = pact.v; break;
    case 'bulwark2': mod.shieldCap += pact.v; mod.openShield += 15; break;
    case 'leech': mod.leech += pact.v; break;
    case 'headstart': mod.startCpu += pact.v; break;
    case 'tank': mod.hp += pact.v; break;
    case 'greed': mod.amp += 0.2; break;
    case 'venom': mod.venom += pact.v; break;
    case 'fear': mod.fear = pact.v; break;
    case 'wolf': mod.amp += pact.v; mod.shieldCap -= 30; break;
    default: break;
  }

  return mod;
}

export function createFight(run) {
  const { foe, maxHp, atk, sup } = foeStats(run);
  const pact = run.pact;
  const ter = terrainOf(run.terrain);

  const mod = modsOf(run);

  const terAmp = ter.k === 'amp' ? ter.v : 0;
  const terHp = ter.k === 'hp' ? ter.v : 0;
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);

  const maxHP = Math.max(40, Math.round((TUNING.startHp + mod.hp + run.bonusHp) * (1 + terHp)));
  const cpuCap = TUNING.cpuBase + mod.cap + run.cores * TUNING.coreGain;

  // 唤醒体（含左右光环）
  const units = run.squad.map((h) => {
    const d = heroOf(h.key);
    return { uid: h.uid, def: d, cd: d.cd, timer: 0, gen: d.gen, pow: 1, act: d.act, aura: d.aura, fired: 0 };
  });
  units.forEach((u, i) => {
    for (const j of [i - 1, i + 1]) {
      const nb = units[j];
      if (!nb || !nb.aura) continue;
      if (nb.aura.k === 'gen') u.gen += nb.aura.v;
      else if (nb.aura.k === 'cd') u.cd -= nb.aura.v;
      else if (nb.aura.k === 'pow') u.pow += nb.aura.v;
    }
  });
  for (const u of units) {
    u.cd = Math.max(TUNING.cdMin, u.cd + cdTer);
    u.gen = Math.max(1, Math.round(u.gen * (1 + mod.gen)));
  }

  // 命轮
  const wheels = run.wheels.map((w) => {
    const d = wheelOf(w.key);
    return { uid: w.uid, def: d, cost: d.cpu, wcd: d.wcd, timer: 0, native: !!w.native, waiting: false };
  });
  for (const w of wheels) w.wcd = Math.max(TUNING.wcdMin, w.wcd + cdTer - mod.wcdDown);

  const f = {
    t: 0, over: null, win: false,
    p: {
      hp: maxHP, maxHp: maxHP, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0,
      str: 0, weak: 0, weakT: 0,
    },
    e: {
      hp: maxHp, maxHp, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0,
      str: 0, vuln: 0, vulnT: 0, slow: 0,
      name: foe.n, spr: foe.spr, rank: foe.rank, desc: foe.desc,
      skills: foe.skills.map((s) => ({ n: s.n, cd: Math.max(2, s.cd + cdTer), timer: 0, op: s.op })),
    },
    units, wheels, cpu: 0, cpuCap, cpuGain: 0, cpuSpent: 0, gold: 0,
    mod, pact, foe, diff: run.diff, ter, terAmp,
    atkMul: atk, supMul: sup, rnd: run.rnd,
    shieldCap: Math.max(10, mod.shieldCap), wheelAmp: 1 + mod.amp + terAmp,
    surgeT: 0, saveUsed: false, dupUsed: false, firstWheel: true,
    dealt: 0, taken: 0,
  };

  f.cpu = Math.min(cpuCap, mod.startCpu);
  if (mod.openShield) f.p.shield = Math.min(f.shieldCap, mod.openShield);
  return f;
}

// 护盾吸收；pierce 是「有这一份比例的伤害绕过护盾」
function damageTo(target, amount, pierce = 0) {
  let through = 0;
  if (pierce > 0) {
    through = amount * Math.min(1, pierce);
    amount -= through;
  }
  const sh = Math.min(target.shield, amount);
  target.shield -= sh;
  const hpLoss = amount - sh + through;
  target.hp -= hpLoss;
  return hpLoss;
}

function hurt(f, target, amount, pierce = 0) {
  const isPlayer = target === f.p;
  if (isPlayer) {
    f.taken += amount;
  }
  const lost = damageTo(target, amount, pierce);
  const back = isPlayer ? f.mod.thorns + (f.ter.k === 'thorns' ? f.ter.v : 0)
    : (f.ter.k === 'thorns' ? f.ter.v : 0);
  if (lost > 0 && back > 0 && !f.over) {
    const other = isPlayer ? f.e : f.p;
    const v = Math.min(back, Math.max(1, Math.round(amount * 0.4)));
    other.hp -= v;
    if (isPlayer) f.dealt += v;
  }
  if (isPlayer && f.p.hp <= 0 && f.mod.save && !f.saveUsed) {
    f.saveUsed = true;
    f.p.hp = Math.min(f.p.maxHp, f.mod.save);
  }
  return lost;
}

// 我方伤害：kind='wheel' 才吃「命轮增伤」
function rollDamage(f, base, kind) {
  let raw = base + f.mod.flat + f.p.str * 0.5;
  raw *= 1 + (kind === 'wheel' ? f.mod.amp : 0) + f.terAmp;
  if (f.p.weakT > 0) raw *= 1 - f.p.weak;
  const crit = f.rnd() < Math.min(0.65, f.mod.crit);
  if (crit) raw *= 1.5 + f.mod.cdmg;
  if (f.e.vulnT > 0) raw *= 1 + f.e.vuln;
  return { raw, crit };
}

function applyOp(f, side, op, mul, ctx = {}) {
  const ev = [];
  const src = ctx.src || {};
  const target = side === 'p' ? f.e : f.p;
  const self = side === 'p' ? f.p : f.e;

  switch (op.k) {
    case 'dmg': {
      const hits = op.hits || 1;
      let total = 0;
      let anyCrit = false;
      for (let h = 0; h < hits; h++) {
        let raw;
        let crit = false;
        if (side === 'p') {
          const r = rollDamage(f, op.v * mul, ctx.kind);
          raw = r.raw; crit = r.crit;
          hurt(f, target, raw, ctx.kind === 'wheel' ? f.mod.pierce : 0);
        } else {
          raw = op.v * mul * (1 + f.e.str * 0.02) * (1 + f.terAmp);
          if (f.mod.fear) raw *= 1 - f.mod.fear;
          hurt(f, target, raw);
        }
        total += raw;
        anyCrit = anyCrit || crit;
      }
      if (op.vsPoison && target.poison > 0) {
        const extra = op.vsPoison * mul;
        hurt(f, target, extra);
        total += extra;
      }
      if (side === 'p') {
        f.dealt += total;
        let leech = (op.leech || 0) + f.mod.leech;
        if (f.mod.lowLeech && f.p.hp < f.p.maxHp * 0.5) leech += f.mod.lowLeech;
        if (leech > 0) {
          const h = Math.round(total * leech);
          if (h > 0) { self.hp = Math.min(self.maxHp, self.hp + h); ev.push({ s: 'p', k: 'heal', v: h }); }
        }
      }
      ev.push({ s: side, k: 'dmg', v: Math.round(total), hits, crit: anyCrit, src: ctx.srcId });
      break;
    }
    case 'poison': {
      let v = op.v * mul;
      if (side === 'p' && f.mod.venom) { v *= 1 + f.mod.venom; v += 1; }
      target.poison = Math.max(target.poison, Math.round(v));
      target.poisonT = DOT_TURNS;
      ev.push({ s: side, k: 'poison', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'burn': {
      const v = Math.round(op.v * mul);
      target.burn = Math.max(target.burn, v);
      target.burnT = DOT_TURNS;
      ev.push({ s: side, k: 'burn', v, src: ctx.srcId });
      break;
    }
    case 'shield': {
      const v = op.v * mul;
      const cap = side === 'p' ? f.shieldCap : 60;
      self.shield = Math.min(cap, self.shield + v);
      ev.push({ s: side, k: 'shield', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'heal': {
      const v = Math.round(op.v * mul);
      self.hp = Math.min(self.maxHp, self.hp + v);
      ev.push({ s: side, k: 'heal', v, src: ctx.srcId });
      break;
    }
    case 'gold': {
      if (side === 'p') { f.gold += Math.round(op.v * mul); ev.push({ s: 'p', k: 'gold', v: Math.round(op.v * mul) }); }
      break;
    }
    case 'str': {
      self.str += op.v * mul;
      ev.push({ s: side, k: 'str', v: Math.round(op.v * mul * 10) / 10, src: ctx.srcId });
      break;
    }
    case 'vuln': {
      if (side === 'p') {
        target.vuln = Math.max(target.vuln, op.v * mul);
        target.vulnT = DOT_TURNS;
        ev.push({ s: 'p', k: 'vuln', v: op.v * mul, src: ctx.srcId });
      }
      break;
    }
    case 'slow': {
      if (side === 'p') {
        const add = Math.min(3 - f.e.slow, op.v * mul);
        if (add > 0) {
          f.e.slow += add;
          for (const s of f.e.skills) s.cd += add;
          ev.push({ s: 'p', k: 'slow', v: add });
        }
      }
      break;
    }
    case 'weaken': {
      if (side === 'e') {
        f.p.weak = Math.max(f.p.weak, op.v);
        f.p.weakT = op.t || 3;
        ev.push({ s: 'e', k: 'weaken', v: op.v });
      }
      break;
    }
    case 'stun': {
      if (side === 'e') {
        const n = op.v || 1;
        for (const u of f.units) u.timer = Math.max(0, u.timer - n);
        for (const w of f.wheels) w.timer = Math.max(0, w.timer - n);
        ev.push({ s: 'e', k: 'stun', v: n });
      }
      break;
    }
    case 'regen': {
      if (side === 'p') {
        f.mod.regen += op.v * mul;
        ev.push({ s: 'p', k: 'regen', v: Math.round(op.v * mul) });
      }
      break;
    }
    default: break;
  }
  return ev;
}

// 走一拍，返回这一拍的动画事件
export function stepFight(f) {
  const ev = [];
  if (f.over) return ev;
  f.t += 1;
  const ter = f.ter;

  // 1) 地形：敌我同吃
  if (ter.every && f.t % ter.every === 0) {
    if (ter.k === 'drain') {
      f.p.hp -= ter.v; f.e.hp -= ter.v;
      ev.push({ s: 'p', k: 'dmg', v: ter.v, ter: 1 });
      ev.push({ s: 'e', k: 'dmg', v: ter.v, ter: 1 });
    } else if (ter.k === 'heal') {
      f.p.hp = Math.min(f.p.maxHp, f.p.hp + ter.v);
      f.e.hp = Math.min(f.e.maxHp, f.e.hp + ter.v);
      ev.push({ s: 'p', k: 'heal', v: ter.v, ter: 1 });
    } else if (ter.k === 'shield') {
      f.p.shield = Math.min(f.shieldCap, f.p.shield + ter.v);
      f.e.shield = Math.min(60, f.e.shield + ter.v);
      ev.push({ s: 'p', k: 'shield', v: ter.v, ter: 1 });
    }
  }

  // 2) 每拍回血
  if (f.mod.regen) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + f.mod.regen);
    if (f.mod.regen >= 1) ev.push({ s: 'p', k: 'heal', v: Math.round(f.mod.regen), pas: 1 });
  }
  if (f.mod.ward && f.t % 4 === 0) {
    f.p.shield = Math.min(f.shieldCap, f.p.shield + f.mod.ward);
  }

  // 3) 状态结算
  for (const [side, obj] of [['p', f.p], ['e', f.e]]) {
    if (obj.poisonT > 0) {
      obj.hp -= obj.poison;
      obj.poisonT -= 1;
      ev.push({ s: side, k: 'poisonTick', v: obj.poison });
      if (!obj.poisonT) obj.poison = 0;
    }
    if (obj.burnT > 0) {
      hurt(f, obj, obj.burn);
      obj.burnT -= 1;
      ev.push({ s: side, k: 'burnTick', v: obj.burn });
      if (!obj.burnT) obj.burn = 0;
    }
    if (obj.vulnT > 0) obj.vulnT -= 1;
    if (obj.weakT > 0) obj.weakT -= 1;
  }
  if (checkOver(f)) return ev;

  // 4) 唤醒体出手：产算力 + 副效果
  f.cpuGain = 0;
  for (const u of f.units) {
    u.timer += 1;
    if (u.timer < u.cd) continue;
    u.timer = 0;
    const room = Math.max(0, f.cpuCap - f.cpu);
    const got = Math.min(room, u.gen);
    f.cpu += got;
    f.cpuGain += got;
    ev.push({ s: 'p', k: 'cpu', v: got, waste: u.gen - got, uid: u.uid });
    for (const op of u.act) ev.push(...applyOp(f, 'p', op, u.pow, { srcId: u.uid }));
    if (checkOver(f)) return ev;
  }

  // 5) 命轮开火：攒够算力才放
  for (const w of f.wheels) {
    if (w.timer < w.wcd) w.timer += 1;
    if (w.timer < w.wcd) { w.waiting = false; continue; }
    if (f.cpu < w.cost) { w.waiting = true; continue; }
    w.waiting = false;
    f.cpu -= w.cost;
    f.cpuSpent += w.cost;
    w.timer = 0;
    for (const op of w.def.op) ev.push(...applyOp(f, 'p', op, 1, { kind: 'wheel', srcId: w.uid }));
    // 再衍化：每场第一发命轮再打一次
    if (f.firstWheel && f.mod.dupFirst && !f.dupUsed) {
      f.dupUsed = true;
      for (const op of w.def.op) {
        if (op.k !== 'dmg') continue;
        const extra = Math.round(op.v * (op.hits || 1));
        f.e.hp -= extra;
        f.dealt += extra;
        ev.push({ s: 'p', k: 'dmg', v: extra });
      }
    }
    f.firstWheel = false;
    if (checkOver(f)) return ev;
  }

  // 6) 敌方技能
  for (const s of f.e.skills) {
    s.timer += 1;
    if (s.timer >= s.cd) {
      s.timer = 0;
      for (const op of s.op) {
        const isDmg = op.k === 'dmg' || op.k === 'poison' || op.k === 'burn';
        ev.push(...applyOp(f, 'e', op, isDmg ? f.atkMul : f.supMul, { src: {} }));
      }
    }
  }
  // 7) 毒圈：第 zoneFrom 拍之后，双方同时掉同样的固定点数（无视护盾），越往后越疼
  if (f.t > TUNING.zoneFrom && !f.over) {
    const pre = { p: f.p.hp / f.p.maxHp, e: f.e.hp / f.e.maxHp };
    const k = TUNING.zoneStep * (f.t - TUNING.zoneFrom);   // 固定点数：双方一样（不按血量比例），第 N 拍各掉 k 点
    const dp = k;
    const de = k;
    f.p.hp -= dp;
    f.e.hp -= de;
    f.zone = Math.round(k * 10) / 10;            // 当前每拍掉的点数（给界面显示）
    ev.push({ s: 'z', k: 'zone', p: dp, e: de, pct: f.zone, first: f.t === TUNING.zoneFrom + 1 });
    if (f.p.hp <= 0 && f.e.hp <= 0) {                // 同一拍双方一起倒：进圈前血线高的赢
      f.win = pre.p >= pre.e;
      f.over = f.win ? 'win' : 'lose';
      f.zoneEnd = true;
      return ev;
    }
  }
  checkOver(f);
  return ev;
}

function checkOver(f) {
  if (f.over) return true;
  if (f.e.hp <= 0) { f.over = 'win'; f.win = true; return true; }
  if (f.p.hp <= 0) { f.over = 'lose'; f.win = false; return true; }
  if (f.t >= TUNING.beats) {
    const pr = f.p.hp / f.p.maxHp, er = f.e.hp / f.e.maxHp;
    f.win = pr >= er;
    f.over = f.win ? 'win' : 'lose';
    f.timeout = true;
    return true;
  }
  return false;
}

export function autoFight(f) {
  let guard = 0;
  while (!f.over && guard++ < TUNING.beats + 2) stepFight(f);
  return f;
}

export function settle(run, f) {
  const income = Math.round((TUNING.income[Math.min(run.day, TUNING.income.length - 1)] || 0) * run.diff.income);
  let goldGain = f.gold + f.mod.gold + (f.win ? income : 0);
  if (run.pact.k === 'tank' && f.win) goldGain = Math.round(goldGain * 0.85);
  run.gold += goldGain;
  run.history.push({ day: run.day, foe: f.foe.n, win: f.win, hp: Math.max(0, Math.round(f.p.hp)) });
  let cleared = false;
  if (f.win) {
    run.wins += 1;
    if (run.pact.k === 'grow') run.bonusHp += run.pact.v;
    run.day += 1;
    run.freeReroll = 0;
    if (run.day > run.totalDays) { run.cleared = true; run.over = true; }
    else { pickFoe(run); rollShop(run, { free: true }); }
  } else {
    run.losses += 1;
    run.sane -= 1;
    if (run.sane <= 0 || run.day >= run.totalDays) {
      run.over = true;
    } else {
      run.day += 1;
      run.freeReroll = 0;
      pickFoe(run);
      rollShop(run, { free: true });
    }
  }
  return { goldGain, cleared };
}

export function scoreOf(run) {
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  const diffMul = run.diff.id === 'normal' ? 1 : run.diff.id === 'hard' ? 1.35 : run.diff.id === 'nightmare' ? 1.8 : 2.4;
  return Math.round((day * 120 + Math.max(0, run.sane) * 60 + run.gold * 2 + (run.cleared ? 400 : 0)) * diffMul);
}

// ---------------------------------------------------------------- 卡面文本（和数值同源，保证一致）
const num = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const pctv = (v) => Math.round(v * 100) + '%';

export function opText(op, mul = 1) {
  switch (op.k) {
    case 'dmg': {
      let t = `造成 ${num(op.v * mul)} 点伤害`;
      if (op.hits > 1) t += `，共 ${op.hits} 段`;
      if (op.pierce) t += '，无视护盾';
      if (op.leech) t += '，并吸取 30%';
      if (op.vsPoison) t += `，对中毒目标追加 ${num(op.vsPoison * mul)} 点`;
      return t;
    }
    case 'poison': return `施加 ${num(op.v * mul)} 层中毒（3 拍内每拍掉等量血，无视护盾）`;
    case 'burn': return `施加 ${num(op.v * mul)} 层灼烧（3 拍内每拍掉等量血）`;
    case 'shield': return `获得 ${num(Math.round(op.v * mul))} 点护盾`;
    case 'heal': return `回复 ${num(Math.round(op.v * mul))} 点生命`;
    case 'gold': return `战斗结束额外获得 ${num(Math.round(op.v * mul))} 金币`;
    case 'slow': return `对手所有技能延后 ${num(op.v * mul)} 拍`;
    case 'str': return `本场每次伤害 +${num(op.v * mul)}（可叠加）`;
    case 'vuln': return `目标受到的伤害 +${pctv(op.v * mul)}（3 拍）`;
    case 'regen': return `本场每拍回复 ${num(op.v * mul)} 点生命`;
    case 'thorns': return `受到伤害时反弹 ${num(op.v * mul)} 点`;
    case 'weaken': return `你的伤害 -${pctv(op.v)}（${op.t || 3} 拍）`;
    case 'stun': return '打断：所有唤醒体与命轮延后一拍';
    default: return '';
  }
}

// 造物的一条加成 → 文案
export function modText(k, v) {
  const z = MOD_ZH[k];
  if (!z) return '';
  const pctK = k === 'gen' || k === 'amp' || k === 'crit' || k === 'cdmg';
  const show = pctK ? String(Math.round(v * 100))
    : k === 'wcd' ? String(Math.round(v)) : num(v);
  return `${z[0]} ${z[1]}${show}${z[2]}`;
}

export function itemText(def) {
  if (!def || !def.m) return '';
  return modText(def.m.k, def.m.v);
}

export function wheelFireText(def) {
  return def.op.map((o) => opText(o, 1)).join('；');
}
