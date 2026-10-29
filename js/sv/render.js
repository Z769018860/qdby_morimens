// 《唤醒体幸存者》绘制层：地面、角色、敌人、弹道、特效、飘字。
//
// 全部用 canvas 2D。视觉上刻意做成「低饱和深色调 + 高饱和弹道」：
// 背景压暗，所有伤害表现都用亮色，几百个敌人糊在一起时也能一眼看清
// 自己的子弹在打哪儿。
//
// 贴图只有一张图集（js/sv/gen.js 里的 ATLAS，构建时内联的 data URI），
// 角色和怪物都从这张图上按格位取，所以整局游戏零图片请求。

import { G, VIEW_H } from './engine.js';
import { META, ATLAS } from './gen.js';
import { TERRAINS, RAGE } from './defs.js';

let cv = null;
let ctx = null;
let img = null;
let glow = null;        // 预渲染的光晕精灵（三类敌人各一张）
let shadow = null;      // 预渲染的脚下椭圆阴影
let vignetteC = null;   // 暗角
let rageEdge = null;    // 狂气爆发时的红色边缘
let dpr = 1;

// 地形图块与 pattern 都按主题缓存：一共五种，512² 各一张，
// 切换时只在第一次生成，之后就是 createPattern + fillRect。
const tiles = {};
const pats = {};
let weather = null;     // 天气粒子（雪花/火星/灰烬）
let weatherKind = '';

export function init(canvas) {
  cv = canvas;
  ctx = canvas.getContext('2d', { alpha: false });
  img = new Image();
  img.decoding = 'async';
  img.src = ATLAS;
  glow = { 0: makeGlow('150,120,190'), 1: makeGlow('227,179,65'), 2: makeGlow('232,105,95') };
  shadow = makeShadow();
  return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
}

// 地面：按地形生成一张 512×512 的 tile，之后用 pattern 平铺。
// 每帧画几百个石子会直接把帧率吃掉，pattern 一次 fill 就够。
function groundTile(T) {
  if (tiles[T.k]) return tiles[T.k];
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = T.base;
  g.fillRect(0, 0, S, S);

  // 底噪：几十块深浅不一的暗斑，让平铺时看不出接缝
  let seed = 20261029 + T.k.length * 7919;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 46;
    const a = 0.02 + rnd() * 0.06;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, T.blob + (a * 1.6).toFixed(3) + ')');
    grd.addColorStop(1, T.blob + '0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // 网格：每 64 一格，很淡，只用来提供移动参照
  g.strokeStyle = T.grid;
  g.lineWidth = 1;
  for (let i = 0; i <= S; i += 64) {
    g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, S); g.stroke();
    g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(S, i + 0.5); g.stroke();
  }
  tiles[T.k] = c;
  return c;
}

function patternOf(T) {
  if (!pats[T.k]) pats[T.k] = ctx.createPattern(groundTile(T), 'repeat');
  return pats[T.k];
}


