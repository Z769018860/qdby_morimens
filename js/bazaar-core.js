// 《弥萨格大巴扎》核心逻辑：商店、布阵、自动战斗。
// 不碰 DOM，node 里能直接跑（scripts/bazaar-sim.mjs 就是拿它做平衡实测的）。
//
// 一场战斗的心跳是「拍」（beat）：造物按冷却排期，到点就触发，
// 双方同时走；谁先归零谁输，40 拍打不完算输。

import * as DATA from './bazaar-data.js';

// 这里的 build.mjs 只认 export const/let/function/class（没有 export {...} 重导出），
// 所以对外重新声明一遍，模拟脚本和界面都从这里拿。
export const TUNING = DATA.TUNING;
export const HEROES = DATA.HEROES;
export const ITEMS = DATA.ITEMS;
export const WHEELS = DATA.WHEELS;
export const WHEEL_FX = DATA.WHEEL_FX;
export const PACTS = DATA.PACTS;
export const FOES = DATA.FOES;
export const SCHEDULE = DATA.SCHEDULE;

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
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let UID = 1;
const mkItem = (key, tier = 1) => ({ uid: UID++, key, tier });

export function newRun({ seed = Date.now() >>> 0, heroId, pactId, totalDays = 12 } = {}) {
  const hero = heroOf(heroId) || HEROES[0];
  const pact = pactOf(pactId) || PACTS[0];
  const run = {
    seed, rnd: rngFrom(seed), hero, pact, totalDays,
    day: 1, sane: TUNING.sane, gold: TUNING.startGold,
    items: new Array(TUNING.slotN).fill(null),
    wheels: [],
    shop: [], rerolls: 0,
    foeId: null, wins: 0, losses: 0,
    bonusHp: 0,            // 光合祭礼之类的永久加血
    over: false, cleared: false,
    history: [],
  };
  if (pact.k === 'rich') run.gold += pact.v;
  hero.kit.forEach((k, i) => { run.items[i] = mkItem(k, 1); });
  // 本命命轮：直接戴在身上，白送一个词条
  run.wheels.push({ uid: UID++, key: 'native' + hero.id, native: true, n: hero.wheel.n, im: hero.wheel.im, main: hero.wheel.main, cost: 0 });
  pickFoe(run);
  rollShop(run, { free: true });
  return run;
}

// ---------------------------------------------------------------- 商店
export function priceOf(run, base) {
  const p = run.pact.k === 'discount' ? 1 - run.pact.v : 1;
  return Math.max(1, Math.round(base * p));
}

