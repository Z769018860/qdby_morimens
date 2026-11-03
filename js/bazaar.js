// 《大巴扎：银钥》界面层：布阵、集市、十格战场、自动战斗的表现。
// 规则本身全在 js/bazaar-core.js（node 里能跑，scripts/bazaar-sim.mjs 就是拿它做平衡的），
// 这里只负责把状态画出来、把点击/拖动翻译成动作。
//
// 图片全部走雪碧图（assets/bazaar/sheet-*.webp）：一千多张图各发一个请求，
// 在本站「每个请求 1~2 秒」的边缘上开局就要等半分钟，所以拼四张大图 + 百分比定位。
// 唤醒体的待机立绘是单独的动图文件（每个约 14KB），用到谁才请求谁。

import * as C from './bazaar-core.js';
import { TUNING, HEROES, WHEELS, PACTS, DIFFS, SHEETS, ARCH_ZH, RANK_ZH, AURA_ZH } from './bazaar-data.js';
import { sfx, toggle as sfxToggle, isOn as sfxIsOn } from './bazaar-sfx.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('zh-CN');
const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));

const BEST_KEY = 'zjtt:bazaar:best';
const STATS_KEY = 'zjtt:bazaar:v1';

let run = null;
let fight = null;
let speed = 1;
let timer = 0;
let last = 0;
let playing = false;
let sheetId = 0;
const pick = { diff: 'normal', heroes: [], pact: null, realm: '', focus: null };

// ---------------------------------------------------------------- 雪碧图
const SHEET_CACHE = {};
function sheetOf(kind) {
  if (!SHEET_CACHE[kind]) SHEET_CACHE[kind] = SHEETS[kind];
  return SHEET_CACHE[kind];
}
function sprStyle(spr) {
  if (!spr) return '';
  const [kind, idx] = String(spr).split(':');
  const s = sheetOf(kind);
  if (!s) return '';
  const i = Number(idx) || 0;
  const col = i % s.cols, row = Math.floor(i / s.cols);
  const px = s.cols > 1 ? (col / (s.cols - 1)) * 100 : 0;
  const py = s.rows > 1 ? (row / (s.rows - 1)) * 100 : 0;
  return `background-image:url(${s.src}?v=${ASSET_V});background-size:${s.cols * 100}% ${s.rows * 100}%;background-position:${px}% ${py}%`;
}
const sp = (spr, cls = '') => `<span class="sp ${cls}" style="${sprStyle(spr)}"></span>`;
function paintSp(el, spr) {
  if (!el) return;
  el.setAttribute('style', sprStyle(spr));
}

// 待机立绘：每个唤醒体一个动图文件（约 14KB），用到谁才下谁
const REALM_VAR = { CHAOS: '--chaos', CARO: '--caro', AEQUOR: '--aqua', ULTRA: '--ultra' };
const REALM_CLS = { CHAOS: 'CH', CARO: 'CA', AEQUOR: 'AE', ULTRA: 'UL' };
// 待机立绘：唤醒体是 GIF 动图（循环播放），主播彩蛋只有一张静图（.webp）
// 资源地址带版本号：图集 / 立绘换过之后，线上和浏览器缓存里的旧文件不会和新数据错位（图标名字对不上就是这么来的）
const ASSET_V = '3.1.6';
const idleUrl = (h) => `assets/bazaar/idle/${h.id}.${h.egg ? 'webp' : 'gif'}?v=${ASSET_V}`;
const artHTML = (h) => (h ? `<img src="${idleUrl(h)}" alt="${h.n}" decoding="async">` : '');
function setRealm(h, els) {
  const v = h ? `var(${REALM_VAR[h.realm] || '--accent'})` : 'var(--accent)';
  for (const el of els) if (el) el.style.setProperty('--realm', v);
}
function preload(h) {
  if (!h) return;
  const im = new Image();
  im.src = idleUrl(h);
}

// ---------------------------------------------------------------- 小工具
let toastTimer = 0;
function toast(msg) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
}

function wheelPassive(w) {
  const v = w.v || 0;
  const map = {
    CRIT_RATE: `暴击率 +${Math.round(v * 100)}%`,
    CRIT_DMG: `暴击伤害 +${Math.round(v * 100)}%`,
    DMG_AMP: `命轮伤害 +${Math.round(v * 100)}%`,
    KEYFLARE_REGEN: `每拍回血 +${v}`,
    SIGIL_YIELD: `每场 +${v} 金`,
    REALM_MASTERY: `每段伤害 +${Math.round(v * 10) / 10}`,
    DEATH_RESISTANCE: `生命上限 +${Math.round(v)}`,
    ALIEMUS_REGEN: `每 4 拍 +${Math.round(v)} 护盾`,
  };
  return map[w.main] || w.mainZh;
}
const wheelFire = (w) => w.op.map((o) => C.opText(o, 1)).join('；');

// ---------------------------------------------------------------- 选人（只选难度 + 密契；唤醒体靠开局金币在集市里买）
function renderSetup() {
  $('diffPick').innerHTML = DIFFS.map((d) => `
    <button class="diff ${pick.diff === d.id ? 'on' : ''}" type="button" data-diff="${d.id}">
      <b>${d.n}</b><span>${d.days} 天 · ${d.sane} 理智</span>
    </button>`).join('');
  $('diffPick').onclick = (e) => {
    const el = e.target.closest('[data-diff]');
    if (!el) return;
    pick.diff = el.dataset.diff;
    renderSetup();
  };
  const diff = DIFFS.find((d) => d.id === pick.diff) || DIFFS[0];
  $('diffTip').textContent = diff.desc;
  if ($('introGold')) $('introGold').textContent = TUNING.startGold;

  $('pactPick').innerHTML = PACTS.map((p) => `
    <button class="pcard ${pick.pact === p.id ? 'on' : ''}" type="button" data-pact="${p.id}">
      ${sp(p.spr)}<span class="pw"><span class="pn">${p.n}</span><span class="pt">${p.txt}</span></span>
    </button>`).join('');
  $('pactPick').onclick = (e) => {
    const el = e.target.closest('[data-pact]');
    if (!el) return;
    pick.pact = pick.pact === el.dataset.pact ? null : el.dataset.pact;
    renderSetup();
  };

  $('btnStart').disabled = false;
  $('btnStart').textContent = '开张';
}

