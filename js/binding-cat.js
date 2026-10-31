// 校猫的绘制：把 96×96 的官方头像「改造成不同样式的黑猫」，再往上挂饰品。
//
// 关键手法：原图是浅灰白的猫，直接调色会变成一块黑饼。这里按像素取亮度，
// 把亮度重新映射到「暗部 / 中间调 / 高光」三段调色板上——阴影层次因此保留下来，
// 换一套调色板就是换一个毛色（玄猫、乌云盖雪、玳瑁、星斑……）。
// 花纹（白肚子、白点、玳瑁块、星点、火星）在同一趟像素遍历里叠上去，只做一次，
// 结果按「造型+毛色+瞳色」缓存成离屏 canvas，之后每帧只是 drawImage 一张图。
//
// 坐标约定：所有饰品都在「素材空间」里画 —— 0..96 是原图那张方块，地面在 y=104。
// 于是眼睛在 (30,31)/(61,31)，鼻尖 (47,44)，脖子 (48,78)，这些数来自对着原图量的网格。
import { ART } from './binding-art.js';
import { BUILDS } from './binding-data.js';

const IMG = new Map();
const SKIN = new Map();

export function artImage(key) {
  return IMG.get(key) || null;
}

export function loadArt() {
  const keys = ['cat', 'cat2', 'coin'];
  const jobs = [];
  const add = (k, src) => {
    if (!src) return;
    jobs.push(new Promise((res) => {
      const im = new Image();
      im.onload = () => { IMG.set(k, im); res(); };
      im.onerror = () => res();
      im.src = src;
    }));
  };
  add('cat', ART.cat);
  add('cat2', ART.cat2);
  add('coin', ART.coin);
  for (const [k, v] of Object.entries(ART.items)) add('i:' + k, v);
  for (const [k, v] of Object.entries(ART.trinkets)) add('t:' + k, v);
  for (const [k, v] of Object.entries(ART.actives)) add('a:' + k, v);
  for (const [k, v] of Object.entries(ART.bosses)) add('b:' + k, v);
  // 怪物立绘（游戏自带的图鉴素材），key 前缀 m: 和首领区分开
  for (const [k, v] of Object.entries(ART.monsters || {})) add('m:' + k, v);
  return Promise.all(jobs);
}

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
// 把颜色整体提亮（k>0）或压暗（k<0），身体侧光要用它调出层次。
// 纯色椭圆在暗背景上就是一块贴片——加了明暗才是身体。
function shade(s, k) {
  const [r, g, b] = hex(s);
  const f = (v) => {
    const x = k >= 0 ? v + (255 - v) * k : v * (1 + k);
    return x < 0 ? 0 : x > 255 ? 255 : Math.round(x);
  };
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// 便宜的确定性噪声：同一个 (x,y) 永远同一个值，图案每次生成都长一样
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const gx = Math.floor(x / s), gy = Math.floor(y / s);
  const fx = x / s - gx, fy = y / s - gy;
  const a = hash2(gx, gy), b = hash2(gx + 1, gy), c = hash2(gx, gy + 1), d = hash2(gx + 1, gy + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

// ------------------------------------------------------------------ 毛色合成
export function makeSkin(costume, fur, eye, build) {
  const key = `${costume.k}|${fur.k}|${eye.k}`;
  const hit = SKIN.get(key);
  if (hit) return hit;

  const src = artImage(costume.src || 'cat');
  const size = 192;                       // 2× 96，高清屏放大不糊
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (src) cx.drawImage(src, 0, 0, size, size);

  const dark = hex(fur.d), mid = hex(fur.m), light = hex(fur.l);
  const id = cx.getImageData(0, 0, size, size);
  const d = id.data;
  const pat = fur.pat || 'none';
  const pale = [226, 231, 240];           // 乌云盖雪 / 白点用的白
  const rust = [138, 74, 34];
  const cyan = [110, 227, 200];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const a = d[i + 3];
      if (a < 8) { d[i + 3] = 0; continue; }
      const nx = x / size, ny = y / size;            // 0..1，和分辨率无关

      // 原图是一张「亮脸 + 暗背景/暗身体」的方形裁切图，直接画就是一个黑方块。
      // 所以先按源图亮度做一次抠图：留亮的部分（脸、前爪），把暗的边角丢掉，
      // 剩下的头再和下面程序化的身体接起来，才是一只站着的猫。
      const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const keep = smooth(0.24, 0.46, L);
      const a2 = a * keep;
      if (a2 < 6) { d[i + 3] = 0; continue; }
      d[i + 3] = a2;
      let t = 0.1 + Math.pow(L, 0.92) * 0.92;

      let r, g, b;
      if (t < 0.52) {
        const u = t / 0.52;
        r = dark[0] + (mid[0] - dark[0]) * u;
        g = dark[1] + (mid[1] - dark[1]) * u;
        b = dark[2] + (mid[2] - dark[2]) * u;
      } else {
        const u = (t - 0.52) / 0.48;
        r = mid[0] + (light[0] - mid[0]) * u;
        g = mid[1] + (light[1] - mid[1]) * u;
        b = mid[2] + (light[2] - mid[2]) * u;
      }

      if (pat === 'belly') {
        // 乌云盖雪：下半张脸 / 胸口白，边缘用噪声打碎，免得像贴了个白罩子
        // 注意：原图下半截是不透明的整块身体，不能按 y 直接切，否则白肚皮会变成
        // 一个横跨整幅的白色矩形。这里用椭圆的径向距离来圈胸口。
        const dx = (nx - 0.5) / 0.34;
        const dy = (ny - 0.90) / 0.26;
        const dd = Math.sqrt(dx * dx + dy * dy) + (vnoise(x, y, 20) - 0.5) * 0.3;
        const w = (1 - smooth(0.72, 1.04, dd)) * 0.92;
        if (w > 0) {
          const k = w * (0.55 + 0.45 * L);
          r += (pale[0] * (0.35 + L * 0.65) - r) * k;
          g += (pale[1] * (0.35 + L * 0.65) - g) * k;
          b += (pale[2] * (0.35 + L * 0.65) - b) * k;
        }
      } else if (pat === 'specks') {
        // 墨里藏针：零星几根白毛，密度随机但固定
        const h = hash2(x >> 1, y >> 1);
        if (h > 0.982 && L > 0.35) {
          r += (pale[0] - r) * 0.75; g += (pale[1] - g) * 0.75; b += (pale[2] - b) * 0.75;
        }
      } else if (pat === 'tortie') {
        // 玳瑁：低频噪声切出锈色块
        const n = vnoise(x, y, 34);
        if (n > 0.58) {
          const k = smooth(0.58, 0.72, n) * 0.55;
          r += (rust[0] * (0.3 + L) - r) * k;
          g += (rust[1] * (0.3 + L) - g) * k;
          b += (rust[2] * (0.3 + L) - b) * k;
        }
      } else if (pat === 'stars') {
        // 星斑：格子里撒亮点，亮度随深度衰减
        const c = 14;
        const gx = Math.floor(x / c), gy = Math.floor(y / c);
        if (hash2(gx, gy) > 0.66) {
          const px = (gx + hash2(gx + 7, gy)) * c, py = (gy + hash2(gx, gy + 13)) * c;
          const dist = Math.hypot(x - px, y - py);
          if (dist < 4.2) {
            const k = (1 - dist / 4.2) * 0.95;
            r += (200 - r) * k; g += (215 - g) * k; b += (255 - b) * k;
          }
        }
      } else if (pat === 'ember') {
        // 焦黑：缝里透出火星，只在中间调偏暗的地方亮
        const n = vnoise(x, y, 18);
        if (n > 0.62 && L > 0.42) {
          const k = smooth(0.62, 0.78, n) * 0.85;
          r += (255 - r) * k * 0.9; g += (120 - g) * k * 0.7; b += (40 - b) * k * 0.6;
        }
      } else if (pat === 'ghost') {
        // 幽灵：往青绿偏，整体半透明
        const k = 0.22;
        r += (cyan[0] * (0.25 + L * 0.75) - r) * k;
        g += (cyan[1] * (0.25 + L * 0.75) - g) * k;
        b += (cyan[2] * (0.25 + L * 0.75) - b) * k;
        d[i + 3] = a2 * (0.66 + 0.3 * L);
      }

      // 边缘一圈冷光，黑猫在暗房间里才立得起来
      const edge = a < 190 ? (190 - a) / 190 : 0;
      if (edge > 0) {
        const rim = hex(fur.rim);
        r += (rim[0] - r) * edge * 0.55;
        g += (rim[1] - g) * edge * 0.55;
        b += (rim[2] - b) * edge * 0.55;
      }

      d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }
  cx.putImageData(id, 0, 0);

  // 眼睛：原图那对黑眼窝换成发光的猫瞳，这是「一眼看出是猫」的关键。
  // 位置用 u（和原图对齐），大小用 eu（受基础模型的 eye 缩放），两者必须分开算——
  // 混用一个系数的话，放大小猫的眼睛会顺带把瞳孔推离脸中线。
  const u = size / 96;
  const eu = u * (build && build.eye ? build.eye : 1);
  for (const ex of [30, 61]) {
    const px = ex * u, py = 31.5 * u;

    // 眼窝：瞳孔外一圈压暗，眼珠才像是嵌在脸上而不是贴上去的
    const sock = cx.createRadialGradient(px, py, 1 * eu, px, py, 10 * eu);
    sock.addColorStop(0, 'rgba(0,0,0,.55)');
    sock.addColorStop(0.72, 'rgba(0,0,0,.30)');
    sock.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = sock;
    cx.beginPath(); cx.ellipse(px, py, 10.5 * eu, 10 * eu, 0, 0, 7); cx.fill();

    const g = cx.createRadialGradient(px, py, 0, px, py, 13 * eu);
    g.addColorStop(0, eye.g);
    g.addColorStop(0.45, eye.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = 0.42;
    cx.fillStyle = g;
    cx.beginPath(); cx.ellipse(px, py, 11 * eu, 9.5 * eu, 0, 0, 7); cx.fill();
    cx.restore();

    cx.save();
    cx.beginPath(); cx.ellipse(px, py, 6 * eu, 6.6 * eu, 0, 0, 7); cx.clip();
    cx.fillStyle = eye.c;
    cx.fillRect(px - 8 * eu, py - 9 * eu, 16 * eu, 18 * eu);
    cx.fillStyle = eye.g;
    cx.globalAlpha = 0.55;
    cx.beginPath(); cx.ellipse(px, py + 3 * eu, 5.4 * eu, 3.6 * eu, 0, 0, 7); cx.fill();
    cx.globalAlpha = 1;
    // 竖瞳
    cx.fillStyle = '#05060a';
    cx.beginPath(); cx.ellipse(px, py + 0.5 * eu, 1.7 * eu, 5.9 * eu, 0, 0, 7); cx.fill();
    cx.restore();
    // 眼白高光
    cx.fillStyle = 'rgba(255,255,255,.85)';
    cx.beginPath(); cx.ellipse(px - 2 * eu, py - 2.2 * eu, 1.3 * eu, 1.3 * eu, 0, 0, 7); cx.fill();
  }

  SKIN.set(key, cv);
  return cv;
}

// ------------------------------------------------------------------ 猫本体
// 下面几个是给「基础模型」用的画法：毛边、锥形尾巴、五种耳朵。
// 全部是确定性的——同一个 seed 每帧画出来一模一样，不会抖成噪点。

// 沿椭圆走一圈、半径按两条正弦叠出来的毛刺起伏。amt=0 时就是一个普通椭圆
function puffy(c, cx, cy, rx, ry, amt, seed, t, topW) {
  const N = 56;
  const puff = 0.05 + amt * 0.16;   // 一点底噪：黑猫的轮廓不该是数学椭圆
  const sway = Math.sin(t * 1.6 + seed) * 0.35;
  const tw = topW == null ? 1 : topW;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const sin = Math.sin(a);
    const n = Math.sin(a * 9 + seed) * 0.55 + Math.sin(a * 17 + seed * 2.3 + sway) * 0.45;
    const k = 1 + puff * (1 + n);
    // 上半截往里收：肩膀比屁股窄，整体是个梨形，才像蹲坐的猫而不是一颗蛋。
    // 收窄的那一段整个藏在头后面，所以收到多尖都看不见
    const w = sin < 0 ? 1 - (1 - tw) * smooth(0.15, 0.95, -sin) : 1;
    const yk = sin > 0 ? 1 - 0.05 * sin : 1;        // 屁股略微压平，别太圆
    const x = cx + Math.cos(a) * rx * k * w;
    const y = cy + sin * ry * k * yk;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
}

function quadPts(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, v = 1 - u;
    out.push([v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0],
              v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]]);
  }
  return out;
}

