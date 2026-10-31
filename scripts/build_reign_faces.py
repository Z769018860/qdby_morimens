#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把「弥萨格王权」用到的 72 张卡面做出来，压成 webp 后写进 data/reign-faces.json。

为什么要在构建前先裁：assets/card/*.webp 是 240×600 的全身立绘，一张 20~40KB，
七十多张直接内联就是 2MB 进首屏。卡面只用得到头部到胸口那一段，裁成
240×330 再缩到 176×242、q=76，一张 5~8KB，全表 720KB 左右。

两种来源：
  card —— assets/card/<slug>.webp（240×600 立绘，裁顶部 240×330）
  head —— 主播的 B 站头像（120×120）与校猫的 Q 版头（96×96），方图，
          垫一层自身的模糊放大版当底，中间放原图，看起来像一张「头像卡」

产出由 scripts/build.mjs 的 genReign() 读成 js/reign/art.js 里的 data URI 表。
改角色名单请同时改下面 CHARS 和 js/reign/data.js 的 CHARS。

用法：python scripts/build_reign_faces.py
"""
import base64
import io
import json
import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_JSON = os.path.join(ROOT, 'data', 'reign-faces.json')

# key（= js/reign/data.js 里的角色 key）, 源图, 类型
CHARS = [
    ('24', 'assets/card/mason.webp', 'card'),
    ('catigula', 'assets/card/kathigu-ra.webp', 'card'),
    ('lotan', 'assets/card/lotan.webp', 'card'),
    ('pandia', 'assets/card/pandia.webp', 'card'),
    ('karen', 'assets/card/karen.webp', 'card'),
    ('tawil', 'assets/card/tawil.webp', 'card'),
    ('alva', 'assets/card/alva.webp', 'card'),
    ('agrippa', 'assets/card/agrippa.webp', 'card'),
    ('doresain', 'assets/card/doresain.webp', 'card'),
    ('catena', 'assets/card/helot-catena.webp', 'card'),
    ('pickman', 'assets/card/pickman.webp', 'card'),
    ('leigh', 'assets/card/leigh.webp', 'card'),
    ('aurita', 'assets/card/aurita.webp', 'card'),
    ('murphy', 'assets/card/murphy-fauxborn.webp', 'card'),
    ('corposant', 'assets/card/corposant.webp', 'card'),
    ('erica', 'assets/card/erica.webp', 'card'),
    ('castor', 'assets/card/castor.webp', 'card'),
    ('pollux', 'assets/card/pollux.webp', 'card'),
    ('daffodil', 'assets/card/daffodil.webp', 'card'),
    ('jenkin', 'assets/card/jenkin.webp', 'card'),
    ('nautila', 'assets/card/nautila.webp', 'card'),
    ('helot', 'assets/card/helot.webp', 'card'),
    ('miryam', 'assets/card/miryam.webp', 'card'),
    ('sorel', 'assets/card/sorel.webp', 'card'),
    ('xu', 'assets/card/xu.webp', 'card'),
    ('lily', 'assets/card/lily.webp', 'card'),
    ('horla', 'assets/card/horla.webp', 'card'),
    ('ryker', 'assets/card/ryker.webp', 'card'),
    ('aigis', 'assets/card/aigis.webp', 'card'),
    ('caecus', 'assets/card/caecus.webp', 'card'),
    ('casiah', 'assets/card/casiah.webp', 'card'),
    ('celeste', 'assets/card/celeste.webp', 'card'),
    ('clementine', 'assets/card/clementine.webp', 'card'),
    ('doll', 'assets/card/doll.webp', 'card'),
    ('doll-inferno', 'assets/card/doll-inferno.webp', 'card'),
    ('faint', 'assets/card/faint.webp', 'card'),
    ('faros', 'assets/card/faros.webp', 'card'),
    ('goliath', 'assets/card/goliath.webp', 'card'),
    ('hameln', 'assets/card/hameln.webp', 'card'),
    ('liz', 'assets/card/liz.webp', 'card'),
    ('mouchette', 'assets/card/mouchette.webp', 'card'),
    ('murphy-plain', 'assets/card/murphy.webp', 'card'),
    ('nymphaea', 'assets/card/nymphaea.webp', 'card'),
    ('ogier', 'assets/card/ogier.webp', 'card'),
    ('ramona', 'assets/card/ramona.webp', 'card'),
    ('ramona-ring', 'assets/card/ramona-timeworn.webp', 'card'),
    ('salvador', 'assets/card/salvador.webp', 'card'),
    ('sanga', 'assets/card/sanga.webp', 'card'),
    ('thais', 'assets/card/thais.webp', 'card'),
    ('tinct', 'assets/card/tinct.webp', 'card'),
    ('tulu', 'assets/card/tulu.webp', 'card'),
    ('uvhash', 'assets/card/uvhash.webp', 'card'),
    ('wanda', 'assets/card/wanda.webp', 'card'),
    ('winkle', 'assets/card/winkle.webp', 'card'),
    ('vortice', 'assets/card/vortice.webp', 'card'),
    ('arachne', 'assets/card/arachne.webp', 'card'),
    ('saya', 'assets/card/saya.webp', 'card'),
    ('pontos', 'assets/card/pontos.webp', 'card'),
    ('lotan-etched', 'assets/card/lotan-cetarchon.webp', 'card'),
    ('caraboo', 'assets/card/caraboo.webp', 'card'),
    ('ogier-oath', 'assets/card/ogier-oathbound.webp', 'card'),
    ('vivian', 'assets/card/vivian.webp', 'card'),
    # 九位 B 站主播：头像就是他们本人的空间头像（120×120）
    ('up-samo', 'assets/survivors/faces/samo.webp', 'head'),
    ('up-myls', 'assets/survivors/faces/mengyi.webp', 'head'),
    ('up-alice', 'assets/survivors/faces/alice.webp', 'head'),
    ('up-ratking', 'assets/survivors/faces/ratking.webp', 'head'),
    ('up-dragond', 'assets/survivors/faces/dragond.webp', 'head'),
    ('up-zerok', 'assets/survivors/faces/zerok.webp', 'head'),
    ('up-moreen', 'assets/survivors/faces/xiamolin.webp', 'head'),
    ('up-chaoxing', 'assets/survivors/faces/chaoxing.webp', 'head'),
    ('up-maodie', 'assets/survivors/faces/maodie.webp', 'head'),
    # 校猫没有立绘，只有 96×96 的 Q 版头
    ('cat', 'assets/avatars-q/story-莱特.webp', 'head'),
]

# 首页九宫格图标：Q 版女守密人（detective 用的是男守密人，不重复）。
# 这张图代表的是「坐在桌子后面那个位置」——这一局坐上去的是你。
ICON_SRC = 'assets/avatars-q/char-keeperf.webp'
ICON_OUT = 'assets/ui/gameicons/reign.webp'

# 裁切窗口：立绘 240×600，人物头部基本落在顶部 330px 内（72 张联系表核过）
CROP = (0, 0, 240, 330)
SIZE = (176, 242)
Q = 76
HEAD_Q = 80


def card_face(im):
    return im.convert('RGB').crop(CROP).resize(SIZE, Image.LANCZOS)


def head_face(im):
    """方图头像：垫一层自身的模糊放大版，中间放原图，别留一圈死黑。"""
    im = im.convert('RGB')
    w, h = SIZE
    back = im.resize(SIZE, Image.LANCZOS).filter(ImageFilter.GaussianBlur(7))
    back = Image.blend(back, Image.new('RGB', SIZE, (14, 12, 18)), 0.55)
    side = min(w, h)
    back.paste(im.resize((side, side), Image.LANCZOS), ((w - side) // 2, (h - side) // 2))
    return back


def main():
    out = {}
    total = 0
    missing = []
    for key, src, kind in CHARS:
        path = os.path.join(ROOT, src.replace('/', os.sep))
        if not os.path.exists(path):
            missing.append(key + '(' + src + ')')
            continue
        im = Image.open(path)
        face = head_face(im) if kind == 'head' else card_face(im)
        # 不落盘：这台机器的删除被回收站垫片接管，中间文件只会堆在磁盘上
        buf = io.BytesIO()
        face.save(buf, 'WEBP', quality=HEAD_Q if kind == 'head' else Q, method=6)
        data = buf.getvalue()
        total += len(data)
        out[key] = 'data:image/webp;base64,' + base64.b64encode(data).decode('ascii')

    if missing:
        print('缺少素材：' + '、'.join(missing), file=sys.stderr)

    with open(OUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)

    # 九宫格图标（80×80，和其它九个同一规格）
    icon = Image.open(os.path.join(ROOT, ICON_SRC.replace('/', os.sep))).convert('RGBA')
    icon.resize((80, 80), Image.LANCZOS).save(os.path.join(ROOT, ICON_OUT.replace('/', os.sep)),
                                              'WEBP', quality=90, method=6)

    print('卡面 %d 张 / 原始 %dKB → data/reign-faces.json %dKB' % (
        len(out), round(total / 1024), round(os.path.getsize(OUT_JSON) / 1024)))


if __name__ == '__main__':
    main()
