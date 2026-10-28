// 房间、敌人、掉落物的画法。
//
// 房间是「静态的」，所以整间房（地板 + 墙 + 踢脚线 + 门 + 课桌）在进入时烘焙进一张
// 离屏 canvas，之后每帧只 drawImage 一次；只有灯光的呼吸、门的开合这些动态层才逐帧画。
// 边缘机器的手机端跑不动几百次 fillRect，这个拆法是必须的。
import { TUNE } from './binding-data.js';
import { artImage, drawPortrait } from './binding-cat.js';

const T = TUNE.tile;
export const WALL = TUNE.wall;

// ------------------------------------------------------------------ 主题配色
const THEMES = {
  wood: {
    floorA: '#3a2d24', floorB: '#332820', line: '#241a14', grain: 'rgba(255,220,180,.05)',
    wall: '#221a20', wallTop: '#2e2430', skirt: '#181118', trim: '#4a3a3a',
  },
  tile: {
    floorA: '#2b323b', floorB: '#262c35', line: '#1a1f26', grain: 'rgba(200,230,255,.045)',
    wall: '#1d232c', wallTop: '#28303c', skirt: '#141920', trim: '#3d4a5c',
  },
  stone: {
    floorA: '#2a2a30', floorB: '#25252b', line: '#1a1a1f', grain: 'rgba(220,220,255,.04)',
    wall: '#1c1c22', wallTop: '#262630', skirt: '#131317', trim: '#3a3a48',
  },
  // 蜡像馆：暖一点的石地，墙上全是烛光
  wax: {
    floorA: '#322a27', floorB: '#2c2523', line: '#1c1615', grain: 'rgba(255,232,196,.05)',
    wall: '#241c1e', wallTop: '#33272b', skirt: '#171112', trim: '#4d3a38',
  },
  // 融蚀深渊：偏紫的软墙，地面会反光
  abyss: {
    floorA: '#1d1a2c', floorB: '#191627', line: '#100e1b', grain: 'rgba(200,170,255,.055)',
    wall: '#151228', wallTop: '#1f1a33', skirt: '#0d0b18', trim: '#3b2f5e',
  },
};

// 障碍物（课桌 / 病床 / 基座）的上下两截颜色
const OBS_COL = {
  wood: ['#4a382b', '#2c2118'],
  tile: ['#4a5568', '#2c3543'],
  wax: ['#4c3a33', '#2b201c'],
  abyss: ['#3a3358', '#1e1a34'],
};

