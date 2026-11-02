#!/usr/bin/env python3
"""生成挂机版的钥令表（public/data/orders.json）+ 拷贝原作钥令图标。

数据来源：仓库根目录 data/dictionary.json 的 `key`（64 件原作钥令，含中文名、界域、
钥令原文与使用率），图标是 assets/key/*.webp（原作 KeyToken 立绘）。

本作没有原作的牌库 / 算力机制，所以把「钥令原文」里的关键词映射成本作已有的加成键
（见 bonus_of）：描述里出现护盾就给护盾、出现狂气就给起始共鸣与回复，等等。
稀有度按榜单使用率分档，数值再按档位缩放，保证「常见钥令」和「核心钥令」有差距。

用法：python3 tools/build_orders.py
"""
import json
import os
import re
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))   # idle/
REPO = os.path.dirname(ROOT)
OUT = os.path.join(ROOT, 'public/data/orders.json')
IMGDIR = os.path.join(ROOT, 'public/img/key')

STRIP = re.compile(r'⟦[^|⟧]+\|([^⟧]*)⟧')


def plain(t):
    return STRIP.sub(r'\1', t)


def rarity_of(use):
    """榜单使用率 → 稀有度。多数钥令在 0.5–3 之间，4 以上是核心件。"""
    if use is None:
        return 'R'
    if use >= 4:
        return 'SSR'
    if use >= 1.5:
        return 'SR'
    return 'R'


SCALE = {'R': 1.0, 'SR': 1.45, 'SSR': 2.1}

# ---- 价值折算 ------------------------------------------------------------
# 单位是「分」：每 1 点存储值折多少分（存 10 表示 +10% 的属性）。
# 权重不是纯理论收益，而是**锚在原数据的量级上**：拿主键预算（约 13.6 分）除以权重，
# 正好落回原来最强那批钥令的数值（攻击 11%、增伤 10%、起始钥焰 15 点、暴伤 14%…），
# 所以重排之后玩家的直觉不用改，变的只是「键多就强」和「R 比 SSR 强」这两件事。
VALUE_W = {
    'atkPct': 1.18, 'amp': 1.3, 'critRate': 1.85, 'critDmg': 0.93,
    'hpPct': 1.85, 'defPct': 1.6, 'healBonus': 1.44, 'shieldBonus': 1.08,
    'aliGain': 0.93, 'keyGain': 1.3, 'openAli': 0.59, 'openKey': 0.86,
    'steal': 3.2, 'gold': 1.6, 'firstBoost': 1.2,
    'surviveChance': 300.0,      # 存的是 0.03（=3%），所以 1% 折 3 分
}
# 每件钥令的总价值预算（按稀有度）。以前只有 SCALE 按稀有度缩放，
# 但「原文命中几条规则就多几个属性」这一层没有任何约束：
# 键数 1→8 对应价值 5→38，R 卡能比 SSR 强三倍。现在先定预算，再把预算分给属性。
BUDGET = {'R': 11.0, 'SR': 16.0, 'SSR': 22.0}
# 招牌键：这几样决定钥令「是干什么用的」，筛键时优先留下
SIGNATURE = ('openKey', 'openAli', 'aliGain', 'keyGain', 'steal', 'surviveChance',
             'firstBoost', 'gold', 'healBonus', 'shieldBonus')
TAG_OF = {
    'amp': '锐意', 'atkPct': '强攻', 'critRate': '锋矢', 'critDmg': '锋锐',
    'hpPct': '坚壁', 'defPct': '守势', 'healBonus': '慈悲', 'shieldBonus': '护盾',
    'openKey': '起手', 'openAli': '共鸣', 'keyGain': '钥流', 'aliGain': '狂澜',
    'steal': '汲取', 'surviveChance': '死扛', 'gold': '财源', 'firstBoost': '首击',
}


