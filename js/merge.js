// 合成大杜勒 —— 合成大西瓜的玩法，素材换成《忘却前夜》的头像。
//
// 规则：把校猫小煤球从瓶口丢下去，两个同级头像碰到一起就合成下一级，
// 一路合到最大级的杜勒赛因；两个杜勒赛因再撞一次会一起消失，换一笔大分。
// 球堆高过警戒线一段时间就结束。
//
// 首屏没有依赖：11 张头像由构建脚本内联成 data URI（js/merge-art.js），
// 页面只发一个脚本请求。物理是自己写的圆碰撞（位置修正 + 法向冲量，
// 每帧 2 个子步、3 次松弛），球数最多几十个，手机上也扛得住。
//
// 账号同步（最高分）走的是空闲时的动态 import（js/merge-sync.js），不在首屏里，
// 见下面「账号同步」一节。
import { LEVELS } from './merge-art.js';

const MAX = LEVELS.length - 1;
const TAU = Math.PI * 2;
const RATIO = 1.58;                 // 游戏区 高 / 宽
// 投放池：0~9 级（杜勒赛因只能合出来）。权重按等级递减，越大的球越少见。
// 早先只放 0~4 级，瓶子根本装不下「合到杜勒」需要的当量（算面积最多爬到 6 级），
// 玩家体感就是「合着合着突然满了」。放开到 9 级后才够用。
const SPAWN_W = [10, 9, 8, 7, 6, 1.8, 1.0, 0.5, 0.12, 0.06];
const MAX_SPAWN = SPAWN_W.length - 1;
const OPENER = 5;                   // 开局前几颗只出小球，别一上来就塞大球
const CLEAR_BONUS = 120;            // 两个杜勒赛因一起消失的奖励
const DANGER_HOLD = 2.0;            // 越线坚持多久算输（秒）
const SETTLE = 1.4;                 // 刚投下 / 刚合成的球多久之后才参与越线判定
const WARN_AT = 0.5;                // 球堆顶离警戒线还剩多少屏高就开始「接近」预警

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d', { alpha: false });
const stage = document.getElementById('stage');
const ov = document.getElementById('ov');
const scEl = document.getElementById('sc');
const bsEl = document.getElementById('bs');
const nxEl = document.getElementById('nx');
const hotEl = document.getElementById('hot');

// ------------------------------------------------------------------ 状态
const G = {
  W: 0, H: 0, dpr: 1, top: 0, lineY: 0,      // 世界尺寸（CSS px）
  t: 0,                                       // 世界时间
  balls: [],
  aimX: 0, spawnLv: 0, nextLv: 0, cooldown: 0, drops: 0,
  score: 0, best: 0, over: false, cleared: false,
  danger: 0, warn: 0, approach: 0, merged: 0, finest: 0, seen: new Set([0]),
  fx: [], texts: [],
  bg: null, tiles: new Map(),
  sound: true, paused: false, started: false,
};
const IMG = LEVELS.map((l) => {
  const im = new Image();
  im.decoding = 'async';
  im.src = l.art;
  return im;
});

// ------------------------------------------------------------------ 工具
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rad = (lv) => (G.W * LEVELS[lv].d) / 2;
const aimY = () => Math.max(G.top * 0.62, rad(MAX_SPAWN) * 1.06);

// ------------------------------------------------------------------ 随机
// 不用「按权重直接摇」：那样会连着出四五个小煤球，或者十几颗都不见潘狄娅，
// 玩起来手感很假。这里做成洗牌袋（bag shuffle，和俄罗斯方块的出块一个道理）：
// 先把权重铺成一副牌，洗散了一张张发，发完再洗。同一级最多连出两颗。
let bag = [];
let lastPicks = [];

function refillBag() {
  const pool = [];
  // 权重放大 4 倍再铺牌：不放大时 0.1 这种小权重会被 round 成 1，
  // 结果「极稀有的大球」和「普通小球」在袋子里一样多，配置就白写了
  SPAWN_W.forEach((w, lv) => {
    for (let i = 0; i < Math.max(1, Math.round(w * 4)); i++) pool.push(lv);
  });
  for (let i = pool.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  bag = pool;
}

function pickSpawn() {
  if (!bag.length) refillBag();
  let lv = bag.pop();
  // 连续三颗一样不好玩：把这张塞回袋底，重新发一张
  for (let guard = 0; guard < 6 && lv === lastPicks[0] && lv === lastPicks[1] && bag.length; guard++) {
    bag.unshift(lv);
    lv = bag.pop();
  }
  lastPicks.unshift(lv);
  if (lastPicks.length > 2) lastPicks.pop();
  // 开局几颗只给小球，让瓶子先有个底
  if (G.drops < OPENER) lv = Math.min(lv, 2);
  return lv;
}

function resetSpawn() {
  bag = [];
  lastPicks = [];
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ------------------------------------------------------------------ 音效
// 只用振荡器，不加载任何音频文件。浏览器不给放就安静地玩。
let AC = null;
function beep(freq, dur, type, vol) {
  if (!G.sound) return;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    AC = AC || new Ctor();
    if (AC.state === 'suspended') AC.resume();
    const o = AC.createOscillator();
    const g = AC.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, AC.currentTime);
    g.gain.setValueAtTime(vol || 0.05, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + dur + 0.03);
  } catch { /* 静音 */ }
}

