export const REALMS = {
  CHAOS: { zh: '混沌', color: '#c0392b' },
  CARO: { zh: '血肉', color: '#d98a3d' },
  AEQUOR: { zh: '深海', color: '#2f8fc2' },
  ULTRA: { zh: '超维', color: '#8e6bd1' },
};
export const TYPES = {
  ASSAULT: { zh: '突击', short: '攻' },
  WARDEN: { zh: '守护', short: '守' },
  CHORUS: { zh: '合唱', short: '辅' },
};
export const SLOTS = ['Strike', 'Defense', 'Skill1', 'Skill2', 'Rouse', 'Exalt', 'OverExalt'];
export const SLOT_ZH = {
  Strike: '指令·攻击', Defense: '指令·防御', Skill1: '指令·技能一', Skill2: '指令·技能二',
  Rouse: '唤醒', Exalt: '共鸣', OverExalt: '超共鸣',
};
export const RARITY_ORDER = { N: 0, R: 1, SR: 2, SSR: 3, Genesis: 4 };
export const RARITY_ZH = { N: '普通', R: '稀有', SR: '精良', SSR: '史诗', Genesis: '创生' };

/* ---------- 养成 ---------- */
// 叠位（重复抽取同一唤醒体）：上限 99。每 1 叠位 = 全属性 +1.5% + 等级上限 +1。
// 每 10 叠位追加 +3% 增伤；每 40 叠位追加 1 级技能等级。都是线性可预期的，方便玩家算投入产出。
export const MAX_LV = 60;                 // 基础等级上限（0 叠位时）
export const MAX_AWAKEN = 99;             // 叠位上限
export const MAX_LV_HARD = MAX_LV + MAX_AWAKEN; // 159：满叠位时的等级上限
export const AWAKEN_STAT_PER = 1.5;       // %/叠位
export const AWAKEN_AMP_EVERY = 10;       // 每 N 叠位
export const AWAKEN_AMP_PER = 3;          // +% 增伤
export const AWAKEN_SKILL_EVERY = 40;     // 每 N 叠位技能等级 +1（最多 +2）
export const AWAKEN_SKILL_MAX = 2;
export const LEVEL_GATE = 20;             // 每 20 级一次「突破」
export const SKILL_MAX = 4;               // 技能等级 0..4（显示 Lv.1–5）

export const TEAM_SIZE = 4;
/* ---------- 造物 ---------- */
export const RELIC_SLOTS = 6;             // 造物栏总格数
export const RELIC_BASE_SLOTS = 3;        // 开局解锁的格数
export const RELIC_UNLOCK = [20, 45, 75]; // 第 4 / 5 / 6 格所需最高通关
/* ---------- 钥令 ---------- */
export const ORDER_SLOTS = 3;
export const ORDER_UNLOCK = [1, 12, 35];  // 第 1 / 2 / 3 个钥令位所需最高通关
export const ORDER_MAX_LV = 5;            // 淬炼上限
export const ORDER_LV_MULT = 0.15;        // 每级 +15% 效果

export const GEAR_MAX_LV = 10;
export const SAVE_VERSION = 3;

// Battle statuses. `kw` is the keyword slug used for the icon/tooltip (public/data/game-data.json -> kw).
export const STATUS = {
  poison: { zh: '中毒', kw: 'poison' }, bleed: { zh: '出血', kw: 'bleed' },
  vulnerable: { zh: '易伤', kw: 'vulnerable' }, weakness: { zh: '虚弱', kw: 'weakness' },
  counter: { zh: '反击', kw: 'counter' }, str: { zh: '力量', kw: 'str' }, strdown: { zh: '力量降低', kw: 'strength' },
  barrier: { zh: '屏障', kw: 'barrier' }, fortress: { zh: '护垒', kw: 'fortress' },
  fragile: { zh: '脆弱', kw: 'fragile' }, sealed: { zh: '封印', kw: 'sealed' },
};
