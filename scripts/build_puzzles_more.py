#!/usr/bin/env python3
"""扩充题库：从原始战报里再挖一批题，输出 data/puzzles-extra.json。

数据来源（全部是公开的天梯战报摘要 + 队伍快照，和 build_data.py 同源）：
    <src>/<season>-battle-summary.jsonl.gz
    <src>/{season<N>-teams,<N>-teams}-*.jsonl.gz
    <src>/<season>-id-names.json
    <src>/<season>-meta.json

用法：
    python3 scripts/build_puzzles_more.py D:/软件所/morimens/_tmp_qdby --per-zone 100

产出与 data/puzzles.json 里的题结构一致（答案仍然用 ZJ1 流密钥封装），
再由 scripts/finalize_puzzles.py 统一打难度分与「偏好筛选」分桶。
"""
import argparse, base64, gzip, hashlib, json, random, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data' / 'puzzles-extra.json'
PEPPER = re.search(r"'([0-9a-f]+)'", (ROOT / 'js/pepper.js').read_text(encoding='utf-8')).group(1)

STAGE_RE = re.compile(r'Zone (\d): (?:Threat Level )?(\S+)')


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def seal(pid, obj):
    raw = ('ZJ1:' + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))).encode()
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        out += bytes(a ^ b for a, b in zip(raw[i:i + 32], ks))
    return base64.b64encode(bytes(out)).decode()


def card_total_lv(slots):
    return sum(int(s.get('level') or 0) for s in (slots or []) if s)


