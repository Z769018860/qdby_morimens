# 决斗链接第三轮扩充：把「反击 / 嘲讽 / 中毒 / 召唤」四套打法补成体系，
# 再把融灾禁区里还没上桌的首领整包做出来。
#
# 只改 data/duel-cards.json 与 data/duel-packs.json；卡包 / 预组走字符串插入，
# 保住手写的紧凑格式（json.dump 往返会让 diff 上千行）。
import json

ROOT = 'H:/work/qdby_morimens'
cards_p = ROOT + '/data/duel-cards.json'
packs_p = ROOT + '/data/duel-packs.json'
cards = json.load(open(cards_p, encoding='utf-8'))
raw = open(packs_p, encoding='utf-8').read()
NPCS = {r['n'] for r in json.load(open(ROOT + '/data/duel-npcs.json', encoding='utf-8'))['npcs']}


def next_id(kind):
    pfx = {'monsters': 'm', 'spells': 's', 'traps': 't', 'extras': 'e'}[kind]
    # 衍生物（tk1/tk2）不是数字编号，算上限时要跳过
    return pfx, max(int(c['id'][len(pfx):]) for c in cards[kind] if c['id'][len(pfx):].isdigit()) + 1


SEQ = {k: next_id(k) for k in ('monsters', 'spells', 'traps')}
NAMES = {c['n'] for k in ('monsters', 'spells', 'traps', 'extras') for c in cards[k]}


def mon(name, realm, rar, lv, atk, df, role, fx, text, art=None):
    pfx, n = SEQ['monsters']
    assert name not in NAMES, '重名：' + name
    if art is None and name not in NPCS:
        raise SystemExit('没有头像来源：' + name)
    card = {'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar, 'lv': lv,
            'atk': atk, 'def': df, 'role': role, 'fx': fx, 'text': text}
    if art:
        card['art'] = art
    cards['monsters'].append(card)
    SEQ['monsters'] = (pfx, n + 1)
    NAMES.add(name)
    return card['id']


def spell(name, realm, rar, t, fx, text):
    pfx, n = SEQ['spells']
    assert name not in NAMES, '重名：' + name
    cards['spells'].append({'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar,
                            't': t, 'fx': fx, 'text': text})
    SEQ['spells'] = (pfx, n + 1)
    NAMES.add(name)
    return '%s%02d' % (pfx, n)


def trap(name, realm, rar, t, fx, text):
    pfx, n = SEQ['traps']
    assert name not in NAMES, '重名：' + name
    cards['traps'].append({'id': '%s%02d' % (pfx, n), 'n': name, 'r': realm, 'rar': rar,
                           't': t, 'fx': fx, 'text': text})
    SEQ['traps'] = (pfx, n + 1)
    NAMES.add(name)
    return '%s%02d' % (pfx, n)


# ---------------------------------------------------------------- 衍生物
# 衍生物不进任何卡包，也不会进卡表：它没有收藏价值，只在场上有意义。
# token:true 让引擎在它离场时直接抹掉，不写墓地（否则「从墓地取回」会捡到一张 0/0）。
for tk, tkname, tkstat, tktext in [
    ('tk1', '维度残影', (0, 0), '衍生物。不能通常召唤，也不能作为觉醒素材；离场即消失。'),
    ('tk2', '灰烬傀儡', (800, 1200), '衍生物。不能通常召唤；离场即消失。守备表示时是一只白送的墙。'),
]:
    cards['monsters'].append({
        'id': tk, 'n': tkname, 'r': 'any', 'rar': 'N', 'lv': 1,
        'atk': tkstat[0], 'def': tkstat[1], 'role': '辅助型',
        'fx': [], 'text': tktext, 'token': True, 'art': '@token',
    })
    NAMES.add(tkname)

