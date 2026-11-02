// 《寻找伪人：Morimens》的控制器。
//
// 页面结构只有三块：左边一间屋子，右边一本档案，下面对话框。
// 所有判断题都在「登记卡 / 档案 / 问话」这三处之间来回，别的地方不放信息。

import {
  newRun, loadSave, currentVisitor, nightCfg, NIGHT_NAME, NIGHTS, VISITS_PER_NIGHT,
  ask, observe, decide, nextVisitor, score, clearSave, codex, meetAll, addTells,
  best, saveBest, flush, FIELD_LABEL, FIELD_ASK, ALL_CHARS, ART_META,
} from './engine.js';
import { loadArt, makeScene, sfx } from './view.js';
import {
  NIGHT_INTRO, NIGHT_END, OPEN_REAL, OPEN_FAKE, OBSERVE_REAL, OBSERVE_ANOMALY,
  OBSERVE_NONE, OUTCOME, ENDINGS, HELP, REAL_TAIL,
} from './text.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

const REALM_COLOR = { 混沌: '#d16b9b', 血肉: '#d29a4e', 深海: '#4fb0c9', 超维: '#9a86d8' };

let S = null;
let scene = null;
let art = null;
let tab = 'card';
let typer = 0;
let fullText = '';
let onSaid = null;
let busy = false;
let mismatch = false;

/* ------------------------------------------------------------------ 工具 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
const pickBy = (arr, key) => arr[hash(key) % arr.length];

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

// 图集里的一块，用 CSS 背景定位铺出来（不再发请求）
function sprite(which, rect, scale) {
  const d = document.createElement('div');
  d.className = 'spr';
  const k = scale || 1;
  d.style.width = rect[2] * k + 'px';
  d.style.height = rect[3] * k + 'px';
  d.style.backgroundImage = 'url(' + art[which].src + ')';
  d.style.backgroundPosition = -rect[0] * k + 'px ' + -rect[1] * k + 'px';
  d.style.backgroundSize = (ART_META[which].size[0] * k) + 'px ' + (ART_META[which].size[1] * k) + 'px';
  d.style.imageRendering = 'pixelated';
  return d;
}

function bustOf(c, scale) {
  if (c.k === 's') {
    const i = ALL_CHARS.filter((x) => x.k === 's').indexOf(c);
    return sprite('face', ART_META.face.rects[Math.max(0, i)], scale);
  }
  const i = ART_META.chars.findIndex((x) => x.slug === c.img.bust);
  return sprite('bust', ART_META.bust.rects[i] || [0, 0, 48, 48], scale);
}

function artOf(c, scale) {
  const i = ART_META.chars.findIndex((x) => x.slug === c.img.card);
  if (i < 0) return null;
  return sprite('card', ART_META.card.rects[i], scale || 1);
}

/* ------------------------------------------------------------------ 说话 */
function say(text, cb) {
  fullText = text || '';
  onSaid = cb || null;
  $('#tLine').textContent = '';
  clearInterval(typer);
  let n = 0;
  typer = setInterval(() => {
    n += 2;
    $('#tLine').textContent = fullText.slice(0, n);
    if (n >= fullText.length) { clearInterval(typer); typer = 0; const f = onSaid; onSaid = null; if (f) f(); }
  }, 18);
}
function skipTyping() {
  if (!typer) return;
  clearInterval(typer); typer = 0;
  $('#tLine').textContent = fullText;
  const f = onSaid; onSaid = null; if (f) f();
}
function speaker(who, sub, tone) {
  $('#tWho').textContent = who;
  const s = $('#tSub');
  s.textContent = sub || '';
  s.className = tone || '';
}

/* --------------------------------------------------------------- 弹窗 */
function modal(title, bodyNodes, buttons) {
  const box = $('#mbox');
  box.replaceChildren();
  const h = el('h3', null, title);
  box.appendChild(h);
  const b = el('div', 'mbody');
  (bodyNodes || []).forEach((n) => b.appendChild(typeof n === 'string' ? el('p', null, n) : n));
  box.appendChild(b);
  const bar = el('div', 'macts');
  (buttons || []).forEach((bt) => {
    const btn = el('button', bt.kind || 'btn', bt.t);
    btn.type = 'button';
    btn.onclick = () => { sfx.click(); closeModal(); if (bt.fn) bt.fn(); };
    bar.appendChild(btn);
  });
  box.appendChild(bar);
  $('#modal').hidden = false;
  $('#modal').classList.add('on');
}
function closeModal() { $('#modal').hidden = true; $('#modal').classList.remove('on'); }
function isModal() { return !$('#modal').hidden; }

