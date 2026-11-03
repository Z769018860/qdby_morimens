// 《大巴扎：银钥》的数据层 —— 大表在 js/bazaar-gen.js（由 scripts/build_bazaar_gen.py 生成），
// 这里只放「规则常数」「地形」和「按难度拼出来的关卡排期」。
//
// 之所以分成两份：三百多 KB 的客户端表是生成物，别手改；难度、曲线、地形这些是设计，要能一眼看见。

import { HEROES as G_HEROES, ITEMS as G_ITEMS, WHEELS as G_WHEELS, PACTS as G_PACTS, FOES as G_FOES, SHEETS as G_SHEETS } from './bazaar-gen.js';
import { designHeroes, designWheels, designItems, ARCH as ARCH_RAW, ARCH_ZH as ARCH_ZH_RAW, WARCH as WARCH_RAW, REALM_TRAIT as REALM_TRAIT_RAW } from './bazaar-arch.js';

export const SHEETS = G_SHEETS;
// 流派（设计层，见 js/bazaar-arch.js）：唤醒体 12 个、命轮 13 个机制族、造物按机制分。
export const ARCH = ARCH_RAW;
export const WARCH = WARCH_RAW;
export const ARCH_ZH = ARCH_ZH_RAW;
// 界域特性：同界域 2 / 3 / 4 人三档共鸣
export const REALM_TRAIT = REALM_TRAIT_RAW;
// 启灵档位：抓到同名唤醒体 / 同一条命轮就往上升一档
export const RANK_TIER = ['', '1 启', '2 启', '3 启', '超限', '最终法则'];
// 唤醒体、命轮、造物都要经过流派设计层：生成表里 73 个人只有 3 套数值、149 条命轮只有
// 「直伤 + 一点毒或盾」，不拆开的话名字换一百遍打起来还是同一套。设计全在 js/bazaar-arch.js。
export const HEROES = designHeroes(G_HEROES);
export const ITEMS = designItems(G_ITEMS);
export const WHEELS = designWheels(G_WHEELS);
// 原有 21 条密契大多是「某项数值 +X%」，差别只在数字。这里补 8 条机制型的，
// 让「开局选哪份密契」真的会改变这一局的打法。
const EXTRA_PACTS = [
  { id: 'p022', n: '蚀刻', spr: 'item:326', k: 'dotamp', v: 0.6, txt: '中毒与冻伤 +60%，但生命上限 -15。' },
  { id: 'p023', n: '狙击', spr: 'item:327', k: 'snipe', v: 0.3, txt: '命轮伤害 30% 穿透护盾——对面越爱架盾越吃亏。' },
  { id: 'p024', n: '缓毒', spr: 'item:328', k: 'zone', v: 50, txt: '毒圈晚 50 拍出现（第 150 拍起），慢热卡组多一段发育时间。' },
  { id: 'p025', n: '苔生', spr: 'item:329', k: 'mossregen', v: 2, txt: '每拍回复 2 点生命。' },
  { id: 'p026', n: '行囊', spr: 'item:330', k: 'bench', v: 2, txt: '仓库 +2 格，换阵容不用卖东西。' },
  { id: 'p027', n: '早启', spr: 'item:331', k: 'rank', v: 1, txt: '开局每个唤醒体与命轮都算 +1 启灵。' },
  { id: 'p028', n: '疾行', spr: 'item:332', k: 'herocd', v: 1, txt: '所有唤醒体的节拍 -1（最低 2 拍）。' },
  { id: 'p029', n: '双刃', spr: 'item:333', k: 'twoedge', v: 0.3, txt: '命轮伤害 +30%，但你受到的伤害也多 15%。' },
];
export const PACTS = G_PACTS.concat(EXTRA_PACTS);
export const FOES = G_FOES;
// 集市里能刷出来的只有普通造物：维度影像（r='FATE'）是唤醒体随身带的本命造物，不外售
export const SHOP_ITEMS = ITEMS.filter((x) => x.r !== 'FATE');

// 原始敌人曲线（12 天基准）。
const RAW_DAY_HP = [0, 104.4, 166.8, 224.8, 319.0, 442.2, 594.5, 710.5, 884.5, 1023.7, 1160.0, 1258.6, 1470.3, 1544.2, 1621.1, 1702.3, 1787.8, 1877.8, 1972.0];
const RAW_DAY_DPS = [0, 3.4, 4.5, 5.5, 6.5, 7.0, 7.9, 8.5, 8.8, 9.3, 9.8, 9.9, 10.5, 10.9, 11.2, 11.6, 12.0, 12.3, 12.7];

