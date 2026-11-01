// lovelive！mori⭐mens！ —— 点按式音游（学园偶像祭的玩法壳 + 《忘却前夜》的唤醒体）。
//
// 结构：
//   js/ll/songs.js    曲目库与芯片改编编曲（级数记号 → 事件表）
//   js/ll/analyze.js  原曲抓点（onset detection）+ 谱面生成
//   js/ll/audio.js    声音：原曲 BufferSource / 芯片前瞻调度 / 五档判定音效
//   js/ll/gen.js      构建生成：上场名册 + 头像（data URI 内联）
//   js/lovelive.js    这里：布局、判定、技能、画布渲染、编队、设置、结算
//
// 布局：上方一个发球点，下方九个击打框。音符（唤醒体的脸）从发球点散开，
// 沿直线飞向各自那一格，压到框里的那一刻点它（长条要按住直到尾音进框）。
// 九个人一队，第 i 格永远交给队伍里的第 i 位，技能全自动发动。
//
// 音源：默认芯片改编（页面内合成，不带版权音源）；也可以导入自己手里的
// 原曲 mp3 —— 解码后按鼓点自动生成谱面，存在本机（IndexedDB）。
//
// 自动化测试：?_test=1 把内部状态挂到 window.__ll；加 &_auto=1 自动 Perfect
// 打完全曲，供无头浏览器核对结算。

import { SONGS, arrange } from './ll/songs.js';
import { Audio } from './ll/audio.js';
import { detectOnsets, chartFromOnsets, chartFromArr, hashStr, packOnsets, unpackOnsets } from './ll/analyze.js';
import { UNITS, PACKS } from './ll/gen.js';
import { fetchPack, hasPack, why as packWhy, how as packHow } from './ll/musicbox.js';
import { initShop } from './ll/shop.js';
import { startGameCloud } from './gamecloud.js';

/* ================================================================ http → https */
// 从 http 打开时浏览器会把 crypto.subtle 整个摘掉（非安全上下文），原曲包就解不开，
// 耳朵里只剩芯片合成。自定义域上是有证书的，能上去就直接上去；
// 上不去（证书没配好、内网）就留在原地——纯 JS 解密那条路能兜住，不影响玩。
// 想留在 http 调试的话，地址后面加 &_http=1。
(function upgradeToHttps() {
  if (location.protocol !== 'http:') return;
  const host = location.hostname;
  if (/^(localhost|127\.|\[::1\]|0\.0\.0\.0)$/.test(host) || /\.local$/i.test(host)) return;
  if (/[?&]_http=1/.test(location.search)) return;
  const to = 'https://' + location.host + location.pathname + location.search + location.hash;
  // no-cors 的 HEAD 只用来问一句「https 通不通」：证书不对会直接 reject，正好当探针
  fetch('https://' + location.host + '/favicon.svg', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
    .then(() => { if (location.protocol === 'http:') location.replace(to); })
    .catch(() => { /* https 上不去：留在 http，靠纯 JS 解密出原曲 */ });
})();

/* ================================================================ 小工具 */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const mmss = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
const TEST = /[?&]_test=1/.test(location.search);
const AUTO = TEST && /[?&]_auto=1/.test(location.search);
const FINE = window.matchMedia ? window.matchMedia('(pointer:fine)').matches : false;
// 画面特效的时间轴（秒）：和 rAF 的时间戳同源，暂停时也照常走
const wall = () => performance.now() / 1000;
// 页脚那行红字提示：写一句、抖一下、两秒半后自己消失
function flash(sel, msg) {
  const el = $(sel);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(el._ft);
  el._ft = setTimeout(() => { el.textContent = ''; }, 2600);
}

/* ================================================================ 存档 */
const KEY = 'zjtt:lovelive';
const TEAM_MAX = 9;
function loadSave() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
  const s = (v && typeof v === 'object') ? v : {};
  s.best = (s.best && typeof s.best === 'object') ? s.best : {};
  s.team = Array.isArray(s.team) ? s.team.filter((id) => UNITS.some((u) => u.id === id)).slice(0, TEAM_MAX) : [];
  s.tracks = (s.tracks && typeof s.tracks === 'object') ? s.tracks : {};
  s.mute = s.mute ? 1 : 0;
  s.plays = Number(s.plays) || 0;
  s.bestCombo = Number(s.bestCombo) || 0;
  // 手感设置：偏移 / 判定宽松 / 流速 / 两路音量 / 按键提示
  s.offset = clamp(Number(s.offset) || 0, -200, 200);
  s.winMul = clamp(Number(s.winMul) || 1, 0.6, 2);
  s.flow = clamp(Number(s.flow) || 1, 0.6, 1.8);
  s.musVol = s.musVol == null ? 0.7 : clamp(Number(s.musVol), 0, 1);
  s.fxVol = s.fxVol == null ? 0.6 : clamp(Number(s.fxVol), 0, 1);
  s.keys = s.keys == null ? 1 : (s.keys ? 1 : 0);
  // 震动反馈（Android 的 navigator.vibrate；iOS 没有这个接口，开了也无事发生）：触屏设备默认开
  s.haptic = s.haptic == null ? (matchMedia('(pointer:coarse)').matches ? 1 : 0) : (s.haptic ? 1 : 0);
  s.listen = s.listen ? 1 : 0;
  // 沉浸：进局内时请求全屏，把手机浏览器的地址栏收上去。默认开，设置里能关。
  s.immersive = s.immersive == null ? 1 : (s.immersive ? 1 : 0);
  // 工坊：本机谱面的索引（正文在 IndexedDB，这里只留列表要用的字段）
  s.mine = Array.isArray(s.mine) ? s.mine.filter((m) => m && m.id).slice(0, 60) : [];
  // 云端谱面里「我已经把音频对上了」的那些：{ <cloudId>: { name, dur } }
  s.cloudAudio = (s.cloudAudio && typeof s.cloudAudio === 'object') ? s.cloudAudio : {};
  return s;
}
const SAVE = loadSave();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* 无痕模式随它去 */ }
}
const bestKey = (songId, diff) => songId + ':' + diff;

/* ================================================================ IndexedDB：本机音源 */
// 只存本机（不上传、不跨设备）：原曲是自己导入的，不存在库里分发给别人。
const DB_NAME = 'll-tracks';
// 两个表：t = 音频（导入的原曲），c = 谱面（工坊里做出来的）
function idbOpen() {
  return new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DB_NAME, 2); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const name of ['t', 'c']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('打不开本机音源库'));
  });
}
function idbDo(store, mode, fn) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const st = tx.objectStore(store);
    let out;
    try { out = fn(st); } catch (e) { rej(e); return; }
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  }));
}
const idbGet = (k) => idbDo('t', 'readonly', (st) => st.get(k));
const idbSet = (k, v) => idbDo('t', 'readwrite', (st) => st.put(v, k));
const idbDel = (k) => idbDo('t', 'readwrite', (st) => st.delete(k));
const idbCGet = (k) => idbDo('c', 'readonly', (st) => st.get(k));
const idbCSet = (k, v) => idbDo('c', 'readwrite', (st) => st.put(v, k));
const idbCDel = (k) => idbDo('c', 'readwrite', (st) => st.delete(k));

/* ================================================================ 难度 */
// win: Perfect / Great / Good / Bad 的半宽（秒，实际还要乘判定宽松）
// lead: 音符从发球点飞到框里要走几秒（越大越好读）；flow 设置会再乘一次
// gap: 谱面最小间隔（节奏密集时会按响度再缩到 0.72 倍）
// hold: 原曲里拖长音留成长条的概率；holdCap: 长条占比上限
// holdAt: 同时最多几根长条在按着；maxTail: 长条最长几秒
// jump: 相邻两下最多跨几格；tapQ: 强度低于全曲这个分位的当噪声丢掉
// dbl: 双押比例（强音处再翻倍）；dblHold: 长条配第二只手的比例
// stam: Miss 扣体力；pad: 芯片改编时叠鼓点的概率
const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.062, 0.112, 0.162, 0.212], lead: 1.85, gap: 0.40,  hold: 0.55, holdCap: 0.14, holdAt: 1, maxTail: 1.2, jump: 1, tapQ: 0.36, dbl: 0,    dblHold: 0,    stam: 4.5, pad: 0.20 },
  { k: 'normal', n: 'NORMAL', win: [0.052, 0.098, 0.148, 0.198], lead: 1.55, gap: 0.235, hold: 0.75, holdCap: 0.16, holdAt: 2, maxTail: 1.5, jump: 2, tapQ: 0.24, dbl: 0.07, dblHold: 0.30, stam: 5.5, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.28, gap: 0.17,  hold: 0.88, holdCap: 0.18, holdAt: 2, maxTail: 1.8, jump: 3, tapQ: 0.14, dbl: 0.11, dblHold: 0.55, stam: 6.5, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.082, 0.125, 0.170], lead: 1.08, gap: 0.135, hold: 0.95, holdCap: 0.20, holdAt: 2, maxTail: 2.0, jump: 4, tapQ: 0.07, dbl: 0.13, dblHold: 0.70, stam: 7.5, pad: 0.95 },
];
const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];
const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const KEY_LABEL = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

/* ================================================================ DOM 骨架 */
const scr = {
  title: $('#scr-title'), songs: $('#scr-songs'), team: $('#scr-team'),
  set: $('#scr-set'), shop: $('#scr-shop'), edit: $('#scr-edit'),
  live: $('#scr-live'), result: $('#scr-result'),
};
function show(name) {
  for (const k of Object.keys(scr)) scr[k].hidden = k !== name;
  G.scr = name;
  // 打歌时把全站的横竖屏开关收起来（它固定在左下角，会压住最左边两格），
  // 顺便通知它重算一次：它会在竖屏时压一张「把手机横过来」的遮罩，
  // 一进局内就得收起来，不然整局都被盖着。show 里 dispatch，组件监听 resize。
  document.body.classList.toggle('live', name === 'live');
  // 回到菜单就不必占着全屏了；打歌与结算留着，省得来回切地址栏
  if (name !== 'live' && name !== 'result') exitImmersive();
  window.dispatchEvent(new Event('resize'));
}