# ---------------------------------------------------------------- 反击流
# 反击的两种写法：默认打攻击方的命轮值；写了 on:'mon' 的改打攻击方怪兽的攻击力，
# 削到 0 就破坏它——「打它一拳，它掉一块肉」。
counter_mons = [
    ('「刻耳柏洛斯」', 'chaos', 'SR', 5, 2000, 1400, '伤害型',
     [{'k': 'counter', 'v': 900}],
     '①：此卡被攻击后，给予对方 900 点伤害。②：此卡攻击守备表示怪兽时贯穿。'),
    ('「美德骑士」', 'ultra', 'SR', 5, 1800, 1900, '防御型',
     [{'k': 'counter', 'v': 700}, {'k': 'barrierMon', 'v': 1}],
     '①：此卡获得 1 层屏障。②：此卡被攻击后，给予对方 700 点伤害。'),
    ('阴影的忠犬', 'caro', 'R', 4, 1600, 1400, '伤害型',
     [{'k': 'counter', 'v': 800}],
     '①：此卡被攻击后，给予对方 800 点伤害。'),
    ('「祝圣司铎」', 'aqua', 'SR', 4, 1500, 1800, '防御型',
     [{'k': 'counter', 'v': 600}, {'k': 'tauntMax', 'v': 1800}],
     '①：攻击力 1800 以下的怪兽必须先攻击此卡。②：此卡被攻击后，给予对方 600 点伤害。'),
    ('「无尽饥渊」', 'caro', 'UR', 6, 2200, 1800, '伤害型',
     [{'k': 'counter', 'v': 900, 'on': 'mon'}],
     '①：此卡被攻击后，攻击方怪兽攻击力 -900；降到 0 就破坏它。'),
    ('暴走猎颅者', 'chaos', 'UR', 5, 2100, 1300, '伤害型',
     [{'k': 'counter', 'v': 1000, 'on': 'mon'}, {'k': 'counterBoost', 'v': 200}],
     '①：此卡被攻击后，攻击方怪兽攻击力 -1000。②：每次反击后此卡攻击力 +200。'),
]

# ---------------------------------------------------------------- 嘲讽（三档）
taunt_mons = [
    ('「护灯尊者」', 'aqua', 'SR', 5, 1400, 2400, '防御型',
     [{'k': 'taunt'}, {'k': 'guard'}],
     '①：此卡在场时，对方必须优先攻击此卡（不论攻守）。②：此卡守备表示时同样拦路。'),
    ('「睡莲」', 'chaos', 'R', 3, 900, 1800, '防御型',
     [{'k': 'tauntMax', 'v': 1800}],
     '①：攻击力 1800 以下的怪兽必须先攻击此卡；更大的可以直接跨过去。'),
    ('「灯罩」阿依莎', 'aqua', 'SR', 4, 1000, 2000, '防御型',
     [{'k': 'tauntMax', 'v': 2000}, {'k': 'tauntOnce'}],
     '①：攻击力 2000 以下的怪兽必须先攻击此卡。②：此卡每回合只拦一次。'),
    ('「王邸管家」弗兰', 'caro', 'SR', 5, 1600, 2000, '防御型',
     [{'k': 'taunt'}, {'k': 'tauntOnce'}],
     '①：此卡在场时对方必须优先攻击此卡。②：此卡每回合只拦一次，拦过之后可以绕开。'),
    ('亚兰卫队长', 'ultra', 'SR', 5, 1800, 2000, '防御型',
     [{'k': 'taunt'}, {'k': 'barrierMon', 'v': 1}],
     '①：此卡在场时对方必须优先攻击此卡。②：此卡获得 1 层屏障。'),
    ('沉默的「母亲」', 'caro', 'UR', 4, 800, 2200, '防御型',
     [{'k': 'tauntMax', 'v': 2600}, {'k': 'turnHeal', 'v': 300}],
     '①：攻击力 2600 以下的怪兽必须先攻击此卡。②：自己回合开始时回复 300 点命轮值。'),
]

