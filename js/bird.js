// 是鸟弟就下 100 层
//
// 玩法照搬「是男人就下一百层」(NS-SHAFT)：镜头一直在往下滚，平台踩着踩着就塌，
// 想活命只能不停往下走；走慢了会被头顶的尖刺顶住，掉太快会追出画面摔进深渊。
//
// 这一版的主角是波吕克斯（鸟弟）：
//   · 小人用灰机 wiki 的剧情立绘小人（裁剪掉了纸偶棒）
//   · 技能释放时播灰机的战斗/行动动图（雪碧图由 scripts/build_bird_art.py 压好）
//   · 头像进 HUD，血条 / 狂气条 / 恢复道具 / 敌人都是这一版新加的
//
// 所有动图都内联在 js/bird-art.js 里，页面只发一个脚本请求 —— 边缘每个请求要
// 1~2 秒，7 段动图各自请求一次的话开局就能卡半分钟。
import { SHEET, ANIMS } from './bird-art.js';

// ---------------------------------------------------------------- 尺寸
const VW = 400;            // 逻辑视口宽（竖井）
const VH = 660;
const WALL = 22;           // 两侧石壁厚
const GAP = 100;           // 层间距（一层 100px，画面里能同时看到 6 层）
const TOP = 96;            // 第 0 层台面的世界 y
const GOAL = 100;          // 通关层数
const GRAV = 1560;
const VMAX = 620;          // 终端下坠速度：掉不了多快，靠"往下蹿"跳层行不通
const RUN = 238;           // 地面水平速度
const JUMP = 436;
const FLOOR_H = 34;        // 井底尖刺带高度（贴着视口底部，跟着镜头走）

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const $ = (s) => document.querySelector(s);
const TEST = new URLSearchParams(location.search).has('_test');

// ---------------------------------------------------------------- 状态
const G = {
  state: 'load',           // load | ready | play | pause | end | win
  t: 0, camY: 0, cur: 0, depth: 0,
  score: 0, kills: 0, rage: 30,
  freezeT: 0, shake: 0, flash: 0,
  sound: true, best: 0, bestLv: 0,
  plats: [], mobs: [], orbs: [], parts: [], texts: [], fx: [],
  cd: { dash: 0, star: 0, ward: 0, burst: 0 },
  keys: { left: false, right: false, down: false },
  hint: {},
};

const P = {
  x: VW / 2, y: TOP, vx: 0, vy: 0, w: 26, h: 34,
  face: 1, ground: null, ignore: null, ignoreT: 0,
  hp: 100, hpMax: 100, invuln: 0, dashT: 0, wardT: 0, hurtT: 0, idle: 0,
};

const SKILLS = [
  { id: 'dash', ic: '掠', n: '掠影斩', cost: 26, cd: 3.2, anim: 'skill1', tip: '向前突进，撞碎沿路的影怪' },
  { id: 'star', ic: '碎', n: '碎星坠', cost: 40, cd: 5.5, anim: 'skill2', tip: '星矛落下，清掉视野里的影怪，把尖刺台拍平' },
  { id: 'ward', ic: '圣', n: '圣翼护', cost: 34, cd: 8.0, anim: 'defend', tip: '回血 26，六秒内受伤减半' },
  { id: 'burst', ic: '爆', n: '狂气爆发', cost: 68, cd: 12.0, anim: 'burst', tip: '四秒清场：平台不塌、影怪全灭' },
];

// ---------------------------------------------------------------- 素材
const sheet = new Image();
let imgOk = false;
sheet.onload = () => { imgOk = true; boot(); };
sheet.onerror = () => { boot(); };          // 图废了也要能玩，只是没有立绘
sheet.src = SHEET;

const cv = $('#cv');
const ctx = cv.getContext('2d');
let scale = 1;                               // 逻辑像素 → 画布像素

function fit() {
  const box = $('#stage').getBoundingClientRect();
  const s = Math.min((box.width - 2) / VW, (box.height - 2) / VH);
  const cssW = Math.max(200, VW * s), cssH = cssW * VH / VW;
  cv.style.width = cssW + 'px';
  cv.style.height = cssH + 'px';
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  scale = (cssW / VW) * dpr;
  cv.width = Math.round(VW * scale);
  cv.height = Math.round(VH * scale);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
}

// ---------------------------------------------------------------- 音效
const Snd = (() => {
  let ac = null;
  function ctx() {
    if (!G.sound) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, dur, type = 'sine', vol = 0.05, to = 0) {
    const a = ctx(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.06, hp = 700) {
    const a = ctx(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(); src.buffer = buf;
    const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = a.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(a.destination);
    src.start();
  }
  return {
    land() { tone(150, 0.07, 'square', 0.03, 90); },
    jump() { tone(420, 0.1, 'sine', 0.035, 620); },
    hurt() { tone(210, 0.22, 'sawtooth', 0.05, 70); noise(0.12, 0.04, 400); },
    break() { noise(0.18, 0.05, 900); tone(120, 0.1, 'square', 0.025, 60); },
    pick() { tone(680, 0.09, 'sine', 0.04); setTimeout(() => tone(980, 0.1, 'sine', 0.035), 70); },
    kill() { noise(0.1, 0.05, 1200); tone(320, 0.09, 'triangle', 0.03, 140); },
    skill() { tone(300, 0.28, 'sawtooth', 0.04, 780); tone(600, 0.3, 'sine', 0.03, 1200); },
    boost() { tone(200, 0.16, 'square', 0.04, 520); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.26, 'triangle', 0.05), i * 120)); },
    over() { [420, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.05), i * 130)); },
  };
})();

// ---------------------------------------------------------------- 世界
// 平台类型：normal 踩上倒计时塌 / solid 坚固 / frail 一踩就碎 /
//           spike 尖刺（碰到扣血） / belt 传送带 / boost 下坠加速板
const PT = {
  normal: { a: '#3d5680', b: '#20304b', edge: '#6d8fc4' },
  solid: { a: '#5b6a80', b: '#31404f', edge: '#9fb0c6' },
  frail: { a: '#7d6138', b: '#43331d', edge: '#c9a05d' },
  spike: { a: '#6a3346', b: '#3a1b26', edge: '#d76a7d' },
  belt: { a: '#4a3d78', b: '#282046', edge: '#9b86e0' },
  boost: { a: '#7a6526', b: '#42351a', edge: '#e6c25a' },
};

// 浮尘：位置用固定哈希生成，重开一局也长得差不多（不会每帧闪）
const DUST = Array.from({ length: 54 }, (_, i) => {
  const h = (n) => ((Math.sin(i * n) * 43758.5453) % 1 + 1) % 1;
  return {
    x: h(12.9898) * VW,
    y0: h(78.233) * (VH + 90),
    r: 1 + Math.round(h(3.71) * 2),
    sp: 0.10 + h(7.13) * 0.34,
    a: h(21.4),
    c: h(5.5) > 0.6 ? '#8ab4ff' : '#b9c8e8',
  };
});

