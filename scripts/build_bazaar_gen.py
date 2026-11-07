# -*- coding: utf-8 -*-
"""生成《大巴扎：银钥》的全量数据表 + 素材图集。

数据来源：idle/public/data/game-data.json（客户端解包口径）
  awakeners 62 / relics 310（造物）/ wheels 149（命轮）/ covenants 21（密契）/ monsters 537

产出：
  js/bazaar-gen.js                  HEROES / RELICS / WHEELS / PACTS / FOES / SHEETS
  assets/bazaar/sheet-hero.webp     62 格（80）：头像
  assets/bazaar/sheet-item.webp     331 格（56）：248 造物 + 62 维度影像 + 21 密契
  assets/bazaar/sheet-wheel.webp    149 格（48）
  assets/bazaar/sheet-mon.webp      537 格（56）

规则上的三种东西在这里定死：
  唤醒体：占 1~3 格（按客户端 base/scale 折出来的强度分档），每 cd 拍产出 gen 点算力，
          顺手打一下 / 架个盾 / 挂易伤；并且对左右相邻的唤醒体有光环（供能 / 加速 / 增幅）。
  命轮　：主要输出来源。攒够 cpu 算力就在自己的节拍上开一炮，伤害跟算力消耗挂钩。
  造物　：不占出手，纯静态加成（算力上限、产出效率、命轮增伤、暴击……）。

为什么用雪碧图：一千多张图各自请求一次，EdgeOne 每个请求 1~2 秒，开局就是分钟级。
一张图 + 百分比定位（`background-size: cols*100%`，`background-position: col/(cols-1)*100%`）
就能让同一个图在不同尺寸的格子里都正确缩放，UI 那边只算两个百分比。

用法：
    python scripts/build_bazaar_gen.py
    node scripts/build.mjs
"""
import hashlib
import json
import os
import re

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GD = json.load(open(os.path.join(ROOT, 'idle', 'public', 'data', 'game-data.json'), encoding='utf-8'))
SRC = os.path.join(ROOT, 'idle', 'public')
OUT_JS = os.path.join(ROOT, 'js', 'bazaar-gen.js')
OUT_DIR = os.path.join(ROOT, 'assets', 'bazaar')


def hv(s, mod=100000):
    return int(hashlib.md5(str(s).encode('utf-8')).hexdigest()[:8], 16) % mod


