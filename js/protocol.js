// 《忘却协议》入口：装配渲染、输入、主循环。
//
// 固定步长（1/60 秒）推进战斗，渲染跟着屏幕刷新率走：高刷屏上不会打得更快，
// 掉帧时也不会一帧跨过好几只怪。每帧最多补 5 步，切标签页回来不会一次补上千步。

import { G, update, beginWave, place, sell, reset, summary, UNITS_BY_ID, buy, buyItem, equip, levelUp, rollShop, deployed, freeCell, TUNE } from './pf/engine.js';
import { init, draw, setBand, toLogic, hover, layout, screenPos } from './pf/render.js';
import { build, startRun, sync, updateHUD, showEnd, bandRect, select, tapUnit, ui, inspectCell, hideInspection, relayoutInspection } from './pf/ui.js';
import { cellAt, colOf, DEPLOY_COLS, MAX_LEVEL, LEVEL_COST, INV_SIZE } from './pf/defs.js';
import { sfx } from './pf/audio.js';
import { startGameCloud } from './gamecloud.js';

const FIXED = 1 / 60;
const cv = document.getElementById('cv');

let acc = 0;
let last = performance.now();
let ended = false;
let bandTick = 0;

// ---------------------------------------------------------------- 输入
function cellUnder(clientX, clientY) {
  const p = toLogic(clientX, clientY);
  const hit = cellAt(p.x, p.y);
  return hit.d <= 62 ? hit.cell : -1;
}

cv.addEventListener('pointermove', (e) => {
  hover.cell = cellUnder(e.clientX, e.clientY);
  if (G.phase !== 'idle' && e.pointerType !== 'touch') inspectCell(hover.cell, e.clientX, e.clientY);
});

cv.addEventListener('pointerleave', () => { hover.cell = -1; hideInspection(true); });

cv.addEventListener('pointerdown', (e) => {
  const cell = cellUnder(e.clientX, e.clientY);
  const u = cell >= 0 ? G.board.get(cell) : null;
  // 手上拿着装备：点谁就给谁装上（备战席上的人靠底部头像条）
  if (ui.item != null) {
    if (u) tapUnit(u.uid);
    else G.msg = '点一个唤醒体装上';
    return;
  }
  if (G.phase === 'prep' && ui.sel != null) {
    // 手里有单位：点子就落子。落不了（人口满 / 这一列不归你）就**保留选中**，
    // 原因已经写在顶栏消息里了，玩家升级后可以接着点，不用重新选一次。
    if (cell >= 0) {
      if (place(ui.sel, cell)) { ui.sel = null; G.sel = null; sync(); }
      else sync();
      return;
    }
    ui.sel = null; G.sel = null; sync();
    return;
  }
  // 战斗中也能点开看属性，只是不能挪
  if (u) { select(u.uid); return; }
  if (cell >= 0) inspectCell(cell, e.clientX, e.clientY, true);
  if (ui.sel != null) { ui.sel = null; G.sel = null; sync(); }
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    ui.sel = null; G.sel = null; sync();
    return;
  }
  if (G.phase !== 'prep') return;
  if (e.code === 'Space') { e.preventDefault(); beginWave(); sync(); }
  if (e.code === 'KeyR') { document.getElementById('btnRoll').click(); }
  if (e.code === 'KeyF') { document.getElementById('btnLevel').click(); }
  if (e.code === 'KeyE' && ui.sel != null) { sell(ui.sel); ui.sel = null; G.sel = null; sync(); }
  if (e.code === 'KeyQ' && ui.sel != null) { place(ui.sel, -1); ui.sel = null; G.sel = null; sync(); }
});

// ---------------------------------------------------------------- 主循环
const COARSE = matchMedia('(pointer:coarse)').matches;
function loop(now) {
  // 触屏机：画面封顶约 40 帧。逻辑按 dt 推进（dt 会累计到下一帧），少画几帧不影响判定，却能明显降温 / 省电
  if (COARSE && now - last < 24) { requestAnimationFrame(loop); return; }
  const raw = (now - last) / 1000;
  last = now;
  const dt = Math.min(0.25, raw);
  try {
    frame(dt);
  } catch (err) {
    // 一帧出错不该让整局静悄悄卡死：记下原因继续跑
    window.__pfErr = (window.__pfErr || 0) + 1;
    window.__pfErrMsg = String((err && err.stack) || err).slice(0, 500);
    if (window.__pfErr > 60) throw err;
  }
  requestAnimationFrame(loop);
}

function frame(dt) {
  if (!window.__pfFrozen) {
    // 倍速是「这一帧多推几步」，不是把固定步长拉长 —— 拉长会改变追击/命中的判定，
    // 2× 下同一套阵容会打出不一样的战果。步长永远是 1/60，只是跑几步的问题。
    const sp = G.speed || 1;
    acc += dt * sp;
    let guard = 0;
    const cap = 5 * sp;
    while (acc >= FIXED && guard++ < cap) { update(FIXED); acc -= FIXED; }
  } else {
    acc = 0;
  }
  draw();
  updateHUD();
  sync();

  // 顶栏/底栏高度变了（窗口缩放、开始游戏）就重算棋盘可用区
  if (++bandTick % 20 === 0) {
    const b = bandRect();
    setBand(b.x, b.y, b.w, b.h);
  }

  if ((G.phase === 'over' || G.phase === 'win') && !ended) {
    ended = true;
    setTimeout(() => showEnd(), 480);
  } else if (G.phase !== 'over' && G.phase !== 'win' && ended) {
    ended = false;
  }
}

