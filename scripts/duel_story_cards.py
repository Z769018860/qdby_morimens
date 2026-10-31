# 把灰机 wiki「剧情角色」里还没上桌的 28 位做成卡：3 个卡包（bp11/12/13）+ 2 套预组（d19/d20）。
# 立绘来源 data/duel-story-npcs.json（scripts/… 抓下来的 assets/duel/story/*.webp）。
# 只改 data/duel-cards.json 与 data/duel-packs.json；卡包 / 预组用手写紧凑格式，走字符串插入。
import json
import os

ROOT = 'H:/work/qdby_morimens'
cards_p = ROOT + '/data/duel-cards.json'
packs_p = ROOT + '/data/duel-packs.json'
cards = json.load(open(cards_p, encoding='utf-8'))
raw = open(packs_p, encoding='utf-8').read()

NPCS = json.load(open(ROOT + '/data/duel-story-npcs.json', encoding='utf-8'))['npcs']

# 派系 → 命盘（超维 / 混沌 / 血肉 / 深海），按 wiki 的十个「角色分类」
REALM = {
    '门': 'ultra', '群星之间': 'ultra', '超越万古': 'ultra',
    '混沌': 'chaos', '莫测之物': 'chaos', '未归档': 'chaos',
    '愚痴者': 'caro', '黑暗住民': 'caro', '混种': 'caro',
    '异乡人': 'aqua', '主角': 'any',
}

