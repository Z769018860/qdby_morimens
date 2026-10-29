// 「神秘唤醒体」的解锁进度。
//
// 只存本机 localStorage（与银芯同一个 zjtt 前缀），不读云端：解锁记录属于
// 单机进度，跟着账号走反而会出现「换设备就全解锁/全锁」的怪事，而这几名角色
// 的设计初衷就是「自己一层层打出来」。
//
// 存档结构刻意做得很小，四件事就够所有条件判定了：
//   clears  通关过的唤醒体 id 列表（去重后长度 = 用多少个不同角色通关过）
//   realms  通关过的界域
//   diffs   通关过的难度
//   bosses  累计击败的强敌数（败局也累计，否则「60 只强敌」会非常劝退）
import { UNLOCKS } from './defs.js';

const PKEY = 'zjtt:survivors:progress';

const blank = () => ({ clears: [], realms: [], diffs: [], bosses: 0, best: 0, runs: 0 });

export function svProgress() {
  try {
    const raw = localStorage.getItem(PKEY);
    if (!raw) return blank();
    const o = JSON.parse(raw) || {};
    return {
      ...blank(), ...o,
      clears: Array.isArray(o.clears) ? o.clears : [],
      realms: Array.isArray(o.realms) ? o.realms : [],
      diffs: Array.isArray(o.diffs) ? o.diffs : [],
    };
  } catch {
    // 隐私模式下 localStorage 会抛异常，这时按「全新账号」处理即可，别让整局崩掉
    return blank();
  }
}

export function saveProgress(p) {
  try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch { /* 忽略 */ }
}

// 官方 62 名没有条目，默认就是开着的 —— UNLOCKS 只管四位神秘唤醒体。
export function isUnlocked(id) {
  const u = UNLOCKS[id];
  if (!u) return true;
  return !!u.cond(svProgress());
}

export function unlockNeed(id) {
  const u = UNLOCKS[id];
  return u ? u.need : '';
}

export function unlockProg(id) {
  const u = UNLOCKS[id];
  return u ? u.prog(svProgress()) : '';
}

// 一局结束时记账。注意「输掉的局也要记」：强敌数是累计项，
// 否则全部条件都要靠通关才推进，输十局的玩家一点进度都看不到。
export function recordRun(sm) {
  const p = svProgress();
  p.runs += 1;
  p.bosses += Math.max(0, sm.bossKills | 0);
  if (sm.score > p.best) p.best = sm.score;
  // 简单难度不算「通关」：它本来就是给新玩家认识操作的，算进来会让
  // 「用 10 个不同唤醒体通关」变成「随便换十个人打简单」。
  if (sm.win && sm.diff !== 'easy') {
    if (sm.charId && !p.clears.includes(String(sm.charId))) p.clears.push(String(sm.charId));
    if (sm.realm && !p.realms.includes(sm.realm)) p.realms.push(sm.realm);
    if (sm.diff && !p.diffs.includes(sm.diff)) p.diffs.push(sm.diff);
  }
  saveProgress(p);
  return p;
}

// 这一局刚好把谁放出来了？结算面板用它弹「新唤醒体解锁」。
export function unlockedByRun(before, after) {
  const out = [];
  for (const id of Object.keys(UNLOCKS)) {
    if (!UNLOCKS[id].cond(before) && UNLOCKS[id].cond(after)) out.push(id);
  }
  return out;
}
