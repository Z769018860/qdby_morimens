#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""玩家真实路径仿真：严格按前端的解锁条件走一遍，找出"走不下去"的地方。

audit.py 的可达性检查有个乐观假设——它把所有文档、消息、档案一开始就算进线索池。
实际前端不是这样：文档要靠正文里的 [link] 才点得开，消息要看已确认的份数，
残片谜题要先把两个来源都拿到，影子选项要等 MSG06 到手才出现在下拉框里。
这个脚本按真实规则重跑一遍，专查「62 份确认不完」「某份文档永远看不见」
「谜底解出来了但输入没反应」这类死锁。

  python tools/playpath.py            # 三届
  python tools/playpath.py --ed 63    # 只查一届

退出码：有 BLOCK 时为 1。
"""
import argparse
import json
import os
import re
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data')
EDS = [('63', 'game.json'), ('62', 'game-62.json'), ('61', 'game-61.json')]

REC_RX = re.compile(r'\b\d{2}-[A-E][1-5]-\d{2}\b')
CN = '零一二三四五六七八九十'


def cn2i(s):
    if s.isdigit():
        return int(s)
    out, num = 0, 0
    for ch in s:
        if ch in CN:
            num = CN.index(ch)
        elif ch == '十':
            out += (num or 1) * 10
            num = 0
        else:
            return None
    return out + num


class R:
    def __init__(self):
        self.block, self.warn, self.info = [], [], []

    def b(self, m):
        self.block.append(m)

    def w(self, m):
        self.warn.append(m)

    def i(self, m):
        self.info.append(m)

    def dump(self, title):
        mark = 'BLOCK' if self.block else ('WARN' if self.warn else 'ok')
        print(f'  [{mark:5}] {title}')
        for m in self.block:
            print(f'         BLOCK {m}')
        for m in self.warn:
            print(f'         WARN  {m}')
        for m in self.info:
            print(f'         ·     {m}')


# ---------------------------------------------------------------- 前端规则的复刻
def avail_weapons(G):
    """engine.options() 的凶器候选：融蚀且没有配发装备的人不会出现在下拉框里。"""
    return {0} | {p['n'] for p in G['roster'] if p.get('itemClass') != 'none' or not p.get('melted')}


def avail_culprits(G, shadow_ok):
    s = {0} | {p['n'] for p in G['roster']}
    if shadow_ok:
        s.add((G.get('shadow') or {}).get('num') or 63)
    return s


def can_submit(G, key, shadow_ok):
    """复刻 engine.submit()：三项都要能选中，且与答案一致。返回 (ok, 缺什么)。"""
    sol = G['solutions'][key]
    miss = []
    if sol['cause'] not in G['causes']:
        miss.append(f'死因 {sol["cause"]} 不在下拉框')
    if int(sol.get('weaponNum') or 0) not in avail_weapons(G):
        miss.append(f'凶器「{sol["weapon"]}」（{sol.get("weaponNum")}）不在下拉框')
    if int(sol.get('culprit') or 0) not in avail_culprits(G, shadow_ok):
        miss.append(f'加害人 {sol["culpritZh"]} 未解锁（需要影子选项）')
    return (not miss), miss


def shadow_gate(G):
    """影子选项什么时候出现：MSG06 到手，而它 need=50 份确认。"""
    s = (G.get('shadow') or {})
    mid = s.get('msg') or 'MSG06'
    m = next((x for x in G['msgs'] if x['id'] == mid), None)
    return (m['need'] if m else 0), mid


def walk(G, strict_shadow=True):
    """按真实规则走一遍，返回最大闭包与逐轮记录。

    关键顺序：确认数决定消息与普通档案 → 消息决定影子选项 → 影子选项决定哪些记录能提交。
    由于确认只增不减，反复迭代到不动点就是"最会玩的玩家"能到的地方。
    """
    recs = set(G['start'])
    docs = {'00-ORDER'}
    msgs = {m['id'] for m in G['msgs'] if m['need'] <= 0}
    arcs = set()
    confirmed = set()
    curve = []
    rounds = 0
    while rounds < 200:
        rounds += 1
        changed = False
        n = len(confirmed)

        for m in G['msgs']:
            if m['need'] <= n and m['id'] not in msgs:
                msgs.add(m['id'])
                changed = True
        for a in G['arcs']:
            if a['id'] in arcs:
                continue
            if a.get('hidden'):
                c = a.get('cond') or {}
                if c.get('streak'):
                    continue                      # 连着答对要看玩家手法，静态判不了
                if c.get('firstTry'):
                    # 严格路径假设一次没错，所以已确认的每一条都算首答正确
                    if len(confirmed) >= c['firstTry']:
                        arcs.add(a['id'])
                        changed = True
                    continue
                if c.get('nums') and set(c['nums']) <= {G['records'][k]['num'] for k in confirmed}:
                    arcs.add(a['id'])
                    changed = True
            elif a.get('need', 999) <= n:
                arcs.add(a['id'])
                changed = True

        for d in list(docs):
            for k in (G['docs'][d].get('links') or []):
                if k in G['docs'] and k not in docs:
                    docs.add(k)
                    changed = True
        for k in recs:
            for d in (G['records'][k].get('sys') or []):
                if d in G['docs'] and d not in docs:
                    docs.add(d)
                    changed = True

        pool = set(G['start'])
        for k in recs:
            pool |= set(G['records'][k]['refs'])
        for d in docs:
            pool |= set(G['docs'][d]['refs'])
        for mid in msgs:
            pool |= set(next(x for x in G['msgs'] if x['id'] == mid)['refs'])
        for aid in arcs:
            pool |= set(next(x for x in G['arcs'] if x['id'] == aid)['refs'])
        new = pool - recs
        if new:
            recs |= new
            curve.append(len(new))
            changed = True

        need, mid = shadow_gate(G)
        shadow_ok = (not strict_shadow) or (mid in msgs)
        for k in sorted(recs - confirmed):
            ok, _ = can_submit(G, k, shadow_ok)
            if ok:
                confirmed.add(k)
                changed = True
        if not changed:
            break
    return dict(recs=recs, docs=docs, msgs=msgs, arcs=arcs, confirmed=confirmed, curve=curve)


# ---------------------------------------------------------------- 各节检查
def check_submit(G, ed, R):
    """每条记录的三个答案是否都在下拉框里。选不中就等于这条永远确认不了。"""
    need, mid = shadow_gate(G)
    shadow_ok = mid in {m['id'] for m in G['msgs'] if m['need'] <= 0}
    no_weapon, no_culprit = [], []
    for k, s in G['solutions'].items():
        if int(s.get('weaponNum') or 0) not in avail_weapons(G):
            no_weapon.append(f'{k}（{s["weapon"]}）')
        if int(s.get('culprit') or 0) not in avail_culprits(G, shadow_ok):
            no_culprit.append(k)
    if no_weapon:
        R.b(f'{len(no_weapon)} 条记录的凶器不在下拉框里，永远提交不了：{no_weapon[:6]}')
    if no_culprit:
        R.i(f'{len(no_culprit)} 条要等影子选项（{mid}，需 {need} 份确认）才出现加害人：{no_culprit[:6]}')

    # 影子门槛能不能跨过去：不需要影子的记录够不够撑到 msg 解锁
    sh = (G.get('shadow') or {}).get('num') or 63
    no_shadow = [k for k, s in G['solutions'].items() if int(s.get('culprit') or 0) != sh]
    with_shadow = [k for k, s in G['solutions'].items() if int(s.get('culprit') or 0) == sh]
    if with_shadow:
        if len(no_shadow) < need:
            R.b(f'影子选项要 {need} 份确认才出现，但不需要影子的只有 {len(no_shadow)} 条 —— '
                f'跨不过去，{len(with_shadow)} 起影子杀人永远确认不了')
        else:
            R.i(f'影子杀人 {len(with_shadow)} 起；非影子 {len(no_shadow)} 条 ≥ 门槛 {need}，门能跨过去')
    for k in with_shadow:
        if not (G.get('shadow') or {}).get('msg'):
            R.b(f'{k} 以影子为加害人，但 shadow.msg 没配，选项永远不出现')
    R.dump('可提交性：三个答案是否都能在前端选中')


def check_paths(G, ed, R, st):
    """严格可达性：谁没走到、哪份文档永远看不见、哪条消息到不了。"""
    recs, docs, msgs, arcs = st['recs'], st['docs'], st['msgs'], st['arcs']
    lost = sorted(set(G['records']) - recs)
    if lost:
        R.b(f'{len(lost)} 条记录在严格路径下推不出来：{lost[:8]}')
    visible = {d for d, v in G['docs'].items() if not v.get('final')}
    gone = sorted(visible - docs)
    if gone:
        R.b(f'{len(gone)} 份文档永远解锁不了：{gone}')
    else:
        R.i(f'文档 {len(docs)}/{len(visible)} 全部可见（结局文档另算）')
    lost_m = [m['id'] for m in G['msgs'] if m['id'] not in msgs]
    if lost_m:
        R.b(f'消息永远到不了：{lost_m}')
    lost_a = [a['id'] for a in G['arcs'] if a['id'] not in arcs and not a.get('hidden')]
    if lost_a:
        R.b(f'普通档案永远打不开：{lost_a}')
    hid = [a for a in G['arcs'] if a.get('hidden')]
    no_cond = [a['id'] for a in hid if not (a.get('cond') or {}).get('nums')
               and not (a.get('cond') or {}).get('streak') and not (a.get('cond') or {}).get('firstTry')]
    if no_cond:
        R.i(f'只能靠输入谜底的隐藏档案：{no_cond}')

    # 线索最宽的一轮：全摊开会迷路
    if st['curve']:
        peak = max(st['curve'])
        if peak >= 0.6 * len(G['records']):
            R.w(f'最宽一轮一次摊开 {peak} 条（{peak * 100 // len(G["records"])}%），'
                f'多半是某份文档一次性给了太多线索')
    # 单份文档的线路量：点名表这类"名单"不该承当线索来源
    cap = max(4, int(0.2 * len(G['records'])))
    for d, v in G['docs'].items():
        n = len(v.get('refs') or [])
        if n > cap:
            R.w(f'文档 {d} 一次给出 {n} 条线路（{n * 100 // len(G["records"])}%），'
                f'超过 {cap} 条的上限——它是不是只该当名单用？')
    R.dump('严格可达性：记录 / 文档 / 消息 / 档案')


def check_puzzles(G, ed, R, st=None):
    """残片谜题：字源必须拿得到，否则玩家解出谜底输进去只会得到「没有回应」。"""
    ps = G.get('puzzles') or []
    if not ps:
        R.i('本届没有残片谜题')
        R.dump('残片谜题的字源')
        return
    key_of_num = {p['n']: p['key'] for p in G['roster']}
    st = st or walk(G)
    for p in ps:
        miss = puzzle_missing(G, st, p)
        if miss:
            R.b(f'{p["id"]} 的字源拿不到：{"、".join(miss)} —— 谜底算出来也没用，输入只会「没有回应」')
    hid = {a['id'] for a in G['arcs'] if a.get('hidden')}
    bypuzzle = {p['id'] for p in ps}
    only_riddle = sorted(hid - bypuzzle)
    streak = [a['id'] for a in G['arcs'] if a.get('hidden') and (a.get('cond') or {}).get('streak')]
    firsts = [a['id'] for a in G['arcs'] if a.get('hidden') and (a.get('cond') or {}).get('firstTry')]
    cond = [a['id'] for a in G['arcs'] if a.get('hidden') and (a.get('cond') or {}).get('nums')]

    # 同一个符号的同一个序号只能有一条真残片，否则玩家不知道该取哪一块的字
    rx = re.compile(r'〔([◇◆▲▽○●★☆◎▣□])([一二三四])〕(.+)')
    seen = {}
    for r in G['records'].values():
        for line in r['text'].split('\n'):
            m = rx.search(line)
            if m and '……' not in m.group(3):
                seen.setdefault((m.group(1), m.group(2)), []).append(r['key'])
    for d in G['docs'].values():
        for line in d['text'].split('\n'):
            m = rx.search(line)
            if m and '……' not in m.group(3):
                seen.setdefault((m.group(1), m.group(2)), []).append(d['id'])
    for a in G['arcs']:
        for line in a['text'].split('\n'):
            m = rx.search(line)
            if m and '……' not in m.group(3):
                seen.setdefault((m.group(1), m.group(2)), []).append(a['id'])
    for (sym, seq), where in sorted(seen.items()):
        if len(where) > 1:
            R.b(f'残片 {sym}{seq} 出现在 {len(where)} 处（{where}），玩家不知道该取哪一块')
    if only_riddle:
        R.i(f'不靠谜底、靠手法/条件拿的：{sorted(only_riddle)}'
            f'（其中条件集 {cond}，累计首答正确 {firsts}，连续答对 {streak}）')
    for a in G['arcs']:
        c = a.get('cond') or {}
        if c.get('streak'):
            R.w(f'{a["id"]} 要连续 {c["streak"]} 次首答正确才给，答错一次清零 —— '
                f'全收集和 SSS 实际上卡在这上面')
        if c.get('firstTry'):
            if c['firstTry'] > len(G['records']):
                R.b(f'{a["id"]} 要 {c["firstTry"]} 份首答正确，但全场只有 {len(G["records"])} 条记录')
            else:
                R.i(f'{a["id"]} 要累计 {c["firstTry"]} 份首答正确（同一份答错过就不再算，'
                    f'错在别的条上不清零）')
        for n in c.get('nums') or []:
            k = key_of_num.get(n)
            if not k:
                R.b(f'{a["id"]} 的条件里有名册外的编号 {n}')
            elif k not in st['recs']:
                R.b(f'{a["id"]} 的条件要 {k}，但那条推不出来')
    R.dump('残片谜题：字源与触发条件')


def check_docs_refs(G, ed, R):
    """文档正文里写的记录编号、序数、地点都必须是真的——写错了玩家找不到。"""
    bad, ordbad = [], []
    dord = {r['key']: r['dord'] for r in G['records'].values()}
    nm_rx = re.compile('|'.join(map(re.escape, sorted({p['name'] for p in G['roster']}, key=len, reverse=True))))
    for did, d in G['docs'].items():
        for m in REC_RX.finditer(d['text']):
            k = m.group(0)
            if k not in G['records']:
                bad.append(f'{did} → {k}')
        for m in re.finditer(r'第([一二三四五六七八九十百零两]{1,4})个(?:死者|死)', d['text']):
            n = cn2i(m.group(1))
            head = d['text'][max(0, m.start() - 40):m.start()]
            hits = nm_rx.findall(head)
            if hits and hits[-1] in dord and n != dord[hits[-1]]:
                ordbad.append(f'{did}：说「{hits[-1]}是第{m.group(1)}个」，实际第 {dord[hits[-1]]} 个')
    if bad:
        R.b(f'{len(bad)} 处文档指向不存在的记录：{bad[:6]}')
    if ordbad:
        R.b(f'文档里的序数不对：{ordbad[:4]}')
    # 文档里的名册人数口径：往届名册 63 人，主线 62 人，写错就是跨届吃书
    for did, d in G['docs'].items():
        for m in re.finditer(r'名册上(?:有|是)\s*([零一二三四五六七八九十百\d]+)\s*个名字', d['text']):
            n = cn2i(m.group(1))
            if n is not None and n != len(G['roster']):
                R.b(f'{did} 说名册上有 {n} 个名字，本届名册是 {len(G["roster"])} 人')
    R.dump('文档内容自洽：记录编号 / 序数')


def check_hints(G, ed, R, st=None):
    """提示的复原目标只看记录 refs 与消息，不看文档——卡在文档线索上时会指错人。"""
    recs = set(G['start'])
    docs = {'00-ORDER'}
    msgs = {m['id'] for m in G['msgs'] if m['need'] <= 0}
    # 逐步推进，找"下一步只能靠文档"的时刻
    bad = []
    for _ in range(80):
        pool = set(G['start'])
        for k in recs:
            pool |= set(G['records'][k]['refs'])
        for mid in msgs:
            pool |= set(next(x for x in G['msgs'] if x['id'] == mid)['refs'])
        new = pool - recs
        for d in list(docs):
            for x in (G['docs'][d].get('links') or []):
                if x in G['docs']:
                    docs.add(x)
        for k in recs:
            for d in (G['records'][k].get('sys') or []):
                docs.add(d)
        if not new:
            # 记录推不动了：看文档里还有没有没吃掉的线索
            docpool = set()
            for d in docs:
                docpool |= set(G['docs'][d]['refs'])
            docpool -= recs
            if docpool:
                bad.append(sorted(docpool)[:3])
                recs |= docpool
                continue
            break
        recs |= new
    if bad:
        R.w(f'有 {sum(len(x) for x in bad)} 条记录只能从文档里推出来，'
            f'而「复原提示」不查文档、会指向别的记录（第一次遇到：{bad[0]}）')
    R.dump('提示路径：复原提示会不会指错')


def puzzle_missing(G, st, p):
    """某个残片谜题的字源还差什么。空列表 = 字源齐了，谜底一解就能开。"""
    key_of_num = {x['n']: x['key'] for x in G['roster']}
    miss = []
    for src in p['src']:
        kind, v = src.split(':', 1)
        if kind == 'rec':
            k = key_of_num.get(int(v))
            if not k:
                miss.append(f'{src}（名册上没有 {v} 号）')
            elif k not in st['recs']:
                miss.append(f'{src}（{k} 推不出来）')
        elif kind == 'doc':
            if v not in st['docs'] and not (G['docs'].get(v) or {}).get('final'):
                miss.append(f'{src}（文档解锁不了）')
        elif kind == 'arc':
            if v not in st['arcs']:
                miss.append(f'{src}（档案打不开）')
    return miss


def puzzle_open(G, st):
    """字源齐全、玩家只要解出谜底就能拿到的隐藏档案。"""
    return {p['id'] for p in (G.get('puzzles') or []) if not puzzle_missing(G, st, p)}


def check_ending(G, ed, R, st):
    """结局顺序：pickEnding 取第一个满足的，need=all 要全部隐藏档案全在手。"""
    ends = G.get('endings') or []
    hid = {a['id'] for a in G['arcs'] if a.get('hidden')}
    if not ends:
        R.dump('结局可达性')
        return
    openable = puzzle_open(G, st)
    streak = {a['id']: ((a.get('cond') or {}).get('streak') or (a.get('cond') or {}).get('firstTry')) for a in G['arcs']
              if a.get('hidden') and ((a.get('cond') or {}).get('streak') or (a.get('cond') or {}).get('firstTry'))}
    reach = hid & (st['arcs'] | openable)
    R.i(f'结局按顺序判定：{[e["id"] for e in ends]}')
    R.i(f'隐藏档案（{len(hid)} 个）：条件给 {len(hid & st["arcs"])}、谜底可开 {len(openable)}、'
        f'需首答正确 {sorted(streak)}')
    for e in ends:
        need = hid if e['need'] == 'all' else set(e['need'])
        lack = need - reach
        hard = lack & set(streak)
        if lack - hard:
            R.b(f'{e["id"]}（{e["title"]}）要的 {sorted(lack - hard)} 拿不到')
        elif hard:
            R.w(f'{e["id"]}（{e["title"]}）只差 {sorted(hard)}，'
                f'要累计 {sorted(streak.values())[0]} 份首答正确')
        else:
            R.i(f'{e["id"]}（{e["title"]}）可达')
    first = ends[0]
    if first['need'] == 'all':
        R.i('全收的那条排在最前：收齐就一定走它，不会被别的结局截住')
    elif len(ends) > 1:
        R.w(f'排在最前的是 {first["id"]}，全收齐也可能被它截住')
    R.dump('结局可达性')


def check_classify(G, ed, R, st=None):
    """《死亡报告 填写规定》里写的判据，在账本上是否真的成立。

    文档与账本不符时，玩家照文档填就会错——这是最隐蔽的一类歧义，
    audit 查不出来（它只验结构），只有把文档规则逐条拿去对账才发现。
    """
    sol, recs = G['solutions'], G['records']
    closed = {(z['day'], z['hour']): z['cell'] for z in (G.get('zones') or [])}
    bad = []
    blast_zone = blast_demo = 0
    no_cul = {}
    bare = 0                       # 凶器记“无”但确有加害人（就地取材 / 徒手）
    for k, s in sol.items():
        r, cause, w, cu = recs[k], s['cause'], s['weaponNum'], s['culprit']
        minute = r['min']
        day, hour = minute // 1440 + 1, (minute // 60) % 24
        if cu and int(cu) == r['num']:
            bad.append(f'{k}: 加害人填成了死者本人（{r["name"]}）')
        if cause == 'blast':
            if cu:
                bad.append(f'{k}: 爆炸致死却填了加害人')
            if w:
                bad.append(f'{k}: 爆炸致死却填了凶器')
            if minute % 60:
                bad.append(f'{k}: 爆炸致死不在整点（{r["when"]}）—— 文档判据是“整点 + 该区正被封锁”')
            elif closed.get((day, hour)) == r['cell']:
                blast_zone += 1
            else:
                blast_demo += 1     # 开幕演示 / 自行引爆，文档已声明不受限
        elif cause == 'accident':
            if cu:
                bad.append(f'{k}: 意外死亡却填了加害人')
            if w:
                bad.append(f'{k}: 意外死亡却填了凶器')
            no_cul[cause] = no_cul.get(cause, 0) + 1
        elif not cu:
            # 无加害人却不是意外/爆炸，只剩“自杀”：按手法记，用不上配发装备
            if w:
                bad.append(f'{k}: 无加害人的自杀却填了凶器')
            no_cul[cause] = no_cul.get(cause, 0) + 1
        if not w and cu:
            bare += 1
    for f in bad[:10]:
        R.b(f)
    names = G.get('causes') or {}
    R.i(f'无加害人的死亡：爆炸 {blast_zone + blast_demo}（其中封锁区整点 {blast_zone}、'
        f'演示/自爆 {blast_demo}）、意外 {no_cul.get("accident", 0)}、'
        f'自杀按手法记为 {", ".join(f"{names.get(c, c)} {n}" for c, n in sorted(no_cul.items()) if c != "accident") or "无"}')
    if bare == 0:
        R.w('“凶器：无”却“有加害人”的记录一条都没有 —— 填写规定里对应那条说明'
            '（徒手／就地取材）在本届用不上，属于写了但不会遇到的规则')
    else:
        R.i(f'凶器记“无”、加害人照常填的记录 {bare} 条（徒手／就地取材）')
    R.dump('归类判据与填写规定对得上')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ed', default=None)
    a = ap.parse_args()
    total_block = 0
    for key, f in EDS:
        if a.ed and a.ed != key:
            continue
        G = json.load(open(os.path.join(DATA, f), encoding='utf-8'))
        print(f'\n■ 第 {key} 次　{G["edition"].get("title", "")}')
        st = walk(G)
        R0 = R()
        R0.i(f'严格路径：复原 {len(st["recs"])}/{len(G["records"])} 条，确认 {len(st["confirmed"])}/{len(G["records"])} 条，'
             f'文档 {len(st["docs"])} 份，消息 {len(st["msgs"])} 封，档案 {len(st["arcs"])} 个，共 {len(st["curve"])} 轮')
        R0.dump('总览')
        for fn in (check_submit, check_docs_refs):
            r = R()
            fn(G, key, r)
            total_block += len(r.block)
        for fn in (check_paths, check_hints, check_ending, check_puzzles, check_classify):
            r = R()
            fn(G, key, r, st)
            total_block += len(r.block)
    print('\n' + '=' * 60)
    print(f'BLOCK {total_block}')
    sys.exit(1 if total_block else 0)


if __name__ == '__main__':
    main()
