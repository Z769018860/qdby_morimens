// 《大巴扎：银钥》的数据层 —— 大表在 js/bazaar-gen.js（由 scripts/build_bazaar_gen.py 生成），
// 这里只放「规则常数」「地形」和「按难度拼出来的关卡排期」。
//
// 之所以分成两份：三百多 KB 的客户端表是生成物，别手改；难度、曲线、地形这些是设计，要能一眼看见。

import { HEROES as G_HEROES, ITEMS as G_ITEMS, WHEELS as G_WHEELS, PACTS as G_PACTS, FOES as G_FOES, SHEETS as G_SHEETS } from './bazaar-gen.js';

export const SHEETS = G_SHEETS;
export const HEROES = G_HEROES;
export const ITEMS = G_ITEMS;
export const WHEELS = G_WHEELS;
export const PACTS = G_PACTS;
export const FOES = G_FOES;
// 集市里能刷出来的只有普通造物：维度影像（r='FATE'）是唤醒体随身带的本命造物，不外售
export const SHOP_ITEMS = ITEMS.filter((x) => x.r !== 'FATE');

export const TUNING = {
  beats: 40,          // 每场固定 40 拍
  beatMs: 480,        // 一拍的实际时长（×1/×2/×3 倍速）
  startHp: 130,
  startGold: 60,
  fieldSlots: 10,     // 战场十格
  draftSlots: 8,      // 开局只能带 8 格的（大约三个）
  wheelSlots: 3,      // 命轮槽
  relicSlots: 4,      // 造物槽
  cpuBase: 26,        // 算力上限（扩容前）
  coreCost: 6,        // 扩容一次的价格（每次 +3）
  coreGain: 5,        // 扩容一次加多少上限
  rerollCost: 2,
  sellRate: 0.5,
  cdMin: 2,
  wcdMin: 3,
  // 每天的血量预算 / 目标强度 / 收入。以 12 天为基准调出来，后面按同一斜率外推。
  dayHp: [0, 123, 176, 206, 272, 362, 458, 520, 630, 706, 800, 868, 1014, 1065, 1118, 1174, 1233, 1295, 1360],
  dayDps: [0, 4.5, 5.4, 5.9, 6.0, 6.0, 6.8, 7.2, 7.2, 7.6, 8.0, 8.1, 8.6, 8.9, 9.2, 9.5, 9.8, 10.1, 10.4],
  income: [0, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 14, 14, 15, 15, 16, 16, 17],
};

// 四档难度：dps/hp 是乘在每天曲线上的，sane 是理智，pole 越大强敌来得越早
export const DIFFS = [
  { id: 'normal', n: '寻常', days: 12, dps: 1.0, hp: 1.0, income: 1.0, sane: 3, pole: 0,
    desc: '12 天，3 点理智。前四天只有普通怪，首领从第九天开始露面。' },
  { id: 'hard', n: '艰难', days: 12, dps: 1.02, hp: 1.0, income: 1.0, sane: 2, pole: 1,
    desc: '12 天，2 点理智。精英提前到第三天，第七天就有首领。' },
  { id: 'nightmare', n: '噩梦', days: 15, dps: 0.95, hp: 0.96, income: 0.92, sane: 2, pole: 1.5,
    desc: '15 天，2 点理智，收入 -8%。第二天起就会撞上精英。' },
  { id: 'abyss', n: '深渊', days: 18, dps: 0.94, hp: 0.94, income: 0.82, sane: 2, pole: 2,
    desc: '18 天，2 点理智，收入 -18%。精英从第三天就露头，第十天之后全是首领。' },
];

export const REALM_ZH = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' };
export const TYPE_ZH = { ASSAULT: '伤害', CHORUS: '辅助', WARDEN: '防御' };
export const RANK_ZH = { normal: '普通', elite: '精英', boss: '首领' };
export const REALM_COLOR = { 混沌: '#c4708f', 血肉: '#b8873f', 深海: '#4f9bb5', 超维: '#8f7fc4' };

export const ARCH_ZH = {
  dmg: '直伤', poison: '中毒', burn: '灼烧', shield: '护盾', heal: '回复', gold: '金币',
  crit: '暴击', haste: '节拍', regen: '回血', slow: '滞缓', vuln: '易伤', aura: '光环',
  str: '力量', thorns: '反伤', fate: '本命',
};

