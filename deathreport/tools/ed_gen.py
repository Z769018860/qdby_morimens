#!/usr/bin/env python3
"""Event generator for the earlier editions (all 62 awakeners + 威廉).  The hand-written beats of the small versions (ed_62s / ed_61s) are kept as *forced* events;
everything else is generated under the same rules as ledger.validate (killer alive, weapon held, no killing inside a closed zone, one holder per item).
usage: python3 tools/ed_gen.py 62|61   -> writes tools/ed_<n>_events.py"""
import sys, random, importlib
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import ledger as L
MAIN = L.ROSTER; N = len(MAIN)
NAMES = [r[2] for r in MAIN] + ['威廉']; NUM = {nm: i + 1 for i, nm in enumerate(NAMES)}
CLS = {r[0]: r[7] for r in MAIN}; CLS[63] = 'blunt'
MURDER = {'slash', 'pierce', 'blunt', 'shoot', 'poison', 'strangle'}
SHADOW = 64
def mins(t): return L.tmin(t)
def tstr(m): d, r = divmod(m, 1440); return f'D{d + 1} {r // 60:02d}:{r % 60:02d}'
CELLS = [f'{c}{r}' for r in range(1, 6) for c in 'ABCDE']
def run(n):
    S = SPECS[n]; rng = random.Random(S['seed'])
    old = importlib.import_module(f'ed_{n}s'); oldnum = {i + 1: nm for i, nm in enumerate(old.CAST)}
    pname = {k: v for k, v in S['places'].items()}; name2cell = {v: k for k, v in pname.items()}
    oldcell = {c: name2cell[nm] for c, nm in old.PLACES.items()}
    mapn = lambda x: 0 if x == 0 else (SHADOW if x == 63 and n == 61 and False else NUM[oldnum[x]])
    forced = []
    for (t, cell, v, cause, w, c, how, kw) in old.EVENTS:
        if cause == 'blast' and kw.get('sub') != 'demo': continue            # zone / final deaths are regenerated
        cc = SHADOW if c == 63 else mapn(c)
        kw2 = dict(kw)
        if 'takes' in kw2: kw2['takes'] = [mapn(x) for x in kw2['takes']]
        forced.append(dict(t=t, cell=oldcell[cell], v=mapn(v), cause=cause, w=mapn(w), c=cc, how=how, kw=kw2))
    for (t, cell, v, cause, w, c, how, kw) in S.get('new_forced', []):
        nm = lambda x: 0 if x == 0 else (SHADOW if x == 'N' else NUM[x])
        forced.append(dict(t=t, cell=cell, v=nm(v), cause=cause, w=nm(w), c=nm(c), how=how, kw=dict(kw)))
    # zones: hourly closings, forced cells close after their last forced event, centre last
    last = {}
    for f in forced: last[f['cell']] = max(last.get(f['cell'], 0), mins(f['t']))
    start = mins(S['zone_start']); ring = lambda c: max(abs(ord(c[0]) - 67), abs(int(c[1]) - 3))
    free = [c for c in CELLS if c != 'C3' and c not in last]; rng.shuffle(free); free.sort(key=lambda c: -ring(c))
    late = sorted([c for c in last if c != 'C3'], key=lambda c: last[c])
    order = free + late
    # make sure every forced cell closes after its last event
    zones = []; t = start
    for cell in order:
        while cell in last and t <= last[cell]: t += 60
        zones.append((t, cell)); t += 60
    zones.sort()
    if 'C3' in last or S.get('close_center'): zones.append((max(t, last.get('C3', 0) + 60), 'C3'))
    closed = lambda cell, m: any(c == cell and m >= zt for zt, c in zones)
    survivor = NUM[S['survivor']]; allv = [i for i in range(1, N + 2) if i != survivor]
    fv = {f['v'] for f in forced}; extra = []
    final = S.get('final')
    if final: extra.append(dict(t=tstr(zones[-1][0]), cell='C3', v=NUM[final], cause='blast', w=0, c=0, how='none', kw=dict(sub='final'))); fv.add(NUM[final])
    pool = [v for v in allv if v not in fv]; rng.shuffle(pool)
    Zt = S['zone_deaths']; ftimes = {mins(f['t']) for f in forced} | {mins(e['t']) for e in extra}
    zcells = [z for z in zones if (z[1] != 'C3' or not final) and z[0] not in ftimes]
    zsel = rng.sample(range(len(zcells)), min(Zt, len(zcells)))
    # time slots for random events
    t0 = mins(S['start']); t1 = (zones[-1][0] if final else zones[-1][0]) + (0 if final else S['tail'])
    used = {mins(f['t']) for f in forced} | {zt for zt, _ in zones} | {mins(e['t']) for e in extra}
    M = len(pool) - len(zsel)
    times = []
    while len(times) < M:
        m = rng.randrange(t0 + 3, t1 - 1)
        if m % 60 == 0 or any(abs(m - u) < 4 for u in used | set(times)): continue
        times.append(m)
    times.sort()
    kinds = ['acc'] * S['accidents'] + ['fall'] * S['falls'] + ['psn'] * S['poison_suicides'] + ['N'] * S['n_kills']
    kinds += ['kill'] * (M - len(kinds)); rng.shuffle(kinds)
    ev_slots = [(m, 'rand', k) for m, k in zip(times, kinds)] + [(mins(f['t']), 'forced', f) for f in forced] + [(mins(e['t']), 'forced', e) for e in extra] + [(zt, 'zone', (zt, cell, i)) for i, (zt, cell) in enumerate(zcells) for zt, cell in [(zt, cell)] ]
    ev_slots.sort(key=lambda x: x[0])
    alive = set(range(1, N + 2)); held = {i: {i} for i in range(1, N + 2)}; chain = {}
    out = []; avail = list(pool)
    def open_cell(m, avoid=()):
        cs = [c for c in CELLS if not closed(c, m) and c not in avoid]; return rng.choice(cs)
    lastact = {}
    for f in forced: lastact[f['c']] = max(lastact.get(f['c'], 0), mins(f['t']))
    def pick_victim(m):
        cand = [v for v in avail if v in alive and lastact.get(v, 0) < m]; return cand[0] if cand else None
    zi = 0
    for m, typ, d in ev_slots:
        if typ == 'forced':
            f = d; out.append((f['t'], f['cell'], f['v'], f['cause'], f['w'], f['c'], f['how'], f['kw'])); alive.discard(f['v'])
            if f['kw'].get('takes'):
                for tk in f['kw']['takes']: held[f['c']].add(tk); chain[tk] = (f['how'] == 'name')
            continue
        if typ == 'zone':
            idx = zcells.index((d[0], d[1]))
            if idx not in zsel: continue
            v = pick_victim(m)
            if v is None: continue
            avail.remove(v); alive.discard(v); out.append((tstr(m), d[1], v, 'blast', 0, 0, 'none', dict(sub='zone'))); continue
        kind = d; v = pick_victim(m)
        if v is None: continue
        avail.remove(v)
        if kind == 'acc': out.append((tstr(m), open_cell(m), v, 'accident', 0, 0, 'none', {})); alive.discard(v); continue
        if kind == 'fall': out.append((tstr(m), open_cell(m), v, 'fall', 0, 0, 'none', {})); alive.discard(v); continue
        if kind == 'psn': out.append((tstr(m), open_cell(m), v, 'poison', 0, 0, 'none', dict(suicide=True))); alive.discard(v); continue
        if kind == 'N':
            out.append((tstr(m), rng.choice(CELLS), v, rng.choice(['poison', 'strangle', 'blunt']), 0, SHADOW, 'trait', {})); alive.discard(v); continue
        cs = [c for c in alive if c != v]
        armed = [c for c in cs if any(CLS[i] in MURDER for i in held[c])]
        c = rng.choice(armed) if armed and rng.random() < .75 else rng.choice(cs)
        ws = [i for i in held[c] if CLS[i] in MURDER]; kw = {}
        if ws:
            w = c if c in ws and rng.random() < .65 else rng.choice(ws); cause = CLS[w]
            how = 'item' if (w == c and rng.random() < .55) or (w != c and chain.get(w) and rng.random() < .6) else 'name'
        elif CLS[v] in MURDER and rng.random() < .4:
            w = v; cause = CLS[v]; how = 'item'; kw['snatch'] = 1
        elif rng.random() < .12: w = 0; cause = 'fall'; how = 'name'
        else: w = 0; cause = 'blunt'; how = 'name'
        if CLS[v] in MURDER and w != v and rng.random() < .5: kw['takes'] = [v]
        if w == v: kw['takes'] = [v]
        if kw.get('takes'): held[c].add(v); chain[v] = (how == 'name')
        out.append((tstr(m), open_cell(m), v, cause, w, c, how, kw)); alive.discard(v)
    out.sort(key=lambda e: mins(e[0]))
    return out, zones, S
