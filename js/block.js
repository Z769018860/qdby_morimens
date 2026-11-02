// 「蚀界方块」——把三个形状拖进 8×8 的盘面，填满一整行或一整列就炸掉。
//
// 这一页和别的页不一样的地方：背景（夜空、船桅、月亮、浪）全部由 canvas 画，
// 不发任何图片请求；方块上的眼睛是程序画的，会自己眨。整页只有一个脚本请求，
// 边缘一次往返 1~2 秒的站上，这比什么都重要。
import {
  N, MAX_STEPS, ENERGY_MAX, TOOL_HAMMER, TOOL_SHUFFLE, deal, emptyBoard,
  canPlace, applyPlace, fullLines, clearLines, anyPlacement, bestWindow,
  clearWindow, countFilled, scorePlace, scoreClear, rankOf, creditOf, CREDIT,
  SHAPES, RANKS,
} from './block-core.js';

// ------------------------------------------------------------------ 存档
const KEY = {
  best: 'zjtt:block:best',
  save: 'zjtt:block:save',
  snd: 'zjtt:block:snd',
};
const readNum = (k, d = 0) => {
  try { const v = Number(localStorage.getItem(k)); return Number.isFinite(v) ? v : d; } catch { return d; }
};
const write = (k, v) => { try { localStorage.setItem(k, String(v)); } catch { /* 隐私模式 */ } };

// ------------------------------------------------------------------ DOM
const $ = (s) => document.querySelector(s);
const cv = $('#cv');
const ctx = cv.getContext('2d');
const stage = $('#stage');
const tray = $('#tray');
const scEl = $('#sc');
const rankEl = $('#rank');
const stepEl = $('#step');
const energyFill = $('#enFill');
const energyNum = $('#enNum');
const energyText = $('#enText');
const ov = $('#ov');
const boot = $('#boot');
const toastEl = $('#toast');
const tipEl = $('#tip');

// ------------------------------------------------------------------ 状态
const G = {
  board: emptyBoard(),
  cards: [],
  score: 0,
  steps: 0,
  combo: 0,
  maxCombo: 0,
  lines: 0,
  energy: 0,
  hammer: TOOL_HAMMER,
  shuffle: TOOL_SHUFFLE,
  over: false,
  started: false,
  tool: '',            // '' | 'hammer'
  clearing: [],        // 消除残影
  particles: [],
  floats: [],
  shake: 0,
  flash: 0,
  hover: null,         // 拖拽时的落点预览 {r0,c0,ok}
  time: 0,
};

const B = { x: 0, y: 0, cell: 0, size: 0, w: 0, h: 0, pad: 0 };
let dpr = Math.min(2, window.devicePixelRatio || 1);
let bgCanvas = null;