function pickRarity(run, rnd) {
  const d = run.day;
  const wN = Math.max(2, 12 - d * 1.3);
  const wSR = 2 + d * 0.75;
  const wSSR = Math.max(0, d - 3) * 0.85;
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
    if (run.gold < cost) return false;
    run.gold -= cost;
    run.rerolls += 1;
  }
  const n = 4 + (run.pact.k === 'rich' && run.day === 1 ? 1 : 0);
  const out = [];
  const used = new Set();
  for (let i = 0; i < n; i++) {
    let offer = null;
    for (let tries = 0; tries < 12 && !offer; tries++) {
      if (rnd() < 0.22) {
        const w = ru(rnd, WHEELS);
        if (used.has('w' + w.id)) continue;
        used.add('w' + w.id);
        offer = { kind: 'wheel', key: w.id, price: priceOf(run, w.cost) };
      } else {
        const r = pickRarity(run, rnd);
        const pool = ITEMS.filter((x) => x.r === r);
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
  if (o.kind === 'wheel') run.wheels.push({ uid: UID++, key: o.key, ...wheelOf(o.key) });
  else run.items[firstEmptySlot(run)] = mkItem(o.key, 1);
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
export function pickFoe(run, day = run.day) {
  const row = SCHEDULE.find((x) => x.day === day) || SCHEDULE[SCHEDULE.length - 1];
  const id = ru(run.rnd, row.pool);
  run.foeId = id;
  return FOE_BY_ID.get(id);
}

// 一只怪技能表折算出来的「每拍输出」（不含当天系数），用来把同一天的不同怪拉到同一档。
// 权重是经验值：中毒/灼烧按持续结算打折，护盾/治疗按等效血量折算。
// 中毒/灼烧是「3 拍内每拍掉 v 点」的持续伤害，等效总量 3v；折成每拍才好和其他技能相加。
export function rawDps(foe) {
  let d = 0;
  for (const s of foe.skills) {
    let per = 0;
    for (const op of s.op) {
      if (op.k === 'dmg') per += (op.v || 0) * (op.hits || 1);
      else if (op.k === 'poison' || op.k === 'burn') per += (op.v || 0) * 3;
    }
    d += per / Math.max(1, s.cd);
  }
  return Math.max(0.6, d);
}

// 会自愈/架盾的怪等于多了一大截血。这里把「撑住的血」从生命预算里扣掉，
// 否则一只治疗怪既有满额输出又打不死，同一天里它就成了必败场。
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
  const row = SCHEDULE.find((x) => x.day === day) || SCHEDULE[SCHEDULE.length - 1];
  const weaken = run.pact.k === 'weaken' ? 1 - run.pact.v : 1;
  const rankMul = row.boss && foe.rank !== 'boss' ? 1.06 : 1;
  const hpMul = foe.rank === 'boss' ? 1.12 : 1;
  const sup = 1 + (day - 1) * 0.2;
  const budget = TUNING.dayHp[day] * weaken * rankMul * hpMul;
  const sustain = supDps(foe) * sup * 22;
  return {
    foe,
    maxHp: Math.round(Math.max(budget * 0.55, budget - sustain)),
    // 起手要等冷却、收尾常常差半拍，实测三成左右的输出落在战斗之外；
    // 乘回去之后 dayDps 才真的等于「这只怪每拍打掉多少」。
    atk: (TUNING.dayDps[day] / rawDps(foe)) * 1.38,
    sup,
    boss: foe.rank === 'boss',
  };
}

// ---------------------------------------------------------------- 战斗
export function createFight(run) {
  const { foe, maxHp, atk, sup } = foeStats(run);
  const hero = run.hero;
  const pact = run.pact;

  // 汇总全局修正
  const mod = { amp: 0, crit: 0.1, cdmg: 0.5, regen: 0, gold: 0, flat: 0, hp: 0, ward: 0, leech: 0, cdDown: 0, openShield: 0 };
  const addWheel = (main) => {
    const fx = WHEEL_FX[main];
    if (!fx) return;
    for (const k of ['amp', 'crit', 'cdmg', 'regen', 'gold', 'flat', 'hp', 'ward']) if (fx[k]) mod[k] += fx[k];
  };
  addWheel(hero.wheel.main);
  for (const w of run.wheels) if (!w.native) addWheel(w.main);

  if (hero.pas.k === 'amp') mod.amp += hero.pas.v;
  if (hero.pas.k === 'tide') mod.hp += hero.pas.v;
  if (hero.pas.k === 'bulwark') mod.hp += 0;
  if (pact.k === 'cddown') mod.cdDown = pact.v;
  if (pact.k === 'leech') mod.leech = pact.v;
  if (pact.k === 'openshield') mod.openShield = pact.v;

  const maxHP = TUNING.startHp + mod.hp + run.bonusHp;
  const f = {
    t: 0, over: null, win: false,
    p: { hp: maxHP, maxHp: maxHP, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0 },
    e: {
      hp: maxHp, maxHp, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0, name: foe.n, im: foe.im, rank: foe.rank,
      skills: foe.skills.map((s) => ({ n: s.n, cd: s.cd, timer: 0, op: s.op })),
      slow: 0,
    },
    items: [], slotOf: [], gold: 0, firstDone: false,
    mod, hero, pact, foe,
    atkMul: atk, supMul: sup, rnd: run.rnd, pw: 1,
    shieldCap: 60 + (hero.pas.k === 'bulwark' ? hero.pas.v : 0),
    surgeT: 0, wardT: 0, saveUsed: false,
    dealt: 0, taken: 0,
  };

  // 造物实例（含相邻光环、冷却）
  const live = [];
  run.items.forEach((it, slot) => {
    if (!it) return;
    const def = itemOf(it.key);
    const mul = TUNING.tierMul[it.tier] || 1;
    live.push({ slot, def, tier: it.tier, mul, timer: 0, cd: def.cd, aura: 0 });
  });
  // 相邻光环：光环造物只加成相邻的
  for (const a of live) {
    if (a.def.cd > 0) continue;
    for (const nb of ADJ[a.slot]) {
      const b = live.find((x) => x.slot === nb);
      if (b) b.aura += (a.def.op[0].v || 0) * a.mul;
    }
  }
  // 冷却：密契减 1、拉蒙娜开局先走 2 拍
  for (const a of live) if (a.cd > 0) {
    a.cd = Math.max(2, a.cd - mod.cdDown);
    if (hero.pas.k === 'tempo') a.timer = Math.min(a.cd, hero.pas.v);
  }
  f.items = live;

  if (mod.openShield) f.p.shield = Math.min(f.shieldCap, mod.openShield);
  return f;
}

function damageTo(target, amount) {
  const sh = Math.min(target.shield, amount);
  target.shield -= sh;
  target.hp -= amount - sh;
  return amount - sh;
}

function hurt(f, target, amount) {
  if (target === f.p && f.hero.pas.k === 'bulwark' && f.p.shield > 0) amount *= 0.8;
  if (target === f.p) f.taken += amount;
  return damageTo(target, amount);
}

// 一方的伤害倍率：玩家吃暴击/增伤，敌人吃当天的 atk 系数
function rollDamage(f, side, base) {
  if (side === 'e') return { raw: base, crit: false };
  let raw = base * (1 + f.mod.amp);
  const crit = f.rnd() < f.mod.crit;
  if (crit) raw *= 1.5 + f.mod.cdmg;
  if (side === 'p' && f.hero.pas.k === 'bulwark' && f.p.shield > 0) raw *= 1;
  return { raw, crit };
}

function applyOp(f, side, op, mul, ctx = {}) {
  const ev = [];
  const src = ctx.src || {};
  const e = f.e, p = f.p;
  const target = side === 'p' ? e : p;
  const self = side === 'p' ? p : e;

  switch (op.k) {
    case 'dmg': {
      const hits = op.hits || 1;
      let total = 0;
      let anyCrit = false;
      for (let h = 0; h < hits; h++) {
        const { raw, crit } = rollDamage(f, side, op.v * mul + (ctx.aura || 0) + (side === 'p' ? f.mod.flat : 0));
        if (op.pierce) target.hp -= raw; else hurt(f, target, raw);
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
        const leech = (op.leech || 0) + f.mod.leech;
        if (leech > 0) {
          const h = Math.round(total * leech);
          if (h > 0) { self.hp = Math.min(self.maxHp, self.hp + h); ev.push({ s: 'p', k: 'heal', v: h }); }
        }
      }
      ev.push({ s: side, k: 'dmg', v: Math.round(total), hits, crit: anyCrit, slot: src.slot });
      break;
    }
    case 'poison': {
      let v = op.v * mul;
      if (side === 'p' && f.hero.pas.k === 'venom') v += 1;
      target.poison = Math.max(target.poison, v);
      target.poisonT = DOT_TURNS;
      ev.push({ s: side, k: 'poison', v, slot: src.slot });
      break;
    }
    case 'burn': {
      const v = op.v * mul;
      target.burn = Math.max(target.burn, v);
      target.burnT = DOT_TURNS;
      ev.push({ s: side, k: 'burn', v, slot: src.slot });
      break;
    }
    case 'shield': {
      const v = op.v * mul;
      self.shield = Math.min(side === 'p' ? f.shieldCap : 40, self.shield + v);
      ev.push({ s: side, k: 'shield', v, slot: src.slot });
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
  if (f.hero.pas.k === 'ward' && f.t % f.hero.pas.v === 0) {
    f.p.shield = Math.min(f.shieldCap, f.p.shield + 8);
    ev.push({ s: 'p', k: 'shield', v: 8, pas: 1 });
  }
  if (f.hero.pas.k === 'tide' && f.p.hp < f.p.maxHp * 0.5) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + 1);
    ev.push({ s: 'p', k: 'heal', v: 1, pas: 1 });
  }
  if (f.mod.regen) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + f.mod.regen);
    if (f.mod.regen >= 1) ev.push({ s: 'p', k: 'heal', v: f.mod.regen, pas: 1 });
  }
  if (f.mod.ward && f.t % 4 === 0) {
    f.p.shield = Math.min(f.shieldCap, f.p.shield + f.mod.ward);
  }
  // 24 的狂气：每 N 拍随机一件造物立刻触发
  if (f.hero.pas.k === 'surge' && f.t % f.hero.pas.v === 0) {
    f.surgeT = 1;
  }

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
  while (queue.length && guard++ < 24) {
    const it = queue.shift();
    const isFirst = !f.firstDone;
    f.firstDone = true;
    const mul = it.mul;
    for (const op of it.def.op) ev.push(...applyOp(f, 'p', op, mul, { src: it, aura: it.aura }));
    // 首次触发 ×2（二律背反）
    if (isFirst && f.pact.k === 'firstcrit') {
      // 追加一次等额伤害，简单直接
      const dmg = it.def.op.find((o) => o.k === 'dmg');
      if (dmg) {
        const extra = Math.round(dmg.v * mul + it.aura);
        hurt(f, f.e, extra);
        ev.push({ s: 'p', k: 'dmg', v: extra, crit: true, slot: it.slot });
      }
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
  const goldGain = f.gold + (f.win ? TUNING.income[run.day] : 0) + f.mod.gold;
  run.gold += goldGain;
  run.history.push({ day: run.day, foe: f.foe.n, win: f.win, hp: Math.max(0, Math.round(f.p.hp)) });
  let cleared = false;
  if (f.win) {
    run.wins += 1;
    if (run.pact.k === 'grow') run.bonusHp += run.pact.v;
    run.day += 1;
    if (run.day > run.totalDays) { run.cleared = true; run.over = true; }
    else { pickFoe(run); rollShop(run, { free: true }); }
  } else {
    run.losses += 1;
    run.sane -= 1;
    // 最后一天打输也算散场（以前这里会顺手标成通关，白送一个「摊子开到最后」）
    if (run.sane <= 0 || run.day >= run.totalDays) {
      run.over = true;
    } else {
      run.day += 1;
      pickFoe(run);
      rollShop(run, { free: true });
    }
  }
  return { goldGain, cleared };
}

export function scoreOf(run) {
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  return day * 120 + Math.max(0, run.sane) * 60 + run.gold * 2 + (run.cleared ? 400 : 0);
}

// ---------------------------------------------------------------- 卡面文本（和 op 现算，保证一致）
const num = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));

