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

let cv = null;
let ctx = null;
let img = null;
let ground = null;      // 离屏地面 tile
let glow = null;        // 预渲染的光晕精灵（三类敌人各一张）
let shadow = null;      // 预渲染的脚下椭圆阴影
let dpr = 1;

export function init(canvas) {
  cv = canvas;
  ctx = canvas.getContext('2d', { alpha: false });
  img = new Image();
  img.decoding = 'async';
  img.src = ATLAS;
  ground = makeGround();
  glow = { 0: makeGlow('150,120,190'), 1: makeGlow('227,179,65'), 2: makeGlow('232,105,95') };
  shadow = makeShadow();
  return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
}

// 地面：生成一次 512×512 的 tile，之后用 pattern 平铺。
// 每帧画几百个石子会直接把帧率吃掉，pattern 一次 fill 就够。
function makeGround() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#111621';
  g.fillRect(0, 0, S, S);

  // 底噪：几十块深浅不一的暗斑，让平铺时看不出接缝
  let seed = 20261029;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 90; i++) {
    const x = rnd() * S, y = rnd() * S, r = 8 + rnd() * 46;
    const a = 0.02 + rnd() * 0.05;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(105,140,200,${a * 1.5})`);
    grd.addColorStop(1, 'rgba(90,120,180,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // 网格：每 64 一格，很淡，只用来提供移动参照
  g.strokeStyle = 'rgba(130,160,215,0.06)';
  g.lineWidth = 1;
  for (let i = 0; i <= S; i += 64) {
    g.beginPath(); g.moveTo(i + 0.5, 0); g.lineTo(i + 0.5, S); g.stroke();
    g.beginPath(); g.moveTo(0, i + 0.5); g.lineTo(S, i + 0.5); g.stroke();
  }
  return c;
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

  // 屏幕层：受伤红闪 / 暗角
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(232,80,70,${G.flash * 0.24})`;
    ctx.fillRect(0, 0, W, H);
  }
  vignette(W, H);
}

function drawGround(L, T, R, B) {
  // pattern 建一次就够：图块不变，每帧重建会白烧一次纹理解码。
  if (!drawGround.pat) drawGround.pat = ctx.createPattern(ground, 'repeat');
  if (!drawGround.pat) return;
  // pattern 在 user space（= 世界坐标）里平铺，所以不做额外变换：
  // 一格就是 512 世界单位，跟着相机走，缩放由外层 setTransform 统一处理。
  ctx.fillStyle = drawGround.pat;
  ctx.fillRect(L, T, R - L, B - T);
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
  frame(c.img, P.x, P.y, size, 1, false);
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
}

function drawEnemies(L, R, T, B) {
  for (const e of G.enemies) {
    if (e.x < L || e.x > R || e.y < T || e.y > B) continue;
    const sz = e.r * 2.3;
    const bob = Math.sin(e.wob) * 2;
    if (shadow) ctx.drawImage(shadow, e.x - e.r * 1.05, e.y + e.r * 0.58, e.r * 2.1, e.r * 0.9);
    // 一圈浅色描边：怪物立绘本身是深色剪影，压在深色地格上会糊成一团
    ctx.strokeStyle = e.tier === 2 ? 'rgba(255,150,140,0.30)' : e.tier === 1 ? 'rgba(255,215,130,0.26)' : 'rgba(190,200,230,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.98, 0, Math.PI * 2); ctx.stroke();
    const gs = e.r * 2.9;
    const sp = glow[e.tier] || glow[0];
    if (sp) ctx.drawImage(sp, e.x - gs / 2, e.y + bob - gs / 2, gs, gs);
    frame(e.img, e.x, e.y + bob, sz, 1, false);
    if (e.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.55, e.flash * 5)})`;
      ctx.beginPath(); ctx.arc(e.x, e.y + bob, e.r * 0.92, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
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
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 12, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(s.x, s.y, 11, 0, Math.PI * 2); ctx.clip();
    frame(s.img, s.x, s.y, 24, 0.95, false);
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
    ctx.globalAlpha = f.delay > 0 ? 0.35 + Math.sin(G.t * 40) * 0.15 : Math.min(0.5, f.life / f.max) * 0.55;
    ctx.fillStyle = f.color;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (f.delay > 0 ? (1.15 - t * 0.15) : 1), 0, Math.PI * 2); ctx.fill();
    if (f.delay > 0) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.stroke();
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
      ctx.fillStyle = 'rgba(120,230,150,0.9)';
      ctx.beginPath(); ctx.arc(p.x, p.y + bob, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0c1018';
      ctx.fillRect(p.x - 1.4, p.y + bob - 4, 2.8, 8);
      ctx.fillRect(p.x - 4, p.y + bob - 1.4, 8, 2.8);
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
      ctx.globalAlpha = a * 0.45;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 1.6 * a + 0.6;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.ring * (0.35 + t * 0.75), 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'line') {
      ctx.globalAlpha = a;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x2, f.y2); ctx.stroke();
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
    const big = t.kind === 1 || t.kind === 2;
    ctx.globalAlpha = a;
    ctx.font = `${big ? 700 : 600} ${big ? 15 : 12}px system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif`;
    ctx.fillStyle = t.kind === 1 ? '#ffd479' : t.kind === 2 ? '#8ce0a8' : t.kind === 3 ? '#ff7b72' : '#e6e9f0';
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
