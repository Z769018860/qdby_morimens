#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""杀死守密人 —— 音频烘焙脚本。

把 freesound 的 CC0 素材裁成「4 首无缝循环音乐 + 一个音效精灵」，
输出到 assets/audio/keeper/，并打印 sprite 时间表（贴进 js/keeper/audio.js）。

源素材不入库（体积 + 授权可追溯性），需要重跑时：
  python scripts/keeper-audio.py --src <下载目录>
<下载目录> 里放 raw/<key>.mp3 与 manifest.json（见 --list 输出的 key）。

用法：
  python scripts/keeper-audio.py --list          # 列出需要的素材 key 与出处
  python scripts/keeper-audio.py --src D:/tmp/kp-audio
"""

import argparse
import json
import os
import subprocess
import sys
import wave

import numpy as np

SR = 32000              # 统一采样率：氛围与音效都够用，体积省一半
SRC_SR = 32000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'assets', 'audio', 'keeper')

# ---------------------------------------------------------------------------
# 素材出处：key -> (freesound sound id, 标题, 作者)
# 全部为 CC0 1.0（publicdomain/zero），见 assets/audio/keeper/NOTICE.md
# ---------------------------------------------------------------------------
SRC = {
    'music_box':     (693725, 'Music Box Creepy', 'composingatnight'),
    'music_dungeon': (516566, 'Dark Dungeon Ambience', 'Kinoton'),
    'music_dread':   (633956, 'Dark Thriller Horror Atmo Eerie Voice Drone', 'szegvari'),
    'music_calm':    (871722, 'TRUBBLE - Horror Tension Drone', 'zawert'),
    'sfx_page':      (856497, 'Turning page (heavy paper)', 'xkeril'),
    'sfx_paper':     (842183, 'Page Turn Free', 'AardsReal'),
    'sfx_door':      (402465, 'Door Open Close Heavy Wooden Loud Creak', 'LampEight'),
    'sfx_stairs':    (233065, 'Stairs.wav', 'LukeUPF'),
    'sfx_knife':     (573300, 'KNIFE - 1', 'SamuelGremaud'),
    'sfx_slash':     (35214, 'throatslashadd.wav', 'Abyssmal'),
    'sfx_whisper':   (234044, 'Creepy Whispering', 'RaspberryTickle'),
    'sfx_breath':    (221800, 'Ominous breathe', 'draperz'),
    'sfx_cat':       (485952, 'Cat Hissing', 'aunrea'),
    'sfx_stone':     (667283, 'Stone Scrape 2', 'alegemaate'),
    'sfx_glass':     (221528, 'Glass Break', 'unfa'),
    'sfx_clank':     (512475, 'Metallic clunk.wav', 'michael_grinnell'),
    'sfx_tinnitus':  (377206, 'tinnitus.mp3', 'tnturner'),
    'sfx_chain':     (401622, 'Chain Rattling - 1', 'Roxis_Boy'),
    'sfx_candle':    (242867, 'blowing out candle.wav', 'Reitanna'),
    'sfx_creak':     (502505, 'Wood Creak Single V1', 'Rudmer_Rotteveel'),
    'sfx_tick':      (412751, 'ticking of the clock 01.wav', 'blukotek'),
    'sfx_bell':      (438222, 'G20-07-Church Bell.wav', 'craigsmith'),
    'sfx_static':    (524109, 'Tv_radio_static.wav', 'OwennewO'),
    'sfx_drip':      (607071, 'Water droplets falling in a cave.wav', 'radioscoopfi'),
    'sfx_bone':      (869107, 'Bone Crack!', 'Robo9418'),
    'sfx_knock':     (457742, 'Low Pitch Knocking 1.wav', 'Osiruswaltz'),
    'sfx_wind':      (546871, 'ATM INT Wind Howl Cold Winter 09 (stereo).wav', 'Takkyi'),
}

# ---------------------------------------------------------------------------
# 音乐：源 key, 起点秒, 目标秒, 交叉淡化秒, 循环方式, 目标 RMS(dBFS)
#   loop = 首尾交叉淡化（drone/氛围，接缝听不出来）
#   fade = 结尾淡出到静音、开头淡入（有旋律的曲子，硬叠会把两句压在一起）
# 目标 RMS 都定在 -20 上下：换曲时音量不该跳。钟声类感知更响，单独压低 2 dB。
# ---------------------------------------------------------------------------
MUSIC = [
    ('theme', 'music_box',     2.0,  40.0, 2.5, 'fade', -22.0),
    ('night', 'music_dungeon', 22.0, 44.0, 2.5, 'loop', -20.0),
    ('dread', 'music_dread',   12.0, 40.0, 2.5, 'loop', -19.5),
    ('final', 'music_calm',    24.0, 40.0, 2.5, 'loop', -19.5),
]

# ---------------------------------------------------------------------------
# 音效精灵：key, 源 key, 入点, 出点, 响度档（0 轻 / 1 重）
# ---------------------------------------------------------------------------
SFX = [
    ('page',    'sfx_page',    0.20, 1.70, 0),
    ('paper',   'sfx_paper',   0.18, 0.48, 0),
    ('door',    'sfx_door',    0.00, 3.30, 1),
    ('step',    'sfx_stairs',  0.00, 2.40, 0),
    ('knife',   'sfx_knife',   0.02, 0.78, 1),
    ('slash',   'sfx_slash',   0.10, 2.00, 1),
    ('whisper', 'sfx_whisper', 0.50, 3.60, 0),
    ('breath',  'sfx_breath',  0.00, 2.60, 0),
    ('cat',     'sfx_cat',     0.00, 0.67, 1),
    ('stone',   'sfx_stone',   0.05, 1.35, 0),
    ('glass',   'sfx_glass',   0.28, 1.35, 1),
    ('clank',   'sfx_clank',   0.02, 0.90, 1),
    ('ring',    'sfx_tinnitus', 2.00, 4.60, 0),
    ('chain',   'sfx_chain',   0.10, 2.10, 0),
    ('candle',  'sfx_candle',  0.15, 0.70, 0),
    ('creak',   'sfx_creak',   0.00, 0.85, 0),
    ('tick',    'sfx_tick',    0.00, 2.00, 0),
    ('bell',    'sfx_bell',    0.00, 4.50, 1),
    ('static',  'sfx_static',  5.00, 6.80, 0),
    ('drip',    'sfx_drip',    0.90, 3.50, 0),
    ('bone',    'sfx_bone',    0.00, 0.31, 1),
    ('knock',   'sfx_knock',   0.25, 2.30, 1),
    ('wind',    'sfx_wind',    5.00, 8.50, 0),
]

GAP = 0.12          # 精灵内每段之间的静音，给 mp3 帧一点余量
PEAK_LOUD = 0.84    # -1.5 dBFS
PEAK_SOFT = 0.63    # -4.0 dBFS
MUSIC_PEAK = 0.72   # -2.8 dBFS


# ---------------------------------------------------------------------------
def ffmpeg():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return 'ffmpeg'


def read_wav(path):
    with wave.open(path) as w:
        n, sr, ch = w.getnframes(), w.getframerate(), w.getnchannels()
        a = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float32) / 32768.0
    if ch > 1:
        a = a.reshape(-1, ch).mean(axis=1)
    if sr != SRC_SR:
        idx = np.arange(int(len(a) * SRC_SR / sr)) * sr / SRC_SR
        a = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
    return a


def decode(src_dir, key):
    """raw/<key>.mp3 -> 32k 单声道 float32（用 ffmpeg 解，缓存成 wav）。"""
    raw = os.path.join(src_dir, 'raw', key + '.mp3')
    tmp = os.path.join(src_dir, 'wav', key + '.wav')
    if not os.path.exists(raw):
        sys.exit('missing source: %s' % raw)
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    if not os.path.exists(tmp) or os.path.getmtime(tmp) < os.path.getmtime(raw):
        subprocess.run([ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error',
                        '-i', raw, '-ac', '1', '-ar', str(SRC_SR),
                        '-c:a', 'pcm_s16le', tmp], check=True)
    return read_wav(tmp)


def write_wav(path, a):
    a = np.clip(a, -1.0, 1.0)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((a * 32767).astype('<i2').tobytes())


def encode_mp3(wav_path, mp3_path, kbps):
    subprocess.run([ffmpeg(), '-y', '-hide_banner', '-loglevel', 'error',
                    '-i', wav_path, '-ac', '1', '-ar', str(SR),
                    '-codec:a', 'libmp3lame', '-b:a', '%dk' % kbps,
                    mp3_path], check=True)


def rafade(a, ms):
    """两端升余弦淡入淡出，杀掉拼接处的爆音。"""
    n = int(SR * ms / 1000.0)
    if n < 2:
        return a
    n = min(n, len(a) // 2)
    r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, n)).astype(np.float32)
    a = a.copy()
    a[:n] *= r
    a[-n:] *= r[::-1]
    return a


def normalize(a, peak):
    m = float(np.abs(a).max())
    return a if m < 1e-6 else (a * (peak / m)).astype(np.float32)


def loudnorm(a, target_db, ceil=0.70):
    """按 RMS 拉平音量，再用 tanh 软限幅压住尖峰。

    只用峰值归一不够：稀疏的钟声和密实的低频 drone 峰值相同，听着能差 10 dB，
    换曲时会明显一跳。这里统一按 RMS，并用 tanh 把超出的峰压回去（不硬削）。
    """
    rms = float(np.sqrt(np.mean(a ** 2)))
    if rms < 1e-7:
        return a
    g = 10 ** ((target_db - 20 * np.log10(rms)) / 20.0)
    y = a * g
    if float(np.abs(y).max()) > ceil:
        y = np.tanh(y / ceil) * ceil
    return y.astype(np.float32)


def loopify(a, target_sec, xfade_sec):
    """取 target 长度的材料，把「接缝之后的多余部分」交叉淡化回开头，做成无缝循环。

    播放到结尾时样本值 ≈ 开头样本值，循环点听不出来。
    """
    L = int(SR * target_sec)
    OV = int(SR * xfade_sec)
    if len(a) < L + OV:
        a = np.pad(a, (0, L + OV - len(a)))
    x = a[:L + OV]
    out = x[:L].copy()
    r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, OV)).astype(np.float32)
    out[:OV] = x[:OV] * r + x[L:L + OV] * (1.0 - r)
    return out


def fadify(a, target_sec, fade_in=1.2, fade_out=3.2):
    """有旋律的曲子：结尾淡到静音、开头从静音起，循环时是「一遍完了，再起一遍」。"""
    L = int(SR * target_sec)
    out = a[:L].copy()
    if len(out) < L:
        out = np.pad(out, (0, L - len(out)))
    ni, no = int(SR * fade_in), int(SR * fade_out)
    out[:ni] *= (0.5 - 0.5 * np.cos(np.linspace(0, np.pi, ni))).astype(np.float32)
    out[-no:] *= (0.5 + 0.5 * np.cos(np.linspace(0, np.pi, no))).astype(np.float32)
    return out


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', help='下载目录（含 raw/<key>.mp3）')
    ap.add_argument('--list', action='store_true', help='只列出需要的素材')
    args = ap.parse_args()

    if args.list:
        print('%-10s %-8s %-46s %s' % ('KEY', 'SOUND', 'TITLE', 'AUTHOR'))
        for k, (sid, title, who) in sorted(SRC.items()):
            print('%-10s %-8d %-46s %s' % (k, sid, title[:46], who))
        return

    if not args.src:
        ap.error('need --src DIR (or --list)')
    src = args.src
    os.makedirs(OUT, exist_ok=True)
    tmpdir = os.path.join(src, 'bake')
    os.makedirs(tmpdir, exist_ok=True)

    # ---- 音乐
    print('== music')
    for name, key, start, dur, xf, mode, trem in MUSIC:
        a = decode(src, key)
        s = int(start * SR)
        seg = a[s:]
        seg = fadify(seg, dur) if mode == 'fade' else loopify(seg, dur, xf)
        seg = loudnorm(seg, trem)
        wav = os.path.join(tmpdir, name + '.wav')
        write_wav(wav, seg)
        mp3 = os.path.join(OUT, name + '.mp3')
        encode_mp3(wav, mp3, 48)
        print('  %-6s %5.1fs  %6.1f KB' % (name, len(seg) / SR, os.path.getsize(mp3) / 1024))

    # ---- 音效精灵
    print('== sfx sprite')
    parts, table, cursor = [], {}, 0.0
    for name, key, t0, t1, loud in SFX:
        a = decode(src, key)
        seg = a[int(t0 * SR):int(t1 * SR)]
        seg = normalize(rafade(seg, 8), PEAK_LOUD if loud else PEAK_SOFT)
        if loud:
            seg = normalize(rafade(seg, 8), PEAK_LOUD)
        parts.append(seg)
        table[name] = {'o': round(cursor, 3), 'd': round(len(seg) / SR, 3)}
        cursor += len(seg) / SR + GAP
        parts.append(np.zeros(int(GAP * SR), dtype=np.float32))
    sprite = np.concatenate(parts)
    wav = os.path.join(tmpdir, 'sfx.wav')
    write_wav(wav, np.clip(sprite, -1, 1))
    mp3 = os.path.join(OUT, 'sfx.mp3')
    encode_mp3(wav, mp3, 64)
    print('  sfx    %5.1fs  %6.1f KB  (%d 段)' % (len(sprite) / SR, os.path.getsize(mp3) / 1024, len(SFX)))

    # ---- 时间表（贴进 js/keeper/audio.js 的 SPRITE）
    print('== SPRITE table (paste into js/keeper/audio.js)')
    lines = []
    for k, v in table.items():
        lines.append("  %s: [%s, %s]," % (k, v['o'], v['d']))
    print('\n'.join(lines))
    with open(os.path.join(OUT, 'sprite.json'), 'w', encoding='utf-8') as f:
        json.dump({'sr': SR, 'total': round(len(sprite) / SR, 3), 'items': table},
                  f, ensure_ascii=False, indent=1)

    # ---- NOTICE
    rows = []
    for k, (sid, title, who) in sorted(SRC.items()):
        rows.append('| `%s` | %s | %s | https://freesound.org/people/%s/sounds/%d/ |' % (k, who, title, who, sid))
    notice = ('# 音频素材出处\n\n'
              '《杀死守密人》的音乐与音效全部取自 [freesound.org](https://freesound.org/) 的 **CC0 1.0**\n'
              '（公有领域献出）素材，裁剪、交叉淡化、响度归一后重新编码，未做其它改动。\n'
              'CC0 不要求署名，此处列出出处只为可追溯。\n\n'
              '| 源 key | 作者 | 原始标题 | 链接 |\n|---|---|---|---|\n'
              + '\n'.join(rows) +
              '\n\n烘焙脚本：`scripts/keeper-audio.py`（`--list` 可打印上面这张表并给出下载用的 sound id）。\n')
    with open(os.path.join(OUT, 'NOTICE.md'), 'w', encoding='utf-8', newline='') as f:
        f.write(notice)
    print('== done:', OUT)


if __name__ == '__main__':
    main()
