// 《忘却协议》界面层：顶栏、商店（唤醒体 / 命轮·造物两个页签）、装备栏、备战席、
// 羁绊条、单位卡、遮罩层。
//
// 界面全是叠在 canvas 上的 DOM：中文排版、滚动、按钮反馈交给浏览器，
// 只有每帧变的数字（金币、核心、波次）走高频更新，并且都做了「值没变就不动 DOM」。
//
// 头像 / 商店立绘不额外请求：全部按帧矩形从图集里用 background-position 切。
// 命轮与造物没有立绘，用「色环 + 一个汉字」当图标（命 / 造），按界域上色。

import {
  G, buy, sell, levelUp, rollShop, rollItemShop, beginWave, reset, traitList, deployed,
  summary, UNITS_BY_ID, buyItem, equip, unequip, itemDef,
} from './engine.js';
import { ART, SHEET } from './gen.js';
import {
  WAVES, REALM_NAME, REALM_COLOR, ROLE_NAME, ROLE_COLOR, ROLE_SHORT,
  STAR_NAME, LEVEL_COST, REROLL_COST, MAX_LEVEL, BENCH_SIZE, creditsAt, nextTier,
  ITEM_REROLL, INV_SIZE, TERRAIN, WHEELS, CREATIONS,
} from './defs.js';

const $ = (id) => document.getElementById(id);

export const ui = {
  diff: 'normal',
  tab: 'unit',        // unit | item
  sel: null,          // 选中的单位 uid
  item: null,         // 选中待装备的装备（装备栏下标）
  last: {},
};

// ---------------------------------------------------------------- 图集取图
function cropStyle(rect, size) {
  if (!rect) return '';
  const s = size / rect[3];
  return [
    `background-image:url(${SHEET});`,
    `background-size:${ART.w * s}px ${ART.h * s}px;`,
    `background-position:${-rect[0] * s}px ${-rect[1] * s}px;`,
    `width:${size}px;height:${size}px;`,
  ].join('');
}

function portrait(id, size, round) {
  const rec = ART.anims[id] && ART.anims[id].head;
  return `<i class="pt${round ? ' round' : ''}" style="${cropStyle(rec, size)}"></i>`;
}

const realmCol = (r) => REALM_COLOR[r] || '#8a93a8';
const roleCol = (r) => ROLE_COLOR[r] || '#8a93a8';
const itemKindName = (k) => (k === 'wheel' ? '命轮' : '造物');
const itemSigil = (k) => (k === 'wheel' ? '命' : '造');

function itemTone(it) {
  const d = itemDef(it);
  if (!d) return '#8a93a8';
  return it.kind === 'wheel' ? realmCol(d.realm) : '#b06bd9';
}

// 画布可用区：顶栏下沿到商店上沿之间那条带子
export function bandRect() {
  const hud = $('hud').getBoundingClientRect();
  const bottom = $('bottom').getBoundingClientRect();
  const y = hud.bottom + 6;
  const h = bottom.top - y - 6;
  return { x: 0, y, w: window.innerWidth, h: Math.max(200, h) };
}

// ---------------------------------------------------------------- 装配
export function build() {
  $('btnRoll').onclick = () => {
    if (ui.tab === 'unit') { if (rollShop(false)) G.msg = '刷新了商店'; }
    else if (rollItemShop(false)) G.msg = '刷新了命轮商店';
    sync();
  };
  $('btnLevel').onclick = () => { levelUp(); sync(); };
  $('btnFight').onclick = () => { beginWave(); sync(); };
  $('btnHelp').onclick = () => { $('ovHelp').hidden = false; };
  $('btnHelpClose').onclick = () => { $('ovHelp').hidden = true; };
  document.querySelectorAll('.diff button').forEach((b) => {
    b.onclick = () => setDiff(b.dataset.d);
  });
  document.querySelectorAll('.tab').forEach((b) => {
    b.onclick = () => setTab(b.dataset.tab);
  });
  $('btnEqClear').onclick = () => { ui.item = null; G.selItem = null; sync(); };
  setDiff('normal');
  setTab('unit');
  $('btnStart').onclick = () => startRun();
  $('btnAgain').onclick = () => { $('ovEnd').hidden = true; startRun(); };
  $('btnMenu').onclick = () => {
    $('ovEnd').hidden = true;
    document.querySelector('.app').classList.remove('playing');
    $('ovStart').hidden = false;
    ui.sel = null; G.sel = null; ui.item = null; G.selItem = null;
  };
}