function addPlat(x, y, w, type) {
  const pl = { x, y, w, type, fuse: 0, fuseMax: 1, dead: false, dir: Math.random() < 0.5 ? -1 : 1, hit: 0 };
  G.plats.push(pl);
  return pl;
}

function hasOverlap(x, w, y) {
  for (const pl of G.plats) {
    if (pl.dead || Math.abs(pl.y - y) > 1) continue;
    if (x < pl.x + pl.w + 10 && x + w + 10 > pl.x) return true;
  }
  return false;
}

function rollType(t) {
  const r = Math.random();
  if (r < 0.20 + 0.12 * t) return 'frail';
  if (r < 0.30 + 0.22 * t) return 'spike';
  if (r < 0.44 + 0.16 * t) return 'belt';
  if (r < 0.55) return 'boost';
  if (r < 0.66) return 'solid';
  return 'normal';
}

function buildWorld() {
  G.plats = []; G.mobs = []; G.orbs = []; G.parts = []; G.texts = []; G.fx = [];
  G.camY = 0; G.depth = 0; G.cur = 0; G.score = 0; G.kills = 0;
  G.rage = 30; G.freezeT = 0; G.shake = 0; G.flash = 0;
  for (const k in G.cd) G.cd[k] = 0;

  Object.assign(P, {
    x: VW / 2, y: TOP, vx: 0, vy: 0, face: 1, ground: null, ignore: null, ignoreT: 0,
    hp: P.hpMax, invuln: 0, dashT: 0, wardT: 0, hurtT: 0,
  });

  // 起跳台：够宽，开局不用抢
  addPlat(VW / 2 - 82, TOP, 164, 'solid');

  let anchor = VW / 2;
  for (let n = 1; n <= GOAL; n++) {
    const y = TOP + n * GAP;
    const t = n / GOAL;
    const pw = Math.round(94 - 46 * t + rnd(-10, 10));
    // 相邻层中心最多错开 reach：从上一层自由落体约 0.36s，横向够跑 RUN*0.36
    const reach = 76 - 30 * t;
    const cx = clamp(anchor + rnd(-reach, reach), WALL + pw / 2 + 6, VW - WALL - pw / 2 - 6);
    addPlat(cx - pw / 2, y, pw, Math.random() < 0.14 + 0.22 * t ? 'solid' : 'normal');
    anchor = cx;

    // 侧边再补 0~2 个，类型随层数变刁
    const extra = Math.random() < 0.42 ? 0 : Math.random() < 0.62 ? 1 : 2;
    for (let i = 0; i < extra; i++) {
      for (let tryN = 0; tryN < 6; tryN++) {
        const w2 = Math.round(rnd(52, 82) - 12 * t);
        const x2 = rnd(WALL + 4, VW - WALL - w2 - 4);
        if (hasOverlap(x2, w2, y)) continue;
        addPlat(x2, y, w2, rollType(t));
        break;
      }
    }

    // 影怪：从第 5 层开始，越往下越密
    if (n >= 5 && Math.random() < 0.12 + 0.36 * t) {
      const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike' && p.w > 56);
      if (host.length) {
        const h = pick(host);
        const w = Math.min(26, h.w - 8);
        G.mobs.push({
          x: h.x + h.w / 2, y: h.y, w, h: 22, x0: h.x + w / 2, x1: h.x + h.w - w / 2,
          vx: rnd(30, 58) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, 6), dead: false,
        });
      }
    }

    // 道具：红心回血 / 狂气结晶 / 护盾
    const r = Math.random();
    let kind = null;
    if (r < 0.105) kind = 'heart';
    else if (r < 0.225) kind = 'rage';
    else if (r < 0.265) kind = 'shield';
    if (kind) {
      const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike');
      const h = host.length ? pick(host) : null;
      if (h) G.orbs.push({ x: h.x + h.w / 2, y: h.y - 20, kind, ph: rnd(0, 6), dead: false });
    }
  }

  // 深层多给点血包，否则 60 层之后纯属挨打
  for (let n = 40; n <= GOAL; n += 15) {
    const y = TOP + n * GAP;
    const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike');
    if (host.length) G.orbs.push({ x: pick(host).x + 30, y: y - 20, kind: 'heart', ph: rnd(0, 6), dead: false });
  }
}

// ---------------------------------------------------------------- 粒子 / 飘字 / 演出
function spark(x, y, n, color, spd = 180, life = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(spd * 0.3, spd);
    G.parts.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40,
      life, max: life, color, r: rnd(1.5, 3.4), g: 900,
    });
  }
  if (G.parts.length > 220) G.parts.splice(0, G.parts.length - 220);
}

function floatText(x, y, txt, color) {
  G.texts.push({ x, y, txt, color, life: 0.9, max: 0.9 });
  if (G.texts.length > 24) G.texts.shift();
}

function shatter(pl) {
  pl.dead = true;
  if (P.ground === pl) P.ground = null;
  const n = Math.round(pl.w / 12);
  for (let i = 0; i < n; i++) {
    G.parts.push({
      x: pl.x + rnd(4, pl.w - 4), y: pl.y + rnd(0, 10),
      vx: rnd(-70, 70), vy: rnd(-170, -40), life: 0.75, max: 0.75,
      color: PT[pl.type].a, r: rnd(2, 4.5), g: 1400,
    });
  }
  Snd.break();
  G.shake = Math.max(G.shake, 2.5);
}

function spawnFx(anim, h = 208, dur = 1.35, name = '') {
  G.fx.push({ anim, h, dur, t: 0, name });
}

// ---------------------------------------------------------------- 玩家
function hurtP(amount, cause) {
  if (G.state !== 'play') return;
  const p = P;
  if (p.invuln > 0) return;
  let dmg = amount;
  if (p.wardT > 0) dmg *= 0.5;
  p.hp -= dmg;
  p.invuln = 0.85;
  p.hurtT = 0.45;
  G.flash = 0.55;
  G.shake = Math.max(G.shake, 7);
  floatText(p.x, p.y - 42, '-' + Math.round(dmg), '#ff8b7d');
  spark(p.x, p.y - 16, 10, '#e8695f', 200, 0.5);
  Snd.hurt();
  if (p.hp <= 0) { p.hp = 0; endRun(false); }
}

function landOn(pl) {
  const p = P;
  if (pl.type === 'spike') {
    p.y = pl.y - 2; p.vy = -210; p.ground = null;
    hurtP(12, 'spike');
    pl.hit = 1;
    return;
  }
  p.y = pl.y; p.vy = 0; p.ground = pl;
  if (pl.type === 'boost') {
    p.ground = null; p.vy = 600; p.invuln = Math.max(p.invuln, 0.15);
    spark(p.x, pl.y, 12, '#e6c25a', 240, 0.5);
    Snd.boost();
    return;
  }
  if (pl.type !== 'solid' && pl.type !== 'belt' && pl.fuse <= 0) {
    pl.fuseMax = pl.fuse = pl.type === 'frail' ? 0.38 : 0.92;
  }
  spark(p.x, pl.y, 4, PT[pl.type].edge, 90, 0.3);
  Snd.land();
}