const rng = (() => {
  let a = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();

// ------------------------------------------------------------------ 配色
// 三种「记忆」的颜色：狂气的红、梦的紫、忆的金。第四种是遗物格。
const KIND = [
  { base: '#c4455f', hi: '#f08fa0', lo: '#7d1f34', ink: '#3a0d18', eye: '#fff1f4' },
  { base: '#8b6bd0', hi: '#c6acf5', lo: '#543590', ink: '#241046', eye: '#f4eeff' },
  { base: '#c3a97b', hi: '#efe0bb', lo: '#836b41', ink: '#332713', eye: '#fff8e6' },
];
const RELIC = { base: '#2f8a68', hi: '#7fe3b6', lo: '#164e3a', ink: '#08251a', eye: '#e9fff5' };
const CYAN = '#63d2ff';

// ------------------------------------------------------------------ 布局
function layout() {
  const rect = stage.getBoundingClientRect();
  const w = Math.max(200, rect.width);
  const h = Math.max(200, rect.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  B.w = w; B.h = h;
  const pad = Math.min(14, w * 0.03);
  const usable = Math.min(w - pad * 2, h - pad * 2);
  const cell = Math.max(24, Math.floor(usable / N));
  B.cell = cell;
  B.size = cell * N;
  B.x = Math.round((w - B.size) / 2);
  B.y = Math.round((h - B.size) / 2);
  B.pad = pad;

  buildBg();
  paintTray();
}

// ------------------------------------------------------------------ 背景（只在改尺寸时重画一次）
function buildBg() {
  const { w, h } = B;
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = Math.round(w * dpr);
  bgCanvas.height = Math.round(h * dpr);
  const g = bgCanvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 夜空
  const sky = g.createLinearGradient(0, 0, w * 0.3, h);
  sky.addColorStop(0, '#070d24');
  sky.addColorStop(0.45, '#101c42');
  sky.addColorStop(0.78, '#1a2a55');
  sky.addColorStop(1, '#16233f');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // 极淡的星
  let seed = 20261103;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * w, y = rnd() * h * 0.8, r = rnd() * 1.3 + 0.3;
    g.globalAlpha = 0.15 + rnd() * 0.5;
    g.fillStyle = '#cfe1ff';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;

  // 月亮：原作里是糊成一个光斑的
  const mx = w * 0.76, my = h * 0.15, mr = Math.max(26, w * 0.075);
  const halo = g.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3);
  halo.addColorStop(0, 'rgba(210,232,255,.62)');
  halo.addColorStop(0.32, 'rgba(150,196,255,.2)');
  halo.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = halo;
  g.beginPath(); g.arc(mx, my, mr * 3, 0, 7); g.fill();
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, '#ffffff');
  moon.addColorStop(0.7, '#dfeaff');
  moon.addColorStop(1, '#b9cdf0');
  g.fillStyle = moon;
  g.beginPath(); g.arc(mx, my, mr, 0, 7); g.fill();

  // 船桅：一根主桅 + 两根斜索，剪影压得很低，只当背景
  g.save();
  g.globalAlpha = 0.55;
  g.strokeStyle = '#0a1226';
  g.lineCap = 'round';
  const mastX = w * 0.42;
  g.lineWidth = Math.max(7, w * 0.026);
  g.beginPath(); g.moveTo(mastX, h * 0.06); g.lineTo(mastX - w * 0.01, h); g.stroke();
  g.lineWidth = Math.max(3, w * 0.011);
  for (let i = 0; i < 4; i++) {
    const y = h * (0.3 + i * 0.11);
    const halfW = w * (0.09 + i * 0.026);
    g.beginPath(); g.moveTo(mastX, y); g.lineTo(mastX - halfW, y + h * 0.03); g.stroke();
    g.beginPath(); g.moveTo(mastX, y); g.lineTo(mastX + halfW, y + h * 0.03); g.stroke();
  }
  g.lineWidth = Math.max(1.2, w * 0.004);
  g.beginPath(); g.moveTo(mastX, h * 0.05); g.lineTo(w * 0.02, h * 0.98); g.stroke();
  g.beginPath(); g.moveTo(mastX, h * 0.05); g.lineTo(w * 0.99, h * 0.9); g.stroke();
  g.restore();

  // 底部海浪：三层错开的贝塞尔浪头
  const wave = (y0, amp, alpha, color) => {
    g.globalAlpha = alpha;
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    g.lineTo(0, y0);
    for (let x = 0; x <= w; x += w / 6) {
      g.quadraticCurveTo(x + w / 12, y0 - amp, x + w / 6, y0 + amp * 0.25);
    }
    g.lineTo(w, h);
    g.closePath();
    g.fill();
  };
  wave(h * 0.905, h * 0.026, 0.5, '#0b1730');
  wave(h * 0.945, h * 0.02, 0.62, '#0e1d3b');
  wave(h * 0.975, h * 0.014, 0.8, '#122446');
  g.globalAlpha = 1;

  // 顶部压暗，让 HUD 上方的字更清楚
  const top = g.createLinearGradient(0, 0, 0, h * 0.18);
  top.addColorStop(0, 'rgba(4,8,18,.72)');
  top.addColorStop(1, 'rgba(4,8,18,0)');
  g.fillStyle = top;
  g.fillRect(0, 0, w, h * 0.18);
}

// ------------------------------------------------------------------ 绘制
function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// 方块上的眼睛：两只白眼球 + 会在眨眼时压扁
function drawEyes(g, cx, cy, s, kind, blink) {
  const ew = s * 0.092, eh = s * 0.13 * (1 - blink * 0.86);
  const gap = s * 0.112;
  for (const dir of [-1, 1]) {
    const x = cx + dir * gap;
    g.fillStyle = kind.eye;
    g.beginPath(); g.ellipse(x, cy, ew, Math.max(eh, s * 0.012), 0, 0, 7); g.fill();
    if (blink < 0.55) {
      g.fillStyle = kind.ink;
      g.beginPath();
      g.ellipse(x + dir * ew * 0.16, cy + eh * 0.12, ew * 0.5, eh * 0.62, 0, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)';
      g.beginPath();
      g.arc(x + dir * ew * 0.16 - ew * 0.18, cy - eh * 0.28, Math.max(0.7, ew * 0.2), 0, 7);
      g.fill();
    }
  }
}

// 遗物格中央那张小卡
function drawRelic(g, cx, cy, s, alpha) {
  const w = s * 0.4, h = s * 0.52, r2 = s * 0.06;
  g.save();
  g.globalAlpha = alpha;
  g.translate(cx, cy);
  g.rotate(-0.14);
  g.fillStyle = '#f2fbf5';
  roundRect(g, -w / 2, -h / 2, w, h, r2);
  g.fill();
  g.fillStyle = '#2f8a68';
  roundRect(g, -w / 2 + w * 0.14, -h / 2 + h * 0.14, w * 0.72, h * 0.3, r2 * 0.6);
  g.fill();
  g.strokeStyle = 'rgba(47,138,104,.55)';
  g.lineWidth = Math.max(1, s * 0.022);
  for (let i = 0; i < 2; i++) {
    g.beginPath();
    g.moveTo(-w * 0.28, h * 0.12 + i * h * 0.16);
    g.lineTo(w * 0.28, h * 0.12 + i * h * 0.16);
    g.stroke();
  }
  g.restore();
}

// 单格方块。ghost=true 时半透明、不画眼睛（落点预览）
function drawBlock(g, x, y, s, kindIdx, relic, opt) {
  const o = opt || {};
  const kind = o.relicOnly ? RELIC : (KIND[kindIdx] || KIND[0]);
  const pad = s * 0.085;
  const bx = x + pad, by = y + pad, bs = s - pad * 2;
  const r = bs * 0.26;
  g.save();
  if (o.alpha != null) g.globalAlpha = o.alpha;
  if (o.scale != null && o.scale < 1) {
    g.translate(bx + bs / 2, by + bs / 2);
    g.scale(o.scale, o.scale);
    g.translate(-(bx + bs / 2), -(by + bs / 2));
  }

  // 外发光：消除时才亮
  if (o.glow) {
    g.shadowColor = o.glow;
    g.shadowBlur = s * 0.55;
  }

  const gd = g.createLinearGradient(bx, by, bx + bs * 0.4, by + bs);
  gd.addColorStop(0, kind.hi);
  gd.addColorStop(0.42, kind.base);
  gd.addColorStop(1, kind.lo);
  g.fillStyle = gd;
  roundRect(g, bx, by, bs, bs, r);
  g.fill();
  g.shadowBlur = 0;

  if (!o.ghost) {
    // 顶部一层薄高光，做出果冻感
    g.globalAlpha = (o.alpha != null ? o.alpha : 1) * 0.5;
    const hl = g.createLinearGradient(bx, by, bx, by + bs * 0.52);
    hl.addColorStop(0, 'rgba(255,255,255,.72)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    roundRect(g, bx + bs * 0.1, by + bs * 0.08, bs * 0.8, bs * 0.44, r * 0.8);
    g.fill();
    g.globalAlpha = o.alpha != null ? o.alpha : 1;

    // 内描边
    g.strokeStyle = 'rgba(255,255,255,.22)';
    g.lineWidth = Math.max(1, s * 0.017);
    roundRect(g, bx + 0.75, by + 0.75, bs - 1.5, bs - 1.5, r);
    g.stroke();

    if (relic && !o.relicOnly) {
      drawRelic(g, bx + bs / 2, by + bs * 0.52, bs * 1.15, o.alpha != null ? o.alpha : 1);
    } else {
      drawEyes(g, bx + bs / 2, by + bs * 0.5, bs, kind, o.blink || 0);
    }
  }
  g.restore();
}

function drawBoard(g) {
  const { x, y, size, cell } = B;
  // 外框：青色发光边，就是原作那一圈
  g.save();
  g.shadowColor = 'rgba(99,210,255,.5)';
  g.shadowBlur = 18;
  g.strokeStyle = CYAN;
  g.lineWidth = 2;
  roundRect(g, x - 5, y - 5, size + 10, size + 10, 16);
  g.stroke();
  g.restore();

  g.save();
  g.globalAlpha = 0.5;
  g.fillStyle = '#0a1330';
  roundRect(g, x - 3, y - 3, size + 6, size + 6, 14);
  g.fill();
  g.restore();

  // 空格
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const px = x + c * cell, py = y + r * cell;
      const pad = cell * 0.055;
      g.fillStyle = 'rgba(86,126,196,.075)';
      roundRect(g, px + pad, py + pad, cell - pad * 2, cell - pad * 2, cell * 0.22);
      g.fill();
      g.strokeStyle = 'rgba(120,170,240,.075)';
      g.lineWidth = 1;
      g.stroke();
    }
  }
}