function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ 房间烘焙
export function bakeRoom(room, themeKey, W, H) {
  const th = THEMES[themeKey] || THEMES.wood;
  const cv = document.createElement('canvas');
  const scale = 2;
  cv.width = W * scale;
  cv.height = H * scale;
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  const rand = rnd(room.seed || 1);

  // 地板
  c.fillStyle = th.floorA;
  c.fillRect(0, 0, W, H);
  if (themeKey === 'wood') {
    const ph = 20;
    for (let y = 0; y < H; y += ph) {
      const off = (Math.floor(y / ph) % 2) * 60;
      for (let x = -60; x < W; x += 120) {
        const v = 0.85 + rand() * 0.3;
        c.fillStyle = `rgba(${Math.round(58 * v)},${Math.round(45 * v)},${Math.round(36 * v)},1)`;
        c.fillRect(x + off, y, 118, ph - 1);
        c.strokeStyle = th.grain;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x + off + 6, y + 5 + rand() * 8);
        c.lineTo(x + off + 90 + rand() * 20, y + 5 + rand() * 8);
        c.stroke();
      }
      c.fillStyle = th.line;
      c.fillRect(0, y + ph - 1, W, 1.4);
    }
  } else if (themeKey === 'tile') {
    const s = 40;
    for (let y = 0; y < H; y += s) {
      for (let x = 0; x < W; x += s) {
        const v = 0.9 + rand() * 0.2;
        c.fillStyle = `rgba(${Math.round(50 * v)},${Math.round(57 * v)},${Math.round(66 * v)},1)`;
        c.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    }
    c.strokeStyle = th.line;
    c.lineWidth = 1;
    for (let y = 0; y < H; y += s) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let x = 0; x < W; x += s) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  } else {
    for (let y = 0; y < H; y += 34) {
      const w = 50 + rand() * 40;
      for (let x = -20; x < W; x += w) {
        const v = 0.86 + rand() * 0.26;
        c.fillStyle = `rgba(${Math.round(46 * v)},${Math.round(46 * v)},${Math.round(52 * v)},1)`;
        c.fillRect(x + 1, y + 1, w - 2, 32);
      }
    }
    c.strokeStyle = th.line;
    c.lineWidth = 1.2;
    for (let y = 0; y < H; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }

  // 地上的旧痕迹：血/水渍
  for (let i = 0; i < 7; i++) {
    const x = 50 + rand() * (W - 100), y = 50 + rand() * (H - 100);
    const r = 8 + rand() * 22;
    const g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(20,10,14,${0.16 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(20,10,14,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y, r, r * 0.7, rand() * 3, 0, 7); c.fill();
  }

  // ---- 墙体：只画四条墙带（不能用 destination-out 挖洞，那会把地板一起挖掉）
  c.fillStyle = th.wall;
  c.fillRect(0, 0, W, WALL);
  c.fillRect(0, H - WALL, W, WALL);
  c.fillRect(0, 0, WALL, H);
  c.fillRect(W - WALL, 0, WALL, H);
  // 墙面上的竖向板缝
  c.strokeStyle = 'rgba(255,255,255,.03)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 26) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, WALL); c.stroke();
    c.beginPath(); c.moveTo(x, H - WALL); c.lineTo(x, H); c.stroke();
  }
  for (let y = 0; y < H; y += 26) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(WALL, y); c.stroke();
    c.beginPath(); c.moveTo(W - WALL, y); c.lineTo(W, y); c.stroke();
  }
  // 墙面下沿压一条深色，和地板拉开层次
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.fillRect(0, 0, W, 6);
  c.fillRect(0, H - 8, W, 8);
  // 挖出地板
  // 内墙阴脚线 + 上沿高光
  const inner = [WALL, WALL, W - WALL * 2, H - WALL * 2];
  const vg = c.createLinearGradient(0, inner[1], 0, inner[1] + 26);
  vg.addColorStop(0, 'rgba(0,0,0,.55)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = vg;
  c.fillRect(inner[0], inner[1], inner[2], 26);
  const hg = c.createLinearGradient(inner[0], 0, inner[0] + 22, 0);
  hg.addColorStop(0, 'rgba(0,0,0,.45)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg;
  c.fillRect(inner[0], inner[1], 22, inner[3]);
  const hg2 = c.createLinearGradient(W - inner[0], 0, W - inner[0] - 22, 0);
  hg2.addColorStop(0, 'rgba(0,0,0,.45)');
  hg2.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg2;
  c.fillRect(W - inner[0] - 22, inner[1], 22, inner[3]);

  // 踢脚线
  c.strokeStyle = th.skirt;
  c.lineWidth = 4;
  c.strokeRect(WALL - 2, WALL - 2, W - WALL * 2 + 4, H - WALL * 2 + 4);

  // 环境装饰：海报 / 标本罐 / 星点。全部画进烘焙图，运行时零成本
  decorate(c, themeKey, W, H, rand);

  // 障碍物（课桌/病床/水泥墩）
  for (const ob of room.obstacles || []) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.beginPath();
    if (c.roundRect) c.roundRect(ob.x + 3, ob.y + 5, ob.w, ob.h, 5);
    else c.rect(ob.x + 3, ob.y + 5, ob.w, ob.h);
    c.fill();
    const g = c.createLinearGradient(ob.x, ob.y, ob.x, ob.y + ob.h);
    const oc = OBS_COL[themeKey] || OBS_COL.wood;
    g.addColorStop(0, oc[0]);
    g.addColorStop(1, oc[1]);
    c.fillStyle = g;
    c.beginPath();
    if (c.roundRect) c.roundRect(ob.x, ob.y, ob.w, ob.h, 5);
    else c.rect(ob.x, ob.y, ob.w, ob.h);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.10)';
    c.lineWidth = 1.2;
    c.stroke();
    // 桌面上一道亮边
    c.strokeStyle = 'rgba(255,240,220,.18)';
    c.beginPath();
    c.moveTo(ob.x + 5, ob.y + 3.5);
    c.lineTo(ob.x + ob.w - 5, ob.y + 3.5);
    c.stroke();
    c.restore();
  }

  // 门：先画门洞（黑洞洞的），门的开合状态在运行时再叠
  for (const [dir, on] of Object.entries(room.doors)) {
    if (!on) continue;
    const d = doorRect(dir, W, H);
    c.save();
    c.fillStyle = '#07080c';
    c.fillRect(d.x, d.y, d.w, d.h);
    // 门框
    c.strokeStyle = th.trim;
    c.lineWidth = 3;
    c.strokeRect(d.x - 1.5, d.y - 1.5, d.w + 3, d.h + 3);
    c.restore();
  }

  return cv;
}