// ------------------------------------------------------------------ 尺寸 / 背景
function layout() {
  const aw = stage.clientWidth;
  const ah = stage.clientHeight;
  const oldW = G.W;
  let H = Math.min(ah, aw * RATIO, 780);
  let W = H / RATIO;
  if (W > 470) { W = 470; H = W * RATIO; }
  if (!W || !H) return;

  G.W = W;
  G.H = H;
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  cv.width = Math.round(W * G.dpr);
  cv.height = Math.round(H * G.dpr);
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);

  // 投放区只需要刚好放得下「最大那颗可投放的球」——这块留得越多，警戒线就被压得越低，
  // 瓶子能堆的高度越少（以前这里是 2.1 倍半径，白白吃掉五十多像素）
  G.top = Math.max(G.H * 0.10, rad(MAX_SPAWN) * 1.08);
  G.lineY = G.top + G.H * 0.045;

  // 世界等比缩放：W 和 H 是按比例算出来的，所以只需一个系数
  if (oldW && Math.abs(W / oldW - 1) > 0.004) {
    const k = W / oldW;
    for (const b of G.balls) {
      b.x *= k; b.y *= k; b.vx *= k; b.vy *= k;
      b.r = rad(b.lv);
      b.x = clamp(b.x, b.r, G.W - b.r);
      b.y = Math.min(b.y, G.H - b.r);
    }
    G.aimX *= k;
  }
  G.aimX = clamp(G.aimX || G.W / 2, 0, G.W);
  G.tiles.clear();
  buildBg();
}

function buildBg() {
  const c = document.createElement('canvas');
  c.width = Math.round(G.W * G.dpr);
  c.height = Math.round(G.H * G.dpr);
  const g = c.getContext('2d');
  g.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);

  const lg = g.createLinearGradient(0, 0, 0, G.H);
  lg.addColorStop(0, '#121724');
  lg.addColorStop(0.55, '#0d111b');
  lg.addColorStop(1, '#090c13');
  g.fillStyle = lg;
  g.fillRect(0, 0, G.W, G.H);

  const rg = g.createRadialGradient(G.W * 0.5, G.H * 0.34, 0, G.W * 0.5, G.H * 0.34, G.H * 0.66);
  rg.addColorStop(0, 'rgba(110,168,255,.14)');
  rg.addColorStop(1, 'rgba(110,168,255,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, G.W, G.H);

  // 固定的星点：只生成一次，避免每帧闪烁
  let seed = 20261028;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  for (let i = 0; i < 46; i++) {
    const x = rnd() * G.W;
    const y = rnd() * G.H;
    const r = 0.4 + rnd() * 1.1;
    g.fillStyle = `rgba(200,215,255,${0.04 + rnd() * 0.1})`;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  // 投放区：瓶口以上，压一层很淡的亮色，一眼能看出「球从这里进来」
  const y0 = G.top;
  const tg = g.createLinearGradient(0, 0, 0, y0);
  tg.addColorStop(0, 'rgba(110,168,255,.10)');
  tg.addColorStop(1, 'rgba(110,168,255,.02)');
  g.fillStyle = tg;
  g.fillRect(0, 0, G.W, y0);

  // 瓶口
  g.strokeStyle = 'rgba(160,178,215,.24)';
  g.lineWidth = 1.2;
  g.setLineDash([9, 7]);
  g.beginPath(); g.moveTo(0, y0); g.lineTo(G.W, y0); g.stroke();
  g.setLineDash([]);
  // 瓶肩：两侧各一小段，示意这里开始收口
  g.strokeStyle = 'rgba(160,178,215,.34)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, y0); g.lineTo(G.W * 0.07, y0); g.stroke();
  g.beginPath(); g.moveTo(G.W, y0); g.lineTo(G.W * 0.93, y0); g.stroke();

  // 两侧瓶壁，向下渐隐
  for (const x of [0.75, G.W - 0.75]) {
    const wg = g.createLinearGradient(0, y0, 0, G.H);
    wg.addColorStop(0, 'rgba(150,172,215,.30)');
    wg.addColorStop(1, 'rgba(120,140,180,.08)');
    g.strokeStyle = wg;
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y0); g.lineTo(x, G.H); g.stroke();
  }

  G.bg = c;
}

