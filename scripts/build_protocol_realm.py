#!/usr/bin/env python3
"""把官方界域徽记（assets/realm/*.webp，94×94）处理成游戏里用的小图标。

原图是「深色菱形徽记 + 外面一圈灰色雾状笔触」，雾在深色界面上会显成一块脏灰，
所以这里做两件事：裁到菱形附近、把低饱和的灰雾透明度压下去，再缩到 44×44。
输出 assets/protocol/realm-<key>.webp（每个 2~3KB），构建时由 scripts/build.mjs
内联成 data URI 写进 js/pf/gen.js —— 页面上不会多出四个请求。

用法：
  python scripts/build_protocol_realm.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/realm'
OUT = ROOT / 'assets/protocol'
KEYS = ['caro', 'aequor', 'chaos', 'ultra']

CROP = (12, 12, 82, 82)     # 菱形大约在中心 60% 的区域，留一圈余量
SIZE = 44
FOG_CUT = 0.22              # 灰雾保留的透明度比例


def is_fog(r, g, b):
    """低饱和 + 中等亮度 = 雾。徽记本身是彩色或近黑的，不会被误判。"""
    mx, mn = max(r, g, b), min(r, g, b)
    sat = 0 if mx == 0 else (mx - mn) / mx
    lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return sat < 0.16 and lum > 0.30


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for k in KEYS:
        im = Image.open(SRC / ('%s.webp' % k)).convert('RGBA').crop(CROP)
        px = im.load()
        w, h = im.size
        for y in range(h):
            for x in range(w):
                r, g, b, a = px[x, y]
                if a and is_fog(r, g, b):
                    px[x, y] = (r, g, b, int(a * FOG_CUT))
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        dst = OUT / ('realm-%s.webp' % k)
        im.save(dst, 'WEBP', quality=90, method=6)
        print('%-8s %s  %d bytes' % (k, dst.relative_to(ROOT), dst.stat().st_size))

    # 拼一张预览图，方便人眼确认四个徽记在同一底色上还认得出
    prev = Image.new('RGBA', (SIZE * 4 + 30, SIZE + 20), (14, 17, 24, 255))
    for i, k in enumerate(KEYS):
        im = Image.open(OUT / ('realm-%s.webp' % k)).convert('RGBA')
        prev.alpha_composite(im, (10 + i * (SIZE + 6), 10))
    prev.save(ROOT / 'assets/protocol/realm-preview.png')
    print('预览 → assets/protocol/realm-preview.png')


if __name__ == '__main__':
    main()
