// 谱面生成 v3：两条路线，同一种产物。
//
//   ① 原曲路线 —— 把解码后的 AudioBuffer 拆成三条频段（低/中/高）的能量包络，
//      每条各自做「相对通量」起音检测，再合起来取局部极大。
//      每个起音顺手补三个属性，谱面就靠它们贴合原曲：
//        · d（拖了多久）—— 中频持续发声的长度：原曲里拖住的长音变长条；
//        · p（音高 0~1）—— 8.8k 采样上的自相关基频，决定落在哪一格
//          （旋律往上走，音符跟着往右移）；
//        · b（[低, 中, 高] 三段通量）—— 判断这道重音有多「宽」，
//          宽的地方才配双押 / 双长按。
//      分轨时按音高排名等分九格，全曲的音高分布再偏也能把九格用满。
//   ② 芯片改编路线 —— 走 songs.js 的 arrange() 事件表（旋律 + 鼓），
//      没有导入原音时的默认音源，谱面由旋律的音高与时长生成。
//
// 产物统一是 { notes, dur, src }，notes 里每条：
//   { t, lane 0~8, kind: 'tap'|'hold', tail, s, b }（s = 强度 0~1，只影响表现）
// 同一时刻的两条 note 就是双押，两条都是 hold 就是双长按（最多两根）。

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

/* ================================================================ 声道合并 */
function monoMix(buf) {
  const nCh = Math.min(2, buf.numberOfChannels || 1);
  const a = buf.getChannelData(0);
  if (nCh < 2) return a;
  const b = buf.getChannelData(1);
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) * 0.5;
  return out;
}

/* ================================================================ 音高 */
// 音区必须来自「这个音到底多高」，不能来自频谱重心——重心量的是亮度，
// 一进副歌加了镲片就整片往右跑，谱面看着像乱撒。
// 这里在 8.8kHz 上做归一化自相关，取 130~1000Hz 里第一个像样的峰当基频，
// 再对八度错误做一次纠正。算一个点两万次乘加，一首歌几十毫秒。
const PBASE = 140, PTOP = 1000;
const decBuf = new Float64Array(512);
function pitchAt(x, sr, t, prevF0) {
  const start = Math.round((t + 0.008) * sr);
  const n = 2048, dec = Math.max(2, Math.round(sr / 8820));
  const m = Math.floor(n / dec);
  // 抽取 + 去直流
  let mean = 0;
  for (let i = 0; i < m * dec; i++) mean += x[start + i] || 0;
  mean /= Math.max(1, m * dec);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let k = 0; k < dec; k++) s += (x[start + i * dec + k] || 0) - mean;
    decBuf[i] = (s / dec) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / m));
  }
  const sr2 = sr / dec;
  const kmin = Math.max(2, Math.floor(sr2 / PTOP));
  const kmax = Math.min(m - 2, Math.ceil(sr2 / PBASE));
  if (kmax <= kmin + 2) return null;
  let e0 = 0;
  for (let i = 0; i < m; i++) e0 += decBuf[i] * decBuf[i];
  if (e0 <= 1e-9) return null;
  let best = 0;
  const r = new Float64Array(kmax + 2);
  for (let k = kmin - 1; k <= kmax + 1; k++) {
    let num = 0, e1 = 0;
    const lim = m - k;
    for (let i = 0; i < lim; i++) {
      num += decBuf[i] * decBuf[i + k];
      e1 += decBuf[i + k] * decBuf[i + k];
    }
    const v = e1 > 0 ? num / Math.sqrt(e0 * e1) : 0;
    r[k] = v;
    if (k >= kmin && k <= kmax && v > best) best = v;
  }
  if (best < 0.28) return null;                         // 没有像样的周期性
  // 所有够高的局部峰都是候选（含八度关系），再挑一个「和上一个音最连贯」的。
  // 只看最高峰会因为八度错误让旋律整段乱跳，谱面跟着上下乱窜。
  const cands = [];
  for (let k = kmin + 1; k < kmax; k++) {
    if (r[k] < 0.28 || r[k] < 0.72 * best) continue;
    if (r[k] < r[k - 1] || r[k] < r[k + 1]) continue;
    const y0 = r[k - 1], y1 = r[k], y2 = r[k + 1];
    const den = y0 - 2 * y1 + y2;
    const shift = Math.abs(den) > 1e-9 ? clamp((0.5 * (y0 - y2)) / den, -0.5, 0.5) : 0;
    cands.push({ f0: sr2 / (k + shift), conf: y1 });
  }
  if (!cands.length) return null;
  let pick = cands[0];
  if (prevF0 > 0) {
    let bs = -9;
    for (const c of cands) {
      const oct = Math.abs(Math.log2(c.f0 / prevF0));
      const score = c.conf - 0.30 * Math.min(3, oct);   // 每个八度罚 0.30
      if (score > bs) { bs = score; pick = c; }
    }
  } else {
    for (const c of cands) if (c.conf > pick.conf) pick = c;
  }
  const p = (Math.log2(pick.f0) - Math.log2(PBASE)) / (Math.log2(PTOP) - Math.log2(PBASE));
  return { p: clamp(p, 0, 1), conf: pick.conf, f0: pick.f0 };
}

