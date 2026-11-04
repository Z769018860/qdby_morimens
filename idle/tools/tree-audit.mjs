// 黑流树海平衡体检：在 Node 里跑完整局（不碰 DOM），统计各难度的通关率 / 平均推进步数。
// 用法：node tools/tree-audit.mjs [每难度局数，默认 12]
// 分支策略固定「有战斗先打战斗，否则走第一条」、馈赠固定「先点亮强化」——
// 这是「中等偏上玩家」的基线，通关率目标：微光 ≥85%，低语 ~75%，树影 ~60%，深根 ~40%，黑流之心 ~25%。
import { readFileSync } from 'node:fs';
import { indexData, newState } from '../src/core/game.js';
import { mulberry32 } from '../src/core/rng.js';
import {
  TREE_DIFFS, TREE_STEPS, TREE_ACTS, treeState, startRun, pickBranch, fightNode, giftOptions,
  takeGift, takeOffer, rerollOffer, leaveNode, applyEvent, applyRest, enhOvr,
  TREE_GEAR, gearEquip, takeChest, takeSpring, takeShrine, offerPool,
} from '../src/core/treerun.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
const orders = (() => { try { return JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url))); } catch { return { items: [] }; } })();
pack.orders = orders.items || [];
const data = indexData(pack);

// 募队：按「价 / 战力」贪心挑 4 人（实战玩家也是这么挑的），总价 ≤ 100 黑露
function draftTeam(s) {
  const owned = Object.keys(s.roster).filter((x) => data.bySlug[x]);
  const scored = owned.map((slug) => {
    const a = data.bySlug[slug];
    const price = { Genesis: 26, SSR: 26, SR: 18, R: 12, N: 8 }[a.rarity] ?? 18;
    // 用影子练度（50 级无强化）估战力：直接借 baseStats 的口径——粗略取 scale.CON/ATK 加权和
    const p = (a.scale?.CON || 0) * 10 + (a.scale?.ATK || 0) * 2.2;
    return { slug, price, p, type: a.type };
  }).filter((x) => x.price <= 100).sort((a, b) => b.p - a.p);
  const team = [];
  let spent = 0;
  const pick = (type) => scored.find((x) => x.type === type && !team.includes(x.slug) && spent + x.price <= 100);
  for (const t of ['WARDEN', 'CHORUS']) { const c = pick(t); if (c) { team.push(c.slug); spent += c.price; } }
  for (const x of scored) if (team.length < 4 && !team.includes(x.slug) && spent + x.price <= 100) { team.push(x.slug); spent += x.price; }
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

function playRun(s, data, diffId) {
  const r0 = treeState(s);
  r0.cur = null;
  const { run, err } = Object.assign({ run: null }, startRun(s, data, diffId, draftTeam(s)));
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
      const [a, b] = run.branch;
      const pick = KIND_ORDER.indexOf(a) <= KIND_ORDER.indexOf(b) ? a : b;
      pickBranch(s, run, run.branch.indexOf(pick));
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
for (const d of TREE_DIFFS) {
  let win = 0, bestAct = 0, score = 0, enh = 0;
  for (let i = 0; i < N; i++) {
    const s = newState(data, 1000 + i);
    // 给一支「中期账号」的名册：全角色 50 级 0 叠，装备不配（树海起步白板口径）
    for (const a of data.awakeners) s.roster[a.slug] = { lv: 50, star: 0, brk: 3 };
    s.seed = (i * 2654435761) >>> 0;
    const { end, err } = playRun(s, data, d.id);
    if (err) { console.log(`  ${d.zh}: ERR ${err}`); break; }
    if (end?.win) win++;
    if (end) { bestAct = Math.max(bestAct, end.act + 1); score += end.score; enh = Math.max(enh, end.enh); }
  }
  console.log(`${d.zh.padEnd(5, '　')} scale ${d.scale.toFixed(2)} off ${String(d.off).padStart(3)} → 通关 ${win}/${N}　均分 ${Math.round(score / N)}　最远第 ${bestAct + 1} 层`);
}