// ------------------------------------------------------------------ 房间装饰
// 每一层给一眼能认出来的「这层是什么地方」：
//   一层走廊 → 墙上贴的晚自习通知、地上粉笔划的线
//   二层教室 → 架上的标本罐、地面排水口
//   三层天台 → 墙面的星点、裂缝、地上的积水
// 全部只画在墙带（0..WALL / H-WALL..H）与地面边缘，不会挡住房间中央的战斗区。
function decorate(c, themeKey, W, H, rand) {
  const m = WALL;
  c.save();
  if (themeKey === 'wood') {
    // 通知单：白纸 + 几行假字，避开门口那一段
    const spots = [W * 0.18, W * 0.38, W * 0.66, W * 0.82];
    for (let i = 0; i < spots.length; i++) {
      const x = spots[i] + rand() * 10 - 5;
      const y = 7 + rand() * 4;
      const pw = 20 + rand() * 8, ph = 26 + rand() * 5;
      c.fillStyle = 'rgba(226,222,208,.16)';
      c.fillRect(x, y, pw, ph);
      c.strokeStyle = 'rgba(255,255,255,.10)';
      c.lineWidth = 0.8;
      c.strokeRect(x + 0.4, y + 0.4, pw - 0.8, ph - 0.8);
      c.strokeStyle = 'rgba(20,20,26,.35)';
      for (let k = 1; k < 5; k++) {
        c.beginPath();
        c.moveTo(x + 3, y + 4 + k * 4.4);
        c.lineTo(x + pw - 4 - rand() * 6, y + 4 + k * 4.4);
        c.stroke();
      }
    }
    // 地上的粉笔线，指向房间中间
    c.strokeStyle = 'rgba(230,230,235,.10)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(W * 0.06, H - m + 14);
    c.lineTo(W * 0.20, H - m - 22);
    c.lineTo(W * 0.30, H - m - 6);
    c.stroke();
  } else if (themeKey === 'tile') {
    // 标本罐：玻璃 + 液体 + 里面那团东西
    for (let i = 0; i < 5; i++) {
      const cw = 15 + rand() * 5;
      const x = W * (0.08 + i * 0.19) + rand() * 8;
      const y = 9;
      const hh = 26 + rand() * 6;
      c.fillStyle = 'rgba(110,175,170,.16)';
      c.fillRect(x, y, cw, hh);
      c.fillStyle = 'rgba(140,210,200,.10)';
      c.fillRect(x + 1.5, y + 1.5, cw * 0.3, hh - 4);
      c.strokeStyle = 'rgba(180,230,225,.22)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, cw - 1, hh - 1);
      c.fillStyle = 'rgba(18,28,32,.8)';
      c.beginPath();
      c.ellipse(x + cw / 2, y + hh * 0.62, cw * 0.26, hh * 0.18, rand() * 0.6, 0, 7);
      c.fill();
    }
    // 排水口
    for (const gx of [W * 0.5]) {
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.fillRect(gx - 7, H - m - 5, 14, 10);
      c.strokeStyle = 'rgba(180,200,220,.14)';
      c.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(gx - 5, H - m - 3 + k * 3); c.lineTo(gx + 5, H - m - 3 + k * 3); c.stroke();
      }
    }
  } else if (themeKey === 'stone') {
    // 天台：墙面星点 + 一条裂缝
    for (let i = 0; i < 26; i++) {
      const x = rand() * W, y = rand() * m;
      c.fillStyle = `rgba(200,215,255,${0.05 + rand() * 0.22})`;
      c.fillRect(x, y, 1.2, 1.2);
    }
    c.strokeStyle = 'rgba(0,0,0,.4)';
    c.lineWidth = 1.4;
    c.beginPath();
    let cx = W * 0.34, cy = 2;
    c.moveTo(cx, cy);
    while (cy < m) { cx += rand() * 8 - 4; cy += 5; c.lineTo(cx, cy); }
    c.stroke();
    // 积水
    for (let i = 0; i < 3; i++) {
      const x = W * (0.2 + rand() * 0.6), y = H - m + 10 + rand() * 18;
      const g = c.createRadialGradient(x, y, 1, x, y, 18 + rand() * 12);
      g.addColorStop(0, 'rgba(110,150,200,.13)');
      g.addColorStop(1, 'rgba(110,150,200,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, y, 20, 8, 0, 0, 7); c.fill();
    }
  } else if (themeKey === 'wax') {
    // 蜡像馆：墙上一排烛台（火苗在闪），地上流下来的蜡
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + i * 0.2) + rand() * 6 - 3;
      const h = 12 + rand() * 6;
      // 烛身
      c.fillStyle = 'rgba(232,222,200,.5)';
      c.fillRect(x, m - h, 4.6, h);
      // 烛泪
      c.fillStyle = 'rgba(232,222,200,.28)';
      c.beginPath(); c.ellipse(x + 2.3, m - h + 1, 3.4, 1.6, 0, 0, 7); c.fill();
      // 火苗
      const fy = m - h - 3.4;
      const fg = c.createRadialGradient(x + 2.3, fy, 0.4, x + 2.3, fy, 8);
      fg.addColorStop(0, 'rgba(255,226,150,.55)');
      fg.addColorStop(0.45, 'rgba(255,170,70,.22)');
      fg.addColorStop(1, 'rgba(255,150,60,0)');
      c.fillStyle = fg;
      c.beginPath(); c.arc(x + 2.3, fy, 8, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,244,214,.9)';
      c.beginPath(); c.ellipse(x + 2.3, fy, 1.1, 2.4, 0, 0, 7); c.fill();
    }
    // 地上：几摊流开又凝住的蜡
    for (let i = 0; i < 4; i++) {
      const x = W * (0.12 + rand() * 0.76), y = H - m + 8 + rand() * 20;
      c.fillStyle = 'rgba(226,216,196,.10)';
      c.beginPath(); c.ellipse(x, y, 14 + rand() * 16, 5 + rand() * 4, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,244,220,.07)';
      c.lineWidth = 1;
      c.stroke();
    }
  } else {
    // 融蚀深渊：墙上爬的紫脉、地上一层会反光的浆
    for (let i = 0; i < 4; i++) {
      c.strokeStyle = `rgba(150,110,230,${0.08 + rand() * 0.12})`;
      c.lineWidth = 1.2 + rand() * 2;
      c.beginPath();
      let px = W * (0.1 + rand() * 0.8), py = 0;
      c.moveTo(px, py);
      while (py < m) { px += rand() * 14 - 7; py += 4 + rand() * 4; c.lineTo(px, py); }
      c.stroke();
    }
    for (let i = 0; i < 3; i++) {
      const x = W * (0.16 + rand() * 0.68), y = H - m + 12 + rand() * 16;
      const g = c.createRadialGradient(x, y, 1, x, y, 24 + rand() * 16);
      g.addColorStop(0, 'rgba(150,110,235,.20)');
      g.addColorStop(0.55, 'rgba(120,80,200,.10)');
      g.addColorStop(1, 'rgba(120,80,200,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, y, 26, 9, 0, 0, 7); c.fill();
    }
  }
  c.restore();
}

