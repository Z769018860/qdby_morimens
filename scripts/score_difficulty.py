"""为每道题计算可解释的难度分，并按分位切成 1–4 档（循序渐进）。

可公开给玩家的信息量决定了排除能力，据此拆成三项可解释指标：

  info   信息排除度：把回合数/出牌数/能量/单回合最高伤害/死扛/剩余生命做粗分桶，
         统计题库中同桶的题数。同桶越多 → 公开线索越难缩小范围 → 越难。
  spread 伤害辨识度：队内四人伤害占比的香农熵（除以 log4 归一化）。
         熵越低说明有一两个人伤害特别突出，更容易判断 A 位与角色定位 → 越简单。
  peel   数值平凡度：回合数、出牌数是否为常见整数（5 的倍数等），越"整"越容易记与排除 → 越简单。

difficulty = 100 * (0.60*info + 0.25*spread + 0.15*peel)，再按题库分位切 4 档写入 diff。
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
P = ROOT / 'data/puzzles.json'


def bucket(v, step, cap=None):
    if v is None:
        return -1
    b = int(v // step)
    return min(b, cap) if cap is not None else b


def main():
    d = json.loads(P.read_text(encoding='utf-8'))
    ps = d['puzzles']
    sig = {}
    for p in ps:
        key = (bucket(p.get('rounds'), 5), bucket(p.get('cards'), 20), bucket(p.get('energy'), 10),
               bucket(p.get('maxBout'), 200000), bucket(p.get('deathResist'), 1),
               bucket((p.get('left', 0) or 0) / max(p.get('hp', 1) or 1, 1), 0.25))
        sig[key] = sig.get(key, 0) + 1

    rows = []
    for p in ps:
        key = (bucket(p.get('rounds'), 5), bucket(p.get('cards'), 20), bucket(p.get('energy'), 10),
               bucket(p.get('maxBout'), 200000), bucket(p.get('deathResist'), 1),
               bucket((p.get('left', 0) or 0) / max(p.get('hp', 1) or 1, 1), 0.25))
        info = math.log2(sig[key] + 1)          # 0 … ~log2(1000)

        # 伤害分布的香农熵（四个位置）
        import base64
        import hashlib
        # 伤害占比不在 puzzle 里（在加密答案里），用 dmgComp 的构成占比替代，衡量"伤害来源是否集中"
        dc = p.get('dmgComp') or {}
        vals = [max(v or 0, 0) for v in dc.values()]
        tot = sum(vals)
        if tot > 0:
            hs = -sum((v / tot) * math.log(v / tot + 1e-9) for v in vals if v > 0)
            spread = hs / math.log(5)
        else:
            spread = 1.0

        r, c = p.get('rounds') or 0, p.get('cards') or 0
        peel = 0.0
        if r and r % 5 == 0:
            peel += 0.5
        if c and c % 10 == 0:
            peel += 0.5

        rows.append((p, info, spread, peel))

    maxk = max(math.log2(v + 1) for v in sig.values()) or 1
    scored = []
    for p, info, spread, peel in rows:
        score = 100 * (0.60 * (info / maxk) + 0.25 * spread + 0.15 * peel)
        p['diffScore'] = round(score, 1)
        p['diffWhy'] = {'info': round(info / maxk, 3), 'spread': round(spread, 3), 'peel': round(peel, 3)}
        scored.append(p)

    scored.sort(key=lambda x: x['diffScore'])
    n = len(scored)
    for i, p in enumerate(scored):
        q = i / n
        p['diff'] = 1 if q < 0.30 else 2 if q < 0.58 else 3 if q < 0.82 else 4

    P.write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    from collections import Counter
    print('diff 分布:', dict(sorted(Counter(p['diff'] for p in ps).items())))
    print('diffScore 范围:', min(p['diffScore'] for p in ps), '~', max(p['diffScore'] for p in ps))
    print('同桶最大题数:', max(sig.values()), '不同签名数:', len(sig))


if __name__ == '__main__':
    main()
