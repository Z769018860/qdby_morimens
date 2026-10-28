#!/usr/bin/env node
// 构建：把「源页面 + ES 模块 + 数据」变成「少量请求就能跑的静态站」。
//
// 为什么需要它：EdgeOne Pages 的静态响应头是 Cache-Control: max-age=0, must-revalidate，
// 而且只给 HTTP/1.1。实测每个请求固定 1~2.5 秒，和文件大小几乎无关——
// 所以「首屏 23 个请求」就是十几秒的来源，压体积没用，只能压请求数。
//
// 这个脚本做四件事：
//   1. 每个页面的模块依赖图 → 打包成 js/b/<页面>.js（10 个请求变 1 个）
//   2. css/style.css 内联进 HTML（省掉一个阻塞渲染的请求）
//   3. 字典/标签/关键词/题库索引 → 合成一个 data/boot.json（4 个变 1 个）
//   4. 生成 sw.js：带构建戳的运行时缓存，绕开 must-revalidate 的强制回源
//
// 用法：node scripts/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const PAGES = path.join(SRC, 'pages');
const OUT_JS = path.join(ROOT, 'js', 'b');

const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));
const has = (p) => fs.existsSync(p);

// ------------------------------------------------------------------ 打包
const modCache = new Map();

function parseModule(file) {
  if (modCache.has(file)) return modCache.get(file);
  let code = read(file);
  const imports = [];
  // import … from './x.js';  允许跨行
  code = code.replace(/^import\s+([\s\S]*?)\s+from\s+['"]\.\/([^'"]+)['"];?[ \t]*$/gm, (_m, spec, from) => {
    imports.push({ spec: spec.trim(), from });
    return '';
  });
  const exports = [];
  code = code.replace(
    /^export\s+(async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
    (_m, kw, name) => { exports.push(name); return `${kw} ${name}`; },
  );
  if (/^export\s/m.test(code)) {
    throw new Error(`${path.basename(file)}：还有没处理的 export 写法（本脚本只认 export const/let/function/class）`);
  }
  if (/^import\s/m.test(code)) {
    throw new Error(`${path.basename(file)}：还有没处理的 import 写法（只支持相对路径单行/多行 import）`);
  }
  const mod = { file, imports, exports, code };
  modCache.set(file, mod);
  return mod;
}

function resolveDep(fromFile, spec) {
  const p = path.resolve(path.dirname(fromFile), spec);
  if (!has(p)) throw new Error(`${path.basename(fromFile)} 引用了不存在的 ${spec}`);
  return p;
}

const ident = (file) => 'm_' + path.basename(file, '.js').replace(/\W/g, '_');

function bundle(entryRel) {
  const entry = path.resolve(ROOT, entryRel);
  const seen = new Set();
  const visiting = new Set();
  const order = [];
  (function visit(file) {
    if (seen.has(file)) return;
    if (visiting.has(file)) throw new Error('存在循环依赖：' + path.relative(ROOT, file));
    visiting.add(file);
    for (const im of parseModule(file).imports) visit(resolveDep(file, im.from));
    visiting.delete(file);
    seen.add(file);
    order.push(file);
  })(entry);

  const parts = [
    '// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。',
    '// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持顶层 await，顺序即依赖顺序。',
    '',
  ];
  for (const file of order) {
    const mod = parseModule(file);
    const head = mod.imports.map((im) => {
      const dep = ident(resolveDep(file, im.from));
      const ns = im.spec.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
      if (ns) return `const ${ns[1]} = ${dep};`;
      const names = im.spec.replace(/^\{|\}$/g, '').split(',').map((s) => s.trim()).filter(Boolean)
        .map((s) => {
          const m = s.split(/\s+as\s+/);
          return m.length === 2 ? `${m[0].trim()}: ${m[1].trim()}` : s;
        });
      return `const { ${names.join(', ')} } = ${dep};`;
    }).join('\n');
    parts.push(
      `// ---- ${path.relative(ROOT, file).replace(/\\/g, '/')}`,
      `const ${ident(file)} = await (async () => {`,
      head,
      mod.code.trim(),
      `return { ${mod.exports.join(', ')} };`,
      '})();',
      '',
    );
  }
  return { code: parts.join('\n'), modules: order.length };
}

// ------------------------------------------------------------------ 主流程
fs.rmSync(OUT_JS, { recursive: true, force: true });
fs.mkdirSync(OUT_JS, { recursive: true });

const pageFiles = fs.readdirSync(PAGES).filter((f) => f.endsWith('.html')).sort();
const built = [];
let totalModules = 0;

for (const f of pageFiles) {
  const name = f.replace(/\.html$/, '');
  const src = read(path.join(PAGES, f));
  const entry = (src.match(/<script type="module" src="js\/([\w.-]+\.js)"/) || [])[1];
  if (!entry) { built.push({ name, src, entry: null }); continue; }
  const { code, modules } = bundle('js/' + entry);
  const outName = `${name}.js`;
  fs.writeFileSync(path.join(OUT_JS, outName), code + '\n', 'utf8');
  totalModules += modules;
  built.push({ name, src, entry: outName, modules, kb: Math.round(code.length / 1024) });
}

// ---- 启动数据合成一个文件
const dict = readJson(path.join(ROOT, 'data/dictionary.json'));
const tags = readJson(path.join(ROOT, 'data/creation-tags.json'));
const kw = readJson(path.join(ROOT, 'data/keywords.json'));
const bankIdx = readJson(path.join(ROOT, 'data/bank/index.json'));
const bootJson = JSON.stringify({ dict, tags, kw, bank: bankIdx });
fs.writeFileSync(path.join(ROOT, 'data/boot.json'), bootJson, 'utf8');

// ---- 构建戳：代码或题库一变就换版本，Service Worker 据此换缓存
const h = crypto.createHash('sha1');
h.update(read(path.join(ROOT, 'css/style.css')));
h.update(bootJson);
for (const b of built) if (b.entry) h.update(read(path.join(OUT_JS, b.entry)));
h.update(read(path.join(SRC, 'sw.js')));
const stamp = h.digest('hex').slice(0, 10);

// ---- 页面拼装
const css = read(path.join(ROOT, 'css/style.css'));
const favicon = read(path.join(ROOT, 'favicon.svg'));
const faviconUri = 'data:image/svg+xml,' + encodeURIComponent(favicon).replace(/'/g, '%27');
const bootPartial = read(path.join(SRC, 'partials/boot.html')).trimEnd();
const swReg = `<script>
/* 回访加速：静态资源走 Service Worker 缓存。平台的静态响应头是
   Cache-Control: max-age=0, must-revalidate，每个文件每次都要回源，
   而边缘一个来回就要 1~2 秒；SW 缓存能把这部分彻底省掉。 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}
</script>`;

for (const p of built) {
  let s = p.src;
  // 内联样式表
  s = s.replace(/<link rel="stylesheet" href="css\/style\.css">\n?/,
    `<style>\n${css.trimEnd()}\n</style>\n`);
  // favicon 内联，省掉一个请求（它只有 511B，却要占一个连接位）
  s = s.replace(/<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/,
    `<link rel="icon" href="${faviconUri}" type="image/svg+xml">`);
  // 模块预加载不再需要：已经是单文件
  s = s.replace(/<link rel="modulepreload" href="js\/[^"]+">\n?/g, '');
  // 注入首屏守护
  s = s.replace('<!-- @boot -->', bootPartial);
  // 入口脚本换成打包文件
  if (p.entry) {
    s = s.replace(/(<script type="module" src="js\/)[\w.-]+\.js"/,
      `$1b/${p.entry}?v=${stamp}"`);
  }
  // 构建戳 + SW 注册
  s = s.replace('</head>', `<meta name="build" content="${stamp}">\n</head>`);
  s = s.replace('</body>', `${swReg}\n</body>`);
  fs.writeFileSync(path.join(ROOT, p.name + '.html'), s, 'utf8');
}

// ---- Service Worker
const precache = [
  'index.html',
  ...built.filter((b) => b.entry).map((b) => `${b.name}.html`),
  ...built.filter((b) => b.entry).map((b) => `js/b/${b.entry}?v=${stamp}`),
  'data/boot.json',
];
const sw = read(path.join(SRC, 'sw.js'))
  .replace('__STAMP__', stamp)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
fs.writeFileSync(path.join(ROOT, 'sw.js'), sw, 'utf8');

// ---- 报告
console.log(`构建戳 ${stamp}`);
for (const p of built) {
  const size = fs.statSync(path.join(ROOT, p.name + '.html')).size;
  console.log(
    '  ' + (p.name + '.html').padEnd(16),
    (p.entry ? `js/b/${p.entry}` : '（无脚本）').padEnd(22),
    p.entry ? `${p.modules} 个模块 → ${p.kb}KB` : '',
    `| html ${Math.round(size / 1024)}KB`,
  );
}
console.log(`共打包 ${totalModules} 次模块引用；data/boot.json ${Math.round(bootJson.length / 1024)}KB`);
console.log(`sw.js 预缓存 ${precache.length} 项`);
