// 段位表与段内进度。
//
// 单独一个模块的原因：个人中心 / 排行榜要显示「这个分数是哪一段」，
// 于是 js/gamestats.js 也得引它，而 gamestats 被 account.js 带进了每一页。
// 对位表（rank.js 的 COUNTER）只在对战页用得上，不该跟着一起发到全站。
// 所以这里只放纯数据 + 三个纯函数。

// 九段。min 是进入该段所需的积分下限，t 是这一段的称号，c 是徽章配色。
//
// 命名走游戏王那套「段位阶梯」：第 2~5 段用信物的成色往上走（铜钥 → 银钥 → 金印 → 白夜），
// 后四段换成职阶（命轮师 → 界域传说 → 唤醒大师 → 唤醒王），顶端是王者。
// 铜钥 / 银钥 / 黑印（金印）/ 白夜 / 界域都是原作里就有的东西，别随便换成别的词。
export const TIERS = [
  { n: '见习守密人', t: '第一次翻开那份档案', min: 0, c: '#8b94a6' },
  { n: '铜钥级', t: '匙环上挂着自己的第一枚钥匙', min: 300, c: '#b57a4f' },
  { n: '银钥级', t: '银钥充能够转得动一次命轮', min: 700, c: '#8294ab' },
  { n: '金印级', t: '掌心被刻印烫出一个记号', min: 1200, c: '#d8a93f' },
  { n: '白夜级', t: '见过白夜，人还清醒', min: 1800, c: '#7fa9d8' },
  { n: '命轮师', t: '命轮肯听你把话说完', min: 2600, c: '#8a7ce0' },
  { n: '界域传说', t: '四个界域都记得你的名字', min: 3600, c: '#b06fd0' },
  { n: '唤醒大师', t: '不用叫，她们自己就醒了', min: 4800, c: '#e0894a' },
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