function startRun() {
  run = C.newRun({ seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, pactId: pick.pact, diffId: pick.diff });
  $('setup').classList.remove('on');
  $('app').hidden = false;
  // 开局战场是空的（靠金币去集市招人）， realm 先用默认强调色，招到第一个人再跟着变
  setRealm(null, [$('app')]);
  renderAll();
  toast(`第 1 天：${run.foeId ? C.foeOf(run.foeId).n : ''} · 去集市招个唤醒体`);
}

// ---------------------------------------------------------------- 集市
function renderHud() {
  $('hDay').textContent = `第 ${Math.min(run.day, run.totalDays)} 天`;
  $('hDayMax').textContent = `/ ${run.totalDays}`;
  $('hDiff').textContent = run.diff.n;
  $('hSane').innerHTML = Array.from({ length: run.diff.sane }, (_, i) => `<i class="${i < run.sane ? '' : 'off'}">❤</i>`).join('');
  $('hGold').textContent = fmt(run.gold);
}

function skillText(st, s) {
  return s.op.map((op) => {
    const isDmg = op.k === 'dmg' || op.k === 'poison' || op.k === 'burn' || op.k === 'str';
    return C.opText(op, isDmg ? st.atk : st.sup);
  }).filter(Boolean).join('；');
}

function renderFoe() {
  const st = C.foeStats(run);
  const foe = st.foe;
  $('foeBar').innerHTML = `
    ${sp(foe.spr, 'fp')}
    <div class="fi">
      <div class="fn"><b>${foe.n}</b><em class="${foe.rank}">${RANK_ZH[foe.rank] || '普通'}</em></div>
      <div class="fhp"><span>生命 ${fmt(st.maxHp)}</span><div class="bar"><i style="width:100%"></i></div></div>
      <div class="fsk">${foe.skills.map((s) => `<span title="${skillText(st, s)}">${s.n} · ${s.cd} 拍</span>`).join('')}</div>
    </div>`;
  // 点今天这只怪：看它几拍放什么技能、掉多少血
  $('foeBar').onclick = () => openDetail('foe', run.foeId);
}

function renderTerrain() {
  const t = C.terrainOf(run.terrain);
  $('terBar').innerHTML = `<b>地形 · ${t.n}</b><span>${t.txt}</span>`;
}

function unitHTML(u, inBattle) {
  const d = u.def;
  // 角上的环 = 还差几拍出手。数字比进度条直观，环本身给「快到了」的感觉。
  // 战斗单位带 timer/cd（会跳动），布局单位没有 —— 没有就按满 cd 算。
  const cd = u.cd != null ? u.cd : d.cd;
  const timer = u.timer != null ? u.timer : 0;
  const left = inBattle ? Math.max(0, cd - timer) : d.cd;
  return `<div class="unit r-${REALM_CLS[d.realm]}" data-uid="${u.uid}" style="--at:${u.start};--len:${u.len};--realm:var(${REALM_VAR[d.realm]})">
    <img src="${idleUrl(d)}" alt="${d.n}" decoding="async">
    <span class="ucd${inBattle && left <= 1 ? ' now' : ''}" id="${inBattle ? 'b' : ''}ucd${u.uid}" style="--p:${inBattle ? Math.round((timer / cd) * 100) : 0}"><i>${left}</i></span>
    <span class="ut">${d.n}</span>
    <span class="um">产 ${d.gen}${d.egg ? ' · 主播' : ''}</span>
    <span class="ucf" id="${inBattle ? 'b' : ''}ucf${u.uid}" style="height:${inBattle ? Math.min(100, Math.round((timer / cd) * 100)) : 0}%"></span>
    <span class="ub"><i id="${inBattle ? 'b' : ''}ub${u.uid}" style="width:${inBattle ? Math.round((timer / cd) * 100) : 0}%"></i></span>
  </div>`;
}

function renderTrack(host, inBattle) {
  const lay = C.layoutOf(run);
  // 战斗页：战斗单位有 timer/cd 但没 start/len，把布局的位置补进去再渲染。
  const units = inBattle && fight
    ? fight.units.map((u) => {
        const rec = lay.find((x) => x.uid === u.uid);
        return rec ? { ...u, start: rec.start, len: rec.len } : u;
      })
    : lay;
  const used = lay.reduce((s, u) => s + u.len, 0);
  const cells = Array.from({ length: TUNING.fieldSlots }, (_, i) => `<i class="cell ${i < used ? 'on' : ''}"></i>`).join('');
  host.innerHTML = `<div class="cells">${cells}</div><div class="units">${units.map((u) => unitHTML(u, inBattle)).join('')}</div>`
    + (units.length ? '' : '<div class="empty">战场空着 —— 打开集市招个唤醒体</div>');
  if (!inBattle) bindTrack(host);
}

function renderCpu() {
  const plan = C.planOf(run);
  $('cpuNow').textContent = plan.cap;
  $('cpuCap').textContent = ' 算力上限';
  $('cpuFill').style.width = '100%';
  const gap = plan.gen - plan.need;
  $('cpuRate').innerHTML = `产 ${plan.gen} · 耗 ${plan.need} <em class="${gap >= 0 ? 'ok' : ''}">${gap >= 0 ? '+' : ''}${Math.round(gap * 10) / 10}</em>`;
}

