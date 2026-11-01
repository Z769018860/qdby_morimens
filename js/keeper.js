// 杀死守密人 —— 引擎。
// 一局 = 一夜：下行（楼梯 → 门）→ 见面（十二形态）→ 结局，或她变了、再下一夜。
// 终夜在见证足够多的形态之后打开。图鉴与场外开关存本机。
import { CG, REALM } from './keeper/art.js';
import { FORMS, PROLOGUE, BRIEF, STAIRS, STAIR_OPTS, DOOR, CATEVENT, INTERLUDE, FINAL } from './keeper/data.js';
import { ENDINGS, GROUPS, TOTAL } from './keeper/endings.js';
import { walletAdd } from './silver.js';
import * as SND from './keeper/audio.js';

const $ = (s) => document.querySelector(s);
const LS_KEY = 'zjtt:keeper:v1';
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ 持久
let P = { endings: [], forms: [], nights: 0, meta: {}, mid: null };
function loadP() {
  try { P = Object.assign(P, JSON.parse(localStorage.getItem(LS_KEY) || '{}')); } catch { /* 坏档当新档 */ }
  P.endings = new Set(P.endings || []);
  P.forms = new Set(P.forms || []);
  P.meta = P.meta || {};
}
function saveP() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    endings: [...P.endings], forms: [...P.forms], nights: P.nights, meta: P.meta, mid: MID,
  }));
}

// 一局（夜链）状态；MID 是中途快照，刷新后可回来
let S = null;
let MID = null;
let sessionFresh = true; // 本次页面会话内是否从第 1 夜一路没刷新过（E105 用）
function newRun() {
  return {
    loop: 1, marks: { blood: 0, paper: 0, salt: 0, ash: 0 }, w: 0,
    tags: {}, flags: {}, witnessed: [], lastForm: null,
    spared: 0, bladeStreak: 0, sameStair: [], silenceStreak: 0, firstStreak: 0,
  };
}

// ------------------------------------------------------------------ 音频
// 播放本身在 keeper/audio.js，这里只决定「什么时候响什么」。
// 浏览器不给手势就不让出声：第一次点击/按键才真正建 AudioContext（wake）。
let muted = false, toggleCount = 0, mutedThisNight = false;
const bgm = SND.bgm, sfx = SND.sfx;
function heartbeat(on) { SND.heartbeat(on && !REDUCED); }

let booted = false;
function wake() {
  if (booted) return;
  booted = true;
  SND.boot();
  const h = $('#sndHint');
  if (h) h.remove();
  if (S) renderMeters();
}
document.addEventListener('pointerdown', wake);
document.addEventListener('keydown', wake);

// 每一夜的形态有自己的登场声——她变了，声音先告诉你
const FORM_SFX = {
  binder: 'chain', trimmer: 'knife', lamp: 'candle', tower: 'stone',
  salt: 'drip', myriad: 'page', hollow: 'wind', lastday: 'bell',
  cat: 'cat', unnamed: 'breath', mirror: 'glass', first: 'ring',
};
// 选项按「你做了什么」配声，而不是逐句配
const TAG_SFX = {
  kill: ['slash', 1], read: ['page', .8], silence: ['creak', .7],
  gentle: ['breath', .55], dominate: ['clank', .9], grieve: ['drip', .8],
  faith: ['tick', .7], name: ['whisper', .7],
};

// ------------------------------------------------------------------ 背景 / 特效
let bgCur = 'A';
function setBG(key, filter) {
  if (!CG[key]) key = 'end';
  const inc = bgCur === 'A' ? $('#bgB') : $('#bgA');
  const out = bgCur === 'A' ? $('#bgA') : $('#bgB');
  bgCur = bgCur === 'A' ? 'B' : 'A';
  inc.src = CG[key];
  inc.style.filter = filter || '';
  inc.classList.add('on');
  out.classList.remove('on');
  const pre = new Image(); pre.src = CG[key]; // 命中 HTTP 缓存
}
function fx(kind) {
  if (REDUCED) return;
  if (kind === 'shake') {
    const st = $('#stage');
    st.classList.remove('fx-shake'); void st.offsetWidth; st.classList.add('fx-shake');
  } else if (kind === 'flash') {
    const f = $('#flash');
    f.style.opacity = .85; setTimeout(() => { f.style.opacity = 0; }, 90);
  }
}

