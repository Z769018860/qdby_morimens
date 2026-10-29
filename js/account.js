// 账号云端档案
// 把「积分 / 解锁 CG / 失败题库 / 推理记录 / 工坊导入的战报 / 偏好唤醒体 / 背景主题 /
// 小游戏最高分」打包成一份文档存到自己的后端（server/worker.js 的 accounts 表），
// 换设备登录即可恢复。
//
// 说明：
//  · 每条档案带版本号：写入时比对版本，对不上说明别处先写过，合并后再推，多端不会互相覆盖。
//  · 老用户的数据还留在 Waline 的评论里，第一次连上新后端时会自动搬过来（只搬一次）。
//  · 后端不可用时退回 Waline 老路径读写，功能不至于整块消失。
import { store, wallet, failedBank, unlocked, STAT0, toast, t } from './common.js';
import { auth, wApi, nameOfMail } from './auth.js';
import { api } from './api.js';

const MAGIC = 'ZJ1D:';
const K = { doc: 'acctDoc', obj: 'acctObj', at: 'acctAt', pend: 'acctPend', ver: 'acctVer' };
export const CAP = { hist: 300, mine: 40 };
const MAX_AGE = 5 * 60e3;      // 5 分钟内不重复拉取
const PUSH_DELAY = 1500;       // 改动后延迟推送，避免连点产生大量请求

// ------------------------------------------------------------------ 编码
const fnv = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
const pathOf = (u) => `/zjtt/u/${u.id}-${fnv(String(u.mail || u.name || ''))}`;

