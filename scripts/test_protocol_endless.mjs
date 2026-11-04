// 无尽关（v1.3.0）的规则回归：波次生成、无尽与标准的结束口径、结算字段。
// 跑法：node scripts/test_protocol_endless.mjs
import assert from 'node:assert/strict';
import { G, reset, beginWave, update, summary } from '../js/pf/engine.js';
import { WAVES, waveCfg, ENEMY } from '../js/pf/defs.js';

// 直接把这一波清空，下一帧 engine 会走 clearWave()
function sweep() { G.enemies = []; G.spawnQ = []; update(1 / 60); }
const isBoss = (k) => (ENEMY[k] || {}).cls === 'Boss';

// 1) 前十二波必须和 WAVES 一模一样，标准模式一个数字都不能变
for (let w = 1; w <= WAVES.length; w++) assert.equal(waveCfg(w), WAVES[w - 1], `第 ${w} 波不应改写`);

// 2) 第 13 波起是回响：普通怪 +1，首领数量不动，名字换成「回响」
for (const [w, round] of [[13, 1], [24, 1], [25, 2], [36, 2], [37, 3]]) {
  const base = WAVES[(w - 1) % WAVES.length];
  const cfg = waveCfg(w);
  assert.equal(cfg.endless, round, `第 ${w} 波应为第 ${round} 轮回响`);
  assert.equal(cfg.e.length, base.e.length, `第 ${w} 波构成条目数应与基准一致`);
  cfg.e.forEach(([key, count], i) => {
    assert.equal(key, base.e[i][0]);
    assert.equal(count, base.e[i][1] + (isBoss(key) ? 0 : round), `第 ${w} 波 ${key} 数量`);
  });
  assert.match(cfg.n, new RegExp(`第 ${w} 波 · 回响${round}`));
  assert.ok(!/^第.*波 · 第/.test(cfg.n), '名字里不该叠两个「第 N 波」');
}

// 3) 数量加成封顶 +6：第 100 波（第 9 轮）不会无限膨胀
{
  const base = WAVES[99 % WAVES.length];
  const cfg = waveCfg(100);
  cfg.e.forEach(([key, count], i) => assert.equal(count, base.e[i][1] + (isBoss(key) ? 0 : 6)));
}

// 4) 标准模式：清完第 12 波就结束，不能再开第 13 波
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

// 5) 无尽关：清完第 12 波继续备战，能开第 13 波，波次继续累加
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

// 6) 无尽结算：没有终点（total=0），cleared 是真实波数，分数随波数上涨
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

console.log('Endless wave generation, standard/endless finish rules and summary checks passed');
