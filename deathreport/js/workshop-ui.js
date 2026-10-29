// 工坊界面：我的卷宗 / 云端工坊 / 编辑器。
// 刻意不复用主界面的三栏布局——写卷宗是另一种活儿，需要大块表单和实时体检。
import { blank, sample, sanitize, validate, compile, PLACES, CAUSES, MIN_PEOPLE, MAX_PEOPLE, MAX_TEXT, MAX_TOTAL, nameOf, newId, decodeWork } from './workshop.js';
import * as cloud from './cloud.js';

const LS = 'morimens-deathreport-workshop-v1';
const NICK = 'morimens-deathreport-ws-nick';
const DEV = 'morimens-deathreport-ws-dev';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (s, r = document) => r.querySelector(s);
const pad2 = (n) => String(n).padStart(2, '0');

let ctx = { play: null, toast: () => {}, close: null };
let store = { v: 1, drafts: {}, up: {}, mine: [] };
let tab = 'mine', editing = null, cloudData = null, busy = '', starSel = 0, rateFor = null;

export const nick = () => { try { return localStorage.getItem(NICK) || ''; } catch { return ''; } };
const setNick = (v) => { try { localStorage.setItem(NICK, String(v).slice(0, 20)); } catch { /* ignore */ } };
const devId = () => {
  try { let d = localStorage.getItem(DEV); if (!d) { d = Math.random().toString(36).slice(2, 10); localStorage.setItem(DEV, d); } return d; } catch { return 'anon'; }
};

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(LS));
    if (j && typeof j === 'object') {
      store = { v: 1, drafts: {}, up: j.up || {}, mine: Array.isArray(j.mine) ? j.mine : [] };
      for (const [id, cs] of Object.entries(j.drafts || {})) { const s = sanitize(cs); if (s) store.drafts[id] = s; }
    }
  } catch { /* ignore */ }
}
let ft = 0;
function flush() {
  clearTimeout(ft);
  ft = setTimeout(() => { try { localStorage.setItem(LS, JSON.stringify(store)); } catch { /* 配额满就算了 */ } }, 500);
}
function flushNow() { clearTimeout(ft); try { localStorage.setItem(LS, JSON.stringify(store)); } catch { /* ignore */ } }

const mineList = () => Object.keys(store.drafts).map((id) => store.drafts[id]).sort((a, b) => (b.at || 0) - (a.at || 0));
const uploaded = (cs) => store.up[cs.id] && (store.up[cs.id].at || 0) >= (cs.at || 0);
// 云端开了反垃圾时，提交成功也可能只是进了审核队列，界面上要分开说
const upState = (cs) => (store.up[cs.id]?.status && store.up[cs.id].status !== 'approved' ? '待审核' : '已发布');

export function initWs(deps) { ctx = { ...ctx, ...deps }; load(); }

// 不带参数 = 保留上次所在的页签（从云端开玩退出后回到云端，而不是跳回「我的卷宗」）
export function openWs(t) { if (t) tab = t; editing = null; render(); }

// ---------------------------------------------------------------- 骨架
export function render() {
  const body = $('#wsBody'); if (!body) return;
  document.querySelectorAll('#wsTabs button').forEach((b) => b.classList.toggle('on', b.dataset.wt === tab));
  if (editing) { body.innerHTML = viewEditor(editing); return; }
  body.innerHTML = tab === 'mine' ? viewMine() : tab === 'cloud' ? viewCloud() : viewHelp();
}

