#!/usr/bin/env python3
"""从更新后的第 72 期融灾榜单里再挖 N 道题，并让「唤醒体出现次数」尽可能均匀，输出 data/puzzles-72b.json。

为什么要均匀：榜单上的阵容高度集中（热门唤醒体几乎每队都有），随机抽的题库里热门角色出现几百次、
冷门角色几十次，玩家想练某个冷门角色的题找不到。这一批按「缺谁补谁」贪心选：
每次从候选里挑「四个成员此刻出现次数最少」的那一道，同时每个禁区各占 N/5，保证区域也均衡。
唤醒体本身在榜单里出现得太少（候选里就没几次）时，只能尽量多选，不会凭空编造。

数据来源（qdby_chinese 的 data/morimens/dzone/season72/，2026-11-02 快照）：
    battle-summary.jsonl.gz  raw-teams/teams-*.jsonl.gz  id-names.json  meta.json

用法：
    python3 scripts/build_puzzles_s72_balanced.py /path/to/qdby_chinese/data/morimens/dzone/season72 --n 1000
然后：
    python3 scripts/finalize_puzzles.py && node scripts/split_bank.mjs && python3 scripts/fix_boss_map.py --check
"""
import argparse, gzip, json, random
from collections import Counter, defaultdict
from pathlib import Path

import build_puzzles_more as B   # 复用封装 / 养成线索的函数，口径和之前的题库完全一致

ROOT = B.ROOT
OUT = ROOT / 'data' / 'puzzles-72b.json'
SEASON = 72


def existing_keys(skip):
    """已在题库里的题：按 id 和战报 uuid 去重（同一场战报不能出两次）。
    只读源文件 data/puzzles*.json（分片 data/bank 是它们的产物，里面也有本脚本上次的输出，不能算「已有」）；
    skip 是本次要写的输出文件——重跑要得到同一批题，不能把自己上次的结果当成已有。"""
    ids, uuids = set(), set()
    for f in sorted((ROOT / 'data').glob('puzzles*.json')):
        if f.resolve() == Path(skip).resolve():
            continue
        d = json.loads(f.read_text(encoding='utf-8'))
        for p in (d if isinstance(d, list) else d.get('puzzles', [])):
            ids.add(p.get('id'))
            if p.get('uuid'):
                uuids.add(p['uuid'])
    return ids, uuids


def collect(src, D, by_id):
    ids = B.jl(src / 'id-names.json')
    meta = B.jl(src / 'meta.json')
    groups = sorted(meta['stageGroupIds'])
    bs = {}
    with gzip.open(src / 'battle-summary.jsonl.gz', 'rt', encoding='utf-8') as fh:
        for line in fh:
            r = json.loads(line)
            bs[r['battleUuid']] = r
    cands, seen = [], set()
    for rf in sorted((src / 'raw-teams').glob('teams-*.jsonl.gz')):
        with gzip.open(rf, 'rt', encoding='utf-8') as fh:
            for line in fh:
                row = json.loads(line)
                sig = row.get('rankSignature') or {}
                tm = (row.get('response') or {}).get('team') or {}
                b = bs.get(sig.get('battleUuid'))
                if not b or not tm.get('awakers') or not isinstance(tm.get('items'), dict):
                    continue
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
                    for w in sorted(ws or [], key=lambda w: w.get('slot', 0)):
                        t = (items.get(str(w['weaponUid'])) or {}).get('tid')
                        if t is not None and str(t) in by_id['wheel']:
                            wheels.append(str(t))
                    from collections import Counter as C2
                    suits = C2((items.get(str(x)) or {}).get('suitId') for x in a['trinkets'])
                    suit, cnt = suits.most_common(1)[0] if suits else (None, 0)
                    cov = str(suit) if suit is not None and str(suit) in by_id['covenant'] and cnt >= 3 else None
                    bd = next((x for x in b['awakers'] if str(x['tid']) == tid and not x.get('assist')), None) \
                        or next((x for x in b['awakers'] if str(x['tid']) == tid), None)
                    if not bd:
                        ok = False
                        break
                    m = {'tid': tid, 'lv': a.get('level'), 'brk': a.get('breakLevel'), 'pot': a.get('potencyLevel'),
                         'wheels': wheels, 'cov': cov,
                         'dmg': bd.get('damage') or 0, 'blk': bd.get('block') or 0, 'heal': bd.get('heal') or 0,
                         'up': sum(x.get('upNum') or 0 for x in (a.get('slots') or [])),
                         'tal': sum(x.get('lv') or 0 for x in (a.get('talents') or {}).values())}
                    clv = B.card_total_lv(a.get('slots'))
                    if clv:
                        m['cardLv'] = clv
                    mlv = B.madness_lv(a.get('talents'))
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
                sm = B.STAGE_RE.search(stage.get('name', ''))
                zone = groups.index(b['stageGroupId']) + 1 if b['stageGroupId'] in groups else int(sm.group(1))
                k = (row['uid'], zone)
                if k in seen:
                    continue
                seen.add(k)
                members.sort(key=lambda x: (-x['dmg'], -x['blk'], -x['heal']))
                # 和之前的题一致的质量门槛：全员有输出 / 承伤 / 治疗、全员有命轮和密契套装
                if not (sum(m['dmg'] for m in members) > 0
                        and all((m['dmg'] + m['blk'] + m['heal']) > 0 for m in members)
                        and all(m['wheels'] and m['cov'] for m in members)):
                    continue
                cands.append({
                    'season': SEASON, 'zone': zone, 'threat': sm.group(2) if sm else '?', 'madness': stage.get('madness'),
                    'score': b['score'], 'rank': b['rank'], 'rounds': b['stageRoundCount'], 'bossRounds': b['bossBattleRoundCount'],
                    'cards': b['totalUseCard'], 'energy': b['totalEnergyCost'], 'maxBout': b['maxBoutDamage'],
                    'deathResist': b['deathResistCount'], 'hp': b['maxHp'], 'left': b['leftHp'],
                    'playerDmg': b.get('playerDamage') or 0, 'key': key, 'relics': rel, 'team': members,
                    'uuid': sig.get('battleUuid'), 'extra': bool(b.get('extraPass')),
                    'dmgComp': {'keeper': b.get('playerDamage') or 0, 'tentacle': b.get('maxTentacleDamage') or 0,
                                'counter': b.get('maxCounterAtt') or 0, 'strength': b.get('maxStrength') or 0,
                                'poison': b.get('maxPosion') or 0},
                    'uid': row['uid'],
                })
    return cands


