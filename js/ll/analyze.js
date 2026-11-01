// 谱面生成：两条路线，同一种产物。
//
//   ① 原曲路线 —— 把解码后的 AudioBuffer 过一遍「能量 + 高频差分流」的
//      起音检测（onset detection），得到一串 (时间, 强度) 的鼓点/重音，
//      再按难度挑密度、分轨道、把长音符变成长条。谱面因此贴的是你导入的
//      那一版原曲，不是按 BPM 硬铺的网格。
//   ② 芯片改编路线 —— 走 songs.js 的 arrange() 事件表（旋律 + 鼓），
//      没有导入原曲时的默认音源，谱面由旋律生成。
//
// 产物统一是 { notes, dur }，notes 里每条：
//   { t, lane 0~8, kind: 'tap'|'hold', tail, s }（s = 强度 0~1，只影响表现）

/* ================================================================ 随机 */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* ================================================================ 起音检测 */
// 逐帧算两路特征：总能量、以及一阶差分（≈ 高频）的能量。
// 取「比上一帧多出来多少」（novelty），再跟 0.4 秒窗口内的均值比，
// 明显超出的局部极大值就是一个起音。
//
// 参数只在极端音频下才需要动：hop 512 约 11.6ms 一帧，够细了。
export function detectOnsets(buf, opt) {
  const o = opt || {};
  const hop = o.hop || 512;
  const minGap = o.minGap == null ? 0.085 : o.minGap;
  const sr = buf.sampleRate || 44100;
  const len = buf.length || 0;
  if (!len) return [];
  const nCh = Math.min(2, buf.numberOfChannels || 1);
  const chans = [];
  for (let c = 0; c < nCh; c++) chans.push(buf.getChannelData(c));
  const frames = Math.floor(len / hop);
  const e = new Float64Array(frames);
  const hf = new Float64Array(frames);
  const ch0 = chans[0];
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    const s0 = f * hop;
    let sum = 0, dsum = 0;
    for (let i = 0; i < hop; i++) {
      let v = ch0[s0 + i];
      if (nCh > 1) v = (v + chans[1][s0 + i]) * 0.5;
      sum += v * v;
      const d = v - prev;
      dsum += d * d;
      prev = v;
    }
    e[f] = Math.sqrt(sum / hop);
    hf[f] = Math.sqrt(dsum / hop);
  }
  // 对数压缩：爆音和轻声都落在同一量级，弱拍才不会被重拍吃掉
  const lg = (x) => Math.log10(1 + 90 * x);
  const nov = new Float64Array(frames);
  for (let f = 1; f < frames; f++) {
    const a = lg(e[f]) + 0.55 * lg(hf[f]);
    const b = lg(e[f - 1]) + 0.55 * lg(hf[f - 1]);
    nov[f] = a > b ? a - b : 0;
  }
  // 滑动均值做自适应门限（前缀和，O(n)）
  const pre = new Float64Array(frames + 1);
  for (let f = 0; f < frames; f++) pre[f + 1] = pre[f] + nov[f];
  const W = Math.max(8, Math.round((o.win || 0.4) * sr / hop));
  const raw = [];
  for (let f = 1; f < frames - 1; f++) {
    const a = Math.max(0, f - W), b = Math.min(frames, f + W + 1);
    const mean = (pre[b] - pre[a]) / (b - a);
    const th = mean * 1.65 + 0.004;
    const v = nov[f];
    if (v < th) continue;
    if (v < nov[f - 1] || v < nov[f + 1]) continue;      // 只留局部极大
    raw.push({ t: (f * hop) / sr, s: v });
  }
  // 太挤的合并（保留强的那个）
  raw.sort((x, y) => x.t - y.t);
  const out = [];
  for (const p of raw) {
    const last = out[out.length - 1];
    if (last && p.t - last.t < minGap) {
      if (p.s > last.s) { last.t = p.t; last.s = p.s; }
      continue;
    }
    out.push(p);
  }
  let mx = 0;
  for (const p of out) if (p.s > mx) mx = p.s;
  if (mx > 0) for (const p of out) p.s = p.s / mx;
  return out;
}

