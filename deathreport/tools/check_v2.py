#!/usr/bin/env python3
"""Every rewritten record must keep every token of the old record (names => reference graph, items, places, broadcasts, system docs),
must not newly name a killer that is meant to be deduced from an item / trait / shadow evidence, and must respect gender pronouns."""
import re, sys, json, os
sys.path.insert(0, os.path.dirname(__file__))
import ledger, texts, texts_extra
from texts_v2 import T2
TOK = re.compile(r'\{(@?\d+|it:\d+|loc:[A-E]\d|bc:D\d-\d+|sys:[0-9A-Z-]+)\}')
def old(n):
    L = texts.T[n].split('\n'); ins = list(texts_extra.X.get(n, []))
    if n in texts_extra.FLAVOR: ins.append(texts_extra.FLAVOR[n])
    for k, t in sorted(ins, key=lambda a: -a[0]): L.insert(min(k + 1, len(L)), t)
    return '\n'.join(L)
prof = json.load(open(os.path.join(os.path.dirname(__file__), '../data/lore.json')))
G = {int(k): v.get('性别') for k, v in prof.items()}
err = 0
ev = {e['v']: e for e in ledger.E}
for n in sorted(T2):
    o, w = set(TOK.findall(old(n))), set(TOK.findall(T2[n]))
    norm = lambda s: {x.lstrip('@') if x.lstrip('@').isdigit() else x for x in s}
    miss = norm(o) - norm(w)
    if miss: print(n, 'MISSING', sorted(miss)); err += 1
    e = ev[n]; c = e['c']
    if c and e['how'] in ('item', 'trait', 'shadow') and str(c) in norm(w) - norm(o): print(n, 'NEW KILLER NAME', c); err += 1
    for m in re.finditer(r'\{@?(\d+)\}([^{}。！？\n]{0,12}?)([他她])', T2[n]):
        g = G.get(int(m.group(1)))
        if g and ((g == '女' and m.group(3) == '他') or (g == '男' and m.group(3) == '她')): print(n, 'PRONOUN', m.group(0)); err += 1
    if len(re.sub(r'\{[^}]*\}', '', T2[n])) < 230: print(n, 'SHORT', len(T2[n]))
print('done', len(T2), 'errors', err)
