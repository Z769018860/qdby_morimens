// lovelive！mori⭐mens！ —— 点按式音游（学园偶像祭的玩法壳 + 《忘却前夜》的唤醒体）。
//
// 结构：
//   js/ll/songs.js    曲目库与芯片改编编曲（级数记号 → 事件表）
//   js/ll/analyze.js  原曲抓点（onset detection）+ 谱面生成
//   js/ll/audio.js    声音：原曲 BufferSource / 芯片前瞻调度 / 五档判定音效
//   js/ll/gen.js      构建生成：上场名册 + 头像（data URI 内联）
//   js/lovelive.js    这里：布局、判定、技能、画布渲染、编队、设置、结算
//
// 布局：上方一个发球点，下方九个击打框。音符（唤醒体的脸）从发球点散开，
// 沿直线飞向各自那一格，压到框里的那一刻点它（长条要按住直到尾音进框）。
// 九个人一队，第 i 格永远交给队伍里的第 i 位，技能全自动发动。
//
// 音源：默认芯片改编（页面内合成，不带版权音源）；也可以导入自己手里的
// 原曲 mp3 —— 解码后按鼓点自动生成谱面，存在本机（IndexedDB）。
//
// 自动化测试：?_test=1 把内部状态挂到 window.__ll；加 &_auto=1 自动 Perfect
// 打完全曲，供无头浏览器核对结算。

import { SONGS, arrange } from './ll/songs.js';
import { Audio } from './ll/audio.js';
import { detectOnsets, chartFromOnsets, chartFromArr, hashStr } from './ll/analyze.js';
import { UNITS } from './ll/gen.js';
import { startGameCloud } from './gamecloud.js';

/* ================================================================ 小工具 */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const mmss = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
const TEST = /[?&]_test=1/.test(location.search);
const AUTO = TEST && /[?&]_auto=1/.test(location.search);
const FINE = window.matchMedia ? window.matchMedia('(pointer:fine)').matches : false;
// 画面特效的时间轴（秒）：和 rAF 的时间戳同源，暂停时也照常走
const wall = () => performance.now() / 1000;

/* ================================================================ 存档 */
const KEY = 'zjtt:lovelive';
const TEAM_MAX = 9;
function loadSave() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
  const s = (v && typeof v === 'object') ? v : {};
  s.best = (s.best && typeof s.best === 'object') ? s.best : {};
  s.team = Array.isArray(s.team) ? s.team.filter((id) => UNITS.some((u) => u.id === id)).slice(0, TEAM_MAX) : [];
  s.tracks = (s.tracks && typeof s.tracks === 'object') ? s.tracks : {};
  s.mute = s.mute ? 1 : 0;
  s.plays = Number(s.plays) || 0;
  s.bestCombo = Number(s.bestCombo) || 0;
  // 手感设置：偏移 / 判定宽松 / 流速 / 两路音量 / 按键提示
  s.offset = clamp(Number(s.offset) || 0, -200, 200);
  s.winMul = clamp(Number(s.winMul) || 1, 0.6, 2);
  s.flow = clamp(Number(s.flow) || 1, 0.6, 1.8);
  s.musVol = s.musVol == null ? 0.7 : clamp(Number(s.musVol), 0, 1);
  s.fxVol = s.fxVol == null ? 0.6 : clamp(Number(s.fxVol), 0, 1);
  s.keys = s.keys == null ? 1 : (s.keys ? 1 : 0);
  return s;
}
const SAVE = loadSave();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* 无痕模式随它去 */ }
}
const bestKey = (songId, diff) => songId + ':' + diff;

/* ================================================================ IndexedDB：本机音源 */
// 只存本机（不上传、不跨设备）：原曲是自己导入的，不存在库里分发给别人。
const DB_NAME = 'll-tracks';
function idbOpen() {
  return new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('t')) r.result.createObjectStore('t'); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('打不开本机音源库'));
  });
}
function idbDo(mode, fn) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('t', mode);
    const st = tx.objectStore('t');
    let out;
    try { out = fn(st); } catch (e) { rej(e); return; }
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  }));
}
const idbGet = (k) => idbDo('readonly', (st) => st.get(k));
const idbSet = (k, v) => idbDo('readwrite', (st) => st.put(v, k));
const idbDel = (k) => idbDo('readwrite', (st) => st.delete(k));

/* ================================================================ 难度 */
// win: Perfect / Great / Good / Bad 的半宽（秒，实际还要乘判定宽松）
// lead: 音符从发球点飞到框里要走几秒（越大越好读）；flow 设置会再乘一次
// gap: 谱面最小间隔；hold/dbl: 长条与双押比例；stam: Miss 扣体力
const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.062, 0.112, 0.162, 0.212], lead: 1.85, gap: 0.46, hold: 0.12, holdCap: 0.10, dbl: 0,    stam: 4.5, pad: 0.20 },
  { k: 'normal', n: 'NORMAL', win: [0.052, 0.098, 0.148, 0.198], lead: 1.55, gap: 0.30, hold: 0.32, holdCap: 0.15, dbl: 0.04, stam: 5.5, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.28, gap: 0.225, hold: 0.44, holdCap: 0.18, dbl: 0.09, stam: 6.5, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.082, 0.125, 0.170], lead: 1.08, gap: 0.175, hold: 0.52, holdCap: 0.20, dbl: 0.13, stam: 7.5, pad: 0.95 },
];
const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];
const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const KEY_LABEL = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

/* ================================================================ DOM 骨架 */
const scr = {
  title: $('#scr-title'), songs: $('#scr-songs'), team: $('#scr-team'),
  set: $('#scr-set'), live: $('#scr-live'), result: $('#scr-result'),
};
function show(name) {
  for (const k of Object.keys(scr)) scr[k].hidden = k !== name;
  G.scr = name;
}

