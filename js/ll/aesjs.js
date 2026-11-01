// 纯 JS 的 AES-256-CTR：给「没有 crypto.subtle」的环境留一条能解出原曲的路。
//
// 为什么需要它：crypto.subtle 只在安全上下文（https / localhost / file）里存在。
// 手机上从 http 打开、或者用的是某些内置浏览器（QQ / UC / 老 WebView），
// 这个对象直接是 undefined，WebCrypto 那条路连钥匙都拿不到，页面就只剩芯片合成，
// 玩家听到的全是电子音。包里的口令、格式都没有变，这里只是把 GCM 的 CTR 段
// 用纯 JS 再算一遍——解出来的字节和 WebCrypto 那条路完全一样。
//
// 只做加密方向：GCM 的正文就是 CTR 模式的密钥流异或，用不到解密的 InvMixColumns。
// T 表实现，手机上一次 4MB 大约 100~300ms，只发生在开歌那一下。
//
// 注意：不做 GCM 的 tag 校验（GHASH 要再写一套 GF(2^128) 乘法，为这点完整性不值）。
// 解错时结果是乱码，由调用方的 looksAudio() 嗅魔数挡住，然后照旧退回芯片合成。

const SBOX = new Uint8Array(256);
const T0 = new Uint32Array(256);
const T1 = new Uint32Array(256);
const T2 = new Uint32Array(256);
const T3 = new Uint32Array(256);

function mul2(b) { return ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 0xff; }
function rotl8(x, n) { return ((x << n) | (x >> (8 - n))) & 0xff; }

(function buildTables() {
  // S 盒：GF(2^8) 的逆元再套仿射变换。p 走 3 的幂、q 走逆元，一圈覆盖所有非零元。
  let p = 1, q = 1;
  do {
    p = (p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)) & 0xff;
    // 每一步都得截到 8 位：C 里 q 是 uint8_t，赋值天然会砍掉高位，
    // JS 不砍的话后面 q<<2 / q<<4 会带着溢出位，整个 S 盒就歪了
    q = (q ^ (q << 1)) & 0xff;
    q = (q ^ (q << 2)) & 0xff;
    q = (q ^ (q << 4)) & 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = (q ^ rotl8(q, 1) ^ rotl8(q, 2) ^ rotl8(q, 3) ^ rotl8(q, 4)) & 0xff;
    SBOX[p] = x ^ 0x63;
  } while (p !== 1);
  SBOX[0] = 0x63;

  for (let i = 0; i < 256; i++) {
    const s = SBOX[i];
    const s2 = mul2(s);
    const s3 = s2 ^ s;
    T0[i] = ((s2 << 24) | (s << 16) | (s << 8) | s3) >>> 0;
    T1[i] = ((s3 << 24) | (s2 << 16) | (s << 8) | s) >>> 0;
    T2[i] = ((s << 24) | (s3 << 16) | (s2 << 8) | s) >>> 0;
    T3[i] = ((s << 24) | (s << 16) | (s3 << 8) | s2) >>> 0;
  }
})();

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// AES-256：8 个 32 位字一段，14 轮
function expandKey(key) {
  const Nk = 8, Nr = 14;
  const w = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    w[i] = ((key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3]) >>> 0;
  }
  const subWord = (t) => ((SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 255] << 16)
    | (SBOX[(t >>> 8) & 255] << 8) | SBOX[t & 255]) >>> 0;
  for (let i = Nk; i < w.length; i++) {
    let t = w[i - 1];
    if (i % Nk === 0) {
      t = ((t << 8) | (t >>> 24)) >>> 0;                    // RotWord
      t = (subWord(t) ^ (RCON[(i / Nk | 0) - 1] << 24)) >>> 0;
    } else if (i % Nk === 4) {
      t = subWord(t);                                       // AES-256 独有的那半步
    }
    w[i] = (w[i - Nk] ^ t) >>> 0;
  }
  return { w, Nr };
}

