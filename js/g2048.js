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
import { LEVELS, ROT_ART } from './g2048-art.js';
import { startGameCloud } from './gamecloud.js';

// ------------------------------------------------------------------ 常量
const KEY = {
  best: 'zjtt:g2048:best',          // 全难度最高分（榜单摘要用）
  save: 'zjtt:g2048:save',          // 当前局面
  diff: 'zjtt:g2048:diff',
  rot: 'zjtt:g2048:rot',
  snd: 'zjtt:g2048:snd',
  seen: 'zjtt:g2048:seen',          // 历史合到过的最高块
  gain: 'zjtt:g2048:gain',          // 每难度一次的通关银芯（防反复领）
};
const DIFFS = {
  classic: { n: 4, name: '4×4' },
  wide: { n: 5, name: '5×5' },
  brutal: { n: 3, name: '3×3' },
};
const TOP = LEVELS.length - 1;      // 最后一级的下标（2048）
const UNDO_MAX = 5;
const MANIA_FULL = 100;
const ROT_EVERY = 12;               // 侵蚀模式下每几步落一块蚀
const ROT_SCORE = 40;

const lvOf = (v) => Math.min(TOP, Math.max(0, Math.round(Math.log2(v)) - 1));
const nOf = (i) => LEVELS[Math.min(TOP, i)].n;
const colorOf = (i) => LEVELS[Math.min(TOP, i)].c;

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

// ------------------------------------------------------------------ DOM
const $ = (s) => document.querySelector(s);
const boardEl = $('#board');
const cellsEl = $('#cells');
const tilesEl = $('#tiles');
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
  merge(lv) { tone(196 * Math.pow(2, lv * 0.115), 0.14, { vol: 0.05 - lv * 0.002, to: 196 * Math.pow(2, lv * 0.115) * 1.5 }); },
  spawn() { tone(760, 0.05, { type: 'sine', vol: 0.016 }); },
  bad() { tone(120, 0.14, { type: 'square', vol: 0.03, to: 80 }); },
  forget() { tone(520, 0.18, { type: 'sine', vol: 0.045, to: 180 }); tone(390, 0.22, { type: 'sine', vol: 0.03, to: 130, at: 0.06 }); },
  rot() { tone(90, 0.28, { type: 'sawtooth', vol: 0.05, to: 62 }); },
  win() { [0, 3, 7, 12].forEach((s, i) => tone(392 * Math.pow(2, s / 12), 0.26, { type: 'sine', vol: 0.045, at: i * 0.09 })); },
  over() { [0, -2, -5, -9].forEach((s, i) => tone(330 * Math.pow(2, s / 12), 0.3, { type: 'triangle', vol: 0.05, at: i * 0.12 })); },
  tap() { tone(520, 0.04, { type: 'sine', vol: 0.02 }); },
};

