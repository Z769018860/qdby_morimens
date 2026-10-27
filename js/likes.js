// 点赞：自建题每被一个人点赞，作者得 1 银芯；每人每天最多 10 次。
//
// 规则由后端执行（server/worker.js）：(题目, 身份) 主键唯一，每日额度服务端计数，
// 所以清 localStorage 也刷不出额度，换设备也骗不到第二个赞。
//
// 前端仍然「先记账、后发送」：点下去数字立刻 +1，请求进队列慢慢发，
// 网络恢复或下次打开页面继续。服务端回来的权威计数会覆盖本地乐观值。
import { store, wallet, markDirty, toast, t } from './common.js';
import { auth } from './auth.js';
import { api } from './api.js';

export const LIKE_MAX = 10;      // 每人每天最多点几个
const GAP = 800;                 // 两次发送之间稍等一下，别把请求堆成一串
const HARD_TRIES = 4;            // 网络类错误重试几次后放弃

// 后端在、但存储还没开通（EdgeOne 的 KV 是白名单审核，未通过时接口返回 503/no_kv）。
// 这种情况重试多少次都不会好，所以整页生命周期内直接转「本机模式」：
// 赞只记在这台设备上，界面明说，不再空转重试。审核通过后刷新页面即自动恢复。
let cloudOff = false;
let warned = false;              // 「存储没开通」只提示一次，别每点一个赞弹一遍
export const cloudReady = () => !cloudOff;
const isNoStore = (e) => {
  const code = String((e && e.code) || '');
  const status = Number((e && e.status) || 0);
  return code === 'no_kv' || code === 'not_ready' || status === 503;
};

// 与签到、每日一题同一套「东八区今天」
const dayKey = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// 旧接口保留：路径形式不再用于存储，但分享码里可能还带着老 id
export const pathOf = (id) => `/zjtt/like/${String(id || '').replace(/[^A-Za-z0-9._-]/g, '_')}`;

// ---------------------------------------------------------------- 本机缓存
const votes = () => store.get('likeVote', {}) || {};
const votedSet = () => store.get('likeVoted', {}) || {};
const countsCache = () => store.get('likeCnt', {}) || {};

export const hasVoted = (id) => Boolean(votes()[String(id)] || votedSet()[String(id)]);
export const cachedCounts = () => countsCache();

function setCount(id, n) {
  const c = countsCache();
  c[String(id)] = Math.max(0, Number(n) || 0);
  store.set('likeCnt', c);
  return c;
}

function markVoted(id) {
  const v = votes();
  if (!v[String(id)]) { v[String(id)] = Date.now(); store.set('likeVote', v); }
  const s = votedSet();
  if (!s[String(id)]) { s[String(id)] = 1; store.set('likeVoted', s); }
}

// 今日额度：服务端给的数优先，没拿到就用本机记的
function dayState() {
  const d = dayKey();
  const srv = store.get('likeLeft', null);
  if (srv && srv.d === d && typeof srv.n === 'number') {
    return { d, n: Math.max(0, LIKE_MAX - Math.min(LIKE_MAX, srv.n)) };
  }
  const q = store.get('likeDay', null);
  if (!q || q.d !== d) return { d, n: 0 };
  return { d, n: Math.max(0, Number(q.n) || 0) };
}

function setLeft(n) {
  const left = Math.max(0, Math.min(LIKE_MAX, Number(n) || 0));
  store.set('likeLeft', { d: dayKey(), n: left });
  store.set('likeDay', { d: dayKey(), n: LIKE_MAX - left });
}

export const usedToday = () => dayState().n;
export const leftToday = () => Math.max(0, LIKE_MAX - dayState().n);

const notify = () => {
  try { document.dispatchEvent(new CustomEvent('zjtt:likes')); } catch { /* 非浏览器环境 */ }
};

// ---------------------------------------------------------------- 读赞数
// 一次问一批，返回 { 题目 id: 赞数 }；顺便把「我赞过谁」和今日额度同步下来
export async function counts(ids) {
  const list = [...new Set((ids || []).map((x) => String(x || '')).filter(Boolean))].slice(0, 60);
  if (!api.ready()) {
    const cache = countsCache();
    const out = {};
    for (const id of list) out[id] = Number(cache[id]) || 0;
    return out;
  }
  try {
    const d = await api.get(`/likes?ids=${encodeURIComponent(list.join(','))}`);
    const out = {};
    for (const id of list) out[id] = Math.max(0, Number(d.counts && d.counts[id]) || 0);
    if (d.counts) store.set('likeCnt', { ...countsCache(), ...d.counts });
    if (d.voted) {
      const s = votedSet();
      for (const id of Object.keys(d.voted)) if (d.voted[id]) s[String(id)] = 1;
      store.set('likeVoted', s);
    }
    if (typeof d.left === 'number') setLeft(d.left);
    return out;
  } catch (e) {
    if (isNoStore(e)) cloudOff = true;
    const cache = countsCache();
    const out = {};
    for (const id of list) out[id] = Number(cache[id]) || 0;
    return out;
  }
}

// ---------------------------------------------------------------- 发赞（排队）
const queue = () => store.get('likeQ', []) || [];
const setQueue = (q) => store.set('likeQ', q);
const nextAt = () => Number(store.get('likeNext', 0)) || 0;
export const pending = () => queue().length;

const drop = (id) => setQueue(queue().filter((x) => String(x.id) !== String(id)));

