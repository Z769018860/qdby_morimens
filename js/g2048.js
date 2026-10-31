// 「忘却 2048」——2048 的玩法，方格换成《忘却前夜》的造物。
//
// 两块同样的造物合流就往上显影一级，从「染血鹅卵石」一路合到「祂的神谕」。
// 十一级的名字和色阶都在 data/g2048-levels.json，构建时连图一起内联进
// js/g2048-art.js（方块的图不发请求，整页只有一个脚本请求）。
//
// 除了标准 2048，这一版加了两个贴着原作设定的东西：
//   · 狂气：每次合并攒，攒满可以「忘却」——把场上最小的两块直接忘掉，腾地方；
//   · 侵蚀（可选）：每落 12 步多一块蚀，蚀块不能移动、不能合，只有紧挨着发生合成
//     才会被震碎（+40 显影）。原作里侵蚀是顽症，这里也就没给它「随便清掉」的路。
//
// 存的三份东西：本局局面（换页 / 刷新能接着玩）、各难度最高分、历史合到过的最高级
// （显影链面板拿它点灯）。账号登录后走 js/gamecloud.js 的通用云存档。
import { LEVELS, ROT_ART, SC_ART } from './g2048-art.js';
import { startGameCloud } from './gamecloud.js';

// ------------------------------------------------------------------ 常量
const KEY = {
  best: 'zjtt:g2048:best',          // 全难度最高分（榜单摘要用）
  save: 'zjtt:g2048:save',          // 当前局面
  diff: 'zjtt:g2048:diff',
  rot: 'zjtt:g2048:rot',
  snd: 'zjtt:g2048:snd',
  seen: 'zjtt:g2048:seen',          // 历史合到过的最高块
  skin: 'zjtt:g2048:skin',          // 换的皮（哪一类 + 每级抽中的是池里第几个）
};
const DIFFS = {
  classic: { n: 4, name: '4×4' },
  wide: { n: 5, name: '5×5' },
  brutal: { n: 3, name: '3×3' },
};

// ------------------------------------------------------------------ 银芯
// 每局结束按「棋盘 × 本局显影分」发银芯，三档棋盘各一张阶梯表。
// 为什么不共用一张表再乘难度系数：5×5 的分数和 4×4 根本不是一个量级——同一套启发式
// AI 各跑 60 局，4×4 中位数 6 千分、5×5 中位数 220 万分、3×3 只有 5 百。差三个数量级，
// 乘个系数糊不平，索性三张表按各自的分数分布铺。
// 三张表都差不多「每翻一倍上一档」：2048 的分数本来就是靠合大块翻上去的，
// 等比门槛等于「多合出一次大块就多一档」，比定额门槛讲得通。
// 表里第一个数是本局显影分，第二个是银芯数；取达到的最高一档，不叠加。
const CREDIT = {
  // 4×4：模拟分位 p05/p25/p50/p75/p90 ≈ 2.0k / 4.0k / 6.1k / 9.4k / 25k，合到 2048 约 2.5 万分
  classic: [
    [500, 1], [1200, 2], [2500, 4], [5000, 7], [9000, 10], [16000, 14],
    [25000, 19], [40000, 25], [70000, 32], [120000, 40], [200000, 48],
  ],
  // 5×5：同一个 AI 中位数两百多万分，门槛整体上抬一个量级，免得随便一局就发满
  wide: [
    [3000, 1], [8000, 2], [18000, 4], [40000, 7], [90000, 10], [200000, 14],
    [450000, 19], [1000000, 25], [2500000, 32], [6000000, 40], [15000000, 48],
  ],
  // 3×3：一局一两分钟就结束，合到 512 已经算好局（AI 中位数 512 分），门槛压得很低
  brutal: [
    [60, 1], [140, 2], [260, 4], [450, 6], [700, 9], [1000, 12],
    [1500, 16], [2200, 21], [3200, 27], [5000, 36],
  ],
};
const tiersOf = (k) => CREDIT[k] || CREDIT.classic;
const creditOf = (score, k) => {
  let out = 0;
  for (const [s, c] of tiersOf(k)) if (score >= s) out = c;
  return out;
};
// 侵蚀模式（每 12 步落一块墙）更难，银芯 ×1.25（向上取整）；整局的开关不会中途变，
// 因为切换侵蚀会直接重开一局（见 setRot）。
const ROT_MUL = 1.25;
const payOf = (score, k, rot) => { const b = creditOf(score, k); return rot && b > 0 ? Math.ceil(b * ROT_MUL) : b; };
const nextTierOf = (score, k) => tiersOf(k).find(([s]) => score < s) || null;

const TOP = LEVELS.length - 1;      // 最后一级的下标（2048）
const UNDO_MAX = 5;
const MANIA_FULL = 100;
const ROT_EVERY = 12;               // 侵蚀模式下每几步落一块蚀
const ROT_SCORE = 40;

const lvOf = (v) => Math.min(TOP, Math.max(0, Math.round(Math.log2(v)) - 1));
const colorOf = (i) => LEVELS[Math.min(TOP, i)].c;
// 方块上画什么、叫什么，都走 nameOf / artOf——换皮只改这两件事（见下面的「换皮」一节）。
// 颜色始终按等级取，不跟着皮变：5×5 那么密，只能靠颜色一眼扫出哪一级。

// ------------------------------------------------------------------ 状态
const G = {
  diff: 'classic', n: 4,
  cells: [],            // null | { id, v, rot }
  score: 0, steps: 0, mania: 0, peak: 2,
  undos: UNDO_MAX, hist: [],     // 撤销栈
  rot: false, over: false, won: false,
  snd: true, best: 0,
  busy: false,
};
let seq = 1;
const mk = (v, rot) => ({ id: seq++, v, rot: !!rot });

// ------------------------------------------------------------------ 换皮
// 十一级长什么样是可以整套换掉的：
//   chain    默认的显影链（那十一件造物，名字和图鉴对得上）
//   creation 从造物图鉴的 48 件里，每级抽一件不重复的
//   awakener 从全部 62 位唤醒体里，每级抽一位不重复的
// 皮只影响「画什么图 / 叫什么名」，数值、颜色、判负规则都不动。
// 池子一百多张图（四百来 KB）在 js/g2048-skins.js，首屏不加载：
// 玩家点换皮、或者上次换过要还原时才 import()。
const KIND_LABEL = { chain: '显影链', creation: '随机造物', awakener: '唤醒体' };
const SKIN = { k: 'chain', a: [] };   // a[i] = 这一级用的是池里第几张；k === 'chain' 时无意义
let KINDS = null;                     // js/g2048-skins.js 的 KINDS，懒加载
let kindsLoading = null;

