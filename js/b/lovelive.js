(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/ll/songs.js
const m_songs = await (async () => {

// 曲目库：Love Live! 经典曲 × 《忘却前夜》的短版芯片风改编。
//
// 版权说明（这条要一直成立）：这里没有任何原曲音源——旋律是按原曲的气质
// 手工重编的短版（走向 + 节奏贴近，音高不逐音还原），和弦与鼓组也是自配的，
// 全部在页面里用振荡器现场合成。曲名借原曲，谱面数据（击打时机）由旋律生成。
//
// ---------------------------------------------------------------- 记号
// 每段 sec：ch 是和弦级数（每小节一个，循环用），m 是旋律，| 分小节。
// 音符 token = 音名:拍数，音名是级数 1~7（按 mode 展开成半音），
//   ^ 升八度、v 降八度、#/b 变化音（如 #4）；r 是休止。
// 裸 token 一律按半拍记（这一版的旋律都写在八分音符网格上），
// 想要长音就写显式拍数（1:1 = 一拍，1:2 = 两拍，1:3 = 三拍）。
// 例：`5 5 6 5 3 3 2 3` 是一条 4 拍小节（八个八分音符）。
// e 是段落能量 0~3：0 前奏/尾声（稀）、1 主歌轻、2 主歌满、3 副歌满。
// arrange() 会校验每小节拍数 == 4，写错了构建期直接抛错。

const SONGS = [
  {
    id: 'bokura',
    n: '僕らは今のなかで',
    sub: 'μ\'s · 2期 OP',
    bpm: 186, root: 62, mode: 'maj', wave: 'square',
    desc: '全员冲刺的开场曲。八分音符铺满，副歌一口气冲到最高处。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        1 1 3 5 6 5 3 2 | 5 5 7 6 5 3 2 r | 6 6 1^ 6 5 3 2 3 | 2 3 2 1 v6 v5 1 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        1 3 5 5 5 r 5 r | 6 5 6 7 6 r 5 r | 4 4 6 6 6 r 6 r | 5 3 2 3 2 r 1 r
        1 3 5 5 5 r 6 r | 6 5 6 7 1^ r 7 r | 6 6 5 5 4 4 3 3 | 2 2 3 2 1 r r r` },
      { tag: '预副歌', e: 3, rep: 1, ch: ['IV', 'V', 'iii', 'vi'], m: `
        4 4 4 4 5 5 5 5 | 5 5 6 5 7 r 7 r | 3 3 3 3 4 4 4 4 | 6 7 1^ 1^ 7 6 5 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        5 5 6 5 3 3 2 3 | 5 5 6 5 3 r 2 r | 6 6 7 6 5 5 4 5 | 6 6 7 1^ 6 r 5 r
        5 5 6 5 3 3 2 3 | 1^ 1^ 7 6 5 r 3 r | 4 4 5 4 6 6 5 6 | 5 3 2 3 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['vi', 'IV', 'I', 'V'], m: `
        6 6 5 6 6 5 6 5 | 4 4 3 4 4 3 4 3 | 1 1 2 1 1 2 1 2 | 5 4 3 2 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'I'], m: `
        4 4 5 4 6 6 5 6 | 1 r r r 1:2` },
    ],
  },
  {
    id: 'snow',
    n: 'Snow halation',
    sub: 'μ\'s · 单曲',
    bpm: 152, root: 57, mode: 'maj', wave: 'triangle',
    desc: '白色雪夜里最出名的那段副歌。慢拍长音，判定环会安静很多。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'vi', 'IV', 'V'], m: `
        1 r 3 r 5 r 3 r | 6 r 5 r 3 r 2 r | 4 r 3 r 2 r 3 r | 2 r 3 r 2 r 1 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        3 3 2 3 5 r 3 r | 2 2 1 2 3 r 1 r | 6 6 5 6 1^ r 6 r | 5 5 4 5 6 r 5 r
        3 3 2 3 5 r 5 r | 6 6 5 6 7 r 6 r | 5 5 4 4 3 3 2 2 | 3 r 2 r 1 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['IV', 'V', 'iii', 'vi', 'IV', 'V', 'V', 'V'], m: `
        4 4 4 r 5 r 5 r | 6 6 6 r 7 r 7 r | 1^ 1^ 7 r 6 r 6 r | 5 5 6 5 4 4 5 r
        4 4 4 r 5 r 5 r | 6 6 6 r 7 r 7 r | 1^ 1^ 2^ r 3^ r 2^ r | 7 6 5 4 5 r 7 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        5 r 3 r 5 6 5 r | 3 r 5 r 6 r 5 r | 4 r 5 r 6 7 6 r | 5 r 6 r 7 r 6 r
        5 r 3 r 5 6 5 r | 1^ r 6 r 5 r 3 r | 4 r 5 r 4 5 6 r | 5 r 2 r 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 r 5 r 6 r 5 r | 3 r 2 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'kiseki',
    n: 'それは僕たちの奇跡',
    sub: 'μ\'s · 3期 OP',
    bpm: 155, root: 52, mode: 'min', wave: 'sawtooth',
    desc: '小调的奇迹。前奏压着走，副歌陡然抬起来——鼓也跟着翻倍。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 1 3 1 5 1 3 1 | 6 6 5 6 1^ 6 5 3 | 3 3 5 3 7 3 5 3 | 7 6 5 6 5 4 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1 r 5 r 5 5 5 r | 7 r 5 r 5 5 5 r | 6 r 6 r 6 6 6 r | 5 5 4 5 6 r r r
        1 r 5 r 5 5 5 r | 7 r 5 r 5 5 5 r | 6 r 6 r 7 r 1^ r | 5 r 4 r 5 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['VI', 'VII', 'i', 'i', 'VI', 'VII', 'V', 'V'], m: `
        6 6 6 6 7 7 7 7 | 1^ 1^ 1^ 1^ 2^ 2^ 2^ 2^ | 7 7 7 7 6 6 6 6 | 5 5 5 5 4 4 5 r
        6 6 6 6 7 7 7 7 | 1^ 1^ 1^ 1^ 2^ 2^ 2^ 2^ | 3^ 3^ 2^ 2^ 1^ 1^ 7 7 | 5 6 7 6 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1^ 1^ 7 6 5 5 6 5 | 1^ 1^ 7 6 5 r 3 r | 6 6 5 6 7 7 6 7 | 1^ 1^ 7 1^ 6 r 5 r
        1^ 1^ 7 6 5 5 6 5 | 3^ 3^ 2^ 1^ 7 r 5 r | 6 6 7 6 5 5 4 5 | 5 4 3 2 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 3 5 6 5 3 1 3 | 5 6 7 1^ 7 6 5 3 | 6 5 6 7 1^ 7 6 5 | 3 4 5 4 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'VII', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 6 r 7 r | 1:3 r r` },
    ],
  },
  {
    id: 'kokoro',
    n: '君のこころは輝いてるかい？',
    sub: 'Aqours · 1期 OP',
    bpm: 178, root: 64, mode: 'maj', wave: 'square',
    desc: '心跳是不是亮着灯？读谱压力最大的一首，副歌是双押练习场。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        5 r 3 r 1 r 3 r | 5 r 4 r 3 r 2 r | 6 r 5 r 4 r 3 r | 2 r 3 r 5 r r r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        1 1 5 5 3 3 1 1 | 2 2 5 5 4 4 2 2 | 6 6 4 4 3 3 1 1 | 5 5 4 4 3 3 2 2
        1 1 5 5 3 3 1 1 | 7 7 5 5 6 6 7 7 | 1^ 1^ 6 6 5 5 3 3 | 4 4 3 3 2 2 1 r` },
      { tag: '预副歌', e: 3, rep: 1, ch: ['IV', 'V', 'iii', 'vi', 'IV', 'V', 'V', 'V'], m: `
        4 4 4 4 4 r 5 r | 5 5 5 5 5 r 6 r | 3 3 3 3 3 r 4 r | 6 6 6 6 7 r 7 r
        4 4 4 4 4 r 5 r | 5 5 5 5 5 r 6 r | 7 7 1^ 1^ 2^ r 2^ r | 7 7 6 6 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        1^ 5 5 5 6 5 5 r | 1^ 5 5 5 6 5 5 r | 6 6 7 6 5 5 4 5 | 6 6 7 6 5 r 3 r
        1^ 5 5 5 6 5 5 r | 1^ 5 5 5 6 5 5 r | 4 4 5 4 6 6 5 6 | 5 3 2 3 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['vi', 'IV', 'I', 'V'], m: `
        6 5 6 5 6 7 1^ 7 | 4 3 4 3 4 5 6 5 | 1 2 3 4 5 6 7 1^ | 5 4 3 2 3 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'I'], m: `
        4 4 5 4 6 6 5 6 | 1 r 5 r 1^:2` },
    ],
  },
  {
    id: 'natsuiro',
    n: '夏色えがおで1,2,Jump!',
    sub: 'μ\'s · 单曲',
    bpm: 185, root: 60, mode: 'maj', wave: 'square',
    desc: '夏日晴天进行曲。跳跃的短音符最多，玩起来最像「蹦蹦跳跳」。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'IV', 'V', 'I'], m: `
        1 3 5 3 1 3 5 3 | 4 6 1^ 6 4 6 1^ 6 | 5 7 2^ 7 5 7 2^ 7 | 5 4 3 2 1 r r r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 4 4 3 3 4 4 2 2 | 5 5 4 4 3 3 2 2
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 7 7 6 6 5 5 6 6 | 5 r 4 r 3 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['IV', 'V', 'iii', 'vi', 'ii', 'V', 'V', 'V'], m: `
        4 4 4 4 5 5 5 5 | 6 6 6 6 7 7 7 7 | 3 3 3 3 4 4 4 4 | 5 5 5 5 6 6 6 6
        2 2 2 2 3 3 3 3 | 4 4 4 4 5 5 5 5 | 6 6 7 7 1^ 1^ 2^ 2^ | 7 7 6 6 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'IV', 'V', 'I', 'vi', 'IV', 'V', 'I'], m: `
        5 5 5 3 5 5 6 5 | 4 4 4 2 4 4 5 4 | 3 3 3 1 3 3 4 3 | 2 2 3 2 5 r 5 r
        5 5 5 3 5 5 6 5 | 1^ 1^ 1^ 6 1^ 1^ 2^ 1^ | 7 7 6 6 5 5 4 4 | 5 4 3 2 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['I', 'vi', 'ii', 'V'], m: `
        1 5 3 5 1 5 3 5 | 6 3^ 1^ 3^ 6 3^ 1^ 3^ | 2 6 4 6 2 6 4 6 | 5 7 2^ 7 5 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 4 4 5 5 5 5 | 3 4 5 5 6 6 7 7 | 1^:3 r r` },
    ],
  },
];