/* ================================================================ 频段分析 */
// 一条链：200Hz 两点低通（低）、200~2k 带通（中）、2k 以上高通（高）。
// 全部一阶，逐样本递推——比每帧做 FFT 便宜一个数量级，20 秒的歌也就几十毫秒。
const HOP = 256;                                  // 5.8ms 一帧

function bandTrack(x, sr) {
  const aLow = 1 - Math.exp((-2 * Math.PI * 200) / sr);
  const aMid = 1 - Math.exp((-2 * Math.PI * 2000) / sr);
  const frames = Math.floor(x.length / HOP);
  const eLo = new Float64Array(frames), eMid = new Float64Array(frames);
  const eHi = new Float64Array(frames), rms = new Float64Array(frames);
  const rMid = new Float64Array(frames);           // 中频原始音量，判长音用
  let l1 = 0, l2 = 0, m1 = 0;
  for (let f = 0; f < frames; f++) {
    let sl = 0, sm = 0, sh = 0, st = 0;
    const s0 = f * HOP;
    for (let i = 0; i < HOP; i++) {
      const v = x[s0 + i];
      l1 += aLow * (v - l1);
      l2 += aLow * (l1 - l2);
      m1 += aMid * (v - m1);
      const md = m1 - l2;
      const hg = v - m1;
      sl += l2 * l2; sm += md * md; sh += hg * hg; st += v * v;
    }
    rMid[f] = Math.sqrt(sm / HOP);
    // 对数压缩：轻声的起音和爆音落在同一量级，弱拍不会被重拍吃掉
    eLo[f] = Math.log10(1 + 900 * Math.sqrt(sl / HOP));
    eMid[f] = Math.log10(1 + 900 * rMid[f]);
    eHi[f] = Math.log10(1 + 900 * Math.sqrt(sh / HOP));
    rms[f] = Math.sqrt(st / HOP);
  }
  return { frames, eLo, eMid, eHi, rms, rMid };
}