function drawGhost(g) {
  const h = G.hover;
  if (!h || !G.dragCard) return;
  const { cell, x, y } = B;
  const sh = G.dragCard.sh;
  const t = G.time;
  sh.cells.forEach(([dr, dc]) => {
    const px = x + (h.c0 + dc) * cell;
    const py = y + (h.r0 + dr) * cell;
    if (h.ok) {
      drawBlock(g, px, py, cell, G.dragCard.kind, false, { alpha: 0.6, ghost: true });
      g.save();
      g.strokeStyle = 'rgba(235,248,255,.66)';
      g.lineWidth = Math.max(1.2, cell * 0.035);
      roundRect(g, px + cell * 0.09, py + cell * 0.09, cell * 0.82, cell * 0.82, cell * 0.22);
      g.stroke();
      g.restore();
    } else {
      g.save();
      g.globalAlpha = 0.5;
      g.strokeStyle = '#e8695f';
      g.lineWidth = Math.max(1.5, cell * 0.05);
      roundRect(g, px + cell * 0.08, py + cell * 0.08, cell * 0.84, cell * 0.84, cell * 0.2);
      g.stroke();
      g.restore();
    }
  });
  if (h.ok) {
    // 会被消掉的行/列提前描一道
    const b2 = G.board.map((row) => row.slice());
    applyPlace(b2, G.dragCard, h.r0, h.c0);
    const fl = fullLines(b2);
    g.save();
    g.strokeStyle = `rgba(255,238,180,${0.55 + 0.3 * Math.sin(t * 8)})`;
    g.lineWidth = 2.5;
    for (const r of fl.rows) {
      g.beginPath();
      g.moveTo(x + 3, y + r * cell + cell / 2);
      g.lineTo(x + B.size - 3, y + r * cell + cell / 2);
      g.stroke();
    }
    for (const c of fl.cols) {
      g.beginPath();
      g.moveTo(x + c * cell + cell / 2, y + 3);
      g.lineTo(x + c * cell + cell / 2, y + B.size - 3);
      g.stroke();
    }
    g.restore();
  }
}

