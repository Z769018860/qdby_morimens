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
        'id': awk_tid.get(en), 'pid': it['id'], 'en': it['en'], 'zh': it['zh'],
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
        'id': wheel_tid.get(it['en']), 'pid': it['id'], 'en': it['en'], 'zh': it['zh'],
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
        'id': cov_tid.get(it['en']), 'pid': it['id'], 'en': it['en'], 'zh': it['zh'],
        'img': asset(pool_rel(it['img']), 'covenant', (120, 120)),
        'desc': desc or [{'h': f"{e['pieces']} 件套", 't': e['desc']} for e in (g or {}).get('effects', [])],
    })

for it in pool['posse']:
    parts, mline, desc = meta('posse', it['id'])
    D['key'].append({
        'id': tok_tid.get(it['en']), 'pid': it['id'], 'en': it['en'], 'zh': it['zh'], 'realm': parts[0] if parts else '',
        'img': asset(pool_rel(it['img']), 'key', (120, 120)), 'desc': desc,
    })

pool_relic_en = {}
for it in pool['relic']:
    parts, mline, desc = meta('relic', it['id'])
    e = {
        'id': None, 'pid': it['id'], 'en': it['en'], 'zh': it['zh'], 'rarity': parts[1] if len(parts) > 1 else '',
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
STAGE_RE = re.compile(r'Zone (\d): (?:Threat Level )?(\S+)')
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
    # Use the overview map's actual Boss encounters, not the last battle node in a zone.
    nf = M / f'dzone-info/map-{s}.json'
    if nf.exists():
        for wave in jl(nf)['waves']:
            zone_boss[wave['wave']] = list(dict.fromkeys(
                str(m['tid']) for enc in wave['enc'].values() if enc['t'] == 'Boss'
                for m in enc['m']))
    fixed_boss = {
        (71, 1): ['80576', '80577'], (71, 2): ['94940'],
        (71, 3): ['67103'], (71, 4): ['14063'], (71, 5): ['81279'],
        (72, 1): ['14008', '14013'], (72, 2): ['14064'],
        (72, 3): ['60096'], (72, 4): ['120308', '120310', '120306'],
        (72, 5): ['14086'],
    }
    for (season, z), ids_for_zone in fixed_boss.items():
        if season == s:
            zone_boss[z] = ids_for_zone
    gids = sorted(jl(base / 'meta.json')['stageGroupIds'])
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
                    'up': sum(x.get('upNum') or 0 for x in (a.get('slots') or [])),
                    'tal': sum(x.get('lv') or 0 for x in (a.get('talents') or {}).values()),
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
            zone = gids.index(b['stageGroupId']) + 1 if b['stageGroupId'] in gids else int(sm.group(1))
            members.sort(key=lambda x: (-x['dmg'], -x['blk'], -x['heal']))
            cand[s].append({
                'season': s, 'zone': zone, 'threat': sm.group(2) if sm else '?',
                'madness': ids['stages'].get(str(b['stageTid']), {}).get('madness'),
                'boss': zone_boss.get(zone) or [], 'score': b['score'], 'rank': b['rank'],
                'rounds': b['stageRoundCount'], 'bossRounds': b['bossBattleRoundCount'],
                'cards': b['totalUseCard'], 'energy': b['totalEnergyCost'], 'maxBout': b['maxBoutDamage'],
                'deathResist': b['deathResistCount'], 'hp': b['maxHp'], 'left': b['leftHp'],
                'playerDmg': b.get('playerDamage') or 0, 'key': key, 'relics': rel, 'team': members,
                # Real battle-summary extrema, not additive damage categories.
                'dmgComp': {
                    'keeper': b.get('playerDamage') or 0,
                    'tentacle': b.get('maxTentacleDamage') or 0,
                    'counter': b.get('maxCounterAtt') or 0,
                    'strength': b.get('maxStrength') or 0,
                    'poison': b.get('maxPosion') or 0,
                },
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

# entries that never appear in a leaderboard team (no in-game id known) still need an id so the
# picker can offer them as decoys / the codex can show them; they can never be a correct answer
for kind in ('wheel', 'covenant', 'key', 'creation'):
    for e in D[kind]:
        e['real'] = e.get('id') is not None
        if e['id'] is None:
            e['id'] = 'p:' + e['pid']
        e.setdefault('use', None)

# ---------------------------------------------------------------- Chinese text, keywords, awakener skills
# SKeyDB data is CC BY-NC-SA 4.0; the Chinese wording of skills/keywords comes from scripts/i18n/zh (see README)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import i18n_lib as I

V3 = M / 'skeydb/public-v3/records'
gl = jl(M / 'game/glossary.json')['entries']
js = (SRC / 'morimens-calculator-skeydb.js').read_text(encoding='utf-8')
known_ids = dict(re.findall(r"'((?:skill|derived|talent|enlighten)\.[^']+)':'([^']+)'", js[js.index('const zhSkillNames'):js.index('const uniqueTermZh')]))
unique_terms = dict(re.findall(r"'([^']+)':'([^']+)'", js[js.index('const uniqueTermZh'):js.index('const globalTermMeta')]))
overlays = [jl(f) for f in sorted((V3 / 'overlays').glob('*.json'))]
pool_names = {}
for kind in ('awakener', 'wheel', 'relic', 'posse', 'covenant'):
    for it in pool[kind]:
        if it['zh']:
            pool_names[it['en']] = it['zh']
records = {k: [jl(f) for f in sorted((V3 / k).glob('*.json'))] for k in ('skills', 'talents', 'enlightens', 'derived-skills')}
known_en2zh = {r['name']: known_ids[r['id']] for rs in records.values() for r in rs if r['id'] in known_ids}
L = I.Lang(overlays, gl, known_ids, known_en2zh, unique_terms, pool_names)

SLOT_ZH = {'Strike': '打击', 'Defense': '防御', 'Skill1': '技能', 'Skill2': '技能', 'Rouse': '灵知觉醒', 'Exalt': '狂气爆发',
           'OverExalt': '超限爆发', 'E1': '启灵 1', 'E2': '启灵 2', 'E3': '启灵 3', 'AbsoluteAxiom': '绝对公理'}
ORDER = ['Strike', 'Defense', 'Skill1', 'Skill2', 'Rouse', 'Exalt', 'OverExalt']
by_owner = defaultdict(lambda: {'skills': [], 'talents': [], 'enlightens': [], 'derived': []})
missing_tpl = 0
for kind, key in (('skills', 'skills'), ('talents', 'talents'), ('enlightens', 'enlightens'), ('derived-skills', 'derived')):
    for r in records[kind]:
        o = r.get('ownerAwakenerId')
        if not o:
            continue
        d = L.render(r, r.get('maxLevel'))
        if d is None:
            missing_tpl += 1
            d = r.get('descriptionTemplate') or ''
        entry = {'n': L.name_of(r), 'e': r['name'], 'slot': r.get('slot', ''), 'ty': SLOT_ZH.get(r.get('slot'), '天赋' if kind == 'talents' else ''), 'd': d}
        if kind in ('skills', 'derived-skills') and r.get('cost') not in (None, ''):
            entry['cost'] = r['cost']
        by_owner[o][key].append(entry)
for rec in by_owner.values():
    rec['skills'].sort(key=lambda x: ORDER.index(x['slot']) if x['slot'] in ORDER else 99)

awk_by_pid = {e['pid']: e for e in D['awakener']}
wn = {e['pid']: e['zh'] for e in D['wheel']}
cn_ = {e['pid']: e['zh'] for e in D['covenant']}
builds = {}
for f in sorted((V3 / 'awakener-builds').glob('*.json')):
    r = jl(f)
    builds[r.get('awakenerId')] = [{'label': {'Support': '辅助', 'Defence': '防御', 'Damage': '输出', 'DPS': '输出', 'Sub DPS': '副输出'}.get(b.get('label'), b.get('label')),
                                    'covenants': [cn_.get(c, c) for c in b.get('recommendedCovenantIds', [])],
                                    'wheels': [[wn.get(w, w) for w in x['wheelIds']] for x in b.get('recommendedWheels', [])][:4]}
                                   for b in r.get('builds', [])]
SK = {}
for pid, rec in by_owner.items():
    a = awk_by_pid.get(pid)
    if a:
        SK[a['pid']] = {**rec, 'builds': builds.get(pid, [])}
        a['hasSkills'] = True

# ---- creations / keys that still lack Chinese
cfg_relic = jl(M / 'replay-relic-config.json')['relic']
cn = lambda t: bool(I.CJK.search(t or ''))
clean = lambda t: re.sub(r'<[^>]+>', '', t or '').replace('\\n', '\n')
has_zh_desc = lambda e: bool(e['desc']) and any(cn(x['t']) for x in e['desc'])
base_desc = {e['en']: e['desc'] for e in D['creation'] if has_zh_desc(e)}
for e in D['creation']:
    c = cfg_relic.get(str(e['id']))
    if not cn(e['zh']):
        z = (c['Name'].split('|')[-1] if c and c.get('Name') else '') or L.misc['creation_names'].get(e['en'])
        if z:
            e['zh'] = z
    if not has_zh_desc(e):
        if c and c.get('Desc'):
            e['desc'] = [{'h': '造物特性', 't': clean(c['Desc'].split('|')[-1])}]
        elif e['en'].endswith('+') and e['en'][:-1] in base_desc:
            e['desc'] = base_desc[e['en'][:-1]]
        elif e['en'] in L.misc['creation_descs']:
            e['desc'] = [{'h': '造物特性', 't': L.render({}, template=L.misc['creation_descs'][e['en']])}]
for e in D['key']:
    if not cn(e['zh']) and e['en'] in L.misc['key_names']:
        e['zh'] = L.misc['key_names'][e['en']]

# ---- link keywords inside every text, then index which entries mention which keyword
for kind in ('wheel', 'covenant', 'key', 'creation'):
    for e in D[kind]:
        for x in e['desc']:
            x['t'] = L.link(x['t'])
for e in D['monster']:
    e['desc'] = L.link(e['desc'])
    e['skills'] = [L.link(t) for t in e['skills']]
REALM_SLUG = {'血肉': 'caro', '混沌': 'chaos', '深海': 'aequor', '超维': 'ultra'}
usage_kw = defaultdict(lambda: defaultdict(int))


def finish_kw(kind, e, texts):
    ks = set()
    for t in texts:
        ks.update(I.slugs_in(t))
    if kind == 'awakener':
        # 界域关键词（混沌 / 血肉 / 深海 / 超维）在唤醒体身上表示「属于这个界域」，不是「技能文本里提到过」。
        # 卡拉布（血肉）的技能提到「混沌」，以前就被挂上 chaos，选卡器里按「混沌」筛会把她也筛出来。
        own = REALM_SLUG.get(e.get('realm'))
        ks -= {v for v in REALM_SLUG.values() if v != own}
    if REALM_SLUG.get(e.get('realm')):
        ks.add(REALM_SLUG[e['realm']])
    e['kw'] = sorted(ks)
    for k in ks:
        usage_kw[k][kind] += 1


for kind in ('wheel', 'covenant', 'key', 'creation'):
    for e in D[kind]:
        finish_kw(kind, e, [x['t'] for x in e['desc']])
for e in D['monster']:
    finish_kw('monster', e, [e['desc']] + e['skills'])
for e in D['awakener']:
    rec = SK.get(e['pid'], {})
    finish_kw('awakener', e, [x['d'] for g in ('skills', 'talents', 'enlightens', 'derived') for x in rec.get(g, [])])

# ---- keyword table
KW_REALM_ICON = {'caro': 'Xuerou', 'chaos': 'Hundun', 'aequor': 'Shenhai', 'ultra': 'Chaowei'}
kwlist = []
for k in L.kw.values():
    icon = asset(f"skeydb-icons/{k['i']}.webp", 'kw', (64, 64)) if k['i'] else None
    if k['s'] in KW_REALM_ICON:
        src_svg = A / 'realms-svg' / f"Icon_Career2_{KW_REALM_ICON[k['s']]}.svg"
        if src_svg.exists():
            (OUT_ASSET / 'kw').mkdir(parents=True, exist_ok=True)
            (OUT_ASSET / 'kw' / f'realm-{k["s"]}.svg').write_bytes(src_svg.read_bytes())
            icon = f'assets/kw/realm-{k["s"]}.svg'
    kwlist.append({'s': k['s'], 'n': k['n'], 'e': k['e'], 'a': k['a'], 'd': k['d'], 't': k['t'], 'c': k['c'], 'i': icon,
                   'cnt': dict(usage_kw.get(k['s'], {}))})
kwlist.sort(key=lambda k: ({'realm': 0, 'mechanic': 1, 'tag': 2, 'help': 3}.get(k['t'], 9), k['n']))
json.dump(kwlist, open(OUT_DATA / 'keywords.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(SK, open(OUT_DATA / 'skills.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('keywords', len(kwlist), 'skills', sum(len(v['skills']) + len(v['talents']) + len(v['enlightens']) + len(v['derived']) for v in SK.values()),
      'missing templates', missing_tpl, 'unresolved terms', len(L.unresolved), list(L.unresolved)[:12])

# ---------------------------------------------------------------- hide the answers from the plain JSON
import base64, hashlib, secrets
PEPPER = secrets.token_hex(8)
(ROOT / 'js').mkdir(exist_ok=True)
(ROOT / 'js/pepper.js').write_text(f"// generated by scripts/build_data.py\nexport const PEPPER = '{PEPPER}';\n", encoding='utf-8')


def seal(pid, obj):
    raw = ('ZJ1:' + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))).encode()
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        out += bytes(a ^ b for a, b in zip(raw[i:i + 32], ks))
    return base64.b64encode(bytes(out)).decode()


pub = []
for p in puzzles:
    secret = {'team': p['team'], 'key': p['key'], 'relics': p['relics']}
    q = {k: v for k, v in p.items() if k not in secret}
    q['nrel'] = len(p['relics'])
    q['clues'] = [{k: m[k] for k in ('dmg', 'blk', 'heal', 'up', 'tal')} for m in p['team']]
    q['ans'] = seal(p['id'], secret)
    pub.append(q)

json.dump(D, open(OUT_DATA / 'dictionary.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'seasons': args.seasons, 'puzzles': pub}, open(OUT_DATA / 'puzzles.json', 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
print({k: len(v) for k, v in D.items() if isinstance(v, list)}, 'puzzles', len(pub),
      Counter(p['diff'] for p in pub), 'assets', len(used_assets), 'skills for', len(SK), 'awakeners')
