// 编队：预先存好的几套阵容，队伍页统一编排，挑战按各自指定的那套出战。
// 一套编队 = 4 个唤醒体 + 可选的「独立配装」lo：{ equip: {slug:{wheel,cov}}, relics: [6 格 uid], orders: [3 个钥令 id] }。
// 没有 lo 的编队沿用主线队伍的配装（命轮 / 密契绑在人身上，造物与钥令全队共用）；
// 有 lo 的编队出战时用自己的这一套——和主线队伍一样完整：每人命轮 + 密契、6 格造物、3 个钥令位。
// 同一件装备可以同时出现在不同编队里（各队的战斗彼此独立），只在同一套里不能重复。
import { TEAM_SIZE, RELIC_SLOTS, ORDER_SLOTS } from './constants.js';

export const SQUAD_KEYS = ['a', 'b', 'c', 'd', 'e'];
// 融灾禁区专用编队：它一层要五队齐上，跟通用那五套分开存。
// 之前是直接借一队~五队用，结果「为禁区调的五套」和「推图 / 塔 / 周Boss 在用的那套」
// 是同一份数据，改一边另一边跟着变，两边都不好用。
export const RIFT_SQUAD_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5'];
// 属性塔专用编队：混沌 / 血肉 / 深海 / 超维 各一套，只收本界域的人。
// 同样是踩过坑才拆出来的——之前四座塔都借通用一队~五队，默认还都落在「一队」，
// 于是给混沌塔编一次，血肉 / 深海 / 超维跟着一起变，等于四座塔共用一套。
export const TOWER_SQUAD_KEYS = ['t_CHAOS', 't_CARO', 't_AEQUOR', 't_ULTRA'];
export const ALL_SQUAD_KEYS = [...SQUAD_KEYS, ...RIFT_SQUAD_KEYS, ...TOWER_SQUAD_KEYS];
export const SQUAD_ZH = {
  a: '一队', b: '二队', c: '三队', d: '四队', e: '五队',
  r1: '禁区一队', r2: '禁区二队', r3: '禁区三队', r4: '禁区四队', r5: '禁区五队',
  t_CHAOS: '混沌尖塔队', t_CARO: '血肉之塔队', t_AEQUOR: '深海回廊队', t_ULTRA: '超维阶梯队',
};
export const isRiftSquad = (k) => RIFT_SQUAD_KEYS.includes(k);
export const isTowerSquad = (k) => TOWER_SQUAD_KEYS.includes(k);

// 挑战入口：每个入口单独记「用哪套队」，默认跟随当前队伍。
// 属性塔按界域拆开——混沌塔只能上混沌队，四个界域各存一份选择才讲得通。
// 融灾禁区（rift）不在这里：它一次要 5 队齐上，所以不做「选一套」，
// 用的是 RIFT_SQUAD_KEYS 那五套专用编队（队伍页单独一组）。
export const SQUAD_MODES = [
  ['tower', '无限塔'],
  ['rt_CHAOS', '混沌尖塔'], ['rt_CARO', '血肉之塔'], ['rt_AEQUOR', '深海回廊'], ['rt_ULTRA', '超维阶梯'],
  ['weekly', '周Boss'], ['trial', '融灾'], ['arena', '竞技场'],
];
export const MODE_ZH = Object.fromEntries(SQUAD_MODES);
// 队伍页把入口分组显示，塔的四个界域压成一段，免得八行铺满一屏；
// rift 单独一组：它不吃「用哪一套」，而是五套一起上。
export const MODE_GROUPS = [
  ['无限塔', ['tower'], '一层层往上爬的连续战斗'],
  ['属性塔', ['rt_CHAOS', 'rt_CARO', 'rt_AEQUOR', 'rt_ULTRA'], '只收本界域成员，四座塔各存一套'],
  ['周 Boss', ['weekly'], '限 12 回合拼伤害'],
  ['融灾试炼', ['trial'], '区域首领，逐级解锁'],
  ['竞技场', ['arena'], '天梯与好友对战共用'],
  ['融灾禁区', ['rift'], '一次派五队：禁区一队~五队各打一组'],
];
export const RIFT_MODE = 'rift';
export const RT_MODES = ['rt_CHAOS', 'rt_CARO', 'rt_AEQUOR', 'rt_ULTRA'];
export const rtModeOf = (realm) => `rt_${realm}`;
export const realmOfMode = (mode) => (String(mode).startsWith('rt_') ? String(mode).slice(3) : null);
/** 属性塔某座塔的专用编队位（不是属性塔入口就返回 null） */
export const towerSquadKey = (mode) => { const r = realmOfMode(mode); return r ? `t_${r}` : null; };

