// 《忘却协议》绘制层：六边形棋盘、地形、唤醒体立绘、影怪、弹道、特效、飘字。
//
// 坐标系是「逻辑单位」：棋盘宽 BOARD_W、每格 HEX_W 宽，跟屏幕分辨率无关。
// 每帧把 canvas 的变换矩阵一次性设成 逻辑 → 设备像素，后面所有绘制都直接写逻辑坐标，
// 缩放、居中、DPR 都由这一个矩阵负责。
//
// 立绘全部来自一张图集（js/pf/gen.js 里的 SHEET，构建时内联的 data URI），
// 待机循环 + 打击动作都按帧矩形取，所以整局零图片请求。
//
// 动画分两层：位置/状态由 engine 推进（G.t、u.atkAnim、u.hurtT…），
// 表现层只负责把这些数翻译成位移、缩放、粒子。粒子（spark）的轨迹在渲染时按
// f.t 解析算，不占 engine 的每帧循环。

import { G, lanePath } from './engine.js';
import { ART, SHEET } from './gen.js';
import {
  COLS, ROWS, CELLS, HEX_W, HEX_H, R, ROW_PITCH, BOARD_W, BOARD_H,
  CORE_X, SPAWN_X, DEPLOY_COLS, cellXY, cellOf, colOf, rowOf, STAR_NAME,
  REALM_COLOR, ROLE_COLOR, TERRAIN, ENEMY,
} from './defs.js';
import { unitAt } from './engine.js';

let cv = null;
let ctx = null;
let img = null;
let dpr = 1;

// 逻辑视口：左边界要容下协议核心，右边界要给敌人出生留空间
let LX0 = -170;
let LX1 = BOARD_W + 96;
let LW = LX1 - LX0;
// 纵向也要给第一排留出「头顶」的空间：立绘比格子高得多，不留就会被顶栏切掉
const LY0 = -132;
const LY1 = BOARD_H + 54;
const LH = LY1 - LY0;

let view = { s: 1, ox: 0, oy: 0 };
let band = { x: 0, y: 0, w: 0, h: 0 };

export const hover = { cell: -1, x: 0, y: 0 };

export function init(canvas) {
  cv = canvas;
  ctx = canvas.getContext('2d');
  img = new Image();
  img.decoding = 'async';
  img.src = SHEET;
  return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
}

// 可用区域：顶栏与商店之间的那条带子。界面层在布局变化后调一次就行。
export function setBand(x, y, w, h) {
  band = { x, y, w, h };
  fit();
}

function fit() {
  dpr = Math.min(2.5, window.devicePixelRatio || 1);
  const w = cv.clientWidth || window.innerWidth;
  const h = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const bw = band.w || w;
  const bh = band.h || h;
  const bx = band.w ? band.x : 0;
  const by = band.h ? band.y : 0;
  // 窄屏（手机）把核心与出怪的留白收紧，否则棋盘会被压成一条；
  // 宽屏则是因为左侧有 DOM 信息面板（#side）在显示核心与波次，画布上不必再画一遍环
  const narrow = bw < 620;
  const wide = window.innerWidth >= 1000;
  narrowView = narrow;
  PAD_R = narrow ? 96 : 168;
  // PAD_R 必须留住 96：敌人出生点是 SPAWN_X = BOARD_W + 96，再窄影怪就飘到板子外了
  LX0 = narrow || wide ? -30 : -170;
  LX1 = BOARD_W + PAD_R + 6;
  LW = LX1 - LX0;
  const s = Math.min(bw / LW, bh / LH);
  view = {
    s,
    ox: bx + (bw - LW * s) / 2 - LX0 * s,
    oy: by + (bh - LH * s) / 2 - LY0 * s,
  };
}

export function layout() { fit(); }

// 屏幕坐标 → 逻辑坐标
export function toLogic(clientX, clientY) {
  const r = cv.getBoundingClientRect();
  return { x: (clientX - r.left - view.ox) / view.s, y: (clientY - r.top - view.oy) / view.s };
}

// ---------------------------------------------------------------- 小工具
const IMG = () => img;

function hexPath(x, y, w) {
  const h = w / Math.sqrt(3);         // 半高 = R = w/√3
  ctx.beginPath();
  ctx.moveTo(x, y - h);
  ctx.lineTo(x + w / 2, y - h / 2);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y - h / 2);
  ctx.closePath();
}

function sprite(rect, cx, by, h, flip) {
  const im = IMG();
  if (!im || !im.complete || !rect) return;
  const w = h * (rect[2] / rect[3]);
  const x = cx - w / 2;
  const y = by - h;
  if (flip) {
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(im, rect[0], rect[1], rect[2], rect[3], -w / 2, y, w, h);
    ctx.restore();
  } else {
    ctx.drawImage(im, rect[0], rect[1], rect[2], rect[3], x, y, w, h);
  }
}

// 帧动画：待机循环走帧间隔，打击只播一次（由 engine 的 atkAnim 计时驱动）
function unitFrame(u) {
  const a = ART.anims[u.id];
  if (!a) return null;
  if (u.atkAnim > 0) {
    const list = a.attack.f;
    const dur = u.atkDur || 0.42;
    const prog = 1 - u.atkAnim / dur;
    const i = Math.min(list.length - 1, Math.max(0, Math.floor(prog * list.length)));
    return list[i];
  }
  const list = a.idle.f;
  const d = (a.idle.d || 220) / 1000;
  const i = Math.floor((G.t || 0) / d) % list.length;
  return list[i];
}

