// 战斗回放解码：直接复用 qdby_chinese / morimens-tools 的口径
// 参考：qc_sparse/morimens-replay-review-v2.js（LZ4 frame -> MessagePack，含旧版 compStr 包壳）
// 回放文件不是 JSON：顶层 LZ4 帧里是 MessagePack；recordZips 的每一项又是「LZ4 帧 + MessagePack」的战斗分段。
//
// 导出：decodeReplay / replaySummary / unpack / unpackLz4Msgpack / lz4Frame / replayUrl / isReplayBytes

const PUBLIC_BASE = 'https://z1g-warreport.qookkagames.com/publish/BattleReplay_';
const decoder = new TextDecoder('utf-8');
const strictDecoder = new TextDecoder('utf-8', { fatal: true });

const readU32LE = (a, p) => (a[p] | (a[p + 1] << 8) | (a[p + 2] << 16) | (a[p + 3] << 24)) >>> 0;
function readU64LE(a, p) {
  const lo = BigInt(readU32LE(a, p));
  const hi = BigInt(readU32LE(a, p + 4));
  return Number((hi << 32n) | lo);
}

// ------------------------------------------------------------------ LZ4 帧
export function lz4Frame(input) {
  const src = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  if (src.length < 7 || src[0] !== 0x04 || src[1] !== 0x22 || src[2] !== 0x4d || src[3] !== 0x18) {
    throw new Error('Expected LZ4 frame');
  }
  p = 4;
  const flg = src[p++];
  p++; // BD
  const blockChecksum = !!(flg & 0x10);
  const contentSizeFlag = !!(flg & 0x08);
  const contentChecksum = !!(flg & 0x04);
  const dictFlag = !!(flg & 0x01);
  let contentSize = 0;
  if (contentSizeFlag) { contentSize = readU64LE(src, p); p += 8; }
  if (dictFlag) p += 4;
  p += 1;

  let cap = Math.max(contentSize || 0, src.length * 4, 65536);
  let out = new Uint8Array(cap);
  let op = 0;
  const ensure = (n) => {
    if (n <= out.length) return;
    let c = out.length;
    while (c < n) c = Math.max(c * 2, n);
    const z = new Uint8Array(c);
    z.set(out);
    out = z;
  };

  const decompressBlock = (end) => {
    while (p < end) {
      const token = src[p++];
      let lit = token >>> 4;
      if (lit === 15) { let x; do { x = src[p++]; lit += x; } while (x === 255 && p < end); }
      ensure(op + lit + 16);
      out.set(src.subarray(p, p + lit), op);
      p += lit;
      op += lit;
      if (p >= end) break;
      if (p + 2 > end) throw new Error('LZ4 truncated offset');
      const off = src[p] | (src[p + 1] << 8);
      p += 2;
      if (!off || off > op) throw new Error('LZ4 invalid offset');
      let ml = token & 15;
      if (ml === 15) { let x; do { x = src[p++]; ml += x; } while (x === 255 && p < end); }
      ml += 4;
      ensure(op + ml + 16);
      let from = op - off;
      for (let i = 0; i < ml; i++) out[op++] = out[from + i];
    }
  };

  while (p + 4 <= src.length) {
    const raw = readU32LE(src, p);
    p += 4;
    if (raw === 0) break;
    const plain = !!(raw & 0x80000000);
    const size = raw & 0x7fffffff;
    const end = p + size;
    if (end > src.length) throw new Error('LZ4 truncated block');
    if (plain) {
      ensure(op + size);
      out.set(src.subarray(p, end), op);
      op += size;
      p = end;
    } else {
      decompressBlock(end);
      p = end;
    }
    if (blockChecksum) p += 4;
  }
  if (contentChecksum && p + 4 <= src.length) p += 4;
  return out.slice(0, op);
}