function b64e(str) {
  const b = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode(...b.subarray(i, i + 4096));
  return btoa(s);
}
function b64d(s) {
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

function decodeDoc(item) {
  const raw = String(item.orig || stripTags(item.comment) || '');
  if (!raw.startsWith(MAGIC)) return null;
  try {
    const doc = JSON.parse(b64d(raw.slice(MAGIC.length)));
    return doc && typeof doc === 'object' ? doc : null;
  } catch { return null; }
}

// ------------------------------------------------------------------ 本机快照 / 回写
export function snapshot() {
  const prof = store.get('profile', { favs: [] });
  return {
    v: 1, at: Date.now(),
    cr: wallet.get(),
    cg: unlocked.list(),
    fb: failedBank.list(),
    st: { ...STAT0, ...(store.get('stats', null) || {}) },
    fv: prof.favs || [],
    mp: store.get('myPuzzles', []),
    hi: store.get('hist', []),
    th: store.get('theme', null),
    ck: store.get('checkin', null),
    gr: store.get('gr', []),
    // 点赞：赞过谁（lk）、今日额度（ld）、作者已结算的赞数（lc）
    lk: store.get('likeVote', {}),
    ld: store.get('likeDay', null),
    lc: store.get('likeCredited', {}),
    // 合成大杜勒的最高分：游戏页只认 'merge:best' 这一个键（它自己也能单机跑），
    // 这里把它一起带上档案，换设备登录就能拿回来。
    mb: mergeBest(),
    // 是鸟弟就下100层：bb = 最深到达的层数，bs = 最高分。
    // 同样是「游戏页自己也能跑」的键（zjtt:bird:bestLv / zjtt:bird:best），这里只负责带上档案。
    bb: birdBest().lv,
    bs: birdBest().sc,
  };
}

// 是鸟弟就下100层的纪录。键名与 js/bird.js 用的一致，store 读 JSON、
// 游戏写纯数字字符串，两种格式 JSON.parse 都吃得下。
const BIRD_LV = 'bird:bestLv';
const BIRD_SC = 'bird:best';
export const birdBest = () => ({
  lv: Math.max(0, Math.round(Number(store.get(BIRD_LV, 0)) || 0)),
  sc: Math.max(0, Math.round(Number(store.get(BIRD_SC, 0)) || 0)),
});
export const setBirdBest = (lv, sc) => {
  const cur = birdBest();
  const nlv = Math.max(cur.lv, Math.max(0, Math.round(Number(lv) || 0)));
  const nsc = Math.max(cur.sc, Math.max(0, Math.round(Number(sc) || 0)));
  if (nlv > cur.lv) store.set(BIRD_LV, nlv);
  if (nsc > cur.sc) store.set(BIRD_SC, nsc);
  return { lv: nlv, sc: nsc };
};

// 合成大杜勒的最高分。键名与 js/merge.js 用的是同一个（zjtt:merge:best），
// store 读的是 JSON、游戏写的是纯数字字符串，两种格式 JSON.parse 都吃得下，老存档不会丢。
const MERGE_BEST = 'merge:best';
export const mergeBest = () => Math.max(0, Math.round(Number(store.get(MERGE_BEST, 0)) || 0));
export const setMergeBest = (v) => {
  const n = Math.max(0, Math.round(Number(v) || 0));
  if (n > mergeBest()) store.set(MERGE_BEST, n);
  return mergeBest();
};

export function apply(d) {
  if (!d) return;
  store.set('credits', Math.max(0, Number(d.cr) || 0));
  store.set('cg', Array.isArray(d.cg) ? d.cg : []);
  store.set('failed', Array.isArray(d.fb) ? d.fb : []);
  // 云端可能是旧版 / 空对象，回写时补齐默认字段，否则界面会显示 undefined
  if (d.st && typeof d.st === 'object') store.set('stats', { ...STAT0, ...d.st });
  if (Array.isArray(d.fv)) {
    const prof = store.get('profile', { favs: [] });
    prof.favs = d.fv.map(String);
    delete prof.name;                       // 旧版本地昵称，已废弃
    store.set('profile', prof);
  }
  if (Array.isArray(d.mp)) store.set('myPuzzles', d.mp);
  if (Array.isArray(d.hi)) store.set('hist', d.hi);
  if (d.th) store.set('theme', d.th);
  if (d.ck && typeof d.ck === 'object') store.set('checkin', d.ck);
  if (Array.isArray(d.gr)) store.set('gr', uniq(d.gr));
  if (d.lk && typeof d.lk === 'object') store.set('likeVote', d.lk);
  if (d.ld && typeof d.ld === 'object') store.set('likeDay', d.ld);
  if (d.lc && typeof d.lc === 'object') store.set('likeCredited', d.lc);
  // 最高分只增不减：云端比本机低（本机多打了一局还没推上去）时保留本机的
  if (d.mb != null) setMergeBest(d.mb);
  if (d.bb != null || d.bs != null) setBirdBest(d.bb, d.bs);
  // 告诉页面「档案刚落下来」，合成大杜勒靠这个把云端分数显示出来
  try { document.dispatchEvent(new CustomEvent('zjtt:acct', { detail: d })); } catch { /* 无 DOM 环境 */ }
}

// ------------------------------------------------------------------ 合并
const uniq = (a) => [...new Set((a || []).map(String))];
const numMax = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

function mergeStats(a = {}, b = {}) {
  const out = { ...STAT0 };
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (k === 'last') out.last = String(a.last || '') > String(b.last || '') ? a.last : b.last;
    else out[k] = numMax(a[k], b[k]);
  }
  return out;
}

function mergeHist(a = [], b = []) {
  const map = new Map();
  for (const e of [...a, ...b]) {
    if (!e || !e.i) continue;
    const key = `${e.i}|${e.at || 0}`;
    if (!map.has(key) || (Number(e.at) || 0) > (Number(map.get(key).at) || 0)) map.set(key, e);
  }
  return [...map.values()].sort((x, y) => (Number(y.at) || 0) - (Number(x.at) || 0)).slice(0, CAP.hist);
}

