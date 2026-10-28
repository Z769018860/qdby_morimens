"""把典藏室 CG 压成游戏背景（idle/public/img/bg/hall-*.webp）。

挑选思路：背景会被压暗 + 1.5px 模糊，所以只挑「暗一点、横向、不是纯白 CG」的图；
按 id 分散取样，保证 24 张背景互相不像。
用法：python tools/build_bg.py
"""
import os
import sys
from PIL import Image, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, '..', 'assets', 'gallery')
OUT = os.path.join(ROOT, 'public', 'img', 'bg')
START = 13          # hall-01..12 是旧的一组，新的从 13 往后排
WANT = 24
WIDTH = 900


def score(path):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    small = im.resize((64, max(1, int(64 * h / w))))
    lum = ImageStat.Stat(small.convert('L')).mean[0]
    return im, lum, w / h


def main():
    files = sorted(f for f in os.listdir(SRC) if f.endswith('.webp') and '-m' not in f and '-f' not in f)
    cand = []
    for name in files:
        path = os.path.join(SRC, name)
        try:
            im, lum, ar = score(path)
        except Exception:
            continue
        if ar < 1.15 or lum > 118 or lum < 40:      # 太亮/太窄/几乎全黑都不要
            continue
        cand.append((name, lum, ar, im))
    if not cand:
        print('没有合适的素材'); sys.exit(1)

    # 均匀抽样：按列表等距取，避免一窝蜂都是同一章的 CG
    step = max(1, len(cand) // WANT)
    picked = cand[::step][:WANT]
    while len(picked) < WANT:                      # 不够就从头补
        picked.append(cand[len(picked) % len(cand)])

    os.makedirs(OUT, exist_ok=True)
    total = 0
    for i, (name, lum, ar, im) in enumerate(picked):
        w, h = im.size
        nh = max(1, int(WIDTH * h / w))
        im = im.resize((WIDTH, nh), Image.LANCZOS)
        out = os.path.join(OUT, f'hall-{START + i:02d}.webp')
        im.save(out, 'WEBP', quality=52, method=6)
        if os.path.getsize(out) < 6000:            # 压完太小 = 画面接近纯色，当背景不好看
            os.remove(out)
            continue
        total += os.path.getsize(out)
        print(f'hall-{START + i:02d}  {name}  lum={lum:.0f}  {os.path.getsize(out)//1024}KB')
    print(f'共 {len(picked)} 张，合计 {total//1024}KB')


if __name__ == '__main__':
    main()