// ------------------------------------------------------------------ MessagePack
class Msgpack {
  constructor(bytes) {
    this.a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.p = 0;
    this.v = new DataView(this.a.buffer, this.a.byteOffset, this.a.byteLength);
  }
  need(n) { if (this.p + n > this.a.length) throw new Error('MessagePack truncated'); }
  u8() { this.need(1); return this.a[this.p++]; }
  u16() { this.need(2); const x = this.v.getUint16(this.p, false); this.p += 2; return x; }
  u32() { this.need(4); const x = this.v.getUint32(this.p, false); this.p += 4; return x; }
  i8() { this.need(1); const x = this.v.getInt8(this.p); this.p++; return x; }
  i16() { this.need(2); const x = this.v.getInt16(this.p, false); this.p += 2; return x; }
  i32() { this.need(4); const x = this.v.getInt32(this.p, false); this.p += 4; return x; }
  u64() { this.need(8); const x = this.v.getBigUint64(this.p, false); this.p += 8; return Number(x); }
  i64() { this.need(8); const x = this.v.getBigInt64(this.p, false); this.p += 8; return Number(x); }
  bytes(n) { this.need(n); const x = this.a.slice(this.p, this.p + n); this.p += n; return x; }
  // recordZips 的每一项是以 MessagePack str 头包着的 LZ4 帧，非 UTF-8 时保留原始字节
  str(n) {
    const b = this.bytes(n);
    if (b.length > 3 && b[0] === 0x04 && b[1] === 0x22 && b[2] === 0x4d && b[3] === 0x18) return b;
    try { return strictDecoder.decode(b); } catch { return b; }
  }
  arr(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = this.read(); return a; }
  map(n) {
    const o = {};
    for (let i = 0; i < n; i++) {
      let k = this.read();
      if (k instanceof Uint8Array) { try { k = decoder.decode(k); } catch { k = String(k); } }
      o[String(k)] = this.read();
    }
    return o;
  }
  ext(n) { const type = this.i8(); return { $extType: type, $data: this.bytes(n) }; }
  read() {
    const b = this.u8();
    if (b <= 0x7f) return b;
    if (b >= 0xe0) return b - 256;
    if ((b & 0xf0) === 0x80) return this.map(b & 15);
    if ((b & 0xf0) === 0x90) return this.arr(b & 15);
    if ((b & 0xe0) === 0xa0) return this.str(b & 31);
    switch (b) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xc4: return this.bytes(this.u8());
      case 0xc5: return this.bytes(this.u16());
      case 0xc6: return this.bytes(this.u32());
      case 0xc7: return this.ext(this.u8());
      case 0xc8: return this.ext(this.u16());
      case 0xc9: return this.ext(this.u32());
      case 0xca: { this.need(4); const x = this.v.getFloat32(this.p, false); this.p += 4; return x; }
      case 0xcb: { this.need(8); const x = this.v.getFloat64(this.p, false); this.p += 8; return x; }
      case 0xcc: return this.u8();
      case 0xcd: return this.u16();
      case 0xce: return this.u32();
      case 0xcf: return this.u64();
      case 0xd0: return this.i8();
      case 0xd1: return this.i16();
      case 0xd2: return this.i32();
      case 0xd3: return this.i64();
      case 0xd4: return this.ext(1);
      case 0xd5: return this.ext(2);
      case 0xd6: return this.ext(4);
      case 0xd7: return this.ext(8);
      case 0xd8: return this.ext(16);
      case 0xd9: return this.str(this.u8());
      case 0xda: return this.str(this.u16());
      case 0xdb: return this.str(this.u32());
      case 0xdc: return this.arr(this.u16());
      case 0xdd: return this.arr(this.u32());
      case 0xde: return this.map(this.u16());
      case 0xdf: return this.map(this.u32());
      default: throw new Error('Unsupported MessagePack byte 0x' + b.toString(16));
    }
  }
}

export const unpack = (b) => new Msgpack(b).read();
export const unpackLz4Msgpack = (b) => unpack(lz4Frame(b));

const latin1 = (bytes) => {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) out += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + CHUNK)));
  return out;
};
const stringToBytes8 = (s) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
};

export const isReplayBytes = (u8) => u8.length > 4 && u8[0] === 0x04 && u8[1] === 0x22 && u8[2] === 0x4d && u8[3] === 0x18;
export const replayUrl = (uuid) => `${PUBLIC_BASE}${uuid}.json`;

// ------------------------------------------------------------------ 对外：解码
export function decodeReplay(input) {
  let u8 = input;
  if (typeof input === 'string') {
    const t = input.trim();
    if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t); // 已是 JSON 摘要
    u8 = new TextEncoder().encode(t);
  }
  if (u8 instanceof ArrayBuffer) u8 = new Uint8Array(u8);
  if (!isReplayBytes(u8)) return JSON.parse(decoder.decode(u8));

  let root;
  if (u8[0] === 0x04 && u8[1] === 0x22 && u8[2] === 0x4d && u8[3] === 0x18) {
    root = unpackLz4Msgpack(u8);
  } else {
    const env = JSON.parse(latin1(u8));
    if (typeof env.compStr !== 'string') throw new Error('Replay compStr missing');
    root = unpackLz4Msgpack(stringToBytes8(env.compStr));
  }
  if (!root || !Array.isArray(root.recordZips)) throw new Error('Unexpected replay structure');

  const segments = root.recordZips.map((blob) => {
    try { return unpackLz4Msgpack(blob); } catch { return null; }
  }).filter(Boolean);
  return {
    battleDat: root.battleDat || {},
    resourceRecords: root.resourceRecords || {},
    recordZips: root.recordZips,
    segments,
    format: 'LZ4 -> MessagePack; recordZips -> LZ4 -> MessagePack',
  };
}