// ---------------------------------------------------------------- 背景
let bgCache = null;
function background() {
  const w = cv.clientWidth || 1;
  const h = cv.clientHeight || 1;
  if (bgCache && bgCache.width === w && bgCache.height === h) return bgCache;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w / 2));
  c.height = Math.max(1, Math.round(h / 2));
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, c.height);
  grd.addColorStop(0, '#0b0f18');
  grd.addColorStop(0.55, '#080b12');
  grd.addColorStop(1, '#0b0d15');
  g.fillStyle = grd;
  g.fillRect(0, 0, c.width, c.height);
  // 一点星尘，避免大片纯色
  let sd = 20261029;
  const rr = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  for (let i = 0; i < 120; i++) {
    const x = rr() * c.width, y = rr() * c.height, r = rr() * 1.4 + 0.3;
    g.fillStyle = `rgba(140,170,230,${0.03 + rr() * 0.07})`;
    g.beginPath(); g.arc(x, y, r, 0, 6.284); g.fill();
  }
  bgCache = c;
  return c;
}

// ---------------------------------------------------------------- 主绘制
export function draw() {
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  const bg = background();
  ctx.drawImage(bg, 0, 0, cv.width / dpr, cv.height / dpr);

  // 震屏：整体抖一点点，只在有大招/首领倒下时出现
  let sx = 0;
  let sy = 0;
  if (G.shake > 0.1) {
    const k = G.shake;
    sx = (Math.random() - 0.5) * k;
    sy = (Math.random() - 0.5) * k;
  }
  ctx.setTransform(view.s * dpr, 0, 0, view.s * dpr, (view.ox + sx) * dpr, (view.oy + sy) * dpr);
  drawGlow();
  drawBoard();
  if (LX0 < -100) drawCore();
  drawIntent();
  drawRange();
  drawUnits();
  drawEnemies();
  drawShots();
  drawFx();
  drawFloats();
}