/* ================================================================ 起音检测 */
// 每个频段先算「这一帧比两帧前多出来多少」，再除以它自己 0.5 秒窗内的均值，
// 得到相对通量——这样安静段落里的镲、副歌里的人声换字都能被认出来，
// 而不是只有底鼓响的那一下才算。三段的相对通量按音乐里的比重加权合并。
//
// 参数只在极端音频下才需要动：hop 256 约 5.8ms 一帧，够细了。
export function detectOnsets(buf, opt) {
  const o = opt || {};
  const sr = buf.sampleRate || 44100;
  const x = monoMix(buf);
  if (!x.length) return [];
  const bt = bandTrack(x, sr);
  const { frames, eLo, eMid, eHi, rms, rMid } = bt;
  const lag = o.lag == null ? 2 : o.lag;                 // 跟几帧前比（≈12ms）
  const minGap = o.minGap == null ? 0.07 : o.minGap;

  // 每段的通量
  const flux = (e, w1) => {
    const f = new Float64Array(frames);
    for (let i = lag; i < frames; i++) {
      const d = e[i] - e[i - lag];
      f[i] = d > 0 ? d : 0;
    }
    return f;
  };
  const fLo = flux(eLo), fMid = flux(eMid), fHi = flux(eHi);

  // 相对化：除以本地均值，再和绝对值混合
  const W = Math.max(8, Math.round((o.win || 0.5) * sr / HOP));
  const rel = (f) => {
    const pre = new Float64Array(frames + 1);
    for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + f[i];
    const out = new Float64Array(frames);
    const gl = pre[frames] / Math.max(1, frames);
    for (let i = 0; i < frames; i++) {
      const a = Math.max(0, i - W), b = Math.min(frames, i + W + 1);
      const mean = (pre[b] - pre[a]) / (b - a);
      out[i] = f[i] / (mean * 0.6 + gl * 0.4 + 1e-4);
    }
    return out;
  };
  const gLo = rel(fLo), gMid = rel(fMid), gHi = rel(fHi);

  // 合并：中频（人声/旋律）最重，其次低频（鼓）、高频（镲）
  const nov = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    nov[i] = 0.85 * Math.min(4, gMid[i]) + 0.55 * Math.min(4, gLo[i]) + 0.32 * Math.min(4, gHi[i]);
  }

  // 自适应门限 + 局部极大
  const pre = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + nov[i];
  const raw = [];
  for (let f = 2; f < frames - 2; f++) {
    const v = nov[f];
    if (v < nov[f - 1] || v < nov[f + 1] || v < nov[f - 2] || v < nov[f + 2]) continue;
    const a = Math.max(0, f - W), b = Math.min(frames, f + W + 1);
    const mean = (pre[b] - pre[a]) / (b - a || 1);
    const th = mean * (o.th || 1.30) + 0.35;
    if (v < th) continue;
    raw.push({ f, v });
  }
  // 太挤的合并（保留强的那个）
  raw.sort((p, q) => p.f - q.f);
  const kept = [];
  for (const p of raw) {
    const last = kept[kept.length - 1];
    if (last && (p.f - last.f) * HOP / sr < minGap) {
      if (p.v > last.v) { last.f = p.f; last.v = p.v; }
      continue;
    }
    kept.push(p);
  }

  /* ---------- 每个起音的强度 / 拖长 / 音区 ---------- */
  // 长音只在「中频」（人声、弦乐、主奏乐器）上量：整轨 RMS 在密集编曲里
  // 几乎不会掉下去，拿它判长短会把每一下都当成拖了三秒。
  // 中频包络快起慢落，掉到峰值的 62% 以下就算这个音松了。
  const rel2 = Math.exp(-HOP / (0.045 * sr));
  const env = new Float64Array(frames);
  let cur = 0;
  for (let f = 0; f < frames; f++) {
    const v = rMid[f];
    cur = v > cur ? v : cur * rel2 + v * (1 - rel2);
    env[f] = cur;
  }
  // 底噪：整首 env 的 15% 分位
  const sortedEnv = Float32Array.from(env).sort();
  const noise = sortedEnv[Math.floor(sortedEnv.length * 0.15)] || 0;

  let mx = 0;
  for (const p of kept) if (p.v > mx) mx = p.v;

  const onsets = [];
  const maxHold = 2.8;
  const FPS = sr / HOP;
  let prevF0 = 0, prevT = -9;
  let prevP = null;                                     // 上一个量出来的音区
  for (const p of kept) {
    const t = (p.f * HOP) / sr;
    // 找这一下的峰值帧（起音检测会略早于能量峰）
    const fEnd = Math.min(frames - 1, p.f + Math.round(0.09 * FPS));
    let pi = p.f, pv = env[p.f];
    for (let f = p.f; f <= fEnd; f++) if (env[f] > pv) { pv = env[f]; pi = f; }
    // 往后走到中频掉下去为止（允许 90ms 的气口）
    const thr = Math.max(pv * 0.62, noise * 1.6);
    let lastGood = pi, bad = 0;
    const limit = Math.min(frames - 1, pi + Math.round(maxHold * FPS));
    let jumpAt = -1;
    for (let f = pi + 1; f <= limit; f++) {
      // 又进来一个新的重音（音量忽然翻倍）：这是一个新音，不是延续
      if (env[f] > env[f - 1] * 1.9 + noise) { jumpAt = f; break; }
      if (env[f] >= thr) { lastGood = f; bad = 0; }
      else if (++bad / FPS > 0.09) break;
    }
    if (jumpAt > 0) lastGood = Math.min(lastGood, jumpAt);
    const d = Math.max(0, (lastGood - p.f) / FPS);
    if (t - prevT > 1.6) prevF0 = 0;                    // 断句太久，清掉音高惯性
    const pt = pitchAt(x, sr, t, prevF0);
    if (pt && pt.conf > 0.45) { prevF0 = pt.f0; prevP = pt.p; }
    prevT = t;
    // 三段通量归一成「占比」（低+中+高 = 1）：拿它判这道音有多宽，
    // 比原始比值稳——原始值随段落响度飘，同一套阈值没法通用
    const raw = [gLo[p.f], gMid[p.f], gHi[p.f]];
    const sum = raw[0] + raw[1] + raw[2] + 1e-6;
    onsets.push({
      t,
      s: mx > 0 ? p.v / mx : 0,
      d,
      // 估不出基频（气声、纯噪声）就沿用上一个音的音区——乱跳比留在原地更难看
      p: pt ? pt.p : (prevP == null ? 0.5 : prevP),
      pc: pt ? 1 : 0,                                     // 音区是不是量出来的
      f0: pt ? pt.f0 : 0,
      b: [raw[0] / sum, raw[1] / sum, raw[2] / sum],
    });
  }

  /* ---------- 音区拉满：按音高分位做直方图均衡 ---------- */
  // 直接线性拉伸没用：流行歌的音区本来就偏中低，谱面会挤在中间三格。
  // 按分位排序映射成均匀分布，九格才用得满；映射是单调的，旋律走向不变。
  const tuned = onsets.filter((q) => q.pc).map((q) => q.p).sort((a, b) => a - b);
  if (tuned.length > 16) {
    const n = tuned.length;
    const qmap = (v) => {
      let lo = 0, hi = n - 1;
      if (v <= tuned[0]) return 0;
      if (v >= tuned[n - 1]) return 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tuned[mid] <= v) lo = mid; else hi = mid;
      }
      const span = tuned[hi] - tuned[lo];
      const f = span > 1e-9 ? (v - tuned[lo]) / span : 0;
      return clamp((lo + f) / (n - 1), 0, 1);
    };
    for (const q2 of onsets) q2.p = qmap(q2.p);
  }
  return onsets;
}