/* ================================================================ 全局状态 */
const G = {
  scr: 'title', song: null, diffK: 'normal', chart: null, chartSrc: 'chip',
  notes: [], ni: 0, di: 0, combo: 0, maxCombo: 0, score: 0,
  cnt: { p: 0, g: 0, go: 0, b: 0, m: 0 },
  accW: 0, stamina: 100, buffs: [], sk: [], banner: null, fx: [], flashes: [],
  holds: {}, holdingLane: -1, running: false, over: false, paused: false, auto: AUTO,
  tickAt: 0, prep: false,
};

const team = () => (SAVE.team.length ? SAVE.team : UNITS.slice(0, TEAM_MAX).map((u) => u.id));
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[0];
const laneUnit = (i) => {
  const t = team();
  return unitById(t[i % t.length]);
};
// gen.js 里的 art 是 data URI 字符串：给 DOM 用；画布要的是 Image 对象
for (const u of UNITS) {
  const im = new Image();
  im.decoding = 'async';
  im.src = u.art;
  u.img = im;
}
const FACE_OK = (u) => u.img && u.img.complete && u.img.naturalWidth > 0;

/* 曲目时间：音频时钟 - 偏移。判定、播放、绘制都用这一个 */
const chartTime = () => Math.max(0, Audio.time() - SAVE.offset / 1000);

/* ================================================================ 技能 */
function initSkills() {
  G.sk = team().map((id) => {
    const u = unitById(id);
    return { u, last: -1e9, cnt: 0, lastCombo: -1, fires: 0 };
  });
  G.buffs = [];
  // start 触发的技能开场就放（只放一次）
  for (const st of G.sk) if (st.u.skill.trig === 'start') fireSkill(st, 0);
}
function buffMul(fx) {
  let m = 1;
  for (const b of G.buffs) if (b.fx === fx) m *= b.val;
  return m;
}
function buffFlag(fx) {
  for (const b of G.buffs) if (b.fx === fx) return true;
  return false;
}
function passSum(fx) {
  let s = 0;
  for (const x of G.sk) if (x.u.pass && x.u.pass[fx]) s += x.u.pass[fx];
  return s;
}
function fireSkill(st, now) {
  const sk = st.u.skill;
  st.fires++;
  if (sk.dur > 0) G.buffs.push({ fx: sk.fx, val: sk.val, until: now + sk.dur, u: st.u });
  else applyInstant(sk, now);
  G.banner = { txt: st.u.n + '「' + sk.n + '」', until: now + 2.2, hue: st.u.hue };
  Audio.fx('skill');
  paintSkillChips(true);
}
function applyInstant(sk, now) {
  if (sk.fx === 'heal') G.stamina = clamp(G.stamina + sk.val, 0, 100);
  if (sk.fx === 'combo') addCombo(sk.val, true);
}
function tickSkills(now) {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'time') {
      if (now - st.last >= sk.need) { st.last = now; fireSkill(st, now); }
    } else if (sk.trig === 'combo') {
      if (G.combo > 0 && G.combo % sk.need === 0 && st.lastCombo !== G.combo) {
        st.lastCombo = G.combo;
        fireSkill(st, now);
      }
    }
  }
  G.buffs = G.buffs.filter((b) => b.until > now);
}
function onPerfect() {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig !== 'perfect') continue;
    st.cnt++;
    if (st.cnt % sk.need === 0) fireSkill(st, chartTime());
  }
}

/* ================================================================ 判定与计分 */
const JW = { p: 1, g: 0.8, go: 0.5, b: 0.2, m: 0 };
const JN = { p: 'PERFECT', g: 'GREAT', go: 'GOOD', b: 'BAD', m: 'MISS' };
const JC = { p: '#ffd76a', g: '#8fd0ff', go: '#9be29b', b: '#c9a0ff', m: '#e8695f' };

