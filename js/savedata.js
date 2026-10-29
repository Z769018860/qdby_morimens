// 加密存档：本机 localStorage → AES-GCM 包 → .zjtt 文件，反方向也能走。
//
// 这套逻辑原本只写在 src/pages/offline.html 的内联脚本里，结果是：
// 从离线版/桌面版导出来的文件，换设备后必须回到「离线版」那一页才找得到导入按钮，
// 而用户真正想做的事是「登录后把离线数据并进账号」，那一步在个人中心。所以抽成模块。
//
// 格式必须与 offline.html 那份完全一致，谁改了都要两边一起改：
//   app='zjtt-save', v=1, kdf=PBKDF2-SHA256/200000, 正文 AES-GCM 256
//
// 注意：crypto.subtle 只在安全上下文（https / localhost / 127.0.0.1）里有值，
// 用局域网 IP 走 http 打开时它是 undefined，这时要明确告诉用户，而不是抛 TypeError。

export const SAVE_APP = 'zjtt-save';
export const MIN_PASS = 6;

// zjtt: 是本站主命名空间；morimens- 是挂机版（idle）和死亡调查报告（deathreport）的存档，
// 它们历史原因没加 zjtt: 前缀，早期导出漏了这两个，换设备就丢进度。
export const PREFIXES = ['zjtt:', 'morimens-'];

export const secure = () => !!(globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.getRandomValues);

export const UNSAFE_MSG = '当前地址不是安全上下文（要用 https，或 localhost / 127.0.0.1 打开），浏览器不给用加密接口。';

const isMine = (k) => !!k && PREFIXES.some((p) => k.startsWith(p));

function b64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  // 一次拼一大段，避免逐字节 += 在几 MB 的存档上卡死
  const CH = 0x8000;
  for (let i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
  return btoa(s);
}

function unb64(str) {
  const s = atob(str);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

function derive(pass, salt) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
    .then((km) => crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
    ));
}

// 本机所有属于本站的键（原样取出，不解码）
export function collect() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!isMine(k)) continue;
      out[k] = localStorage.getItem(k);
    }
  } catch { /* 隐私模式读不了就返回空 */ }
  return out;
}

export const count = () => Object.keys(collect()).length;

export function fileName(now = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `忘忘存档-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.zjtt`;
}

// 导出：返回 { blob, name, count }，下载交给调用方（要用户手势触发 a.click）
export async function exportPack(pass) {
  if (!secure()) throw new Error(UNSAFE_MSG);
  if (String(pass || '').length < MIN_PASS) throw new Error(`密码至少 ${MIN_PASS} 位。`);
  const data = collect();
  const keys = Object.keys(data);
  if (!keys.length) throw new Error('本机还没有可导出的存档。');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({
    app: SAVE_APP, v: 1, at: Date.now(), url: location.origin, data,
  }));
  const key = await derive(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const pack = {
    app: SAVE_APP,
    v: 1,
    at: Date.now(),
    kdf: { alg: 'PBKDF2-SHA256', iter: 200000, salt: b64(salt) },
    iv: b64(iv),
    ct: b64(ct),
  };
  return {
    blob: new Blob([JSON.stringify(pack)], { type: 'application/octet-stream' }),
    name: fileName(),
    count: keys.length,
    keys,
  };
}

// 解密但先不落盘：让调用方先看清「会覆盖什么」再决定
export async function readPack(file, pass) {
  if (!secure()) throw new Error(UNSAFE_MSG);
  if (String(pass || '').length < MIN_PASS) throw new Error(`先填导出时用的密码（至少 ${MIN_PASS} 位）。`);
  let pack;
  try {
    pack = JSON.parse(await file.text());
  } catch {
    throw new Error('这不是有效的存档文件（读不出 JSON）。');
  }
  if (!pack || pack.app !== SAVE_APP || !pack.kdf || !pack.ct) throw new Error('不是本站导出的存档文件。');
  const key = await derive(pass, unb64(pack.kdf.salt));
  let buf;
  try {
    buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pack.iv) }, key, unb64(pack.ct));
  } catch {
    throw new Error('密码不对，或者文件被改过。');
  }
  const doc = JSON.parse(new TextDecoder().decode(buf));
  const data = doc && doc.data && typeof doc.data === 'object' ? doc.data : {};
  const keys = Object.keys(data).filter(isMine);
  return { at: Number(doc.at) || 0, data, keys };
}

// 落盘：只写属于本站的键，别的（比如别人的站点数据）不碰
export function write(doc) {
  const data = (doc && doc.data) || {};
  let n = 0;
  for (const k of Object.keys(data)) {
    if (!isMine(k)) continue;
    try { localStorage.setItem(k, data[k]); n++; } catch { /* 配额满了就停 */ }
  }
  return n;
}

// 一步到位：读文件 + 解密 + 落盘
export async function importPack(file, pass) {
  const doc = await readPack(file, pass);
  const n = write(doc);
  if (!n) throw new Error('文件里没有本站的存档项。');
  return { count: n, at: doc.at, keys: doc.keys };
}
