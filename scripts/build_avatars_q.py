# -*- coding: utf-8 -*-
"""把 Waline 的 Q 版头像集接进本站。

来源：qdby_chinese/assets/waline-avatars（160px-PlayerAvatar_*.png / 160px-剧情角色-*头像.png）
输出：assets/avatars-q/*.webp（96×96）+ data/avatars-q.json

用法：python scripts/build_avatars_q.py [源目录]
"""
import json
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else r'D:/软件所/morimens/waline-avatars/qdby_chinese/assets/waline-avatars'
OUT = os.path.join(ROOT, 'assets', 'avatars-q')
DATA = os.path.join(ROOT, 'data', 'avatars-q.json')
SIZE = 96

# 分组：键 -> (中文, English)，顺序即展示顺序
GROUPS = [
    ('char', '人物头像', 'Portraits'),
    ('story', '剧情角色', 'Story NPCs'),
    ('special', '特殊', 'Special'),
    ('chibi', 'Q 版风格', 'Chibi style'),
    ('blocks', '方块风格', 'Block style'),
    ('interlude', '幕间风格', 'Interlude style'),
    ('stamp', '邮票风格', 'Stamp style'),
    ('xmas', '圣诞', 'Christmas'),
]

# 已知的英文角色名 -> 展示名（没有中文官方译名的保留原名）
NAMED = {
    'Albino': 'Albino', 'Alistair': 'Alistair', 'Brown': 'Brown', 'Colette': 'Colette',
    'Czort': 'Czort', 'Dexter': 'Dexter', 'Francis': 'Francis', 'Hannah': 'Hannah',
    'Herbert': 'Herbert', 'Julliette': 'Julliette', 'KeeperF': '守密人（女）', 'KeeperM': '守密人（男）',
    'Kum': 'Kum', 'N': 'N', 'Rogers': 'Rogers', 'Sylvia': 'Sylvia', 'William': 'William',
    'CleanJourney_F': '净旅（女）', 'CleanJourney_M': '净旅（男）',
}

STORY_ZH = {
    '莱特': ('莱特', 'Wright'), '西维斯特': ('西维斯特', 'Sylvester'),
    '莉奥诺拉': ('莉奥诺拉', 'Leonora'), '小煤球': ('小煤球', 'Little Coalball'),
    '小煤球二世': ('小煤球二世', 'Little Coalball II'),
}


def slug(s):
    s = re.sub(r'[^0-9A-Za-z一-龥]+', '-', s).strip('-')
    return s.lower()


def classify(raw):
    """返回 (group, key, 展示名, 英文名)"""
    name = raw.replace('160px-', '').replace('.png', '')
    if name.startswith('剧情角色-'):
        zh = name[len('剧情角色-'):].replace('头像', '')
        n, en = STORY_ZH.get(zh, (zh, zh))
        return 'story', 'story-' + slug(zh), n, en
    if not name.startswith('PlayerAvatar_'):
        return None
    body = name[len('PlayerAvatar_'):]
    if body.startswith('Style_'):
        rest = body[len('Style_'):]
        fam = rest.split('_')[0]
        code = rest.split('_', 1)[1] if '_' in rest else rest
        g = {'Blocks': 'blocks', 'Interlude': 'interlude', 'Qfiles': 'chibi', 'Stamp': 'stamp'}.get(fam, 'chibi')
        return g, f'{g}-{slug(code)}', code, code
    if body.startswith('Christmas_'):
        code = body[len('Christmas_'):]
        return 'xmas', f'xmas-{slug(code)}', f'圣诞 {code}', f'Christmas {code}'
    fam, _, code = body.partition('_')
    if fam in ('A', 'B'):
        if code in NAMED:
            return 'char', 'char-' + slug(code), NAMED[code], code
        return 'char', 'char-' + slug(code), code, code
    if fam == 'S':
        return 'special', 'special-' + slug(code), f'特殊 {code}', f'Special {code}'
    return None


def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith('.png'))
    seen = {}
    order = []
    for f in files:
        info = classify(f)
        if not info:
            continue
        g, id_, n, en = info
        # 同一个 slug 只留一张（源目录里存在带/不带 160px- 前缀的重复文件）
        if id_ in seen:
            continue
        seen[id_] = True
        order.append((g, id_, n, en, f))

    items = []
    for g, id_, n, en, f in order:
        src = os.path.join(SRC, f)
        try:
            im = Image.open(src).convert('RGBA')
        except Exception as e:                      # noqa: BLE001
            print('skip', f, e)
            continue
        # 居中裁成正方形再缩放，避免变形
        w, h = im.size
        side = min(w, h)
        im = im.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        rel = f'assets/avatars-q/{id_}.webp'
        im.save(os.path.join(ROOT, rel), 'WEBP', quality=88, method=5)
        items.append({'id': id_, 'n': n, 'en': en, 'src': rel, 'g': g})

    # 按分组顺序稳定排序
    rank = {k: i for i, (k, _, _) in enumerate(GROUPS)}
    items.sort(key=lambda it: (rank.get(it['g'], 99), it['n']))

    doc = {
        'size': SIZE,
        'groups': [{'k': k, 'n': zh, 'en': en} for k, zh, en in GROUPS
                   if any(it['g'] == k for it in items)],
        'items': items,
    }
    with open(DATA, 'w', encoding='utf-8') as fp:
        json.dump(doc, fp, ensure_ascii=False, separators=(',', ':'))

    per = {}
    for it in items:
        per[it['g']] = per.get(it['g'], 0) + 1
    total = sum(os.path.getsize(os.path.join(ROOT, it['src'])) for it in items)
    print(f'头像 {len(items)} 张，合计 {total / 1024:.0f} KB')
    print('分组:', per)
    print('清单:', DATA)


if __name__ == '__main__':
    main()