# ---------------------------------------------------------------- 毒 / 流血
poison_mons = [
    ('「淤泥之花」', 'caro', 'UR', 5, 1600, 1800, '辅助型',
     [{'k': 'poisonMon', 'v': 3, 'on': 'all'}],
     '①：此卡召唤成功时，对方场上全部怪兽中毒 3 层（每回合攻守 -300）。'),
    ('食尸鬼卫队长', 'caro', 'R', 4, 1700, 1300, '辅助型',
     [{'k': 'poisonMon', 'v': 2}],
     '①：此卡召唤成功时，对方攻击力最高的怪兽中毒 2 层。'),
    ('腐溃鱼王', 'aqua', 'UR', 6, 2100, 1200, '辅助型',
     [{'k': 'bleed', 'v': 3, 'on': 'all'}],
     '①：此卡召唤成功时，对方场上全部怪兽流血 3 层（每回合攻击力 -300）。'),
    ('「瞑海祭司」', 'aqua', 'SR', 5, 1700, 1600, '辅助型',
     [{'k': 'poison', 'v': 2}, {'k': 'poisonMon', 'v': 2}],
     '①：此卡召唤成功时，对方中毒 2 层，且对方攻击力最高的怪兽中毒 2 层。'),
    ('恶咒鱼王', 'aqua', 'SR', 5, 1900, 1500, '辅助型',
     [{'k': 'bleed', 'v': 2}, {'k': 'poisonMon', 'v': 1}],
     '①：此卡召唤成功时，对方攻击力最高的怪兽流血 2 层、中毒 1 层。'),
    ('秽血鱼王', 'caro', 'SR', 5, 2000, 1400, '伤害型',
     [{'k': 'bleed', 'v': 3}, {'k': 'pierce'}],
     '①：此卡召唤成功时，对方攻击力最高的怪兽流血 3 层。②：此卡攻击守备表示怪兽时贯穿。'),
]

# ---------------------------------------------------------------- 屏障
barrier_mons = [
    ('「@2庇护者」', 'ultra', 'SR', 4, 1100, 2200, '防御型',
     [{'k': 'barrierMon', 'v': 2}],
     '①：此卡获得 2 层屏障（各抵消一次破坏、弹回或弱化）。'),
    ('「@2赐福者」', 'ultra', 'R', 4, 1300, 1900, '辅助型',
     [{'k': 'barrierMon', 'v': 1}, {'k': 'turnHeal', 'v': 300}],
     '①：此卡获得 1 层屏障。②：自己回合开始时回复 300 点命轮值。'),
    ('库姆', 'aqua', 'R', 3, 800, 2000, '防御型',
     [{'k': 'barrierMon', 'v': 1}, {'k': 'tauntMax', 'v': 1500}],
     '①：此卡获得 1 层屏障。②：攻击力 1500 以下的怪兽必须先攻击此卡。'),
]

# ---------------------------------------------------------------- 召唤体系
summon_mons = [
    ('「千面@2」', 'chaos', 'SR', 4, 1500, 1500, '辅助型',
     [{'k': 'token', 'id': 'tk1', 'v': 1}],
     '①：此卡召唤成功时，在自己场上特殊召唤 1 只「维度残影」衍生物。'),
    ('「永恒寄主」', 'caro', 'SR', 5, 1700, 1700, '辅助型',
     [{'k': 'token', 'id': 'tk2', 'v': 1}],
     '①：此卡召唤成功时，在自己场上特殊召唤 1 只「灰烬傀儡」衍生物。'),
    ('倒错的画作', 'chaos', 'R', 3, 900, 1700, '辅助型',
     [{'k': 'token', 'id': 'tk1', 'v': 2}],
     '①：此卡召唤成功时，特殊召唤 2 只「维度残影」衍生物。'),
]

for group in (counter_mons, taunt_mons, poison_mons, barrier_mons, summon_mons):
    for nm, realm, rar, lv, atk, df, role, fx, text in group:
        mon(nm, realm, rar, lv, atk, df, role, fx, text)

