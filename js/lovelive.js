// lovelive！mori⭐mens！ —— 点按式音游（学园偶像祭的玩法壳 + 《忘却前夜》的唤醒体）。
//
// 结构：
//   js/ll/songs.js  曲目库与编曲（级数记号 → 事件表）
//   js/ll/audio.js  WebAudio 合成引擎（音乐 + 音效，页面不带音频文件）
//   js/ll/gen.js    构建生成：上场名册 + 头像（data URI 内联）
//   js/lovelive.js  这里：谱面生成、判定、技能、画布渲染、结算
//
// 玩法（SIF 式）：九个站位围着判定环排成一道弧，音符从站位沿半径收进来，
// 到环上那一刻点它（长条要按住直到尾音）。三位唤醒体上场，各带一个
// 自动发动的技能（判定放大 / 加分 / 护盾 / 回血 / 救 Miss / 加连击 / 减速）。
//
// 自动化测试：?_test=1 把内部状态挂到 window.__ll；加 &_auto=1 自动 Perfect
// 打完全曲，供无头浏览器核对结算。

import { SONGS, arrange } from './ll/songs.js';
import { Live } from './ll/audio.js';
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
const TEST = /[?&]_test=1/.test(location.search);
const AUTO = TEST && /[?&]_auto=1/.test(location.search);

/* ================================================================ 存档 */
const KEY = 'zjtt:lovelive';
function loadSave() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
  const s = (v && typeof v === 'object') ? v : {};
  s.best = (s.best && typeof s.best === 'object') ? s.best : {};
  s.team = Array.isArray(s.team) ? s.team.filter((id) => UNITS.some((u) => u.id === id)) : [];
  s.mute = s.mute ? 1 : 0;
  s.plays = Number(s.plays) || 0;
  s.bestCombo = Number(s.bestCombo) || 0;
  return s;
}
const SAVE = loadSave();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* 无痕模式随它去 */ }
}
const bestKey = (songId, diff) => songId + ':' + diff;

/* ================================================================ 难度 */
// win: Perfect / Great / Good / Bad 的半宽（秒）；lead: 音符飞行秒数；
// gap: 谱面最小间隔；hold/dbl: 长条与双押比例；stam: Miss 扣血。
const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.058, 0.105, 0.155, 0.205], lead: 1.70, gap: 0.44, hold: 0,    dbl: 0,    stam: 5, pad: 0.22 },
  { k: 'normal', n: 'NORMAL', win: [0.050, 0.095, 0.145, 0.195], lead: 1.40, gap: 0.30, hold: 0.35, dbl: 0.05, stam: 6, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.15, gap: 0.22, hold: 0.50, dbl: 0.10, stam: 7, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.085, 0.125, 0.170], lead: 0.95, gap: 0.165, hold: 0.55, dbl: 0.14, stam: 8, pad: 0.95 },
];
const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];