// 门洞的矩形（含墙体那一段）
export function doorRect(dir, W, H) {
  const half = 30;
  if (dir === 'n') return { x: W / 2 - half, y: 0, w: half * 2, h: WALL };
  if (dir === 's') return { x: W / 2 - half, y: H - WALL, w: half * 2, h: WALL };
  if (dir === 'w') return { x: 0, y: H / 2 - half, w: WALL, h: half * 2 };
  return { x: W - WALL, y: H / 2 - half, w: WALL, h: half * 2 };
}

// 门后面是什么，门里就透什么颜色的光——玩家不用打开地图也知道该往哪走
const DOOR_TINT = {
  fight: [255, 198, 128], item: [255, 226, 122], shop: [124, 236, 196],
  boss: [255, 108, 96], start: [186, 208, 255], trap: [255, 158, 118],
  altar: [226, 146, 255], challenge: [255, 172, 92],
};

// 门关上时的木板（运行时叠在烘焙图上层，随房间清空与否切换）
// open 为真画「能走的门」：洞里透光、门框亮一圈、地上一道光带、门口一个呼吸的箭头。
// peek(dir) 返回隔壁房间的 type，用来决定光色。
export function drawDoorState(ctx, room, W, H, t, open, peek) {
  // 统一到「门在上、房间在下」的坐标系里画，省的四种方向各写一遍
  const ROT = { n: 0, s: Math.PI, w: -Math.PI / 2, e: Math.PI / 2 };
  for (const [dir, on] of Object.entries(room.doors)) {
    if (!on) continue;
    const d = doorRect(dir, W, H);
    const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
    const back = peek ? peek(dir) : null;
    const rgb = DOOR_TINT[back] || DOOR_TINT.fight;
    const col = (a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    const half = 30, hh = WALL / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ROT[dir]);

    if (!open) {
      // 铁栅栏 + 一把锁：这间房还没清
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(-half, -hh, half * 2, hh * 2);
      ctx.strokeStyle = '#5d6478';
      ctx.lineWidth = 3;
      for (let i = 1; i <= 4; i++) {
        const x = -half + (half * 2 * i) / 5;
        ctx.beginPath(); ctx.moveTo(x, -hh + 2); ctx.lineTo(x, hh - 2); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(190,205,235,.32)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(-half + 2, 0); ctx.lineTo(half - 2, 0); ctx.stroke();
      ctx.fillStyle = '#8d94a6';
      ctx.fillRect(-4.5, -3.5, 9, 8);
      ctx.fillStyle = '#ff6b5e';
      ctx.beginPath(); ctx.arc(0, 0.5, 1.7, 0, 7); ctx.fill();
      ctx.restore();
      continue;
    }

    const pulse = 0.74 + 0.2 * Math.sin(t * 2.2 + (ROT[dir] === 0 ? 0 : 1.7));

    // 洞里：隔壁的黑
    ctx.fillStyle = '#070a11';
    ctx.fillRect(-half, -hh, half * 2, hh * 2);

    // 从门口往房间里铺的一道光带，把「可以走过去」写在地方上
    const deep = 32;
    const lg = ctx.createLinearGradient(0, hh, 0, hh + deep);
    lg.addColorStop(0, col(0.34 * pulse));
    lg.addColorStop(1, col(0));
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(-half, hh); ctx.lineTo(half, hh);
    ctx.lineTo(half + 13, hh + deep); ctx.lineTo(-half - 13, hh + deep);
    ctx.closePath(); ctx.fill();

    // 洞里的光：越靠门口越亮
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 36);
    g.addColorStop(0, col(0.82 * pulse));
    g.addColorStop(0.38, col(0.4 * pulse));
    g.addColorStop(1, col(0));
    ctx.fillStyle = g;
    ctx.fillRect(-half - 16, -hh - 16, half * 2 + 32, hh * 2 + 32);

    // 门框：外深内亮，让这地方读起来是「门」而不是墙上的洞
    ctx.strokeStyle = 'rgba(0,0,0,.62)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-half - 2, -hh - 2, half * 2 + 4, hh * 2 + 4);
    ctx.strokeStyle = col(0.55 + 0.22 * pulse);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-half - 2, -hh - 2, half * 2 + 4, hh * 2 + 4);

    // 门口那个呼吸的箭头，指进洞里
    const r = 6.4 + 1.2 * Math.sin(t * 3);
    const ay = hh + 19;
    ctx.fillStyle = col(0.5 + 0.26 * Math.sin(t * 3));
    ctx.beginPath();
    ctx.moveTo(0, ay - r);
    ctx.lineTo(r * 0.86, ay + r * 0.52);
    ctx.lineTo(-r * 0.86, ay + r * 0.52);
    ctx.closePath(); ctx.fill();

    ctx.restore();
  }
}