// 判定窗口：难度 × 技能加成 × 玩家自己的「判定宽松」
function winMul() {
  return buffMul('judge') * (1 + passSum('judge')) * SAVE.winMul;
}
function windows() {
  const w = diffOf(G.diffK).win, m = winMul();
  return [w[0] * m, w[1] * m, w[2] * m, w[3] * m];
}
function judgeBy(dt) {
  const W = windows();
  const a = Math.abs(dt);
  if (a <= W[0]) return 'p';
  if (a <= W[1]) return 'g';
  if (a <= W[2]) return 'go';
  if (a <= W[3]) return 'b';
  return null;
}
function addCombo(k, silent) {
  G.combo += k;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  if (!silent && G.combo > 0) {
    if (G.combo % 100 === 0) {
      G.stamina = clamp(G.stamina + 6, 0, 100);
      Audio.fx('combo');
    } else if (G.combo % 50 === 0) Audio.fx('combo');
  }
}
function scoreNote(n, j) {
  const comboMul = 1 + Math.min(G.combo, 300) / 100;
  const base = n.kind === 'hold' ? 240 : 300;
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += base * JW[j] * comboMul * sm;
}
function boxOf(lane) { return LAY.boxes[lane] || LAY.boxes[0]; }
function pushFx(lane, j, txt) {
  const b = boxOf(lane);
  G.fx.push({ x: b.x, y: b.y - b.h * 0.35, j, t: wall(), txt: txt == null ? JN[j] : txt });
  if (G.fx.length > 26) G.fx.shift();
  G.flashes[lane] = { t: wall(), j };
}
function judgeNote(n, j) {
  n.judged = true;
  n.hit = true;
  G.cnt[j === 'p' ? 'p' : j === 'g' ? 'g' : j === 'go' ? 'go' : 'b']++;
  G.accW += JW[j];
  scoreNote(n, j);
  if (j === 'p') onPerfect();
  if (j === 'b') G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.55, 0, 100);
  addCombo(1);
  Audio.fx(j, G.combo);
  pushFx(n.lane, j);
}
function missNote(n) {
  if (n.judged) return;
  n.judged = true;
  const now = chartTime();
  G.cnt.m++;
  // 技能优先级：自动救（Miss → Good）> 护盾（不断连不掉血）
  if (buffFlag('auto')) {
    G.cnt.m--; G.cnt.go++;
    G.accW += JW.go;
    scoreNote(n, 'go');
    addCombo(1);
    Audio.fx('go', G.combo);
    pushFx(n.lane, 'go', 'SAVED');
    G.banner = { txt: 'Miss 被救回来了！', until: now + 1.2, hue: 140 };
    return;
  }
  if (buffFlag('guard')) {
    Audio.fx('go');
    pushFx(n.lane, 'go', 'GUARD');
    G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    return;
  }
  G.combo = 0;
  G.stamina = clamp(G.stamina - diffOf(G.diffK).stam, 0, 100);
  for (const st of G.sk) if (st.u.skill.trig === 'miss') fireSkill(st, now);
  Audio.fx('m');
  pushFx(n.lane, 'm');
}
function releaseHold(nt, early) {
  if (!nt.holding) return;
  nt.holding = false;
  if (nt._ptr != null) delete G.holds[nt._ptr];
  const now = chartTime();
  if (early && now < nt.tail - 0.2) {
    nt.broken = true;
    if (!buffFlag('guard')) {
      G.combo = 0;
      G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.7, 0, 100);
      Audio.fx('break');
      pushFx(nt.lane, 'm', '松手了');
    } else {
      Audio.fx('go');
      pushFx(nt.lane, 'go', 'GUARD');
    }
    return;
  }
  // 撑到尾音：补一笔尾分，算一个 Good 的准确率
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += 170 * sm;
  G.accW += JW.go;
  G.cnt.go++;
  addCombo(1);
  Audio.fx('hold');
  pushFx(nt.lane, 'go', '');
}

/* ================================================================ 布局：上单点 → 下九框 */
const LAY = { spawn: { x: 0, y: 0 }, boxes: [], bw: 40, bh: 40 };
function layout() {
  const n = 9;
  const gap = Math.max(4, Math.min(8, W * 0.014));
  const side = Math.max(8, W * 0.02);
  const bw = Math.min(76, (W - side * 2 - gap * (n - 1)) / n);
  const total = bw * n + gap * (n - 1);
  const x0 = (W - total) / 2 + bw / 2;
  const baseY = H - Math.max(58, Math.min(88, H * 0.155));
  LAY.bw = bw;
  LAY.bh = bw;
  LAY.spawn = { x: W / 2, y: Math.max(30, H * 0.085) };
  LAY.boxes.length = 0;
  for (let i = 0; i < n; i++) {
    const sag = (1 - Math.pow((i - 4) / 4, 2)) * Math.min(16, H * 0.022);
    LAY.boxes.push({ x: x0 + i * (bw + gap), y: baseY + sag, h: bw, w: bw, key: KEY_LABEL[i] });
  }
}
// 音符在某时刻的位置：k=0 在发球点，k=1 在框里
function notePos(n, now, le) {
  const b = boxOf(n.lane);
  const k = clamp(1 - (n.t - now) / le, -0.18, 1.05);
  return {
    x: LAY.spawn.x + (b.x - LAY.spawn.x) * k,
    y: LAY.spawn.y + (b.y - LAY.spawn.y) * k,
    k,
  };
}
function leadEff() {
  return diffOf(G.diffK).lead * SAVE.flow;
}

/* ================================================================ 输入 */
function tapLane(lane, ptr) {
  if (!G.running || G.paused) return;
  const now = chartTime();
  const W4 = windows()[3];
  let best = null, bestAbs = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.lane !== lane || n.judged || (n.kind === 'hold' && n.holding)) continue;
    const a = Math.abs(n.t - now);
    if (a > W4) continue;
    if (a < bestAbs) { bestAbs = a; best = n; }
  }
  if (!best) return;
  pressNote(best, ptr);
}
function tapNear(x, y) {
  if (!G.running || G.paused) return;
  const now = chartTime();
  const W4 = windows()[3];
  const le = leadEff();
  let best = null, bestCost = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.judged || (n.kind === 'hold' && n.holding)) continue;
    const p = notePos(n, now, le);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > LAY.bw * 0.95) continue;
    const cost = Math.abs(n.t - now) * 2 + d / 300;
    if (cost < bestCost) { bestCost = cost; best = n; }
  }
  if (best) pressNote(best, null);
}
function pressNote(n, ptr) {
  const now = chartTime();
  const j = judgeBy(n.t - now);
  if (!j) return;
  if (n.kind === 'hold') {
    n.holding = true;
    if (ptr != null) { n._ptr = ptr; G.holds[ptr] = n; }
    Audio.fx('holdstart');
  }
  judgeNote(n, j);
}
function releasePtr(ptr) {
  const n = G.holds[ptr];
  if (n) { delete G.holds[ptr]; releaseHold(n, true); }
}
function laneAt(x, y) {
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    if (Math.abs(x - b.x) <= b.w / 2 + 3 && Math.abs(y - b.y) <= b.h / 2 + 8) return i;
  }
  return -1;
}

