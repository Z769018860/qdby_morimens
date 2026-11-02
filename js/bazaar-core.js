// 《大巴扎：银钥》核心逻辑：商店、布阵、自动战斗。
// 不碰 DOM，node 里能直接跑（scripts/bazaar-sim.mjs 就是拿它做平衡实测的）。
//
// 一场战斗的心跳是「拍」（beat）：造物按冷却排期，到点就触发，双方同时走；
// 40 拍打不完按剩余血量比例判。难度、当天曲线、怪物分池都在 js/bazaar-data.js。

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
export const REALM_COLOR = DATA.REALM_COLOR;

const DOT_TURNS = 3;
const ITEM_BY_ID = new Map(ITEMS.map((x) => [x.id, x]));
const WHEEL_BY_ID = new Map(WHEELS.map((x) => [x.id, x]));
const FOE_BY_ID = new Map(FOES.map((x) => [x.id, x]));
const HERO_BY_ID = new Map(HEROES.map((x) => [x.id, x]));
const PACT_BY_ID = new Map(PACTS.map((x) => [x.id, x]));

export const itemOf = (id) => ITEM_BY_ID.get(id);
export const wheelOf = (id) => WHEEL_BY_ID.get(id);
export const foeOf = (id) => FOE_BY_ID.get(id);
export const heroOf = (id) => HERO_BY_ID.get(id);
export const pactOf = (id) => PACT_BY_ID.get(id);
export const diffOf = (id) => DIFFS.find((d) => d.id === id) || DIFFS[0];

// 相邻：2 行 × 3 列，上下左右算相邻
export const ADJ = [
  [1, 3], [0, 2, 4], [1, 5],
  [0, 4], [1, 3, 5], [2, 4],
];

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
const mkItem = (key, tier = 1) => ({ uid: UID++, key, tier });

const RARITY_ORDER = ['N', 'SR', 'SSR'];

export function newRun({ seed = Date.now() >>> 0, heroId, pactId, diffId = 'normal' } = {}) {
  const hero = heroOf(heroId) || HEROES[0];
  const pact = pactOf(pactId) || PACTS[0];
  const diff = diffOf(diffId);
  const run = {
    seed, rnd: rngFrom(seed), hero, pact, diff, totalDays: diff.days,
    day: 1, sane: diff.sane, gold: TUNING.startGold,
    items: new Array(TUNING.slotN).fill(null),
    wheels: [],
    shop: [], rerolls: 0, freeReroll: 0,
    foeId: null, wins: 0, losses: 0,
    bonusHp: 0,
    over: false, cleared: false,
    history: [],
  };
  if (pact.k === 'rich') run.gold += pact.v;
  hero.kit.forEach((k, i) => { if (i < TUNING.slotN) run.items[i] = mkItem(k, 1); });
  // 本命命轮：直接戴在身上，白送一个词条
  const nw = wheelOf(hero.wheel);
  if (nw) run.wheels.push({ uid: UID++, key: nw.id, native: true, n: nw.n, spr: nw.spr, main: nw.main, mainZh: nw.mainZh, v: nw.v, realm: nw.realm, perk: nw.perk, cost: 0 });
  pickFoe(run);
  rollShop(run, { free: true });
  return run;
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
  const wN = Math.max(1.5, 11 - d * 1.15);
  const wSR = 2 + d * 0.8;
  const wSSR = Math.max(0, d - 2.5) * 0.95;
  const tot = wN + wSR + wSSR;
  const x = rnd() * tot;
  if (x < wSSR) return 'SSR';
  if (x < wSSR + wSR) return 'SR';
  return 'N';
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
  for (let i = 0; i < n; i++) {
    let offer = null;
    for (let tries = 0; tries < 14 && !offer; tries++) {
      if (rnd() < 0.2) {
        const w = ru(rnd, WHEELS);
        if (used.has('w' + w.id) || run.wheels.length >= 3) continue;
        used.add('w' + w.id);
        offer = { kind: 'wheel', key: w.id, price: priceOf(run, w.cost) };
      } else {
        const r = pickRarity(run, rnd);
        const pool = SHOP_ITEMS.filter((x) => x.r === r);
        if (!pool.length) continue;
        const it = ru(rnd, pool);
        if (used.has(it.id)) continue;
        used.add(it.id);
        offer = { kind: 'item', key: it.id, price: priceOf(run, it.cost) };
      }
    }
    if (offer) { offer.sold = false; out.push(offer); }
  }
  run.shop = out;
  run.rerolls = 0;
  return true;
}