// ------------------------------------------------------------------ 敌人
// 怪物立绘（游戏自带图鉴素材，160×160 透明底，内容是出画的半身像）。
// 立绘不做圆框，直接让它站在地上：底边压到碰撞圆下缘，头往上伸出去一截。
// size 给到半径的 5 倍多——图里人物本身就占满画幅，按 2 倍画会小得像图标。
const MON_SIZE = 5.2;
const monSize = (r) => r * MON_SIZE;
function drawMonsterSprite(ctx, e, im, r, t) {
  const low = e.maxHp > 0 && e.hp / e.maxHp <= 0.35;
  // 残血：身后一团红色心跳光。以撒不给小怪血条，但这里敌人小、同屏多，
  // 不给信号就分不清哪只快死了
  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7 + e.seed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, -r * 1.4, r * 0.4, 0, -r * 1.4, r * 3.4);
    g.addColorStop(0, `rgba(255,74,62,${0.24 + 0.22 * pulse})`);
    g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, -r * 1.4, r * 3.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  const size = monSize(r);
  const dy = r * 0.9 - size;          // 底边贴着碰撞圆下缘
  ctx.drawImage(im, -size / 2, dy, size, size);

  // 立绘是半身像，底边是一刀切平的。在脚下压一团浓影把切口糊掉，
  // 看着像从阴影里探出来，而不是一张贴纸浮在地板上。
  const sg = ctx.createRadialGradient(0, r * 0.92, 1, 0, r * 0.92, size * 0.46);
  sg.addColorStop(0, 'rgba(5,7,12,.88)');
  sg.addColorStop(0.55, 'rgba(5,7,12,.42)');
  sg.addColorStop(1, 'rgba(5,7,12,0)');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.92, size * 0.46, size * 0.19, 0, 0, 7);
  ctx.fill();

  if (e.hurt > 0) {
    // 受伤闪白：用 source-atop 只糊在立绘的像素上，不会画出一个白方块
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = Math.min(0.85, e.hurt * 2.4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(-size / 2, dy, size, size);
    ctx.restore();
  }
}

