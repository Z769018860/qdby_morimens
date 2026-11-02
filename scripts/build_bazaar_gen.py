# -*- coding: utf-8 -*-
"""生成《大巴扎：银钥》的全量数据表 + 素材图集。

数据来源：idle/public/data/game-data.json（客户端解包口径）
  awakeners 62 / relics 310（造物）/ wheels 149（命轮）/ covenants 21（密契）/ monsters 537

产出：
  js/bazaar-gen.js                  HEROES / ITEMS / WHEELS / PACTS / FOES / SHEETS
  assets/bazaar/sheet-hero.webp     62 格（112）
  assets/bazaar/sheet-item.webp     331 格（80）：310 造物 + 21 密契
  assets/bazaar/sheet-wheel.webp    149 格（64）
  assets/bazaar/sheet-mon.webp      537 格（80）

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
        self.paths.append(path)
        return len(self.paths) - 1

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

# 每种流派的数值底板（N / SR / SSR），op 的具体形状在 make_ops 里按哈希分岔
BASE = {
    'dmg':    {'N': 6, 'SR': 9, 'SSR': 13},
    'poison': {'N': 3, 'SR': 4, 'SSR': 6},
    'burn':   {'N': 4, 'SR': 6, 'SSR': 8},
    'shield': {'N': 8, 'SR': 12, 'SSR': 16},
    'heal':   {'N': 7, 'SR': 10, 'SSR': 14},
    'gold':   {'N': 2, 'SR': 3, 'SSR': 4},
    'crit':   {'N': 6, 'SR': 9, 'SSR': 12},
    'haste':  {'N': 1, 'SR': 1, 'SSR': 2},
    'regen':  {'N': 1, 'SR': 2, 'SSR': 2.5},
    'slow':   {'N': 1, 'SR': 1, 'SSR': 2},
    'vuln':   {'N': 0.12, 'SR': 0.18, 'SSR': 0.25},
    'aura':   {'N': 2, 'SR': 3, 'SSR': 4},
    'str':    {'N': 1, 'SR': 2, 'SSR': 3},
    'thorns': {'N': 3, 'SR': 5, 'SSR': 7},
}

CD = {'dmg': 4, 'poison': 4, 'burn': 4, 'shield': 4, 'heal': 4, 'gold': 4, 'crit': 5,
      'haste': 4, 'regen': 5, 'slow': 5, 'vuln': 4, 'aura': 0, 'str': 5, 'thorns': 5}

COST = {'N': 4, 'SR': 6, 'SSR': 8}


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


def make_ops(arch, rar, seed, name):
    v = BASE[arch][rar]
    q = hv(seed) % 4
    if arch == 'dmg':
        if q == 0:
            return [{'k': 'dmg', 'v': round(v * 0.7, 1), 'hits': 2}]
        if q == 1:
            return [{'k': 'dmg', 'v': round(v * 0.8, 1), 'pierce': 1}]
        if q == 2 and rar != 'N':
            return [{'k': 'dmg', 'v': round(v * 0.75, 1), 'leech': 0.3}]
        return [{'k': 'dmg', 'v': round(v, 1)}]
    if arch == 'crit':
        return [{'k': 'dmg', 'v': round(v, 1)}, {'k': 'vuln', 'v': round(BASE['vuln'][rar], 2)}]
    if arch == 'poison':
        extra = [{'k': 'poison', 'v': round(v * 0.4, 1)}] if q == 3 else []
        return [{'k': 'poison', 'v': v}] + extra
    if arch == 'slow':
        return [{'k': 'slow', 'v': v}, {'k': 'dmg', 'v': round(BASE['dmg'][rar] * 0.4, 1)}]
    if arch == 'aura':
        kind = 'dmg' if q < 3 else 'cd'
        return [{'k': 'aura', 'k2': kind, 'v': v}]
    if arch == 'str':
        return [{'k': 'str', 'v': v}] + ([{'k': 'dmg', 'v': round(BASE['dmg'][rar] * 0.5, 1)}] if q == 2 else [])
    if arch == 'gold':
        return [{'k': 'gold', 'v': v}] + ([{'k': 'heal', 'v': round(BASE['heal'][rar] * 0.4, 1)}] if q == 1 else [])
    if arch == 'heal':
        return [{'k': 'heal', 'v': v}] + ([{'k': 'shield', 'v': round(BASE['shield'][rar] * 0.5, 1)}] if q == 0 else [])
    return [{'k': arch, 'v': v}]


def build_items():
    relics = GD['relics']
    # 维度影像·X：每个唤醒体一件本命造物，单独挑出来当起手
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
        ops = make_ops(arch, rar, r['id'], r['zh'])
        cost = COST[rar] + hv(r['id'] + 'c') % 3
        cd = CD[arch]
        idx = SHEET_ITEM.add(os.path.join(SRC, r['img']))
        items.append({'id': r['id'][-4:], 'n': r['zh'], 'spr': 'item:%d' % idx, 'r': rar,
                      'cost': cost, 'cd': cd, 'op': ops, 'arch': arch})
    # 本命造物：跟随主人的领域（混沌伤害 / 血肉中毒 / 深海护盾 / 超维暴击）
    for name, r in fate.items():
        idx = SHEET_ITEM.add(os.path.join(SRC, r['img']))
        items.append({'id': r['id'][-4:], 'n': r['zh'], 'spr': 'item:%d' % idx, 'r': 'FATE',
                      'cost': 0, 'cd': 4, 'op': [{'k': 'dmg', 'v': 6}], 'arch': 'fate', 'fate': name})
    return items, fate


# ---------------------------------------------------------------- 命轮
# 客户端八种主词条 → 三个档位（N/SR/SSR）的实际数值
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
    'CHAOS': {'k': 'amp', 'v': 0.02, 'txt': '混沌：伤害 +2%'},
    'CARO': {'k': 'poison', 'v': 0.2, 'txt': '血肉：中毒 +20%'},
    'AEQUOR': {'k': 'shield', 'v': 5, 'txt': '深海：开战获得 5 点护盾'},
    'ULTRA': {'k': 'haste', 'v': 1, 'txt': '超维：开战时所有造物计时 +1'},
}


def build_wheels():
    out = []
    for w in GD['wheels']:
        rar = w['rarity'] if w['rarity'] in ('N', 'SR', 'R', 'SSR') else 'SR'
        main = w['main']
        v = WHEEL_NUM[main][rar]
        if main == 'SIGIL_YIELD':
            v = round(v / 30.0, 1)          # 客户端是百分比口径，这里折成每场金币
        idx = SHEET_WHEEL.add(os.path.join(SRC, w['img']))
        cost = {'N': 4, 'R': 4, 'SR': 6, 'SSR': 7}[rar] + hv(w['id'] + 'w') % 2
        out.append({'id': w['id'][-4:], 'n': w['zh'], 'spr': 'wheel:%d' % idx, 'r': rar,
                    'main': main, 'mainZh': WHEEL_ZH[main], 'v': v,
                    'realm': w['realm'], 'perk': REALM_PERK.get(w['realm']),
                    'cost': cost, 'owner': w.get('owner')})
    return out


# ---------------------------------------------------------------- 密契
# 21 份密契（客户端只有名字和图标），机制在这里一份一份定。
PACTS = {
    '机械降神':   ('cddown', 1, '所有造物的冷却 -1 拍（最低 2 拍）。'),
    '再衍化':     ('dupfirst', 1, '每场战斗里，第一件造物触发时再触发一次。'),
    '猩红之拥':   ('openshield', 20, '每场战斗开始获得 20 点护盾。'),
    '猩红之悸':   ('lowleech', 0.35, '生命低于一半时，造成的伤害 35% 转化为生命。'),
    '扭曲双子·黑': ('glass', 0.18, '造物伤害 +18%，但生命上限 -12。'),
    '埋骨地絮语': ('save', 45, '每场战斗第一次生命归零时，留下 1 点并回复 45 点。'),
    '扭曲双子·白': ('bulwark2', 40, '护盾上限 +40，每场开战自带 15 点护盾。'),
    '诅咒兔':     ('discount', 0.2, '集市所有标价 -20%。'),
    '二律背反':   ('firstcrit', 1, '每场战斗第一件触发的造物，伤害再算一次。'),
    '光合祭礼':   ('grow', 8, '每赢一场，生命上限 +8。'),
    '海归线':     ('weaken', 0.1, '敌方生命上限 -10%。'),
    '36室之环':   ('freereroll', 1, '每天第一次刷新不花金币。'),
    '生机榨取':   ('leech', 0.15, '造成伤害的 15% 转化为生命。'),
    '四月礼赞':   ('headstart', 2, '开战时所有造物计时先走 2 拍。'),
    '有机形态':   ('tank', 30, '生命上限 +30，但每场收入 -15%。'),
    '甜蜜蛞蝓':   ('greed', 0.15, '标价 +15%，但每次触发的伤害 +20%。'),
    '入药之梦':   ('venom', 0.8, '中毒伤害 +80%，每次施加中毒额外 +1 层。'),
    '远方的欢宴': ('feast', 7, '每赢一场，回复 7 点生命上限的伤。'),
    '无垢启示录': ('fear', 0.12, '敌方每次伤害 -12%。'),
    '荒原狼':     ('wolf', 0.22, '造物伤害 +22%，但护盾上限 -30。'),
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

# 类型 × 领域 → 被动原型（12 种）
PAS_ARCH = {
    ('ASSAULT', 'CHAOS'): 'surge', ('ASSAULT', 'CARO'): 'venom', ('ASSAULT', 'AEQUOR'): 'pierce',
    ('ASSAULT', 'ULTRA'): 'tempo', ('CHORUS', 'CHAOS'): 'amp', ('CHORUS', 'CARO'): 'leech',
    ('CHORUS', 'AEQUOR'): 'regen', ('CHORUS', 'ULTRA'): 'cddown', ('WARDEN', 'CHAOS'): 'bulwark',
    ('WARDEN', 'CARO'): 'thorns', ('WARDEN', 'AEQUOR'): 'tide', ('WARDEN', 'ULTRA'): 'ward',
}


def sub(a, k, d=0.0):
    return float((a.get('sub') or {}).get(k, d) or 0)


def pas_of(a, arch):
    cr = sub(a, 'CritRate', 5)
    cdmg = sub(a, 'CritDamage', 50)
    aliemus = sub(a, 'AliemusRegen', 0)
    keyflare = sub(a, 'KeyflareRegen', 12)
    mastery = sub(a, 'RealmMastery', 1)
    sigil = sub(a, 'SigilYield', 1)
    dmgamp = sub(a, 'DamageAmplification', 0)
    death = sub(a, 'DeathResistance', 0)
    rar = a['rarity']
    bump = 1.0 if rar in ('SSR', 'Genesis') else 0.85

    if arch == 'surge':
        v = max(3, round(6 - keyflare / 6))
        return {'k': 'surge', 'v': v, 'txt': '狂气：每 %d 拍，随机一件造物立刻再触发一次。' % v}
    if arch == 'venom':
        v = round((0.4 + dmgamp / 100 + aliemus * 0.3) * bump, 2)
        return {'k': 'venom', 'v': v, 'txt': '腐蚀：中毒伤害 +%d%%，每次施加中毒额外 +1 层。' % round(v * 100)}
    if arch == 'pierce':
        v = round((0.15 + mastery * 0.03) * bump, 2)
        return {'k': 'pierce', 'v': v, 'txt': '穿刺：你的伤害有 %d%% 无视护盾。' % round(v * 100)}
    if arch == 'tempo':
        v = max(1, round(keyflare / 8))
        return {'k': 'tempo', 'v': v, 'txt': '回溯：开战时所有造物的计时先走 %d 拍。' % v}
    if arch == 'amp':
        v = round((0.06 + dmgamp / 100) * bump, 2)
        return {'k': 'amp', 'v': v, 'txt': '增幅：你的造物造成的伤害 +%d%%。' % round(v * 100)}
    if arch == 'leech':
        v = round((0.08 + aliemus * 0.05) * bump, 2)
        return {'k': 'leech', 'v': v, 'txt': '汲取：造成伤害的 %d%% 转化为生命。' % round(v * 100)}
    if arch == 'regen':
        v = round(max(1, keyflare / 10) * bump, 1)
        return {'k': 'regen', 'v': v, 'txt': '愈合：每拍回复 %s 点生命。' % (('%g' % v))}
    if arch == 'cddown':
        return {'k': 'cddown', 'v': 1, 'txt': '加速：所有造物冷却 -1 拍（最低 2 拍）。'}
    if arch == 'bulwark':
        v = round(14 + mastery * 3 + death * 0.4)
        return {'k': 'bulwark', 'v': v, 'txt': '织网：护盾上限 +%d；护盾没被打破时受到的伤害再 -20%%。' % v}
    if arch == 'thorns':
        v = round(2 + death * 0.5 + cdmg / 40)
        return {'k': 'thorns', 'v': v, 'txt': '反噬：受到伤害时对敌人反弹 %d 点。' % v}
    if arch == 'tide':
        v = round(20 + death * 1.2 + mastery * 2)
        return {'k': 'tide', 'v': v, 'txt': '深潜：生命上限 +%d；生命低于一半时每拍回复 1 点。' % v}
    # ward
    v = max(4, round(keyflare / 3))
    return {'k': 'ward', 'v': v, 'w': round(6 + mastery), 'txt': '错位外壳：每 %d 拍获得 %d 点护盾。' % (v, round(6 + mastery))}


def build_heroes(items, fate, wheels):
    by_name = {i['n']: i for i in items if i.get('fate')}
    wheel_by_owner = {}
    for w in wheels:
        if w.get('owner'):
            wheel_by_owner.setdefault(w['owner'], w)
    # 领域对应的通用造物：同领域里最便宜的几件，保证起手有东西打
    realm_item = {}
    for w in wheels:
        realm_item.setdefault(w['realm'], [])
    out = []
    for a in GD['awakeners']:
        arch = PAS_ARCH[(a['type'], a['realm'])]
        pas = pas_of(a, arch)
        spr = SHEET_HERO.add(os.path.join(SRC, a['portrait']))
        fate_item = by_name.get(a['zh']) or by_name.get(a['en'])
        if not fate_item:
            for nm, it in by_name.items():
                if nm in a['zh'] or a['zh'] in nm:
                    fate_item = it
                    break
        kit = [fate_item['id']] if fate_item else []
        # 第二件起手：同领域的一件 N 级造物（按 id 哈希挑，保证稳定）
        pool = [it for it in items if it['r'] == 'N' and it['arch'] == (
            'poison' if a['realm'] == 'CARO' else 'shield' if a['realm'] == 'AEQUOR'
            else 'crit' if a['realm'] == 'ULTRA' else 'dmg')]
        if pool:
            kit.append(pool[hv(a['id']) % len(pool)]['id'])
        nw = wheel_by_owner.get(a['id'])
        if not nw:
            same = [w for w in wheels if w['realm'] == a['realm']]
            nw = same[hv(a['id'] + 'w') % len(same)] if same else wheels[0]
        out.append({'id': a['slug'], 'n': a['zh'], 'en': a['en'], 'realm': a['realm'],
                    'realmZh': REALM_ZH[a['realm']], 'type': TYPE_ZH[a['type']],
                    'typeKey': a['type'], 'rar': a['rarity'], 'spr': 'hero:%d' % spr,
                    'wheel': nw['id'], 'kit': kit, 'pas': pas,
                    'lore': '%s·%s｜%s' % (REALM_ZH[a['realm']], TYPE_ZH[a['type']], a['en'])})
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
            ops = [{'k': 'str', 'v': round(max(1, num['n'] or 2) * 0.35, 1)}]
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
    print('唤醒体 %d / 造物 %d / 命轮 %d / 密契 %d / 怪物 %d' % (
        len(heroes), len(items), len(wheels), len(pacts), len(foes)))
    print('造物流派分布：', json.dumps(arch, ensure_ascii=False))
    print('图集：', ', '.join('%s %dx%d %.0fKB' % (k['src'].split('/')[-1], k['cols'], k['rows'], k['bytes'] / 1024) for k in meta))
    print('js/bazaar-gen.js %.0fKB' % (os.path.getsize(OUT_JS) / 1024))
    no_pas = [h['n'] for h in heroes if not h['pas']]
    if no_pas:
        print('没有被动的唤醒体：', no_pas)


if __name__ == '__main__':
    main()
