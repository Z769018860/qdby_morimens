// 曲库原曲包：仓库里放的是加过密的音频块，页面拿到之后在本地解开。
//
// 为什么要这样：音游最好听的是原曲，但公开仓库直接放 mp3 等于把唱片重新分发一遍。
// 这里做成「加密打包 + 浏览器内解密」——资源包里没有能直接播放的文件，
// 顺手拖出来的也是一堆密文。要说清楚的是：**这不是版权保护**，
// 密钥就在这个脚本里，任何肯读代码的人都能解开；它只是让仓库里不出现裸音频，
// 也避免被当成公开下载源。曲目版权归原权利人所有，仓库只做同人小游戏的技术演示。
//
// 包格式（scripts/ll-music.py 生成，别手改）：
//   [0..8)  魔数 "MBLLPK1\n"
//   [8..20) AES-GCM 的 12 字节 IV
//   [20..]  密文（尾部 16 字节是 GCM tag）
//
// 口令走 SHA-256 当密钥：Python 和 WebCrypto 两边算出来必须是同一串。
// 改口令 = 之前打的所有包全部作废，得重跑脚本。

import { aesGcmCtr, looksAudio } from './aesjs.js';

const MAGIC = 'MBLLPK1\n';
// 口令拆成几段拼起来，纯粹为了不让它在源码里以整串明文出现（还是那句话：不是保护）
const PASS = ['mori', 'mens', '\u2605', 'love', 'live', '-pack-1'].join('');

// 纯 JS 解密用的密钥字节：就是上面那段口令的 SHA-256，和 WebCrypto 那条路
// digest 出来的是同一串（'1b255e8e…'）。写死是因为没有 subtle 的时候也就没有
// digest，为了省掉一套纯 JS 的 SHA-256 实现——真要改口令，这里得跟着改。
const KEY32 = (() => {
  const hex = '1b255e8ee4ed6c3b3307c8e313026ab08568618591b1a2d87086e6c482633cb8';
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
  return b;
})();

const CACHE = new Map();          // id -> ArrayBuffer（只留最近两份，别把内存吃光）
const enc = new TextEncoder();
let keyP = null;
let keyS = null;                  // 这份 key 是拿哪个 subtle 算出来的

// 为什么要有 why()：手机上一旦取包/解密失败，页面会安静地退回芯片合成，
// 用户只听见「电子音」却不知道坏在哪一步。把原因留在这里，暂停面板直接显示。
let lastWhy = '';
export function why() { return lastWhy; }
// 上一次是走哪条路解开的：'wc' = WebCrypto，'js' = 纯 JS 兜底。
// 面板上写一句「纯 JS 解密」比让用户以为卡住要好。
let lastHow = '';
export function how() { return lastHow; }

// WebCrypto：iOS 11 之前叫 crypto.webkitSubtle；某些手机内置浏览器两个都没有
// （常见于非 https 打开），那时只能退回芯片合成。
function subtleOf() {
  const c = window.crypto;
  if (!c) return null;
  return c.subtle || c.webkitSubtle || null;
}

function getKey(s) {
  if (keyP && keyS === s) return keyP;
  keyS = s;
  keyP = s.digest('SHA-256', enc.encode(PASS))
    .then((h) => s.importKey('raw', h, { name: 'AES-GCM' }, false, ['decrypt']));
  return keyP;
}

// 解一个包：返回 ArrayBuffer（音频原始字节）。没有包 / 不是包 / 解不开都返回 null，
// 调用方退回芯片改编，页面不能因此挂掉。
export async function unpack(buf) {
  lastWhy = '';
  if (!buf || buf.byteLength < 32) { lastWhy = '包不对（太短）'; return null; }
  const head = new Uint8Array(buf, 0, 8);
  for (let i = 0; i < MAGIC.length; i++) {
    if (head[i] !== MAGIC.charCodeAt(i)) { lastWhy = '取回来的不是原曲包'; return null; }
  }
  const iv = new Uint8Array(buf.slice(8, 20));
  const body = buf.slice(20);
  // ① 有 WebCrypto 就先走它：快，而且 GCM 的 tag 顺带做了完整性校验。
  const s = subtleOf();
  if (s) {
    try {
      const key = await getKey(s);
      const plain = await s.decrypt({ name: 'AES-GCM', iv }, key, body);
      if (looksAudio(new Uint8Array(plain, 0, Math.min(16, plain.byteLength)))) { lastHow = 'wc'; return plain; }
      lastWhy = 'WebCrypto 解出来的不是音频';
    } catch (e) {
      lastWhy = 'WebCrypto 解不开：' + ((e && (e.name || e.message)) || e);
    }
  }
  // ② 没有 subtle、或者它解不开——纯 JS 再算一遍。
  //    手机从 http 打开、或者内置浏览器把 crypto.subtle 关掉时就落到这里：
  //    以前到这一步就只剩芯片合成了，玩家听到的全是电子音。
  try {
    const plain = aesGcmCtr(KEY32, iv, new Uint8Array(body, 0, body.byteLength - 16));
    if (looksAudio(plain)) { lastWhy = ''; lastHow = 'js'; return plain.buffer; }
    lastWhy = (lastWhy ? lastWhy + '；' : '') + '解出来的不是音频（包与密钥不匹配）';
  } catch (e) {
    lastWhy = (lastWhy ? lastWhy + '；' : '') + '纯 JS 解密失败：' + ((e && e.message) || e);
  }
  return null;
}

// 取某个曲子的原曲包字节。PACKS 是构建时从 data/ll-music.json 生成的清单。
export async function fetchPack(packs, id) {
  const meta = packs && packs[id];
  if (!meta || !meta.file) { lastWhy = '这首没有原曲包'; return null; }
  if (CACHE.has(id)) return CACHE.get(id);
  const want = (meta.kb || 0) * 1024;
  // 两次尝试：第一次带 no-cache（有 304 就复用，省流量）；万一拿回来的是缓存里
  // 躺着的旧包 / 上次没下完的截断包（手机上换网、后台被杀都很常见），
  // 第二次换成带时间戳的 URL 硬重下 —— 这条能绕开所有中间缓存与 Service Worker。
  const tries = [
    { url: meta.file, cache: 'no-cache' },
    { url: meta.file + (meta.file.includes('?') ? '&' : '?') + 'r=' + Date.now(), cache: 'reload' },
  ];
  for (const t of tries) {
    let raw = null;
    try {
      const r = await fetch(t.url, { cache: t.cache });
      if (!r.ok) { lastWhy = '取包失败 HTTP ' + r.status; continue; }
      raw = await r.arrayBuffer();
    } catch (e) {
      lastWhy = '取包失败：' + ((e && e.message) || e);
      continue;
    }
    // 长度对不上就当这份不能用（清单里记着 kb，正好拿来校验）
    if (want > 0 && Math.abs(raw.byteLength - want) > want * 0.05) {
      lastWhy = '包长度不对（' + raw.byteLength + ' / ' + want + '）';
      continue;
    }
    const plain = await unpack(raw);
    if (!plain) continue;
    lastWhy = '';
    CACHE.set(id, plain);
    while (CACHE.size > 2) CACHE.delete(CACHE.keys().next().value);
    return plain;
  }
  return null;
}

export function hasPack(packs, id) {
  return !!(packs && packs[id] && packs[id].file);
}
