# -*- coding: utf-8 -*-
"""Word puzzles that open hidden archives.  Each puzzle: a two-character answer typed into the record input.
Each character is hidden in a "残片" line placed in a *different* text (record / archive / document):
    〔◇壹〕名册第12号的配发装备，取第二字。
Same symbol = same puzzle; 壹贰 = order.  Fragments are generated from the game data so every answer is verifiable."""
import json, random, re
ZH = re.compile(r'^[\u4e00-\u9fff]+$')   # only plain Chinese strings are counted by position
from pathlib import Path
from ledger import ROSTER, PLACES, BY_V
from arcs import ARCS
from docs import DOCS
HERE = Path(__file__).resolve().parent.parent
LORE = json.loads((HERE / 'data/lore.json').read_text(encoding='utf-8'))
CN = '零一二三四五六七八九十'
# (hidden archive id, answer, [source of 壹, source of 贰], symbol, badge, riddle)   sources: ('rec', roster no.) | ('arc', 'AR-..') | ('doc', '00-..')
PUZZLES = [
 ('HX-01', '复本', [('rec', 13), ('arc', 'AR-08')], '◇', '分身者'),
 ('HX-02', '黑猫', [('rec', 12), ('arc', 'AR-06')], '◆', '猫之友'),
 ('HX-03', '蹈海', [('rec', 21), ('arc', 'AR-07')], '▲', '王的见证者'),
 ('HX-04', '黑池', [('rec', 39), ('arc', 'AR-02')], '▽', '钟下之人'),
 ('HX-05', '触腕', [('rec', 40), ('arc', 'AR-13')], '○', '夜行者之友'),
 ('HX-07', '黑潮', [('rec', 30), ('arc', 'AR-05')], '●', '黑潮观测员'),
 ('HX-08', '银钥', [('doc', '00-WORLD'), ('rec', 47)], '★', '银钥持有者'),
 ('HX-09', '倒带', [('rec', 20), ('arc', 'AR-18')], '☆', '回溯者'),
 ('HX-10', '点名', [('doc', '00-ROLL'), ('arc', 'AR-11')], '◎', '点名官'),
 ('HX-11', '融蚀', [('arc', 'AR-12'), ('rec', 50)], '▣', '融蚀见证者'),
]
BADGES = {'HX-06': '无错之人'}
BADGES.update({p[0]: p[4] for p in PUZZLES})
def cn(n):
    if n <= 10: return CN[n]
    return ('十' if n < 20 else CN[n // 10] + '十') + (CN[n % 10] if n % 10 else '')
def _refs(ch):
    out = {'name': [], 'item': [], 'place': [], 'trait': [], 'arc': [], 'doc': [], 'death': []}
    for n, slug, zh, *_r in ROSTER:
        if n == 50: continue   # the melted entry cannot be read
        nm = zh; it = _r[2]
        for i, c in enumerate(nm if ZH.match(nm) else ''):
            if c == ch:
                out['name'].append(f'名册第{n:02d}号的名字，取第{cn(i + 1)}字')
                out['death'].append(f'第{cn(BY_V[n]["dord"])}个死者的名字，取第{cn(i + 1)}字')
        for i, c in enumerate(it if ZH.match(it) else ''):
            if c == ch: out['item'].append(f'名册第{n:02d}号的配发装备，取第{cn(i + 1)}字')
        for j, t in enumerate(LORE.get(str(n), {}).get('特性', '').split()):
            for i, c in enumerate(t if ZH.match(t) else ''):
                if c == ch: out['trait'].append(f'名册第{n:02d}号的第{cn(j + 1)}项特性（名册档案里），取第{cn(i + 1)}字')
    for cell, pl in PLACES.items():
        for i, c in enumerate(pl if ZH.match(pl) else ''):
            if c == ch: out['place'].append(f'地图上{cell}的区块名，取第{cn(i + 1)}字')
    for aid, title, *_ in ARCS:
        for i, c in enumerate(title if ZH.match(title) else ''):
            if c == ch: out['arc'].append(f'补充档案{aid}的标题，取第{cn(i + 1)}字')
    for did, d in DOCS.items():
        if d[3]: continue
        for i, c in enumerate(d[0] if ZH.match(d[0]) else ''):
            if c == ch: out['doc'].append(f'文档{did}的标题，取第{cn(i + 1)}字')
    return out
KINDS = ['trait', 'place', 'death', 'item', 'name', 'doc', 'arc']
def build():
    rng = random.Random(63); frags = {}; meta = []
    for pi, (hid, ans, srcs, sym, badge) in enumerate(PUZZLES):
        used = set()
        for j, ch in enumerate(ans):
            refs = _refs(ch); text = None
            for t in range(len(KINDS)):
                kind = KINDS[(pi + j * 3 + t) % len(KINDS)]
                if kind in used or not refs[kind]: continue
                text = rng.choice(refs[kind]); used.add(kind); break
            if not text:
                for kind in KINDS:
                    if refs[kind]: text = rng.choice(refs[kind]); break
            assert text, (hid, ch)
            line = f'〔{sym}{CN[j + 1]}〕{text}。'
            frags.setdefault(srcs[j], []).append(line)
        meta.append(dict(id=hid, answer=ans, src=[f'{k}:{v}' for k, v in srcs], badge=badge))
    return frags, meta
try:
    FRAGS, META = build()
except AssertionError as e:
    FRAGS, META = {}, []
    print('puzzle build failed', e)
def h32(s):
    h = 0x811c9dc5
    for b in s.encode('utf-8'): h = ((h ^ b) * 0x01000193) & 0xffffffff
    return h
if __name__ == '__main__':
    for k, v in FRAGS.items(): print(k, v)
