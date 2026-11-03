// 《大巴扎：银钥》的音效：全部用 WebAudio 现场合成，一个音频文件都不下。
//
// 这站每个静态请求在边缘要 1~2 秒，一个 20KB 的 mp3 就是一个额外来回；
// 而这一局需要的声音全是短促的「叮、咚、擦」，合成出来既不占请求也随手能调。
//
// 约定：
//   · 第一次真实交互（pointerdown / keydown）才创建 AudioContext，否则会被自动播放策略挂起；
//   · 同一个音效 30ms 内只响一次（战斗一拍里三个唤醒体同时产算力，不压一下就是噪音）；
//   · 静音开关存在 zjtt:bazaar:sfx，默认开；
//   · 所有音都过 master，静音就是 master.gain = 0，不逐个判断。
const KEY = 'zjtt:bazaar:sfx';

let ac = null;
let master = null;
let noiseBuf = null;
let on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { on = true; }

const lastAt = Object.create(null);
let voices = 0;

function boot() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ac = new AC(); } catch (e) { return null; }
  master = ac.createGain();
  master.gain.value = on ? 0.5 : 0;
  master.connect(ac.destination);
  return ac;
}

export function unlock() {
  const c = boot();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export const isOn = () => on;
export function setOn(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 无痕模式 */ }
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.02);
  if (on) unlock();
  return on;
}
export function toggle() { return setOn(!on); }

// 一个带包络的振荡器：sweep 是滑到的频率（Hz），不写就是定音
function tone(f, { to = 0, dur = 0.12, type = 'triangle', gain = 0.18, at = 0, curve = 'exp' } = {}) {
  const c = boot();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.25));
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  voices += 1;
  osc.onended = () => { voices -= 1; };
}

function noise({ dur = 0.1, gain = 0.14, lp = 1400, hp = 120, at = 0 } = {}) {
  const c = boot();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f1 = c.createBiquadFilter();
  f1.type = 'lowpass';
  f1.frequency.value = lp;
  const f2 = c.createBiquadFilter();
  f2.type = 'highpass';
  f2.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// 同一个名字 30ms 内只响一次；voice 太多（连点刷新）就丢，别把 AudioContext 堆爆
function gate(name, gap = 30) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (lastAt[name] && now - lastAt[name] < gap) return false;
  lastAt[name] = now;
  return voices < 24;
}