function renderWheels() {
  const parts = ['<span class="lab">命轮</span>'];
  for (const w of run.wheels) {
    const d = C.wheelOf(w.key);
    parts.push(`<button class="wh" type="button" data-wid="${w.uid}" title="${wheelFire(d)}">
      ${sp(d.spr)}<span class="wi"><b>${d.n}</b><i>耗 ${d.cpu} · ${d.wcd} 拍</i></span>
      <span class="wp"><i></i></span></button>`);
  }
  for (let i = run.wheels.length; i < TUNING.wheelSlots; i++) parts.push('<span class="wh empty">空槽</span>');
  $('wheels').innerHTML = parts.join('');
  $('wheels').onclick = (e) => {
    const el = e.target.closest('[data-wid]');
    if (el) openDetail('wheel', Number(el.dataset.wid));
  };
}

function renderRelics() {
  const parts = ['<span class="lab">造物</span>'];
  for (const r of run.relics) {
    const d = C.itemOf(r.key);
    parts.push(`<button class="rs" type="button" data-rid="${r.uid}" title="${C.itemText(d)}">
      ${sp(d.spr)}<b>${C.modText(d.m.k, d.m.v)}</b></button>`);
  }
  if (!run.relics.length) parts.push('<span class="rs empty">还没造物</span>');
  $('relics').innerHTML = parts.join('');
  $('relics').onclick = (e) => {
    const el = e.target.closest('[data-rid]');
    if (el) openDetail('relic', Number(el.dataset.rid));
  };
}

function offerText(o, def) {
  if (o.kind === 'hero') return `占 ${def.slots} 格 · 每 ${def.cd} 拍产 ${def.gen} 算力`;
  if (o.kind === 'wheel') return `耗 ${def.cpu} 算力 · ${wheelFire(def)}（${def.wcd} 拍）`;
  return C.itemText(def);
}

function renderShop() {
  const s = $('shop');
  if (!run.shop.length) { s.innerHTML = '<div class="tipbox">今天的摊位收完了，开战吧。</div>'; return; }
  s.innerHTML = run.shop.map((o, i) => {
    const def = C.defOf(o);
    const can = C.canBuy(run, i);
    const rar = o.kind === 'relic' ? def.r : def.r || 'SSR';
    // 英雄卡带上界域色：图标描一圈对应色，不同唤醒体一眼分得开（和「每个唤醒体一个专属音色」呼应）
    const rstyle = (o.kind === 'hero' && REALM_VAR[def.realm]) ? ` style="--realm:var(${REALM_VAR[def.realm]})"` : '';
    // 图标那一块单独可点：看详情，不买。手机上一张卡就是「买」，误触的代价太大。
    return `<button class="card k-${o.kind} r-${rar} ${o.sold ? 'sold' : ''} ${!can && !o.sold ? 'poor' : ''}" type="button" data-offer="${i}"${rstyle}>
      <span class="ci" data-info="${i}">${sp(def.spr)}</span>
      ${o.kind === 'hero' ? `<span class="ca" style="background-image:url(${idleUrl(def)})"></span>` : ''}
      <span class="cp ${run.gold < o.price ? 'no' : ''}">${o.price}</span>
      <span class="cn">${def.n}</span>
      <span class="ct">${offerText(o, def)}</span>
      <span class="r">${o.kind === 'hero' ? (def.egg ? '主播' : '唤醒体') : o.kind === 'wheel' ? '命轮' : (ARCH_ZH[def.arch] || def.r)}</span>
    </button>`;
  }).join('');
  $('shopHint').textContent = `还剩 ${run.shop.filter((x) => !x.sold).length} 个摊位`;
}

function renderShopClick() {
  $('shop').onclick = (e) => {
    // 先看图标：点图标 = 看详情（详情里也能买），点其它地方 = 直接买
    const info = e.target.closest('[data-info]');
    if (info) {
      const oi = Number(info.dataset.info);
      const of = run.shop[oi];
      if (of) openDetail(of.kind, of.key, { offer: oi });
      return;
    }
    const el = e.target.closest('[data-offer]');
    if (!el) return;
    const i = Number(el.dataset.offer);
    const o = run.shop[i];
    if (!o || o.sold) return;
    if (!C.canBuy(run, i)) {
      sfx.error();
      if (run.gold < o.price) toast('金币不够');
      else if (o.kind === 'hero') toast(`战场只剩 ${C.freeSlots(run)} 格，装不下他`);
      else if (o.kind === 'wheel') toast('命轮最多戴三条，先卖一条');
      else toast('造物槽满了，先卖一件');
      return;
    }
    C.buy(run, i);
    sfx.buy();
    renderAll();
  };
}

function renderTrail() {
  const total = run.totalDays;
  const done = run.history;
  $('trail').innerHTML = Array.from({ length: total }, (_, i) => {
    const h = done[i];
    const cls = h ? (h.win ? 'win' : 'lose') : (i === run.day - 1 ? 'now' : '');
    return `<i class="dot ${cls}">${h ? (h.win ? '✓' : '✗') : i + 1}</i>`;
  }).join('');
}

function renderAll() {
  if (!run) return;
  renderHud();
  renderFoe();
  renderTerrain();
  renderTrack($('track'), false);
  renderCpu();
  renderWheels();
  renderRelics();
  renderShop();
  renderTrail();
  $('btnCore').textContent = `扩容 ${C.coreCostOf(run)}`;
  $('btnCore').disabled = run.gold < C.coreCostOf(run);
  const cost = TUNING.rerollCost + run.rerolls;
  const free = run.pact.k === 'freereroll' && run.freeReroll < 1;
  $('btnReroll').textContent = free ? '刷新 免费' : `刷新 ${cost}`;
  $('btnReroll').disabled = !free && run.gold < cost;
  // 战场上一个人都没有时，开战没意义（startFight 也会拦），先把按钮置灰提示去集市
  $('btnFight').disabled = run.squad.length === 0;
}