// ------------------------------------------------------------------ 文本渲染
const SPD = 24;
let typing = null, typeDone = null;
function typeInto(el, text, done) {
  clearInterval(typing); typing = null;
  let i = 0;
  el.textContent = '';
  typing = setInterval(() => {
    i += 2;
    el.textContent = text.slice(0, i);
    if (i >= text.length) { clearInterval(typing); typing = null; typeDone = null; done && done(); }
  }, SPD);
  typeDone = () => { clearInterval(typing); typing = null; typeDone = null; el.textContent = text; done && done(); };
}

let curBeat = null, curDone = null, curLine = 0, echoShown = false;
function playBeat(beat, done) {
  curBeat = beat; curDone = done; curLine = 0; echoShown = false;
  speakerOf(beat.who);
  const pe = $('#echo');
  if (beat.echo && !echoShown) {
    const r = REALM[beat.echo.r];
    pe.hidden = false;
    pe.innerHTML = `<b style="color:${r.color}">${r.zh} · 回响</b>${beat.echo.t}`;
  } else pe.hidden = true;
  if (beat.bg) setBG(beat.bg);
  if (beat.fx) fx(beat.fx);
  if (beat.sfx) sfx(beat.sfx, beat.sfxGain || 1);
  $('#choices').classList.add('hide');
  typeInto($('#ptext'), (Array.isArray(beat.t) ? beat.t : [beat.t])[0], null);
}
function onTextTap() {
  if (!curBeat) return;
  const lines = Array.isArray(curBeat.t) ? curBeat.t : [curBeat.t];
  if (typing) { typeDone && typeDone(); return; }
  if (curLine < lines.length - 1) {
    curLine++;
    typeInto($('#ptext'), lines[curLine], null);
    return;
  }
  // 本段读完
  if (curBeat.ch) { if (!$('#choices').childElementCount) showChoices(curBeat.ch); return; }
  const d = curDone; curBeat = null; curDone = null;
  d && d(curBeat && curBeat.go);
}
function speakerOf(who) {
  const spk = $('#spk'), sub = $('#spksub');
  const map = {
    rule: ['规程', 'THE PROTOCOL', 'rule'], her: ['她', 'THE KEEPER', 'her'],
    you: ['你', '守密人 · 447 号', 'you'], cat: ['猫', '编号空缺', 'cat'],
    sys: ['', '', 'sys'],
  };
  const m = map[who] || map.sys;
  spk.textContent = m[0];
  spk.className = 'speaker ' + m[2];
  spk.style.display = m[0] ? '' : 'none';
  sub.textContent = m[1];
}