function loadKinds() {
  if (KINDS) return Promise.resolve(KINDS);
  if (kindsLoading) return kindsLoading;
  kindsLoading = import('./g2048-skins.js')
    .then((m) => { KINDS = m.KINDS || null; return KINDS; })
    .catch(() => null);
  return kindsLoading;
}

// 这一级换过皮就用池里那张，否则用显影链原图
function skinItem(lv) {
  const i = Math.min(TOP, Math.max(0, lv));
  if (SKIN.k === 'chain' || !KINDS || !KINDS[SKIN.k]) return null;
  const pool = KINDS[SKIN.k].pool;
  const idx = SKIN.a[i];
  return (idx >= 0 && pool[idx]) || null;
}
const artOf = (lv) => { const it = skinItem(lv); return it ? it.art : LEVELS[Math.min(TOP, lv)].img; };
const nameOf = (lv) => { const it = skinItem(lv); return it ? it.n : LEVELS[Math.min(TOP, lv)].n; };

function readSkin() {
  let doc = null;
  try { doc = JSON.parse(lsGet(KEY.skin) || 'null'); } catch { doc = null; }
  if (!doc || !KIND_LABEL[doc.k] || doc.k === 'chain' || !Array.isArray(doc.a)) return null;
  SKIN.k = doc.k;
  SKIN.a = doc.a.map((n) => { const v = parseInt(n, 10); return Number.isFinite(v) && v >= 0 ? v : -1; });
  return SKIN;
}

function writeSkin() {
  try {
    if (SKIN.k === 'chain') localStorage.removeItem(KEY.skin);
    else localStorage.setItem(KEY.skin, JSON.stringify({ k: SKIN.k, a: SKIN.a }));
  } catch { /* 无痕模式 */ }
}

// 池子换过（比如以后加了新图）就当没换过那几级，别画成空白
function clampSkin() {
  const kind = KINDS && KINDS[SKIN.k];
  if (SKIN.k === 'chain' || !kind) { SKIN.k = 'chain'; SKIN.a = []; return; }
  const used = new Set();
  for (let i = 0; i < LEVELS.length; i++) {
    const v = SKIN.a[i];
    if (!(v >= 0) || v >= kind.pool.length || used.has(v)) SKIN.a[i] = -1;
    else used.add(v);
  }
  if (SKIN.a.some((v) => v < 0)) fillSkin(kind, used);
}

// 缺的级（以及池子不够时的重复）从剩下的里补齐
function fillSkin(kind, used) {
  const free = kind.pool.map((_, i) => i).filter((i) => !used.has(i));
  for (let i = free.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [free[i], free[j]] = [free[j], free[i]]; }
  for (let i = 0; i < LEVELS.length; i++) {
    if (SKIN.a[i] >= 0) continue;
    const v = free.pop();
    SKIN.a[i] = v === undefined ? 0 : v;
  }
}

// 换一套：整池洗牌，前十一张发给十一级；尽量避开正在用的那批，免得点了没变化
function shuffleSkin(k, quiet) {
  return loadKinds().then((kinds) => {
    if (!kinds || !kinds[k]) { toast('换皮素材没拉到，检查一下网络'); return null; }
    const pool = kinds[k].pool;
    if (!pool.length) return null;
    const cur = new Set(SKIN.k === k ? SKIN.a : []);
    const all = pool.map((_, i) => i);
    for (let i = all.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [all[i], all[j]] = [all[j], all[i]]; }
    all.sort((x, y) => (cur.has(x) ? 1 : 0) - (cur.has(y) ? 1 : 0));
    SKIN.k = k;
    SKIN.a = all.slice(0, LEVELS.length);
    SKIN.a.length = LEVELS.length;
    writeSkin();
    afterSkinChange();
    if (!quiet) {
      const names = SKIN.a.map((i) => pool[i] && pool[i].n).filter(Boolean);
      toast(KIND_LABEL[k] + '：' + names.slice(0, 3).join('、') + (names.length > 3 ? ' 等' : ''), 2200);
      sfx.tap();
    }
    return SKIN;
  });
}

function applyChain(quiet) {
  SKIN.k = 'chain'; SKIN.a = [];
  writeSkin();
  afterSkinChange();
  if (!quiet) { toast('换回显影链：还是那十一件造物'); sfx.tap(); }
}

// 换完皮：整盘重贴图（id 全换新，顺便把动画状态清干净），面板跟着重画
function afterSkinChange() {
  repaintAll();
  paintChain();
  paintSkinChips();
  paintSkinBtn();
}

// ------------------------------------------------------------------ DOM
const $ = (s) => document.querySelector(s);
const boardEl = $('#board');
const cellsEl = $('#cells');
const tilesEl = $('#tiles');
const floatBox = $('#floats');
const overEl = $('#over');
const scEl = $('#sc');
const bsEl = $('#bs');
const pkEl = $('#pk');
const gainEl = $('#mfill');
const gaugeEl = $('#gauge');
const forgetBtn = $('#forget');
const undoBtn = $('#undo');
const undonEl = $('#undon');
const hintEl = $('#hint');
const toastsEl = $('#toasts');

const tileEls = new Map();          // tile.id → DOM

// ------------------------------------------------------------------ 音效（全 WebAudio 合成，不引任何音频文件）
let AC = null;
function ac() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { AC = new C(); } catch { return null; }
  }
  if (AC.state === 'suspended') AC.resume().catch(() => {});
  return AC;
}
function tone(f, dur, { type = 'triangle', vol = 0.05, to = null, at = 0 } = {}) {
  if (!G.snd) return;
  const a = ac(); if (!a) return;
  const t0 = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}
const sfx = {
  merge(lv, at = 0) {
    const f = 196 * Math.pow(2, lv * 0.115);
    tone(f, 0.14, { vol: Math.max(0.016, 0.05 - lv * 0.002), to: f * 1.5, at });
  },
  spawn() { tone(760, 0.05, { type: 'sine', vol: 0.016 }); },
  bad() { tone(120, 0.14, { type: 'square', vol: 0.03, to: 80 }); },
  forget() { tone(520, 0.18, { type: 'sine', vol: 0.045, to: 180 }); tone(390, 0.22, { type: 'sine', vol: 0.03, to: 130, at: 0.06 }); },
  rot() { tone(90, 0.28, { type: 'sawtooth', vol: 0.05, to: 62 }); },
  win() { [0, 3, 7, 12].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.26, { type: 'sine', vol: 0.045, at: i * 0.09 })); },
  // 结算入账：两声短的高音，和「输了的」下行三音拉开
  coin() { [0, 7].forEach((s, i) => tone(880 * Math.pow(2, s / 12), 0.15, { type: 'sine', vol: 0.034, at: i * 0.085 })); },
  over() { [0, -2, -5, -9].forEach((s, i) => tone(330 * Math.pow(2, s / 12), 0.3, { type: 'triangle', vol: 0.05, at: i * 0.12 })); },
  tap() { tone(520, 0.04, { type: 'sine', vol: 0.02 }); },
};

