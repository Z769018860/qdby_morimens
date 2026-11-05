// 无头平衡测量用的机器人决策。
// 页面 ?_test=1 的 __pf.think() 与 scripts/pf-endless-sim.mjs 共用这一份 ——
// 之前两边各写一份，改了一边另一边就不准，测出来的数字没法比。
//
// 策略（照着真人打的样子，尽量简单）：
//   1. 先把备战席上的人尽量摆上场（受人口限制）；
//   2. 席位塞满时，卖掉「凑不成对、又不上场」的一星垫底牌，给同名材料腾位置；
//   3. 买人按价值排序：能三合的 > 凑对的 > 新人（新人只在人口没满时补）；
//   4. 补装备、升人口；
//   5. 有余钱就刷新找同名 —— 3★ 以上全靠这一条，无尽关后期的主要去处；
//   6. 最后钱还多就扩一格备战席。
import {
  G, buy, sell, levelUp, rollShop, buyItem, equip, place, beginWave,
  deployed, freeCell, buyBenchSlot, UNITS_BY_ID,
} from './engine.js';
import { INV_SIZE, MAX_LEVEL, LEVEL_COST, BENCH_MAX, benchCost, WAVES } from './defs.js';

export function botThink() {
  if (G.phase !== 'prep') return false;

  const countOf = (id, star) => {
    let n = 0;
    for (const u of G.units) if (u.id === id && u.star === star) n++;
    return n;
  };
  // 前十二波（标准模式也是这十二波）沿用老策略：见人就买、先凑宽阵容 ——
  // 换策略会把标准模式 75% 的基线一起改掉，那是另一件事。
  // 只有打到十二波之后才「收束投资」：无尽关的金币只够养一两个核心，
  // 摊到七个 2★ 上，一个 3★ 都出不来。
  const late = G.wave >= WAVES.length;
  const invest = {};
  for (const u of G.units) invest[u.id] = (invest[u.id] || 0) + u.star;
  const core = Object.keys(invest).sort((a, b) => invest[b] - invest[a]).slice(0, 2);

  // 5 = 再买一张就能三合；4 = 主力（继续堆同名冲下一星）；2 = 凑对；1 = 全新
  const valueOf = (id) => {
    const n1 = countOf(id, 1);
    if (n1 >= 2) return 5;
    if (late && core.includes(id)) return 4;
    return n1 === 1 ? 2 : 1;
  };

  const fill = () => {
    for (const u of G.units.slice()) {
      if (deployed() >= G.level) break;
      if (u.cell >= 0) continue;
      const c = freeCell(u.def.role);
      if (c >= 0) place(u.uid, c);
    }
  };

  const buyAll = () => {
    // 前十二波按商店顺序买（和改之前一模一样，标准模式的基线才可比）；
    // 后段才按「能三合 > 主力 > 凑对」的优先级挑。
    const order = G.shop.map((s, i) => i).filter((i) => G.shop[i]);
    if (late) {
      order.sort((a, b) => valueOf(G.shop[b].id) - valueOf(G.shop[a].id)
        || UNITS_BY_ID[G.shop[a].id].cost - UNITS_BY_ID[G.shop[b].id].cost);
    }
    let bought = 0;
    for (const i of order) {
      const slot = G.shop[i];
      if (!slot) continue;
      const d = UNITS_BY_ID[slot.id];
      if (G.gold < d.cost) continue;
      const spare = G.gold - d.cost;
      const v = valueOf(slot.id);
      const owned = G.units.some((u) => u.id === slot.id);
      const want = late
        ? (v >= 4 || (v === 2 && spare >= 4) || (v === 1 && deployed() < G.level && spare >= 6))
        : (owned || spare >= 7 || G.units.length < 4);
      if (want && buy(i)) bought++;
    }
    return bought;
  };

  fill();
  // 席位塞满：先清掉最便宜的、凑不成对的垫底牌，否则同名材料进不来
  if (late && G.bench.every(Boolean)) {
    const junk = G.units
      .filter((u) => u.cell < 0 && u.star === 1 && countOf(u.id, 1) < 2)
      .sort((a, b) => a.def.cost - b.def.cost)[0];
    if (junk) sell(junk.uid);
  }
  buyAll();
  fill();

  // 装备：有钱先补齐装备栏再装上，优先给场上缺槽位的高费单位
  if (G.gold >= 14) {
    for (let i = 0; i < G.itemShop.length; i++) {
      if (!G.itemShop[i]) continue;
      if (G.inv.length >= INV_SIZE) break;
      if (buyItem(i)) continue;
    }
  }
  for (let k = G.inv.length - 1; k >= 0; k--) {
    const it = G.inv[k];
    const slot = it.kind === 'wheel' ? 'wheel' : 'creation';
    const host = G.units.filter((u) => u.cell >= 0 && !u[slot]).sort((a, b) => b.def.cost - a.def.cost)[0];
    if (host) equip(host.uid, k);
  }

  if (deployed() >= G.level && G.level < MAX_LEVEL && G.gold >= LEVEL_COST) levelUp();
  else if (G.gold >= 18 && G.level < MAX_LEVEL) levelUp();
  else if (G.gold >= 12 && G.shop.every((s) => !s || G.gold < UNITS_BY_ID[s.id].cost)) rollShop(false);

  // 有余钱就刷同名：3★ 以上要 9 / 27 张，只靠每波免费那批永远不够
  let rerolls = 0;
  while (late && G.gold >= 20 && rerolls++ < 30) {
    if (!rollShop(false)) break;
    const got = buyAll();
    fill();
    if (!got && G.gold < 32) break;
  }

  // 钱还多就扩一格备战席（上限 12 格：再多底栏放不下，也没必要）
  if (G.benchSize < Math.min(BENCH_MAX, 12) && G.gold >= benchCost(G.benchSize) + 12) buyBenchSlot();
  beginWave();
  return true;
}
