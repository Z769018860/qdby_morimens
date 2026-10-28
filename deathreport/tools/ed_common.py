# -*- coding: utf-8 -*-
"""Shared helpers for the earlier editions (第六十一次 / 第六十二次): documents are the main game's, re-labelled, with edition-specific map / zone / sealed texts."""
from docs import DOCS as MAIN
CNUM = '零一二三四五六七八九十'
def cn(n): return CNUM[n] if n <= 10 else ('十' if n < 20 else CNUM[n // 10] + '十') + (CNUM[n % 10] if n % 10 else '')
def make_docs(meta, n_cast, over, finals):
    docs = {}
    for did, (title, src, body, secret) in MAIN.items():
        if did in ('00-FRAGMENT', '00-DECREE', '00-SEALED', '00-WORLD'): continue
        body = body.replace('第六十三次', meta['label']).replace('六十二名', cn(n_cast) + '名').replace('弥萨格学院 回溯班', '弥萨格大学 唤醒系')
        body = body.replace('文本里若夹着“残片”，见 [link]00-FRAGMENT[/link]。', '')
        docs[did] = (title, src, body, secret)
    for k, v in over.items(): docs[k] = v
    docs['00-WORLD'] = MAIN['00-WORLD']
    for k, v in finals.items(): docs[k] = v
    return docs
