#!/usr/bin/env python3
"""Build data/game.json from the ledger, the prose, the documents and the main repo's assets index.
usage: python3 tools/build.py [--repo ..]   (repo = qdby_morimens main checkout, for avatars and item icons)"""
import sys, re, json, random, itertools, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ledger import E, ROSTER, NAME, ITEM, ICLASS, PLACES, ZONES, CAUSES, SHADOW, BY_V, fmt, validate, tmin
from texts import T
from texts_extra import X, FLAVOR
from texts_v2 import T2
from docs import DOCS, MSGS

ap = argparse.ArgumentParser(); ap.add_argument('--repo', default='..'); args = ap.parse_args()
REPO = Path(args.repo).resolve(); HERE = Path(__file__).resolve().parent.parent
errs = validate()
if errs: print('\n'.join(errs)); sys.exit(1)

KEY = {e['v']: e['key'] for e in E}
dictionary = json.loads((REPO / 'data/dictionary.json').read_text(encoding='utf-8'))
cz = {c['zh']: c for c in dictionary['creation']}; wz = {c['zh']: c for c in dictionary['wheel']}
av = {a['n'].replace('「', '').replace('」', ''): a['src'] for a in json.loads((REPO / 'data/avatars.json').read_text(encoding='utf-8'))['items'] if a['k'] == 'awakener'}

# ---------------- broadcasts
def bc_text(day, hour):
    m = (day - 1) * 1440 + hour * 60
    dead = [e for e in E if e['min'] < m]; new = [e for e in E if m - 60 <= e['min'] < m]
    s = f"目前已死亡{len(dead)}人。"
    s += ("新增的死者：" + '、'.join(NAME[e['v']] for e in new) + "。") if new else "上一个小时没有新增的死者。"
    return "“" + s + "”"

# ---------------- token rendering
TOK = re.compile(r'\{(@?\d+|it:\d+|loc:[A-E]\d|bc:D\d-\d+|sys:[0-9A-Z-]+)\}')
def full_prose(n):
    if n in T2: return T2[n].strip('\n')
    L = T[n].split('\n')
    ins = list(X.get(n, []))
    if n in FLAVOR: ins.append(FLAVOR[n])
    for k, txt in sorted(ins, key=lambda a: -a[0]): L.insert(min(k + 1, len(L)), txt)
    return '\n'.join(L)
def render(n):
    mentions, sysrefs = [], []
    def sub(m):
        t = m.group(1)
        if t.startswith('it:'): return ITEM[int(t[3:])]
        if t.startswith('loc:'): return PLACES[t[4:]]
        if t.startswith('bc:'): d, h = t[4:].split('-'); return bc_text(int(d), int(h))
        if t.startswith('sys:'): sysrefs.append(t[4:]); return ''
        if t.startswith('@'): return NAME[int(t[1:])]
        k = int(t); mentions.append(k); return NAME[k]
    out = TOK.sub(sub, full_prose(n))
    return out.replace('。。', '。'), mentions, sysrefs

# ---------------- records
records = {}
for e in E:
    n = e['v']; prose, ment, sysrefs = render(n)
    refs = [KEY[k] for k in dict.fromkeys(ment) if k != n]
    foot = '-- 检测到银芯被强制崩解 --' if e['cause'] == 'blast' else '-- 检测到生命体征消失 --'
    if e['dord'] == 1: foot = '-- 检测到银芯启动。关于银芯的说明请参考 [link]00-CHIP[/link] --\n' + foot
    for s in dict.fromkeys(sysrefs): 
        if e['dord'] != 1 or s != '00-CHIP': foot += f'\n-- 参考 [link]{s}[/link] --'
    body = prose.strip() + '\n\n[sys]\n' + foot + '\n[/sys]'
    records[e['key']] = dict(key=e['key'], dord=e['dord'], cell=e['cell'], num=n, name=NAME[n], when=fmt(e['t']), min=e['min'], text=body, refs=refs, sys=list(dict.fromkeys(sysrefs)))

# ---------------- reference graph / start selection
edges = {k: set(r['refs']) for k, r in records.items()}
doc_refs = {'00-ORDER': {'00-SYSTEM', '00-REPORT'}, '00-SYSTEM': set(), '00-REPORT': set()}
roll_keys = [e['key'] for e in E if e['min'] < 1440]
def reach(starts, extra=()):
    seen = set(starts) | set(extra); st = list(seen)
    while st:
        x = st.pop()
        for y in edges.get(x, ()):
            if y not in seen: seen.add(y); st.append(y)
    return seen
