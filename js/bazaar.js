// 《弥萨格大巴扎》界面层：集市、摊桌、自动战斗的表现。
// 规则本身全在 js/bazaar-core.js（node 里能跑，scripts/bazaar-sim.mjs 就是拿它做平衡的），
// 这里只负责把状态画出来、把点击翻译成动作。

import { ART } from './bazaar-art.js';
import * as C from './bazaar-core.js';
import { TUNING, HEROES, PACTS, WHEEL_FX, REALM_COLOR } from './bazaar-data.js';

const $ = (id) => document.getElementById(id);
const img = (src) => ART[src] || '';

const BEST_KEY = 'zjtt:bazaar:best';
const STATS_KEY = 'zjtt:bazaar:v1';

let run = null;
let fight = null;
let speed = 1;
let timer = 0;
let last = 0;
let playing = false;
let sel = -1;
let moving = false;
let sheetUid = 0;
let pactChoices = [];

// ---------------------------------------------------------------- 小工具
const fmt = (n) => Math.round(n).toLocaleString('zh-CN');
const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));

function toast(msg) {
  const el = $('log');
  if (!el) return;
  el.textContent = msg;
}

function heroColor(realm) { return REALM_COLOR[realm] || '#6ea8ff'; }

function starText(tier) { return '★'.repeat(tier) + '☆'.repeat(3 - tier); }

// 技能在当天的实际数值（怪物技能表是按当天强度归一过的，卡面必须显示真数）
function skillText(run_, foe, s) {
  const { atk, sup } = C.foeStats(run_);
  const parts = [];
  for (const op of s.op) {
    if (op.k === 'dmg') {
      const v = Math.round(op.v * atk * (op.hits ? 1 : 1));
      parts.push(op.hits > 1 ? `${v}×${op.hits}` : `${v}`);
    } else if (op.k === 'poison' || op.k === 'burn') parts.push(`${op.k === 'poison' ? '毒' : '烧'}${Math.round(op.v * atk)}`);
    else if (op.k === 'shield') parts.push(`盾${Math.round(op.v * sup)}`);
    else if (op.k === 'heal') parts.push(`疗${Math.round(op.v * sup)}`);
    else if (op.k === 'slow') parts.push(`缓${Math.round(op.v * sup)}`);
  }
  return parts.join(' · ');
}

// ---------------------------------------------------------------- 选人
function renderSetup() {
  const wrap = $('heroPick');
  wrap.innerHTML = HEROES.map((h) => `
    <button class="hcard" type="button" data-hero="${h.id}">
      <img src="${img(h.av)}" alt="">
      <div style="min-width:0">
        <div class="hn">${h.n}</div>
        <div class="hr">${h.realm} · ${h.role}</div>
        <div class="hp">${h.pas.txt}</div>
      </div>
    </button>`).join('');
  pactChoices = PACTS.slice().sort(() => Math.random() - 0.5).slice(0, 4);
  $('pactPick').innerHTML = pactChoices.map((p) => `
    <button class="pcard" type="button" data-pact="${p.id}">
      <img src="${img(p.im)}" alt="">
      <div style="min-width:0"><div class="pn">${p.n}</div><div class="pt">${p.txt}</div></div>
    </button>`).join('');
  wrap.onclick = (e) => {
    const b = e.target.closest('[data-hero]');
    if (!b) return;
    wrap.querySelectorAll('.hcard').forEach((x) => x.classList.toggle('on', x === b));
    $('setupTip').innerHTML = heroIntro(b.dataset.hero);
    $('pactHint').textContent = '再挑一份密契';
    decide();
  };
  $('pactPick').onclick = (e) => {
    const b = e.target.closest('[data-pact]');
    if (!b) return;
    $('pactPick').querySelectorAll('.pcard').forEach((x) => x.classList.toggle('on', x === b));
    decide();
  };
  $('btnStart').onclick = () => {
    const hid = $('heroPick').querySelector('.on')?.dataset.hero;
    const pid = $('pactPick').querySelector('.on')?.dataset.pact;
    if (!hid || !pid) return;
    startRun(hid, pid);
  };
}