function tryJump() {
  const p = P;
  if (G.state !== 'play') return;
  if (!p.ground) return;
  p.vy = -JUMP; p.ground = null;
  spark(p.x, p.y, 5, '#9fb0c6', 110, 0.3);
  Snd.jump();
}

function killMob(m, byPlayer) {
  if (m.dead) return;
  m.dead = true;
  G.kills++;
  G.score += 25;
  G.rage = Math.min(100, G.rage + 7);
  floatText(m.x, m.y - 30, '+25', '#e3b341');
  spark(m.x, m.y - m.h / 2, 14, '#b07ce8', 230, 0.55);
  Snd.kill();
  if (byPlayer && Math.random() < 0.35) {
    // 踩死的怪有概率掉狂气，给「玩得凶」一点回报
    G.orbs.push({ x: m.x, y: m.y - 24, kind: 'rage', ph: 0, dead: false });
  }
}

function pickOrb(o) {
  o.dead = true;
  const p = P;
  if (o.kind === 'heart') {
    p.hp = Math.min(p.hpMax, p.hp + 20);
    floatText(o.x, o.y - 8, '+20 HP', '#7ee08a');
    spark(o.x, o.y, 12, '#7ee08a', 170, 0.55);
  } else if (o.kind === 'rage') {
    G.rage = Math.min(100, G.rage + 18);
    floatText(o.x, o.y - 8, '+18 狂气', '#b79bff');
    spark(o.x, o.y, 12, '#b79bff', 170, 0.55);
  } else {
    p.invuln = Math.max(p.invuln, 3.2);
    floatText(o.x, o.y - 8, '护盾', '#6fe3e3');
    spark(o.x, o.y, 14, '#6fe3e3', 180, 0.6);
  }
  Snd.pick();
}

// ---------------------------------------------------------------- 技能
function useSkill(id) {
  if (G.state !== 'play') return;
  const s = SKILLS.find((x) => x.id === id);
  if (!s) return;
  if (G.cd[id] > 0) return;
  if (G.rage < s.cost) { toast('狂气不够，往下走能攒'); return; }
  G.rage -= s.cost;
  G.cd[id] = s.cd;
  spawnFx(s.anim, id === 'burst' ? 236 : 200, id === 'burst' ? 1.7 : 1.3, s.n);
  Snd.skill();
  const p = P;
  const inView = (o) => o.y > G.camY - 40 && o.y < G.camY + VH + 40;

  if (id === 'dash') {
    p.dashT = 0.32; p.vx = p.face * 830; p.invuln = Math.max(p.invuln, 0.5);
    G.shake = Math.max(G.shake, 5);
    spark(p.x, p.y - 16, 12, '#9fd0ff', 260, 0.4);
  } else if (id === 'star') {
    for (const m of G.mobs) if (!m.dead && inView(m)) killMob(m, false);
    // 尖刺台被星矛拍平，顺便给玩家开条路
    for (const pl of G.plats) {
      if (!pl.dead && pl.type === 'spike' && inView(pl)) {
        pl.type = 'normal'; pl.fuse = 0; pl.fuseMax = 1.05;
        spark(pl.x + pl.w / 2, pl.y, 8, '#c9a05d', 200, 0.5);
      }
    }
    G.shake = Math.max(G.shake, 9);
  } else if (id === 'ward') {
    p.hp = Math.min(p.hpMax, p.hp + 26);
    p.wardT = 6; p.invuln = Math.max(p.invuln, 1.2);
    floatText(p.x, p.y - 46, '+26 HP', '#7ee08a');
    spark(p.x, p.y - 16, 18, '#9ff0d8', 190, 0.7);
  } else if (id === 'burst') {
    for (const m of G.mobs) if (!m.dead && inView(m)) killMob(m, false);
    G.freezeT = 4.5;
    p.invuln = Math.max(p.invuln, 3);
    G.shake = Math.max(G.shake, 14);
    spark(p.x, p.y - 20, 30, '#b79bff', 320, 0.8);
  }
}