// 血条：平时不画，受伤后短暂出现；残血（≤35%）一直挂着，而且加个跳动的红尖
function drawEnemyHp(ctx, e, t) {
  const ratio = e.maxHp > 0 ? Math.max(0, Math.min(1, e.hp / e.maxHp)) : 1;
  const low = ratio <= 0.35;
  if (!low && !(e.hurt > 0.02)) return;
  const w = Math.max(28, e.r * 2.9), h = 4.4;
  const x = e.x - w / 2;
  // 立绘头顶在 e.y - monSize + 0.9r，血条再往上让 7px
  const y = e.y + e.r * 0.9 - monSize(e.r) - 7;
  ctx.save();
  ctx.fillStyle = 'rgba(4,6,11,.92)';
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 7 + e.seed);
    g.addColorStop(0, '#ff2f28');
    g.addColorStop(1, `rgba(255,${Math.round(150 + 50 * pulse)},90,1)`);
  } else {
    g.addColorStop(0, '#e8c07a');
    g.addColorStop(1, '#ffe1ab');
  }
  ctx.fillStyle = g;
  ctx.fillRect(x, y, Math.max(1.5, w * ratio), h);
  if (low) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 9 + e.seed);
    // 血条外面套一圈红光，远看也认得出
    ctx.strokeStyle = `rgba(255,64,56,${0.35 + 0.5 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);
    // 头顶一个向下的小尖，跟着一起闪
    ctx.fillStyle = `rgba(255,90,80,${0.55 + 0.45 * pulse})`;
    ctx.beginPath();
    ctx.moveTo(e.x, y - 8);
    ctx.lineTo(e.x - 4.5, y - 2.2);
    ctx.lineTo(e.x + 4.5, y - 2.2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

export function drawEnemy(ctx, e, t) {
  const r = e.r;
  const bob = Math.sin(t * 3 + e.seed) * 2.1;
  const im = e.art ? artImage('m:' + e.art) : null;
  ctx.save();
  ctx.translate(e.x, e.y + bob);

  // 影子：带立绘的怪物脚下一大片，几何怪只要一小圈
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.95, im ? r * 1.5 : r * 0.9, r * (im ? 0.34 : 0.3), 0, 0, 7); ctx.fill();

  if (im) {
    drawMonsterSprite(ctx, e, im, r, t);
    ctx.restore();
    drawEnemyHp(ctx, e, t);   // 血条放在世界坐标里，不跟着上下浮
    return;
  }

  if (e.draw === 'wraith') {
    ctx.restore();
    drawPortrait(ctx, { x: e.x, y: e.y + bob, r, t, art: e.art || 'b3', rim: 'rgba(200,180,255,.6)', glow: 'rgba(150,120,255,.3)' });
    return;
  }

  const c1 = e.c || '#2b3140', c2 = e.c2 || '#9fb0d8';
  if (e.draw === 'blob') {
    const w = r * (1 + Math.sin(t * 4 + e.seed) * 0.06);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, w * 1.2);
    g.addColorStop(0, c2);
    g.addColorStop(0.35, c1);
    g.addColorStop(1, '#0b0d12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.94, 0, 0, 7);
    ctx.fill();
    // 两只眼睛
    ctx.fillStyle = '#f2f5ff';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * r * 0.34, -r * 0.15, r * 0.19, r * 0.24, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#14161c';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.34, -r * 0.12, r * 0.09, 0, 7); ctx.fill();
    }
  } else if (e.draw === 'eye') {
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
    g.addColorStop(0, '#eef3ff');
    g.addColorStop(0.6, c1);
    g.addColorStop(1, '#2a3140');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    // 瞳孔跟着玩家转
    const a = e.aimA || 0;
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, r * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = '#100c12';
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.2, 0, 7); ctx.fill();
    // 血丝
    ctx.strokeStyle = 'rgba(200,80,90,.35)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.7 + e.seed;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5);
      ctx.lineTo(Math.cos(ang + 0.4) * r * 0.92, Math.sin(ang + 0.4) * r * 0.92);
      ctx.stroke();
    }
  } else if (e.draw === 'bat') {
    const flap = Math.sin(t * 16 + e.seed) * 0.5;
    ctx.fillStyle = c1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * r * 1.8, -r * (0.9 + flap), s * r * 2.1, r * 0.25);
      ctx.quadraticCurveTo(s * r * 1.2, r * 0.5, 0, r * 0.5);
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = c2;
    // 这里以前是「一行 for 不带括号」：for (...) ctx.beginPath(); ctx.arc(s * ...) —— s 在循环外，
    // 一画蝙蝠就抛 ReferenceError，整个 render() 断在半路（敌人、玩家、HUD 全没了）
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * r * 0.3, -r * 0.1, r * 0.13, 0, 7);
      ctx.fill();
    }
  } else if (e.draw === 'spider') {
    ctx.strokeStyle = c1;
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 4; i++) {
      const a = i * 0.7 + Math.sin(t * 8 + i) * 0.12;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * r * 0.9, Math.sin(a) * r * 0.6, s * r * 1.6, Math.cos(a) * r * 0.9);
        ctx.stroke();
      }
    }
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.75, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c2;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.arc(s * r * 0.2, -r * 0.2 + i * r * 0.28, r * 0.11, 0, 7); ctx.fill();
    }
  } else if (e.draw === 'wisp') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.4);
    g.addColorStop(0, 'rgba(255,220,140,.55)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.8, 0, 0, r);
    ctx.quadraticCurveTo(-r * 0.8, 0, 0, -r);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.3, r * 0.45, 0, 0, 7); ctx.fill();
  }
  if (e.hurt > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.8, e.hurt * 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export function drawBoss(ctx, b, t) {
  ctx.save();
  drawPortrait(ctx, {
    x: b.x, y: b.y, r: b.r, t, art: b.art,
    rim: b.phase > 1 ? 'rgba(255,140,140,.8)' : 'rgba(190,205,235,.65)',
    glow: b.phase > 1 ? 'rgba(255,90,90,.35)' : 'rgba(120,160,255,.3)',
    hurt: b.hurt,
  });
  // 蓄力时外圈发红
  if (b.windup > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const a = Math.min(0.5, b.windup * 1.4);
    ctx.strokeStyle = `rgba(255,120,110,${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8 + Math.sin(t * 18) * 2, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ 掉落物
export function drawHeart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5.4);
  ctx.bezierCurveTo(-10, -3, -6.6, -12, 0, -6.4);
  ctx.bezierCurveTo(6.6, -12, 10, -3, 0, 5.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -8, 0, 6);
  if (filled) { g.addColorStop(0, '#ff6b62'); g.addColorStop(1, '#c31b2b'); }
  else { g.addColorStop(0, '#241018'); g.addColorStop(1, '#150a10'); }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = filled ? 'rgba(255,190,185,.55)' : 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(-3.4, -4.4, 2, 1.4, -0.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}

export function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 3 + (p.seed || 0)) * 2;
  ctx.save();
  if (p.kind === 'coin') {
    const im = artImage('coin');
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 7, 7, 2.6, 0, 0, 7); ctx.fill();
    if (im) ctx.drawImage(im, p.x - 8, p.y - 8 + bob, 16, 16);
    else { ctx.fillStyle = '#cfd6e4'; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 7, 0, 7); ctx.fill(); }
    if (p.value > 1) {
      ctx.fillStyle = '#e3b341';
      ctx.font = 'bold 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x' + p.value, p.x, p.y + 20);
    }
  } else if (p.kind === 'heart') {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 7, 8, 3, 0, 0, 7); ctx.fill();
    drawHeart(ctx, p.x, p.y + bob, p.half ? 12 : 15, true);
  } else if (p.kind === 'item') {
    // 基座
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 18, 6, 0, 0, 7); ctx.fill();
    const pg = ctx.createLinearGradient(p.x, p.y + 2, p.x, p.y + 16);
    pg.addColorStop(0, '#6b5a48');
    pg.addColorStop(1, '#2b231c');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y + 15);
    ctx.lineTo(p.x - 9, p.y + 3);
    ctx.lineTo(p.x + 9, p.y + 3);
    ctx.lineTo(p.x + 14, p.y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,190,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 光柱
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(p.x, p.y - 34, p.x, p.y + 6);
    g.addColorStop(0, 'rgba(255,220,150,0)');
    g.addColorStop(0.65, 'rgba(255,220,150,.14)');
    g.addColorStop(1, 'rgba(255,220,150,.30)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y - 34); ctx.lineTo(p.x + 5, p.y - 34);
    ctx.lineTo(p.x + 15, p.y + 6); ctx.lineTo(p.x - 15, p.y + 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    const im = artImage('i:' + p.icon);
    const s = 34;
    if (im) ctx.drawImage(im, p.x - s / 2, p.y - 34 + bob, s, s);
    ctx.restore();
    return;
  } else if (p.kind === 'stair') {
    // 下一层的楼梯：地上一个黑洞，往下三级台阶，边上呼吸的光
    ctx.save();
    const rr = 26;
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, rr * 1.6);
    g.addColorStop(0, 'rgba(120,170,255,.30)');
    g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#05070b';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.72, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(170,195,240,.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.72, 0, 0, 7); ctx.stroke();
    // 台阶
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = `rgba(150,180,230,${0.3 - i * 0.06})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + i * 6, rr - i * 5, (rr - i * 5) * 0.66, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,220,255,.85)';
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一层', p.x, p.y - rr - 8);
    ctx.restore();
    return;
  } else if (p.kind === 'trinket') {
    const im = artImage('t:' + p.icon);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 20);
    g.addColorStop(0, 'rgba(180,200,255,.35)');
    g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
    ctx.restore();
    if (im) ctx.drawImage(im, p.x - 12, p.y - 12 + bob, 24, 24);
  }
  // 商店价签
  if (p.price != null && !p.taken) {
    ctx.fillStyle = p.afford === false ? '#e8695f' : '#e3b341';
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.price + ' 银芯', p.x, p.y + 30);
  } else if (p.hpCost != null && !p.taken) {
    // 祭坛：标价是血，不是钱
    ctx.fillStyle = '#e8695f';
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('半颗心', p.x, p.y + 30);
  }
  ctx.restore();
}