/* ================================================================ 沉浸：把地址栏收上去 */
// 手机浏览器的地址栏常年占着 50~60px。九格本来就只分到两百多像素高，被它一压，
// 弧顶那两格直接顶到分数条上，看着像「判定错位」其实是版面被挤掉了。
// 全屏是最干净的收法：请求必须在用户手势里发起，所以挂在「上场」那一下的
// 点击链上（startLive 的第一个 await 之前同步调用）。
// 有的环境不给全屏（iOS Safari、某些内嵌 WebView），那就当没这回事。
function vhFix() {
  const vv = window.visualViewport;
  const h = Math.round((vv && vv.height) || window.innerHeight || 0);
  if (h > 120) document.documentElement.style.setProperty('--app-h', h + 'px');
}
function enterImmersive() {
  if (!SAVE.immersive) return;
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  try {
    const p = el.requestFullscreen({ navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* 不支持就当没这回事 */ }
}
function exitImmersive() {
  if (document.fullscreenElement && document.exitFullscreen) {
    try { document.exitFullscreen().catch(() => {}); } catch (e) { /* 已经退了 */ }
  }
}
document.addEventListener('fullscreenchange', () => {
  // 用系统手势 / 返回键退出全屏 = 不想打了：顺手暂停，别让音乐在看不见的地方空跑
  if (!document.fullscreenElement && G.running && !G.paused) togglePause();
  vhFix();
  setTimeout(fit, 60);
});
window.addEventListener('resize', vhFix);
window.addEventListener('orientationchange', () => setTimeout(vhFix, 260));
if (window.visualViewport) window.visualViewport.addEventListener('resize', vhFix);
vhFix();

/* ================================================================ 全局状态 */
const G = {
  scr: 'title', song: null, diffK: 'normal', chart: null, chartSrc: 'chip',
  notes: [], ni: 0, di: 0, combo: 0, maxCombo: 0, score: 0,
  cnt: { p: 0, g: 0, go: 0, b: 0, m: 0 },
  accW: 0, stamina: 100, buffs: [], sk: [], banner: null, fx: [], flashes: [],
  holds: {}, active: new Set(), holdingLanes: [], running: false, over: false, paused: false, auto: AUTO,
  // 听歌模式：自动把每个音按最低档（BAD）打掉、体力锁满，单纯把整首听完
  listen: false, srcName: '', srcWhy: '', srcLite: false, srcPack: false,
  tickAt: 0, prep: false, stall: 0, lastT: 0,
};

const team = () => (SAVE.team.length ? SAVE.team : UNITS.slice(0, TEAM_MAX).map((u) => u.id));
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[0];
const laneUnit = (i) => {
  const t = team();
  return unitById(t[i % t.length]);
};
// gen.js 里的 art 是 data URI 字符串：给 DOM 用；画布要的是 Image 对象
for (const u of UNITS) {
  const im = new Image();
  im.decoding = 'async';
  im.src = u.art;
  u.img = im;
}
const FACE_OK = (u) => u.img && u.img.complete && u.img.naturalWidth > 0;

/* 曲目时间：音频时钟 - 偏移。判定、播放、绘制都用这一个 */
// lag：这次输入事件已经在队列里等了多久（performance.now() - e.timeStamp）。手机上事件常比处理晚一两帧，
// 不扣掉就等于每次都「点晚了」；封顶 80ms，防止后台切回来时的陈旧事件把时间拨乱。
const chartTime = (lag) => Math.max(0, Audio.time() - SAVE.offset / 1000 - (lag > 0 ? Math.min(0.08, lag) : 0));
const evLag = (e) => (e && e.timeStamp > 0 ? (performance.now() - e.timeStamp) / 1000 : 0);

/* ================================================================ 技能立绘 */
// 技能发动时，舞台右侧摆上这位唤醒体的立绘：assets/card/<slug>.webp，
// 官方素材库里的竖版卡面（240×600）。原尺寸摆出来就清楚，不用再把 96px
// 的头像放大糊一屏。个别人没有卡面（构建时给了 CG 或留空），空的话退回头像小卡。
const ART = { on: false, timer: 0 };
const ART_PRE = new Set();
function preloadArt(list) {
  for (const id of list) {
    const u = unitById(id);
    if (!u || !u.card || ART_PRE.has(u.id)) continue;
    ART_PRE.add(u.id);
    const im = new Image();
    im.decoding = 'async';
    im.src = u.card;                 // 只把浏览器缓存喂热，不参与绘制
  }
}
function showArt(u, txt) {
  const box = $('#art-box');
  const fig = $('#art-fig');
  if (!box || !fig) return;
  const hasCard = !!u.card;
  box.style.setProperty('--h', u.hue);
  fig.classList.toggle('small', !hasCard);
  fig.classList.toggle('wide', !!u.wide);
  const src = hasCard ? u.card : u.art;
  if (fig.getAttribute('src') !== src) fig.src = src;
  $('#art-name').textContent = u.n;
  $('#art-skill').textContent = txt || ('「' + u.skill.n + '」');
  box.classList.remove('on');
  void box.offsetWidth;              // 重启动画：连着触发两次也要重新滑进来
  box.classList.add('on');
  ART.on = true;
  clearTimeout(ART.timer);
  ART.timer = setTimeout(() => {
    box.classList.remove('on');
    ART.on = false;
  }, 2600);
}

/* ================================================================ 技能 */
function initSkills() {
  G.sk = team().map((id) => {
    const u = unitById(id);
    return { u, last: -1e9, cnt: 0, lastCombo: -1, fires: 0 };
  });
  G.buffs = [];
  // start 触发的技能开场就放（只放一次）
  for (const st of G.sk) if (st.u.skill.trig === 'start') fireSkill(st, 0);
}
function buffMul(fx) {
  let m = 1;
  for (const b of G.buffs) if (b.fx === fx) m *= b.val;
  return m;
}
function buffFlag(fx) {
  for (const b of G.buffs) if (b.fx === fx) return true;
  return false;
}
function passSum(fx) {
  let s = 0;
  for (const x of G.sk) if (x.u.pass && x.u.pass[fx]) s += x.u.pass[fx];
  return s;
}
function fireSkill(st, now) {
  const sk = st.u.skill;
  st.fires++;
  if (sk.dur > 0) G.buffs.push({ fx: sk.fx, val: sk.val, until: now + sk.dur, u: st.u });
  else applyInstant(sk, now);
  G.banner = { txt: st.u.n + '「' + sk.n + '」', until: now + 2.2, hue: st.u.hue };
  showArt(st.u, '「' + sk.n + '」');
  Audio.fx('skill');
  paintSkillChips(true);
}
function applyInstant(sk, now) {
  if (sk.fx === 'heal') G.stamina = clamp(G.stamina + sk.val, 0, 100);
  if (sk.fx === 'combo') addCombo(sk.val, true);
}
function tickSkills(now) {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'time') {
      if (now - st.last >= sk.need) { st.last = now; fireSkill(st, now); }
    } else if (sk.trig === 'combo') {
      if (G.combo > 0 && G.combo % sk.need === 0 && st.lastCombo !== G.combo) {
        st.lastCombo = G.combo;
        fireSkill(st, now);
      }
    }
  }
  G.buffs = G.buffs.filter((b) => b.until > now);
}
function onPerfect() {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig !== 'perfect') continue;
    st.cnt++;
    if (st.cnt % sk.need === 0) fireSkill(st, chartTime());
  }
}

/* ================================================================ 判定与计分 */
const JW = { p: 1, g: 0.8, go: 0.5, b: 0.2, m: 0 };
const JN = { p: 'PERFECT', g: 'GREAT', go: 'GOOD', b: 'BAD', m: 'MISS' };
const JC = { p: '#ffd76a', g: '#8fd0ff', go: '#9be29b', b: '#c9a0ff', m: '#e8695f' };

// 判定窗口：难度 × 技能加成 × 玩家自己的「判定宽松」
function winMul() {
  return buffMul('judge') * (1 + passSum('judge')) * SAVE.winMul;
}
function windows() {
  const w = diffOf(G.diffK).win, m = winMul();
  return [w[0] * m, w[1] * m, w[2] * m, w[3] * m];
}
function judgeBy(dt) {
  const W = windows();
  const a = Math.abs(dt);
  if (a <= W[0]) return 'p';
  if (a <= W[1]) return 'g';
  if (a <= W[2]) return 'go';
  if (a <= W[3]) return 'b';
  return null;
}
function addCombo(k, silent) {
  G.combo += k;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  if (!silent && G.combo > 0) {
    if (G.combo % 100 === 0) {
      G.stamina = clamp(G.stamina + 6, 0, 100);
      Audio.fx('combo');
    } else if (G.combo % 50 === 0) Audio.fx('combo');
  }
}
function scoreNote(n, j) {
  const comboMul = 1 + Math.min(G.combo, 300) / 100;
  const base = n.kind === 'hold' ? 240 : 300;
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += base * JW[j] * comboMul * sm;
}
function boxOf(lane) { return LAY.boxes[lane] || LAY.boxes[0]; }
function pushFx(lane, j, txt) {
  const b = boxOf(lane);
  const t = wall();
  // 同一轨道 0.14 秒内只留最后一条：以前 GUARD / SAVED / 判定名会叠成一片看不清
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    if (f.x === b.x && t - f.t < 0.14) G.fx.splice(i, 1);
  }
  G.fx.push({ x: b.x, y: b.y - b.h * 0.35, j, t, txt: txt == null ? JN[j] : txt });
  if (G.fx.length > 12) G.fx.shift();
  G.flashes[lane] = { t, j };
}
function judgeNote(n, j) {
  n.judged = true;
  n.hit = true;
  G.cnt[j === 'p' ? 'p' : j === 'g' ? 'g' : j === 'go' ? 'go' : 'b']++;
  G.accW += JW[j];
  scoreNote(n, j);
  if (j === 'p') onPerfect();
  if (j === 'b') G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.55, 0, 100);
  addCombo(1);
  // 听歌模式把判定音与飘字一起收掉：目的是听完整首，不是看满地 BAD
  if (!G.listen) { Audio.fx(j, G.combo, n.lane); pushFx(n.lane, j); }
  if (SAVE.haptic && !G.auto && !G.listen && j !== 'b' && navigator.vibrate) {
    try { navigator.vibrate(j === 'p' ? 9 : 6); } catch (e) { /* 不支持就算了 */ }
  }}
