#!/usr/bin/env python3
"""给 data/protocol-units.json 补上两个羁绊用的标签：所属组织（fac）与流派（tags）。

为什么不塞进 gen_protocol_units.py：那个脚本是「按 survivors-data.json 重新派生整张表」，
而 survivors-data.json 会跟着「唤醒体幸存者」一起长人（写这份脚本时它已经从 62 涨到 66）。
协议的人数由立绘图集决定 —— 图集里没有新角色，就不该悄悄多出四个没有立绘的单位。
所以标签单独补，只碰 fac / tags 两个字段，不新增、不删人、不动任何数值。

数据来源：
  · 组织  data/protocol-factions.json（gen_protocol_factions.py 从 SKeyDB 的 faction 抽出）
  · 流派  data/dictionary.json 里每个角色的关键词（kw），按 GIMMICKS 的顺序取前两个命中

用法：
  python scripts/gen_protocol_tags.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNITS = ROOT / 'data/protocol-units.json'
FACTION = ROOT / 'data/protocol-factions.json'
DICT = ROOT / 'data/dictionary.json'

# 六个流派。右列是 data/dictionary.json 里的关键词，左列是本玩法用的键。
# 顺序就是优先级：一个角色命中多个时只认前两个 —— 人人都带三四个流派的话，
# 「凑三个人」这个条件就形同虚设了。
GIMMICKS = [
    ('tentacle', 'tentacle-dmg'),
    ('poison', 'poison'),
    ('devour', 'devour'),
    ('counter', 'counter'),
    ('embryo', 'embryo-fusion'),
    ('pierce', 'pierce-dmg'),
]


def main():
    units = json.loads(UNITS.read_text(encoding='utf-8'))
    fac = {}
    if FACTION.exists():
        fac = json.loads(FACTION.read_text(encoding='utf-8')).get('fac') or {}
    kws = {}
    if DICT.exists():
        for a in json.loads(DICT.read_text(encoding='utf-8')).get('awakener') or []:
            kws[a['id']] = set(a.get('kw') or [])

    from collections import Counter
    cf, ct = Counter(), Counter()
    for u in units['units']:
        u['fac'] = fac.get(u['gid'], 'unknown')
        u['tags'] = [k for k, kw in GIMMICKS if kw in (kws.get(u['gid']) or set())][:2]
        cf[u['fac']] += 1
        for t in u['tags']:
            ct[t] += 1

    UNITS.write_text(json.dumps(units, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    print('%d 名唤醒体补上组织与流派 → %s' % (len(units['units']), UNITS.relative_to(ROOT)))
    print('  组织  ' + '  '.join('%s×%d' % (k, v) for k, v in cf.most_common()))
    print('  流派  ' + '  '.join('%s×%d' % (k, v) for k, v in ct.most_common()))
    print('  无流派 %d 人（不参与任何流派羁绊）' % sum(1 for u in units['units'] if not u['tags']))


if __name__ == '__main__':
    main()
