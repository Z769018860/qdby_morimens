#!/usr/bin/env python3
"""Build data/*.json and assets/ for 战报侦探 from a qdby_chinese checkout.

usage: python3 scripts/build_data.py /path/to/qdby_chinese [--seasons 71 72]

Outputs
  data/dictionary.json  every awakener / wheel / covenant / key / creation / monster (codex + puzzle pickers)
  data/puzzles.json     battle-report puzzles (answers included; this is a casual prototype, not tamper proof)
  assets/...            only the images that are referenced, downsized to webp
"""
import argparse, gzip, json, random, re, sys
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('--seasons', nargs='*', type=int, default=[71, 72])
ap.add_argument('--per-season', type=int, default=500)
args = ap.parse_args()
SRC = Path(args.src)
M = SRC / 'data/morimens'
A = SRC / 'assets/morimens'
OUT_DATA = ROOT / 'data'
OUT_ASSET = ROOT / 'assets'
OUT_DATA.mkdir(exist_ok=True)

jl = lambda p: json.load(open(p, encoding='utf-8'))
pool = jl(M / 'game/tier-pool.json')['kinds']
details = jl(M / 'game/tier-details.json')['items']
gear = jl(M / 'replay-gear.json')
relics_cfg = jl(M / 'replay-relics.json')['relics']
mons = jl(M / 'maps/monsters.json')

used_assets = {}


def asset(rel, sub, size):
    """Resize assets/morimens/<rel> into assets/<sub>/<name>.webp, return web path or None."""
    p = A / rel
    if not p.exists():
        return None
    name = p.stem + '.webp'
    dst = OUT_ASSET / sub / name
    key = str(dst)
    if key not in used_assets:
        dst.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(p).convert('RGBA')
        im.thumbnail(size)
        im.save(dst, 'WEBP', quality=82, method=6)
        used_assets[key] = True
    return f'assets/{sub}/{name}'


def pool_rel(img):
    return img.replace('assets/morimens/', '') if img else None


def meta(kind, pid):
    d = details.get(f'{kind}:{pid}') or {}
    m = d.get('m') or ['', '']
    desc = []
    for x in d.get('x') or []:
        desc.append({'h': x['h'][0], 't': x['t'][0]})
    parts = [s.strip() for s in m[0].split('·')] if m[0] else []
    return parts, m[0], desc


# ---------------------------------------------------------------- id -> name from each season
season_ids = {}
for s in args.seasons:
    season_ids[s] = jl(M / f'dzone/season{s}/id-names.json')

awk_tid = {}
for ids in season_ids.values():
    for tid, v in ids['awakers'].items():
        awk_tid[v['canonicalName'].strip('"')] = tid
        awk_tid.setdefault(v['name'].strip('"'), tid)
wheel_tid = {v['en']: tid for tid, v in gear['wheels'].items()}
cov_tid = {v['en']: tid for tid, v in gear['covenants'].items()}
tok_tid = {}
cre_tid = {}
for ids in season_ids.values():
    for tid, en in ids['token'].items():
        tok_tid[en] = tid
    for tid, en in ids['creation'].items():
        cre_tid.setdefault(tid, en)
for tid, v in relics_cfg.items():
    cre_tid.setdefault(tid, v['en'])

REALM = {'CARO': '血肉', 'CHAOS': '混沌', 'AEQUOR': '深海', 'ULTRA': '超维', 'FADED_LEGACY': '褪色遗产'}

# ---------------------------------------------------------------- dictionary
D = {'awakener': [], 'wheel': [], 'covenant': [], 'key': [], 'creation': [], 'monster': []}

for it in pool['awakener']:
    parts, mline, desc = meta('awakener', it['id'])
    t = dict(x.split(':') for x in it.get('t', []))
    en = it['en'].strip('"')
    D['awakener'].append({
        'id': awk_tid.get(en), 'en': it['en'], 'zh': it['zh'],
        'realm': parts[0] if parts else '', 'rarity': parts[1] if len(parts) > 1 else '',
        'role': parts[2] if len(parts) > 2 else '', 'realmCode': t.get('realm', ''), 'roleCode': t.get('type', ''),
        'img': asset(pool_rel(it['img']), 'awakener', (120, 120)),
        'card': asset(pool_rel(it['img']).replace('portraits', 'cards'), 'card', (240, 600)),
        'desc': desc,
    })

for it in pool['wheel']:
    parts, mline, desc = meta('wheel', it['id'])
    full = pool_rel(it['img'])
    mini = full.replace('Weapon_Full', 'Weapon_Mini').replace('wheels/', 'wheels/Mini/')
    D['wheel'].append({
        'id': wheel_tid.get(it['en']), 'en': it['en'], 'zh': it['zh'],
        'realm': parts[0] if parts else '', 'rarity': parts[1] if len(parts) > 1 else '',
        'meta': ' · '.join(parts[2:]) if len(parts) > 2 else '',
        'img': asset(mini, 'wheel', (120, 120)) or asset(full, 'wheel', (120, 240)),
        'big': asset(full, 'wheelbig', (200, 400)),
        'desc': desc,
    })

