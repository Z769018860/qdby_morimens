// 点赞：自建题每被一个人点赞，作者得 1 银芯；每人每天最多 10 次。
//
// 站点是纯静态的，能共享的存储只有账号系统正在用的那个 Waline。
// 所以一条赞 = 一条评论，挂在 /zjtt/like/<题目 id> 这个路径下，
// 「赞数」就是那个路径的评论数（type=count 支持一次问一批，很便宜）。
//
// Waline 对「发评论」有频率限制（实测约 60 秒一条，按 IP 算），
// 所以点赞一律先记在本机、后台排队发送：页面上的数字立刻 +1，不等网络。
// 队列存在 localStorage 里，关掉页面下次打开接着发。
import { store, wallet, markDirty } from './common.js';
import { auth } from './auth.js';

const SERVER = 'https://textbox.qingdengbuyi.top';
const MAGIC = 'ZJ1L:';
export const LIKE_MAX = 10;      // 每人每天最多点几个
const GAP = 61e3;                // 服务端约 60 秒放一条
const HARD_TRIES = 3;            // 非限流错误重试几次后放弃

// 与签到、每日一题同一套「东八区今天」
const dayKey = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// ---------------------------------------------------------------- 基础
export const pathOf = (id) => `/zjtt/like/${String(id || '').replace(/[^A-Za-z0-9._-]/g, '_')}`;

const b64 = (s) => {
  const b = new TextEncoder().encode(s);
  let o = '';
  for (let i = 0; i < b.length; i += 4096) o += String.fromCharCode(...b.subarray(i, i + 4096));
  return btoa(o);
};

function devId() {
  let v = store.get('likeDev', '');
  if (!v) {
    v = Math.random().toString(36).slice(2, 10);
    store.set('likeDev', v);
  }
  return v;
}

// 登录了就用账号当身份（换设备也不会重复投），游客用本机随机 id
export const voter = () => {
  const u = auth.user;
  return u && u.id ? `u${u.id}` : `d${devId()}`;
};

// ---------------------------------------------------------------- 本机状态
const votes = () => store.get('likeVote', {}) || {};
export const hasVoted = (id) => Boolean(votes()[String(id)]);

function dayState() {
  const q = store.get('likeDay', null);
  const d = dayKey();
  if (!q || q.d !== d) return { d, n: 0 };
  return { d, n: Math.max(0, Number(q.n) || 0) };
}
export const usedToday = () => dayState().n;
export const leftToday = () => Math.max(0, LIKE_MAX - dayState().n);

export const cachedCounts = () => store.get('likeCnt', {}) || {};

// ---------------------------------------------------------------- 读赞数
// 一次问一批（每批 20 个），返回 { 题目 id: 赞数 }
export async function counts(ids) {
  const list = [...new Set((ids || []).map((x) => String(x || '')).filter(Boolean))];
  const out = {};
  for (let i = 0; i < list.length; i += 20) {
    const chunk = list.slice(i, i + 20);
    const qs = chunk.map((id) => `url=${encodeURIComponent(pathOf(id))}`).join('&');
    const r = await fetch(`${SERVER}/api/comment?type=count&${qs}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('like: ' + r.status);
    const j = await r.json();
    if (!j || !Array.isArray(j.data) || j.data.length !== chunk.length) throw new Error('like: bad payload');
    chunk.forEach((id, k) => { out[id] = Math.max(0, Number(j.data[k]) || 0); });
  }
  return out;
}

// ---------------------------------------------------------------- 发赞（排队）
const queue = () => store.get('likeQ', []) || [];
const setQueue = (q) => store.set('likeQ', q);
const nextAt = () => Number(store.get('likeNext', 0)) || 0;
export const pending = () => queue().length;

async function post(item) {
  const u = auth.user;
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const r = await fetch(`${SERVER}/api/comment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      comment: MAGIC + b64(JSON.stringify({ u: voter(), t: Date.now() })),
      url: pathOf(item.id),
      ua: 'zjtt/1',
      nick: (u && u.name) || 'like',
      mail: (u && u.mail) || 'like@zjtt.local',
    }),
  });
  const j = await r.json().catch(() => ({}));
  if (j && j.errno) throw new Error(String(j.errmsg || 'errno'));
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return j.data;
}

let running = false;
let tmr = 0;
function later(ms) {
  clearTimeout(tmr);
  tmr = setTimeout(() => { flush(); }, Math.max(300, ms));
}

// 把队列里的赞一条条发出去；被限流就等下一轮
export async function flush() {
  if (running || !queue().length) return;
  running = true;
  try {
    for (;;) {
      if (!queue().length) break;
      const wait = nextAt() - Date.now();
      if (wait > 0) { later(wait + 800); break; }
      const item = { ...queue()[0] };
      try {
        await post(item);
        store.set('likeNext', Date.now() + GAP);
        setQueue(queue().filter((x) => String(x.id) !== String(item.id)));
      } catch (e) {
        const msg = String((e && e.message) || '');
        if (/too fast|rate/i.test(msg)) {
          store.set('likeNext', Date.now() + GAP);
          later(GAP + 1500);
          break;
        }
        const n = (Number(item.n) || 0) + 1;
        if (n >= HARD_TRIES) {
          setQueue(queue().filter((x) => String(x.id) !== String(item.id)));
        } else {
          const q = queue();
          q[0] = { ...item, n };
          setQueue(q);
        }
        later(20e3);
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

  const v = votes();
  v[key] = Date.now();
  store.set('likeVote', v);
  store.set('likeDay', { d: dayKey(), n: dayState().n + 1 });

  const q = queue();
  if (!q.some((x) => String(x.id) === key)) q.push({ id: key, at: Date.now(), n: 0 });
  setQueue(q);
  markDirty('like');            // 账号档案里有「我赞过谁」与今日额度
  later(500);
  return { ok: 'ok', left: leftToday() };
}

// ---------------------------------------------------------------- 作者结算
// 作者这边：拿自己题目的赞数，和上次结算过的数比，多出来的按 1 赞 = 1 银芯入账。
// 结算基准（likeCredited）跟着账号档案走，换设备不会重复领。
export async function syncMine(list) {
  const ids = (list || []).map((p) => (p && p.id ? String(p.id) : '')).filter(Boolean);
  if (!ids.length) return { counts: {}, gain: 0, ok: false };

  let c;
  try { c = await counts(ids); } catch { return { counts: {}, gain: 0, ok: false }; }

  store.set('likeCnt', { ...cachedCounts(), ...c });

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

// 页面打开时补发上次没发完的赞
export function resume() {
  if (queue().length) later(1200);
}