export const sfx = {
  // 界面
  tap() { if (gate('tap', 40)) tone(760, { to: 620, dur: 0.05, type: 'square', gain: 0.07 }); },
  open() { if (gate('open')) { tone(520, { to: 780, dur: 0.1, type: 'triangle', gain: 0.1 }); } },
  close() { if (gate('close')) tone(700, { to: 420, dur: 0.09, type: 'triangle', gain: 0.09 }); },
  error() { if (gate('error', 120)) { tone(220, { dur: 0.08, type: 'square', gain: 0.09 }); tone(180, { dur: 0.12, type: 'square', gain: 0.08, at: 0.07 }); } },
  // 集市
  buy() {
    if (!gate('buy', 90)) return;
    tone(523, { dur: 0.08, type: 'triangle', gain: 0.14 });
    tone(784, { dur: 0.12, type: 'triangle', gain: 0.13, at: 0.06 });
  },
  sell() {
    if (!gate('sell', 90)) return;
    tone(660, { dur: 0.08, type: 'triangle', gain: 0.12 });
    tone(440, { dur: 0.12, type: 'triangle', gain: 0.11, at: 0.06 });
  },
  coin() { if (gate('coin', 70)) { tone(1180, { dur: 0.06, type: 'sine', gain: 0.08 }); tone(1560, { dur: 0.07, type: 'sine', gain: 0.06, at: 0.03 }); } },
  // 战斗
  gen() {
    // 产算力：一局里响得最频繁，压到很轻，音高按 uid 错开一点
    if (!gate('gen', 45)) return;
    tone(520 + Math.random() * 90, { to: 700, dur: 0.09, type: 'sine', gain: 0.05 });
  },
  fire() {
    if (!gate('fire', 60)) return;
    noise({ dur: 0.09, gain: 0.1, lp: 2600, hp: 400 });
    tone(300, { to: 120, dur: 0.12, type: 'sawtooth', gain: 0.09 });
  },
  crit() {
    if (!gate('crit', 60)) return;
    noise({ dur: 0.12, gain: 0.14, lp: 4200, hp: 700 });
    tone(880, { to: 1320, dur: 0.1, type: 'square', gain: 0.09 });
  },
  hit() {
    if (!gate('hit', 55)) return;
    noise({ dur: 0.1, gain: 0.11, lp: 1200, hp: 90 });
    tone(150, { to: 80, dur: 0.1, type: 'sine', gain: 0.1 });
  },
  shield() {
    if (!gate('shield', 70)) return;
    tone(300, { to: 420, dur: 0.14, type: 'sine', gain: 0.09 });
    tone(600, { dur: 0.1, type: 'sine', gain: 0.05, at: 0.04 });
  },
  heal() { if (gate('heal', 90)) tone(440, { to: 660, dur: 0.16, type: 'sine', gain: 0.08 }); },
  poison() { if (gate('poison', 90)) tone(240, { to: 180, dur: 0.16, type: 'triangle', gain: 0.07 }); },
  // 节拍
  // 每一拍一个鼓点，四拍一小节：第 1 拍「咚」+ 高音铃，第 3 拍「咚」，第 2、4 拍「嗒」（军鼓），拍拍带一下轻踩镲。
  // 战斗里的其他声音（产算力、出炮、受击）全落在这条节奏上，听起来才是「在打拍子」。
  beat(n = 1) {
    if (!gate('beat', 40)) return;
    const k = ((Math.max(1, n | 0) - 1) % 4) + 1;
    if (k === 1 || k === 3) {
      tone(k === 1 ? 130 : 110, { to: 50, dur: 0.18, type: 'sine', gain: k === 1 ? 0.5 : 0.4 });
      if (k === 1) tone(1568, { dur: 0.07, type: 'triangle', gain: 0.05, at: 0.005 });
    } else {
      noise({ dur: 0.1, gain: 0.26, lp: 3800, hp: 1200 });
      tone(210, { to: 150, dur: 0.08, type: 'triangle', gain: 0.2 });
    }
    noise({ dur: 0.05, gain: 0.12, lp: 9000, hp: 5000, at: 0.0 });
    tone(k === 1 ? 1568 : 1100, { dur: 0.04, type: 'square', gain: 0.08 });   // 每拍都有的「嗒」，哪怕小声也一定听得见节拍
  },
  // 胜负
  win() {
    if (!gate('win', 400)) return;
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => tone(f, { dur: 0.2, type: 'triangle', gain: 0.13, at: i * 0.09 }));
    tone(131, { dur: 0.5, type: 'sine', gain: 0.08, at: 0.1 });
  },
  lose() {
    if (!gate('lose', 400)) return;
    [392, 330, 262].forEach((f, i) => tone(f, { dur: 0.26, type: 'triangle', gain: 0.12, at: i * 0.14 }));
    noise({ dur: 0.4, gain: 0.05, lp: 500, at: 0.1 });
  },
  start() {
    if (!gate('start', 300)) return;
    tone(392, { to: 784, dur: 0.24, type: 'triangle', gain: 0.12 });
    noise({ dur: 0.2, gain: 0.06, lp: 1800, at: 0.02 });
  },
};

// 第一次交互把 AudioContext 唤醒：iOS / Chrome 都要求有用户手势
if (typeof document !== 'undefined') {
  const kick = () => { unlock(); };
  document.addEventListener('pointerdown', kick, { once: true, passive: true });
  document.addEventListener('keydown', kick, { once: true });
}
