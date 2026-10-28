// 编队：预先存好的几套阵容，挑战页可以各自指定用哪一套。
// 只存「4 个唤醒体 slug」——命轮 / 密契绑在人身上会跟着走，造物与钥令是全队被动、本来就是共用的，
// 所以一套阵容不需要再额外存装备，换了人也就换了装备。
import { TEAM_SIZE } from './constants.js';

export const SQUAD_KEYS = ['a', 'b', 'c'];
export const SQUAD_ZH = { a: '一队', b: '二队', c: '三队' };

// 挑战入口：每个入口单独记「用哪套队」，默认跟随当前队伍
export const SQUAD_MODES = [
  ['tower', '无限塔'], ['rtower', '属性塔'], ['weekly', '周Boss'], ['trial', '融灾'], ['arena', '竞技场'],
];
export const MODE_ZH = Object.fromEntries(SQUAD_MODES);

export const emptySquads = () => ({ a: { team: [] }, b: { team: [] }, c: { team: [] } });
export const emptyPick = () => Object.fromEntries(SQUAD_MODES.map(([k]) => [k, 'cur']));

// 存档迁移：换版本后 roster 会变，编队里已经不存在的 slug 直接丢掉
export function normalizeSquads(raw, roster = {}) {
  const out = emptySquads();
  if (!raw || typeof raw !== 'object') return out;
  for (const k of SQUAD_KEYS) {
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
  for (const [k] of SQUAD_MODES) if (raw[k] === 'cur' || SQUAD_KEYS.includes(raw[k])) out[k] = raw[k];
  return out;
}

export const squadsOf = (state) => (state.squads ||= emptySquads());
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

/** 把当前队伍的 4 个人存进某个编队位 */
export function saveSquad(state, key) {
  if (!SQUAD_KEYS.includes(key)) return null;
  const slugs = [...(state.team || [])].filter((s) => state.roster?.[s]).slice(0, TEAM_SIZE);
  if (!slugs.length) return null;
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
  if (!SQUAD_KEYS.includes(key)) return false;
  squadsOf(state)[key] = { team: [] };
  // 指向它的挑战入口一起退回「当前队伍」，免得点了挑战却是空阵
  for (const [m] of SQUAD_MODES) if (state.squadPick?.[m] === key) state.squadPick[m] = 'cur';
  return true;
}

/** 这个编队位被哪些挑战入口用着（给队伍页显示「使用中」） */
export function squadUsage(state, key) {
  return SQUAD_MODES.filter(([m]) => pickedSquad(state, m) === key).map(([, zh]) => zh);
}