// ---------------------------------------------------------------- 拖动排位
let drag = null;

function bindTrack(host) {
  host.onpointerdown = (e) => {
    const el = e.target.closest('.unit');
    if (!el || !run) return;
    e.preventDefault();
    const lay = C.layoutOf(run);
    const r = host.getBoundingClientRect();
    drag = { uid: Number(el.dataset.uid), el, pid: e.pointerId, x0: e.clientX, dx: 0, moved: false, w: r.width, left: r.left, lay };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器 */ }
    el.classList.add('dragging');
  };
}

window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dx = e.clientX - drag.x0;
  if (Math.abs(drag.dx) > 5) drag.moved = true;
  if (drag.moved) drag.el.style.transform = `translateX(${drag.dx}px)`;
});

window.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  // 先把指针捕获放掉再重渲染：元素被换掉时捕获还挂在旧节点上，后续点击会被吞掉
  try { d.el.releasePointerCapture(d.pid); } catch (err) { /* 已经释放 */ }
  d.el.classList.remove('dragging');
  d.el.style.transform = '';
  if (!d.moved) { openDetail('hero', d.uid); return; }
  const px = d.x0 + d.dx;
  let idx = 0;
  for (const u of d.lay) {
    if (u.uid === d.uid) continue;
    const c = d.left + ((u.start + u.len / 2) / TUNING.fieldSlots) * d.w;
    if (px > c) idx += 1;
  }
  if (C.moveHero(run, d.uid, idx)) { renderAll(); toast('站好位了'); }
});
window.addEventListener('pointercancel', () => {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  drag.el.style.transform = '';
  drag = null;
});

// ---------------------------------------------------------------- 详情
// 详情面板：三条信息源共用一块 DOM —— 队伍里的东西（可卖）、集市里的东西（可买）、战斗中的东西（只看）
function sheetHero(d) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n;
  $('sMeta').textContent = `${d.realmZh} · ${d.type} · 占 ${d.slots} 格 · 每 ${d.cd} 拍产 ${d.gen}`;
  $('sTxt').innerHTML = [
    `<b>${d.txt}</b>`,
    `光环：${d.auraTxt}（只喂左右相邻的两家）`,
    `本命：${d.fate.n}　${C.modText(d.fate.k, d.fate.v)}`,
    `本命命轮：${(C.wheelOf(d.wheel) || {}).n || '—'}`,
  ].join('<br>');
  $('sArt').innerHTML = artHTML(d);
}
function sheetWheel(d, native) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n + (native ? '（本命）' : '');
  $('sMeta').textContent = `命轮 · 耗 ${d.cpu} 算力 · ${d.wcd} 拍一次`;
  $('sTxt').innerHTML = [
    `<b>${wheelFire(d)}</b>`,
    `主词条：${wheelPassive(d)}`,
    d.perk ? `<em>${d.perk.txt}</em>` : '',
    '算力不够就会卡在「等算力」，先把产出跟上。',
  ].filter(Boolean).join('<br>');
}
function sheetRelic(d) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n;
  $('sMeta').textContent = `造物 · ${d.r}`;
  $('sTxt').innerHTML = `<b>${C.itemText(d)}</b><br>造物不占出手，只要装在身上就一直生效。`;
}
// 怪物详情：点今天的对手 / 战斗页那只怪，看它掉什么血、几拍放什么技能（数值按当天缩放）
function sheetFoe(d, st) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n;
  $('sMeta').textContent = `怪物 · ${RANK_ZH[d.rank] || '普通'} · 生命 ${fmt(st.maxHp)}`;
  const sk = (d.skills || []).map((s) => `<b>${s.n}</b>：${skillText(st, s)}（${s.cd} 拍一次）`);
  $('sTxt').innerHTML = [
    st.boss ? '<em>首领：血厚、技能重，先把输出堆起来再打。</em>'
      : st.elite ? '<em>精英：比普通怪多一手，别硬顶。</em>' : '',
    sk.length ? sk.join('<br>') : '没有特殊技能，纯靠普通攻击磨血。',
  ].filter(Boolean).join('<br>');
  $('sArt').innerHTML = '';
}

// 打开方式二：own = uid（队伍 / 战场上的），offer = 集市第 i 个摊位（可以在这里直接买）
function openDetail(kind, id, opt) {
  // 怪物：不在队伍里，走单独一条（只能看，不能卖）
  if (kind === 'foe') {
    const fd = C.foeOf(id);
    if (!fd) return;
    sheetFoe(fd, C.foeStats(run));
    $('sSell').textContent = '知道了';
    $('sSell').disabled = false;
    $('sSell').onclick = closeSheet;
    $('sheet').classList.add('on');
    sheetAt = Date.now();
    sfx.open();
    return;
  }
  const isOffer = opt && typeof opt.offer === 'number';
  const o = isOffer ? null : C.owned(run, id);
  if (!isOffer && !o) return;
  const offer = isOffer ? run.shop[opt.offer] : null;
  if (isOffer && !offer) return;
  sheetId = isOffer ? opt.offer : id;
  $('sArt').innerHTML = '';
  const own = !!o;

  if (kind === 'hero') {
    const d = own ? o.def : C.heroOf(offer.key);
    sheetHero(d);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者战场装不下'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 上场`);
      };
    } else {
      const back = C.sellPrice('hero', d);
      $('sSell').textContent = `移出队伍 +${back}`;
      $('sSell').disabled = run.squad.length <= 1;
      $('sSell').onclick = () => {
        if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); toast(`腾出 ${d.slots} 格，+${back} 金`); }
        else { sfx.error(); toast('至少留一个人守摊'); }
      };
    }
  } else if (kind === 'wheel') {
    const d = own ? o.def : C.wheelOf(offer.key);
    sheetWheel(d, own ? o.rec.native : false);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者三条命轮已满'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 上膛`);
      };
    } else {
      const back = C.sellPrice('wheel', d);
      $('sSell').textContent = o.rec.native ? '本命，卖不了' : `卖出 +${back}`;
      $('sSell').disabled = !!o.rec.native;
      $('sSell').onclick = () => { if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); } };
    }
  } else {
    const d = own ? o.def : C.itemOf(offer.key);
    sheetRelic(d);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者四个造物槽满了'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 已装好`);
      };
    } else {
      const back = C.sellPrice('relic', d);
      $('sSell').textContent = `卖出 +${back}`;
      $('sSell').disabled = false;
      $('sSell').onclick = () => { if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); } };
    }
  }
  $('sheet').classList.add('on');
  sheetAt = Date.now();
  sfx.open();
}

