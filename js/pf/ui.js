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
  summary, UNITS_BY_ID, buyItem, equip, unequip, itemDef, placeBench,
} from './engine.js';
import { ART, SHEET, REALM_ART } from './gen.js';
import {
  WAVES, REALM_NAME, REALM_COLOR, ROLE_NAME, ROLE_COLOR, ROLE_SHORT, REALM_ICON, ROLE_ICON,
  FAC_ICON, GMK_ICON, TRAIT_KINDS,
  STAR_NAME, LEVEL_COST, REROLL_COST, MAX_LEVEL, BENCH_SIZE, creditsAt, nextTier,
  ITEM_REROLL, INV_SIZE, TERRAIN, WHEELS, CREATIONS, ENEMY,
} from './defs.js';
import { sfx } from './audio.js';


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

// 界域 / 职阶 / 组织 / 流派的小图标：
//   界域用官方徽记（构建时内联成 data URI，见 build.mjs 的 genProtocol），
//   其余三类是内联 SVG path（不用字体符号，跨平台不会缺字），颜色跟着 --c 走。
// 同一套在商店卡、备战席、信息卡、羁绊条里复用，不额外请求图片。
const svgIcon = (d, cls = '') =>
  `<svg class="${cls}" viewBox="0 0 12 12" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="${d}"/></svg>`;

// 官方徽记是彩色的，不能像 SVG 那样靠 currentColor 上色，所以走 background-image。
// 没有内联图（构建时 assets/protocol/realm-*.webp 缺失）就退回原来的单色 SVG。
function realmIcon(r, cls = '') {
  const uri = REALM_ART && REALM_ART[r];
  if (uri) return `<i class="ri${cls ? ' ' + cls : ''}" style="background-image:url(${uri})"></i>`;
  return svgIcon(REALM_ICON[r] || '', cls);
}
const traitIcon = (t, cls = '') => {
  if (t.kind === 'realm') return realmIcon(t.key, cls);
  const path = t.kind === 'fac' ? FAC_ICON[t.key] : t.kind === 'gmk' ? GMK_ICON[t.key] : ROLE_ICON[t.key];
  return svgIcon(path || '', cls);
};
const realmTag = (r) =>
  `<em class="tg" style="--c:${realmCol(r)}">${realmIcon(r)}<u>${REALM_NAME[r] || ''}</u></em>`;
const roleTag = (r, short) =>
  `<em class="tg" style="--c:${roleCol(r)}">${svgIcon(ROLE_ICON[r] || '')}<u>${short ? ROLE_SHORT[r] || '' : ROLE_NAME[r] || ''}</u></em>`;


function itemTone(it) {
  const d = itemDef(it);
  if (!d) return '#8a93a8';
  return it.kind === 'wheel' ? realmCol(d.realm) : '#b06bd9';
}

// 画布可用区：顶栏下沿到商店上沿之间那条带子。
// 宽屏（>=1000px）左边有一块信息面板，画布从它右边开始，棋盘才会落在剩余区域的正中。
export function bandRect() {
  const hud = $('hud').getBoundingClientRect();
  const bottom = $('bottom').getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight;
  const pad = W >= 1000 ? 232 : 0;
  const y = hud.bottom + 6;
  // 横屏时底栏竖起来贴右边（见 protocol.html 的 landscape 块）：棋盘让出这一列，高度不再被底栏吃掉
  const column = bottom.top < y + 24;
  const right = column ? bottom.left - 6 : W;
  // 底栏退到左侧面板右边时，面板自己的可用高度只需躲开左下角的「方向」小钮
  const sideBottom = bottom.left > 50 && !column ? 52 : Math.round(H - bottom.top);
  document.documentElement.style.setProperty('--botH', sideBottom + 'px');
  const h = column ? H - y - 6 : bottom.top - y - 6;
  return { x: pad, y, w: Math.max(200, right - pad), h: Math.max(200, h) };
}


