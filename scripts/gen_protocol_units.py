#!/usr/bin/env python3
"""生成《忘却协议》的 62 名唤醒体数值表（data/protocol-units.json）。

名字、界域、职阶、稀有度、第一把武器（拿来做大招）都直接取自
data/survivors-data.json —— 那份是「唤醒体幸存者」用的同一套档案，
所以两个小游戏对同一个角色的界域/职阶判断不会打架。

派生规则（避免 62 条手写数值走散）：
  费用   Genesis → 4 费；其余按 en 的哈希排名切成 1/2/3 费；
  生命/攻击  按费用给基准值，再乘职阶系数（防御血厚攻低、输出相反、辅助居中）；
  射程  近战 1.15 格；远程看第一把武器的 proto（beam/missile/bolt/… 站得远）；
  大招  名称与描述取第一把武器，类型按 proto 映射成 engine 认识的 6 种。

**已经手调过的条目会被保留**：脚本读现有的 protocol-units.json，同一个角色
（按头像文件名里的游戏 id 认人）如果已经存在，就沿用它的 cost / hp / atk /
aspd / armor / range / ult，只补 src 和图集字段。想整体重算加 --fresh。

`src` 是灰机 wiki 上动图的名字前缀（「角色名-待机.gif」），个别角色带书名号
（24 → 「24」），所以这里逐个 HEAD 探测一次：先试本名，再试书名号，最后试
「·」前面的本名。探测结果写回 JSON，下次直接复用。

用法：
  python scripts/gen_protocol_units.py            # 增量（保留手调值）
  python scripts/gen_protocol_units.py --fresh    # 全部重算
  python scripts/gen_protocol_units.py --no-probe # 不联网，沿用已有 src
"""
import hashlib
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SURV = ROOT / 'data/survivors-data.json'
OUT = ROOT / 'data/protocol-units.json'

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) qdby-morimens/forget-protocol'}
BASE = 'https://huiji-public.huijistatic.com/morimens/uploads'

REALM = {'血肉': 'caro', '深海': 'aequor', '混沌': 'chaos', '超维': 'ultra'}
ROLE = {'伤害型': 'dps', '防御型': 'tank', '辅助型': 'sup'}

# 第一把武器的 proto → 大招类型（engine 的 castUlt 认识这六种）
ULT_KIND = {
    'nova': 'splash', 'chain': 'splash', 'orbit': 'splash',
    'shield': 'guard',
    'bolt': 'nuke', 'missile': 'nuke', 'beam': 'nuke', 'strike': 'nuke',
    'heal': 'heal',
    'summon': 'haste',
    'boomerang': 'stun', 'field': 'stun',
}
# 这些 proto 的角色站得远（远程），其余按近战算
RANGED = {'beam', 'missile', 'bolt', 'field', 'chain', 'boomerang', 'heal', 'summon'}

# 费用基准：[生命, 攻击]
COST_BASE = {1: (660, 47), 2: (800, 60), 3: (950, 74), 4: (1120, 92)}
COST_TARGET = {1: 20, 2: 12, 3: 9}          # 新角色的费用配额（Genesis 另算 4 费）

# 职阶系数：生命 / 攻击 / 护甲附加 / 攻击间隔倒数 / 射程（格）
ROLE_MUL = {
    'tank': dict(hp=1.34, atk=0.80, armor=18, aspd=0.80, range=1.15),
    'dps': dict(hp=0.92, atk=1.12, armor=6, aspd=0.97, range=None),
    'sup': dict(hp=0.98, atk=0.78, armor=8, aspd=0.88, range=2.30),
}


def h(s):
    return int(hashlib.md5(s.encode('utf-8')).hexdigest(), 16)


def slugify(en, taken):
    s = ''.join(ch for ch in en.lower() if ch.isalnum())
    if not s:
        s = 'u%d' % h(en) % 100000
    base, i = s, 2
    while s in taken:
        s = base + str(i)
        i += 1
    taken.add(s)
    return s


def wiki_url(name):
    d = hashlib.md5(name.encode('utf-8')).hexdigest()
    return '%s/%s/%s/%s' % (BASE, d[0], d[:2], urllib.parse.quote(name))


def exists(url):
    req = urllib.request.Request(url, headers=UA, method='HEAD')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status == 200 and int(r.headers.get('content-length') or 0) > 1024
    except Exception:
        return False


def probe_src(name):
    """找出 wiki 上这个角色的动图前缀。"""
    cands = [name]
    if not name.startswith('「'):
        cands.append('「%s」' % name)
    if '·' in name:
        base = name.split('·')[-1]
        cands += [base, '「%s」' % base]
    for c in cands:
        if exists(wiki_url(c + '-待机.gif')):
            return c
    return name            # 都没探测到就按本名写，跑图集脚本时会明确报 404


def jitter(s, span):
    """±span 的确定性抖动（同一角色每次都一样）。"""
    return 1 + ((h(s) % 2001) / 1000 - 1) * span


