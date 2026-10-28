# -*- coding: utf-8 -*-
"""Prose for the earlier editions: forced beats keep their hand-written records (re-numbered), everything else is composed from place flavour, the awakener's own voice lines and scene templates."""
import re, json
from pathlib import Path
from ed_voices import VOICE, PLACEFLAV
CNH = '零一二三四五六七八九'
def cnh(h): return CNH[h] if h < 10 else ('十' if h < 20 else '二十') + (CNH[h % 10] if h % 10 else '')
REALM = {'CHAOS': '混沌', 'CARO': '血肉', 'AEQUOR': '深海', 'ULTRA': '超维', 'HUMAN': '人类'}
ROLE = {'ASSAULT': '突击者', 'WARDEN': '守护者', 'CHORUS': '合唱者', 'INV': '调查员'}
APPROACH = ['阴影里', '门后', '人群的缝隙里', '雾气深处', '一排排空座位后面', '很远的地方']
DIAL = [('你看了我一眼。', '我只是路过。'), ('只能有一个人走出去。', '我们可以一起活下来。'), ('对不起。', '你不用道歉。'), ('你的东西，我需要。', '我没有什么能给你。'), ('别动。', '我没有武器。'),
        ('你不该在这里。', '这里，谁都不该在。'), ('我有一个必须见的人。', '那就去见。'), ('我想活着回去。', '我也一样。'), ('这是命令。', '谁的命令？'), ('很快的。', '我知道。')]
DEATH = {
 'slash': ['刀锋从肋下划过去，凉的。', '刀光一闪，我连自己的血都没来得及看见。', '那一刀很轻，像在裁一张纸。'],
 'pierce': ['尖端从胸口刺进来，很细，很准。', '我低头，看见一截冰冷的东西，从身体里长了出来。', '针一样的疼，从肋间一路蔓延到喉咙。'],
 'blunt': ['第一下，我还听得见骨头的声音，第二下就什么也听不见了。', '后脑一阵很重的闷响，世界忽然歪了。', '钝痛从头顶落下来，像一口很沉的钟。'],
 'shoot': ['白光穿过胸口，没有声音。', '两声，整齐得像鸣礼炮。', '一道光，把我钉在了原地。'],
 'poison': ['杯沿很苦，然后是甜，然后是什么都尝不出来了。', '指尖先麻，舌头像被什么咬住了。', '凉意一路爬到喉咙，视线里只剩碎光。'],
 'strangle': ['一圈，两圈，扣紧。', '我抓着那条缠在脖子上的东西，指甲劈开了。', '呼吸一下一下变轻，像潮水退去。'],
 'fall': ['脚下的栏杆比想象的矮，我看着头顶的东西一点点后退。', '有人在背后轻轻一推。风忽然很大。'],
}
PHASE = {62: ['幕布刚刚拉开，大家还在互相打量。', '第二幕，灯一盏一盏地灭了。', '雪越下越大，剧院里的人越来越少。', '最后一幕，只剩下回声。'], 61: ['雾刚刚漫上来，所有人都还在装作没事。', '潮水涨了一格，酒馆里的人少了一半。', '钟声从很远的地方传来，没有人数得清是第几下。', '雾快要散了，可没有人敢相信。']}
CAMEO = ['远处，{@%d}的影子一闪而过。', '我听见{@%d}在隔壁咳嗽了一声。', '{@%d}好像在看着这边，又好像没有。', '风里有{@%d}的脚步声，很轻。']
CATLINE = {62: '我看见一只黑猫蹲在最高的灯架上，爪子压着一个小小的遥控器。', 61: '港务厅的屋顶上，有一只黑猫在舔爪子，铃铛很轻。'}
BETLINE = '远处，有人在下注——筹码落在桌上的声音，一下，一下。'
ZFEEL = ['我愣了一下。我就在这里。', '我没有跑。', '胸口的银芯，开始哔哔作响，一声比一声急。', '我想往外冲，可我知道，来不及了。']
ACC = {62: ['脚下的雪比想象得滑。我跑得太急，整个人栽了出去。', '梯子断了一级。我抓了空。'], 61: ['木板比我想象得滑。我跑得太急，整个人栽向了水里。', '缆绳一松，我抓了空。']}
def remap(txt, num_map, cell_map):
    txt = re.sub(r'\{(@?)(\d+)\}', lambda m: '{' + m.group(1) + str(num_map[int(m.group(2))]) + '}', txt)
    txt = re.sub(r'\{it:(\d+)\}', lambda m: '{it:%d}' % num_map[int(m.group(1))], txt)
    txt = re.sub(r'\{w:(\d+)\}', lambda m: '{w:%d}' % num_map[int(m.group(1))], txt)
    txt = re.sub(r'\{loc:([A-E]\d)\}', lambda m: '{loc:%s}' % cell_map[m.group(1)], txt)
    return txt
