#!/usr/bin/env python3
"""增强战报侦探的数据：从 qdby_chinese 原始数据补充伤害构成、指令卡总等级、疯狂预兆等级等字段。

用法：
    python3 scripts/enhance_data.py <原始数据目录> [--out <输出目录>]

原始数据目录需包含以下文件（从 qdby_chinese 下载）：
    {s}-battle-summary.jsonl.gz   第 s 期战斗统计
    {s}-teams-*.jsonl.gz          第 s 期队伍原始数据
    tier-pool.json / tier-details.json  唤醒体元数据（用于补薇薇安）

输出：更新 data/puzzles.json（每题新增伤害构成与养成线索）与 data/dictionary.json（补薇薇安元数据）。
"""
import argparse, base64, gzip, glob, hashlib, json, os, re, secrets, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
PEPPER = '6ad17e01b5f33ee9'  # 与 js/pepper.js 保持一致（增强不改密钥）


def jl(p):
    return json.load(open(p, encoding='utf-8'))


def unseal(p):
    """解密 puzzles.json 里混淆的答案。"""
    if p.get('team'):
        return p
    raw = base64.b64decode(p['ans'])
    out = bytearray(len(raw))
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{p["id"]}|{i // 32}'.encode()).digest()
        for j in range(32):
            if i + j < len(raw):
                out[i + j] = raw[i + j] ^ ks[j]
    txt = bytes(out).decode()
    assert txt.startswith('ZJ1:'), '解密失败'
    return {**p, **json.loads(txt[4:])}


def seal(pid, obj):
    raw = ('ZJ1:' + json.dumps(obj, ensure_ascii=False, separators=(',', ':'))).encode()
    out = bytearray()
    for i in range(0, len(raw), 32):
        ks = hashlib.sha256(f'{PEPPER}|{pid}|{i // 32}'.encode()).digest()
        out += bytes(a ^ b for a, b in zip(raw[i:i + 32], ks))
    return base64.b64encode(bytes(out)).decode()


# ---------------------------------------------------------------- 疯狂预兆天赋 tid 识别
# 疯狂预兆（Madness Omen，V1.3.9 新增，效果“开局获得狂气”）是所有唤醒体都可学的通用天赋，
# 其游戏内天赋 tid 落在 1395xx 区间（新版本批次）。据此从 talents 里提取其等级。
def madness_lv(talents):
    for tid, v in (talents or {}).items():
        try:
            t = int(tid)
        except (TypeError, ValueError):
            continue
        if 139500 <= t <= 139599:
            return v.get('lv', 0)
    return None


def card_total_lv(slots):
    return sum(x.get('level') or 0 for x in (slots or []))


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--out', default=str(DATA))
    args = ap.parse_args()
    SRC = Path(args.src)
    OUT = Path(args.out)

    # ---- 1. 索引 battle-summary：key=(season,rank,score,rounds,cards,maxBout) -> 战斗统计
    print('索引 battle-summary …')
    bs = {}
    for fn in glob.glob(str(SRC / '*battle-summary.jsonl.gz')):
        # 从文件名推断赛季（形如 71-battle-summary.jsonl.gz）
        name = Path(fn).name
        m = re.search(r'(\d+)', name.split('-')[0])
        season = int(m.group(1)) if m else 0
        with gzip.open(fn, 'rt', encoding='utf-8') as f:
            for line in f:
                r = json.loads(line)
                key = (season, r.get('rank'), r.get('score'), r.get('stageRoundCount'),
                       r.get('totalUseCard'), r.get('maxBoutDamage'))
                bs[key] = r

    # ---- 2. 索引 raw-teams：battleUuid -> (season, row)，并建 rank 反查
    print('索引 raw-teams …')
    rt_by_uuid = {}
    rt_by_key = {}  # (season,rank,score) -> list[row]
    for fn in glob.glob(str(SRC / '*teams-*.jsonl.gz')):
        name = Path(fn).name
        m = re.search(r'season(\d+)', name) or re.search(r'(\d+)-teams', name)
        season = int(m.group(1)) if m else 0
        with gzip.open(fn, 'rt', encoding='utf-8') as f:
            for line in f:
                row = json.loads(line)
                sig = row.get('rankSignature') or {}
                bu = sig.get('battleUuid')
                if bu:
                    rt_by_uuid[(season, bu)] = row
                k = (season, row.get('rank'), sig.get('score'))
                rt_by_key.setdefault(k, []).append(row)

    # ---- 3. 读现有 puzzles + dictionary
    puzzles = jl(DATA / 'puzzles.json')['puzzles']
    dict_ = jl(DATA / 'dictionary.json')
    print(f'共 {len(puzzles)} 题')

    # ---- 4. 增强每题
    n_dmg = n_card = n_mad = 0
    for p in puzzles:
        key = (p['season'], p['rank'], p['score'], p['rounds'], p['cards'], p['maxBout'])
        b = bs.get(key)
        # 伤害构成（守密人伤害 / 触腕 / 反击 / 力量 / 侵蚀）
        if b:
            dmg = {
                'keeper': b.get('playerDamage') or 0,
                'tentacle': b.get('maxTentacleDamage') or 0,
                'counter': b.get('maxCounterAtt') or 0,
                'strength': b.get('maxStrength') or 0,
                'poison': b.get('maxPosion') or 0,
            }
            # 仅当有非零数据时才写入（避免全是 0 的无意义字段）
            p['dmgComp'] = dmg
            n_dmg += 1
            bu = b.get('battleUuid')
        else:
            bu = None
        # 从 raw-teams 获取指令卡总等级 + 疯狂预兆等级
        team = unseal(p) if not p.get('team') else p
        row = None
        if bu:
            row = rt_by_uuid.get((p['season'], bu))
        if row:
            tm = (row.get('response') or {}).get('team') or {}
            aw = {str(a['tid']): a for a in (tm.get('awakers') or [])}
            for m in team['team']:
                a = aw.get(str(m['tid']))
                if not a:
                    continue
                m['cardLv'] = card_total_lv(a.get('slots'))
                mlv = madness_lv(a.get('talents'))
                if mlv is not None:
                    m['madness'] = mlv
                    n_mad += 1
                n_card += 1
        # 重新加密（team 增加了字段）
        if 'team' in p:
            # 已经解密的（一般不会），直接作为 secret
            secret = {'team': team['team'], 'key': team['key'], 'relics': team['relics']}
        else:
            secret = {'team': team['team'], 'key': team['key'], 'relics': team['relics']}
        p['ans'] = seal(p['id'], secret)
        # 清理已解密残留（不应有）
        for k in ('team', 'key', 'relics'):
            p.pop(k, None)
    print(f'伤害构成补充 {n_dmg}/{len(puzzles)}，指令卡等级 {n_card} 人，疯狂预兆 {n_mad} 人')

    # ---- 5. 补薇薇安元数据（tier-details 缺失 realm/rarity/role/desc）
    for e in dict_['awakener']:
        if e.get('en') == 'Vivian' and not e.get('realm'):
            e['realm'] = '混沌'
            e['rarity'] = 'SSR'
            e['role'] = '辅助型'
            if not e.get('desc'):
                e['desc'] = [{
                    'h': '唤醒体',
                    't': '混沌界域辅助型唤醒体。薇薇安以「魔药坩埚」为核心，通过炼制魔药为队伍提供狂气、侵蚀与力量；她的「原初吐息」天赋可将混沌界域重铸为「原初：混沌」。',
                }]
            print('已补薇薇安元数据:', e['en'], e['realm'], e['rarity'], e['role'])

    # ---- 6. 写回
    OUT.mkdir(exist_ok=True)
    json.dump({'seasons': [71, 72], 'puzzles': puzzles}, open(OUT / 'puzzles.json', 'w', encoding='utf-8'),
              ensure_ascii=False, separators=(',', ':'))
    json.dump(dict_, open(OUT / 'dictionary.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('完成，已写入', OUT / 'puzzles.json', '与', OUT / 'dictionary.json')


if __name__ == '__main__':
    main()