function drawFX(g) {
  // 消除残影
  for (const f of G.clearing) {
    const p = Math.min(1, (G.time - f.t0) / 0.34);
    const sc = 1 - p * 0.85;
    drawBlock(g, B.x + f.c * B.cell, B.y + f.r * B.cell, B.cell, f.k, f.relic, {
      scale: sc, alpha: 1 - p, glow: 'rgba(255,240,190,.95)', blink: 0,
    });
  }
  // 粒子
  for (const p of G.particles) {
    g.globalAlpha = Math.max(0, p.life / p.max);
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;
  // 飘分
  for (const f of G.floats) {
    const p = 1 - f.life / f.max;
    g.globalAlpha = Math.min(1, (1 - p) * 1.6);
    g.fillStyle = f.color;
    g.font = `700 ${f.size}px system-ui,-apple-system,"PingFang SC",sans-serif`;
    g.textAlign = 'center';
    g.shadowColor = 'rgba(0,0,0,.85)';
    g.shadowBlur = 8;
    g.fillText(f.text, f.x, f.y - p * 46);
    g.shadowBlur = 0;
  }
  g.globalAlpha = 1;
  if (G.flash > 0) {
    g.fillStyle = `rgba(255,245,220,${G.flash * 0.5})`;
    g.fillRect(0, 0, B.w, B.h);
  }
}

function paint() {
  contextReset();
  ctx.clearRect(0, 0, B.w, B.h);
  if (bgCanvas) {
    ctx.save();
    if (G.shake > 0) {
      ctx.translate((Math.random() - 0.5) * G.shake * 10, (Math.random() - 0.5) * G.shake * 10);
    }
    ctx.drawImage(bgCanvas, 0, 0, B.w, B.h);
    ctx.restore();
  }
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake * 8, (Math.random() - 0.5) * G.shake * 8);

  drawBoard(ctx);

  // 方块，加上一点点"呼吸"的错峰浮动
  const blink = blinkValue();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cellv = G.board[r][c];
      if (!cellv) continue;
      drawBlock(ctx, B.x + c * B.cell, B.y + r * B.cell, B.cell, cellv.k, cellv.relic, { blink });
    }
  }

  if (G.tool === 'hammer') {
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.06 * Math.sin(G.time * 5);
    ctx.fillStyle = '#e8695f';
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        if (!G.board[r][c]) continue;
        roundRect(ctx, B.x + c * B.cell + 3, B.y + r * B.cell + 3, B.cell - 6, B.cell - 6, B.cell * 0.2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawGhost(ctx);
  drawFX(ctx);
  ctx.restore();
}

function contextReset() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ------------------------------------------------------------------ 眨眼
let nextBlink = 2.2, blinkT = -1;
function blinkValue() {
  if (blinkT >= 0) {
    const p = (G.time - blinkT) / 0.16;
    if (p >= 1) { blinkT = -1; nextBlink = G.time + 2.4 + rng() * 3.6; return 0; }
    return Math.sin(p * Math.PI);
  }
  if (G.time > nextBlink) blinkT = G.time;
  return 0;
}

// ------------------------------------------------------------------ 音效
let ac = null;
function audio() {
  if (ac) return ac;
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; }
  return ac;
}
let sndOn = readNum(KEY.snd, 1) === 1;
function tone(freq, dur, type, vol, slide) {
  if (!sndOn) return;
  const a = audio();
  if (!a) return;
  if (a.state === 'suspended') a.resume();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(vol || 0.06, a.currentTime + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g); g.connect(a.destination);
  o.start(); o.stop(a.currentTime + dur + 0.02);
}
const sfx = {
  pick: () => tone(320, 0.07, 'triangle', 0.05, 400),
  place: () => tone(180, 0.1, 'sine', 0.07, 120),
  clear: (n) => {
    const base = 420 + Math.min(6, n) * 40;
    tone(base, 0.16, 'triangle', 0.07, base * 1.7);
    setTimeout(() => tone(base * 1.5, 0.18, 'triangle', 0.05, base * 2.2), 55);
  },
  bad: () => tone(150, 0.13, 'sawtooth', 0.05, 90),
  hammer: () => tone(96, 0.18, 'square', 0.07, 50),
  burst: () => {
    tone(160, 0.5, 'sawtooth', 0.08, 620);
    setTimeout(() => tone(320, 0.35, 'triangle', 0.06, 900), 90);
  },
  over: () => {
    tone(330, 0.3, 'sine', 0.07, 200);
    setTimeout(() => tone(247, 0.36, 'sine', 0.06, 150), 170);
    setTimeout(() => tone(165, 0.6, 'sine', 0.06, 110), 360);
  },
};

// ------------------------------------------------------------------ 手牌
function paintTray() {
  tray.innerHTML = '';
  G.cards.forEach((card, i) => {
    if (!card) {
      const ph = document.createElement('div');
      ph.className = 'hcard empty';
      ph.setAttribute('aria-hidden', 'true');
      tray.appendChild(ph);
      return;
    }
    const btn = document.createElement('div');
    btn.className = 'hcard';
    btn.dataset.i = String(i);
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    const sh = card.sh;
    const tw = tray.clientWidth || 300;
    const unit = Math.max(14, Math.min(22, (Math.min(tw / 3, 120) - 18) / 5));
    const pre = document.createElement('div');
    pre.className = 'pre';
    pre.style.width = sh.cols * unit + 'px';
    pre.style.height = sh.rows * unit + 'px';
    sh.cells.forEach(([r, c], idx) => {
      const s = document.createElement('i');
      s.className = 'pz' + (idx === card.relic ? ' relic' : '');
      s.style.left = c * unit + 'px';
      s.style.top = r * unit + 'px';
      s.style.width = unit - 2 + 'px';
      s.style.height = unit - 2 + 'px';
      s.style.background = cellGradient(card.kind);
      pre.appendChild(s);
    });
    btn.appendChild(pre);
    tray.appendChild(btn);
  });
  for (let i = G.cards.length; i < 3; i++) {
    const ph = document.createElement('div');
    ph.className = 'hcard empty';
    ph.setAttribute('aria-hidden', 'true');
    tray.appendChild(ph);
  }
  syncTools();
}

