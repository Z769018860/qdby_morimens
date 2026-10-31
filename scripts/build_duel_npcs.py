#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从灰机 wiki / 客户端档案整理出决斗链接要用的 NPC 清单。

素材来源有两处，合并成一份 data/duel-npcs.json：

  1. data/dictionary.json 的 `monster`（622 条，带中文名 / 英文名 / 档位 / 档案 / 技能
     / 关键词 / 头像路径）——这一份本身就是从灰机 wiki 与客户端档案扒下来的，
     头像已经落在 assets/monster/ 里，所以不必再去 wiki 逐页抓图。
  2. 灰机 wiki 的 Category:角色（70 个成员：62 位唤醒体 + 8 个 NPC/觉醒态页面），
     用来补齐「这个 NPC 属于哪个界域、稀有度多少」，wiki 模板里有 姓名/界域/稀有度 字段。

输出的每条都只保留做卡需要的东西，`zone` 是按头像编号归的「融灾分区」——
C01 病栋、C02 蜡像馆、C04 维度、C05 深海、S01 融蚀体、S04 提灯教会……
有了这个分区，NPC 才能按主题分成几个卡包，而不是把 622 条一锅炖。

用法：
  python scripts/build_duel_npcs.py            # 直接用本地 dictionary.json
  python scripts/build_duel_npcs.py --wiki     # 额外合并 wiki 抓下来的档案（data/wiki-npcs.json）
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 头像编号 → 融灾分区。编号取自 Portrait_Small_Monster_<区><序号>[_BOSSSIZE]，
# 名字是我按该区怪物的实际内容起的（病栋里有手术医生、蜡像馆里有劳伦斯先生）。
ZONES = {
    'C01': ('病栋', 'caro'),
    'C02': ('蜡像馆', 'ultra'),
    'C03': ('脓疱', 'caro'),
    'C04': ('维度裂隙', 'chaos'),
    'C05': ('深海祭坛', 'aqua'),
    'C06': ('梦与二十四', 'chaos'),
    'C07': ('努比亚', 'caro'),
    'C08': ('宁菲亚', 'ultra'),
    'C09': ('潘狄娅', 'chaos'),
    'C10': ('淤泥之花', 'caro'),
    'C11': ('空想', 'ultra'),
    'C12': ('凸月', 'aqua'),
    'C15': ('门之钥', 'ultra'),
    'C16': ('爆燃', 'chaos'),
    'C17': ('雾中', 'aqua'),
    'S01': ('融蚀体', 'chaos'),
    'S02': ('融蚀野地', 'caro'),
    'S03': ('执妄', 'ultra'),
    'S04': ('提灯教会', 'aqua'),
    'S05': ('雪山', 'aqua'),
    'S06': ('搜查队', 'chaos'),
    'S07': ('好人三人组', 'caro'),
    'S08': ('涅弗鲁瑞', 'ultra'),
    'S09': ('灰烬', 'chaos'),
    # 特殊码：S2 前缀的第二期分区与这三类走各自的分支，见 zone_of()
    'A00': ('万象终局', 'ultra'),
    'DCB': ('门后之影', 'chaos'),
    'AW': ('觉醒体', 'any'),
}


def read_json(rel):
    with open(os.path.join(ROOT, rel), 'r', encoding='utf-8') as f:
        return json.load(f)


