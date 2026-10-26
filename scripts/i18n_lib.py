"""Chinese text pipeline for the codex: template rendering, keyword markers and the keyword table.

Text convention used everywhere in data/*.json:
  ⟦slug|文字⟧  a keyword (状态/机制/界域…) that has an entry in data/keywords.json
  「名称」      a proper name (skill, card, relic…) without its own entry
"""
import glob, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
I18N = HERE / 'i18n'
MARK = re.compile(r'⟦([^|⟧]+)\|([^⟧]*)⟧')
CJK = re.compile(r'[一-鿿]')
ARG = re.compile(r'\[(?:\{[^}]*\}|[A-Za-z_ ]+:)?((?:State|Desc)?Arg\d+)\]')
BLOCK = re.compile(r'\[\{([^{}]+)\}[:：]\s*([^\[\]]*)\]')
BRACE = re.compile(r'\{([^{}]+)\}')
# words that are also ordinary Chinese; they are only linked when written as an explicit {Term}
GENERIC = {'exhaust', 'discover', 'innate', 'perception', 'resonance', 'enhance', 'echo', 'fainted', 'tentacle-dmg',
           'temporary-enhance', 'lemurian', 'forbidden-lore', 'final-rule', 'turn-unique'}


def strip_marks(t):
    return MARK.sub(lambda m: m.group(2), t or '')


def slugs_in(t):
    return list(dict.fromkeys(m[0] for m in MARK.findall(t or '')))


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def load_zh_files(pattern):
    out = {}
    for f in sorted(glob.glob(str(I18N / 'zh' / pattern))):
        out.update(jl(f))
    return out


class Lang:
    def __init__(self, overlays, glossary, known_ids, known_en2zh, unique_terms, pool_names):
        en_names = jl(I18N / 'en/names.json')
        en_tpl = jl(I18N / 'en/tpl-map.json')
        zn, zt = load_zh_files('names-*.json'), load_zh_files('tpl-*.json')
        self.name_zh = {en_names[k]: v for k, v in zn.items() if k in en_names}
        self.tpl_zh = {en_tpl[k]: v for k, v in zt.items() if k in en_tpl}
        self.misc = jl(I18N / 'zh/misc.json')
        self.known_ids = known_ids
        self.known_en2zh = known_en2zh
        self.term_zh = {}
        for e in glossary:
            if e['k'] == 'term' and e['zh']:
                self.term_zh[e['en']] = e['zh'].split('/')[0].strip()
        self.term_zh.update(unique_terms)
        self.pool_names = pool_names  # english -> zh for awakeners / wheels / relics / keys / covenants
        # keyword table ------------------------------------------------------------------
        kwz = jl(I18N / 'zh/keywords.json')
        self.kw = {}
        self.kw_by_en = {}
        self.kw_by_zh = {}
        for r in overlays:
            if not r['id'].startswith('overlay.global.'):
                continue
            slug = r['id'].split('.', 2)[2]
            z = kwz.get(slug)
            if not z:
                continue
            k = {'s': slug, 'n': z['n'], 'e': r['name'], 'a': z.get('a', []), 'd': z['d'], 't': r['overlayType'],
                 'c': r.get('textColor') or '', 'i': r.get('iconId')}
            self.kw[slug] = k
            self.kw_by_en[r['name']] = k
            for n in [z['n']] + k['a']:
                self.kw_by_zh[n] = k
        names = sorted((n for n, k in self.kw_by_zh.items() if k['s'] not in GENERIC), key=len, reverse=True)
        self.scan = re.compile('|'.join(re.escape(n) for n in names))
        for k in self.kw.values():  # keyword descriptions get linked too (except self references)
            k['d'] = self.link(self.resolve_braces(k['d']), skip=k['s'])
        self.unresolved = {}

    # ---------------------------------------------------------------- terms
    def term(self, tok):
        t = re.sub(r'^(?:derived|overlay):', '', tok)
        if t in self.kw_by_en:
            k = self.kw_by_en[t]
            return f"⟦{k['s']}|{k['n']}⟧"
        if t in self.kw_by_zh:
            k = self.kw_by_zh[t]
            return f"⟦{k['s']}|{t}⟧"
        for table in (self.known_en2zh, self.name_zh, self.term_zh, self.pool_names):
            if t in table:
                return f'「{table[t]}」'
        if CJK.search(t):
            return f'「{t}」'
        self.unresolved[t] = self.unresolved.get(t, 0) + 1
        return f'「{t}」'

    def resolve_braces(self, t):
        return BRACE.sub(lambda m: self.term(m.group(1)), t)

    def link(self, t, skip=None):
        """Insert ⟦slug|…⟧ for plain keyword names outside existing markers."""
        out, pos = [], 0
        for m in MARK.finditer(t):
            out.append(self._scan(t[pos:m.start()], skip))
            out.append(m.group(0))
            pos = m.end()
        out.append(self._scan(t[pos:], skip))
        return ''.join(out)

    def _scan(self, seg, skip):
        def rep(m):
            k = self.kw_by_zh[m.group(0)]
            return m.group(0) if k['s'] == skip else f"⟦{k['s']}|{m.group(0)}⟧"
        return self.scan.sub(rep, seg)

    # ---------------------------------------------------------------- templates
    def render(self, rec, max_level=None, template=None):
        t = template if template is not None else self.tpl_zh.get(rec.get('descriptionTemplate') or '')
        if t is None:
            return None
        args = rec.get('descriptionArgs') or {}
        t = ARG.sub(lambda m: fmt_arg(args[m.group(1)], max_level) if m.group(1) in args else '※', t)
        t = BLOCK.sub(lambda m: f'【{{{m.group(1)}}}】{m.group(2)}', t)
        t = re.sub(r'\s*\+?\[Talent_Attr_Lv_\w+\]', '：随等级成长', t).replace('%%', '%')
        t = self.resolve_braces(t)
        return self.link(t)

    def name_of(self, rec):
        if rec['id'] in self.known_ids:
            return self.known_ids[rec['id']]
        n = rec['name']
        return self.name_zh.get(n) or self.term_zh.get(n) or self.pool_names.get(n) or n


def fmt_arg(a, max_level=None):
    k = a.get('kind')
    suf = a.get('suffix') or ''
    f = lambda x: str(int(x)) if x == int(x) else f'{x:g}'
    if k == 'fixed':
        v = a.get('value')
        return '※' if v == 'X' else f'{v}{suf}'
    if k == 'scaling':
        v = a['values']
        s = f'{v[0]}{suf}' if v[0] == v[-1] else f'{v[0]}–{v[-1]}{suf}'
        return s + (f"（{STAT.get(a['stat'], a['stat'])}）" if a.get('stat') else '')
    if k == 'linear':
        base, gain = float(a['base']), float(a['gainPerLevel'])
        if max_level and max_level > 1:
            return f'{f(base)}–{f(base + gain * (max_level - 1))}{suf}'
        return f'{f(base)}{suf}'
    return '※'


STAT = {'ATK': '攻击力', 'DEF': '防御力', 'CON': '体质', 'HP': '生命'}