export const emptySquads = () => Object.fromEntries(ALL_SQUAD_KEYS.map((k) => [k, { team: [] }]));
export const emptyPick = () => Object.fromEntries(SQUAD_MODES.map(([k]) => [k, 'cur']));

// 存档迁移：换版本后 roster 会变，编队里已经不存在的 slug 直接丢掉
export function normalizeSquads(raw, roster = {}, gear = null, orders = null) {
  const out = emptySquads();
  if (!raw || typeof raw !== 'object') return out;
  for (const k of ALL_SQUAD_KEYS) {
    const team = Array.isArray(raw[k]?.team) ? raw[k].team : [];
    const seen = new Set();
    out[k].team = team
      .filter((s) => typeof s === 'string' && roster[s] && !seen.has(s) && seen.add(s))
      .slice(0, TEAM_SIZE);
    if (raw[k]?.savedAt) out[k].savedAt = Number(raw[k].savedAt) || 0;
    const lo = normalizeLoadout(raw[k]?.lo, out[k].team, gear, orders);
    if (lo) out[k].lo = lo;
  }
  return out;
}

/** 独立配装的清洗：只留队内成员的命轮 / 密契、仍然存在的装备、已拥有的钥令，同一套里不重复 */
export function normalizeLoadout(raw, team = [], gear = null, orders = null) {
  if (!raw || typeof raw !== 'object') return null;
  const items = gear?.items || {};
  const has = (uid, kind) => !gear || (typeof uid === 'string' && items[uid] && (kind ? items[uid].kind === kind || (kind === 'covenant' && items[uid].kind === 'cov') : true));
  const equip = {}, usedW = new Set(), usedC = new Set();
  for (const slug of team) {
    const e = raw.equip?.[slug] || {};
    const o = {};
    if (e.wheel && has(e.wheel, 'wheel') && !usedW.has(e.wheel)) { o.wheel = e.wheel; usedW.add(e.wheel); }
    if (e.cov && has(e.cov, 'covenant') && !usedC.has(e.cov)) { o.cov = e.cov; usedC.add(e.cov); }
    equip[slug] = o;
  }
  const seenR = new Set();
  const relics = Array.from({ length: RELIC_SLOTS }, (_, i) => {
    const uid = Array.isArray(raw.relics) ? raw.relics[i] : null;
    if (uid && has(uid, 'relic') && !seenR.has(uid)) { seenR.add(uid); return uid; }
    return null;
  });
  const seenO = new Set();
  const ord = Array.from({ length: ORDER_SLOTS }, (_, i) => {
    const id = Array.isArray(raw.orders) ? raw.orders[i] : null;
    const ok = id && typeof id === 'string' && !seenO.has(id) && (!orders?.owned || orders.owned[id] != null);
    if (ok) { seenO.add(id); return id; }
    return null;
  });
  return { equip, relics, orders: ord };
}

export const loadoutOf = (state, key) => (key && key !== 'cur' ? squadsOf(state)[key]?.lo || null : null);
export const hasLoadout = (state, key) => !!loadoutOf(state, key);

/** 给这套编队建一份独立配装：默认复制主线队伍当前的穿戴（队内成员已有的命轮 / 密契、造物栏、钥令位） */
export function ensureLoadout(state, key, fromMain = true) {
  const sq = squadsOf(state)[key];
  if (!sq) return null;
  if (sq.lo) return sq.lo;
  const lo = { equip: {}, relics: Array(RELIC_SLOTS).fill(null), orders: Array(ORDER_SLOTS).fill(null) };
  if (fromMain) {
    for (const slug of sq.team) { const e = state.gear?.equip?.[slug]; lo.equip[slug] = { ...(e?.wheel ? { wheel: e.wheel } : {}), ...(e?.cov ? { cov: e.cov } : {}) }; }
    lo.relics = Array.from({ length: RELIC_SLOTS }, (_, i) => state.gear?.relics?.[i] || null);
    lo.orders = Array.from({ length: ORDER_SLOTS }, (_, i) => state.orders?.slots?.[i] || null);
  }
  sq.lo = lo;
  return lo;
}
export function dropLoadout(state, key) { const sq = squadsOf(state)[key]; if (sq) delete sq.lo; }