function heroIntro(id) {
  const h = HEROES.find((x) => x.id === id);
  const w = WHEEL_FX[h.wheel.main];
  return `<b>${h.n}</b>｜${h.realm}｜${h.lore}<br>本命命轮「${h.wheel.n}」：${w.txt}。开局带 ${h.kit.map((k) => C.itemOf(k).n).join('、')}。`;
}

function decide() {
  const ok = $('heroPick').querySelector('.on') && $('pactPick').querySelector('.on');
  $('btnStart').disabled = !ok;
}

// ---------------------------------------------------------------- 开局
function startRun(heroId, pactId) {
  run = C.newRun({ seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, heroId, pactId });
  $('setup').classList.remove('on');
  $('app').hidden = false;
  sel = -1; moving = false;
  renderAll();
  toast(`第 1 天，先看看摊上有什么`);
}

// ---------------------------------------------------------------- 主界面
function renderAll() {
  if (!run) return;
  $('hDay').textContent = `第 ${Math.min(run.day, run.totalDays)} 天`;
  $('hDayMax').textContent = `/ ${run.totalDays}`;
  $('hSane').innerHTML = Array.from({ length: TUNING.sane }, (_, i) => `<i class="${i < run.sane ? '' : 'off'}">❤</i>`).join('');
  $('hGold').textContent = fmt(run.gold);
  renderFoe();
  renderBoard();
  renderWheels();
  renderShop();
  renderTrail();
  renderIntel();
  $('btnReroll').textContent = `刷新 ${TUNING.rerollCost + run.rerolls}`;
  $('btnReroll').disabled = run.gold < TUNING.rerollCost + run.rerolls;
}

function renderTrail() {
  const done = run.history;
  const cells = [];
  for (let d = 1; d <= run.totalDays; d++) {
    const h = done[d - 1];
    const cls = h ? (h.win ? 'win' : 'lose') : (d === run.day ? 'now' : '');
    const tip = h ? `第 ${d} 天 ${h.win ? '赢' : '输'}：${h.foe}` : `第 ${d} 天`;
    cells.push(`<span class="dot ${cls}" title="${tip}">${h ? (h.win ? '胜' : '负') : d}</span>`);
  }
  $('trail').innerHTML = cells.join('');
}

function renderIntel() {
  const foe = C.foeOf(run.foeId);
  const hero = run.hero;
  const p = run.pact;
  $('intel').innerHTML = `
    <div class="q">「${foe.desc}」</div>
    <div class="pills">
      <span>${hero.n}｜${hero.pas.txt}</span>
      <span>密契·${p.n}｜${p.txt}</span>
    </div>`;
}

function renderFoe() {
  const st = C.foeStats(run);
  const foe = st.foe;
  const weak = run.pact.k === 'weaken';
  $('foeBar').innerHTML = `
    <img src="${img(foe.im)}" alt="">
    <div class="fi">
      <div class="fn">${foe.n}<em class="${foe.rank === 'boss' ? 'boss' : ''}">${foe.rank === 'boss' ? '头目' : foe.rank === 'elite' ? '精英' : '杂兵'}${weak ? ' · 削弱' : ''}</em></div>
      <div class="fhp"><span>生命 ${fmt(st.maxHp)}</span><div class="bar"><i style="width:100%"></i></div></div>
      <div class="fsk">${foe.skills.map((s) => `<span>${s.n} ${skillText(run, foe, s)} · ${s.cd}拍</span>`).join('')}</div>
    </div>`;
}

function renderBoard() {
  const b = $('board');
  b.innerHTML = run.items.map((it, i) => {
    if (!it) return `<button class="slot ${sel === i ? 'sel' : ''}" type="button" data-slot="${i}" aria-label="空格"><span class="nm"><span>空格</span></span></button>`;
    const def = C.itemOf(it.key);
    const aura = def.cd === 0;
    return `<button class="slot has ${aura ? 'aura' : ''} ${sel === i ? 'sel' : ''} ${moving ? 'target' : ''}" type="button" data-slot="${i}">
      <img src="${img(def.im)}" alt="">
      <span class="st">${it.tier > 1 ? starText(it.tier) : ''}</span>
      <span class="cd">${aura ? '光环' : def.cd + ' 拍'}</span>
      <span class="nm"><span>${def.n}</span><i>${aura ? '相邻' : ''}</i></span>
      <span class="pick"></span>
    </button>`;
  }).join('');
  b.onclick = (e) => {
    const el = e.target.closest('[data-slot]');
    if (!el) return;
    const i = Number(el.dataset.slot);
    if (moving && sel >= 0) {
      const r = C.move(run, sel, i);
      moving = false;
      sel = -1;
      if (r === 'merge') toast('两件并成一件，升了一阶');
      else if (r === 'swap') toast('换了位置');
      renderAll();
      return;
    }
    if (!run.items[i]) return;
    sel = i;
    openSheet(run.items[i], i);
  };
}

