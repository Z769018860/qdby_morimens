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

const MAGIC = 'MBLLPK1\n';
// 口令拆成几段拼起来，纯粹为了不让它在源码里以整串明文出现（还是那句话：不是保护）
const PASS = ['mori', 'mens', '\u2605', 'love', 'live', '-pack-1'].join('');

const CACHE = new Map();          // id -> ArrayBuffer（只留最近两份，别把内存吃光）
const enc = new TextEncoder();
let keyP = null;

function haveCrypto() {
  return !!(window.crypto && window.crypto.subtle && window.crypto.subtle.importKey);
}

function getKey() {
  if (!keyP) {
    keyP = window.crypto.subtle
      .digest('SHA-256', enc.encode(PASS))
      .then((h) => window.crypto.subtle.importKey('raw', h, { name: 'AES-GCM' }, false, ['decrypt']));
  }
  return keyP;
}

// 解一个包：返回 ArrayBuffer（音频原始字节）。没有包 / 不是包 / 解不开都返回 null，
// 调用方退回芯片改编，页面不能因此挂掉。
export async function unpack(buf) {
  if (!buf || buf.byteLength < 32) return null;
  const head = new Uint8Array(buf, 0, 8);
  for (let i = 0; i < MAGIC.length; i++) if (head[i] !== MAGIC.charCodeAt(i)) return null;
  if (!haveCrypto()) return null;
  const iv = new Uint8Array(buf, 8, 12);
  const body = new Uint8Array(buf, 20);
  try {
    const key = await getKey();
    return await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, body);
  } catch (e) {
    return null;
  }
}

// 取某个曲子的原曲包字节。PACKS 是构建时从 data/ll-music.json 生成的清单。
export async function fetchPack(packs, id) {
  const meta = packs && packs[id];
  if (!meta || !meta.file) return null;
  if (CACHE.has(id)) return CACHE.get(id);
  let raw = null;
  try {
    const r = await fetch(meta.file, { cache: 'force-cache' });
    if (!r.ok) return null;
    raw = await r.arrayBuffer();
  } catch (e) {
    return null;
  }
  const plain = await unpack(raw);
  if (!plain) return null;
  CACHE.set(id, plain);
  while (CACHE.size > 2) CACHE.delete(CACHE.keys().next().value);
  return plain;
}

export function hasPack(packs, id) {
  return !!(packs && packs[id] && packs[id].file);
}