// ------------------------------------------------------------------ 存储
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 无痕模式 */ } };
const num = (s, d = 0) => { const v = parseInt(s || '', 10); return Number.isFinite(v) ? v : d; };
const fmtNum = (n) => Math.round(n).toLocaleString('zh-CN');

// 银芯钱包：和合成大杜勒、战报侦探、忘却协议共用一个 zjtt:credits。
// 那边有的写 JSON 数字（"120"）、有的写裸数字（120），读的时候两种都认。
function walletGet() {
  const raw = lsGet('zjtt:credits');
  if (!raw) return 0;
  try {
    const v = Number(JSON.parse(raw));
    if (Number.isFinite(v)) return Math.max(0, Math.round(v));
  } catch { /* 不是 JSON 就看下面这条 */ }
  return Math.max(0, num(raw));
}

function walletAdd(n) {
  const add = Math.max(0, Math.round(n));
  if (!add) return walletGet();
  const v = walletGet() + add;
  lsSet('zjtt:credits', String(v));
  document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
  return v;
}

function loadPrefs() {
  const d = lsGet(KEY.diff);
  G.diff = DIFFS[d] ? d : 'classic';
  G.n = DIFFS[G.diff].n;
  G.rot = lsGet(KEY.rot) === '1';
  G.snd = lsGet(KEY.snd) !== '0';
  G.best = num(lsGet(KEY.best + ':' + G.diff));
}

function saveBest() {
  const k = KEY.best + ':' + G.diff;
  const cur = num(lsGet(k));
  if (G.score > cur) { lsSet(k, String(G.score)); G.best = G.score; }
  else if (G.best < cur) G.best = cur;
  if (G.score > num(lsGet(KEY.best))) lsSet(KEY.best, String(G.score));
}

function seenMax() { return num(lsGet(KEY.seen), 2); }
function noteSeen(v) { if (v > seenMax()) lsSet(KEY.seen, String(v)); }

// 本局局面。cells 存成纯数据（tile 的 id 不落盘，读回来重新发号）
function saveGame() {
  const cells = G.cells.map((t) => (t ? { v: t.v, r: t.rot ? 1 : 0 } : 0));
  const doc = {
    d: G.diff, c: cells, s: G.score, st: G.steps, m: G.mania, u: G.undos,
    pk: G.peak, o: G.over ? 1 : 0, w: G.won ? 1 : 0,
    h: G.hist.slice(-3),
  };
  lsSet(KEY.save, JSON.stringify(doc));
}

function loadGame() {
  let doc = null;
  try { doc = JSON.parse(lsGet(KEY.save) || 'null'); } catch { doc = null; }
  if (!doc || !Array.isArray(doc.c) || !DIFFS[doc.d]) return false;
  if (doc.c.length !== DIFFS[doc.d].n * DIFFS[doc.d].n) return false;
  if (doc.o) return false;                     // 已经散了的局，读回来也没意思
  G.diff = doc.d; G.n = DIFFS[G.diff].n;
  G.cells = doc.c.map((t) => (t && t.v ? mk(t.v, t.r) : null));
  G.score = num(doc.s); G.steps = num(doc.st); G.mania = Math.min(MANIA_FULL, num(doc.m));
  G.undos = Math.min(UNDO_MAX, num(doc.u, UNDO_MAX));
  G.peak = num(doc.pk, 2); G.won = !!doc.w;
  G.hist = Array.isArray(doc.h) ? doc.h.slice(-3) : [];
  G.best = num(lsGet(KEY.best + ':' + G.diff));
  return true;
}

// ------------------------------------------------------------------ 棋盘
function slotCount() { return G.n * G.n; }

function emptySlots() {
  const out = [];
  for (let i = 0; i < slotCount(); i++) if (!G.cells[i]) out.push(i);
  return out;
}

function spawnOne(rot) {
  const empt = emptySlots();
  if (!empt.length) return null;
  const i = empt[(Math.random() * empt.length) | 0];
  // 正常的 2048 是 9:1 出 2 / 4；这里让高难度稍微多给一点 4，3×3 不至于开局就死
  const v = rot ? 0 : (Math.random() < (G.n === 3 ? 0.16 : 0.1) ? 4 : 2);
  G.cells[i] = mk(rot ? 0 : v, rot);
  return G.cells[i];
}

function rotCount() { return G.cells.filter((t) => t && t.rot).length; }

// 一条线：从「靠近方向的那一侧」开始数，这样先写入的就是最靠边的位置
function lines(dir) {
  const n = G.n, out = [];
  for (let i = 0; i < n; i++) {
    const idx = [];
    for (let j = 0; j < n; j++) {
      let r, c;
      if (dir === 'l') { r = i; c = j; }
      else if (dir === 'r') { r = i; c = n - 1 - j; }
      else if (dir === 'u') { r = j; c = i; }
      else { r = n - 1 - j; c = i; }
      idx.push(r * n + c);
    }
    out.push(idx);
  }
  return out;
}

function neigh(i) {
  const n = G.n, r = (i / n) | 0, c = i % n, out = [];
  if (r > 0) out.push(i - n);
  if (r < n - 1) out.push(i + n);
  if (c > 0) out.push(i - 1);
  if (c < n - 1) out.push(i + 1);
  return out;
}

// 走一步。返回 { moved, gained, merges, broken }
// 关键：合并时保留靠前那一块的对象引用（id 不变），后面的直接消失——
// 渲染层靠 id 判断「这一块是不是同一块」，位置变了就走 transform 过渡。
function slide(dir) {
  const cells = G.cells;
  const before = cells.slice();
  let gained = 0, mania = 0;
  const merges = [];

  for (const line of lines(dir)) {
    // 蚀块是墙：一条线被它切成几段，各自压缩合并
    let seg = [];
    const flush = () => {
      if (seg.length > 1) {
        const tiles = [];
        for (const i of seg) { if (cells[i]) tiles.push(cells[i]); cells[i] = null; }
        let w = 0, prev = null;
        for (const t of tiles) {
          if (prev && !prev.merged && prev.v === t.v) {
            prev.v *= 2;
            prev.merged = true;
            gained += prev.v;
            mania += 5 + lvOf(prev.v) * 2;
            merges.push(seg[w - 1]);
          } else {
            cells[seg[w]] = t;
            prev = t;
            w++;
          }
        }
      }
      seg = [];
    };
    for (const i of line) {
      const t = cells[i];
      if (t && t.rot) { flush(); continue; }
      seg.push(i);
    }
    flush();
  }

  for (const t of cells) if (t) t.merged = false;
  const moved = merges.length > 0 || cells.some((t, i) => t !== before[i]) || before.some((t, i) => t !== cells[i]);

  // 合并震碎旁边的蚀块
  const broken = [];
  if (merges.length) {
    for (const i of merges) {
      for (const j of neigh(i)) {
        const t = cells[j];
        if (t && t.rot) { cells[j] = null; broken.push(j); }
      }
    }
  }
  if (broken.length) gained += broken.length * ROT_SCORE;
  return { moved, gained, mania, merges, broken };
}