/* ================================================================ 画布 */
const cv = $('#cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
function fit() {
  const box = $('#stage');
  if (!box) return;
  const b = box.getBoundingClientRect();
  W = Math.max(260, b.width);
  H = Math.max(320, b.height);
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  layout();
}
window.addEventListener('resize', () => fit());
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('#stage'));
document.addEventListener('zj:orient', () => setTimeout(fit, 120));

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const b = cv.getBoundingClientRect();
  const x = e.clientX - b.left, y = e.clientY - b.top;
  const lane = laneAt(x, y);
  if (lane >= 0) tapLane(lane, 'p' + e.pointerId);
  else tapNear(x, y);
  cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
}, { passive: false });
window.addEventListener('pointerup', (e) => releasePtr('p' + e.pointerId));
window.addEventListener('pointercancel', (e) => releasePtr('p' + e.pointerId));
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  const lane = KEYS.indexOf(k);
  if (lane >= 0) {
    e.preventDefault();
    if (e.repeat) return;
    tapLane(lane, 'k' + lane);
    return;
  }
  if (e.key === 'Escape' && G.running) togglePause();
});
window.addEventListener('keyup', (e) => {
  const lane = KEYS.indexOf(e.key.toLowerCase());
  if (lane >= 0) releasePtr('k' + lane);
});

/* ================================================================ 渲染 */
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function draw(ts) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const clock = wall();
  const now = G.running ? chartTime() : 0;
  const le = leadEff();
  const beat = (G.chart && G.chart.arr) ? (now / G.chart.arr.spb) % 1 : (now * 2) % 1;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e17');
  bg.addColorStop(0.5, '#101527');
  bg.addColorStop(1, '#0a0d15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 发球点的光柱：整块场地的视觉起点
  const sp = LAY.spawn;
  const halo = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, Math.max(W * 0.5, 180));
  halo.addColorStop(0, 'rgba(240,120,180,0.20)');
  halo.addColorStop(0.45, 'rgba(140,120,255,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, W, H);

  // 轨道引导线
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const g = ctx.createLinearGradient(sp.x, sp.y, b.x, b.y);
    g.addColorStop(0, 'hsla(' + u.hue + ',70%,70%,0.10)');
    g.addColorStop(1, 'hsla(' + u.hue + ',70%,70%,0.03)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sp.x, sp.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  // 发球点
  const pulse = 1 + Math.max(0, 0.5 - beat) * 0.12;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(12, LAY.bw * 0.36) * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(240,120,180,0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,158,203,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(4, LAY.bw * 0.1), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,190,220,0.9)';
  ctx.fill();

  // 九个击打框
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const fl = G.flashes[i];
    const hitA = fl ? clamp(1 - (clock - fl.t) / 0.26, 0, 1) : 0;
    const press = G.holdingLane === i ? 1 : 0;
    const r = b.w / 2;
    // 框体
    roundRect(b.x - r, b.y - r, b.w, b.h, 10);
    ctx.fillStyle = 'rgba(18,22,38,0.92)';
    ctx.fill();
    ctx.lineWidth = 2 + press * 1.5;
    ctx.strokeStyle = 'hsla(' + u.hue + ',80%,72%,' + (0.42 + press * 0.45) + ')';
    ctx.stroke();
    // 头像
    ctx.save();
    ctx.beginPath();
    const ir = r - 3.5;
    ctx.arc(b.x, b.y, ir, 0, Math.PI * 2);
    ctx.clip();
    if (FACE_OK(u)) ctx.drawImage(u.img, b.x - ir, b.y - ir, ir * 2, ir * 2);
    ctx.restore();
    // 命中闪光
    if (hitA > 0) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, ir + 3 + hitA * 9, 0, Math.PI * 2);
      ctx.globalAlpha = hitA * 0.85;
      ctx.strokeStyle = JC[fl.j];
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // 键位提示
    if (SAVE.keys) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 ' + Math.round(Math.min(13, b.w * 0.32)) + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
      ctx.fillStyle = 'rgba(190,200,225,0.55)';
      ctx.fillText(KEY_LABEL[i], b.x, b.y + r + 11);
      ctx.textBaseline = 'alphabetic';
    }
  }

  // 画到哪儿：已经在框里结算完的音符不用再画，但按住中的长条要留着
  while (G.di < G.notes.length && G.notes[G.di].judged && !G.notes[G.di].holding) G.di++;

  // 长条：先画轨道粗线，再画音符头
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
    if (n.kind !== 'hold') continue;
    const b = LAY.boxes[n.lane];
    const hp = n.holding ? { x: b.x, y: b.y } : notePos(n, now, le);
    const tp = notePos({ lane: n.lane, t: n.tail }, now, le);
    const u = laneUnit(n.lane);
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.strokeStyle = n.broken ? 'rgba(150,150,165,0.22)' : 'hsla(' + u.hue + ',85%,72%,0.5)';
    ctx.lineWidth = LAY.bw * 0.44;
    ctx.lineCap = 'round';
    ctx.stroke();
    if (!n.holding && !n.broken) {
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, LAY.bw * 0.24, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + u.hue + ',85%,78%,0.55)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // 音符头
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
    const u = laneUnit(n.lane);
    const p = n.holding ? { x: LAY.boxes[n.lane].x, y: LAY.boxes[n.lane].y - LAY.bh * 0.42 } : notePos(n, now, le);
    const rr = LAY.bw * 0.36 + (n.s || 0.5) * LAY.bw * 0.06;
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
    ctx.fillStyle = '#141a2c';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'hsl(' + u.hue + ',88%,74%)';
    ctx.stroke();
    ctx.clip();
    if (FACE_OK(u)) ctx.drawImage(u.img, p.x - rr, p.y - rr, rr * 2, rr * 2);
    ctx.restore();
    if (n.kind === 'hold' && !n.holding) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + u.hue + ',92%,82%,0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  // 判定字与扩散圈
  for (const f of G.fx) {
    const age = clock - f.t;
    if (age > 0.55) continue;
    const a = 1 - age / 0.55;
    ctx.globalAlpha = a;
    if (f.txt) {
      ctx.textAlign = 'center';
      ctx.font = '800 ' + Math.round(Math.min(16, LAY.bw * 0.46)) + 'px system-ui,sans-serif';
      ctx.fillStyle = JC[f.j];
      ctx.fillText(f.txt, f.x, f.y - 8 - age * 42);
    }
    ctx.beginPath();
    ctx.arc(f.x, f.y + LAY.bh * 0.3, LAY.bw * (0.4 + age * 1.6), 0, Math.PI * 2);
    ctx.strokeStyle = JC[f.j];
    ctx.lineWidth = 2.5 * a;
    ctx.globalAlpha = a * 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  while (G.fx.length && clock - G.fx[0].t > 0.55) G.fx.shift();

  // 连击
  if (G.combo >= 2) {
    const cy = H * 0.42;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,244,255,0.9)';
    ctx.font = '900 ' + Math.round(Math.min(64, H * 0.1)) + 'px system-ui,sans-serif';
    ctx.fillText(String(G.combo), W / 2, cy);
    ctx.fillStyle = 'rgba(240,120,180,0.7)';
    ctx.font = '700 ' + Math.round(Math.min(14, H * 0.024)) + 'px system-ui,sans-serif';
    ctx.fillText('COMBO', W / 2, cy + Math.min(34, H * 0.058));
    ctx.textBaseline = 'alphabetic';
  }
}

