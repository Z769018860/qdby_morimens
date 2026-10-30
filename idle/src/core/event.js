// 联动活动「星辉直播间」：core/creators.js 里那 9 位主播的第二个获取口——攒人气换「嘉宾征召券」。
//
// 设计取舍：
//   - **常驻**而不是限时。这是个单机同人小游戏，玩家随时可能隔一个月回来，
//     限时活动只会让人空手而归，彩蛋角色的意义也就没了。
//   - 人气只涨不跌，且来源就三条：每日任务、推图里程碑、签到（每次 +5）。
//     **离线挂机的场次不计入每日任务**——睡一觉就把当日任务做完，任务就失去意义了；
//     离线收益本身照发，只是不算「今天陪播」。
//   - 人气不设上限，也不会过期。人气每 FAME_PER_TOKEN 点换一张「嘉宾征召券」，
//     券可以反复换同一个人——彩蛋角色不进池，叠位只能靠这个和签到轮转，量太小就没法玩。
import { CREATOR_BY_SLUG, grantCreator } from './creators.js';
import { MAX_AWAKEN } from './constants.js';

export const EVENT_ZH = '星辉直播间';
export const EVENT_SUB = '《忘却前夜》社区主播联动 · 常驻';
export const DAY = 86400000;
export const SIGNIN_FAME = 5;

export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const emptyEvent = () => ({ day: '', daily: { battles: 0, wins: 0, clears: 0, claimed: [] }, fame: 0, tiers: [], used: 0, miles: 0 });

export function eventState(state, now = Date.now()) {
  const e = (state.event ||= emptyEvent());
  e.daily ||= { battles: 0, wins: 0, clears: 0, claimed: [] };
  e.daily.claimed ||= [];
  e.tiers ||= [];
  e.fame = Math.max(0, Math.floor(e.fame || 0));
  e.miles = Math.max(0, Math.floor(e.miles || 0));
  e.used = Math.max(0, Math.floor(e.used || 0));
  const d = dayKey(now);
  if (e.day !== d) { e.day = d; e.daily = { battles: 0, wins: 0, clears: 0, claimed: [] }; }
  return e;
}

/* ---------- 每日任务 ---------- */
export const DAILY = [
  { id: 'battles', zh: '在线挂机 20 场', short: '场', need: 20, fame: 30 },
  { id: 'wins', zh: '赢下 15 场', short: '胜', need: 15, fame: 30 },
  { id: 'clears', zh: '首次通关 2 关', short: '关', need: 2, fame: 40 },
];

/** 在线战斗结算时调用（applyResult 之后）。rw 里要带 win / firstClear。 */
export function noteBattle(state, rw, now = Date.now()) {
  const e = eventState(state, now);
  e.daily.battles += 1;
  if (rw?.win) e.daily.wins += 1;
  if (rw?.firstClear) e.daily.clears += 1;
  return e.daily;
}

export function dailyView(state, now = Date.now()) {
  const e = eventState(state, now);
  return DAILY.map((t) => {
    const cur = Math.min(t.need, e.daily[t.id] || 0);
    return { ...t, cur, done: cur >= t.need, claimed: e.daily.claimed.includes(t.id) };
  });
}

export function claimDaily(state, id, now = Date.now()) {
  const e = eventState(state, now);
  const t = DAILY.find((x) => x.id === id);
  if (!t || e.daily.claimed.includes(id)) return null;
  if ((e.daily[id] || 0) < t.need) return null;
  e.daily.claimed.push(id);
  e.fame += t.fame;
  return { ...t };
}

/* ---------- 推图里程碑：最高通关每 10 关给一次人气（一次性，可一次领完） ---------- */
export const MILE = { step: 10, fame: 10, max: 100 };
export const mileReached = (state) => Math.min(MILE.max / MILE.step, Math.floor((state.maxStage || 0) / MILE.step));
export const milePending = (state) => {
  const e = eventState(state);
  return Math.max(0, mileReached(state) - e.miles);
};
export function claimMile(state) {
  const e = eventState(state);
  const n = milePending(state);
  if (!n) return null;
  e.miles += n;
  e.fame += n * MILE.fame;
  return { n, fame: n * MILE.fame };
}

/* ---------- 人气与嘉宾征召 ---------- */
export function fameOf(state, now = Date.now()) {
  const e = eventState(state, now);
  return e.fame + Math.max(0, Math.floor(state.stats?.signins || 0)) * SIGNIN_FAME;
}

