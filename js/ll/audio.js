// 声音：两条音源线路 + 一套判定音效。
//
//   ① 原曲线路 —— 解码后的 AudioBuffer 直接排进 AudioContext，时钟就是
//      ac.currentTime；暂停用 ac.suspend()，恢复后 currentTime 接着走，
//      音画判定天然同步。
//   ② 芯片线路 —— 没有导入原曲时的兜底：把 songs.js 的事件表交给前瞻调度器，
//      每 80ms 醒一次，把未来 0.3 秒的旋律/贝斯/和弦/鼓按 ac.currentTime 精确排期。
//      事件表从 0 秒开始，而谱面第一条音符落在 lead 秒（见 analyze.js 的
//      chartFromArr）：这 lead 秒是「音符飞进来」的时间，音乐必须跟着往后挪，
//      否则每个音都会在听到之后 lead 秒才被敲到——整首听起来都踩在反拍上。
//
// 音效单独一路增益（fxGain）：原曲本身就响，判定音得不靠音量的运气。
// 五档判定各有一套音色（亮铃+实心一击 / 软铃 / 木鱼 / 闷响 / 嗡嗡下坠），
// 每一下都垫一个 60ms 的低频「砸」——这是打击感的来源，光有高频叮当只有塑料味。

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// decodeAudioData 只会重采样，不会减声道。手机上最吃内存的就是这两条 4 字节浮点
// 声道，混成单声道再省一半（听歌、外放都听不出差别）。
function toMono(buf, OC) {
  if (!buf || buf.numberOfChannels < 2) return buf;
  try {
    const n = buf.length;
    const ch = buf.numberOfChannels;
    const m = new OC(1, 1, buf.sampleRate).createBuffer(1, n, buf.sampleRate);
    const out = m.getChannelData(0);
    for (let c = 0; c < ch; c++) {
      const src = buf.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += src[i];
    }
    const k = 1 / ch;
    for (let i = 0; i < n; i++) out[i] *= k;
    return m;
  } catch (e) {
    return buf;                        // 混不了就照原样用，别为了省内存把歌弄没了
  }
}

