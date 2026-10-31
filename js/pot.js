// 启灵（回放里的 potencyLevel，0..15）的选项与名字。
// 0~3 = 0启~3启；4~6 = +1~+3；7 = 超限（+4 的位置，游戏里不叫 +4）；8~14 = +5~+11；15 = +12（最终法则）。
// 战报侦探的卡位输入、结算复盘、工坊的出题表单共用这一份，别各写各的。
// 下拉里只有 8 档：+1~+3 合成一档、+5~+11 合成一档（游戏里这两段玩家分不清，也没必要分），
// 每档用它的最小值当代表（存进答案 / 猜测里的就是代表值），判对错按「档」比，不按原始数字比。
export const POT_MAX = 15;
export const POT_VALUES = [0, 1, 2, 3, 4, 7, 8, 15];

/** 一个 0..15 的原始值落在哪一档（返回那一档的代表值）；不是数字返回 null */
export function potGroup(n) {
  if (n == null || n === '' || !Number.isFinite(Number(n))) return null;
  n = Math.max(0, Math.min(POT_MAX, Math.round(Number(n))));
  if (n <= 3) return n;
  if (n <= 6) return 4;
  if (n === 7) return 7;
  if (n <= 14) return 8;
  return 15;
}
/** 档的序号 0..7，用来比大小（箭头方向 / 相邻算「接近」） */
export const potRank = (n) => { const g = potGroup(n); return g == null ? null : POT_VALUES.indexOf(g); };

export function potLabel(n, en = false) {
  const g = potGroup(n);
  if (g == null) return '—';
  if (g <= 3) return en ? `E${g}` : `${g}启`;
  if (g === 4) return '+1~+3';
  if (g === 7) return en ? 'Overdrive' : '超限';
  if (g === 8) return '+5~+11';
  return en ? '+12 (Final Law)' : '+12（最终法则）';
}
