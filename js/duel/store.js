// 对战页的存档：银芯、收藏、战绩。
// 只写 localStorage，不碰云端档案（云端字段是给「九个游戏」的分数用的，
// 这里的东西换设备靠加密存档整包搬，和挂机版同一套思路）。
const KEY = 'zjtt:duel:v1';

const DEFAULT = { silver: 180, coll: {}, opened: 0, wins: 0, losses: 0, deck: 'd1', diff: 'normal' };

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return Object.assign({}, DEFAULT);
    const o = JSON.parse(raw);
    return Object.assign({}, DEFAULT, o, { coll: (o && o.coll) || {} });
  } catch (e) {
    return Object.assign({}, DEFAULT);
  }
}

export function saveSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 隐私模式里写不进去，不影响玩 */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 同上 */ }
}
