#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把《命轮对决》卡表里用到的角色头像拼成一张图集，并生成卡背与首页图标。

为什么要拼图集：线上边缘每个请求固定 1~2 秒，一局里要显示十几张卡面，
逐张请求就是十几个来回。拼成一张 webp 后，整页仍然只有「页面 + 一个脚本」两个请求。

用法：python scripts/build_duel_art.py
输入：data/duel-cards.json + data/avatars.json（头像源 assets/avatars/a-*.webp，96×96）
输出：assets/duel/faces.webp（图集，88×88 一格）
      assets/duel/back.webp（卡背，132×188）
      assets/ui/gameicons/duel.webp（首页九宫格图标，80×80）
      data/duel-art.json（图集元数据：格宽、列数、名字 → 序号）
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 88
COLS = 8


def read_json(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return json.load(f)


def main():
    cards = read_json('data/duel-cards.json')
    meta = read_json('data/avatars.json')
    src_by_name = {x['n']: x['src'] for x in meta['items']}

    # 需要头像的名字：全部怪兽 + 觉醒体（觉醒体借用第一只素材的脸）
    names = []
    for c in cards['monsters']:
        key = c.get('art') or c['n']
        if key not in names:
            names.append(key)
    for c in cards['extras']:
        ref = c.get('art') or (c.get('mat') or [None])[0]
        if c['id'] == 'e12':
            ref = c['n']
        if ref and ref not in names:
            names.append(ref)
    # 卡包里会出现、但没做成怪兽的彩蛋卡（校猫）也留一格
    cat_q = 'assets/avatars-q/story-莱特.webp'

    # 三张牌在官方立绘里没有成品头像：N 与威廉只有 Q 版，神王·图鲁沿用「图鲁」的脸
    fallback_q = {
        'N': 'assets/avatars-q/char-n.webp',
        '威廉': 'assets/avatars-q/char-william.webp',
    }

    files = []
    missing = []
    for n in names:
        if n == '弥萨格校猫':
            p = os.path.join(ROOT, cat_q)
        elif n in fallback_q:
            p = os.path.join(ROOT, fallback_q[n])
        else:
            src = src_by_name.get(n)
            p = os.path.join(ROOT, src) if src else None
        if not p or not os.path.exists(p):
            missing.append(n)
            files.append(None)
        else:
            files.append(p)
    if missing:
        print('缺少头像：' + '、'.join(missing))
        if len(missing) > len(names) // 2:
            print('缺太多，先补素材')
            return 1

    rows = (len(files) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * CELL, rows * CELL), (14, 17, 25))
    index = {}
    for i, p in enumerate(files):
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        if not p:
            continue
        im = Image.open(p).convert('RGB').resize((CELL, CELL), Image.LANCZOS)
        sheet.paste(im, (x, y))
        index[names[i]] = i

    out_dir = os.path.join(ROOT, 'assets/duel')
    os.makedirs(out_dir, exist_ok=True)
    sheet_path = os.path.join(out_dir, 'faces.webp')
    sheet.save(sheet_path, 'WEBP', quality=78, method=6)

    # ---------------------------------------------------------------- 卡背
    # 深蓝底 + 金色命轮：外环、内环、四道界域色的弧光。132×188 是 2:3 不到一点，
    # 和卡面比例一致（卡面用 CSS 的 3/4 也行，这里只当归档与「盖牌」用）。
    W, H = 132, 188
    back = Image.new('RGB', (W, H), (13, 17, 28))
    d = ImageDraw.Draw(back, 'RGBA')
    for i in range(28):
        v = 12 - i * 0.35
        d.rectangle([0, i, W, i], fill=(int(18 + v), int(22 + v), int(36 + v), 255))
    cx, cy, r = W // 2, H // 2 - 6, 42
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(227, 179, 65, 210), width=3)
    d.ellipse([cx - r + 9, cy - r + 9, cx + r - 9, cy + r - 9], outline=(227, 179, 65, 90), width=1)
    for i, col in enumerate([(232, 101, 111), (217, 139, 106), (91, 155, 213), (227, 179, 65)]):
        a = -90 + i * 90
        d.arc([cx - r, cy - r, cx + r, cy + r], a + 4, a + 82, fill=col + (235,), width=4)
    d.line([cx, cy - 16, cx + 13, cy, cx, cy + 16, cx - 13, cy, cx, cy - 16],
           fill=(227, 179, 65, 230), width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(227, 179, 65, 255))
    back.save(os.path.join(out_dir, 'back.webp'), 'WEBP', quality=86, method=6)

    # ------------------------------------------------------------ 首页图标
    # 80×80：同一套命轮，缩到图标尺寸不能有太细的线，所以线宽加粗、去掉内环。
    S = 80
    icon = Image.new('RGB', (S, S), (12, 16, 26))
    di = ImageDraw.Draw(icon, 'RGBA')
    for i in range(S):
        t = i / S
        di.line([(0, i), (S, i)], fill=(int(14 + 12 * t), int(18 + 14 * t), int(30 + 20 * t), 255))
    c = S // 2
    rad = 28
    di.ellipse([c - rad, c - rad, c + rad, c + rad], outline=(227, 179, 65, 255), width=4)
    for i, col in enumerate([(232, 101, 111), (217, 139, 106), (91, 155, 213), (227, 179, 65)]):
        a = -90 + i * 90
        di.arc([c - rad, c - rad, c + rad, c + rad], a + 6, a + 80, fill=col + (255,), width=6)
    di.line([c, c - 11, c + 9, c, c, c + 11, c - 9, c, c, c - 11], fill=(255, 226, 150, 255), width=3)
    di.ellipse([c - 2, c - 2, c + 2, c + 2], fill=(255, 240, 200, 255))
    icon_path = os.path.join(ROOT, 'assets/ui/gameicons/duel.webp')
    icon.save(icon_path, 'WEBP', quality=90, method=6)

    out_meta = {
        'cell': CELL, 'cols': COLS, 'rows': rows,
        'w': COLS * CELL, 'h': rows * CELL,
        'index': index,
    }
    with open(os.path.join(ROOT, 'data/duel-art.json'), 'w', encoding='utf-8') as f:
        json.dump(out_meta, f, ensure_ascii=False, separators=(',', ':'))

    kb = os.path.getsize(sheet_path) / 1024
    print('图集 %d 张 → %dx%d，%.0fKB；卡背 %.0fKB；图标 %.0fKB'
          % (len(index), COLS * CELL, rows * CELL, kb,
             os.path.getsize(os.path.join(out_dir, 'back.webp')) / 1024,
             os.path.getsize(icon_path) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