/* ================================================================ 分析入口 */
// 浏览器里一首歌只跑一次，结果按 [t,s,d,p,lo,hi] 存 IndexedDB。
export function analyzeTrack(buf, opt) {
  const onsets = detectOnsets(buf, opt);
  return { onsets, dur: buf.duration || 0 };
}

// 缓存序列化：7 个数一档，比对象省一半体积
export function packOnsets(onsets) {
  return onsets.map((p) => [
    +p.t.toFixed(3), +p.s.toFixed(2), +p.d.toFixed(2), +p.p.toFixed(2),
    +p.b[0].toFixed(2), +p.b[1].toFixed(2), +p.b[2].toFixed(2),
  ]);
}
export function unpackOnsets(flat) {
  return flat.map((a) => ({
    t: a[0], s: a[1], d: a[2] || 0, p: a[3] == null ? 0.5 : a[3],
    b: [a[4] == null ? 0.34 : a[4], a[5] == null ? 0.33 : a[5], a[6] == null ? 0.33 : a[6]],
  }));
}

/* ================================================================ 选点 */
// 按时间顺序贪心。两个门槛都是「相对本地」的，绝对强弱不管用：
// 拿全曲分位卡强度，安静的主歌会整段没音符；拿全曲均值卡间隔，副歌又不够密。
//   · 强度：低于本地均值的 55% 当噪声丢掉（同时兜一个全曲地板）；
//   · 间隔：随本地响度缩放，副歌挤、主歌松。
function pickOnsets(onsets, D, t0, tEnd) {
  const cand = onsets.filter((p) => p.t >= t0 && p.t <= tEnd);
  if (!cand.length) return [];
  // 局部响度：前后 1.6 秒的强度均值
  const loud = cand.map((p, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - 24); j <= Math.min(cand.length - 1, i + 24); j++) { s += cand[j].s; n++; }
    return s / n;
  });
  let lmin = 9, lmax = -9;
  for (const v of loud) { if (v < lmin) lmin = v; if (v > lmax) lmax = v; }
  const lspan = Math.max(1e-3, lmax - lmin);
  // 全曲地板：最弱的那一档不要
  const q = D.tapQ == null ? 0.2 : D.tapQ;
  const ss = cand.map((p) => p.s).sort((a, b) => a - b);
  const gFloor = ss[Math.floor(q * (ss.length - 1))] * 0.7;
  const keep = [];
  let last = -9;
  for (let i = 0; i < cand.length; i++) {
    const p = cand[i];
    if (p.s < gFloor || p.s < loud[i] * 0.52) continue;
    const dyn = (loud[i] - lmin) / lspan;             // 0 安静 … 1 最响
    const gap = D.gap * (1.18 - 0.46 * dyn);
    if (p.t - last < gap) {
      // 挤在一起的：只有明显更强才顶掉前一个
      const prev = keep[keep.length - 1];
      if (prev && p.s > prev.s * 1.5) { keep[keep.length - 1] = p; last = p.t; }
      continue;
    }
    keep.push(p);
    last = p.t;
  }
  return keep;
}

