#!/usr/bin/env python3
"""审计「角色名 ↔ 图标」是否对得上：把每个游戏里实际用的图，和官方头像（assets/awakener/<slug>.webp）
缩成 24×24 灰度做相关，看「最像的是不是该角色本人」。最像的不是本人 → 报出来。

覆盖：大巴扎图集 / 忘却协议头像 / 寻找伪人胸像 / 唤醒王头像 / 狼人杀头像 / 轮盘头像。
用法：python scripts/audit_icons.py
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
N = 24


def vec(im):
    im = im.convert('RGBA')
    bg = Image.new('RGBA', im.size, (128, 128, 128, 255))
    bg.alpha_composite(im)
    g = bg.convert('L').resize((N, N), Image.LANCZOS)
    px = list(g.getdata())
    m = sum(px) / len(px)
    d = [p - m for p in px]
    n = sum(x * x for x in d) ** 0.5 or 1
    return [x / n for x in d]


def corr(a, b):
    return sum(x * y for x, y in zip(a, b))


gd = json.loads((ROOT / 'idle/public/data/game-data.json').read_text(encoding='utf-8'))
REF = {}
ZH2SLUG = {}
for a in gd['awakeners']:
    p = ROOT / 'assets/awakener' / (a['slug'] + '.webp')
    if p.exists():
        REF[a['slug']] = vec(Image.open(p))
        ZH2SLUG[a['zh']] = a['slug']


def best(v):
    sc = sorted(((corr(v, r), s) for s, r in REF.items()), reverse=True)
    return sc[0], sc[1]


bad_total = 0


def check(title, items):
    """items: [(显示名, 期望 slug, 图 PIL)]"""
    global bad_total
    bad = []
    n = 0
    for name, slug, im in items:
        if slug not in REF:
            continue
        n += 1
        v = vec(im)
        (s1, b1), (s2, b2) = best(v)
        own = corr(v, REF[slug])
        if b1 != slug and own < s1 - 0.03:
            bad.append((name, slug, b1, round(own, 2), round(s1, 2)))
    print('%-14s 共查 %3d，疑似错位 %d' % (title, n, len(bad)))
    for b in bad[:40]:
        print('    · %s（应为 %s）→ 更像 %s  本人相似 %.2f / 最像 %.2f' % b)
    bad_total += len(bad)


# 1. 大巴扎图集：hero:N ↔ HEROES[N]
import subprocess
heroes = json.loads(subprocess.run(['node', '-e', "import('./js/bazaar-gen.js').then(g=>console.log(JSON.stringify(g.HEROES.map(h=>({id:h.id,n:h.n,spr:h.spr})))))"], cwd=ROOT, capture_output=True, text=True).stdout or '[]')
if heroes:
    sh = Image.open(ROOT / 'assets/bazaar/sheet-hero.webp').convert('RGBA')
    cw, ch = sh.width // 8, sh.height // 10
    items = []
    for h in heroes:
        i = int(h['spr'].split(':')[1])
        tile = sh.crop(((i % 8) * cw, (i // 8) * ch, (i % 8 + 1) * cw, (i // 8 + 1) * ch))
        items.append((h['n'], h['id'], tile))
    check('大巴扎 图集', items)

# 2. 忘却协议：头像图集
art = json.loads((ROOT / 'data/protocol-art.json').read_text(encoding='utf-8'))
units = {u['id']: u for u in json.loads((ROOT / 'data/protocol-units.json').read_text(encoding='utf-8'))['units']}
sheet = Image.open(ROOT / 'assets/protocol/proto-sheet.webp').convert('RGBA')
items = []
for uid, a in art['anims'].items():
    r = a.get('head')
    u = units.get(uid)
    if not r or not u:
        continue
    slug = ZH2SLUG.get(u['n'])
    items.append((u['n'], slug, sheet.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))))
check('忘却协议 头像', items)

# 3. 寻找伪人：胸像图集
fa = json.loads((ROOT / 'data/fake-art.json').read_text(encoding='utf-8'))
bust = Image.open(ROOT / 'assets/fake/bust.webp').convert('RGBA')
items = []
for i, c in enumerate(fa['chars']):
    r = fa['bust']['rects'][i]
    items.append((c['n'], c['slug'], bust.crop((r[0], r[1], r[0] + r[2], r[1] + r[3]))))
check('寻找伪人 胸像', items)

# 4. 唤醒王：决斗链接
da = json.loads((ROOT / 'data/duel-art.json').read_text(encoding='utf-8'))
fs = Image.open(ROOT / 'assets/duel/faces.webp').convert('RGBA')
C, cols = da['cell'], da['cols']
items = []
for name, i in da['index'].items():
    if name in ZH2SLUG:
        items.append((name, ZH2SLUG[name], fs.crop(((i % cols) * C, (i // cols) * C, (i % cols + 1) * C, (i // cols + 1) * C))))
check('唤醒王 头像', items)

# 5. 狼人杀：av 编号 ↔ 名字
wd = (ROOT / 'js/wolf/data.js').read_text(encoding='utf-8')
items = []
for m in re.finditer(r"\{\s*av:\s*'(\d+)',\s*zh:\s*'([^']+)'", wd):
    av, zh = m.group(1), m.group(2)
    p = ROOT / 'assets/avatars' / ('a-%s.webp' % av)
    if p.exists() and zh in ZH2SLUG:
        items.append((zh, ZH2SLUG[zh], Image.open(p)))
check('狼人杀 头像', items)

# 6. 轮盘
rc = json.loads((ROOT / 'data/roulette-chars.json').read_text(encoding='utf-8'))
items = []
for c in rc['chars']:
    p = ROOT / c.get('src', '')
    if c.get('src') and p.exists() and c['n'] in ZH2SLUG:
        items.append((c['n'], ZH2SLUG[c['n']], Image.open(p)))
check('轮盘 头像', items)

print('疑似错位合计', bad_total)
sys.exit(1 if bad_total else 0)