/** 哪些装备正被某套编队的独立配装占着（分解 / 卸下时要避开） */
export function squadUsesItem(state, uid) {
  return squadsUsingItem(state, uid).length > 0;
}

/**
 * 这件装备被哪几套编队的独立配装编入了（按固定次序：通用一队~五队 → 禁区一队~五队）。
 * 用来在装备列表 / 编队库里提示「已编入」，避免配装时把它当成没人用的散件。
 */
export function squadsUsingItem(state, uid) {
  const out = [];
  if (!uid) return out;
  for (const k of ALL_SQUAD_KEYS) {
    const lo = squadsOf(state)[k]?.lo;
    if (!lo) continue;
    let hit = lo.relics?.includes(uid);
    if (!hit) for (const e of Object.values(lo.equip || {})) if (e?.wheel === uid || e?.cov === uid) { hit = true; break; }
    if (hit) out.push(k);
  }
  return out;
}

/**
 * 这件装备实际会在哪几套编队里出战（含「当前队伍」）：
 *  · 有独立配装的编队：看它自己的那套；
 *  · 没有独立配装的编队沿用主线队伍的穿戴——命轮 / 密契跟着人走（编队里有穿它的那个人才算），
 *    造物栏全队共用（编了人的编队都算）；
 *  · 'cur' 是主线队伍本身。
 * 列表里的「已编入」提示用它，免得只看独立配装而漏掉大多数人根本没建独立配装的情况。
 */
export function squadsEffectivelyUsing(state, uid) {
  const out = [];
  if (!uid) return out;
  const g = state.gear || {};
  const holders = Object.entries(g.equip || {}).filter(([, e]) => e && (e.wheel === uid || e.cov === uid)).map(([s]) => s);
  const inRelics = (g.relics || []).slice(0, RELIC_SLOTS).includes(uid);
  const team = state.team || [];
  if (inRelics ? team.length : holders.some((s) => team.includes(s))) out.push('cur');
  for (const k of ALL_SQUAD_KEYS) {
    const sq = squadsOf(state)[k];
    if (!sq || !sq.team?.length) continue;
    const lo = sq.lo;
    let hit;
    if (lo) {
      hit = (lo.relics || []).includes(uid) || Object.values(lo.equip || {}).some((e) => e?.wheel === uid || e?.cov === uid);
    } else {
      hit = inRelics || holders.some((s) => sq.team.includes(s));
    }
    if (hit) out.push(k);
  }
  return out;
}

/** 某套编队的独立配装里，有几件装备同时被别的编队用着（编队库卡片上提示共用） */
export function sharedItemsOf(state, key) {
  const lo = squadsOf(state)[key]?.lo;
  if (!lo) return 0;
  const uids = new Set();
  for (const u of lo.relics || []) if (u) uids.add(u);
  for (const e of Object.values(lo.equip || {})) { if (e?.wheel) uids.add(e.wheel); if (e?.cov) uids.add(e.cov); }
  let n = 0;
  for (const u of uids) if (squadsUsingItem(state, u).some((k) => k !== key)) n++;
  return n;
}
export function squadsRemoveItem(state, uid) {
  for (const k of ALL_SQUAD_KEYS) {
    const lo = squadsOf(state)[k]?.lo;
    if (!lo) continue;
    lo.relics = (lo.relics || []).map((x) => (x === uid ? null : x));
    for (const e of Object.values(lo.equip || {})) { if (e?.wheel === uid) delete e.wheel; if (e?.cov === uid) delete e.cov; }
  }
}

/**
 * 在「这套编队的配装」下跑 fn：临时把 state 里的命轮 / 密契 / 造物 / 钥令换成编队自己的，跑完还原。
 * 没有独立配装（或 key 为空 / 'cur'）就原样跑。fn 必须是同步的——战斗模拟本来就是同步的。
 */
