"""给关键词补一个「机制分类」(g)，让图鉴里的高亮标签能按用途区分。

分组（站内整理，便于浏览；只影响展示与筛选，不改动名称）：
  dmg    伤害来源（力量、触腕伤害、中毒、侵蚀、反击、穿透/纯粹伤害……）
  debuff 减益（虚弱、易伤、脆弱、迟缓、眩晕、封印、凋萎……）
  buff   增益（强化、临时力量、戒备、屏障、护垒、保留、星辰庇护……）
  res    资源与节奏（疯狂/狂气、算力调和、预备、发现、可使用X次、死亡抵抗……）
  rule   规则与形态（回合唯一、队伍唯一、虚无、消耗、超维回合/空间、跃迁……）
  realm  界域（混沌/血肉/深海/超维及其变体）

Usage: python scripts/classify_keywords.py
"""
import json
from pathlib import Path

P = Path(__file__).resolve().parents[1] / 'data/keywords.json'

GROUPS = {
    'dmg': ['poison', 'corrosion', 'bleed', 'burn', 'str', 'tentacle-dmg', 'counter', 'pierce-dmg',
            'pure-dmg', 'fixed-dmg', 'annihilation', 'singularity-annihilation', 'devour',
            'infinite-devour', 'aftershock', 'quasar', 'temporary-str', 'temporary-counter',
            'crimson-furnace', 'blackened-flame', 'ancient-embers', 'embryo-fusion',
            'embryo-fusion-double'],
    'debuff': ['weakness', 'vulnerable', 'fragile', 'stagnation', 'blighten', 'stun', 'fainted',
               'sealed', 'mental-interference', 'perception-warp', 'strength', 'destroy',
               'perception', 'sacrifice', 'delayed-sacrifice', 'sprint'],
    'buff': ['enhance', 'temporary-enhance', 'alert', 'barrier', 'fortress', 'retain', 'innate',
             'charge-unto-glory', 'stellar-protection', 'astral-reign', 'resonance', 'echo',
             'rouse', 'rush-headlong', 'pursuit', 'steal', 'resonance'],
    'res': ['madness', 'over-exalt', 'arithmetica-harmony', 'prepare', 'discover', 'usable-x-times',
            'death-resistance', 'pistoles-de-marie', 'diagnosis', 'diagnostic-records',
            'singularity-beacon', 'singularity-prism'],
    'rule': ['turn-unique', 'team-unique', 'fleeting', 'exhaust', 'final-rule', 'forbidden-lore',
             'primordia-mastery-scaling', 'ultra-round', 'ultra-space', 'ultra-mastery',
             'dimension-shuttle', 'leap', 'void', 'pure-ultra', 'surging-tides', 'raging-waves',
             'tranquil-sea', 'divine-realm-raging-waves', 'divine-realm-aequor-mastery',
             'divine-realm-surging-tides', 'divine-realm-tentacle-stance', 'divine-realm-tranquil-sea',
             'ashen-ruins', 'propagation-frenzy', 'lemurian'],
}
LABEL = {'dmg': '伤害', 'debuff': '减益', 'buff': '增益', 'res': '资源', 'rule': '规则'}

g_of = {s: g for g, slugs in GROUPS.items() for s in slugs}

kw = json.loads(P.read_text(encoding='utf-8'))
for k in kw:
    if k.get('t') == 'realm':
        k['g'] = 'realm'
        continue
    k['g'] = g_of.get(k['s'], 'misc')
    k['c'] = k['g'] if k['g'] != 'misc' else (k.get('c') or 'misc')
P.write_text(json.dumps(kw, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')

from collections import Counter
print('分组:', dict(Counter(k['g'] for k in kw)))
print('未归类:', [k['s'] for k in kw if k['g'] == 'misc'])