# 数值与效果：NPC 不该盖过唤醒体，所以整体压在 3~5 星、攻 1200~2200；
# 四位主角 / 门 的看家人给到 6 星与 GR-UR。
STAT = {
    '诃勒特':        dict(lv=6, atk=2200, df=2000, rar='GR', role='伤害型',
                        fx=[{'k': 'destroyStrongest'}],
                        text='①：此卡召唤成功时，破坏对方场上攻击力最高的 1 只怪兽。'),
    '莉奥诺拉':      dict(lv=5, atk=1900, df=1700, rar='UR', role='辅助型',
                        fx=[{'k': 'recall', 'v': 1}],
                        text='①：此卡召唤成功时，从自己墓地选 1 张怪兽卡加入手牌。'),
    '西维斯特':      dict(lv=5, atk=1800, df=1800, rar='UR', role='伤害型',
                        fx=[{'k': 'discardOpp', 'v': 1}],
                        text='①：此卡召唤成功时，对方随机丢弃 1 张手牌。'),
    '黛博拉':        dict(lv=6, atk=2100, df=1900, rar='UR', role='辅助型',
                        fx=[{'k': 'poison', 'v': 2}],
                        text='①：此卡召唤成功时，对方中毒 2 层。'),
    '弗朗西斯·奥兹伍德': dict(lv=5, atk=1900, df=1800, rar='UR', role='防御型',
                        fx=[{'k': 'barrierMon', 'v': 1}, {'k': 'guard'}],
                        text='①：此卡获得 1 层屏障。②：此卡表侧守备表示时，对方不能攻击其他怪兽。'),
    '乔治·罗杰斯':   dict(lv=5, atk=2000, df=1600, rar='UR', role='伤害型',
                        fx=[{'k': 'destroyWeak'}],
                        text='①：此卡召唤成功时，破坏对方场上攻击力最低的 1 只怪兽。'),
    '艾尔莎':        dict(lv=3, atk=1200, df=1100, rar='SR', role='辅助型',
                        fx=[{'k': 'draw', 'v': 1}, {'k': 'onDestroyDraw', 'v': 1}],
                        text='①：此卡召唤成功时，自己抽 1 张牌。②：此卡被破坏时，自己抽 1 张牌。'),
    '茜尔维娅':      dict(lv=4, atk=1700, df=1700, rar='SR', role='防御型',
                        fx=[{'k': 'counter', 'v': 600}],
                        text='①：此卡被攻击后，给予对方 600 点伤害。'),
    '赫伯特·罗森塔尔': dict(lv=5, atk=1900, df=1700, rar='SR', role='防御型',
                        fx=[{'k': 'taunt'}],
                        text='①：只要此卡在场表侧表示，对方必须优先攻击此卡。'),
    '阿利斯泰尔·欧文斯': dict(lv=4, atk=1600, df=1800, rar='SR', role='辅助型',
                        fx=[{'k': 'auraDef', 'v': 300}],
                        text='①：只要此卡在场表侧表示，自己场上其他怪兽守备力 +300。'),
    '德克斯特':      dict(lv=5, atk=1800, df=2000, rar='SR', role='辅助型',
                        fx=[{'k': 'negateSpell'}],
                        text='①：此卡在场时，对方每回合第 1 张魔法卡无效。'),
    '于丽埃特':      dict(lv=4, atk=1700, df=1500, rar='SR', role='辅助型',
                        fx=[{'k': 'heal', 'v': 500}],
                        text='①：此卡召唤成功时，自己回复 500 点命轮值。'),
    '以格伦':        dict(lv=4, atk=1600, df=1800, rar='SR', role='防御型',
                        fx=[{'k': 'turnHeal', 'v': 300}],
                        text='①：自己回合结束时，自己回复 300 点命轮值。'),
    '卡纳克':        dict(lv=5, atk=2000, df=1200, rar='SR', role='伤害型',
                        fx=[{'k': 'pierce'}],
                        text='①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值伤害。'),
    '埃尔顿':        dict(lv=4, atk=1700, df=1400, rar='SR', role='伤害型',
                        fx=[{'k': 'onKillAtk', 'v': 300}],
                        text='①：此卡战斗破坏对方怪兽时，此卡攻击力永久 +300。'),
    '涅芙蕾亚':      dict(lv=4, atk=1500, df=1700, rar='SR', role='防御型',
                        fx=[{'k': 'guard'}],
                        text='①：此卡表侧守备表示时，对方不能攻击其他怪兽。'),
    '索菲亚·查兹坦': dict(lv=4, atk=1600, df=1600, rar='SR', role='辅助型',
                        fx=[{'k': 'healDraw', 'v': 1}],
                        text='①：此卡召唤成功时，自己抽 1 张牌并回复 400 点命轮值。'),
    '纳拉卡':        dict(lv=4, atk=1700, df=1300, rar='SR', role='伤害型',
                        fx=[{'k': 'pumpSelf', 'v': 400}],
                        text='①：此卡召唤成功时，此卡攻击力永久 +400。'),
    '阿尔比诺':      dict(lv=4, atk=1700, df=1500, rar='SR', role='辅助型',
                        fx=[{'k': 'bleed', 'v': 2}],
                        text='①：此卡召唤成功时，对方攻击力最高的怪兽流血 2 层。'),
    '伊格娜蒂丝':    dict(lv=3, atk=1400, df=1600, rar='R', role='辅助型',
                        fx=[{'k': 'draw', 'v': 1}],
                        text='①：此卡召唤成功时，自己抽 1 张牌。'),
    '伊芙琳':        dict(lv=3, atk=1300, df=1500, rar='R', role='辅助型',
                        fx=[{'k': 'onDestroyDraw', 'v': 1}],
                        text='①：此卡被破坏时，自己抽 1 张牌。'),
    '埃利安':        dict(lv=4, atk=1500, df=1500, rar='R', role='辅助型',
                        fx=[{'k': 'weaken', 'v': 500}],
                        text='①：此卡召唤成功时，对方场上的怪兽攻击力 -500（永久）。'),
    '巴奈特':        dict(lv=2, atk=900, df=1500, rar='R', role='辅助型',
                        fx=[{'k': 'extraDraw', 'v': 1}],
                        text='①：此卡召唤成功时，自己抽 1 张牌。'),
    '弗兰':          dict(lv=4, atk=1600, df=1300, rar='R', role='辅助型',
                        fx=[{'k': 'graveHeal', 'v': 400}],
                        text='①：此卡召唤成功时，自己回复墓地中怪兽卡数 ×100 的命轮值（最多 400）。'),
    '梅伊':          dict(lv=3, atk=1300, df=1200, rar='R', role='伤害型',
                        fx=[{'k': 'burn', 'v': 400}],
                        text='①：此卡召唤成功时，给予对方 400 点伤害。'),
    '汉娜·皮斯利':   dict(lv=4, atk=1700, df=1500, rar='SR', role='伤害型',
                        fx=[{'k': 'discardOpp', 'v': 1}],
                        text='①：此卡召唤成功时，对方随机丢弃 1 张手牌。'),
    '布朗':          dict(lv=1, atk=500, df=800, rar='N', role='辅助型',
                        fx=[{'k': 'onKillDraw', 'v': 1}],
                        text='①：此卡战斗破坏对方怪兽时，自己抽 1 张牌。'),
    '小煤球':        dict(lv=1, atk=400, df=600, rar='N', role='辅助型',
                        fx=[{'k': 'sacrificeHeal', 'v': 300}],
                        text='①：此卡作为祭品送去墓地时，自己回复 300 点命轮值。'),
}