// ------------------------------------------------------------------ 存储
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* 无痕模式 */ } };
const num = (s, d = 0) => { const v = parseInt(s || '', 10); return Number.isFinite(v) ? v : d; };

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
      el.innerHTML = '<div class="face"><img alt="" decoding="async"><span class="v"></span></div>';
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
      img.src = t.rot ? ROT_ART : LEVELS[lv].img;
      face.style.setProperty('--c', t.rot ? 'var(--rot)' : colorOf(lv));
      const label = t.rot ? '蚀' : String(t.v);
      face.querySelector('.v').textContent = label;
      const digits = label.length;
      const fs = Math.max(9, Math.round(cell * (digits <= 1 ? 0.32 : digits === 2 ? 0.29 : digits === 3 ? 0.25 : digits === 4 ? 0.21 : 0.18)));
      face.style.setProperty('--vfs', fs + 'px');
      el.title = t.rot ? '侵蚀：不能移动，紧挨着合成才会被震碎' : `${LEVELS[lv].n}（${t.v}）`;
      // 合并：这一格的值变了 → 弹一下。新落下的块只做「生」的动画，别再弹一次
      if (!isNew && animate) {
        face.classList.remove('pop');
        void face.offsetWidth;
        face.classList.add('pop');
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

// ------------------------------------------------------------------ 一局的生命周期
function newGame(silent) {
  seq = 1;
  G.cells = new Array(slotCount()).fill(null);
  G.score = 0; G.steps = 0; G.mania = 0; G.peak = 2;
  G.undos = UNDO_MAX; G.hist = [];
  G.over = false; G.won = false;
  overEl.hidden = true;
  for (const [, el] of tileEls) el.remove();
  tileEls.clear();
  spawnOne(); spawnOne();
  G.peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
  paint(false);
  updateHud();
  saveGame();
  if (!silent) sfx.tap();
}

function pushUndo() {
  G.hist.push({
    c: G.cells.map((t) => (t ? { v: t.v, r: t.rot ? 1 : 0 } : 0)),
    s: G.score, m: G.mania, st: G.steps, pk: G.peak, w: G.won,
  });
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
  toast('忘却：忘掉了「' + list.map((x) => nOf(lvOf(x.t.v))).join('」「') + '」');
  if (!canMove()) endGame();
}

function checkWin() {
  if (G.won || G.peak < 2048) return;
  G.won = true;
  sfx.win();
  toast('显影完成：祂的神谕。可以继续往上合', 2600);
  const got = lsGet(KEY.gain + ':' + G.diff) === '1';
  if (!got) {
    lsSet(KEY.gain + ':' + G.diff, '1');
    try {
      const cur = Number(JSON.parse(lsGet('zjtt:credits') || '0')) || 0;
      lsSet('zjtt:credits', JSON.stringify(Math.max(0, cur + 30)));
      document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
      setTimeout(() => toast('第一次合到 2048，发 30 银芯', 2400), 900);
    } catch { /* 记账失败不影响游戏 */ }
  }
}

function endGame() {
  G.over = true;
  saveBest();
  saveGame();
  sfx.over();
  const diffName = DIFFS[G.diff].name;
  const rec = num(lsGet(KEY.best + ':' + G.diff));
  const isNew = G.score >= rec && G.score > 0;
  $('#ovk').textContent = G.peak >= 2048 ? '显影到底了' : '这段记忆散了';
  $('#ovs').textContent = G.score;
  $('#ovd').textContent = `最高块「${nOf(lvOf(G.peak))}」 · ${G.steps} 步 · ${diffName}`;
  overEl.hidden = false;
  updateHud();
  if (isNew) setTimeout(() => toast('新纪录：' + G.score + ' 分', 2200), 500);
}

// 一步移动的完整流程。调用方（doMove）负责先压撤销栈——slide 是就地改格子的，
// 压晚了就回不去了。
function act(d) {
  if (G.busy || G.over) return;
  const res = slide(d);
  if (!res.moved) { shake(); sfx.bad(); return; }

  G.score += res.gained;
  G.mania = Math.min(MANIA_FULL, G.mania + res.mania);
  G.steps += 1;

  const peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
  const peakUp = peak > G.peak;
  G.peak = peak;
  if (peakUp) {
    noteSeen(peak);
    if (peak >= 128) toast('显影：' + nOf(lvOf(peak)));
  }

  if (res.merges.length) sfx.merge(lvOf(G.cells[res.merges[0]].v));
  if (res.broken.length) { sfx.rot(); toast('震碎了一块蚀', 1200); }

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
}

// ------------------------------------------------------------------ 交互
function bindKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$('#sheet').hidden) return;      // 显影链面板开着的时候不接方向键
    const k = e.key.toLowerCase();
    const map = { arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd' };
    if (map[k]) { e.preventDefault(); doMove(map[k]); return; }
    if (k === 'z') { e.preventDefault(); undo(); }
    else if (k === 'r') { e.preventDefault(); newGame(); }
    else if (k === 'm') { e.preventDefault(); toggleSound(); }
    else if (k === 'f') { e.preventDefault(); useForget(); }
  });
}

function bindTouch() {
  let sx = 0, sy = 0, active = false;
  boardEl.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; active = true;
  }, { passive: true });
  boardEl.addEventListener('touchmove', (e) => {
    if (!active) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - sx, dy = e.touches[0].clientY - sy;
    if (Math.abs(dx) < 26 && Math.abs(dy) < 26) return;
    active = false;
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    doMove(dir);
  }, { passive: false });
  boardEl.addEventListener('touchend', () => { active = false; }, { passive: true });
  // 鼠标拖拽（桌面也能玩，不用非得按键盘）
  let mx = 0, my = 0, down = false;
  boardEl.addEventListener('mousedown', (e) => { if (e.button !== 0) return; mx = e.clientX; my = e.clientY; down = true; });
  window.addEventListener('mouseup', (e) => {
    if (!down) return;
    down = false;
    const dx = e.clientX - mx, dy = e.clientY - my;
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u'));
  });
}

