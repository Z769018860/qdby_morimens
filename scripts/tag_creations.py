#!/usr/bin/env python3
"""给造物打「功能标签」，供线索台按功能出线索。

标签只从造物特性文本里匹配关键词，不猜、不补：匹配不到就是没有。
结果写成 data/creation-tags.json（{造物 id: [标签…]}），不动 773 KB 的 dictionary.json；
前端 game.js 进页面时随字典一起取。幂等，可反复跑。

用法：
    python3 scripts/tag_creations.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DICT = ROOT / 'data' / 'dictionary.json'
OUT = ROOT / 'data' / 'creation-tags.json'

# 顺序即前端展示顺序；同一件造物可能命中多个标签
TAGS = [
    ('dmg', ['伤害']),                             # 输出（含基伤）
    ('draw', ['置入手牌', '置入手中', '加入手中', '抽到手牌', '抽牌']),  # 抽牌
    ('rage', ['狂气']),
    ('energy', ['算力']),
    ('guard', ['格挡', '护盾', '治疗', '回复生命']),  # 防御与续航
    ('str', ['力量']),
    ('crit', ['暴击']),
    ('exhaust', ['消耗']),
]

# 「抽 1 张牌」「抽3张牌」这类写法单独用正则兜底
DRAW_RE = re.compile(r'抽\s*\d*\s*张')


def text_of(entry):
    return ' '.join((b.get('t') or '') for b in (entry.get('desc') or []))


def tags_of(entry):
    t = text_of(entry)
    if not t:
        return []
    out = [key for key, words in TAGS if any(w in t for w in words)]
    if 'draw' not in out and DRAW_RE.search(t):
        out.insert(1, 'draw')
    return out


def main():
    doc = json.load(open(DICT, encoding='utf-8'))
    rows = doc.get('creation') or []
    stat = Counter()
    out = {}
    for e in rows:
        tags = tags_of(e)
        if tags:
            out[str(e['id'])] = tags
        stat['n'] += 1
        for t in tags:
            stat[t] += 1
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'造物 {stat["n"]} 件，标签命中：')
    for key, _ in TAGS:
        print(f'  {key:8s} {stat[key]}')
    print(f'已写出 data/creation-tags.json（{len(out)} 件带标签，{OUT.stat().st_size // 1024} KB）')


if __name__ == '__main__':
    main()
