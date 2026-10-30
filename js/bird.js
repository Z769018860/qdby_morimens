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
// MOB_SHEET / MOB_RECT 是井里那几只怪的原作立绘（scripts/build_bird_mobs.py 拼的），
// 同样内联，不额外发图片请求。
import { SHEET, ANIMS, MOB_SHEET, MOB_RECT } from './bird-art.js';
import { startGameCloud } from './gamecloud.js';

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
const TRAMP = 1120;        // 蹦床弹力：弹起高度 ≈ 1120²/(2·1560) ≈ 402px，正好四层
const FLOOR_H = 34;        // 井底尖刺带高度（贴着视口底部，跟着镜头走）

// ---------------------------------------------------------------- 难度
// 四档难度只动"环境参数"，不动操作手感（跑速/跳跃/终端速度四档一样）：
// 滚得多快、平台多宽、陷阱多密、怪物多凶、掉多少血、掉多少东西、给多少分。
// sc 是计分倍率——难档的分本来就该更值钱，否则没人愿意碰癫狂。
// 资源与回复（削过一轮：以前血太厚、血包和狂气晶太多，一路滚到底几乎不会死）。
// 帮助页（bird.html）里写的数字要跟这里一致。
const BAL = {
  heal: 14, bigHeal: 30, wardHeal: 18,        // 血羽 / 大血羽 / 圣翼护 回血
  rageKill: 5, rageDepth: 2, rageOrb: 14, ragePurge: 14, rageStart: 20,   // 击杀 / 每下一层 / 狂气晶 / 净化 / 开局
  drop: 0.17,                                  // 击杀后掉落物的基础概率
};
const DIFFS = [
  { k: 'easy', n: '简单', tag: '入门', c: 'easy',
    d: '滚得慢，平台宽，怪物稀疏。先摸清手感。',
    scroll: 0.70, pw: 1.20, spike: 0.45, mob: 0.50, dmg: 0.70,
    drop: 1.40, rage: 1.25, sc: 0.80, hp: 100, fuse: 1.25 },
  { k: 'normal', n: '普通', tag: '标准', c: 'normal',
    d: '原本的节奏，掉一次血三分之一。',
    scroll: 1.00, pw: 1.00, spike: 1.00, mob: 1.00, dmg: 1.00,
    drop: 1.00, rage: 1.00, sc: 1.00, hp: 80, fuse: 1.00 },
  { k: 'hard', n: '困难', tag: '熬人', c: 'hard',
    d: '滚得更快，平台变窄，尖刺台和怪物都多起来。',
    scroll: 1.26, pw: 0.87, spike: 1.50, mob: 1.45, dmg: 1.25,
    drop: 0.85, rage: 0.95, sc: 1.40, hp: 75, fuse: 0.90 },
  { k: 'mad', n: '癫狂', tag: '找死', c: 'mad',
    d: '塔底在追你。血薄、刺多、平台窄到只放得下一只脚。',
    scroll: 1.52, pw: 0.76, spike: 1.90, mob: 1.90, dmg: 1.50,
    drop: 0.72, rage: 0.88, sc: 1.85, hp: 66, fuse: 0.82 },
];
const DIFF = Object.fromEntries(DIFFS.map((x) => [x.k, x]));
let D = DIFF.normal;       // 当前难度（整局不变，换档会重开世界）

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const $ = (s) => document.querySelector(s);
const TEST = new URLSearchParams(location.search).has('_test');

// ---------------------------------------------------------------- 状态
const G = {
  state: 'load',           // load | ready | play | pause | end | win
  t: 0, camY: 0, cur: 0, depth: 0,
  score: 0, kills: 0, rage: BAL.rageStart,
  freezeT: 0, shake: 0, flash: 0,
  sound: true, best: 0, bestLv: 0, diff: 'normal', bests: null, cloudLv: 0, cloudSc: 0,
  plats: [], mobs: [], orbs: [], shots: [], parts: [], texts: [], fx: [],
  cd: { dash: 0, star: 0, ward: 0, burst: 0 },
  keys: { left: false, right: false, down: false },
  hint: {},
  met: {},                 // 已经见过哪些怪（跨局保留，只为了「第一次遇到」的提示）
  tramps: 0,               // 本局踩了多少次蹦床，结算时给一句评价
};

const P = {
  x: VW / 2, y: TOP, vx: 0, vy: 0, w: 26, h: 34,
  face: 1, ground: null, ignore: null, ignoreT: 0,
  hp: 100, hpMax: 100, invuln: 0, dashT: 0, wardT: 0, hurtT: 0, idle: 0,
  featherT: 0,          // 羽落：缓降道具的剩余秒数
  shieldT: 0,           // 护盾道具的剩余秒数（和 invuln 分开，只为在状态条上显示）
};

const SKILLS = [
  { id: 'dash', ic: '掠', n: '掠影斩', cost: 26, cd: 3.2, anim: 'skill1', tip: '向前突进，撞碎沿路的怪物' },
  { id: 'star', ic: '碎', n: '碎星坠', cost: 40, cd: 5.5, anim: 'skill2', tip: '星矛落下，清掉视野里的怪物，把尖刺台拍平' },
  { id: 'ward', ic: '圣', n: '圣翼护', cost: 34, cd: 8.0, anim: 'defend', tip: '回血 18，六秒内受伤减半' },
  { id: 'burst', ic: '爆', n: '狂气爆发', cost: 68, cd: 12.0, anim: 'burst', tip: '四秒清场：平台不塌、怪物全灭' },
];

// ---------------------------------------------------------------- 素材
// 两张图（角色动图 + 怪物立绘）都到齐才开局；任何一张挂了也照常开局，
// 只是那只没有立绘——不能因为一张图 404 就整个页面卡在加载态。
const sheet = new Image();
let imgOk = false;
const mobSheet = new Image();
let mobOk = false;
let artLeft = 2;
const artDone = () => { if (--artLeft <= 0) boot(); };
sheet.onload = () => { imgOk = true; artDone(); };
sheet.onerror = () => { artDone(); };
sheet.src = SHEET;
mobSheet.onload = () => { mobOk = true; artDone(); };
mobSheet.onerror = () => { artDone(); };
mobSheet.src = MOB_SHEET;

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
    // 蹦床：一个上滑的弹簧音（低→高），和踩塌、下坠加速板的声音区分得开
    tramp() { tone(180, 0.26, 'triangle', 0.05, 720); tone(360, 0.2, 'sine', 0.03, 1100); },
    // 自爆脓疱：低频闷响 + 一段噪声，别用 hurt 那种刺耳声
    boom() { noise(0.26, 0.07, 260); tone(90, 0.3, 'sawtooth', 0.06, 44); },
    win() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.26, 'triangle', 0.05), i * 120)); },
    over() { [420, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.05), i * 130)); },
  };
})();

// ---------------------------------------------------------------- 世界
// 平台类型：normal 踩上倒计时塌 / solid 坚固 / frail 一踩就碎 /
//           spike 尖刺（碰到扣血） / belt 传送带 / boost 下坠加速板 /
//           tramp 蹦床跳板（踩上去直接弹回上面几层）
const PT = {
  normal: { a: '#3d5680', b: '#20304b', edge: '#6d8fc4' },
  solid: { a: '#5b6a80', b: '#31404f', edge: '#9fb0c6' },
  frail: { a: '#7d6138', b: '#43331d', edge: '#c9a05d' },
  spike: { a: '#6a3346', b: '#3a1b26', edge: '#d76a7d' },
  belt: { a: '#4a3d78', b: '#282046', edge: '#9b86e0' },
  boost: { a: '#7a6526', b: '#42351a', edge: '#e6c25a' },
  tramp: { a: '#1c5566', b: '#0d2c36', edge: '#67e8e0' },
};