def main():
    argv = sys.argv[1:]
    fresh = '--fresh' in argv
    no_probe = '--no-probe' in argv

    surv = json.loads(SURV.read_text(encoding='utf-8'))
    chars = surv['chars']

    old = {}
    meta_realm = meta_role = None
    if OUT.exists():
        cfg = json.loads(OUT.read_text(encoding='utf-8'))
        meta_realm, meta_role = cfg.get('realm'), cfg.get('role')
        for u in cfg['units']:
            gid = (u.get('avatar') or '').rsplit('a-', 1)[-1].split('.')[0]
            old[gid] = u

    taken = set()
    rows = []
    for c in chars:
        gid = c['id']
        prev = old.get(gid)
        if prev and not fresh:
            uid = prev['id']
        else:
            uid = slugify(c['en'], taken)
        taken.add(uid)
        rows.append((c, gid, uid, prev))

    # ---- 费用：Genesis 固定 4 费，其余按哈希排名分配 1/2/3 费配额
    pending = [r for r in rows if not (r[3] and not fresh)]
    quota = dict(COST_TARGET)
    costs = {}
    for c, gid, uid, prev in rows:
        if prev and not fresh:
            costs[gid] = prev['cost']
    genesis = [r for r in pending if r[0]['rarity'] == 'Genesis']
    rest = sorted([r for r in pending if r[0]['rarity'] != 'Genesis'], key=lambda r: h(r[0]['en']))
    for c, gid, uid, prev in genesis:
        costs[gid] = 4
    for c, gid, uid, prev in rest:
        for cost in (1, 2, 3):
            if quota[cost] > 0:
                costs[gid] = cost
                quota[cost] -= 1
                break
        else:
            costs[gid] = 3

    units = []
    for c, gid, uid, prev in rows:
        realm = REALM[c['realm']]
        role = ROLE[c['role']]
        cost = costs[gid]
        w0 = (c.get('weapons') or [{}])[0]
        proto = w0.get('proto') or 'strike'
        ult = {
            'kind': ULT_KIND.get(proto, 'nuke'),
            'name': w0.get('n') or (c.get('talent') or '绝技'),
            'text': (w0.get('text') or c.get('talentText') or '').strip(),
        }

        if prev and not fresh:
            hp, atk, aspd, armor, rng = prev['hp'], prev['atk'], prev['aspd'], prev['armor'], prev['range']
            if prev.get('ult'):
                ult = prev['ult']
        else:
            m = ROLE_MUL[role]
            base_hp, base_atk = COST_BASE[cost]
            hp = base_hp * m['hp'] * jitter(uid + 'hp', 0.05)
            atk = base_atk * m['atk'] * jitter(uid + 'atk', 0.05)
            if realm == 'caro':
                hp *= 1.04
            if realm == 'chaos':
                atk *= 1.04
            aspd = m['aspd'] * (1.05 if realm == 'aequor' else 1) * jitter(uid + 'as', 0.04)
            armor = 6 + m['armor'] + cost * 2 + (6 if realm == 'ultra' else 0)
            rng = m['range'] or (2.55 if proto in RANGED else 1.15)
            hp, atk, aspd, armor = round(hp), round(atk, 1), round(aspd, 2), round(armor)

        src = (prev or {}).get('src')
        if no_probe and src:
            pass
        elif not prev or fresh or not src:
            src = probe_src(c['n'])
            print('  %-14s → %s' % (c['n'], src))

        units.append({
            'id': uid,
            'n': c['n'] if c['n'] != '24' else '「24」',
            'en': c['en'],
            'gid': gid,
            'src': src,
            'avatar': 'assets/avatars/a-%s.webp' % gid,
            'realm': realm,
            'role': role,
            'cost': cost,
            'hp': hp, 'atk': atk, 'aspd': aspd, 'armor': armor, 'range': rng,
            'ult': ult,
        })

    # 保险：同 id 不能重名
    ids = [u['id'] for u in units]
    assert len(ids) == len(set(ids)), '单位 id 撞了：%s' % [x for x in ids if ids.count(x) > 1]

    out = {
        'realm': meta_realm or {},
        'role': meta_role or {},
        'units': units,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    dist = {}
    for u in units:
        dist[u['cost']] = dist.get(u['cost'], 0) + 1
    rng_n = sum(1 for u in units if u['range'] > 1.5)
    print('\n%d 名唤醒体 → %s' % (len(units), OUT.relative_to(ROOT)))
    print('费用分布 %s ｜ 远程 %d ｜ 近战 %d' % (
        ' '.join('%d费×%d' % (k, dist[k]) for k in sorted(dist)), rng_n, len(units) - rng_n))
    kinds = {}
    for u in units:
        kinds[u['ult']['kind']] = kinds.get(u['ult']['kind'], 0) + 1
    print('大招类型 %s' % kinds)


if __name__ == '__main__':
    main()
