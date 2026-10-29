#!/usr/bin/env node
// 给「挂机前夜」（idle/）生成 <link rel="modulepreload"> 列表。
//
// 为什么需要：idle 是独立静态子项目，源码是 40 个 ES 模块，页面只有一个
// <script type="module" src="src/main.js">。浏览器要先下 main.js、解析出它 import 了谁，
// 才知道还要下哪些——40 个模块是分好几层「瀑布」发现的。本地看不出问题，
// 但线上（EdgeOne）每个请求都要 0.9s 左右，多层瀑布就是好几秒首屏。
// modulepreload 写进 HTML 后，浏览器一解析到 head 就并发去抓，瀑布塌成一层。
//
// 用法：node scripts/gen_idle_preload.mjs
// 改了 idle/src 里的 import 关系后重跑一次即可（忘了跑也不会错，只是少一层优化）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = path.join(ROOT, 'idle/index.html');
const SRC = path.join(ROOT, 'idle/src');
const BEGIN = '<!-- @idle-preload';
const END = '<!-- /@idle-preload -->';

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : [p];
});

const files = walk(SRC).filter((f) => f.endsWith('.js'));
const deps = new Map();
const NO_FROM = /\b(?:import|export)\b[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g;
const SIDE = /^\s*import\s*['"]([^'"]+)['"]/gm;

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const out = [];
  for (const re of [NO_FROM, SIDE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(s))) {
      const t = m[1];
      if (!t.startsWith('.')) continue;                       // 裸模块（没用到，先兜住）
      out.push(path.resolve(path.dirname(f), t));
    }
  }
  deps.set(path.resolve(f), out);
}

// 从 main.js 出发做一次 BFS：只 preload 真正加载得到的模块
const seen = new Set();
const queue = [path.resolve(SRC, 'main.js')];
seen.add(queue[0]);
while (queue.length) {
  const cur = queue.shift();
  for (const d of deps.get(cur) || []) {
    if (deps.has(d) && !seen.has(d)) { seen.add(d); queue.push(d); }
  }
}

const list = [...seen]
  .filter((p) => path.basename(p) !== 'main.js')               // main.js 自己就是入口
  // 相对 idle/ 目录：页面里写 src/xxx.js 才解析成 /idle/src/xxx.js
  .map((p) => path.relative(path.dirname(INDEX), p).replace(/\\/g, '/'))
  .sort();

const block = [
  `${BEGIN} 由 scripts/gen_idle_preload.mjs 生成，别手改：`,
  '     页面只引一个 src/main.js，剩下 40 个模块是浏览器逐层「发现」的；',
  '     线上每个请求约 0.9s，逐层发现就是好几秒。这里一次写清楚，让它们并发下。',
  '     改了 idle/src 的 import 关系后重跑 node scripts/gen_idle_preload.mjs -->',
  ...list.map((p) => `<link rel="modulepreload" href="${p}">`),
  END,
].join('\n');

let html = fs.readFileSync(INDEX, 'utf8');
const b = html.indexOf(BEGIN);
if (b < 0) {
  // 第一次插入：放在 favicon 那行后面
  const anchor = '<link rel="icon" href="../favicon.svg" type="image/svg+xml">';
  if (!html.includes(anchor)) { console.error('找不到插入锚点（favicon 那行）'); process.exit(1); }
  html = html.replace(anchor, anchor + '\n' + block);
} else {
  const e = html.indexOf(END, b);
  if (e < 0) { console.error('有开始标记但没结束标记'); process.exit(1); }
  html = html.slice(0, b) + block + html.slice(e + END.length);
}
fs.writeFileSync(INDEX, html);
console.log(`· 写入 ${list.length} 条 modulepreload`);
for (const p of list.slice(0, 5)) console.log('   ', p);
console.log('    …');
