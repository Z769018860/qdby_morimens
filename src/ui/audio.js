// Synthesised audio (WebAudio, no asset files): battle/UI sound effects with realm timbres and a quiet generative
// ambient loop. Everything is a graceful no-op without WebAudio or before the first user gesture.
const KEY = 'morimens-idle-audio';
const DEFAULTS = { sfx: 0.7, bgm: 0.35, mute: false };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEFAULTS }; } };

class Sound {
  constructor() {
    this.cfg = load(); this.ctx = null; this.last = {}; this.mood = 'field'; this.timer = null; this.pad = null;
    const unlock = () => { this.ensure(); this.startBgm(); };
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { once: true, passive: true });
    document.addEventListener('visibilitychange', () => { if (!this.ctx) return; if (document.hidden) this.ctx.suspend(); else if (!this.cfg.mute) this.ctx.resume(); });
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.cfg)); } catch { /* ignore */ } }
  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended' && !document.hidden) this.ctx.resume(); return this.ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.connect(this.master);
      this.bgmBus = this.ctx.createGain(); this.bgmBus.connect(this.master);
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    } catch { this.ctx = null; }
    return this.ctx;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const m = this.cfg.mute ? 0 : 1;
    this.sfxBus.gain.value = m * this.cfg.sfx * 1.8; this.bgmBus.gain.value = m * this.cfg.bgm * 0.5;
  }
  set(k, v) { this.cfg[k] = v; this.save(); this.applyVolumes(); if (k === 'mute' && !v) { this.ensure(); this.startBgm(); } }

  // ---- primitives
  tone(type, f0, f1, dur, vol = 0.3, at = 0, bus = this.sfxBus) {
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.3, { type = 'lowpass', f0 = 2000, f1 = 400, q = 1, at = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfxBus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---- sound table
  play(name, o = {}) {
    if (this.cfg.mute || !this.ensure() || this.ctx.state !== 'running') return;
    const now = performance.now(), gap = { hit: 45, crit: 60, dot: 90, heal: 80, shield: 80, buff: 90, debuff: 90, swing: 70, skill: 120, status: 100 }[name] ?? 30;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const fn = this[`s_${name}`];
    if (fn) fn.call(this, o);
  }
  s_click() { this.tone('triangle', 660, 520, 0.05, 0.12); }
  s_swing({ realm } = {}) {
    if (realm === 'AEQUOR') this.noise(0.14, 0.12, { type: 'bandpass', f0: 500, f1: 1600, q: 2 });
    else if (realm === 'ULTRA') this.tone('sine', 900, 300, 0.12, 0.08);
    else this.noise(0.1, 0.1, { type: 'highpass', f0: 800, f1: 3000 });
  }
  s_skill({ realm } = {}) { this.tone('triangle', 330, 520, 0.18, 0.1); this.s_swing({ realm }); }
  s_hit({ realm, foe, amt = 1 } = {}) {
    const big = Math.min(1, 0.55 + amt / 4000), v = 0.28 * big;
    this.tone('sine', foe ? 150 : 200, 55, 0.14, v);
    if (realm === 'CARO') this.noise(0.12, v, { f0: 1200, f1: 200 });
    else if (realm === 'AEQUOR') { this.noise(0.18, v * 0.8, { type: 'bandpass', f0: 1800, f1: 300, q: 3 }); this.tone('sine', 420, 180, 0.15, v * 0.5); }
    else if (realm === 'ULTRA') { this.tone('square', 520, 90, 0.1, v * 0.4); this.noise(0.08, v * 0.6, { type: 'highpass', f0: 2500, f1: 900 }); }
    else if (realm === 'CHAOS') { this.tone('sawtooth', 300, 70, 0.12, v * 0.5); this.noise(0.1, v * 0.7, { f0: 3000, f1: 300 }); }
    else this.noise(0.1, v * 0.7, { f0: 1800, f1: 250 });
  }
  s_crit(o) { this.s_hit(o); this.tone('triangle', 1400, 2200, 0.12, 0.12, 0.02); this.tone('sine', 2800, 2800, 0.2, 0.06, 0.03); }
  s_block() { this.tone('square', 900, 700, 0.06, 0.12); this.tone('sine', 1800, 1800, 0.18, 0.07, 0.01); }
  s_counter() { this.tone('sawtooth', 700, 200, 0.12, 0.14); this.noise(0.08, 0.15, { type: 'highpass', f0: 2500, f1: 1000 }); }
  s_dot({ s } = {}) {
    if (s === 'poison') { this.tone('sine', 280, 120, 0.2, 0.1); this.tone('sine', 330, 140, 0.18, 0.07, 0.05); }
    else this.noise(0.12, 0.12, { type: 'bandpass', f0: 1500, f1: 600, q: 2 });
  }
  s_heal() { [523, 659, 784].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.1, i * 0.06)); }
  s_shield() { this.tone('triangle', 520, 780, 0.18, 0.12); this.tone('sine', 1560, 1560, 0.25, 0.05, 0.04); }
  s_buff() { this.tone('triangle', 400, 800, 0.2, 0.1); this.tone('triangle', 600, 1200, 0.2, 0.06, 0.06); }
  s_debuff() { this.tone('sawtooth', 500, 180, 0.22, 0.08); }
  s_status() { this.tone('sine', 740, 740, 0.08, 0.06); }
  s_die({ foe } = {}) { this.tone('sawtooth', foe ? 260 : 200, 40, 0.5, 0.16); this.noise(0.4, 0.14, { f0: 1500, f1: 100 }); }
  s_exalt() { this.tone('sawtooth', 120, 700, 0.5, 0.12); [392, 494, 587, 784].forEach((f, i) => this.tone('triangle', f, f, 0.5, 0.09, 0.15 + i * 0.05)); this.noise(0.5, 0.1, { type: 'highpass', f0: 400, f1: 4000 }); }
  s_boss() { this.tone('sawtooth', 70, 45, 0.9, 0.18); this.noise(0.6, 0.14, { f0: 500, f1: 60 }); }
  s_win() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.32, 0.13, i * 0.1)); }
  s_lose() { [392, 330, 262, 196].forEach((f, i) => this.tone('sine', f, f * 0.98, 0.45, 0.13, i * 0.16)); }
  s_summon() { for (let i = 0; i < 6; i++) this.tone('sine', 880 * 2 ** (i / 4), 880 * 2 ** (i / 4), 0.35, 0.06, i * 0.05); this.noise(0.5, 0.06, { type: 'highpass', f0: 3000, f1: 6000 }); }
  s_summonSSR() { this.s_summon(); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.6, 0.1, 0.3 + i * 0.09)); }
  s_ach() { [988, 1319].forEach((f, i) => { this.tone('sine', f, f, 0.5, 0.12, i * 0.12); this.tone('sine', f * 2.01, f * 2.01, 0.35, 0.04, i * 0.12); }); }
  s_lvup() { [440, 554, 659].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.1, i * 0.06)); }
  s_gold() { this.tone('square', 1200, 1200, 0.05, 0.06); this.tone('square', 1600, 1600, 0.09, 0.06, 0.05); }

  // ---- ambient loop: a slow detuned drone + sparse pentatonic notes; the boss mood adds a low pulse
  startBgm() {
    if (this.timer || this.cfg.mute || !this.ensure()) return;
    const c = this.ctx;
    this.pad = [55, 82.4, 110.2].map((f, i) => {
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = i === 2 ? 'triangle' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 7;
      lp.type = 'lowpass'; lp.frequency.value = 380; g.gain.value = i === 2 ? 0.05 : 0.07;
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = 140; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
      o.connect(lp); lp.connect(g); g.connect(this.bgmBus); o.start(); return { o, lfo };
    });
    const scale = [0, 3, 5, 7, 10, 12, 15]; let n = 0;
    this.timer = setInterval(() => {
      if (this.cfg.mute || document.hidden || this.ctx.state !== 'running') return;
      const boss = this.mood === 'boss';
      if (Math.random() < (boss ? 0.8 : 0.45)) {
        const f = 220 * 2 ** (scale[Math.floor(Math.random() * scale.length)] / 12) * (Math.random() < 0.3 ? 2 : 1);
        this.tone('sine', f, f, 2.2, 0.05, 0, this.bgmBus); if (Math.random() < 0.4) this.tone('triangle', f * 1.5, f * 1.5, 1.6, 0.025, 0.12, this.bgmBus);
      }
      if (boss && n++ % 2 === 0) this.tone('sine', 55, 40, 0.5, 0.12, 0, this.bgmBus);
    }, 1400);
  }
  setMood(m) { this.mood = m; }
}

export const sound = new Sound();
