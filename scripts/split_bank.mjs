// 把题库拆成「索引 + 分片」，让首屏只下载一道题所在的片。
//
// 背景：data/puzzles.json 有 1000 道题、1.7MB（gzip 后约 950KB）。首页必须
// 把它整包下完才渲染第一道题，在慢网络上要 5–10 秒，表现为「一直载入中」。
// 而页面其实只需要一道题。
//
// 产物（都在 data/bank/）：
//   index.json   所有题的 [id, diff, core] + 分片大小 + 赛季表，约 80KB
//   c000.json…   每片 50 道题，约 85KB，只有抽到那一题才下载
//
// 用法：node scripts/split_bank.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'data');
const OUT = path.join(DATA, 'bank');
const CHUNK = 50;

// 顺序有讲究：core 在前，保证 corePool 的下标和以前的 puzzles.json 完全一致，
// 每日一题的 (dayNumber*7919 % len) 不会因为这次改造换成别的题。
const SOURCES = [
  { file: 'puzzles.json', core: true },
  { file: 'puzzles-extra.json', core: false },
  { file: 'puzzles-more.json', core: false },
];

const read = (f) => {
  const p = path.join(DATA, f);
  if (!fs.existsSync(p)) return null;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  return Array.isArray(j) ? { puzzles: j } : j;
};

// Normalise published records even when upstream source JSON has older boss IDs
// or zero-filled optional extrema. Never derive poison/counter from party damage.
const BOSS_BY_ZONE = {
  '71-1':['80576','80577'], '71-2':['94940'], '71-3':['67103'],
  '71-4':['14063'], '71-5':['81279'],
  '72-1':['14008','14013'], '72-2':['14064'], '72-3':['60096'],
  '72-4':['120308','120310','120306'], '72-5':['14086'],
};
function normalizePuzzle(p) {
  const boss = BOSS_BY_ZONE[`${p.season}-${p.zone}`];
  if (boss) p.boss = [...boss];
  if (p.dmgComp) {
    for (const key of ['poison', 'counter', 'tentacle', 'strength']) {
      const v = p.dmgComp[key];
      if (v == null || !Number.isFinite(Number(v)) || Number(v) <= 0) delete p.dmgComp[key];
    }
  }
  return p;
}

const items = [];
const chunks = [];
const seen = new Set();
let seasons = null;
let coreCount = 0;

for (const src of SOURCES) {
  const j = read(src.file);
  if (!j) { console.warn('跳过（不存在）:', src.file); continue; }
  if (!seasons && j.seasons) seasons = j.seasons;
  const list = Array.isArray(j.puzzles) ? j.puzzles : [];
  let added = 0;
  for (const p of list) {
    const id = String(p.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    items.push([id, Number(p.diff) || 2, src.core ? 1 : 0, p.threat || null]);
    chunks.push(normalizePuzzle(p));
    added++;
    if (src.core) coreCount++;
  }
  console.log(`${src.file}: ${list.length} 题，新增 ${added}`);
}

// 按 50 一切，顺序由 items 决定 → 第 i 题在第 floor(i/50) 片
const files = [];
const bodies = [];
let idx = 0;
for (let i = 0; i < chunks.length; i += CHUNK) {
  const name = `c${String(idx).padStart(3, '0')}.json`;
  const text = JSON.stringify({ chunk: idx, puzzles: chunks.slice(i, i + CHUNK) });
  bodies.push(text);
  files.push(name);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), text, 'utf8');
  idx++;
}

// stamp 用「全部内容」的哈希，而不是时间戳：
// 前端把它拼在分片 URL 上当缓存键（force-cache）。内容没变就不变，
// 重新部署也不会让所有人的题库缓存失效；内容变了才换 URL。
const stamp = crypto.createHash('sha1').update(bodies.join('|')).digest('hex').slice(0, 12);

const index = {
  v: 1,
  stamp,
  chunkSize: CHUNK,
  n: items.length,
  core: coreCount,
  seasons: seasons || {},
  items,
};
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index), 'utf8');

const kb = (n) => (n / 1024).toFixed(0) + 'KB';
const idxSize = fs.statSync(path.join(OUT, 'index.json')).size;
const one = fs.statSync(path.join(OUT, files[0])).size;
console.log(`\n索引: index.json ${kb(idxSize)}（${items.length} 题，其中核心 ${coreCount}）`);
console.log(`分片: ${files.length} 个，每个约 ${kb(one)}（${CHUNK} 题）`);
console.log(`首屏需要: 索引 + 1 片 ≈ ${kb(idxSize + one)}，原来是 ${kb(fs.statSync(path.join(DATA, 'puzzles.json')).size)}`);
