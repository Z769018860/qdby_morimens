#!/usr/bin/env python3
"""把《忘却协议》要用的战斗动态立绘压成一张图集。

素材来源：灰机 wiki 的「战斗立绘动作动图」（角色名-待机.gif / 角色名-打击.gif），
和站内已有的头像、怪物战斗立绘。原始动图单张 1~9MB、47~50 帧、1032×1257，
直接上站是不可能的——所以这里做三件事：

  1. 抽帧：待机取 6 帧、打击取 6 帧（够看出动作，体积可控；62 名唤醒体时
     再多一倍帧数图集就 4MB 了，手机上解码也吃力）；
  2. 裁剪：把所有帧的非透明区域取并集再裁掉四周空白，等比缩到统一高度；
  3. 拼图：全部帧流式拼进**一张** webp，帧矩形写进 data/protocol-art.json。

构建脚本再把这张图内联成 data URI，页面就只剩一个脚本请求。

原始 gif 落在 assets/protocol/_raw/（不进 git），删了重跑本脚本会自己下回来。

用法：python scripts/build_protocol_art.py [--h 110] [--q 52] [--idle 6] [--atk 6] [--only agrippa,mason]
"""
import hashlib
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'assets/protocol/_raw'
OUT_IMG = ROOT / 'assets/protocol/proto-sheet.webp'
OUT_JSON = ROOT / 'data/protocol-art.json'

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) qdby-morimens/forget-protocol'}
BASE = 'https://huiji-public.huijistatic.com/morimens/uploads'

IDLE_N, ATK_N = 6, 6           # 每个动作取几帧
H, Q = 110, 52                 # 立绘高度 / webp 质量
MOB_H = 118

# 波次里出场的怪物（id 取自 data/dictionary.json 的 monster）
MOBS = ['13950', '13970', '13962', '13965', '13969', '13974',
        '13954', '13955', '13960', '13963', '13967',
        '13956', '13958', '13961', '13964']


def wiki_url(name):
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    return '%s/%s/%s/%s' % (BASE, h[0], h[:2], urllib.parse.quote(name))


def fetch(name, local):
    if local.exists() and local.stat().st_size > 1024:
        return
    RAW.mkdir(parents=True, exist_ok=True)
    url = wiki_url(name)
    last = None
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=300) as r:
                data = r.read()
            if len(data) < 1024:
                raise IOError('内容太小，可能不是图片')
            local.write_bytes(data)
            print('  下载 %-14s %6.1fMB' % (name, len(data) / 1048576))
            return
        except Exception as e:          # 这台机器的 TLS 走长连接偶尔会 UNEXPECTED_EOF，重试即可
            last = e
            time.sleep(1.5 + attempt * 2)
    raise RuntimeError('下载失败 %s：%s' % (url, last))


def union_bbox(frames_im):
    """所有帧非透明区域的并集 —— 裁剪用，保证动作不被切掉。"""
    box = None
    for fr in frames_im:
        f = fr.convert('RGBA')
        b = f.getchannel('A').getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                     max(box[2], b[2]), max(box[3], b[3]))
    return box


def load_anim(path, want):
    """取 want 帧（在整段里均匀取样），按并集裁剪后缩到统一高度。"""
    im = Image.open(path)
    all_frames = list(ImageSequence.Iterator(im))
    n = len(all_frames)
    dur = sum((f.info.get('duration') or im.info.get('duration') or 70) for f in all_frames) / max(1, n)
    box = union_bbox(all_frames)
    if not box:
        raise SystemExit('%s 没有非透明像素' % path.name)
    idx = [round(i * (n - 1) / max(1, want - 1)) for i in range(want)] if n > want else list(range(n))
    out = []
    for i in idx:
        f = all_frames[i].convert('RGBA').crop(box)
        w = max(1, round(f.width * H / f.height))
        out.append(f.resize((w, H), Image.LANCZOS))
    # 每帧播放时长 = 原始帧间隔 × 采样步长
    step = n / max(1, len(out))
    return out, int(round(dur * step))


def pack(items, maxw=2048):
    """流式网格：每行高 = 该行首帧高，宽度到 maxw 换行；底对齐（脚踩同一水平线）。"""
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
    Hh = sum(max(f.height for _, f in row) for row in rows)
    sheet = Image.new('RGBA', (W, Hh), (0, 0, 0, 0))
    rects = {}
    y = 0
    for row in rows:
        rh = max(f.height for _, f in row)
        x = 0
        for key, f in row:
            sheet.paste(f, (x, y + rh - f.height))
            rects.setdefault(key, []).append([x, y + rh - f.height, f.width, f.height])
            x += f.width
        y += rh
    return sheet, rects, (W, Hh)