export function setTab(t) {
  ui.tab = t;
  document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  lastSig = '';
  sync();
}

export function setDiff(d) {
  ui.diff = d;
  document.querySelectorAll('.diff button').forEach((x) => x.classList.toggle('on', x.dataset.d === d));
  $('diffTip').textContent = d === 'hard'
    ? '癫狂：敌人生命 +50%、攻击 +110%，银芯 ×1.6'
    : '标准：按原数值打十二波';
}

export function startRun(seed) {
  reset(seed != null ? seed : ((Date.now() ^ (Math.random() * 1e9)) >>> 0));
  // 难度只动敌人和结算倍率，唤醒体本身不削，手感才一致
  G.mod = ui.diff === 'hard' ? { hp: 1.5, atk: 2.1, credit: 1.6 } : { hp: 1, atk: 1, credit: 1 };
  G.phase = 'prep';
  ui.sel = null;
  G.sel = null;
  ui.item = null;
  G.selItem = null;
  ui.last = {};
  lastSig = '';
  $('ovStart').hidden = true;
  document.querySelector('.app').classList.add('playing');
  sync();
}

// ---------------------------------------------------------------- 同步
let lastSig = '';
export function sync() {
  const sig = [
    G.shop.map((s) => (s ? s.id : '-')).join(','),
    G.itemShop.map((s) => (s ? s.kind + s.id : '-')).join(','),
    G.inv.map((s) => s.kind + s.id).join('|'),
    G.units.map((u) => [u.uid, u.star, u.cell, u.bench,
      u.wheel ? u.wheel.id : '', u.creation ? u.creation.id : ''].join(':')).join('|'),
    G.level, ui.sel, ui.item, ui.tab, G.phase, G.wave,
  ].join('#');
  if (sig === lastSig) return;
  lastSig = sig;
  renderShop();
  renderInv();
  renderBench();
  renderTraits();
  renderCard();
}

function renderShop() {
  const box = $('shop');
  if (ui.tab === 'unit') {
    box.innerHTML = G.shop.map((s, i) => {
      if (!s) return `<div class="scard empty"><span>已买走</span></div>`;
      const d = UNITS_BY_ID[s.id];
      const can = G.gold >= d.cost;
      return `<button class="scard c${d.cost}${can ? '' : ' poor'}" data-i="${i}" title="${d.n} · ${d.ult.name}">
        <span class="cost">${d.cost}</span>
        ${portrait(d.id, 42)}
        <b>${d.n}</b>
        <span class="chips"><i style="color:${realmCol(d.realm)}">${REALM_NAME[d.realm]}</i><i style="color:${roleCol(d.role)}">${ROLE_SHORT[d.role]}</i></span>
      </button>`;
    }).join('');
    box.querySelectorAll('.scard[data-i]').forEach((el) => {
      el.onclick = () => { buy(Number(el.dataset.i)); sync(); };
    });
    return;
  }
  // 命轮 / 造物页签
  box.innerHTML = G.itemShop.map((s, i) => {
    if (!s) return `<div class="scard empty"><span>已买走</span></div>`;
    const d = itemDef(s);
    if (!d) return `<div class="scard empty"><span>—</span></div>`;
    const can = G.gold >= d.cost;
    const col = s.kind === 'wheel' ? realmCol(d.realm) : '#b06bd9';
    return `<button class="scard item c${d.cost}${can ? '' : ' poor'}" data-ii="${i}" title="${d.n}：${d.text}">
      <span class="cost">${d.cost}</span>
      <i class="sig" style="--c:${col}">${itemSigil(s.kind)}</i>
      <b>${d.n}</b>
      <span class="chips"><i style="color:${col}">${itemKindName(s.kind)}</i></span>
    </button>`;
  }).join('');
  // 装备一次只摆 3 件：补两个占位，卡片宽度才跟唤醒体页签对齐
  for (let i = G.itemShop.length; i < 5; i++) box.insertAdjacentHTML('beforeend', `<div class="scard pad"></div>`);
  box.querySelectorAll('.scard[data-ii]').forEach((el) => {
    el.onclick = () => { buyItem(Number(el.dataset.ii)); sync(); };
  });
}