// ------------------------------------------------------------------ 头像贴图（预渲染）
function tileFor(lv) {
  const key = lv + '|' + Math.round(G.W);
  let t = G.tiles.get(key);
  if (t) return t;

  const r = rad(lv);
  const pad = Math.max(2, r * 0.11);
  const px = Math.round((r + pad) * 2 * G.dpr);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const cx = px / 2;
  const R = r * G.dpr;
  const tint = LEVELS[lv].tint;

  // 外圈光环，让同尺寸的球在暗背景上浮起来
  const glow = g.createRadialGradient(cx, cx, R * 0.9, cx, cx, R + pad * G.dpr);
  glow.addColorStop(0, hexA(tint, 0.45));
  glow.addColorStop(1, hexA(tint, 0));
  g.fillStyle = glow;
  g.beginPath(); g.arc(cx, cx, R + pad * G.dpr, 0, TAU); g.fill();

  g.beginPath(); g.arc(cx, cx, R, 0, TAU);
  g.fillStyle = '#0a0d14';
  g.fill();

  g.save();
  g.beginPath(); g.arc(cx, cx, R * 0.995, 0, TAU); g.clip();
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(IMG[lv], cx - R, cx - R, R * 2, R * 2);
  g.restore();

  g.lineWidth = Math.max(1.2, R * 0.05);
  g.strokeStyle = hexA(tint, 0.9);
  g.beginPath(); g.arc(cx, cx, R - g.lineWidth / 2, 0, TAU); g.stroke();

  g.strokeStyle = 'rgba(255,255,255,.28)';
  g.lineWidth = Math.max(1, R * 0.04);
  g.beginPath(); g.arc(cx, cx, R * 0.9, -Math.PI * 0.84, -Math.PI * 0.16); g.stroke();

  t = { c, size: (r + pad) * 2 };
  G.tiles.set(key, t);
  return t;
}

// ------------------------------------------------------------------ 物理
function mkBall(lv, x, y, vx, vy) {
  return { lv, x, y, vx, vy, r: rad(lv), born: G.t, mg: null };
}

// ------------------------------------------------------------------ 预警
// 分两档，别等人越过线才反应：
//   1) 接近（near）：球堆顶离警戒线不到 10% 屏高，橙色提示「快到线了」
//   2) 越线（hot） ：真过了线，danger 开始倒计时，红色 + 进度条 + 越急越密的滴答
let warnShown = false;
let warnHot = false;
let warnTickAt = 0;

function syncWarn() {
  const hot = G.started && !G.over && G.danger > 0.02;
  const near = G.started && !G.over && !hot && G.approach > WARN_AT;
  const on = hot || near;

  if (on !== warnShown || hot !== warnHot) {
    warnShown = on;
    warnHot = hot;
    document.body.classList.toggle('danger', hot);
    if (hotEl) {
      hotEl.classList.toggle('on', on);
      hotEl.classList.toggle('near', near);
    }
    if (hot) beep(340, 0.18, 'triangle', 0.055);
    else if (near) beep(460, 0.1, 'sine', 0.035);
  }
  if (hotEl && on) {
    hotEl.textContent = near
      ? '球堆快到警戒线了'
      : G.warn > 0.74 ? '过线了！快把它消掉' : '球堆过线了，快消掉';
    if (hot) hotEl.style.setProperty('--p', G.warn.toFixed(3));
    else hotEl.style.setProperty('--p', '0');
  }
  // 越线倒计时：滴答声随剩余时间加快；只是接近的话偶尔轻点一下，别吵
  if (hot && G.t - warnTickAt > 0.68 - 0.44 * G.warn) {
    warnTickAt = G.t;
    beep(560 + 300 * G.warn, 0.055, 'square', 0.016 + 0.022 * G.warn);
  } else if (near && G.t - warnTickAt > 2.8) {
    warnTickAt = G.t;
    beep(430, 0.07, 'sine', 0.026);
  }
}