export function withLoadout(state, key, fn) {
  return withLo(state, loadoutOf(state, key), fn);
}
/** 同上，但直接给配装对象（融灾禁区按「去重后的有效配装」算，不一定对应某个编队位） */
export function withLo(state, lo, fn) {
  if (!lo) return fn();
  const gear = state.gear, orders = state.orders;
  const saved = { equip: gear.equip, relics: gear.relics, slots: orders.slots };
  gear.equip = lo.equip; gear.relics = lo.relics; orders.slots = lo.orders;
  try { return fn(); } finally { gear.equip = saved.equip; gear.relics = saved.relics; orders.slots = saved.slots; }
}

/** 融灾禁区里「别的四队」已经占着的唤醒体 / 装备 / 钥令（编辑某一队时用来禁选，保证五队不重复） */
export function riftTaken(state, exceptKey) {
  const chars = new Map(), items = new Set(), orders = new Set();
  for (const k of RIFT_SQUAD_KEYS) {
    if (k === exceptKey) continue;
    for (const slug of squadMembers(state, k)) if (!chars.has(slug)) chars.set(slug, k);
    const lo = loadoutOf(state, k);
    if (!lo) continue;
    for (const e of Object.values(lo.equip || {})) { if (e?.wheel) items.add(e.wheel); if (e?.cov) items.add(e.cov); }
    for (const u of lo.relics || []) if (u) items.add(u);
    for (const o of lo.orders || []) if (o) orders.add(o);
  }
  return { chars, items, orders };
}

/** 某个挑战入口实际用的编队位（空编队 / 当前队伍 → null，表示用主线配装） */
export function squadKeyFor(state, mode) {
  const key = pickedSquad(state, mode);
  if (key === 'cur') return null;
  return squadMembers(state, key).length ? key : null;
}
export function normalizePick(raw) {
  const out = emptyPick();
  if (!raw || typeof raw !== 'object') return out;
  const ok = (v) => v === 'cur' || SQUAD_KEYS.includes(v) || RIFT_SQUAD_KEYS.includes(v) || TOWER_SQUAD_KEYS.includes(v);
  const fallback = ok(raw.rtower) ? raw.rtower : null;   // M13 只有一个「属性塔」入口，升级后分给四座塔
  for (const [k] of SQUAD_MODES) {
    const tk = towerSquadKey(k);
    if (tk) {
      // 属性塔只认「当前队伍」或自己那套专用编队。
      // 老存档里的 a~e 先原样留着，交给 migrate 把内容搬进 t_*（这里没 squads 可读，搬不了）。
      if (raw[k] === 'cur' || raw[k] === tk || SQUAD_KEYS.includes(raw[k])) out[k] = raw[k];
      else if (fallback === 'cur') out[k] = 'cur';
      else if (fallback && SQUAD_KEYS.includes(fallback)) out[k] = fallback;
    } else if (ok(raw[k])) out[k] = raw[k];
    else if (fallback && RT_MODES.includes(k)) out[k] = fallback;
  }
  return out;
}

// 老存档里只有 a~e，禁区那五套是后加的：缺哪个键就地补一个空位，
// 免得每个调用点都要自己判断 undefined。
export const squadsOf = (state) => {
  const sq = (state.squads ||= emptySquads());
  for (const k of ALL_SQUAD_KEYS) if (!sq[k]) sq[k] = { team: [] };
  return sq;
};
export const squadOf = (state, key) => squadsOf(state)[key];
export const pickedSquad = (state, mode) => (state.squadPick?.[mode] || 'cur');

/** 当前这套编队里还有效的成员（过滤掉已不存在的唤醒体） */
export function squadMembers(state, key) {
  return (squadsOf(state)[key]?.team || []).filter((s) => state.roster?.[s]).slice(0, TEAM_SIZE);
}

export function setSquadPick(state, mode, key) {
  if (!MODE_ZH[mode]) return false;
  const tk = towerSquadKey(mode);
  // 属性塔只能「用自己那套」或退回当前队伍：四座塔之间不许互相借，借一次就又耦合了
  if (tk) { if (key !== 'cur' && key !== tk) return false; }
  else if (key !== 'cur' && !SQUAD_KEYS.includes(key) && !RIFT_SQUAD_KEYS.includes(key)) return false;
  (state.squadPick ||= emptyPick())[mode] = key;
  return true;
}

