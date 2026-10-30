#!/usr/bin/env python3
"""Add recorded outside attributes, matched by battle UUID and awakener tid.
Usage: python3 scripts/enrich_outside.py ../qdby_chinese
Only snapshot attrs are copied; no combat buffs or invented missing values.
"""
import gzip, json, sys
from pathlib import Path
from enrich_clues import unseal, seal

ROOT = Path(__file__).resolve().parent.parent

def main():
    source = Path(sys.argv[1]) / 'data/morimens/dzone'
    files = list((ROOT / 'data').glob('puzzles*.json'))
    docs = [(f, json.loads(f.read_text())) for f in files]
    wanted = {p.get('uuid') for _, d in docs for p in d['puzzles']}
    snapshots = {}
    for season in sorted({p['season'] for _, d in docs for p in d['puzzles']}):
        for f in sorted((source / f'season{season}/raw-teams').glob('*.jsonl.gz')):
            with gzip.open(f, 'rt', encoding='utf8') as stream:
                for line in stream:
                    row = json.loads(line)
                    sig = row.get('rankSignature') or {}
                    response = row.get('response') or {}
                    for uuidkey, teamkey in [('battleUuid', 'team'), ('battleUuidExtra', 'teamExtra')]:
                        uuid = sig.get(uuidkey)
                        if uuid not in wanted:
                            continue
                        awakers = (response.get(teamkey) or {}).get('awakers') or []
                        if awakers:
                            snapshots[uuid] = {str(a['tid']): a.get('attrs') for a in awakers}
    count = 0
    for f, doc in docs:
        for p in doc['puzzles']:
            raw = snapshots.get(p.get('uuid'))
            if not raw:
                continue
            answer = unseal(p['id'], p['ans'])
            changed = False
            for a in answer['team']:
                attrs = raw.get(str(a['tid']))
                if isinstance(attrs, dict) and attrs:
                    a['outside'] = {key: attrs[key] for key in ('blackcoin_upgrade_per', 'occupation_master', 'atk', 'crit', 'crit_damage', 'keeper_energy_eff_2') if key in attrs}
                    changed = True
            if changed:
                p['ans'] = seal(p['id'], answer)
                count += 1
        f.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')))
    print(f'局外属性已补充 {count} 道题（按 UUID 匹配）')

if __name__ == '__main__':
    main()
