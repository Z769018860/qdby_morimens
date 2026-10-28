import { THREATS } from './challenge.js';
import { LADDER } from './arena.js';
import { relicTheme } from './gear.js';

// ---- progress readers
const trialsCleared = (s) => Object.keys(s.trials.cleared).length;
const maxStar = (s) => Math.max(0, ...Object.values(s.roster).map((r) => r.star));
const maxLv = (s) => Math.max(0, ...Object.values(s.roster).map((r) => r.lv));
const gearCount = (s) => Object.keys(s.gear.items).length;
const maxedGear = (s) => Object.values(s.gear.items).filter((i) => i.lv >= 10).length;
const refined = (s, tier) => Object.values(s.gear.items).filter((i) => (i.rf || 0) >= tier).length;
const seenCount = (s) => Object.values(s.codex || {}).filter((c) => c.seen > 0).length;
const beatenBosses = (s, data) => Object.entries(s.codex || {}).filter(([id, c]) => c.kills > 0 && data?.monById?.[id]?.rank === 'Boss').length;
const rtSum = (s) => Object.values(s.rtower || {}).reduce((a, t) => a + (t.best || 0), 0);
const rtMin = (s) => Math.min(...['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'].map((r) => s.rtower?.[r]?.best || 0));
const arenaRank = (s) => (s.arena ? Math.max(0, LADDER + 1 - s.arena.best) : 0);   // 0 = unranked … 1000 = rank 1
const owned = (s, data, rar) => Object.keys(s.roster).filter((k) => data?.bySlug?.[k]?.rarity === rar).length;
const friendDuels = (s) => (s.arena?.friends || []).reduce((a, f) => a + f.wins + f.losses, 0);
const trialTier = (s, ks) => Object.keys(s.trials.cleared).filter((k) => ks.some((x) => k.endsWith('-' + x))).length;
const orderCount = (s) => Object.keys(s.orders?.owned || {}).length;
const orderMaxLv = (s) => Math.max(0, ...Object.values(s.orders?.owned || {}));
// 造物羁绊：装上（且栏位已解锁）的同主题造物 ≥2 件即算一种
const bondCount = (s, data) => {
  if (!data?.relicById) return 0;
  const cnt = {};
  for (const uid of (s.gear.relics || []).slice(0, 6)) {
    const it = uid && s.gear.items?.[uid]; if (!it) continue;
    const def = data.relicById[it.defId]; if (!def) continue;
    const th = relicTheme(def.id); cnt[th.zh] = (cnt[th.zh] || 0) + 1;
  }
  return Object.values(cnt).filter((n) => n >= 2).length;
};
const claimedCount = (s) => Object.keys(s.ach || {}).length;

// reward ladder by tier (tier 0 = easiest)
const TK = [2, 3, 5, 8, 12, 20, 30], CO = [8, 12, 20, 30, 45, 70, 100], GD = [800, 1500, 3000, 8000, 20000, 50000, 100000];
const reward = (t, n) => ({ tickets: TK[Math.min(t, 6)], cores: CO[Math.min(t, 6)], ...(t >= 1 ? { gold: GD[Math.min(t, 6)] } : {}), ...(n ? n : {}) });

// base id + goal = achievement id (kept stable for saves). zh: title, desc(goal)
function tiers(cat, base, zhs, desc, cur, goals) {
  return goals.map((g, i) => ({ id: `${base}${g}`, cat, zh: Array.isArray(zhs) ? zhs[i] : `${zhs} ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'][i]}`, desc: desc(g), cur, goal: g, reward: reward(i) }));
}
const fm = (n) => (n >= 10000 ? `${n / 10000} 万` : String(n));

export const CATEGORIES = [['all', '全部'], ['stage', '推图'], ['battle', '战斗'], ['collect', '收集'], ['grow', '养成'], ['gear', '装备'], ['gacha', '召唤'], ['challenge', '挑战'], ['arena', '竞技'], ['codex', '图鉴'], ['signin', '签到'], ['meta', '总览']];