/* ================================================================ 选点 */
// 按强度降序贪心：先收最响的鼓点，再在「最小间隔」约束下补次级重音。
// 比按时间顺序硬筛更贴音乐——副歌密、主歌疏，谱面自己就跟着走。
function pickOnsets(onsets, D, t0, dur) {
  const cand = onsets.filter((p) => p.t >= t0 && p.t <= dur - 0.6);
  const order = cand.slice().sort((a, b) => b.s - a.s);
  const keep = [];
  for (const p of order) {
    let ok = true;
    for (let i = 0; i < keep.length; i++) {
      if (Math.abs(keep[i].t - p.t) < D.gap) { ok = false; break; }
    }
    if (ok) keep.push(p);
  }
  keep.sort((a, b) => a.t - b.t);
  return keep;
}

/* ================================================================ 长条 */
// 先决定哪些点变长条（此时还没分轨），再去分轨。
// 长条三种来路：
//   · 旋律里本来就拖长的音（d 是秒）——最自然；
//   · 乐句尾（end：后面跟着一串休止，mgap 是到下一个旋律音的距离）；
//   · 局部很空的拍点（前后都是大片空隙，原曲谱面走这条）。
function decideHolds(notes, D, rnd, maxTail) {
  // 占比封顶：长条是点缀，不是主菜（不同难度给不同上限）
  const cap = Math.max(3, Math.round(notes.length * (D.holdCap || 0.15)));
  let holds = 0;
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    const gap = i + 1 < notes.length ? notes[i + 1].t - n.t : 9;
    const long = (n.d || 0) >= 0.5;
    let p = 0, want = 0;
    if (long) { p = Math.min(0.95, D.hold + 0.4); want = Math.max(0.5, n.d) * 0.85; }
    else if (n.end) {
      // 乐句尾：尾巴允许伸进下一乐句（压的是别的轨，同轨在分轨时会躲开）
      p = Math.min(0.55, D.hold + 0.1);
      want = Math.min(1.0, Math.max(0.42, (n.mgap || 0.3) * 0.8));
    }
    else if (gap >= 0.6) { p = D.hold; want = Math.min(1.3, gap * 0.78); }
    if (p <= 0 || rnd() >= p) continue;
    if (holds >= cap) continue;                  // 占比封顶：长条是点缀，不是主菜
    const tail = n.t + Math.min(maxTail, want);
    if (tail - n.t < 0.3) continue;
    n.kind = 'hold';
    n.tail = tail;
    holds++;
  }
}

/* ================================================================ 分轨道 */
// 游走式分轨：不连着四次同轨，也不一次跨太多格（读谱压力可控）。
// 分轨时避开「正在按长条」的轨；实在躲不开就在收尾时把长条裁短。
function assignLanes(notes, rnd, jump) {
  const busy = new Array(9).fill(-9);          // 每条轨忙到什么时刻
  let lane = 2 + Math.floor(rnd() * 5);
  let same = 0;
  for (const n of notes) {
    let chosen = -1;
    for (let tries = 0; tries < 9 && chosen < 0; tries++) {
      let step;
      if (tries === 0) {
        const r = rnd();
        if (r < 0.26) step = -2; else if (r < 0.58) step = -1;
        else if (r < 0.90) step = 1; else step = 2 + (jump > 1 ? Math.floor(rnd() * 2) : 0);
      } else {
        step = Math.floor(rnd() * 9) - 4;      // 兜底：随便跳一格找空轨
      }
      const nl = clamp(lane + step, 0, 8);
      if (nl === lane && same >= 2) continue;
      if (n.t < busy[nl] - 1e-4) continue;     // 这条轨的长条还没松
      chosen = nl;
    }
    if (chosen < 0) chosen = lane;
    same = chosen === lane ? same + 1 : 0;
    lane = chosen;
    n.lane = lane;
    busy[lane] = n.kind === 'hold' ? n.tail + 0.06 : n.t;
  }
  // 收尾：同轨的长条不许压到下一张
  const byLane = new Map();
  for (const n of notes) {
    if (!byLane.has(n.lane)) byLane.set(n.lane, []);
    byLane.get(n.lane).push(n);
  }
  for (const q of byLane.values()) {
    q.sort((a, b) => a.t - b.t);
    for (let i = 0; i < q.length; i++) {
      const n = q[i];
      if (n.kind !== 'hold') continue;
      const nx = q[i + 1];
      if (nx && nx.t < n.tail - 1e-6) {
        const tail = nx.t - 0.12;
        if (tail - n.t < 0.3) { n.kind = 'tap'; n.tail = 0; }
        else n.tail = tail;
      }
    }
  }
}