def main():
    global H, Q, IDLE_N, ATK_N
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == '--h':
            H = int(argv[i + 1])
        if a == '--q':
            Q = int(argv[i + 1])
        if a == '--idle':
            IDLE_N = int(argv[i + 1])
        if a == '--atk':
            ATK_N = int(argv[i + 1])
    only = None
    for i, a in enumerate(argv):
        if a == '--only':
            only = set(argv[i + 1].split(','))

    cfg = json.loads((ROOT / 'data/protocol-units.json').read_text(encoding='utf-8'))
    units = [u for u in cfg['units'] if not only or u['id'] in only]

    items, meta = [], {}
    print('准备立绘…')
    for u in units:
        anims = {}
        try:
            pair = []
            for key, suffix, want in (('idle', '-待机.gif', IDLE_N), ('attack', '-打击.gif', ATK_N)):
                local = RAW / ('%s-%s.gif' % (u['id'], key))
                fetch(u['src'] + suffix, local)
                pair.append((key, load_anim(local, want)))
        except RuntimeError as e:
            # 新角色（例如薇薇安）wiki 上还没有战斗动图：退回官方全身立绘当静态帧，
            # 至少棋盘上站着的是本人，不会空一格。
            card = ROOT / ('assets/card/%s.webp' % u['id'])
            if not card.exists():
                raise SystemExit('%s\n  而且没有兜底立绘 %s' % (e, card.relative_to(ROOT)))
            im = Image.open(card).convert('RGBA')
            box = im.getchannel('A').getbbox()
            if box:
                im = im.crop(box)
            w = max(1, round(im.width * H / im.height))
            im = im.resize((w, H), Image.LANCZOS)
            pair = [('idle', ([im], 400)), ('attack', ([im], 400))]
            print('  %-10s 无动图，用全身立绘代替（%dx%d）' % (u['id'], im.width, im.height))
        for key, (frames, dur) in pair:
            items.append((u['id'] + ':' + key, frames))
            anims[key] = {'d': dur}
            print('  %-10s %-6s %2d 帧 %dx%d %dms/帧'
                  % (u['id'], key, len(frames), frames[0].width, frames[0].height, dur))
        meta[u['id']] = anims

    # 头像：直接进同一张图，商店卡片用 background-position 切
    heads = []
    for u in units:
        p = ROOT / u['avatar']
        if not p.exists():
            raise SystemExit('缺头像：' + u['avatar'])
        im = Image.open(p).convert('RGBA')
        heads.append((u['id'] + ':head', [im]))

    sheet, rects, size = pack(items + heads)

    # 怪物：站内已有的 Small_Monster 战斗立绘，等比放进 MOB_H
    d = json.loads((ROOT / 'data/dictionary.json').read_text(encoding='utf-8'))
    byid = {m['id']: m for m in d['monster']}
    mobs = {}
    mob_imgs = []
    for mid in MOBS:
        m = byid.get(mid)
        if not m:
            print('  ! 字典里没有怪物', mid)
            continue
        p = ROOT / (m.get('img') or '')
        if not m.get('img') or not p.exists():
            print('  ! 缺图', mid, m.get('img'))
            continue
        im = Image.open(p).convert('RGBA')
        b = im.getchannel('A').getbbox()
        if b:
            im = im.crop(b)
        w = max(1, round(im.width * MOB_H / im.height))
        im = im.resize((w, MOB_H), Image.LANCZOS)
        mob_imgs.append((mid + ':mob', [im]))
        mobs[mid] = {'n': m.get('zh') or m.get('en') or mid, 'cls': m.get('cls') or '普通'}

    if mob_imgs:
        sheet2, rects2, size2 = pack(items + heads + mob_imgs)
        sheet, rects, size = sheet2, rects2, size2

    buf = io.BytesIO()
    sheet.save(buf, 'WEBP', quality=Q, method=6)
    data = buf.getvalue()
    OUT_IMG.parent.mkdir(parents=True, exist_ok=True)
    OUT_IMG.write_bytes(data)

    for u in units:
        meta[u['id']]['idle']['f'] = rects[u['id'] + ':idle']
        meta[u['id']]['attack']['f'] = rects[u['id'] + ':attack']
        meta[u['id']]['idle']['loop'] = True
        meta[u['id']]['head'] = rects[u['id'] + ':head'][0]
    for mid, m in mobs.items():
        m['r'] = rects[mid + ':mob'][0]

    OUT_JSON.write_text(json.dumps({
        'w': size[0], 'h': size[1], 'anims': meta, 'mobs': mobs,
    }, ensure_ascii=False), encoding='utf-8')

    print('\n图集 %dx%d  %.0fKB  → %s' % (size[0], size[1], len(data) / 1024, OUT_IMG.relative_to(ROOT)))
    print('帧表 → %s（%d 名唤醒体 / %d 种怪物）'
          % (OUT_JSON.relative_to(ROOT), len(units), len(mobs)))


if __name__ == '__main__':
    main()
