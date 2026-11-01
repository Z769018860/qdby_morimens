// 工坊：导入一首自己的音频 → 按鼓点自动出谱 → 在时间轴上改 → 存本机 / 发布到云端曲库。
//
// 这里只管「谱面的制作与发行」，不碰对局逻辑：对局那一侧只要拿到
// 「一段 notes + 一个 AudioBuffer」就能开局，接口由 lovelive.js 注入（api）。
//
// 三条硬规矩（和整站一致）：
//   ① 音频不上传。导入的文件只进本机 IndexedDB，云库里发的是谱面（时间 + 轨道），
//      别人拿到谱面要自己配音频；这也是公开仓库能收谱面的前提。
//   ② 谱面是纯数据，最大 3000 个音符（约 40KB），服务端限 900KB，够用。
//   ③ 发布要登录（走站点同一套 authToken），没登录就明确告诉用户去首页登录。

const LANES = 9;
const NOTE_R = 0.3;             // 音符半径 = 行高 × 这个比例

export function initShop(api) {
  const { G, SAVE, persist, Audio, show, startLive, renderSongs, $, $$ } = api;
  const chartFromOnsets = api.chartFromOnsets;
  const detectOnsets = api.detectOnsets;
  const packOnsets = api.packOnsets;
  const diffOf = api.diffOf;
  const fmt = api.fmt;
  const mmss = api.mmss;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------------------------------------------------------------- 小工具 */
  const idbCGet = api.idbCGet, idbCSet = api.idbCSet, idbCDel = api.idbCDel;
  const idbGet = api.idbGet, idbSet = api.idbSet, idbDel = api.idbDel;
  const decode = (raw) => Audio.decode(raw);
  const now = () => Date.now();
  const uid = () => 'm' + now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 5);

  function status(el, msg, err) {
    const n = $(el);
    if (!n) return;
    n.textContent = msg || '';
    n.classList.toggle('err', !!err);
  }

  /* ---------------------------------------------------------------- 云端 */
  // 站点和函数同源时直接 /api；GitHub Pages 镜像站才需要绝对地址
  const apiBase = () => (/\.github\.io$/i.test(location.hostname)
    ? 'https://zjtt-api.workers.dev'
    : location.origin + '/api');
  function token() {
    try {
      const raw = localStorage.getItem('zjtt:authToken');
      if (!raw) return '';
      const v = JSON.parse(raw);
      return typeof v === 'string' ? v : '';
    } catch (e) { return ''; }
  }
  async function call(path, opt) {
    const o = opt || {};
    const t = token();
    const r = await fetch(apiBase() + path, {
      method: o.method || 'GET',
      headers: Object.assign({ Accept: 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {},
        o.body ? { 'Content-Type': 'application/json' } : {}),
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) {
      const code = (j && j.error) || ('http_' + r.status);
      const e = new Error(code);
      e.code = code;
      e.status = r.status;
      throw e;
    }
    return j;
  }

  /* ---------------------------------------------------------------- 我的谱面 */
  const MINE = () => SAVE.mine;
  function saveMine(list) { SAVE.mine = list.slice(0, 60); persist(); }

  // 把任意记录压成一份「对局能吃的谱面」
  function packNotes(list) {
    return list
      .slice()
      .sort((a, b) => a.t - b.t || a.lane - b.lane)
      .map((n) => [+n.t.toFixed(3), n.lane | 0, n.kind === 'hold' ? 1 : 0, +(n.tail || 0).toFixed(3), +((n.s || 0.6)).toFixed(2)]);
  }
  function unpackNotes(arr) {
    return (arr || []).map((a) => ({
      t: +a[0], lane: clamp(a[1] | 0, 0, 8), kind: a[2] ? 'hold' : 'tap',
      tail: a[2] ? +a[3] : 0, s: a[4] == null ? 0.6 : +a[4], judged: false, hit: false, holding: false,
    }));
  }

  async function saveChart(rec) {
    // rec: {id, title, artist, dur, audioKey, notes: [..packed..], cloud}
    await idbCSet(rec.id, { notes: rec.notes, dur: rec.dur, audioKey: rec.audioKey, at: now() });
    const list = MINE().slice();
    const i = list.findIndex((m) => m.id === rec.id);
    const meta = {
      id: rec.id, title: rec.title, artist: rec.artist || '', dur: rec.dur,
      count: rec.notes.length, at: now(), cloud: rec.cloud || (i >= 0 ? list[i].cloud : '') || '',
    };
    if (i >= 0) list[i] = Object.assign(list[i], meta); else list.unshift(meta);
    saveMine(list);
    return meta;
  }

  /* ---------------------------------------------------------------- 列表渲染 */
  function songOf(m) {
    return {
      id: 'c-' + m.id, n: m.title, sub: '我的谱面' + (m.artist ? ' · ' + m.artist : ''),
      bpm: 0, custom: true, mineId: m.id, dur: m.dur, count: m.count,
    };
  }
  function songs() { return MINE().map(songOf); }

  function renderMine() {
    const box = $('#shop-mine');
    if (!box) return;
    const list = MINE();
    if (!list.length) { box.innerHTML = '<p class="dim">还没有。上面选一个音频文件，先让它自动出一版谱子。</p>'; return; }
    box.innerHTML = list.map((m) => (
      '<div class="mrow" data-id="' + m.id + '">'
      + '<div class="mi"><b>' + esc(m.title) + '</b><span>' + (m.count || 0) + ' 音符 · ' + mmss(m.dur)
      + (m.cloud ? ' · ☁ 已发布' : '') + '</span></div>'
      + '<div class="ma">'
      + '<button data-act="play" type="button">试玩</button>'
      + '<button data-act="edit" type="button">编辑</button>'
      + '<button data-act="pub" type="button">发布</button>'
      + '<button data-act="del" type="button">删</button>'
      + '</div></div>'
    )).join('');
  }

  function renderCloud() {
    const box = $('#shop-cloud');
    if (!box) return;
    if (!CLOUD.items.length) {
      box.innerHTML = '<p class="dim">云端还没有谱面。你发布的第一份就会出现在这里。</p>';
      return;
    }
    box.innerHTML = CLOUD.items.map((c) => (
      '<div class="mrow" data-cid="' + esc(c.id) + '">'
      + '<div class="mi"><b>' + esc(c.title || '未命名') + '</b><span>'
      + (c.authorName ? esc(c.authorName) + ' · ' : '') + (c.count || 0) + ' 音符 · ' + mmss(c.dur)
      + (SAVE.cloudAudio[c.id] ? ' · ♪ 已配音频' : '') + '</span></div>'
      + '<div class="ma"><button data-act="cplay" type="button">试玩</button></div>'
      + '</div>'
    )).join('');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const CLOUD = { items: [], loaded: false };

  async function loadCloud(force) {
    if (CLOUD.loaded && !force) return;
    status('#shop-cloud-status', '正在拉云端曲库…');
    try {
      const j = await call('/llsongs?limit=40');
      CLOUD.items = (j.items || []).slice();
      CLOUD.loaded = true;
      status('#shop-cloud-status', CLOUD.items.length ? ('共 ' + (j.total || CLOUD.items.length) + ' 份谱面') : '云端还没有谱面。');
    } catch (e) {
      status('#shop-cloud-status', '云端连不上（' + (e.code || 'offline') + '）。静态站能玩，但曲库要等接口部署好。', true);
    }
    renderCloud();
  }

  /* ---------------------------------------------------------------- 导入 → 自动出谱 */
  let shopDiff = 'normal';
  let pending = null;      // 正在等文件：{ mode:'new' } | { mode:'audio', cloudId }

  async function importNew(file) {
    status('#shop-status', '正在读取「' + file.name + '」…');
    try {
      const raw = await file.arrayBuffer();
      const ac = Audio.ensure();
      if (!ac) throw new Error('这个浏览器没有 WebAudio，放不了音频');
      status('#shop-status', '正在解码…（大文件要等几秒）');
      await new Promise((r) => setTimeout(r, 20));
      const buf = await decode(raw.slice(0));
      status('#shop-status', '正在抓鼓点…（' + mmss(buf.duration) + '）');
      await new Promise((r) => setTimeout(r, 20));
      const onsets = detectOnsets(buf);
      const D = diffOf(shopDiff);
      const seed = (Date.now() & 0x7fffffff) >>> 0;
      const c = chartFromOnsets(onsets, buf.duration, D, seed);
      const id = uid();
      const audioKey = 'au:' + id;
      await idbSet(audioKey, { name: file.name, data: raw.slice(0), onsets: packOnsets(onsets), dur: buf.duration });
      const title = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || '未命名曲目';
      const meta = await saveChart({
        id, title, artist: '', dur: buf.duration, audioKey,
        notes: packNotes(c.notes),
      });
      status('#shop-status', '好了：' + meta.count + ' 个音符。进编辑器看看？');
      renderMine();
      openEditor(Object.assign({ audio: buf, audioKey }, meta, { notes: packNotes(c.notes) }));
    } catch (e) {
      status('#shop-status', '没成功：' + (e && e.message ? e.message : '这个文件解不开（换个 mp3 / m4a / wav 试试）'), true);
    }
  }

  // 云端谱面配本地音频：时长差超过 6 秒就提醒（谱面按原曲时间写死，差太多会错位）
  async function bindCloudAudio(cloudId, file) {
    status('#shop-status', '正在给云端谱面配音频…');
    try {
      const raw = await file.arrayBuffer();
      const buf = await decode(raw.slice(0));
      const one = await call('/llsongs/' + encodeURIComponent(cloudId));
      const want = Number(one.dur) || 0;
      const diff = Math.abs(buf.duration - want);
      const audioKey = 'cl:' + cloudId;
      await idbSet(audioKey, { name: file.name, data: raw.slice(0), dur: buf.duration });
      SAVE.cloudAudio[cloudId] = { name: file.name, dur: buf.duration };
      persist();
      status('#shop-status', diff > 6
        ? ('配上了，但这段音频 ' + mmss(buf.duration) + ' 和谱面的 ' + mmss(want) + ' 差了 ' + Math.round(diff) + ' 秒，可能会错位。')
        : ('配好了：' + mmss(buf.duration) + '，和谱面对得上。'), diff > 6);
      renderCloud();
      playCloud(cloudId, buf, audioKey);
    } catch (e) {
      status('#shop-status', '配音频失败：' + (e && e.message ? e.message : e.code || '未知'), true);
    }
  }

  /* ---------------------------------------------------------------- 对局入口 */
  async function playMine(id) {
    const m = MINE().find((x) => x.id === id);
    if (!m) return;
    G.song = songOf(m);
    G.diffK = 'normal';
    startLive();
  }
  async function playCloud(cloudId, buf, audioKey) {
    let title = '';
    let dur = 0;
    try {
      const one = await call('/llsongs/' + encodeURIComponent(cloudId));
      title = one.title || '云端谱面';
      dur = Number(one.dur) || 0;
    } catch (e) {
      status('#shop-cloud-status', '云端谱面拉不下来（' + (e.code || 'offline') + '）', true);
      return;
    }
    G.song = {
      id: 'k-' + cloudId, n: title, sub: '云端曲库', bpm: 0, custom: true,
      cloudId, dur, count: 0,
    };
    G.diffK = 'normal';
    if (buf) { /* 已经解码好，startLive 会从 IndexedDB 再取一次（缓存命中，不会重复解码） */ }
    startLive();
  }

  /* ---------------------------------------------------------------- 编辑器 */
  const ED = {
    open: false, rec: null, notes: [], audio: null, sel: -1,
    t0: 0, pps: 110, snap: 0.05, undo: [], playing: false, playT: 0,
    w: 0, h: 0, rowH: 0, dpr: 1, drag: null, down: null,
  };
  const edCv = () => $('#ed-cv');

  function edFit() {
    const cv = edCv();
    if (!cv) return;
    const b = cv.parentElement.getBoundingClientRect();
    ED.w = Math.max(200, b.width);
    ED.h = Math.max(120, b.height);
    ED.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(ED.w * ED.dpr);
    cv.height = Math.round(ED.h * ED.dpr);
    cv.style.width = ED.w + 'px';
    cv.style.height = ED.h + 'px';
    ED.rowH = ED.h / LANES;
  }

  const xOf = (t) => (t - ED.t0) * ED.pps;
  const tOf = (x) => ED.t0 + x / ED.pps;
  const snapT = (t) => (ED.snap > 0 ? Math.round(t / ED.snap) * ED.snap : t);

  function edPushUndo() {
    ED.undo.push(ED.notes.map((n) => ({ t: n.t, lane: n.lane, kind: n.kind, tail: n.tail, s: n.s })));
    if (ED.undo.length > 30) ED.undo.shift();
  }

  function edDraw() {
    const cv = edCv();
    if (!cv) return;
    const c = cv.getContext('2d');
    c.setTransform(ED.dpr, 0, 0, ED.dpr, 0, 0);
    c.clearRect(0, 0, ED.w, ED.h);
    c.fillStyle = '#0d1018';
    c.fillRect(0, 0, ED.w, ED.h);
    // 轨道
    for (let i = 0; i < LANES; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.022)' : 'transparent';
      c.fillRect(0, i * ED.rowH, ED.w, ED.rowH);
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, i * ED.rowH);
      c.lineTo(ED.w, i * ED.rowH);
      c.stroke();
      c.fillStyle = 'rgba(190,200,225,0.4)';
      c.font = '600 ' + Math.round(Math.min(11, ED.rowH * 0.3)) + 'px ui-monospace,monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(api.KEYS[i], 4, i * ED.rowH + ED.rowH / 2);
    }
    // 时间网格：0.25 秒细线，1 秒粗线 + 刻度
    const step = ED.pps > 200 ? 0.1 : ED.pps > 90 ? 0.25 : 0.5;
    const tEnd = tOf(ED.w);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (let t = Math.floor(ED.t0 / step) * step; t <= tEnd; t += step) {
      const x = xOf(t);
      const one = Math.abs(t - Math.round(t)) < 1e-6;
      c.strokeStyle = one ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ED.h);
      c.stroke();
      if (one) {
        c.fillStyle = 'rgba(190,200,225,0.35)';
        c.font = '10px ui-monospace,monospace';
        c.fillText(Math.round(t) + 's', x, ED.h - 12);
      }
    }
    // 音符
    for (let i = 0; i < ED.notes.length; i++) {
      const n = ED.notes[i];
      const x = xOf(n.t);
      if (x < -40 || x > ED.w + 40) continue;
      const y = n.lane * ED.rowH + ED.rowH / 2;
      const r = ED.rowH * NOTE_R;
      const hue = (n.lane * 40 + 190) % 360;
      if (n.kind === 'hold') {
        const w = Math.max(6, (n.tail - n.t) * ED.pps);
        c.fillStyle = 'hsla(' + hue + ',70%,60%,0.28)';
        c.fillRect(x, y - r * 0.5, w, r);
        c.strokeStyle = 'hsla(' + hue + ',80%,70%,0.8)';
        c.lineWidth = 1.5;
        c.strokeRect(x, y - r * 0.5, w, r);
      }
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = 'hsl(' + hue + ',65%,52%)';
      c.fill();
      if (i === ED.sel) {
        c.strokeStyle = '#ffd76a';
        c.lineWidth = 2.5;
        c.stroke();
      }
    }
    // 播放头
    if (ED.playing) {
      const t = ED.playT + Audio.time();
      const x = xOf(t);
      c.strokeStyle = '#ff9ecb';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ED.h);
      c.stroke();
    }
  }

  function openEditor(rec) {
    ED.rec = rec;
    ED.notes = unpackNotes(rec.notes);
    ED.sel = -1;
    ED.undo = [];
    ED.t0 = 0;
    ED.playing = false;
    ED.playT = 0;
    $('#ed-name').value = rec.title || '未命名曲目';
    $('#ed-artist').value = rec.artist || '';
    $('#ed-status').textContent = ED.notes.length + ' 个音符 · ' + mmss(rec.dur) + '　点空白处加一个，拖音符改时间/轨道，右键删。';
    ED.open = true;
    show('edit');
    edFit();
    edDraw();
  }

  async function ensureAudio(rec) {
    if (ED.audio && ED.audioKey === rec.audioKey) return ED.audio;
    const row = await idbGet(rec.audioKey).catch(() => null);
    if (!row || !row.data) return null;
    ED.audio = await decode(row.data.slice(0));
    ED.audioKey = rec.audioKey;
    return ED.audio;
  }

  function edHit(x, y) {
    const lane = clamp(Math.floor(y / ED.rowH), 0, LANES - 1);
    const t = tOf(x);
    let best = -1, bd = 1e9;
    for (let i = 0; i < ED.notes.length; i++) {
      const n = ED.notes[i];
      if (n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      const near = n.kind === 'hold' ? (t >= n.t && t <= n.tail) : false;
      const dd = near ? 0 : d;
      if (dd < bd && (near || d * ED.pps < ED.rowH * 0.5)) { bd = dd; best = i; }
    }
    return best;
  }

  function edPointerDown(e) {
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    const idx = edHit(x, y);
    ED.down = { x, y, t0: ED.t0, idx };
    if (idx >= 0) {
      ED.sel = idx;
      edPushUndo();
      ED.drag = { idx, t: ED.notes[idx].t, tail: ED.notes[idx].tail, lane: ED.notes[idx].lane, x0: x, y0: y };
    } else {
      ED.drag = { pan: true };
    }
    edDraw();
  }
  function edPointerMove(e) {
    if (!ED.drag) return;
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    if (ED.drag.pan) {
      ED.t0 = Math.max(0, ED.drag.t0 - (x - ED.down.x) / ED.pps);
      edDraw();
      return;
    }
    const d = ED.drag;
    if (Math.abs(x - ED.down.x) < 3 && Math.abs(y - ED.down.y) < 3) return;
    const n = ED.notes[d.idx];
    if (!n) return;
    const dt = (x - ED.down.x) / ED.pps;
    n.t = Math.max(0, snapT(d.t + dt));
    n.lane = clamp(Math.floor(y / ED.rowH), 0, LANES - 1);
    if (n.kind === 'hold') n.tail = n.t + Math.max(0.25, d.tail - d.t);
    edDraw();
  }
  function edPointerUp(e) {
    if (!ED.drag || !ED.down) { ED.drag = null; ED.down = null; return; }
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const dx = Math.abs(e.clientX - b.left - ED.down.x);
    const dy = Math.abs(e.clientY - b.top - ED.down.y);
    if (ED.drag.pan) {
      if (dx < 6 && dy < 6) {
        // 轻点空白：在这一点加个音符
        edPushUndo();
        const t = Math.max(0, snapT(tOf(ED.down.x)));
        const lane = clamp(Math.floor(ED.down.y / ED.rowH), 0, LANES - 1);
        ED.notes.push({ t, lane, kind: 'tap', tail: 0, s: 0.6 });
        ED.notes.sort((a, b2) => a.t - b2.t || a.lane - b2.lane);
        ED.sel = ED.notes.findIndex((n) => n.t === t && n.lane === lane);
      }
    }
    ED.drag = null;
    ED.down = null;
    edDraw();
    edCount();
  }

  function edCount() {
    const el = $('#ed-status');
    if (el) el.textContent = ED.notes.length + ' 个音符 · 拖音符改位置，右键删，滚轮缩放。';
  }

  async function edSave() {
    if (!ED.rec) return null;
    const title = ($('#ed-name').value || '').trim().slice(0, 40) || '未命名曲目';
    const artist = ($('#ed-artist').value || '').trim().slice(0, 24);
    const meta = await saveChart({
      id: ED.rec.id, title, artist, dur: ED.rec.dur, audioKey: ED.rec.audioKey,
      notes: packNotes(ED.notes), cloud: ED.rec.cloud,
    });
    ED.rec = Object.assign({}, ED.rec, meta);
    $('#ed-status').textContent = '已保存：' + meta.count + ' 个音符。';
    renderMine();
    if (G.scr === 'songs' || G.scr === 'title') renderSongs();
    return meta;
  }

  async function edPublish() {
    if (!ED.rec) return;
    if (!token()) {
      status('#ed-status', '发布要登录：回首页右上角点登录，再回来发布。', true);
      return;
    }
    status('#ed-status', '正在发布…');
    try {
      const meta = await edSave();
      const j = await call('/llsongs', {
        method: 'POST',
        body: {
          id: ED.rec.cloud || undefined,
          title: meta.title, artist: meta.artist, dur: ED.rec.dur,
          count: meta.count, notes: packNotes(ED.notes),
        },
      });
      ED.rec.cloud = j.id || ED.rec.cloud;
      const list = MINE().slice();
      const i = list.findIndex((m) => m.id === ED.rec.id);
      if (i >= 0) { list[i].cloud = ED.rec.cloud; saveMine(list); }
      status('#ed-status', '发布成功，云端曲库已经有了（id ' + ED.rec.cloud + '）。');
      CLOUD.loaded = false;
      loadCloud(true);
      renderMine();
    } catch (e) {
      const code = e.code || '';
      status('#ed-status', code === 'need_login' ? '登录过期了，回首页重新登录。'
        : code === 'too_large' ? '谱面太大了（超过 900KB），先删掉一些音符。'
        : '发布失败：' + (code || e.message || '未知'), true);
    }
  }

  function edDel() {
    if (ED.sel < 0) return;
    edPushUndo();
    ED.notes.splice(ED.sel, 1);
    ED.sel = -1;
    ED.dirty = true;
    edDraw();
  }
  function edToggleHold() {
    const n = ED.notes[ED.sel];
    if (!n) return;
    edPushUndo();
    if (n.kind === 'hold') { n.kind = 'tap'; n.tail = 0; }
    else {
      n.kind = 'hold';
      const next = ED.notes.filter((x) => x !== n && x.t > n.t).sort((a, b) => a.t - b.t)[0];
      const maxTail = next ? next.t - 0.06 : n.t + 1.2;
      n.tail = Math.min(maxTail, n.t + 0.8);
      if (n.tail - n.t < 0.2) { n.kind = 'tap'; n.tail = 0; }
    }
    ED.dirty = true;
    edDraw();
  }
  function edUndo() {
    const prev = ED.undo.pop();
    if (!prev) return;
    ED.notes = prev;
    ED.sel = -1;
    edDraw();
  }

  async function edPlayToggle() {
    if (ED.playing) {
      Audio.stop();
      ED.playing = false;
      $('#ed-play').textContent = '▶ 试听';
      edDraw();
      return;
    }
    const buf = await ensureAudio(ED.rec);
    if (!buf) { status('#ed-status', '这段音频没在本机存上，重新导入一次。', true); return; }
    ED.playT = ED.t0;
    Audio.setVol(SAVE.musVol, SAVE.fxVol);
    Audio.playBuffer(buf, ED.playT);
    ED.playing = true;
    $('#ed-play').textContent = '■ 停';
    const tick = () => {
      if (!ED.playing) return;
      const t = ED.playT + Audio.time();
      if (xOf(t) > ED.w * 0.85) ED.t0 = t - ED.w * 0.2 / ED.pps;
      edDraw();
      if (t > ED.rec.dur - 0.05) { edPlayToggle(); return; }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------------------------------------------------------------- 接线 */
  function openShop() {
    renderMine();
    renderCloud();
    show('shop');
    loadCloud(false);
  }

  function bind() {
    const f = $('#shop-file');
    if (f) f.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (pending && pending.mode === 'audio') bindCloudAudio(pending.cloudId, file);
      else importNew(file);
    });

    $$('#shop-diff button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === shopDiff);
      b.onclick = () => {
        shopDiff = b.dataset.v;
        $$('#shop-diff button').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
    const imp = $('#shop-import');
    if (imp) imp.onclick = () => {
      pending = { mode: 'new' };
      const f2 = $('#shop-file');
      f2.accept = 'audio/*';
      f2.click();
    };
    const rf = $('#shop-refresh');
    if (rf) rf.onclick = () => loadCloud(true);
    const back = $('#shop-back');
    if (back) back.onclick = () => { show('title'); renderSongs(); };

    const mineBox = $('#shop-mine');
    if (mineBox) mineBox.onclick = async (e) => {
      const btn = e.target.closest('button[data-act]');
      const row = e.target.closest('[data-id]');
      if (!btn || !row) return;
      const id = row.dataset.id;
      const act = btn.dataset.act;
      if (act === 'play') return playMine(id);
      if (act === 'edit') {
        const m = MINE().find((x) => x.id === id);
        const rec = await idbCGet(id).catch(() => null);
        if (!m || !rec) { status('#shop-status', '谱面数据丢了，删掉重做一份吧。', true); return; }
        openEditor(Object.assign({}, rec, m, { id }));
        ensureAudio({ audioKey: rec.audioKey }).catch(() => {});
        return;
      }
      if (act === 'pub') {
        const rec = await idbCGet(id).catch(() => null);
        const m = MINE().find((x) => x.id === id);
        if (!rec || !m) return;
        openEditor(Object.assign({}, rec, m, { id }));
        return;
      }
      if (act === 'del') {
        if (!confirm('删掉这份谱面？音频也会一起清掉。')) return;
        const m = MINE().find((x) => x.id === id);
        await idbCDel(id).catch(() => {});
        if (m && m.cloud) { /* 云端的留着，本机删掉 */ }
        saveMine(MINE().filter((x) => x.id !== id));
        renderMine();
        renderSongs();
        status('#shop-status', '删掉了。');
      }
    };

    const cloudBox = $('#shop-cloud');
    if (cloudBox) cloudBox.onclick = (e) => {
      const btn = e.target.closest('button[data-act]');
      const row = e.target.closest('[data-cid]');
      if (!btn || !row) return;
      const cid = row.dataset.cid;
      if (SAVE.cloudAudio[cid]) return playCloud(cid);
      pending = { mode: 'audio', cloudId: cid };
      status('#shop-status', '这份谱面对应 ' + mmss((CLOUD.items.find((x) => x.id === cid) || {}).dur || 0)
        + ' 的音频：选你手里同一个版本的文件，就能跟着打。');
      const f3 = $('#shop-file');
      f3.accept = 'audio/*';
      f3.click();
    };

    // 编辑器
    const cv = edCv();
    if (cv) {
      cv.addEventListener('pointerdown', edPointerDown);
      cv.addEventListener('pointermove', edPointerMove);
      cv.addEventListener('pointerup', edPointerUp);
      cv.addEventListener('pointercancel', () => { ED.drag = null; ED.down = null; });
      cv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const b = cv.getBoundingClientRect();
        const i = edHit(e.clientX - b.left, e.clientY - b.top);
        if (i >= 0) { ED.sel = i; edDel(); }
      });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const b = cv.getBoundingClientRect();
        const x = e.clientX - b.left;
        const t = tOf(x);
        ED.pps = clamp(ED.pps * (e.deltaY < 0 ? 1.15 : 0.87), 30, 400);
        ED.t0 = Math.max(0, t - x / ED.pps);
        edDraw();
      }, { passive: false });
      window.addEventListener('resize', () => { if (ED.open) { edFit(); edDraw(); } });
    }
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('#ed-back', () => { if (ED.playing) edPlayToggle(); ED.open = false; openShop(); });
    on('#ed-save', () => edSave());
    on('#ed-del', () => edDel());
    on('#ed-hold', () => edToggleHold());
    on('#ed-undo', () => edUndo());
    on('#ed-play', () => edPlayToggle());
    on('#ed-zoomin', () => { ED.pps = clamp(ED.pps * 1.25, 30, 400); edDraw(); });
    on('#ed-zoomout', () => { ED.pps = clamp(ED.pps / 1.25, 30, 400); edDraw(); });
    on('#ed-snap', () => {
      ED.snap = ED.snap ? 0 : 0.05;
      $('#ed-snap').classList.toggle('on', !!ED.snap);
      $('#ed-status').textContent = ED.snap ? '吸附 0.05 秒' : '自由摆（不吸附）';
    });
    on('#ed-test', async () => {
      await edSave();
      G.song = songOf(ED.rec);
      G.diffK = 'normal';
      ED.playing = false;
      Audio.stop();
      startLive();
    });
    on('#ed-publish', () => edPublish());
  }

  bind();

  return { songs, openShop, openEditor, renderMine, loadCloud, token, ed: ED, cloud: CLOUD };
}