let sheetAt = 0;
function closeSheet() {
  const el = $('sheet');
  if (!el.classList.contains('on')) return;
  el.classList.remove('on');
  $('sSell').disabled = false;
  if (Date.now() - sheetAt > 120) sfx.close();
}

// ---------------------------------------------------------------- 战斗
function startFight() {
  if (!run.squad.length) { toast('战场上一个人都没有'); return; }
  if (!run.wheels.length) { toast('没有命轮就打不出伤害，先去集市买一条'); return; }
  fight = C.createFight(run);
  closeSheet();
  sfx.start();
  setRealm(C.heroOf(run.squad[0].key), [$('battle')]);
  $('battle').classList.add('on');
  paintFight();
  playing = true;
  speed = 1;
  $('btnSpeed').textContent = '×1';
  last = performance.now();
  timer = 0;
  requestAnimationFrame(loop);
}

function paintFight() {
  const f = fight;
  $('bFoeImg').setAttribute('style', sprStyle(f.foe.spr));
  $('bFoeName').innerHTML = `${f.foe.n}<em class="${f.foe.rank}">${RANK_ZH[f.foe.rank] || '普通'}</em>`;
  $('bFoeHp').style.width = '100%';
  $('bFoeHpTxt').textContent = `${fmt(f.e.maxHp)} / ${fmt(f.e.maxHp)}`;
  $('bFoeSkills').innerHTML = f.e.skills.map((s, i) => `
    <span class="skill" id="sk${i}" title="${skillText(C.foeStats(run), s)}">${s.n}<i id="skb${i}"></i></span>`).join('');
  // 点战斗页这只怪，看它的技能详情（跟集市页同一块面板）
  const bf = $('bFoe');
  if (bf) bf.onclick = () => openDetail('foe', f.foe.id);
  renderTrack($('bTrack'), true);
  $('bTrack').onclick = (e) => {
    const el = e.target.closest('.unit');
    if (el) openDetail('hero', Number(el.dataset.uid));
  };
  $('bWheels').innerHTML = ['<span class="lab">命轮</span>'].concat(f.wheels.map((w) => `
    <span class="wh" data-bw="${w.uid}" title="${wheelFire(w.def)}">
      ${sp(w.def.spr)}<span class="wi"><b>${w.def.n}</b><i id="wst${w.uid}">耗 ${w.cost} · ${w.wcd} 拍</i></span>
      <span class="wp"><i id="wp${w.uid}"></i></span>
    </span>`)).join('');
  $('bWheels').onclick = (e) => {
    const el = e.target.closest('[data-bw]');
    if (el) openDetail('wheel', Number(el.dataset.bw));
  };
  paintBars();
  resetLog(`地形 · ${f.ter.n}：${f.ter.txt}`);
  const plan = C.planOf(run);
  pushLog(`我方 ${f.units.length} 名：每轮共 +${plan.gen} 算力，上限 ${f.cpuCap}`, '', '·');
  pushLog(`对面 ${f.foe.n}：${fmt(f.e.maxHp)} 血，${f.e.skills.map((s) => s.n).join(' / ')}`, '', '·');
  pushLog(`命轮 ${f.wheels.length} 条：${f.wheels.map((w) => `${w.def.n}（耗 ${w.cost} · ${w.wcd} 拍）`).join('、')}`, '', '·');
}

function dotText(o) {
  const a = [];
  if (o.poisonT > 0) a.push(`毒 ${fmt(o.poison)}`);
  if (o.burnT > 0) a.push(`烧 ${fmt(o.burn)}`);
  if (o.vulnT > 0) a.push(`易伤 ${Math.round(o.vuln * 100)}%`);
  if (o.weakT > 0) a.push(`削弱 ${Math.round(o.weak * 100)}%`);
  return a.join(' · ');
}

