#!/usr/bin/env node
// 把 js/wolf/data.js 里用到的 62 张唤醒体头像读成 data URI，内联进 js/wolf/art.js。
//
// 为什么要内联：线上是 EdgeOne Pages，静态响应头是 must-revalidate 且每个请求
// 固定 1~2 秒——一局里会用到十几张头像，逐个请求就是十几个来回。合成一张「模块里的
// 字符串表」之后，整局仍然只有一个脚本请求。
//
// 用法：node scripts/build_wolf_art.mjs
// 头像源：assets/avatars/a-<编号>.webp（96×96，构建数据时就压好了）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHARS } from '../js/wolf/data.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(ROOT, 'js/wolf/art.js');

const table = {};
let bytes = 0;
const missing = [];
for (const c of CHARS) {
  const p = path.join(ROOT, 'assets/avatars', `a-${c.av}.webp`);
  if (!fs.existsSync(p)) { missing.push(c.zh + '(' + c.av + ')'); continue; }
  const buf = fs.readFileSync(p);
  bytes += buf.length;
  table[c.av] = 'data:image/webp;base64,' + buf.toString('base64');
}
if (missing.length) {
  console.warn('缺少头像：' + missing.join('、'));
}

const code = [
  '// 由 scripts/build_wolf_art.mjs 生成，请勿手改。',
  '// 源：assets/avatars/a-<编号>.webp（编号取自 js/wolf/data.js 的 av 字段）',
  `export const AVATARS = ${JSON.stringify(table)};`,
  '',
].join('\n');

fs.writeFileSync(out, code, 'utf8');
console.log(`头像内联 ${Object.keys(table).length} 张 / 原始 ${(bytes / 1024).toFixed(0)}KB → js/wolf/art.js ${(code.length / 1024).toFixed(0)}KB`);
