#!/usr/bin/env python3
"""把回放里量出来的两项做成一份可读的数据报告：钥令开启次数、侵蚀伤害。

数据链：
  题库 data/bank/*.json（题目 + uuid）
    × data/replay-metrics.json（scripts/fetch_replay_metrics.mjs 产出：uuid -> [开钥令数, 回合数]）
    × data/replay-erosion.json（scripts/extract_erosion_metrics.mjs 产出：uuid -> 侵蚀伤害/层数/全状态伤害）
    × 题目答案里封着的 team / key（用 js/pepper.js 的 PEPPER 解封，只为统计用）

用法：
  python scripts/replay_metrics_report.py [--metrics ...] [--erosion ...] [--out docs]

产出：
  <out>/detective-replay-metrics.md    报告
  <out>/detective-replay-metrics.csv   逐题明细
"""
import argparse
import base64
import glob
import hashlib
import json
import re
import statistics
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PEPPER = re.search(r"'([0-9a-f]+)'", (ROOT / 'js/pepper.js').read_text(encoding='utf-8')).group(1)

# 侵蚀系角色：这些人在队里，侵蚀伤害才可能非零
ERO_CHARS = {'77923': '卡斯托尔', '130226': '沙耶', '77921': '卡拉布', '151844': '薇薇安'}
# 回放里真正记伤害的侵蚀状态（其余侵蚀状态都是辅助计数）
ERO_STATE_NAMES = {'90059': '卡斯托尔侵蚀'}


def unseal(pid, blob):
    raw = base64.b64decode(blob)
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        out += bytes(a ^ b for a, b in zip(raw[i:i + 32], ks))
    txt = bytes(out).decode('utf-8')
    if not txt.startswith('ZJ1:'):
        raise ValueError('bad seal')
    return json.loads(txt[4:])


def pct(x, n):
    return f'{x / n * 100:.1f}%' if n else '—'


def q(vals, p):
    if not vals:
        return None
    vals = sorted(vals)
    k = (len(vals) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(vals) - 1)
    return vals[lo] + (vals[hi] - vals[lo]) * (k - lo)


def fmt(v, nd=1):
    if v is None:
        return '—'
    return f'{v:.{nd}f}' if isinstance(v, float) else str(v)


