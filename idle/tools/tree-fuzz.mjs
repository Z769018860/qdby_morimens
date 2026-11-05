// 红流树海模糊测试：随机乱走（所有岔路类型、所有选项、乱换阵容 / 装备 / 招募 / 买东西），
// 找「抛异常 / 数值坏掉 / 状态卡死 / 花了钱没拿到东西」。
// 用法：node tools/tree-fuzz.mjs [局数，默认 60]
import { readFileSync } from 'node:fs';
import { indexData, newState } from '../src/core/game.js';
import {
  TREE_DIFFS, TREE_SQUADS, treeState, startRun, pickBranch, fightNode, giftOptions, takeGift,
  takeOffer, rerollOffer, leaveNode, applyEvent, applyRest, TREE_GEAR, gearEquip, gearUnequip, takeChest, takeSpring,
  takeShrine, offerPool, shopBuy, shopStock, setLineup, recruitMember, draftCaps, priceOf, teamMax, poolCap,
  buyTalent, TREE_TALENTS, chestOptions, springOptions, shrineOptions, REST_OPTS,
} from '../src/core/treerun.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
pack.orders = (() => { try { return JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url))).items || []; } catch { return []; } })();
const data = indexData(pack);
const N = Number(process.argv[2]) || 60;
const issues = new Map();
const note = (k, d) => { const e = issues.get(k) || { n: 0, ex: d }; e.n++; issues.set(k, e); };
let rs = 12345;
const rnd = () => { rs = (Math.imul(rs, 1664525) + 1013904223) >>> 0; return rs / 4294967296; };
const pickR = (a) => a[Math.floor(rnd() * a.length)];
const finite = (o, path) => { for (const [k, v] of Object.entries(o || {})) if (typeof v === 'number' && !Number.isFinite(v)) note('数值不是有限数', `${path}.${k}=${v}`); };

let runs = 0, wins = 0, steps = 0, spentLost = 0;
for (let i = 0; i < N; i++) {
  const s = newState(data, 5000 + i);
  for (const a of data.awakeners) s.roster[a.slug] = { lv: 50, star: 0, brk: 3 };
  s.seed = (i * 2654435761) >>> 0;
  const st = treeState(s);
  // 随机买几级天赋
  st.points = 400;
  for (let k = 0; k < 20; k++) try { buyTalent(s, pickR(TREE_TALENTS).id); } catch (e) { note('buyTalent 抛异常', e.message); }
  const diff = pickR(TREE_DIFFS).id;
  const squad = pickR(TREE_SQUADS).id;
  const caps = draftCaps(s, squad);
  const owned = Object.keys(s.roster);
  const picks = [];
  let spent = 0;
  for (const sl of owned.sort(() => rnd() - 0.5)) {
    const p = priceOf(data, sl, caps.recruit);
    if (picks.length < caps.poolMax && spent + p <= caps.budget) { picks.push(sl); spent += p; }
  }
  let r0;
  try { r0 = startRun(s, data, diff, picks, squad); } catch (e) { note('startRun 抛异常', e.message); continue; }
  if (!r0.run) { note('startRun 返回错误', r0.err); continue; }
  const run = r0.run;
  runs++;
  let guard = 0;
  while (st.cur === run && guard++ < 400) {
    steps++;
    try {
      // 乱动：阵容 / 装备 / 招募
      if (rnd() < 0.25) setLineup(s, run, run.pool.slice().sort(() => rnd() - 0.5).slice(0, 1 + Math.floor(rnd() * 5)));
      if (rnd() < 0.2) {
        const it = pickR(run.gear.pool || [null]);
        if (it) { if (rnd() < 0.5) gearUnequip(s, run, it.uid); else gearEquip(s, run, it.uid, pickR(run.slugs)); }
      }
      if (rnd() < 0.1) recruitMember(s, data, run, pickR(owned));
      if (run.slugs.length > teamMax(run)) note('上场人数超过上限', `${run.slugs.length}>${teamMax(run)}`);
      if (run.pool.length > poolCap(run)) note('仓库人数超过上限', `${run.pool.length}>${poolCap(run)}`);
      if (run.glow < 0) note('余晖为负', String(run.glow));
      for (const sl of run.slugs) if (!run.pool.includes(sl)) note('上场的人不在仓库里', sl);
      finite(run, 'run');

      if (run.gift) {
        const g = giftOptions(s, data, run);
        const opts = [];
        if (g.enh) opts.push(['enh']);
        for (const r of g.relics || []) opts.push(['relic', r.id]);
        opts.push(['glow']);
        const o = pickR(opts);
        takeGift(s, data, run, o[0], o[1]);
        continue;
      }
      if (run.branch) { pickBranch(s, run, Math.floor(rnd() * run.branch.length), data); continue; }
      if (run.chest) { takeChest(s, run, pickR(run.chest).id); continue; }
      if (run.spring) { takeSpring(s, run, Math.floor(rnd() * 3)); continue; }
      if (run.shrine) { takeShrine(s, run, pickR(run.shrine).id); continue; }
      if (run.ev) { const o = applyEvent(s, run, Math.floor(rnd() * ((run.ev.opts || run.ev.options || [1, 2]).length))); if (o?.err && rnd() < 0.5) leaveNode(s, run); continue; }
      if (run.rest) { applyRest(s, run, Math.floor(rnd() * REST_OPTS.length)); continue; }
      if (run.shop) {
        // 乱买：钱够就买；记「扣了钱却报错」
        for (let k = 0; k < 4 && run.shop.length; k++) {
          const idx = Math.floor(rnd() * run.shop.length);
          const before = run.glow, price = run.shop[idx].price, len = run.shop.length;
          const out = shopBuy(s, run, idx);
          if (out.err && before >= price && (run.glow < before || run.shop.length !== len)) { spentLost++; note('买东西报错但已扣钱', `${run.shop[idx]?.type || '?'}: ${out.err}（${before}→${run.glow}）`); }
        }
        leaveNode(s, run);
        continue;
      }
      if (run.offer) {
        if (rnd() < 0.3) rerollOffer(s, data, run);
        if (run.offer && run.offer.length) takeOffer(s, data, run, pickR(run.offer).id); else run.offer = null;
        continue;
      }
      if (run.kind) {
        if (['battle', 'elite', 'hunt', 'boss'].includes(run.kind)) {
          // 活着的人才能上
          const live = run.pool.filter((x) => (run.hp[x] ?? 1) > 0.001);
          if (live.length) setLineup(s, run, live.slice(0, teamMax(run)));
          const r = fightNode(s, data, run);
          if (!r) break;
          if (r.res.win && st.cur === run) { run.offer = offerPool(s, data, run, 3); if (!run.offer?.length) run.offer = null; }
        } else leaveNode(s, run);
        continue;
      }
      note('无处可去（状态卡死）', JSON.stringify({ branch: run.branch, kind: run.kind, node: run.node, act: run.act }));
      break;
    } catch (e) {
      note('抛异常', `${e.message.split('\n')[0]} @ ${(e.stack || '').split('\n')[1]?.trim()}`);
      break;
    }
  }
  if (guard >= 400) note('一局超过 400 步仍未结束', `diff=${diff}`);
  if (run.end?.win) wins++;
}
console.log(`树海模糊测试：${runs} 局 / ${steps} 步，通关 ${wins}；买东西报错却已扣钱 ${spentLost} 次`);
if (!issues.size) console.log('未发现问题');
for (const [k, v] of issues) console.log(`· ${k} ×${v.n}  例：${v.ex}`);
process.exit(issues.size ? 1 : 0);