const viewHelp = () => `<div class="wsdoc">
<h3>■ 工坊是什么</h3>
<p>写一份自己的卷宗：定几个人、给他们配一样东西、各自写一段死前看到的文字，再悄悄定下每一起死亡的<b>死因、凶器、加害人</b>。别人来读、来填报告，你写的答案就是唯一的标准答案。</p>
<p>规则和主篇完全一样：记录名 = <b>死亡先后 + 区块 + 名册编号</b>（例如 <code>03-B2-07</code>），玩家要靠别人的正文里那句“他是第几个、死在哪”把名字拼出来。</p>
<h3>■ 三步</h3>
<p><b>一、写。</b>先定名册（3–12 人），再给每个人写一段记录。正文里出现谁的名字，就自动成为一条线索。</p>
<p><b>二、体检。</b>右侧会实时告诉你：谁永远读不到、谁的线索拼不出记录名、哪条正文没提到任何人。红了就发布不了。</p>
<p><b>三、发布。</b>存本地草稿随时能改；上传后进云端工坊，其他人可以下载来玩，并留下评分。</p>
<h3>■ 几条经验</h3>
<p>· 正文只说“我”看到的东西，别写上帝视角。<br>· 提到某人时，顺手写清“他死在哪儿、他是第几个死的”，玩家才拼得出记录名。<br>· 留一个活人当凶手很好用——名册上没死的人，一样可以进加害人栏。<br>· 加害人填“其他”，就是自杀、失足、塌方这一类，不要再选一个人。</p>
<div class="row"><button class="btn gold" data-act="new">写一份卷宗</button><button class="btn" data-act="sample">填入示例看看</button></div>
</div>`;

const viewMine = () => {
  const list = mineList();
  return `<div class="wsbar"><button class="btn gold" data-act="new">新建卷宗</button><button class="btn" data-act="sample">填入示例</button><label class="btn">导入<input id="wsImp" type="file" accept=".json,application/json" hidden></label><span class="grow"></span><span class="dim">草稿只存在这台设备上</span></div>
  ${list.length ? `<div class="wscards">${list.map(cardMine).join('')}</div>` : '<p class="dim wsnone">还没有卷宗。点“新建卷宗”，或者先“填入示例”看看一份完整的卷宗长什么样。</p>'}
  <p class="dim wsfoot">导出的 JSON 可以发给朋友，对方用“导入”就能读；不想走云端也行。</p>`;
};

function cardMine(cs) {
  const v = validate(cs);
  const bad = v.errors.length, warn = v.warns.length;
  const up = uploaded(cs);
  return `<div class="wscard">
    <div class="wsh"><b>${esc(cs.t || '（未命名）')}</b>${up ? `<span class="chip ${upState(cs) === '已发布' ? 'ok' : 'amb'}">${upState(cs)}</span>` : '<span class="chip">草稿</span>'}${bad ? '<span class="chip ng">有待修</span>' : warn ? '<span class="chip amb">可发布·有提醒</span>' : '<span class="chip ok">可发布</span>'}</div>
    <p class="dim">${cs.r.length} 条记录　·　${cs.p.length} 人名册　·　${esc(cs.b || '没有简介')}</p>
    <p class="dim small">${bad ? `✕ ${bad} 处必须修：${esc(v.errors[0])}` : warn ? `！${warn} 条提醒：${esc(v.warns[0])}` : '体检通过。'}</p>
    <div class="wsbtns">
      <button class="btn" data-act="edit" data-id="${cs.id}">继续写</button>
      <button class="btn" data-act="test" data-id="${cs.id}" ${bad ? 'disabled' : ''}>试玩</button>
      <button class="btn gold" data-act="pub" data-id="${cs.id}" ${bad ? 'disabled' : ''}>${up ? '更新到云端' : '上传到云端'}</button>
      <button class="btn" data-act="exp" data-id="${cs.id}">导出</button>
      ${up ? `<button class="btn" data-act="unpub" data-id="${cs.id}">撤回</button>` : ''}
      <button class="btn" data-act="del" data-id="${cs.id}">删除</button>
    </div>
  </div>`;
}

const viewCloud = () => {
  if (!cloudData) return `<div class="wsbar"><button class="btn gold" data-act="load">载入云端工坊</button><span class="dim">从云端取所有人发布的卷宗</span></div><p class="dim wsnone">还没有载入。云端工坊放在站内那台 Waline 上，载入一次就能看到全部。</p>`;
  if (cloudData.ok === false) return `<div class="wsbar"><button class="btn gold" data-act="load">重试</button></div><p class="wserr">载入失败：${esc(cloudData.err)}</p>`;
  const ws = cloudData.works;
  return `<div class="wsbar"><button class="btn" data-act="load">刷新</button><span class="grow"></span><span class="dim">共 ${cloudData.works.length} 份卷宗${cloudData.warn ? '（部分页没取到：' + esc(cloudData.warn) + '）' : ''}</span></div>
  ${ws.length ? `<div class="wscards">${ws.map(cardCloud).join('')}</div>` : '<p class="dim wsnone">云端还没有人发布卷宗。第一份可以是你写的。</p>'}`;
};

