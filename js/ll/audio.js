// 声音：两条音源线路 + 一套判定音效。
//
//   ① 原曲线路 —— 解码后的 AudioBuffer 直接排进 AudioContext，时钟就是
//      ac.currentTime；暂停用 ac.suspend()，恢复后 currentTime 接着走，
//      音画判定天然同步。
//   ② 芯片线路 —— 没有导入原曲时的兜底：把 songs.js 的事件表交给前瞻调度器，
//      每 80ms 醒一次，把未来 0.3 秒的旋律/贝斯/和弦/鼓按 ac.currentTime 精确排期。
//
// 音效单独一路增益（fxGain）：原曲本身就响，判定音得不靠音量的运气。
// 五档判定各有一个音色（叮 / 嗒 / 哒 / 闷响 / 嗡嗡），连击里程碑另有一套。

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const Audio = {
  ac: null,
  master: null,
  musGain: null,
  fxGain: null,
  muted: false,
  playing: false,
  mode: 'idle',     // 'buffer' | 'chip'
  node: null,       // 原曲的 BufferSource
  t0: 0,            // 曲目零点（ac 时间轴）
  usePerf: false,   // 没有可用的 AudioContext 时，用 performance.now 走表
  pt0: 0,
  evs: [],
  ei: 0,
  timer: 0,
  wave: 'square',
  vol: { mus: 0.7, fx: 0.6 },

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      return this.ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { this.ac = new AC(); } catch (e) { return null; }
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ac.destination);
    this.musGain = ac.createGain();
    this.musGain.gain.value = this.vol.mus * this.vol.mus;
    this.musGain.connect(this.master);
    this.fxGain = ac.createGain();
    this.fxGain.gain.value = this.vol.fx * this.vol.fx;
    this.fxGain.connect(this.master);
    return ac;
  },

  setMute(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  },

  // 音量独立调：原曲常常比现场合成的响一截，两边得能分开拧
  setVol(mus, fx) {
    if (mus != null) this.vol.mus = mus;
    if (fx != null) this.vol.fx = fx;
    if (this.musGain) this.musGain.gain.value = this.vol.mus * this.vol.mus;
    if (this.fxGain) this.fxGain.gain.value = this.vol.fx * this.vol.fx;
  },

  async decode(data) {
    const ac = this.ensure();
    if (!ac) throw new Error('浏览器不支持 WebAudio');
    const buf = await new Promise((res, rej) => {
      // 老 Safari 只认回调式；新浏览器返回 Promise
      let p;
      try { p = ac.decodeAudioData(data, res, rej); } catch (e) { rej(e); return; }
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
    return buf;
  },

  // 曲目时间（秒）。暂停靠 ac.suspend()，currentTime 会停住。
  time() {
    if (!this.playing) return 0;
    if (this.ac && !this.usePerf) return Math.max(0, this.ac.currentTime - this.t0);
    return Math.max(0, performance.now() / 1000 - this.pt0);
  },

  // ---------------------------------------------------------------- 原曲
  playBuffer(buffer, fromSec) {
    const ac = this.ensure();
    this.stop();
    if (!ac) return false;
    const from = Math.max(0, fromSec || 0);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(this.musGain);
    const at = ac.currentTime + 0.22;
    try { src.start(at, from); } catch (e) { return false; }
    this.node = src;
    this.mode = 'buffer';
    this.usePerf = false;
    this.t0 = at - from;
    this.playing = true;
    return true;
  },

  // ---------------------------------------------------------------- 芯片
  playChip(arr, wave) {
    const ac = this.ensure();
    this.stop();
    this.wave = wave || 'square';
    this.mode = 'chip';
    if (!ac || ac.state === 'suspended') {
      // 拿不到声就只走表：照样能玩，只是没声
      this.usePerf = true;
      this.pt0 = performance.now() / 1000;
      this.playing = true;
      return true;
    }
    this.usePerf = false;
    const evs = [];
    for (const n of arr.notes) evs.push({ t: n.t, d: n.d, m: n.m, kind: 'mel' });
    for (const c of arr.chords) {
      evs.push({ t: c.t, d: c.d, m: c.off, kind: 'bass' });
      evs.push({ t: c.t, d: c.d, off: c.off, type: c.type, kind: 'chord' });
    }
    for (const d of arr.drums) evs.push({ t: d.t, kind: d.k });
    evs.sort((a, b) => a.t - b.t);
    this.evs = evs;
    this.ei = 0;
    this.t0 = ac.currentTime + 0.12;
    this.playing = true;
    const tick = () => {
      if (!this.playing || this.mode !== 'chip') return;
      const horizon = ac.currentTime + 0.3;
      while (this.ei < this.evs.length && this.t0 + this.evs[this.ei].t < horizon) {
        this.voice(this.evs[this.ei], this.t0 + this.evs[this.ei].t);
        this.ei++;
      }
      this.timer = setTimeout(tick, 80);
    };
    tick();
    return true;
  },

  stop() {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
    if (this.node) {
      try { this.node.stop(); } catch (e) { /* 已经停了 */ }
      try { this.node.disconnect(); } catch (e) { /* 已经断了 */ }
      this.node = null;
    }
    this.evs = [];
    this.ei = 0;
    if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {});
  },

  suspend() {
    if (this.ac) { if (this.ac.state === 'running') this.ac.suspend().catch(() => {}); }
    else if (this.playing) this._psAt = performance.now() / 1000;
  },
  resume() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume().catch(() => {}); }
    else if (this.playing) {
      if (this._psAt != null) { this.pt0 += performance.now() / 1000 - this._psAt; this._psAt = null; }
    }
  },

  /* ---------------------------------------------------------------- 芯片音色 */
  env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.001, t + a + d);
  },

  voice(ev, t) {
    const ac = this.ac;
    if (ev.kind === 'mel') {
      const dur = Math.max(0.1, Math.min(ev.d * 0.92, 0.9));
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.012, dur, 0.075);
      const o = ac.createOscillator();
      o.type = this.wave;
      o.frequency.value = mtof(ev.m);
      const o2 = ac.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = mtof(ev.m) * 2.002;
      const g2 = ac.createGain();
      g2.gain.value = 0.35;
      o.connect(g); o2.connect(g2); g2.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
      o2.start(t); o2.stop(t + dur + 0.05);
      return;
    }
    if (ev.kind === 'bass') {
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.02, ev.d * 0.95, 0.09);
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(mtof(36 + ev.m), t);
      o.connect(g);
      o.start(t); o.stop(t + ev.d + 0.05);
      return;
    }
    if (ev.kind === 'chord') {
      const iv = ev.type === 'm' ? [0, 3, 7] : ev.type === 'd' ? [0, 3, 6] : [0, 4, 7];
      for (const ivl of iv) {
        const g = ac.createGain();
        g.connect(this.musGain);
        this.env(g, t, 0.05, ev.d * 0.9, 0.018);
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(48 + ev.off + ivl);
        o.connect(g);
        o.start(t); o.stop(t + ev.d + 0.05);
      }
      return;
    }
    this.drum(ev.kind, t);
  },

  drum(k, t) {
    const ac = this.ac;
    if (k === 'k') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(this.musGain);
      o.start(t); o.stop(t + 0.15);
      return;
    }
    const dur = k === 's' ? 0.12 : k === 'H' ? 0.03 : k === 'h' ? 0.05 : 0.5;
    const vol = k === 's' ? 0.075 : k === 'H' ? 0.02 : k === 'h' ? 0.03 : 0.05;
    const hp = k === 's' ? 1200 : k === 'c' ? 4000 : 6500;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (dur + 0.02)), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.musGain);
    n.start(t); n.stop(t + dur + 0.02);
  },

  /* ---------------------------------------------------------------- 判定音效 */
  // 五档各有各的「手感」：Perfect 是亮铃、Great 是软一点的铃、Good 是木鱼、
  // Bad 是闷响、Miss 是往下掉的嗡嗡。全部从 fxGain 出，不碰音乐那一路。
  tone(t, freq, dur, vol, type, glide) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(this.fxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  click(t, dur, vol, hp) {
    const ac = this.ac;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (dur + 0.01)), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
    }
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hp || 2400;
    f.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.value = vol;
    n.connect(f); f.connect(g); g.connect(this.fxGain);
    n.start(t); n.stop(t + dur + 0.01);
  },

  fx(kind, n) {
    const ac = this.ac;
    if (!ac || this.usePerf || ac.state !== 'running') return;
    const t = ac.currentTime + 0.001;
    const detune = 1 + ((n || 0) % 3 - 1) * 0.012;      // 连着点时不要像蜂鸣器
    switch (kind) {
      case 'p':
        // 铃：基音 + 五度泛音，亮而不刺
        this.tone(t, 1568 * detune, 0.09, 0.16, 'sine');
        this.tone(t, 2093 * detune, 0.07, 0.09, 'sine');
        this.click(t, 0.02, 0.05, 3200);
        break;
      case 'g':
        this.tone(t, 1318 * detune, 0.075, 0.13, 'sine');
        this.tone(t, 1760 * detune, 0.05, 0.05, 'sine');
        this.click(t, 0.015, 0.035, 2800);
        break;
      case 'go':
        this.tone(t, 880, 0.06, 0.10, 'triangle');
        this.click(t, 0.02, 0.04, 1600);
        break;
      case 'b':
        this.tone(t, 196, 0.09, 0.13, 'sawtooth', 130);
        this.click(t, 0.03, 0.05, 700);
        break;
      case 'm':
        this.tone(t, 210, 0.24, 0.12, 'square', 82);
        this.tone(t + 0.02, 105, 0.2, 0.07, 'sine', 60);
        break;
      case 'hold':
        this.tone(t, 1174, 0.1, 0.10, 'triangle');
        this.tone(t + 0.05, 1568, 0.1, 0.07, 'sine');
        break;
      case 'holdstart':
        this.click(t, 0.03, 0.06, 1800);
        this.tone(t, 660, 0.06, 0.05, 'sine');
        break;
      case 'break':
        this.tone(t, 300, 0.12, 0.09, 'sawtooth', 160);
        break;
      case 'skill':
        this.tone(t, 1046, 0.07, 0.08, 'triangle');
        this.tone(t + 0.06, 1318, 0.07, 0.08, 'triangle');
        this.tone(t + 0.12, 1568, 0.12, 0.09, 'triangle');
        break;
      case 'combo':
        this.tone(t, 1046, 0.06, 0.07, 'sine');
        this.tone(t + 0.05, 1568, 0.09, 0.07, 'sine');
        break;
      default:
        break;
    }
  },
};