early = [e['key'] for e in E if e['dord'] <= 24]
best = max(itertools.combinations(early, 3), key=lambda c: (len(reach(c)), -sum(records[k]['dord'] for k in c)))
START = sorted(best, key=lambda k: records[k]['dord'])
covered = reach(START)
rng = random.Random(63)
def mask(key):
    d, c, s = key.split('-'); r = rng.random()
    return f'{d}-??-{s}' if r < .6 else (f'??-{c}-{s}' if r < .85 else f'{d}-{c}-??')
msg_lists = [[] for _ in range(5)]
order = sorted((k for k in records if k not in covered), key=lambda k: records[k]['dord'])
# assign uncovered records to messages 1..5 in dord order, extending the covered set as we go
i = 0
for k in order:
    if k in covered: continue
    # pick the message whose slot count is smallest so far among the first free ones
    mi = min(range(5), key=lambda j: (len(msg_lists[j]), j))
    msg_lists[mi].append(k); covered |= reach({k})
for lst in msg_lists: lst.sort(key=lambda k: records[k]['dord'])
unreached = set(records) - covered
assert not unreached, unreached

def bullet(keys, partial=True): return '\n'.join('·' + (mask(k) if partial else k) for k in keys)
msgs = []
for idx, (mid, text, need) in enumerate(MSGS):
    keys = msg_lists[idx] if idx < 5 else []
    txt = text.replace(f'{{M{idx+1}}}', bullet(keys)) if idx < 5 else text
    msgs.append(dict(id=mid, title='发件人不明', text=txt, refs=keys, need=need))

# ---------------- documents
zones_txt = '\n'.join(f"第{d}天 {h:02d}:00　{c}（{PLACES[c]}）" + ('　＝最终收缩' if (d, h, c) == ZONES[-1] else '') for d, h, c in ZONES)
cols = 'ABCDE'
map_txt = '\n'.join(f"[b]{r}[/b]　" + '　'.join(f"{c}{r} {PLACES[f'{c}{r}']}" for c in cols) for r in range(1, 6))
roll_names = sorted((e['v'] for e in E if e['min'] < 1440))
dead1 = len(roll_names)
docs = {}
for did, (title, src, body, secret) in DOCS.items():
    t = body.replace('{ZONES}', zones_txt).replace('{MAP}', map_txt)
    t = t.replace('{ROLL}', '、'.join(NAME[n] for n in roll_names)).replace('{DEAD}', str(dead1)).replace('{ALIVE}', str(63 - dead1))
    t = t.replace('{START}', '\n'.join(f'·[link]{k}[/link]' for k in START))
    refs = roll_keys if did == '00-ROLL' else []
    docs[did] = dict(id=did, title=title, source=src, text=t, refs=refs, final=secret, links=sorted(set(re.findall(r'\[link\](00-[A-Z]+)\[/link\]', t))))

# ---------------- solutions & hints
def manner(e): return CAUSES[e['cause']]
FLAV = {'demo': '因开幕演示，银芯被管理方强制崩解而死', 'zone': '因滞留在融灾黑潮区域，银芯被强制崩解而死', 'final': '因最终区域收缩，银芯被强制崩解而死'}
takes_event = {}
for e in E:
    for t in e.get('takes', []): takes_event.setdefault(t, e)   # item owner -> first event where somebody takes it
solutions, hints = {}, {'restore': {}, 'confirm': {}}
src_of = {}
for k, r in records.items():
    for ref in r['refs']: src_of.setdefault(ref, []).append(k)