/* ------------------------------------------------------------------ 标题 */
function paintTitle() {
  const b = best();
  const c = codex();
  $('#codexCount').textContent = c.met.length + '/' + ALL_CHARS.length;
  $('#bestLine').textContent = b.score
    ? '最高分 ' + b.score + ' · ' + (ENDINGS[b.ending] ? '「' + ENDINGS[b.ending].t + '」' : '') + ' · 第 ' + b.runs + ' 次值夜'
    : '还没有值过夜。';
  const sv = loadSave();
  $('#btnCont').hidden = !sv || sv.over;
  $('#btnCont').textContent = sv && !sv.over ? '接着第' + (sv.night + 1) + '夜' : '';
}

/* ------------------------------------------------------------------ 开局 */
function startNew() {
  S = newRun((Date.now() % 2147483647) >>> 0);
  mismatch = false;
  $('#scrTitle').hidden = true;
  $('#scrEnd').hidden = true;
  $('#scrGame').hidden = false;
  paintHud();
  sfx.unlock();
  showNightIntro();
}

function continueRun() {
  const sv = loadSave();
  if (!sv || sv.over) return startNew();
  S = sv;
  // 存档里可能停在「已经决定、还没翻页」的位置
  const v = currentVisitor(S);
  if (v && !v.done) startVisit(v);
  else { $('#scrTitle').hidden = true; $('#scrGame').hidden = false; paintHud(); advance(); }
}

function startVisit(v) {
  $('#scrTitle').hidden = true;
  $('#scrGame').hidden = false;
  paintHud();
  tab = 'card';
  mismatch = false;
  paintPanes();
  speaker('门外', v.c.k === 's' ? 'B 站主播' : '', '');
  scene.setChar(v.c);
  sfx.knock();
  const opener = v.fake
    ? pickBy(OPEN_FAKE, v.cid)
    : pickBy(OPEN_REAL[v.c.k === 's' ? '主播' : v.c.realm] || OPEN_REAL['混沌'], v.cid);
  say(opener);
  renderActs('main');
}

function showNightIntro() {
  const n = S.night;
  modal(NIGHT_NAME[n] + ' · ' + (n + 1) + ' / ' + NIGHTS.length, [
    el('p', 'pre', NIGHT_INTRO[n]),
  ], [{ t: '坐到门后', kind: 'btn primary', fn: () => { nextInNight(); } }]);
}

function nextInNight() {
  const v = currentVisitor(S);
  if (!v) return advance();
  startVisit(v);
}

function advance() {
  const prev = S.night;
  const v = nextVisitor(S);
  if (S.over) return showEnding();
  if (S.night !== prev) {
    sfx.stopDrone();
    const line = NIGHT_END[prev];
    modal(NIGHT_NAME[prev] + ' 结束', [el('p', 'pre', line)], [{
      t: '天还没亮', kind: 'btn', fn: () => showNightIntro(),
    }]);
    return;
  }
  if (v) startVisit(v);
}

/* ------------------------------------------------------------------ HUD */
function paintHud() {
  $('#hNight').textContent = NIGHT_NAME[S.night];
  const inNight = S.vi % VISITS_PER_NIGHT + 1;
  $('#hProg').textContent = '第 ' + inNight + ' 个 / 共 ' + VISITS_PER_NIGHT + ' 个';
  $('#hSan').textContent = Math.round(S.sanity);
  const bar = $('#hSanBar');
  bar.style.width = Math.max(0, Math.min(100, S.sanity)) + '%';
  bar.className = S.sanity <= 30 ? 'bad' : (S.sanity <= 60 ? 'warn' : '');
  const ammo = $('#hAmmo');
  ammo.replaceChildren();
  for (let i = 0; i < 6; i++) ammo.appendChild(el('i', i < S.bullets ? 'on' : ''));
  ammo.title = '子弹 ' + S.bullets + ' / 6';
}

