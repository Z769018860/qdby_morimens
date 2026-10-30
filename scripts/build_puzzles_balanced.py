#!/usr/bin/env python3
"""重构题库：从 qdby_chinese 的全量融灾配队里重新选题。

和 build_puzzles_more.py 的关系：
  * 数据源换了：直接用 qdby_chinese 的 data/morimens/dzone/season{70,71,72}/
    （battle-summary.jsonl.gz + raw-teams/teams-*.jsonl.gz + id-names.json + meta.json）。
  * 选题换成「唤醒体出场次数尽量平均」的启发式：
    目标函数 sum(count_tid^2) 最小，等价于让 62 个唤醒体的出现次数方差最小；
    可用场次少的那几个（尤乌哈希、莉兹…）会被优先吃满，出场率高的（沙耶、诞妄·墨菲…）被压下来。
  * 排除用了应急灵知体（battle-summary 里 awakers[].assist == true）的场次。
  * 同一套配队（4 个 tid 完全相同）最多选 --max-dup 次，避免配队固化。

用法：
    python3 scripts/build_puzzles_balanced.py --dry          # 只看候选池与上限
    python3 scripts/build_puzzles_balanced.py                # 生成四个 puzzles*.json
    python3 scripts/build_puzzles_balanced.py --iters 400000 # 加长局部搜索
"""
import argparse, base64, gzip, hashlib, json, os, pickle, random, re, sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PEPPER = re.search(r"'([0-9a-f]+)'", (ROOT / 'js/pepper.js').read_text(encoding='utf-8')).group(1)
DEFAULT_SRC = r'H:/work/tmp/qdby_chinese/data/morimens/dzone'
EXCLUDE_ASSIST = False   # 助战阵容：按用户口径保留

# 每期每区要出多少题（沿用现有四个文件的分布，总量不变）
QUOTA = {
    70: {1: 200, 2: 200, 3: 200, 4: 200, 5: 200},                 # -> puzzles-70.json
    71: {z: 520 for z in (1, 2, 3, 4, 5)},                        # -> core 100 + extra 100 + more 320
    72: {1: 300, 2: 300, 3: 300, 4: 300, 5: 301},                 # -> core 100 + extra 100 + more 100/101
}
# 每个文件从各 (期,区) 抽多少题
SPLIT = {
    'puzzles.json':       {(71, z): 100 for z in (1, 2, 3, 4, 5)} | {(72, z): 100 for z in (1, 2, 3, 4, 5)},
    'puzzles-extra.json': {(71, z): 100 for z in (1, 2, 3, 4, 5)} | {(72, z): 100 for z in (1, 2, 3, 4, 5)},
    'puzzles-more.json':  {(71, z): 320 for z in (1, 2, 3, 4, 5)} |
                          {(72, 1): 100, (72, 2): 100, (72, 3): 100, (72, 4): 100, (72, 5): 101},
    'puzzles-70.json':    {(70, z): 200 for z in (1, 2, 3, 4, 5)},
}

FIXED_BOSS = {
    (70, 1): ['14015'], (70, 2): ['14011'], (70, 3): ['140713'], (70, 4): ['147675'], (70, 5): ['125901'],
    (71, 1): ['80576', '80577'], (71, 2): ['94940'], (71, 3): ['67103'], (71, 4): ['14063'], (71, 5): ['81279'],
    (72, 1): ['14008', '14013'], (72, 2): ['14064'], (72, 3): ['60096'],
    (72, 4): ['120308', '120310', '120306'], (72, 5): ['14086'],
}


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


