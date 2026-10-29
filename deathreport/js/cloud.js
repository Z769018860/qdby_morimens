// 工坊的云端层：复用站内那台 Waline（和主站账号同一个实例）。
// 一条评论存一份卷宗 / 一条评分 / 一条撤回标记，靠前缀区分；读回来只用 orig（Waline 保留的原文），
// 因为 rendered 的 comment 会被 markdown 改写引号。
import { encode, decodeWork, decodeRate, decodeDel, TAG_RATE, TAG_DEL } from './workshop.js';

const SERVER = 'https://textbox.qingdengbuyi.top';
const PATH = '/dr-workshop';
const PAGE = 100, MAX_PAGE = 3;

const hash = (s) => { let h = 0x811c9dc5; for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
// Waline 的 mail 只用来生成头像，不校验真实性；给一个稳定的假地址，别把玩家真邮箱写进公共库
const mailOf = (nick) => `drw-${hash(nick || 'anon')}@deathreport.local`;

// Waline 那台实例有两条常见拒绝：评论太快、内容重复。直接把原文弹给玩家没意义，翻成人话。
const HUMAN = [
  [/comment too fast/i, '云端要求两条之间隔一会儿（大约一分钟），稍等再试。'],
  [/duplicate content/i, '和刚提交的那条内容一样，云端当成重复提交了。'],
  [/comment.*(disabled|closed)/i, '这个云端的评论功能关掉了。'],
  [/too many requests|rate limit/i, '太频繁了，过几分钟再试。'],
];
const humanErr = (m) => (HUMAN.find(([re]) => re.test(m)) || [null, m])[1];

async function req(url, opt = {}, ms = 20000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { ...opt, signal: ac.signal });
    const j = await r.json().catch(() => null);
    if (!j) return { ok: false, err: `服务器返回了 ${r.status}，但不是 JSON。` };
    if (j.errno !== 0) {
      // Waline 的 errmsg 有时是字段到错误说明的对象，直接塞进提示会变成 [object Object]
      const msg = typeof j.errmsg === 'string' && j.errmsg ? j.errmsg : (j.errmsg && Object.values(j.errmsg)[0]) || `服务器返回 errno ${j.errno}`;
      return { ok: false, err: humanErr(msg) };
    }
    return { ok: true, data: j.data };
  } catch (e) {
    return { ok: false, err: e?.name === 'AbortError' ? '连接超时，稍后再试。' : '连不上云端（网络或代理问题）。' };
  } finally { clearTimeout(t); }
}

const post = (comment, nick) => req(`${SERVER}/api/comment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ comment, nick: (nick || '无名守密人').slice(0, 20), mail: mailOf(nick), link: '', url: PATH, ua: navigator.userAgent }),
});

export async function publish(cs, nick) {
  const r = await post(encode(cs), nick);
  if (!r.ok) return r;
  return { ok: true, oid: r.data?.objectId, at: r.data?.time || Date.now(), status: r.data?.status || '' };
}

export async function sendRate(p) {
  const body = { t: p.t, s: p.s || 0, r: p.r || '', sc: p.sc || 0, rt: p.rt || 0, h: p.h || 0, b: (p.b || '').slice(0, 20), d: p.d || '', n: (p.n || '').slice(0, 140), at: Date.now() };
  const r = await post(TAG_RATE + JSON.stringify(body), p.b);
  return r.ok ? { ok: true, at: r.data?.time || Date.now() } : r;
}

export async function withdraw(id, nick) {
  const r = await post(TAG_DEL + JSON.stringify({ t: id, at: Date.now(), s: Math.random().toString(36).slice(2, 8) }), nick);
  return r.ok ? { ok: true } : r;
}

async function fetchAll() {
  const out = [];
  for (let p = 1; p <= MAX_PAGE; p++) {
    const r = await req(`${SERVER}/api/comment?path=${encodeURIComponent(PATH)}&page=${p}&pageSize=${PAGE}&type=time`);
    if (!r.ok) return { ok: false, err: r.err, rows: out };
    const d = r.data || {};
    out.push(...(d.data || []));
    if (p >= (d.totalPages || 1)) break;
  }
  return { ok: true, rows: out };
}

const RANK_ORDER = ['SSS', 'SS', 'S', 'A', 'B', 'C'];

// 云端工坊的全部内容：按时间正序重放事件，同 id 取最新版本，撤回落在它之前的上传之后才能生效
export async function list() {
  try { return await listInner(); } catch (e) { return { ok: false, err: `云端数据读不出来：${e?.message || e}` }; }
}

async function listInner() {
  const r = await fetchAll();
  if (!r.ok && !r.rows.length) return r;
  const works = new Map(), dels = new Set(), rates = new Map();
  const rows = r.rows.slice().sort((a, b) => (a.time || 0) - (b.time || 0));
  for (const c of rows) {
    if (c.status && c.status !== 'approved') continue;
    const o = c.orig || '';
    const w = decodeWork(o);
    if (w && w.t) { works.set(w.id, { cs: w, oid: c.objectId, upAt: c.time || 0 }); dels.delete(w.id); continue; }
    const d = decodeDel(o);
    if (d) { dels.add(d); continue; }
    const rt = decodeRate(o);
    if (rt && rt.t) rates.set(`${rt.t}|${rt.d || 'anon'}`, { ...rt, at: c.time || 0 });
  }
  for (const id of dels) works.delete(id);

  const stat = new Map();
  for (const rt of rates.values()) {
    if (!works.has(rt.t)) continue;
    const s = stat.get(rt.t) || { plays: new Set(), stars: [], rates: [], ranks: [], best: null, bestRank: '', last: 0 };
    s.plays.add(rt.d || 'anon');
    if (rt.s > 0) s.stars.push(rt.s);
    if (rt.rt > 0) s.rates.push(rt.rt);
    if (rt.r) s.ranks.push(rt.r);
    if (rt.sc > 0 && (!s.best || rt.sc > s.best)) s.best = rt.sc;
    if (rt.r && (!s.bestRank || RANK_ORDER.indexOf(rt.r) < RANK_ORDER.indexOf(s.bestRank))) s.bestRank = rt.r;
    s.last = Math.max(s.last, rt.at);
    stat.set(rt.t, s);
  }
  const avg = (a) => (a.length ? Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10 : 0);
  return {
    ok: true,
    warn: r.ok ? '' : r.err,
    works: [...works.values()].map((w) => {
      const s = stat.get(w.cs.id) || { plays: new Set(), stars: [], rates: [], ranks: [], best: null, bestRank: '', last: 0 };
      return { ...w, plays: s.plays.size, stars: avg(s.stars), starN: s.stars.length, rate: avg(s.rates), rank: s.bestRank, best: s.best, last: s.last };
    }).sort((a, b) => (b.last || b.upAt) - (a.last || a.upAt)),
  };
}