for it in pool['covenant']:
    parts, mline, desc = meta('covenant', it['id'])
    g = next((v for k, v in gear['covenants'].items() if v['en'] == it['en']), None)
    D['covenant'].append({
        'id': cov_tid.get(it['en']), 'en': it['en'], 'zh': it['zh'],
        'img': asset(pool_rel(it['img']), 'covenant', (120, 120)),
        'desc': desc or [{'h': f"{e['pieces']} 件套", 't': e['desc']} for e in (g or {}).get('effects', [])],
    })

for it in pool['posse']:
    parts, mline, desc = meta('posse', it['id'])
    D['key'].append({
        'id': tok_tid.get(it['en']), 'en': it['en'], 'zh': it['zh'], 'realm': parts[0] if parts else '',
        'img': asset(pool_rel(it['img']), 'key', (120, 120)), 'desc': desc,
    })

pool_relic_en = {}
for it in pool['relic']:
    parts, mline, desc = meta('relic', it['id'])
    e = {
        'id': None, 'en': it['en'], 'zh': it['zh'], 'rarity': parts[1] if len(parts) > 1 else '',
        'kind': parts[0] if parts else '', 'owner': parts[2].replace('专属：', '') if len(parts) > 2 else '',
        'img': asset(pool_rel(it['img']), 'creation', (120, 120)), 'desc': desc,
    }
    pool_relic_en.setdefault(it['en'], e)
    D['creation'].append(e)
en_to_cre = {}
for tid, en in cre_tid.items():
    en_to_cre[en] = tid
for e in D['creation']:
    e['id'] = en_to_cre.get(e['en'])
# creations known to the replay config but missing from the pool
known = {e['en'] for e in D['creation']}
for tid, v in relics_cfg.items():
    if v['en'] in known:
        continue
    D['creation'].append({
        'id': tid, 'en': v['en'], 'zh': v.get('zh') or v['en'], 'rarity': '', 'kind': '', 'owner': '',
        'img': (asset(f"relics/{v['icon']}.webp", 'creation', (120, 120)) if v.get('icon') else None),
        'desc': [{'h': '造物特性', 't': v['desc']}] if v.get('desc') else [],
    })

pool_mon = {}
for it in pool['monster']:
    pool_mon[Path(it['img']).stem] = it
CLS = {'Boss': 'Boss', 'Elite': '精英', 'Common': '普通'}
skills = {k: v for k, v in mons['skills']} if isinstance(mons['skills'], list) else mons['skills']
for tid, m in mons['monsters'].items():
    sk = []
    for sid in dict.fromkeys(m.get('sk', [])):
        s = skills.get(str(sid))
        if s:
            sk.append(re.sub(r'\{\d+\}', 'X', s[0]))
    pm = pool_mon.get(m.get('i'), {})
    D['monster'].append({
        'id': tid, 'zh': m['n'], 'en': pm.get('en', ''), 'cls': CLS.get(m.get('c'), m.get('c')), 'desc': m.get('d', ''),
        'traits': [x.split(':')[1] for x in pm.get('t', []) if x.startswith('trait:')],
        'img': asset(f"monster-preview/{m.get('i')}.webp", 'monster', (160, 160)), 'skills': sk,
    })

# lookup tables for puzzles
by_id = {k: {str(e['id']): e for e in v if e.get('id') is not None} for k, v in D.items()}

# ---------------------------------------------------------------- puzzles
STAGE_RE = re.compile(r'Zone (\d): Threat Level (\w+)')
puzzles = []
usage = defaultdict(Counter)  # kind -> id -> teams using it (latest season only)
latest = max(args.seasons)
team_total = Counter()
cand = defaultdict(list)

