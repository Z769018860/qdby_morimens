#!/usr/bin/env python3
"""把灰机 wiki 上波吕克斯的战斗/行动动图压成一张雪碧图 + 帧表。

为什么要压：原始 gif 一共 38MB（单个待机 5.9MB），而且站点的每个请求都要
1~2 秒。游戏里 9 个 gif 各自请求一次是不可接受的，所以这里做两件事：

  1. 抽帧 + 缩放到游戏里真正会显示的高度（约 220px），webp 有损压缩；
  2. 全部帧流式拼进**一张** webp，帧矩形写进 data/bird-art.json，
     构建脚本再把这张图内联成 data URI，页面就只剩一个脚本请求。

原始 gif 下载到 assets/pollux-bird/_raw/（不进 git），删了可以重跑本脚本。

用法：python scripts/build_bird_art.py [--h 220] [--q 48]
"""
import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets/pollux-bird/_raw'
OUT_IMG = ROOT / 'assets/pollux-bird/bird-sheet.webp'
OUT_JSON = ROOT / 'data/bird-art.json'

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) qdby-morimens/bird-art'
BASE = 'https://huiji-public.huijistatic.com/morimens/uploads'

# 只取游戏里真的会用到的动作。special1 / hurt 没进游戏（体积换不来体验），
# 需要时在这里加一行就行。
SRC = {
    'idle':   ('d/d5/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E5%BE%85%E6%9C%BA.gif', 2),
    'attack': ('b/b6/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E6%89%93%E5%87%BB.gif', 2),
    'skill1': ('e/e6/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E6%8A%80%E8%83%BD1.gif', 2),
    'skill2': ('3/3b/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E6%8A%80%E8%83%BD2.gif', 2),
    'defend': ('e/e1/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E9%98%B2%E5%BE%A1.gif', 2),
    'burst':  ('b/b0/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E7%8B%82%E6%B0%94%E7%88%86%E5%8F%91.gif', 4),
    'awaken': ('2/2f/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF-%E8%A7%89%E9%86%92.gif', 2),
    'head':   ('b/bf/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF%E5%A4%B4%E5%83%8F.png', 0),
    'chibi1': ('8/81/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF%E5%89%A7%E6%83%85%E7%AB%8B%E7%BB%98%E5%B0%8F%E4%BA%BA1.png', 0),
    'chibi2': ('e/e7/%E6%B3%A2%E5%90%95%E5%85%8B%E6%96%AF%E5%89%A7%E6%83%85%E7%AB%8B%E7%BB%98%E5%B0%8F%E4%BA%BA2.png', 0),
}

# 剧情小人是一根"纸偶棒"插着的人形，游戏里当角色跑动，木棍必须裁掉。
# 木棍很细（底部行非透明像素跨度 < 160px），从下往上找到第一行明显变宽的地方就是脚底。
def trim_puppet_stick(im):
    a = im.split()[3]
    w, h = im.size
    px = a.load()
    top = None
    step = 4
    for y in range(h - 1, int(h * 0.55), -step):
        lo, hi = w, -1
        for x in range(0, w, 3):
            if px[x, y] > 24:
                if x < lo:
                    lo = x
                if x > hi:
                    hi = x
        if hi - lo > 110:
            top = y
            break
    if top is None:
        return im
    return im.crop((0, 0, w, min(h, top + 2)))


def fetch(name, rel, step, h):
    RAW.mkdir(parents=True, exist_ok=True)
    ext = '.gif' if rel.endswith('.gif') else '.png'
    local = RAW / (name + ext)
    if not local.exists():
        req = urllib.request.Request(BASE + '/' + rel, headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=120) as r:
            local.write_bytes(r.read())
        print(f'  下载 {name} {local.stat().st_size / 1024:.0f}KB')
    im = Image.open(local)

    if step == 0:                       # 静态图
        im = im.convert('RGBA')
        if name.startswith('chibi'):
            im = trim_puppet_stick(im)
            hh = 240
        else:
            hh = 120
        ww = round(im.width * hh / im.height)
        return [(im.resize((ww, hh), Image.LANCZOS))], 1000

    frames, durs = [], []
    for i, fr in enumerate(ImageSequence.Iterator(im)):
        durs.append(fr.info.get('duration') or im.info.get('duration') or 60)
        if i % step:
            continue
        f = fr.convert('RGBA')
        ww = round(f.width * h / f.height)
        frames.append(f.resize((ww, h), Image.LANCZOS))
    d = sum(durs) / max(1, len(durs)) * step
    return frames, int(d)


def pack(items, maxw=2048):
    """流式网格：每行高 = 该行首帧高，宽度到 maxw 换行。"""
    rows, cur, cw = [], [], 0
    for key, frames in items:
        for f in frames:
            if cur and cw + f.width > maxw:
                rows.append(cur)
                cur, cw = [], 0
            cur.append((key, f))
            cw += f.width
    if cur:
        rows.append(cur)

    W = max(sum(f.width for _, f in row) for row in rows)
    H = sum(max(f.height for _, f in row) for row in rows)
    sheet = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    rects = {}
    y = 0
    for row in rows:
        rh = max(f.height for _, f in row)
        x = 0
        for key, f in row:
            sheet.paste(f, (x, y + rh - f.height))   # 底对齐，脚在同一水平线
            rects.setdefault(key, []).append([x, y + rh - f.height, f.width, f.height])
            x += f.width
        y += rh
    return sheet, rects


def main():
    h, q = 220, 48
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == '--h':
            h = int(argv[i + 1])
        if a == '--q':
            q = int(argv[i + 1])

    items, meta = [], {}
    print('准备素材…')
    for name, (rel, step) in SRC.items():
        frames, dur = fetch(name, rel, step, h)
        items.append((name, frames))
        meta[name] = {'dur': dur, 'n': len(frames)}
        print(f'  {name:8s} {len(frames):3d} 帧  {frames[0].width}x{frames[0].height}  {dur}ms/帧')

    sheet, rects = pack(items)
    buf = io.BytesIO()
    sheet.save(buf, 'WEBP', quality=q, method=6)
    data = buf.getvalue()
    OUT_IMG.write_bytes(data)

    anims = {}
    for name, m in meta.items():
        anims[name] = {'f': rects[name], 'd': m['dur'], 'loop': name in ('idle',)}
    OUT_JSON.write_text(json.dumps({
        'sheet': sheet.width, 'h': sheet.height,
        'anims': anims,
    }, ensure_ascii=False), encoding='utf-8')

    total = sum(m['n'] for m in meta.values())
    print(f'\n雪碧图 {sheet.width}x{sheet.height}  {len(data) / 1024:.0f}KB  '
          f'{total} 帧  → {OUT_IMG.relative_to(ROOT)}')
    print(f'帧表 → {OUT_JSON.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