def build_pool(src, by_id, top_n_per_zone=None):
    """返回 {(season, zone): [candidate, ...]}"""
    pool = defaultdict(list)
    for season in sorted(QUOTA):
        sdir = os.path.join(src, f'season{season}')
        meta = jl(os.path.join(sdir, 'meta.json'))
        ids = jl(os.path.join(sdir, 'id-names.json'))
        groups = sorted(meta['stageGroupIds'])
        bs = {}
        with gzip.open(os.path.join(sdir, 'battle-summary.jsonl.gz'), 'rt', encoding='utf-8') as f:
            for line in f:
                r = json.loads(line)
                bs[r['battleUuid']] = r

        seen = set()
        for fn in sorted(os.listdir(os.path.join(sdir, 'raw-teams'))):
            with gzip.open(os.path.join(sdir, 'raw-teams', fn), 'rt', encoding='utf-8') as f:
                for line in f:
                    row = json.loads(line)
                    tm = (row.get('response') or {}).get('team') or {}
                    rs = tm.get('recordStageData') or {}
                    bu = rs.get('battleUuid')
                    b = bs.get(bu)
                    if not b or not tm.get('awakers') or not isinstance(tm.get('items'), dict):
                        continue
                    gid = row.get('stageGroupId')
                    if gid not in groups:
                        continue
                    zone = groups.index(gid) + 1
                    # 只用「首通」那一行，避免同一玩家同区重复
                    k = (row['uid'], zone)
                    if k in seen:
                        continue
                    seen.add(k)
                    # 应急灵知体（Emergency Gnosis）在融灾不可使用，respawnedNum 恒为 0；
                    # 助战（battle-summary 的 assist=true，借他人唤醒体）按用户要求保留。
                    if EXCLUDE_ASSIST and any(x.get('assist') for x in (b.get('awakers') or [])):
                        continue
                    if len(tm['awakers']) != 4:
                        continue

                    items = tm['items']
                    members, ok = [], True
                    for a in tm['awakers']:
                        tid = str(a['tid'])
                        if tid not in by_id['awakener']:
                            ok = False
                            break
                        ws = a.get('weaponSlots')
                        ws = list(ws.values()) if isinstance(ws, dict) else (ws or [])
                        wheels = []
                        for w in sorted(ws, key=lambda w: w.get('slot', 0)):
                            t = (items.get(str(w.get('weaponUid'))) or {}).get('tid')
                            if t is not None and str(t) in by_id['wheel']:
                                wheels.append(str(t))
                        suits = Counter((items.get(str(x)) or {}).get('suitId') for x in a.get('trinkets') or [])
                        suit, cnt = suits.most_common(1)[0] if suits else (None, 0)
                        cov = str(suit) if suit is not None and str(suit) in by_id['covenant'] and cnt >= 3 else None
                        bd = next((x for x in b['awakers'] if str(x['tid']) == tid), None)
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
                    # 质量门槛：命轮/密契齐全、伤害非零（与旧脚本一致）
                    if not (sum(m['dmg'] for m in members) > 0
                            and all((m['dmg'] + m['blk'] + m['heal']) > 0 for m in members)
                            and all(m['wheels'] and m['cov'] for m in members)):
                        continue

                    stage = ids['stages'].get(str(b['stageTid']), {})
                    sm = re.search(r'Zone (\d): (?:Threat Level )?(\S+)', stage.get('name', '') or '')
                    members.sort(key=lambda x: (-x['dmg'], -x['blk'], -x['heal']))
                    pool[(season, zone)].append({
                        'season': season, 'zone': zone,
                        'threat': sm.group(2) if sm else '?',
                        'madness': stage.get('madness'),
                        'boss': FIXED_BOSS.get((season, zone), []),
                        'score': b['score'], 'rank': b['rank'],
                        'rounds': b['stageRoundCount'], 'bossRounds': b['bossBattleRoundCount'],
                        'cards': b['totalUseCard'], 'energy': b['totalEnergyCost'],
                        'maxBout': b['maxBoutDamage'], 'deathResist': b['deathResistCount'],
                        'hp': b['maxHp'], 'left': b['leftHp'],
                        'playerDmg': b.get('playerDamage') or 0,
                        'key': key, 'relics': [str(x) for x in b.get('relics', []) if str(x) in by_id['creation']],
                        'team': members, 'uuid': bu, 'extra': bool(b.get('extraPass')),
                        'dmgComp': {
                            'keeper': b.get('playerDamage') or 0,
                            'tentacle': b.get('maxTentacleDamage') or 0,
                            'counter': b.get('maxCounterAtt') or 0,
                            'strength': b.get('maxStrength') or 0,
                            'poison': b.get('maxPosion') or 0,
                        },
                        'sig': tuple(sorted(m['tid'] for m in members)),
                    })
        print(f'  season{season}: 候选 ' + ', '.join(f'区{z} {len(pool[(season, z)])}' for z in sorted(QUOTA[season])))
    return pool


