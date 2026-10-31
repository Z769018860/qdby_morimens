// 忘却王权：引擎 + 界面
//
// 一句话规则：一张卡上站着一个唤醒体，提一个要求。你只能准或不准，
// 两条路都动账。四项里任何一项见了底、或者涨到顶，你的任期当场结束。
//
// 这一页刻意不用 css/style.css —— 和狼人杀一样自带一套壳，省一次阻塞请求。
// 所有状态都在 S 里，存档就是 JSON.stringify(S)，刷新不丢。

import { CHARS, SYS, CARDS, TIDES, ENDINGS, DIFFS, REALMS } from './reign/data.js';
import { FACES } from './reign/art.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (n) => Math.floor(Math.random() * n);

const KEY_SAVE = 'zjtt:reign:save';
const KEY_BEST = 'zjtt:reign:best';
const KEY_END = 'zjtt:reign:endings';
const KEY_SND = 'zjtt:reign:sound';

const METERS = [
  { k: 'mem', n: '记忆', c: '#a67cff', tip: '世界靠被记得立住。见底=你被忘掉；满溢=一切都凝固在昨天。' },
  { k: 'san', n: '理智', c: '#6ea8ff', tip: '你自己的清醒。见底=你成了黑池的门；满溢=你看穿一切，把线剪了。' },
  { k: 'core', n: '银芯', c: '#e3b341', tip: '学校的血。见底=屏障熄灯；满溢=审查会来把你买走。' },
  { k: 'bond', n: '羁绊', c: '#e0575f', tip: '他们信不信你。见底=没人再应你；满溢=他们替你挡下所有。' },
];

const byId = new Map(CARDS.map((c) => [c.id, c]));
const tideById = new Map(TIDES.map((c) => [c.id, c]));

// ------------------------------------------------------------------ 音效
// 全部现场合成：三个短音，不加任何请求。手机静音键之外的开关放顶栏。
const Snd = (() => {
  let ctx = null;
  let on = true;
  try { on = localStorage.getItem(KEY_SND) !== '0'; } catch (e) { /* 无痕模式 */ }
  const ac = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  const tone = (freq, dur, type, gain) => {
    if (!on) return;
    const c = ac(); if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(gain || 0.09, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  };
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem(KEY_SND, on ? '1' : '0'); } catch (e) {} return on; },
    deal() { tone(320, 0.1, 'triangle', 0.05); },
    yes() { tone(392, 0.16, 'sine', 0.08); tone(587, 0.22, 'sine', 0.05); },
    no() { tone(233, 0.16, 'sine', 0.08); tone(175, 0.26, 'sine', 0.05); },
    warn() { tone(110, 0.4, 'sawtooth', 0.05); },
    end() { tone(196, 0.8, 'sine', 0.07); tone(147, 1.2, 'sine', 0.05); },
  };
})();