/* ================================================================ 主循环 */
function loop(ts) {
  requestAnimationFrame(loop);
  if (!G.running) { if (G.scr === 'live') draw(ts / 1000); return; }
  const t = ts / 1000;
  draw(t);
  if (G.paused) return;
  const now = chartTime();
  G.lastNow = now;
  // HUD
  $('#live-score').textContent = fmt(G.score);
  $('#live-combo').textContent = G.combo > 0 ? G.combo + ' 连击' : '—';
  const stEl = $('#live-stam');
  stEl.style.width = G.stamina + '%';
  stEl.parentElement.classList.toggle('low', G.stamina <= 30);
  const pr = clamp(now / (G.chart ? G.chart.dur : 1), 0, 1);
  $('#live-prog').style.width = (pr * 100) + '%';
  if (now > (G.tickAt || 0)) {
    G.tickAt = now + 0.25;
    tickSkills(now);
    paintSkillChips(false);
    const bEl = $('#live-banner');
    if (G.banner && now > G.banner.until) G.banner = null;
    bEl.textContent = G.banner ? G.banner.txt : '';
    bEl.style.opacity = G.banner ? 1 : 0;
    if (G.banner) bEl.style.borderColor = 'hsla(' + G.banner.hue + ',80%,70%,0.6)';
  }
  // 按住中的长条撑到尾音
  for (const k of Object.keys(G.holds)) {
    const hn = G.holds[k];
    if (hn && hn.holding && now >= hn.tail) releaseHold(hn, false);
  }
  G.holdingLane = -1;
  for (const k of Object.keys(G.holds)) {
    const hn = G.holds[k];
    if (hn && hn.holding) { G.holdingLane = hn.lane; break; }
  }
  // 过点判定
  const W4 = windows()[3];
  while (G.ni < G.notes.length) {
    const n = G.notes[G.ni];
    if (G.auto && !n.judged && n.t <= now) { autoHit(n, now); continue; }
    if (!n.judged) {
      if (n.t < now - W4) { missNote(n); continue; }
      break;
    }
    G.ni++;                       // 长条还在按住：头已经判过了，尾音交给 G.holds 收
  }
  if (G.stamina <= 0) { finish(true); return; }
  if (G.chart && now > G.chart.dur) finish(false);
}
function autoHit(n, now) {
  if (n.kind === 'hold') {
    n.holding = true;
    const j = judgeBy(n.t - now) || 'p';
    judgeNote(n, j);
    n.holding = false;
    // 自动模式直接算撑满
    const sm = buffMul('score') * (1 + passSum('score'));
    G.score += 170 * sm;
    G.accW += JW.go; G.cnt.go++;
    addCombo(1);
  } else {
    judgeNote(n, judgeBy(n.t - now) || 'p');
  }
  G.ni++;
}
requestAnimationFrame(loop);

/* ================================================================ 技能条 UI */
function paintSkillChips(force) {
  const now = chartTime();
  const box = $('#skills');
  if (force || box.childNodes.length !== G.sk.length) {
    box.textContent = '';
    for (const st of G.sk) {
      const el = document.createElement('div');
      el.className = 'skill';
      el.style.setProperty('--h', st.u.hue);
      el.innerHTML = '<img alt="" src="' + st.u.art + '"><i class="gauge"><b></b></i>';
      el.title = st.u.n + '「' + st.u.skill.n + '」\n' + st.u.skill.txt;
      box.appendChild(el);
    }
  }
  const kids = box.childNodes;
  for (let i = 0; i < G.sk.length; i++) {
    const st = G.sk[i], el = kids[i];
    if (!el) continue;
    const sk = st.u.skill;
    let fr = 1;
    if (sk.trig === 'time') fr = clamp((now - st.last) / sk.need, 0, 1);
    else if (sk.trig === 'combo') fr = G.combo > 0 ? (G.combo % sk.need) / sk.need : 0;
    else if (sk.trig === 'perfect') fr = (st.cnt % sk.need) / sk.need;
    else if (sk.trig === 'start') fr = 1;
    el.querySelector('.gauge b').style.width = (fr * 100) + '%';
    el.classList.toggle('ready', fr >= 1);
  }
}

