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


def bonus_of(text, rarity):
    """钥令原文 → 本作的加成键（只写 ZERO() 里已有的键）。

    一件钥令通常命中 1–2 条规则；都没命中时给一个通用的增伤，避免出现「白板钥令」。
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
    m = SCALE[rarity]
    out = {}
    for k, v in b.items():
        out[k] = round(v * m, 2) if k == 'surviveChance' else round(v * m)
    return out


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
        items.append({
            'id': 'k' + str(k['id']).split(':')[-1],
            'zh': zh,
            'en': k.get('en') or '',
            'realm': k.get('realm') or '',
            'rarity': rarity,
            'img': img,
            'glyph': zh[0],
            'bonus': bonus_of(text, rarity),
            'desc': text[:150],
            'use': k.get('use'),
        })
    # 界域多的、使用率高的排前面，界面上的「已获得」看起来更像图鉴
    items.sort(key=lambda x: ({'SSR': 0, 'SR': 1, 'R': 2}[x['rarity']], -(x['use'] or 0)))
    pack = {
        'version': 2,
        'note': '原作 64 件钥令的中文名、界域与钥令原文；bonus 是把原文关键词映射到本作加成键的结果（本作没有牌库/算力机制）。',
        'sources': ['data/dictionary.json → key', 'assets/key/*.webp'],
        'items': items,
    }
    json.dump(pack, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'钥令 {len(items)} 件，图标 {len(copied)} 张 → {OUT}')


if __name__ == '__main__':
    main()
