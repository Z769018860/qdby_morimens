// 《寻找伪人：Morimens》的状态机。
//
// 一条铁律：伪人的破绽必须**一定可查**——它只抄错一条，而这一条在登记卡上
// （界域 / 职介 / 登记号）或只能在问话里问到。不存在「完全没法判断」的伪人，
// 也不存在「看起来像其实不是」的冤案：真人一条都不错。
//
// 所有随机都走 makeRng(seed)，同一个种子重开一局完全一样（方便复现 bug）。

import { CHARS, META } from './gen.js';

export const FIELD_LABEL = {
  realm: '界域', role: '职介', no: '登记号', platform: '平台',
  birthday: '生日', height: '身高', alias: '别名', zodiac: '星座',
  sign: '签名', live: '直播间标题', area: '分区',
};

// 问话时念出来的句子（门房的口吻，不是表单口吻）
export const FIELD_ASK = {
  birthday: '你生日是哪天？',
  height: '你多高？',
  alias: '还有别的叫法吗？',
  zodiac: '你什么星座？',
  sign: '你主页上那句签名，写的什么？',
  live: '今晚直播间挂的什么标题？',
  area: '你挂在哪个分区？',
};

export const NIGHT_NAME = ['第一夜', '第二夜', '第三夜', '第四夜', '第五夜', '第六夜', '第七夜'];

// acts＝这一夜每个来访者能问/看几次；lie＝破绽落在登记卡还是问话里
// obs＝观察时伪人露破绽的概率（真人永远是 0）
export const NIGHTS = [
  { f: 1, acts: 3, lie: 'card', obs: 0.62 },
  { f: 1, acts: 3, lie: 'card', obs: 0.58 },
  { f: 1, acts: 3, lie: 'ask', obs: 0.50 },
  { f: 2, acts: 3, lie: 'ask', obs: 0.46 },
  { f: 2, acts: 3, lie: 'ask', obs: 0.38 },
  { f: 2, acts: 3, lie: 'ask', obs: 0.28 },
  { f: 2, acts: 3, lie: 'ask', obs: 0 },   // 首领：它没有影子，也没有呼吸
];
export const VISITS_PER_NIGHT = 3;

/* ------------------------------------------------------------------ 随机 */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];
const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};

const byName = new Map(CHARS.map((c) => [c.n, c]));
export const charOf = (cid) => byName.get(cid) || null;
export const ALL_CHARS = CHARS;

/* --------------------------------------------------------------- 造一局 */
// 21 个来访者：10 个真人 + 11 个伪人，同一个人不会既是真人又是伪人。
// 伪人「用的是谁的名字」是随机的——所以同一个名字可能在别的夜里也来过，那才是真的。
export function newRun(seed) {
  const rng = makeRng(seed);
  const roster = shuffle(rng, CHARS);
  const realCount = VISITS_PER_NIGHT * NIGHTS.length - NIGHTS.reduce((s, n) => s + n.f, 0);
  const real = roster.slice(0, realCount);
  const fakes = roster.slice(realCount, realCount + NIGHTS.reduce((s, n) => s + n.f, 0));

  const list = [];
  let ri = 0;
  let fi = 0;
  for (let n = 0; n < NIGHTS.length; n++) {
    const pos = shuffle(rng, [0, 1, 2]).slice(0, NIGHTS[n].f);
    for (let i = 0; i < VISITS_PER_NIGHT; i++) {
      const fake = pos.includes(i);
      const c = fake ? fakes[fi++] : real[ri++];
      list.push(makeVisitor(rng, c, fake, n));
    }
  }
  const state = {
    v: 2,
    seed: seed >>> 0,
    night: 0,
    vi: 0,
    list,
    sanity: 100,
    bullets: 6,
    caught: 0,
    leaked: 0,
    refusedReal: 0,
    killedReal: 0,
    killedFake: 0,
    asked: 0,
    observed: 0,
    met: [],
    log: [],
    over: false,
    ending: null,
    started: Date.now(),
  };
  touch(state);
  return state;
}

