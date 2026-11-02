// 同调率（好感度）：带着某位唤醒体推关、送礼物，都会攒「同调点」。
//
// 为什么单独做一层：等级 / 叠位 / 装备是「数值」，羁绊是「组队关系」，
// 但它们都不认「你一直带着谁」。这一层认人——同一队刷得越久，那个人越强，
// 满级还会给她的技能加一条专属效果，等于给「一直用的老角色」一条不掉队的路。
//
// 数据形状（存在 state.aff）：
//   { day: 'YYYY-MM-DD', gifts: { flower, record, crystal }, pts: { [slug]: number } }
// 等级不单独存，一律从 pts 推（AFF_STEPS）——存两份迟早对不上。
import { ZERO, addBonus } from './gear.js';

export const AFF_MAX = 10;
/* 到第 n 级所需的累计点数（索引 0 = 1 级，不花点）。
   1→2 需 30，之后每级 +10：2→3 需 40……9→10 需 110，满级累计 630。 */
export const AFF_STEPS = [0, 30, 70, 120, 180, 250, 330, 420, 520, 630];

/** 同调等级（1..10），只由累计点数决定 */
export function affLv(pts) {
  const p = Math.max(0, Math.floor(Number(pts) || 0));
  let lv = 1;
  for (let i = 1; i < AFF_STEPS.length; i++) if (p >= AFF_STEPS[i]) lv = i + 1;
  return lv;
}
/** 当前等级内的进度：{ pts, at, next, pct }，满级 next = null */
export function affProgress(pts) {
  const p = Math.max(0, Math.floor(Number(pts) || 0));
  const lv = affLv(p);
  if (lv >= AFF_MAX) return { lv, pts: p, at: AFF_STEPS[AFF_MAX - 1], next: null, pct: 1 };
  const at = AFF_STEPS[lv - 1], next = AFF_STEPS[lv];
  return { lv, pts: p, at, next, pct: Math.max(0, Math.min(1, (p - at) / (next - at))) };
}

/* ---------- 礼物 ---------- */
export const GIFTS = [
  { id: 'flower', zh: '共鸣花束', pts: 8, price: 2600, desc: '最常见的礼物：一束会跟着心跳轻轻发光的干花。' },
  { id: 'record', zh: '旧唱片', pts: 22, price: 7800, desc: '雾港旧货铺淘来的唱片，放起来有沙沙的底噪。' },
  { id: 'crystal', zh: '共鸣水晶', pts: 60, price: 21000, desc: '把一段回忆封在里面的水晶，送出去就是把自己的时间给出去。' },
];
export const GIFT_BY_ID = Object.fromEntries(GIFTS.map((g) => [g.id, g]));
/** 每日补给：进游戏自动进包（不用点领取，省得忘了就没了） */
export const DAILY_GIFTS = { flower: 2, record: 1 };

/* ---------- 等级天赋 ---------- */
/* 只作用在这一个人身上（不是全队）。Lv10 那条是「卡牌特殊效果」，按定位给技能加一条 rider。 */
export const AFF_TALENTS = [
  { lv: 2, id: 'tune', zh: '同频', desc: '生命 +6%', b: { hpPct: 6 } },
  { lv: 4, id: 'sync', zh: '默契', desc: '攻击 +6%', b: { atkPct: 6 } },
  { lv: 6, id: 'stand', zh: '并肩', desc: '防御 +10%', b: { defPct: 10 } },
  { lv: 8, id: 'link', zh: '灵犀', desc: '暴击率 +5% · 暴击伤害 +10%', b: { critRate: 5, critDmg: 10 } },
  { lv: 10, id: 'pact', zh: '契约', desc: '卡牌特殊效果', card: true },
];

/* Lv10 的「卡牌特殊效果」按定位给，挂在技能一（Skill1）上：
   突击给真伤（绕开防御，也不被屏障抵消），守护给屏障，合唱给全队增伤 ——
   都是各自定位最缺的那块（突击缺破甲、守护缺主动减伤、合唱缺输出）。 */
export const CARD_EFFECT = {
  ASSAULT: { zh: '同调·贯穿', desc: '技能一追加：额外造成目标最大生命 8% 的真实伤害（不吃防御，也不被屏障抵消）', fx: () => ({ t: 'pctHp', pct: 8, to: 'foe' }) },
  WARDEN: { zh: '同调·壁垒', desc: '技能一追加：自身获得 2 层屏障（每层挡一次直接伤害）', fx: () => ({ t: 'status', s: 'barrier', n: 2, dur: 3, to: 'self' }) },
  CHORUS: { zh: '同调·和声', desc: '技能一追加：全队增伤 10%，持续 2 回合', fx: () => ({ t: 'buff', stat: 'amp', v: 10, dur: 2, to: 'allies' }) },
};
export const cardEffectOf = (type) => CARD_EFFECT[type] || CARD_EFFECT.ASSAULT;

/* ---------- 存档形状 ---------- */
export function emptyAff() {
  return { day: '', gifts: { flower: 0, record: 0, crystal: 0 }, pts: {}, ticks: 0 };
}
export const affOf = (state, slug) => Math.max(0, Math.floor(Number(state?.aff?.pts?.[slug]) || 0));