export function defOf(offer) {
  return offer.kind === 'wheel' ? wheelOf(offer.key) : itemOf(offer.key);
}

export function firstEmptySlot(run) {
  return run.items.findIndex((x) => !x);
}

export function canBuy(run, idx) {
  const o = run.shop[idx];
  if (!o || o.sold) return false;
  if (run.gold < o.price) return false;
  if (o.kind === 'wheel') return run.wheels.length < 3;
  return firstEmptySlot(run) >= 0;
}

export function buy(run, idx) {
  if (!canBuy(run, idx)) return false;
  const o = run.shop[idx];
  run.gold -= o.price;
  o.sold = true;
  if (o.kind === 'wheel') {
    const w = wheelOf(o.key);
    run.wheels.push({ uid: UID++, key: w.id, n: w.n, spr: w.spr, main: w.main, mainZh: w.mainZh, v: w.v, realm: w.realm, perk: w.perk, cost: w.cost });
  } else {
    run.items[firstEmptySlot(run)] = mkItem(o.key, 1);
  }
  return true;
}

export function sell(run, uid) {
  for (let i = 0; i < run.items.length; i++) {
    const it = run.items[i];
    if (it && it.uid === uid) {
      const def = itemOf(it.key);
      const back = Math.max(1, Math.floor(def.cost * TUNING.sellRate * TUNING.tierMul[it.tier]));
      run.items[i] = null;
      run.gold += back;
      return back;
    }
  }
  const w = run.wheels.findIndex((x) => x.uid === uid);
  if (w >= 0 && !run.wheels[w].native) {
    const back = Math.max(1, Math.floor(run.wheels[w].cost * TUNING.sellRate));
    run.gold += back;
    run.wheels.splice(w, 1);
    return back;
  }
  return 0;
}

export function upgradeCost(run, it) {
  return TUNING.upgradeCost + (it.tier - 1) * 5;
}

export function upgrade(run, uid) {
  const it = run.items.find((x) => x && x.uid === uid);
  if (!it || it.tier >= 3) return false;
  const c = upgradeCost(run, it);
  if (run.gold < c) return false;
  run.gold -= c;
  it.tier += 1;
  return true;
}

// 把 a 槽的东西挪到 b 槽；b 槽有东西就交换；同款同阶则合并升阶
export function move(run, a, b) {
  if (a === b) return 'noop';
  const A = run.items[a], B = run.items[b];
  if (!A) return 'noop';
  if (B && B.key === A.key && B.tier === A.tier && A.tier < 3) {
    run.items[b] = { ...B, uid: B.uid, tier: B.tier + 1 };
    run.items[a] = null;
    return 'merge';
  }
  run.items[a] = B;
  run.items[b] = A;
  return 'swap';
}

// ---------------------------------------------------------------- 对手
export function rowOf(run, day = run.day) {
  return DATA.rowFor(day, run.diff.id);
}

export function pickFoe(run, day = run.day) {
  const row = rowOf(run, day);
  const id = ru(run.rnd, row.pool);
  run.foeId = id;
  return FOE_BY_ID.get(id);
}

// 一只怪技能表折算出来的「每拍输出」（不含当天系数），用来把同一天的不同怪拉到同一档。
// 中毒/灼烧按 3 拍持续结算，强化（str）按「每次攻击都多加一截」折中估。
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