function canMove() {
  if (emptySlots().length) return true;
  for (let i = 0; i < slotCount(); i++) {
    const t = G.cells[i];
    if (!t || t.rot) continue;
    for (const j of neigh(i)) {
      const u = G.cells[j];
      if (u && !u.rot && u.v === t.v) return true;
    }
  }
  return false;
}

// ------------------------------------------------------------------ 渲染
function metrics() {
  const w = boardEl.clientWidth || 320;      // 首帧前可能还是 0，给个兜底值别算出负的格子
  const gap = Math.max(5, Math.round(w * 0.017));
  const cell = (w - gap * (G.n + 1)) / G.n;
  return { w, gap, cell };
}

function buildCells() {
  boardEl.style.setProperty('--n', String(G.n));
  const { gap } = metrics();
  boardEl.style.setProperty('--gap', gap + 'px');
  const frag = document.createDocumentFragment();
  for (let i = 0; i < slotCount(); i++) {
    const d = document.createElement('div');
    d.className = 'cell';
    frag.appendChild(d);
  }
  cellsEl.replaceChildren(frag);
}

function faceOf(el) { return el.firstElementChild; }

function paint(animate = true) {
  const { gap, cell } = metrics();
  boardEl.style.setProperty('--gap', gap + 'px');
  // 换了皮换一套观感：唤醒体是方照片，方块按「立绘卡」画（见页面 CSS 的 .board[data-skin]）
  boardEl.dataset.skin = SKIN.k;
  const seen = new Set();

  G.cells.forEach((t, i) => {
    if (!t) return;
    seen.add(t.id);
    const r = (i / G.n) | 0, c = i % G.n;
    let el = tileEls.get(t.id);
    const isNew = !el;
    if (isNew) {
      el = document.createElement('div');
      el.className = 'tile';
      // .blur 只在「唤醒体」皮里有用（满铺照片底下压一层暗角放数字，见页面 CSS）
      el.innerHTML = '<div class="face"><img alt="" decoding="async"><i class="blur"></i><span class="v"></span></div>';
      tilesEl.appendChild(el);
      tileEls.set(t.id, el);
    }
    el.style.width = cell + 'px';
    el.style.height = cell + 'px';
    el.style.transform = `translate(${gap + c * (cell + gap)}px, ${gap + r * (cell + gap)}px)`;

    const face = faceOf(el);
    const lv = t.rot ? -1 : lvOf(t.v);
    const key = t.rot ? 'rot' : String(t.v);
    el.classList.toggle('rot', !!t.rot);
    el.classList.toggle('top', !t.rot && lv >= TOP);
    // 4096 往上没有新造物了：同一张图，靠「金箔」这层样式和 2048 区分
    el.classList.toggle('beyond', !t.rot && lv >= TOP && t.v > LEVELS[TOP].v);
    if (el.dataset.k !== key) {
      el.dataset.k = key;
      const img = face.querySelector('img');
      img.src = t.rot ? ROT_ART : artOf(lv);
      face.style.setProperty('--c', t.rot ? 'var(--rot)' : colorOf(lv));
      const label = t.rot ? '蚀' : String(t.v);
      face.querySelector('.v').textContent = label;
      const digits = label.length;
      const fs = Math.max(9, Math.round(cell * (digits <= 1 ? 0.32 : digits === 2 ? 0.29 : digits === 3 ? 0.25 : digits === 4 ? 0.21 : 0.18)));
      face.style.setProperty('--vfs', fs + 'px');
      el.title = t.rot ? '侵蚀：不能移动，紧挨着合成才会被震碎' : `${nameOf(lv)}（${t.v}）`;
      // 合并：这一格的值变了 → 弹一下。新落下的块只做「生」的动画，别再弹一次
      if (!isNew && animate) {
        // 合到高位弹得明显一点：128 往上一局也见不到几次
        face.classList.remove('pop', 'pop2');
        void face.offsetWidth;
        face.classList.add(lv >= 6 ? 'pop2' : 'pop');
      }
    }
    if (isNew && animate) {
      face.classList.remove('born');
      void face.offsetWidth;
      face.classList.add('born');
    }
  });

  for (const [id, el] of tileEls) {
    if (!seen.has(id)) { el.remove(); tileEls.delete(id); }
  }
}

function repaintAll() {
  for (const [, el] of tileEls) el.remove();
  tileEls.clear();
  clearFloats();
  paint(false);
}

function updateHud() {
  scEl.textContent = G.score;
  bsEl.textContent = G.best;
  pkEl.textContent = G.peak;
  const pct = Math.min(100, (G.mania / MANIA_FULL) * 100);
  gainEl.style.width = pct + '%';
  gaugeEl.classList.toggle('done', G.mania >= MANIA_FULL);
  const canForget = G.mania >= MANIA_FULL && !G.over;
  forgetBtn.disabled = !canForget;
  forgetBtn.classList.toggle('on', canForget);
  undonEl.textContent = G.undos;
  undoBtn.disabled = G.undos <= 0 || !G.hist.length || G.over;
}

function toast(text, ms = 1600) {
  const d = document.createElement('div');
  d.className = 'toast';
  d.textContent = text;
  toastsEl.appendChild(d);
  setTimeout(() => d.classList.add('out'), ms);
  setTimeout(() => d.remove(), ms + 340);
  while (toastsEl.children.length > 3) toastsEl.firstElementChild.remove();
}

function shake() {
  boardEl.classList.remove('shake');
  void boardEl.offsetWidth;
  boardEl.classList.add('shake');
}

// 震动跟着音效开关走：关掉声音就是「静音玩」，不该还震手。
// iOS Safari 没有 navigator.vibrate，没有就算了，不值得为它加分支动画。
function haptic(pat) {
  if (!G.snd) return;
  const v = navigator.vibrate;
  if (typeof v !== 'function') return;
  // 还没有任何用户手势时调它，Chrome 会在控制台刷一条警告，而且本来也不会振
  const ua = navigator.userActivation;
  if (ua && ua.hasBeenActive === false) return;
  try { v.call(navigator, pat); } catch { /* 被策略拦了，无所谓 */ }
}

// 系统开了「减少动态效果」就别造这些节点了（CSS 里也藏了，这里干脆不生成）
const REDUCE = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

