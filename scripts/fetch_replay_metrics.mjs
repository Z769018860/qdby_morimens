// 从官方战斗回放里取「战报实测指标」，目前只取两项：
//   keyUses = statistics.UsedKeeperSkillCount（开钥令数，守密人这一局放了几次钥令）
//   bouts   = statistics.BoutCount（回合数，用来判断这份回放是不是有效）
//
// 为什么不能读 battle-summary：榜单摘要里没有「钥令使用次数」这一项，
// 只有回放本体里才有。回放本体不是 JSON，是 LZ4 帧 + MessagePack，
// 解码复用 js/replay.js（和工坊同一套）。
//
// 用法：
//   node scripts/fetch_replay_metrics.mjs                       # 补全题库里所有缺的
//   node scripts/fetch_replay_metrics.mjs --limit 200           # 先跑一小批
//   node scripts/fetch_replay_metrics.mjs --cache D:/tmp/replays --workers 8
//
// 产物 data/replay-metrics.json：{ generatedAt, stats, metrics: { uuid: [keyUses, bouts] } }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodeReplay } from '../js/replay.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://z1g-warreport.qookkagames.com/publish/BattleReplay_';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const OUT = path.resolve(ROOT, opt('out', 'data/replay-metrics.json'));
const BANK = path.resolve(ROOT, opt('bank', 'data/bank'));
const CACHE = path.resolve(opt('cache', path.join(ROOT, '.replay-cache')));
const WORKERS = Math.max(1, Math.min(16, Number(opt('workers', 6)) || 6));
const LIMIT = Number(opt('limit', 0)) || 0;
const TIMEOUT = Number(opt('timeout', 30000)) || 30000;
const RETRIES = Number(opt('retries', 2));
const INCLUDE_EXTRA = argv.includes('--include-extra'); // 连 data/replay-extra-uuid.txt 里的也抓

// ---------------------------------------------------------------- 题库里的 uuid
function bankUuids() {
  const files = fs.readdirSync(BANK).filter((f) => /^c\d+\.json$/.test(f)).sort();
  const map = new Map(); // uuid -> [ids]
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(BANK, f), 'utf8'));
    for (const p of j.puzzles || []) {
      const u = String(p.uuid || '').toLowerCase();
      if (!UUID_RE.test(u)) continue;
      const arr = map.get(u) || [];
      arr.push(String(p.id));
      map.set(u, arr);
    }
  }
  const extra = path.join(ROOT, 'data/replay-extra-uuid.txt');
  if (INCLUDE_EXTRA && fs.existsSync(extra)) {
    for (const line of fs.readFileSync(extra, 'utf8').split('\n')) {
      const u = line.trim().toLowerCase();
      if (UUID_RE.test(u) && !map.has(u)) map.set(u, []);
    }
  }
  return map;
}

const cachePath = (uuid) => path.join(CACHE, uuid + '.bin');

async function download(uuid) {
  const dest = cachePath(uuid);
  if (fs.existsSync(dest)) return fs.readFileSync(dest);
  let last = '';
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(BASE + uuid + '.json', {
        headers: { 'User-Agent': 'MorimensDetective/1.0', Accept: '*/*' },
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) { last = 'HTTP ' + res.status; if (res.status === 404 || res.status === 403) break; }
      else {
        const buf = Buffer.from(await res.arrayBuffer());
        if (!buf.length) { last = 'empty'; }
        else { fs.writeFileSync(dest, buf); return buf; }
      }
    } catch (e) {
      last = (e && e.message) || String(e);
    }
    if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  throw new Error(last || 'unknown');
}

function measure(buf) {
  const rep = decodeReplay(new Uint8Array(buf));
  const bd = rep.battleDat || {};
  const st = bd.statistics || {};
  // battleDat.statistics 是「进首领房那一刻」的快照：普通战斗的回合已经算进去，
  // 首领那几回合还没算，所以它比 stageRoundCount 少 bossBattleRoundCount。
  // 真正完整的一份在帧日志里：每帧的 data.statsData.globalStats 都是累计值，
  // 取回合数最大的那一帧才是这一场的最终统计。
  let best = null;
  for (const seg of rep.segments || []) {
    if (!Array.isArray(seg)) continue;
    for (const msg of seg) {
      const md = msg && msg.msgData;
      if (!md || !Array.isArray(md.frameList)) continue;
      for (const fr of md.frameList) {
        const g = fr && fr.data && fr.data.statsData && fr.data.statsData.globalStats;
        if (!g) continue;
        if (!best || (Number(g.BoutCount) || 0) > (Number(best.BoutCount) || 0)) best = g;
      }
    }
  }
  const src = best || st;
  const bouts = Number(src.BoutCount) || 0;
  const keyUses = Number(src.UsedKeeperSkillCount);
  if (!bouts) throw new Error('empty statistics');
  if (!Number.isFinite(keyUses)) throw new Error('no UsedKeeperSkillCount');
  return { keyUses, bouts, keeper: bd.keeperSkill != null ? bd.keeperSkill : null };
}

async function main() {
  const uuidMap = bankUuids();
  fs.mkdirSync(CACHE, { recursive: true });

  let prev = { metrics: {} };
  if (fs.existsSync(OUT)) {
    try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { prev = { metrics: {} }; }
  }
  const metrics = { ...(prev.metrics || {}) };

  let todo = [...uuidMap.keys()].filter((u) => !(u in metrics));
  if (LIMIT) todo = todo.slice(0, LIMIT);
  console.log(`题库 ${uuidMap.size} 个 uuid，已完成 ${Object.keys(metrics).length}，本次跑 ${todo.length}`);

  const stats = { ok: 0, failed: 0, errors: {} };
  const failed = [];
  let done = 0;
  const t0 = Date.now();

  let cursor = 0;
  async function worker() {
    while (cursor < todo.length) {
      const uuid = todo[cursor++];
      try {
        const m = await measure(await download(uuid));
        metrics[uuid] = [m.keyUses, m.bouts];
        stats.ok++;
      } catch (e) {
        const msg = (e && e.message) || String(e);
        stats.failed++;
        stats.errors[msg] = (stats.errors[msg] || 0) + 1;
        failed.push({ uuid, ids: uuidMap.get(uuid) || [], error: msg });
        // 只有「文件本身解不开」才删缓存重下；统计为空是回放本身没写，不是文件坏了
        if (/Unexpected|Expected|Unsupported|truncated|compStr|Buffer|not a function/.test(msg)) {
          try { fs.rmSync(cachePath(uuid), { force: true }); } catch {}
        }
      }
      done++;
      if (done % 100 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`${done}/${todo.length} ok=${stats.ok} fail=${stats.failed} ${rate.toFixed(1)}/s`);
        save();
      }
    }
  }

  function save() {
    const payload = {
      generatedAt: new Date().toISOString(),
      source: BASE,
      fields: ['keyUses (statistics.UsedKeeperSkillCount)', 'bouts (statistics.BoutCount)'],
      n: Object.keys(metrics).length,
      stats,
      failed,
      metrics,
    };
    const tmp = OUT + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload));
    fs.renameSync(tmp, OUT);
  }

  await Promise.all(Array.from({ length: WORKERS }, worker));
  save();
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`完成：ok=${stats.ok} fail=${stats.failed}，累计 ${Object.keys(metrics).length} 条，用时 ${secs}s`);
  if (stats.failed) console.log('失败原因：', JSON.stringify(stats.errors));
}

main().catch((e) => { console.error(e); process.exit(1); });