/* ================================================================ 音源准备 */
const TRACK_CACHE = new Map();
async function prepareTrack(songId) {
  if (TRACK_CACHE.has(songId)) return TRACK_CACHE.get(songId);
  const rec = await idbGet(songId).catch(() => null);
  if (!rec || !rec.data) return null;
  const buffer = await Audio.decode(rec.data.slice(0));
  const onsets = (rec.onsets || []).map((p) => ({ t: p[0], s: p[1] }));
  const v = { buffer, onsets, name: rec.name, dur: buffer.duration };
  TRACK_CACHE.set(songId, v);
  return v;
}
async function buildChart(song, diffK, track) {
  const D = diffOf(diffK);
  const seed = hashStr(song.id + ':' + diffK);
  if (track && track.buffer) {
    let on = track.onsets;
    if (!on || !on.length) on = detectOnsets(track.buffer);
    const c = chartFromOnsets(on, track.buffer.duration, D, seed);
    c.arr = null;
    return c;
  }
  const arr = arrange(song);
  const c = chartFromArr(arr, D, seed);
  c.arr = arr;
  return c;
}

/* ================================================================ 开局 / 暂停 / 结算 */
async function startLive() {
  if (G.prep) return;
  const song = G.song || SONGS[0];
  G.song = song;
  const D = diffOf(G.diffK);
  G.prep = true;
  const goBtn = $('#team-go');
  if (goBtn) { goBtn.disabled = true; goBtn.textContent = '载入音源…'; }
  let track = null;
  try { track = await prepareTrack(song.id); } catch (e) { track = null; }
  let chart;
  try { chart = await buildChart(song, G.diffK, track); }
  catch (e) { chart = await buildChart(song, G.diffK, null); }
  G.prep = false;
  if (goBtn) { goBtn.disabled = false; goBtn.textContent = '上场！'; }

  G.chart = chart;
  G.chartSrc = chart.src;
  G.notes = chart.notes;
  G.ni = 0;
  G.holdTotal = chart.notes.reduce((a, n) => a + (n.kind === 'hold' ? 1 : 0), 0);
  G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.cnt = { p: 0, g: 0, go: 0, b: 0, m: 0 };
  G.accW = 0; G.stamina = 100; G.fx = []; G.flashes = []; G.holds = {};
  G.over = false; G.paused = false; G.banner = null; G.tickAt = 0;
  G.di = 0; G.holdingLane = -1;
  Audio.setMute(!!SAVE.mute);
  Audio.setVol(SAVE.musVol, SAVE.fxVol);
  if (track && track.buffer) Audio.playBuffer(track.buffer, 0);
  else Audio.playChip(chart.arr, song.wave);
  G.running = true;
  show('live');
  $('#live-song').textContent = song.n;
  $('#live-diff').textContent = D.n + (track ? ' · 原曲' : ' · 芯片改编');
  $('#live-score').textContent = '0';
  $('#live-combo').textContent = '—';
  $('#live-banner').textContent = '';
  fit();
  initSkills();
  paintSkillChips(true);
}
function togglePause() {
  if (!G.running) return;
  G.paused = !G.paused;
  $('#pauseDlg').hidden = !G.paused;
  if (G.paused) Audio.suspend(); else Audio.resume();
}
function finish(failed) {
  if (G.over) return;
  G.over = true; G.running = false;
  Audio.stop();
  // 长条尾音占半个判定位：满分时 accW 恰好等于这个分母（头 1.0 + 尾 0.5）
  const total = G.notes.length + (G.holdTotal || 0) * 0.5;
  const acc = total ? G.accW / total : 0;
  const ap = total > 0 && G.cnt.p === total;
  const fc = !failed && G.cnt.m === 0 && G.cnt.b === 0;
  const rank = failed ? 'F' : acc >= 0.985 ? 'SSS' : acc >= 0.945 ? 'SS' : acc >= 0.90 ? 'S'
    : acc >= 0.82 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.60 ? 'C' : 'D';
  SAVE.plays++;
  if (G.maxCombo > SAVE.bestCombo) SAVE.bestCombo = G.maxCombo;
  const bk = bestKey(G.song.id, G.diffK);
  const isBest = (Number(SAVE.best[bk]) || 0) < Math.round(G.score);
  if (isBest) SAVE.best[bk] = Math.round(G.score);
  persist();
  $('#res-rank').textContent = rank;
  $('#res-title').textContent = failed ? '体力见底，Live 中断…' : (ap ? 'ALL PERFECT！' : fc ? 'FULL COMBO！' : 'Live 结束');
  $('#res-song').textContent = G.song.n + ' · ' + diffOf(G.diffK).n + (G.chartSrc === 'audio' ? ' · 原曲' : '');
  $('#res-score').textContent = fmt(G.score);
  $('#res-acc').textContent = (acc * 100).toFixed(2) + '%';
  $('#res-combo').textContent = String(G.maxCombo);
  $('#res-notes').textContent = String(G.notes.length);
  $('#res-best').textContent = isBest ? '★ 新纪录' : '最高 ' + fmt(SAVE.best[bk] || 0);
  $('#res-judge').innerHTML = ['p', 'g', 'go', 'b', 'm']
    .map((k) => '<li><span style="color:' + JC[k] + '">' + JN[k] + '</span><b>' + G.cnt[k] + '</b></li>').join('');
  $('#res-skills').innerHTML = G.sk.map((st) => (
    '<li style="--h:' + st.u.hue + '"><img src="' + st.u.art + '" alt=""><span>' + esc(st.u.n)
    + '「' + esc(st.u.skill.n) + '」</span><b>' + st.fires + ' 次</b></li>'
  )).join('');
  show('result');
  renderBest();
}

