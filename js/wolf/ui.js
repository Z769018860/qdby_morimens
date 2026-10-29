// 弥萨格狼人杀：界面
//
// 引擎一次吐一个事件，这里一个事件画一条，所以整套流程读起来就是一场对话。
// 玩家的选择只往引擎里递一个对象（见 engine.js 的 submit），规则不在这里。

import { ROLES, DIFFS, KEEPER, WOLF_SIDE, CHARS } from './data.js';
import { createGame, nextEvent, submit, nightOptions, playerFindings, canCall } from './engine.js';
import { autoAct, autoNote } from './auto.js';
import { alive, byId } from './util.js';
import { AVATARS } from './art.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const subEl = $('#sub');
const diffTag = $('#diffTag');
const rosterBtn = $('#rosterBtn');
const helpBtn = $('#helpBtn');
const recBtn = $('#recBtn');

// 守密人没有立绘，用一枚现场画的「提灯之眼」代替，省一个图片请求
const KEEPER_AV = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">'
  + '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a3450"/><stop offset="1" stop-color="#0b1020"/></linearGradient></defs>'
  + '<rect width="96" height="96" fill="url(#g)"/>'
  + '<path d="M48 18c11.5 0 19.5 9 19.5 21v13l6 22H22.5l6-22V39c0-12 8-21 19.5-21z" fill="#0d1424" stroke="#e3b341" stroke-opacity=".5" stroke-width="2"/>'
  + '<ellipse cx="48" cy="45" rx="10" ry="6.5" fill="#e3b341" fill-opacity=".16" stroke="#e3b341" stroke-width="1.6"/>'
  + '<circle cx="48" cy="45" r="3.2" fill="#e3b341"/>'
  + '<path d="M31 76h34" stroke="#e3b341" stroke-opacity=".38" stroke-width="2" stroke-linecap="round"/>'
  + '</svg>'
);

// ---------------------------------------------------------------- 每个人的颜色
// 14 个席位各一个固定色调。刻意避开纯红（融蚀 / 危险）和纯金（你自己）——
// 那两个颜色在这张桌子上已经有意思了，再拿来当「某人的颜色」就会误读。
const HUES = [205, 188, 172, 155, 128, 96, 62, 40, 268, 250, 288, 312, 330, 222];
const hueOf = (pid) => HUES[(pid - 1 + HUES.length * 4) % HUES.length];
function paintPc(node, pid) {
  node.style.setProperty('--pc', `hsl(${hueOf(pid)} 64% 56%)`);
}
const STATE = {
  diff: 'normal',
  G: null,
  outs: [],          // 本局出局记录（投票一览要用）
  recTab: 'note',    // 记录面板当前页签
  speed: 1,
  // manual：每一句都等你点；fast：对话压到最短，决定还是你做；auto：连你的那一手也替你打
  mode: 'manual',
  turn: null,
  autoToken: 0,
  busy: false,
  rosterOn: false,
  skipNow: null,
};

const MODE_KEY = 'zjtt:wolf:mode';
const MODES = {
  manual: { n: '手动', hint: '每一句都等你点' },
  fast: { n: '快进', hint: '对话压到最短，决定还是你来做' },
  auto: { n: '自动', hint: '替你说话、投票、行动，随时可以接管' },
};

function loadMode() {
  try {
    const m = localStorage.getItem(MODE_KEY);
    if (m === 'fast' || m === 'auto') return m;
  } catch (e) { /* 隐私模式读不了就用手动 */ }
  return 'manual';
}
function saveMode(m) {
  try { localStorage.setItem(MODE_KEY, m); } catch (e) { /* 忽略 */ }
}

const STAT_KEY = 'zjtt:wolf:stat';

// ---------------------------------------------------------------- 小工具
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
// 快进就是真的快进：手动 1 倍，自动稍微慢一点（还看得清在说什么），快进基本不给停顿
function pace(ms) {
  const boost = STATE.mode === 'manual' ? 1 : (STATE.mode === 'fast' ? 7 : 2.6);
  return Math.max(0, ms / (STATE.speed * boost));
}
function wait(ms) {
  return new Promise((res) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; STATE.skipNow = null; res(); } }, pace(ms));
    STATE.skipNow = () => { if (!done) { done = true; clearTimeout(t); STATE.skipNow = null; res(); } };
  });
}
const phaseName = { day: '议事', vote: '投票', night: '夜里', dawn: '天亮', brief: '开场' };

function avatarOf(pid, size) {
  const p = byId(STATE.G, pid);
  if (!p || p.isPlayer) {
    const img = el('img');
    img.src = KEEPER_AV;
    img.alt = '守密人';
    if (size) { img.style.width = size + 'px'; img.style.height = size + 'px'; }
    return img;
  }
  const src = AVATARS[p.char.av];
  const img = el('img');
  img.src = src || '';
  img.alt = p.name;
  img.loading = 'lazy';
  if (size) { img.style.width = size + 'px'; img.style.height = size + 'px'; }
  return img;
}
function avBox(pid, cls) {
  const box = el('div', cls || 'av');
  box.append(avatarOf(pid));
  return box;
}

// ---------------------------------------------------------------- 标题页
function showTitle() {
  STATE.G = null;
  STATE.turn = null;
  STATE.autoToken += 1;
  document.body.classList.remove('night');
  rosterBtn.classList.add('hide');
  subEl.textContent = '人机对局 · 你是守密人';
  diffTag.textContent = DIFFS.find((d) => d.k === STATE.diff).n;
  diffTag.dataset.c = STATE.diff;

  clear(stage);
  const scr = el('section', 'scr on');
  scr.id = 'scr-title';
  stage.append(scr);

  const hero = el('div', 'hero');
  hero.append(el('p', 'kicker', 'Misag · Wolf Game'));
  hero.append(el('h1', '', '弥萨格狼人杀'));
  const lead = el('p', 'lead');
  lead.innerHTML = '闭馆广播响过第三遍，主教学楼四层的门从外面锁上了。'
    + '广播说，有<b>融蚀体</b>混在你们中间。<br>'
    + '你是<b>守密人</b>——在这里，你的身份每局都是重新抽的：可能是守夜人、灵视者，也可能，你自己就是那个渗着黑液的东西。';
  hero.append(lead);
  hero.append(el('div', 'rule'));
  recBtn.classList.add('hide');
  scr.append(hero);

  const diffs = el('div', 'diffs');
  for (const d of DIFFS) {
    const b = el('button', 'diff');
    b.type = 'button';
    b.dataset.c = d.c;
    if (d.k === STATE.diff) b.classList.add('on');
    const dn = el('div', 'dn');
    dn.append(el('i', 'dot'));
    dn.append(el('span', '', d.n));
    b.append(dn, el('span', 'ds', d.sub), el('span', 'dd', d.note));
    b.onclick = () => {
      STATE.diff = d.k;
      diffs.querySelectorAll('.diff').forEach((x) => x.classList.toggle('on', x === b));
      diffTag.textContent = d.n;
      diffTag.dataset.c = d.c;
      renderStatLine();
    };
    diffs.append(b);
  }
  scr.append(diffs);

  const row = el('div', 'startrow');
  const go = el('button', 'btn primary', '翻开身份牌');
  go.type = 'button';
  go.onclick = () => startGame();
  const rules = el('button', 'btn ghost', '规则与身份牌');
  rules.type = 'button';
  rules.onclick = () => showRules();
  row.append(go, rules);
  scr.append(row);

  const stat = el('div', 'statline');
  stat.id = 'statline';
  scr.append(stat);
  renderStatLine();

  const pace = el('p', 'statline', '开局后在操作区上方可以切「快进」或「自动」——自动会替你把这一局打完，随时能接管。');
  pace.style.marginTop = '6px';
  scr.append(pace);

  const foot = el('p', 'statline', '');
  foot.style.marginTop = '10px';
  foot.textContent = '素材与设定取自《忘却前夜》，同人作品，与官方无关。';
  scr.append(foot);
}

