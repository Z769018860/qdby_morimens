"""校猫头像：把造物图标里的黑猫（Icon_Creation_055）做成 128×128 透明底怪物头像。

原来用的是 story-小煤球（白色毛团），那是另一只生物；校猫是弥萨格的黑猫。
源图只有 120×120，裁掉透明边后等比放到 124 高左右，用 LANCZOS 放大 + 轻微锐化，
和其他 Portrait_Small_Monster_*.webp（128×128 透明底）保持同一规格。

用法：python tools/build_cat.py
"""
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'assets', 'creation', 'Icon_Creation_055.webp')
DST = os.path.join(ROOT, 'public', 'img', 'mon', 'Portrait_Small_Monster_catboss_black.webp')
SIZE = 128
PAD = 3


def main():
    if not os.path.exists(SRC):
        sys.exit(f'找不到源图：{SRC}')
    im = Image.open(SRC).convert('RGBA')
    box = im.getbbox()
    if box:
        im = im.crop(box)
    # 等比缩放到画布内（留 3px 边），放大后轻微锐化补细节
    inner = SIZE - PAD * 2
    scale = min(inner / im.width, inner / im.height)
    w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=2))
    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(im, ((SIZE - w) // 2, (SIZE - h) // 2))
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    out.save(DST, 'WEBP', quality=92, method=6)
    print(f'{DST}  {out.size}  {os.path.getsize(DST)} bytes')


if __name__ == '__main__':
    main()
