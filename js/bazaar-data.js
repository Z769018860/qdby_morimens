// 《大巴扎：银钥》的数据层 —— 大表在 js/bazaar-gen.js（由 scripts/build_bazaar_gen.py 生成），
// 这里只放「规则常数」「地形」和「按难度拼出来的关卡排期」。
//
// 之所以分成两份：三百多 KB 的客户端表是生成物，别手改；难度、曲线、地形这些是设计，要能一眼看见。

import { HEROES as G_HEROES, ITEMS as G_ITEMS, WHEELS as G_WHEELS, PACTS as G_PACTS, FOES as G_FOES, SHEETS as G_SHEETS } from './bazaar-gen.js';

export const SHEETS = G_SHEETS;
// 唤醒体都要能出手打一下（以前只有「伤害型」会打，守护只架盾、辅助只挂易伤，整队站着不动）。
// 按「伤害型同产出的伤害 ≈ 产出 ×1.25 + 0.5」折算：守护打 4 成、辅助打 3 成——比命轮低得多，但不再是零。
// 生成表（bazaar-gen.js）是脚本生成物不手改，所以在这里统一补一层。
const heroAttack = (h) => 1.25 * h.gen + 0.5;
function withAttack(h) {
  if (h.act.some((a) => a.k === 'dmg')) return h;                      // 伤害型本来就有
  const k = h.typeKey === 'WARDEN' ? 0.4 : 0.3;
  const v = Math.round(heroAttack(h) * k * 10) / 10;
  return { ...h, act: [...h.act, { k: 'dmg', v }], txt: String(h.txt || '').replace(/。$/, '') + `，另外打出 ${v} 点伤害。` };
}
export const HEROES = G_HEROES.map(withAttack);
export const ITEMS = G_ITEMS;
export const WHEELS = G_WHEELS;
export const PACTS = G_PACTS;
export const FOES = G_FOES;
// 集市里能刷出来的只有普通造物：维度影像（r='FATE'）是唤醒体随身带的本命造物，不外售
export const SHOP_ITEMS = ITEMS.filter((x) => x.r !== 'FATE');

export const TUNING = {
  beats: 1000,        // 兜底上限（毒圈会让战斗在两三百拍内结束，实际碰不到）；真碰到才按剩余血量百分比判
  zoneFrom: 100,      // 第 100 拍之后出现「毒圈」：双方同时掉血（按各自最大生命的百分比）
  zoneStep: 0.0003,   // 毒圈按各自最大生命的比例掉：第 N 拍（N>100）双方各掉最大生命的 (N-100)×0.03%，无视护盾——第 150 拍每拍 1.5%，约 180 拍双方都撑不住
  beatMs: 480,        // 一拍的实际时长（×1/×2/×3 倍速）
  startHp: 130,
  startGold: 32,
  fieldSlots: 10,     // 战场十格
  draftSlots: 8,      // 开局只能带 8 格的（大约三个）
  wheelSlots: 3,      // 命轮槽
  relicSlots: 4,      // 造物槽
  cpuBase: 26,        // 算力上限（扩容前）
  coreCost: 6,        // 扩容一次的价格（每次 +3）
  coreGain: 5,        // 扩容一次加多少上限
  shopSize: 6,        // 集市一次摆几个选项（2 列 × 3 行）
  rerollCost: 1,      // 刷新一次的价钱（原来 2）：放宽一点，玩家才有钱多刷几次找想要的人 / 命轮
  benchSlots: 4,      // 仓库格数：装不下的人 / 命轮先放仓库，随时换上场或卖掉
  sellRate: 0.5,
  cdMin: 2,
  wcdMin: 3,
  // 每天的血量预算 / 目标强度 / 收入。以 12 天为基准调出来，后面按同一斜率外推。
  dayHp: [0, 104.4, 166.8, 224.8, 319.0, 442.2, 594.5, 710.5, 884.5, 1023.7, 1160.0, 1258.6, 1470.3, 1544.2, 1621.1, 1702.3, 1787.8, 1877.8, 1972.0],
  dayDps: [0, 3.4, 4.5, 5.5, 6.5, 7.0, 7.9, 8.5, 8.8, 9.3, 9.8, 9.9, 10.5, 10.9, 11.2, 11.6, 12.0, 12.3, 12.7],
  income: [0, 15, 15, 14, 13, 13, 13, 13, 13, 13, 13, 14, 15, 15, 16, 16, 17, 17, 18],
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
