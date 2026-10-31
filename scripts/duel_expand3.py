# 决斗链接第四轮扩充：魔法 / 陷阱大补一批，并加上两条新规则。
#
# 三件事：
#   1. 命轮代价（cost.lp）：发动前先付命轮值，付不起就发不动——魔法与陷阱都能写。
#   2. 造物（relics）：装备 / 永续 / 场地的「道具卡」，卡面用 assets/creation 的真图标。
#   3. 额外卡组的「直接召唤」：direct = { cond } 满足场面条件白叫，{ lp } 收命轮值。
#      不占通常召唤、每回合一次、当回合不能攻击（和觉醒召唤同一个规矩）。
#
# 只改 data/duel-cards.json 与 data/duel-packs.json；卡包走字符串插入，保住手写的紧凑格式。
import json

ROOT = 'H:/work/qdby_morimens'
cards_p = ROOT + '/data/duel-cards.json'
packs_p = ROOT + '/data/duel-packs.json'
cards = json.load(open(cards_p, encoding='utf-8'))
raw = open(packs_p, encoding='utf-8').read()


def next_id(kind):
    pfx = {'monsters': 'm', 'spells': 's', 'traps': 't', 'extras': 'e'}[kind]
    return pfx, max(int(c['id'][len(pfx):]) for c in cards[kind] if c['id'][len(pfx):].isdigit()) + 1


SEQ = {k: next_id(k) for k in ('monsters', 'spells', 'traps', 'extras')}
NAMES = {c['n'] for k in ('monsters', 'spells', 'traps', 'extras') for c in cards[k]}
MADE = []


def creation(n):
    """造物图标：assets/creation/Icon_Creation_065.webp 这种编号图。"""
    return 'creation:Icon_Creation_%03d' % n


def mon(name, realm, rar, lv, atk, df, role, fx, text, art=None):
    pfx, n = SEQ['monsters']
    assert name not in NAMES, '重名：' + name
    if art is None:
        raise SystemExit('造物怪兽必须给 art：' + name)
    card = {'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar, 'lv': lv,
            'atk': atk, 'def': df, 'role': role, 'fx': fx, 'text': text, 'art': art}
    cards['monsters'].append(card)
    SEQ['monsters'] = (pfx, n + 1)
    NAMES.add(name)
    MADE.append(card['id'])
    return card['id']


def spell(name, realm, rar, t, fx, text, art=None, cost=None):
    pfx, n = SEQ['spells']
    assert name not in NAMES, '重名：' + name
    card = {'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar,
            't': t, 'fx': fx, 'text': text}
    if art:
        card['art'] = art
    if cost:
        card['cost'] = {'lp': cost}
    cards['spells'].append(card)
    SEQ['spells'] = (pfx, n + 1)
    NAMES.add(name)
    MADE.append(card['id'])
    return card['id']


def trap(name, realm, rar, t, fx, text, art=None, cost=None):
    pfx, n = SEQ['traps']
    assert name not in NAMES, '重名：' + name
    card = {'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar,
            't': t, 'fx': fx, 'text': text}
    if art:
        card['art'] = art
    if cost:
        card['cost'] = {'lp': cost}
    cards['traps'].append(card)
    SEQ['traps'] = (pfx, n + 1)
    NAMES.add(name)
    MADE.append(card['id'])
    return card['id']


def extra(name, realm, rar, lv, atk, df, fx, text, art, direct):
    pfx, n = SEQ['extras']
    assert name not in NAMES, '重名：' + name
    card = {'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar, 'lv': lv,
            'atk': atk, 'def': df, 'fx': fx, 'text': text, 'art': art, 'direct': direct}
    cards['extras'].append(card)
    SEQ['extras'] = (pfx, n + 1)
    NAMES.add(name)
    MADE.append(card['id'])
    return card['id']


# ---------------------------------------------------------------- 造物 · 装备
s70 = spell('造物·猩红之杯', 'any', 'SR', 'equip',
            [{'k': 'equipAtk', 'v': 400}, {'k': 'lpPump', 'v': 200}],
            '装备：装备怪兽攻击力 +400；自己命轮值每失去 1000 点，装备怪兽再 +200。',
            art=creation(1))
