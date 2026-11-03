#!/usr/bin/env python3
"""《寻找伪人：Morimens》的角色档案。

数据全部来自站内已有的公开整理，这里只做「拼装 + 派生」，不新增任何设定：

  · data/huiji-awakeners.tsv     唤醒体的界域 / 职介 / 生日 / 身高 / 英文名 / 别名（灰机 wiki）
  · idle/public/data/game-data.json  62 名唤醒体的 slug（图集按它排）
  · data/protocol-units.json     界域 / 职介 / 编号
  · data/survivors-extra.json    11 位 B 站主播（界域 / 职介 / 头像 / 签名）
  · data/wolf-corpus.json        主播的直播间标题与分区（照抄 B 站，别自己编）

输出 data/fake-chars.json：每人 6 条「档案事实」，前 3 条印在登记卡上，
后 3 条只能靠问。伪人就是「抄错了一条」的那位——游戏里的判据全在这里。

用法：python scripts/build_fake_data.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

ZODIAC = [(1, 20, '水瓶座'), (2, 19, '双鱼座'), (3, 21, '白羊座'), (4, 20, '金牛座'),
          (5, 21, '双子座'), (6, 22, '巨蟹座'), (7, 23, '狮子座'), (8, 23, '处女座'),
          (9, 23, '天秤座'), (10, 24, '天蝎座'), (11, 23, '射手座'), (12, 22, '摩羯座')]


def zodiac_of(birthday):
    m = re.match(r'^(\d{1,2})月(\d{1,2})日$', (birthday or '').strip())
    if not m:
        return None
    mo, d = int(m.group(1)), int(m.group(2))
    for i, (mm, dd, name) in enumerate(ZODIAC):
        if (mo, d) < (mm, dd):
            return ZODIAC[i - 1][2]
    return '摩羯座'


def main():
    rows = []
    for line in (ROOT / 'data/huiji-awakeners.tsv').read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        c = line.split('|')
        while len(c) < 14:
            c.append('')
        rows.append(c)
    tsv = {r[0]: r for r in rows}

    # 站内 roster 的中文名与灰机词条有几处写法不同
    ALIAS = {'珈伦': '珂伦', '24': '「24」'}
    for name in ALIAS:
        if ALIAS[name] not in tsv:
            raise SystemExit('灰机表里找不到 %s' % ALIAS[name])

    gd = json.loads((ROOT / 'idle/public/data/game-data.json').read_text(encoding='utf-8'))
    units = {u['n']: u for u in json.loads(
        (ROOT / 'data/protocol-units.json').read_text(encoding='utf-8'))['units']}

    chars = []
    for a in gd['awakeners']:
        zh = a['zh']
        row = tsv.get(ALIAS.get(zh, zh))
        if row is None:
            raise SystemExit('灰机表里没有 %s' % zh)
        # 编号：protocol-units 用中文名索引（「24」带书名号）
        u = units.get(zh) or units.get('「%s」' % zh)
        gid = str(u['gid']) if u else ''
        aliases = [x.strip() for x in row[10].split('、') if x.strip()]
        aliases = [x for x in aliases if x != zh and x != row[0]][:4]
        birthday = row[4].strip()
        facts = {
            'realm': row[1].strip(),
            'role': row[3].strip(),
            'no': ('No.%s' % gid) if gid else 'No.----',
            'birthday': birthday,
            'height': row[6].strip() or '不详',
            'alias': '、'.join(aliases) if aliases else '没有别的叫法',
        }
        z = zodiac_of(birthday)
        if z:
            facts['zodiac'] = z
        char = {
            'id': a['slug'], 'n': zh, 'en': a['en'], 'k': 'a',
            'realm': facts['realm'], 'role': facts['role'],
            'rarity': row[2].strip(), 'sex': row[5].strip(),
            'age': row[8].strip(), 'weight': row[7].strip(),
            'facts': facts,
            'card': ['realm', 'role', 'no'],
            'ask': [k for k in ('birthday', 'height', 'alias', 'zodiac') if k in facts],
            'img': {'idle': a['slug'], 'card': a['slug'], 'bust': a['slug']},
        }
        chars.append(char)

    # ---------------------------------------------------------------- 主播
    extra = json.loads((ROOT / 'data/survivors-extra.json').read_text(encoding='utf-8'))
    wolf = json.loads((ROOT / 'data/wolf-corpus.json').read_text(encoding='utf-8'))['ups']
    for i, c in enumerate(extra['chars']):
        key = c['id'].split('-', 1)[1]
        w = wolf.get(key) or {}
        sign = (c.get('bio') or '').strip()
        # 签名里常夹着粉丝群号，不适合当「招牌语」：取第一句，命中群号就跳过
        parts = [x.strip() for x in re.split(r'[。！？\n]', sign) if x.strip()]
        parts = [x for x in parts if not re.search(r'群|qq|\+q|病友|\d{7,}', x, re.I)]
        sign = (parts[0] if parts else '（没写签名）')
        if len(sign) > 24:
            sign = sign[:24] + '…'
        live = ((w.get('live') or {}).get('title') or '').strip()
        area = ((w.get('live') or {}).get('area') or '').strip()
        facts = {
            'realm': c['realm'], 'role': c['role'], 'platform': 'B 站',
            'sign': sign,
            'live': live or '今晚不播',
            'area': area or '手游',
            'no': 'C-%02d' % (i + 1),
        }
        chars.append({
            'id': key, 'n': c['n'], 'en': c['en'], 'k': 's',
            'realm': c['realm'], 'role': c['role'],
            'color': c.get('color') or '#9aa4bb',
            'facts': facts,
            'card': ['realm', 'role', 'platform'],
            'ask': ['sign', 'live', 'area'],
            'img': {'face': c['face']},
        })

    out = {
        '_note': '由 scripts/build_fake_data.py 生成，勿手改。每人的 facts 是档案真相；'
                 'card 是登记卡上印着的三条，ask 是只能靠问的三~四条。伪人 = 抄错一条的那位。',
        'chars': chars,
    }
    (ROOT / 'data/fake-chars.json').write_text(
        json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')

    from collections import Counter
    print('唤醒体 %d 名，主播 %d 名，共 %d' % (
        sum(1 for c in chars if c['k'] == 'a'), sum(1 for c in chars if c['k'] == 's'), len(chars)))
    print('界域', dict(Counter(c['realm'] for c in chars)))
    print('职介', dict(Counter(c['role'] for c in chars)))
    print('可问字段数', dict(Counter(len(c['ask']) for c in chars)))
    print('无星座的（生日不可解析）', [c['n'] for c in chars if 'zodiac' not in c['facts']])


if __name__ == '__main__':
    main()
