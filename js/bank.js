// 题库加载：索引常驻，题目按片取。
//
// 以前首页把 data/puzzles.json（1000 题、1.7MB）整包下完才开始渲染，
// 在慢网络上就表现为「一直载入中」。现在只加载：
//   data/bank/index.json   所有题的 [id, diff, core]，约 76KB
//   data/bank/cNNN.json    抽到哪一题就取哪一片（50 题，约 85KB）
// 首屏数据量从 1.7MB 降到 160KB（gzip 后约 60KB）。
//
// 分片文件名固定、内容随部署变，所以 URL 带上索引里的 stamp：
// stamp 一变就是新 URL，强缓存不会拿到上一次部署的旧题。

const INDEX_URL = 'data/bank/index.json';
const CHUNK_SIZE_DEFAULT = 50;

const state = {
  list: [],            // [{ id, diff, core, c }]  c = 所在片号
  byId: new Map(),
  stamp: '',
  chunkSize: CHUNK_SIZE_DEFAULT,
  nChunks: 0,
  seasons: {},
  chunks: new Map(),   // 片号 → 题目数组
  inflight: new Map(), // 片号 → Promise（并发时复用同一个请求）
  ready: false,
};

const pad3 = (n) => String(n).padStart(3, '0');

// 加载索引。失败要抛出，让上层知道题库不可用，而不是静默变成空题池。
// prefetched：index.html 里已经先开拉的索引 promise（省一个下载轮次）
async function load(prefetched) {
  const j = prefetched
    ? await prefetched
    : await (await fetch(INDEX_URL, { cache: 'no-cache' })).json();
  const raw = Array.isArray(j.items) ? j.items : [];
  state.chunkSize = Number(j.chunkSize) || CHUNK_SIZE_DEFAULT;
  state.stamp = String(j.stamp || '');
  state.seasons = j.seasons || {};
  state.list = raw.map((it, i) => ({
    id: String(it[0]),
    diff: Number(it[1]) || 2,
    core: Number(it[2]) === 1,
    c: Math.floor(i / state.chunkSize),
  }));
  state.byId = new Map(state.list.map((e) => [e.id, e]));
  state.nChunks = Math.ceil(state.list.length / state.chunkSize);
  state.ready = true;
  return bank;
}

function entry(id) { return state.byId.get(String(id)) || null; }

async function chunk(n) {
  if (state.chunks.has(n)) return state.chunks.get(n);
  if (state.inflight.has(n)) return state.inflight.get(n);
  const url = `data/bank/c${pad3(n)}.json?s=${encodeURIComponent(state.stamp)}`;
  const job = fetch(url, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : { puzzles: [] }))
    .then((j) => {
      const list = Array.isArray(j.puzzles) ? j.puzzles : [];
      state.chunks.set(n, list);
      state.inflight.delete(n);
      return list;
    })
    .catch((e) => { state.inflight.delete(n); throw e; });
  state.inflight.set(n, job);
  return job;
}

// 按 id 取题，返回密文题目（和以前 P.find(...) 拿到的一样）；找不到给 null
async function fetchPuzzle(id) {
  const e = entry(id);
  if (!e) return null;
  if (state.chunks.has(e.c)) {
    return state.chunks.get(e.c).find((p) => String(p.id) === e.id) || null;
  }
  const list = await chunk(e.c);
  return list.find((p) => String(p.id) === e.id) || null;
}

// 闲时预热相邻的片，翻下一题更快。
// 一定要延后：边缘只给 HTTP/1.1（单域名 6 条连接），首屏那几张卡图正在抢连接，
// 这时候再去拽 85KB 的分片，只会让图更晚出来。
function warm(id) {
  const e = entry(id);
  if (!e || !state.nChunks) return;
  const run = () => {
    const next = (e.c + 1) % state.nChunks;
    if (!state.chunks.has(next)) chunk(next).catch(() => {});
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 9000 });
  } else {
    setTimeout(run, 6000);
  }
}

export const bank = {
  load, entry, chunk, fetchPuzzle, warm,
  items: () => state.list,
  coreItems: () => state.list.filter((e) => e.core),
  count: () => state.list.length,
  seasons: () => state.seasons,
  isReady: () => state.ready,
};