function doMove(dir) {
  if (document.getElementById('sheet').hidden === false) return;
  pushUndo();
  act(dir);
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
  G.diff = k; G.n = DIFFS[k].n;
  lsSet(KEY.diff, k);
  G.best = num(lsGet(KEY.best + ':' + k));
  buildCells();
  syncDiffButtons();
  newGame(true);
  if (!silent) toast('换成 ' + DIFFS[k].name + ' 棋盘');
}

function setRot(on) {
  G.rot = !!on;
  lsSet(KEY.rot, G.rot ? '1' : '0');
  const b = $('#rot');
  b.classList.toggle('on', G.rot);
  b.setAttribute('aria-pressed', G.rot ? 'true' : 'false');
  b.textContent = G.rot ? '侵蚀 开' : '侵蚀 关';
  if (!G.over) { newGame(true); toast(G.rot ? '侵蚀已开：每 12 步落一块蚀' : '侵蚀已关，重新开局'); }
}

// 显影链面板：见过的点亮，没见过的灰着（剪影比问号更能勾人去合）
function paintChain() {
  const seen = seenMax();
  const box = $('#chain');
  box.replaceChildren();
  for (const l of LEVELS) {
    const got = seen >= l.v;
    const d = document.createElement('div');
    d.className = 'lv' + (got ? ' got' : '');
    d.style.setProperty('--c', l.c);
    d.innerHTML = '<div class="bx"><img alt="" decoding="async"></div><b></b><small></small>';
    d.querySelector('img').src = l.img;
    d.querySelector('b').textContent = l.v;
    d.querySelector('small').textContent = got ? l.n : '未显影';
    box.appendChild(d);
  }
}

function openSheet(open) {
  const s = $('#sheet');
  s.hidden = !open;
  if (open) { paintChain(); sfx.tap(); }
}

// ------------------------------------------------------------------ 启动
function boot() {
  loadPrefs();
  // 先读存档：存档里的棋盘尺寸可能和偏好里的难度不一致时，以存档为准
  const restored = loadGame();
  if (!restored) G.cells = new Array(slotCount()).fill(null);
  buildCells();
  syncDiffButtons();
  // 恢复上次没打完的一局；没有就开新的
  if (restored) {
    paint(false);
    updateHud();
    saveGame();
  } else {
    newGame(true);
  }
  noteSeen(G.peak);

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

  bindTouch();
  bindKeys();
  window.addEventListener('resize', () => { paint(false); });

  const b = document.getElementById('boot');
  if (b) b.remove();

  // 玩过一次再给提示，别一进来就糊一脸
  if (!lsGet('zjtt:g2048:played')) {
    lsSet('zjtt:g2048:played', '1');
    setTimeout(() => toast('同样的两块撞在一起，就往上显影一级', 2400), 500);
    setTimeout(() => toast('狂气攒满可以「忘却」，忘掉最小的两块腾地方', 2600), 3400);
  }
  hintEl.innerHTML = '方向键 / WASD 移动 · <b>Z</b> 回溯 · <b>R</b> 重开';

  startGameCloud('g2048');
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
    act: (d) => { pushUndo(); act(d); },
    set: (arr) => { // 直接摆盘（值数组，-1 表示蚀块），用来测合并 / 判负
      seq = 1;
      G.cells = arr.map((v) => (v === -1 ? mk(0, true) : v ? mk(v) : null));
      G.over = false; G.hist = []; G.score = 0; G.steps = 0; G.mania = 0;
      G.peak = Math.max(...G.cells.filter(Boolean).map((t) => t.v), 2);
      overEl.hidden = true;
      paint(false);
      updateHud();
    },
    canMove: () => canMove(),
    forget: () => useForget(),
    undo: () => undo(),
    diff: (k) => setDiff(k, true),
    rot: (on) => setRot(on),
    state: () => ({ score: G.score, peak: G.peak, over: G.over, n: G.n, mania: G.mania, cells: G.cells.map((t) => (t ? (t.rot ? -1 : t.v) : 0)) }),
  };
}
