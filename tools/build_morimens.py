#!/usr/bin/env python3
"""Enrich public/data/game-data.json with the real skill names/text, keyword table and monster skills.

usage: python3 tools/build_morimens.py --morimens ../qdby_morimens
Reads  <morimens>/data/{skills,keywords,dictionary}.json and <morimens>/assets/kw/*   (see the 战报侦探 repo)
Writes public/data/game-data.json (adds `kw`, awakeners[].rk, monsters[].sk) and public/img/kw/*

Chinese skill text is an AI-assisted translation of SKeyDB data (CC BY-NC-SA 4.0); it is flavour text only,
the numbers in this game come from src/core/skills.js.
"""
import argparse, json, re, shutil
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--morimens', default='../qdby_morimens')
ap.add_argument('--chinese', default='../qdby_chinese')
args = ap.parse_args()
M = Path(args.morimens).resolve()
ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'public/data/game-data.json'
pack = json.loads(PACK.read_text(encoding='utf-8'))
SK = json.loads((M / 'data/skills.json').read_text(encoding='utf-8'))
KW = json.loads((M / 'data/keywords.json').read_text(encoding='utf-8'))
DICT = json.loads((M / 'data/dictionary.json').read_text(encoding='utf-8'))
MARK = re.compile(r'⟦([^|⟧]+)\|')

# keyword table (+ icons)
(ROOT / 'public/img/kw').mkdir(parents=True, exist_ok=True)
kw = {}
for k in KW:
    icon = None
    if k['i']:
        src = M / k['i']
        if src.exists():
            shutil.copyfile(src, ROOT / 'public/img/kw' / src.name)
            icon = f'img/kw/{src.name}'
    kw[k['s']] = {'n': k['n'], 'e': k['e'], 'd': k['d'], 't': k['t'], 'c': k['c'], 'i': icon}
pack['kw'] = kw

# real kits: the game's 7 slots are exactly the real card slots
SLOTS = ['Strike', 'Defense', 'Skill1', 'Skill2', 'Rouse', 'Exalt', 'OverExalt']
n_kit = 0
for a in pack['awakeners']:
    rec = SK.get(a['id'])
    if not rec:
        continue
    rk = {}
    for x in rec['skills']:
        if x['slot'] in SLOTS:
            rk[x['slot']] = {'n': x['n'], 'e': x['e'], 'd': x['d'], 'tags': sorted(set(MARK.findall(x['d']))),
                             **({'c': x['cost']} if x.get('cost') not in (None, '') else {})}
    a['rk'] = rk
    # 启灵 (enlightens) ride along as star flavour text
    a['rk_en'] = [{'n': x['n'], 'ty': x['ty'], 'd': x['d']} for x in rec['enlightens'] if x['slot'] in ('E1', 'E2', 'E3')]
    n_kit += 1

# monsters: real skill lines by portrait stem
by_stem = {m['img'].split('/')[-1][:-5]: m for m in DICT['monster'] if m.get('img')}
n_mon = 0
for m in pack['monsters']:
    d = by_stem.get(m['img'].split('/')[-1][:-5])
    if d:
        m['sk'] = d['skills']
        m['desc'] = d['desc']
        m['traits'] = d['traits']
        if not re.search('[\u4e00-\u9fff]', m['zh']) and d['zh']:
            m['zh'] = d['zh']
        n_mon += 1

# 融灾试炼: real zone bosses from the client's battle-node dumps (qdby_chinese)
src_ch = Path(args.chinese).resolve()
by_id = {m['id']: m for m in DICT['monster']}
trial_mons, trials = {}, []
def tmon(mid):
    m = by_id.get(str(mid))
    if not m or not m.get('img'):
        return None
    stem = Path(m['img']).name
    sp = M / m['img']
    if sp.exists():
        shutil.copyfile(sp, ROOT / 'public/img/mon' / stem)
    trial_mons[str(mid)] = {'id': str(mid), 'zh': m['zh'], 'rank': {'Boss': 'Boss', '精英': 'Elite'}.get(m['cls'], 'Normal'),
                            'img': f'img/mon/{stem}', 'sk': m['skills'], 'desc': m['desc'], 'traits': m['traits']}
    return str(mid)
for season in (71, 72):
    f = src_ch / f'data/morimens/game/battle-nodes-local-{season}.json'
    if not f.exists():
        continue
    zones = {}
    for n in json.loads(f.read_text(encoding='utf-8'))['battleNodes']:
        z = zones.setdefault(n['zone'], {'Boss': [], 'Elite': [], 'Common': []})
        for mm in n['monsters']:
            if mm['id'] not in z[n['battleType']]:
                z[n['battleType']].append(mm['id'])
    for zone, z in sorted(zones.items()):
        boss = [x for x in (tmon(i) for i in z['Boss']) if x]
        if not boss:
            continue
        elite = [x for x in (tmon(i) for i in z['Elite']) if x]
        common = [x for x in (tmon(i) for i in z['Common'][:8]) if x]
        trials.append({'id': f's{season}z{zone}', 'season': season, 'zone': zone, 'name': '、'.join(trial_mons[b]['zh'] for b in boss),
                       'boss': boss, 'elite': elite, 'common': common})
pack['trials'] = trials
pack['trialMonsters'] = trial_mons
PACK.write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('trials', len(trials), 'trial monsters', len(trial_mons), 'keywords', len(kw), 'kits', n_kit, 'monsters with skills', n_mon, 'pack KB', PACK.stat().st_size // 1024)