export function opText(op, mul = 1, aura = 0) {
  switch (op.k) {
    case 'dmg': {
      const v = num(Math.round(op.v * mul + aura));
      let t = `造成 ${v} 点伤害`;
      if (op.hits > 1) t += ` ${op.hits} 次`;
      if (op.pierce) t += '（无视护盾）';
      if (op.vsPoison) t += `；目标中毒时再造成 ${num(Math.round(op.vsPoison * mul))} 点`;
      if (op.leech) t += `；吸取 ${Math.round(op.leech * 100)}% 伤害为生命`;
      return t;
    }
    case 'poison': return `施加 ${num(op.v * mul)} 点中毒（${DOT_TURNS} 拍，无视护盾）`;
    case 'burn': return `施加 ${num(op.v * mul)} 点灼烧（${DOT_TURNS} 拍）`;
    case 'shield': return `获得 ${num(Math.round(op.v * mul))} 点护盾`;
    case 'heal': return `回复 ${num(Math.round(op.v * mul))} 点生命`;
    case 'gold': return `战斗中额外获得 ${num(Math.round(op.v * mul))} 金币`;
    case 'slow': return `敌方所有技能冷却 +${num(op.v * mul)}`;
    case 'haste': return `相邻造物冷却 -${num(op.v)}`;
    case 'charge': return `相邻造物计时立刻 +${num(op.v * mul)} 拍`;
    case 'aura': return `相邻造物伤害 +${num(Math.round(op.v * mul))}`;
    default: return '';
  }
}

export function itemText(it, tier = 1) {
  const def = itemOf(it.key || it.id);
  const mul = TUNING.tierMul[tier];
  return def.op.map((o) => opText(o, mul)).join('；');
}

export function cdText(cd) {
  return cd > 0 ? `${cd} 拍` : '光环';
}