// 加密一个 16 字节块：状态按列存成四个 u32，字节 0 在最高位
function encBlock(w, Nr, src, so, dst, dO) {
  let s0 = ((src[so] << 24) | (src[so + 1] << 16) | (src[so + 2] << 8) | src[so + 3]) ^ w[0];
  let s1 = ((src[so + 4] << 24) | (src[so + 5] << 16) | (src[so + 6] << 8) | src[so + 7]) ^ w[1];
  let s2 = ((src[so + 8] << 24) | (src[so + 9] << 16) | (src[so + 10] << 8) | src[so + 11]) ^ w[2];
  let s3 = ((src[so + 12] << 24) | (src[so + 13] << 16) | (src[so + 14] << 8) | src[so + 15]) ^ w[3];
  for (let r = 1; r < Nr; r++) {
    const k = r << 2;
    const t0 = (T0[s0 >>> 24] ^ T1[(s1 >>> 16) & 255] ^ T2[(s2 >>> 8) & 255] ^ T3[s3 & 255] ^ w[k]) >>> 0;
    const t1 = (T0[s1 >>> 24] ^ T1[(s2 >>> 16) & 255] ^ T2[(s3 >>> 8) & 255] ^ T3[s0 & 255] ^ w[k + 1]) >>> 0;
    const t2 = (T0[s2 >>> 24] ^ T1[(s3 >>> 16) & 255] ^ T2[(s0 >>> 8) & 255] ^ T3[s1 & 255] ^ w[k + 2]) >>> 0;
    const t3 = (T0[s3 >>> 24] ^ T1[(s0 >>> 16) & 255] ^ T2[(s1 >>> 8) & 255] ^ T3[s2 & 255] ^ w[k + 3]) >>> 0;
    s0 = t0; s1 = t1; s2 = t2; s3 = t3;
  }
  // 末轮：只做 SubBytes + ShiftRows，不再 MixColumns，最后照样要 AddRoundKey。
  // （漏掉最后这一步的话，结果看起来一样是「一片随机字节」，但谁也认不出来。）
  const k = Nr << 2;
  const r0 = w[k], r1 = w[k + 1], r2 = w[k + 2], r3 = w[k + 3];
  dst[dO] = SBOX[s0 >>> 24] ^ (r0 >>> 24);
  dst[dO + 1] = SBOX[(s1 >>> 16) & 255] ^ ((r0 >>> 16) & 255);
  dst[dO + 2] = SBOX[(s2 >>> 8) & 255] ^ ((r0 >>> 8) & 255);
  dst[dO + 3] = SBOX[s3 & 255] ^ (r0 & 255);
  dst[dO + 4] = SBOX[s1 >>> 24] ^ (r1 >>> 24);
  dst[dO + 5] = SBOX[(s2 >>> 16) & 255] ^ ((r1 >>> 16) & 255);
  dst[dO + 6] = SBOX[(s3 >>> 8) & 255] ^ ((r1 >>> 8) & 255);
  dst[dO + 7] = SBOX[s0 & 255] ^ (r1 & 255);
  dst[dO + 8] = SBOX[s2 >>> 24] ^ (r2 >>> 24);
  dst[dO + 9] = SBOX[(s3 >>> 16) & 255] ^ ((r2 >>> 16) & 255);
  dst[dO + 10] = SBOX[(s0 >>> 8) & 255] ^ ((r2 >>> 8) & 255);
  dst[dO + 11] = SBOX[s1 & 255] ^ (r2 & 255);
  dst[dO + 12] = SBOX[s3 >>> 24] ^ (r3 >>> 24);
  dst[dO + 13] = SBOX[(s0 >>> 16) & 255] ^ ((r3 >>> 16) & 255);
  dst[dO + 14] = SBOX[(s1 >>> 8) & 255] ^ ((r3 >>> 8) & 255);
  dst[dO + 15] = SBOX[s2 & 255] ^ (r3 & 255);
}

// AES-GCM 的正文 = AES-CTR(J0+1)，J0 = iv || 0x00000001，12 字节 IV 时正好是
// 「iv 后面补 00 00 00 02」开头，之后只递增最后 4 字节。
export function aesGcmCtr(key, iv, ct) {
  const { w, Nr } = expandKey(key);
  const ctr = new Uint8Array(16);
  ctr.set(iv.subarray(0, 12));
  ctr[15] = 2;
  const ks = new Uint8Array(16);
  const out = new Uint8Array(ct.length);
  for (let off = 0; off < ct.length; off += 16) {
    encBlock(w, Nr, ctr, 0, ks, 0);
    const n = Math.min(16, ct.length - off);
    for (let i = 0; i < n; i++) out[off + i] = ct[off + i] ^ ks[i];
    for (let i = 15; i >= 12; i--) {
      ctr[i] = (ctr[i] + 1) & 0xff;
      if (ctr[i]) break;
    }
  }
  return out;
}

// 解出来的到底是不是音频：只认几个开头的魔数。
// 这一步替代了 GCM 的 tag 校验——密钥/IV 不对时算出来的是噪声，解不出可播的头。
export function looksAudio(b) {
  if (!b || b.length < 12) return false;
  const be = (o, s) => {
    for (let i = 0; i < s.length; i++) if (b[o + i] !== s.charCodeAt(i)) return false;
    return true;
  };
  if (be(0, 'ID3')) return true;                       // mp3 带标签
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return true;   // mp3 裸帧同步字
  if (be(4, 'ftyp')) return true;                      // m4a / mp4
  if (be(0, 'OggS')) return true;
  if (be(0, 'fLaC')) return true;
  if (be(0, 'RIFF')) return true;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true;   // webm
  return false;
}
