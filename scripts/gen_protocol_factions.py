# 把 SKeyDB 的「所属组织」（faction）抽成仓库里的一份小表。
#
# 为什么单独存一份、不每次去读 D 盘那个仓库：
#   1) 生成协议单位表（gen_protocol_units.py）要能离线跑，不能依赖外部目录；
#   2) 这份表要进 git，别人才知道某个角色的组织是从哪来的。
#
# 对齐方式：protocol-units.json 的 gid（游戏内 id，如 15601）
#   → dictionary.json 的 awakener[gid].pid（awakener-0001）
#   → SKeyDB 记录的 id。名字不可靠（「24」在 SKeyDB 叫 "24"、在协议里叫 Mason），id 才可靠。
#
# 用法（只有 SKeyDB 更新时才需要重跑）：
#   python scripts/gen_protocol_factions.py --skeydb <awakeners.json 路径>
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'data/protocol-factions.json'
DICT = ROOT / 'data/dictionary.json'
UNITS = ROOT / 'data/protocol-units.json'

# SKeyDB 的英文阵营 → 本玩法用的键。中文名是直译，界面上会并列显示英文原名，
# 免得自造译名被当成官方叫法。
FAC_KEY = {
    'The Fools': 'fools',
    'Outlanders': 'outlander',
    'Hybrid': 'hybrid',
    'The Unknowable': 'unknowable',
    'Among the Stars': 'stars',
    'Out of the Aeons': 'aeons',
    # 门径只有 1 个人，凑不到 2 人档，和 TBD 一起归进「未定」
    'Gateway': 'unknown',
    'TBD': 'unknown',
}


def main():
    args = sys.argv[1:]
    if '--skeydb' in args:
        src = Path(args[args.index('--skeydb') + 1])
    else:
        src = Path('D:/软件所/morimens/qdby_chinese_work/data/morimens/skeydb/awakeners.json')
    recs = json.loads(src.read_text(encoding='utf-8'))['records']
    by_pid = {r['id']: r for r in recs}

    dic = json.loads(DICT.read_text(encoding='utf-8'))['awakener']
    gid_to_pid = {a['id']: a['pid'] for a in dic}
    zh_of = {a['id']: a['zh'] for a in dic}

    units = json.loads(UNITS.read_text(encoding='utf-8'))['units']
    fac = {}
    missing = []
    for u in units:
        pid = gid_to_pid.get(u['gid'])
        r = by_pid.get(pid) if pid else None
        if not r:
            fac[u['gid']] = 'unknown'
            missing.append(u['n'])
            continue
        fac[u['gid']] = FAC_KEY.get(r['faction'], 'unknown')

    out = {
        'src': 'SKeyDB awakeners.json 的 faction 字段（dansa/SKeyDB，数据 CC-BY-NC-SA-4.0），'
               '经 data/dictionary.json 的 pid 与协议单位对数',
        'names': {
            'fools': ['愚者', 'The Fools'],
            'outlander': ['界外者', 'Outlanders'],
            'hybrid': ['混血者', 'Hybrid'],
            'unknowable': ['不可知者', 'The Unknowable'],
            'stars': ['星之间', 'Among the Stars'],
            'aeons': ['万古之外', 'Out of the Aeons'],
            'unknown': ['未定', 'Unknown'],
        },
        'fac': fac,
        # 这两位比 SKeyDB 里的 60 条新，暂时没有组织，归到「未定」
        'missing': missing,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    from collections import Counter
    c = Counter(fac.values())
    print('%d 名唤醒体 → %s' % (len(fac), OUT.relative_to(ROOT)))
    for k, n in c.most_common():
        print('  %-12s %d' % (k, n))
    if missing:
        print('无组织（归入未定）：%s' % '、'.join(missing))


if __name__ == '__main__':
    main()
