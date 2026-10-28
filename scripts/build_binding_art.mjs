#!/usr/bin/env node
// 把 data/binding-art.json 里列的美术素材读成 data URI，生成 js/binding-art.js。
//
// 为什么要内联：站点跑在 EdgeOne 的边缘上，每个请求固定 1~2 秒（和体积几乎无关），
// 「校猫的结合」要用的图有四十多张，一个个请求就是一分多钟的白屏。
// 所以和「合成大杜勒」一样，构建期把它们全塞进一个模块，页面只有两个请求。
//
// 用法：node scripts/build_binding_art.mjs
// （scripts/build.mjs 每次构建都会调用它，一般不用手动跑）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/binding-art.json'), 'utf8'));

const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

function dataUri(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) throw new Error('[binding-art] 素材不存在：' + rel);
  const mime = MIME[path.extname(rel).toLowerCase()];
  if (!mime) throw new Error('[binding-art] 不认识的图片格式：' + rel);
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}

const pick = (map) => {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) out[k] = dataUri(v);
  return out;
};

const art = {
  cat: dataUri(manifest.cat),
  cat2: dataUri(manifest.cat2),
  coin: dataUri(manifest.coin),
  items: pick(manifest.items),
  trinkets: pick(manifest.trinkets),
  actives: pick(manifest.actives),
  bosses: pick(manifest.bosses),
};

let bytes = 0;
const count = (m) => Object.keys(m).length;
bytes = Buffer.byteLength(JSON.stringify(art));

const code = [
  '// 由 scripts/build_binding_art.mjs 从 data/binding-art.json 生成，请勿手改。',
  '// 全部素材都是 data URI：四十多张图合成一次传输，页面只发一个脚本请求。',
  `export const ART = ${JSON.stringify(art)};`,
  '',
].join('\n');

const out = path.join(ROOT, 'js/binding-art.js');
const old = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
if (old !== code) fs.writeFileSync(out, code, 'utf8');
console.log(
  `[binding-art] 猫 2 + 银芯 1 + 造物 ${count(art.items)} + 密契 ${count(art.trinkets)}` +
    ` + 钥令 ${count(art.actives)} + 首领 ${count(art.bosses)} → js/binding-art.js` +
    `（${(bytes / 1024).toFixed(0)}KB 内联，${old === code ? '无变化' : '已更新'}）`,
);