// ---------------------------------------------------------------- 更新
function update(dt) {
  const p = P;
  G.t += dt;

  for (const s of SKILLS) G.cd[s.id] = Math.max(0, G.cd[s.id] - dt);
  p.invuln = Math.max(0, p.invuln - dt);
  p.wardT = Math.max(0, p.wardT - dt);
  p.hurtT = Math.max(0, p.hurtT - dt);
  p.dashT = Math.max(0, p.dashT - dt);
  p.ignoreT = Math.max(0, p.ignoreT - dt);
  G.freezeT = Math.max(0, G.freezeT - dt);
  G.shake *= Math.pow(0.0015, dt);
  G.flash = Math.max(0, G.flash - dt * 2.4);

  // ---- 水平输入
  const dir = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0);
  if (dir && p.dashT <= 0) p.face = dir;
  const target = p.dashT > 0 ? p.face * 830 : dir * RUN;
  const acc = p.ground ? 2800 : 1600;
  p.vx += clamp(target - p.vx, -acc * dt, acc * dt);

  // ---- 下穿：按住 ↓ 直接从能碎的平台上穿下去
  if (G.keys.down && p.ground && p.ground.type !== 'solid') {
    p.ignore = p.ground; p.ignoreT = 0.18; p.ground = null; p.vy = 140;
  }
  // 铁板踩不塌也穿不过，只按 ↓ 会一直干站着——这个提示只说一次
  if (G.keys.down && p.ground && p.ground.type === 'solid') {
    G.solidHold = (G.solidHold || 0) + dt;
    if (G.solidHold > 0.55 && !G.hint.solid) {
      G.hint.solid = 1;
      toast('坚固平台踩不塌，也穿不过去——走到边上跳下去');
    }
  } else G.solidHold = 0;

  // ---- 站立吸附（先处理，位移后再验证还在不在台上）
  if (p.ground) {
    const pl = p.ground;
    p.y = pl.y; p.vy = 0;
    if (pl.type === 'belt') p.x += pl.dir * 132 * dt;
    p.x = clamp(p.x + p.vx * dt, WALL + p.w / 2, VW - WALL - p.w / 2);
    if (pl.dead || p.x + p.w / 2 <= pl.x + 1 || p.x - p.w / 2 >= pl.x + pl.w - 1) {
      p.ground = null;
    }
  } else {
    const prevY = p.y;
    p.vy = Math.min(p.vy + GRAV * dt, VMAX);
    // 按住 ↓ 只是"从能碎的平台上穿下去"，不再额外加重力——
    // 否则一路按 ↓ 直接蹿到井底，层数白拿，还躲掉所有平台上的风险。
    p.x = clamp(p.x + p.vx * dt, WALL + p.w / 2, VW - WALL - p.w / 2);
    p.y += p.vy * dt;

    if (p.vy > 0) {
      for (const pl of G.plats) {
        if (pl.dead) continue;
        if (pl === p.ignore && p.ignoreT > 0) continue;
        if (prevY > pl.y + 1 || p.y < pl.y) continue;
        if (p.x + p.w / 2 <= pl.x + 2 || p.x - p.w / 2 >= pl.x + pl.w - 2) continue;
        landOn(pl);
        break;
      }
    }
  }

  // ---- 平台倒计时
  for (const pl of G.plats) {
    if (pl.hit > 0) pl.hit = Math.max(0, pl.hit - dt * 3);
    if (pl.dead || pl.fuse <= 0 || G.freezeT > 0) continue;
    pl.fuse -= dt;
    if (pl.fuse <= 0) shatter(pl);
  }

  // ---- 影怪
  for (const m of G.mobs) {
    if (m.dead) continue;
    if (m.y < G.camY - 260 || m.y > G.camY + VH + 260) continue;
    m.ph += dt * 3.4;
    m.x += m.vx * dt;
    if (m.x <= m.x0) { m.x = m.x0; m.vx = Math.abs(m.vx); }
    if (m.x >= m.x1) { m.x = m.x1; m.vx = -Math.abs(m.vx); }

    const ox = Math.abs(m.x - p.x) < (m.w + p.w) / 2 - 3;
    const oy = p.y > m.y - m.h && p.y - p.h < m.y;
    if (ox && oy) {
      // 从上方落下来 = 踩死；否则挨打
      if (p.vy > 80 && p.y - p.h < m.y - m.h * 0.3) {
        killMob(m, true);
        p.vy = -330;
      } else {
        hurtP(14, 'mob');
        const s = p.x < m.x ? -1 : 1;
        p.vx = s * 260; p.vy = -140; p.ground = null;
      }
    }
  }

  // ---- 道具
  for (const o of G.orbs) {
    if (o.dead) continue;
    o.ph += dt * 2.4;
    if (Math.abs(o.x - p.x) < 20 && Math.abs(o.y - (p.y - 15)) < 24) pickOrb(o);
  }

  // ---- 镜头：只由滚速推进，不跟着玩家跑。
  // 这样一来顶刺（推你下）和井底尖刺（拦你下）就把人夹在中间：
  // 蹿得太狠会扎在井底尖刺上，站着不动会被顶刺推下去。层数也就是镜头推进的深度。
  const scroll = 68 + G.cur * 0.32;
  G.camY += scroll * dt;

  // ---- 顶部尖刺
  const ceil = G.camY + 12;
  if (p.y - p.h < ceil) {
    p.y = ceil + p.h;
    if (p.ground) { p.ground = null; }
    p.vy = Math.max(p.vy, 110);
    hurtP(8, 'ceil');
  }

  // ---- 井底尖刺：贴着视口底部跟着镜头走，一路往下蹿就会扎上去
  const floorY = G.camY + VH - FLOOR_H;
  if (p.y > floorY) {
    p.y = floorY;
    p.ground = null; p.ignore = null;
    p.vy = -560;
    p.vx *= 0.5;
    hurtP(16, 'floor');
    spark(p.x, floorY - 2, 18, '#d76a7d', 280, 0.7);
    G.shake = Math.max(G.shake, 7);
    if (!G.hint.floor) {
      G.hint.floor = 1;
      toast('井底也是尖刺——别一个劲儿往下掉');
    }
  }

  // ---- 兜底：真摔出画面了（顶刺和底刺同时夹住的极端情况）
  if (p.y > G.camY + VH + 60) {
    hurtP(14, 'void');
    p.y = G.camY + VH * 0.55;
    p.vy = 0; p.ground = null; p.ignore = null;
    spark(p.x, p.y, 12, '#6a4a8f', 200, 0.6);
  }

  // ---- 一次性提示：新手三句话，说完就不再烦人
  if (!G.hint.mid && G.depth >= 6) {
    G.hint.mid = 1;
    toast('平台踩上去就开始塌，别在台上发呆');
  }
  if (!G.hint.rage && G.rage >= 68) {
    G.hint.rage = 1;
    toast('狂气攒够了，U 键可以来一发狂气爆发');
  }

  // ---- 层数 / 计分
  // 层数就是镜头推进到多深——你蹿得再快也只是把自己送到井底尖刺上去，
  // 想刷层数只能老老实实跟着塔往下走。
  const cur = clamp(Math.floor(G.camY / GAP + 0.02), 0, GOAL);
  G.cur = cur;
  if (cur > G.depth) {
    G.depth = cur;
    G.score += 10 + Math.floor(cur / 10) * 5;
    G.rage = Math.min(100, G.rage + 3);
    if (cur % 10 === 0 && cur > 0) {
      toast(`第 ${cur} 层`);
      G.shake = Math.max(G.shake, 3);
    }
    if (cur >= GOAL) { endRun(true); return; }
  }

  tickFx(dt);
}

function tickFx(dt) {
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter((f) => f.t < f.dur);
  for (const pt of G.parts) {
    pt.life -= dt;
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += (pt.g || 900) * dt;
  }
  G.parts = G.parts.filter((pt) => pt.life > 0);
  for (const tx of G.texts) { tx.life -= dt; tx.y -= 34 * dt; }
  G.texts = G.texts.filter((tx) => tx.life > 0);
}

// ---------------------------------------------------------------- 绘制
function sprite(name, idx, x, y, h, mode = 'bottom', flip = false, alpha = 1) {
  const a = ANIMS[name];
  if (!a || !imgOk) return;
  const f = a.f[idx % a.f.length];
  const w = h * f[2] / f[3];
  const dy = mode === 'bottom' ? -h : -h / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sheet, f[0], f[1], f[2], f[3], -w / 2, dy, w, h);
  ctx.restore();
}

function animFrame(name, t) {
  const a = ANIMS[name];
  if (!a) return 0;
  const n = a.f.length;
  if (n <= 1) return 0;
  if (a.loop) return Math.floor(t * 1000 / a.d) % n;
  return Math.min(n - 1, Math.floor(t * 1000 / a.d));
}

// 强制循环取帧：立绘里的战斗动作原本是一次性的，
// 拿来当"跑动 / 滞空"的循环播放，比单帧静图有生气得多。
function loopFrame(name, t, spd = 1) {
  const a = ANIMS[name];
  if (!a) return 0;
  const n = a.f.length;
  if (n <= 1) return 0;
  return Math.floor(t * 1000 * spd / a.d) % n;
}