/** 某个挑战入口该用哪 4 个人：'cur' = 当前队伍；编队空着也退回当前队伍 */
export function teamSlugsFor(state, mode) {
  const key = pickedSquad(state, mode);
  if (key === 'cur') return [...(state.team || [])];
  const list = squadMembers(state, key);
  return list.length ? list : [...(state.team || [])];
}

/** 把这套编队实际出战的阵容写出来（含「退回当前队伍」的情况），给界面显示 */
export function squadLabel(state, mode) {
  const key = pickedSquad(state, mode);
  if (key === 'cur') return { key: 'cur', zh: '当前队伍', fallback: false };
  const n = squadMembers(state, key).length;
  return { key, zh: SQUAD_ZH[key], fallback: !n };
}

/** 把当前队伍的 4 个人存进某个编队位 */
export function saveSquad(state, key) {
  if (!ALL_SQUAD_KEYS.includes(key)) return null;
  const slugs = [...(state.team || [])].filter((s) => state.roster?.[s]).slice(0, TEAM_SIZE);
  if (!slugs.length) return null;
  squadsOf(state)[key] = { team: slugs, savedAt: Date.now() };
  return slugs;
}

/** 直接写入一套阵容（编队编辑器里手动点选 / 一键上阵用） */
export function setSquadTeam(state, key, team) {
  if (!ALL_SQUAD_KEYS.includes(key)) return null;
  const seen = new Set();
  const slugs = (team || [])
    .filter((s) => typeof s === 'string' && state.roster?.[s] && !seen.has(s) && seen.add(s))
    .slice(0, TEAM_SIZE);
  if (!slugs.length) { squadsOf(state)[key] = { team: [] }; return []; }
  squadsOf(state)[key] = { team: slugs, savedAt: Date.now() };
  return slugs;
}

/** 把编队读回「当前队伍」，方便在队伍页继续调整 / 用于推图。
 *  带独立配装的编队，上阵时连配装一起搬到主线：卡片上的战力是按这套配装算的，
 *  只换人、装备留在原地的话，上阵后战力对不上，看着就像「点了没反应」。 */
export function loadSquad(state, key, applyLoadout = true) {
  const slugs = squadMembers(state, key);
  if (!slugs.length) return null;
  state.team = [...slugs];
  const lo = squadsOf(state)[key]?.lo;
  if (applyLoadout && lo) {
    // 只改这套编队里的人：之前是全量替换 gear.equip，上阵一次就把不在编队里的角色装备全卸了
    const mine = new Set(slugs);
    const next = { ...(state.gear.equip || {}) };
    const take = new Set();
    for (const slug of mine) {
      const e = lo.equip?.[slug] || {};
      next[slug] = { ...(e.wheel ? { wheel: e.wheel } : {}), ...(e.cov ? { cov: e.cov } : {}) };
      if (e.wheel) take.add(e.wheel);
      if (e.cov) take.add(e.cov);
    }
    // 一件装备同一时刻只能穿在一个人身上：这套编队要用的，从别人身上摘下来
    for (const [slug, e] of Object.entries(next)) {
      if (mine.has(slug) || !e) continue;
      const out = { ...e };
      if (out.wheel && take.has(out.wheel)) delete out.wheel;
      if (out.cov && take.has(out.cov)) delete out.cov;
      if (out.wheel || out.cov) next[slug] = out; else delete next[slug];
    }
    state.gear.equip = next;
    state.gear.relics = [...(lo.relics || [])];
    state.orders.slots = [...(lo.orders || [])];
  }
  return state.team;
}

/**
 * 这套编队是不是已经原样在主线上了：4 个人、站位（顺序）一致；带独立配装的，穿戴 / 造物 / 钥令也要一致。
 * 以前「上阵」按钮只比人数和成员（不看顺序，也不看装备），编队里的人和当前队伍是同一批人时按钮直接变灰成「已在主线」，
 * 于是编好的独立配装怎么点都搬不过去——表现就是「上阵了，角色对了，装备没换」。
 */