function missNote(n) {
  if (n.judged) return;
  n.judged = true;
  const now = chartTime();
  // 听歌模式：漏过去的音也按最低档补一笔，不记 Miss。
  // （局内刚开听歌模式时，暂停期间已经越过判定窗的那几个音会走到这里）
  if (G.listen) {
    G.cnt.b++;
    G.accW += JW.b;
    addCombo(1);
    return;
  }
  G.cnt.m++;
  // 技能优先级：自动救（Miss → Good）> 护盾（不断连不掉血）
  if (buffFlag('auto')) {
    G.cnt.m--; G.cnt.go++;
    G.accW += JW.go;
    scoreNote(n, 'go');
    addCombo(1);
    Audio.fx('go', G.combo, n.lane);
    pushFx(n.lane, 'go', 'SAVED');
    G.banner = { txt: 'Miss 被救回来了！', until: now + 1.2, hue: 140 };
    return;
  }
  if (buffFlag('guard')) {
    Audio.fx('go');
    pushFx(n.lane, 'go', 'GUARD');
    G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    return;
  }
  G.combo = 0;
  G.stamina = clamp(G.stamina - diffOf(G.diffK).stam, 0, 100);
  for (const st of G.sk) if (st.u.skill.trig === 'miss') fireSkill(st, now);
  Audio.fx('m');
  pushFx(n.lane, 'm');
}
function releaseHold(nt, early) {
  if (!nt.holding) return;
  nt.holding = false;
  G.active.delete(nt);
  if (nt._ptr != null) { delete G.holds[nt._ptr]; nt._ptr = null; }
  const now = chartTime();
  if (early && now < nt.tail - 0.2) {
    nt.broken = true;
    if (!buffFlag('guard')) {
      G.combo = 0;
      G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.7, 0, 100);
      Audio.fx('break');
      pushFx(nt.lane, 'm', '松手了');
    } else {
      Audio.fx('go');
      pushFx(nt.lane, 'go', 'GUARD');
    }
    return;
  }
  // 撑到尾音：补一笔尾分，算一个 Good 的准确率
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += 170 * sm;
  G.accW += JW.go;
  G.cnt.go++;
  addCombo(1);
  Audio.fx('hold');
  pushFx(nt.lane, 'go', '');
}

/* ================================================================ 布局：上单点 → 下九框 */
const LAY = { spawn: { x: 0, y: 0 }, boxes: [], bw: 40, bh: 40, arc: 0 };
function layout() {
  const n = 9;
  const gap = Math.max(4, Math.min(8, W * 0.014));
  const side = Math.max(10, W * 0.03);
  // 三条约束取最小：宽度装得下、高度留得出走廊（H*0.26）、宽屏才放大到 88
  const cap = Math.min(W > 640 ? 88 : 76, H * 0.26);
  const bw = Math.max(24, Math.min(cap, (W - side * 2 - gap * (n - 1)) / n));
  const total = bw * n + gap * (n - 1);
  const x0 = (W - total) / 2 + bw / 2;
  // 底部留白要同时放下两件事：圆的下半身 + 键位字母。矮屏横过来时舞台只有
  // 三百来像素，只按 H 的百分比留，字母就被切在边上了。
  const padB = Math.max(42, Math.min(88, H * 0.155), bw * 0.5 + (SAVE.keys ? 21 : 8));
  const baseY = H - padB;
  LAY.bw = bw;
  LAY.bh = bw;
  LAY.spawn = { x: W / 2, y: Math.max(30, H * 0.085) };

  // 九格不是一个直排，而是沿一段弧围成半圈（学 SIF 的摆法）：正中那格最低，
  // 往两侧一格格抬上去，最外侧最高。抬多少有两条硬约束——
  //   · 最外侧不能顶到发球点，上方得留出音符散开的那段走廊，
  //     撞上了就变成「音符一出生就贴在格子上」；
  //   · 不超过舞台高度的三分之一，否则矮屏横过来时正中会空出一大块。
  const room = baseY - (LAY.spawn.y + bw * 1.05);
  const arc = Math.max(0, Math.min(H * 0.34, room));
  const TH = 1.16;                       // 半张角约 66°
  const k = 1 - Math.cos(TH);
  LAY.arc = arc;
  LAY.boxes.length = 0;
  for (let i = 0; i < n; i++) {
    const t = (i - 4) / 4;               // -1 最左 … 0 正中 … +1 最右
    const lift = (1 - Math.cos(t * TH)) / k;   // 0 正中 / 1 最外侧
    LAY.boxes.push({
      x: x0 + i * (bw + gap),
      y: baseY - arc * lift,
      h: bw, w: bw, key: KEY_LABEL[i], lift,
    });
  }
}
// 音符在某时刻的位置：k=0 在发球点，k=1 在框里。
// 越过 1 之后不再钉在 1.05 上（以前被忽略的音符会「贴」在框里不动，
// 看着像卡住了）：让它继续往前滑一点再淡掉，错过的那一刻就消失。
function notePos(n, now, le) {
  const b = boxOf(n.lane);
  const k = clamp(1 - (n.t - now) / le, -0.18, 1.5);
  return {
    x: LAY.spawn.x + (b.x - LAY.spawn.x) * k,
    y: LAY.spawn.y + (b.y - LAY.spawn.y) * k,
    k,
  };
}
const fadeK = (k) => (k <= 1 ? 1 : clamp(1 - (k - 1) / 0.45, 0, 1));
function leadEff() {
  return diffOf(G.diffK).lead * SAVE.flow;
}

/* ================================================================ 输入 */
function tapLane(lane, ptr, lag) {
  if (!G.running || G.paused) return;
  const now = chartTime(lag);
  const W4 = windows()[3];
  let best = null, bestAbs = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.lane !== lane || n.judged || (n.kind === 'hold' && n.holding)) continue;
    const a = Math.abs(n.t - now);
    if (a > W4) continue;
    if (a < bestAbs) { bestAbs = a; best = n; }
  }
  if (!best) return;
  pressNote(best, ptr, lag);
}
function tapNear(x, y, ptr, lag) {
  if (!G.running || G.paused) return;
  const now = chartTime(lag);
  const W4 = windows()[3];
  const le = leadEff();
  let best = null, bestCost = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.judged || (n.kind === 'hold' && n.holding)) continue;
    const p = notePos(n, now, le);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > LAY.bw * 0.95) continue;
    const cost = Math.abs(n.t - now) * 2 + d / 300;
    if (cost < bestCost) { bestCost = cost; best = n; }
  }
  // 点音符本身也要把「哪根手指」传下去：长条不登记手指就永远等不到松手，
  // 会一直挂在框上（这一版之前「卡在下面」的主因就是这个）。
  if (best) pressNote(best, ptr == null ? null : ptr, lag);
}
function pressNote(n, ptr, lag) {
  const now = chartTime(lag);
  const j = judgeBy(n.t - now);
  if (!j) return;
  if (n.kind === 'hold') {
    n.holding = true;
    if (!(n.tail > n.t)) n.tail = n.t + 0.4;      // 兜底：数据缺尾音也别卡死
    const key = ptr != null ? ptr : ('v' + Math.round(n.t * 1000));
    n._ptr = key;
    G.holds[key] = n;
    G.active.add(n);
    Audio.fx('holdstart');
  }
  judgeNote(n, j);
}
function releasePtr(ptr) {
  const n = G.holds[ptr];
  if (n) { delete G.holds[ptr]; releaseHold(n, true); }
}
function laneAt(x, y) {
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    if (Math.abs(x - b.x) <= b.w / 2 + 3 && Math.abs(y - b.y) <= b.h / 2 + 8) return i;
  }
  return -1;
}