function renderStatLine() {
  const box = document.getElementById('statline');
  if (!box) return;
  let st = null;
  try { st = JSON.parse(localStorage.getItem(STAT_KEY) || 'null'); } catch (e) { st = null; }
  if (!st || !st.n) {
    box.textContent = '还没开过局。每一局的身份牌、阵容、谁是融蚀体，都是重新抽的。';
    return;
  }
  const d = st.byDiff && st.byDiff[STATE.diff] ? st.byDiff[STATE.diff] : { n: 0, win: 0 };
  const pct = d.n ? Math.round((100 * d.win) / d.n) : 0;
  box.innerHTML = `累计 <b>${st.n}</b> 局 · 胜 <b>${st.win}</b> 局　|　`
    + `${DIFFS.find((x) => x.k === STATE.diff).n}：<b>${d.n}</b> 局，胜率 <b>${pct}%</b>`;
}

// ---------------------------------------------------------------- 开局
function startGame() {
  STATE.G = createGame({ diff: STATE.diff });
  STATE.speed = 1;
  STATE.busy = false;
  STATE.turn = null;
  STATE.autoToken += 1;
  STATE.mode = loadMode();
  STATE.outs = [];
  STATE.recTab = 'note';
  document.body.classList.remove('night');
  rosterBtn.classList.remove('hide');
  recBtn.classList.remove('hide');
  clear(stage);

  const scr = el('section', 'scr on');
  scr.id = 'scr-game';
  const wrap = el('div', 'board-wrap');

  const board = el('div', 'board');
  board.id = 'board';
  const feed = el('div', 'feed');
  feed.id = 'feed';
  feed.onclick = () => { if (STATE.skipNow) STATE.skipNow(); };
  const composer = el('div', 'composer');
  composer.id = 'composer';
  board.append(feed, paceBar(), composer);

  const roster = el('aside', 'roster');
  roster.id = 'roster';
  wrap.append(board, roster);
  scr.append(wrap);
  stage.append(scr);

  const d = DIFFS.find((x) => x.k === STATE.diff);
  diffTag.textContent = d.n;
  diffTag.dataset.c = d.c;
  subEl.textContent = d.sub;

  paintPace();
  refreshRoster();
  pump();
}

// ---------------------------------------------------------------- 主循环
async function pump() {
  if (STATE.busy || !STATE.G) return;
  STATE.busy = true;
  // 一交出去，刚才那个回合就作废了——切档时不能拿旧回合重画操作条，
  // 否则等于把同一句话又说了一遍
  STATE.turn = null;
  ensureWait('……');
  for (;;) {
    const e = nextEvent(STATE.G);
    if (!e) break;
    if (e.t === 'turn') { STATE.busy = false; showComposer(e); return; }
    await renderEvent(e);
    if (e.t === 'over') { STATE.busy = false; return; }
  }
  STATE.busy = false;
}

function waitBar(text) {
  const b = el('div', 'waitbar');
  const dots = el('span', 'dots');
  dots.append(el('i'), el('i'), el('i'));
  b.append(el('span', '', text), dots);
  return b;
}

// 等别人说话的时候，底下挂一条「……」——不然界面看起来像卡住了
function ensureWait(text) {
  const c = composerEl();
  if (!c) return;
  if (c.querySelector('.waitbar') || c.querySelector('.btn')) return;
  c.append(waitBar(text || '……'));
}

function spectatorBar() {
  const c = composerEl();
  if (!c) return;
  clear(c);
  const bar = waitBar('你已经出局了。剩下的只能看着。');
  const fast = STATE.mode !== 'manual';
  const sp = el('button', 'btn sm ghost', fast ? '已加速' : '快进到结局');
  sp.type = 'button';
  sp.disabled = fast;
  sp.onclick = () => setMode('fast');
  bar.append(sp);
  c.append(bar);
}

function feedEl() { return document.getElementById('feed'); }
function composerEl() { return document.getElementById('composer'); }

function toBottom() {
  const f = feedEl();
  if (f) f.scrollTop = f.scrollHeight + 40;
}

async function renderEvent(e) {
  const f = feedEl();
  if (!f) return;
  if (e.t === 'phase') {
    setPhase(e);
    if (e.phase === 'day' || e.phase === 'dawn') document.body.classList.remove('night');
    if (e.phase === 'night') document.body.classList.add('night');
    if (e.phase === 'vote') {
      const d = el('div', 'divider', '第 ' + e.day + ' 日 · 投票');
      f.append(d);
      toBottom();
      await wait(420);
    }
    return;
  }
  if (e.t === 'sys') {
    f.append(el('div', 'sys', e.text));
    toBottom();
    await wait(560);
    return;
  }
  if (e.t === 'say') { addSay(e); await wait(640); return; }
  if (e.t === 'out') { addOut(e); await wait(620); return; }
  if (e.t === 'tally') { addTally(e); await wait(1100); return; }
  if (e.t === 'over') { finish(e); return; }
}

function setPhase(e) {
  if (e.phase === 'brief') return;
  const G = STATE.G;
  const aliveN = alive(G).length;
  if (e.phase === 'day') {
    subEl.textContent = `第 ${e.day} 日 · 议事　|　还剩 ${aliveN} 人`;
    feedEl().append(el('div', 'divider', '第 ' + e.day + ' 日 · 议事'));
  } else if (e.phase === 'night') {
    subEl.textContent = `第 ${e.day} 夜　|　还剩 ${aliveN} 人`;
    feedEl().append(el('div', 'divider', '第 ' + e.day + ' 夜'));
  } else if (e.phase === 'dawn') {
    subEl.textContent = `第 ${e.day} 日 · 天亮`;
    feedEl().append(el('div', 'divider', '天亮'));
  } else if (e.phase === 'vote') {
    subEl.textContent = `第 ${e.day} 日 · 投票`;
  }
  toBottom();
}

