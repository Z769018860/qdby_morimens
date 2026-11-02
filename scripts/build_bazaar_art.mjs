#!/usr/bin/env node
// 把 js/bazaar-data.js 里用到的图（唤醒体头像、造物图标、命轮、密契、怪物）读成 data URI，
// 内联进 js/bazaar-art.js。
//
// 为什么内联：线上是 EdgeOne Pages，静态响应每个 1~2 秒，一局里要点到的图标几十个，
// 逐个请求就是几十个来回；而且集市一开屏就要同时显示十几张。合成一张字符串表之后，
// 整局仍然只有一个脚本请求。
//
// 用法：node scripts/build_bazaar_art.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HEROES, ITEMS, WHEELS, PACTS, FOES } from '../js/bazaar-data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'js/bazaar-art.js');

const paths = new Set();
for (const h of HEROES) { paths.add(h.av); if (h.wheel) paths.add(h.wheel.im); }
for (const x of ITEMS) paths.add(x.im);
for (const x of WHEELS) paths.add(x.im);
for (const x of PACTS) paths.add(x.im);
for (const x of FOES) paths.add(x.im);

const table = {};
let bytes = 0;
const missing = [];
for (const rel of [...paths].sort()) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { missing.push(rel); continue; }
  const buf = fs.readFileSync(p);
  bytes += buf.length;
  table[rel] = 'data:image/webp;base64,' + buf.toString('base64');
}
if (missing.length) console.warn('缺少素材：' + missing.join('、'));

const code = [
  '// 由 scripts/build_bazaar_art.mjs 生成，请勿手改。',
  '// 源：js/bazaar-data.js 里出现的 assets 路径（内联成 data URI，一局不再逐图发请求）',
  `export const ART = ${JSON.stringify(table)};`,
  '',
].join('\n');

fs.writeFileSync(out, code, 'utf8');
console.log(`集市素材 ${Object.keys(table).length} 张 / 原始 ${(bytes / 1024).toFixed(0)}KB → js/bazaar-art.js ${(code.length / 1024).toFixed(0)}KB`);