// 合并时从那一格飞出一个「+4」。浮字和滑块不在同一层，位置动画互不干扰。
function floatScore(idx, val) {
  if (!floatBox || REDUCE) return;
  const { gap, cell } = metrics();
  const cy = gap + ((idx / G.n) | 0) * (cell + gap) + cell / 2;
  const d = document.createElement('div');
  d.className = 'float';
  d.textContent = '+' + val;
  d.style.left = (gap + (idx % G.n) * (cell + gap) + cell / 2) + 'px';
  d.style.top = cy + 'px';
  // 上升量按格子算（百分比是相对字高的，字才 13px，飘 13px 等于没动）；
  // 棋盘不裁剪，所以第一行也能一路飘出去，落在棋盘上方那片空处
  d.style.setProperty('--rise', Math.round(cell * 0.9) + 'px');
  floatBox.appendChild(d);
  while (floatBox.children.length > 4) floatBox.firstElementChild.remove();
  setTimeout(() => d.remove(), 720);
}

function clearFloats() { if (floatBox) floatBox.replaceChildren(); }

// ------------------------------------------------------------------ 一局的生命周期
// 一局打到一半就重开 / 换棋盘 / 开关侵蚀：按当前得分把银芯结了再重来。
// 2048 打得好的人根本不会「输」，如果只在判负时发钱，重开就等于白打。
// 换棋盘时调用方要在改 G.diff 之前先结（阶梯表按旧棋盘算），结完 G.over 已置位，这里不会重复发。
function settleOpen() {
  if (G.over || G.score <= 0 || !G.cells.length) return 0;
  G.over = true;                      // 同一局只结一次
  const got = payOf(G.score, G.diff, G.rot);
  if (got > 0) { walletAdd(got); toast(`上一局结算：+${got} 银芯（${fmtNum(G.score)} 分）`, 2200); }
  return got;
}

function newGame(silent) {
  settleOpen();
  seq = 1;
  G.cells = new Array(slotCount()).fill(null);
  G.score = 0; G.steps = 0; G.mania = 0; G.peak = 2;
  G.undos = UNDO_MAX; G.hist = [];
  G.over = false; G.won = false;
  overEl.hidden = true;
  for (const [, el] of tileEls) el.remove();
  tileEls.clear();
  clearFloats();
  spawnOne(); spawnOne();
  G.peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
  paint(false);
  updateHud();
  saveGame();
  if (!silent) sfx.tap();
}

function snapshot() {
  return {
    c: G.cells.map((t) => (t ? { v: t.v, r: t.rot ? 1 : 0 } : 0)),
    s: G.score, m: G.mania, st: G.steps, pk: G.peak, w: G.won,
  };
}

// 只记「真的走成了」的一步。滑不动那一下也压栈的话，五次空划就能把
// 真正的历史挤出去，回溯看着就像坏了——这是个真 bug，顺手修掉。
function pushUndo(snap) {
  G.hist.push(snap || snapshot());
  if (G.hist.length > UNDO_MAX) G.hist.shift();
}

function undo() {
  if (G.over || G.undos <= 0 || !G.hist.length) return;
  const h = G.hist.pop();
  // 快照里存的是纯数据，读回来重新发号（DOM 也跟着全部重建，不做位移动画）
  G.cells = h.c.map((t) => (t ? mk(t.v, t.r) : null));
  G.score = h.s; G.mania = h.m; G.steps = h.st; G.peak = h.pk; G.won = h.w;
  G.undos -= 1;
  overEl.hidden = true;
  G.over = false;
  clearFloats();
  repaintAll();
  updateHud();
  saveGame();
  sfx.tap();
}

function useForget() {
  if (G.mania < MANIA_FULL || G.over) return;
  const list = G.cells
    .map((t, i) => ({ t, i }))
    .filter((x) => x.t && !x.t.rot)
    .sort((a, b) => a.t.v - b.t.v)
    .slice(0, 2);
  if (!list.length) return;
  pushUndo();
  for (const x of list) G.cells[x.i] = null;
  G.mania = 0;
  paint(true);
  updateHud();
  saveGame();
  sfx.forget();
  toast('忘却：忘掉了「' + list.map((x) => nameOf(lvOf(x.t.v))).join('」「') + '」');
  if (!canMove()) endGame();
}

function checkWin() {
  if (G.won || G.peak < 2048) return;
  G.won = true;
  sfx.win();
  haptic([9, 40, 9, 40, 16]);
  toast('显影完成：' + nameOf(TOP) + '。可以继续往上合', 2600);
}

function endGame() {
  if (G.over) return;                 // 结算只走一次：银芯是按局发的，别让重复调用重复记账
  G.over = true;
  saveBest();
  saveGame();
  sfx.over();
  haptic([16, 56, 24]);
  const diffName = DIFFS[G.diff].name;
  const rec = num(lsGet(KEY.best + ':' + G.diff));
  const isNew = G.score >= rec && G.score > 0;

  // 银芯：按本局得分取这一档棋盘的阶梯，先入账再弹结算，刷掉页面也不会丢
  const got = payOf(G.score, G.diff, G.rot);
  if (got > 0) { walletAdd(got); setTimeout(() => sfx.coin(), 260); }

  $('#ovk').textContent = G.peak >= 2048 ? '显影到底了' : '这段记忆散了';
  $('#ovs').textContent = G.score;
  $('#ovd').textContent = `最高块「${nameOf(lvOf(G.peak))}」 · ${G.steps} 步 · ${diffName}`;
  paintCredit(got);
  overEl.hidden = false;
  updateHud();
  if (isNew) setTimeout(() => toast('新纪录：' + G.score + ' 分', 2200), 500);
}

// 结算里那一行银芯：拿到了就报数并写清「下一档还差多少」，没拿到就说差多少才有第一枚。
// 档位是「取最高一档」，所以不写乘法，只报这一档本身。
function paintCredit(got) {
  const el = $('#ovc');
  if (!el) return;
  const wallet = walletGet();
  const nx = nextTierOf(G.score, G.diff);
  const nextTxt = nx
    ? `再得 ${fmtNum(nx[0] - G.score)} 分到 ${fmtNum(nx[0])}（+${nx[1]} 枚）`
    : '已经是最高一档';
  const head = got > 0
    ? `<img src="${SC_ART}" alt="" width="16" height="16" decoding="async"><b>+${got}</b> 银芯${G.rot ? '（侵蚀 ×1.25）' : ''}`
    : `<span class="none">还没够到第一档（${fmtNum(tiersOf(G.diff)[0][0])} 分）</span>`;
  el.className = 'cred' + (got > 0 ? ' on' : '');
  el.innerHTML = head + `<small>${nextTxt} · 钱包 ${fmtNum(wallet)}</small>`;
}

