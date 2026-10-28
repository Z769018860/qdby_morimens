#!/usr/bin/env python3
"""Build the game data pack + web-sized images from the qdby_chinese repository.

usage: python3 tools/build_data.py --src ../qdby_chinese
Outputs: public/data/game-data.json and public/img/**.webp
"""
import argparse, json, re, shutil
from pathlib import Path
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('--src', default='../qdby_chinese')
args = ap.parse_args()
SRC = Path(args.src).resolve()
OUT = Path(__file__).resolve().parent.parent / 'public'
DB = SRC / 'data/morimens/skeydb/public-v3'

def load(p): return json.loads(Path(p).read_text(encoding='utf-8'))
pool = load(SRC / 'data/morimens/game/tier-pool.json')['kinds']
zh = {k: {x['id']: x for x in v} for k, v in pool.items() if k in ('awakener', 'wheel', 'relic', 'covenant', 'monster')}

def img(rel, dest, width=None, size=None, q=78):
    src = SRC / rel
    if not src.exists():
        return None
    d = OUT / dest
    d.parent.mkdir(parents=True, exist_ok=True)
    im = Image.open(src).convert('RGBA')
    if size: im.thumbnail(size, Image.LANCZOS)
    elif width and im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(d, 'WEBP', quality=q, method=6)
    return dest

def clean(n): return re.sub(r'@\d', '', n or '').strip()

awk = []
for r in load(DB / 'catalogs/awakeners.json')['records']:
    rec = load(DB / f"records/awakeners/{r['id']}.json")
    z = zh['awakener'].get(r['id'], {})
    slug = r['route']['slug']
    awk.append({
        'id': r['id'], 'slug': slug, 'zh': z.get('zh') or r['name'], 'en': r['name'].strip('"'),
        'realm': r['realm'], 'type': r['type'], 'rarity': r['rarity'], 'avail': r.get('availabilityType', ''),
        'base': rec['baseStatsLv1'], 'scale': rec['statScaling'],
        'sub': rec['substatsLv1'], 'subScale': rec['substatScaling'],
        'portrait': img(z['img'], f'img/awk/{slug}.webp') if z.get('img') else None,
        'card': img(z['img'].replace('portraits', 'cards'), f'img/card/{slug}.webp', width=170) if z.get('img') else None,
    })

wheels = []
for r in load(DB / 'catalogs/wheels.json')['records']:
    z = zh['wheel'].get(r['id'], {})
    n = z['img'].split('/')[-1] if z.get('img') else None
    wheels.append({'id': r['id'], 'zh': z.get('zh') or r['name'], 'rarity': r['rarity'], 'realm': r.get('realm'),
                   'main': r['mainstatKey'], 'owner': r.get('ownerAwakenerId'),
                   'img': img(z['img'], f'img/wheel/{n}', width=92) if n else None})

covs = []
for r in load(DB / 'catalogs/covenants.json')['records']:
    z = zh['covenant'].get(r['id'], {})
    n = z['img'].split('/')[-1] if z.get('img') else None
    covs.append({'id': r['id'], 'zh': z.get('zh') or r['name'], 'img': img(z['img'], f'img/cov/{n}', width=96) if n else None})

rels = []
for r in load(DB / 'catalogs/relics.json')['records']:
    z = zh['relic'].get(r['id'], {})
    n = z['img'].split('/')[-1] if z.get('img') else None
    rels.append({'id': r['id'], 'zh': z.get('zh') or r['name'], 'rarity': r.get('rarity') or 'SR',
                 'img': img(z['img'], f'img/relic/{n}', width=96) if n else None})

mons = []
for z in pool['monster']:
    rank = next((t.split(':')[1] for t in z.get('t', []) if t.startswith('rank:')), 'Normal')
    n = z['img'].split('/')[-1]
    im = img(z['img'], f'img/mon/{n}', width=128)
    if im:
        mons.append({'id': z['id'], 'zh': clean(z['zh'] or z['en']), 'rank': rank, 'img': im})

pack = {'version': 1, 'awakeners': awk, 'wheels': wheels, 'covenants': covs, 'relics': rels, 'monsters': mons}
(OUT / 'data').mkdir(parents=True, exist_ok=True)
(OUT / 'data/game-data.json').write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print({k: len(v) for k, v in pack.items() if isinstance(v, list)})