// ------------------------------------------------------------------ 选项
function needOk(n) {
  if (n.wMin != null && S.w < n.wMin) return false;
  if (n.wMax != null && S.w > n.wMax) return false;
  if (n.seen && !S.witnessed.includes(n.seen)) return false;
  if (n.cat && !S.flags.cat) return false;
  if (n.flag && !S.flags[n.flag]) return false;
  return true;
}
function showChoices(opts) {
  const box = $('#choices');
  box.innerHTML = '';
  box.classList.remove('hide');
  opts.filter((o) => !o.need || needOk(o.need)).forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ch';
    if (o.realm) b.dataset.realm = o.realm;
    if (o.kill) b.classList.add('kill');
    if (o.tag === 'gentle') b.classList.add('warm');
    b.innerHTML = `<span class="n">${i + 1}</span><span class="t">${o.t}${o.note ? `<span class="note">${o.note}</span>` : ''}</span>`;
    b.onclick = () => choose(o, i);
    box.appendChild(b);
  });
}
function choose(o, idx) {
  const box = $('#choices');
  box.innerHTML = '';          // 必须清空：下一幕的 showChoices 靠「没有子节点」判断要不要渲染
  box.classList.add('hide');
  // 声音跟着动作走：敲门、动手、翻页、沉默，各有各的响法
  if (/敲/.test(o.t)) sfx('knock', .95);
  else if (o.kill) sfx('slash', 1);
  else if (o.tag && TAG_SFX[o.tag]) sfx(TAG_SFX[o.tag][0], TAG_SFX[o.tag][1]);
  else if (o.realm) sfx('ring', .3);
  else SND.tap(.09);
  if (o.mark) for (const k in o.mark) S.marks[k] += o.mark[k] || 0;
  if (o.w) S.w = Math.max(0, Math.min(100, S.w + o.w));
  if (o.tag) {
    S.tags[o.tag] = (S.tags[o.tag] || 0) + 1;
    if (o.tag === 'silence') { S.silenceStreak++; if (S.silenceStreak >= 3) unlock('E100'); }
    else S.silenceStreak = 0;
  }
  if (o.flag) S.flags[o.flag] = 1;
  if (o.set) for (const k in o.set) S.flags[k] = o.set[k];
  if (S._isStair) {
    S.sameStair.push(o.k); S.sameStair = S.sameStair.slice(-3);
    if (S.sameStair.length === 3 && new Set(S.sameStair).size === 1) unlock('E110');
    S._isStair = false;
  }
  // 连续十次选第一个选项
  if (idx === 0) { S.firstStreak++; if (S.firstStreak >= 10) unlock('E099'); }
  else S.firstStreak = 0;
  renderMeters();
  resolveGo(o.go);
}
function resolveGo(go) {
  if (!go) return;
  if (typeof go === 'number') { numGo && numGo(go); return; }
  if (go.startsWith('@end:')) return showEnding(go.slice(5));
  if (go === '@door') return doorScene();
  if (go === '@meet') return meeting();
  if (go === '@loop') return transform();
  if (go === '@final') return finalNight();
  if (go === '@catpet') return playSeq([CATEVENT[1]], () => doorScene());
  if (go === '@catsay') return playSeq([CATEVENT[2]], () => doorScene());
}
let numGo = null; // 场景内部按下标跳转（形态/终夜的 beat 图）
// 顺序播一段 beat，结束回调 after(最后的go)
function playSeq(beats, after) {
  let i = 0;
  const step = (lastGo) => {
    if (lastGo === '@door' || lastGo === '@meet') { after && after(lastGo); return; }
    if (i >= beats.length) { after && after(lastGo); return; }
    playBeat(beats[i++], step);
  };
  step();
}

// ------------------------------------------------------------------ 流程
// 场景想要的曲子 + 一个「记忆太重就盖掉它」的开关，统一在 applyBgm 里结算
let sceneBgm = 'theme', endingShown = false, hbOn = false;
function applyBgm() {
  if (endingShown) return;
  const hot = !!(S && S.w >= 80);
  bgm(hot ? 'dread' : sceneBgm);
  if (hot !== hbOn) { hbOn = hot; heartbeat(hot && !muted); }
}
function setScene(name) { sceneBgm = name; applyBgm(); }

function updateChip() { $('#nightChip').textContent = S ? `第 ${S.loop} 夜` : '未入夜'; }
function renderMeters() {
  if (!S) return;
  document.querySelectorAll('.mk').forEach((el) => {
    const k = el.dataset.m;
    el.querySelector('b').textContent = S.marks[k];
    el.classList.toggle('on', S.marks[k] > 0);
  });
  $('#wfill').style.width = S.w + '%';
  $('#wbar').classList.toggle('hot', S.w >= 70);
  document.body.classList.toggle('danger', S.w >= 80);
  applyBgm();
}