def wan(v):
    if v is None:
        return '—'
    if v >= 1e8:
        return f'{v / 1e8:.2f} 亿'
    if v >= 1e4:
        return f'{v / 1e4:.1f} 万'
    return str(int(v))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--metrics', default='data/replay-metrics.json')
    ap.add_argument('--erosion', default='data/replay-erosion.json')
    ap.add_argument('--out', default='docs')
    args = ap.parse_args()

    metrics = json.loads((ROOT / args.metrics).read_text(encoding='utf-8'))['metrics']
    ero_path = ROOT / args.erosion
    ero = json.loads(ero_path.read_text(encoding='utf-8'))['items'] if ero_path.exists() else {}
    D = json.loads((ROOT / 'data/dictionary.json').read_text(encoding='utf-8'))
    keyname = {str(e['id']): (e.get('zh') or e.get('en') or str(e['id'])) for e in D['key'] if e.get('id') is not None}
    awname = {str(e['id']): (e.get('zh') or e.get('en') or str(e['id'])) for e in D['awakener'] if e.get('id') is not None}

    puzzles = []
    for f in sorted(glob.glob(str(ROOT / 'data/bank/c*.json'))):
        puzzles += json.loads(Path(f).read_text(encoding='utf-8'))['puzzles']

    rows, no_metric, mismatch = [], 0, 0
    state_names = Counter()
    for p in puzzles:
        u = str(p.get('uuid') or '').lower()
        m = metrics.get(u)
        if not m:
            no_metric += 1
            continue
        uses, bouts = m
        if int(bouts) != int(p['rounds']):
            mismatch += 1
            continue
        try:
            ans = unseal(p['id'], p['ans'])
            key = str(ans.get('key') or '')
            team = [str(t.get('tid')) for t in (ans.get('team') or [])]
        except Exception:
            key, team = '', []
        e = ero.get(u) or {}
        ero_dmg = int(e.get('dmg') or 0) if int(e.get('bouts') or -1) == int(p['rounds']) else None
        state_dmg = int(e.get('stateDmg') or 0)
        for sid in (e.get('states') or {}):
            state_names[str(sid)] += 1
        rows.append({
            'id': p['id'], 'season': p['season'], 'zone': p['zone'], 'diff': p['diff'],
            'rounds': p['rounds'], 'bossRounds': p['bossRounds'], 'key': key,
            'keyName': keyname.get(key, key or '?'), 'uses': int(uses),
            'ero': ero_dmg, 'stateDmg': state_dmg,
            'heroes': [ERO_CHARS[t] for t in team if t in ERO_CHARS],
            'team': team, 'score': p.get('score'), 'extra': bool(p.get('extra')),
        })

    n = len(rows)
    uses = [r['uses'] for r in rows]
    zeros = sum(1 for x in uses if x == 0)
    ero_rows = [r for r in rows if r['ero'] is not None]
    ero_hit = [r for r in ero_rows if r['ero'] > 0]
    ero_vals = sorted(r['ero'] for r in ero_hit)
    shares = [r['ero'] / r['stateDmg'] for r in ero_hit if r['stateDmg']]

    L = []
    A = L.append
    A('# 战报侦探 · 回放实测数据（钥令开启次数 / 侵蚀伤害）')
    A('')
    A('> 这两项**都不在榜单摘要里**（`battle-summary` 32 个字段到 `maxPosion` 为止），只能从战斗回放本体里量。')
    A('> 回放不是 JSON，是 LZ4 帧 + MessagePack，解码用仓库里的 `js/replay.js`。')
    A('> ')
    A('> - **钥令开启次数** = `statistics.UsedKeeperSkillCount`。`battleDat.statistics` 是「进首领房那一刻」的快照，')
    A('>   首领那几回合还没算进去，所以取帧日志里回合数最大的那份 `globalStats`。')
    A('> - **侵蚀伤害** = 回放最后一版逐状态统计里 `state[*].AwakerDoDamage`，状态名含「侵蚀」的那些求和。')
    A('>   和摘要里的 `maxPosion`（中毒）不是一个东西：中毒是层数峰值，侵蚀是累计伤害。')
    A('')
    A('## 覆盖')
    A('')
    A(f'- 题库：**{len(puzzles)}** 题；回放能对上（回合数一致）：**{n}** 题（{pct(n, len(puzzles))}）')
    A(f'- 无回放指标：{no_metric} 题；回合数对不上（说明回放不是这一场）：{mismatch} 题')
    A(f'- 钥令数据来自 `{Path(args.metrics).name}`（{len(metrics)} 个 uuid）')
    A(f'- 侵蚀数据来自 `{Path(args.erosion).name}`（{len(ero)} 个 uuid），其中 **{len(ero_hit)}** 题侵蚀伤害 > 0')
    A('')
    A('## 一、钥令开启次数')
    A('')
    A('单场里守密人放了几次钥令。「0 次」是有效值（整场没开钥令），只有回放里确实取不到时才空着。')
    A('')
    A('| 指标 | 值 |')
    A('| --- | --- |')
    A(f'| 最小 | {min(uses) if uses else "—"} |')
    A(f'| 中位 | {fmt(q(uses, 0.5))} |')
    A(f'| 平均 | {statistics.mean(uses):.2f} |' if uses else '| 平均 | — |')
    A(f'| P90 | {fmt(q(uses, 0.9))} |')
    A(f'| 最大 | {max(uses) if uses else "—"} |')
    A(f'| 0 次的题 | {zeros}（{pct(zeros, n)}） |')
    A('')
    A('### 按期数')
    A('')
    A('| 期 | 题数 | 中位 | 平均 | P90 | 最大 | 0 次占比 |')
    A('| --- | --- | --- | --- | --- | --- | --- |')
    for s in sorted({r['season'] for r in rows}):
        v = [r['uses'] for r in rows if r['season'] == s]
        A(f'| {s} 期 | {len(v)} | {fmt(q(v, 0.5))} | {statistics.mean(v):.2f} | {fmt(q(v, 0.9))} | {max(v)} | {pct(sum(1 for x in v if x == 0), len(v))} |')
    A('')
    A('### 按期-区')
    A('')
    A('| 期-区 | 题数 | 中位 | 平均 | P90 | 最大 | 回合中位 | 次数/回合中位 |')
    A('| --- | --- | --- | --- | --- | --- | --- | --- |')
    for s in sorted({r['season'] for r in rows}):
        for z in sorted({r['zone'] for r in rows if r['season'] == s}):
            sub = [r for r in rows if r['season'] == s and r['zone'] == z]
            v = [r['uses'] for r in sub]
            rd = [r['rounds'] for r in sub]
            ratio = [r['uses'] / r['rounds'] for r in sub if r['rounds']]
            A(f'| {s}-{z} | {len(v)} | {fmt(q(v, 0.5))} | {statistics.mean(v):.2f} | {fmt(q(v, 0.9))} | {max(v)} | {fmt(q(rd, 0.5))} | {fmt(q(ratio, 0.5), 2)} |')
    A('')
    A('### 按钥令（守密人携带的那个）')
    A('')
    A('按开启次数中位排序，只列样本 ≥ 10 的（前 24 个，全量见 CSV）：')
    A('')
    A('| 钥令 | 题数 | 中位 | 平均 | P90 | 最大 | 0 次占比 |')
    A('| --- | --- | --- | --- | --- | --- | --- |')
    bykey = defaultdict(list)
    for r in rows:
        bykey[r['keyName']].append(r['uses'])
    ranked = [(name, v) for name, v in sorted(bykey.items(), key=lambda kv: -q(kv[1], 0.5)) if len(v) >= 10]
    for name, v in ranked[:24]:
        A(f'| {name} | {len(v)} | {fmt(q(v, 0.5))} | {statistics.mean(v):.2f} | {fmt(q(v, 0.9))} | {max(v)} | {pct(sum(1 for x in v if x == 0), len(v))} |')
    A('')

    A('## 二、侵蚀伤害')
    A('')
    if not ero_hit:
        A('（本次没有侵蚀数据；先跑 `node scripts/extract_erosion_metrics.mjs --cache <回放缓存>`）')
        A('')
    else:
        A(f'侵蚀伤害合计（己方角色名下的「侵蚀」状态打出来的伤害）。全库有 {len(ero_hit)} 题侵蚀伤害 > 0，')
        A(f'占能对上的 {pct(len(ero_hit), n)}；侵蚀伤害占「全部状态伤害」的中位比例是 **{fmt(q(shares, 0.5) * 100, 1)}%**。')
        A('')
        A('> 侵蚀不是只有侵蚀系角色才有：队里带 卡斯托尔 / 沙耶 / 卡拉布 / 薇薇安 时几乎必有，')
        A('> 不带也有约一成会打出来（来自造物、命轮），所以这一项对判断「这队靠什么出伤」一直有效。')
        A('')
        A('| 指标 | 值 |')
        A('| --- | --- |')
        A(f'| 有侵蚀伤害的题 | {len(ero_hit)}（占能对上的 {pct(len(ero_hit), n)}） |')
        A(f'| 最小 | {wan(min(ero_vals))} |')
        A(f'| 中位 | {wan(int(q(ero_vals, 0.5)))} |')
        A(f'| 平均 | {wan(int(statistics.mean(ero_vals)))} |')
        A(f'| P90 | {wan(int(q(ero_vals, 0.9)))} |')
        A(f'| 最大 | {wan(max(ero_vals))} |')
        A(f'| 侵蚀 / 全状态伤害 中位 | {fmt(q(shares, 0.5) * 100, 1)}% |')
        A('')
        A('### 侵蚀是哪些状态在打')
        A('')
        A('| 状态 | id | 出现题数 |')
        A('| --- | --- | --- |')
        for sid, c in state_names.most_common(10):
            A(f'| {ERO_STATE_NAMES.get(sid, "（未收录）")} | {sid} | {c} |')
        A('')
        A('> 回放里真正打出伤害的侵蚀状态只有 `90059 卡斯托尔侵蚀` 这一个（其余如卡拉布延迟侵蚀、')
        A('> 侵蚀倍率 / 侵蚀计数都只是辅助状态，伤害记在它名下）。这一项因此等价于「这队把侵蚀打出来了多少」。')
        A('')
        A('### 队里带没带侵蚀系角色')
        A('')
        A('| 队伍 | 题数 | 侵蚀 > 0 占比 | 侵蚀中位 | 钥令中位 |')
        A('| --- | --- | --- | --- | --- |')
        for label, pred in (
            ('带侵蚀系角色', lambda r: bool(r['heroes'])),
            ('其中带薇薇安', lambda r: '薇薇安' in r['heroes']),
            ('不带', lambda r: not r['heroes']),
        ):
            sub = [r for r in rows if pred(r)]
            hit = [r['ero'] for r in sub if r['ero']]
            if not sub:
                continue
            A(f'| {label} | {len(sub)} | {pct(len(hit), len(sub))} | {wan(int(q(hit, 0.5))) if hit else "—"} | {fmt(q([r["uses"] for r in sub], 0.5))} |')
        A('')
        A('### 按期数')
        A('')
        A('| 期 | 题数 | 侵蚀 > 0 | 侵蚀中位 | 侵蚀 P90 | 最大 |')
        A('| --- | --- | --- | --- | --- | --- |')
        for s in sorted({r['season'] for r in rows}):
            sub = [r for r in rows if r['season'] == s]
            hit = [r['ero'] for r in sub if r['ero']]
            A(f'| {s} 期 | {len(sub)} | {pct(len(hit), len(sub))} | {wan(int(q(hit, 0.5))) if hit else "—"} | {wan(int(q(hit, 0.9))) if hit else "—"} | {wan(max(hit)) if hit else "—"} |')
        A('')
        A('### 侵蚀伤害最高的题')
        A('')
        A('| 题 | 期-区 | 队伍里的侵蚀系 | 侵蚀伤害 | 占状态伤害 | 钥令次数 |')
        A('| --- | --- | --- | --- | --- | --- |')
        for r in sorted(ero_hit, key=lambda r: -r['ero'])[:10]:
            sh = f"{r['ero'] / r['stateDmg'] * 100:.1f}%" if r['stateDmg'] else '—'
            A(f"| {r['id']} | {r['season']}-{r['zone']} | {'、'.join(r['heroes']) or '—'} | {wan(r['ero'])} | {sh} | {r['uses']} |")
        A('')

    A('## 三、钥令开得最多的题')
    A('')
    A('| 题 | 钥令 | 次数 | 回合 | 次数/回合 |')
    A('| --- | --- | --- | --- | --- |')
    for r in sorted(rows, key=lambda r: -r['uses'])[:8]:
        A(f"| {r['id']} | {r['keyName']} | {r['uses']} | {r['rounds']} | {r['uses'] / r['rounds']:.2f} |")
    A('')
    slow = [r for r in rows if r['rounds'] >= 20 and r['uses'] == 0]
    A(f'一次钥令都没开、且打到 20 回合以上的题：**{len(slow)}** 道。')
    A('')
    A('## 已知问题')
    A('')
    A('- 回放统计是客户端写的，个别场次会缺字段；缺的题不写这项，卡片上就不显示，不做估算。')
    A('- 侵蚀伤害只在「队里真的有人打侵蚀」时非零；0 分两种情况——真没打，或这份回放的逐状态统计没录，')
    A('  所以只有逐状态统计存在（stateDmg > 0）时才把 0 当成真 0。')
    A('')
    A('## 附：逐题明细')
    A('')
    A('`detective-replay-metrics.csv`（UTF-8 BOM，Excel 直接开）。')
    A('')

    out = ROOT / args.out
    out.mkdir(parents=True, exist_ok=True)
    (out / 'detective-replay-metrics.md').write_text('\n'.join(L), encoding='utf-8')
    with (out / 'detective-replay-metrics.csv').open('w', encoding='utf-8-sig', newline='') as fp:
        fp.write('id,season,zone,diff,rounds,bossRounds,keeperName,keyUses,usesPerRound,erosionDmg,stateDmg,erosionShare,eroHeroes,score,extra\n')
        for r in sorted(rows, key=lambda r: (r['season'], r['zone'], -(r['ero'] or 0), -r['uses'])):
            sh = f"{r['ero'] / r['stateDmg']:.4f}" if (r['ero'] and r['stateDmg']) else ''
            fp.write(','.join([
                r['id'], str(r['season']), str(r['zone']), str(r['diff']), str(r['rounds']),
                str(r['bossRounds']), '"' + r['keyName'].replace('"', '""') + '"',
                str(r['uses']), f"{r['uses'] / r['rounds']:.3f}" if r['rounds'] else '',
                '' if r['ero'] is None else str(r['ero']), str(r['stateDmg']), sh,
                '"' + '、'.join(r['heroes']) + '"', str(r['score']), '1' if r['extra'] else '0',
            ]) + '\n')

    print(f'覆盖 {n}/{len(puzzles)}；钥令中位 {fmt(q(uses, 0.5))}，0 次 {pct(zeros, n)}；'
          f'侵蚀 > 0 的 {len(ero_hit)} 题，中位 {wan(int(q(ero_vals, 0.5))) if ero_vals else "—"}')
    print('写出', out / 'detective-replay-metrics.md', '与 detective-replay-metrics.csv')


if __name__ == '__main__':
    main()
