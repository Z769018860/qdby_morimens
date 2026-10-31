# 主卡组 30 → 40 张。
#
# 只用「这套牌自己已经有的牌」补到 40：换别人的牌会改掉每套牌的性格，
# 也会让上一轮调好的胜率全部作废。补张顺序就是卡表原顺序（写在前面的都是核心），
# 同名上限 3 张，一轮一轮往上加。
#
# 注意：duel-packs.json 是手写的紧凑格式，整体 json.dump 会把 diff 变成几千行，
# 所以这里只正则在原文本上重排 "cards": [...] 那一段。
import json
import re

ROOT = 'H:/work/qdby_morimens'
packs_p = ROOT + '/data/duel-packs.json'
raw = open(packs_p, encoding='utf-8').read()
data = json.loads(raw)
TARGET = 40
MAXC = 3
PER_LINE = 6


def pad(deck):
    pairs = [list(p) for p in deck['cards']]
    total = sum(p[1] for p in pairs)
    guard = 0
    while total < TARGET:
        grew = False
        for p in pairs:
            if total >= TARGET:
                break
            if p[1] < MAXC:
                p[1] += 1
                total += 1
                grew = True
        guard += 1
        if not grew or guard > 40:
            raise SystemExit('%s 补不满：%d 张' % (deck['id'], total))
    deck['cards'] = pairs
    return total


def fmt_cards(pairs):
    head = '"cards": [\n'
    lines = []
    for i in range(0, len(pairs), PER_LINE):
        chunk = ', '.join('["%s", %d]' % (c[0], c[1]) for c in pairs[i:i + PER_LINE])
        lines.append('             ' + chunk)
    return head + ',\n'.join(lines) + ']'


CARDS_RE = re.compile(r'"cards": \[\s*((?:\[\s*"[^"]+",\s*\d+\s*\](?:,\s*)?)+)\]')

pos = raw.index('"decks": [')
head, tail = raw[:pos], raw[pos:]
out = []
last = 0
for d in data['decks']:
    n = pad(d)
    m = CARDS_RE.search(tail, last)
    if not m:
        raise SystemExit('找不到 %s 的 cards 段' % d['id'])
    out.append(tail[last:m.start()])
    out.append(fmt_cards(d['cards']))
    last = m.end()
    print('%s %-18s %d 张 / %d 种' % (d['id'], d['n'], n, len(d['cards'])))
out.append(tail[last:])
open(packs_p, 'w', encoding='utf-8', newline='\n').write(head + ''.join(out))