# ---------------------------------------------------------------- 反击 / 嘲讽 / 召唤 的魔法陷阱
REV_SPELLS = [
    ('以血还血', 'caro', 'SR', 'normal',
     [{'k': 'grantFx', 'g': 'counter', 'v': 1200}],
     '自己场上攻击力最高的怪兽获得「反击」：被攻击后给予对方 1200 点伤害（永久）。'),
    ('疼痛共鸣', 'caro', 'R', 'quick',
     [{'k': 'grantFx', 'g': 'counter', 'v': 800}, {'k': 'quickDef', 'v': 300}],
     '自己场上攻击力最高的怪兽获得「反击 800」，本回合自己全部怪兽守备力 +300。'),
    ('复仇的价码', 'chaos', 'SR', 'normal',
     [{'k': 'grantFx', 'g': 'counter', 'v': 700, 'mon': 1}, {'k': 'barrier', 'v': 1}],
     '自己场上一只怪兽获得「反击 700」，自己获得 1 层屏障。'),
    ('链锯回礼', 'caro', 'SR', 'equip',
     [{'k': 'equipAtk', 'v': 300}, {'k': 'equipGrant', 'g': 'counter', 'v': 700}],
     '装备怪兽攻击力 +300，并获得「反击 700」（被攻击后给予对方 700 点伤害）。'),
    ('灯下夜谈', 'ultra', 'UR', 'normal',
     [{'k': 'extraNormal', 'v': 1}, {'k': 'draw', 'v': 1}],
     '本回合可以再通常召唤 1 次，然后自己抽 1 张牌。'),
    ('不眠的排练', 'ultra', 'SR', 'cont',
     [{'k': 'extraNormal', 'v': 1}],
     '永续：自己每个回合都可以通常召唤 2 次。'),
    ('残响回廊', 'chaos', 'SR', 'normal',
     [{'k': 'token', 'id': 'tk1', 'v': 2}],
     '在自己场上特殊召唤 2 只「维度残影」衍生物（不占通常召唤）。'),
    ('灰烬傀儡术', 'caro', 'SR', 'normal',
     [{'k': 'token', 'id': 'tk2', 'v': 1}, {'k': 'draw', 'v': 1}],
     '特殊召唤 1 只「灰烬傀儡」衍生物，然后自己抽 1 张牌。'),
    ('预兆召来', 'aqua', 'SR', 'normal',
     [{'k': 'specialSummon', 'f': 'hand', 'max': 4}],
     '从手牌特殊召唤 1 只等级 4 以下的怪兽（不占通常召唤）。'),
    ('坟前点名', 'caro', 'UR', 'normal',
     [{'k': 'specialSummon', 'f': 'grave', 'max': 4}],
     '从自己墓地特殊召唤 1 只等级 4 以下的怪兽（不占通常召唤）。'),
]
REV_TRAPS = [
    ('血债血偿', 'caro', 'SR', 'normal', [{'k': 'trapCounter', 'v': 1200}],
     '对方怪兽攻击宣言时发动：给予对方 1200 点伤害。'),
    ('断牙', 'chaos', 'SR', 'normal', [{'k': 'trapCounterMon', 'v': 800}],
     '对方怪兽攻击宣言时发动：攻击方怪兽攻击力 -800，降到 0 就破坏它。'),
    ('同罪', 'caro', 'R', 'normal', [{'k': 'trapCounter', 'v': 900}],
     '对方怪兽攻击宣言时发动：给予对方 900 点伤害。'),
    ('铁壁', 'ultra', 'R', 'normal', [{'k': 'trapBarrier', 'v': 2}],
     '对方怪兽攻击宣言时发动：自己获得 2 层屏障（这次的伤害也能挡）。'),
]
for nm, realm, rar, t, fx, text in REV_SPELLS:
    spell(nm, realm, rar, t, fx, text)
for nm, realm, rar, t, fx, text in REV_TRAPS:
    trap(nm, realm, rar, t, fx, text)
spell('腐毒蔓延', 'caro', 'R', 'cont', [{'k': 'contPoison', 'v': 1}],
      '永续：自己每个回合开始时，对方中毒 1 层。')

