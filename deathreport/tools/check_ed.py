#!/usr/bin/env python3
"""Check the hand-written edition prose against the ledger facts.

Every record must: use its own place, name its weapon, name its culprit only when the killer is
meant to be named, stay long enough, keep the edition's signature lines (hats/fog, no silver core,
"died once"), and use the right pronouns.  usage: python3 tools/check_ed.py 62
"""
import os, re, sys, importlib, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DR_ED', sys.argv[1] if len(sys.argv) > 1 else '62')
import ledger
Ed = importlib.import_module('ed_' + os.environ['DR_ED'])
NUM = {nm: i + 1 for i, nm in enumerate(Ed.CAST)}
TEXT = Ed.TEXT
LORE = json.loads(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../data/lore.json'), encoding='utf-8').read())
SEX = {nm: (LORE.get(str(i + 1), {}).get('性别') for i, nm in enumerate([r[2] for r in ledger.MAIN_ROSTER])) for nm in NUM}
TOK = re.compile(r'\{(@?\d+|w:\d+|it:\d+|loc:[A-E]\d|bc:D\d-\d+|sys:[0-9A-Z-]+)\}')
errs, warns = [], []
ev = {ledger.NAME[e['v']]: e for e in ledger.E}
for nm, e in ev.items():
    if nm not in TEXT:
        errs.append(f'{nm}: no prose')
for nm, txt in TEXT.items():
    if nm not in ev:
        errs.append(f'{nm}: not a victim in this edition')
        continue
    e = ev[nm]
    plain = re.sub(r'\{[^}]*\}', '', txt)
    toks = TOK.findall(txt)
    nums = {t.lstrip('@') for t in toks if t.lstrip('@').isdigit()}
    items = {int(t[3:]) for t in toks if t.startswith('it:')}
    locs = {t[4:] for t in toks if t.startswith('loc:')}
    if len(plain) < 152: errs.append(f'{nm}: too short ({len(plain)})')
    if '{' in plain or '}' in plain: errs.append(f'{nm}: unmatched brace')
    if not locs: errs.append(f'{nm}: no {{loc:...}} token')
    elif locs != {e['cell']}: errs.append(f"{nm}: loc {locs} != {e['cell']}")
    if e['w'] and str(e['w']) not in {str(i) for i in items}: errs.append(f"{nm}: weapon {{it:{e['w']}}} ({ledger.ITEM[e['w']]}) missing")
    c = e['c']
    if c and e['how'] == 'name' and str(c) not in nums: errs.append(f'{nm}: killer {ledger.NAME.get(c)} not named')
    if c and e['how'] != 'name' and str(c) in nums: errs.append(f"{nm}: killer {ledger.NAME.get(c)} must stay unnamed ({e['how']})")
    if e['cause'] == 'blast' and e.get('sub') != 'demo' and not ({t for t in toks if t.startswith('bc:')} or 'sys:00-ZONE' in toks): errs.append(f'{nm}: blast without broadcast / zone doc')
    if e['cause'] in ('accident', 'fall') and not c and 'sys:00-REPORT' not in toks: warns.append(f'{nm}: no 00-REPORT reference')
    if e['cause'] == 'poison' and e.get('suicide') and 'sys:00-REPORT' not in toks: warns.append(f'{nm}: suicide without 00-REPORT reference')
    ZONE = {c: (d, h) for d, h, c in ledger.ZONES}
    for t in toks:
        if not t.startswith('bc:'): continue
        d, h = t[3:].split('-'); d, h = int(d[1:]), int(h)
        if (d - 1) * 1440 + h * 60 > e['min']: errs.append(f'{nm}: broadcast {t} is in the future')
        z = ZONE.get(e['cell'])
        if e['cause'] == 'blast' and e.get('sub') == 'zone' and z and z != (d, h):
            errs.append(f'{nm}: zone blast at {z[0]}d{z[1]:02d}h but broadcast {t}')
    for m in re.finditer(r'\{@?(\d+)\}([^{}。！？\n]{0,10}?)([他她])', txt):
        g = SEX.get(ledger.NAME.get(int(m.group(1))))
        if g and ((g == '女' and m.group(3) == '他') or (g == '男' and m.group(3) == '她')): errs.append(f'{nm}: pronoun {m.group(0)}')
if os.environ['DR_ED'] == '61':
    for k in Ed.EVENTS:
        pass
    wn = NUM['威廉']; e = ev['威廉']
    if '没有银芯' not in TEXT['威廉']: errs.append('威廉(61): must mention 没有银芯')
    for e in ledger.E:
        if e['c'] == 64:
            t = TEXT[ledger.NAME[e['v']]]
            if '帽' not in t or '雾' not in t: errs.append(f"{e['key']}: N needs hat and fog")
if os.environ['DR_ED'] == '62' and '死过一次' not in TEXT['威廉']: errs.append('威廉(62): must mention 死过一次')
if os.environ['DR_ED'] == '62' and re.search(r'(?<![A-Za-z])N(?![A-Za-z])', ''.join(TEXT.values())): errs.append('62: no latin N in prose')
for w in warns: print('WARN', w)
for x in errs: print('ERR ', x)
print(f'{os.environ["DR_ED"]}: {len(TEXT)} records, {len(errs)} errors, {len(warns)} warnings')
sys.exit(1 if errs else 0)