// ---------------------------------------------------------------- 装配
export function build() {
  const click = () => sfx.play('click');
  $('btnRoll').onclick = () => {
    if (ui.tab === 'unit') { if (rollShop(false)) G.msg = '刷新了商店'; }
    else if (rollItemShop(false)) G.msg = '刷新了命轮商店';
    sync();
  };
  $('btnLevel').onclick = () => { levelUp(); sync(); };
  $('btnFight').onclick = () => { beginWave(); sync(); };
  $('btnHelp').onclick = () => { sfx.play('tab'); $('ovHelp').hidden = false; };
  $('btnHelpClose').onclick = () => { click(); $('ovHelp').hidden = true; };
  // 声音开关：状态存 localStorage（audio.js 里），按钮本身也把「关」写清楚
  const mute = $('btnMute');
  if (mute) {
    const paint = () => {
      mute.textContent = sfx.on ? '♪' : '✕';
      mute.classList.toggle('off', !sfx.on);
      mute.title = sfx.on ? '声音：开（点一下静音）' : '声音：关（点一下打开）';
    };
    paint();
    mute.onclick = () => { sfx.setMuted(sfx.on); paint(); if (sfx.on) sfx.play('click'); };
  }
  // 战斗倍速：只改「每帧推几步」，不改固定步长，2× 下的战果和 1× 是同一套规则。
  // 选择存 localStorage，下次进来还是上次的速度。
  const spd = $('btnSpeed');
  if (spd) {
    try { G.speed = Number(localStorage.getItem('zjtt:pf:speed')) === 2 ? 2 : 1; } catch { /* 隐私模式 */ }
    const paint = () => {
      spd.textContent = G.speed + '×';
      spd.classList.toggle('on', G.speed > 1);
      spd.title = G.speed > 1 ? '战斗速度：2×（点一下变回 1×）' : '战斗速度：1×（点一下变 2×）';
    };
    paint();
    spd.onclick = () => {
      G.speed = G.speed > 1 ? 1 : 2;
      try { localStorage.setItem('zjtt:pf:speed', String(G.speed)); } catch { /* 同上 */ }
      paint();
      sfx.play('tab');
      G.msg = G.speed > 1 ? '战斗速度 2×' : '战斗速度 1×';
    };
  }
  document.querySelectorAll('.diff button').forEach((b) => {
    b.onclick = () => { setDiff(b.dataset.d); sfx.play('tab'); };
  });
  document.querySelectorAll('.tab').forEach((b) => {
    b.onclick = () => { setTab(b.dataset.tab); sfx.play('tab'); };
  });
  $('btnEqClear').onclick = () => { click(); ui.item = null; G.selItem = null; sync(); };
  setDiff('normal');
  setTab('unit');
  $('btnStart').onclick = () => { sfx.play('click'); startRun(); };
  $('btnAgain').onclick = () => { sfx.play('click'); $('ovEnd').hidden = true; startRun(); };
  $('btnMenu').onclick = () => {
    click();
    $('ovEnd').hidden = true;
    document.querySelector('.app').classList.remove('playing');
    $('ovStart').hidden = false;
    ui.sel = null; G.sel = null; ui.item = null; G.selItem = null;
    sfx.stopMusic();          // 回到开始界面就别留着结算曲
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

// 同名同星的现有数量：商店卡片上用它画「还差几个升星」的三个点。
// 只数 1 星 —— 商店卖的都是 1 星，合成也只在同星之间发生。
function sameStar(id, star) {
  let n = 0;
  for (const u of G.units) if (u.id === id && u.star === star) n++;
  return n;
}

function renderShop() {
  const box = $('shop');
  if (ui.tab === 'unit') {
    // 店里同名卡各有几张：两张同名 + 手上有一张 = 一次买两张就升星，
    // 这种「店里自己凑够了」的情况也该亮，不然玩家得自己数。
    const inShop = {};
    for (const s of G.shop) if (s) inShop[s.id] = (inShop[s.id] || 0) + 1;
    box.innerHTML = G.shop.map((s, i) => {
      if (!s) return `<div class="scard empty"><span>已买走</span></div>`;
      const d = UNITS_BY_ID[s.id];
      const can = G.gold >= d.cost;
      const own = sameStar(s.id, 1);
      const mine = inShop[s.id] || 0;
      // own>=2：买下这一张立刻三合一；own+店里≥3：把店里的同名一起买也能合。
      // 两种都算「可以合成」，但前者更该喊出来，所以给两档样式。
      const instant = own >= 2;
      const pair = !instant && own + mine >= 3;
      const cls = instant ? ' mergeable' : pair ? ' pairing' : '';
      const badge = instant
        ? `<span class="mb">升星</span>`
        : pair ? `<span class="mb alt">同名×${mine}</span>` : '';
      const tip = `${d.n} · ${d.ult.name} · ${d.cost} 金`
        + (own ? `（已有 ${own} 个一星${instant ? '，再买一个升 2 星' : ''}）` : '');
      return `<button class="scard c${d.cost}${can ? '' : ' poor'}${cls}" data-i="${i}" title="${tip}">
        ${badge}
        ${own ? `<span class="prog">${[0, 1, 2].map((k) => `<i class="${k < own ? 'on' : ''}"></i>`).join('')}</span>` : ''}
        ${portrait(d.id, 42)}
        <b>${d.n}</b>
        <span class="chips">${realmTag(d.realm)}${roleTag(d.role, true)}</span>
        <span class="price"><i>◈</i>${d.cost}</span>
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
    return `<button class="scard item c${d.cost}${can ? '' : ' poor'}" data-ii="${i}" title="${d.n}：${d.text}（${d.cost} 金）">
      <i class="sig" style="--c:${col}">${itemSigil(s.kind)}</i>
      <b>${d.n}</b>
      <span class="eff">${d.text}</span>
      <span class="price"><i>◈</i>${d.cost}</span>
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
      const d = ui.item == null ? null : itemDef(G.inv[i]);
      G.msg = ui.item == null ? '取消装备' : `「${d ? d.n : ''}」${d ? d.text : ''}。选一个唤醒体装上（点立绘或备战席）`;
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
    if (!u) {
      // 空槽也能点：手上有场上的人时，点它就是把这个人收回备战席
      html += `<button class="bslot" data-b="${i}"></button>`;
      continue;
    }
    const sel = ui.sel === u.uid ? ' on' : '';
    const armed = ui.sel != null && ui.sel !== u.uid ? ' swap' : '';
    html += `<button class="bslot has${sel}${armed}" data-u="${u.uid}" data-b="${i}"
      style="--rc:${realmCol(u.def.realm)}" title="${u.def.n} ${STAR_NAME[u.star]}（点它选中，选中后再点别的格可以换位）">
      ${portrait(u.id, 32)}
      <b class="star">${STAR_NAME[u.star]}</b>
      ${u.wheel || u.creation ? `<em class="eqdot"></em>` : ''}
    </button>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('.bslot[data-u]').forEach((el) => {
    el.onclick = () => { tapBench(Number(el.dataset.u)); };
  });
  box.querySelectorAll('.bslot[data-b]:not([data-u])').forEach((el) => {
    el.onclick = () => { tapBenchSlot(Number(el.dataset.b)); };
  });
}

// 点备战席上的头像：手里有装备就装；否则如果正选着别的单位就是「换位」，
// 没选就是选中它自己。
function tapBench(uid) {
  if (ui.item != null) { tapUnit(uid); return; }
  if (ui.sel != null && ui.sel !== uid) {
    const idx = G.bench.findIndex((x) => x && x.uid === uid);
    if (idx < 0) { select(uid); return; }
    if (placeBench(ui.sel, idx)) { ui.sel = null; G.sel = null; }
    sync();
    return;
  }
  select(uid);
}

// 点备战席的空格：选中的单位直接收进来（场上 / 另一个席位的都行）
function tapBenchSlot(idx) {
  if (ui.sel == null) { if (G.msg !== '点一个唤醒体，再点这里收进来') G.msg = '点一个唤醒体，再点这里收进来'; return; }
  if (placeBench(ui.sel, idx)) { ui.sel = null; G.sel = null; }
  sync();
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
  const same = ui.sel === uid;
  ui.sel = same ? null : uid;
  G.sel = ui.sel;
  sfx.play(same ? 'cancel' : 'select');
  sync();
}

// 羁绊：一共 20 条（4 界域 + 3 职阶 + 7 组织 + 6 流派），平铺会看不清，所以左侧面板
// 按「界域 / 职阶 / 组织 / 流派」分四组；顶栏那条窄，只放已经亮起来的。
function traitChip(t) {
  const d = t.def;
  const on = t.active >= 0;
  const nextNeed = t.next != null ? t.next : null;
  return `<div class="tr${on ? ' on' : ''}" style="--c:${d.color}">
    <i class="tri">${traitIcon(d)}</i><b>${d.n}</b><span>${t.n}</span>${nextNeed ? `<em>/${nextNeed}</em>` : ''}
    <div class="trtip">
      ${d.stepsText.map((s, i) => `<u class="${i <= t.active ? 'on' : ''}">${d.steps[i]} 人 · ${s}</u>`).join('')}
    </div>
  </div>`;
}

function renderTraits() {
  const list = traitList();
  const box = $('traits');
  const side = $('sdTraits');
  if (!list.length) {
    if (box) box.innerHTML = `<span class="traithint">把唤醒体摆上场，界域 / 职阶 / 组织 / 流派羁绊会亮起来</span>`;
    if (side) side.innerHTML = `<span class="traithint">还没有上场的人</span>`;
    return;
  }
  const live = list.filter((t) => t.active >= 0);
  if (box) {
    box.innerHTML = live.length
      ? live.map(traitChip).join('')
      : `<span class="traithint">把唤醒体摆上场，界域 / 职阶 / 组织 / 流派羁绊会亮起来</span>`;
  }
  if (side) {
    // 左侧面板位置宽裕，四组全列（没人的组不占位置）
    side.innerHTML = TRAIT_KINDS.map(([kind, label]) => {
      const items = list.filter((t) => t.def.kind === kind);
      if (!items.length) return '';
      const lit = items.filter((t) => t.active >= 0).length;
      return `<div class="tgrp"><h5>${label}<em>${lit}/${items.length}</em></h5>
        <div class="tlist">${items.map(traitChip).join('')}</div></div>`;
    }).join('');
  }
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
  // 竖屏手机：信息卡默认缩成一行，免得盖住棋盘没法挪棋子；点「详情」再展开
  const narrow = window.matchMedia && window.matchMedia('(max-width:520px), (orientation:landscape) and (max-height:520px)').matches;
  const compact = narrow && !ui.cardOpen;
  card.classList.toggle('compact', compact);
  card.classList.toggle('narrow', narrow);
  const d = u.def;
  const eqText = [u.wheel, u.creation].filter(Boolean)
    .map((x) => `<p class="eqline"><b>${x.n}</b>${x.text || ''}</p>`).join('');
  const armed = ui.item != null ? G.inv[ui.item] : null;
  card.innerHTML = `
    <button class="x" id="cardX">×</button>
    <button class="more" id="cardMore">${compact ? '详情' : '收起'}</button>
    <div class="ch">
      ${portrait(d.id, 50)}
      <div>
        <h4>${d.n}<em>${STAR_NAME[u.star]}</em></h4>
        <p class="tags">${realmTag(d.realm)}${roleTag(d.role)}<span class="costb">${d.cost} 费</span></p>
        <p class="mini">生命 <b>${u.hpMax}</b> · 攻击 <b>${Math.round(u.atk)}</b>${u.wheel || u.creation ? ` · ${[u.wheel, u.creation].filter(Boolean).map((x) => x.n).join(' / ')}` : ''}</p>
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
  $('cardMore').onclick = () => { ui.cardOpen = !ui.cardOpen; renderCard(); };
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
function showBanner(main, sub, col) {
  const b = $('banner');
  if (!b) return;
  $('bannerMain').textContent = main;
  $('bannerSub').textContent = sub || '';
  // 横幅按事件上色：合成是金色、六种大招各有各的颜色（engine 的 ULT_FX 定的）
  b.style.setProperty('--bc', col || 'var(--gold)');
  b.classList.add('show');
  bannerT = performance.now();
}

function tickBanner() {
  const b = $('banner');
  if (!b || !b.classList.contains('show')) return;
  if (performance.now() - bannerT > 1900) b.classList.remove('show');
}

// ---------------------------------------------------------------- 高频数字
// 顶栏与左侧面板显示同一批数字：宽屏看面板，窄屏看顶栏胶囊。
const TWIN = { sWave: 'sdWave', sGold: 'sdGold', sPop: 'sdPop', sCore: 'sdCore' };

// 商店左手的金币池：余额、利息档位、以及加减时飘一下的 +n / -n。
// 每帧都跑，但只有值变了才动 DOM（否则一串 set 会把布局抖出噪点）。
function tickPurse() {
  const L = ui.last;
  if (L.goldVal === G.gold) return;
  const prev = L.goldVal;
  L.goldVal = G.gold;
  const b = $('sGold2');
  if (b) b.textContent = G.gold;
  const purse = $('purse');
  if (purse) purse.classList.toggle('low', G.gold < 2);
  // 利息：每存 10 金 +1，最多 5 —— 写在数字下面的小字里，存钱时看得见收益在涨
  const interest = Math.min(5, Math.floor(G.gold / 10));
  // 利息升一档响一下：存钱这件事在备战期没有别的反馈，全靠这声和数字
  if (L.intLv != null && interest > L.intLv) sfx.play('interest');
  L.intLv = interest;
  const txt = interest > 0 ? `息 +${interest}` : '金';
  const em = $('purseInt');
  if (em && L.interest !== txt) { L.interest = txt; em.textContent = txt; }
  const int2 = $('sdInt');
  if (int2 && L.interest2 !== txt) { L.interest2 = txt; int2.textContent = interest > 0 ? `利息 +${interest}` : '无利息'; }
  if (prev === undefined || !purse) return;      // 开局第一次不计动画
  const d = G.gold - prev;
  if (!d) return;
  const fly = document.createElement('i');
  fly.className = 'd ' + (d > 0 ? 'up' : 'down');
  fly.textContent = (d > 0 ? '+' : '') + d;
  purse.appendChild(fly);
  setTimeout(() => fly.remove(), 900);
  purse.classList.remove('pop');
  void purse.offsetWidth;              // 强制重排，动画才能重播
  purse.classList.add('pop');
}

// 下一波的构成（同一批计划里的怪按种类归并）。备战期把「会从哪来、来的是什么」
// 提前写给玩家，是自走棋里最该明说的信息。
function waveComposition() {
  const m = new Map();
  for (const p of G.plan || []) m.set(p.key, (m.get(p.key) || 0) + 1);
  return [...m.entries()].map(([k, n]) => `${(ENEMY[k] || {}).n || k}×${n}`).join('  ');
}

// 左侧面板的「下一波来敌」：按通道分组列出种类与数量。
// 棋盘上的紫色虚线已经画了路线，这里是同一份计划的文字版。
function tickSideNext() {
  const box = $('sdNext');
  if (!box) return;
  const sig = (G.plan || []).map((p) => `${p.key}${p.row}`).join(',') + '|' + G.wave + G.phase;
  if (ui.last.planSig === sig) return;
  ui.last.planSig = sig;
  const use = G.phase === 'prep' ? (G.plan || []) : (G.spawnQ || []);
  if (!use.length) { box.innerHTML = '<li style="color:var(--dim)">—</li>'; return; }
  const byRow = new Map();
  for (const p of use) {
    if (!byRow.has(p.row)) byRow.set(p.row, new Map());
    const m = byRow.get(p.row);
    m.set(p.key, (m.get(p.key) || 0) + 1);
  }
  const COL = { 普通: '#b06bd9', 精英: '#e8695f', Boss: '#ff5c5c' };
  let html = '';
  for (const [row, m] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    for (const [k, n] of m) {
      const def = ENEMY[k] || {};
      html += `<li><span class="lane">通道${row + 1}</span><i style="--c:${COL[def.cls] || '#b06bd9'}"></i>
        ${def.n || k}<b>×${n}</b></li>`;
    }
  }
  box.innerHTML = html;
}

export function updateHUD() {
  const L = ui.last;
  const set = (id, v) => {
    if (L[id] === v) return;
    L[id] = v;
    const el = $(id);
    if (el) el.textContent = v;
    const t = TWIN[id];
    if (t) { const te = $(t); if (te) te.textContent = v; }
  };
  const shown = Math.min(G.wave + (G.phase === 'fight' ? 0 : 1), WAVES.length);
  set('sWave', `${shown}/${WAVES.length}`);
  set('sGold', String(G.gold));
  set('sPop', `${deployed()}/${G.level}`);
  set('sCore', `${G.core}`);
  tickPurse();
  const pct = Math.round((G.core / G.coreMax) * 100);
  if (L.corePct !== pct) {
    L.corePct = pct;
    const f = $('coreFill');
    if (f) {
      f.style.width = pct + '%';
      f.classList.toggle('low', pct <= 34);
    }
    const f2 = $('sdCoreFill');
    if (f2) {
      f2.style.width = pct + '%';
      f2.classList.toggle('low', pct <= 34);
    }
    const c2 = $('sdCore');
    if (c2) c2.textContent = `${G.core}/${G.coreMax}`;
  }
  // 左侧面板的波名：战斗中写这一波，备战期写下一波
  const nameTxt = G.phase === 'fight'
    ? `第 ${G.wave} 波 · ${(WAVES[G.wave - 1] || {}).n || ''}`
    : `下一波 · ${(WAVES[Math.min(G.wave, WAVES.length - 1)] || {}).n || ''}`;
  if (L.sdName !== nameTxt) { L.sdName = nameTxt; const e = $('sdName'); if (e) e.textContent = nameTxt; }
  tickSideNext();
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
  // 备战期把下一波的「来的是什么、几只」也写出来：路线画在棋盘上，构成写在这里
  const comp = G.phase === 'prep' ? waveComposition() : '';
  const nextTxt = G.phase === 'fight'
    ? `第 ${G.wave} 波 · 场上 ${G.enemies.length + G.spawnQ.length}`
    : `下一波 · ${nxt.n}${comp ? ` ｜ ${comp}` : ''}`;
  if (L.nextTxt !== nextTxt) { L.nextTxt = nextTxt; $('sNext').textContent = nextTxt; }

  // 开战横幅：从备战切到战斗的那一帧弹一下，比只改数字更像「进入下一波」
  if (L.phase !== G.phase) {
    if (G.phase === 'fight' && WAVES[G.wave - 1]) {
      const cfg = WAVES[G.wave - 1];
      const last = G.wave >= WAVES.length;
      showBanner(cfg.n,
        last ? '最终波 · 守住就赢' : (cfg.boss ? '首领波 · 撑住就有奖励' : `第 ${G.wave} 波`),
        last ? '#ffd76a' : (cfg.boss ? '#ff6b6b' : undefined));
    }
    L.phase = G.phase;
    // 背景乐跟着阶段与进度走：备战慢 / 前六波紧 / 第七波起加密 / 首领更低更重 /
    // 末波最高张力 / 结算按胜负收尾 —— 一局里听得出来自己在第几段。
    const want = (() => {
      if (G.phase === 'win') return 'endWin';
      if (G.phase === 'over') return 'endLose';
      if (G.phase !== 'fight') return G.phase === 'prep' ? 'prep' : null;
      const cfg = WAVES[G.wave - 1] || {};
      if (G.wave >= WAVES.length) return 'final';
      if (cfg.boss) return 'boss';
      return G.wave >= 7 ? 'drive' : 'fight';
    })();
    if (L.bgm !== want) {
      L.bgm = want;
      if (want) sfx.music(want); else sfx.stopMusic();
    }
  }
  // 大招横幅：engine 把最近一次大招写在 G.lastUlt 上（带自增序号与配色），只弹一次
  if (G.lastUlt && L.ultSeq !== G.lastUlt.seq) {
    if (G.lastUlt.t < 0.3) {
      showBanner(G.lastUlt.name, `${G.lastUlt.n} · 狂气爆发`, G.lastUlt.col);
      L.ultSeq = G.lastUlt.seq;
    }
  }
  // 升星横幅：这是「合成之后到底给了什么」唯一说得清的地方 ——
  // 以前奖励只写在底部那行小字里，玩家合完只看到星级变了，以为什么都没给。
  if (G.lastMerge && L.mergeSeq !== G.lastMerge.seq) {
    if (G.lastMerge.t < 0.6) {
      const m = G.lastMerge;
      showBanner(`${m.n} 升到 ${m.star} 星`, m.extra || '属性大幅提升', '#e3b341');
      L.mergeSeq = m.seq;
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
  // 八项数字一行行落下来时各响一下刻度音：结算页只看静态卡片会像「刚才白打了」
  for (let i = 0; i < 8; i++) setTimeout(() => sfx.play('tally'), 110 + i * 75);
  // 结算曲直接在这里起：这一帧之后主循环就停了，别指望 updateHUD 来切
  sfx.music(sm.win ? 'endWin' : 'endLose');
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
  // 个人中心要显示「打到第几波」：忘却协议原来什么都不存，这里补一条只增不减的纪录。
  // wave 用「守住/清过的波数」，首次通关另外记 win 次数。
  try {
    const raw = JSON.parse(localStorage.getItem('zjtt:pf:best') || 'null') || {};
    const prev = {
      wave: Number(raw.wave) || 0, score: Number(raw.score) || 0,
      wins: Number(raw.wins) || 0, runs: Number(raw.runs) || 0,
    };
    const next = {
      wave: Math.max(prev.wave, sm.win ? sm.total : sm.cleared),
      score: Math.max(prev.score, sm.score || 0),
      wins: prev.wins + (sm.win ? 1 : 0),
      runs: prev.runs + 1,
    };
    localStorage.setItem('zjtt:pf:best', JSON.stringify(next));
  } catch { /* 忽略 */ }
  $('ovEnd').hidden = false;
}

// 帮助里地形图例用（由页面内联脚本调用也行，这里导出给需要的地方）
export const TERRAIN_LIST = Object.entries(TERRAIN).map(([k, v]) => ({ k, ...v }));
export const ITEM_POOL = { WHEELS, CREATIONS };