export function squadIsOnMain(state, key) {
  const slugs = squadMembers(state, key);
  const cur = (state.team || []).filter((x) => state.roster?.[x]);
  if (!slugs.length || slugs.length !== cur.length || slugs.some((x, i) => x !== cur[i])) return false;
  const lo = squadsOf(state)[key]?.lo;
  if (!lo) return true;
  for (const slug of slugs) {
    const e = lo.equip?.[slug] || {}, m = state.gear?.equip?.[slug] || {};
    if ((e.wheel || null) !== (m.wheel || null) || (e.cov || null) !== (m.cov || null)) return false;
  }
  const same = (a, b, n) => Array.from({ length: n }, (_, i) => (a?.[i] || null) === (b?.[i] || null)).every(Boolean);
  return same(lo.relics, state.gear?.relics, RELIC_SLOTS) && same(lo.orders, state.orders?.slots, ORDER_SLOTS);
}

export function clearSquad(state, key) {
  if (!ALL_SQUAD_KEYS.includes(key)) return false;
  squadsOf(state)[key] = { team: [] };
  // 指向它的挑战入口一起退回「当前队伍」，免得点了挑战却是空阵
  for (const [m] of SQUAD_MODES) if (state.squadPick?.[m] === key) state.squadPick[m] = 'cur';
  return true;
}

/**
 * 这位唤醒体现在编在哪些队伍里（队库卡片上的「已编入」角标用）：
 * 'cur' = 主线当前队伍，其余是编队位 key（一队~五队、禁区一队~五队）。
 * 顺序固定：先当前队伍，再按 ALL_SQUAD_KEYS 的次序，同一份存档每次渲染结果都一样。
 */
export function squadsOfSlug(state, slug) {
  const out = [];
  if ((state.team || []).includes(slug)) out.push('cur');
  for (const k of ALL_SQUAD_KEYS) if (squadsOf(state)[k]?.team?.includes(slug)) out.push(k);
  return out;
}
/** 编队位 key 的中文短名（'cur' 不在 SQUAD_ZH 里，单独给） */
export const squadKeyZh = (k) => (k === 'cur' ? '当前队伍' : SQUAD_ZH[k] || k);

/** 这个编队位被哪些挑战入口用着（给队伍页显示「使用中」） */
export function squadUsage(state, key) {
  const out = SQUAD_MODES.filter(([m]) => pickedSquad(state, m) === key).map(([, zh]) => zh);
  // 禁区那五套是「固定分工」不是「被某入口选中」：编了人才算在用，空位别硬说在用
  if (isRiftSquad(key) && squadMembers(state, key).length) out.push(`融灾禁区第 ${RIFT_SQUAD_KEYS.indexOf(key) + 1} 队`);
  return out;
}

/**
 * 一键上阵：按界域筛出候选，取战力最高的 4 名。
 * powerOf 由调用方提供（core 不反向依赖 game.js，避免循环引用）；
 * 先按「能凑同界域加成」挑，再按战力补满——和 autoTeam 的手感一致。
 */
export function autoSquadSlugs(state, data, realm, powerOf, n = TEAM_SIZE, exclude = []) {
  const skip = new Set(exclude);
  const pool = Object.keys(state.roster || {})
    .filter((s) => data.bySlug[s] && !skip.has(s) && (!realm || data.bySlug[s].realm === realm))
    .map((s) => ({ s, p: powerOf(s), t: data.bySlug[s].type }))
    .sort((a, b) => b.p - a.p);
  if (!pool.length) return [];
  const out = [];
  // 同界域加成要 3 人才起效：够人的话优先保住前排守护 + 治疗，别排出一队纯输出
  const fill = (type) => { const c = pool.find((x) => x.t === type && !out.includes(x.s)); if (c && out.length < n) out.push(c.s); };
  fill('WARDEN'); fill('CHORUS');
  for (const x of pool) if (out.length < n && !out.includes(x.s)) out.push(x.s);
  const ord = { WARDEN: 0, ASSAULT: 1, CHORUS: 2 };
  return out.sort((a, b) => ord[data.bySlug[a].type] - ord[data.bySlug[b].type]).slice(0, n);
}
