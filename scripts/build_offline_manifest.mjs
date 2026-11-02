#!/usr/bin/env node
// 生成离线包清单 data/offline.json —— 离线版（PWA）与桌面版都按它取文件。
//
// 为什么不直接把 assets/ 整个塞进去：仓库里真正被页面引用的素材只有 60MB 左右，
// 剩下 500MB+ 是构建用的原始动图（assets/protocol/_raw 等，已在 .gitignore 里）。
// 所以这里按「引用扫描」收集 assets，其余目录（data / js / css / 子项目）整目录收。
//
// 用法：node scripts/build_offline_manifest.mjs [stamp]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = process.argv[2] || 'dev';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'desktop', '.preview', '.tmp-syn', 'server']);
const ASSET_RE = /assets\/[A-Za-z0-9_\-.@/]+/g;
const TEXT_EXT = /\.(?:html|js|mjs|json|webmanifest|css|svg)$/i;
// 音游的原曲包（assets/ll-music/*.bin）不进离线包：二十九首近 100MB，
// 本来也是「点哪首取哪首」，预下载只会把离线包撑爆。
const NOT_OFFLINE = /^assets\/ll-music\//;

function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    const rel = path.relative(ROOT, p).split(path.sep).join('/');
    if (d.isDirectory()) {
      if (SKIP_DIRS.has(d.name)) continue;
      if (/_raw$/.test(d.name)) continue;
      walk(p, out);
    } else {
      out.push(rel);
    }
  }
  return out;
}

const all = walk(ROOT);

// 1) 文本里出现过的 assets 路径（页面、打包脚本、数据、子项目都算）
const refs = new Set();
for (const rel of all) {
  if (!TEXT_EXT.test(rel)) continue;
  if (rel.startsWith('assets/')) continue;   // assets 里的 svg 不参与引用扫描，避免自我循环
  const abs = path.join(ROOT, rel);
  const size = fs.statSync(abs).size;
  if (size > 8 * 1024 * 1024) continue;      // 大文件（图集脚本）里也有引用，但读一遍太慢，靠下面的目录规则兜
  let txt;
  try { txt = fs.readFileSync(abs, 'utf8'); } catch { continue; }
  for (const m of txt.match(ASSET_RE) || []) {
    const clean = m.replace(/[),.;'"]+$/, '');
    if (NOT_OFFLINE.test(clean)) continue;
    if (fs.existsSync(path.join(ROOT, clean))) refs.add(clean);
  }
}

// 2) 整目录收：数据、脚本、样式、子项目
const WHOLE = ['data/', 'js/', 'css/', 'idle/', 'deathreport/', 'casefile/'];
const ROOT_FILES = all.filter((p) => !p.includes('/') && /\.(?:html|webmanifest|svg)$/i.test(p));

const files = new Set();
for (const rel of all) {
  if (rel === 'data/offline.json') continue;
  if (ROOT_FILES.includes(rel)) { files.add(rel); continue; }
  if (WHOLE.some((w) => rel.startsWith(w))) { files.add(rel); continue; }
  if (NOT_OFFLINE.test(rel)) continue;
  // 大巴扎的待机立绘是按 slug 拼出来的（assets/bazaar/idle/<slug>.webp），扫不到字面引用，
  // 但离线版没有它战斗页就空一格，所以整目录收（62 个文件共 0.84MB）。
  if (rel.startsWith('assets/bazaar/idle/')) { files.add(rel); continue; }
  if (rel.startsWith('assets/') && (refs.has(rel) || rel.startsWith('assets/app/'))) files.add(rel);
}
// 图标与清单是安装（PWA）必需的，即使没被 html 引到也要有
for (const extra of ['manifest.webmanifest', 'favicon.svg', 'data/offline.json']) {
  if (fs.existsSync(path.join(ROOT, extra)) && extra !== 'data/offline.json') files.add(extra);
}

const list = [...files].sort();
// 每个文件算一份短指纹：离线版「更新」只重下指纹变了的那些文件。
// 文件名不带指纹，光看清单看不出版本，所以只能按内容算。12 位十六进制
// 够用（碰撞概率对「要不要重下一个文件」这件事可以忽略），又不至于把清单撑大。
const sizes = [];
const hashes = [];
let bytes = 0;
for (const rel of list) {
  const buf = fs.readFileSync(path.join(ROOT, rel));
  sizes.push(buf.length);
  bytes += buf.length;
  hashes.push(crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12));
}
const out = {
  stamp,
  builtAt: new Date().toISOString(),
  bytes,
  count: list.length,
  files: list,
  sizes,
  hashes,
};
fs.writeFileSync(path.join(ROOT, 'data/offline.json'), JSON.stringify(out) + '\n', 'utf8');
const kb = (fs.statSync(path.join(ROOT, 'data/offline.json')).size / 1024).toFixed(0);
console.log(`  data/offline.json  ${list.length} 个文件 · ${(bytes / 1048576).toFixed(1)}MB · 清单 ${kb}KB · stamp ${stamp}`);