// 会自愈/架盾/削弱的怪等于多了一大截血，从生命预算里扣掉
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
  const weaken = run.pact.k === 'weaken' ? 1 - run.pact.v : 1;
  const rankMul = row.boss && foe.rank !== 'boss' ? 1.06 : 1;
  const hpMul = foe.rank === 'boss' ? 1.12 : foe.rank === 'elite' ? 1.04 : 1;
  const sup = 1 + (day - 1) * 0.2;
  const t = Math.min(day, TUNING.dayHp.length - 1);
  // 难度的数值加成按天渐入：第一天只给一半，第三天给全。
  // 不这么做的话「深渊」开局就是 1.4 倍 + 精英，第一场等于抛硬币，
  // 玩家连摊子长什么样都还没看清就散场了（实测首日胜率 44%）。
  const ramp = day >= 3 ? 1 : 0.5 + (day - 1) * 0.25;
  const hpDiff = 1 + (diff.hp - 1) * ramp;
  const dpsDiff = 1 + (diff.dps - 1) * ramp;
  const budget = TUNING.dayHp[t] * hpDiff * weaken * rankMul * hpMul;
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
export function createFight(run) {
  const { foe, maxHp, atk, sup } = foeStats(run);
  const hero = run.hero;
  const pact = run.pact;
  const pas = hero.pas || { k: 'none', v: 0 };

  const mod = {
    amp: 0, crit: 0.08, cdmg: 0.5, regen: 0, gold: 0, flat: 0, hp: 0, ward: 0,
    leech: 0, cdDown: 0, openShield: 0, pierce: 0, thorns: 0, venom: 0, fear: 0,
    save: 0, dupFirst: 0, lowLeech: 0, headstart: 0, shieldCap: 60,
  };

  const addWheel = (w) => {
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
    if (p) {
      if (p.k === 'amp') mod.amp += p.v;
      else if (p.k === 'poison') mod.venom += p.v;
      else if (p.k === 'shield') mod.openShield += p.v;
      else if (p.k === 'haste') mod.headstart += p.v;
    }
  };
  for (const w of run.wheels) addWheel(w);

  // 唤醒体被动（12 种原型，数值随客户端副属性走）
  switch (pas.k) {
    case 'amp': mod.amp += pas.v; break;
    case 'pierce': mod.pierce += pas.v; break;
    case 'leech': mod.leech += pas.v; break;
    case 'regen': mod.regen += pas.v; break;
    case 'cddown': mod.cdDown += pas.v; break;
    case 'thorns': mod.thorns += pas.v; break;
    case 'tide': mod.hp += pas.v; break;
    case 'venom': mod.venom += pas.v; break;
    case 'bulwark': mod.shieldCap += pas.v; break;
    default: break;
  }

  // 密契
  switch (pact.k) {
    case 'cddown': mod.cdDown += pact.v; break;
    case 'dupfirst': mod.dupFirst = 1; break;
    case 'openshield': mod.openShield += pact.v; break;
    case 'lowleech': mod.lowLeech = pact.v; break;
    case 'glass': mod.amp += pact.v; mod.hp -= 12; break;
    case 'save': mod.save = pact.v; break;
    case 'bulwark2': mod.shieldCap += pact.v; mod.openShield += 15; break;
    case 'leech': mod.leech += pact.v; break;
    case 'headstart': mod.headstart += pact.v; break;
    case 'tank': mod.hp += pact.v; break;
    case 'greed': mod.amp += 0.2; break;
    case 'venom': mod.venom += pact.v; break;
    case 'fear': mod.fear = pact.v; break;
    case 'wolf': mod.amp += pact.v; mod.shieldCap -= 30; break;
    default: break;
  }

  const maxHP = Math.max(40, TUNING.startHp + mod.hp + run.bonusHp);
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
      skills: foe.skills.map((s) => ({ n: s.n, cd: s.cd, timer: 0, op: s.op })),
    },
    items: [], gold: 0, firstDone: false,
    mod, hero, pact, foe, diff: run.diff,
    atkMul: atk, supMul: sup, rnd: run.rnd,
    shieldCap: Math.max(10, mod.shieldCap),
    surgeT: 0, saveUsed: false, dupUsed: false,
    dealt: 0, taken: 0,
  };

  // 造物实例（含相邻光环、冷却）
  const live = [];
  run.items.forEach((it, slot) => {
    if (!it) return;
    const def = itemOf(it.key);
    const mul = TUNING.tierMul[it.tier] || 1;
    live.push({ slot, def, tier: it.tier, mul, timer: 0, cd: def.cd, aura: 0, auraCd: 0 });
  });
  // 相邻光环：光环造物只加成相邻的
  for (const a of live) {
    if (a.def.cd > 0) continue;
    const op = a.def.op[0] || {};
    for (const nb of ADJ[a.slot]) {
      const b = live.find((x) => x.slot === nb);
      if (!b) continue;
      if (op.k2 === 'cd') b.auraCd += (op.v || 0) * a.mul;
      else b.aura += (op.v || 0) * a.mul;
    }
  }
  // 冷却：密契/被动减拍，回溯/四月礼赞让计时先走几拍
  for (const a of live) {
    if (a.cd <= 0) continue;
    a.cd = Math.max(2, a.cd - Math.floor(a.auraCd) - mod.cdDown);
    if (mod.headstart) a.timer = Math.min(a.cd - 1, mod.headstart);
    if (pas.k === 'tempo') a.timer = Math.max(a.timer, Math.min(a.cd - 1, pas.v));
  }
  f.items = live;

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
    if (f.hero.pas.k === 'bulwark' && f.p.shield > 0) amount *= 0.8;
    f.taken += amount;
  }
  const lost = damageTo(target, amount, pierce);
  if (isPlayer && lost > 0 && f.mod.thorns > 0 && !f.over) {
    const back = Math.min(f.mod.thorns, Math.max(1, Math.round(amount * 0.35)));
    f.e.hp -= back;
    f.dealt += back;
  }
  if (isPlayer && f.p.hp <= 0 && f.mod.save && !f.saveUsed) {
    f.saveUsed = true;
    f.p.hp = Math.min(f.p.maxHp, f.mod.save);
  }
  return lost;
}

