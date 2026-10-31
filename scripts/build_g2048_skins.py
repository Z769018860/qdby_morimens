#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""给「忘却 2048」的换皮做素材池。

两种皮：
  · 随机造物 —— 从图鉴的「造物」里挑一批（默认 48 件），每级抽一个不重复的图标；
  · 唤醒体   —— 全部 62 位（除开没有立绘的），每级抽一个不重复的脸。

原始素材是 120×120、每张 4~5KB；棋盘上最大也就 110px，所以统一缩到 96px 再压一遍，
一个池子能省三成体积。池子本身不进首屏：构建时被打包成 js/g2048-skins.js，
玩家第一次点「换皮」才动态 import（见 js/g2048.js 的 loadSkins）。

产物：
  assets/ui/g2048-skins/<slug>.webp     缩好的图
  data/g2048-skins.json                 池子清单（名字 + 图路径），供 build_g2048_art.mjs 内联

造物池的挑法：SSR / SR 全要（图标最花），剩下的 N 级按文件名等距抽样，
总数凑到 CREATION_N。显影链本来在用的那 11 件要排掉——那套是原版皮肤。
只改这里的规则才需要重跑；build.mjs 只在生成 js/g2048-art.js 时读 json，不会再动素材。
"""
import json
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 96
QUALITY = 76
CREATION_N = 48
OUT_DIR = os.path.join(ROOT, 'assets/ui/g2048-skins')

CHAIN = json.load(open(os.path.join(ROOT, 'data/g2048-levels.json'), encoding='utf-8'))
CHAIN_IMGS = {os.path.basename(l['img']) for l in CHAIN['levels']}


def slug(path):
    """assets/creation/Icon_Creation_089.webp → c089；Icon_Creation_144_AT → c144-at；
    assets/awakener/mason.webp → a-mason。
    编号后面还可能跟 _AT 这类后缀（同一件造物的异画），不带上会两张图撞成同一个文件名。"""
    base = os.path.basename(path).rsplit('.', 1)[0]
    if base.startswith('Icon_Creation_'):
        tail = base[len('Icon_Creation_'):]
        num = re.match(r'\d+', tail)
        rest = tail[num.end():] if num else ''
        sl = 'c' + (num.group(0) if num else re.sub(r'\W', '', tail))
        if rest:
            sl += '-' + re.sub(r'[^a-z0-9]+', '-', rest.lower()).strip('-')
        return sl
    return 'a-' + re.sub(r'[^\w-]', '', base)


def clean_name(n):
    """图鉴里有几条名字是抓取残留（<WhiteQuality:时间之虫>），只留冒号后面的真名。"""
    n = (n or '').strip()
    m = re.match(r'^<[^>]*>\s*(.+)$', n)
    if m:
        return m.group(1).strip()
    if ':' in n and n.startswith('<'):
        return n.split(':', 1)[1].rstrip('>').strip()
    return n


def shrink(src, dst, size=SIZE, quality=QUALITY):
    im = Image.open(src).convert('RGBA')
    # 立绘是 120×120 的方形，直接缩放；万一以后换成不是方形的，先居中裁方
    w, h = im.size
    if w != h:
        s = min(w, h)
        im = im.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    im = im.resize((size, size), Image.LANCZOS)
    im.save(dst, 'WEBP', quality=quality, method=6)
    return os.path.getsize(dst)


def pick_creation(d):
    cand = []
    for x in d['creation']:
        if x.get('kind') != '造物':
            continue
        img = x.get('img') or ''
        if not img or not os.path.exists(os.path.join(ROOT, img)):
            continue
        if os.path.basename(img) in CHAIN_IMGS:
            continue
        cand.append(x)
    premium = [x for x in cand if x.get('rarity') in ('SSR', 'SR')]
    rest = sorted([x for x in cand if x.get('rarity') not in ('SSR', 'SR')], key=lambda x: x['img'])
    need = max(0, CREATION_N - len(premium))
    if need and rest:
        # 等距抽样：图鉴是按编号排的，均匀取能覆盖各个时期，不会全挤在同一个资料片
        step = max(1, len(rest) / float(need))
        rest = [rest[min(len(rest) - 1, int(i * step))] for i in range(need)]
    seen = set()
    out = []
    for x in premium + rest:
        name = clean_name(x['zh'])
        if name in seen:
            continue
        seen.add(name)
        out.append(x)
    return out


def pick_awakener(d):
    out, seen = [], set()
    for x in d['awakener']:
        img = x.get('img') or ''
        if not img or not os.path.exists(os.path.join(ROOT, img)):
            continue
        name = clean_name(x['zh'])
        if name in seen:
            continue
        seen.add(name)
        out.append(x)
    return out


def build(pick, d):
    pool = []
    for x in pick:
        src = os.path.join(ROOT, x['img'])
        sl = slug(x['img'])
        dst = os.path.join(OUT_DIR, sl + '.webp')
        shrink(src, dst)
        pool.append({'n': clean_name(x['zh']), 'img': 'assets/ui/g2048-skins/' + sl + '.webp'})
    return pool


def main():
    d = json.load(open(os.path.join(ROOT, 'data/dictionary.json'), encoding='utf-8'))
    os.makedirs(OUT_DIR, exist_ok=True)

    creation = build(pick_creation(d), d)
    awakener = build(pick_awakener(d), d)

    total = sum(os.path.getsize(os.path.join(ROOT, p['img'])) for p in creation + awakener)
    doc = {
        'note': '「忘却 2048」的换皮池。每级从池里抽一个不重复的（见 js/g2048.js 的 rollSkin）。'
                '图是 96×96、q80 重压过的，方块最大显示 110px，够用。'
                '这份由 scripts/build_g2048_skins.py 生成，手改会被下次重跑覆盖。',
        'size': SIZE,
        'kinds': {
            'creation': {'n': '随机造物', 'pool': creation},
            'awakener': {'n': '唤醒体', 'pool': awakener},
        },
    }
    out = os.path.join(ROOT, 'data/g2048-skins.json')
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('造物池 %d 件 · 唤醒体池 %d 位 · 图共 %dKB → data/g2048-skins.json'
          % (len(creation), len(awakener), round(total / 1024)))
    print('造物池：' + '、'.join(p['n'] for p in creation))


if __name__ == '__main__':
    main()
