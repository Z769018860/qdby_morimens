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
    t2 = '' if os.environ.get('DR_ED') else open(os.path.join(os.path.dirname(__file__), 'texts_v2.py'), encoding='utf-8').read()
    for m in re.finditer(r'T2\[(\d+)\] = """(.*?)"""', t2, re.S):   # edges already written into the prose
        for b in re.findall(r'\{w:(\d+)\}', m.group(2)): W[int(m.group(1))].append(int(b))
    seen = {b for l in W.values() for b in l}
    for b in E[:-1]:
        if b['v'] in seen: continue
        later = [a for a in E if b['dord'] < a['dord'] <= b['dord'] + 9]
        later.sort(key=lambda a: (_near(a['cell'], b['cell']) > 1, a['dord'] - b['dord'] + rng.random() * 3))
        k = 1 + (rng.random() < .55)
        for a in later[:k]: W[a['v']].append(b['v'])
    return W
WIT = plan()
