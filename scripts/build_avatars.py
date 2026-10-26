# -*- coding: utf-8 -*-
"""生成个人中心可选的预设头像：唤醒体立绘 + 精选 CG 方图裁切。

输出 assets/avatars/*.webp 与 data/avatars.json
"""
import json
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'avatars')
SIZE = 96

CG_PICK = ['CG_C01_001', 'CG_C02_004', 'CG_C05_002', 'CG_C09_012',
           'CG_C201_001', 'CG_Coll_Entry_01', 'CGDynamic_C01_001_A', 'CG_SD_L_B02_1']


def square_crop(im, focus=0.34):
    w, h = im.size
    if w == h:
        return im
    side = min(w, h)
    left = (w - side) // 2
    top = int(max(0, min(h - side, h * focus - side / 2)))
    return im.crop((left, top, left + side, top + side))


def save(im, path):
    im = square_crop(im.convert('RGB'))
    im = im.resize((SIZE, SIZE), Image.LANCZOS)
    im.save(path, 'WEBP', quality=86, method=5)


def main():
    os.makedirs(OUT, exist_ok=True)
    dict_path = os.path.join(ROOT, 'data', 'dictionary.json')
    d = json.load(open(dict_path, encoding='utf-8'))
    items = []

    for a in d.get('awakener', []):
        src = a.get('img')
        if not src:
            continue
        p = os.path.join(ROOT, src.replace('/', os.sep))
        if not os.path.exists(p):
            continue
        name = f"a-{a['id']}.webp"
        try:
            save(Image.open(p), os.path.join(OUT, name))
        except Exception as e:  # noqa: BLE001
            print('skip', a.get('zh'), e)
            continue
        items.append({
            'id': f"a-{a['id']}", 'n': a.get('zh') or a.get('en'),
            'en': a.get('en'), 'src': f'assets/avatars/{name}', 'k': 'awakener',
        })

    gallery = json.load(open(os.path.join(ROOT, 'data', 'gallery.json'), encoding='utf-8'))
    by_name = {g['n'].rsplit('.', 1)[0]: g for g in gallery.get('items', [])}
    for key in CG_PICK:
        g = by_name.get(key)
        if not g:
            continue
        p = os.path.join(ROOT, g['f'].replace('/', os.sep))
        if not os.path.exists(p):
            continue
        name = f"cg-{key}.webp"
        try:
            save(Image.open(p).convert('RGB'), os.path.join(OUT, name))
        except Exception as e:  # noqa: BLE001
            print('skip cg', key, e)
            continue
        items.append({
            'id': f'cg-{key}', 'n': g.get('t') or key, 'en': g.get('e'),
            'src': f'assets/avatars/{name}', 'k': 'cg',
        })

    json.dump({'size': SIZE, 'items': items},
              open(os.path.join(ROOT, 'data', 'avatars.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    print(f'avatars {len(items)} -> assets/avatars')
    print('bytes', sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT)))


if __name__ == '__main__':
    main()
