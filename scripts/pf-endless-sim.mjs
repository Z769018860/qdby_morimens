// 无尽关平衡测量：用和页面里 ?_test=1 同一套机器人决策（买人 / 补装备 / 升级 / 开战），
// 跑固定种子批量，看标准模式（十二波通关率）和无尽关（爬到第几波）分别落在什么区间。
//
// 跑法：
//   node scripts/pf-endless-sim.mjs            # 标准 16 局 + 无尽 16 局（标准难度）
//   node scripts/pf-endless-sim.mjs 24 hard    # 局数 / 难度
//   node scripts/pf-endless-sim.mjs 12 both    # 标准与癫狂各跑一遍无尽
import {
  G, reset, beginWave, update, summary, buy, place, equip, buyItem, levelUp, rollShop,
  deployed, freeCell, UNITS_BY_ID,
} from '../js/pf/engine.js';
import { INV_SIZE, MAX_LEVEL, LEVEL_COST, WAVES } from '../js/pf/defs.js';

const MOD = {
  normal: { hp: 1, atk: 1, credit: 1 },
  hard: { hp: 1.5, atk: 2.1, credit: 1.6 },
};

// 与 js/protocol.js 的 __pf.think 保持一致：摆满 → 买（能合成的优先）→ 补装备并装上 → 升级/刷新 → 开战
function think() {
  if (G.phase !== 'prep') return;
  const fill = () => {
    for (const u of G.units.slice()) {
      if (deployed() >= G.level) break;
      if (u.cell >= 0) continue;
      const c = freeCell(u.def.role);
      if (c >= 0) place(u.uid, c);
    }
  };
  fill();
  for (let i = 0; i < G.shop.length; i++) {
    const s = G.shop[i];
    if (!s) continue;
    const d = UNITS_BY_ID[s.id];
    if (G.gold < d.cost) continue;
    const owned = G.units.filter((u) => u.id === s.id).length;
    if (owned > 0 || G.gold >= d.cost + 7 || G.units.length < 4) buy(i);
  }
  fill();
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
  beginWave();
}

function run(seed, diff, endless) {
  reset(seed);
  G.endless = endless;
  G.mod = MOD[diff] || MOD.normal;
  G.phase = 'prep';
  let t = 0, guard = 0;
  // 上限 90 分钟游戏内时间：无尽关也会在核心归零时自然停，这道闸只防死循环
  while (t < 60 * 90 && G.phase !== 'over' && G.phase !== 'win' && guard++ < 60 * 60 * 60) {
    if (G.phase === 'prep') think();
    update(1 / 20);
    t += 1 / 20;
  }
  const sm = summary();
  return { seed, reached: sm.cleared, score: sm.score, core: G.core, win: sm.win, t: Math.round(t) };
}

const n = Math.max(1, Number(process.argv[2]) || 16);
const diffArg = process.argv[3] || 'normal';
const diffs = diffArg === 'both' ? ['normal', 'hard'] : [diffArg];

const avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)).toFixed(1);
const pct = (a, f) => Math.round((a.filter(f).length / Math.max(1, a.length)) * 100) + '%';

for (const diff of diffs) {
  // 标准模式：确认改无尽关没有动到十二波的通关率
  const std = Array.from({ length: n }, (_, i) => run(1000 + i * 37, diff, false));
  console.log(`[${diff}] 标准模式 ${n} 局：通关 ${pct(std, (r) => r.win)}，平均第 ${avg(std.map((r) => r.reached))} 波，平均 ${avg(std.map((r) => r.t))} 秒`);

  const end = Array.from({ length: n }, (_, i) => run(2000 + i * 37, diff, true));
  console.log(`[${diff}] 无尽关 ${n} 局：平均第 ${avg(end.map((r) => r.reached))} 波（最深 ${Math.max(...end.map((r) => r.reached))}，最浅 ${Math.min(...end.map((r) => r.reached))}）`);
  console.log(`        过十二波 ${pct(end, (r) => r.reached >= WAVES.length)}，过十八波 ${pct(end, (r) => r.reached >= 18)}，过二十四波 ${pct(end, (r) => r.reached >= 24)}`);
  console.log(`        波次分布：${end.map((r) => r.reached).sort((a, b) => a - b).join(' ')}`);
  console.log(`        平均分 ${avg(end.map((r) => r.score))}，平均时长 ${avg(end.map((r) => r.t))} 秒`);
}