function showTitle() {
  S = null; MID = null; saveP();
  endingShown = false;
  updateChip(); renderMeters();
  document.body.classList.remove('danger'); heartbeat(false); hbOn = false;
  setScene('theme');
  $('#scr-end').classList.remove('on');
  $('#playwrap').style.display = 'none';
  const t = $('#scr-title'); t.classList.add('on');
  setBG('title', 'saturate(.7) brightness(.55) contrast(1.06)');
  const canResume = !!(P.mid && P.mid.run);
  t.innerHTML = `
    <div class="kicker">弥萨格档案室 · 未立项任务</div>
    <div class="hero">
      <h1>杀死<span class="kill">守密人</span></h1>
      <div class="en">KILL&nbsp;THE&nbsp;KEEPER</div>
      <p class="lead">规程说：钥冢最底下关着一位守密人，她记的东西太多，再记下去，<b>整座弥萨格就会被写穿</b>。<br>
      拿上裁页刀，下去，杀死她。<em style="color:var(--dim)">——规程是这么说的。规程没说的是：你杀过她一次，就再也不能忘记她。</em></p>
    </div>
    <div class="warn">微恐 · 猎奇 · 有轻微闪烁、低频轰鸣、呼吸与低语声 · 建议戴耳机 · 没有 Jump Scare，但有比它更糟的东西</div>
    <div class="trow">
      <button class="btn primary" id="btnStart">进入钥冢</button>
      ${canResume ? '<button class="btn" id="btnResume">从断点继续（她收好了）</button>' : ''}
      <button class="btn" id="btnBook">结局图鉴 ${P.endings.size}/${TOTAL}</button>
      <button class="btn" id="btnHelp">玩法说明</button>
    </div>
    <div class="statline">已见证形态 ${P.forms.size}/12 · 已入夜 ${P.nights} 次</div>
    <p class="disc">《忘却前夜》同人作品，非官方，与 Qookka Games 无关。玩法致敬《Slay the Princess》；背景取自游戏 CG 素材，版权归原权利人，非商业使用。结局图鉴只存在你的设备上。</p>`;
  $('#btnStart').onclick = () => { sessionFresh = !canResume ? true : sessionFresh; startRun(newRun()); };
  const r = $('#btnResume');
  if (r) r.onclick = resumeRun;
  $('#btnBook').onclick = openBook;
  $('#btnHelp').onclick = openHelp;
  // 封底：十二形态集齐后，在标题页站够九秒
  if (P.forms.size >= 12 && !P.meta.e96 && P.endings.size) {
    setTimeout(() => { if ($('#scr-title').classList.contains('on')) unlock('E096'); }, 9000);
  }
  soundHint();
}
// 浏览器不给手势就不出声，标一个可点的提示，点完即进
function soundHint() {
  const old = $('#sndHint');
  if (SND.ready()) { if (old) old.remove(); return; }
  if (old) return;
  const b = document.createElement('button');
  b.id = 'sndHint'; b.type = 'button'; b.className = 'sndhint';
  b.innerHTML = '♪ 轻触开启声音<span>建议戴耳机</span>';
  b.addEventListener('click', (e) => { e.stopPropagation(); wake(); });
  document.body.appendChild(b);
}

function startRun(run) {
  S = run;
  endingShown = false;
  $('#scr-title').classList.remove('on');
  $('#scr-end').classList.remove('on');
  $('#playwrap').style.display = 'flex';
  P.nights++;
  setScene('night');
  sfx('page', .9);
  const now = new Date();
  if (now.getHours() === 3) unlock('E101');
  const mo = now.getMonth() + 1, d = now.getDate();
  if ((mo === 10 && d === 31) || (mo === 11 && d === 1)) unlock('E108');
  saveP();
  updateChip(); renderMeters();
  playSeq(PROLOGUE, (go) => { if (go === '@door') doorScene(); });
}
function resumeRun() {
  S = JSON.parse(JSON.stringify(P.mid.run));
  MID = P.mid;
  sessionFresh = false;
  endingShown = false;
  $('#scr-title').classList.remove('on');
  $('#playwrap').style.display = 'flex';
  setScene('night');
  updateChip(); renderMeters();
  const at = P.mid.at;
  if (at === 'door') doorScene();
  else if (at === 'meet') meeting();
  else descend();
}

