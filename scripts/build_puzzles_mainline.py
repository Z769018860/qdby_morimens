#!/usr/bin/env python3
"""主线战报 -> 第 73 期题库（data/puzzles-mainline.json）。

数据来源：scripts/fetch_mainline_replays.mjs 抓下来的回放明细（jsonl）。
筛选口径（用户确认）：
  * 应急灵知体（Emergency Gnosis）用量 = 回放 `respawnedNum`，只保留 0 的场次；
  * 助战保留，不过滤；
  * 4 名唤飧体互不相同，每人伤害/承伤/治疗至少有一项非零，总伤害 > 0；
  * 钥令、造物合法。
选题目的是和 70~72 期一起做「唤醒体出场次数尽量平均」的联合优化，
所以本脚本直接复用 build_puzzles_balanced.select()，只是把 73 期的格子塞进同一个池子。
"""
import argparse, json, os, pickle, sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_puzzles_balanced as B


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def threat_of(lv):
    if lv is None:
        return 'A'
    if lv >= 76:
        return 'SS'
    if lv >= 70:
        return 'S'
    if lv >= 60:
        return 'A'
    return 'B'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--replays', default='H:/work/tmp/ml-replays.jsonl')
    ap.add_argument('--total', type=int, default=1000, help='第 73 期总题数')
    ap.add_argument('--min-zone', type=int, default=60, help='每个章节至少多少题')
    ap.add_argument('--iters', type=int, default=80000)
    ap.add_argument('--max-dup', type=int, default=6)
    ap.add_argument('--only-mainline', action='store_true', help='只重建 73 期，不动 70~72 期')
    args = ap.parse_args()

    D = jl(B.ROOT / 'data/dictionary.json')
    by_id = {k: {str(e['id']) for e in v if e.get('id') is not None} for k, v in D.items() if isinstance(v, list)}

    ml = defaultdict(list)
    stat = Counter()
    with open(args.replays, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            r = json.loads(line)
            stat['总'] += 1
            if (r.get('respawned') or 0) != 0:
                stat['用了应急灵知体'] += 1
                continue
            roles = r.get('roles') or []
            tids = [str(x['tid']) for x in roles]
            if len(tids) != 4 or len(set(tids)) != 4:
                stat['队伍不是4人'] += 1
                continue
            if any(t not in by_id['awakener'] for t in tids):
                stat['唤醒体不在词表'] += 1
                continue
            if str(r.get('keeperSkill')) not in by_id['key']:
                stat['钥令无效'] += 1
                continue
            relics = [str(x) for x in (r.get('relics') or []) if str(x) in by_id['creation']]
            if not relics:
                stat['没有造物'] += 1
                continue
            if sum(x.get('dmg') or 0 for x in roles) <= 0:
                stat['伤害为0'] += 1
                continue
            if not all((x.get('dmg') or 0) + (x.get('blk') or 0) + (x.get('heal') or 0) > 0 for x in roles):
                stat['有人三项全0'] += 1
                continue
            if not (r.get('bouts') or 0):
                stat['回合数缺失'] += 1
                continue

            members = [{
                'tid': str(x['tid']), 'lv': x.get('lv'), 'brk': x.get('brk'), 'pot': x.get('pot'),
                'wheels': [], 'cov': None,
                'dmg': x.get('dmg') or 0, 'blk': x.get('blk') or 0, 'heal': x.get('heal') or 0,
            } for x in roles]
            members.sort(key=lambda m: (-m['dmg'], -m['blk'], -m['heal']))
            zone = int(r.get('chapter') or 0)
            ml[zone].append({
                'season': 73, 'zone': zone, 'kind': 'mainline',
                'threat': threat_of(r.get('recLevel')),
                'madness': None, 'boss': [],
                'campaign': r.get('campaign'), 'stageName': r.get('displayName'),
                'stageNo': r.get('stage'), 'recLevel': r.get('recLevel'),
                'score': None, 'rank': None,
                'rounds': r.get('bouts'), 'bossRounds': 0,
                'cards': r.get('cards'), 'energy': r.get('energy'),
                'maxBout': None, 'deathResist': r.get('deathResist') or 0,
                'hp': None, 'left': None,
                'playerDmg': 0, 'key': str(r.get('keeperSkill')), 'relics': relics,
                'team': members, 'uuid': r.get('uuid'), 'extra': False,
                'keyUses': r.get('keyUses'),
                'dmgComp': {},
                'sig': tuple(sorted(m['tid'] for m in members)),
            })
            stat['可用'] += 1

    print('回放明细统计：', dict(stat))
    for z in sorted(ml):
        print(f'  章节 {z}: 候选 {len(ml[z])}')
    if stat['可用'] < args.total:
        raise SystemExit(f'可用场次 {stat["可用"]} 少于目标题量 {args.total}')

    # 按候选量比例分配题数，每章节保底 min-zone
    zones = sorted(ml)
    tot = sum(len(ml[z]) for z in zones)
    quota = {z: max(args.min_zone, round(args.total * len(ml[z]) / tot)) for z in zones}
    # 修正总数
    while sum(quota.values()) > args.total:
        z = max(quota, key=lambda k: quota[k])
        quota[z] -= 1
    while sum(quota.values()) < args.total:
        z = max(quota, key=lambda k: len(ml[k]))
        quota[z] += 1
    print('第 73 期配额：', quota, '合计', sum(quota.values()))

    pool73 = {(73, z): ml[z] for z in zones}
    B.QUOTA[73] = quota
    for fname, spec in B.SPLIT.items():
        pass
    B.SPLIT['puzzles-mainline.json'] = {(73, z): quota[z] for z in zones}

    if args.only_mainline:
        # 只平衡 73 期内部（70~72 期已定稿时用）
        pool = pool73
        B.QUOTA = {73: quota}
        B.SPLIT = {'puzzles-mainline.json': {(73, z): quota[z] for z in zones}}
    else:
        cache = Path(os.environ.get('TEMP', '.')) / 'dz-pool.pkl'
        if not cache.exists():
            raise SystemExit(f'缺融灾候选池缓存 {cache}，先跑 build_puzzles_balanced.py --rebuild')
        pool = pickle.load(open(cache, 'rb'))
        pool.update(pool73)
        print(f'联合优化：融灾 {sum(len(v) for k, v in pool.items() if k[0] != 73)} + 主线 {sum(len(v) for k, v in pool.items() if k[0] == 73)} 个候选')

    by_cell, cnt = B.select(pool, max_dup=args.max_dup, iters=args.iters, seed=20261031)
    written = B.emit(by_cell, B.ROOT / 'data')
    print('写入：', written)

    names = {x['id'].replace('a-', ''): x['n'] for x in jl(B.ROOT / 'data/avatars.json')['items']}
    vals = sorted(cnt.values())
    print(f'\n=== 全库唤醒体分布 === min={vals[0]} max={vals[-1]} 均值={sum(vals)/len(vals):.0f} 唤醒体 {len(vals)}')
    for t, c in cnt.most_common()[::-1][:5]:
        print(f'  最少 {names.get(t, t):<8}{c}')
    for t, c in cnt.most_common(5):
        print(f'  最多 {names.get(t, t):<8}{c}')


if __name__ == '__main__':
    main()
