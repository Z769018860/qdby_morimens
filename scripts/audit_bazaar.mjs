#!/usr/bin/env node
// 《大巴扎：银钥》核心模糊测试：随机乱买 / 乱换 / 乱卖 / 乱选事件 / 乱切界域商店 / 打到有结果，
// 每一步查不变量（格子不超 15、站位顺序与人 / 命轮对齐、uid 不重复、仓库不超限、金币不为负、数值有限）。
//   node scripts/audit_bazaar.mjs [局数，默认 200]
import {
  newRun, createFight, autoFight, settle, buy, canBuy, rollShop, expandCore, coreCostOf, moveHero,
  benchStore, benchDeploy, sell, usedSlots, layoutOf, planOf, applyEvent, setShopRealm, TUNING, ALL_EVENTS, DIFFS, PACTS,
} from '../js/bazaar-core.js';

const N = Number(process.argv[2] || 200);
const issues = new Map();
const note = (k, d) => { const e = issues.get(k) || { n: 0, ex: d }; e.n++; issues.set(k, e); };
let rs = 777;
const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
const pickR = (a) => a[Math.floor(rnd() * a.length)];

function check(run, tag) {
  const cells = usedSlots(run);
  if (cells > TUNING.fieldSlots) note('格子超过上限', `${cells}>${TUNING.fieldSlots} @${tag}`);
  const ids = [...run.squad.map((h) => h.uid), ...run.wheels.map((w) => w.uid), ...run.relics.map((r) => r.uid), ...run.bench.map((b) => b.uid)];
  if (new Set(ids).size !== ids.length) note('uid 重复', `@${tag}`);
  const lay = layoutOf(run);
  const fieldIds = new Set([...run.squad.map((h) => h.uid), ...run.wheels.map((w) => w.uid)]);
  if (lay.length !== fieldIds.size || !lay.every((e) => fieldIds.has(e.uid))) note('站位顺序与场上单位不一致', `@${tag}`);
  if (lay.length && lay[lay.length - 1].start + lay[lay.length - 1].len !== cells) note('站位格数与占用格数不一致', `@${tag}`);
  if (run.bench.length > TUNING.benchSlots + 2) note('仓库超限', `${run.bench.length}`);
  if (!(run.gold >= 0)) note('金币为负或不是数', `${run.gold} @${tag}`);
  if (run.shop.length > TUNING.shopSize + 2) note('商店摊位过多', `${run.shop.length}`);
  const p = planOf(run);
  for (const k of ['gen', 'need', 'cap']) if (!Number.isFinite(p[k])) note('planOf 非有限数', `${k}=${p[k]}`);
}

let games = 0, wins = 0, fights = 0, retries = 0;
for (let g = 0; g < N; g++) {
  const diffId = DIFFS[g % DIFFS.length].id;
  const pactId = PACTS[g % PACTS.length].id;
  const run = newRun({ seed: 9000 + g * 131, pactId, diffId });
  games++;
  let guard = 0;
  while (!run.over && guard++ < 80) {
    try {
      // 先处理战后事件
      if (run.pendingEvent) {
        const ev = ALL_EVENTS.find((e) => e.id === run.pendingEvent);
        applyEvent(run, run.pendingEvent, Math.floor(rnd() * (ev ? ev.opts.length : 1)));
        run.pendingEvent = null;
        check(run, 'event');
      }
      for (let a = 0; a < 14; a++) {
        const r = rnd();
        if (r < 0.34 && run.shop.length) { const i = Math.floor(rnd() * run.shop.length); if (canBuy(run, i)) buy(run, i); }
        else if (r < 0.42) rollShop(run);
        else if (r < 0.5) expandCore(run);
        else if (r < 0.6 && run.bench.length) { const b = pickR(run.bench); const out = rnd() < 0.5 ? pickR([...run.squad, ...run.wheels]) : null; benchDeploy(run, b.uid, out ? out.uid : null); }
        else if (r < 0.7 && (run.squad.length + run.wheels.length)) benchStore(run, pickR([...run.squad, ...run.wheels]).uid);
        else if (r < 0.78 && (run.squad.length + run.wheels.length + run.bench.length + run.relics.length)) sell(run, pickR([...run.squad, ...run.wheels, ...run.bench, ...run.relics]).uid);
        else if (r < 0.9 && run.order && run.order.length) moveHero(run, pickR(run.order), Math.floor(rnd() * run.order.length));
        else if (r < 0.95) setShopRealm(run, pickR([null, 'CHAOS', 'CARO', 'AEQUOR', 'ULTRA']));
        check(run, 'shop');
      }
      if (!run.squad.length) { // 没人就买一个最便宜的
        const i = run.shop.findIndex((o, k) => o.kind === 'hero' && canBuy(run, k));
        if (i >= 0) buy(run, i); else { run.gold += 30; rollShop(run); continue; }
      }
      const f = createFight(run);
      autoFight(f);
      fights++;
      if (!f.over) note('战斗没有结果', `t=${f.t}`);
      if (!Number.isFinite(f.p.hp) || !Number.isFinite(f.e.hp)) note('战斗血量非有限数', `p=${f.p.hp} e=${f.e.hp}`);
      const res = settle(run, f);
      if (res.retry) retries++;
      check(run, 'settle');
    } catch (e) {
      note('抛异常', `${e.message.split('\n')[0]} @ ${(e.stack || '').split('\n')[1]?.trim()}`);
      break;
    }
  }
  if (run.cleared) wins++;
  if (guard >= 80) note('一局超过 80 轮仍未结束', `diff=${diffId}`);
}
console.log(`大巴扎模糊测试：${games} 局 / ${fights} 场战斗，通关 ${wins}，输后重打 ${retries} 次`);
if (!issues.size) console.log('未发现问题');
for (const [k, v] of issues) console.log(`· ${k} ×${v.n}  例：${v.ex}`);
process.exit(issues.size ? 1 : 0);
