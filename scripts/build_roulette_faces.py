# -*- coding: utf-8 -*-
"""弥萨格轮盘的选人头像：原图 → 64×64 webp，落在 assets/roulette/faces/<id>.webp。

为什么另存一份：轮盘选人一屏要同时出现 74 张脸，gen.js 会把它们内联成 data URI
（边缘一次往返就是 1~2 秒，74 个独立请求不可接受）。头像原图平均 3.5KB，
74 张内联后约 420KB；缩到 64×64 后每张约 1.3KB，整包 130KB 上下——
和其它几个游戏的内联量级一致（lovelive 62 张 130KB）。

主播的立绘是竖图，这里从偏上方裁一个正方形（脸在那一块），再缩。

用法：python scripts/build_roulette_faces.py
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/roulette/faces')
SIZE = 64
QUALITY = 78


def main():
    with open(os.path.join(ROOT, 'data/roulette-chars.json'), encoding='utf-8') as f:
        chars = json.load(f)['chars']
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for c in chars:
        src = os.path.join(ROOT, c.get('src') or ('assets/avatars/%s.webp' % c['id']))
        if not os.path.exists(src):
            print('缺头像：' + src, file=sys.stderr)
            return 1
        im = Image.open(src).convert('RGB')
        w, h = im.size
        if w != h:
            side = min(w, h)
            # 竖图取偏上：脸通常在上三分之一
            top = max(0, int((h - side) * 0.28))
            left = max(0, (w - side) // 2)
            im = im.crop((left, top, left + side, top + side))
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        dst = os.path.join(OUT, c['id'] + '.webp')
        im.save(dst, 'WEBP', quality=QUALITY, method=4)
        total += os.path.getsize(dst)
    print('写入 %d 张，共 %.0f KB' % (len(chars), total / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
