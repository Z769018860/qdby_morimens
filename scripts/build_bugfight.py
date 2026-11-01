#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把《忘却前夜》客户端怪物表接进「电子斗蛐蛐」。

数据源（项目里已有的官方数据，别再抓一遍）：
  idle/public/data/game-data.json
    monsters[]  hp / atk / df 是**相对倍率**（普通体 1.0 = 基准），rank/size 是原作分类，
                op 是开局逐回合的意图序列，cy 是这之后循环的意图序列。
    msk{}       怪物技能：n 名字 / t 模板 / i 意图码 / g 释放位置 / a 参数
                a 的元素按顺序填掉模板里的 {1}{2}{3}：
                  ["a", v] 攻击 ×v 点伤害      ["n", v] v 次 / v 层
                  ["d", v] 防御 ×v 点护盾      ["x"]     特殊量（原作没给，显示成「?」）
    intent{}    意图码 → 中文（攻击 / 重击 / 削弱 / 强化 / 防御 / 攻防兼备 / 特殊行动 …）

输出：
  data/bugfight-mobs.json   怪物池 + 技能表（结构化 fx，供引擎直接结算）
  assets/bugfight/faces.webp 立绘图集（96px 一格、8 列），名字→格号写在 json 里
  assets/ui/gameicons/bugfight.webp 首页九宫格图标

用法：python3 scripts/build_bugfight.py
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / 'idle/public/data/game-data.json'
OUT_JSON = ROOT / 'data/bugfight-mobs.json'
OUT_ATLAS = ROOT / 'assets/bugfight/faces.webp'
OUT_ICON = ROOT / 'assets/ui/gameicons/bugfight.webp'

CELL = 96
COLS = 8

# 引擎认的效果词表。加新词必须同时改 js/bugfight/engine.js 的 applyFx。
FX_KEYS = {'hit', 'shield', 'str', 'weak', 'vuln', 'bleed', 'poison', 'barrier',
           'heal', 'summon', 'draw', 'special'}


def clean(t):
    """⟦slug|中文⟧ → 中文。"""
    return re.sub(r'⟦[^|]*\|([^⟧]*)⟧', r'\1', t or '')


def args_of(sk):
    out = []
    for it in sk.get('a') or []:
        kind = it[0]
        val = it[1] if len(it) > 1 else None
        out.append((kind, val))
    return out


def arg_at(args, idx):
    """模板里的 {idx}（1 起）→ 参数。越界给 None。"""
    if 0 <= idx - 1 < len(args):
        return args[idx - 1]
    return None


def fv(a):
    """参数里的数值；["x"] 这种没有值，返回 None。"""
    if not a or len(a) < 2 or a[1] is None:
        return None
    return float(a[1])


