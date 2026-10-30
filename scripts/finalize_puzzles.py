#!/usr/bin/env python3
"""统一收尾题库：难度分 + 偏好筛选分桶 + 结构审计。

  python3 scripts/finalize_puzzles.py            # 写回两个文件并打印审计
  python3 scripts/finalize_puzzles.py --dry      # 只打印审计，不写文件

做三件事：
 1. 把 core（data/puzzles.json）与 extra（data/puzzles-extra.json）放在一起算难度，
    这样两个文件的「难度分 / 星级」是可比的（分位按全体算）。
 2. 给每题写 `bk`：4 个成员唤醒体 id 的 128 桶哈希。前端「只看偏好唤醒体」用它做
    零解密筛选（约 3% 假阳性，换来瞬时响应）。
 3. 结构审计：每题的队伍/命轮/密契/钥令/造物/回放是否自洽，按赛季和难度档统计。
"""
import argparse, base64, hashlib, json, math, re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORE = ROOT / 'data' / 'puzzles.json'
EXTRA = ROOT / 'data' / 'puzzles-extra.json'
MORE = ROOT / 'data' / 'puzzles-more.json'
S70 = ROOT / 'data' / 'puzzles-70.json'
SML = ROOT / 'data' / 'puzzles-mainline.json'
PEPPER = re.search(r"'([0-9a-f]+)'", (ROOT / 'js/pepper.js').read_text(encoding='utf-8')).group(1)
BUCKETS = 128


def jl(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


def unseal(p):
    raw = base64.b64decode(p['ans'])
    out = bytearray(len(raw))
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{p["id"]}|{i // 32}'.encode()).digest()
        for j in range(32):
            if i + j < len(raw):
                out[i + j] = raw[i + j] ^ ks[j]
    txt = bytes(out).decode()
    assert txt.startswith('ZJ1:'), p['id']
    return json.loads(txt[4:])


def seal(pid, obj):
    raw = ('ZJ1:' + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))).encode()
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        for j in range(32):
            if i + j < len(raw):
                out.append(raw[i + j] ^ ks[j])
    return base64.b64encode(bytes(out)).decode()


# 锈蚀钥匙（造物 13829）是主线开门用的道具，不算配装造物：从答案里摘掉，件数同步改。
# 前端 js/game.js 的 NON_RELIC_IDS 保持同一份名单。
DROP_RELICS = {'13829'}


def strip_relics(ps):
    """把 DROP_RELICS 里的道具从答案造物里摘掉（幂等）。返回改动题数。"""
    n = 0
    for p in ps:
        try:
            s = unseal(p)
        except Exception:
            continue
        rel = [str(r) for r in (s.get('relics') or [])]
        keep = [r for r in rel if r not in DROP_RELICS]
        if len(keep) == len(rel):
            continue
        s['relics'] = keep
        p['ans'] = seal(p['id'], s)
        p['nrel'] = len(keep)
        n += 1
    return n


def fnv(s):
    h = 2166136261
    for b in s.encode('utf-8'):
        h ^= b
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def bucket_of(tid):
    """与 js/account.js / js/game.js 里的 favBucket() 完全一致"""
    return fnv(str(tid) + '|ZJTT') % BUCKETS


