// 剧情场景的程序化背景。
//
// 为什么画而不是贴图：这一页总共只有「HTML + 一个 bundle」两个请求，任何一张背景图
// 都会让边缘多一次 1~2 秒的往返；而这些场景（走廊 / 教室 / 蜡像馆 / 天台 / 天亮）
// 本来就是几何体堆出来的，用 canvas 画反而更可控——同一段代码既能在 390 宽的手机上
// 成立，也能在 1080 宽的桌面上成立，不用为两种比例各压一张图。
//
// 全部画法是「透视盒子 + 光」：先定消失点，再把地板/墙/门按比例投过去，最后压一层暗角。
// 随机量都用固定种子，保证每次进同一个场景，星星和罐子都在原来的位置。

const TAU = Math.PI * 2;

function seedRnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sky(c, W, H, stops) {
  const g = c.createLinearGradient(0, 0, 0, H);
  for (const [p, col] of stops) g.addColorStop(p, col);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function glow(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(0.45, col.replace(/[\d.]+\)$/, (a * 0.45).toFixed(3) + ')'));
  g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
  c.save();
  c.globalAlpha = a;
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.restore();
}

function vignette(c, W, H, a) {
  const g = c.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.25, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ 走廊
function hall(c, t, W, H) {
  sky(c, W, H, [[0, '#0a0d14'], [0.45, '#121722'], [1, '#080b10']]);
  const vx = W * 0.5, vy = H * 0.47;

  // 尽头那扇窗：唯一的光源
  const ww = W * 0.09, wh = H * 0.1;
  glow(c, vx, vy, Math.min(W, H) * 0.42, 'rgba(150,190,255,0.42)', 0.5);
  c.fillStyle = '#20304a';
  c.fillRect(vx - ww, vy - wh * 1.1, ww * 2, wh * 2);
  c.fillStyle = '#9fc0f0';
  c.globalAlpha = 0.5;
  c.fillRect(vx - ww + 2, vy - wh * 1.1 + 2, ww * 2 - 4, wh * 2 - 4);
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(12,18,28,.9)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(vx, vy - wh * 1.1); c.lineTo(vx, vy + wh * 0.9);
  c.moveTo(vx - ww, vy - wh * 0.1); c.lineTo(vx + ww, vy - wh * 0.1);
  c.stroke();

  // 地板：木条朝消失点收敛
  c.save();
  c.beginPath();
  c.moveTo(0, H); c.lineTo(vx - ww * 1.2, vy + wh * 0.9);
  c.lineTo(vx + ww * 1.2, vy + wh * 0.9); c.lineTo(W, H);
  c.closePath(); c.clip();
  c.fillStyle = '#241a16';
  c.fillRect(0, 0, W, H);
  for (let i = -14; i <= 14; i++) {
    const x0 = vx + i * W * 0.035;
    const x1 = vx + i * W * 0.36;
    c.strokeStyle = i % 2 ? 'rgba(74,52,38,.55)' : 'rgba(48,34,26,.7)';
    c.lineWidth = Math.max(1, Math.abs(i) * 0.12);
    c.beginPath(); c.moveTo(x0, vy + wh * 0.9); c.lineTo(x1, H); c.stroke();
  }
  // 横向接缝，越远越密
  for (let k = 1; k <= 9; k++) {
    const p = Math.pow(k / 9, 2.1);
    const y = vy + wh * 0.9 + (H - vy - wh * 0.9) * p;
    c.strokeStyle = 'rgba(20,14,10,.55)';
    c.lineWidth = 1 + p * 2;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  c.restore();

  // 两侧墙 + 门
  for (const side of [-1, 1]) {
    const ex = side < 0 ? 0 : W;
    c.fillStyle = side < 0 ? '#151119' : '#1a1520';
    c.beginPath();
    c.moveTo(ex, 0); c.lineTo(vx + side * ww * 1.2, vy - wh * 1.1);
    c.lineTo(vx + side * ww * 1.2, vy + wh * 0.9); c.lineTo(ex, H);
    c.closePath(); c.fill();

    // 三扇门：靠近观众的更大更靠外，越远越挤向中心（透视缩比 0.42 / 0.30 / 0.20）
    const persp = [0.42, 0.30, 0.20];
    for (let i = 0; i < 3; i++) {
      const p = persp[i];
      const dw = W * 0.075 * p * 2.4;
      const dh = H * 0.62 * p * 1.7;
      const yTop = H * (0.50 - dh * 0.5) + i * H * 0.012;
      const xOuter = side < 0 ? W * (0.03 + (1 - p) * 0.45) : W * (0.97 - (1 - p) * 0.45);
      const x0 = side < 0 ? xOuter : xOuter - dw;
      c.fillStyle = 'rgba(6,5,9,.92)';
      c.fillRect(x0, yTop, dw, dh);
      c.strokeStyle = 'rgba(150,170,215,.07)';
      c.lineWidth = 1;
      c.strokeRect(x0 + 0.5, yTop + 0.5, dw - 1, dh - 1);
      // 门缝里漏出来的光：只有最近那扇门是暖的
      c.fillStyle = i === 0 ? 'rgba(255,205,140,.13)' : 'rgba(130,160,210,.06)';
      c.fillRect(x0 + dw * 0.06, yTop + dh * 0.04, Math.max(2, dw * 0.06), dh * 0.92);
    }
  }

  // 吊灯
  for (const lx of [W * 0.30, W * 0.70]) {
    const lw = Math.min(W, H) * 0.055;
    const ly = H * (0.12 + Math.sin(t * 0.6 + lx) * 0.004);
    c.strokeStyle = 'rgba(20,24,32,.85)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, ly); c.stroke();
    c.fillStyle = '#2a2f3c';
    c.beginPath(); c.ellipse(lx, ly, lw, lw * 0.45, 0, 0, TAU); c.fill();
    const flick = 0.72 + Math.sin(t * 7 + lx) * 0.05 + Math.sin(t * 17.3) * 0.03;
    glow(c, lx, ly + lw * 0.5, lw * 5.4, 'rgba(255,190,110,0.55)', 0.55 * flick);
    c.fillStyle = `rgba(255,222,168,${0.75 * flick})`;
    c.beginPath(); c.ellipse(lx, ly + lw * 0.22, lw * 0.55, lw * 0.3, 0, 0, TAU); c.fill();
  }

  vignette(c, W, H, 0.72);
}

// ------------------------------------------------------------------ 解剖教室
function lab(c, t, W, H) {
  sky(c, W, H, [[0, '#0a1016'], [1, '#060a0e']]);
  // 瓷砖墙
  const s = Math.max(26, Math.min(W, H) * 0.075);
  c.fillStyle = '#1b232c';
  c.fillRect(0, 0, W, H * 0.78);
  for (let y = 0; y < H * 0.78; y += s) {
    for (let x = 0; x < W; x += s) {
      const v = ((x / s + y / s) % 3) * 0.02;
      c.fillStyle = `rgba(${44 + v * 255},${54 + v * 255},${64 + v * 255},1)`;
      c.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
  }
  c.strokeStyle = 'rgba(10,16,22,.65)';
  c.lineWidth = 1;
  for (let y = 0; y < H * 0.78; y += s) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let x = 0; x < W; x += s) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.78); c.stroke(); }

  // 架子 + 标本罐
  const shelfY = [H * 0.30, H * 0.46, H * 0.62];
  const rnd = seedRnd(9173);
  for (let i = 0; i < shelfY.length; i++) {
    const y = shelfY[i];
    c.fillStyle = '#141b22';
    c.fillRect(W * 0.03, y, W * 0.94, Math.max(3, H * 0.008));
    const n = 7 - i;
    for (let j = 0; j < n; j++) {
      const cw = Math.min(W, H) * 0.042;
      const x = W * 0.06 + j * (W * 0.9 / n) + rnd() * 6;
      const hh = cw * (1.4 + rnd() * 0.9);
      c.fillStyle = 'rgba(120,180,170,.16)';
      c.fillRect(x, y - hh, cw, hh);
      c.strokeStyle = 'rgba(170,220,215,.22)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y - hh + 0.5, cw - 1, hh - 1);
      // 罐子里的东西
      c.fillStyle = 'rgba(28,40,44,.85)';
      const bw = cw * (0.36 + rnd() * 0.26);
      const bh = hh * (0.3 + rnd() * 0.28);
      c.beginPath();
      c.ellipse(x + cw / 2, y - bh * 0.8 - 2, bw * 0.6, bh * 0.6, 0.3, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(200,240,235,.06)';
      c.fillRect(x + cw * 0.15, y - hh + 3, cw * 0.22, hh * 0.5);
    }
  }

  // 中央解剖台
  const tx = W * 0.5, ty = H * 0.74;
  const tw = W * 0.46, th = H * 0.055;
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(tx, ty + th * 1.9, tw * 0.62, th * 0.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#2c333c';
  c.beginPath();
  c.moveTo(tx - tw / 2, ty); c.lineTo(tx + tw / 2, ty);
  c.lineTo(tx + tw * 0.42, ty + th); c.lineTo(tx - tw * 0.42, ty + th);
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(190,215,230,.10)';
  c.fillRect(tx - tw * 0.46, ty - th * 0.12, tw * 0.92, th * 0.14);
  c.fillStyle = '#1b2128';
  c.fillRect(tx - tw * 0.34, ty + th, tw * 0.06, th * 1.7);
  c.fillRect(tx + tw * 0.28, ty + th, tw * 0.06, th * 1.7);

  // 手术灯
  const lx = tx, ly = H * 0.10;
  c.fillStyle = '#20262e';
  c.beginPath(); c.ellipse(lx, ly, W * 0.06, W * 0.018, 0, 0, TAU); c.fill();
  const flick = 0.86 + Math.sin(t * 5.1) * 0.05;
  // 光锥
  const g = c.createLinearGradient(lx, ly, lx, ty);
  g.addColorStop(0, `rgba(210,240,255,${0.16 * flick})`);
  g.addColorStop(1, 'rgba(210,240,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(lx - W * 0.055, ly); c.lineTo(lx + W * 0.055, ly);
  c.lineTo(lx + W * 0.26, ty); c.lineTo(lx - W * 0.26, ty);
  c.closePath(); c.fill();
  glow(c, lx, ly, Math.min(W, H) * 0.3, 'rgba(200,235,255,0.5)', 0.35 * flick);

  vignette(c, W, H, 0.66);
}

// ------------------------------------------------------------------ 蜡像馆
function wax(c, t, W, H) {
  sky(c, W, H, [[0, '#120b16'], [0.6, '#0d0810'], [1, '#07050a']]);
  // 拱形壁龛
  for (let i = 0; i < 5; i++) {
    const w = W * 0.17;
    const x = W * 0.09 + i * (W * 0.185);
    c.fillStyle = '#1a1220';
    c.beginPath();
    c.moveTo(x, H * 0.66);
    c.lineTo(x, H * 0.30);
    c.quadraticCurveTo(x + w / 2, H * 0.19, x + w, H * 0.30);
    c.lineTo(x + w, H * 0.66);
    c.closePath(); c.fill();
  }
  // 蜡像：头 + 肩 + 底座
  const rnd = seedRnd(4412);
  for (let i = 0; i < 5; i++) {
    const w = W * 0.17;
    const x = W * 0.09 + i * (W * 0.185) + w / 2;
    const base = H * 0.66;
    const hh = H * (0.20 + rnd() * 0.06);
    const bw = w * 0.42;
    c.fillStyle = '#0a070d';
    c.fillRect(x - bw * 0.72, base, bw * 1.44, H * 0.03);
    c.fillStyle = '#2a2130';
    c.beginPath();
    c.moveTo(x - bw * 0.62, base);
    c.lineTo(x - bw * 0.5, base - hh * 0.62);
    c.quadraticCurveTo(x, base - hh * 0.78, x + bw * 0.5, base - hh * 0.62);
    c.lineTo(x + bw * 0.62, base);
    c.closePath(); c.fill();
    // 头
    c.fillStyle = '#332738';
    c.beginPath();
    c.ellipse(x, base - hh * 0.9, bw * 0.33, bw * 0.42, 0, 0, TAU);
    c.fill();
    // 眼窝（暗）+ 一丁点反光
    c.fillStyle = 'rgba(0,0,0,.55)';
    c.beginPath(); c.ellipse(x - bw * 0.13, base - hh * 0.93, bw * 0.07, bw * 0.05, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x + bw * 0.13, base - hh * 0.93, bw * 0.07, bw * 0.05, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,240,220,.14)';
    c.fillRect(x - bw * 0.28, base - hh * 0.78, bw * 0.1, hh * 0.3);
  }
  // 地面
  c.fillStyle = '#0b0810';
  c.fillRect(0, H * 0.69, W, H * 0.31);
  c.strokeStyle = 'rgba(180,160,200,.05)';
  for (let i = 0; i < 9; i++) {
    const y = H * 0.69 + Math.pow(i / 9, 1.7) * H * 0.31;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // 两盏烛台
  for (const cx of [W * 0.12, W * 0.88]) {
    const cy = H * 0.72;
    c.fillStyle = '#2a2028';
    c.fillRect(cx - 2, cy - H * 0.1, 4, H * 0.1);
    const f = 0.8 + Math.sin(t * 6.2 + cx) * 0.12 + Math.sin(t * 13.1) * 0.06;
    c.fillStyle = '#f6d69a';
    c.beginPath(); c.ellipse(cx, cy - H * 0.105, 3 * f, 6 * f, 0, 0, TAU); c.fill();
    glow(c, cx, cy - H * 0.105, Math.min(W, H) * 0.24, 'rgba(255,190,110,0.5)', 0.5 * f);
  }
  vignette(c, W, H, 0.76);
}

// ------------------------------------------------------------------ 天台
function roof(c, t, W, H) {
  sky(c, W, H, [[0, '#05081a'], [0.5, '#0b1030'], [0.8, '#171a3c'], [1, '#0a0b18']]);
  // 星
  const rnd = seedRnd(77213);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * H * 0.72;
    const s = 0.4 + rnd() * 1.3;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.7 + rnd()) + i));
    c.fillStyle = `rgba(210,225,255,${0.25 + tw * 0.6})`;
    c.fillRect(x, y, s, s);
  }
  // 月
  const mx = W * 0.74, my = H * 0.20, mr = Math.min(W, H) * 0.075;
  glow(c, mx, my, mr * 4.2, 'rgba(180,200,255,0.5)', 0.42);
  c.fillStyle = '#e8eeff';
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(150,165,200,.35)';
  c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); c.fill();
  c.beginPath(); c.arc(mx + mr * 0.28, my + mr * 0.3, mr * 0.15, 0, TAU); c.fill();
  // 城市剪影
  const rnd2 = seedRnd(3311);
  c.fillStyle = '#05060f';
  let bx = 0;
  while (bx < W) {
    const bw = W * (0.03 + rnd2() * 0.05);
    const bh = H * (0.06 + rnd2() * 0.16);
    c.fillRect(bx, H * 0.70 - bh, bw, bh + H * 0.05);
    // 窗
    c.fillStyle = 'rgba(255,200,120,.18)';
    for (let k = 0; k < 2; k++) {
      if (rnd2() > 0.55) c.fillRect(bx + bw * (0.2 + k * 0.4), H * 0.70 - bh + H * 0.02, bw * 0.12, H * 0.012);
    }
    c.fillStyle = '#05060f';
    bx += bw + W * 0.004;
  }
  // 天台地面
  c.fillStyle = '#0c0d16';
  c.fillRect(0, H * 0.74, W, H * 0.26);
  c.strokeStyle = 'rgba(160,180,230,.06)';
  for (let i = 1; i < 7; i++) {
    const y = H * 0.74 + Math.pow(i / 7, 1.6) * H * 0.26;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // 栏杆
  c.strokeStyle = 'rgba(120,140,180,.5)';
  c.lineWidth = Math.max(2, H * 0.006);
  c.beginPath();
  c.moveTo(0, H * 0.70); c.lineTo(W, H * 0.70);
  c.moveTo(0, H * 0.755); c.lineTo(W, H * 0.755);
  c.stroke();
  c.lineWidth = Math.max(1, H * 0.003);
  c.strokeStyle = 'rgba(110,130,170,.36)';
  for (let x = W * 0.02; x < W; x += W * 0.055) {
    c.beginPath(); c.moveTo(x, H * 0.70); c.lineTo(x, H * 0.76); c.stroke();
  }
  vignette(c, W, H, 0.6);
}