function paintBars() {
  const f = fight;
  $('bFoeHp').style.width = pct(Math.max(0, f.e.hp), f.e.maxHp) + '%';
  $('bFoeHpTxt').textContent = `${fmt(Math.max(0, f.e.hp))} / ${fmt(f.e.maxHp)}`;
  $('bFoeShield').textContent = f.e.shield > 0 ? `盾 ${fmt(f.e.shield)}` : '';
  $('bFoeDot').textContent = dotText(f.e);
  $('bMyHp').style.width = pct(Math.max(0, f.p.hp), f.p.maxHp) + '%';
  $('bMyHpTxt').textContent = `${fmt(Math.max(0, f.p.hp))}/${fmt(f.p.maxHp)}`;
  $('bMyDot').textContent = [f.p.shield > 0 ? `盾 ${fmt(f.p.shield)}` : '', dotText(f.p)].filter(Boolean).join(' · ');
  // 算力
  $('bCpuNow').textContent = Math.floor(f.cpu);
  $('bCpuCap').textContent = `/${f.cpuCap}`;
  $('bCpuFill').style.width = pct(f.cpu, f.cpuCap) + '%';
  $('bCpuRate').textContent = `产 ${f.cpuGain || 0} · 剩 ${f.cpuCap - Math.floor(f.cpu)} 空间`;
  const ls = $('logSum');
  if (ls) ls.textContent = `第 ${Math.min(f.t, TUNING.beats)} / ${TUNING.beats} 拍`;
  for (const u of f.units) {
    const el = $(`bub${u.uid}`);   // 战斗页的单位 id 带 b 前缀：棋盘页那一份同样的单位在底下，不加前缀 $() 会先命中底下那份，战斗页的条就永远不动
    if (el) {
      // 条在一拍的时间里匀速走向「下一拍」的位置，不是一拍跳一格；出手后归零那一下不做过渡
      const to = Math.min(100, pct(u.timer + 1, u.cd));
      const prev = parseFloat(el.dataset.p || '0');
      const reset = pct(u.timer, u.cd) < prev - 0.5;
      el.style.transition = reset ? 'none' : `width ${Math.round(TUNING.beatMs / speed)}ms linear`;
      el.style.width = (reset ? pct(u.timer, u.cd) : to) + '%';
      el.dataset.p = String(reset ? pct(u.timer, u.cd) : to);
    }
    const cf = $(`bucf${u.uid}`);
    if (cf) {
      // 技能 CD：界域色从脚底一路漫到头顶，满了就出手，出手后落回脚底
      const to = Math.min(100, pct(u.timer + 1, u.cd));
      const prev = parseFloat(cf.dataset.p || '0');
      const reset = pct(u.timer, u.cd) < prev - 0.5;
      cf.style.transition = reset ? 'none' : `height ${Math.round(TUNING.beatMs / speed)}ms linear`;
      cf.style.height = (reset ? pct(u.timer, u.cd) : to) + '%';
      cf.dataset.p = String(reset ? pct(u.timer, u.cd) : to);
    }
    const ring = $(`bucd${u.uid}`);
    if (ring) {
      const left = Math.max(0, u.cd - u.timer);
      ring.style.setProperty('--p', String(Math.round(pct(u.timer, u.cd))));
      const num = ring.firstElementChild;
      if (num && num.textContent !== String(left)) num.textContent = left;
      ring.classList.toggle('now', left <= 1);
    }
  }
  for (const w of f.wheels) {
    const el = $(`wp${w.uid}`);
    if (el) el.style.width = pct(w.timer, w.wcd) + '%';
    const st = $(`wst${w.uid}`);
    if (st) st.textContent = w.waiting ? '等算力' : `耗 ${w.cost} · ${w.wcd} 拍`;
    const card = document.querySelector(`[data-bw="${w.uid}"]`);
    if (card) {
      card.classList.toggle('wait', w.waiting);
      card.classList.toggle('ready', !w.waiting && w.timer >= w.wcd - 0.01);
    }
  }
  f.e.skills.forEach((s, i) => {
    const el = $(`skb${i}`);
    if (el) el.style.width = pct(s.timer, s.cd) + '%';
  });
}

function float(side, text, color, atEl) {
  const host = atEl || (side === 'e' ? $('bFoeImg') : $('bMyHp'));
  const r0 = host.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'fx';
  el.textContent = text;
  el.style.color = color;
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.position = 'fixed';
  el.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, r0.left + r0.width / 2 - r.width / 2)) + 'px';
  el.style.top = Math.max(52, r0.top) + 'px';
  setTimeout(() => el.remove(), 720);
}

function flash(id) {
  const el = document.querySelector(`[data-uid="${id}"]`) || document.querySelector(`[data-bw="${id}"]`);
  if (!el) return;
  el.classList.remove('fire');
  void el.offsetWidth;
  el.classList.add('fire');
}

