// 银芯商店 and extra attempts. Everything here is a sink for 银芯; limits reset daily (UTC).
import { addItem, rollItem, addOrder, rollOrder, stageGold } from './game.js';
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

// ---------- 金币换召唤券（金币的后期出口）----------
// 关卡越深金币越多（每关 +8.5%），而等级上限归叠位、超限归银芯，到第 80 关以后金币基本没处花。
// 这里给它一个出口：金币换召唤券，每天限 10 张，价格 = 「当前最高关一场战斗的金币」×300，
// 当天每买一张再贵 20%。价格随最高关一起涨，所以金币再多也只是「每天多几张券」，拉不动抽卡节奏；
// 反过来在前中期它比挂机拿券（约 20 场一张）贵 10 倍以上，没人会拿它换，金币仍然留给升级。
// 券没有反向兑换成金币的路，不会出现来回套利。
export const GOLD_TICKET_ID = 'gticket';
export const GOLD_TICKET_LIMIT = 10;
export const GOLD_TICKET_BATTLES = 300;
export const GOLD_TICKET_STEP = 0.2;
export const goldTicketPrice = (state) => Math.round(
  stageGold(Math.max(1, state.maxStage || 1)) * GOLD_TICKET_BATTLES * (1 + GOLD_TICKET_STEP * boughtToday(state, GOLD_TICKET_ID)),
);
export function buyTicketWithGold(state) {
  const sh = shopState(state), n = sh.bought[GOLD_TICKET_ID] || 0;
  if (n >= GOLD_TICKET_LIMIT) return null;
  const price = goldTicketPrice(state);
  if (state.gold < price) return null;
  state.gold -= price; sh.bought[GOLD_TICKET_ID] = n + 1; state.tickets += 1;
  return { price, left: GOLD_TICKET_LIMIT - n - 1 };
}