/* ================================================================ 谱面 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 由编曲事件表生成谱面：候选点 = 旋律音 + 按难度补的鼓点，
// 按最小间隔筛一遍，再分 lane、按概率把长音变长条、把小节头变双押。
function makeChart(song, diffK) {
  const D = diffOf(diffK);
  const arr = arrange(song);
  const lead = D.lead;
  const rnd = mulberry32(0x9e3779b9 ^ (song.id.charCodeAt(0) << 8) ^ (diffK.charCodeAt(0) << 16));
  // 候选：旋律全收；pad 比例的鼓点（kick/snare）补进来
  const cand = arr.notes.map((n) => ({ t: n.t, d: n.d, e: n.e }));
  if (D.pad > 0) {
    for (const dr of arr.drums) {
      if ((dr.k === 'k' || dr.k === 's') && rnd() < D.pad) cand.push({ t: dr.t, d: 0, e: 2 });
    }
  }
  cand.sort((a, b) => a.t - b.t);
  const notes = [];
  let last = -9;
  for (const c of cand) {
    if (c.t - last < D.gap - 1e-4) continue;
    if (c.t < lead * 0.5) continue;            // 太早的留给开场，别一上来就砸脸
    last = c.t;
    notes.push({ t: c.t + lead, d: c.d, e: c.e, lane: 4, kind: 'tap', tail: 0 });
  }
  // lane 游走：别连续四五个同 lane，也别跳得读不过来
  let lane = 2 + Math.floor(rnd() * 5), rep = 0;
  for (const n of notes) {
    if (rep >= 2 || rnd() < 0.82) {
      let step = 0;
      const r = rnd();
      if (r < 0.30) step = -2; else if (r < 0.60) step = -1;
      else if (r < 0.90) step = 1; else step = 2;
      const nl = clamp(lane + step, 0, 8);
      if (nl !== lane) { lane = nl; rep = 1; } else rep++;
    } else rep++;
    n.lane = lane;
  }
  // 长条：挑「后面有足够空隙」的拍点变长条（SIF 式的点缀；长旋律音自然空隙大）
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const next = notes[i + 1];
    const gapTo = next ? next.t - n.t : 9;
    if (gapTo < 0.78 || rnd() >= D.hold) continue;
    const tail = n.t + Math.min(0.55, gapTo - 0.2);
    if (tail - n.t < 0.35) continue;
    n.kind = 'hold';
    n.tail = tail;
  }
  // 双押：副歌小节头的拍点，往旁边补一张
  const spb = arr.spb;
  if (D.dbl > 0) {
    const extra = [];
    for (const n of notes) {
      if (n.kind !== 'tap' || rnd() >= D.dbl) continue;
      const sec = Math.round((n.t - lead) / spb);
      if (sec % 4 !== 0) continue;
      const l2 = clamp(n.lane + (n.lane <= 2 ? 2 : n.lane >= 6 ? -2 : (rnd() < 0.5 ? -1 : 1)), 0, 8);
      if (l2 === n.lane) continue;
      extra.push({ t: n.t, d: 0, e: n.e, lane: l2, kind: 'tap', tail: 0 });
    }
    notes.push.apply(notes, extra);
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  }
  for (const n of notes) n.judged = false, n.hit = false, n.holding = false, n.broken = false;
  return { arr, lead, notes, dur: arr.dur + lead + 1.2 };
}

/* ================================================================ DOM 骨架 */
const app = $('#app');
const scr = {
  title: $('#scr-title'), songs: $('#scr-songs'), team: $('#scr-team'),
  live: $('#scr-live'), result: $('#scr-result'),
};
function show(name) {
  for (const k of Object.keys(scr)) scr[k].hidden = k !== name;
  G.scr = name;
}

/* ================================================================ 全局状态 */
const G = {
  scr: 'title', song: null, diffK: 'normal', chart: null,
  notes: [], ni: 0, combo: 0, maxCombo: 0, score: 0,
  cnt: { p: 0, g: 0, go: 0, b: 0, m: 0 },
  accW: 0, stamina: 100, buffs: [], sk: [], banner: 0, fx: [],
  holds: {}, running: false, over: false, t0: 0, paused: false,
  auto: AUTO, pulses: 0, beatPulse: 0, tickAt: 0,
};
const team = () => (SAVE.team.length ? SAVE.team : UNITS.slice(0, 3).map((u) => u.id));
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[0];
// gen.js 里的 art 是 data URI 字符串：给 DOM 用；画布要的是 Image 对象，启动时解一份
for (const u of UNITS) {
  const im = new Image();
  im.src = u.art;
  u.img = im;
}

/* ================================================================ 技能 */
// 每个上场单位一份触发账本；buff 是挂时长的一次性效果。
function initSkills() {
  G.sk = team().map((id) => {
    const u = unitById(id);
    return { u, last: -1e9, cnt: 0, lastCombo: -1, fires: 0 };
  });
  G.buffs = [];
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
  Live.fx('skill');
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
        st.lastCombo = G.combo; fireSkill(st, now);
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
    if (st.cnt % sk.need === 0) fireSkill(st, Live.time());
  }
}

/* ================================================================ 判定与计分 */
const JW = { p: 1, g: 0.8, go: 0.5, b: 0.2, m: 0 };
const JN = { p: 'PERFECT', g: 'GREAT', go: 'GOOD', b: 'BAD', m: 'MISS' };
const JC = { p: '#ffd76a', g: '#8fd0ff', go: '#9be29b', b: '#c9a0ff', m: '#e8695f' };

