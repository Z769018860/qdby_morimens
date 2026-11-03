// 《大巴扎：银钥》的**流派设计层**。
//
// js/bazaar-gen.js 是客户端数据的直译：73 个唤醒体只有三套数值（1 格产 3 / 2 格产 6 / 3 格产 10），
// 149 条命轮全是「直伤 + 一点毒或盾」，310 件造物只有 11 种属性。名字不同、打起来一模一样。
//
// 这一层负责把它们拆开：按「界域 × 类型」定 12 个流派，每个流派有自己的出手方式、光环和本命造物；
// 命轮按界域分到各自的机制族；造物按原表里的 arch 标签换成真正有区别的加成（吸血 / 穿透 / 反伤 / 减速…）。
// 生成表不手改，设计全在这里——改数值只改这个文件。

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

// 占格 → 产出 / 节拍 / 效果倍率。和原来的三档基座一致，只是现在由流派决定落在哪一档。
const TIER = {
  gen: [3, 6, 10],
  cd: [3, 4, 5],
  mul: [1, 1.85, 2.9],
};

// ---------------------------------------------------------------- 唤醒体流派
// 一个流派 = 一种打法：谁负责叠力量、谁负责下毒、谁负责把对面节拍拖慢。
// act(s) 里的 s 是占格倍率；光环按格数微调（大个子光环更强，但更贵、更占地方）。
export const ARCH = {
  // ---- 混沌：伤害走「越打越狠」，辅助走「算力过载」，防御走「焚身烫回去」
  berserk: {
    n: '狂乱', realm: 'CHAOS', type: 'ASSAULT', tag: '叠力量',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(4.25 * s) }, { k: 'str', v: r2(0.45 * s) }],
    aura: { k: 'pow', v: [0.24, 0.30, 0.38] },
    fate: { k: 'amp', v: 0.08 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，本场每次伤害 +${a[1].v}（可叠加）。`,
  },
  overload: {
    n: '过载', realm: 'CHAOS', type: 'CHORUS', tag: '榨算力',
    genOff: 1, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(1.75 * s), hits: 2 }],
    aura: { k: 'gen', v: [1, 1, 2] },
    fate: { k: 'gen', v: 0.08 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，并打出 ${a[0].v} 点伤害（2 段）。`,
  },
  burn: {
    n: '焚身', realm: 'CHAOS', type: 'WARDEN', tag: '灼烧',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6 * s) }, { k: 'burn', v: Math.round(1.5 * s) }],
    aura: { k: 'cd', v: [1, 1, 1] },
    fate: { k: 'amp', v: 0.07 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，架起 ${Math.round(a[0].v)} 点护盾，并给对手点上 ${a[1].v} 层灼烧。`,
  },

  // ---- 血肉：伤害吸血、辅助下毒、防御做盾墙
  leech: {
    n: '噬血', realm: 'CARO', type: 'ASSAULT', tag: '吸血',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(3.8 * s), leech: 0.35 }],
    aura: { k: 'gen', v: [1, 1, 1] },
    fate: { k: 'leech', v: 0.06 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，并把这发的 35% 吸回自己身上。`,
  },
  venom: {
    n: '蚀毒', realm: 'CARO', type: 'CHORUS', tag: '下毒',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'poison', v: Math.round(1.6 * s) }, { k: 'dmg', v: r1(1.1 * s) }],
    aura: { k: 'pow', v: [0.22, 0.28, 0.34] },
    fate: { k: 'venom', v: 0.12 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，施加 ${a[0].v} 层中毒，并补 ${a[1].v} 点伤害。`,
  },
  bulwark: {
    n: '血壁', realm: 'CARO', type: 'WARDEN', tag: '护盾',
    genOff: -1, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6.5 * s) }, { k: 'dmg', v: r1(1.2 * s) }],
    aura: { k: 'cd', v: [1, 1, 1] },
    fate: { k: 'shcap', v: 8 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，架起 ${Math.round(a[0].v)} 点护盾，并撞出 ${a[1].v} 点伤害。`,
  },

  // ---- 深海：伤害走多段碎击、辅助回血、防御拖节拍
  frost: {
    n: '霜刃', realm: 'AEQUOR', type: 'ASSAULT', tag: '多段',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(2.25 * s), hits: 2 }],
    aura: { k: 'pow', v: [0.22, 0.26, 0.32] },
    fate: { k: 'crit', v: 0.04 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，碎击两次、共 ${a[0].v} 点伤害。`,
  },
  tide: {
    n: '涌泉', realm: 'AEQUOR', type: 'CHORUS', tag: '续航',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'heal', v: r1(3.2 * s) }, { k: 'shield', v: r1(3.6 * s) }],
    aura: { k: 'gen', v: [1, 1, 1] },
    fate: { k: 'regen', v: 1.5 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，回复 ${Math.round(a[0].v)} 点生命，并架起 ${Math.round(a[1].v)} 点护盾。`,
  },
  slowtide: {
    n: '滞潮', realm: 'AEQUOR', type: 'WARDEN', tag: '拖节拍',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'dmg', v: r1(1.6 * s) }, { k: 'slow', v: r2(0.4 * s) }],
    aura: { k: 'cd', v: [1, 1, 1] },
    fate: { k: 'fear', v: 0.05 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，并让对手的技能延后 ${a[1].v} 拍。`,
  },

  // ---- 超维：辅助放大易伤、伤害走处决、防御折跃穿盾
  vuln: {
    n: '虚隙', realm: 'ULTRA', type: 'CHORUS', tag: '易伤',
    genOff: 1, cdOff: 0,
    act: (s) => [{ k: 'vuln', v: r2(0.07 * s) }, { k: 'dmg', v: r1(0.9 * s) }],
    aura: { k: 'pow', v: [0.24, 0.30, 0.36] },
    fate: { k: 'amp', v: 0.06 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，让对手易伤 +${Math.round(a[0].v * 100)}%（3 拍），并补 ${a[1].v} 点伤害。`,
  },
  haste: {
    n: '速律', realm: 'ULTRA', type: 'ASSAULT', tag: '快节拍',
    genOff: -1, cdOff: -1,
    act: (s) => [{ k: 'dmg', v: r1(2.85 * s) }, { k: 'str', v: r2(0.2 * s) }],
    aura: { k: 'cd', v: [1, 1, 1] },
    fate: { k: 'crit', v: 0.04 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，造成 ${a[0].v} 点伤害，本场每次伤害 +${a[1].v}。节拍比别人快一拍。`,
  },
  phase: {
    n: '折跃', realm: 'ULTRA', type: 'WARDEN', tag: '穿盾',
    genOff: 0, cdOff: 0,
    act: (s) => [{ k: 'shield', v: r1(6 * s) }, { k: 'dmg', v: r1(1.5 * s), pierce: 1 }],
    aura: { k: 'pow', v: [0.18, 0.22, 0.28] },
    fate: { k: 'pierce', v: 0.15 },
    txt: (g, cd, a) => `每 ${cd} 拍：产出 ${g} 算力，架起 ${Math.round(a[0].v)} 点护盾，并穿过护盾打出 ${a[1].v} 点伤害。`,
  },
};

// 界域特性：同一个界域的人凑得越多，共鸣越强（2 / 3 / 4 人三档）。
// 这是「开本界域的店、一队人全买同一界域」的回报，也是四套体系的性格：
// 混沌靠成长滚雪球，血肉靠持续伤害磨，深海靠回复拖，超维靠直伤穿盾。
export const REALM_TRAIT = {
  CHAOS: { n: '成长', k: 'amp', v: [0.08, 0.15, 0.22],
    txt: '全队造成的伤害 +8% / 15% / 22%（同界域 2 / 3 / 4 人）' },
  CARO: { n: '持续伤害', k: 'dot', v: [0.25, 0.45, 0.65],
    txt: '中毒与灼烧 +25% / 45% / 65%（同界域 2 / 3 / 4 人）' },
  AEQUOR: { n: '回复', k: 'heal', v: [0.2, 0.35, 0.5],
    txt: '治疗 +20% / 35% / 50%，每次治疗附带 4 点护盾（同界域 2 / 3 / 4 人）' },
  ULTRA: { n: '直伤', k: 'burst', v: [0.1, 0.18, 0.26],
    txt: '直伤 +10% / 18% / 26%，并穿透 8% / 14% / 20% 护盾（同界域 2 / 3 / 4 人）' },
};

// 界域 × 类型 → 流派。（十二格刚好十二个流派，老角色的定位不会被推翻）
const CELL = {
  CHAOS: { ASSAULT: 'berserk', CHORUS: 'overload', WARDEN: 'burn' },
  CARO: { ASSAULT: 'leech', CHORUS: 'venom', WARDEN: 'bulwark' },
  AEQUOR: { ASSAULT: 'frost', CHORUS: 'tide', WARDEN: 'slowtide' },
  ULTRA: { ASSAULT: 'haste', CHORUS: 'vuln', WARDEN: 'phase' },
};

export const ARCH_ZH = Object.entries(ARCH).reduce((a, [id, d]) => {
  a[id] = d.n;
  return a;
}, {});

// 占格：防御型撑 2~3 格，辅助多为 1~2 格，伤害型 1~3 格都有人——
// 十五格里怎么搭、是先上大件还是铺一地小件，变成真正的选择。
function tierFor(arch, i) {
  if (arch.type === 'WARDEN') return i % 2 ? 2 : 3;
  if (arch.type === 'CHORUS') return i % 3 === 0 ? 2 : 1;
  return 1 + (i % 3);
}

export function designHeroes(heroes) {
  const seen = {};
  return heroes.map((h) => {
    const cell = CELL[h.realm] || CELL.CHAOS;
    const id = cell[h.typeKey] || 'berserk';
    const arch = ARCH[id];
    const i = (seen[id] = (seen[id] || 0) + 1) - 1;
    const t = tierFor(arch, i);
    const s = TIER.mul[t - 1];
    const gen = Math.max(1, TIER.gen[t - 1] + arch.genOff);
    const cd = Math.max(2, TIER.cd[t - 1] + arch.cdOff);
    const act = arch.act(s);
    const av = arch.aura.v[t - 1];
    const auraTxt = arch.aura.k === 'gen' ? `相邻单位每次多产 ${av} 算力`
      : arch.aura.k === 'cd' ? `相邻单位的节拍 -${av}`
        : `相邻单位的动作效果 +${Math.round(av * 100)}%`;
    return {
      ...h,
      arch: id,
      archZh: arch.n,
      type: h.type,
      slots: t,
      gen,
      cd,
      act,
      txt: arch.txt(gen, cd, act),
      aura: { k: arch.aura.k, v: av },
      auraTxt,
      fate: { ...h.fate, k: arch.fate.k, v: arch.fate.v },
    };
  });
}

// ---------------------------------------------------------------- 命轮机制族
// 每条命轮按界域分到三四个机制族里：同样是「花算力换伤害」，但毒 / 灼烧 / 穿盾 / 回响 / 叠力量
// 在长局里的曲线完全不同，配谁上场、先买哪条，就是流派。
export const WARCH = {
  burst: { n: '直伤', op: (s) => [{ k: 'dmg', v: r1(18 * s) }], cpu: 22, wcd: 5 },
  multi: { n: '霜刃', op: (s) => [{ k: 'dmg', v: r1(5 * s), hits: 4 }], cpu: 21, wcd: 5 },
  venom: { n: '蚀毒', op: (s) => [{ k: 'dmg', v: r1(8.5 * s) }, { k: 'poison', v: Math.round(3 * s) }], cpu: 21, wcd: 5 },
  burn: { n: '焚身', op: (s) => [{ k: 'dmg', v: r1(7 * s) }, { k: 'burn', v: Math.round(3.2 * s) }], cpu: 21, wcd: 5 },
  leech: { n: '噬血', op: (s) => [{ k: 'dmg', v: r1(14 * s), leech: 0.4 }], cpu: 21, wcd: 5 },
  execute: { n: '处决', op: (s) => [{ k: 'dmg', v: r1(15 * s), execute: 0.45 }], cpu: 22, wcd: 5 },
  pierce: { n: '折跃', op: (s) => [{ k: 'dmg', v: r1(13.5 * s), pierce: 1 }], cpu: 22, wcd: 5 },
  slow: { n: '滞潮', op: (s) => [{ k: 'dmg', v: r1(10 * s) }, { k: 'slow', v: 1 }], cpu: 20, wcd: 5 },
  vuln: { n: '虚隙', op: (s) => [{ k: 'dmg', v: r1(9 * s) }, { k: 'vuln', v: r2(0.22 * s) }], cpu: 20, wcd: 5 },
  str: { n: '蓄势', op: (s) => [{ k: 'dmg', v: r1(9 * s) }, { k: 'str', v: r2(1.1 * s) }], cpu: 20, wcd: 5 },
  bulwark: { n: '血壁', op: (s) => [{ k: 'shield', v: r1(24 * s) }, { k: 'dmg', v: r1(6 * s) }], cpu: 19, wcd: 5 },
  echo: { n: '回响', op: (s) => [{ k: 'dmg', v: r1(11 * s) }, { k: 'echo', v: 1 }], cpu: 23, wcd: 6 },
  tide: { n: '涌泉', op: (s) => [{ k: 'shield', v: r1(14 * s) }, { k: 'heal', v: r1(10 * s) }, { k: 'dmg', v: r1(6 * s) }], cpu: 20, wcd: 5 },
};

const WPOOL = {
  CHAOS: ['str', 'burn', 'execute', 'burst'],
  CARO: ['venom', 'leech', 'bulwark'],
  AEQUOR: ['slow', 'multi', 'tide'],
  ULTRA: ['vuln', 'pierce', 'echo'],
};
const WNEUTRAL = ['burst', 'multi', 'venom', 'burn', 'execute', 'pierce', 'slow', 'leech'];
const RAR_S = { N: 0.88, SR: 1, SSR: 1.12 };

export function designWheels(wheels) {
  const seen = {};
  return wheels.map((w) => {
    const pool = WPOOL[w.realm] || WNEUTRAL;
    const i = (seen[w.realm || 'NEUTRAL'] = (seen[w.realm || 'NEUTRAL'] || 0) + 1) - 1;
    const id = pool[i % pool.length];
    const d = WARCH[id];
    const s = RAR_S[w.r] || 1;
    return { ...w, arch: id, archZh: d.n, cpu: d.cpu, wcd: d.wcd, op: d.op(s) };
  });
}

// ---------------------------------------------------------------- 造物加成
// 原来 310 件造物只有 11 种属性（伤害 / 暴击 / 上限…），同质化最严重的一层。
// 现在按原表的 arch 标签分发到「吸血 / 穿透 / 反伤 / 减速 / 每拍护盾 / 生命」这些真正有区别的机制上。
const INT_KEY = { flat: 1, shcap: 1, ward: 1, regen: 1, gold: 1, cap: 1, thorns: 1, hp: 1, wcd: 1 };
const ITEM_TABLE = {
  dmg: [['amp', 0.075], ['flat', 5.5], ['crit', 0.045]],
  str: [['flat', 6.5], ['amp', 0.06]],
  crit: [['crit', 0.055], ['cdmg', 0.18]],
  poison: [['venom', 0.18], ['amp', 0.06]],
  burn: [['amp', 0.07], ['flat', 5]],
  vuln: [['amp', 0.07], ['pierce', 0.18]],
  shield: [['shcap', 9], ['ward', 3]],
  heal: [['regen', 1.2], ['hp', 16]],
  regen: [['regen', 1.4], ['hp', 14]],
  gold: [['gold', 1.6]],
  haste: [['wcd', 1]],
  slow: [['fear', 0.06], ['hp', 14]],
  thorns: [['thorns', 3]],
  aura: [['cap', 8], ['gen', 0.06]],
};
const RAR_M = { N: 0.8, SR: 1, SSR: 1.2 };

export function designItems(items) {
  const seen = {};
  return items.map((it) => {
    const tab = ITEM_TABLE[it.arch];
    if (!tab) return it;                                   // 本命造物（FATE）不动
    const i = (seen[it.arch] = (seen[it.arch] || 0) + 1) - 1;
    const [k, base] = tab[i % tab.length];
    const m = RAR_M[it.r] || 1;
    const v = INT_KEY[k] ? Math.max(1, Math.round(base * m)) : r2(base * m);
    return { ...it, m: { k, v } };
  });
}
