// 「蚀界方块」——盘面上本来就有方块：按住一块左右滑，上面的掉下来补空；
// 松手算一步，底部升起一整行把整盘顶上去；满一行消掉，顶到天花板就结束。
//
// 这一页的约定：
// 1. 背景（夜空、船桅、月亮、浪）全是 canvas 现画，只有在改窗口大小时重绘一次；
//    方块的底色取界域色，块上的圆头像取该界域唤醒体的 Q 版头像（每关四张，进关时预载）。
// 2. 逻辑全在 js/block-core.js，这里只做「把状态画出来 + 把操作翻译成 core 的函数」。
// 3. 棋盘尺寸由容器算，不写死 —— 6 列和 5 列的关要共用同一套布局。
import {
  LEVELS, REALMS, ITEMS, ITEM_BY_ID, SPECIALS,
  newRun, commit, pass, hasMove, useItem, previewMove,
  blockAt, cellsOf, slideRange, rankOf, liveRank, creditOf, progress, levelMods,
} from './block-core.js';

// ------------------------------------------------------------------ 四界域的代表唤醒体
// 每关从每个界域挑一个（按关卡序号轮换），一整局只用这四张头像，
// 所以进关时的图片请求固定是 4 个 —— 一个格子一张图的话，边缘会拖死人。
// 路径写全，不用模板拼接：scripts/build_offline_manifest.mjs 只认文本里出现的字面路径。
const WAKE = {
  0: [
    ['assets/avatars/a-15601.webp', '24'],
    ['assets/avatars/a-15588.webp', '艾尔瓦'],
    ['assets/avatars/a-54117.webp', '哈姆林'],
    ['assets/avatars/a-15571.webp', '珈伦'],
    ['assets/avatars/a-77913.webp', '凯蒂古拉'],
    ['assets/avatars/a-15581.webp', '莉莉'],
  ],
  1: [
    ['assets/avatars/a-15600.webp', '阿格里帕'],
    ['assets/avatars/a-15591.webp', '艾继丝'],
    ['assets/avatars/a-95786.webp', '杜勒赛因'],
    ['assets/avatars/a-15577.webp', '菲茵特'],
    ['assets/avatars/a-15587.webp', '希洛'],
    ['assets/avatars/a-15597.webp', '雷娅'],
  ],
  2: [
    ['assets/avatars/a-15573.webp', '奥瑞塔'],
    ['assets/avatars/a-15594.webp', '凯刻斯'],
    ['assets/avatars/a-15566.webp', '希莱斯特'],
    ['assets/avatars/a-77922.webp', '克珀珊特'],
    ['assets/avatars/a-15575.webp', '法洛思'],
    ['assets/avatars/a-15564.webp', '戈利亚'],
  ],
  3: [
    ['assets/avatars/a-15572.webp', '卡茜亚'],
    ['assets/avatars/a-77923.webp', '卡斯托尔'],
    ['assets/avatars/a-77925.webp', '克莱门汀'],
    ['assets/avatars/a-15590.webp', '达芙黛尔'],
    ['assets/avatars/a-15603.webp', '艾瑞卡'],
    ['assets/avatars/a-15583.webp', '奥尔拉'],
  ],
};

function wakeOf(levelId) {
  return REALMS.map((_, i) => WAKE[i][(levelId - 1) % 6]);
}

// ------------------------------------------------------------------ 小工具
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function readJSON(k, d) {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : d;
  } catch {
    return d;
  }
}
function writeJSON(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch { /* 存不进去不影响玩 */ }
}