function cardCloud(w) {
  const cs = w.cs, mine = !!store.drafts[cs.id];
  const stars = w.stars ? '★'.repeat(Math.round(w.stars)) + '☆'.repeat(5 - Math.round(w.stars)) : '';
  return `<div class="wscard">
    <div class="wsh"><b>${esc(cs.t)}</b>${mine ? '<span class="chip">我方</span>' : ''}${w.rank ? `<span class="chip ok">最佳 ${esc(w.rank)}</span>` : ''}</div>
    <p class="dim">作者 ${esc(cs.a || '无名守密人')}　·　${cs.r.length} 条记录　·　${cs.p.length} 人</p>
    <p>${esc(cs.b || '没有简介')}</p>
    <p class="dim small">${w.plays ? `游玩 ${w.plays} 次　·　${stars} ${w.stars || '—'}（${w.starN} 人打分）${w.rate ? `　·　平均核实率 ${w.rate}%` : ''}${w.best ? `　·　最高分 ${w.best}` : ''}` : '还没有人玩过。'}</p>
    <div class="wsbtns">
      <button class="btn gold" data-act="play" data-id="${cs.id}">开始调查</button>
      <button class="btn" data-act="rate" data-id="${cs.id}">评分</button>
      <button class="btn" data-act="take" data-id="${cs.id}">改编</button>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- 编辑器
function viewEditor(cs) {
  const v = validate(cs);
  const rows = compile(cs);
  const dordOf = new Map(rows.map((r) => [r.num, r]));
  const q = (n) => cs.p.find((p) => p.n === n);
  const opt = (arr, cur) => arr.map(([val, txt]) => `<option value="${val}" ${String(cur) === String(val) ? 'selected' : ''}>${esc(txt)}</option>`).join('');
  const placeOpts = [['', '—— 选择区块 ——'], ...Object.entries(PLACES).map(([k, n]) => [k, `${k} ${n}`])];
  const causeOpts = [['', '—— 选择死因 ——'], ...Object.entries(CAUSES)];
  const weaponOpts = [['0', '无（没有凶器）'], ...cs.p.filter((p) => (p.i || '').trim()).map((p) => [String(p.n), `${pad2(p.n)} ${p.m || '（无名）'} 的 ${p.i}`])];
  const culprits = (self) => [['0', '其他（无加害人）'], ...cs.p.filter((p) => p.n !== self).map((p) => [String(p.n), `${pad2(p.n)} ${p.m || '（无名）'}`])];

  return `<div class="wsedit">
  <div class="wsform">
    <div class="wsbar"><button class="btn" data-act="back">← 我的卷宗</button><span class="grow"></span><span class="dim">改动会自动存成草稿</span></div>

    <fieldset><legend>卷宗</legend>
      <label>标题<input data-f="t" maxlength="40" value="${esc(cs.t)}" placeholder="例：雨夜的排练"></label>
      <label>署名<input data-f="a" maxlength="20" value="${esc(cs.a)}" placeholder="想让人怎么称呼你"></label>
      <label>一句话简介<input data-f="b" maxlength="80" value="${esc(cs.b)}" placeholder="例：一场没排完的戏，五个人没能走出礼堂"></label>
      <label>作者的话（可选，会作为一份档案出现在游戏里）<textarea data-f="o" rows="3" maxlength="2000" placeholder="给来玩的守密人的话">${esc(cs.o)}</textarea></label>
      <label>结案词（可选，通关时显示）<textarea data-f="e" rows="2" maxlength="600" placeholder="留空则用默认的收尾">${esc(cs.e)}</textarea></label>
    </fieldset>

    <fieldset><legend>名册　${cs.p.length}/${MAX_PEOPLE} 人</legend>
      <p class="dim small">每人配发一样东西；这件东西就是这一卷里可能出现的凶器。名册上没死的人一样可以当凶手。</p>
      ${cs.p.map((p) => `<div class="wsrow"><span class="no">${pad2(p.n)}</span><input data-p="${p.n}" data-k="m" maxlength="12" value="${esc(p.m)}" placeholder="姓名（2 字以上，别互相包含）"><input data-p="${p.n}" data-k="i" maxlength="16" value="${esc(p.i)}" placeholder="配发装备"><button class="btn tiny" data-act="rmp" data-n="${p.n}" ${cs.p.length <= MIN_PEOPLE ? 'disabled' : ''}>删</button></div>`).join('')}
      <div class="row"><button class="btn" data-act="addp" ${cs.p.length >= MAX_PEOPLE ? 'disabled' : ''}>+ 加一个人</button></div>
    </fieldset>

    <fieldset><legend>记录　${cs.r.length} 条</legend>
      <p class="dim small">按死亡时刻自动排先后。正文里出现别人的名字，就自动成为一条线索；写到“他死在哪儿、他是第几个”玩家才拼得出记录名。</p>
      ${cs.r.map((r) => {
        const d = dordOf.get(r.num);
        const bad = v.errors.some((e) => e.includes(nameOf(cs, r.num)));
        return `<div class="wsrec ${bad ? 'bad' : ''}">
          <div class="wsrh"><b>${pad2(r.num)} ${esc(q(r.num)?.m || '（无名）')}</b><span class="dim">${d ? `⇢ ${d.key}　${d.when}` : '时刻无效'}</span><button class="btn tiny" data-act="rmr" data-n="${r.num}" ${cs.r.length <= 1 ? 'disabled' : ''}>删</button></div>
          <div class="wsgrid">
            <label>第几天<input type="number" min="1" max="9" data-r="${r.num}" data-k="day" value="${r.day}"></label>
            <label>时<input type="number" min="0" max="23" data-r="${r.num}" data-k="hour" value="${r.hour}"></label>
            <label>分<input type="number" min="0" max="59" data-r="${r.num}" data-k="min" value="${r.min}"></label>
            <label class="wide">地点<select data-r="${r.num}" data-k="cell">${opt(placeOpts, r.cell)}</select></label>
            <label>死因<select data-r="${r.num}" data-k="cause">${opt(causeOpts, r.cause)}</select></label>
            <label>凶器<select data-r="${r.num}" data-k="weapon">${opt(weaponOpts, r.weapon)}</select></label>
            <label>加害人<select data-r="${r.num}" data-k="culprit">${opt(culprits(r.num), r.culprit)}</select></label>
          </div>
          <textarea data-r="${r.num}" data-k="text" rows="6" maxlength="${MAX_TEXT}" placeholder="以“我”的视角写下死前看到的最后一幕">${esc(r.text)}</textarea>
          <div class="wscnt dim small">${[...r.text].length} / ${MAX_TEXT} 字</div>
        </div>`;
      }).join('')}
      <div class="row"><button class="btn" data-act="addr" ${cs.r.length >= cs.p.length ? 'disabled' : ''}>+ 再写一条记录</button><span class="dim small">${cs.r.length >= cs.p.length ? '名册上每个人都写过记录了' : '每条记录对应一个不同的人'}</span></div>
    </fieldset>
  </div>

  <aside class="wsside">${checkHtml(cs, v)}</aside>
  </div>`;
}

function checkHtml(cs, v) {
  const rows = v.rows;
  const total = rows.reduce((a, r) => a + [...r.text].length, 0);
  const link = rows.map((r) => {
    const refs = rows.filter((x) => x.num !== r.num && r.text.includes((cs.p.find((p) => p.n === x.num)?.m || '').trim() || '\u0000'));
    return `<li><b>${esc(r.name)}</b> <span class="dim">${r.key}</span>${refs.length ? ` → ${refs.map((x) => esc(x.name)).join('、')}` : ' <span class="dim">（推不出别人）</span>'}</li>`;
  }).join('');
  return `<h4>■ 体检</h4>
  <p class="dim small">记录 ${rows.length} 条　·　名册 ${cs.p.length} 人　·　正文合计 ${total}/${MAX_TOTAL} 字</p>
  ${v.errors.length ? `<div class="wserr"><b>必须修（${v.errors.length}）</b><ul>${v.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '<p class="wsok">✓ 可以发布</p>'}
  ${v.warns.length ? `<details class="wswarn" ${v.errors.length ? '' : 'open'}><summary>提醒 ${v.warns.length} 条（不影响发布，但玩家可能卡住）</summary><ul>${v.warns.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details>` : ''}
  <h4>■ 线索链</h4>
  <p class="dim small">开场直接给 ${v.start.length} 条：${v.start.map((k) => `<code>${esc(k)}</code>`).join(' ')}</p>
  <ul class="wslinks">${link}</ul>
  <h4>■ 答案（只有作者看得到）</h4>
  <ul class="wsans">${rows.map((r) => `<li><b>${esc(r.name)}</b> ${CAUSES[r.cause]} · ${r.weapon ? esc(cs.p.find((p) => p.n === r.weapon)?.i || '?') : '无凶器'} · ${r.culprit ? esc(nameOf(cs, r.culprit)) : '其他'}</li>`).join('')}</ul>
  <div class="row"><button class="btn gold" data-act="test-edit" ${v.errors.length ? 'disabled' : ''}>试玩这一卷</button><button class="btn" data-act="pub-edit" ${v.errors.length ? 'disabled' : ''}>发布</button></div>`;
}

// ---------------------------------------------------------------- 事件
function bindWs() {
  const root = $('#ws');
  root.addEventListener('click', onWs);
  root.addEventListener('input', onInput);
  root.addEventListener('change', onChange);
}

function onWs(e) {
  const tabBtn = e.target.closest('[data-wt]');
  if (tabBtn) { tab = tabBtn.dataset.wt; editing = null; render(); return; }
  if (e.target.id === 'wsBack') { if (ctx.close) ctx.close(); return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const id = b.dataset.id, act = b.dataset.act;
  const cs = id ? store.drafts[id] : editing;

  if (act === 'new') { const c = blank(); store.drafts[c.id] = c; editing = c; flushNow(); render(); return; }
  if (act === 'sample') { const c = sample(); store.drafts[c.id] = c; editing = c; flushNow(); render(); return; }
  if (act === 'back') { flushNow(); editing = null; render(); return; }
  if (act === 'edit' && cs) { editing = cs; render(); return; }
  if (act === 'test' && cs) { if (ctx.play) ctx.play(cs); return; }
  if (act === 'test-edit' && cs) { if (ctx.play) ctx.play(cs); return; }
  if (act === 'pub' || act === 'pub-edit') { doPublish(cs); return; }
  if (act === 'exp' && cs) { doExport(cs); return; }
  if (act === 'unpub' && cs) { doWithdraw(cs); return; }
  if (act === 'del' && cs) {
    if (!confirm(`删除《${cs.t || '未命名'}》？本地草稿会没有，云端已发布的那份不动。`)) return;
    delete store.drafts[cs.id]; delete store.up[cs.id]; if (editing?.id === cs.id) editing = null; flushNow(); render(); return;
  }
  if (act === 'addp' && cs) {
    if (cs.p.length >= MAX_PEOPLE) return;
    cs.p.push({ n: cs.p.length + 1, m: '', i: '' }); touch(cs); render(); return;
  }
  if (act === 'rmp' && cs) { removePerson(cs, +b.dataset.n); return; }
  if (act === 'addr' && cs) {
    const used = new Set(cs.r.map((r) => r.num));
    const free = cs.p.find((p) => !used.has(p.n)); if (!free) return;
    const last = cs.r[cs.r.length - 1] || { day: 1, hour: 8, min: 0 };
    cs.r.push({ num: free.n, day: last.day, hour: Math.min(23, last.hour + 1), min: 0, cell: 'C3', cause: 'accident', weapon: 0, culprit: 0, text: '' });
    touch(cs); render(); return;
  }
  if (act === 'rmr' && cs) { cs.r = cs.r.filter((r) => r.num !== +b.dataset.n); touch(cs); render(); return; }
  if (act === 'load') { loadCloud(); return; }
  if (act === 'play' && id) { const w = cloudData?.works.find((x) => x.cs.id === id); if (w && ctx.play) ctx.play(w.cs); return; }
  if (act === 'take' && id) { const w = cloudData?.works.find((x) => x.cs.id === id); if (!w) return; take(w.cs); return; }
  if (act === 'rate' && id) { const w = cloudData?.works.find((x) => x.cs.id === id); if (w) openRate(w.cs); return; }
}

function removePerson(cs, n) {
  if (cs.p.length <= MIN_PEOPLE) return;
  const hasRec = cs.r.some((r) => r.num === n);
  if (hasRec && !confirm('这个人的记录也会一起删掉，确定吗？')) return;
  cs.p = cs.p.filter((p) => p.n !== n).map((p, i) => ({ ...p, n: i + 1 }));
  cs.r = cs.r.filter((r) => r.num !== n).map((r) => ({ ...r, num: r.num > n ? r.num - 1 : r.num, weapon: r.weapon === n ? 0 : r.weapon > n ? r.weapon - 1 : r.weapon, culprit: r.culprit === n ? 0 : r.culprit > n ? r.culprit - 1 : r.culprit }));
  touch(cs); render();
}

function touch(cs) { cs.at = Date.now(); flush(); }

function onInput(e) {
  const t = e.target;
  if (t.dataset.f && editing) {
    editing[t.dataset.f] = t.value; touch(editing);
    if (t.dataset.f === 't' || t.dataset.f === 'a' || t.dataset.f === 'b') refreshCheck();
    return;
  }
  if (t.dataset.p && editing) {
    const p = editing.p.find((x) => x.n === +t.dataset.p); if (!p) return;
    p[t.dataset.k] = t.value; touch(editing); refreshCheck();
    return;
  }
  if (t.dataset.r && editing) {
    const r = editing.r.find((x) => x.num === +t.dataset.r); if (!r) return;
    const k = t.dataset.k;
    r[k] = k === 'text' ? t.value : Math.max(0, Math.trunc(+t.value) || 0);
    touch(editing);
    if (k === 'text') { const c = t.parentElement.querySelector('.wscnt'); if (c) c.textContent = `${[...t.value].length} / ${MAX_TEXT} 字`; }
    if (k !== 'text') { /* 时刻变了，记录名要跟着变 */ }
    refreshCheck();
  }
}

function onChange(e) {
  const t = e.target;
  if (t.id === 'wsImp' && t.files && t.files[0]) { importFile(t.files[0]); return; }
  if (!editing || t.tagName !== 'SELECT' || !t.dataset.r) return;
  const r = editing.r.find((x) => x.num === +t.dataset.r); if (!r) return;
  const k = t.dataset.k;
  r[k] = ['weapon', 'culprit'].includes(k) ? Math.trunc(+t.value) : t.value;
  touch(editing); render();
}

// 只换右边那一栏，别动正在输入的表单（否则光标会跳）
function refreshCheck() {
  if (!editing) return;
  const side = $('.wsside'); if (!side) return;
  const v = validate(editing);
  side.innerHTML = checkHtml(editing, v);
  const recs = [...document.querySelectorAll('.wsrec')];
  recs.forEach((el, i) => {
    const row = editing.r[i]; if (!row) return;
    const d = compile(editing).find((x) => x.num === row.num);
    const h = el.querySelector('.wsrh .dim'); if (h && d) h.textContent = `⇢ ${d.key}　${d.when}`;
    el.classList.toggle('bad', v.errors.some((x) => x.includes(nameOf(editing, row.num))));
  });
}

// ---------------------------------------------------------------- 云端动作
async function doPublish(cs) {
  const v = validate(cs);
  if (v.errors.length) { ctx.toast(`还有 ${v.errors.length} 处必须修：${v.errors[0]}`); return; }
  if (!nick()) { const n = prompt('上传到云端需要一个署名（别人会看到）。', ''); if (n == null) return; setNick(n.trim() || '无名守密人'); }
  busy = 'pub'; render();
  const r = await cloud.publish({ ...cs, a: cs.a || nick() || '无名守密人' }, nick());
  busy = '';
  if (!r.ok) { ctx.toast(`上传失败：${r.err}`); render(); return; }
  store.up[cs.id] = { at: Date.now(), oid: r.oid, status: r.status }; flushNow();
  if (r.status && r.status !== 'approved') {
    ctx.toast('已提交，但云端把它放进了审核/垃圾队列（这个站点开了反垃圾）。在 Waline 后台放行之后，别人才看得到。也可以先「导出」把文件直接发给朋友。', 7000);
  } else ctx.toast('已发布到云端工坊');
  cloudData = null; editing = null; tab = 'cloud'; render(); loadCloud();
}

async function doWithdraw(cs) {
  if (!confirm(`从云端撤下《${cs.t}》？别人就玩不到了，本地草稿不动。`)) return;
  const r = await cloud.withdraw(cs.id, nick());
  if (!r.ok) { ctx.toast(`撤回失败：${r.err}`); return; }
  delete store.up[cs.id]; flushNow();
  ctx.toast('已从云端撤下');
  cloudData = null; tab = 'cloud'; render(); loadCloud();
}

async function loadCloud() {
  busy = 'load'; render();
  try {
    const r = await cloud.list();
    cloudData = r.ok ? r : { ok: false, err: r.err || '载入失败' };
  } catch (e) { cloudData = { ok: false, err: String(e?.message || e) }; }
  busy = ''; render();
}

function take(cs) {
  const c = { ...JSON.parse(JSON.stringify(cs)), id: newId(), at: Date.now(), t: `${cs.t}（改编）` };
  store.drafts[c.id] = c; flushNow();
  ctx.toast('已复制到我的卷宗，可以随便改');
  tab = 'mine'; render();
}

// 评分弹窗。刚结案时带一份成绩一起提交——Waline 限制同 IP 短时间内只能发一条，
// 分两次发必然第二条被拒，所以合成一次。
export async function openRate(cs, result) {
  const w = cloudData?.works.find((x) => x.cs.id === cs.id);
  starSel = 0;
  const m = ctx.modal(`<h3>■ 评分　${esc(cs.t)}</h3>
    <p class="dim">作者 ${esc(cs.a || '无名守密人')}${w ? `　·　${w.plays || 0} 次游玩　·　${w.stars ? `平均 ${w.stars} 星` : '还没有评分'}` : ''}</p>
    ${result ? `<p class="dim">本次成绩：<b>${esc(result.rank)}</b>（${result.score}）　核实率 ${result.rate}%　提示 ${result.hints} 次　—— 会和评分一起交给作者。</p>` : ''}
    <div class="wsstars">${[1, 2, 3, 4, 5].map((s) => `<button data-star="${s}" aria-label="${s} 星">★</button>`).join('')}</div>
    <label class="wsnlabel">说两句（可选）<input id="wsNote" maxlength="140" placeholder="哪里好、哪里卡住了"></label>
    <div class="btns"><button class="btn gold" data-close>先算了</button><button class="btn" id="wsSend">提交</button></div>`);
  m.querySelectorAll('[data-star]').forEach((b) => { b.onclick = () => { starSel = +b.dataset.star; m.querySelectorAll('[data-star]').forEach((x) => x.classList.toggle('on', +x.dataset.star <= starSel)); }; });
  m.querySelector('#wsSend').onclick = async () => {
    if (!starSel) { ctx.toast('先点几颗星'); return; }
    m.querySelector('#wsSend').disabled = true;
    const r = await cloud.sendRate({ t: cs.id, s: starSel, r: result?.rank || '', sc: result?.score || 0, rt: result?.rate || 0, h: result?.hints || 0, b: nick() || '匿名', d: devId(), n: m.querySelector('#wsNote').value.trim() });
    if (!r.ok) { m.querySelector('#wsSend').disabled = false; ctx.toast(`提交失败：${r.err}`); return; }
    $('#modal').hidden = true; ctx.toast('已提交'); loadCloud();
  };
}

function doExport(cs) {
  const blob = new Blob([JSON.stringify(cs, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(cs.t || '卷宗').replace(/[\\/:*?"<>|]/g, '_')}.drw.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function importFile(file) {
  const txt = await file.text();
  let cs = null;
  try { const j = JSON.parse(txt); cs = sanitize(j); } catch { cs = decodeWork(txt); }
  if (!cs || !cs.r.length) { ctx.toast('这不是一份能读的卷宗。'); return; }
  cs.id = newId(); cs.at = Date.now();
  store.drafts[cs.id] = cs; flushNow();
  ctx.toast(`已导入《${cs.t || '未命名'}》`); tab = 'mine'; editing = cs; render();
}

export { bindWs, importFile, flushNow };
