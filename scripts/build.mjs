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
import { execFileSync } from 'node:child_process';
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

// ------------------------------------------------------- 合成大杜勒的头像
// 11 张头像如果各自请求一次，在边缘就是 11 个来回（每个 1~2 秒），没人受得了。
// 所以构建时把它们读成 data URI 塞进一个模块，页面还是只有一个脚本请求。
function genMergeArt() {
  const cfg = readJson(path.join(ROOT, 'data/merge-levels.json'));
  const levels = cfg.levels.map((l) => {
    const file = path.join(ROOT, l.src);
    if (!has(file)) throw new Error('头像不存在：' + l.src);
    return {
      key: l.key, n: l.n, en: l.en, d: l.d, pts: l.pts | 0, tint: l.tint || '#9aa4bb',
      art: 'data:image/webp;base64,' + fs.readFileSync(file).toString('base64'),
    };
  });
  const code = [
    '// 由 scripts/build.mjs 从 data/merge-levels.json 生成，请勿手改。',
    '// 每级头像是 data URI：11 张图合成一次传输，页面只发一个脚本请求。',
    `export const LEVELS = ${JSON.stringify(levels, null, 1)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/merge-art.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return levels.length;
}

// ------------------------------------------------- 是鸟弟就下100层的技能动图
// 灰机 wiki 的 7 段战斗/行动动图（待机、打击、技能1/2、防御、狂气爆发、觉醒）
// 已经被 scripts/build_bird_art.py 抽帧压成一张 843KB 的雪碧图。
// 这里把它读成 data URI 一起塞进脚本：页面上线时还是「一个页面 + 一个脚本」，
// 不会多出 7 个各要 1~2 秒的图片请求。改素材跑那个 py 脚本，别手改 json。
function genBirdArt() {
  const meta = readJson(path.join(ROOT, 'data/bird-art.json'));
  const sheetPath = path.join(ROOT, 'assets/pollux-bird/bird-sheet.webp');
  if (!has(sheetPath)) throw new Error('缺少雪碧图，先跑 scripts/build_bird_art.py');
  const sheet = 'data:image/webp;base64,' + fs.readFileSync(sheetPath).toString('base64');
  const code = [
    '// 由 scripts/build.mjs 从 data/bird-art.json + bird-sheet.webp 生成，请勿手改。',
    '// 一张雪碧图承载全部技能动图，帧矩形按底对齐排列（所以脚在同一水平线上）。',
    `export const SHEET = ${JSON.stringify(sheet)};`,
    `export const ANIMS = ${JSON.stringify(meta.anims)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/bird-art.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return Object.keys(meta.anims).length;
}

// ------------------------------------------- 唤醒体幸存者的图集与数据表
// 这游戏要显示 62 名唤醒体 + 一批怪物 + 造物 / 命轮 / 契物，全部逐个请求
// 在边缘就是几百个 1~2 秒的来回。素材已经在 scripts/build_survivors_art.py
// 里拼成一张 webp（assets/survivors/atlas.webp），这里把它连同帧表和
// scripts/build_survivors_data.mjs 整理好的角色/武器表一起内联成一个模块，
// 整局游戏依然只有一个脚本请求。
function genSurvivors() {
  const atlasPath = path.join(ROOT, 'assets/survivors/atlas.webp');
  if (!has(atlasPath)) throw new Error('缺少图集，先跑 python scripts/build_survivors_art.py');
  const meta = readJson(path.join(ROOT, 'data/survivors-atlas.json'));
  const data = readJson(path.join(ROOT, 'data/survivors-data.json'));
  const uri = 'data:image/webp;base64,' + fs.readFileSync(atlasPath).toString('base64');
  const code = [
    '// 由 scripts/build.mjs 生成，请勿手改。',
    '// 源：assets/survivors/atlas.webp + data/survivors-atlas.json + data/survivors-data.json',
    `export const ATLAS = ${JSON.stringify(uri)};`,
    `export const META = ${JSON.stringify({ cell: meta.cell, cols: meta.cols, w: meta.w, h: meta.h, frames: meta.frames })};`,
    `export const CHARS = ${JSON.stringify(data.chars)};`,
    `export const WEAPONS = ${JSON.stringify(data.weapons)};`,
    `export const MOBS = ${JSON.stringify(data.monsters)};`,
    `export const CREATIONS = ${JSON.stringify(data.creations)};`,
    `export const WHEELS = ${JSON.stringify(data.wheels)};`,
    `export const COVENANTS = ${JSON.stringify(data.covenants)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/sv/gen.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return { chars: data.chars.length, weapons: data.weapons.length, kb: Math.round(code.length / 1024) };
}

// ------------------------------------------------------------------ 主流程
const artCount = genMergeArt();
const birdArt = genBirdArt();
const sv = genSurvivors();
// 「校猫的结合」要内联四十多张图（猫 + 造物 + 密契 + 钥令 + 首领），逻辑单独放一个脚本，
// 这里只负责在构建时调它，保证 js/binding-art.js 不会和 data/binding-art.json 走散。
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_binding_art.mjs')], { stdio: 'pipe' });

// 不 rmSync 整个 js/b：这台机器的删除是被「异步送进回收站」的垫片接管的，
// rmSync 会在文件还没真正消失时 rmdir → 偶发 ENOTEMPTY；更糟的是延迟删除可能落在
// 新文件写入之后，把刚打包好的 bundle 又删掉，表现成「构建成功但产物缺文件」。
// 所以只建目录、按需覆盖写，最后再清一次不再需要的旧文件名（清不掉也无所谓）。
fs.mkdirSync(OUT_JS, { recursive: true });
const staleNames = new Set(fs.readdirSync(OUT_JS));

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
  staleNames.delete(outName);
  totalModules += modules;
  built.push({ name, src, entry: outName, modules, kb: Math.round(code.length / 1024) });
}

// --------------------------------------------------- 不进首屏的额外入口
// 「合成大杜勒」的账号同步件：页面空闲时才 import()，不能算进首屏请求。
// 打包成同名文件（js/merge-sync.js → js/b/merge-sync.js），这样
// 页面里的 import('./merge-sync.js') 在「源码目录」和「打包目录」都能解析到。
const EXTRA_ENTRIES = ['js/merge-sync.js', 'js/bird-sync.js'];

const extras = [];
for (const rel of EXTRA_ENTRIES) {
  const { code, modules } = bundle(rel);
  // 动态 import() 拿到的是模块的导出，而打包产物本身只有一堆 const：
  // 所以这里把入口模块的导出原样转出去，页面里才能 m.pullBest()。
  const id = ident(path.resolve(ROOT, rel));
  const names = parseModule(path.resolve(ROOT, rel)).exports;
  const tail = names.length
    ? `\n// 给 import() 用：把入口模块的导出转出去\n${names.map((n) => `export const ${n} = ${id}.${n};`).join('\n')}\n`
    : '';
  const out = path.basename(rel);
  const full = code + tail;
  fs.writeFileSync(path.join(OUT_JS, out), full, 'utf8');
  staleNames.delete(out);
  totalModules += modules;
  extras.push({ out, modules, names, kb: Math.round(full.length / 1024) });
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
// 页面 HTML 也算进去：只改文案（比如首页）也要换缓存，否则老访客会先看到旧页面
for (const b of built) h.update(b.src);
for (const b of built) if (b.entry) h.update(read(path.join(OUT_JS, b.entry)));
for (const e of extras) h.update(read(path.join(OUT_JS, e.out)));
h.update(read(path.join(SRC, 'sw.js')));
// 挂机版（idle/）是独立子项目，不参与上面的打包，但它的资源同样走 SW 的
// cache-first：只改 idle 而版本号不动的话，老访客会一直拿到旧的 src/*.js 与
// game-data.json，新旧混杂看起来就是「资源不全」。所以整个 idle 树都进哈希。
// 7MB / 870 个文件，读一遍约 100ms，换来的语义很简单：idle 一改就换缓存。
{
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : [p];
  });
  const idleDir = path.join(ROOT, 'idle');
  if (fs.existsSync(idleDir)) {
    for (const f of walk(idleDir).sort()) {
      h.update(path.relative(ROOT, f).split(path.sep).join('/'));
      h.update(fs.readFileSync(f));
    }
  }
}
const stamp = h.digest('hex').slice(0, 10);

// 清理不再产出的旧 bundle（页面改名/下线后留下的孤儿文件）。放在所有读写之后，
// 即使删除被垫片延迟执行也不会影响刚刚写好的产物；删不掉就留着，下轮再试。
for (const f of staleNames) {
  try { fs.rmSync(path.join(OUT_JS, f), { force: true }); } catch { /* 被占用就下次 */ }
}

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
  // 额外入口没有 ?v=：页面里的 import() 就是无参地址，缓存键要对上才命得中
  ...extras.map((e) => `js/b/${e.out}`),
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
console.log(`  唤醒体幸存者：${sv.chars} 名角色 / ${sv.weapons} 把武器，js/sv/gen.js ${sv.kb}KB（图集已内联）`);
for (const e of extras) console.log(`  延迟加载 js/b/${e.out}`.padEnd(30), `${e.modules} 个模块 → ${e.kb}KB（不进首屏）`);
console.log(`sw.js 预缓存 ${precache.length} 项`);