def select(pool, max_dup=6, iters=200000, seed=20261030, verbose=True):
    """按 (期,区) 配额选题，目标 sum(count_tid^2) 最小。"""
    rng = random.Random(seed)
    need = {(s, z): QUOTA[s][z] for s in QUOTA for z in QUOTA[s]}
    for k, v in need.items():
        if len(pool.get(k, [])) < v:
            raise SystemExit(f'候选不足：{k} 需要 {v}，只有 {len(pool.get(k, []))}')

    cnt = Counter()
    dup = Counter()
    chosen = []            # list of candidate dicts
    chosen_set = set()     # id() 或 uuid
    by_cell = defaultdict(list)

    # 1) 贪心：轮转各 (期,区)，每次在小样本里挑让 sum(count^2) 增量最小的
    order = [k for k in need]
    filled = Counter()
    while len(chosen) < sum(need.values()):
        for k in order:
            if filled[k] >= need[k]:
                continue
            cands = pool[k]
            best, best_cost = None, None
            for _ in range(240):
                c = cands[rng.randrange(len(cands))]
                if c['uuid'] in chosen_set or dup[c['sig']] >= max_dup:
                    continue
                cost = sum(2 * cnt[t] + 1 for t in c['sig'])
                if best_cost is None or cost < best_cost:
                    best, best_cost = c, cost
            if best is None:      # 兜底：放宽 dup 限制
                for _ in range(2000):
                    c = cands[rng.randrange(len(cands))]
                    if c['uuid'] not in chosen_set:
                        best = c
                        break
            if best is None:
                raise SystemExit(f'{k} 选不出来')
            chosen.append(best); chosen_set.add(best['uuid'])
            by_cell[k].append(best)
            for t in best['sig']:
                cnt[t] += 1
            dup[best['sig']] += 1
            filled[k] += 1

    def cost_of(team_sig, delta):
        return sum((cnt[t] + delta) ** 2 - cnt[t] ** 2 for t in team_sig)

    def team_cost(sig):
        return sum(2 * cnt[t] for t in sig)

    # 2) 修复回合：专治「最多」的那些唤醒体——把含它们的题换成更省的候选
    cells = list(need)
    for rnd in range(80):
        over = [t for t, _ in cnt.most_common(4)]
        changed = 0
        for t in over:
            for k in cells:
                lst = by_cell[k]
                for i, cur in enumerate(lst):
                    if t not in cur['sig']:
                        continue
                    cands = pool[k]
                    best, best_d = None, 0
                    cur_cost = team_cost(cur['sig'])
                    for _ in range(400):
                        c = cands[rng.randrange(len(cands))]
                        if c['uuid'] in chosen_set:
                            continue
                        if dup[c['sig']] >= max_dup:
                            continue
                        if t in c['sig']:
                            continue
                        d = team_cost(c['sig']) - cur_cost
                        if d < best_d:
                            best, best_d = c, d
                    if best is not None and best_d < 0:
                        for x in cur['sig']:
                            cnt[x] -= 1
                        dup[cur['sig']] -= 1
                        for x in best['sig']:
                            cnt[x] += 1
                        dup[best['sig']] += 1
                        chosen_set.discard(cur['uuid']); chosen_set.add(best['uuid'])
                        lst[i] = best
                        changed += 1
        if verbose:
            vals = sorted(cnt.values())
            print(f'    修复第 {rnd + 1} 轮：改动 {changed}，min={vals[0]} max={vals[-1]}')
        if not changed:
            break

    if verbose:
        vals = sorted(cnt.values())
        print(f'  最终 62 个唤醒体出场次数 min={vals[0]} max={vals[-1]} '
              f'中位={vals[len(vals)//2]} 均值={sum(vals)/len(vals):.0f}')
    return by_cell, cnt


