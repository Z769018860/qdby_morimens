// 《忘却协议》的声音：全部用 WebAudio 现场合成，页面不带任何音频文件
// （这一页一共就两个请求，加一堆 mp3 会把首屏拖成七八秒）。
//
// 两层：
//   · sfx.play(name)   短音效。每个音都是「振荡器 + 包络」或「噪声 + 滤波」，
//                      一次一个，不做混音池 —— 这一局最多同屏二十来个人，够用。
//   · sfx.music(key)   背景音乐。三个层：备战（prep）/ 战斗（fight）/ 首领（boss），
//                      用前瞻调度器（lookahead）按 ac.currentTime 精确排期，
//                      主线程在算战斗时拍子也不会抖。
//
// 音量整体压得很低（sfx 0.02~0.06、music 0.02）：这个页面是「有声音」，不是「在放歌」。
// 静音开关存在 localStorage 的 zjtt:pf:mute，下次进来还是静音。

const MUTE_KEY = 'zjtt:pf:mute';

// 同一种音效的最小间隔（毫秒）。二十个人同时普攻，不限流会糊成一片噪音。
const GAP = {
  hit: 55, crit: 90, kill: 70, poison: 240, coin: 60, click: 30, deny: 260, hurt: 120,
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 三首循环的背景乐。chords 是相对 root 的半音，四个小节循环一次。
const SONGS = {
  // 备战：慢、空，只有垫音和偶尔的琶音 —— 让玩家能听清自己在点按钮
  prep: { bpm: 62, root: 53, wave: 'triangle', vol: 0.020, arp: 0.45, pad: 1, bass: 0.6,
    chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [0, 3, 7, 10]] },
  // 战斗：加了低音脉冲和噪声拍，A 小调，八分音符的紧迫感
  fight: { bpm: 96, root: 45, wave: 'sawtooth', vol: 0.019, arp: 1, pad: 0.7, bass: 1, hat: 1,
    chords: [[0, 3, 7, 10], [0, 3, 7, 10], [-4, 0, 3, 7], [-5, 0, 2, 7]] },
  // 首领：更低、更慢、三全音 —— 一听就知道这一波不一样
  boss: { bpm: 84, root: 41, wave: 'square', vol: 0.021, arp: 1, pad: 1, bass: 1, hat: 1, drive: 1,
    chords: [[0, 6, 12], [-1, 5, 11], [0, 6, 13], [-2, 4, 10]] },
};

