// 战报侦探：区域首领对账。数据里的 boss = scripts/fix_boss_map.py 的权威表（官方回放逐区核对），
// 展示层不许再有硬编码的「纠正表」（以前那张旧表把对的盖成错的）。
// 用法：node scripts/test_detective_boss.mjs
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
let bad = 0; const check = (n, ok, x) => { if (!ok) { bad++; console.log('✗', n, x || ''); } else console.log('✓', n); };
// 1) 权威表（fix_boss_map.py 里的 BOSS）
const py = fs.readFileSync(path.join(ROOT, 'scripts/fix_boss_map.py'), 'utf8');
const table = {};
for (const m of py.matchAll(/\((\d+), (\d)\): \[([^\]]*)\]/g)) table[`${m[1]}-${m[2]}`] = [...m[3].matchAll(/'(\d+)'/g)].map((x) => x[1]);
check('权威表有 70~72 期共 15 个禁区', Object.keys(table).length === 15, Object.keys(table).join(','));
// 2) 全部题目的 boss 和表一致
let n = 0, wrong = [];
const files = ['data/puzzles.json', 'data/puzzles-extra.json', 'data/puzzles-more.json', 'data/puzzles-70.json', ...fs.readdirSync(path.join(ROOT, 'data/bank')).filter((f) => /^c\d+\.json$/.test(f)).map((f) => 'data/bank/' + f)];
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  for (const p of (Array.isArray(d) ? d : d.puzzles || [])) {
    const key = `${p.season}-${p.zone}`;
    if (!table[key] || p.kind === 'mainline') continue;
    n++;
    if (JSON.stringify(p.boss || []) !== JSON.stringify(table[key])) wrong.push(`${f}:${p.id}`);
  }
}
check(`${n} 道禁区题的首领都和权威表一致`, wrong.length === 0, wrong.slice(0, 3).join(' '));
// 3) 首领怪物都在怪物表里
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/dict.json'), 'utf8')).monster;
const ids = new Set(dict.map((m) => String(m.id)));
check('权威表里的首领都能在怪物表里找到', Object.values(table).flat().every((i) => ids.has(i)));
// 4) 展示层不许再有硬编码的首领纠正表
const game = fs.readFileSync(path.join(ROOT, 'js/game.js'), 'utf8');
check('js/game.js 里没有硬编码的「期-禁区 → 首领」纠正表', !/"7[0-9]-[1-5]"\s*:\s*\[/.test(game));
console.log(bad ? `\n${bad} 项失败` : '\n全部通过 ✓');
process.exit(bad ? 1 : 0);
