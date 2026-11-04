#!/usr/bin/env node
// 《唤醒体幸存者》引擎审计：不开浏览器，直接在 node 里跑引擎，找「卡死 / 抛异常 / 数值坏掉 / 道具失效」。
//   node scripts/audit_survivors.mjs [每个角色局数] [模拟秒数]
// 每局：自动选卡（随机偏好）、随机放狂气、随机用道具、定期给道具；每帧查不变量。
import * as E from '../js/sv/engine.js';
import { CHARS } from '../js/sv/gen.js';
import { DIFFS, ITEMS } from '../js/sv/defs.js';

const N = Number(process.argv[2] || 2);
const SECS = Number(process.argv[3] || 420);
const issues = new Map();
const note = (k, d) => { if (!issues.has(k)) issues.set(k, { n: 0, ex: d }); issues.get(k).n++; };

// 引擎里偶尔会碰 window / document / performance，补个最小桩
globalThis.window ||= { addEventListener() {}, innerWidth: 800, innerHeight: 600 };
globalThis.document ||= { getElementById: () => null, addEventListener() {}, querySelector: () => null };

let runs = 0, stalls = 0, maxEnemies = 0, diceUsed = 0, diceTried = 0;
const STEP = Number(process.env.STEP || 1);       // STEP=6：每 6 个角色抽 1 个（整局 15 分钟很慢）
for (const c of CHARS.filter((_, i) => i % STEP === 0)) {
  for (let r = 0; r < N; r++) {
    const diff = DIFFS[(r + 1) % DIFFS.length].k;
    E.setSeed(1000 + r * 97 + Number(c.id));
    try { E.reset(c.id, diff); } catch (e) { note('reset 抛异常', `${c.id}: ${e.message}`); continue; }
    runs++;
    const G = E.G;
    let t = 0, stuck = 0, lastLv = G.lv, lastPhaseT = 0;
    const dt = 1 / 60;
    while (t < SECS && G.phase !== 'over' && G.phase !== 'end') {
      try {
        if (G.phase === 'levelup') {
          // 三选一：先看骰子，再随机选 / 跳过
          if (!G.choices.length) { note('升级面板没有卡', `${c.id} lv${G.lv}`); E.skipChoice(); continue; }
          if (G.items.some((i) => i.id === 'i_dice') && Math.random() < 0.5) {
            diceTried++;
            const before = G.items.length;
            if (E.useDice()) { diceUsed++; if (G.items.length !== before - 1) note('骰子没被消耗', `${c.id}`); }
            else note('有骰子却没法重掷', `${c.id} choices=${G.choices.length}`);
          }
          const i = Math.random() < 0.1 ? -1 : Math.floor(Math.random() * G.choices.length);
          if (i < 0) E.skipChoice(); else E.applyChoice(G.choices[i]);
          if (G.phase === 'levelup' && !G.choices.length) { note('选完后仍卡在升级且无卡', `${c.id}`); G.phase = 'run'; }
          continue;
        }
        if (G.phase === 'run') {
          if (Math.random() < 0.002) E.addItem(ITEMS[Math.floor(Math.random() * ITEMS.length)].id);
          if (Math.random() < 0.003 && G.items.length) E.useItem(G.items[0].id);
          if (Math.random() < 0.004) E.releaseRage();
          G.player.ix = Math.cos(t * 0.7); G.player.iy = Math.sin(t * 0.5);
        }
        E.update(dt);
        t += dt;
      } catch (e) {
        note('update / 操作抛异常', `${c.id} t=${t.toFixed(1)} ${e.message.split('\n')[0]} @ ${(e.stack || '').split('\n')[1]}`);
        break;
      }
      const P = G.player;
      if (!Number.isFinite(P.x) || !Number.isFinite(P.y) || !Number.isFinite(P.hp) || !Number.isFinite(P.maxHp)) { note('玩家数值 NaN', `${c.id} t=${t.toFixed(1)}`); break; }
      if (P.hp > P.maxHp + 1e-6) note('血量超过上限', `${c.id}`);
      maxEnemies = Math.max(maxEnemies, G.enemies.length);
      if (G.enemies.length > 400) note('敌人数量失控', `${c.id} ${G.enemies.length}`);
      if (G.items.length > 3) note('道具超过持有上限', `${c.id} ${G.items.length}`);
      if (G.enemies.some((e) => !Number.isFinite(e.hp) || !Number.isFinite(e.x))) { note('敌人数值 NaN', `${c.id}`); break; }
      // 卡死检测：游戏时间不走 + 不是升级面板
      if (G.t === lastPhaseT && G.phase === 'run') { if (++stuck > 600) { note('时间停转（卡死）', `${c.id} t=${t.toFixed(1)}`); stalls++; break; } } else { stuck = 0; lastPhaseT = G.t; }
      if (G.phase === 'pause') G.phase = 'run';
    }
  }
}
console.log(`角色 ${CHARS.length} × ${N} 局，约 ${SECS}s/局：共 ${runs} 局；最大同屏敌人 ${maxEnemies}；骰子尝试 ${diceTried} 用成 ${diceUsed}`);
if (!issues.size) console.log('未发现问题');
for (const [k, v] of issues) console.log(`· ${k} ×${v.n}  例：${v.ex}`);
process.exit(issues.size ? 1 : 0);