function clearWarn() {
  warnShown = false;
  warnHot = false;
  warnTickAt = 0;
  G.approach = 0;
  document.body.classList.remove('danger');
  if (hotEl) { hotEl.classList.remove('on', 'near'); hotEl.style.removeProperty('--p'); }
}

function step(dt) {
  const g = 3.1 * G.W;
  const balls = G.balls;

  for (const b of balls) {
    b.vy += g * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const vmax = 3.6 * G.W;         // 上限压小一点：帧内位移太大会从别的球身上「跳」过去
    if (b.vy > vmax) b.vy = vmax;
    if (b.vy < -vmax) b.vy = -vmax;
    if (b.vx > vmax) b.vx = vmax;
    if (b.vx < -vmax) b.vx = -vmax;
    if (b.x - b.r < 0) { b.x = b.r; if (b.vx < 0) b.vx = -b.vx * 0.2; }
    if (b.x + b.r > G.W) { b.x = G.W - b.r; if (b.vx > 0) b.vx = -b.vx * 0.2; }
    if (b.y - b.r < 0) { b.y = b.r; if (b.vy < 0) b.vy = -b.vy * 0.2; }
    if (b.y + b.r > G.H) {
      b.y = G.H - b.r;
      if (b.vy > 0) b.vy = -b.vy * 0.15;
      b.vx *= 0.86;               // 落地摩擦，不然会在瓶底滑来滑去
    }
  }

  // 球一多就少推一轮，手机上别为了「绝对稳」把帧率拖死
  const iters = G.balls.length > 26 ? 3 : 4;
  resolve(iters, 0.82);

  // 刚合成的球是「撑」出来的，和周围一定重叠。只推一遍的话它会顶着球堆慢慢往上爬，
  // 爬到线上就把人判死了——所以合成那一帧额外多推几次，让重叠当场解开。
  const wave = flushMerges();
  if (wave) resolve(Math.min(6, 2 + wave), 0.72);

  // 位置修正可能把球推出墙外一点点，收个尾，别让球画到瓶子外面
  for (const b of G.balls) {
    if (b.x < b.r) { b.x = b.r; if (b.vx < 0) b.vx = 0; }
    else if (b.x > G.W - b.r) { b.x = G.W - b.r; if (b.vx > 0) b.vx = 0; }
    if (b.y > G.H - b.r) { b.y = G.H - b.r; if (b.vy > 0) b.vy = 0; }
  }

  // 越线判定：球落定之后再越线才算，刚投下来 / 刚合成的那一秒半不算
  // （不能按半径算「沉得多深」——球越大越永远达不到，塔顶的大球就会白嫖）
  let dan = false;
  let topMost = Infinity;
  for (const b of G.balls) {
    if (G.t - b.born < 0.35) continue;      // 还在空中的不算
    if (b.y - b.r < topMost) topMost = b.y - b.r;
    if (!dan && G.t - b.born > SETTLE && b.y - b.r < G.lineY) dan = true;
  }
  // 离警戒线还有多远，换算成 0~1：1 = 贴着线，0 = 还有一屏高的富余。
  // 这一步是给「预警」用的——人得在越线之前看到提示，而不是判负之后才明白。
  const GAP = G.H * 0.10;
  G.approach = topMost === Infinity ? 0 : clamp(1 - (topMost - G.lineY) / GAP, 0, 1);

  G.danger = dan ? G.danger + dt : Math.max(0, G.danger - dt * 2.4);
  G.warn = clamp(G.danger / DANGER_HOLD, 0, 1);
  syncWarn();
  if (G.danger > DANGER_HOLD) gameOver();
}

