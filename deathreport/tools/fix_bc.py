# -*- coding: utf-8 -*-
"""重建往届记录里「然后是封锁的名单」那一行，用本届账本（DR_ED）的封锁表。"""
import re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DR_ED', '61')
import ledger
CN = '零一二三四五六七八九'
def hh_cn(h):
    if h < 10: return CN[h]
    if h == 10: return '十'
    if h < 20: return '十' + CN[h % 10]
    return CN[h // 10] + '十' + (CN[h % 10] if h % 10 else '')
ZONE = {c: (d, h) for d, h, c in ledger.ZONES}
EV = {ledger.NAME[e['v']]: e for e in ledger.E}
fix = 0
for p in ('ed_61_text.py', 'ed_61_text2.py'):
    lines = open(p, encoding='utf-8').read().split('\n')
    cur = None
    for i, ln in enumerate(lines):
        m = re.match(r"^'([^']+)': \"\"\"", ln)
        if m: cur = m.group(1); continue
        if '然后是封锁的名单' in ln:
            cell = EV[cur]['cell']; d, h = ZONE[cell]
            lines[i] = f'{{bc:D{d}-{h:02d}}}然后是封锁的名单——{hh_cn(h)}点整，{{loc:{cell}}}。'
            fix += 1
    open(p, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
print('rebuilt', fix, 'with DR_ED', os.environ['DR_ED'], len(ledger.ZONES), 'zones')
