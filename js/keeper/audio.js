// 杀死守密人 —— 声音。
// 4 首循环音乐（八音盒 / 地牢 / 紧张 drone / 终夜）+ 一个音效精灵（23 段，一次请求）。
// 素材全部 CC0，出处见 assets/audio/keeper/NOTICE.md；烘焙见 scripts/keeper-audio.py。
//
// 浏览器不给手势就不让出声，所以这里所有入口都等 boot()（第一次点击时调用）。
// 音乐走 <audio> + MediaElementSource（流式、不占内存），音效走解码后的 sprite buffer
// （一次请求拿到全部短音，按样本定位，比 23 个文件省 22 次往返）。

const BASE = 'assets/audio/keeper/';

// 音效精灵时间表：[起点秒, 时长秒]，由 scripts/keeper-audio.py 生成
const SPRITE = {
  total: 45.3,
  items: {
    page: [0.0, 1.5], paper: [1.62, 0.3], door: [2.04, 3.3], step: [5.46, 2.4],
    knife: [7.98, 0.76], slash: [8.86, 1.9], whisper: [10.88, 3.1], breath: [14.1, 2.6],
    cat: [16.82, 0.67], stone: [17.61, 1.3], glass: [19.03, 1.07], clank: [20.22, 0.88],
    ring: [21.22, 2.6], chain: [23.94, 2.0], candle: [26.06, 0.55], creak: [26.73, 0.85],
    tick: [27.7, 2.0], bell: [29.82, 4.5], static: [34.44, 1.8], drip: [36.36, 2.6],
    bone: [39.08, 0.307], knock: [39.507, 2.05], wind: [41.677, 3.5],
  },
};

let ac = null, master = null, musBus = null, sfxBus = null, droneBus = null;
let started = false, muted = false, wantBgm = null, curBgm = null, drone = null;
const tracks = {};                 // name -> { el, gain }
let sprite = null, spriteReq = null;

const MUSIC_GAIN = 0.62;
const SFX_GAIN = 0.9;
const DRONE_GAIN = 0.022;

function ctx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ac = new C();
    master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    musBus = ac.createGain(); musBus.gain.value = MUSIC_GAIN; musBus.connect(master);
    sfxBus = ac.createGain(); sfxBus.gain.value = SFX_GAIN; sfxBus.connect(master);
    droneBus = ac.createGain(); droneBus.gain.value = DRONE_GAIN; droneBus.connect(master);
  }
  return ac;
}

/** 首次用户手势调用：建 context、开始拉音效精灵、补上之前想播的音乐。 */
export function boot() {
  if (started) { if (ac && ac.state === 'suspended') ac.resume(); return; }
  if (!ctx()) return;
  started = true;
  loadSprite();
  droneOn();
  if (muted) master.gain.value = 0;
  const n = wantBgm; wantBgm = null;
  if (n) bgm(n);
  // 切后台再回来，浏览器常把 context 挂起，回来要自己接上
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && ac && ac.state === 'suspended') ac.resume();
  });
}

export function ready() { return started; }

// ---------------------------------------------------------------- 音效精灵
function loadSprite() {
  if (sprite || spriteReq) return spriteReq;
  spriteReq = fetch(BASE + 'sfx.mp3')
    .then((r) => r.arrayBuffer())
    .then((b) => new Promise((ok, no) => ac.decodeAudioData(b, ok, no)))
    .then((buf) => { sprite = buf; })
    .catch(() => { sprite = null; });
  return spriteReq;
}

/** 播一个音效。gain 用来分轻重（1 = 设计音量）。 */
export function sfx(name, gain = 1) {
  if (!started || muted || !sprite) return;
  const it = SPRITE.items[name];
  if (!it) return;
  if (ac.state === 'suspended') ac.resume();
  const k = sprite.duration / SPRITE.total;   // 解码后可能因编码器 padding 略有偏移，按比例校一下
  const src = ac.createBufferSource();
  const g = ac.createGain();
  g.gain.value = gain;
  src.buffer = sprite;
  src.connect(g); g.connect(sfxBus);
  src.start(ac.currentTime, it[0] * k, it[1] * k);
}

/** 合成的一次轻击，用在按钮和普通选项上（不占素材）。 */
export function tap(v = 0.13) {
  if (!started || muted) return;
  const t = ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(330, t);
  o.frequency.exponentialRampToValueAtTime(150, t + 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + 0.12);
}

// ---------------------------------------------------------------- 音乐
function track(name) {
  if (tracks[name]) return tracks[name];
  const el = new Audio(BASE + name + '.mp3');
  el.loop = true;
  el.preload = 'auto';
  const gain = ac.createGain();
  gain.gain.value = 0;
  const node = ac.createMediaElementSource(el);
  node.connect(gain); gain.connect(musBus);
  tracks[name] = { el, gain };
  return tracks[name];
}

/** 切音乐（name 传 null 表示淡出停下）。交叉淡化两秒左右，不会打断。 */
export function bgm(name) {
  if (!started) { wantBgm = name; return; }
  if (name === curBgm) return;
  if (muted) { wantBgm = name; return; }
  if (ac.state === 'suspended') ac.resume();
  const t = ac.currentTime;
  if (curBgm && tracks[curBgm]) {
    const o = tracks[curBgm];
    o.gain.gain.cancelScheduledValues(t);
    o.gain.gain.setValueAtTime(o.gain.gain.value, t);
    o.gain.gain.linearRampToValueAtTime(0, t + 1.6);
    const el = o.el;
    setTimeout(() => { try { el.pause(); } catch { /* 已经停了 */ } }, 1700);
  }
  curBgm = name;
  if (!name) return;
  const n = track(name);
  try { n.el.currentTime = 0; } catch { /* 元数据还没来 */ }
  n.el.play().catch(() => {});
  n.gain.gain.cancelScheduledValues(t);
  n.gain.gain.setValueAtTime(0, t);
  n.gain.gain.linearRampToValueAtTime(1, t + 2.2);
}

// ---------------------------------------------------------------- 底层嗡鸣
function droneOn() {
  if (drone || !ac) return;
  const g = ac.createGain(); g.gain.value = 1; g.connect(droneBus);
  for (const f of [52, 52.7, 104.3]) {
    const o = ac.createOscillator();
    o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start();
  }
  drone = { g };
}
function droneOff() {
  if (!drone) return;
  try { drone.g.disconnect(); } catch { /* noop */ }
  drone = null;
}

// ---------------------------------------------------------------- 心跳
let heartTimer = null;
function thump(at) {
  if (!ac || muted) return;
  const t = at || ac.currentTime;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(58, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
  g.gain.setValueAtTime(0.13, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + 0.2);
}
/** 记忆太重的时候，心跳自己会响。 */
export function heartbeat(on) {
  clearInterval(heartTimer); heartTimer = null;
  if (!on || !started || muted) return;
  thump();
  heartTimer = setInterval(() => { thump(); setTimeout(() => thump(), 260); }, 1500);
}

// ---------------------------------------------------------------- 静音
export function setMuted(m) {
  muted = !!m;
  if (!started) return;
  const t = ac.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.06);
  if (muted) { heartbeat(false); return; }
  // 静音期间的换曲请求攒在 wantBgm 里，这时候补上
  if (wantBgm && wantBgm !== curBgm) {
    const n = wantBgm; wantBgm = null; curBgm = null; bgm(n);
  } else wantBgm = null;
}
export function isMuted() { return muted; }
export function toggleMute() { setMuted(!muted); return muted; }
