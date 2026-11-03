// 《寻找伪人：Morimens》的控制器（v3）。
//
// 一套屏幕，两种相位：夜里门外有人敲门，白天屋里坐着人。画布只有一个，靠 setMode 切场景；
// 右边那栏随之换内容——夜里是登记卡/档案/记录，白天是住户名单和话题。
//
// 判断的信息只在四处：登记卡、档案、它说的话、它身上的东西。别的地方不放线索。

import {
  newRun, loadSave, currentVisitor, nightCfg, nightName, nightVisits, nightFrom, shareLimit,
  DIFFS, diffOf, DIFF_INDEX, tasksOf, tasksDone, rewardOf, scoreParts, walletAdd,
  ask, hear, peek, decide, nextVisitor, nightDone, endNight, startNight,
  talk, shoot, canTalk, canAsk, canHear, canPeek, roomFull, roomMax,
  homeAlive, homeReal, homeFake, homeOf, LIE_LABEL, TALK_PER_DAY, tellsOf,
  score, clearSave, codex, meetAll, isKnown, knownCount, KNOWN_MAX,
  best, saveBest, flush, FIELD_LABEL, FIELD_ASK, ALL_CHARS, ART_META, charOf, TOPICS,
  endingCount,
} from './engine.js';
import { loadArt, makeScene, sfx } from './view.js';
import {
  OPEN_REAL, OPEN_FAKE, OBSERVE_ANOMALY, ENDINGS, HELP, OUTCOME,
  HEAR_HEAD, HEAR_TAIL, PEEK_HEAD, PEEK_TAIL,
  dayIntro, nightIntro, nightEnd, DAY_REPORT_DEAD, DAY_REPORT_NONE, DAY_REPORT_LONELY,
  TALK_ASK, TALK_WHO_NONE, TALK_WHO_HIT, TALK_WHO_MISS, TALK_WHO_LIE, PAST,
  SHOOT_REAL, SHOOT_FAKE, EVENT_TEXT, TASK_DESC, DIFF_INTRO,
} from './text.js';

const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));

const REALM_COLOR = { 混沌: '#d16b9b', 血肉: '#d29a4e', 深海: '#4fb0c9', 超维: '#9a86d8', 主播: '#8fb3c9' };

let S = null;
let scene = null;
let art = null;
let tab = 'card';
let typer = 0;
let fullText = '';
let onSaid = null;
let mismatch = false;
let pick = null;      // 白天选中的住户 cid
let dayBusy = false;

/* ------------------------------------------------------------------ 工具 */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
const pickBy = (arr, key) => arr[hash(key) % arr.length];
const rnd = (arr, key) => arr[Math.floor(hash(String(key)) % arr.length)];

