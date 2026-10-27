// 战报侦探 后端 —— 不依赖 Cloudflare 的版本（Node + 内置 SQLite）
//
// 为什么有这个文件：worker.js 的业务逻辑（点赞额度、乐观锁、结算幂等、题库）
// 是独立于平台的，只依赖标准的 `fetch(request, env)` 和 D1 那套
// `prepare().bind().first()/.all()/.run()` 接口。所以这里做两件事：
//   1. 用 node:sqlite 实现一个 D1 的小垫片（约 40 行），worker.js 一行不用改
//   2. 用 node:http 起服务，把请求转成 Request 交给 worker.js，再把 Response 写回去
//
// 跑起来：node server/node.js
//   PORT=8080           监听端口，默认 8787
//   HOST=0.0.0.0        监听地址
//   DATA_DIR=./data     数据库所在目录，默认 server/data
//   DB_FILE=...         直接指定库文件，优先于 DATA_DIR
//   WALINE_URL=...      账号 token 回源校验地址，默认沿用原配置
//   ALLOWED_ORIGINS=... 跨域白名单，逗号分隔，* 表示全放行
//   SERVE_STATIC=1      顺带把整站静态文件也发了（同源部署，不用配 CORS）
//
// 需要 Node ≥ 22.5（推荐 24，SQLite 已转正、没有实验警告）。零第三方依赖。
import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..'); // 仓库根，SERVE_STATIC 时对外发这里

// ------------------------------------------------------------------ 配置
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || 'server/data');
const DB_FILE = process.env.DB_FILE ? path.resolve(process.env.DB_FILE) : path.join(DATA_DIR, 'zjtt.db');
const SERVE_STATIC = /^(1|true|yes)$/i.test(String(process.env.SERVE_STATIC || ''));
const MAX_BODY = 1024 * 1024; // 和 worker 里的 512K 上限留一倍余量

// 旧 Node 在换行/告警上有差异，先把「需要什么版本」讲清楚，别抛一个看不懂的栈
let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {
  console.error(
    '[zjtt] 这台机器的 Node 没有 node:sqlite（需要 ≥ 22.5，推荐 24）。\n' +
    `        当前版本：${process.version}\n` +
    '        升级后重跑即可；或用 Docker：docker run --rm -p 8787:8787 -v $PWD/server/data:/app/data node:24-alpine node /app/node.js'
  );
  process.exit(1);
}

// ------------------------------------------------------------------ D1 垫片
// 只覆盖 worker.js 实际用到的三个方法。bind 之后还可以继续链式调用，和 D1 一致。
function normalize(v) {
  if (v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  return v;
}

function makeD1(sqlite) {
  const makeStmt = (sql, params) => ({
    bind: (...args) => makeStmt(sql, args.map(normalize)),

    // D1: first() 返回首行对象或 null；first('col') 返回该列
    async first(col) {
      const row = sqlite.prepare(sql).get(...params);
      if (!row) return null;
      const flat = { ...row };
      return col ? (flat[col] === undefined ? null : flat[col]) : flat;
    },

    // D1: all() 返回 { results, success }
    async all() {
      const rows = sqlite.prepare(sql).all(...params);
      return { results: rows.map((r) => ({ ...r })), success: true };
    },

    // D1: run() 返回 { success, meta:{ changes, last_row_id } }
    async run() {
      const r = sqlite.prepare(sql).run(...params);
      return {
        success: true,
        meta: { changes: Number(r.changes || 0), last_row_id: Number(r.lastInsertRowid || 0) },
      };
    },
  });

  return { prepare: (sql) => makeStmt(sql, []) };
}

// ------------------------------------------------------------------ 建库
fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const sqlite = new DatabaseSync(DB_FILE);

// WAL：读写不互相阻塞，VPS 上几十个人同时点也不卡
try { sqlite.exec('PRAGMA journal_mode = WAL'); } catch { /* 某些文件系统不支持，退回默认 */ }
try { sqlite.exec('PRAGMA busy_timeout = 5000'); } catch { /* 同上 */ }

const schemaPath = path.join(HERE, 'schema.sql');
sqlite.exec(fs.readFileSync(schemaPath, 'utf8'));

const env = {
  DB: makeD1(sqlite),
  WALINE_URL: process.env.WALINE_URL || 'https://textbox.qingdengbuyi.top',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || '',
};

const { default: app } = await import('./worker.js');

// ------------------------------------------------------------------ 静态文件（可选）
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

// 无扩展名的路径按页面名补 .html，和 GitHub Pages 的行为保持一致
const PAGES = new Set(['index', 'codex', 'profile', 'workshop', 'gallery', 'about']);

// 白名单，不是黑名单。仓库里还躺着 server/（含数据库）、.git/、scripts/，
// 用「禁止 ..」这种黑名单挡不住 URL 规范化后的 /.git/config，所以只放这些出去。
const PUBLIC_DIRS = ['css/', 'js/', 'assets/', 'data/'];
const PUBLIC_FILES = new Set(['favicon.svg', 'NOTICE.md', '.nojekyll']);
const PUBLIC_HTML = /^[a-z0-9_-]+\.html$/i;

function isPublic(rel) {
  const segs = rel.split('/').filter(Boolean);
  // 任何一段是 .. 或以点开头（.nojekyll 除外）一律不发
  if (segs.some((s) => s === '..' || (s.startsWith('.') && s !== '.nojekyll'))) return false;
  if (PUBLIC_FILES.has(rel)) return true;
  if (segs.length === 1 && PUBLIC_HTML.test(rel)) return true;
  return PUBLIC_DIRS.some((d) => rel.startsWith(d));
}

async function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  if (!rel) rel = 'index';
  if (!path.extname(rel) && PAGES.has(rel)) rel += '.html';

  if (!isPublic(rel)) return false; // 交给 404，别暴露「这里有个文件但不给你」这种信息

  const file = path.resolve(ROOT, rel);
  // 双保险：解析后的路径必须还在仓库根下面
  if (!file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('forbidden');
    return true;
  }

  let st;
  try {
    st = await fsp.stat(file);
  } catch {
    return false; // 交给 404
  }
  if (!st.isFile()) return false;

  // HTML 每次都回源，静态资源给短缓存：改完刷新就能看到
  const ext = path.extname(file).toLowerCase();
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=300';
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': st.size,
    'Cache-Control': cache,
  });
  fs.createReadStream(file).pipe(res);
  return true;
}

