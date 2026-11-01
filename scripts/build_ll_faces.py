# -*- coding: utf-8 -*-
"""lovelive！mori⭐mens！用的头像缩略图：96×96 原图 → 72×72 webp。

页面要把六十多位唤醒体的头像内联成一个脚本（边缘一次往返 1~2 秒，
六十二个请求不可接受）。原图 96×96 平均 3.9KB，缩到 72×72 后约 2.1KB，
整包从 240KB 降到 130KB；画布上最大只画到 40px（2 倍屏 80px），72 够用。

由 scripts/build.mjs 的 genLive() 读取产物；没跑过本脚本时会退回原图。
用法：python scripts/build_ll_faces.py
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets/ll-faces')
SIZE = 72
QUALITY = 80


def main():
    with open(os.path.join(ROOT, 'data/avatars.json'), encoding='utf-8') as f:
        av = json.load(f)
    units = [x for x in av['items'] if x.get('k') == 'awakener']
    if not units:
        print('avatars.json 里没有唤醒体', file=sys.stderr)
        return 1
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for u in units:
        src = os.path.join(ROOT, u['src'])
        if not os.path.exists(src):
            print('缺头像：' + u['src'], file=sys.stderr)
            return 1
        im = Image.open(src).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        dst = os.path.join(OUT, u['id'] + '.webp')
        im.save(dst, 'WEBP', quality=QUALITY, method=4)
        total += os.path.getsize(dst)
    print('lovelive 头像缩略图：%d 张，共 %d KB → %s' % (len(units), round(total / 1024), os.path.relpath(OUT, ROOT)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