// 签到状态：取「最近签到的那个日期更大」的一份，顺带把天数取大（防回退）
function pickCheckin(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ka = String(a.last || ''), kb = String(b.last || '');
  const win = ka === kb ? (Number(a.streak) || 0) >= (Number(b.streak) || 0) ? a : b : (ka > kb ? a : b);
  return { ...win, streak: Math.max(Number(a.streak) || 0, Number(b.streak) || 0), total: Math.max(Number(a.total) || 0, Number(b.total) || 0) };
}

function mergeMine(a = [], b = []) {
  const map = new Map();
  for (const p of [...a, ...b]) {
    if (!p) continue;
    const key = String(p.id || p.uuid || '');
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || (Number(p.at || 0) >= Number(prev.at || 0))) map.set(key, p);
  }
  return [...map.values()].slice(-CAP.mine);
}

// 点赞：赞过谁的记录、作者结算基准都取「更大的数」，今日额度取当天更大的那份
function mergeLikes(a = {}, b = {}) {
  const out = {};
  for (const [k, v] of [...Object.entries(a || {}), ...Object.entries(b || {})]) {
    if (v == null) continue;
    out[k] = Math.max(Number(out[k]) || 0, Number(v) || 0);
  }
  return out;
}

function pickQuota(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ka = String(a.d || ''), kb = String(b.d || '');
  if (ka !== kb) return ka > kb ? a : b;
  return { d: a.d, n: Math.max(Number(a.n) || 0, Number(b.n) || 0) };
}

export function mergeDoc(remote = {}, local = {}) {
  const st = mergeStats(remote.st, local.st);
  return {
    v: 1,
    at: Math.max(Number(remote.at) || 0, Number(local.at) || 0),
    cr: numMax(remote.cr, local.cr),
    cg: uniq([...(remote.cg || []), ...(local.cg || [])]),
    fb: uniq([...(remote.fb || []), ...(local.fb || [])]),
    st,
    fv: (local.fv && local.fv.length) ? uniq(local.fv) : uniq(remote.fv),
    mp: mergeMine(remote.mp, local.mp),
    hi: mergeHist(remote.hi, local.hi),
    th: local.th || remote.th || null,
    ck: pickCheckin(remote.ck, local.ck),
    gr: uniq([...(remote.gr || []), ...(local.gr || [])]),
    lk: mergeLikes(remote.lk, local.lk),
    ld: pickQuota(remote.ld, local.ld),
    lc: mergeLikes(remote.lc, local.lc),
    mb: numMax(remote.mb, local.mb),
    bb: numMax(remote.bb, local.bb),
    bs: numMax(remote.bs, local.bs),
  };
}

// ------------------------------------------------------------------ 读写远端
let busy = false;
let timer = null;
let pending = false;

export async function pull() {
  if (!auth.logged) return null;
  if (!api.ready()) return pullLegacy();

  try {
    const d = await api.get('/account');
    store.set(K.ver, Number(d.ver) || 0);
    if (d.doc) return d.doc;

    // 新库里还没有这份档案：把 Waline 里的老档案接过来，下次 push 就落进新库
    const legacy = await pullLegacy().catch(() => null);
    if (legacy) {
      store.set(K.ver, 0);
      try { toast(t('acctMigrated')); } catch { /* 页面还没挂 body */ }
    }
    return legacy;
  } catch (e) {
    if (e && e.status === 401) return null;
    // 后端暂时不可用：退回老路径读，至少还能拿到上次的数据
    return pullLegacy().catch(() => null);
  }
}

// 老路径：档案藏在用户自己的一条 Waline 评论里
async function pullLegacy() {
  const u = auth.user;
  const res = await wApi(`/api/comment?path=${encodeURIComponent(pathOf(u))}&pageSize=20&sortBy=insertedAt_desc`);
  const list = (res && res.data) || [];
  const mine = list.filter((c) => String(c.user_id) === String(u.id));
  const hit = mine.map((c) => ({ c, d: decodeDoc(c) })).find((x) => x.d);
  if (!hit) return null;
  store.set(K.obj, hit.c.objectId);
  return hit.d;
}

