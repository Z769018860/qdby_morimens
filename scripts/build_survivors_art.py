#!/usr/bin/env python3
"""把《唤醒体幸存者》要用的图标压成一张图集。

为什么要图集：站点的每个静态请求要 1~2 秒（EdgeOne 只给 HTTP/1.1、
max-age=0）。这游戏要显示 62 个可玩角色、一批怪物、造物与命轮，
按文件一个个请求就是几百个来回；拼成一张 webp 再内联成 data URI，
整局游戏只发一个脚本请求。

输出的三份东西：
  assets/survivors/atlas.webp   统一 120px 格的图集
  data/survivors-atlas.json     帧表（key -> 格位）+ 角色/怪物/道具清单
  （构建脚本再把这两个内联进 js/sv/gen.js）

素材全部来自 assets/ 下已有的官方图，不做二次绘制，只做等比缩放。

用法：python scripts/build_survivors_art.py [--cell 120] [--q 72]
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / 'assets/survivors/atlas.webp'
OUT_JSON = ROOT / 'data/survivors-atlas.json'

CELL = 120
Q = 72
COLS = 8

argv = sys.argv[1:]
if '--cell' in argv:
    CELL = int(argv[argv.index('--cell') + 1])
if '--q' in argv:
    Q = int(argv[argv.index('--q') + 1])

D = json.loads((ROOT / 'data/dictionary.json').read_text(encoding='utf-8'))


def pick_monsters():
    """怪物按分类挑，保证波次里有层次。

    只用 Portrait_Small_Monster_* 这一支：它是带透明通道的战斗立绘，叠在
    深色地格上边缘干净。Minihead_EnemyAwaker_*（敌方唤醒体小头像）实测自带
    白底卡片，游戏里会糊成一团白方块，所以整支不用。
    同一个图只保留一次，避免图集里出现重复帧。
    """
    seen = set()
    out = []

    def add(m):
        if m['img'] in seen:
            return False
        seen.add(m['img'])
        out.append(m)
        return True

    def pool(cls, big):
        return [
            m for m in D['monster']
            if m.get('cls') == cls and (m.get('img') or '').startswith('assets/monster/Portrait_Small_Monster_')
            and ('BOSSSIZE' in m['img']) == big
        ]

    for m in pool('普通', False)[:9]:
        add(m)
    for m in pool('精英', False)[:5]:
        add(m)
    for m in pool('Boss', True)[:4]:
        add(m)
    # 兜底：任意一类不够就用剩下的普通立绘补满 18 种
    for m in D['monster']:
        if len(out) >= 18:
            break
        if (m.get('img') or '').startswith('assets/monster/Portrait_Small_Monster_'):
            add(m)
    return out[:18]


monsters = pick_monsters()

# 造物：优先 SSR 的「造物」类别，按 use（使用率）排，玩家一眼能认出来
creations = [c for c in D['creation'] if c.get('kind') == '造物' and c.get('img')]
creations.sort(key=lambda c: (-(c.get('use') or 0)))
creations = creations[:42]

wheels = [w for w in D['wheel'] if w.get('rarity') == 'SSR' and w.get('img')]
wheels.sort(key=lambda w: (-(w.get('use') or 0)))
wheels = wheels[:18]

covs = [c for c in D['covenant'] if c.get('img')][:9]

frames = {}
cells = []


def add_frame(key, rel):
    p = ROOT / rel
    if not p.exists():
        raise SystemExit('素材缺失：' + rel)
    frames[key] = len(cells)
    cells.append(p)


for a in D['awakener']:
    add_frame('c:' + a['id'], a['img'])

# 四位神秘唤醒体不在官方图鉴里，头像单独放在 assets/hidden/。
# 素材来源已写进 data/survivors-data.json 的 bioSrc 字段，界面会标出处：
#   神王·图鲁  ← 灰机wiki「图鲁」条目里的本源降临立绘「神王·图鲁无底.png」，
#                原图是透明底的纯黑影（70% 面积是 #000），深色界面里看不出轮廓，
#                所以合成了一层暗色背光 + 一圈极细金边（形状未改），
#                合成脚本见 H:/work/tmp/mk_tulu.py
#   威廉·德拉普尔 / 守密人（西维斯特）  ← 灰机wiki·忘却前夜中文维基的角色头像
#   N                                   ← 原作怪物立绘 Portrait_Small_Monster_DCB04
# 注意这几张都是方图、本来就小（N 只有 160px），别在上游放大，缩到 120 格反而干净。
EXTRA_ART = {
    '90001': 'assets/hidden/tulu.webp',
    '90002': 'assets/hidden/n.webp',
    '90003': 'assets/hidden/william.webp',
    '90004': 'assets/hidden/keeper.webp',
}
for cid, rel in EXTRA_ART.items():
    add_frame('c:' + cid, rel)
for m in monsters:
    add_frame('m:' + m['id'], m['img'])
for c in creations:
    add_frame('k:' + c['id'], c['img'])
for w in wheels:
    add_frame('w:' + w['id'], w['img'])
for c in covs:
    add_frame('v:' + c['id'], c['img'])

rows = (len(cells) + COLS - 1) // COLS
sheet = Image.new('RGBA', (COLS * CELL, rows * CELL), (0, 0, 0, 0))

for i, p in enumerate(cells):
    im = Image.open(p).convert('RGBA')
    # 等比塞进格子里，留 3px 边（相邻图标不至于在缩放采样时互相污染）
    box = CELL - 6
    im.thumbnail((box, box), Image.LANCZOS)
    x = (i % COLS) * CELL + (CELL - im.width) // 2
    y = (i // COLS) * CELL + (CELL - im.height) // 2
    sheet.alpha_composite(im, (x, y))

OUT_IMG.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUT_IMG, 'WEBP', quality=Q, method=6)

meta = {
    'cell': CELL,
    'cols': COLS,
    'w': sheet.width,
    'h': sheet.height,
    'count': len(cells),
    'frames': frames,
    'monsters': [{'id': m['id'], 'n': m['zh'], 'cls': m['cls']} for m in monsters],
    'creations': [{'id': c['id'], 'n': c['zh'], 'r': c.get('rarity'), 't': c.get('tags') or []} for c in creations],
    'wheels': [{'id': w['id'], 'n': w['zh'], 'realm': w.get('realm')} for w in wheels],
    'covenants': [{'id': c['id'], 'n': c['zh']} for c in covs],
}
OUT_JSON.write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

kb = OUT_IMG.stat().st_size / 1024
print(f'图集 {sheet.width}x{sheet.height}，{len(cells)} 帧，{kb:.0f}KB（base64 后约 {kb * 1.37:.0f}KB）')
print(f'  角色 {len(D["awakener"])} / 怪物 {len(monsters)} / 造物 {len(creations)} / 命轮 {len(wheels)} / 契物 {len(covs)}')
