// 合成大杜勒 —— 合成大西瓜的玩法，素材换成《忘却前夜》的头像。
//
// 规则：把校猫小煤球从瓶口丢下去，两个同级头像碰到一起就合成下一级，
// 一路合到最大级的杜勒赛因；两个杜勒赛因再撞一次会一起消失，换一笔大分。
// 球堆高过警戒线一段时间就结束。
//
// 四档难度（简单 / 普通 / 困难 / 癫狂）只动三件事：投放池里大球的比例、
// 警戒线压在哪儿、越线后还能抢救多久。合成链本身不动 —— 任何难度最终都是
// 合到杜勒赛因，谁也别想靠选简单档换个更小的终点。
//
// 每局结束按分数换银芯（与侦探页同一个钱包 zjtt:credits），难度有倍率。
//
// 首屏没有依赖：10 张头像由构建脚本内联成 data URI（js/merge-art.js），
// 页面只发一个脚本请求。物理是自己写的圆碰撞（位置修正 + 法向冲量，
// 每帧 2 个子步、3 次松弛），球数最多几十个，手机上也扛得住。
//
// 账号同步（最高分）走的是空闲时的动态 import（js/merge-sync.js），不在首屏里，
// 见下面「账号同步」一节。
import { LEVELS } from './merge-art.js';

const MAX = LEVELS.length - 1;
const TAU = Math.PI * 2;
const RATIO = 1.58;                 // 游戏区 高 / 宽
// 投放上限固定 8 级（诺缔拉）—— 杜勒赛因只能合出来。所有难度都是 9 档权重，
// 长度一致，G.top / aimY 这些跟着 MAX_SPAWN 算的布局就不会随难度跳。
const MAX_SPAWN = 8;
const OPENER = 5;                   // 开局前几颗只出小球，别一上来就塞大球
const CLEAR_BONUS = 120;            // 两个杜勒赛因一起消失的奖励
const SETTLE = 1.4;                 // 刚投下 / 刚合成的球多久之后才参与越线判定
const WARN_AT = 0.5;                // 球堆顶离警戒线还剩多少屏高就开始「接近」预警

// ------------------------------------------------------------------ 难度
// w     投放池权重，索引 = 等级（0 = 这个等级永不投放）
// hold  越线之后还能撑多少秒（短 = 更难）
// line  警戒线相对瓶口下移多少屏高（大 = 线更低 = 瓶子更矮 = 更难）
// rand  「随机低阶」每局次数
// low   随机能摇出的最高等级（含）
// mul   银芯倍率
// 简单档把 7、8 级几乎关掉：新手上手时最气人的就是手里凭空接到一颗诺缔拉，
// 丢下去就占掉五分之一瓶子。
// 难度主要靠「大球比例」拉开，而不是只靠警戒线 —— 实测警戒线压 2% 屏高，
// 乱投 320 颗的机器人照样不判负（球一直在被合掉，堆不上去）；真正让人手忙脚乱
// 的是手里接连来 6~8 级的球，合不掉的直接钉在瓶子里。
const DIFFS = [
  { k: 'easy', n: '简单', w: [14, 12, 10, 9, 7, 2, 1, 0.4, 0], hold: 2.6, line: 0.030, rand: 6, low: 4, mul: 0.8, tip: '球小好合，几乎不会输，适合练手' },
  { k: 'normal', n: '普通', w: [10, 9, 8, 7, 6, 1.8, 1.0, 0.5, 0.12], hold: 1.7, line: 0.050, rand: 5, low: 3, mul: 1, tip: '原始手感' },
  { k: 'hard', n: '困难', w: [7, 7.5, 8, 7.5, 7, 3.6, 3, 2, 1], hold: 1.2, line: 0.075, rand: 4, low: 3, mul: 1.6, tip: '大球更多，瓶子更矮' },
  { k: 'frenzy', n: '癫狂', w: [5, 6, 7, 8, 8.5, 5.5, 4.5, 3.2, 2], hold: 0.9, line: 0.095, rand: 3, low: 2, mul: 2.5, tip: '大球满天飞，一次失误就满瓶' },
];
const DIFF_OF = Object.fromEntries(DIFFS.map((d) => [d.k, d]));