function cellGradient(kindIdx) {
  const k = KIND[kindIdx];
  return `linear-gradient(150deg, ${k.hi}, ${k.base} 46%, ${k.lo})`;
}

// ------------------------------------------------------------------ 放置与消除
function tryPlace(card, r0, c0) {
  if (!canPlace(G.board, card.sh, r0, c0)) return false;
  applyPlace(G.board, card, r0, c0);
  G.score += scorePlace(card);
  G.steps++;
  // 用过的那一格留空，不把后面的牌往前挤 —— 手牌位置固定，肌肉记忆才不会打滑
  const idx = G.cards.indexOf(card);
  if (idx >= 0) G.cards[idx] = null;
  sfx.place();

  const fl = fullLines(G.board);
  const nLines = fl.rows.length + fl.cols.length;
  if (nLines) {
    resolveClear(fl);
  } else {
    G.combo = 0;
  }

  afterMove();
  return true;
}

function resolveClear(fl) {
  // 先把要炸的格子做成残影
  const snap = [];
  for (const r of fl.rows) for (let c = 0; c < N; c++) if (G.board[r][c]) snap.push([r, c, G.board[r][c]]);
  for (const c of fl.cols) for (let r = 0; r < N; r++) if (G.board[r][c]) snap.push([r, c, G.board[r][c]]);
  const seen = new Set();
  const uniq = snap.filter(([r, c]) => {
    const k = r + ',' + c;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const cl = clearLines(G.board, fl);
  G.combo++;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  const gain = scoreClear(cl.n, cl.lines, G.combo) + cl.relics * 30;
  G.score += gain;
  G.lines += cl.lines;
  G.energy = Math.min(ENERGY_MAX, G.energy + cl.lines + cl.relics);
  G.shake = Math.min(1.4, 0.5 + cl.lines * 0.25);
  G.flash = Math.min(0.5, 0.16 + cl.lines * 0.1);

  uniq.forEach(([r, c, cellv], i) => {
    G.clearing.push({ r, c, k: cellv.k, relic: cellv.relic, t0: G.time + i * 0.012 });
    burst(r, c, cellv);
  });

  const cx = B.x + B.size / 2;
  const cy = B.y + B.size / 2;
  pushFloat(cx, cy - B.cell * 0.4, '+' + gain, '#ffe9a8', 23 + Math.min(11, cl.lines * 3));
  if (G.combo >= 2) {
    pushFloat(cx, cy - 34, G.combo + ' 连击', '#ffb1c6', 20);
  }
  sfx.clear(cl.lines);
  updateHud();
}

function burst(r, c, cellv) {
  const k = KIND[cellv.k];
  const cx = B.x + c * B.cell + B.cell / 2;
  const cy = B.y + r * B.cell + B.cell / 2;
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2;
    const sp = 60 + rng() * 190;
    G.particles.push({
      x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.5 + rng() * 0.4, max: 0.9,
      size: B.cell * (0.05 + rng() * 0.07),
      color: i % 3 === 0 ? k.hi : k.base,
    });
  }
}

function pushFloat(x, y, text, color, size) {
  G.floats.push({ x, y, text, color, size, life: 1.1, max: 1.1 });
}

function afterMove() {
  if (!G.cards.length || G.cards.every((c) => !c)) G.cards = deal(rng);
  paintTray();
  updateHud();
  save();
  if (G.steps >= MAX_STEPS) { endGame('一百回合走完'); return; }
  checkDeadlock();
}

// 手上三张都放不下时的三条出路：溢出 → 碎击 → 结束。
// 必须每次「棋盘变了」都复查一遍（放置、碎击之后），否则砸完最后一锤会卡在原地。
function checkDeadlock() {
  const live = G.cards.filter(Boolean);
  if (G.over || !live.length) return;
  if (live.some((c) => anyPlacement(G.board, c.sh))) return;
  if (G.energy >= ENERGY_MAX) {
    syncTools();
    showTip('没有能放下的形状了 —— 用「溢出」清场');
    return;
  }
  if (G.hammer > 0) {
    showTip('没有能放下的形状了 —— 用「碎击」砸开一格');
    return;
  }
  endGame('棋盘满了');
}

// ------------------------------------------------------------------ 工具
function useHammer(r, c) {
  if (!G.board[r][c]) return false;
  const cellv = G.board[r][c];
  G.board[r][c] = null;
  G.hammer--;
  G.tool = '';
  G.clearing.push({ r, c, k: cellv.k, relic: cellv.relic, t0: G.time });
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2, sp = 50 + rng() * 170;
    G.particles.push({
      x: B.x + c * B.cell + B.cell / 2, y: B.y + r * B.cell + B.cell / 2,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0.6, max: 0.6, size: B.cell * 0.07, color: '#9fb4d8',
    });
  }
  sfx.hammer();
  G.shake = 0.5;
  paintTray();
  updateHud();
  save();
  checkDeadlock();
  return true;
}