/* ================================================================ 长条 */
// 长条只认一件事：这个音在音乐里真的拖住了（d 是包络量出来的秒数）。
// 拖够长的变成长按，短促的点一下。难度只调「留不留」和上限，不凭空造长条。
function decideHolds(notes, D, rnd) {
  const cap = Math.max(2, Math.round(notes.length * (D.holdCap == null ? 0.16 : D.holdCap)));
  const maxTail = D.maxTail == null ? 1.6 : D.maxTail;
  const pSustain = D.hold == null ? 0.8 : Math.min(1, D.hold / 0.55);
  const maxAt = D.holdAt == null ? 1 : D.holdAt;      // 同时最多几根长条
  const dblHold = D.dblHold || 0;                     // 配第二只手的比例
  let holds = 0;
  const active = [];
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    // 清掉已经收尾的。要求「上一根松手后再过 90ms」才算腾出手指：
    // 不然两根长条会在时间轴上叠一小段，实际得三根手指一起按
    for (let k = active.length - 1; k >= 0; k--) if (active[k] + 0.09 <= n.t) active.splice(k, 1);
    const gap = Math.max(n.dg || 0, i + 1 < notes.length ? notes[i + 1].t - n.t : 9);
    let want = 0, prob = 0;
    if (n.d >= 0.5) {
      want = clamp(n.d * 0.9, 0.4, maxTail);          // 长音长度贴着音乐走
      prob = pSustain;
      // 前后都在密集出音的地方，长条会把画面糊成一堵墙：降一半概率
      if (gap < 0.42) prob *= 0.5;
    } else if (n.d >= 0.34) {
      want = clamp(n.d * 0.85, 0.34, 0.7);
      prob = pSustain * 0.45;
    } else if (gap >= 0.8) {
      // 没有拖音但后面空了半秒以上：给一个短句尾长条（点缀）
      want = Math.min(0.75, gap * 0.6);
      prob = (D.hold || 0.3) * 0.4;
    }
    if (prob <= 0 || holds >= cap) continue;
    if (active.length >= maxAt) continue;             // 手指不够用了
    if (rnd() >= prob) continue;
    if (want < 0.32) continue;
    // 双长按：这道音在中低频都拖着（贝斯 + 人声/弦乐），就配第二只手一起按。
    // 第二根用同一条尾，落点在分轨时错开 3~5 格。
    let pair = false;
    if (dblHold > 0 && maxAt >= 2 && active.length + 2 <= maxAt) {
      const b = n.b || [1, 1, 1];
      const chordy = b[0] > 0.34 && b[1] > 0.36;
      const long = Math.min(1, (n.d - 0.5) / 0.7);
      const p2 = dblHold * (chordy ? 1.5 : 0.35) * Math.max(0, long);
      pair = p2 > 0 && rnd() < p2;
    }
    n.kind = 'hold';
    n.tail = n.t + want;
    active.push(n.tail);
    holds++;
    if (pair) {
      notes.splice(i + 1, 0, {
        t: n.t, lane: n.lane, kind: 'hold', tail: n.tail, s: n.s, duo: true,
        p: clamp((n.p == null ? 0.5 : n.p) + (rnd() < 0.5 ? -0.14 : 0.14), 0, 1),
        b: n.b,
      });
      active.push(n.tail);
      holds++;
      i++;                                            // 跳过刚插进来的伙伴
    }
  }
}

/* ================================================================ 分轨道 */
// 音区（p）决定落在哪一格：旋律往上走，音符往右移，读谱时能「听见」走向。
// 但音区本身不是均匀分布的（流行歌大半时间在中低音区），直接线性映射会
// 把谱面挤在中间两三格。所以先按音高排名做一次均匀化：把这一首用到的
// 音高按名次等分成九档，每档一格——顺序不变，九格都能用到。
//
// 光有「音高目标 + 步伐上限」是不够的：那等于让落点做一次随机游走，
// 走成一条钟形——中间三格堆满、最外两格整首摸不到（实测 240 音里最右一格
// 只有 2 下），而且走到哪停就在哪连着，同一格里能叠两三个长条。
// 所以现在每一步在「不越级」的候选里按代价挑：
//   · 离音高目标多远（保持旋律走向）；
//   · 这条轨已经用掉多少（超出当前应得份额就罚，九格才会都用上）；
//   · 刚才是不是刚用过（隔开同轨连按）；
//   · 这条轨刚收过一条长条就再也不给长条（长按冷却，免得一手连按三次）。
// 音高只是「倾向」，九格均衡和可读性优先。
function rankSpread(notes) {
  const n = notes.length;
  const idx = notes.map((q, i) => i);
  idx.sort((a, b) => {
    const pa = notes[a].p == null ? 0.5 : notes[a].p;
    const pb = notes[b].p == null ? 0.5 : notes[b].p;
    if (pa !== pb) return pa - pb;
    return a - b;                                   // 同音高按时间排，摊开
  });
  const out = new Array(n);
  for (let k = 0; k < n; k++) out[idx[k]] = n > 1 ? k / (n - 1) : 0.5;
  return out;
}

