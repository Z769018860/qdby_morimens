// 画面：一间地下室，一扇门，门外一个人。
//
// 全部用 2D canvas 现画（480×270，CSS 再整数倍放大，image-rendering: pixelated）。
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

// 窗（门外的人从这个框里露出来）
const WIN = { x: 128, y: 74, w: 176, h: 134 };
const DOOR = { x: 100, y: 30, w: 232, h: 224 };

const COL = {
  wall: '#15151b', wall2: '#191921', seam: '#0e0e13', trim: '#0a0a0d',
  door: '#2a2119', door2: '#241c15', door3: '#1c1610', hi: '#3b2f22',
  frame: '#0d0b09', brass: '#7a5f34', brass2: '#c9a961',
  glass: 'rgba(120,170,190,.055)', corridor: '#0a0f14', corridor2: '#05080b',
  blood: '#8e2f2a',
};

const IDX = new Map(META.chars.map((c, i) => [c.slug, i]));
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
    mode: 'idle',       // idle | visit | black | end
    char: null,
    red: 0,             // 0..1 红色预警（决定之后闪一下）
    flash: 0,
    shake: 0,
    knock: 0,
    t0: performance.now(),
    raf: 0,
  };

  // 噪点：一小块 pre-render，之后拉伸铺满，比逐像素快得多
  const noise = document.createElement('canvas');
  noise.width = 96; noise.height = 54;
  const nctx = noise.getContext('2d');
  const nd = nctx.createImageData(96, 54);
  for (let i = 0; i < nd.data.length; i += 4) {
    const v = 120 + Math.random() * 110;
    nd.data[i] = nd.data[i + 1] = nd.data[i + 2] = v;
    nd.data[i + 3] = 26;
  }
  nctx.putImageData(nd, 0, 0);

  function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); }

  function wall(t) {
    rect(0, 0, W, H, COL.wall);
    for (let x = 0; x < W; x += 16) {
      rect(x, 0, 8, 232, x % 32 ? COL.wall2 : '#171720');
    }
    // 墙面上的旧水渍：两个固定的，位置写死，别让它每帧乱跳
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(70, 150, 26, 44, .2, 0, 6.284); ctx.fill();
    ctx.beginPath(); ctx.ellipse(420, 120, 34, 56, -.15, 0, 6.284); ctx.fill();
    // 踢脚 + 地板
    rect(0, 232, W, 4, COL.trim);
    rect(0, 236, W, H - 236, '#101016');
    for (let y = 240; y < H; y += 6) rect(0, y, W, 1, 'rgba(255,255,255,.016)');
  }

  function lamp(t) {
    const fl = 0.82 + Math.sin(t * 9.1) * 0.03 + Math.sin(t * 23.7) * 0.02;
    // 灯线 + 灯罩
    rect(52, 0, 2, 18, '#0a0a0c');
    ctx.fillStyle = '#241d13';
    ctx.beginPath(); ctx.moveTo(38, 34); ctx.lineTo(68, 34); ctx.lineTo(62, 20); ctx.lineTo(44, 20); ctx.closePath(); ctx.fill();
    rect(48, 33, 10, 3, '#3a2c18');
    // 光锥（三角形 + 径向渐变）
    const g = ctx.createRadialGradient(53, 37, 4, 53, 37, 190);
    g.addColorStop(0, 'rgba(227,179,65,' + (0.30 * fl) + ')');
    g.addColorStop(0.35, 'rgba(227,179,65,' + (0.09 * fl) + ')');
    g.addColorStop(1, 'rgba(227,179,65,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(44, 36); ctx.lineTo(62, 36); ctx.lineTo(150, 250); ctx.lineTo(-60, 250); ctx.closePath(); ctx.fill();
    // 灯泡
    rect(51, 36, 5, 4, 'rgba(255,229,150,' + (0.85 * fl) + ')');
  }

  function door(t) {
    // 门框
    rect(DOOR.x - 10, DOOR.y - 10, DOOR.w + 20, DOOR.h + 12, COL.frame);
    rect(DOOR.x - 4, DOOR.y - 4, DOOR.w + 8, DOOR.h + 6, '#171310');
    // 门板
    rect(DOOR.x, DOOR.y, DOOR.w, DOOR.h, COL.door);
    rect(DOOR.x, DOOR.y, DOOR.w, 6, COL.hi);
    rect(DOOR.x, DOOR.y, 4, DOOR.h, COL.hi);
    rect(DOOR.x + DOOR.w - 4, DOOR.y, 4, DOOR.h, COL.door3);
    // 两块凹板（下）
    rect(DOOR.x + 26, DOOR.y + 150, 76, 62, COL.door3);
    rect(DOOR.x + 26, DOOR.y + 150, 76, 2, COL.door2);
    rect(DOOR.x + 130, DOOR.y + 150, 76, 62, COL.door3);
    rect(DOOR.x + 130, DOOR.y + 150, 76, 2, COL.door2);
    // 合页
    rect(DOOR.x - 6, DOOR.y + 22, 8, 6, COL.brass);
    rect(DOOR.x - 6, DOOR.y + 186, 8, 6, COL.brass);
    // 门牌
    rect(DOOR.x + 188, DOOR.y + 44, 34, 18, '#20262c');
    rect(DOOR.x + 188, DOOR.y + 44, 34, 1, '#39434c');
    ctx.fillStyle = '#6f7d88';
    ctx.font = '9px monospace';
    ctx.fillText('11', DOOR.x + 200, DOOR.y + 57);
    // 窗洞外框
    rect(WIN.x - 6, WIN.y - 6, WIN.w + 12, WIN.h + 12, COL.frame);
    rect(WIN.x - 3, WIN.y - 3, WIN.w + 6, WIN.h + 6, '#100d0b');
  }

  function corridor(t) {
    const g = ctx.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h);
    g.addColorStop(0, COL.corridor2);
    g.addColorStop(0.55, COL.corridor);
    g.addColorStop(1, '#070b0e');
    ctx.fillStyle = g;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 走廊地板线 + 尽头的一点灯
    rect(WIN.x, WIN.y + WIN.h - 34, WIN.w, 1, 'rgba(150,180,200,.10)');
    rect(WIN.x, WIN.y + WIN.h - 20, WIN.w, 1, 'rgba(150,180,200,.05)');
    const pulse = 0.5 + Math.sin(t * 1.3) * 0.12;
    ctx.fillStyle = 'rgba(190,215,235,' + (0.10 * pulse) + ')';
    ctx.beginPath(); ctx.arc(WIN.x + 146, WIN.y + 24, 26, 0, 6.284); ctx.fill();
    rect(WIN.x + 145, WIN.y + 6, 2, 14, 'rgba(200,220,240,.18)');
  }

  function awakenBody(c, t) {
    const i = IDX.get(c.img.idle);
    if (i == null) return;
    const r = META.idle.rects[i];
    const h = WIN.h - 20;
    const k = Math.min(h / r[3], 1.15);
    const dw = Math.round(r[2] * k);
    const dh = Math.round(r[3] * k);
    const bob = Math.round(Math.sin(t * 1.6 + i) * 1);
    const x = Math.round(WIN.x + (WIN.w - dw) / 2);
    const y = Math.round(WIN.y + WIN.h - 10 - dh + bob);
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(WIN.x + WIN.w / 2, WIN.y + WIN.h - 8, dw * 0.34, 4, 0, 0, 6.284); ctx.fill();
    ctx.drawImage(art.idle, r[0], r[1], r[2], r[3], x, y, dw, dh);
  }

  function stickBody(c, t) {
    const cx = WIN.x + WIN.w / 2;
    const top = WIN.y + 34;
    const sway = Math.sin(t * 1.4) * 1.2;
    const col = c.color || '#c8cbd4';
    const headR = 17;
    const hy = top + headR;
    // 头：B 站头像裁成圆
    ctx.save();
    ctx.beginPath(); ctx.arc(cx + sway, hy, headR, 0, 6.284); ctx.clip();
    const i = S_IDX.get(c.id);
    if (i != null) {
      const r = META.face.rects[i];
      ctx.drawImage(art.face, r[0], r[1], r[2], r[3], cx + sway - headR, hy - headR, headR * 2, headR * 2);
    } else {
      rect(cx + sway - headR, hy - headR, headR * 2, headR * 2, '#2a2f3a');
    }
    ctx.restore();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx + sway, hy, headR, 0, 6.284); ctx.stroke();
    // 火柴人：脖子、躯干、手臂、腿
    const neck = hy + headR;
    const hip = neck + 40;
    ctx.strokeStyle = 'rgba(230,234,242,.82)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + sway, neck); ctx.lineTo(cx + sway, hip);
    const armY = neck + 10;
    ctx.moveTo(cx + sway, armY); ctx.lineTo(cx + sway - 18, armY + 16 + Math.sin(t * 2.2) * 2);
    ctx.moveTo(cx + sway, armY); ctx.lineTo(cx + sway + 18, armY + 12 - Math.sin(t * 2.2) * 2);
    ctx.moveTo(cx + sway, hip); ctx.lineTo(cx + sway - 12, hip + 30);
    ctx.moveTo(cx + sway, hip); ctx.lineTo(cx + sway + 12, hip + 30);
    ctx.stroke();
    // 手里的话筒
    rect(cx + sway + 18, armY + 10, 3, 12, '#3c4250');
    rect(cx + sway + 17, armY + 7, 5, 4, '#8b93a3');
    // LIVE 灯
    const blink = (Math.sin(t * 4) > 0);
    if (blink) rect(cx + sway - 22, hy - 24, 14, 7, 'rgba(200,50,45,.85)');
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '6px monospace';
    if (blink) ctx.fillText('LIVE', cx + sway - 21, hy - 18);
  }

  function glass() {
    ctx.fillStyle = COL.glass;
    ctx.fillRect(WIN.x, WIN.y, WIN.w, WIN.h);
    // 玻璃上的两道反光
    ctx.strokeStyle = 'rgba(255,255,255,.045)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(WIN.x + 8, WIN.y + 16); ctx.lineTo(WIN.x + 42, WIN.y - 4);
    ctx.moveTo(WIN.x + 118, WIN.y + WIN.h); ctx.lineTo(WIN.x + 168, WIN.y + 40);
    ctx.stroke();
    // 铁栅
    for (let k = 1; k <= 2; k++) {
      rect(WIN.x + Math.round(WIN.w * k / 3) - 1, WIN.y, 3, WIN.h, '#0b0906');
      rect(WIN.x + Math.round(WIN.w * k / 3) - 1, WIN.y, 1, WIN.h, '#241f19');
    }
    rect(WIN.x, WIN.y + Math.round(WIN.h * 0.52), WIN.w, 3, '#0b0906');
    // 内框阴影
    rect(WIN.x, WIN.y, WIN.w, 2, 'rgba(0,0,0,.55)');
    rect(WIN.x, WIN.y + WIN.h - 2, WIN.w, 2, 'rgba(0,0,0,.45)');
  }

  function desk(t) {
    // 桌沿
    rect(0, 236, W, 34, '#0c0b09');
    rect(0, 236, W, 2, '#2a2118');
    // 台灯底座
    rect(30, 226, 26, 12, '#1b1710');
    // 登记簿：摊开的两页
    rect(196, 244, 92, 22, '#0a0a0b');
    rect(200, 242, 84, 22, '#b9b2a2');
    rect(200, 242, 84, 2, '#d6cfbf');
    rect(241, 242, 1, 22, 'rgba(0,0,0,.35)');
    for (let i = 0; i < 4; i++) rect(204, 247 + i * 4, 32, 1, 'rgba(30,30,34,.35)');
    // 左轮（没子弹的时候看起来也一样）
    rect(322, 250, 26, 6, '#20232a');
    rect(322, 250, 26, 1, '#4a505c');
    rect(330, 256, 8, 6, '#171a1f');
    // 杯子
    rect(372, 246, 12, 14, '#2b2f36');
    rect(384, 249, 3, 7, '#2b2f36');
    // 灯下的一圈暖光
    const g = ctx.createRadialGradient(241, 254, 2, 241, 254, 90);
    g.addColorStop(0, 'rgba(227,179,65,.16)');
    g.addColorStop(1, 'rgba(227,179,65,0)');
    ctx.fillStyle = g;
    ctx.fillRect(150, 230, 180, 40);
  }

  function overlay(t) {
    // 扫描线
    ctx.fillStyle = 'rgba(0,0,0,.14)';
    for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    // 噪点
    ctx.globalAlpha = 0.5;
    const ox = Math.floor(t * 37) % 96;
    const oy = Math.floor(t * 53) % 54;
    ctx.drawImage(noise, -ox, -oy, W + 96, H + 54);
    ctx.globalAlpha = 1;
    // 暗角
    const g = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.65, 'rgba(0,0,0,.42)');
    g.addColorStop(1, 'rgba(0,0,0,.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 红：伪人露馅 / 放进来之后
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
    wall(t);
    lamp(t);
    door(t);
    corridor(t);
    if (st.mode === 'black') {
      rect(WIN.x, WIN.y, WIN.w, WIN.h, '#040506');
      // 黑暗里的一双眼睛
      const e = 0.5 + Math.sin(t * 1.1) * 0.2;
      ctx.fillStyle = 'rgba(210,215,225,' + (0.55 * e) + ')';
      ctx.fillRect(WIN.x + 66, WIN.y + 58, 9, 3);
      ctx.fillRect(WIN.x + 100, WIN.y + 58, 9, 3);
    } else if (st.mode === 'visit' && st.char) {
      if (st.char.k === 's') stickBody(st.char, t); else awakenBody(st.char, t);
    }
    if (st.mode !== 'black') glass();
    desk(t);
    if (st.mode === 'visit' && st.char) {
      // 门缝下面透进来的那道光
      const g = ctx.createLinearGradient(0, 250, 0, 270);
      g.addColorStop(0, 'rgba(190,170,120,.10)');
      g.addColorStop(1, 'rgba(190,170,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(DOOR.x, 252, DOOR.w, 18);
    }
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
    draw(t);
  }
  st.raf = requestAnimationFrame(loop);

  return {
    setChar(c) { st.char = c; st.mode = c ? 'visit' : 'idle'; },
    setMode(m) { st.mode = m; if (m !== 'visit') st.char = null; },
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
      if (!v && drone) { try { drone.g.gain.value = 0; } catch (e) {} }
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
      const a = ctx(); if (!a || !on || drone) return;
      const o = a.createOscillator();
      const o2 = a.createOscillator();
      const g = a.createGain();
      o.type = 'sine'; o.frequency.value = 46;
      o2.type = 'sine'; o2.frequency.value = 46.7;
      g.gain.value = 0.035;
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