function renderInv() {
  const box = $('inv');
  let html = '';
  for (let i = 0; i < INV_SIZE; i++) {
    const it = G.inv[i];
    if (!it) { html += `<div class="islot"></div>`; continue; }
    const d = itemDef(it);
    const on = ui.item === i ? ' on' : '';
    html += `<button class="islot has${on}" data-ei="${i}" title="${d ? d.n + '：' + d.text : ''}"
      style="--c:${itemTone(it)}">${d ? itemSigil(it.kind) : '?'}</button>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('.islot[data-ei]').forEach((el) => {
    el.onclick = () => {
      const i = Number(el.dataset.ei);
      ui.item = ui.item === i ? null : i;
      G.selItem = ui.item;
      G.msg = ui.item == null ? '取消装备' : '选一个唤醒体装上（点立绘或备战席）';
      sync();
    };
  });
  const bar = $('eqbar');
  if (bar) bar.classList.toggle('arming', ui.item != null);
}

function renderBench() {
  const box = $('bench');
  let html = '';
  for (let i = 0; i < BENCH_SIZE; i++) {
    const u = G.bench[i];
    if (!u) { html += `<div class="bslot"></div>`; continue; }
    const sel = ui.sel === u.uid ? ' on' : '';
    html += `<button class="bslot has${sel}" data-u="${u.uid}" title="${u.def.n}">
      ${portrait(u.id, 30)}
      <b>${STAR_NAME[u.star]}</b>
      ${u.wheel || u.creation ? `<em class="eqdot"></em>` : ''}
    </button>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('.bslot[data-u]').forEach((el) => {
    el.onclick = () => { tapUnit(Number(el.dataset.u)); };
  });
}

// 点一个唤醒体：手上拿着装备就装，否则选中看属性
export function tapUnit(uid) {
  if (ui.item != null) {
    if (equip(uid, ui.item)) { ui.item = null; G.selItem = null; }
    sync();
    return;
  }
  select(uid);
}

export function select(uid) {
  ui.sel = ui.sel === uid ? null : uid;
  G.sel = ui.sel;
  sync();
}

function renderTraits() {
  const list = traitList();
  const box = $('traits');
  if (!list.length) {
    box.innerHTML = `<span class="traithint">把唤醒体摆上场，界域 / 职阶羁绊会亮起来</span>`;
    return;
  }
  box.innerHTML = list.map((t) => {
    const d = t.def;
    const on = t.active >= 0;
    const nextNeed = t.next != null ? t.next : null;
    return `<div class="tr${on ? ' on' : ''}" style="--c:${d.color}">
      <b>${d.n}</b><span>${t.n}</span>${nextNeed ? `<em>/${nextNeed}</em>` : ''}
      <div class="trtip">
        ${d.stepsText.map((s, i) => `<u class="${i <= t.active ? 'on' : ''}">${d.steps[i]} 人 · ${s}</u>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function eqRow(u) {
  const one = (slot, label) => {
    const it = u[slot];
    if (!it) {
      return `<button class="eq empty" data-slot="${slot}"><em>${label}</em><span>空</span></button>`;
    }
    const col = slot === 'wheel' ? realmCol(it.realm) : '#b06bd9';
    return `<button class="eq has" data-slot="${slot}" title="点击卸下" style="--c:${col}">
      <em>${label}</em><span>${it.n}</span></button>`;
  };
  return `<div class="eqs">${one('wheel', '命轮')}${one('creation', '造物')}</div>`;
}

function renderCard() {
  const card = $('unitCard');
  const u = ui.sel != null ? G.units.find((x) => x.uid === ui.sel) : null;
  if (!u) { card.hidden = true; return; }
  card.hidden = false;
  const d = u.def;
  const eqText = [u.wheel, u.creation].filter(Boolean)
    .map((x) => `<p class="eqline"><b>${x.n}</b>${x.text || ''}</p>`).join('');
  const armed = ui.item != null ? G.inv[ui.item] : null;
  card.innerHTML = `
    <button class="x" id="cardX">×</button>
    <div class="ch">
      ${portrait(d.id, 50)}
      <div>
        <h4>${d.n}<em>${STAR_NAME[u.star]}</em></h4>
        <p><span style="color:${realmCol(d.realm)}">${REALM_NAME[d.realm]}</span> · <span style="color:${roleCol(d.role)}">${ROLE_NAME[d.role]}</span> · ${d.cost} 费</p>
      </div>
    </div>
    <div class="nums">
      <span>生命 <b>${u.hpMax}</b></span><span>攻击 <b>${Math.round(u.atk)}</b></span>
      <span>攻速 <b>${u.aspd.toFixed(2)}</b></span><span>护甲 <b>${Math.round(u.armor)}</b></span>
      <span>射程 <b>${(u.range / 94).toFixed(1)} 格</b></span>
      ${u.crit > 0 ? `<span>暴击 <b>${Math.round(u.crit * 100)}%</b></span>` : ''}
    </div>
    ${eqRow(u)}
    ${eqText}
    <p class="ult"><b>${d.ult.name}</b>${d.ult.text}</p>
    ${armed
      ? `<button class="sell" id="btnEquipNow">装上「${itemDef(armed).n}」</button>`
      : G.phase === 'prep'
        ? `<button class="sell" id="btnSell2">卖出 +${d.cost * [0, 1, 3, 9][u.star]} 金</button>`
        : `<p class="hint" style="margin:2px 0 0;text-align:left">战斗中不能卖出 / 挪位 / 换装备</p>`}`;
  $('cardX').onclick = () => select(u.uid);
  const sellBtn = $('btnSell2');
  if (sellBtn) sellBtn.onclick = () => { sell(u.uid); ui.sel = null; G.sel = null; sync(); };
  const eqBtn = $('btnEquipNow');
  if (eqBtn) eqBtn.onclick = () => { if (equip(u.uid, ui.item)) { ui.item = null; G.selItem = null; } sync(); };
  card.querySelectorAll('.eq[data-slot]').forEach((el) => {
    el.onclick = () => {
      const slot = el.dataset.slot;
      if (armed) { if (equip(u.uid, ui.item)) { ui.item = null; G.selItem = null; } sync(); return; }
      if (u[slot]) { unequip(u.uid, slot); sync(); }
    };
  });
}

// ---------------------------------------------------------------- 横幅
let bannerT = 0;
function showBanner(main, sub) {
  const b = $('banner');
  if (!b) return;
  $('bannerMain').textContent = main;
  $('bannerSub').textContent = sub || '';
  b.classList.add('show');
  bannerT = performance.now();
}
function tickBanner() {
  const b = $('banner');
  if (!b || !b.classList.contains('show')) return;
  if (performance.now() - bannerT > 1900) b.classList.remove('show');
}

// ---------------------------------------------------------------- 高频数字
export function updateHUD() {
  const L = ui.last;
  const set = (id, v) => {
    if (L[id] === v) return;
    L[id] = v;
    const el = $(id);
    if (el) el.textContent = v;
  };
  const shown = Math.min(G.wave + (G.phase === 'fight' ? 0 : 1), WAVES.length);
  set('sWave', `${shown}/${WAVES.length}`);
  set('sGold', String(G.gold));
  set('sPop', `${deployed()}/${G.level}`);
  set('sCore', `${G.core}`);
  const pct = Math.round((G.core / G.coreMax) * 100);
  if (L.corePct !== pct) {
    L.corePct = pct;
    const f = $('coreFill');
    if (f) {
      f.style.width = pct + '%';
      f.classList.toggle('low', pct <= 34);
    }
  }
  const lvTxt = G.level >= MAX_LEVEL ? '人口已满' : `升级 ${LEVEL_COST}`;
  if (L.lvTxt !== lvTxt) { L.lvTxt = lvTxt; $('btnLevel').textContent = lvTxt; }
  const rollTxt = ui.tab === 'unit' ? `刷新 ${REROLL_COST}` : `刷新 ${ITEM_REROLL}`;
  if (L.rollTxt !== rollTxt) { L.rollTxt = rollTxt; $('btnRoll').textContent = rollTxt; }
  const prep = G.phase === 'prep';
  if (L.prep !== prep) {
    L.prep = prep;
    $('btnFight').disabled = !prep;
    $('btnRoll').disabled = !prep;
    $('btnLevel').disabled = !prep || G.level >= MAX_LEVEL;
    $('btnFight').textContent = G.phase === 'fight' ? '战斗中' : G.phase === 'prep' ? '开战' : '结束';
  }
  const msg = G.msg || '';
  if (L.msg !== msg) { L.msg = msg; $('msg').textContent = msg; }
  const nxt = WAVES[Math.min(G.wave, WAVES.length - 1)];
  const nextTxt = G.phase === 'fight'
    ? `第 ${G.wave} 波 · 场上 ${G.enemies.length + G.spawnQ.length}`
    : `下一波 · ${nxt.n}`;
  if (L.nextTxt !== nextTxt) { L.nextTxt = nextTxt; $('sNext').textContent = nextTxt; }

  // 开战横幅：从备战切到战斗的那一帧弹一下，比只改数字更像「进入下一波」
  if (L.phase !== G.phase) {
    if (G.phase === 'fight' && WAVES[G.wave - 1]) {
      const cfg = WAVES[G.wave - 1];
      showBanner(cfg.n, cfg.boss ? '首领波 · 撑住就有奖励' : `第 ${G.wave} 波`);
    }
    L.phase = G.phase;
  }
  // 大招横幅：engine 把最近一次大招写在 G.lastUlt 上（带自增序号），只弹一次
  if (G.lastUlt && L.ultSeq !== G.lastUlt.seq) {
    if (G.lastUlt.t < 0.3) {
      showBanner(G.lastUlt.name, `${G.lastUlt.n} · 狂气爆发`);
      L.ultSeq = G.lastUlt.seq;
    }
  }
  tickBanner();

  // 商店买不起时压暗（只在金币变化时扫一遍）
  if (L.goldFor === undefined || L.goldFor !== G.gold) {
    L.goldFor = G.gold;
    $('shop').querySelectorAll('.scard[data-i],.scard[data-ii]').forEach((el) => {
      // 卖掉的格子可能已经空了，而重新渲染要等下一次 sync —— 这里必须判空，
      // 否则每帧在这里抛错，整帧（含结算判定）都被打断，画面看着像卡死。
      const unitSlot = el.dataset.i != null ? G.shop[Number(el.dataset.i)] : null;
      const itemSlot = el.dataset.ii != null ? G.itemShop[Number(el.dataset.ii)] : null;
      let cost = 0;
      if (unitSlot) cost = UNITS_BY_ID[unitSlot.id].cost;
      else if (itemSlot) {
        const d = itemDef(itemSlot);
        cost = d ? d.cost : 0;
      } else return;
      el.classList.toggle('poor', G.gold < cost);
    });
  }
}

// ---------------------------------------------------------------- 结算
export function showEnd() {
  const sm = summary();
  const credit = Math.round(sm.credits * (G.mod ? G.mod.credit : 1));
  $('endTitle').textContent = sm.win ? '协议守住了' : '协议核心破碎';
  $('endSub').textContent = sm.win
    ? '十二波全部清完，忘却协议仍在运转。'
    : `倒在第 ${Math.min(sm.cleared + 1, sm.total)} 波，还差 ${sm.total - sm.cleared} 波。`;
  $('endStats').innerHTML = `
    <div class="es"><b>${sm.cleared}/${sm.total}</b><span>波次</span></div>
    <div class="es"><b>${sm.core}</b><span>核心</span></div>
    <div class="es"><b>${sm.kills}</b><span>击杀</span></div>
    <div class="es"><b>${sm.stars}</b><span>星级合计</span></div>
    <div class="es"><b>${sm.merged}</b><span>升星次数</span></div>
    <div class="es"><b>${sm.equips}</b><span>装备</span></div>
    <div class="es"><b>${sm.score}</b><span>得分</span></div>
    <div class="es"><b>+${credit}</b><span>银芯</span></div>`;
  const nt = nextTier(sm.score);
  $('endTier').textContent = nt
    ? `再拿 ${nt[0] - sm.score} 分可换 ${nt[1]} 银芯（当前 +${credit}）`
    : '已达最高档';
  // 银芯跟其它小游戏同一个钱包 zjtt:credits；先入账再弹结算，刷掉页面也不丢
  if (credit > 0) {
    try {
      const cur = Number(localStorage.getItem('zjtt:credits') || 0) || 0;
      localStorage.setItem('zjtt:credits', String(cur + credit));
      document.dispatchEvent(new CustomEvent('zjtt:credits', { detail: { add: credit } }));
    } catch { /* 隐私模式写不进去就算了 */ }
  }
  $('ovEnd').hidden = false;
}

// 帮助里地形图例用（由页面内联脚本调用也行，这里导出给需要的地方）
export const TERRAIN_LIST = Object.entries(TERRAIN).map(([k, v]) => ({ k, ...v }));
export const ITEM_POOL = { WHEELS, CREATIONS };
