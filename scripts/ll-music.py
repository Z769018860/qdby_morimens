# -*- coding: utf-8 -*-
"""lovelive！mori⭐mens！的原曲打包器：music/ 里的音频 → assets/ll-music/*.bin（加密）。

用法：
    python scripts/ll-music.py --list      # 看看每首要什么文件名
    python scripts/ll-music.py             # 把 music/ 里能对上的都打包
    python scripts/ll-music.py --clean     # 删掉已经打包的 bin 和清单

为什么加密：公开仓库直接放 mp3 等于把唱片重新分发一遍。这里把音频用 AES-GCM
封成 bin，密钥在 js/ll/musicbox.js 里（SHA-256 口令），浏览器取回来自己解。
**这不是版权保护**——肯读代码的人照样能解；它只是让仓库里不出现裸音频、
不被当成公开下载源。曲子版权归原权利人，仓库只做同人小游戏的技术演示。

输入文件名：显式写 <曲目 id>.<mp3|m4a|flac|wav|ogg> 最省事；
也可以随便起名，脚本会按下面的关键词模糊匹配（大小写、空格、标点都不敏感）。
一个文件只能对上一首，对不上就跳过并列出来。

产物：
    assets/ll-music/<id>.bin    加密封装，可以入库
    data/ll-music.json          清单（构建时塞进 js/ll/gen.js，页面照单取）
music/ 只放本机（.gitignore 里挡掉了），入库的只有 bin。
"""
import argparse
import hashlib
import io
import json
import os
import re
import struct
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'music')
OUT_DIR = os.path.join(ROOT, 'assets', 'll-music')
MANIFEST = os.path.join(ROOT, 'data', 'll-music.json')
MAGIC = b'MBLLPK1\n'
PASS = 'mori' + 'mens' + '\u2605' + 'love' + 'live' + '-pack-1'   # 必须和 musicbox.js 一致
AUDIO_EXT = {'.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus', '.webm'}

# id → (中文名, 匹配关键词)。关键词全部小写，只留字母数字和汉字。
SONGS = [
    ('bokura', '僕らは今のなかで', ['bokura', '僕らは今のなかで', 'bokura wa ima no naka de', 'now no naka']),
    ('snow', 'Snow halation', ['snow halation', 'snow']),
    ('kiseki', 'それは僕たちの奇跡', ['kiseki', 'それは僕たちの奇跡', 'sore wa bokutachi no kiseki']),
    ('natsuiro', '夏色えがおで1,2,Jump!', ['natsuiro', '夏色えがおで', 'natsu iro']),
    ('wanshen', '万神纪', ['万神纪', 'wanshen', 'wan shen ji']),
    ('bujian', '不见长安', ['不见长安', 'bujian', 'bu jian chang an', 'chang an']),
    ('jianghu', '江湖意', ['江湖意', 'jianghu']),
    ('wanchong', '万重山', ['万重山', 'wanchong', 'wan chong shan']),
    ('dangzhan', '当战', ['当战', 'dangzhan', 'dang zhan']),
    ('hezengju', '何曾惧', ['何曾惧', 'hezengju', 'he zeng ju']),
    ('kuang', '狂', ['剑网3狂', '狂', 'kuang']),
    ('daogu', '我的一个道姑朋友', ['道姑朋友', 'daogu', 'dao gu peng you']),
    ('opblade', 'Operation Blade', ['operation blade', 'opblade', 'operation']),
    ('reconn', 'Reconnection', ['reconnection', 'reconn']),
    ('radiant', 'Radiant', ['radiant']),
    ('renegade', 'Renegade', ['renegade']),
    ('pyrite', 'Operation Pyrite', ['operation pyrite', 'pyrite', '黄铁']),
    ('solight', 'Speed of Light', ['speed of light', 'solight', '光速']),
    ('wolfking', '狼之主', ['狼之主', 'wolfking', 'wolf king']),
    ('boiling', 'Boiling Blood', ['boiling blood', 'boiling', '炽血蒸腾']),
    ('flywings', 'Fly, My Wings', ['fly my wings', 'flywings', 'my wings']),
    ('lament', 'In Hell We Live, Lament', ['in hell we live', 'lament', 'hell we live']),
    ('tiantian', 'TIAN TIAN', ['tian tian', 'tiantian']),
    ('patches', 'Through Patches of Violet', ['through patches', 'patches of violet', 'patches']),
    ('wakingworld', 'Waking of a World', ['waking of a world', 'wakingworld', 'waking']),
    ('dawnbreaker', 'Dawnbreaker', ['dawnbreaker', 'dawn breaker', '破晓']),
    ('ashesreign', '余烬重燃', ['余烬重燃', 'ashesreign', 'turning around']),
    ('windwhere', '风之所在', ['风之所在', 'windwhere', 'wind where']),
    ('glory', '愿戴荣光坠入天渊', ['愿戴荣光', 'glory', 'yuan dai rong guang']),
]


def norm(s):
    s = s.lower()
    s = re.sub(r'[^0-9a-z\u4e00-\u9fff]+', '', s)
    return s


def fmt_dur(sec):
    sec = int(round(sec or 0))
    return '%d:%02d' % (sec // 60, sec % 60)


MP3_BR1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]