// ------------------------------------------------------------------ 存档
const load = (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

let S = null;        // 当前这一局
let cur = null;      // 当前这张卡
let busy = false;    // 结算动画期间锁输入
let soundOn = Snd.on;

// ------------------------------------------------------------------ 开局
function newRun(diffKey) {
  const d = DIFFS.find((x) => x.k === diffKey) || DIFFS[1];
  const marks = [];
  for (let i = 1; i <= 5; i++) marks.push(Math.round((d.days * i) / 6));
  return {
    v: 1, d: d.k, days: d.days, day: 0,
    mem: d.start, san: d.start, core: d.start, bond: d.start, tide: 6,
    seen: [], queue: [], flags: [], last: [],
    tides: 0, marks, over: null, log: [],
  };
}

const diffOf = (k) => DIFFS.find((x) => x.k === k) || DIFFS[1];

// ------------------------------------------------------------------ 抽卡
const actOk = (act, p) => act === 0 || (act === 1 ? p < 0.5 : act === 2 ? p >= 0.18 && p < 0.92 : p >= 0.5);

function pickCard() {
  const S_ = S;
  // 1) 到期的连锁卡优先
  const due = S_.queue.filter((q) => q.at <= S_.day).sort((a, b) => a.at - b.at)[0];
  if (due) {
    S_.queue = S_.queue.filter((q) => q !== due);
    const c = byId.get(due.id);
    if (c) return c;
  }
  // 2) 池子里按权重抽，避开刚说过话的人
  const p = S_.day / S_.days;
  const near = new Set(S_.last.slice(-3));
  let pool = CARDS.filter((c) => !c.chain && S_.seen.indexOf(c.id) < 0 && actOk(c.act, p));
  if (!pool.length) {
    S_.seen = S_.seen.filter((id) => (byId.get(id) || {}).act !== 0);
    pool = CARDS.filter((c) => !c.chain && S_.seen.indexOf(c.id) < 0 && actOk(c.act, p));
  }
  if (!pool.length) {
    S_.seen = [];
    pool = CARDS.filter((c) => !c.chain);
  }
  const fresh = pool.filter((c) => !near.has(c.who));
  const use = fresh.length ? fresh : pool;
  let sum = 0;
  for (const c of use) sum += c.w || 1;
  let r = Math.random() * sum;
  for (const c of use) { r -= c.w || 1; if (r <= 0) return c; }
  return use[use.length - 1];
}

// ------------------------------------------------------------------ 结算
// 越靠近两端越难推：72 以上再加分、28 以下再扣分都会打折扣，最多打六折。
// 没有这条，四项里总有一项会被一路推到底（实测随机策略三成是记忆直接顶满收场）。
function soft(v, dv) {
  if (dv > 0 && v > 72) return 1 - Math.min(0.4, (v - 72) / 70);
  if (dv < 0 && v < 28) return 1 - Math.min(0.4, (28 - v) / 70);
  return 1;
}

function applyFx(fx) {
  if (!fx) return [];
  const d = diffOf(S.d);
  const out = [];
  for (const k in fx) {
    let v = fx[k];
    if (!v) continue;
    // 黑潮单独一把尺子：它没有软上限，只有「涨够了就终局」
    const sc = k === 'tide' ? d.tide * 0.55 : d.scale;
    let dv = Math.round(v * sc);
    if (dv === 0) dv = v > 0 ? 1 : -1;
    if (k !== 'tide') dv = Math.round(dv * soft(S[k], dv));
    if (!dv) continue;
    const before = S[k];
    S[k] = clamp(S[k] + dv, 0, 100);
    const real = S[k] - before;
    out.push({ k, v: Math.round(real), from: before, to: S[k] });
  }
  return out;
}

function checkEnd() {
  if (S.tide >= 100) return 'tide';
  for (const m of METERS) {
    if (S[m.k] <= 0) return m.k + '0';
    if (S[m.k] >= 100) return m.k + '100';
  }
  return null;
}

// ------------------------------------------------------------------ 界面：数值条
function buildMeters() {
  const wrap = $('#meters');
  wrap.innerHTML = METERS.map((m) => `
    <div class="mtr" data-k="${m.k}" title="${m.tip}">
      <span class="mico">${icon(m.k)}</span>
      <span class="mbody">
        <span class="mrow"><b class="mn">${m.n}</b><b class="mv">50</b></span>
        <span class="bar"><i style="background:${m.c}"></i></span>
      </span>
    </div>`).join('');
}

function icon(k) {
  const p = {
    mem: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5zM4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5"/>',
    san: '<path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    core: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M9.4 9.6h4a1.9 1.9 0 0 1 0 3.8h-4"/>',
    bond: '<path d="M9.5 14.5 6 18a3.2 3.2 0 0 1-4.5-4.5L5 10M14.5 9.5 18 6a3.2 3.2 0 0 1 4.5 4.5L19 14"/><path d="M9 15l6-6"/>',
  }[k];
  return `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

function paintMeters(anim) {
  if (!S) { $('#dayChip').textContent = '任期未开始'; return; }
  for (const m of METERS) {
    const el = $(`.mtr[data-k="${m.k}"]`);
    if (!el) continue;
    const v = Math.round(S[m.k]);
    el.querySelector('.mv').textContent = String(v);
    el.querySelector('.bar i').style.width = v + '%';
    el.classList.toggle('low', v <= 15);
    el.classList.toggle('high', v >= 88);
    el.classList.toggle('dead', v <= 0 || v >= 100);
  }
  const t = $('#tideFill');
  if (t) t.style.width = S.tide + '%';
  const tb = $('#tideWrap');
  if (tb) tb.classList.toggle('high', S.tide >= 70);
  $('#dayChip').textContent = `第 ${Math.min(S.day + 1, S.days)} / ${S.days} 天`;
}

function chips(list, dir) {
  const host = $('#floats');
  if (!host) return;
  for (const e of list) {
    if (!e.v) continue;
    const m = METERS.find((x) => x.k === e.k);
    const target = $(`.mtr[data-k="${e.k}"]`);
    if (!target) continue;
    const r = target.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    const el = document.createElement('span');
    el.className = 'float ' + (e.v > 0 ? 'up' : 'down');
    el.textContent = `${m ? m.n : '黑潮'} ${e.v > 0 ? '+' : ''}${e.v}`;
    el.style.left = r.left - h.left + r.width / 2 + 'px';
    el.style.top = r.bottom - h.top + 10 + 'px';
    host.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
}

// ------------------------------------------------------------------ 卡片渲染
function charOf(who) {
  const c = CHARS[who];
  if (c) return { n: c.n, tag: c.tag, realm: c.realm, call: c.call || '守密人', face: FACES[who] || null };
  const s = SYS[who];
  if (s) return { n: s.n, tag: s.tag, realm: 'none', face: null };
  return { n: '？', tag: '', realm: 'none', face: null };
}

function cardHTML(card, isTide) {
  if (isTide) {
    // 潮汐没有立绘也没有说话人：一张「贴在校门上的通告」，署名写它是第几次
    return `
    <div class="face">
      <div class="art sigil tide-sig">${sigil('tide')}</div>
      <div class="artmask"></div>
      <span class="kind tide">潮汐</span>
    </div>
    <div class="bubble">
      <p class="say">${card.say}</p>
      <div class="name"><b>${card.title}</b><span>躲不掉的一张</span></div>
    </div>`;
  }
  const c = charOf(card.who);
  const r = REALMS[c.realm] || REALMS.none;
  const art = c.face
    ? `<img class="art" src="${c.face}" alt="" draggable="false">`
    : `<div class="art sigil">${sigil(card.who)}</div>`;
  const tag = c.realm === 'none' ? '<span class="kind sys">公文</span>' : '';
  const realmPill = c.realm === 'none' ? ''
    : `<div class="realm" style="--rc:${r.c}">${r.n}</div>`;
  return `
    <div class="face">
      ${art}
      <div class="artmask"></div>
      ${tag}
      ${realmPill}
    </div>
    <div class="bubble">
      <p class="say">${card.say}</p>
      <div class="name"><b>${c.n}</b><span>${c.tag}</span></div>
    </div>`;
}

function sigil(who) {
  // 公文卡没有立绘：给一个界域感的印记，不同事件换一个形状
  const map = {
    budget: '<path d="M4 7h16v10H4zM4 11h16" /><circle cx="9" cy="14" r="1.4"/>',
    barrier: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
    dorm: '<path d="M4 20V8l8-4 8 4v12z"/><path d="M9 20v-5h6v5"/>',
    bell: '<path d="M6 17h12l-1.6-2.4V10a4.4 4.4 0 0 0-8.8 0v4.6L6 17z"/><path d="M10 20h4"/>',
    funeral: '<path d="M5 20V9h14v11"/><path d="M12 4v8M9.5 6.5h5"/>',
    blackout: '<path d="M13 3 6 13h5l-1 8 7-10h-5z"/>',
    infirmary: '<path d="M12 5v14M5 12h14"/>',
    snow: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9"/>',
    audit: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9.5 13h6M9.5 17h4"/>',
    rumor: '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M8 12a4 4 0 0 1 8 0"/><circle cx="12" cy="15" r="1.6"/>',
    tide: '<path d="M3 14c2.4 0 2.4-2 4.8-2s2.4 2 4.8 2 2.4-2 4.8-2 2.4 2 2.4 2"/><path d="M3 18.5c2.4 0 2.4-2 4.8-2s2.4 2 4.8 2 2.4-2 4.8-2 2.4 2 2.4 2"/><path d="M12 4v6M9.6 6.4 12 4l2.4 2.4"/>',
  }[who] || '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';
  return `<svg viewBox="0 0 24 24" width="72" height="72" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${map}</svg>`;
}

function showCard(card, isTide) {
  cur = card;
  const deck = $('#deck');
  const el = document.createElement('div');
  el.className = 'card' + (isTide ? ' is-tide' : '');
  el.id = 'card';
  el.innerHTML = cardHTML(card, isTide);
  deck.innerHTML = '';
  deck.appendChild(el);

  const yes = card.yes, no = card.no;
  $('#btnYes').querySelector('span').textContent = yes.l;
  $('#btnNo').querySelector('span').textContent = no.l;
  $('#btnYes').disabled = false;
  $('#btnNo').disabled = false;
  $('#choices').classList.remove('lock');
  $('#choices').classList.remove('hide');

  requestAnimationFrame(() => el.classList.add('in'));
  bindDrag(el);
  Snd.deal();
  paintMeters();
}

// ------------------------------------------------------------------ 拖拽
function bindDrag(el) {
  let sx = 0, sy = 0, dx = 0, dy = 0, drag = false, pid = null;
  const reset = () => {
    el.style.transition = 'transform .28s cubic-bezier(.2,.8,.3,1)';
    el.style.transform = '';
    el.classList.remove('lean-l', 'lean-r');
    $('#hintNo').classList.remove('on');
    $('#hintYes').classList.remove('on');
  };
  el.addEventListener('pointerdown', (e) => {
    if (busy) return;
    drag = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY; dx = dy = 0;
    el.style.transition = 'none';
    try { el.setPointerCapture(pid); } catch (err) {}
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    const rot = clamp(dx / 16, -14, 14);
    el.style.transform = `translate(${dx}px, ${dy * 0.25}px) rotate(${rot}deg)`;
    const t = clamp(Math.abs(dx) / 90, 0, 1);
    el.style.setProperty('--lean', String(t));
    $('#hintNo').classList.toggle('on', dx < -30);
    $('#hintYes').classList.toggle('on', dx > 30);
  });
  const up = () => {
    if (!drag) return;
    drag = false;
    if (dx > 86) { reset(); choose('yes'); }
    else if (dx < -86) { reset(); choose('no'); }
    else reset();
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
}

// ------------------------------------------------------------------ 选择
function choose(side) {
  if (busy || !cur) return;
  busy = true;
  $('#choices').classList.add('lock');
  const card = cur;
  const opt = card[side];
  const isTide = !!tideById.get(card.id);

  if (isTide) {
    S.tides = Math.max(S.tides, TIDES.findIndex((t) => t.id === card.id) + 1);
    // 潮水会退：每次扛过一波，黑潮回落一段，否则九十天的任期里它只会单向涨到底
    S.tide = clamp(S.tide - 8, 0, 100);
  }
  S.pending = null;
  S.last.push(card.who);
  if (S.last.length > 8) S.last.shift();
  if (card.id !== 'intro' && S.seen.indexOf(card.id) < 0) S.seen.push(card.id);

  const eff = applyFx(opt.fx, side);
  if (opt.set) for (const f of opt.set) if (S.flags.indexOf(f) < 0) S.flags.push(f);
  if (opt.then) S.queue.push({ at: S.day + (opt.then.d || 2), id: opt.then.id });

  S.log.push({ day: S.day + 1, who: card.who, side, l: opt.l });

  const cardEl = $('#card');
  if (cardEl) {
    cardEl.style.transition = 'transform .34s ease, opacity .34s ease';
    cardEl.style.transform = `translate(${side === 'yes' ? 140 : -140}%, -6%) rotate(${side === 'yes' ? 12 : -12}deg)`;
    cardEl.style.opacity = '0';
  }
  side === 'yes' ? Snd.yes() : Snd.no();

  // 反应台词：卡片退场的位置换成一页「回执」，读完了自动翻下一天
  setTimeout(() => {
    paintMeters(true);
    chips(eff, side);
    showReply(card, side, opt, eff);
  }, 170);
}

function showReply(card, side, opt, eff) {
  const c = charOf(card.who);
  $('#choices').classList.add('hide');
  const deck = $('#deck');
  const el = document.createElement('div');
  el.className = 'reply ' + (side === 'yes' ? 'y' : 'n');
  el.innerHTML = `
    <div class="rhead"><span class="rk">${side === 'yes' ? '你准许了' : '你没有准许'}</span><b>${opt.l}</b></div>
    <p class="rline">${opt.re || ''}</p>
    <div class="rwho">— ${c.n}</div>
    <button class="rnext" type="button">继续 <em>›</em></button>`;
  deck.innerHTML = '';
  deck.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));

  const end = checkEnd();
  const go = () => {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    if (end) { finish(end); return; }
    advance();
  };
  el.querySelector('.rnext').addEventListener('click', go);
  // 反应台词不长，给自己留一口气再看下一条；有空点也能直接跳过
  const wait = 900 + Math.min(1500, (opt.re || '').length * 34);
  el._timer = setTimeout(go, wait);
}

function advance() {
  S.day += 1;
  const d = diffOf(S.d);
  // 每天三件小事：黑潮涨一点，记忆漏一点（世界本来就在忘记），银芯烧一点（水电工资）
  S.tide = clamp(S.tide + 0.2 * d.tide, 0, 100);
  S.mem = clamp(S.mem - 0.18, 0, 100);
  S.core = clamp(S.core - 0.1, 0, 100);
  if (S.tide >= 100) { finish('tide'); return; }
  if (S.mem <= 0) { finish('mem0'); return; }
  if (S.core <= 0) { finish('core0'); return; }
  if (S.day >= S.days) { finish('survive'); return; }

  // 潮汐到点：插一张强制卡，不占普通卡池
  const mark = S.marks[S.tides];
  let card, isTide = false;
  if (mark != null && S.day >= mark && S.tides < TIDES.length) {
    card = TIDES[S.tides];
    isTide = true;
  } else {
    card = pickCard();
  }
  // 存档记住「轮到哪张卡」：刷新回来还发同一张，不会白白换人
  S.pending = isTide ? { tide: S.tides } : { id: card.id };
  save(KEY_SAVE, S);
  paintMeters();
  showCard(card, isTide);
  busy = false;
}

// ------------------------------------------------------------------ 结局
function collectEnd(id) {
  const got = load(KEY_END, {});
  got[id] = (got[id] || 0) + 1;
  save(KEY_END, got);
  const best = load(KEY_BEST, { runs: 0, bestDay: 0, bestEnd: null });
  best.runs = (best.runs || 0) + 1;
  if ((S.day || 0) > (best.bestDay || 0)) { best.bestDay = S.day; best.bestEnd = id; }
  if (id === 'survive_gold' && !best.gold) best.gold = 1;
  best.last = Date.now();
  save(KEY_BEST, best);
}

function surviveId() {
  const { mem, san, core, bond, tide } = S;
  if (Math.min(mem, san, core, bond) >= 62 && tide < 38) return 'survive_gold';
  const arr = [['mem', 'survive_mem'], ['san', 'survive_san'], ['core', 'survive_core'], ['bond', 'survive_bond']];
  const top = arr.slice().sort((a, b) => S[b[0]] - S[a[0]])[0];
  if (S[top[0]] >= 76) return top[1];
  return 'survive_plain';
}

function finish(kind) {
  busy = true;
  const id = kind === 'survive' ? surviveId() : kind;
  S.over = id;
  collectEnd(id);
  try { localStorage.removeItem(KEY_SAVE); } catch (e) {}
  Snd.on && Snd.end();
  const e = ENDINGS[id] || ENDINGS.survive_plain;
  const total = S.days;
  const day = Math.min(S.day, total);

  const box = $('#scr-end');
  box.innerHTML = `
    <div class="endshell">
      <p class="kicker">任期结束</p>
      <h1 style="--ec:${e.c}">${e.t}</h1>
      <p class="etag">${e.tag} · 第 ${day} 天 / 共 ${total} 天</p>
      <div class="etext">
        <p>${e.d}</p>
        <p class="ecme">${e.e}</p>
      </div>
      <div class="estats">
        ${METERS.map((m) => `<div><span>${m.n}</span><b>${S[m.k]}</b></div>`).join('')}
        <div><span>黑潮</span><b>${Math.round(S.tide)}</b></div>
        <div><span>处理公文</span><b>${S.log.length}</b></div>
      </div>
      <div class="erow">
        <button class="btn primary" id="againBtn" type="button">再来一任</button>
        <button class="btn" id="bookBtn" type="button">结局图鉴</button>
        <a class="btn ghost" href="index.html">回到首页</a>
      </div>
      <div class="elog">${S.log.slice(-8).map((l) => `<span>第 ${l.day} 天 · ${l.l}</span>`).join('')}</div>
    </div>`;
  $('#againBtn').addEventListener('click', () => { S = null; renderTitle(); screen('title'); });
  $('#bookBtn').addEventListener('click', showBook);
  screen('end');
  busy = false;
}

// ------------------------------------------------------------------ 画面切换
function screen(name) {
  $$('.scr').forEach((s) => s.classList.toggle('on', s.id === 'scr-' + name));
  document.body.classList.toggle('playing', name === 'play');
  paintMeters();
}

// 开场卡：交代规则用，不走卡池、不进 seen、也不占天数
const INTRO = {
  id: 'intro', who: 'tawil',
  say: '任命书已经签了。这所学校黑潮在涨、账上见底、学生不太像人——现在都归你管。从今天起，每件事都会有人走到你桌前问你。',
  yes: { l: '我接下了', fx: { bond: 3, san: -2 }, re: '很好。第一份公文已经在你桌上。' },
  no: { l: '现在反悔还来得及吗', fx: { san: 2, mem: -2 }, re: '来不及了。门在你背后锁上，是从外面锁的。' },
};

function startRun(diffKey) {
  S = newRun(diffKey);
  save(KEY_SAVE, S);
  screen('play');
  $('#deck').innerHTML = '';
  paintMeters();
  busy = false;
  showCard(INTRO, false);
}

// ------------------------------------------------------------------ 图鉴
function showBook() {
  const got = load(KEY_END, {});
  const all = Object.keys(ENDINGS);
  const n = all.filter((k) => got[k]).length;
  const html = `
    <div class="modalbox">
      <div class="mhead">
        <h3>结局图鉴 <small>${n} / ${all.length}</small></h3>
        <button class="x" type="button" data-close>×</button>
      </div>
      <div class="book">
        ${all.map((k) => {
          const e = ENDINGS[k];
          const has = got[k];
          return `<div class="bk ${has ? '' : 'lock'}">
            <b style="--ec:${e.c}">${has ? e.t : '？？？'}</b>
            <span>${has ? e.tag : '还没走到过这里'}</span>
          </div>`;
        }).join('')}
      </div>
      <p class="mfoot">结局一共 ${all.length} 个：四项资源各有一头，黑潮满顶一个，撑满任期五个。撑满时四项都不低于 62 且黑潮不高于 38，才是「守灯人」。</p>
    </div>`;
  openModal(html);
}

function openModal(html) {
  const m = $('#modal');
  m.innerHTML = html;
  m.classList.add('on');
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => m.classList.remove('on')));
  m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('on'); }, { once: true });
}

// ------------------------------------------------------------------ 标题页
function renderTitle() {
  const sv = load(KEY_SAVE, null);
  const best = load(KEY_BEST, { runs: 0 });
  const got = load(KEY_END, {});
  const n = Object.keys(got).length;
  $('#scr-title').innerHTML = `
    <div class="titleshell">
      <div class="hero">
        <p class="kicker">MORIMENS · FAN GAME</p>
        <h1>忘却王权</h1>
        <p class="sub">弥萨格 · 守密人的任期</p>
        <p class="lead">每一天，都有一个唤醒体走到你的桌前，提一个要求。<br>
        你只能<b>准</b>，或者<b>不准</b>——两条路都在动账。<br>
        <span class="four">记忆 · 理智 · 银芯 · 羁绊</span><br>
        任何一项见了底，或者涨到顶，这一任就结束了。</p>
      </div>
      <div class="diffs">
        ${DIFFS.map((d) => `
          <button class="diff" type="button" data-d="${d.k}">
            <b>${d.n}</b>
            <span class="dd">${d.days} 天 · ${d.tag}</span>
            <span class="dx">${d.d}</span>
          </button>`).join('')}
      </div>
      <div class="startrow">
        ${sv ? `<button class="btn primary" id="contBtn" type="button">继续第 ${Math.min(sv.day + 1, sv.days)} 天</button>` : ''}
        <button class="btn" id="bookBtn2" type="button">结局图鉴 ${n} / ${Object.keys(ENDINGS).length}</button>
        <button class="btn ghost" id="ruleBtn" type="button">怎么玩</button>
      </div>
      ${best.runs ? `<p class="bestline">已经当过 ${best.runs} 任守密人 · 最长撑到第 ${best.bestDay} 天</p>` : ''}
      <p class="discl">同人作品，非官方设定。人物、界域、银芯与弥萨格出自《忘却前夜》，玩法致敬 Reigns。</p>
    </div>`;

  $$('#scr-title .diff').forEach((b) => {
    b.addEventListener('click', () => {
      if (sv && !confirmNotOverwrite()) return;
      startRun(b.dataset.d);
    });
  });
  const cont = $('#contBtn');
  if (cont && sv) {
    cont.addEventListener('click', () => {
      S = sv;
      // 老存档（或手改过的存档）可能少字段：补齐，别让读档一步就崩
      const fresh = newRun(S.d);
      for (const k of ['seen', 'queue', 'flags', 'last', 'log']) if (!Array.isArray(S[k])) S[k] = fresh[k];
      if (!Array.isArray(S.marks) || S.marks.length !== 5) S.marks = fresh.marks;
      if (typeof S.tides !== 'number') S.tides = 0;
      if (typeof S.days !== 'number') S.days = fresh.days;
      screen('play');
      paintMeters();
      busy = false;
      advanceFromSave();
    });
  }
  $('#bookBtn2').addEventListener('click', showBook);
  $('#ruleBtn').addEventListener('click', showRules);
}

function confirmNotOverwrite() {
  return window.confirm('还有一局没打完（第 ' + (load(KEY_SAVE, {}).day + 1) + ' 天）。开新的会覆盖它，确定吗？');
}

function advanceFromSave() {
  // 存档里带了「轮到哪张卡」，读档就发同一张，不重抽
  const p = S.pending;
  if (p && p.tide != null && TIDES[p.tide]) showCard(TIDES[p.tide], true);
  else if (p && p.id && byId.get(p.id)) showCard(byId.get(p.id), false);
  else showCard(pickCard(), false);
  busy = false;
}

function showRules() {
  openModal(`
    <div class="modalbox">
      <div class="mhead"><h3>怎么玩</h3><button class="x" type="button" data-close>×</button></div>
      <div class="rules">
        <p>每一张卡都是一个唤醒体走到你桌前。左右滑动卡片，或者点下面两个按钮：<b>左边是不准，右边是准许</b>。</p>
        <h4>四项账</h4>
        <ul>
          <li><b>记忆</b>：世界靠「被记得」立住。见底你会被忘掉；满溢一切都凝固。</li>
          <li><b>理智</b>：你自己的清醒。见底你成为黑池的门；满溢你把所有人都看成数据。</li>
          <li><b>银芯</b>：学校的血。见底屏障熄灯；满溢审查会来把你买走。</li>
          <li><b>羁绊</b>：他们信不信你。见底没人再应你；满溢他们替你挡下一切。</li>
        </ul>
        <h4>黑潮</h4>
        <p>顶部那条紫色的是黑潮，它每天都在涨，你做的某些决定会推得更快。涨满就直接终局。每五分之一任期会有一次<b>潮汐</b>，那是一张躲不掉的卡。</p>
        <h4>撑到最后</h4>
        <p>任期走完不算赢，只是没输。四项都不低于 62、黑潮不高于 38，才会拿到金色的那个结局。</p>
      </div>
    </div>`);
}

// ------------------------------------------------------------------ 启动
function boot() {
  buildMeters();
  renderTitle();
  screen('title');
  $('#helpBtn').addEventListener('click', showRules);
  $('#soundBtn').addEventListener('click', () => {
    soundOn = Snd.toggle();
    $('#soundBtn').classList.toggle('off', !soundOn);
    $('#soundBtn').title = soundOn ? '音效：开' : '音效：关';
  });
  $('#soundBtn').classList.toggle('off', !soundOn);
  $('#soundBtn').title = soundOn ? '音效：开' : '音效：关';
  $('#btnYes').addEventListener('click', () => choose('yes'));
  $('#btnNo').addEventListener('click', () => choose('no'));
  $('#backBtn').addEventListener('click', () => {
    if (!S || S.over) { location.href = 'index.html'; return; }
    if (window.confirm('这一任还没结束。离开会保留进度，下次可以从标题页继续。确定回去吗？')) {
      save(KEY_SAVE, S);
      location.href = 'index.html';
    }
  });
  document.addEventListener('keydown', (e) => {
    if (!document.body.classList.contains('playing') || busy) return;
    if ($('#modal').classList.contains('on')) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); choose('no'); }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); choose('yes'); }
  });
}

boot();
