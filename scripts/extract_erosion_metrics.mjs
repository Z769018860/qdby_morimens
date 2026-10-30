// 从官方战斗回放里取「侵蚀」相关数据。
//
// 口径（和复盘页 morimens-replay-review 保持一致）：
//   侵蚀 = 状态表里名字含「侵蚀」的那些状态（卡斯托尔侵蚀 / 卡拉布延迟侵蚀 / 沙耶…），
//   伤害取回放里最后一版逐状态统计 BattleStatPack 的 state[*].AwakerDoDamage。
//   层级取最后一帧 globalStats 的 StateLayerNum + EnemyStateLayerNum，只算侵蚀那些 id 的峰值层数。
//
// 为什么不用 battle-summary 的 maxPosion：那是「中毒」，和「侵蚀」是两个不同的状态；
// 侵蚀是薇薇安 / 沙耶 / 卡拉布 / 卡斯托尔这一路的核心机制，摘要里根本没有。
//
// 用法：
//   node scripts/extract_erosion_metrics.mjs --cache <回放缓存目录> [--workers 8] [--limit 200]
// 产物 data/replay-erosion.json：{ generatedAt, n, items: { uuid: {dmg, layers, bouts, states} } }
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeReplay } from '../js/replay.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const CACHE = path.resolve(opt('cache', path.join(ROOT, '.replay-cache')));
const OUT = path.resolve(ROOT, opt('out', 'data/replay-erosion.json'));
const BANK = path.resolve(ROOT, opt('bank', 'data/bank'));
const WORKERS = Math.max(1, Math.min(16, Number(opt('workers', 6)) || 6));
const LIMIT = Number(opt('limit', 0)) || 0;

const ERO_RE = /侵蚀/;

function bankUuids() {
  const set = new Set();
  for (const f of fs.readdirSync(BANK).filter((x) => /^c\d+\.json$/.test(x)).sort()) {
    const j = JSON.parse(fs.readFileSync(path.join(BANK, f), 'utf8'));
    for (const p of j.puzzles || []) {
      const u = String(p.uuid || '').toLowerCase();
      if (u) set.add(u);
    }
  }
  return set;
}

// 状态 id -> 是否侵蚀、名字
function erosionIds(rep) {
  const st = (rep.resourceRecords || {}).State || {};
  const map = new Map();
  for (const [id, d] of Object.entries(st)) {
    const name = String(d.CnID || '').replace(/^状态@/, '');
    if (ERO_RE.test(name)) map.set(String(id), name);
  }
  return map;
}

function measure(buf) {
  const rep = decodeReplay(new Uint8Array(buf));
  const eros = erosionIds(rep);
  let lastStats = null;   // 最后一帧 globalStats（回合数最大的那份更稳）
  let lastPacks = null;
  for (const seg of rep.segments || []) {
    if (!Array.isArray(seg)) continue;
    for (const msg of seg) {
      const md = msg && msg.msgData;
      if (!md || !Array.isArray(md.frameList)) continue;
      for (const fr of md.frameList) {
        const ss = fr && fr.data && fr.data.statsData;
        if (!ss) continue;
        const g = ss.globalStats;
        if (g && (!lastStats || (Number(g.BoutCount) || 0) >= (Number(lastStats.BoutCount) || 0))) lastStats = g;
        const pm = ss.battleStatPackMgr;
        if (pm) {
          const d = pm.battleStatPackData;
          const arr = Array.isArray(d) ? d : (d && typeof d === 'object' ? Object.values(d) : []);
          if (arr.length) lastPacks = arr;
        }
      }
    }
  }
  const bouts = Number(lastStats && lastStats.BoutCount) || Number(((rep.battleDat || {}).statistics || {}).BoutCount) || 0;

  // 逐状态伤害
  const states = {};
  let dmg = 0;
  let stateDmg = 0;
  for (const pack of lastPacks || []) {
    for (const v of Object.values(pack.battleValue || {})) {
      const sm = (v || {}).state;
      if (!sm) continue;
      for (const [id, x] of Object.entries(sm)) {
        const val = Number((x || {}).AwakerDoDamage) || 0;
        if (!val) continue;
        stateDmg += val;
        if (!eros.has(String(id))) continue;
        dmg += val;
        states[id] = (states[id] || 0) + val;
      }
    }
  }

  // 侵蚀峰值层数（只统计侵蚀状态 id）
  let layers = 0;
  if (lastStats) {
    for (const m of [lastStats.StateLayerNum, lastStats.EnemyStateLayerNum]) {
      for (const [id, n] of Object.entries(m || {})) {
        if (!eros.has(String(id))) continue;
        const v = Number(n) || 0;
        if (v > layers) layers = v;
      }
    }
  }

  return { dmg: Math.round(dmg), layers, bouts, stateDmg: Math.round(stateDmg), states, eroIds: [...eros.keys()] };
}

async function main() {
  const uuids = [...bankUuids()];
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  let prev = { items: {} };
  if (fs.existsSync(OUT)) {
    try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { prev = { items: {} }; }
  }
  const items = { ...(prev.items || {}) };
  let todo = uuids.filter((u) => fs.existsSync(path.join(CACHE, u + '.bin')) && !(u in items));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log(`题库 ${uuids.length} 个 uuid，缓存命中待解析 ${todo.length}`);

  const failed = [];
  let done = 0, ok = 0;
  const t0 = Date.now();
  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const u = todo[cursor++];
      try {
        const buf = fs.readFileSync(path.join(CACHE, u + '.bin'));
        const m = measure(buf);
        items[u] = m;
        ok++;
      } catch (e) {
        failed.push({ uuid: u, error: (e && e.message) || String(e) });
      }
      done++;
      if (done % 200 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`${done}/${todo.length} ok=${ok} fail=${failed.length} ${rate.toFixed(1)}/s`);
        save();
      }
    }
  }
  function save() {
    const payload = {
      generatedAt: new Date().toISOString(),
      fields: ['dmg = state[*].AwakerDoDamage 名字含「侵蚀」的状态合计', 'layers = 侵蚀状态峰值层数', 'bouts = 回合数', 'stateDmg = 全部状态伤害合计'],
      n: Object.keys(items).length,
      failed,
      items,
    };
    const tmp = OUT + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, OUT);
  }
  await Promise.all(Array.from({ length: WORKERS }, worker));
  save();
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`完成：ok=${ok} fail=${failed.length}，累计 ${Object.keys(items).length} 条，用时 ${secs}s`);
}

main().catch((e) => { console.error(e); process.exit(1); });
