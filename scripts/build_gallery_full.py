#!/usr/bin/env python3
"""给典藏馆补「原图」：网格里仍用 900 宽的缩略图，大图视图与背景主题改用 1920 宽的大图。

build_gallery.py 把原图缩到 900×415 存 webp，铺成全屏背景当然糊。
这里按 data/gallery.json 里的原始文件名（`n`，如 CG_SD_S_WB2_2.png）重新从灰机 wiki
取原图（2340×1080 左右），缩到 --width 宽后存 assets/gallery-full/<id>.webp，
并把 `big` / `bw` / `bh` 写回 gallery.json。

用法:
    python3 scripts/build_gallery_full.py            # 缺什么补什么
    python3 scripts/build_gallery_full.py --force    # 全部重下
"""
import argparse, hashlib, json, os, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'gallery-full'
DATA = ROOT / 'data' / 'gallery.json'
CACHE = ROOT / '.gallery-full.json'
CDN = 'https://huiji-public.huijistatic.com/morimens/uploads'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'

ap = argparse.ArgumentParser()
ap.add_argument('--width', type=int, default=1920)
ap.add_argument('--quality', type=int, default=84)
ap.add_argument('--jobs', type=int, default=6)
ap.add_argument('--force', action='store_true')
args = ap.parse_args()


def url_of(name):
    h = hashlib.md5(name.encode()).hexdigest()
    return f'{CDN}/{h[0]}/{h[:2]}/{name}'


def one(it):
    cid = it['id']
    dst = OUT / f'{cid}.webp'
    if dst.exists() and dst.stat().st_size > 2048 and not args.force:
        # 已有大图：沿用 gallery.json 里记的原图尺寸，别被缩过的 webp 覆盖
        meta = {'big': f'assets/gallery-full/{cid}.webp', 'bw': it.get('bw'), 'bh': it.get('bh')}
        if not meta['bw']:
            with Image.open(dst) as im:
                meta['bw'], meta['bh'] = im.size
        return cid, meta, 'cached'
    fd, tmp = tempfile.mkstemp(suffix='.img')
    os.close(fd)
    try:
        r = subprocess.run(
            ['curl', '-sS', '--max-time', '120', '-A', UA,
             '-H', 'Referer: https://morimens.huijiwiki.com/', '-o', tmp, url_of(it['n'])],
            capture_output=True)
        if r.returncode != 0 or os.path.getsize(tmp) < 1024:
            return cid, None, 'fetch-fail'
        with Image.open(tmp) as im:
            im = im.convert('RGB')
            ow, oh = im.size
            if ow > args.width:
                nh = round(oh * args.width / ow)
                im = im.resize((args.width, nh), Image.LANCZOS)
            im.save(dst, 'WEBP', quality=args.quality, method=6)
        return cid, {'big': f'assets/gallery-full/{cid}.webp', 'bw': ow, 'bh': oh}, 'ok'
    except Exception as e:  # noqa: BLE001
        return cid, None, f'err {type(e).__name__}'
    finally:
        os.path.exists(tmp) and os.unlink(tmp)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    doc = json.loads(DATA.read_text(encoding='utf-8'))
    items = doc['items']
    done, fail = {}, []
    with ThreadPoolExecutor(max_workers=args.jobs) as ex:
        for i, (cid, meta, st) in enumerate(ex.map(one, items), 1):
            if meta:
                done[cid] = meta
            else:
                fail.append(cid)
            if i % 40 == 0 or i == len(items):
                print(f'  {i}/{len(items)}  失败 {len(fail)}', flush=True)
                CACHE.write_text(json.dumps(done, ensure_ascii=False), encoding='utf-8')

    for it in items:
        m = done.get(it['id'])
        if m:
            it.update(m)
        else:
            it.pop('big', None)
    DATA.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    size = sum(f.stat().st_size for f in OUT.glob('*.webp'))
    print(f'完成 {len(done)}/{len(items)} 张，assets/gallery-full 共 {size / 1048576:.1f} MB')
    if fail:
        print('失败：', ', '.join(fail[:20]), '…' if len(fail) > 20 else '')


if __name__ == '__main__':
    main()