// ------------------------------------------------------------------ 融蚀 / 深渊
function abyss(c, t, W, H) {
  sky(c, W, H, [[0, '#050409'], [0.55, '#08060c'], [1, '#030205']]);
  const cx = W / 2, cy = H * 0.46;
  glow(c, cx, cy, Math.min(W, H) * 0.5, 'rgba(120,170,255,0.35)', 0.28);
  // 触须
  for (let i = 0; i < 9; i++) {
    const ph = i * 1.7;
    const baseX = W * (i / 8);
    c.strokeStyle = `rgba(${14 + i * 2},${16 + i},${24 + i * 3},.95)`;
    c.lineWidth = Math.max(3, Math.min(W, H) * (0.02 - i * 0.0014));
    c.beginPath();
    for (let k = 0; k <= 24; k++) {
      const p = k / 24;
      const x = baseX + Math.sin(p * 4 + t * 0.5 + ph) * W * 0.06 * p;
      const y = H - p * H * (0.55 + (i % 3) * 0.12);
      if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  // 浮着的银芯微粒
  const rnd = seedRnd(5521);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = ((rnd() * H + t * (6 + rnd() * 14)) % H);
    const a = 0.18 + 0.5 * Math.abs(Math.sin(t * 1.4 + i));
    c.fillStyle = `rgba(190,215,255,${a})`;
    c.fillRect(x, y, 1.6, 1.6);
  }
  vignette(c, W, H, 0.86);
}

// ------------------------------------------------------------------ 天亮
function dawn(c, t, W, H) {
  sky(c, W, H, [
    [0, '#101a3a'], [0.35, '#2c3163'], [0.6, '#7a5470'], [0.78, '#d88a63'], [1, '#f0b57a'],
  ]);
  // 云带
  const rnd = seedRnd(9917);
  for (let i = 0; i < 7; i++) {
    const y = H * (0.22 + i * 0.06);
    const x = ((rnd() * W + t * (2 + i)) % (W * 1.4)) - W * 0.2;
    const w = W * (0.3 + rnd() * 0.5);
    const a = 0.05 + rnd() * 0.07;
    c.fillStyle = `rgba(255,220,200,${a})`;
    c.beginPath(); c.ellipse(x, y, w, H * 0.012, 0, 0, TAU); c.fill();
  }
  // 太阳
  const sx = W * 0.66, sy = H * 0.66;
  glow(c, sx, sy, Math.min(W, H) * 0.6, 'rgba(255,220,160,0.75)', 0.55);
  c.fillStyle = 'rgba(255,246,225,.95)';
  c.beginPath(); c.arc(sx, sy, Math.min(W, H) * 0.048, 0, TAU); c.fill();
  // 校舍剪影
  c.fillStyle = '#1c1a2a';
  const gy = H * 0.74;
  c.fillRect(0, gy, W, H * 0.26);
  for (let i = 0; i < 5; i++) {
    const bw = W * 0.15;
    const bx = W * 0.02 + i * W * 0.2;
    const bh = H * (0.1 + (i % 2) * 0.05);
    c.fillRect(bx, gy - bh, bw, bh);
    // 尖顶
    c.beginPath();
    c.moveTo(bx, gy - bh); c.lineTo(bx + bw / 2, gy - bh - H * 0.05); c.lineTo(bx + bw, gy - bh);
    c.closePath(); c.fill();
  }
  // 树影
  for (let i = 0; i < 6; i++) {
    const tx = W * (0.05 + i * 0.17);
    c.beginPath();
    c.ellipse(tx, gy + H * 0.06, W * 0.05, H * 0.05, 0, 0, TAU);
    c.fill();
  }
  vignette(c, W, H, 0.4);
}

// ------------------------------------------------------------------ 标题：夜空下的校舍
function title(c, t, W, H) {
  sky(c, W, H, [[0, '#070c1c'], [0.4, '#101a38'], [0.72, '#1d2b55'], [1, '#0b1020']]);
  const rnd = seedRnd(20261);
  for (let i = 0; i < 120; i++) {
    const x = rnd() * W, y = rnd() * H * 0.62;
    const s = 0.5 + rnd() * 1.5;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + rnd() * 0.8) + i * 1.7));
    c.fillStyle = `rgba(214,228,255,${0.3 + tw * 0.7})`;
    c.fillRect(x, y, s, s);
  }
  // 月
  const mx = W * 0.82, my = H * 0.16, mr = Math.min(W, H) * 0.06;
  glow(c, mx, my, mr * 6, 'rgba(180,205,255,0.5)', 0.5);
  c.fillStyle = '#eef3ff';
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(170,185,220,.35)';
  c.beginPath(); c.arc(mx - mr * 0.28, my - mr * 0.22, mr * 0.2, 0, TAU); c.fill();
  // 云
  const rnd3 = seedRnd(881);
  for (let i = 0; i < 5; i++) {
    const cy = H * (0.12 + rnd3() * 0.3);
    const cx = ((rnd3() * W + t * (1.5 + i * 0.6)) % (W * 1.5)) - W * 0.25;
    c.fillStyle = `rgba(140,165,220,${0.05 + rnd3() * 0.05})`;
    c.beginPath(); c.ellipse(cx, cy, W * (0.12 + rnd3() * 0.18), H * 0.018, 0, 0, TAU); c.fill();
  }
  // 校舍
  const gy = H * 0.80;
  const rnd2 = seedRnd(6611);
  c.fillStyle = '#060a14';
  // 主楼
  const mw = W * 0.52, mx0 = W * 0.24;
  c.fillRect(mx0, gy - H * 0.30, mw, H * 0.30);
  c.beginPath();
  c.moveTo(mx0, gy - H * 0.30); c.lineTo(mx0 + mw / 2, gy - H * 0.42); c.lineTo(mx0 + mw, gy - H * 0.30);
  c.closePath(); c.fill();
  // 钟楼
  c.fillRect(W * 0.47, gy - H * 0.50, W * 0.06, H * 0.22);
  c.beginPath();
  c.moveTo(W * 0.47, gy - H * 0.50); c.lineTo(W * 0.50, gy - H * 0.58); c.lineTo(W * 0.53, gy - H * 0.50);
  c.closePath(); c.fill();
  // 彩色玻璃窗：唯一暖色
  for (let i = 0; i < 9; i++) {
    const wx = mx0 + mw * (0.06 + i * 0.1);
    const wy = gy - H * 0.24;
    const hue = [255, 205, 155][i % 3];
    const pulse = 0.5 + 0.3 * Math.abs(Math.sin(t * 0.8 + i));
    c.fillStyle = `rgba(${hue},${Math.round(hue * 0.66)},${Math.round(hue * 0.44)},${pulse})`;
    c.fillRect(wx, wy, W * 0.028, H * 0.075);
    glow(c, wx + W * 0.014, wy + H * 0.037, W * 0.06, 'rgba(255,190,120,0.45)', 0.34 * pulse);
  }
  // 侧楼
  c.fillStyle = '#060a14';
  for (let i = 0; i < 2; i++) {
    const bw = W * 0.14;
    const bx = i === 0 ? W * 0.04 : W * 0.80;
    const bh = H * (0.2 + rnd2() * 0.06);
    c.fillRect(bx, gy - bh, bw, bh);
    c.beginPath();
    c.moveTo(bx, gy - bh); c.lineTo(bx + bw / 2, gy - bh - H * 0.06); c.lineTo(bx + bw, gy - bh);
    c.closePath(); c.fill();
  }
  // 地面雾
  const fg = c.createLinearGradient(0, gy - H * 0.02, 0, H);
  fg.addColorStop(0, 'rgba(10,14,26,0)');
  fg.addColorStop(0.35, 'rgba(9,12,22,.85)');
  fg.addColorStop(1, 'rgba(6,8,16,.96)');
  c.fillStyle = fg;
  c.fillRect(0, gy - H * 0.02, W, H - gy + H * 0.02);
  vignette(c, W, H, 0.32);
}

const DRAW = { hall, lab, wax, roof, abyss, dawn, title };

// 对外只留一个入口：key 不认识就画走廊（宁可画错场景，也别让剧情卡住）
export function drawScene(c, key, t, W, H) {
  (DRAW[key] || hall)(c, t, W, H);
}
