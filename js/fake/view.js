// 画面：一间地下室，一扇门，门外一个人。
//
// 全部用 2D canvas 现画（480×270，CSS 再放大，image-rendering: pixelated）。
// 三个理由：
//   1) 不改图、不加请求，墙面、门框、灯、桌上的枪都是几行矩形；
//   2) 立绘是构建时拼好的像素图集（assets/fake/*.webp），按帧矩形画进去就行；
//   3) 呼吸、灯闪、玻璃反光这些「活气」只能每帧算，用图做不到。
//
// 主播没有战斗立绘：脑袋用 B 站头像，身子现画火柴人——这不是省事，是设定：
// 他们的「战斗立绘」本来就不存在，伪人抄的时候也只能抄到一个头像。

import { ART, META, CHARS } from './gen.js';

const W = 480;
const H = 270;

// 门与窗（门外的人从这个框里露出来）
const DOOR = { x: 118, y: 32, w: 214, h: 212 };
const WIN = { x: 144, y: 66, w: 162, h: 132 };
const SILL = WIN.y + WIN.h;      // 窗台：再往下就看不见了，站在门后本来也只能看到这儿

const COL = {
  wall: '#101015', wall2: '#141419', wall3: '#0c0c10',
  rail: '#1d1c22', board: '#0e0e13',
  door: '#2b2318', door2: '#241d14', door3: '#1b1610', hi: '#3d3021',
  frame: '#0b0906', brass: '#6d5528', brass2: '#c9a961',
  corridor: '#131a20', corridor2: '#080d11',
  blood: '#8e2f2a',
};

const IDX = new Map(META.chars.map((c, i) => [c.slug, i]));
const B_IDX = new Map(META.chars.map((c, i) => [c.slug, i]));
const S_IDX = new Map(CHARS.filter((c) => c.k === 's').map((c, i) => [c.id, i]));

function loadImage(src) {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('图集载入失败'));
    im.src = src;
  });
}

export async function loadArt() {
  const [idle, card, bust, face] = await Promise.all([
    loadImage(ART.idle), loadImage(ART.card), loadImage(ART.bust), loadImage(ART.face),
  ]);
  return { idle, card, bust, face };
}

