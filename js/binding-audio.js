// 全部声音都在这里用 WebAudio 现场合成，页面不带任何音频文件。
//
// 分两层：
//   · 音效（blip / noise 派生）——短、干、可叠加，一次一个包络，不做混响。
//   · 背景音乐（SONGS + 一个前瞻调度器）——每层一套和声走向，只用振荡器：
//     低音铺底、和弦垫、每拍一个琶音，首领层加噪声脉冲。音量压得很低（0.02~0.05），
//     作用是「房间有空气」，不是「有首歌」。静音一个开关全管。
//
// 调度器用 lookahead：每 90ms 醒来一次，把未来 0.28 秒内该响的音符用 ac.currentTime
// 精确排期。这样即使主线程在算弹幕，拍子也不会抖。

const SONGS = {
  // 标题：音乐盒。五声音阶，慢，尾音长
  title: { bpm: 64, root: 60, wave: 'triangle', chords: [[0, 4, 7, 11], [-3, 2, 5, 9], [-5, 0, 4, 7], [-1, 4, 7, 11]], arp: 1, pad: 1, bass: 0, hat: 0, vol: 0.030 },
  // 一层：A 小调，木走廊的步子
  hall: { bpm: 72, root: 57, wave: 'triangle', chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [0, 3, 7, 10]], arp: 1, pad: 1, bass: 1, hat: 0.5, vol: 0.026 },
  // 二层：D 小调，瓷砖下的半音摩擦
  lab: { bpm: 66, root: 50, wave: 'sine', chords: [[0, 3, 7, 10], [1, 5, 8, 11], [-2, 1, 5, 8], [0, 3, 6, 10]], arp: 1, pad: 1, bass: 1, hat: 0.7, vol: 0.026 },
  // 蜡像馆：三拍子的圆舞曲，慢半拍
  wax: { bpm: 92, root: 55, wave: 'triangle', chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, 0, 3]], arp: 1, pad: 0, bass: 1, hat: 0, vol: 0.024, waltz: 1 },
  // 天台：最稀疏，只有垫音和偶尔的星点
  roof: { bpm: 54, root: 54, wave: 'sine', chords: [[0, 7, 12], [-2, 5, 10], [0, 7, 14], [-4, 3, 8]], arp: 0.4, pad: 1, bass: 0, hat: 0, vol: 0.024 },
  // 首领：低音脉冲 + 三全音
  boss: { bpm: 104, root: 45, wave: 'sawtooth', chords: [[0, 6, 12], [-1, 5, 11], [0, 6, 13], [-2, 4, 10]], arp: 1, pad: 1, bass: 1, hat: 1, vol: 0.030, drive: 1 },
  // 锅炉房：机械的、匀速的，底鼓像活塞一下一下顶
  boiler: { bpm: 84, root: 43, wave: 'square', chords: [[0, 5, 8], [-2, 3, 7], [0, 5, 10], [-3, 4, 8]], arp: 0.8, pad: 0.5, bass: 1, hat: 1, vol: 0.024, drive: 0.7 },
  // 大礼堂：圆舞曲的另一面，转得快一点，像有人还在跳
  opera: { bpm: 108, root: 52, wave: 'triangle', chords: [[0, 4, 7], [-3, 1, 4], [-1, 2, 5], [-5, 0, 4]], arp: 1, pad: 1, bass: 1, hat: 0, vol: 0.026, waltz: 1 },
  // 礼拜堂：管风琴的路子，慢、宽，只走和弦不走过门
  chapel: { bpm: 58, root: 48, wave: 'sine', chords: [[0, 4, 7, 12], [-3, 2, 5, 9], [-5, 0, 4, 7], [-1, 4, 7, 11]], arp: 0.5, pad: 1, bass: 1, hat: 0, vol: 0.026 },
  // 深渊：最慢的一层，低音撑着，上面的音偶尔才出现
  abyss: { bpm: 46, root: 41, wave: 'sawtooth', chords: [[0, 6, 11], [-1, 5, 10], [0, 7, 12], [-3, 4, 9]], arp: 0.35, pad: 1, bass: 1, hat: 0, vol: 0.025 },
  // 天亮：大调，收束
  dawn: { bpm: 70, root: 62, wave: 'triangle', chords: [[0, 4, 7, 12], [2, 5, 9, 14], [-3, 0, 4, 9], [0, 4, 7, 12]], arp: 1, pad: 1, bass: 1, hat: 0, vol: 0.028 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const Audio2 = {
  ac: null,
  master: null,
  muted: false,
  ducked: false,
  key: null,
  step: 0,
  next: 0,
  timer: 0,

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return this.ac;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ac.destination);
      if (this.key) this.music(this.key, true);
    } catch (e) { this.ac = null; }
    return this.ac;
  },

  setMuted(v) {
    this.muted = !!v;
    if (this.master) this.master.gain.value = this.muted ? 0 : (this.ducked ? 0.32 : 0.9);
  },

  // 暂停 / 对话框打开时把音乐压下去，不是掐断
  duck(on) {
    this.ducked = !!on;
    if (this.master) {
      const ac = this.ac;
      const target = this.muted ? 0 : (this.ducked ? 0.3 : 0.9);
      try { this.master.gain.setTargetAtTime(target, ac.currentTime, 0.12); } catch (e) { this.master.gain.value = target; }
    }
  },

  // ---------------------------------------------------------------- 音效
  tone(freq, at, dur, type, vol) {
    const ac = this.ac;
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(at);
    o.stop(at + dur + 0.03);
  },

  blip(freq, dur, type, vol, slide) {
    if (this.muted) return;
    const ac = this.ensure();
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    const t0 = ac.currentTime;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.05 : vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.onended = () => { o.disconnect(); g.disconnect(); };
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  // Shared white-noise buffer avoids allocating a fresh AudioBuffer and
  // filling thousands of floats for every enemy hit during a boss fight.
  noise(dur, vol, hp) {
    if (this.muted) return;
    const ac = this.ensure();
    if (!ac) return;
    const now = performance.now();
    if (now - (this.lastNoiseAt || 0) < 35) return;
    this.lastNoiseAt = now;
    if (!this.noiseBuffer || this.noiseBuffer.sampleRate !== ac.sampleRate) {
      const n = Math.ceil(ac.sampleRate * 0.5);
      const buf = ac.createBuffer(1, n, ac.sampleRate);
      const samples = buf.getChannelData(0);
      for (let i = 0; i < n; i++) samples[i] = Math.random() * 2 - 1;
      this.noiseBuffer = buf;
    }
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 400;
    const t = ac.currentTime, length = Math.max(0.01, Math.min(dur, 0.49));
    g.gain.setValueAtTime(vol == null ? 0.06 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.buffer = this.noiseBuffer;
    src.connect(f).connect(g).connect(this.master);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start(t);
    src.stop(t + length + 0.01);
  },

  shoot() { const t = performance.now(); if (t - (this.lastShootAt || 0) < 65) return; this.lastShootAt = t; this.blip(620, 0.07, 'square', 0.022, 0.5); },
  hit() { this.noise(0.07, 0.04, 1100); },
  crit() { this.blip(1320, 0.06, 'square', 0.03, 1.7); this.noise(0.1, 0.05, 1800); },
  kill() { this.blip(180, 0.16, 'sawtooth', 0.035, 0.35); },
  hurt() { this.blip(140, 0.22, 'sawtooth', 0.07, 0.6); },
  coin() { this.blip(1180, 0.06, 'triangle', 0.045); setTimeout(() => this.blip(1580, 0.07, 'triangle', 0.035), 52); },
  pickup() { [720, 960, 1240].forEach((f, i) => setTimeout(() => this.blip(f, 0.1, 'triangle', 0.04), i * 55)); },
  item() { [660, 880, 1180, 1480].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.045), i * 85)); },
  heart() { [520, 780].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'sine', 0.05), i * 110)); },
  // 残血时的心跳：两声低沉的「咚·咚」，比 hurt 轻，不盖过枪声
  heartbeat() {
    this.blip(62, 0.15, 'sine', 0.06, 0.72);
    setTimeout(() => this.blip(48, 0.17, 'sine', 0.05, 0.72), 155);
  },
  door() { this.blip(220, 0.12, 'sine', 0.045, 1.6); },
  boom() { this.noise(0.32, 0.09, 120); this.blip(90, 0.34, 'sine', 0.07, 0.4); },
  die() { [440, 330, 260, 180].forEach((f, i) => setTimeout(() => this.blip(f, 0.24, 'sine', 0.045), i * 140)); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.04), i * 70)); },
  stairs() { [700, 560, 440, 330].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'sine', 0.04), i * 90)); },
  roar() {
    this.noise(0.55, 0.085, 90);
    this.blip(70, 0.7, 'sawtooth', 0.07, 0.55);
    setTimeout(() => this.blip(52, 0.6, 'square', 0.05, 0.6), 120);
  },
  unlock() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.04), i * 95)); },
  deny() { this.blip(200, 0.1, 'square', 0.04, 0.8); },
  buy() { this.blip(900, 0.08, 'triangle', 0.04); setTimeout(() => this.blip(1200, 0.1, 'triangle', 0.035), 70); },
  // 打字机：每几个字一声，极轻，避免吵
  type() { this.blip(1500 + Math.random() * 300, 0.02, 'square', 0.008); },

  // ---------------------------------------------------------------- BGM
  music(key, force) {
    if (!key || key === 'none') { this.stopMusic(); return; }
    if (this.key === key && !force) return;
    this.key = key;
    this.step = 0;
    if (!this.ac) { this.ensure(); if (!this.ac) return; }
    const ac = this.ac;
    this.next = ac.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this._sched(), 90);
    this._sched();
  },

  stopMusic() {
    this.key = null;
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
  },

  _sched() {
    const ac = this.ac;
    if (!ac || !this.key) return;
    const song = SONGS[this.key];
    if (!song) return;
    const beat = 60 / song.bpm;
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;   // 标签页回来时会落后一大截
    let guard = 0;
    while (this.next < ac.currentTime + 0.28 && guard++ < 24) {
      this._playStep(song, this.step, this.next, beat);
      this.step += 1;
      this.next += beat;
    }
  },

  _playStep(song, step, at, beat) {
    const bar = Math.floor(step / 4) % song.chords.length;
    const chord = song.chords[bar];
    const inBar = step % 4;
    const vol = song.vol;

    // 低音：每两拍一次，压到 root-24 附近，撑住整段
    if (song.bass && inBar % 2 === 0) {
      this.tone(mtof(song.root - 24 + chord[0]), at, beat * 1.7, 'sine', vol * 0.9);
    }
    // 和弦垫：每小节第一个音，长衰减（相当于没有混响的铺底）
    if (song.pad && inBar === 0) {
      for (let i = 0; i < chord.length; i++) {
        this.tone(mtof(song.root - 12 + chord[i]), at, beat * 3.4, song.wave, vol * 0.45);
      }
    }
    // 琶音：每拍一个音，按小节轮转，隔一个八度
    if (song.arp && (song.waltz || inBar % 1 === 0)) {
      const idx = (step + bar) % chord.length;
      const oct = (step % 8 < 4) ? 0 : 12;
      const gate = song.arp < 1 ? (Math.random() < song.arp) : true;
      if (gate) this.tone(mtof(song.root + 12 + chord[idx] + oct), at, beat * 0.85, song.wave, vol * 0.7);
    }
    // 噪声：当节拍器，首领层密一点
    if (song.hat && inBar % (song.drive ? 1 : 2) === 0) {
      this.noiseAt(at, 0.05, song.drive ? 2600 : 3600, vol * 0.32);
    }
    // 首领：每小节第一拍补一个低频冲击
    if (song.drive && inBar === 0) {
      this.tone(mtof(song.root - 12), at, beat * 0.5, 'square', vol * 0.6);
    }
  },

  noiseAt(at, dur, hp, vol) {
    const ac = this.ac;
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
  },
};