// 唤醒体拆成流派之后，玩家的成长曲线比原来陡得多（毒 / 灼烧会叠、力量越滚越高、穿盾不吃护盾、
// 回响一发两响），敌人如果还按老曲线走，第十天以后基本是走个过场。
// 所以第六天起把差距补回来：前五天完全不动（开局本来就是抛硬币，再抬难度就只剩运气），
// 第 6~7 天每天补一截，之后按满额走。
function LATE_SCALE(arr, x) {
  return arr.map((v, i) => Math.round(v * (1 + (x - 1) * Math.min(1, i / 6)) * 10) / 10);
}

export const TUNING = {
  beats: 1000,        // 兜底上限（毒圈会让战斗在两三百拍内结束，实际碰不到）；真碰到才按剩余血量百分比判
  zoneFrom: 100,      // 第 100 拍之后出现「毒圈」：双方同时掉血（按各自最大生命的百分比）
  zoneStep: 0.0003,   // 毒圈按各自最大生命的比例掉：第 N 拍（N>100）双方各掉最大生命的 (N-100)×0.03%，无视护盾——第 150 拍每拍 1.5%，约 180 拍双方都撑不住
  beatMs: 480,        // 一拍的实际时长（×1/×2/×3 倍速）
  startHp: 130,
  startGold: 32,
  fieldSlots: 15,     // 战场十五格：唤醒体（1~3 格）和命轮（1~2 格）共用，可以互相拖动换位
  draftSlots: 8,      // 开局只能带 8 格的（大约三个）
  relicSlots: 4,      // 造物槽
  cpuBase: 26,        // 算力上限（扩容前）
  coreCost: 6,        // 扩容一次的价格（每次 +3）
  coreGain: 5,        // 扩容一次加多少上限
  shopSize: 6,        // 集市一次摆几个选项（2 列 × 3 行）
  rerollCost: 1,      // 刷新一次的价钱（原来 2）：放宽一点，玩家才有钱多刷几次找想要的人 / 命轮
  benchSlots: 4,      // 仓库格数：装不下的人 / 命轮先放仓库，随时换上场或卖掉
  rankMax: 5,         // 启灵上限：1/2/3 启 → 超限 → 最终法则
  dupRate: 0.45,      // 集市多摆一个「升启」摊位的概率（买下就是把已有的那张往上顶一档，不占格）
  realmShopCost: 1,   // 一天里第二次以后换界域商店的价钱
  sellRate: 0.5,
  cdMin: 2,
  wcdMin: 3,
  // 每天的血量预算 / 目标强度 / 收入。以 12 天为基准调出来，后面按同一斜率外推。
  dayHp: LATE_SCALE(RAW_DAY_HP, 1.63),
  dayDps: LATE_SCALE(RAW_DAY_DPS, 1.34),
  income: [0, 15, 15, 14, 13, 13, 13, 13, 13, 13, 13, 14, 15, 15, 16, 16, 17, 17, 18],
};

// 四档难度：dps/hp 是乘在每天曲线上的，sane 是理智，pole 越大强敌来得越早
export const DIFFS = [
  { id: 'normal', n: '寻常', days: 12, dps: 1.0, hp: 1.0, income: 1.0, sane: 3, pole: 0,
    desc: '12 天，3 点理智。前四天只有普通怪，首领从第九天开始露面。' },
  { id: 'hard', n: '艰难', days: 12, dps: 1.02, hp: 1.0, income: 1.0, sane: 2, pole: 1,
    desc: '12 天，2 点理智。精英提前到第三天，第七天就有首领。' },
  { id: 'nightmare', n: '噩梦', days: 15, dps: 1.02, hp: 1.04, income: 0.92, sane: 4, pole: 1.5,
    desc: '15 天，4 点理智，收入 -8%。第二天起就会撞上精英，敌人也比寻常更硬。' },
  { id: 'abyss', n: '深渊', days: 18, dps: 1.07, hp: 1.09, income: 0.82, sane: 5, pole: 2,
    desc: '18 天，5 点理智，收入 -18%。精英从第三天就露头，第十天之后全是首领。' },
];

export const REALM_ZH = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' };
export const TYPE_ZH = { ASSAULT: '伤害', CHORUS: '辅助', WARDEN: '防御' };
export const RANK_ZH = { normal: '普通', elite: '精英', boss: '首领' };
export const REALM_COLOR = { 混沌: '#ecd24f', 血肉: '#cf3f46', 深海: '#4a8fdb', 超维: '#a58ce8' };

// 造物卡片上那一小行标签（用的是原表的 arch 字段）
export const ITEM_ARCH_ZH = {
  dmg: '直伤', poison: '中毒', burn: '冻伤', shield: '护盾', heal: '回复', gold: '金币',
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
  // 新机制：让造物不再只是「伤害/暴击」两种
  flat: ['命轮伤害', '+', ' 点'],
  ward: ['每 4 拍护盾', '+', ''],
  leech: ['吸血', '+', '%'],
  pierce: ['穿透护盾', '+', '%'],
  venom: ['中毒效果', '+', '%'],
  fear: ['敌方伤害', '-', '%'],
  hp: ['生命上限', '+', ''],
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