// 一步移动的完整流程。slide 是就地改格子的，快照得在调它之前拍；
// 但「滑不动」的那一下不该留下撤销记录，所以先拍、走成了才入栈。
function act(d) {
  if (G.over) return false;
  const snap = snapshot();
  const res = slide(d);
  if (!res.moved) { shake(); sfx.bad(); haptic(6); return false; }
  pushUndo(snap);

  G.score += res.gained;
  G.mania = Math.min(MANIA_FULL, G.mania + res.mania);
  G.steps += 1;

  const peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
  const peakUp = peak > G.peak;
  G.peak = peak;
  if (peakUp) {
    noteSeen(peak);
    if (peak >= 128) toast('显影：' + nameOf(lvOf(peak)));
  }

  if (res.merges.length) {
    // 浮字：一次合好几块就飞好几个（最多三个，再多就成放烟花了）
    for (const i of res.merges.slice(0, 3)) { const t = G.cells[i]; if (t) floatScore(i, t.v); }
    // 声音：按合得最高的那一级响一声；一次合了两块以上再补一声低的，听得出是「一片」在合
    const lvs = res.merges.map((i) => (G.cells[i] ? lvOf(G.cells[i].v) : 0)).sort((a, b) => b - a);
    sfx.merge(lvs[0]);
    if (lvs.length > 1) sfx.merge(lvs[lvs.length - 1], 0.055);
    haptic(lvs[0] >= 6 ? 16 : 9);
  }
  if (res.broken.length) { sfx.rot(); haptic(24); toast('震碎了一块蚀', 1200); }

  // 新的一块：侵蚀模式下每 12 步落一块蚀（场上的蚀最多 n-1 个，别把棋盘焊死）
  const wantRot = G.rot && G.steps % ROT_EVERY === 0 && rotCount() < G.n - 1 && emptySlots().length >= 2;
  const t = spawnOne(wantRot);
  if (t) { if (wantRot) sfx.rot(); else sfx.spawn(); }

  paint(true);
  updateHud();
  saveBest();
  saveGame();
  checkWin();
  if (!canMove()) endGame();
  return true;
}

// ------------------------------------------------------------------ 交互
// 方向判定只有 dirOf 一个口径，键盘 / 触摸 / 拖拽 / 滚轮都走它：
//   · 主轴必须明显大于副轴（ratio）：斜着划就再等一点，别猜——猜错一步比慢半拍难受得多；
//   · 越过 commit 立刻走一步，然后「重新落锚」：手指不抬起、继续往前划还能接着走，
//     但同一次滑动最多 3 步（再多就成甩手划盘面了）；
//   · 手抬起来时补一刀：位移短但方向明确也算数，点划党不用非得划半屏。
const SWIPE = {
  start: 13,        // 起判：抬起时用的最小位移
  commit: 23,       // 出手：滑动中越过这个就立刻走一步（4×4 一格约 90px，四分之一格）
  more: 34,         // 同一次滑动里再走下一步要更远一点
  ratio: 1.28,      // 主轴 / 副轴 至少这么多倍才认，斜划不乱动
  maxPerSwipe: 3,
  glideLock: 200,   // 撞墙后的冷却：别一直贴着墙抖
};

function dirOf(dx, dy, min, ratio) {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax < min && ay < min) return null;
  if (ax >= ay * ratio) return dx > 0 ? 'r' : 'l';
  if (ay >= ax * ratio) return dy > 0 ? 'd' : 'u';
  return null;                     // 太斜：再等等，不猜
}

function bindKeys() {
  window.addEventListener('keydown', (e) => {
    const k = (e.key || '').toLowerCase();
    // Ctrl / Cmd + Z 也认：撤回是肌肉记忆，不该逼人改成单键
    if ((e.metaKey || e.ctrlKey) && k === 'z') { e.preventDefault(); undo(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    // 显影链面板开着的时候不接方向键（别在面板后面偷偷动盘面），
    // 但 Y / Esc 还得管用——面板里最常用的就是「再摇一批」和「收起」。
    if (!$('#sheet').hidden) {
      if (k === 'y') { e.preventDefault(); if (SKIN.k !== 'chain') shuffleSkin(SKIN.k, false); }
      else if (k === 'escape') { e.preventDefault(); openSheet(false); }
      return;
    }
    const map = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd' };
    if (map[k]) { e.preventDefault(); doMove(map[k]); return; }   // 方向键按住连发是好事，放行
    if (e.repeat) return;                                          // 下面这些按一下就够了
    if (k === 'z') { e.preventDefault(); undo(); }
    else if (k === 'r') { e.preventDefault(); newGame(); }
    else if (k === 'm') { e.preventDefault(); toggleSound(); }
    else if (k === 'f') { e.preventDefault(); useForget(); }
    else if (k === 'y') { e.preventDefault(); if (SKIN.k === 'chain') openSheet(true); else shuffleSkin(SKIN.k, false); }
  });
}

function bindTouch() {
  // 一次滑动的状态：锚点、还剩几步、这一步走成没、撞墙冷却
  let sx = 0, sy = 0, active = false, left = 0, fired = false, lock = 0;

  boardEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { active = false; return; }   // 双指（捏合、缩放）不算滑动
    sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    active = true; left = SWIPE.maxPerSwipe; fired = false; lock = 0;
  }, { passive: true });

  boardEl.addEventListener('touchmove', (e) => {
    if (!active) return;
    if (e.touches.length !== 1) { active = false; return; }
    if (e.cancelable) e.preventDefault();   // .board 上已有 touch-action:none，这是双保险
    if (performance.now() < lock) return;
    const t = e.touches[0];
    // 第一刀 23px 就走，之后每刀 34px：短划一步，长划最多三步
    const dir = dirOf(t.clientX - sx, t.clientY - sy, fired ? SWIPE.more : SWIPE.commit, SWIPE.ratio);
    if (!dir) return;
    if (doMove(dir)) {
      fired = true;
      sx = t.clientX; sy = t.clientY;                 // 重新落锚，接着划还能再走
      if (--left <= 0) active = false;
    } else {
      // 这个方向走不动：锚点不动（改方向还能立刻生效），只锁一小会儿
      lock = performance.now() + SWIPE.glideLock;
    }
  }, { passive: false });

  boardEl.addEventListener('touchend', (e) => {
    if (!active) return;
    active = false;
    const t = e.changedTouches[0];
    if (!t) return;
    // 抬起补一刀：短促的点划也算一步；这一次已经走过的话，剩下的距离得够长才补
    const dir = dirOf(t.clientX - sx, t.clientY - sy, fired ? SWIPE.more : SWIPE.start, 1);
    if (dir) doMove(dir);
  }, { passive: true });

  boardEl.addEventListener('touchcancel', () => { active = false; }, { passive: true });

  // 鼠标拖拽：桌面上不按键盘也能玩，判定和触摸完全一致
  let mx = 0, my = 0, down = false, mleft = 0, mfired = false, mlock = 0;
  boardEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();                                   // 别顺手把整页文字选中
    mx = e.clientX; my = e.clientY;
    down = true; mleft = SWIPE.maxPerSwipe; mfired = false; mlock = 0;
  });
  window.addEventListener('mousemove', (e) => {
    if (!down || performance.now() < mlock) return;
    const dir = dirOf(e.clientX - mx, e.clientY - my, mfired ? SWIPE.more : SWIPE.commit, SWIPE.ratio);
    if (!dir) return;
    if (doMove(dir)) {
      mfired = true;
      mx = e.clientX; my = e.clientY;
      if (--mleft <= 0) down = false;
    } else {
      mlock = performance.now() + SWIPE.glideLock;
    }
  });
  window.addEventListener('mouseup', (e) => {
    if (!down) return;
    down = false;
    const dir = dirOf(e.clientX - mx, e.clientY - my, mfired ? SWIPE.more : SWIPE.start, 1);
    if (dir) doMove(dir);
  });

  // 滚轮 / 触控板：累计到一定量走一步。触控板的惯性尾巴会连着来一串，
  // 所以走动之后就锁一小会儿，不然一划能刷出去好几步。
  let wx = 0, wy = 0, wlock = 0;
  boardEl.addEventListener('wheel', (e) => {
    if (e.cancelable) e.preventDefault();
    const now = performance.now();
    if (now < wlock) return;
    wx += e.deltaX; wy += e.deltaY;
    const dir = dirOf(wx, wy, 30, SWIPE.ratio);
    if (!dir) {
      // 一直是斜的（或只是轻微滚动），别让累计量越攒越大
      if (Math.abs(wx) + Math.abs(wy) > 320) { wx = 0; wy = 0; }
      return;
    }
    wlock = now + 170;
    wx = 0; wy = 0;
    doMove(dir);
  }, { passive: false });
}

