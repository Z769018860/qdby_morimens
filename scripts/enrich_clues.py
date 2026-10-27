#!/usr/bin/env python3
"""给已有题目补「可解锁线索」用的隐藏数据。

题目的答案本来就以 ZJ1 流密钥封在 ans 里（team / key / relics）。这里把战报里另外几项
能当推理线索、但公开展示会毁题的数据补进同一个密文（字段 x）：

    x = {
      pl: 守密人等级,
      as: 借用助战的人数（0-4）,
      bc: 单回合最高出牌数, be: 单回合最高耗能,
      wl: [四个位置里命轮的最高强化等级]   # 与 team 顺序一致；查不到该项时省略
      dk: {n 牌组张数, cur 症状卡, ext 衍生卡, whl 命轮塞进牌组的附加卡}
      inn: [固有造物 id]                  # 融灾开局自带的「第一个造物 + 戒指」
    }

来源都是公开战报摘要（按 battleUuid 对上，覆盖全部题目）+ 队伍快照（用来算命轮强化、
牌组构成与固有造物，赛季 72 的快照不全，对不上的题就不给这一条）。前端只展示确实
有数据的线索，不会出现「给了假线索」的情况。

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


def equipped_wheels(tm):
    """这一局实际带上的命轮 tid（去重；同一件命轮挂两处只算一次）"""
    items = tm.get('items') or {}
    out = []
    for a in tm.get('awakers') or []:
        ws = a.get('weaponSlots')
        ws = list(ws.values()) if isinstance(ws, dict) else (ws or [])
        for w in ws:
            wt = (items.get(str(w.get('weaponUid'))) or {}).get('tid')
            if wt is not None and str(wt) not in out:
                out.append(str(wt))
    return out


# ---------------------------------------------------------------- 牌组 / 固有造物
CARD_TYPES = jl(ROOT / 'data/card-types.json')
DICT = jl(ROOT / 'data/dictionary.json')
CREATION = {str(c['id']) for c in DICT['creation']}
# 融灾每期换一枚戒指：深海 / 血肉 / 混沌 / 超维，都是开局自带、不能换掉的
RING_IDS = {str(c['id']) for c in DICT['creation'] if (c.get('zh') or '').endswith('戒指')}
KW_MARK = re.compile(r'⟦[^|⟦]*\|([^⟦]*)⟧')


def wheel_deck_cards():
    """命轮 tid -> 它往牌组里塞了几张卡（「探索开始时，将 1 张 XX 加入牌组」）"""
    out = {}
    cn = {'一': 1, '两': 2, '二': 2, '三': 3}
    for w in DICT['wheel']:
        txt = KW_MARK.sub(r'\1', ' '.join(d.get('t') or '' for d in (w.get('desc') or [])))
        n = 0
        for m in re.finditer(r'将(.{1,80}?)加入牌组', txt):
            for part in re.split(r'[与和、，,]', m.group(1)):
                q = re.search(r'(\d+|[一二两])\s*张', part)
                if q:
                    n += int(q.group(1)) if q.group(1).isdigit() else cn.get(q.group(1), 1)
        if n:
            out[str(w['id'])] = n
    return out


WHEEL_CARDS = wheel_deck_cards()


def innate_of(relics):
    """融灾的固有造物＝第一个造物 + 戒指。戒指固定在第 2 件；万一那件是别的造物，
    而真正的戒指被塞在后面（卖过造物的队伍），也会把认得出的戒指找出来。"""
    rels = [str(r) for r in (relics or [])]
    if not rels:
        return []
    out = [rels[0]]
    if len(rels) > 1:
        second = rels[1]
        # 戒指可能是 wiki 才有 id 的那两款（深海 / 超维），字典里查不到 → 位置兜底
        if second in RING_IDS or second not in CREATION:
            out.append(second)
    for r in rels[1:]:
        if r in RING_IDS and r not in out:
            out.append(r)
    return out


def deck_clue(tm):
    """牌组构成：总数 / 症状卡 / 衍生卡 / 命轮塞进来的附加卡"""
    cards = [str(c['tid']) for c in (((tm.get('recordStageData') or {}).get('cards')) or [])]
    if not cards:
        return None
    dk = {'n': len(cards)}
    types = [CARD_TYPES.get(t) for t in cards]
    # 有认不出的卡就不报分类，免得给出错的件数；总数照样能报
    if all(types):
        dk['cur'] = sum(1 for t in types if t == 'curse')
        dk['ext'] = sum(1 for t in types if t == 'extend')
    whls = equipped_wheels(tm)
    if whls:
        # 0 也是有用的信息（说明这套命轮没有往牌组里塞卡），照常报
        dk['whl'] = sum(WHEEL_CARDS.get(w, 0) for w in whls)
    return dk


def clue_extra(summary, row, team):
    x = {
        'pl': summary.get('playerLevel'),
        'as': sum(1 for a in (summary.get('awakers') or []) if a.get('assist')),
        'bc': summary.get('maxBoutUseCard'),
        'be': summary.get('maxBoutEnergyCost'),
    }
    if row:
        trow = (row.get('response') or {}).get('team') or {}
        wl_map = wheel_levels(trow)
        wl = []
        for m in team:
            levels = wl_map.get(str(m.get('tid')), [])
            got = [lvl for wid, lvl in levels if wid in (m.get('wheels') or [])]
            wl.append(max(got) if got else None)
        if any(v is not None for v in wl):
            x['wl'] = wl
        dk = deck_clue(trow)
        if dk:
            x['dk'] = dk
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

    total = hit = with_wl = with_dk = with_inn = 0
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
            if 'dk' in x:
                with_dk += 1
            ans['x'] = x
            # 固有造物跟着答案走（题面要直接给出来），不进线索
            inn = innate_of(ans.get('relics') or [])
            if inn:
                ans['inn'] = inn
                with_inn += 1
            else:
                ans.pop('inn', None)
            q['ans'] = seal(q['id'], ans)
            hit += 1
            n += 1
        p.write_text(json.dumps(doc, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(f'{rel}: 补充 {n}/{len(doc["puzzles"])} 题')
    print(f'合计 {hit}/{total} 题带隐藏线索，其中 {with_wl} 题带命轮强化、'
          f'{with_dk} 题带牌组构成、{with_inn} 题标出固有造物')


if __name__ == '__main__':
    main()