// 一条从 w0 收到 w1 的带子：尾巴要根部粗、尖端细，等宽的 stroke 画不出这个
function ribbon(c, pts, w0, w1, jitter, seed) {
  const L = [], R = [], n = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    let w = (w0 + (w1 - w0) * (i / n)) / 2;
    if (jitter) w *= 1 + (Math.sin(i * 2.7 + (seed || 0)) * 0.5 + Math.sin(i * 4.3 + (seed || 0) * 1.7) * 0.5) * jitter;
    L.push([p[0] - dy * w, p[1] + dx * w]);
    R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  c.beginPath();
  c.moveTo(L[0][0], L[0][1]);
  for (let i = 1; i <= n; i++) c.lineTo(L[i][0], L[i][1]);
  for (let i = n; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
  c.closePath();
}

function drawTail(c, tail, fur, t, moving) {
  const w = tail.w || 6, L = tail.len || 1;
  const sway = Math.sin(t * 2.2) * 7 + (moving ? Math.sin(t * 9) * 3 : 0);
  // 尾巴和身体用同一套明暗逻辑：右边亮、根部暗，不然暗背景上只剩一条轮廓线
  const g = c.createLinearGradient(58, 0, 94, 0);
  g.addColorStop(0, shade(fur.m, -0.4));
  g.addColorStop(0.55, fur.m);
  g.addColorStop(1, shade(fur.m, 0.2));
  c.save();
  c.lineJoin = 'round';

  // 短尾：只剩一个球，跟着呼吸晃
  if (tail.mode === 'stub') {
    const k = Math.sin(t * 2.4) * 0.7;
    c.fillStyle = g;
    c.beginPath(); c.ellipse(71, 96 + k, w * 0.86, w * 0.8, -0.3, 0, 7); c.fill();
    c.save();
    c.globalAlpha *= 0.5;
    c.strokeStyle = fur.rim;
    c.lineWidth = 1.5;
    c.stroke();
    c.restore();
    c.restore();
    return;
  }

  let pts;
  if (tail.mode === 'up') {
    // 幼猫：竖着，短，力气不够所以是弯的
    pts = quadPts([61, 100], [71, 86], [60 - sway * 0.35, 71 - sway * 0.18], 10);
  } else if (tail.mode === 'droop') {
    // 老猫：细长，垂到地上拖着
    pts = quadPts([64, 97], [82, 103], [73 + sway * 0.3, 119], 12);
  } else {
    pts = quadPts([64, 98], [90, 96], [88 + sway * 0.5, 72 + sway * 0.3], 12);
  }
  const w0 = w, w1 = tail.mode === 'up' ? w * 0.46 : w * 0.32;

  if (tail.mode === 'plume') {
    // 长毛：先铺一层更宽的暗毛，再压中间的亮面，边上就是毛茸茸的
    c.fillStyle = shade(fur.m, -0.32);
    ribbon(c, pts, w0 * 1.42, w1 * 2.1, 0.3, 3.3); c.fill();
  }
  c.fillStyle = g;
  ribbon(c, pts, w0, w1, tail.mode === 'plume' ? 0.16 : 0, 1.1); c.fill();
  c.save();
  c.globalAlpha *= 0.5;
  c.strokeStyle = fur.rim;
  c.lineWidth = 1.5;
  ribbon(c, pts, w0 * 0.99, w1 * 0.99, 0, 0); c.stroke();
  c.restore();
  c.restore();
}

// 尖耳 / 圆耳 / 缺角 / 折耳 / 耳尖一撮毛。折耳得画在头前面，其余画在头后面
// （头那张原图是圆毛球，尖耳画在头后只露出头顶上方那截，才不会盖住脸）
function drawEars(c, ear, fur, t, front) {
  const st = ear.style || 'point';
  if ((st === 'fold') !== !!front) return;
  const h = ear.h || 1, w = ear.w || 1;
  const inner = 'rgba(150,92,106,.36)';

  if (st === 'round') {
    for (const s of [-1, 1]) {
      c.fillStyle = fur.d;
      c.beginPath(); c.ellipse(48 + s * 19 * w, 15, 9.6 * w, 13 * h, s * 0.26, 0, 7); c.fill();
      c.save();
      c.globalAlpha *= 0.42;
      c.strokeStyle = fur.rim; c.lineWidth = 1;
      c.beginPath(); c.ellipse(48 + s * 19 * w, 15, 9.6 * w, 13 * h, s * 0.26, 0, 7); c.stroke();
      c.restore();
      c.fillStyle = inner;
      c.beginPath(); c.ellipse(48 + s * 19 * w, 16.5, 5.4 * w, 8 * h, s * 0.26, 0, 7); c.fill();
    }
    return;
  }

  if (st === 'fold') {
    // 折耳：塌下来贴在头顶，只剩一小块圆钝的轮廓 + 一道折痕。
    // 必须画在头前面——画在头后会被圆脸整个盖掉，看起来像没有耳朵
    // 位置必须靠外：太靠内会盖在眼睛上方，看起来像两只角（或兔耳）
    for (const s of [-1, 1]) {
      c.fillStyle = fur.d;
      c.beginPath();
      c.moveTo(48 + s * 16 * w, 29);
      c.quadraticCurveTo(48 + s * 17 * w, 14 * h, 48 + s * 25.5 * w, 15 * h);
      c.quadraticCurveTo(48 + s * 29.5 * w, 21, 48 + s * 28 * w, 29);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(150,92,106,.26)';
      c.beginPath();
      c.moveTo(48 + s * 18.5 * w, 28.5);
      c.quadraticCurveTo(48 + s * 19 * w, 20 * h, 48 + s * 24.5 * w, 20.5 * h);
      c.quadraticCurveTo(48 + s * 26.5 * w, 24, 48 + s * 25.5 * w, 28.5);
      c.closePath();
      c.fill();
      // 折痕：耳朵塌下来的那道线。折耳的关键就在这一道，没它只是一块小凸起
      c.save();
      c.globalAlpha *= 0.8;
      c.strokeStyle = fur.rim;
      c.lineWidth = 1.3;
      c.beginPath();
      c.moveTo(48 + s * 17.5 * w, 27);
      c.quadraticCurveTo(48 + s * 18.5 * w, 17 * h, 48 + s * 25.5 * w, 17.5 * h);
      c.stroke();
      c.restore();
    }
    return;
  }

  // point / notch / tuft 共用一付尖耳；notch 的左耳尖被啃掉一块
  for (const s of [-1, 1]) {
    const notched = st === 'notch' && s < 0;
    c.fillStyle = fur.d;
    c.beginPath();
    c.moveTo(48 + s * 13 * w, 24);
    c.quadraticCurveTo(48 + s * 20 * w, -4 * h, 48 + s * 28 * w, 6 * h);
    if (notched) {
      // 从耳尖往里凹一截再下来，看着像被咬掉一口，而不是撕开
      c.quadraticCurveTo(48 + s * 22 * w, 9 * h, 48 + s * 25 * w, 15);
      c.quadraticCurveTo(48 + s * 30 * w, 20, 48 + s * 26 * w, 26);
    } else {
      c.quadraticCurveTo(48 + s * 33 * w, 18, 48 + s * 26 * w, 26);
    }
    c.closePath();
    c.fill();
    c.save();
    c.globalAlpha *= 0.4;
    c.strokeStyle = fur.rim;
    c.lineWidth = 1;
    c.stroke();
    c.restore();
    // 内耳：黑猫的耳内侧是暗暖色，不点这一块两只耳朵就是两片黑三角
    c.fillStyle = inner;
    c.beginPath();
    c.moveTo(48 + s * 15.5 * w, 15);
    c.quadraticCurveTo(48 + s * 20.5 * w, 1 * h, 48 + s * 26 * w, 8 * h);
    c.quadraticCurveTo(48 + s * 29 * w, 16, 48 + s * 24 * w, 21);
    c.closePath();
    c.fill();
    if (st === 'tuft' && s > 0) {
      // 耳尖一撮毛，长毛猫才有的东西
      c.strokeStyle = fur.l;
      c.lineWidth = 1.1;
      c.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ax = 48 + s * (26.5 + i * 1.1) * w, ay = 5 * h - i * 1.4;
        c.beginPath();
        c.moveTo(ax, ay);
        c.quadraticCurveTo(ax + s * 4.5, ay - 8, ax + s * 2 + Math.sin(t * 3 + i) * 1.7, ay - 13);
        c.stroke();
      }
    }
  }
}