// 分数 → 银芯的阶梯（普通难度基准，取达到的最高一档）。
// 上限没封死，但最高档 12000 分已经是「瓶子快满时还在精准消球」的水平。
const CREDIT_TIERS = [
  [150, 2], [350, 4], [700, 7], [1200, 11], [1800, 15],
  [2600, 20], [3600, 26], [5000, 33], [7000, 42], [12000, 55],
];
const creditsAt = (score) => {
  let base = 0;
  for (const [s, c] of CREDIT_TIERS) if (score >= s) base = c;
  return base;
};
// 下一档还差多少分（够到顶就没有了）
const nextTier = (score) => CREDIT_TIERS.find(([s]) => score < s) || null;

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
  score: 0, best: 0, bestAll: 0, over: false, cleared: false,
  diff: 'normal', rands: 0, gain: 0,
  danger: 0, warn: 0, approach: 0, merged: 0, finest: 0, seen: new Set([0]),
  fx: [], texts: [],
  bg: null, tiles: new Map(),
  sound: true, paused: false, started: false,
};
// 各难度各自的最高分。HUD 上的「最高」跟着当前难度走 —— 简单档刷出来的分
// 拿去跟癫狂档比没有意义，那是两个游戏。
const bestOf = { easy: 0, normal: 0, hard: 0, frenzy: 0 };
const diffOf = () => DIFF_OF[G.diff] || DIFF_OF.normal;
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
  // 结果「极稀有的大球」和「普通小球」在袋子里一样多，配置就白写了。
  // 用 ceil 而不是 round：0.12 × 4 = 0.48 会被 round 成 0，那颗球就彻底消失了；
  // 权重写 0 则表示这个等级本难度压根不投（简单档关掉 7、8 级就是靠这个）。
  diffOf().w.forEach((w, lv) => {
    if (w <= 0) return;
    for (let i = 0; i < Math.max(1, Math.ceil(w * 4)); i++) pool.push(lv);
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
  // 警戒线压在哪儿是难度的一部分：困难 / 癫狂把线往下压，瓶子能堆的高度就少一截
  G.lineY = G.top + G.H * diffOf().line;

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
  // 光晕只留很窄一圈：以前 pad 是半径的 11%，两颗球刚刚相切时两圈光晕叠在一起，
  // 看着就像球体插进了对方身体里，「碰撞体积不对」的观感一半是它给的。
  const pad = Math.max(1.5, r * 0.05);
  const px = Math.round((r + pad) * 2 * G.dpr);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const cx = px / 2;
  const R = r * G.dpr;
  const tint = LEVELS[lv].tint;

  // 外圈光环，让同尺寸的球在暗背景上浮起来
  const glow = g.createRadialGradient(cx, cx, R * 0.94, cx, cx, R + pad * G.dpr);
  glow.addColorStop(0, hexA(tint, 0.34));
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
  // 越线后能撑多久也是难度：简单档给 2.6 秒，够你连投两颗把塔顶消掉；
  // 癫狂只有 0.95 秒，看到红线的时候基本已经来不及了
  const hold = diffOf().hold;
  G.warn = clamp(G.danger / hold, 0, 1);
  syncWarn();
  if (G.danger > hold) gameOver();
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

// 硬分离：只动位置，把每对的圆心距拉到「半径和 − tol」，反复几轮直到推不动为止。
// resolve() 里的 pushK < 1 是给「软」的物理解算用的，球被挤在墙和球堆之间时
// 几轮迭代根本收敛不完，剩下的重叠就直接画在脸上了（实测最深能插进 58% 半径）。
// 这里补一脚全量的分离，重叠立刻消失；不碰速度，所以不会凭空加能量、也不会抖。
function separate(passes, tol) {
  const balls = G.balls;
  if (balls.length < 2) return;
  const clampBall = (b) => {
    if (b.x < b.r) b.x = b.r;
    else if (b.x > G.W - b.r) b.x = G.W - b.r;
    if (b.y + b.r > G.H) b.y = G.H - b.r;
    else if (b.y < b.r) b.y = b.r;
  };
  const stuck = (b, x, y) => (x < b.r - 0.01 || x > G.W - b.r + 0.01 || y > G.H - b.r + 0.01 || y < b.r - 0.01);

  for (let pass = 0; pass < passes; pass++) {
    let moved = 0;
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j];
        const rr = a.r + b.r - tol;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        let d = Math.sqrt(d2);
        let nx; let ny;
        if (d < 1e-4) { nx = 0; ny = -1; d = 0; } else { nx = dx / d; ny = dy / d; }
        const ov = rr - d;
        const wa = 1 / (a.r * a.r);
        const wb = 1 / (b.r * b.r);
        const ws = wa + wb;
        let ma = ov * (wa / ws);
        let mb = ov * (wb / ws);
        // 有一方被墙/瓶底顶住了，它那份推开量转给对面——
        // 否则两边互相顶着，推多少轮都解不开（合成出来的大球正好卡在瓶底时最明显）
        const aStuck = stuck(a, a.x - nx * ma, a.y - ny * ma);
        const bStuck = stuck(b, b.x + nx * mb, b.y + ny * mb);
        if (aStuck && !bStuck) { mb = ov; ma = 0; }
        else if (bStuck && !aStuck) { ma = ov; mb = 0; }
        a.x -= nx * ma;
        a.y -= ny * ma;
        b.x += nx * mb;
        b.y += ny * mb;
        clampBall(a);
        clampBall(b);
        moved++;
      }
    }
    if (!moved) break;
  }
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
  nb.scale = 1.12;
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