def emit(by_cell, out_dir):
    """按 SPLIT 把选题分到四个文件，封装答案。"""
    idx = {k: list(v) for k, v in by_cell.items()}
    for k in idx:
        idx[k].sort(key=lambda c: (-(c.get('score') or 0), c.get('rank') or 0))
    take = defaultdict(int)
    written = {}
    used_ids = set()
    import zlib
    for fname, quotas in SPLIT.items():
        pubs = []
        for (s, z), n in sorted(quotas.items()):
            lst = idx[(s, z)]
            for c in lst[take[(s, z)]: take[(s, z)] + n]:
                secret = {'team': c['team'], 'key': c['key'], 'relics': c['relics']}
                q = {k: v for k, v in c.items() if k not in secret and k != 'sig'}
                # 短 id：和旧题一样是 season-zone-数字，控制 bank/index.json 体积
                base = zlib.crc32(str(c['uuid']).encode()) % 1000000
                nid = f'{s}-{z}-{base}'
                while nid in used_ids:
                    base = (base + 1) % 1000000
                    nid = f'{s}-{z}-{base}'
                used_ids.add(nid)
                q['id'] = nid
                q['nrel'] = len(c['relics'])
                q['clues'] = [{k: m[k] for k in ('dmg', 'blk', 'heal', 'up', 'tal') if m.get(k) is not None}
                              for m in c['team']]
                if c.get('kind'):
                    q['kind'] = c['kind']
                q['ans'] = seal(q['id'], secret)
                q['diff'] = 2
                q['diffScore'] = 0
                pubs.append(q)
            take[(s, z)] += n
        seasons = sorted({p['season'] for p in pubs})
        data = {'seasons': seasons, 'extra': True, 'puzzles': pubs}
        if fname == 'puzzles.json':
            ex = ['data/puzzles-extra.json', 'data/puzzles-more.json', 'data/puzzles-70.json']
            if (ROOT / 'data' / 'puzzles-mainline.json').exists() or 'puzzles-mainline.json' in SPLIT:
                ex.append('data/puzzles-mainline.json')
            data['extraFiles'] = ex
        (out_dir / fname).write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        written[fname] = len(pubs)
    return written


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=DEFAULT_SRC)
    ap.add_argument('--cache', default=str(Path(os.environ.get('TEMP', '.')) / 'dz-pool.pkl'))
    ap.add_argument('--max-dup', type=int, default=6)
    ap.add_argument('--iters', type=int, default=200000)
    ap.add_argument('--seed', type=int, default=20261030)
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--rebuild', action='store_true', help='忽略缓存重建候选池')
    args = ap.parse_args()

    D = jl(ROOT / 'data/dictionary.json')
    by_id = {k: {str(e['id']) for e in v if e.get('id') is not None} for k, v in D.items() if isinstance(v, list)}

    cache = Path(args.cache)
    if cache.exists() and not args.rebuild:
        pool = pickle.load(open(cache, 'rb'))
        print(f'候选池来自缓存 {cache}')
    else:
        print('构建候选池…')
        pool = build_pool(args.src, by_id)
        pickle.dump(pool, open(cache, 'wb'))
        print(f'候选池已缓存到 {cache}')

    caps = Counter()
    for k, lst in pool.items():
        for c in lst:
            for t in c['sig']:
                caps[t] += 1
    total_need = sum(sum(v.values()) for v in QUOTA.values())
    print(f'缺口总量 {total_need} 题 = {total_need*4} 个出场位；可用 {len(caps)} 个唤醒体')
    print('可用上限最低的 8 个：', [(t, caps[t]) for t, _ in caps.most_common()[::-1][:8]])
    if args.dry:
        avg = total_need * 4 / len(caps)
        print(f'理论均值 {avg:.0f} 次/唤醒体；受上限约束的：',
              [(t, caps[t]) for t, c in caps.items() if c < avg])
        return

    by_cell, cnt = select(pool, max_dup=args.max_dup, iters=args.iters, seed=args.seed)
    written = emit(by_cell, ROOT / 'data')
    print('写入：', written)

    names = {x['id'].replace('a-', ''): x['n'] for x in jl(ROOT / 'data/avatars.json')['items']}
    vals = sorted(cnt.values())
    print(f'\n=== 最终分布 ===\n  次数 min={vals[0]} max={vals[-1]} 均值={sum(vals)/len(vals):.0f}')
    for t, c in cnt.most_common()[::-1][:6]:
        print(f'  最少 {names.get(t, t):<8}{c}')
    for t, c in cnt.most_common(6):
        print(f'  最多 {names.get(t, t):<8}{c}')


if __name__ == '__main__':
    main()