function addDoubles(notes, D, rnd) {
  if (D.dbl <= 0) return;
  const busy = new Array(9).fill(-9);
  for (const n of notes) busy[n.lane] = Math.max(busy[n.lane], n.kind === 'hold' ? n.tail : n.t);
  const extra = [];
  for (const n of notes) {
    if (n.kind !== 'tap' || rnd() >= D.dbl) continue;
    for (let k = 2; k <= 4; k++) {
      const dir = n.lane <= 2 ? 1 : n.lane >= 6 ? -1 : (rnd() < 0.5 ? -1 : 1);
      const l2 = n.lane + dir * k;
      if (l2 < 0 || l2 > 8) continue;
      if (busy[l2] > n.t - 1e-4) continue;         // 那条轨正按着长条
      if (notes.some((m) => m !== n && m.lane === l2 && Math.abs(m.t - n.t) < 0.18)) continue;
      extra.push({ t: n.t, lane: l2, kind: 'tap', tail: 0, s: n.s });
      busy[l2] = n.t;
      break;
    }
  }
  for (const x of extra) notes.push(x);
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

/* ================================================================ 两条入口 */
// 原曲：onsets 来自 detectOnsets(buf, ...)，dur 是整首长度
export function chartFromOnsets(onsets, dur, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const picked = pickOnsets(onsets, D, 1.2, dur);
  const notes = picked.map((p) => ({ t: p.t, lane: 4, kind: 'tap', tail: 0, s: p.s }));
  decideHolds(notes, D, rnd, 1.5);
  assignLanes(notes, rnd, D.dbl > 0 ? 2 : 1);
  addDoubles(notes, D, rnd);
  return { notes, dur, src: 'audio' };
}

// 芯片改编：arr 是 songs.js arrange() 的产物
export function chartFromArr(arr, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const lead = D.lead;
  const cand = arr.notes.map((n) => ({
    t: n.t, d: n.d, e: n.e, end: (n.gap || 0) >= 0.3, mgap: n.gap || 0,
  }));
  if (D.pad > 0) {
    for (const dr of arr.drums) {
      if ((dr.k === 'k' || dr.k === 's') && rnd() < D.pad) cand.push({ t: dr.t, d: 0, e: 2, end: false, mgap: 0 });
    }
  }
  cand.sort((a, b) => a.t - b.t);
  const notes = [];
  let last = -9;
  for (const c of cand) {
    if (c.t - last < D.gap - 1e-4) continue;
    if (c.t < lead * 0.25) continue;
    last = c.t;
    notes.push({
      t: c.t + lead, lane: 4, kind: 'tap', tail: 0,
      s: 0.5 + Math.min(0.5, c.d / 1.2), d: c.d, end: c.end, mgap: c.mgap,
    });
  }
  decideHolds(notes, D, rnd, 1.6);
  assignLanes(notes, rnd, D.dbl > 0 ? 2 : 1);
  addDoubles(notes, D, rnd);
  return { notes, dur: arr.dur + lead + 1.1, src: 'chip' };
}
