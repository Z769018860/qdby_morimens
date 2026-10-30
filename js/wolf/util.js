// 弥萨格狼人杀：公用小工具
//
// 这里只放与规则无关的东西：可复现的随机数、洗牌、按 id 找人。
// 引擎、AI、界面都从这里取，避免互相 import 出环。

// 32 位整数散列：同一个种子 + 同一组参数 → 永远同一个 0~1 的数。
// 判断「谁看起来可疑」时用它做各人的偏见，这样同一个 AI 不会一天一个说法。
export function hash01(a, b, c, d) {
  let h = 2166136261 >>> 0;
  const mix = (v) => {
    h ^= v >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
  };
  mix(a); mix(b); mix(c); mix(d);
  return (h >>> 8) / 16777216;
}

// mulberry32：短、够用、能复现
export function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

// 按权重挑一个（权重 <= 0 的不会被挑到）
export function weighted(arr, weightOf, rnd) {
  let total = 0;
  for (const x of arr) total += Math.max(0, weightOf(x));
  if (total <= 0) return arr.length ? arr[0] : null;
  let r = rnd() * total;
  for (const x of arr) {
    r -= Math.max(0, weightOf(x));
    if (r <= 0) return x;
  }
  return arr[arr.length - 1];
}

export const alive = (G) => G.players.filter((p) => p.alive);
export const byId = (G, id) => G.players.find((p) => String(p.id) === String(id)) || null;
export const nameOf = (G, id) => {
  const p = byId(G, id);
  return p ? p.name : '某人';
};