function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawPlat(pl) {
  const y = pl.y - G.camY;
  if (y < -40 || y > VH + 40) return;
  const pal = PT[pl.type];
  const shaking = pl.fuse > 0 ? Math.sin(G.t * 46) * (1 - pl.fuse / pl.fuseMax) * 2.2 : 0;
  const x = pl.x + shaking;
  const hgt = 13;

  // 底座阴影
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(x + 2, y + 4, pl.w, hgt, 6); ctx.fill();

  const g = ctx.createLinearGradient(0, y, 0, y + hgt);
  g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  ctx.fillStyle = g;
  roundRect(x, y, pl.w, hgt, 6); ctx.fill();
  // 台面顶线：深色井里平台全靠这一条亮边被认出来
  ctx.fillStyle = pal.edge;
  ctx.globalAlpha = pl.hit > 0 ? 0.5 + pl.hit * 0.5 : 0.75;
  ctx.fillRect(x + 4, y, pl.w - 8, 1.6);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = pal.edge;
  ctx.globalAlpha = pl.hit > 0 ? 0.4 + pl.hit * 0.6 : 0.55;
  ctx.lineWidth = 1.2;
  roundRect(x + 0.6, y + 0.6, pl.w - 1.2, hgt - 1.2, 5.6); ctx.stroke();
  ctx.globalAlpha = 1;

  if (pl.type === 'spike') {
    ctx.fillStyle = '#e0788c';
    const n = Math.floor(pl.w / 13);
    for (let i = 0; i < n; i++) {
      const sx = x + 6 + i * 13;
      ctx.beginPath();
      ctx.moveTo(sx, y); ctx.lineTo(sx + 5, y - 10); ctx.lineTo(sx + 10, y);
      ctx.closePath(); ctx.fill();
    }
  } else if (pl.type === 'belt') {
    ctx.strokeStyle = 'rgba(200,182,255,.75)';
    ctx.lineWidth = 1.6;
    const off = (G.t * 46 * pl.dir) % 14;
    for (let i = -1; i < pl.w / 14 + 1; i++) {
      const sx = x + i * 14 + off;
      ctx.beginPath();
      ctx.moveTo(sx, y + 4); ctx.lineTo(sx + 6 * pl.dir, y + 6.5); ctx.lineTo(sx, y + 9);
      ctx.stroke();
    }
  } else if (pl.type === 'boost') {
    ctx.fillStyle = 'rgba(255,225,140,.9)';
    ctx.beginPath();
    ctx.moveTo(x + pl.w / 2 - 5, y + 3); ctx.lineTo(x + pl.w / 2 + 5, y + 3); ctx.lineTo(x + pl.w / 2, y + 11);
    ctx.closePath(); ctx.fill();
  }

  // 碎裂预警：裂纹随倒计时变亮
  if (pl.fuse > 0) {
    const k = 1 - pl.fuse / pl.fuseMax;
    ctx.strokeStyle = `rgba(255,150,120,${0.25 + k * 0.6})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + pl.w * 0.28, y + 1);
    ctx.lineTo(x + pl.w * 0.38, y + hgt * 0.55);
    ctx.lineTo(x + pl.w * 0.30, y + hgt - 1);
    ctx.moveTo(x + pl.w * 0.66, y + 1);
    ctx.lineTo(x + pl.w * 0.58, y + hgt * 0.6);
    ctx.stroke();
  }
}

function drawMob(m) {
  const y = m.y - G.camY;
  if (y < -60 || y > VH + 60) return;
  const bob = Math.sin(m.ph) * 2.5;
  const cx = m.x, cy = y - m.h / 2 + bob;
  const r = m.w / 2;

  ctx.save();
  ctx.shadowColor = 'rgba(150,90,220,.75)';
  ctx.shadowBlur = 12;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, 1, cx, cy, r * 1.3);
  g.addColorStop(0, '#a06ad6'); g.addColorStop(1, '#4a2468');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.92, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 两只眼睛，随移动方向偏
  const look = m.vx > 0 ? 1.6 : -1.6;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.ellipse(cx - r * 0.32 + look, cy - 1, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + r * 0.32 + look, cy - 1, 2.6, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b0f26';
  ctx.beginPath(); ctx.arc(cx - r * 0.32 + look * 1.5, cy - 0.5, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + r * 0.32 + look * 1.5, cy - 0.5, 1.3, 0, Math.PI * 2); ctx.fill();
}

function drawOrb(o) {
  const y = o.y - G.camY + Math.sin(o.ph) * 3;
  if (y < -40 || y > VH + 40) return;
  const x = o.x;
  ctx.save();
  if (o.kind === 'heart') {
    ctx.shadowColor = 'rgba(231,86,77,.8)'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#ef6a60';
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 9, y - 1, x - 7, y - 9, x, y - 4.5);
    ctx.bezierCurveTo(x + 7, y - 9, x + 9, y - 1, x, y + 6);
    ctx.fill();
  } else if (o.kind === 'rage') {
    ctx.shadowColor = 'rgba(160,124,255,.85)'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#b79bff';
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.moveTo(x, y - 4); ctx.lineTo(x + 2.2, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 2.2, y);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.shadowColor = 'rgba(111,227,227,.85)'; ctx.shadowBlur = 12;
    ctx.strokeStyle = '#6fe3e3'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      const px = x + Math.cos(a) * 7, py = y + Math.sin(a) * 7;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const p = P;
  const sy = p.y - G.camY;
  const hh = 80;
  if (sy < -110 || sy > VH + 110) return;

  const dir = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0);
  const running = !!p.ground && dir !== 0;
  const low = p.hp <= 36;

  // 站立 → idle 呼吸循环；左右移动 / 空中 → attack 战斗立绘循环。
  // （原来用的 chibi 两张是单帧静图，左右移动时人像一根木棍）
  let anim = 'idle';
  let spd = 1;
  if (running) { anim = 'attack'; spd = 1.45; }
  else if (!p.ground) { anim = 'attack'; spd = 1.15; }
  const idx = loopFrame(anim, G.t, spd);
  if (TEST) { G.lastAnim = anim; G.lastIdx = idx; }

  const blink = p.hurtT > 0 ? (Math.floor(G.t * 20) % 2 ? 0.4 : 1) : 1;

  // 身位光：不然后面一堆深色平台，根本找不到自己在哪
  ctx.save();
  const halo = ctx.createRadialGradient(p.x, sy - hh * 0.42, 3, p.x, sy - hh * 0.42, hh * 0.72);
  halo.addColorStop(0, low ? 'rgba(255,110,120,.26)' : 'rgba(150,195,255,.22)');
  halo.addColorStop(1, low ? 'rgba(255,110,120,0)' : 'rgba(150,195,255,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(p.x, sy - hh * 0.42, hh * 0.72, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 影子
  ctx.fillStyle = 'rgba(0,0,0,.30)';
  ctx.beginPath(); ctx.ellipse(p.x, sy + 1, 14, 3.6, 0, 0, Math.PI * 2); ctx.fill();

  // 下落速度线：掉得快的时候给点动感
  if (p.vy > 420) {
    ctx.strokeStyle = 'rgba(150,190,255,.22)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      const ox = (i - 1) * 11;
      ctx.beginPath();
      ctx.moveTo(p.x + ox, sy - hh - 4);
      ctx.lineTo(p.x + ox, sy - hh - 4 - Math.min(26, (p.vy - 420) / 18));
      ctx.stroke();
    }
  }

  // 护盾
  if (p.invuln > 0.5 || p.wardT > 0) {
    const k = p.wardT > 0 ? 0.55 : 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(111,227,227,${k})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(p.x, sy - hh * 0.45, hh * 0.52 + Math.sin(G.t * 6) * 1.5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  // 冲刺残影
  if (p.dashT > 0) {
    for (let i = 1; i <= 3; i++) {
      sprite(anim, idx, p.x - p.face * i * 11, sy, hh, 'bottom', p.face < 0, 0.16 * (4 - i) / 3);
    }
  }

  // 立绘本体：跑动时整体前倾 + 轻微上下颠，跑起来的味道主要靠这两下
  ctx.save();
  ctx.shadowColor = low ? 'rgba(255,120,130,.8)' : 'rgba(140,190,255,.75)';
  ctx.shadowBlur = 18;
  if (running) {
    ctx.translate(p.x, sy);
    ctx.rotate(p.face * 0.085);
    ctx.translate(0, Math.sin(G.t * 17) * 1.7);
    sprite(anim, idx, 0, 0, hh, 'bottom', p.face < 0, blink);
  } else {
    sprite(anim, idx, p.x, sy, hh, 'bottom', p.face < 0, blink);
  }
  ctx.restore();

  // 头顶血条（只在掉过血时出现）
  if (p.hp < p.hpMax) {
    const w = 34, hy = sy - hh - 8;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    roundRect(p.x - w / 2, hy, w, 3.6, 2); ctx.fill();
    ctx.fillStyle = p.hp > 36 ? '#e7564d' : '#ff6a5c';
    roundRect(p.x - w / 2, hy, w * (p.hp / p.hpMax), 3.6, 2); ctx.fill();
  }
}

function drawCeiling() {
  // 顶部尖刺带：一块固定的天花板，被顶上去就扣血
  const h = 14;
  const g = ctx.createLinearGradient(0, 0, 0, h + 8);
  g.addColorStop(0, '#2a1720'); g.addColorStop(1, 'rgba(42,23,32,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, h + 8);
  ctx.fillStyle = '#8c3a4a';
  for (let x = 6; x < VW; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 7, h); ctx.lineTo(x + 14, 0);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,90,110,.16)';
  ctx.fillRect(0, h, VW, 3);
}

function drawFloor() {
  // 井底尖刺：贴着视口底部，尖朝上。它跟着镜头一起下移，
  // 所以掉得太狠就会直接撞上来——这是"往下蹿"的代价。
  const y0 = VH - FLOOR_H;

  // 底部的暗雾，让尖刺从黑里长出来
  const g = ctx.createLinearGradient(0, y0 - 30, 0, VH);
  g.addColorStop(0, 'rgba(40,16,24,0)');
  g.addColorStop(0.5, 'rgba(52,20,30,.78)');
  g.addColorStop(1, 'rgba(18,7,11,.97)');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0 - 30, VW, FLOOR_H + 30);

  // 尖刺本体
  for (let x = -2; x < VW; x += 15) {
    ctx.beginPath();
    ctx.moveTo(x, VH + 1);
    ctx.lineTo(x + 6.5, y0 + 3);
    ctx.lineTo(x + 13, VH + 1);
    ctx.closePath();
    ctx.fillStyle = '#8c3a4a';
    ctx.fill();
    // 受光面
    ctx.fillStyle = 'rgba(226,124,142,.55)';
    ctx.beginPath();
    ctx.moveTo(x + 6.5, y0 + 3);
    ctx.lineTo(x + 4.6, VH + 1);
    ctx.lineTo(x + 6.5, VH + 1);
    ctx.closePath();
    ctx.fill();
  }

  // 刺根的一道亮线，把尖刺和黑雾分开
  ctx.fillStyle = 'rgba(255,120,140,.22)';
  ctx.fillRect(0, y0 + 2, VW, 1.6);
}

function drawWorld() {
  // 井道背景
  const bg = ctx.createLinearGradient(0, 0, 0, VH);
  bg.addColorStop(0, '#0b0f1a');
  bg.addColorStop(0.55, '#0a1420');
  bg.addColorStop(1, '#070a11');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, VW, VH);

  // 深处的紫光（越往下越亮一点，暗示塔底）
  const glowY = clamp(1 - (G.camY / (GOAL * GAP)) * 1.4, 0, 1);
  const rg = ctx.createRadialGradient(VW / 2, VH * 0.9, 10, VW / 2, VH * 0.9, VH * 0.75);
  rg.addColorStop(0, `rgba(120,80,190,${0.06 + (1 - glowY) * 0.16})`);
  rg.addColorStop(1, 'rgba(120,80,190,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, VW, VH);

  // 井里的浮尘：视差往上飘，给"一直在下坠"一个参照物
  for (const d of DUST) {
    const y = ((d.y0 - G.camY * d.sp) % (VH + 90) + VH + 90) % (VH + 90) - 45;
    ctx.globalAlpha = 0.10 + d.a * 0.22;
    ctx.fillStyle = d.c;
    ctx.fillRect(d.x, y, d.r, d.r);
  }
  ctx.globalAlpha = 1;

  // 两侧石壁 + 每 5 层一个刻度
  const off = G.camY % 46;
  for (const side of [0, 1]) {
    const x = side ? VW - WALL : 0;
    ctx.fillStyle = '#131a26';
    ctx.fillRect(x, 0, WALL, VH);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(side ? x : WALL - 1.5, 0, 1.5, VH);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = -off; y < VH; y += 46) ctx.fillRect(x + 2, y, WALL - 4, 1.5);
  }

  // 层号标尺（每 5 层）
  ctx.save();
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let n = 0; n <= GOAL; n += 5) {
    const y = TOP + n * GAP - G.camY;
    if (y < -20 || y > VH + 20) continue;
    ctx.fillStyle = 'rgba(150,170,205,.30)';
    ctx.fillRect(WALL - 6, y, 4, 1);
    ctx.fillStyle = 'rgba(150,170,205,.22)';
    ctx.fillText(String(n), WALL + 3, y - 8);
  }
  ctx.restore();

  for (const pl of G.plats) if (!pl.dead) drawPlat(pl);
  for (const o of G.orbs) if (!o.dead) drawOrb(o);
  for (const m of G.mobs) if (!m.dead) drawMob(m);

  drawFloor();

  if (G.state !== 'ready' && G.state !== 'load') drawPlayer();

  // 粒子
  for (const pt of G.parts) {
    ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
    ctx.fillStyle = pt.color;
    const y = pt.y - G.camY;
    ctx.fillRect(pt.x - pt.r / 2, y - pt.r / 2, pt.r, pt.r);
  }
  ctx.globalAlpha = 1;

  // 飘字
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const tx of G.texts) {
    ctx.globalAlpha = clamp(tx.life / tx.max, 0, 1);
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillText(tx.txt, tx.x + 1, tx.y - G.camY + 1);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.txt, tx.x, tx.y - G.camY);
  }
  ctx.globalAlpha = 1;

  drawCeiling();

  // 井底方向的黑雾：视觉上告诉你"下面还有很深"
  const fog = ctx.createLinearGradient(0, VH - 120, 0, VH);
  fog.addColorStop(0, 'rgba(8,6,16,0)');
  fog.addColorStop(1, 'rgba(8,6,16,.72)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, VH - 120, VW, 120);
}

function drawFx() {
  for (const f of G.fx) {
    const k = f.t / f.dur;
    const alpha = k < 0.14 ? k / 0.14 : k > 0.74 ? Math.max(0, (1 - k) / 0.26) : 1;
    const cy = VH * 0.34;

    // 动图里的人物本身是深色线稿，压暗背景等于让它隐身；
    // 反过来打一块亮底，人物就成了聚光灯下的剪影，细节全出来。
    ctx.save();
    const rg = ctx.createRadialGradient(VW / 2, cy, 6, VW / 2, cy, f.h * 0.92);
    rg.addColorStop(0, `rgba(198,220,255,${0.90 * alpha})`);
    rg.addColorStop(0.45, `rgba(150,180,240,${0.58 * alpha})`);
    rg.addColorStop(0.78, `rgba(110,140,215,${0.22 * alpha})`);
    rg.addColorStop(1, 'rgba(110,140,215,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(VW / 2, cy, f.h * 0.92, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // 边缘的暗角，别让亮底把整个画面顶亮
    ctx.save();
    const vg = ctx.createRadialGradient(VW / 2, cy, f.h * 0.9, VW / 2, cy, f.h * 1.5);
    vg.addColorStop(0, 'rgba(5,8,16,0)');
    vg.addColorStop(1, `rgba(5,8,16,${0.55 * alpha})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();

    sprite(f.anim, animFrame(f.anim, f.t), VW / 2, cy, f.h, 'center', false, alpha);

    if (f.name) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 13px system-ui, sans-serif';
      const ty = cy + f.h * 0.56;
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillText(f.name, VW / 2 + 1, ty + 1);
      ctx.fillStyle = '#cfe0ff';
      ctx.fillText(f.name, VW / 2, ty);
      ctx.restore();
    }
  }
}