// 圆碰撞的位置修正 + 法向冲量 + 切向摩擦。
// 球多的时候 O(n²) 会有点吃力，所以先按 y 排一遍：一旦某个球的 y 已经超出
// 「最大半径 + 自己的半径」，后面的球只会更远，直接 break。
function resolve(iterations, pushK) {
  const balls = G.balls;
  if (balls.length < 2) return;
  let maxR = 0;
  for (const b of balls) if (b.r > maxR) maxR = b.r;

  for (let iter = 0; iter < iterations; iter++) {
    const s = balls.slice().sort((p, q) => p.y - q.y);
    for (let i = 0; i < s.length; i++) {
      const a = s[i];
      if (a.mg) continue;
      const limit = a.r + maxR;
      for (let j = i + 1; j < s.length; j++) {
        const b = s[j];
        if (b.y - a.y > limit) break;      // 后面只会更高，不用再看了
        if (b.mg) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        // 完全重合时法线没有方向，先随便推开一点，否则两个球会卡在原地
        if (d2 < 1e-6) {
          a.x -= 0.4; a.y -= 0.4; b.x += 0.4; b.y += 0.4;
          continue;
        }
        if (d2 >= rr * rr) continue;

        if (a.lv === b.lv) { a.mg = b; b.mg = a; continue; }

        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const wa = 1 / (a.r * a.r);
        const wb = 1 / (b.r * b.r);
        const ws = wa + wb;
        const push = (rr - d) * pushK;
        a.x -= nx * push * (wa / ws);
        a.y -= ny * push * (wa / ws);
        b.x += nx * push * (wb / ws);
        b.y += ny * push * (wb / ws);

        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn < 0) {
          const jn = (-(1 + 0.02) * rvn) / ws;
          a.vx -= nx * jn * wa; a.vy -= ny * jn * wa;
          b.vx += nx * jn * wb; b.vy += ny * jn * wb;
          // 切向摩擦：不处理的话球堆会一直往下滑
          const tx = -ny;
          const ty = nx;
          const rvt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
          const jt = (-rvt / ws) * 0.32;
          a.vx -= tx * jt * wa; a.vy -= ty * jt * wa;
          b.vx += tx * jt * wb; b.vy += ty * jt * wb;
        }
      }
    }
  }
}

function flushMerges() {
  const done = new Set();
  let wave = 0;
  for (let i = 0; i < G.balls.length; i++) {
    const a = G.balls[i];
    const b = a.mg;
    if (!b || done.has(a) || done.has(b)) continue;
    done.add(a);
    done.add(b);
    merge(a, b);
    wave++;
  }
  if (wave) G.balls = G.balls.filter((b) => !b.dead);
  return wave;
}

function merge(a, b) {
  a.dead = b.dead = true;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  const lv = a.lv;
  G.merged++;

  if (lv >= MAX) {
    // 两个杜勒赛因：一起消失，换一笔大分
    G.score += CLEAR_BONUS;
    burst(x, y, LEVELS[MAX].tint, 22, 1.7);
    fly(x, y, '+' + CLEAR_BONUS, LEVELS[MAX].tint);
    beep(180, 0.4, 'sawtooth', 0.09);
    beep(720, 0.5, 'sine', 0.05);
    if (!G.cleared) { G.cleared = true; toast('把两个杜勒赛因合掉了'); }
    return;
  }

  const nlv = lv + 1;
  if (nlv > G.finest) G.finest = nlv;
  // 新球比两个旧球都大。中心还搁在两球中点上，新球就会往上「涨」出去——
  // 球堆正好贴线的时候，这一涨就把自己顶死了。所以往下挪半个半径差：
  // 让它在原地长，长的方向朝瓶底。
  const rNew = rad(nlv);
  const drop = Math.max(0, rNew - Math.max(a.r, b.r)) * 0.55;
  const ny2 = clamp(y + drop, rNew, G.H - rNew);
  const nb = mkBall(nlv, clamp(x, rNew, G.W - rNew), ny2, (a.vx + b.vx) / 2, (a.vy + b.vy) / 2);
  nb.scale = 1.32;
  G.balls.push(nb);
  G.score += LEVELS[nlv].pts;
  G.seen.add(nlv);
  burst(x, y, LEVELS[nlv].tint, 10 + nlv, 1);
  fly(x, y, '+' + LEVELS[nlv].pts, LEVELS[nlv].tint);
  beep(300 * Math.pow(1.085, nlv), 0.12, 'sine', 0.055);
  if (nlv === MAX) toast('杜勒赛因降临');
}

// ------------------------------------------------------------------ 特效
function burst(x, y, color, n, power) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const sp = (0.4 + Math.random()) * G.W * 0.11 * power;
    G.fx.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - G.W * 0.03,
      r: (1 + Math.random() * 2) * (G.W / 420) * power,
      life: 0.34 + Math.random() * 0.26,
      max: 0.6,
      c: color,
    });
  }
}

function fly(x, y, text, color) {
  const jitter = (Math.random() - 0.5) * G.W * 0.1;
  G.texts.push({ x: x + jitter, y, text, color, life: 0.85, max: 0.85 });
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1100);
  setTimeout(() => el.remove(), 1700);
}

// ------------------------------------------------------------------ 投放
function drop() {
  if (!G.started || G.over || G.paused || G.cooldown > 0) return;
  const lv = G.spawnLv;
  const r = rad(lv);
  const x = clamp(G.aimX, r, G.W - r);
  const b = mkBall(lv, x, aimY(), 0, G.W * 0.35);
  G.balls.push(b);
  G.seen.add(lv);
  // 手上这颗投出去了，预览的「下一颗」顶上来，再摇一颗新的排到后面
  G.spawnLv = G.nextLv;
  G.nextLv = pickSpawn();
  G.drops++;
  G.cooldown = 0.36;
  beep(190, 0.05, 'triangle', 0.04);
  paintNext();
  paintChain();
}

