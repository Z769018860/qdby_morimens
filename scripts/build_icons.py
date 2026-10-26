#!/usr/bin/env python3
"""把 SKeyDB 的状态/词条图标接进本站。

用法: python3 scripts/build_icons.py /path/to/SKeyDB

读取 SKeyDB 的 overlay 记录（含 iconId）与 src/assets/icons 下的官方图标，
映射到 data/keywords.json 的每个关键词，输出：
  assets/status/<slug>.webp   状态图标
  assets/realm/<slug>.webp    界域图标
  data/status.json            状态词条表（中英名 / 图标 / 英文释义 / 色彩）
并把 keywords.json 里的 i（图标路径）、ic（官方 iconId）补齐。
"""
import json, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/skdb')
OV = SRC / 'src/data/public-v3/records/overlays'
ICONS = SRC / 'src/assets/icons'
OUT = ROOT / 'assets/status'
OUT_REALM = ROOT / 'assets/realm'

# 关键词 slug -> overlay slug 的人工校正（其余按 slug / 英文名 / 别名自动匹配）
MANUAL = {
    'strength': 'str-down',
    'str': 'str',
    'fixed-dmg': None,
    'retain': None,
    'echo': None,
    'sprint': None,
    'discover': None,
    'innate': None,
    'exhaust': None,
    'usable-x-times': None,
    'temporary-enhance': 'enhance',
    'surging-tides': 'undertow',
    'raging-waves': None,
    'perception': 'dreamlure',
    'perception-warp': 'dreamlure',
    'infinite-devour': 'devour',
    'singularity-annihilation': 'singularity-warp',
    'stellar-protection': 'the-stars-are-right',
    'pistoles-de-marie': None,
    'lemurian': None,
    'resonance': None,
    'aftershock': None,
}

def norm(s):
    return (s or '').strip().lower().replace('’', "'")

overlays = {}
for p in sorted(OV.glob('*.json')):
    d = json.loads(p.read_text(encoding='utf-8'))
    overlays[d['route']['slug']] = d

by_name = {}
for slug, d in overlays.items():
    by_name.setdefault(norm(d.get('name')), slug)
    for a in d.get('aliases') or []:
        by_name.setdefault(norm(a), slug)

def icon_file(icon_id):
    if not icon_id:
        return None
    stem = icon_id.replace('IconS_', '')
    for cand in (f'Battle_Card_{stem}.webp', f'{stem}.webp', f'Battle_Card_Buff_{stem.split("_")[-1]}.webp'):
        if (ICONS / cand).exists():
            return cand
    return None

# 一份中文术语兜底（glossary 里 s=game 的才算数，其余不覆盖）
GLOSS = {}
gp = Path('D:/软件所/morimens/qc_sparse/data/morimens/game/glossary.json')
if gp.exists():
    for e in json.loads(gp.read_text(encoding='utf-8'))['entries']:
        if e.get('s') == 'game' and e.get('zh'):
            GLOSS.setdefault(norm(e['en']), e['zh'].split(' / ')[0].strip())

kw = json.loads((ROOT / 'data/keywords.json').read_text(encoding='utf-8'))
OUT.mkdir(parents=True, exist_ok=True)
OUT_REALM.mkdir(parents=True, exist_ok=True)

status = []
used_icons = set()
for k in kw:
    slug = k['s']
    target = MANUAL.get(slug, slug)
    ov = overlays.get(target) if target else None
    if ov is None:
        alt = by_name.get(norm(k.get('e'))) or by_name.get(norm(k.get('n')))
        if alt and overlays[alt].get('iconId'):
            ov = overlays[alt]
    if not ov:
        continue
    f = icon_file(ov.get('iconId'))
    rel = None
    if f:
        dst = OUT / f'{slug}.webp'
        if not dst.exists():
            shutil.copyfile(ICONS / f, dst)
        rel = f'assets/status/{slug}.webp'
        used_icons.add(f)
    zh = k.get('n') or GLOSS.get(norm(ov.get('name')), '')
    status.append({
        'slug': slug,
        'ov': ov['id'],
        'en': k.get('e') or ov.get('name'),
        'zh': zh,
        'icon': rel,
        'iconId': ov.get('iconId'),
        'color': ov.get('textColor'),
        'group': k.get('g'),
        'kind': ov.get('overlayType'),
        'descEn': ov.get('descriptionTemplate'),
        'aliases': (ov.get('aliases') or [])[:4],
    })
    k['i'] = rel
    k['ic'] = ov.get('iconId')

# 没有跟关键词对上、但有官方图标的状态也收进状态表，供典藏/词条检索
have = {s['ov'] for s in status}
for slug, ov in overlays.items():
    if ov['id'] in have or not ov.get('iconId'):
        continue
    f = icon_file(ov['iconId'])
    if not f:
        continue
    dst = OUT / f'x-{slug}.webp'
    if not dst.exists():
        shutil.copyfile(ICONS / f, dst)
    status.append({
        'slug': slug, 'ov': ov['id'], 'en': ov.get('name'),
        'zh': GLOSS.get(norm(ov.get('name')), ''),
        'icon': f'assets/status/x-{slug}.webp', 'iconId': ov.get('iconId'),
        'color': ov.get('textColor'), 'group': None, 'kind': ov.get('overlayType'),
        'descEn': ov.get('descriptionTemplate'), 'aliases': (ov.get('aliases') or [])[:4],
    })

# 界域图标
REALM = {'aequor': 'aequor', 'caro': 'caro', 'chaos': 'chaos', 'ultra': 'ultra'}
for slug in REALM:
    src = SRC / f'src/assets/ui/realm-badge-{slug}.webp'
    if not src.exists():
        src = SRC / f'src/assets/factions/{slug}.webp'
    if src.exists():
        shutil.copyfile(src, OUT_REALM / f'{slug}.webp')

status.sort(key=lambda x: (x['group'] or 'zz', x['zh'] or x['en'] or ''))
(ROOT / 'data/status.json').write_text(json.dumps({
    'source': 'SKeyDB overlay records + Battle_Card icon set (CC BY-NC-SA 4.0; game assets (c) Qookka Games)',
    'count': len(status),
    'items': status,
}, ensure_ascii=False, indent=1), encoding='utf-8')
(ROOT / 'data/keywords.json').write_text(json.dumps(kw, ensure_ascii=False, indent=1), encoding='utf-8')

withicon = sum(1 for k in kw if k.get('i'))
print(f'keywords {len(kw)}, with icon {withicon}, status rows {len(status)}, files {len(used_icons)}')