/* --------------------------------------------------------------- 场景 */
export function makeScene(canvas, art) {
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  const st = {
    mode: 'idle',       // idle | visit | black | day | end
    char: null,
    room: 0,            // 白天的沙发上坐几个人
    ammo: 6,            // 白天茶几上摆几发子弹
    red: 0,
    flash: 0,
    shake: 0,
    peek: 0,            // 目标值：1 = 贴着玻璃看（窗口换成它的人像特写）
    peekK: 0,           // 当前值，缓动过去
    t0: performance.now(),
    raf: 0,
  };

  // 噪点：一小块 pre-render，之后拉伸铺满，比逐像素快得多
  const noise = document.createElement('canvas');
  noise.width = 96; noise.height = 54;
  const nctx = noise.getContext('2d');
  const nd = nctx.createImageData(96, 54);
  for (let i = 0; i < nd.data.length; i += 4) {
    const v = 110 + Math.random() * 120;
    nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v;
    nd.data[i + 3] = 30;
  }
  nctx.putImageData(nd, 0, 0);

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  // 墙面：竖条纹 + 棋盘噪点 + 护墙板。棋盘是像素画的「水泥味」，比纯色耐看。
  function wall(t) {
    rect(0, 0, W, H, COL.wall);
    for (let x = 0; x < W; x += 18) rect(x, 18, 3, 176, x % 36 ? COL.wall2 : '#0d0d12');
    ctx.fillStyle = 'rgba(255,255,255,.018)';
    for (let y = 20; y < 194; y += 4) {
      for (let x = (y % 8 === 0 ? 0 : 2); x < W; x += 4) ctx.fillRect(x, y, 1, 1);
    }
    // 天花板阴影
    const g = ctx.createLinearGradient(0, 0, 0, 40);
    g.addColorStop(0, 'rgba(0,0,0,.85)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 40);
    // 护墙线 + 护墙板
    rect(0, 190, W, 3, COL.rail);
    rect(0, 193, W, 45, '#0d0d12');
    for (let x = 6; x < W; x += 26) rect(x, 197, 2, 39, COL.board);
    // 地板
    rect(0, 238, W, 32, '#0f0e0c');
    for (let i = 0; i < 6; i++) rect(0, 239 + i * 6, W, 1, 'rgba(255,255,255,.02)');
    for (let x = -60; x < W + 60; x += 44) {
      ctx.strokeStyle = 'rgba(255,255,255,.025)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 120, 238); ctx.lineTo(x, 270); ctx.stroke();
    }
  }

  // 吊灯：灯罩 + 灯泡 + 一团打在桌上的暖光（别照门，门那盏在走廊里）
  function lamp(t) {
    const fl = 0.8 + Math.sin(t * 8.7) * 0.035 + Math.sin(t * 21.3) * 0.02;
    rect(66, 0, 2, 14, '#0a0a0c');
    rect(58, 12, 18, 3, '#241d13');
    ctx.fillStyle = '#2a2114';
    ctx.beginPath(); ctx.moveTo(50, 34); ctx.lineTo(84, 34); ctx.lineTo(76, 16); ctx.lineTo(58, 16); ctx.closePath(); ctx.fill();
    rect(62, 33, 10, 3, '#3a2c18');
    rect(64, 36, 6, 4, 'rgba(255,231,158,' + (0.9 * fl) + ')');
    const g = ctx.createRadialGradient(67, 44, 4, 67, 44, 150);
    g.addColorStop(0, 'rgba(227,179,65,' + (0.22 * fl) + ')');
    g.addColorStop(0.4, 'rgba(227,179,65,' + (0.07 * fl) + ')');
    g.addColorStop(1, 'rgba(227,179,65,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(52, 38); ctx.lineTo(82, 38); ctx.lineTo(160, 262); ctx.lineTo(-40, 262); ctx.closePath(); ctx.fill();
  }

  // 门上挂的东西：门牌、便条、挂钩
  function doorProps() {
    // 门牌
    rect(DOOR.x + DOOR.w - 52, DOOR.y + 12, 34, 16, '#1b2026');
    rect(DOOR.x + DOOR.w - 52, DOOR.y + 12, 34, 1, '#39434c');
    ctx.fillStyle = '#7d8994';
    ctx.font = '9px monospace';
    ctx.fillText('11', DOOR.x + DOOR.w - 42, DOOR.y + 24);
    // 便条（档案室塞进来的）
    const note = { x: DOOR.x + 22, y: DOOR.y + 150, w: 26, h: 30 };
    rect(note.x, note.y, note.w, note.h, '#b9b2a0');
    rect(note.x, note.y, note.w, 1, '#d8d2c4');
    for (let i = 0; i < 4; i++) rect(note.x + 3, note.y + 5 + i * 5, note.w - 6, 1, 'rgba(40,38,32,.45)');
    rect(note.x + 10, note.y - 2, 6, 4, 'rgba(180,60,50,.8)');
  }

  function door(t) {
    // 门框：三层，最外层是门套的阴影
    rect(DOOR.x - 12, DOOR.y - 12, DOOR.w + 24, DOOR.h + 14, COL.frame);
    rect(DOOR.x - 7, DOOR.y - 7, DOOR.w + 14, DOOR.h + 9, '#171310');
    rect(DOOR.x - 2, DOOR.y - 2, DOOR.w + 4, DOOR.h + 4, '#0f0c09');
    // 门板
    rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h, COL.door);
    rect(DOOR.x, DOOR.y, DOOR.w, 4, COL.hi);
    rect(DOOR.x, DOOR.y, 3, DOOR.h, COL.hi);
    rect(DOOR.x + DOOR.w - 3, DOOR.y, 3, DOOR.h, COL.door3);
    rect(DOOR.x, DOOR.y + DOOR.h - 3, DOOR.w, 3, '#120e0a');
    // 上半部分的凹板（窗在中间，板在两侧）
    rect(DOOR.x + 6, DOOR.y + 8, 12, WIN.y - DOOR.y - 16, COL.door2);
    rect(DOOR.x + DOOR.w - 18, DOOR.y + 8, 12, WIN.y - DOOR.y - 16, COL.door2);
    // 下半部分两块凹板
    rect(DOOR.x + 16, DOOR.y + 156, 82, 44, COL.door3);
    rect(DOOR.x + 16, DOOR.y + 156, 82, 2, COL.door2);
    rect(DOOR.x + 116, DOOR.y + 156, 82, 44, COL.door3);
    rect(DOOR.x + 116, DOOR.y + 156, 82, 2, COL.door2);
    // 合页（右开）
    rect(DOOR.x + DOOR.w - 4, DOOR.y + 18, 8, 8, COL.brass);
    rect(DOOR.x + DOOR.w - 4, DOOR.y + 180, 8, 8, COL.brass);
    // 把手 + 锁孔（左开）
    rect(DOOR.x + 8, DOOR.y + 122, 8, 4, COL.brass);
    ctx.fillStyle = COL.brass2;
    ctx.beginPath(); ctx.arc(DOOR.x + 11, DOOR.y + 124, 3.4, 0, 6.284); ctx.fill();
    rect(DOOR.x + 10, DOOR.y + 132, 2, 5, '#0a0805');
    // 门缝透出的走廊光（下沿 + 左右各一像素）
    const g = ctx.createLinearGradient(0, DOOR.y + DOOR.h, 0, DOOR.y + DOOR.h + 12);
    g.addColorStop(0, 'rgba(214,198,150,.16)');
    g.addColorStop(1, 'rgba(214,198,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(DOOR.x + 2, DOOR.y + DOOR.h, DOOR.w - 4, 12);
    rect(DOOR.x + DOOR.w, DOOR.y + 8, 1, DOOR.h - 12, 'rgba(214,198,150,.07)');
    // 窗洞外框
    rect(WIN.x - 6, WIN.y - 6, WIN.w + 12, WIN.h + 12, COL.frame);
    rect(WIN.x - 3, WIN.y - 3, WIN.w + 6, WIN.h + 6, '#100d0b');
    // 窗台
    rect(WIN.x - 10, SILL + 3, WIN.w + 20, 5, '#241d14');
    rect(WIN.x - 10, SILL + 3, WIN.w + 20, 1, '#3d3021');
    doorProps();
  }

  // 门外：一条走廊。里面比屋里亮，不然门外的人看不出来。
  function corridor(t) {
    const g = ctx.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
    g.addColorStop(0, '#151d24');
    g.addColorStop(0.5, COL.corridor);
    g.addColorStop(1, COL.corridor2);
    ctx.fillStyle = g;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 走廊尽头的灯：一团冷光，慢慢呼吸
    const pulse = 0.55 + Math.sin(t * 1.2) * 0.12;
    const rg = ctx.createRadialGradient(WIN.x + 81, WIN.y + 22, 2, WIN.x + 81, WIN.y + 22, 80);
    rg.addColorStop(0, 'rgba(196,214,228,' + (0.22 * pulse) + ')');
    rg.addColorStop(1, 'rgba(196,214,228,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    rect(WIN.x + 80, WIN.y + 8, 2, 12, 'rgba(210,225,235,.28)');
    // 走廊地板与墙脚线
    rect(WIN.x, WIN.y + WIN.h - 30, WIN.w, 1, 'rgba(160,185,200,.13)');
    rect(WIN.x, WIN.y + WIN.h - 30, WIN.w, 18, 'rgba(8,12,15,.55)');
    rect(WIN.x, WIN.y + WIN.h - 12, WIN.w, 1, 'rgba(160,185,200,.08)');
  }

  function awakenBody(c, t) {
    const i = IDX.get(c.img.idle);
    if (i == null) return;
    const r = META.idle.rects[i];
    const box = WIN.h - 6;
    const k = Math.min(box / r[3], 1.25);
    const dw = Math.round(r[2] * k);
    const dh = Math.round(r[3] * k);
    const bob = Math.round(Math.sin(t * 1.5 + i) * 1);
    const x = Math.round(WIN.x + (WIN.w - dw) / 2);
    const y = Math.round(SILL - dh + 8 + bob);
    // 脚下的一小片暗影（看不到脚，影子落在窗台下面）
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(WIN.x + WIN.w / 2, SILL - 2, dw * 0.32, 4, 0, 0, 6.284); ctx.fill();
    // 身后的冷光把轮廓托出来
    const g = ctx.createRadialGradient(x + dw / 2, y + dh * 0.42, 6, x + dw / 2, y + dh * 0.42, dh * 0.8);
    g.addColorStop(0, 'rgba(150,190,215,.13)');
    g.addColorStop(1, 'rgba(150,190,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 20, y - 10, dw + 40, dh + 20);
    ctx.drawImage(art.idle, r[0], r[1], r[2], r[3], x, y, dw, dh);
  }

  function stickBody(c, t) {
    const cx = WIN.x + WIN.w / 2;
    const headR = 18;
    const top = WIN.y + 22;
    const sway = Math.sin(t * 1.35) * 1.4;
    const col = c.color || '#c8cbd4';
    const hy = top + headR;
    const hx = Math.round(cx + sway);
    // 身后的冷光
    const g = ctx.createRadialGradient(hx, hy + 30, 4, hx, hy + 30, 70);
    g.addColorStop(0, 'rgba(150,190,215,.14)');
    g.addColorStop(1, 'rgba(150,190,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 头：B 站头像裁成圆
    ctx.save();
    ctx.beginPath(); ctx.arc(hx, hy, headR, 0, 6.284); ctx.clip();
    const i = S_IDX.get(c.id);
    if (i != null) {
      const r = META.face.rects[i];
      ctx.drawImage(art.face, r[0], r[1], r[2], r[3], hx - headR, hy - headR, headR * 2, headR * 2);
    } else {
      rect(hx - headR, hy - headR, headR * 2, headR * 2, '#2a2f3a');
    }
    ctx.restore();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(hx, hy, headR - 1, 0, 6.284); ctx.stroke();
    // 火柴人：脖子、躯干、手臂、腿
    const neck = hy + headR - 1;
    const hip = neck + 40;
    ctx.strokeStyle = 'rgba(226,231,240,.9)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx, neck); ctx.lineTo(hx, hip);
    const armY = neck + 10;
    ctx.moveTo(hx, armY); ctx.lineTo(hx - 19, armY + 16 + Math.sin(t * 2.1) * 2);
    ctx.moveTo(hx, armY); ctx.lineTo(hx + 19, armY + 12 - Math.sin(t * 2.1) * 2);
    ctx.moveTo(hx, hip); ctx.lineTo(hx - 13, hip + 34);
    ctx.moveTo(hx, hip); ctx.lineTo(hx + 13, hip + 34);
    ctx.stroke();
    // 手里的话筒
    rect(hx + 18, armY + 9, 3, 13, '#2b303a');
    rect(hx + 17, armY + 6, 5, 4, '#9aa2b2');
    // LIVE 灯：挂在窗户右上角，别压在脸上
    if (Math.sin(t * 4) > 0) {
      const lx = WIN.x + WIN.w - 34, ly = WIN.y + 18;
      rect(lx, ly, 15, 7, 'rgba(190,48,44,.9)');
      ctx.fillStyle = '#fff';
      ctx.font = '5px monospace';
      ctx.fillText('LIVE', lx + 1.5, ly + 5);
    }
  }

  // 贴着玻璃看：窗口不再画「站在走廊里的形状」，而是它自己的头像/立绘特写。
  // 这是整局里唯一能看清「眼睛是什么颜色、手里攥着什么」的地方，所以画得比别处实。
  function closeUp(c, t, a) {
    const src = c.k === 's'
      ? { img: art.face, r: META.face.rects[S_IDX.get(c.id)] || [0, 0, 48, 48] }
      : { img: art.bust, r: META.bust.rects[B_IDX.get(c.img.bust)] || [0, 0, 48, 48] };
    ctx.save();
    ctx.globalAlpha = a;
    rect(WIN.x, WIN.y, WIN.w, WIN.h, '#07090b');
    // cover：宁可裁掉两侧，也别把脸压扁
    const k = Math.max(WIN.w / src.r[2], WIN.h / src.r[3]);
    const dw = Math.round(src.r[2] * k);
    const dh = Math.round(src.r[3] * k);
    const dx = Math.round(WIN.x + (WIN.w - dw) / 2);
    const dy = Math.round(WIN.y + (WIN.h - dh) / 2);
    ctx.drawImage(src.img, src.r[0], src.r[1], src.r[2], src.r[3], dx, dy, dw, dh);
    // 灯只打在脸上一圈，四周压黑——不然整张图会太亮，不像隔着玻璃
    const cx = WIN.x + WIN.w / 2;
    const cy = WIN.y + WIN.h * 0.46;
    const vg = ctx.createRadialGradient(cx, cy, 16, cx, cy, WIN.w * 0.78);
    vg.addColorStop(0, 'rgba(6,8,10,0)');
    vg.addColorStop(0.62, 'rgba(6,8,10,.32)');
    vg.addColorStop(1, 'rgba(4,5,6,.86)');
    ctx.fillStyle = vg;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 你手里那盏灯：亮度轻轻起伏，看得久了会觉得自己也在被看
    ctx.fillStyle = 'rgba(214,226,238,' + (0.04 + 0.022 * Math.sin(t * 1.7)) + ')';
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    ctx.restore();
  }

  function glass() {
    ctx.fillStyle = 'rgba(120,170,195,.05)';
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 玻璃反光
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIN.x + 6, WIN.y + 22); ctx.lineTo(WIN.x + 40, WIN.y - 2);
    ctx.moveTo(WIN.x + 96, WIN.y + WIN.h); ctx.lineTo(WIN.x + 150, WIN.y + 44);
    ctx.stroke();
    // 铁栅：两根竖的 + 顶上一根横的（横的压在额头上方，不挡脸）
    for (let k = 1; k <= 2; k++) {
      const x = WIN.x + Math.round(WIN.w * k / 3);
      rect(x - 1, WIN.y, 3, WIN.h, '#0a0806');
      rect(x - 1, WIN.y, 1, WIN.h, '#251f18');
    }
    rect(WIN.x, WIN.y + 12, WIN.w, 3, '#0a0806');
    rect(WIN.x, WIN.y + 12, WIN.w, 1, '#251f18');
    // 窗框内阴影
    rect(WIN.x, WIN.y, WIN.w, 2, 'rgba(0,0,0,.6)');
    rect(WIN.x, WIN.y + WIN.h - 2, WIN.w, 2, 'rgba(0,0,0,.5)');
    rect(WIN.x, WIN.y, 2, WIN.h, 'rgba(0,0,0,.35)');
    rect(WIN.x + WIN.w - 2, WIN.y, 2, WIN.h, 'rgba(0,0,0,.35)');
  }

  // 桌子：你坐在门后，桌上摊着登记簿、一把左轮、一杯凉了的茶
  function desk(t) {
    rect(0, 246, W, 24, '#0b0a08');
    rect(0, 246, W, 2, '#372c1e');
    rect(0, 248, W, 1, 'rgba(0,0,0,.6)');
    const g = ctx.createRadialGradient(150, 250, 4, 150, 250, 150);
    g.addColorStop(0, 'rgba(227,179,65,.10)');
    g.addColorStop(1, 'rgba(227,179,65,0)');
    ctx.fillStyle = g;
    ctx.fillRect(40, 240, 260, 30);
    // 登记簿（摊开）
    rect(186, 244, 108, 26, '#0a0a0b');
    rect(190, 242, 100, 26, '#a9a292');
    rect(190, 242, 100, 2, '#cfc7b4');
    rect(239, 242, 2, 26, 'rgba(20,18,14,.4)');
    for (let i = 0; i < 4; i++) {
      rect(195, 248 + i * 4, 36, 1, 'rgba(40,38,32,.42)');
      rect(246, 248 + i * 4, 36, 1, 'rgba(40,38,32,.42)');
    }
    // 左轮
    rect(318, 252, 30, 5, '#1d2027');
    rect(318, 252, 30, 1, '#4b515d');
    rect(320, 257, 8, 5, '#16181d');
    rect(338, 257, 4, 7, '#20242b');
    // 笔
    rect(150, 258, 22, 2, '#3b3a34');
    // 茶缸
    rect(392, 246, 13, 15, '#2a2e34');
    rect(405, 249, 3, 7, '#2a2e34');
    rect(392, 246, 13, 1, '#454b55');
    // 桌上摊开的几张纸
    rect(56, 252, 26, 14, '#8e8878');
    rect(56, 252, 26, 1, '#b0a998');
    rect(62, 256, 14, 1, 'rgba(30,28,24,.4)');
  }

  // 右墙：档案柜的轮廓 + 挂钟
  function props(t) {
    rect(408, 96, 60, 142, '#0a0a0e');
    rect(410, 98, 56, 138, '#111116');
    for (let i = 0; i < 4; i++) {
      rect(414, 104 + i * 33, 48, 28, '#141419');
      rect(414, 104 + i * 33, 48, 1, '#1c1c23');
      rect(432, 116 + i * 33, 12, 2, '#2a2a32');
    }
    // 挂钟
    const cx = 376, cy = 62, r = 15;
    ctx.fillStyle = '#0a0a0d';
    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 6.284); ctx.fill();
    ctx.fillStyle = '#1b1a1e';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.284); ctx.fill();
    ctx.strokeStyle = '#4a4640';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, 6.284); ctx.stroke();
    // 只有分针在动：走的是一分钟一格，不是秒
    const ang = (t * 0.02) % 6.284;
    ctx.strokeStyle = '#b9b2a0';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * 10, cy + Math.sin(ang) * 10); ctx.stroke();
    rect(cx - 1, cy - 8, 2, 8, '#6f6a60');
  }

  // 白天：镜头转过来，你面对的是屋里。比夜里亮，但窗子外面永远是灰的。
  // 沙发上坐几个人＝屋里还有几个活人，是这一屏唯一要传达的信息。
  function drawRoom(t) {
    rect(0, 0, W, H, '#1d1e22');
    // 墙：竖条纹比夜里浅一档
    for (let x = 0; x < W; x += 18) rect(x, 18, 3, 180, x % 36 ? '#232429' : '#181a1e');
    ctx.fillStyle = 'rgba(255,255,255,.02)';
    for (let y = 20; y < 198; y += 4) {
      for (let x = (y % 8 === 0 ? 0 : 2); x < W; x += 4) ctx.fillRect(x, y, 1, 1);
    }
    // 天花板阴影
    const ct = ctx.createLinearGradient(0, 0, 0, 40);
    ct.addColorStop(0, 'rgba(0,0,0,.8)');
    ct.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ct;
    ctx.fillRect(0, 0, W, 40);

    // 窗：白天也是灰的，只在中间亮一块
    const WX = 46, WY = 46, WW = 128, WH = 96;
    rect(WX - 6, WY - 6, WW + 12, WH + 12, '#15171a');
    rect(WX, WY, WW, WH, '#3c4249');
    const wg = ctx.createLinearGradient(WX, WY, WX, WY + WH);
    wg.addColorStop(0, '#6c7681');
    wg.addColorStop(0.55, '#4e565f');
    wg.addColorStop(1, '#33383e');
    ctx.fillStyle = wg;
    ctx.fillRect(WX, WY, WW, WH);
    // 百叶：几条粗的，别画成梯子
    for (let i = 0; i < 6; i++) rect(WX + 2, WY + 10 + i * 15, WW - 4, 5, 'rgba(18,20,24,.5)');
    // 窗心那一块是全天最亮的地方——外面永远是灰的，但它是白天
    const cg = ctx.createRadialGradient(WX + WW / 2, WY + WH * 0.5, 6, WX + WW / 2, WY + WH * 0.5, 90);
    cg.addColorStop(0, 'rgba(206,214,226,.30)');
    cg.addColorStop(1, 'rgba(206,214,226,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(WX, WY, WW, WH);
    rect(WX + WW / 2 - 1, WY, 2, WH, '#20242a');
    // 窗台上的水杯和空罐头
    rect(WX + 14, WY + WH - 8, 8, 8, '#585f68');
    rect(WX + 14, WY + WH - 8, 8, 1, '#78808a');
    rect(WX + 96, WY + WH - 6, 7, 6, '#4a5058');

    // 沙发靠背
    rect(236, 116, 220, 60, '#241c17');
    rect(236, 116, 220, 3, '#33281f');
    rect(236, 116, 3, 60, '#2c231b');

    // 坐在沙发上的人：脑袋露在靠背上方。几个活人就是几个剪影——这一屏要说的就这一件事。
    const n = Math.min(6, st.room || 0);
    for (let i = 0; i < n; i++) {
      const bx = 246 + i * 35;
      const bob = Math.sin(t * 0.8 + i * 2.1) * 1.4;
      const hy = 108 + bob;
      // 肩：从靠背上沿开始，被靠背挡住下半截
      ctx.fillStyle = '#0b0c0f';
      ctx.beginPath();
      ctx.moveTo(bx, 170); ctx.lineTo(bx + 2, hy + 12);
      ctx.quadraticCurveTo(bx + 13, hy + 6, bx + 24, hy + 12);
      ctx.lineTo(bx + 26, 170); ctx.closePath(); ctx.fill();
      // 头
      ctx.beginPath();
      ctx.arc(bx + 13, hy, 9.5, 0, 6.284);
      ctx.fill();
      // 后脑一圈微光，别让它糊在靠背上
      ctx.strokeStyle = 'rgba(150,160,175,.16)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx + 13, hy, 10, -2.4, -0.5);
      ctx.stroke();
      // 偶尔动一下：活人坐着也不完全静止
      if ((Math.floor(t * 2.5 + i * 5) % 13) === 0) {
        rect(bx + 6, hy + 2, 3, 2, '#2c3138');
        rect(bx + 17, hy + 2, 3, 2, '#2c3138');
      }
    }

    // 坐垫 + 扶手（画在人前面，人才像"陷"在沙发里）
    rect(232, 170, 228, 24, '#2b211a');
    rect(232, 170, 228, 2, '#3a2c22');
    rect(228, 128, 14, 66, '#1f1813');
    rect(450, 128, 14, 66, '#1f1813');
    // 地板
    rect(0, 194, W, 76, '#15161a');
    for (let i = 0; i < 7; i++) rect(0, 196 + i * 10, W, 1, 'rgba(255,255,255,.018)');
    // 茶几：上面摆着左轮和没数完的子弹
    rect(150, 206, 150, 8, '#2a2119');
    rect(150, 206, 150, 2, '#3d3023');
    rect(158, 214, 6, 26, '#1d1712');
    rect(286, 214, 6, 26, '#1d1712');
    rect(176, 200, 30, 5, '#1b1e24');
    rect(176, 200, 30, 1, '#454b57');
    rect(178, 205, 8, 5, '#15171c');
    for (let i = 0; i < (st.ammo != null ? st.ammo : 6); i++) {
      rect(224 + i * 7, 200, 4, 6, '#8a6b32');
      rect(224 + i * 7, 200, 4, 1, '#c9a24e');
    }
    // 吊灯（白天是关着的，只剩个罩子）
    rect(376, 0, 2, 20, '#0e0e11');
    ctx.fillStyle = '#26262b';
    ctx.beginPath(); ctx.moveTo(360, 34); ctx.lineTo(394, 34); ctx.lineTo(386, 20); ctx.lineTo(368, 20); ctx.closePath(); ctx.fill();
    rect(366, 33, 22, 3, '#33333a');
  }

  function overlay(t) {
    ctx.fillStyle = 'rgba(0,0,0,.16)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    // 噪点
    ctx.globalAlpha = 0.55;
    const ox = Math.floor(t * 37) % 96;
    const oy = Math.floor(t * 53) % 54;
    ctx.drawImage(noise, -ox, -oy, W + 96, H + 54);
    ctx.globalAlpha = 1;
    // 暗角
    const g = ctx.createRadialGradient(W / 2, H * 0.48, 70, W / 2, H * 0.48, 320);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.6, 'rgba(0,0,0,.4)');
    g.addColorStop(1, 'rgba(0,0,0,.9)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    if (st.red > 0.01) {
      ctx.fillStyle = 'rgba(140,32,28,' + (st.red * 0.5) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (st.flash > 0.01) {
      ctx.fillStyle = 'rgba(255,240,210,' + st.flash + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function draw(t) {
    ctx.save();
    if (st.shake > 0.01) {
      ctx.translate((Math.random() - .5) * st.shake * 5, (Math.random() - .5) * st.shake * 5);
    }
    if (st.mode === 'day') {
      drawRoom(t);
      overlay(t);
      ctx.restore();
      return;
    }
    wall(t);
    props(t);
    lamp(t);
    door(t);
    corridor(t);
    if (st.mode === 'black') {
      rect(WIN.x, WIN.y, WIN.w, WIN.h, '#040506');
      const e = 0.5 + Math.sin(t * 1.1) * 0.2;
      ctx.fillStyle = 'rgba(210,215,225,' + (0.55 * e) + ')';
      ctx.fillRect(WIN.x + 52, WIN.y + 58, 10, 3);
      ctx.fillRect(WIN.x + 96, WIN.y + 58, 10, 3);
    } else if (st.mode === 'visit' && st.char) {
      if (st.char.k === 's') stickBody(st.char, t); else awakenBody(st.char, t);
      if (st.peekK > 0.01) closeUp(st.char, t, st.peekK);
    }
    if (st.mode !== 'black') glass();
    desk(t);
    overlay(t);
    ctx.restore();
  }

  let last = 0;
  function loop(now) {
    st.raf = requestAnimationFrame(loop);
    if (now - last < 32) return;
    last = now;
    const t = (now - st.t0) / 1000;
    st.red = Math.max(0, st.red - 0.012);
    st.flash = Math.max(0, st.flash - 0.05);
    st.shake = Math.max(0, st.shake - 0.06);
    st.peekK += (st.peek - st.peekK) * 0.18;
    if (st.peekK < 0.004) st.peekK = 0;
    draw(t);
  }
  st.raf = requestAnimationFrame(loop);

  return {
    setChar(c) { st.char = c; st.mode = c ? 'visit' : 'idle'; st.peek = 0; },
    setMode(m) { st.mode = m; if (m !== 'visit') st.char = null; if (m !== 'visit') st.peek = 0; },
    setPeek(on) { st.peek = on ? 1 : 0; },
    setRoom(n) { st.room = n; },
    setAmmo(n) { st.ammo = n; },
    red(n) { st.red = Math.max(st.red, n); },
    flash(n) { st.flash = Math.max(st.flash, n); },
    shake(n) { st.shake = Math.max(st.shake, n); },
    stop() { cancelAnimationFrame(st.raf); },
  };
}

/* ----------------------------------------------------------------- 声音 */
// 全部现场合成（不加载音频文件，一个字节都不多）：敲门、翻纸、枪、灯管的电流声。
// 默认是关的，第一次点「开始」才建 AudioContext——手机浏览器不给自动播。
export const sfx = (() => {
  let ac = null;
  let master = null;
  let drone = null;
  let on = true;

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }

  function noiseBuf(dur) {
    const a = ctx();
    const n = Math.max(1, Math.floor(a.sampleRate * dur));
    const b = a.createBuffer(1, n, a.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    return b;
  }

  function hit(freq, dur, gain, type) {
    const a = ctx(); if (!a || !on) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.55), a.currentTime + dur);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  }

  return {
    unlock() { ctx(); },
    toggle(v) {
      on = v;
      if (master) master.gain.value = v ? 0.5 : 0;
      if (drone) { try { drone.g.gain.value = v ? 0.035 : 0; } catch (e) {} }
    },
    isOn: () => on,
    knock() {
      const a = ctx(); if (!a || !on) return;
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const s = a.createBufferSource();
          s.buffer = noiseBuf(0.09);
          const f = a.createBiquadFilter();
          f.type = 'lowpass'; f.frequency.value = 320; f.Q.value = 1.2;
          const g = a.createGain(); g.gain.value = 0.5;
          s.connect(f); f.connect(g); g.connect(master);
          s.start();
          hit(88, 0.12, 0.22, 'triangle');
        }, i * 210);
      }
    },
    paper() {
      const a = ctx(); if (!a || !on) return;
      const s = a.createBufferSource();
      s.buffer = noiseBuf(0.16);
      const f = a.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 1600;
      const g = a.createGain(); g.gain.value = 0.16;
      s.connect(f); f.connect(g); g.connect(master);
      s.start();
    },
    click() { hit(620, 0.045, 0.10, 'square'); },
    tick() { hit(320, 0.03, 0.06, 'square'); },
    gun() {
      const a = ctx(); if (!a || !on) return;
      const s = a.createBufferSource();
      s.buffer = noiseBuf(0.5);
      const f = a.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 2400;
      const g = a.createGain(); g.gain.value = 0.9;
      s.connect(f); f.connect(g); g.connect(master);
      s.start();
      hit(70, 0.45, 0.5, 'sine');
    },
    heartbeat() {
      hit(52, 0.16, 0.30, 'sine');
      setTimeout(() => hit(44, 0.2, 0.22, 'sine'), 170);
    },
    startDrone() {
      const a = ctx(); if (!a || drone) return;
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine'; o.frequency.value = 46;
      o2.type = 'sine'; o2.frequency.value = 46.7;
      g.gain.value = on ? 0.035 : 0;
      o.connect(g); o2.connect(g); g.connect(master);
      o.start(); o2.start();
      drone = { o, o2, g };
    },
    stopDrone() {
      if (!drone) return;
      try { drone.o.stop(); drone.o2.stop(); } catch (e) {}
      drone = null;
    },
  };
})();
