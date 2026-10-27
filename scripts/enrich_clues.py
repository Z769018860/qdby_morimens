#!/usr/bin/env python3
"""给已有题目补「可解锁线索」用的隐藏数据。

题目的答案本来就以 ZJ1 流密钥封在 ans 里（team / key / relics）。这里把战报里另外几项
能当推理线索、但公开展示会毁题的数据补进同一个密文（字段 x）：

    x = {
      pl: 守密人等级,
      as: 借用助战的人数（0-4）,
      bc: 单回合最高出牌数, be: 单回合最高耗能,
      wl: [四个位置里命轮的最高强化等级]   # 与 team 顺序一致；查不到该项时省略
    }

来源都是公开战报摘要（按 battleUuid 对上，覆盖全部题目）+ 队伍快照（用来算命轮强化，
赛季 72 的快照不全，对不上的题就不给这一条）。前端只展示确实有数据的线索，
不会出现「给了假线索」的情况。

用法：
    python3 scripts/enrich_clues.py D:/软件所/morimens/_tmp_qdby
"""
import argparse, base64, gzip, hashlib, json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEPPER = re.search(r"'([0-9a-f]+)'", (ROOT / 'js/pepper.js').read_text(encoding='utf-8')).group(1)
FILES = ['data/puzzles.json', 'data/puzzles-extra.json', 'data/puzzles-more.json']


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def seal(pid, obj):
    raw = ('ZJ1:' + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))).encode()
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        out += bytes(a ^ b for a, b in zip(raw[i:i + 32], ks))
    return base64.b64encode(bytes(out)).decode()


def unseal(pid, b64):
    buf = base64.b64decode(b64)
    out = bytearray(len(buf))
    for i in range(0, len(buf), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        for j, b in enumerate(buf[i:i + 32]):
            out[i + j] = b ^ ks[j]
    txt = bytes(out).decode('utf-8')
    assert txt.startswith('ZJ1:'), pid
    return json.loads(txt[4:])


def summary_index(src, seasons):
    """battleUuid -> 战报摘要（覆盖全部题目）"""
    idx = {}
    for s in seasons:
        f = src / f'{s}-battle-summary.jsonl.gz'
        if not f.exists():
            continue
        with gzip.open(f, 'rt', encoding='utf-8') as fh:
            for line in fh:
                r = json.loads(line)
                idx[r.get('battleUuid')] = r
        print(f'  summary {s}: 累计 {len(idx)} 条')
    return idx


def team_index(src, seasons):
    """battleUuid -> 队伍快照（只用来算命轮强化）。
    快照行里的 rankSignature.battleUuid 和题目的 uuid 同源，比 (uid, 分区) 更准。"""
    idx = {}
    for s in seasons:
        files = sorted(src.glob(f'season{s}-teams-*.jsonl.gz')) + sorted(src.glob(f'{s}-teams-*.jsonl.gz'))
        for f in files:
            with gzip.open(f, 'rt', encoding='utf-8') as fh:
                for line in fh:
                    row = json.loads(line)
                    uuid = (row.get('rankSignature') or {}).get('battleUuid')
                    if not uuid:
                        continue
                    tm = (row.get('response') or {}).get('team') or {}
                    if not tm.get('awakers'):
                        continue
                    idx[uuid] = row
        print(f'  teams {s}: {len(files)} 个分片')
    return idx


def wheel_levels(tm):
    """tid -> [(命轮 tid, 强化等级)]"""
    items = tm.get('items') or {}
    out = {}
    for a in tm.get('awakers') or []:
        ws = a.get('weaponSlots')
        ws = list(ws.values()) if isinstance(ws, dict) else (ws or [])
        seen, lv = set(), []
        for w in ws:
            uid = w.get('weaponUid')
            if uid in seen:
                continue
            seen.add(uid)
            wt = (items.get(str(uid)) or {}).get('tid')
            if wt is None:
                continue
            lv.append((str(wt), int(w.get('level') or 0)))
        out[str(a.get('tid'))] = lv
    return out


def clue_extra(summary, row, team):
    x = {
        'pl': summary.get('playerLevel'),
        'as': sum(1 for a in (summary.get('awakers') or []) if a.get('assist')),
        'bc': summary.get('maxBoutUseCard'),
        'be': summary.get('maxBoutEnergyCost'),
    }
    if row:
        wl_map = wheel_levels((row.get('response') or {}).get('team') or {})
        wl = []
        for m in team:
            levels = wl_map.get(str(m.get('tid')), [])
            got = [lvl for wid, lvl in levels if wid in (m.get('wheels') or [])]
            wl.append(max(got) if got else None)
        if any(v is not None for v in wl):
            x['wl'] = wl
    return {k: v for k, v in x.items() if v is not None}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--seasons', nargs='*', type=int, default=[71, 72])
    args = ap.parse_args()
    src = Path(args.src)

    print('建索引…')
    sums = summary_index(src, args.seasons)
    teams = team_index(src, args.seasons)

    total = hit = with_wl = 0
    for rel in FILES:
        p = ROOT / rel
        doc = jl(p)
        n = 0
        for q in doc['puzzles']:
            total += 1
            s = sums.get(q.get('uuid'))
            if not s:
                continue
            row = teams.get(q.get('uuid'))
            ans = unseal(q['id'], q['ans'])
            x = clue_extra(s, row, ans.get('team') or [])
            if 'wl' in x:
                with_wl += 1
            ans['x'] = x
            q['ans'] = seal(q['id'], ans)
            hit += 1
            n += 1
        p.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{rel}: 补充 {n}/{len(doc["puzzles"])} 题')
    print(f'合计 {hit}/{total} 题带隐藏线索，其中 {with_wl} 题带命轮强化')


if __name__ == '__main__':
    main()