// 井里的怪全部取自《忘却前夜》自带的怪物图鉴（data/dictionary.json 的 monster 表），
// 立绘是原作的 Portrait_Small_Monster_*，名字和行为都对得上：
//   融蚀鼠王  沾满融蚀的尾巴粘在一起，在台面上来回爬 —— 从头顶踩死
//   提灯      提灯教会的象征物，浮在半空按正弦上下飘 —— 踩得准才能踩死
//   自爆脓疱  眼球状的黑色脓泡，「总感觉要爆裂开来」—— 踩上去就开始倒计时，会炸
//   吟诵者    神王的仆人，站在台面上朝你「吟诵」（吐一颗音弹）
//   融蚀野犬  攻击迅猛而连续，跑得比鼠王快一倍，深层替换鼠王
// ah 是画出来的立绘高度，w/h 才是碰撞盒——立绘比判定框大，手感才不别扭。
const MOBK = {
  rat: {
    w: 26, h: 20, ah: 36, pts: 25, stomp: true, c: '#8f78d8', glow: 'rgba(150,120,235,.55)', face0: -1,
    n: '融蚀鼠王', art: 'rat',
    tip: '沾满融蚀的尾巴把它们粘在一起 —— 从上方踩死',
  },
  lantern: {
    w: 22, h: 24, ah: 40, pts: 30, stomp: true, fly: true, c: '#a99cff', glow: 'rgba(160,140,255,.7)',
    n: '提灯', art: 'lantern',
    tip: '浮在半空上下飘 —— 落点算不准，踩空了就挨一下',
  },
  pustule: {
    w: 26, h: 24, ah: 34, pts: 50, stomp: false, still: true, bomb: true, c: '#d6b240',
    glow: 'rgba(214,178,64,.7)', n: '自爆脓疱', art: 'pustule',
    tip: '踩不破 —— 站上去就开始倒计时，跳开或者吃爆炸',
  },
  chanter: {
    w: 24, h: 26, ah: 42, pts: 45, stomp: true, shoot: 2.4, c: '#9692e8', glow: 'rgba(150,146,232,.72)', face0: -1,
    n: '吟诵者', art: 'chanter',
    tip: '你在它下面时会「吟诵」出一颗音弹打过来',
  },
  hound: {
    w: 30, h: 20, ah: 36, pts: 40, stomp: true, fast: true, c: '#d24a4a', glow: 'rgba(210,74,74,.72)', face0: 1,
    n: '融蚀野犬', art: 'hound',
    tip: '攻击迅猛而连续 —— 跑得比鼠王快一倍，别站在它前面',
  },
};

// 掉落物类型。除了回血/狂气/护盾，新加了缓降、加分和清场三种。
const ORBK = {
  heart:    { n: '血羽',   c: '#ef6a60' },
  bigheart: { n: '大血羽', c: '#ff8f9c' },
  rage:     { n: '狂气晶', c: '#b79bff' },
  shield:   { n: '护盾',   c: '#6fe3e3' },
  feather:  { n: '羽落',   c: '#cfe4ff' },
  star:     { n: '星屑',   c: '#e3b341' },
  purge:    { n: '净化',   c: '#8bf0c0' },
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
  const pl = { x, y, w, type, fuse: 0, fuseMax: 1, dead: false, dir: Math.random() < 0.5 ? -1 : 1, hit: 0, cd: 0 };
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
  // 权重表（原来是一串累加阈值，深层的和会超过 1，把 normal 挤没了）。
  // 尖刺台的权重乘难度系数，最高档刺多到几乎每层都有。
  // 蹦床始终有一点，深层的稍多：越往下越需要它把"掉太快"的那几层拉回来。
  const w = {
    frail: 20 + 8 * t,
    spike: (9 + 18 * t) * D.spike,
    belt: 13 + 12 * t,
    boost: 10,
    tramp: 6 + 5 * t,
    solid: 14 - 6 * t,
    normal: 42 - 30 * t,
  };
  let sum = 0;
  for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'normal';
}

// 掉落判定：基础概率乘难度掉落系数，再按权重挑种类。
// star / purge 只在深处出现，免得前几层就白送清场。
function rollOrb(y01) {
  if (Math.random() > BAL.drop * D.drop) return null;
  const w = {
    heart: 22,
    bigheart: 2 + 3 * y01,
    rage: 20,
    shield: 9,
    feather: 8,
    star: 6 + 12 * y01,
    purge: 2 + 6 * y01,
  };
  let sum = 0;
  for (const k in w) sum += w[k];
  let r = Math.random() * sum;
  for (const k in w) { r -= w[k]; if (r <= 0) return k; }
  return 'heart';
}

// 井里出现哪些怪：5 层起是鼠王，14 层加提灯，30 层加吟诵者，38 层加自爆脓疱，
// 62 层之后鼠王开始被融蚀野犬顶掉（它俩行为一样，野犬快一倍、分数更高）。
function rollMob(n) {
  const bag = ['rat', 'rat'];
  if (n >= 14) bag.push('rat', 'lantern');
  if (n >= 30) bag.push('lantern', 'chanter');
  if (n >= 38) bag.push('pustule', 'pustule');
  if (n >= 52) bag.push('pustule', 'chanter', 'lantern');
  if (n >= 62) bag.push('hound', 'hound', 'pustule');
  return pick(bag);
}