function useShuffle() {
  if (G.shuffle <= 0) return;
  // 只换没放下的那几张没意义——换牌就是为了救「剩下的都放不下」，所以整组重发
  G.shuffle--;
  G.cards = deal(rng);
  paintTray();
  updateHud();
  save();
  showTip('手牌已重发');
  sfx.pick();
}

function useBurst() {
  if (G.energy < ENERGY_MAX) {
    showTip(`溢出还没攒满（${G.energy}/${ENERGY_MAX}）`);
    return;
  }
  const n = countFilled(G.board);
  if (!n) { showTip('盘面本来就是空的'); return; }
  // 全屏炸开：一格 26 分 + 240 底分
  const gain = n * 26 + 240;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const cellv = G.board[r][c];
      if (!cellv) continue;
      G.clearing.push({ r, c, k: cellv.k, relic: cellv.relic, t0: G.time + (r + c) * 0.012 });
      burst(r, c, cellv);
    }
  }
  G.board = emptyBoard();
  G.score += gain;
  G.energy = 0;
  G.shake = 1.6;
  G.flash = 0.55;
  pushFloat(B.x + B.size / 2, B.y + B.size / 2, '+' + gain, '#ffe9a8', 32);
  pushFloat(B.x + B.size / 2, B.y + B.size / 2 + 32, '溢出强化', '#a9e7ff', 18);
  sfx.burst();
  paintTray();
  updateHud();
  save();
}

function syncTools() {
  const alive = G.cards.some((c) => c && anyPlacement(G.board, c.sh));
  $('#bHammer').disabled = G.hammer <= 0 || G.over;
  $('#bHammer').classList.toggle('on', G.tool === 'hammer');
  $('#bHammer .n').textContent = G.hammer;
  $('#bShuffle').disabled = G.shuffle <= 0 || G.over;
  $('#bShuffle .n').textContent = G.shuffle;
  const ready = G.energy >= ENERGY_MAX && !G.over;
  $('#bBurst').disabled = !!G.over;
  $('#bBurst .n').textContent = G.energy;
  $('#bBurst').classList.toggle('ready', ready);
  $('#bBurst').classList.toggle('urgent', !alive && G.energy >= ENERGY_MAX);
}

// ------------------------------------------------------------------ HUD
function updateHud() {
  scEl.textContent = String(G.score);
  const rk = rankOf(G.score);
  rankEl.textContent = rk.k;
  rankEl.style.color = rk.color;
  rankEl.style.textShadow = `0 0 22px ${rk.color}88`;
  stepEl.textContent = String(G.steps).padStart(2, '0') + '/' + MAX_STEPS;
  const pct = Math.min(1, G.energy / ENERGY_MAX);
  energyFill.style.width = (pct * 100).toFixed(1) + '%';
  energyNum.textContent = G.energy + '/' + ENERGY_MAX;
  energyText.textContent = G.energy >= ENERGY_MAX ? '溢出就绪' : '溢出强化';
  energyText.classList.toggle('ok', G.energy >= ENERGY_MAX);
  $('#en').classList.toggle('ok', G.energy >= ENERGY_MAX);
  syncTools();
}

let tipTimer = 0;
function showTip(s) {
  tipEl.textContent = s;
  tipEl.classList.add('on');
  clearTimeout(tipTimer);
  tipTimer = setTimeout(() => tipEl.classList.remove('on'), 2200);
}

// ------------------------------------------------------------------ 存档
let saveTimer = 0;
function save() {
  if (G.over) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY.save, JSON.stringify({
        b: G.board, cards: G.cards.map((c) => (c ? { id: c.sh.id, kind: c.kind, relic: c.relic } : null)),
        score: G.score, steps: G.steps, combo: G.combo, maxCombo: G.maxCombo, lines: G.lines,
        energy: G.energy, hammer: G.hammer, shuffle: G.shuffle,
      }));
    } catch { /* 存不下就算了 */ }
  }, 250);
}

function loadSave() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY.save) || 'null'); } catch { raw = null; }
  if (!raw || !Array.isArray(raw.b) || raw.b.length !== N) return false;
  try {
    const byId = {};
    for (const s of ALL_SHAPES) byId[s.id] = s;
    const cards = (raw.cards || []).map((c) => (c && byId[c.id]
      ? { sh: byId[c.id], kind: c.kind | 0, relic: c.relic } : null));
    if (!cards.some(Boolean)) return false;
    G.board = raw.b;
    G.cards = cards;
    G.score = raw.score | 0;
    G.steps = raw.steps | 0;
    G.combo = raw.combo | 0;
    G.maxCombo = raw.maxCombo | 0;
    G.lines = raw.lines | 0;
    G.energy = raw.energy | 0;
    G.hammer = raw.hammer == null ? TOOL_HAMMER : raw.hammer;
    G.shuffle = raw.shuffle == null ? TOOL_SHUFFLE : raw.shuffle;
    return true;
  } catch { return false; }
}

