import { THREATS } from './challenge.js';

const trialsCleared = (s) => Object.keys(s.trials.cleared).length;
const maxStar = (s) => Math.max(0, ...Object.values(s.roster).map((r) => r.star));
const maxLv = (s) => Math.max(0, ...Object.values(s.roster).map((r) => r.lv));
const gearCount = (s) => Object.keys(s.gear.items).length;
const maxedGear = (s) => Object.values(s.gear.items).filter((i) => i.lv >= 10).length;

const seenCount = (s) => Object.values(s.codex || {}).filter((c) => c.seen > 0).length;
const beatenBosses = (s, data) => Object.entries(s.codex || {}).filter(([id, c]) => c.kills > 0 && data?.monById?.[id]?.rank === 'Boss').length;
export const ACHIEVEMENTS = [
  { id: 'stage10', zh: '雾港初探', desc: '通关第 10 关', cur: (s) => s.maxStage, goal: 10, reward: { tickets: 3 } },
  { id: 'stage20', zh: '蚀刻回廊', desc: '通关第 20 关', cur: (s) => s.maxStage, goal: 20, reward: { tickets: 5 } },
  { id: 'stage30', zh: '沉没钟楼', desc: '通关第 30 关', cur: (s) => s.maxStage, goal: 30, reward: { tickets: 8, gold: 3000 } },
  { id: 'stage40', zh: '猩红温室', desc: '通关第 40 关', cur: (s) => s.maxStage, goal: 40, reward: { tickets: 12, gold: 8000 } },
  { id: 'stage60', zh: '潮汐监牢', desc: '通关第 60 关', cur: (s) => s.maxStage, goal: 60, reward: { tickets: 20, gold: 30000 } },
  { id: 'wins100', zh: '百战', desc: '累计胜利 100 场', cur: (s) => s.stats.wins, goal: 100, reward: { gold: 1500 } },
  { id: 'wins1000', zh: '千战', desc: '累计胜利 1000 场', cur: (s) => s.stats.wins, goal: 1000, reward: { tickets: 10, gold: 10000 } },
  { id: 'kills1000', zh: '清道夫', desc: '累计击杀 1000 个敌人', cur: (s) => s.stats.kills, goal: 1000, reward: { tickets: 5 } },
  { id: 'own10', zh: '小队集结', desc: '拥有 10 名唤醒体', cur: (s) => Object.keys(s.roster).length, goal: 10, reward: { tickets: 3 } },
  { id: 'own25', zh: '唤醒者的圈子', desc: '拥有 25 名唤醒体', cur: (s) => Object.keys(s.roster).length, goal: 25, reward: { tickets: 8 } },
  { id: 'own45', zh: '银钥回廊', desc: '拥有 45 名唤醒体', cur: (s) => Object.keys(s.roster).length, goal: 45, reward: { tickets: 15, gold: 20000 } },
  { id: 'lv30', zh: '初露锋芒', desc: '任一唤醒体达到 30 级', cur: maxLv, goal: 30, reward: { gold: 2000 } },
  { id: 'lv60', zh: '登峰', desc: '任一唤醒体达到 60 级', cur: maxLv, goal: 60, reward: { tickets: 10 } },
  { id: 'star3', zh: '三星闪耀', desc: '任一唤醒体达到 3★', cur: maxStar, goal: 3, reward: { tickets: 5 } },
  { id: 'star5', zh: '满星', desc: '任一唤醒体达到 5★', cur: maxStar, goal: 5, reward: { tickets: 12 } },
  { id: 'pull100', zh: '祈愿者', desc: '累计召唤 100 次', cur: (s) => s.stats.pulls, goal: 100, reward: { gold: 5000 } },
  { id: 'gear20', zh: '收藏家', desc: '持有 20 件装备', cur: gearCount, goal: 20, reward: { gold: 3000 } },
  { id: 'gearmax', zh: '千锤百炼', desc: '强化 1 件装备到满级', cur: maxedGear, goal: 1, reward: { gold: 5000 } },
  { id: 'tower10', zh: '回廊十层', desc: '无限塔到达 10 层', cur: (s) => s.tower.best, goal: 10, reward: { tickets: 4 } },
  { id: 'tower30', zh: '回廊三十层', desc: '无限塔到达 30 层', cur: (s) => s.tower.best, goal: 30, reward: { tickets: 10 } },
  { id: 'tower60', zh: '倒悬之巅', desc: '无限塔到达 60 层', cur: (s) => s.tower.best, goal: 60, reward: { tickets: 20, gold: 30000 } },
  { id: 'codex30', zh: '初识异形', desc: '遭遇 30 种怪物', cur: seenCount, goal: 30, reward: { tickets: 3 } },
  { id: 'codex100', zh: '融蚀图鉴', desc: '遭遇 100 种怪物', cur: seenCount, goal: 100, reward: { tickets: 8, gold: 8000 } },
  { id: 'boss15', zh: '首领猎手', desc: '击败 15 种首领', cur: beatenBosses, goal: 15, reward: { tickets: 8 } },
  { id: 'trial1', zh: '融灾试炼', desc: '通关任意融灾试炼', cur: trialsCleared, goal: 1, reward: { tickets: 3 } },
  { id: 'trial8', zh: '灾厄猎手', desc: '累计通关 8 个融灾试炼等级', cur: trialsCleared, goal: 8, reward: { tickets: 10 } },
  { id: 'trialS', zh: 'S 级威胁', desc: '通关任意 S 级融灾试炼', cur: (s) => Object.keys(s.trials.cleared).filter((k) => k.endsWith('-S') || k.endsWith('-SS') || k.endsWith('-SSS')).length, goal: 1, reward: { tickets: 12, gold: 10000 } },
  { id: 'trialSSS', zh: '深渊终局', desc: '通关任意 SSS 级融灾试炼', cur: (s) => Object.keys(s.trials.cleared).filter((k) => k.endsWith('-SSS')).length, goal: 1, reward: { tickets: 30, gold: 50000 } },
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
  state.tickets += a.reward.tickets || 0; state.gold += a.reward.gold || 0;
  return a.reward;
}
export const claimableCount = (state, data) => achievementList(state, data).filter((a) => a.done && !a.claimed).length;
export const THREAT_ORDER = THREATS.map((t) => t.k);