function renderWheels() {
  const w = $('wheels');
  const parts = [`<span class="lab">命轮</span>`];
  for (const x of run.wheels) {
    const fx = WHEEL_FX[x.main];
    parts.push(`<button class="wh" type="button" data-wheel="${x.uid}"><img src="${img(x.im)}" alt=""><span><b>${x.n}</b><br>${fx ? fx.txt : ''}</span></button>`);
  }
  if (run.wheels.length < 3) parts.push(`<span class="wh empty">空 ${3 - run.wheels.length}</span>`);
  w.innerHTML = parts.join('');
  w.onclick = (e) => {
    const el = e.target.closest('[data-wheel]');
    if (el) openWheelSheet(Number(el.dataset.wheel));
  };
}

function renderShop() {
  const s = $('shop');
  if (!run.shop.length) { s.innerHTML = '<div class="tipbox">今天的摊位收完了，开战吧。</div>'; return; }
  s.innerHTML = run.shop.map((o, i) => {
    const def = C.defOf(o);
    const can = C.canBuy(run, i);
    const isW = o.kind === 'wheel';
    const rar = isW ? 'SR' : def.r;
    const txt = isW ? WHEEL_FX[def.main].txt : `${C.itemText(def, 1)}；${def.cd === 0 ? '光环，不触发' : def.cd + ' 拍一次'}`;
    return `<button class="card r-${rar} ${o.sold ? 'sold' : ''} ${!can && !o.sold ? 'poor' : ''}" type="button" data-offer="${i}">
      <img src="${img(def.im)}" alt="">
      <span class="cp ${run.gold < o.price ? 'no' : ''}">${o.price}</span>
      <span class="cn">${def.n}</span>
      <span class="ct">${txt}</span>
      <span class="r">${isW ? '命轮' : def.r}</span>
    </button>`;
  }).join('');
  s.onclick = (e) => {
    const el = e.target.closest('[data-offer]');
    if (!el) return;
    const i = Number(el.dataset.offer);
    const o = run.shop[i];
    if (!o || o.sold) return;
    if (!C.canBuy(run, i)) {
      toast(o.kind === 'wheel' ? '命轮最多戴三条' : (C.firstEmptySlot(run) < 0 ? '摊桌满了，先卖一件' : '金币不够'));
      return;
    }
    C.buy(run, i);
    renderAll();
  };
  $('shopHint').textContent = `还剩 ${run.shop.filter((x) => !x.sold).length} 个摊位`;
}

// ---------------------------------------------------------------- 详情
function openSheet(it, slot) {
  const def = C.itemOf(it.key);
  sheetUid = it.uid;
  $('sImg').src = img(def.im);
  $('sName').textContent = `${def.n}${it.tier > 1 ? ' ' + starText(it.tier) : ''}`;
  $('sMeta').textContent = `${def.r} · ${def.cd === 0 ? '光环，不自己出手' : '冷却 ' + def.cd + ' 拍'}`;
  $('sTxt').textContent = C.itemText(def, it.tier) + (def.cd === 0 ? '（光环只加成相邻的造物）' : '');
  const cost = C.upgradeCost(run, it);
  $('sUp').textContent = it.tier >= 3 ? '已满阶' : `升级 ${cost} 金`;
  $('sUp').disabled = it.tier >= 3 || run.gold < cost;
  $('sMove').textContent = '挪位置';
  const back = Math.max(1, Math.floor(def.cost * TUNING.sellRate * TUNING.tierMul[it.tier]));
  $('sSell').textContent = `卖出 +${back}`;
  $('sheet').classList.add('on');
  $('sUp').onclick = () => {
    if (!C.upgrade(run, it.uid)) { toast('金币不够'); return; }
    closeSheet(); renderAll();
  };
  $('sMove').onclick = () => { closeSheet(); moving = true; toast('点一个格子放下（同款同阶会合并）'); renderBoard(); };
  $('sSell').onclick = () => { C.sell(run, it.uid); closeSheet(); renderAll(); };
}