export function drawCat(ctx, o) {
  const fur = o.fur;
  const costume = o.costume || {};
  const build = BUILDS[costume.build] || BUILDS.school;
  const skin = makeSkin(costume, fur, o.eye, build);
  const size = o.size;
  const S = size / 96;
  const t = o.t || 0;
  const moving = !!o.moving;
  const bob = o.bob == null ? (moving ? Math.sin(t * 13) * 1.6 : Math.sin(t * 2.4) * 0.9) : o.bob;
  const accs = o.accs || [];
  const B = build.body, PW = build.paw;
  const fluff = build.fluff || 0;
  // 呼吸：躯干横向几乎不动、竖向轻轻起伏。整只上下飘是 bob 的事，别两处都做
  const br = 1 + Math.sin(t * 2.4) * 0.02 * (build.breathe || 1);

  // 地面投影：径向渐变化开边缘——纯黑实心椭圆压在木地板上像个洞。
  // 宽度跟着体型走：胖猫和幼猫的影子不该一样大
  const shY = o.y - size * 0.02;
  const shW = size * (0.24 + (B.rx / 96) * 0.5);
  const sh = ctx.createRadialGradient(o.x, shY, 0, o.x, shY, shW);
  sh.addColorStop(0, 'rgba(0,0,0,.44)');
  sh.addColorStop(0.5, 'rgba(0,0,0,.26)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(o.x, shY, shW, shW * 0.38, 0, 0, 7);
  ctx.fill();

  ctx.save();
  ctx.translate(o.x, o.y - bob * S);
  ctx.scale(S * (o.flip || 1), S);
  ctx.translate(-48, -104);
  if (o.ghost) ctx.globalAlpha = 0.82;
  // 受伤无敌时闪烁：整只猫半透明，身体部件不会各闪各的
  if (o.dim) ctx.globalAlpha *= 0.42;

  // ---- 背后层
  for (const a of accs) if (BEHIND[a]) BEHIND[a](ctx, t);
  // 尾巴（扇尾会盖掉它）
  if (!accs.includes('fanTail')) drawTail(ctx, build.tail, fur, t, moving);

  // 身体（头像原图下半截是胸口，这里补一个躯干让整只猫站得住）
  // 填充用横向渐变：左边压暗、右边带一点侧光。纯色椭圆在暗背景上就是一块贴片，
  // 怎么调大小都不像身体——得有明暗才有体积。
  // 径向而不是纯色：肚子中间一点微光，边缘压进暗里，形状才融得进背景。
  // 纯色椭圆要么比头亮（头身之间浮出一条锯齿分界线），要么比背景还暗（整只消失）。
  const bodyG = ctx.createRadialGradient(48, B.cy - B.ry * 0.25, 2, 48, B.cy, B.rx * 1.18);
  bodyG.addColorStop(0, shade(fur.m, 0.1));
  bodyG.addColorStop(0.55, fur.m);
  bodyG.addColorStop(1, shade(fur.m, -0.55));
  puffy(ctx, 48, B.cy, B.rx, B.ry * br, fluff, 1.7, t, B.topW);
  ctx.fillStyle = bodyG;
  ctx.fill();

  // 头压在身上的那道阴影：不加这层，躯干顶边会是一条干净得假的弧
  const castG = ctx.createLinearGradient(0, B.cy - B.ry, 0, B.cy + B.ry * 0.5);
  castG.addColorStop(0, 'rgba(0,0,0,.5)');
  castG.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = castG;
  ctx.fill();          // 用的还是上面那条路径，直接再填一遍

  // 下缘的轮廓光：只走底下那半圈，两端淡出。
  // 一整圈闭合的描边会变成「围兜」——黑猫在暗处立起来靠的是光从地上反上来这一道
  const rr = hex(fur.rim);
  const rimG = ctx.createLinearGradient(48 - B.rx, 0, 48 + B.rx, 0);
  rimG.addColorStop(0, `rgba(${rr[0]},${rr[1]},${rr[2]},0)`);
  rimG.addColorStop(0.26, `rgba(${rr[0]},${rr[1]},${rr[2]},1)`);
  rimG.addColorStop(0.74, `rgba(${rr[0]},${rr[1]},${rr[2]},1)`);
  rimG.addColorStop(1, `rgba(${rr[0]},${rr[1]},${rr[2]},0)`);
  ctx.save();
  ctx.globalAlpha *= 0.6;
  ctx.strokeStyle = rimG;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(48, B.cy, B.rx * 1.01, B.ry * br * 1.01, 0, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
  ctx.restore();

  // 前爪：走起来左右交替颠，蹲着就只是轻轻压一下地面。
  // 下缘要比躯干低两三格，否则整只埋在躯干里、根本看不见
  for (const s of [-1, 1]) {
    const px = 48 + s * PW.gap;
    const py = PW.y + (moving ? Math.sin(t * 13 + (s > 0 ? 0 : Math.PI)) * 1.1 : Math.sin(t * 2.4) * 0.35);
    ctx.fillStyle = bodyG;
    ctx.beginPath(); ctx.ellipse(px, py, PW.rx, PW.ry, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.4;
    ctx.strokeStyle = fur.rim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(px, py, PW.rx, PW.ry, 0, Math.PI * 0.08, Math.PI * 0.92);
    ctx.stroke();
    ctx.restore();
    // 趾缝：两道细线，不然前爪就是一块黑饼
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = '#05060a';
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(px - PW.rx * 0.3, py - PW.ry * 0.55); ctx.lineTo(px - PW.rx * 0.3, py + PW.ry * 0.15);
    ctx.moveTo(px + PW.rx * 0.24, py - PW.ry * 0.62); ctx.lineTo(px + PW.rx * 0.24, py + PW.ry * 0.1);
    ctx.stroke();
    ctx.restore();
  }


  // 耳朵：原图是圆毛球，没有耳朵，这里补一对才像猫。折耳得画在头前面才有「折下来」的感觉
  drawEars(ctx, build.ear, fur, t, false);

  // 原图（黑猫化之后）
  ctx.drawImage(skin, 0, 0, 96, 96);
  drawEars(ctx, build.ear, fur, t, true);

  // 躯干顶到了下巴底下，原图那道方形硬切已经被它盖住，这里不用再补毛盖

  // 胡须：长度和下垂都跟模型走——老猫的胡子垂到地上，幼猫只有短短两撇
  const wl = build.whisker ? build.whisker.len : 1;
  const wd = build.whisker ? build.whisker.droop : 0;
  const wsw = Math.sin(t * 2.2) * 1.2;
  ctx.strokeStyle = 'rgba(220,226,240,.22)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const y0 = 50 + i * 3;
      const x0 = 48 + s * 8;
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        48 + s * (8 + 12 * wl), y0 + (i ? 1 : -3) + wd * 5 + wsw * 0.4,
        48 + s * (8 + 20 * wl), y0 + (i ? 4 : -2) + wd * 11 + wsw
      );
    }
  }
  ctx.stroke();

  // ---- 正面层
  for (const a of accs) if (FRONT[a]) FRONT[a](ctx, t, o);
  // 受击闪白
  if (o.hurt > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.75, o.hurt * 1.6);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(48, 60, 34, 40, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 眨眼睛：直接在眼睛位置盖两块毛色，几帧的事，比逐帧图便宜。
  // 盖的那块得跟着基础模型的眼睛比例走，不然大眼猫眨眼只闭一半
  if (o.blink) {
    const es = build.eye || 1;
    ctx.save();
    ctx.translate(o.x, o.y - bob * S);
    ctx.scale(S * (o.flip || 1), S);
    ctx.translate(-48, -104);
    ctx.fillStyle = fur.m;
    for (const ex of [30, 61]) { ctx.beginPath(); ctx.ellipse(ex, 31.5, 7.2 * es, 7.8 * es, 0, 0, 7); ctx.fill(); }
    // 一条闭上的眼缝：只盖色块会像没有眼睛，补一道弧才像「闭着」
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 1.1;
    for (const ex of [30, 61]) {
      ctx.beginPath();
      ctx.arc(ex, 31.5 - 1.5 * es, 4.6 * es, Math.PI * 0.12, Math.PI * 0.88);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 饰品：画在身体后面
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.32);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.5, x - s * 0.35, y - s * 1.05, x, y - s * 0.42);
  ctx.bezierCurveTo(x + s * 0.35, y - s * 1.05, x + s * 1.1, y - s * 0.5, x, y + s * 0.32);
  ctx.closePath();
}

const BEHIND = {
  auraHeart(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(48, 50, 4, 48, 50, 52);
    g.addColorStop(0, 'rgba(255,120,170,.42)');
    g.addColorStop(1, 'rgba(255,120,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, 50, 52, 0, 7); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = t * 1.3 + i * 2.1;
      const x = 48 + Math.cos(a) * 34, y = 34 + Math.sin(a * 1.4) * 12;
      ctx.globalAlpha = 0.6 + 0.35 * Math.sin(t * 3 + i);
      ctx.fillStyle = '#ff9dc0';
      heartPath(ctx, x, y, 8);
      ctx.fill();
    }
    ctx.restore();
  },
  cape(ctx, t) {
    ctx.save();
    const w = Math.sin(t * 3) * 2;
    const g = ctx.createLinearGradient(0, 64, 0, 114);
    g.addColorStop(0, '#8a2b33');
    g.addColorStop(1, '#3a0f15');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(20, 72);
    ctx.quadraticCurveTo(48, 64, 76, 72);
    ctx.quadraticCurveTo(92 + w, 94, 88, 110);
    ctx.quadraticCurveTo(48, 100, 8, 110);
    ctx.quadraticCurveTo(4 + w, 94, 20, 72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,120,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  umbrella(ctx, t) {
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.8) * 1.2);
    ctx.strokeStyle = '#8b6a3f';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(48, 96); ctx.lineTo(48, 22); ctx.stroke();
    const g = ctx.createLinearGradient(0, -14, 0, 34);
    g.addColorStop(0, '#5c7398');
    g.addColorStop(1, '#28334a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, 32);
    ctx.quadraticCurveTo(48, -26, 94, 32);
    for (let i = 8; i >= 0; i--) {
      const x = 2 + (92 * i) / 8;
      ctx.quadraticCurveTo(x + 5, 24, x, 30);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,180,255,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  coreAura(ctx, t) {
    const coin = artImage('coin');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(190,205,235,.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(48, 88, 36, 12, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const a = t * 1.6 + i * Math.PI;
      const x = 48 + Math.cos(a) * 36, y = 88 + Math.sin(a) * 12;
      if (coin) ctx.drawImage(coin, x - 5, y - 5, 10, 10);
    }
    ctx.restore();
  },
  stars(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = t * 0.9 + i * 1.05;
      const x = 48 + Math.cos(a) * (34 + (i % 2) * 8);
      const y = 46 + Math.sin(a * 1.7) * 26;
      const s = 1.6 + 1.4 * (0.5 + 0.5 * Math.sin(t * 4 + i));
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 3 + i * 2);
      ctx.fillStyle = '#cfe0ff';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s * 0.6, y - s * 0.4);
      ctx.lineTo(x + s * 2.2, y); ctx.lineTo(x + s * 0.6, y + s * 0.4);
      ctx.lineTo(x, y + s * 2.2); ctx.lineTo(x - s * 0.6, y + s * 0.4);
      ctx.lineTo(x - s * 2.2, y); ctx.lineTo(x - s * 0.6, y - s * 0.4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------------ 饰品：画在身体前面
const FRONT = {
  dripMouth(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#8c1f24';
    ctx.beginPath();
    ctx.ellipse(47, 58, 4.2, 2.2, 0, 0, 7);
    ctx.fill();
    const drip = (t * 14) % 10;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(49, 62 + drip, 1.3, 2.2 + drip * 0.2, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  },
  earClip(ctx) {
    ctx.save();
    ctx.strokeStyle = '#9aa6bb';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 26); ctx.lineTo(26, 12); ctx.moveTo(20, 32); ctx.lineTo(32, 18);
    ctx.stroke();
    ctx.strokeStyle = '#cfd8e8';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(16, 12, 3.4, 0, 7); ctx.stroke();
    ctx.restore();
  },
  bow(ctx) {
    ctx.save();
    const g = ctx.createLinearGradient(20, 68, 76, 94);
    g.addColorStop(0, '#2b3348'); g.addColorStop(1, '#141a27');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(48, 82); ctx.quadraticCurveTo(26, 64, 16, 82); ctx.quadraticCurveTo(26, 100, 48, 82);
    ctx.moveTo(48, 82); ctx.quadraticCurveTo(70, 64, 80, 82); ctx.quadraticCurveTo(70, 100, 48, 82);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,235,.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#c9d3e6';
    ctx.beginPath(); ctx.ellipse(48, 82, 3.8, 4.2, 0, 0, 7); ctx.fill();
    ctx.restore();
  },
  brooch(ctx) {
    ctx.save();
    const g = ctx.createRadialGradient(46, 86, 1, 48, 88, 7);
    g.addColorStop(0, '#ff8b8b'); g.addColorStop(0.5, '#c8202f'); g.addColorStop(1, '#5c0a12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, 88, 5.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(48, 88, 6.6, 0, 7); ctx.stroke();
    ctx.restore();
  },
  fanTail(ctx, t) {
    ctx.save();
    ctx.translate(78, 90);
    ctx.rotate(-0.42 + Math.sin(t * 2) * 0.06);
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.rotate(i * 0.28);
      const g = ctx.createLinearGradient(0, 0, 0, -30);
      g.addColorStop(0, '#8a93a8'); g.addColorStop(1, '#e9edf6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -20, 6, 19, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },
  chain(ctx) {
    ctx.save();
    ctx.strokeStyle = '#aeb9cd';
    ctx.lineWidth = 2.8;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.8 + (i / 8) * Math.PI * 1.6;
      ctx.beginPath();
      ctx.arc(48, 64, 29, a - 0.07, a + 0.07);
      ctx.stroke();
    }
    ctx.fillStyle = '#3b4252';
    ctx.strokeStyle = '#9aa6bb';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(41, 88, 14, 12, 3) : ctx.rect(41, 88, 14, 12);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  prismEye(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(61, 20); ctx.lineTo(74, 40); ctx.lineTo(48, 40);
    ctx.closePath();
    const g = ctx.createLinearGradient(48, 20, 74, 40);
    g.addColorStop(0, 'rgba(160,220,255,.55)');
    g.addColorStop(0.5, 'rgba(200,160,255,.45)');
    g.addColorStop(1, 'rgba(255,200,160,.5)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,235,255,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  monocle(ctx) {
    ctx.save();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(61, 31, 11, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,255,.14)';
    ctx.beginPath(); ctx.arc(61, 31, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9a94a';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(50, 36); ctx.quadraticCurveTo(36, 52, 30, 66); ctx.stroke();
    ctx.restore();
  },
  glasses(ctx) {
    ctx.save();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(30, 31, 9.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(61, 31, 9.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(39.5, 31); ctx.lineTo(51.5, 31); ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,255,.10)';
    ctx.beginPath(); ctx.arc(30, 31, 9.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(61, 31, 9.5, 0, 7); ctx.fill();
    ctx.restore();
  },
  goggles(ctx) {
    ctx.save();
    ctx.fillStyle = '#2a3346';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(14, 24, 68, 8, 4) : ctx.rect(14, 24, 68, 8);
    ctx.fill();
    for (const ex of [30, 61]) {
      ctx.fillStyle = '#111826';
      ctx.beginPath(); ctx.arc(ex, 31, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6b7c9e';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(ex, 31, 11, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(150,220,255,.22)';
      ctx.beginPath(); ctx.arc(ex - 3, 28, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  pocketWatch(ctx, t) {
    ctx.save();
    ctx.strokeStyle = '#c9a94a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(62, 76); ctx.quadraticCurveTo(72, 84, 70, 92); ctx.stroke();
    ctx.fillStyle = '#2a3244';
    ctx.beginPath(); ctx.arc(70, 96, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(70, 96, 6, 0, 7); ctx.stroke();
    const a = t * 2;
    ctx.strokeStyle = '#f0e2b0';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(70, 96); ctx.lineTo(70 + Math.cos(a) * 4, 96 + Math.sin(a) * 4); ctx.stroke();
    ctx.restore();
  },
  haloDial(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(240,200,110,.85)';
    ctx.beginPath(); ctx.arc(48, 4, 21, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,200,255,.8)';
    ctx.beginPath(); ctx.arc(48, 4, 21, 0, Math.PI); ctx.stroke();
    const a = t * 1.4;
    ctx.fillStyle = 'rgba(255,225,150,.9)';
    ctx.beginPath(); ctx.arc(48 + Math.cos(a) * 21, 4 + Math.sin(a) * 21, 2.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  hairClip(ctx, t) {
    ctx.save();
    ctx.translate(78, 14);
    ctx.rotate(Math.sin(t * 2) * 0.12);
    for (const s of [-1, 1]) {
      const g = ctx.createLinearGradient(0, 0, 10 * s, -8);
      g.addColorStop(0, '#7c5cff'); g.addColorStop(1, '#c9b6ff');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(6 * s, -4, 6, 5, s * 0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5 * s, 4, 4.4, 4, s * 0.5, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#1a1f2b';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 6); ctx.stroke();
    ctx.restore();
  },
  armor(ctx) {
    ctx.save();
    for (const s of [-1, 1]) {
      const x = 48 + s * 25;
      const g = ctx.createLinearGradient(x, 70, x, 92);
      g.addColorStop(0, '#f0ead8'); g.addColorStop(1, '#b9af94');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - s * 3, 72);
      ctx.quadraticCurveTo(x + s * 14, 74, x + s * 9, 92);
      ctx.quadraticCurveTo(x - s * 2, 86, x - s * 3, 72);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,80,60,.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  },
  eyepatch(ctx, t) {
    ctx.save();
    const g = ctx.createRadialGradient(30, 31, 1, 30, 31, 11);
    g.addColorStop(0, '#dfe9ff'); g.addColorStop(0.35, '#7f8ca8'); g.addColorStop(1, '#2b3242');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(30, 31, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1b2130';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(30, 31, 10, 0, 7); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(120,220,255,${0.35 + 0.25 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(30, 31, 3.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  lantern(ctx, t) {
    ctx.save();
    ctx.translate(86, 46 + Math.sin(t * 1.6) * 2.2);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    g.addColorStop(0, 'rgba(255,190,90,.55)');
    g.addColorStop(0.5, 'rgba(255,150,60,.20)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#7a6438';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.rect(-6, -8, 12, 15); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,110,.9)';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 5, 0, 0, 7); ctx.fill();
    ctx.restore();
  },
  ribbonTail(ctx) {
    ctx.save();
    ctx.fillStyle = '#c9d3e6';
    ctx.beginPath(); ctx.ellipse(62, 88, 8, 4.2, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#8f9bb4';
    ctx.beginPath(); ctx.ellipse(62, 88, 2.6, 2.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9d3e6';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(66, 89); ctx.quadraticCurveTo(80, 94, 78, 104); ctx.stroke();
    ctx.restore();
  },
  tearDrop(ctx, t) {
    ctx.save();
    const d = (t * 9) % 8;
    ctx.fillStyle = 'rgba(150,225,255,.9)';
    ctx.beginPath();
    ctx.ellipse(23, 40 + d, 2.6, 3.4, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(23, 32); ctx.lineTo(26, 38); ctx.lineTo(20, 38); ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  book(ctx, t) {
    ctx.save();
    ctx.translate(48, -2 + Math.sin(t * 1.7) * 1.2);
    ctx.rotate(Math.sin(t * 1.1) * 0.05);
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath();
    ctx.moveTo(-26, -1); ctx.quadraticCurveTo(-11, -9, 0, -3);
    ctx.quadraticCurveTo(11, -9, 26, -1);
    ctx.quadraticCurveTo(11, 5, 0, 10);
    ctx.quadraticCurveTo(-11, 5, -26, -1);
    ctx.fill();
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,80,.4)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-14, -1 + i * 2); ctx.lineTo(-4, 1 + i * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 1 + i * 2); ctx.lineTo(14, -1 + i * 2); ctx.stroke();
    }
    ctx.restore();
  },
  wishLamp(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const y = -10 + Math.sin(t * 1.9) * 2;
    const g = ctx.createRadialGradient(48, y, 2, 48, y, 26);
    g.addColorStop(0, 'rgba(255,230,150,.55)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, y, 26, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,235,170,.95)';
    ctx.beginPath(); ctx.ellipse(48, y, 2.6, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(230,200,140,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(48, y, 7, 0, 7); ctx.stroke();
    ctx.restore();
  },
  jawGlow(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.2 + 0.18 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(255,70,50,${a})`;
    ctx.beginPath(); ctx.ellipse(47, 58, 12, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,120,90,${a + 0.2})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(41, 56); ctx.lineTo(53, 56); ctx.stroke();
    ctx.restore();
  },

  // ---- 第二批挂件：帽子 / 风铃 / 项圈铃 / 面纱 / 挎包 / 肩上的鸟 / 烟斗 / 前爪的戒指
  // 坐标系和上面一样：头占 0..96，脖子在 88~98，前爪在 (37,103)。
  topHat(ctx, t) {
    ctx.save();
    ctx.translate(48, 3 + Math.sin(t * 2.2) * 0.5);
    ctx.rotate(-0.07);
    // 帽筒
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, '#161922'); g.addColorStop(0.42, '#343945'); g.addColorStop(1, '#0f1116');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-10.5, -26);
    ctx.quadraticCurveTo(0, -30.5, 10.5, -26);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();
    // 帽带
    ctx.fillStyle = '#8c1f24';
    ctx.fillRect(-13.2, -8.6, 26.4, 4.4);
    // 帽沿
    ctx.fillStyle = '#1a1e27';
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 4.2, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,235,.34)';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.ellipse(0, 0, 24, 4.2, 0, 0, 7); ctx.stroke();
    ctx.restore();
  },
  windChime(ctx, t) {
    const sway = Math.sin(t * 1.6) * 3;
    ctx.save();
    ctx.strokeStyle = 'rgba(200,210,230,.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(48, -34);
    ctx.quadraticCurveTo(48 + sway * 0.4, -22, 48 + sway, -12);
    ctx.stroke();
    ctx.translate(48 + sway, -12);
    ctx.rotate(sway * 0.022);
    // 顶盘
    ctx.fillStyle = '#c9a94a';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.2, 0, 0, 7); ctx.fill();
    // 三根管：中间那根最长，撞在一起才响
    const cols = ['#e3b341', '#9fb4d8', '#d98fb0'];
    for (let i = -1; i <= 1; i++) {
      ctx.fillStyle = cols[i + 1];
      const h = i === 0 ? 13 : 10;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(i * 5 - 1.2, 1, 2.4, h, 1.2);
      else ctx.rect(i * 5 - 1.2, 1, 2.4, h);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,242,205,.9)';
    ctx.beginPath(); ctx.arc(0, 15, 1.7, 0, 7); ctx.fill();
    ctx.restore();
  },
  collarBell(ctx, t) {
    ctx.save();
    // 项圈：贴着下巴下面那一圈的弧
    ctx.strokeStyle = '#7a2f36';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(48, 88, 23, 12, 0, 0.14 * Math.PI, 0.86 * Math.PI); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,210,150,.32)';
    ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.ellipse(48, 88, 23, 12, 0, 0.22 * Math.PI, 0.78 * Math.PI); ctx.stroke();
    // 铃铛
    ctx.translate(48, 99);
    ctx.rotate(Math.sin(t * 3.1) * 0.13);
    const g = ctx.createRadialGradient(-1.5, -2, 0.5, 0, 0, 6);
    g.addColorStop(0, '#ffe9a8'); g.addColorStop(0.55, '#d8a838'); g.addColorStop(1, '#7a5a14');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,20,.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-3.6, 1.1); ctx.lineTo(3.6, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 2.4, 1, 0, 7); ctx.stroke();
    ctx.restore();
  },
  veil(ctx, t) {
    ctx.save();
    const w = Math.sin(t * 1.4) * 1.5;
    const g = ctx.createLinearGradient(0, 4, 0, 88);
    g.addColorStop(0, 'rgba(228,234,250,.44)');
    g.addColorStop(0.62, 'rgba(200,214,244,.22)');
    g.addColorStop(1, 'rgba(180,196,236,.04)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(24, 10);
    ctx.quadraticCurveTo(48, -2, 72, 10);
    ctx.quadraticCurveTo(80, 52, 74 + w, 84);
    ctx.quadraticCurveTo(60, 90, 48, 86);
    ctx.quadraticCurveTo(36, 90, 22 - w, 84);
    ctx.quadraticCurveTo(16, 52, 24, 10);
    ctx.closePath();
    ctx.fill();
    // 织纹：几道竖褶，不然就是一块白布
    ctx.strokeStyle = 'rgba(240,246,255,.15)';
    ctx.lineWidth = 0.9;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(48 + i * 15, 6);
      ctx.quadraticCurveTo(48 + i * 19, 50, 48 + i * 17 + w, 84);
      ctx.stroke();
    }
    ctx.restore();
  },
  satchel(ctx, t) {
    ctx.save();
    // 斜跨的背带
    ctx.strokeStyle = '#5a3a28';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(30, 74); ctx.quadraticCurveTo(52, 86, 70, 95); ctx.stroke();
    // 包体
    const g = ctx.createLinearGradient(56, 90, 84, 106);
    g.addColorStop(0, '#6b4630'); g.addColorStop(1, '#33200f');
    ctx.fillStyle = g;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(62, 88, 22, 17, 3);
    else ctx.rect(62, 88, 22, 17);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,220,180,.22)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // 盖 + 扣
    ctx.fillStyle = '#7c5238';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(62, 88, 22, 7, 3);
    else ctx.rect(62, 88, 22, 7);
    ctx.fill();
    ctx.fillStyle = '#d8b060';
    ctx.beginPath(); ctx.arc(73, 95.4, 1.7, 0, 7); ctx.fill();
    ctx.restore();
  },
  crow(ctx, t) {
    ctx.save();
    // 停在头顶两只耳朵中间：再往右就钻到耳后去了，只剩一坨黑影
    ctx.translate(50, 2 + Math.sin(t * 2.6) * 0.8);
    ctx.scale(1.34, 1.34);
    ctx.rotate(0.08);
    // 尾羽
    ctx.fillStyle = '#12151d';
    ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(-17, 9); ctx.lineTo(-13, 1); ctx.closePath(); ctx.fill();
    // 身体
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6.4, -0.2, 0, 7); ctx.fill();
    // 头
    ctx.beginPath(); ctx.arc(6.4, -5.6, 4.2, 0, 7); ctx.fill();
    // 喙
    ctx.fillStyle = '#c9a94a';
    ctx.beginPath(); ctx.moveTo(9.8, -6.2); ctx.lineTo(15.4, -4.6); ctx.lineTo(9.8, -3.2); ctx.closePath(); ctx.fill();
    // 眼
    ctx.fillStyle = '#ff6a5e';
    ctx.beginPath(); ctx.arc(7.6, -6.5, 1.15, 0, 7); ctx.fill();
    // 翅羽的层次
    ctx.strokeStyle = 'rgba(160,180,215,.26)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(-4.5, 1); ctx.lineTo(3, -2); ctx.stroke();
    ctx.restore();
  },
  pipe(ctx, t) {
    ctx.save();
    ctx.strokeStyle = '#8a6a44';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(50, 58); ctx.quadraticCurveTo(60, 60.5, 68, 55); ctx.stroke();
    ctx.fillStyle = '#5c4227';
    ctx.beginPath(); ctx.ellipse(70, 53.4, 3.4, 3.8, -0.3, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,190,90,.5)';
    ctx.beginPath(); ctx.ellipse(70, 51.4, 2.3, 1.2, -0.3, 0, 7); ctx.fill();
    // 烟：三缕往上飘，循环
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.55 + i * 0.33) % 1;
      ctx.globalAlpha = 0.3 * (1 - p);
      ctx.fillStyle = 'rgba(210,220,245,.5)';
      ctx.beginPath();
      ctx.arc(70 + Math.sin(p * 5 + i * 2) * 6, 48 - p * 46, 2.4 + p * 4, 0, 7);
      ctx.fill();
    }
    ctx.restore();
  },
  pawRing(ctx, t) {
    ctx.save();
    ctx.translate(37, 101);
    ctx.strokeStyle = '#cfd8e8';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.ellipse(0, 0, 4.6, 3.1, -0.2, 0, 7); ctx.stroke();
    const g = ctx.createRadialGradient(1.5, -2.6, 0.3, 1.5, -2.6, 3.4);
    g.addColorStop(0, '#bfeaff'); g.addColorStop(0.6, '#3f8fd8'); g.addColorStop(1, '#123a63');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(1.5, -2.6, 2.3, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(140,200,255,${0.16 + 0.12 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(1.5, -2.6, 5.6, 0, 7); ctx.fill();
    ctx.restore();
  },
};

// ------------------------------------------------------------------ 肖像（首领 / 精英）
// 把真实怪物立绘封进一枚会转的圆框里：既用上了官方素材，又不用给它们画出走路动画。
export function drawPortrait(ctx, o) {
  const im = artImage('b:' + o.art);
  const r = o.r, t = o.t || 0;
  ctx.save();
  ctx.translate(o.x, o.y);

  // 外圈光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.9);
  g.addColorStop(0, o.glow || 'rgba(120,160,255,.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, 7); ctx.fill();
  ctx.restore();

  // 圆底 + 立绘
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#0b0e16';
  ctx.fillRect(-r, -r, r * 2, r * 2);
  if (im) {
    // 立绘是 1:1 的方图，取中间那块，缩放后刚好填满圆
    const s = r * 2.6;
    ctx.drawImage(im, -s / 2, -s / 2 + r * 0.12, s, s);
  }
  const sh = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = sh;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  // 框
  ctx.strokeStyle = o.rim || 'rgba(190,205,235,.65)';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  // 转动的刻痕
  ctx.save();
  ctx.rotate(t * 0.5);
  ctx.strokeStyle = 'rgba(210,220,255,.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.restore();

  if (o.hurt > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.7, o.hurt * 1.4);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