// 一方的伤害倍率
function rollDamage(f, side, base) {
  if (side === 'e') {
    let raw = base * (1 + f.e.str * 0.02);
    if (f.mod.fear) raw *= 1 - f.mod.fear;
    return { raw, crit: false };
  }
  let raw = base + f.p.str + f.mod.flat;
  raw *= 1 + f.mod.amp;
  if (f.p.weakT > 0) raw *= 1 - f.p.weak;
  const crit = f.rnd() < Math.min(0.6, f.mod.crit);
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
        const { raw, crit } = rollDamage(f, side, op.v * mul + (ctx.aura || 0));
        if (side === 'p') {
          hurt(f, target, raw, f.mod.pierce);
        } else {
          hurt(f, target, raw);
        }
        total += raw;
        anyCrit = anyCrit || crit;
      }
      if (op.vsPoison && target.poison > 0) {
        const extra = op.vsPoison * mul;
        hurt(f, target, extra, side === 'p' ? f.mod.pierce : 0);
        total += extra;
      }
      if (side === 'p') {
        f.dealt += total;
        let leech = (op.leech || 0) + f.mod.leech;
        if (f.mod.lowLeech && f.p.hp < f.p.maxHp * 0.5) leech += f.mod.lowLeech;
        if (leech > 0) {
          const h = Math.round(total * leech);
          if (h > 0) { self.hp = Math.min(self.maxHp, self.hp + h); ev.push({ s: 'p', k: 'heal', v: h, slot: src.slot }); }
        }
      }
      ev.push({ s: side, k: 'dmg', v: Math.round(total), hits, crit: anyCrit, slot: src.slot });
      break;
    }
    case 'poison': {
      let v = op.v * mul;
      if (side === 'p' && f.mod.venom) v *= 1 + f.mod.venom;
      if (side === 'p' && f.mod.venom) v += 1;
      target.poison = Math.max(target.poison, Math.round(v));
      target.poisonT = DOT_TURNS;
      ev.push({ s: side, k: 'poison', v: Math.round(v), slot: src.slot });
      break;
    }
    case 'burn': {
      const v = Math.round(op.v * mul);
      target.burn = Math.max(target.burn, v);
      target.burnT = DOT_TURNS;
      ev.push({ s: side, k: 'burn', v, slot: src.slot });
      break;
    }
    case 'shield': {
      const v = op.v * mul;
      const cap = side === 'p' ? f.shieldCap : 40;
      self.shield = Math.min(cap, self.shield + v);
      ev.push({ s: side, k: 'shield', v: Math.round(v), slot: src.slot });
      break;
    }
    case 'heal': {
      const v = Math.round(op.v * mul);
      self.hp = Math.min(self.maxHp, self.hp + v);
      ev.push({ s: side, k: 'heal', v, slot: src.slot });
      break;
    }
    case 'gold': {
      if (side === 'p') { f.gold += Math.round(op.v * mul); ev.push({ s: 'p', k: 'gold', v: Math.round(op.v * mul), slot: src.slot }); }
      break;
    }
    case 'str': {
      self.str += op.v * mul;
      ev.push({ s: side, k: 'str', v: Math.round(op.v * mul), slot: src.slot });
      break;
    }
    case 'vuln': {
      if (side === 'p') {
        target.vuln = Math.max(target.vuln, op.v * mul);
        target.vulnT = DOT_TURNS;
        ev.push({ s: 'p', k: 'vuln', v: op.v * mul, slot: src.slot });
      }
      break;
    }
    case 'slow': {
      if (side === 'p') {
        const add = Math.min(3 - f.e.slow, op.v * mul);
        if (add > 0) {
          f.e.slow += add;
          for (const s of f.e.skills) s.cd += add;
          ev.push({ s: 'p', k: 'slow', v: add, slot: src.slot });
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
        for (const it of f.items) if (it.cd > 0) it.timer = Math.max(0, it.timer - (op.v || 1));
        ev.push({ s: 'e', k: 'stun', v: op.v || 1 });
      }
      break;
    }
    case 'haste': {
      if (side === 'p') {
        for (const nb of ADJ[src.slot] || []) {
          const it = f.items.find((x) => x.slot === nb && x.cd > 0);
          if (it) it.cd = Math.max(2, it.cd - op.v);
        }
        ev.push({ s: 'p', k: 'haste', v: op.v, slot: src.slot, adj: ADJ[src.slot] });
      }
      break;
    }
    case 'charge': {
      if (side === 'p') {
        for (const nb of ADJ[src.slot] || []) {
          const it = f.items.find((x) => x.slot === nb && x.cd > 0);
          if (it) it.timer += op.v * mul;
        }
        ev.push({ s: 'p', k: 'charge', v: op.v, slot: src.slot, adj: ADJ[src.slot] });
      }
      break;
    }
    case 'regen': {
      if (side === 'p') {
        f.mod.regen += op.v * mul;
        ev.push({ s: 'p', k: 'regen', v: Math.round(op.v * mul), slot: src.slot });
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

  // 1) 被动
  const pas = f.hero.pas || {};
  if (pas.k === 'ward' && f.t % Math.max(2, pas.v) === 0) {
    const w = pas.w || 6;
    f.p.shield = Math.min(f.shieldCap, f.p.shield + w);
    ev.push({ s: 'p', k: 'shield', v: w, pas: 1 });
  }
  if (pas.k === 'tide' && f.p.hp < f.p.maxHp * 0.5) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + 1);
    ev.push({ s: 'p', k: 'heal', v: 1, pas: 1 });
  }
  if (f.mod.regen) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + f.mod.regen);
    if (f.mod.regen >= 1) ev.push({ s: 'p', k: 'heal', v: Math.round(f.mod.regen), pas: 1 });
  }
  if (f.mod.ward && f.t % 4 === 0) {
    f.p.shield = Math.min(f.shieldCap, f.p.shield + f.mod.ward);
  }
  if (pas.k === 'surge' && f.t % Math.max(2, pas.v) === 0) f.surgeT = 1;

  // 2) 状态结算
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

  // 3) 造物触发
  const queue = [];
  if (f.surgeT) {
    f.surgeT = 0;
    const active = f.items.filter((x) => x.cd > 0);
    if (active.length) queue.push(active[Math.floor(f.rnd() * active.length)]);
  }
  for (const it of f.items) {
    if (it.cd <= 0) continue;
    it.timer += 1;
    if (it.timer >= it.cd) { it.timer = 0; queue.push(it); }
  }
  let guard = 0;
  while (queue.length && guard++ < 32) {
    const it = queue.shift();
    const isFirst = !f.firstDone;
    f.firstDone = true;
    const mul = it.mul;
    for (const op of it.def.op) ev.push(...applyOp(f, 'p', op, mul, { src: it, aura: it.aura }));
    // 二律背反：第一件造物再算一次（只追加伤害类，免得刷盾刷到无敌）
    if (isFirst && f.pact.k === 'firstcrit') {
      const dmg = it.def.op.find((o) => o.k === 'dmg');
      if (dmg) {
        const extra = Math.round(dmg.v * mul + it.aura);
        hurt(f, f.e, extra, f.mod.pierce);
        ev.push({ s: 'p', k: 'dmg', v: extra, crit: true, slot: it.slot });
      }
    }
    // 再衍化：每场第一件造物触发完再触发一次
    if (isFirst && f.mod.dupFirst && !f.dupUsed) {
      f.dupUsed = true;
      queue.unshift(it);
    }
  }
  if (checkOver(f)) return ev;

  // 4) 敌方技能
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
  checkOver(f);
  return ev;
}