SPECS = {
 62: dict(seed=62, new_forced=[
  ('D1 22:10', 'A4', '萝坦', 'blunt', '戈利亚', '戈利亚', 'item', {}), ('D1 22:55', 'A4', '戈利亚', 'blunt', 0, '蚀灭·萝坦', 'name', {}),
  ('D1 22:40', 'D4', '墨菲', 'blunt', '克珀珊特', '克珀珊特', 'name', {}), ('D2 01:20', 'C5', '克珀珊特', 'fall', 0, '希莱斯特', 'name', {}),
  ('D1 23:40', 'E3', '朵尔', 'slash', '熔毁·朵尔', '熔毁·朵尔', 'name', {}), ('D2 02:50', 'C4', '熔毁·朵尔', 'poison', 0, 0, 'none', dict(suicide=True)),
  ('D2 03:10', 'B3', '环行·拉蒙娜', 'strangle', '沙耶', '沙耶', 'name', {}), ('D2 05:20', 'B3', '沙耶', 'blunt', '拉蒙娜', '拉蒙娜', 'name', {}), ('D2 05:50', 'B3', '拉蒙娜', 'fall', 0, 0, 'none', {})], survivor='图鲁', start='D1 19:00', zone_start='D1 21:00', zone_deaths=14, accidents=3, falls=2, poison_suicides=2, n_kills=0, tail=300, final=None,
          places={'A1': '售票厅', 'B1': '大剧场', 'C1': '后台', 'D1': '化妆间', 'E1': '布景仓', 'A2': '排练厅', 'B2': '观众席', 'C2': '道具库', 'D2': '乐池', 'E2': '灯光架', 'A3': '门厅', 'B3': '回廊', 'C3': '钟楼门口', 'D3': '锅炉间', 'E3': '服装间', 'A4': '雪地广场', 'B4': '马车棚', 'C4': '花园', 'D4': '冰窖', 'E4': '酒窖', 'A5': '北门', 'B5': '铁路桥', 'C5': '旧工坊', 'D5': '煤堆', 'E5': '墓地入口'}),
 61: dict(seed=61, new_forced=[
  ('D1 18:50', 'A1', '卡斯托尔', 'slash', '波吕克斯', '波吕克斯', 'name', {}), ('D2 01:50', 'A1', '波吕克斯', 'fall', 0, 0, 'none', {}),
  ('D1 23:55', 'E5', '希洛', 'strangle', 0, 'N', 'trait', {}), ('D2 01:20', 'A2', '莉莉', 'poison', '弥利亚姆', '弥利亚姆', 'item', {}),
  ('D2 03:40', 'C2', '诞妄·墨菲', 'blunt', 0, '墨菲', 'name', {}),
  ('D2 01:10', 'D4', '熔毁·朵尔', 'strangle', 0, 'N', 'trait', {}), ('D2 02:10', 'D4', '朵尔', 'poison', 0, 0, 'none', dict(suicide=True)),
  ('D2 01:40', 'C4', '拉蒙娜', 'strangle', '沙耶', '沙耶', 'name', {}), ('D2 02:40', 'E1', '沙耶', 'fall', 0, 0, 'none', {})], survivor='墨菲', start='D1 18:00', zone_start='D1 19:00', zone_deaths=13, accidents=3, falls=2, poison_suicides=2, n_kills=4, tail=0, final='希莱斯特', close_center=True,
          places={'A1': '灯塔', 'B1': '码头', 'C1': '渔市', 'D1': '船坞', 'E1': '海崖', 'A2': '雾堤', 'B2': '货仓', 'C2': '酒馆', 'D2': '礁石', 'E2': '沙滩', 'A3': '旧教堂', 'B3': '鱼市', 'C3': '港务厅', 'D3': '沉船', 'E3': '防波堤', 'A4': '盐田', 'B4': '修船厂', 'C4': '渔民区', 'D4': '海关', 'E4': '货栈', 'A5': '浅滩', 'B5': '水塔', 'C5': '渡口', 'D5': '暗礁', 'E5': '观潮台'}),
}
if __name__ == '__main__':
    n = int(sys.argv[1]); ev, zones, S = run(n)
    lines = ['# -*- coding: utf-8 -*-', '# generated by tools/ed_gen.py (do not edit by hand; edit the spec and re-run)', f'PLACES = {S["places"]!r}', f'ZONES = {[(t // 1440 + 1, (t % 1440) // 60, c) for t, c in zones]!r}', 'EVENTS = [']
    for e in ev: lines.append(f' {e!r},')
    lines.append(']'); Path(__file__).with_name(f'ed_{n}_events.py').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(n, len(ev), 'events', len(zones), 'zones')
