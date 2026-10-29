"""校猫头像：用「莱特」那张官方头像（忘忘看报·爱的节奏榜里给校猫用的就是它）。

来历：忘忘看报的「爱的节奏榜」把弥萨格校猫挂在 special-misag-school-cat 上，
头像取的是 Waline 头像集里的 160px-剧情角色-莱特头像.png —— 黑猫戴礼帽那张。
本站以前用过 story-小煤球（白色毛团，是另一只生物），后来换成造物图标里的黑猫，
现在统一回官方那张：既认得出是校猫，也和站内其它头像同一套画风。

做法：源图 256×256 已经是不透明方图，等比缩到 128×128（留 3px 边），
LANCZOS + 轻微锐化，输出 webp，规格和 Portrait_Small_Monster_*.webp 一致。

用法：python tools/build_cat.py
"""
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 优先用 256px 原图；仓库里没有就退回 assets/avatars-q 的 96px 版本
CANDIDATES = [
    os.path.join('D:/软件所/morimens/waline-avatars/qdby_chinese/assets/waline-avatars',
                 '剧情角色-莱特头像.png'),
    os.path.join(ROOT, '..', 'assets', 'avatars-q', 'story-莱特.webp'),
]

DST = os.path.join(ROOT, 'public', 'img', 'mon', 'Portrait_Small_Monster_catboss_black.webp')
SIZE = 128
PAD = 3


def pick_src():
    for p in CANDIDATES:
        if os.path.exists(p):
            return p
    sys.exit('找不到莱特头像，先跑 scripts/build_avatars_q.py 生成 assets/avatars-q')


def main():
    src = pick_src()
    im = Image.open(src).convert('RGBA')

    # 方图直接等比缩到画布内，不再裁透明边（这张本来就没有透明边）
    inner = SIZE - PAD * 2
    scale = min(inner / im.width, inner / im.height)
    w, h = max(1, round(im.width * scale)), max(1, round(im.height * scale))
    im = im.resize((w, h), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.0, percent=55, threshold=2))

    out = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(im, ((SIZE - w) // 2, (SIZE - h) // 2))
    os.makedirs(os.path.dirname(DST), exist_ok=True)
    out.save(DST, 'WEBP', quality=93, method=6)
    print(f'{src} -> {DST}  {out.size}  {os.path.getsize(DST)} bytes')


if __name__ == '__main__':
    main()
