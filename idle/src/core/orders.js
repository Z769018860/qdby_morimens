// 钥令（配置系统三件套的第三件）：
//   命轮 = 单个唤醒体；密契 = 单个唤醒体 + 套数；造物 = 全队 6 格 + 主题羁绊；钥令 = 全队 3 格的「开局/规则」件。
// 钥令只提供 ZERO() 里已有的加成键，因此不需要改战斗模拟，加成随「淬炼等级」线性放大。
import { ORDER_LV_MULT, ORDER_MAX_LV, ORDER_SLOTS, ORDER_UNLOCK } from './constants.js';
import { ZERO, addBonus, bonusText } from './gear.js';

export const orderLvMult = (lv = 0) => 1 + ORDER_LV_MULT * Math.max(0, Math.min(ORDER_MAX_LV, lv || 0));
export const orderUpCost = (lv = 0) => (lv >= ORDER_MAX_LV ? 0 : 40 + 30 * (lv || 0));
export const orderSlotCount = (maxStage = 0) => {
  let n = 1;
  for (const s of ORDER_UNLOCK) if (maxStage >= s) n++;
  return Math.min(ORDER_SLOTS, n);
};
export const orderLockedHint = (i, maxStage = 0) => ORDER_UNLOCK[i] ?? null;

export function orderBonus(def, lv = 0) {
  const b = ZERO();
  if (!def) return b;
  const m = orderLvMult(lv);
  for (const [k, v] of Object.entries(def.bonus || {})) if (k in b) b[k] = (b[k] || 0) + v * m;
  return b;
}
export const orderText = (def, lv = 0) => bonusText(orderBonus(def, lv));

// 已配置的钥令 -> 全队加成
export function ordersBonus(state, data) {
  const b = ZERO();
  const o = state.orders;
  if (!o || !data?.orderById) return b;
  for (const id of o.slots || []) {
    if (!id) continue;
    const lv = o.owned?.[id] ?? 0;
    addBonus(b, orderBonus(data.orderById[id], lv));
  }
  return b;
}

// 配置在队伍页的 3 个位置上：同一个钥令不能重复装（它是规则件，不是消耗品）
export function setOrderSlot(state, i, id) {
  const o = (state.orders ||= { owned: {}, slots: [] });
  o.slots ||= [];
  if (id && o.owned[id] == null) return false;
  if (id && o.slots.some((x, j) => x === id && j !== i)) return false;
  o.slots[i] = id || null;
  return true;
}
export const equippedOrders = (state, data) => (state.orders?.slots || []).map((id) => (id ? { id, lv: state.orders.owned[id] || 0, def: data.orderById[id] } : null));