/* ================================================================ 画布 */
const cv = $('#cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

// 静态层缓存：渐变底、发球点光晕、九条引导线、九个框（含头像和键位）。
// 以前每帧都要重建 11 个渐变、给九个头像做 clip + drawImage、再画九次圆角框——
// 中低端机上掉帧就掉在这里。现在只在尺寸变化时算一次，主循环只做两次 drawImage。
const bgLayer = document.createElement('canvas');
const boxLayer = document.createElement('canvas');
const bgCtx = bgLayer.getContext('2d');
const boxCtx = boxLayer.getContext('2d');
const SPRITE = new Map();

// 圆形头像精灵：一次画好（含描边），之后每帧只是一次 drawImage。
// 音符和框都吃这张缓存——同一张脸在同一尺寸下只做一次 clip。
function sprite(u, px) {
  const size = Math.max(10, Math.round(px));
  const key = u.id + ':' + size;
  const hit = SPRITE.get(key);
  if (hit) return hit;
  if (SPRITE.size > 160) SPRITE.clear();
  const s2 = Math.round(size * 2 * DPR);
  const c = document.createElement('canvas');
  c.width = s2; c.height = s2;
  const g = c.getContext('2d');
  g.save();
  g.beginPath();
  g.arc(s2 / 2, s2 / 2, s2 / 2 - 1, 0, Math.PI * 2);
  g.clip();
  if (FACE_OK(u)) g.drawImage(u.img, 0, 0, s2, s2);
  else { g.fillStyle = 'hsl(' + u.hue + ',30%,24%)'; g.fillRect(0, 0, s2, s2); }
  g.restore();
  g.lineWidth = Math.max(2, s2 * 0.045);
  g.strokeStyle = 'hsl(' + u.hue + ',88%,74%)';
  g.beginPath();
  g.arc(s2 / 2, s2 / 2, s2 / 2 - 2, 0, Math.PI * 2);
  g.stroke();
  SPRITE.set(key, c);
  return c;
}

function buildStatic() {
  for (const c of [bgLayer, boxLayer]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  boxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bgCtx.clearRect(0, 0, W, H);
  boxCtx.clearRect(0, 0, W, H);

  const sp = LAY.spawn;
  const bg = bgCtx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e17');
  bg.addColorStop(0.5, '#101527');
  bg.addColorStop(1, '#0a0d15');
  bgCtx.fillStyle = bg;
  bgCtx.fillRect(0, 0, W, H);

  const halo = bgCtx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, Math.max(W * 0.5, 180));
  halo.addColorStop(0, 'rgba(240,120,180,0.20)');
  halo.addColorStop(0.45, 'rgba(140,120,255,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = halo;
  bgCtx.fillRect(0, 0, W, H);

  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const g = bgCtx.createLinearGradient(sp.x, sp.y, b.x, b.y);
    g.addColorStop(0, 'hsla(' + u.hue + ',70%,70%,0.10)');
    g.addColorStop(1, 'hsla(' + u.hue + ',70%,70%,0.03)');
    bgCtx.strokeStyle = g;
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(sp.x, sp.y);
    bgCtx.lineTo(b.x, b.y);
    bgCtx.stroke();
  }

  // 九个框：底、边、头像、键位。底和头像都做成半透明——技能立绘在底下放的时候
  // 要能透出来，框只负责「定住位置」，不该像九块实心砖把舞台下半截盖死。
  // 框是正圆而不是圆角方块：九格既然已经排成弧，方块会在弧线上留一圈拐角，
  // 圆的才连成一串（SIF 那九个头像本来也是一圈圆）。
  boxCtx.textAlign = 'center';
  boxCtx.textBaseline = 'middle';
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const r = b.w / 2;
    boxCtx.beginPath();
    boxCtx.arc(b.x, b.y, r, 0, Math.PI * 2);
    boxCtx.fillStyle = 'rgba(10,14,26,0.20)';
    boxCtx.fill();
    boxCtx.lineWidth = 1.8;
    boxCtx.strokeStyle = 'hsla(' + u.hue + ',82%,74%,0.52)';
    boxCtx.stroke();
    const ir = r - 3.5;
    boxCtx.globalAlpha = 0.32;                  // 脸也半透明：音符压下来才分得清谁是谁
    boxCtx.drawImage(sprite(u, ir), b.x - ir, b.y - ir, ir * 2, ir * 2);
    boxCtx.globalAlpha = 1;
    if (SAVE.keys) {
      boxCtx.font = '600 ' + Math.round(Math.min(13, b.w * 0.3)) + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
      boxCtx.fillStyle = 'rgba(200,210,235,0.55)';
      boxCtx.fillText(KEY_LABEL[i], b.x, b.y + r + 12);
    }
  }
}

function fit() {
  const box = $('#stage');
  if (!box) return;
  const b = box.getBoundingClientRect();
  // 宽度给个下限防止 0；高度必须**跟着容器**，不能设下限把它顶高——
  // 横屏时舞台只有两百多像素，一撑就超出 .stage，底下的九格直接被裁没
  W = Math.max(240, b.width);
  H = Math.max(160, b.height);
  // 2.5 的像素比在手机上等于白烧一半填充率；2 已经看不出差别
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  layout();
  buildStatic();
}
window.addEventListener('resize', () => fit());
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('#stage'));
document.addEventListener('zj:orient', () => setTimeout(fit, 120));

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const b = cv.getBoundingClientRect();
  // 正常情况下 canvas 的 CSS 尺寸就是 W×H（fit 里钉死），1:1 直接减就行。
  // 但页面被缩放过（双击放大、某些内置浏览器的视口压缩、或者 CSS 把 canvas 拉宽）
  // 时 rect 会跟 W/H 对不上，这时候不减比例就是「看着点到了、判到别的格」。
  const sx = b.width ? W / b.width : 1;
  const sy = b.height ? H / b.height : 1;
  const x = (e.clientX - b.left) * sx, y = (e.clientY - b.top) * sy;
  const lane = laneAt(x, y);
  const lag = evLag(e);
  if (lane >= 0) tapLane(lane, 'p' + e.pointerId, lag);
  else tapNear(x, y, 'p' + e.pointerId, lag);
  cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
}, { passive: false });
window.addEventListener('pointerup', (e) => releasePtr('p' + e.pointerId));
window.addEventListener('pointercancel', (e) => releasePtr('p' + e.pointerId));
window.addEventListener('keydown', (e) => {
  if (G.scr !== 'live' && G.scr !== 'edit') return;
  const k = e.key.toLowerCase();
  const lane = KEYS.indexOf(k);
  if (lane >= 0) {
    e.preventDefault();
    if (e.repeat) return;
    tapLane(lane, 'k' + lane, evLag(e));
    return;
  }
  if (e.key === 'Escape' && G.running) togglePause();
});
window.addEventListener('keyup', (e) => {
  const lane = KEYS.indexOf(e.key.toLowerCase());
  if (lane >= 0) releasePtr('k' + lane);
});

/* ================================================================ 渲染 */
function draw(clock) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const now = G.running ? chartTime() : 0;
  const le = leadEff();
  const beat = (G.chart && G.chart.arr) ? (now / G.chart.arr.spb) % 1 : (now * 2) % 1;

  // 技能立绘在放的时候，把底图压低让它透出来（框和音符仍然是实心的）
  ctx.globalAlpha = ART.on ? 0.3 : 1;
  ctx.drawImage(bgLayer, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.drawImage(boxLayer, 0, 0, W, H);

  // 发球点（每帧就这一圈，便宜）
  const sp = LAY.spawn;
  const pulse = 1 + Math.max(0, 0.5 - beat) * 0.12;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(12, LAY.bw * 0.36) * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(240,120,180,0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,158,203,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(4, LAY.bw * 0.1), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,190,220,0.9)';
  ctx.fill();

  // 按住的框：亮一圈 + 上一帧的命中闪光
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const r = b.w / 2;
    if (G.holdingLanes.indexOf(i) >= 0) {
      // 按住时亮一圈：框已经是圆的了，这里也跟着画圆环，别在弧上留个方角
      ctx.beginPath();
      ctx.arc(b.x, b.y, r - 1, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'hsla(' + u.hue + ',90%,76%,0.95)';
      ctx.stroke();
    }
    const fl = G.flashes[i];
    if (!fl) continue;
    const hitA = clamp(1 - (clock - fl.t) / 0.24, 0, 1);
    if (hitA <= 0) { delete G.flashes[i]; continue; }
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 3 + hitA * 8, 0, Math.PI * 2);
    ctx.strokeStyle = JC[fl.j] || '#fff';
    ctx.globalAlpha = hitA * 0.85;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 画到哪儿：已经在框里结算完的音符不用再画
  while (G.di < G.notes.length && G.notes[G.di].judged && !G.notes[G.di].holding) G.di++;

  // 长条：细一点的轨道 + 一根亮芯，之前那样一条 0.44bw 的粗带太压画面
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.kind !== 'hold') continue;
    if (n.judged && !n.holding) continue;
    const b = LAY.boxes[n.lane];
    const hp = n.holding ? { x: b.x, y: b.y } : notePos(n, now, le);
    const tp = notePos({ lane: n.lane, t: n.tail }, now, le);
    const u = laneUnit(n.lane);
    const col = n.broken ? '150,150,165' : (u.hue + ',85%,72%');
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.strokeStyle = n.broken ? 'rgba(150,150,165,0.16)' : 'hsla(' + col + ',0.26)';
    ctx.lineWidth = LAY.bw * 0.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.strokeStyle = n.broken ? 'rgba(160,160,175,0.3)' : 'hsla(' + col + ',0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 尾音也挂一张头像：该在哪松手、尾音什么时候进框，一眼看得出（判定就看这个）
    let tx = tp.x, ty = tp.y;
    if (n.holding && tp.k >= 1) { tx = b.x; ty = b.y; }   // 按着时尾音贴在框里
    const tr = LAY.bw * 0.3;
    const tfade = n.broken ? 0.32 : fadeK(n.holding ? Math.min(tp.k, 1) : tp.k);
    if (tfade > 0.02) {
      ctx.globalAlpha = tfade * 0.92;
      ctx.drawImage(sprite(u, tr), tx - tr, ty - tr, tr * 2, tr * 2);
      ctx.beginPath();
      ctx.arc(tx, ty, tr + 2, 0, Math.PI * 2);
      ctx.strokeStyle = n.broken ? 'rgba(160,160,175,0.5)' : 'hsla(' + col + ',0.85)';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  // 音符头（圆形头像精灵，不裁不描边，直接贴）
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
    const u = laneUnit(n.lane);
    const p = n.holding ? { x: LAY.boxes[n.lane].x, y: LAY.boxes[n.lane].y - LAY.bh * 0.42, k: 1 } : notePos(n, now, le);
    const fade = fadeK(p.k);
    if (fade <= 0.02) continue;
    const rr3 = LAY.bw * 0.36 + (n.s || 0.5) * LAY.bw * 0.06;
    ctx.globalAlpha = fade;
    ctx.drawImage(sprite(u, rr3), p.x - rr3, p.y - rr3, rr3 * 2, rr3 * 2);
    if (n.kind === 'hold' && !n.holding) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr3 + 3, 0, Math.PI * 2);
      ctx.strokeStyle = 'hsla(' + u.hue + ',92%,82%,0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // 判定字：每个轨道同一时间只留一条（以前 GUARD / SAVED 叠成一片就是没去重）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.round(Math.min(15, LAY.bw * 0.44));
  ctx.font = '800 ' + fs + 'px system-ui,sans-serif';
  const txMax = Math.max(50, W - 50);
  for (const f of G.fx) {
    if (!f.txt) continue;
    const age = clock - f.t;
    if (age > 0.5) continue;
    const a = 1 - age / 0.5;
    const tx = clamp(f.x, 50, txMax);       // 最边上的轨道不许把字画出画布
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,6,14,0.65)';
    ctx.fillText(f.txt, tx + 1, f.y - 10 - age * 40 + 1);
    ctx.fillStyle = JC[f.j] || '#fff';
    ctx.fillText(f.txt, tx, f.y - 10 - age * 40);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = 'alphabetic';
  while (G.fx.length && clock - G.fx[0].t > 0.5) G.fx.shift();

  // 连击
  if (G.combo >= 2) {
    const cy = H * 0.42;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,244,255,0.9)';
    ctx.font = '900 ' + Math.round(Math.min(64, H * 0.1)) + 'px system-ui,sans-serif';
    ctx.fillText(String(G.combo), W / 2, cy);
    ctx.fillStyle = 'rgba(240,120,180,0.7)';
    ctx.font = '700 ' + Math.round(Math.min(14, H * 0.024)) + 'px system-ui,sans-serif';
    ctx.fillText('COMBO', W / 2, cy + Math.min(34, H * 0.058));
    ctx.textBaseline = 'alphabetic';
  }
}