// 新后端：版本号对不上就合并重推，最多两轮
async function pushRemote(input) {
  let doc = input;
  let ver = Number(store.get(K.ver, 0)) || 0;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await api.put('/account', { doc, ver });
      return { ver: Number(r.ver) || ver + 1 };
    } catch (e) {
      if (!(e && e.status === 409 && e.data && e.data.doc)) throw e;
      const merged = mergeDoc(e.data.doc, doc);
      apply(merged);
      doc = merged;
      ver = Number(e.data.ver) || 0;
    }
  }
  throw new Error('conflict');
}

async function pushLegacy(doc) {
  const u = auth.user;
  const body = MAGIC + b64e(JSON.stringify(doc));
  const obj = store.get(K.obj, '');
  if (obj) {
    await wApi(`/api/comment/${obj}`, { method: 'PUT', body: { comment: body } });
  } else {
    const made = await wApi('/api/comment', { method: 'POST', body: { comment: body, url: pathOf(u), ua: 'zjtt/1' } });
    if (made && made.objectId) store.set(K.obj, made.objectId);
  }
}

export async function push() {
  if (!auth.logged) return { ok: false, why: 'guest' };
  if (busy) { schedule(2500); return { ok: false, why: 'busy' }; }
  busy = true;
  const doc = snapshot();
  try {
    if (api.ready()) {
      const r = await pushRemote(doc);
      store.set(K.ver, r.ver);
    } else {
      await pushLegacy(doc);
    }
    store.set(K.at, Date.now());
    store.set(K.pend, false);
    store.set(K.doc, doc);
    return { ok: true, at: doc.at };
  } catch (e) {
    pending = true;
    store.set(K.pend, true);
    // 「Comment too fast!」是 Waline 的发帖频率限制：等一会儿再补
    if (/too fast|rate/i.test(String(e.message || ''))) {
      clearTimeout(timer);
      timer = setTimeout(() => { push(); }, 25e3);
      return { ok: false, why: 'slow' };
    }
    return { ok: false, why: String(e.message || 'error') };
  } finally {
    busy = false;
  }
}

export function schedule(delay = PUSH_DELAY) {
  if (!auth.logged) return;
  store.set(K.pend, true);
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => { push(); }, delay);
}

// ------------------------------------------------------------------ 赠礼（data/grants.json）
// 直接改别人的云端评论需要管理员权限，所以「给某个账号发银芯」做成站内赠礼：
// 配置在 data/grants.json 里，登录同步时按用户名匹配、幂等领取，领过的 id 写进档案 gr。
let GRANTS = null;
async function grants() {
  if (GRANTS) return GRANTS;
  try {
    const r = await fetch('data/grants.json', { cache: 'no-cache' });
    const d = await r.json();
    GRANTS = Array.isArray(d.grants) ? d.grants : [];
  } catch { GRANTS = []; }
  return GRANTS;
}

// 云端赠礼：管理员在后台发的（edge-functions 的 /grants/mine）。
// 服务端已经按 uid 过滤过，这里只负责和本地「已领过」的记录对账，
// 所以拿不到后端时就是空数组，不影响静态 grants.json 那条路。
async function cloudGrants() {
  if (!api.ready()) return [];
  try {
    const r = await api.get('/grants/mine');
    return Array.isArray(r.items) ? r.items : [];
  } catch { return []; }
}