// 备战期的「怪物意图」：把下一波会走的路线画成流动虚线，入口格标出来的是什么怪、几只。
// 玩家因此能在开战前决定「哪条通道要先堵」——这正是自走棋里最该提前知道的信息。
function drawIntent() {
  if (G.phase !== 'prep' || !G.plan || !G.plan.length) return;
  const lanes = new Map();
  for (const p of G.plan) {
    if (!lanes.has(p.row)) lanes.set(p.row, []);
    lanes.get(p.row).push(p);
  }
  const t = G.t || 0;
  for (const [row, items] of lanes) {
    const path = lanePath(row);
    // 路线
    ctx.save();
    ctx.strokeStyle = 'rgba(200,140,240,0.34)';
    ctx.lineWidth = 2.6;
    ctx.setLineDash([7, 10]);
    ctx.lineDashOffset = -t * 20;
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const q = cellXY(path[i]);
      if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.restore();

    // 按种类统计，最多画两种小头像，剩下的并进数字
    const counts = new Map();
    for (const it of items) counts.set(it.key, (counts.get(it.key) || 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const ent = cellXY(path[0]);
    const n = items.length;
    // 入口格上一块半透明底，把「这里要来」标清楚
    ctx.save();
    hexPath(ent.x, ent.y, HEX_W - 5);
    ctx.fillStyle = 'rgba(176,107,217,0.16)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,140,240,0.55)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    const h = n > 3 ? 40 : 46;
    const dxs = top.length > 1 ? [-13, 13] : [0];
    for (let i = 0; i < top.length; i++) {
      const def = ENEMY[top[i][0]];
      const rec = ART.mobs[def.art];
      if (rec) sprite(rec.r, ent.x + dxs[i], ent.y + 22, h, true);
    }
    ctx.font = '700 12px system-ui,"PingFang SC",sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(226,196,255,0.95)';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${n}`, ent.x + HEX_W * 0.42, ent.y - HEX_H * 0.30);
    ctx.restore();
  }
}

// 射程：选中的唤醒体（或手上有待放下的）把攻击范围画出来。
// 在场上就是它自己的位置；在备战席 / 刚选中还没落子时，按鼠标悬停的那一格预览。
function drawRange() {
  const u = G.sel != null ? G.units.find((x) => x.uid === G.sel) : null;
  if (!u) return;
  let at = -1;
  if (u.cell >= 0) at = u.cell;
  else if (hover.cell >= 0 && colOf(hover.cell) < DEPLOY_COLS && G.terrain[hover.cell] !== 'rock') {
    at = hover.cell;
  }
  if (at < 0) return;
  const p = cellXY(at);
  const r = u.range;
  ctx.save();
  boardPanel();
  ctx.clip();
  const g = ctx.createRadialGradient(p.x, p.y, r * 0.15, p.x, p.y, r);
  g.addColorStop(0, 'rgba(110,168,255,0.22)');
  g.addColorStop(0.72, 'rgba(110,168,255,0.09)');
  g.addColorStop(1, 'rgba(110,168,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, 6.284);
  ctx.fill();
  // 射程内的格子描个边，六边形画法比一个圆更像「格子范围」
  for (let c = 0; c < CELLS; c++) {
    const q = cellXY(c);
    if (Math.hypot(q.x - p.x, q.y - p.y) > r) continue;
    hexPath(q.x, q.y, HEX_W - 8);
    ctx.strokeStyle = 'rgba(130,190,255,0.34)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -(G.t || 0) * 26;
  ctx.strokeStyle = 'rgba(140,200,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, 6.284);
  ctx.stroke();
  ctx.restore();
}

// 地格上的小图形：不用字体（图集外的字体在小字号下会糊），全用线条画
function terrainMark(type, x, y) {
  ctx.save();
  ctx.strokeStyle = TERRAIN[type].col;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = 0.75;
  if (type === 'high') {
    // 两道向上的箭头 = 抬高的台子
    for (let i = 0; i < 2; i++) {
      const oy = y + 4 - i * 7;
      ctx.beginPath();
      ctx.moveTo(x - 7, oy + 4);
      ctx.lineTo(x, oy - 2);
      ctx.lineTo(x + 7, oy + 4);
      ctx.stroke();
    }
  } else if (type === 'altar') {
    const t = (G.t || 0) * 0.9;
    ctx.beginPath(); ctx.arc(x, y, 8, 0, 6.284); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = t + i * Math.PI / 2;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 2, 0, 6.284);
      ctx.stroke();
    }
  } else if (type === 'rift') {
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 6);
    ctx.lineTo(x - 1, y - 1);
    ctx.lineTo(x + 5, y - 3);
    ctx.lineTo(x + 8, y + 6);
    ctx.moveTo(x - 4, y + 3);
    ctx.lineTo(x + 1, y + 5);
    ctx.stroke();
  }
  ctx.restore();
}

// 战场板子的左右留白不对称：右边要把「怪走过来的那条路」也框进去，
// 否则影怪会飘在板子外面，看着像画漏了。
const PAD_L = 26;
let PAD_R = 168;      // 窄屏会收窄（见 fit）
const PAD_Y = 26;
// 窄屏（手机竖屏）宽高比太扁，横向一寸都不能浪费：核心环不画（顶栏那条核心血条
// 已经在显示同一个数），左边只留板子自身的 PAD_L。判断只在 fit() 里做一次。
let narrowView = false;

function boardPanel() {
  const x0 = -PAD_L;
  const y0 = -PAD_Y;
  const w = BOARD_W + PAD_L + PAD_R;
  const h = BOARD_H + PAD_Y * 2;
  const rad = 24;
  ctx.beginPath();
  ctx.moveTo(x0 + rad, y0);
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, rad);
  ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, rad);
  ctx.arcTo(x0, y0 + h, x0, y0, rad);
  ctx.arcTo(x0, y0, x0 + w, y0, rad);
  ctx.closePath();
}

// 棋盘外的一层冷光：竖屏时上下留白很大，没有这层会显得画面没画满
function drawGlow() {
  const cx = BOARD_W / 2;
  const cy = BOARD_H / 2;
  const g = ctx.createRadialGradient(cx, cy, 60, cx, cy, BOARD_W * 0.95);
  g.addColorStop(0, 'rgba(70,110,190,0.16)');
  g.addColorStop(0.55, 'rgba(60,90,160,0.07)');
  g.addColorStop(1, 'rgba(40,60,120,0)');
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(-BOARD_W, -BOARD_H, BOARD_W * 3, BOARD_H * 3);
  ctx.restore();
}

function drawBoard() {
  // 棋盘底：一块带内发光的暗板
  const x0 = -PAD_L;
  const y0 = -PAD_Y;
  const w = BOARD_W + PAD_L + PAD_R;
  const h = BOARD_H + PAD_Y * 2;
  ctx.save();
  boardPanel();
  const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
  g.addColorStop(0, 'rgba(22,29,46,0.86)');
  g.addColorStop(0.5, 'rgba(15,20,32,0.80)');
  g.addColorStop(1, 'rgba(20,16,30,0.86)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(96,130,196,0.30)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 顶部一道细高光，让板子有点厚度
  ctx.beginPath();
  ctx.moveTo(x0 + 24, y0 + 1);
  ctx.lineTo(x0 + w - 24, y0 + 1);
  ctx.strokeStyle = 'rgba(150,190,255,0.14)';
  ctx.stroke();
  ctx.restore();

  const self = G.phase === 'prep';
  const T = G.terrain || {};
  for (let c = 0; c < CELLS; c++) {
    const p = cellXY(c);
    const col = colOf(c);
    const mine = col < DEPLOY_COLS;
    const occ = unitAt(c);
    const isHover = hover.cell === c;
    const t = T[c];
    // 手里拿着人时，能落子的格子要亮出来
    const pickable = self && mine && t !== 'rock' && (G.sel == null || !occ || occ.uid === G.sel);
    hexPath(p.x, p.y, HEX_W - 5);
    if (t === 'rock') {
      ctx.fillStyle = 'rgba(44,48,60,0.92)';
    } else if (occ) {
      ctx.fillStyle = 'rgba(34,50,78,0.92)';
    } else if (t) {
      ctx.fillStyle = 'rgba(30,42,66,0.62)';
    } else if (mine) {
      ctx.fillStyle = self ? 'rgba(38,56,88,0.58)' : 'rgba(30,42,64,0.42)';
    } else {
      ctx.fillStyle = 'rgba(26,20,38,0.55)';
    }
    ctx.fill();
    if (t && t !== 'rock') {
      ctx.save();
      ctx.fillStyle = TERRAIN[t].col;
      ctx.globalAlpha = occ ? 0.10 : 0.16;
      ctx.fill();
      ctx.restore();
    }
    if (pickable && G.sel != null) {
      ctx.fillStyle = 'rgba(110,168,255,0.10)';
      ctx.fill();
    }
    ctx.lineWidth = isHover && pickable ? 2.4 : pickable && G.sel != null ? 1.6 : 1.2;
    ctx.strokeStyle = isHover && pickable
      ? 'rgba(110,168,255,0.95)'
      : pickable && G.sel != null ? 'rgba(110,168,255,0.55)'
        : t === 'rock' ? 'rgba(130,140,165,0.45)'
          : mine ? 'rgba(96,130,190,0.42)' : 'rgba(120,80,150,0.30)';
    ctx.stroke();

    if (t) {
      if (t === 'rock') drawRock(p.x, p.y);
      else if (!occ) terrainMark(t, p.x, p.y + HEX_H * 0.16);
      else terrainMark(t, p.x + HEX_W * 0.30, p.y + HEX_H * 0.30);
    }
  }

  // 敌阵方向：右侧几列画一道竖虚线 + 一层紫雾，提示「怪从那边来」
  ctx.save();
  const edge = cellXY(cellOf(0, 0)).y;
  const edgeB = cellXY(cellOf(0, ROWS - 1)).y;
  const ex = HEX_W * DEPLOY_COLS + HEX_W * 0.5 + HEX_W / 2;
  // 紫雾要裁在棋盘板子里，否则会糊出一块硬边矩形
  boardPanel();
  ctx.clip();
  const fog = ctx.createLinearGradient(ex, 0, BOARD_W + PAD_R, 0);
  fog.addColorStop(0, 'rgba(176,107,217,0)');
  fog.addColorStop(1, G.phase === 'fight' ? 'rgba(176,107,217,0.26)' : 'rgba(176,107,217,0.10)');
  ctx.fillStyle = fog;
  ctx.fillRect(ex, -PAD_Y, BOARD_W + PAD_R - ex, BOARD_H + PAD_Y * 2);
  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = 'rgba(176,107,217,0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(ex, edge - HEX_H * 0.42);
  ctx.lineTo(ex, edgeB + HEX_H * 0.42);
  ctx.stroke();
  ctx.restore();

  // 通道箭头：四条通道的入口各画一个向左的箭头，备战期慢慢淡入淡出
  if (G.phase === 'prep') {
    const k = 0.30 + 0.16 * Math.sin((G.t || 0) * 1.8);
    ctx.save();
    ctx.strokeStyle = `rgba(196,132,232,${k})`;
    ctx.lineWidth = 2.4;
    for (let r = 0; r < ROWS; r++) {
      const q = cellXY(cellOf(0, r));
      const ax = BOARD_W + PAD_R - 30;
      ctx.beginPath();
      ctx.moveTo(ax + 18, q.y - 11);
      ctx.lineTo(ax, q.y);
      ctx.lineTo(ax + 18, q.y + 11);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// 岩壁：三块石头叠起来，占住这一格
function drawRock(x, y) {
  ctx.save();
  const base = y + HEX_H * 0.22;
  ctx.fillStyle = 'rgba(18,20,28,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, base, HEX_W * 0.30, HEX_W * 0.10, 0, 0, 6.284);
  ctx.fill();
  const rock = (cx, cy, w, h, dark) => {
    ctx.beginPath();
    ctx.moveTo(cx - w, cy);
    ctx.lineTo(cx - w * 0.45, cy - h);
    ctx.lineTo(cx + w * 0.35, cy - h * 0.92);
    ctx.lineTo(cx + w, cy);
    ctx.closePath();
    ctx.fillStyle = dark ? '#4b5162' : '#5c6377';
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,172,196,0.45)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  };
  rock(x + HEX_W * 0.10, base - 2, HEX_W * 0.24, HEX_H * 0.42, true);
  rock(x - HEX_W * 0.14, base - 1, HEX_W * 0.20, HEX_H * 0.30, false);
  rock(x + HEX_W * 0.02, base - 1, HEX_W * 0.14, HEX_H * 0.20, false);
  ctx.restore();
}

function drawCore() {
  const cy = (cellXY(cellOf(0, 0)).y + cellXY(cellOf(0, ROWS - 1)).y) / 2;
  // 左侧留白很窄：核心整体缩小，数值直接写在环里，文字标签交给顶栏
  const room = -LX0 - 18;
  const k = Math.max(0.44, Math.min(0.64, room / 150));
  const x = LX0 + 12 + 74 * k;
  const pulse = 0.5 + 0.5 * Math.sin((G.t || 0) * 2.2);
  const ratio = G.core / G.coreMax;
  const danger = ratio <= 0.34;
  const col = danger ? '232,105,95' : '110,168,255';
  ctx.save();
  // 光柱
  const g = ctx.createRadialGradient(x, cy, 4, x, cy, 118 * k);
  g.addColorStop(0, `rgba(${col},${0.28 + pulse * 0.18})`);
  g.addColorStop(1, `rgba(${col},0)`);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, cy, 118 * k, 0, 6.284); ctx.fill();

  // 核心本体：两圈六边形
  hexPath(x, cy, 74 * k);
  ctx.fillStyle = 'rgba(16,26,44,0.92)';
  ctx.fill();
  ctx.strokeStyle = danger ? 'rgba(232,105,95,0.85)' : 'rgba(110,168,255,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  hexPath(x, cy, 52 * k);
  ctx.strokeStyle = danger
    ? `rgba(255,160,150,${0.42 + pulse * 0.4})`
    : `rgba(150,205,255,${0.42 + pulse * 0.4})`;
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 内圈刻度：核心血量的分格（20 格，掉一格看得见）
  const seg = 20;
  for (let i = 0; i < seg; i++) {
    const a = -Math.PI / 2 + (i / seg) * 6.284;
    const on = i / seg < ratio;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 30 * k, cy + Math.sin(a) * 30 * k);
    ctx.lineTo(x + Math.cos(a) * 40 * k, cy + Math.sin(a) * 40 * k);
    ctx.strokeStyle = on
      ? (danger ? 'rgba(255,150,140,0.9)' : 'rgba(150,205,255,0.85)')
      : 'rgba(90,110,140,0.26)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(x, cy, (11 + pulse * 2.5) * k, 0, 6.284);
  ctx.fillStyle = danger
    ? `rgba(255,200,190,${0.55 + pulse * 0.35})`
    : `rgba(190,225,255,${0.55 + pulse * 0.35})`;
  ctx.fill();
  // 数字写在环里，省掉外面的文字标签
  ctx.fillStyle = danger ? 'rgba(255,205,196,0.98)' : 'rgba(226,238,255,0.96)';
  ctx.font = `700 ${Math.round(15 * k + 8)}px system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(G.core), x, cy + 40 * k + 12);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function starPips(x, y, star) {
  ctx.save();
  ctx.font = '11px system-ui,sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e3b341';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 3;
  ctx.fillText(STAR_NAME[star], x, y);
  ctx.restore();
}

function hpBar(x, y, w, h, ratio, col, shieldRatio) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,9,14,0.82)';
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = col;
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, ratio)), h);
  // 血条顶部一道高光，别看起来像纯色条
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, ratio)), Math.max(1, h * 0.34));
  if (shieldRatio > 0) {
    ctx.fillStyle = 'rgba(140,200,255,0.9)';
    ctx.fillRect(x - w / 2, y, w * Math.min(1, shieldRatio), h);
  }
  ctx.restore();
}

