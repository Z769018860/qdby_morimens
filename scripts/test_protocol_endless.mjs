// 无尽关的规则回归：波次生成、强度曲线、星级无上限、备战席扩容、
// 「标准十二波就结束 / 无尽没有终点」的口径、结算字段。
// 跑法：node scripts/test_protocol_endless.mjs
import assert from 'node:assert/strict';
import { G, reset, beginWave, update, summary, buyBenchSlot } from '../js/pf/engine.js';
import {
  WAVES, waveCfg, ENEMY, ENEMY_TUNE, waveHpMul, waveAtkMul, endlessHpMul, endlessAtkMul,
  starMul, BENCH_SIZE, BENCH_MAX, benchCost,
} from '../js/pf/defs.js';

// 直接把这一波清空，下一帧 engine 会走 clearWave()
function sweep() { G.enemies = []; G.spawnQ = []; update(1 / 60); }
const isBoss = (k) => (ENEMY[k] || {}).cls === 'Boss';
// 与 defs.waveCfg 同一条规则：第 1 轮 +2，之后每轮 +3，封顶 +22
const addOf = (round) => Math.min(2 + (round - 1) * 3, 22);
const gapOf = (round) => Math.max(0.45, 1 - 0.05 * round);

// 1) 前十二波必须和 WAVES 一模一样，标准模式一个数字都不能变
for (let w = 1; w <= WAVES.length; w++) assert.equal(waveCfg(w), WAVES[w - 1], `第 ${w} 波不应改写`);

// 2) 第 13 波起是回响：普通怪按回响轮次加量、首领数量不动、间隔收紧、名字换成「回响」
for (const [w, round] of [[13, 1], [24, 1], [25, 2], [36, 2], [37, 3]]) {
  const base = WAVES[(w - 1) % WAVES.length];
  const cfg = waveCfg(w);
  assert.equal(cfg.endless, round, `第 ${w} 波应为第 ${round} 轮回响`);
  assert.equal(cfg.e.length, base.e.length, `第 ${w} 波构成条目数应与基准一致`);
  cfg.e.forEach(([key, count, gap], i) => {
    assert.equal(key, base.e[i][0]);
    const boss = isBoss(key);
    assert.equal(count, base.e[i][1] + (boss ? 0 : addOf(round)), `第 ${w} 波 ${key} 数量`);
    if (!boss) assert.ok(Math.abs(gap - base.e[i][2] * gapOf(round)) < 1e-9, `第 ${w} 波 ${key} 间隔应收紧`);
  });
  assert.match(cfg.n, new RegExp(`第 ${w} 波 · 回响${round}`));
  assert.ok(!/^第.*波 · 第/.test(cfg.n), '名字里不该叠两个「第 N 波」');
}

// 3) 数量封顶 +20：第 100 波（第 9 轮）不会无限膨胀
{
  const base = WAVES[99 % WAVES.length];
  const cfg = waveCfg(100);
  cfg.e.forEach(([key, count], i) => assert.equal(count, base.e[i][1] + (isBoss(key) ? 0 : addOf(8))));
  assert.equal(addOf(99), 22, '回响加兵必须封顶');
}

// 4) 强度曲线：十二波内是纯线性、第十三波起乘复利；标准模式一点没动
{
  for (let w = 1; w <= WAVES.length; w++) {
    assert.equal(endlessHpMul(w), 1, `第 ${w} 波不该吃无尽加成`);
    assert.equal(endlessAtkMul(w), 1, `第 ${w} 波不该吃无尽加成`);
    assert.ok(Math.abs(waveHpMul(w) - ENEMY_TUNE.hp * (1 + 0.10 * (w - 1))) < 1e-9);
    assert.ok(Math.abs(waveAtkMul(w) - ENEMY_TUNE.atk * (1 + 0.17 * (w - 1))) < 1e-9);
  }
  assert.ok(Math.abs(endlessHpMul(13) - 1.08) < 1e-9, '第十三波的生命复利首项应为 1.08');
  assert.ok(Math.abs(endlessAtkMul(13) - 1.05) < 1e-9, '第十三波的攻击复利首项应为 1.05');
  assert.ok(waveHpMul(30) > waveHpMul(12) * 4, '第 30 波的生命倍率应远高于线性外推');
  assert.ok(waveAtkMul(30) > waveAtkMul(12) * 3);
  assert.ok(waveHpMul(40) / waveHpMul(39) > 1.05, '后段每波都要有可感知的涨幅');
}

// 5) 星级没有上限：3★ 以上继续往上乘，且越往上每星收益越高（否则高星没意义）
{
  assert.equal(starMul(1), 1);
  assert.equal(starMul(3), 3.4);
  for (let s = 4; s <= 8; s++) assert.ok(starMul(s) > starMul(s - 1) * 1.5, `${s}★ 应该明显强于 ${s - 1}★`);
  assert.ok(starMul(6) > starMul(3) * 5, '6★ 应远超 3★');
}

// 6) 备战席可以花金币扩容：8 → 14，钱不够 / 到顶都要拒绝
{
  reset(11);
  assert.equal(G.benchSize, BENCH_SIZE);
  assert.equal(G.bench.length, BENCH_SIZE);
  G.gold = 500;
  let paid = 0;
  while (G.benchSize < BENCH_MAX) {
    const cost = benchCost(G.benchSize);
    const before = G.gold;
    assert.equal(buyBenchSlot(), true, `第 ${G.benchSize + 1} 格应能买`);
    assert.equal(before - G.gold, cost, '扣的金币要等于标价');
    paid += cost;
  }
  assert.equal(G.bench.length, BENCH_MAX, '数组长度要跟着涨');
  assert.ok(paid > 80 && paid < 140, `从 8 格买到 ${BENCH_MAX} 格的总价应在 80~140 金之间，实测 ${paid}`);
  assert.equal(buyBenchSlot(), false, '到顶之后不能再买');
  G.gold = 0;
  reset(12);
  G.gold = 0;
  assert.equal(buyBenchSlot(), false, '没钱不能扩');
  assert.equal(G.benchSize, BENCH_SIZE);
}

// 7) 标准模式：清完第 12 波就结束，不能再开第 13 波
reset(9);
G.endless = false;
G.wave = WAVES.length;
G.phase = 'fight';
sweep();
assert.equal(G.phase, 'win', '标准模式清完十二波应通关');
assert.equal(beginWave(), false, '标准模式不该能开第 13 波');
{
  const sm = summary();
  assert.equal(sm.total, WAVES.length);
  assert.equal(sm.endless, false);
  assert.equal(sm.cleared, WAVES.length);
}

// 8) 无尽关：清完第 12 波继续备战，能开第 13 波，波次继续累加
reset(9);
G.endless = true;
G.wave = WAVES.length;
G.phase = 'fight';
sweep();
assert.equal(G.phase, 'prep', '无尽关不该在十二波结束');
assert.ok(G.plan.length, '无尽关的第十三波要有出兵计划');
assert.equal(beginWave(), true, '无尽关要能开第 13 波');
assert.equal(G.wave, WAVES.length + 1);
assert.equal(G.phase, 'fight');

// 9) 无尽结算：没有终点（total=0），cleared 是真实波数，分数随波数上涨
reset(9);
G.endless = true;
G.wave = 17;
G.phase = 'fight';
sweep();
{
  const sm = summary();
  assert.equal(sm.endless, true);
  assert.equal(sm.total, 0);
  assert.equal(sm.cleared, 17);
  assert.ok(sm.score > 17 * 420, '分数应至少按波数计');
}

console.log('Endless wave generation, scaling, star cap removal, bench expansion and summary checks passed');
