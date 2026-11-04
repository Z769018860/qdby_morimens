// 《大巴扎：银钥》核心逻辑：商店、十格战场、自动战斗。
// 不碰 DOM，node 里能直接跑（scripts/bazaar-sim.mjs 就是拿它做平衡实测的）。
//
// 一场战斗的心跳是「拍」（beat），四个东西同时走：
//   唤酲体 —— 每 cd 拍产出 gen 点算力（顺手打一下 / 架盾 / 挂易伤），并对左右两家放光环；
//   命轮　 —— 攒够 cpu 算力就在自己的节拍上开一炮，主要输出；
//   造物　 —— 不占出手，纯静态加成（算力上限、产出、增伤、暴击……）；
//   地形　 —— 敌我同吃，熔岩掉血、雾障加盾、疾风加速、脆裂削血。
// 一直打到有人倒下。第 100 拍后出现「毒圈」：双方每拍同时掉最大生命的一截（真伤，无视护盾），越往后越疼，
// 直到有人倒下为止（按各自最大生命的百分比掉，所以拼的是血线）。TUNING.beats（1000）只是兜底，按剩余血量百分比判，正常碰不到。难度、当天曲线、地形表都在 js/bazaar-data.js。

import * as DATA from './bazaar-data.js';
import { EVENTS, EVENT_BY_ID } from './bazaar-events.js';

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
export const REALM_TRAIT = DATA.REALM_TRAIT;
export const RANK_ZH = DATA.RANK_ZH;
export const RANK_TIER = DATA.RANK_TIER;
export const WHEEL_TIER = DATA.WHEEL_TIER;
export const HERO_RANKS = DATA.HERO_RANKS;
export const WHEEL_RANKS = DATA.WHEEL_RANKS;
export const ALL_EVENTS = EVENTS;
export const eventOf = (id) => EVENT_BY_ID.get(id);

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
// 价格 = 基数 + 规模 - 全局减价。唤醒体按占格算，命轮按耗算力算。
// 调价只动 TUNING 里的四个数，免得两处写死打架。
export function heroPrice(def) {
  return TUNING.heroBase + (def.slots || 1) * TUNING.heroPerSlot - TUNING.priceCut;
}
export function wheelPrice(def) {
  return TUNING.wheelBase + Math.round((def.cpu || 12) / 2) - TUNING.priceCut;
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
    squad: [], wheels: [], relics: [], bench: [], cores: 0,
    shop: [], rerolls: 0, freeReroll: 0, freeShops: 0,
    shopRealm: null, realmSwitched: false, pendingEvent: null,
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

// ---------------------------------------------------------------- 战场（十五格：人和命轮共用）
// 唤醒体占 1~3 格，命轮占 1~2 格（SSR 占 2），一共 TUNING.fieldSlots（15）格。
// 站位顺序存在 run.order（uid 列表）：人和命轮混着排，可以互相拖动；
// 唤醒体的光环喂左右相邻的两个——不管邻居是人还是命轮。
// ---------------------------------------------------------------- 启灵 / 叠位
// 抓到同名的唤醒体 / 同一条命轮，就把它往上顶一档：
//   唤醒体 —— 1 启 / 2 启 / 3 启 / 超限 / 最终法则；命轮 —— 1 叠 / 2 叠 / 3 叠 / 超叠 / 终式。
// 每一档加什么不是一张全游戏通用的表，而是按「流派 / 机制族」分别设计，
// 表在 js/bazaar-arch.js 的 HERO_RANKS / WHEEL_RANKS（改数值只改那里）。
export const rankOf = (rec) => Math.min(TUNING.rankMax, (rec && rec.rank) || 0);
const ROUND = (x) => Math.round(x * 100) / 100;
// 取某一档的累计效果：gen / cd / cost / wcd 与段数逐档累加，
// 倍率（mul）按「这一档的总倍率」覆盖，extra / follow / echo 取当前档。
function rankStepOf(table, id, r) {
  const list = table && table[id];
  if (!list || !r) return {};
  const out = { mul: {} };
  let hits = 0;
  for (let i = 1; i <= r; i++) {
    const st = list[i];
    if (!st) continue;
    for (const k of ['gen', 'cd', 'cost', 'wcd']) if (st[k]) out[k] = (out[k] || 0) + st[k];
    if (st.mul) {
      for (const k of Object.keys(st.mul)) if (k !== 'hits') out.mul[k] = st.mul[k];
      if (st.mul.hits) hits += st.mul.hits;
    }
    if (st.extra) out.extra = st.extra;
    if (st.follow != null) out.follow = st.follow;
    if (st.aura) out.aura = true;
    if (st.echo != null) out.echo = st.echo;
  }
  if (hits) out.mul.hits = hits;
  out.d = (list[r] && list[r].d) || '';
  return out;
}

// 把这一档的 mul / extra 落到 op 列表上：伤害、毒、盾、治疗、段数、处决线、延后……
function rankOps(ops, step) {
  const m = step.mul || {};
  const out = ops.map((o0) => {
    const o = { ...o0 };
    if (o.k === 'dmg') {
      if (m.dmg) o.v = ROUND(o.v * m.dmg);
      if (m.hits) o.hits = (o.hits || 1) + m.hits;
      if (m.leech) o.leech = ROUND((o.leech || 0) + m.leech);
      if (m.pierce != null) o.pierce = Math.max(o.pierce || 0, m.pierce);
      if (m.exec != null) o.execute = m.exec;
    } else if (o.k === 'poison' || o.k === 'burn') {
      if (m.dot) o.v = Math.max(1, Math.round(o.v * m.dot));
    } else if (o.k === 'str') {
      if (m.str) o.v = ROUND(o.v * m.str);
    } else if (o.k === 'shield') {
      if (m.shield) o.v = ROUND(o.v * m.shield);
    } else if (o.k === 'heal') {
      if (m.heal) o.v = ROUND(o.v * m.heal);
    } else if (o.k === 'vuln') {
      if (m.vuln) o.v = ROUND(o.v * m.vuln);
    } else if (o.k === 'slow') {
      if (m.slow) o.v = ROUND(o.v * m.slow);
    }
    return o;
  });
  // extra 拿的是「已经放大过」的 op——它模拟的是每次出手真正多出来的那一下
  if (step.extra) out.push(...step.extra(out));
  return out;
}

// 详情面板直接吃这两条：当前这一档到底多了什么（和实现同源，别在界面里另抄一份）
export function heroRankDesc(def, rank) {
  const r = Math.min(TUNING.rankMax, Math.max(0, rank | 0));
  if (!r) return '基础形态。';
  return rankStepOf(HERO_RANKS, def && def.arch, r).d || '基础形态。';
}
export function wheelRankDesc(def, rank) {
  const r = Math.min(TUNING.rankMax, Math.max(0, rank | 0));
  if (!r) return '基础形态。';
  return rankStepOf(WHEEL_RANKS, def && def.arch, r).d || '基础形态。';
}
// 面板 / 战斗共用的「这个唤醒体在当前启灵下长什么样」
// 命轮在当前叠位下的实际 op（界面拿它显示「现在打多少」，和战斗同源）
export const wheelOp = (def, rank = 0) =>
  rankOps(def.op, rankStepOf(WHEEL_RANKS, def.arch, Math.min(TUNING.rankMax, rank | 0)));

export function heroPlan(def, rank = 0) {
  const r = Math.min(TUNING.rankMax, rank | 0);
  const step = rankStepOf(HERO_RANKS, def.arch, r);
  return {
    gen: def.gen + (step.gen || 0),
    cd: Math.max(TUNING.cdMin, def.cd - (step.cd || 0)),
    pow: 1,
    act: rankOps(def.act, step),
    follow: step.follow || 0,
    auraBoost: !!step.aura,
  };
}

export const wheelCells = (def) => (def && def.r === 'SSR' ? 2 : 1);
export function usedSlots(run) {
  let n = 0;
  for (const h of run.squad) n += (heroOf(h.key) || {}).slots || 1;
  for (const w of run.wheels) n += wheelCells(wheelOf(w.key));
  return n;
}
export function freeSlots(run) {
  return TUNING.fieldSlots - usedSlots(run);
}
// 让 run.order 和 squad / wheels 对齐：多出来的删掉，新来的接在末尾（人先、轮后）
export function syncOrder(run) {
  const ids = new Set([...run.squad.map((h) => h.uid), ...run.wheels.map((w) => w.uid)]);
  const ord = (run.order || []).filter((id) => ids.has(id));
  const seen = new Set(ord);
  for (const h of run.squad) if (!seen.has(h.uid)) { ord.push(h.uid); seen.add(h.uid); }
  for (const w of run.wheels) if (!seen.has(w.uid)) { ord.push(w.uid); seen.add(w.uid); }
  run.order = ord;
  return ord;
}
// 站位顺序：0 号在最左，往后依次排开，每个占 len 格；kind 区分唤醒体 / 命轮
export function layoutOf(run) {
  const ord = syncOrder(run);
  let at = 0;
  const out = [];
  for (const id of ord) {
    const h = run.squad.find((x) => x.uid === id);
    if (h) {
      const def = heroOf(h.key);
      out.push({ uid: h.uid, kind: 'hero', key: h.key, def, rank: rankOf(h), start: at, len: def.slots || 1 });
      at += def.slots || 1;
      continue;
    }
    const w = run.wheels.find((x) => x.uid === id);
    if (w) {
      const def = wheelOf(w.key);
      out.push({ uid: w.uid, kind: 'wheel', key: w.key, def, rank: rankOf(w), native: !!w.native, start: at, len: wheelCells(def) });
      at += wheelCells(def);
    }
  }
  return out;
}
export function canAddHero(run, id) {
  const def = heroOf(id);
  return !!def && usedSlots(run) + def.slots <= TUNING.fieldSlots;
}
export function canAddWheel(run, key) {
  const def = wheelOf(key);
  return !!def && usedSlots(run) + wheelCells(def) <= TUNING.fieldSlots;
}
const baseRank = (run) => (run.pact && run.pact.k === 'rank' ? Math.min(TUNING.rankMax, run.pact.v) : 0);
export function addHero(run, id) {
  if (!canAddHero(run, id)) return null;
  const rec = { uid: uid(), key: id, rank: baseRank(run) };
  run.squad.push(rec);
  syncOrder(run);
  return rec;
}
// 把一个人 / 命轮拖到站位的第 to 位（按「条目」数，不是格数）
export function moveHero(run, hid, to) {
  const ord = syncOrder(run);
  const from = ord.indexOf(hid);
  if (from < 0) return false;
  const t = Math.max(0, Math.min(ord.length - 1, to));
  if (t === from) return false;
  const [x] = ord.splice(from, 1);
  ord.splice(t, 0, x);
  return true;
}
export function removeHero(run, hid) {
  if (run.squad.length <= 1) return false;
  const i = run.squad.findIndex((h) => h.uid === hid);
  if (i < 0) return false;
  run.squad.splice(i, 1);
  syncOrder(run);
  return true;
}

// 每个位置从左右邻居那里吃到的光环（邻居是唤醒体才有光环）：人和命轮共用这一份，面板和实战不会错位
//   gen  产出 +v（人）/ 开火耗算力 −2v（命轮）
//   cd   节拍 −v（人 / 命轮都吃）
//   pow  动作 / 命轮效果 +v（比例，乘在所有 op 上）
//   dmg / dot / shd / heal / crit / pierce / leech  只乘对应的那一类 op（见 applyOp）
export function auraMap(run) {
  const lay = layoutOf(run);
  const m = new Map();
  lay.forEach((e, i) => {
    const o = { gen: 0, cost: 0, cd: 0, pow: 0, dmg: 0, dot: 0, shd: 0, heal: 0, crit: 0, pierce: 0, leech: 0 };
    for (const j of [i - 1, i + 1]) {
      const nb = lay[j];
      if (!nb || nb.kind !== 'hero' || !nb.def.aura) continue;
      const a = nb.def.aura;
      const r = Math.min(TUNING.rankMax, nb.rank | 0);
      // 超限之后光环本身也变强（哪个流派有这条，写在 HERO_RANKS 的 aura 字段上）：
      // 产算力光环不放大（否则算力会重新过剩），节拍 +1 整数档，其余 ×1.5。
      const boost = !!rankStepOf(HERO_RANKS, nb.def.arch, r).aura;
      if (a.k === 'gen') o.gen += a.v;
      else if (a.k === 'cost') o.cost += boost ? Math.round(a.v * 1.5) : a.v;
      else if (a.k === 'cd') o.cd += boost ? a.v + 1 : a.v;
      else o[a.k] = (o[a.k] || 0) + a.v * (boost ? 1.5 : 1);
    }
    m.set(e.uid, o);
  });
  return { lay, m };
}
// 面板上某条命轮（已吃到左右邻居光环 / 地形 / 造物之后）的实际耗算力、节拍、效果倍率
export function wheelPlan(run, e) {
  const ter = terrainOf(run.terrain);
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);
  const au = auraMap(run).m.get(e.uid) || { gen: 0, cd: 0, pow: 0 };
  return wheelStat(e.def, au, cdTer, modsOf(run), rankOf(e));
}
const wheelStat = (d, au, cdTer, mod, rank = 0) => {
  const r = Math.min(TUNING.rankMax, rank | 0);
  const step = rankStepOf(WHEEL_RANKS, d.arch, r);
  return {
    cost: Math.max(4, d.cpu - au.cost - (step.cost || 0)),
    wcd: Math.max(TUNING.wcdMin, d.wcd - au.cd + cdTer - mod.wcdDown - (step.wcd || 0)),
    pow: 1 + au.pow,
    op: rankOps(d.op, step),
    echo: step.echo || 1,
    follow: step.follow || 0,
  };
};

