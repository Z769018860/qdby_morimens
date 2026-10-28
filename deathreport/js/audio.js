// 死亡游戏调查报告 · 音频层
// 短音效是 tools/make_audio.py 合成的 wav（audio/*.wav，共约 230KB，全部懒加载）；
// 环境音不落盘：每届一套低频 drone + 滤波噪声，用 WebAudio 实时合成，切换届别时换音色。
const FILES = {
  key: 'audio/key.wav', paper: 'audio/paper.wav', chime: 'audio/chime.wav',
  buzz: 'audio/buzz.wav', stamp: 'audio/stamp.wav', bell: 'audio/bell.wav', msg: 'audio/msg.wav',
};
let ctx = null, master = null, wet = null, buffers = {}, loading = null, broken = false;
let on = true, theme = 63, amb = null, ambWanted = false;

const AC = () => window.AudioContext || window.webkitAudioContext;

function graph() {
  if (ctx) return ctx;
  ctx = new (AC())();
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  // 一点点空间：短延迟 + 反馈，让盖章和钟声不像贴在耳朵上
  wet = ctx.createGain(); wet.gain.value = 0.16;
  const d1 = ctx.createDelay(0.5); d1.delayTime.value = 0.13;
  const d2 = ctx.createDelay(0.5); d2.delayTime.value = 0.21;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  wet.connect(d1); d1.connect(d2); d2.connect(fb); fb.connect(d1); d2.connect(master);
  wet.connect(master);
  return ctx;
}

async function load() {
  if (loading || broken) return loading;
  loading = (async () => {
    const entries = Object.entries(FILES);
    await Promise.all(entries.map(async ([k, url]) => {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status);
        buffers[k] = await graph().decodeAudioData(await r.arrayBuffer());
      } catch { /* 音效缺了就退回合成音，不影响玩 */ }
    }));
  })();
  return loading;
}

export function unlock() {
  try {
    graph();
    if (ctx.state === 'suspended') ctx.resume();
    load();
  } catch { broken = true; }
}

export const setSound = (v) => { on = !!v; if (!on) stopAmbient(); else if (ambWanted) startAmbient(); };

export function play(name, { gain = 1, rate = 1, spread = 0 } = {}) {
  if (!on || broken) return;
  try {
    graph(); if (ctx.state === 'suspended') ctx.resume();
    const b = buffers[name];
    if (!b) { fallback(name); return; }
    const s = ctx.createBufferSource(); s.buffer = b;
    s.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * spread);
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(g); g.connect(master);
    if (name === 'bell' || name === 'stamp' || name === 'chime') g.connect(wet);
    s.start();
  } catch { /* ignore */ }
}

// wav 还没到位（或加载失败）时，用振荡器凑一个，保证手感不断
function fallback(name) {
  const map = { key: [1400, 0.03], ok: [660, 0.09], chime: [880, 0.12], buzz: [140, 0.16], err: [140, 0.16], stamp: [110, 0.18], msg: [880, 0.1], bell: [220, 0.9] };
  const [f, d] = map[name] || map.key;
  const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
  o.type = name === 'buzz' || name === 'err' ? 'sawtooth' : 'triangle';
  o.frequency.value = f;
  g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
}

// ---------------------------------------------------------------- 环境音
const AMB = {
  63: { drone: [55, 82.5], cut: 240, noise: 0.012, wave: 0.05 },   // 钟楼：低沉的金属嗡鸣
  62: { drone: [49, 73.4], cut: 190, noise: 0.016, wave: 0.09 },   // 剧场：木结构的空响
  61: { drone: [41, 61.7], cut: 320, noise: 0.022, wave: 0.06 },   // 雾港：海水的呼吸
};

export function setTheme(n) { theme = +n; if (amb) { stopAmbient(); startAmbient(); } }

function noiseBuffer(sec = 3) {
  const len = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; }
  return b;
}

export function startAmbient() {
  ambWanted = true;
  if (!on || broken || amb) return;
  try {
    graph(); if (ctx.state === 'suspended') ctx.resume();
    const c = AMB[theme] || AMB[63], t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    out.gain.linearRampToValueAtTime(0.5, t + 2.4);
    const oscs = c.drone.map((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = i ? 'sine' : 'triangle'; o.frequency.value = f;
      g.gain.value = i ? 0.1 : 0.16; o.connect(g); g.connect(out); o.start(t);
      return o;
    });
    // 缓慢起伏：让 drone 不像一条直线
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.055; lg.gain.value = 0.06; lfo.connect(lg); lg.connect(out.gain); lfo.start(t);

    const src = ctx.createBufferSource(); src.buffer = noiseBuffer(); src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = c.cut;
    const ng = ctx.createGain(); ng.gain.value = c.noise;
    src.connect(lp); lp.connect(ng); ng.connect(out); src.start(t);
    // 噪声的潮汐（61 的海、62 的风）
    const nl = ctx.createOscillator(), nlg = ctx.createGain();
    nl.frequency.value = c.wave; nlg.gain.value = c.noise * 0.75; nl.connect(nlg); nlg.connect(ng.gain); nl.start(t);

    amb = { out, nodes: [...oscs, lfo, nl, src] };
  } catch { broken = true; }
}

export function stopAmbient() {
  ambWanted = false;
  if (!amb) return;
  try {
    const { out, nodes } = amb, t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 0.8);
    setTimeout(() => nodes.forEach((n) => { try { n.stop(); } catch { /* ignore */ } }), 900);
  } catch { /* ignore */ }
  amb = null;
}
