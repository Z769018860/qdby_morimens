#!/usr/bin/env python3
"""给每道题挂上官方回放 UUID。

题目由战报（battle-summary）生成，联合键
  (season, rank, score, 回合数, 出牌数, 单回合最高伤害)
在 battle-summary 里唯一，可反查出 battleUuid；1000/1000 全都命中且无歧义。

用法: python3 scripts/attach_replay.py [--summary-dir D:/软件所/morimens/_tmp_qdby]
输出: 就地更新 data/puzzles.json 的 uuid 字段
"""
import argparse, collections, gzip, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--summary-dir', default='D:/软件所/morimens/_tmp_qdby')
a = ap.parse_args()
S = Path(a.summary_dir)

by = collections.defaultdict(list)
for season in (71, 72):
    p = S / f'{season}-battle-summary.jsonl.gz'
    if not p.exists():
        print('missing', p)
        continue
    with gzip.open(p, 'rt', encoding='utf-8') as f:
        for line in f:
            r = json.loads(line)
            by[(season, r['rank'], r['score'], r['stageRoundCount'], r['totalUseCard'], r['maxBoutDamage'])].append(r)

data = json.loads((ROOT / 'data/puzzles.json').read_text(encoding='utf-8'))
hit = amb = 0
for q in data['puzzles']:
    k = (q['season'], q['rank'], q['score'], q['rounds'], q['cards'], q['maxBout'])
    v = by.get(k) or []
    ids = sorted({x['battleUuid'] for x in v})
    if not ids:
        continue
    q['uuid'] = ids[0]
    hit += 1
    if len(ids) > 1:
        amb += 1

(ROOT / 'data/puzzles.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'uuid {hit}/{len(data["puzzles"])}, ambiguous {amb}')
