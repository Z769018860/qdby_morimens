# -*- coding: utf-8 -*-
"""把大巴扎要用到的原图压成一套小副本，放进 assets/bazaar/。

为什么要压：一局要用一百来张图（造物/命轮/密契/怪物/英雄），
`scripts/build_bazaar_art.mjs` 会把它们全部内联成 data URI，
原件那套 396KB → base64 535KB，压过之后 292KB → base64 388KB。
EdgeOne 每个请求固定 1~2 秒，页面只该发一个脚本请求，所以体积也得省。

用法：
    python scripts/build_bazaar_shots.py            # 只补缺的
    python scripts/build_bazaar_shots.py --all      # 全部重压（换图后用这个）

来源与目标长边：
    assets/creation/Icon_Creation_*.webp      → 88
    assets/covenant/Icon_Trinket_*.webp       → 88   （密契用的是「饰品」图标）
    assets/wheel/Weapon_Mini_*.webp           → 64
    assets/monster/Portrait_Small_Monster_*   → 112
    idle/public/img/awk/<slug>.webp           → 112  （唤醒体立绘头像）
    assets/avatars-q/special-*.webp           → 96   （24 在这套里）
备注：素材版权属于《忘却前夜》官方，这里只是同人作品的等比压缩副本。
"""
import os
import re
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'js', 'bazaar-data.js')
OUT = os.path.join(ROOT, 'assets', 'bazaar')
QUALITY = 78

# (目录, 文件名前缀, 目标长边)
SOURCES = [
    ('assets/creation', 'Icon_Creation_', 88),
    ('assets/covenant', 'Icon_Trinket_', 88),
    ('assets/wheel', 'Weapon_Mini_', 64),
    ('assets/monster', 'Portrait_Small_Monster_', 112),
    ('idle/public/img/awk', '', 112),
    ('assets/avatars-q', 'special-', 96),
]

ALL = '--all' in sys.argv


def wanted():
    """从数据表里抠出所有 assets/bazaar/*.webp 的引用（去重、保序）。"""
    src = open(DATA, encoding='utf-8').read()
    names = re.findall(r'assets/bazaar/([\w\-.]+\.webp)', src)
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n)
            out.append(n)
    return out


def find_src(name):
    stem = name[:-5]
    for d, prefix, size in SOURCES:
        if d.endswith('img/awk') and prefix == '':
            path = os.path.join(ROOT, d, stem + '.webp')
            if os.path.exists(path):
                return path, size
            continue
        if prefix and not stem.startswith(prefix):
            continue
        path = os.path.join(ROOT, d, stem + '.webp')
        if os.path.exists(path):
            return path, size
    return None, 0


def main():
    os.makedirs(OUT, exist_ok=True)
    names = wanted()
    made = skipped = missing = 0
    for n in names:
        dst = os.path.join(OUT, n)
        if os.path.exists(dst) and not ALL:
            skipped += 1
            continue
        src, size = find_src(n)
        if not src:
            print('  没找到原件：', n)
            missing += 1
            continue
        im = Image.open(src).convert('RGB')
        w, h = im.size
        k = size / float(max(w, h))
        if k < 1:
            im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)
        made += 1
    total = sum(os.path.getsize(os.path.join(OUT, n)) for n in names
                if os.path.exists(os.path.join(OUT, n)))
    print(f'大巴扎小图：引用 {len(names)} 张，重压 {made}，已有 {skipped}，缺原件 {missing}，合计 {total / 1024:.0f}KB')
    if missing:
        print('缺的那几张要么改名了、要么原作换了目录：先补原件再跑一次 --all。')


if __name__ == '__main__':
    main()
