// 把部署好的 Worker 地址写进 js/api.js 的 API_BASE，省得手改错。
// 用法：node scripts/set_api_base.mjs https://zjtt-api.xxx.workers.dev
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raw = process.argv[2];
if (!raw || !/^https?:\/\/\S+$/.test(raw)) {
  console.error('用法: node scripts/set_api_base.mjs https://zjtt-api.<你的子域>.workers.dev');
  process.exit(1);
}

const base = raw.trim().replace(/\/+$/, '');
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'js', 'api.js');
const src = fs.readFileSync(file, 'utf8');
const next = src.replace(/export const API_BASE = '[^']*';/, `export const API_BASE = '${base}';`);

if (next === src) {
  console.error('没找到 API_BASE 定义，请手动改 js/api.js');
  process.exit(1);
}

fs.writeFileSync(file, next);
console.log('API_BASE →', base);