function openWheelSheet(uid) {
  const x = run.wheels.find((w) => w.uid === uid);
  if (!x) return;
  const fx = WHEEL_FX[x.main];
  sheetUid = uid;
  $('sImg').src = img(x.im);
  $('sName').textContent = x.n + (x.native ? '（本命）' : '');
  $('sMeta').textContent = x.native ? '本命命轮 · 不占商店名额' : '命轮 · 全局被动';
  $('sTxt').textContent = fx ? fx.txt : '';
  $('sUp').textContent = '—';
  $('sUp').disabled = true;
  $('sMove').textContent = '—';
  $('sMove').disabled = true;
  $('sSell').textContent = x.native ? '卖不了' : `卖出 +${Math.max(1, Math.floor(x.cost * TUNING.sellRate))}`;
  $('sSell').disabled = !!x.native;
  $('sSell').onclick = () => { C.sell(run, uid); closeSheet(); renderAll(); };
  $('sheet').classList.add('on');
}

function closeSheet() {
  $('sheet').classList.remove('on');
  $('sUp').disabled = false;
  $('sMove').disabled = false;
  $('sSell').disabled = false;
}

// ---------------------------------------------------------------- 战斗
function startFight() {
  fight = C.createFight(run);
  sel = -1; moving = false;
  closeSheet();
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
  $('bFoeImg').src = img(f.foe.im);
  $('bFoeName').textContent = f.foe.n;
  $('bFoeHp').style.width = pct(f.e.hp, f.e.maxHp) + '%';
  $('bFoeHpTxt').textContent = `${fmt(Math.max(0, f.e.hp))} / ${fmt(f.e.maxHp)}`;
  $('bFoeShield').textContent = f.e.shield > 0 ? `盾 ${fmt(f.e.shield)}` : '';
  $('bFoeDot').textContent = dotText(f.e);
  $('bFoeSkills').innerHTML = f.e.skills.map((s, i) => `
    <span class="skill" id="sk${i}">${s.n} ${skillText(run, f.foe, s)}<i id="skb${i}"></i></span>`).join('');
  const cells = [];
  for (let i = 0; i < TUNING.slotN; i++) {
    const it = fight.items.find((x) => x.slot === i);
    if (!it) { cells.push(`<div class="slot" data-bslot="${i}"></div>`); continue; }
    cells.push(`<div class="slot has ${it.cd === 0 ? 'aura' : ''}" data-bslot="${i}">
      <img src="${img(it.def.im)}" alt="">
      <span class="st">${it.tier > 1 ? starText(it.tier) : ''}</span>
      <span class="cd">${it.cd === 0 ? '光环' : it.cd + ' 拍'}</span>
      <span class="nm"><span>${it.def.n}</span><i></i></span>
      <span class="prog"><i id="pg${it.slot}"></i></span>
    </div>`);
  }
  $('bBoard').innerHTML = cells.join('');
  $('bMyHp').style.width = pct(f.p.hp, f.p.maxHp) + '%';
  $('bMyHpTxt').textContent = `${fmt(Math.max(0, f.p.hp))} / ${fmt(f.p.maxHp)}`;
  $('bMyShield').textContent = f.p.shield > 0 ? `盾 ${fmt(f.p.shield)}` : '';
  $('bMyDot').textContent = dotText(f.p);
  $('log').textContent = '开战';
}

function dotText(o) {
  const a = [];
  if (o.poisonT > 0) a.push(`毒 ${fmt(o.poison)}`);
  if (o.burnT > 0) a.push(`烧 ${fmt(o.burn)}`);
  return a.join(' · ');
}