/* ================================================================ 主循环 */
// HUD 只在数值真变了才写 DOM：每帧改 textContent / style.width 会逼着重排，
// 分数和进度条是「看起来在动」就够的东西，10Hz 跟 60Hz 没区别。
const HUDC = { score: '', combo: '', stam: -1, prog: -1 };
let faceTick = 0, lastFrame = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  // 两帧间隔太近（高刷屏 + 后台标签页回来）就跳过：画了也看不见，白烧 CPU
  if (ts - lastFrame < 8) return;
  lastFrame = ts;
  if (!G.running) { if (G.scr === 'live') draw(ts / 1000); return; }
  const t = ts / 1000;
  draw(t);
  // 头像还没解码完时，静态层里的框是空心的：解码好了补画一次
  if (t - faceTick > 0.5) {
    faceTick = t;
    let waiting = false;
    for (let i = 0; i < 9 && !waiting; i++) if (!FACE_OK(laneUnit(i))) waiting = true;
    if (waiting) buildStatic();
  }
  if (G.paused) return;
  const now = chartTime();
  const prevNow = G.lastNow;
  G.lastNow = now;
  // HUD
  const sc = fmt(G.score);
  if (sc !== HUDC.score) { HUDC.score = sc; $('#live-score').textContent = sc; }
  const cb = G.combo > 0 ? G.combo + ' 连击' : '—';
  if (cb !== HUDC.combo) { HUDC.combo = cb; $('#live-combo').textContent = cb; }
  const st = Math.round(G.stamina);
  if (st !== HUDC.stam) {
    HUDC.stam = st;
    const stEl = $('#live-stam');
    stEl.style.width = st + '%';
    stEl.parentElement.classList.toggle('low', st <= 30);
  }
  const pr = Math.round(clamp(now / (G.chart ? G.chart.dur : 1), 0, 1) * 200) / 2;
  if (pr !== HUDC.prog) { HUDC.prog = pr; $('#live-prog').style.width = pr + '%'; }
  if (now > (G.tickAt || 0)) {
    G.tickAt = now + 0.2;
    tickSkills(now);
    paintSkillChips(false);
    const bEl = $('#live-banner');
    if (G.banner && now > G.banner.until) G.banner = null;
    const bt = G.banner ? G.banner.txt : '';
    if (bEl.textContent !== bt) bEl.textContent = bt;
    bEl.style.opacity = G.banner ? 1 : 0;
    if (G.banner) bEl.style.borderColor = 'hsla(' + G.banner.hue + ',80%,70%,0.6)';
  }
  // 时钟停摆保护：系统音频被挂起（切设备、系统休眠、蓝牙断开）时
  // ac.currentTime 会冻住，谱面就停在原地不动——看着就是「音符卡在下面」。
  // 先自己 resume 一次；还是不动就把这一局暂停下来，让玩家点「继续」再走。
  const dt = G.lastT ? Math.max(0, t - G.lastT) : 0;
  G.lastT = t;
  if (prevNow != null && Math.abs(now - prevNow) < 1e-6) G.stall += dt;
  else G.stall = 0;
  if (G.stall > 0.8) {
    Audio.resume();
    if (G.stall > 2.2) {
      G.stall = 0;
      togglePause();
      G.banner = { txt: '声音被系统掐断了，点「继续」接着打', until: now + 4, hue: 30 };
    }
  }
  // 按住中的长条撑到尾音（按 active 集合走，不依赖「哪根手指按的」，
  // 万一哪条登记漏了，也会在尾音后自己松开，不会永远挂在框上）
  for (const hn of G.active) {
    if (!hn.holding) { G.active.delete(hn); continue; }
    if (now >= hn.tail + 0.02) releaseHold(hn, false);
  }
  // 同时在按几根就亮几个框（双长按要两个框一起亮，不然看不出按住的是哪两根）
  G.holdingLanes.length = 0;
  for (const hn of G.active) {
    if (hn.holding && G.holdingLanes.indexOf(hn.lane) < 0) G.holdingLanes.push(hn.lane);
  }
  // 过点判定
  const W4 = windows()[3];
  // 听歌模式：体力锁满，怎么打都不会死（音符照样被自动清掉，谱面一直往前走）
  if (G.listen) G.stamina = 100;
  while (G.ni < G.notes.length) {
    const n = G.notes[G.ni];
    if ((G.auto || G.listen) && !n.judged && n.t <= now) {
      autoHit(n, now, G.listen ? 'b' : null);
      continue;
    }
    if (!n.judged) {
      if (n.t < now - W4) { missNote(n); continue; }
      break;
    }
    G.ni++;                       // 长条还在按住：头已经判过了，尾音交给 G.holds 收
  }
  if (G.stamina <= 0) { finish(true); return; }
  if (G.chart && now > G.chart.dur) finish(false);
}
function autoHit(n, now, fixed) {
  if (n.kind === 'hold') {
    n.holding = true;
    const j = fixed || judgeBy(n.t - now) || 'p';
    judgeNote(n, j);
    n.holding = false;
    // 自动模式直接算撑满
    const sm = buffMul('score') * (1 + passSum('score'));
    G.score += 170 * sm;
    G.accW += JW.go; G.cnt.go++;
    addCombo(1);
  } else {
    judgeNote(n, fixed || judgeBy(n.t - now) || 'p');
  }
  G.ni++;
}
requestAnimationFrame(loop);

/* ================================================================ 技能条 UI */
function paintSkillChips(force) {
  const now = chartTime();
  const box = $('#skills');
  if (force || box.childNodes.length !== G.sk.length) {
    box.textContent = '';
    for (const st of G.sk) {
      const el = document.createElement('div');
      el.className = 'skill';
      el.style.setProperty('--h', st.u.hue);
      el.innerHTML = '<img alt="" src="' + st.u.art + '"><i class="gauge"><b></b></i>';
      el.title = st.u.n + '「' + st.u.skill.n + '」\n' + st.u.skill.txt;
      box.appendChild(el);
    }
  }
  const kids = box.childNodes;
  for (let i = 0; i < G.sk.length; i++) {
    const st = G.sk[i], el = kids[i];
    if (!el) continue;
    const sk = st.u.skill;
    let fr = 1;
    if (sk.trig === 'time') fr = clamp((now - st.last) / sk.need, 0, 1);
    else if (sk.trig === 'combo') fr = G.combo > 0 ? (G.combo % sk.need) / sk.need : 0;
    else if (sk.trig === 'perfect') fr = (st.cnt % sk.need) / sk.need;
    else if (sk.trig === 'start') fr = 1;
    el.querySelector('.gauge b').style.width = (fr * 100) + '%';
    el.classList.toggle('ready', fr >= 1);
  }
}