/* ================================================================ 选曲 */
function trackInfo(songId) {
  return SAVE.tracks[songId] || null;
}
function renderSongs() {
  const box = $('#song-list');
  box.textContent = '';
  for (const s of SONGS) {
    const t = trackInfo(s.id);
    const card = document.createElement('article');
    card.className = 'song';
    const diffs = DIFFS.map((d) => {
      const b = Number(SAVE.best[bestKey(s.id, d.k)]) || 0;
      return '<button type="button" class="df' + (d.k === G.diffK ? ' on' : '') + '" data-s="' + s.id + '" data-d="' + d.k + '">'
        + '<b>' + d.n + '</b><span>' + (b ? fmt(b) : '·—·') + '</span></button>';
    }).join('');
    card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
      + '<span class="bpm">' + s.bpm + ' BPM</span></div>'
      + '<div class="src' + (t ? ' on' : '') + '">' + (t
        ? '♪ 原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
        : '♪ 芯片改编（页面内合成）') + '</div>'
      + '<div class="dfs">' + diffs + '</div>';
    box.appendChild(card);
  }
  box.onclick = (e) => {
    const b = e.target.closest('button.df');
    if (!b) return;
    G.diffK = b.dataset.d;
    G.song = SONGS.find((x) => x.id === b.dataset.s);
    openTeam();
  };
}

