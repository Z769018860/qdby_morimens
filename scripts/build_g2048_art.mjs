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
// 银芯图标：结算和面板里的「+N 银芯」都用原作这张（assets/ui/silvercore.webp），
// 跟着脚本一起内联，页面不会为了一枚硬币再发一个请求。
const sc = uri('assets/ui/silvercore.webp');

const code = [
  '// 由 scripts/build_g2048_art.mjs 生成，请勿手改。',
  '// 源：data/g2048-levels.json 里列的造物图（内联成 data URI，方块不再各发一个请求）',
  `export const LEVELS = ${JSON.stringify(levels)};`,
  '',
  '// 侵蚀块（侵蚀模式里落下来的那一块）：assets/status/corrosion.webp',
  `export const ROT_ART = ${JSON.stringify(rot)};`,
  '',
  '// 银芯图标（结算与银芯阶梯）：assets/ui/silvercore.webp',
  `export const SC_ART = ${JSON.stringify(sc)};`,
  '',
].join('\n');

fs.writeFileSync(out, code, 'utf8');
console.log(`方块的图内联 ${levels.length} 张 + 侵蚀 1 张 / 原始 ${(bytes / 1024).toFixed(0)}KB → js/g2048-art.js ${(code.length / 1024).toFixed(0)}KB`);

// ---------------------------------------------------------------- 换皮池
// 两种皮（随机造物 / 唤醒体）共一百多张图，四百来 KB，绝不能算进首屏：
// 单独出 js/g2048-skins.js，玩家第一次点「换皮」才 import（见 js/g2048.js 的 loadSkins）。
// 池子本身由 scripts/build_g2048_skins.py 生成——那边才是素材规则（挑哪几件、缩到多大），
// 这边只负责把图读成 data URI，免得构建里塞一份图像处理。
const skinCfgPath = path.join(ROOT, 'data/g2048-skins.json');
const skinOut = path.join(ROOT, 'js/g2048-skins.js');
if (!fs.existsSync(skinCfgPath)) {
  console.log('换皮池没生成（data/g2048-skins.json 不存在），先跑 python scripts/build_g2048_skins.py');
} else {
  const sc = JSON.parse(fs.readFileSync(skinCfgPath, 'utf8'));
  let skinBytes = 0, count = 0;
  const kinds = {};
  for (const [k, v] of Object.entries(sc.kinds || {})) {
    kinds[k] = {
      n: v.n,
      pool: (v.pool || []).map((it) => {
        skinBytes += fs.statSync(path.join(ROOT, it.img)).size;
        count++;
        return { n: it.n, art: uri(it.img) };
      }),
    };
  }
  const skinCode = [
    '// 由 scripts/build_g2048_art.mjs 从 data/g2048-skins.json 生成，请勿手改。',
    '// 只给「换皮」用：首屏不加载，玩家点「换皮」才动态 import（见 js/g2048.js 的 loadSkins）。',
    '// 每种皮一个池子，每级从池里抽一个不重复的（art 是 data URI，抽到哪张都不用再发请求）。',
    `export const KINDS = ${JSON.stringify(kinds)};`,
    '',
  ].join('\n');
  fs.writeFileSync(skinOut, skinCode, 'utf8');
  console.log(`换皮池 ${Object.keys(kinds).map((k) => k + ' ' + kinds[k].pool.length).join(' / ')} 共 ${count} 张 / 原始 ${(skinBytes / 1024).toFixed(0)}KB → js/g2048-skins.js ${(skinCode.length / 1024).toFixed(0)}KB（不进首屏）`);
}