# ---------------------------------------------------------------- bp14 融灾禁区 · 首领名录
# 这些是 dictionary.json 里 cls=Boss、且之前没做成卡的那批。数值按「首领」给：
# 6~8 星、攻 2200~3000，效果只用手上已有的键。
BOSSES = [
    ('「鲜花守卫」@2', 'caro', 'SR', 6, 2200, 2100, '防御型', [{'k': 'guard'}, {'k': 'barrierMon', 'v': 1}],
     '①：此卡守备表示时，对方不能攻击其他怪兽。②：此卡获得 1 层屏障。'),
    ('精神分裂患者', 'caro', 'R', 4, 1500, 1500, '辅助型', [{'k': 'discardOpp', 'v': 1}],
     '①：此卡召唤成功时，对方随机丢弃 1 张手牌。'),
    ('「缸中之脑」', 'chaos', 'UR', 7, 2400, 1600, '伤害型', [{'k': 'burn', 'v': 900}],
     '①：此卡召唤成功时，给予对方 900 点伤害。'),
    ('「腐坏之脑」', 'chaos', 'SR', 5, 1800, 1600, '辅助型', [{'k': 'poison', 'v': 2}, {'k': 'poisonMon', 'v': 2}],
     '①：此卡召唤成功时，对方中毒 2 层，对方攻击力最高的怪兽也中毒 2 层。'),
    ('「斯特里戈伊之心？」', 'caro', 'UR', 8, 2800, 2000, '伤害型', [{'k': 'drain', 'v': 50}],
     '①：此卡造成战斗伤害时，自己回复其中一半。'),
    ('「福音执事」', 'aqua', 'SR', 5, 1900, 1800, '辅助型', [{'k': 'healDraw', 'v': 600}],
     '①：此卡召唤成功时，自己回复 600 点命轮值并抽 1 张牌。'),
    ('「谕令神官」', 'ultra', 'UR', 6, 2300, 1900, '防御型', [{'k': 'negateSpell'}],
     '①：此卡在场时，对方每回合第 1 张魔法卡无效。'),
    ('「鲸跃」', 'aqua', 'UR', 7, 2600, 1800, '伤害型', [{'k': 'pierce'}, {'k': 'directDiscard', 'v': 1}],
     '①：此卡攻击守备表示怪兽时贯穿。②：此卡直接攻击时，对方随机丢弃 1 张手牌。'),
    ('撕裂维度之足', 'chaos', 'SR', 6, 2300, 1500, '伤害型', [{'k': 'pierce'}],
     '①：此卡攻击守备表示怪兽时贯穿。'),
    ('「命运残兆」', 'aqua', 'UR', 6, 2200, 2000, '辅助型', [{'k': 'search', 'f': 'monster', 'max': 4}, {'k': 'draw', 'v': 1}],
     '①：此卡召唤成功时，从卡组检索 1 只等级 4 以下的怪兽，然后抽 1 张牌。'),
    ('蹈海者亲卫', 'aqua', 'R', 4, 1700, 1500, '伤害型', [{'k': 'pumpSelf', 'v': 200}],
     '①：此卡召唤成功时，此卡攻击力永久 +200。'),
    ('蹈海者近卫', 'aqua', 'R', 4, 1600, 1700, '防御型', [{'k': 'guard'}],
     '①：此卡守备表示时，对方不能攻击其他怪兽。'),
    ('「伊恩斯莫的守卫」', 'ultra', 'SR', 5, 1700, 2200, '防御型', [{'k': 'tauntMax', 'v': 2200}],
     '①：攻击力 2200 以下的怪兽必须先攻击此卡。'),
    ('「分裂患者」', 'caro', 'R', 4, 1600, 1300, '辅助型', [{'k': 'bothDraw', 'v': 1}],
     '①：此卡召唤成功时，双方各抽 1 张牌。'),
    ('影子「24」', 'ultra', 'UR', 7, 2500, 2000, '伤害型', [{'k': 'twin'}, {'k': 'snipeAttack'}],
     '①：此卡每回合可以攻击 2 次。②：此卡攻击宣言时，破坏对方 1 张盖放的陷阱。'),
    ('无瑕的怜心', 'ultra', 'SR', 5, 1600, 2000, '辅助型', [{'k': 'heal', 'v': 800}],
     '①：此卡召唤成功时，自己回复 800 点命轮值。'),
    ('永冬之主', 'aqua', 'UR', 8, 2700, 2300, '防御型', [{'k': 'weakenEnemyAll', 'v': 400}],
     '①：此卡召唤成功时，对方全部怪兽本回合攻击力 -400。'),
    ('终夜之主', 'chaos', 'UR', 8, 2900, 2000, '伤害型', [{'k': 'sweepWeak', 'v': 1500}],
     '①：此卡召唤成功时，双方场上攻击力 1500 以下的怪兽全部破坏。'),
    ('亚兰圣鹭', 'ultra', 'R', 4, 1500, 1800, '辅助型', [{'k': 'realmDraw', 'v': 1}],
     '①：此卡召唤成功时，自己场上每有 1 只超维怪兽就抽 1 张牌（最多 2 张）。'),
    ('圣河努比亚', 'ultra', 'SR', 6, 2100, 2100, '辅助型', [{'k': 'graveHeal', 'v': 300}],
     '①：此卡召唤成功时，自己回复墓地怪兽数 ×300 的命轮值（最多 900）。'),
    ('长明·努比亚巨木', 'ultra', 'UR', 7, 2400, 2600, '防御型', [{'k': 'turnHeal', 'v': 500}],
     '①：自己回合开始时回复 500 点命轮值。'),
    ('残酷的「父亲」', 'caro', 'SR', 5, 2000, 1400, '伤害型', [{'k': 'sacrificeHeal', 'v': 800}],
     '①：此卡召唤成功时，破坏自己场上攻击力最低的怪兽，回复 800 点命轮值并抽 1 张牌。'),
    ('「甜蜜恶鬼」', 'caro', 'SR', 5, 1900, 1500, '辅助型', [{'k': 'discardDraw', 'v': 2}],
     '①：此卡召唤成功时，自己丢弃 1 张手牌，然后抽 2 张。'),
    ('「蜡像潘狄娅」', 'chaos', 'UR', 6, 2200, 1900, '辅助型', [{'k': 'recall', 'v': 1}],
     '①：此卡召唤成功时，从自己墓地取回 1 张魔法卡。'),
    ('「@2：万象门扉」', 'ultra', 'GR', 8, 3000, 2500, '伤害型', [{'k': 'destroyStrongest'}, {'k': 'barrierMon', 'v': 1}],
     '①：此卡召唤成功时，破坏对方场上攻击力最高的 1 只怪兽。②：此卡获得 1 层屏障。'),
    ('「夏洛特」', 'ultra', 'UR', 7, 2500, 2100, '辅助型', [{'k': 'echoDraw'}, {'k': 'poison', 'v': 1}],
     '①：此卡召唤成功时，自己抽 2 张、对方抽 1 张，对方中毒 1 层。'),
    ('「生物拟态溶浆-二重」', 'caro', 'UR', 7, 2300, 2300, '防御型', [{'k': 'revive'}, {'k': 'barrierMon', 'v': 1}],
     '①：此卡获得 1 层屏障。②：此卡被破坏时回到自己手牌（一次）。'),
    ('「审判」的使徒', 'chaos', 'SR', 5, 1800, 1700, '辅助型', [{'k': 'graveBurn', 'v': 200, 'max': 5}],
     '①：此卡召唤成功时，对方每有 1 张墓地怪兽卡就受 200 点伤害（自己墓地，最多 5 张）。'),
    ('亚弗姆扎', 'chaos', 'UR', 6, 2400, 1800, '伤害型', [{'k': 'onKillDraw', 'v': 1}, {'k': 'onKillAtk', 'v': 300}],
     '①：此卡战斗破坏对方怪兽时，自己抽 1 张牌且此卡攻击力 +300。'),
    ('「以图存续」', 'caro', 'SR', 6, 2000, 2200, '防御型', [{'k': 'lastStand'}],
     '①：此卡每一局第一次被破坏时不会被破坏。'),
    ('「求诸己身」', 'chaos', 'SR', 5, 1700, 1900, '辅助型', [{'k': 'atkUpTurn', 'v': 300}],
     '①：自己回合开始时，此卡攻击力 +300。'),
    ('「聆听启示」', 'ultra', 'SR', 4, 1400, 1600, '辅助型', [{'k': 'extraDraw', 'v': 1}],
     '①：此卡召唤成功时，自己抽 1 张牌。'),
]
for nm, realm, rar, lv, atk, df, role, fx, text in BOSSES:
    mon(nm, realm, rar, lv, atk, df, role, fx, text)

