#!/usr/bin/env python3
"""把战报侦探所有题目的「区域首领」对齐到 qdby_chinese 的融灾地图总览。

权威来源：qdby_chinese 仓库 data/morimens/dzone-info/map-<期>.json 里每个禁区（wave）的 Boss 战
（encounters 里 t == 'Boss' 的 m[].tid）。禁区序号 = wave 序号 = 题目里的 zone。
数据变过就改下面的 BOSS 表再跑一遍：

    python3 scripts/fix_boss_map.py          # 改写 data/puzzles*.json 和 data/bank/c*.json
    python3 scripts/fix_boss_map.py --check  # 只检查，有不一致就退出码 1（CI / 回归用）

所有题目文件里的 boss 数组都按 (season, zone) 重写；dict.json 里要有这些怪物（名字、立绘取自那里）。
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (期, 禁区) -> 首领怪物 id（字符串，和题目里的写法一致）
BOSS = {
    (71, 1): ['80576', '80577'],            # 残酷的「父亲」+ 沉默的「母亲」
    (71, 2): ['94940'],                     # 「王邸管家」弗兰
    (71, 3): ['67103'],                     # 「缸中之脑」
    (71, 4): ['14063'],                     # 「窜行者」
    (71, 5): ['81279'],                     # 「知者」
    (72, 1): ['14008', '14013'],            # 「镇痛剂」+「手术利刃」
    (72, 2): ['14064'],                     # 「复仇巨刃」
    (72, 3): ['60096'],                     # 「@2奏者」
    (72, 4): ['120308', '120310', '120306'],  # 秽血鱼王 / 腐溃鱼王 / 恶咒鱼王
    (72, 5): ['14039'],                     # 「睡莲」
}

FILES = ['data/puzzles.json', 'data/puzzles-extra.json', 'data/puzzles-more.json'] + sorted(
    os.path.relpath(p, ROOT) for p in glob.glob(os.path.join(ROOT, 'data/bank/c*.json')))


def dump(d):
    return json.dumps(d, ensure_ascii=False, separators=(',', ':'))


def main():
    check = '--check' in sys.argv
    names = {str(m['id']): m['zh'] for m in json.load(open(os.path.join(ROOT, 'data/dict.json'), encoding='utf8'))['monster']}
    for k, ids in BOSS.items():
        for i in ids:
            if i not in names:
                sys.exit(f'dict.json 里没有怪物 {i}（{k}）')
    changed = bad = total = 0
    for rel in FILES:
        path = os.path.join(ROOT, rel)
        raw = open(path, encoding='utf8').read()
        d = json.loads(raw)
        arr = d['puzzles'] if isinstance(d, dict) else d
        dirty = False
        for p in arr:
            key = (p.get('season'), p.get('zone'))
            if key not in BOSS:
                continue
            total += 1
            if p.get('boss') != BOSS[key]:
                bad += 1; dirty = True
                p['boss'] = list(BOSS[key])
        if dirty and not check:
            open(path, 'w', encoding='utf8').write(dump(d) + ('\n' if raw.endswith('\n') else ''))
            changed += 1
    print(f'题目 {total} 道，首领对不上的 {bad} 道' + ('' if check else f'，改写了 {changed} 个文件'))
    if check and bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
