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

// 剪影树：树冠是一丛重叠的圆。用三颗椭圆拼会留出缺口，透出天空像块白三角。
function tree(c, x, gy, w, h, ink) {
  c.fillStyle = ink;
  c.fillRect(x - w * 0.14, gy - h * 0.52, w * 0.28, h * 0.58);
  const cy = gy - h * 0.70;
  c.beginPath();
  for (const [dx, dy, r] of [[0, 0, 1], [-0.62, 0.16, 0.74], [0.62, 0.16, 0.76], [-0.34, -0.28, 0.62], [0.36, -0.26, 0.60]]) {
    c.arc(x + dx * w, cy + dy * h, w * r, 0, TAU);
  }
  c.fill();
}

// ------------------------------------------------------------------ 走廊
function hall(c, t, W, H) {
  sky(c, W, H, [[0, '#0a0d14'], [0.45, '#121722'], [1, '#080b10']]);
  const vx = W * 0.5, vy = H * 0.47;

  // 尽头那扇窗：唯一的光源
  const ww = W * 0.055, wh = H * 0.075;
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

  // 天花板：从消失点向上收的梯形，比墙更暗，走廊才有顶
  c.fillStyle = '#0a0910';
  c.beginPath();
  c.moveTo(0, 0); c.lineTo(W, 0);
  c.lineTo(vx + ww * 1.2, vy - wh * 1.1);
  c.lineTo(vx - ww * 1.2, vy - wh * 1.1);
  c.closePath(); c.fill();
  // 横梁
  for (let i = 0; i < 3; i++) {
    const p = 0.28 + i * 0.26;
    const y = H * (0.13 * p + 0.06);
    const half = W * (0.5 - 0.44 * p) + ww;
    c.strokeStyle = 'rgba(60,48,44,.36)';
    c.lineWidth = Math.max(2, H * 0.008 * (1 - p * 0.5));
    c.beginPath(); c.moveTo(vx - half * 1.5, y); c.lineTo(vx + half * 1.5, y); c.stroke();
  }

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

    // 墙上的竖向条纹，给出「这是木墙板」的纵深
    for (let k = 1; k <= 6; k++) {
      const p = k / 7;
      const xt = ex + (vx + side * ww * 1.2 - ex) * p;
      c.strokeStyle = 'rgba(255,240,220,.03)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(xt, H * 0.10); c.lineTo(xt, H * 0.52); c.stroke();
    }

    // 两扇门：门洞 + 门框 + 门缝底光。近处那扇更大更亮
    for (let i = 0; i < 2; i++) {
      const near = i === 0;
      const dx0 = side < 0 ? W * (near ? 0.055 : 0.205) : W * (near ? 0.945 : 0.795);
      const dw = W * (near ? 0.085 : 0.055);
      const dh = H * (near ? 0.40 : 0.27);
      const x0 = side < 0 ? dx0 : dx0 - dw;
      const y0 = H * (near ? 0.30 : 0.35);
      // 门框
      c.strokeStyle = 'rgba(150,170,215,.16)';
      c.lineWidth = Math.max(1.5, W * 0.0022);
      c.strokeRect(x0 - 2, y0 - 2, dw + 4, dh + 4);
      // 门板
      c.fillStyle = 'rgba(8,6,11,.95)';
      c.fillRect(x0, y0, dw, dh);
      // 门板上的凹格
      c.strokeStyle = 'rgba(120,140,180,.10)';
      c.lineWidth = 1;
      c.strokeRect(x0 + dw * 0.14, y0 + dh * 0.10, dw * 0.72, dh * 0.34);
      c.strokeRect(x0 + dw * 0.14, y0 + dh * 0.54, dw * 0.72, dh * 0.34);
      // 门缝漏光（只有最近那扇是暖的）
      c.fillStyle = near ? 'rgba(255,205,140,.20)' : 'rgba(130,160,210,.10)';
      c.fillRect(side < 0 ? x0 + dw - 2 : x0, y0 + 2, 2, dh - 4);
      c.fillRect(x0 + 2, y0 + dh - 3, dw - 4, 2.5);
    }

    // 踢脚线：沿墙脚一条微亮线，把墙和地板分开
    c.strokeStyle = 'rgba(190,170,150,.09)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(ex, H); c.lineTo(vx + side * ww * 1.2, vy + wh * 0.9);
    c.stroke();
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

  vignette(c, W, H, 0.62);
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

// ------------------------------------------------------------------ 锅炉房
function boiler(c, t, W, H) {
  sky(c, W, H, [[0, '#160d09'], [0.6, '#100906'], [1, '#070403']]);
  // 墙上横穿的两根主管道
  for (const [py, ph] of [[H * 0.16, H * 0.055], [H * 0.30, H * 0.04]]) {
    const g = c.createLinearGradient(0, py, 0, py + ph);
    g.addColorStop(0, '#4a2f20');
    g.addColorStop(0.4, '#6b452e');
    g.addColorStop(1, '#2c1a11');
    c.fillStyle = g;
    c.fillRect(0, py, W, ph);
    c.strokeStyle = 'rgba(255,200,150,.13)';
    c.lineWidth = Math.max(1, H * 0.002);
    c.beginPath(); c.moveTo(0, py + ph * 0.2); c.lineTo(W, py + ph * 0.2); c.stroke();
    // 法兰
    for (let x = W * 0.06; x < W; x += W * 0.17) {
      c.fillStyle = '#3d2718';
      c.fillRect(x, py - ph * 0.14, W * 0.008, ph * 1.28);
      c.fillStyle = 'rgba(255,214,170,.18)';
      c.fillRect(x + W * 0.0015, py - ph * 0.1, W * 0.0018, ph * 1.2);
    }
  }
  // 右边的锅炉罐体
  const bx = W * 0.70, bw = W * 0.24, bTop = H * 0.34, bBot = H * 0.78;
  // 从罐顶接上去的一根立管，把这台锅炉连到天花板的横管上
  const pg = c.createLinearGradient(bx + bw * 0.38, 0, bx + bw * 0.62, 0);
  pg.addColorStop(0, '#2c1a11');
  pg.addColorStop(0.45, '#5c3c26');
  pg.addColorStop(1, '#22140d');
  c.fillStyle = pg;
  c.fillRect(bx + bw * 0.38, H * 0.06, bw * 0.24, bTop - H * 0.06);
  const bg = c.createLinearGradient(bx, 0, bx + bw, 0);
  bg.addColorStop(0, '#2a1a12');
  bg.addColorStop(0.35, '#453022');
  bg.addColorStop(1, '#1d120c');
  c.fillStyle = bg;
  c.beginPath();
  if (c.roundRect) c.roundRect(bx, bTop, bw, bBot - bTop, bw * 0.12);
  else c.rect(bx, bTop, bw, bBot - bTop);
  c.fill();
  // 炉口：橙红的火
  const fy = bBot - (bBot - bTop) * 0.28;
  const fg = c.createRadialGradient(bx + bw * 0.5, fy, 2, bx + bw * 0.5, fy, bw * 0.55);
  const fl = 0.85 + Math.sin(t * 5.4) * 0.1 + Math.sin(t * 11.3) * 0.05;
  fg.addColorStop(0, `rgba(255,196,110,${0.85 * fl})`);
  fg.addColorStop(0.35, `rgba(255,120,40,${0.5 * fl})`);
  fg.addColorStop(1, 'rgba(180,50,10,0)');
  c.fillStyle = fg;
  c.beginPath(); c.arc(bx + bw * 0.5, fy, bw * 0.55, 0, TAU); c.fill();
  c.fillStyle = 'rgba(10,6,4,.9)';
  c.beginPath();
  c.ellipse(bx + bw * 0.5, fy, bw * 0.17, bw * 0.13, 0, 0, TAU);
  c.fill();
  // 炉口洒到地上的那片暖光
  const fgl = c.createRadialGradient(bx + bw * 0.5, H * 0.84, 2, bx + bw * 0.5, H * 0.84, bw * 1.1);
  fgl.addColorStop(0, `rgba(255,150,60,${0.30 * fl})`);
  fgl.addColorStop(0.5, `rgba(220,100,30,${0.12 * fl})`);
  fgl.addColorStop(1, 'rgba(180,60,10,0)');
  c.fillStyle = fgl;
  c.beginPath(); c.ellipse(bx + bw * 0.5, H * 0.86, bw * 1.0, H * 0.12, 0, 0, TAU); c.fill();
  // 压力表
  c.fillStyle = '#c9b48c';
  c.beginPath(); c.arc(bx + bw * 0.5, bTop + (bBot - bTop) * 0.18, bw * 0.13, 0, TAU); c.fill();
  c.strokeStyle = '#2a1a12'; c.lineWidth = Math.max(1.5, W * 0.003); c.stroke();
  const na = -2.2 + Math.sin(t * 1.6) * 0.35;
  c.beginPath();
  c.moveTo(bx + bw * 0.5, bTop + (bBot - bTop) * 0.18);
  c.lineTo(bx + bw * 0.5 + Math.cos(na) * bw * 0.1, bTop + (bBot - bTop) * 0.18 + Math.sin(na) * bw * 0.1);
  c.stroke();
  // 蒸汽：从地面往上飘的几团
  const rnd = seedRnd(8812);
  for (let i = 0; i < 9; i++) {
    const sx = rnd() * W;
    const p = ((t * (0.06 + rnd() * 0.05) + rnd()) % 1);
    const sy = H * 0.86 - p * H * 0.62;
    const r = Math.min(W, H) * (0.04 + p * 0.07);
    const a = 0.10 * (1 - p) * (0.6 + 0.4 * Math.sin(t * 2 + i));
    c.fillStyle = `rgba(226,214,200,${a})`;
    c.beginPath(); c.arc(sx + Math.sin(p * 5 + i) * W * 0.02, sy, r, 0, TAU); c.fill();
  }
  // 地面
  c.fillStyle = '#0a0605';
  c.fillRect(0, H * 0.82, W, H * 0.18);
  const gg = c.createLinearGradient(0, H * 0.82, 0, H);
  gg.addColorStop(0, 'rgba(90,52,26,.18)');
  gg.addColorStop(1, 'rgba(20,10,6,.1)');
  c.fillStyle = gg;
  c.fillRect(0, H * 0.82, W, H * 0.18);
  c.strokeStyle = 'rgba(255,180,120,.06)';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = H * 0.82 + Math.pow(i / 6, 1.6) * H * 0.18;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  vignette(c, W, H, 0.7);
}

// ------------------------------------------------------------------ 大礼堂
function opera(c, t, W, H) {
  sky(c, W, H, [[0, '#180a10'], [0.5, '#12070c'], [1, '#070307']]);
  // 幕布：两侧各一幅厚重的帘子
  for (const side of [0, 1]) {
    const x0 = side ? W : 0, dir = side ? -1 : 1;
    const cw = W * 0.19;
    for (let i = 0; i < 7; i++) {
      const x = x0 + dir * (i * cw) / 7;
      const g = c.createLinearGradient(x, 0, x + dir * cw / 7, 0);
      g.addColorStop(0, 'rgba(64,14,24,.96)');
      g.addColorStop(0.5, 'rgba(122,28,44,.9)');
      g.addColorStop(1, 'rgba(48,10,18,.96)');
      c.fillStyle = g;
      c.fillRect(Math.min(x, x + dir * cw / 7), 0, cw / 7, H);
    }
    // 束带
    c.fillStyle = 'rgba(226,178,110,.22)';
    c.fillRect(Math.min(x0, x0 + dir * cw), H * 0.52, cw, H * 0.028);
  }
  // 舞台后的幕：波浪下摆
  c.fillStyle = '#20090f';
  c.fillRect(W * 0.19, 0, W * 0.62, H * 0.42);
  c.beginPath();
  c.moveTo(W * 0.19, H * 0.42);
  for (let i = 0; i <= 24; i++) {
    const p = i / 24;
    const x = W * 0.19 + p * W * 0.62;
    c.lineTo(x, H * 0.42 + Math.sin(p * 9 + 0.6) * H * 0.022);
  }
  c.lineTo(W * 0.81, 0); c.lineTo(W * 0.19, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(226,178,110,.2)';
  c.lineWidth = Math.max(1.5, H * 0.003);
  c.stroke();
  // 聚光灯：从顶上打到舞台上
  const sp = W * 0.5;
  const lg = c.createLinearGradient(sp, H * 0.08, sp, H * 0.72);
  lg.addColorStop(0, `rgba(255,236,196,${0.16 + Math.sin(t * 1.1) * 0.02})`);
  lg.addColorStop(1, 'rgba(255,236,196,0)');
  c.fillStyle = lg;
  c.beginPath();
  c.moveTo(sp - W * 0.012, H * 0.06);
  c.lineTo(sp + W * 0.012, H * 0.06);
  c.lineTo(sp + W * 0.16, H * 0.72);
  c.lineTo(sp - W * 0.16, H * 0.72);
  c.closePath(); c.fill();
  glow(c, sp, H * 0.72, Math.min(W, H) * 0.3, 'rgba(255,220,170,0.35)', 0.3);
  // 舞台地面
  c.fillStyle = '#150a0d';
  c.fillRect(0, H * 0.72, W, H * 0.28);
  c.strokeStyle = 'rgba(255,200,150,.06)';
  for (let i = 1; i < 7; i++) {
    const y = H * 0.72 + Math.pow(i / 7, 1.5) * H * 0.28;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // 前景观众席剪影（只露椅背，压住画面底部）
  c.fillStyle = '#050205';
  for (let row = 0; row < 3; row++) {
    const y = H * 0.885 + row * H * 0.042;
    const w = W * (0.062 - row * 0.006);
    for (let x = -w * 0.4; x < W + w; x += w * 1.12) {
      c.beginPath();
      if (c.roundRect) c.roundRect(x, y, w, H * 0.075, w * 0.32);
      else c.rect(x, y, w, H * 0.075);
      c.fill();
    }
  }
  // 两侧壁灯
  for (const wx of [W * 0.06, W * 0.94]) {
    const f = 0.85 + Math.sin(t * 4.2 + wx) * 0.15;
    glow(c, wx, H * 0.34, Math.min(W, H) * 0.22, 'rgba(255,190,120,0.45)', 0.5 * f);
    c.fillStyle = '#f6d69a';
    c.beginPath(); c.ellipse(wx, H * 0.34, W * 0.006, H * 0.014 * f, 0, 0, TAU); c.fill();
  }
  vignette(c, W, H, 0.76);
}

// ------------------------------------------------------------------ 长明礼拜堂
function chapel(c, t, W, H) {
  sky(c, W, H, [[0, '#0b1018'], [0.55, '#080c13'], [1, '#04060a']]);
  // 拱顶
  c.strokeStyle = 'rgba(120,140,180,.10)';
  c.lineWidth = Math.max(1.5, H * 0.004);
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.arc(W / 2, H * 0.66, W * (0.18 + i * 0.11), Math.PI * 1.08, Math.PI * 1.92);
    c.stroke();
  }
  // 三扇彩窗：中间大
  const wins = [[0.28, 0.075, 0.30], [0.5, 0.10, 0.36], [0.72, 0.075, 0.30]];
  const hud = [['#7fb0ff', '#c9a6ff'], ['#ffd28a', '#ff9c9c'], ['#8affc8', '#7fb0ff']];
  for (let i = 0; i < 3; i++) {
    const [cxr, rr, hh] = wins[i];
    const x = W * cxr, w = W * rr, top = H * 0.30, bot = H * (0.30 + hh);
    c.fillStyle = 'rgba(6,10,16,.92)';
    c.beginPath();
    c.moveTo(x - w / 2, bot);
    c.lineTo(x - w / 2, top + w * 0.5);
    c.quadraticCurveTo(x, top - w * 0.1, x + w / 2, top + w * 0.5);
    c.lineTo(x + w / 2, bot);
    c.closePath(); c.fill();
    const rnd = seedRnd(300 + i * 77);
    for (let r = 0; r < 6; r++) {
      for (let q = 0; q < 2; q++) {
        c.fillStyle = hud[i][(r + q) % 2];
        c.globalAlpha = 0.16 + rnd() * 0.3;
        c.fillRect(
          x - w / 2 + 2 + q * (w - 4) / 2,
          top + w * 0.42 + r * (bot - top - w * 0.42) / 6 + 1,
          (w - 6) / 2, (bot - top - w * 0.42) / 6 - 2,
        );
      }
    }
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(150,170,205,.28)';
    c.lineWidth = Math.max(1.2, H * 0.003);
    c.beginPath();
    c.moveTo(x - w / 2, bot);
    c.lineTo(x - w / 2, top + w * 0.5);
    c.quadraticCurveTo(x, top - w * 0.1, x + w / 2, top + w * 0.5);
    c.lineTo(x + w / 2, bot);
    c.stroke();
    c.beginPath(); c.moveTo(x, top + w * 0.18); c.lineTo(x, bot); c.stroke();
    // 光柱：从窗里斜下来落到地上
    const lg = c.createLinearGradient(x, bot, x, H * 0.92);
    lg.addColorStop(0, 'rgba(190,210,255,.13)');
    lg.addColorStop(1, 'rgba(190,210,255,0)');
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(x - w / 2, bot);
    c.lineTo(x + w / 2, bot);
    c.lineTo(x + w * 0.9, H * 0.92);
    c.lineTo(x - w * 0.9, H * 0.92);
    c.closePath(); c.fill();
  }
  // 地面
  c.fillStyle = '#080b10';
  c.fillRect(0, H * 0.80, W, H * 0.20);
  // 中央通道
  const cg = c.createLinearGradient(W / 2 - W * 0.08, 0, W / 2 + W * 0.08, 0);
  cg.addColorStop(0, 'rgba(60,20,30,.5)');
  cg.addColorStop(0.5, 'rgba(96,32,44,.55)');
  cg.addColorStop(1, 'rgba(60,20,30,.5)');
  c.fillStyle = cg;
  c.beginPath();
  c.moveTo(W / 2 - W * 0.045, H * 0.80);
  c.lineTo(W / 2 + W * 0.045, H * 0.80);
  c.lineTo(W / 2 + W * 0.085, H);
  c.lineTo(W / 2 - W * 0.085, H);
  c.closePath(); c.fill();
  // 长椅：中间留出通道，两侧各一列
  c.fillStyle = '#04060a';
  for (let row = 0; row < 4; row++) {
    const y = H * (0.80 + row * 0.05);
    const inset = W * (0.10 - row * 0.01);
    const w = W * (0.055 + row * 0.012);
    const gap = W * 0.10 + row * W * 0.01;
    for (let x = inset; x < W / 2 - gap; x += w * 2.1) {
      for (const bx of [x, x + w * 1.5]) {
        if (bx + w > W / 2 - gap) break;
        c.fillRect(bx, y, w, H * 0.018);
        c.fillRect(W - bx - w, y, w, H * 0.018);
      }
    }
  }
  // 祭坛前的长明灯
  for (let i = 0; i < 5; i++) {
    const lx = W * (0.36 + i * 0.07);
    const f = 0.75 + Math.sin(t * 5.8 + i * 1.3) * 0.25;
    glow(c, lx, H * 0.80, Math.min(W, H) * 0.11, 'rgba(255,200,130,0.5)', 0.45 * f);
    c.fillStyle = '#f8d79c';
    c.beginPath(); c.ellipse(lx, H * 0.80, W * 0.004, H * 0.011 * f, 0, 0, TAU); c.fill();
  }
  vignette(c, W, H, 0.82);
}

// ------------------------------------------------------------------ 天亮
function dawn(c, t, W, H) {
  sky(c, W, H, [
    [0, '#0e1834'], [0.3, '#2a2f60'], [0.55, '#7b5674'], [0.76, '#d9895f'], [0.9, '#f3bd83'], [1, '#f8cf9a'],
  ]);
  // 打散渐变的色阶断层（8bit 画宽渐变一定会出带）
  const rndN = seedRnd(4242);
  for (let i = 0; i < 900; i++) {
    const x = rndN() * W, y = rndN() * H;
    c.fillStyle = rndN() > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.03)';
    c.fillRect(x, y, 2, 2);
  }
  // 云带
  const rnd = seedRnd(9917);
  for (let i = 0; i < 8; i++) {
    const y = H * (0.20 + i * 0.055);
    const x = ((rnd() * W + t * (2 + i)) % (W * 1.4)) - W * 0.2;
    const w = W * (0.3 + rnd() * 0.5);
    const a = 0.05 + rnd() * 0.08;
    c.fillStyle = `rgba(255,214,190,${a})`;
    c.beginPath(); c.ellipse(x, y, w, H * 0.012, 0, 0, TAU); c.fill();
  }
  // 太阳：已经升到屋顶线以上，整个人能看见；暖光留在天际
  const mn = Math.min(W, H);
  const sx = W * 0.30, sy = H * 0.50;
  glow(c, sx, sy, mn * 0.8, 'rgba(255,225,170,0.9)', 0.5);
  glow(c, W * 0.48, H * 0.74, mn * 1.2, 'rgba(255,190,128,0.85)', 0.45);
  c.fillStyle = 'rgba(255,251,236,.98)';
  c.beginPath(); c.arc(sx, sy, mn * 0.050, 0, TAU); c.fill();
  // 校舍剪影：宽窄高矮都不一样，还有一根烟囱，别排成一模一样的房子
  const gy = H * 0.76;
  const inkD = '#1a1826';
  c.fillStyle = inkD;
  c.fillRect(0, gy, W, H - gy);
  const blocks = [
    [0.00, 0.10, 0.085, 1], [0.09, 0.07, 0.125, 0], [0.155, 0.115, 0.075, 1],
    [0.265, 0.075, 0.155, 1], [0.335, 0.075, 0.105, 0], [0.405, 0.115, 0.135, 1],
    [0.515, 0.085, 0.185, 1], [0.595, 0.065, 0.115, 0], [0.655, 0.105, 0.09, 1],
    [0.755, 0.095, 0.145, 1], [0.845, 0.075, 0.10, 0], [0.915, 0.085, 0.125, 1],
  ];
  for (const [x0, w0, h0, gable] of blocks) {
    const bx = W * x0, bw = W * w0, bh = H * h0;
    c.fillRect(bx, gy - bh, bw, bh);
    if (gable) {
      c.beginPath();
      c.moveTo(bx, gy - bh);
      c.lineTo(bx + bw / 2, gy - bh - Math.min(H * 0.045, bw * 0.55));
      c.lineTo(bx + bw, gy - bh);
      c.closePath(); c.fill();
    }
  }
  // 烟囱
  c.fillRect(W * 0.545, gy - H * 0.225, W * 0.012, H * 0.05);
  // 窗：太阳一出来，还有几间亮着
  const rndW = seedRnd(3137);
  for (const [x0, w0, h0, gable] of blocks) {
    if (h0 < 0.09) continue;
    const cols = Math.max(1, Math.round(w0 * 26));
    for (let i = 0; i < cols; i++) {
      if (rndW() < 0.55) continue;
      const wx2 = W * x0 + W * w0 * ((i + 0.5) / cols) - W * 0.006;
      const wy2 = gy - H * h0 + H * (gable ? 0.055 : 0.028);
      c.fillStyle = `rgba(255,206,142,${0.16 + rndW() * 0.2})`;
      c.fillRect(wx2, wy2, W * 0.012, H * 0.016);
    }
  }
  // 栏杆：把地面和楼脚分开
  c.fillStyle = 'rgba(255,196,140,.10)';
  c.fillRect(0, gy + H * 0.008, W, H * 0.003);
  // 树影：立在地面上、盖住楼脚，别让它们变成地上的椭圆
  const rndT = seedRnd(7311);
  for (let i = 0; i < 5; i++) {
    const tx = W * (0.05 + i * 0.21) + rndT() * W * 0.02;
    const tw = W * (0.024 + rndT() * 0.009);
    const th = H * (0.075 + rndT() * 0.035);
    tree(c, tx, gy, tw, th, '#121120');
  }
  vignette(c, W, H, 0.34);
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
  // 月：亮但不是死白，环形山压到极淡
  const mx = W * 0.875, my = H * 0.14, mr = Math.min(W, H) * 0.045;
  glow(c, mx, my, mr * 7, 'rgba(190,212,255,0.45)', 0.55);
  c.fillStyle = '#e8eeff';
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(198,210,240,.3)';
  c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.26, mr * 0.26, 0, TAU); c.fill();
  c.beginPath(); c.arc(mx + mr * 0.34, my + mr * 0.12, mr * 0.17, 0, TAU); c.fill();
  c.beginPath(); c.arc(mx - mr * 0.08, my + mr * 0.44, mr * 0.12, 0, TAU); c.fill();
  // 云
  const rnd3 = seedRnd(881);
  for (let i = 0; i < 5; i++) {
    const cy = H * (0.12 + rnd3() * 0.3);
    const cx = ((rnd3() * W + t * (1.5 + i * 0.6)) % (W * 1.5)) - W * 0.25;
    c.fillStyle = `rgba(140,165,220,${0.05 + rnd3() * 0.05})`;
    c.beginPath(); c.ellipse(cx, cy, W * (0.12 + rnd3() * 0.18), H * 0.018, 0, 0, TAU); c.fill();
  }
  // 校舍占下半张画面：标题卡片靠上放，楼从卡片底下露出来
  const bT = H * 0.52, bH = H - bT;
  const Y = (v) => bT + bH * v;
  const gy = Y(0.90);
  const mid = W * 0.5;
  const ink = '#04070e', ink2 = '#070b15';

  // 窗光在天上留一层暖雾（画在楼之前，不然会把剪影洗灰）
  glow(c, mid, H * 0.44, W * 0.5, 'rgba(255,180,110,0.28)', 0.4);

  // 远处两栋
  c.fillStyle = ink2;
  c.fillRect(0, Y(0.46), W * 0.15, gy - Y(0.46));
  c.fillRect(W * 0.855, Y(0.40), W * 0.145, gy - Y(0.40));

  // 两翼
  c.fillStyle = ink;
  c.fillRect(W * 0.185, Y(0.32), W * 0.16, gy - Y(0.32));
  c.fillRect(W * 0.655, Y(0.32), W * 0.16, gy - Y(0.32));

  // 主楼 + 山墙
  const cTop = Y(0.03);
  c.fillRect(W * 0.31, cTop, W * 0.38, gy - cTop);
  c.beginPath();
  c.moveTo(W * 0.31, cTop); c.lineTo(mid, cTop - bH * 0.34); c.lineTo(W * 0.69, cTop);
  c.closePath(); c.fill();

  // 地面
  const gd = c.createLinearGradient(0, gy, 0, H);
  gd.addColorStop(0, '#080d18');
  gd.addColorStop(1, '#03050a');
  c.fillStyle = gd;
  c.fillRect(0, gy, W, H - gy);
  // 地平线上一道雾，把楼脚糊掉
  const fg = c.createLinearGradient(0, gy - H * 0.035, 0, gy + H * 0.025);
  fg.addColorStop(0, 'rgba(26,36,60,0)');
  fg.addColorStop(0.6, 'rgba(34,46,74,.4)');
  fg.addColorStop(1, 'rgba(10,16,28,.10)');
  c.fillStyle = fg;
  c.fillRect(0, gy - H * 0.035, W, H * 0.06);

  // 窗：两层拱窗，十字窗棂，个别几间黑着
  const rw = W * 0.019, rh = bH * 0.15;
  const pulseAt = (i) => 0.55 + 0.45 * Math.abs(Math.sin(t * 0.7 + i * 1.9));
  const pane = (x, y, w, h, a) => {
    c.fillStyle = `rgba(255,201,132,${a})`;
    c.fillRect(x, y, w, h);
    c.fillStyle = 'rgba(4,7,14,.5)';
    c.fillRect(x + w * 0.44, y, Math.max(1, w * 0.13), h);
    c.fillRect(x, y + h * 0.42, w, Math.max(1, h * 0.08));
  };
  const rows = [Y(0.30), Y(0.58)];
  const colX = mid - (4 * W * 0.062 + rw) / 2;
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 5; i++) {
      const x = colX + i * W * 0.062;
      const on = (i * 3 + r * 5) % 7 !== 0;
      if (on) pane(x, rows[r], rw, rh, 0.22 + 0.5 * pulseAt(i + r));
      else { c.fillStyle = 'rgba(120,150,200,.05)'; c.fillRect(x, rows[r], rw, rh); }
    }
  }
  // 两翼各三扇，只亮一两扇
  for (const wx0 of [W * 0.205, W * 0.675]) {
    for (let i = 0; i < 3; i++) {
      if (i % 2 === 0) pane(wx0 + i * W * 0.045, rows[1], rw * 0.95, rh * 0.95, 0.18 + 0.32 * pulseAt(i));
    }
  }
  // 山墙上的圆窗（就是画面里那口钟）
  glow(c, mid, cTop - bH * 0.15, W * 0.07, 'rgba(255,214,150,0.85)', 0.35);
  c.fillStyle = 'rgba(255,228,172,.9)';
  c.beginPath(); c.arc(mid, cTop - bH * 0.15, W * 0.014, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(6,9,16,.75)'; c.lineWidth = Math.max(1, W * 0.0018);
  c.beginPath();
  c.moveTo(mid, cTop - bH * 0.15); c.lineTo(mid, cTop - bH * 0.15 - W * 0.009);
  c.moveTo(mid, cTop - bH * 0.15); c.lineTo(mid + W * 0.006, cTop - bH * 0.15 + W * 0.0015);
  c.stroke();

  // 门：暖光从门里漫出来，落到地上
  const dw = W * 0.042, dx = mid - dw / 2, dy = Y(0.52);
  glow(c, mid, gy + H * 0.004, W * 0.13, 'rgba(255,186,110,0.6)', 0.55);
  c.fillStyle = 'rgba(255,208,148,.8)';
  c.beginPath();
  c.moveTo(dx, gy); c.lineTo(dx, dy + dw * 0.6);
  c.quadraticCurveTo(mid, dy - dw * 0.3, dx + dw, dy + dw * 0.6);
  c.lineTo(dx + dw, gy); c.closePath(); c.fill();

  // 两棵树，压住画面两角
  for (const [tx2, sc] of [[W * 0.055, 0.76], [W * 0.955, 0.68]]) {
    tree(c, tx2, gy, W * 0.036 * sc, bH * 0.62 * sc, '#03060c');
  }

  vignette(c, W, H, 0.4);
}

const DRAW = { hall, lab, wax, roof, abyss, dawn, title, boiler, opera, chapel };

// 对外只留一个入口：key 不认识就画走廊（宁可画错场景，也别让剧情卡住）
export function drawScene(c, key, t, W, H) {
  (DRAW[key] || hall)(c, t, W, H);
}