// 发言的立场标签：一眼看出这句是「怀疑」还是「作保」，不用读完再回头想
const STANCE = {
  accuse: ['怀疑', 'warn'],
  defend: ['作保', 'good'],
  defendSelf: ['自辩', 'good'],
  claim: ['自称', 'gold'],
  stepUp: ['应声', 'gold'],
  call: ['号召', 'gold'],
  reportWolf: ['报融蚀', 'warn'],
  reportVoid: ['报空白', 'void'],
  reportClean: ['报干净', 'good'],
  refuse: ['推脱', 'dim'],
  comment: ['附和', 'dim'],
  vote: ['投票', 'dim'],
  silent: ['失声', 'void'],
  taunt: ['挑衅', 'dim'],
  last: ['遗言', 'dim'],
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// 台词里提到的名字要看得见：一屏字读下来，很难一直记着「他」是谁
function speakNode(text) {
  const G = STATE.G;
  const node = el('div', 'tx');
  const names = G.players.map((p) => p.name)
    .filter((n) => n && n.length >= 2)
    .sort((a, b) => b.length - a.length);
  if (!names.length) { node.textContent = text; return node; }
  const re = new RegExp(names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  node.innerHTML = esc(text).replace(re, (m) => '<span class="nmhl">' + m + '</span>');
  return node;
}

function addSay(e) {
  const G = STATE.G;
  const p = byId(G, e.pid);
  if (!p) return;
  const msg = el('div', 'msg' + (p.isPlayer ? ' me' : '') + (p.alive ? '' : ' dead'));
  if (!p.isPlayer) paintPc(msg, e.pid);
  msg.append(avBox(e.pid));
  const body = el('div', 'body');
  const who = el('div', 'who');
  who.append(el('span', '', p.name));
  if (e.claim && ROLES[e.claim]) {
    who.append(el('span', '', '自称'));
    const c = el('span', 'claim', ROLES[e.claim].zh);
    c.dataset.f = ROLES[e.claim].f;
    who.append(c);
  }
  const st = STANCE[e.stance];
  if (st) who.append(el('span', 'stance ' + st[1], st[0]));
  body.append(who, speakNode(e.text));
  if (e.why) body.append(el('div', 'why', '依据：' + e.why));
  msg.append(body);
  feedEl().append(msg);
  toBottom();
}

function addOut(e) {
  const G = STATE.G;
  const p = byId(G, e.pid);
  if (!p) return;
  STATE.outs.push({ day: G.day, pid: e.pid, role: e.role, cause: e.cause });
  const card = el('div', 'outcard');
  card.append(avBox(e.pid));
  const txt = el('div', '');
  txt.append(el('b', '', p.name));
  if (e.role) {
    const r = ROLES[e.role];
    txt.append(el('span', '', ' · 身份：'));
    const rl = el('span', 'rl', r.zh);
    if (r.f === 'crew') rl.style.color = 'var(--blue)';
    if (r.f === 'third') rl.style.color = 'var(--violet)';
    txt.append(rl);
    if (e.cause === 'night') txt.append(el('span', '', '（夜里被融蚀）'));
  } else {
    txt.append(el('span', '', ' · 身份不明，只剩被褥上一圈黑渍'));
  }
  card.append(txt);
  feedEl().append(card);
  refreshRoster();
  toBottom();
}

function addTally(e) {
  const G = STATE.G;
  const box = el('div', 'tally');
  box.append(el('h4', '', '投票'));
  const rows = el('div', 'rows');
  const counts = {};
  for (const k of Object.keys(e.votes)) {
    const voter = byId(G, k);
    const to = e.votes[k];
    if (to != null) counts[to] = (counts[to] || 0) + 1;
    const chip = el('span', 'vchip');
    chip.append(el('b', '', voter ? voter.name : '?'));
    chip.append(el('i', '', '→'));
    chip.append(el('span', '', to == null ? '弃票' : (byId(G, to) || {}).name || '?'));
    rows.append(chip);
  }
  box.append(rows);
  if (Object.keys(counts).length) {
    const sum = el('div', 'rows');
    sum.style.marginTop = '8px';
    Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([pid, n]) => {
      const chip = el('span', 'vchip');
      chip.style.borderColor = n >= 2 ? 'color-mix(in srgb,var(--gold) 55%,var(--line))' : '';
      chip.append(el('b', '', (byId(G, pid) || {}).name || '?'), el('i', '', n + ' 票'));
      sum.append(chip);
    });
    box.append(sum);
  }
  feedEl().append(box);
  toBottom();
}

// ---------------------------------------------------------------- 名单
function refreshRoster() {
  const G = STATE.G;
  const box = document.getElementById('roster');
  if (!G || !box) return;
  clear(box);
  box.append(el('h3', '', '在场名单'));
  const me = G.player;
  const mine = new Set();
  // 融蚀方（含低语者、共谋者）互相认得——这也是他们最难装的地方
  if (me && WOLF_SIDE.has(me.role)) {
    G.players.forEach((p) => { if (p.id !== 0 && WOLF_SIDE.has(p.role)) mine.add(p.id); });
  }
  if (me && me.twinId != null) mine.add(me.twinId);

  for (const p of G.players) {
    const b = el('button', 'pl' + (p.alive ? '' : ' dead') + (p.isPlayer ? ' me' : ''));
    b.type = 'button';
    b.append(avBox(p.id, 'av'));
    const nm = el('span', 'nm', p.name);
    if (!p.isPlayer) paintPc(b, p.id);
    b.append(nm);
    if (p.isPlayer) b.append(el('span', 'you', '你'));
    // 从外面接进来的八个记录者：名字后面挂个 UP，一眼看得出这桌谁不是唤醒体
    else if (p.char && p.char.up) b.append(el('span', 'up', 'UP'));
    const cl = G.claims[p.id];
    if (cl) b.append(el('span', 'cl', '自称 ' + ROLES[cl].zh));
    else if (mine.has(p.id) && p.id !== 0) b.append(el('span', 'cl', '同伙'));
    b.onclick = () => showPlayerInfo(p.id);
    box.append(b);
  }
}

function showPlayerInfo(pid) {
  const G = STATE.G;
  const p = byId(G, pid);
  if (!p) return;
  const mineWolf = WOLF_SIDE.has(G.player.role);
  const known = p.revealed || p.isPlayer || (mineWolf && WOLF_SIDE.has(p.role));
  const acc = G.acc.filter((a) => a.to === pid).length;
  const by = G.acc.filter((a) => a.by === pid).length;
  const lines = [];
  lines.push('状态：' + (p.alive ? '在场' : '已出局' + (p.deathDay ? '（第 ' + p.deathDay + ' 天）' : '')));
  if (known) lines.push('身份：' + ROLES[p.role].zh + '（' + factionName(ROLES[p.role].f) + '）');
  lines.push('自称：' + (G.claims[pid] ? ROLES[G.claims[pid]].zh : '没说过'));
  lines.push('被指认 ' + acc + ' 次 · 指认别人 ' + by + ' 次');
  sheet({
    title: p.name,
    sub: lines.join('　·　'),
    body: (box) => {
      const row = el('div', 'rows');
      row.style.display = 'flex';
      row.style.gap = '10px';
      row.style.alignItems = 'center';
      row.append(avBox(pid, 'av'));
      const t = el('div', '');
      t.style.fontSize = '12.5px';
      t.style.color = 'var(--dim)';
      t.textContent = p.isPlayer ? '你。守密人。' : (p.char.hint || '');
      row.append(t);
      box.append(row);
      // 从这里直接进便签，省得「想到什么却要退出去找入口」
      const mine = gameNotes()[pid];
      const nb = el('button', 'btn sm', mine && (mine.t || mine.v) ? '改这张便签' : '给他记一张便签');
      nb.type = 'button';
      nb.style.marginTop = '12px';
      nb.onclick = () => showRecords('note', pid);
      box.append(nb);
    },
  });
}

function factionName(f) {
  if (f === 'crew') return '清醒方';
  if (f === 'wolf') return '融蚀方';
  if (f === 'mole') return '融蚀方（被看成清醒）';
  return '第三方';
}

// ---------------------------------------------------------------- 操作区
function showComposer(e) {
  const box = composerEl();
  if (!box) return;
  clear(box);
  const G = STATE.G;
  if (!G || G.over) return;
  STATE.turn = e;

  if (e.kind === 'start') {
    box.append(el('div', 'chint', '牌已经发到你手里了。'));
    const row = el('div', 'acts');
    const b = el('button', 'btn primary wide', '翻开身份牌');
    b.type = 'button';
    b.onclick = () => showRoleCard();
    row.append(b);
    box.append(row);
    // 自动档：连翻牌这一下也替你点，只留给人看的时间
    if (STATE.mode === 'auto') {
      const token = ++STATE.autoToken;
      setTimeout(() => {
        if (token === STATE.autoToken && STATE.mode === 'auto' && box.contains(b)) b.click();
      }, 900);
    }
    return;
  }

  // 已经出局：引擎不会再给你发言/投票/过夜的机会，只剩看着
  if (!G.player.alive) return spectatorBar();

  if (STATE.mode === 'auto') return autoComposer(e);

  if (e.kind === 'talk') return composerTalk(box);
  if (e.kind === 'vote') return composerVote(box, e);
  if (e.kind === 'night') return composerNight(box);
  if (e.kind === 'revive') return composerRevive(box);
  if (e.kind === 'chain') return composerChain(box, e);
}

// 自动档的操作区：先写「正在替你决定」，再亮出决定，最后才递进引擎。
// 中间多停半拍，是为了让人看清它做了什么——不然整局像自己跑掉的。
function autoComposer(e) {
  const G = STATE.G;
  const box = composerEl();
  if (!box) return;
  clear(box);
  const bar = el('div', 'chint auto');
  const tag = el('b', '', '自动进行中');
  const note = el('span', '', '· 正在替你决定…');
  bar.append(tag, note);
  const stop = el('button', 'btn sm ghost', '接管');
  stop.type = 'button';
  stop.title = '切回手动，从现在开始由你决定';
  stop.onclick = () => setMode('manual');
  bar.append(stop);
  box.append(bar);

  const token = ++STATE.autoToken;
  const ok = () => token === STATE.autoToken && STATE.mode === 'auto' && STATE.G === G && !G.over;
  setTimeout(() => {
    if (!ok()) return;
    const o = e.kind === 'night' ? nightOptions(G) : null;
    const act = autoAct(G, e, o);
    if (!act) return;
    note.textContent = '· ' + (autoNote(G, act) || '……');
    setTimeout(() => {
      if (!ok()) return;
      submit(G, act);
      clear(box);
      pump();
    }, Math.max(160, 520 / STATE.speed));
  }, Math.max(240, 760 / STATE.speed));
}

// ---------------------------------------------------------------- 节奏条
// 三档：手动 / 快进 / 自动。挂在操作区上方，出局以后也还在——
// 死了还得一句句点，是最没必要的事。
function paceBar() {
  const bar = el('div', 'pace');
  bar.id = 'pace';
  const seg = el('div', 'seg');
  for (const k of ['manual', 'fast', 'auto']) {
    const b = el('button', 'pbtn', MODES[k].n);
    b.type = 'button';
    b.dataset.m = k;
    b.title = MODES[k].hint;
    b.onclick = () => setMode(k);
    seg.append(b);
  }
  const hint = el('span', 'phint');
  hint.id = 'paceHint';
  const sp = el('button', 'btn sm ghost', '');
  sp.id = 'speedBtn';
  sp.type = 'button';
  sp.title = '同一档里再说快一点';
  sp.onclick = () => {
    STATE.speed = STATE.speed >= 4 ? 1 : STATE.speed * 2;
    paintPace();
  };
  bar.append(seg, hint, sp);
  paintPace();
  return bar;
}

function paintPace() {
  const bar = document.getElementById('pace');
  if (!bar) return;
  bar.querySelectorAll('.pbtn').forEach((b) => {
    const on = b.dataset.m === STATE.mode;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const h = document.getElementById('paceHint');
  if (h) h.textContent = MODES[STATE.mode].hint;
  const sp = document.getElementById('speedBtn');
  if (sp) sp.textContent = '语速 ×' + STATE.speed;
}

function setMode(m) {
  if (!MODES[m]) return;
  const changed = STATE.mode !== m;
  STATE.mode = m;
  STATE.autoToken += 1;   // 作废还在等的那一手
  saveMode(m);
  paintPace();
  const G = STATE.G;
  if (changed && G && !G.over && STATE.turn) showComposer(STATE.turn);
}

function composerTalk(box) {
  const G = STATE.G;
  const me = G.player;

  // 被低语过：今天说不出话。别让人点了按钮才发现没用。
  if (me.silencedDay === G.day) {
    const hint = el('div', 'chint');
    hint.append(el('b', '', '你说不出话。'));
    hint.append(el('span', '', '昨晚有人在耳边对你说了一整夜。今天你只能听，只能投票。'));
    box.append(hint);
    const acts0 = el('div', 'acts');
    const b0 = el('button', 'btn ghost', '咽下去，听别人说');
    b0.type = 'button';
    b0.onclick = () => {
      submit(G, { type: 'talk', kind: 'idle' });
      clear(box);
      pump();
    };
    acts0.append(b0);
    box.append(acts0);
    return;
  }

  const hint = el('div', 'chint');
  hint.append(el('b', '', '轮到你说话了。'), el('span', '', '一句话就能改变今晚谁去死。'));
  box.append(hint);

  const acts = el('div', 'acts');
  const add = (label, fn, cls) => {
    const b = el('button', 'btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    b.onclick = fn;
    acts.append(b);
    return b;
  };

  add('指认一个人', () => {
    pickPlayers({
      title: '你要指认谁？',
      sub: '被指认的人会被其他人记住。说错了，下一个被推出去的可能就是你。',
      list: alive(G).filter((p) => p.id !== 0).map((p) => p.id),
      onPick: (id) => {
        submit(G, { type: 'talk', kind: 'accuse', target: id });
        clear(box);
        pump();
      },
    });
  });

  add('宣称身份', () => {
    pickRole((role) => {
      submit(G, { type: 'talk', kind: 'claim', role });
      clear(box);
      pump();
    });
  });

  // 号召：一天一次。全桌最贵的一次提问——逼别人亮牌，也把自己的算盘摊开。
  const callable = canCall(G);
  const cb = add(callable ? '号召有身份的人站出来' : '号召（今天已喊过）', () => {
    sheet({
      title: '当众喊一句？',
      sub: '喊完就收不回。有人会站出来，有人会对着站出来的人喊回去，也有人一句话都不说。',
      body: (b) => {
        b.append(el('p', 'sub', '亮牌的人会被你看见，也会被融蚀体看见——今晚死的多半就是他。'
          + '融蚀体同样会借这一嗓子塞一张假身份进来，而台上的假牌越多，越难分清谁是真人。'));
        b.append(el('p', 'sub', '一天只能喊一次。'));
        const row = el('div', 'acts');
        const yes = el('button', 'btn primary', '喊');
        yes.type = 'button';
        yes.onclick = () => {
          closeSheet();
          submit(G, { type: 'talk', kind: 'call' });
          clear(box);
          pump();
        };
        const no = el('button', 'btn ghost', '算了');
        no.type = 'button';
        no.onclick = closeSheet;
        row.append(yes, no);
        b.append(row);
      },
    });
  });
  if (!callable) { cb.disabled = true; cb.classList.add('ghost'); }

  const findings = playerFindings(G);
  if (findings.length) {
    add('公布查验（' + findings.length + '）', () => {
      pickPlayers({
        title: '公布哪一条结果？',
        sub: '公布之后，所有人都会知道你是' + ROLES[G.player.role].zh + '——包括融蚀体。',
        list: findings.map((c) => c.to),
        tagOf: (id) => {
          const c = findings.find((x) => x.to === id);
          if (!c) return '';
          return c.res === 'eroded' ? '融蚀' : (c.res === 'void' ? '不是人' : '干净');
        },
        onPick: (id) => {
          const c = findings.find((x) => x.to === id);
          submit(G, { type: 'talk', kind: 'report', target: id, res: c.res });
          clear(box);
          pump();
        },
      });
    }, 'primary');
  }

  add('为一个人说话', () => {
    pickPlayers({
      title: '你要替谁说话？',
      sub: '替人辩护会让别人觉得你们是一伙的——有时候这正是你想要的。',
      list: alive(G).filter((p) => p.id !== 0).map((p) => p.id),
      onPick: (id) => {
        submit(G, { type: 'talk', kind: 'defend', target: id });
        clear(box);
        pump();
      },
    });
  });

  add('先不说话', () => {
    submit(G, { type: 'talk', kind: 'idle' });
    clear(box);
    pump();
  }, 'ghost');

  box.append(acts);
}

function composerVote(box, e) {
  const G = STATE.G;
  const tied = e.opts && e.opts.tied && e.opts.tied.length ? e.opts.tied : null;
  const pool = tied ? alive(G).filter((p) => tied.includes(p.id)) : alive(G).filter((p) => p.id !== 0);
  const hint = el('div', 'chint');
  hint.append(el('b', '', tied ? '复投。' : '投票。'));
  hint.append(el('span', '', tied ? '只在票数最高的几个人里选。' : '票数最高的人会被送出弥萨格。'));
  box.append(hint);

  const acts = el('div', 'acts');
  acts.style.flexWrap = 'wrap';
  for (const id of pool.map((p) => p.id)) {
    const p = byId(G, id);
    const b = el('button', 'btn' + (tied ? ' primary' : ''));
    b.type = 'button';
    b.style.padding = '6px 12px';
    b.style.fontSize = '12.5px';
    b.textContent = p.name;
    b.onclick = () => {
      submit(G, { type: 'vote', target: id });
      clear(box);
      box.append(el('div', 'waitbar', '票投出去了。等其他人。'));
      pump();
    };
    acts.append(b);
  }
  const ab = el('button', 'btn ghost', '弃票');
  ab.type = 'button';
  ab.style.padding = '6px 12px';
  ab.style.fontSize = '12.5px';
  ab.onclick = () => {
    submit(G, { type: 'vote', target: null });
    clear(box);
    pump();
  };
  acts.append(ab);
  box.append(acts);
}

function composerNight(box) {
  const G = STATE.G;
  const o = nightOptions(G);
  if (!o) { submit(G, { type: 'night', target: null }); pump(); return; }
  if (!o.list.length) {
    box.append(el('div', 'chint', '今晚没有可做的事。'));
    submit(G, { type: 'night', target: null });
    pump();
    return;
  }
  const hint = el('div', 'chint');
  hint.append(el('b', '', o.title), el('span', '', o.hint));
  box.append(hint);
  const acts = el('div', 'acts');
  for (const id of o.list) {
    const p = byId(G, id);
    const b = el('button', 'btn', p.name);
    b.type = 'button';
    b.style.padding = '6px 12px';
    b.style.fontSize = '12.5px';
    b.onclick = () => {
      submit(G, { type: 'night', target: id });
      clear(box);
      box.append(el('div', 'waitbar', '走廊的灯灭了。'));
      pump();
    };
    acts.append(b);
  }
  if (o.optional) {
    const skip = el('button', 'btn ghost', '今晚不说');
    skip.type = 'button';
    skip.style.padding = '6px 12px';
    skip.style.fontSize = '12.5px';
    skip.onclick = () => {
      submit(G, { type: 'night', target: null });
      clear(box);
      box.append(el('div', 'waitbar', '走廊的灯灭了。'));
      pump();
    };
    acts.append(skip);
  }
  box.append(acts);
}

function composerRevive(box) {
  const G = STATE.G;
  const victim = byId(G, G.pendingRevive);
  const hint = el('div', 'chint');
  hint.append(el('b', '', '灯还亮着。'));
  hint.append(el('span', '', (victim ? victim.name : '他') + '还有一口气。你只有一次机会。'));
  box.append(hint);
  const acts = el('div', 'acts');
  const yes = el('button', 'btn primary', '点灯，把人拉回来');
  yes.type = 'button';
  yes.onclick = () => { submit(G, { type: 'revive', yes: true }); clear(box); pump(); };
  const no = el('button', 'btn ghost', '不点。留着灯');
  no.type = 'button';
  no.onclick = () => { submit(G, { type: 'revive', yes: false }); clear(box); pump(); };
  acts.append(yes, no);
  box.append(acts);
}

// 链缚者被投出去的那一刻：链子还在手上，可以拖一个人一起走
function composerChain(box, e) {
  const G = STATE.G;
  const list = (e.opts && e.opts.list) || [];
  if (!list.length) { submit(G, { type: 'chain', target: null }); pump(); return; }
  const hint = el('div', 'chint');
  hint.append(el('b', '', '链子还在你手上。'));
  hint.append(el('span', '', '你被送出去的时候，可以再拖一个人。只有这一次。'));
  box.append(hint);
  const acts = el('div', 'acts');
  for (const id of list) {
    const p = byId(G, id);
    const b = el('button', 'btn');
    b.type = 'button';
    b.style.padding = '6px 12px';
    b.style.fontSize = '12.5px';
    b.textContent = p.name;
    b.onclick = () => {
      submit(G, { type: 'chain', target: id });
      clear(box);
      box.append(el('div', 'waitbar', '链子响了一声。'));
      pump();
    };
    acts.append(b);
  }
  const skip = el('button', 'btn ghost', '松开链子');
  skip.type = 'button';
  skip.style.padding = '6px 12px';
  skip.style.fontSize = '12.5px';
  skip.onclick = () => { submit(G, { type: 'chain', target: null }); clear(box); pump(); };
  acts.append(skip);
  box.append(acts);
}

// ---------------------------------------------------------------- 身份牌
function showRoleCard() {
  const G = STATE.G;
  const me = G.player;
  const r = ROLES[me.role];
  const card = el('div', 'card');
  card.dataset.f = r.f;
  card.append(el('div', 'seal', r.zh.slice(0, 1)));
  card.append(el('div', 'rt', r.zh));
  card.append(el('div', 'rf', factionName(r.f)));
  card.append(el('p', 'rd', r.d));
  card.append(el('p', 'tagline', '「' + r.tag + '」'));

  const mates = [];
  if (WOLF_SIDE.has(me.role)) {
    G.players.forEach((p) => { if (p.id !== 0 && WOLF_SIDE.has(p.role)) mates.push(p); });
  } else if (me.role === 'twin') {
    G.players.forEach((p) => { if (p.role === 'twin' && p.id !== 0) mates.push(p); });
  }
  if (mates.length) {
    const m = el('div', 'mates');
    m.append(el('h5', '', me.role === 'twin' ? '你的另一半' : '你知道的同伴'));
    for (const p of mates) {
      const line = el('div', 'line');
      line.append(avatarOf(p.id, 26), el('span', '', p.name + '（' + ROLES[p.role].zh + '）'));
      m.append(line);
    }
    card.append(m);
  }

  const ok = el('button', 'btn primary ok', '记住了');
  ok.type = 'button';
  ok.onclick = () => {
    closeSheet();
    submit(G, { type: 'start' });
    refreshRoster();
    pump();
  };
  card.append(ok);

  sheet({ raw: card });
  // 自动档：给两秒看清自己这局是什么身份，然后自己关掉
  if (STATE.mode === 'auto') {
    const token = ++STATE.autoToken;
    setTimeout(() => {
      if (token === STATE.autoToken && STATE.mode === 'auto' && document.body.contains(ok)) ok.click();
    }, 2000);
  }
}

function showRules() {
  const groups = [
    ['crew', '清醒方'],
    ['wolf', '融蚀方'],
    ['mole', '融蚀方的暗桩'],
    ['third', '第三方'],
  ];
  sheet({
    title: '规则与身份牌',
    sub: '你是守密人，每一局抽到的身份不同。清醒方要把会动手的融蚀体清干净；融蚀体只要活着的数量追平清醒方就赢。',
    wide: true,
    body: (box) => {
      box.append(el('p', 'sub', '白天所有人轮流说话，然后投票送一个人出门；夜里融蚀体融蚀一个人，能力者各自行动。投票出局的人翻开身份，夜里死的人不翻。'));
      for (const [f, label] of groups) {
        box.append(el('h4', '', label));
        const grid = el('div', 'rolegrid');
        for (const key of Object.keys(ROLES)) {
          const r = ROLES[key];
          if (r.f !== f) continue;
          const item = el('div', 'roleitem');
          item.dataset.f = r.f;
          const b = el('b', '', r.zh);
          const i = el('i', '', r.short);
          item.append(b, i);
          item.append(el('p', '', r.d));
          if (r.lore) {
            const lo = el('p', '', '「' + r.lore + '」');
            lo.style.color = 'var(--dim2)';
            lo.style.fontStyle = 'italic';
            lo.style.marginTop = '6px';
            item.append(lo);
          }
          grid.append(item);
        }
        box.append(grid);
      }
      box.append(el('h4', '', '桌上还坐着八个人'));
      const upP = el('p', 'sub', '弥萨格的梦漏了信号出去。有八个人顺着信号坐进来——他们在另一个世界做着同一件事：把这款游戏讲给别人听。所以他们会说「省流」「抽取建议」「这个不建议抽」，会管你叫主播。别觉得奇怪，他们只是改不掉。');
      box.append(upP);
      const upGrid = el('div', 'upgrid');
      for (const c of CHARS.filter((x) => x.up)) {
        const it = el('div', 'upitem');
        it.append(el('b', '', c.zh));
        it.append(el('span', '', c.hint.replace('B站 · ', 'B站 @')));
        upGrid.append(it);
      }
      box.append(upGrid);

      box.append(el('h4', '', '几条细则'));
      const ul = el('ul');
      [
        '平票会复投一次；再平票就抽签，抽中的人自己走向门口。',
        '守夜人守到的人，当晚不会被融蚀体拖走；但扶不住第二次同样的手法——不能连着两晚守同一个人。',
        '灵视者看到「融蚀」或「干净」；如果那个人既不是清醒也不是融蚀，你会看到一片空白。',
        '潜伏者第一次被投出去不会死，只是当场蜕壳，身份暴露。',
        '链缚者被投票送出时，可以拖一个人一起走；夜里被杀则不会有这条链子。',
        '低语者不动手，只让一个人第二天说不出话：报不了查验，也开不了口。同一个人只会被低语一次，它自己的嗓子也撑不了几次。',
        '共谋者被灵视者看成清醒方，但它和融蚀体一起赢，而且它认得融蚀体。',
        '低语者与共谋者不占刀口，也不挡清醒方的胜利——刀折了，它们再折腾也杀不死人。',
        '忘却者不属于任何一边：只要它活到最后一刻（场上不超过四人），胜利就被它吞掉。',
        '轮到你说话时，除了指认、辩护、亮牌，还可以「号召有身份的人站出来」——一天一次。有人会应声，有人会对跳，也有人一句话都不说。',
        '桌上有人报了身份，旁人常常会当场接一句（发言左边标「附和」）——那是免费的立场，也是免费的破绽。',
        '操作区上方有三档节奏：手动、快进、自动。快进只把对话压短，决定还是你来做；自动连你的发言、投票、过夜都替你打，点「接管」随时拿回来。',
        '你出局之后，游戏会继续，你可以看完结局。',
      ].forEach((t) => ul.append(el('li', '', t)));
      box.append(ul);
    },
  });
}

// ---------------------------------------------------------------- 弹层
let sheetNode = null;
function sheet(opt) {
  closeSheet();
  const wrap = el('div', 'sheet');
  wrap.onclick = (ev) => { if (ev.target === wrap) closeSheet(); };
  const inner = el('div', 'sheet-in');
  if (opt.wide) inner.style.width = 'min(680px,100%)';
  if (opt.raw) inner.append(opt.raw);
  else {
    if (opt.title) inner.append(el('h3', '', opt.title));
    if (opt.sub) inner.append(el('p', 'sub', opt.sub));
    if (opt.body) opt.body(inner);
  }
  wrap.append(inner);
  document.body.append(wrap);
  sheetNode = wrap;
}
function closeSheet() {
  if (sheetNode && sheetNode.parentNode) sheetNode.parentNode.removeChild(sheetNode);
  sheetNode = null;
}

function pickPlayers(opt) {
  const G = STATE.G;
  sheet({
    title: opt.title,
    sub: opt.sub,
    body: (box) => {
      const grid = el('div', 'pickgrid');
      for (const id of opt.list) {
        const p = byId(G, id);
        if (!p) continue;
        const b = el('button', 'pick');
        b.type = 'button';
        b.append(avatarOf(id, 46), el('span', '', p.name));
        const tag = opt.tagOf ? opt.tagOf(id) : (G.claims[id] ? '自称 ' + ROLES[G.claims[id]].zh : '');
        if (tag) b.append(el('span', 'rn', tag));
        b.onclick = () => { closeSheet(); opt.onPick(id); };
        grid.append(b);
      }
      box.append(grid);
      const cancel = el('button', 'btn ghost', '再想想');
      cancel.type = 'button';
      cancel.style.marginTop = '12px';
      cancel.onclick = closeSheet;
      box.append(cancel);
    },
  });
}

function pickRole(cb) {
  const G = STATE.G;
  const me = G.player;
  sheet({
    title: '你要宣称自己是——',
    sub: '说出来的身份会被所有人记住。说真话的人容易活下来，也容易被夜里找上门。',
    body: (box) => {
      const grid = el('div', 'pickgrid');
      for (const key of Object.keys(ROLES)) {
        const r = ROLES[key];
        const b = el('button', 'pick');
        b.type = 'button';
        b.append(el('div', 'pname', r.zh), el('span', 'rn', r.short));
        if (key === me.role) {
          b.style.borderColor = 'var(--gold)';
          b.append(el('span', 'rn', '你的真实身份'));
        }
        b.onclick = () => { closeSheet(); cb(key); };
        grid.append(b);
      }
      box.append(grid);
      const cancel = el('button', 'btn ghost', '还是不说');
      cancel.type = 'button';
      cancel.style.marginTop = '12px';
      cancel.onclick = closeSheet;
      box.append(cancel);
    },
  });
}

// ---------------------------------------------------------------- 结算
function finish(e) {
  const G = STATE.G;
  const me = G.player;
  const win = e.playerWin;
  const who = e.winner === 'crew' ? '清醒方胜' : (e.winner === 'wolf' ? '融蚀方胜' : '忘却者独赢');
  document.body.classList.toggle('night', e.winner !== 'crew');
  rosterBtn.classList.add('hide');

  // 战绩
  try {
    let st = JSON.parse(localStorage.getItem(STAT_KEY) || 'null') || { n: 0, win: 0, byDiff: {} };
    st.n += 1;
    if (win) st.win += 1;
    st.byDiff = st.byDiff || {};
    const d = st.byDiff[STATE.diff] || { n: 0, win: 0 };
    d.n += 1;
    if (win) d.win += 1;
    st.byDiff[STATE.diff] = d;
    localStorage.setItem(STAT_KEY, JSON.stringify(st));
  } catch (err) { /* 隐私模式下写不进去，不影响这一局 */ }

  clear(stage);
  const scr = el('section', 'scr on');
  scr.id = 'scr-over';

  const banner = el('div', 'banner ' + (win ? 'win' : 'lose'));
  // 输赢和生死是两件事：赢了自己也可能已经出局，输了也可能活着走出来
  const head = win
    ? (me.alive ? '你活着走出了弥萨格' : '你没能走出弥萨格——不过，守住了')
    : (me.alive ? '你活着走出来了。可门外的雾，比进来时更浓。' : '你没能走出弥萨格');
  banner.append(el('div', 'big', head));
  const st = el('div', 'st');
  st.innerHTML = `${who}　·　第 <b>${G.day}</b> 天结束<br>`
    + `你是 <b>${ROLES[me.role].zh}</b>（${factionName(ROLES[me.role].f)}）`
    + (me.alive ? '　——　活到了最后' : (me.deathDay ? `　——　第 ${me.deathDay} 天出局` : ''));
  banner.append(st);
  scr.append(banner);

  const rev = el('div', 'reveal');
  for (const p of G.players) {
    const r = ROLES[p.role];
    const item = el('div', 'rv' + (p.alive ? '' : ' dead'));
    item.dataset.f = r.f;
    item.append(avatarOf(p.id, 30));
    const m = el('div', 'm');
    m.append(el('b', '', p.name + (p.isPlayer ? '（你）' : '')));
    m.append(el('span', '', r.zh + ' · ' + (p.alive ? '活到最后' : (p.deathCause === 'night' ? '夜里没回来' : '被投出'))));
    item.append(m);
    rev.append(item);
  }
  scr.append(rev);

  const row = el('div', 'startrow');
  const again = el('button', 'btn primary', '再来一局');
  again.type = 'button';
  again.onclick = () => { closeSheet(); startGame(); };
  const back = el('button', 'btn', '换个难度');
  back.type = 'button';
  back.onclick = () => { clear(stage); showTitle(); };
  const look = el('button', 'btn ghost', '看看身份牌');
  look.type = 'button';
  look.onclick = () => showRules();
  row.append(again, back, look);
  scr.append(row);

  const note = el('p', 'statline', '每个位置的身份、每一句话，都是这一局现抽的。换一局，谁是融蚀体就全变了。');
  scr.append(note);

  stage.append(scr);
}

// ---------------------------------------------------------------- 记录
// 三页签：自己的便签 / 往期投票 / 自动纪要。
// 推理游戏最烦的是「我记得有人说过，但想不起是谁」——这一块就是为了这个问题。
const NOTE_KEY = 'zjtt:wolf:notes';
const VERDICTS = [['bad', '疑'], ['mid', '中'], ['good', '保']];

function loadAllNotes() {
  try { return JSON.parse(localStorage.getItem(NOTE_KEY) || '{}') || {}; } catch (e) { return {}; }
}
function gameNotes() {
  const G = STATE.G;
  if (!G) return {};
  return loadAllNotes()[G.seed] || {};
}
function setNote(pid, patch) {
  const G = STATE.G;
  if (!G) return;
  const all = loadAllNotes();
  const g = all[G.seed] || (all[G.seed] = {});
  const cur = g[pid] || (g[pid] = { v: '', t: '' });
  Object.assign(cur, patch);
  // 只留最近 8 局：这是便签，不是数据库
  const keys = Object.keys(all);
  if (keys.length > 8) keys.slice(0, keys.length - 8).forEach((k) => { delete all[k]; });
  try { localStorage.setItem(NOTE_KEY, JSON.stringify(all)); } catch (e) { /* 隐私模式写不进去 */ }
  refreshRoster();
}

const nmOf = (G, id) => (byId(G, id) || {}).name || '?';

function showRecords(tab, focusPid) {
  const G = STATE.G;
  if (!G) return;
  STATE.recTab = tab || STATE.recTab || 'note';
  const box = el('div', 'rec');
  const head = el('div', 'rechead');
  head.append(el('h3', '', '记录'));
  const x = el('button', 'recx', '×');
  x.type = 'button';
  x.setAttribute('aria-label', '关闭');
  x.onclick = () => closeSheet();
  head.append(x);
  box.append(head);

  const bar = el('div', 'tabs');
  const body = el('div', 'recbody');
  const paint = () => {
    bar.querySelectorAll('.tab').forEach((b) => b.classList.toggle('on', b.dataset.t === STATE.recTab));
    clear(body);
    if (STATE.recTab === 'note') recNotes(body);
    else if (STATE.recTab === 'vote') recVotes(body);
    else recDigest(body);
  };
  for (const [k, n] of [['note', '笔记'], ['vote', '往期投票'], ['digest', '纪要']]) {
    const b = el('button', 'tab', n);
    b.type = 'button';
    b.dataset.t = k;
    b.onclick = () => { STATE.recTab = k; paint(); };
    bar.append(b);
  }
  box.append(bar, body);
  paint();
  sheet({ wide: true, raw: box });

  if (focusPid != null) {
    const row = body.querySelector('[data-pid="' + focusPid + '"]');
    if (row) {
      row.classList.add('flash');
      row.scrollIntoView({ block: 'center' });
      setTimeout(() => row.classList.remove('flash'), 1400);
    }
  }
}

function recNotes(body) {
  const G = STATE.G;
  const notes = gameNotes();
  body.append(el('p', 'sub', '给每个位置标个态度，写一句自己的判断。便签只存在这台设备上，按局分开存——换一局就是新的一张。'));

  for (const p of G.players) {
    const n = notes[p.id] || {};
    const row = el('div', 'nrow' + (p.alive ? '' : ' dead'));
    row.dataset.pid = p.id;
    if (!p.isPlayer) paintPc(row, p.id);
    row.append(avatarOf(p.id, 28));

    const main = el('div', 'nmain');
    main.append(el('b', '', p.name + (p.isPlayer ? '（你）' : '')));
    const facts = [];
    if (p.isPlayer) facts.push('守密人');
    else if (!p.alive) facts.push('已出局');
    if (G.claims[p.id]) facts.push('自称 ' + ROLES[G.claims[p.id]].zh);
    const acc = G.acc.filter((a) => a.to === p.id).length;
    const by = G.acc.filter((a) => a.by === p.id).length;
    // 0 次就别写了，一排「被指认 0 · 指认 0」只是噪音
    if (acc) facts.push('被指认 ' + acc + ' 次');
    if (by) facts.push('指认过 ' + by + ' 次');
    if (!p.isPlayer && !acc && !by) facts.push('还没人提过他');
    main.append(el('span', '', facts.join(' · ')));
    row.append(main);

    const seg = el('div', 'nseg');
    for (const [k, label] of VERDICTS) {
      const b = el('button', 'nb ' + k + (n.v === k ? ' on' : ''), label);
      b.type = 'button';
      b.dataset.k = k;
      b.onclick = () => {
        const next = n.v === k ? '' : k;
        n.v = next;
        setNote(p.id, { v: next });
        seg.querySelectorAll('.nb').forEach((e2) => e2.classList.toggle('on', e2.dataset.k === next));
      };
      seg.append(b);
    }
    row.append(seg);

    const inp = el('input', 'nin');
    inp.type = 'text';
    inp.placeholder = '记一句…（例：第二天的说法对不上）';
    inp.value = n.t || '';
    let timer = 0;
    inp.oninput = () => {
      const v = inp.value;
      clearTimeout(timer);
      timer = setTimeout(() => setNote(p.id, { t: v }), 400);
    };
    row.append(inp);
    body.append(row);
  }

  const foot = el('div', 'nfoot');
  const clr = el('button', 'btn sm ghost', '清空本局笔记');
  clr.type = 'button';
  clr.onclick = () => {
    const all = loadAllNotes();
    delete all[G.seed];
    try { localStorage.setItem(NOTE_KEY, JSON.stringify(all)); } catch (e) { /* 忽略 */ }
    showRecords('note');
    refreshRoster();
  };
  foot.append(clr);
  body.append(foot);
}

function recVotes(body) {
  const G = STATE.G;
  const hist = G.tallyHist || [];
  if (!hist.length) {
    body.append(el('p', 'sub', '这一局还没投过票。等到第一次投票，这里会把每一轮的票型都留档。'));
    return;
  }
  body.append(el('p', 'sub', '每一轮谁投了谁、票数落在谁头上。往期不会因为翻页而消失。'));
  for (const t of hist) {
    const sec = el('div', 'vsec');
    const head = el('div', 'vhead');
    head.append(el('b', '', '第 ' + t.day + ' 天' + (t.runoff ? ' · 再投' : '')));
    const out = STATE.outs.find((o) => o.day === t.day && (o.cause === 'vote' || o.cause === 'molt' || o.cause === 'chain'));
    if (out) {
      const role = out.role && ROLES[out.role] ? '（' + ROLES[out.role].zh + '）' : '';
      head.append(el('span', 'vout', '送出门：' + nmOf(G, out.pid) + role));
    } else if (t.tied) {
      head.append(el('span', 'vout', '平票，再投'));
    } else {
      head.append(el('span', 'vout', '没人被送出去'));
    }
    sec.append(head);

    const chips = el('div', 'vrow');
    for (const k of Object.keys(t.votes)) {
      const voter = byId(G, Number(k));
      const chip = el('span', 'vchip');
      if (voter && voter.isPlayer) chip.style.setProperty('--pc', 'var(--gold)');
      else if (voter) paintPc(chip, voter.id);
      chip.append(el('b', '', voter ? voter.name : '?'), el('i', '', '→'));
      const to = t.votes[k];
      chip.append(el('span', '', to == null ? '弃票' : nmOf(G, to)));
      chips.append(chip);
    }
    sec.append(chips);

    const c = {};
    for (const k of Object.keys(t.votes)) {
      const to = t.votes[k];
      if (to != null) c[to] = (c[to] || 0) + 1;
    }
    const items = Object.entries(c).sort((a, b) => b[1] - a[1]);
    const max = items.length ? items[0][1] : 1;
    const bars = el('div', 'vbars');
    for (const [pid, n] of items) {
      const line = el('div', 'vbar');
      paintPc(line, Number(pid));
      line.append(el('span', 'vbl', nmOf(G, Number(pid))));
      const track = el('span', 'vbt');
      const fill = el('i', '');
      fill.style.width = Math.max(6, Math.round((100 * n) / max)) + '%';
      track.append(fill);
      line.append(track, el('b', 'vbn', n + ' 票'));
      bars.append(line);
    }
    if (items.length) sec.append(bars);
    body.append(sec);
  }
}

function digestText() {
  const G = STATE.G;
  const out = [];
  const days = Math.max(G.day, 1);
  for (let d = 1; d <= days; d++) {
    const part = [];
    for (const c of G.claimHist) if (c.day === d) part.push(nmOf(G, c.id) + ' 自称 ' + (ROLES[c.role] ? ROLES[c.role].zh : c.role));
    for (const r of G.reports) {
      if (r.day !== d) continue;
      const res = r.res === 'eroded' ? '是融蚀' : (r.res === 'void' ? '是空白' : '是干净的');
      part.push(nmOf(G, r.by) + ' 验了 ' + nmOf(G, r.to) + '：' + res);
    }
    for (const c of G.calls) if (c.day === d) part.push(nmOf(G, c.by) + ' 号召有身份的人站出来');
    for (const o of STATE.outs) {
      if (o.day !== d) continue;
      const role = o.role && ROLES[o.role] ? '（' + ROLES[o.role].zh + '）' : '（身份不明）';
      part.push((o.cause === 'night' ? '夜里没回来：' : '被送出门：') + nmOf(G, o.pid) + role);
    }
    const acc = G.acc.filter((a) => a.day === d);
    if (acc.length) {
      // 按被指认的人归并：十来个「A→B」堆成一段读不下去，按人头排反而看得清谁在被围
      const grouped = {};
      // 同一个人一天指认两次很常见，按人去重，别写成「墨菲、墨菲、萝坦」
      for (const a of acc) (grouped[a.to] = grouped[a.to] || new Set()).add(nmOf(G, a.by));
      const parts = Object.keys(grouped)
        .sort((x, y) => grouped[y].size - grouped[x].size)
        .map((to) => {
          const ns = [...grouped[to]];
          const head = ns.slice(0, 3).join('、');
          return nmOf(G, Number(to)) + '（' + (ns.length > 3 ? head + ' 等 ' + ns.length + ' 人' : head) + '）';
        });
      part.push('被指认：' + parts.join('、'));
    }
    const tl = (G.tallyHist || []).filter((t) => t.day === d && !t.round);
    if (tl.length) {
      const c = {};
      for (const k of Object.keys(tl[0].votes)) {
        const to = tl[0].votes[k];
        if (to != null) c[to] = (c[to] || 0) + 1;
      }
      const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (top.length) part.push('票型：' + top.map(([pid, n]) => nmOf(G, pid) + ' ' + n + ' 票').join('、'));
    }
    if (part.length) out.push('第 ' + d + ' 天');
    for (const p of part) out.push('　· ' + p);
  }
  return out.join('\n');
}

function recDigest(body) {
  const text = digestText();
  body.append(el('p', 'sub', '按天把这一局发生过的事排了一遍：谁报了什么、谁指认谁、谁被送出门。可以整段复制出去。'));
  const pre = el('pre', 'digest');
  pre.textContent = text || '这一局还没有任何记录。';
  body.append(pre);
  const foot = el('div', 'nfoot');
  const cp = el('button', 'btn sm', '复制全部');
  cp.type = 'button';
  cp.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      cp.textContent = '已复制';
    } catch (e) {
      // 剪贴板没权限时退回到「选中让它自己复制」
      const r = document.createRange();
      r.selectNodeContents(pre);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(r);
      cp.textContent = '已选中，按 Ctrl+C';
    }
    setTimeout(() => { cp.textContent = '复制全部'; }, 1600);
  };
  foot.append(cp);
  body.append(foot);
}

// ---------------------------------------------------------------- 入口
helpBtn.onclick = () => showRules();
recBtn.onclick = () => showRecords();
rosterBtn.onclick = () => {
  const r = document.getElementById('roster');
  if (!r) return;
  STATE.rosterOn = !STATE.rosterOn;
  r.classList.toggle('on', STATE.rosterOn);
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { STATE.rosterOn = false; const r = document.getElementById('roster'); if (r) r.classList.remove('on'); closeSheet(); return; }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!STATE.G || STATE.G.over) return;
  // 快捷键：M 手动 / F 快进 / A 自动（和 1/2/3 一样）
  const map = { m: 'manual', f: 'fast', a: 'auto', 1: 'manual', 2: 'fast', 3: 'auto' };
  const m = map[String(e.key).toLowerCase()];
  if (m) { setMode(m); paintPace(); }
});
window.addEventListener('resize', () => {
  const r = document.getElementById('roster');
  if (r && window.innerWidth > 760) r.classList.remove('on');
});

export function boot() {
  showTitle();
}
