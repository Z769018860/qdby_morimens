// 启灵（回放里的 potencyLevel，0..15）的选项与名字。
// 0~3 = 0启~3启；4~6 = +1~+3；7 = 超限（+4 的位置，游戏里不叫 +4）；8~14 = +5~+11；15 = +12（最终法则）。
// 战报侦探的卡位输入、结算复盘、工坊的出题表单共用这一份，别各写各的。
export const POT_MAX = 15;
export const POT_VALUES = Array.from({ length: POT_MAX + 1 }, (_, i) => i);

export function potLabel(n, en = false) {
  n = Number(n);
  if (!Number.isFinite(n)) return '—';
  if (n <= 3) return en ? `E${n}` : `${n}启`;
  if (n === 7) return en ? 'Overdrive' : '超限';
  if (n >= POT_MAX) return en ? '+12 (Final Law)' : '+12（最终法则）';
  return `+${n - 3}`;
}