// 面板上的「每拍产出 / 每拍消耗」——和 createFight 用同一套规则，免得显示和实际对不上
export function planOf(run) {
  const mod = modsOf(run);
  const ter = terrainOf(run.terrain);
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);
  const { lay, m } = auraMap(run);
  let gen = 0;
  let need = 0;
  for (const e of lay) {
    const au = m.get(e.uid);
    if (e.kind === 'hero') {
      const hp = heroPlan(e.def, e.rank || 0);
      const cd = Math.max(TUNING.cdMin, hp.cd - au.cd + cdTer - mod.herocd);
      const g = Math.max(1, Math.round((hp.gen + au.gen) * (1 + mod.gen)));
      gen += g / cd;
    } else {
      const ws = wheelStat(e.def, au, cdTer, mod, e.rank || 0);
      need += ws.cost / ws.wcd;
    }
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
// 这不是数值平衡，是体感——开局摊位全摆造物，玩家连一次「换人 / 换轮」的选择都做不了。
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
  if (freeSlots(run) < 1) { hero *= 0.3; wheel += 0.04; }
  let relic = Math.max(0.06, 1 - hero - wheel);
  if (run.relics.length >= TUNING.relicSlots) relic *= 0.12;
  const sum = hero + wheel + relic;
  return { hero: hero / sum, wheel: wheel / sum, relic: relic / sum };
}

