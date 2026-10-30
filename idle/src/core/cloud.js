// 云端存档（挂机前夜整份进度上云，同账号换设备接着玩）。
//
// 为什么要有这个：个人中心的「云端档案」只同步积分 / 解锁 / 最高分和各游戏的进度摘要，
// 挂机前夜的真实存档一直只在本机，换设备登录也是从头开始。这里把整份存档存到后端
// （edge-functions 的 /save/idle），登录了本站账号就自动同步。
//
// 版本规则（乐观锁）：云端每次写入 ver+1；本机记下「上次同步时云端的 ver 和本机的 rev」。
//   · 云端 ver 没变、本机改过   → 推上去
//   · 云端 ver 变了、本机没改   → 直接拉下来
//   · 两边都改过 / 新设备上两边都有进度 → 冲突，让玩家选（不悄悄覆盖任何一边）
// 纯逻辑（plan / isFresh）和网络分开，plan 可以直接单测。

export const EDGE_API = 'https://morimens.qingdengbuyi.top/api';
const SYNC_KEY = 'morimens-idle-cloud';     // { acct, ver, rev, at }
const CFG_KEY = 'morimens-idle-cloud-cfg';  // { auto }
const GAME = 'idle';

const lsGet = (k) => { try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; } };
const lsSet = (k, v) => { try { globalThis.localStorage?.setItem(k, v); } catch { /* 无痕模式 */ } };
const readJson = (k, d) => { const v = lsGet(k); if (v == null) return d; try { return JSON.parse(v); } catch { return d; } };

// ---------- 登录状态：和首页 / 个人中心同源，直接读它们存的 token ----------
export function account() {
  const token = readJson('zjtt:authToken', '') || lsGet('zjtt:authToken') || '';
  const u = readJson('zjtt:authUser', null);
  if (!token || !u) return null;
  const raw = u.name || u.display_name || u.nick || u.username || u.email || '';
  const name = String(raw).replace(/@zjtt\.local$/i, '').trim();
  return name ? { name, token: String(token) } : null;
}

export const config = () => ({ auto: true, ...(readJson(CFG_KEY, {}) || {}) });
export const setConfig = (c) => lsSet(CFG_KEY, JSON.stringify({ ...config(), ...c }));
export const syncRecord = () => readJson(SYNC_KEY, null);
const setSyncRecord = (r) => lsSet(SYNC_KEY, JSON.stringify(r));
export const clearSyncRecord = () => { try { globalThis.localStorage?.removeItem(SYNC_KEY); } catch { /* ignore */ } };

// ---------- 纯逻辑 ----------
/** 「新档」：刚开始玩、没什么进度，可以放心被云端覆盖 */
export const isFresh = (s) => !s || ((s.maxStage || 0) === 0 && (Number(s.play) || 0) < 180 && Object.keys(s.roster || {}).length <= 4);

export const metaOf = (s) => ({
  maxStage: s.maxStage || 0, roster: Object.keys(s.roster || {}).length, play: Math.round(Number(s.play) || 0),
  gold: Math.round(Number(s.gold) || 0), lastSeen: s.lastSeen || 0,
});

/**
 * 决定这一次同步该做什么。
 * cloudMeta：云端摘要 { ver, at, rev, meta } 或 null（云端还没有）；sync：本机上次同步记录或 null
 */
export function plan({ state, cloudMeta, sync, acct }) {
  const dirty = !!sync && (state.rev || 0) > (sync.rev || 0);
  if (!cloudMeta) return isFresh(state) ? 'none' : 'push';
  const mine = !!sync && sync.acct === acct;
  if (mine && sync.ver === cloudMeta.ver) return dirty ? 'push' : 'none';
  if (mine && sync.ver < cloudMeta.ver) return dirty ? 'conflict' : 'pull';
  if (isFresh(state)) return 'pull';        // 新设备 / 换了账号，本机还是新档
  return 'conflict';
}

// ---------- 网络 ----------
let liveBase = '';
function candidates() {
  const out = [];
  const custom = String(readJson('zjtt:apiBase', '') || '').trim().replace(/\/+$/, '');
  if (custom) out.push(custom);
  const loc = globalThis.location;
  if (loc && /^https?:$/.test(loc.protocol) && !/\.github\.io$/i.test(loc.hostname)) out.push(loc.origin + '/api');
  if (!out.includes(EDGE_API)) out.push(EDGE_API);
  return out;
}
async function probe(f = fetch) {
  if (liveBase) return liveBase;
  for (const base of candidates()) {
    try {
      const r = await f(base + '/health', { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => null);
      if (j && j.service === 'zjtt') { liveBase = base; return base; }
    } catch { /* 下一个 */ }
  }
  return '';
}
async function call(method, path, body, { f = fetch, keepalive = false } = {}) {
  const acct = account();
  if (!acct) throw new Error('not_logged_in');
  const base = await probe(f);
  if (!base) throw new Error('offline');
  const r = await f(base + path, {
    method, keepalive,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + acct.token, Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok && j.ok !== false, json: j };
}

export async function fetchMeta(opt) {
  const r = await call('GET', `/save/${GAME}?meta=1`, null, opt);
  if (r.status === 401) throw new Error('need_login');
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  return r.json.save || null;
}
export async function fetchSave(opt) {
  const r = await call('GET', `/save/${GAME}`, null, opt);
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  return r.json.save || null;
}
/** 上传：ver = 本机记得的云端版本（第一次传是 0）；成功后更新本机同步记录 */
export async function pushSave(state, ver, opt = {}) {
  const acct = account();
  const r = await call('PUT', `/save/${GAME}`, { data: JSON.stringify(state), ver, rev: state.rev || 0, meta: metaOf(state) }, opt);
  if (r.status === 409) return { conflict: true, cloud: r.json };
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  setSyncRecord({ acct: acct.name, ver: r.json.ver, rev: state.rev || 0, at: Date.now() });
  return { ver: r.json.ver };
}
/** 记下「本机已经和云端 ver 对齐」（拉取成功后调用） */
export function markSynced(state, ver) {
  const acct = account();
  setSyncRecord({ acct: acct ? acct.name : '', ver, rev: state.rev || 0, at: Date.now() });
}
