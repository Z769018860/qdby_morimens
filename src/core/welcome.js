// 注册福利: players who have registered / logged in to the portal account get one-time 银芯 gifts.
// The portal (《战报侦探》首页) keeps its login in localStorage ('zjtt:authUser'), and the games are served from the same
// origin, so the idle game can read the account name without any network call. Gifts are claimed once per ACCOUNT
// (remembered in a separate localStorage list so resetting the save does not reset them), plus a 7-day newcomer bonus.
// Like everything client-side this is an honour system: clearing browser storage resets it.
import { addItem, rollItem } from './game.js';
import { hash, mulberry32 } from './rng.js';

export const WELCOME = { cores: 1000, tickets: 10, gold: 5000, item: true };
export const SEVEN = [{ cores: 100, tickets: 2 }, { cores: 100, tickets: 2 }, { cores: 150, tickets: 3 }, { cores: 150, tickets: 3 }, { cores: 200, tickets: 4 }, { cores: 200, tickets: 4, item: true }, { cores: 300, tickets: 6, item: true }];
export const PORTAL_URL = '../';
const LIST_KEY = 'morimens-idle-welcome';
const DAY = 86400000;

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };
const readJson = (st, k, d) => { try { const v = st?.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };

// -> { name } or null (not logged in / no account)
export function portalUser(st = store()) {
  const token = readJson(st, 'zjtt:authToken', '');
  const u = readJson(st, 'zjtt:authUser', null);
  if (!token || !u) return null;
  const raw = u.name || u.display_name || u.nick || u.username || u.email || '';
  const name = String(raw).replace(/@zjtt\.local$/i, '').trim();
  return name ? { name, key: name.normalize('NFKC').toLowerCase() } : null;
}
const claimedAccounts = (st) => readJson(st, LIST_KEY, []);
const markClaimed = (st, key) => { try { st?.setItem(LIST_KEY, JSON.stringify([...new Set([...claimedAccounts(st), key])])); } catch { /* ignore */ } };

export function welcomeStatus(state, user, st = store()) {
  const done = !!state.welcome?.claimed;
  const other = !!user && !done && claimedAccounts(st).includes(user.key);
  return { loggedIn: !!user, name: user?.name || '', claimed: done, claimedElsewhere: other, canClaim: !!user && !done && !other };
}
function grant(state, data, r, tag) {
  state.tickets += r.tickets || 0; state.gold += r.gold || 0; state.cores += r.cores || 0;
  const items = r.item ? [addItem(state, ...Object.values(rollItem(mulberry32(hash(`${tag}${state.seed}`)), Math.max(20, state.maxStage), data)))] : [];
  return { ...r, items };
}
export function claimWelcome(state, data, user, now = Date.now(), st = store()) {
  if (!welcomeStatus(state, user, st).canClaim) return null;
  state.welcome = { claimed: true, account: user.name, start: Math.floor(now / DAY), days: [] };
  markClaimed(st, user.key);
  return grant(state, data, WELCOME, 'wl');
}

// ---- 7-day newcomer bonus, starts the day the welcome gift was claimed (UTC days)
export function sevenState(state, now = Date.now()) {
  const w = state.welcome;
  if (!w?.claimed) return null;
  const idx = Math.min(7, Math.floor(now / DAY) - w.start + 1);
  return { idx, days: w.days || [], over: Math.floor(now / DAY) - w.start >= 7 + 7 };   // 7 extra days to catch up, then it expires
}
export function claimSeven(state, data, i, now = Date.now()) {
  const s = sevenState(state, now);
  if (!s || i < 0 || i > 6 || i + 1 > s.idx || s.days.includes(i) || s.over) return null;
  state.welcome.days = [...s.days, i];
  return grant(state, data, SEVEN[i], `w7${i}`);
}