/* ================================================================ 音源准备 */
const TRACK_CACHE = new Map();
// 上一次没能用上原曲的原因：手机上一旦取包/解密/解码失败，页面会安静退回芯片，
// 耳朵里就是「全是电子音」。留个字符串，暂停面板直接摊给用户看。
let trackWhy = '';
// 取一首歌的音频，三档优先级：
//   ① 本机导入的原曲（IndexedDB，玩家的私人版本，能盖过内置包）
//   ② 仓库里的原曲包（assets/ll-music/*.bin，加密的，取回来在这里解）
//   ③ 都没有 → null，回去走页面内合成
// 抓点（onsets）算一次就够了：解出来的重音表存在 IndexedDB 里（'ons2:' 前缀），
// 下次开同一首不用重新扫一遍几十万帧。
// 前缀带版本号：抓点结果多带了「拖长 / 音区 / 频段」三个字段，旧缓存（ons:）
// 只有时间与强度，出谱会退化成没有长条的随机铺点，看见老键就换新的。
async function prepareTrack(songId) {
  if (TRACK_CACHE.has(songId)) return TRACK_CACHE.get(songId);
  const rec = await idbGet(songId).catch(() => null);
  let data = rec && rec.data;
  let name = rec && rec.name;
  let onsets = rec && rec.onsets;
  let pack = false;
  if (!data && hasPack(PACKS, songId)) {
    const plain = await fetchPack(PACKS, songId).catch(() => null);
    if (plain) {
      data = plain;
      pack = true;
      trackWhy = '';
      const meta = PACKS[songId] || {};
      name = meta.src || ('原曲包 · ' + songId);
      const saved = await idbCGet('ons2:' + songId).catch(() => null);
      if (saved && saved.onsets) onsets = saved.onsets;
    } else {
      trackWhy = packWhy() || '原曲包取不到';
    }
  } else if (!data) {
    trackWhy = '本机没有这首的音源';
  }
  if (!data) return null;
  let buffer;
  try {
    buffer = await Audio.decode(data.slice(0));
  } catch (e) {
    // 解码失败（手机内存紧、格式怪）时也把原话留住，别只留一句「电子音」
    trackWhy = '原曲解码失败：' + ((e && (e.name || e.message)) || e);
    throw e;
  }
  let on;
  // 数组形式是缓存下来的（7 个数一档），对象形式是本机导入时刚算的
  if (onsets && onsets.length) on = Array.isArray(onsets[0]) ? unpackOnsets(onsets) : onsets;
  else {
    on = detectOnsets(buffer);
    idbCSet('ons2:' + songId, { onsets: packOnsets(on), dur: buffer.duration }).catch(() => {});
  }
  const v = { buffer, onsets: on, name, dur: buffer.duration, pack };
  TRACK_CACHE.set(songId, v);
  return v;
}
async function buildChart(song, diffK, track) {
  const D = diffOf(diffK);
  const seed = hashStr(song.id + ':' + diffK);
  if (track && track.buffer) {
    let on = track.onsets;
    if (!on || !on.length) on = detectOnsets(track.buffer);
    const c = chartFromOnsets(on, track.buffer.duration, D, seed);
    c.arr = null;
    return c;
  }
  const arr = arrange(song);
  const c = chartFromArr(arr, D, seed);
  c.arr = arr;
  return c;
}

/* ================================================================ 开局 / 暂停 / 结算 */
async function startLive() {
  if (G.prep) return;
  // 全屏请求必须在手势的同一个任务里发出去，下面全是 await，错过这一行就请求不了了
  enterImmersive();
  const song = G.song || SONGS[0];
  G.song = song;
  const D = diffOf(G.diffK);
  G.prep = true;
  const goBtn = $('#team-go');
  if (goBtn) { goBtn.disabled = true; goBtn.textContent = '载入音源…'; }
  let track = null, chart = null;
  if (song.custom) {
    // 工坊里做的谱面：notes 存在 IndexedDB，音频按 audioKey 取（本机，不上传）
    const key = song.mineId || song.cloudId;
    const rec = await idbCGet(key).catch(() => null);
    if (rec && rec.notes) {
      try { track = await prepareTrack(rec.audioKey || ('au:' + key)); } catch (e) { track = null; }
      chart = {
        notes: rec.notes.map((a) => ({
          t: a[0], lane: a[1], kind: a[2] ? 'hold' : 'tap', tail: a[3] || 0,
          s: a[4] == null ? 0.6 : a[4], judged: false, hit: false, holding: false,
        })),
        dur: track ? track.dur : (rec.dur || 60), src: 'custom', arr: null,
      };
    }
  } else {
    try { track = await prepareTrack(song.id); } catch (e) { track = null; }
    try { chart = await buildChart(song, G.diffK, track); }
    catch (e) { chart = await buildChart(song, G.diffK, null); }
  }
  G.prep = false;
  if (!chart) {
    if (goBtn) { goBtn.disabled = false; goBtn.textContent = '上场！'; }
    flash('#team-tip', '这份谱面的数据没在本机（可能换过设备），回工坊重新导入一次');
    return;
  }
  if (goBtn) { goBtn.disabled = false; goBtn.textContent = '上场！'; }

  G.chart = chart;
  G.chartSrc = chart.src;
  G.notes = chart.notes;
  // 谱面必须按时间排好：ni（判定）和 di（绘制）都是「从当前位置往后顺推」，
  // 只要有一条乱序，它后面的音符就再也轮不到判定，会一直贴在框上。
  // 工坊手工编辑 / 云端下载的谱面不保证有序，这里统一排一次。
  G.notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  for (const n of G.notes) { n.judged = false; n.hit = false; n.holding = false; n.broken = false; n._ptr = null; }
  G.active.clear();
  G.stall = 0; G.lastT = 0; G.lastNow = 0;
  G.ni = 0;
  G.holdTotal = chart.notes.reduce((a, n) => a + (n.kind === 'hold' ? 1 : 0), 0);
  G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.cnt = { p: 0, g: 0, go: 0, b: 0, m: 0 };
  G.accW = 0; G.stamina = 100; G.fx = []; G.flashes = []; G.holds = {};
  G.over = false; G.paused = false; G.banner = null; G.tickAt = 0;
  G.di = 0; G.holdingLanes = [];
  // 这一局到底在放什么、听歌模式开没开：暂停面板要显示，别再让人猜「为什么是电子音」
  G.listen = !!SAVE.listen;
  G.srcPack = !!(track && track.pack);
  G.srcLite = !!(track && Audio.lite);
  G.srcName = track ? (track.name || '') : '';
  G.srcWhy = track ? '' : (trackWhy || '没有可用的原曲');
  Audio.setMute(!!SAVE.mute);
  Audio.setVol(SAVE.musVol, SAVE.fxVol);
  Audio.setScale(song.root || 60);
  if (track && track.buffer) Audio.playBuffer(track.buffer, 0);
  else if (song.custom) Audio.playClock();
  else Audio.playChip(chart.arr, song.wave);
  G.running = true;
  show('live');
  $('#live-song').textContent = song.n;
  G.diffText = song.custom ? ('自制谱面' + (track ? '' : ' · 无音频')) : (D.n + (track ? ' · 原曲' : ' · 芯片改编'));
  paintDiffText();
  $('#live-score').textContent = '0';
  $('#live-combo').textContent = '—';
  $('#live-banner').textContent = '';
  fit();
  preloadArt(team());
  initSkills();
  paintSkillChips(true);
}
// 顶栏那行「NORMAL · 原曲」：局内开关听歌模式要跟着变，不然看不出现在是听歌还是正式打
function paintDiffText() {
  const el = $('#live-diff');
  if (el) el.textContent = (G.diffText || '') + (G.listen ? ' · 听歌' : '');
}
function togglePause() {
  if (!G.running) return;
  G.paused = !G.paused;
  $('#pauseDlg').hidden = !G.paused;
  if (G.paused) { paintPause(); Audio.suspend(); } else Audio.resume();
}

