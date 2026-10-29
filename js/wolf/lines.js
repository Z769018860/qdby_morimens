// 弥萨格狼人杀：台词库入口
//
// 台词分层（越靠前越优先）：
//   1. 角色专属 · 场合 —— lines-*.js 里每个人自己的 say[kind]
//   2. 角色专属 · 身份 —— 拿到某个身份时那句 role[key]（自称身份时用）
//   3. 角色专属 · 查验 —— report.wolf / clean / void
//   4. 语气原型 TONES —— 兜底，保证任何缺项都有话说
//
// 高频场合（accuse / idle / vote / comment）在 lines-f/g/h.js 里又加了一层，
// 因为一局里一个人要说十几次，池子浅了一眼就能看出在轮播。
//
// 选句由 pickLine() 负责，它管三件容易出戏的事：
//   · 天数：第一天不许说「昨天他改口了」这种话（池子里带历史词的句子会被过滤）
//   · 重复：一个角色在本局里说过的话不会再说第二遍，除非他所有的句子都用完了
//   · 撞车：整桌也不会在短时间内出现同一句话（语气池是按原型共用的，容易撞）

import { TONES } from './tones.js';
import { A } from './lines-a.js';
import { B } from './lines-b.js';
import { C } from './lines-c.js';
import { D } from './lines-d.js';
import { E } from './lines-e.js';
import { X } from './lines-x.js';
import { R } from './lines-r.js';
import { F } from './lines-f.js';
import { G } from './lines-g.js';
import { H } from './lines-h.js';
import { I } from './lines-i.js';
import { J } from './lines-j.js';
import { K } from './lines-k.js';

// 语气原型表在 tones.js，这里的兜底取句逻辑直接用，不再转出去一份

// 数组一律拼接、对象递归合并：分批写的台词不会互相覆盖
function merge(dst, src) {
  if (Array.isArray(src)) {
    const base = Array.isArray(dst) ? dst : [];
    return base.concat(src.filter((x) => base.indexOf(x) < 0));
  }
  if (src && typeof src === 'object') {
    const base = dst && typeof dst === 'object' && !Array.isArray(dst) ? dst : {};
    const out = Object.assign({}, base);
    for (const k of Object.keys(src)) out[k] = merge(base[k], src[k]);
    return out;
  }
  return src === undefined ? dst : src;
}

export const LINES = {};
for (const chunk of [A, B, C, D, E, X, R, F, G, H, I, J, K]) {
  for (const name of Object.keys(chunk)) LINES[name] = merge(LINES[name] || {}, chunk[name]);
}

// 分批写的时候，role / report / last 有时被写进 say 里面。统一提到角色这一层，
// 取句逻辑就只需要认一种写法。
for (const name of Object.keys(LINES)) {
  const o = LINES[name];
  const s = o.say;
  if (!s || typeof s !== 'object') continue;
  for (const k of ['role', 'report', 'last']) {
    if (s[k] && !o[k]) o[k] = s[k];
    delete s[k];
  }
}

// ------------------------------------------------------------------ 天数 / 情境过滤
// 带这些词说明这句话在引用「以前发生过的事」，第一天不可能说
const HISTORY = /昨天|昨夜|前天|上次|上一回|那晚|前几天|改口|换了说法|三天前|昨天说|昨夜说/;

// 和「有人死了」绑定的句子，平安夜不能说
const BOUND_DEATH = /少了一个|又少一个|死了一个|又走一个|血味|又一个人|少一个人|又安静了一点/;
// 和「投票」绑定的句子，议事阶段不能说
const BOUND_VOTE = /投票|投出去|送出门|票数/;

const ARR = (x) => (Array.isArray(x) ? x : (x == null ? [] : [x]));

// 情境过滤：第一天不说带「昨天」的话，平安夜不说「又死一个」，议事阶段不说投票
function readyPool(G, arr, ctx) {
  let pool = ARR(arr).slice();
  if (!pool.length) return pool;
  if (G.day < 2) {
    const f = pool.filter((t) => !HISTORY.test(t));
    if (f.length) pool = f;
  }
  if (ctx.sit === 'safe') {
    const f = pool.filter((t) => !BOUND_DEATH.test(t));
    if (f.length) pool = f;
  }
  if (ctx.sit === 'dead') {
    const f = pool.filter((t) => !BOUND_VOTE.test(t));
    if (f.length) pool = f;
  }
  return pool;
}

// 从一堆可用句子里挑一个，尽量躲开整桌最近说过的
function pick1(G, list) {
  const recent = G.recentSaid || [];
  const clean = list.filter((t) => recent.indexOf(t) < 0);
  const pool = clean.length ? clean : list;
  return pool[Math.floor(G.rnd() * pool.length)] || null;
}

// 从一个候选池里挑：先按情境过滤，再按「这局说过没有」排序
function chooseArr(G, p, arr, ctx) {
  const pool = readyPool(G, arr, ctx);
  if (!pool.length) return null;
  // 这个角色本局已经说过的，排到最后（不是直接删——池子浅的时候还得靠它兜底）
  const mine = p.saidSet || (p.saidSet = new Set());
  const fresh = pool.filter((t) => !mine.has(t));
  return pick1(G, fresh.length ? fresh : pool);
}

function fill(text, ctx) {
  return String(text)
    .replace(/\{who\}/g, ctx.who || '某人')
    .replace(/\{role\}/g, ctx.role || '清醒者')
    .replace(/\{call\}/g, ctx.call || '守密人');
}

