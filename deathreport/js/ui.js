import { newGame, recover, index, options, setDraft, submit, rosterView, hint, finish, canFinish, stats, summary, confirmedCount, total, unrecoveredRefs, shadowUnlocked } from './engine.js';

const SAVE = 'morimens-deathreport-save-v1', PREF = 'morimens-deathreport-pref-v1';
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let G, st, ui = { sel: null, sort: 'order', tab: 'ros', rep: null, pane: 'idx', hintLog: [], q: '' };
let pref = { crt: true, size: 15, sound: true, ...(() => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } })() };
const savePref = () => { try { localStorage.setItem(PREF, JSON.stringify(pref)); } catch { /* ignore */ } };
const hasSave = () => { try { return !!localStorage.getItem(SAVE); } catch { return false; } };
const save = () => { try { st.playMs += Date.now() - (ui.t0 || Date.now()); ui.t0 = Date.now(); localStorage.setItem(SAVE, JSON.stringify(st)); } catch { /* ignore */ } };
const loadSave = () => { try { const j = JSON.parse(localStorage.getItem(SAVE)); if (j && j.v === 1) return j; } catch { /* ignore */ } return null; };

// ---------------------------------------------------------------- audio (tiny synth)
let ac;
function tone(f, d = 0.05, v = 0.04, type = 'square', at = 0) {
  if (!pref.sound) return;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + at; o.type = type; o.frequency.value = f; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d + 0.02); } catch { /* ignore */ }
}
const sfx = { key: () => tone(400 + Math.random() * 200, 0.025, 0.025), ok: () => { tone(660, 0.08); tone(990, 0.12, 0.04, 'square', 0.08); }, err: () => tone(140, 0.18, 0.06, 'sawtooth'), stamp: () => { tone(90, 0.2, 0.12, 'sine'); tone(180, 0.08, 0.06, 'square'); }, msg: () => { [523, 659, 784].forEach((f, i) => tone(f, 0.12, 0.04, 'triangle', i * 0.09)); } };
function toast(t, ms = 2600) { const d = document.createElement('div'); d.textContent = t; $('#toast').appendChild(d); setTimeout(() => d.remove(), ms); }

// ---------------------------------------------------------------- markup
function paras(text, id) {
  const hl = new Set(st.hl[id] || []); let n = 0, html = '';
  const inline = (s) => esc(s).replace(/\[b\](.*?)\[\/b\]/g, '<b>$1</b>').replace(/\[link\]([^[]+)\[\/link\]/g, '<span class="lnk" data-go="$1">$1</span>').replace(/(·?)(\d{2}|\?\?)-([A-E][1-5]|\?\?)-(\d{2}|\?\?)/g, (m) => (m.includes('??') ? `<span class="lnk" data-fill="${m.replace('·', '')}">${m}</span>` : m));
  for (const blk of text.split(/(\[sys\][\s\S]*?\[\/sys\])/)) {
    if (!blk.trim()) continue;
    if (blk.startsWith('[sys]')) { const inner = blk.slice(5, -6).trim(); html += `<div class="sys">${inner.split('\n').map((l) => `<p>${inline(l) || '&nbsp;'}</p>`).join('')}</div>`; continue; }
    for (const l of blk.split('\n')) { if (!l.trim()) continue; html += `<p data-i="${n}" class="${hl.has(n) ? 'hl' : ''}">${inline(l)}</p>`; n++; }
  }
  return html;
}
function openReader(id) {
  ui.sel = id; const head = $('#rdHead'), body = $('#rdBody');
  const rec = G.records[id], doc = G.docs[id], msg = G.msgs.find((m) => m.id === id);
  if (rec) { head.innerHTML = `<b>${id}</b> | ${esc(rec.name)} | ${esc(rec.when)}<small>${esc(rec.cell)} ${esc(G.places[rec.cell])}　NO.${String(rec.num).padStart(2, '0')}</small>`; body.innerHTML = paras(rec.text, id); }
  else if (doc) { head.innerHTML = `<b>${id}</b> | ${esc(doc.title)} | ${esc(doc.source)}`; body.innerHTML = paras(doc.text, id); }
  else if (msg) { head.innerHTML = `<b>${id}</b> | 发件人不明 | --`; body.innerHTML = paras(msg.text, id); }
  const x = unrecoveredRefs(G, st, id);
  if (x > 0) body.insertAdjacentHTML('beforeend', `<p class="notice">-- 检测到对其他记忆的参考。未复原 ${x} 件 --</p>`);
  body.parentElement.scrollTop = 0;
  showPane('rd'); renderList();
}
$('#rdBody').addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'); if (go) { doRecover(go.dataset.go); return; }
  const fill = e.target.closest('[data-fill]'); if (fill) { $('#recIn').value = fill.dataset.fill; showPane('idx'); $('#recIn').focus(); return; }
  const p = e.target.closest('p[data-i]'); if (!p || !ui.sel) return;
  const a = (st.hl[ui.sel] ||= []), i = +p.dataset.i, at = a.indexOf(i);
  if (at >= 0) a.splice(at, 1); else a.push(i);
  p.classList.toggle('hl'); sfx.key(); save();
});

