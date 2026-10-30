import { newGame, recover, index, options, setDraft, submit, rosterView, lockedHidden, leads, leadTotal, structure, marksOf, cycleMark, MARK_NAMES, clueCards, search, itemTrail, timeline, evidenceOf, hint, finish, canFinish, stats, summary, confirmedCount, total, unrecoveredRefs, shadowUnlocked } from './engine.js';

import { burst } from './fx.js';
import { startBg, setTheme } from './bg.js';
import { unlock as unlockAudio, play, setSound, setTheme as setAudioTheme, startAmbient, stopAmbient } from './audio.js';
import { toGame, validate } from './workshop.js';
import { initWs, openWs, bindWs, openRate } from './workshop-ui.js';
import * as cloud from './cloud.js';

let ED = 63;
const EDS = { 63: ['data/game.json', 'morimens-deathreport-save-v1'], 62: ['data/game-62.json', 'morimens-deathreport-save-ed62-v1'], 61: ['data/game-61.json', 'morimens-deathreport-save-ed61-v1'] };
// 工坊：从云端/本地卷宗进来时，G 是编译出来的，没有对应的 data/*.json；存档也按卷宗分开
let WS = null;
// 上次停在哪一届。存档是按届分开的，刷新后如果一律跳回本篇，往届玩家会以为进度丢了。
const EDKEY = 'morimens-deathreport-ed';
const saveKey = () => (WS ? `morimens-deathreport-save-ws-${WS.id}` : EDS[ED][1]);
const SAVE = { toString: () => saveKey() }, PREF = 'morimens-deathreport-pref-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let G, st, AUTO, ui = { sel: null, sort: 'order', tab: 'ros', rep: null, pane: 'idx', hintLog: [], q: '' };
let pref = { crt: true, size: 15, sound: true, auto: { name: true, loc: true, item: true, bc: true }, ...(() => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } })() };
const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch { /* ignore */ } };
const hasSave = () => { try { return !!localStorage.getItem(saveKey()); } catch { return false; } };
// 存档版本 2：多存一份界面位置（读到哪条、哪个页签、报告选的是谁），下次进来接着读。
// 版本 1 的老存档直接并进新档的默认值里继续用，不丢进度。
const SAVE_V = 2;
function flashSaved() {
  const b = $('#bSave'); if (!b || b.textContent === '已保存 ✔') return;
  b.textContent = '已保存 ✔'; clearTimeout(flashSaved.t);
  flashSaved.t = setTimeout(() => { b.textContent = '保存'; }, 1200);
}
const save = (silent) => {
  if (!st) return;
  try {
    st.ui = { sel: ui.sel, tab: ui.tab, pane: ui.pane, rep: ui.rep, sort: ui.sort, infer: ui.infer, noteSec: ui.noteSec };
    st.savedAt = Date.now();
    st.playMs = (st.playMs || 0) + Math.max(0, Date.now() - (ui.t0 || Date.now()));
    ui.t0 = Date.now();
    localStorage.setItem(saveKey(), JSON.stringify(st));
    if (!silent) flashSaved();
  } catch { /* 隐私模式 / 配额满：写不进去就算了，别打断阅读 */ }
};
function migrate(j) {
  const st = { ...newGame(G), ...j, v: SAVE_V };
  const keep = (k) => !!G.records[k];
  const arcs = (G.arcs || []).map((a) => a.id);
  st.recovered = (Array.isArray(j.recovered) ? j.recovered : []).filter(keep);
  st.docs = ['00-ORDER', ...(Array.isArray(j.docs) ? j.docs : []).filter((d) => G.docs[d] && d !== '00-ORDER')];
  st.msgs = (Array.isArray(j.msgs) ? j.msgs : []).filter((id) => G.msgs.some((m) => m.id === id));
  st.arcs = (Array.isArray(j.arcs) ? j.arcs : []).filter((id) => arcs.includes(id));
  st.badges = (Array.isArray(j.badges) ? j.badges : []).filter((id) => arcs.includes(id));
  for (const f of ['drafts', 'confirmed', 'wrong', 'hl', 'marks', 'rnotes', 'hintStep', 'missed'])
    st[f] = (j[f] && typeof j[f] === 'object') ? j[f] : (f === 'hintStep' || f === 'missed' ? {} : {});
  for (const f of ['drafts', 'confirmed', 'wrong', 'hl', 'marks', 'rnotes'])
    for (const k of Object.keys(st[f])) if (!keep(k)) delete st[f][k];
  st.notes = typeof j.notes === 'string' ? j.notes : '';
  st.playMs = Number(j.playMs) || 0;
  return st;
}
function loadSave() {
  const key = saveKey();
  let raw = null;
  try { raw = localStorage.getItem(key); } catch { return null; }
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object' || !Array.isArray(j.recovered)) throw new Error('bad');
    return migrate(j);
  } catch {
    // 坏档不要直接覆盖：挪到 -bad 留个证据，再当没有存档处理
    try { localStorage.setItem(key + '-bad', raw); localStorage.removeItem(key); } catch { /* ignore */ }
    return null;
  }
}
// 标题页只读摘要，不动整份存档
function peekSave() {
  try {
    const j = JSON.parse(localStorage.getItem(saveKey()));
    if (!j || typeof j !== 'object') return null;
    return { at: +j.savedAt || 0, confirmed: Object.keys(j.confirmed || {}).length, recovered: (j.recovered || []).length, total: total(G), ended: j.ended };
  } catch { return null; }
}
const ago = (ts) => {
  if (!ts) return '刚刚';
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} 小时前` : `${Math.floor(h / 24)} 天前`;
};
// 启动时先体检一遍：坏档挪到 -bad 存着，别让它一直占着键、把「继续调查」卡成灰色
function sanitizeSave() {
  const key = saveKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const j = JSON.parse(raw);
    if (!j || typeof j !== 'object' || !Array.isArray(j.recovered)) throw new Error('bad');
  } catch {
    try { const raw = localStorage.getItem(key); if (raw) localStorage.setItem(key + '-bad', raw); localStorage.removeItem(key); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------- audio
// 短音效来自 audio/*.wav（tools/make_audio.py 合成），环境音由 audio.js 实时合成。
const sfx = {
  key: () => play('key', { gain: 0.5, spread: 0.06 }),
  open: () => play('paper', { gain: 0.55 }),
  ok: () => play('chime', { gain: 0.75 }),
  err: () => play('buzz', { gain: 0.6 }),
  stamp: () => play('stamp', { gain: 0.9 }),
  msg: () => play('msg', { gain: 0.7 }),
  bell: () => play('bell', { gain: 0.75 }),
  // 以下四个由 audio.js 现场合成，没有对应文件
  whisper: () => play('whisper', { gain: 0.42 }),
  boom: () => play('boom', { gain: 0.3 }),
  heart: () => play('heart', { gain: 0.5 }),
  lock: () => play('lock', { gain: 0.34 }),
  melt: () => play('melt', { gain: 0.4 }),
};
// 安卓与部分浏览器支持震动；iOS 没有，静默失败即可
const buzz = (p) => { try { navigator.vibrate?.(p); } catch { /* ignore */ } };
// 黑影的低语与黑潮的闷响只在第一次打开这条记录时响；重读不再打断
const heard = new Set();
function toast(t, ms = 2600) { const d = document.createElement('div'); d.textContent = t; $('#toast').appendChild(d); setTimeout(() => d.remove(), ms); }

// ---------------------------------------------------------------- 背景素材
const BG = { 63: ['img/bg-63-title.webp', 'img/bg-63-read.webp'], 62: ['img/bg-62-title.webp', 'img/bg-62-read.webp'], 61: ['img/bg-61-title.webp', 'img/bg-61-read.webp'] };
let bgCur = -1, bgAt = 0;
function setBg(kind) {
  const pair = BG[ED] || BG[63], url = pair[kind === 'read' ? 1 : 0];
  if (url === bgCur) return;
  bgCur = url;
  const layers = document.querySelectorAll('#bglayer img');
  if (!layers.length) return;
  const next = layers[bgAt % 2], prev = layers[(bgAt + 1) % 2];
  next.src = url;
  next.classList.add('on'); prev.classList.remove('on');
  bgAt++;
}

// ---------------------------------------------------------------- markup
const reEsc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function buildAuto() {
  const map = new Map(), add = (list, cls) => list.forEach((t) => t && map.set(esc(t), cls));
  add(G.roster.map((p) => p.name), 'a-name'); add(Object.values(G.places), 'a-loc'); add(G.roster.map((p) => p.item), 'a-item');
  const keys = [...map.keys()].sort((x, y) => y.length - x.length);
  AUTO = { re: new RegExp(keys.map(reEsc).join('|') + '|“目前已死亡[^”]*”|第[一二三四五六七八九十]+个', 'g'), map };
}
function auto(html) {
  if (!AUTO) return html;
  return html.split(/(<[^>]+>)/).map((seg) => (seg.startsWith('<') ? seg : seg.replace(AUTO.re, (m) => {
    const c = AUTO.map.get(m) || (m.startsWith('“') ? 'a-bc' : 'a-ord');
    const on = { 'a-name': pref.auto.name, 'a-loc': pref.auto.loc, 'a-item': pref.auto.item, 'a-bc': pref.auto.bc, 'a-ord': pref.auto.bc }[c];
    return on ? `<span class="${c}">${m}</span>` : m;
  }))).join('');
}
function paras(text, id) {
  const mk = marksOf(st, id); let n = 0, html = '';
  const inline = (s) => esc(s).replace(/\[b\](.*?)\[\/b\]/g, '<b>$1</b>').replace(/\[link\]([^[]+)\[\/link\]/g, '<span class="lnk" data-go="$1">$1</span>').replace(/(·?)(\d{2}|\?\?)-([A-E][1-5]|\?\?)-(\d{2}|\?\?)/g, (m) => (m.includes('??') ? `<span class="lnk" data-fill="${m.replace('·', '')}">${m}</span>` : m));
  for (const blk of text.split(/(\[sys\][\s\S]*?\[\/sys\])/)) {
    if (!blk.trim()) continue;
    if (blk.startsWith('[sys]')) { const inner = blk.slice(5, -6).trim(); html += `<div class="sys">${inner.split('\n').map((l) => (l.trim() ? `<p${/^〔[◇◆▲▽○●★☆◎▣][一二三]〕/.test(l) ? ' class="frag"' : ''}>${inline(l)}</p>` : '<p class="gap"></p>')).join('')}</div>`; continue; }
    for (const l of blk.split('\n')) { if (!l.trim()) continue; const fr = /^〔[◇◆▲▽○●★☆◎▣][一二三]〕/.test(l);
      const ml = /^〔融蚀/.test(l);   // 被融蚀吃掉的那一段：另给一套字色与抖动
      html += `<p data-i="${n}" class="${(mk[n] ? 'hl hl' + mk[n] : '') + (fr ? ' frag' : '') + (ml ? ' meltp' : '')}">${fr ? esc(l) : auto(inline(l))}</p>`; n++; }
  }
  return html;
}
function readerTools() {
  const t = pref.auto, b = (k, l) => `<button data-auto="${k}" class="${t[k] ? 'on' : ''}">${l}</button>`;
  return `<div class="rdtools"><span class="dim">高亮</span>${b('name', '人名')}${b('loc', '地点')}${b('item', '装备')}${b('bc', '广播·序数')}<span class="dim legend">点击段落标记：<i class="m1">线索</i><i class="m2">证词</i><i class="m3">矛盾</i></span></div>`;
}
function openReader(id, keep = false) {
  ui.sel = id; const head = $('#rdHead'), body = $('#rdBody');
  const rec = G.records[id], doc = G.docs[id], msg = G.msgs.find((m) => m.id === id), arc = G.arcs.find((a) => a.id === id);
  // 黑影（名册外的那一个）与黑潮致死各有自己的画面与声音
  const isShadow = !!(G.shadow && (G.shadow.keys || []).includes(id));
  const isBlast = !!(rec && /爆炸/.test(G.solutions?.[id]?.causeZh || ''));
  const isMelt = !!(rec && /〔融蚀/.test(rec.text));
  const rd = $('#rd');
  rd.classList.toggle('shadowrec', isShadow);
  if (arc) { head.innerHTML = `<b>${id}</b> | ${esc(arc.title)} | ${esc(arc.source)}<small>${arc.hidden ? '隐藏档案　靠推理得到' : `补充档案　确认 ${arc.need} 份报告后送达`}</small>`; body.innerHTML = paras(arc.text, id); }
  else if (rec) { head.innerHTML = `<b>${id}</b> | ${esc(rec.name)} | ${esc(rec.when)}<small>${esc(rec.cell)} ${esc(G.places[rec.cell])}　NO.${String(rec.num).padStart(2, '0')}</small>`; body.innerHTML = paras(rec.text, id); }
  else if (doc) { head.innerHTML = `<b>${id}</b> | ${esc(doc.title)} | ${esc(doc.source)}`; body.innerHTML = paras(doc.text, id); }
  else if (msg) { head.innerHTML = `<b>${id}</b> | 发件人不明 | --`; body.innerHTML = paras(msg.text, id); }
  if (rec) body.insertAdjacentHTML('afterbegin', readerTools());
  const ld = leads(G, st, id);
  if (ld.length) body.insertAdjacentHTML('beforeend', `<p class="notice">-- 检测到对其他记忆的参考。可推理出 ${ld.length} 条新记录：${ld.map((x) => esc(x.name)).join('、')} --</p>`);
  else if (rec && (rec.refs || []).length) body.insertAdjacentHTML('beforeend', '<p class="notice done">-- 这条记录能推理出的记录，已全部复原 --</p>');
  if (rec || doc || msg || arc) body.insertAdjacentHTML('beforeend', `<details class="rn" ${st.rnotes?.[id] ? 'open' : ''}><summary>本条笔记</summary><textarea data-rn="${id}" placeholder="针对这条记录的推理（自动保存）">${esc(st.rnotes?.[id] || '')}</textarea></details>`);
  body.parentElement.scrollTop = 0;
  // 正文逐段浮现，像记录一行一行被还原出来；重渲染（切换高亮）时不重播
  if (!keep) {
    const ps = [...body.querySelectorAll(':scope > p')].filter((p) => !p.classList.contains('sys'));
    ps.forEach((p, i) => { p.style.animationDelay = Math.min(i, 22) * 22 + 'ms'; p.classList.add('fin'); });
    if (isShadow && !heard.has(id)) { heard.add(id); sfx.whisper(); }
    else if (isMelt && !heard.has(id)) { heard.add(id); sfx.melt(); }
    else if (isBlast && !heard.has(id)) { heard.add(id); sfx.boom(); }
    else if (doc && doc.id === '00-ZONE' && !heard.has(id)) { heard.add(id); sfx.boom(); }
  }
  showPane('rd'); renderList();
}
$('#rdBody').addEventListener('click', (e) => {
  const au = e.target.closest('[data-auto]'); if (au) { pref.auto[au.dataset.auto] = !pref.auto[au.dataset.auto]; savePref(); openReaderKeep(); return; }
  const go = e.target.closest('[data-go]'); if (go) { doRecover(go.dataset.go); return; }
  const fill = e.target.closest('[data-fill]'); if (fill) { $('#recIn').value = fill.dataset.fill; showPane('idx'); $('#recIn').focus(); return; }
  const p = e.target.closest('p[data-i]'); if (!p || !ui.sel) return;
  const c = cycleMark(st, ui.sel, +p.dataset.i);
  p.className = c ? `hl hl${c}` : ''; sfx.key(); save(); if (ui.tab === 'note') renderTools();
});
$('#rdBody').addEventListener('input', (e) => { const id = e.target.dataset.rn; if (id) { (st.rnotes ||= {})[id] = e.target.value; } });
$('#rdBody').addEventListener('change', (e) => { if (e.target.dataset.rn) save(); });
function openReaderKeep() { const y = $('#rdBody').parentElement.scrollTop; openReader(ui.sel, true); $('#rdBody').parentElement.scrollTop = y; }

// ---------------------------------------------------------------- index
function renderList() {
  let items = index(G, st);
  if (ui.sort === 'name') items.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh') || a.id.localeCompare(b.id));
  if (ui.sort === 'refs') items.sort((a, b) => b.refs - a.refs);
  const msgR = items.filter((i) => i.kind === 'msg'), recR = items.filter((i) => i.kind !== 'msg');
  $('#leadsum').innerHTML = `可推理的新记录 <b>${leadTotal(G, st)}</b> 条　·　已复原 ${st.recovered.length}/${total(G)}`;
  $('#list').innerHTML = [...recR, ...msgR].map((it) => `<li data-id="${it.id}" class="${it.kind === 'doc' ? 'sys' : it.kind === 'msg' ? 'msg' : it.kind === 'arc' ? 'arc' : ''}${it.id.startsWith('HX') ? ' hid' : ''} ${it.dotted ? 'dotted' : ''} ${ui.sel === it.id ? 'on' : ''}"><span class="badge ${it.refs > 0 ? 'on' : ''}" title="${it.refs > 0 ? `可推理出 ${it.refs} 条新记录` : ''}">${it.refs > 0 ? `[${it.refs}]` : it.kind === 'rec' && G.records[it.id].refs.length ? '✓' : ''}</span><span class="id">${it.id}</span><span class="t">${esc(it.title)}${it.when ? ' ' + esc(it.when) : ''}</span>${it.status ? `<span class="chip ${it.status}">${{ ok: '确认', ng: '有误', draft: '待核' }[it.status]}</span>` : ''}</li>`).join('') + lockedHidden(G, st).map((x) => `<li class="locked" title="${esc(x.riddle)}"><span class="badge">？</span><span class="id">${x.id}</span><span class="t">${esc(x.riddle)}</span></li>`).join('');
}
$('#list').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) { sfx.open(); openReader(li.dataset.id); } });
document.querySelector('.sortbar').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; ui.sort = b.dataset.sort; document.querySelectorAll('.sortbar button').forEach((x) => x.classList.toggle('on', x === b)); renderList(); });
function doRecover(name) {
  const before = st.recovered.length;
  const r = recover(G, st, name);
  const msg = $('#recMsg'); msg.textContent = r.msg; msg.className = 'msg ' + (r.ok ? '' : 'err');
  if (r.ok && r.puzzle) { reward(r.reward); }
  if (r.ok) { sfx.ok(); if (!r.again && !r.puzzle) toast(r.kind === 'doc' ? '● 已复原系统文档' : '● 已复原死亡记录'); $('#recIn').value = ''; openReader(r.id); if (st.recovered.length > before) save(); else save(); }
  else sfx.err();
  renderList(); renderTools(); refreshRate();
}
$('#recForm').addEventListener('submit', (e) => { e.preventDefault(); doRecover($('#recIn').value); });
$('#recIn').addEventListener('keydown', () => sfx.key());
function showPane(p) { ui.pane = p; document.querySelectorAll('.pane').forEach((x) => x.classList.toggle('show', x.id === p)); document.querySelectorAll('#tabsm button').forEach((b) => b.classList.toggle('on', b.dataset.p === p)); }
$('#tabsm').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) showPane(b.dataset.p); });

// ---------------------------------------------------------------- tools
const REALM = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维', HUMAN: '人类' }, ROLE = { ASSAULT: '突击', WARDEN: '守护', CHORUS: '合唱', INV: '调查员' };
function renderTools() {
  const tp = $('#tp'); document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === ui.tab));
  if (ui.tab === 'ros') {
    const q = ui.q.trim().toLowerCase(), rows = rosterView(G, st).filter((p) => !q || p.shownName.toLowerCase().includes(q) || String(p.n) === q || p.item.toLowerCase().includes(q) || REALM[p.realm].includes(q) || ROLE[p.role].includes(q));
    tp.innerHTML = `<h4>■ ${G.roster.some((p) => p.human) ? '参加者' : '唤醒体'}名册（${G.roster.length} 名）</h4><div class="row"><input id="rq" placeholder="搜索 姓名 / 编号 / 装备 / 界域" value="${esc(ui.q)}"></div><div class="ros">${rows.map((p) => `<div class="rr ${p.melted ? 'melt' : ''}" data-n="${p.n}"><span class="no">${String(p.n).padStart(2, '0')}</span>${p.avatar ? `<img class="av" loading="lazy" src="../${p.avatar}" alt="">` : '<span></span>'}<span class="nm">${p.melted ? '▇▇（融蚀）' : esc(p.shownName)} <small class="dim">${REALM[p.realm]}／${ROLE[p.role]}</small>${st.confirmed[p.key] ? '<span class="st">✔</span>' : p.recordKnown ? '<span class="st" style="color:var(--amb)">●</span>' : ''}</span><span class="it">${p.itemImg ? `<img src="../${p.itemImg}" alt="">` : ''}配发: ${p.melted ? '（融蚀）' : esc(p.item)}</span></div>`).join('')}</div>`;
    tp.querySelectorAll('.rr').forEach((el) => { el.style.cursor = 'pointer'; el.onclick = () => {
      const p = rosterView(G, st).find((x) => x.n === +el.dataset.n), L = p.lore || {};
      if (p.melted) { modal('<h3>■ ▇▇　名册第 50 号</h3><p class="dim">档案已被融蚀，无法读取。</p><div class="btns"><button class="btn" data-close>关闭</button></div>'); return; }
      const rows = [['性别', L['性别']], ['生日', L['生日']], ['身高', L['身高']], ['Gi 值', L['Gi 值']], ['界域', REALM[p.realm] + '／' + ROLE[p.role]], ['特性', L['特性'] && L['特性'].replace(/\s{2,}/g, '　')], ['配发', p.item]].filter((r) => r[1]);
      modal(`<h3>■ ${String(p.n).padStart(2, '0')}　${esc(p.name)}</h3>${p.avatar ? `<img class="av" style="float:right;width:72px;height:72px;margin:0 0 6px 10px;border:1px solid var(--line)" src="../${p.avatar}" alt="">` : ''}<p>${rows.map((r) => `<b>${esc(r[0])}</b>　${esc(r[1])}`).join('<br>')}</p>${L['简介'] ? `<p>${esc(L['简介'])}</p>` : ''}${L['唤醒台词'] ? `<p class="dim">“${esc(L['唤醒台词'])}”</p>` : ''}<div class="btns"><button class="btn" data-close>关闭</button></div>`);
    }; });
    $('#rq').addEventListener('input', (e) => { ui.q = e.target.value; const pos = e.target.selectionStart; renderTools(); const i = $('#rq'); i.focus(); i.setSelectionRange(pos, pos); });
  } else if (ui.tab === 'infer') {
    const tl = timeline(G, st), tr = itemTrail(G, st), sec = ui.infer || 'tl';
    let h = `<h4>■ 推理板</h4><div class="seg"><button data-inf="tl" class="${sec === 'tl' ? 'on' : ''}">时间线</button><button data-inf="it" class="${sec === 'it' ? 'on' : ''}">装备流转</button></div>`;
    if (sec === 'tl') {
      h += tl.length ? `<p class="dim">按死亡时刻排列已复原记录；封锁区块需先复原 00-ZONE。</p><ol class="tl">${tl.map((r) => `<li data-go="${r.key}"><b>${esc(r.when)}</b> <span class="cl">${r.cell}</span> ${esc(r.place)} · ${esc(r.name)}${r.confirmed ? ' <span class="chip ok">确认</span>' : ''}${r.closed ? `<div class="dim">此刻已封锁：${r.closed.length ? r.closed.join(' ') : '无'}</div>` : ''}</li>`).join('')}</ol>` : '<p class="dim">还没有复原任何死亡记录。</p>';
    } else {
      h += tr.length ? `<p class="dim">同一件装备，同一时刻只在一个人手里。下面是已复原记录里出现过的装备，按时间排列。</p>${tr.map((t) => `<div class="trail"><b>${esc(t.item)}</b> <span class="dim">配发：${esc(t.owner)}</span><div>${t.uses.map((u) => `<span class="use ${u.own ? 'own' : ''}" data-go="${u.key}">${esc(u.when)} ${esc(u.name)}</span>`).join(' → ')}</div></div>`).join('')}` : '<p class="dim">还没有记录提到装备。</p>';
    }
    tp.innerHTML = h;
  } else if (ui.tab === 'graph') {
    const g = structure(G, st), R = 150, C = 170, pos = (n) => { const a = ((n - 1) / g.nodes.length) * Math.PI * 2 - Math.PI / 2; return [C + R * Math.cos(a), C + R * Math.sin(a)]; };
    const cnt = (k) => g.nodes.filter((x) => x.state === k).length;
    const lines = g.edges.map((e) => { const [x1, y1] = pos(e.from), [x2, y2] = pos(e.to); return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" class="eg"/>`; }).join('');
    const dots = g.nodes.map((x) => { const [px, py] = pos(x.n); return `<g class="nd ${x.state}" data-n="${x.n}"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${x.state === 'unknown' ? 4 : 7}"/>${x.state !== 'unknown' ? `<text x="${px.toFixed(1)}" y="${(py + 3).toFixed(1)}">${x.n}</text>` : ''}${x.out > 0 ? `<text class="out" x="${(px + 9).toFixed(1)}" y="${(py - 6).toFixed(1)}">+${x.out}</text>` : ''}<title>${String(x.n).padStart(2, '0')} ${esc(x.name)}</title></g>`; }).join('');
    const h = `<h4>■ 记录对应结构</h4><p class="dim">每个点是一名唤醒体（按名册编号排列）。线 = “这条记录里写着它的下落”。<span class="lg c">●</span>已复原 <span class="lg k">●</span>已确认 <span class="lg l">●</span>已有人指向、尚未复原 <span class="lg u">●</span>尚无线索。点上的 +N = 这条记录还能推理出的新记录。</p><svg class="graph" viewBox="0 0 340 340">${lines}${dots}</svg><p class="dim">已复原 ${cnt('recovered') + cnt('confirmed')}　·　待复原的线索 ${cnt('lead')}　·　尚无线索 ${cnt('unknown')}</p>`;
    tp.innerHTML = h;
  } else if (ui.tab === 'map') {
    const zones = st.docs.includes('00-ZONE'), cols = G.edition.grid.cols; const when = {}; for (const z of G.zones) when[z.cell] = `${z.day}日${String(z.hour).padStart(2, '0')}:00`;
    const zorder = new Map(); G.zones.forEach((z, i) => zorder.set(z.cell, i));
    const dead = {}; for (const k of st.recovered) dead[G.records[k].cell] = (dead[G.records[k].cell] || 0) + 1;
    let h = `<h4>■ 地图　${G.edition.n === 63 ? '弥萨格复本（密境）' : G.edition.title + '（密境）'}</h4><div class="map" style="grid-template-columns:22px repeat(${cols.length},1fr)"><span></span>` + [...cols].map((c) => `<span class="ax">${c}</span>`).join('');
    for (const r of G.edition.grid.rows) { h += `<span class="ax">${r}</span>`; for (const c of cols) { const id = c + r; h += `<div class="cell ${id === 'C3' && G.edition.n === 63 ? 'c3' : ''}${dead[id] ? ' has' : ''}" style="--i:${zorder.get(id) ?? 0}" data-cell="${id}"><b>${id} ${esc(G.places[id])}</b>${zones ? `<span class="z">封锁 ${when[id]}</span>` : ''}${dead[id] ? `<br><span class="d">复原 ${dead[id]} 条</span>` : ''}</div>`; } }
    tp.innerHTML = h + '</div><p class="dim mapswipe">点一个区块，看这一区死了谁；屏幕太窄时可以左右滑动。</p>' + (zones ? '' : G.noZone ? '<p class="dim">这一卷不设融灾黑潮封锁。</p>' : '<p class="dim">封锁时刻需要先复原 00-ZONE。</p>');
  } else if (ui.tab === 'rep') {
    const recs = st.recovered.map((k) => G.records[k]).sort((a, b) => a.dord - b.dord);
    const cur = ui.rep && G.records[ui.rep] && st.recovered.includes(ui.rep) ? ui.rep : null;
    const sc = stats(G, st);
    let h = `<h4>■ 死亡报告　<small class="dim">确认 ${sc.confirmed}/${sc.total}</small></h4>`;
    h += recs.length ? `<div class="replist">${recs.map((r) => `<button data-rep="${r.key}" class="${cur === r.key ? 'on' : ''}"><span>${r.key}</span><span>${esc(r.name)}</span>${st.confirmed[r.key] ? '<span class="chip ok">确认</span>' : st.wrong[r.key] ? '<span class="chip ng">存在错误的报告</span>' : ''}</button>`).join('')}</div>` : '<p class="dim">还没有复原任何死亡记录。</p>';
    if (cur) {
      const o = options(G, st, cur), ev = evidenceOf(G, cur), d = st.drafts[cur] || {}, done = st.confirmed[cur], sel = (arr, v) => arr.map((x) => `<option value="${x.v}" ${String(v) === x.v ? 'selected' : ''}>${esc(x.t)}</option>`).join('');
      h += `<div class="form"><b>${cur} ${esc(G.records[cur].name)}</b>
        <label>（死因）</label><select data-f="cause" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.causes, d.cause)}</select>
        <label>（凶器）</label><select data-f="weapon" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.weapons, d.weapon)}</select>
        <label>（加害人）</label><select data-f="culprit" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.culprits, d.culprit)}</select>
        <div class="row" style="margin-top:10px"><button class="btn gold" id="bSub" ${done ? 'disabled' : ''}>提交报告</button><button class="btn" id="bHintC">提示</button></div>
        <div class="ev"><button class="chipb" id="bAssist">证据清单 ${pref.assist ? '▾' : '▸'}（辅助）</button>${pref.assist ? `<div class="dim">这条记录里出现过的装备与人物（点击填入）。装备在场，不等于它就是凶器。</div>${ev.items.map((n) => `<button class="chipb" data-pick="weapon:${n}" ${done ? 'disabled' : ''}>◆ ${esc(G.roster[n - 1].item)}</button>`).join('')}${ev.names.map((n) => `<button class="chipb" data-pick="culprit:${n}" ${done ? 'disabled' : ''}>● ${esc(G.roster[n - 1].name)}</button>`).join('')}` : ''}</div>
        <div class="res ${done ? 'ok' : st.wrong[cur] ? 'ng' : ''}" id="repRes">${done ? `<span class="stamp">确认</span> ${esc(summary(G, cur))}` : st.wrong[cur] ? '存在错误的报告。' : ''}</div></div>`;
    }
    tp.innerHTML = h;
  } else if (ui.tab === 'note') {
    const sec = ui.noteSec || 'pad', cards = clueCards(G, st), hits = ui.nq ? search(G, st, ui.nq) : [];
    let h = `<h4>■ 笔记</h4><div class="seg"><button data-ns="pad" class="${sec === 'pad' ? 'on' : ''}">记事本</button><button data-ns="cards" class="${sec === 'cards' ? 'on' : ''}">线索卡 ${cards.length}</button><button data-ns="find" class="${sec === 'find' ? 'on' : ''}">检索</button></div>`;
    if (sec === 'pad') h += `<textarea id="notes" placeholder="在这里记下推理……（自动保存）。写下记录名（如 05-D2-29）可以点击复原。">${esc(st.notes)}</textarea><div class="nlinks">${[...new Set((st.notes.match(/\d{2}-[A-E][1-5]-\d{2}/g) || []))].map((k) => `<span class="lnk" data-go="${k}">${k}</span>`).join(' ')}</div>`;
    if (sec === 'cards') h += cards.length ? `<p class="dim">在阅读时点击段落标记：<i class="m1">线索</i> <i class="m2">证词</i> <i class="m3">矛盾</i>。点卡片回到原文。</p>${cards.map((c) => `<div class="card m${c.c}" data-card="${c.id}"><small>${esc(c.title)} · ${esc(MARK_NAMES[c.c])}</small>${esc(c.text)}</div>`).join('')}` : '<p class="dim">还没有标记任何段落。阅读记录时，点击一个段落即可标记。</p>';
    if (sec === 'find') h += `<div class="row"><input id="nq" placeholder="在已复原的记录中检索（人名 / 地名 / 装备……）" value="${esc(ui.nq || '')}"></div>${ui.nq ? `<p class="dim">${hits.length} 处</p>` : ''}${hits.slice(0, 60).map((c) => `<div class="card" data-card="${c.id}"><small>${esc(c.title)}</small>${esc(c.text).split(esc(ui.nq)).join(`<mark>${esc(ui.nq)}</mark>`)}</div>`).join('')}`;
    tp.innerHTML = h;
    if ($('#notes')) { $('#notes').addEventListener('input', (e) => { st.notes = e.target.value; }); $('#notes').addEventListener('change', () => { save(); renderTools(); }); }
    if ($('#nq')) { $('#nq').addEventListener('input', (e) => { ui.nq = e.target.value; const pos = e.target.selectionStart; renderTools(); const i = $('#nq'); i.focus(); i.setSelectionRange(pos, pos); }); }
  } else if (ui.tab === 'hint') {
    const bd = (st.badges || []).map((id) => `<span class="badge2" title="${esc(G.arcs.find((a) => a.id === id).title)}">${esc(G.arcs.find((a) => a.id === id).badge)}</span>`).join('');
    const ftGoal = Math.max(0, ...G.arcs.filter((a) => a.hidden && a.cond && a.cond.firstTry).map((a) => a.cond.firstTry));
    const ftTxt = ftGoal && !(st.arcs || []).some((id) => G.arcs.find((a) => a.id === id && a.cond && a.cond.firstTry))
      ? `首答正确 <b>${st.firstTry || 0}</b> 份（${Math.min(st.firstTry || 0, ftGoal)}/${ftGoal}，不要求连着）` : '';
    tp.innerHTML = `<h4>■ 提示</h4><p class="dim">提示分三级，越往后越直白；已使用 ${st.hints} 次（每次扣 30 分）。提示券 <b>${st.tokens || 0}</b> 张（解出隐藏档案获得，免费且不扣分）。${ftTxt ? '<br>' + ftTxt + '。' : ''}</p>${G.arcs.some((a) => a.hidden) ? `<h4>■ 勋章 ${(st.badges || []).length}/${G.arcs.filter((a) => a.hidden).length}</h4><div class="badges">${bd || '<span class="dim">还没有勋章。隐藏档案，要靠推理。</span>'}</div>` : ''}<div class="row"><button class="btn" id="hRest">下一步该复原哪条？</button><button class="btn" id="hConf">核实当前报告</button></div><div class="hintlog">${ui.hintLog.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
    $('#hRest').onclick = () => giveHint('restore'); $('#hConf').onclick = () => giveHint('confirm', ui.rep);
  }
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { ui.tab = b.dataset.t; renderTools(); } });
$('#tp').addEventListener('click', (e) => {
  const rb = e.target.closest('[data-rep]'); if (rb) { ui.rep = rb.dataset.rep; renderTools(); return; }
  const pk = e.target.closest('[data-pick]'); if (pk && ui.rep) { const [f, v] = pk.dataset.pick.split(':'); setDraft(st, ui.rep, f, v); save(); renderTools(); renderList(); return; }
  const inf = e.target.closest('[data-inf]'); if (inf) { ui.infer = inf.dataset.inf; renderTools(); return; }
  const ns = e.target.closest('[data-ns]'); if (ns) { ui.noteSec = ns.dataset.ns; renderTools(); return; }
  const gg = e.target.closest('[data-go]'); if (gg && !gg.dataset.n) { const k = gg.dataset.go; if (st.recovered.includes(k)) openReader(k); else doRecover(k); return; }
  const cd = e.target.closest('[data-card]'); if (cd) { openReader(cd.dataset.card); return; }
  const nd = e.target.closest('.nd'); if (nd) { const rec = G.roster[+nd.dataset.n - 1]; if (st.recovered.includes(rec.key)) openReader(rec.key); else toast('这条记录还没有复原。'); return; }
  const cc = e.target.closest('[data-cell]'); if (cc && ui.tab === 'map') { cellInfo(cc.dataset.cell); return; }
  if (e.target.id === 'bAssist') { pref.assist = !pref.assist; savePref(); renderTools(); return; }
  if (e.target.id === 'bSub') doSubmit();
  if (e.target.id === 'bHintC') { ui.tab = 'hint'; giveHint('confirm', ui.rep); }
});
$('#tp').addEventListener('change', (e) => { const f = e.target.dataset.f; if (f && ui.rep) { setDraft(st, ui.rep, f, e.target.value === '' ? null : e.target.value); save(); renderList(); } });
function cellInfo(id) {
  sfx.lock();
  const zone = G.zones.find((z) => z.cell === id);
  const recs = Object.values(G.records).filter((r) => r.cell === id).sort((a, b) => a.dord - b.dord);
  const known = recs.filter((r) => st.recovered.includes(r.key));
  const conf = known.filter((r) => st.confirmed[r.key]).length;
  const m = modal(`<h3>■ ${id}　${esc(G.places[id])}</h3>
    <p class="dim">${zone ? `融灾黑潮：第 ${zone.day} 天 ${String(zone.hour).padStart(2, '0')}:00 封锁${id === 'C3' ? '（最终收缩）' : ''}` : '这一区不设封锁'}</p>
    <p>这一区有 <b>${recs.length}</b> 条记录，已复原 ${known.length} 条、已确认 ${conf} 份。</p>
    ${known.length ? `<div class="celllist">${known.map((r) => `<button class="chipb" data-go="${r.key}">${r.key}　${esc(r.name)}${st.confirmed[r.key] ? ' ✔' : ''}</button>`).join('')}</div>` : '<p class="dim">还没有复原这一区的记录。</p>'}
    <div class="btns"><button class="btn" data-close>关闭</button></div>`);
  m.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => { $('#modal').hidden = true; openReader(b.dataset.go); }; });
}
function giveHint(kind, key) {
  const r = hint(G, st, kind, key);
  if (!r.ok) { toast(r.msg); return; }
  ui.hintLog.unshift(`［${kind === 'restore' ? '复原' : '核实'} ${r.step + 1}/3${r.free ? '·提示券' : ''}］${r.text}`); refreshRate(); ui.tab = 'hint'; renderTools(); save(); sfx.key();
}
function doSubmit() {
  const key = ui.rep, r = submit(G, st, key);
  if (!r.ok) { toast(r.msg); sfx.err(); buzz([14, 40, 14]); return; }
  renderTools();
  if (r.correct) { sfx.stamp(); buzz(24); toast('● 报告已确认'); for (const m of r.arrived || []) { sfx.msg(); toast(/^(AR|HX)-/.test(m) ? `${m.startsWith('HX') ? '隐藏档案' : '新档案'} ${m}　${G.arcs.find((x) => x.id === m).title}` : m === 'MSG06' ? '新消息 MSG06 ——名册已更新：检测到名册之外的个体。' : `新消息 ${m}`, 4200); } if (r.arrived?.includes('MSG07')) { save(); endGame(); return; } if (r.milestone) { save(); resonance(r.milestone); } }
  else { sfx.err(); buzz([16, 46, 16]); }
  renderList(); refreshRate(); save();
}
function reward(w) {
  const a = G.arcs.find((x) => x.id === w.id); sfx.stamp(); sfx.ok(); burst(4);
  modal(`<div class="reso"><h3>■ 隐藏档案　${esc(w.id)}</h3><p class="mline">${esc(a.title)}</p><div class="arcn">勋章　「${esc(w.badge)}」</div><p class="dim">+${w.points} 分　·　提示券 +1（下一次提示免费，不影响评级）</p><div class="btns"><button class="btn" data-close>阅读</button></div></div>`);
  refreshRate();
}
function resonance(m) {
  sfx.bell(); burst(Math.min(5, 1 + Math.floor(m.k / 4)));
  const pct = Math.round((m.confirmed / total(G)) * 100);
  modal(`<div class="reso"><h3>■ 共鸣　${m.k}／${G.milestones.length}</h3><p class="mline">${esc(m.line.replace(/^共鸣 \d+\/\d+　/, ''))}</p><div class="bar"><i style="width:${pct}%"></i></div><p class="dim">已确认 ${m.confirmed}／${total(G)} 份报告</p>${m.arcs.map((a) => `<div class="arcn" data-arc="${a.id}">◆ 新档案 ${a.id}　${esc(a.title)}　<small>（点击阅读）</small></div>`).join('')}${m.nudge.length ? `<div class="nudge">提示（不计入评级）：已复原的记录与档案里，写明了这些人的下落——${m.nudge.map(esc).join('、')}。</div>` : '<div class="nudge">提示（不计入评级）：已复原的记录里没有新的线索了。去读读还没读的系统文档、消息与档案吧。</div>'}<div class="btns"><button class="btn" data-close>继续</button></div></div>`);
  $('#modal').querySelectorAll('[data-arc]').forEach((el) => { el.onclick = () => { $('#modal').hidden = true; openReader(el.dataset.arc); }; });
}
function refreshRate() {
  const s = stats(G, st); $('#score').textContent = `评价 ${s.rating.rank}（${s.rating.total}）${s.hiddenTotal ? `　勋章 ${s.badges}/${s.hiddenTotal}` : ''}`; $('#ratebar').style.width = s.rate + '%'; $('#ratetxt').textContent = `核实率 ${s.rate}%（${s.confirmed}/${s.total}）`;
  $('#bFinish').hidden = !(canFinish(G, st) && s.confirmed < s.total);
}

const META = 'morimens-deathreport-meta-v1';
const meta = () => { try { return JSON.parse(localStorage.getItem(META)) || {}; } catch { return {}; } };
function unlockEditions() { try { localStorage.setItem(META, JSON.stringify({ ...meta(), editions: true })); } catch { /* ignore */ } }
// ---------------------------------------------------------------- ending
let epSkip = false;
async function typeLines(el, lines, speed = 22) {
  for (const l of lines) {
    const d = document.createElement('div');
    el.appendChild(d);
    if (epSkip) { d.textContent = l; continue; }
    for (const ch of l) { d.textContent += ch; if (epSkip) { d.textContent = l; break; } if (speed) await new Promise((r) => setTimeout(r, speed)); if (ch !== ' ') sfx.key(); }
    if (!epSkip) await new Promise((r) => setTimeout(r, 160));
  }
}
let wsResult = null;   // 工坊结案时的成绩，等玩家点「评分」再一起发出去（Waline 限制两条评论的间隔）
async function endGame() {
  const res = finish(G, st), s = stats(G, st); save();
  stopAmbient();
  const box = $('#ending'); box.hidden = false; epSkip = false;
  box.innerHTML = '<pre id="ep"></pre><div class="row" id="epBtns" hidden></div><button class="endskip" id="epSkip">跳过 ▶</button>';
  sfx.heart(); buzz([30, 90, 30]);
  $('#epSkip').onclick = () => { epSkip = true; sfx.bell(); };
  const ep = $('#ep');
  if (WS) {
    const rt = s.rating;
    wsResult = res.ended === 'true' ? { rank: res.rank, score: rt.total, rate: s.rate, hints: s.hints } : null;
    await typeLines(ep, [`《${WS.title}》　记录复原　完毕`, '', '报告　完毕', ''], 26);
    const en = G.endings[0];
    await typeLines(ep, [`■ 结案　${en.title}`, '', ...en.lines], 24);
    await typeLines(ep, ['', `评价 ${res.rank}（${rt.total}）　完成度 ${rt.comp}%　提示节制 ${rt.hint}%`, `核实率 ${s.rate}%　提示 ${s.hints} 次　用时约 ${s.minutes} 分钟`, ''], 20);
    if (res.ended === 'true') await typeLines(ep, ['评分会把这份成绩一起交给作者。', ''], 20);
  } else if (res.ended === 'true' && ED !== 63) {
    const en = G.endings[0], rt = s.rating;
    await typeLines(ep, [`${G.edition.label}　回溯筛选　记录复原　完毕`, '', '报告　完毕', ''], 28);
    await typeLines(ep, [`■ 结局　${en.title}`, '', ...en.lines], 24);
    if (ED === 61) ep.insertAdjacentHTML('beforeend', '<img class="endimg" src="../assets/avatars-q/char-n.webp" alt="N"><div class="dim">N　——　下注的人。</div>');
    await typeLines(ep, ['', `评价 ${res.rank}（${rt.total}）　完成度 ${rt.comp}%　提示节制 ${rt.hint}%`, `核实率 ${s.rate}%　提示 ${s.hints} 次　错误输入 ${s.bad} 次　用时约 ${s.minutes} 分钟`, ''], 20);
    try { localStorage.setItem(META, JSON.stringify({ ...meta(), cleared: { ...(meta().cleared || {}), [ED]: true } })); } catch { /* ignore */ }
  } else if (res.ended === 'true') {
    await typeLines(ep, ['第六十三次　回溯筛选　记录复原　完毕', '对象：弥萨格学院　回溯班', '', '生存者　……　一名', '', '报告　完毕', '', '—— 新收到一条消息 ——', ''], 28);
    for (const ln of G.msgs.find((m) => m.id === 'MSG07').text.split('\n')) await typeLines(ep, [ln], 14);
    const en = G.endings.find((e) => e.id === st.ending) || G.endings.at(-1), rt = s.rating;
    await typeLines(ep, ['', `■ 结局　${en.title}`, '', ...en.lines], 24);
    await typeLines(ep, ['', `评价 ${res.rank}（${rt.total}）　完成度 ${rt.comp}%　提示节制 ${rt.hint}%　隐藏档案 ${rt.hid}%（${s.badges}/${s.hiddenTotal}）`, `核实率 ${s.rate}%　提示 ${s.hints} 次　错误输入 ${s.bad} 次　用时约 ${s.minutes} 分钟`, ''], 20);
    unlockEditions(); try { localStorage.setItem(META, JSON.stringify({ ...meta(), cleared: { ...(meta().cleared || {}), 63: true } })); } catch { /* ignore */ }
  } else {
    await typeLines(ep, ['报告已受理。', `核实率 ${s.rate}%（${s.confirmed}/${s.total}）`, '', '终端里还有没有复原的记录，也有没有对上的报告。', '有一道很小的影子在屏幕边缘停了一下，然后走远了。', '', '……再看看名册上那个糊掉的名字吧。'], 26);
  }
  const b = $('#epBtns'); b.hidden = false; $('#epSkip')?.remove();
  const rateBtn = WS ? `<button class="btn gold" id="eRate">${wsResult ? '评分 · 提交成绩' : '给这份卷宗评分'}</button>` : '';
  b.innerHTML = res.ended === 'true'
    ? `${rateBtn}${G.docs['00-SEALED'] ? '<button class="btn" id="eDoc">查看机密文档</button>' : ''}<button class="btn" id="eTitle">${WS ? '回到工坊' : '回到标题'}</button>`
    : `${rateBtn}<button class="btn gold" id="eCont">继续调查</button><button class="btn" id="eTitle">${WS ? '回到工坊' : '回到标题'}</button>`;
  if ($('#eRate')) $('#eRate').onclick = () => { box.hidden = true; openRate(WS.cs, wsResult); };
  $('#eTitle').onclick = () => { box.hidden = true; toTitle(); };
  if ($('#eDoc')) $('#eDoc').onclick = () => { box.hidden = true; renderList(); openReader('00-SEALED'); };
  if ($('#eCont')) $('#eCont').onclick = () => { st.ended = null; save(); box.hidden = true; startAmbient(); };
}
$('#bFinish').onclick = () => { if (confirm('现在提交最终报告？还有未确认的报告，你将得到一个不完整的结局（之后仍可继续调查）。')) endGame(); };

// ---------------------------------------------------------------- settings / title
function applyPref() { $('#app').classList.toggle('crt-on', pref.crt); document.documentElement.style.fontSize = pref.size + 'px'; document.body.style.fontSize = pref.size + 'px'; setSound(pref.sound); }
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.hidden = false; m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }; return m; }
function settings() {
  modal(`<h3>■ 设置</h3><label><input type="checkbox" id="sCrt" ${pref.crt ? 'checked' : ''}> CRT 滤镜</label><label><input type="checkbox" id="sSnd" ${pref.sound ? 'checked' : ''}> 键入与提示音效</label><label>正文文字大小 <select id="sSize">${[14, 15, 17, 19].map((x) => `<option ${x === pref.size ? 'selected' : ''}>${x}</option>`).join('')}</select></label><div class="btns"><button class="btn" data-close>关闭</button></div>`);
  $('#sCrt').onchange = (e) => { pref.crt = e.target.checked; applyPref(); savePref(); }; $('#sSnd').onchange = (e) => { pref.sound = e.target.checked; applyPref(); savePref(); }; $('#sSize').onchange = (e) => { pref.size = +e.target.value; applyPref(); savePref(); };
}
function help() {
  modal(`<h3>■ 玩法说明</h3><p>你是弥萨格的守密人，手持银钥匙，借助溯梦终端复原${G.edition.help || '“第六十三次回溯筛选”'}里每一个人的死亡记录，并为每一起死亡填写报告：<b>死因、凶器、加害人</b>。</p>
  <p>· 在左侧输入栏键入<b>记录名</b>复原记录。记录名怎么拼，要自己从线索里推——名册、地图、广播与时间都是线索。<br>· 记录的每个段落都可以点击标记。<br>· 记录末尾和索引里的 [X] 表示还有几条参考没有复原；虚线表示正文提到了还没读的系统文档。<br>· 三项全对才会“确认”；填错只会提示“存在错误的报告”。<br>· 每确认一部分报告，会收到新的消息。<br>· 提示分三级，会影响评级。</p><div class="btns"><button class="btn" data-close>明白了</button></div>`);
}
async function loadEdition(n) {
  WS = null; ED = n; G = await (await fetch(EDS[n][0])).json(); buildAuto(); setTheme(n); setAudioTheme(n); setBg('title'); heard.clear();
  try { localStorage.setItem(EDKEY, String(n)); } catch { /* ignore */ }
  document.title = n === 63 ? '弥萨格大逃杀 · 第六十三次回溯筛选' : `弥萨格大逃杀 · ${G.edition.label}回溯筛选（往届）`;
  $('.sub').textContent = n === 63 ? '第六十三次　回溯筛选　完全复原' : G.edition.subtitle + '（往届档案）';
}
function bootTitle() {
  const log = $('#bootlog'); log.textContent = '';
  const lines = G.edition.boot || ['> 记录复原终端　启动中……', '> 钥冢档案室内网　………　已确认（特级）', '> 检测到记录库遭到篡改　部分索引损坏', '> 参加者：六十二名　·　生存者：零', '> 请守密人尽快开始复原。'];
  let i = 0; (function next() { if (i >= lines.length) return; log.textContent += lines[i++] + '\n'; sfx.key(); setTimeout(next, 260); })();
  const un = meta().editions;
  const pv = peekSave();
  const items = [
    ['continue', pv ? `继续调查　已读 ${pv.recovered} 条` : '继续调查', !!pv],
    ['new', pv ? '重新开始' : '新的游戏', true],
    ['eds', un ? '往届档案' : '往届档案　？？？', true],
    ['ws', '工坊　自撰卷宗', true],
    ['settings', '系统设置', true], ['help', '玩法说明', true], ['home', '返回首页', true],
  ].filter((x) => x[2]);
  $('#menu').innerHTML = items.map(([k, t]) => `<button data-m="${k}" class="${k === 'eds' && !un ? 'locked' : ''}${k === 'continue' ? ' cont' : ''}">${t}</button>`).join('');
  const si = $('#saveinfo');
  if (si) si.innerHTML = pv
    ? `上次保存 ${ago(pv.at)}　·　已复原 ${pv.recovered} 条　·　已确认 ${pv.confirmed}/${pv.total} 份报告${pv.ended === 'true' ? '　·　已结案' : ''}<br><span class="dim">进度会自动保存，关掉页面也不会丢。</span>`
    : '还没有存档　·　开始之后每十几秒自动存一次，下次从这里接着读。';
}
function editions() {
  const un = meta().editions, cl = meta().cleared || {};
  if (!un) { modal('<h3>■ 往届档案</h3><p class="dim">档案室的最深处，还有两份更早的备份。读完第六十三次的最后一份报告，才能打开。</p><div class="btns"><button class="btn" data-close>关闭</button></div>'); return; }
  const rows = [[63, '第六十三次　本篇', '六十二名唤醒体 · 钟楼'], [62, '第六十二次　雪夜剧场', '六十三名（全部唤醒体 + 威廉）· 仿造的剧院 · 门口的孩子'], [61, '第六十一次　雾港', '六十三名（全部唤醒体 + 威廉）· 仿造的港口 · 下注的人']];
  modal(`<h3>■ 往届档案</h3><p class="dim">规则相同，世界相同，故事与记录完全不同。每一届有独立存档。</p>${rows.map(([n, t, d]) => `<div class="edrow ${ED === n ? 'on' : ''}"><div><b>${t}</b>${cl[n] ? ' <span class="chip ok">已结案</span>' : ''}<br><small class="dim">${d}</small></div><button class="btn" data-ed="${n}">${ED === n ? '当前' : '切换'}</button></div>`).join('')}<div class="btns"><button class="btn" data-close>关闭</button></div>`);
  $('#modal').querySelectorAll('[data-ed]').forEach((b) => { b.onclick = async () => { await loadEdition(+b.dataset.ed); $('#modal').hidden = true; bootTitle(); }; });
}
$('#menu').addEventListener('click', (e) => {
  const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
  if (m === 'continue') start(loadSave());
  if (m === 'new') { if (hasSave() && !confirm('开始新的游戏会覆盖当前存档，确定吗？')) return; start(null); }
  if (m === 'eds') editions();
  if (m === 'ws') openWorkshop();
  if (m === 'settings') settings(); if (m === 'help') help(); if (m === 'home') location.href = '../index.html';
});

// ---------------------------------------------------------------- 工坊入口
function openWorkshop(t = 'mine') { $('#title').hidden = true; $('#game').hidden = true; $('#ws').hidden = false; openWs(t); }
function toMainTitle() { $('#ws').hidden = true; $('#title').hidden = false; setBg('title'); stopAmbient(); bootTitle(); }

// 把一份卷宗编译成 G 直接开打；存档按卷宗分开，玩到一半退出下次还在
function enterWorkshop(cs) {
  const v = validate(cs);
  if (v.errors.length) { toast(`这份卷宗还有 ${v.errors.length} 处必须修：${v.errors[0]}`); return; }
  G = toGame(cs);
  WS = { id: cs.id, title: cs.t, author: cs.a, cs };
  ED = 'w';
  buildAuto(); setTheme(63); setAudioTheme(63); heard.clear();
  document.title = `${cs.t} · 工坊卷宗`;
  $('#title').hidden = true; $('#ws').hidden = true; $('#game').hidden = false;
  start(loadSave());
}

// ?w=<id> 直接打开云端某一份卷宗，分享出去别人点开就能玩
async function openShared(id) {
  toast('正在从云端取这份卷宗…', 3000);
  const r = await cloud.list();
  if (!r.ok) { toast(`云端取不到：${r.err}`, 3600); return; }
  const w = r.works.find((x) => x.cs.id === id);
  if (!w) { toast('这份卷宗已经不在云端了（可能被作者撤回）。', 4000); return; }
  enterWorkshop(w.cs);
}
function toTitle() {
  save();
  $('#game').hidden = true; $('#modal').hidden = true; stopAmbient();
  // 从工坊进来的，退出就回工坊；正篇才回标题页
  if (WS) { WS = null; $('#title').hidden = true; $('#ws').hidden = false; openWs(); return; }
  $('#title').hidden = false; $('#ws').hidden = true; setBg('title'); bootTitle();
}
$('#bTitle').onclick = toTitle; $('#bSave').onclick = () => { save(); toast('已保存。'); }; $('#bSet').onclick = settings;
function start(saved) {
  st = saved || newGame(G); if (!saved) { try { localStorage.removeItem(saveKey()); } catch { /* ignore */ } }
  ui = { sel: null, sort: 'order', tab: 'ros', rep: null, pane: 'idx', hintLog: [], q: '', t0: Date.now(), ...(saved && saved.ui ? saved.ui : {}) };
  const wantPane = ui.pane;   // showPane('idx') 会改写 ui.pane，先把上次的面板记下来
  $('#title').hidden = true; $('#game').hidden = false; $('#rdHead').innerHTML = ''; $('#rdBody').innerHTML = '<p class="dim">在索引里选择记录，或在上方键入记录名。</p>';
  setBg('read'); startAmbient();
  showPane('idx'); renderList(); renderTools(); refreshRate(); save(true);
  const back = saved && saved.ui && saved.ui.sel;
  if (!saved) { openReader('00-ORDER'); if (!WS) { toast('新消息 MSG01', 3000); sfx.msg(); } }
  else if (back && (G.records[back] || G.docs[back] || G.msgs.some((m) => m.id === back) || (G.arcs || []).some((a) => a.id === back))) {
    openReader(back, true);
    if (wantPane && wantPane !== 'rd') showPane(wantPane);   // 上次停在哪个面板就回哪个面板
    toast(`接着上次的进度：已确认 ${stats(G, st).confirmed}/${stats(G, st).total} 份报告`, 3200);
  } else if (st.ended === 'true') toast('案件已结案。', 2400);
  else toast('已读取存档。', 2200);
}
(async () => {
  applyPref();
  startBg();
  // 回上次那一届（只在该届确实有存档时才回；没存档就回本篇，免得开局面对一份空档案）
  let n = 63;
  try { const v = +localStorage.getItem(EDKEY); if ((v === 62 || v === 61) && localStorage.getItem(EDS[v][1])) n = v; } catch { /* ignore */ }
  await loadEdition(n);
  sanitizeSave();
  initWs({ play: enterWorkshop, toast, modal, close: toMainTitle });
  bindWs();
  window.__dr = { get G() { return G; }, get st() { return st; } };
  // 分享链接：?w=<卷宗id> 直接把那一卷拉下来开打
  const want = new URLSearchParams(location.search).get('w');
  if (want) { openWorkshop('cloud'); openShared(want); return; }
  bootTitle();
})();
// 浏览器不允许自动播放：第一次交互时解锁音频，之后环境音才会响
const firstGesture = () => {
  unlockAudio();
  if (!$('#game').hidden) startAmbient();
  document.removeEventListener('pointerdown', firstGesture);
  document.removeEventListener('keydown', firstGesture);
};
document.addEventListener('pointerdown', firstGesture);
document.addEventListener('keydown', firstGesture);
// 自动保存：每 12 秒落一次盘，切后台 / 关页面再补一次。
// beforeunload 在手机浏览器上常常不触发，pagehide 更可靠——两个都挂，重复写一次也不要紧。
setInterval(() => { if (st && !$('#game').hidden) save(true); }, 12000);
document.addEventListener('visibilitychange', () => { if (st && document.hidden) save(true); });
window.addEventListener('pagehide', () => { if (st && !$('#game').hidden) save(true); });
window.addEventListener('beforeunload', () => { if (st && !$('#game').hidden) save(true); });

// 登录了本站账号就把存档同步到云端（站点根目录的 js/gamecloud.js；这个页面不是打包的，用相对路径动态引入）
import('../../js/gamecloud.js').then((m) => m.startGameCloud('deathreport')).catch(() => { /* 离线 / 独立部署时没有这个文件，忽略 */ });
