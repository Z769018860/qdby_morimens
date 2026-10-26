"""Build data/official-terms.json from official Chinese sources and (optionally) correct the site data.

官方来源（全部来自 qdby_chinese 检出目录，不使用机器翻译）：
  wiki   = 忘却前夜中文维基（data/morimens/huiji/*.zh-CN.json）
  game   = BIAVGit/Morimens-Localizations 官方游戏文本表（data/morimens/game/dzone-translations.json）
  client = 游戏客户端配置（data/morimens/local-config/*.json.gz，按 id 精确对应）
  table  = 官方中英对照（data/morimens/game/tier-details.json 的 m / x）
  synced = qdby_chinese 的 glossary.json 里 s=wiki|game 的官方条目

匹配规则：怪物等按 **id** 精确对应；只有「同一英文名唯一对应一个中文名」时才按名称覆盖，
避免不同 id 同名中文不同的情况被错误合并。

Usage:
  python scripts/build_official_terms.py ../qc_sparse            # 只生成 data/official-terms.json
  python scripts/build_official_terms.py ../qc_sparse --apply    # 同时校正 data/keywords.json / data/dictionary.json
"""
import glob
import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
CJK = re.compile(r'[\u4e00-\u9fff]')

# 官方口径修正：术语的官方中文以「中文客户端配置」为准。
# 例：英文 Fleeting 在客户端标记里是 <NothingnessIconKeywords:虚无>（“转瞬即逝”在客户端配置中出现 0 次，
#      “虚无”出现 48 次），因此官方译名为「虚无」。
CORRECTIONS = {
    'fleeting': ('虚无', 'client'),
}


def norm(s):
    return re.sub(r'[^a-z0-9]+', '', str(s or '').lower())


def jl(p, default=None):
    try:
        return json.loads(Path(p).read_text(encoding='utf-8'))
    except Exception:
        return default


