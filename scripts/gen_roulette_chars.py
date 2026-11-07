# -*- coding: utf-8 -*-
"""弥萨格轮盘的出战名单：把 62 名唤醒体 + 12 位主播一次性铺进 data/roulette-chars.json。

**这个脚本只在「扩名单」时跑一次，会整体覆盖 data/roulette-chars.json。**
跑完之后的数值调整（hp / 随身道具）直接改 JSON——scripts/roulette-tune.mjs 就是在
JSON 上做微调的，别再跑这个脚本把它冲掉。

分配规则（写死在这里，是为了让 74 个人真的有区别，而不是随机糊一遍）：
  · 被动 14 个机制（引擎认的那几个 k），每个职阶各有一套候选，按顺序轮着发；
    同机制在不同界域叫不同的名字（错位外壳 / 自律装甲 / 潮下茧 / 白夜罩），
    这样既复用一套结算、读起来又是「这个人自己的东西」。
  · 随身道具 = 职阶道具 + 界域信物。被动越强，随身越少（强的 1 件、中等的 2 件、弱的 3 件）。
  · 理智初始统一 5，随后由 scripts/roulette-tune.mjs 按实测胜率加减（3~7 之间）。

用法：python scripts/gen_roulette_chars.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'data/roulette-chars.json')

# 手写的十位原班人马：这一段永远照抄，生成器不碰
KEEP = {
    'a-15601', 'a-15600', 'a-15591', 'a-15567', 'a-95786',
    'a-15570', 'a-15598', 'a-15568', 'a-15576', 'a-151844',
}

# 12 位主播（idle/src/core/creators.js 的 CREATORS，这里只抄字段，别引入那个模块）
CREATORS = [
    ('samo', '萨摩不耶', '混沌', '防御型'),
    ('mengyi', '梦依流苏', '深海', '辅助型'),
    ('alice', '爱丽丝', '超维', '伤害型'),
    ('ratking', '鼠王', '血肉', '伤害型'),
    ('dragond', '魔龙_D', '混沌', '伤害型'),
    ('zerok', '立誓0氪', '血肉', '辅助型'),
    ('xiamolin', '夏茉琳', '深海', '辅助型'),
    ('chaoxing', '朝星', '超维', '伤害型'),
    ('maodie', '路过的耄耋', '血肉', '防御型'),
    ('baiyun', '白云出岫', '超维', '辅助型'),
    ('banxing', '半醒的鱼', '深海', '辅助型'),
    ('shangchunke', '伤春客', '混沌', '伤害型'),
]

# 机制 → (数值, 说明模板, 强度)。强度只用来决定随身带几件：≥2.5 带 1 件、≥1.5 带 2 件、其余 3 件。
ARCH = {
    'armor': (1, '每局开局自动获得 {v} 层护盾。', 1.5),
    'grit': (0, '每局第一次被实弹打中时，那一下的伤害 -1（至少 0）。', 1.0),
    'echo': (2, '你对自己打出空壳时，从桌上再摸 1 件道具（每局最多 {v} 次）。', 1.0),
    'precog1': (1, '每局开局看清第一颗子弹。', 1.0),
    'precog2': (3, '每局开局自动看清前 {v} 颗子弹。', 2.5),
    'aim': (1, '每局开局看清第一颗；每局一次的实弹若正是你亲手看清的那一颗，伤害 +1。', 2.0),
    'lifesteal': (1, '对对手造成实弹伤害后回复 1 点理智（每局最多 {v} 次）。', 2.0),
    'greed': (0, '对手每局少拿 1 件道具——桌上东西都归你先挑。', 3.0),
    'extra': (0, '每局多拿 1 件道具。', 1.5),
    'serrate': (1, '每局第一把锯是 +2 伤害（锯齿），第二把退回普通的 +1。', 2.0),
    'revive': (0, '整场一次：理智归零时回到 2 点，这一局接着打。', 1.5),
    'lucky': (0, '残念药剂对你必定成功（稳定回 2 点理智）。', 1.0),
    'siphon': (1, '对手自射打出实弹时，你回复 1 点理智（每局最多 {v} 次）。', 1.0),
    'menace': (0, '你的实弹打中对手后，对手下一回合用不了道具。', 1.0),
}

# 同一机制在四个界域里的名字：字面上要像那个人自己的东西
NAME = {
    'armor': {'混沌': '错位外壳', '血肉': '缝合外壳', '深海': '潮下茧', '超维': '白夜罩'},
    'grit': {'混沌': '不认账', '血肉': '皮糙肉厚', '深海': '咸水泡胀', '超维': '延迟结算'},
    'echo': {'混沌': '回声', '血肉': '空壳回声', '深海': '拾回的回声', '超维': '缓存残响'},
    'precog1': {'混沌': '命轮演算', '血肉': '手感', '深海': '潮讯', '超维': '一秒之后'},
    'precog2': {'混沌': '线头之前', '血肉': '血脉记忆', '深海': '深潜预读', '超维': '时序回放'},
    'aim': {'混沌': '先算后打', '血肉': '见血封喉', '深海': '定桩', '超维': '校准'},
    'lifesteal': {'混沌': '借来的体温', '血肉': '血偿', '深海': '血水', '超维': '逆流'},
    'greed': {'混沌': '王座旁听', '血肉': '抢在前头', '深海': '先挑', '超维': '抽成'},
    'extra': {'混沌': '兜比脸大', '血肉': '兜底', '深海': '拾荒', '超维': '多线程'},
    'serrate': {'混沌': '磨过的齿', '血肉': '锯口', '深海': '锈刃', '超维': '高频切割'},
    'revive': {'混沌': '倒带', '血肉': '不肯闭眼', '深海': '浮上来', '超维': '存档点'},
    'lucky': {'混沌': '蒙对了', '血肉': '抗药', '深海': '押对了', '超维': '概率坍缩'},
    'siphon': {'混沌': '幸灾乐祸', '血肉': '舔伤口', '深海': '分一杯', '超维': '旁观者收益'},
    'menace': {'混沌': '噤声', '血肉': '拽住手腕', '深海': '缠住', '超维': '静默区'},
}

# 每个职阶的候选机制：按顺序轮着发，保证同一个职阶里不会扎堆
ROLE_PICK = {
    '伤害型': ['aim', 'serrate', 'lifesteal', 'menace', 'precog1', 'siphon', 'grit'],
    '防御型': ['armor', 'grit', 'revive', 'lucky', 'extra', 'greed', 'siphon'],
    '辅助型': ['precog2', 'echo', 'extra', 'precog1', 'greed', 'armor', 'menace'],
}

# 随身道具：职阶一件 + 界域一件，各自在三个/两个候选里轮着发。
# 为什么不是「一个界域固定一件」：实测下来道具的强弱差比界域标签值钱得多
# （逆变器、窥镜这种信息牌在 AI 手里明显弱于药剂），固定绑定会让整个界域一起垫底。
ROLE_ITEM = {
    '伤害型': ['saw', 'chain', 'cuff'],
    '防御型': ['aegis', 'smoke', 'pill'],
    '辅助型': ['lens', 'scroll', 'needle'],
}
REALM_ITEM = {
    '混沌': ['oracle', 'whisper'],
    '血肉': ['chain', 'needle'],
    '深海': ['pill', 'hourglass'],
    '超维': ['cuff', 'seal'],
}

REALM_CODE = {'CHAOS': '混沌', 'CARO': '血肉', 'AEQUOR': '深海', 'ULTRA': '超维'}


def passive_for(arch, realm):
    v, tmpl, power = ARCH[arch]
    p = {'k': arch, 'n': NAME[arch][realm], 'd': tmpl.format(v=v) if '{v}' in tmpl else tmpl}
    if v:
        p['v'] = v
    return p, power


# 理智上限的初值：按第一轮实测（hp5 + 两件随身）各被动的胜率排出来，
# 强的少给一格、弱的多给一格；之后由 scripts/roulette-tune.mjs 逐个微调。
HP0 = {k: 5 for k in ARCH}


def items_for(arch, realm, role, i):
    r = ROLE_ITEM[role]
    m = REALM_ITEM[realm]
    return [r[i % len(r)], m[i % len(m)]]


def main():
    with open(os.path.join(ROOT, 'data/dict.json'), encoding='utf-8') as f:
        dic = json.load(f)
    with open(os.path.join(ROOT, 'data/avatars.json'), encoding='utf-8') as f:
        av = {x['id']: x for x in json.load(f)['items']}
    with open(OUT, encoding='utf-8') as f:
        old = json.load(f)
    kept = {c['id']: c for c in old['chars'] if c['id'] in KEEP}
    if len(kept) != len(KEEP):
        raise SystemExit('旧的 roulette-chars.json 里缺了手写的唤醒体，先找回来再跑')

    for c in kept.values():
        c['n'] = av[c['id']]['n']
    chars = [kept[i] for i in KEEP if i in kept]
    # 手写的十位按文件里的原顺序排在前面，其余按界域 → 职阶 → 名字排，选人时好找
    order = {c['id']: n for n, c in enumerate([x for x in old['chars'] if x['id'] in KEEP])}
    chars.sort(key=lambda c: order.get(c['id'], 99))

    rest = []
    for x in dic['awakener']:
        aid = 'a-' + x['id']
        if aid in KEEP:
            continue
        realm = REALM_CODE.get(x.get('realmCode'), x.get('realm') or '混沌')
        role = x.get('role') or '辅助型'
        if role not in ROLE_PICK:
            role = '辅助型'
        rest.append((realm, role, aid, x.get('zh') or aid, av.get(aid, {}).get('src') or ('assets/avatars/%s.webp' % aid)))
    for slug, zh, realm, role in CREATORS:
        rest.append((realm, role, 'c-' + slug, zh, 'idle/public/img/awk/%s.webp' % slug))

    realm_rank = {'混沌': 0, '血肉': 1, '深海': 2, '超维': 3}
    role_rank = {'伤害型': 0, '防御型': 1, '辅助型': 2}
    rest.sort(key=lambda r: (realm_rank.get(r[0], 9), role_rank.get(r[1], 9), r[3]))

    counter = {}
    seen_in_role = {}
    for realm, role, cid, zh, src in rest:

        pool = ROLE_PICK[role]
        n = counter.get(role, 0)
        counter[role] = n + 1
        k = seen_in_role.get(role, 0)
        seen_in_role[role] = k + 1
        arch = pool[n % len(pool)]
        passive, _ = passive_for(arch, realm)
        chars.append({
            'id': cid,
            'n': zh,
            'hp': HP0[arch],
            'items': items_for(arch, realm, role, k),
            'passive': passive,
            'realm': realm,
            'role': role,
            'src': src,
        })
        if not os.path.exists(os.path.join(ROOT, src)):
            raise SystemExit('头像不存在：' + src)

    doc = {
        'note': ('弥萨格轮盘（恶魔轮盘同人）的出战唤醒体。hp＝每局起始理智，每局开打前补满；'
                 'items＝每局固定带的随身道具（之后每局再按局数摸牌）。passive.k 是 '
                 'js/roulette/engine.js 里认的钩子名，改之前先看那边有没有这一支；'
                 'realm / role 抄自 data/dict.json 与 idle 的主播名单，别手改。'),
        'chars': chars,
    }
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(doc, ensure_ascii=False, indent=2) + '\n')
    print('写入 %d 位（唤醒体 %d / 主播 %d）' % (
        len(chars), sum(1 for c in chars if not c['id'].startswith('c-')),
        sum(1 for c in chars if c['id'].startswith('c-'))))


if __name__ == '__main__':
    main()
