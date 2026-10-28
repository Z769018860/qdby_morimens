#!/usr/bin/env python3
"""Closure check: can a player who only reads what they have already recovered (records, documents, messages) deduce every record key NN-XY-SS?
Knowledge model (monotone, fixed point):
  SS  the victim's identity is known when the name appears in an available text (not the record's own text), or in a masked key of a message.
  NN  the death order is known from a broadcast ("目前已死亡X人。新增的死者：A、B") that names the victim, or from a message mask, or by elimination (all others known).
  XY  the death cell is known when an available text puts the victim's name and the cell's place name in one line (not its own record), or from a mask.
A record is recoverable when SS, NN and XY are all known.  Reports the stuck records.   usage: python3 tools/closure.py [-v]"""
import json, re, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent.parent
G = json.loads((HERE / 'data/game.json').read_text(encoding='utf-8'))
verbose = '-v' in sys.argv
STRICT = '--strict' in sys.argv   # no broadcast arithmetic: only witness statements, message masks and elimination
names = {p['n']: p['name'] for p in G['roster']}
rec = G['records']; byvic = {r['num']: r for r in rec.values()}
places = G['places']
strip = lambda t: re.sub(r'\[/?[a-z]+\]|\[link\]|\[/link\]', '', t)
BC = re.compile(r'目前已死亡(\d+)人。(?:新增的死者：([^。]+)。|上一个小时没有新增的死者。)')
CN = {c: i for i, c in enumerate('零一二三四五六七八九')}
def cn2int(t):
    if '十' in t:
        a, b = t.split('十'); return (CN[a] if a else 1) * 10 + (CN[b] if b else 0)
    return CN[t]
_ALL = sorted({v.strip('「」') for v in names.values()}, key=len, reverse=True)
def name_in(line, n):   # longest name wins ('负誓·奥吉尔' is not '奥吉尔')
    nm = names[n].strip('「」'); rest = line
    for o in _ALL:
        if o != nm and nm in o: rest = rest.replace(o, '\0')
    return nm in rest
def texts_of(st):
    out = [(None, strip(G['docs'][d]['text'])) for d in st['docs']]
    out += [(r, strip(rec[r]['text'])) for r in st['rec']]
    out += [('MSG', strip(m['text'])) for m in G['msgs'] if m['need'] <= len(st['rec'])]
    out += [(None, strip(a['text'])) for a in G.get('arcs', []) if a['need'] <= len(st['rec'])]
    return out
def analyse(st):
    ss, nn, xy = set(), {}, {}
    for own, t in texts_of(st):
        ismsg = own == 'MSG'; ownnum = rec[own]['num'] if own and not ismsg else None
        for line in t.split('\n'):
            for n in names:
                if n != ownnum and name_in(line, n):
                    ss.add(n)
                    for c, pl in places.items():
                        if pl in line: xy.setdefault(n, set()).add(c)
            om = re.search(r'第([零一二三四五六七八九十]+)个', line)
            if om:                                   # witness statement: name + place + order in one line
                for n in names:
                    if n != ownnum and name_in(line, n): nn[n] = cn2int(om.group(1))
            for m in ([] if (STRICT and not ismsg) else BC.finditer(line)):
                cnt = int(m.group(1)); lst = m.group(2).split('、') if m.group(2) else []
                for i, nm in enumerate(lst):
                    for n in names:
                        if names[n].strip('「」') == nm.strip('“”「」'): nn[n] = cnt - len(lst) + i + 1
        for line in t.split('\n'):   # masks in messages:  dd-??-ss / ??-XY-ss / dd-XY-??
            for m in re.finditer(r'(\?\?|\d\d)-(\?\?|[A-E][1-5])-(\?\?|\d\d)', line):
                a, b, c = m.groups()
                if c != '??': ss.add(int(c))
                if c != '??' and a != '??': nn[int(c)] = int(a)
                if c != '??' and b != '??': xy.setdefault(int(c), set()).add(b)
    return ss, nn, xy
def run():
    st = dict(rec=list(G['start']), docs=[d for d, v in G['docs'].items() if not v['final']])
    while True:
        ss, nn, xy = analyse(st)
        known = set(nn.values())
        free = [n for n in names if n not in nn]
        if len(free) == 1 and len(nn) == len(names) - 1: nn[free[0]] = (set(range(1, len(names) + 1)) - set(nn.values())).pop()
        new = []
        for k, r in rec.items():
            if k in st['rec']: continue
            n = r['num']; d, c, s = k.split('-')
            if n in ss and nn.get(n) == int(d) and c in xy.get(n, ()): new.append(k)
        if not new: break
        st['rec'] += new
    return st, analyse(st)
st, (ss, nn, xy) = run()
stuck = [k for k in rec if k not in st['rec']]
print(f'recoverable {len(st["rec"])}/{len(rec)}')
for k in stuck:
    n = rec[k]['num']; d, c, s = k.split('-')
    print('STUCK', k, names[n], 'SS' if n in ss else 'ss?', 'NN' if nn.get(n) == int(d) else f'nn?({nn.get(n)})', 'XY' if c in xy.get(n, ()) else 'xy?')
sys.exit(1 if stuck else 0)
