// 《大巴扎：银钥》界面层：选人、集市、摊桌、自动战斗的表现。
// 规则本身全在 js/bazaar-core.js（node 里能跑，scripts/bazaar-sim.mjs 就是拿它做平衡的），
// 这里只负责把状态画出来、把点击翻译成动作。
//
// 图片全部走雪碧图（assets/bazaar/sheet-*.webp）：一千多张图各发一个请求，
// 在本站「每个请求 1~2 秒」的边缘上开局就要等半分钟，所以拼四张大图 + 百分比定位。

import * as C from './bazaar-core.js';
import { TUNING, HEROES, WHEELS, PACTS, DIFFS, SHEETS, ARCH_ZH, RANK_ZH, REALM_ZH } from './bazaar-data.js';

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
let sel = -1;
let moving = false;
let sheetUid = 0;
const pick = { diff: 'normal', hero: null, pact: null, realm: '' };

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
  return `background-image:url(${s.src});background-size:${s.cols * 100}% ${s.rows * 100}%;background-position:${px}% ${py}%`;
}
const sp = (spr, cls = '') => `<span class="sp ${cls}" style="${sprStyle(spr)}"></span>`;
function paintSp(el, spr) {
  if (!el) return;
  el.setAttribute('style', sprStyle(spr));
}

// 待机立绘：每个唤醒体一个动图文件（约 14KB），用到谁才下谁 ——
// 62 张全塞一张图集要 800KB 起，而一局只会看见一个人。
const REALM_VAR = { CHAOS: '--chaos', CARO: '--caro', AEQUOR: '--aqua', ULTRA: '--ultra' };
const idleUrl = (h) => `assets/bazaar/idle/${h.id}.webp`;
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
function toast(msg) {
  const el = $('log');
  if (!el) return;
  el.textContent = msg;
}
const starText = (t) => '★'.repeat(Math.max(0, t - 1));
const realmCls = (h) => ({ CHAOS: 'CH', CARO: 'CA', AEQUOR: 'AE', ULTRA: 'UL' }[h.realm] || 'CH');

function wheelText(w) {
  const v = w.v || 0;
  const map = {
    CRIT_RATE: `暴击率 +${Math.round(v * 100)}%`,
    CRIT_DMG: `暴击伤害 +${Math.round(v * 100)}%`,
    DMG_AMP: `造物伤害 +${Math.round(v * 100)}%`,
    KEYFLARE_REGEN: `每拍回复 ${v} 点生命`,
    SIGIL_YIELD: `每场 +${v} 金币`,
    REALM_MASTERY: `每次伤害 +${Math.round(v * 10) / 10}`,
    DEATH_RESISTANCE: `生命上限 +${Math.round(v)}`,
    ALIEMUS_REGEN: `每 4 拍 +${Math.round(v)} 护盾`,
  };
  return map[w.main] || '';
}