// ---- 下行
function stairLines() {
  const any = S.marks.blood + S.marks.paper + S.marks.salt + S.marks.ash;
  const mk = ['blood', 'paper', 'salt', 'ash'].sort((a, b) => S.marks[b] - S.marks[a])[0];
  const pool = any === 0 ? STAIRS.plain : (STAIRS[mk] || STAIRS.plain);
  return pool[(S.loop - 1) % pool.length];
}
function rotateOpts(opts, n) {
  // 展示上限 6：轮换出现，保证每一条都有被选到的机会
  if (opts.length <= 6) return opts;
  const rest = opts.slice(0, -1), go = opts[opts.length - 1];
  const rot = n % rest.length, pick = [];
  for (let i = 0; i < 5; i++) pick.push(rest[(rot + i) % rest.length]);
  return [...pick, go];
}
function descend() {
  updateChip(); renderMeters();
  setScene('night');
  sfx('step', .8);
  MID = { run: JSON.parse(JSON.stringify(S)), at: 'descend' }; saveP();
  const b = S.loop === 1 ? ['「再确认一遍。」规程说，「取刀，下行，处刑。第 0 条授权你的一切。」']
    : (BRIEF[Math.min(9, S.loop)] || [
      `「第 ${S.loop} 夜。」规程说。它的声音你听着耳熟——不是像它自己，是像你。`,
      '「条款我已经不翻了。你也不必点了。下面只有楼梯、门、和她。一直都是。」']);
  playSeq([
    { bg: S.loop === 1 ? 'hall' : 'voidwalk', who: 'rule', t: b },
    { bg: ['shaft', 'spiral', 'pit'][(S.loop - 1) % 3], who: 'sys', t: stairLines() },
  ], () => stairChoice());
}
function stairChoice() {
  const opts = STAIR_OPTS.filter((o) =>
    (!o.needLoop1 || S.loop === 1) && (!o.needLoop2 || S.loop >= 2) &&
    (!o.needBlade || S.flags.blade) && (!o.needNoBlade || !S.flags.blade));
  S._isStair = true;
  showChoices(rotateOpts(opts, S.loop));
}
function doorScene() {
  MID = { run: JSON.parse(JSON.stringify(S)), at: 'door' }; saveP();
  sfx('creak', .9);
  const lines = DOOR.lines[Math.min(5, S.loop)] || DOOR.lines[5];
  playSeq([{ bg: 'door', who: 'sys', t: lines }], () => {
    const opts = DOOR.opts.filter((o) => (!o.needBlade || S.flags.blade) && (!o.needNoBlade || !S.flags.blade));
    showChoices(rotateOpts(opts, S.loop));
  });
}

// ---- 见面
function meeting() {
  if (muted && mutedThisNight) unlock('E094');
  if (!S.flags.blade) S.bladeStreak++; else S.bladeStreak = 0;
  if (S.bladeStreak >= 5) unlock('E109');
  const form = pickForm();
  S.lastForm = form;
  if (!S.witnessed.includes(form)) S.witnessed.push(form);
  if (!P.forms.has(form)) {
    P.forms.add(form);
    if (P.forms.size >= 12) unlock('E097');
    saveP();
  }
  MID = { run: JSON.parse(JSON.stringify(S)), at: 'meet' }; saveP();
  const F = FORMS[form];
  setScene('night');
  sfx(FORM_SFX[form] || 'whisper', 1.05);   // 她的登场声
  playSeq([
    { bg: F.cg[0], who: 'sys', t: [`—— 第 ${S.loop} 夜 · 形态：${F.name} ——`] },
  ], () => runForm(F));
}
function runForm(F) {
  const beats = F.beats;
  let i = 0;
  const step = (go) => {
    if (go && typeof go === 'string' && go.startsWith('@')) {
      if (go.startsWith('@end:')) return showEnding(go.slice(5));
      if (go === '@loop') return transform();
      if (go === '@final') return finalNight();
    }
    if (typeof go === 'number') { i = go; }
    if (i >= beats.length) return transform();
    const b = { ...beats[i] };
    if (!b.bg) b.bg = F.cg[i % F.cg.length];
    i++;
    playBeat(b, step);
  };
  numGo = (n) => step(n);
  step();
}

