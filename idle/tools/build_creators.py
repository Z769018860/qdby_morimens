# 彩蛋角色（联名主播）的头像与立绘。
#
# 游戏里没有现成的真人素材，也不能随便抓别人的头像，所以默认用「姓名符印」画一张风格统一的卡图：
# 界域色光晕 + 一枚篆刻感的首字 + 底部身份条。有授权素材时直接传源图覆盖：
#
#   python tools/build_creators.py --portrait samo=D:/pic/samo.png --card samo=D:/pic/samo-card.png
#   python tools/build_creators.py --only samo          # 只重做一个人
#
# 输出：
#   public/img/awk/<slug>.webp    120×120   唤醒体列表 / 战斗单位头像
#   public/img/card/<slug>.webp   240×600   详情页立绘
#
# 注意：改了 src/core/creators.js 里的中文名 / 主色，这里也要跟着改（表在下方 CAST）。
import os
import sys
import math

try:
    from PIL import Image, ImageDraw, ImageFont, ImageFilter
except ImportError:
    sys.exit('需要 Pillow：pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AWK_DIR = os.path.join(ROOT, 'public', 'img', 'awk')
CARD_DIR = os.path.join(ROOT, 'public', 'img', 'card')

FONT_BOLD = 'C:/Windows/Fonts/msyhbd.ttc'
FONT_REG = 'C:/Windows/Fonts/msyh.ttc'

# slug, 名字, 首字符印, 主色, 副色, 界域中文
CAST = [
    ('samo',     '萨摩不耶',   '萨', (232, 220, 200), (150, 196, 214), '混沌'),
    ('mengyi',   '梦依流苏',   '苏', (185, 167, 224), (236, 210, 232), '深海'),
    ('alice',    '爱丽丝',     '爱', (127, 184, 232), (232, 180, 220), '超维'),
    ('ratking',  '鼠王',       '鼠', (141, 123, 106), (196, 174, 96), '血肉'),
    ('dragond',  '魔龙_D',     '龙', (217, 79, 61),   (240, 168, 72),  '混沌'),
    ('zerok',    '立誓0氪',    '零', (201, 180, 88),  (156, 196, 160), '血肉'),
    ('xiamolin', '夏茉琳',     '茉', (142, 201, 164), (214, 232, 196), '深海'),
    ('chaoxing', '朝星',       '星', (143, 168, 255), (226, 232, 255), '超维'),
    ('maodie',   '路过的耄耋', '耄', (169, 162, 154), (214, 206, 196), '血肉'),
]


def font(path, size):
    return ImageFont.truetype(path, size)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def vertical_gradient(size, top, bottom, gamma=1.0):
    """从上到下的线性渐变（逐行画，比逐像素快得多）"""
    w, h = size
    img = Image.new('RGB', (1, h))
    px = img.load()
    for y in range(h):
        t = (y / max(1, h - 1)) ** gamma
        px[0, y] = lerp(top, bottom, t)
    return img.resize((w, h), Image.BILINEAR)


def glow(size, draw_fn, color, blur, gain=1.0):
    """把 draw_fn 画到一张透明层上，模糊后叠回去 = 发光"""
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    layer = layer.filter(ImageFilter.GaussianBlur(blur))
    if gain != 1.0:
        r, g, b, a = layer.split()
        a = a.point(lambda x: min(255, int(x * gain)))
        layer = Image.merge('RGBA', (r, g, b, a))
    return layer


def ring(d, box, color, width):
    d.arc(box, 0, 360, fill=color, width=width)


def sigil(size, ch, color, fpath, fsize, dy=0.0):
    """首字符印：先画白芯，再压一层主色描边"""
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    f = font(fpath, fsize)
    bbox = d.textbbox((0, 0), ch, font=f)
    x = (size[0] - (bbox[2] - bbox[0])) / 2 - bbox[0]
    y = (size[1] - (bbox[3] - bbox[1])) / 2 - bbox[1] + size[1] * dy
    # 描边
    for dx, dy2 in ((-2, 0), (2, 0), (0, -2), (0, 2)):
        d.text((x + dx, y + dy2), ch, font=f, fill=color + (150,))
    d.text((x, y), ch, font=f, fill=(255, 255, 255, 245))
    return layer


def corner_marks(d, size, color, inset=8, length=18):
    w, h = size
    for (x, y, sx, sy) in ((inset, inset, 1, 1), (w - inset, inset, -1, 1), (inset, h - inset, 1, -1), (w - inset, h - inset, -1, -1)):
        d.line([(x, y), (x + length * sx, y)], fill=color + (110,), width=1)
        d.line([(x, y), (x, y + length * sy)], fill=color + (110,), width=1)


def make_portrait(slug, name, ch, color, color2, src=None):
    S = 120
    if src:
        im = Image.open(src).convert('RGBA')
        b = im.getbbox()
        if b:
            im = im.crop(b)
        sc = min((S - 8) / im.width, (S - 8) / im.height)
        im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS)
        out = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        out.alpha_composite(im, ((S - im.width) // 2, (S - im.height) // 2))
    else:
        bg = vertical_gradient((S, S), lerp(color, (10, 10, 14), 0.80), (8, 8, 12), gamma=0.85).convert('RGBA')
        # 主色光晕（左上）
        halo = glow((S, S), lambda d: d.ellipse((-24, -30, 84, 78), fill=color + (110,)), color, 18)
        bg.alpha_composite(halo)
        halo2 = glow((S, S), lambda d: d.ellipse((60, 54, 150, 144), fill=color2 + (70,)), color2, 22)
        bg.alpha_composite(halo2)
        d = ImageDraw.Draw(bg)
        d.ellipse((16, 16, S - 16, S - 16), outline=color + (60,), width=1)
        d.ellipse((22, 22, S - 22, S - 22), outline=color + (30,), width=1)
        # 印章方框
        d.rounded_rectangle((30, 30, S - 30, S - 30), radius=6, outline=color + (120,), width=2)
        bg.alpha_composite(glow((S, S), lambda dd: sigil((S, S), ch, color, FONT_BOLD, 52), color, 7, 0.9))
        bg.alpha_composite(sigil((S, S), ch, color, FONT_BOLD, 52))
        out = bg
    os.makedirs(AWK_DIR, exist_ok=True)
    p = os.path.join(AWK_DIR, f'{slug}.webp')
    out.convert('RGB').save(p, 'WEBP', quality=92, method=6)
    return p


def make_card(slug, name, ch, color, color2, realm, src=None):
    W, H = 240, 600
    if src:
        im = Image.open(src).convert('RGB')
    else:
        im = vertical_gradient((W, H), lerp(color, (26, 22, 30), 0.62), (10, 10, 14), gamma=1.15).convert('RGBA')
        # 顶部大光晕
        im.alpha_composite(glow((W, H), lambda d: d.ellipse((-70, -110, 190, 210), fill=color + (150,)), color, 46, 0.95))
        im.alpha_composite(glow((W, H), lambda d: d.ellipse((120, 300, 320, 520), fill=color2 + (80,)), color2, 60))
        d = ImageDraw.Draw(im)
        # 竖向光柱
        for i in range(3):
            x = 40 + i * 80
            d.line([(x, 0), (x, H)], fill=color + (16,), width=1)
        ring(d, (30, 90, W - 30, W + 30), color + (70,), 2)
        ring(d, (44, 104, W - 44, W + 16), color + (35,), 1)
        # 中央符印
        im.alpha_composite(glow((W, H), lambda dd: sigil((W, H), ch, color, FONT_BOLD, 112, -0.12), color, 22, 1.0))
        im.alpha_composite(sigil((W, H), ch, color, FONT_BOLD, 112, -0.12))
        # 底部署名：竖排名字 + 界域
        f = font(FONT_BOLD, 30)
        fsmall = font(FONT_REG, 15)
        frealm = font(FONT_REG, 14)
        dy = 300
        for c in name.replace('_', ''):
            w = d.textlength(c, font=f)
            y = dy
            d.text(((W - w) / 2, y), c, font=f, fill=(245, 243, 240, 235))
            dy += 36
        d.line([(W / 2 - 26, dy + 10), (W / 2 + 26, dy + 10)], fill=color + (160,), width=1)
        t = realm
        tw = d.textlength(t, font=frealm)
        d.text(((W - tw) / 2, dy + 20), t, font=frealm, fill=lerp(color, (255, 255, 255), 0.45) + (220,))
        t2 = '联名嘉宾'
        t2w = d.textlength(t2, font=fsmall)
        d.text(((W - t2w) / 2, dy + 42), t2, font=fsmall, fill=(170, 168, 172, 210))
        corner_marks(d, (W, H), color, inset=12, length=26)
        # 底部压暗，避免名字被背景吃掉
        shade = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shade)
        for i in range(200):
            a = int(150 * (i / 200) ** 1.4)
            sd.line([(0, H - 200 + i), (W, H - 200 + i)], fill=(6, 6, 10, a))
        im.alpha_composite(shade)
    os.makedirs(CARD_DIR, exist_ok=True)
    p = os.path.join(CARD_DIR, f'{slug}.webp')
    im.convert('RGB').save(p, 'WEBP', quality=90, method=6)
    return p


def main(argv):
    only = None
    portrait_src = {}
    card_src = {}
    for arg in argv:
        if arg.startswith('--only='):
            only = arg.split('=', 1)[1]
        elif arg.startswith('--portrait='):
            k, v = arg[len('--portrait='):].split('=', 1)
            portrait_src[k] = v
        elif arg.startswith('--card='):
            k, v = arg[len('--card='):].split('=', 1)
            card_src[k] = v
    n = 0
    for slug, name, ch, color, color2, realm in CAST:
        if only and slug != only:
            continue
        a = make_portrait(slug, name, ch, color, color2, portrait_src.get(slug))
        b = make_card(slug, name, ch, color, color2, realm, card_src.get(slug))
        print(f'{slug:9s} {a} {os.path.getsize(a):>6d}B   {b} {os.path.getsize(b):>7d}B')
        n += 1
    print(f'完成 {n} 位')


if __name__ == '__main__':
    main(sys.argv[1:])