def mp3_dur(data):
    """按首帧码率估时长。仓库里的包统一是 CBR mp3，误差在 1% 以内。"""
    off = 0
    if data[:3] == b'ID3' and len(data) > 10:
        sz = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | ((data[8] & 0x7f) << 7) | (data[9] & 0x7f)
        off = 10 + sz
    for i in range(off, min(len(data) - 4, off + 65536)):
        if data[i] != 0xFF or (data[i + 1] & 0xE0) != 0xE0:
            continue
        ver = (data[i + 1] >> 3) & 3          # 3 = MPEG1
        layer = (data[i + 1] >> 1) & 3        # 1 = Layer III
        bi = data[i + 2] >> 4
        if ver != 3 or layer != 1 or bi in (0, 15):
            continue
        return (len(data) - off) / (MP3_BR1L3[bi] * 1000 / 8.0)
    return 0


def guess_dur(data):
    """能猜就猜：mp3 读首帧码率，wav 读采样数，其它交给浏览器解码。"""
    if len(data) > 4 and (data[:3] == b'ID3' or data[:2] in (b'\xff\xfb', b'\xff\xf3', b'\xff\xf2')):
        d = mp3_dur(data)
        if d:
            return d
    if len(data) > 44 and data[:4] == b'RIFF' and data[8:12] == b'WAVE':
        try:
            i = 12
            byte_rate = 0
            while i + 8 <= len(data):
                cid = data[i:i + 4]
                size = struct.unpack('<I', data[i + 4:i + 8])[0]
                if cid == b'fmt ':
                    byte_rate = struct.unpack('<I', data[i + 16:i + 20])[0]
                elif cid == b'data' and byte_rate:
                    return size / byte_rate
                i += 8 + size + (size & 1)
        except Exception:
            pass
    return 0


def key_bytes():
    return hashlib.sha256(PASS.encode('utf-8')).digest()


def encrypt(data):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    iv = os.urandom(12)
    ct = AESGCM(key_bytes()).encrypt(iv, data, None)
    return MAGIC + iv + ct


def scan_sources():
    if not os.path.isdir(SRC_DIR):
        return []
    out = []
    for base, _dirs, files in os.walk(SRC_DIR):
        for f in files:
            if os.path.splitext(f)[1].lower() in AUDIO_EXT:
                out.append(os.path.join(base, f))
    out.sort()
    return out


def match(path, taken):
    stem = norm(os.path.splitext(os.path.basename(path))[0])
    for sid, _name, keys in SONGS:
        if sid in taken:
            continue
        if stem == sid:
            return sid
    best = None
    for sid, _name, keys in SONGS:
        if sid in taken:
            continue
        for k in keys:
            nk = norm(k)
            if nk and nk in stem:
                # 关键词越长越可信，避免 bell/ashes 这种短词抢错
                score = len(nk)
                if best is None or score > best[0]:
                    best = (score, sid)
    return best[1] if best else None


def do_list():
    print('%-12s %-24s %s' % ('id', '曲名', '认得出的文件名（任意一种）'))
    for sid, name, keys in SONGS:
        ex = sid + '.mp3  /  ' + keys[-1]
        print('%-12s %-24s %s' % (sid, name, ex))
    print('\n把音频放进 %s ，跑一次 python scripts/ll-music.py' % os.path.relpath(SRC_DIR, ROOT))


def do_clean():
    n = 0
    if os.path.isdir(OUT_DIR):
        for f in os.listdir(OUT_DIR):
            if f.endswith('.bin'):
                os.remove(os.path.join(OUT_DIR, f))
                n += 1
    if os.path.exists(MANIFEST):
        os.remove(MANIFEST)
    print('清掉了 %d 个包和清单' % n)


def main():
    ap = argparse.ArgumentParser(add_help=True)
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--clean', action='store_true')
    args = ap.parse_args()
    if args.list:
        do_list()
        return 0
    if args.clean:
        do_clean()
        return 0
    try:
        import cryptography  # noqa: F401
    except Exception:
        print('缺 cryptography：pip install cryptography', file=sys.stderr)
        return 1
    files = scan_sources()
    if not files:
        print('music/ 里没有音频。先看 python scripts/ll-music.py --list', file=sys.stderr)
        return 1
    os.makedirs(OUT_DIR, exist_ok=True)
    taken, songs, skipped = set(), {}, []
    for p in files:
        sid = match(p, taken)
        if not sid:
            skipped.append(p)
            continue
        taken.add(sid)
        with open(p, 'rb') as f:
            data = f.read()
        blob = encrypt(data)
        rel = 'assets/ll-music/%s.bin' % sid
        with open(os.path.join(ROOT, rel), 'wb') as f:
            f.write(blob)
        songs[sid] = {
            'file': rel,
            'dur': round(guess_dur(data), 2),
            'bytes': len(data),
            'src': os.path.basename(p),
            'at': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        }
        print('%-9s ← %-40s %6.1fMB → %5.1fMB' % (sid, os.path.basename(p)[:40],
                                                  len(data) / 1048576, len(blob) / 1048576))
    if not songs:
        print('一个都没对上。文件名里带上曲名或 id 再试，例如 snow.mp3', file=sys.stderr)
        return 1
    doc = {
        '_note': 'lovelive 曲库原曲包清单。file 指 assets/ll-music/*.bin（AES-GCM 封装，'
                 '密钥在 js/ll/musicbox.js）。构建时只把清单塞进脚本，音频按需取。',
        '_build': 'python scripts/ll-music.py（源音频在 music/，不入库）',
        'songs': songs,
    }
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print('\n清单写好：%s（%d 首）' % (os.path.relpath(MANIFEST, ROOT), len(songs)))
    missing = [sid for sid, _n, _k in SONGS if sid not in songs]
    if missing:
        print('还没对上：' + ' '.join(missing))
    if skipped:
        print('用不上的文件：' + '、'.join(os.path.basename(x) for x in skipped[:8]))
    print('接着 node scripts/build.mjs，再提交 assets/ll-music/ 和 data/ll-music.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
