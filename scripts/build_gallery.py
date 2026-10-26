#!/usr/bin/env python3
"""把灰机 wiki 的 CG 抓成「典藏馆」。

来源: morimens.huijiwiki.com 的 CG 文件命名空间（文件均以 CG 开头，md5 前缀路径可推算），
一律取自 huiji-public.huijistatic.com 原图，本地缩到 900px 宽 webp。

用法: python3 scripts/build_gallery.py [--limit N] [--width 900] [--quality 72]
输出: assets/gallery/*.webp + data/gallery.json
"""
import argparse, hashlib, json, os, re, sys
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
import urllib.request

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets/gallery'
CDN = 'https://huiji-public.huijistatic.com/morimens/uploads'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36'}

ap = argparse.ArgumentParser()
ap.add_argument('--limit', type=int, default=0)
ap.add_argument('--width', type=int, default=900)
ap.add_argument('--quality', type=int, default=72)
args = ap.parse_args()

# ---------------------------------------------------------------- 候选文件清单
def rng(a, b):
    return list(range(a, b + 1))

names = []
def add(*xs):
    names.extend(xs)

# 动态 CG（多维连接 / 异梦视界）
for n in ('001', '002', '004', '005', '009', '010', '011'):
    add(*[f'CGDynamic_C01_{n}_{k}.png' for k in 'ABC'])
# 主线 / 角色剧情
add(*[f'CG_C00_{n}.png' for n in ('001', '004') + tuple(f'{i:03d}' for i in range(7, 15))])
add(*[f'CG_C01_{n:03d}.png' for n in rng(1, 4)])
add(*[f'CG_C02_{n:03d}.png' for n in rng(1, 6)])
add(*[f'CG_C03_{n:03d}.png' for n in rng(1, 7)])
add(*[f'CG_C04_{n:03d}.png' for n in rng(1, 9)])
add(*[f'CG_C05_{n:03d}.png' for n in rng(2, 6)])
add(*[f'CG_C06_{n:03d}.png' for n in rng(1, 12)] + ['CG_C06_015.png', 'CG_C06_017.png', 'CG_C06_018.png'])
add('CG_C07_001.png', *[f'CG_C07_{i:03d}.png' for i in range(4, 23)])
add(*[f'CG_C08_{n:03d}.png' for n in rng(1, 13)])
c09 = ['001', '002', '003']
for n in ('004', '005', '006', '011'):
    c09 += [f'{n}_1_F', f'{n}_1_M', f'{n}_F', f'{n}_M']
c09 += [f'{i:03d}' for i in (7, 8, 9, 10, 12, 13, 14, 15, 16, 17)]
add(*[f'CG_C09_{n}.png' for n in c09])
# 特遣记录
for ch, mx in (('201', 10), ('202', 15), ('203', 10), ('204', 13), ('205', 17), ('206', 14)):
    add(*[f'CG_C{ch}_{i:03d}.png' for i in rng(1, mx)])
add('CG_C203_0022.png', 'CG_C203_0062.png')
# 典藏馆
add(*[f'CG_Coll_Entry_{i:02d}.png' for i in rng(1, 12)])
# 场景 / 剧情 CG
add(*[f'CG_SD_L_B02_{n}.png' for n in ('1', '2', '3', '4', '6', '7_A', '7_B', '7_C', '8')])
add(*[f'CG_SD_L_B04_{n}.png' for n in rng(1, 4)])
add(*[f'CG_SD_L_B05EX_{n}.png' for n in rng(1, 8)])
add(*[f'CG_SD_L_C10_{n}.png' for n in rng(1, 7)])
add(*[f'CG_SD_L_D02_{n}.png' for n in rng(1, 4)])
d06 = [str(i) for i in list(range(1, 19))]
add(*[f'CG_SD_L_D06_{n}.png' for n in d06])
add('CG_SD_L_D06_3-2.png', 'CG_SD_L_D06_3-3.png', 'CG_SD_L_D06_4-1.png', 'CG_SD_L_D06_5-1.png',
    'CG_SD_L_D06_7-1.png', 'CG_SD_L_D06_7-2.png', 'CG_SD_L_D06_7-3.png', 'CG_SD_L_D06_7-4.png',
    'CG_SD_L_D06_7-5.png')