// 服务端拒了（额度用完 / 自己的题 / 不是合法题目）：把乐观加上的那一次撤掉
function revert(id, reason) {
  const key = String(id);
  const v = votes();
  if (v[key]) { delete v[key]; store.set('likeVote', v); }
  const s = votedSet();
  if (s[key]) { delete s[key]; store.set('likeVoted', s); }

  const c = countsCache();
  if (c[key] > 0) { c[key] -= 1; store.set('likeCnt', c); }

  const q = store.get('likeDay', null);
  if (q && q.d === dayKey() && q.n > 0) store.set('likeDay', { d: q.d, n: q.n - 1 });
  store.del('likeLeft');

  if (reason === 'quota') toast(t('likeZero', { n: LIKE_MAX }));
  else if (reason === 'self') toast(t('likeSelfFail'));
  notify();
}

let running = false;
let tmr = 0;
function later(ms) {
  clearTimeout(tmr);
  tmr = setTimeout(() => { flush(); }, Math.max(200, ms));
}

// 把队列里的赞一条条发出去
export async function flush() {
  if (running || !queue().length) return;
  if (!api.ready()) return;
  if (cloudOff) { setQueue([]); return; }   // 存储没开通：别再空转
  running = true;
  try {
    for (;;) {
      if (!queue().length) break;
      const wait = nextAt() - Date.now();
      if (wait > 0) { later(wait); break; }

      const item = { ...queue()[0] };
      try {
        const d = await api.post('/like', { puzzle: String(item.id) });
        if (d && typeof d.count === 'number') setCount(item.id, d.count);
        if (d && typeof d.left === 'number') setLeft(d.left);
        markVoted(item.id);
        drop(item.id);
        store.set('likeNext', Date.now() + GAP);
        notify();
      } catch (e) {
        const code = String((e && e.code) || '');
        const status = Number(e && e.status) || 0;

        // 后端回来了但存储还没开通：不算失败，赞留在本机，之后统一说一次
        if (isNoStore(e)) {
          cloudOff = true;
          drop(item.id);
          setQueue([]);
          if (!warned) { warned = true; toast(t('likeCloudOff')); }
          notify();
          break;
        }

        // 不可重试：额度没了、自己的题、题目不合法、没登录
        if (code === 'quota' || code === 'self' || code === 'rate' || code === 'bad_puzzle' || code === 'no_voter' || status === 401 || status === 403) {
          if (e && e.data && typeof e.data.count === 'number') setCount(item.id, e.data.count);
          if (e && e.data && typeof e.data.left === 'number') setLeft(e.data.left);
          revert(item.id, code);
          drop(item.id);
          continue;
        }

        // 网络类错误：记一次，等会儿再试
        const n = (Number(item.n) || 0) + 1;
        if (n >= HARD_TRIES) {
          revert(item.id, 'offline');
          drop(item.id);
        } else {
          const q = queue();
          q[0] = { ...item, n };
          setQueue(q);
          store.set('likeNext', Date.now() + n * 5000);
        }
        later(n * 5000);
        break;
      }
    }
  } finally {
    running = false;
  }
}

// 点赞：本机立刻记下、扣一次今日额度，网络交给队列
export function like(id) {
  const key = String(id || '');
  if (!key) return { ok: 'bad', left: leftToday() };
  if (hasVoted(key)) return { ok: 'voted', left: leftToday() };
  if (leftToday() <= 0) return { ok: 'quota', left: 0 };

  markVoted(key);
  setCount(key, (Number(countsCache()[key]) || 0) + 1);
  store.set('likeDay', { d: dayKey(), n: dayState().n + 1 });
  store.del('likeLeft');                    // 服务端数还没回来，先按本机记的走

  // 没配后端、或后端存储还没开通，就只记本机，别让「排队发送中」永远挂着
  if (api.ready() && !cloudOff) {
    const q = queue();
    if (!q.some((x) => String(x.id) === key)) q.push({ id: key, at: Date.now(), n: 0 });
    setQueue(q);
    later(400);
  }
  try { markDirty('like'); } catch { /* common 里没导出时忽略 */ }
  return { ok: 'ok', left: leftToday() };
}

// ---------------------------------------------------------------- 作者结算
// 登录后走服务端 claim：每题已折过银芯的赞数记在 claims 表，只升不降，换设备也不会重复领。
// 游客出的题没有归属记录，退回本机比较，银芯只加在本机。
export async function syncMine(list) {
  const ids = (list || []).map((p) => (p && p.id ? String(p.id) : '')).filter(Boolean);
  if (!ids.length) return { counts: {}, gain: 0, ok: false };

  if (api.ready() && auth.logged) {
    try {
      const d = await api.post('/claim', { puzzles: ids });
      const c = d.counts || {};
      store.set('likeCnt', { ...countsCache(), ...c });
      const gain = Math.max(0, Number(d.gain) || 0);
      if (gain > 0) wallet.add(gain);
      return { counts: c, gain, ok: true };
    } catch { /* 落到本机算法，下面继续 */ }
  }

  const c = await counts(ids);
  const cred = store.get('likeCredited', {}) || {};
  let gain = 0;
  for (const id of ids) {
    const n = Number(c[id]) || 0;
    const prev = Number(cred[id]) || 0;
    if (n > prev) gain += n - prev;
    // 结算基准只升不降：接口偶尔抽风返回 0 时不能把基准冲掉，否则下次会重复发钱
    cred[id] = Math.max(prev, n);
  }
  store.set('likeCredited', cred);
  if (gain > 0) wallet.add(gain);
  return { counts: c, gain, ok: true };
}

// 页面打开时：同步一次「我赞过谁 / 今天还剩几次」，再把上次没发完的赞补上
export function resume() {
  if (!api.ready()) return;
  counts([]).catch(() => {});
  if (queue().length) later(1200);
}