// ---------------------------------------------------------------- index
function renderList() {
  let items = index(G, st);
  if (ui.sort === 'name') items.sort((a, b) => String(a.title).localeCompare(String(b.title), 'zh') || a.id.localeCompare(b.id));
  if (ui.sort === 'refs') items.sort((a, b) => b.refs - a.refs);
  const msgR = items.filter((i) => i.kind === 'msg'), recR = items.filter((i) => i.kind !== 'msg');
  $('#list').innerHTML = [...recR, ...msgR].map((it) => `<li data-id="${it.id}" class="${it.kind === 'doc' ? 'sys' : it.kind === 'msg' ? 'msg' : ''} ${it.dotted ? 'dotted' : ''} ${ui.sel === it.id ? 'on' : ''}"><span class="badge">${it.refs > 0 ? `[${it.refs}]` : ''}</span><span class="id">${it.id}</span><span class="t">${esc(it.title)}${it.when ? ' ' + esc(it.when) : ''}</span>${it.status ? `<span class="chip ${it.status}">${{ ok: '确认', ng: '有误', draft: '待核' }[it.status]}</span>` : ''}</li>`).join('');
}
$('#list').addEventListener('click', (e) => { const li = e.target.closest('li'); if (li) openReader(li.dataset.id); });
document.querySelector('.sortbar').addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; ui.sort = b.dataset.sort; document.querySelectorAll('.sortbar button').forEach((x) => x.classList.toggle('on', x === b)); renderList(); });
function doRecover(name) {
  const before = st.recovered.length;
  const r = recover(G, st, name);
  const msg = $('#recMsg'); msg.textContent = r.msg; msg.className = 'msg ' + (r.ok ? '' : 'err');
  if (r.ok) { sfx.ok(); if (!r.again) toast(r.kind === 'doc' ? '● 已复原系统文档' : '● 已复原死亡记录'); $('#recIn').value = ''; openReader(r.id); if (st.recovered.length > before) save(); else save(); }
  else sfx.err();
  renderList(); renderTools(); refreshRate();
}
$('#recForm').addEventListener('submit', (e) => { e.preventDefault(); doRecover($('#recIn').value); });
$('#recIn').addEventListener('keydown', () => sfx.key());
function showPane(p) { ui.pane = p; document.querySelectorAll('.pane').forEach((x) => x.classList.toggle('show', x.id === p)); document.querySelectorAll('#tabsm button').forEach((b) => b.classList.toggle('on', b.dataset.p === p)); }
$('#tabsm').addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (b) showPane(b.dataset.p); });