// ------------------------------------------------------------------ 结束
function endGame(why) {
  if (G.over) return;
  G.over = true;
  G.tool = '';
  try { localStorage.removeItem(KEY.save); } catch { /* ignore */ }
  const best = Math.max(readNum(KEY.best, 0), G.score);
  write(KEY.best, best);
  const rk = rankOf(G.score);
  $('#ovk').textContent = why || '结束了';
  $('#ovs').textContent = String(G.score);
  $('#ovRank').textContent = rk.k;
  $('#ovRank').style.color = rk.color;
  const cr = creditOf(G.score);
  $('#ovc').innerHTML = cr
    ? `本次可换 <b>${cr}</b> 银芯<span>结算后自动发</span>`
    : '还没到换银芯的分数';
  $('#ovc').classList.toggle('on', cr > 0);
  $('#ovd').textContent = `用了 ${G.steps} 回合 · 消除 ${G.lines} 行 · 最高 ${G.maxCombo} 连击`;
  $('#ovb').textContent = G.score >= best ? '新纪录！' : `最高纪录 ${best}`;
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('on'));
  sfx.over();
  updateHud();
  // 银芯真的发到钱包里
  if (cr > 0) payCredits(cr);
}

// 银芯钱包 zjtt:credits 存的是一个纯数字（JSON.stringify(number)），和
// js/common.js 的 wallet、合成大杜勒、忘却 2048 共用。写错格式其他地方会读到 NaN，
// 所以这里连 markDirty 那条事件也照抄 —— 登录用户的这笔钱要能被推上云。
function payCredits(n) {
  if (!(n > 0)) return 0;
  try {
    const cur = Number(JSON.parse(localStorage.getItem('zjtt:credits') || '0')) || 0;
    const v = Math.max(0, cur + Math.round(n));
    localStorage.setItem('zjtt:credits', JSON.stringify(v));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return v;
  } catch { return 0; }
}

// ------------------------------------------------------------------ 玩法说明
function openIntro() {
  const intro = $('#intro');
  intro.hidden = false;
  requestAnimationFrame(() => intro.classList.add('on'));
}
$('#introGo').addEventListener('click', () => {
  write('zjtt:block:seen', 1);
  const intro = $('#intro');
  intro.classList.remove('on');
  setTimeout(() => { intro.hidden = true; }, 220);
  audio();
  sfx.pick();
});

// ------------------------------------------------------------------ 主循环
let lastT = 0;
function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, t - (lastT || t));
  lastT = t;
  G.time = t;
  G.clearing = G.clearing.filter((f) => t - f.t0 < 0.36);
  for (const p of G.particles) {
    p.life -= dt;
    p.vy += 620 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.985;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
  for (const f of G.floats) f.life -= dt;
  G.floats = G.floats.filter((f) => f.life > 0);
  G.shake = Math.max(0, G.shake - dt * 3.2);
  G.flash = Math.max(0, G.flash - dt * 2.2);
  paint();
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------------ 输入：拖拽
const drag = { on: false, card: null, el: null, dx: 0, dy: 0 };
G.dragCard = null;

function boardCellAt(clientX, clientY) {
  const rect = cv.getBoundingClientRect();
  const x = clientX - rect.left - B.x;
  const y = clientY - rect.top - B.y;
  return { c: Math.floor(x / B.cell), r: Math.floor(y / B.cell) };
}

function onPick(e, el, card) {
  if (G.over) return;
  if (e.button != null && e.button > 0) return;
  e.preventDefault();
  audio();
  drag.on = true;
  drag.card = card;
  drag.el = el;
  G.dragCard = card;
  el.classList.add('drag');
  const pre = el.querySelector('.pre');
  const box = pre.getBoundingClientRect();
  drag.dx = e.clientX - (box.left + box.width / 2);
  drag.dy = e.clientY - (box.top + box.height / 2);
  sfx.pick();
  updateHover(e.clientX, e.clientY);
  window.addEventListener('pointermove', onMove, { passive: false });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

function updateHover(cx, cy) {
  const card = drag.card;
  if (!card) return;
  const rect = cv.getBoundingClientRect();
  const px = cx - drag.dx - rect.left;
  const py = cy - drag.dy - rect.top;
  let c0 = Math.round((px - B.x) / B.cell - card.sh.cols / 2);
  let r0 = Math.round((py - B.y) / B.cell - card.sh.rows / 2);
  const ok = canPlace(G.board, card.sh, r0, c0);
  G.hover = { r0, c0, ok };
}

function onMove(e) {
  if (!drag.on) return;
  e.preventDefault();
  updateHover(e.clientX, e.clientY);
}

function onUp(e) {
  if (!drag.on) return;
  drag.on = false;
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointercancel', onUp);
  if (drag.el) drag.el.classList.remove('drag');
  const card = drag.card;
  drag.card = null;
  G.dragCard = null;
  const h = G.hover;
  G.hover = null;
  if (card && h && h.ok) {
    if (tryPlace(card, h.r0, h.c0)) return;
  }
  // 没放成：轻轻说一声
  if (card) {
    sfx.bad();
    if (drag.el) {
      drag.el.classList.add('nope');
      setTimeout(() => drag.el && drag.el.classList.remove('nope'), 240);
    }
  }
}

let hintSel = null;

function bindTray() {
  tray.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.hcard');
    if (!el) return;
    const i = Number(el.dataset.i);
    const card = G.cards[i];
    if (!card) return;
    if (!anyPlacement(G.board, card.sh)) {
      showTip('这个形状现在放不下，换一个或换牌');
      sfx.bad();
      return;
    }
    onPick(e, el, card);
  });
  // 键盘：数字键 1/2/3 选中，方向键移动，空格落下（给没有触屏的桌面）
  window.addEventListener('keydown', (e) => {
    if (G.over) return;
    if (e.key >= '1' && e.key <= '3') {
      const i = Number(e.key) - 1;
      const card = G.cards[i];
      if (!card) return;
      const spot = firstFit(card);
      if (spot) tryPlace(card, spot.r, spot.c);
      else { showTip('这个形状现在放不下'); sfx.bad(); }
      e.preventDefault();
    } else if (e.key === 'x' || e.key === 'X') useShuffle();
    else if (e.key === 'q' || e.key === 'Q') useBurst();
    else if (e.key === 'r' || e.key === 'R') { if (!G.started) return; restart(); }
  });
}

