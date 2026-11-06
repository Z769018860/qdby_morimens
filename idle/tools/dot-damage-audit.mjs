// 伤害量级审计：主线 / 守关 各关「反击 / 中毒 / 直伤」的实际数字，以及它们占目标血量的比例。
// 用来回答「XX 关一下反击打 40 万是不是过头了」，改数值前后各跑一次就能对照。
// 主线把账号做成满养成（159 级 / 99 叠 / 超限 99 / 法则 30 + 全套装备），守关按算力随机搜阵容。
// 用法：node tools/dot-damage-audit.mjs main|den
import fs from 'node:fs';
import * as G from '../src/core/game.js';
import * as D from '../src/core/denrun.js';
import { domainRules } from '../src/core/enemies.js';

const pack = JSON.parse(fs.readFileSync(new URL('../public/data/game-data.json', import.meta.url)));
pack.orders = JSON.parse(fs.readFileSync(new URL('../public/data/orders.json', import.meta.url))).items || [];
let sp = {};
try { sp = JSON.parse(fs.readFileSync(new URL('../public/data/special.json', import.meta.url))); } catch {}
const data = G.indexData({ ...pack, special: sp });

const mode = process.argv[2] || 'main';
const pad = (s, n) => String(s).padEnd(n);
const padl = (s, n) => String(s).padStart(n);
const w = (x) => (x >= 10000 ? (Math.round(x / 1000) / 10) + 'w' : Math.round(x).toString());

const s = G.newState(data, 1);
s.roster = {};
for (const a of data.awakeners) s.roster[a.slug] = { lv: 159, star: 99, brk: 6, od: 99, law: 30 };
s.gold = 50000000; s.tickets = 2000;
for (let i = 0; i < 60; i++) G.equipPull(s, data, 10);
G.autoLoadout(s, data);
s.strategy = { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' };

if (mode === 'main') {
  console.log(pad('关', 5) + pad('域规', 15) + pad('我方HP', 8) + pad('受直伤', 8) + pad('受反击', 8) + pad('反击/HP', 8) + pad('毒每跳', 8) + pad('出直伤', 8) + pad('出反击', 8) + pad('出毒', 8) + ' 胜');
  for (const stage of [100, 110, 120, 125, 130, 132, 135, 140, 150, 160]) {
    const agg = { hp: 0, takeD: 0, takeC: 0, takeP: 0, outD: 0, outC: 0, outP: 0, win: 0, n: 0 };
    for (let k = 0; k < 3; k++) {
      s.stage = stage; s.seed = (stage * 7919 + k * 13) >>> 0;
      const r = G.runBattle(s, data, stage);
      const hp = r.prep.allies.reduce((x, d) => x + (d.hp || 0), 0);
      const st = { hp, takeD: 0, takeC: 0, takeP: 0, outD: 0, outC: 0, outP: 0, win: r.win };
      for (const e of r.events) {
        if (e.amt == null) continue;
        const toAlly = (e.who || '').startsWith('a');
        const toEnemy = (e.who || '').startsWith('e');
        if (e.k === 'dmg' && toAlly) st.takeD = Math.max(st.takeD, e.amt);
        if (e.k === 'counter' && toAlly) st.takeC = Math.max(st.takeC, e.amt);
        if (e.k === 'dot' && toAlly) st.takeP = Math.max(st.takeP, e.amt);
        if (e.k === 'dmg' && toEnemy) st.outD += e.amt;
        if (e.k === 'counter' && toEnemy) st.outC += e.amt;
        if (e.k === 'dot' && toEnemy) st.outP += e.amt;
      }
      for (const k2 of Object.keys(agg)) if (k2 !== 'n') agg[k2] += st[k2];
      agg.n++;
    }
    const n = agg.n;
    console.log(pad(stage, 5) + pad(domainRules(stage).join('+') || '-', 15) + padl(w(agg.hp / n), 8)
      + padl(w(agg.takeD), 8) + padl(w(agg.takeC), 8) + padl((100 * agg.takeC / (agg.hp / n)).toFixed(0) + '%', 8)
      + padl(w(agg.takeP), 8) + padl(w(agg.outD / n), 8) + padl(w(agg.outC / n), 8) + padl(w(agg.outP / n), 8)
      + ' ' + (agg.win ? '胜' : '负'));
  }
} else {
  const rngOf = (seed) => { let x = seed >>> 0; return () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 4294967296); };
  const randomPicks = (n, rnd) => {
    const st = D.denStage(n); const pool = D.denPool(data, n).list;
    const picks = []; const seen = new Set(); let used = 0;
    for (let g = 0; g < 40 && picks.length < 5; g++) {
      const t = ['t1', 't2', 't3'][Math.floor(rnd() * 3)];
      const cands = pool.filter((m) => !seen.has(m.id) && used + D.monCost(m, t) <= st.cpu + 1e-6);
      if (!cands.length) break;
      const m = cands[Math.floor(rnd() * cands.length)];
      used += D.monCost(m, t); seen.add(m.id); picks.push({ id: m.id, tier: t });
    }
    return picks;
  };
  console.log(pad('关', 5) + pad('玩家HP', 9) + pad('怪HP', 9) + pad('玩家受直伤', 11) + pad('玩家受反击', 11) + pad('反击/HP', 8) + pad('玩家受毒', 9));
  for (const n of [110, 120, 125, 130, 135, 140, 150, 170, 200]) {
    const rnd = rngOf(0x9e3779b9 ^ (n * 2654435761));
    let best = null;
    for (let k = 0; k < 30; k++) {
      const picks = randomPicks(n, rnd); if (!picks.length) continue;
      const out = D.denFight(s, data, n, picks); if (!out.ok) continue;
      const eHp = out.res.enemies.reduce((x, d) => x + d.maxHp, 0);
      const aHp = out.res.allies.reduce((x, d) => x + d.maxHp, 0);
      const st = { n, win: out.win, eHp, aHp, d: 0, c: 0, p: 0 };
      for (const e of out.res.events) {
        if (e.amt == null || !(e.who || '').startsWith('e')) continue;
        if (e.k === 'dmg') st.d = Math.max(st.d, e.amt);
        if (e.k === 'counter') st.c = Math.max(st.c, e.amt);
        if (e.k === 'dot') st.p = Math.max(st.p, e.amt);
      }
      const score = (out.win ? 1e6 : 0) + out.hpLeft * 1000;
      if (!best || score > best.score) best = { ...st, score };
      if (out.win) break;
    }
    if (!best) continue;
    console.log(pad(best.n, 5) + padl(w(best.eHp), 9) + padl(w(best.aHp), 9) + padl(w(best.d), 11) + padl(w(best.c), 11)
      + padl((100 * best.c / best.eHp).toFixed(0) + '%', 8) + padl(w(best.p), 9));
  }
}
