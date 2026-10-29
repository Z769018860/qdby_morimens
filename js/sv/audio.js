// 《唤醒体幸存者》的声音：全部用 WebAudio 现场合成，页面不带任何音频文件。
//
// 为什么不像其它页面那样挂几个 mp3：这一页的首屏被 EdgeOne 压到「每个请求
// 1~2 秒」，现在整局只拉一个脚本（890KB 里还塞着图集）。再挂十几条音频，
// 进游戏前的等待时间会翻倍，而音效恰恰是最经不起等的东西。
//
// 两层：
//   · sfx.play(name)  短音效。每个音是「振荡器 + 包络」或「噪声 + 带通」，
//                     同类音效按 GAP 限流 —— 后期一秒几十杀，不限流会糊成噪音。
//   · sfx.music(key)  背景乐。pick（选人）/ run（战斗）/ boss（首领），
//                     用前瞻调度器按 ac.currentTime 精确排期，主线程在算弹幕
//                     的时候拍子也不会抖。
//
// 音量整体压得很低（sfx 0.02~0.05、music 0.018）：这一页是「有声音」，
// 不是「在放歌」。静音存 zjtt:survivors:mute。

const MUTE_KEY = 'zjtt:survivors:mute';

// 同一音效的最小间隔（毫秒）
const GAP = {
  hit: 52, crit: 95, kill: 58, pickup: 90, coin: 70, click: 32, deny: 240,
  hurt: 150, shoot: 70, wave: 400, boss: 900, evo: 600,
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 三首循环曲。chords 是相对 root 的半音，四小节一轮。
// 调性都比《忘却协议》低一截：这一页是「禁区」，底色是沉的。
const SONGS = {
  // 选人：极慢，只有垫音和偶发的钟 —— 让玩家听清自己在点哪个唤醒体
  pick: { bpm: 48, root: 50, wave: 'triangle', vol: 0.016, pad: 1, bass: 0.5, bell: 0.5,
    chords: [[0, 3, 7, 10], [-2, 2, 5, 9], [-4, 0, 3, 7], [0, 3, 7, 10]] },
  // 战斗：低频脉冲推进 + 每两拍一记噪声，八分音符的紧迫感
  run: { bpm: 92, root: 43, wave: 'sawtooth', vol: 0.015, pad: 0.7, bass: 1, hat: 1, arp: 0.85,
    chords: [[0, 3, 7, 10], [0, 3, 7, 10], [-4, 0, 3, 7], [-5, 0, 2, 7]] },
  // 首领：更低更慢，三全音 —— 一听就知道这一波不一样
  boss: { bpm: 78, root: 39, wave: 'square', vol: 0.017, pad: 1, bass: 1, hat: 1, drive: 1, arp: 0.6,
    chords: [[0, 6, 12], [-1, 5, 11], [0, 6, 13], [-2, 4, 10]] },
};

export const sfx = {
  ac: null,
  master: null,
  musicGain: null,
  on: true,
  key: null,
  step: 0,
  next: 0,
  timer: 0,
  last: {},

  init() {
    try { this.on = localStorage.getItem(MUTE_KEY) !== '1'; } catch { this.on = true; }
    return this;
  },

  // 浏览器不允许在用户手势之前建 AudioContext，所以所有出口都先过这里
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
      this.master.gain.value = this.on ? 1 : 0;
      // 上下两条总线：音效直接进 master，音乐走 musicGain，方便单独压低
      this.musicGain = this.ac.createGain();
      this.musicGain.gain.value = 1;
      this.musicGain.connect(this.master);
      this.master.connect(this.ac.destination);
      if (this.key) this.music(this.key, true);
    } catch { this.ac = null; }
    return this.ac;
  },

  setMuted(v) {
    this.on = !v;
    try { localStorage.setItem(MUTE_KEY, this.on ? '0' : '1'); } catch { /* 隐私模式算了 */ }
    if (this.master && this.ac) {
      try { this.master.gain.setTargetAtTime(this.on ? 1 : 0, this.ac.currentTime, 0.05); }
      catch { this.master.gain.value = this.on ? 1 : 0; }
    }
    if (!this.on) this.stopMusic();
    else if (this.key) this.music(this.key, true);
    return this.on;
  },

  // ---------------------------------------------------------------- 基础音源
  tone(freq, at, dur, type, vol, slideTo, bus) {
    const ac = this.ac;
    if (!ac || !this.on) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, at);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), at + dur);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.02, dur * 0.35));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(bus || this.master);
    o.start(at);
    o.stop(at + dur + 0.03);
  },

  noise(at, dur, vol, hp, q, bus) {
    const ac = this.ac;
    if (!ac || !this.on) return;
    const n = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hp || 1400;
    f.Q.value = q || 1;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.buffer = buf;
    src.connect(f).connect(g).connect(bus || this.master);
    src.start(at);
  },

  // ---------------------------------------------------------------- 一次性音效
  play(name, opt) {
    if (!this.on) return;
    // 限流放在最前面：hit/crit 这类音效一帧可能被调用几十次，
    // 先过一遍时间闸门，才不会每次都去问 ensure() 要 AudioContext。
    const gap = GAP[name];
    if (gap) {
      const t = performance.now();
      if (this.last[name] && t - this.last[name] < gap) return;
      this.last[name] = t;
    }
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const v = (opt && opt.vol) || 1;
    switch (name) {
      // ---- 界面
      case 'click': this.tone(720, now, 0.045, 'triangle', 0.026 * v); break;
      case 'deny': this.tone(180, now, 0.12, 'square', 0.030 * v, 140);
        this.tone(140, now + 0.08, 0.11, 'square', 0.024 * v, 110); break;
      case 'pick':
        this.tone(523, now, 0.08, 'triangle', 0.032 * v);
        this.tone(784, now + 0.055, 0.14, 'triangle', 0.028 * v); break;
      case 'skip':
        // 跳过：一声「放下」，比选项低、短、不带希望
        this.tone(330, now, 0.12, 'sine', 0.028 * v, 262);
        this.noise(now, 0.1, 0.012 * v, 900, 1.2); break;
      case 'item':
        this.tone(300, now, 0.09, 'square', 0.024 * v, 520);
        this.tone(900, now + 0.06, 0.12, 'triangle', 0.022 * v); break;
      case 'levelup':
        [523, 659, 784].forEach((f, i) => this.tone(f, now + i * 0.05, 0.17, 'triangle', 0.028 * v));
        break;
      // 超武觉醒：整局最该被听见的一声
      case 'evo':
        [392, 523, 659, 784, 1046].forEach((f, i) =>
          this.tone(f, now + i * 0.06, 0.55, 'triangle', 0.034 * v));
        this.tone(mtof(33), now, 0.9, 'sine', 0.045 * v);
        this.noise(now, 0.45, 0.022 * v, 2600, 0.7);
        break;

      // ---- 战斗
      case 'shoot': this.tone(640, now, 0.05, 'square', 0.012 * v, 880); break;
      case 'hit': this.noise(now, 0.045, 0.016 * v, 1500, 1.7); break;
      case 'crit':
        this.noise(now, 0.09, 0.026 * v, 2500, 1.2);
        this.tone(1180, now, 0.06, 'square', 0.022 * v, 1800); break;
      case 'kill':
        this.tone(150, now, 0.14, 'sawtooth', 0.026 * v, 85);
        this.noise(now, 0.1, 0.018 * v, 880, 1.1); break;
      case 'hurt': this.tone(115, now, 0.15, 'sawtooth', 0.034 * v, 75); break;
      case 'pickup': this.tone(1180, now, 0.05, 'sine', 0.014 * v, 1600); break;
      case 'rageFull':
        [660, 880, 1108].forEach((f, i) => this.tone(f, now + i * 0.07, 0.3, 'sine', 0.030 * v));
        this.tone(mtof(38), now, 0.5, 'sawtooth', 0.026 * v); break;
      case 'rage':
        this.tone(70, now, 0.6, 'sawtooth', 0.052 * v, 45);
        this.noise(now, 0.5, 0.042 * v, 1600, 0.6);
        this.tone(210, now + 0.06, 0.4, 'square', 0.030 * v, 90); break;
      case 'boss':
        this.tone(mtof(27), now, 1.1, 'sawtooth', 0.048 * v, mtof(24));
        this.tone(mtof(39), now + 0.12, 0.9, 'square', 0.026 * v);
        this.noise(now, 0.7, 0.028 * v, 420, 0.8); break;
      case 'wave':
        this.tone(196, now, 0.3, 'sawtooth', 0.030 * v, 262);
        this.noise(now, 0.24, 0.020 * v, 760, 0.8);
        this.tone(392, now + 0.14, 0.26, 'triangle', 0.026 * v, 523); break;
      case 'win':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, now + i * 0.12, 0.7, 'triangle', 0.034 * v));
        this.tone(mtof(36), now, 1.5, 'sine', 0.040 * v); break;
      case 'lose':
        [330, 277, 220, 165].forEach((f, i) => this.tone(f, now + i * 0.2, 0.65, 'sine', 0.036 * v));
        this.tone(mtof(29), now + 0.28, 1.3, 'sawtooth', 0.026 * v); break;
      default: break;
    }
  },

  // ---------------------------------------------------------------- 背景乐
  music(key, force) {
    if (!key) { this.stopMusic(); return; }
    if (this.key === key && !force) return;
    this.key = key;
    this.step = 0;
    if (!this.on) return;
    if (!this.ensure()) return;
    this.next = this.ac.currentTime + 0.12;
    if (!this.timer) this.timer = setInterval(() => this.sched(), 90);
    this.sched();
  },

  stopMusic() {
    this.key = null;
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
  },

  sched() {
    const ac = this.ac;
    if (!ac || !this.key || !this.on) return;
    // 还没被用户手势解锁时 currentTime 是冻住的，照常排期会把同一拍
    // 反复塞进队列（每 90ms 24 个音符），纯属白烧 CPU。等真的跑起来再排。
    if (ac.state !== 'running') return;
    const song = SONGS[this.key];
    if (!song) return;
    const beat = 60 / song.bpm;
    // 切标签页回来会落后一大截，直接跳到「现在」，别把攒下的音符一口气倒出来
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;
    let guard = 0;
    while (this.next < ac.currentTime + 0.35 && guard++ < 24) {
      this.playStep(song, this.step, this.next, beat);
      this.step += 1;
      this.next += beat;
    }
  },

  playStep(song, step, at, beat) {
    const bus = this.musicGain || this.master;
    const bar = Math.floor(step / 4) % song.chords.length;
    const chord = song.chords[bar];
    const inBar = step % 4;
    const v = song.vol;
    // 低音：每两拍一次，很长
    if (song.bass && inBar % 2 === 0) this.tone(mtof(song.root - 24 + chord[0]), at, beat * 2.0, 'sine', v * 0.9, 0, bus);
    // 和弦垫：每小节头一拍
    if (song.pad && inBar === 0) {
      for (let i = 0; i < chord.length; i++) {
        this.tone(mtof(song.root - 12 + chord[i]), at, beat * 3.8, song.wave, v * 0.38, 0, bus);
      }
    }
    // 琶音
    if (song.arp && (song.arp >= 1 || Math.random() < song.arp)) {
      const idx = (step + bar) % chord.length;
      const oct = step % 8 < 4 ? 0 : 12;
      this.tone(mtof(song.root + 12 + chord[idx] + oct), at, beat * 0.75, song.wave, v * 0.5, 0, bus);
    }
    // 选人层的钟：每两小节一次，高、慢、远
    if (song.bell && inBar === 0 && bar % 2 === 0) {
      this.tone(mtof(song.root + 36), at, beat * 5, 'sine', v * 0.55, 0, bus);
    }
    // 噪声当节拍器；首领层加密
    if (song.hat && inBar % (song.drive ? 1 : 2) === 0) this.noise(at, 0.04, v * 0.26, song.drive ? 2600 : 3600, 1.1, bus);
    // 首领：每小节第一拍补一记低音冲击
    if (song.drive && inBar === 0) this.tone(mtof(song.root - 12), at, beat * 0.45, 'square', v * 0.5, 0, bus);
  },
};

sfx.init();
