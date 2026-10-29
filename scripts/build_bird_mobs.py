# -*- coding: utf-8 -*-
"""把《忘却前夜》自带的怪物立绘压成一张小图集，供「是鸟弟就下100层」用。

原作 assets/monster 里是 160x160 的 Portrait_Small_Monster_*.webp（带透明通道），
一只怪物一张文件。游戏跑在「每个请求 1~2 秒」的边缘上，五只怪各发一个请求
就是一整秒的等待，所以这里裁掉透明边、按内容高度缩放、拼成一张横向雪碧图，
构建时再由 scripts/build.mjs 内联成 data URI —— 整页仍然只有一个脚本请求。

用法：python scripts/build_bird_mobs.py
产出：assets/pollux-bird/bird-mobs.webp + data/bird-mobs.json
"""
from __future__ import annotations

import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'monster')
OUT_SHEET = os.path.join(ROOT, 'assets', 'pollux-bird', 'bird-mobs.webp')
OUT_META = os.path.join(ROOT, 'data', 'bird-mobs.json')

# 每只怪物的目标内容高度（px）。提灯细长，压低一点免得在井里显得过大。
# art 是原图里的文件名后缀，名字和描述直接抄原作图鉴，游戏里击杀时飘出来。
MOBS = [
    # key,      原图后缀,               目标高, 中文名,      阶级
    ('rat',     'S0201',                 92, '融蚀鼠王',  '普通'),
    ('lantern', 'S0401',                 90, '提灯',      '普通'),
    ('pustule', 'C0301',                 86, '自爆脓疱',  '普通'),
    ('chanter', 'C0503',                 94, '吟诵者',    '普通'),
    ('hound',   'S0202',                 90, '融蚀野犬',  '普通'),
]
PAD = 4  # 相邻两只之间留白，缩放采样时不会互相蹭到


def trim(im: Image.Image) -> Image.Image:
    """按 alpha 通道裁掉四周透明边 —— 原作立绘的留白比例每张都不一样。"""
    box = im.split()[-1].getbbox()
    return im.crop(box) if box else im


def main() -> None:
    pieces = []
    for key, suffix, target_h, zh, cls in MOBS:
        path = os.path.join(SRC, f'Portrait_Small_Monster_{suffix}.webp')
        if not os.path.exists(path):
            raise SystemExit(f'缺少怪物立绘：{path}')
        im = trim(Image.open(path).convert('RGBA'))
        scale = target_h / im.height
        w = max(1, round(im.width * scale))
        im = im.resize((w, target_h), Image.LANCZOS)
        pieces.append((key, im, zh, cls))

    total_w = sum(p[1].width for p in pieces) + PAD * (len(pieces) + 1)
    max_h = max(p[1].height for p in pieces)
    sheet = Image.new('RGBA', (total_w, max_h + PAD * 2), (0, 0, 0, 0))

    rects = {}
    x = PAD
    for key, im, zh, cls in pieces:
        # 底对齐：怪物都站在同一个水平线上，游戏里画的时候 y 就是脚底
        y = PAD + (max_h - im.height)
        sheet.alpha_composite(im, (x, y))
        rects[key] = {'x': x, 'y': y, 'w': im.width, 'h': im.height, 'zh': zh, 'cls': cls}
        x += im.width + PAD

    os.makedirs(os.path.dirname(OUT_SHEET), exist_ok=True)
    sheet.save(OUT_SHEET, 'WEBP', quality=86, method=6)
    meta = {'w': sheet.width, 'h': sheet.height, 'rects': rects}
    with open(OUT_META, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))

    kb = os.path.getsize(OUT_SHEET) / 1024
    print(f'图集 {sheet.width}x{sheet.height}  {kb:.1f}KB  {len(rects)} 只')
    for k, r in rects.items():
        print(f"  {k:8s} {r['w']:>3d}x{r['h']:<3d} {r['zh']}")


if __name__ == '__main__':
    main()