def zone_of(img):
    """Portrait_Small_Monster_S0403_BOSSSIZE.webp → ('S04', '提灯教会', 'aqua')

    三种命名都要认：
      · Portrait_Small_Monster_<区码><序号>[_BOSSSIZE]   普通怪 / 首领
      · Portrait_Small_Monster_S2C0203                  第二期的同名分区（S2 前缀）
      · Portrait_Minihead_EnemyAwaker_<代号>_AF         觉醒体头像（D12 / B01 / O03）
    最后一种不是「分区」，是「这位唤醒体觉醒之后长什么样」，单独归到觉醒页。
    """
    fn = os.path.basename(img or '')
    m = re.search(r'_S2([SC]\d\d)', fn)
    if not m:
        m = re.search(r'_([SC]\d\d)', fn)
    if m:
        code = m.group(1)
        name, realm = ZONES.get(code, ('未分区', 'any'))
        return (code, name, realm)
    m = re.search(r'EnemyAwaker_([DBSO]\d\d)', fn)
    if m:
        return ('AW', '觉醒体', 'any')
    if re.search(r'_A00\d\d', fn):
        return ('A00', '万象终局', 'ultra')
    if re.search(r'_DCB\d\d', fn):
        return ('DCB', '门后之影', 'chaos')
    return ('', '', 'any')


def clean_skills(skills):
    """技能原文里的 X、⟦bleed|出血⟧ 这类占位符对做卡没用，保留文本但把 [[kw]] 抽出来。"""
    out = []
    for s in skills or []:
        out.append(re.sub(r'⟦[^|]*\|([^⟧]*)⟧', r'【\1】', s).strip())
    return out


def main():
    dic = read_json('data/dictionary.json')
    mons = dic.get('monster') or []

    rows = []
    seen = set()
    for m in mons:
        zh = (m.get('zh') or '').strip()
        img = m.get('img') or ''
        if not zh or not img:
            continue
        # 同名同档的重复条目只留一条（档案里同一个怪会出现好几份）
        key = (zh, img, m.get('cls'))
        if key in seen:
            continue
        seen.add(key)
        code, zone, realm = zone_of(img)
        rows.append({
            'n': zh,
            'en': (m.get('en') or '').strip(),
            'cls': m.get('cls') or '',
            'id': m.get('id') or '',
            'zone': code,
            'zoneN': zone,
            'r': realm,
            'img': img,
            'desc': (m.get('desc') or '').strip(),
            'skills': clean_skills(m.get('skills')),
            'kw': m.get('kw') or [],
        })

    # wiki 那一份（可选）：只补字段，不覆盖客户端档案里的名字与头像
    wiki_path = os.path.join(ROOT, 'data/wiki-npcs.json')
    wiki_n = 0
    if '--wiki' in sys.argv and os.path.exists(wiki_path):
        wiki = read_json('data/wiki-npcs.json')
        by_name = {r['n']: r for r in rows}
        for w in wiki:
            n = (w.get('n') or '').strip()
            if not n:
                continue
            row = by_name.get(n)
            if row:
                for k in ('realm', 'rar', 'sex', 'cv', 'birth'):
                    if w.get(k):
                        row['wiki_' + k] = w[k]
                wiki_n += 1
            else:
                rows.append({
                    'n': n, 'en': '', 'cls': w.get('cls') or '角色', 'id': '',
                    'zone': '', 'zoneN': '角色页', 'r': w.get('realm') or 'any',
                    'img': '', 'desc': w.get('desc') or '',
                    'skills': [], 'kw': [], 'wiki_only': True,
                })
                wiki_n += 1

    rows.sort(key=lambda r: (r['zone'] or 'zz', r['cls'] != 'Boss', r['n']))
    out = {
        'src': 'data/dictionary.json 的 monster 档案 + 灰机 wiki Category:角色',
        'zones': {k: {'n': v[0], 'r': v[1]} for k, v in ZONES.items()},
        'count': len(rows),
        'wiki': wiki_n,
        'npcs': rows,
    }
    path = os.path.join(ROOT, 'data/duel-npcs.json')
    with open(path, 'w', encoding='utf-8', newline='') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    from collections import Counter
    print('NPC 条目', len(rows), '（wiki 补', wiki_n, '）')
    print('档位', dict(Counter(r['cls'] for r in rows)))
    print('分区', dict(Counter(r['zoneN'] for r in rows)))


if __name__ == '__main__':
    main()
