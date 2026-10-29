#!/usr/bin/env python3
"""Build data/game.json from the ledger, the prose, the documents and the main repo's assets index.
usage: python3 tools/build.py [--repo ..]   (repo = qdby_morimens main checkout, for avatars and item icons)"""
import sys, re, json, random, itertools, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import os
ED = os.environ.get('DR_ED')
from ledger import E, ROSTER, NAME, ITEM, ICLASS, PLACES, ZONES, CAUSES, SHADOW, BY_V, fmt, validate, tmin, MAIN_ROSTER
MAIN_NUM = {r[2]: r[0] for r in MAIN_ROSTER}
LORE_X = {}; AVATAR_X = {}
if ED:
    import importlib
    _m = importlib.import_module('ed_' + ED)
    from ed_common import make_docs
    from witness import WIT
    T = {}; X = {}; FLAVOR = {}; T2 = _m.PROSE; T3 = {}; EXT = {}; FRAGS = {}; ARCS = []; HIDDEN = []; ENDINGS = [_m.ENDING]; MILE = _m.MILE; ARC_SRC = ''
    PUZ_META = []; BADGES = {}; h32 = lambda x: 0; MELT = {}
    DOCS = make_docs(_m.META, len(_m.CAST), _m.OVER, _m.FINALS); MSGS = _m.MSGS
    LORE_X = getattr(_m, 'LORE_EXTRA', {}); AVATAR_X = getattr(_m, 'AVATAR_EXTRA', {})