function el(tag, cls, txt) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

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
  }, 16);
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
function modal(title, bodyNodes, buttons, wide) {
  const box = $('#mbox');
  box.replaceChildren();
  box.classList.toggle('wide', !!wide);
  box.appendChild(el('h3', null, title));
  const b = el('div', 'mbody');
  (bodyNodes || []).forEach((n) => b.appendChild(typeof n === 'string' ? el('p', 'pre', n) : n));
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
let pickDiff = 'intro';    // 标题页选中的难度
function paintTitle() {
  const b = best();
  const c = codex();
  $('#codexCount').textContent = Object.keys(c.known || {}).length + '/' + ALL_CHARS.length;
  const dl = b.diff ? diffOf(b.diff) : null;
  $('#bestLine').textContent = b.score
    ? '最高分 ' + b.score + (dl ? ' · ' + dl.n : '') + ' · ' + (ENDINGS[b.ending] ? '「' + ENDINGS[b.ending].t + '」' : '')
      + ' · 第 ' + b.runs + ' 次值夜'
    : '还没有值过夜。';
  $('#knownLine').textContent = '图鉴已核实 ' + knownCount() + ' / ' + KNOWN_MAX + ' 项 · 见过的结局 '
    + endingCount() + ' / ' + Object.keys(ENDINGS).length + ' · 累计银芯 ' + (b.gain || 0);
  paintDiff();
  const sv = loadSave();
  $('#btnCont').hidden = !sv || sv.over;
  $('#btnCont').textContent = sv && !sv.over
    ? (sv.phase === 'day'
      ? '接着（' + diffOf(sv.diff).n + ' · 第 ' + (sv.day + 1) + ' 天白天）'
      : '接着（' + diffOf(sv.diff).n + ' · ' + nightName(sv.night) + '）')
    : '';
}

// 四个难度做成卡片，点一下选中，再点「开始」才开局——选错难度不该直接把你扔进十八夜
function paintDiff() {
  const box = $('#diffPick');
  if (!box) return;
  box.replaceChildren();
  DIFFS.forEach((d) => {
    const b = el('button', 'diff' + (pickDiff === d.k ? ' on' : ''));
    b.type = 'button';
    b.appendChild(el('b', null, d.n));
    b.appendChild(el('em', null, d.sub));
    b.appendChild(el('span', null, d.note));
    b.appendChild(el('i', null, '银芯 ×' + d.mul));
    b.onclick = () => { sfx.tick(); pickDiff = d.k; paintDiff(); };
    box.appendChild(b);
  });
  const note = $('#diffNote');
  if (note) note.textContent = DIFF_INTRO[pickDiff] || '';
}

/* ------------------------------------------------------------------ 开局 */
function startNew(diffKey) {
  const key = diffKey || pickDiff;
  pickDiff = diffOf(key).k;
  S = newRun((Date.now() % 2147483647) >>> 0, pickDiff);
  mismatch = false;
  pick = null;
  $('#scrTitle').hidden = true;
  $('#scrEnd').hidden = true;
  $('#scrGame').hidden = false;
  sfx.unlock();
  sfx.startDrone();
  enterDay(true);
}

function continueRun() {
  const sv = loadSave();
  if (!sv || sv.over) return startNew();
  S = sv;
  pickDiff = S.diff || 'intro';
  $('#scrTitle').hidden = true;
  $('#scrEnd').hidden = true;
  $('#scrGame').hidden = false;
  if (S.phase === 'night') {
    const v = currentVisitor(S);
    if (v) { paintHud(); startVisit(v); }
    else { paintHud(); advanceNight(); }
  } else {
    enterDay(false);
  }
}

/* ------------------------------------------------------------ 夜晚相位 */
function startVisit(v) {
  $('#sideDay').hidden = true;
  $('#scrGame').classList.remove('isDay');
  scene.setMode('visit');
  scene.setChar(v.c, tellsOf(v));
  // 看过一次就一直看得见：那是你记在脑子里的脸，不该因为换页就忘掉
  scene.setPeek(!!v.peeked);
  paintHud();
  tab = 'card';
  mismatch = false;
  paintPanes();
  speaker('门外', v.c.k === 's' ? 'B 站主播' : '', '');
  sfx.knock();
  const opener = v.fake
    ? pickBy(OPEN_FAKE, v.cid)
    : pickBy(OPEN_REAL[v.c.k === 's' ? '主播' : v.c.realm] || OPEN_REAL['混沌'], v.cid);
  say(opener);
  renderActs('main');
}

// 那一夜有戏：先把剧情摊开，再让你坐到门后
function showNightIntro() {
  const n = Math.min(S.night, S.days - 1);
  const cfg = nightCfg(S);
  const ev = cfg.ev && EVENT_TEXT[cfg.ev];
  const body = [];
  if (ev) {
    body.push(el('p', 'evk', ev.t));
    ev.body.forEach((x) => body.push(el('p', 'pre', x)));
  }
  body.push(el('p', 'pre', nightIntro(n, S.days)));
  modal(ev ? nightName(n) + ' · ' + EVENT_TEXT[cfg.ev].t.split(' · ').pop() : nightName(n),
    body,
    [{ t: '坐到门后', kind: 'btn primary', fn: () => startVisit(currentVisitor(S)) }]);
}

function advanceNight() {
  if (S.over) return showEnding();
  const v = nextVisitor(S);
  if (v) { paintHud(); startVisit(v); return; }
  // 今夜的门敲完了
  const prev = S.night;
  sfx.stopDrone();
  scene.setMode('black');
  const rep = endNight(S);
  paintHud();
  if (S.over) {
    modal(nightName(prev) + ' 结束', [el('p', 'pre', nightEnd(prev, S.days))],
      [{ t: '……天亮了', kind: 'btn', fn: () => showEnding() }]);
    return;
  }
  modal(nightName(prev) + ' 结束', [el('p', 'pre', nightEnd(prev, S.days))],
    [{ t: '等到天亮', kind: 'btn primary', fn: () => afterNight(rep) }]);
}

/* ------------------------------------------------------------ 白天相位 */
function afterNight(rep) {
  if (S.over) return showEnding();
  dayReport(rep, () => enterDay(false));
}

function dayReport(rep, done) {
  const deaths = (rep && rep.deaths) || [];
  const lines = [];
  if (!deaths.length) lines.push(pickBy(DAY_REPORT_NONE, 'd' + S.day));
  else {
    deaths.forEach((d) => {
      lines.push((DEAD_OPEN[d.cid] || pickBy(DAY_REPORT_DEAD, d.cid)) + '\n\n——' + d.name);
    });
    if (rep.lonely) lines.push(pickBy(DAY_REPORT_LONELY, 'l' + S.day));
  }
  const body = lines.map((t) => el('p', 'pre', t));
  const extra = el('div', 'drep');
  if (deaths.length) {
    extra.appendChild(el('p', 'hint', '屋里少了 ' + deaths.length + ' 个人。谁动的手，早上看不出来。'));
  }
  modal(deaths.length ? '少了人' : '一夜无事', body.concat([extra]),
    [{ t: deaths.length ? '去屋里看看' : '去看看他们', kind: 'btn primary', fn: done }]);
}

// 每个死者一句专属的"在哪儿找到的"，凑不出来就用通用句子
const DEAD_OPEN = {
  24: '她坐在床沿上，鞋摆得整整齐齐。你叫了两声，她才慢慢转过来——转得太慢了。',
};

function enterDay(fresh) {
  S.phase = 'day';
  pick = null;
  $('#sideDay').hidden = false;
  $('#scrGame').classList.add('isDay');
  scene.setMode('day');
  scene.setRoom(homeAlive(S).map((h) => ({ c: h.c, tell: tellsOf(h) })));
  scene.setAmmo(S.bullets);
  paintHud();
  paintDay();
  if (fresh) {
    modal('第 ' + (S.day + 1) + ' 天 · 白天', [el('p', 'pre', dayIntro(Math.min(S.day, S.days - 1), S.days))],
      [{ t: '认一遍屋里的人', kind: 'btn primary', fn: () => paintDay() }]);
  }
  speaker('屋里', '第 ' + (S.day + 1) + ' / ' + S.days + ' 天', '');
  const alive = homeAlive(S);
  say(alive.length
    ? '屋里还有 ' + alive.length + ' 个人。跟他们说话，或者做点别的。'
    : '屋里没有人了。');
}

function paintDay() {
  scene.setRoom(homeAlive(S).map((h) => ({ c: h.c, tell: tellsOf(h) })));
  scene.setAmmo(S.bullets);
  paintHud();
  const side = $('#sideDay');
  side.replaceChildren();
  const alive = homeAlive(S);
  const dead = S.home.filter((h) => !h.alive);

  side.appendChild(el('div', 'fhead', '屋里的人 · ' + alive.length + '/' + roomMax(S)));

  const list = el('div', 'reslist');
  alive.forEach((h) => {
    const b = el('button', 'res' + (pick === h.cid ? ' on' : ''));
    b.type = 'button';
    b.appendChild(bustOf(h.c, 0.62));
    const nm = el('div', 'rname');
    nm.appendChild(el('b', null, h.c.n));
    nm.appendChild(el('em', null, h.from === 'start' ? '先来的' : '第 ' + (h.joined + 1) + ' 天进来'));
    b.appendChild(nm);
    const left = TALK_PER_DAY - (h.talkCount || 0);
    b.appendChild(el('span', 'rleft', left > 0 ? '还能聊 ' + left : '今天聊过了'));
    b.onclick = () => { sfx.tick(); pick = h.cid; paintDay(); };
    list.appendChild(b);
  });
  dead.forEach((h) => {
    const b = el('div', 'res dead');
    b.appendChild(bustOf(h.c, 0.62));
    const nm = el('div', 'rname');
    nm.appendChild(el('b', null, h.c.n));
    nm.appendChild(el('em', null, h.killedBy === 'you' ? '你开的枪' : '夜里没的'));
    b.appendChild(nm);
    list.appendChild(b);
  });
  side.appendChild(list);

  // 选中的人：话题 + 枪
  const h = pick ? homeOf(S, pick) : null;
  if (!h) {
    side.appendChild(el('p', 'hint', '点上面的人，跟他们说话。'));
  } else {
    const acts = el('div', 'dtopics');
    acts.appendChild(el('div', 'fhead', h.c.n + ' · 问点什么'));
    TOPICS.forEach((t) => {
      const b = el('button', 'btn small' + (h.talked[t] ? ' done' : ''), topicLabel(t));
      b.type = 'button';
      b.disabled = !canTalk(S, h, t);
      b.onclick = () => doTalk(t);
      acts.appendChild(b);
    });
    side.appendChild(acts);
    const now = el('div', 'dshot');
    const sb = el('button', 'btn danger', '开枪（' + S.bullets + ' 发）');
    sb.type = 'button';
    sb.disabled = S.bullets <= 0;
    sb.onclick = confirmShoot;
    now.appendChild(sb);
    now.appendChild(el('span', 'hint', '打死之后就能看清它是什么。打错人的代价你自己扛。'));
    side.appendChild(now);
  }

  const foot = el('div', 'dfoot');
  // 任务进度：三条，全在侧栏上摆着，不用翻弹窗
  if ((S.tasks || []).length) {
    const tb = el('div', 'dtasks');
    const done = tasksDone(S);
    tb.appendChild(el('div', 'fhead', '这一局的规矩 · ' + done + '/' + S.tasks.length));
    tasksOf(S).forEach((t) => {
      const row = el('div', 'task' + (t.done ? ' on' : ''));
      row.appendChild(el('span', 'tk', t.done ? '✓' : '·'));
      row.appendChild(el('span', 'tt', t.t));
      row.appendChild(el('em', null, t.cmp === '<=' ? (t.v + ' / ' + t.goal) : (t.v + ' / ' + t.goal)));
      tb.appendChild(row);
    });
    foot.appendChild(tb);
  }
  const go = el('button', 'btn primary', '去门后（' + nightName(Math.min(S.night, S.days - 1)) + '）');
  go.type = 'button';
  go.onclick = () => { sfx.click(); enterNight(); };
  foot.appendChild(go);
  side.appendChild(foot);
}

function topicLabel(t) {
  return {
    card: '登记号再报一遍', fact: '核一条档案', self: '怎么称呼自己',
    eye: '看它的眼睛', item: '身上带着什么', who: '这里有谁不对劲', past: '你从哪儿来',
  }[t] || t;
}

function enterNight() {
  if (S.over) return showEnding();
  const v = startNight(S);
  if (!v) return showEnding();
  sfx.startDrone();
  showNightIntro();
}

/* ------------------------------------------------------------------ HUD */
function paintHud() {
  const day = S.phase === 'day';
  const cfg = diffOf(S.diff);
  $('#hNight').textContent = day ? '第 ' + (S.day + 1) + ' / ' + S.days + ' 天' : nightName(Math.min(S.night, S.days - 1));
  const prog = $('#hProg');
  if (day) {
    prog.textContent = cfg.n + ' · 屋里 ' + homeAlive(S).length + ' 人';
  } else {
    const nv = nightVisits(S);
    const inNight = Math.min(nv, S.vi - nightFrom(S) + 1);
    prog.textContent = '第 ' + Math.max(1, inNight) + ' 个 / 共 ' + nv + ' 个';
  }
  $('#hSan').textContent = Math.round(S.sanity);
  // 理智条按这一档的上限算：硬核开局只有 90，条不该是满的
  const bar = $('#hSanBar');
  bar.style.width = Math.max(0, Math.min(100, S.sanity)) + '%';
  bar.className = S.sanity <= 30 ? 'bad' : (S.sanity <= 60 ? 'warn' : '');
  const ammo = $('#hAmmo');
  ammo.replaceChildren();
  for (let i = 0; i < 6; i++) ammo.appendChild(el('i', i < Math.min(6, S.bullets) ? 'on' : ''));
  ammo.title = '子弹 ' + S.bullets;
  ammo.appendChild(el('em', null, String(S.bullets)));
  const hd = $('#hDiff');
  if (hd) hd.textContent = cfg.n;
}

/* ------------------------------------------------------------------ 面板 */
function fieldRow(label, truth, claim, asked) {
  const row = el('div', 'frow');
  row.appendChild(el('span', 'fl', label));
  row.appendChild(el('span', 'fv', truth || '—'));
  if (claim != null) {
    if (claim === truth) {
      row.appendChild(el('span', 'fc ok', '✓'));
      row.appendChild(el('span', 'fc dim', ''));
    } else {
      mismatch = true;
      row.classList.add('bad');
      row.appendChild(el('span', 'fc bad', '本人说'));
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
  if (fileTab) fileTab.classList.toggle('flag', mismatch);
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
      line.appendChild(el('em', null, ok ? '✓' : '档案：' + c.facts[f]));
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
  p.appendChild(table);
  p.appendChild(el('p', 'hint', '卡上那几行，一眼就能对。生日、身高之类只能问出来。'));
}

// 「记录」页：它说过的、它身上的、图鉴里核实过的
function paintLog() {
  const p = $('#paneLog');
  p.replaceChildren();
  const v = currentVisitor(S);
  p.appendChild(el('div', 'fhead', '记录'));
  if (!v) { p.appendChild(el('p', 'hint', '门外没有人。')); return; }

  if (v.heard) {
    p.appendChild(traitRow('自称', 'self', v.cid, v.shown.self));
    p.appendChild(traitRow('口头禅', 'line', v.cid, v.shown.line));
  }
  if (v.peeked) {
    p.appendChild(traitRow('瞳色', 'eye', v.cid, v.shown.eye));
    p.appendChild(traitRow('随身物', 'item', v.cid, v.shown.item));
    p.appendChild(traitRow('动物', 'pet', v.cid, v.shown.pet || '（没带）'));
    if (v.peekOdd >= 0) {
      const odd = OBSERVE_ANOMALY[v.peekOdd];
      const line = el('p', 'odd');
      line.textContent = '· ' + odd.t;
      p.appendChild(line);
    }
  }
  if (!v.heard && !v.peeked) {
    p.appendChild(el('p', 'hint', '还没听它说过话，也没凑近看过。\n这两样不占问话次数，一个人各能来一次。'));
  } else {
    p.appendChild(el('p', 'hint', '这里只记它说了什么、身上是什么。\n要判真假，点右上角「鉴」翻图鉴——你核实过的那一项，才拿来对。'));
  }

  const c = codex();
  const foot = el('div', 'logfoot');
  foot.appendChild(el('span', null, '图鉴已核实 ' + knownCount() + ' / ' + KNOWN_MAX + ' 项'));
  p.appendChild(foot);
}

// 一项底细：只说它是什么，不给结论——结论要你自己翻图鉴对
function traitRow(label, field, cid, value) {
  const row = el('div', 'trow');
  row.appendChild(el('span', 'tl', label));
  row.appendChild(el('b', 'tv', value || '—'));
  row.appendChild(el('em', 'tk dim', ''));
  return row;
}

/* ------------------------------------------------------------------ 动作 */
function renderActs(mode) {
  const acts = $('#acts');
  acts.replaceChildren();
  const v = currentVisitor(S);
  if (!v || v.done) { paintResultActs(); return; }

  if (mode === 'ask') {
    (v.c.ask || []).forEach((f) => {
      const b = el('button', 'btn small' + (v.askedFields.includes(f) ? ' done' : ''), FIELD_LABEL[f]);
      b.type = 'button';
      b.disabled = !canAsk(S, v, f);
      b.onclick = () => doAsk(f);
      acts.appendChild(b);
    });
    const back = el('button', 'btn ghost small', '不问了');
    back.type = 'button'; back.onclick = () => renderActs('main');
    acts.appendChild(back);
    return;
  }

  if (mode === 'decide') {
    const a = el('button', 'btn primary', roomFull(S) ? '屋里满了' : '开门让它进来');
    a.type = 'button';
    a.disabled = roomFull(S);
    a.onclick = () => doDecide('admit');
    const r = el('button', 'btn', '关着门，让它走');
    r.type = 'button'; r.onclick = () => doDecide('refuse');
    const back = el('button', 'btn ghost', '再看看');
    back.type = 'button'; back.onclick = () => renderActs('main');
    acts.appendChild(a); acts.appendChild(r); acts.appendChild(back);
    if (roomFull(S)) acts.appendChild(el('span', 'left', '屋里住满了，得先在白天腾出位置'));
    return;
  }

  const hLeft = shareLimit(S, 'hear') - (v.hearN || 0);
  const h = el('button', 'btn', hLeft > 0 ? '听它说' + (hLeft > 1 ? '（还剩 ' + hLeft + '）' : '') : '听过了');
  h.type = 'button';
  h.disabled = !canHear(S, v);
  h.onclick = doHear;
  const pLeft = shareLimit(S, 'peek') - (v.peekN || 0);
  const ob = el('button', 'btn', pLeft > 0 ? '凑近看' + (pLeft > 1 ? '（还剩 ' + pLeft + '）' : '') : '看过了');
  ob.type = 'button';
  ob.disabled = !canPeek(S, v);
  ob.onclick = doPeek;
  const q = el('button', 'btn', '问话');
  q.type = 'button';
  q.disabled = v.acts <= 0;
  q.onclick = () => { sfx.tick(); renderActs('ask'); };
  const d = el('button', 'btn primary', '该决定了');
  d.type = 'button';
  d.onclick = () => { sfx.tick(); renderActs('decide'); };
  acts.appendChild(h); acts.appendChild(ob); acts.appendChild(q); acts.appendChild(d);
  acts.appendChild(el('span', 'left', '还能问 ' + v.acts + ' 次 · 听和看各一次，不占问话'));
}

function paintResultActs() {
  const acts = $('#acts');
  acts.replaceChildren();
  const last = nightDone(S);
  const b = el('button', 'btn primary', last ? '今晚就到这儿' : '下一位');
  b.type = 'button';
  b.onclick = () => { sfx.click(); advanceNight(); };
  acts.appendChild(b);
}

function doHear() {
  const v = currentVisitor(S);
  const r = hear(S);
  if (!r) return;
  sfx.paper();
  const head = pickBy(HEAR_HEAD, v.cid + 'h');
  const tail = pickBy(HEAR_TAIL, v.cid + 't');
  say(head + '\n\n它说：「' + r.line + '」\n\n然后它补了一句：「' + r.self + '不骗你。」\n\n' + tail
    + '\n\n（记一笔：' + r.self + ' / ' + r.line + '）');
  speaker('门外 · ' + v.c.n, '听着', '');
  paintPanes();
  renderActs('main');
}

function doPeek() {
  const v = currentVisitor(S);
  const r = peek(S);
  if (!r) return;
  sfx.paper();
  scene.setPeek(true);          // 窗口换成它的脸：瞳色、随身的东西、身上有没有活物都在这儿看
  const head = pickBy(PEEK_HEAD, v.cid + 'p' + (v.peekN || 1));
  const tail = pickBy(PEEK_TAIL, v.cid + 'q');
  let body = head + '\n\n玻璃上就是它的脸，离得只有两指厚。\n瞳色是' + r.eye + '的。' +
    (r.item ? '手里攥着' + r.item + '。' : '手里什么也没拿。') +
    (r.pet ? '身上还带着' + r.pet + '。' : '身边没有活物。');
  if (r.odd >= 0) {
    body += '\n\n' + OBSERVE_ANOMALY[r.odd].t;
    scene.red(0.55); scene.shake(0.5); sfx.heartbeat();
  }
  say(body + '\n\n' + tail);
  speaker('门外 · ' + v.c.n, r.odd >= 0 ? '有一点不对' : '看了一会儿', r.odd >= 0 ? 'bad' : 'dim');
  paintPanes();
  renderActs('main');
}

function doAsk(f) {
  const v = currentVisitor(S);
  const r = ask(S, f);
  if (!r) return;
  sfx.tick();
  say('你：' + FIELD_ASK[f] + '\n\n' + v.c.n + '：「' + r.claim + '。」');
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

function doDecide(kind) {
  const v = currentVisitor(S);
  const r = decide(S, kind);
  if (!r) return;
  if (kind === 'admit' && v.fake) { scene.red(0.7); sfx.heartbeat(); }
  say(pickBy(OUTCOME[r.key], v.cid + kind));
  const verdict = kind === 'admit'
    ? (v.fake ? '它进来了。' : '门开了。')
    : (v.fake ? '它走了。' : '你把它关在外面了。');
  speaker(kind === 'admit' ? '门开了' : '门没开', verdict, v.fake && kind === 'refuse' ? 'good' : '');
  paintPanes();
  paintResultActs();
}

/* ---------------------------------------------------------- 白天：对话 */
// 一句话的判定：只有「你本来就记着」的时候才给结论。
// 第一次听到的不下结论——那正是要靠图鉴（和多周目）补上的部分。
function verdictLine(cid, field, kn) {
  const c = charOf(cid);
  const truth = c.tr[field] || '（没有）';
  if (kn === 'ok') return '\n✓ 和你记的一样：' + truth;
  if (kn === 'bad') return '\n✗ 你记的是：' + truth;
  return '\n〔这一项先记下，回头对图鉴〕';
}

function doTalk(topic) {
  if (dayBusy) return;
  const h = pick ? homeOf(S, pick) : null;
  if (!h) return;
  const r = talk(S, pick, topic);
  if (!r) return;
  dayBusy = true;
  sfx.tick();

  let body = TALK_ASK[topic] + '\n\n';
  let tone = '';
  let sub = '';

  if (topic === 'card') {
    body += (r.pairs || []).map((p) => FIELD_LABEL[p.f] + '：' + p.claim + (p.ok ? '  ✓' : '  ✗ 档案：' + p.truth)).join('\n');
    if (r.lie) {
      tone = 'bad'; sub = '说的和档案不一样';
      scene.red(0.4); sfx.heartbeat();
    } else { tone = 'good'; sub = '和档案一致'; }
  } else if (topic === 'fact') {
    body += r.lines.join('\n');
    if (r.lie) {
      body += '\n\n✗ 档案上是：' + r.truth;
      tone = 'bad'; sub = '说的和档案不一样';
      scene.red(0.4); sfx.heartbeat();
    } else { body += '\n\n✓ 和档案一致'; tone = 'good'; sub = '和档案一致'; }
  } else if (topic === 'self') {
    body += r.lines.join('\n') + verdictLine(h.cid, 'self', r.kn.self);
    tone = r.kn.self === 'bad' ? 'bad' : '';
  } else if (topic === 'eye') {
    body += r.lines.join('\n') + verdictLine(h.cid, 'eye', r.kn.eye);
    tone = r.kn.eye === 'bad' ? 'bad' : '';
  } else if (topic === 'item') {
    body += r.lines.join('\n') + verdictLine(h.cid, 'item', r.kn.item) + verdictLine(h.cid, 'pet', r.kn.pet);
    tone = (r.kn.item === 'bad' || r.kn.pet === 'bad') ? 'bad' : '';
  } else if (topic === 'who') {
    if (!r.accuse) {
      body += pickBy(TALK_WHO_NONE, h.cid + S.day);
    } else {
      const pool = r.trust === 'lie' ? TALK_WHO_LIE : (r.trust === 'hit' ? TALK_WHO_HIT : TALK_WHO_MISS);
      body += pickBy(pool, h.cid + 'w' + S.day) + '\n\n它说的是：' + r.accuseName;
      sub = '它指了一个人';
    }
  } else if (topic === 'past') {
    const pool = PAST[h.c.realm] || PAST['混沌'];
    body += pool[(S.day + h.joined) % pool.length];
  }

  if (r.odd >= 0) {
    body += '\n\n' + OBSERVE_ANOMALY[r.odd].t;
    tone = 'bad';
    sub = '有一点不对';
    scene.red(0.4); sfx.heartbeat();
  }

  say(body);
  speaker(h.c.n, sub || (topic === 'who' ? '' : '谈过了'), tone);
  paintDay();
  dayBusy = false;
}

function confirmShoot() {
  const h = pick ? homeOf(S, pick) : null;
  if (!h) return;
  if (S.bullets <= 0) {
    modal('没有子弹了', [el('p', 'pre', '左轮是空的。你只能看着它。')], [{ t: '放下枪', kind: 'btn' }]);
    return;
  }
  modal('开枪 · ' + h.c.n, [
    el('p', 'pre', '枪口对着屋里的人。这一枪打出去，就没有「再问问」了。\n剩下 ' + S.bullets + ' 发。\n\n'
      + '打死之后你会看清它是什么——活人还是别的东西。'),
  ], [
    { t: '开枪', kind: 'btn danger', fn: () => doShoot() },
    { t: '放下枪', kind: 'btn ghost' },
  ]);
}

function doShoot() {
  const r = shoot(S, pick);
  if (!r) return;
  sfx.gun(); scene.flash(0.75); scene.shake(1);
  const body = r.fake ? pickBy(SHOOT_FAKE, r.cid) : pickBy(SHOOT_REAL, r.cid);
  const detail = r.fake
    ? '它是伪人。它抄错的是「' + LIE_LABEL[r.lie] + '」。'
    : '是活人。你杀错了。';
  say(body + '\n\n' + detail);
  speaker(r.fake ? '处决' : '误杀', (r.fake ? '伪人 · ' : '活人 · ') + r.name, r.fake ? 'good' : 'bad');
  if (!r.fake) scene.red(0.9);
  pick = null;
  paintDay();
  if (S.over) setTimeout(showEnding, 1600);
}

/* ------------------------------------------------------------------ 结局 */
let awarded = false;
function showEnding() {
  closeModal();
  flush(S);
  sfx.stopDrone();
  const E = ENDINGS[S.ending] || ENDINGS.dawn;
  const rw = rewardOf(S);
  const sc = rw.total;
  if (!awarded) {
    awarded = true;
    walletAdd(rw.gain);
    saveBest({ ending: S.ending, score: sc, days: S.day + 1, diff: S.diff, gain: rw.gain });
    meetAll(S.met);
    cloudTouch();      // 登录了才真的推；没登录就算了，本机照样记账
  }

  $('#scrGame').hidden = true;
  $('#scrEnd').hidden = false;
  const box = $('#scrEnd');
  box.replaceChildren();
  const inner = el('div', 'endcard');
  inner.appendChild(el('p', 'ek', '结局 · ' + diffOf(S.diff).n));
  inner.appendChild(el('h2', null, E.t));
  inner.appendChild(el('p', 'es', E.sub));
  const body = el('div', 'ebody');
  (E.body || []).forEach((x) => body.appendChild(el('p', null, x)));
  inner.appendChild(body);

  const stats = el('div', 'estats');
  const rows = [
    ['值到', '第 ' + (S.day + 1) + ' / ' + S.days + ' 天'],
    ['看破的伪人', S.caught + ' / ' + S.fakeTotal],
    ['放进来的伪人', S.leaked],
    ['屋里死的人', S.deaths.filter((d) => d.how === 'night').length],
    ['误杀活人', S.killedReal],
    ['剩下理智', Math.round(S.sanity)],
    ['图鉴核实', knownCount() + ' / ' + KNOWN_MAX],
    ['得分', sc],
  ];
  rows.forEach(([k, v]) => {
    const r = el('div', 'erow');
    r.appendChild(el('span', null, k));
    r.appendChild(el('b', null, String(v)));
    stats.appendChild(r);
  });
  inner.appendChild(stats);

  // 银芯怎么算出来的，摊开写：难度乘区 × 时间乘区，别让玩家觉得是随机给的
  const pay = el('div', 'epay');
  pay.appendChild(el('div', 'fhead', '银芯结算'));
  const line = (k, v) => {
    const r = el('div', 'erow');
    r.appendChild(el('span', null, k));
    r.appendChild(el('b', null, String(v)));
    pay.appendChild(r);
  };
  line('得分', rw.base);
  line('难度乘区 · ' + diffOf(S.diff).n, '×' + rw.diffMul);
  line('时间乘区 · 第 ' + (S.day + 1) + '/' + S.days + ' 天', '×' + rw.timeMul.toFixed(2));
  if (rw.taskBonus) line('任务奖励 · 完成 ' + tasksDone(S) + ' 条', '+' + rw.taskBonus);
  const tot = el('div', 'erow big');
  tot.appendChild(el('span', null, '进钱包'));
  tot.appendChild(el('b', null, '+' + rw.gain));
  pay.appendChild(tot);
  inner.appendChild(pay);

  const tk = el('div', 'etasks');
  tasksOf(S).forEach((t) => {
    const row = el('div', 'task' + (t.done ? ' on' : ''));
    row.appendChild(el('span', 'tk', t.done ? '✓' : '✗'));
    row.appendChild(el('span', 'tt', t.t));
    row.appendChild(el('em', null, t.v + ' / ' + t.goal));
    tk.appendChild(row);
  });
  inner.appendChild(tk);

  if (S.endingWho && S.endingWho.length) {
    inner.appendChild(el('p', 'hint', '和你一起活到最后的人：' + S.endingWho.join('、')));
  }

  const acts = el('div', 'eacts');
  const again = el('button', 'btn primary', '再值一夜（' + diffOf(S.diff).n + '）');
  again.type = 'button';
  again.onclick = () => { clearSave(); awarded = false; startNew(S.diff); };
  const other = el('button', 'btn', '换个难度');
  other.type = 'button';
  other.onclick = () => { clearSave(); awarded = false; backToTitle(); };
  const bd = el('button', 'btn', '排行榜');
  bd.type = 'button';
  bd.onclick = openBoard;
  const cx = el('button', 'btn', '图鉴');
  cx.type = 'button';
  cx.onclick = openCodex;
  const home = el('a', 'btn ghost', '回首页');
  home.href = 'index.html';
  acts.appendChild(again); acts.appendChild(other); acts.appendChild(bd); acts.appendChild(cx); acts.appendChild(home);
  inner.appendChild(acts);
  box.appendChild(inner);
  clearSave();
}

function backToTitle() {
  $('#scrEnd').hidden = true;
  $('#scrGame').hidden = true;
  $('#scrTitle').hidden = false;
  S = null;
  paintTitle();
}

// 结局 / 分数变了才值得惊动云端：几十 KB 的账号链路不进首屏，用到时再拉
let syncMod = null;
function cloudTouch() {
  if (syncMod) { try { syncMod.flush(); } catch (e) { /* noop */ } return; }
  import('./fake-sync.js')
    .then((m) => { syncMod = m; try { m.flush(); } catch (e) { /* noop */ } })
    .catch(() => { /* 没登录 / 离线就算了 */ });
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
  box.appendChild(el('h3', null, '图鉴 · 见过 ' + (c.met || []).length + ' / ' + ALL_CHARS.length
    + ' 人 · 核实 ' + knownCount() + ' 项'));

  const bar = el('div', 'cfilter');
  [['all', '全部'], ['known', '有记录'], ['a', '唤醒体'], ['s', '主播']].forEach(([k, t]) => {
    const b = el('button', k === codexFilter ? 'on' : '', t);
    b.type = 'button';
    b.onclick = () => { codexFilter = k; paintCodex(); };
    bar.appendChild(b);
  });
  box.appendChild(bar);

  const grid = el('div', 'cgrid');
  // 见过的排前面、核实项多的再靠前——否则一屋子 ？？？里翻自己认识的那两个人太费劲
  const order = ALL_CHARS.map((ch, i) => {
    const k = c.known[ch.n] || {};
    return { ch, i, n: Object.keys(k).length, met: c.met.includes(ch.n) };
  }).sort((a, b) => (b.met - a.met) || (b.n - a.n) || (a.i - b.i));
  order.forEach(({ ch, n, met }) => {
    if (codexFilter === 'known' && !n) return;
    if (codexFilter === 'a' && ch.k !== 'a') return;
    if (codexFilter === 's' && ch.k !== 's') return;
    const card = el('button', 'citem' + (met ? '' : ' lock') + (n ? ' has' : ''));
    card.type = 'button';
    if (met) {
      card.appendChild(bustOf(ch, 1));
      card.appendChild(el('span', null, ch.n));
      card.appendChild(el('em', 'ck', n ? n + '/5' : '—'));
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
  box.appendChild(el('p', 'hint', '每人的底细有五项：自称 / 瞳色 / 随身物 / 动物 / 口头禅。\n'
    + '只有「它说的确实是真话」时才会被核实进图鉴——被核实过的项，下次一眼就能对。\n'
    + '一周目几乎只能靠档案，越到后面眼力越好。'));

  const macts = el('div', 'macts');
  const close = el('button', 'btn', '合上图鉴');
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
    if (t === ch.realm) { s.style.borderColor = REALM_COLOR[t] || ''; s.style.color = REALM_COLOR[t] || ''; }
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

  // 底细：核实过的才显示，没核实的留空——图鉴本来就是你「确认过」的东西
  const tr = el('div', 'ftable');
  tr.appendChild(el('div', 'fhead', '底细'));
  [['self', '自称'], ['eye', '瞳色'], ['item', '随身物'], ['pet', '动物'], ['line', '口头禅']].forEach(([k, t]) => {
    const row = el('div', 'frow');
    row.appendChild(el('span', 'fl', t));
    if (isKnown(ch.n, k)) {
      row.appendChild(el('span', 'fv', ch.tr[k] || '（没有）'));
      row.appendChild(el('span', 'fc ok', '✓'));
    } else {
      row.appendChild(el('span', 'fv dim', '未核实'));
      row.appendChild(el('span', 'fc dim', '?'));
    }
    tr.appendChild(row);
  });
  info.appendChild(tr);
  head.appendChild(info);
  box.appendChild(head);

  const macts = el('div', 'macts');
  const back = el('button', 'btn', '回图鉴');
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

/* ------------------------------------------------------------- 排行榜 */
// 榜单在服务端算：每个人云端档案里的摘要（gd.fk）互相比。前端只负责取和画。
// 没登录也能看——这是公开接口；要上榜才需要登录过、并且同步过档案。
const EDGE_API = 'https://morimens.qingdengbuyi.top/api';
function apiCandidates() {
  const out = [];
  try {
    const c = String(JSON.parse(localStorage.getItem('zjtt:apiBase') || '""') || '').trim().replace(/\/+$/, '');
    if (c) out.push(c);
  } catch (e) { /* 存坏了就算了 */ }
  if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname)) {
    out.push(location.origin + '/api');
  }
  if (out.indexOf(EDGE_API) < 0) out.push(EDGE_API);
  return out;
}
function probeApi() {
  try {
    const v = JSON.parse(localStorage.getItem('zjtt:site:api') || 'null');
    if (v && v.base && Date.now() - Number(v.at || 0) < 600000) return Promise.resolve(v.base);
  } catch (e) { /* 重新探 */ }
  const list = apiCandidates();
  let i = 0;
  const next = () => {
    if (i >= list.length) return Promise.resolve('');
    const base = list[i++];
    return fetch(base + '/health', { headers: { Accept: 'application/json' } })
      .then((r) => r.json().catch(() => null))
      .then((j) => {
        if (j && j.service === 'zjtt') {
          try { localStorage.setItem('zjtt:site:api', JSON.stringify({ base, at: Date.now() })); } catch (e) { /* noop */ }
          return base;
        }
        return next();
      })
      .catch(next);
  };
  return next();
}

function openBoard() {
  const box = $('#mbox');
  box.replaceChildren();
  box.classList.remove('wide');
  box.appendChild(el('h3', null, '地下十一层的门房 · 排行榜'));
  const body = el('div', 'mbody');
  const list = el('div', 'board');
  list.appendChild(el('p', 'hint', '读取中…'));
  body.appendChild(list);
  const mine = best();
  body.appendChild(el('p', 'hint', '你本机最好的一局：' + (mine.score || 0) + ' 分'
    + (mine.diff ? '（' + diffOf(mine.diff).n + ' · 第 ' + (mine.days || 0) + ' 天）' : '')
    + '\n榜单只收登录并同步过档案的玩家；同分按活得更久排。'));
  box.appendChild(body);
  const macts = el('div', 'macts');
  const close = el('button', 'btn', '合上');
  close.type = 'button'; close.onclick = closeModal;
  macts.appendChild(close);
  box.appendChild(macts);
  $('#modal').hidden = false;
  $('#modal').classList.add('on');

  probeApi().then((base) => {
    if (!base) throw new Error('offline');
    return fetch(base + '/board', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null));
  }).then((j) => {
    const g = j && j.games && j.games.fk;
    list.replaceChildren();
    if (!g || !g.items || !g.items.length) {
      list.appendChild(el('p', 'hint', '还没有人上榜。登录后玩一局，成绩会随云端档案同步上来。'));
      return;
    }
    list.appendChild(el('p', 'hint', '按最高分排 · 共 ' + g.items.length + ' 人上榜'));
    g.items.forEach((it, i) => {
      const row = el('div', 'brow');
      row.appendChild(el('span', 'rk', String(i + 1)));
      const nm = el('span', 'nm', it.name || '匿名');
      if (it.sub) nm.appendChild(el('em', null, it.sub));
      row.appendChild(nm);
      row.appendChild(el('b', 'sc', String(it.score)));
      list.appendChild(row);
    });
  }).catch(() => {
    list.replaceChildren();
    list.appendChild(el('p', 'hint', '榜单服务没连上（离线 / 后端没起来）。\n本机成绩照常记，等能连上了再来看。'));
  });
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
  $('#btnCodex2').onclick = () => { sfx.paper(); openCodex(); };
  const bb = $('#btnBoard');
  if (bb) bb.onclick = () => { sfx.paper(); openBoard(); };
  const bb2 = $('#btnBoard2');
  if (bb2) bb2.onclick = () => { sfx.paper(); openBoard(); };
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
    if (e.key === '1' && !isModal() && S && S.phase === 'night') { tab = 'card'; paintPanes(); }
    if (e.key === '2' && !isModal() && S && S.phase === 'night') { tab = 'file'; paintPanes(); }
    if (e.key === '3' && !isModal() && S && S.phase === 'night') { tab = 'log'; paintPanes(); }
  });
  window.addEventListener('pagehide', () => { if (S && !S.over) flush(S); });
  if (/[?&]debug/.test(location.search)) {
    window.__fake = {
      state: () => S,
      codexAll() {
        ALL_CHARS.forEach((c) => ['self', 'eye', 'item', 'pet', 'line'].forEach((f) => {
          if (c.tr && c.tr[f]) {
            // 直接写盘：调试用
            const raw = JSON.parse(localStorage.getItem('zjtt:fake:codex') || '{"met":[],"known":{}}');
            raw.known = raw.known || {};
            raw.known[c.n] = raw.known[c.n] || {};
            raw.known[c.n][f] = 1;
            if (!raw.met.includes(c.n)) raw.met.push(c.n);
            localStorage.setItem('zjtt:fake:codex', JSON.stringify(raw));
          }
        }));
        return Object.keys(codex().known).length;
      },
      day() { enterDay(false); },
      night() { enterNight(); },
      ending(e) { S.over = true; S.ending = e || 'archive'; showEnding(); },
      start(diff) { clearSave(); awarded = false; startNew(diff || pickDiff); },
      diff(d) { pickDiff = diffOf(d).k; paintDiff(); return pickDiff; },
      reward() { return S ? rewardOf(S) : null; },
      board: openBoard,
    };
  }
  scene.setMode('idle');
}

boot();