def madness_lv(talents):
    """疯狂预兆：通用天赋，tid 落在 1395xx 段（见 enhance_data.py 的说明）。"""
    for tid, v in (talents or {}).items():
        try:
            t = int(tid)
        except (TypeError, ValueError):
            continue
        if 139500 <= t < 140000:
            lv = v.get('lv') if isinstance(v, dict) else v
            try:
                return int(lv) or None
            except (TypeError, ValueError):
                return None
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--seasons', nargs='*', type=int, default=[71, 72])
    ap.add_argument('--per-zone', type=int, default=100)
    ap.add_argument('--seed', type=int, default=20261027)
    ap.add_argument('--out', default=str(OUT))
    args = ap.parse_args()
    SRC = Path(args.src)

    D = jl(ROOT / 'data/dictionary.json')
    by_id = {k: {str(e['id']) for e in v if e.get('id') is not None}
             for k, v in D.items() if isinstance(v, list)}

    core = jl(ROOT / 'data/puzzles.json')['puzzles']
    have_ids = {p['id'] for p in core}
    # 已有的扩充题库也要算进「已经有」，否则新一批会和 extra 撞 id
    for rel in ('data/puzzles-extra.json', args.out):
        fp = Path(rel)
        if not fp.is_absolute():
            fp = ROOT / rel
        if fp.exists() and fp.resolve() != (ROOT / 'data/puzzles.json').resolve():
            try:
                have_ids |= {p['id'] for p in jl(fp)['puzzles']}
            except (KeyError, json.JSONDecodeError):
                pass
    print(f'已有题目 {len(have_ids)} 道')
    # The overview boss is a property of season + zone, not of an individual report.
    # Explicit encounter IDs avoid accidentally selecting another wave's boss.
    fixed_boss = {
        (70, 1): ['14015'], (70, 2): ['14011'],
        (70, 3): ['140713'], (70, 4): ['147675'],
        (70, 5): ['125901'],
        (71, 1): ['80576', '80577'], (71, 2): ['94940'],
        (71, 3): ['67103'], (71, 4): ['14063'], (71, 5): ['81279'],
        (72, 1): ['14008', '14013'], (72, 2): ['14064'],
        (72, 3): ['60096'], (72, 4): ['120308', '120310', '120306'],
        (72, 5): ['14039'],
    }
    zone_boss = dict(fixed_boss)
    for p in core:
        zone_boss.setdefault((p['season'], p['zone']), p['boss'])

    rng = random.Random(args.seed)
    picks = []
    total_seen = 0
    for s in args.seasons:
        ids = jl(SRC / f'{s}-id-names.json')
        meta = jl(SRC / f'{s}-meta.json')
        groups = sorted(meta['stageGroupIds'])
        bs = {}
        for f in SRC.glob(f'{s}-battle-summary.jsonl.gz'):
            with gzip.open(f, 'rt', encoding='utf-8') as fh:
                for line in fh:
                    r = json.loads(line)
                    bs[r['battleUuid']] = r
        shards = sorted(SRC.glob(f'season{s}-teams-*.jsonl.gz')) + sorted(SRC.glob(f'{s}-teams-*.jsonl.gz'))
        seen = set()
        cand = defaultdict(list)
        for rf in shards:
            with gzip.open(rf, 'rt', encoding='utf-8') as fh:
                for line in fh:
                    row = json.loads(line)
                    sig = row.get('rankSignature') or {}
                    tm = (row.get('response') or {}).get('team') or {}
                    b = bs.get(sig.get('battleUuid'))
                    if not b or not tm.get('awakers') or not isinstance(tm.get('items'), dict):
                        continue
                    total_seen += 1
                    items = tm['items']
                    members, ok = [], True
                    for a in tm['awakers']:
                        tid = str(a['tid'])
                        if tid not in by_id['awakener']:
                            ok = False
                            break
                        ws = a.get('weaponSlots')
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
                        m = {
                            'tid': tid, 'lv': a.get('level'), 'brk': a.get('breakLevel'), 'pot': a.get('potencyLevel'),
                            'wheels': wheels, 'cov': cov,
                            'dmg': bd.get('damage') or 0, 'blk': bd.get('block') or 0, 'heal': bd.get('heal') or 0,
                            'up': sum(x.get('upNum') or 0 for x in (a.get('slots') or [])),
                            'tal': sum(x.get('lv') or 0 for x in (a.get('talents') or {}).values()),
                        }
                        # 养成线索（和 enhance_data.py 同口径）
                        clv = card_total_lv(a.get('slots'))
                        if clv:
                            m['cardLv'] = clv
                        mlv = madness_lv(a.get('talents'))
                        if mlv:
                            m['madness'] = mlv
                        members.append(m)
                    if not ok or len(members) != 4:
                        continue
                    key = str(tm.get('keeperSkill'))
                    if key not in by_id['key']:
                        continue
                    rel = [str(x) for x in b.get('relics', []) if str(x) in by_id['creation']]
                    stage = ids['stages'].get(str(b['stageTid']), {})
                    sm = STAGE_RE.search(stage.get('name', ''))
                    zone = groups.index(b['stageGroupId']) + 1 if b['stageGroupId'] in groups else int(sm.group(1))
                    k = (row['uid'], zone)
                    if k in seen:
                        continue
                    seen.add(k)
                    members.sort(key=lambda x: (-x['dmg'], -x['blk'], -x['heal']))
                    cand[zone].append({
                        'season': s, 'zone': zone, 'threat': sm.group(2) if sm else '?',
                        'madness': stage.get('madness'),
                        'boss': zone_boss.get((s, zone), []),
                        'score': b['score'], 'rank': b['rank'],
                        'rounds': b['stageRoundCount'], 'bossRounds': b['bossBattleRoundCount'],
                        'cards': b['totalUseCard'], 'energy': b['totalEnergyCost'], 'maxBout': b['maxBoutDamage'],
                        'deathResist': b['deathResistCount'], 'hp': b['maxHp'], 'left': b['leftHp'],
                        'playerDmg': b.get('playerDamage') or 0, 'key': key, 'relics': rel, 'team': members,
                        'uuid': sig.get('battleUuid'), 'extra': bool(b.get('extraPass')),
                        'dmgComp': {
                            # Direct extrema from official battle-summary; these are NOT
                            # cumulative category damage and must never be summed.
                            'keeper': b.get('playerDamage') or 0,
                            'tentacle': b.get('maxTentacleDamage') or 0,
                            'counter': b.get('maxCounterAtt') or 0,
                            'strength': b.get('maxStrength') or 0,
                            'poison': b.get('maxPosion') or 0,
                        },
                        'uid': row['uid'],
                    })
        for z, lst in sorted(cand.items()):
            good = [p for p in lst
                    if sum(m['dmg'] for m in p['team']) > 0
                    and all((m['dmg'] + m['blk'] + m['heal']) > 0 for m in p['team'])
                    and all(m['wheels'] and m['cov'] for m in p['team'])]
            rng.shuffle(good)
            for p in good:
                p['id'] = f"{p['season']}-{p['zone']}-{p['uid'] % 100000}"
                del p['uid']
                if p['id'] in have_ids:
                    continue
                have_ids.add(p['id'])
                picks.append(p)
                if sum(1 for q in picks if q['season'] == s and q['zone'] == z) >= args.per_zone:
                    break
        print(f'season {s}: 读到 {total_seen} 条队伍快照，累计新增 {len(picks)}')

    # 封装答案
    pub = []
    for p in picks:
        secret = {'team': p['team'], 'key': p['key'], 'relics': p['relics']}
        q = {k: v for k, v in p.items() if k not in secret}
        q['nrel'] = len(p['relics'])
        q['clues'] = [{k: m[k] for k in ('dmg', 'blk', 'heal', 'up', 'tal')} for m in p['team']]
        q['ans'] = seal(p['id'], secret)
        q['diff'] = 2
        q['diffScore'] = 0
        pub.append(q)

    Path(args.out).write_text(json.dumps({'seasons': args.seasons, 'extra': True, 'puzzles': pub},
                                         ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('新增题数', len(pub), Counter((p['season'], p['zone']) for p in pub))


if __name__ == '__main__':
    main()