/* ================================================================ 编队（九人） */
let teamSel = [];
function openTeam() {
  teamSel = team().slice(0, TEAM_MAX);
  $('#team-song').textContent = G.song ? (G.song.n + ' · ' + diffOf(G.diffK).n) : '';
  renderTeam();
  show('team');
}
function renderTeam() {
  const grid = $('#unit-grid');
  grid.textContent = '';
  for (const u of UNITS) {
    const idx = teamSel.indexOf(u.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'unit' + (idx >= 0 ? ' on' : '');
    el.style.setProperty('--h', u.hue);
    const ps = (u.pass && u.pass.score) ? ('得分 +' + Math.round(u.pass.score * 100) + '%')
      : (u.pass && u.pass.judge) ? ('判定 +' + Math.round(u.pass.judge * 100) + '%') : '—';
    el.innerHTML = '<span class="uimg"><img src="' + u.art + '" alt="" loading="lazy"></span>'
      + '<b>' + esc(u.n) + '</b>'
      + (idx >= 0 ? '<i class="ord">' + (idx + 1) + '</i>' : '')
      + '<span class="sk"><em>自动</em>' + esc(u.skill.n) + '</span>'
      + '<span class="stxt">' + esc(u.skill.txt) + '</span>'
      + '<span class="pas">' + esc(ps) + '</span>';
    el.onclick = () => {
      const i = teamSel.indexOf(u.id);
      if (i >= 0) teamSel.splice(i, 1);
      else if (teamSel.length >= TEAM_MAX) return flash('#team-tip', '九格已经满了，先取消一位');
      else teamSel.push(u.id);
      SAVE.team = teamSel.slice();
      persist();
      renderTeam();
    };
    grid.appendChild(el);
  }
  const box = $('#team-pick');
  let html = '';
  for (let i = 0; i < TEAM_MAX; i++) {
    const id = teamSel[i];
    if (id) {
      const u = unitById(id);
      html += '<span class="pick" style="--h:' + u.hue + '" title="' + esc(u.n) + '"><img src="' + u.art + '" alt="">'
        + '<em>' + KEY_LABEL[i] + '</em></span>';
    } else {
      html += '<span class="pick empty"><em>' + KEY_LABEL[i] + '</em></span>';
    }
  }
  box.innerHTML = html;
}

/* ================================================================ 设置 */
function paintSet() {
  $('#set-offset').value = String(SAVE.offset);
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  $('#set-mus').value = String(Math.round(SAVE.musVol * 100));
  $('#set-fx').value = String(Math.round(SAVE.fxVol * 100));
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  $('#set-flow').value = String(SAVE.flow);
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  $$('#set-win button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === SAVE.winMul));
  $$('#set-keys button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.keys));
  renderTrackList();
}
function renderTrackList() {
  const box = $('#set-tracks');
  box.innerHTML = '';
  for (const s of SONGS) {
    const t = trackInfo(s.id);
    const row = document.createElement('div');
    row.className = 'trk' + (t ? ' on' : '');
    row.innerHTML = '<div class="ti"><b>' + esc(s.n) + '</b><span>' + (t
      ? '原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
      : '芯片改编 · ' + mmss(arrange(s).dur)) + '</span></div>'
      + '<div class="ta">' + (t ? '<button type="button" data-clear="' + s.id + '">清除</button>' : '')
      + '<button type="button" data-pick="' + s.id + '">' + (t ? '换一个' : '导入原曲') + '</button></div>';
    box.appendChild(row);
  }
}
async function importTrack(songId, file) {
  const status = $('#set-status');
  status.textContent = '正在读取「' + file.name + '」…';
  status.classList.remove('err');
  try {
    const raw = await file.arrayBuffer();
    const ac = Audio.ensure();
    if (!ac) throw new Error('这个浏览器没有 WebAudio，放不了原曲');
    status.textContent = '正在解码…（大文件要等几秒）';
    await new Promise((r) => setTimeout(r, 30));
    const buffer = await Audio.decode(raw.slice(0));
    status.textContent = '正在抓鼓点…（' + mmss(buffer.duration) + '）';
    await new Promise((r) => setTimeout(r, 30));
    const onsets = detectOnsets(buffer);
    const flat = onsets.map((p) => [+p.t.toFixed(3), +p.s.toFixed(2)]);
    await idbSet(songId, { name: file.name, data: raw, onsets: flat, dur: buffer.duration });
    TRACK_CACHE.set(songId, { buffer, onsets, name: file.name, dur: buffer.duration });
    SAVE.tracks[songId] = { name: file.name, dur: buffer.duration, notes: onsets.length };
    persist();
    status.textContent = '好了：' + mmss(buffer.duration) + '，抓到 ' + onsets.length + ' 个重音。谱面会跟着这一版走。';
    renderTrackList();
    renderSongs();
  } catch (e) {
    status.textContent = '没成功：' + (e && e.message ? e.message : '这个文件解不开（换个 mp3 / m4a 试试）');
    status.classList.add('err');
  }
}

/* ================================================================ 首屏 */
function renderBest() {
  let played = 0, bestScore = 0;
  for (const k of Object.keys(SAVE.best)) {
    played++;
    bestScore = Math.max(bestScore, Number(SAVE.best[k]) || 0);
  }
  $('#title-best').textContent = played
    ? '玩过 ' + played + ' 张谱 · 最高分 ' + fmt(bestScore) + ' · 最长连击 ' + fmt(SAVE.bestCombo)
    : '还没玩过——选首歌，带上九位唤醒体试试？';
  const n = Object.keys(SAVE.tracks).length;
  $('#title-src').textContent = n ? ('已导入 ' + n + ' 首原曲') : '音源：芯片改编（可导入原曲）';
}

/* ================================================================ 接线 */
$('#btn-play').onclick = () => { renderSongs(); show('songs'); };
$('#btn-team').onclick = () => { G.song = G.song || SONGS[0]; openTeam(); };
$('#btn-set').onclick = () => { paintSet(); show('set'); };
$('#btn-help').onclick = () => {
  const d = $('#helpDlg');
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
};
$('#songs-back').onclick = () => { show('title'); renderBest(); };
$('#songs-set').onclick = () => { paintSet(); show('set'); };
$('#team-back').onclick = () => { renderSongs(); show('songs'); };
$('#set-back').onclick = () => { show('title'); renderBest(); };
$('#team-go').onclick = () => {
  if (!teamSel.length) return flash('#team-tip', '至少带一位上场');
  if (teamSel.length !== TEAM_MAX) flash('#team-tip', '九格没满也能打，但空着的格子没人接');
  startLive();
};
$('#live-pause').onclick = () => togglePause();
$('#pause-resume').onclick = () => togglePause();
$('#pause-retry').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; Audio.resume();
  G.running = false; G.over = true; Audio.stop();
  startLive();
};
$('#pause-quit').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; G.running = false; G.over = true; Audio.stop();
  renderSongs(); show('songs');
};
$('#res-retry').onclick = () => startLive();
$('#res-songs').onclick = () => { renderSongs(); show('songs'); };
$('#res-home').onclick = () => { show('title'); renderBest(); };
$('#mute').onclick = () => {
  SAVE.mute = SAVE.mute ? 0 : 1;
  persist();
  Audio.setMute(!!SAVE.mute);
  $('#mute').classList.toggle('off', !!SAVE.mute);
};
$('#mute').classList.toggle('off', !!SAVE.mute);

// 设置项
$('#set-offset').oninput = (e) => {
  SAVE.offset = Number(e.target.value) || 0;
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  persist();
};
$$('#set-win button').forEach((b) => {
  b.onclick = () => {
    SAVE.winMul = Number(b.dataset.v) || 1;
    persist();
    $$('#set-win button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-keys button').forEach((b) => {
  b.onclick = () => {
    SAVE.keys = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-keys button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$('#set-flow').oninput = (e) => {
  SAVE.flow = Number(e.target.value) || 1;
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  persist();
};
$('#set-mus').oninput = (e) => {
  SAVE.musVol = (Number(e.target.value) || 0) / 100;
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  Audio.setVol(SAVE.musVol, null);
  persist();
};
$('#set-fx').oninput = (e) => {
  SAVE.fxVol = (Number(e.target.value) || 0) / 100;
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  Audio.setVol(null, SAVE.fxVol);
  persist();
  Audio.fx('p');
};
let pendingSong = null;
$('#set-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f || !pendingSong) return;
  importTrack(pendingSong, f);
  e.target.value = '';
});
$('#set-tracks').onclick = (e) => {
  const pick = e.target.closest('[data-pick]');
  const clr = e.target.closest('[data-clear]');
  if (pick) {
    pendingSong = pick.dataset.pick;
    const inp = $('#set-file');
    inp.accept = 'audio/*';
    inp.click();
    return;
  }
  if (clr) {
    const id = clr.dataset.clear;
    idbDel(id).catch(() => {});
    TRACK_CACHE.delete(id);
    delete SAVE.tracks[id];
    persist();
    $('#set-status').textContent = '已清除，这首歌回到芯片改编。';
    renderTrackList();
    renderSongs();
  }
};

/* ================================================================ 测试钩子 */
if (TEST) {
  window.__ll = {
    G, SAVE, UNITS, SONGS, DIFFS, LAY, KEYS, startLive, finish, buildChart, show,
    renderSongs, openTeam, renderTeam, paintSet, importTrack, prepareTrack,
    tapLane, tapNear, notePos, leadEff, windows, judgeBy, chartTime,
    setDiff: (k) => { G.diffK = k; },
    pickSong: (id) => { G.song = SONGS.find((x) => x.id === id) || SONGS[0]; },
    setTeam: (ids) => { SAVE.team = ids.slice(0, TEAM_MAX); persist(); },
    pickTrackFile: (id) => { pendingSong = id; },
    audio: Audio,
    setSetting: (k, v) => { SAVE[k] = v; persist(); },
  };
}

/* ================================================================ 启动 */
renderBest();
Audio.setMute(!!SAVE.mute);
Audio.setVol(SAVE.musVol, SAVE.fxVol);
startGameCloud('lovelive');
fit();
