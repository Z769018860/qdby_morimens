// 抽卡记录与「欧非」评估。
// 记录只留最近 GACHA_LOG_MAX 条（存档不能无限长），但统计用的是**聚合计数**，
// 所以「总抽数 / 出过几个创生 / 幸运指数」是全程累计的，不受记录裁剪影响。

export const GACHA_LOG_MAX = 300;

// 公示概率（与 game.js 的 pullOnce 基准一致：创生 3% / 史诗 37% / 精良 60%）
export const RARITY_RATE = { Genesis: 0.03, SSR: 0.37, SR: 0.6 };
// 估算「这一抽值多少」时用的权重：一个创生 ≈ 100，一个史诗 ≈ 18，一个精良 ≈ 1
export const RARITY_WORTH = { Genesis: 100, SSR: 18, SR: 1 };
export const EXPECTED_WORTH = Object.entries(RARITY_RATE).reduce((s, [k, p]) => s + p * RARITY_WORTH[k], 0); // 10.26

export const emptyGacha = () => ({
  log: [], agg: { pulls: 0, Genesis: 0, SSR: 0, SR: 0 }, best10: 0, best10at: 0, since: 0,
});

export function normalizeGacha(raw) {
  const out = emptyGacha();
  if (!raw || typeof raw !== 'object') return out;
  const agg = raw.agg || {};
  out.agg = {
    pulls: Math.max(0, Math.floor(agg.pulls || 0)),
    Genesis: Math.max(0, Math.floor(agg.Genesis || 0)),
    SSR: Math.max(0, Math.floor(agg.SSR || 0)),
    SR: Math.max(0, Math.floor(agg.SR || 0)),
  };
  out.log = Array.isArray(raw.log) ? raw.log.filter((x) => x && x.slug && x.rarity).slice(0, GACHA_LOG_MAX) : [];
  out.best10 = Math.max(0, Math.floor(raw.best10 || 0));
  out.best10at = raw.best10at || 0;
  out.since = raw.since || 0;
  return out;
}

export const gachaOf = (state) => (state.gacha ||= emptyGacha());

/** 记一抽。rec: { slug, rarity, isNew, dup, gold, star, banner, idx } */
export function recordPull(state, rec) {
  const g = gachaOf(state);
  g.agg.pulls++;
  if (g.agg[rec.rarity] != null) g.agg[rec.rarity]++;
  if (!g.since) g.since = rec.t || Date.now();
  g.log.unshift({
    seq: g.agg.pulls,
    t: rec.t || Date.now(),
    slug: rec.slug,
    rarity: rec.rarity,
    isNew: !!rec.isNew,
    dup: !!rec.dup,
    star: rec.star || 0,
    banner: rec.banner || 'ticket',
    idx: rec.idx || 0,
  });
  if (g.log.length > GACHA_LOG_MAX) g.log.length = GACHA_LOG_MAX;
  return g.log[0];
}

/** 十连成绩：一次十连里出了几个史诗以上，只记最好的那次 */
export function recordBatch(state, list) {
  if (!Array.isArray(list) || list.length < 10) return null;
  const hit = list.filter((p) => p.rarity !== 'SR').length;
  const g = gachaOf(state);
  if (hit > g.best10) { g.best10 = hit; g.best10at = Date.now(); return hit; }
  return null;
}

/* 幸运指数：实际拿到的「货值」÷ 按公示概率该拿到的货值 × 100。
   100 = 完全平均；抽得越多越难偏离，所以指数本身是公平的，不惩罚抽得多的人。 */
export function luckOf(state) {
  const a = gachaOf(state).agg;
  const n = a.pulls;
  const worth = a.Genesis * RARITY_WORTH.Genesis + a.SSR * RARITY_WORTH.SSR + a.SR * RARITY_WORTH.SR;
  const index = n > 0 ? Math.round((worth / (n * EXPECTED_WORTH)) * 100) : null;
  return {
    pulls: n,
    genesis: a.Genesis, ssr: a.SSR, sr: a.SR,
    worth, expected: Math.round(n * EXPECTED_WORTH),
    index,
    avgGenesis: a.Genesis > 0 ? n / a.Genesis : null,
    genesisRate: n > 0 ? a.Genesis / n : 0,
    tier: luckTier(index),
  };
}

export const LUCK_TIERS = [
  { min: 160, key: 'ssr', zh: '欧皇降临', desc: '这已经不是运气了，建议去买彩票。' },
  { min: 120, key: 'sr', zh: '血统纯正', desc: '明显高于平均，继续抽下去很赚。' },
  { min: 85, key: 'n', zh: '亚洲水平', desc: '不好不坏，符合公示概率。' },
  { min: 55, key: 'r', zh: '略显非气', desc: '比平均差一些，但还在正常波动范围内。' },
  { min: -Infinity, key: 'bad', zh: '非酋本酋', desc: '远低于平均，靠保底续命中。' },
];
export const luckTier = (index) => (index == null ? { min: null, key: 'none', zh: '暂无数据', desc: '还没有抽卡记录。' } : LUCK_TIERS.find((t) => index >= t.min));

// 面板上的条形：100 落在正中间，160 以上顶格
export const luckBarPct = (index) => (index == null ? 0 : Math.max(2, Math.min(100, (index / 160) * 100)));
