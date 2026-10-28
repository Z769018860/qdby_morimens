#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""三份档案的审计：结构、可玩性、届内叙事矛盾、跨届吃书。

  python tools/audit.py            # 三届全查（含跨届比对）
  python tools/audit.py --ed 62    # 只查一届
  python tools/audit.py -v         # 附带难度明细

退出码：有 ERROR 时为 1。
"""
import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, '..', 'data')
EDS = [('63', 'game.json'), ('62', 'game-62.json'), ('61', 'game-61.json')]

CN = {'零': 0, '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7,
      '八': 8, '九': 9, '两': 2}


def cn2i(s):
    if s.isdigit():
        return int(s)
    sect = num = 0
    for ch in s:
        if ch in CN:
            num = CN[ch]
        elif ch == '十':
            sect += (num or 1) * 10
            num = 0
        elif ch == '百':
            sect += (num or 1) * 100
            num = 0
        else:
            return None
    return sect + num


class Report:
    def __init__(self):
        self.errors = []
        self.warns = []
        self.notes = []

    def err(self, ed, msg):
        self.errors.append((ed, msg))

    def warn(self, ed, msg):
        self.warns.append((ed, msg))

    def note(self, ed, msg):
        self.notes.append((ed, msg))

    def section(self, name, ed, rows):
        mark = 'ERROR' if any(r[0] == 'ERROR' for r in rows) else ('WARN' if any(r[0] == 'WARN' for r in rows) else 'ok')
        print(f'  [{mark:5}] {name}')
        for sev, msg in rows:
            if sev == 'INFO' and not VERBOSE:
                continue
            print(f'         {sev:4} {msg}')
            if sev == 'ERROR':
                self.errors.append((ed, msg))
            elif sev == 'WARN':
                self.warns.append((ed, msg))


VERBOSE = False


def norm(text):
    return ''.join(c for c in text if c not in '\n\r\t ')


def mentions(text, name, rx):
    """正文是否真的写了某个名字（用最长匹配，避免「克珀珊特」被当成「珊」）。"""
    return name in set(rx.findall(text))


def body_only(text):
    """去掉「开场前……」这类回忆段——那一句是交代在场证明（谁在开场前还活着），
    不是指认凶手，里面的名字不该算作「正文泄露了凶手」。"""
    return '\n'.join(l for l in text.split('\n') if not l.lstrip().startswith('开场前'))


def same_self(a, b):
    """同一角色的不同相：蚀灭·萝坦 / 萝坦、熔毁·朵尔 / 朵尔。
    第一人称记录里认出「我自己」不算提示泄露，这种记录也不该按「点名凶手」判。"""
    core = lambda s: (s or '').split('·')[-1]
    return a != b and core(a) == core(b)


# ---------------------------------------------------------------- 届内结构
def check_structure(G, ed, R, HOW):
    rows = []
    recs = G['records']
    names = {r['name']: r for r in recs.values()}
    places = G['places']

    if len(recs) != 62:
        rows.append(('ERROR', f'记录数 {len(recs)}，应为 62'))
    dords = sorted(r['dord'] for r in recs.values())
    if dords != list(range(1, len(recs) + 1)):
        rows.append(('ERROR', '死亡顺序 dord 不是 1..62 的连续编号'))
    for k, r in recs.items():
        want = f"{r['dord']:02d}-{r['cell']}-{r['num']:02d}"
        if k != want:
            rows.append(('ERROR', f'{k}: 记录名与 dord/cell/num 不一致（应为 {want}）'))
        if r['cell'] not in places:
            rows.append(('ERROR', f'{k}: 地点 {r["cell"]} 不在本届地图上'))
        if r['key'] != k:
            rows.append(('ERROR', f'{k}: 记录里的 key 字段是 {r["key"]}'))
    order = sorted(recs.values(), key=lambda r: r['min'])
    for a, b in zip(order, order[1:]):
        if a['min'] >= b['min']:
            rows.append(('ERROR', f'{a["key"]} 与 {b["key"]} 死亡时刻重复或倒序'))
    days = {r['min'] // 1440 + 1 for r in recs.values()}
    if max(days) > 3:
        rows.append(('ERROR', f'出现第 {max(days)} 天，超出设计的三天'))

    # 名册：一人一条，只有一名幸存者
    nums = [r['num'] for r in recs.values()]
    if len(set(nums)) != len(nums):
        dup = [n for n, c in Counter(nums).items() if c > 1]
        rows.append(('ERROR', f'同一名册编号出现了多份记录：{dup}'))
    roster_nums = {p['n'] for p in G['roster']}
    roster_rx = re.compile('|'.join(map(re.escape, sorted({p['name'] for p in G['roster']}, key=len, reverse=True))))
    stray = set(nums) - roster_nums
    if stray:
        rows.append(('ERROR', f'记录里的名册编号不在名册上：{sorted(stray)}'))
    alive = sorted(roster_nums - set(nums))
    want_alive = 0 if ed == '63' else 1   # 第六十三次：名册上的人全死了（多出来的是名册外的第 63 位）
    if len(alive) != want_alive:
        rows.append(('ERROR', f'幸存者 {len(alive)} 人（{[p["name"] for p in G["roster"] if p["n"] in alive]}），应为 {want_alive} 人'))
    else:
        rows.append(('INFO', '名册上没有人活下来（多出来的那一个不在名册上）' if want_alive == 0
                     else f'幸存者：{[p["name"] for p in G["roster"] if p["n"] in alive][0]}（名册 {alive[0]}）'))

    # 正文
    for k, r in recs.items():
        t = r['text']
        if '{' in t or '}' in t:
            rows.append(('ERROR', f'{k}: 正文残留未渲染的花括号'))
        if len(norm(t)) < 150:
            rows.append(('ERROR', f'{k}: 正文过短（{len(norm(t))} 字）'))
        f = r['facts']
        plc = places[r['cell']]
        if r['cell'] not in f['locs'] and plc not in t and plc[-2:] not in t:
            rows.append(('ERROR', f'{k}: 正文没有交代自己死在 {r["cell"]}（{plc}）'))
        sol = G['solutions'][k]
        if sol['weaponNum']:
            it = G['roster'][sol['weaponNum'] - 1]['item']
            if it not in t and it != '（融蚀）':
                rows.append(('ERROR', f'{k}: 凶器「{it}」没有在正文里出现'))
        if sol['culprit'] and sol['culprit'] != G['shadow']['num']:
            nm = G['roster'][sol['culprit'] - 1]['name']
            how = (HOW.get(k) or {}).get('how')
            named = mentions(t, nm, roster_rx)
            if how == 'name' and not named:
                rows.append(('ERROR', f'{k}: 这一起应当点名凶手，但正文没写 {nm}'))
            elif how in ('item', 'trait', 'shadow') and named:
                # 两种不算泄露：一是凶手就是死者本人的另一相，二是名字只出现在开场前的回忆段里
                if same_self(nm, r['name']) or not mentions(body_only(t), nm, roster_rx):
                    pass
                else:
                    sev = 'WARN' if ed == '63' else 'ERROR'
                    rows.append((sev, f'{k}: 这一起应该靠物证／行为推断凶手，正文却直接写了 {nm}'))
        # 正文提到的名字都必须是名册上的人
        for n in f['names']:
            if n not in roster_nums:
                rows.append(('ERROR', f'{k}: 正文提到名册外的编号 {n}'))

    # refs
    for k, r in recs.items():
        for t in r['refs']:
            if t == k:
                rows.append(('ERROR', f'{k}: refs 指向自己'))
            elif t not in recs:
                rows.append(('ERROR', f'{k}: refs 指向不存在的记录 {t}'))
            elif recs[t]['min'] >= r['min']:
                rows.append(('ERROR', f'{k}: refs 指向未来才死的 {recs[t]["name"]}（{t}）'))
    # 可达性
    known, steps = set(G['start']), 0
    pool = set()
    for s in G['start']:
        pool |= set(recs[s]['refs'])
    for d in G['docs'].values():
        pool |= set(d['refs'])
    for m in G['msgs']:
        pool |= set(m['refs'])
    for a in G['arcs']:
        pool |= set(a['refs'])
    while True:
        new = pool - known
        if not new:
            break
        known |= new
        pool = set()
        for k in known:
            pool |= set(recs[k]['refs'])
        steps += 1
    lost = set(recs) - known
    if lost:
        rows.append(('ERROR', f'{len(lost)} 条记录无法从起始线索推导：{sorted(lost)[:6]}'))

    # 提示与里程碑
    miss_r = [k for k in recs if k not in G['hints']['restore'] or len(G['hints']['restore'][k]) != 3]
    miss_c = [k for k in recs if k not in G['hints']['confirm'] or len(G['hints']['confirm'][k]) != 3]
    if miss_r:
        rows.append(('ERROR', f'{len(miss_r)} 条记录缺三级复原提示：{miss_r[:4]}'))
    if miss_c:
        rows.append(('ERROR', f'{len(miss_c)} 条记录缺三级核实提示：{miss_c[:4]}'))
    for k in recs:
        for i, h in enumerate(G['hints']['restore'].get(k, [])[:2]):
            if k in h:
                rows.append(('ERROR', f'{k}: 第 {i + 1} 级复原提示直接给出了记录名'))
    if len(G['milestones']) != len(recs) // 3:
        rows.append(('WARN', f'共鸣次数 {len(G["milestones"])}，每 3 份报告一次应为 {len(recs) // 3}'))
    need = [m['need'] for m in G['msgs']]
    if need != sorted(need) or max(need) > len(recs):
        rows.append(('ERROR', f'消息送达门槛 {need} 不是升序或超出记录数'))
    R.section('结构 / 记录名 / 参考图 / 提示', ed, rows)


# ---------------------------------------------------------------- 届内叙事
def check_narrative(G, ed, R):
    rows = []
    recs = G['records']
    roster = G['roster']
    nm_rx = re.compile('|'.join(map(re.escape, sorted({p['name'] for p in roster}, key=len, reverse=True))))
    dord = {r['name']: r['dord'] for r in recs.values()}
    dmin = {r['name']: r['min'] for r in recs.values()}
    zh = {v: k for k, v in G['places'].items()}
    zset = {(z['hour'], z['cell']) for z in G['zones']}
    shadow = G['shadow']['num']

    # 1. 广播：报的人数与名单必须能在某个整点被账本复现
    n_bc = 0
    for r in recs.values():
        for m in re.finditer(r'“目前已死亡(\d+)人。(?:新增的死者：([^。]+)。|上一个小时没有新增的死者。)”', r['text']):
            n_bc += 1
            total = int(m.group(1))
            listed = [x for x in (m.group(2) or '').split('、') if x]
            ok, near = False, None
            order = sorted(recs.values(), key=lambda x: x['min'])
            for t in range(60, r['min'] + 1, 60):
                dead = [e for e in order if e['min'] < t]
                new = [e for e in order if t - 60 <= e['min'] < t]
                if total == len(dead) and [e['name'] for e in new] == listed:
                    ok = True
                    break
                near = (t // 60, len(dead), [e['name'] for e in new])
            if not ok:
                rows.append(('ERROR', f'{r["key"]} {r["name"]}: 广播「已死亡{total}人／{("、".join(listed)) or "无新增"}」在任何整点都对不上'
                                       f'（最接近：第{near[0] // 24 + 1}天{near[0] % 24:02d}点 {near[1]}人 {near[2]}）'))
    rows.append(('INFO', f'广播引用 {n_bc} 处'))

    # 2. 封锁区块：地名必须在地图上，且该整点确实是它被封锁
    n_z = 0
    for r in recs.values():
        for m in re.finditer(r'([零一二三四五六七八九十]{1,3})点整，(.{1,10}?)区域封锁', r['text']):
            n_z += 1
            h = cn2i(m.group(1))
            cell = zh.get(m.group(2))
            if cell is None:
                rows.append(('ERROR', f'{r["key"]}: 广播说的是地图上不存在的地方「{m.group(2)}」'))
            elif (h, cell) not in zset:
                rows.append(('ERROR', f'{r["key"]}: {h} 点封锁 {m.group(2)}（{cell}），但封锁表里没有这一格'))
            elif not any(z['cell'] == cell and z['hour'] == h and (z['day'] - 1) * 1440 + h * 60 <= r['min'] for z in G['zones']):
                rows.append(('ERROR', f'{r["key"]}: 引用了还没发生的封锁（{h} 点，{m.group(2)}）'))
    rows.append(('INFO', f'封锁引用 {n_z} 处'))

    # 3. “第 N 个” 必须等于被点名者的死亡顺序
    n_ord = 0
    for r in recs.values():
        for m in re.finditer(r'第([一二三四五六七八九十百零两\d]{1,4})个(?=[。，、！？—…」』\s])', r['text']):
            n = cn2i(m.group(1))
            head = r['text'][max(0, m.start() - 30):m.start()]
            hits = nm_rx.findall(head)
            if not hits or hits[-1] not in dord:
                continue
            who = hits[-1]
            n_ord += 1
            if dord[who] != n:
                rows.append(('ERROR', f'{r["key"]} {r["name"]}: 说「{who}，第{m.group(1)}个」，'
                                       f'但 {who} 是第 {dord[who]} 个死的'))
    rows.append(('INFO', f'“第 N 个”引用 {n_ord} 处'))

    # 4. 死者不能当活人：正文里“我杀了 X”“X 死了”时 X 必须已经死了
    n_k = 0
    for r in recs.values():
        for sen in re.split(r'[。！？\n]', r['text']):
            for m in re.finditer(r'(?:杀|害|弄|整)了?(?:死)?(' + nm_rx.pattern + r')|(' + nm_rx.pattern + r')(?:已经)?(?:被|死|的尸体|倒下了|没能)', sen):
                who = m.group(1) or m.group(2)
                if who == r['name'] or who not in dmin:
                    continue
                n_k += 1
                if dmin[who] > r['min']:
                    rows.append(('ERROR', f'{r["key"]} {r["name"]}: 正文把「{who}」当成已死的人，'
                                           f'但 {who} 要到第 {dmin[who] // 1440 + 1} 天才死'))
    rows.append(('INFO', f'“已死的人”引用 {n_k} 处'))

    # 5. 影子：只在本届真的出现时才能当加害人
    cul = Counter(s['culprit'] for s in G['solutions'].values())
    if cul.get(shadow) and not G['shadow']['keys']:
        rows.append(('ERROR', f'有 {cul[shadow]} 份报告以影子为加害人，但本届没有影子的记录'))
    if G['shadow']['keys'] and not G['shadow']['label']:
        rows.append(('WARN', '本届有影子加害人，但没有给影子写选项名（shadow.label 为空）'))
    if shadow in {p['n'] for p in roster}:
        rows.append(('ERROR', f'影子的编号 {shadow} 与名册上的人撞号'))
    for k in G['shadow']['keys']:
        if k not in recs:
            rows.append(('ERROR', f'shadow.keys 里的 {k} 不存在'))
    if G['shadow']['keys']:
        bad = [k for k in G['shadow']['keys'] if G['solutions'][k]['culprit'] != shadow]
        if bad:
            rows.append(('ERROR', f'shadow.keys 里的记录不是影子杀的：{bad}'))
        notin = [k for k, s in G['solutions'].items() if s['culprit'] == shadow and k not in G['shadow']['keys']]
        if notin:
            rows.append(('ERROR', f'影子杀的记录没有进 shadow.keys：{notin}'))

    # 6. 无加害人的死因不能有加害人；有加害人的死因不能是“其他”
    for k, s in G['solutions'].items():
        if s['cause'] in ('blast', 'accident') and s['culprit']:
            rows.append(('ERROR', f'{k}: {s["causeZh"]} 不该有加害人'))
        if s['cause'] in ('slash', 'pierce', 'blunt', 'shoot', 'strangle') and not s['culprit']:
            rows.append(('ERROR', f'{k}: {s["causeZh"]} 没有加害人'))
        if s['weaponNum'] and s['culprit'] and s['weaponNum'] != s['culprit'] and s['culprit'] != shadow:
            rows.append(('INFO', f'{k}: 加害人用的是别人的装备（{G["roster"][s["weaponNum"] - 1]["item"]}）'))
    R.section('届内叙事：广播 / 封锁 / 序数 / 死者言行 / 影子', ed, rows)


# ---------------------------------------------------------------- 难度
def check_metrics(G, ed, R):
    recs = G['records']
    rows = []

    def simulate():
        """按真实节奏模拟：起始记录 + 00-ORDER 起步；文档靠正文里的 00- 引用解锁，消息与档案靠已确认数解锁。"""
        known = set(G['start'])
        docs = {'00-ORDER'}
        msgs = {m['id'] for m in G['msgs'] if m['need'] <= 0}
        curve, batches = [], []
        while len(known) < len(recs):
            pool = set()
            for k in known:
                pool |= set(recs[k]['refs'])
            for d in docs:
                pool |= set(G['docs'][d]['refs'])
            for mid in msgs:
                m = next(x for x in G['msgs'] if x['id'] == mid)
                pool |= set(m['refs'])
            avail = pool - known
            if not avail:
                break
            curve.append(len(avail))
            batches.append(sorted(avail))
            known |= avail
            n = len(known)
            for m in G['msgs']:
                if m['need'] <= n:
                    msgs.add(m['id'])
            for k in known:
                docs |= set(recs[k]['sys'])
            for d in list(docs):
                docs |= set(G['docs'][d].get('links') or [])
        return curve, batches, docs

    curve, batches, docs = simulate()
    lens = sorted(len(norm(r['text'])) for r in recs.values())
    cul = Counter(s['culpritZh'] for s in G['solutions'].values())
    cause = Counter(s['causeZh'] for s in G['solutions'].values())
    pointed = set()
    for r in recs.values():
        pointed |= set(r['refs'])
    for m in G['msgs']:
        pointed |= set(m['refs'])
    for d in G['docs'].values():
        pointed |= set(d['refs'])
    zero_in = len(set(recs) - pointed)
    span = (max(r['min'] for r in recs.values()) - min(r['min'] for r in recs.values())) / 60
    med = sorted(curve)[len(curve) // 2] if curve else 0

    rows.append(('INFO', f'起始 {len(G["start"])} 条 → 62 条；共 {len(curve)} 轮，'
                         f'每轮可推 最多 {max(curve) if curve else 0} / 中位 {med} 条'))
    rows.append(('INFO', f'没人指向、只能靠排除法或起始键的记录 {zero_in} 条；'
                         f'解锁的系统文档 {len(docs)}/{len(G["docs"])}'))
    rows.append(('INFO', f'正文长度 最短 {lens[0]} / 中位 {lens[len(lens) // 2]} / 最长 {lens[-1]} 字'))
    rows.append(('INFO', f'死亡时间跨度 {span:.0f} 小时，平均每小时 {len(recs) / max(span, 1):.1f} 人'))
    rows.append(('INFO', f'死因 {dict(cause.most_common())}'))
    rows.append(('INFO', f'加害人 {dict(cul.most_common(5))}'))
    peak = max(curve or [0])
    # 按比例看：62 条规模下「一次可推十几条」是正常节奏，一次摊开八成以上才算失控
    if peak / len(recs) > 0.8:
        rows.append(('WARN', f'某一轮同时可推 {peak} 条（{peak * 100 // len(recs)}%），玩家容易失去方向'))
    elif peak / len(recs) > 0.5:
        rows.append(('INFO', f'最宽的一轮可推 {peak}/{len(recs)} 条（{peak * 100 // len(recs)}%）：进得宽、收得慢，适合自由探索'))
    if lens[0] < 180:
        rows.append(('WARN', f'最短的记录只有 {lens[0]} 字，信息量可能不足'))
    R.section('可玩性与难度（只报告，不判错）', ed, rows)
    if VERBOSE:
        for i, b in enumerate(batches[:6]):
            print(f'         · 第 {i + 1} 轮可推 {len(b)} 条：{b[:8]}{"…" if len(b) > 8 else ""}')


# ---------------------------------------------------------------- 跨届
def check_cross(gs, R):
    rows = []
    main, e62, e61 = gs['63'], gs['62'], gs['61']

    # 名册本体
    base = {p['n']: p for p in main['roster']}
    for key, G in (('62', e62), ('61', e61)):
        now = {p['n']: p for p in G['roster']}
        for n, p in base.items():
            q = now.get(n)
            if not q:
                rows.append(('ERROR', f'{key} 届名册缺第 {n} 号 {p["name"]}'))
                continue
            if q['name'] != p['name']:
                rows.append(('ERROR', f'第 {n} 号在主线是 {p["name"]}，在 {key} 届是 {q["name"]}'))
            if q['item'] != p['item']:
                rows.append(('ERROR', f'{p["name"]} 的装备在主线是「{p["item"]}」，在 {key} 届是「{q["item"]}」'))
            for f in ('性别', '生日', '身高', '唤醒台词'):
                a, b = (p.get('lore') or {}).get(f), (q.get('lore') or {}).get(f)
                if a and b and a != b:
                    rows.append(('ERROR', f'{p["name"]} 的「{f}」两届不一致：{a} / {b}'))
        extra = sorted(set(now) - set(base))
        if extra != [63]:
            rows.append(('ERROR', f'{key} 届名册比主线多了 {extra}，应当只有第 63 号威廉'))
        else:
            w = now[63]
            if w['name'] != '威廉' or w['item'] != '融蚀观测仪':
                rows.append(('ERROR', f'{key} 届第 63 号应为威廉／融蚀观测仪，实际是 {w["name"]}／{w["item"]}'))
            if key == '61' and not w.get('human'):
                rows.append(('ERROR', f'第六十一次的威廉还是人类（胸口没有银芯），human 应为 true'))
    if any(p['name'] == '威廉' for p in main['roster']):
        rows.append(('ERROR', '主线名册不该有威廉：他是往届加进去的名字'))

    # 幸存者链条
    def survivor(G):
        got = {r['num'] for r in G['records'].values()}
        left = [p['name'] for p in G['roster'] if p['n'] not in got]
        return left[0] if len(left) == 1 else None
    s62, s61 = survivor(e62), survivor(e61)
    if s62 != '图鲁':
        rows.append(('ERROR', f'第六十二次的幸存者应为图鲁（主线里他已被融蚀），实际是 {s62}'))
    if s61 != '墨菲':
        rows.append(('ERROR', f'第六十一次的幸存者应为墨菲（她的胸口里孵出了别的东西），实际是 {s61}'))
    melt = [p['name'] for p in main['roster'] if p['melted']]
    if melt != ['图鲁']:
        rows.append(('ERROR', f'主线被融蚀的应当只有图鲁，实际是 {melt}'))
    if [p['name'] for p in e62['roster'] if p['melted']]:
        rows.append(('ERROR', '第六十二次不该有人被融蚀（图鲁这一届活到了最后）'))

    # 威廉：61 死在下注者手里，62 作为唤醒体回来
    k61 = next((k for k, r in e61['records'].items() if r['name'] == '威廉'), None)
    k62 = next((k for k, r in e62['records'].items() if r['name'] == '威廉'), None)
    if not k61 or not k62:
        rows.append(('ERROR', '威廉在 61 / 62 届都应有一份记录'))
    else:
        if e61['solutions'][k61]['culprit'] != e61['shadow']['num']:
            rows.append(('ERROR', '第六十一次：威廉应当死在名册外的下注者手里'))
        if e62['solutions'][k62]['culprit'] == e62['shadow']['num']:
            rows.append(('ERROR', '第六十二次没有下注者，威廉不该死在影子手里'))
        if '没有银芯' not in e61['records'][k61]['text']:
            rows.append(('ERROR', '第六十一次：威廉的正文应说明他胸口没有银芯'))
        if '死过一次' not in e62['records'][k62]['text']:
            rows.append(('ERROR', '第六十二次：威廉的正文应说明他死过一次'))

    # 影子编号与出场
    if main['shadow']['num'] != 63 or len(main['shadow']['keys']) != 9:
        rows.append(('ERROR', f'主线的影子应是第 63 位的 9 起，实际 {main["shadow"]["num"]}／{len(main["shadow"]["keys"])}'))
    if e62['shadow']['keys']:
        rows.append(('ERROR', '第六十二次的观察记录写着“没有人邀请 N”，不该有影子的记录'))
    if len(e61['shadow']['keys']) != 8:
        rows.append(('WARN', f'第六十一次影子杀了 {len(e61["shadow"]["keys"])} 人（设计上应为 8）'))

    # 人数口径：boot / 00-ORDER / 00-ROLL 与名册
    for key, G in gs.items():
        n = len(G['roster'])
        boot = ' '.join(G['edition'].get('boot') or [])
        m = re.search(r'参加者：([零一二三四五六七八九十百]+)名', boot)
        if m and cn2i(m.group(1)) != n:
            rows.append(('ERROR', f'{key} 届 boot 说参加者 {m.group(1)}名，名册上是 {n} 人'))
        order = G['docs'].get('00-ORDER', {}).get('text', '')
        m = re.search(r'参加者唤醒体([零一二三四五六七八九十百]+)名', order)
        if m and cn2i(m.group(1)) != n:
            rows.append(('ERROR', f'{key} 届 00-ORDER 说参加者 {m.group(1)}名，名册上是 {n} 人'))
        roll = G['docs'].get('00-ROLL', {}).get('text', '')
        md, ma = re.search(r'死亡　(\d+) 名', roll), re.search(r'现存　(\d+) 名', roll)
        if md and ma:
            tot = int(md.group(1)) + int(ma.group(1))
            order2 = sorted(G['records'].values(), key=lambda r: r['min'])
            day1 = [r['name'] for r in order2 if r['min'] < 1440]
            m2 = re.search(r'第一天的死者[^\n]*\n(.+)', roll)
            listed = [x.strip() for x in re.split(r'、', m2.group(1))] if m2 else []
            if set(listed) != set(day1):
                rows.append(('ERROR', f'{key} 届 00-ROLL 的第一天死者名单与账本不一致'
                                       f'（多 {sorted(set(listed) - set(day1))}，缺 {sorted(set(day1) - set(listed))}）'))
            if int(md.group(1)) != len(day1):
                rows.append(('ERROR', f'{key} 届 00-ROLL 说第一天死 {md.group(1)} 人，账本是 {len(day1)} 人'))
            if tot == n:
                rows.append(('INFO', f'{key} 届点名 死亡+现存 = {tot} = 名册 {n}，没有多出来的人'))
            elif tot == n + 1:
                rows.append(('INFO', f'{key} 届点名 死亡+现存 = {tot}，比名册多 1 —— 这是“多出来的那个人”的线索'))
            else:
                rows.append(('ERROR', f'{key} 届点名 死亡+现存 = {tot}，与名册 {n} 人对不上'))

    # 届别标注
    for key, G in gs.items():
        ed = G['edition']
        if str(ed['n']) != key:
            rows.append(('ERROR', f'数据文件名对应第 {key} 次，edition.n 却是 {ed["n"]}'))
        if ed['n'] != 63 and ed['label'] not in G['subtitle']:
            rows.append(('ERROR', f'{key} 届的 subtitle「{G["subtitle"]}」还写着别的届'))
    R.section('跨届一致性（吃书检查）', '跨届', rows)


# ---------------------------------------------------------------- ledger
def ledger_errors(key):
    env = dict(os.environ)
    if key != '63':
        env['DR_ED'] = key
    else:
        env.pop('DR_ED', None)
    p = subprocess.run([sys.executable, 'ledger.py'], cwd=HERE, env=env,
                       capture_output=True, text=True, encoding='utf-8')
    return [ln.strip('  !\n') for ln in (p.stdout or '').splitlines() if ln.startswith('  !')]


def ledger_how(key):
    """从账本取出每起死亡的取证方式（how）：name=正文点名凶手，item/trait/shadow=只能靠物证或行为推。"""
    env = dict(os.environ)
    if key != '63':
        env['DR_ED'] = key
    else:
        env.pop('DR_ED', None)
    code = ('import json,ledger as L;'
            'print(json.dumps({e["key"]:dict(how=e["how"],c=e["c"],w=e["w"],sub=e.get("sub")) for e in L.E}))')
    p = subprocess.run([sys.executable, '-c', code], cwd=HERE, env=env,
                       capture_output=True, text=True, encoding='utf-8')
    try:
        return json.loads(p.stdout)
    except Exception:
        return {}


def main():
    global VERBOSE
    ap = argparse.ArgumentParser()
    ap.add_argument('--ed', default=None, help='63 / 62 / 61')
    ap.add_argument('-v', '--verbose', action='store_true')
    a = ap.parse_args()
    VERBOSE = a.verbose

    gs = {}
    for key, f in EDS:
        if a.ed and a.ed != key:
            continue
        gs[key] = json.load(open(os.path.join(DATA, f), encoding='utf-8'))

    R = Report()
    for key, _ in EDS:
        if key not in gs:
            continue
        G = gs[key]
        print(f'\n■ 第 {key} 次　{G["edition"].get("title", "")}')
        le = ledger_errors(key)
        print(f'  [{"ERROR" if le else "ok":5}] 账本自检（ledger.py：死者不重复、凶手当时还活着、装备流转）')
        for x in le:
            print(f'         ERROR {x}')
            R.err(key, x)
        check_structure(G, key, R, ledger_how(key))
        check_narrative(G, key, R)
        check_metrics(G, key, R)
        R.notes = []
    if len(gs) == 3:
        print('\n■ 三届对照')
        check_cross(gs, R)

    print('\n' + '=' * 60)
    print(f'ERROR {len(R.errors)}　WARN {len(R.warns)}')
    for ed, m in R.errors:
        print(f'  ! {ed} {m}')
    if not VERBOSE:
        for ed, m in R.warns[:20]:
            print(f'  ~ {ed} {m}')
    sys.exit(1 if R.errors else 0)


if __name__ == '__main__':
    main()
