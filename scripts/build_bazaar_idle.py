#!/usr/bin/env python3
"""切 awakening 待机立绘，给「大巴扎：银钥」的界面用。

素材还是灰机 wiki 那套「角色名-待机.gif」（1~9MB、30~50 帧、1032×1257）。
界面里只在两处露面：选人时的立绘预览、开打时左边站着的那个人 —— 同一时刻
只需要**一个**角色的图，所以不做大图集，直接每个角色一个动图文件
（约 15KB），用到哪个才下哪个。

  1. 抽 8 帧（在整段里均匀取样，够看出呼吸感）；
  2. 按非透明区域并集裁剪，等比缩到 H；
  3. 存成 assets/bazaar/idle/<slug>.gif（GIF 动图，循环播放）。

原始 gif 复用 assets/protocol/_raw 里已经下好的；缺的按中文名现下，
下不到就退回 assets/card 的官方全身立绘（静态一帧）。

用法：python scripts/build_bazaar_idle.py [--h 320] [--q 56] [--frames 8] [--only 24,agrippa]
"""
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
RAW_P = ROOT / 'assets/protocol/_raw'
RAW_B = ROOT / 'assets/bazaar/_raw'
OUT = ROOT / 'assets/bazaar/idle'

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) qdby-morimens/bazaar'}
WIKI = 'https://huiji-public.huijistatic.com/morimens/uploads'

H, Q, FRAMES = 240, 56, 10

# 站内 slug → 灰机词条名 / 已缓存的原始 gif 名
ALIAS = {
    '24': ('「24」', 'mason'),
    'hameln': ('哈姆林', 'hamelin'),
}


def wiki_url(name):
    import hashlib
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    return '%s/%s/%s/%s' % (WIKI, h[0], h[:2], urllib.parse.quote(name))


def fetch(name, local):
    if local.exists() and local.stat().st_size > 1024:
        return True
    RAW_B.mkdir(parents=True, exist_ok=True)
    url = wiki_url(name)
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) < 1024:
                raise IOError('内容太小')
            local.write_bytes(data)
            print('    · 现下 %s  %.1fMB' % (name, len(data) / 1048576))
            return True
        except Exception as e:
            err = e
            time.sleep(1.2 + attempt * 1.8)
    print('    · %s 下不到（%s）' % (name, err))
    return False


def union_bbox(frames):
    box = None
    for fr in frames:
        b = fr.convert('RGBA').getchannel('A').getbbox()
        if not b:
            continue
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]),
                                     max(box[2], b[2]), max(box[3], b[3]))
    return box


def anim_from_gif(path):
    im = Image.open(path)
    allf = [f.convert('RGBA') for f in ImageSequence.Iterator(im)]   # 必须逐帧拷贝：迭代器每次返回同一个对象，不拷贝的话 N 帧全是最后一帧（旧版的「动图」其实是静止的）
    n = len(allf)
    if n < 2:
        raise IOError('不是动图')
    dur = sum((f.info.get('duration') or im.info.get('duration') or 110) for f in allf) / n
    box = union_bbox(allf)
    if not box:
        raise IOError('全透明')
    want = min(FRAMES, n)
    idx = [round(i * (n - 1) / (want - 1)) for i in range(want)]
    out = []
    for i in idx:
        f = allf[i].crop(box)
        w = max(1, round(f.width * H / f.height))
        out.append(f.resize((w, H), Image.LANCZOS))
    return out, int(round(dur * n / want))


def still_from_card(path):
    im = Image.open(path).convert('RGBA')
    b = im.getchannel('A').getbbox()
    if b:
        im = im.crop(b)
    w = max(1, round(im.width * H / im.height))
    im = im.resize((w, H), Image.LANCZOS)
    return [im, im], 3000


def main():
    global H, Q, FRAMES
    argv = sys.argv[1:]
    for i, a in enumerate(argv):
        if a == '--h':
            H = int(argv[i + 1])
        if a == '--q':
            Q = int(argv[i + 1])
        if a == '--frames':
            FRAMES = int(argv[i + 1])
    only = set(argv[argv.index('--only') + 1].split(',')) if '--only' in argv else None

    gd = json.loads((ROOT / 'idle/public/data/game-data.json').read_text(encoding='utf-8'))
    units = {u['id']: u for u in json.loads(
        (ROOT / 'data/protocol-units.json').read_text(encoding='utf-8'))['units']}

    OUT.mkdir(parents=True, exist_ok=True)
    ok = miss = 0
    total = 0
    report = []
    for a in gd['awakeners']:
        slug = a['slug']
        if only and slug not in only:
            continue
        wiki_name, cached = ALIAS.get(slug, (None, None))
        if not wiki_name:
            pid = slug if slug in units else slug.replace('-', '')
            if pid in units:
                wiki_name, cached = units[pid]['src'], pid
            else:
                wiki_name, cached = a['zh'], None

        src = None
        for cand in [x for x in (cached, slug.replace('-', ''), slug) if x]:
            p = RAW_P / ('%s-idle.gif' % cand)
            if p.exists() and p.stat().st_size > 1024:
                src = p
                break
        if src is None:
            p = RAW_B / ('%s.gif' % slug)
            if fetch(wiki_name if wiki_name.endswith('.gif') else '%s-待机.gif' % wiki_name, p):
                src = p

        try:
            if src is None:
                raise IOError('没有动图')
            frames, dur = anim_from_gif(src)
            how = 'gif'
        except Exception as e:
            card = ROOT / ('assets/card/%s.webp' % slug)
            if not card.exists():
                print('  ! %-16s %s，且没有全身立绘' % (slug, e))
                miss += 1
                continue
            frames, dur = still_from_card(card)
            how = 'card'

        # 存成真正的 GIF 动图：本机 Pillow 不带动图 WebP 编码，存出来只有一帧；GIF 到处都能播
        buf = io.BytesIO()
        q = [f.quantize(colors=48, method=Image.FASTOCTREE, dither=Image.NONE) for f in frames]
        q[0].save(buf, 'GIF', save_all=True, append_images=q[1:], duration=dur, loop=0, disposal=2, optimize=True, transparency=0)
        data = buf.getvalue()
        (OUT / ('%s.gif' % slug)).write_bytes(data)
        old = OUT / ('%s.webp' % slug)
        if old.exists():
            old.unlink()
        total += len(data)
        ok += 1
        report.append((slug, how, len(frames), frames[0].width, frames[0].height, len(data) / 1024))

    print('\n%-18s %-5s %3s %-9s %7s' % ('角色', '来源', '帧', '尺寸', '体积'))
    for r in report:
        print('%-18s %-5s %3d %4dx%-4d %6.1fKB' % (r[0], r[1], r[2], r[3], r[4], r[5]))
    print('\n共 %d 个立绘（%d 个缺）合计 %.2fMB，平均 %.1fKB'
          % (ok, miss, total / 1048576, total / 1024 / max(1, ok)))


if __name__ == '__main__':
    main()
