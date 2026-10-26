#!/usr/bin/env python3
"""Collect every English string that still needs a Chinese counterpart.

usage: python3 scripts/i18n_extract.py /path/to/qdby_chinese

Writes scripts/i18n/en/*.json. IDs are sequential and stable: re-running never renumbers existing
entries (new strings get appended), so translations in scripts/i18n/zh/*.json stay valid.
"""
import glob, json, re, sys
from pathlib import Path

SRC = Path(sys.argv[1])
M = SRC / 'data/morimens'
V3 = M / 'skeydb/public-v3/records'
OUT = Path(__file__).resolve().parent / 'i18n/en'
jl = lambda p: json.load(open(p, encoding='utf-8'))

glossary = {e['en']: e['zh'] for e in jl(M / 'game/glossary.json')['entries'] if e['k'] == 'term' and e['zh']}
js = (SRC / 'morimens-calculator-skeydb.js').read_text(encoding='utf-8')
known_ids = dict(re.findall(r"'((?:skill|derived|talent|enlighten)\.[^']+)':'([^']+)'", js[js.index('const zhSkillNames'):js.index('const uniqueTermZh')]))
unique = dict(re.findall(r"'([^']+)':'([^']+)'", js[js.index('const uniqueTermZh'):js.index('const globalTermMeta')]))
known_terms = {**glossary, **unique}


def load_map(name):
    p = OUT / name
    return jl(p) if p.exists() else {}


def add(table, text, prefix, width=4):
    for k, v in table.items():
        if v == text:
            return k
    k = f'{prefix}{len(table) + 1:0{width}d}'
    table[k] = text
    return k


tpl = load_map('tpl-map.json')
names = load_map('names.json')
ctx = load_map('names-ctx.json')
TERM = re.compile(r'\{([^{}]+)\}')


def strip(t):
    return re.sub(r'^(?:derived|overlay):', '', t)


for kind in ('skills', 'talents', 'enlightens', 'derived-skills', 'overlays'):
    for f in sorted(glob.glob(str(V3 / kind / '*.json'))):
        r = jl(f)
        if kind == 'overlays' and r['id'].startswith('overlay.global'):
            continue
        if r['id'] in known_ids:
            pass
        elif r['name'] not in known_terms:
            k = add(names, r['name'], 'n')
            ctx.setdefault(k, f"{kind[:-1] if kind != 'derived-skills' else 'derived'} · {r.get('ownerAwakenerName', '')}")
        t = r.get('descriptionTemplate')
        if t and kind in ('skills', 'talents', 'enlightens', 'derived-skills'):
            add(tpl, t, 't')
            for u in r.get('upgrades', []):
                pass
        for term in TERM.findall(t or ''):
            term = strip(term)
            if term.startswith('plural:') or term in known_terms:
                continue
            add(names, term, 'n')

json.dump(tpl, open(OUT / 'tpl-map.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump(names, open(OUT / 'names.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump(ctx, open(OUT / 'names-ctx.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('templates', len(tpl), sum(len(v) for v in tpl.values()), 'chars; names', len(names))