function pushLog(line, cls, lab) {
  const el = $('log');
  if (!el || !line) return;
  const d = document.createElement('div');
  d.className = 'l' + (cls ? ' ' + cls : '');
  const tag = lab != null ? lab : (fight && fight.t > 0 ? '#' + fight.t : '开局');
  d.innerHTML = `<i>${tag}</i><b>${line}</b>`;
  el.appendChild(d);
  while (el.childElementCount > 60) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

function resetLog(line) {
  const el = $('log');
  if (!el) return;
  el.innerHTML = '';
  if (line) pushLog(line);
}

function applyEvents(ev) {
  const parts = [];
  let cls = '';
  const f = fight;
  for (const e of ev) {
    if (e.k === 'dmg') {
      if (e.s === 'p') {
        float('e', `${e.crit ? '暴击 ' : ''}${fmt(e.v)}`, e.crit ? '#ffd166' : '#ff8f7a');
        if (e.src != null) flash(e.src);
        if (e.crit) sfx.crit(); else sfx.fire();
        parts.push(`${e.ter ? '地形' : '命轮'}打掉 ${fmt(e.v)} 点${e.crit ? '（暴击）' : ''}`);
        cls = 'hi';
      } else {
        float('p', `-${fmt(e.v)}`, '#e8695f');
        sfx.hit();
        parts.push(`${f.foe.n} 打掉你 ${fmt(e.v)} 点`);
        cls = 'bad';
      }
    } else if (e.k === 'cpu') {
      if (e.v > 0) {
        const el = document.querySelector(`[data-uid="${e.uid}"]`);
        if (el) float('p', `+${e.v} 算力`, '#8fb6ff', el);
        flash(e.uid);
        const bu = f.units.find((x) => x.uid === e.uid);
        if (bu && bu.def) sfx.cast(bu.def.id, bu.def.realm); else sfx.gen();
      } else if (e.waste > 0) {
        parts.push('算力满了溢出，该扩容了');
      }
    } else if (e.k === 'shield') {
      float(e.s === 'p' ? 'p' : 'e', `+盾 ${fmt(e.v)}`, '#7fb2ff');
      if (e.src != null) flash(e.src);
      sfx.shield();
      parts.push(e.s === 'p' ? `架起 ${fmt(e.v)} 点护盾` : `${f.foe.n} 架盾 ${fmt(e.v)}`);
    } else if (e.k === 'heal') {
      float(e.s === 'p' ? 'p' : 'e', `+${fmt(e.v)}`, '#6fd39a');
      sfx.heal();
      parts.push(e.s === 'p' ? `回复 ${fmt(e.v)} 点` : `${f.foe.n} 回了 ${fmt(e.v)} 点`);
    } else if (e.k === 'poison') {
      float(e.s === 'p' ? 'e' : 'p', `毒 ${fmt(e.v)}`, '#a98cff');
      if (e.src != null) flash(e.src);
      parts.push(`灌了 ${fmt(e.v)} 层中毒`);
    } else if (e.k === 'vuln') {
      float('e', `易伤 +${Math.round(e.v * 100)}%`, '#ffb36b');
      if (e.src != null) flash(e.src);
      parts.push(`对面易伤 +${Math.round(e.v * 100)}%`);
    } else if (e.k === 'weaken') {
      parts.push(`你的伤害被压了 ${Math.round(e.v * 100)}%`);
    } else if (e.k === 'str') {
      float(e.s === 'p' ? 'p' : 'e', `力 +${fmt(e.v)}`, '#ffd166');
      parts.push(e.s === 'p' ? `力量 +${fmt(e.v)}` : `${f.foe.n} 强化了 ${fmt(e.v)}`);
      if (e.s !== 'p') cls = 'bad';
    } else if (e.k === 'stun') {
      parts.push('被打断了：唤醒体和命轮都慢了一拍');
      cls = 'bad';
    } else if (e.k === 'gold') {
      parts.push(`摸走 ${fmt(e.v)} 金币`);
    } else if (e.k === 'poisonTick' || e.k === 'burnTick') {
      if (e.v >= 1) float(e.s === 'p' ? 'e' : 'p', `-${fmt(e.v)}`, e.k === 'poisonTick' ? '#a98cff' : '#ff9a5c');
    }
  }
  if (parts.length) pushLog(parts.join(' · '), cls);
  paintBars();
}

function loop(now) {
  if (!playing) return;
  const dt = Math.min(120, now - last);
  last = now;
  timer += dt * speed;
  if (timer >= TUNING.beatMs) {
    timer -= TUNING.beatMs;
    const ev = C.stepFight(fight);
    sfx.beat(fight.t);
    if (ev.length) applyEvents(ev);
    else paintBars();
    if (fight.over) { endFight(); return; }
  }
  requestAnimationFrame(loop);
}

function endFight() {
  playing = false;
  const win = fight.win;
  const timeout = fight.timeout;
  paintBars();
  pushLog(win ? (timeout ? '四十拍打满，按剩血比例算你赢' : '对面撑不住了') : (timeout ? '四十拍打满，你的血更少' : '你被打趴下了'), win ? 'hi' : 'bad');
  if (win) sfx.win(); else sfx.lose();
  setTimeout(() => {
    const gain = C.settle(run, fight);
    $('battle').classList.remove('on');
    if (run.over) { showResult(); return; }
    renderAll();
    toast(win ? `赢了：+${gain.goldGain} 金` : `输了一场，理智 ${run.sane}/${run.diff.sane}`);
  }, win ? 700 : 900);
}

function skipFight() {
  if (!fight || fight.over) return;
  let guard = 0;
  while (!fight.over && guard++ < TUNING.beats + 2) C.stepFight(fight);
  playing = false;
  endFight();
}

// ---------------------------------------------------------------- 结算
function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 无痕模式 */ }
}
// 存档摘要给 js/gamestats.js 读：只增不减的几个数
function recordStats(score) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { s = {}; }
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  const wheelsOwned = Object.assign({}, (s.wheels && typeof s.wheels === 'object') ? s.wheels : {});
  for (const w of run.wheels) wheelsOwned[w.key] = 1;
  const heroesOwned = Object.assign({}, (s.heroes && typeof s.heroes === 'object') ? s.heroes : {});
  for (const h of run.squad) heroesOwned[h.key] = 1;
  const out = {
    best: Math.max(Number(s.best) || 0, score),
    day: Math.max(Number(s.day) || 0, day),
    runs: (Number(s.runs) || 0) + 1,
    wins: (Number(s.wins) || 0) + (run.cleared ? 1 : 0),
    pacts: Object.assign({}, (s.pacts && typeof s.pacts === 'object') ? s.pacts : {}, { [run.pact.id]: 1 }),
    heroes: heroesOwned,
    wheels: wheelsOwned,
  };
  try { localStorage.setItem(STATS_KEY, JSON.stringify(out)); } catch (e) { /* 无痕模式 */ }
  // 榜单同步：本机先落盘（立刻生效），云端那条链按需加载、后台推，失败也不影响玩。
  // 只有成绩真的有变化才推，否则每局都白跑一次 PUT。
  if (score > (Number(s.best) || 0) || run.cleared || day > (Number(s.day) || 0)) {
    import('./bazaar-sync.js').then((m) => m.pushScore()).catch(() => {});
  }
}