function checkOver(f) {
  if (f.over) return true;
  if (f.e.hp <= 0) { f.over = 'win'; f.win = true; return true; }
  if (f.p.hp <= 0) { f.over = 'lose'; f.win = false; return true; }
  // 打满还没分出胜负：按剩血百分比判，谁剩得多谁赢（同比例算玩家赢）
  if (f.t >= TUNING.beats) {
    const pr = f.p.hp / f.p.maxHp, er = f.e.hp / f.e.maxHp;
    f.win = pr >= er;
    f.over = f.win ? 'win' : 'lose';
    f.timeout = true;
    return true;
  }
  return false;
}

// 打完一整场（给模拟用）
export function autoFight(f) {
  let guard = 0;
  while (!f.over && guard++ < TUNING.beats + 2) stepFight(f);
  return f;
}

// 战斗结束 → 结算回 run
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
    if (run.pact.k === 'feast') run.bonusHp = Math.max(-TUNING.startHp, run.bonusHp); // 欢宴只是回血，不改上限
    run.day += 1;
    run.freeReroll = 0;
    if (run.day > run.totalDays) { run.cleared = true; run.over = true; }
    else { pickFoe(run); rollShop(run, { free: true }); }
  } else {
    run.losses += 1;
    run.sane -= 1;
    // 最后一天打输也算散场（这里以前会顺手标成通关）
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

// ---------------------------------------------------------------- 卡面文本（和 op 现算，保证一致）
const num = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));
const pct = (v) => Math.round(v * 100) + '%';

