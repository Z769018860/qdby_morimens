// 全部声音都由 WebAudio 实时合成，不带任何音频文件。
//  · 音效：命中 / 暴击 / 治疗 / 护盾 / 共鸣 / 抽卡 / 界面操作……按界域换音色
//  · BGM：六个场景各一首「和弦进行 + 低音 + 琶音 + 主旋律 + 轻打击」的小曲子，
//    用 step sequencer（预排 0.3 秒、按 AudioContext 时钟对齐）演奏，切换场景时交叉淡入淡出。
// 没有 WebAudio、用户还没交互过（浏览器自动播放策略）时全部静默降级。
const KEY = 'morimens-idle-audio';
const DEFAULTS = { sfx: 0.7, bgm: 0.45, mute: false, autoMood: true };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return { ...DEFAULTS }; } };

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  penta: [0, 3, 5, 7, 10],
};

/* 每个场景一首。prog 是和弦的「级数」（不是半音），三和弦按调式音阶叠三度生成，所以永远在调内。
   pad / bass / arp / lead / perc / hat 是各声部的音量系数，0 就是这一层不出现。 */
const TRACKS = {
  home:   { zh: '静夜 · 城镇', bpm: 64, root: 57, scale: 'minor',  prog: [0, 5, 3, 4], pad: 0.6, bass: 0.5, arp: 0.3, lead: 0.32, perc: 0.1, hat: 0 },
  field:  { zh: '夜行 · 推图', bpm: 88, root: 52, scale: 'dorian', prog: [0, 3, 5, 6], pad: 0.45, bass: 0.75, arp: 0.45, lead: 0.34, perc: 0.3, hat: 1 },
  battle: { zh: '交锋 · 战斗', bpm: 108, root: 50, scale: 'minor', prog: [0, 5, 6, 4], pad: 0.36, bass: 0.85, arp: 0.55, lead: 0.4, perc: 0.5, hat: 1 },
  boss:   { zh: '威压 · 首领', bpm: 138, root: 45, scale: 'minor', prog: [0, 1, 5, 6], pad: 0.5, bass: 0.95, arp: 0.42, lead: 0.5, perc: 0.72, hat: 1 },
  summon: { zh: '共鸣 · 召唤', bpm: 74, root: 55, scale: 'penta', prog: [0, 4, 2, 3], pad: 0.62, bass: 0.42, arp: 0.72, lead: 0.42, perc: 0.06, hat: 0 },
  tower:  { zh: '攀登 · 挑战', bpm: 96, root: 48, scale: 'dorian', prog: [0, 6, 3, 4], pad: 0.46, bass: 0.72, arp: 0.5, lead: 0.4, perc: 0.4, hat: 1 },
};
export const TRACK_LIST = Object.entries(TRACKS).map(([k, v]) => ({ k, zh: v.zh }));

const midi = (n) => 440 * 2 ** ((n - 69) / 12);