def parse_fx(tpl, args):
    """把一条技能文本解析成引擎认的 fx 数组。

    只认「能落到结算上的」部分：伤害/护盾/力量/虚弱/易伤/脆弱/出血/中毒/屏障/
    治疗/召唤。其余（抽牌、弃牌、洗入、封印、疯狂…）在斗蛐蛐里没有对位的
    牌库，统一由 intent 兜底，不硬编。

    fx 里的 m 是**攻击/防御倍率**（结算时乘当前面板），v 是固定层数/点数。
    """
    text = clean(tpl)
    fx = []
    for seg in re.split(r'[。；]', text):
        seg = seg.strip()
        if not seg:
            continue

        def num(group):
            """句子里第 N 个占位符对应的数值；["x"] 这类没数值的给 None。"""
            return fv(arg_at(args, int(group))) if group else None

        # 1) 伤害：造成 {1} 点伤害 {2} 次
        m = re.search(r'造成\s*\{(\d)\}\s*点伤害(?:\s*\{(\d)\}\s*次)?', seg)
        if m:
            a = arg_at(args, int(m.group(1)))
            mult = fv(a) if a and a[0] == 'a' else (1.0 if a and a[0] == 'x' else None)
            times = num(m.group(2)) if m.group(2) else 1
            times = max(1, int(round(times or 1)))
            if mult is not None:
                fx.append({'k': 'hit', 'm': round(mult, 4), 't': times})
                # 出血：等量伤害
                if '出血' in seg and '造成' in seg:
                    fx.append({'k': 'bleed', 'eq': True})

        # 2) 护盾
        m = re.search(r'获得\s*\{(\d)\}\s*点护盾', seg)
        if m and num(m.group(1)):
            fx.append({'k': 'shield', 'm': round(num(m.group(1)), 4)})

        # 3) 力量
        m = re.search(r'获得\s*\{(\d)\}\s*点(?:临时)?力量', seg)
        if m and num(m.group(1)):
            fx.append({'k': 'str', 'v': round(num(m.group(1)), 2)})

        # 4) 虚弱 / 易伤 / 脆弱
        for word, key in (('虚弱', 'weak'), ('易伤', 'vuln'), ('脆弱', 'vuln')):
            m = re.search(r'(?:施加|赋予)\s*\{(\d)\}\s*(?:回合|层)(?:的)?' + word, seg)
            if m and num(m.group(1)):
                fx.append({'k': key, 't': round(num(m.group(1)), 2)})

        # 5) 中毒
        m = re.search(r'(?:造成|施加)\s*\{(\d)\}\s*层中毒', seg)
        if m and num(m.group(1)):
            fx.append({'k': 'poison', 'v': round(num(m.group(1)), 2)})

        # 6) 屏障
        m = re.search(r'获得\s*\{(\d)\}\s*层屏障', seg)
        if m and num(m.group(1)):
            fx.append({'k': 'barrier', 'v': int(round(num(m.group(1))))})

        # 7) 治疗 / 回复
        m = re.search(r'回复\s*\{(\d)\}\s*点生命', seg)
        if m and num(m.group(1)):
            a = arg_at(args, int(m.group(1)))
            fx.append({'k': 'heal', 'v': round(num(m.group(1)), 4), 'm': a[0]})

        # 8) 召唤
        for nm in re.findall(r'召唤(?:一个|一只|1 个)?「([^」]+)」', seg):
            fx.append({'k': 'summon', 'n': nm})

        # 9) 自伤 / 献祭
        m = re.search(r'失去\s*\{(\d)\}\s*点生命', seg)
        if m and num(m.group(1)):
            fx.append({'k': 'selfhurt', 'v': round(num(m.group(1)), 4)})

    # 去重（同一句可能被两条规则各命中一次）
    uniq = []
    for f in fx:
        if f not in uniq:
            uniq.append(f)
    return uniq


