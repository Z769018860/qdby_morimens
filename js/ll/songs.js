// 曲目库：Love Live! 经典曲 + 剑网3 / 明日方舟 / 边狱巴士 的高燃曲 × 《忘却前夜》的短版芯片风改编。
//
// 第二批（剑网3 / 明日方舟 / 边狱巴士）单独放在 songs-ip.js，记号完全一样。
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

import { IP_SONGS } from './songs-ip.js';

export const SONGS = [
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
  ...IP_SONGS,
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
export function arrange(song) {
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
  // 每个旋律音到下一个旋律音的间隔（含休止）：乐句尾的音后面跟着一串休止，
  // 谱面生成用它判断「这里可以拉一条长条」。
  for (let i = 0; i < notes.length; i++) {
    notes[i].gap = (i + 1 < notes.length ? notes[i + 1].t : beats * spb) - notes[i].t;
  }
  return { bpm: song.bpm, spb, beats, dur: beats * spb + spb, chords, notes, drums };
}