// 造物加成 → 文案（数值带符号，前端只负责贴上去）
export const MOD_ZH = {
  cap: ['算力上限', '+', ''],
  gen: ['算力产出', '+', '%'],
  amp: ['命轮伤害', '+', '%'],
  crit: ['暴击率', '+', '%'],
  cdmg: ['暴击伤害', '+', '%'],
  shcap: ['护盾上限', '+', ''],
  regen: ['每拍回复', '+', ''],
  start: ['开战算力', '+', ''],
  wcd: ['命轮节拍', '-', ' 拍'],
  thorns: ['反伤', '+', ''],
  gold: ['每场金币', '+', ''],
};

export const AURA_ZH = { gen: '供能', cd: '加速', pow: '增幅' };

// ---------------------------------------------------------------- 地形
// 对双方同时生效：敌我都在同一片地上打，所以没有「只坑玩家」的地形。
export const TERRAINS = [
  { id: 'plain', n: '平常', txt: '没有额外地形。' },
  { id: 'amp', n: '共鸣', txt: '双方造成的伤害 +20%。', k: 'amp', v: 0.2 },
  { id: 'drain', n: '熔岩', txt: '每 3 拍，双方各受 7 点伤害（无视护盾）。', k: 'drain', v: 7, every: 3 },
  { id: 'slow', n: '迟滞', txt: '双方所有技能节拍 +1（唤醒体、命轮、怪物）。', k: 'slow', v: 1 },
  { id: 'thorns', n: '荆棘', txt: '双方受到伤害时反弹 3 点。', k: 'thorns', v: 3 },
  { id: 'mist', n: '雾障', txt: '每 3 拍，双方各得 9 点护盾。', k: 'shield', v: 9, every: 3 },
  { id: 'spring', n: '涌泉', txt: '每 3 拍，双方各回复 7 点生命。', k: 'heal', v: 7, every: 3 },
  { id: 'brittle', n: '脆裂', txt: '双方生命上限 -12%；同理，对面也更好杀。', k: 'hp', v: -0.12 },
  { id: 'gale', n: '疾风', txt: '双方技能节拍 -1（最低 2 拍）。', k: 'fast', v: 1 },
];

// ---------------------------------------------------------------- 关卡排期
// 按「第几天 + 难度推移」决定这一天的对手等级配比，再从该等级里随机抽一只。
function bandOf(day, pole) {
  // 强敌提前的幅度也按天渐入：第一天不该直接撞精英，否则高难度开局就没得玩。
  const d = day + pole * 1.6 * Math.min(1, (day - 1) / 3);
  if (d <= 3.2) return ['normal'];
  if (d <= 5.5) return ['normal', 'normal', 'elite'];
  if (d <= 8.5) return ['normal', 'elite', 'elite'];
  if (d <= 11.5) return ['elite', 'elite', 'boss'];
  if (d <= 14.5) return ['elite', 'boss', 'boss'];
  return ['boss', 'boss', 'boss'];
}

const BY_RANK = { normal: [], elite: [], boss: [] };
for (const f of FOES) (BY_RANK[f.rank] || BY_RANK.normal).push(f.id);

function buildSchedule() {
  const out = [];
  const maxDays = Math.max(...DIFFS.map((d) => d.days));
  for (let day = 1; day <= maxDays; day++) {
    const bands = {};
    for (const diff of DIFFS) {
      const ranks = bandOf(day, diff.pole);
      const pool = [];
      for (const r of ranks) for (const id of BY_RANK[r]) if (pool.indexOf(id) < 0) pool.push(id);
      bands[diff.id] = { ranks, pool, boss: ranks.indexOf('boss') >= 0 };
    }
    out.push({ day, bands });
  }
  return out;
}

export const SCHEDULE = buildSchedule();

// 某一天、某难度用哪一排
export function rowFor(day, diffId) {
  const row = SCHEDULE[Math.min(day, SCHEDULE.length) - 1] || SCHEDULE[SCHEDULE.length - 1];
  return row.bands[diffId] || row.bands.normal;
}