# 编号从 m130 起
start = max(int(c['id'][1:]) for c in cards['monsters']) + 1
existing = {c['n'] for c in cards['monsters']}
added = []
for i, npc in enumerate(NPCS):
    nm = npc['n']
    if nm in existing:
        print('跳过（已有同名卡）', nm)
        continue
    st = STAT.get(nm)
    if not st:
        raise SystemExit('没给数值：' + nm)
    cid = 'm%d' % (start + len(added))
    card = {
        'id': cid, 'n': nm, 'r': REALM.get(npc['grp'], 'chaos'), 'rar': st['rar'],
        'lv': st['lv'], 'atk': st['atk'], 'def': st['df'], 'role': st['role'],
        'fx': st['fx'], 'text': st['text'],
    }
    cards['monsters'].append(card)
    added.append((cid, nm, npc['grp'], npc['faction']))

json.dump(cards, open(cards_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('新增怪兽', len(added), '张：', ', '.join('%s %s' % (c, n) for c, n, _, _ in added))

# ---- 卡包 ----
by_name = {n: i for i, n, _, _ in added}
PACKS = [
    ('bp11', '门后的人', 'BEHIND THE DOOR', '门 · 主角 · 莫测之物',
     '弥萨格大学档案室里最常被调阅的那几份。他们的名字都写在某扇门上，门后面是什么没人写。',
     ['茜尔维娅', '诃勒特', '赫伯特·罗森塔尔', '阿利斯泰尔·欧文斯', '莉奥诺拉', '西维斯特', '德克斯特',
      's01', 's05', 's06', 't03', 't04']),
    ('bp12', '未归档', 'UNFILED', '未归档 · 逆转回合',
     '档案柜里没有他们那一格。有的是向导，有的是只鼠鼠，有的只在一份特遣记录里说过七句话。',
     ['艾尔莎', '伊格娜蒂丝', '卡纳克', '埃利安', '巴奈特', '布朗', '弗兰', '梅伊', '涅芙蕾亚', '小煤球',
      's02', 's06', 's08', 't02', 't12']),
    ('bp13', '黑暗住民', 'DARK DWELLERS', '黑暗住民 · 混种 · 愚痴者',
     '住在这座城阴影里的那种人：算命的、雕蜡像的、办济贫院的，还有从万年前一直活到现在的。',
     ['黛博拉', '弗朗西斯·奥兹伍德', '乔治·罗杰斯', '以格伦', '伊芙琳', '埃尔顿', '汉娜·皮斯利',
      '索菲亚·查兹坦', '纳拉卡', '阿尔比诺', '于丽埃特',
      's13', 's28', 's44', 't01', 't17', 't23']),
]

add_packs = []
for pid, nm, en, sub, desc, ids in PACKS:
    resolved = []
    byname = {c['n']: c['id'] for a in ('monsters', 'spells', 'traps', 'extras') for c in cards[a]}
    for x in ids:
        resolved.append(byname.get(x, x))
    add_packs.append({'id': pid, 'n': nm, 'en': en, 'sub': sub, 'desc': desc, 'cards': resolved})

# ---- 预组 ----
byname = {c['n']: c['id'] for a in ('monsters', 'spells', 'traps', 'extras') for c in cards[a]}
DECKS = [
    {'id': 'd19', 'n': '弥萨格新生', 'en': 'FRESHMEN', 'r': 'chaos',
     'desc': '序章那四个人加上他们班上的同学。牌都不大，但每一张都在帮你摸下一张——新生没什么本事，就是人多。',
     'cards': [['艾尔莎', 2], ['茜尔维娅', 2], ['诃勒特', 1], ['阿利斯泰尔·欧文斯', 2],
               ['西维斯特', 2], ['莉奥诺拉', 1], ['德克斯特', 2], ['卡纳克', 2], ['埃利安', 2],
               ['小煤球', 1], ['布朗', 1], ['N', 1], ['汀克特', 1],
               ['命轮占卜', 2], ['融蚀风暴', 2], ['记忆回溯', 1], ['命轮共鸣', 1], ['记忆防线', 1],
               ['缄默之壁', 2], ['忘却的代价', 1]],
     'extra': ['悖论·无解之环'],
     'combo': ['「艾尔莎」进场抽一张，被拆掉也再抽一张：她是整套牌的转速。',
               '「N」＋「汀克特」＝「悖论·无解之环」：一次弃牌、一次抽牌、一次封陷阱。',
               '「诃勒特」落地直接拆掉对面最大的那只，是这套牌唯一的硬解。',
               '「德克斯特」站在场上，对面每回合第一张魔法卡直接无效。'],
     'tips': '这套牌赢在牌差不在拳头：铺开抽牌，等「诃勒特」或用觉醒体收尾，别拿小怪硬换。'},
    {'id': 'd20', 'n': '黑暗住民', 'en': 'DARK DWELLERS', 'r': 'caro',
     'desc': '住在这座城阴影里的人。他们不太会用魔法，但很会用刀、用毒、用别人的手牌。',
     'cards': [['以格伦', 2], ['伊芙琳', 2], ['埃尔顿', 2], ['弗朗西斯·奥兹伍德', 1],
               ['汉娜·皮斯利', 2], ['索菲亚·查兹坦', 2], ['纳拉卡', 2], ['黛博拉', 1],
               ['乔治·罗杰斯', 1], ['阿尔比诺', 2], ['于丽埃特', 1],
               ['血之偿还', 2], ['融蚀风暴', 2], ['胚乳融合', 1], ['命轮占卜', 1],
               ['命轮共鸣', 1], ['记忆回溯', 1],
               ['融蚀之槛', 2], ['无光之夜', 1], ['猩红之拥', 1]],
     'extra': [],
     'combo': ['「阿尔比诺」让人流血，「黛博拉」再叠两层毒：两条血线一起掉。',
               '「汉娜·皮斯利」「西维斯特」这类削手牌，专治对手攒素材。',
               '「弗朗西斯·奥兹伍德」带屏障还带守护，是把刀也是堵墙。',
               '「乔治·罗杰斯」落地拆对面最小的那只，正好补上这套牌清场不足的短板。'],
     'tips': '别急着打死对面：先削手牌、再挂毒和流血，让他们抽到什么都用不出来。'},
]

# 把卡名换成 id，并检查张数
for d in DECKS:
    pairs = []
    for nm, n in d['cards']:
        cid = byname.get(nm)
        if not cid:
            raise SystemExit('预组 %s 里 %s 找不到' % (d['id'], nm))
        pairs.append([cid, n])
    tot = sum(c[1] for c in pairs)
    if tot != 30:
        raise SystemExit('预组 %s 是 %d 张' % (d['id'], tot))
    d['cards'] = pairs
    d['extra'] = [byname[x] for x in d['extra']]

# ---- 字符串插入（保住手写格式）----
raw = raw.rstrip()
PACK_ANCHOR = '\n ],\n "decks": ['
i = raw.index(PACK_ANCHOR)
head, tail = raw[:i], raw[i:]


# 卡包用一套更稳的排版：按名字长度切行
def pack_block(p):
    cells = ['"%s"' % c for c in p['cards']]
    rows, row, w = [], [], 0
    for cell in cells:
        if row and w + len(cell) > 88:
            rows.append(row)
            row, w = [], 0
        row.append(cell)
        w += len(cell) + 2
    if row:
        rows.append(row)
    body = ',\n'.join('             ' + ', '.join(r) for r in rows)
    return ('  {\n   "id": "%s", "n": "%s", "en": "%s", "sub": "%s",\n'
            '   "desc": "%s",\n   "cards": [\n%s]\n  }' % (
                p['id'], p['n'], p['en'], p['sub'], p['desc'], body))


packs_txt = ',\n'.join(pack_block(p) for p in add_packs)
raw = head.rstrip() + ',\n' + packs_txt + tail


def deck_block(d):
    cells = ['["%s", %d]' % (c, n) for c, n in d['cards']]
    rows, row, w = [], [], 0
    for cell in cells:
        if row and (len(row) >= 6 or w + len(cell) > 74):
            rows.append(row)
            row, w = [], 0
        row.append(cell)
        w += len(cell) + 2
    if row:
        rows.append(row)
    body = ',\n'.join('             ' + ', '.join(r) for r in rows)
    extra = ', '.join('"%s"' % x for x in d['extra'])
    combo = ',\n'.join('    "%s"' % c for c in d['combo'])
    return ('  {\n   "id": "%s", "n": "%s", "en": "%s", "r": "%s",\n'
            '   "desc": "%s",\n   "cards": [\n%s],\n   "extra": [%s],\n'
            '   "combo": [\n%s\n   ],\n   "tips": "%s"\n  }' % (
                d['id'], d['n'], d['en'], d['r'], d['desc'], body, extra, combo, d['tips']))


DECK_ANCHOR = '\n ]\n}'
j = raw.index(DECK_ANCHOR)
head, tail = raw[:j], raw[j:]
decks_txt = ',\n'.join(deck_block(d) for d in DECKS)
raw = head.rstrip() + ',\n' + decks_txt + tail

json.loads(raw)  # 必须是合法 JSON
open(packs_p, 'w', encoding='utf-8', newline='').write(raw)
print('卡包 +%d（%s），预组 +%d（%s）' % (
    len(add_packs), ' '.join(p['id'] for p in add_packs),
    len(DECKS), ' '.join(d['id'] for d in DECKS)))