// 查验结果在引擎里叫 eroded / clean / void，台词库里写的是 wolf / clean / void。
// 这两个名字之间没有共同的约定，只能在这里对一次（漏了就会整段退化成「……」）。
const RES_KEY = { eroded: 'wolf', wolf: 'wolf', clean: 'clean', void: 'void' };
const RES_TONE = { eroded: 'reportWolf', wolf: 'reportWolf', clean: 'reportClean', void: 'reportVoid' };

// 新加的场合在语气原型里没有同名池，兜底时借用最接近的那一组。
// 没写这一行的话，缺项会直接掉到「……」，整段变成哑巴。
const TONE_ALIAS = { comment: 'react', pressure: 'defendSelf', callEnd: 'idle' };

// 取一句话。kind 见文件头；ctx 可带 { who, role, call, sit, reason, roleKey }
export function pickLine(G, p, kind, ctx) {
  ctx = ctx || {};
  const c = p.char || {};
  const own = LINES[c.zh] || {};
  const tone = TONES[c.tone] || TONES.cold;
  const said = own.say || {};

  const candidates = [];
  // 身份优先：自称某个身份时，先找他拿到这个身份的说法
  if (kind === 'claim' && ctx.roleKey && own.role && own.role[ctx.roleKey]) {
    candidates.push(own.role[ctx.roleKey]);
  }
  // report / last 允许写在 say 里面（分批写作时手滑过），两种写法都认
  const rp = own.report || (own.say && own.say.report);
  const ls = own.last || (own.say && own.say.last);
  if (kind === 'report' && ctx.res && rp && rp[RES_KEY[ctx.res] || ctx.res]) {
    candidates.push(rp[RES_KEY[ctx.res] || ctx.res]);
  }
  if (kind === 'death' && ctx.faction && ls && ls[ctx.faction]) {
    candidates.push(ls[ctx.faction]);
  }
  // react 支持按情境分池：{ dead:[], safe:[], vote:[] }
  if (kind === 'react' && own.say && own.say.react && !Array.isArray(own.say.react)) {
    const r = own.say.react;
    if (ctx.sit && r[ctx.sit]) candidates.push(r[ctx.sit]);
    if (r.any) candidates.push(r.any);
  }
  if (said[kind]) candidates.push(said[kind]);
  // 语气兜底：report 用 reportWolf / reportClean / reportVoid，react / accuse 也可能按情境分池
  if (kind === 'report' && ctx.res && tone[RES_TONE[ctx.res] || 'reportClean']) {
    candidates.push(tone[RES_TONE[ctx.res] || 'reportClean']);
  }
  const tk = TONE_ALIAS[kind] || kind;
  // comment 专用：语气原型里专门写了一组「对报牌的反应」，要排在通用 react 之前，
  // 否则会先拿到「……继续。」这种跟报牌毫无关系的兜底句
  if (kind === 'comment' && tone.react && !Array.isArray(tone.react) && tone.react.claim) {
    candidates.push(tone.react.claim);
  }
  if (tone[tk] && !Array.isArray(tone[tk])) {
    const r = tone[tk];
    if (kind !== 'comment' && ctx.sit && r[ctx.sit]) candidates.push(r[ctx.sit]);
    if (r.any) candidates.push(r.any);
  } else if (tone[tk]) {
    candidates.push(tone[tk]);
  }
  if (!candidates.length) candidates.push(['……']);

  const mine = p.saidSet || (p.saidSet = new Set());
  let text = null;
  // 优先找「这个角色这一局还没说过」的句子——自己的池子用完了就去借语气原型的，
  // 总比他把自己那句原封不动再说一遍好。候选池是按贴合度排过序的，
  // 所以只有在自己的池子确实空了的时候，才会掉到兜底那一层。
  for (const pool of candidates) {
    const rp = readyPool(G, pool, ctx);
    const fresh = rp.filter((t) => !mine.has(t));
    if (fresh.length) { text = pick1(G, fresh); break; }
  }
  if (!text) {
    for (const pool of candidates) {
      text = chooseArr(G, p, pool, ctx);
      if (text) break;
    }
  }
  if (!text) text = '……';

  // 记账：这句算说过了，短时间内整桌不再重复
  p.saidSet = p.saidSet || new Set();
  p.saidSet.add(text);
  p.lastLine = text;
  G.recentSaid = G.recentSaid || [];
  G.recentSaid.push(text);
  if (G.recentSaid.length > 70) G.recentSaid.shift();

  let out = fill(text, ctx);
  // 口癖：不是每句都缀，也不在同一句里缀两次
  const q = c.q || (own.q || '');
  if (q && G.rnd() < 0.12 && out.indexOf(q.replace(/^…+/, '')) < 0) out += q;
  return out;
}

// 调试用：某个人一共写了多少句
export function lineStats() {
  let n = 0;
  const per = {};
  for (const name of Object.keys(LINES)) {
    const o = LINES[name];
    let k = 0;
    for (const key of Object.keys(o.say || {})) {
      const v = o.say[key];
      if (Array.isArray(v)) k += v.length;
      else if (v && typeof v === 'object') for (const s of Object.keys(v)) k += ARR(v[s]).length;
    }
    for (const key of Object.keys(o.role || {})) k += 1;
    for (const key of Object.keys(o.report || {})) k += ARR(o.report[key]).length;
    for (const key of Object.keys(o.last || {})) k += ARR(o.last[key]).length;
    per[name] = k;
    n += k;
  }
  return { total: n, per };
}