export const ACHIEVEMENTS = [
  ...tiers('stage', 'stage', ['雾港初探', '蚀刻回廊', '沉没钟楼', '猩红温室', '回响墓园', '潮汐监牢', '倒悬教堂', '无光之海'], (g) => `通关第 ${g} 关`, (s) => s.maxStage, [10, 20, 30, 40, 50, 60, 80, 100]),
  ...tiers('battle', 'wins', ['百战', '三百战', '千战', '三千战', '万战'], (g) => `累计胜利 ${g} 场`, (s) => s.stats.wins, [100, 300, 1000, 3000, 10000]),
  ...tiers('battle', 'kills', ['清道夫', '收割者', '融蚀猎手', '深渊清洁工'], (g) => `累计击杀 ${g} 个敌人`, (s) => s.stats.kills, [1000, 5000, 20000, 80000]),
  ...tiers('battle', 'gold', ['小有积蓄', '财源广进', '金库', '无底洞'], (g) => `累计获得 ${fm(g)} 金币`, (s) => s.stats.gold, [20000, 200000, 2000000, 20000000]),
  ...tiers('collect', 'own', ['小队集结', '唤醒者的圈子', '银钥回廊', '半数收藏', '全员集结'], (g) => `拥有 ${g} 名唤醒体`, (s) => Object.keys(s.roster).length, [10, 25, 45, 55, 62]),
  ...tiers('collect', 'star', ['初次叠位', '叠位 · 五', '叠位 · 十五', '叠位 · 三十', '叠位 · 六十', '叠位 · 九十九'], (g) => `任一唤醒体达到 ${g} 叠位`, maxStar, [1, 5, 15, 30, 60, 99]),
  ...tiers('collect', 'ssr', ['史诗入手', '史诗小队', '史诗收藏家'], (g) => `拥有 ${g} 名史诗唤醒体`, (s, d) => owned(s, d, 'SSR'), [1, 4, 10]),
  ...tiers('collect', 'gen', ['创生降临', '创生双子', '创生群像'], (g) => `拥有 ${g} 名创生唤醒体`, (s, d) => owned(s, d, 'Genesis'), [1, 2, 4]),
  { id: 'brk1', cat: 'grow', zh: '初次突破', desc: '完成任意唤醒体的第一次等级突破', cur: (s) => Math.max(0, ...Object.values(s.roster).map((r) => r.brk || 0)), goal: 1, reward: reward(0) },
  ...tiers('grow', 'lv', ['初露锋芒', '渐入佳境', '炉火纯青', '登峰', '越限', '极境'], (g) => `任一唤醒体达到 ${g} 级`, maxLv, [20, 45, 70, 100, 130, 159]),
  ...tiers('grow', 'team', ['整装', '精锐', '满编'], (g) => `出战队伍总等级达到 ${g}`, (s) => (s.team || []).reduce((a, x) => a + (s.roster[x]?.lv || 0), 0), [100, 250, 450]),
  ...tiers('gear', 'gear', ['收藏家', '军械库', '博物馆'], (g) => `持有 ${g} 件装备`, gearCount, [20, 60, 120]),
  { id: 'gearmax', cat: 'gear', zh: '千锤百炼', desc: '强化 1 件装备到满级', cur: maxedGear, goal: 1, reward: reward(1) },
  { id: 'gearmax5', cat: 'gear', zh: '锻造大师', desc: '强化 5 件装备到满级', cur: maxedGear, goal: 5, reward: reward(3) },
  { id: 'refine1', cat: 'gear', zh: '初次精炼', desc: '精炼任意装备 1 次（需要银芯）', cur: (s) => refined(s, 1), goal: 1, reward: reward(0) },
  { id: 'refine3', cat: 'gear', zh: '精炼三成', desc: '拥有 3 件精炼 ≥3 阶的装备', cur: (s) => refined(s, 3), goal: 3, reward: reward(3) },
  { id: 'refine5', cat: 'gear', zh: '登峰造极', desc: '拥有 1 件精炼满 5 阶的装备', cur: (s) => refined(s, 5), goal: 1, reward: reward(4) },
  { id: 'order3', cat: 'gear', zh: '钥令入门', desc: '拥有 3 个钥令', cur: orderCount, goal: 3, reward: reward(0) },
  { id: 'order6', cat: 'gear', zh: '钥令收藏', desc: '拥有 6 个钥令', cur: orderCount, goal: 6, reward: reward(2) },
  { id: 'ordermax', cat: 'gear', zh: '淬炼大师', desc: '把任意钥令淬炼到 Lv5', cur: orderMaxLv, goal: 5, reward: reward(3) },
  { id: 'bond2', cat: 'gear', zh: '羁绊初成', desc: '同时激活 2 种造物羁绊', cur: bondCount, goal: 2, reward: reward(2) },
  { id: 'bond4', cat: 'gear', zh: '羁绊大师', desc: '同时激活 4 种造物羁绊', cur: bondCount, goal: 4, reward: reward(4) },
  ...tiers('gacha', 'pull', ['祈愿者', '虔诚者', '千次祈愿', '命运之轮'], (g) => `累计召唤 ${g} 次`, (s) => s.stats.pulls, [100, 300, 1000, 3000]),
  ...tiers('gacha', 'spent', ['银芯初试', '银芯常客', '银芯豪客'], (g) => `累计花费 ${g} 银芯`, (s) => s.stats.coresSpent || 0, [500, 3000, 12000]),
  ...tiers('challenge', 'tower', ['回廊十层', '回廊二十层', '回廊三十层', '回廊四十五层', '倒悬之巅', '无尽回廊'], (g) => `无限塔到达 ${g} 层`, (s) => s.tower.best, [10, 20, 30, 45, 60, 90]),
  { id: 'trial1', cat: 'challenge', zh: '融灾试炼', desc: '通关任意融灾试炼', cur: trialsCleared, goal: 1, reward: reward(0) },
  { id: 'trial4', cat: 'challenge', zh: '试炼学徒', desc: '累计通关 4 个融灾试炼等级', cur: trialsCleared, goal: 4, reward: reward(1) },
  { id: 'trial8', cat: 'challenge', zh: '灾厄猎手', desc: '累计通关 8 个融灾试炼等级', cur: trialsCleared, goal: 8, reward: reward(2) },
  { id: 'trial16', cat: 'challenge', zh: '灾厄终结者', desc: '累计通关 16 个融灾试炼等级', cur: trialsCleared, goal: 16, reward: reward(4) },
  { id: 'trialS', cat: 'challenge', zh: 'S 级威胁', desc: '通关任意 S 级融灾试炼', cur: (s) => trialTier(s, ['S', 'SS', 'SSS']), goal: 1, reward: reward(4) },
  { id: 'trialSSS', cat: 'challenge', zh: '深渊终局', desc: '通关任意 SSS 级融灾试炼', cur: (s) => trialTier(s, ['SSS']), goal: 1, reward: reward(6) },
  // 校猫：奖励首领（推图每 40 关、无限塔每 20 层、属性塔每 20 层各一次）
  { id: 'catmeet', cat: 'codex', zh: '猫猫经过', desc: '遭遇过奖励首领「校猫」', cur: (s) => (s.codex?.catboss?.seen ? 1 : 0), goal: 1, reward: reward(1) },
  { id: 'catwin', cat: 'challenge', zh: '第一次撸猫', desc: '击败奖励首领「校猫」1 次', cur: (s) => s.codex?.catboss?.kills || 0, goal: 1, reward: reward(2) },
  { id: 'catwin5', cat: 'challenge', zh: '校猫的常客', desc: '击败奖励首领「校猫」5 次', cur: (s) => s.codex?.catboss?.kills || 0, goal: 5, reward: reward(4) },
  { id: 'week1', cat: 'challenge', zh: '周 Boss 初战', desc: '累计对周 Boss 造成 50000 伤害', cur: (s) => s.weeklyTotal || 0, goal: 50000, reward: reward(0) },
  { id: 'week2', cat: 'challenge', zh: '猎首者', desc: '累计对周 Boss 造成 1000000 伤害', cur: (s) => s.weeklyTotal || 0, goal: 1000000, reward: reward(3) },
  { id: 'week3', cat: 'challenge', zh: '弑神者', desc: '累计对周 Boss 造成 10000000 伤害', cur: (s) => s.weeklyTotal || 0, goal: 10000000, reward: reward(5) },
  ...tiers('challenge', 'rt', ['界域初行', '界域行者', '界域巡礼', '界域征服者', '界域主宰'], (g) => `四座属性塔累计通关 ${g} 层`, rtSum, [20, 40, 80, 120, 200]),
  { id: 'rtall', cat: 'challenge', zh: '四界同修', desc: '四座属性塔各通关 15 层', cur: rtMin, goal: 15, reward: reward(4) },
  { id: 'arena90', cat: 'arena', zh: '初上天梯', desc: '竞技场最高名次进入前 900', cur: arenaRank, goal: 101, reward: reward(0) },
  { id: 'arena70', cat: 'arena', zh: '登上天梯', desc: '竞技场最高名次进入前 700', cur: arenaRank, goal: 301, reward: reward(1) },
  { id: 'arena50', cat: 'arena', zh: '中流砥柱', desc: '竞技场最高名次进入前 500', cur: arenaRank, goal: 501, reward: reward(2) },
  { id: 'arena30', cat: 'arena', zh: '前三百', desc: '竞技场最高名次进入前 300', cur: arenaRank, goal: 701, reward: reward(3) },
  { id: 'arena10', cat: 'arena', zh: '百强', desc: '竞技场最高名次进入前 100', cur: arenaRank, goal: 901, reward: reward(5) },
  { id: 'arena1', cat: 'arena', zh: '天梯之巅', desc: '竞技场登顶第 1 名', cur: arenaRank, goal: LADDER, reward: reward(6) },
  ...tiers('arena', 'awin', ['初试锋芒', '常胜', '百战天梯'], (g) => `竞技场累计胜利 ${g} 场`, (s) => s.arena?.wins || 0, [5, 30, 100]),
  ...tiers('arena', 'duel', ['以武会友', '切磋', '知己'], (g) => `好友对战累计 ${g} 场`, friendDuels, [1, 10, 30]),
  ...tiers('codex', 'codex', ['初识异形', '融蚀图鉴', '博物学家', '无所不知'], (g) => `遭遇 ${g} 种怪物`, seenCount, [30, 100, 250, 400]),
  ...tiers('codex', 'boss', ['首领猎手', '首领克星', '首领终结者'], (g) => `击败 ${g} 种首领`, beatenBosses, [15, 40, 90]),
  ...tiers('signin', 'sign', ['打卡', '一周', '半月', '一月', '两月', '百日'], (g) => `累计签到 ${g} 天`, (s) => s.stats.signins || 0, [1, 7, 15, 30, 60, 100]),
  ...tiers('meta', 'meta', ['成就入门', '成就达人', '成就大师', '成就传说'], (g) => `累计领取 ${g} 个成就奖励`, claimedCount, [10, 25, 50, 80]),
];