def sig_of(p):
    b = lambda v, step: -1 if v is None else int(v // step)
    left = (p.get('left') or 0) / max(p.get('hp') or 1, 1)
    return (b(p.get('rounds'), 5), b(p.get('cards'), 20), b(p.get('energy'), 10),
            b(p.get('maxBout'), 200000), b(p.get('deathResist'), 1), b(left, 0.25))


def score(ps):
    """同 scripts/score_difficulty.py 的口径，但按全体（core+extra）分位切档"""
    sig = Counter(sig_of(p) for p in ps)
    maxk = max(math.log2(v + 1) for v in sig.values()) or 1
    for p in ps:
        info = math.log2(sig[sig_of(p)] + 1)
        # Measured combat extrema have incompatible units; use measured party damage shares.
        vals = [max(0, float(a.get('dmg') or 0)) for a in (p.get('clues') or [])]
        tot = sum(vals)
        if tot > 0 and len(vals) > 1:
            hs = -sum((v / tot) * math.log(v / tot) for v in vals if v > 0)
            spread = hs / math.log(len(vals))
        else:
            spread = 0.0
        r, c = p.get('rounds') or 0, p.get('cards') or 0
        peel = (0.5 if r and r % 5 == 0 else 0) + (0.5 if c and c % 10 == 0 else 0)
        s = 100 * (0.60 * (info / maxk) + 0.25 * spread + 0.15 * peel)
        p['diffScore'] = round(s, 1)
        p['diffWhy'] = {'info': round(info / maxk, 3), 'spread': round(spread, 3), 'peel': round(peel, 3)}
    order = sorted(ps, key=lambda x: x['diffScore'])
    n = len(order)
    for i, p in enumerate(order):
        q = i / n
        p['diff'] = 1 if q < 0.28 else 2 if q < 0.56 else 3 if q < 0.82 else 4
    return sig, maxk


def audit(ps, dict_):
    errs = []
    ids = set(dict_.keys())
    by = {k: {str(e['id']) for e in v if e.get('id') is not None}
          for k, v in dict_.items() if isinstance(v, list)}
    seen = set()
    for p in ps:
        tag = p.get('id')
        if tag in seen:
            errs.append(f'{tag}: 重复 id')
        seen.add(tag)
        try:
            s = unseal(p)
        except Exception as e:
            errs.append(f'{tag}: 解封失败 {e}')
            continue
        team = s.get('team') or []
        if len(team) != 4:
            errs.append(f'{tag}: 队伍人数 {len(team)}')
        tids = [str(a.get('tid')) for a in team]
        if len(set(tids)) != 4:
            errs.append(f'{tag}: 队员重复 {tids}')
        for a in team:
            if str(a.get('tid')) not in by['awakener']:
                errs.append(f'{tag}: 未知唤醒体 {a.get("tid")}')
            # 真实战报里偶尔只带 1 件命轮，这种题要求「第二格留空」，判分已支持
            if p.get('kind') != 'mainline' and not (a.get('wheels') and 1 <= len(a['wheels']) <= 2):
                errs.append(f'{tag}: 命轮数量异常 {tids}')
            if p.get('kind') != 'mainline' and not a.get('cov'):
                errs.append(f'{tag}: 缺密契')
            if a.get('lv') is None or a.get('pot') is None:
                errs.append(f'{tag}: 缺等级/灵塑')
        if str(s.get('key')) not in by['key']:
            errs.append(f'{tag}: 钥令未知 {s.get("key")}')
        rel = s.get('relics') or []
        if not (0 <= len(rel) <= 18):
            errs.append(f'{tag}: 造物数量 {len(rel)}')
        if any(str(r) not in by['creation'] for r in rel):
            errs.append(f'{tag}: 造物未知 {rel}')
        if p.get('nrel') != len(rel):
            errs.append(f'{tag}: nrel 与答案不一致')
        if not p.get('uuid'):
            errs.append(f'{tag}: 缺回放 uuid')
        if len(p.get('bk') or []) != 4:
            errs.append(f'{tag}: 分桶缺失')
        if not (p.get('clues') and len(p['clues']) == 4):
            errs.append(f'{tag}: 公开线索不是 4 条')
    return errs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry', action='store_true')
    args = ap.parse_args()

    core = jl(CORE)
    extra = jl(EXTRA) if EXTRA.exists() else {'seasons': core['seasons'], 'puzzles': []}
    more = jl(MORE) if MORE.exists() else {'seasons': core['seasons'], 'puzzles': []}
    p70 = jl(S70) if S70.exists() else {'seasons': [70], 'puzzles': []}
    pml = jl(SML) if SML.exists() else {'seasons': [73], 'puzzles': []}
    ps = core['puzzles'] + extra['puzzles'] + more['puzzles'] + p70['puzzles'] + pml['puzzles']
    print(f'core {len(core["puzzles"])} + extra {len(extra["puzzles"])} + more {len(more["puzzles"])}'
          f' + 70期 {len(p70["puzzles"])} = {len(ps)} 题')

    ndrop = strip_relics(ps)
    if ndrop:
        print(f'摘掉锈蚀钥匙的题：{ndrop} 道')

    sig, maxk = score(ps)
    # 偏好筛选分桶
    for p in ps:
        try:
            tids = [str(a['tid']) for a in unseal(p)['team']]
        except Exception:
            tids = []
        p['bk'] = sorted(bucket_of(t) for t in tids)   # 保留 4 个（哈希撞桶时会有重复）

    dict_ = jl(ROOT / 'data' / 'dictionary.json')
    errs = audit(ps, dict_)

    # ---------------- 审计报告
    print('\n== 难度分布 ==')
    print('diff 1..4:', dict(sorted(Counter(p['diff'] for p in ps).items())))
    print('diffScore: %.1f ~ %.1f (中位 %.1f)' % (
        min(p['diffScore'] for p in ps), max(p['diffScore'] for p in ps),
        sorted(p['diffScore'] for p in ps)[len(ps) // 2]))
    print('同桶最大题数 %d / 不同签名 %d' % (max(sig.values()), len(sig)))
    bysz = defaultdict(Counter)
    for p in ps:
        bysz[p['season']][p['diff']] += 1
    for s in sorted(bysz):
        print(f'  第 {s} 期  {dict(sorted(bysz[s].items()))}  共 {sum(bysz[s].values())}')
    band = defaultdict(int)
    for p in ps:
        band[(p['season'], p['zone'], p['diff'])] += 1
    print('每档难度画像（同签名题数越少＝公开线索越能排除，越难）')
    for d in (1, 2, 3, 4):
        sub = [p for p in ps if p['diff'] == d]
        if not sub:
            continue
        avg = lambda f: sum(f(p) for p in sub) / len(sub)
        print('  diff %d  n=%-4d 平均回合 %.1f · 出牌 %.0f · 同桶题 %.1f · 伤害集中 %.2f'
              % (d, len(sub), avg(lambda p: p.get('rounds') or 0), avg(lambda p: p.get('cards') or 0),
                 avg(lambda p: 2 ** (p['diffWhy']['info'] * maxk) - 1), avg(lambda p: p['diffWhy']['spread'])))
    gates = {1: (1, 2), 2: (1, 3), 3: (2, 4), 4: (3, 4)}
    print('等级闸门题数：' + ' · '.join(f'lv{k}={sum(1 for p in ps if gates[k][0] <= p["diff"] <= gates[k][1])}' for k in gates))
    # 完全相同的公开线索（记住就能秒答）应极少
    clue_sig = Counter((p['season'], p['zone'], json.dumps(p['clues'], sort_keys=True)) for p in ps)
    dup = sum(v for v in clue_sig.values() if v > 1) - sum(1 for v in clue_sig.values() if v > 1)
    print(f'公开线索完全重复的题：{dup} 道')

    print('区域 × 难度（每格题数）')
    zones = sorted({(p['season'], p['zone']) for p in ps})
    print('        ' + '  '.join(f'{z[0]}-{z[1]}' for z in zones))
    for d in (1, 2, 3, 4):
        print(f'diff {d}  ' + '  '.join(f'{band[(z[0], z[1], d)]:>4}' for z in zones))

    print('\n== 结构审计 ==')
    if errs:
        print(f'{len(errs)} 处问题（最多列 12 条）')
        for e in errs[:12]:
            print('  ' + e)
    else:
        print('全部通过：队伍 4 人唯一 / 命轮 2 件 / 密契齐全 / 钥令有效 / 造物合法 / 回放 uuid 完整 / 分桶 4 个')

    if args.dry:
        print('\n--dry：未写文件')
        return
    n1 = len(core['puzzles'])
    n2 = n1 + len(extra['puzzles'])
    n3 = n2 + len(more['puzzles'])
    n70 = len(p70['puzzles'])
    core['puzzles'] = ps[:n1]
    extra['puzzles'] = ps[n1:n2]
    more['puzzles'] = ps[n2:n3]
    p70['puzzles'] = ps[n3:n3 + n70]
    pml['puzzles'] = ps[n3 + n70:]
    extra['extra'] = True
    more['extra'] = True
    p70['extra'] = True
    # 前端据此按顺序后台拉扩充题库（没有就不请求，避免 404）
    files = []
    if extra['puzzles']:
        files.append('data/puzzles-extra.json')
    if more['puzzles']:
        files.append('data/puzzles-more.json')
    if p70['puzzles']:
        files.append('data/puzzles-70.json')
    if pml['puzzles']:
        files.append('data/puzzles-mainline.json')
    core['extraFiles'] = files
    core['extraFile'] = files[0] if files else None   # 兼容旧前端
    CORE.write_text(json.dumps(core, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    EXTRA.write_text(json.dumps(extra, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    if more['puzzles']:
        MORE.write_text(json.dumps(more, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    if p70['puzzles']:
        S70.write_text(json.dumps(p70, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    if pml['puzzles']:
        SML.write_text(json.dumps(pml, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'\n已写回 {", ".join(["data/puzzles.json"] + files)}')


if __name__ == '__main__':
    main()