// ---- 形态路由
function pickForm() {
  if (S.loop === 1) return 'binder';
  if (S.flags.mirrorBroken) return 'mirror';
  const fromTag = { kill: 'trimmer', gentle: 'lamp', read: 'myriad', dominate: 'tower', grieve: 'salt', silence: 'hollow', faith: 'lastday', name: 'unnamed' };
  const order = Object.entries(S.tags).sort((a, b) => b[1] - a[1]).map((e) => fromTag[e[0]]).filter(Boolean);
  const cand = [];
  if (S.flags.cat) cand.push('cat');
  if ((S.tags.name || 0) === 0 && S.loop >= 3) cand.push('unnamed');
  if (S.loop >= 4 && S.spared >= 2) cand.push('mirror');
  if (S.w >= 75) cand.push('myriad', 'mirror');
  cand.push(...order, 'trimmer', 'lamp', 'salt', 'hollow', 'tower', 'myriad', 'lastday', 'unnamed', 'cat', 'mirror');
  for (const f of cand) {
    if (f && f !== S.lastForm) return f;
  }
  return 'mirror';
}
function transform() {
  S.loop++;
  S.spared = 0;
  updateChip();
  setScene('night');
  sfx('bell', .8);          // 一夜结束的钟
  MID = { run: JSON.parse(JSON.stringify(S)), at: 'descend' }; saveP();
  if (S.loop >= 9) unlock('E104');
  if (S.loop >= 5 && sessionFresh) unlock('E105');
  playSeq([
    { bg: 'blank', who: 'rule', t: INTERLUDE.rule },
    { who: 'sys', t: INTERLUDE.her },
  ], () => {
    if (S.loop >= 6 || (S.loop >= 4 && S.witnessed.length >= 3)) finalNight();
    else descend();
  });
}

// ---- 终夜
function finalNight() {
  updateChip();
  setScene('final');
  sfx('ring', .9);
  // 初代只在终夜现身：算第十二种被见证的形态
  if (!S.witnessed.includes('first')) S.witnessed.push('first');
  if (!P.forms.has('first')) { P.forms.add('first'); if (P.forms.size >= 12) unlock('E097'); saveP(); }
  runBeats(FINAL, (id) => {
    if (id === 'E090' && S) S.flags.readDraft = 1;
    showEnding(id);
  });
}
function runBeats(list, onEnd) {
  let i = 0;
  const step = (go) => {
    if (typeof go === 'string' && go.startsWith('@end:')) return onEnd(go.slice(5));
    if (typeof go === 'number') { i = go; }
    if (i >= list.length) return onEnd('E072');
    const b = { ...list[i] };
    i++;
    playBeat(b, step);
  };
  numGo = (n) => step(n);
  step();
}

// ------------------------------------------------------------------ 结局
function showEnding(id) {
  const idx = ENDINGS.findIndex((x) => x.id === id);
  const e = ENDINGS[idx];
  if (!e) return showTitle();
  const isNew = !P.endings.has(id);
  if (isNew) {
    P.endings.add(id);
    try { walletAdd(2); } catch { /* 钱包不可用就算了 */ }
    saveP();
  }
  if (S) {
    if (e.grp === 'binder' || e.grp === 'lamp') S.spared++;
    if (id === 'E067') S.flags.mirrorBroken = 1;
    if (id === 'E090') S.flags.readDraft = 1;
  }
  heartbeat(false); hbOn = false; endingShown = true;
  document.body.classList.remove('danger');
  // 结局页先留白：音乐淡掉，只留一记收尾声
  bgm(null);
  const tail = e.grp === 'meta' ? 'static' : e.grp === 'zero' ? 'drip' : 'bell';
  setTimeout(() => sfx(tail, e.grp === 'final' ? 1 : .72), 300);
  const grp = GROUPS.find((g) => g.k === e.grp) || { t: '' };
  const no = idx + 1;
  const tint = e.grp === 'final' ? '#d05555' : e.grp === 'meta' ? '#8fbf9f' : e.grp === 'zero' ? '#938b97'
    : (FORMS[e.grp] ? FORMS[e.grp].color : '#d8d2c4');
  setBG(e.grp === 'meta' ? 'end3' : e.grp === 'final' ? 'hands' : 'flower', 'brightness(.72)');
  const over = !S || e.grp === 'zero' || e.grp === 'final' || e.grp === 'meta';
  $('#playwrap').style.display = 'none';
  const sc = $('#scr-end'); sc.classList.add('on');
  sc.innerHTML = `
    <div class="endno">ENDING ${String(no).padStart(3, '0')} / ${TOTAL}</div>
    <h1 class="endtitle" style="--et:${tint}">${e.t}</h1>
    <div class="endgrp">${grp.t}${S ? ` · 第 ${S.loop} 夜` : ''}</div>
    ${isNew ? '<span class="endnew on">新结局 · 银芯 +2</span>' : ''}
    <div class="endtxt">${e.txt.map((p) => `<p>${p}</p>`).join('')}</div>
    <div class="erow">
      ${over
        ? '<button class="btn primary" id="btnHome">回到档案室</button>'
        : '<button class="btn primary" id="btnNext">她变了。再下一夜</button><button class="btn" id="btnHome">结束这一夜</button>'}
      <button class="btn" id="btnBook2">结局图鉴 ${P.endings.size}/${TOTAL}</button>
    </div>
    <p class="disc">结局进度存在本机 · 已归档 ${P.endings.size} / ${TOTAL}。</p>`;
  const home = () => showTitle();
  if (over) $('#btnHome').onclick = home;
  else {
    $('#btnNext').onclick = () => {
      sc.classList.remove('on');
      $('#playwrap').style.display = 'flex';
      endingShown = false;
      sfx('paper', .7);
      transform();
    };
    $('#btnHome').onclick = home;
  }
  $('#btnBook2').onclick = openBook;
  if (P.endings.size >= TOTAL) unlock('E098');
}