// 给键盘玩家找一个能放的位置
function firstFit(card) {
  for (let r0 = 0; r0 <= N - card.sh.rows; r0++) {
    for (let c0 = 0; c0 <= N - card.sh.cols; c0++) {
      if (canPlace(G.board, card.sh, r0, c0)) return { r: r0, c: c0 };
    }
  }
  return null;
}

// 锤子模式：点棋盘上一格
cv.addEventListener('pointerdown', (e) => {
  if (G.over) return;
  audio();
  if (G.tool === 'hammer') {
    const p = boardCellAt(e.clientX, e.clientY);
    if (p.r >= 0 && p.r < N && p.c >= 0 && p.c < N) {
      if (useHammer(p.r, p.c)) return;
    }
    G.tool = '';
    syncTools();
  }
});

// ------------------------------------------------------------------ 按钮
function restart() {
  G.board = emptyBoard();
  G.cards = deal(rng);
  G.score = 0; G.steps = 0; G.combo = 0; G.maxCombo = 0; G.lines = 0;
  G.energy = 0; G.hammer = TOOL_HAMMER; G.shuffle = TOOL_SHUFFLE;
  G.over = false; G.tool = ''; G.clearing = []; G.particles = []; G.floats = [];
  ov.hidden = true;
  ov.classList.remove('on');
  paintTray();
  updateHud();
  save();
  showTip('开局');
}

$('#bHammer').addEventListener('click', () => {
  if (G.hammer <= 0 || G.over) return;
  G.tool = G.tool === 'hammer' ? '' : 'hammer';
  if (G.tool === 'hammer') showTip('点棋盘上任意一空格把方块敲掉');
  syncTools();
});
$('#bShuffle').addEventListener('click', () => { if (!G.over) useShuffle(); });
$('#bBurst').addEventListener('click', () => useBurst());
$('#again').addEventListener('click', restart);
$('#rst').addEventListener('click', () => {
  if (G.over || G.steps === 0) { restart(); return; }
  if (confirm('重新开始？这一局的进度会丢掉。')) restart();
});
$('#snd').addEventListener('click', () => {
  sndOn = !sndOn;
  write(KEY.snd, sndOn ? 1 : 0);
  $('#snd').classList.toggle('off', !sndOn);
  $('#snd').setAttribute('aria-pressed', sndOn ? 'true' : 'false');
  if (sndOn) sfx.pick();
});

// ------------------------------------------------------------------ 启动
const ALL_SHAPES = SHAPES;

function start() {
  layout();
  const resumed = loadSave();
  if (!resumed) {
    G.cards = deal(rng);
  }
  G.started = true;
  paintTray();
  updateHud();
  if (boot) boot.classList.add('gone');
  if (resumed) showTip('接着上一局');
  $('#snd').classList.toggle('off', !sndOn);
  $('#snd').setAttribute('aria-pressed', sndOn ? 'true' : 'false');
  bindTray();
  if (!resumed && readNum('zjtt:block:seen', 0) !== 1) openIntro();
  requestAnimationFrame(loop);
  window.__bootMain = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}

const ro = new ResizeObserver(() => { if (G.started) { layout(); updateHud(); } });
ro.observe(stage);
window.addEventListener('orientationchange', () => setTimeout(() => { if (G.started) layout(); }, 220));

// 无头自测：?_test=1
if (/[?&]_test=1\b/.test(location.search)) {
  window.__block = {
    G, B,
    place: (i, r, c) => { const card = G.cards[i]; return card ? tryPlace(card, r, c) : false; },
    cards: () => G.cards.map((c) => (c ? c.sh.id : null)),
    deal: () => { G.cards = deal(rng); paintTray(); },
    set: (rows) => {
      G.board = rows.map((row) => [...row].map((ch) => (ch === '.' ? null : { k: ch === 'R' ? 0 : (Number(ch) % 3), relic: ch === 'R' })));
      updateHud(); save();
    },
    fill: () => {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) G.board[r][c] = { k: (r + c) % 3, relic: false };
      updateHud(); save();
    },
    burst: () => useBurst(),
    hammer: (r, c) => useHammer(r, c),
    shuffle: () => useShuffle(),
    end: (why) => endGame(why || '测试'),
    state: () => ({
      score: G.score, steps: G.steps, combo: G.combo, energy: G.energy, over: G.over,
      hammer: G.hammer, shuffle: G.shuffle, cards: G.cards.filter(Boolean).length,
      filled: countFilled(G.board), best: readNum(KEY.best, 0),
    }),
    ranks: () => RANKS.map((r) => [r.k, r.at]),
    credit: (s) => creditOf(s),
    win: () => bestWindow(G.board),
    layout: () => ({ x: B.x, y: B.y, cell: B.cell, size: B.size, w: B.w, h: B.h }),
  };
}