function addCombo(k, silent) {
  G.combo += k;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  if (!silent && G.combo > 0 && G.combo % 100 === 0) G.stamina = clamp(G.stamina + 6, 0, 100);
}
function judgeNow(now, n, dt) {
  const mul = buffMul('judge') * (1 + passSum('judge'));
  const W = diffOf(G.diffK).win;
  const w = W.map((x) => x * mul);
  const a = Math.abs(dt);
  let j = null;
  if (a <= w[0]) j = 'p'; else if (a <= w[1]) j = 'g';
  else if (a <= w[2]) j = 'go'; else if (a <= w[3]) j = 'b';
  return j;
}
function scoreNote(n, j) {
  const comboMul = 1 + Math.min(G.combo, 300) / 100;
  const base = n.kind === 'hold' ? 220 : 300;
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += base * JW[j] * comboMul * sm;
}
function burst(n, j) {
  G.fx.push({ x: n._x, y: n._y, j, t: Live.time(), hue: n._hue });
  if (G.fx.length > 24) G.fx.shift();
}
function judgeNote(n, dt) {
  const now = Live.time();
  let j = judgeNow(now, n, dt);
  if (j === 'm') j = 'b';
  if (j === null) return false;
  n.judged = true; n.hit = true;
  G.cnt[j === 'p' ? 'p' : j === 'g' ? 'g' : j === 'go' ? 'go' : 'b']++;
  G.accW += JW[j === 'go' ? 'go' : j];
  scoreNote(n, j);
  if (j === 'p') onPerfect();
  if (j === 'b') { G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.6, 0, 100); }
  addCombo(1);
  Live.fx(j === 'p' ? 'perfect' : j === 'g' ? 'great' : j === 'go' ? 'good' : 'bad');
  burst(n, j);
  return true;
}
function missNote(n, why) {
  n.judged = true;
  const now = Live.time();
  if (n._x == null) {
    const p = notePos(n, now, leadEff());
    n._x = p.x; n._y = p.y;
    n._hue = unitById(team()[n.lane % team().length]).hue;
  }
  G.cnt.m++;
  // 技能优先级：护盾（不断连不掉血）> 自动救（Miss→Good）
  if (buffFlag('auto')) {
    G.cnt.m--; G.cnt.go++;
    G.accW += JW.go;
    scoreNote(n, 'go');
    addCombo(1);
    burst(n, 'go');
    G.banner = { txt: 'Miss 被救回来了！', until: now + 1.2, hue: 140 };
    return;
  }
  if (buffFlag('guard')) {
    burst(n, 'm');
    G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    return;
  }
  G.combo = 0;
  G.stamina = clamp(G.stamina - diffOf(G.diffK).stam, 0, 100);
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'miss') fireSkill(st, now);
  }
  Live.fx('miss');
  burst(n, 'm');
}
function releaseHold(n, early) {
  if (!n.holding) return;
  n.holding = false;
  delete G.holds[n._ptr];
  const now = Live.time();
  if (early && now < n.tail - 0.18) {
    // 没按到尾音：断连 + 掉血，但不记 Miss（头部那份已经给过了）
    n.broken = true;
    if (!buffFlag('guard')) {
      G.combo = 0;
      G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.8, 0, 100);
    } else {
      G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    }
    Live.fx('miss');
    burst(n, 'm');
  } else {
    // 尾音结算：按完成度给一笔尾分
    const sm = buffMul('score') * (1 + passSum('score'));
    G.score += 150 * sm;
    G.accW += JW.go;
    G.cnt.go++;
    addCombo(1);
    Live.fx('hold');
    burst(n, 'go');
  }
}