// ------------------------------------------------------------------ 音效
// 没有音频文件，全部现场合成。第一次交互时才建 AudioContext（自动播放策略）。
let actx = null;
let sndOn = readJSON('zjtt:block:snd', true);
function audio() {
  if (!actx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (C) actx = new C();
  }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function beep(freq, dur, type, gain) {
  if (!sndOn) return;
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  const t0 = a.currentTime;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain || 0.06, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
const sfx = {
  move: () => beep(320, 0.05, 'square', 0.02),
  drop: () => beep(150, 0.12, 'sine', 0.06),
  // 水顶上来一行：低频往上抬，和落子的「闷响」区分开
  rise() {
    if (!sndOn) return;
    const a2 = audio();
    if (!a2) return;
    const o = a2.createOscillator();
    const g = a2.createGain();
    o.type = 'sine';
    const t0 = a2.currentTime;
    o.frequency.setValueAtTime(110, t0);
    o.frequency.exponentialRampToValueAtTime(190, t0 + 0.22);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
    o.connect(g).connect(a2.destination);
    o.start(t0);
    o.stop(t0 + 0.28);
  },
  slide: () => beep(260, 0.07, 'sine', 0.035),
  nope: () => beep(120, 0.09, 'square', 0.03),
  clear: (n) => {
    beep(380 + n * 70, 0.14, 'triangle', 0.07);
    setTimeout(() => beep(520 + n * 90, 0.16, 'triangle', 0.05), 55);
  },
  item: () => {
    beep(680, 0.1, 'sine', 0.05);
    setTimeout(() => beep(920, 0.12, 'sine', 0.04), 60);
  },
  win: () => [0, 110, 220, 340].forEach((d, i) => setTimeout(() => beep([523, 659, 784, 1047][i], 0.24, 'triangle', 0.06), d)),
  lose: () => [0, 120, 260].forEach((d, i) => setTimeout(() => beep([392, 330, 262][i], 0.3, 'sine', 0.06), d)),
};

// ------------------------------------------------------------------ 状态
const G = {
  lvId: 1,
  st: null,
  mode: 'select', // select | pre | play | over
  imgs: [], // 四张头像
  ready: 0,
  cell: { w: 40, h: 28 },
  board: { x: 0, y: 0, w: 240, h: 340 },
  bg: null,
  parts: [],
  floats: [],
  shake: 0,
  flash: 0,
  aim: null, // 正在瞄准的造物 id
  aimCell: null,
  paused: false,
  drag: null,
  t: 0,
  lastFrame: 0,
  resultShown: false,
  hint: '',
};

const SAVE = 'zjtt:block:v2';
const seenSave = () => readJSON(SAVE, { best: {}, endless: 0, seen: {} });
function saveProgress() {
  const s = seenSave();
  writeJSON(SAVE, s);
  return s;
}

// ------------------------------------------------------------------ 画布
const cv = $('#cv');
const ctx = cv.getContext('2d');

function resize() {
  const box = $('#stage');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(160, box.clientWidth);
  const h = Math.max(200, box.clientHeight);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px';
  cv.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layoutBoard(w, h);
  paintBackdrop(w, h, dpr);
}

function layoutBoard(w, h) {
  const st = G.st;
  const cols = st ? st.cols : 8;
  const rows = st ? st.rows : 12;
  // 棋盘下面留一条「下一行」的预告槽（一格多一点）。
  // 这一版没有手上的方块，玩家唯一的情报就是「下一步水会顶上来什么」，所以这槽必须显眼。
  const padX = 10;
  const padTop = 6;
  const padBottom = 6;
  const nextBands = 1.5;
  const bands = rows + nextBands;
  let cw = (w - padX * 2) / cols;
  let ch = cw * 0.62;
  const maxCh = (h - padTop - padBottom) / bands;
  if (ch > maxCh) {
    // 屏很宽很扁：按高度反推宽度
    ch = maxCh;
    cw = Math.min(cw, ch / 0.62);
  } else {
    // 竖屏还有富余：把格子往上撑，最多撑到 1.22 倍宽，再高就不像方块了
    ch = Math.min(maxCh, cw * 1.22);
  }
  const bw = cw * cols;
  const bh = ch * rows;
  G.cell = { w: cw, h: ch };
  const totalH = bh + ch * nextBands;
  const y0 = padTop + Math.max(0, (h - padTop - padBottom - totalH) / 2);
  G.board = { x: (w - bw) / 2, y: y0, w: bw, h: bh };
  G.nextY = y0 + bh + ch * 0.46;
}

// 棋盘下方那条「下一行」的预告槽。这一版玩家唯一的情报来源就是它 ——
// 下一步水会顶上来什么样的块，全写在这条里。
function drawNextStrip(st, B, cw, ch) {
  const runs = st.next || [];
  const y = G.nextY;
  const hh = ch * 0.78;
  ctx.save();

  // 槽底
  ctx.fillStyle = 'rgba(12,22,44,.62)';
  roundRect(ctx, B.x - 2, y - 2, B.w + 4, hh + 4, 9);
  ctx.fill();
  // 上缘画一道虚线：这条不是棋盘的一部分，是「马上就要顶上来」的一行
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = st.over || st.win ? 'rgba(110,168,255,.10)' : 'rgba(126,186,255,.42)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(B.x, y - 0.5);
  ctx.lineTo(B.x + B.w, y - 0.5);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = st.over || st.win ? 'rgba(110,168,255,.08)' : 'rgba(110,168,255,.16)';
  ctx.lineWidth = 1;
  roundRect(ctx, B.x - 2, y - 2, B.w + 4, hh + 4, 9);
  ctx.stroke();

  // 左边一个小箭头，示意「从这儿顶上来」
  const ax = B.x - cw * 0.52;
  if (ax > 2) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = '#9ed4ff';
    ctx.beginPath();
    ctx.moveTo(ax - cw * 0.16, y + hh * 0.68);
    ctx.lineTo(ax + cw * 0.16, y + hh * 0.68);
    ctx.lineTo(ax, y + hh * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  for (const run of runs) {
    const bid = 0;
    void bid;
    for (let i = 0; i < run.len; i++) {
      const c = run.c0 + i;
      if (c < 0 || c >= st.cols) continue;
      drawBlockCell(ctx, B.x + c * cw, y, cw, hh,
        run.sp === 'prism' ? -1 : run.k, run.sp,
        { alpha: st.over || st.win ? 0.3 : 0.68, ghost: false, jl: i > 0, jr: i < run.len - 1 });
    }
  }
  ctx.restore();
}

// 背景只在尺寸变化时重画一次（每帧重画这些渐变太费）
function paintBackdrop(w, h, dpr) {
  const c = G.bg || (G.bg = document.createElement('canvas'));
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = g.createLinearGradient(0, 0, w * 0.3, h);
  sky.addColorStop(0, '#060b1e');
  sky.addColorStop(0.45, '#0f1a3d');
  sky.addColorStop(0.78, '#182750');
  sky.addColorStop(1, '#14203a');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  let seed = 20261103;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 80; i++) {
    const x = rnd() * w;
    const y = rnd() * h * 0.8;
    const r = rnd() * 1.3 + 0.3;
    g.globalAlpha = 0.12 + rnd() * 0.42;
    g.fillStyle = '#cfe1ff';
    g.beginPath();
    g.arc(x, y, r, 0, 7);
    g.fill();
  }
  g.globalAlpha = 1;

  const mx = w * 0.78;
  const my = h * 0.12;
  const mr = Math.max(22, Math.min(w * 0.08, 46));
  const halo = g.createRadialGradient(mx, my, mr * 0.4, mx, my, mr * 3.4);
  halo.addColorStop(0, 'rgba(206,230,255,.5)');
  halo.addColorStop(0.34, 'rgba(150,196,255,.16)');
  halo.addColorStop(1, 'rgba(120,170,255,0)');
  g.fillStyle = halo;
  g.beginPath();
  g.arc(mx, my, mr * 3.4, 0, 7);
  g.fill();
  const moon = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  moon.addColorStop(0, '#ffffff');
  moon.addColorStop(0.7, '#dfeaff');
  moon.addColorStop(1, '#b3c8ee');
  g.fillStyle = moon;
  g.beginPath();
  g.arc(mx, my, mr, 0, 7);
  g.fill();

  // 船桅剪影
  g.save();
  g.globalAlpha = 0.5;
  g.strokeStyle = '#080f22';
  g.lineCap = 'round';
  const mastX = w * 0.34;
  g.lineWidth = Math.max(6, w * 0.024);
  g.beginPath();
  g.moveTo(mastX, h * 0.05);
  g.lineTo(mastX - w * 0.012, h);
  g.stroke();
  g.lineWidth = Math.max(2.5, w * 0.01);
  for (let i = 0; i < 4; i++) {
    const y = h * (0.3 + i * 0.11);
    const halfW = w * (0.08 + i * 0.024);
    g.beginPath();
    g.moveTo(mastX, y);
    g.lineTo(mastX - halfW, y + h * 0.028);
    g.stroke();
    g.beginPath();
    g.moveTo(mastX, y);
    g.lineTo(mastX + halfW, y + h * 0.028);
    g.stroke();
  }
  g.restore();

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
  wave(h * 0.9, h * 0.024, 0.45, '#0b1730');
  wave(h * 0.94, h * 0.018, 0.6, '#0e1d3b');
  wave(h * 0.975, h * 0.012, 0.8, '#122446');
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------ 画的零件
function roundRect(g, x, y, w, h, r) {
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

// 左右两侧可以各自「接上邻格」（接上的那一侧不留缝、不倒角）：同一块的几格画成一整条，一眼看出是几格
function blockRect(g, x, y, w, h, r, jl, jr) {
  if (!jl && !jr) { roundRect(g, x, y, w, h, r); return; }
  const rr = clamp(r, 0, Math.min(w, h) / 2);
  const a = jl ? 0 : rr, b = jr ? 0 : rr;
  g.beginPath();
  g.moveTo(x + a, y);
  g.lineTo(x + w - b, y);
  if (b) g.arcTo(x + w, y, x + w, y + h, b); else g.lineTo(x + w, y);
  if (b) g.arcTo(x + w, y + h, x, y + h, b); else g.lineTo(x + w, y + h);
  g.lineTo(x + a, y + h);
  if (a) g.arcTo(x, y + h, x, y, a); else g.lineTo(x, y + h);
  if (a) g.arcTo(x, y, x + w, y, a); else g.lineTo(x, y);
  g.closePath();
}

// 棱彩走彩虹，其余走界域色
function realmColors(idx) {
  if (idx < 0 || idx >= REALMS.length) return { c: '#cfd6e6', d: '#5a6478', l: '#ffffff' };
  const r = REALMS[idx];
  return { c: r.c, d: r.d, l: r.l };
}

// 一格方块：底色 + 上缘高光 + 头像 + 特殊块标记
function drawBlockCell(g, x, y, cw, ch, realm, sp, opt) {
  const o = opt || {};
  const jl = !!o.jl, jr = !!o.jr;                          // 左 / 右接着同一块的邻格
  const pad = Math.min(cw, ch) * 0.09;                     // 块与块之间的缝（同色相邻也要看得出是两块）
  const bx = x + (jl ? 0 : pad);
  const by = y + pad;
  const bw = cw - (jl ? 0 : pad) - (jr ? 0 : pad);
  const bh = ch - pad * 2;
  const rad = Math.min(cw - pad * 2, bh) * 0.26;
  const col = realmColors(realm);
  const alpha = o.alpha == null ? 1 : o.alpha;

  g.save();
  g.globalAlpha = alpha;

  // 影子
  if (!o.ghost) {
    g.fillStyle = 'rgba(2,6,16,.4)';
    blockRect(g, bx + 1, by + 2.5, bw, bh, rad, jl, jr);
    g.fill();
  }

  // 主体：上亮下暗的两段
  const grd = g.createLinearGradient(bx, by, bx, by + bh);
  grd.addColorStop(0, col.l);
  grd.addColorStop(0.42, col.c);
  grd.addColorStop(1, col.d);
  g.fillStyle = grd;
  blockRect(g, bx, by, bw, bh, rad, jl, jr);
  g.fill();
  // 描一圈深色细边，把「这一整条」和邻块分开
  g.globalAlpha = alpha * 0.55;
  g.strokeStyle = col.d;
  g.lineWidth = 1.3;
  g.save();
  g.beginPath();
  g.rect(jl ? bx + 1 : bx - 3, by - 3, bw + (jl ? -1 : 3) + (jr ? -1 : 3), bh + 6);   // 接缝那一侧的描边裁掉，几格才连成一整条
  g.clip();
  blockRect(g, bx, by, bw, bh, rad, jl, jr);
  g.stroke();
  g.restore();
  g.globalAlpha = alpha;

  if (realm < 0) {
    // 棱彩：斜着扫一道彩带
    g.save();
    blockRect(g, bx, by, bw, bh, rad, jl, jr);
    g.clip();
    const rb = g.createLinearGradient(bx, by, bx + bw, by + bh);
    rb.addColorStop(0, 'rgba(255,120,150,.85)');
    rb.addColorStop(0.35, 'rgba(150,210,255,.85)');
    rb.addColorStop(0.7, 'rgba(180,255,190,.85)');
    rb.addColorStop(1, 'rgba(255,235,150,.85)');
    g.globalAlpha = alpha * 0.55;
    g.fillStyle = rb;
    g.fillRect(bx, by, bw, bh);
    g.restore();
  }

  // 上缘高光
  g.globalAlpha = alpha * 0.55;
  g.fillStyle = 'rgba(255,255,255,.5)';
  const hl = jl ? 0 : bw * 0.1, hr = jr ? 0 : bw * 0.1;
  blockRect(g, bx + hl, by + bh * 0.09, bw - hl - hr, bh * 0.26, rad * 0.7, jl, jr);
  g.fill();
  g.globalAlpha = alpha;

  // 头像：圆形裁切，贴在格子正中
  const img = G.imgs[clamp(realm, 0, 3)];
  const d = Math.min(bw, bh) * 0.62;
  const cx = bx + bw / 2;
  const cy = by + bh * 0.58;
  if (img && img.ok && !o.ghost) {
    g.save();
    g.beginPath();
    g.arc(cx, cy, d / 2, 0, 7);
    g.clip();
    g.globalAlpha = alpha;
    g.drawImage(img, cx - d / 2, cy - d / 2, d, d);
    g.restore();
    // 头像外圈
    g.globalAlpha = alpha * 0.8;
    g.strokeStyle = 'rgba(255,255,255,.5)';
    g.lineWidth = Math.max(1, d * 0.05);
    g.beginPath();
    g.arc(cx, cy, d / 2, 0, 7);
    g.stroke();
  } else if (!o.ghost) {
    // 图还没到，先画个界域符号顶着，不要留空洞
    g.globalAlpha = alpha * 0.85;
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath();
    g.arc(cx, cy, d * 0.28, 0, 7);
    g.fill();
  }
  g.globalAlpha = alpha;

  // 特殊块标记
  if (sp === 'crystal') {
    g.globalAlpha = alpha * 0.9;
    g.strokeStyle = 'rgba(190,235,255,.95)';
    g.lineWidth = Math.max(1.4, bw * 0.07);
    roundRect(g, bx + bw * 0.06, by + bh * 0.08, bw * 0.88, bh * 0.84, rad * 0.8);
    g.stroke();
    // 两个角上点几粒冰碴
    g.fillStyle = 'rgba(220,245,255,.9)';
    for (const [px, py] of [[0.14, 0.2], [0.86, 0.26], [0.2, 0.84]]) {
      g.beginPath();
      g.arc(bx + bw * px, by + bh * py, Math.max(1, bw * 0.045), 0, 7);
      g.fill();
    }
  } else if (sp === 'bomb') {
    // 彩色底上直接画亮黄线看不清，先垫一层深色再画
    const sx = bx + bw * 0.2;
    const sy = by + bh * 0.22;
    const r = Math.min(bw, bh) * 0.2;
    g.globalAlpha = alpha * 0.72;
    g.fillStyle = 'rgba(12,6,4,.72)';
    g.beginPath();
    g.arc(sx, sy, r * 1.25, 0, 7);
    g.fill();
    g.globalAlpha = alpha;
    g.strokeStyle = '#ffd07a';
    g.lineWidth = Math.max(1.2, Math.min(bw, bh) * 0.055);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.beginPath();
      g.moveTo(sx + Math.cos(a) * r * 0.34, sy + Math.sin(a) * r * 0.34);
      g.lineTo(sx + Math.cos(a) * r, sy + Math.sin(a) * r);
      g.stroke();
    }
  } else if (sp === 'line') {
    g.globalAlpha = alpha * 0.8;
    const lw = Math.max(1.6, Math.min(bw, bh) * 0.1);
    // 先用深色描一遍，再叠亮线，任何底色上都看得见
    g.strokeStyle = 'rgba(8,14,26,.62)';
    g.lineWidth = lw * 2.1;
    g.beginPath();
    g.moveTo(bx + bw * 0.14, by + bh * 0.82);
    g.lineTo(bx + bw * 0.86, by + bh * 0.82);
    g.moveTo(bx + bw * 0.84, by + bh * 0.14);
    g.lineTo(bx + bw * 0.84, by + bh * 0.86);
    g.stroke();
    g.globalAlpha = alpha;
    g.strokeStyle = '#d6f2ff';
    g.lineWidth = lw;
    g.beginPath();
    g.moveTo(bx + bw * 0.14, by + bh * 0.82);
    g.lineTo(bx + bw * 0.86, by + bh * 0.82);
    g.moveTo(bx + bw * 0.84, by + bh * 0.14);
    g.lineTo(bx + bw * 0.84, by + bh * 0.86);
    g.stroke();
  } else if (sp === 'prism') {
    g.globalAlpha = alpha * 0.95;
    g.fillStyle = 'rgba(255,255,255,.92)';
    const sx = bx + bw * 0.76;
    const sy = by + bh * 0.2;
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 ? bw * 0.05 : bw * 0.11;
      const px = sx + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.closePath();
    g.fill();
  }

  g.restore();
}

// 这一格落下去之后，它所在的那一行会不会满？只用于描色提示，不追求精确
// （特殊块的连锁不算在内）。
// ------------------------------------------------------------------ 主绘制
function draw() {
  const st = G.st;
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  ctx.clearRect(0, 0, w, h);
  if (G.bg) ctx.drawImage(G.bg, 0, 0, w, h);
  if (!st) return;

  const { w: cw, h: ch } = G.cell;
  const B = G.board;

  // 震动
  let sx = 0;
  let sy = 0;
  if (G.shake > 0) {
    sx = (Math.random() - 0.5) * G.shake * 8;
    sy = (Math.random() - 0.5) * G.shake * 8;
  }
  ctx.save();
  ctx.translate(sx, sy);

  // 棋盘底
  ctx.save();
  ctx.fillStyle = 'rgba(9,16,34,.62)';
  roundRect(ctx, B.x - 3, B.y - 3, B.w + 6, B.h + 6, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,168,255,.28)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, B.x - 3, B.y - 3, B.w + 6, B.h + 6, 10);
  ctx.stroke();
  ctx.restore();

  // 网格
  ctx.save();
  ctx.strokeStyle = 'rgba(120,170,240,.10)';
  ctx.lineWidth = 1;
  for (let c = 1; c < st.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(B.x + c * cw, B.y);
    ctx.lineTo(B.x + c * cw, B.y + B.h);
    ctx.stroke();
  }
  for (let r = 1; r < st.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(B.x, B.y + r * ch);
    ctx.lineTo(B.x + B.w, B.y + r * ch);
    ctx.stroke();
  }
  ctx.restore();

  // 盘面上的方块
  const drag = G.drag && !st.over && !st.win ? G.drag : null;
  const dragBid = drag ? drag.bid : null;
  const offX = drag ? drag.dx * cw : 0;

  // 松手会消哪几行 —— 提前描出来，不然玩家没法判断这一下值不值
  let willClear = [];
  if (drag && drag.dx) {
    willClear = previewMove(st, drag.bid, drag.dx).rows;
  }
  if (willClear.length) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,214,130,.10)';
    for (const r of willClear) ctx.fillRect(B.x, B.y + r * ch, B.w, ch);
    ctx.restore();
  }

  for (let r = 0; r < st.rows; r++) {
    for (let c = 0; c < st.cols; c++) {
      const cell = st.board[r][c];
      if (!cell) continue;
      const isDrag = dragBid != null && cell.b === dragBid;
      const jl = c > 0 && st.board[r][c - 1] && st.board[r][c - 1].b === cell.b;
      const jr = c < st.cols - 1 && st.board[r][c + 1] && st.board[r][c + 1].b === cell.b;
      drawBlockCell(ctx, B.x + c * cw + (isDrag ? offX : 0), B.y + r * ch, cw, ch, cell.k, cell.sp, { jl, jr });
    }
  }

  // 拖着的这一块：四周描一圈，再画出它能挪到的范围
  if (drag) {
    const cs = cellsOf(st, drag.bid);
    if (cs.length) {
      const r = cs[0].r;
      const c0 = Math.min(...cs.map((x) => x.c)) + drag.dx;
      const c1 = Math.max(...cs.map((x) => x.c)) + drag.dx;
      ctx.save();
      ctx.strokeStyle = willClear.length ? 'rgba(255,214,130,.95)' : 'rgba(190,236,255,.95)';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = 'rgba(150,220,255,.55)';
      ctx.shadowBlur = 8;
      roundRect(ctx, B.x + c0 * cw + 1.5, B.y + r * ch + 1.5, (c1 - c0 + 1) * cw - 3, ch - 3, Math.min(cw, ch) * 0.24);
      ctx.stroke();
      ctx.restore();

      // 左右还能推多远：两头各画一条虚线
      const oc0 = Math.min(...cs.map((x) => x.c));
      const oc1 = Math.max(...cs.map((x) => x.c));
      ctx.save();
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(160,210,255,.45)';
      if (drag.lim.left) {
        const x0 = B.x + (oc0 - drag.lim.left) * cw;
        ctx.beginPath();
        ctx.moveTo(x0 + 3, B.y + r * ch + ch * 0.5);
        ctx.lineTo(B.x + oc0 * cw - 3, B.y + r * ch + ch * 0.5);
        ctx.stroke();
      }
      if (drag.lim.right) {
        const x1 = B.x + (oc1 + 1 + drag.lim.right) * cw;
        ctx.beginPath();
        ctx.moveTo(B.x + (oc1 + 1) * cw + 3, B.y + r * ch + ch * 0.5);
        ctx.lineTo(x1 - 3, B.y + r * ch + ch * 0.5);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  // 棋盘下方：下一行的预告
  drawNextStrip(st, B, cw, ch);

  // 瞄准格
  if (G.aim && G.aimCell) {
    const { r, c } = G.aimCell;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,236,150,.95)';
    ctx.lineWidth = 2;
    const spread = G.aim === 'bomb' ? 1 : 0;
    for (let dr = -spread; dr <= spread; dr++) {
      for (let dc = -spread; dc <= spread; dc++) {
        const rr = r + dr;
        const cc = c + dc;
        if (rr < 0 || rr >= st.rows || cc < 0 || cc >= st.cols) continue;
        roundRect(ctx, B.x + cc * cw + 2, B.y + rr * ch + 2, cw - 4, ch - 4, 5);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  ctx.restore();

  // 粒子
  for (const p of G.parts) {
    ctx.save();
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.c;
    const s = p.s * (0.4 + (p.life / p.max) * 0.6);
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, 7);
    ctx.fill();
    ctx.restore();
  }

  // 飘字
  for (const f of G.floats) {
    ctx.save();
    const k = 1 - f.life / f.max;
    ctx.globalAlpha = clamp(1 - k * k, 0, 1);
    ctx.fillStyle = f.c;
    ctx.font = `700 ${f.size}px "PingFang SC",system-ui,sans-serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y - k * 34);
    ctx.restore();
  }

  // 连消大字
  if (G.comboText && G.comboText.life > 0) {
    const f = G.comboText;
    const k = 1 - f.life / f.max;
    ctx.save();
    ctx.globalAlpha = clamp(1.6 - k * 2.2, 0, 1);
    ctx.textAlign = 'center';
    const scale = 1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.18;
    ctx.translate(w / 2, B.y + B.h * 0.42);
    ctx.scale(scale, scale);
    ctx.font = '900 30px "PingFang SC",system-ui,sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(6,10,22,.75)';
    ctx.strokeText(f.text, 0, 0);
    ctx.fillStyle = f.c;
    ctx.fillText(f.text, 0, 0);
    ctx.restore();
  }

}

// ------------------------------------------------------------------ 特效
function burst(r, c, realm) {
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  const x = B.x + c * cw + cw / 2;
  const y = B.y + r * ch + ch / 2;
  const col = realmColors(realm);
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = 40 + Math.random() * 130;
    G.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
      s: 1.4 + Math.random() * 2.6, c: i % 3 === 0 ? '#ffffff' : (i % 3 === 1 ? col.c : col.l),
      life: 0.42 + Math.random() * 0.3, max: 0.72,
    });
  }
}

function pushFloat(x, y, text, color, size) {
  G.floats.push({ x, y, text, c: color, size: size || 18, life: 0.9, max: 0.9 });
}

// 把 core 记下的 fx 变成看得见的东西
function drainFx() {
  const st = G.st;
  if (!st || !st.fx.length) return;
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  for (const e of st.fx) {
    if (e.k === 'clear') {
      for (const x of e.cells) burst(x.r, x.c, x.k);
      const topRow = Math.min(...e.rows);
      const gain = e.gain + (e.resonate ? e.resonate * 200 : 0);
      pushFloat(B.x + B.w / 2, B.y + topRow * ch + ch * 0.4, '+' + gain, e.resonate ? '#ffd7a8' : '#ffe9a8', 20);
      if (e.combo > 1 || e.resonate) {
        G.comboText = {
          text: e.resonate ? `${e.combo > 1 ? 'COMBO ' + e.combo : ''}${e.resonate ? ' 共鸣' : ''}`.trim() : 'COMBO ' + e.combo,
          c: e.resonate ? '#ffcf7a' : '#a9d8ff',
          life: 0.75,
          max: 0.75,
        };
      }
      G.shake = Math.min(1, 0.35 + e.rows.length * 0.2);
    } else if (e.k === 'item') {
      sfx.item();
      const it = ITEM_BY_ID[e.id];
      if (it) pushFloat(B.x + B.w - 24, B.y + B.h - 20, it.n, '#bff0c6', 14);
    } else if (e.k === 'crack' || e.k === 'boom') {
      burst(e.r, e.c, -1);
      G.shake = Math.max(G.shake, 0.3);
      sfx.drop();
    } else if (e.k === 'rise') {
      // 底下顶上来一整行：贴着棋盘底边冒一串水泡
      sfx.rise();
      const y = B.y + B.h;
      for (let i = 0; i < 14; i++) {
        G.parts.push({
          x: B.x + Math.random() * B.w,
          y,
          vx: (Math.random() - 0.5) * 50,
          vy: -70 - Math.random() * 110,
          s: 1.2 + Math.random() * 2,
          c: i % 2 ? '#cfeaff' : '#8fc8ff',
          life: 0.45 + Math.random() * 0.3,
          max: 0.75,
        });
      }
    } else if (e.k === 'surge') {
      G.shake = Math.max(G.shake, 0.5);
      pushFloat(B.x + B.w / 2, B.y + B.h - ch * 0.6, '水又涨了一格', '#9ed4ff', 15);
    } else if (e.k === 'reroll') {
      pushFloat(B.x + B.w / 2, G.nextY + ch * 0.3, '重抽', '#bff0c6', 14);
    } else if (e.k === 'win') {
      sfx.win();
      finish(true);
    } else if (e.k === 'over') {
      sfx.lose();
      finish(false);
    }
  }
  st.fx.length = 0;
}

function frame(now) {
  const dt = Math.min(0.05, (now - (G.lastFrame || now)) / 1000);
  G.lastFrame = now;
  G.t += dt;

  if (G.st && G.mode === 'play' && !G.paused) {
    // 这一版没有时间流逝：不松手就一动不动，状态只会被玩家的操作改变
    drainFx();
  }

  // 粒子与飘字
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      G.parts.splice(i, 1);
      continue;
    }
    p.vy += 620 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = G.floats.length - 1; i >= 0; i--) {
    G.floats[i].life -= dt;
    if (G.floats[i].life <= 0) G.floats.splice(i, 1);
  }
  if (G.comboText) {
    G.comboText.life -= dt;
    if (G.comboText.life <= 0) G.comboText = null;
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 3);

  draw();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ HUD
let hudCache = {};
function syncHud() {
  const st = G.st;
  if (!st) return;
  // 结算之后 HUD 不再刷新，这里直接用最终评级，免得顶上还挂着实时的 B
  const rk = st.over || st.win ? rankOf(st) : liveRank(st);
  if (hudCache.rank !== rk) {
    hudCache.rank = rk;
    const el = $('#rank');
    el.textContent = rk;
    el.dataset.k = rk;
  }
  if (hudCache.score !== st.score) {
    hudCache.score = st.score;
    $('#score').textContent = st.score.toLocaleString('en-US');
  }
  if (hudCache.lines !== st.lines) {
    hudCache.lines = st.lines;
    $('#goalTxt').textContent = st.goal ? `${st.lines} / ${st.goal}` : `${st.lines}`;
    $('#goalBar').style.width = (st.goal ? Math.min(100, (st.lines / st.goal) * 100) : Math.min(100, (st.lines / 45) * 100)) + '%';
  }
  if (hudCache.moves !== st.moves || hudCache.maxMoves !== st.maxMoves) {
    hudCache.moves = st.moves;
    hudCache.maxMoves = st.maxMoves;
    $('#moveTxt').textContent = st.maxMoves ? `${st.moves} / ${st.maxMoves}` : `${st.moves}`;
  }
  const key = st.items.join(',') + '|' + JSON.stringify(st.next);
  if (hudCache.items !== key) {
    hudCache.items = key;
    paintItems();
    }
}

function paintItems() {
  const st = G.st;
  const bar = $('#itemBar');
  if (!st) return;
  bar.innerHTML = '';
  for (let i = 0; i < st.itemCap; i++) {
    const id = st.items[i];
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'slot' + (id ? ' has' : '') + (G.aim === id ? ' on' : '');
    if (id) {
      const it = ITEM_BY_ID[id];
      slot.title = `${it.n}：${it.d}`;
      slot.innerHTML = `<span class="ic ic-${it.icon}"></span>`;
      slot.addEventListener('click', () => tapItem(id));
    } else {
      slot.disabled = true;
    }
    bar.appendChild(slot);
  }
}

// ------------------------------------------------------------------ 交互
function cellFromPoint(clientX, clientY) {
  const rect = cv.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const B = G.board;
  const { w: cw, h: ch } = G.cell;
  const c = Math.floor((x - B.x) / cw);
  const r = Math.floor((y - B.y) / ch);
  if (r < 0 || r >= (G.st ? G.st.rows : 0) || c < 0 || c >= (G.st ? G.st.cols : 0)) return null;
  return { r, c, x, y };
}

function tapItem(id) {
  const st = G.st;
  if (!st || st.over || G.mode !== 'play') return;
  const it = ITEM_BY_ID[id];
  if (!it) return;
  audio();
  if (it.aim) {
    G.aim = G.aim === id ? null : id;
    G.aimCell = null;
    paintItems();
    showTip(G.aim ? '点棋盘上要用它的位置' : '');
    return;
  }
  if (useItem(st, id, -1, -1)) {
    G.aim = null;
    paintItems();
    drainFx();
    draw();
  }
}

function stageDown(e) {
  const st = G.st;
  if (!st || G.mode !== 'play' || st.over || st.win || G.paused) return;
  audio();
  const pt = e.touches ? e.touches[0] : e;
  try { if (cv.setPointerCapture && e.pointerId != null) cv.setPointerCapture(e.pointerId); } catch { /* 合成事件没有有效 id */ }

  // 瞄准模式：这一下直接落子
  if (G.aim) {
    const cell = cellFromPoint(pt.clientX, pt.clientY);
    if (cell && useItem(st, G.aim, cell.r, cell.c)) {
      G.aim = null;
      G.aimCell = null;
      paintItems();
      drainFx();
      afterMove();
    }
    return;
  }

  // 一个能推的块都没有：这一下就让水顶上来一行，不然就死局了
  if (!hasMove(st)) {
    if (pass(st)) {
      sfx.rise();
      showTip('没有能推的块了，水顶上来一行');
      drainFx();
      afterMove();
    }
    return;
  }

  const p = cellFromPoint(pt.clientX, pt.clientY);
  if (!p) return;
  const bid = blockAt(st, p.r, p.c);
  if (bid == null) return;
  const lim = slideRange(st, bid);
  if (lim.locked) {
    showTip('这块带锚，推不动');
    sfx.nope();
    return;
  }
  if (!lim.left && !lim.right) {
    showTip('左右都堵死了，换一块');
    sfx.nope();
    return;
  }
  G.drag = { bid, r: p.r, x0: pt.clientX, dx: 0, lim, moved: 0 };
  draw();
}

// 手一横过来就换算成「挪几格」，一路夹在 slideRange 的范围里，不会穿墙
function stageMove(e) {
  const st = G.st;
  if (!st) return;
  const pt = e.touches ? e.touches[0] : e;
  if (G.aim) {
    G.aimCell = cellFromPoint(pt.clientX, pt.clientY);
    return;
  }
  const d = G.drag;
  if (!d || st.over || st.win) return;
  const px = pt.clientX - d.x0;
  const want = Math.round(px / (G.cell.w * 0.68));
  const nx = clamp(want, -d.lim.left, d.lim.right);
  if (nx !== d.dx) {
    d.dx = nx;
    if (nx !== d.moved) sfx.move();
    draw();
  }
}

function stageUp() {
  const st = G.st;
  const d = G.drag;
  G.drag = null;
  if (!st || !d) { draw(); return; }
  if (G.mode !== 'play' || G.paused) { draw(); return; }
  if (!d.dx) { draw(); return; }

  const before = st.lines;
  const res = commit(st, d.bid, d.dx);
  G.drag = null;
  if (!res.ok) { draw(); return; }

  if (st.lines > before) { sfx.clear(); G.shake = Math.max(G.shake, 0.55); }
  else sfx.slide();
  drainFx();
  afterMove();
}

// 一步之后的收尾：刷 HUD、看看要不要结算
function afterMove() {
  const st = G.st;
  paintItems();
  syncHud();
  draw();
  if (st && (st.win || st.over)) finish(st.win);
}

function bindStage() {
  cv.addEventListener('pointerdown', stageDown);
  cv.addEventListener('pointermove', stageMove);
  cv.addEventListener('pointerup', stageUp);
  cv.addEventListener('pointercancel', stageUp);
  // 注意别再绑 pointerleave：手指擦出画布就松手，会白走一步
  // 触屏上 pointer 事件也要 preventDefault，否则会跟着滚页面
  cv.addEventListener('touchstart', (e) => { if (G.mode === 'play') e.preventDefault(); }, { passive: false });
  cv.addEventListener('touchmove', (e) => { if (G.mode === 'play') e.preventDefault(); }, { passive: false });

  window.addEventListener('keydown', (e) => {
    const st = G.st;
    if (!st || G.mode !== 'play' || G.paused) return;
    if (e.key === 'p' || e.key === 'P') { togglePause(); e.preventDefault(); }
  });
}

// ------------------------------------------------------------------ 提示
// 提示走底部那一行（关卡名与提示交替），不浮在棋盘上 —— 小屏浮条会压住最底一行。
let tipTimer = 0;
let baseName = '';
function showTip(text) {
  const el = $('#lvName');
  if (!el) return;
  clearTimeout(tipTimer);
  if (!text) {
    el.textContent = baseName;
    el.classList.remove('hl');
    return;
  }
  el.textContent = text;
  el.classList.add('hl');
  tipTimer = setTimeout(() => {
    el.textContent = baseName;
    el.classList.remove('hl');
  }, 2600);
}

// ------------------------------------------------------------------ 关卡选择 / 开战
function paintSelect() {
  const data = seenSave();
  const list = $('#lvList');
  list.innerHTML = '';
  // 前三关默认开着：新玩家可以先试试「落影」「涨潮」再决定从哪关啃；
  // 后面一律要前一关过了才开，无尽关要十二关全通。
  let unlocked = true;
  for (const lv of LEVELS) {
    const best = data.best[lv.id];
    const isEndless = lv.endless;
    const open = lv.id <= 3 || unlocked || !!best;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'lv' + (open ? '' : ' lock') + (isEndless ? ' endless' : '');
    card.dataset.id = lv.id;
    if (!open) card.disabled = true;
    const mods = levelMods(lv);
    const tags = [];
    if (mods.hard) tags.push('结晶');
    if (mods.lock) tags.push('锚定');
    if (mods.surge) tags.push('自涨');
    if (lv.cols === 5) tags.push('五列');
    card.innerHTML = `
      <span class="no">${isEndless ? '∞' : String(lv.id).padStart(2, '0')}</span>
      <span class="meta">
        <b>${lv.t}</b>
        <i>${lv.sub}</i>
        <em>${isEndless ? `最高 ${data.endless || 0} 行` : `目标 ${lv.goal} 行 · ${lv.moves} 回合`}${tags.length ? ' · ' + tags.join('/') : ''}</em>
      </span>
      <span class="rk">${best ? `<b data-k="${best}">${best}</b>` : open ? '<b class="none">—</b>' : '锁'}</span>
    `;
    card.addEventListener('click', () => openPre(lv.id));
    list.appendChild(card);
    if (!best && !isEndless) unlocked = false;
  }
}

function openPre(id) {
  const lv = LEVELS.find((x) => x.id === id);
  if (!lv) return;
  G.lvId = id;
  audio();
  G.mode = 'pre';
  $('#scrSelect').hidden = true;
  $('#scrPre').hidden = false;

  $('#preTitle').textContent = lv.t;
  $('#preSub').textContent = lv.sub;
  $('#preGoal').textContent = lv.endless ? '不限' : `${lv.goal} 行`;
  $('#preMoves').textContent = lv.endless ? '不限' : `${lv.moves} 回合`;

  // 机制
  const modsBox = $('#preMods');
  modsBox.innerHTML = '';
  const mods = levelMods(lv);
  const modList = [];
  modList.push(['每行填几成', `新顶上来的那一行大概占 ${Math.round((lv.cover || 0.6) * 100)}%，剩下的是留给你补的空。`]);
  if (mods.hard) modList.push(['结晶', `新块有 ${Math.round(mods.hard * 100)}% 概率带壳，要消两次才碎，第一次只裂开。`]);
  if (mods.lock) modList.push(['锚定', `新块有 ${Math.round(mods.lock * 100)}% 概率带锚，推不动，只能等它下面腾空让它掉下去。`]);
  if (mods.surge) modList.push(['自涨', `每 ${mods.surge} 回合额外顶上来一行（不占你的回合）。`]);
  if (!mods.hard && !mods.lock && !mods.surge) modList.push(['无附加机制', '这一关只看你消得快不快。']);
  for (const [n, d] of modList) {
    const el = document.createElement('div');
    el.className = 'mod';
    el.innerHTML = `<b>${n}</b><p>${d}</p>`;
    modsBox.appendChild(el);
  }

  // 特殊块图鉴：这一版没有「形状预告」了，改成把会遇到的特殊块摆出来
  const pBox = $('#prePieces');
  pBox.innerHTML = '';
  const shown = ['crystal', 'bomb', 'line', 'prism', 'lock'];
  shown.forEach((sid, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'pc';
    const c = document.createElement('canvas');
    c.width = 96;
    c.height = 96;
    c.style.width = '48px';
    c.style.height = '48px';
    const g = c.getContext('2d');
    g.scale(2, 2);
    drawBlockCell(g, 9, 12, 30, 24, i % 4, sid, null);
    wrap.appendChild(c);
    const lab = document.createElement('span');
    lab.textContent = SPECIALS[sid].n;
    wrap.appendChild(lab);
    wrap.title = SPECIALS[sid].d;
    pBox.appendChild(wrap);
  });

  const wake = wakeOf(id);

  // 道具预告
  const iBox = $('#preItems');
  iBox.innerHTML = '';
  for (const it of ITEMS) {
    const el = document.createElement('div');
    el.className = 'pi';
    el.title = it.d;
    el.innerHTML = `<span class="ic ic-${it.icon}"></span><b>${it.n}</b>`;
    iBox.appendChild(el);
  }

  // 出战角色
  const wBox = $('#preWake');
  wBox.innerHTML = '';
  wake.forEach(([wid, name], i) => {
    const el = document.createElement('div');
    el.className = 'wk';
    el.innerHTML = `<img src="${wid}" alt="" width="34" height="34" loading="eager" decoding="async"><span>${name}</span>`;
    el.style.setProperty('--rc', REALMS[i].c);
    wBox.appendChild(el);
  });

  $('#preTip').textContent = lv.tip || '';
}

function startRun() {
  const lv = LEVELS.find((x) => x.id === G.lvId);
  if (!lv) return;
  audio();
  $('#scrSelect').hidden = true;
  $('#scrPre').hidden = true;
  $('#scrPlay').hidden = false;
  G.mode = 'play';
  G.paused = false;
  G.resultShown = false;
  G.parts.length = 0;
  G.floats.length = 0;
  G.comboText = null;
  G.aim = null;
  G.shake = 0;
  hudCache = {};
  G.st = newRun(lv.id, (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);

  // 四张头像先挂上，loaded 之后重画
  G.imgs = [];
  G.ready = 0;
  wakeOf(lv.id).forEach(([src], i) => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => {
      im.ok = true;
      G.ready++;
      draw();
    };
    im.onerror = () => { G.ready++; };
    im.src = src;
    G.imgs[i] = im;
  });

  resize();
  paintItems();
  syncHud();
  draw();
  baseName = lv.t;
  $('#lvName').textContent = lv.t;
  showTip(lv.tip || '');
}

// ------------------------------------------------------------------ 结束
function finish(win) {
  const st = G.st;
  if (!st || G.resultShown) return;
  G.resultShown = true;
  G.mode = 'over';

  const rank = win ? rankOf(st) : 'D';
  const data = seenSave();
  const prev = data.best[st.lvId];
  const order = { D: 0, C: 1, B: 2, A: 3, S: 4 };
  if (win && (!prev || order[rank] > order[prev])) data.best[st.lvId] = rank;
  if (st.lvId === 13 && st.lines > (data.endless || 0)) data.endless = st.lines;

  // 银芯按消行折算，只在第一次拿到这个评级时给（重刷不给，避免刷分）
  const credit = win && (!prev || order[rank] > order[prev]) ? creditOf(st.lines) : (win ? 1 : 0);
  if (credit > 0) payCredits(credit);
  writeJSON(SAVE, data);

  setTimeout(() => {
    const ov = $('#ovResult');
    ov.hidden = false;
    requestAnimationFrame(() => ov.classList.add('on'));
    $('#resRank').textContent = rank;
    $('#resRank').dataset.k = rank;
    $('#resTitle').textContent = win ? (st.lvId === 13 ? '走到尽头了' : '守住了') : '沉下去了';
    $('#resWhy').textContent = win
      ? (st.lvId === 13 ? `这一趟消了 ${st.lines} 行。` : `目标 ${st.goal} 行，你用了 ${st.moves} 回合。`)
      : (st.reason || '没撑住');
    $('#resLines').textContent = st.lines;
    $('#resScore').textContent = st.score.toLocaleString('en-US');
    $('#resCombo').textContent = st.maxCombo > 1 ? `×${st.maxCombo}` : '—';
    $('#resCredit').textContent = credit > 0 ? `+${credit}` : '+0';
    const nextLv = LEVELS.find((x) => x.id === st.lvId + 1);
    $('#resNext').hidden = !(win && nextLv);
    $('#resNext').textContent = nextLv ? `下一关：${nextLv.t}` : '';
    $('#resRetry').textContent = win ? '再打一次' : '重来';
  }, win ? 420 : 700);
}

function payCredits(n) {
  if (!(n > 0)) return;
  try {
    const cur = Number(JSON.parse(localStorage.getItem('zjtt:credits') || '0')) || 0;
    const v = Math.max(0, cur + Math.round(n));
    localStorage.setItem('zjtt:credits', JSON.stringify(v));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
  } catch { /* 钱包写不进去不影响游戏 */ }
}

function backToSelect() {
  G.mode = 'select';
  G.st = null;
  G.paused = false;
  $('#scrPlay').hidden = true;
  $('#scrPre').hidden = true;
  $('#ovResult').hidden = true;
  $('#ovResult').classList.remove('on');
  $('#ovPause').hidden = true;
  $('#ovPause').classList.remove('on');
  $('#scrSelect').hidden = false;
  paintSelect();
}

function togglePause(force) {
  if (G.mode !== 'play' || !G.st || G.st.over) return;
  G.paused = force == null ? !G.paused : force;
  const ov = $('#ovPause');
  ov.hidden = !G.paused;
  requestAnimationFrame(() => ov.classList.toggle('on', G.paused));
}

// ------------------------------------------------------------------ 绑定
function bindUi() {
  $('#preGo').addEventListener('click', startRun);
  $('#preBack').addEventListener('click', backToSelect);
  $('#btnPause').addEventListener('click', () => togglePause());
  $('#pContinue').addEventListener('click', () => togglePause(false));
  $('#pQuit').addEventListener('click', backToSelect);
  $('#resRetry').addEventListener('click', () => {
    $('#ovResult').hidden = true;
    $('#ovResult').classList.remove('on');
    startRun();
  });
  $('#resBack').addEventListener('click', backToSelect);
  $('#resNext').addEventListener('click', () => {
    $('#ovResult').hidden = true;
    $('#ovResult').classList.remove('on');
    openPre(G.st.lvId + 1);
  });
  $('#btnSnd').addEventListener('click', () => {
    sndOn = !sndOn;
    writeJSON('zjtt:block:snd', sndOn);
    $('#btnSnd').classList.toggle('off', !sndOn);
    if (sndOn) sfx.item();
  });
  $('#btnSnd').classList.toggle('off', !sndOn);

  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      if (G.mode === 'play') resize();
    }, 120);
  });
}

// ------------------------------------------------------------------ 启动
function boot() {
  bindUi();
  bindStage();
  paintSelect();
  $('#scrSelect').hidden = false;
  $('#scrPre').hidden = true;
  $('#scrPlay').hidden = true;
  layoutBoard($('#stage').clientWidth || 360, $('#stage').clientHeight || 480);
  requestAnimationFrame(frame);
  // 页面里的「正在载入」由这里摘掉
  const b = document.getElementById('boot');
  if (b) b.classList.add('done');
}

// 自测入口（只在 ?_test=1 时挂）：无头浏览器要靠它跳关、摆盘、看内部状态
if (location.search.includes('_test=1')) {
  window.__block = {
    G,
    openPre,
    startRun,
    backToSelect,
    finish,
    unlockAll() {
      const d = seenSave();
      for (const lv of LEVELS) if (!lv.endless) d.best[lv.id] = d.best[lv.id] || 'B';
      writeJSON(SAVE, d);
      paintSelect();
    },
    // 无头浏览器会节流 rAF，测试靠这个把一帧推完
    advance(sec) {
      const n = Math.max(1, Math.round((sec || 0.05) * 60));
      for (let i = 0; i < n; i++) drainFx();
      syncHud();
      draw();
      return this.state();
    },
    paint() {
      paintItems();
          syncHud();
      draw();
    },
    // 一步：把某个格子所在的块横挪 d 格（直接调 core，不走指针）
    slide(r, c, d, quiet) {
      const st = G.st;
      if (!st || st.over || st.win) return null;
      const bid = blockAt(st, r, c);
      if (bid == null) return null;
      const before = st.lines;
      const res = commit(st, bid, d);
      drainFx();
      syncHud();
      if (!quiet) draw();
      return { ok: res.ok, moved: res.moved, cleared: st.lines - before, lines: st.lines, over: st.over, win: st.win };
    },
    // 自动走一步：挑第一个能动的块往空处推。给「快速造一个中局」用。
    autoStep(quiet) {
      const st = G.st;
      if (!st || st.over || st.win) return null;
      const seen = new Set();
      for (let r = st.rows - 1; r >= 0; r--) {
        for (let c = 0; c < st.cols; c++) {
          const cell = st.board[r][c];
          if (!cell || seen.has(cell.b)) continue;
          seen.add(cell.b);
          const lim = slideRange(st, cell.b);
          if (lim.locked || (!lim.left && !lim.right)) continue;
          const d = lim.right ? 1 : -1;
          const before = st.lines;
          const res = commit(st, cell.b, d);
          if (!res.ok) continue;
          drainFx();
          syncHud();
          if (!quiet) draw();
          return { ok: true, r, c, cleared: st.lines - before, lines: st.lines, over: st.over, win: st.win };
        }
      }
      return null;
    },
    pass() {
      const st = G.st;
      if (!st) return null;
      const ok = pass(st);
      drainFx(); syncHud(); draw();
      return { ok, over: st.over };
    },
    fill(rows) {
      // 用 '0-3' 或 '.' 摆一个盘面，方便截图看效果
      const st = G.st;
      if (!st) return null;
      let bid = 90000;
      for (let r = 0; r < st.rows; r++) {
        let last = null;
        for (let c = 0; c < st.cols; c++) {
          const ch = rows[r] && rows[r][c];
          if (!ch || ch === '.') { st.board[r][c] = null; last = null; continue; }
          const k = Number(ch) % 4;
          if (last == null || last.k !== k) { bid++; last = { k }; }
          st.board[r][c] = { k, sp: null, hp: 1, b: bid };
        }
      }
          syncHud();
      draw();
      return 'ok';
    },
    state() {
      const st = G.st;
      if (!st) return null;
      return {
        lv: st.lvId, cols: st.cols, rows: st.rows,
        lines: st.lines, goal: st.goal, moves: st.moves, maxMoves: st.maxMoves,
        score: st.score, over: st.over, win: st.win, reason: st.reason,
        items: st.items.slice(), movable: hasMove(st),
        height: st.board.filter((row) => row.some(Boolean)).length,
        mode: G.mode, paused: G.paused,
      };
    },
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