export function achievementList(state, data) {
  return ACHIEVEMENTS.map((a) => {
    const cur = Math.min(a.goal, a.cur(state, data));
    return { ...a, cur, done: cur >= a.goal, claimed: !!state.ach[a.id] };
  });
}
export function claimAchievement(state, id, data) {
  const a = achievementList(state, data).find((x) => x.id === id);
  if (!a || !a.done || a.claimed) return null;
  state.ach[id] = true;
  state.tickets += a.reward.tickets || 0; state.gold += a.reward.gold || 0; state.cores += a.reward.cores || 0;
  return a.reward;
}
export function claimAllAchievements(state, data) {
  const tot = { tickets: 0, gold: 0, cores: 0, n: 0 };
  for (let guard = 0; guard < 5; guard++) {            // meta achievements can unlock others
    const ready = achievementList(state, data).filter((a) => a.done && !a.claimed);
    if (!ready.length) break;
    for (const a of ready) { const r = claimAchievement(state, a.id, data); if (r) { tot.tickets += r.tickets || 0; tot.gold += r.gold || 0; tot.cores += r.cores || 0; tot.n++; } }
  }
  return tot.n ? tot : null;
}
export const claimableCount = (state, data) => achievementList(state, data).filter((a) => a.done && !a.claimed).length;
export const THREAT_ORDER = THREATS.map((t) => t.k);
