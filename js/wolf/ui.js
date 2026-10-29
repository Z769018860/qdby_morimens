// 弥萨格狼人杀：界面
//
// 引擎一次吐一个事件，这里一个事件画一条，所以整套流程读起来就是一场对话。
// 玩家的选择只往引擎里递一个对象（见 engine.js 的 submit），规则不在这里。

import { ROLES, DIFFS, KEEPER } from './data.js';
import { createGame, nextEvent, submit, nightOptions, playerFindings } from './engine.js';
import { alive, byId } from './util.js';
import { AVATARS } from './art.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const subEl = $('#sub');
const diffTag = $('#diffTag');
const rosterBtn = $('#rosterBtn');
const helpBtn = $('#helpBtn');

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

const STATE = {
  diff: 'normal',
  G: null,
  speed: 1,
  busy: false,
  rosterOn: false,
  skipNow: null,
};

const STAT_KEY = 'zjtt:wolf:stat';

// ---------------------------------------------------------------- 小工具
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = String(text);
  return n;
}
function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
function wait(ms) {
  return new Promise((res) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; STATE.skipNow = null; res(); } }, Math.max(0, ms / STATE.speed));
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
  document.body.classList.remove('night');
  rosterBtn.classList.remove('hide');
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
  board.append(feed, composer);

  const roster = el('aside', 'roster');
  roster.id = 'roster';
  wrap.append(board, roster);
  scr.append(wrap);
  stage.append(scr);

  const d = DIFFS.find((x) => x.k === STATE.diff);
  diffTag.textContent = d.n;
  diffTag.dataset.c = d.c;
  subEl.textContent = d.sub;

  refreshRoster();
  pump();
}

// ---------------------------------------------------------------- 主循环
async function pump() {
  if (STATE.busy || !STATE.G) return;
  STATE.busy = true;
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
  const sp = el('button', 'btn sm ghost', '快进');
  sp.type = 'button';
  sp.onclick = () => { STATE.speed = 4; sp.textContent = '已快进'; sp.disabled = true; };
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

function addSay(e) {
  const G = STATE.G;
  const p = byId(G, e.pid);
  if (!p) return;
  const msg = el('div', 'msg' + (p.isPlayer ? ' me' : '') + (p.alive ? '' : ' dead'));
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
  body.append(who, el('div', 'tx', e.text));
  msg.append(body);
  feedEl().append(msg);
  toBottom();
}

function addOut(e) {
  const G = STATE.G;
  const p = byId(G, e.pid);
  if (!p) return;
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
  if (me && (me.role === 'eroded' || me.role === 'lurker')) {
    G.players.forEach((p) => { if (p.role === 'eroded' || p.role === 'lurker' || p.role === 'mole') mine.add(p.id); });
  }
  if (me && me.role === 'mole') G.players.forEach((p) => { if (p.role === 'eroded' || p.role === 'lurker') mine.add(p.id); });
  if (me && me.twinId != null) mine.add(me.twinId);

  for (const p of G.players) {
    const b = el('button', 'pl' + (p.alive ? '' : ' dead') + (p.isPlayer ? ' me' : ''));
    b.type = 'button';
    b.append(avBox(p.id, 'av'));
    const nm = el('span', 'nm', p.name);
    b.append(nm);
    if (p.isPlayer) b.append(el('span', 'you', '你'));
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
  const mineWolf = G.player.role === 'eroded' || G.player.role === 'lurker' || G.player.role === 'mole';
  const known = p.revealed || p.isPlayer || (mineWolf && (p.role === 'eroded' || p.role === 'lurker'));
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

  if (e.kind === 'start') {
    box.append(el('div', 'chint', '牌已经发到你手里了。'));
    const row = el('div', 'acts');
    const b = el('button', 'btn primary wide', '翻开身份牌');
    b.type = 'button';
    b.onclick = () => showRoleCard();
    row.append(b);
    box.append(row);
    return;
  }

  // 已经出局：引擎不会再给你发言/投票/过夜的机会，只剩看着
  if (!G.player.alive) return spectatorBar();

  if (e.kind === 'talk') return composerTalk(box);
  if (e.kind === 'vote') return composerVote(box, e);
  if (e.kind === 'night') return composerNight(box);
  if (e.kind === 'revive') return composerRevive(box);
}

function speedRow() {
  const row = el('div', 'chint');
  row.style.display = 'flex';
  row.style.alignItems = 'center';
  row.style.gap = '8px';
  const t = el('span', '', '');
  t.style.flex = '1';
  t.id = 'hintText';
  const sp = el('button', 'btn sm ghost', '速度 ×' + STATE.speed);
  sp.type = 'button';
  sp.onclick = () => {
    STATE.speed = STATE.speed >= 4 ? 1 : STATE.speed * 2;
    sp.textContent = '速度 ×' + STATE.speed;
  };
  row.append(t, sp);
  return row;
}

function composerTalk(box) {
  const G = STATE.G;
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
  const sr = speedRow();
  box.append(sr);
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
  box.append(speedRow());
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
  box.append(acts);
  box.append(speedRow());
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
  if (me.role === 'eroded' || me.role === 'lurker') {
    G.players.forEach((p) => {
      if (p.id !== 0 && (p.role === 'eroded' || p.role === 'lurker' || p.role === 'mole')) mates.push(p);
    });
  } else if (me.role === 'mole') {
    G.players.forEach((p) => { if (p.role === 'eroded' || p.role === 'lurker') mates.push(p); });
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
    sub: '你是守密人，每一局抽到的身份不同。清醒方要找出所有融蚀体；融蚀体只要人数追平清醒方就赢。',
    wide: true,
    body: (box) => {
      box.append(el('p', 'sub', '白天所有人轮流说话，然后投票送一个人出门；夜里融蚀体融蚀一个人，能力者各自行动。出局的人翻开身份，夜里死的人不翻。'));
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
          grid.append(item);
        }
        box.append(grid);
      }
      box.append(el('h4', '', '几条细则'));
      const ul = el('ul');
      [
        '平票会复投一次；再平票就抽签，抽中的人自己走向门口。',
        '守夜人守到的人，当晚不会被融蚀体拖走；但扶不住第二次同样的手法——不能连着两晚守同一个人。',
        '灵视者看到「融蚀」或「干净」；如果那个人既不是清醒也不是融蚀，你会看到一片空白。',
        '潜伏者第一次被投出去不会死，只是当场蜕壳，身份暴露。',
        '共谋者被灵视者看成清醒方，但它和融蚀体一起赢。',
        '忘却者不属于任何一边：只要它活到最后一刻（场上不超过五人），胜利就被它吞掉。',
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

// ---------------------------------------------------------------- 入口
helpBtn.onclick = () => showRules();
rosterBtn.onclick = () => {
  const r = document.getElementById('roster');
  if (!r) return;
  STATE.rosterOn = !STATE.rosterOn;
  r.classList.toggle('on', STATE.rosterOn);
};
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { STATE.rosterOn = false; const r = document.getElementById('roster'); if (r) r.classList.remove('on'); closeSheet(); }
});
window.addEventListener('resize', () => {
  const r = document.getElementById('roster');
  if (r && window.innerWidth > 760) r.classList.remove('on');
});

export function boot() {
  showTitle();
}