// ---------------------------------------------------------------- 选人
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
  $('diffTip').textContent = diff.desc || `共 ${diff.days} 天，${diff.sane} 点理智。`;

  const realms = ['', '混沌', '血肉', '深海', '超维'];
  $('heroFilter').innerHTML = realms.map((r) => `
    <button class="${pick.realm === r ? 'on' : ''}" type="button" data-realm="${r}">${r || '全部'}${r ? '' : ` ${HEROES.length}`}</button>`).join('');
  $('heroFilter').onclick = (e) => {
    const el = e.target.closest('[data-realm]');
    if (!el) return;
    pick.realm = el.dataset.realm;
    renderSetup();
  };

  const list = HEROES.filter((h) => !pick.realm || h.realmZh === pick.realm);
  $('heroCount').textContent = `${list.length} 名`;
  $('heroPick').innerHTML = list.map((h) => `
    <button class="hcard r-${realmCls(h)} ${pick.hero === h.id ? 'on' : ''}" type="button" data-hero="${h.id}" title="${h.n}">
      ${sp(h.spr)}
      <span class="hn">${h.n}</span>
      <span class="hd">${h.type}</span>
    </button>`).join('');
  $('heroPick').onclick = (e) => {
    const el = e.target.closest('[data-hero]');
    if (!el) return;
    pick.hero = el.dataset.hero;
    pick.pact = null;
    preload(HEROES.find((h) => h.id === pick.hero));
    renderSetup();
  };

  const hero = HEROES.find((h) => h.id === pick.hero);
  // 立绘大板：选中的摊主站在这儿
  setRealm(hero, [$('setup')]);
  $('hbArt').innerHTML = artHTML(hero);
  if (hero) {
    const nw = C.wheelOf(hero.wheel);
    const kit = hero.kit.map((k) => C.itemOf(k)).filter(Boolean);
    $('hbTag').textContent = `${hero.realmZh} · ${hero.type} · ${hero.rar}`;
    $('hbName').textContent = hero.n;
    $('hbPas').textContent = hero.pas.txt;
    $('hbPills').innerHTML = [nw ? `本命命轮 ${nw.n}` : '', ...kit.map((it) => `起手 ${it.n}`)]
      .filter(Boolean).map((t) => `<span>${t}</span>`).join('');
  } else {
    $('hbTag').textContent = '待选';
    $('hbName').textContent = '挑一个摊主';
    $('hbPas').textContent = '每人自带一件本命造物、一条本命命轮和一份脾气（被动）。';
    $('hbPills').innerHTML = '';
  }

  $('pactPick').innerHTML = PACTS.map((p) => `
    <button class="pcard ${pick.pact === p.id ? 'on' : ''}" type="button" data-pact="${p.id}">
      ${sp(p.spr)}
      <span style="min-width:0">
        <span class="pn">${p.n}</span>
        <span class="pt">${p.txt}</span>
      </span>
    </button>`).join('');
  $('pactPick').onclick = (e) => {
    const el = e.target.closest('[data-pact]');
    if (!el) return;
    pick.pact = el.dataset.pact;
    renderSetup();
  };

  const pact = PACTS.find((p) => p.id === pick.pact);
  $('pactHint').textContent = pact ? `已订：${pact.n}` : '整局的规矩，开局定一份';
  const ok = !!(hero && pact);
  $('btnStart').disabled = !ok;
  $('btnStart').textContent = ok ? `开张 · ${diff.n}` : '开张';
}

function startRun() {
  if (!pick.hero || !pick.pact) return;
  run = C.newRun({ seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, heroId: pick.hero, pactId: pick.pact, diffId: pick.diff });
  $('setup').classList.remove('on');
  $('app').hidden = false;
  renderAll();
}

// ---------------------------------------------------------------- 主界面
function renderAll() {
  if (!run) return;
  $('hDay').textContent = `第 ${Math.min(run.day, run.totalDays)} 天`;
  $('hDayMax').textContent = `/ ${run.totalDays}`;
  $('hDiff').textContent = run.diff.n;
  $('hSane').innerHTML = Array.from({ length: run.diff.sane }, (_, i) => `<i class="${i < run.sane ? '' : 'off'}">◆</i>`).join('');
  $('hGold').textContent = fmt(run.gold);
  setRealm(run.hero, [$('app')]);
  renderMine();
  renderFoe();
  renderBoard();
  renderWheels();
  renderShop();
  renderTrail();
  const cost = TUNING.rerollCost + run.rerolls;
  $('btnReroll').textContent = run.pact.k === 'freereroll' && run.freeReroll < 1 ? '刷新 免费' : `刷新 ${cost}`;
  $('btnReroll').disabled = run.gold < cost && !(run.pact.k === 'freereroll' && run.freeReroll < 1);
}

