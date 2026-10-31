// 段位表与段内进度。
//
// 单独一个模块的原因：个人中心 / 排行榜要显示「这个分数是哪一段」，
// 于是 js/gamestats.js 也得引它，而 gamestats 被 account.js 带进了每一页。
// 对位表（rank.js 的 COUNTER）只在对战页用得上，不该跟着一起发到全站。
// 所以这里只放纯数据 + 三个纯函数。

// 九段。min 是进入该段所需的积分下限，t 是这一段的称号，c 是徽章配色。
export const TIERS = [
  { n: '见习守密人', t: '第一次翻开那份档案', min: 0, c: '#8b94a6' },
  { n: '档案室助手', t: '记得借出去的档案要还', min: 300, c: '#7ea2c8' },
  { n: '命轮学徒', t: '牌还没洗匀就想赢', min: 700, c: '#5fb3a1' },
  { n: '界域行者', t: '混沌、血肉、深海、超维都走过', min: 1200, c: '#57a6d8' },
  { n: '弥萨格巡夜人', t: '夜里替校猫把灯关掉', min: 1800, c: '#6f8ce0' },
  { n: '命轮师', t: '命轮肯听你把话说完', min: 2600, c: '#9b7ae0' },
  { n: '熵火司祭', t: '烧掉那些不该留着的记忆', min: 3600, c: '#e0894a' },
  { n: '忘念 · 唤醒者', t: '你先叫出了她们的名字', min: 4800, c: '#e0a94a' },
  { n: '唤醒王', t: '这一轮命轮由你来转', min: 6000, c: '#e0554a' },
];

export const TOP_RP = TIERS[TIERS.length - 1].min;

export const DIFF_TXT = { easy: '轻松', normal: '普通', hard: '认真' };

export function tierOf(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (v >= TIERS[k].min) i = k;
  return i;
}

// 这一段的进度：进了多少分、离下一段还差多少、百分比、以及段内的三颗小星。
// 到了最高段就没有「下一段」，进度条按满算。
export function progress(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  const idx = tierOf(v);
  const tier = TIERS[idx];
  const next = idx + 1 < TIERS.length ? TIERS[idx + 1] : null;
  const span = next ? next.min - tier.min : 1;
  const into = v - tier.min;
  const pct = next ? Math.max(0, Math.min(100, (into / span) * 100)) : 100;
  // 段内三颗星：刚进这一段就有一颗，走到三等分处点第二颗、再点第三颗
  const stars = next ? Math.min(3, Math.floor((into / span) * 3) + 1) : 3;
  return {
    rp: v, idx, tier, next, into, span, pct, stars,
    left: next ? Math.max(0, next.min - v) : 0,       // 还差多少分进下一段
  };
}