// ---------------------------------------------------------------- tools
const REALM = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' }, ROLE = { ASSAULT: '突击', WARDEN: '守护', CHORUS: '合唱' };
function renderTools() {
  const tp = $('#tp'); document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === ui.tab));
  if (ui.tab === 'ros') {
    const q = ui.q.trim().toLowerCase(), rows = rosterView(G, st).filter((p) => !q || p.shownName.toLowerCase().includes(q) || String(p.n) === q || p.item.toLowerCase().includes(q) || REALM[p.realm].includes(q) || ROLE[p.role].includes(q));
    tp.innerHTML = `<h4>■ 唤醒体名册（${G.roster.length} 名）</h4><div class="row"><input id="rq" placeholder="搜索 姓名 / 编号 / 装备 / 界域" value="${esc(ui.q)}"></div><div class="ros">${rows.map((p) => `<div class="rr ${p.melted ? 'melt' : ''}"><span class="no">${String(p.n).padStart(2, '0')}</span>${p.avatar ? `<img class="av" loading="lazy" src="../${p.avatar}" alt="">` : '<span></span>'}<span class="nm">${p.melted ? '▇▇（融蚀）' : esc(p.shownName)} <small class="dim">${REALM[p.realm]}／${ROLE[p.role]}</small>${st.confirmed[p.key] ? '<span class="st">✔</span>' : p.recordKnown ? '<span class="st" style="color:var(--amb)">●</span>' : ''}</span><span class="it">${p.itemImg ? `<img src="../${p.itemImg}" alt="">` : ''}配发: ${p.melted ? '（融蚀）' : esc(p.item)}</span></div>`).join('')}</div>`;
    $('#rq').addEventListener('input', (e) => { ui.q = e.target.value; const pos = e.target.selectionStart; renderTools(); const i = $('#rq'); i.focus(); i.setSelectionRange(pos, pos); });
  } else if (ui.tab === 'map') {
    const zones = st.docs.includes('00-ZONE'), cols = 'ABCDE'; const when = {}; for (const z of G.zones) when[z.cell] = `${z.day}日${String(z.hour).padStart(2, '0')}:00`;
    const dead = {}; for (const k of st.recovered) dead[G.records[k].cell] = (dead[G.records[k].cell] || 0) + 1;
    let h = '<h4>■ 地图　忘岛</h4><div class="map"><span></span>' + [...cols].map((c) => `<span class="ax">${c}</span>`).join('');
    for (let r = 1; r <= 5; r++) { h += `<span class="ax">${r}</span>`; for (const c of cols) { const id = c + r; h += `<div class="cell ${id === 'C3' ? 'c3' : ''}"><b>${id} ${esc(G.places[id])}</b>${zones ? `<span class="z">封锁 ${when[id]}</span>` : ''}${dead[id] ? `<br><span class="d">复原 ${dead[id]} 条</span>` : ''}</div>`; } }
    tp.innerHTML = h + '</div>' + (zones ? '' : '<p class="dim">封锁时刻需要先复原 00-ZONE。</p>');
  } else if (ui.tab === 'rep') {
    const recs = st.recovered.map((k) => G.records[k]).sort((a, b) => a.dord - b.dord);
    const cur = ui.rep && G.records[ui.rep] && st.recovered.includes(ui.rep) ? ui.rep : null;
    const sc = stats(G, st);
    let h = `<h4>■ 死亡报告　<small class="dim">确认 ${sc.confirmed}/${sc.total}</small></h4>`;
    h += recs.length ? `<div class="replist">${recs.map((r) => `<button data-rep="${r.key}" class="${cur === r.key ? 'on' : ''}"><span>${r.key}</span><span>${esc(r.name)}</span>${st.confirmed[r.key] ? '<span class="chip ok">确认</span>' : st.wrong[r.key] ? '<span class="chip ng">存在错误的报告</span>' : ''}</button>`).join('')}</div>` : '<p class="dim">还没有复原任何死亡记录。</p>';
    if (cur) {
      const o = options(G, st), d = st.drafts[cur] || {}, done = st.confirmed[cur], sel = (arr, v) => arr.map((x) => `<option value="${x.v}" ${String(v) === x.v ? 'selected' : ''}>${esc(x.t)}</option>`).join('');
      h += `<div class="form"><b>${cur} ${esc(G.records[cur].name)}</b>
        <label>（死因）</label><select data-f="cause" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.causes, d.cause)}</select>
        <label>（凶器）</label><select data-f="weapon" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.weapons, d.weapon)}</select>
        <label>（加害人）</label><select data-f="culprit" ${done ? 'disabled' : ''}><option value="">——</option>${sel(o.culprits, d.culprit)}</select>
        <div class="row" style="margin-top:10px"><button class="btn gold" id="bSub" ${done ? 'disabled' : ''}>提交报告</button><button class="btn" id="bHintC">提示</button></div>
        <div class="res ${done ? 'ok' : st.wrong[cur] ? 'ng' : ''}" id="repRes">${done ? `<span class="stamp">确认</span> ${esc(summary(G, cur))}` : st.wrong[cur] ? '存在错误的报告。' : ''}</div></div>`;
    }
    tp.innerHTML = h;
  } else if (ui.tab === 'note') {
    tp.innerHTML = `<h4>■ 记事本</h4><textarea id="notes" placeholder="在这里记下推理……（自动保存）">${esc(st.notes)}</textarea>`;
    $('#notes').addEventListener('input', (e) => { st.notes = e.target.value; });
    $('#notes').addEventListener('change', save);
  } else if (ui.tab === 'hint') {
    tp.innerHTML = `<h4>■ 提示</h4><p class="dim">提示分三级，越往后越直白；已使用 ${st.hints} 次（影响最终评级）。</p><div class="row"><button class="btn" id="hRest">下一步该复原哪条？</button><button class="btn" id="hConf">核实当前报告</button></div><div class="hintlog">${ui.hintLog.map((x) => `<div>${esc(x)}</div>`).join('')}</div>`;
    $('#hRest').onclick = () => giveHint('restore'); $('#hConf').onclick = () => giveHint('confirm', ui.rep);
  }
}
$('#tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) { ui.tab = b.dataset.t; renderTools(); } });
$('#tp').addEventListener('click', (e) => {
  const rb = e.target.closest('[data-rep]'); if (rb) { ui.rep = rb.dataset.rep; renderTools(); return; }
  if (e.target.id === 'bSub') doSubmit();
  if (e.target.id === 'bHintC') { ui.tab = 'hint'; giveHint('confirm', ui.rep); }
});
$('#tp').addEventListener('change', (e) => { const f = e.target.dataset.f; if (f && ui.rep) { setDraft(st, ui.rep, f, e.target.value === '' ? null : e.target.value); save(); renderList(); } });
function giveHint(kind, key) {
  const r = hint(G, st, kind, key);
  if (!r.ok) { toast(r.msg); return; }
  ui.hintLog.unshift(`［${kind === 'restore' ? '复原' : '核实'} ${r.step + 1}/3］${r.text}`); ui.tab = 'hint'; renderTools(); save(); sfx.key();
}
function doSubmit() {
  const key = ui.rep, r = submit(G, st, key);
  if (!r.ok) { toast(r.msg); sfx.err(); return; }
  renderTools();
  if (r.correct) { sfx.stamp(); toast('● 报告已确认'); for (const m of r.arrived || []) { sfx.msg(); toast(m === 'MSG06' ? '新消息 MSG06 ——名册已更新：检测到名册之外的个体。' : `新消息 ${m}`, 4200); } if (r.arrived?.includes('MSG07')) { save(); endGame(); return; } }
  else sfx.err();
  renderList(); refreshRate(); save();
}
function refreshRate() {
  const s = stats(G, st); $('#ratebar').style.width = s.rate + '%'; $('#ratetxt').textContent = `核实率 ${s.rate}%（${s.confirmed}/${s.total}）`;
  $('#bFinish').hidden = !(canFinish(G, st) && s.confirmed < s.total);
}

// ---------------------------------------------------------------- ending
async function typeLines(el, lines, speed = 22) {
  for (const l of lines) { const d = document.createElement('div'); el.appendChild(d); for (const ch of l) { d.textContent += ch; if (speed) await new Promise((r) => setTimeout(r, speed)); if (ch !== ' ') sfx.key(); } await new Promise((r) => setTimeout(r, 160)); }
}
async function endGame() {
  const res = finish(G, st), s = stats(G, st); save();
  const box = $('#ending'); box.hidden = false; box.innerHTML = '<pre id="ep"></pre><div class="row" id="epBtns" hidden></div>';
  const ep = $('#ep');
  if (res.ended === 'true') {
    await typeLines(ep, ['第六十三次　回溯筛选　记录复原　完毕', '对象：弥萨格学院　回溯班', '', '生存者　……　一名', '', '报告　完毕', '', '—— 新收到一条消息 ——', ''], 28);
    for (const ln of G.msgs.find((m) => m.id === 'MSG07').text.split('\n')) await typeLines(ep, [ln], 14);
    await typeLines(ep, ['', `评级 ${res.rank}　　核实率 ${s.rate}%　提示 ${s.hints} 次　错误输入 ${s.bad} 次　用时约 ${s.minutes} 分钟`, '', '回溯，启动。'], 24);
  } else {
    await typeLines(ep, ['报告已受理。', `核实率 ${s.rate}%（${s.confirmed}/${s.total}）`, '', '终端里还有没有复原的记录，也有没有对上的报告。', '有一道很小的影子在屏幕边缘停了一下，然后走远了。', '', '……再看看名册上那个糊掉的名字吧。'], 26);
  }
  const b = $('#epBtns'); b.hidden = false;
  b.innerHTML = res.ended === 'true' ? '<button class="btn" id="eDoc">查看机密文档</button><button class="btn" id="eTitle">回到标题</button>' : '<button class="btn gold" id="eCont">继续调查</button><button class="btn" id="eTitle">回到标题</button>';
  $('#eTitle').onclick = () => { box.hidden = true; toTitle(); };
  if ($('#eDoc')) $('#eDoc').onclick = () => { box.hidden = true; renderList(); openReader('00-SEALED'); };
  if ($('#eCont')) $('#eCont').onclick = () => { st.ended = null; save(); box.hidden = true; };
}
$('#bFinish').onclick = () => { if (confirm('现在提交最终报告？还有未确认的报告，你将得到一个不完整的结局（之后仍可继续调查）。')) endGame(); };

// ---------------------------------------------------------------- settings / title
function applyPref() { $('#app').classList.toggle('crt-on', pref.crt); document.documentElement.style.fontSize = pref.size + 'px'; document.body.style.fontSize = pref.size + 'px'; }
function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="mbox">${html}</div>`; m.hidden = false; m.onclick = (e) => { if (e.target === m || e.target.closest('[data-close]')) m.hidden = true; }; return m; }
function settings() {
  modal(`<h3>■ 设置</h3><label><input type="checkbox" id="sCrt" ${pref.crt ? 'checked' : ''}> CRT 滤镜</label><label><input type="checkbox" id="sSnd" ${pref.sound ? 'checked' : ''}> 键入与提示音效</label><label>正文文字大小 <select id="sSize">${[14, 15, 17, 19].map((x) => `<option ${x === pref.size ? 'selected' : ''}>${x}</option>`).join('')}</select></label><div class="btns"><button class="btn" data-close>关闭</button></div>`);
  $('#sCrt').onchange = (e) => { pref.crt = e.target.checked; applyPref(); savePref(); }; $('#sSnd').onchange = (e) => { pref.sound = e.target.checked; savePref(); }; $('#sSize').onchange = (e) => { pref.size = +e.target.value; applyPref(); savePref(); };
}
function help() {
  modal(`<h3>■ 玩法说明</h3><p>你是第七档案局的档案官，要复原“第六十三次回溯筛选”里每一个人的死亡记录，并为每一起死亡填写报告：<b>死因、凶器、加害人</b>。</p>
  <p>· 在左侧输入栏键入<b>记录名</b>复原记录。记录名怎么拼，要自己从线索里推——名册、地图、广播与时间都是线索。<br>· 记录的每个段落都可以点击标记。<br>· 记录末尾和索引里的 [X] 表示还有几条参考没有复原；虚线表示正文提到了还没读的系统文档。<br>· 三项全对才会“确认”；填错只会提示“存在错误的报告”。<br>· 每确认一部分报告，会收到新的消息。<br>· 提示分三级，会影响评级。</p><div class="btns"><button class="btn" data-close>明白了</button></div>`);
}
function bootTitle() {
  const log = $('#bootlog'); log.textContent = '';
  const lines = ['> 记录复原终端　启动中……', '> 内网链路　………　已确认（特级）', '> 检测到记录库遭到篡改　部分索引损坏', '> 参加者：六十二名　·　生存者：零', '> 请档案官尽快开始复原。'];
  let i = 0; (function next() { if (i >= lines.length) return; log.textContent += lines[i++] + '\n'; sfx.key(); setTimeout(next, 260); })();
  const items = [['continue', '继续调查', hasSave()], ['new', '新的游戏', true], ['settings', '系统设置', true], ['help', '玩法说明', true], ['home', '返回首页', true]].filter((x) => x[2]);
  $('#menu').innerHTML = items.map(([k, t]) => `<button data-m="${k}">${t}</button>`).join('');
}
$('#menu').addEventListener('click', (e) => {
  const m = e.target.closest('[data-m]')?.dataset.m; if (!m) return;
  if (m === 'continue') start(loadSave());
  if (m === 'new') { if (hasSave() && !confirm('开始新的游戏会覆盖当前存档，确定吗？')) return; start(null); }
  if (m === 'settings') settings(); if (m === 'help') help(); if (m === 'home') location.href = '../index.html';
});
function toTitle() { save(); $('#game').hidden = true; $('#title').hidden = false; bootTitle(); }
$('#bTitle').onclick = toTitle; $('#bSave').onclick = () => { save(); toast('已保存。'); }; $('#bSet').onclick = settings;
function start(saved) {
  st = saved || newGame(G); if (!saved) { try { localStorage.removeItem(SAVE); } catch { /* ignore */ } }
  ui = { sel: null, sort: 'order', tab: 'ros', rep: null, pane: 'idx', hintLog: [], q: '', t0: Date.now() };
  $('#title').hidden = true; $('#game').hidden = false; $('#rdHead').innerHTML = ''; $('#rdBody').innerHTML = '<p class="dim">在左侧选择记录，或在输入栏里键入记录名。</p>';
  showPane('idx'); renderList(); renderTools(); refreshRate(); save();
  if (!saved) { openReader('00-ORDER'); toast('新消息 MSG01', 3000); sfx.msg(); } else if (st.ended === 'true') toast('案件已结案。', 2400);
}
(async () => {
  applyPref();
  G = await (await fetch('data/game.json')).json();
  window.__dr = { get G() { return G; }, get st() { return st; } };
  bootTitle();
})();
document.addEventListener('visibilitychange', () => { if (st && document.hidden) save(); });
window.addEventListener('beforeunload', () => { if (st && !$('#game').hidden) save(); });