s77 = spell('造物·玻璃心脏', 'any', 'UR', 'equip',
            [{'k': 'equipDef', 'v': 500}, {'k': 'equipGrant', 'g': 'lastStand', 'v': 1}],
            '装备：装备怪兽守备力 +500，且第一次被破坏时不会被破坏（每场决斗 1 次）。',
            art=creation(8))
s80 = spell('造物·活体画框', 'any', 'GR', 'equip',
            [{'k': 'equipGrant', 'g': 'twin', 'v': 1}],
            '装备：装备怪兽在同一个战斗阶段中可以攻击 2 次。',
            art=creation(16))
s82 = spell('断命之刃', 'any', 'UR', 'equip', [{'k': 'equipAtk', 'v': 1500}],
            '代价：献出 1500 点命轮值。装备：装备怪兽攻击力 +1500。', cost=1500)

# ---------------------------------------------------------------- 造物 · 通常 / 速攻 / 场地
s71 = spell('造物·牵丝指环', 'any', 'GR', 'normal', [{'k': 'stealMon'}],
            '代价：献出 2000 点命轮值。夺取对方攻击力最高的 1 只怪兽的控制权（当回合不能攻击）。',
            art=creation(2), cost=2000)
s72 = spell('造物·碎纸磨', 'any', 'SR', 'normal', [{'k': 'millOpp', 'v': 4}],
            '对方卡组顶 4 张送进墓地。', art=creation(3))
s73 = spell('造物·回溯沙漏', 'any', 'SR', 'normal', [{'k': 'recycle', 'v': 4}, {'k': 'draw', 'v': 1}],
            '自己墓地 4 张洗回卡组，然后抽 1 张。', art=creation(4))
s74 = spell('造物·守夜灯', 'any', 'SR', 'field',
            [{'k': 'aura', 'v': 200, 'r': 'any'}, {'k': 'auraDef', 'v': 200}],
            '场地：自己场上全部怪兽攻击力与守备力 +200。', art=creation(5))
s75 = spell('造物·寂静回廊', 'any', 'UR', 'field', [{'k': 'summonTaxDiscard', 'v': 1}],
            '场地：对方每次召唤成功时，随机丢弃 1 张手牌。', art=creation(6))
s76 = spell('造物·血之账本', 'any', 'SR', 'normal', [{'k': 'draw', 'v': 3}],
            '代价：献出 1500 点命轮值。抽 3 张牌。', art=creation(7), cost=1500)
s78 = spell('造物·铁处女', 'any', 'UR', 'normal', [{'k': 'destroyStrongest'}],
            '代价：献出 2500 点命轮值。破坏对方攻击力最高的 1 只怪兽。', art=creation(9), cost=2500)
s79 = spell('造物·缝补针线', 'any', 'R', 'quick', [{'k': 'heal', 'v': 1500}],
            '速攻：自己回复 1500 点命轮值。', art=creation(10))
s81 = spell('献血契约', 'any', 'SR', 'normal', [{'k': 'draw', 'v': 2}, {'k': 'burn', 'v': 500}],
            '代价：献出 1000 点命轮值。抽 2 张牌，给予对方 500 点伤害。', cost=1000)
s83 = spell('以命换命', 'any', 'UR', 'normal', [{'k': 'burn', 'v': 2000}],
            '代价：献出 2000 点命轮值。给予对方 2000 点伤害。', cost=2000)
s84 = spell('血月仪式', 'any', 'UR', 'cont', [{'k': 'contBleed', 'v': 2}],
            '代价：献出 1200 点命轮值。永续：自己每次回合开始时，对方攻击力最高的 1 只怪兽流血 2 层。',
            cost=1200)
s85 = spell('命轮虹吸', 'any', 'SR', 'normal', [{'k': 'drain', 'v': 800}],
            '给予对方 800 点伤害，自己回复 800 点命轮值。')
s86 = spell('割让', 'any', 'GR', 'normal', [{'k': 'destroyStrongest'}, {'k': 'draw', 'v': 2}],
            '代价：献出 3000 点命轮值。破坏对方攻击力最高的 1 只怪兽，然后抽 2 张牌。', cost=3000)