export const Audio = {
  ac: null,
  master: null,
  limiter: null,
  musGain: null,
  fxGain: null,
  muted: false,
  playing: false,
  mode: 'idle',     // 'buffer' | 'chip'
  node: null,       // 原曲的 BufferSource
  t0: 0,            // 曲目零点（ac 时间轴）
  leadIn: 0,        // 芯片线路的前奏留白（秒）：音乐整体后挪这么久，跟谱面对齐
  usePerf: false,   // 没有可用的 AudioContext 时，用 performance.now 走表
  pt0: 0,
  evs: [],
  ei: 0,
  timer: 0,
  wave: 'square',
  vol: { mus: 0.6, fx: 0.78 },
  lite: false,          // 上一次解码是不是走了「22.05k 单声道」降级路
  forceLite: false,     // 强制走降级路（省内存 / 测试）
  lastDecodeErr: '',

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      return this.ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // 音游要最低延迟：明说 interactive（有的浏览器默认是 balanced），不支持这个参数就退回无参
    try { this.ac = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ac = new AC(); } catch (e2) { return null; } }
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    // 判定音和原曲会同时砸下来，加起来容易超过 1.0（手机上就是破音）。
    // 串一个温和的限幅：阈值 -3dB、12:1，只在峰值上动手，平时听不出压缩。
    if (ac.createDynamicsCompressor) {
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -3;
      lim.knee.value = 0;
      lim.ratio.value = 12;
      lim.attack.value = 0.002;
      lim.release.value = 0.12;
      this.master.connect(lim);
      lim.connect(ac.destination);
      this.limiter = lim;
    } else {
      this.master.connect(ac.destination);
    }
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

  // 解码。手机上一首 4 分钟的原曲解出来是 90MB 的浮点 PCM（双声道 44.1k），
  // 内存紧的机器 decodeAudioData 会直接抛 EncodingError —— 页面随后退回芯片，
  // 用户听到的就是「电子音」。所以这里留一条降级路：用离线上下文按 22.05k
  // 单声道重解，内存降到 1/4，音质差一档但原曲还在。AudioBuffer 可以跨
  // context 使用，解出来的照样喂给主线路播放。
  async decode(data) {
    this.lite = false;
    this.lastDecodeErr = '';
    const ac = this.ensure();
    if (!ac) throw new Error('浏览器不支持 WebAudio');
    // 每次解码都用一份新的字节：Safari 会把传进 decodeAudioData 的 ArrayBuffer
    // transfer 掉（detach），同一份拿两次会失败
    const once = (ctx) => new Promise((res, rej) => {
      // 老 Safari 只认回调式；新浏览器返回 Promise
      let p;
      try { p = ctx.decodeAudioData(data.slice(0), res, rej); } catch (e) { rej(e); return; }
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
    try {
      // forceLite：跳过主路径直接走降级（测试用，也当「省内存模式」的钩子）
      if (this.forceLite) throw new Error('force-lite');
      return await once(ac);
    } catch (e) {
      this.lastDecodeErr = (e && (e.name || e.message)) || String(e);
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (OC) {
        try {
          const off = new OC(1, 1, 22050);
          const buf = await once(off);
          if (buf) { this.lite = true; return toMono(buf, OC); }
        } catch (e2) { this.lastDecodeErr += ' / 降级也失败：' + ((e2 && (e2.name || e2.message)) || e2); }
      }
      throw e;
    }
  },

  // 曲目时间（秒）。暂停靠 ac.suspend()，currentTime 会停住。
  // 手感相关的两处修正（点击判定全靠这个钟）：
  //  1) ac.currentTime 是按渲染块（128 帧 ≈ 3~6ms，Safari / Firefox 更粗）跳的，直接读会让每一帧的 now 抖几毫秒、
  //     连按时判定忽早忽晚；这里记下「上次读到变化时的 performance.now」，两次变化之间按墙钟外推（最多 50ms，
  //     暂停 / 挂起时不外推），再保证不倒退。
  //  2) 声音从 currentTime 到真正进耳朵还有输出延迟（outputLatency，蓝牙耳机能到 150ms+）：玩家是照「听到的」点，
  //     所以曲目时间要减掉它（浏览器不报就是 0，行为和以前一样）。
  time() {
    if (!this.playing) return 0;
    if (this.ac && !this.usePerf) {
      const ac = this.ac, p = performance.now(), ct = ac.currentTime;
      if (ct !== this._ct) { this._ct = ct; this._cp = p; }
      const ext = ac.state === 'running' ? Math.min(0.05, Math.max(0, (p - this._cp) / 1000)) : 0;
      const lat = Math.min(0.25, Math.max(0, Number(ac.outputLatency) || 0));
      let r = ct + ext - lat - this.t0;
      if (this._rt != null && r < this._rt && this._rt - r < 0.04) r = this._rt;   // 外推过头了，别倒退
      this._rt = r;
      return Math.max(0, r);
    }
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
    this.t0 = at - from; this._rt = null; this._ct = -1;
    this.playing = true;
    return true;
  },

  // 只有时钟、没有音乐：自制谱面在本机找不到音频时的兜底（判定音照样响）
  playClock() {
    const ac = this.ensure();
    this.stop();
    this.mode = 'clock';
    if (ac) {
      this.usePerf = false;
      this.t0 = ac.currentTime + 0.05; this._rt = null; this._ct = -1;
    } else {
      this.usePerf = true;
      this.pt0 = performance.now() / 1000;
    }
    this.playing = true;
    return true;
  },

  // ---------------------------------------------------------------- 芯片
  // leadIn：谱面里第一条音符在 lead 秒，这段时间是「音符飞进来」。
  // 事件表本身从 0 秒开始，所以整条音乐往后挪 leadIn，两条时间轴才对得上。
  playChip(arr, wave, leadIn) {
    const ac = this.ensure();
    this.stop();
    this.wave = wave || 'square';
    this.mode = 'chip';
    this.leadIn = Math.max(0, Number(leadIn) || 0);
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
    this.t0 = ac.currentTime + 0.12; this._rt = null; this._ct = -1;
    this.playing = true;
    const tick = () => {
      if (!this.playing || this.mode !== 'chip') return;
      const horizon = ac.currentTime + 0.3;
      while (this.ei < this.evs.length && this.t0 + this.leadIn + this.evs[this.ei].t < horizon) {
        this.voice(this.evs[this.ei], this.t0 + this.leadIn + this.evs[this.ei].t);
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
    // 没有声卡的兜底时钟（usePerf）也要跟着停，不然暂停时谱面自己在跑
    if (this.usePerf) {
      if (this.playing && this._psAt == null) this._psAt = performance.now() / 1000;
      return;
    }
    if (this.ac) { if (this.ac.state === 'running') this.ac.suspend().catch(() => {}); }
    else if (this.playing) this._psAt = performance.now() / 1000;
  },
  resume() {
    if (this.usePerf) {
      if (this._psAt != null) { this.pt0 += performance.now() / 1000 - this._psAt; this._psAt = null; }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      return;
    }
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
  // 学 SIF 的手感：每一下都是极短、极亮、带一点噪声「啪」的电子音。
  // 音高不是固定的——连击每 10 下一个台阶（五声音阶，两个八度内循环），
  // 左右声道按第几格偏一点声像。连打起来会自己长出一条旋律，
  // 「贴不贴节奏」靠的就是「短、准、有音高」这三件事。
  //
  // 五档是五种手感，不是五档音量：
  //   PERFECT 亮铃 + 一记实心低频（最实、最亮，打在手指上）
  //   GREAT   软铃 + 半记低频（好听但不抢）
  //   GOOD    木鱼：只有中频「哒」，没有低频，明显比上一档空
  //   BAD     闷响：低、短、脏，一听就知道没打准
  //   MISS    往下掉的嗡嗡（不垫低频，避免和音乐的低音糊在一起）
  scaleRoot: 60,
  setScale(root) { this.scaleRoot = Number(root) || 60; },

  // 声像宿主：九格从左到右 -0.6 ~ +0.6；浏览器不支持就直连
  bus(pan) {
    const ac = this.ac;
    if (!pan || !ac.createStereoPanner) return this.fxGain;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.fxGain);
    return p;
  },

  // 连击 → 音高：每 10 连击升一级，五声音阶走完升八度，最高两圈
  hitFreq(combo) {
    const PENT = [0, 2, 4, 7, 9];
    const c = Math.max(0, combo || 0);
    return mtof(this.scaleRoot + 12 + PENT[Math.floor(c / 10) % 5] + (Math.floor(c / 50) % 2) * 12);
  },

  tone(t, freq, dur, vol, type, glide, dest) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.fxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  // 打击感的那一半：正弦从 186Hz 掉到 58Hz、70ms 收干。
  // 手机小喇叭放不出 60Hz，但谐波和二三次谐波还在，耳朵听成「咚」，
  // 手指按下去的那一下就有了「打实了」的反馈。
  punch(t, vol, dest) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(186, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.055);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.085);
    o.connect(g); g.connect(dest || this.fxGain);
    o.start(t); o.stop(t + 0.1);
  },

  click(t, dur, vol, hp, dest) {
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
    n.connect(f); f.connect(g); g.connect(dest || this.fxGain);
    n.start(t); n.stop(t + dur + 0.01);
  },

  fx(kind, combo, lane) {
    const ac = this.ac;
    if (!ac || this.usePerf || ac.state !== 'running') return;
    const t = ac.currentTime;
    const pan = lane == null ? 0 : ((lane - 4) / 4) * 0.55;
    const out = this.bus(pan);
    const f = this.hitFreq(combo);
    switch (kind) {
      case 'p':
        // 亮铃：实心低频 + 基音 + 两个高泛音 + 一记玻璃脆响，60ms 内收干
        this.punch(t, 0.17, out);
        this.tone(t, f * 1.5, 0.1, 0.1, 'sine', null, out);
        this.tone(t, f * 2, 0.055, 0.055, 'sine', null, out);
        this.tone(t, f * 3, 0.032, 0.03, 'sine', null, out);
        this.click(t, 0.016, 0.07, 4600, out);
        break;
      case 'g':
        // 软铃：同样的音高关系，低频减半、少一个泛音
        this.punch(t, 0.09, out);
        this.tone(t, f, 0.085, 0.085, 'sine', null, out);
        this.tone(t, f * 2, 0.042, 0.035, 'sine', null, out);
        this.click(t, 0.013, 0.045, 3600, out);
        break;
      case 'go':
        // 木鱼：中频三角波 + 一点噪声，没有低频——「打到了，但没打准」
        this.tone(t, f * 0.75, 0.06, 0.08, 'triangle', null, out);
        this.click(t, 0.018, 0.045, 1400, out);
        break;
      case 'b':
        this.tone(t, 196, 0.09, 0.115, 'sawtooth', 118, out);
        this.click(t, 0.03, 0.05, 680, out);
        break;
      case 'm':
        this.tone(t, 212, 0.22, 0.1, 'square', 84, out);
        this.tone(t + 0.02, 106, 0.19, 0.06, 'sine', 62, out);
        break;
      case 'hold':
        // 尾音：两个音的小上扬，比判定音更「收」
        this.tone(t, f * 1.25, 0.09, 0.06, 'triangle', null, out);
        this.tone(t + 0.045, f * 1.5, 0.1, 0.05, 'sine', null, out);
        break;
      case 'holdstart':
        // 跟判定音同时响，只留一点点「咬住」的质感，别叠成一团
        this.click(t, 0.02, 0.035, 1900, out);
        break;
      case 'break':
        this.tone(t, 300, 0.12, 0.08, 'sawtooth', 158, out);
        break;
      case 'skill':
        this.tone(t, 1046, 0.07, 0.06, 'triangle', null, out);
        this.tone(t + 0.06, 1318, 0.07, 0.06, 'triangle', null, out);
        this.tone(t + 0.12, 1568, 0.11, 0.07, 'triangle', null, out);
        break;
      case 'combo':
        this.tone(t, f * 2, 0.06, 0.05, 'sine', null, out);
        this.tone(t + 0.05, f * 3, 0.08, 0.045, 'sine', null, out);
        break;
      default:
        break;
    }
  },
};
