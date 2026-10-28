#!/usr/bin/env python3
"""Sync the real monster design into public/data/game-data.json.

usage: python3 tools/build_monsters.py --morimens ../qdby_main --chinese ../qdby_chinese
Reads  <chinese>/data/morimens/maps/monsters.json   (client monster table: class, size, hp/atk/df multipliers,
                                                     opening `op` + cycle `cy` skill order, skill formulas/intents/targets)
       <morimens>/data/{dictionary,official-terms}.json  (official zh names, traits)
       <chinese>/assets/morimens/dzone-intent/*.png      (intent icons)
Writes game-data.json: `monsters` (roster), `msk` (skills used by the roster), `trialMonsters`; public/img/intent/*

Run after tools/build_morimens.py. Skill text is the client's Chinese text; numbers stay as formulas (`a` args) and
src/core/monsters.js turns them into battle effects.
"""
import argparse, json, re, shutil
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--morimens', default='../qdby_main')
ap.add_argument('--chinese', default='../qdby_chinese')
args = ap.parse_args()
M, C = Path(args.morimens).resolve(), Path(args.chinese).resolve()
ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'public/data/game-data.json'
pack = json.loads(PACK.read_text(encoding='utf-8'))
src = json.loads((C / 'data/morimens/maps/monsters.json').read_text(encoding='utf-8'))
DICT = {m['id']: m for m in json.loads((M / 'data/dictionary.json').read_text(encoding='utf-8'))['monster']}
OFFICIAL = json.loads((M / 'data/official-terms.json').read_text(encoding='utf-8'))['byId']['monster']

ICON_ID = {'Intent_Attack': '001', 'Intent_HeavyAttack': '002', 'Intent_Debuff': '003', 'Intent_StrongDebuff': '004', 'Intent_Buff': '005',
           'Intent_StrongBuff': '006', 'Intent_Defence': '007', 'Intent_AttackDefence': '008', 'Intent_AttackDebuff': '009',
           'Intent_AttackBuff': '010', 'Intent_DefenceBuff': '011', 'Intent_DefenceDebuff': '012', 'Intent_Dizzy': '013',
           'Intent_Unknown': '014', 'Intent_Burst': '015', 'Intent_Burst2': '015', 'Intent_Burst3': '015'}
INTENT_ZH = {'001': '攻击', '002': '重击', '003': '削弱', '004': '强力削弱', '005': '强化', '006': '强力强化', '007': '防御', '008': '攻防兼备',
             '009': '攻击·削弱', '010': '攻击·强化', '011': '防御·强化', '012': '防御·削弱', '013': '眩晕', '014': '未知', '015': '特殊行动'}
(ROOT / 'public/img/intent').mkdir(parents=True, exist_ok=True)
for f in (C / 'assets/morimens/dzone-intent').glob('intent_*.png'):
    shutil.copyfile(f, ROOT / 'public/img/intent' / f.name)

# keyword linking of skill text
kw = pack['kw']
names = sorted({v['n'] for v in kw.values() if len(v['n']) >= 2}, key=len, reverse=True)
by_name = {v['n']: s for s, v in kw.items()}
scan = re.compile('|'.join(re.escape(n) for n in names))
link = lambda t: scan.sub(lambda m: f'⟦{by_name[m.group(0)]}|{m.group(0)}⟧', t)


def split_top(s):
    out, depth, cur = [], 0, ''
    for ch in s:
        if ch in '([{': depth += 1
        elif ch in ')]}': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out] if s.strip() else []


NUM = re.compile(r'^-?[\d.]+$')
def parse_arg(x):
    m = re.match(r'^BattleAtkForce\*([\d.]+)$', x)
    if m: return ['a', float(m.group(1))]
    m = re.match(r'^BattleDefForce\*([\d.]+)$', x)
    if m: return ['d', float(m.group(1))]
    if NUM.match(x): return ['n', float(x)]
    m = re.match(r'^BattleAtkForce\*([\d.]+)', x)       # atk-scaled with extras (state layers…)
    if m: return ['a', float(m.group(1)), 1]
    m = re.match(r'^BattleDefForce\*([\d.]+)', x)
    if m: return ['d', float(m.group(1)), 1]
    return ['x']


used_sk, roster = {}, {}
for mid, m in src['monsters'].items():
    d = DICT.get(mid)
    if not d or not d.get('img'):
        continue
    stem = Path(d['img']).stem
    if not (ROOT / f'public/img/mon/{stem}.webp').exists():
        sp = M / d['img']
        if not sp.exists():
            continue
        shutil.copyfile(sp, ROOT / f'public/img/mon/{stem}.webp')
    op = [i for i in (m.get('op') or []) if str(i) in src['skills']]
    cy = [i for i in (m.get('cy') or m.get('sk') or []) if str(i) in src['skills']]
    if not cy or re.search('木桩|假人|训练|Dummy', m['n']) or m.get('hp', 1) <= 0:
        continue
    for i in set(op + cy):
        s = src['skills'][str(i)]
        ic = ICON_ID.get(s[1][0] if s[1] else '', '014')
        used_sk[str(i)] = {'n': s[3] or '', 't': link(s[0]), 'i': ic, 'g': s[4], 'a': [parse_arg(x) for x in split_top(s[2])]}
    zh = OFFICIAL.get(mid, {}).get('zh') or d['zh']
    roster[mid] = {'id': mid, 'zh': zh, 'rank': {'Common': 'Normal', 'Elite': 'Elite', 'Boss': 'Boss'}[m['c']], 'size': m['b'],
                   'img': f'img/mon/{stem}.webp', 'hp': m['hp'], 'atk': m['atk'], 'df': m['df'], 'bt': m.get('bt', ''),
                   'desc': m['d'], 'traits': d.get('traits', []), 'op': op, 'cy': cy}
    if OFFICIAL.get(mid, {}).get('en'): roster[mid]['en'] = OFFICIAL[mid]['en']

pack['monsters'] = list(roster.values())
pack['msk'] = used_sk
pack['intent'] = INTENT_ZH
# trials: keep only boss/elite/common ids that exist in the roster
ok = lambda ids: [i for i in ids if i in roster]
trials, tm = [], {}
for t in pack.get('trials', []):
    boss = ok(t['boss'])
    if not boss: continue
    t = {**t, 'boss': boss, 'elite': ok(t['elite']), 'common': ok(t['common'])}
    t['name'] = '、'.join(roster[b]['zh'] for b in boss)
    trials.append(t)
    for i in boss + t['elite'] + t['common']: tm[i] = roster[i]
pack['trials'], pack['trialMonsters'] = trials, tm
PACK.write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
import collections
print('roster', len(roster), collections.Counter(r['rank'] for r in roster.values()), 'skills', len(used_sk), 'trials', len(trials), 'KB', PACK.stat().st_size // 1024)
