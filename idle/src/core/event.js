// 联动活动「星辉直播间」：把 core/creators.js 里那 6 位只走活动的主播一位一位送出去。
//
// 设计取舍：
//   - **常驻**而不是限时。这是个单机同人小游戏，玩家随时可能隔一个月回来，
//     限时活动只会让人空手而归，彩蛋角色的意义也就没了。
//   - 人气只涨不跌，且来源就三条：每日任务、推图里程碑、签到（每次 +5）。
//     **离线挂机的场次不计入每日任务**——睡一觉就把当日任务做完，任务就失去意义了；
//     离线收益本身照发，只是不算「今天陪播」。
//   - 人气不设上限，也不会过期。档位解锁后角色直接进 roster，不进抽卡池。
import { CREATOR_BY_SLUG, grantCreator } from './creators.js';

export const EVENT_ZH = '星辉直播间';
export const EVENT_SUB = '《忘却前夜》社区主播联动 · 常驻';
export const DAY = 86400000;
export const SIGNIN_FAME = 5;

export const dayKey = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

export const emptyEvent = () => ({ day: '', daily: { battles: 0, wins: 0, clears: 0, claimed: [] }, fame: 0, tiers: [], miles: 0 });

export function eventState(state, now = Date.now()) {
  const e = (state.event ||= emptyEvent());
  e.daily ||= { battles: 0, wins: 0, clears: 0, claimed: [] };
  e.daily.claimed ||= [];
  e.tiers ||= [];
  e.fame = Math.max(0, Math.floor(e.fame || 0));
  e.miles = Math.max(0, Math.floor(e.miles || 0));
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

/* ---------- 人气与档位 ---------- */
export function fameOf(state, now = Date.now()) {
  const e = eventState(state, now);
  return e.fame + Math.max(0, Math.floor(state.stats?.signins || 0)) * SIGNIN_FAME;
}

// 6 档，前慢后快：第一天做满任务就能拿下第一位，一周左右集齐
export const TIERS = [
  { fame: 60, slug: 'zerok' },
  { fame: 140, slug: 'ratking' },
  { fame: 240, slug: 'chaoxing' },
  { fame: 360, slug: 'alice' },
  { fame: 520, slug: 'dragond' },
  { fame: 700, slug: 'maodie' },
];

export function tiersView(state, now = Date.now()) {
  const e = eventState(state, now);
  const fame = fameOf(state, now);
  return TIERS.map((t) => {
    const a = CREATOR_BY_SLUG[t.slug];
    const owned = !!state.roster?.[t.slug];
    const claimed = e.tiers.includes(t.slug);
    return {
      ...t, a, owned, claimed,
      ready: !claimed && !owned && fame >= t.fame,
      left: Math.max(0, t.fame - fame),
    };
  });
}

export function claimTier(state, slug, now = Date.now()) {
  const e = eventState(state, now);
  const t = TIERS.find((x) => x.slug === slug);
  if (!t || e.tiers.includes(slug)) return null;
  if (fameOf(state, now) < t.fame) return null;
  const got = grantCreator(state, slug);
  e.tiers.push(slug);
  return got || { slug, zh: CREATOR_BY_SLUG[slug]?.zh || slug, isNew: false };
}

/** 面板上的总览：已解锁 / 总数 / 今日还能拿多少人气 */
export function eventSummary(state, now = Date.now()) {
  const e = eventState(state, now);
  const fame = fameOf(state, now);
  const doneToday = DAILY.filter((t) => e.daily.claimed.includes(t.id)).length;
  // 已经攒够但还没点「解锁」的档位优先提示；否则报下一个还差多少
  const ready = TIERS.find((t) => !e.tiers.includes(t.slug) && fame >= t.fame);
  const next = ready || TIERS.find((t) => !e.tiers.includes(t.slug));
  return {
    fame, doneToday, tasks: DAILY.length,
    owned: TIERS.filter((t) => e.tiers.includes(t.slug)).length, total: TIERS.length,
    nextFame: next && !ready ? next.fame : null, nextSlug: next?.slug ?? null, nextReady: !!ready,
    milePending: milePending(state),
  };
}