// 光晕精灵：以前每个敌人每帧 createRadialGradient 一次，300 个敌人就是
// 300 次渐变对象分配 —— 实测直接掉到 30 帧。预渲染一张 64×64 的软圆，
// 之后只是 drawImage 缩放，同样的画面 60 帧稳。
function makeGlow(rgb) {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grd.addColorStop(0, `rgba(${rgb},0.42)`);
  grd.addColorStop(0.55, `rgba(${rgb},0.14)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  return c;
}

// 脚下阴影同样预渲染：一个 300 次的 ellipse().fill() 也是每秒 1.8 万次路径构建
function makeShadow() {
  const c = document.createElement('canvas');
  c.width = 48; c.height = 20;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(24, 10, 0, 24, 10, 24);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.save(); g.translate(24, 10); g.scale(1, 0.42); g.translate(-24, -10);
  g.fillRect(0, 0, 48, 20);
  g.restore();
  return c;
}

export function resize() {
  const rect = cv.getBoundingClientRect();
  // DPR 封顶 1.5：这游戏全是软边贴图和发光圆，1.5 倍已经看不出锯齿，
  // 但像素数比 2 倍少 44% —— 满屏 300 个敌人时这就是 60 帧和 30 帧的差别。
  dpr = Math.min(1.5, window.devicePixelRatio || 1);
  G.W = Math.max(1, Math.round(rect.width));
  G.H = Math.max(1, Math.round(rect.height));
  // 可见面积固定，而不是可见宽高固定。
  //
  // 早先按「宽至少 400、高至少 660」约束，竖屏拿到的是 400×867 的世界视野：
  // 角色直径只有 30，占屏宽 7%，一整屏空得能跑马（实测 20 秒后画面里一只怪
  // 都没有）。现在反过来锁面积——不管横竖屏、不管桌面窗口多大，一屏看到的
  // 世界单位数基本恒定（约 336×729 或 729×336），角色占比、敌人密度、可见
  // 预警距离三件事就都稳住了。
  const AREA = 245000;                       // 目标可见面积（世界单位²）
  G.s = Math.min(2.0, Math.max(0.9, Math.sqrt((G.W * G.H) / AREA)));
  cv.width = Math.round(G.W * dpr);
  cv.height = Math.round(G.H * dpr);
}

// 图集取格
function frame(idx, x, y, size, alpha, flip) {
  if (idx == null || !img || !img.complete) return;
  const c = META.cell;
  const col = idx % META.cols;
  const row = (idx / META.cols) | 0;
  const a = alpha == null ? 1 : alpha;
  if (a <= 0) return;
  const old = ctx.globalAlpha;
  ctx.globalAlpha = a;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, col * c, row * c, c, c, -size / 2, -size / 2, size, size);
    ctx.restore();
  } else {
    ctx.drawImage(img, col * c, row * c, c, c, x - size / 2, y - size / 2, size, size);
  }
  ctx.globalAlpha = old;
}

export function draw() {
  if (!ctx) return;
  const { W, H, s } = G;
  const sh = G.shake;
  const ox = sh ? (Math.sin(G.t * 61) * sh) : 0;
  const oy = sh ? (Math.cos(G.t * 47) * sh) : 0;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, W, H);

  // 世界变换：以相机为中心
  const cx = G.cam.x, cy = G.cam.y;
  ctx.setTransform(dpr * s, 0, 0, dpr * s, (W / 2 - cx * s + ox) * dpr, (H / 2 - cy * s + oy) * dpr);

  const halfW = W / 2 / s, halfH = H / 2 / s;
  const L = cx - halfW - 60, R = cx + halfW + 60;
  const T = cy - halfH - 60, B = cy + halfH + 60;

  drawGround(L, T, R, B);
  drawFields(L, R, T, B);
  drawPickups(L, R, T, B);
  drawSummons();
  drawEnemies(L, R, T, B);
  drawPlayer();
  drawBullets(L, R, T, B);
  drawOrbs();
  drawFx();
  drawTexts();

  // 屏幕层：受伤红闪 / 狂气红晕 / Boss 警报 / 暗角 / 天气
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVoice(W, H);
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(232,80,70,${G.flash * 0.24})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.rageT > 0) drawRageVeil(W, H);
  drawBossWarn(W, H);
  vignette(W, H);
  drawWeather(W, H);
}

// ---------------------------------------------------------------- 角色台词
// 一句台词挂在角色头顶：深色圆角底 + 左侧金条 + 小名牌。
// 走屏幕坐标（世界坐标乘 s 会把长句拉到屏幕外），并且夹在视口内 ——
// 玩家贴边时气泡不能半截被切掉。
const VOICE_FONT = '600 13px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
const VOICE_PAD = 9;

// 中文换行不能像英文那样「塞满就断」：引号与括号里的内容被拦腰截断
// 会变成「「2 / 4」」，标点落在行首也难看。这里做最朴素的两条禁则：
//   1. 在开引号/括号内部不换行（宁可让这一行溢出几个像素）；
//   2. 收尾标点不放到下一行行首。
const VOICE_OPENS = '「『（【《〈';
const VOICE_CLOSES = '」』）】》〉';
const VOICE_NO_START = '，。！？；：、…—·）」』%';

function wrapVoice(txt, maxW) {
  const out = [];
  let cur = '';
  let inQuote = 0;
  for (const ch of txt) {
    const over = cur && ctx.measureText(cur + ch).width > maxW;
    const closing = VOICE_CLOSES.includes(ch);
    if (over && inQuote === 0 && !closing && !VOICE_NO_START.includes(ch)
      && !VOICE_OPENS.includes(cur.slice(-1))) {
      out.push(cur);
      cur = ch;
    } else {
      cur += ch;
    }
    if (VOICE_OPENS.includes(ch)) inQuote++;
    else if (closing) inQuote = Math.max(0, inQuote - 1);
    if (out.length >= 4) { out[3] += '…'; return out; }   // 四行还放不下就直接省略号收
  }
  if (cur) out.push(cur);
  return out;
}

function drawVoice(W, H) {
  const v = G.voice;
  if (!v || !v.txt || !G.player) return;
  const s = G.s;
  const sx = (G.player.x - G.cam.x) * s + W / 2;
  const sy = (G.player.y - G.cam.y) * s + H / 2;
  // 淡入 0.12 秒、末尾 0.45 秒淡出，中间保持不透明
  const a = Math.min(1, (v.max - v.t) * 8) * Math.min(1, v.t * 2.2);
  if (a <= 0.01) return;

  const maxTextW = Math.min(232, W - 56);
  ctx.font = VOICE_FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const lines = wrapVoice(v.txt, maxTextW);
  const lineH = 19;
  let tw = 0;
  for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
  const bw = tw + VOICE_PAD * 2;
  const bh = lines.length * lineH + VOICE_PAD * 2 - 3;

  let bx = sx - bw / 2;
  let by = sy - 52 - bh;
  bx = Math.max(8, Math.min(W - bw - 8, bx));
  by = Math.max(56, Math.min(H - bh - 76, by));   // 上避 HUD、下避摇杆

  ctx.globalAlpha = a;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 9);
  else ctx.rect(bx, by, bw, bh);
  ctx.fillStyle = 'rgba(12,17,26,0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(227,179,65,0.34)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 左侧金条：和超武卡片的金边同一套视觉语言
  ctx.fillStyle = '#e3b341';
  ctx.fillRect(bx, by + 5, 2.5, bh - 10);

  ctx.fillStyle = '#eef2f8';
  lines.forEach((l, i) => {
    ctx.fillText(l, bx + VOICE_PAD, by + VOICE_PAD + lineH * i + lineH / 2 - 1);
  });
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- 天气
// 每种地貌一层很淡的大气：雪原下雪、熔谷飘火星、虚空浮星尘、废土落灰。
// 全在屏幕坐标里走，不为每个粒子建世界对象 —— 它们本来就该贴在镜头上。
function initWeather(k) {
  weatherKind = k;
  const n = k === 'snow' ? 44 : k === 'ember' ? 34 : k === 'void' ? 30 : k === 'ash' ? 24 : 16;
  weather = [];
  for (let i = 0; i < n; i++) {
    weather.push({
      x: Math.random(), y: Math.random(),
      r: 0.7 + Math.random() * 1.9,
      v: 0.018 + Math.random() * 0.05,
      p: Math.random() * Math.PI * 2,
    });
  }
}

function drawWeather(W, H) {
  const ter = TERRAINS[G.terrainIdx] || TERRAINS[0];
  if (weatherKind !== ter.k) initWeather(ter.k);
  if (!weather || !weather.length) return;
  const rising = ter.k === 'ember' || ter.k === 'void';
  const color = ter.k === 'snow' ? 'rgba(214,232,255,'
    : ter.k === 'ember' ? 'rgba(255,150,70,'
      : ter.k === 'void' ? 'rgba(190,165,255,'
        : 'rgba(150,163,190,';
  for (const p of weather) {
    const x = p.x * W + Math.sin(G.t * 0.7 + p.p) * 12;
    const span = H * 1.15;
    const y = rising
      ? H - ((p.y * span + G.t * p.v * H * 1.6) % span)
      : (p.y * span + G.t * p.v * H) % span;
    const a = 0.16 + Math.abs(Math.sin(G.t * 1.4 + p.p)) * 0.2;
    ctx.fillStyle = color + a.toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
  }
}

// ---------------------------------------------------------------- 狂气
// 爆发期间屏幕四周泛一层红，像镜头被血糊住 —— 玩家不用看条也知道自己在爆发。
function drawRageVeil(W, H) {
  if (!rageEdge || rageEdge.w !== W || rageEdge.h !== H) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * 0.5));
    c.height = Math.max(1, Math.round(H * 0.5));
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.18,
      c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.62);
    grd.addColorStop(0, 'rgba(255,70,45,0)');
    grd.addColorStop(0.65, 'rgba(255,70,45,0.10)');
    grd.addColorStop(1, 'rgba(255,50,35,0.42)');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    rageEdge = { w: W, h: H, c };
  }
  // 结束前 0.6 秒淡出，不要「啪」地消失
  const k = Math.min(1, G.rageT / 0.6) * (0.85 + Math.sin(G.t * 9) * 0.15);
  ctx.globalAlpha = k;
  ctx.drawImage(rageEdge.c, 0, 0, W, H);
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- Boss 警报
// 两段：出现前 2.5 秒边缘红光脉动（预告），出现瞬间一条横幅（确认）。
// 全靠屏幕层绘制，不进世界坐标，所以不会因为玩家跑到地图角落就看不见。
function drawBossWarn(W, H) {
  const eta = G.bossEta;
  if (eta > 0 && eta <= 2.5) {
    // 越接近出现，脉动越急、越亮
    const k = 1 - eta / 2.5;
    const pulse = 0.5 + 0.5 * Math.sin(G.t * (7 + k * 9));
    const a = (0.10 + k * 0.22) * pulse;
    const th = Math.min(W, H) * 0.16;
    const g1 = ctx.createLinearGradient(0, 0, 0, th);
    g1.addColorStop(0, `rgba(235,70,60,${a})`);
    g1.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, th);
    const g2 = ctx.createLinearGradient(0, H, 0, H - th);
    g2.addColorStop(0, `rgba(235,70,60,${a})`);
    g2.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, H - th, W, th);
    const g3 = ctx.createLinearGradient(0, 0, th, 0);
    g3.addColorStop(0, `rgba(235,70,60,${a * 0.8})`);
    g3.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g3;
    ctx.fillRect(0, 0, th, H);
    const g4 = ctx.createLinearGradient(W, 0, W - th, 0);
    g4.addColorStop(0, `rgba(235,70,60,${a * 0.8})`);
    g4.addColorStop(1, 'rgba(235,70,60,0)');
    ctx.fillStyle = g4;
    ctx.fillRect(W - th, 0, th, H);
  }

  if (G.warn <= 0) return;
  const t = 1 - G.warn / 2.6;            // 0 → 1
  const fade = G.warn > 2.1 ? (2.6 - G.warn) / 0.5 : Math.min(1, G.warn / 0.7);
  const bandH = 54;
  const y = H * 0.28;
  ctx.globalAlpha = Math.min(1, fade);
  const bg = ctx.createLinearGradient(0, y - bandH / 2, 0, y + bandH / 2);
  bg.addColorStop(0, 'rgba(30,8,10,0)');
  bg.addColorStop(0.5, 'rgba(38,8,12,0.82)');
  bg.addColorStop(1, 'rgba(30,8,10,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(0, y - bandH / 2, W, bandH);
  // 上下两条红线往两边拉开，制造「撕开」的感觉
  ctx.strokeStyle = 'rgba(255,90,75,0.85)';
  ctx.lineWidth = 2;
  const grow = Math.min(1, t / 0.35);
  const half = (W / 2) * grow;
  ctx.beginPath(); ctx.moveTo(W / 2 - half, y - bandH / 2 + 4); ctx.lineTo(W / 2 + half, y - bandH / 2 + 4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 - half, y + bandH / 2 - 4); ctx.lineTo(W / 2 + half, y + bandH / 2 - 4); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.min(26, W * 0.062);
  ctx.font = `800 ${size}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(20,4,6,0.9)';
  const label = `⚠ 强敌降临 · ${G.warnName || ''}`;
  ctx.strokeText(label, W / 2, y);
  ctx.fillStyle = '#ff6f5e';
  ctx.fillText(label, W / 2, y);
  ctx.globalAlpha = 1;
}

function drawGround(L, Tp, R, Bp) {
  const idx = G.terrainIdx || 0;
  const cur = TERRAINS[idx] || TERRAINS[0];
  const prev = TERRAINS[idx - 1];
  // 换地形时交叉淡化 1.4 秒：硬切像是画面闪了一下
  if (prev && G.terrainFade > 0) {
    const pa = patternOf(prev);
    if (pa) { ctx.fillStyle = pa; ctx.fillRect(L, Tp, R - L, Bp - Tp); }
    const pb = patternOf(cur);
    if (pb) {
      ctx.globalAlpha = 1 - G.terrainFade;
      ctx.fillStyle = pb;
      ctx.fillRect(L, Tp, R - L, Bp - Tp);
      ctx.globalAlpha = 1;
    }
  } else {
    const p = patternOf(cur);
    if (p) { ctx.fillStyle = p; ctx.fillRect(L, Tp, R - L, Bp - Tp); }
  }
  drawDeco(cur, L, Tp, R, Bp);
}

// 确定性 hash：同一个格子永远算出同一个值。
// 装饰物位置必须由格子坐标推出来，不能用 Math.random —— 否则每帧位置都在跳，
// 地上会是一片闪烁的噪点，而不是「几块石头」。
const hash2 = (x, y) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function drawDeco(ter, L, Tp, R, Bp) {
  const CS = 140;
  const x0 = Math.floor(L / CS), x1 = Math.floor(R / CS);
  const y0 = Math.floor(Tp / CS), y1 = Math.floor(Bp / CS);
  for (let gx = x0; gx <= x1; gx++) {
    for (let gy = y0; gy <= y1; gy++) {
      const n = 1 + (((hash2(gx, gy) * 10) | 0) % 2);
      for (let i = 0; i < n; i++) {
        const h1 = hash2(gx * 37 + i * 11, gy * 53 + i * 7);
        const h2 = hash2(gx * 91 + i * 3, gy * 17 + i * 5);
        const h3 = hash2(gx * 13 + i * 101, gy * 29 + i * 41);
        const kind = ter.deco[((h3 * 10) | 0) % ter.deco.length];
        deco(kind, (gx + 0.14 + h1 * 0.72) * CS, (gy + 0.14 + h2 * 0.72) * CS, h1, h3);
      }
    }
  }
  ctx.globalAlpha = 1;
}

// 地面装饰：每种地貌三样，全部是纯路径绘制（不用图片，零请求）。
// 每种都刻意压得很暗、很淡 —— 它们只是让地面有「走过的地方」的实感，
// 不该抢怪和弹道的注意力。
function deco(kind, x, y, h1, h3) {
  const s = 4 + h1 * 9;
  ctx.globalAlpha = 0.32 + h3 * 0.26;
  switch (kind) {
    case 'rubble': {
      ctx.fillStyle = '#2b3448';
      ctx.beginPath();
      ctx.moveTo(x - s, y + s * 0.5);
      ctx.lineTo(x - s * 0.4, y - s * 0.6);
      ctx.lineTo(x + s * 0.5, y - s * 0.4);
      ctx.lineTo(x + s, y + s * 0.6);
      ctx.closePath(); ctx.fill();
      break;
    }
    case 'crack': {
      ctx.strokeStyle = 'rgba(10,13,20,0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.6, y - s * 0.5);
      ctx.lineTo(x - s * 0.2, y);
      ctx.lineTo(x + s * 0.7, y - s * 0.8);
      ctx.lineTo(x + s * 1.8, y + s * 0.3);
      ctx.stroke();
      break;
    }
    case 'pebble': {
      ctx.fillStyle = 'rgba(150,165,200,0.55)';
      ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + s * 0.7, y + s * 0.4, s * 0.22, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'pool': {
      // 沼泽水洼：一潭死水 + 一圈亮边
      ctx.fillStyle = 'rgba(24,52,42,0.9)';
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.9, s * 1.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,200,150,0.20)';
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case 'reed': {
      ctx.strokeStyle = 'rgba(110,170,120,0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * s * 0.5 - s * 0.5, y + s * 0.6);
        ctx.quadraticCurveTo(x + i * s * 0.5, y - s * 0.4, x + i * s * 0.5 + s * 0.3, y - s * 1.1);
        ctx.stroke();
      }
      break;
    }
    case 'snowdrift': {
      ctx.fillStyle = 'rgba(215,232,255,0.16)';
      ctx.beginPath(); ctx.ellipse(x, y, s * 2, s * 0.85, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'ice': {
      ctx.strokeStyle = 'rgba(190,225,255,0.42)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.55, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.55, y);
      ctx.closePath(); ctx.stroke();
      break;
    }
    case 'lava': {
      // 熔岩裂缝：靠自身发光，所以用 lighter 而不是普通描边
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,120,50,${0.16 + h3 * 0.16})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(x - s * 1.7, y + s * 0.4);
      ctx.lineTo(x - s * 0.5, y - s * 0.3);
      ctx.lineTo(x + s * 0.4, y + s * 0.3);
      ctx.lineTo(x + s * 1.7, y - s * 0.4);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      break;
    }
    case 'star': {
      ctx.fillStyle = 'rgba(200,180,255,0.5)';
      ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha *= 0.4;
      ctx.beginPath(); ctx.arc(x + s * 1.3, y - s * 0.7, s * 0.16, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rune': {
      ctx.strokeStyle = 'rgba(175,145,245,0.35)';
      ctx.lineWidth = 1.1;
      ctx.strokeRect(x - s * 0.7, y - s * 0.7, s * 1.4, s * 1.4);
      ctx.beginPath(); ctx.moveTo(x - s * 0.7, y); ctx.lineTo(x + s * 0.7, y); ctx.stroke();
      break;
    }
    default: break;
  }
  ctx.globalAlpha = 1;
}

// 彩蛋角色用主播本人的 B 站头像（data URI，构建时内联）。同一个 src 只建一次 Image，
// 六个人同屏也只解码六个。头像没解码出来就退回「主题色圆底 + 一个字」，
// 配色与选人面板的 eggStyle() 一致，否则同一个人在面板里和在场上会是两种颜色。
const faces = new Map();
function faceImg(src) {
  let im = faces.get(src);
  if (!im) {
    im = new Image();
    im.decoding = 'async';
    im.src = src;
    faces.set(src, im);
  }
  return im;
}

function drawEggFace(c, x, y, size) {
  const col = c.color || '#8ba3c7';
  const R = size / 2;
  const im = c.face ? faceImg(c.face) : null;
  if (im && im.complete && im.naturalWidth) {
    // 圆形裁剪：圆槽里直接贴方图会露出四个角
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(im, x - R, y - R, size, size);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, R - 0.75, 0, Math.PI * 2);
    ctx.strokeStyle = col + 'b0';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }
  const g = ctx.createRadialGradient(x, y - size * 0.2, size * 0.08, x, y, size * 0.56);
  g.addColorStop(0, col + '66');
  g.addColorStop(0.48, col + '22');
  g.addColorStop(1, '#10141d');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill();
  const oldAlign = ctx.textAlign, oldBase = ctx.textBaseline;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  ctx.font = `700 ${Math.round(size * 0.46)}px "PingFang SC","Microsoft YaHei",system-ui,sans-serif`;
  ctx.fillText(c.glyph || '?', x, y + 1);
  ctx.textAlign = oldAlign;
  ctx.textBaseline = oldBase;
}

// 鼠群召唤物：没有立绘就画一只两只耳朵的团子，比一个光点更像活物
function drawMouse(x, y, col) {
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.ellipse(x, y + 1, 9, 7.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x - 5.4, y - 5.2, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5.4, y - 5.2, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.arc(x - 3.1, y, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 3.1, y, 1.5, 0, Math.PI * 2); ctx.fill();
}

// 弥萨格校猫：彩蛋首领，官方素材里没有它的图，干脆手画。
// 圆脸 + 三角耳 + 竖瞳就够了 —— 细节越多越像「另一种融蚀体」，反而没有梗。
function drawCat(e) {
  const x = e.x, y = e.y + Math.sin(e.wob) * 2;
  const r = e.r;
  ctx.save();
  // 耳朵（先画，脸压在上面）：外三角深色 + 内耳一点暖色，才看得出是「耳朵」
  // 而不是两个角。之前只画了外三角，整只猫在深色背景上像一坨黑球。
  const ear = (sx) => {
    ctx.fillStyle = '#3b3244';
    ctx.beginPath();
    ctx.moveTo(x + sx * r * 0.9, y - r * 0.34);
    ctx.lineTo(x + sx * r * 0.62, y - r * 1.34);
    ctx.lineTo(x + sx * r * 0.1, y - r * 0.66);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,150,150,0.30)';
    ctx.beginPath();
    ctx.moveTo(x + sx * r * 0.74, y - r * 0.46);
    ctx.lineTo(x + sx * r * 0.6, y - r * 1.1);
    ctx.lineTo(x + sx * r * 0.28, y - r * 0.66);
    ctx.closePath(); ctx.fill();
  };
  ear(-1); ear(1);
  // 脸：毛色比背景亮一档，否则整只猫在暗场里读不出来
  const g = ctx.createRadialGradient(x - r * 0.22, y - r * 0.3, r * 0.12, x, y, r * 0.98);
  g.addColorStop(0, '#5d5368');
  g.addColorStop(0.62, '#3a3244');
  g.addColorStop(1, '#1b1622');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, Math.PI * 2); ctx.fill();
  // 轮廓光：彩蛋首领不该靠红圈才被看见
  ctx.strokeStyle = 'rgba(255,215,106,0.30)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, 0, Math.PI * 2); ctx.stroke();

  // 金瞳 + 竖瞳。白色只在受击瞬间由上层 flash 覆盖，这里不再单独判断，
  // 否则「白眼睛」会被误读成怪物而不是猫。
  ctx.fillStyle = '#ffd76a';
  ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.1, r * 0.13, r * 0.185, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.32, y - r * 0.1, r * 0.13, r * 0.185, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#151019';
  ctx.beginPath(); ctx.ellipse(x - r * 0.32, y - r * 0.1, r * 0.036, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + r * 0.32, y - r * 0.1, r * 0.036, r * 0.16, 0, 0, Math.PI * 2); ctx.fill();
  // 高光：一点白，眼神才「活」
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath(); ctx.arc(x - r * 0.37, y - r * 0.17, r * 0.035, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.27, y - r * 0.17, r * 0.035, 0, Math.PI * 2); ctx.fill();

  // 鼻子（小三角）与嘴（w 形）
  ctx.fillStyle = '#c98b93';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.14);
  ctx.lineTo(x - r * 0.07, y + r * 0.24);
  ctx.lineTo(x + r * 0.07, y + r * 0.24);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.26); ctx.lineTo(x - r * 0.1, y + r * 0.36);
  ctx.moveTo(x, y + r * 0.26); ctx.lineTo(x + r * 0.1, y + r * 0.36);
  ctx.stroke();
  // 胡须：左右各两根，长一点才看得出是猫
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2, y + r * 0.2); ctx.lineTo(x - r * 0.86, y + r * 0.1);
  ctx.moveTo(x - r * 0.2, y + r * 0.28); ctx.lineTo(x - r * 0.82, y + r * 0.36);
  ctx.moveTo(x + r * 0.2, y + r * 0.2); ctx.lineTo(x + r * 0.86, y + r * 0.1);
  ctx.moveTo(x + r * 0.2, y + r * 0.28); ctx.lineTo(x + r * 0.82, y + r * 0.36);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer() {
  const P = G.player;
  const c = G.char;
  if (!c) return;
  // 影子
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(P.x, P.y + 16, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 脚下的呼吸光环 —— 暗色背景里最容易跟丢自己，这圈光就是定位锚
  const pulse = 0.5 + Math.sin(G.t * 2.6) * 0.1;
  const grd = ctx.createRadialGradient(P.x, P.y, 6, P.x, P.y, 46);
  grd.addColorStop(0, 'rgba(110,168,255,0.28)');
  grd.addColorStop(0.6, 'rgba(110,168,255,0.07)');
  grd.addColorStop(1, 'rgba(110,168,255,0)');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(P.x, P.y, 46, 0, Math.PI * 2); ctx.fill();

  // 头像（圆形裁切）
  const size = 52;
  ctx.save();
  ctx.beginPath(); ctx.arc(P.x, P.y, size / 2, 0, Math.PI * 2); ctx.clip();
  if (c.egg) drawEggFace(c, P.x, P.y, size);
  else frame(c.img, P.x, P.y, size, 1, false);
  ctx.restore();
  // 外圈
  ctx.strokeStyle = P.inv > 0 && Math.sin(G.t * 40) > 0 ? 'rgba(255,255,255,0.95)' : `rgba(140,190,255,${pulse + 0.35})`;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 1, 0, Math.PI * 2); ctx.stroke();

  // 朝向小箭头
  ctx.fillStyle = 'rgba(190,220,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(P.x + P.face * (size / 2 + 7), P.y);
  ctx.lineTo(P.x + P.face * (size / 2 + 1), P.y - 4.5);
  ctx.lineTo(P.x + P.face * (size / 2 + 1), P.y + 4.5);
  ctx.closePath();
  ctx.fill();

  // 护盾
  if (P.shield > 0) {
    ctx.strokeStyle = `rgba(110,168,255,${0.35 + Math.min(0.45, P.shield / 90)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 6, 0, Math.PI * 2); ctx.stroke();
  }

  // 狂气爆发：一圈翻涌的红环，比任何 UI 条都直观
  if (G.rageT > 0) {
    const t = G.t * 8;
    ctx.strokeStyle = `rgba(255,110,70,${(0.35 + Math.sin(t) * 0.16).toFixed(3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(P.x, P.y, size / 2 + 10 + Math.sin(t * 0.7) * 3, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawEnemies(L, R, T, B) {
  for (const e of G.enemies) {
    if (e.x < L || e.x > R || e.y < T || e.y > B) continue;
    // 扑击：咬下去的瞬间整只怪往前顶一下，看得出「它在打你」而不是贴着蹭
    const lunge = e.lungeT > 0 ? 1 + (e.lungeT / 0.3) * 0.22 : 1;
    const sz = e.r * 2.3 * lunge;
    const bob = Math.sin(e.wob) * 2;
    if (shadow) ctx.drawImage(shadow, e.x - e.r * 1.05, e.y + e.r * 0.58, e.r * 2.1, e.r * 0.9);
    // 一圈浅色描边：怪物立绘本身是深色剪影，压在深色地格上会糊成一团
    ctx.strokeStyle = e.tier === 2 ? 'rgba(255,150,140,0.30)' : e.tier === 1 ? 'rgba(255,215,130,0.26)' : 'rgba(190,200,230,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.98, 0, Math.PI * 2); ctx.stroke();
    const gs = e.r * 2.9;
    const sp = glow[e.tier] || glow[0];
    if (sp) ctx.drawImage(sp, e.x - gs / 2, e.y + bob - gs / 2, gs, gs);
    if (e.cat) drawCat(e);
    else frame(e.img, e.x, e.y + bob, sz, 1, false);
    if (e.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, e.flash * 5)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    // 被封印：脚下压一圈方印 + 两道竖线，表示「它现在动不了」。
    // 定身是玩家最需要反馈的状态（打不动就白打），所以画得比迟滞更硬。
    if (e.bindT > 0) {
      ctx.strokeStyle = 'rgba(154,167,255,0.85)';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(e.x - e.r * 0.9, e.y + e.r * 0.5, e.r * 1.8, e.r * 0.34);
      ctx.beginPath();
      ctx.moveTo(e.x - e.r * 0.55, e.y - e.r * 0.9); ctx.lineTo(e.x + e.r * 0.55, e.y + e.r * 0.5);
      ctx.moveTo(e.x + e.r * 0.55, e.y - e.r * 0.9); ctx.lineTo(e.x - e.r * 0.55, e.y + e.r * 0.5);
      ctx.stroke();
    } else if (e.slowT > 0) {
      // 迟滞：脚下一圈雾，颜色跟着减速强度走，玩家能看出「柱子还压着它」
      ctx.strokeStyle = `rgba(180,220,255,${0.18 + (1 - (e.slowMul || 1)) * 0.5})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * 0.62, e.r * 0.95, e.r * 0.3, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 攻击前摇：0.28 秒里一圈红环由外向内收拢，收到身上就是它咬下来的瞬间。
    // 这是「能躲」的前提 —— 没有前摇的贴身伤害只能挨着。
    if (e.windT > 0) {
      const k = 1 - e.windT / 0.28;
      ctx.strokeStyle = `rgba(255,92,80,${0.30 + k * 0.55})`;
      ctx.lineWidth = 1.4 + k * 2.2;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * (1.95 - k * 0.6), 0, Math.PI * 2); ctx.stroke();
    }
    // 首领冲刺预警：0.6 秒里红环由细到粗，玩家能提前横移。场上首领最多三只，
    // 这点开销可以忽略。
    if (e.windup > 0) {
      ctx.strokeStyle = `rgba(255,96,86,${0.25 + e.windup * 0.6})`;
      ctx.lineWidth = 2 + e.windup * 3;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * (1.05 + e.windup * 0.35), 0, Math.PI * 2); ctx.stroke();
    }
    if (e.tier > 0) drawHpBar(e);
  }
}

function drawHpBar(e) {
  const w = e.r * 2.1;
  const hp = Math.max(0, e.hp / e.maxHp);
  const y = e.y - e.r * 1.3 - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(e.x - w / 2, y, w, 4);
  ctx.fillStyle = e.tier === 2 ? '#e8695f' : '#e3b341';
  ctx.fillRect(e.x - w / 2, y, w * hp, 4);
}

function drawBullets(L, R, T, B) {
  for (const b of G.bullets) {
    if (b.kind === 'ray') {
      const a = Math.atan2(b.vy, b.vx);
      const tail = 30;
      const x0 = b.x - Math.cos(a) * tail, y0 = b.y - Math.sin(a) * tail;
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = 0.28;
      ctx.lineWidth = b.w * 2;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(2, b.w * 0.35);
      ctx.strokeStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(b.x, b.y); ctx.stroke();
      // 射线头部一小团光 —— 不给的话高速射线看起来像一根断掉的棍子
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.w * 1.15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (b.x < L || b.x > R || b.y < T || b.y > B) continue;
    const spin = b.spin || 0;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(spin);
    if (b.kind === 'boomerang') {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0.4, Math.PI - 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, b.r, Math.PI + 0.4, Math.PI * 2 - 0.4);
      ctx.stroke();
    } else if (b.kind === 'missile') {
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.moveTo(b.r * 1.5, 0);
      ctx.lineTo(-b.r, b.r * 0.7);
      ctx.lineTo(-b.r, -b.r * 0.7);
      ctx.closePath();
      ctx.fill();
    } else if (b.kind === 'saw') {
      // 锯轮：八齿外环 + 亮心，靠旋转表现「在切」
      ctx.fillStyle = b.color;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        ctx.lineTo(Math.cos(a) * b.r * 1.5, Math.sin(a) * b.r * 1.5);
        ctx.lineTo(Math.cos(a + Math.PI / 8) * b.r * 0.86, Math.sin(a + Math.PI / 8) * b.r * 0.86);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.34, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'bolt') {
      // 单发弹拉成橄榄形：朝向已经跟着速度走，看起来是「射出去」而不是「飘着」
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 2.7, b.r * 1.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * 1.55, b.r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath(); ctx.ellipse(b.r * 0.4, 0, b.r * 0.72, b.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 外层柔光 + 内芯，成本比 shadowBlur 低得多
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(0, 0, b.r * 1.9, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = b.color;
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(0, 0, b.r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

function drawOrbs() {
  const P = G.player;
  for (const o of G.orbs) {
    const cfg = o.w.orb;
    if (!cfg) continue;
    for (let i = 0; i < cfg.n; i++) {
      const a = o.a + (Math.PI * 2 * i) / cfg.n;
      const x = P.x + Math.cos(a) * cfg.r;
      const y = P.y + Math.sin(a) * cfg.r;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = cfg.color;
      ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = cfg.color;
      ctx.beginPath();
      ctx.moveTo(0, -8); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawSummons() {
  for (const s of G.summons) {
    // 图腾是站桩的：画成方尖碑，不再套用会追人的随从外观
    if (s.static) {
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 13, 10, 4.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 17); ctx.lineTo(s.x + 9, s.y - 4);
      ctx.lineTo(s.x + 6, s.y + 12); ctx.lineTo(s.x - 6, s.y + 12);
      ctx.lineTo(s.x - 9, s.y - 4);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      // 顶端的电弧点在闪，表示它在工作
      ctx.fillStyle = 'rgba(255,255,255,' + (0.45 + Math.sin(G.t * 9 + s.spin) * 0.4).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(s.x, s.y - 8, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.range ? 15 : 13, 0, Math.PI * 2); ctx.stroke();
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 12, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.clip();
    if (s.img == null) drawMouse(s.x, s.y, s.color || '#c8e06a');
    else frame(s.img, s.x, s.y, 24, 0.95, false);
    ctx.restore();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(s.x, s.y, 12, 0, Math.PI * 2); ctx.stroke();
  }
}

function drawFields(L, R, T, B) {
  for (const f of G.fields) {
    if (f.x < L || f.x > R || f.y < T || f.y > B) continue;
    const t = f.delay > 0 ? f.delay / 0.45 : 1;
    // 地雷只有一个小圆点，不画领域那种大圆盘 —— 否则满地的「领域」看起来像踩在彩纸上
    // 审判柱与长明灯同理：它们各自有更像样的画法（光柱 / 灯晕），
    // 底下再糊一层大圆盘会把整片战场压成一片黄。
    if (!f.arm && !f.lamp && !(f.pillar && f.delay <= 0)) {
      ctx.globalAlpha = f.delay > 0 ? 0.35 + Math.sin(G.t * 40) * 0.15 : Math.min(0.5, f.life / f.max) * 0.55;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (f.delay > 0 ? (1.15 - t * 0.15) : 1), 0, Math.PI * 2); ctx.fill();
      if (f.delay > 0) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // 涡流：两圈反向旋转的弧，让「中心在拽东西」这件事一眼看得出来
    if (f.pull > 0) {
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = f.color;
      for (let k = 0; k < 2; k++) {
        const a0 = G.t * (k ? -2.2 : 2.6) + k * Math.PI;
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.55 + k * 0.28), a0, a0 + 1.7); ctx.stroke();
      }
      ctx.globalAlpha = 0.3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.16, 0, Math.PI * 2); ctx.fill();
    }
    // 地雷：小圆点 + 引信闪烁，敌人靠近时才亮起来
    if (f.arm) {
      const warn = f.life < 4 ? 0.5 + Math.sin(G.t * 12) * 0.5 : 0.4;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.55 + warn * 0.4;
      ctx.beginPath(); ctx.arc(f.x, f.y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    // 悬空预警（陨石 / 光雨）：地面画一圈收缩的靶环，提示「马上砸这里」
    if (f.delay > 0 && (f.sky || f.pillar)) {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1.1 + t * 0.1), 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(f.x - 8, f.y); ctx.lineTo(f.x + 8, f.y);
      ctx.moveTo(f.x, f.y - 8); ctx.lineTo(f.x, f.y + 8); ctx.stroke();
    }
    // 审判柱：不是「地上一个圈」，而是一根从天上钉下来的光柱 ——
    // 圈只说明范围，柱子才说明「这里站着会死」。
    if (f.pillar && f.delay <= 0) {
      const g = ctx.createLinearGradient(f.x, f.y - 320, f.x, f.y + 12);
      g.addColorStop(0, 'rgba(255,215,106,0)');
      g.addColorStop(0.55, 'rgba(255,215,106,0.16)');
      g.addColorStop(1, 'rgba(255,215,106,0.42)');
      ctx.globalAlpha = Math.min(1, f.life / f.max) * 0.9;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(f.x - f.r * 0.34, f.y + 8);
      ctx.lineTo(f.x - f.r * 0.6, f.y - 320);
      ctx.lineTo(f.x + f.r * 0.6, f.y - 320);
      ctx.lineTo(f.x + f.r * 0.34, f.y + 8);
      ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(f.x, f.y, f.r * 0.9, f.r * 0.34, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // 长明灯：暖色光晕 + 灯芯。灯光是威廉唯一的安全区，要一眼看得见边界。
    if (f.lamp) {
      const pulse = 0.85 + Math.sin(G.t * 3) * 0.15;
      const rg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * pulse);
      rg.addColorStop(0, 'rgba(255,233,168,0.5)');
      rg.addColorStop(0.7, 'rgba(255,196,110,0.16)');
      rg.addColorStop(1, 'rgba(255,196,110,0)');
      ctx.globalAlpha = Math.min(1, f.life / f.max);
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath(); ctx.arc(f.x, f.y - 2, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(120,90,40,.8)';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(f.x, f.y + 2); ctx.lineTo(f.x, f.y + 10); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawPickups(L, R, T, B) {
  for (const p of G.pickups) {
    if (p.x < L || p.x > R || p.y < T || p.y > B) continue;
    const bob = Math.sin(p.bob) * 2.5;
    if (p.kind === 'exp') {
      const s = 7 + Math.sin(p.bob * 1.6) * 0.8;
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = '#6fe3ff';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, s * 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#bff4ff';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bob - s); ctx.lineTo(p.x + s * 0.72, p.y + bob);
      ctx.lineTo(p.x, p.y + bob + s); ctx.lineTo(p.x - s * 0.72, p.y + bob);
      ctx.closePath(); ctx.fill();
    } else if (p.kind === 'heal') {
      // 治疗结晶：绿色六边形 + 十字，外面套一圈脉动光晕。
      // 血量见底时玩家是冲着它跑的，必须一眼能认出来 —— 原来只是个绿圆点，
      // 混在几十颗经验结晶里根本找不到。
      const pulse = 0.5 + Math.sin(p.bob * 2) * 0.5;
      ctx.globalAlpha = 0.16 + pulse * 0.18;
      ctx.fillStyle = '#5fe08a';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 17 + pulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#7de3a0';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k / 6) * Math.PI * 2;
        const r = 10;
        if (k) ctx.lineTo(p.x + Math.cos(a) * r, p.y + bob + Math.sin(a) * r);
        else ctx.moveTo(p.x + Math.cos(a) * r, p.y + bob + Math.sin(a) * r);
      }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0c2016';
      ctx.fillRect(p.x - 1.6, p.y + bob - 4.6, 3.2, 9.2);
      ctx.fillRect(p.x - 4.6, p.y + bob - 1.6, 9.2, 3.2);
    } else if (p.kind === 'rage') {
      // 狂气球：橙色火焰形，同样带脉动光晕
      const pulse = 0.5 + Math.sin(p.bob * 2.2) * 0.5;
      ctx.globalAlpha = 0.15 + pulse * 0.17;
      ctx.fillStyle = '#ff9350';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 16 + pulse * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ff9350';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + bob - 11);
      ctx.quadraticCurveTo(p.x + 7, p.y + bob - 2, p.x + 4, p.y + bob + 6);
      ctx.quadraticCurveTo(p.x, p.y + bob + 10, p.x - 4, p.y + bob + 6);
      ctx.quadraticCurveTo(p.x - 7, p.y + bob - 2, p.x, p.y + bob - 11);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,236,196,0.88)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y + bob + 3, 2.6, 4, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      // 宝箱 / 命轮：金色宝箱，脉动光圈提示「这块一定要捡」
      const r = p.kind === 'wheel' ? 15 : 12;
      ctx.globalAlpha = 0.25 + Math.sin(G.t * 4) * 0.12;
      ctx.fillStyle = p.kind === 'wheel' ? '#ffe066' : '#e3b341';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.kind === 'wheel' ? '#ffe9a8' : '#d8b26a';
      ctx.fillRect(p.x - r, p.y + bob - r * 0.75, r * 2, r * 1.5);
      ctx.fillStyle = 'rgba(30,24,12,0.85)';
      ctx.fillRect(p.x - r, p.y + bob - 1.6, r * 2, 3.2);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFx() {
  for (const f of G.fx) {
    const a = Math.max(0, f.life / f.max);
    if (f.kind === 'ring') {
      const t = 1 - a;
      const rr = f.ring * (0.35 + t * 0.75);
      // 内层填充 + 主环 + 一道淡余波：只描一圈细线时，几百个弹道里看不出是「爆炸」
      ctx.globalAlpha = a * 0.11;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = a * 0.5;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.6 * a + 0.6;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = a * 0.2;
      ctx.beginPath(); ctx.arc(f.x, f.y, rr * 1.07, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'line') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
    } else if (f.kind === 'claw') {
      // 三道爪痕，带方向 —— 玩家一眼能看出「从哪边抓过来的」
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.a);
      ctx.globalAlpha = a * 0.9;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(i * 9, 0, 15, -0.95, 0.95);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.4 + a * 0.8), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const t of G.texts) {
    const a = Math.min(1, t.life * 2.4);
    const big = t.kind === 1 || t.kind === 2 || t.kind === 4 || t.kind === 6;
    ctx.globalAlpha = a;
    ctx.font = `${big ? 700 : 600} ${big ? 15 : t.kind === 5 ? 13 : 12}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = t.kind === 1 ? '#ffd479'
      : t.kind === 2 ? '#8ce0a8'
        : t.kind === 3 ? '#ff7b72'
          : t.kind === 4 ? '#ff9350'
            : t.kind === 5 ? '#9fc4ff'
              : t.kind === 6 ? '#ffe9a8'
                : '#e6e9f0';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(6,9,14,0.85)';
    ctx.strokeText(t.txt, t.x, t.y);
    ctx.fillText(t.txt, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// 暗角：预渲染一次，别每帧重建渐变（全屏渐变填充在软件渲染下很贵）
function vignette(W, H) {
  if (!vignette.cache || vignette.cache.w !== W || vignette.cache.h !== H) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(W * 0.5));
    c.height = Math.max(1, Math.round(H * 0.5));
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(c.width / 2, c.height / 2, Math.min(c.width, c.height) * 0.32,
      c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.78);
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = grd;
    g.fillRect(0, 0, c.width, c.height);
    vignette.cache = { w: W, h: H, c };
  }
  ctx.drawImage(vignette.cache.c, 0, 0, W, H);
}