function showResult() {
  const score = C.scoreOf(run);
  const best = Math.max(loadBest(), score);
  saveBest(best);
  recordStats(score);
  const d = run.diff;
  const lead = C.heroOf(run.squad[0].key);
  $('rTitle').textContent = run.cleared ? '摊子开到最后' : '散场';
  $('rSub').innerHTML = run.cleared
    ? `${d.n}难度 ${run.totalDays} 天走完，理智还剩 ${run.sane} 点。<br>${lead.n} 带着 ${run.squad.length} 个人收摊回家。`
    : `${d.n}难度第 ${Math.min(run.day, run.totalDays)} 天散场，理智见底。<br>${lead.n} 的摊子被人搬空了。`;
  $('rScore').textContent = fmt(score);
  $('rDays').textContent = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  $('rGold').textContent = fmt(run.gold);
  $('rBest').textContent = fmt(best);
  $('result').classList.add('on');
}

function again() {
  $('result').classList.remove('on');
  $('app').hidden = true;
  $('setup').classList.add('on');
  run = null;
  pick.pact = null;
  pick.heroes = [];
  pick.focus = null;
  renderSetup();
}

// ---------------------------------------------------------------- 榜单
// 服务端 /board 会把每个玩家云端档案里的摘要排出来（js/gamestats.js 的 digest 里有 bz 这一项）。
// 游戏页本身不引 account / auth 那两百来 KB，点开榜单才动态 import 一次：
// 断了 / 没登录 / 后端没起来，都只影响这一屏，不影响玩。
let boardLoading = false;
function paintBoard(g) {
  const listEl = $('bListB');
  const items = (g && g.items) || [];
  const mine = loadBest();
  $('bNote').innerHTML = items.length
    ? `共 ${items.length} 位摊主上榜 · 每局结束自动同步一次（服务端缓存 3 分钟）`
    : '还没有人上榜。登录后打一局，成绩会跟着云端档案走。';
  if (!items.length) {
    listEl.innerHTML = `<li class="bempty">${mine > 0 ? `你的最好成绩 ${fmt(mine)} 分，登录后就能上榜` : '还没有人上榜'}</li>`;
    return;
  }
  listEl.innerHTML = items.map((it, i) => `
    <li>
      <span class="rk">${i + 1}</span>
      <span class="nm">${it.name}${it.sub ? `<small>${it.sub}</small>` : ''}</span>
      <span class="sc">${fmt(it.score)}<small>${it.unit || '分'}</small></span>
    </li>`).join('') + (mine > 0
    ? `<li class="me"><span class="rk">你</span><span class="nm">本机最好成绩<small>登录后随云端档案同步</small></span><span class="sc">${fmt(mine)}<small>分</small></span></li>`
    : '');
}
function openBoard() {
  $('board').classList.add('on');
  sfx.open();
  if (boardLoading) return;
  boardLoading = true;
  $('bListB').innerHTML = '<li class="bempty">正在连线…</li>';
  import('./bazaar-sync.js')
    .then((m) => m.fetchBoard())
    .then((g) => paintBoard(g))
    .catch(() => {
      $('bNote').textContent = '榜单连不上（离线 / 后端没起来）。本机成绩照样记。';
      $('bListB').innerHTML = loadBest() > 0
        ? `<li class="me"><span class="rk">你</span><span class="nm">本机最好成绩</span><span class="sc">${fmt(loadBest())}<small>分</small></span></li>`
        : '<li class="bempty">还没有本机成绩</li>';
    })
    .then(() => { boardLoading = false; });
}

// ---------------------------------------------------------------- 绑定
$('btnReroll').onclick = () => {
  if (!C.rollShop(run)) { sfx.error(); toast('金币不够刷新'); return; }
  sfx.tap();
  renderAll();
};
$('btnCore').onclick = () => {
  if (!C.expandCore(run)) { sfx.error(); toast('金币不够扩容'); return; }
  sfx.coin();
  renderAll();
  toast(`算力上限 +${TUNING.coreGain}`);
};
$('btnFight').onclick = startFight;
$('btnSpeed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  $('btnSpeed').textContent = 'x' + speed;
  sfx.tap();
};
$('btnSkip').onclick = skipFight;
$('btnAgain').onclick = again;
$('btnStart').onclick = startRun;
$('btnHelp').onclick = () => { $('help').classList.add('on'); sfx.open(); };
$('setupHelp').onclick = () => { $('help').classList.add('on'); sfx.open(); };
$('helpClose').onclick = () => { $('help').classList.remove('on'); sfx.close(); };
$('btnBoard').onclick = openBoard;
$('btnBoardB').onclick = openBoard;
$('bClose').onclick = () => { $('board').classList.remove('on'); sfx.close(); };
$('btnBoardC').onclick = () => { $('board').classList.remove('on'); sfx.close(); };

// 音效开关：图标本身的字形就说明状态，不额外占一行
function paintSfx() {
  const el = $('btnSfx');
  if (!el) return;
  const on = sfxIsOn();
  el.textContent = '♪';
  el.classList.toggle('off', !on);
  el.setAttribute('aria-label', on ? '关闭音效' : '打开音效');
}
if ($('btnSfx')) {
  paintSfx();
  $('btnSfx').onclick = () => { sfxToggle(); paintSfx(); if (sfxIsOn()) sfx.tap(); };
}

$('sClose').onclick = closeSheet;
// 点面板外面也关：面板只占屏幕下半截，点上面任意地方都该收起来
document.addEventListener('click', (e) => {
  const sheet = $('sheet');
  if (!sheet.classList.contains('on')) return;
  if (Date.now() - sheetAt < 240) return;
  if (e.target.closest('#sheet')) return;
  if (e.target.closest('.ci') || e.target.closest('.unit') || e.target.closest('[data-wid]') || e.target.closest('[data-bw]') || e.target.closest('[data-rid]') || e.target.closest('#foeBar') || e.target.closest('#bFoe')) return;
  closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('board').classList.contains('on')) { $('board').classList.remove('on'); return; }
  closeSheet();
});
renderShopClick();

// 选人界面默认打开
renderSetup();
$('setup').classList.add('on');
$('boot').classList.add('off');