json.dump(cards, open(cards_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- 卡包
byname = {c['n']: c['id'] for k in ('monsters', 'spells', 'traps', 'extras') for c in cards[k]}


def ids(names):
    out = []
    for x in names:
        if x not in byname:
            raise SystemExit('卡包里找不到：' + x)
        out.append(byname[x])
    return out


PACKS = [
    ('bp14', '融灾禁区 · 首领名录', 'DISASTER ZONE · BOSSES', '首领 · 十个分区',
     '溶洞、病栋、蜡像馆、维度裂隙——每一层尽头都站着一个不肯走的人。他们的名字都写在悬赏榜上，后面跟着一行小字：不要单独接触。',
     ['「@2：万象门扉」', '「斯特里戈伊之心？」', '永冬之主', '终夜之主', '「鲸跃」',
      '影子「24」', '长明·努比亚巨木', '「夏洛特」', '「生物拟态溶浆-二重」', '「谕令神官」',
      '「缸中之脑」', '亚弗姆扎', '「蜡像潘狄娅」', '圣河努比亚', '「命运残兆」',
      '撕裂维度之足', '「以图存续」', '「腐坏之脑」', '「鲜花守卫」@2', '「甜蜜恶鬼」',
      '残酷的「父亲」', '「审判」的使徒', '「求诸己身」', '无瑕的怜心', '「伊恩斯莫的守卫」',
      '「福音执事」', '蹈海者近卫', '蹈海者亲卫', '亚兰圣鹭', '「聆听启示」',
      '精神分裂患者', '「分裂患者」']),
    ('bp15', '痛觉与回声', 'PAIN & ECHO', '反击 · 嘲讽 · 中毒 · 召唤',
     '这一包不讲人，讲「挨打之后会发生什么」：有人还手，有人硬挡，有人把毒摸进你伤口里，有人在空位上多摆一个自己。',
     ['暴走猎颅者', '「无尽饥渊」', '「刻耳柏洛斯」', '「美德骑士」', '阴影的忠犬', '「祝圣司铎」',
      '「护灯尊者」', '「灯罩」阿依莎', '「王邸管家」弗兰', '亚兰卫队长', '沉默的「母亲」', '「睡莲」',
      '「淤泥之花」', '腐溃鱼王', '秽血鱼王', '「瞑海祭司」', '恶咒鱼王', '食尸鬼卫队长',
      '「@2庇护者」', '「@2赐福者」', '库姆',
      '「千面@2」', '「永恒寄主」', '倒错的画作',
      '以血还血', '疼痛共鸣', '复仇的价码', '链锯回礼',
      '灯下夜谈', '不眠的排练', '残响回廊', '灰烬傀儡术', '预兆召来', '坟前点名', '腐毒蔓延',
      '血债血偿', '断牙', '同罪', '铁壁']),
]

# ---------------------------------------------------------------- 预组
DECKS = [
    {'id': 'd21', 'n': '以牙还牙', 'en': 'EYE FOR EYE', 'r': 'caro',
     'desc': '这套牌不主动找架打：它把怪摆在场上，然后等你撞上来。你打得越狠，你掉得越快。',
     'cards': [['阴影的忠犬', 3], ['「祝圣司铎」', 3], ['「美德骑士」', 1], ['「刻耳柏洛斯」', 1],
               ['暴走猎颅者', 2], ['「无尽饥渊」', 1], ['「以眼还眼」', 1], ['茜尔维娅', 1],
               ['以血还血', 2], ['链锯回礼', 2], ['疼痛共鸣', 1], ['复仇的价码', 1],
               ['血之偿还', 2], ['命轮占卜', 1], ['融蚀风暴', 2], ['记忆回溯', 1],
               ['血债血偿', 2], ['断牙', 2], ['同罪', 1]],
     'extra': [],
     'combo': ['「阴影的忠犬」1300 攻站在攻击表示：它死之前会先咬你 800。',
               '「以血还血」把反击贴到场上最大的那只身上，它从此打一下要付一次钱。',
               '「暴走猎颅者」的反击打的是怪兽本身——对面的大怪会一拳一拳自己烂掉。',
               '「断牙」专治一次砍不死的大怪：800 攻削下去，下一回合它就撞不动你的墙了。'],
     'tips': '别急着进攻。先把手里的反击牌贴满，让对方自己撞上来；真要打的时候用「暴走猎颅者」点掉它最大的那只。'},
    {'id': 'd22', 'n': '回声工坊', 'en': 'ECHO WORKSHOP', 'r': 'ultra',
     'desc': '造物不是凭空来的，是先有图纸、再有影子、最后才有东西。这套牌靠衍生物把场铺满，再用它们换一只真正的大怪。',
     'cards': [['倒错的画作', 2], ['「千面@2」', 2], ['「永恒寄主」', 2], ['「@2庇护者」', 1],
               ['「聆听启示」', 2], ['汀克特', 2], ['N', 1], ['艾尔莎', 2], ['小煤球', 2],
               ['灯下夜谈', 2], ['残响回廊', 2], ['灰烬傀儡术', 1], ['预兆召来', 2],
               ['坟前点名', 1], ['命轮占卜', 2], ['融蚀风暴', 1], ['记忆回溯', 1],
               ['缄默之壁', 2]],
     'extra': [],
     'combo': ['「倒错的画作」落地就是两只影子：两个身位、两张祭品、两个挡刀的。',
               '「灯下夜谈」让你一回合召唤两次——先出手上那只，再把手牌清空。',
               '「残响回廊」白送两个身位，专门用来喂 5 星以上的大怪。',
               '「坟前点名」把打死的怪捡回来，等于多一张手牌。'],
     'tips': '场面永远比手牌重要：先铺满影子，再用祭品换「@2庇护者」和「聆听启示」这类能换资源的大怪。'},
]

# ---- 字符串插入（保住手写格式）----
raw = raw.rstrip()
PACK_ANCHOR = '\n ],\n "decks": ['
i = raw.index(PACK_ANCHOR)
head, tail = raw[:i], raw[i:]


def pack_block(p):
    cells = ['"%s"' % c for c in p[5]]
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
                p[0], p[1], p[2], p[3], p[4], body))


packs_txt = ',\n'.join(pack_block((p[0], p[1], p[2], p[3], p[4], ids(p[5]))) for p in PACKS)
raw = head.rstrip() + ',\n' + packs_txt + tail


def deck_block(d):
    pairs = []
    for nm, n in d['cards']:
        if nm not in byname:
            raise SystemExit('预组 %s 里 %s 找不到' % (d['id'], nm))
        pairs.append([byname[nm], n])
    tot = sum(x[1] for x in pairs)
    if tot != 30:
        raise SystemExit('预组 %s 是 %d 张' % (d['id'], tot))
    cells = ['["%s", %d]' % (c, n) for c, n in pairs]
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

json.loads(raw)
open(packs_p, 'w', encoding='utf-8', newline='').write(raw)
print('怪兽 %d / 魔法 %d / 陷阱 %d / 觉醒体 %d' % tuple(
    len(cards[k]) for k in ('monsters', 'spells', 'traps', 'extras')))
print('卡包 +%d（%s），预组 +%d（%s）' % (
    len(PACKS), ' '.join(p[0] for p in PACKS), len(DECKS), ' '.join(d['id'] for d in DECKS)))