for s in args.seasons:
    base = M / f'dzone/season{s}'
    ids = season_ids[s]
    bs = {}
    for l in gzip.open(base / 'battle-summary.jsonl.gz', 'rt', encoding='utf-8'):
        r = json.loads(l)
        bs[r['battleUuid']] = r
    zone_boss = {}
    nf = M / f'game/battle-nodes-local-{s}.json'
    if nf.exists():
        for n in jl(nf)['battleNodes']:
            if n['battleType'] == 'Boss' and n['monsters']:
                zone_boss[n['zone']] = n['monsters'][0].get('name') or str(n['monsters'][0].get('id'))
    for rf in sorted((base / 'raw-teams').glob('*.jsonl.gz')):
        for l in gzip.open(rf, 'rt', encoding='utf-8'):
            row = json.loads(l)
            sig = row.get('rankSignature') or {}
            resp = row.get('response') or {}
            tm = resp.get('team') or {}
            b = bs.get(sig.get('battleUuid'))
            if not b or not tm.get('awakers') or not isinstance(tm.get('items'), dict):
                continue
            items = tm['items']
            members = []
            ok = True
            for a in tm['awakers']:
                tid = str(a['tid'])
                if tid not in by_id['awakener']:
                    ok = False
                    break
                ws = a['weaponSlots']
                ws = list(ws.values()) if isinstance(ws, dict) else ws
                wheels = []
                for w in sorted(ws, key=lambda w: w.get('slot', 0)):
                    t = (items.get(str(w['weaponUid'])) or {}).get('tid')
                    if t is not None and str(t) in by_id['wheel']:
                        wheels.append(str(t))
                suits = Counter((items.get(str(x)) or {}).get('suitId') for x in a['trinkets'])
                suit, cnt = suits.most_common(1)[0] if suits else (None, 0)
                cov = str(suit) if suit is not None and str(suit) in by_id['covenant'] and cnt >= 3 else None
                bd = next((x for x in b['awakers'] if str(x['tid']) == tid and not x.get('assist')), None) \
                    or next((x for x in b['awakers'] if str(x['tid']) == tid), None)
                if not bd:
                    ok = False
                    break
                members.append({
                    'tid': tid, 'lv': a.get('level'), 'brk': a.get('breakLevel'), 'pot': a.get('potencyLevel'),
                    'wheels': wheels, 'cov': cov, 'dmg': bd.get('damage') or 0, 'blk': bd.get('block') or 0,
                    'heal': bd.get('heal') or 0,
                })
            if not ok or len(members) != 4:
                continue
            key = str(tm.get('keeperSkill'))
            if key not in by_id['key']:
                continue
            rel = [str(x) for x in b.get('relics', []) if str(x) in by_id['creation']]
            m = Counter()
            if s == latest:
                team_total['n'] += 1
                for x in members:
                    usage['awakener'][x['tid']] += 1
                    for w in set(x['wheels']):
                        usage['wheel'][w] += 1
                    if x['cov']:
                        usage['covenant'][x['cov']] += 1
                usage['key'][key] += 1
                for r_ in set(rel):
                    usage['creation'][r_] += 1
            sm = STAGE_RE.search(ids['stages'].get(str(b['stageTid']), {}).get('name', ''))
            zone = int(sm.group(1)) if sm else (b['stageGroupId'] - 83428)
            members.sort(key=lambda x: (-x['dmg'], -x['blk'], -x['heal']))
            cand[s].append({
                'season': s, 'zone': zone, 'threat': sm.group(2) if sm else '?',
                'madness': ids['stages'].get(str(b['stageTid']), {}).get('madness'),
                'boss': zone_boss.get(zone), 'score': b['score'], 'rank': b['rank'],
                'rounds': b['stageRoundCount'], 'bossRounds': b['bossBattleRoundCount'],
                'cards': b['totalUseCard'], 'energy': b['totalEnergyCost'], 'maxBout': b['maxBoutDamage'],
                'deathResist': b['deathResistCount'], 'hp': b['maxHp'], 'left': b['leftHp'],
                'playerDmg': b.get('playerDamage') or 0, 'key': key, 'relics': rel, 'team': members,
                'uid': row['uid'], 'extra': bool(b.get('extraPass')),
            })

rng = random.Random(72)
for s, lst in cand.items():
    # one battle per player+zone, keep a spread over zones
    seen = set()
    uniq = []
    for p in lst:
        k = (p['uid'], p['zone'])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(p)
    # quality: every member shows some contribution, damage is not all zero
    good = [p for p in uniq if sum(m['dmg'] for m in p['team']) > 0 and all((m['dmg'] + m['blk'] + m['heal']) > 0 for m in p['team'])
            and all(m['wheels'] and m['cov'] for m in p['team'])]
    byzone = defaultdict(list)
    for p in good:
        byzone[p['zone']].append(p)
    per = args.per_season // 5
    for z, ps in byzone.items():
        rng.shuffle(ps)
        puzzles += ps[:per]

# popularity of each awakener (all candidate teams) -> difficulty
pop = Counter()
tot = 0
for p in puzzles:
    for m in p['team']:
        pop[m['tid']] += 1
    tot += 1
for i, p in enumerate(puzzles):
    avg = sum(pop[m['tid']] / tot for m in p['team']) / 4
    p['_pop'] = avg
qs = sorted(p['_pop'] for p in puzzles)
lo, hi = qs[len(qs) // 3], qs[2 * len(qs) // 3]
for i, p in enumerate(puzzles):
    p['diff'] = 3 if p['_pop'] <= lo else (1 if p['_pop'] >= hi else 2)
    del p['_pop']
    p['id'] = f"{p['season']}-{p['zone']}-{p['uid'] % 100000}"
    p['uid'] = None
    del p['uid']
rng.shuffle(puzzles)

# usage rates for codex
n = max(team_total['n'], 1)
for kind, cnt in usage.items():
    for e in D[kind]:
        e['use'] = round(cnt.get(str(e['id']), 0) / n * 100, 1) if e.get('id') is not None else None
D['usageSeason'] = latest
D['usageTeams'] = team_total['n']

json.dump(D, open(OUT_DATA / 'dictionary.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'seasons': args.seasons, 'puzzles': puzzles}, open(OUT_DATA / 'puzzles.json', 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in D.items() if isinstance(v, list)}, 'puzzles', len(puzzles),
      Counter(p['diff'] for p in puzzles), 'assets', len(used_assets))
