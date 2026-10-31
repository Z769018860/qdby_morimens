#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把《唤醒王：决斗链接》卡表里用到的角色头像拼成一张图集，并生成卡背与首页图标。

为什么要拼图集：线上边缘每个请求固定 1~2 秒，一局里要显示十几张卡面，
逐张请求就是十几个来回。拼成一张 webp 后，整页仍然只有「页面 + 一个脚本」两个请求。

图集最后几格不是人物，是画出来的符号：
  @spell   魔法卡统一图标（法阵），代替原来所有魔法都顶着一张「24」的脸
  @trap    陷阱卡统一图标（尖刺 + 警示），同上
  @token   衍生物的统一卡面（虚线圈 + 空心六边形）
  @shadow  神王·图鲁的黑影（不露脸）
  @shadow2 王权·终焉图鲁的黑影（带金环，和上面区分）

用法：python scripts/build_duel_art.py
输入：data/duel-cards.json + data/avatars.json（头像源 assets/avatars/a-*.webp，96×96）
输出：assets/duel/faces.webp（图集，160×160 一格）
      assets/duel/back.webp（卡背，132×188）
      assets/ui/gameicons/duel.webp（首页九宫格图标，80×80）
      data/duel-art.json（图集元数据：格宽、列数、名字 → 序号）
