// 编队：预先存好的几套阵容，队伍页统一编排，挑战按各自指定的那套出战。
// 只存「4 个唤醒体 slug」——命轮 / 密契绑在人身上会跟着走，造物与钥令是全队被动、本来就是共用的，
// 所以一套阵容不需要再额外存装备，换了人也就换了装备。
import { TEAM_SIZE } from './constants.js';

export const SQUAD_KEYS = ['a', 'b', 'c', 'd', 'e'];
// 融灾禁区专用编队：它一层要五队齐上，跟通用那五套分开存。
// 之前是直接借一队~五队用，结果「为禁区调的五套」和「推图 / 塔 / 周Boss 在用的那套」
// 是同一份数据，改一边另一边跟着变，两边都不好用。
export const RIFT_SQUAD_KEYS = ['r1', 'r2', 'r3', 'r4', 'r5'];
export const ALL_SQUAD_KEYS = [...SQUAD_KEYS, ...RIFT_SQUAD_KEYS];
export const SQUAD_ZH = {
  a: '一队', b: '二队', c: '三队', d: '四队', e: '五队',
  r1: '禁区一队', r2: '禁区二队', r3: '禁区三队', r4: '禁区四队', r5: '禁区五队',
};
export const isRiftSquad = (k) => RIFT_SQUAD_KEYS.includes(k);

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

export const emptySquads = () => Object.fromEntries(ALL_SQUAD_KEYS.map((k) => [k, { team: [] }]));
export const emptyPick = () => Object.fromEntries(SQUAD_MODES.map(([k]) => [k, 'cur']));

// 存档迁移：换版本后 roster 会变，编队里已经不存在的 slug 直接丢掉
export function normalizeSquads(raw, roster = {}) {
  const out = emptySquads();
  if (!raw || typeof raw !== 'object') return out;
  for (const k of ALL_SQUAD_KEYS) {
    const team = Array.isArray(raw[k]?.team) ? raw[k].team : [];
    const seen = new Set();
    out[k].team = team
      .filter((s) => typeof s === 'string' && roster[s] && !seen.has(s) && seen.add(s))
      .slice(0, TEAM_SIZE);
  }
  return out;
}
export function normalizePick(raw) {
  const out = emptyPick();
  if (!raw || typeof raw !== 'object') return out;
  const ok = (v) => v === 'cur' || SQUAD_KEYS.includes(v);
  const fallback = ok(raw.rtower) ? raw.rtower : null;   // M13 只有一个「属性塔」入口，升级后分给四座塔
  for (const [k] of SQUAD_MODES) {
    if (ok(raw[k])) out[k] = raw[k];
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
  if (key !== 'cur' && !SQUAD_KEYS.includes(key)) return false;
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

/** 把编队读回「当前队伍」，方便在队伍页继续调整 / 用于推图 */
export function loadSquad(state, key) {
  const slugs = squadMembers(state, key);
  if (!slugs.length) return null;
  state.team = [...slugs];
  return state.team;
}

export function clearSquad(state, key) {
  if (!ALL_SQUAD_KEYS.includes(key)) return false;
  squadsOf(state)[key] = { team: [] };
  // 指向它的挑战入口一起退回「当前队伍」，免得点了挑战却是空阵
  for (const [m] of SQUAD_MODES) if (state.squadPick?.[m] === key) state.squadPick[m] = 'cur';
  return true;
}

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
export function autoSquadSlugs(state, data, realm, powerOf, n = TEAM_SIZE) {
  const pool = Object.keys(state.roster || {})
    .filter((s) => data.bySlug[s] && (!realm || data.bySlug[s].realm === realm))
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