function drawReady() {
  // 开始界面：只画井口那几层 + 待机动画
  ctx.fillStyle = 'rgba(6,9,14,.45)';
  ctx.fillRect(0, 0, VW, VH);
  sprite('idle', animFrame('idle', G.t), VW / 2, VH * 0.34, 300, 'center', false, 0.96);
}

function draw() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, VW, VH);

  const sh = G.shake;
  ctx.save();
  if (sh > 0.2) ctx.translate(rnd(-sh, sh), rnd(-sh, sh));

  drawWorld();
  if (G.state !== 'ready') drawFx();
  else drawReady();

  ctx.restore();

  // 受伤红闪
  if (G.flash > 0.01) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VH * 0.75);
    g.addColorStop(0, 'rgba(232,105,95,0)');
    g.addColorStop(1, `rgba(232,105,95,${clamp(G.flash, 0, 1) * 0.5})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  // 低血警示暗角
  if (G.state === 'play' && P.hp <= 30) {
    const k = (1 - P.hp / 30) * (0.25 + Math.sin(G.t * 5) * 0.08);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.66);
    g.addColorStop(0, 'rgba(200,40,40,0)');
    g.addColorStop(1, `rgba(200,40,40,${clamp(k, 0, 0.42)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  // 狂气爆发期间：画面边缘泛紫
  if (G.freezeT > 0) {
    ctx.strokeStyle = `rgba(160,124,255,${0.18 + Math.sin(G.t * 8) * 0.08})`;
    ctx.lineWidth = 5;
    ctx.strokeRect(2.5, 2.5, VW - 5, VH - 5);
  }
}

// ---------------------------------------------------------------- HUD
const el = {
  lv: $('#lv'), sc: $('#sc'), bs: $('#bs'),
  hpf: $('#hpf'), hpt: $('#hpt'), hpbar: $('#hpbar'),
  rgf: $('#rgf'), rgt: $('#rgt'),
  skills: $('#skills'), send: $('#snd'),
};
const shown = {};

function syncHud() {
  if (shown.lv !== G.depth) { shown.lv = G.depth; el.lv.textContent = G.depth; }
  if (shown.sc !== G.score) { shown.sc = G.score; el.sc.textContent = G.score; }
  const best = Math.max(G.bestLv, G.depth);
  if (shown.bs !== best) { shown.bs = best; el.bs.textContent = best; }

  const hp = Math.round(P.hp);
  if (shown.hp !== hp) {
    shown.hp = hp;
    el.hpf.style.width = clamp(P.hp / P.hpMax * 100, 0, 100) + '%';
    el.hpt.textContent = `${hp} / ${P.hpMax}`;
    el.hpbar.classList.toggle('low', hp <= 30);
  }
  const rg = Math.round(G.rage);
  if (shown.rg !== rg) {
    shown.rg = rg;
    el.rgf.style.width = rg + '%';
    el.rgt.textContent = `狂气 ${rg}`;
  }

  for (const s of SKILLS) {
    const b = btnOf[s.id];
    const cd = G.cd[s.id];
    const poor = G.rage < s.cost;
    if (b.cdShown !== (cd > 0)) { b.cdShown = cd > 0; b.el.classList.toggle('cooling', cd > 0); }
    b.el.classList.toggle('ready', cd <= 0 && !poor);
    b.el.classList.toggle('poor', poor);
    const txt = cd > 0 ? cd.toFixed(1) : '';
    if (b.txt !== txt) { b.txt = txt; b.cd.textContent = txt; }
  }
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.remove('on'), 1400);
}

// ---------------------------------------------------------------- 流程
function loadBest() {
  try {
    G.best = parseInt(localStorage.getItem('zjtt:bird:best') || '0', 10) || 0;
    G.bestLv = parseInt(localStorage.getItem('zjtt:bird:bestLv') || '0', 10) || 0;
    G.sound = localStorage.getItem('zjtt:bird:snd') !== '0';
  } catch { /* 无痕模式 */ }
  el.bs.textContent = G.bestLv;
  el.send.classList.toggle('off', !G.sound);
}

function saveBest() {
  let changed = false;
  if (G.score > G.best) { G.best = G.score; changed = true; }
  if (G.depth > G.bestLv) { G.bestLv = G.depth; changed = true; }
  try {
    if (changed) {
      localStorage.setItem('zjtt:bird:best', String(G.best));
      localStorage.setItem('zjtt:bird:bestLv', String(G.bestLv));
    }
  } catch { /* 无痕模式 */ }
  return changed;
}

// ---------------------------------------------------------------- 账号同步
// 云端纪录：空闲时再去拉连接件（构建后是 js/b/bird-sync.js，一个额外请求，
// 不挡首屏）。拉不到、没登录就纯单机，玩法一点不受影响。
let SYNC = null;
let pushedLv = 0;

function armSync() {
  const load = () => {
    import('./bird-sync.js')
      .then((m) => { SYNC = m; return m.pullBest(); })
      .then((b) => {
        if (!b) return;
        if (b.lv > G.bestLv) { G.bestLv = b.lv; el.bs.textContent = b.lv; }
        if (b.sc > G.best) G.best = b.sc;
        if (b.lv > 0) toast(`云端纪录：最深 ${b.lv} 层`);
      })
      .catch(() => { /* 没网 / 没登录 / 老浏览器：当单机玩 */ });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
}

// 只在「一局结束」时推，别每下一层推一次——那会把接口刷爆
function flushBest() {
  if (!SYNC || !SYNC.pushBest || G.depth <= pushedLv) return;
  pushedLv = G.depth;
  try { SYNC.pushBest(G.depth, G.score); SYNC.flush(); } catch { /* 同步失败不影响游戏 */ }
}

const RANKS = [
  [100, '鸟弟本弟', '一百层，一层没漏。这塔该改名了。'],
  [80, '有鸟样', '再往下二十层就能摸到底。'],
  [60, '翅膀硬了', '已经比大部分守密人下得深。'],
  [40, '半只鸟', '一半靠技术，一半靠运气。'],
  [20, '刚学会扑腾', '平台碎得比你想的快。'],
  [0, '羽毛还没长齐', '再试一次，这次别站在台上发呆。'],
];

function endRun(win) {
  if (G.state === 'end' || G.state === 'win') return;
  G.state = win ? 'win' : 'end';
  saveBest();
  flushBest();
  const rank = RANKS.find((r) => G.depth >= r[0]) || RANKS[RANKS.length - 1];

  $('#endK').textContent = win ? '塔底到底了' : '羽毛散了一地';
  $('#endLv').textContent = G.depth;
  $('#endSc').textContent = G.score;
  $('#endKill').textContent = G.kills;
  $('#endBest').textContent = G.bestLv;
  $('#endRank').innerHTML = `${rank[1]}<small>${rank[2]}</small>`;

  if (win) {
    spawnFx('awaken', 300, 2.4, '塔底');
    Snd.win();
    setTimeout(() => { $('#ovEnd').hidden = false; }, 1700);
  } else {
    Snd.over();
    $('#ovEnd').hidden = false;
  }
}

function hideOv() {
  $('#ovStart').hidden = true;
  $('#ovEnd').hidden = true;
  $('#ovPause').hidden = true;
}

function readyGo() {
  buildWorld();
  G.state = 'ready';
  hideOv();
  $('#ovStart').hidden = false;
  shown.lv = -1; shown.sc = -1; shown.hp = -1; shown.rg = -1;
  syncHud();
}

function play() {
  if (G.state !== 'ready') { buildWorld(); }
  G.state = 'play';
  hideOv();
  shown.lv = -1; shown.sc = -1; shown.hp = -1; shown.rg = -1;
  syncHud();
}

// 结算 / 暂停里点「重开」都走这里：一定要重建世界，否则层数、分数、血量
// 会带着上一局的值继续跑（层数停在 100 就再也不动了）。
function restart() {
  buildWorld();
  G.state = 'play';
  hideOv();
  shown.lv = -1; shown.sc = -1; shown.hp = -1; shown.rg = -1;
  syncHud();
}

function pause(on) {
  if (on && G.state === 'play') {
    G.state = 'pause';
    $('#pvLv').textContent = G.depth;
    $('#ovPause').hidden = false;
  } else if (!on && G.state === 'pause') {
    G.state = 'play';
    $('#ovPause').hidden = true;
  }
}

function boot() {
  const b = $('#boot');
  if (b) b.remove();
  fit();
  loadBest();
  readyGo();
  armSync();
}

// ---------------------------------------------------------------- 输入
const btnOf = {};
SKILLS.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'sk';
  b.title = s.tip + `（耗 ${s.cost} 狂气）`;
  b.innerHTML = `<b>${s.ic}</b><i>${s.cost}</i><span class="cd"></span>`;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); useSkill(s.id); });
  el.skills.appendChild(b);
  btnOf[s.id] = { el: b, cd: b.querySelector('.cd'), txt: '', cdShown: false };
});

