#!/usr/bin/env python3
# 把「融灾榜单」导出的 csv 转成 js/duel/names.js（人机对手的名字池）。
#
# 用法：python scripts/build_duel_names.py <csv> [期号]
#   csv 只要有 name 列就行（榜单原始导出是 rank,uid,name）。
#   期号只写进注释，方便以后对账是哪一期的名单。
import csv
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'js', 'duel', 'names.js')

HEAD = '''// 人机对手的名字：取自「融灾榜单」{tag}的前 {total} 条（去重后 {uniq} 个）。
// 名单本身是公开榜单上的玩家名，这里只当名字用，不带任何战绩关联。
// 想让对手换一批名字：把新一期的榜单导出成 csv，重跑 scripts/build_duel_names.py。
export const NAMES = [
'''


def main():
    if len(sys.argv) < 2:
        sys.exit('usage: build_duel_names.py <rank.csv> [season]')
    src = sys.argv[1]
    season = sys.argv[2] if len(sys.argv) > 2 else ''

    seen = set()
    names = []
    total = 0
    with open(src, encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f):
            total += 1
            n = (row.get('name') or '').strip()
            if not n or n in seen:
                continue
            seen.add(n)
            names.append(n)

    if not names:
        sys.exit('csv 里没读到 name 列')

    tag = ('第 %s 期' % season) if season else '某一期'
    head = HEAD.format(tag=tag, total=total, uniq=len(names))
    body = ''.join('  %s,\n' % json.dumps(n, ensure_ascii=False) for n in names)
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        f.write(head + body + '];\n')
    print('names.js: %d 条 / 去重后 %d 个' % (total, len(names)))


if __name__ == '__main__':
    main()
