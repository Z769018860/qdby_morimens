// Live 的声音全在这里合成，页面不带任何音频文件（和校猫的结合同一套思路）。
//
// 分两层：
//   · 音乐——把 arrange() 的事件表交给一个前瞻调度器，每 80ms 醒来一次，
//     把未来 0.3 秒内该响的旋律 / 贝斯 / 和弦 / 鼓用 ac.currentTime 精确排期。
//     谱面判定也用 ac.currentTime 对表，音画不会各自漂。
//   · 音效——Perfect / Good / Miss 的短促反馈，音量压得很低，
//     别盖住音乐（挂机前夜踩过的坑）。
//
// 没有音频文件的代价是「不像原曲」——这是有意的：曲名借原曲，
// 旋律是手工重编的短版，用振荡器现场奏出来。

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const Live = {
  ac: null,
  master: null,   // 总闸
  musGain: null,  // 音乐
  fxGain: null,   // 音效
  muted: false,
  playing: false,
  t0: 0,          // 歌曲起点（ac.currentTime 时刻）
  evs: [],        // 待排期的事件（按时间升序）
  ei: 0,          // 下一个待排期事件下标
  timer: 0,
  wave: 'square',

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return this.ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { this.ac = new AC(); } catch { return null; }
    this.master = this.ac.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(this.ac.destination);
    this.musGain = this.ac.createGain();
    this.musGain.gain.value = 0.9;
    this.musGain.connect(this.master);
    this.fxGain = this.ac.createGain();
    this.fxGain.gain.value = 0.5;
    this.fxGain.connect(this.master);
    return this.ac;
  },

  setMute(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  },

  // 歌曲时间（秒）。没在播就退回 0；暂停靠 ac.suspend()（currentTime 停走）。
  // 没有 AudioContext 的环境退回 performance.now 走表：照样能玩，只是没声。
  time() {
    if (!this.playing) return 0;
    if (this.ac) return Math.max(0, this.ac.currentTime - this.t0);
    return Math.max(0, performance.now() / 1000 - this.pt0);
  },

  // 开播：arr 是 arrange() 产物
  play(arr, wave) {
    const ac = this.ensure();
    this.wave = wave || 'square';
    this.evs = [];
    this.ei = 0;
    if (!ac) {
      this.pt0 = performance.now() / 1000;
      this.playing = true;
      return true;
    }
    if (ac.state === 'suspended') ac.resume();
    const lead = [];
    for (const n of arr.notes) lead.push({ t: n.t, d: n.d, m: n.m, kind: 'mel' });
    for (const c of arr.chords) {
      lead.push({ t: c.t, d: c.d, m: c.off, kind: 'bass' });
      lead.push({ t: c.t, d: c.d, off: c.off, type: c.type, kind: 'chord' });
    }
    for (const d of arr.drums) lead.push({ t: d.t, kind: d.k });
    lead.sort((a, b) => a.t - b.t);
    this.evs = lead;
    this.ei = 0;
    this.t0 = ac.currentTime + 0.12;   // 留一点起手时间，3-2-1 数拍也贴着它
    this.playing = true;
    const tick = () => {
      if (!this.playing) return;
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
    if (this.timer) clearTimeout(this.timer);
    this.timer = 0;
    if (this.ac && this.ac.state === 'suspended') this.ac.resume();
  },

  suspend() {
    if (this.ac) { if (this.ac.state === 'running') this.ac.suspend(); }
    else if (this.playing) this._psAt = performance.now() / 1000;
  },
  resume() {
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume(); }
    else if (this.playing && this._psAt != null) {
      this.pt0 += performance.now() / 1000 - this._psAt;
      this._psAt = null;
    }
  },

  // ---------------------------------------------------------------- 音色
  env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.001, t + a + d);
  },

  voice(ev, t) {
    const ac = this.ac;
    if (ev.kind === 'mel') {
      // 旋律：主振荡器 + 五度上的副振荡器，八分音符的颗粒感靠短包络
      const dur = Math.max(0.1, Math.min(ev.d * 0.92, 0.9));
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.012, dur, 0.075);
      const o = ac.createOscillator();
      o.type = this.wave;
      o.frequency.value = mtof(ev.m);
      const o2 = ac.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = mtof(ev.m) * 2.002;   // 高八度带一点失谐，亮一点
      const g2 = ac.createGain();
      g2.gain.value = 0.35;
      o.connect(g); o2.connect(g2); g2.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
      o2.start(t); o2.stop(t + dur + 0.05);
      return;
    }
    if (ev.kind === 'bass') {
      const dur = ev.d;
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.02, dur * 0.95, 0.09);
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(mtof(36 + ev.m), t);
      o.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
      return;
    }
    if (ev.kind === 'chord') {
      // 和弦垫：小三度/大三度三音，音量很低，负责「房间里有和声」
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
    // 噪声三兄弟：军鼓 / 踩镲 / 开镲 / 吊镲，长度和滤波各有各的
    const dur = k === 's' ? 0.12 : k === 'H' ? 0.03 : k === 'h' ? 0.05 : 0.5;
    const vol = k === 's' ? 0.075 : k === 'H' ? 0.02 : k === 'h' ? 0.03 : 0.05;
    const hp = k === 's' ? 1200 : k === 'c' ? 4000 : 6500;
    const n = ac.createBufferSource();
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (dur + 0.02)), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
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

  // ---------------------------------------------------------------- 音效
  fx(kind) {
    const ac = this.ac;
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    const cfg = {
      perfect: [1320, 0.05, 0.07, 'square'],
      great: [990, 0.04, 0.06, 'square'],
      good: [740, 0.035, 0.05, 'triangle'],
      hold: [1180, 0.03, 0.05, 'triangle'],
      bad: [220, 0.05, 0.12, 'sawtooth'],
      miss: [150, 0.06, 0.16, 'sawtooth'],
      skill: [880, 0.06, 0.18, 'triangle'],
    }[kind];
    if (!cfg) return;
    const [f, vol, dur, wv] = cfg;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = wv;
    o.frequency.setValueAtTime(f, t);
    if (kind === 'skill') o.frequency.exponentialRampToValueAtTime(f * 2, t + dur);
    if (kind === 'miss') o.frequency.exponentialRampToValueAtTime(f * 0.6, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.fxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },
};