/* ================================================================ 输入 */
function notePos(n, now, le) {
  const sp = POS[n.lane];
  const prog = clamp((n.t - now) / le, 0, 1.25);
  const d = RING.r + (sp.d - RING.r) * prog;
  return { x: RING.cx + sp.dx * d, y: RING.cy + sp.dy * d };
}
function leadEff() {
  const D = diffOf(G.diffK);
  return D.lead * (buffFlag('lead') ? buffMul('lead') : 1);
}
function tapAt(x, y, ptrId) {
  if (!G.running || G.paused) return;
  const now = Live.time();
  const W = diffOf(G.diffK).win;
  const mul = buffMul('judge') * (1 + passSum('judge'));
  const reach = Math.max(84, RING.r * 2.4);
  let best = null, bestCost = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > (W[3] * mul) + 0.02) break;
    if (n.judged || (n.kind === 'hold' && n.holding)) continue;
    const dt = n.t - now;
    if (dt < -(W[3] * mul)) continue;
    const p = notePos(n, now, leadEff());
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist > reach) continue;
    const cost = Math.abs(dt) * 2.2 + dist / 260;
    if (cost < bestCost) { bestCost = cost; best = n; }
  }
  if (!best) return;
  best._x = notePos(best, now, leadEff()).x; best._y = notePos(best, now, leadEff()).y;
  best._hue = unitById(team()[best.lane % team().length]).hue;
  const j = judgeNow(now, best, best.t - now);
  if (j === null) return;
  if (best.kind === 'hold') {
    best.holding = true;
    best._ptr = ptrId;
    G.holds[ptrId] = best;
    best._x = RING.cx + POS[best.lane].dx * RING.r;
    best._y = RING.cy + POS[best.lane].dy * RING.r;
    judgeNote(best, best.t - now);
  } else {
    judgeNote(best, best.t - now);
  }
}
function releasePtr(ptrId) {
  const n = G.holds[ptrId];
  if (n) releaseHold(n, true);
}
function tapLane(lane) {
  if (!G.running || G.paused) return;
  const now = Live.time();
  const W = diffOf(G.diffK).win;
  const mul = buffMul('judge') * (1 + passSum('judge'));
  let best = null, bestAbs = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > (W[3] * mul) + 0.02) break;
    if (n.lane !== lane || n.judged || (n.kind === 'hold' && n.holding)) continue;
    const a = Math.abs(n.t - now);
    if (a > W[3] * mul) continue;
    if (a < bestAbs) { bestAbs = a; best = n; }
  }
  if (!best) return;
  best._x = notePos(best, now, leadEff()).x; best._y = notePos(best, now, leadEff()).y;
  best._hue = unitById(team()[best.lane % team().length]).hue;
  if (best.kind === 'hold') {
    best.holding = true;
    best._ptr = 'k' + lane;
    G.holds['k' + lane] = best;
    best._x = RING.cx + POS[best.lane].dx * RING.r;
    best._y = RING.cy + POS[best.lane].dy * RING.r;
  }
  judgeNote(best, best.t - now);
}

/* ================================================================ 画布 */
const cv = $('#cv');
const ctx = cv.getContext('2d');
const RING = { cx: 0, cy: 0, r: 44, d: 240 };
let W = 0, H = 0, DPR = 1;
const POS = [];
function fit() {
  const box = $('#stage');
  const b = box.getBoundingClientRect();
  W = Math.max(280, b.width); H = Math.max(360, b.height);
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  layout();
}
function layout() {
  RING.cx = W / 2;
  RING.cy = H * 0.64;
  RING.r = clamp(Math.min(W, H) * 0.105, 34, 52);
  const rx = W * 0.45;
  const ry = (RING.cy - 10) * 0.82;
  POS.length = 0;
  for (let i = 0; 9 > i; i++) {
    const a = Math.PI * (0.90 - 0.80 * i / 8);
    const x = RING.cx + Math.cos(a) * rx;
    const y = RING.cy - Math.sin(a) * ry;
    const dx = x - RING.cx, dy = y - RING.cy;
    const len = Math.hypot(dx, dy) || 1;
    POS.push({ x, y, dx: dx / len, dy: dy / len, d: len });
  }
  RING.d = POS[4].d;
}
window.addEventListener('resize', () => { fit(); });
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('#stage'));
document.addEventListener('zj:orient', () => setTimeout(fit, 120));

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const b = cv.getBoundingClientRect();
  tapAt(e.clientX - b.left, e.clientY - b.top, e.pointerId);
}, { passive: false });
window.addEventListener('pointerup', (e) => releasePtr(e.pointerId));
window.addEventListener('pointercancel', (e) => releasePtr(e.pointerId));
const KEYMAP = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7, l: 8 };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const lane = KEYMAP[e.key.toLowerCase()];
  if (lane != null) { e.preventDefault(); tapLane(lane); }
  if (e.key === 'Escape' && G.running) togglePause();
});
window.addEventListener('keyup', (e) => {
  const lane = KEYMAP[e.key.toLowerCase()];
  if (lane != null) releasePtr('k' + lane);
});