// 主界面横幅：字在左，立绘在右
function renderMine() {
  const h = run.hero;
  const nw = C.wheelOf(h.wheel);
  $('mArt').innerHTML = artHTML(h);
  $('mName').textContent = h.n;
  $('mMeta').textContent = `${h.realmZh} · ${h.type} · ${h.rar}`;
  $('mPas').textContent = h.pas.txt;
  $('mPills').innerHTML = [nw ? `本命·${nw.n}` : '', `密契·${run.pact.n}`]
    .filter(Boolean).map((t) => `<span>${t}</span>`).join('');
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

function renderFoe() {
  const st = C.foeStats(run);
  const foe = st.foe;
  const weak = run.pact.k === 'weaken' ? ' · 削弱' : '';
  $('foeBar').innerHTML = `
    ${sp(foe.spr, 'fp')}
    <div class="fi">
      <div class="fn"><b>${foe.n}</b><em class="${foe.rank}">${RANK_ZH[foe.rank] || '普通'}${weak}</em></div>
      <div class="fhp"><span>生命 ${fmt(st.maxHp)}</span><div class="bar"><i style="width:100%"></i></div></div>
      <div class="fsk">${foe.skills.map((s) => `<span title="${skillText(st, s)}">${s.n} · ${s.cd} 拍</span>`).join('')}</div>
      <div class="q">「${foe.desc || '这只怪没有留下记载。'}」</div>
    </div>`;
}

function skillText(st, s) {
  return s.op.map((op) => {
    const isDmg = op.k === 'dmg' || op.k === 'poison' || op.k === 'burn' || op.k === 'str';
    return C.opText(op, isDmg ? st.atk : st.sup);
  }).filter(Boolean).join('；');
}

function renderBoard() {
  const b = $('board');
  b.innerHTML = run.items.map((it, i) => {
    if (!it) return `<button class="slot ${sel === i ? 'sel' : ''}" type="button" data-slot="${i}" aria-label="空格"><span class="nm"><span>空格</span></span></button>`;
    const def = C.itemOf(it.key);
    const aura = def.cd === 0;
    return `<button class="slot has ${aura ? 'aura' : ''} ${sel === i ? 'sel' : ''} ${moving ? 'target' : ''}" type="button" data-slot="${i}">
      ${sp(def.spr)}
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
  const parts = ['<span class="lab">命轮</span>'];
  for (const x of run.wheels) {
    parts.push(`<button class="wh" type="button" data-wheel="${x.uid}" title="${wheelText(x)}">
      ${sp(x.spr)}<span><b>${x.n}</b><br>${wheelText(x)}</span></button>`);
  }
  if (run.wheels.length < 3) parts.push(`<span class="wh empty">空 ${3 - run.wheels.length} 格</span>`);
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
    const txt = isW ? wheelText(def) : `${C.itemText(def, 1)}${def.cd === 0 ? '' : `；${def.cd} 拍一次`}`;
    return `<button class="card r-${rar} ${o.sold ? 'sold' : ''} ${!can && !o.sold ? 'poor' : ''}" type="button" data-offer="${i}">
      ${sp(def.spr)}
      <span class="cp ${run.gold < o.price ? 'no' : ''}">${o.price}</span>
      <span class="cn">${def.n}</span>
      <span class="ct">${txt}</span>
      <span class="r">${isW ? '命轮' : (ARCH_ZH[def.arch] || def.r)}</span>
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
  paintSp($('sImg'), def.spr);
  $('sName').textContent = `${def.n}${it.tier > 1 ? ' ' + starText(it.tier) : ''}`;
  const archZh = ARCH_ZH[def.arch] || '';
  const kind = def.r === 'FATE' ? '本命' : def.r;
  $('sMeta').textContent = [kind, def.cd === 0 ? '光环，不自己出手' : `冷却 ${def.cd} 拍`,
    archZh && archZh !== kind ? archZh : ''].filter(Boolean).join(' · ');
  $('sTxt').innerHTML = C.itemText(def, TUNING.tierMul[it.tier]) + (def.cd === 0 ? '<em>（光环只加成上下左右四格）</em>' : '');
  const cost = C.upgradeCost(run, it);
  $('sUp').textContent = it.tier >= 3 ? '已满阶' : `升级 ${cost} 金`;
  $('sUp').disabled = it.tier >= 3 || run.gold < cost;
  $('sMove').textContent = '挪位置';
  $('sMove').disabled = false;
  const back = Math.max(1, Math.floor(def.cost * TUNING.sellRate * TUNING.tierMul[it.tier]));
  $('sSell').textContent = `卖出 +${back}`;
  $('sSell').disabled = false;
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
  sheetUid = uid;
  paintSp($('sImg'), x.spr);
  $('sName').textContent = x.n + (x.native ? '（本命）' : '');
  $('sMeta').textContent = x.native ? '本命命轮 · 不占商店名额' : '命轮 · 全局被动';
  $('sTxt').innerHTML = `${wheelText(x)}${x.perk ? `<br><em>${x.perk.txt}</em>` : ''}`;
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
  if (!run.items.some(Boolean)) { toast('摊桌上什么都没有，先买点东西'); return; }
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
  setRealm(run.hero, [$('battle')]);
  $('bHeroArt').innerHTML = artHTML(run.hero);
  $('bHeroName').textContent = run.hero.n;
  $('bHeroMeta').textContent = `${run.hero.realmZh} · ${run.hero.type}`;
  paintSp($('bFoeImg'), f.foe.spr);
  $('bFoeName').innerHTML = `${f.foe.n}<em class="${f.foe.rank}">${RANK_ZH[f.foe.rank] || '普通'}</em>`;
  $('bFoeHp').style.width = pct(f.e.hp, f.e.maxHp) + '%';
  $('bFoeHpTxt').textContent = `${fmt(Math.max(0, f.e.hp))} / ${fmt(f.e.maxHp)}`;
  $('bFoeShield').textContent = f.e.shield > 0 ? `盾 ${fmt(f.e.shield)}` : '';
  $('bFoeDot').textContent = dotText(f.e);
  $('bFoeSkills').innerHTML = f.e.skills.map((s, i) => `
    <span class="skill" id="sk${i}" title="${skillText(C.foeStats(run), s)}">${s.n}<i id="skb${i}"></i></span>`).join('');
  const cells = [];
  for (let i = 0; i < TUNING.slotN; i++) {
    const it = fight.items.find((x) => x.slot === i);
    if (!it) { cells.push(`<div class="slot" data-bslot="${i}"></div>`); continue; }
    cells.push(`<div class="slot has ${it.cd === 0 ? 'aura' : ''}" data-bslot="${i}">
      ${sp(it.def.spr)}
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
  if (o.str > 0) a.push(`力 ${fmt(o.str)}`);
  if (o.vulnT > 0) a.push(`易伤 ${Math.round(o.vuln * 100)}%`);
  if (o.weakT > 0) a.push(`削弱 ${Math.round(o.weak * 100)}%`);
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
      line = e.s === 'p' ? `给对面灌了 ${fmt(e.v)} 层中毒` : `你中了 ${fmt(e.v)} 层毒`;
    } else if (e.k === 'burn') {
      float(e.s === 'p' ? 'e' : 'p', `烧 ${fmt(e.v)}`, '#ff9a5c');
      line = e.s === 'p' ? `点着了：${fmt(e.v)} 层灼烧` : `你被点着了 ${fmt(e.v)}`;
    } else if (e.k === 'gold') {
      line = `顺手摸走 ${fmt(e.v)} 金币`;
    } else if (e.k === 'str') {
      float(e.s === 'p' ? 'p' : 'e', `力 +${fmt(e.v)}`, '#ffd166');
      line = e.s === 'p' ? `力量涨了 ${fmt(e.v)}` : `${fight.foe.n} 强化了 ${fmt(e.v)}`;
    } else if (e.k === 'vuln') {
      float('e', `易伤 +${Math.round(e.v * 100)}%`, '#ffb36b');
      line = `对面易伤 +${Math.round(e.v * 100)}%`;
    } else if (e.k === 'weaken') {
      float('p', `削弱 ${Math.round(e.v * 100)}%`, '#b0b8c8');
      line = `你的伤害被压了 ${Math.round(e.v * 100)}%`;
    } else if (e.k === 'stun') {
      line = '被对面打断了：造物集体慢了一拍';
    } else if (e.k === 'slow') {
      line = `对面慢了 ${e.v} 拍`;
    } else if (e.k === 'haste' || e.k === 'charge') {
      line = e.k === 'haste' ? '旁边的造物转快了一点' : '旁边的造物被推了一把';
      for (const s of (e.adj || [])) flashSlot(s);
    } else if (e.k === 'regen') {
      line = `每拍开始回 ${fmt(e.v)} 点`;
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
    toast(win ? `第 ${run.day} 天，接着摆` : `输了一场，理智 ${run.sane}/${run.diff.sane}`);
    if (timeout) setTimeout(() => toast('打满 40 拍，按剩血比例判的'), 900);
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
  for (const w of run.wheels) wheels[w.key || w.n] = 1;
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
  const d = run.diff;
  $('rTitle').textContent = run.cleared ? '摊子开到最后' : '散场';
  $('rSub').innerHTML = run.cleared
    ? `${d.n}难度 ${run.totalDays} 天走完，理智还剩 ${run.sane} 点。<br>${run.hero.n} 收摊回家。`
    : `${d.n}难度第 ${Math.min(run.day, run.totalDays)} 天散场，理智见底。<br>${run.hero.n} 的摊子被人搬空了。`;
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
  renderSetup();
}

// ---------------------------------------------------------------- 绑定
$('btnReroll').onclick = () => {
  if (!C.rollShop(run)) { toast('金币不够刷新'); return; }
  renderAll();
};
$('btnFight').onclick = startFight;
$('btnSpeed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  $('btnSpeed').textContent = '×' + speed;
};
$('btnSkip').onclick = skipFight;
$('btnAgain').onclick = again;
$('btnStart').onclick = startRun;
$('btnHelp').onclick = () => $('help').classList.add('on');
$('setupHelp').onclick = () => $('help').classList.add('on');
$('helpClose').onclick = () => $('help').classList.remove('on');
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// 选人界面默认打开
renderSetup();
$('setup').classList.add('on');
$('boot').classList.add('off');
