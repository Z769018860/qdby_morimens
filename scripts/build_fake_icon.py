#!/usr/bin/env python3
"""《寻找伪人：Morimens》的九宫格图标。

80×80（与其它游戏图标同尺寸），从 Q 版头像（assets/avatars-q/char-c06.webp，「24」）来：
以「24」那只露在头发外的眼睛为中心取景 → 像素化 → 压暗提对比 → 暗部染红重影 → 扫描线 → 红框。

为什么是这只眼：24 的 Q 版头像里右半张脸被头发盖住，只剩一只眼和一张微张的嘴——
「隔着门缝看人」的画面本身就是这个游戏要的东西，而且 36px 下只有一只眼最省笔画。
早先试过整张头像缩到 160px，脸被提亮到全白、眼睛消失，36px 下就是一团红糊，已弃用。

只跑一次的东西，留个脚本是为了以后想换人/换色还能复现。

用法：python scripts/build_fake_icon.py [头像名] [输出名]
"""
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/avatars-q/char-c06.webp'   # 「24」：分裂患者，一张脸抄成两张
OUT = ROOT / 'assets/ui/gameicons/fake.webp'
S = 80            # 九宫格里显示 36px，80px 的源够 2x
BOX = (12, 30, 64, 82)   # 源图 96×96 里的取景框：只框住露出来的那只眼和嘴
N = 56            # 先缩到 56 再 NEAREST 放大，得到 1.4px 的像素块


def main():
    global SRC, OUT
    if len(sys.argv) > 1:
        SRC = ROOT / 'assets/avatars-q' / (sys.argv[1] + '.webp')
    if len(sys.argv) > 2:
        OUT = ROOT / 'assets/ui/gameicons' / (sys.argv[2] + '.webp')

    im = Image.open(SRC).convert('RGBA').crop(BOX)
    im = im.resize((N, N), Image.LANCZOS).resize((S, S), Image.NEAREST)
    im = ImageEnhance.Brightness(im).enhance(0.86)          # 脸本来就很白，先压一点，别糊成白板
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=0))
    im = ImageEnhance.Contrast(im).enhance(1.42)
    im = ImageEnhance.Color(im).enhance(1.15)
    a = im.split()[3]
    im = im.convert('RGB').quantize(colors=14, method=Image.MEDIANCUT).convert('RGBA')
    im.putalpha(a)

    bg = Image.new('RGBA', (S, S), (11, 10, 15, 255))
    bg.alpha_composite(im)

    # 扫描线（0.97，只当质感，再重就把睫毛扫没了）
    px = bg.load()
    for y in range(0, S, 3):
        for x in range(S):
            r, g, b, al = px[x, y]
            px[x, y] = (int(r * 0.97), int(g * 0.97), int(b * 0.97), al)

    # 红色只留在边框：2px 实心红框 + 往里 5px 的红色渐隐
    # （早先试过整张暗部染红 + 色彩分离，36px 下脸和头发一起变成一团红褐糊，眼睛全没）
    px = bg.load()
    for y in range(S):
        for x in range(S):
            d = min(x, y, S - 1 - x, S - 1 - y)
            r, g, b, al = px[x, y]
            if d < 2:
                px[x, y] = (min(255, int(r * 0.45 + 118)), int(g * 0.30), int(b * 0.30), 255)
            elif d < 7:
                k = (7 - d) / 5.0 * 0.75
                px[x, y] = (min(255, int(r + 120 * k)), int(g * (1 - 0.55 * k)), int(b * (1 - 0.55 * k)), al)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bg.convert('RGB').save(OUT, 'WEBP', quality=88, method=6)
    print('%s  %d 字节' % (OUT.relative_to(ROOT), OUT.stat().st_size))


if __name__ == '__main__':
    main()