def jgz(p, default=None):
    try:
        with gzip.open(p, 'rt', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default


class Table:
    """英文名 -> {zh: 来源}；附 by_id 精确表。"""

    def __init__(self):
        self.by_name = {}
        self.by_id = {}

    def add(self, en, zh, src, gid=None):
        en, zh = (en or '').strip(), (zh or '').strip()
        if gid and zh and CJK.search(zh):
            self.by_id.setdefault(str(gid), {'zh': zh, 'src': src, 'en': en})
        if not en or not zh or not CJK.search(zh):
            return
        self.by_name.setdefault(norm(en), {}).setdefault(zh, src)

    def unique(self, en):
        """英文名唯一对应中文时返回 (zh, src)，否则 (None, 候选来源说明)。"""
        m = self.by_name.get(norm(en)) or {}
        if len(m) == 1:
            zh, src = next(iter(m.items()))
            return zh, src
        return None, ('amb:' + '|'.join(list(m)[:3])) if m else ''

    def get(self, en):
        zh, src = self.unique(en)
        if zh:
            return {'zh': zh, 'src': src}
        m = self.by_name.get(norm(en)) or {}
        if m:
            return {'zh': list(m)[0], 'src': next(iter(m.values())), 'amb': True}
        return None

    def dump(self):
        return {k: {'zh': list(v)[0], 'src': next(iter(v.values())),
                   **({'alt': [{'zh': z, 'src': s} for z, s in v.items() if z != list(v)[0]]} if len(v) > 1 else {})}
                for k, v in self.by_name.items()}


def build(src_root: Path):
    wiki = src_root / 'data/morimens/huiji'
    game = src_root / 'data/morimens/game'
    cfg = src_root / 'data/morimens/local-config'
    T = {k: Table() for k in ['awakener', 'wheel', 'covenant', 'creation', 'monster', 'term']}

    # ---- 1. 维基 ----
    for r in (jl(wiki / 'identity.zh-CN.json', {}) or {}).get('records', []):
        T['awakener'].add(r.get('englishName'), r.get('name'), 'wiki', r.get('skeydbId'))
    for r in (jl(wiki / 'wheels.zh-CN.json', {}) or {}).get('records', []):
        T['wheel'].add(r.get('englishName'), r.get('name'), 'wiki', r.get('skeydbId'))
    dm = jl(wiki / 'dzone-monsters.zh-CN.json', {}) or {}
    for r in (dm.get('records') or []):
        if isinstance(r, dict):
            T['monster'].add(r.get('englishName') or r.get('en'), r.get('name') or r.get('zh'), 'wiki', r.get('id'))

    # ---- 2. 官方游戏文本表 ----
    tr = jl(game / 'dzone-translations.json', {}) or {}
    for en, zh in (tr.get('relics') or {}).items():
        T['creation'].add(en, zh, 'game')
    for gid, v in (tr.get('monsters') or {}).items():
        if isinstance(v, dict):
            T['monster'].add(v.get('en'), v.get('zh'), 'game', gid)
    for v in (tr.get('states') or {}).values():
        if isinstance(v, dict):
            T['term'].add(v.get('en'), v.get('zn'), 'game')
    for v in (tr.get('extra') or {}).values():
        if isinstance(v, dict):
            T['term'].add(v.get('en'), v.get('zh'), 'game')
    for k, v in (tr.get('characteristics') or {}).items():   # 界域 / 阵营名（官方）
        if isinstance(v, dict) and v.get('zh'):
            T['term'].add(k, v['zh'], 'game')
    for gid, v in (tr.get('skMonsters') or {}).items():
        if isinstance(v, dict):
            T['monster'].add(None, v.get('zh'), 'game', gid)

    # ---- 3. 客户端配置（按 id，官方中文） ----
    for m in (jgz(cfg / 'monsters.json.gz', []) or []):
        T['monster'].add(None, m.get('name'), 'client', m.get('id'))

    # ---- 4. glossary 里带官方来源的条目 ----
    gl = jl(game / 'glossary.json', {}) or {}
    for e in gl.get('entries', []):
        if e.get('s') not in ('wiki', 'game'):
            continue
        target = {'awakener': 'awakener', 'wheel': 'wheel', 'relic': 'creation',
                  'covenant': 'covenant', 'monster': 'monster', 'term': 'term'}.get(e.get('k'))
        if target:
            T[target].add(e.get('en'), e.get('zh'), e['s'])

    # ---- 5. tier-details 中英对照（界域 / 定位 / 稀有度）----
    td = (jl(game / 'tier-details.json', {}) or {}).get('items', {})
    for key, v in td.items():
        m = v.get('m') or []
        if len(m) >= 2:
            for zh, en in zip(m[0].split(' · '), m[1].split(' · ')):
                if zh and en and CJK.search(zh):
                    T['term'].add(en.strip(), zh.strip(), 'table')

    out = {'version': 1,
           'sources': {
               'wiki': {'site': '忘却前夜中文维基', 'url': 'https://morimens.huijiwiki.com/'},
               'game': {'site': 'BIAVGit/Morimens-Localizations 官方游戏文本表'},
               'client': {'site': '游戏客户端配置（按 id 对应）'},
               'table': {'site': '游戏内中英对照（tier-details）'},
           },
           'terms': {k: v.dump() for k, v in T.items()},
           'byId': {k: v.by_id for k, v in T.items()},
           'realm': {'chaos': '混沌', 'caro': '血肉', 'aequor': '深海', 'ultra': '超维', 'fadedlegacy': '褪色遗产'},
           'role': {'ASSAULT': '伤害型', 'WARDEN': '防御型', 'CHORUS': '辅助型'}}
    pairs = []
    for v in td.values():
        for b in (v.get('x') or []):
            t = b.get('t') or []
            if len(t) >= 2 and t[0] and t[1]:
                pairs.append((t[0], t[1]))

    # ---- 6. 官方客户端标记表：<EnglishKey:中文> 是官方口径（如 NothingnessIconKeywords -> 虚无）----
    mark = {}
    for f in sorted(glob.glob(str(cfg / '*.json.gz'))):
        txt = Path(f).read_bytes()
        try:
            txt = gzip.decompress(txt).decode('utf-8')
        except Exception:
            continue
        for m in re.finditer(r'<([A-Za-z0-9_]+):([^>]+)>', txt):
            zh = m.group(2).strip()
            if CJK.search(zh) and not zh.startswith('['):
                key = re.sub(r'(IconKeywords|Keywords|PVEKeywords|Keywords_\d+|Icon)$', '', m.group(1))
                mark.setdefault(key, set()).add(zh)
    out['markers'] = {k: sorted(v) for k, v in sorted(mark.items())}
    out['markerZh'] = sorted({z for s in mark.values() for z in s})
    return out, T, pairs


def lookup(T, kind, it):
    """按 id 优先、其次按英文名（去掉强化后缀 +）匹配官方中文。"""
    en = (it.get('en') or '').strip()
    plus = en.endswith('+')
    base = en[:-1].strip() if plus else en
    if kind == 'monster':
        hit = T['monster'].by_id.get(str(it.get('id')))
        if hit and hit.get('zh'):
            return {'zh': hit['zh'] + ('+' if plus else ''), 'src': hit['src']}
    t = T.get(kind)
    if not t:
        return None
    zh, src = t.unique(base)
    if zh:
        return {'zh': zh + ('+' if plus else ''), 'src': src}
    if src.startswith('amb:'):
        return {'amb': True}
    return None


def apply(off, T, pairs):
    st = {'changed': [], 'kw_total': 0, 'kw_official': 0, 'kw_none': 0, 'kw_amb': 0, 'kw_verified': 0,
          'dict_official': 0, 'dict_fixed': 0, 'dict_amb': 0, 'dict_none': 0}

    kwp = DATA / 'keywords.json'
    kw = jl(kwp)
    taken = {k.get('n') for k in kw}
    for k in kw:
        st['kw_total'] += 1
        if k.get('s') in CORRECTIONS:
            zh, src = CORRECTIONS[k['s']]
            if zh != k.get('n'):
                st['changed'].append(['keyword', k['s'], k.get('n'), zh, src])
                k['nOld'] = k.get('n')
                k['n'] = zh
            k['src'] = src
            st['kw_official'] += 1
            continue
        zh, src = T['term'].unique(k.get('e'))
        cand = T['term'].by_name.get(norm(k.get('e'))) or {}
        if zh:
            # 官方表里同一英文名常给多个中文候选（"力量 / 力量降低"），站内译名命中任一候选即视为一致
            opts = {x.strip() for x in zh.split(' / ') if x.strip()}
            for alt in (off['terms']['term'].get(norm(k.get('e')), {}).get('alt') or []):
                opts.update(x.strip() for x in str(alt.get('zh', '')).split(' / ') if x.strip())
            st['kw_official'] += 1
            if k.get('n') in opts:
                k['src'] = src
            elif (src in ('wiki', 'client') and len(opts) == 1
                  and not re.search(r'[\d\[{]', next(iter(opts))) and next(iter(opts)) not in taken):
                # 只有维基 / 客户端这类一手官方来源才直接改名；游戏文本表可能错行，只做标记
                new = next(iter(opts))
                st['changed'].append(['keyword', k['s'], k.get('n'), new, src])
                k['nOld'] = k.get('n')
                k['n'] = new
                k['src'] = src
            else:
                # 官方候选与站内译名不一致且无法判定，保留站内译名并标为待核
                k['src'] = 'ambiguous'
                st['kw_amb'] += 1
        else:
            # 官方客户端标记表核验：站内译名与官方标记的中文完全一致，才算有官方依据
            if k.get('n') in off.get('markerZh', []):
                k['src'] = 'client'
                st['kw_verified'] += 1
            else:
                st['kw_none'] += 1
                k['src'] = 'none'
    kwp.write_text(json.dumps(kw, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

    dp = DATA / 'dictionary.json'
    dic = jl(dp)
    for kind in ['awakener', 'wheel', 'covenant', 'key', 'creation', 'monster']:
        for it in dic.get(kind, []):
            hit = lookup(T, kind, it)
            if not hit:
                st['dict_none'] += 1
                continue
            if hit.get('amb'):
                st['dict_amb'] += 1
                continue
            st['dict_official'] += 1
            it['zhSrc'] = hit['src']
            if hit['zh'] != it.get('zh'):
                st['changed'].append([kind, it.get('en'), it.get('zh'), hit['zh'], hit['src']])
                it['zhOld'] = it.get('zh')
                it['zh'] = hit['zh']
                st['dict_fixed'] += 1
    dp.write_text(json.dumps(dic, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return st


def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else (ROOT.parent / 'qc_sparse')
    off, T, pairs = build(root)
    (DATA / 'official-terms.json').write_text(
        json.dumps(off, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print('official-terms.json:', {k: len(v) for k, v in off['terms'].items()},
          '| byId:', {k: len(v) for k, v in off['byId'].items()},
          '| 官方对照句对:', len(pairs))
    if '--apply' in sys.argv:
        st = apply(off, T, pairs)
        print(f"keywords: 官方表 {st['kw_official']}/{st['kw_total']}，官方对照校验 {st['kw_verified']}，歧义 {st['kw_amb']}，无来源 {st['kw_none']}")
        print(f"dictionary: 官方 {st['dict_official']}，改写 {st['dict_fixed']}，歧义跳过 {st['dict_amb']}，无来源 {st['dict_none']}")
        for row in st['changed']:
            print('  ~', row)


if __name__ == '__main__':
    main()