s87 = spell('余烬契约', 'any', 'SR', 'field', [{'k': 'contBurn', 'v': 300}],
            '代价：献出 500 点命轮值。场地：对方每次回合结束时受到 300 点伤害。', cost=500)
s88 = spell('造物·活页目录', 'any', 'R', 'normal', [{'k': 'search', 'f': 'spell'}],
            '从卡组检索 1 张魔法卡加入手牌。', art=creation(11))
s89 = spell('造物·碎骨钉', 'any', 'R', 'quick', [{'k': 'weaken', 'v': 800}],
            '速攻：对方攻击力最高的 1 只怪兽攻击力永久 -800。', art=creation(12))

# ---------------------------------------------------------------- 造物 · 陷阱
t30 = trap('造物·绞索', 'any', 'SR', 'normal', [{'k': 'trapCounter', 'v': 1200}],
           '对方怪兽攻击宣言时：给予对方 1200 点伤害。代价：献出 1000 点命轮值。',
           art=creation(13), cost=1000)
t31 = trap('造物·碎镜', 'any', 'R', 'normal', [{'k': 'trapBarrier', 'v': 2}],
           '对方怪兽攻击宣言时：自己获得 2 层屏障，挡下这一下。代价：献出 800 点命轮值。',
           art=creation(14), cost=800)
t32 = trap('造物·血偿契', 'any', 'UR', 'normal', [{'k': 'trapCounterMon', 'v': 1000}],
           '对方怪兽攻击宣言时：攻击方怪兽攻击力 -1000，降到 0 就破坏它。代价：献出 1500 点命轮值。',
           art=creation(15), cost=1500)
t33 = trap('造物·空棺', 'any', 'SR', 'cont', [{'k': 'contBoth', 'v': 300}],
           '永续：自己每次回合开始时回复 300 点命轮值，对方失去 300 点命轮值。', art=creation(17))
t34 = trap('造物·静默钟', 'any', 'SR', 'counter', [{'k': 'negateSpell'}],
           '反击：对方发动魔法卡时可以无效它。', art=creation(18))
t35 = trap('血偿', 'any', 'SR', 'normal', [{'k': 'reflect', 'v': 1500}],
           '对方直接攻击宣言时：那次战斗伤害变成 0，给予对方 1500 点伤害。代价：献出 1000 点命轮值。',
           cost=1000)
t36 = trap('临终祷词', 'any', 'R', 'normal', [{'k': 'heal', 'v': 2000}],
           '自己回复 2000 点命轮值。')
t37 = trap('血之镜', 'any', 'UR', 'counter', [{'k': 'negateSummon'}],
           '反击：对方召唤怪兽时可以无效那次召唤。代价：献出 1200 点命轮值。', cost=1200)
t38 = trap('造物·铁窗帘', 'any', 'R', 'cont', [{'k': 'contBarrier', 'v': 1}],
           '永续：自己每次回合开始时获得 1 层屏障（最多 5 层）。', art=creation(19))
s90 = spell('造物·长明灯', 'any', 'UR', 'field',
            [{'k': 'extraDraw', 'v': 1}, {'k': 'contHeal', 'v': 200}],
            '场地：自己每次抽牌阶段多抽 1 张；自己的结束阶段回复 200 点命轮值。', art=creation(30))

# ---------------------------------------------------------------- 造物 · 怪兽（造物成精）
m220 = mon('造物·守夜人偶', 'any', 'SR', 4, 1700, 1900, '辅助型',
           [{'k': 'token', 'id': 'tk2', 'v': 1}],
           '①：此卡召唤成功时，在自己场上特殊召唤 1 只「灰烬傀儡」衍生物。', art=creation(20))
m221 = mon('造物·啃噬之匣', 'any', 'SR', 3, 1200, 1600, '干扰型',
           [{'k': 'poison', 'v': 2}], '①：此卡召唤成功时，对方中毒 2 层。', art=creation(21))
m222 = mon('造物·缝合巨躯', 'any', 'UR', 6, 2400, 2000, '守护型',
           [{'k': 'barrierMon', 'v': 1}], '①：此卡需要 1 只祭品。②：此卡获得 1 层屏障。',
           art=creation(22))