function doMove(dir) {
  if (!$('#sheet').hidden) return false;
  return act(dir);
}

function toggleSound() {
  G.snd = !G.snd;
  lsSet(KEY.snd, G.snd ? '1' : '0');
  const b = $('#snd');
  b.classList.toggle('off', !G.snd);
  b.setAttribute('aria-pressed', G.snd ? 'true' : 'false');
  if (G.snd) sfx.tap();
}

function syncDiffButtons() {
  for (const b of document.querySelectorAll('#diffs button')) {
    const on = b.dataset.d === G.diff;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  }
}

function setDiff(k, silent) {
  if (!DIFFS[k] || k === G.diff) return;
  settleOpen();
  G.diff = k; G.n = DIFFS[k].n;
  lsSet(KEY.diff, k);
  G.best = num(lsGet(KEY.best + ':' + k));
  buildCells();
  syncDiffButtons();
  newGame(true);
  if (!silent) toast('换成 ' + DIFFS[k].name + ' 棋盘');
}

function setRot(on) {
  const live = !G.over;
  if (!!on !== G.rot) settleOpen();     // 按旧模式（开/关）把上一局的银芯结了
  G.rot = !!on;
  lsSet(KEY.rot, G.rot ? '1' : '0');
  const b = $('#rot');
  b.classList.toggle('on', G.rot);
  b.setAttribute('aria-pressed', G.rot ? 'true' : 'false');
  b.textContent = G.rot ? '侵蚀 开' : '侵蚀 关';
  if (live) { newGame(true); toast(G.rot ? '侵蚀已开：每 12 步落一块蚀' : '侵蚀已关，重新开局'); }
}

// 显影链面板：见过的点亮，没见过的灰着（剪影比问号更能勾人去合）
// 换过皮的话，这里显示的就是「现在这套皮」的十一级，名字也跟着换。
function paintChain() {
  const seen = seenMax();
  const box = $('#chain');
  box.replaceChildren();
  LEVELS.forEach((l, i) => {
    const got = seen >= l.v;
    const d = document.createElement('div');
    d.className = 'lv' + (got ? ' got' : '');
    d.style.setProperty('--c', l.c);
    d.innerHTML = '<div class="bx"><img alt="" decoding="async"></div><b></b><small></small>';
    d.querySelector('img').src = artOf(i);
    d.querySelector('b').textContent = l.v;
    d.querySelector('small').textContent = got ? nameOf(i) : '未显影';
    box.appendChild(d);
  });
}

