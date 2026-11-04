// 红流树海平衡体检：在 Node 里跑完整局（不碰 DOM），统计各难度的通关率 / 平均推进步数。
// 用法：node tools/tree-audit.mjs [每难度局数，默认 12]
// 分支策略固定「有战斗先打战斗，否则走第一条」、馈赠固定「先点亮强化」——
// 这是「中等偏上玩家」的基线，通关率目标：微光 ≥85%，低语 ~75%，树影 ~60%，深根 ~40%，红流之心 ~25%。
import { readFileSync } from 'node:fs';
import { indexData, newState } from '../src/core/game.js';
import { mulberry32 } from '../src/core/rng.js';
import {
  TREE_DIFFS, TREE_STEPS, TREE_ACTS, treeState, startRun, pickBranch, fightNode, giftOptions,
  takeGift, takeOffer, rerollOffer, leaveNode, applyEvent, applyRest, enhOvr,
  TREE_GEAR, gearEquip, takeChest, takeSpring, takeShrine, offerPool,
  TREE_SQUADS, TREE_BUDGET, priceOf, draftCaps,
} from '../src/core/treerun.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
const orders = (() => { try { return JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url))); } catch { return { items: [] }; } })();
pack.orders = orders.items || [];
const data = indexData(pack);

// 募队：按「价 / 战力」贪心挑人（实战玩家也是这么挑的），总价 ≤ 预算（默认 100 黑露，分队会改）。
// 先凑满主力（teamCap 人），预算还有剩就继续补仓库——真实玩家也会这么干（多的人能换着上）。
function draftTeam(s, budget = TREE_BUDGET, teamCap = 4, poolMax = 8, disc = 0) {
  const owned = Object.keys(s.roster).filter((x) => data.bySlug[x]);
  const scored = owned.map((slug) => {
    const a = data.bySlug[slug];
    const price = priceOf(data, slug, disc);
    // 用影子练度（50 级无强化）估战力：直接借 baseStats 的口径——粗略取 scale.CON/ATK 加权和
    const p = (a.scale?.CON || 0) * 10 + (a.scale?.ATK || 0) * 2.2;
    return { slug, price, p, type: a.type };
  }).filter((x) => x.price <= budget).sort((a, b) => b.p - a.p);
  const team = [];
  let spent = 0;
  const pick = (type) => scored.find((x) => x.type === type && !team.includes(x.slug) && spent + x.price <= budget);
  for (const t of ['WARDEN', 'CHORUS']) { const c = pick(t); if (c) { team.push(c.slug); spent += c.price; } }
  for (const x of scored) if (team.length < teamCap && !team.includes(x.slug) && spent + x.price <= budget) { team.push(x.slug); spent += x.price; }
  return team;
}

const KIND_ORDER = ['elite', 'hunt', 'battle', 'chest', 'event', 'trial', 'shop', 'shrine', 'rest', 'spring'];
/** 模拟玩家：进战斗前把仓库里的装备按「环给人、契令上全队」装上 */
function autoEquip(s, run) {
  const g = run.gear || {};
  const eq = new Set([...Object.values(g.ring || {}), ...(g.pact || []), ...(g.order || [])]);
  for (const it of (g.pool || [])) {
    if (eq.has(it.uid)) continue;
    const def = TREE_GEAR.find((x) => x.id === it.defId);
    if (!def) continue;
    if (def.kind === 'ring') {
      const target = (run.slugs || []).find((sl) => !g.ring[sl]);
      if (target) gearEquip(s, run, it.uid, target);
    } else gearEquip(s, run, it.uid);
  }
}