// 屏幕方向托管给全站的 zj-orient 组件（它负责锁方向、转屏提示、记本地），
// 这里只做读 / 写两层薄封装，让设置与暂停面板的分段控件跟它同步。
// 手机第一次进来默认横屏（body 上有 data-orient-default="land"）。
function orientPref() {
  try {
    if (window.zjOrient) return window.zjOrient.get();
    return localStorage.getItem('zjtt:orient:lovelive') || 'auto';
  } catch (e) { return 'auto'; }
}
function setOrient(k) {
  try { if (window.zjOrient) window.zjOrient.set(k, true); } catch (e) { /* 组件不在就随它 */ }
  $$('#set-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  $$('#pause-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  // 转屏后画布尺寸会变，晚一点再排一次（等浏览器把视口改完）
  setTimeout(fit, 300);
}

// 暂停面板：音量两条、屏幕方向、听歌模式、当前音源。局内能直接调，
// 不用退出到设置再进来（打歌中途谁也懒得来回切屏）。
// 从 http 打开时 crypto.subtle 是被浏览器摘掉的，原曲只能走纯 JS 解密：
// 能听，但慢一点，得让用户知道「不是没生效，是换了一条路」。
const HTTP_MODE = location.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
function srcLine() {
  if (G.srcWhy) return '芯片合成 · ' + G.srcWhy + (HTTP_MODE ? '（http 打开，浏览器关掉了 WebCrypto）' : '');
  const nm = G.song ? G.song.n : '';
  const via = G.srcPack && packHow() === 'js' ? '（纯 JS 解密）' : '';
  return (G.srcPack ? '原曲' : '本机音频') + (nm ? ' · ' + nm : '') + (G.srcLite ? '（降级解码）' : '') + via;
}
function paintPause() {
  const m = $('#pause-mus'), f = $('#pause-fx');
  if (m) {
    m.value = String(Math.round(SAVE.musVol * 100));
    $('#pause-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  }
  if (f) {
    f.value = String(Math.round(SAVE.fxVol * 100));
    $('#pause-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  }
  $$('#pause-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === orientPref()));
  $$('#pause-listen button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!G.listen));
  const el = $('#pause-src');
  if (el) el.textContent = '音源：' + srcLine();
}
function finish(failed) {
  if (G.over) return;
  G.over = true; G.running = false;
  Audio.stop();
  for (const n of G.active) n.holding = false;
  G.active.clear();
  G.holds = {};
  // 长条尾音占半个判定位：满分时 accW 恰好等于这个分母（头 1.0 + 尾 0.5）
  const total = G.notes.length + (G.holdTotal || 0) * 0.5;
  const acc = total ? G.accW / total : 0;
  const ap = total > 0 && G.cnt.p === total;
  const fc = !failed && G.cnt.m === 0 && G.cnt.b === 0;
  const rank = failed ? 'F' : acc >= 0.985 ? 'SSS' : acc >= 0.945 ? 'SS' : acc >= 0.90 ? 'S'
    : acc >= 0.82 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.60 ? 'C' : 'D';
  const bk = bestKey(G.song.id, G.diffK);
  let isBest = false;
  if (G.listen) {
    // 听歌模式的判定是固定的 BAD，成绩没有可比性：不写最高分、也不计场次
  } else {
    SAVE.plays++;
    if (G.maxCombo > SAVE.bestCombo) SAVE.bestCombo = G.maxCombo;
    isBest = (Number(SAVE.best[bk]) || 0) < Math.round(G.score);
    if (isBest) SAVE.best[bk] = Math.round(G.score);
  }
  persist();
  $('#res-rank').textContent = G.listen ? '🎧' : rank;
  $('#res-title').textContent = G.listen ? '听歌模式 · 完整听完'
    : failed ? '体力见底，Live 中断…' : (ap ? 'ALL PERFECT！' : fc ? 'FULL COMBO！' : 'Live 结束');
  $('#res-song').textContent = G.song.n + ' · ' + diffOf(G.diffK).n
    + (G.chartSrc === 'audio' ? ' · 原曲' : '') + (G.listen ? ' · 不计成绩' : '');
  $('#res-score').textContent = fmt(G.score);
  $('#res-acc').textContent = (acc * 100).toFixed(2) + '%';
  $('#res-combo').textContent = String(G.maxCombo);
  $('#res-notes').textContent = String(G.notes.length);
  $('#res-best').textContent = G.listen ? '听歌模式不计成绩' : (isBest ? '★ 新纪录' : '最高 ' + fmt(SAVE.best[bk] || 0));
  $('#res-judge').innerHTML = ['p', 'g', 'go', 'b', 'm']
    .map((k) => '<li><span style="color:' + JC[k] + '">' + JN[k] + '</span><b>' + G.cnt[k] + '</b></li>').join('');
  $('#res-skills').innerHTML = G.sk.map((st) => (
    '<li style="--h:' + st.u.hue + '"><img src="' + st.u.art + '" alt=""><span>' + esc(st.u.n)
    + '「' + esc(st.u.skill.n) + '」</span><b>' + st.fires + ' 次</b></li>'
  )).join('');
  show('result');
  renderBest();
}

/* ================================================================ 选曲 */
function trackInfo(songId) {
  return SAVE.tracks[songId] || null;
}
function allSongs() { return SONGS.concat(SHOP ? SHOP.songs() : []); }
// 曲目按来源分组（sub 里 `·` 前面那截：μ's / 国风原创 / 剑网3 / 明日方舟 / 边狱巴士 / 鸣潮 / 自制）
function songGroup(s) {
  if (s.custom) return '自制';
  return String(s.sub || '').split('·')[0].trim() || '其它';
}
let songTab = 'all';
function renderSongs() {
  const box = $('#song-list');
  const all = allSongs();
  const groups = [];
  for (const s of all) {
    const g = songGroup(s);
    if (groups.indexOf(g) < 0) groups.push(g);
  }
  if (songTab !== 'all' && groups.indexOf(songTab) < 0) songTab = 'all';
  const tabs = $('#src-tabs');
  if (tabs) {
    tabs.textContent = '';
    for (const g of ['全部'].concat(groups)) {
      const key = g === '全部' ? 'all' : g;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (key === songTab ? ' on' : '');
      b.dataset.g = key;
      b.textContent = g === '全部' ? ('全部 ' + all.length) : g;
      tabs.appendChild(b);
    }
    tabs.onclick = (e) => {
      const b = e.target.closest('button.tab');
      if (!b || b.dataset.g === songTab) return;
      songTab = b.dataset.g;
      renderSongs();
    };
  }
  box.textContent = '';
  for (const s of all) {
    if (songTab !== 'all' && songGroup(s) !== songTab) continue;
    if (s.custom) {
      const card = document.createElement('article');
      card.className = 'song mine';
      card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
        + '<span class="bpm">' + (s.count || 0) + ' 音符</span></div>'
        + '<div class="src on">♪ 自制谱面 · ' + mmss(s.dur) + '（本机音频）</div>'
        + '<div class="dfs"><button type="button" class="df" data-s="' + s.id + '" data-d="normal">'
        + '<b>PLAY</b><span>' + mmss(s.dur) + '</span></button></div>';
      box.appendChild(card);
      continue;
    }
    const t = trackInfo(s.id);
    const pk = hasPack(PACKS, s.id);
    const card = document.createElement('article');
    card.className = 'song';
    const diffs = DIFFS.map((d) => {
      const b = Number(SAVE.best[bestKey(s.id, d.k)]) || 0;
      return '<button type="button" class="df' + (d.k === G.diffK ? ' on' : '') + '" data-s="' + s.id + '" data-d="' + d.k + '">'
        + '<b>' + d.n + '</b><span>' + (b ? fmt(b) : '·—·') + '</span></button>';
    }).join('');
    card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
      + '<span class="bpm">' + s.bpm + ' BPM</span></div>'
      + '<div class="src' + ((t || pk) ? ' on' : '') + '">' + (t
        ? '♪ 原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
        : pk ? '♪ 原曲包（仓库内置 · 加密）'
          : '♪ 芯片改编（页面内合成）') + '</div>'
      + '<div class="dfs">' + diffs + '</div>';
    box.appendChild(card);
  }
  box.onclick = (e) => {
    const b = e.target.closest('button.df');
    if (!b) return;
    G.diffK = b.dataset.d;
    G.song = allSongs().find((x) => x.id === b.dataset.s);
    openTeam();
  };
}

/* ================================================================ 编队（九人） */
let teamSel = [];
function openTeam() {
  teamSel = team().slice(0, TEAM_MAX);
  $('#team-song').textContent = G.song ? (G.song.n + ' · ' + diffOf(G.diffK).n) : '';
  renderTeam();
  show('team');
}
function renderTeam() {
  const grid = $('#unit-grid');
  grid.textContent = '';
  for (const u of UNITS) {
    const idx = teamSel.indexOf(u.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'unit' + (idx >= 0 ? ' on' : '');
    el.style.setProperty('--h', u.hue);
    const ps = (u.pass && u.pass.score) ? ('得分 +' + Math.round(u.pass.score * 100) + '%')
      : (u.pass && u.pass.judge) ? ('判定 +' + Math.round(u.pass.judge * 100) + '%') : '—';
    el.innerHTML = '<span class="uimg"><img src="' + u.art + '" alt="" loading="lazy"></span>'
      + '<b>' + esc(u.n) + '</b>'
      + (idx >= 0 ? '<i class="ord">' + (idx + 1) + '</i>' : '')
      + '<span class="sk"><em>自动</em>' + esc(u.skill.n) + '</span>'
      + '<span class="stxt">' + esc(u.skill.txt) + '</span>'
      + '<span class="pas">' + esc(ps) + '</span>';
    el.onclick = () => {
      const i = teamSel.indexOf(u.id);
      if (i >= 0) teamSel.splice(i, 1);
      else if (teamSel.length >= TEAM_MAX) return flash('#team-tip', '九格已经满了，先取消一位');
      else teamSel.push(u.id);
      SAVE.team = teamSel.slice();
      persist();
      renderTeam();
    };
    grid.appendChild(el);
  }
  const box = $('#team-pick');
  let html = '';
  for (let i = 0; i < TEAM_MAX; i++) {
    const id = teamSel[i];
    if (id) {
      const u = unitById(id);
      html += '<span class="pick" style="--h:' + u.hue + '" title="' + esc(u.n) + '"><img src="' + u.art + '" alt="">'
        + '<em>' + KEY_LABEL[i] + '</em></span>';
    } else {
      html += '<span class="pick empty"><em>' + KEY_LABEL[i] + '</em></span>';
    }
  }
  box.innerHTML = html;
}

/* ================================================================ 设置 */
function paintSet() {
  $('#set-offset').value = String(SAVE.offset);
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  $('#set-mus').value = String(Math.round(SAVE.musVol * 100));
  $('#set-fx').value = String(Math.round(SAVE.fxVol * 100));
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  $('#set-flow').value = String(SAVE.flow);
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  $$('#set-win button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === SAVE.winMul));
  $$('#set-keys button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.keys));
  $$('#set-haptic button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.haptic));
  $$('#set-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === orientPref()));
  $$('#set-immersive button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.immersive));
  $$('#set-listen button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.listen));  renderTrackList();
}
function renderTrackList() {
  const box = $('#set-tracks');
  box.innerHTML = '';
  for (const s of SONGS) {
    const t = trackInfo(s.id);
    const pk = hasPack(PACKS, s.id);
    const row = document.createElement('div');
    row.className = 'trk' + ((t || pk) ? ' on' : '');
    row.innerHTML = '<div class="ti"><b>' + esc(s.n) + '</b><span>' + (t
      ? '本机原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
      : pk ? '原曲包（仓库内置 · 加密）'
        : '芯片改编 · ' + mmss(arrange(s).dur)) + '</span></div>'
      + '<div class="ta">' + (t ? '<button type="button" data-clear="' + s.id + '">清除</button>' : '')
      + '<button type="button" data-pick="' + s.id + '">' + (t ? '换一个' : '导入原曲') + '</button></div>';
    box.appendChild(row);
  }
}
async function importTrack(songId, file) {
  const status = $('#set-status');
  status.textContent = '正在读取「' + file.name + '」…';
  status.classList.remove('err');
  try {
    const raw = await file.arrayBuffer();
    const ac = Audio.ensure();
    if (!ac) throw new Error('这个浏览器没有 WebAudio，放不了原曲');
    status.textContent = '正在解码…（大文件要等几秒）';
    await new Promise((r) => setTimeout(r, 30));
    const buffer = await Audio.decode(raw.slice(0));
    status.textContent = '正在抓鼓点…（' + mmss(buffer.duration) + '）';
    await new Promise((r) => setTimeout(r, 30));
    const onsets = detectOnsets(buffer);
    const flat = packOnsets(onsets);
    await idbSet(songId, { name: file.name, data: raw, onsets: flat, dur: buffer.duration });
    TRACK_CACHE.set(songId, { buffer, onsets, name: file.name, dur: buffer.duration });
    SAVE.tracks[songId] = { name: file.name, dur: buffer.duration, notes: onsets.length };
    persist();
    status.textContent = '好了：' + mmss(buffer.duration) + '，抓到 ' + onsets.length + ' 个重音。谱面会跟着这一版走。';
    renderTrackList();
    renderSongs();
  } catch (e) {
    status.textContent = '没成功：' + (e && e.message ? e.message : '这个文件解不开（换个 mp3 / m4a 试试）');
    status.classList.add('err');
  }
}

/* ================================================================ 首屏 */
function renderBest() {
  let played = 0, bestScore = 0;
  for (const k of Object.keys(SAVE.best)) {
    played++;
    bestScore = Math.max(bestScore, Number(SAVE.best[k]) || 0);
  }
  $('#title-best').textContent = played
    ? '玩过 ' + played + ' 张谱 · 最高分 ' + fmt(bestScore) + ' · 最长连击 ' + fmt(SAVE.bestCombo)
    : '还没玩过——选首歌，带上九位唤醒体试试？';
  const n = Object.keys(SAVE.tracks).length;
  const p = Object.keys(PACKS || {}).length;
  const bits = [];
  if (p) bits.push('曲库原曲包 ' + p + ' 首');
  if (n) bits.push('本机导入 ' + n + ' 首');
  $('#title-src').textContent = bits.length ? ('音源：' + bits.join(' · ')) : '音源：芯片改编（可在设置里导入原曲）';
}

/* ================================================================ 接线 */
$('#btn-play').onclick = () => { renderSongs(); show('songs'); };
$('#btn-team').onclick = () => { G.song = G.song || SONGS[0]; openTeam(); };
$('#btn-set').onclick = () => { paintSet(); show('set'); };
$('#btn-shop').onclick = () => SHOP.openShop();
$('#songs-shop').onclick = () => SHOP.openShop();
$('#btn-help').onclick = () => {
  const d = $('#helpDlg');
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
};
$('#songs-back').onclick = () => { show('title'); renderBest(); };
$('#songs-set').onclick = () => { paintSet(); show('set'); };
$('#team-back').onclick = () => { renderSongs(); show('songs'); };
$('#set-back').onclick = () => { show('title'); renderBest(); };
$('#team-go').onclick = () => {
  if (!teamSel.length) return flash('#team-tip', '至少带一位上场');
  if (teamSel.length !== TEAM_MAX) flash('#team-tip', '九格没满也能打，但空着的格子没人接');
  startLive();
};
$('#live-pause').onclick = () => togglePause();
$('#pause-resume').onclick = () => togglePause();
$('#pause-retry').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; Audio.resume();
  G.running = false; G.over = true; Audio.stop();
  startLive();
};
// 局内音量：拖一下就立刻生效，不用等继续
$('#pause-mus').oninput = (e) => {
  SAVE.musVol = (Number(e.target.value) || 0) / 100;
  $('#pause-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  Audio.setVol(SAVE.musVol, null);
  $('#set-mus').value = String(Math.round(SAVE.musVol * 100));
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  persist();
};
$('#pause-fx').oninput = (e) => {
  SAVE.fxVol = (Number(e.target.value) || 0) / 100;
  $('#pause-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  Audio.setVol(null, SAVE.fxVol);
  $('#set-fx').value = String(Math.round(SAVE.fxVol * 100));
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  persist();
};
$$('#pause-orient button').forEach((b) => { b.onclick = () => setOrient(b.dataset.v); });
// 听歌模式：局内切换立刻生效（打开就把体力补满，关掉继续正常打）
$$('#pause-listen button').forEach((b) => {
  b.onclick = () => {
    const on = b.dataset.v === '1';
    G.listen = on;
    SAVE.listen = on ? 1 : 0;
    if (on) { G.stamina = 100; G.banner = { txt: '听歌模式：自动最低判定，不会掉血', until: chartTime() + 1.6, hue: 200 }; }
    persist();
    paintDiffText();
    paintPause();
  };
});
$('#pause-quit').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; G.running = false; G.over = true; Audio.stop();
  renderSongs(); show('songs');
};
$('#res-retry').onclick = () => startLive();
$('#res-songs').onclick = () => { renderSongs(); show('songs'); };
$('#res-home').onclick = () => { show('title'); renderBest(); };
$('#mute').onclick = () => {
  SAVE.mute = SAVE.mute ? 0 : 1;
  persist();
  Audio.setMute(!!SAVE.mute);
  $('#mute').classList.toggle('off', !!SAVE.mute);
};
$('#mute').classList.toggle('off', !!SAVE.mute);

// 返回小游戏主页：页面外的链接，走了就整页换掉——先把声音停干净再走
const homeEl = $('#to-home');
if (homeEl) homeEl.onclick = () => {
  try { Audio.stop(); } catch (e) { /* 走就完了 */ }
};

// 设置项
$('#set-offset').oninput = (e) => {
  SAVE.offset = Number(e.target.value) || 0;
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  persist();
};
$$('#set-win button').forEach((b) => {
  b.onclick = () => {
    SAVE.winMul = Number(b.dataset.v) || 1;
    persist();
    $$('#set-win button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-orient button').forEach((b) => { b.onclick = () => setOrient(b.dataset.v); });
$$('#set-immersive button').forEach((b) => {
  b.onclick = () => {
    SAVE.immersive = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-immersive button').forEach((x) => x.classList.toggle('on', x === b));
    // 当场生效：开就进全屏（这一下是用户点的，还在手势里），关就退出
    if (SAVE.immersive) enterImmersive(); else exitImmersive();
  };
});
$$('#set-listen button').forEach((b) => {
  b.onclick = () => {
    SAVE.listen = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-listen button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-keys button').forEach((b) => {
  b.onclick = () => {
    SAVE.keys = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-keys button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-haptic button').forEach((b) => {
  b.onclick = () => {
    SAVE.haptic = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-haptic button').forEach((x) => x.classList.toggle('on', x === b));
    if (SAVE.haptic && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* noop */ } }
  };
});
$('#set-flow').oninput = (e) => {
  SAVE.flow = Number(e.target.value) || 1;
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  persist();
};
$('#set-mus').oninput = (e) => {
  SAVE.musVol = (Number(e.target.value) || 0) / 100;
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  Audio.setVol(SAVE.musVol, null);
  persist();
};
$('#set-fx').oninput = (e) => {
  SAVE.fxVol = (Number(e.target.value) || 0) / 100;
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  Audio.setVol(null, SAVE.fxVol);
  persist();
  Audio.fx('p');
};
let pendingSong = null;
$('#set-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f || !pendingSong) return;
  importTrack(pendingSong, f);
  e.target.value = '';
});
$('#set-tracks').onclick = (e) => {
  const pick = e.target.closest('[data-pick]');
  const clr = e.target.closest('[data-clear]');
  if (pick) {
    pendingSong = pick.dataset.pick;
    const inp = $('#set-file');
    inp.accept = 'audio/*';
    inp.click();
    return;
  }
  if (clr) {
    const id = clr.dataset.clear;
    idbDel(id).catch(() => {});
    TRACK_CACHE.delete(id);
    delete SAVE.tracks[id];
    persist();
    $('#set-status').textContent = '已清除，这首歌回到芯片改编。';
    renderTrackList();
    renderSongs();
  }
};

/* ================================================================ 测试钩子 */
if (TEST) {
  window.__ll = {
    G, SAVE, UNITS, SONGS, DIFFS, LAY, KEYS, startLive, finish, buildChart, show,
    renderSongs, openTeam, renderTeam, paintSet, importTrack, prepareTrack,
    srcLine, paintPause, LAY, size: () => ({ W, H, DPR }),
    tapLane, tapNear, notePos, leadEff, windows, judgeBy, chartTime,
    setDiff: (k) => { G.diffK = k; },
    pickSong: (id) => { G.song = SONGS.find((x) => x.id === id) || SONGS[0]; },
    setTeam: (ids) => { SAVE.team = ids.slice(0, TEAM_MAX); persist(); },
    pickTrackFile: (id) => { pendingSong = id; },
    audio: Audio,
    shop: SHOP,
    PACKS,
    showArt, allSongs, fireSkill, initSkills, preloadArt,
    setSetting: (k, v) => { SAVE[k] = v; persist(); },
  };
}

/* ================================================================ 工坊 */
// 工坊要碰的东西不少（存储、对局、选曲列表），这里一次注入，避免两个模块互相 import 打架
var SHOP = initShop({
  G, SAVE, persist, Audio, show, renderSongs, startLive, $, $$,
  KEYS, fmt, mmss, diffOf, chartFromOnsets, detectOnsets, packOnsets,
  idbGet, idbSet, idbDel, idbCGet, idbCSet, idbCDel,
});

// 测试钩子是在这个 var 之前定义的，那时 SHOP 还不是对象，这里补挂一次
if (TEST && window.__ll) window.__ll.shop = SHOP;

/* ================================================================ 启动 */
renderBest();
Audio.setMute(!!SAVE.mute);
Audio.setVol(SAVE.musVol, SAVE.fxVol);
startGameCloud('lovelive');
fit();