/** 把 state.aff 洗成合法形状（老存档 / 手改存档都能过） */
export function normalizeAff(raw) {
  const base = emptyAff();
  const s = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const gifts = {};
  for (const g of GIFTS) gifts[g.id] = Math.max(0, Math.floor(Number(s.gifts?.[g.id]) || 0));
  const pts = {};
  for (const [k, v] of Object.entries(s.pts && typeof s.pts === 'object' ? s.pts : {})) {
    const n = Math.max(0, Math.min(AFF_STEPS[AFF_MAX - 1], Math.floor(Number(v) || 0)));
    if (n > 0) pts[k] = n;
  }
  return { day: typeof s.day === 'string' ? s.day : '', gifts, pts, ticks: Math.max(0, Math.floor(Number(s.ticks) || 0)) };
}

const utcDay = (now) => new Date(now).toISOString().slice(0, 10);

/** 每日补给：跨天时把礼物补进包里，返回补了什么（没有跨天返回 null） */
export function affTick(state, now = Date.now()) {
  state.aff = normalizeAff(state.aff);
  const day = utcDay(now);
  if (state.aff.day === day) return null;
  const first = !state.aff.day;
  state.aff.day = day;
  // 老存档第一次进：只记下今天，不补历史（不然一上来白送一堆）
  if (first) return null;
  for (const [k, n] of Object.entries(DAILY_GIFTS)) state.aff.gifts[k] = (state.aff.gifts[k] || 0) + n;
  return { ...DAILY_GIFTS };
}

/* ---------- 加同调点 ---------- */
/** 直接加分，返回 { from, to, up, pts } */
export function addAff(state, slug, n) {
  state.aff = normalizeAff(state.aff);
  if (!slug || !(n > 0)) return { from: affLv(affOf(state, slug)), to: affLv(affOf(state, slug)), up: 0, pts: affOf(state, slug) };
  const before = affOf(state, slug);
  const after = Math.min(AFF_STEPS[AFF_MAX - 1], before + Math.round(n));
  state.aff.pts[slug] = after;
  const from = affLv(before), to = affLv(after);
  return { from, to, up: Math.max(0, to - from), pts: after };
}

/** 一场胜利里全队的同调增长：等级越高给得越多（1~3），首领关翻倍 */
export const affPerWin = (stage, boss = false) => {
  const n = 1 + Math.min(2, Math.floor(Math.max(0, stage) / 40));
  return boss ? n * 2 : n;
};

/** 战斗结算：给上场的四个人加分，返回 [{ slug, n, up, lv }] */
export function gainFromBattle(state, slugs, stage, boss = false) {
  const n = affPerWin(stage, boss);
  const out = [];
  for (const slug of new Set((slugs || []).filter(Boolean))) {
    const r = addAff(state, slug, n);
    out.push({ slug, n, up: r.up, lv: r.to });
  }
  return out;
}

/** 送一份礼物。返回 { ok, why?, pts?, up? } */
export function giveGift(state, slug, giftId) {
  state.aff = normalizeAff(state.aff);
  const g = GIFT_BY_ID[giftId];
  if (!g) return { ok: false, why: '没有这种礼物' };
  if (!(state.aff.gifts[giftId] > 0)) return { ok: false, why: `没有${g.zh}了` };
  if (affLv(affOf(state, slug)) >= AFF_MAX) return { ok: false, why: '同调已经满了' };
  state.aff.gifts[giftId] -= 1;
  const r = addAff(state, slug, g.pts);
  return { ok: true, pts: g.pts, up: r.up, lv: r.to };
}

/** 用金币买礼物（给金币一个长期出口）。价格随份数不打折，纯消耗。返回 { ok, why? } */
export function buyGift(state, giftId, n = 1) {
  const g = GIFT_BY_ID[giftId];
  if (!g) return { ok: false, why: '没有这种礼物' };
  const k = Math.max(1, Math.floor(n));
  const cost = Math.round(g.price * k);
  if ((state.gold || 0) < cost) return { ok: false, why: '金币不够' };
  state.gold -= cost;
  state.aff = normalizeAff(state.aff);
  state.aff.gifts[giftId] = (state.aff.gifts[giftId] || 0) + k;
  return { ok: true, cost, n: k };
}

/* ---------- 天赋加成 ---------- */
/** 这个人的同调天赋折算出的属性加成（ZERO 形态，给 addBonus 用） */
export function affBonus(state, slug) {
  const lv = affLv(affOf(state, slug));
  const b = ZERO();
  for (const t of AFF_TALENTS) if (!t.card && lv >= t.lv) addBonus(b, t.b);
  return b;
}

/* ---------- Lv10 卡牌特殊效果 ---------- */
/* 改的是「技能一」：追加一条 rider。返回新 kit（原对象不动），并且做缓存——
   allyDef 一屏里会被问几十次，不能每次都克隆一份 kit。
   level 一起进 key：技能等级会改 kit，换了等级就要重算。 */
const kitCache = new Map();
export function affKit(slug, type, kit, level) {
  if (!kit?.Skill1) return kit;
  const key = `${slug}|${type}|${level}`;
  const hit = kitCache.get(key);
  if (hit) return hit;
  const add = cardEffectOf(type);
  const rider = add.fx();
  if (!rider) return kit;
  const out = { ...kit, Skill1: { ...kit.Skill1, effects: [...kit.Skill1.effects, rider], aff: add.zh } };
  if (kitCache.size > 500) kitCache.clear();
  kitCache.set(key, out);
  return out;
}

/** 界面用：这个人满同调会拿到什么（不看是否已达成的说明文案） */
export function cardEffectText(type) {
  const e = cardEffectOf(type);
  return { zh: e.zh, desc: e.desc };
}
