#!/usr/bin/env node
// 把 data/g2048-levels.json 里那十一张造物图读成 data URI，内联进 js/g2048-art.js。
//
// 为什么要内联：线上是 EdgeOne Pages，静态响应头是 must-revalidate，每个请求固定
// 1~2 秒。2048 的棋盘上同时躺着十几块，逐个发请求就是十几个来回；内联之后整页
// 仍然只有一个脚本请求（方块的图在第一次合并前就全在内存里）。
//
// 图都压过（每张 3~7KB，512×512 带透明），十一张合计四十来 KB，比「合成大杜勒」
// 内联的整条合成链还小。
//
// 用法：node scripts/build_g2048_art.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/g2048-levels.json'), 'utf8'));
const out = path.join(ROOT, 'js/g2048-art.js');

const uri = (rel) => {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) throw new Error('缺少素材：' + rel);
  return 'data:image/webp;base64,' + fs.readFileSync(p).toString('base64');
};

let bytes = 0;
const levels = cfg.levels.map((l) => {
  bytes += fs.statSync(path.join(ROOT, l.img)).size;
  return { v: l.v, n: l.n, c: l.c, img: uri(l.img) };
});
const rot = uri(cfg.rot.img);

const code = [
  '// 由 scripts/build_g2048_art.mjs 生成，请勿手改。',
  '// 源：data/g2048-levels.json 里列的造物图（内联成 data URI，方块不再各发一个请求）',
  `export const LEVELS = ${JSON.stringify(levels)};`,
  '',
  '// 侵蚀块（侵蚀模式里落下来的那一块）：assets/status/corrosion.webp',
  `export const ROT_ART = ${JSON.stringify(rot)};`,
  '',
].join('\n');

fs.writeFileSync(out, code, 'utf8');
console.log(`方块的图内联 ${levels.length} 张 + 侵蚀 1 张 / 原始 ${(bytes / 1024).toFixed(0)}KB → js/g2048-art.js ${(code.length / 1024).toFixed(0)}KB`);