add('CG_SD_L_D11_1.png', 'CG_SD_L_D14_1.png')
add(*[f'CG_SD_L_FarewellNeverland_{n}.png' for n in rng(1, 3)])
add(*[f'CG_SD_L_O07_{n}.png' for n in rng(1, 12)])
add(*[f'CG_SD_L_O10_{n}.png' for n in rng(1, 3)])
add(*[f'CG_SD_L_SF1_0{n}.png' for n in rng(1, 3)])
add('CG_SD_MyTurn_01.png', 'CG_SD_S_Fool.png')
add(*[f'CG_SD_S_B06_{n}.png' for n in rng(1, 2)])
add(*[f'CG_SD_S_B07_{n}.png' for n in rng(1, 4)])
add('CG_SD_S_B12_1.png')
add(*[f'CG_SD_S_B14_{n}.png' for n in rng(1, 4)])
add(*[f'CG_SD_S_B15_{n:02d}.png' for n in rng(1, 12)])
add(*[f'CG_SD_S_C01EX_{n}.png' for n in rng(1, 14)])
add(*[f'CG_SD_S_C02EX_{n}.png' for n in (10, 7, 8, 9)])
add(*[f'CG_SD_S_C03EX_{n}.png' for n in rng(1, 4)])
add(*[f'CG_SD_S_C03_{n}.png' for n in rng(1, 2)])
add(*[f'CG_SD_S_C04EX_{n}.png' for n in rng(1, 4)])
add(*[f'CG_SD_S_C05_{n}.png' for n in rng(1, 9)])
add(*[f'CG_SD_S_C06_{n}.png' for n in list(range(1, 12)) + [14, 15, 16, 17]])
add(*[f'CG_SD_S_C16_{n}.png' for n in rng(1, 2)])
add('CG_SD_S_C17_01.png', 'CG_SD_S_C17_01_2.png', 'CG_SD_S_C17_01_3.png', 'CG_SD_S_C17_01_4.png',
    'CG_SD_S_C17_02.png', 'CG_SD_S_C17_02_2.png')
add(*[f'CG_SD_S_C20_{n}.png' for n in rng(1, 3)])
add('CG_SD_S_D01_1.png')
add(*[f'CG_SD_S_D04_{n}.png' for n in rng(1, 4)])
add(*[f'CG_SD_S_D08_{n}.png' for n in rng(1, 5)])
add(*[f'CG_SD_S_O01_{n}.png' for n in rng(1, 6)])
add(*[f'CG_SD_S_O05_{n}.png' for n in rng(1, 2)])
add(*[f'CG_SD_S_O06_{n}.png' for n in (1, 2, 3, 4, 6, 7, 8, 9)])
add(*[f'CG_SD_S_O08_{n}.png' for n in rng(1, 2)])
add(*[f'CG_SD_S_O11_{n:02d}.png' for n in rng(1, 2)])
add(*[f'CG_SD_S_O13_{n}.png' for n in rng(2, 8)])
add('CG_SD_S_WB2_1.png', 'CG_SD_S_WB2_1_2.png', 'CG_SD_S_WB2_2.png', 'CG_SD_S_WB2_2_2.png',
    'CG_SD_S_WB2_3.png')
add('CG_v23_01.png')

names = list(dict.fromkeys(names))
if args.limit:
    names = names[:args.limit]

# ---------------------------------------------------------------- 角色代码
CHAR = {
    'B01': '泰旖丝', 'B02': '萨尔瓦多', 'B03': '艾继丝', 'B04': '索蕾尔', 'B05': '希洛',
    'B05EX': '血链·希洛', 'B06': '阿格里帕', 'B07': '尤乌哈希', 'B08': '雷娅', 'B09': '菲茵特',
    'B10': '杜勒赛因', 'B11': '卡拉布', 'B12': '皮克曼', 'B14': '徐', 'B15': '沙耶',
    'C01': '拉蒙娜', 'C01EX': '环行·拉蒙娜', 'C02': '朵尔', 'C02EX': '熔毁·朵尔', 'C03': '奥吉尔',
    'C03EX': '负誓·奥吉尔', 'C04': '萝坦', 'C04EX': '蚀灭·萝坦', 'C05': '莱克', 'C06': '「24」',
    'C07': '诺缔拉', 'C08': '宁菲亚', 'C09': '潘狄娅', 'C10': '莉莉', 'C11': '艾尔瓦', 'C12': '珈伦',
    'C15': '塔薇', 'C16': '凯蒂古拉', 'C17': '茉夏', 'C20': '薇薇安', 'D01': '莉兹', 'D02': '达芙黛尔',
    'D03': '汀克特', 'D04': '旺达', 'D05': '温柯尔', 'D06': '奥尔拉', 'D07': '詹金', 'D08': '艾瑞卡',
    'D09': '卡茜亚', 'D10': '阿拉克涅', 'D11': '卡斯托尔', 'D12': '哈姆林', 'D13': '克莱门汀',
    'D14': '波吕克斯', 'O01': '图鲁', 'O02': '墨菲', 'O02EX': '诞妄·墨菲', 'O03': '法洛思',
    'O04': '凯刻斯', 'O05': '奥瑞塔', 'O06': '戈利亚', 'O07': '弥利亚姆', 'O08': '珊', 'O09': '希莱斯特',
    'O10': '克珀珊特', 'O11': '莫丝', 'O13': '庞托斯', 'C00': '序章',
}
GROUPS = [
    ('hall', '典藏馆', 'Gallery'),
    ('story', '主线剧情', 'Main Story'),
    ('record', '特遣记录', 'Special Records'),
    ('dyn', '动态绘卷', 'Dynamic Art'),
    ('scene', '场景 CG', 'Scene CG'),
    ('misc', '其他', 'Others'),
]

