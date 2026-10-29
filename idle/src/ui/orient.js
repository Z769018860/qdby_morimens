// 横屏 / 竖屏：挂机版自己的那一份（首页那六个用构建注入的 src/partials/orient.html）。
//
// 为什么不做成七个游戏共用一份文件：挂机版是独立子项目（idle/ 有自己的 index.html
// 和 styles.css，构建时整棵子树照原样发布），跨目录 import 会让它离开仓库就没法跑。
// 逻辑保持和外面那份一致：同一个键名规则、同样的锁定 / 提示 / resize 行为。
const KEY = 'zjtt:orient:idle';
const MODES = [
  ['auto', '自动', '⟲'],
  ['land', '横屏', '▭'],
  ['port', '竖屏', '▯'],
];

let pref = 'auto';
let locked = false;
let dismissed = false;

function readPref() {
  try { return localStorage.getItem(KEY) || 'auto'; } catch { return 'auto'; }
}
function savePref(v) {
  try { localStorage.setItem(KEY, v); } catch { /* 隐私模式写不进去，当次有效 */ }
}

function applyCss() {
  if (pref === 'auto') document.documentElement.removeAttribute('data-orient');
  else document.documentElement.setAttribute('data-orient', pref);
  document.dispatchEvent(new CustomEvent('zj:orient', { detail: { mode: pref } }));
  setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
}

function lock(mode) {
  if (!screen.orientation || typeof screen.orientation.lock !== 'function') return Promise.reject();
  return screen.orientation.lock(mode === 'land' ? 'landscape' : mode === 'port' ? 'portrait' : 'any')
    .then(() => { locked = mode !== 'auto'; })
    .catch(() => { locked = false; });
}

function fullscreen(on) {
  try {
    if (on && document.documentElement.requestFullscreen && !document.fullscreenElement) {
      return document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
    if (!on && document.fullscreenElement && document.exitFullscreen) return document.exitFullscreen().catch(() => {});
  } catch { /* 不支持就算了 */ }
  return Promise.resolve();
}

let hint = null;
function checkHint() {
  if (!hint) return;
  const portrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
  const small = Math.min(screen.width || 9999, screen.height || 9999) < 820;
  const need = pref === 'land' && portrait && small && !locked && !dismissed;
  hint.classList.toggle('on', need);
}

function buildHint() {
  const el = document.createElement('div');
  el.className = 'zj-rot';
  el.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#c8d1e3" stroke-width="1.4" stroke-linecap="round">
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.4"/>
      <path d="M10 5.4h4"/><circle cx="12" cy="18.4" r="1.05" fill="#c8d1e3" stroke="none"/>
    </svg>
    <b>把手机横过来</b>
    <p>这局按横屏排版，转一下机身就能铺满；不想转也可以先竖着玩。</p>
    <div class="acts"><button type="button" class="pri" data-act="keep">已经横过来了</button>
    <button type="button" data-act="port">仍要竖屏玩</button></div>`;
  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'keep') {
      dismissed = true;
      el.classList.remove('on');
    } else {
      pref = 'port';
      savePref(pref);
      paint();
      applyCss();
      el.classList.remove('on');
    }
  });
  document.body.append(el);
  return el;
}

let btn = null;
function paint() {
  if (!btn) return;
  const m = MODES.find((x) => x[0] === pref) || MODES[0];
  btn.innerHTML = `<span aria-hidden="true">${m[2]}</span><span>${m[1]}</span>`;
  btn.title = '游玩方向：' + m[1] + '（点一下切换）';
  checkHint();
}

function set(mode) {
  pref = mode;
  savePref(mode);
  dismissed = false;
  locked = false;
  const seq = mode === 'auto'
    ? Promise.all([lock('auto'), fullscreen(false)])
    : fullscreen(true).then(() => lock(mode));
  Promise.resolve(seq).then(() => {
    applyCss();
    paint();
    setTimeout(checkHint, 60);
  });
}

function buildButton() {
  const top = document.querySelector('.top .res');
  if (!top) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'orient-btn';
  b.addEventListener('click', () => {
    const i = MODES.findIndex((x) => x[0] === pref);
    set(MODES[(i + 1) % MODES.length][0]);
  });
  top.insertBefore(b, top.querySelector('#sndq'));
  return b;
}

export function initOrient() {
  pref = readPref();
  btn = buildButton();
  hint = buildHint();
  paint();
  if (pref !== 'auto') lock(pref).then(applyCss).catch(applyCss);
  else applyCss();
  window.addEventListener('resize', checkHint);
  window.addEventListener('orientationchange', () => setTimeout(() => {
    checkHint();
    window.dispatchEvent(new Event('resize'));
  }, 260));
  if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', () => setTimeout(() => {
      checkHint();
      window.dispatchEvent(new Event('resize'));
    }, 160));
  }
}

initOrient();
