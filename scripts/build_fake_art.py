#!/usr/bin/env python3
"""《寻找伪人：Morimens》的像素素材图集。

三张图解决 73 个角色的全部画面需求：

  1. assets/fake/idle.webp   —— 战斗立绘（门外站着的那位）。源是 assets/bazaar/idle/*.webp，
     320px 高的透明立绘；缩到 132px、像素化、32 色调色板。
  2. assets/fake/card.webp   —— 立绘（档案夹里的那张全身照）。源是 assets/card/*.webp，
     240x600 的官方卡面；缩到 96x240。
  3. assets/fake/bust.webp   —— 登记卡上的小头像。源是 assets/awakener/*.webp（120x120 胸像）。
  4. assets/fake/face.webp   —— 11 位主播的 B 站头像（assets/survivors/faces/*.webp），
     他们没有战斗立绘，游戏里是「头像 + 火柴人」，脑袋就是这张。

为什么全拼成图集：EdgeOne 每个请求固定 1~2 秒，73 个人各拉一张图就是 73 个来回。
图集一共 4 个文件，构建时再内联成 data URI 塞进一个模块（见 scripts/build.mjs 的 genFake）。

像素化不是简单缩小：先按 block 降采样再 NEAREST 放回原尺寸，边缘像素才是硬边方块；
然后统一调色板量化（所有人共用一套 32 色，画面才不会花）。

用法：python scripts/build_fake_art.py [--q 62]
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/fake'
Q = 62

IDLE_H = 132          # 战斗立绘在门外的高度（画布 480x270 里约占一半）
CARD_BOX = (96, 240)  # 档案照
BUST = 48
FACE = 96
COLS = 8

# 与游戏里一致的调色板（暗室 + 血 + 灯）。量化到这一套，四张图放在一起才像同一个游戏。
PALETTE = [
    (8, 8, 11), (16, 17, 23), (24, 26, 34), (34, 37, 48), (46, 50, 64), (60, 65, 82),
    (78, 84, 103), (99, 106, 127), (124, 131, 152), (152, 158, 176), (182, 187, 200),
    (210, 213, 220), (236, 238, 242), (255, 255, 255),
    (58, 32, 30), (92, 42, 36), (128, 52, 42), (166, 62, 50), (198, 82, 62),
    (78, 54, 34), (116, 82, 44), (154, 112, 58), (196, 150, 82), (226, 190, 122),
    (44, 52, 58), (62, 82, 92), (88, 120, 134), (122, 162, 178),
    (56, 44, 72), (88, 68, 110), (128, 102, 152), (74, 92, 62), (108, 132, 88),
]


def pixelize(im, block=2):
    """降采样再 NEAREST 放大：让每个像素变成 block×block 的方块。"""
    if block <= 1:
        return im
    w, h = im.size
    small = im.resize((max(1, w // block), max(1, h // block)), Image.LANCZOS)
    return small.resize((w, h), Image.NEAREST)


def to_palette(im, alpha_th=110):
    """把 RGBA 图量化到共用调色板；alpha 二值化，边缘才是硬像素。"""
    im = im.convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v >= alpha_th else 0)
    rgb = im.convert('RGB')
    pal = Image.new('P', (1, 1))
    flat = []
    for c in PALETTE:
        flat.extend(c)
    flat.extend([0] * (768 - len(flat)))
    pal.putpalette(flat)
    q = rgb.quantize(palette=pal, dither=Image.NONE).convert('RGB')
    out = q.convert('RGBA')
    out.putalpha(a)
    return out


def fit(im, box_w, box_h):
    """等比塞进 box，透明图按 alpha 裁边。"""
    im = im.convert('RGBA')
    b = im.getchannel('A').point(lambda v: 255 if v >= 40 else 0).getbbox()
    if b:
        im = im.crop(b)
    k = min(box_w / im.width, box_h / im.height)
    w = max(1, round(im.width * k))
    h = max(1, round(im.height * k))
    return im.resize((w, h), Image.LANCZOS)


def load_idle(slug):
    p = ROOT / 'assets/bazaar/idle' / (slug + '.webp')
    if not p.exists():
        return None
    return Image.open(p).convert('RGBA')


def load_card(slug):
    p = ROOT / 'assets/card' / (slug + '.webp')
    if not p.exists() and slug == '24':
        p = ROOT / 'assets/card/mason.webp'
    if not p.exists():
        return None
    im = Image.open(p).convert('RGB')
    # 卡面是 240x600 的竖图，顶上留了 8% 的装饰边，裁掉再缩
    return im.crop((0, int(im.height * 0.06), im.width, im.height))


def load_bust(slug):
    p = ROOT / 'assets/awakener' / (slug + '.webp')
    if not p.exists():
        p = ROOT / 'assets/avatars' / ('a-15601.webp' if slug == '24' else slug + '.webp')
    if not p.exists():
        return None
    return Image.open(p).convert('RGBA')


def sheet(items, cell_w, cell_h, cols, bg=(0, 0, 0, 0)):
    rows = (len(items) + cols - 1) // cols
    img = Image.new('RGBA', (cols * cell_w, rows * cell_h), bg)
    rects = []
    for i, im in enumerate(items):
        cx = (i % cols) * cell_w
        cy = (i // cols) * cell_h
        x = cx + (cell_w - im.width) // 2
        y = cy + cell_h - im.height          # 底对齐：脚在同一水平线上
        img.alpha_composite(im, (x, y))
        rects.append([x, y, im.width, im.height])
    return img, rects


def main():
    global Q
    if '--q' in sys.argv:
        Q = int(sys.argv[sys.argv.index('--q') + 1])
    OUT.mkdir(parents=True, exist_ok=True)

    gd = json.loads((ROOT / 'idle/public/data/game-data.json').read_text(encoding='utf-8'))
    extra = json.loads((ROOT / 'data/survivors-extra.json').read_text(encoding='utf-8'))

    chars = []
    idle_items, card_items, bust_items = [], [], []
    idle_meta = {}
    for a in gd['awakeners']:
        slug = a['slug']
        idle = load_idle(slug)
        card = load_card(slug)
        bust = load_bust(slug)
        if idle is None or card is None or bust is None:
            print('  ! %-14s idle=%s card=%s bust=%s' % (slug, bool(idle), bool(card), bool(bust)))
            if idle is None and card is not None:
                idle = card
            if idle is None:
                continue
        im_idle = to_palette(pixelize(fit(idle, IDLE_H * 0.95, IDLE_H), 2))
        im_card = to_palette(pixelize(fit(card, CARD_BOX[0], CARD_BOX[1]), 2))
        im_bust = to_palette(pixelize(fit(bust, BUST, BUST), 2))
        idle_items.append(im_idle)
        card_items.append(im_card)
        bust_items.append(im_bust)
        idle_meta[slug] = [im_idle.width, im_idle.height]
        chars.append({'slug': slug, 'n': a['zh']})

    face_items = []
    for c in extra['chars']:
        p = ROOT / c['face']
        if not p.exists():
            print('  ! 主播头像缺失', c['face'])
            face_items.append(Image.new('RGBA', (FACE, FACE), (0, 0, 0, 0)))
            continue
        im = to_palette(pixelize(fit(Image.open(p).convert('RGBA'), FACE, FACE), 2), alpha_th=1)
        face_items.append(im)

    out_meta = {'chars': chars}
    for name, items, cw, ch in (
        ('idle', idle_items, 112, IDLE_H + 4),
        ('card', card_items, CARD_BOX[0] + 6, CARD_BOX[1] + 6),
        ('bust', bust_items, BUST + 2, BUST + 2),
        ('face', face_items, FACE + 4, FACE + 4),
    ):
        img, rects = sheet(items, cw, ch, COLS)
        f = OUT / (name + '.webp')
        img.save(f, 'WEBP', quality=Q, method=6, lossless=False, exact=False)
        out_meta[name] = {'cell': [cw, ch], 'cols': COLS, 'size': list(img.size), 'rects': rects,
                          'kb': round(os.path.getsize(f) / 1024, 1)}
        print('  %-6s %4d 张  %-11s  %6.1fKB' % (name, len(items), '%dx%d' % img.size,
                                                 os.path.getsize(f) / 1024))

    (ROOT / 'data/fake-art.json').write_text(
        json.dumps(out_meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print('  → data/fake-art.json（%d 名唤醒体 + %d 位主播）' % (len(chars), len(face_items)))


if __name__ == '__main__':
    main()