// 只留一个 toast：切难度、摇随机、合出大球都可能连着弹，
// 各弹各的会叠成三层互相盖住（连点「随机」五次尤其明显）。
let toastEl = null;
function toast(msg) {
  if (toastEl) toastEl.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  toastEl = el;
  setTimeout(() => el.classList.add('out'), 1100);
  setTimeout(() => {
    el.remove();
    if (toastEl === el) toastEl = null;
  }, 1700);
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
  const d = diffOf();
  G.danger = d.hold;
  clearWarn();

  // 纪录：本难度一份（HUD 显示）、全难度一份（账号同步 / 旧存档格式）
  if (G.score > G.best) {
    G.best = G.score;
    bestOf[d.k] = G.score;
    saveBest(d.k, G.score);
  }
  if (G.score > G.bestAll) G.bestAll = G.score;

  // 银芯：按分数取档，再乘难度倍率。先入账再弹结算，刷掉页面也不会丢。
  const base = creditsAt(G.score);
  G.gain = Math.round(base * d.mul);
  if (G.gain > 0) walletAdd(G.gain);

  beep(300, 0.16, 'sawtooth', 0.07);
  setTimeout(() => beep(190, 0.42, 'sawtooth', 0.07), 130);
  if (G.gain > 0) setTimeout(() => { beep(660, 0.12, 'sine', 0.045); beep(990, 0.16, 'sine', 0.03); }, 420);

  document.getElementById('ovk').textContent = d.n + '难度 · 瓶子满了';
  document.getElementById('ovs').textContent = G.score;
  document.getElementById('ovd').textContent = summary();
  document.getElementById('ovb').textContent =
    `${d.n}最佳 ${G.best} 分 · 钱包 ${walletGet()} 银芯`;

  // 银芯那一行：拿到了就报数，没拿到就说差多少 —— 空手而归也得知道差几步
  const cr = document.getElementById('ovc');
  if (cr) {
    const nx = nextTier(G.score);
    // 倍率写进括号里，让玩家看得见「同样是 1800 分，为什么癫狂给得多」
    const mul = d.mul === 1 ? '' : ` ×${d.mul}`;
    cr.className = 'cred' + (G.gain > 0 ? ' on' : '');
    cr.innerHTML = G.gain > 0
      ? `<b>+${G.gain}</b> 银芯${mul ? `<span>基础 ${base}${mul}</span>` : ''}`
      : nx ? `再得 <b>${nx[0] - G.score}</b> 分就能换银芯` : '本局没有银芯';
  }

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
      // 位置分离每帧做一次就够（它不是积分的一部分）：跑在软解算之后，
      // 把残留的插模彻底推开。放在这里比放进 step 里便宜一倍，画面上一模一样。
      separate(G.balls.length > 30 ? 12 : 20, 0.3);
    }

    // 合成时的弹一下
    for (const b of G.balls) {
      if (b.scale && b.scale > 1) {
        b.scale = Math.max(1, b.scale - dt * 6.5);
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
      if (G.score > G.best) {          // 本难度最高分实时跟上，不用等结束
        G.best = G.score;
        bestOf[G.diff] = G.score;
        bsEl.textContent = G.best;
        saveBest(G.diff, G.score);
      }
      if (G.score > G.bestAll) G.bestAll = G.score;
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

// 难度条与「随机低阶」按钮。两个都是本局状态的一部分，所以每次 reset 都要重画。
function paintDiff() {
  document.querySelectorAll('#diff [data-diff]').forEach((b) => {
    const on = b.dataset.diff === G.diff;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    const d = DIFF_OF[b.dataset.diff];
    b.title = `${d.n}：${d.tip}；越线 ${d.hold} 秒、银芯 ×${d.mul}、随机 ${d.rand} 次`;
  });
}

function paintRand() {
  const btn = document.getElementById('rand');
  const n = document.getElementById('randn');
  if (n) n.textContent = G.rands;
  if (btn) {
    const d = diffOf();
    btn.classList.toggle('out', G.rands <= 0);
    btn.title = `把手上这颗换成前 ${d.low + 1} 级的随机一颗（X），本局还剩 ${G.rands} 次`;
  }
}

// 换难度：投放池、警戒线、越线容忍全变了，旧球留在瓶里没有意义 —— 直接重开一局。
// 但难度条就在投球区上方，手指往上一滑就可能点到：已经打了几分的时候先要一次确认
// （3 秒内再点同一个难度才真换），免得一局白打。
let pendingDiff = null;
let pendingAt = 0;
function setDiff(k, force) {
  if (!DIFF_OF[k] || k === G.diff) return;
  if (!force && G.score > 0 && !G.over && !(pendingDiff === k && performance.now() - pendingAt < 3000)) {
    pendingDiff = k;
    pendingAt = performance.now();
    toast(`再点一次「${DIFF_OF[k].n}」就重开，这一局会清空`);
    return;
  }
  pendingDiff = null;
  G.diff = k;
  G.best = bestOf[k];
  G.lineY = G.top + G.H * diffOf().line;
  try { localStorage.setItem('zjtt:merge:diff', k); } catch { /* 无痕模式 */ }
  paintDiff();
  reset();
  toast('已切到' + diffOf().n + '难度');
}

// 随机低阶：手上卡着一颗诺缔拉（8 级）又不敢丢的时候，用它换一颗小的。
// 摇出来的等级偏向低阶（LOW_W 递减），并且保证不跟手上这颗重复 ——
// 点了按钮还拿到同一颗，玩家会以为按钮坏了。
const LOW_W = [6, 5, 4, 3, 2];
function pickLow(max) {
  let tot = 0;
  for (let i = 0; i <= max; i++) tot += LOW_W[i] || 0;
  let r = Math.random() * tot;
  for (let i = 0; i <= max; i++) {
    r -= LOW_W[i] || 0;
    if (r <= 0) return i;
  }
  return 0;
}

function reroll() {
  if (!G.started || G.over) return;
  const d = diffOf();
  if (G.rands <= 0) { toast('本局的随机次数用完了'); return; }
  let lv = pickLow(d.low);
  if (lv === G.spawnLv) lv = (lv + 1) % (d.low + 1);
  G.spawnLv = lv;
  G.rands--;
  G.seen.add(lv);
  paintRand();
  beep(720, 0.07, 'triangle', 0.05);
  setTimeout(() => beep(940, 0.09, 'sine', 0.03), 55);
  toast('换成了' + LEVELS[lv].n);
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
  G.gain = 0;
  G.rands = diffOf().rand;
  pendingDiff = null;
  G.lineY = G.top + G.H * diffOf().line;
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
  paintRand();
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
  else if (e.key === 'x' || e.key === 'X') { reroll(); e.preventDefault(); }
  else if (e.key === 'r' || e.key === 'R') { reset(); }
});

document.getElementById('again').addEventListener('click', reset);
document.getElementById('rst').addEventListener('click', () => { reset(); });
document.getElementById('diff').addEventListener('click', (e) => {
  const b = e.target.closest('[data-diff]');
  if (b) setDiff(b.dataset.diff);
});
document.getElementById('rand').addEventListener('click', reroll);
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
// zjtt:merge:best 是「全难度最高分」，不能动 —— js/account.js 的 mergeBest()
// 读的就是这个键，换名字等于把老玩家的纪录和云端同步一起丢掉。
// 各难度的单独纪录另外存 zjtt:merge:best:<难度>。
const BEST_ALL = 'zjtt:merge:best';
const bestKey = (k) => 'zjtt:merge:best:' + k;

function loadPrefs() {
  try {
    G.bestAll = parseInt(localStorage.getItem(BEST_ALL) || '0', 10) || 0;
    for (const d of DIFFS) bestOf[d.k] = parseInt(localStorage.getItem(bestKey(d.k)) || '0', 10) || 0;
    // 旧版只有一个最高分，那时的手感就是现在的普通难度：并进普通档
    if (G.bestAll > bestOf.normal) bestOf.normal = G.bestAll;
    const s = localStorage.getItem('zjtt:merge:diff');
    G.diff = DIFF_OF[s] ? s : 'normal';
    G.best = bestOf[G.diff];
    G.sound = localStorage.getItem('zjtt:merge:snd') !== '0';
  } catch { /* 无痕模式 */ }
}

function saveBest(k, v) {
  try {
    localStorage.setItem(bestKey(k), String(v));
    const all = parseInt(localStorage.getItem(BEST_ALL) || '0', 10) || 0;
    if (v > all) localStorage.setItem(BEST_ALL, String(v));
  } catch { /* 无痕模式 */ }
}

// ------------------------------------------------------------------ 银芯
// 和侦探页共用 zjtt:credits。这里不 import js/common.js —— 那一条链
// （common + i18n + auth + account）有 60 多 KB，为了写一个数字把首屏请求
// 翻几倍不值当。格式必须和 common.js 的 store.set() 完全一致（JSON.stringify），
// 否则两边会读到 NaN。
function walletGet() {
  try { return Number(JSON.parse(localStorage.getItem('zjtt:credits') || '0')) || 0; }
  catch { return 0; }
}
function walletAdd(n) {
  if (!(n > 0)) return walletGet();
  try {
    const v = Math.max(0, walletGet() + Math.round(n));
    localStorage.setItem('zjtt:credits', JSON.stringify(v));
    // 让 account.js 把这笔钱排队推上云。它监听 zjtt:dirty；没登录 / 同步件
    // 还没载入时没人听，事件白白丢掉，但本机数字是对的。
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return v;
  } catch { return walletGet(); }
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
        // 云端存的是「全难度最高分」，只有比本机所有难度都高才值得写回来
        if (b > G.bestAll) {
          G.bestAll = b;
          // 旧存档只有一档纪录，那时的手感就是现在的普通难度
          if (b > bestOf.normal) {
            bestOf.normal = b;
            saveBest('normal', b);
            if (G.diff === 'normal') { G.best = b; bsEl.textContent = b; }
          }
          if (!G.over) toast('云端的最高分 ' + b + ' 分已同步');
        } else if (G.bestAll > 0) flushBest();   // 本机更高：趁现在补推一次
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
  if (!SYNC || !SYNC.pushBest || G.bestAll <= pushedBest) return;
  pushedBest = G.bestAll;
  try {
    SYNC.pushBest(G.bestAll);
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
  paintDiff();
  layout();
  reset();
  try {
    if (!localStorage.getItem('zjtt:merge:played')) {
      localStorage.setItem('zjtt:merge:played', '1');
      setTimeout(() => toast('点一下屏幕把头像投下去，两个一样的碰在一起就合成'), 400);
      setTimeout(() => toast('手上卡着太大的球，就按「随机」换一颗小的'), 3200);
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
    window.__mergeReroll = () => reroll();
    window.__mergeDiff = (k) => setDiff(k, true);
    window.__mergeCredits = (s) => creditsAt(s);
    window.__mergeOver = (s) => { if (s != null) G.score = s; gameOver(); };
    // 按固定步长推进物理：无头环境里页面失焦后 rAF 会被限流到几 fps，
    // 实测「真实时间 39 秒、世界时间只走了 11 秒」，拿它测判负完全不可信。
    // 这里直接同步跑 step()，一局几秒就能算完。
    window.__mergeTick = (secs) => {
      const n = Math.max(1, Math.round(secs / STEP));
      for (let i = 0; i < n && !G.over; i++) {
        G.t += STEP;
        step(STEP);
        // 每 0.1 秒分离一次，贴着真实 rAF 的节奏；整段只分一次的话
        // 球会叠出几十像素的「假穿透」，测出来的数没法看
        if (i % 12 === 11) separate(16, 0.3);
      }
      separate(20, 0.3);
      return { over: G.over, danger: +G.danger.toFixed(2), balls: G.balls.length, score: G.score };
    };
    // 抽样投放池：临时把 G.drops 顶到开局保护之后，否则前 5 颗全是小球，看不出分布
    window.__mergeSample = (n) => {
      const d0 = G.drops;
      G.drops = 999;
      resetSpawn();
      const c = new Array(LEVELS.length).fill(0);
      for (let i = 0; i < n; i++) c[pickSpawn()]++;
      G.drops = d0;
      resetSpawn();
      return c;
    };
  }
}

// 头像全是 data URI，正常情况 decode 一两帧就完。但 decode() 在后台标签页、
// 内存紧张、或者图片已经 complete 而 onload 早错过的情况下，Promise 可能永远
// 不 resolve —— 页面就卡在「正在载入」里，什么都点不动（实测在无头环境里必现）。
// 所以这里不把「全部就绪」当硬条件：能等就等，等不到 1.2 秒也照样开局，
// 顶多第一帧的头像空一下，下一帧 tileFor() 重画就有了。
let booted = false;
const start = () => { if (booted) return; booted = true; boot(); };

const readyOne = (im) => new Promise((r) => {
  if (im.complete) { r(); return; }
  im.onload = im.onerror = r;
  if (im.decode) im.decode().then(r, r);
});
Promise.race([
  Promise.all(IMG.map(readyOne)),
  new Promise((r) => setTimeout(r, 1200)),
]).then(start, start);

// 载入慢的时候给句话，别让人对着空白等
setTimeout(() => {
  const t = document.getElementById('bootText');
  if (t && !G.started) t.textContent = '还在载入头像…（首次访问会慢一些）';
}, 5000);