# ---------------------------------------------------------------- 图集
class Sheet:
    def __init__(self, key, cell, cols):
        self.key = key
        self.cell = cell
        self.cols = cols
        self.items = []
        self.paths = []

    def add(self, path):
        self.items.append(len(self.paths))
        self.paths.append(str(path))
        return len(self.paths) - 1

    def idx(self, path):
        """同一张图只占一格：主播的维度影像要复用官方那批，别各加一份。"""
        p = str(path)
        if p in self.paths:
            return self.paths.index(p)
        return self.add(p)

    def render(self):
        rows = max(1, (len(self.paths) + self.cols - 1) // self.cols)
        canvas = Image.new('RGBA', (self.cols * self.cell, rows * self.cell), (0, 0, 0, 0))
        for i, p in enumerate(self.paths):
            im = Image.open(p)
            if im.mode not in ('RGBA',):
                im = im.convert('RGBA')
            w, h = im.size
            k = min(self.cell / float(w), self.cell / float(h))
            im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
            x = (i % self.cols) * self.cell + (self.cell - im.size[0]) // 2
            y = (i // self.cols) * self.cell + (self.cell - im.size[1]) // 2
            canvas.alpha_composite(im, (x, y))
        out = os.path.join(OUT_DIR, 'sheet-%s.webp' % self.key)
        canvas.save(out, 'WEBP', quality=74, method=6)
        return {'src': 'assets/bazaar/sheet-%s.webp' % self.key, 'cols': self.cols, 'rows': rows,
                'cell': self.cell, 'n': len(self.paths), 'bytes': os.path.getsize(out)}


SHEET_HERO = Sheet('hero', 80, 8)
SHEET_ITEM = Sheet('item', 56, 19)
SHEET_WHEEL = Sheet('wheel', 48, 13)
SHEET_MON = Sheet('mon', 56, 20)

# ---------------------------------------------------------------- 造物：名字 → 流派
# 顺序即优先级：更具体的先匹配（「毒牙」算毒，不算牙）。
ARCH_KEYS = [
    ('poison', ['毒', '蛊', '瘴', '腐', '疫', '虫', '蛇', '蛛', '蝎', '蛭', '霉', '菌', '鳗', '蜕']),
    ('burn', ['焰', '烬', '火', '炎', '熔', '烛', '灯', '焦', '炉', '炭', '炙', '焚', '香炉']),
    ('thorns', ['荆棘', '刺', '针', '钉', '钩', '棘', '锯', '锥', '颌骨']),
    ('shield', ['盾', '甲', '壳', '盔', '护', '壁', '罩', '障', '铠', '垒', '背心', '风衣',
                '拘束服', '襁褓', '阳伞', '头盔', '面纱', '面罩', '手套', '外骨骼']),
    ('heal', ['药', '愈', '疗', '膏', '汤', '酒', '食', '餐', '饮', '泪', '乳', '蜜', '茶',
              '输血', '呼吸', '镇痛', '注射', '制剂', '药片', '灵药', '救济', '镇痛']),
    ('gold', ['金', '币', '钱', '宝', '袋', '囊', '税', '债', '账', '票', '铸', '商',
              '钱包', '邮票', '贡物', '宝藏', '秘宝', '奖杯', '勋章', '徽', '贡']),
    ('crit', ['眼', '镜', '棱', '瞳', '准', '星', '靶', '标尺', '视力', '瞳孔']),
    ('haste', ['钟', '表', '沙漏', '轮', '摆', '簧', '机关', '发条', '轴', '齿轮']),
    ('regen', ['春', '芽', '种', '母', '哺', '巢', '藤', '根', '脐带', '卵']),
    ('slow', ['网', '链', '枷', '镣', '锁', '缚', '绳', '陷', '笼', '拘束', '重锁', '缄默']),
    ('vuln', ['咒', '诅', '哭', '怨', '悲', '梦', '喑', '哑', '噩梦', '厄运', '恐惧', '谜', '错觉']),
    ('aura', ['像', '碑', '旗', '典', '谱', '章', '戒', '环', '冠', '座', '坛', '符',
              '徽章', '拓印', '图腾', '雕像', '仪', '仪式', '乐谱', '纸草', '手稿', '记录']),
    ('str', ['心', '骨', '脊', '魂', '誓', '印', '怒', '喉', '喙', '腕', '肢', '牙', '爪', '肋']),
    ('dmg', ['刃', '刀', '剑', '斧', '锤', '矛', '枪', '箭', '弩', '弹', '拳', '叉',
             '镰', '棍', '镐', '炮', '钳', '匕', '铳', '棒', '爪']),
]

# 「时灵摆」这一族有四十多件，副标题其实就是它的效用，逐条对一遍比统一算加速有意思
PENDULUM = {
    '回噬': 'str', '均衡': 'shield', '赐福': 'heal', '温床': 'regen', '混沌馈赠': 'crit',
    '蓄力！': 'str', '深化': 'poison', '窃梦': 'vuln', '回响': 'aura', '演绎': 'crit',
    '终结': 'dmg', '衍化': 'regen', '眼': 'crit', '迷梦': 'vuln', '间隙': 'haste',
    '迷失': 'slow', '冥想': 'heal', '月亮': 'regen', '梦魇': 'vuln', '隐秘': 'crit',
    '解析': 'crit', '疫症': 'poison', '校长寄语': 'gold', '投射': 'dmg', '增殖': 'poison',
    '复苏': 'heal', '不眠': 'haste', '浅眠': 'shield', '群星': 'crit', '惊梦': 'vuln',
    '执拗': 'thorns', '潜游': 'shield', '沉船秘宝': 'gold', '涌动': 'haste', '潮涌': 'dmg',
    '入迷': 'vuln', '秘宝α': 'gold', '双生': 'dmg', '不洁': 'poison', '祈愿': 'gold',
    'Buildup': 'str', 'Reciprocate': 'thorns', 'Wings': 'haste', 'Alert': 'crit',
    'Confuse': 'slow', 'Duel': 'dmg', 'Lurk': 'shield', 'Scare': 'vuln', 'Voodoo': 'vuln',
}


def arch_of(name):
    if '灵摆' in name or 'Pendulum' in name:
        m = re.search(r'[「"]([^」"]+)[」"]', name)
        if not m:
            m = re.search(r'-\s*([A-Za-zα]+)\s*$', name)
        key = (m.group(1) if m else '').strip()
        for k, v in PENDULUM.items():
            if key.startswith(k) or k in key:
                return v
        return 'haste'
    for arch, kws in ARCH_KEYS:
        for kw in kws:
            if kw in name:
                return arch
    return 'dmg'


# 造物在新规则里不自己出手，只提供静态加成。数值按稀有度分档，给哪一项由流派 + 哈希决定。
REL_BASE = {
    'cap':    {'N': 6, 'SR': 9, 'SSR': 13},
    'gen':    {'N': 0.08, 'SR': 0.12, 'SSR': 0.18},
    'amp':    {'N': 0.07, 'SR': 0.10, 'SSR': 0.15},
    'crit':   {'N': 0.04, 'SR': 0.06, 'SSR': 0.09},
    'cdmg':   {'N': 0.15, 'SR': 0.22, 'SSR': 0.32},
    'shcap':  {'N': 12, 'SR': 18, 'SSR': 26},
    'regen':  {'N': 1, 'SR': 2, 'SSR': 3},
    'start':  {'N': 5, 'SR': 7, 'SSR': 10},
    'wcd':    {'N': 0, 'SR': 1, 'SSR': 1},   # 0 = 该稀有度不给这个变体
    'thorns': {'N': 2, 'SR': 3, 'SSR': 5},
    'gold':   {'N': 1, 'SR': 2, 'SSR': 3},
}
REL_POOL = {
    'gold': ['gold', 'cap', 'start'],
    'crit': ['crit', 'cdmg'],
    'haste': ['wcd', 'cap'],
    'aura': ['cap', 'amp'],
    'shield': ['shcap', 'regen'],
    'thorns': ['thorns', 'shcap'],
    'heal': ['regen', 'shcap'],
    'regen': ['regen', 'cap'],
    'poison': ['amp', 'crit'],
    'burn': ['amp', 'cdmg'],
    'dmg': ['amp', 'crit'],
    'str': ['amp', 'cdmg'],
    'vuln': ['amp', 'crit'],
    'slow': ['cap', 'amp'],
    'fate': ['cap', 'start'],
}

COST = {'N': 4, 'SR': 6, 'SSR': 8}


def relic_mod(arch, rar, seed):
    pool = REL_POOL.get(arch) or ['amp']
    for i in range(len(pool)):
        k = pool[(hv(seed) + i) % len(pool)]
        v = REL_BASE[k][rar]
        if k == 'wcd' and v <= 0:
            continue
        j = [0.9, 1.0, 1.15][hv(seed + k) % 3]
        v = round(v * j, 3) if k in ('gen', 'amp', 'crit', 'cdmg') else round(v * j)
        return {'k': k, 'v': v}
    return {'k': 'amp', 'v': REL_BASE['amp'][rar]}


def build_items():
    relics = GD['relics']
    # 维度影像·X：每个唤醒体一件本命造物，跟着主人上场（不占造物槽，算主人的被动）
    fate = {}
    normal = []
    for r in relics:
        if r['zh'].startswith('维度影像·'):
            fate[r['zh'].split('·', 1)[1]] = r
        else:
            normal.append(r)
    items = []
    for r in normal:
        arch = arch_of(r['zh'])
        rar = r['rarity']
        idx = SHEET_ITEM.add(os.path.join(SRC, r['img']))
        items.append({'id': r['id'][-4:], 'n': r['zh'], 'spr': 'item:%d' % idx, 'r': rar,
                      'cost': COST[rar] + hv(r['id'] + 'c') % 3,
                      'm': relic_mod(arch, rar, r['id']), 'arch': arch})
    for name, r in fate.items():
        idx = SHEET_ITEM.add(os.path.join(SRC, r['img']))
        items.append({'id': r['id'][-4:], 'n': r['zh'], 'spr': 'item:%d' % idx, 'r': 'FATE',
                      'cost': 0, 'm': {'k': 'cap', 'v': 6}, 'arch': 'fate', 'fate': name})
    return items, fate


# ---------------------------------------------------------------- 命轮
# 客户端八种主词条 → 四个档位的实际数值（做全局被动）
WHEEL_NUM = {
    'CRIT_RATE':         {'N': 0.05, 'SR': 0.07, 'R': 0.04, 'SSR': 0.09},
    'CRIT_DMG':          {'N': 0.25, 'SR': 0.35, 'R': 0.18, 'SSR': 0.45},
    'DMG_AMP':           {'N': 0.04, 'SR': 0.06, 'R': 0.03, 'SSR': 0.08},
    'KEYFLARE_REGEN':    {'N': 1, 'SR': 1, 'R': 1, 'SSR': 2},        # 每拍回血
    'SIGIL_YIELD':       {'N': 90, 'SR': 120, 'R': 60, 'SSR': 150},  # 折算成每场金币（下面再除）
    'REALM_MASTERY':     {'N': 1.5, 'SR': 2.2, 'R': 1, 'SSR': 3},    # 每次伤害的固定附加值
    'DEATH_RESISTANCE':  {'N': 10, 'SR': 14, 'R': 7, 'SSR': 18},     # 生命上限
    'ALIEMUS_REGEN':     {'N': 4, 'SR': 6, 'R': 3, 'SSR': 8},        # 每 4 拍护盾
}
WHEEL_ZH = {
    'CRIT_RATE': '暴击率', 'CRIT_DMG': '暴击伤害', 'DMG_AMP': '伤害加成',
    'KEYFLARE_REGEN': '钥焰回生', 'SIGIL_YIELD': '印记收益', 'REALM_MASTERY': '领域精通',
    'DEATH_RESISTANCE': '死亡抗性', 'ALIEMUS_REGEN': '阿利穆斯回响',
}
# 领域副属性：让同主词条的命轮也有点差别
REALM_PERK = {
    'CHAOS': {'k': 'amp', 'v': 0.02, 'txt': '混沌：命轮伤害 +2%'},
    'CARO': {'k': 'poison', 'v': 0.2, 'txt': '血肉：中毒 +20%'},
    'AEQUOR': {'k': 'shield', 'v': 5, 'txt': '深海：开战获得 5 点护盾'},
    'ULTRA': {'k': 'crit', 'v': 0.02, 'txt': '超维：暴击率 +2%'},
}

# 算力消耗 / 出手节拍：贵的打得重，也吃得更狠
CPU_COST = {'N': 10, 'R': 11, 'SR': 16, 'SSR': 20}
WCD = {'N': 4, 'R': 4, 'SR': 5, 'SSR': 5}
# 同样一口算力，不同领域打成不一样的东西
REALM_MUL = {'CHAOS': 1.05, 'CARO': 0.90, 'AEQUOR': 0.95, 'ULTRA': 1.00}


def wheel_ops(realm, cpu, seed):
    q = hv(seed) % 4
    if realm == 'CHAOS':
        if q == 0:
            return [{'k': 'dmg', 'v': round(cpu * 0.95, 1), 'pierce': 1}]
        return [{'k': 'dmg', 'v': round(cpu * 1.05, 1)}]
    if realm == 'CARO':
        return [{'k': 'dmg', 'v': round(cpu * 0.72, 1)},
                {'k': 'poison', 'v': round(cpu * 0.18, 1)}]
    if realm == 'AEQUOR':
        return [{'k': 'dmg', 'v': round(cpu * 0.75, 1)},
                {'k': 'shield', 'v': round(cpu * 0.40)}]
    hits = 3 if q == 0 else 2
    return [{'k': 'dmg', 'v': round(cpu * REALM_MUL['ULTRA'] / hits, 1), 'hits': hits}]


def build_wheels():
    out = []
    for w in GD['wheels']:
        rar = w['rarity'] if w['rarity'] in ('N', 'SR', 'R', 'SSR') else 'SR'
        main = w['main']
        v = WHEEL_NUM[main][rar]
        if main == 'SIGIL_YIELD':
            v = round(v / 30.0, 1)          # 客户端是百分比口径，这里折成每场金币
        idx = SHEET_WHEEL.add(os.path.join(SRC, w['img']))
        cpu = CPU_COST[rar] + hv(w['id'] + 'w') % 2
        out.append({'id': w['id'][-4:], 'n': w['zh'], 'spr': 'wheel:%d' % idx, 'r': rar,
                    'main': main, 'mainZh': WHEEL_ZH[main], 'v': v,
                    'realm': w['realm'], 'perk': REALM_PERK.get(w['realm']),
                    'cost': {'N': 4, 'R': 4, 'SR': 6, 'SSR': 7}[rar] + hv(w['id'] + 'c') % 2,
                    'cpu': cpu, 'wcd': WCD[rar], 'op': wheel_ops(w['realm'], cpu, w['id']),
                    'owner': w.get('owner')})
    return out


# ---------------------------------------------------------------- 密契
# 21 份密契（客户端只有名字和图标），机制在这里一份一份定。
PACTS = {
    '机械降神':   ('cddown', 1, '所有命轮的出手节拍 -1 拍（最低 3 拍）。'),
    '再衍化':     ('dupfirst', 1, '每场第一次开火的命轮，再打一发。'),
    '猩红之拥':   ('openshield', 20, '每场战斗开始获得 20 点护盾。'),
    '猩红之悸':   ('lowleech', 0.35, '生命低于一半时，造成的伤害 35% 转化为生命。'),
    '扭曲双子·黑': ('glass', 0.18, '命轮伤害 +18%，但生命上限 -12。'),
    '埋骨地絮语': ('save', 45, '每场战斗第一次生命归零时，留下 1 点并回复 45 点。'),
    '扭曲双子·白': ('bulwark2', 40, '护盾上限 +40，每场开战自带 15 点护盾。'),
    '诅咒兔':     ('discount', 0.2, '集市所有标价 -20%。'),
    '二律背反':   ('firstcrit', 1, '每场第一发命轮必定暴击，且伤害翻倍。'),
    '光合祭礼':   ('grow', 8, '每赢一场，生命上限 +8。'),
    '海归线':     ('weaken', 0.1, '敌方生命上限 -10%。'),
    '36室之环':   ('freereroll', 1, '每天第一次刷新不花金币。'),
    '生机榨取':   ('leech', 0.15, '造成伤害的 15% 转化为生命。'),
    '四月礼赞':   ('headstart', 8, '开战时算力 +8。'),
    '有机形态':   ('tank', 30, '生命上限 +30，但每场收入 -15%。'),
    '甜蜜蛞蝓':   ('greed', 0.15, '标价 +15%，但命轮伤害 +20%。'),
    '入药之梦':   ('venom', 0.8, '中毒伤害 +80%，每次施加中毒额外 +1 层。'),
    '远方的欢宴': ('feast', 7, '每赢一场，回复 7 点生命上限的伤。'),
    '无垢启示录': ('fear', 0.12, '敌方每次伤害 -12%。'),
    '荒原狼':     ('wolf', 0.22, '命轮伤害 +22%，但护盾上限 -30。'),
    '少女之蛹':   ('rich', 8, '开局多 8 金币，第一天集市 +1 个摊位。'),
}


def build_pacts():
    out = []
    for c in GD['covenants']:
        k, v, txt = PACTS.get(c['zh'], ('none', 0, '（还没接机制）'))
        idx = SHEET_ITEM.add(os.path.join(SRC, c['img']))
        out.append({'id': c['id'][-4:], 'n': c['zh'], 'spr': 'item:%d' % idx, 'k': k, 'v': v, 'txt': txt})
    return out


# ---------------------------------------------------------------- 唤醒体
REALM_ZH = {'CHAOS': '混沌', 'CARO': '血肉', 'AEQUOR': '深海', 'ULTRA': '超维'}
TYPE_ZH = {'ASSAULT': '伤害', 'CHORUS': '辅助', 'WARDEN': '防御'}
REALM_COLOR = {'CHAOS': '#c4708f', 'CARO': '#b8873f', 'AEQUOR': '#4f9bb5', 'ULTRA': '#8f7fc4'}

# 强度：客户端 base × scale。分档阈值对应 62 人分布的 33% / 66% 分位。
PW_LO, PW_HI = 28.0, 133.0
SLOT_GEN = {1: 3, 2: 6, 3: 10}
SLOT_CD = {1: 3, 2: 4, 3: 5}

# 维度影像（本命造物）跟着主人上场，按领域给一条小加成
FATE_MOD = {
    'CHAOS': lambda p: {'k': 'amp', 'v': round(0.04 + p * 0.06, 3)},
    'CARO': lambda p: {'k': 'gen', 'v': round(0.05 + p * 0.07, 3)},
    'AEQUOR': lambda p: {'k': 'shcap', 'v': round(6 + p * 12)},
    'ULTRA': lambda p: {'k': 'crit', 'v': round(0.02 + p * 0.05, 3)},
}


def power_pw(a):
    b, s = a['base'], a['scale']
    return b['ATK'] * s['ATK'] + b['CON'] * s['CON'] * 0.35 + b['DEF'] * s['DEF'] * 0.3


def hero_kit(a, p):
    """占格 / 节拍 / 算力 / 动作 / 光环。强的人占得宽、出手慢、单次给得多。"""
    slots = 1 if p < 0.46 else (2 if p < 0.65 else 3)
    gen = SLOT_GEN[slots]
    cd = SLOT_CD[slots]
    t = a['type']
    if t == 'ASSAULT':
        act = [{'k': 'dmg', 'v': round(2 + slots * 2.2 + p * 5, 1)}]
        op_txt = '造成 %g 点伤害' % act[0]['v']
        aura = {'k': 'pow', 'v': round(0.10 + slots * 0.06, 2)}
        aura_txt = '相邻唤醒体的动作效果 +%d%%' % round(aura['v'] * 100)
    elif t == 'WARDEN':
        act = [{'k': 'shield', 'v': round(4 + slots * 3.4 + p * 6)}]
        op_txt = '架起 %g 点护盾' % act[0]['v']
        aura = {'k': 'cd', 'v': 1}
        aura_txt = '相邻唤醒体的节拍 -1'
    else:
        act = [{'k': 'vuln', 'v': round(0.07 + slots * 0.02 + p * 0.08, 2)}]
        op_txt = '让对手易伤 +%d%%（3 拍）' % round(act[0]['v'] * 100)
        aura = {'k': 'gen', 'v': slots}
        aura_txt = '相邻唤醒体每次多产 %d 算力' % slots
    txt = '每 %d 拍：产出 %d 算力，并%s。' % (cd, gen, op_txt)
    return slots, gen, cd, act, txt, aura, aura_txt


def build_heroes(items, fate, wheels):
    fate_by_name = {k: v for k, v in fate.items()}
    wheel_by_owner = {}
    for w in wheels:
        if w.get('owner'):
            wheel_by_owner.setdefault(w['owner'], w)
    out = []
    for a in GD['awakeners']:
        pw = power_pw(a)
        p = min(1.0, max(0.0, (pw - PW_LO) / (PW_HI - PW_LO)))
        slots, gen, cd, act, txt, aura, aura_txt = hero_kit(a, p)
        spr = SHEET_HERO.add(os.path.join(SRC, a['portrait']))
        # 维度影像：先按名字直配，再退化到包含关系
        fr = fate_by_name.get(a['zh']) or fate_by_name.get(a['en'])
        if not fr:
            for nm, it in fate_by_name.items():
                if nm in a['zh'] or a['zh'] in nm:
                    fr = it
                    break
        fm = FATE_MOD[a['realm']](p)
        fate_rec = {'n': '维度影像·' + (a['zh'] if fr else '无'),
                    'spr': ('item:%d' % SHEET_ITEM.add(os.path.join(SRC, fr['img']))) if fr else '',
                    'k': fm['k'], 'v': fm['v']}
        nw = wheel_by_owner.get(a['id'])
        if not nw:
            same = [w for w in wheels if w['realm'] == a['realm']]
            nw = same[hv(a['id'] + 'w') % len(same)] if same else wheels[0]
        out.append({'id': a['slug'], 'n': a['zh'], 'en': a['en'], 'realm': a['realm'],
                    'realmZh': REALM_ZH[a['realm']], 'type': TYPE_ZH[a['type']],
                    'typeKey': a['type'], 'rar': a['rarity'], 'spr': 'hero:%d' % spr,
                    'wheel': nw['id'], 'slots': slots, 'gen': gen, 'cd': cd,
                    'act': act, 'txt': txt, 'aura': aura, 'auraTxt': aura_txt,
                    'fate': fate_rec,
                    'lore': '%s·%s｜%s' % (REALM_ZH[a['realm']], TYPE_ZH[a['type']], a['en'])})
    return out


# ---------------------------------------------------------------- 主播（彩蛋卡池）
# 12 位 B 站《忘却前夜》内容创作者，素材来自《唤醒体幸存者》那份 data/survivors-extra.json：
# 官方只给了 120×120 的 B 站头像，没有战斗立绘，所以战场上的「立绘」用一张现画的挂牌
# （模糊头像做底 + 圆角头像 + 领域色描边），存进 assets/bazaar/idle/<id>.webp，
# 和官方待机立绘走同一条路径，界面那边不用分叉。
EX = json.load(open(os.path.join(ROOT, 'data', 'survivors-extra.json'), encoding='utf-8'))


def _rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def poster(face, color, out):
    from PIL import ImageDraw, ImageFilter
    W, H = 300, 460
    av = Image.open(face).convert('RGB')
    bg = av.resize((W, W), Image.LANCZOS).resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(26))
    bg = Image.blend(bg, Image.new('RGB', (W, H), _rgb(color)), 0.40)
    dark = Image.new('RGB', (W, H), (7, 10, 18))
    bg = Image.blend(bg, dark, 0.46)
    # 底部渐隐到背景色，跟官方立绘在格子里的收边一致
    grad = Image.new('L', (1, H))
    for y in range(H):
        t = y / float(H - 1)
        grad.putpixel((0, y), int(255 * max(0.0, min(1.0, (t - 0.46) / 0.54)) ** 0.9))
    canvas = Image.composite(dark, bg, grad.resize((W, H)))
    side = 176
    art = av.resize((side, side), Image.LANCZOS)
    mask = Image.new('L', (side, side), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, side - 1, side - 1], radius=16, fill=255)
    px, py = (W - side) // 2, 116
    canvas.paste(art, (px, py), mask)
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle([px, py, px + side - 1, py + side - 1], radius=16, outline=_rgb(color), width=2)
    # 名牌：两条金线夹一个菱形，主播这档没有立绘，就给个「挂牌」的样子
    cy = py + side + 30
    d.line([W // 2 - 64, cy, W // 2 - 14, cy], fill=(227, 179, 65), width=2)
    d.line([W // 2 + 14, cy, W // 2 + 64, cy], fill=(227, 179, 65), width=2)
    d.polygon([(W // 2, cy - 6), (W // 2 + 6, cy), (W // 2, cy + 6), (W // 2 - 6, cy)], outline=(227, 179, 65))
    canvas.save(out, 'WEBP', quality=78, method=6)


def build_streamers(wheels, fate):
    fate_list = list(fate.values())
    idles = os.path.join(OUT_DIR, 'idle')
    os.makedirs(idles, exist_ok=True)
    out = []
    for c in EX['chars']:
        if 'B 站主播' not in str(c.get('kind') or ''):
            continue
        # 主播那套定位里 SUPPORT 就是辅助，和官方的 CHORUS 是同一档
        role = 'CHORUS' if c['roleCode'] == 'SUPPORT' else c['roleCode']
        # 彩蛋不参与强度分档：哈希散在 0.26~0.84，强弱都有，免得十一个人一个手感
        p = 0.26 + (hv(c['id']) % 58) / 100.0
        slots, gen, cd, act, txt, aura, aura_txt = hero_kit({'type': role}, p)
        spr = SHEET_HERO.idx(os.path.join(ROOT, c['face']))
        fr = fate_list[hv(c['id'] + 'f') % len(fate_list)]
        fm = FATE_MOD[c['realmCode']](p)
        fate_rec = {'n': '维度影像·%s' % c['talent'][:6],
                    'spr': 'item:%d' % SHEET_ITEM.idx(os.path.join(SRC, fr['img'])),
                    'k': fm['k'], 'v': fm['v']}
        same = [w for w in wheels if w['realm'] == c['realmCode']]
        nw = same[hv(c['id'] + 'w') % len(same)] if same else wheels[0]
        face = os.path.join(ROOT, c['face'])
        art = os.path.join(idles, c['id'] + '.webp')
        if not os.path.exists(art):
            poster(face, c['color'], art)
        out.append({'id': c['id'], 'n': c['n'], 'en': c['en'], 'realm': c['realmCode'],
                    'realmZh': REALM_ZH[c['realmCode']], 'type': TYPE_ZH[role],
                    'typeKey': role, 'rar': 'SR', 'spr': 'hero:%d' % spr,
                    'wheel': nw['id'], 'slots': slots, 'gen': gen, 'cd': cd,
                    'act': act, 'txt': txt, 'aura': aura, 'auraTxt': aura_txt,
                    'fate': fate_rec, 'egg': True,
                    'lore': '主播｜B 站内容创作者 · %s' % c['n']})
    return out


# ---------------------------------------------------------------- 怪物
# 意图码：001 攻击 / 002 重击 / 003 削弱 / 004 强力削弱 / 005 强化 / 006 强力强化
# 007 防御 / 008 攻防兼备 / 009 攻击·削弱 / 010 攻击·强化 / 011 防御·强化
# 012 防御·削弱 / 013 眩晕 / 014 未知 / 015 特殊行动
ATK_I = {'001', '002', '009', '010'}
DEF_I = {'007', '008', '011', '012'}
BUFF_I = {'005', '006', '010', '011'}
WEAK_I = {'003', '004', '009', '012'}
SKILL_CD = {'001': 3, '002': 4, '003': 4, '004': 5, '005': 3, '006': 4, '007': 3,
            '008': 4, '009': 4, '010': 4, '011': 4, '012': 4, '013': 6}


def build_monster_skills(m):
    msk = GD['msk']
    seq = []
    for k in (m.get('op') or []) + (m.get('cy') or []):
        k = str(k)
        if k not in seq:
            seq.append(k)
    picks = []
    for k in seq:
        s = msk.get(k)
        if not s:
            continue
        i = s.get('i')
        a = s.get('a') or []
        num = {'a': 0.0, 'n': 1.0, 'd': 0.0}
        for p in a:
            if p and p[0] in num and len(p) > 1:
                num[p[0]] = float(p[1])
        if i in ('014', '015') and not any(p and p[0] in ('a', 'd', 'n') for p in a):
            continue          # 纯召唤 / 特殊行动：这套牌里表达不了，跳过
        if i in ATK_I or (i is None and num['a']):
            ops = [{'k': 'dmg', 'v': round(max(0.4, num['a']) * 10, 1), 'hits': max(1, int(round(num['n'] or 1)))}]
            if '出血' in s.get('t', '') or 'bleed' in s.get('t', ''):
                ops.append({'k': 'poison', 'v': round(max(0.4, num['a']) * 4, 1)})
            cd = SKILL_CD.get(i, 3)
            if '重击' in s.get('n', '') or num['a'] >= 2:
                cd = 4
        elif i in DEF_I:
            v = round(max(0.4, num['d'] or num['a'] or 1) * 8, 1)
            ops = [{'k': 'shield', 'v': v}]
            if i == '008':
                ops.append({'k': 'dmg', 'v': round(max(0.3, num['a'] or 0.6) * 8, 1)})
            cd = SKILL_CD.get(i, 4)
        elif i in BUFF_I:
            ops = [{'k': 'str', 'v': round(max(1, num['n'] or 2) * 0.5, 1)}]
            cd = SKILL_CD.get(i, 3)
        elif i in WEAK_I:
            ops = [{'k': 'weaken', 'v': 0.18, 't': 3}]
            if i == '009':
                ops.insert(0, {'k': 'dmg', 'v': round(max(0.4, num['a']) * 8, 1)})
            cd = SKILL_CD.get(i, 4)
        elif i == '013':
            ops = [{'k': 'stun', 'v': 1}]
            cd = 6
        else:
            continue
        nm = (s.get('n') or '').strip() or GD['intent'].get(i, '行动')
        picks.append({'n': nm, 'cd': cd, 'op': ops})
        if len(picks) >= 4:
            break
    if not picks:
        picks = [{'n': '撕咬', 'cd': 3, 'op': [{'k': 'dmg', 'v': 6}]}]
    return picks


def build_foes():
    out = []
    rank_zh = {'Normal': '普通', 'Elite': '精英', 'Boss': '首领'}
    for m in GD['monsters']:
        idx = SHEET_MON.add(os.path.join(SRC, m['img']))
        out.append({'id': m['id'], 'n': m['zh'], 'spr': 'mon:%d' % idx,
                    'rank': m['rank'].lower(), 'rankZh': rank_zh.get(m['rank'], '普通'),
                    'size': m['size'], 'bt': m.get('bt', ''),
                    'desc': (m.get('desc') or '').strip(),
                    'skills': build_monster_skills(m)})
    return out


# ---------------------------------------------------------------- 输出
def j(v):
    return json.dumps(v, ensure_ascii=False, separators=(',', ':'))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    items, fate = build_items()
    wheels = build_wheels()
    pacts = build_pacts()
    heroes = build_heroes(items, fate, wheels)
    eggs = build_streamers(wheels, fate)
    heroes += eggs
    foes = build_foes()
    meta = [SHEET_HERO.render(), SHEET_ITEM.render(), SHEET_WHEEL.render(), SHEET_MON.render()]

    lines = [
        '// 《大巴扎：银钥》数据表 —— 由 scripts/build_bazaar_gen.py 从客户端数据生成，**别手改**。',
        '// 唤醒体 %d / 造物 %d / 命轮 %d / 密契 %d / 怪物 %d；图集见 SHEETS。' % (
            len(heroes), len(items), len(wheels), len(pacts), len(foes)),
        '',
        'export const SHEETS = %s;' % j({k['src'].split('-')[-1].split('.')[0]: k for k in meta}),
        '',
        'export const HEROES = %s;' % j(heroes),
        '',
        'export const ITEMS = %s;' % j(items),
        '',
        'export const WHEELS = %s;' % j(wheels),
        '',
        'export const PACTS = %s;' % j(pacts),
        '',
        'export const FOES = %s;' % j(foes),
        '',
    ]
    open(OUT_JS, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines))
    # 统计
    arch = {}
    for it in items:
        arch[it['arch']] = arch.get(it['arch'], 0) + 1
    slots = {}
    for h in heroes:
        slots[h['slots']] = slots.get(h['slots'], 0) + 1
    print('唤醒体 %d（其中主播 %d）/ 造物 %d / 命轮 %d / 密契 %d / 怪物 %d' % (
        len(heroes), len(eggs), len(items), len(wheels), len(pacts), len(foes)))
    print('占格分布：', json.dumps(slots, ensure_ascii=False))
    print('造物流派分布：', json.dumps(arch, ensure_ascii=False))
    print('造物加成分布：', json.dumps(
        {k: sum(1 for it in items if it['m']['k'] == k) for k in set(it['m']['k'] for it in items)},
        ensure_ascii=False))
    print('图集：', ', '.join('%s %dx%d %.0fKB' % (k['src'].split('/')[-1], k['cols'], k['rows'], k['bytes'] / 1024) for k in meta))
    print('js/bazaar-gen.js %.0fKB' % (os.path.getsize(OUT_JS) / 1024))
    no_fate = [h['n'] for h in heroes if not h['fate']['spr']]
    if no_fate:
        print('没有维度影像的唤醒体：', no_fate)


if __name__ == '__main__':
    main()