function playRun(s, data, diffId, squadId = null) {
  const r0 = treeState(s);
  r0.cur = null;
  const sid = squadId || TREE_SQUADS[0].id;
  const caps = draftCaps(s, sid);
  const { run, err } = Object.assign({ run: null }, startRun(s, data, diffId, draftTeam(s, caps.budget, caps.teamMax, caps.poolMax, caps.recruit), sid));
  if (!run) return { err };
  const st = treeState(s);
  let guard = 0;
  while (st.cur === run && guard++ < 240) {
    if (run.gift) {
      const g = giftOptions(s, data, run);
      if (g.enh) takeGift(s, data, run, 'enh');
      else if (g.relics.length) takeGift(s, data, run, 'relic', g.relics[0].id);
      else takeGift(s, data, run, 'glow');
      continue;
    }
    if (run.branch) {
      // 三岔路时挑「优先级最高」的那条（KIND_ORDER 越靠前越优先）
      let best = 0;
      for (let i = 1; i < run.branch.length; i++) {
        if (KIND_ORDER.indexOf(run.branch[i]) < KIND_ORDER.indexOf(run.branch[best])) best = i;
      }
      pickBranch(s, run, best, data);
      continue;
    }
    if (run.chest) { takeChest(s, run, run.chest[0].id); continue; }
    if (run.spring) { takeSpring(s, run, 0); continue; }
    if (run.shrine) { takeShrine(s, run, run.shrine[0].id); continue; }
    if (run.ev) { const out = applyEvent(s, run, 0); if (out?.err) leaveNode(s, run); continue; }
    if (run.rest) { applyRest(s, run, 0); continue; }
    if (run.shop) { leaveNode(s, run); continue; }
    if (run.kind) {
      autoEquip(s, run);
      const r = fightNode(s, data, run);
      if (!r) break;
      if (r.res.win && st.cur === run) {
        run.offer = offerPool(s, data, run, 3);
        const first = (run.offer || [])[0];
        if (first) takeOffer(s, data, run, first.id); else run.offer = null;
      }
      continue;
    }
    break;
  }
  return { end: run.end || null, err: null };
}

const N = Number(process.argv[2]) || 12;
const SQ = process.argv[3] || null;      // 指定分队（如 s_hunt）；不给就按每个难度跑第一支
for (const d of TREE_DIFFS) {
  let win = 0, bestAct = 0, score = 0, enh = 0;
  for (let i = 0; i < N; i++) {
    const s = newState(data, 1000 + i);
    // 给一支「中期账号」的名册：全角色 50 级 0 叠，装备不配（树海起步白板口径）
    for (const a of data.awakeners) s.roster[a.slug] = { lv: 50, star: 0, brk: 3 };
    s.seed = (i * 2654435761) >>> 0;
    const { end, err } = playRun(s, data, d.id, SQ);
    if (err) { console.log(`  ${d.zh}: ERR ${err}`); break; }
    if (end?.win) win++;
    if (end) { bestAct = Math.max(bestAct, end.act + 1); score += end.score; enh = Math.max(enh, end.enh); }
  }
  console.log(`${d.zh.padEnd(5, '　')} scale ${d.scale.toFixed(2)} off ${String(d.off).padStart(3)} → 通关 ${win}/${N}　均分 ${Math.round(score / N)}　最远第 ${bestAct + 1} 层`);
}
// 分队横评：固定「树影」难度各跑一轮——这一档有区分度（低语太松，全 100% 看不出差别）。
// 注意：组队用的是「scale 估值」，和实战强弱不完全一致（比如 ryker 估值高、打起来不如 baiyun），
// 所以 14 局这种小样本里 ±2 局是噪声，别把 7/14 当成「这支分队弱一半」。
if (!SQ) {
  console.log('\n分队横评（树影难度）');
  for (const q of TREE_SQUADS) {
    let win = 0;
    for (let i = 0; i < N; i++) {
      const s = newState(data, 2000 + i);
      for (const a of data.awakeners) s.roster[a.slug] = { lv: 50, star: 0, brk: 3 };
      s.seed = (i * 2654435761) >>> 0;
      const { end } = playRun(s, data, 'shade', q.id);
      if (end?.win) win++;
    }
    console.log(`${q.zh.padEnd(5, '　')} → 通关 ${win}/${N}`);
  }
}