function gameOver() {
  if (G.over) return;
  G.over = true;
  G.danger = DANGER_HOLD;
  clearWarn();
  if (G.score > G.best) { G.best = G.score; saveBest(G.best); }
  beep(300, 0.16, 'sawtooth', 0.07);
  setTimeout(() => beep(190, 0.42, 'sawtooth', 0.07), 130);
  document.getElementById('ovk').textContent = '瓶子满了';
  document.getElementById('ovs').textContent = G.score;
  document.getElementById('ovd').textContent = summary();
  document.getElementById('ovb').textContent = '历史最佳 ' + G.best + ' 分';
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('on'));
  bsEl.textContent = G.best;
  paintChain();
  flushBest();
}

function summary() {
  // 用「合出来的最高一级」，不是「见过」——见过里混着投放时白送的大球
  if (!G.merged) return '一颗都没合出来，下次把一样的两颗丢在一起';
  return `合成了 ${G.merged} 次，最高合到${LEVELS[G.finest].n}`;
}

// ------------------------------------------------------------------ 绘制
function draw() {
  ctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  if (G.bg) ctx.drawImage(G.bg, 0, 0, G.W, G.H);

  // 警戒线：平时是一条几乎看不见的虚线，危险时变红、加粗、跟着心跳闪
  const hot = G.warn > 0.02;
  ctx.save();
  if (hot) {
    // 线上方一层红光，越危险越浓，远处也能瞥见
    const band = G.H * (0.03 + 0.05 * G.warn);
    const lg = ctx.createLinearGradient(0, G.lineY - band, 0, G.lineY + band * 0.6);
    lg.addColorStop(0, 'rgba(232,105,95,0)');
    lg.addColorStop(0.5, `rgba(232,105,95,${0.1 + 0.26 * G.warn})`);
    lg.addColorStop(1, 'rgba(232,105,95,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, G.lineY - band, G.W, band * 1.6);
  }
  ctx.setLineDash([6, 7]);
  ctx.lineWidth = 1.5 + 1.8 * G.warn;
  const pulse = 0.5 + 0.5 * Math.sin(G.t * (6 + 8 * G.warn));
  ctx.strokeStyle = hot
    ? `rgba(232,105,95,${0.28 + 0.55 * G.warn * (0.6 + 0.4 * pulse)})`
    : 'rgba(227,179,65,.20)';
  ctx.beginPath();
  ctx.moveTo(0, G.lineY);
  ctx.lineTo(G.W, G.lineY);
  ctx.stroke();
  ctx.restore();

  for (const b of G.balls) drawBall(b);
  if (G.started && !G.over) drawAim();

  // 粒子
  for (const p of G.fx) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 飘分
  for (const t of G.texts) {
    const k = t.life / t.max;
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.fillStyle = t.color;
    ctx.font = `700 ${Math.round(G.W * 0.05)}px system-ui, -apple-system, "PingFang SC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawBall(b) {
  const t = tileFor(b.lv);
  const s = t.size * (b.scale || 1);
  ctx.drawImage(t.c, b.x - s / 2, b.y - s / 2, s, s);
}

function drawAim() {
  const lv = G.spawnLv;
  const r = rad(lv);
  const x = clamp(G.aimX, r, G.W - r);
  const y = aimY();

  ctx.save();
  ctx.strokeStyle = 'rgba(150,170,210,.16)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 9]);
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.lineTo(x, G.H);
  ctx.stroke();
  ctx.restore();

  ctx.globalAlpha = G.cooldown > 0 ? 0.32 : 0.95;
  drawBall({ lv, x, y, scale: 1 });
  ctx.globalAlpha = 1;
}

// ------------------------------------------------------------------ 主循环
let last = 0;
let acc = 0;
const STEP = 1 / 120;

function loop(now) {
  requestAnimationFrame(loop);
  if (!last) last = now;
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;          // 切回来时别一次补几十帧

  if (!G.paused) {
    G.t += dt;
    if (G.cooldown > 0) G.cooldown = Math.max(0, G.cooldown - dt);

    if (!G.over && G.started) {
      acc += dt;
      let guard = 0;
      while (acc >= STEP && guard++ < 8) { step(STEP); acc -= STEP; }
      if (guard >= 8) acc = 0;
    }

    // 合成时的弹一下
    for (const b of G.balls) {
      if (b.scale && b.scale > 1) {
        b.scale = Math.max(1, b.scale - dt * 3.2);
      }
    }
    for (let i = G.fx.length - 1; i >= 0; i--) {
      const p = G.fx[i];
      p.vy += 1.4 * G.W * 0.08 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) G.fx.splice(i, 1);
    }
    for (let i = G.texts.length - 1; i >= 0; i--) {
      const t = G.texts[i];
      t.y -= dt * G.W * 0.13;
      t.life -= dt;
      if (t.life <= 0) G.texts.splice(i, 1);
    }

    if (G.score !== G.shown) {
      G.shown = G.score;
      scEl.textContent = G.score;
      if (G.score > G.best) {          // 最高分实时跟上，不用等结束
        G.best = G.score;
        bsEl.textContent = G.best;
        saveBest(G.best);
      }
    }
  }
  draw();
}

// ------------------------------------------------------------------ 界面
// 预览的是「下一颗」，不是手上这颗（手上那颗画在瞄准线上，用不着再放一个图）
function paintNext() {
  const l = LEVELS[G.nextLv];
  if (!l) return;
  nxEl.src = l.art;
  nxEl.alt = l.n;
  nxEl.title = l.n;
}

function paintChain() {
  const box = document.getElementById('chain');
  if (!box) return;
  [...box.children].forEach((el, i) => el.classList.toggle('on', G.seen.has(i)));
}

function buildChain() {
  const box = document.getElementById('chain');
  LEVELS.forEach((l, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.title = (i + 1) + '. ' + l.n;
    const im = document.createElement('img');
    im.src = l.art;
    im.alt = l.n;
    im.draggable = false;
    s.appendChild(im);
    box.appendChild(s);
  });
}

function reset() {
  G.balls = [];
  G.fx = [];
  G.texts = [];
  G.score = 0;
  G.merged = 0;
  G.finest = 0;
  G.cleared = false;
  G.over = false;
  G.danger = 0;
  G.warn = 0;
  G.cooldown = 0;
  G.t = 0;
  G.drops = 0;
  G.seen = new Set([0]);
  G.aimX = G.W / 2;
  resetSpawn();
  G.spawnLv = pickSpawn();
  G.nextLv = pickSpawn();
  G.seen.add(G.spawnLv);
  G.started = true;
  acc = 0;
  last = 0;
  clearWarn();
  ov.classList.remove('on');
  ov.hidden = true;
  G.shown = 0;
  scEl.textContent = '0';
  bsEl.textContent = G.best;
  paintNext();
  paintChain();
}

// ------------------------------------------------------------------ 输入
function localX(e) {
  const rc = cv.getBoundingClientRect();
  return ((e.clientX - rc.left) / rc.width) * G.W;
}

cv.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' && !e.buttons) return;
  G.aimX = localX(e);
});
cv.addEventListener('pointerdown', (e) => {
  G.aimX = localX(e);
  if (e.pointerType !== 'mouse') cv.setPointerCapture(e.pointerId);
});
cv.addEventListener('pointerup', (e) => {
  if (e.pointerType !== 'mouse' && e.pointerType !== 'pen' && !cv.hasPointerCapture) {
    /* 有些浏览器合成 click 时会丢坐标，下面 localX 仍然可用 */
  }
  G.aimX = localX(e);
  drop();
});
cv.addEventListener('pointercancel', () => { G.aimX = clamp(G.aimX, 0, G.W); });

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') { G.aimX = clamp(G.aimX - G.W * 0.045, 0, G.W); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { G.aimX = clamp(G.aimX + G.W * 0.045, 0, G.W); e.preventDefault(); }
  else if (e.key === ' ' || e.key === 'Enter') { drop(); e.preventDefault(); }
  else if (e.key === 'r' || e.key === 'R') { reset(); }
});

document.getElementById('again').addEventListener('click', reset);
document.getElementById('rst').addEventListener('click', () => { reset(); });
document.getElementById('snd').addEventListener('click', (e) => {
  G.sound = !G.sound;
  e.currentTarget.setAttribute('aria-pressed', G.sound ? 'true' : 'false');
  e.currentTarget.classList.toggle('off', !G.sound);
  try { localStorage.setItem('zjtt:merge:snd', G.sound ? '1' : '0'); } catch { /* 无痕模式 */ }
  if (G.sound) beep(520, 0.08, 'sine', 0.05);
});

document.addEventListener('visibilitychange', () => {
  G.paused = document.hidden;
  last = 0;
  if (document.hidden) flushBest();     // 切走前把纪录推一次，手机端常常直接杀页面
});
window.addEventListener('pagehide', flushBest);
window.addEventListener('resize', () => { layout(); });
window.addEventListener('orientationchange', () => setTimeout(layout, 160));

// ------------------------------------------------------------------ 存档
function loadPrefs() {
  try {
    const b = parseInt(localStorage.getItem('zjtt:merge:best') || '0', 10);
    if (b > 0) G.best = b;
    G.sound = localStorage.getItem('zjtt:merge:snd') !== '0';
  } catch { /* 无痕模式 */ }
}
function saveBest(v) {
  try { localStorage.setItem('zjtt:merge:best', String(v)); } catch { /* 无痕模式 */ }
}

// ------------------------------------------------------------------ 账号同步
// 最高分同时也记在账号档案里（js/account.js 的 mb 字段），换设备登录能拿回来。
// 但账号那条链有 60 多 KB，不能算进「点开就能玩」的首屏：这里等游戏跑起来、
// 浏览器空闲了再动态 import（构建后是 js/b/merge-sync.js，一个额外请求）。
// 拉不到就算了，本机分数照常存、照常玩。
let SYNC = null;      // 拉到的模块
let syncTried = false;
function armSync() {
  if (syncTried) return;
  syncTried = true;
  const load = () => {
    Promise.resolve()
      .then(() => import('./merge-sync.js'))
      .then((m) => {
        SYNC = m;
        return m.pullBest ? m.pullBest() : null;
      })
      .then((b) => {
        // 云端更高（比如换了台设备）：直接用云端的，并写回本机
        if (b > G.best) {
          G.best = b;
          saveBest(b);
          bsEl.textContent = G.best;
          if (!G.over) toast('云端的最高分 ' + b + ' 分已同步');
        }
        // 本机更高（这局刚破纪录、还没推上去）：趁现在补推一次
        else if (G.best > 0) flushBest();
      })
      .catch(() => { /* 没网、没登录、老浏览器不支持动态 import：一律当单机 */ });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
}

// 把本机最高分推进账号档案。只在「一局结束」和「页面要走」时调，
// 别每涨一分调一次——那会把 localStorage 和接口都刷爆。
let pushedBest = 0;      // 已经推上去的值，避免一局结束 + 切后台重复推
function flushBest() {
  if (!SYNC || !SYNC.pushBest || G.best <= pushedBest) return;
  pushedBest = G.best;
  try {
    SYNC.pushBest(G.best);
    SYNC.flush();
  } catch { /* 同步失败不影响游戏 */ }
}

// ------------------------------------------------------------------ 启动
function boot() {
  loadPrefs();
  const snd = document.getElementById('snd');
  snd.setAttribute('aria-pressed', G.sound ? 'true' : 'false');
  snd.classList.toggle('off', !G.sound);
  buildChain();
  layout();
  reset();
  try {
    if (!localStorage.getItem('zjtt:merge:played')) {
      localStorage.setItem('zjtt:merge:played', '1');
      setTimeout(() => toast('点一下屏幕把头像投下去，两个一样的碰在一起就合成'), 400);
    }
  } catch { /* 无痕模式 */ }
  const ph = document.getElementById('boot');
  if (ph) ph.remove();
  requestAnimationFrame(loop);
  armSync();
  // 无头测试用：脚本里设了 window.__MERGE_TEST__（或地址带 ?_test=1）才暴露内部状态，正式页面没有
  if (window.__MERGE_TEST__ || /[?&]_test=1\b/.test(location.search)) {
    window.__mergeState = () => G;
    window.__mergeDrop = (x) => { G.aimX = clamp(x, 0, G.W); drop(); };
  }
}

if (IMG.every((im) => im.complete) && IMG[0].decode) {
  Promise.all(IMG.map((im) => im.decode().catch(() => {}))).then(boot);
} else if (IMG[0].decode) {
  Promise.all(IMG.map((im) => (im.complete ? im.decode().catch(() => {}) : new Promise((r) => {
    im.onload = im.onerror = r;
  })))).then(boot);
} else {
  let left = IMG.length;
  IMG.forEach((im) => {
    const done = () => { if (--left === 0) boot(); };
    if (im.complete) done();
    else { im.onload = done; im.onerror = done; }
  });
}

// 载入慢的时候给句话，别让人对着空白等
setTimeout(() => {
  const t = document.getElementById('bootText');
  if (t && !G.started) t.textContent = '还在载入头像…（首次访问会慢一些）';
}, 5000);