// ---------------------------------------------------------------- 装配
async function boot() {
  build();
  await init(cv);
  layout();
  const b = bandRect();
  setBand(b.x, b.y, b.w, b.h);
  const resizeGame = () => {
    const r = bandRect();
    layout();
    setBand(r.x, r.y, r.w, r.h);
    relayoutInspection();
    // Rebuild responsive portraits and the collapsed/expanded information card.
    ui.layoutKey = `${window.innerWidth}:${window.innerHeight}:${window.visualViewport?.height || 0}`;
    sync();
  };
  window.addEventListener('resize', resizeGame);
  window.addEventListener('orientationchange', () => requestAnimationFrame(resizeGame));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resizeGame);
  // 页面里的载入守护 4 秒后会把按钮改成「正在载入立绘…」，这里得把它交还回来
  document.dispatchEvent(new CustomEvent('pf:ready'));
  requestAnimationFrame((t) => { last = t; loop(t); });
}

// ------------------------------------------------------- 无头测试入口
// ?_test=1 时把状态挂出去，并给一个「自动打完一整局」的仿真入口：
// 固定步长推进，备战期自动买/升级/开战，几秒钟就能跑完十二波，调平衡不用守着屏幕。
if (/[?&]_test=1/.test(location.search)) {
  window.__pf = {
    G, TUNE, summary, update, beginWave, place, sell, reset, startRun, ui, sync, screenPos, toLogic, sfx,
    start: (diff, seed) => { if (diff) ui.diff = diff; startRun(seed); },
    // 一步决策：先把备战席摆上场，再买人（能合成的优先），人口满了就升级
    think() {
      if (G.phase !== 'prep') return;
      const fill = () => {
        for (const u of G.units.slice()) {
          if (deployed() >= G.level) break;
          if (u.cell >= 0) continue;
          const c = freeCell(u.def.role);
          if (c >= 0) place(u.uid, c);
        }
      };
      fill();
      for (let i = 0; i < G.shop.length; i++) {
        const s = G.shop[i];
        if (!s) continue;
        const d = UNITS_BY_ID[s.id];
        if (G.gold < d.cost) continue;
        const owned = G.units.filter((u) => u.id === s.id).length;
        if (owned > 0 || G.gold >= d.cost + 7 || G.units.length < 4) buy(i);
      }
      fill();
      // 装备：有钱就先补齐装备栏再装上（跟人一样，优先给场上缺槽位的）
      if (G.gold >= 14) {
        for (let i = 0; i < G.itemShop.length; i++) {
          const it = G.itemShop[i];
          if (!it) continue;
          if (G.inv.length >= INV_SIZE) break;
          if (buyItem(i)) continue;
        }
      }
      for (let k = G.inv.length - 1; k >= 0; k--) {
        const it = G.inv[k];
        const slot = it.kind === 'wheel' ? 'wheel' : 'creation';
        const host = G.units.filter((u) => u.cell >= 0 && !u[slot])
          .sort((a, b) => b.def.cost - a.def.cost)[0];
        if (host) equip(host.uid, k);
      }
      if (deployed() >= G.level && G.level < MAX_LEVEL && G.gold >= LEVEL_COST) levelUp();
      else if (G.gold >= 18 && G.level < MAX_LEVEL) levelUp();
      else if (G.gold >= 12 && G.shop.every((s) => !s || G.gold < UNITS_BY_ID[s.id].cost)) rollShop(false);
      beginWave();
    },
    // 推进到第 n 波（机器人代打），给截图/回归用
    runToWave(n) {
      let guard = 0;
      window.__pfFrozen = true;
      while (G.wave < n && G.phase !== 'over' && G.phase !== 'win' && guard++ < 60 * 60 * 25) {
        if (G.phase === 'prep') window.__pf.think();
        update(1 / 20);
      }
      window.__pfFrozen = false;
      return G.wave;
    },
    bot(seconds) {
      window.__pfFrozen = true;
      const waves = [];
      let t = 0;
      let guard = 0;
      let curWave = 0;
      let waveStart = 0;
      let coreAt = G.core;
      while (t < seconds && G.phase !== 'over' && G.phase !== 'win' && guard++ < 60 * 60 * 40) {
        if (G.phase === 'prep') window.__pf.think();
        update(1 / 20);
        t += 1 / 20;
        // 波次推进（或整局结束）时把这一波的时长与掉血记下来：平衡调参全靠这张表
        if (G.wave !== curWave || G.phase === 'over' || G.phase === 'win') {
          waves.push({
            w: G.wave, dur: Math.round((t - waveStart) * 10) / 10, lost: coreAt - G.core,
            lv: G.level, dep: deployed(), units: G.units.length,
          });
          curWave = G.wave; waveStart = t; coreAt = G.core;
          if (G.phase === 'over' || G.phase === 'win') break;
        }
      }
      window.__pfFrozen = false;
      return { phase: G.phase, wave: G.wave, core: G.core, t: Math.round(t), waves, sum: summary() };
    },
  };
}

boot();

// 登录了本站账号就把这个游戏的存档同步到云端（js/gamecloud.js）
startGameCloud('protocol');
