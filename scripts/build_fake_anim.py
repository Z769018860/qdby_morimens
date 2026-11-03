#!/usr/bin/env python3
"""《寻找伪人》的动画立绘图集：assets/fake/anim.webp + data/fake-art.json 里的 anim 表。

玩法需要两种画面，用来区分真人和伪人：
  idle  —— 待机动图（wiki 的「角色名-待机.gif」）：真人站在门外 / 坐在家里都是这个；
  skill —— 技能动图（「角色名-技能1.gif」）：伪人露馅时放的是这个（见 engine.js 的 tellsOf）。

和 build_fake_art.py 的静态立绘同一套像素化 + 共用调色板，缩放比例由「待机」决定，
技能动图按同一比例缩（不然技能一出手人就变大 / 变小），所以两套帧的矩形高度不一定相同。
原始 gif 复用 assets/bazaar/_raw（待机）与 assets/protocol/_raw（技能，文件名 <id>-attack.gif）；
缺了先跑 build_bazaar_idle.py / build_protocol_art.py。

用法：python scripts/build_fake_anim.py [--n 5] [--q 50] [--aq 40]
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageSequence

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_fake_art import pixelize, to_palette, IDLE_H  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW_IDLE = ROOT / 'assets/bazaar/_raw'
RAW_SKILL = ROOT / 'assets/protocol/_raw'
OUT = ROOT / 'assets/fake/anim.webp'
N, Q, AQ = 5, 50, 40
ALIAS = {'24': 'mason', 'hameln': 'hamelin'}


def frames_of(path):
    im = Image.open(path)
    return [f.convert('RGBA') for f in ImageSequence.Iterator(im)], im


def bbox_union(frames):
    box = None
    for f in frames:
        b = f.getchannel('A').point(lambda v: 255 if v >= 40 else 0).getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    return box


def pick(frames, n):
    m = len(frames)
    if m <= n:
        return frames
    return [frames[round(i * (m - 1) / (n - 1))] for i in range(n)]


def dur_of(im, total, n):
    d = im.info.get('duration') or 70
    return int(round(d * total / max(1, n)))


def make(frames, im, box, k, n):
    sel = pick(frames, n)
    total = len(frames)
    out = []
    for f in sel:
        c = f.crop(box)
        w = max(1, round(c.width * k))
        h = max(1, round(c.height * k))
        out.append(to_palette(pixelize(c.resize((w, h), Image.LANCZOS), 2)))
    return out, dur_of(im, total, len(sel))


def pack(items, maxw=2048):
    rows, cur, cw = [], [], 0
    for key, frames in items:
        for f in frames:
            if cur and cw + f.width > maxw:
                rows.append(cur); cur, cw = [], 0
            cur.append((key, f)); cw += f.width
    if cur:
        rows.append(cur)
    W = max(sum(f.width for _, f in r) for r in rows)
    Hh = sum(max(f.height for _, f in r) for r in rows)
    sheet = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    rects, y = {}, 0
    for r in rows:
        rh = max(f.height for _, f in r)
        x = 0
        for key, f in r:
            sheet.paste(f, (x, y + rh - f.height))
            rects.setdefault(key, []).append([x, y + rh - f.height, f.width, f.height])
            x += f.width
        y += rh
    return sheet, rects


def main():
    global N, Q, AQ
    a = sys.argv[1:]
    for i, x in enumerate(a):
        if x == '--n':
            N = int(a[i + 1])
        if x == '--q':
            Q = int(a[i + 1])
        if x == '--aq':
            AQ = int(a[i + 1])
    meta = json.loads((ROOT / 'data/fake-art.json').read_text(encoding='utf-8'))
    units = {u['id'] for u in json.loads((ROOT / 'data/protocol-units.json').read_text(encoding='utf-8'))['units']}
    items, anim = [], {}
    for c in meta['chars']:
        slug = c['slug']
        pid = ALIAS.get(slug) or (slug if slug in units else slug.replace('-', ''))
        pi, ps = RAW_IDLE / ('%s.gif' % slug), RAW_SKILL / ('%s-attack.gif' % pid)
        if not (pi.exists() and ps.exists()):
            print('  ! %-16s 缺原始动图（idle=%s skill=%s），退回静态立绘' % (slug, pi.exists(), ps.exists()))
            continue
        fi, imi = frames_of(pi)
        fs, ims = frames_of(ps)
        bi, bs = bbox_union(fi), bbox_union(fs)
        if not bi or not bs:
            continue
        w, h = bi[2] - bi[0], bi[3] - bi[1]
        k = min(IDLE_H * 0.95 / w, IDLE_H / h)           # 与静态立绘同一套缩放（见 build_fake_art.fit）
        idle, di = make(fi, imi, bi, k, N)
        skill, ds = make(fs, ims, bs, k, N)
        items.append((slug + ':i', idle))
        items.append((slug + ':s', skill))
        anim[slug] = {'di': di, 'ds': ds}
    sheet, rects = pack(items)
    sheet.save(OUT, 'WEBP', quality=Q, alpha_quality=AQ, method=6)
    for slug, m in anim.items():
        m['i'] = rects[slug + ':i']
        m['s'] = rects[slug + ':s']
    meta['anim'] = anim
    (ROOT / 'data/fake-art.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding='utf-8')
    print('  anim  %d 名  %dx%d  %.1fKB' % (len(anim), sheet.width, sheet.height, os.path.getsize(OUT) / 1024))


if __name__ == '__main__':
    main()