export function rollShop(run, { free = false, keep = false } = {}) {
  const rnd = run.rnd;
  if (!free) {
    const cost = TUNING.rerollCost + run.rerolls;
    if (run.freeShops > 0) {
      run.freeShops -= 1;
    } else if (run.pact.k === 'freereroll' && run.freeReroll < 1) {
      run.freeReroll += 1;
    } else {
      if (run.gold < cost) return false;
      run.gold -= cost;
      run.rerolls += 1;
    }
  }
  const n = TUNING.shopSize + (run.pact.k === 'rich' && run.day === 1 ? 1 : 0);   // 一次六个选项（2×3）
  const out = [];
  const used = new Set();
  const ownHeroes = new Set([...run.squad.map((h) => h.key), ...run.bench.filter((b) => b.kind === 'hero').map((b) => b.key)]);
  const ownWheels = new Set([...run.wheels.map((w) => w.key), ...run.bench.filter((b) => b.kind === 'wheel').map((b) => b.key)]);

  // 界域商店：玩家当天挑一个界域（或混合）。挑了就把人和命轮限制在那个界域里，
  // 造物不受限——造物本来就是通用的面板件。
  const realm = run.shopRealm || null;
  const inRealm = (d) => !realm || d.realm === realm;
  const ownedHeroRecs = () => [...run.squad, ...(run.bench || []).filter((b) => b.kind === 'hero')];
  const ownedWheelRecs = () => [...run.wheels, ...(run.bench || []).filter((b) => b.kind === 'wheel')];

  // 造一件指定类型的东西；造不出来（池子抽空 / 没槽位）返回 null
  const make = (kind, cheap = false) => {
    if (kind === 'hero') {
      let pool = HEROES.filter((h) => !ownHeroes.has(h.id) && inRealm(h) && (h.slots <= freeSlots(run) || benchRoom(run)) && (!cheap || h.slots <= 1));   // 装得下就直接上场；装不下但仓库有空位，买了进仓库
      if (!pool.length) pool = HEROES.filter((h) => !ownHeroes.has(h.id) && (h.slots <= freeSlots(run) || benchRoom(run)) && (!cheap || h.slots <= 1));
      if (!pool.length) return null;
      const h = ru(rnd, pool);
      if (!h || used.has('h' + h.id)) return null;
      used.add('h' + h.id);
      return { kind: 'hero', key: h.id, price: priceOf(run, heroPrice(h)) };
    }
    if (kind === 'wheel') {
      if (freeSlots(run) < 1 && !benchRoom(run)) return null;
      let pool = WHEELS.filter((w) => inRealm(w) && !ownWheels.has(w.id));
      if (!pool.length) pool = WHEELS.filter((w) => !ownWheels.has(w.id));
      const w = ru(rnd, pool);
      if (!w || used.has('w' + w.id) || ownWheels.has(w.id)) return null;
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

  // 升启报价：单独加一个摊位，不占那六个名额——已经有的人 / 命轮再「抓到一次」，
  // 不占格也不进仓库，直接往上叠一档（1/2/3 启 → 超限 → 最终法则）。
  // 放在最后，七个摊位时界面上单独占一整行。
  if (rnd() < TUNING.dupRate) {
    const cands = [
      ...ownedHeroRecs().filter((r) => rankOf(r) < TUNING.rankMax).map((r) => ({ kind: 'hero', r })),
      ...ownedWheelRecs().filter((r) => rankOf(r) < TUNING.rankMax).map((r) => ({ kind: 'wheel', r })),
    ].filter(({ kind, r }) => inRealm(kind === 'hero' ? heroOf(r.key) : wheelOf(r.key)));
    if (cands.length) {
      // 一半以上的时候往「已经喂得最高的那张」上叠：不然五档启灵在一局里永远摸不到。
      // 剩下的随机分，免得只堆一个、整队只有一个人能打。
      const top = Math.max(...cands.map(({ r }) => rankOf(r)));
      const lead = cands.filter(({ r }) => rankOf(r) === top);
      const pick = rnd() < 0.55 ? lead[Math.floor(rnd() * lead.length)] : cands[Math.floor(rnd() * cands.length)];
      const { kind, r } = pick;
      const d = kind === 'hero' ? heroOf(r.key) : wheelOf(r.key);
      const base = kind === 'hero' ? heroPrice(d) : wheelPrice(d);
      out.push({ kind, key: d.id, dup: true, sold: false, price: priceOf(run, Math.round(base * 0.7)) });
    }
  }

  run.shop = out;
  // 刷新价「当天每刷一次再贵 1 金」：只有新的一天 / 输后重来（free 且不 keep）才归零。
  // 以前每次刷完都清零，价格永远停在底价，新手指导里写的「每刷一次再贵」根本没生效。
  if (free && !keep) run.rerolls = 0;
  return true;
}

// 换一个界域的店：当天第一次免费，之后再换要花 1 金（和刷新同价）
export function setShopRealm(run, realm) {
  const next = realm || null;
  if ((run.shopRealm || null) === next) return { ok: true };
  if (run.realmSwitched) {
    if (run.gold < TUNING.realmShopCost) return { ok: false, why: '金币不够' };
    run.gold -= TUNING.realmShopCost;
  }
  run.realmSwitched = true;
  run.shopRealm = next;
  rollShop(run, { free: true, keep: true });     // 换界域商店不算新的一天：刷新价不归零
  return { ok: true };
}

export function defOf(offer) {
  if (offer.kind === 'hero') return heroOf(offer.key);
  if (offer.kind === 'wheel') return wheelOf(offer.key);
  return itemOf(offer.key);
}

export const benchRoom = (run) => (run.bench || []).length < TUNING.benchSlots + (run.pact && run.pact.k === 'bench' ? run.pact.v : 0);

export function canBuy(run, idx) {
  const o = run.shop[idx];
  if (!o || o.sold) return false;
  if (run.gold < o.price) return false;
  if (o.dup) return true;                                  // 升启不占格
  // 战场 / 命轮槽放不下时，只要仓库还有格子就能买（买下直接进仓库）
  if (o.kind === 'hero') return canAddHero(run, o.key) || benchRoom(run);
  if (o.kind === 'wheel') return canAddWheel(run, o.key) || benchRoom(run);
  return run.relics.length < TUNING.relicSlots;
}

export function buy(run, idx) {
  if (!canBuy(run, idx)) return false;
  const o = run.shop[idx];
  // 升启：买的是「已经有的人 / 命轮」，直接把它往上一档，不占格、不进仓库。
  // 先找目标再扣钱——卖掉了 / 已经到头了就当作买不成，别白白吃金币。
  if (o.dup) {
    const pool = o.kind === 'hero'
      ? [...run.squad, ...(run.bench || []).filter((b) => b.kind === 'hero')]
      : [...run.wheels, ...(run.bench || []).filter((b) => b.kind === 'wheel')];
    const rec = pool.find((r) => r.key === o.key && rankOf(r) < TUNING.rankMax);
    if (!rec) return false;
    run.gold -= o.price;
    o.sold = true;
    o.toBench = false;
    rec.rank = rankOf(rec) + 1;
    return true;
  }
  run.gold -= o.price;
  o.sold = true;
  o.toBench = false;
  if (o.kind === 'hero' && !canAddHero(run, o.key)) {
    run.bench.push({ uid: uid(), kind: 'hero', key: o.key, rank: baseRank(run) });
    o.toBench = true;
  } else if (o.kind === 'wheel' && !canAddWheel(run, o.key)) {
    run.bench.push({ uid: uid(), kind: 'wheel', key: o.key, rank: baseRank(run) });
    o.toBench = true;
  } else if (o.kind === 'hero') {
    const first = run.squad.length === 0;
    addHero(run, o.key);
    // 第一个唤醒体的本命命轮白送：开局没钱买齐命轮，先让领队能开出第一枪。
    if (first) {
      const d = heroOf(o.key);
      const nw = d && wheelOf(d.wheel);
      if (nw && canAddWheel(run, nw.id)) { run.wheels.push({ uid: uid(), key: nw.id, native: true, rank: baseRank(run) }); syncOrder(run); }
    }
  } else if (o.kind === 'wheel') { run.wheels.push({ uid: uid(), key: o.key, rank: baseRank(run) }); syncOrder(run); }
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
  const b = (run.bench || []).find((x) => x.uid === id);
  if (b) return { kind: b.kind, rec: b, def: b.kind === 'hero' ? heroOf(b.key) : wheelOf(b.key), bench: true };
  return null;
}

// ---------------------------------------------------------------- 仓库
// 战场放不下的人、命轮槽放不下的命轮先放仓库；仓库里的随时可以上场（或和场上的互换），也可以直接卖。
export function benchStore(run, id) {
  if (!benchRoom(run)) return { ok: false, why: '仓库满了，先卖一件' };
  const o = owned(run, id);
  if (!o || o.bench) return { ok: false, why: '找不到' };
  if (o.kind === 'hero') {
    if (run.squad.length <= 1) return { ok: false, why: '战场上至少留一个人' };
    run.squad.splice(run.squad.indexOf(o.rec), 1);
    run.bench.push({ uid: o.rec.uid, kind: 'hero', key: o.rec.key, rank: o.rec.rank || 0 });
    return { ok: true };
  }
  if (o.kind === 'wheel') {
    if (o.rec.native) return { ok: false, why: '本命命轮跟着第一个人走，不能收仓库' };
    run.wheels.splice(run.wheels.indexOf(o.rec), 1);
    run.bench.push({ uid: o.rec.uid, kind: 'wheel', key: o.rec.key, rank: o.rec.rank || 0 });
    return { ok: true };
  }
  return { ok: false, why: '造物不能进仓库' };
}
// 上场：战场 / 命轮槽有空位就直接上；没空位就要指定和谁互换（replaceId）
export function benchDeploy(run, id, replaceId = null) {
  const i = run.bench.findIndex((x) => x.uid === id);
  if (i < 0) return { ok: false, why: '找不到' };
  const b = run.bench[i];
  if (b.kind === 'hero') {
    const def = heroOf(b.key);
    if (usedSlots(run) + def.slots <= TUNING.fieldSlots && !replaceId) {
      run.bench.splice(i, 1);
      run.squad.push({ uid: b.uid, key: b.key, rank: b.rank || 0 });
      return { ok: true };
    }
    const out = replaceId && run.squad.find((h) => h.uid === replaceId);
    if (!out) return { ok: false, why: `战场只剩 ${freeSlots(run)} 格，得选一个人换下来`, needSwap: true };
    if (usedSlots(run) - (heroOf(out.key).slots || 1) + def.slots > TUNING.fieldSlots) return { ok: false, why: '换完还是放不下，换个占格多的下来' };
    const at = run.squad.indexOf(out);
    run.squad.splice(at, 1, { uid: b.uid, key: b.key, rank: b.rank || 0 });      // 站在被换下的人的位置上
    const oi = (run.order || []).indexOf(out.uid);
    if (oi >= 0) run.order.splice(oi, 1, b.uid);
    run.bench.splice(i, 1, { uid: out.uid, kind: 'hero', key: out.key, rank: out.rank || 0 });
    return { ok: true };
  }
  if (canAddWheel(run, b.key) && !replaceId) {
    run.bench.splice(i, 1);
    run.wheels.push({ uid: b.uid, key: b.key, rank: b.rank || 0 });
    syncOrder(run);
    return { ok: true };
  }
  const out = replaceId && run.wheels.find((w) => w.uid === replaceId);
  if (!out) return { ok: false, why: '战场格子不够，得选一条命轮换下来', needSwap: true };
  if (out.native) return { ok: false, why: '本命命轮不能换下' };
  if (usedSlots(run) - wheelCells(wheelOf(out.key)) + wheelCells(wheelOf(b.key)) > TUNING.fieldSlots) return { ok: false, why: '换完还是放不下，换个占格多的下来' };
  const at = run.wheels.indexOf(out);
  run.wheels.splice(at, 1, { uid: b.uid, key: b.key, rank: b.rank || 0 });
  const oi = (run.order || []).indexOf(out.uid);          // 站在被换下那条命轮的位置上
  if (oi >= 0) run.order.splice(oi, 1, b.uid);
  run.bench.splice(i, 1, { uid: out.uid, kind: 'wheel', key: out.key, rank: out.rank || 0 });
  return { ok: true };
}

export function sell(run, id) {
  const o = owned(run, id);
  if (!o) return 0;
  if (o.bench) {                                   // 仓库里的：直接卖，没有「留一个人」的限制
    const back = sellPrice(o.kind, o.def);
    run.bench.splice(run.bench.indexOf(o.rec), 1);
    run.gold += back;
    return back;
  }
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
// 造物能给的加成键。前 11 个是老的那批；后面几个是 3.9 加的「真机制」——
// 以前 310 件造物只有伤害/暴击/上限几种，同质化最严重的就是这一层。
const MOD_KEYS = [
  'cap', 'gen', 'amp', 'crit', 'cdmg', 'shcap', 'regen', 'start', 'wcd', 'thorns', 'gold',
  'flat', 'ward', 'leech', 'pierce', 'venom', 'fear', 'hp',
];

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
    // 3.9 新机制：界域共鸣、持续伤害/治疗/直伤放大、毒圈推迟、我方易伤、开局限启
    burst: 0, dotAmp: 0, healAmp: 0, fragile: 0, zoneDelay: 0, herocd: 0,
    multi: 0, realmHeal: 0,
    benchBonus: 0, startRank: 0, realm: null,
  };
  for (const r of run.relics) addMod(mod, itemOf(r.key).m.k, itemOf(r.key).m.v);
  for (const w of run.wheels) addWheelMod(mod, wheelOf(w.key));
  for (const h of run.squad) {
    const f = heroOf(h.key).fate;
    if (f) addMod(mod, f.k, f.v);
  }

  // 界域共鸣：同界域上场人数 2 / 3 / 4 人 → 三档。开本界域的店、一队同色，才吃得到。
  const cnt = {};
  for (const h of run.squad) {
    const r = heroOf(h.key).realm;
    if (r) cnt[r] = (cnt[r] || 0) + 1;
  }
  let top = null;
  let topN = 1;
  for (const k of Object.keys(cnt)) if (cnt[k] > topN) { top = k; topN = cnt[k]; }
  if (top) {
    const tr = REALM_TRAIT[top];
    const tier = Math.min(3, topN - 1);                    // 2 人 = 1 档，4 人 = 3 档
    if (tier >= 1) {
      const v = tr.v[tier - 1];
      mod.realm = { id: top, n: tr.n, count: topN, tier, v };
      if (tr.k === 'amp') mod.amp += v;
      else if (tr.k === 'dot') mod.dotAmp += v;
      else if (tr.k === 'heal') { mod.healAmp += v; mod.realmHeal = tr.sh[tier - 1]; }
      else if (tr.k === 'burst') { mod.burst += v; mod.pierce += tr.pierce[tier - 1]; }
      else if (tr.k === 'multi') mod.multi = v;              // 每一段都吃，段数越多越赚
    }
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
    case 'dotamp': mod.dotAmp += pact.v; mod.hp -= 15; break;
    case 'snipe': mod.pierce += pact.v; break;
    case 'zone': mod.zoneDelay = pact.v; break;
    case 'mossregen': mod.regen += pact.v; break;
    case 'bench': mod.benchBonus += pact.v; break;
    case 'rank': mod.startRank += pact.v; break;
    case 'herocd': mod.herocd += pact.v; break;
    case 'twoedge': mod.amp += pact.v; mod.fragile += 0.15; break;
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

  // 唤醒体 + 命轮（站位顺序里左右相邻的人给光环：人吃产出 / 节拍 / 动作加成，命轮吃耗算力 / 节拍 / 效果加成）
  const { lay, m: auras } = auraMap(run);
  const units = [];
  const wheels = [];
  for (const e of lay) {
    const au = auras.get(e.uid);
    if (e.kind === 'hero') {
      const d = e.def;
      const hp = heroPlan(d, e.rank || 0);
      units.push({
        uid: e.uid, def: d, rank: e.rank || 0, timer: 0, act: hp.act, aura: d.aura, fired: 0,
        cd: Math.max(TUNING.cdMin, hp.cd - au.cd + cdTer - mod.herocd),
        gen: Math.max(1, Math.round((hp.gen + au.gen) * (1 + mod.gen))),
        pow: (1 + au.pow) * hp.pow, follow: hp.follow || 0, a: au,
      });
    } else {
      const ws = wheelStat(e.def, au, cdTer, mod, e.rank || 0);
      wheels.push({
        uid: e.uid, def: e.def, rank: e.rank || 0, cost: ws.cost, wcd: ws.wcd, pow: ws.pow,
        op: ws.op, echoLeft: ws.echo, follow: ws.follow, a: au,
        timer: 0, native: !!e.native, waiting: false,
      });
    }
  }

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
    if (f.mod.fragile) amount *= 1 + f.mod.fragile;
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

// 我方伤害：kind='wheel' 才吃「命轮增伤」；au 是站位吃到的光环（暴击 / 伤害加成）
function rollDamage(f, base, kind, au = {}) {
  let raw = base + f.mod.flat + f.p.str * 0.5;
  raw *= 1 + (kind === 'wheel' ? f.mod.amp : 0) + f.terAmp + (f.mod.burst || 0);
  if (f.p.weakT > 0) raw *= 1 - f.p.weak;
  const crit = f.rnd() < Math.min(0.75, f.mod.crit + (au.crit || 0));
  if (crit) raw *= 1.5 + f.mod.cdmg;
  if (f.e.vulnT > 0) raw *= 1 + f.e.vuln;
  return { raw, crit };
}

function applyOp(f, side, op, mul, ctx = {}) {
  const ev = [];
  const src = ctx.src || {};
  const au = ctx.a || {};
  const target = side === 'p' ? f.e : f.p;
  const self = side === 'p' ? f.p : f.e;

  switch (op.k) {
    case 'dmg': {
      const hits = op.hits || 1;
      // 处决：目标掉到这个血线以下时，这发伤害 ×1.8（超维·处决命轮）
      const execute = side === 'p' && op.execute && target.hp <= target.maxHp * op.execute ? 1.8 : 1;
      // 多段共鸣：每一段都加一点，所以拆得越碎赚得越多（三段吃三份、一段只吃一份）
      const seg = side === 'p' && f.mod.multi ? 1 + f.mod.multi * hits : 1;
      // 伤害类光环：只放大伤害本身，不加毒也不加盾
      const dmgAura = 1 + (au.dmg || 0);
      const pierce = side === 'p'
        ? (op.pierce != null ? op.pierce : (ctx.kind === 'wheel' ? f.mod.pierce : 0)) + (au.pierce || 0)
        : 0;
      let total = 0;
      let anyCrit = false;
      for (let h = 0; h < hits; h++) {
        let raw;
        let crit = false;
        if (side === 'p') {
          const r = rollDamage(f, op.v * mul * execute * seg * dmgAura, ctx.kind, au);
          raw = r.raw; crit = r.crit;
          hurt(f, target, raw, pierce);
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
        let leech = (op.leech || 0) + f.mod.leech + (au.leech || 0);
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
      if (side === 'p') v *= (1 + f.mod.dotAmp) * (1 + (au.dot || 0));
      if (side === 'p' && f.mod.venom) { v *= 1 + f.mod.venom; v += 1; }
      target.poison = Math.max(target.poison, Math.round(v));
      target.poisonT = DOT_TURNS;
      ev.push({ s: side, k: 'poison', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'burn': {
      const v = Math.round(op.v * mul * (side === 'p' ? (1 + f.mod.dotAmp) * (1 + (au.dot || 0)) : 1));
      target.burn = Math.max(target.burn, v);
      target.burnT = DOT_TURNS;
      ev.push({ s: side, k: 'burn', v, src: ctx.srcId });
      break;
    }
    case 'shield': {
      const v = op.v * mul * (side === 'p' ? 1 + (au.shd || 0) : 1);
      const cap = side === 'p' ? f.shieldCap : 60;
      self.shield = Math.min(cap, self.shield + v);
      ev.push({ s: side, k: 'shield', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'heal': {
      let v = Math.round(op.v * mul);
      if (side === 'p') v = Math.round(v * (1 + f.mod.healAmp) * (1 + (au.heal || 0)));
      self.hp = Math.min(self.maxHp, self.hp + v);
      ev.push({ s: side, k: 'heal', v, src: ctx.srcId });
      if (side === 'p' && f.mod.realmHeal) {
        self.shield = Math.min(f.shieldCap, self.shield + f.mod.realmHeal);
        ev.push({ s: 'p', k: 'shield', v: f.mod.realmHeal, src: ctx.srcId });
      }
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
    for (const op of u.act) ev.push(...applyOp(f, 'p', op, u.pow, { srcId: u.uid, a: u.a }));
    // 追击档（最终法则 / 终式）：按这一档表里写的比例再打一次——不同流派追的东西不一样
    if (u.follow > 0) {
      for (const op of u.act) ev.push(...applyOp(f, 'p', op, u.pow * u.follow, { srcId: u.uid, a: u.a }));
    }
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
    for (const op of w.op) ev.push(...applyOp(f, 'p', op, w.pow || 1, { kind: 'wheel', srcId: w.uid, a: w.a }));
    // 回响：叠到超叠 / 终式之后，前几发开火各再结算一次（每场 echoLeft 次，用完为止）
    if (w.echoLeft > 0 && w.op.some((o) => o.k === 'echo')) {
      w.echoLeft -= 1;
      for (const op of w.op) {
        if (op.k !== 'dmg') continue;
        ev.push(...applyOp(f, 'p', op, w.pow || 1, { kind: 'wheel', srcId: w.uid, echo: true, a: w.a }));
      }
      ev.push({ s: 'p', k: 'echo', src: w.uid });
    }
    // 再衍化：每场第一发命轮再打一次
    if (f.firstWheel && f.mod.dupFirst && !f.dupUsed) {
      f.dupUsed = true;
      for (const op of w.op) {
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
  // 7) 毒圈：第 zoneFrom 拍之后，双方同时掉血（按各自最大生命的比例，无视护盾），越往后越疼
  const zoneAt = TUNING.zoneFrom + (f.mod.zoneDelay || 0);
  if (f.t > zoneAt && !f.over) {
    const pre = { p: f.p.hp / f.p.maxHp, e: f.e.hp / f.e.maxHp };
    const k = TUNING.zoneStep * (f.t - zoneAt);
    const dp = f.p.maxHp * k;
    const de = f.e.maxHp * k;
    f.p.hp -= dp;
    f.e.hp -= de;
    f.zone = Math.round(k * 1000) / 10;            // 当前每拍掉的百分比（给界面显示）
    ev.push({ s: 'z', k: 'zone', p: dp, e: de, pct: f.zone, first: f.t === zoneAt + 1 });
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
  let retry = false, stipend = 0;
  if (f.win) {
    run.wins += 1;
    run.dayLosses = 0;
    if (run.pact.k === 'grow') run.bonusHp += run.pact.v;
    run.day += 1;
    run.freeReroll = 0;
    if (run.day > run.totalDays) { run.cleared = true; run.over = true; }
    else {
      run.realmSwitched = false;                 // 新的一天，换界域商店又免费了
      pickFoe(run);
      rollShop(run, { free: true });
      run.pendingEvent = pickEvent(run);         // 打赢之后先撞上一件事，再看商店
    }
  } else {
    run.losses += 1;
    run.sane -= 1;
    run.dayLosses = (run.dayLosses || 0) + 1;
    if (run.sane <= 0) {
      run.over = true;
    } else {
      // 输了不往下走：留在这一天（同一个对手、同一片地形），发一笔「重整旗鼓」的金币，
      // 刷一批新货，让玩家在商店里把队伍补强再打一次。同一天输得越多，补给越厚。
      retry = true;
      stipend = Math.round(income * 1.5 * (1 + 0.25 * (run.dayLosses - 1))) + 6;
      run.gold += stipend;
      run.freeReroll = 0;
      rollShop(run, { free: true });
    }
  }
  return { goldGain, cleared, retry, stipend };
}

// ---------------------------------------------------------------- 战后事件
function pickEvent(run) {
  if (run.rnd() > 0.62) return null;
  const pool = EVENTS.filter((e) => !e.minDay || run.day >= e.minDay);
  return pool[Math.floor(run.rnd() * pool.length)].id;
}

const evRand = (run, arr) => arr[Math.floor(run.rnd() * arr.length) % arr.length];

// 选项落地。返回一句话给界面做提示（金币不够 / 拿到了什么）。
export function applyEvent(run, id, optIndex = 0) {
  const ev = EVENT_BY_ID.get(id);
  if (!ev) { run.pendingEvent = null; return ''; }
  const o = ev.opts[optIndex] || ev.opts[0];
  if (o.cost && run.gold < o.cost) return '金币不够';
  if (o.k === 'gamble' && run.gold < o.v) return '金币不够';
  if (o.cost) run.gold -= o.cost;
  let msg = '';
  switch (o.k) {
    case 'gold':
      run.gold += o.v;
      msg = `拿到 ${o.v} 金`;
      break;
    case 'gamble': {
      run.gold -= o.v;
      if (run.rnd() < o.odds) { run.gold += o.win; msg = `赢了，进账 ${o.win} 金`; }
      else msg = `输了，押的 ${o.v} 金没了`;
      break;
    }
    case 'maxhp':
      run.bonusHp += o.v;
      msg = `生命上限 +${o.v}`;
      break;
    case 'relic': {
      if (run.relics.length >= TUNING.relicSlots) { run.gold += 10; msg = '造物槽满了，折成 10 金'; break; }
      const it = evRand(run, SHOP_ITEMS);
      run.relics.push({ uid: uid(), key: it.id });
      msg = `得造物「${it.n}」`;
      break;
    }
    case 'hero': {
      const own = new Set([...run.squad.map((h) => h.key), ...(run.bench || []).map((b) => b.key)]);
      const pool = HEROES.filter((h) => !own.has(h.id));
      if (!pool.length) { run.gold += 12; msg = '没人可带，折成 12 金'; break; }
      const h = evRand(run, pool);
      if (canAddHero(run, h.id)) { addHero(run, h.id); msg = `「${h.n}」入队`; }
      else if (benchRoom(run)) {
        run.bench.push({ uid: uid(), kind: 'hero', key: h.id, rank: baseRank(run) });
        msg = `「${h.n}」进了仓库`;
      } else { run.gold += 12; msg = '队伍满了，折成 12 金'; }
      break;
    }
    case 'rank': {
      const cands = [...run.squad, ...(run.bench || []), ...run.wheels].filter((r) => rankOf(r) < TUNING.rankMax);
      if (!cands.length) { run.gold += 10; msg = '没有可升的，折成 10 金'; break; }
      const r = evRand(run, cands);
      r.rank = rankOf(r) + 1;
      const isWheel = r.kind === 'wheel' || run.wheels.includes(r);
      const d = isWheel ? wheelOf(r.key) : heroOf(r.key);
      const tier = isWheel ? WHEEL_TIER : RANK_TIER;
      msg = `「${d ? d.n : ''}」${isWheel ? '叠到' : '升到'} ${tier[r.rank] || r.rank}`;
      break;
    }
    case 'reroll':
      run.freeShops += o.v;
      if (o.gold) run.gold += o.gold;
      msg = `多了 ${o.v} 次免费刷新`;
      break;
    case 'realm':
      run.realmSwitched = false;
      if (o.gold) run.gold += o.gold;
      msg = '界域商店可以免费再换一次';
      break;
    default:
      break;
  }
  if (o.sane) {
    run.sane += o.sane;
    if (run.sane <= 0) { run.sane = 0; run.over = true; }
    msg += `，理智 ${o.sane > 0 ? '+' : ''}${o.sane}`;
  }
  if (o.maxhp) { run.bonusHp += o.maxhp; msg += `，生命上限 ${o.maxhp > 0 ? '+' : ''}${o.maxhp}`; }
  if (o.gold && o.k !== 'reroll' && o.k !== 'realm') run.gold += o.gold;
  run.pendingEvent = null;
  return msg;
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
      if (op.leech) t += `，并吸取 ${Math.round(op.leech * 100)}%`;
      if (op.vsPoison) t += `，对中毒目标追加 ${num(op.vsPoison * mul)} 点`;
      if (op.execute) t += `；目标生命低于 ${Math.round(op.execute * 100)}% 时伤害 ×1.8`;
      return t;
    }
    case 'poison': return `施加 ${num(op.v * mul)} 层中毒（3 拍内每拍掉等量血，无视护盾）`;
    case 'burn': return `施加 ${num(op.v * mul)} 层冻伤（3 拍内每拍掉等量血）`;
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
    case 'echo': return '回响：每场第一次开火，这一发再结算一次';
    default: return '';
  }
}

// 造物的一条加成 → 文案
export function modText(k, v) {
  const z = MOD_ZH[k];
  if (!z) return '';
  const pctK = k === 'gen' || k === 'amp' || k === 'crit' || k === 'cdmg'
    || k === 'leech' || k === 'pierce' || k === 'venom' || k === 'fear';
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