export const sfx = {
  ac: null,
  master: null,
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

  // 浏览器不允许在用户手势之前建 AudioContext，所以所有出口都先过一遍这里
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
  tone(freq, at, dur, type, vol, slideTo) {
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
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.03);
  },

  noise(at, dur, vol, hp, q) {
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
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
  },

  // ---------------------------------------------------------------- 一次性音效
  play(name, opt) {
    if (!this.on) return;
    const ac = this.ensure();
    if (!ac) return;
    const now = ac.currentTime;
    const gap = GAP[name];
    if (gap) {
      const t = performance.now();
      if (this.last[name] && t - this.last[name] < gap) return;
      this.last[name] = t;
    }
    const v = (opt && opt.vol) || 1;
    switch (name) {
      // 界面
      case 'click': this.tone(760, now, 0.05, 'triangle', 0.030 * v); break;
      case 'tab': this.tone(540, now, 0.06, 'triangle', 0.026 * v, 700); break;
      case 'deny': this.tone(190, now, 0.13, 'square', 0.034 * v, 150);
        this.tone(150, now + 0.09, 0.12, 'square', 0.028 * v, 120); break;
      case 'buy': this.tone(880, now, 0.07, 'triangle', 0.034 * v);
        this.tone(1320, now + 0.055, 0.10, 'triangle', 0.028 * v); break;
      case 'sell': this.tone(520, now, 0.08, 'triangle', 0.032 * v, 320);
        this.tone(760, now + 0.05, 0.1, 'triangle', 0.024 * v); break;
      case 'reroll': this.noise(now, 0.16, 0.03 * v, 2200, 0.8);
        [430, 560, 700].forEach((f, i) => this.tone(f, now + i * 0.045, 0.1, 'triangle', 0.024 * v)); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) =>
        this.tone(f, now + i * 0.06, 0.16, 'triangle', 0.030 * v)); break;
      case 'equip': this.tone(300, now, 0.09, 'square', 0.026 * v, 520);
        this.tone(900, now + 0.07, 0.09, 'triangle', 0.024 * v); break;
      case 'deploy': this.tone(240, now, 0.1, 'sine', 0.036 * v, 150);
        this.noise(now, 0.09, 0.022 * v, 600, 1.2); break;
      // 升星：这是整局最该听见的声音之一，做得比买东西隆重
      case 'merge2': [523, 659, 784, 1046, 1318].forEach((f, i) =>
        this.tone(f, now + i * 0.055, 0.3, 'triangle', 0.040 * v));
        this.tone(mtof(41), now, 0.5, 'sine', 0.05 * v); break;
      case 'merge3': [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) =>
        this.tone(f, now + i * 0.05, 0.42, 'triangle', 0.042 * v));
        this.tone(mtof(29), now, 0.9, 'sine', 0.055 * v);
        this.noise(now, 0.5, 0.03 * v, 3000, 0.7); break;
      // 战斗
      case 'hit': this.noise(now, 0.05, 0.020 * v, 1600, 1.6); break;
      case 'crit': this.noise(now, 0.1, 0.032 * v, 2600, 1.2);
        this.tone(1240, now, 0.06, 'square', 0.026 * v, 1900); break;
      case 'shoot': this.tone(620, now, 0.06, 'square', 0.016 * v, 900); break;
      case 'kill': this.tone(160, now, 0.16, 'sawtooth', 0.030 * v, 90);
        this.noise(now, 0.12, 0.024 * v, 900, 1.1); break;
      case 'hurt': this.tone(120, now, 0.16, 'sawtooth', 0.036 * v, 80); break;
      case 'poison': this.tone(300, now, 0.22, 'sine', 0.020 * v, 190); break;
      // 漏怪：全屏欠打的一声
      case 'leak': this.tone(90, now, 0.5, 'sawtooth', 0.055 * v, 55);
        this.noise(now, 0.34, 0.04 * v, 320, 0.9);
        this.tone(140, now + 0.1, 0.34, 'square', 0.03 * v, 70); break;
      case 'wave': this.tone(196, now, 0.32, 'sawtooth', 0.036 * v, 262);
        this.noise(now, 0.26, 0.026 * v, 700, 0.8);
        this.tone(392, now + 0.16, 0.28, 'triangle', 0.03 * v, 523); break;
      case 'clear': [392, 523, 659, 784].forEach((f, i) =>
        this.tone(f, now + i * 0.08, 0.26, 'triangle', 0.032 * v)); break;
      case 'win': [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
        this.tone(f, now + i * 0.13, 0.7, 'triangle', 0.038 * v));
        this.tone(mtof(36), now, 1.6, 'sine', 0.045 * v); break;
      case 'lose': [330, 277, 220, 165].forEach((f, i) =>
        this.tone(f, now + i * 0.22, 0.7, 'sine', 0.042 * v));
        this.tone(mtof(29), now + 0.3, 1.4, 'sawtooth', 0.03 * v); break;

      // ---- 六种大招各有各的声音：这是「不同技能看得出不同」的另一半
      case 'ultNuke':
        // 落雷：低频砸下来 + 高频穿过
        this.tone(1400, now, 0.1, 'square', 0.03 * v, 200);
        this.tone(70, now + 0.05, 0.5, 'sawtooth', 0.055 * v, 40);
        this.noise(now + 0.05, 0.4, 0.045 * v, 1800, 0.6); break;
      case 'ultSplash':
        // 冲击波：噪声炸开，尾音往下掉
        this.noise(now, 0.34, 0.045 * v, 900, 0.5);
        this.tone(300, now, 0.36, 'sawtooth', 0.032 * v, 90); break;
      case 'ultGuard':
        // 护罩：上行的水晶音 + 短促的低音垫
        [660, 880, 1108, 1320].forEach((f, i) =>
          this.tone(f, now + i * 0.04, 0.42, 'sine', 0.030 * v));
        this.tone(180, now, 0.3, 'triangle', 0.024 * v); break;
      case 'ultHaste':
        // 加速：上扬的滑音，像一阵风
        this.tone(420, now, 0.42, 'triangle', 0.030 * v, 1600);
        this.noise(now, 0.3, 0.022 * v, 3200, 0.9); break;
      case 'ultStun':
        // 眩晕：高频颤音 + 金属味
        [1568, 1318, 1568, 1046].forEach((f, i) =>
          this.tone(f, now + i * 0.06, 0.14, 'square', 0.024 * v));
        this.tone(220, now, 0.3, 'sine', 0.026 * v, 160); break;
      case 'ultHeal':
        // 治疗：柔和的五度
        [523, 784, 1046].forEach((f, i) =>
          this.tone(f, now + i * 0.07, 0.54, 'sine', 0.030 * v));
        break;
      default: break;
    }
  },

  // ---------------------------------------------------------------- 背景音乐
  music(key, force) {
    if (!key) { this.stopMusic(); return; }
    if (this.key === key && !force) return;
    this.key = key;
    this.step = 0;
    if (!this.on) return;
    if (!this.ensure()) return;
    this.next = this.ac.currentTime + 0.1;
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
    const song = SONGS[this.key];
    if (!song) return;
    const beat = 60 / song.bpm;
    // 切标签页回来会落后一大截，直接跳到「现在」，别把攒下的音符一口气倒出来
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;
    let guard = 0;
    while (this.next < ac.currentTime + 0.3 && guard++ < 24) {
      this.playStep(song, this.step, this.next, beat);
      this.step += 1;
      this.next += beat;
    }
  },

  playStep(song, step, at, beat) {
    const bar = Math.floor(step / 4) % song.chords.length;
    const chord = song.chords[bar];
    const inBar = step % 4;
    const v = song.vol;
    // 低音：每两拍一次
    if (song.bass && inBar % 2 === 0) this.tone(mtof(song.root - 24 + chord[0]), at, beat * 1.8, 'sine', v * 0.85);
    // 和弦垫：每小节头一拍，长衰减（没有混响也能听出「房间」）
    if (song.pad && inBar === 0) {
      for (let i = 0; i < chord.length; i++) {
        this.tone(mtof(song.root - 12 + chord[i]), at, beat * 3.6, song.wave, v * 0.4);
      }
    }
    // 琶音：每拍一个，上下八度交替
    if (song.arp && (song.arp >= 1 || Math.random() < song.arp)) {
      const idx = (step + bar) % chord.length;
      const oct = step % 8 < 4 ? 0 : 12;
      this.tone(mtof(song.root + 12 + chord[idx] + oct), at, beat * 0.8, song.wave, v * 0.62);
    }
    // 噪声：当节拍器用；首领层加密
    if (song.hat && inBar % (song.drive ? 1 : 2) === 0) this.noise(at, 0.045, v * 0.3, song.drive ? 2800 : 3800, 1.1);
    // 首领：每小节第一拍补一个低音冲击
    if (song.drive && inBar === 0) this.tone(mtof(song.root - 12), at, beat * 0.5, 'square', v * 0.55);
  },
};

sfx.init();