for e in E:
    k = e['key']; v = e['v']; c = e['c']; w = e['w']
    weapon = ITEM[w] if w else '无'
    culprit = '其他' if c == 0 else ('63' if c == SHADOW else NAME[c])
    solutions[k] = dict(cause=e['cause'], causeZh=CAUSES[e['cause']], weapon=weapon, weaponNum=w, culprit=c, culpritZh=culprit)
    # restore ladder
    srcs = sorted(src_of.get(k, []), key=lambda x: records[x]['dord'])
    if srcs: s1 = f"请再仔细阅读一遍“{srcs[0]}”（{records[srcs[0]]['name']} 的记录）。"
    else:
        m = next((m for m in msgs if k in m['refs']), None)
        s1 = f"请重新阅读收到的 {m['id']}。里面写着接下来该复原的记录名的线索。" if m else "请重新阅读早晨点名与任务指示书。"
    hints['restore'][k] = [s1, f"有线索的记录里提到了人物“{NAME[v]}”和地点“{PLACES[e['cell']]}”。", f"接下来应该复原的记录是“{k}”。"]
    # confirm ladder
    h2 = ''
    if e['cause'] == 'blast': h2 = '这不是他杀。请阅读 00-CHIP 与 00-ZONE：银芯崩解的死亡，没有加害人也没有凶器。' if e.get('sub') != 'zone' else f'这不是他杀。看看“{PLACES[e["cell"]]}”被封锁的时刻（00-ZONE），再对照死亡的时间。'
    elif e['cause'] == 'accident': h2 = '这不是他杀。请阅读 00-REPORT，确认意外死亡该怎么记。'
    elif e['cause'] == 'fall' and c == 0: h2 = '这不是他杀，是本人自己跳下去的。请阅读 00-REPORT，确认自杀时该怎么记。'
    elif e['cause'] == 'poison' and c == 0: h2 = '这不是他杀，是本人亲自服下的。请阅读 00-REPORT，确认自杀时凶器如何认定。'
    elif c == SHADOW: h2 = f'凶器是“{ITEM[w]}”。它的原主早已死去，尸体所在的区块也早已封锁——谁有能力走进去取走它？名册里找不到这个人。'
    elif w == 0: h2 = '杀害时没有使用配发装备。请根据记录里的证言与描写，确认加害人——留意加害人身上带着什么。' if e['how'] == 'trait' else '杀害时没有使用配发装备，凶器记为“无”。请从记录里的证言确认加害人。'
    elif e.get('snatch'): h2 = f'凶器是“{ITEM[w]}”，原本是被害者自己的东西。加害人是从谁手里夺过来、再下手的？'
    elif w == c: h2 = f'凶器是“{ITEM[w]}”。只要在名册里核实这件装备配发给了谁，就能锁定加害人。'
    else:
        te = takes_event.get(w)
        h2 = f'凶器是“{ITEM[w]}”。它原本配发给{NAME[w]}，但此刻不在其手里——它后来到了谁的手上？' + (f'请再仔细阅读一遍“{te["key"]}”。' if te else '')
    ans = f"答案 —— 死因“{CAUSES[e['cause']]}”／ 凶器“{weapon}”／ 加害人“{culprit if c != SHADOW else '名册外的个体（黑影）'}”。"
    hints['confirm'][k] = [f"请再仔细阅读一遍“{k}”（{NAME[v]} 的记录）。", h2, ans]

# ---------------- roster
LORE = json.loads((HERE / 'data/lore.json').read_text(encoding='utf-8'))
roster = []
for n, slug, zh, realm, role, item, kind, cls in ROSTER:
    melted = (n == 50)
    img = None
    if kind == 'r' and item in cz: img = cz[item]['img']
    if kind == 'w' and item in wz: img = wz[item]['img']
    roster.append(dict(n=n, slug=slug, name=zh, realm=realm, role=role, item=item, itemClass=cls, itemImg=img, avatar=av.get(zh.replace('「', '').replace('」', '')), melted=melted, key=KEY[n], lore=LORE.get(str(n), {})))
game = dict(title='死亡游戏调查报告', subtitle='第六十三次 回溯筛选', roster=roster, places=PLACES, zones=[dict(day=d, hour=h, cell=c) for d, h, c in ZONES], causes=CAUSES,
            records=records, docs=docs, msgs=msgs, start=START, solutions=solutions, hints=hints, shadow=dict(num=SHADOW, keys=[e['key'] for e in E if e['c'] == SHADOW]),
            stats=dict(records=len(records), edges=sum(len(r['refs']) for r in records.values())))
(HERE / 'data').mkdir(exist_ok=True)
(HERE / 'data/game.json').write_text(json.dumps(game, ensure_ascii=False, indent=1), encoding='utf-8')
print('records', len(records), 'refs', game['stats']['edges'], 'start', START, 'msg lists', [len(x) for x in msg_lists])
