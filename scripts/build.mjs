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

// wrap=true（页面入口用）：整包再套一层 async IIFE，产物里就没有顶层 await。
// 顶层 await 要 Chrome 89+ / Safari 15+，而微信 / QQ 内置浏览器、iOS 14 都在下面：
// 表现是模块「解析失败、整段不执行」，页面只剩一行页脚——手机上「加载不出来」多半是它。
// 收进函数作用域之后 Chrome 61+ / Safari 11+ 都能跑。
// 延迟入口（merge-sync / bird-sync）要往模块外抛 export，不能套 IIFE，保持原样。
function bundle(entryRel, { wrap = true } = {}) {
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
    '// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。',
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
  const body = parts.join('\n');
  if (!wrap) return { code: body, modules: order.length };
  // 外层 IIFE 只负责「把 await 关进函数里」，并且把未捕获的异常转成首屏守护能显示的文案
  return {
    code: [
      '(async () => {',
      body,
      '})().catch(function (e) {',
      "  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));",
      '  else if (window.console) console.error(e);',
      '});',
      '// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）',
      'window.__bootMain = 1;',
      '',
    ].join('\n'),
    modules: order.length,
  };
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
    // 银芯图标：原作的图标（assets/ui/silvercore.webp），构建时内联，
    // 页面上的「+N 银芯」都用它，不再只写两个字。
    `export const SC_ART = ${JSON.stringify(
      'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'assets/ui/silvercore.webp')).toString('base64'),
    )};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/merge-art.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');

  genMergeSkins(cfg);
  return levels.length;
}

// ------------------------------------------------- 合成大杜勒的「换皮」头像池
// 换皮 = 每一级（杜勒赛因除外）随机换成一位唤醒体的脸，且同一次换皮里不重复。
// 候选池是 data/avatars.json 里**全部**唤醒体（除了杜勒赛因）——不再手挑几个，免得总摇出那几张。
// 这些图不进首屏：单独一个模块，只有玩家点了「换皮」、或者之前换过要还原时才会去拉。
const MERGE_SKIN_EXCLUDE = new Set(['a-95786']);   // 杜勒赛因：它是终点，固定不换

function genMergeSkins(cfg) {
  const meta = readJson(path.join(ROOT, 'data/avatars.json'));
  const seen = new Set();
  const pool = [];
  for (const x of meta.items || []) {
    if (x.k !== 'awakener' || MERGE_SKIN_EXCLUDE.has(x.id) || seen.has(x.n)) continue;
    const file = path.join(ROOT, x.src || `assets/avatars/${x.id}.webp`);
    if (!has(file)) throw new Error('换皮头像不存在：' + file);
    seen.add(x.n);
    pool.push({ n: x.n, art: 'data:image/webp;base64,' + fs.readFileSync(file).toString('base64') });
  }
  const code = [
    '// 由 scripts/build.mjs 从 data/avatars.json 生成，请勿手改。',
    '// 只给「换皮」用：首页/首屏不加载这个文件（动态 import，见 js/merge.js 的 loadSkins）。',
    '// 一个扁平数组：全部唤醒体（杜勒赛因除外），元素是 { n: 角色名, art: data URI }。',
    `export const SKINS = ${JSON.stringify(pool)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/merge-skins.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return pool.length;
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
  // 怪物图集单独一张：原作 assets/monster 里是五张 160x160 的立绘，
  // scripts/build_bird_mobs.py 已经裁边、缩放、横向拼好（约 19KB），
  // 这里和内联角色图一样塞成 data URI，游戏页仍然只发一个脚本请求。
  const mobsPath = path.join(ROOT, 'assets/pollux-bird/bird-mobs.webp');
  if (!has(mobsPath)) throw new Error('缺少怪物图集，先跑 scripts/build_bird_mobs.py');
  const mobMeta = readJson(path.join(ROOT, 'data/bird-mobs.json'));
  const mobSheet = 'data:image/webp;base64,' + fs.readFileSync(mobsPath).toString('base64');
  const code = [
    '// 由 scripts/build.mjs 从 data/bird-art.json + bird-sheet.webp 生成，请勿手改。',
    '// 一张雪碧图承载全部技能动图，帧矩形按底对齐排列（所以脚在同一水平线上）。',
    `export const SHEET = ${JSON.stringify(sheet)};`,
    `export const ANIMS = ${JSON.stringify(meta.anims)};`,
    `export const MOB_SHEET = ${JSON.stringify(mobSheet)};`,
    `export const MOB_RECT = ${JSON.stringify(mobMeta.rects)};`,
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
  // 彩蛋角色（B 站《忘却前夜》内容创作者）单独手写在 survivors-extra.json 里，
  // 不跑 build_survivors_data.mjs —— 那个脚本的输入是游戏本体的 dictionary，
  // 重跑会把没来源的人冲掉。这里只做「追加」：角色补进 CHARS，武器补进 WEAPONS。
  const extraPath = path.join(ROOT, 'data/survivors-extra.json');
  const extra = has(extraPath) ? readJson(extraPath) : { chars: [] };
  const chars = data.chars.slice();
  const weapons = data.weapons.slice();
  // 羁绊写的是官方角色全名（「血链·希洛」比 id 好认），构建时解析成 id。
  // 名字写错直接抛错 —— 静默跳过的话，玩家只会看到一条永远达不成的羁绊。
  const idByName = new Map(chars.map((x) => [x.n, String(x.id)]));
  for (const c of extra.chars || []) {
    const body = { ...c };
    // 主播本人的 B 站头像：一张只有 3–7KB，直接转 data URI 内联进 gen.js。
    // 边缘每多一次请求就是一两秒，九张头像分开发请求不划算。
    if (body.face) {
      const fp = path.join(ROOT, body.face);
      body.face = has(fp) ? 'data:image/webp;base64,' + fs.readFileSync(fp).toString('base64') : null;
      if (!body.face) delete body.face;
    }
    const bonds = (body.bonds || []).map((b) => {
      const cid = idByName.get(b.with);
      if (!cid) throw new Error(`survivors-extra.json：「${c.n}」的羁绊对象「${b.with}」不在官方角色表里`);
      return {
        n: b.n, alias: b.alias || b.with, cid, cname: b.with,
        need: b.need || 1, text: b.text, fx: b.fx || null,
      };
    });
    if (bonds.length) body.bonds = bonds; else delete body.bonds;
    const ws = (body.weapons || []).map((w, i) => {
      // 官方武器的 id 形如 awakener-0001:0，彩蛋沿用同一套：guest-xxx:0
      const id = `${c.pid}:${i}`;
      const full = {
        id, n: w.n, e: w.e, proto: w.proto, text: w.text,
        char: c.id, charName: c.n, realm: c.realm, realmCode: c.realmCode, role: c.role,
        egg: true,
      };
      // 单把武器的数值微调（原型的 cd/dmg/数量再乘这几个系数），
      // 让「同一原型」的两把技能在彩蛋角色身上也能玩出不同手感。
      for (const k of ['dmgMul', 'cdMul', 'countMul', 'color']) if (w[k] != null) full[k] = w[k];
      weapons.push(full);
      return { n: w.n, e: w.e, proto: w.proto, text: w.text };
    });
    body.weapons = ws;
    delete body.lock;
    chars.push(body);
  }
  const uri = 'data:image/webp;base64,' + fs.readFileSync(atlasPath).toString('base64');
  // 隐藏首领「弥萨格校猫」要能被 spawnEnemy 按索引取到，所以必须长在 MOBS 里；
  // 但它带 hidden 标记，spawnEnemy 的普通首领轮换会跳过它，只能由 updateCatBoss
  // 在满足条件时指名召唤。img 没有对应帧（它是手画的），所以留空。
  const mobs = data.monsters.slice();
  if (extra.boss) {
    mobs.push({ id: extra.boss.id, n: extra.boss.n, cls: 'Boss', hidden: true, cat: true });
  }
  const code = [
    '// 由 scripts/build.mjs 生成，请勿手改。',
    '// 源：assets/survivors/atlas.webp + data/survivors-atlas.json + data/survivors-data.json',
    '//     + data/survivors-extra.json（彩蛋角色与隐藏首领）',
    `export const ATLAS = ${JSON.stringify(uri)};`,
    `export const META = ${JSON.stringify({ cell: meta.cell, cols: meta.cols, w: meta.w, h: meta.h, frames: meta.frames })};`,
    `export const CHARS = ${JSON.stringify(chars)};`,
    `export const WEAPONS = ${JSON.stringify(weapons)};`,
    `export const MOBS = ${JSON.stringify(mobs)};`,
    `export const CREATIONS = ${JSON.stringify(data.creations)};`,
    `export const WHEELS = ${JSON.stringify(data.wheels)};`,
    `export const COVENANTS = ${JSON.stringify(data.covenants)};`,
    `export const BOSS_CAT = ${JSON.stringify(extra.boss || null)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/sv/gen.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return { chars: chars.length, weapons: weapons.length, kb: Math.round(code.length / 1024) };
}

// ------------------------------------------- 忘却协议的立绘图集与单位表
// 62 名唤醒体的待机 / 打击动图 + 头像 + 15 种怪物立绘已经在
// scripts/build_protocol_art.py 里拼成一张 webp（assets/protocol/proto-sheet.webp）。
// 这里把它连同帧表、单位数值表一起内联成一个模块：整局依然只有一个脚本请求。
// 改素材跑那个 py 脚本，改数值改 data/protocol-units.json，都别手改 js/pf/gen.js。
function genProtocol() {
  const sheetPath = path.join(ROOT, 'assets/protocol/proto-sheet.webp');
  if (!has(sheetPath)) throw new Error('缺少图集，先跑 python scripts/build_protocol_art.py');
  const art = readJson(path.join(ROOT, 'data/protocol-art.json'));
  const cfg = readJson(path.join(ROOT, 'data/protocol-units.json'));
  const uri = 'data:image/webp;base64,' + fs.readFileSync(sheetPath).toString('base64');
  // 界域徽记（官方素材，scripts/build_protocol_realm.py 裁过灰雾、缩到 44px）：
  // 四个加起来不到 10KB，内联之后仍然只有「页面 + 一个脚本」两个请求。
  const realm = {};
  for (const k of ['caro', 'aequor', 'chaos', 'ultra']) {
    const p = path.join(ROOT, `assets/protocol/realm-${k}.webp`);
    if (has(p)) realm[k] = 'data:image/webp;base64,' + fs.readFileSync(p).toString('base64');
  }
  const code = [
    '// 由 scripts/build.mjs 生成，请勿手改。',
    '// 源：assets/protocol/proto-sheet.webp + realm-*.webp + data/protocol-art.json + data/protocol-units.json',
    `export const SHEET = ${JSON.stringify(uri)};`,
    `export const REALM_ART = ${JSON.stringify(realm)};`,
    `export const ART = ${JSON.stringify({ w: art.w, h: art.h, anims: art.anims, mobs: art.mobs })};`,
    `export const UNITS = ${JSON.stringify(cfg.units)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/pf/gen.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return {
    units: cfg.units.length, mobs: Object.keys(art.mobs).length,
    realm: Object.keys(realm).length, kb: Math.round(code.length / 1024),
  };
}


// ------------------------------------------- 唤醒王：决斗链接的卡面图集与卡表
// 卡牌页要一次显示十几张卡面，逐张请求在边缘就是十几个 1~2 秒的来回；
// 所以头像已经被 scripts/build_duel_art.py 拼成一张 webp，这里只负责读成
// data URI，连同卡表 / 卡包 / 羁绊 / 世界观一起内联进 js/duel/gen.js。
// 改数值改 data/duel-*.json，别手改 gen.js。
function genDuel() {
  const cards = readJson(path.join(ROOT, 'data/duel-cards.json'));
  const packs = readJson(path.join(ROOT, 'data/duel-packs.json'));
  const lore = readJson(path.join(ROOT, 'data/duel-lore.json'));
  const art = readJson(path.join(ROOT, 'data/duel-art.json'));
  const sheetPath = path.join(ROOT, 'assets/duel/faces.webp');
  const backPath = path.join(ROOT, 'assets/duel/back.webp');
  if (!has(sheetPath)) throw new Error('缺少卡面图集，先跑 python scripts/build_duel_art.py');
  if (!has(backPath)) throw new Error('缺少卡背，先跑 python scripts/build_duel_art.py');
  const map = {};
  for (const c of cards.monsters) map[c.id] = Object.assign({ k: 'M' }, c);
  for (const c of cards.spells) map[c.id] = Object.assign({ k: 'S' }, c);
  for (const c of cards.traps) map[c.id] = Object.assign({ k: 'T' }, c);
  for (const c of cards.extras) map[c.id] = Object.assign({ k: 'E' }, c);
  // 觉醒体本身没有立绘，用第一只素材的脸（校猫用自己的）
  for (const c of cards.extras) {
    const k = map[c.id];
    if (!k.art) k.art = c.id === 'e12' ? c.n : (c.mat || [c.n])[0];
  }
  // 魔法 / 陷阱不挂人脸：统一用图集里画出来的两枚符号（早期没设 art，全部落到第一格那张「24」的头像上）
  for (const c of cards.spells) map[c.id].art = '@spell';
  for (const c of cards.traps) map[c.id].art = '@trap';
  // 卡面找不到就静默显示成第一格头像，所以这里直接拦住
  for (const id of Object.keys(map)) {
    const key = map[id].art || map[id].n;
    if (art.index[key] == null) throw new Error(`卡 ${id}（${map[id].n}）的卡面「${key}」不在图集里，先跑 build_duel_art.py`);
  }
  // 卡包里引用了不存在的卡会静默变成「抽到空气」，构建时就报错
  for (const pk of packs.packs) {
    for (const id of pk.cards) if (!map[id]) throw new Error(`卡包 ${pk.id} 引用了不存在的卡 ${id}`);
  }
  for (const dk of packs.decks) {
    let n = 0;
    for (const pair of dk.cards) {
      if (!map[pair[0]]) throw new Error(`预组 ${dk.id} 引用了不存在的卡 ${pair[0]}`);
      n += pair[1];
    }
    if (n < 30) throw new Error(`预组 ${dk.id} 只有 ${n} 张牌（至少要 30）`);
    for (const id of dk.extra) {
      if (!map[id] || map[id].k !== 'E') throw new Error(`预组 ${dk.id} 的额外卡组里有 ${id}，它不是觉醒体`);
    }
  }
  for (const b of packs.bonds) {
    for (const nm of b.need || []) {
      if (!Object.keys(map).some((id) => map[id].n === nm)) throw new Error(`羁绊「${b.n}」引用了不存在的角色 ${nm}`);
    }
  }
  const uri = 'data:image/webp;base64,' + fs.readFileSync(sheetPath).toString('base64');
  const back = 'data:image/webp;base64,' + fs.readFileSync(backPath).toString('base64');
  const code = [
    '// 由 scripts/build.mjs 生成，请勿手改。',
    '// 源：data/duel-cards.json + duel-packs.json + duel-lore.json + duel-art.json + assets/duel/*.webp',
    `export const CARDS = ${JSON.stringify(map)};`,
    `export const PACKS = ${JSON.stringify(packs.packs)};`,
    `export const BONDS = ${JSON.stringify(packs.bonds)};`,
    `export const DECKS = ${JSON.stringify(packs.decks)};`,
    `export const LORE = ${JSON.stringify(lore)};`,
    `export const FACES = ${JSON.stringify(uri)};`,
    `export const BACK = ${JSON.stringify(back)};`,
    `export const ART = ${JSON.stringify({ cell: art.cell, cols: art.cols, rows: art.rows, w: art.w, h: art.h, index: art.index })};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/duel/gen.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return {
    cards: Object.keys(map).length,
    kb: Math.round(code.length / 1024),
  };
}

// ------------------------------------------- 忘却王权的卡面头像
// data/reign-faces.json 是 scripts/build_reign_faces.py 从 assets/card/*.webp
// 裁出来的 200×275 卡面（一张 6~9KB）。这里把它内联成一个模块：
// 一局里会用到二十几张，逐个请求在边缘就是二十几个来回。
function genReign() {
  const p = path.join(ROOT, 'data/reign-faces.json');
  if (!has(p)) throw new Error('缺少卡面，先跑 python scripts/build_reign_faces.py');
  const faces = readJson(p);
  const code = [
    '// 由 scripts/build.mjs 生成，请勿手改。',
    '// 源：data/reign-faces.json ← scripts/build_reign_faces.py 裁的 assets/card/*.webp',
    `export const FACES = ${JSON.stringify(faces)};`,
    '',
  ].join('\n');
  const out = path.join(ROOT, 'js/reign/art.js');
  if (!has(out) || read(out) !== code) fs.writeFileSync(out, code, 'utf8');
  return { n: Object.keys(faces).length, kb: Math.round(code.length / 1024) };
}

// ------------------------------------------------------------------ 主流程
const artCount = genMergeArt();
const birdArt = genBirdArt();
const sv = genSurvivors();
const pf = genProtocol();
const rg = genReign();
const duel = genDuel();
// 「校猫的结合」要内联四十多张图（猫 + 造物 + 密契 + 钥令 + 首领），逻辑单独放一个脚本，
// 这里只负责在构建时调它，保证 js/binding-art.js 不会和 data/binding-art.json 走散。
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_binding_art.mjs')], { stdio: 'pipe' });

// 「忘却 2048」那十一级造物图同理：棋盘上同时躺着十几块，逐个请求就是十几个来回。
// 图源写在 data/g2048-levels.json，这里只负责在构建时重新内联一次。
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_g2048_art.mjs')], { stdio: 'pipe' });

// 「弥萨格狼人杀」的 62 张头像同理：一局里要用到十几张，逐个请求在边缘就是十几个来回。
// 清单写在 js/wolf/data.js 里（每名唤醒体的 av 字段），由这个脚本读成 data URI。
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_wolf_art.mjs')], { stdio: 'pipe' });

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
// g2048-skins.js 是「忘却 2048」的换皮池（一百多张图，四百来 KB）：只在点「换皮」时 import()。
const EXTRA_ENTRIES = ['js/merge-sync.js', 'js/bird-sync.js', 'js/merge-skins.js', 'js/g2048-skins.js'];

const extras = [];
for (const rel of EXTRA_ENTRIES) {
  const { code, modules } = bundle(rel, { wrap: false });
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

// ---- 启动数据拆两个文件
// boot.json：题库索引 + 造物标签 + 关键词（约 110KB）——决定「今天出哪道题」，
//   拿到它就能开始取分片，所以它必须小、必须最先到。
// dict.json：图鉴字典（约 520KB）——只在画名字/头像时才用得上，和分片并行下载，
//   并在不需要它的页面（合成、鸟弟、结合、幸存者、协议、首页）完全不下载。
// 拆开之前这两份合成 918KB 的一个文件：分片要等它下完才开始，白白多一个轮次。
const dict = readJson(path.join(ROOT, 'data/dictionary.json'));
const tags = readJson(path.join(ROOT, 'data/creation-tags.json'));
const kw = readJson(path.join(ROOT, 'data/keywords.json'));
const bankIdx = readJson(path.join(ROOT, 'data/bank/index.json'));
const bootJson = JSON.stringify({ tags, kw, bank: bankIdx });
const dictJson = JSON.stringify(dict);
fs.writeFileSync(path.join(ROOT, 'data/boot.json'), bootJson, 'utf8');
fs.writeFileSync(path.join(ROOT, 'data/dict.json'), dictJson, 'utf8');

// ---- 首页九宫格图标：Q 版头像内联成 data URI
// 九张图各自是一个请求，而边缘一次往返就要 1~2 秒；内联后首页只多 30KB，
// 比多九次往返划算。80×80 是 38px 图标的 2 倍屏尺寸。
const gameIconMap = has(path.join(ROOT, 'data/game-icons.json'))
  ? readJson(path.join(ROOT, 'data/game-icons.json')) : {};
const gameIcons = {};
for (const g of Object.keys(gameIconMap)) {
  const p = path.join(ROOT, gameIconMap[g].src);
  if (has(p)) gameIcons[g] = 'data:image/webp;base64,' + fs.readFileSync(p).toString('base64');
}

// ---- 构建戳：代码或题库一变就换版本，Service Worker 据此换缓存
const h = crypto.createHash('sha1');
h.update(read(path.join(ROOT, 'css/style.css')));
h.update(bootJson);
h.update(dictJson);
// 页面 HTML 也算进去：只改文案（比如首页）也要换缓存，否则老访客会先看到旧页面
for (const b of built) h.update(b.src);
// 首屏守护那一段是各页共用的 partial，改了它同样要换戳（它直接改写每页的 HTML）
h.update(read(path.join(SRC, 'partials/boot.html')));
for (const b of built) if (b.entry) h.update(read(path.join(OUT_JS, b.entry)));
for (const e of extras) h.update(read(path.join(OUT_JS, e.out)));
// 九宫格图标内联进了首页 HTML，换图必须换戳，否则老访客还是旧头像
for (const g of Object.keys(gameIcons)) h.update(gameIcons[g]);
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
// 哪些页面真的要启动数据：侦探（题库索引 + 字典）、图鉴 / 工坊 / 个人中心（字典）。
// 其余页面（合成 / 鸟弟 / 结合 / 幸存者 / 协议 / 首页 / 说明 / 典藏馆 / 狼人杀）
// 压根不读 boot.json，就别让它们各下一个一百多 KB 的 JSON——首屏守护仍然照常工作。
const DATA_PAGES = new Set(['detective', 'codex', 'workshop']);

const orientPartial = read(path.join(SRC, 'partials/orient.html')).trimEnd();
// 哪些页面挂方向开关：六个小游戏（挂机版与死亡报告是独立子项目，各自内联一份）
const ORIENT_PAGES = new Set(['detective', 'merge', 'bird', 'binding', 'survivors', 'protocol', 'wolf']);
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

// PWA：清单与图标挂到每个页面的 <head> 里，这样从任何一页都能「安装到桌面」。
// （Chrome 只要求当前页有 manifest；用户常常是从某个游戏页直接装的）
// 路径一律写相对（不带开头的 /）：GitHub Pages 那份挂在 /qdby_morimens/ 子路径下，
// 写成 /manifest.webmanifest 会去 labs 根目录找，每页白搭一个 404。
const pwaHead = `<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="assets/app/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="忘忘小游戏">`;

for (const p of built) {
  let s = p.src;
  // 内联样式表
  s = s.replace(/<link rel="stylesheet" href="css\/style\.css">\n?/,
    `<style>\n${css.trimEnd()}\n</style>\n`);
  // favicon 内联，省掉一个请求（它只有 511B，却要占一个连接位）
  s = s.replace(/<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/,
    `<link rel="icon" href="${faviconUri}" type="image/svg+xml">`);
  // 九宫格图标：占位注释换成内联的 Q 版头像
  s = s.replace(/<!-- @ico:([\w-]+) -->/g, (m, g) => (gameIcons[g]
    ? `<img src="${gameIcons[g]}" alt="" width="80" height="80" decoding="async">`
    : m));
  // 模块预加载不再需要：已经是单文件
  s = s.replace(/<link rel="modulepreload" href="js\/[^"]+">\n?/g, '');
  // 注入首屏守护（__DATA__ / __DICT__ 换成这一页要不要启动数据 / 字典：'' = 不下载）
  s = s.replace('<!-- @boot -->', bootPartial
    .replace(/__DATA__/g, () => (DATA_PAGES.has(p.name) ? 'data/boot.json' : ''))
    .replace(/__DICT__/g, () => (DATA_PAGES.has(p.name) ? 'data/dict.json' : '')));
  // 入口脚本换成打包文件
  if (p.entry) {
    s = s.replace(/(<script type="module" src="js\/)[\w.-]+\.js"/,
      `$1b/${p.entry}?v=${stamp}"`);
  }
  // 构建戳 + SW 注册
  s = s.replace('</head>', `<meta name="build" content="${stamp}">\n</head>`);
  // 横屏/竖屏开关：「所有小游戏共用一份」，只给游戏页注入，工具页（图鉴/工坊）不需要
  const orient = ORIENT_PAGES.has(p.name) ? orientPartial + '\n' : '';
  // 已经有 manifest 的页面（离线版自己写了）不要重复插
  if (!/<link[^>]+rel="manifest"/i.test(s)) s = s.replace('</head>', `${pwaHead}\n</head>`);
  s = s.replace('</body>', `${orient}${swReg}\n</body>`);
  fs.writeFileSync(path.join(ROOT, p.name + '.html'), s, 'utf8');
}

// ---- Service Worker
// 预缓存只放首页：以前这里塞了 13 个页面 + 13 个打包产物（协议 2.2MB、鸟弟 1.2MB…），
// 首次访问装好 SW 后会在后台并发拉 5~6MB，正好和当前这一页抢手机那 6 条连接，
// 表现就是「首屏图片半天不出来」。其余页面交给 navigate 的「先给缓存、后台更新」，
// 用户点进去过就会进缓存，第二遍打开就是本地读取。
const precache = [
  'index.html',
  // 离线版这一页必须能离线打开自己，否则断网就回不到「检查更新 / 导出存档」
  'offline.html',
  'manifest.webmanifest',
  'assets/app/icon-192.png',
  'assets/app/icon-512.png',
  'data/boot.json',
];
const sw = read(path.join(SRC, 'sw.js'))
  .replace('__STAMP__', stamp)
  .replace('__PRECACHE__', JSON.stringify(precache, null, 2));
fs.writeFileSync(path.join(ROOT, 'sw.js'), sw, 'utf8');

// ---- 离线包清单（PWA / 桌面版共用）
// 必须在页面与 bundle 都写完之后再扫，否则扫到的是上一版
execFileSync(process.execPath, [path.join(ROOT, 'scripts/build_offline_manifest.mjs'), stamp], { stdio: 'inherit' });

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
console.log(`共打包 ${totalModules} 次模块引用；data/boot.json ${Math.round(bootJson.length / 1024)}KB + data/dict.json ${Math.round(dictJson.length / 1024)}KB`);
console.log(`  唤醒体幸存者：${sv.chars} 名角色 / ${sv.weapons} 把武器，js/sv/gen.js ${sv.kb}KB（图集已内联）`);
console.log(`  忘却协议：${pf.units} 名唤醒体 / ${pf.mobs} 种怪物，js/pf/gen.js ${pf.kb}KB（图集已内联）`);
console.log(`  忘却王权：${rg.n} 张卡面，js/reign/art.js ${rg.kb}KB（立绘已内联）`);
for (const e of extras) console.log(`  延迟加载 js/b/${e.out}`.padEnd(30), `${e.modules} 个模块 → ${e.kb}KB（不进首屏）`);
console.log(`sw.js 预缓存 ${precache.length} 项`);