def balanced_pick(cands, n, rng):
    """贪心：每个禁区 n/5 道；每一步选「四个成员当前出现次数最少」的候选（得分 = Σ 1/(1+count)^2，越大越缺）。"""
    zones = sorted({c['zone'] for c in cands})
    quota = {z: n // len(zones) for z in zones}
    for z in zones[: n - sum(quota.values())]:
        quota[z] += 1
    cnt = Counter()
    picked = []
    pool = {z: [c for c in cands if c['zone'] == z] for z in zones}
    for z in zones:
        rng.shuffle(pool[z])
    # 轮流按禁区取，避免前一个禁区把稀缺角色都吃光
    left = dict(quota)
    while any(left[z] > 0 for z in zones):
        for z in zones:
            if left[z] <= 0 or not pool[z]:
                left[z] = 0 if not pool[z] else left[z]
                continue
            best, bs = None, -1.0
            for i, c in enumerate(pool[z]):
                s = sum(1.0 / (1 + cnt[m['tid']]) ** 2 for m in c['team'])
                if s > bs:
                    best, bs = i, s
            c = pool[z].pop(best)
            for m in c['team']:
                cnt[m['tid']] += 1
            picked.append(c)
            left[z] -= 1
    return picked, cnt


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--n', type=int, default=1000)
    ap.add_argument('--seed', type=int, default=20261103)
    ap.add_argument('--out', default=str(OUT))
    args = ap.parse_args()
    src = Path(args.src)
    D = B.jl(ROOT / 'data/dictionary.json')
    by_id = {k: {str(e['id']) for e in v if e.get('id') is not None} for k, v in D.items() if isinstance(v, list)}
    have_ids, have_uuids = existing_keys(args.out)
    print(f'已有题目 {len(have_ids)} 道（uuid {len(have_uuids)} 个）')
    cands = collect(src, D, by_id)
    fresh, new_ids = [], set()
    for c in cands:
        c['id'] = f"{SEASON}-{c['zone']}-{c['uid'] % 100000}"      # uid 取模 5 位：不同玩家偶尔会撞 id，撞了就只留第一个
        if c['id'] in have_ids or c['id'] in new_ids or c['uuid'] in have_uuids:
            continue
        new_ids.add(c['id'])
        fresh.append(c)
    print(f'符合门槛的候选 {len(cands)}，去掉库里已有的之后剩 {len(fresh)}；按禁区：', dict(sorted(Counter(c['zone'] for c in fresh).items())))
    supply = Counter(m['tid'] for c in fresh for m in c['team'])
    rng = random.Random(args.seed)
    picks, cnt = balanced_pick(fresh, args.n, rng)
    names = {str(e['id']): e.get('zh') or e.get('name') for e in D['awakener']}
    vals = [cnt[t] for t in names if t in supply]
    print(f'选出 {len(picks)} 道；出现的唤醒体 {len([t for t in cnt if cnt[t]])} 个，次数 最少 {min(vals)} / 最多 {max(vals)} / 平均 {sum(vals)/len(vals):.1f}')
    low = sorted(((cnt[t], supply[t], names[t]) for t in names if t in supply))[:6]
    print('最少的几位（选中次数 / 候选里总共出现次数 / 名字）：', low)
    pub = []
    for p in picks:
        uid = p.pop('uid')
        secret = {'team': p['team'], 'key': p['key'], 'relics': p['relics']}
        q = {k: v for k, v in p.items() if k not in secret}
        q['boss'] = []                              # 首领统一由 scripts/fix_boss_map.py 按权威表写
        q['nrel'] = len(p['relics'])
        q['clues'] = [{k: m[k] for k in ('dmg', 'blk', 'heal', 'up', 'tal')} for m in p['team']]
        q['ans'] = B.seal(p['id'], secret)
        q['diff'] = 2
        q['diffScore'] = 0
        pub.append(q)
    Path(args.out).write_text(json.dumps({'seasons': [SEASON], 'extra': True, 'puzzles': pub},
                                         ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('写入', args.out, len(pub), '道')


if __name__ == '__main__':
    main()
