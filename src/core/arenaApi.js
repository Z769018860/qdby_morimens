// Arena backend adapter: a remote server (server/arena-server.js) when configured, otherwise the local bot ladder.
import { arenaState, localOpponents, localSettle, snapshot, botEntry, HUMAN_ZONE, UNRANKED } from './arena.js';
import { teamDefs } from './game.js';

const KEY = 'morimens-idle-arena-api';
export const arenaServer = {
  get() { try { return (localStorage.getItem(KEY) || '').trim().replace(/\/+$/, ''); } catch { return ''; } },
  set(v) { try { localStorage.setItem(KEY, String(v || '').trim()); } catch { /* ignore */ } },
};
export function ensureIdentity(state) {
  const a = arenaState(state);
  if (!a.pid) a.pid = (crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  if (!a.name) a.name = `旅人${a.pid.slice(0, 4)}`;
  return a;
}
async function call(base, path, payload) {
  const r = await fetch(base + path, payload ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) } : undefined);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}
const me = (state, data) => { const a = ensureIdentity(state); return { pid: a.pid, name: a.name, snap: snapshot(teamDefs(state, data)) }; };

// -> { rank, opponents:[{rank,type,name,power,snap}], remote, humans }
export async function loadOpponents(state, data) {
  const base = arenaServer.get(), a = arenaState(state);
  if (!base) return { rank: a.rank, opponents: localOpponents(state, data), remote: false };
  try {
    const j = await call(base, '/arena/opponents', me(state, data));
    a.rank = j.rank;
    return { rank: j.rank, remote: true, opponents: j.opponents.map((o) => (o.type === 'bot' ? botEntry(o.rank, data) : o)) };
  } catch (e) {
    return { rank: a.rank, opponents: localOpponents(state, data), remote: false, error: e.message };
  }
}
// decide the new rank after a fight; remote when possible
export async function reportResult(state, data, entry, win, remote) {
  const base = arenaServer.get();
  if (remote && base) {
    try { return { ...(await call(base, '/arena/report', { ...me(state, data), target: entry.rank, win })), remote: true }; } catch (e) { return { ...localSettle(state, entry, win), error: e.message }; }
  }
  return localSettle(state, entry, win);
}
export async function loadTop() {
  const base = arenaServer.get();
  if (!base) return null;
  try { return await call(base, '/arena/top'); } catch { return null; }
}
export { HUMAN_ZONE, UNRANKED };
