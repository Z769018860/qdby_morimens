#!/usr/bin/env python3
"""用灰机 wiki 的「基本资料」补齐唤醒体档案。

数据来源
  data/huiji-awakeners.tsv      —— 由 morimens.huijiwiki.com 的问询接口（SMW ask）导出
  qc_sparse/data/morimens/huiji/zh-CN.json —— 灰机人物页语音（抓取自 MediaWiki API）
写入 data/dictionary.json 的 awakener 条目：
  bd 生日 / sex 性别 / height 身高 / weight 体重 / nos 诺斯指数 /
  aliases 别称 / acq 获取途径 / related 相关人 / traits 特性 / voice 语音
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HUIJI = Path('D:/软件所/morimens/qc_sparse/data/morimens/huiji/zh-CN.json')

def norm(s):
    s = re.sub(r'<[^>]+>', '', s or '')
    s = re.sub(r'UNIQ--ref-\w+-QINU', '', s)
    s = re.sub(r'[「」『』"“”\'‘’·・:：\s]', '', s)
    return s.lower()

def split_multi(s):
    if not s or s.strip() in ('-', '?', '？'):
        return []
    return [x.strip() for x in re.split(r'[、,，;；]', s) if x.strip()]

rows = []
for line in (ROOT / 'data/huiji-awakeners.tsv').read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if not line:
        continue
    f = line.split('|')
    if len(f) < 14:
        print('skip bad row', line[:40])
        continue
    rows.append(f)

voice = {}
if HUIJI.exists():
    h = json.loads(HUIJI.read_text(encoding='utf-8'))
    for rec in h.get('records', []):
        vs = [{'t': v.get('title'), 'c': v.get('content')} for v in (rec.get('voiceLines') or [])]
        if not vs:
            continue
        for key in (norm(rec.get('englishName')), norm(rec.get('name'))):
            if key:
                voice[key] = vs

d = json.loads((ROOT / 'data/dictionary.json').read_text(encoding='utf-8'))
by_en = {norm(a.get('en')): a for a in d['awakener']}
by_zh = {norm(a.get('zh')): a for a in d['awakener']}

filled = 0
# 同一角色的「本源」形态单独占一个 wiki 页面，档案与本体共用，只需并入别称
VARIANTS = {'神王·图鲁': '图鲁'}

for f in rows:
    zh, realm, rarity, role, bd, sex, height, weight, nos, en, aliases, acq, related, traits = f[:14]

    if zh in VARIANTS:
        base = by_zh.get(norm(VARIANTS[zh]))
        if base:
            al = split_multi(aliases)
            base['aliases'] = list(dict.fromkeys((base.get('aliases') or []) + al))
            base.setdefault('forms', []).append({'zh': zh, 'en': en, 'rarity': rarity})
            filled += 1
        else:
            print('unmatched variant', zh, en)
        continue

    a = by_en.get(norm(en)) or by_zh.get(norm(zh))
    if not a:
        print('unmatched', zh, en)
        continue
    a['bd'] = bd if bd not in ('-', '') else ''
    a['sex'] = sex if sex not in ('-', '') else ''
    a['height'] = '' if height in ('-', '') else height
    a['weight'] = '' if weight in ('-', '') else weight
    a['nos'] = '' if nos in ('-', '') else nos
    a['aliases'] = split_multi(aliases)
    a['acq'] = split_multi(acq)
    a['related'] = split_multi(related)
    a['traits'] = split_multi(traits)
    if norm(en) and norm(en) != norm(a.get('en')):
        a['enName'] = en
    vs = voice.get(norm(en)) or voice.get(norm(zh))
    if vs:
        a['voice'] = vs
    a['src'] = 'huiji'
    # 界域 / 稀有度 / 类型 用一手资料校正（仅当原值为空或明显不一致时保留原值）
    if not a.get('realm'):
        a['realm'] = realm
    if not a.get('rarity'):
        a['rarity'] = rarity
    if not a.get('role'):
        a['role'] = role
    filled += 1

(ROOT / 'data/dictionary.json').write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
aw = d['awakener']
print(f'filled {filled}/{len(rows)}; awakeners {len(aw)}; '
      f'voice {sum(1 for a in aw if a.get("voice"))}; alias {sum(1 for a in aw if a.get("aliases"))}; '
      f'bd {sum(1 for a in aw if a.get("bd"))}')