function paintSkinChips() {
  for (const b of document.querySelectorAll('#skinKinds button')) {
    const on = b.dataset.k === SKIN.k;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  const random = SKIN.k !== 'chain';
  const roll = $('#skinRoll'), reset = $('#skinReset'), tip = $('#sheetTip');
  if (roll) roll.hidden = !random;
  if (reset) reset.hidden = !random;
  if (tip) {
    tip.textContent = random
      ? `换过皮了：这十一级换成了${KIND_LABEL[SKIN.k]}，名字和图都是图鉴里真有的。换个心情可以「再摇一批」；颜色仍按等级走，不会认错。`
      : '两块同样的造物合流，往上显影一级。点亮的是你合到过的——灰的是还没见过的。也可以整套换皮：随机造物，或者唤醒体的脸。';
  }
}

// 顶栏那个调色盘按钮：换过皮就亮着，点开就是显影链 / 换皮那张面板
function paintSkinBtn() {
  const b = $('#skin');
  if (!b) return;
  const on = SKIN.k !== 'chain';
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = on ? `当前是「${KIND_LABEL[SKIN.k]}」皮，点开换（Y）` : '换皮：把十一级换成随机造物或唤醒体的脸（Y）';
}

function openSheet(open) {
  const s = $('#sheet');
  s.hidden = !open;
  if (open) { paintChain(); paintSkinChips(); paintCreditRules(); sfx.tap(); }
}

// 面板底下那张银芯表：当前这一档棋盘的阶梯，够到的点亮，下一档标金。
// 有了它，玩家才知道「再合一个大块能换几枚」，而不用先输一局看结算。
function paintCreditRules() {
  const box = $('#crules');
  if (!box) return;
  const tiers = tiersOf(G.diff);
  const got = payOf(G.score, G.diff, G.rot);
  const nx = nextTierOf(G.score, G.diff);
  box.replaceChildren();
  const h = document.createElement('h4');
  h.innerHTML = `银芯 <span>· ${DIFFS[G.diff].name} · 每局按本局显影取最高一档${G.rot ? ' · 侵蚀 ×1.25' : ''}</span>`;
  box.appendChild(h);
  const rows = document.createElement('div');
  rows.className = 'rows';
  for (const [s, c] of tiers) {
    const i = document.createElement('i');
    i.className = s <= G.score ? 'on' : (nx && nx[0] === s ? 'next' : '');
    i.innerHTML = `<span>${fmtNum(s)}</span><img src="${SC_ART}" alt="" width="12" height="12" decoding="async"><b>${c}</b>`;
    rows.appendChild(i);
  }
  box.appendChild(rows);
  const tip = document.createElement('p');
  tip.className = 'crtip';
  tip.textContent = got > 0
    ? `本局现在 ${fmtNum(G.score)} 分，就这么散了能换 ${got} 枚。`
    : `本局 ${fmtNum(G.score)} 分，再得 ${fmtNum(tiers[0][0] - G.score)} 分才有银芯。`;
  box.appendChild(tip);
}

// ------------------------------------------------------------------ 启动
function boot() {
  loadPrefs();
  // 先读存档：存档里的棋盘尺寸可能和偏好里的难度不一致时，以存档为准
  const restored = loadGame();
  const sk = readSkin();            // 上次换过皮的话，先把「哪套皮」读出来
  if (!restored) G.cells = new Array(slotCount()).fill(null);
  buildCells();
  syncDiffButtons();

  const snd = $('#snd');
  snd.classList.toggle('off', !G.snd);
  snd.setAttribute('aria-pressed', G.snd ? 'true' : 'false');
  setRotText();

  $('#diffs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-d]');
    if (b) setDiff(b.dataset.d);
  });
  $('#rot').addEventListener('click', () => setRot(!G.rot));
  $('#snd').addEventListener('click', toggleSound);
  $('#rst').addEventListener('click', () => { newGame(); });
  $('#again').addEventListener('click', () => newGame());
  forgetBtn.addEventListener('click', useForget);
  undoBtn.addEventListener('click', undo);
  $('#pkBtn').addEventListener('click', () => openSheet(true));
  $('#sheetClose').addEventListener('click', () => openSheet(false));
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') openSheet(false); });

  // 换皮：三种皮是互斥的（同一块面板里切），点当前那一档就再摇一批
  $('#skin').addEventListener('click', () => openSheet(true));
  $('#skinKinds').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    if (b.dataset.k === 'chain') applyChain(false);
    else shuffleSkin(b.dataset.k, false);
  });
  $('#skinRoll').addEventListener('click', () => { if (SKIN.k !== 'chain') shuffleSkin(SKIN.k, false); });
  $('#skinReset').addEventListener('click', () => applyChain(false));

  bindTouch();
  bindKeys();
  window.addEventListener('resize', () => { paint(false); });

  hintEl.innerHTML = '方向键 / WASD 移动 · <b>Z</b> 回溯 · <b>R</b> 重开 · <b>Y</b> 换皮';

  const first = () => {
    // 恢复上次没打完的一局；没有就开新的
    if (restored) {
      paint(false);
      updateHud();
      saveGame();
    } else {
      newGame(true);
    }
    noteSeen(G.peak);
    paintSkinBtn();
    paintSkinChips();
    const b = document.getElementById('boot');
    if (b) b.remove();

    // 玩过一次再给提示，别一进来就糊一脸
    if (!lsGet('zjtt:g2048:played')) {
      lsSet('zjtt:g2048:played', '1');
      setTimeout(() => toast('同样的两块撞在一起，就往上显影一级', 2400), 500);
      setTimeout(() => toast('狂气攒满可以「忘却」，忘掉最小的两块腾地方', 2600), 3400);
      setTimeout(() => toast('点右上角那个调色盘能换皮：随机造物，或者唤醒体的脸', 2800), 6400);
    }
    startGameCloud('g2048');
  };

  if (!sk) { first(); return; }
  // 换过皮：池子没到之前先别画，不然会先闪一帧原版造物。
  // 拉不到就安静地退回显影链——「正在显影」不能一直转着。
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.textContent = '正在换皮…';
  loadKinds().then((kinds) => {
    if (!kinds || !kinds[SKIN.k]) { SKIN.k = 'chain'; SKIN.a = []; writeSkin(); }
    else clampSkin();
    first();
  });
}

function setRotText() {
  const b = $('#rot');
  b.classList.toggle('on', G.rot);
  b.setAttribute('aria-pressed', G.rot ? 'true' : 'false');
  b.textContent = G.rot ? '侵蚀 开' : '侵蚀 关';
}

// 图片都内联在脚本里，正常第一帧就画完了；万一解码慢，也别卡在「正在显影」
let booted = false;
const start = () => { if (booted) return; booted = true; boot(); };
Promise.race([
  Promise.all(LEVELS.slice(0, 4).map((l) => new Promise((r) => {
    const im = new Image();
    im.onload = im.onerror = r;
    im.src = l.img;
    if (im.decode) im.decode().then(r, r);
  }))),
  new Promise((r) => setTimeout(r, 900)),
]).then(start, start);

// 无头自测：?_test=1（或脚本里设 window.__G2048_TEST__）才挂内部接口
if (window.__G2048_TEST__ || /[?&]_test=1\b/.test(location.search)) {
  window.__g2048 = {
    G,
    move: (d) => doMove(d),
    act: (d) => act(d),
    set: (arr) => { // 直接摆盘（值数组，-1 表示蚀块），用来测合并 / 判负
      seq = 1;
      G.cells = arr.map((v) => (v === -1 ? mk(0, true) : v ? mk(v) : null));
      G.over = false; G.hist = []; G.score = 0; G.steps = 0; G.mania = 0;
      G.peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
      overEl.hidden = true;
      clearFloats();
      paint(false);
      updateHud();
    },
    canMove: () => canMove(),
    forget: () => useForget(),
    undo: () => undo(),
    diff: (k) => setDiff(k, true),
    rot: (on) => setRot(on),
    // 银芯：本局得分值多少枚 / 这一档棋盘的阶梯 / 结算（发钱那一步）
    credit: (s) => payOf(s === undefined ? G.score : s, G.diff, G.rot),
    tiers: () => tiersOf(G.diff).map(([s, c]) => [s, c]),
    wallet: () => walletGet(),
    end: () => { if (!G.over) endGame(); return payOf(G.score, G.diff, G.rot); },
    state: () => ({ score: G.score, peak: G.peak, over: G.over, n: G.n, mania: G.mania, steps: G.steps, cells: G.cells.map((t) => (t ? (t.rot ? -1 : t.v) : 0)) }),
    // 换皮：skin('creation'|'awakener') 摇一批，skin('chain') 还原；返回 Promise
    skin: (k) => (k === 'chain' ? (applyChain(true), Promise.resolve({ k: 'chain' })) : shuffleSkin(k, true)),
    skinState: () => ({ k: SKIN.k, a: SKIN.a.slice(), names: LEVELS.map((_, i) => nameOf(i)) }),
    kinds: () => (KINDS ? Object.keys(KINDS).map((k) => ({ k, n: KINDS[k].n, pool: KINDS[k].pool.length })) : null),
    swipe: SWIPE,
    dirOf: (dx, dy, min, ratio) => dirOf(dx, dy, min, ratio),
    floats: () => [...floatBox.querySelectorAll('.float')].map((d) => d.textContent),
    hist: () => G.hist.length,
  };
}