const holdKey = (node, on, off) => {
  node.addEventListener('pointerdown', (e) => { e.preventDefault(); node.classList.add('on'); on(); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
    node.addEventListener(ev, () => { node.classList.remove('on'); off(); });
  }
};

holdKey($('#kL'), () => { G.keys.left = true; }, () => { G.keys.left = false; });
holdKey($('#kR'), () => { G.keys.right = true; }, () => { G.keys.right = false; });
$('#kJ').addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); });

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'a'].includes(k)) { G.keys.left = true; e.preventDefault(); }
  if (['arrowright', 'd'].includes(k)) { G.keys.right = true; e.preventDefault(); }
  if (['arrowdown', 's'].includes(k)) { G.keys.down = true; e.preventDefault(); }
  if ([' ', 'arrowup', 'w'].includes(k)) {
    e.preventDefault();
    if (G.state === 'ready') play(); else tryJump();
  }
  if (k === 'j') useSkill('dash');
  if (k === 'k') useSkill('star');
  if (k === 'l') useSkill('ward');
  if (k === 'u') useSkill('burst');
  if (k === 'p' || k === 'escape') pause(G.state === 'play');
  if (k === 'r' && G.state !== 'ready') restart();
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowleft', 'a'].includes(k)) G.keys.left = false;
  if (['arrowright', 'd'].includes(k)) G.keys.right = false;
  if (['arrowdown', 's'].includes(k)) G.keys.down = false;
});

