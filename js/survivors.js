// 《唤醒体幸存者》入口：装配渲染、输入、主循环。
//
// 固定步长（1/60 秒）推进战斗，渲染跟着屏幕刷新率走。这样高刷屏上角色不会
// 跑得更快，掉帧时也不会瞬移穿过敌人 —— 每帧最多补 6 步，防止切标签页回来
// 一次补上千步直接把自己补死。

import { G, reset, update, summary, setSeed, applyChoice, skipChoice, rollChoices, addWeapon, addCreation, releaseRage } from './sv/engine.js';
import { init, resize, draw } from './sv/render.js';
import { showPick, showUpgrade, showEnd, buildHUD, updateHUD, choose, togglePause, ui, closeInfo } from './sv/ui.js';
import { DIFFS } from './sv/defs.js';

const FIXED = 1 / 60;
const cv = document.getElementById('cv');

let acc = 0;
let last = performance.now();
let upShown = false;
let ended = false;

// ---------------------------------------------------------------- 输入
const keys = new Set();
const KEYMAP = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};
let stick = null;       // { id, ox, oy, x, y }

function applyInput() {
  let x = 0, y = 0;
  for (const k of keys) {
    const v = KEYMAP[k];
    if (v) { x += v[0]; y += v[1]; }
  }
  if (stick) {
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > 6) {
      const k = Math.min(1, d / 52) / d;
      x += dx * k * 1.6;
      y += dy * k * 1.6;
    }
  }
  const len = Math.hypot(x, y);
  if (len > 1) { x /= len; y /= len; }
  G.player.ix = x;
  G.player.iy = y;
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    // 构筑详情是「暂停态」的一种，Esc 应该先关它，而不是把游戏直接放跑
    const info = document.getElementById('ovInfo');
    if (info && !info.hidden) { closeInfo(); e.preventDefault(); return; }
    // 三选一时 Esc 等同于「这次不要」：万一卡片没渲染出来，还有个退路
    if (G.phase === 'levelup') { choose(-1); e.preventDefault(); return; }
    if (G.phase === 'run' || G.phase === 'pause') { togglePause(); e.preventDefault(); }
    return;
  }
  // 空格放狂气：只在这一局进行中生效，弹窗上按空格不应该误触
  if (e.code === 'Space') {
    if (G.phase === 'run') { releaseRage(); e.preventDefault(); }
    return;
  }
  if (G.phase === 'levelup') {
    const n = Number(e.key);
    if (n >= 1 && n <= 3) { choose(n - 1); e.preventDefault(); return; }
    if (e.key === '0') { choose(-1); e.preventDefault(); }
    return;
  }
  if (KEYMAP[e.code]) { keys.add(e.code); applyInput(); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (keys.delete(e.code)) applyInput();
});
window.addEventListener('blur', () => { keys.clear(); stick = null; applyInput(); });

// 触屏摇杆：任意位置按下都能推，指哪走哪，不用找固定的虚拟摇杆
cv.addEventListener('pointerdown', (e) => {
  if (G.phase !== 'run') return;
  if (stick) return;
  cv.setPointerCapture(e.pointerId);
  stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY };
  drawStick();
});
cv.addEventListener('pointermove', (e) => {
  if (!stick || e.pointerId !== stick.id) return;
  stick.x = e.clientX;
  stick.y = e.clientY;
  applyInput();
  drawStick();
});
const endStick = (e) => {
  if (!stick || (e && e.pointerId !== stick.id)) return;
  stick = null;
  applyInput();
  drawStick();
};
cv.addEventListener('pointerup', endStick);
cv.addEventListener('pointercancel', endStick);

function drawStick() {
  const el = document.getElementById('stick');
  if (!stick) { el.style.opacity = '0'; return; }
  const dx = stick.x - stick.ox, dy = stick.y - stick.oy;
  const d = Math.min(52, Math.hypot(dx, dy)) || 0;
  const a = Math.atan2(dy, dx);
  el.style.opacity = '1';
  el.style.left = stick.ox + 'px';
  el.style.top = stick.oy + 'px';
  const knob = el.firstElementChild;
  knob.style.transform = `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px)`;
}

// ---------------------------------------------------------------- 主循环
function loop(now) {
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, raw);
  try {
    frame(dt);
  } catch (e) {
    // 一帧出错不应该让整局静悄悄地卡死：记下原因，继续跑下一帧。
    // （曾经因为这里没兜底，某个武器原型抛错后画面直接冻住，控制台却什么都没有。）
    window.__svErr = (window.__svErr || 0) + 1;
    window.__svErrMsg = String((e && e.stack) || e).slice(0, 400);
    if (window.__svErr > 60) throw e;
  }
  requestAnimationFrame(loop);
}

