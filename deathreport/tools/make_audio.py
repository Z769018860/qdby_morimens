#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成死亡游戏调查报告的音效素材（不依赖任何第三方库）。

  python tools/make_audio.py

输出到 deathreport/audio/*.wav：22050Hz / 单声道 / 16bit。
这些都是合成出来的短音效：键入、翻页、复原、错误、盖章、钟声、消息。
环境音（低频 drone + 远处的钟摆）不落盘，由 js/audio.js 用 WebAudio 实时合成——
那样既能每届换音色，也不用让手机上多下载几百 KB 的循环音频。
"""
import math
import os
import random
import struct
import wave

SR = 22050
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'audio')


def write(name, buf):
    """buf: -1..1 的浮点列表"""
    peak = max(1e-6, max(abs(x) for x in buf))
    k = 0.86 / peak if peak > 0 else 0
    data = b''.join(struct.pack('<h', int(max(-1, min(1, x * k)) * 32767)) for x in buf)
    path = os.path.join(OUT, name)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data)
    print(f'{name:12} {len(buf) / SR:.2f}s  {len(data) / 1024:.1f}KB')


def n(sec):
    return int(SR * sec)


def env_d(i, total, attack=0.004, decay=None):
    """快起音 + 指数衰减"""
    t = i / SR
    a = min(1.0, t / attack) if attack else 1.0
    d = math.exp(-t / (decay if decay is not None else total / 4))
    return a * d


def space(buf, taps=((0.031, .38), (0.047, .27), (0.071, .18))):
    """廉价的空间感：几个衰减的延迟抽头再混回去"""
    out = list(buf)
    for wait, gain in taps:
        d = int(wait * SR)
        for i in range(len(buf) - d):
            out[i + d] += buf[i] * gain
    return out


def lowpass(buf, k=0.25):
    """一阶低通；k 越小越闷"""
    y, out = 0.0, []
    for x in buf:
        y += (x - y) * k
        out.append(y)
    return out


def highpass(buf, k=0.15):
    y, prev, out = 0.0, 0.0, []
    for x in buf:
        y = k * (y + x - prev)
        prev = x
        out.append(y)
    return out


random.seed(7)


# ---------------------------------------------------------------- 键入：很轻的机械咔嗒
def make_key():
    total, out = 0.055, []
    for i in range(n(total)):
        t = i / SR
        noise = (random.random() * 2 - 1) * math.exp(-t / 0.004)
        body = math.sin(2 * math.pi * 1850 * t) * math.exp(-t / 0.010)
        thud = math.sin(2 * math.pi * 320 * t) * math.exp(-t / 0.018) * 0.35
        out.append((noise * 0.55 + body * 0.35 + thud) * 0.5)
    write('key.wav', highpass(out, 0.22))


# ---------------------------------------------------------------- 翻页 / 打开档案
def make_paper():
    total, out = 0.38, []
    for i in range(n(total)):
        t = i / SR
        grain = (random.random() * 2 - 1)
        e = (math.exp(-((t - 0.02) ** 2) / 0.0016) + 0.75 * math.exp(-((t - 0.13) ** 2) / 0.0045)) * (1 - t / total) ** 1.5
        out.append(grain * e * 0.55)
    return write('paper.wav', space(lowpass(highpass(out, 0.05), 0.55)))


# ---------------------------------------------------------------- 复原成功：三音上行
def make_chime():
    total, out = 1.15, []
    notes = [(659.3, 0.0, 0.34), (987.8, 0.085, 0.30), (1318.5, 0.17, 0.26)]
    for i in range(n(total)):
        t = i / SR
        s = 0.0
        for f, at, dec in notes:
            if t < at:
                continue
            u = t - at
            e = math.exp(-u / dec) * min(1.0, u / 0.006) * 0.34
            s += e * (math.sin(2 * math.pi * f * u) + 0.32 * math.sin(2 * math.pi * f * 2.01 * u) + 0.14 * math.sin(2 * math.pi * f * 3.02 * u))
        out.append(s)
    return write('chime.wav', space(out))


# ---------------------------------------------------------------- 错误：一声闷响
def make_buzz():
    total, out = 0.30, []
    for i in range(n(total)):
        t = i / SR
        e = math.exp(-t / 0.075) * min(1.0, t / 0.003)
        sq = 1.0 if math.sin(2 * math.pi * 132 * t) >= 0 else -1.0
        noise = (random.random() * 2 - 1) * 0.25
        out.append((sq * 0.5 + noise) * e * 0.55)
    return write('buzz.wav', lowpass(out, 0.42))


# ---------------------------------------------------------------- 盖章：确认报告
def make_stamp():
    total, out = 0.42, []
    for i in range(n(total)):
        t = i / SR
        thump = math.sin(2 * math.pi * (78 - 26 * min(1, t / 0.12)) * t) * math.exp(-t / 0.115)
        slap = (random.random() * 2 - 1) * math.exp(-t / 0.012) * 0.5
        out.append(thump * 0.85 + slap)
    return write('stamp.wav', space(lowpass(out, 0.5), ((0.019, .26), (0.037, .16))))


# ---------------------------------------------------------------- 钟声：共鸣 / 结局
def make_bell():
    total, out = 2.4, []
    partials = [(196.0, 1.0, 0.95), (392.4, 0.42, 0.62), (587.3, 0.26, 0.46),
                (783.0, 0.16, 0.34), (1174.0, 0.10, 0.22), (1567.0, 0.06, 0.15)]
    for i in range(n(total)):
        t = i / SR
        s = 0.0
        for f, amp, dec in partials:
            s += amp * math.exp(-t / dec) * math.sin(2 * math.pi * f * t)
        # 起音的那一下金属噪声
        s += (random.random() * 2 - 1) * math.exp(-t / 0.008) * 0.18
        out.append(s * min(1.0, t / 0.004))
    return write('bell.wav', space(out, ((0.043, .3), (0.089, .22), (0.157, .14))))


# ---------------------------------------------------------------- 消息送达：两声短提示
def make_msg():
    total, out = 0.62, []
    for i in range(n(total)):
        t = i / SR
        s = 0.0
        for f, at in ((880.0, 0.0), (1174.7, 0.13)):
            if t < at:
                continue
            u = t - at
            s += math.exp(-u / 0.11) * min(1.0, u / 0.005) * (math.sin(2 * math.pi * f * u) + 0.3 * math.sin(2 * math.pi * f * 2 * u)) * 0.4
        out.append(s)
    return write('msg.wav', space(out))


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    make_key(); make_paper(); make_chime(); make_buzz(); make_stamp(); make_bell(); make_msg()
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f'共 {total / 1024:.0f} KB')
