# -*- coding: utf-8 -*-
"""为每张 CG 生成一套页面主题（配色）。

思路：把图缩到 48×48，量化成 6 色，取「面积最大」的当底色、「饱和度最高且面积够」的当强调色，
再用底色亮度决定文字是深色还是浅色。结果写进 data/themes.json，前端只做 CSS 变量注入。

输出示例：
  "CG_C01_001": {"bg":"#12100f","panel":"#1b1917","line":"#332e2a",
                 "text":"#f0ebe6","dim":"#9d968f","accent":"#c9a227","gold":"#e8c76a","dark":1}
"""
import colorsys
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
Q = 6


def hexc(rgb):
    return '#%02x%02x%02x' % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def rgba(rgb, a):
    r, g, b = (max(0, min(255, int(round(c)))) for c in rgb)
    return f'rgba({r},{g},{b},{a})'


def warmest(cols):
    """图中最暖的高饱和色（色相 15°–75°），用来当金色强调；没有就返回 None。"""
    best = None
    for w, c in cols:
        h, l, s = colorsys.rgb_to_hls(*(x / 255 for x in c))
        deg = h * 360
        if 15 <= deg <= 75 and s >= 0.3 and l >= 0.25:
            score = w * (0.6 + s)
            if best is None or score > best[0]:
                best = (score, c)
    return best[1] if best else None


def mix(a, b, t):
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))


def scale(rgb, k):
    return tuple(c * k for c in rgb)


def sat_val(rgb):
    h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    return s, l, h


def palette(path):
    im = Image.open(path).convert('RGB')
    im = im.resize((48, 48), Image.LANCZOS)
    pal = im.quantize(colors=Q, method=Image.MEDIANCUT)
    raw = pal.getpalette() or []
    counts = sorted(pal.getcolors() or [], reverse=True)
    total = sum(c for c, _ in counts) or 1
    colors = []
    for cnt, idx in counts:
        rgb = raw[idx * 3: idx * 3 + 3]
        if len(rgb) < 3:
            continue
        colors.append((cnt / total, tuple(rgb)))
    return colors


def theme_of(path):
    cols = palette(path)
    if not cols:
        return None
    # 底色：占比最高的颜色，往暗/亮压一档
    base = cols[0][1]
    _, base_l, _ = sat_val(base)
    dark = base_l < 0.62

    # 强调色：面积 >= 6% 里饱和度最高的；没有就退回底色提亮
    cand = [(w, c) for w, c in cols if w >= 0.06]
    if not cand:
        cand = cols[:3]
    accent = max(cand, key=lambda wc: sat_val(wc[1])[0] * (0.5 + wc[0]))[1]
    a_s, a_l, a_h = sat_val(accent)
    if a_s < 0.28:  # 太灰，拉一点饱和度
        r, g, b = (c / 255 for c in accent)
        h, l, s = colorsys.rgb_to_hls(r, g, b)
        accent = tuple(int(c * 255) for c in colorsys.hls_to_rgb(h, min(0.62, max(0.42, l)), 0.55))

    warm = warmest(cols)
    if dark:
        bg = scale(mix(base, (0, 0, 0), 0.66), 0.9)
        panel = mix(bg, (255, 255, 255), 0.07)
        panel2 = mix(bg, (255, 255, 255), 0.12)
        line = mix(bg, (255, 255, 255), 0.19)
        text = mix((255, 255, 255), base, 0.1)
        dim = mix(text, bg, 0.48)
        accent = mix(accent, (255, 255, 255), 0.34)
        gold = mix(warm, (255, 255, 255), 0.22) if warm else mix((236, 214, 158), accent, 0.3)
    else:
        bg = mix(base, (255, 255, 255), 0.74)
        panel = mix(bg, (255, 255, 255), 0.6)
        panel2 = mix(bg, (255, 255, 255), 0.35)
        line = mix(bg, (0, 0, 0), 0.15)
        text = mix((18, 20, 26), base, 0.14)
        dim = mix(text, bg, 0.45)
        accent = mix(accent, (0, 0, 0), 0.24)
        gold = mix(warm, (90, 60, 0), 0.3) if warm else mix((150, 112, 30), accent, 0.32)

    return {
        'bg': hexc(bg),
        'panel': rgba(panel, 0.74),
        'panel2': rgba(panel2, 0.72),
        'line': hexc(line),
        'text': hexc(text), 'dim': hexc(dim),
        'accent': hexc(accent), 'gold': hexc(gold),
        'dark': 1 if dark else 0,
    }


def main():
    gal = json.load(open(os.path.join(ROOT, 'data', 'gallery.json'), encoding='utf-8'))
    out = {}
    miss = 0
    for item in gal.get('items', []):
        p = os.path.join(ROOT, item['f'].replace('/', os.sep))
        if not os.path.exists(p):
            miss += 1
            continue
        try:
            th = theme_of(p)
        except Exception as e:  # noqa: BLE001
            print('skip', item.get('n'), e)
            miss += 1
            continue
        if th:
            out[item['id']] = th
    dst = os.path.join(ROOT, 'data', 'themes.json')
    json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'themes {len(out)} (missing {miss}) -> {os.path.getsize(dst) / 1024:.0f} KB')
    dark = sum(1 for v in out.values() if v['dark'])
    print(f'dark {dark} / light {len(out) - dark}')
    for k in list(out)[:3]:
        print(' ', k, out[k])


if __name__ == '__main__':
    main()
