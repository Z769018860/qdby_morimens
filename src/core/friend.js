// Friend battle codes: a code is a self-contained snapshot of your team (and nickname). Send it to a friend, they paste it
// into 竞技场 → 好友对战 and fight your team asynchronously. No server involved.
// Format:  MMX1-<base64url(JSON)>-<4-char check>. The check only catches typos / truncated pastes; it is NOT anti-cheat
// (a friendly match has no rewards, and the numbers are clamped when the snapshot is loaded).
import { hash } from './rng.js';
import { snapshot, hydrate } from './arena.js';
import { teamDefs } from './game.js';

const PREFIX = 'MMX1';
const KEYS = ['hp', 'atk', 'def', 'critRate', 'critDmg', 'amp', 'aliGain', 'keyGain', 'healBonus', 'shieldBonus', 'steal', 'surviveChance', 'openAli', 'openKey', 'firstBoost'];
const b64 = {
  enc: (s) => { const bytes = new TextEncoder().encode(s); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  dec: (t) => { const bin = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); },
};
const check = (body) => (hash(`mmx${body}`) % 1679616).toString(36).padStart(4, '0');

export function encodeCode(state, data, name) {
  const snap = snapshot(teamDefs(state, data)).map((s) => [s.slug, s.lv, s.star, ...KEYS.map((k) => Math.round((s[k] || 0) * 100) / 100)]);
  const body = b64.enc(JSON.stringify({ n: String(name || '').slice(0, 12), t: snap }));
  return `${PREFIX}-${body}-${check(body)}`;
}

// -> { name, snap, power } or { error }
export function decodeCode(code, data) {
  const m = String(code || '').trim().replace(/\s+/g, '').match(/^MMX1-([A-Za-z0-9_-]+)-([0-9a-z]{4})$/);
  if (!m) return { error: '对战码格式不对（应以 MMX1- 开头）' };
  if (check(m[1]) !== m[2]) return { error: '对战码校验失败，可能少复制了一段' };
  let j;
  try { j = JSON.parse(b64.dec(m[1])); } catch { return { error: '对战码无法解析' }; }
  if (!Array.isArray(j.t) || !j.t.length) return { error: '对战码里没有队伍' };
  const snap = j.t.slice(0, 4).map((r) => ({ slug: String(r[0]), lv: r[1], star: r[2], ...Object.fromEntries(KEYS.map((k, i) => [k, r[3 + i]])) }));
  if (!hydrate(snap, data).length) return { error: '对战码中的唤醒体在当前版本里不存在' };
  const power = Math.round(snap.reduce((s, x) => s + x.hp / 10 + x.atk + x.def * 0.8, 0));
  return { name: String(j.n || '好友').replace(/[<>&"'\u0000-\u001f]/g, '').slice(0, 12) || '好友', snap, power };
}