// 人气只涨不跌，所以券是「累计赚到 − 已经用掉」，跨天、跨月都不会清零。
// 100 点一张：每天做满三个任务就是 100，加上签到的 5 点和推图里程碑，一天稳稳一张出头。
export const FAME_PER_TOKEN = 100;

// 九位嘉宾统一在这里：fame 是「人气门槛」，到了才能用券换。
// 签到那三位门槛 0——签到每天发一份，谁先到手看轮转顺序，门槛不用再卡。
export const GUESTS = [
  { slug: 'samo', fame: 0 },
  { slug: 'mengyi', fame: 0 },
  { slug: 'xiamolin', fame: 0 },
  { slug: 'zerok', fame: 60 },
  { slug: 'ratking', fame: 140 },
  { slug: 'chaoxing', fame: 240 },
  { slug: 'alice', fame: 360 },
  { slug: 'dragond', fame: 520 },
  { slug: 'maodie', fame: 700 },
];
export const GUEST_GATE = Object.fromEntries(GUESTS.map((g) => [g.slug, g.fame]));
export const TIERS = GUESTS;   // 旧名字，别处还引用着

export const usedTokens = (state, now = Date.now()) => Math.max(0, Math.floor(eventState(state, now).used || 0));

/** 手上还有几张征召券 */
export function tokensOf(state, now = Date.now()) {
  return Math.max(0, Math.floor(fameOf(state, now) / FAME_PER_TOKEN) - usedTokens(state, now));
}

/** 距下一张券还差多少人气（进度条用） */
export function tokenProgress(state, now = Date.now()) {
  const fame = fameOf(state, now);
  const next = (Math.floor(fame / FAME_PER_TOKEN) + 1) * FAME_PER_TOKEN;
  return { fame, next, left: Math.max(0, next - fame) };
}

/** 用一张券换某位嘉宾：没有就获得，有了就叠位 +1 */
export function redeemGuest(state, slug, now = Date.now()) {
  const a = CREATOR_BY_SLUG[slug];
  if (!a) return null;
  if (fameOf(state, now) < (GUEST_GATE[slug] || 0)) return null;
  if (tokensOf(state, now) <= 0) return null;
  const r = grantCreator(state, slug);
  if (!r) return null;
  if (!r.full) eventState(state, now).used += 1;
  return r;
}

export function tiersView(state, now = Date.now()) {
  const fame = fameOf(state, now);
  const tokens = tokensOf(state, now);
  return GUESTS.map((t) => {
    const a = CREATOR_BY_SLUG[t.slug];
    const own = state.roster?.[t.slug];
    const star = Math.max(0, Math.floor(own?.star || 0));
    const unlocked = fame >= t.fame;
    return {
      ...t, a, tokens, star,
      owned: !!own, unlocked,
      full: star >= MAX_AWAKEN,
      ready: unlocked && tokens > 0 && star < MAX_AWAKEN,
      left: Math.max(0, t.fame - fame),
    };
  });
}

// 老接口：以前是「够人气点一次解锁」，现在统一走征召券，保留名字给旧调用方
export function claimTier(state, slug, now = Date.now()) {
  return redeemGuest(state, slug, now);
}

/** 面板上的总览 */
export function eventSummary(state, now = Date.now()) {
  const e = eventState(state, now);
  const fame = fameOf(state, now);
  const doneToday = DAILY.filter((t) => e.daily.claimed.includes(t.id)).length;
  const owned = GUESTS.filter((g) => state.roster?.[g.slug]).length;
  const star = GUESTS.reduce((n, g) => n + Math.max(0, Math.floor(state.roster?.[g.slug]?.star || 0)), 0);
  const nextGate = GUESTS.filter((g) => fame < g.fame).sort((a, b) => a.fame - b.fame)[0];
  return {
    fame, tokens: tokensOf(state, now), used: usedTokens(state, now),
    doneToday, tasks: DAILY.length,
    owned, total: GUESTS.length, star,
    nextFame: nextGate ? nextGate.fame : null, nextSlug: nextGate?.slug ?? null,
    milePending: milePending(state),
    maxed: GUESTS.every((g) => Math.floor(state.roster?.[g.slug]?.star || 0) >= MAX_AWAKEN),
  };
}
