#!/usr/bin/env node
// 把整站打成桌面版（Electron）。
//
// 步骤：
//   1. 按 data/offline.json 的清单把文件拷到 desktop/web（和 PWA 离线包同一份清单，
//      保证「网页离线版」和「桌面版」内容一致，不会一个多一个少）
//   2. 写 desktop/latest.json（检查更新用的版本清单，要提交进仓库）
//   3. 装依赖 + electron-builder 打 zip 到 desktop/dist
//
// 用法：node scripts/build_desktop.mjs [--skip-install] [--dir]
//   --dir  只生成未打包的目录（desktop/dist/win-unpacked），调试用，快很多
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESKTOP = path.join(ROOT, 'desktop');
const WEB = path.join(DESKTOP, 'web');
const argv = process.argv.slice(2);
const skipInstall = argv.includes('--skip-install');
const dirOnly = argv.includes('--dir');

const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'));
const version = pkg.version;
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/offline.json'), 'utf8'));

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('先跑 node scripts/build.mjs 生成站点');
  process.exit(1);
}

// ---- 1. 同步 web/
console.log(`· 同步 ${manifest.files.length} 个文件 → desktop/web`);
// 不整目录删：这台机器的 rmSync 被「安全删除」垫片接管（一次砍上千个文件会被拦），
// 而且覆盖写本来就是幂等的。少数的残留文件（清单里已删掉的）不影响运行，手动清即可。
fs.mkdirSync(WEB, { recursive: true });
let bytes = 0;
for (const rel of manifest.files) {
  if (rel === 'sw.js' || rel === 'data/offline.json') continue;   // SW 在 app:// 下没意义
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) continue;
  const dst = path.join(WEB, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  bytes += fs.statSync(src).size;
}
fs.writeFileSync(path.join(WEB, 'desktop.json'), JSON.stringify({
  version, builtAt: new Date().toISOString(), files: manifest.files.length,
}, null, 2));
console.log(`  ${(bytes / 1048576).toFixed(1)}MB`);

// ---- 2. 更新清单（提交进仓库，桌面版检查更新时拉它）
const latest = {
  version,
  at: new Date().toISOString(),
  url: 'https://github.com/Z769018860/qdby_morimens/releases/latest',
  notes: '新版本可以直接覆盖旧文件夹，账号存档在系统用户目录里，不会被覆盖。',
};
fs.writeFileSync(path.join(DESKTOP, 'latest.json'), JSON.stringify(latest, null, 2) + '\n');
console.log('· desktop/latest.json →', version);

// ---- 3. 打包
// 用「当前这个 node」自带的 npm：PATH 上的 npm 可能是很老的 6.x，装不动 modern 包；
// Windows 上 Node ≥20 也不给 .cmd 直接 spawn（EINVAL），所以统一走 node + npm-cli.js。
const NPM_CLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
const run = (cmd, args) => execFileSync(cmd, args, {
  cwd: DESKTOP,
  stdio: 'inherit',
  env: { ...process.env, npm_config_cache: process.env.npm_config_cache || path.join(ROOT, '..', '.npm-cache') },
});

if (!fs.existsSync(path.join(DESKTOP, 'node_modules', 'electron'))) {
  if (skipInstall) {
    console.error('没装依赖，去掉 --skip-install 再跑一次');
    process.exit(1);
  }
  console.log('· 安装 electron / electron-builder（第一次会下载几百 MB）');
  run(process.execPath, [NPM_CLI, 'install', '--no-audit', '--no-fund']);
}

// -c.win.signAndEditExecutable=false：不让 electron-builder 去改 exe 资源。
// 它改资源要下 winCodeSign（7z 里带 macOS 符号链接），普通权限解压必然失败；
// 我们改成打包完自己用 resedit 写图标和版本信息（见下面第 4 步）。
const args = ['--win', 'dir', '--x64', '-c.win.signAndEditExecutable=false'];
const ebCli = path.join(DESKTOP, 'node_modules', 'electron-builder', 'cli.js');
console.log('· electron-builder', args.join(' '));
run(process.execPath, [ebCli, ...args]);

if (dirOnly) {
  console.log('\n完成（仅目录），产物在 desktop/dist/win-unpacked');
  process.exit(0);
}

// ---- 4. 自己打 zip
// 不用 electron-builder 的 zip target：它会为了签名去下载 winCodeSign 包，
// 解压里含 macOS 的符号链接，普通权限下必然失败（Cannot create symbolic link）。
// 我们本来就不签名，直接把 win-unpacked 压成一个「解压即用」的文件夹更省事。
const DIST = path.join(DESKTOP, 'dist');
const seven = path.join(DESKTOP, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
const FRIENDLY = `忘忘同人小游戏-v${version}`;
const unpacked = path.join(DIST, 'win-unpacked');
const folder = path.join(DIST, FRIENDLY);
const outName = `wangwang-fangames-${version}-win-x64.zip`;

try { fs.rmSync(folder, { recursive: true, force: true }); } catch { /* 安全删除垫片可能拦，忽略 */ }
try { fs.renameSync(unpacked, folder); } catch { /* 已经改过名就继续用 */ }

// ---- 3.5 写 exe 资源：图标 + 版本信息（纯 JS，不需要管理员权限，也不用下 winCodeSign）
function stampExe() {
  const ICO = path.join(ROOT, 'assets/app/icon.ico');
  const exePath = path.join(folder, `${pkg.productName}.exe`);
  if (!fs.existsSync(ICO) || !fs.existsSync(exePath)) {
    console.log('· 跳过 exe 资源（缺 icon.ico 或 exe）');
    return;
  }
  const mod = createRequire(path.join(DESKTOP, 'package.json'))('resedit');
  const { NtExecutable, NtExecutableResource, Resource, Data } = mod;
  const exe = NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = NtExecutableResource.from(exe);

  const ico = Data.IconFile.from(fs.readFileSync(ICO));
  Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, ico.icons.map((i) => i.data));

  const nums = String(version).split('.').map((n) => parseInt(n, 10) || 0);
  const vi = Resource.VersionInfo.createEmpty();
  vi.setFileVersion(nums[0] || 0, nums[1] || 0, nums[2] || 0, 0);
  vi.setProductVersion(nums[0] || 0, nums[1] || 0, nums[2] || 0, 0);
  vi.setStringValues({ lang: 1033, codepage: 1200 }, {
    ProductName: pkg.productName,
    FileDescription: pkg.productName + ' · 同人小游戏合集',
    CompanyName: pkg.author,
    LegalCopyright: 'CC BY-NC-SA 4.0 · 同人作品，与官方无关',
    OriginalFilename: `${pkg.productName}.exe`,
  });
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log('· 写入 exe 图标与版本信息 →', path.basename(exePath));
}

stampExe();

if (!fs.existsSync(seven)) {
  console.log('· 没有 7za，跳过打包；未打包目录在', folder);
  process.exit(0);
}
console.log('· 压缩 →', outName);
execFileSync(seven, ['a', '-tzip', '-mx=5', '-bd', path.join(DIST, outName), FRIENDLY], { cwd: DIST, stdio: 'inherit' });

const size = fs.existsSync(path.join(DIST, outName)) ? (fs.statSync(path.join(DIST, outName)).size / 1048576).toFixed(1) + 'MB' : '（未生成）';
console.log(`\n完成：desktop/dist/${outName}  ${size}`);
console.log(`未打包目录：desktop/dist/${FRIENDLY}`);
