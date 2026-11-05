#!/usr/bin/env python3
"""生成 data/dadimao-avatars.json：打地猫「从仓库选头像」的目录（唤醒体 / 怪物 / 主播）。
   用法：python scripts/build_dadimao_avatars.py   （素材增删后重跑一次）"""
import json, re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
has = lambda p: os.path.exists(os.path.join(ROOT, p))

awk = [{'n': i['n'], 's': i['src']} for i in J('data/avatars.json')['items'] if i['k'] == 'awakener' and has(i['src'])]

mons, seen = [], set()
for m in J('idle/public/data/game-data.json')['monsters']:
    f = os.path.basename(m.get('img') or '')
    src = 'assets/monster/' + f
    if not f or src in seen or not has(src):
        continue
    seen.add(src)
    mons.append({'n': m['zh'], 's': src})

crt = []
txt = open(os.path.join(ROOT, 'idle/src/core/creators.js'), encoding='utf-8').read()
for slug, zh in re.findall(r"slug: '([a-z0-9]+)', zh: '([^']+)'", txt):
    src = f'idle/public/img/awk/{slug}.webp'
    if has(src):
        crt.append({'n': zh, 's': src})

out = {'_note': '由 scripts/build_dadimao_avatars.py 生成，请勿手改', 'groups': [
    {'k': 'awk', 'n': '唤醒体', 'items': awk},
    {'k': 'mon', 'n': '怪物', 'items': mons},
    {'k': 'crt', 'n': '主播', 'items': crt},
]}
json.dump(out, open(os.path.join(ROOT, 'data/dadimao-avatars.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(awk), len(mons), len(crt))