m223 = mon('造物·玻璃舞者', 'any', 'SR', 4, 1800, 1200, '伤害型',
           [{'k': 'counter', 'v': 700}], '①：此卡被攻击后，给予对方 700 点伤害。', art=creation(23))

# ---------------------------------------------------------------- 直接召唤的额外怪兽
# 两种写法：cond 满足就白叫；只写 lp 的收命轮值。都不占通常召唤，每回合一次。
e19 = extra('造物·铁哨兵', 'any', 'SR', 4, 2000, 1800,
            [{'k': 'pierce'}],
            '直接召唤：自己场上有 2 只以上怪兽。此卡攻击守备表示怪兽时给予贯穿伤害。',
            creation(24), {'cond': 'mons2'})
e20 = extra('造物·碎骨磨盘', 'any', 'SR', 5, 2200, 1600,
            [{'k': 'millOpp', 'v': 3}],
            '直接召唤：自己墓地有 3 只以上怪兽。此卡召唤成功时，对方卡组顶 3 张送墓。',
            creation(25), {'cond': 'graveMon3', 'v': 3})
e21 = extra('造物·血偿傀儡', 'any', 'UR', 6, 2600, 2000,
            [{'k': 'counter', 'v': 800}, {'k': 'barrierMon', 'v': 1}],
            '直接召唤：献出 2000 点命轮值。①：此卡获得 1 层屏障。②：此卡被攻击后给予对方 800 点伤害。',
            creation(26), {'lp': 2000})
e22 = extra('造物·守夜钟塔', 'any', 'UR', 5, 1600, 2400,
            [{'k': 'taunt'}, {'k': 'turnHeal', 'v': 300}],
            '直接召唤：自己场上有已发动的魔法·陷阱卡。①：对方必须优先攻击此卡。②：自己回合开始回复 300 点命轮值。',
            creation(27), {'cond': 'spell1'})
e23 = extra('造物·窃声之匣', 'any', 'GR', 6, 2400, 1800,
            [{'k': 'stealMon'}],
            '直接召唤：献出 2500 点命轮值。此卡召唤成功时，夺取对方攻击力最高的 1 只怪兽的控制权。',
            creation(28), {'lp': 2500})
e24 = extra('造物·无面合唱', 'any', 'UR', 7, 2800, 2200,
            [{'k': 'burn', 'v': 600}],
            '直接召唤：自己场上有 3 只怪兽。此卡召唤成功时，给予对方 600 点伤害。',
            creation(29), {'cond': 'mons3'})

json.dump(cards, open(cards_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- 卡包 bp16
PACK_IDS = [s70, s71, s72, s73, s74, s75, s76, s77, s78, s79, s80, s81, s82, s83, s84, s85, s86, s87,
            s88, s89,
            s90,
            t30, t31, t32, t33, t34, t35, t36, t37, t38,
            m220, m221, m222, m223,
            e19, e20, e21, e22, e23, e24]
assert len(PACK_IDS) == 40, len(PACK_IDS)

pack = {
    'id': 'bp16',
    'n': '造物 · 命轮契约',
    'en': 'RELICS OF THE WHEEL',
    'sub': '40 张 · 代价与道具',
    'desc': '把命轮值本身当货币用的一包。造物是道具：装备、场地、永续；'
            '付不起命轮值的卡根本发不动，但付得起的时候它们是全场最狠的牌；'
            '额外卡组多了「直接召唤」——凑够场面或掏够命轮值，不用素材也能落地。',
    'cards': PACK_IDS,
}
pk = json.dumps(pack, ensure_ascii=False)
# 卡包插在 decks 之前，保持「packs 数组 → decks」的顺序
i = raw.index('\n ],\n "decks": [')
raw = raw[:i] + ',\n' + '  ' + pk + raw[i:]
open(packs_p, 'w', encoding='utf-8', newline='\n').write(raw)

print('新增 %d 张，卡包 bp16 共 %d 张' % (len(PACK_IDS), len(PACK_IDS)))
print('怪兽 %d / 魔法 %d / 陷阱 %d / 额外 %d' % (
    len(cards['monsters']), len(cards['spells']), len(cards['traps']), len(cards['extras'])))