/* ------------------------------------------------------------------ 面板 */
function fieldRow(label, truth, claim, asked) {
  const row = el('div', 'frow');
  row.appendChild(el('span', 'fl', label));
  row.appendChild(el('span', 'fv', truth || '—'));
  if (claim != null) {
    const ok = claim === truth;
    if (ok) {
      // 对得上就只打勾，不再把同一个值写两遍
      row.appendChild(el('span', 'fc ok', '✓'));
      row.appendChild(el('span', 'fc dim', ''));
    } else {
      mismatch = true;
      row.classList.add('bad');
      row.appendChild(el('span', 'fc bad', '✗ 本人说'));
      row.appendChild(el('span', 'fc bad', claim));
    }
  } else {
    row.appendChild(el('span', 'fc dim', ''));
    row.appendChild(el('span', 'fc dim', asked ? '未问' : '待问'));
  }
  return row;
}

function paintPanes() {
  paintHud();
  paintCard();
  paintFile();
  paintLog();
  $$('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $$('.pane').forEach((p) => { p.hidden = p.dataset.pane !== tab; });
  const fileTab = $('.tabs button[data-tab="file"]');
  fileTab.classList.toggle('flag', mismatch);
}

function paintCard() {
  const v = currentVisitor(S);
  const p = $('#paneCard');
  p.replaceChildren();
  if (!v) return;
  const c = v.c;
  const card = el('div', 'idcard');
  const head = el('div', 'idhead');
  head.appendChild(bustOf(c, 1.5));
  const nm = el('div', 'idname');
  nm.appendChild(el('b', null, c.n));
  nm.appendChild(el('span', null, c.k === 's' ? '内容创作者' : (c.en || '')));
  head.appendChild(nm);
  card.appendChild(head);

  const st = el('div', 'stamp');
  st.textContent = '地下十一层';
  card.appendChild(st);

  (c.card || []).forEach((k) => {
    const line = el('div', 'idrow');
    line.appendChild(el('span', null, FIELD_LABEL[k]));
    const val = el('b', null, v.claims[k]);
    if (k === 'realm') val.style.color = REALM_COLOR[v.claims[k]] || '';
    line.appendChild(val);
    card.appendChild(line);
  });
  card.appendChild(el('div', 'idfoot', '本人持证 · 出门右转'));
  p.appendChild(card);
  p.appendChild(el('p', 'hint', '卡是它自己递进来的。对不对，要去「档案」里对。'));

  if (v.askedFields.length) {
    const box = el('div', 'asked');
    box.appendChild(el('p', 'hint', '它已经答过的：'));
    v.askedFields.forEach((f) => {
      const ok = v.claims[f] === c.facts[f];
      const line = el('div', 'aline' + (ok ? '' : ' bad'));
      line.appendChild(el('span', null, FIELD_LABEL[f]));
      line.appendChild(el('b', null, v.claims[f]));
      line.appendChild(el('em', null, ok ? '✓' : '✗ 档案：' + c.facts[f]));
      box.appendChild(line);
    });
    p.appendChild(box);
  }
}

function paintFile() {
  const v = currentVisitor(S);
  const p = $('#paneFile');
  p.replaceChildren();
  if (!v) return;
  const c = v.c;
  const wrap = el('div', 'file');
  if (c.k === 'a' && artOf(c, 1)) {
    const ph = el('div', 'photo');
    ph.appendChild(artOf(c, 1));
    ph.appendChild(el('span', 'phcap', '官方立绘 · ' + c.n));
    wrap.appendChild(ph);
  } else {
    const ph = el('div', 'photo s');
    ph.appendChild(bustOf(c, 2.4));
    ph.appendChild(el('span', 'phcap', '没有立绘 · 只有一张头像'));
    wrap.appendChild(ph);
  }
  const meta = el('div', 'fmeta');
  meta.appendChild(el('b', null, c.n));
  meta.appendChild(el('span', null, [c.realm, c.role, c.rarity].filter(Boolean).join(' · ')));
  wrap.appendChild(meta);
  p.appendChild(wrap);

  const table = el('div', 'ftable');
  table.appendChild(el('div', 'fhead', '档案'));
  const keys = (c.card || []).concat(c.ask || []);
  keys.forEach((k) => {
    const hasClaim = (c.card || []).includes(k) || v.askedFields.includes(k);
    table.appendChild(fieldRow(FIELD_LABEL[k], c.facts[k], hasClaim ? v.claims[k] : null, v.askedFields.includes(k)));
  });
  if (c.k === 'a') {
    table.appendChild(el('p', 'hint', '生日 / 身高 / 别名 / 星座 只能问出来；卡上那三行，一眼就能对。'));
  } else {
    table.appendChild(el('p', 'hint', '主播没有战斗立绘，档案里也就一张头像。签名和直播间标题只能问。'));
  }
  p.appendChild(table);
}

function paintLog() {
  const p = $('#paneLog');
  p.replaceChildren();
  p.appendChild(el('div', 'fhead', '今晚的登记'));
  if (!S.log.length) p.appendChild(el('p', 'hint', '还没有划掉任何名字。'));
  S.log.slice().reverse().forEach((l) => {
    const line = el('div', 'lrow ' + (l.fake ? 'fake' : 'real'));
    line.appendChild(el('span', 'ln', NIGHT_NAME[l.night] || ''));
    line.appendChild(el('b', null, l.name));
    line.appendChild(el('em', null, l.tag));
    p.appendChild(line);
  });
  const c = codex();
  const foot = el('div', 'logfoot');
  foot.appendChild(el('span', null, '档案库已解锁 ' + c.met.length + ' / ' + ALL_CHARS.length));
  foot.appendChild(el('span', null, '见过的破绽 ' + c.tells.length + ' / ' + OBSERVE_ANOMALY.length));
  p.appendChild(foot);
}

/* ------------------------------------------------------------------ 动作 */
function renderActs(mode, extra) {
  const acts = $('#acts');
  acts.replaceChildren();
  const v = currentVisitor(S);
  if (!v || v.done) { paintResultActs(); return; }

  if (mode === 'ask') {
    (v.c.ask || []).forEach((f) => {
      const b = el('button', 'btn small' + (v.askedFields.includes(f) ? ' done' : ''), FIELD_LABEL[f]);
      b.type = 'button';
      b.disabled = v.askedFields.includes(f) || v.acts <= 0;
      b.onclick = () => doAsk(f);
      acts.appendChild(b);
    });
    const back = el('button', 'btn ghost small', '不问了');
    back.type = 'button'; back.onclick = () => renderActs('main');
    acts.appendChild(back);
    return;
  }

  if (mode === 'decide') {
    const a = el('button', 'btn primary', '开门放它进来');
    a.type = 'button'; a.onclick = () => doDecide('admit');
    const r = el('button', 'btn', '拒之门外');
    r.type = 'button'; r.onclick = () => doDecide('refuse');
    const s = el('button', 'btn danger', '开枪（' + S.bullets + ' 发）');
    s.type = 'button';
    s.disabled = S.bullets <= 0;
    s.onclick = confirmShoot;
    const back = el('button', 'btn ghost', '再看看');
    back.type = 'button'; back.onclick = () => renderActs('main');
    acts.appendChild(a); acts.appendChild(r); acts.appendChild(s); acts.appendChild(back);
    return;
  }

  const ob = el('button', 'btn', '贴着玻璃看' + (v.obsUsed ? '（看过了）' : ''));
  ob.type = 'button';
  ob.disabled = v.obsUsed;
  ob.onclick = doObserve;
  const q = el('button', 'btn', '问话');
  q.type = 'button';
  q.disabled = v.acts <= 0;
  q.onclick = () => { sfx.tick(); renderActs('ask'); };
  const d = el('button', 'btn primary', '该决定了');
  d.type = 'button';
  d.onclick = () => { sfx.tick(); renderActs('decide'); };
  acts.appendChild(ob); acts.appendChild(q); acts.appendChild(d);
  const left = el('span', 'left', '还能问 ' + v.acts + ' 次 · 看玻璃不占次数');
  acts.appendChild(left);
}

function paintResultActs() {
  const acts = $('#acts');
  acts.replaceChildren();
  const b = el('button', 'btn primary', S.vi + 1 >= S.list.length ? '天亮了' : '下一位');
  b.type = 'button';
  b.onclick = () => { sfx.click(); advance(); };
  acts.appendChild(b);
}

function doObserve() {
  const v = currentVisitor(S);
  const r = observe(S);
  if (!r) return;
  sfx.paper();
  if (r.seen) {
    scene.red(0.6); scene.shake(0.55); sfx.heartbeat();
    addTells([OBSERVE_ANOMALY[r.tell].k]);
    say(OBSERVE_ANOMALY[r.tell].t);
    speaker('你', '看见了', 'bad');
  } else {
    say(v.fake ? pickBy(OBSERVE_NONE, v.cid + 'f') : pickBy(OBSERVE_REAL, v.cid));
    speaker('你', '看不出异常', 'dim');
  }
  paintPanes();
  renderActs('main');
}

function doAsk(f) {
  const v = currentVisitor(S);
  const r = ask(S, f);
  if (!r) return;
  sfx.tick();
  const val = r.claim;
  say('你：' + FIELD_ASK[f] + '\n\n' + v.c.n + '：「' + val + '。」');
  if (!r.ok) {
    mismatch = true;
    scene.red(0.35);
    speaker('门外 · ' + v.c.n, '档案对不上', 'bad');
  } else {
    speaker('门外 · ' + v.c.n, '和档案一致', 'good');
  }
  paintPanes();
  renderActs('main');
}

function confirmShoot() {
  const v = currentVisitor(S);
  modal('开枪', [
    el('p', 'pre', '枪口对着门外的人。这一枪打出去，就没有「再看看」了。\n剩下 ' + S.bullets + ' 发。'),
  ], [
    { t: '开枪', kind: 'btn danger', fn: () => doDecide('shoot') },
    { t: '放下枪', kind: 'btn ghost' },
  ]);
}

function doDecide(kind) {
  const v = currentVisitor(S);
  const r = decide(S, kind);
  if (!r) return;
  if (kind === 'shoot') { sfx.gun(); scene.flash(0.7); scene.shake(1); }
  if (kind === 'admit' && v.fake) { scene.red(0.9); sfx.heartbeat(); }
  const body = pickBy(OUTCOME[r.key], v.cid + kind);
  say(body);

  const verdict = v.fake ? '伪人' : '真身';
  const detail = v.fake
    ? '它抄错了「' + FIELD_LABEL[v.lie] + '」：' + (v.lieV || '') + '（档案：' + v.c.facts[v.lie] + '）'
    : '档案与本人一致。';
  const title = kind === 'admit' ? '门开了' : (kind === 'shoot' ? '枪响了' : '门没开');
  speaker(title, verdict + ' · ' + v.c.n + ' · ' + detail, v.fake ? 'bad' : 'good');

  paintPanes();
  paintResultActs();

  if (S.over) setTimeout(showEnding, 1400);
}

/* ------------------------------------------------------------------ 结局 */
function showEnding() {
  flush(S);
  sfx.stopDrone();
  scene.setMode('end');
  const E = ENDINGS[S.ending] || ENDINGS.dawn;
  const sc = score(S);
  saveBest({ ending: S.ending, score: sc, night: S.night });
  meetAll(S.met);

  $('#scrGame').hidden = true;
  $('#scrEnd').hidden = false;
  const box = $('#scrEnd');
  box.replaceChildren();
  const inner = el('div', 'endcard');
  inner.appendChild(el('p', 'ek', '结局'));
  inner.appendChild(el('h2', null, E.t));
  inner.appendChild(el('p', 'es', E.sub));
  const body = el('div', 'ebody');
  (E.body || []).forEach((x) => body.appendChild(el('p', null, x)));
  inner.appendChild(body);

  const stats = el('div', 'estats');
  const rows = [
    ['值夜', NIGHT_NAME[Math.min(S.night, 6)] + ' · 共 ' + S.list.filter((x) => x.done).length + ' 人'],
    ['拦下的伪人', S.caught + ' / ' + NIGHTS.reduce((a, b) => a + b.f, 0)],
    ['放错进来', S.leaked],
    ['误拒活人', S.refusedReal],
    ['误杀活人', S.killedReal],
    ['剩下理智', Math.round(S.sanity)],
    ['得分', sc],
  ];
  rows.forEach(([k, v]) => {
    const r = el('div', 'erow');
    r.appendChild(el('span', null, k));
    r.appendChild(el('b', null, String(v)));
    stats.appendChild(r);
  });
  inner.appendChild(stats);

  const acts = el('div', 'eacts');
  const again = el('button', 'btn primary', '再值一夜');
  again.type = 'button';
  again.onclick = () => { clearSave(); startNew(); };
  const cx = el('button', 'btn', '档案库');
  cx.type = 'button';
  cx.onclick = openCodex;
  const home = el('a', 'btn ghost', '回首页');
  home.href = 'index.html';
  acts.appendChild(again); acts.appendChild(cx); acts.appendChild(home);
  inner.appendChild(acts);
  box.appendChild(inner);
  clearSave();
}

/* ------------------------------------------------------------------ 图鉴 */
let codexFilter = 'all';
function openCodex() {
  if (S && !S.over) flush(S);
  codexFilter = 'all';
  paintCodex();
}

function paintCodex() {
  const c = codex();
  const box = $('#mbox');
  box.replaceChildren();
  box.classList.add('wide');
  const h = el('h3', null, '档案库 · ' + c.met.length + ' / ' + ALL_CHARS.length);
  box.appendChild(h);

  const bar = el('div', 'cfilter');
  [['all', '全部'], ['a', '唤醒体'], ['s', '主播'], ['lock', '未解锁']].forEach(([k, t]) => {
    const b = el('button', k === codexFilter ? 'on' : '', t);
    b.type = 'button';
    b.onclick = () => { codexFilter = k; paintCodex(); };
    bar.appendChild(b);
  });
  box.appendChild(bar);

  const grid = el('div', 'cgrid');
  ALL_CHARS.forEach((ch) => {
    const met = c.met.includes(ch.n);
    if (codexFilter === 'lock' && met) return;
    if (codexFilter === 'a' && ch.k !== 'a') return;
    if (codexFilter === 's' && ch.k !== 's') return;
    if (codexFilter !== 'lock' && !met) {
      // 「全部」里也把没解锁的排进来，但要暗掉——玩家得知道自己还差谁
    }
    const card = el('button', 'citem' + (met ? '' : ' lock'));
    card.type = 'button';
    if (met) {
      card.appendChild(bustOf(ch, 1));
      card.appendChild(el('span', null, ch.n));
      card.onclick = () => { sfx.paper(); openChar(ch); };
    } else {
      const ph = el('div', 'spr');
      ph.style.width = '48px'; ph.style.height = '48px';
      ph.style.background = '#0c0d12';
      card.appendChild(ph);
      card.appendChild(el('span', null, '？？？'));
    }
    grid.appendChild(card);
  });
  box.appendChild(grid);
  box.appendChild(el('p', 'hint', '见过的破绽 ' + c.tells.length + ' / ' + OBSERVE_ANOMALY.length
    + ' · 破绽在「贴着玻璃看」时出现，看过一次就记下来。'));

  const macts = el('div', 'macts');
  const close = el('button', 'btn', '合上档案');
  close.type = 'button'; close.onclick = closeModal;
  macts.appendChild(close);
  box.appendChild(macts);
  $('#modal').hidden = false;
  $('#modal').classList.add('on');
}

function openChar(ch) {
  const box = $('#mbox');
  box.classList.remove('wide');
  box.replaceChildren();
  const head = el('div', 'cdetail');
  if (ch.k === 'a' && artOf(ch, 1.4)) {
    const ph = el('div', 'photo');
    ph.appendChild(artOf(ch, 1.4));
    head.appendChild(ph);
  } else {
    const ph = el('div', 'photo s');
    ph.appendChild(bustOf(ch, 3));
    head.appendChild(ph);
  }
  const info = el('div', 'cinfo');
  info.appendChild(el('h3', null, ch.n));
  info.appendChild(el('p', 'cen', ch.en || ''));
  const tags = el('div', 'ctags');
  [ch.realm, ch.role, ch.rarity].filter(Boolean).forEach((t) => {
    const s = el('span', 'ctag', t);
    if (t === ch.realm) s.style.borderColor = REALM_COLOR[t] || '';
    if (t === ch.realm) s.style.color = REALM_COLOR[t] || '';
    tags.appendChild(s);
  });
  if (ch.k === 's') tags.appendChild(el('span', 'ctag', 'B 站主播'));
  info.appendChild(tags);

  const table = el('div', 'ftable');
  (ch.card || []).concat(ch.ask || []).forEach((k) => {
    const row = el('div', 'frow');
    row.appendChild(el('span', 'fl', FIELD_LABEL[k]));
    row.appendChild(el('span', 'fv', ch.facts[k] || '—'));
    table.appendChild(row);
  });
  info.appendChild(table);
  if (ch.k === 's') info.appendChild(el('p', 'hint', '主播没有战斗立绘，门外只能看见头像和一个火柴人。'));
  head.appendChild(info);
  box.appendChild(head);

  const macts = el('div', 'macts');
  const back = el('button', 'btn', '回档案库');
  back.type = 'button'; back.onclick = paintCodex;
  macts.appendChild(back);
  const close = el('button', 'btn ghost', '合上');
  close.type = 'button'; close.onclick = closeModal;
  macts.appendChild(close);
  box.appendChild(macts);
  $('#modal').hidden = false;
  $('#modal').classList.add('on');
}

function openHelp() {
  const box = $('#mbox');
  box.classList.remove('wide');
  box.replaceChildren();
  box.appendChild(el('h3', null, '怎么值夜'));
  const body = el('div', 'mbody');
  HELP.forEach(([k, v]) => {
    const d = el('div', 'hrow');
    d.appendChild(el('b', null, k));
    d.appendChild(el('p', null, v));
    body.appendChild(d);
  });
  box.appendChild(body);
  const macts = el('div', 'macts');
  const close = el('button', 'btn primary', '知道了');
  close.type = 'button'; close.onclick = closeModal;
  macts.appendChild(close);
  box.appendChild(macts);
  $('#modal').hidden = false;
  $('#modal').classList.add('on');
}

/* ------------------------------------------------------------------ 启动 */
async function boot() {
  try {
    art = await loadArt();
    scene = makeScene($('#cv'), art);
  } catch (e) {
    const b = $('#boot');
    if (b) { b.className = 'err'; $('#bootText').textContent = '素材载入失败'; $('#bootHint').textContent = e.message; }
    return;
  }
  $('#app').hidden = false;
  const b = $('#boot');
  if (b) b.remove();
  paintTitle();

  $('#btnNew').onclick = () => { sfx.unlock(); sfx.click(); startNew(); };
  $('#btnCont').onclick = () => { sfx.unlock(); sfx.click(); continueRun(); };
  $('#btnCodex').onclick = () => { sfx.paper(); openCodex(); };
  $('#btnHelp').onclick = () => { sfx.tick(); openHelp(); };
  $('#btnHelp2').onclick = () => { sfx.tick(); openHelp(); };
  $('#btnSound').onclick = () => {
    sfx.unlock();
    const on = !sfx.isOn();
    sfx.toggle(on);
    $('#btnSound').textContent = on ? '♪' : '×';
    $('#btnSound').classList.toggle('off', !on);
  };
  $$('.tabs button').forEach((b) => {
    b.onclick = () => { sfx.tick(); tab = b.dataset.tab; paintPanes(); };
  });
  $('.talk').addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    skipTyping();
  });
  $('#modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isModal()) closeModal();
    if (e.key === ' ' || e.key === 'Enter') { if (!isModal()) skipTyping(); }
    if (e.key === '1' && !isModal()) { tab = 'card'; paintPanes(); }
    if (e.key === '2' && !isModal()) { tab = 'file'; paintPanes(); }
    if (e.key === '3' && !isModal()) { tab = 'log'; paintPanes(); }
  });
  window.addEventListener('pagehide', () => { if (S && !S.over) flush(S); });
  // 调画面用的后门：?debug=1 时能把门外的人换成指定角色（只看画面，不动存档）
  if (/[?&]debug/.test(location.search)) {
    window.__fake = {
      setChar(n) { const c = ALL_CHARS.find((x) => x.n === n || x.id === n); if (c) scene.setChar(c); return !!c; },
      state: () => S,
      codexAll() { ALL_CHARS.forEach((c) => meetAll([c.n])); return ALL_CHARS.length; },
    };
  }
  scene.setMode('idle');
}

boot();