export function opText(op, mul = 1, aura = 0) {
  switch (op.k) {
    case 'dmg': {
      let t = `造成 ${num(op.v * mul + aura)} 点伤害`;
      if (op.hits > 1) t += `，共 ${op.hits} 次`;
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
    case 'haste': return `相邻造物冷却 -${num(op.v)} 拍（不改变已排的进度）`;
    case 'charge': return `相邻造物立刻推进 ${num(op.v * mul)} 拍`;
    case 'str': return `本场每次伤害 +${num(op.v * mul)}（可叠加）`;
    case 'vuln': return `目标受到的伤害 +${pct(op.v * mul)}（3 拍）`;
    case 'regen': return `本场每拍回复 ${num(op.v * mul)} 点生命`;
    case 'thorns': return `受到伤害时反弹 ${num(op.v * mul)} 点`;
    case 'weaken': return `你的伤害 -${pct(op.v)}（${op.t || 3} 拍）`;
    case 'stun': return '打断：所有造物延后一拍';
    case 'aura': return op.k2 === 'cd' ? `相邻造物冷却 -${num(aura || op.v)} 拍` : `相邻造物的伤害 +${num(aura || op.v)}`;
    default: return '';
  }
}

export function itemText(it) {
  const def = it.def || it;
  const mul = it.mul || 1;
  return def.op.map((o) => opText(o, mul)).filter(Boolean).join('；');
}

export function cdText(cd) {
  if (!cd) return '光环';
  if (cd <= 2) return '极快';
  if (cd <= 3) return cd + ' 拍';
  return cd + ' 拍';
}