function paintBars() {
  const f = fight;
  $('bFoeHp').style.width = pct(f.e.hp, f.e.maxHp) + '%';
  $('bFoeHpTxt').textContent = `${fmt(Math.max(0, f.e.hp))} / ${fmt(f.e.maxHp)}`;
  $('bFoeShield').textContent = f.e.shield > 0 ? `盾 ${fmt(f.e.shield)}` : '';
  $('bFoeDot').textContent = dotText(f.e);
  $('bMyHp').style.width = pct(f.p.hp, f.p.maxHp) + '%';
  $('bMyHpTxt').textContent = `${fmt(Math.max(0, f.p.hp))} / ${fmt(f.p.maxHp)}`;
  $('bMyShield').textContent = f.p.shield > 0 ? `盾 ${fmt(f.p.shield)}` : '';
  $('bMyDot').textContent = dotText(f.p);
  for (const it of f.items) {
    const el = $(`pg${it.slot}`);
    if (el) el.style.width = it.cd > 0 ? Math.min(100, (it.timer / it.cd) * 100) + '%' : '0%';
  }
  f.e.skills.forEach((s, i) => {
    const el = $(`skb${i}`);
    if (el) el.style.width = Math.min(100, (s.timer / s.cd) * 100) + '%';
  });
}

function float(side, text, color) {
  const host = side === 'e' ? $('bFoeImg').parentElement : $('bMyHp').parentElement;
  const bar = host.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'fx';
  el.textContent = text;
  el.style.color = color;
  el.style.left = '50%';
  el.style.top = '50%';
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.position = 'fixed';
  el.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, bar.left + bar.width / 2 - r.width / 2)) + 'px';
  el.style.top = Math.max(60, bar.top) + 'px';
  setTimeout(() => el.remove(), 760);
}

function applyEvents(ev) {
  let line = '';
  for (const e of ev) {
    if (e.k === 'dmg') {
      const side = e.s === 'p' ? 'e' : 'p';
      const col = e.s === 'p' ? (e.crit ? '#ffd166' : '#ff8f7a') : '#e8695f';
      float(side, (e.s === 'p' ? '' : '-') + fmt(e.v) + (e.crit ? ' 暴' : ''), col);
      if (e.s === 'p' && e.slot != null) flashSlot(e.slot);
      line = e.s === 'p' ? `你的造物造成 ${fmt(e.v)} 点伤害` : `${fight.foe.n} 打掉你 ${fmt(e.v)} 点`;
    } else if (e.k === 'shield') {
      float(e.s === 'p' ? 'p' : 'e', `+盾 ${fmt(e.v)}`, '#7fb2ff');
      line = e.s === 'p' ? `架起 ${fmt(e.v)} 点护盾` : `${fight.foe.n} 架盾 ${fmt(e.v)}`;
    } else if (e.k === 'heal') {
      float(e.s === 'p' ? 'p' : 'e', `+${fmt(e.v)}`, '#6fd39a');
      line = e.s === 'p' ? `回复 ${fmt(e.v)} 点生命` : `${fight.foe.n} 回了 ${fmt(e.v)} 点`;
    } else if (e.k === 'poison') {
      float(e.s === 'p' ? 'e' : 'p', `毒 ${fmt(e.v)}`, '#a98cff');
      line = e.s === 'p' ? `给对面灌了 ${fmt(e.v)} 点中毒` : `你中了 ${fmt(e.v)} 点毒`;
    } else if (e.k === 'burn') {
      float(e.s === 'p' ? 'e' : 'p', `烧 ${fmt(e.v)}`, '#ff9a5c');
      line = e.s === 'p' ? `点着了：${fmt(e.v)} 点灼烧` : `你被点着了 ${fmt(e.v)}`;
    } else if (e.k === 'gold') {
      line = `顺手摸走 ${fmt(e.v)} 金币`;
    } else if (e.k === 'slow') {
      line = `对面慢了 ${e.v} 拍`;
    } else if (e.k === 'haste' || e.k === 'charge') {
      line = e.k === 'haste' ? `旁边的造物转快了一点` : `旁边的造物被推了一把`;
      for (const s of (e.adj || [])) flashSlot(s);
    } else if (e.k === 'poisonTick' || e.k === 'burnTick') {
      if (e.v >= 1) float(e.s === 'p' ? 'e' : 'p', `-${fmt(e.v)}`, e.k === 'poisonTick' ? '#a98cff' : '#ff9a5c');
    }
  }
  if (line) $('log').textContent = line;
  paintBars();
}