$('#go').addEventListener('click', play);
$('#again').addEventListener('click', restart);
$('#resume').addEventListener('click', () => pause(false));
$('#quit').addEventListener('click', restart);
$('#pz').addEventListener('click', () => pause(G.state === 'play'));
$('#snd').addEventListener('click', () => {
  G.sound = !G.sound;
  el.send.classList.toggle('off', !G.sound);
  try { localStorage.setItem('zjtt:bird:snd', G.sound ? '1' : '0'); } catch { /* 无痕模式 */ }
});

// 切走就暂停。延迟 600ms 再确认：切标签页时 visibilitychange 可能连发两次，
// 无头浏览器里也会瞬间报 hidden，不延迟的话会莫名其妙暂停。
let visT = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearTimeout(visT);
    visT = setTimeout(() => { if (document.hidden && G.state === 'play' && !TEST) pause(true); }, 600);
  } else {
    clearTimeout(visT);
  }
});

// ---------------------------------------------------------------- 主循环
let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = last ? Math.min(0.034, (ts - last) / 1000) : 0;
  last = ts;
  if (G.state === 'play') update(dt);
  else {
    G.t += dt;          // 待机动画 / 通关演出的时钟不能停
    if (G.state !== 'pause') tickFx(dt);   // 暂停就是暂停，演出也别偷偷放完
    G.shake *= Math.pow(0.0015, dt);
    G.flash = Math.max(0, G.flash - dt * 2.4);
  }
  draw();
  if (G.state === 'play') syncHud();
}

fit();
window.addEventListener('resize', fit);
if (window.ResizeObserver) new ResizeObserver(fit).observe($('#stage'));
requestAnimationFrame(loop);

// 图还没到就先显示载入层；10 秒还没 onload 也放行（没立绘也能玩）
setTimeout(() => { if (G.state === 'load') boot(); }, 10000);

// 自动化测试用：?_test=1 时把内部状态挂出来，方便无头浏览器核对层数/血量/结算。
// 和合成大杜勒的 __mergeState 是同一套约定。
if (TEST) {
  window.__bird = { G, P, SKILLS, useSkill, play, pause, endRun, buildWorld, readyGo, hurtP, update };
}