function makeVisitor(rng, c, fake, night) {
  const claims = { ...c.facts };
  let lie = null;
  let lieV = null;
  if (fake) {
    const cfg = NIGHTS[night];
    const pool = cfg.lie === 'card' ? c.card.slice() : c.ask.slice();
    // 逐个试，直到挑到一个「换掉之后确实不一样」的字段
    const order = shuffle(rng, pool);
    for (const f of order) {
      const candidates = CHARS
        .filter((x) => x.k === c.k && x.facts[f] && x.facts[f] !== c.facts[f])
        .map((x) => x.facts[f]);
      if (!candidates.length) continue;
      lie = f;
      lieV = pick(rng, Array.from(new Set(candidates)));
      claims[f] = lieV;
      break;
    }
    // 兜底：真出现「所有字段都换不动」的怪事，就退回界域
    if (!lie) {
      lie = 'realm';
      lieV = c.realm === '混沌' ? '血肉' : '混沌';
      claims.realm = lieV;
    }
  }
  return {
    cid: c.n,
    c,
    fake,
    lie,
    lieV,
    claims,
    acts: NIGHTS[night].acts,
    askedFields: [],
    obsUsed: false,
    obsResult: null,
    tell: fake ? Math.floor(rng() * 12) : -1,
    obsRoll: rng(),
    done: false,
    result: null,
  };
}

export const currentVisitor = (s) => (s.over ? null : s.list[s.vi] || null);
export const nightCfg = (s) => NIGHTS[Math.min(s.night, NIGHTS.length - 1)];

export function startVisit(s) {
  const v = currentVisitor(s);
  if (!v) return null;
  v.acts = nightCfg(s).acts;
  return v;
}

/* ------------------------------------------------------------------ 动作 */
export function canAsk(s, v, field) {
  return !!(v && !v.done && !s.over && v.acts > 0 && v.c.ask.includes(field) && !v.askedFields.includes(field));
}
// 观察不占问话次数：贴着玻璃看是免费的，但一个人只能看一次。
export function canObserve(s, v) {
  return !!(v && !v.done && !s.over && !v.obsUsed);
}

export function ask(s, field) {
  const v = currentVisitor(s);
  if (!canAsk(s, v, field)) return null;
  v.acts -= 1;
  v.askedFields.push(field);
  s.asked += 1;
  touch(s);
  return { field, claim: v.claims[field], truth: v.c.facts[field], ok: v.claims[field] === v.c.facts[field] };
}

export function observe(s) {
  const v = currentVisitor(s);
  if (!canObserve(s, v)) return null;
  const cfg = nightCfg(s);
  v.obsUsed = true;
  s.observed += 1;
  // 真人永远看不出异常；伪人按这一夜的概率露一次破绽
  const seen = v.fake && v.obsRoll < cfg.obs;
  v.obsResult = seen ? 'anomaly' : 'none';
  touch(s);
  return { seen, tell: seen ? v.tell : -1 };
}

const delta = (s, k, n) => { s[k] = Math.max(0, Math.min(100, s[k] + n)); };

// 决定：admit（开门）/ refuse（不开）/ shoot（开枪）
export function decide(s, kind) {
  const v = currentVisitor(s);
  if (!v || v.done || s.over) return null;
  if (kind === 'shoot' && s.bullets <= 0) return null;
  if (kind === 'shoot') s.bullets -= 1;

  let key;
  let d = 0;
  let tag = '';
  if (kind === 'admit') {
    if (v.fake) { key = 'admit-fake'; d = -26; s.leaked++; tag = '漏进'; }
    else { key = 'admit-real'; d = +5; tag = '放行'; }
  } else if (kind === 'refuse') {
    if (v.fake) { key = 'refuse-fake'; d = +4; s.caught++; tag = '拦下'; }
    else { key = 'refuse-real'; d = -11; s.refusedReal++; tag = '误拒'; }
  } else {
    if (v.fake) { key = 'kill-fake'; d = +7; s.killedFake++; s.caught++; tag = '击杀'; }
    else { key = 'kill-real'; d = -30; s.killedReal++; tag = '误杀'; }
  }
  delta(s, 'sanity', d);
  v.done = true;
  v.result = { kind, key, d, tag, fake: v.fake };
  s.log.push({
    night: s.night, name: v.c.n, fake: v.fake, lie: v.lie, lieV: v.lieV, kind, tag,
  });
  if (!s.met.includes(v.c.n)) s.met.push(v.c.n);
  checkOver(s);
  touch(s);
  return v.result;
}