// ------------------------------------------------------------------ HTTP → Request
function toHeaders(raw) {
  const h = new Headers();
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else h.set(k, String(v));
  }
  return h;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const isApi = url.pathname === '/health' || !SERVE_STATIC;

  try {
    if (!isApi) {
      if (await serveStatic(url.pathname, res)) return;
      // 静态找不到就继续往下走，让 worker 决定是不是接口
    }

    const headers = toHeaders(req.headers);
    // worker 里用 CF-Connecting-IP 给游客做额度兜底；这里补上真实来源
    if (!headers.has('CF-Connecting-IP')) {
      const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const ip = fwd || req.socket.remoteAddress || '';
      headers.set('CF-Connecting-IP', ip.replace(/^::ffff:/, ''));
    }

    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    const body = hasBody ? await readBody(req) : undefined;

    const request = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length ? body : undefined,
    });

    const response = await app.fetch(request, env);
    const buf = Buffer.from(await response.arrayBuffer());

    const out = {};
    for (const [k, v] of response.headers) out[k] = v;
    res.writeHead(response.status, out);
    res.end(req.method === 'HEAD' ? undefined : buf);

    // 只打接口，静态资源太吵
    if (url.pathname.startsWith('/health') || !SERVE_STATIC) {
      console.log(`${req.method} ${url.pathname}${url.search} → ${response.status} (${Date.now() - started}ms)`);
    }
  } catch (e) {
    const status = Number(e && e.status) || 500;
    if (!res.headersSent) res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: status === 413 ? 'too_large' : 'server' }));
    if (status >= 500) console.error('[zjtt] 500', req.method, url.pathname, e);
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' || e.code === 'EACCES') {
    // Windows 上 8787 这类端口可能被系统保留（Hyper-V 动态端口段），报的会是 EACCES
    console.error(
      `[zjtt] ${HOST}:${PORT} 起不来（${e.code}）。换一个端口再试：\n` +
      `        PORT=8795 node server/node.js`
    );
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, HOST, () => {
  console.log(`[zjtt] 后端已启动  http://${HOST}:${PORT}`);
  console.log(`[zjtt] 数据库      ${DB_FILE}`);
  console.log(`[zjtt] 账号回源    ${env.WALINE_URL}`);
  if (SERVE_STATIC) console.log(`[zjtt] 同时提供静态站（同源，不用配 CORS）：${ROOT}`);
  else console.log('[zjtt] 只提供 API；想连站点一起发就加 SERVE_STATIC=1');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log(`\n[zjtt] ${sig}，正在关闭…`);
    server.close(() => {
      try { sqlite.close(); } catch { /* 已关 */ }
      process.exit(0);
    });
    // 有长连接没断干净时别卡死
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