def classify(n):
    code = None
    m = re.match(r'CG_([BCOD]\d{2}(?:EX)?)_', n)
    if n.startswith('CGDynamic_'):
        g, code = 'dyn', m.group(1) if m else None
    elif n.startswith('CG_Coll_Entry'):
        g = 'hall'
    elif re.match(r'CG_C20\d_', n):
        g, code = 'record', None
    elif re.match(r'CG_C\d\d_', n):
        c = re.match(r'CG_(C\d\d)_', n).group(1)
        g, code = 'story', c
    elif n.startswith('CG_SD_'):
        g, code = 'scene', m.group(1) if m else None
    else:
        g = 'misc'
    return g, code

def url_of(n):
    h = hashlib.md5(n.encode()).hexdigest()
    return f'{CDN}/{h[0]}/{h[:2]}/{n}'

def fetch(n):
    import subprocess, tempfile
    g0, _ = classify(n)
    pre = OUT / (n[:-4].lower().replace('_', '-') + '.webp')
    if pre.exists():
        im = Image.open(pre).convert('RGB')
        w, h = im.size
        cid = pre.stem
        zh0 = CHAR.get(_ or '')
        num0 = re.sub(r'^CG_?(Dynamic)?_?', '', n[:-4]).replace('_', ' ')
        if g0 == 'hall':
            ent = num0.split('Entry')[-1].strip()
            lab, elab = f'典藏馆 · Entry {ent}', f'Gallery · Entry {ent}'
        elif g0 == 'dyn':
            lab, elab = f'动态绘卷 · {num0}', f'Dynamic · {num0}'
        elif g0 == 'record':
            lab, elab = f'特遣记录 · {num0}', f'Records · {num0}'
        elif zh0:
            lab, elab = f'{zh0} · {num0}', f'{zh0} · {num0}'
        else:
            lab, elab = f'场景 · {num0}', f'Scene · {num0}'
        return {'id': cid, 'n': n, 'f': f'assets/gallery/{cid}.webp', 'g': g0, 'ch': _ or '',
                'w': w, 'h': h, 't': lab, 'e': elab}
    fd, tmp = tempfile.mkstemp(suffix='.img')
    os.close(fd)
    try:
        r = subprocess.run(
            ['curl', '-sS', '--max-time', '90', '-A', UA['User-Agent'],
             '-H', 'Referer: https://morimens.huijiwiki.com/', '-o', tmp, url_of(n)],
            capture_output=True)
        if r.returncode != 0 or os.path.getsize(tmp) < 1024:
            return None
        im = Image.open(tmp).convert('RGB')
    except Exception:
        return None
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass
    w, h = im.size
    if w > args.width:
        im = im.resize((args.width, round(h * args.width / w)), Image.LANCZOS)
    g, code = classify(n)
    cid = n[:-4].lower().replace('_', '-')
    OUT.mkdir(parents=True, exist_ok=True)
    im.save(OUT / f'{cid}.webp', 'WEBP', quality=args.quality, method=4)
    zh = CHAR.get(code or '')
    num = re.sub(r'^CG_?(Dynamic)?_?', '', n[:-4]).replace('_', ' ')
    if g == 'hall':
        ent = num.split('Entry')[-1].strip()
        label, elabel = f'典藏馆 · Entry {ent}', f'Gallery · Entry {ent}'
    elif g == 'dyn':
        label, elabel = f'动态绘卷 · {num}', f'Dynamic · {num}'
    elif g == 'record':
        label, elabel = f'特遣记录 · {num}', f'Records · {num}'
    elif zh:
        label, elabel = f'{zh} · {num}', f'{zh} · {num}'
    else:
        label, elabel = f'场景 · {num}', f'Scene · {num}'
    return {'id': cid, 'n': n, 'f': f'assets/gallery/{cid}.webp', 'g': g, 'ch': code or '',
            'w': im.size[0], 'h': im.size[1], 't': label, 'e': elabel}

OUT.mkdir(parents=True, exist_ok=True)
items, failed = [], []
with ThreadPoolExecutor(max_workers=8) as ex:
    for n, r in zip(names, ex.map(fetch, names)):
        if r:
            items.append(r)
        else:
            failed.append(n)

order = {g: i for i, (g, _, _) in enumerate(GROUPS)}
items.sort(key=lambda x: (order.get(x['g'], 9), x['ch'], x['id']))
data = {
    'source': '忘却前夜中文维基（灰机 wiki）CG 文件命名空间',
    'license': 'CC BY-NC-SA 4.0；游戏素材版权归 Qookka Games 所有',
    'site': 'https://morimens.huijiwiki.com/wiki/CG%E5%A3%81%E7%BA%B8',
    'groups': [{'k': k, 'zh': zh, 'en': en, 'n': sum(1 for i in items if i['g'] == k)} for k, zh, en in GROUPS],
    'count': len(items),
    'items': items,
}
(ROOT / 'data/gallery.json').write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding='utf-8')
print(f'ok {len(items)} / try {len(names)}; failed {len(failed)}')
print(' ', ' '.join(failed[:12]))