function checkOver(s) {
  if (s.over) return;
  if (s.sanity <= 0) { s.over = true; s.ending = 'san'; }
  else if (s.leaked >= 3) { s.over = true; s.ending = 'leak'; }
  else if (s.killedReal >= 2) { s.over = true; s.ending = 'kill'; }
}

export function nextVisitor(s) {
  const v = currentVisitor(s);
  if (v && !v.done) return null;
  s.vi += 1;
  if (s.vi >= s.list.length) { finish(s); return null; }
  if (s.vi % VISITS_PER_NIGHT === 0) s.night += 1;
  touch(s);
  return startVisit(s);
}

export function finish(s) {
  if (s.over) return s.ending;
  s.over = true;
  const clean = s.leaked === 0 && s.refusedReal === 0 && s.killedReal === 0;
  if (clean) s.ending = 'perfect';
  else if (s.leaked <= 1 && s.killedReal === 0) s.ending = 'keeper';
  else if (s.refusedReal >= 3) s.ending = 'shut';
  else s.ending = 'dawn';
  return s.ending;
}

export function score(s) {
  const total = s.list.length;
  return Math.max(0, Math.round(
    s.caught * 100 + s.killedFake * 40 + s.leaked * -80 + s.refusedReal * -45 + s.killedReal * -160
    + s.sanity * 2 + s.bullets * 10 + (s.ending === 'perfect' ? 600 : 0),
  ));
}

/* -------------------------------------------------------------- 存档 */
const K = { save: 'zjtt:fake:save', codex: 'zjtt:fake:codex', best: 'zjtt:fake:best', tells: 'zjtt:fake:tells' };

function read(key, dflt) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return dflt;
    const v = JSON.parse(raw);
    return v == null ? dflt : v;
  } catch (e) { return dflt; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式 */ }
}

let dirty = 0;
export function touch(s) {
  // 每步都写一次太吵，合并到 400ms 内一次；退出时 pagehide 会强制 flush
  if (dirty) return;
  dirty = setTimeout(() => { dirty = 0; write(K.save, s); }, 400);
}
export function flush(s) { write(K.save, s); }
export function loadSave() {
  const s = read(K.save, null);
  if (!s || s.v !== 2 || !Array.isArray(s.list)) return null;
  return s;
}
export function clearSave() { try { localStorage.removeItem(K.save); } catch (e) {} }

export function codex() {
  const c = read(K.codex, { met: [], tells: [] });
  if (!Array.isArray(c.met)) c.met = [];
  if (!Array.isArray(c.tells)) c.tells = [];
  return c;
}
export function meetAll(names) {
  const c = codex();
  let add = 0;
  for (const n of names) if (!c.met.includes(n)) { c.met.push(n); add++; }
  if (add) write(K.codex, c);
  return add;
}
export function addTells(keys) {
  const c = codex();
  let add = 0;
  for (const k of keys) if (!c.tells.includes(k)) { c.tells.push(k); add++; }
  if (add) write(K.codex, c);
  return add;
}
export function best() { return read(K.best, { ending: null, score: 0, runs: 0, nights: 0 }); }
export function saveBest(res) {
  const b = best();
  const out = {
    ending: res.score > (b.score || 0) ? res.ending : b.ending,
    score: Math.max(b.score || 0, res.score),
    runs: (b.runs || 0) + 1,
    nights: Math.max(b.nights || 0, res.night + 1),
  };
  write(K.best, out);
  return out;
}
export const ART_META = META;
