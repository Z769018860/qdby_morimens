# -*- coding: utf-8 -*-
"""离线版（PWA / 桌面版）用的应用图标。

favicon.svg 是放大镜，这里按同一套造型画成 PNG：192 / 512 各一张（Chrome 装 PWA 要），
另加一张 512 的 maskable（安卓桌面图标会被裁成圆形/方形，安全区留 20%）。

用法：python scripts/build_app_icons.py
"""
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'app')

BG = (31, 36, 48)
GOLD = (232, 176, 75)


def draw(size, pad_ratio=0.0, rounded=True):
    s = 4  # 超采样，缩小后边缘才不糊
    W = size * s
    im = Image.new('RGBA', (W, W), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = int(W * pad_ratio)
    box = pad
    side = W - pad * 2
    r = int(side * 0.22)
    if rounded:
        d.rounded_rectangle([box, box, box + side, box + side], radius=r, fill=BG + (255,))
    else:
        d.rectangle([box, box, box + side, box + side], fill=BG + (255,))

    cx, cy = W / 2, W / 2
    rr = side * 0.21          # 镜片半径
    lw = max(2, int(side * 0.072))
    d.ellipse([cx - rr, cy - rr - side * 0.015, cx + rr, cy + rr - side * 0.015], outline=GOLD + (255,), width=lw)
    # 手柄
    x0 = cx + rr * 0.70
    y0 = cy + rr * 0.70 - side * 0.015
    x1 = cx + rr * 1.72
    y1 = cy + rr * 1.72 - side * 0.015
    d.line([x0, y0, x1, y1], fill=GOLD + (255,), width=int(lw * 1.28))
    # 镜片中心的小点
    r2 = rr * 0.22
    d.ellipse([cx - r2, cy - r2 - side * 0.015, cx + r2, cy + r2 - side * 0.015], fill=GOLD + (255,))
    return im.resize((size, size), Image.LANCZOS)


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512):
        p = os.path.join(OUT, f'icon-{size}.png')
        draw(size).save(p, 'PNG', optimize=True)
        print(p, os.path.getsize(p), 'bytes')
    # maskable：整块底色 + 内缩 10%，避免被系统圆角切掉镜片
    p = os.path.join(OUT, 'icon-maskable-512.png')
    draw(512, pad_ratio=0.0).save(p, 'PNG', optimize=True)
    print(p, os.path.getsize(p), 'bytes')

    # Windows 桌面版的 exe 图标：一个 .ico 里塞多档尺寸，任务栏/大图标/小列表都用得上。
    # 为什么要自己做：electron-builder 改 exe 资源要下 winCodeSign（含 macOS 符号链接），
    # 普通权限解压必失败，所以我们自己用 resedit 写图标（见 scripts/build_desktop.mjs）。
    p = os.path.join(OUT, 'icon.ico')
    draw(256).save(p, 'ICO', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print(p, os.path.getsize(p), 'bytes')


if __name__ == '__main__':
    main()
