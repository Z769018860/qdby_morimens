// 由 scripts/build.mjs 生成，勿手改；改这里请改 src/sw.js。
//
// 存在的理由：EdgeOne Pages 给静态资源的响应头是
//   Cache-Control: public, max-age=0, must-revalidate
// 也就是浏览器每次都得回源校验，而边缘一个来回就是 1~2 秒。
// 本站是纯静态同人站，没有个性化内容，所以用 CacheStorage 自己做一层缓存：
//   · 页面导航：先给缓存，后台顺手更新（下次进来就是新版）
//   · 静态资源（js/css/json/图片）：缓存优先
//   · /api/ 一律走网络，绝不缓存
//
// 预缓存不放在 install 里：那会让「装上」这个动作被 400KB 的下载拖住，
// 期间页面还不受控。这里改成 activate 之后在后台慢慢填——当前页先受控，
// 等它填完，之后切页就都是本地读取了。
const VERSION = '1c75dd4fd5';
const CACHE = 'zjtt-' + VERSION;
// 用户主动「下载离线包」写进这里：独立命名、activate 时不清理，重装浏览器才没
const OFFLINE = 'zjtt-offline-v1';
const PRECACHE = [
  "index.html",
  "offline.html",
  "manifest.webmanifest",
  "assets/app/icon-192.png",
  "assets/app/icon-512.png",
  "data/boot.json"
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== OFFLINE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // 后台把各页面的 HTML 与打包脚本填进缓存，失败不影响已经能用的部分
    const cache = await caches.open(CACHE);
    await Promise.allSettled(PRECACHE.map(async (url) => {
      const hit = await cache.match(url);
      if (hit) return;
      const res = await fetch(url, { cache: 'reload' });
      if (res && res.ok) await cache.put(url, res);
    }));
  })());
});

const STATIC_RE = /\.(?:js|mjs|css|json|webp|png|jpe?g|svg|gif|ico|woff2?|ttf)$/i;
// 子项目：自己迭代、文件名不带指纹，缓存优先会让老访客一直卡在旧版本，所以走网络优先
const SUBS = ['/idle/', '/deathreport/', '/casefile/'];
const isSub = (p) => SUBS.some((x) => p.startsWith(x));

// 离线包命中：用户明确「下载」过这一份，就按这一份跑（更新由 offline.html 重新下载覆盖）
async function offlineHit(req) {
  try {
    const cache = await caches.open(OFFLINE);
    return await cache.match(req, { ignoreSearch: true });
  } catch (e) {
    return null;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;   // 接口和点赞计数必须实时

  event.respondWith(route(req, event, url));
});

async function route(req, event, url) {
  // offline.html 自己永远走网络（它要拿最新的清单和逻辑），其余一律先看离线包
  if (!/\/offline\.html$/i.test(url.pathname)) {
    const off = await offlineHit(req);
    if (off) return off;
  }

  if (req.mode === 'navigate') {
    // 子项目（idle/ / deathreport/ / casefile/）是独立迭代的：页面外壳很小，走网络拿最新的，
    // 免得「先给缓存」让老访客一直看到旧界面。离线时才回落到缓存。
    if (isSub(url.pathname)) return networkFirst(req, event);
    return navigate(req, event);
  }
  if (STATIC_RE.test(url.pathname)) {
    // 子项目的脚本 / 数据文件名不带指纹，缓存优先会让老访客一直卡在旧版本
    // （旧数据里的钥令在本地已经删掉，图标就只剩一个问号）。所以它跟页面一样走网络优先。
    return isSub(url.pathname) ? networkFirst(req, event) : staticFirst(req);
  }
  return fetch(req);
}

async function navigate(req, event) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });
  const fresh = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  });

  if (hit) {
    // 先给旧的（快），同时在后台把新的写进缓存
    event.waitUntil(fresh.catch(() => {}));
    return hit;
  }
  const res = await fresh.catch(() => null);
  if (res) return res;
  const fallback = await cache.match('index.html', { ignoreSearch: true });
  return fallback || new Response('离线，且这一页还没缓存。', {
    status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function networkFirst(req, event) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    // 先回落到自己所在子项目的首页，再回落站点首页
    const seg = new URL(req.url).pathname.split('/')[1];
    if (seg) {
      const own = await cache.match(`/${seg}/index.html`, { ignoreSearch: true });
      if (own) return own;
    }
    const fallback = await cache.match('index.html', { ignoreSearch: true });
    if (fallback) return fallback;
    return new Response('离线，且这一页还没缓存。', {
      status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

async function staticFirst(req) {
  const url = new URL(req.url);
  const cache = await caches.open(CACHE);

  // 离线版「检查更新」会给 data/offline.json 挂一个 ?t= 时间戳来绕过 HTTP 缓存。
  // 这种请求必须直连网络：走缓存就等于永远读到旧清单，永远提示「已经是最新」。
  if (/\/data\/offline\.json$/.test(url.pathname)) {
    try {
      return await fetch(req);
    } catch (err) {
      const old = await cache.match(url.origin + url.pathname);
      return old || Response.error();
    }
  }

  // 其余静态资源拿「路径」当缓存键，忽略 ?v=构建戳。
  // 脚本引用一律是 js/b/xxx.js?v=<构建戳>，按原始 URL 存的话，同一份 cache
  // 里会为每次发版多存一整套脚本；归一化之后一个文件只有一份。
  const key = url.origin + url.pathname;
  const hit = await cache.match(key);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.status === 200 && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
    return res;
  } catch (err) {
    const alt = await cache.match(key, { ignoreSearch: true });
    if (alt) return alt;
    throw err;
  }
}
