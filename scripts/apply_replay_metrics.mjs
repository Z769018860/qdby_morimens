// 把回放里量出来的两项写进题库源文件：
//   keyUses  钥令开启次数（data/replay-metrics.json，statistics.UsedKeeperSkillCount）
//   ero      侵蚀伤害累计（data/replay-erosion.json，逐状态统计里名字含「侵蚀」的那些）
//
// 只认 bouts === rounds 的记录：回放帧里的 BoutCount 和榜单的 stageRoundCount
// 是同一场的回合数，对不上说明这份回放不是这一场（或者回放只录到一半），宁可空着。
//
// 用法：node scripts/apply_replay_metrics.mjs [--metrics data/replay-metrics.json]
//                                             [--erosion data/replay-erosion.json] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const METRICS = path.resolve(opt('metrics', path.join(ROOT, 'data/replay-metrics.json')));
const EROSION = path.resolve(opt('erosion', path.join(ROOT, 'data/replay-erosion.json')));
const DRY = argv.includes('--dry');
const FILES = ['data/puzzles.json', 'data/puzzles-extra.json', 'data/puzzles-more.json', 'data/puzzles-70.json'];

const read = (p, key) => {
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8'))[key] || {}; } catch { return {}; }
};
const M = read(METRICS, 'metrics');
const E = read(EROSION, 'items');
if (!M) { console.error('找不到回放指标文件：', METRICS); process.exit(1); }
if (!E) console.warn('没有侵蚀数据（可选）：', EROSION);

let total = 0, keysFilled = 0, eroFilled = 0, missUuid = 0, noMetric = 0, roundMismatch = 0, eroZero = 0;
const reasons = {};

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const p of doc.puzzles || []) {
    total++;
    const u = String(p.uuid || '').toLowerCase();
    if (!u) { missUuid++; reasons.noUuid = (reasons.noUuid || 0) + 1; continue; }
    const m = M[u];
    if (!m) { noMetric++; continue; }
    const [keyUses, bouts] = m;
    if (Number(bouts) !== Number(p.rounds)) {
      roundMismatch++;
      reasons.roundMismatch = (reasons.roundMismatch || 0) + 1;
      delete p.keyUses;
      delete p.ero;
      continue;
    }
    p.keyUses = Number(keyUses);
    keysFilled++;
    // 侵蚀：0 不写（卡片上只列非零项），但要和「没数据」区分开，报告里会单独统计
    const e = E && E[u];
    if (e && Number(e.bouts) === Number(p.rounds)) {
      const dmg = Math.round(Number(e.dmg) || 0);
      if (dmg > 0) { p.ero = dmg; eroFilled++; } else { delete p.ero; eroZero++; }
    } else {
      delete p.ero;
    }
  }
  if (!DRY) fs.writeFileSync(file, JSON.stringify(doc), 'utf8');
  console.log(`${rel}: ${(doc.puzzles || []).length} 题`);
}

const pct = (n) => `${n}（${(n / Math.max(1, total) * 100).toFixed(1)}%）`;
console.log(`\n共 ${total} 题`);
console.log(`  钥令开启次数写入 ${pct(keysFilled)}`);
console.log(`  侵蚀伤害写入 ${pct(eroFilled)}，有回放但侵蚀为 0 ${pct(eroZero)}`);
console.log(`  没有回放指标 ${noMetric}，缺 uuid ${missUuid}，回合对不上 ${roundMismatch}${DRY ? '（dry run，未写盘）' : ''}`);
