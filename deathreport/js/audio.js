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
    // 这四个不落盘：黑影的低语、黑潮的闷响、心跳、锁扣，都用振荡器+噪声现场合成。
    // 站点每个请求要 1~2 秒，为几声短音效多占四个请求不划算。
    if (name === 'whisper' || name === 'boom' || name === 'heart' || name === 'lock' || name === 'melt') { synth(name, gain, rate); return; }
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

// ---------------------------------------------------------------- 现场合成的四个音效
// whisper 黑影的气声 / boom 黑潮的闷响 / heart 心跳 / lock 锁扣
let nbuf = null;
const noise = () => (nbuf ||= noiseBuffer(2));

function synth(name, gain = 1, rate = 1) {
  try {
    const c = ctx, t0 = c.currentTime + 0.006;
    const out = c.createGain(); out.gain.value = name === 'whisper' ? 0 : gain; out.connect(master);

    if (name === 'whisper') {
      // 两段带通噪声叠一点低频共振，再用 LFO 做出“说话”的音节起伏
      const src = c.createBufferSource(); src.buffer = noise(); src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 760 * rate; bp.Q.value = 2.4;
      const bp2 = c.createBiquadFilter(); bp2.type = 'bandpass'; bp2.frequency.value = 1850 * rate; bp2.Q.value = 3.2;
      const g1 = c.createGain(); g1.gain.value = 0.55;
      const g2 = c.createGain(); g2.gain.value = 0.16;
      const syll = c.createGain(); syll.gain.value = 0.42;
      const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 4.1 + Math.random() * 0.8;
      const lg = c.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(syll.gain);
      src.connect(bp); bp.connect(g1); g1.connect(syll);
      src.connect(bp2); bp2.connect(g2); g2.connect(syll);
      syll.connect(out);
      out.gain.setValueAtTime(0, t0);
      out.gain.linearRampToValueAtTime(gain * 0.5, t0 + 0.22);
      out.gain.linearRampToValueAtTime(0, t0 + 1.55);
      src.start(t0); lfo.start(t0); src.stop(t0 + 1.6); lfo.stop(t0 + 1.6);
      return;
    }

    if (name === 'boom') {
      // 频率下滑的低频 + 一层被低通闷住的噪声，像很远的地方塌了一块
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(78 * rate, t0);
      o.frequency.exponentialRampToValueAtTime(27 * rate, t0 + 0.6);
      const og = c.createGain();
      og.gain.setValueAtTime(0, t0);
      og.gain.linearRampToValueAtTime(gain * 0.85, t0 + 0.02);
      og.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.05);
      o.connect(og); og.connect(out);
      const src = c.createBufferSource(); src.buffer = noise();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
      const ng = c.createGain();
      ng.gain.setValueAtTime(gain * 0.42, t0);
      ng.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.75);
      src.connect(lp); lp.connect(ng); ng.connect(out);
      src.start(t0); src.stop(t0 + 0.85); o.start(t0); o.stop(t0 + 1.1);
      return;
    }

    if (name === 'heart') {
      const beat = (at, amp) => {
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(66 * rate, at);
        o.frequency.exponentialRampToValueAtTime(36 * rate, at + 0.17);
        const g = c.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(gain * amp, at + 0.018);
        g.gain.exponentialRampToValueAtTime(0.0008, at + 0.23);
        o.connect(g); g.connect(out); o.start(at); o.stop(at + 0.26);
      };
      beat(t0, 0.95); beat(t0 + 0.27, 0.58);
      return;
    }

    // melt：融蚀。低频闷着往下沉，上面那层细噪声被一点点抽走——
    // 字被吃掉的时候，声音也像少了几个频段。
    if (name === 'melt') {
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(52 * rate, t0);
      o.frequency.linearRampToValueAtTime(31 * rate, t0 + 1.5);
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.setValueAtTime(77 * rate, t0);
      o2.frequency.linearRampToValueAtTime(46 * rate, t0 + 1.5);
      const og = c.createGain();
      og.gain.setValueAtTime(0, t0);
      og.gain.linearRampToValueAtTime(gain * 0.5, t0 + 0.18);
      og.gain.linearRampToValueAtTime(0, t0 + 1.7);
      o.connect(og); o2.connect(og); og.connect(out);
      const src = c.createBufferSource(); src.buffer = noise(); src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(2400 * rate, t0);
      bp.frequency.exponentialRampToValueAtTime(320 * rate, t0 + 1.5);   // 频带一路塌下去
      const ng = c.createGain();
      ng.gain.setValueAtTime(gain * 0.22, t0);
      ng.gain.linearRampToValueAtTime(0.0006, t0 + 1.55);
      src.connect(bp); bp.connect(ng); ng.connect(out);
      src.start(t0); src.stop(t0 + 1.7); o.start(t0); o.stop(t0 + 1.75); o2.start(t0); o2.stop(t0 + 1.75);
      return;
    }

    // lock：两下金属咔哒
    for (const [at, amp] of [[0, 0.7], [0.08, 0.42]]) {
      const src = c.createBufferSource(); src.buffer = noise();
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1700;
      const g = c.createGain();
      g.gain.setValueAtTime(gain * amp, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.0008, t0 + at + 0.055);
      src.connect(hp); hp.connect(g); g.connect(out);
      src.start(t0 + at); src.stop(t0 + at + 0.07);
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = 2300 * rate;
      const og = c.createGain();
      og.gain.setValueAtTime(gain * amp * 0.22, t0 + at);
      og.gain.exponentialRampToValueAtTime(0.0008, t0 + at + 0.04);
      o.connect(og); og.connect(out); o.start(t0 + at); o.stop(t0 + at + 0.05);
    }
  } catch { /* 合成失败就静音，不影响阅读 */ }
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