// ------------------------------------------------------------------ 对外：回放 → 战报摘要
// 说明：榜单接口的 stageRoundCount / totalUseCard 是服务端口径，回放里没有等价字段，
// 这里用回放自带的战场统计（battleDat.statistics）近似，工坊里可以手动改。
export function replaySummary(rep) {
  const bd = (rep && rep.battleDat) || rep || {};
  const st = bd.statistics || {};
  const n = (v) => (Number.isFinite(+v) ? +v : 0);
  const dmg = st.AwakerDoDamage || {};
  const blk = st.AwakerDoBlock || {};
  const heal = st.AwakerDoHeal || {};
  const roles = (bd.roleData || []).filter((r) => r && r.tid != null);
  return {
    source: 'replay',
    battleUuid: String(bd.battleUuid || bd.gameLogBattleUid || ''),
    stageId: n(bd.stageId),
    playerLevel: n(bd.playerLevel),
    stageRoundCount: n(st.BoutCount),
    totalUseCard: n(st.UsedCardCount),
    maxBoutDamage: n(st.BoutMaxPlayerDoDamage),
    deathResistCount: n(st.DeathResistCount),
    playerDamage: n((dmg && dmg['1']) || st.PlayerDoDamage),
    keeperSkill: bd.keeperSkill != null ? bd.keeperSkill : null,
    relics: (bd.relics || []).map((r) => (r && r.tid != null ? r.tid : r)).filter((x) => x != null),
    awakers: roles.map((r) => ({
      tid: r.tid,
      level: n(r.level),
      potency: n(r.potencyLevel),
      break: n(r.breakLevel),
      damage: n(dmg[String(r.tid)]),
      block: n(blk[String(r.tid)]),
      heal: n(heal[String(r.tid)]),
    })),
  };
}

// ------------------------------------------------------------------ 对外：回放 → 完整队伍
// 命轮在回放里是「状态@武器X」的挂载状态，其 source.sourceType === 'Weapon' 且带 tid；
// 密契（饰品/Trinket）只有在本局触发过时才会留下「状态@饰品X」，因此这里只能给出候选，
// 精确值需要回查题库（见 workshop.js 的 lookupPuzzle）。
const COV_TAIL = /(效果|计数|标记|标识|层数|叠层|数值|次数|记录)$/;

function pushOnce(map, key, val) {
  if (val == null || val === '') return;
  const arr = map.get(key) || [];
  if (!arr.some((x) => String(x) === String(val))) arr.push(val);
  map.set(key, arr);
}

export function replayTeam(rep) {
  const bd = (rep && rep.battleDat) || rep || {};
  const rr = (rep && rep.resourceRecords) || {};
  const stateDef = rr.State || {};
  const st = bd.statistics || {};
  const n = (v) => (Number.isFinite(+v) ? +v : 0);
  const roles = (bd.roleData || []).filter((r) => r && r.tid != null);
  const roleUids = new Set(roles.map((r) => String(r.uid)));
  const wheelsOf = new Map();
  const covOf = new Map();

  for (const s of bd.stateList || []) {
    const owner = String((s.ownerData && s.ownerData.uid) ?? s.casterUid ?? '');
    if (!roleUids.has(owner)) continue;
    const def = stateDef[String(s.stateId)] || {};
    const cn = String(def.CnID || '');
    const m = cn.match(/^状态@饰品(.+)$/);
    if (m) pushOnce(covOf, owner, m[1].replace(COV_TAIL, ''));
    for (const src of s.source || []) {
      if (src && src.sourceType === 'Weapon') pushOnce(wheelsOf, owner, src.tid);
    }
  }

  const dmg = st.AwakerDoDamage || {};
  const blk = st.AwakerDoBlock || {};
  const heal = st.AwakerDoHeal || {};
  const pick = (map, r) => map[String(r.tid)] ?? map[String(r.uid)] ?? 0;

  const team = roles.map((r) => {
    const uid = String(r.uid);
    const covs = covOf.get(uid) || [];
    return {
      tid: String(r.tid),
      lv: n(r.level),
      pot: n(r.potencyLevel),
      brk: n(r.breakLevel),
      like: n(r.likeLevel),
      wheels: (wheelsOf.get(uid) || []).slice(0, 2).map(String),
      cov: null,
      covName: covs[0] || '',
      covNames: covs,
      dmg: n(pick(dmg, r)),
      blk: n(pick(blk, r)),
      heal: n(pick(heal, r)),
    };
  });
  // 与题库答案一致：A = 伤害最高
  team.sort((a, b) => b.dmg - a.dmg);

  return {
    source: 'replay',
    uuid: String(bd.battleUuid || bd.gameLogBattleUid || ''),
    playerUid: n(bd.playerUid),
    stageId: n(bd.stageId),
    playerLevel: n(bd.playerLevel),
    keeperSkill: bd.keeperSkill != null ? bd.keeperSkill : null,
    relics: (bd.relics || []).map((r) => (r && r.tid != null ? r.tid : r)).filter((x) => x != null).map(String),
    team,
    stats: {
      rounds: n(st.BoutCount),
      cards: n(st.UsedCardCount),
      maxBout: n(st.BoutMaxPlayerDoDamage),
      deathResist: n(st.DeathResistCount),
      playerDamage: n(st.PlayerDoDamage),
    },
  };
}
