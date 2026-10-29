# -*- coding: utf-8 -*-
"""Witness plan: which later victim's record carries the full key of which earlier victim (name + death cell + death order).
Every victim except the last is witnessed by 1-2 records of people who died shortly after, preferring the same area.
This is the deduction structure the left-hand [X] badge counts."""
import random
from ledger import E, BY_V
_cells = lambda c: (ord(c[0]) - 65, int(c[1]) - 1)
def _near(a, b):
    (x1, y1), (x2, y2) = _cells(a), _cells(b); return max(abs(x1 - x2), abs(y1 - y2))
def plan(seed=63):
    rng = random.Random(seed); W = {e['v']: [] for e in E}
    import re, os
    # 正文有两层：texts_v2 是重写稿，texts_v3 是再改的一批（T3 优先）。见证边以最终正文为准，
    # 否则 T3 里删掉的 {w:N} 会被这里当成“还缺一句”而重新插回去。
    prose = {}
    if not os.environ.get('DR_ED'):
        here = os.path.dirname(__file__)
        for fn, key in (('texts_v2.py', 'T2'), ('texts_v3.py', 'T3')):
            try:
                src = open(os.path.join(here, fn), encoding='utf-8').read()
            except OSError:
                continue
            for m in re.finditer(key + r'\[(\d+)\] = """(.*?)"""', src, re.S):
                prose[int(m.group(1))] = m.group(2)
    for n in sorted(prose):   # edges already written into the prose
        for b in re.findall(r'\{w:(\d+)\}', prose[n]): W[n].append(int(b))
    seen = {b for l in W.values() for b in l}
    # 一条记录当证人的次数上限是 2。原先没有上限，热门记录会被十来个人挑中，
    # 于是一份记录里接连冒出三四句「听说 X 是第 N 个」——读起来像通报，不像人写的。
    CAP = 2
    def pick(b, cap):
        def rank(a):
            return (_near(a['cell'], b['cell']) > 1, a['dord'] - b['dord'] + rng.random() * 3)
        near = sorted([a for a in E if b['dord'] < a['dord'] <= b['dord'] + 9], key=rank)
        k = 1 + (rng.random() < .55)
        out = [a for a in near if len(W[a['v']]) < cap][:k]
        if not out:
            # 附近都满了：先找最近的、还有空位的后来者；全都满了才允许超编一份，
            # 否则最后几个人就没有任何记录指向他们，闭环会断。
            room = sorted([a for a in E if a['dord'] > b['dord'] and len(W[a['v']]) < cap], key=rank)
            if room:
                out = room[:1]
            else:
                out = [min([a for a in E if a['dord'] > b['dord']], key=lambda a: len(W[a['v']]))]
        for a in out:
            W[a['v']].append(b['v'])
    for b in E[:-1]:
        if b['v'] in seen: continue
        pick(b, CAP)
    return W
WIT = plan()