function frame(dt) {

  if (G.phase === 'run' && !window.__svFrozen) {
    acc += dt;
    let guard = 0;
    while (acc >= FIXED && guard++ < 6) { update(FIXED); acc -= FIXED; }
  } else {
    acc = 0;
    // 非战斗状态也让粒子/飘字继续收尾，画面不会突然僵住
    if (G.phase !== 'idle') update(dt);
  }

  draw();
  updateHUD();

  if (G.phase === 'levelup' && !upShown) {
    upShown = true;
    showUpgrade(G.choices);
  } else if (G.phase !== 'levelup' && upShown) {
    upShown = false;
  }

  if ((G.phase === 'over' || G.phase === 'win') && !ended) {
    ended = true;
    setTimeout(() => showEnd(summary()), 520);
  }
}

// ---------------------------------------------------------------- 装配
function startGame() {
  setSeed((Date.now() ^ (Math.random() * 1e9)) >>> 0);
  reset(ui.charId, ui.diff);
  closeInfo();
  document.getElementById('ovPick').hidden = true;
  document.getElementById('ovEnd').hidden = true;
  document.getElementById('hud').hidden = false;
  document.getElementById('stick').style.opacity = '0';
  ended = false;
  upShown = false;
  acc = 0;
  last = performance.now();
  if (G.mods.firstStrike) {
    G.weapons.forEach((w) => { w.timer = 0; });
  }
}

function restart() {
  document.getElementById('ovEnd').hidden = true;
  document.getElementById('hud').hidden = true;
  closeInfo();
  G.phase = 'idle';
  showPick();
}

async function boot() {
  buildHUD();
  const startBtn = document.getElementById('btnStart');
  // 页面里的载入守护会在 4 秒后把按钮文案改成「正在载入素材…」，等真的就绪了
  // 必须自己改回来并打上 ready 标记——否则素材早就好了，按钮永远挂着「载入中」，
  // 玩家以为进不去（截图里就是这么卡的）。
  startBtn.disabled = true;
  await init(cv);
  resize();
  window.addEventListener('resize', () => { resize(); });
  startBtn.textContent = '进入忘川';
  startBtn.disabled = false;
  startBtn.dataset.ready = '1';
  startBtn.onclick = startGame;
  document.getElementById('btnAgain').onclick = restart;
  document.getElementById('btnMenu').onclick = restart;
  document.getElementById('btnResume').onclick = () => togglePause(false);
  document.getElementById('btnQuit').onclick = restart;
  // 狂气按钮走 ui 的回调：buildHUD 只在启动时建一次，不能直接绑死
  ui.onRage = releaseRage;
  document.getElementById('hud').hidden = true;
  showPick();
  requestAnimationFrame((t) => { last = t; loop(t); });
}

// 供无头测试用：?_test=1 时把状态挂到 window，并给一个「快进整局」的仿真入口。
// bot(n) 固定步长推进 n 秒，遇到升级就自动选第一张 —— 这样 15 分钟的平衡
// 可以在几秒内跑完，不用真的守着屏幕等。
if (/[?&]_test=1/.test(location.search)) {
  window.__sv = {
    G, summary, update, applyChoice, rollChoices, addWeapon, addCreation,
    rage: releaseRage,
    skip: skipChoice, // 「这次不要」：测试里要能直接调
    seed: setSeed,   // 平衡测量用：固定种子才能把两次改动的差异看出来
    start: (c, d) => { ui.charId = c; ui.diff = d || 'normal'; startGame(); },
    bot: (seconds) => {
      window.__svFrozen = true;
      const marks = [];
      let peak = 0;
      const frames = Math.round(seconds * 60);
      // 极简求生 AI：每 10 帧朝「八方向里怪最稀」的那个方向走，
      // 完全不躲不闪的话，任何平衡都测不出来（站着必死）。
      const dirs = [[1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7], [0, -1], [0.7, -0.7]];
      for (let i = 0; i < frames; i++) {
        if (G.phase === 'levelup') {
          const pick = G.choices.find((o) => o.kind === 'wlv')
            || G.choices.find((o) => o.kind === 'wnew')
            || G.choices[0];
          applyChoice(pick);
          continue;
        }
        if (G.phase !== 'run') break;
        if (G.rageReady && G.rageT <= 0) releaseRage();
        if (i % 10 === 0) {
          let best = dirs[0], bestD = -1;
          for (const [dx, dy] of dirs) {
            const px = G.player.x + dx * 90, py = G.player.y + dy * 90;
            let near = 1e9;
            for (const e of G.enemies) {
              const d = (e.x - px) ** 2 + (e.y - py) ** 2;
              if (d < near) near = d;
            }
            if (near > bestD) { bestD = near; best = [dx, dy]; }
          }
          G.player.ix = best[0]; G.player.iy = best[1];
        }
        update(1 / 60);
        if (G.enemies.length > peak) peak = G.enemies.length;
        if (i % (60 * 60) === 0) {
          marks.push({ t: Math.round(G.t), lv: G.lv, kills: G.kills, hp: Math.round(G.player.hp),
            dps: Math.round(G.stats.dmg / Math.max(1, G.t)), weapons: G.weapons.length,
            passives: G.passives.length, wheels: G.wheels.length, enemies: G.enemies.length });
        }
      }
      window.__svFrozen = false;
      return { phase: G.phase, marks, peak, sum: summary(), weapons: G.weapons.map((w) => w.def.n + ':' + w.lv) };
    },
  };
}

boot();