// 叠层小徽章：击杀叠加、创口这类「越打越强 / 越打越脆」的效果，把当前层数直接画出来
function stackBadge(x, y, label, col, bg) {
  ctx.save();
  ctx.font = '700 10px system-ui,"PingFang SC",sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = Math.max(20, ctx.measureText(label).width + 12);
  const h = 14;
  ctx.fillStyle = bg;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  const r = 7;
  ctx.beginPath();
  ctx.moveTo(x - w / 2 + r, y - h / 2);
  ctx.lineTo(x + w / 2 - r, y - h / 2);
  ctx.quadraticCurveTo(x + w / 2, y - h / 2, x + w / 2, y - h / 2 + r);
  ctx.lineTo(x + w / 2, y + h / 2 - r);
  ctx.quadraticCurveTo(x + w / 2, y + h / 2, x + w / 2 - r, y + h / 2);
  ctx.lineTo(x - w / 2 + r, y + h / 2);
  ctx.quadraticCurveTo(x - w / 2, y + h / 2, x - w / 2, y + h / 2 - r);
  ctx.lineTo(x - w / 2, y - h / 2 + r);
  ctx.quadraticCurveTo(x - w / 2, y - h / 2, x - w / 2 + r, y - h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = col;
  ctx.fillText(label, x, y + 0.5);
  ctx.restore();
}

// 脚下两个小方块：左边命轮、右边造物，有就给对应颜色
function equipPips(x, y, u) {
  const dots = [];
  if (u.wheel) dots.push(u.wheel.realm ? REALM_COLOR[u.wheel.realm] : '#e3b341');
  if (u.creation) dots.push('#b06bd9');
  if (!dots.length) return;
  ctx.save();
  for (let i = 0; i < dots.length; i++) {
    ctx.fillStyle = dots[i];
    ctx.globalAlpha = 0.92;
    ctx.fillRect(x - 5 + i * 6, y, 4, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x - 5 + i * 6, y, 4, 4);
  }
  ctx.restore();
}

function drawUnits() {
  const list = G.units.filter((u) => u.cell >= 0).sort((a, b) => cellXY(a.cell).y - cellXY(b.cell).y);
  for (const u of list) {
    const p = cellXY(u.cell);
    const by = p.y + HEX_H * 0.30;
    const h = HEX_H * 1.12 * (1 + (u.star - 1) * 0.05);
    const dead = u.hp <= 0;
    const t = G.t || 0;

    // 选中/悬停的底座光环
    const sel = G.sel === u.uid;
    if (sel) {
      hexPath(p.x, p.y, HEX_W - 8);
      ctx.strokeStyle = 'rgba(255,224,102,0.95)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
    }
    // 大招就绪：脚下金色脉冲
    if (!dead && u.ult >= 99) {
      const k = 0.5 + 0.5 * Math.sin(t * 6);
      hexPath(p.x, p.y, HEX_W - 14);
      ctx.strokeStyle = `rgba(255,224,102,${0.35 + k * 0.45})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }

    // 脚下阴影：跳/冲的时候收一点
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(p.x, by - 6, HEX_W * 0.30, HEX_W * 0.11, 0, 0, 6.284);
    ctx.fill();
    ctx.restore();

    // 立绘：打击时朝目标方向小幅前冲；站着时轻微呼吸
    let lunge = 0;
    let lean = 0;
    let lift = 0;
    if (u.atkAnim > 0) {
      const k = 1 - u.atkAnim / (u.atkDur || 0.42);
      lunge = Math.sin(k * Math.PI) * 11;
      lean = Math.sin(k * Math.PI) * 0.06;
      lift = -Math.sin(k * Math.PI) * 4;
    } else if (!dead) {
      lift = Math.sin(t * 1.7 + u.uid) * 1.4;
    }
    ctx.save();
    ctx.translate(p.x, by);
    ctx.rotate(lean);
    ctx.translate(lunge, lift);
    if (dead) {
      ctx.globalAlpha = 0.28;
      ctx.translate(0, 6);
    } else if (u.hurtT > 0) {
      ctx.filter = 'brightness(1.9) saturate(0.6)';
    } else if (u.shield > 0) {
      ctx.filter = 'drop-shadow(0 0 6px rgba(120,180,255,.8))';
    }
    sprite(unitFrame(u), 0, 0, h, false);
    ctx.filter = 'none';
    ctx.restore();

    // 血条 + 星阶 + 狂气
    const bx = p.x;
    const bYy = by - h - 12;
    if (!dead) {
      const r = u.hp / u.hpMax;
      hpBar(bx, bYy, 46, 5, r, r > 0.5 ? '#6bd08a' : r > 0.25 ? '#e3b341' : '#e8695f', u.shield / u.hpMax);
      starPips(bx, bYy - 7, u.star);
      const ultReady = u.ult >= 99;
      ctx.fillStyle = 'rgba(6,9,14,0.75)';
      ctx.fillRect(bx - 23, bYy + 6, 46, 2.5);
      ctx.fillStyle = ultReady ? '#ffe066' : 'rgba(176,107,217,0.95)';
      ctx.fillRect(bx - 23, bYy + 6, 46 * Math.min(1, u.ult / 100), 2.5);
    }
    equipPips(p.x, by - 2, u);
    // 击杀叠加（红宝石胸针 / 吞噬流派）：层数直接标在头顶，不然只能看攻击力猜
    if (!dead && u.killAtkStep > 0 && u.killAtkMax > 0) {
      stackBadge(p.x + 22, by - h - 26, `叠 ${u.killStacks}/${u.killAtkMax}`, '#ff9d9d', 'rgba(56,12,12,0.86)');
    }
  }
}

function drawEnemies() {
  const list = G.enemies.slice().sort((a, b) => a.y - b.y);
  for (const e of list) {
    const rec = ART.mobs[e.def.art];
    if (!rec) continue;
    const h = 88 * e.size;
    // 走路时上下起伏一点，静止的一排立绘看起来像贴纸
    const bob = Math.sin((G.t || 0) * 8 + e.x * 0.05) * (e.target ? 0.6 : 2.2);
    // 挨打时往后挫一下，比单纯变亮更有打击感
    const knock = e.hurtT > 0 ? (e.hurtT / 0.16) * 5 : 0;
    const by = e.y + 26 + bob;
    ctx.save();
    // 影子
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(e.x + knock, by - 4, 26 * e.size, 8 * e.size, 0, 0, 6.284);
    ctx.fill();
    if (e.stunT > 0) ctx.filter = 'grayscale(0.5) brightness(0.8)';
    else if (e.hurtT > 0) ctx.filter = 'brightness(2.1) saturate(1.4)';
    sprite(rec.r, e.x + knock, by, h, true);
    ctx.filter = 'none';
    ctx.restore();

    if (e.stunT > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(140,203,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x + knock, by - h * 0.66, 12, 0, 6.284);
      ctx.stroke();
      // 星星绕圈
      const a0 = (G.t || 0) * 3;
      ctx.fillStyle = 'rgba(180,220,255,0.9)';
      for (let i = 0; i < 3; i++) {
        const a = a0 + i * 2.09;
        ctx.beginPath();
        ctx.arc(e.x + knock + Math.cos(a) * 13, by - h * 0.66 + Math.sin(a) * 5, 2, 0, 6.284);
        ctx.fill();
      }
      ctx.restore();
    }
    // 血条
    const w = e.def.cls === 'Boss' ? 68 : 34;
    hpBar(e.x + knock, by - h - 8, w, e.def.cls === 'Boss' ? 6 : 4, e.hp / e.hpMax,
      e.def.cls === 'Boss' ? '#ff5c5c' : e.def.cls === '精英' ? '#ffa45c' : '#e8695f', 0);
    if (e.wound > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(176,107,217,0.95)';
      const n = Math.min(8, e.wound);
      for (let i = 0; i < n; i++) {
        ctx.fillRect(e.x + knock - 4 + i * 5, by - h - 14, 3, 2.5);
      }
      // 创口层数：格子最多画 8 个，数字补上，一眼知道还差几层满
      ctx.font = '700 9.5px system-ui,"PingFang SC",sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(211,164,242,0.95)';
      ctx.shadowColor = 'rgba(0,0,0,0.85)';
      ctx.shadowBlur = 2;
      ctx.fillText('×' + e.wound, e.x + knock - 4 + n * 5 + 3, by - h - 11);
      ctx.restore();
    }
    if (e.def.cls === 'Boss') {
      ctx.save();
      ctx.font = '600 11px system-ui,"PingFang SC",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,200,200,0.9)';
      ctx.fillText(e.def.n, e.x + knock, by - h - 20);
      ctx.restore();
    }
  }
}

function drawShots() {
  for (const s of G.shots) {
    const k = s.t / s.d;
    const x = s.x + (s.tx - s.x) * k;
    const y = s.y + (s.ty - s.y) * k;
    ctx.save();
    // 拖尾：沿路径往回画三个越来越淡的点
    for (let i = 1; i <= 3; i++) {
      const kk = Math.max(0, k - i * 0.11);
      const tx = s.x + (s.tx - s.x) * kk;
      const ty = s.y + (s.ty - s.y) * kk;
      ctx.globalAlpha = 0.42 / i;
      ctx.fillStyle = s.col;
      ctx.beginPath(); ctx.arc(tx, ty, 2.6 - i * 0.5, 0, 6.284); ctx.fill();
    }
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = s.col;
    ctx.shadowColor = s.col;
    ctx.shadowBlur = 9;
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.284); ctx.fill();
    ctx.restore();
  }
}

function drawFx() {
  for (const f of G.fx) {
    const k = f.t / f.d;
    ctx.save();
    if (f.k === 'ring') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col;
      ctx.lineWidth = 2.6 * (1 - k) + 0.8;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * (0.35 + k * 0.9), 0, 6.284);
      ctx.stroke();
    } else if (f.k === 'slash') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = f.col;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 16, -0.9 + k * 0.6, 0.5 + k * 0.6);
      ctx.stroke();
    } else if (f.k === 'spark') {
      // 火花：位置按 t 解析算（不占 engine 每帧循环）
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = f.col;
      const x = f.x + f.vx * f.t;
      const y = f.y + f.vy * f.t + 260 * f.t * f.t;
      ctx.beginPath(); ctx.arc(x, y, f.r * (1 - k * 0.6), 0, 6.284); ctx.fill();
    } else if (f.k === 'ult') {
      drawUltStart(f, k);
    } else if (f.k === 'beam') {
      drawBeam(f, k);
    } else if (f.k === 'blast') {
      drawBlast(f, k);
    } else if (f.k === 'shield') {
      drawShield(f, k);
    } else if (f.k === 'gust') {
      drawGust(f, k);
    } else if (f.k === 'shock') {
      drawShock(f, k);
    } else if (f.k === 'bloom') {
      drawBloom(f, k);
    }
    ctx.restore();
  }
}

// ---- 六种大招的专属特效 -------------------------------------------------
// 共同的取舍：全部按 f.t 解析算位置，不往 engine 里塞每帧循环的东西；
// 都在 0.6~0.9 秒内收干净，二十个人同时放也不会糊成一团。

// 起手：脚下升起一道收束的光柱，外圈再扩一圈 —— 用颜色区分技能（落雷黄、护罩蓝…）
function drawUltStart(f, k) {
  // 光柱不能窜出棋盘：窜出去会画到页面底色上，看着像贴纸没贴住
  const top = Math.max(f.y - f.r * 1.75, -PAD_Y + 4);
  const h = f.y - top;
  const w = f.r * 0.3 * (1 - k * 0.55);
  // 起手光柱用流派本色收尾：白色打头会显得灰，六种大招一开局就分不出来。
  // 走 'lighter' 叠加而不是普通 alpha：淡黄 #ffe066 用 alpha 叠在深色底上会脱色成灰，
  // 加法混合才能保住颜色（这也是「光」该有的行为）。
  const g = ctx.createLinearGradient(0, f.y - h, 0, f.y);
  g.addColorStop(0, hexA(f.col, 0));
  g.addColorStop(0.45, hexA(f.col, 0.22 * (1 - k)));
  g.addColorStop(1, hexA(f.col, 0.55 * (1 - k)));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1 - k * k;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(f.x - w * 0.35, f.y);
  ctx.lineTo(f.x - w, f.y - h);
  ctx.lineTo(f.x + w, f.y - h);
  ctx.lineTo(f.x + w * 0.35, f.y);
  ctx.closePath();
  ctx.fill();
  // 柱脚压一条亮边，把「从哪儿冒出来的」定住
  ctx.globalAlpha = (1 - k) * 0.9;
  ctx.fillStyle = hexA(f.col, 0.9);
  ctx.fillRect(f.x - w * 0.5, f.y - 3, w, 3);
  ctx.strokeStyle = hexA(f.col, 0.85 * (1 - k));
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(f.x, f.y, f.r * (0.3 + k * 0.9), f.r * (0.11 + k * 0.34), 0, 0, 6.284);
  ctx.stroke();
  ctx.restore();
}

// 落雷：从画面顶上砸下来的光柱，前 1/4 最亮，之后碎成几道细闪电
function drawBeam(f, k) {
  const top = f.y - 620;
  const flash = k < 0.22 ? 1 : Math.max(0, 1 - (k - 0.22) / 0.5);
  ctx.globalAlpha = flash;
  const g = ctx.createLinearGradient(0, top, 0, f.y);
  g.addColorStop(0, hexA(f.col, 0));
  g.addColorStop(0.55, hexA(f.col, 0.42 * flash));
  g.addColorStop(1, hexA(f.col, 0.95 * flash));
  ctx.fillStyle = g;
  const w = (f.w || 14) * 2.1 * (1 - k * 0.35);
  ctx.fillRect(f.x - w / 2, top, w, f.y - top);
  // 柱心：一条几乎不透明的白线，比整束光更容易一眼看出来
  ctx.fillStyle = hexA('#ffffff', 0.7 * flash);
  const cw = Math.max(2, (f.w || 14) * 0.22);
  ctx.fillRect(f.x - cw / 2, top, cw, f.y - top);
  // 分叉：两条随机折线，种子用 x/y 定死，同一道雷每次画都一样
  ctx.strokeStyle = hexA('#ffffff', 0.75 * flash);
  ctx.lineWidth = 1.8;
  for (let i = 0; i < 2; i++) {
    const s = Math.sin((f.x + i * 37) * 0.7);
    ctx.beginPath();
    ctx.moveTo(f.x + s * 6, top + 120);
    for (let t = 1; t <= 5; t++) {
      const yy = top + 120 + (f.y - top - 120) * (t / 5);
      ctx.lineTo(f.x + s * 6 + Math.sin(t * 2.1 + i) * (14 - t * 1.6), yy);
    }
    ctx.stroke();
  }
  // 落点：白核 + 一圈扩散的环，交代「砸在这儿」
  ctx.globalAlpha = flash * 0.9;
  ctx.fillStyle = hexA('#ffffff', 0.85 * flash);
  ctx.beginPath(); ctx.arc(f.x, f.y - 8, 9 * (1 - k * 0.5), 0, 6.284); ctx.fill();
  ctx.globalAlpha = flash * (1 - k);
  ctx.strokeStyle = hexA(f.col, 0.9);
  ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.arc(f.x, f.y - 8, 14 + k * f.r * 0.7, 0, 6.284); ctx.stroke();
}

// 冲击波：三层不同速度的环 + 一层径向渐变，比单环「炸」得明显
function drawBlast(f, k) {
  const layers = [[0, 1], [0.13, 0.72], [0.26, 0.46]];
  for (const [delay, scale] of layers) {
    const kk = (k - delay) / (1 - delay);
    if (kk < 0 || kk > 1) continue;
    ctx.globalAlpha = (1 - kk) * 0.95;
    ctx.strokeStyle = f.col;
    ctx.lineWidth = 3.4 * (1 - kk) + 0.7;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r * scale * (0.2 + kk * 0.95), 0, 6.284);
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 0.9);
  g.addColorStop(0, hexA(f.col, 0.45 * (1 - k)));
  g.addColorStop(1, hexA(f.col, 0));
  ctx.globalAlpha = 1 - k;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.9, 0, 6.284); ctx.fill();
}

// 护罩：一个六边形罩子（外框 + 三个内层环），像给这个人扣了个玻璃罩
function drawShield(f, k) {
  const pop = k < 0.25 ? k / 0.25 : 1;                 // 先涨开
  const fade = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;      // 再淡出
  const r = f.r * (0.55 + pop * 0.45) * (1 + k * 0.06);
  ctx.globalAlpha = fade;
  ctx.strokeStyle = f.col;
  ctx.lineWidth = 2.2;
  for (let pass = 0; pass < 2; pass++) {
    const rr = r * (1 - pass * 0.34);
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * 6.284;
      const px = f.x + Math.cos(a) * rr;
      const py = f.y + Math.sin(a) * rr * 1.05;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();
  }
  // 内部的横向扫描线
  ctx.globalAlpha = fade * 0.5;
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    const yy = f.y + i * r * 0.32;
    const half = Math.sqrt(Math.max(0, r * r - (yy - f.y) * (yy - f.y))) * 0.9;
    ctx.moveTo(f.x - half, yy);
    ctx.lineTo(f.x + half, yy);
  }
  ctx.stroke();
}

// 加速：一排横向速度线从中心甩出去，再叠三层指向敌人的箭头
// （只画线的话在棋盘上看不出来，加了箭头才有「推力」的方向感）
function drawGust(f, k) {
  const n = 7;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * 7.2;
    const len = f.r * (0.55 + k * 1.1) * (1 - Math.abs(off) / (f.r * 0.9));
    if (len <= 2) continue;
    const x0 = f.x - len * 0.5;
    const yy = f.y + off - (i - (n - 1) / 2) * 2 * k;
    ctx.globalAlpha = (1 - k) * 0.95;
    ctx.strokeStyle = f.col;
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + len, yy); ctx.stroke();
    // 白芯，避免和护罩/治疗同色时糊在一起
    ctx.globalAlpha = (1 - k) * 0.55;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0 + len * 0.35, yy); ctx.lineTo(x0 + len, yy); ctx.stroke();
  }
  // 朝右的箭头（速度方向）：三道，越靠外越细
  ctx.strokeStyle = f.col;
  for (let i = 0; i < 3; i++) {
    const kk = (k - i * 0.1) / (1 - i * 0.1);
    if (kk < 0 || kk > 1) continue;
    const px = f.x + f.r * (0.55 + kk * 0.85);
    const py = f.y - 6 + i * 7;
    const a = 7 * (1 - kk * 0.4);
    ctx.globalAlpha = (1 - kk) * 0.9;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(px - a, py - a); ctx.lineTo(px, py); ctx.lineTo(px - a, py + a);
    ctx.stroke();
  }
}

// 眩晕：同心电波（用短线段拼出来的虚线圆）+ 中心星芒
function drawShock(f, k) {
  const rings = [[0, 1], [0.18, 0.7]];
  for (const [delay, scale] of rings) {
    const kk = (k - delay) / (1 - delay);
    if (kk < 0 || kk > 1) continue;
    const r = f.r * scale * (0.15 + kk * 1.0);
    // 底下一层实线圆让电波「有体量」，上面再压一层虚线碎环
    ctx.globalAlpha = (1 - kk) * 0.34;
    ctx.strokeStyle = f.col;
    ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.284); ctx.stroke();
    ctx.globalAlpha = (1 - kk) * 0.95;
    ctx.lineWidth = 2.4;
    const seg = 12;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * 6.284 + kk * 1.2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, a0, a0 + 0.3);
      ctx.stroke();
    }
  }
  // 星芒：四个白点绕着中心转，越大越像「懵了」
  ctx.globalAlpha = Math.max(0, 1 - k * 1.6);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  const s = 12 * (1 + k);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * 6.284 + k * 0.8;
    ctx.beginPath();
    ctx.moveTo(f.x + Math.cos(a) * s * 0.25, f.y + Math.sin(a) * s * 0.25);
    ctx.lineTo(f.x + Math.cos(a) * s, f.y + Math.sin(a) * s);
    ctx.stroke();
  }
}

// 治疗：一串光点从脚下升起来，越往上越淡
function drawBloom(f, k) {
  ctx.globalAlpha = 1 - k;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.284 + 0.4;
    const rise = 56 * (k * 1.15 - i * 0.018);
    const px = f.x + Math.cos(a) * f.r * 0.62 * (0.5 + k * 0.5);
    const py = f.y - rise + Math.sin(a) * 4;
    const rr = 3.4 * (1 - k * 0.4);
    // 每个光点带一层自己的柔光，单点太小在棋盘上直接看不见
    ctx.globalAlpha = Math.max(0, (1 - k) * (0.55 - i * 0.02));
    ctx.fillStyle = f.col;
    ctx.beginPath(); ctx.arc(px, py, rr * 2.6, 0, 6.284); ctx.fill();
    ctx.globalAlpha = Math.max(0, (1 - k) * (0.95 - i * 0.03));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(px, py, rr * 0.75, 0, 6.284); ctx.fill();
  }
  // 底下的柔光环
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 0.9);
  g.addColorStop(0, hexA(f.col, 0.4 * (1 - k)));
  g.addColorStop(1, hexA(f.col, 0));
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.9, 0, 6.284); ctx.fill();
  // 贴地一圈「愈合」环，和眩晕/冲击波区分开（那俩也是环，但这个是慢慢收拢的）
  ctx.globalAlpha = (1 - k) * 0.8;
  ctx.strokeStyle = hexA(f.col, 0.9);
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.ellipse(f.x, f.y + 6, f.r * (0.9 - k * 0.45), f.r * 0.3 * (0.9 - k * 0.45), 0, 0, 6.284); ctx.stroke();
}

// '#rrggbb' + alpha → 'rgba(...)'。特效里到处都是「同色不同透明度」，
// 用 globalAlpha 会连带影响描边宽度的手感，所以直接拼颜色。
function hexA(hex, a) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return `rgba(255,255,255,${a})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}


function drawFloats() {
  ctx.save();
  ctx.textAlign = 'center';
  for (const f of G.floats) {
    const k = f.t / f.d;
    ctx.globalAlpha = 1 - k * k;
    ctx.font = `700 ${Math.round(13 * f.size)}px system-ui,sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.75)';
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.col;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.restore();
}

// 供界面层取「某个单位在屏幕上的位置」，用来放浮动信息卡
export function screenPos(cell) {
  const p = cellXY(cell);
  return { x: p.x * view.s + view.ox, y: p.y * view.s + view.oy };
}