async function claimGrants() {
  if (!auth.logged) return 0;
  const list = await grants();
  // 按「登录名」匹配，不按昵称：昵称谁都能改，也可能和别人重名，
  // 用它当钥匙会漏领（改名后领不到）或者误领（同名的人各领一份）。
  const u = auth.user || {};
  const me = String(nameOfMail(u.mail || '') || u.name || '').trim().toLowerCase();
  const mine = me
    ? list.filter((g) => g && g.id && String(g.user || '').trim().toLowerCase() === me)
    : [];
  const cloud = await cloudGrants();
  if (!mine.length && !cloud.length) return 0;

  const claimed = new Set(uniq(store.get('gr', [])));
  let gain = 0;
  for (const g of mine) {
    if (claimed.has(String(g.id))) continue;
    claimed.add(String(g.id));
    gain += Math.max(0, Math.round(Number(g.amount) || 0));
  }
  for (const g of cloud) {
    // 加前缀：静态赠礼的 id 是手写的，可能和云端生成的撞上
    const key = 'c:' + String(g.id);
    if (claimed.has(key)) continue;
    claimed.add(key);
    gain += Math.max(0, Math.round(Number(g.amount) || 0));
    if (g.note) { try { toast(`收到一份赠礼：${g.note}`); } catch { /* 无 body */ } }
  }
  if (!gain) { store.set('gr', [...claimed]); return 0; }
  store.set('gr', [...claimed]);
  wallet.add(gain);                       // 会触发 dirty，但 sync 里紧接着会 push
  try { toast(t('pfGrant', { n: gain })); } catch { /* 页面还没挂 body 时忽略 */ }
  return gain;
}

export async function sync() {
  if (!auth.logged) return { ok: false, why: 'guest' };
  const remote = await pull().catch(() => null);
  const local = snapshot();
  const merged = remote ? mergeDoc(remote, local) : local;
  apply(merged);
  const gifted = await claimGrants().catch(() => 0);
  const r = await push();
  syncAt = Date.now();
  return { ok: !!r.ok, merged: !!remote, why: r.why, gift: gifted };
}

let syncAt = 0;
let inflight = null;

// 页面启动时调用：本机数据过期才拉云端，最多等 4.5 秒，失败就当游客继续用本机
export function ready({ maxAge = MAX_AGE, timeout = 4500 } = {}) {
  if (!auth.logged) return Promise.resolve(false);
  if (Date.now() - (syncAt || store.get(K.at, 0)) < maxAge && !store.get(K.pend, false)) {
    // 数据还新鲜不重拉，但赠礼是「登录后迟早要发到」的东西，顺手补一次
    claimGrants().then((g) => { if (g) push().catch(() => {}); }).catch(() => {});
    return Promise.resolve(true);
  }
  if (inflight) return inflight;
  inflight = Promise.race([
    sync().then((r) => !!r.ok).catch(() => false),
    new Promise((r) => setTimeout(() => r(false), timeout)),
  ]).finally(() => { inflight = null; });
  return inflight;
}

// ------------------------------------------------------------------ 记录
// 每局结束（不论模式）都写一条，个人中心与「我的推理记录」都用它
export function record(entry) {
  const list = store.get('hist', []);
  list.unshift({ at: Date.now(), ...entry });
  store.set('hist', list.slice(0, CAP.hist));
  schedule();
  return list.length;
}

export const history = () => store.get('hist', []);
export const lastSync = () => store.get(K.at, 0);
export const pendingState = () => !!store.get(K.pend, false);

// 任何页面改了积分/解锁/失败题库都会冒泡到这里
document.addEventListener('zjtt:dirty', () => schedule());
// 刚登录：立刻把本机存档并进账号档案
document.addEventListener('zjtt:login', () => { sync().catch(() => {}); });

// 退出登录：云端文档保留，本机只清「同步凭据」，避免串号
export function forget() {
  for (const k of [K.doc, K.obj, K.at, K.pend, K.ver]) store.del(k);
  syncAt = 0;
  clearTimeout(timer);
  pending = false;
}

export const account = {
  pull, push, sync, schedule, ready, record, history, lastSync, pendingState, forget,
  snapshot, apply, mergeDoc, pathOf, mergeBest, setMergeBest, birdBest, setBirdBest,
};