function assignLanes(notes, D, rnd) {
  const jump = D.jump == null ? 3 : D.jump;
  const ps = rankSpread(notes);
  const use = new Array(9).fill(0);           // 每条轨已经落了多少
  const lastAt = new Array(9).fill(-9);       // 上一次落点时间
  const holdCool = new Array(9).fill(-9);     // 这个时刻之前别再给长条
  const busy = new Array(9).fill(-9);         // 这条轨忙到这个时刻（长条按到尾）
  const holdCd = D.holdCd == null ? 1.7 : D.holdCd;   // 长按冷却（秒）
  let prev = 4, same = 0;

  const take = (n, l) => {
    n.lane = l;
    use[l]++;
    lastAt[l] = n.t;
    if (n.kind === 'hold') {
      holdCool[l] = n.tail + holdCd;
      busy[l] = n.tail + 0.06;
    } else busy[l] = n.t;
  };

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    // 双押 / 双长按的第二只：跟前一下隔 2 格以上（两只手分开，不打架），
    // 在同等的距离里挑「用得最少」的那条轨，别让某一条轨专收双押。
    if (n.duo) {
      let lane = -1, bestScore = 1e9;
      let cool = -1, coolScore = 1e9;
      for (let l = 0; l <= 8; l++) {
        if (n.t < busy[l] + 0.02) continue;
        const dist = Math.abs(l - prev);
        if (dist < 2) continue;
        let sc = dist + use[l] * 0.45;
        if (n.kind === 'hold') {
          if (holdCool[l] > n.t) sc += 3;
          else if (sc < coolScore) { coolScore = sc; cool = l; }
        }
        if (sc < bestScore) { bestScore = sc; lane = l; }
      }
      if (n.kind === 'hold' && cool >= 0) lane = cool;
      if (lane < 0) { n.kind = 'tap'; n.tail = 0; n.duo = false; continue; }
      take(n, lane);
      continue;
    }

    // 音高目标：按名次均匀铺开（0.15~7.85，两端留一点点余量不贴边）
    const tgt = 0.15 + ps[i] * 7.7;
    const fair = ((i + 1) / 9) * 1.08;        // 到这一下为止每条轨「应得」的量
    const lo0 = Math.max(0, prev - jump), hi0 = Math.min(8, prev + jump);
    let lane = -1, best = 1e9;
    let cool = -1, bestCool = 1e9;              // 没在冷却期的最佳候选（长条优先用它）
    // 候选先看「不跨级」的那一段；全被长条占着就逐圈放宽（谱面不能凭空少一个音）
    for (let span = 0; span <= 8 && lane < 0; span++) {
      for (let l = Math.max(0, lo0 - span); l <= Math.min(8, hi0 + span); l++) {
        if (n.t < busy[l] + 0.02) continue;
        let sc = Math.abs(l - tgt) * 0.9 + (l === prev ? 0.5 : 0) + span * 0.4;
        const over = use[l] - fair;
        if (over > 0) sc += over * 2.4;         // 用超了自己的份额：罚
        if (n.t - lastAt[l] < 0.33) sc += 1.1;  // 刚用过
        if (l === prev && same >= 2) sc += 1.6; // 同轨不许连着三下
        if (n.kind === 'hold') {
          if (holdCool[l] > n.t) sc += 4.5;     // 这条轨刚长按过
          else if (sc < bestCool) { bestCool = sc; cool = l; }
        }
        if (sc < best) { best = sc; lane = l; }
      }
    }
    // 长条优先落到「不在冷却期」的轨上：同一格连着两三个长按，手指根本没法换气。
    // 冷却期全满才退回普通评分（宁可连，也不能让这个音没落点）。
    if (n.kind === 'hold' && cool >= 0) lane = cool;
    if (lane < 0) {
      // 整条谱面九条轨全忙（理论上只有极端密集才会）：退回原地的最近空闲轨
      for (let k = 1; k <= 8 && lane < 0; k++) {
        for (const d2 of [-k, k]) {
          const l2 = prev + d2;
          if (l2 >= 0 && l2 <= 8 && n.t >= busy[l2] + 0.02) { lane = l2; break; }
        }
      }
      if (lane < 0) lane = clamp(Math.round(tgt), 0, 8);
    }
    same = lane === prev ? same + 1 : 0;
    prev = lane;
    take(n, lane);
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

/* ================================================================ 收尾：九格摊平 */
// 前面按份额罚分只能做到「大体匀」，短谱面（EASY 五十来个音）还是会漏下：
// 某一格整首没摸到、另一格却占了全曲一成半。这一步在生成完之后做微调，
// 每次只挪一个音，四条硬约束一条都不能破：
//   ① 目的格这个时刻空着（0.2 秒内没有别的音，也没有长条按着）；
//   ② 前后两个音到目的格都不超过 jump+1 格（一眼还能读出来）；
//   ③ 不把别的格子搬空（搬完不能比下限还少）；
//   ④ 长条搬过去之后，目的格前后冷却期里不能再有长条。
// 顺带把「同一格连着两条长条」也给拆开——这是玩家最容易骂的地方：
// 手指刚松、下一根长条又落在同一点上，根本没时间换手。
function tidyLanes(notes, D) {
  const n = notes.length;
  if (n < 27) return;
  const jump = (D.jump == null ? 3 : D.jump) + 1;
  const cd = D.holdCd == null ? 1.7 : D.holdCd;
  const seq = notes.slice().sort((a, b) => a.t - b.t || a.lane - b.lane);
  const avg = n / 9;
  const floor = Math.max(2, Math.round(avg * 0.4));
  const cap = Math.max(floor + 1, Math.round(avg * 1.45));

  let byLane = [];
  const rebuild = () => {
    byLane = [[], [], [], [], [], [], [], [], []];
    for (const x of seq) byLane[x.lane].push(x);
  };
  rebuild();

  const fits = (l, x, i) => {
    for (const m of byLane[l]) {
      if (m === x) continue;
      if (Math.abs(m.t - x.t) < 0.19) return false;
      if (m.kind === 'hold' && m.t <= x.t + 1e-6 && m.tail >= x.t - 0.02) return false;
      if (x.kind === 'hold' && m.t > x.t && m.t <= x.tail + 0.02) return false;
      // 长条的冷却按「上一根的尾音」算：两根长条起点隔得远、但中间几乎没空隙，
      // 手感一样是「刚松手又要按」。只看起点会让它们互相搬来搬去搬不完。
      if (x.kind === 'hold' && m.kind === 'hold') {
        if (m.t <= x.t && (m.tail || m.t) + cd > x.t) return false;
        if (m.t > x.t && x.tail + cd > m.t) return false;
      }
    }
    const pv = seq[i - 1], nx2 = seq[i + 1];
    if (pv && Math.abs(pv.lane - l) > jump) return false;
    if (nx2 && Math.abs(nx2.lane - l) > jump) return false;
    return true;
  };
  const move = (x, l) => { x.lane = l; rebuild(); };

  // ① 补闲置格
  for (let l = 0; l < 9; l++) {
    let guard = 0;
    while (byLane[l].length < floor && guard++ < 24) {
      let pick = -1, bestD = 99;
      for (let i = 0; i < seq.length; i++) {
        const x = seq[i];
        if (x.duo || x.lane === l) continue;
        if (byLane[x.lane].length <= floor) continue;
        if (!fits(l, x, i)) continue;
        const d = Math.abs(x.lane - l);
        if (d < bestD) { bestD = d; pick = i; }
      }
      if (pick < 0) break;
      move(seq[pick], l);
    }
  }
  // ② 削冒头：超过 cap 的格子往还欠账的格子里匀
  for (let l = 0; l < 9; l++) {
    let guard = 0;
    while (byLane[l].length > cap && guard++ < 48) {
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        .filter((k) => k !== l && byLane[k].length < avg)
        .sort((a, b) => byLane[a].length - byLane[b].length || Math.abs(a - l) - Math.abs(b - l));
      let done = false;
      for (const k of order) {
        for (let i = 0; i < seq.length && !done; i++) {
          const x = seq[i];
          if (x.lane !== l || x.duo) continue;
          if (!fits(k, x, i)) continue;
          move(x, k);
          done = true;
        }
        if (done) break;
      }
      if (!done) break;
    }
  }
  // ③ 拆同格连长条
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let l = 0; l < 9; l++) {
      const q = byLane[l];
      for (let i = 1; i < q.length; i++) {
        if (q[i].kind !== 'hold' || q[i - 1].kind !== 'hold') continue;
        const prevEnd = q[i - 1].tail || q[i - 1].t;
        if (q[i].t - prevEnd >= cd) continue;
        const x = q[i];
        const idx = seq.indexOf(x);
        let moved = false;
        for (const k of [l + 1, l - 1, l + 2, l - 2, l + 3, l - 3, l + 4, l - 4]) {
          if (k < 0 || k > 8) continue;
          if (!fits(k, x, idx)) continue;
          move(x, k);
          moved = true;
          changed = true;
          break;
        }
        // 九条轨全被人占着：降成单点。留着它只会让人「刚松手又要按」，
        // 长条本来就是点缀，少一条不影响曲子，手感坏一条却会毁掉整段。
        // 双长按的第二只要拆位置很难（另一手正按在同一条弧上），直接降成单点，
        // 这一下仍然是「两手一起下」，只是不用再按住而已。
        if (!moved && (x.duo || x.tail - x.t < 1.0)) {
          x.kind = 'tap';
          x.tail = 0;
          rebuild();
          changed = true;
        }
        break;                                  // 这一格改完重新扫（byLane 已重建）
      }
    }
    if (!changed) break;
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

/* ================================================================ 双押 */
// 两轨同时落 = 音乐里的强音。判据是这道重音「又响又宽」：
//   响（s 高）+ 低频和高频同时砸（底鼓叠镲、军鼓叠人声）。
// 不合条件的地方概率压得很低，所以副歌的强拍会成对出现、主歌基本单点。
// 落点选对侧 3~4 格——两只手分开按是最顺的，也是读谱最清楚的间距。
function addDoubles(notes, D, rnd) {
  if (D.dbl <= 0) return;
  // 按轨分组，判断「对侧那条轨这个时刻是不是空着」。
  // 以前用一条 busy[] 记「这条轨最晚到什么时候忙」，那是最晚值，
  // 于是每条轨看起来都永远是忙的，双押几乎全被挡掉。
  const byLane = [];
  for (let i = 0; i < 9; i++) byLane.push([]);
  for (const n of notes) byLane[n.lane].push(n);
  const freeAt = (lane, t) => {
    const q = byLane[lane];
    for (let i = 0; i < q.length; i++) {
      const m = q[i];
      if (m.t > t + 0.3) break;
      if (Math.abs(m.t - t) < 0.24) return false;
      if (m.kind === 'hold' && m.t < t && m.tail > t - 0.02) return false;
    }
    return true;
  };
  const extra = [];
  for (const n of notes) {
    if (n.kind !== 'tap' || n.duo) continue;
    const b = n.b || [0.34, 0.33, 0.33];
    const loud = n.s >= 0.78;
    const wide = b[0] > 0.3 && b[2] > 0.22;          // 低频和高频同时砸下去
    const p = D.dbl * (loud ? 2.0 : 0.5) * (wide ? 1.6 : 1);
    if (rnd() >= p) continue;
    const dir = n.lane <= 2 ? 1 : n.lane >= 6 ? -1 : (rnd() < 0.5 ? -1 : 1);
    for (const k of [3, 4, 5, 2]) {
      const l2 = n.lane + dir * k;
      if (l2 < 0 || l2 > 8) continue;
      if (!freeAt(l2, n.t)) continue;
      const twin = { t: n.t, lane: l2, kind: 'tap', tail: 0, s: n.s, b: n.b, duo: true };
      extra.push(twin);
      byLane[l2].push(twin);
      break;
    }
  }
  for (const x of extra) notes.push(x);
  if (extra.length) notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

/* ================================================================ 两条入口 */
// 原曲：onsets 来自 detectOnsets(buf, ...)，dur 是整首长度
export function chartFromOnsets(onsets, dur, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const t0 = Math.min(1.2, dur * 0.05);
  const picked = pickOnsets(onsets, D, t0, dur - 0.8);
  const notes = picked.map((p) => ({
    t: p.t, lane: 4, kind: 'tap', tail: 0, s: p.s, d: p.d, p: p.p, b: p.b,
  }));
  decideHolds(notes, D, rnd);
  assignLanes(notes, D, rnd);
  addDoubles(notes, D, rnd);
  tidyLanes(notes, D);
  return { notes, dur, src: 'audio' };
}

// 芯片改编：arr 是 songs.js arrange() 的产物
export function chartFromArr(arr, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const lead = D.lead;
  // 旋律音高范围按本曲实际用到的音拉满，免得整首挤在中间三格
  let mlo = 999, mhi = -999;
  for (const n of arr.notes) { if (n.m < mlo) mlo = n.m; if (n.m > mhi) mhi = n.m; }
  const mspan = Math.max(6, mhi - mlo);
  // 旋律音之间的空隙：乐句尾的空拍给一个短句尾长条，和原曲路线一个思路
  const mel = arr.notes.slice().sort((a, b) => a.t - b.t);
  const gapAfter = new Map();
  for (let i = 0; i < mel.length; i++) {
    gapAfter.set(mel[i], i + 1 < mel.length ? mel[i + 1].t - mel[i].t : 9);
  }
  const cand = arr.notes.map((n) => ({
    t: n.t, d: n.d, m: n.m, dg: gapAfter.get(n) || 0, b: [1, 1, 0.4],
    p: clamp((n.m - mlo) / mspan, 0, 1),
  }));
  if (D.pad > 0) {
    for (const dr of arr.drums) {
      if ((dr.k === 'k' || dr.k === 's') && rnd() < D.pad) {
        cand.push({ t: dr.t, d: 0, m: null, dg: 0, p: dr.k === 'k' ? 0.1 : 0.55, b: dr.k === 'k' ? [3, 1, 0.3] : [1, 2, 1.4] });
      }
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
      s: 0.5 + Math.min(0.5, c.d / 1.2), d: c.d, dg: c.dg, p: c.p, b: c.b,
    });
  }
  decideHolds(notes, D, rnd);
  assignLanes(notes, D, rnd);
  addDoubles(notes, D, rnd);
  tidyLanes(notes, D);
  return { notes, dur: arr.dur + lead + 1.1, src: 'chip' };
}
