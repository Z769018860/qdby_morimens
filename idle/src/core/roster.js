// 唤醒体列表的排序：默认按稀有度，也可以按战力 / 等级 / 叠位数 / 获取顺序 / 界域。
// 排序逻辑放在 core 里是为了能测——UI 只负责把行拼出来。
import { RARITY_ORDER, REALMS } from './constants.js';

export const ROSTER_SORTS = [
  ['rarity', '稀有度'],
  ['power', '战力'],
  ['lv', '等级'],
  ['star', '叠位数'],
  ['order', '获取顺序'],
  ['realm', '界域'],
];
export const SORT_ZH = Object.fromEntries(ROSTER_SORTS);
const REALM_ORDER = Object.keys(REALMS);

const METRIC = {
  rarity: (x) => RARITY_ORDER[x.a.rarity] ?? 0,
  power: (x) => x.power || 0,
  lv: (x) => x.r?.lv || 0,
  star: (x) => x.r?.star || 0,
  order: (x) => x.idx ?? 0,
  realm: (x) => REALM_ORDER.indexOf(x.a.realm),
};

/**
 * rows: [{ a, r, power, idx }]（a = 唤醒体定义，r = 存档记录，idx = 获取顺序，power = 单人战力）
 * dir:  1 升序 / -1 降序。默认降序（大的、新的在前）。
 * 未拥有的永远排在拥有的后面——这个不该被排序方向翻过来。
 */
export function sortRoster(rows, key = 'rarity', dir = -1) {
  const f = METRIC[key] || METRIC.rarity;
  return [...rows].sort((x, y) => {
    const ox = x.r ? 1 : 0, oy = y.r ? 1 : 0;
    if (ox !== oy) return oy - ox;
    const d = (f(x) - f(y)) * (dir < 0 ? -1 : 1);
    if (d) return d;
    // 同分时按获取顺序稳定收尾，列表不会每次刷新都换位置
    return (x.idx ?? 0) - (y.idx ?? 0);
  });
}