class Sound {
  constructor() {
    this.cfg = load(); this.ctx = null; this.last = {}; this.mood = 'home'; this.pageMood = 'home';
    this.timer = null; this.tr = null; this.step = 0; this.next = 0; this.bar = 0; this.gainNow = 1;
    const unlock = () => { this.ensure(); this.startBgm(); };
    for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, unlock, { once: true, passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (!this.cfg.mute) { this.ctx.resume(); this.next = this.ctx.currentTime + 0.08; }
    });
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
      // 音乐走一档低通，把方波/锯齿的高频毛刺磨掉，听感更像「背景」而不是「音效」
      this.musicTone = this.ctx.createBiquadFilter();
      this.musicTone.type = 'lowpass'; this.musicTone.frequency.value = 4200; this.musicTone.Q.value = 0.4;
      this.bgmBus.disconnect(); this.bgmBus.connect(this.musicTone); this.musicTone.connect(this.master);
      const len = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
    } catch { this.ctx = null; }
    return this.ctx;
  }
  applyVolumes() {
    if (!this.ctx) return;
    const m = this.cfg.mute ? 0 : 1;
    this.sfxBus.gain.value = m * this.cfg.sfx * 1.7;
    this.bgmBus.gain.value = m * this.cfg.bgm * 0.8 * this.gainNow;
  }
  set(k, v) {
    this.cfg[k] = v; this.save();
    if (k === 'mute') {
      if (v) { this.stopBgm(); this.applyVolumes(); }
      else { this.applyVolumes(); this.ensure(); this.startBgm(); }
      return;
    }
    this.applyVolumes();
    if (k === 'bgm' && !v) this.stopBgm();
    if (k === 'bgm' && v > 0 && !this.timer) { this.ensure(); this.startBgm(); }
  }

  // ---- primitives
  tone(type, f0, f1, dur, vol = 0.3, at = 0, bus = this.sfxBus) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, vol = 0.3, { type = 'lowpass', f0 = 2000, f1 = 400, q = 1, at = 0, pan = 0 } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + at, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.sfxBus); }
    else g.connect(this.sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // ---- sound table
  play(name, o = {}) {
    if (this.cfg.mute || !this.ensure() || this.ctx.state !== 'running') return;
    const now = performance.now();
    const gap = {
      hit: 42, crit: 60, dot: 90, heal: 80, shield: 80, buff: 90, debuff: 90, swing: 70, skill: 120, status: 100,
      nav: 90, open: 120, coin: 60, buy: 90, deny: 260, unlock: 220, stamp: 160, reveal1: 300, reveal2: 400, reveal3: 600,
    }[name] ?? 30;
    if (now - (this.last[name] || 0) < gap) return;
    this.last[name] = now;
    const fn = this[`s_${name}`];
    if (fn) fn.call(this, o);
  }
  /* ---------- 界面 ---------- */
  s_click() { this.tone('triangle', 660, 520, 0.05, 0.1); this.noise(0.03, 0.02, { type: 'highpass', f0: 4000, f1: 7000 }); }
  // 导航：切组时极轻的一声，音量刻意压低，避免翻页翻得烦躁
  s_nav() { this.tone('sine', 520, 720, 0.07, 0.045); this.noise(0.06, 0.022, { type: 'highpass', f0: 3200, f1: 6500 }); }
  // 弹窗 / 立绘放大：短促的「展开」感
  s_open() { this.tone('sine', 420, 900, 0.16, 0.06); this.noise(0.14, 0.032, { type: 'bandpass', f0: 900, f1: 3200, q: 1.4 }); }
  s_deny() { this.tone('square', 180, 130, 0.1, 0.09); this.tone('square', 140, 96, 0.12, 0.07, 0.09); }
  s_unlock() { [440, 660, 880].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.075, i * 0.05)); this.noise(0.16, 0.03, { type: 'highpass', f0: 3000, f1: 7000 }); }
  s_stamp() { this.tone('sine', 220, 120, 0.1, 0.12); this.noise(0.09, 0.06, { f0: 1200, f1: 300 }); }
  s_coin() { [1319, 1760, 2637].forEach((f, i) => this.tone('square', f, f, 0.07, 0.05, i * 0.035)); }
  s_gold() { this.s_coin(); }
  s_buy() { this.s_coin(); this.tone('triangle', 523, 784, 0.14, 0.06, 0.06); }
  /* ---------- 战斗 ---------- */
  s_swing({ realm } = {}) {
    if (realm === 'AEQUOR') this.noise(0.14, 0.12, { type: 'bandpass', f0: 500, f1: 1600, q: 2 });
    else if (realm === 'ULTRA') this.tone('sine', 900, 300, 0.12, 0.08);
    else this.noise(0.1, 0.1, { type: 'highpass', f0: 800, f1: 3000 });
  }
  s_skill({ realm } = {}) { this.tone('triangle', 330, 520, 0.18, 0.09); this.s_swing({ realm }); }
  s_hit({ realm, foe, amt = 1 } = {}) {
    const big = Math.min(1, 0.55 + amt / 4000), v = 0.28 * big;
    const jitter = 0.94 + Math.random() * 0.12;   // 同一场里连打几十下，微失谐听起来才不像复读
    this.tone('sine', (foe ? 150 : 200) * jitter, 55, 0.14, v);
    if (realm === 'CARO') this.noise(0.12, v, { f0: 1200 * jitter, f1: 200 });
    else if (realm === 'AEQUOR') { this.noise(0.18, v * 0.8, { type: 'bandpass', f0: 1800 * jitter, f1: 300, q: 3 }); this.tone('sine', 420, 180, 0.15, v * 0.5); }
    else if (realm === 'ULTRA') { this.tone('square', 520 * jitter, 90, 0.1, v * 0.4); this.noise(0.08, v * 0.6, { type: 'highpass', f0: 2500, f1: 900 }); }
    else if (realm === 'CHAOS') { this.tone('sawtooth', 300 * jitter, 70, 0.12, v * 0.5); this.noise(0.1, v * 0.7, { f0: 3000, f1: 300 }); }
    else this.noise(0.1, v * 0.7, { f0: 1800, f1: 250 });
  }
  s_crit(o) { this.s_hit(o); this.tone('triangle', 1400, 2200, 0.12, 0.11, 0.02); this.tone('sine', 2800, 2800, 0.2, 0.055, 0.03); }
  s_block() { this.tone('square', 900, 700, 0.06, 0.11); this.tone('sine', 1800, 1800, 0.18, 0.065, 0.01); }
  s_counter() { this.tone('sawtooth', 700, 200, 0.12, 0.13); this.noise(0.08, 0.14, { type: 'highpass', f0: 2500, f1: 1000 }); }
  s_dot({ s } = {}) {
    if (s === 'poison') { this.tone('sine', 280, 120, 0.2, 0.09); this.tone('sine', 330, 140, 0.18, 0.065, 0.05); }
    else this.noise(0.12, 0.11, { type: 'bandpass', f0: 1500, f1: 600, q: 2 });
  }
  s_heal() { [523, 659, 784].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.09, i * 0.06)); }
  s_shield() { this.tone('triangle', 520, 780, 0.18, 0.11); this.tone('sine', 1560, 1560, 0.25, 0.045, 0.04); }
  s_buff() { this.tone('triangle', 400, 800, 0.2, 0.09); this.tone('triangle', 600, 1200, 0.2, 0.055, 0.06); }
  s_debuff() { this.tone('sawtooth', 500, 180, 0.22, 0.075); }
  s_status() { this.tone('sine', 740, 740, 0.08, 0.055); }
  s_die({ foe } = {}) { this.tone('sawtooth', foe ? 260 : 200, 40, 0.5, 0.15); this.noise(0.4, 0.13, { f0: 1500, f1: 100 }); }
  s_exalt() { this.tone('sawtooth', 120, 700, 0.5, 0.11); [392, 494, 587, 784].forEach((f, i) => this.tone('triangle', f, f, 0.5, 0.085, 0.15 + i * 0.05)); this.noise(0.5, 0.09, { type: 'highpass', f0: 400, f1: 4000 }); }
  s_boss() { this.tone('sawtooth', 70, 45, 0.9, 0.17); this.noise(0.6, 0.13, { f0: 500, f1: 60 }); }
  s_win() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.32, 0.12, i * 0.1)); }
  s_lose() { [392, 330, 262, 196].forEach((f, i) => this.tone('sine', f, f * 0.98, 0.45, 0.12, i * 0.16)); }
  /* ---------- 抽卡：按结果分三档 ---------- */
  s_summon() { for (let i = 0; i < 6; i++) this.tone('sine', 880 * 2 ** (i / 4), 880 * 2 ** (i / 4), 0.35, 0.055, i * 0.05); this.noise(0.5, 0.055, { type: 'highpass', f0: 3000, f1: 6000 }); }
  s_summonSSR() { this.s_summon(); [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.6, 0.09, 0.3 + i * 0.09)); }
  s_reveal1() { this.tone('sine', 880, 880, 0.18, 0.06); this.tone('sine', 1320, 1320, 0.2, 0.035, 0.03); }
  s_reveal2() { this.s_reveal1(); [784, 988, 1175].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.075, 0.06 + i * 0.05)); }
  s_reveal3() { this.s_summon(); [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone('triangle', f, f, 0.7, 0.1, 0.28 + i * 0.075)); this.noise(0.9, 0.06, { type: 'highpass', f0: 2500, f1: 8000 }); }
  s_ach() { [988, 1319].forEach((f, i) => { this.tone('sine', f, f, 0.5, 0.11, i * 0.12); this.tone('sine', f * 2.01, f * 2.01, 0.35, 0.035, i * 0.12); }); }
  s_lvup() { [440, 554, 659].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.09, i * 0.06)); }

  /* ================= BGM ================= */
  stepDur() { return 60 / (this.tr?.bpm || 80) / 4; }   // 16 分音符
  startBgm() {
    if (this.timer || this.cfg.mute || !this.ensure() || !(this.cfg.bgm > 0)) return;
    this.setTrack(this.mood, true);
    this.next = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 40);
  }
  stopBgm() { clearInterval(this.timer); this.timer = null; }
  setTrack(key, reset = false) {
    const tr = TRACKS[key] || TRACKS.home;
    this.tr = tr; this.mood = key;
    if (reset) { this.step = 0; this.bar = 0; }
  }
  /** 切场景：先淡出 0.35 秒，换曲后再淡入（旧音符自然衰减，不会有硬切） */
  crossfade(key) {
    if (!TRACKS[key] || key === this.mood) return;
    this.mood = key;                  // 立刻记下，设置页 / 曲目按钮马上就能反映
    if (!this.ctx || this.cfg.mute || !(this.cfg.bgm > 0)) { this.setTrack(key, true); return; }
    const c = this.ctx, t = c.currentTime;
    this.gainNow = 0;
    this.bgmBus.gain.cancelScheduledValues(t);
    this.bgmBus.gain.setValueAtTime(this.bgmBus.gain.value, t);
    this.bgmBus.gain.linearRampToValueAtTime(0.0001, t + 0.35);
    setTimeout(() => {
      if (!this.ctx) return;
      this.setTrack(key, true);
      this.next = this.ctx.currentTime + 0.06;
      const t2 = this.ctx.currentTime;
      this.gainNow = 1;
      const target = (this.cfg.mute ? 0 : 1) * this.cfg.bgm * 0.8;
      this.bgmBus.gain.cancelScheduledValues(t2);
      this.bgmBus.gain.setValueAtTime(0.0001, t2);
      this.bgmBus.gain.linearRampToValueAtTime(target, t2 + 0.9);
    }, 360);
  }
  /** 页面切场景。用户手动指定曲目时（autoMood=false）只记录，不切 */
  setMood(m) {
    this.pageMood = m;
    if (this.cfg.autoMood === false) return;
    this.crossfade(m);
  }
  /** 设置页里手动选曲 / 恢复「跟随页面」 */
  pickTrack(k) { this.cfg.autoMood = false; this.save(); this.ensure(); this.crossfade(k); this.startBgm(); }
  followPage() { this.cfg.autoMood = true; this.save(); this.ensure(); this.startBgm(); this.crossfade(this.pageMood); }

  tick() {
    const c = this.ctx;
    if (!c || c.state !== 'running' || this.cfg.mute || document.hidden || !(this.cfg.bgm > 0)) {
      if (c) this.next = c.currentTime + 0.06;   // 回到页面时不补播，直接从当下继续
      return;
    }
    const horizon = c.currentTime + 0.3;
    let guard = 0;
    while (this.next < horizon && guard++ < 64) {
      this.schedule(this.next);
      this.next += this.stepDur();
      this.step++;
    }
  }

  schedule(t) {
    const tr = this.tr;
    const st = this.step % 16, bar = Math.floor(this.step / 16);
    const beat = 60 / tr.bpm;
    const sc = SCALES[tr.scale] || SCALES.minor;
    const deg = (d) => tr.root + sc[((d % sc.length) + sc.length) % sc.length] + 12 * Math.floor(d / sc.length);
    const rootDeg = tr.prog[bar % tr.prog.length];
    const chord = [0, 2, 4].map((i) => midi(deg(rootDeg + i)));
    const chordHi = [0, 2, 4].map((i) => midi(deg(rootDeg + i) + 12));

    // 铺底和弦：每小节一次，慢起慢收
    if (st === 0) {
      chord.forEach((f, i) => this.pad(t + i * 0.035, f, beat * 4 * 0.98, 0.052 * tr.pad));
      if (tr.lead > 0) this.leadNote(t + beat * 0.5, chordHi[Math.floor(Math.random() * 3)], beat * 1.5, 0.05 * tr.lead);
    }
    // 低音：强拍 + 后半拍
    if (st === 0 || st === 8 || (tr.perc > 0.45 && st === 14)) {
      this.bass(t, midi(deg(rootDeg) - 12), beat * (st === 8 ? 0.9 : 1.4), 0.085 * tr.bass);
    }
    // 琶音：八分音符，在三个和弦音之间上下走，过半换高八度、左右轻微摆开
    if (tr.arp > 0 && st % 2 === 0) {
      const seq = [0, 1, 2, 1, 2, 1];
      const i = (st / 2) % seq.length;
      const n = chord[seq[i]] * (i >= 3 ? 2 : 1);
      this.arp(t, n, 0.2, 0.028 * tr.arp, i % 2 ? 0.25 : -0.25);
    }
    // 主旋律：二、三、四拍上偶尔落一个长音，走和弦音所以不会跑调
    if (tr.lead > 0 && (st === 6 || st === 10 || st === 12) && Math.random() < 0.55 * tr.lead + 0.15) {
      this.leadNote(t, chordHi[Math.floor(Math.random() * chordHi.length)] * (Math.random() < 0.25 ? 2 : 1), beat * 0.9, 0.045 * tr.lead);
    }
    // 打击：底鼓 + 军鼓 + 踩镲
    if (tr.perc > 0) {
      if (st === 0 || st === 8) this.kick(t, 0.09 * tr.perc);
      if (tr.perc > 0.32 && (st === 4 || st === 12)) this.snare(t, 0.05 * tr.perc);
    }
    if (tr.hat && st % 2 === 1) this.hat(t, 0.016 * tr.hat);
  }

  pad(t, f, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = Math.random() * 10 - 5;
    lp.type = 'lowpass'; lp.frequency.value = 600; lp.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.bgmBus); o.start(t); o.stop(t + dur + 0.06);
  }
  bass(t, f, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bgmBus); o.start(t); o.stop(t + dur + 0.04);
  }
  arp(t, f, dur, vol, pan = 0) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.bgmBus); }
    else g.connect(this.bgmBus);
    o.start(t); o.stop(t + dur + 0.03);
  }
  leadNote(t, f, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bgmBus); o.start(t); o.stop(t + dur + 0.05);
  }
  kick(t, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.bgmBus); o.start(t); o.stop(t + 0.26);
  }
  snare(t, vol) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.9;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(this.bgmBus); s.start(t, Math.random() * 0.4); s.stop(t + 0.18);
  }
  hat(t, vol) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(this.bgmBus); s.start(t, Math.random() * 0.4); s.stop(t + 0.07);
  }
}

export const sound = new Sound();
export const TRACK_ZH = Object.fromEntries(TRACK_LIST.map((x) => [x.k, x.zh]));