// ------------------------------------------------------------------ 图鉴
let galFast = { n: 0, t: 0 };
function ekColor(grp) {
  return grp === 'final' ? '#d05555' : grp === 'meta' ? '#8fbf9f' : grp === 'zero' ? '#938b97'
    : (FORMS[grp] ? FORMS[grp].color : '#d8d2c4');
}
function openBook() {
  const box = $('#mbox');
  sfx('page', .85);
  const secs = GROUPS.map((g) => {
    const list = ENDINGS.map((e, i) => ({ e, i })).filter((x) => x.e.grp === g.k);
    const got = list.filter((x) => P.endings.has(x.e.id)).length;
    return `<div class="gsec">${g.t} <small>${g.d} · ${got}/${list.length}</small></div>
      <div class="ggrid">${list.map((x) => {
        const un = P.endings.has(x.e.id);
        return `<div class="ek ${un ? '' : 'lock'}" data-e="${x.e.id}">
          <b style="--ec:${ekColor(x.e.grp)}">${un ? x.e.t : '？？'}</b>
          <span>${un ? `No.${String(x.i + 1).padStart(3, '0')} · 点击回看` : x.e.hint}</span>
        </div>`;
      }).join('')}</div>`;
  }).join('');
  box.innerHTML = `
    <div class="mhead"><h3>结局图鉴</h3><small>${P.endings.size} / ${TOTAL}</small>
      <button class="x" id="mClose">✕</button></div>
    ${secs}
    <p class="mfoot">档案室按来历分了章。未解锁的条目只给一句谜面——按谜面走，多半能撞上。</p>`;
  $('#modal').classList.add('on');
  $('#mClose').onclick = closeM;
  box.querySelectorAll('.ek:not(.lock)').forEach((el) => {
    el.onclick = () => {
      const now = Date.now();
      if (now - galFast.t > 30000) galFast = { n: 0, t: now };
      if (++galFast.n >= 18) unlock('E111');
      review(el.dataset.e);
    };
  });
  if (P.endings.size >= TOTAL) unlock('E112');
}
function review(id) {
  const e = ENDINGS.find((x) => x.id === id);
  const i = ENDINGS.indexOf(e) + 1;
  const g = (GROUPS.find((x) => x.k === e.grp) || {}).t || '';
  $('#mbox').innerHTML = `
    <div class="rev">
      <div class="no">No.${String(i).padStart(3, '0')} · ${g}</div>
      <div class="tt" style="--ec:${ekColor(e.grp)}">${e.t}</div>
      <div class="tx">${e.txt.map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="erow"><button class="btn" id="rBack">返回图鉴</button></div>
    </div>`;
  $('#rBack').onclick = openBook;
}
function closeM() { $('#modal').classList.remove('on'); }