function buildWorld() {
  G.plats = []; G.mobs = []; G.orbs = []; G.shots = [];
  G.parts = []; G.texts = []; G.fx = [];
  G.camY = 0; G.depth = 0; G.cur = 0; G.score = 0; G.kills = 0;
  G.rage = BAL.rageStart; G.freezeT = 0; G.shake = 0; G.flash = 0; G.tramps = 0;
  for (const k in G.cd) G.cd[k] = 0;

  P.hpMax = D.hp;
  Object.assign(P, {
    x: VW / 2, y: TOP, vx: 0, vy: 0, face: 1, ground: null, ignore: null, ignoreT: 0,
    hp: D.hp, invuln: 0, dashT: 0, wardT: 0, hurtT: 0, featherT: 0, shieldT: 0,
  });

  // 起跳台：够宽，开局不用抢
  addPlat(VW / 2 - 82, TOP, 164, 'solid');

  let anchor = VW / 2;
  let spikeRun = 0;            // 连续几层的侧边平台带尖刺，用来掐掉"必死排列"
  for (let n = 1; n <= GOAL; n++) {
    const y = TOP + n * GAP;
    // 难度曲线不再线性爬：t 开 1.3 次方，前 25 层只是「热身段」，中间 40 层是主菜，
    // 最后 35 层才开始真的压人。线性的话前 10 层就已经窄到站不住，
    // 新手根本活不过第一个十层。
    const t = n / GOAL;
    const tEase = Math.pow(t, 1.3);

    // ---- 段落节拍：每 10 层一段，段首「喘息层」、段尾两层「关卡层」
    //   喘息层：宽台、没怪、必掉一件恢复品 —— 每十层能回一口气
    //   关卡层：窄台、更容易碎、至少一只怪 —— 每段的高潮
    // 一条道匀速变难会变成「慢慢被磨死」，有起伏才有「这波我顶过去了」的爽点。
    const segIn = (n - 1) % 10;
    const breathe = segIn === 0 && n >= 11;
    const choke = segIn === 8 || segIn === 9;

    let pw = (94 - 46 * tEase) * D.pw;
    if (breathe) pw *= 1.45;
    if (choke) pw *= 0.86;
    // 留一个 38px 下限——再窄就站不住人了
    pw = Math.max(38, Math.round(pw + rnd(-8, 8)));

    // 相邻层中心最多错开 reach：从上一层自由落体约 0.36s，横向够跑 RUN*0.36
    const reach = (76 - 30 * tEase) * (breathe ? 1.3 : choke ? 0.88 : 1);
    const cx = clamp(anchor + rnd(-reach, reach), WALL + pw / 2 + 6, VW - WALL - pw / 2 - 6);
    // 主路径平台从来不会是尖刺台（那等于每层都必死），但可以偶尔是蹦床：
    // 踩上去被弹回上面几层，是「我掉太快了」时唯一的自救手段。
    let mainType = 'normal';
    if (breathe) mainType = 'solid';
    else {
      const r = Math.random();
      if (r < 0.09) mainType = 'tramp';
      else if (r < 0.24 + 0.22 * tEase) mainType = 'solid';
    }
    const mainPlat = addPlat(cx - pw / 2, y, pw, mainType);
    // 喘息层打个标记：画的时候会给它一圈暖色的"安全区"光晕，
    // 让玩家能提前看见「下一块是能歇脚的地方」，而不是全靠记层号。
    if (breathe) mainPlat.zen = 1;
    anchor = cx;

    // 侧边再补 0~2 个，类型随层数变刁（喘息层不加，留着让人喘气）
    const extra = breathe ? 0 : Math.random() < 0.42 ? 0 : Math.random() < 0.62 ? 1 : 2;
    let spikeHere = 0;
    for (let i = 0; i < extra; i++) {
      for (let tryN = 0; tryN < 6; tryN++) {
        const w2 = Math.max(34, Math.round((rnd(52, 82) - 12 * tEase) * D.pw));
        const x2 = rnd(WALL + 4, VW - WALL - w2 - 4);
        if (hasOverlap(x2, w2, y)) continue;
        let type = rollType(tEase);
        // 掐尖刺连段：已经连着两层各有两块以上的尖刺台，这一层就不再添刺。
        // 不掐的话会出现「三整层全是刺、没有一个落脚点」的无解排列。
        if (type === 'spike' && spikeRun >= 2) type = Math.random() < 0.5 ? 'frail' : 'normal';
        if (type === 'spike') spikeHere++;
        // 关卡层的普通台换成脆台，踩上去就得马上走
        if (choke && type === 'normal' && Math.random() < 0.35) type = 'frail';
        addPlat(x2, y, w2, type);
        break;
      }
    }
    spikeRun = spikeHere >= 2 ? spikeRun + 1 : 0;

    // ---- 井里的怪
    // （平台宽度门槛放到 46：困难/癫狂的平台只有 40~50px，门槛卡 60 会让
    //   高难度反而见不到几只怪，跟"越难越凶"正好反着）
    // 喘息层不刷怪；关卡层强制来一只，其余按概率。
    const wantMob = !breathe && n >= 5 && (choke || Math.random() < (0.12 + 0.36 * tEase) * D.mob);
    if (wantMob) {
      // 平台宽度门槛 38：癫狂档的台子只有 47~53px，卡 46 会让最高难度反而
      // 比困难档少几只怪（实测 40 → 38），跟「越难越凶」正好反着。
      // 怪的实际宽度在下面按平台宽度收，不会站出台面。
      const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike' && p.type !== 'tramp' && p.w >= 38);
      if (host.length) {
        const h = pick(host);
        const kind = rollMob(n);
        const k = MOBK[kind];
        const w = Math.max(16, Math.min(k.w, h.w - 10));
        const cx2 = h.x + h.w / 2;
        if (k.fly) {
          // 提灯浮在平台上方：不给落脚点，也不占平台宽度
          G.mobs.push({
            kind, x: cx2, y: h.y - 40, by: h.y - 40, w, h: k.h, ah: k.ah,
            x0: WALL + w, x1: VW - WALL - w, vx: rnd(40, 70) * (Math.random() < 0.5 ? -1 : 1),
            ph: rnd(0, 6), dead: false, hit: 0, armT: 0,
          });
        } else {
          const spd = k.fast ? rnd(72, 108) : rnd(30, 58);
          G.mobs.push({
            kind, x: cx2, y: h.y, w, h: k.h, ah: k.ah,
            x0: h.x + w / 2, x1: h.x + h.w - w / 2,
            vx: k.still ? 0 : spd * (Math.random() < 0.5 ? -1 : 1),
            ph: rnd(0, 6), sc: rnd(1.2, 3.4), dead: false, hit: 0, armT: 0,
          });
        }
      }
    }

    // ---- 道具：喘息层必掉一件恢复品，其余按概率
    const kind = breathe ? (n % 20 === 1 ? 'bigheart' : 'heart') : rollOrb(t);
    if (kind) {
      const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike');
      const h = host.length ? pick(host) : null;
      if (h) G.orbs.push({ x: h.x + h.w / 2, y: h.y - 22, kind, ph: rnd(0, 6), dead: false });
    }
  }

  // 深层多给点血包，否则 60 层之后纯属挨打
  for (let n = 45; n <= GOAL; n += 20) {
    const y = TOP + n * GAP;
    const host = G.plats.filter((p) => Math.abs(p.y - y) < 1 && p.type !== 'spike');
    if (host.length) {
      const kind = D.dmg > 1 ? 'bigheart' : 'heart';
      G.orbs.push({ x: pick(host).x + 30, y: y - 22, kind, ph: rnd(0, 6), dead: false });
    }
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
// pierce = 穿透那 0.85 秒的受伤无敌。目前只有自爆脓疱的爆炸用它：
// 玩家往往是"先撞上脓疱挨一下 → 0.45 秒后它炸"，如果爆炸也被无敌吃掉，
// 这个机制等于不存在 —— 引信点了却永远炸不到人。
function hurtP(amount, cause, pierce) {
  if (G.state !== 'play') return;
  const p = P;
  if (p.invuln > 0 && !pierce) return;
  // 难度只改伤害系数，不改判定：简单档挨一下没那么疼，癫狂档一样的位置双倍疼
  let dmg = amount * D.dmg;
  if (p.wardT > 0) dmg *= 0.5;
  p.hp -= dmg;
  // 爆炸不刷新无敌，否则同一次爆炸里被别的怪撞到也免了，连锁起来太便宜
  if (!pierce) p.invuln = 0.85;
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
  // 蹦床跳板：不塌，踩上去直接弹回去四层左右。
  // 弹起来会撞顶刺（镜头只往下滚，上面永远在压），所以它不是白给的好处——
  // 是「我掉太快了、快扎到井底尖刺」时唯一能把距离拉回来的东西。
  //
  // 弹完有 1.8 秒复位（cd）：不加这个的话，玩家被弹起来、沿原路落回同一块
  // 蹦床、再被弹起来，会卡在原地无限弹——实测机器人在 5 秒里被弹了 13 次、
  // 一层都没往下走。复位期间它当一块坚固台用，玩家可以站着走开。
  if (pl.type === 'tramp') {
    if (pl.cd > 0) {
      p.y = pl.y; p.vy = 0; p.ground = pl;
      return;
    }
    p.y = pl.y; p.vy = -TRAMP; p.ground = null;
    p.invuln = Math.max(p.invuln, 0.4);
    pl.hit = 1;
    pl.cd = 1.8;
    G.shake = Math.max(G.shake, 4);
    G.tramps = (G.tramps || 0) + 1;
    spark(p.x, pl.y, 16, '#67e8e0', 260, 0.5);
    floatText(p.x, pl.y - 14, '弹起', '#67e8e0');
    if (!G.hint.tramp) {
      G.hint.tramp = 1;
      toast('蹦床把你弹回上面几层——掉太急时用它救一下');
    }
    Snd.tramp();
    return;
  }
  p.y = pl.y; p.vy = 0; p.ground = pl;
  if (pl.type === 'boost') {
    p.ground = null; p.vy = 600; p.invuln = Math.max(p.invuln, 0.15);
    spark(p.x, pl.y, 12, '#e6c25a', 240, 0.5);
    Snd.boost();
    return;
  }
  if (pl.type !== 'solid' && pl.type !== 'belt' && pl.type !== 'tramp' && pl.fuse <= 0) {
    pl.fuseMax = pl.fuse = (pl.type === 'frail' ? 0.38 : 0.92) * D.fuse;
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
  const k = MOBK[m.kind] || MOBK.rat;
  const pts = Math.round(k.pts * D.sc);
  G.score += pts;
  G.rage = Math.min(100, G.rage + Math.round(BAL.rageKill * D.rage));
  floatText(m.x, m.y - 30, '+' + pts, '#e3b341');
  spark(m.x, m.y - m.h / 2, 14, k.c, 230, 0.55);
  Snd.kill();
  meet(m.kind, k);
  if (byPlayer && Math.random() < 0.35) {
    // 踩死的怪有概率掉东西，给「玩得凶」一点回报
    G.orbs.push({ x: m.x, y: m.y - 26, kind: pick(['rage', 'rage', 'star', 'feather']), ph: 0, dead: false });
  }
}

// 统一入口：脓疱不能「被杀死」，只能被引爆 —— 踩碎它、技能清它，
// 都要走爆炸流程，否则一个踩下去本该炸的东西就这么没了很出戏。
function killAny(m, byPlayer) {
  if (m.dead) return;
  if (MOBK[m.kind] && MOBK[m.kind].bomb) explodePustule(m);
  else killMob(m, byPlayer);
}

// 第一次见到某种怪时，用顶部提示条报一下名字和它的脾气 —— 比在角落里
// 挂一行图例有用：玩家是在挨打的那一刻才真的记住「这玩意儿不能踩」。
function meet(kind, k) {
  if (G.met[kind]) return;
  G.met[kind] = 1;
  castSkill(k.n, k.tip);
}

// 自爆脓疱炸开：范围伤害 + 冲击波。躲开了才给分 —— 硬顶着挨炸不给，
// 不然「往脓疱身上站」反而成了刷分手段。
function explodePustule(m) {
  if (m.dead) return;
  const p = P;
  const hit = Math.abs(m.x - p.x) < 56 && Math.abs(m.y - p.y) < 60;
  m.dead = true;
  G.kills++;
  spark(m.x, m.y - 14, 26, '#ffb055', 330, 0.7);
  spark(m.x, m.y - 14, 14, '#ff6a4a', 210, 0.55);
  G.shake = Math.max(G.shake, 11);
  G.flash = Math.max(G.flash, 0.28);
  G.rage = Math.min(100, G.rage + Math.round(BAL.rageKill * D.rage));
  Snd.boom();
  meet(m.kind, MOBK.pustule);
  if (hit) {
    hurtP(20, 'boom', true);
  } else {
    const pts = Math.round(MOBK.pustule.pts * 0.6 * D.sc);
    G.score += pts;
    floatText(m.x, m.y - 34, '躲开了 +' + pts, '#8bf0c0');
  }
}

function pickOrb(o) {
  o.dead = true;
  const p = P;
  if (o.kind === 'heart' || o.kind === 'bigheart') {
    const add = o.kind === 'bigheart' ? BAL.bigHeal : BAL.heal;
    p.hp = Math.min(p.hpMax, p.hp + add);
    floatText(o.x, o.y - 8, '+' + add + ' HP', '#7ee08a');
    spark(o.x, o.y, o.kind === 'bigheart' ? 18 : 12, '#7ee08a', 170, 0.55);
  } else if (o.kind === 'rage') {
    const add = Math.round(BAL.rageOrb * D.rage);
    G.rage = Math.min(100, G.rage + add);
    floatText(o.x, o.y - 8, '+' + add + ' 狂气', '#b79bff');
    spark(o.x, o.y, 12, '#b79bff', 170, 0.55);
  } else if (o.kind === 'shield') {
    p.invuln = Math.max(p.invuln, 3.2);
    p.shieldT = 3.2;
    floatText(o.x, o.y - 8, '护盾 3.2s', '#6fe3e3');
    spark(o.x, o.y, 14, '#6fe3e3', 180, 0.6);
  } else if (o.kind === 'feather') {
    // 羽落：四秒内下坠速度减半，用来安全落到下一层的窄台上
    p.featherT = 4.2;
    floatText(o.x, o.y - 8, '羽落 4s', '#cfe4ff');
    spark(o.x, o.y, 14, '#cfe4ff', 130, 0.7);
  } else if (o.kind === 'star') {
    const add = Math.round(150 * D.sc);
    G.score += add;
    floatText(o.x, o.y - 8, '+' + add + ' 分', '#e3b341');
    spark(o.x, o.y, 14, '#e3b341', 190, 0.6);
  } else if (o.kind === 'purge') {
    // 净化：视野里的怪物全清，还白送一层狂气
    let n = 0;
    for (const m of G.mobs) {
      if (!m.dead && m.y > G.camY - 40 && m.y < G.camY + VH + 40) {
        if (MOBK[m.kind] && MOBK[m.kind].bomb) { explodePustule(m); } else { killMob(m, false); }
        n++;
      }
    }
    G.rage = Math.min(100, G.rage + Math.round(BAL.ragePurge * D.rage));
    floatText(o.x, o.y - 8, n ? `净化 ${n}` : '净化', '#8bf0c0');
    spark(o.x, o.y, 20, '#8bf0c0', 240, 0.75);
    G.shake = Math.max(G.shake, 5);
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
  // 演出里不再重复印技能名：头顶的 cast 条已经写了名字和这一下的效果
  spawnFx(s.anim, id === 'burst' ? 236 : 200, id === 'burst' ? 1.7 : 1.3);
  Snd.skill();
  const btn = btnOf[id];
  if (btn) { btn.el.classList.remove('flash'); void btn.el.offsetWidth; btn.el.classList.add('flash'); }
  const p = P;
  const inView = (o) => o.y > G.camY - 40 && o.y < G.camY + VH + 40;
  let killed = 0;

  if (id === 'dash') {
    p.dashT = 0.32; p.vx = p.face * 830; p.invuln = Math.max(p.invuln, 0.5);
    G.shake = Math.max(G.shake, 5);
    spark(p.x, p.y - 16, 12, '#9fd0ff', 260, 0.4);
    // 沿途撞碎怪物这件事在 update 的接触判定里做（p.dashT > 0 就碾过去），
    // 不在这里按距离预杀——那样会隔着平台杀掉还没撞到的怪
    castSkill(s.n, '突进 · 沿途怪物全部撞碎');
  } else if (id === 'star') {
    for (const m of G.mobs) if (!m.dead && inView(m)) { killAny(m); killed++; }
    // 尖刺台被星矛拍平，顺便给玩家开条路
    let flat = 0;
    for (const pl of G.plats) {
      if (!pl.dead && pl.type === 'spike' && inView(pl)) {
        pl.type = 'normal'; pl.fuse = 0; pl.fuseMax = 1.05 * D.fuse;
        spark(pl.x + pl.w / 2, pl.y, 8, '#c9a05d', 200, 0.5);
        flat++;
      }
    }
    G.shake = Math.max(G.shake, 9);
    castSkill(s.n, `击破 ${killed} 只 · 拍平 ${flat} 块尖刺台`);
  } else if (id === 'ward') {
    const before = p.hp;
    p.hp = Math.min(p.hpMax, p.hp + BAL.wardHeal);
    p.wardT = 6; p.invuln = Math.max(p.invuln, 1.2);
    const heal = Math.round(p.hp - before);
    floatText(p.x, p.y - 46, '+' + heal + ' HP', '#7ee08a');
    spark(p.x, p.y - 16, 18, '#9ff0d8', 190, 0.7);
    castSkill(s.n, heal ? `回 ${heal} 血 · 6 秒内受伤减半` : '满血 · 6 秒内受伤减半');
  } else if (id === 'burst') {
    for (const m of G.mobs) if (!m.dead && inView(m)) { killAny(m); killed++; }
    G.freezeT = 4.5;
    p.invuln = Math.max(p.invuln, 3);
    G.shake = Math.max(G.shake, 14);
    spark(p.x, p.y - 20, 30, '#b79bff', 320, 0.8);
    castSkill(s.n, `4.5 秒清场 · 击破 ${killed} 只 · 平台不塌`);
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
  p.featherT = Math.max(0, p.featherT - dt);
  p.shieldT = Math.max(0, p.shieldT - dt);
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
    // 羽落期间重力只有四成、终端速度砍半：用来从高台安全落到下一层窄台
    const grav = p.featherT > 0 ? GRAV * 0.40 : GRAV;
    const vmax = p.featherT > 0 ? VMAX * 0.44 : VMAX;
    p.vy = Math.min(p.vy + grav * dt, vmax);
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
    if (pl.cd > 0) pl.cd = Math.max(0, pl.cd - dt);
    if (pl.dead || pl.fuse <= 0 || G.freezeT > 0) continue;
    pl.fuse -= dt;
    if (pl.fuse <= 0) shatter(pl);
  }

  // ---- 井里的怪：五种各有各的动法
  for (const m of G.mobs) {
    if (m.dead) continue;
    if (m.y < G.camY - 300 || m.y > G.camY + VH + 300) continue;
    const k = MOBK[m.kind] || MOBK.rat;
    m.ph += dt * (k.fly ? 2.1 : k.fast ? 5.2 : 3.4);
    if (m.hit > 0) m.hit = Math.max(0, m.hit - dt * 2.5);

    if (k.fly) {
      // 提灯：横着巡逻，纵向按正弦飘，所以同一个位置永远抓不准
      m.x += m.vx * dt;
      if (m.x <= m.x0) { m.x = m.x0; m.vx = Math.abs(m.vx); }
      if (m.x >= m.x1) { m.x = m.x1; m.vx = -Math.abs(m.vx); }
      m.y = m.by + Math.sin(m.ph) * 15;
    } else if (!k.still) {
      m.x += m.vx * dt;
      if (m.x <= m.x0) { m.x = m.x0; m.vx = Math.abs(m.vx); }
      if (m.x >= m.x1) { m.x = m.x1; m.vx = -Math.abs(m.vx); }
    }

    // 吟诵者：玩家在下方时开始「吟诵」，弹道往人身上瞄
    if (k.shoot && p.y > m.y) {
      m.sc -= dt;
      if (m.sc <= 0) {
        m.sc = k.shoot * rnd(0.75, 1.3);
        const sx = m.x, sy = m.y - m.h * 0.45;
        const dx = p.x - sx, dy = (p.y - 14) - sy;
        const d = Math.hypot(dx, dy) || 1;
        G.shots.push({ x: sx, y: sy, vx: dx / d * 215, vy: dy / d * 215, life: 3.6, dead: false, ph: 0 });
        spark(sx, sy, 4, k.c, 90, 0.3);
      }
    }

    // 自爆脓疱：玩家靠近才开始鼓胀，0.45 秒后炸。
    // 一旦点着（lit）就锁定，不会因为玩家跑开而缩回去 —— 「自爆」是它的
    // 特性，不是玩家的选择；玩家能选的只有「跑出爆炸半径」。
    // 这段预警是给人看的：看见鼓起来还有 0.45 秒可以跳开。
    if (k.bomb) {
      if (m.lit) {
        m.armT += dt;
      } else {
        const near = Math.abs(m.x - p.x) < 34 && Math.abs(m.y - p.y) < 42;
        if (near) { m.lit = 1; m.armT += dt; }
      }
      if (m.armT >= 0.45) { explodePustule(m); continue; }
    }

    const ox = Math.abs(m.x - p.x) < (m.w + p.w) / 2 - 3;
    const oy = p.y > m.y - m.h && p.y - p.h < m.y;
    if (ox && oy) {
      // 突进中撞上去 = 直接碾碎（掠影斩卖的就是这个）
      if (p.dashT > 0) { killAny(m, true); continue; }
      // 自爆脓疱撞不得也踩不破：碰到它只是把引信点着（0.3 秒后炸），
      // 不额外造成撞击伤害 —— 它的威胁是"炸"，不是"撞"。
      // 这样玩家撞上去时还有 0.3 秒可以跳开，躲开才算真躲开。
      if (k.bomb) {
        m.lit = 1;
        m.armT = Math.max(m.armT, 0.30);
        const s2 = p.x < m.x ? -1 : 1;
        p.vx = s2 * 190; p.vy = -190; p.ground = null;
        spark(p.x, p.y - 14, 6, k.c, 150, 0.4);
        continue;
      }
      // 从上方落下来 = 踩死
      const fromTop = p.vy > 80 && p.y - p.h < m.y - m.h * 0.3;
      if (k.stomp && fromTop) {
        killMob(m, true);
        p.vy = -330;
      } else {
        hurtP(k.stomp ? 14 : 18, 'mob');
        const s = p.x < m.x ? -1 : 1;
        p.vx = s * 260; p.vy = -140; p.ground = null;
      }
    }
  }

  // ---- 吟诵者吐出来的音弹
  for (const s of G.shots) {
    if (s.dead) continue;
    s.life -= dt;
    s.ph += dt * 12;
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.life <= 0 || s.y > G.camY + VH + 40 || s.y < G.camY - 80) { s.dead = true; continue; }
    if (Math.abs(s.x - p.x) < p.w / 2 + 5 && s.y > p.y - p.h - 3 && s.y < p.y + 5) {
      s.dead = true;
      hurtP(9, 'shot');
      spark(s.x, s.y, 8, '#dcb654', 170, 0.4);
    }
  }
  if (G.shots.some((s) => s.dead)) G.shots = G.shots.filter((s) => !s.dead);

  // ---- 道具
  for (const o of G.orbs) {
    if (o.dead) continue;
    o.ph += dt * 2.4;
    if (Math.abs(o.x - p.x) < 20 && Math.abs(o.y - (p.y - 15)) < 24) pickOrb(o);
  }

  // ---- 镜头：只由滚速推进，不跟着玩家跑。
  // 这样一来顶刺（推你下）和井底尖刺（拦你下）就把人夹在中间：
  // 蹿得太狠会扎在井底尖刺上，站着不动会被顶刺推下去。层数也就是镜头推进的深度。
  const scroll = (68 + G.cur * 0.32) * D.scroll;
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
    G.score += Math.round((10 + Math.floor(cur / 10) * 5) * D.sc);
    G.rage = Math.min(100, G.rage + BAL.rageDepth * D.rage);
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

  // 喘息层的安全区光晕：一圈很淡的青绿，和尖刺台的红、蹦床的青区分得开。
  // 必须用椭圆路径填（早先用 fillRect 把径向渐变框住，四条边被切成了直角的方块）。
  if (pl.zen) {
    const pulse = 0.5 + 0.5 * Math.sin(G.t * 2.2);
    const zx = x + pl.w / 2;
    const rx = pl.w * 0.56, ry = pl.w * 0.30;
    const zg = ctx.createRadialGradient(zx, y, 2, zx, y, rx);
    zg.addColorStop(0, `rgba(126,224,150,${0.20 + pulse * 0.12})`);
    zg.addColorStop(0.6, `rgba(126,224,150,${0.07 + pulse * 0.05})`);
    zg.addColorStop(1, 'rgba(126,224,150,0)');
    ctx.fillStyle = zg;
    ctx.beginPath();
    ctx.ellipse(zx, y - ry * 0.25, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(170,248,190,${0.5 + pulse * 0.35})`;
    ctx.beginPath(); ctx.arc(x + 7, y + hgt / 2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + pl.w - 7, y + hgt / 2, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  // 底座阴影
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  roundRect(x + 2, y + 4, pl.w, hgt, 6); ctx.fill();

  const g = ctx.createLinearGradient(0, y, 0, y + hgt);
  g.addColorStop(0, pal.a); g.addColorStop(1, pal.b);
  ctx.fillStyle = g;
  roundRect(x, y, pl.w, hgt, 6); ctx.fill();
  // 台面顶线：深色井里平台全靠这一条亮边被认出来
  ctx.fillStyle = pl.zen ? 'rgba(178,248,200,.9)' : pal.edge;
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
  } else if (pl.type === 'tramp') {
    // 蹦床：台面上一排弹簧圈 + 中间一个朝上的箭头。弹完 1.8 秒复位，
    // 复位期间弹簧压扁、箭头变暗 —— 玩家一眼能看出「这块现在踩了不弹」。
    const ready = pl.cd <= 0;
    const sq = pl.hit > 0 ? Math.sin((1 - pl.hit) * Math.PI) : 0;
    const hgt2 = ready ? 1 : 0.34;                 // 复位中弹簧只剩三成高
    const top = y - sq * 6;
    ctx.strokeStyle = ready ? 'rgba(103,232,224,.9)' : 'rgba(103,232,224,.35)';
    ctx.lineWidth = ready ? 1.6 : 1.1;
    const coils = Math.max(2, Math.floor(pl.w / 12));
    for (let i = 0; i < coils; i++) {
      const sx = x + 6 + i * ((pl.w - 12) / Math.max(1, coils - 1));
      const ch = (9 + sq * 4) * hgt2;
      ctx.beginPath();
      ctx.moveTo(sx, top);
      ctx.quadraticCurveTo(sx + 3 * hgt2, top - ch * 0.55, sx, top - ch);
      ctx.stroke();
    }
    if (ready) {
      // 朝上的箭头：一眼看出这是往上弹的，不是往下掉的
      const ay = top - 13 - sq * 5;
      ctx.fillStyle = 'rgba(150,255,246,.92)';
      ctx.beginPath();
      ctx.moveTo(x + pl.w / 2, ay);
      ctx.lineTo(x + pl.w / 2 - 5.5, ay + 7);
      ctx.lineTo(x + pl.w / 2 + 5.5, ay + 7);
      ctx.closePath(); ctx.fill();
    }
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
  if (y < -80 || y > VH + 80) return;
  const k = MOBK[m.kind] || MOBK.rat;
  const rect = MOB_RECT[k.art];
  const bob = Math.sin(m.ph) * (k.fly ? 2.2 : 1.1);
  const cx = m.x;
  const footY = y + bob;

  // 自爆脓疱的倒计时：越接近爆炸鼓起得越大
  const swell = m.armT > 0 ? 1 - Math.min(1, m.armT / 0.45) : 0;
  const ah = k.ah * (1 + swell * 0.20);

  ctx.save();

  // 脚下投影：立绘是「站」在台上，不是浮着的
  ctx.fillStyle = 'rgba(0,0,0,.34)';
  ctx.beginPath();
  ctx.ellipse(cx, y + 1, m.w * 0.44, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // 背后一圈本色光晕：原作立绘偏暗，深色井里全靠这层把轮廓托出来
  const gr = ah * 0.66;
  const gg = ctx.createRadialGradient(cx, footY - ah * 0.5, 2, cx, footY - ah * 0.5, gr);
  gg.addColorStop(0, k.glow);
  gg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.ellipse(cx, footY - ah * 0.5, gr, gr * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  // 原作立绘本体（雪碧图里的一条），底对齐、朝哪边跑就翻哪边
  if (rect && mobOk) {
    const w = ah * rect.w / rect.h;
    ctx.save();
    ctx.translate(cx, footY);
    // 原图朝 face0，要显示成巡逻方向：两者不一致才翻。
    // （鼠王的头在左边、野犬的头在右边，一律按 vx 翻会让其中一只倒着跑）
    const want = m.vx > 1 ? 1 : m.vx < -1 ? -1 : (k.face0 || 1);
    if (want !== (k.face0 || 1)) ctx.scale(-1, 1);
    ctx.shadowColor = k.glow;
    ctx.shadowBlur = m.hit > 0 ? 22 : 9;
    ctx.drawImage(mobSheet, rect.x, rect.y, rect.w, rect.h, -w / 2, -ah, w, ah);
    ctx.restore();
  }

  // 挨打 / 快炸的时候整个人发白光：比整只变白干净
  if (m.hit > 0 || swell > 0.55) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.max(m.hit * 0.5, swell > 0.55 ? (swell - 0.55) * 0.7 : 0);
    ctx.fillStyle = swell > 0.55 ? '#ff8a6a' : '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx, footY - ah * 0.48, m.w * 0.55, ah * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  // 快开火时脚下亮一下，提醒「它在瞄你」
  if (k.shoot && m.sc != null && m.sc < 0.6) {
    ctx.globalAlpha = 0.55 + 0.45 * Math.sin(G.t * 22);
    ctx.fillStyle = k.c;
    ctx.beginPath();
    ctx.ellipse(cx, footY - ah * 0.82, 3.4, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 自爆倒计时：外面套一圈会收紧的橙红光环，再加一层随心跳的两层光
  // （原来只有一道细红环，在暗井里几乎看不见 —— 而它恰恰是"要炸了"的唯一预警）
  if (m.armT > 0) {
    const beat = 0.5 + 0.5 * Math.sin(G.t * (10 + swell * 26));
    ctx.save();
    ctx.strokeStyle = `rgba(255,120,80,${0.45 + swell * 0.5})`;
    ctx.lineWidth = 2.6;
    ctx.shadowColor = 'rgba(255,120,70,.9)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.ellipse(cx, footY - ah * 0.45, m.w * 0.5 + 22 * (1 - swell), ah * 0.58 + 8 * (1 - swell), 0, 0, Math.PI * 2);
    ctx.stroke();
    // 心跳光圈
    ctx.strokeStyle = `rgba(255,170,110,${(0.15 + swell * 0.35) * beat})`;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.ellipse(cx, footY - ah * 0.45, m.w * 0.62 + 30 * (1 - swell), ah * 0.7 + 12 * (1 - swell), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawShot(s) {
  const y = s.y - G.camY;
  if (y < -30 || y > VH + 30) return;
  const a = Math.atan2(s.vy, s.vx);
  ctx.save();
  ctx.translate(s.x, y);
  ctx.rotate(a);
  // 吟诵者的音弹：一颗带拖尾的青紫光点，和「刺」区分开
  const grd = ctx.createLinearGradient(-18, 0, 6, 0);
  grd.addColorStop(0, 'rgba(150,146,232,0)');
  grd.addColorStop(1, 'rgba(180,176,255,.75)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(-18, -2.6); ctx.lineTo(2, -1.4); ctx.lineTo(2, 1.4); ctx.lineTo(-18, 2.6);
  ctx.closePath(); ctx.fill();
  ctx.shadowColor = 'rgba(170,160,255,.9)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#cfc8ff';
  ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath(); ctx.arc(0, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawOrb(o) {
  const y = o.y - G.camY + Math.sin(o.ph) * 3;
  if (y < -40 || y > VH + 40) return;
  const x = o.x;
  const c = (ORBK[o.kind] || ORBK.heart).c;
  ctx.save();
  ctx.shadowColor = c;
  ctx.shadowBlur = o.kind === 'bigheart' ? 16 : 11;
  ctx.fillStyle = c;

  if (o.kind === 'heart' || o.kind === 'bigheart') {
    const s = o.kind === 'bigheart' ? 1.42 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + 6 * s);
    ctx.bezierCurveTo(x - 9 * s, y - 1 * s, x - 7 * s, y - 9 * s, x, y - 4.5 * s);
    ctx.bezierCurveTo(x + 7 * s, y - 9 * s, x + 9 * s, y - 1 * s, x, y + 6 * s);
    ctx.fill();
    if (o.kind === 'bigheart') {
      // 大血羽多一圈脉动的光环，隔着半个屏幕就看得出来
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,170,185,.72)';
      ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(x, y, 11 + Math.sin(o.ph * 2) * 2, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (o.kind === 'rage') {
    ctx.beginPath();
    ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath();
    ctx.moveTo(x, y - 4); ctx.lineTo(x + 2.2, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 2.2, y);
    ctx.closePath(); ctx.fill();
  } else if (o.kind === 'shield') {
    ctx.shadowBlur = 12;
    ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(111,227,227,.18)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      const px = x + Math.cos(a) * 7.4, py = y + Math.sin(a) * 7.4;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (o.kind === 'feather') {
    // 一根羽毛：缓降用
    ctx.translate(x, y);
    ctx.rotate(-0.55);
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.quadraticCurveTo(6.4, -2, 0, 9);
    ctx.quadraticCurveTo(-6.4, -2, 0, -9);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(70,105,160,.9)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -7.5); ctx.lineTo(0, 9); ctx.stroke();
  } else if (o.kind === 'star') {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 ? 3.4 : 8.6;
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  } else {
    // 净化：一个亮芯 + 四道散开的射线
    ctx.beginPath(); ctx.arc(x, y, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = 1.6;
    const k = 8 + Math.sin(o.ph * 2.4) * 1.6;
    for (let i = 0; i < 4; i++) {
      const a = o.ph + i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 5.6, y + Math.sin(a) * 5.6);
      ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
      ctx.stroke();
    }
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
  const low = p.hp <= p.hpMax * 0.3;

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
  // 受伤减免/无敌要看得出来：圣翼护是绿色实心罩，护盾道具是青色虚线环，
  // 两种颜色不一样，玩家才知道现在是不是「减伤」状态
  if (p.wardT > 0) {
    const r = hh * 0.54 + Math.sin(G.t * 5) * 1.5;
    ctx.save();
    const g2 = ctx.createRadialGradient(p.x, sy - hh * 0.45, r * 0.5, p.x, sy - hh * 0.45, r);
    g2.addColorStop(0, 'rgba(111,224,192,0)');
    g2.addColorStop(0.75, 'rgba(111,224,192,.16)');
    g2.addColorStop(1, 'rgba(111,224,192,.42)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(p.x, sy - hh * 0.45, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(140,255,220,.85)';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(p.x, sy - hh * 0.45, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  } else if (p.invuln > 0.5) {
    ctx.save();
    ctx.strokeStyle = 'rgba(111,227,227,.38)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 5]);
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
  for (const s of G.shots) drawShot(s);

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

  // 低血警示暗角（阈值按血量上限算：简单档 120、癫狂档 90 都是三成）
  if (G.state === 'play' && P.hp <= P.hpMax * 0.3) {
    const k = (1 - P.hp / (P.hpMax * 0.3)) * (0.25 + Math.sin(G.t * 5) * 0.08);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.3, VW / 2, VH / 2, VH * 0.66);
    g.addColorStop(0, 'rgba(200,40,40,0)');
    g.addColorStop(1, `rgba(200,40,40,${clamp(k, 0, 0.42)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
  }

  // 狂气爆发期间：紫色暗角 + 顶部剩余秒数，别让人不知道这四秒还剩多久
  if (G.freezeT > 0) {
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.22, VW / 2, VH / 2, VH * 0.8);
    g.addColorStop(0, 'rgba(160,124,255,0)');
    g.addColorStop(1, `rgba(160,124,255,${0.16 + Math.sin(G.t * 8) * 0.05})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);
    ctx.strokeStyle = `rgba(180,150,255,${0.34 + Math.sin(G.t * 8) * 0.12})`;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, VW - 4, VH - 4);

  }
}

// ---------------------------------------------------------------- HUD
const el = {
  lv: $('#lv'), sc: $('#sc'), bs: $('#bs'), dtag: $('#dtag'),
  hpf: $('#hpf'), hpbar: $('#hpbar'), hpv: $('#hpv'), hpm: $('#hpm'),
  rgf: $('#rgf'), rgv: $('#rgv'), face: $('#face'),
  skills: $('#skills'), send: $('#snd'),
  cast: $('#cast'), castN: $('#castN'), castS: $('#castS'),
};
// 状态条的四个格子是写死在 HTML 里的，这里只负责显示/隐藏与秒数
const BUFFS = [
  { k: 'ward', id: 'bf-ward', get: () => P.wardT },
  { k: 'shield', id: 'bf-shield', get: () => P.shieldT },
  { k: 'feather', id: 'bf-feather', get: () => P.featherT },
  { k: 'burst', id: 'bf-burst', get: () => G.freezeT },
];
for (const b of BUFFS) b.el = $('#' + b.id);
const shown = {};

function syncHud() {
  if (shown.lv !== G.depth) { shown.lv = G.depth; el.lv.textContent = G.depth; }
  if (shown.sc !== G.score) { shown.sc = G.score; el.sc.textContent = G.score; }
  const best = Math.max(G.bestLv, G.depth);
  if (shown.bs !== best) { shown.bs = best; el.bs.textContent = best; }

  const hp = Math.round(P.hp);
  if (shown.hp !== hp || shown.hpMax !== P.hpMax) {
    shown.hp = hp; shown.hpMax = P.hpMax;
    el.hpf.style.width = clamp(P.hp / P.hpMax * 100, 0, 100) + '%';
    el.hpv.textContent = hp;
    el.hpm.textContent = '/ ' + P.hpMax;
    const low = hp <= P.hpMax * 0.3;
    el.hpbar.classList.toggle('low', low);
    el.face.classList.toggle('low', low);
  }
  const rg = Math.round(G.rage);
  if (shown.rg !== rg) {
    shown.rg = rg;
    el.rgf.style.width = rg + '%';
    el.rgv.textContent = rg;
  }

  for (const s of SKILLS) {
    const b = btnOf[s.id];
    const cd = G.cd[s.id];
    const poor = G.rage < s.cost;
    const cooling = cd > 0;
    if (b.cdShown !== cooling) { b.cdShown = cooling; b.el.classList.toggle('cooling', cooling); }
    // 扇形遮罩按「剩余比例」收，剩得越少缺口越大
    if (cooling) {
      const p = Math.round(clamp(cd / s.cd, 0, 1) * 100);
      if (b.sweepP !== p) { b.sweepP = p; b.el.style.setProperty('--p', p); }
    }
    if (b.ready !== (!cooling && !poor)) { b.ready = !cooling && !poor; b.el.classList.toggle('ready', b.ready); }
    if (b.poor !== poor) { b.poor = poor; b.el.classList.toggle('poor', poor); }
    const txt = cooling ? (cd >= 1 ? String(Math.ceil(cd)) : cd.toFixed(1)) : '';
    if (b.txt !== txt) { b.txt = txt; b.cd.textContent = txt; }
  }

  // 状态条：有东西才显示，秒数留着一位小数
  for (const b of BUFFS) {
    const v = b.get();
    const on = v > 0.05;
    if (b.on !== on) { b.on = on; b.el.hidden = !on; }
    if (!on) continue;
    const t = v.toFixed(1) + 's';
    if (b.t !== t) { b.t = t; b.el.lastElementChild.textContent = t; }
  }
}

// 技能生效时在画面上方挂一条「名字 + 这次到底发生了什么」。
// 光有演出看不出打到了什么，这样才说得清。
let castTm = 0;
function castSkill(name, sub) {
  el.castN.textContent = name;
  el.castS.textContent = sub;
  el.cast.classList.add('on');
  clearTimeout(castTm);
  castTm = setTimeout(() => el.cast.classList.remove('on'), 1100);
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast.tm);
  toast.tm = setTimeout(() => t.classList.remove('on'), 1400);
}

// ---------------------------------------------------------------- 流程
// 存档按难度分开：简单档一局能到 100 层，混在一起记会把困难档的纪录冲掉。
// 老版本只有一个全局 bestLv/best；只有「四档一条记录都没有」时（真正的旧存档）
// 才把它当作普通档接过来，否则会给别的档凭空白送一份纪录
// （踩过：简单档打 88 层之后，普通档也显示「最深 88」）。
function readBest(key, allowLegacy) {
  let lv = 0, sc = 0;
  try {
    lv = parseInt(localStorage.getItem(`zjtt:bird:bestLv:${key}`) || '0', 10) || 0;
    sc = parseInt(localStorage.getItem(`zjtt:bird:best:${key}`) || '0', 10) || 0;
    if (allowLegacy && !lv && !sc) {
      lv = parseInt(localStorage.getItem('zjtt:bird:bestLv') || '0', 10) || 0;
      sc = parseInt(localStorage.getItem('zjtt:bird:best') || '0', 10) || 0;
    }
  } catch { /* 无痕模式 */ }
  return { lv, sc };
}

function loadBest() {
  let any = false;
  try {
    for (const d of DIFFS) {
      if (localStorage.getItem(`zjtt:bird:bestLv:${d.k}`) != null
        || localStorage.getItem(`zjtt:bird:best:${d.k}`) != null) { any = true; break; }
    }
  } catch { /* 无痕模式 */ }
  G.bests = {};
  for (const d of DIFFS) G.bests[d.k] = readBest(d.k, !any && d.k === 'normal');
  const b = G.bests[G.diff] || { lv: 0, sc: 0 };
  G.best = b.sc; G.bestLv = b.lv;
  try { G.sound = localStorage.getItem('zjtt:bird:snd') !== '0'; } catch { /* 无痕模式 */ }
  el.bs.textContent = G.bestLv;
  el.send.classList.toggle('off', !G.sound);
}

// 账号档案（js/account.js）和个人页只认 zjtt:bird:bestLv / best 这两个
// 「不分难度」的键，所以分档存完之后再维护一份普通及以上的最大值。
// 简单档不进这份：它是练习档，一局就能到 100 层，放进去就把云端纪录顶死了。
function syncGlobalBest() {
  let lv = 0, sc = 0;
  for (const d of DIFFS) {
    if (d.k === 'easy') continue;
    const b = G.bests[d.k];
    if (!b) continue;
    if (b.lv > lv) lv = b.lv;
    if (b.sc > sc) sc = b.sc;
  }
  try {
    localStorage.setItem('zjtt:bird:bestLv', String(lv));
    localStorage.setItem('zjtt:bird:best', String(sc));
  } catch { /* 无痕模式 */ }
}

function saveBest() {
  const b = G.bests[G.diff] || (G.bests[G.diff] = { lv: 0, sc: 0 });
  let changed = false;
  if (G.score > b.sc) { b.sc = G.score; G.best = b.sc; changed = true; }
  if (G.depth > b.lv) { b.lv = G.depth; G.bestLv = b.lv; changed = true; }
  if (changed) {
    try {
      localStorage.setItem(`zjtt:bird:bestLv:${G.diff}`, String(b.lv));
      localStorage.setItem(`zjtt:bird:best:${G.diff}`, String(b.sc));
    } catch { /* 无痕模式 */ }
    syncGlobalBest();
  }
  return changed;
}

// ---------------------------------------------------------------- 难度切换
function paintDiffs() {
  for (const d of DIFFS) {
    const n = $('#df-' + d.k);
    if (!n) continue;
    n.classList.toggle('on', d.k === G.diff);
    const b = (G.bests && G.bests[d.k]) || { lv: 0 };
    const em = n.querySelector('em');
    if (em) em.textContent = b.lv ? '最深 ' + b.lv : '还没下过';
  }
  const note = $('#dfnote');
  if (note) note.textContent = DIFF[G.diff].d;
}

function setDiff(k) {
  if (!DIFF[k] || k === G.diff) return;
  D = DIFF[k];
  G.diff = k;
  const b = (G.bests && G.bests[k]) || { lv: 0, sc: 0 };
  G.bestLv = b.lv; G.best = b.sc;
  try { localStorage.setItem('zjtt:bird:diff', k); } catch { /* 无痕模式 */ }
  paintDiffs();
  if (el.dtag) { el.dtag.textContent = D.n; el.dtag.dataset.c = D.c; }
  el.bs.textContent = G.bestLv;
  shown.lv = -1; shown.sc = -1; shown.hp = -1; shown.rg = -1;
  // 待机时换档要顺手把预览的那一屏重建成新难度，否则看见的还是旧塔
  if (G.state === 'ready') { buildWorld(); syncHud(); }
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
        // 云端存的是「不分难度的最深层数」，只拿来判断要不要往上推。
        // 不覆盖本地分档纪录——否则简单档的 100 层会把困难档的 40 层顶掉。
        G.cloudLv = b.lv || 0;
        G.cloudSc = b.sc || 0;
        if (G.cloudLv > 0) toast(`云端最深 ${G.cloudLv} 层（不分难度）`);
      })
      .catch(() => { /* 没网 / 没登录 / 老浏览器：当单机玩 */ });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(load, { timeout: 3000 });
  else setTimeout(load, 1500);
}

// 只在「一局结束」时推，别每下一层推一次——那会把接口刷爆。
// 简单档是练习档不上云：一局就能到 100 层，推上去云端纪录就再也动不了。
function flushBest() {
  if (G.diff === 'easy') return;
  if (!SYNC || !SYNC.pushBest) return;
  if (G.depth <= (G.cloudLv || 0) || G.depth <= pushedLv) return;
  pushedLv = G.cloudLv = G.depth;
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
  paintDiffs();
  const rank = RANKS.find((r) => G.depth >= r[0]) || RANKS[RANKS.length - 1];

  $('#endK').textContent = (win ? '塔底到底了' : '羽毛散了一地') + ' · ' + D.n;
  $('#endLv').textContent = G.depth;
  $('#endSc').textContent = G.score;
  $('#endKill').textContent = G.kills;
  $('#endBest').textContent = G.bestLv;
  // 踩蹦床的次数塞进评价的第二行：不改结算面板的布局（窄屏上三栏已经满了）
  const trampNote = G.tramps > 0 ? ` · 踩了 ${G.tramps} 次蹦床` : '';
  $('#endRank').innerHTML = `${rank[1]}<small>${rank[2]}${trampNote}</small>`;

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
  $('#ovHelp').hidden = true;
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

// HUD 左边那张头像：直接把雪碧图里的 head 帧画进一个小 canvas，
// 不额外发请求（图已经在内存里了）。
function paintFace() {
  const cv2 = $('#faceCv');
  const a = ANIMS.head;
  if (!cv2 || !a || !imgOk) return;
  const c = cv2.getContext('2d');
  const f = a.f[0];
  c.clearRect(0, 0, cv2.width, cv2.height);
  c.drawImage(sheet, f[0], f[1], f[2], f[3], 0, 0, cv2.width, cv2.height);
}

function boot() {
  const b = $('#boot');
  if (b) b.remove();
  // 上次选的难度先恢复出来，再读对应档的纪录
  try {
    const saved = localStorage.getItem('zjtt:bird:diff');
    if (saved && DIFF[saved]) G.diff = saved;
  } catch { /* 无痕模式 */ }
  D = DIFF[G.diff];
  fit();
  loadBest();
  paintFace();
  paintDiffs();
  if (el.dtag) { el.dtag.textContent = D.n; el.dtag.dataset.c = D.c; }
  readyGo();
  armSync();
}

// ---------------------------------------------------------------- 输入
const btnOf = {};
SKILLS.forEach((s) => {
  const b = document.createElement('button');
  b.className = 'sk';
  b.dataset.id = s.id;
  b.title = `${s.tip}（${s.cost} 狂气 / ${s.cd} 秒冷却）`;
  b.innerHTML = `<span class="sweep"></span><span class="nm">${s.n}</span><span class="ct">${s.cost}</span><span class="cd"></span>`;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); useSkill(s.id); });
  el.skills.appendChild(b);
  btnOf[s.id] = { el: b, cd: b.querySelector('.cd'), txt: '', cdShown: false, sweepP: -1, ready: null, poor: null };
});

// 按住：用指针捕获，手指按下后稍微滑出按钮也不会松开（以前 pointerleave 一出界就断，小屏上很难按稳）
const holdKey = (node, on, off) => {
  node.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { node.setPointerCapture(e.pointerId); } catch { /* 老浏览器 */ }
    node.classList.add('on'); on();
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    node.addEventListener(ev, () => { node.classList.remove('on'); off(); });
  }
};

holdKey($('#kL'), () => { G.keys.left = true; }, () => { G.keys.left = false; });
holdKey($('#kR'), () => { G.keys.right = true; }, () => { G.keys.right = false; });
$('#kJ').addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); });
$('#kJ2').addEventListener('pointerdown', (e) => { e.preventDefault(); tryJump(); });

// ---- 操控方式：按键 / 摇杆（记在本机）。摇杆：左右拖 = 左右移动，往下拖 = 穿过薄平台 ----
const CTL_KEY = 'zjtt:bird:ctl';
const stick = $('#stick'), knob = $('#knob');
const STICK_R = 38;                         // 旋钮能离开圆心多远（像素）
function setCtl(mode, quiet) {
  const useStick = mode === 'stick';
  $('#keys').hidden = useStick;
  $('#stickbox').hidden = !useStick;
  $('#ctl').classList.toggle('on', useStick);
  $('#ctl').title = useStick ? '当前：摇杆（点一下换回按键）' : '当前：按键（点一下换成摇杆）';
  G.keys.left = G.keys.right = G.keys.down = false;
  try { localStorage.setItem(CTL_KEY, mode); } catch { /* 无痕模式 */ }
  if (!quiet) toast(useStick ? '操控：摇杆（左边拖动移动，右边跳跃）' : '操控：按键');
}
function stickAt(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const d = Math.hypot(dx, dy) || 1, k = Math.min(1, STICK_R / d);
  const nx = dx * k, ny = dy * k;
  knob.style.transform = `translate(${nx}px, ${ny}px)`;
  G.keys.left = nx < -STICK_R * 0.28;
  G.keys.right = nx > STICK_R * 0.28;
  G.keys.down = ny > STICK_R * 0.6;
}
function stickEnd() {
  stick.classList.remove('drag');
  knob.style.transform = '';
  G.keys.left = G.keys.right = G.keys.down = false;
}
stick.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  try { stick.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  stick.classList.add('drag'); stickAt(e);
});
stick.addEventListener('pointermove', (e) => { if (stick.classList.contains('drag')) stickAt(e); });
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) stick.addEventListener(ev, stickEnd);
$('#ctl').addEventListener('click', () => setCtl($('#keys').hidden ? 'keys' : 'stick'));
{
  let m = 'keys';
  try { m = localStorage.getItem(CTL_KEY) === 'stick' ? 'stick' : 'keys'; } catch { /* ignore */ }
  setCtl(m, true);
}

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
// 玩法速查：技能效果 / 怪物 / 掉落物都写在里面，省得靠猜
const openHelp = () => { $('#ovHelp').hidden = false; };
$('#helpBtn').addEventListener('click', openHelp);
$('#helpBtn2').addEventListener('click', openHelp);
$('#helpClose').addEventListener('click', () => { $('#ovHelp').hidden = true; });
// 难度按钮：待机时点选直接换塔，一局中间不给换（换档等于换一座塔）
for (const d of DIFFS) {
  const n = $('#df-' + d.k);
  if (n) n.addEventListener('click', () => setDiff(d.k));
}
if (el.dtag) {
  el.dtag.addEventListener('click', () => {
    if (G.state === 'play') { toast('这一局已经在跑了，停下来才能改难度'); return; }
    if (G.state === 'pause') {
      pause(false);
      toast('这一局还没结束，出结算后才能改难度');
      return;
    }
    // 结算完了点难度徽标 = 回选档界面，重新挑一座塔
    if (G.state === 'end' || G.state === 'win') { readyGo(); return; }
    $('#ovStart').hidden = false;
  });
}
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
  window.__bird = {
    G, P, SKILLS, DIFFS, MOBK, ORBK,
    useSkill, play, pause, endRun, buildWorld, readyGo, hurtP, update,
    setDiff, getDiff: () => D,
  };
}

// 登录了本站账号就把这个游戏的存档同步到云端（js/gamecloud.js）
startGameCloud('bird');