// ------------------------------------------------------------------ 级数 → 半音
// 大调：I ii iii IV V vi vii；小调用自然小调级位（V 级按和声小调升三半音处理成大和弦）。
const MAJ = { I: [0, 'M'], ii: [2, 'm'], iii: [4, 'm'], IV: [5, 'M'], V: [7, 'M'], vi: [9, 'm'], vii: [11, 'd'] };
const MIN = { i: [0, 'm'], ii: [2, 'd'], III: [3, 'M'], iv: [5, 'm'], v: [7, 'm'], V: [7, 'M'], VI: [8, 'M'], VII: [10, 'M'] };
const SCALE_MAJ = [0, 2, 4, 5, 7, 9, 11];
const SCALE_MIN = [0, 2, 3, 5, 7, 8, 10];

// 解析一条旋律：返回 [{ deg, oct, acc, dur, rest }]，并校验每小节 4 拍。
function parseMel(m) {
  // 小节分隔除了 |，还认换行（长段落折行写时忘画 | 也不至于悄悄错位）
  const bars = m.split(/\||\n/).filter((b) => b.trim());
  const out = [];
  bars.forEach((bar, bi) => {
    let sum = 0;
    for (let tok of bar.trim().split(/\s+/)) {
      if (!tok) continue;
      let rest = false;
      const mr = tok.match(/^r(?::([\d.]+))?$/);
      if (mr) rest = true;
      const mo = mr || tok.match(/^([v^]?)([b#]?)([1-7])([v^]?)?(?::([\d.]+))?$/);
      if (!mo) throw new Error('旋律记号看不懂：' + tok);
      let d = mr ? (mr[1] != null ? parseFloat(mr[1]) : 0.5) : (mo[5] != null ? parseFloat(mo[5]) : 0.5);
      if (!(d > 0) || d > 8) throw new Error('拍数不对：' + tok);
      sum += d;
      const om = (mr ? '' : (mo[1] || mo[4] || ''));
      out.push({
        deg: mr ? 1 : +mo[3], oct: om === '^' ? 1 : om === 'v' ? -1 : 0,
        acc: mr ? '' : mo[2], dur: d, rest,
      });
    }
    if (Math.abs(sum - 4) > 1e-6) throw new Error(`第 ${bi + 1} 小节拍了 ${sum} 拍（应为 4）`);
  });
  return out;
}

// 把一首歌编成「事件表」：旋律、和弦、鼓。谱面生成只吃这张表。
function arrange(song) {
  const scale = song.mode === 'min' ? SCALE_MIN : SCALE_MAJ;
  const table = song.mode === 'min' ? MIN : MAJ;
  const spb = 60 / song.bpm;                 // 一拍几秒
  const deg2semi = (deg, acc) => {
    let s = scale[deg - 1];
    if (acc === '#') s += 1;
    if (acc === 'b') s -= 1;
    return s;
  };
  const chords = [];
  const notes = [];
  const drums = [];
  let bar = 0;
  for (const sec of song.secs) {
    const mel = parseMel(sec.m);
    const melBars = Math.ceil(mel.reduce((a, x) => a + x.dur, 0) / 4);
    for (let r = 0; r < (sec.rep || 1); r++) {
      // 这一遍的和弦表：按小节循环
      for (let b = 0; b < melBars; b++) {
        const rn = sec.ch[(b) % sec.ch.length];
        const def = table[rn];
        if (!def) throw new Error(`${song.n}：和弦级数 ${rn} 不在 ${song.mode} 表里`);
        const t0 = (bar + b) * 4 * spb;
        chords.push({ t: t0, d: 4 * spb, off: def[0], type: def[1] });
      }
      // 旋律：逐音符铺
      let beat = 0;
      for (const nt of mel) {
        const t = (bar * 4 + beat) * spb;
        if (!nt.rest) {
          const midi = song.root + 12 + deg2semi(nt.deg, nt.acc) + nt.oct * 12;
          notes.push({ t, d: nt.dur * spb, m: midi, sec: sec.tag, e: sec.e });
        }
        beat += nt.dur;
      }
      // 鼓组按能量铺
      for (let b = 0; b < melBars; b++) {
        const t0 = (bar + b) * 4 * spb;
        const e = sec.e;
        if (e >= 1) { drums.push({ t: t0, k: 'k' }); drums.push({ t: t0 + 2 * spb, k: 'k' }); }
        if (e >= 2) {
          drums.push({ t: t0 + spb, k: 's' }); drums.push({ t: t0 + 3 * spb, k: 's' });
          for (let i = 0; i < 8; i++) drums.push({ t: t0 + i * 0.5 * spb, k: i % 2 ? 'h' : 'H' });
          drums.push({ t: t0 + 2.5 * spb, k: 'k' });
        }
        if (e >= 3) {
          drums.push({ t: t0 + 3.5 * spb, k: 'k' });
          drums.push({ t: t0 + 1.75 * spb, k: 'h' }); drums.push({ t: t0 + 3.75 * spb, k: 'h' });
        }
        if (e <= 1) { drums.push({ t: t0 + spb, k: 'h' }); drums.push({ t: t0 + 3 * spb, k: 'h' }); }
      }
      // 段落开头给一记 crash（第一遍才给，避免副歌反复两遍都炸）
      if (r === 0 && bar > 0 && sec.e >= 2) drums.push({ t: bar * 4 * spb, k: 'c' });
      bar += melBars;
    }
  }
  const beats = bar * 4;
  return { bpm: song.bpm, spb, beats, dur: beats * spb + spb, chords, notes, drums };
}
return { SONGS, arrange };
})();

// ---- js/ll/audio.js
const m_audio = await (async () => {

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

const Live = {
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
return { Live };
})();

// ---- js/ll/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 从 data/lovelive-units.json + data/avatars.json 生成，请勿手改。
// art 是 data URI：上场名册一次传输，页面只发一个脚本请求。
const UNITS = [{"id":"a-15601","n":"24","hue":262,"skill":{"n":"狂气爆发","txt":"每 40 连击：判定范围 ×1.7，持续 8 秒","trig":"combo","need":40,"fx":"judge","val":1.7,"dur":8},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-15591","n":"艾继丝","hue":336,"skill":{"n":"蔷薇安可","txt":"每 20 秒：接下来 6 秒得分 ×1.5","trig":"time","need":20,"fx":"score","val":1.5,"dur":6},"pass":{"score":0.04},"art":"data:image/webp;base64,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"},{"id":"a-15588","n":"艾尔瓦","hue":210,"skill":{"n":"铁壁演出","txt":"每 25 秒：8 秒内 Miss 不断连、不掉血","trig":"time","need":25,"fx":"guard","val":1,"dur":8},"pass":{"judge":0.04},"art":"data:image/webp;base64,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"},{"id":"a-15573","n":"奥瑞塔","hue":150,"skill":{"n":"安眠曲","txt":"每 30 秒：回复 20 体力","trig":"time","need":30,"fx":"heal","val":20,"dur":0},"pass":{"score":0.02},"art":"data:image/webp;base64,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"},{"id":"a-15594","n":"凯刻斯","hue":14,"skill":{"n":"猫爪连打","txt":"每 60 个 Perfect：5 秒得分 ×1.4","trig":"perfect","need":60,"fx":"score","val":1.4,"dur":5},"pass":{"score":0.05},"art":"data:image/webp;base64,UklGRoQOAABXRUJQVlA4IHgOAACwMwCdASpgAGAAPkEYiUOioaEbjJ8wKAQEsoBiSiGHuKVyY8G3QrwN8VXqP3B42fTnmN/J/uL+k/uH7l+0Xff8iP6r1Bfx3+a/5H8xfQ32qmt/6f/heoL64/Qf9r4ZX+B6I/YD2AP5V/Tv9/9rfzr313oH+w9wX+ff17/rf4z8mfpa/pv/B/n/zA9r/5x/iP+j/kv81/6PoD/lf9Q/2v+F/e7/Kf//6u///7tP2Y9lv9k//EzKFbaiul3d6vSn+asAxSoXzbNRMdkrpD7iYV+GdOk1oDJzY9jImuEI3XhAZpLJVXwqFYxVCtCZZ1v6skKs5NXNeb5xmeQ9eg/8NHRUdKWPTSKq/T9W4z3zFjfInSc86HjVx3usRRa4Zh8quQqwFwP+ooiM9YL9ZKPd2pQVPt3aCzKxce6U2RI2EWRlVk2xxRFSwl6tU1UX04Sweo+d6lXiM37jDxXsdPqgJGR4MJVnmlpmlTCPu6yKZh/+//09Dtv0uKeKpJKDf1QsYSgaoVGc9UiX0PVT2xPPhJTYO9wV/fk48v4Dn4s2kIha6ngyHBgO7AD+/O+DO7wFCM2Zh5zCCedUJebOzG3ECY2AVsI7NkNFI+G8+H/tTnrvXdIf14lUEyVw4F7dAEJbPCbmNHJUS5MF57E7Rlkj5E8ArScQQCiFoIRGTuP8Nl5zs0nq+FkwmH1cRGMJ/1arRK/NnfEFb+hG5Fy44fVQsQpOOwHwVo0Hlsa9p+wq1PPNoe7cFWfTnDcfybAXdckkmMg9W/J1pJo7LkWQBpFRB333V/8+C3o4lgKDnJRA95uxn60ea7wkkJhTbFZuzBTlGN8ihX6cVW4IKN3FqXwpZOZGkM5ucPS1laBXocUwxyzh4zfyt5VnTu5Kwtk33rQrwLATa+piXdEoLCex/hobe9oNkeJ3ECUD62ImOUNgL9SW/7WuM0JcyBiTi2/pMpNQL4RUg3CzpukUT0jxyxSOtor65dtD4BYczHNjUNyqnzHhCXO2KFOKdH3mbQjHmstkuTHOVz5fBPvFLgrRVRoihMXjyLCoXQwVf9xz+NxesA5wC1AFzGmhB3ox/LjiSPkLn/oDeYfZGhGC/ejX4uCyhjJBbStZx7/27z35eN9FDKEOAf7UTaxGFRS3lN5OdfhyoTHL8aMGWGLFXbRUgZ1+aUcnHaBQynpP6meQc1u40QznaAQDINp7l435gJXyuBc/iqHAscN/bRHw8tgF4XHK8KwtfjKtklWpgcjzMzbD69fSVBKiynOD+ByPQYdUeDmMeOar4UblpeDgtevqdUnyAhfLc3yhPTOgFD6x0izxILwGAkC4rICG+8053Pso/7eF+UeopYiLqJ8h9n3Bl3UlfiFkng1tZpNsiNAzjHxbozUSJHz4xpduS6xukg7f2oqpMc/Pilepek7RR6iP0nX91ZDQ9WW6H/UYi64WmHHzRk2zQvtERGV9SKvEDXt+FdgvvybdZUJwlxVM6f0IePP1YRK5fNoRAHnCaQZb6AUITs3WAO4P5UOXPLrjL83wpxWmbfHeEQxTm9dQRJ/sovSaVoPbX/wrOW8bEFZj80a07SgkJmLTGrykXnVn0tfSIOhdxCnj/pn8mRU9d+dyTSxWmpOTXJlvajcFiD3FuWk/NtHSVQQKtwUkWV4PWQGWgONN5hTPrC8E1Fx/d/9KphPk7ciqnXr7qmxCmaQ7A/Zpgv45QJ/r/faofvARGjwXuIKLjo1RSm39Xrf11bSR143JpYZBR4r/le4m/rnC1/oWEiny5EqBnTwPgpsEoXElaoWwRrw2RQwHKKuMFBJuNUOe4dcTzVJ+QgQkCMr9igBE6wiINiJ4req8rktp/AylT4dqEMb7/oPvb+GGt6ubc8a3bikg/UnJyJTs4Cmbr3fy4N8lO7nBg1JzwSccmx4TDZFweeb867xhcZx8HjNnFClhDa7DHB9X1EV1Ew2e8Ae/kODtVfbNwfu4DAuw98gjqaZ5oZUfoKZi5Qf3aFAC3pWKksPY//j5/DkNPa3RZfHab6z9OSGu8e8fnbJZwarphJUlpqIUZeP/Hf+Uw2/ddL2l582ULP+O3OgQbKL5L8tycSxJPsT6u0DDH8PZnfch7eGii4DQaKgr2TCPk25adoA7U+EBvq9+d8qAuzJchkERkbbThNkjho0JCxWV4ZrmLnHmBQuCtj/459G+ZhBlvm9RmXpnJ1VFBJQSVMfFlMbtC0/hdmALmdXEXHdYcRsAZapcSm4TRLlsJGD9cZafNzoT7b9L53iaF0CKTjz/tVqs0plwc57tf5Iiwc8Xg5zIHSBx07mtaBT4crv11Cx6bZP0LdmKi2SoToWogy2i0TW/0Fs13b1gozoD2gEnNKYqJ2DHz/wryx09UJ6ZMixvvjEoT24OjVVPmi3qNmi1tih5WqiH421CCOvWr/Mq/xJ763abQZxvrfg5hBfBFdNddjZSTD9QT/q+6WTLbts55C8e7nbs5D2euk237BnrqUCRXX0+2x2xAxeQA/MsYPLs0HndQ6zrX8RoY9qpS7a2UyEgS97yg5Ci2ct0mW5X8ehjn2eJxH3/6VFtWfq3LIv5i1/ayDYLH8IrYsnsErtZnPz31hJx/JtMWWSPcXSIxBYD9zeHQPxuVB1/AzDUwBK1TCG0YOhrKMezr80hhij+W3qwBfudJ8R7jofXnKE1+Mi8uH8VTEewDlm9FZdrLRA8zCncr6OKuO9b8R8Ky0Zf3dgixK3uS9dpIt5X7WEKc/5T2MuXKsBDEkHcxx3w9md2iZv93fFD7iUUqipxeLCGiJGdyUf/M/WnfcuwRoKx30xJhnS+j6z+1yKf+XH6wcl+5KBhkng2gsiGn9iq3C6va62+5IjoElMs13qbxmeYb7dvQNbyYOgzazZ6jrPKuCezCKWuYwOi3iqWoOzleTi/bCqkfLqhX1woLA5DtM3rw4Plpay1NAtpFn5zhzrAxslv1vaXOk9yghtbvtJ2trSqWK+JEBUE57DgxHEKFrx/R9+PO5jEj860KU+qIWRGx+EUxUoMJAa+x+HFZ7aEWGx8g7zmVpFH9iTPQBbXHLe05Hj/dGbrstipqTl2lz90Vo/j1AFGepjS5LYxV34NYf4xw6y49McVBN5s4fOMcXnmaCUqXF4yRvYZIbMzDeTclcDVY+s57Szb1tRK5JezbCcMWMwU5GuRmA7e39z1uP9n61tQ3mLOBI3K56LajzVgqXiX6+nv784aJ+Y1TRynsF5YOG56TbPzGFDizr/WNXvjBDFYIW+Mx4CwwSBggkY7VJoDM+kFNQlvGYICdYxS9waEJmWF/w+QKku9c9YRdypqv+IpTmO+9Z4jG6f9hEJZKN3lf3ImSAcj43+e/NVPQur4r7mopCNHg71pI6/Ynl++fY2Kfke6Hz8+B5s8vATldaaCx7njDpVhvzb6hspNbQYm+8DuXUgbuWoYISL4wuXxFkzjNB5fRpcvKdmrXASpLs4WIm1+8qtxzLiE2AI9qX6L//ZkDwZsSlnIwiRvkGjETQ6eOCOgAbPYPJpOxkw0pEhiv+s/x6mq0ncO4ief5jOKSJDehQU/8C44zvRl88H1Mw2O4wOY+HVULy73nWZoDzAPjOUrCkoYhuaNxe3V8EJaekjFtseGo1b7MKbRaJ8duYXJ5mJrlCu0k5pYeE0h9xVHG1fVG9EGi+ifm3wk897uFJL3/oBuTpvcxE75AGgVgONmwBawJJOBhf/I6VydNR1COsvX5/b6hGw1/pmkPSzc8O4S3P4o56WSghv4G5Xj96eai2Z0tzOZwyPU5eKtbT1PqW9qdyANPodJ7VYtJwBccc1/Tm9426dnQ2H0Df23VR0yK7hFFoyamALfDg0p9Mo2qS+tsJWbrqiU0HNITwgZUt3LEm+0jqJVGzo5kVmpjUWhysDhySt6R4FwcXOn9olWy8nfINmXRA9PJn0d1C4bLVuXulM13TSWDEBamFoGd/Df9nkzRTuakaACGSteMzqDz4mjefaZDLKrLBfi4jLf8+1qYKyYtkgEWqbskol8E65syr0r/QEjxYCXT3O6fmLIqHz4v91S3kLRhpUHxumR63d99qNACwtTkdMyoMVTWoZZ/KOVe8zi4FAOGgbG7NOFrc+ZUXgW4hT2H/i9anGkrcGaI3CF0n+Qsv4dBM6VIloJNnihtG0HrwKCXDu4s3/jmF2C8Myyz2VGyUjmW8IydsZmTox/+6RZQxbRGdtUAw3wNa7Y/oy7R6zpIKdR6Y400Mw2fC/kXsP5if7h+vKZ7Aai2XFFNo0WGYSgwuKpYw/A5uUdS5UHYp3J2uba2wX9hXCFFar9nmFSkReQ84eiLtcK44AV74VOMHzRMDgMWqHVHizxfXOaGw6OOmO08qCrF9CCd99YEmaHoPDHPa4RqjBaB+MITgfjr8Z33AePJwsUoafO1p6FNcWNRYJ2QA7mN1ZeIgMqOTXt30CkUDHjvFQOtuyIfc0Eez/KphK1CTxuB86cufSqfnCeNVP2CPv8nljHf5RsnAWbe7+afXvj3rMFpuPL2ERiPymG9B6lgL9ZHjBgrXonpXCfP0csgWiod2UbuAndjLJ6QSqV2xCZwssDEFJV/OEBzN6GzXt1XBVYXEjt7DBb4H+Z2rxb7cPze9H4CRr5MGCNtTMgqfkw0j/L4VPJuCSbF7n86SnjIXTGaB/B4HnLLlf7SMKRwE05mADAXCkEJT6d21sadqEbtJXp3M0aPKfPgm74+1gMS0gqFGNkKIOhcMl2sXPFT4aoTyCV+1+f1IHqGlOR6rZZWIBUXiZk95lkvgdTR+zvh4s3UD+epb4rYs4Nkb14bUXno8QZoNVP/GxxB2MeBpM5XbWpPnUl4KeupcJ1/JShPg18bS+xuoX4+Hal69zfJtwP+ROPE5zrv3X1fOufrhbE0yt3jkvFHMsE2/sDxtkEe2iskmfE22Y+e6TOcxSAAA=="},{"id":"a-15572","n":"卡茜亚","hue":28,"skill":{"n":"全场应援","txt":"每 18 秒：直接 +15 连击","trig":"time","need":18,"fx":"combo","val":15,"dur":0},"pass":{"score":0.02},"art":"data:image/webp;base64,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"},{"id":"a-15566","n":"希莱斯特","hue":47,"skill":{"n":"星光护佑","txt":"每 30 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":30,"fx":"auto","val":1,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-77925","n":"克莱门汀","hue":320,"skill":{"n":"慢镜头","txt":"每 35 秒：8 秒内音符飞得慢 25%（更好看清）","trig":"time","need":35,"fx":"lead","val":1.25,"dur":8},"pass":{"judge":0.03},"art":"data:image/webp;base64,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"},{"id":"a-77922","n":"克珀珊特","hue":268,"skill":{"n":"次元口袋","txt":"每 40 秒：回复 30 体力","trig":"time","need":40,"fx":"heal","val":30,"dur":0},"pass":{"judge":0.05},"art":"data:image/webp;base64,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"},{"id":"a-15590","n":"达芙黛尔","hue":172,"skill":{"n":"白翼","txt":"每次 Miss：立刻回复 8 体力","trig":"miss","need":1,"fx":"heal","val":8,"dur":0},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-15570","n":"朵尔","hue":350,"skill":{"n":"变奏曲","txt":"每 45 秒：6 秒得分 ×1.35","trig":"time","need":45,"fx":"score","val":1.35,"dur":6},"pass":{"judge":0.03},"art":"data:image/webp;base64,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"},{"id":"a-95786","n":"杜勒赛因","hue":290,"skill":{"n":"融合终章","txt":"每 60 秒：10 秒得分 ×1.8（终点的力量）","trig":"time","need":60,"fx":"score","val":1.8,"dur":10},"pass":{"score":0.06},"art":"data:image/webp;base64,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"},{"id":"a-15603","n":"艾瑞卡","hue":52,"skill":{"n":"起手式","txt":"开场立刻：前 20 秒得分 ×1.3","trig":"start","need":0,"fx":"score","val":1.3,"dur":20},"pass":{"score":0.02},"art":"data:image/webp;base64,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"},{"id":"a-15577","n":"菲茵特","hue":205,"skill":{"n":"银芯共鸣","txt":"每 25 秒：5 秒得分 ×1.5","trig":"time","need":25,"fx":"score","val":1.5,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-15567","n":"血链·希洛","hue":348,"skill":{"n":"嗜血链球","txt":"每 30 秒：回复 14 体力","trig":"time","need":30,"fx":"heal","val":14,"dur":0},"pass":{"score":0.04},"art":"data:image/webp;base64,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"},{"id":"a-15568","n":"环行·拉蒙娜","hue":96,"skill":{"n":"循环往复","txt":"每 40 秒：直接 +20 连击","trig":"time","need":40,"fx":"combo","val":20,"dur":0},"pass":{"judge":0.02},"art":"data:image/webp;base64,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"},{"id":"a-54117","n":"哈姆林","hue":286,"skill":{"n":"魔笛","txt":"每 30 秒：6 秒内判定范围 ×1.5","trig":"time","need":30,"fx":"judge","val":1.5,"dur":6},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-15587","n":"希洛","hue":230,"skill":{"n":"晨星","txt":"开场立刻：前 15 秒判定范围 ×1.5","trig":"start","need":0,"fx":"judge","val":1.5,"dur":15},"pass":{"score":0.02},"art":"data:image/webp;base64,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"},{"id":"a-15583","n":"奥尔拉","hue":240,"skill":{"n":"终焉预感","txt":"每 45 秒：8 秒得分 ×1.4","trig":"time","need":45,"fx":"score","val":1.4,"dur":8},"pass":{"score":0.03},"art":"data:image/webp;base64,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"},{"id":"a-15560","n":"潘狄娅","hue":306,"skill":{"n":"梦引","txt":"每 20 秒：5 秒内 Miss 自动救成 Good","trig":"time","need":20,"fx":"auto","val":1,"dur":5},"pass":{"judge":0.03},"art":"data:image/webp;base64,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"}];
return { UNITS };
})();

// ---- js/gamecloud.js
const m_gamecloud = await (async () => {

// 小游戏云存档（除挂机前夜以外的各游戏共用的一份通用实现）。
//
// 个人中心的「云端档案」只同步积分 / 解锁 / 最高分和各游戏的进度摘要。这里把每个游戏自己的真实存档
// （localStorage 里属于它的那几个键）整包存到后端的 /save/<游戏>，登录同一个账号换设备就能接着玩。
// 挂机前夜的存档是一个大对象、有自己的合并逻辑，走 idle/src/core/cloud.js，不在这里。
//
// 规则（和挂机前夜一致，乐观锁 + 不悄悄覆盖）：
//   · 本机记着「上次和云端对齐时的云端 ver 和本机内容的哈希」。
//   · 云端没变、本机改了 → 推；云端变了、本机没改 → 拉；两边都改了 / 新设备两边都有内容 → 弹窗选。
//   · 拉下来之后游戏已经把旧数据读进内存了，所以写完 localStorage 就刷新一次页面（带防循环保护）。
// 没登录就什么都不做。
const EDGE_API = 'https://morimens.qingdengbuyi.top/api';

// 每个游戏同步哪些键：prefix 是前缀（含完全相等），skip 是不同步的（音量 / 倍速 / 模式这类设备偏好）
const GAMES = {
  deathreport: {
    zh: '弥萨格大逃杀', prefix: ['morimens-deathreport-save', 'morimens-deathreport-meta'], skip: /pref|ws-|workshop|-ed$/,
    // 没有任何一份进度存档（只有启动时写的 meta 默认值）就当空
    trivial: (keys) => !Object.keys(keys).some((k) => k.includes('-save')),
  },
  // trivial(keys)：只有游戏自己启动时写进去的默认值、还没有任何进度——这种本机内容当「空」处理，
  // 新设备上不会因为它跟云端冲突，也不会把一份默认存档推上去
  binding: {
    zh: '校猫的结合', prefix: ['zjtt:binding'], skip: /:(mute|snd)/,
    trivial: (keys) => {
      try {
        const m = JSON.parse(keys['zjtt:binding'] || 'null');
        if (!m) return true;
        const st = m.stats || {};
        // 只看真正的进度（跑过局 / 解锁过东西）；看过开场剧情、读过设定这类不算
        return !(st.runs || st.kills || st.deaths || st.bestFloor || st.bestScore || st.rooms) && (m.unlock || []).length <= 3;
      } catch { return false; }
    },
  },
  survivors: { zh: '唤醒体幸存者', prefix: ['zjtt:survivors'], skip: /:(mute|snd)/ },
  protocol: { zh: '忘却协议', prefix: ['zjtt:pf'], skip: /:(mute|speed|snd)/ },
  wolf: { zh: '弥萨格狼人杀', prefix: ['zjtt:wolf'], skip: /:(mode|mute|snd)/ },
  merge: { zh: '合成大杜勒', prefix: ['zjtt:merge'], skip: /:(played|snd|mute)/ },
  bird: { zh: '是鸟弟就下100层', prefix: ['zjtt:bird'], skip: /:(snd|mute|diff|ctl)/ },
  // 唤醒王：决斗链接：收藏、战绩、开包记录（卡组选择和难度是偏好，跟着走也无妨）
  duel: { zh: '唤醒王：决斗链接', prefix: ['zjtt:duel'], skip: /^$/ },
  // 弥萨格王权：进行中的任期、结局图鉴、人物册（音效是这台设备的偏好）
  reign: { zh: '弥萨格王权', prefix: ['zjtt:reign'], skip: /:sound/ },
  // 2048：局面（save）和最高分都值得跟着账号走，难度 / 侵蚀 / 音效是这台设备的偏好
  // （皮肤不同步：换设备一进来就得多拉四百来 KB 的换皮池，不值）
  g2048: {
    zh: '忘却 2048', prefix: ['zjtt:g2048'], skip: /:(snd|diff|rot|played|skin)/,
    trivial: (keys) => !keys['zjtt:g2048:save'] && !keys['zjtt:g2048:best'],
  },
  // lovelive！mori⭐mens！：各谱最高分 / 最长连击 / 编队跟着账号走，静音是设备偏好
  lovelive: { zh: 'lovelive！mori⭐mens！', prefix: ['zjtt:lovelive'], skip: /:(mute|snd)/ },
};

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const readJson = (k, d) => { const v = lsGet(k); if (v == null) return d; try { return JSON.parse(v); } catch { return d; } };

function account() {
  const token = readJson('zjtt:authToken', '') || lsGet('zjtt:authToken') || '';
  const u = readJson('zjtt:authUser', null);
  if (!token || !u) return null;
  const raw = u.name || u.display_name || u.nick || u.username || u.email || '';
  const name = String(raw).replace(/@zjtt\.local$/i, '').trim();
  return name ? { name, token: String(token) } : null;
}

// ---------- 本机内容 ----------
function isTrivial(game, keys) {
  const n = Object.keys(keys).length;
  if (!n) return true;
  const f = GAMES[game].trivial;
  return !!f && f(keys);
}
function collect(game) {
  const cfg = GAMES[game], out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !cfg.prefix.some((p) => k === p || k.startsWith(p + ':') || k.startsWith(p + '-') || k.startsWith(p))) continue;
    if (cfg.skip && cfg.skip.test(k)) continue;
    out[k] = localStorage.getItem(k);
  }
  return out;
}
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const hashOf = (keys) => fnv(Object.keys(keys).sort().map((k) => k + '=' + keys[k]).join('\n'));

const recKey = (g) => 'zjtt:gc:' + g;     // 本机同步记录 { acct, ver, hash, at }
const record = (g) => readJson(recKey(g), null);
const setRecord = (g, r) => lsSet(recKey(g), JSON.stringify(r));

/** 决策（纯函数，可测）：local = { empty, hash }，cloud = 云端摘要或 null，rec = 本机记录，acct = 账号名 */
function plan({ local, cloud, rec, acct }) {
  const dirty = !!rec && local.hash !== rec.hash;
  if (!cloud) return local.empty ? 'none' : 'push';
  const mine = !!rec && rec.acct === acct;
  if (mine && rec.ver === cloud.ver) return dirty ? 'push' : 'none';
  if (cloud.meta && cloud.meta.hash && cloud.meta.hash === local.hash) return 'sync';       // 内容一样，只记一笔
  if (mine && rec.ver < cloud.ver) return dirty ? 'conflict' : 'pull';
  if (local.empty) return 'pull';
  return 'conflict';
}

// ---------- 网络 ----------
let liveBase = '';
function candidates() {
  const out = [];
  const custom = String(readJson('zjtt:apiBase', '') || '').trim().replace(/\/+$/, '');
  if (custom) out.push(custom);
  if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname)) out.push(location.origin + '/api');
  if (!out.includes(EDGE_API)) out.push(EDGE_API);
  return out;
}
async function probe() {
  if (liveBase) return liveBase;
  for (const base of candidates()) {
    try {
      const r = await fetch(base + '/health', { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => null);
      if (j && j.service === 'zjtt') { liveBase = base; return base; }
    } catch { /* 下一个 */ }
  }
  return '';
}
async function call(method, path, body, keepalive = false) {
  const a = account(); if (!a) throw new Error('not_logged_in');
  const base = await probe(); if (!base) throw new Error('offline');
  const r = await fetch(base + path, {
    method, keepalive, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.token, Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok && j.ok !== false, json: j };
}
async function fetchCloud(game, withData) {
  const r = await call('GET', `/save/${game}${withData ? '' : '?meta=1'}`);
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  return r.json.save || null;
}
async function pushCloud(game, ver, keys, keepalive) {
  const a = account();
  const r = await call('PUT', `/save/${game}`, { data: JSON.stringify({ v: 1, keys }), ver, rev: Date.now(), meta: { hash: hashOf(keys), n: Object.keys(keys).length } }, keepalive);
  if (r.status === 409) return { conflict: true };
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  setRecord(game, { acct: a.name, ver: r.json.ver, hash: hashOf(keys), at: Date.now() });
  return { ver: r.json.ver };
}
function applyCloud(game, save) {
  const doc = JSON.parse(save.data);
  const keys = (doc && doc.keys) || {};
  for (const [k, v] of Object.entries(keys)) lsSet(k, String(v));
  setRecord(game, { acct: account().name, ver: save.ver, hash: hashOf(collect(game)), at: Date.now() });
  return Object.keys(keys).length;
}

// ---------- 一次同步 ----------
const status = {};            // game -> { s: 'ok'|'error'|'conflict'|'nologin'|'syncing', at, err }
const statusOf = (g) => status[g] || { s: 'idle', at: 0 };
const busy = new Set();
const RELOAD_KEY = 'zjtt:gc:reload';

// pullOk：只有刚进游戏那一次允许把云端覆盖到本机（游戏还没把数据读进内存）；游戏玩到一半只推不拉，免得把正在玩的进度刷没
async function syncGame(game, { interactive = true, reload = true, keepalive = false, pullOk = true } = {}) {
  const a = account();
  if (!a) { status[game] = { s: 'nologin', at: 0 }; return 'nologin'; }
  if (busy.has(game)) return 'busy';
  busy.add(game); status[game] = { s: 'syncing', at: 0 };
  try {
    const keys = collect(game), local = { empty: isTrivial(game, keys), hash: hashOf(keys) };
    const cloud = await fetchCloud(game, false);
    const act = plan({ local, cloud, rec: record(game), acct: a.name });
    let res = act;
    if (act === 'push') {
      const r = await pushCloud(game, cloud ? cloud.ver : 0, keys, keepalive);
      if (r.conflict) { res = 'conflict'; }
    } else if (act === 'pull' && !pullOk) {
      res = 'skipped';
    } else if (act === 'pull') {
      const n = applyCloud(game, await fetchCloud(game, true));
      res = 'pulled';
      if (reload) reloadOnce(game, n);
    } else if (act === 'sync') {
      setRecord(game, { acct: a.name, ver: cloud.ver, hash: local.hash, at: Date.now() });
    } else if (act === 'none' && cloud) {
      setRecord(game, { acct: a.name, ver: cloud.ver, hash: local.hash, at: Date.now() });
    }
    if (res === 'conflict') {
      status[game] = { s: 'conflict', at: 0 };
      if (interactive) conflictDialog(game, cloud, local, reload);
    } else status[game] = { s: 'ok', at: Date.now() };
    return res;
  } catch (e) {
    status[game] = { s: e.message === 'not_logged_in' ? 'nologin' : 'error', at: 0, err: e.message };
    return 'error';
  } finally { busy.delete(game); }
}

function reloadOnce(game, n) {
  // 防循环：10 秒内刚因同步刷新过就不再刷
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10000) return;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
  location.reload();
}

// ---------- 冲突弹窗（自带样式，不依赖各游戏的 CSS） ----------
function conflictDialog(game, cloud, local, reload) {
  if (document.getElementById('gcDlg')) return;
  const cfg = GAMES[game];
  const wrap = document.createElement('div');
  wrap.id = 'gcDlg';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(5,8,14,.72);padding:16px;font:14px/1.6 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  const t = (ms) => (ms ? new Date(ms).toLocaleString() : '—');
  wrap.innerHTML = `<div style="max-width:360px;width:100%;background:#151b27;color:#e6ebf5;border:1px solid #3a4560;border-radius:14px;padding:16px 16px 12px;box-shadow:0 20px 60px #000b">
    <b style="font-size:16px">「${cfg.zh}」本机和云端的存档不一样</b>
    <p style="margin:8px 0;color:#a9b4c8;font-size:13px">这个账号在云端有一份存档，和这台设备上的不同。选一份留下，<b style="color:#f0d28a">另一份会被覆盖</b>。</p>
    <p style="margin:4px 0;font-size:13px">本机：${Object.keys(collect(game)).length} 项存档数据</p>
    <p style="margin:4px 0 12px;font-size:13px">云端：${cloud && cloud.meta ? cloud.meta.n || '?' : '?'} 项 · 最后保存 ${t(cloud && cloud.at)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button data-k="cloud" style="flex:1;padding:9px;border-radius:9px;border:1px solid #c9a13a;background:#7a5d17;color:#fff8e6;font-weight:600">用云端的</button>
      <button data-k="local" style="flex:1;padding:9px;border-radius:9px;border:1px solid #3a4560;background:#1d2635;color:#e6ebf5">用本机的</button>
    </div>
    <div style="text-align:center;margin-top:8px"><button data-k="later" style="background:none;border:0;color:#8794ab;font-size:12.5px;padding:6px">先不处理</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    wrap.remove();
    if (k === 'later') return;
    try {
      if (k === 'cloud') { const n = applyCloud(game, await fetchCloud(game, true)); status[game] = { s: 'ok', at: Date.now() }; if (reload) reloadOnce(game, n); }
      else { const keys = collect(game); const r = await pushCloud(game, cloud ? cloud.ver : 0, keys); status[game] = r.conflict ? { s: 'error', at: 0, err: 'conflict' } : { s: 'ok', at: Date.now() }; }
    } catch (err) { status[game] = { s: 'error', at: 0, err: err.message }; }
  });
}

// ---------- 游戏页入口：登录了就在进入 / 切后台 / 改动后同步 ----------
function startGameCloud(game) {
  if (!GAMES[game]) return;
  setTimeout(() => syncGame(game, { interactive: true, reload: true, pullOk: true }), 1500);
  let timer = 0;
  const lastHash = { v: hashOf(collect(game)) };
  // 每 45 秒看一眼本机内容有没有变，变了就推（不弹窗、不刷新：冲突留到下次进游戏处理）
  timer = setInterval(() => {
    if (document.hidden || !account()) return;
    const h = hashOf(collect(game));
    if (h === lastHash.v) return;
    lastHash.v = h;
    syncGame(game, { interactive: false, reload: false, pullOk: false });
  }, 45000);
  const flush = () => { if (account()) syncGame(game, { interactive: false, reload: false, keepalive: true, pullOk: false }); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
  return () => clearInterval(timer);
}
return { GAMES, account, isTrivial, collect, hashOf, record, plan, statusOf, syncGame, startGameCloud };
})();

// ---- js/lovelive.js
const m_lovelive = await (async () => {
const { SONGS, arrange } = m_songs;
const { Live } = m_audio;
const { UNITS } = m_gen;
const { startGameCloud } = m_gamecloud;
// lovelive！mori⭐mens！ —— 点按式音游（学园偶像祭的玩法壳 + 《忘却前夜》的唤醒体）。
//
// 结构：
//   js/ll/songs.js  曲目库与编曲（级数记号 → 事件表）
//   js/ll/audio.js  WebAudio 合成引擎（音乐 + 音效，页面不带音频文件）
//   js/ll/gen.js    构建生成：上场名册 + 头像（data URI 内联）
//   js/lovelive.js  这里：谱面生成、判定、技能、画布渲染、结算
//
// 玩法（SIF 式）：九个站位围着判定环排成一道弧，音符从站位沿半径收进来，
// 到环上那一刻点它（长条要按住直到尾音）。三位唤醒体上场，各带一个
// 自动发动的技能（判定放大 / 加分 / 护盾 / 回血 / 救 Miss / 加连击 / 减速）。
//
// 自动化测试：?_test=1 把内部状态挂到 window.__ll；加 &_auto=1 自动 Perfect
// 打完全曲，供无头浏览器核对结算。






/* ================================================================ 小工具 */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const TEST = /[?&]_test=1/.test(location.search);
const AUTO = TEST && /[?&]_auto=1/.test(location.search);

/* ================================================================ 存档 */
const KEY = 'zjtt:lovelive';
function loadSave() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
  const s = (v && typeof v === 'object') ? v : {};
  s.best = (s.best && typeof s.best === 'object') ? s.best : {};
  s.team = Array.isArray(s.team) ? s.team.filter((id) => UNITS.some((u) => u.id === id)) : [];
  s.mute = s.mute ? 1 : 0;
  s.plays = Number(s.plays) || 0;
  s.bestCombo = Number(s.bestCombo) || 0;
  return s;
}
const SAVE = loadSave();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* 无痕模式随它去 */ }
}
const bestKey = (songId, diff) => songId + ':' + diff;

/* ================================================================ 难度 */
// win: Perfect / Great / Good / Bad 的半宽（秒）；lead: 音符飞行秒数；
// gap: 谱面最小间隔；hold/dbl: 长条与双押比例；stam: Miss 扣血。
const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.058, 0.105, 0.155, 0.205], lead: 1.70, gap: 0.44, hold: 0,    dbl: 0,    stam: 5, pad: 0.22 },
  { k: 'normal', n: 'NORMAL', win: [0.050, 0.095, 0.145, 0.195], lead: 1.40, gap: 0.30, hold: 0.35, dbl: 0.05, stam: 6, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.15, gap: 0.22, hold: 0.50, dbl: 0.10, stam: 7, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.085, 0.125, 0.170], lead: 0.95, gap: 0.165, hold: 0.55, dbl: 0.14, stam: 8, pad: 0.95 },
];
const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];

/* ================================================================ 谱面 */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 由编曲事件表生成谱面：候选点 = 旋律音 + 按难度补的鼓点，
// 按最小间隔筛一遍，再分 lane、按概率把长音变长条、把小节头变双押。
function makeChart(song, diffK) {
  const D = diffOf(diffK);
  const arr = arrange(song);
  const lead = D.lead;
  const rnd = mulberry32(0x9e3779b9 ^ (song.id.charCodeAt(0) << 8) ^ (diffK.charCodeAt(0) << 16));
  // 候选：旋律全收；pad 比例的鼓点（kick/snare）补进来
  const cand = arr.notes.map((n) => ({ t: n.t, d: n.d, e: n.e }));
  if (D.pad > 0) {
    for (const dr of arr.drums) {
      if ((dr.k === 'k' || dr.k === 's') && rnd() < D.pad) cand.push({ t: dr.t, d: 0, e: 2 });
    }
  }
  cand.sort((a, b) => a.t - b.t);
  const notes = [];
  let last = -9;
  for (const c of cand) {
    if (c.t - last < D.gap - 1e-4) continue;
    if (c.t < lead * 0.5) continue;            // 太早的留给开场，别一上来就砸脸
    last = c.t;
    notes.push({ t: c.t + lead, d: c.d, e: c.e, lane: 4, kind: 'tap', tail: 0 });
  }
  // lane 游走：别连续四五个同 lane，也别跳得读不过来
  let lane = 2 + Math.floor(rnd() * 5), rep = 0;
  for (const n of notes) {
    if (rep >= 2 || rnd() < 0.82) {
      let step = 0;
      const r = rnd();
      if (r < 0.30) step = -2; else if (r < 0.60) step = -1;
      else if (r < 0.90) step = 1; else step = 2;
      const nl = clamp(lane + step, 0, 8);
      if (nl !== lane) { lane = nl; rep = 1; } else rep++;
    } else rep++;
    n.lane = lane;
  }
  // 长条：挑「后面有足够空隙」的拍点变长条（SIF 式的点缀；长旋律音自然空隙大）
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const next = notes[i + 1];
    const gapTo = next ? next.t - n.t : 9;
    if (gapTo < 0.78 || rnd() >= D.hold) continue;
    const tail = n.t + Math.min(0.55, gapTo - 0.2);
    if (tail - n.t < 0.35) continue;
    n.kind = 'hold';
    n.tail = tail;
  }
  // 双押：副歌小节头的拍点，往旁边补一张
  const spb = arr.spb;
  if (D.dbl > 0) {
    const extra = [];
    for (const n of notes) {
      if (n.kind !== 'tap' || rnd() >= D.dbl) continue;
      const sec = Math.round((n.t - lead) / spb);
      if (sec % 4 !== 0) continue;
      const l2 = clamp(n.lane + (n.lane <= 2 ? 2 : n.lane >= 6 ? -2 : (rnd() < 0.5 ? -1 : 1)), 0, 8);
      if (l2 === n.lane) continue;
      extra.push({ t: n.t, d: 0, e: n.e, lane: l2, kind: 'tap', tail: 0 });
    }
    notes.push.apply(notes, extra);
    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  }
  for (const n of notes) n.judged = false, n.hit = false, n.holding = false, n.broken = false;
  return { arr, lead, notes, dur: arr.dur + lead + 1.2 };
}

/* ================================================================ DOM 骨架 */
const app = $('#app');
const scr = {
  title: $('#scr-title'), songs: $('#scr-songs'), team: $('#scr-team'),
  live: $('#scr-live'), result: $('#scr-result'),
};
function show(name) {
  for (const k of Object.keys(scr)) scr[k].hidden = k !== name;
  G.scr = name;
}

/* ================================================================ 全局状态 */
const G = {
  scr: 'title', song: null, diffK: 'normal', chart: null,
  notes: [], ni: 0, combo: 0, maxCombo: 0, score: 0,
  cnt: { p: 0, g: 0, go: 0, b: 0, m: 0 },
  accW: 0, stamina: 100, buffs: [], sk: [], banner: 0, fx: [],
  holds: {}, running: false, over: false, t0: 0, paused: false,
  auto: AUTO, pulses: 0, beatPulse: 0, tickAt: 0,
};
const team = () => (SAVE.team.length ? SAVE.team : UNITS.slice(0, 3).map((u) => u.id));
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[0];
// gen.js 里的 art 是 data URI 字符串：给 DOM 用；画布要的是 Image 对象，启动时解一份
for (const u of UNITS) {
  const im = new Image();
  im.src = u.art;
  u.img = im;
}

/* ================================================================ 技能 */
// 每个上场单位一份触发账本；buff 是挂时长的一次性效果。
function initSkills() {
  G.sk = team().map((id) => {
    const u = unitById(id);
    return { u, last: -1e9, cnt: 0, lastCombo: -1, fires: 0 };
  });
  G.buffs = [];
}
function buffMul(fx) {
  let m = 1;
  for (const b of G.buffs) if (b.fx === fx) m *= b.val;
  return m;
}
function buffFlag(fx) {
  for (const b of G.buffs) if (b.fx === fx) return true;
  return false;
}
function passSum(fx) {
  let s = 0;
  for (const x of G.sk) if (x.u.pass && x.u.pass[fx]) s += x.u.pass[fx];
  return s;
}
function fireSkill(st, now) {
  const sk = st.u.skill;
  st.fires++;
  if (sk.dur > 0) G.buffs.push({ fx: sk.fx, val: sk.val, until: now + sk.dur, u: st.u });
  else applyInstant(sk, now);
  G.banner = { txt: st.u.n + '「' + sk.n + '」', until: now + 2.2, hue: st.u.hue };
  Live.fx('skill');
  paintSkillChips(true);
}
function applyInstant(sk, now) {
  if (sk.fx === 'heal') G.stamina = clamp(G.stamina + sk.val, 0, 100);
  if (sk.fx === 'combo') addCombo(sk.val, true);
}
function tickSkills(now) {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'time') {
      if (now - st.last >= sk.need) { st.last = now; fireSkill(st, now); }
    } else if (sk.trig === 'combo') {
      if (G.combo > 0 && G.combo % sk.need === 0 && st.lastCombo !== G.combo) {
        st.lastCombo = G.combo; fireSkill(st, now);
      }
    }
  }
  G.buffs = G.buffs.filter((b) => b.until > now);
}
function onPerfect() {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig !== 'perfect') continue;
    st.cnt++;
    if (st.cnt % sk.need === 0) fireSkill(st, Live.time());
  }
}

/* ================================================================ 判定与计分 */
const JW = { p: 1, g: 0.8, go: 0.5, b: 0.2, m: 0 };
const JN = { p: 'PERFECT', g: 'GREAT', go: 'GOOD', b: 'BAD', m: 'MISS' };
const JC = { p: '#ffd76a', g: '#8fd0ff', go: '#9be29b', b: '#c9a0ff', m: '#e8695f' };

function addCombo(k, silent) {
  G.combo += k;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  if (!silent && G.combo > 0 && G.combo % 100 === 0) G.stamina = clamp(G.stamina + 6, 0, 100);
}
function judgeNow(now, n, dt) {
  const mul = buffMul('judge') * (1 + passSum('judge'));
  const W = diffOf(G.diffK).win;
  const w = W.map((x) => x * mul);
  const a = Math.abs(dt);
  let j = null;
  if (a <= w[0]) j = 'p'; else if (a <= w[1]) j = 'g';
  else if (a <= w[2]) j = 'go'; else if (a <= w[3]) j = 'b';
  return j;
}
function scoreNote(n, j) {
  const comboMul = 1 + Math.min(G.combo, 300) / 100;
  const base = n.kind === 'hold' ? 220 : 300;
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += base * JW[j] * comboMul * sm;
}
function burst(n, j) {
  G.fx.push({ x: n._x, y: n._y, j, t: Live.time(), hue: n._hue });
  if (G.fx.length > 24) G.fx.shift();
}
function judgeNote(n, dt) {
  const now = Live.time();
  let j = judgeNow(now, n, dt);
  if (j === 'm') j = 'b';
  if (j === null) return false;
  n.judged = true; n.hit = true;
  G.cnt[j === 'p' ? 'p' : j === 'g' ? 'g' : j === 'go' ? 'go' : 'b']++;
  G.accW += JW[j === 'go' ? 'go' : j];
  scoreNote(n, j);
  if (j === 'p') onPerfect();
  if (j === 'b') { G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.6, 0, 100); }
  addCombo(1);
  Live.fx(j === 'p' ? 'perfect' : j === 'g' ? 'great' : j === 'go' ? 'good' : 'bad');
  burst(n, j);
  return true;
}
function missNote(n, why) {
  n.judged = true;
  const now = Live.time();
  if (n._x == null) {
    const p = notePos(n, now, leadEff());
    n._x = p.x; n._y = p.y;
    n._hue = unitById(team()[n.lane % team().length]).hue;
  }
  G.cnt.m++;
  // 技能优先级：护盾（不断连不掉血）> 自动救（Miss→Good）
  if (buffFlag('auto')) {
    G.cnt.m--; G.cnt.go++;
    G.accW += JW.go;
    scoreNote(n, 'go');
    addCombo(1);
    burst(n, 'go');
    G.banner = { txt: 'Miss 被救回来了！', until: now + 1.2, hue: 140 };
    return;
  }
  if (buffFlag('guard')) {
    burst(n, 'm');
    G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    return;
  }
  G.combo = 0;
  G.stamina = clamp(G.stamina - diffOf(G.diffK).stam, 0, 100);
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'miss') fireSkill(st, now);
  }
  Live.fx('miss');
  burst(n, 'm');
}
function releaseHold(n, early) {
  if (!n.holding) return;
  n.holding = false;
  delete G.holds[n._ptr];
  const now = Live.time();
  if (early && now < n.tail - 0.18) {
    // 没按到尾音：断连 + 掉血，但不记 Miss（头部那份已经给过了）
    n.broken = true;
    if (!buffFlag('guard')) {
      G.combo = 0;
      G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.8, 0, 100);
    } else {
      G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    }
    Live.fx('miss');
    burst(n, 'm');
  } else {
    // 尾音结算：按完成度给一笔尾分
    const sm = buffMul('score') * (1 + passSum('score'));
    G.score += 150 * sm;
    G.accW += JW.go;
    G.cnt.go++;
    addCombo(1);
    Live.fx('hold');
    burst(n, 'go');
  }
}

/* ================================================================ 输入 */
function notePos(n, now, le) {
  const sp = POS[n.lane];
  const prog = clamp((n.t - now) / le, 0, 1.25);
  const d = RING.r + (sp.d - RING.r) * prog;
  return { x: RING.cx + sp.dx * d, y: RING.cy + sp.dy * d };
}
function leadEff() {
  const D = diffOf(G.diffK);
  return D.lead * (buffFlag('lead') ? buffMul('lead') : 1);
}
function tapAt(x, y, ptrId) {
  if (!G.running || G.paused) return;
  const now = Live.time();
  const W = diffOf(G.diffK).win;
  const mul = buffMul('judge') * (1 + passSum('judge'));
  const reach = Math.max(84, RING.r * 2.4);
  let best = null, bestCost = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > (W[3] * mul) + 0.02) break;
    if (n.judged || (n.kind === 'hold' && n.holding)) continue;
    const dt = n.t - now;
    if (dt < -(W[3] * mul)) continue;
    const p = notePos(n, now, leadEff());
    const dist = Math.hypot(x - p.x, y - p.y);
    if (dist > reach) continue;
    const cost = Math.abs(dt) * 2.2 + dist / 260;
    if (cost < bestCost) { bestCost = cost; best = n; }
  }
  if (!best) return;
  best._x = notePos(best, now, leadEff()).x; best._y = notePos(best, now, leadEff()).y;
  best._hue = unitById(team()[best.lane % team().length]).hue;
  const j = judgeNow(now, best, best.t - now);
  if (j === null) return;
  if (best.kind === 'hold') {
    best.holding = true;
    best._ptr = ptrId;
    G.holds[ptrId] = best;
    best._x = RING.cx + POS[best.lane].dx * RING.r;
    best._y = RING.cy + POS[best.lane].dy * RING.r;
    judgeNote(best, best.t - now);
  } else {
    judgeNote(best, best.t - now);
  }
}
function releasePtr(ptrId) {
  const n = G.holds[ptrId];
  if (n) releaseHold(n, true);
}
function tapLane(lane) {
  if (!G.running || G.paused) return;
  const now = Live.time();
  const W = diffOf(G.diffK).win;
  const mul = buffMul('judge') * (1 + passSum('judge'));
  let best = null, bestAbs = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > (W[3] * mul) + 0.02) break;
    if (n.lane !== lane || n.judged || (n.kind === 'hold' && n.holding)) continue;
    const a = Math.abs(n.t - now);
    if (a > W[3] * mul) continue;
    if (a < bestAbs) { bestAbs = a; best = n; }
  }
  if (!best) return;
  best._x = notePos(best, now, leadEff()).x; best._y = notePos(best, now, leadEff()).y;
  best._hue = unitById(team()[best.lane % team().length]).hue;
  if (best.kind === 'hold') {
    best.holding = true;
    best._ptr = 'k' + lane;
    G.holds['k' + lane] = best;
    best._x = RING.cx + POS[best.lane].dx * RING.r;
    best._y = RING.cy + POS[best.lane].dy * RING.r;
  }
  judgeNote(best, best.t - now);
}

/* ================================================================ 画布 */
const cv = $('#cv');
const ctx = cv.getContext('2d');
const RING = { cx: 0, cy: 0, r: 44, d: 240 };
let W = 0, H = 0, DPR = 1;
const POS = [];
function fit() {
  const box = $('#stage');
  const b = box.getBoundingClientRect();
  W = Math.max(280, b.width); H = Math.max(360, b.height);
  DPR = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  layout();
}
function layout() {
  RING.cx = W / 2;
  RING.cy = H * 0.64;
  RING.r = clamp(Math.min(W, H) * 0.105, 34, 52);
  const rx = W * 0.45;
  const ry = (RING.cy - 10) * 0.82;
  POS.length = 0;
  for (let i = 0; 9 > i; i++) {
    const a = Math.PI * (0.90 - 0.80 * i / 8);
    const x = RING.cx + Math.cos(a) * rx;
    const y = RING.cy - Math.sin(a) * ry;
    const dx = x - RING.cx, dy = y - RING.cy;
    const len = Math.hypot(dx, dy) || 1;
    POS.push({ x, y, dx: dx / len, dy: dy / len, d: len });
  }
  RING.d = POS[4].d;
}
window.addEventListener('resize', () => { fit(); });
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('#stage'));
document.addEventListener('zj:orient', () => setTimeout(fit, 120));

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const b = cv.getBoundingClientRect();
  tapAt(e.clientX - b.left, e.clientY - b.top, e.pointerId);
}, { passive: false });
window.addEventListener('pointerup', (e) => releasePtr(e.pointerId));
window.addEventListener('pointercancel', (e) => releasePtr(e.pointerId));
const KEYMAP = { a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7, l: 8 };
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const lane = KEYMAP[e.key.toLowerCase()];
  if (lane != null) { e.preventDefault(); tapLane(lane); }
  if (e.key === 'Escape' && G.running) togglePause();
});
window.addEventListener('keyup', (e) => {
  const lane = KEYMAP[e.key.toLowerCase()];
  if (lane != null) releasePtr('k' + lane);
});

/* ================================================================ 渲染 */
function draw(t) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // 背景：暗场 + 环后的光
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e17');
  bg.addColorStop(0.65, '#101527');
  bg.addColorStop(1, '#0b0e17');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(RING.cx, RING.cy, 4, RING.cx, RING.cy, RING.r * 5);
  glow.addColorStop(0, 'rgba(233,120,180,0.20)');
  glow.addColorStop(0.5, 'rgba(140,120,255,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const now = Live.time();
  const le = leadEff();
  const tm = team();
  // 拍点脉冲：歌在走就跟着 bpm 轻微呼吸
  let beat = 0;
  if (G.chart) beat = (now / G.chart.arr.spb) % 1;

  // 轨道：站位到环的引导线
  ctx.lineWidth = 1;
  for (const p of POS) {
    const g = ctx.createLinearGradient(p.x, p.y, RING.cx, RING.cy);
    g.addColorStop(0, 'rgba(150,165,200,0.10)');
    g.addColorStop(1, 'rgba(150,165,200,0.02)');
    ctx.strokeStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(RING.cx, RING.cy);
    ctx.stroke();
  }
  // 站位：上场成员的脸（lane%3 决定谁是这个位置的主人）
  for (let i = 0; 9 > i; i++) {
    const p = POS[i];
    const u = unitById(tm[i % tm.length]);
    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16,21,38,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'hsla(' + u.hue + ',70%,70%,0.5)';
    ctx.stroke();
    ctx.clip();
    if (u.img) ctx.drawImage(u.img, p.x - 13, p.y - 13, 26, 26);
    ctx.restore();
  }
  // 判定环
  const pulse = 1 + Math.max(0, 0.5 - beat) * 0.05;
  ctx.beginPath();
  ctx.arc(RING.cx, RING.cy, RING.r * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,120,180,0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(RING.cx, RING.cy, RING.r * pulse + 7, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(233,120,180,0.16)';
  ctx.lineWidth = 6;
  ctx.stroke();

  if (G.chart) {
    // 音符
    for (let i = G.ni; i < G.notes.length; i++) {
      const n = G.notes[i];
      if ((n.t - now) / le > 1.02) break;
      if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
      const u = unitById(tm[n.lane % tm.length]);
      const p = notePos(n, now, le);
      const rr = RING.r * 0.62;
      if (n.kind === 'hold') {
        // 长条：头被按住就钉在环上，否则随时间飞
        const hp = n.holding ? { x: RING.cx + POS[n.lane].dx * RING.r, y: RING.cy + POS[n.lane].dy * RING.r } : p;
        const tail = clamp((n.tail - now) / le, 0, 1.25);
        const td = RING.r + (RING.d - RING.r) * Math.max(tail, 0);
        const tx = RING.cx + POS[n.lane].dx * td;
        const ty = RING.cy + POS[n.lane].dy * td;
        ctx.beginPath();
        ctx.moveTo(hp.x, hp.y);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = n.broken ? 'rgba(150,150,160,0.25)' : 'hsla(' + u.hue + ',80%,72%,0.55)';
        ctx.lineWidth = rr * 1.15;
        ctx.lineCap = 'round';
        ctx.stroke();
        // 尾端小环
        if (!n.broken && !n.holding) {
          ctx.beginPath();
          ctx.arc(tx, ty, rr * 0.55, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsla(' + u.hue + ',80%,75%,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
      // 头
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.fillStyle = '#141a2c';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'hsl(' + u.hue + ',85%,74%)';
      ctx.stroke();
      ctx.clip();
      if (u.img) ctx.drawImage(u.img, p.x - rr, p.y - rr, rr * 2, rr * 2);
      ctx.restore();
      if (n.kind === 'hold' && !n.holding) {
        // 长条头再描一圈，提示要按住
        ctx.beginPath();
        ctx.arc(p.x, p.y, rr + 3.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'hsla(' + u.hue + ',90%,80%,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // 命中特效
    for (const f of G.fx) {
      const age = t - f.t;
      if (age > 0.5) continue;
      const a = 1 - age / 0.5;
      ctx.beginPath();
      ctx.arc(f.x, f.y, RING.r * (0.7 + age * 2.4), 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + (f.hue || 40) + ',85%,70%,' + (a * 0.8) + ')';
      ctx.lineWidth = 2.5 * a;
      ctx.stroke();
    }
    while (G.fx.length && t - G.fx[0].t > 0.5) G.fx.shift();
    // 连击
    if (G.combo >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,244,255,0.92)';
      ctx.font = '700 ' + Math.round(RING.r * 0.86) + 'px system-ui,-apple-system,"PingFang SC",sans-serif';
      ctx.fillText(String(G.combo), RING.cx, RING.cy + RING.r * 0.3);
      ctx.fillStyle = 'rgba(233,120,180,0.75)';
      ctx.font = '600 ' + Math.round(RING.r * 0.24) + 'px system-ui,sans-serif';
      ctx.fillText('COMBO', RING.cx, RING.cy + RING.r * 0.62);
    }
  }
}

/* ================================================================ 主循环 */
let lastPaint = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const t = ts / 1000;
  draw(t);
  if (!G.running || G.paused) return;
  const now = Live.time();
  // HUD
  $('#live-score').textContent = fmt(G.score);
  $('#live-combo').textContent = G.combo > 0 ? G.combo + ' 连击' : '—';
  const stEl = $('#live-stam');
  stEl.style.width = G.stamina + '%';
  stEl.parentElement.classList.toggle('low', G.stamina <= 30);
  const pr = clamp(now / G.chart.dur, 0, 1);
  $('#live-prog').style.width = (pr * 100) + '%';
  if (now > G.tickAt) {
    G.tickAt = now + 0.25;
    tickSkills(now);
    paintSkillChips(false);
    const bEl = $('#live-banner');
    if (G.banner && now > G.banner.until) G.banner = 0;
    bEl.textContent = G.banner ? G.banner.txt : '';
    bEl.style.opacity = G.banner ? 1 : 0;
    if (G.banner) bEl.style.borderColor = 'hsla(' + G.banner.hue + ',80%,70%,0.6)';
  }
  // 过点判定：Miss / 自动 / 前进头指针；按住中的长条在 holds 表里单独收尾
  for (const k of Object.keys(G.holds)) {
    const hn = G.holds[k];
    if (hn && hn.holding && now >= hn.tail) releaseHold(hn, false);
  }
  const W3 = diffOf(G.diffK).win[3] * buffMul('judge') * (1 + passSum('judge'));
  while (G.ni < G.notes.length) {
    const n = G.notes[G.ni];
    if (AUTO && !n.judged && n.t <= now) { autoHit(n, now); continue; }
    if (!n.judged) {
      if (n.t < now - W3) { missNote(n); continue; }
      break;
    }
    G.ni++;
  }
  // 体力见底 / 歌放完
  if (G.stamina <= 0) { finish(true); return; }
  if (now > G.chart.dur) finish(false);
}
function autoHit(n, now) {
  const dt = n.t - now;
  n._x = notePos(n, now, leadEff()).x; n._y = notePos(n, now, leadEff()).y;
  n._hue = unitById(team()[n.lane % team().length]).hue;
  if (n.kind === 'hold') {
    n.holding = true; n._ptr = '_auto';
    G.holds._auto = n;
    judgeNote(n, dt);
    n.holding = false; delete G.holds._auto;   // 自动模式直接当按满
  } else {
    judgeNote(n, dt);
  }
  G.ni++;
}
requestAnimationFrame(loop);

/* ================================================================ 技能条 UI */
function paintSkillChips(force) {
  const now = Live.time();
  const box = $('#skills');
  if (force || !box.childNodes.length) {
    box.textContent = '';
    for (const st of G.sk) {
      const el = document.createElement('div');
      el.className = 'skill';
      el.style.setProperty('--h', st.u.hue);
      el.innerHTML = '<img alt="" src="' + st.u.art + '"><div class="sm"><b>' + esc(st.u.n) + '</b>'
        + '<span class="sk-n">' + esc(st.u.skill.n) + '</span></div>'
        + '<div class="gauge"><i></i></div>';
      el.title = st.u.skill.txt + (st.u.pass && st.u.pass.score ? '；被动：得分 +' + Math.round(st.u.pass.score * 100) + '%' : '')
        + (st.u.pass && st.u.pass.judge ? '；被动：判定 +' + Math.round(st.u.pass.judge * 100) + '%' : '');
      box.appendChild(el);
    }
  }
  const kids = box.childNodes;
  for (let i = 0; i < G.sk.length; i++) {
    const st = G.sk[i], el = kids[i];
    if (!el) continue;
    const sk = st.u.skill;
    let fr = 0;
    if (sk.trig === 'time') fr = clamp((now - st.last) / sk.need, 0, 1);
    else if (sk.trig === 'combo') fr = G.combo > 0 ? (G.combo % sk.need) / sk.need : 0;
    else if (sk.trig === 'perfect') fr = (st.cnt % sk.need) / sk.need;
    else fr = 1;
    el.querySelector('.gauge i').style.width = (fr * 100) + '%';
    el.classList.toggle('ready', fr >= 1);
  }
}

/* ================================================================ 开局 / 暂停 / 结算 */
function startLive() {
  const song = G.song, D = diffOf(G.diffK);
  G.chart = makeChart(song, G.diffK);
  G.notes = G.chart.notes;
  G.ni = 0;
  G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.cnt = { p: 0, g: 0, go: 0, b: 0, m: 0 };
  G.accW = 0; G.stamina = 100; G.fx = [];
  G.over = false; G.paused = false;
  initSkills();
  Live.setMute(!!SAVE.mute);
  Live.play(G.chart.arr, song.wave);
  G.running = true;
  show('live');
  $('#live-song').textContent = song.n;
  $('#live-diff').textContent = D.n;
  $('#live-score').textContent = '0';
  $('#live-combo').textContent = '—';
  $('#live-banner').textContent = '';
  paintSkillChips(true);
  fit();
}
function togglePause() {
  if (!G.running) return;
  G.paused = !G.paused;
  $('#pauseDlg').hidden = !G.paused;
  if (G.paused) Live.suspend(); else Live.resume();
}
function finish(failed) {
  if (G.over) return;
  G.over = true; G.running = false;
  Live.stop();
  const total = G.notes.length;
  const acc = total ? G.accW / total : 0;
  const ap = G.cnt.p === total;
  const fc = !failed && G.cnt.m === 0 && G.cnt.b === 0;
  const rank = failed ? 'F' : acc >= 0.99 ? 'SSS' : acc >= 0.95 ? 'SS' : acc >= 0.9 ? 'S'
    : acc >= 0.82 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.6 ? 'C' : 'D';
  SAVE.plays++;
  if (G.maxCombo > SAVE.bestCombo) SAVE.bestCombo = G.maxCombo;
  const bk = bestKey(G.song.id, G.diffK);
  const isBest = (Number(SAVE.best[bk]) || 0) < Math.round(G.score);
  if (isBest) SAVE.best[bk] = Math.round(G.score);
  persist();
  // 结算面板
  $('#res-rank').textContent = rank;
  $('#res-title').textContent = failed ? '体力见底，Live 中断…' : (ap ? 'ALL PERFECT！' : fc ? 'FULL COMBO！' : 'Live 结束');
  $('#res-song').textContent = G.song.n + ' · ' + diffOf(G.diffK).n;
  $('#res-score').textContent = fmt(G.score);
  $('#res-acc').textContent = (acc * 100).toFixed(2) + '%';
  $('#res-combo').textContent = G.maxCombo + ' / ' + total;
  $('#res-best').textContent = isBest ? '★ 新纪录' : '最高 ' + fmt(SAVE.best[bk] || 0);
  $('#res-judge').innerHTML = [['PERFECT', G.cnt.p, '#ffd76a'], ['GREAT', G.cnt.g, '#8fd0ff'],
    ['GOOD', G.cnt.go, '#9be29b'], ['BAD', G.cnt.b, '#c9a0ff'], ['MISS', G.cnt.m, '#e8695f']]
    .map((x) => '<li><span style="color:' + x[2] + '">' + x[0] + '</span><b>' + x[1] + '</b></li>').join('');
  $('#res-skills').innerHTML = G.sk.map((st) => {
    const sk = st.u.skill;
    return '<li><img src="' + st.u.art + '" alt=""><span>' + esc(st.u.n) + '「' + esc(sk.n) + '」</span><b>' + st.fires + ' 次</b></li>';
  }).join('');
  show('result');
  renderBest();
}

/* ================================================================ 选曲 / 编队界面 */
function renderSongs() {
  const box = $('#song-list');
  box.textContent = '';
  for (const s of SONGS) {
    const card = document.createElement('article');
    card.className = 'song';
    const diffs = DIFFS.map((d) => {
      const b = Number(SAVE.best[bestKey(s.id, d.k)]) || 0;
      return '<button type="button" class="df' + (d.k === G.diffK ? ' on' : '') + '" data-s="' + s.id + '" data-d="' + d.k + '">'
        + '<b>' + d.n + '</b><span>' + (b ? fmt(b) : '·—·') + '</span></button>';
    }).join('');
    card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
      + '<span class="bpm">' + s.bpm + ' BPM</span></div>'
      + '<p class="sdesc">' + esc(s.desc) + '</p>'
      + '<div class="dfs">' + diffs + '</div>';
    box.appendChild(card);
  }
  box.onclick = (e) => {
    const b = e.target.closest('button.df');
    if (!b) return;
    G.diffK = b.dataset.d;
    G.song = SONGS.find((x) => x.id === b.dataset.s);
    openTeam();
  };
}
let teamSel = [];
function openTeam() {
  teamSel = team().slice(0, 3);
  $('#team-song').textContent = G.song ? G.song.n : '';
  renderTeam();
  show('team');
}
function renderTeam() {
  const grid = $('#unit-grid');
  grid.textContent = '';
  for (const u of UNITS) {
    const on = teamSel.indexOf(u.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'unit' + (on >= 0 ? ' on' : '');
    el.style.setProperty('--h', u.hue);
    const ps = (u.pass && u.pass.score) ? ('得分 +' + Math.round(u.pass.score * 100) + '%')
      : (u.pass && u.pass.judge) ? ('判定 +' + Math.round(u.pass.judge * 100) + '%') : '—';
    el.innerHTML = '<span class="uimg"><img src="' + u.art + '" alt=""></span>'
      + '<b>' + esc(u.n) + '</b>'
      + (on >= 0 ? '<i class="ord">' + (on + 1) + '</i>' : '')
      + '<span class="sk"><em>自动</em>' + esc(u.skill.n) + '</span>'
      + '<span class="stxt">' + esc(u.skill.txt) + '</span>'
      + '<span class="pas">' + esc(ps) + '</span>';
    el.onclick = () => {
      const i = teamSel.indexOf(u.id);
      if (i >= 0) teamSel.splice(i, 1);
      else if (teamSel.length >= 3) return flash('#team-tip', '最多带三位上场，先取消一位');
      else teamSel.push(u.id);
      SAVE.team = teamSel.slice();
      persist();
      renderTeam();
    };
    grid.appendChild(el);
  }
  const box = $('#team-pick');
  box.innerHTML = teamSel.map((id, i) => {
    const u = unitById(id);
    return '<span class="pick" style="--h:' + u.hue + '"><img src="' + u.art + '" alt=""><b>' + (i + 1) + '. ' + esc(u.n) + '</b></span>';
  }).join('') || '<span class="dim">还没选人——点下面的唤醒体上场（最多三位）</span>';
}
function flash(sel, txt) {
  const el = $(sel);
  el.textContent = txt;
  el.classList.add('on');
  setTimeout(() => el.classList.remove('on'), 1600);
}

/* ================================================================ 首屏 */
function renderBest() {
  const el = $('#title-best');
  let played = 0, bestScore = 0;
  for (const k of Object.keys(SAVE.best)) {
    played++;
    bestScore = Math.max(bestScore, Number(SAVE.best[k]) || 0);
  }
  el.textContent = played
    ? '玩过 ' + played + ' 张谱 · 最高分 ' + fmt(bestScore) + ' · 最长连击 ' + fmt(SAVE.bestCombo)
    : '还没玩过——选首歌，带上三位唤醒体试试？';
}

/* ================================================================ 接线 */
$('#btn-play').onclick = () => { renderSongs(); show('songs'); };
$('#btn-team').onclick = () => openTeam();
$('#btn-help').onclick = () => { $('#helpDlg').showModal ? $('#helpDlg').showModal() : $('#helpDlg').setAttribute('open', ''); };
$('#songs-back').onclick = () => show('title');
$('#team-back').onclick = () => { renderSongs(); show('songs'); };
$('#team-go').onclick = () => { if (!teamSel.length) return flash('#team-tip', '至少带一位上场'); startLive(); };
$('#live-pause').onclick = () => togglePause();
$('#pause-resume').onclick = () => togglePause();
$('#pause-retry').onclick = () => { G.paused = false; $('#pauseDlg').hidden = true; Live.resume(); startLive(); };
$('#pause-quit').onclick = () => { G.paused = false; $('#pauseDlg').hidden = true; G.running = false; G.over = true; Live.stop(); show('songs'); renderSongs(); };
$('#res-retry').onclick = () => startLive();
$('#res-songs').onclick = () => { renderSongs(); show('songs'); };
$('#res-home').onclick = () => { show('title'); renderBest(); };
$('#mute').onclick = () => {
  SAVE.mute = SAVE.mute ? 0 : 1;
  persist();
  Live.setMute(!!SAVE.mute);
  $('#mute').classList.toggle('off', !!SAVE.mute);
};
$('#mute').classList.toggle('off', !!SAVE.mute);

/* ================================================================ 测试钩子 */
if (TEST) {
  window.__ll = {
    G, SAVE, UNITS, SONGS, DIFFS, startLive, finish, makeChart, show, renderSongs, openTeam,
    tapAt, tapLane, notePos, leadEff, RING, POS,
    live: Live,
    setDiff: (k) => { G.diffK = k; },
    pickSong: (id) => { G.song = SONGS.find((x) => x.id === id) || SONGS[0]; },
    setTeam: (ids) => { SAVE.team = ids; persist(); },
  };
}

/* ================================================================ 启动 */
renderBest();
startGameCloud('lovelive');
fit();
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