def bonus_of(text, rarity):
    """钥令原文 → 本作的加成键（只写 ZERO() 里已有的键）。

    先按原文命中规则收候选，**再按稀有度预算重新分配**：
      1. 招牌键优先、单项价值高的优先，最多留 3 个（3 个再打 94 折，多属性=更泛用但不更赚）；
      2. 主属性吃掉 62% 的预算，剩下的平分给其它键 —— 每件钥令因此有明确的「招牌」；
      3. 总价值只由稀有度决定，键数不再等于强度（以前描述越长越强）。
    返回 (加成表, 招牌键)。
    """
    b = {}

    def add(k, v):
        b[k] = b.get(k, 0) + v

    if '护盾' in text or '格挡' in text:
        add('shieldBonus', 8); add('defPct', 6)
    if '治疗' in text or '回复' in text or '生命' in text:
        add('healBonus', 9)
    if '生命上限' in text or '最大生命' in text:
        add('hpPct', 7)
    if '力量' in text:
        add('amp', 5); add('atkPct', 5)
    if '狂气' in text:
        add('aliGain', 10); add('openAli', 8)
    if '钥焰' in text or '钥令' in text:
        add('keyGain', 10); add('openKey', 8)
    if '算力' in text or '抽' in text or '手牌' in text or '弃置' in text or '牌' in text:
        add('openKey', 7); add('openAli', 7)
    if '暴击' in text:
        add('critRate', 5); add('critDmg', 10)
    if '偷取' in text or '吸血' in text:
        add('steal', 3)
    if '伤害' in text or '攻击' in text:
        add('atkPct', 6)
    if '金币' in text or '银芯' in text:
        add('gold', 8)
    if '免死' in text or '濒死' in text or '存活' in text:
        add('surviveChance', 0.03)
    if not b:
        add('amp', 4)

    # 主键 = 按价值最高的那个；价值接近时招牌键优先（它是这件钥令「在讲什么」）
    order = sorted(b.items(), key=lambda kv: (-(kv[1] * VALUE_W.get(kv[0], 0.5)), kv[0] not in SIGNATURE))
    keep = order[:3]
    budget = BUDGET[rarity] * (0.94 if len(keep) >= 3 else 1.0)
    share = [0.62] + [0.38 / (len(keep) - 1)] * (len(keep) - 1) if len(keep) > 1 else [1.0]
    out = {}
    for (k, _), s in zip(keep, share):
        w = VALUE_W.get(k, 0.5)
        v = budget * s / w
        out[k] = round(v, 2) if k == 'surviveChance' else max(1, round(v))
    return out, keep[0][0]


def main():
    dic = json.load(open(os.path.join(REPO, 'data/dictionary.json'), encoding='utf-8'))
    keys = dic['key']
    os.makedirs(IMGDIR, exist_ok=True)
    items, copied = [], set()
    for k in keys:
        zh = (k.get('zh') or '').strip()
        if not zh:
            continue
        text = plain(' '.join(s.get('t', '') for s in k.get('desc') or []))
        text = re.sub(r'\s+', ' ', text)
        rarity = rarity_of(k.get('use'))
        src_img = os.path.join(REPO, k['img'])
        img = ''
        if os.path.exists(src_img):
            name = os.path.basename(k['img'])
            if name not in copied:
                shutil.copyfile(src_img, os.path.join(IMGDIR, name))
                copied.add(name)
            img = 'img/key/' + name
        bonus, main_key = bonus_of(text, rarity)
        items.append({
            'id': 'k' + str(k['id']).split(':')[-1],
            'zh': zh,
            'en': k.get('en') or '',
            'realm': k.get('realm') or '',
            'rarity': rarity,
            'img': img,
            'glyph': zh[0],
            'bonus': bonus,
            'tag': TAG_OF.get(main_key, '通用'),
            'desc': text[:150],
            'use': k.get('use'),
        })
    # 界域多的、使用率高的排前面，界面上的「已获得」看起来更像图鉴
    items.sort(key=lambda x: ({'SSR': 0, 'SR': 1, 'R': 2}[x['rarity']], -(x['use'] or 0)))
    pack = {
        'version': 3,
        'note': '原作 64 件钥令的中文名、界域与钥令原文；bonus 是把原文关键词映射到本作加成键、'
                '再按稀有度预算（R 11 / SR 16 / SSR 22 分）重新分配的结果：招牌键优先、最多 3 个键、'
                '主属性拿 62% 预算。tag 是招牌键对应的定位（锐意/起手/慈悲…），键数不再等于强度。',
        'sources': ['data/dictionary.json → key', 'assets/key/*.webp'],
        'items': items,
    }
    json.dump(pack, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'钥令 {len(items)} 件，图标 {len(copied)} 张 → {OUT}')


if __name__ == '__main__':
    main()
