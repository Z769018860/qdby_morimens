#!/usr/bin/env python3
"""把战报侦探所有题目的「区域首领」对齐到 qdby_chinese 的融灾地图总览。

权威来源：官方战斗回放里 monsterDataList 实际出场的首领（scripts 里 decodeReplay 可读），
（用户定的口径：以回放为准）。qdby_chinese 的 dzone-info/map-<期>.json 只作参考 里每个禁区（wave）的 Boss 战
（encounters 里 t == 'Boss' 的 m[].tid）。禁区序号 = wave 序号 = 题目里的 zone。
注意：map-72.json（本地客户端表）的 72 期首领与开服首日的回放不一致（表里是 149106 / 49592 / 14064），
以回放为准；--source 检查 72 期会因此报不一致，属已知。数据变过就改下面的 BOSS 表再跑一遍：

    python3 scripts/fix_boss_map.py          # 改写 data/puzzles*.json 和 data/bank/c*.json
    python3 scripts/fix_boss_map.py --check  # 只检查，有不一致就退出码 1（CI / 回归用）

所有题目文件里的 boss 数组都按 (season, zone) 重写；dict.json 里要有这些怪物（名字、立绘取自那里）。
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# (期, 禁区) -> 首领怪物 id（字符串，和题目里的写法一致）
BOSS = {
    # 70 期（9.28-10.11）—— 官方回放逐区核对（每区 ≥6 份回放里都有该怪物的 monsterDataList 记录）
    (70, 1): ['147675'],                    # 「白雪仙女」
    (70, 2): ['125901'],                    # 「门之钥」
    (70, 3): ['14011'],                     # 「石之眼」
    (70, 4): ['140713'],                    # 乱码名首领（官方名字就是乱码）
    (70, 5): ['14015'],                     # 撕裂维度之足
    # 71 期（10.12-10.25）—— 顺序和 qdby_chinese 的 map-71（wave 序）正好相反，以回放 / 关卡名 Zone N 为准
    (71, 1): ['81279'],                     # 「知者」
    (71, 2): ['14063'],                     # 「窜行者」
    (71, 3): ['67103'],                     # 「缸中之脑」
    (71, 4): ['94940'],                     # 「王邸管家」弗兰
    (71, 5): ['80576', '80577'],            # 残酷的「父亲」+ 沉默的「母亲」
    # 72 期（10.26-11.8）
    (72, 1): ['14008', '14013'],            # 「镇痛剂」+「手术利刃」
    (72, 2): ['14064'],                     # 「复仇巨刃」
    (72, 3): ['60096'],                     # 「@2奏者」
    (72, 4): ['120308', '120310', '120306'],  # 秽血鱼王 / 腐溃鱼王 / 恶咒鱼王
    (72, 5): ['14039'],                     # 「睡莲」
}

# 以官方回放为准、与 qdby_chinese 地图表不一致的禁区：--source 检查时跳过并打印出来，不当作错误。
# 70 / 71 / 72 期都是：70 期地图表是别的期次的内容、71 期的 wave 序与禁区序相反、72 期是本地客户端表（与开服首日回放不同）。
REPLAY_WINS = {(s, z) for s in (70, 71, 72) for z in range(1, 6)}

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
    # When the source checkout is available, verify the maintained table against map encounters.
    if '--source' in sys.argv:
        source = sys.argv[sys.argv.index('--source') + 1]
        for season in sorted({s for s, _ in BOSS}):
            path = os.path.join(source, f'data/morimens/dzone-info/map-{season}.json')
            data = json.load(open(path, encoding='utf8'))
            for wave in data['waves']:
                ids = list(dict.fromkeys(str(m['tid']) for encounter in wave['enc'].values()
                    if encounter['t'] == 'Boss' for m in encounter['m']))
                key = (season, wave['wave'])
                if BOSS.get(key) != ids:
                    if key in REPLAY_WINS:
                        print(f'  以回放为准（地图表不同，已知）: {key}: 表 {BOSS.get(key)} / 地图 {ids}')
                        continue
                    sys.exit(f'Boss 表与地图不一致: {key}: {BOSS.get(key)} != {ids}')
        print('Boss 表与 qdby_chinese 融灾地图一致')
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