function flashSlot(slot) {
  const el = document.querySelector(`[data-bslot="${slot}"]`);
  if (!el) return;
  el.classList.remove('fire');
  void el.offsetWidth;
  el.classList.add('fire');
}

function loop(now) {
  if (!playing) return;
  const dt = Math.min(120, now - last);
  last = now;
  timer += dt * speed;
  if (timer >= TUNING.beatMs) {
    timer -= TUNING.beatMs;
    const ev = C.stepFight(fight);
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
  $('log').textContent = win ? '对面撑不住了' : '你被打趴下了';
  paintBars();
  setTimeout(() => {
    const gain = C.settle(run, fight);
    if (win) toast(`赢了：+${gain.goldGain} 金`);
    $('battle').classList.remove('on');
    if (run.over) { showResult(); return; }
    renderAll();
    toast(win ? `第 ${run.day} 天，接着摆` : `输了一场，理智 ${run.sane}/${TUNING.sane}`);
    if (timeout) toast('打满 40 拍，按剩血比例判的');
  }, win ? 700 : 900);
}

function skipFight() {
  if (!fight || fight.over) return;
  let guard = 0;
  while (!fight.over && guard++ < TUNING.beats + 2) C.stepFight(fight);
  playing = false;
  paintBars();
  endFight();
}

// ---------------------------------------------------------------- 结算
function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 无痕模式 */ }
}
// 存档摘要给 js/gamestats.js 读（个人中心的「游戏进度」）：只增不减的四个数 + 用过的命轮
function recordStats(score) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { s = {}; }
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  const wheels = (s.wheels && typeof s.wheels === 'object') ? s.wheels : {};
  for (const w of run.wheels) wheels[w.id || w.key] = 1;   // 本命命轮只有 key（native+英雄），商店命轮才有 id
  const out = {
    best: Math.max(Number(s.best) || 0, score),
    day: Math.max(Number(s.day) || 0, day),
    runs: (Number(s.runs) || 0) + 1,
    wins: (Number(s.wins) || 0) + (run.cleared ? 1 : 0),
    pacts: Object.assign({}, (s.pacts && typeof s.pacts === 'object') ? s.pacts : {}, { [run.pact.id]: 1 }),
    heroes: Object.assign({}, (s.heroes && typeof s.heroes === 'object') ? s.heroes : {}, { [run.hero.id]: 1 }),
    wheels,
  };
  try { localStorage.setItem(STATS_KEY, JSON.stringify(out)); } catch (e) { /* 无痕模式 */ }
}

function showResult() {
  const score = C.scoreOf(run);
  const best0 = loadBest();
  const best = Math.max(best0, score);
  saveBest(best);
  recordStats(score);
  $('rTitle').textContent = run.cleared ? '摊子开到最后' : '散场';
  $('rSub').innerHTML = run.cleared
    ? `十二天走完，理智还剩 ${run.sane} 点。<br>${run.hero.n} 收摊回家。`
    : `第 ${Math.min(run.day, run.totalDays)} 天散场，理智见底。<br>${run.hero.n} 的摊子被人搬空了。`;
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
  $('btnStart').disabled = true;
  $('heroPick').querySelectorAll('.hcard').forEach((x) => x.classList.remove('on'));
  $('pactPick').querySelectorAll('.pcard').forEach((x) => x.classList.remove('on'));
  $('setupTip').textContent = '挑一个摊主。每人自带一件造物、一条本命命轮和一份脾气。';
  $('pactHint').textContent = '先挑人';
}

// ---------------------------------------------------------------- 绑定
$('btnReroll').onclick = () => {
  if (!C.rollShop(run)) { toast('金币不够刷新'); return; }
  renderAll();
};
$('btnFight').onclick = () => {
  if (!run.items.some(Boolean)) { toast('摊桌上什么都没有，先买点东西'); return; }
  startFight();
};
$('btnSpeed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  $('btnSpeed').textContent = '×' + speed;
};
$('btnSkip').onclick = skipFight;
$('btnAgain').onclick = again;
$('btnHelp').onclick = () => $('help').classList.add('on');
$('setupHelp').onclick = () => $('help').classList.add('on');
$('helpClose').onclick = () => $('help').classList.remove('on');
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });

// 选人界面默认打开
renderSetup();
$('setup').classList.add('on');
$('boot').classList.add('off');
