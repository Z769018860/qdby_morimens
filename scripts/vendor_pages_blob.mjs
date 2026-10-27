// 把 @edgeone/pages-blob 的 CJS 产物转成纯 ESM，供 edge-functions 静态 import。
//
// 为什么不用 npm 直接依赖：
//  · Edge Functions 是 V8 隔离环境，只认 ESM；SDK 产物是 `module.exports = ...`，
//    直接 import 会在 `module` 未定义处崩掉（除非平台做 CJS 互操作，赌不起）。
//  · 项目不配构建命令（输出目录就是仓库根），没有打包环节替我们转。
// 所以这里做一次「一次性质变」：去掉 CJS 尾巴，补上具名导出，产物入库（约 20KB）。
//
// 用法：node scripts/vendor_pages_blob.mjs [sdk目录]
//   默认读 .tmp-syn/blobpkg/node_modules/@edgeone/pages-blob
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, '.tmp-syn/blobpkg/node_modules/@edgeone/pages-blob');
const OUT = path.join(ROOT, 'edge-functions/api/_lib/pages-blob.js');

const srcFile = path.join(SRC, 'dist/index.js');
if (!fs.existsSync(srcFile)) {
  console.error(`找不到 SDK 产物：${srcFile}`);
  console.error('先装一次：cd .tmp-syn/blobpkg && npm i @edgeone/pages-blob');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(SRC, 'package.json'), 'utf8'));
let code = fs.readFileSync(srcFile, 'utf8');

// 1) 去掉 CJS 导出尾巴（`module.exports=me(je);` 或带空格变体）
const before = code.length;
code = code.replace(/module\.exports\s*=\s*me\(je\);?/g, '');
if (code.length === before) {
  console.error('没找到 module.exports=me(je)，SDK 产物结构可能变了，先人工确认');
  process.exit(1);
}

// 2) 去掉开头的 "use strict";（ESM 本身就是严格模式，留着也无害，但清掉更干净）
code = code.replace(/^"use strict";/, '');

// 3) 补具名导出。je 上的属性是 fe() 定义的 getter，解构会触发，拿到真实函数
const header = `// 自动生成，勿手改 —— 由 scripts/vendor_pages_blob.mjs 从 @edgeone/pages-blob@${pkg.version} 转换
// 原产物：dist/index.js（CJS，约 ${(fs.statSync(srcFile).size / 1024).toFixed(1)}KB，零外部依赖）
// 转换内容：去掉 module.exports 尾巴、补 ESM 具名导出。业务代码一行未改。
`;

const footer = `
const { getStore, listStores } = je;
export { getStore, listStores };
export default { getStore, listStores };
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + code + footer, 'utf8');

const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`已生成 ${path.relative(ROOT, OUT)}（${kb}KB，源版本 ${pkg.version}）`);