else:
    from ledger import E, ROSTER, NAME, ITEM, ICLASS, PLACES, ZONES, CAUSES, SHADOW, BY_V, fmt, validate, tmin
    from texts import T
    from texts_extra import X, FLAVOR
    from texts_v2 import T2
    from texts_v3 import T3
    from docs import DOCS, MSGS
    from witness import WIT
    from arcs import ARCS, MILE, SRC as ARC_SRC
    from hidden import HIDDEN
    from endings import ENDINGS
    from puzzles import FRAGS, META as PUZ_META, BADGES, h32
    from texts_ext import EXT
    from melt import MELT

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
def cn(n):
    d = '零一二三四五六七八九'
    if n < 10: return d[n]
    if n < 20: return '十' + (d[n - 10] if n > 10 else '')
    return d[n // 10] + '十' + (d[n % 10] if n % 10 else '')
SECONDHAND = ['广播念过{B}的名字——{P}，第{N}个。', '{B}死在了{P}。我数过，那是第{N}个。', '有人在远处喊：{B}在{P}没了，第{N}个！', '听说{P}那边，{B}是第{N}个倒下的。',
              '{B}……在{P}。第{N}个。我把这个数字念了一遍，怕自己忘掉。',
              '我记得很清楚：{P}，{B}，第{N}个。', '无线电里的杂音间隙传来一句：{B}死在{P}，是第{N}个。',
              '名单又长了一行：{B}，{P}，第{N}个。写到这里笔尖顿了一下。',
              '有人一边走一边念：{B}、{P}、第{N}个——像在背一张乘法表。',
              '我不认识{B}，可我知道{P}，也知道那是第{N}个。',
              '“{P}那边呢？”“没了。{B}，第{N}个。”',
              '吃饭的时候听来的：{B}死在{P}，第{N}个。没有人接话。',
              '手心写的字被汗洇开了：{B}，{P}，“第{N}个”还认得出。',
              '值夜的人回来说，{P}抬走了一个，是{B}，第{N}个。',
              '我把它记在袖口：{B}，{P}，第{N}个。这几笔比我的名字要紧。',
              '有人小声说{B}，有人补了地点{P}，还有人报数：第{N}个。',
              '“第{N}个是谁？”“{B}。”“在哪儿？”“{P}。”',
              '有人在数人头：{B}，{P}……数到第{N}个就停了。',
              '{B}的事传过来时已经变了形：地点还是{P}，数没错，第{N}个。',
              '名单上添了一笔：第{N}个，{B}，{P}，字很小。',
              '有人闲谈时提过一句：{B}没了，{P}，第{N}个。',
              '有人隔着很远在报：{B}，{P}，第{N}个。声音断断续续。',
              '有人念完{B}的名字，又补了一句地点：{P}。数到第{N}个就停了。', '{MSG}']
# 原先这一格写的是“我在窗口看见{P}的方向暗了一下”。它有两个硬伤：一是把银芯崩解、
# 黑潮漫过的景象安在了被刀砍死、被勒死的人身上；二是“我在窗口”预设了观察位置，
# 而半数记录发生在溶洞、竹林、操场这种没有窗口的地方。改成“传话”的说法。
# 现在整池都只写“听来的 / 记下来的 / 有人念过”，不预设目击位置，也就不可能再套错死法。
MSG_LINES = ['消息传到这里时，只剩下一句：{B}，{P}，第{N}个。',
             '{B}，{P}，第{N}个——这几个字被人一路念了过来。',
             '第{N}个是{B}。{P}的事，传到这里就没有下文了。',
             '传到这一格只剩数字对得上：第{N}个，{B}，{P}。',
             '没有人说得清经过，只有人记得顺序：{B}，第{N}个，死在{P}。']
ACLAUSE = ['记录在案：{B}，死亡地点{P}，死亡顺序第{N}个。', '{B}——{P}——第{N}个（据广播记录）。', '{B}：{P}，第{N}个死者。']
CLAUSE_ED = ['{B}那一条，后来是{P}的广播念出来的——第{N}个。', '我记着{P}：{B}，第{N}个。顺序不会错，是我自己数的。',
             '有人从{P}那边过来，说{B}是第{N}个。', '{P}的灯灭的时候，{B}是第{N}个。',
             '清单上写着：第{N}个，{B}，{P}。', '我在{P}听见人念{B}的名字，念到“第{N}个”就停了。',
             '广播说，第{N}个是{B}，死在{P}。', '{B}，{P}，第{N}个——我把它抄在手心，怕忘。']
_SEEN = {}
for _t in SECONDHAND + CLAUSE_ED + ACLAUSE:
    if _t == '{MSG}':
        continue
    assert '{B}' in _t and '{P}' in _t and '{N}' in _t, '见证句缺字段: ' + _t
def clause(a, b, j=0):
    e = BY_V[b]
    pool = SECONDHAND
    if ED:
        t = (ACLAUSE[b % 3] if a == 0 else (pool + CLAUSE_ED)[(a * 7 + b * 3) % (len(pool) + len(CLAUSE_ED))])
    else:
        # j = 这是这条记录里的第几处见证。混进去，让同一份记录里的几句不会用同一个说法，
        # 也让“谁作证”与“用哪句”不再是一对一的死映射；同一份记录里更不许撞车。
        if a == 0:
            t = ACLAUSE[b % 3]
        else:
            idx = (a * 31 + b * 17 + a * b + j * 7) % len(pool)
            hist = _SEEN.setdefault(a, [])
            while idx in hist and len(hist) < len(pool):
                idx = (idx + 1) % len(pool)
            hist.append(idx)
            t = pool[idx]
    if t == '{MSG}':
        t = MSG_LINES[(a + b + j) % len(MSG_LINES)]
    return t.replace('{B}', NAME[b]).replace('{P}', PLACES[e['cell']]).replace('{N}', cn(e['dord']))
TOK = re.compile(r'\{(@?\d+|w:\d+|it:\d+|loc:[A-E]\d|bc:D\d-\d+|sys:[0-9A-Z-]+)\}')
def full_prose(n):
    return _prose(n) + ''.join('\n' + l for l in FRAGS.get(('rec', n), []))
def _prose(n):
    src = T3.get(n) or T2.get(n)
    if src:
        L = src.strip('\n').split('\n')
        # 融蚀段落：字被「吃掉」的那几处，插在记录中间。T3 重写过的记录不再叠 texts_ext 的追加句，
        # 那一批是按旧稿的行号写的，插进去会打断新的语序。
        if n not in T3:
            for k, txt in sorted(EXT.get(n, []), key=lambda a: -(a[0] if a[0] >= 0 else len(L) + a[0] - 1)):
                L.insert(k + 1 if k >= 0 else len(L) + k, txt)
        for k, txt in sorted(MELT.get(('rec', n), []), key=lambda a: -a[0]):
            L.insert(min(k, len(L)), txt)
        have = '\n'.join(L)
        # 只在“这条记录已经把某人的下落写全了（名字＋地点＋第几个）”时才不再补一句“听说”。
        # 光提到名字不算——那样会把推理边也一起去掉，往届就断链了。
        def keyed(b):
            e2 = BY_V[b]; cell = e2['cell']
            for ln in L:
                # 只有明文令牌才真的产生参考边（{@N} 只显示名字，不算边），所以这里只认 {N}
                hit = ('{%d}' % b in ln) and \
                      ('{loc:%s}' % cell in ln or PLACES[cell] in ln) and ('第%s个' % cn(e2['dord'])) in ln
                if hit:
                    return True
            return False
        need = [b for b in WIT.get(n, []) if '{w:%d}' % b not in have and not keyed(b)]
        if ED:
            # 往届：最多两句见证，一句放在开场之后，一句放在收尾之前，中间不要连成广播清单
            need = need[:2]
            if need:
                L.insert(min(2, len(L) - 2), '{w:%d}' % need[0])
            if len(need) > 1:
                L.insert(max(3, len(L) - 1), '{w:%d}' % need[1])
            need = []
        # 见证句统一放在开头（开场那一段回忆之后），不往正文中间插：
        # 插到中间会把对话劈成两半，读者会以为「有人隔着很远在报」是现场台词。
        base = 1
        ambi = lambda x: x.strip().startswith('开场前') or re.fullmatch(r'\{bc:D\d-\d+\}', x.strip())
        while base < len(L) and ambi(L[base]):
            base += 1
        for j, b in enumerate(need):
            L.insert(min(base + j, len(L) - 1), '{w:%d}' % b)
        return '\n'.join(L)
    L = T[n].split('\n')
    ins = list(X.get(n, []))
    if n in FLAVOR: ins.append(FLAVOR[n])
    for k, txt in sorted(ins, key=lambda a: -a[0]): L.insert(min(k + 1, len(L)), txt)
    return '\n'.join(L)
FACTS = {}
def render(n): return render_raw(full_prose(n), n)
def render_raw(src, n):
    mentions, sysrefs, wits, items, locs, bcs = [], [], [], [], [], []
    _SEEN.pop(n, None)
    def sub(m):
        t = m.group(1)
        if t.startswith('w:'): b = int(t[2:]); wits.append(b); mentions.append(b); return clause(n, b, len(wits) - 1)
        if t.startswith('it:'): items.append(int(t[3:])); return ITEM[int(t[3:])]
        if t.startswith('loc:'): locs.append(t[4:]); return PLACES[t[4:]]
        if t.startswith('bc:'): bcs.append(t[3:]); d, h = t[4:].split('-'); return bc_text(int(d), int(h))
        if t.startswith('sys:'): sysrefs.append(t[4:]); return ''
        if t.startswith('@'): return NAME[int(t[1:])]
        k = int(t); mentions.append(k); return NAME[k]
    out = TOK.sub(sub, src)
    if n: FACTS[n] = dict(names=sorted(set(mentions)), items=sorted(set(items)), locs=sorted(set(locs)), bcs=sorted(set(bcs)), wits=list(dict.fromkeys(wits)))
    return out.replace('。。', '。'), wits, sysrefs

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
    records[e['key']] = dict(key=e['key'], dord=e['dord'], cell=e['cell'], num=n, name=NAME[n], when=fmt(e['t']), min=e['min'], text=body, refs=refs, sys=list(dict.fromkeys(sysrefs)), facts=FACTS[n])

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
_lo, _hi = (28, 58) if not ED else (max(3, int(len(E) * 0.4)), len(E) - 2)
early = [e['key'] for e in E if _lo <= e['dord'] <= _hi and e['c'] != SHADOW]
best = max(itertools.combinations(early, 3), key=lambda c: (len(reach(c)), sum(records[k]['dord'] for k in c)))
START = sorted(best, key=lambda k: records[k]['dord'])
covered = reach(START)
rng = random.Random(63)
def mask(key):
    d, c, s = key.split('-'); return f'??-{c}-{s}'   # who and where; the order must be deduced (broadcasts / elimination)
NL = 5 if not ED else sum(1 for m in MSGS if '{M' in m[1])
msg_lists = [[] for _ in range(NL)]
order = sorted((k for k in records if k not in covered), key=lambda k: records[k]['dord'])
# assign uncovered records to messages 1..5 in dord order, extending the covered set as we go
i = 0
for k in order:
    if k in covered: continue
    # pick the message whose slot count is smallest so far among the first free ones
    mi = min(range(NL), key=lambda j: (len(msg_lists[j]), j))
    msg_lists[mi].append(k); covered |= reach({k})
for lst in msg_lists: lst.sort(key=lambda k: records[k]['dord'])
unreached = set(records) - covered
assert not unreached, unreached

def bc_after(key):
    e = BY_V[records[key]['num']]; H = e['min'] // 60 + 1
    return bc_text(H // 24 + 1, H % 24)
def bullet(keys, partial=True):
    out = '\n'.join('·' + (mask(k) if partial else k) for k in keys)
    tapes = list(dict.fromkeys(bc_after(k) for k in keys))
    if tapes: out += '\n\n（附：我录下的广播）\n' + '\n'.join(tapes)
    return out
msgs = []
for idx, (mid, text, need) in enumerate(MSGS):
    keys = msg_lists[idx] if idx < NL else []
    txt = text.replace(f'{{M{idx+1}}}', bullet(keys)) if idx < NL else text
    msgs.append(dict(id=mid, title='发件人不明', text=txt, refs=keys, need=need))

# ---------------- documents
zones_txt = '\n'.join(f"第{d}天 {h:02d}:00　{c}（{PLACES[c]}）" + ('　＝最终收缩' if (d, h, c) == ZONES[-1] and not ED else '') for d, h, c in ZONES)
cols = ''.join(sorted({k[0] for k in PLACES})); rows = sorted({int(k[1]) for k in PLACES})
map_txt = '\n'.join(f"[b]{r}[/b]　" + '　'.join(f"{c}{r} {PLACES[f'{c}{r}']}" for c in cols) for r in rows)
roll_names = sorted((e['v'] for e in E if e['min'] < 1440))
dead1 = len(roll_names); TOTAL = 63 if not ED else len(ROSTER)
docs = {}
for did, (title, src, body, secret) in DOCS.items():
    t = body.replace('{ZONES}', zones_txt).replace('{MAP}', map_txt)
    for fl in FRAGS.get(('doc', did), []): t = t.replace('[/sys]', fl + '\n[/sys]', 1) if '[/sys]' in t else t + '\n' + fl
    t = t.replace('{ROLL}', '、'.join(NAME[n] for n in roll_names)).replace('{DEAD}', str(dead1)).replace('{ALIVE}', str(TOTAL - dead1))
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
    # restore ladder (vague -> pointer to a source -> who and where, never the full key)
    srcs = sorted(src_of.get(k, []), key=lambda x: records[x]['dord'])
    s1 = "记录里转述别人的死时，常常同时写着地点和“第几个”。重读已经复原的记录，找找还没用上的那一句。"
    if srcs: s2 = f"有一句线索，在“{records[srcs[0]]['name']}”的记录里。"
    else:
        m = next((m for m in msgs if k in m['refs']), None)
        s2 = f"有一句线索，在你收到的 {m['id']} 里。" if m else "有一句线索，在早晨点名或任务指示书里。"
    hints['restore'][k] = [s1, s2, f"要找的人是“{NAME[v]}”，死在“{PLACES[e['cell']]}”。顺序，需要你自己数。"]
    # confirm ladder (a direction -> a narrower question -> one field of the answer)
    h2 = ''
    if e['cause'] == 'blast': h2 = '这一起，也许没有加害人。重读 00-CHIP 与 00-ZONE。'
    elif e['cause'] == 'accident': h2 = '这一起，也许没有加害人。重读 00-REPORT 里关于“过失”的部分。'
    elif e['cause'] == 'fall' and c == 0: h2 = '这一起，也许是本人的选择。重读 00-REPORT，想想“自杀”该怎么记。'
    elif e['cause'] == 'poison' and c == 0: h2 = '这一起，也许是本人的选择。重读 00-REPORT，想想“凶器”该怎么记。'
    elif c == SHADOW and w == 0: h2 = '这一起没有用到配发装备。名册里，有没有人符合记录里的描述？'
    elif c == SHADOW: h2 = '凶器的原主早已死去，那个地方也早已封锁。想一想：谁能走进去？'
    elif w == 0: h2 = '这一起没有用到配发装备。看看记录里的证言，谁和被害者有过照面？' if e['how'] != 'trait' else '这一起没有用到配发装备。留意加害人身上带着什么。'
    elif e.get('snatch'): h2 = '这件凶器本是被害者自己的东西。'
    elif w == c: h2 = '凶器是谁配发的，可以在名册里查。'
    else: h2 = '凶器不在原主手里。在这之前，它经过了谁的手？'
    ans = f"死因是“{CAUSES[e['cause']]}”。"
    hints['confirm'][k] = [f"请再仔细阅读一遍“{NAME[v]}”的记录，留意装备与人物。", h2, ans]

# ---------------- roster
LORE = json.loads((HERE / 'data/lore.json').read_text(encoding='utf-8'))
roster = []
for n, slug, zh, realm, role, item, kind, cls in ROSTER:
    melted = (n == 50 and not ED)
    img = None
    if kind == 'r' and item in cz: img = cz[item]['img']
    if kind == 'w' and item in wz: img = wz[item]['img']
    roster.append(dict(n=n, slug=slug, name=zh, realm=realm, role=role, item=item, itemClass=cls, itemImg=img, avatar=av.get(zh.replace('「', '').replace('」', '')) or AVATAR_X.get(zh), melted=melted, key=KEY.get(n, ''), lore=(LORE.get(str(MAIN_NUM[zh]), {}) if zh in MAIN_NUM else LORE_X.get(zh, {})), human=(realm == 'HUMAN')))
arcs = []
for aid, title, need, text in ARCS:
    t, wits, _ = render_raw(text + ''.join('\n' + l for l in FRAGS.get(('arc', aid), [])), 0)
    t = t.replace('{DEAD}', str(dead1)).replace('{ALIVE}', str(TOTAL - dead1))
    arcs.append(dict(id=aid, title=title, source=ARC_SRC, text=t, refs=[KEY[b] for b in dict.fromkeys(wits)], need=need))
for hid, title, cond, riddle, text in HIDDEN:
    t, wits, _ = render_raw(text, 0)
    arcs.append(dict(id=hid, title=title, source=ARC_SRC, text=t, refs=[KEY[b] for b in dict.fromkeys(wits)], need=999, hidden=True, cond=cond, riddle=riddle, badge=BADGES.get(hid, '')))
puzzles = [dict(id=m['id'], h=h32(m['answer']), src=m['src']) for m in PUZ_META]
game = dict(edition=(dict(_m.META, grid=dict(cols=cols, rows=rows, size=len(PLACES))) if ED else dict(n=63, label='第六十三次', title='死亡游戏调查报告', theme=63, grid=dict(cols='ABCDE', rows=[1, 2, 3, 4, 5], size=25))), endings=ENDINGS, puzzles=puzzles, arcs=arcs, milestones=MILE, title='死亡游戏调查报告', subtitle=(_m.META.get('subtitle') if ED else '第六十三次 回溯筛选'), roster=roster, places=PLACES, zones=[dict(day=d, hour=h, cell=c) for d, h, c in ZONES], causes=CAUSES,
            records=records, docs=docs, msgs=msgs, start=START, solutions=solutions, hints=hints, shadow=dict(num=SHADOW, keys=[e['key'] for e in E if e['c'] == SHADOW], msg=(getattr(_m, 'SHADOW_MSG', 'MSG06') if ED else 'MSG06'), label=(getattr(_m, 'SHADOW_LABEL', '') if ED else '名册外的个体（黑影）')),
            stats=dict(records=len(records), edges=sum(len(r['refs']) for r in records.values())))
(HERE / 'data').mkdir(exist_ok=True)
(HERE / ('data/game.json' if not ED else f'data/game-{ED}.json')).write_text(json.dumps(game, ensure_ascii=False, indent=1), encoding='utf-8', newline='\n')
print('records', len(records), 'refs', game['stats']['edges'], 'start', START, 'msg lists', [len(x) for x in msg_lists])