def build(n, events, cast, main_roster, old, places, overrides, shadow):
    HERE = Path(__file__).resolve().parent.parent
    lore = json.loads((HERE / 'data/lore.json').read_text(encoding='utf-8'))
    NUM = {nm: i + 1 for i, nm in enumerate(cast)}
    row = {r[0]: r for r in main_roster}
    gender = lambda k: '他' if k == 63 or lore.get(str(k), {}).get('性别') == '男' else '她'
    oldnum = {i + 1: nm for i, nm in enumerate(old.CAST)}; num_map = {i: NUM[nm] for i, nm in oldnum.items()}
    name2cell = {v: k for k, v in places.items()}; cell_map = {c: name2cell[nm] for c, nm in old.PLACES.items()}
    oldprose = {NUM[oldnum[k]]: remap(v, num_map, cell_map) for k, v in old.PROSE.items()}
    ei = 0 if n == 62 else 2
    dead_at = {e[2]: i for i, e in enumerate(events)}
    old_blast = {oldnum[e[2]] for e in old.EVENTS if e[3] == 'blast' and e[7].get('sub') != 'demo'}
    out = {}
    for idx, (t, cell, v, cause, w, c, how, kw) in enumerate(events):
        name = cast[v - 1]
        if v in overrides: out[v] = overrides[v]; continue
        if v in oldprose and name not in old_blast: out[v] = oldprose[v]; continue
        d, hm = t.split(); day = int(d[1:]); hh, mm = (int(x) for x in hm.split(':'))
        vo, vc = VOICE[name][ei], VOICE[name][ei + 1]
        loc = PLACEFLAV[n][cell]; h = (v * 7 + idx * 3) % 10
        bc = '{bc:D%d-%02d}' % (day, hh)
        alive_after = [k for k in range(1, len(cast) + 1) if k != v and k != c and (k not in dead_at or dead_at[k] > idx)]
        cam = CAMEO[(idx + v) % 4] % alive_after[(idx * 5 + v * 3) % len(alive_after)] if alive_after else ''
        lr = lore.get(str(v), {}); lorel = ''
        if lr.get('简介'): lorel = '档案里是这样写我的：' + lr['简介']
        wk = lr.get('唤醒台词', '').strip('“”「」')
        if wk and wk not in (vo, vc): lorel = (lorel + '\n' if lorel else '') + '有人这样形容过我：“' + wk + '”'
        own = f"我把{{it:{v}}}握在手里，掌心全是汗。" if (idx + v) % 3 else f"{{it:{v}}}就放在脚边，我不想再碰它。"
        extra = CATLINE[n] if (idx * 7 + v) % 4 == 0 else (BETLINE if n == 61 and (idx * 7 + v) % 4 == 1 else '')
        L = [loc, vo, PHASE[n][min(3, idx * 4 // len(events))], cam, own, extra]
        if cause == 'blast':
            L += [bc, f"“{cnh(hh)}点整，{{loc:{cell}}}区域封锁。”{{sys:00-ZONE}}", ZFEEL[h % len(ZFEEL)], vc]
        elif cause == 'accident':
            L += [ACC[n][h % 2] + '{sys:00-REPORT}', '没有人推我，没有人追我。这不算是谁杀的吧……这算吗？', vc]
        elif kw.get('suicide'):
            L += ['我把杯子倒满，慢慢地、一口一口地喝完。{sys:00-REPORT}', '我不想被杀，也不想去杀。我想自己决定这一步。', vc]
        elif cause == 'fall' and c == 0:
            L += ['我站在最高的地方，风把头发吹进嘴里。我松开了手。{sys:00-REPORT}', '我不是被谁推下去的。我已经想了一路了。', vc]
        elif c == shadow:
            way = {'poison': '他轻轻推过来一杯酒——“赌你不敢喝。”杯沿很苦，然后是甜。', 'strangle': '黑色的雾缠上我的脖子，像一条很长很温柔的围巾。', 'blunt': '一只看不见的手，轻轻按在我的头顶，慢慢地，往下。'}[cause]
            L += [bc, '有人在我旁边的位置坐下了。礼帽压得很低，帽檐下面没有脸，只有一团缓缓涌动的雾。', '“来，我们赌一局，”他说，声音礼貌极了，“赌你是第几个。”', '我没有答应。可是下注的人，从来不需要答应。', way, '他拉了拉帽檐，向我致意。雾里，有什么东西，在笑。', vc]
        else:
            K = c; ap = APPROACH[(idx + v) % len(APPROACH)]; r = row[K] if K in row else None
            desc = f"{ROLE[r[4]] if r else '调查员'}的站姿，{REALM[r[3]] if r else '人类'}界域的气息" if K in row else '调查员的站姿，人类的气息'
            if kw.get('snatch'): scene = f"有人一把夺走了我的{{it:{v}}}——{desc}——反手用它对准了我。" if how == 'item' else f"{{{K}}}一把夺走了我的{{it:{v}}}，反手用它对准了我。"
            elif how == 'name': scene = f"{{{K}}}从{ap}走过来，" + (f"手里握着{{it:{w}}}。" if w else '两手空空，眼睛很亮。')
            else: scene = f"有人从{ap}走出来——{desc}。{gender(K)}手里握着{{it:{w}}}。"
            a, b = DIAL[(idx * 3 + v) % len(DIAL)]
            L += [scene, f"“{a}”", f"“{b}”"]
            if bc and h % 3 == 0: L.insert(2, bc)
            L.append(DEATH[cause][(idx + v) % len(DEATH[cause])])
            if kw.get('takes'): L.append(f"那只手弯下腰，拿走了我的{{it:{kw['takes'][0]}}}。")
            L.append(vc)
        if lorel and L[-1] == vc: L.insert(len(L) - 1, lorel)
        out[v] = '\n'.join(x for x in L if x)
    return out