/* ================================================================ 渲染 */
function draw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // 背景：暗场 + 环后的光
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e17');
  bg.addColorStop(0.65, '#101527');
  bg.addColorStop(1, '#0b0e17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(RING.cx, RING.cy, 4, RING.cx, RING.cy, RING.r * 5);
  glow.addColorStop(0, 'rgba(233,120,180,0.20)');
  glow.addColorStop(0.5, 'rgba(140,120,255,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const now = Live.time();
  const le = leadEff();
  const tm = team();
  // 拍点脉冲：歌在走就跟着 bpm 轻微呼吸
  let beat = 0;
  if (G.chart) beat = (now / G.chart.arr.spb) % 1;

  // 轨道：站位到环的引导线
  ctx.lineWidth = 1;
  for (const p of POS) {
    const g = ctx.createLinearGradient(p.x, p.y, RING.cx, RING.cy);
    g.addColorStop(0, 'rgba(150,165,200,0.10)');
    g.addColorStop(1, 'rgba(150,165,200,0.02)');
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(RING.cx, RING.cy);
    ctx.stroke();
  }
  // 站位：上场成员的脸（lane%3 决定谁是这个位置的主人）
  for (let i = 0; 9 > i; i++) {
    const p = POS[i];
    const u = unitById(tm[i % tm.length]);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,21,38,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'hsla(' + u.hue + ',70%,70%,0.5)';
    ctx.stroke();
    ctx.clip();
    if (u.img) ctx.drawImage(u.img, p.x - 13, p.y - 13, 26, 26);
    ctx.restore();
  }
  // 判定环
  const pulse = 1 + Math.max(0, 0.5 - beat) * 0.05;
  ctx.beginPath();
  ctx.arc(RING.cx, RING.cy, RING.r * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,120,180,0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(RING.cx, RING.cy, RING.r * pulse + 7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,120,180,0.16)';
  ctx.lineWidth = 6;
  ctx.stroke();

  if (G.chart) {
    // 音符
    for (let i = G.ni; i < G.notes.length; i++) {
      const n = G.notes[i];
      if ((n.t - now) / le > 1.02) break;
      if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
      const u = unitById(tm[n.lane % tm.length]);
      const p = notePos(n, now, le);
      const rr = RING.r * 0.62;
      if (n.kind === 'hold') {
        // 长条：头被按住就钉在环上，否则随时间飞
        const hp = n.holding ? { x: RING.cx + POS[n.lane].dx * RING.r, y: RING.cy + POS[n.lane].dy * RING.r } : p;
        const tail = clamp((n.tail - now) / le, 0, 1.25);
        const td = RING.r + (RING.d - RING.r) * Math.max(tail, 0);
        const tx = RING.cx + POS[n.lane].dx * td;
        const ty = RING.cy + POS[n.lane].dy * td;
        ctx.beginPath();
        ctx.moveTo(hp.x, hp.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = n.broken ? 'rgba(150,150,160,0.25)' : 'hsla(' + u.hue + ',80%,72%,0.55)';
        ctx.lineWidth = rr * 1.15;
        ctx.lineCap = 'round';
        ctx.stroke();
        // 尾端小环
        if (!n.broken && !n.holding) {
          ctx.beginPath();
          ctx.arc(tx, ty, rr * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsla(' + u.hue + ',80%,75%,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      // 头
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = '#141a2c';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'hsl(' + u.hue + ',85%,74%)';
      ctx.stroke();
      ctx.clip();
      if (u.img) ctx.drawImage(u.img, p.x - rr, p.y - rr, rr * 2, rr * 2);
      ctx.restore();
      if (n.kind === 'hold' && !n.holding) {
        // 长条头再描一圈，提示要按住
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + u.hue + ',90%,80%,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // 命中特效
    for (const f of G.fx) {
      const age = t - f.t;
      if (age > 0.5) continue;
      const a = 1 - age / 0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, RING.r * (0.7 + age * 2.4), 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + (f.hue || 40) + ',85%,70%,' + (a * 0.8) + ')';
      ctx.lineWidth = 2.5 * a;
      ctx.stroke();
    }
    while (G.fx.length && t - G.fx[0].t > 0.5) G.fx.shift();
    // 连击
    if (G.combo >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,244,255,0.92)';
      ctx.font = '700 ' + Math.round(RING.r * 0.86) + 'px system-ui,-apple-system,"PingFang SC",sans-serif';
      ctx.fillText(String(G.combo), RING.cx, RING.cy + RING.r * 0.3);
      ctx.fillStyle = 'rgba(233,120,180,0.75)';
      ctx.font = '600 ' + Math.round(RING.r * 0.24) + 'px system-ui,sans-serif';
      ctx.fillText('COMBO', RING.cx, RING.cy + RING.r * 0.62);
    }
  }
}

/* ================================================================ 主循环 */
let lastPaint = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const t = ts / 1000;
  draw(t);
  if (!G.running || G.paused) return;
  const now = Live.time();
  // HUD
  $('#live-score').textContent = fmt(G.score);
  $('#live-combo').textContent = G.combo > 0 ? G.combo + ' 连击' : '—';
  const stEl = $('#live-stam');
  stEl.style.width = G.stamina + '%';
  stEl.parentElement.classList.toggle('low', G.stamina <= 30);
  const pr = clamp(now / G.chart.dur, 0, 1);
  $('#live-prog').style.width = (pr * 100) + '%';
  if (now > G.tickAt) {
    G.tickAt = now + 0.25;
    tickSkills(now);
    paintSkillChips(false);
    const bEl = $('#live-banner');
    if (G.banner && now > G.banner.until) G.banner = 0;
    bEl.textContent = G.banner ? G.banner.txt : '';
    bEl.style.opacity = G.banner ? 1 : 0;
    if (G.banner) bEl.style.borderColor = 'hsla(' + G.banner.hue + ',80%,70%,0.6)';
  }
  // 过点判定：Miss / 自动 / 前进头指针；按住中的长条在 holds 表里单独收尾
  for (const k of Object.keys(G.holds)) {
    const hn = G.holds[k];
    if (hn && hn.holding && now >= hn.tail) releaseHold(hn, false);
  }
  const W3 = diffOf(G.diffK).win[3] * buffMul('judge') * (1 + passSum('judge'));
  while (G.ni < G.notes.length) {
    const n = G.notes[G.ni];
    if (AUTO && !n.judged && n.t <= now) { autoHit(n, now); continue; }
    if (!n.judged) {
      if (n.t < now - W3) { missNote(n); continue; }
      break;
    }
    G.ni++;
  }
  // 体力见底 / 歌放完
  if (G.stamina <= 0) { finish(true); return; }
  if (now > G.chart.dur) finish(false);
}
function autoHit(n, now) {
  const dt = n.t - now;
  n._x = notePos(n, now, leadEff()).x; n._y = notePos(n, now, leadEff()).y;
  n._hue = unitById(team()[n.lane % team().length]).hue;
  if (n.kind === 'hold') {
    n.holding = true; n._ptr = '_auto';
    G.holds._auto = n;
    judgeNote(n, dt);
    n.holding = false; delete G.holds._auto;   // 自动模式直接当按满
  } else {
    judgeNote(n, dt);
  }
  G.ni++;
}
requestAnimationFrame(loop);

/* ================================================================ 技能条 UI */
function paintSkillChips(force) {
  const now = Live.time();
  const box = $('#skills');
  if (force || !box.childNodes.length) {
    box.textContent = '';
    for (const st of G.sk) {
      const el = document.createElement('div');
      el.className = 'skill';
      el.style.setProperty('--h', st.u.hue);
      el.innerHTML = '<img alt="" src="' + st.u.art + '"><div class="sm"><b>' + esc(st.u.n) + '</b>'
        + '<span class="sk-n">' + esc(st.u.skill.n) + '</span></div>'
        + '<div class="gauge"><i></i></div>';
      el.title = st.u.skill.txt + (st.u.pass && st.u.pass.score ? '；被动：得分 +' + Math.round(st.u.pass.score * 100) + '%' : '')
        + (st.u.pass && st.u.pass.judge ? '；被动：判定 +' + Math.round(st.u.pass.judge * 100) + '%' : '');
      box.appendChild(el);
    }
  }
  const kids = box.childNodes;
  for (let i = 0; i < G.sk.length; i++) {
    const st = G.sk[i], el = kids[i];
    if (!el) continue;
    const sk = st.u.skill;
    let fr = 0;
    if (sk.trig === 'time') fr = clamp((now - st.last) / sk.need, 0, 1);
    else if (sk.trig === 'combo') fr = G.combo > 0 ? (G.combo % sk.need) / sk.need : 0;
    else if (sk.trig === 'perfect') fr = (st.cnt % sk.need) / sk.need;
    else fr = 1;
    el.querySelector('.gauge i').style.width = (fr * 100) + '%';
    el.classList.toggle('ready', fr >= 1);
  }
}

/* ================================================================ 开局 / 暂停 / 结算 */
function startLive() {
  const song = G.song, D = diffOf(G.diffK);
  G.chart = makeChart(song, G.diffK);
  G.notes = G.chart.notes;
  G.ni = 0;
  G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.cnt = { p: 0, g: 0, go: 0, b: 0, m: 0 };
  G.accW = 0; G.stamina = 100; G.fx = [];
  G.over = false; G.paused = false;
  initSkills();
  Live.setMute(!!SAVE.mute);
  Live.play(G.chart.arr, song.wave);
  G.running = true;
  show('live');
  $('#live-song').textContent = song.n;
  $('#live-diff').textContent = D.n;
  $('#live-score').textContent = '0';
  $('#live-combo').textContent = '—';
  $('#live-banner').textContent = '';
  paintSkillChips(true);
  fit();
}
function togglePause() {
  if (!G.running) return;
  G.paused = !G.paused;
  $('#pauseDlg').hidden = !G.paused;
  if (G.paused) Live.suspend(); else Live.resume();
}
function finish(failed) {
  if (G.over) return;
  G.over = true; G.running = false;
  Live.stop();
  const total = G.notes.length;
  const acc = total ? G.accW / total : 0;
  const ap = G.cnt.p === total;
  const fc = !failed && G.cnt.m === 0 && G.cnt.b === 0;
  const rank = failed ? 'F' : acc >= 0.99 ? 'SSS' : acc >= 0.95 ? 'SS' : acc >= 0.9 ? 'S'
    : acc >= 0.82 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.6 ? 'C' : 'D';
  SAVE.plays++;
  if (G.maxCombo > SAVE.bestCombo) SAVE.bestCombo = G.maxCombo;
  const bk = bestKey(G.song.id, G.diffK);
  const isBest = (Number(SAVE.best[bk]) || 0) < Math.round(G.score);
  if (isBest) SAVE.best[bk] = Math.round(G.score);
  persist();
  // 结算面板
  $('#res-rank').textContent = rank;
  $('#res-title').textContent = failed ? '体力见底，Live 中断…' : (ap ? 'ALL PERFECT！' : fc ? 'FULL COMBO！' : 'Live 结束');
  $('#res-song').textContent = G.song.n + ' · ' + diffOf(G.diffK).n;
  $('#res-score').textContent = fmt(G.score);
  $('#res-acc').textContent = (acc * 100).toFixed(2) + '%';
  $('#res-combo').textContent = G.maxCombo + ' / ' + total;
  $('#res-best').textContent = isBest ? '★ 新纪录' : '最高 ' + fmt(SAVE.best[bk] || 0);
  $('#res-judge').innerHTML = [['PERFECT', G.cnt.p, '#ffd76a'], ['GREAT', G.cnt.g, '#8fd0ff'],
    ['GOOD', G.cnt.go, '#9be29b'], ['BAD', G.cnt.b, '#c9a0ff'], ['MISS', G.cnt.m, '#e8695f']]
    .map((x) => '<li><span style="color:' + x[2] + '">' + x[0] + '</span><b>' + x[1] + '</b></li>').join('');
  $('#res-skills').innerHTML = G.sk.map((st) => {
    const sk = st.u.skill;
    return '<li><img src="' + st.u.art + '" alt=""><span>' + esc(st.u.n) + '「' + esc(sk.n) + '」</span><b>' + st.fires + ' 次</b></li>';
  }).join('');
  show('result');
  renderBest();
}

/* ================================================================ 选曲 / 编队界面 */
function renderSongs() {
  const box = $('#song-list');
  box.textContent = '';
  for (const s of SONGS) {
    const card = document.createElement('article');
    card.className = 'song';
    const diffs = DIFFS.map((d) => {
      const b = Number(SAVE.best[bestKey(s.id, d.k)]) || 0;
      return '<button type="button" class="df' + (d.k === G.diffK ? ' on' : '') + '" data-s="' + s.id + '" data-d="' + d.k + '">'
        + '<b>' + d.n + '</b><span>' + (b ? fmt(b) : '·—·') + '</span></button>';
    }).join('');
    card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
      + '<span class="bpm">' + s.bpm + ' BPM</span></div>'
      + '<p class="sdesc">' + esc(s.desc) + '</p>'
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
let teamSel = [];
function openTeam() {
  teamSel = team().slice(0, 3);
  $('#team-song').textContent = G.song ? G.song.n : '';
  renderTeam();
  show('team');
}
function renderTeam() {
  const grid = $('#unit-grid');
  grid.textContent = '';
  for (const u of UNITS) {
    const on = teamSel.indexOf(u.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'unit' + (on >= 0 ? ' on' : '');
    el.style.setProperty('--h', u.hue);
    const ps = (u.pass && u.pass.score) ? ('得分 +' + Math.round(u.pass.score * 100) + '%')
      : (u.pass && u.pass.judge) ? ('判定 +' + Math.round(u.pass.judge * 100) + '%') : '—';
    el.innerHTML = '<span class="uimg"><img src="' + u.art + '" alt=""></span>'
      + '<b>' + esc(u.n) + '</b>'
      + (on >= 0 ? '<i class="ord">' + (on + 1) + '</i>' : '')
      + '<span class="sk"><em>自动</em>' + esc(u.skill.n) + '</span>'
      + '<span class="stxt">' + esc(u.skill.txt) + '</span>'
      + '<span class="pas">' + esc(ps) + '</span>';
    el.onclick = () => {
      const i = teamSel.indexOf(u.id);
      if (i >= 0) teamSel.splice(i, 1);
      else if (teamSel.length >= 3) return flash('#team-tip', '最多带三位上场，先取消一位');
      else teamSel.push(u.id);
      SAVE.team = teamSel.slice();
      persist();
      renderTeam();
    };
    grid.appendChild(el);
  }
  const box = $('#team-pick');
  box.innerHTML = teamSel.map((id, i) => {
    const u = unitById(id);
    return '<span class="pick" style="--h:' + u.hue + '"><img src="' + u.art + '" alt=""><b>' + (i + 1) + '. ' + esc(u.n) + '</b></span>';
  }).join('') || '<span class="dim">还没选人——点下面的唤醒体上场（最多三位）</span>';
}
function flash(sel, txt) {
  const el = $(sel);
  el.textContent = txt;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 1600);
}

/* ================================================================ 首屏 */
function renderBest() {
  const el = $('#title-best');
  let played = 0, bestScore = 0;
  for (const k of Object.keys(SAVE.best)) {
    played++;
    bestScore = Math.max(bestScore, Number(SAVE.best[k]) || 0);
  }
  el.textContent = played
    ? '玩过 ' + played + ' 张谱 · 最高分 ' + fmt(bestScore) + ' · 最长连击 ' + fmt(SAVE.bestCombo)
    : '还没玩过——选首歌，带上三位唤醒体试试？';
}

/* ================================================================ 接线 */
$('#btn-play').onclick = () => { renderSongs(); show('songs'); };
$('#btn-team').onclick = () => openTeam();
$('#btn-help').onclick = () => { $('#helpDlg').showModal ? $('#helpDlg').showModal() : $('#helpDlg').setAttribute('open', ''); };
$('#songs-back').onclick = () => show('title');
$('#team-back').onclick = () => { renderSongs(); show('songs'); };
$('#team-go').onclick = () => { if (!teamSel.length) return flash('#team-tip', '至少带一位上场'); startLive(); };
$('#live-pause').onclick = () => togglePause();
$('#pause-resume').onclick = () => togglePause();
$('#pause-retry').onclick = () => { G.paused = false; $('#pauseDlg').hidden = true; Live.resume(); startLive(); };
$('#pause-quit').onclick = () => { G.paused = false; $('#pauseDlg').hidden = true; G.running = false; G.over = true; Live.stop(); show('songs'); renderSongs(); };
$('#res-retry').onclick = () => startLive();
$('#res-songs').onclick = () => { renderSongs(); show('songs'); };
$('#res-home').onclick = () => { show('title'); renderBest(); };
$('#mute').onclick = () => {
  SAVE.mute = SAVE.mute ? 0 : 1;
  persist();
  Live.setMute(!!SAVE.mute);
  $('#mute').classList.toggle('off', !!SAVE.mute);
};
$('#mute').classList.toggle('off', !!SAVE.mute);

/* ================================================================ 测试钩子 */
if (TEST) {
  window.__ll = {
    G, SAVE, UNITS, SONGS, DIFFS, startLive, finish, makeChart, show, renderSongs, openTeam,
    tapAt, tapLane, notePos, leadEff, RING, POS,
    live: Live,
    setDiff: (k) => { G.diffK = k; },
    pickSong: (id) => { G.song = SONGS.find((x) => x.id === id) || SONGS[0]; },
    setTeam: (ids) => { SAVE.team = ids; persist(); },
  };
}

/* ================================================================ 启动 */
renderBest();
startGameCloud('lovelive');
fit();