def main():
    d = json.loads(GAME.read_text(encoding='utf-8'))
    mobs = d['monsters']
    msk = d['msk']
    intent = d['intent']

    # 技能表：只留实际操作里引用得到的
    used = set()
    for m in mobs:
        used.update(str(x) for x in (m.get('op') or []) + (m.get('cy') or []))
    skills = {}
    stat = {'fx': 0, 'empty': 0, 'special': 0}
    for sid in sorted(used):
        sk = msk.get(sid)
        if not sk:
            continue
        args = args_of(sk)
        fx = parse_fx(sk.get("t", ""), args)
        if not fx:
            stat['empty'] += 1
            fx = [{'k': 'special'}]
        else:
            stat['fx'] += 1
        skills[sid] = {
            'n': sk.get('n') or '',
            'i': sk.get('i') or '015',
            'g': sk.get('g') or '',
            't': clean(sk.get('t', '')),
            'a': [[k, v] for k, v in args],
            'fx': fx,
        }
    print(f'技能 {len(skills)} 条（有结构化效果 {stat["fx"]} / 无 {stat["empty"]}）')

    by_img = {}
    pool = []
    for m in mobs:
        img = Path(m['img']).name
        if not (ROOT / 'assets/monster' / img).exists():
            continue
        op = [str(x) for x in (m.get('op') or [])]
        cy = [str(x) for x in (m.get('cy') or [])]
        if not op or any(x not in skills for x in op + cy):
            continue
        # 会不会打架：整条意图序列里至少有一次伤害（含兜底后仍有效的）
        dmg = 0
        for sid in set(op + cy):
            for f in skills[sid]['fx']:
                if f['k'] == 'hit':
                    dmg += 1
        if not dmg:
            continue
        by_img.setdefault(img, m)
        pool.append({
            'id': m['id'], 'n': m['zh'], 'rank': m['rank'], 'size': m['size'],
            'hp': m['hp'], 'atk': m['atk'], 'df': m['df'], 'img': img,
            'desc': m.get('desc', ''),
            'op': op, 'cy': cy,
        })
    print(f'怪物池 {len(pool)} 只 / 立绘 {len(by_img)} 张')

    # 按名字去重：「冷蛛群」「渊狱蜘群」在客户端表里各有两个条目（立绘差一格、数值一样），
    # 斗蛐蛐里同名的两只同时出场只会让人看不懂，留第一只。
    seen = {}
    uniq = []
    for m in pool:
        if m['n'] in seen:
            continue
        seen[m['n']] = m
        uniq.append(m)
    print(f'去重后 {len(uniq)} 只')
    pool = uniq

    # ---------------- 图集
    names = sorted({m['img'] for m in pool})
    index = {nm: i for i, nm in enumerate(names)}
    rows = (len(names) + COLS - 1) // COLS
    atlas = Image.new('RGBA', (CELL * COLS, CELL * rows), (0, 0, 0, 0))
    for nm, i in index.items():
        im = Image.open(ROOT / 'assets/monster' / nm).convert('RGBA')
        im.thumbnail((CELL, CELL), Image.LANCZOS)
        x = (i % COLS) * CELL + (CELL - im.width) // 2
        y = (i // COLS) * CELL + (CELL - im.height) // 2
        atlas.alpha_composite(im, (x, y))
    OUT_ATLAS.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_ATLAS, 'WEBP', quality=80, method=6)
    print(f'图集 {atlas.width}×{atlas.height}，{len(names)} 格，'
          f'{OUT_ATLAS.stat().st_size // 1024}KB')

    for m in pool:
        m['ix'] = index[m['img']]
        del m['img']

    out = {
        '_note': ('《忘却前夜》电子斗蛐蛐怪物表。数值全部来自客户端 game-data.json：'
                  'hp/atk/df 是相对倍率（普通体 1.0），op 是开局逐回合意图、'
                  'cy 是之后循环的意图，技能是 msk 表原文，fx 是引擎对同一条原文的结构化解析。'
                  '基准换算写在页面规则里（血 = 倍率 × 1000，攻 = 倍率 × 100）。'),
        'atlas': {'cell': CELL, 'cols': COLS, 'rows': rows,
                  'w': atlas.width, 'h': atlas.height},
        'intent': intent,
        'skills': skills,
        'mobs': pool,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')),
                        encoding='utf-8')
    print(f'{OUT_JSON.relative_to(ROOT)} {OUT_JSON.stat().st_size // 1024}KB')

    # ---------------- 首页图标：拿一张最像「蛐蛐」的怪当门面
    pick = next((m for m in pool if m['n'] == '融蚀鼠王'), None) or pool[0]
    icon_src = ROOT / 'assets/monster' / names[pick['ix']]
    im = Image.open(icon_src).convert('RGBA')
    im.thumbnail((80, 80), Image.LANCZOS)
    canvas = Image.new('RGBA', (80, 80), (0, 0, 0, 0))
    canvas.alpha_composite(im, ((80 - im.width) // 2, (80 - im.height) // 2))
    OUT_ICON.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_ICON, 'WEBP', quality=88, method=6)
    print(f'图标 {OUT_ICON.relative_to(ROOT)}（{pick["n"]}）')

    # ---------------- 九个人机的席位头像：40×40 缩略图
    # 原图 20~60KB 一张，九张内联进 gen.js 就是三百多 KB——只为在名单里显示 30px 的小方块，
    # 不值。这里先缩到 40px（2 倍屏够用），构建时再 base64。
    seats = json.loads((ROOT / 'data/bugfight-seats.json').read_text(encoding='utf-8'))['seats']
    av = json.loads((ROOT / 'data/avatars.json').read_text(encoding='utf-8'))
    by_id = {x['id']: x for x in av['items']}
    out_dir = ROOT / 'assets/bugfight/seats'
    out_dir.mkdir(parents=True, exist_ok=True)
    for s in seats:
        m = by_id.get(s['id'])
        src = ROOT / (m['src'] if m else f"idle/public/img/awk/{s['id'].replace('c-', '')}.webp")
        if not src.exists():
            raise SystemExit(f'席位 {s["n"]} 的头像不存在：{src}')
        im = Image.open(src).convert('RGBA')
        im.thumbnail((40, 40), Image.LANCZOS)
        canvas = Image.new('RGBA', (40, 40), (0, 0, 0, 0))
        canvas.alpha_composite(im, ((40 - im.width) // 2, (40 - im.height) // 2))
        canvas.save(out_dir / (s['id'] + '.webp'), 'WEBP', quality=86, method=6)
    print(f'席位头像 {len(seats)} 张 → assets/bugfight/seats/')


if __name__ == '__main__':
    main()