"""
import json
import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CELL = 128   # 唤醒体源图 96~120px、NPC 源图 160px：128 是两边都不吃亏的折中；
             # 160 时 133 格图集接近 1MB，边缘一次请求 1~2 秒，不值得。
COLS = 8
SS = 4  # 符号格先按 4 倍画再缩，避免细线糊成一片


def read_json(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f:
        return json.load(f)


def grad(n, top, bottom):
    """竖直渐变底：符号格不用透明底，贴到卡片上不会露出卡面底色。"""
    im = Image.new('RGB', (n, n), top)
    d = ImageDraw.Draw(im)
    for i in range(n):
        t = i / max(1, n - 1)
        d.line([(0, i), (n, i)],
               fill=tuple(int(top[k] + (bottom[k] - top[k]) * t) for k in range(3)))
    return im


def draw_spell(size=CELL):
    """魔法：法阵（双环 + 八芒星 + 环上六点），靛紫配色。"""
    n = size * SS
    im = grad(n, (34, 28, 68), (13, 13, 28))
    d = ImageDraw.Draw(im, 'RGBA')
    cx = cy = n // 2
    r1, r2 = n * 0.41, n * 0.30
    d.ellipse([cx - r1, cy - r1, cx + r1, cy + r1], outline=(126, 140, 230, 210), width=SS * 2)
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], outline=(150, 165, 255, 120), width=SS)
    star = []
    for i in range(8):
        a = math.radians(-90 + i * 45)
        rr = r2 if i % 2 == 0 else r2 * 0.42
        star.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    d.line(star + [star[0]], fill=(203, 191, 255, 235), width=SS * 2)
    for i in range(6):
        a = math.radians(30 + i * 60)
        px, py = cx + math.cos(a) * (r1 + r2) / 2, cy + math.sin(a) * (r1 + r2) / 2
        d.ellipse([px - SS * 1.6, py - SS * 1.6, px + SS * 1.6, py + SS * 1.6],
                  fill=(203, 191, 255, 200))
    cr = n * 0.055
    d.polygon([(cx, cy - cr), (cx + cr, cy), (cx, cy + cr), (cx - cr, cy)], fill=(240, 236, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def draw_trap(size=CELL):
    """陷阱：三道尖刺 + 中心警示菱形，暗红配色。"""
    n = size * SS
    im = grad(n, (58, 16, 26), (16, 10, 16))
    d = ImageDraw.Draw(im, 'RGBA')
    cx = n // 2
    for i in (-1, 0, 1):
        x = cx + i * n * 0.235
        top = n * (0.40 + abs(i) * 0.07)
        d.polygon([(x - n * 0.085, n * 0.90), (x, top), (x + n * 0.085, n * 0.90)],
                  fill=(176, 62, 78, 225))
        d.line([(x, top + n * 0.02), (x, n * 0.88)], fill=(236, 128, 138, 200), width=SS)
    d.rectangle([0, n * 0.90, n, n], fill=(24, 12, 16, 255))
    d.line([(0, n * 0.90), (n, n * 0.90)], fill=(232, 101, 111, 180), width=SS * 2)
    cy = n * 0.30
    r = n * 0.135
    d.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)],
              fill=(18, 10, 14, 230), outline=(255, 198, 150, 245))
    d.line([(cx, cy - r * 0.55), (cx, cy + r * 0.10)], fill=(255, 214, 170, 250), width=SS * 2)
    d.ellipse([cx - SS * 1.6, cy + r * 0.36 - SS * 1.6, cx + SS * 1.6, cy + r * 0.36 + SS * 1.6],
              fill=(255, 214, 170, 250))
    return im.resize((size, size), Image.LANCZOS)


def draw_shadow(size=CELL, awaken=False):
    """神王系的黑影：兜帽人影，背光、看不清脸。awaken=True 时加一圈金环。

    第一版画的是「头 + 王冠尖」，缩到 88px 之后两只尖像猫耳，所以改成兜帽：
    轮廓越简单越不会认错。
    """
    n = size * SS
    im = grad(n, (22, 20, 36), (9, 10, 18)).convert('RGBA')
    cx = n // 2
    # 身后的一团背光，剪影才立得住
    glow = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - n * 0.40, n * 0.06, cx + n * 0.40, n * 0.98],
                                 fill=(96, 116, 196, 78))
    im = Image.alpha_composite(im, glow.filter(ImageFilter.GaussianBlur(n * 0.07)))
    d = ImageDraw.Draw(im, 'RGBA')
    if awaken:
        for rr, a, w in ((n * 0.44, 70, SS * 3), (n * 0.37, 110, SS)):
            d.ellipse([cx - rr, n * 0.50 - rr, cx + rr, n * 0.50 + rr],
                      outline=(227, 179, 65, a), width=w)
    ink = (8, 9, 15, 255)
    # 袍子：从肩一直铺到画底
    d.polygon([(cx - n * 0.42, n), (cx - n * 0.35, n * 0.74), (cx - n * 0.21, n * 0.63),
               (cx + n * 0.21, n * 0.63), (cx + n * 0.35, n * 0.74), (cx + n * 0.42, n)], fill=ink)
    # 兜帽：圆顶收口，顶上没有尖
    d.polygon([(cx - n * 0.21, n * 0.65), (cx - n * 0.20, n * 0.37), (cx - n * 0.12, n * 0.21),
               (cx, n * 0.135), (cx + n * 0.12, n * 0.21), (cx + n * 0.20, n * 0.37),
               (cx + n * 0.21, n * 0.65)], fill=ink)
    d.ellipse([cx - n * 0.20, n * 0.30, cx + n * 0.20, n * 0.62], fill=ink)
    # 帽内的暗面：脸所在的位置比袍子更黑
    d.ellipse([cx - n * 0.125, n * 0.40, cx + n * 0.125, n * 0.60], fill=(2, 2, 4, 255))
    # 冠：一道细金环，加三枚很小的尖（缩到 88px 也还认得出是「王」）
    for sx in (-1, 0, 1):
        h = n * (0.075 if sx == 0 else 0.055)
        d.polygon([(cx + sx * n * 0.085 - n * 0.022, n * 0.205),
                   (cx + sx * n * 0.085, n * 0.205 - h),
                   (cx + sx * n * 0.085 + n * 0.022, n * 0.205)], fill=(227, 179, 65, 215))
    d.arc([cx - n * 0.155, n * 0.30, cx + n * 0.155, n * 0.48], 200, 340,
          fill=(227, 179, 65, 205), width=SS * 2)
    # 轮廓光：只有左侧一道，右边留暗
    d.line([(cx - n * 0.21, n * 0.64), (cx - n * 0.20, n * 0.37), (cx - n * 0.12, n * 0.21),
            (cx, n * 0.14)], fill=(227, 179, 65, 150), width=SS * 2)
    # 两点眼睛，只是反光，看不清
    for sx in (-1, 1):
        ex = cx + sx * n * 0.048
        d.ellipse([ex - SS * 2, n * 0.485 - SS * 1.2, ex + SS * 2, n * 0.485 + SS * 1.2],
                  fill=(240, 208, 140, 200))
    return im.convert('RGB').resize((size, size), Image.LANCZOS)


def draw_token(size=CELL):
    """衍生物：一圈虚线圈 + 中间一个空心六边形，意思是「这里站着一个不是人的东西」。

    不画具体形象，是因为衍生物本来就不该抢戏——它只是身位、祭品和靶子。
    """
    n = size * SS
    im = grad(n, (26, 34, 40), (12, 15, 20))
    d = ImageDraw.Draw(im, 'RGBA')
    cx = cy = n // 2
    r = n * 0.42
    # 外圈虚线：24 段弧，一段亮一段暗，缩到 128px 还看得出是「虚线」
    for i in range(24):
        a0 = i * 15
        col = (150, 176, 190, 210) if i % 2 == 0 else (86, 102, 116, 150)
        d.arc([cx - r, cy - r, cx + r, cy + r], a0, a0 + 9, fill=col, width=SS * 2)
    # 内部空心六边形
    hexp = []
    for i in range(6):
        a = math.radians(-90 + i * 60)
        hexp.append((cx + math.cos(a) * r * 0.58, cy + math.sin(a) * r * 0.58))
    d.line(hexp + [hexp[0]], fill=(176, 198, 210, 170), width=SS * 2)
    # 中心小菱形
    cr = n * 0.05
    d.polygon([(cx, cy - cr), (cx + cr, cy), (cx, cy + cr), (cx - cr, cy)], fill=(198, 220, 232, 220))
    return im.resize((size, size), Image.LANCZOS)


SPECIAL = {
    '@spell': lambda: draw_spell(),
    '@trap': lambda: draw_trap(),
    '@token': lambda: draw_token(),
    '@shadow': lambda: draw_shadow(awaken=False),
    '@shadow2': lambda: draw_shadow(awaken=True),
}


def main():
    cards = read_json('data/duel-cards.json')
    meta = read_json('data/avatars.json')
    src_by_name = {x['n']: x['src'] for x in meta['items']}
    # 唤醒体优先用 assets/awakener 的 120px 头像（比 96px 的 avatars 清楚一档）
    try:
        gd = json.load(open(os.path.join(ROOT, 'idle/public/data/game-data.json'), encoding='utf-8'))['awakeners']
        for a in gd:
            q = 'assets/awakener/%s.webp' % a['slug']
            if os.path.exists(os.path.join(ROOT, q)):
                src_by_name[a['zh']] = q
    except Exception as ex:
        print('读不到 game-data，沿用 avatars：', ex)
    # 联名嘉宾（十位 B 站主播）：头像不在 avatars.json 里，取幸存者那份 120px 方图
    try:
        for c in read_json('data/survivors-extra.json')['chars']:
            if c.get('n') and c.get('face') and c['n'] not in src_by_name:
                src_by_name[c['n']] = c['face']
    except Exception as ex:
        print('读不到主播名单：', ex)
    # 融灾禁区的 NPC：头像早就在 assets/monster/ 里（160px），
    # 清单由 scripts/build_duel_npcs.py 从 dictionary.json 整理成 data/duel-npcs.json
    try:
        for r in read_json('data/duel-npcs.json')['npcs']:
            if r.get('n') and r.get('img') and r['n'] not in src_by_name:
                src_by_name[r['n']] = r['img']
    except Exception as ex:
        print('读不到 NPC 档案（先跑 scripts/build_duel_npcs.py）：', ex)
    # 剧情角色（灰机 wiki「剧情角色-XXX头像」）：128px webp 在 assets/duel/story/，
    # 清单由 H:/work/tmp/fetch_npc_faces.py 抓成 data/duel-story-npcs.json
    try:
        for r in read_json('data/duel-story-npcs.json')['npcs']:
            if r.get('n') and r.get('src') and r['n'] not in src_by_name:
                src_by_name[r['n']] = r['src']
    except Exception as ex:
        print('读不到剧情角色名单：', ex)

    # 需要头像的名字：全部怪兽 + 觉醒体（觉醒体借用第一只素材的脸）
    names = []
    for c in cards['monsters']:
        key = c.get('art') or c['n']
        if key not in names:
            names.append(key)
    for c in cards['extras']:
        ref = c.get('art') or (c.get('mat') or [None])[0]
        if c['id'] == 'e12':
            ref = c['n']
        if ref and ref not in names:
            names.append(ref)
    # 造物那批（bp16）的魔法 / 陷阱各有自己的道具图标，键写成 creation:Icon_Creation_001。
    # 没写 art 的魔陷还是共用 @spell / @trap 两枚符号格。
    for group in ('spells', 'traps'):
        for c in cards[group]:
            key = c.get('art')
            if key and key not in names:
                names.append(key)
    # 画出来的符号格排在最后：魔法 / 陷阱各一枚统一图标，神王两只是黑影
    for k in SPECIAL:
        if k not in names:
            names.append(k)
    # 卡包里会出现、但没做成怪兽的彩蛋卡（校猫）也留一格
    cat_q = 'assets/avatars-q/story-莱特.webp'

    # 两张牌在官方立绘里没有成品头像：N 与威廉只有 Q 版
    fallback_q = {
        'N': 'assets/avatars-q/char-n.webp',
        '威廉': 'assets/avatars-q/char-william.webp',
    }

    files = []
    missing = []
    for n in names:
        if n in SPECIAL:
            files.append(None)
            continue
        if n.startswith('creation:'):
            p = os.path.join(ROOT, 'assets/creation', n.split(':', 1)[1] + '.webp')
        elif n == '弥萨格校猫':
            p = os.path.join(ROOT, cat_q)
        elif n in fallback_q:
            p = os.path.join(ROOT, fallback_q[n])
        else:
            src = src_by_name.get(n)
            p = os.path.join(ROOT, src) if src else None
        if not p or not os.path.exists(p):
            missing.append(n)
            files.append(None)
        else:
            files.append(p)
    if missing:
        print('缺少头像：' + '、'.join(missing))
        if len(missing) > len(names) // 2:
            print('缺太多，先补素材')
            return 1

    rows = (len(files) + COLS - 1) // COLS
    sheet = Image.new('RGB', (COLS * CELL, rows * CELL), (14, 17, 25))
    index = {}
    for i, p in enumerate(files):
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        if names[i] in SPECIAL:
            sheet.paste(SPECIAL[names[i]](), (x, y))
            index[names[i]] = i
            continue
        if not p:
            continue
        im = Image.open(p).convert('RGB').resize((CELL, CELL), Image.LANCZOS)
        im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))
        sheet.paste(im, (x, y))
        index[names[i]] = i

    out_dir = os.path.join(ROOT, 'assets/duel')
    os.makedirs(out_dir, exist_ok=True)
    sheet_path = os.path.join(out_dir, 'faces.webp')
    # 质量 78：218 格时 84 会到 958KB，整张图集是内联进 js/duel/gen.js 的，
    # 直接算进首屏体积。78 肉眼几乎看不出差别，掉到 800KB 以下。
    sheet.save(sheet_path, 'WEBP', quality=78, method=6)

    # ---------------------------------------------------------------- 卡背
    # 深蓝底 + 金色命轮：外环、内环、四道界域色的弧光。132×188 是 2:3 不到一点，
    # 和卡面比例一致（卡面用 CSS 的 3/4 也行，这里只当归档与「盖牌」用）。
    W, H = 132, 188
    back = Image.new('RGB', (W, H), (13, 17, 28))
    d = ImageDraw.Draw(back, 'RGBA')
    for i in range(28):
        v = 12 - i * 0.35
        d.rectangle([0, i, W, i], fill=(int(18 + v), int(22 + v), int(36 + v), 255))
    cx, cy, r = W // 2, H // 2 - 6, 42
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(227, 179, 65, 210), width=3)
    d.ellipse([cx - r + 9, cy - r + 9, cx + r - 9, cy + r - 9], outline=(227, 179, 65, 90), width=1)
    for i, col in enumerate([(232, 101, 111), (217, 139, 106), (91, 155, 213), (227, 179, 65)]):
        a = -90 + i * 90
        d.arc([cx - r, cy - r, cx + r, cy + r], a + 4, a + 82, fill=col + (235,), width=4)
    d.line([cx, cy - 16, cx + 13, cy, cx, cy + 16, cx - 13, cy, cx, cy - 16],
           fill=(227, 179, 65, 230), width=2)
    d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], fill=(227, 179, 65, 255))
    back.save(os.path.join(out_dir, 'back.webp'), 'WEBP', quality=86, method=6)

    # ------------------------------------------------------------ 首页图标
    # 80×80：同一套命轮，缩到图标尺寸不能有太细的线，所以线宽加粗、去掉内环。
    S = 80
    icon = Image.new('RGB', (S, S), (12, 16, 26))
    di = ImageDraw.Draw(icon, 'RGBA')
    for i in range(S):
        t = i / S
        di.line([(0, i), (S, i)], fill=(int(14 + 12 * t), int(18 + 14 * t), int(30 + 20 * t), 255))
    c = S // 2
    rad = 28
    di.ellipse([c - rad, c - rad, c + rad, c + rad], outline=(227, 179, 65, 255), width=4)
    for i, col in enumerate([(232, 101, 111), (217, 139, 106), (91, 155, 213), (227, 179, 65)]):
        a = -90 + i * 90
        di.arc([c - rad, c - rad, c + rad, c + rad], a + 6, a + 80, fill=col + (255,), width=6)
    di.line([c, c - 11, c + 9, c, c, c + 11, c - 9, c, c, c - 11], fill=(255, 226, 150, 255), width=3)
    di.ellipse([c - 2, c - 2, c + 2, c + 2], fill=(255, 240, 200, 255))
    icon_path = os.path.join(ROOT, 'assets/ui/gameicons/duel.webp')
    icon.save(icon_path, 'WEBP', quality=90, method=6)

    out_meta = {
        'cell': CELL, 'cols': COLS, 'rows': rows,
        'w': COLS * CELL, 'h': rows * CELL,
        'index': index,
    }
    with open(os.path.join(ROOT, 'data/duel-art.json'), 'w', encoding='utf-8') as f:
        json.dump(out_meta, f, ensure_ascii=False, separators=(',', ':'))

    kb = os.path.getsize(sheet_path) / 1024
    print('图集 %d 张 → %dx%d，%.0fKB；卡背 %.0fKB；图标 %.0fKB'
          % (len(index), COLS * CELL, rows * CELL, kb,
             os.path.getsize(os.path.join(out_dir, 'back.webp')) / 1024,
             os.path.getsize(icon_path) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