// ------------------------------------------------------------------ 帮助
function openHelp() {
  P.meta.helpN = (P.meta.helpN || 0) + 1;
  if (P.meta.helpN >= 10) unlock('E107');
  saveP();
  const short = P.meta.helpN >= 8;
  $('#mbox').innerHTML = `
    <div class="mhead"><h3>玩法说明</h3><button class="x" id="mClose">✕</button></div>
    <div class="rules">${short
      ? '<p>「你已经不需要这个了。去下面吧。」</p>'
      : `
      <p><b>任务：</b>规程派你下钥冢，杀死最底层那位守密人。规程只说对了任务这一部分。</p>
      <h4>一夜的流程</h4>
      <p>下行（楼梯上有岔路）→ 门（敲，还是推）→ 见她（她每晚不太一样）→ 结局，或者——她变了，再下一夜。</p>
      <h4>刻痕</h4>
      <p><b class="q">血</b>（动手）· <b class="q">纸</b>(读) · <b class="q">盐</b>（疼）· <b class="q">灰</b>（不作为）。你做什么，钥冢就长成什么样，她也就变成什么样。</p>
      <h4>记忆的重量</h4>
      <p>杀、读、记都会让它涨。它太满的时候，有些夜会自己找上门；它很轻的时候，另一些夜才够得着。</p>
      <h4>终夜</h4>
      <p>同一局里见证三种以上形态，或者熬到第六夜之后——钥冢的最底层会打开。所有终夜结局都在那儿。</p>
      <h4>图鉴</h4>
      <p>${TOTAL} 个结局，存本机，新结局给银芯。「场外」一章的解锁条件不太像结局——它更像档案室在偷看你。</p>
      <h4>致某位读者</h4>
      <p>不用全收集。挑你疼的那几条走就行。</p>`}</div>`;
  $('#modal').classList.add('on');
  $('#mClose').onclick = closeM;
}

// ------------------------------------------------------------------ 元结局
const META_IDS = new Set(['E094', 'E095', 'E096', 'E097', 'E098', 'E099', 'E100', 'E101', 'E102', 'E103', 'E104', 'E105', 'E106', 'E107', 'E108', 'E109', 'E110', 'E111', 'E112']);
function unlock(id) {
  if (!META_IDS.has(id) || P.endings.has(id)) return;
  P.endings.add(id);
  try { walletAdd(2); } catch { /* noop */ }
  saveP();
  sfx('static', .5);           // 档案室翻到你的那一页
  const e = ENDINGS.find((x) => x.id === id);
  toast(`场外档案 · ${e ? e.t : id} 已归档（银芯 +2）`);
}
let toastT = null;
function toast(msg) {
  let el = $('#kp-toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'kp-toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:18%;transform:translateX(-50%);z-index:60;padding:9px 16px;border-radius:11px;background:rgba(18,16,22,.94);border:1px solid rgba(201,169,97,.4);color:#e8e2d6;font-size:12px;letter-spacing:.06em;transition:opacity .3s;max-width:86vw;text-align:center';
    document.body.appendChild(el);
  }
  el.textContent = msg; el.style.opacity = 1;
  clearTimeout(toastT); toastT = setTimeout(() => { el.style.opacity = 0; }, 3000);
}

// ------------------------------------------------------------------ 顶栏
$('#soundBtn').onclick = () => {
  muted = SND.toggleMute();
  $('#soundBtn').classList.toggle('off', muted);
  toggleCount++;
  if (muted) mutedThisNight = true;
  else if (S && S.w >= 80) { hbOn = true; heartbeat(true); }
  if (toggleCount >= 6) { unlock('E095'); toggleCount = 0; }
};
$('#helpBtn').onclick = openHelp;
$('#bookBtn').onclick = openBook;
$('#modal').addEventListener('click', (e) => { if (e.target === $('#modal')) closeM(); });
$('#ptext').addEventListener('click', onTextTap);

// ------------------------------------------------------------------ 计时类元事件
loadP();
// 中途刷新回来 → 她收的（E103）：第一次回来才发
if (P.mid && P.mid.run && !P.meta._backSeen) {
  P.meta._backSeen = 1; saveP();
  setTimeout(() => unlock('E103'), 1500);
} else if (!P.mid) {
  delete P.meta._backSeen;
}
// 跨零点 → 缝线（E102）
let dayStamp = new Date().getDate();
setInterval(() => {
  if (new Date().getDate() !== dayStamp) {
    dayStamp = new Date().getDate();
    if (S && !P.endings.has('E102')) unlock('E102');
  }
}, 30000);
// 不问（E106）：第五夜仍没开过帮助
setInterval(() => {
  if (S && S.loop >= 5 && !(P.meta.helpN > 0)) unlock('E106');
}, 5000);

showTitle();
