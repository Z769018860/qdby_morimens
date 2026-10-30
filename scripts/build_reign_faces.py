#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把「忘却王权」用到的唤醒体立绘裁成卡面头像，压成 webp 后写进 data/reign-faces.json。

为什么要在构建前先裁：assets/card/*.webp 是 240×600 的全身立绘，一张 20~40KB，
直接内联二十几张就是 1MB 进首屏。卡面只用得到头部到胸口那一段，裁成
240×330 再缩到 200×275、q=78，一张 6~9KB，全表 200KB 左右。

产出由 scripts/build.mjs 的 genReign() 读成 js/reign/art.js 里的 data URI 表。
改角色名单请同时改下面 CHARS 和 js/reign/data.js 的 CHARS。

用法：python scripts/build_reign_faces.py
"""
import base64
import io
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, 'data', 'reign-faces.json')

# key（= js/reign/data.js 里的角色 key） → 立绘文件名（assets/card/<slug>.webp）
CHARS = [
    ('24', 'mason'),
    ('catigula', 'kathigu-ra'),
    ('lotan', 'lotan'),
    ('pandia', 'pandia'),
    ('karen', 'karen'),
    ('tawil', 'tawil'),
    ('alva', 'alva'),
    ('agrippa', 'agrippa'),
    ('doresain', 'doresain'),
    ('catena', 'helot-catena'),
    ('pickman', 'pickman'),
    ('leigh', 'leigh'),
    ('aurita', 'aurita'),
    ('murphy', 'murphy-fauxborn'),
    ('corposant', 'corposant'),
    ('erica', 'erica'),
    ('castor', 'castor'),
    ('pollux', 'pollux'),
    ('daffodil', 'daffodil'),
    ('jenkin', 'jenkin'),
    ('nautila', 'nautila'),
    ('helot', 'helot'),
    ('miryam', 'miryam'),
    ('sorel', 'sorel'),
    ('xu', 'xu'),
    ('lily', 'lily'),
    ('horla', 'horla'),
    ('ryker', 'ryker'),
]

# 校猫没有 240×600 的立绘，只有 96×96 的 Q 版头（stats 页那张）。单独处理：
# 放大到 200×200 摆在 200×275 的深色底上，四周压一层暗角，卡片里当「不是人的那个」。
CAT_SRC = 'assets/avatars-q/story-莱特.webp'

# 首页九宫格图标：Q 版女守密人（detective 用的是男守密人，不重复）。
# 这张图代表的是「坐在桌子后面那个位置」——这一局坐上去的是你。
ICON_SRC = 'assets/avatars-q/char-keeperf.webp'
ICON_OUT = 'assets/ui/gameicons/reign.webp'

# 裁切窗口：立绘 240×600，人物头部基本落在顶部 330px 内（batch 预览核过 28 张）
CROP = (0, 0, 240, 330)
SIZE = (200, 275)
Q = 78


def main():
    out = {}
    total = 0
    missing = []
    for key, slug in CHARS:
        src = os.path.join(ROOT, 'assets', 'card', slug + '.webp')
        if not os.path.exists(src):
            missing.append(key + '(' + slug + ')')
            continue
        im = Image.open(src).convert('RGB')
        im = im.crop(CROP).resize(SIZE, Image.LANCZOS)
        # 不落盘：这台机器的删除被回收站垫片接管，中间文件只会堆在磁盘上
        buf = io.BytesIO()
        im.save(buf, 'WEBP', quality=Q, method=6)
        data = buf.getvalue()
        total += len(data)
        out[key] = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')

    if missing:
        print('缺少立绘：' + '、'.join(missing), file=sys.stderr)

    # 校猫
    cat = Image.open(os.path.join(ROOT, CAT_SRC)).convert('RGBA')
    canvas = Image.new('RGB', SIZE, (18, 16, 22))
    head = cat.resize((200, 200), Image.LANCZOS)
    canvas.paste(head, (0, 30), head)
    buf = io.BytesIO()
    canvas.save(buf, 'WEBP', quality=84, method=6)
    data = buf.getvalue()
    total += len(data)
    out['cat'] = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)

    # 九宫格图标（80×80，和其它八个同一规格）
    icon = Image.open(os.path.join(ROOT, ICON_SRC)).convert('RGBA').resize((80, 80), Image.LANCZOS)
    icon.save(os.path.join(ROOT, ICON_OUT), 'WEBP', quality=90, method=6)

    print('卡面 %d 张 / 原始 %dKB → data/reign-faces.json %dKB' % (
        len(out), round(total / 1024), round(os.path.getsize(OUT_JSON) / 1024)))


if __name__ == '__main__':
    main()
