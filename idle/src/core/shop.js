// 银芯商店 and extra attempts. Everything here is a sink for 银芯; limits reset daily (UTC).
import { addItem, rollItem, addOrder, rollOrder } from './game.js';
import { hash, mulberry32 } from './rng.js';
import { weeklyState } from './weekly.js';
import { towerTries } from './challenge.js';
import { arenaTries, arenaState } from './arena.js';

const day = () => new Date().toISOString().slice(0, 10);
export const SHOP = [
  { id: 'ticket', zh: '召唤券 ×1', cost: 120, limit: 10, give: { tickets: 1 } },
  { id: 'gold', zh: '金币 ×5000', cost: 40, limit: 5, give: { gold: 5000 } },
  { id: 'gear', zh: '装备（随机）×1', cost: 60, limit: 5, give: { gear: 1 } },
  { id: 'order', zh: '钥令匣（随机钥令）×1', cost: 80, limit: 2, give: { order: 1 } },
  { id: 'try-weekly', zh: '周 Boss 额外次数 ×1', cost: 50, limit: 3, give: { weekly: 1 } },
  { id: 'try-tower', zh: '无限塔额外次数 ×1', cost: 40, limit: 3, give: { tower: 1 } },
  { id: 'try-arena', zh: '竞技场额外次数 ×1', cost: 30, limit: 3, give: { arena: 1 } },
];
export function shopState(state) {
  if (!state.shop || state.shop.day !== day()) state.shop = { day: day(), bought: {} };
  return state.shop;
}
export const boughtToday = (state, id) => shopState(state).bought[id] || 0;
export function buy(state, data, id) {
  const it = SHOP.find((x) => x.id === id), sh = shopState(state);
  if (!it || (sh.bought[id] || 0) >= it.limit || state.cores < it.cost) return null;
  state.cores -= it.cost; sh.bought[id] = (sh.bought[id] || 0) + 1;
  const g = it.give, out = { items: [] };
  if (g.tickets) state.tickets += g.tickets;
  if (g.gold) { state.gold += g.gold; state.stats.gold += g.gold; }
  if (g.gear) out.items.push(addItem(state, ...Object.values(rollItem(mulberry32(hash(`shop${state.seed}${sh.bought[id]}${state.stats.battles}`)), Math.max(20, state.maxStage), data))));
  if (g.order) {
    const rng = mulberry32(hash(`shoporder${state.seed}${sh.bought[id]}${state.stats.battles}`));
    const od = rollOrder(rng, data);
    if (od) { const got = addOrder(state, od.id); out.orders = [got]; if (!got.isNew) state.cores += got.cores; }
  }
  if (g.weekly) weeklyState(state).tries += 1;
  if (g.tower) { towerTries(state); state.tower.tries += 1; }
  if (g.arena) { arenaTries(state); arenaState(state).tries += 1; }
  state.stats.coresSpent = (state.stats.coresSpent || 0) + it.cost;
  return out;
}
