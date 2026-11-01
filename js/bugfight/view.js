// 电子斗蛐蛐 · 界面
//
// 规则全在 engine.js / table.js / ai.js，这一层只做三件事：
//   把两队摆出来（血、攻、下一手要放的技能）→ 收注 → 按节奏播放战斗。
// 数据（怪物名录 + 技能表 + 九个人机的脸）由构建内联进 gen.js，页面只发一个脚本请求。

import { DATA, SEATS } from './gen.js';
import * as E from './engine.js';
import * as T from './table.js';
import * as A from './ai.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const money = (n) => (n < 0 ? '−' : '') + Math.abs(Math.round(n)).toLocaleString('zh-CN');

let S = null;          // 一桌
let B = null;          // 本局战斗
let playTimer = null;
let speed = 1;
let pickedSide = -1;
let amt = T.MIN_STAKE;
let busy = false;
let revealed = false;  // 人机的注额是否已经亮出来
let endT = null;
let ovMode = 'next';   // next=接着打 / over=看座次 / again=再开一桌

/* ---------------------------------------------------------------- 图集切图 */
function faceStyle(ix, size) {
  const a = DATA.atlas;
  const col = ix % a.cols, row = Math.floor(ix / a.cols);
  return `width:${size}px;height:${size}px;background-size:${a.cols * size}px auto;`
    + `background-position:${-col * size}px ${-row * size}px;`;
}

/* ---------------------------------------------------------------- 首页 */
function renderHome() {
  $('homeBank').textContent = money(S.you.bank);
  const alive = T.alivePlayers(S).length;
  $('homeInfo').innerHTML = `第 ${Math.max(1, S.round + 1)} 局 · 底注 ${money(T.minStake(S.round + 1))}<br>`
    + `桌上还有 ${alive} 个人`;

  const box = $('seatList');
  box.innerHTML = '';
  const all = [S.you, ...S.ai];
  for (const p of all) {
    const n = el('div', 'seat' + (p.isYou ? ' you' : '') + (p.out ? ' out' : ''));
    if (p.isYou) {
      n.innerHTML = `<span class="ph" style="display:grid;place-items:center;font-size:12px">你</span>`
        + `<div class="sm"><div class="sn">守密人</div><div class="sb${p.bank < T.minStake(S.round + 1) ? ' low' : ''}">`
        + `${p.out ? '出局' : money(p.bank)}</div></div>`;
    } else {
      const need = T.minStake(S.round + 1);
      n.innerHTML = `<img src="${p.face}" alt="" width="30" height="30" loading="lazy">`
        + `<div class="sm"><div class="sn">${p.n}</div>`
        + `<div class="sb${p.bank < need ? ' low' : ''}">${p.out ? '出局' : money(p.bank)}</div></div>`
        + `<span class="sx">${p.tag || ''}</span>`;
    }
    box.appendChild(n);
  }
}

/* ---------------------------------------------------------------- 下注屏 */

/** 赛前只想看第一手，不推进任何状态。 */
function peek(mob, lv) {
  const u = E.makeUnit(mob, lv, 0, 0);
  const sid = (mob.op && mob.op[0]) || (mob.cy && mob.cy[0]);
  const sk = sid ? DATA.skills[sid] : null;
  return { u, sk, text: sk ? E.skillText(sk, u) : '' };
}

const INTENT_CLS = (code) => {
  if (!code) return '';
  if (code === '007' || code === '011' || code === '008' || code === '012') return 'def';
  if (code === '005' || code === '006' || code === '015' || code === '014') return 'buf';
  if (code === '003' || code === '004' || code === '013') return 'buf';
  return 'atk';
};

function unitLine(m) {
  const { u, sk } = peek(m.mob, m.lv);
  const full = sk ? (DATA.intent[sk.i] || '特殊行动') : '—';
  const narrow = window.matchMedia('(max-width:379px)').matches;
  const it = narrow ? full.slice(0, 1) : full;
  const n = el('div', 'unit');
  n.innerHTML = `<span class="mface" style="${faceStyle(m.mob.ix, narrow ? 26 : 34)}"></span>`
    + `<div class="um"><div class="un">${m.mob.n}</div>`
    // 窄屏：势级队头已经写过，血/攻也用最省字数的写法，别把数字挤成省略号
    + (narrow
      ? `<div class="uv">${money(u.maxHp)}血 ${Math.round(u.atk)}攻</div></div>`
      : `<div class="uv">${money(u.maxHp)} 血 · ${Math.round(u.atk)} 攻 · ${E.LV[m.lv].n}</div></div>`)
    + `<span class="ui ${INTENT_CLS(sk && sk.i)}" title="点开看完整意图表">${it}<i>›</i></span>`;
  n.title = '点开看这一只要做什么';
  n.addEventListener('click', (ev) => { ev.stopPropagation(); showMob(m.mob, m.lv); });
  return n;
}

function renderTeam(side) {
  const box = $(side === 0 ? 'teamL' : 'teamR');
  const team = side === 0 ? S.fixture.L : S.fixture.R;
  const st = side === 0 ? S.fixture.sl : S.fixture.sr;
  box.innerHTML = '';
  const h = el('div', 'th');
  h.innerHTML = `<b>${side === 0 ? '左笼' : '右笼'}</b><span>${team.length} 只 · 势 ${E.LV[team[0].lv].n.slice(1)}</span>`;
  box.appendChild(h);
  for (const m of team) box.appendChild(unitLine(m));
  const f = el('div', 'tfoot');
  f.innerHTML = `<span>血 <b>${money(st.hp)}</b></span><span>攻 <b>${money(st.atk)}</b></span>`;
  box.appendChild(f);
  box.setAttribute('aria-pressed', String(pickedSide === side));
}

function renderBet() {
  $('hRound').textContent = S.round;
  $('hMin').textContent = money(T.minStake(S.round));
  $('potCarry') || 0;
  const carry = S.carry || 0;
  $('hCarry').textContent = carry > 0 ? `（含滚存 ${money(carry)}）` : '';
  renderTeam(0);
  renderTeam(1);
  renderBoard();
  renderAmt();
  paintBank();
  const min = T.minStake(S.round);
  $('amtVal').textContent = money(amt);
  $('pickLabel').textContent = pickedSide < 0 ? '先点一边'
    : `押${pickedSide === 0 ? '左' : '右'} · ${money(amt)} 注`;
  $('betL').disabled = S.you.bank < min;
  $('betR').disabled = S.you.bank < min;
  $('btnFight').disabled = pickedSide < 0 || busy;
  // 快捷注额
  const qr = $('quickRow');
  qr.innerHTML = '';
  const opts = [min, Math.round(S.you.bank * 0.1 / 10) * 10, Math.round(S.you.bank * 0.25 / 10) * 10,
    Math.round(S.you.bank * 0.5 / 10) * 10, S.you.bank];
  const seen = new Set();
  for (const v of opts) {
    const val = Math.max(min, Math.min(S.you.bank, Math.floor(v / 10) * 10));
    if (seen.has(val)) continue;
    seen.add(val);
    const b = el('button', 'chipbtn' + (amt === val ? ' on' : ''), val >= S.you.bank ? '全押' : money(val));
    b.type = 'button';
    b.addEventListener('click', () => { amt = val; renderAmt(); });
    qr.appendChild(b);
  }
}

/** 自己的荷包与「押完还剩多少」——下注屏最该看见的两个数。 */
function paintBank() {
  const mine = S.bets.find((b) => b.id === 'you');
  const already = mine && !mine.pass ? mine.amt : 0;
  $('betBank').textContent = money(S.you.bank);
  $('betAfter').textContent = already
    ? `已押 ${money(already)} · 余 ${money(S.you.bank - already)}`
    : `押 ${money(amt)} · 余 ${money(Math.max(0, S.you.bank - amt))}`;
}

function renderAmt() {
  const min = T.minStake(S.round);
  amt = Math.max(min, Math.min(S.you.bank, Math.floor(amt / 10) * 10));
  $('amtVal').textContent = money(amt);
  $('pickLabel').textContent = pickedSide < 0 ? '先点一边'
    : `押${pickedSide === 0 ? '左' : '右'} · ${money(amt)} 注`;
  const qr = $('quickRow');
  [...qr.children].forEach((b) => b.classList.remove('on'));
  // 高亮与当前金额一致的快捷键（文字比较，省得再存一遍值）
  for (const b of qr.children) {
    if (b.textContent === money(amt) || (amt >= S.you.bank && b.textContent === '全押')) b.classList.add('on');
  }
  paintBank();
}

function renderBoard() {
  const box = $('boardList');
  box.innerHTML = '';
  const pool = { 0: 0, 1: 0 };
  for (const b of S.bets) if (b.side >= 0) pool[b.side] += b.amt;
  const pot = (S.carry || 0) + pool[0] + pool[1];
  $('hPot').textContent = money(pot);
  if (!revealed) {
    $('boardHint').textContent = '九个人还没押 · 右边的「余」是各自荷包';
    for (const p of S.ai) {
      if (p.out) continue;
      const r = el('div', 'row');
      r.innerHTML = `<img src="${p.face}" alt="" width="22" height="22" loading="lazy">`
        + `<span class="rn">${p.n}<span class="rs">${p.tag || ''}</span></span>`
        + `<span class="bk">余 ${money(p.bank)}</span>`
        + `<span class="rb p">…</span>`;
      box.appendChild(r);
    }
    return;
  }
  $('boardHint').textContent = '注都摆上桌了 · 「余」是押完还剩下的';
  const byId = new Map(S.bets.map((b) => [b.id, b]));
  const rows = [S.you, ...S.ai].filter((p) => !p.out);
  rows.sort((a, b) => {
    const ba = byId.get(a.id), bb = byId.get(b.id);
    return ((bb && bb.amt) || 0) - ((ba && ba.amt) || 0);
  });
  for (const p of rows) {
    const b = byId.get(p.id);
    const r = el('div', 'row' + (p.isYou ? ' you' : ''));
    const img = p.isYou
      ? `<span class="ph" style="display:grid;place-items:center;font-size:10px">你</span>`
      : `<img src="${p.face}" alt="" width="22" height="22" loading="lazy">`;
    let tag;
    if (!b || b.pass) tag = `<span class="rb p">不下</span>`;
    else tag = `<span class="rb ${b.side === 0 ? 'l' : 'r'}">${b.side === 0 ? '左' : '右'} ${money(b.amt)}</span>`;
    const left = p.bank - (b && !b.pass ? b.amt : 0);
    r.innerHTML = `${img}<span class="rn">${p.n}${p.isYou ? '' : `<span class="rs">${p.tag || ''}</span>`}</span>`
      + `<span class="bk">余 ${money(left)}</span>${tag}`;
    box.appendChild(r);
  }
  // 赔率提示
  const winSide = null;
  if (pool[0] > 0 && pool[1] > 0) {
    const ra = (pot / pool[0]).toFixed(2), rb = (pot / pool[1]).toFixed(2);
    $('boardHint').innerHTML = `押左 ${money(pool[0])}（赔 ${ra}）· 押右 ${money(pool[1])}（赔 ${rb}）`;
  }
}

/* ---------------------------------------------------------------- 战斗屏 */
function unitCard(u) {
  const n = el('div', 'fu ' + (u.side === 0 ? 'L' : 'R'));
  n.dataset.uid = u.uid;
  n.innerHTML = `<span class="mface" style="${faceStyle(u.ix, 32)}"></span>`
    + `<div class="fm"><div class="fn">${u.n}</div>`
    + `<div class="bar"><i style="width:100%"></i></div>`
    + `<div class="fhp">${money(u.hp)} / ${money(u.maxHp)}</div>`
    + `<div class="marks"></div></div>`
    + `<span class="fi"></span>`;
  n.title = '点开看意图表';
  n.addEventListener('click', () => showMob(mobOf(u), u.lv, u));
  return n;
}

function renderFightShell() {
  $('fRound').textContent = S.round;
  $('fTurn').textContent = 1;
  const pot = S.bets.filter((b) => !b.pass).reduce((n, b) => n + b.amt, 0) + (S.carry || 0);
  $('fPot').textContent = money(pot);
  for (const side of [0, 1]) {
    const box = $(side === 0 ? 'fL' : 'fR');
    box.innerHTML = '';
    for (const u of B.teams[side].units) box.appendChild(unitCard(u));
  }
  $('fLog').innerHTML = '';
}

function unitNode(uid) {
  return document.querySelector(`.fu[data-uid="${uid}"]`);
}

function paintUnit(u) {
  const n = unitNode(u.uid);
  if (!n) return;
  const bar = n.querySelector('.bar i');
  const pct = Math.max(0, u.hp / u.maxHp * 100);
  bar.style.width = pct + '%';
  n.querySelector('.fhp').textContent = `${money(u.hp)} / ${money(u.maxHp)}`
    + (u.shield > 0 ? ` +${money(u.shield)}盾` : '');
  if (!u.alive) n.classList.add('dead');
  const mk = n.querySelector('.marks');
  mk.innerHTML = '';
  const add = (cls, txt) => { const i = el('i', cls, txt); mk.appendChild(i); };
  if (u.str > 0) add('str', '力+' + u.str);
  if (u.bleed > 0) add('bl', '血' + u.bleed);
  if (u.poison > 0) add('po', '毒' + u.poison);
  if (u.vuln > 0) add('vu', '易伤' + u.vuln);
  if (u.weak > 0) add('wk', '虚弱' + u.weak);
  if (u.barrier > 0) add('br', '屏障' + u.barrier);
  const fi = n.querySelector('.fi');
  if (fi) {
    const bd = E.intentBadge(DATA, u);
    // 窄屏放不下两个字以上的标签：缩成一个字，别去挤怪物的名字
    const narrow = window.matchMedia('(max-width:379px)').matches;
    fi.textContent = bd ? (narrow ? bd.n.slice(0, 1) : bd.n) : '';
    fi.className = 'fi ' + (bd ? INTENT_CLS(bd.code) : '');
  }
}

function logLine(txt, cls) {
  const box = $('fLog');
  const d = el('div', cls || '', txt);
  box.appendChild(d);
  while (box.children.length > 40) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function playEvents(events) {
  for (const e of events) {
    if (e.k === 'turn') {
      $('fTurn').textContent = e.turn;
      logLine(`— 第 ${e.turn} 回合 —`, 'big');
    } else if (e.k === 'cast') {
      logLine(`${e.t || ''}`, 'hit');
      const u = findUnit(e.by);
      if (u) { const n = unitNode(u.uid); if (n) { n.classList.add('act'); setTimeout(() => n.classList.remove('act'), 260); } }
    } else if (e.k === 'hit') {
      logLine(e.t, 'hit');
    } else if (e.k === 'down') {
      logLine(e.t, 'dn');
    } else if (e.k === 'buff' || e.k === 'debuff' || e.k === 'heal' || e.k === 'dot' || e.k === 'summon') {
      logLine(e.t, '');
    } else if (e.k === 'end') {
      logLine(e.t, 'big');
    }
    // 有新单位进场（召唤）就补一张卡
    for (const side of [0, 1]) {
      const box = $(side === 0 ? 'fL' : 'fR');
      if (box.children.length < B.teams[side].units.length) {
        for (const u of B.teams[side].units) if (!unitNode(u.uid)) box.appendChild(unitCard(u));
      }
    }
    for (const side of [0, 1]) for (const u of B.teams[side].units) paintUnit(u);
  }
}

function findUnit(uid) {
  for (const side of [0, 1]) {
    const u = B.teams[side].units.find((x) => x.uid === uid);
    if (u) return u;
  }
  return null;
}

function playLoop() {
  if (!B || B.over) { endFight(); return; }
  const ev = E.step(B);
  playEvents(ev);
  if (B.over) { endFight(); return; }
  const gap = ev.some((e) => e.k === 'turn') ? 520 : 240;
  playTimer = setTimeout(playLoop, Math.max(60, gap / speed));
}

function endFight() {
  clearTimeout(playTimer);
  playTimer = null;
  for (const side of [0, 1]) for (const u of B.teams[side].units) paintUnit(u);
  $('btnNext').disabled = false;
  $('btnNext').textContent = '结算';
  $('btnSkip').disabled = true;
  if (!$('ov').hidden) return;
  clearTimeout(endT);
  endT = setTimeout(() => { if (B && B.over) showSettle(); }, 750);
}

/* ---------------------------------------------------------------- 结算 */
function showSettle() {
  const r = T.settle(S);
  if (!r) return;
  const win = r.winner;
  $('ovk').textContent = `第 ${S.round} 局`;
  const t = $('ovt');
  if (win === 'draw') { t.textContent = '一起倒了'; t.className = 'big'; }
  else { t.textContent = win === 0 ? '左笼赢了' : '右笼赢了'; t.className = 'big win'; }
  const myBet = S.bets.find((b) => b.id === 'you');
  const myRow = r.rows.find((x) => x.id === 'you');
  let sc = `池子 <b>${money(r.pool)}</b>`;
  if (r.noOne) sc += ` · <b style="color:var(--lose)">全场没人押中，这 ${money(r.pool)} 压在桌上滚到下一局</b>`;
  else if (myRow) {
    sc += myRow.win
      ? ` · 你押${myRow.side === 0 ? '左' : '右'}中了，本息 <b>${money(myRow.back)}</b>（净 <b style="color:var(--win)">+${money(myRow.net)}</b>）`
      : ` · 你押${myRow.side === 0 ? '左' : '右'}，这一注 <b style="color:var(--lose)">−${money(myRow.amt)}</b>`;
  } else if (myBet && myBet.pass) sc += ' · 你这一局没押';
  else sc += ' · 你这一局没押';
  $('ovs').innerHTML = sc;

  // 分账表：按净收益排，赢的在上
  const pay = $('ovPay');
  pay.innerHTML = '';
  const order = [...r.rows].sort((a, b) => b.net - a.net);
  const nameOf = (id) => ([S.you, ...S.ai].find((p) => p.id === id) || { n: '?' }).n;
  for (const row of order) {
    const d = el('div', 'pr');
    const who = nameOf(row.id);
    d.innerHTML = `<span class="pn">${who}${row.side === 0 ? ' · 左' : ' · 右'} ${money(row.amt)}</span>`
      + `<span class="pv ${row.net > 0 ? 'up' : row.net < 0 ? 'dn' : 'ps'}">`
      + `${row.net > 0 ? '+' : row.net < 0 ? '−' : ''}${money(Math.abs(row.net))}</span>`;
    pay.appendChild(d);
  }
  for (const p of [S.you, ...S.ai]) {
    if (S.bets.some((b) => b.id === p.id && !b.pass)) continue;
    const d = el('div', 'pr');
    d.innerHTML = `<span class="pn">${p.n}</span><span class="pv ps">没押</span>`;
    pay.appendChild(d);
  }
  $('ov').hidden = false;
  ovMode = S.over ? 'over' : 'next';
  $('ovAgain').textContent = S.over ? '看看座次' : '下一局';
}

/* ---------------------------------------------------------------- 流程 */
function startTable() {
  const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
  S = T.newTable(DATA, SEATS, seed);
  pickedSide = -1;
  amt = T.MIN_STAKE;
  revealed = false;
  go('home');
  renderHome();
}

function go(scr) {
  for (const id of ['home', 'bet', 'fight']) $('scr-' + id).hidden = id !== scr;
  $('scr-' + scr).classList.add('on');
}

function beginRound() {
  T.nextRound(S);
  pickedSide = -1;
  amt = T.minStake(S.round);
  revealed = false;
  busy = false;
  go('bet');
  renderBet();
  $('sub').textContent = `第 ${S.round} 局 · 底注 ${money(T.minStake(S.round))}`;
}

function pickSide(side) {
  if (busy) return;
  pickedSide = side;
  renderBet();
}

function doBet(side) {
  const r = T.placeBet(S, side, amt);
  if (!r.ok) { toast(r.why); return; }
  pickedSide = side;
  revealAndFight();
}

/** 开笼：先让人机把注押完（逐个亮出来），再进战斗。 */
function revealAndFight() {
  busy = true;
  $('btnFight').disabled = true;
  T.aiBet(S, (p, f, pool, tb, MIN) => A.decideBet(p, f, pool, tb, DATA, MIN, S.rnd));
  revealed = true;
  renderBet();
  $('boardHint').textContent = '注都摆上桌了…';
  setTimeout(() => {
    const my = S.bets.find((b) => b.id === 'you');
    if (!my) { toast('你没押，这一局只能看'); }
    S.carry = S.carry || 0;
    B = T.startBattle(S);
    go('fight');
    renderFightShell();
    speed = 1;
    $('btnSpeed').textContent = '×1';
    $('btnSkip').disabled = false;
    $('btnNext').disabled = true;
    playLoop();
  }, 900);
}

function nextRound() {
  $('ov').hidden = true;
  if (S.over) { go('home'); renderHome(); return; }
  beginRound();
}

function showOver() {
  $('ovk').textContent = '散桌';
  const rank = T.rankOf(S, 'you');
  const t = $('ovt');
  t.className = 'big';
  t.textContent = S.champion === 'you' ? '你把整桌赢走了'
    : rank === 1 ? '你钱最多' : `你排第 ${rank}`;
  $('ovs').innerHTML = `荷包 <b>${money(S.you.bank)}</b> · 打了 ${S.round} 局`;
  $('ovPay').innerHTML = T.standings(S).map((p, i) =>
    `<div class="pr"><span class="pn">${i + 1}. ${p.n}${p.out ? '（出局）' : ''}</span>`
    + `<span class="pv ${p.isYou ? 'up' : 'ps'}">${money(p.bank)}</span></div>`).join('');
  $('ov').hidden = false;
  ovMode = 'again';
  $('ovAgain').textContent = '再开一桌';
}

/* ---------------------------------------------------------------- 详情 / 规则 */
/** 战斗屏的单位只带 sid，得换回名录里的完整条目才看得到意图表。 */
let MOB_IX = null;
function mobOf(u) {
  if (!MOB_IX) {
    MOB_IX = new Map();
    for (const m of DATA.mobs) MOB_IX.set(m.id, m);
  }
  return MOB_IX.get(u.sid) || {
    id: u.sid, n: u.n, ix: u.ix, rank: u.rank, hp: 1, atk: 1,
    op: u.op || [], cy: u.cy || [], desc: u.desc || '',
  };
}

/** 现在是第几手（从 0 数）：开局按 op 走，走完在 cy 里转。 */
function handIndex(u) {
  const op = u.op || [], cy = u.cy || [];
  if (u.acted < op.length) return u.acted;
  if (!cy.length) return op.length ? u.acted % op.length : -1;
  return op.length + ((u.acted - op.length) % cy.length);
}

// 开局表最长的有 48 手（一只首领），全列出来没人看——只列前 8 手，剩下折一行。
const OP_SHOW = 8;

/** 逐回合的意图表：先 op，再 cy（循环体）。 */
function intentPlan(mob) {
  const op = mob.op || [], cy = mob.cy || [];
  const rows = [];
  for (let i = 0; i < Math.min(op.length, OP_SHOW); i++) rows.push({ t: i + 1, sid: op[i], cyc: false });
  if (op.length > OP_SHOW) rows.push({ gap: op.length - OP_SHOW });
  for (let i = 0; i < cy.length; i++) rows.push({ t: op.length + i + 1, sid: cy[i], cyc: true });
  return rows;
}

function showMob(mob, lv, live) {
  const u = live || E.makeUnit(mob, lv, 0, 0);
  const now = handIndex(u);
  const nowSk = DATA.skills[E.intentOf(u)];
  const opN = (mob.op || []).length;
  const cyN = (mob.cy || []).length;

  let html = `<p style="margin:0 0 4px"><b>${mob.n}</b> · ${E.RANK[mob.rank].n} · ${E.LV[lv].n}`
    + (live ? ' · <span style="color:var(--gold)">场上</span>' : '') + '</p>';
  html += `<div class="tagbar"><i>${money(u.maxHp)} 血</i><i>${Math.round(u.atk)} 攻</i>`
    + (live ? `<i>剩 ${money(u.hp)}</i>` : '')
    + `<i>原作 hp ${mob.hp}</i><i>原作 atk ${mob.atk}</i></div>`;
  if (mob.desc) html += `<p class="mdesc">${mob.desc}</p>`;

  // 这一手单独拎出来——下注前真正要看的就是它
  html += `<h4>${live ? '第 ' + (now + 1) + ' 回合' : '第一回合'}要做的</h4>`;
  html += `<div class="nowbox ${nowSk ? INTENT_CLS(nowSk.i) : ''}">`
    + `<span class="ni">${nowSk ? (DATA.intent[nowSk.i] || '特殊行动') : '—'}</span>`
    + `<div class="nb"><b>${nowSk ? (nowSk.n || '（无名）') : '没有可放的技能'}</b>`
    + `<span>${nowSk ? E.skillText(nowSk, u) : ''}</span></div></div>`;

  // 整张表：前 8 手按表走，之后在循环体里转
  html += '<h4>意图表</h4>';
  html += `<p class="sub2">开局 ${opN} 手按表走` + (cyN ? `，之后在最后 ${cyN} 手里循环` : '') + '。'
    + '标金边的是这一回合要放的。</p>';
  html += '<div class="itbl">';
  for (const r of intentPlan(mob)) {
    if (r.gap != null) {
      html += `<div class="tg">… 开局还剩 ${r.gap} 手，略（都按表走）</div>`;
      continue;
    }
    const sk = DATA.skills[r.sid];
    if (!sk) continue;
    const cur = r.t - 1 === now ? ' cur' : '';
    html += `<div class="tr${cur}${r.cyc ? ' cyc' : ''}">`
      + `<span class="tn">${r.t}</span>`
      + `<span class="ti ${INTENT_CLS(sk.i)}">${DATA.intent[sk.i] || '特殊'}</span>`
      + `<div class="tx"><b>${sk.n || '（无名）'}${r.cyc ? '<i>循环</i>' : ''}</b>`
      + `<span>${E.skillText(sk, u)}</span></div></div>`;
  }
  html += '</div>';
  html += `<p class="sub2" style="margin-top:8px">伤害按这一只的攻（${Math.round(u.atk)}）算；`
    + '场上有力量、虚弱、易伤时实际会变，关掉再点开会按当下的状态重算。</p>';
  openSheet(mob.n, html);
}

function showRules() {
  const html = `
  <p>系统从《忘却前夜》的怪物名录里挑两队关进同一个笼子，你押哪边能活着出来。</p>
  <h4>一、两队是这么挑的</h4>
  <p>每边 1~3 只，队里最多一只首领。系统会尽量让两边的综合战力接近——但不会完全一样，
  所以每局都有「看着强」和「看着悬」的一边。势级（势一~势四）是整队的身价档，同一只怪在不同势级下血和攻不一样。</p>
  <h4>二、数值从哪来</h4>
  <p>血、攻、每一手技能，全部来自客户端数据表的原值（<b>hp / atk 是原作倍率</b>，技能是原文），
  换算只做了一件事：<b>血 = 原作 hp 倍率 × 900</b>、<b>攻击 = 原作 atk 倍率 × 125</b>，
  再乘阶级（普通 1 / 精英 1.55 / 首领 2.3）与势级。阶级系数和基准是本站定的，其余一个数没改。</p>
  <h4>三、打起来照原作的意图走</h4>
  <p>每只怪都有一张<b>意图表</b>：前几回合按固定顺序出手，之后循环。点开怪物详情能看到全部技能与它们各自在做什么
  （伤害 / 护盾 / 力量 / 虚弱 / 易伤 / 出血 / 中毒 / 屏障 / 召唤）。状态的算法也是原作的：
  力量每层 +1 伤害；虚弱 −25%；易伤 +50%；出血回合末按层数扣血后清空；中毒按层数扣血不清空；屏障免疫一次。</p>
  <h4>四、钱怎么算</h4>
  <p>所有注进一个池子。<b>押对的人按自己注额占总池的比例把整池分掉</b>——本金拿回来，输家的钱一起分。
  押错的那一注留在池里。要是全场没人押中，这一注不烧掉，压在桌上滚到下一局。</p>
  <h4>五、什么时候下桌</h4>
  <p>底注每 3 局翻一倍（50→100→200→400）。<b>荷包不够下一局底注就出局</b>。
  打满 12 局按荷包排名，或者提前只剩一个人。</p>
  <h4>六、九个人机</h4>
  <p>他们押的是同一副牌，但看的东西不一样：杜勒赛因只认血厚的，白云出岫只看谁打得疼，
  立誓0氪只数只数，阿格里帕把血攻意图全算一遍，魔龙_D 专反着大家来。
  他们不知道这一局的骰子——开局之前骰子还没掷。</p>`;
  openSheet('规则', html);
}

function openSheet(title, html) {
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  $('sheet').hidden = false;
}

let toastT = null;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), 1500);
}

/* ---------------------------------------------------------------- 挂载 */
export function mount() {
  // 首页
  $('btnStart').addEventListener('click', () => { startTable(); beginRound(); });
  $('btnRules').addEventListener('click', showRules);
  $('btnRules2').addEventListener('click', showRules);
  $('sheetClose').addEventListener('click', () => { $('sheet').hidden = true; });
  $('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) $('sheet').hidden = true; });

  // 下注
  $('teamL').addEventListener('click', () => pickSide(0));
  $('teamR').addEventListener('click', () => pickSide(1));
  $('betL').addEventListener('click', () => doBet(0));
  $('betR').addEventListener('click', () => doBet(1));
  $('amtDown').addEventListener('click', () => {
    amt = Math.max(T.minStake(S.round), amt - Math.max(10, Math.round(amt * 0.1)));
    renderAmt();
  });
  $('amtUp').addEventListener('click', () => {
    amt = Math.min(S.you.bank, amt + Math.max(10, Math.round(amt * 0.1)));
    renderAmt();
  });
  $('btnFight').addEventListener('click', () => { if (pickedSide >= 0) doBet(pickedSide); });
  $('btnQuit').addEventListener('click', () => { go('home'); renderHome(); });

  // 战斗
  $('btnSkip').addEventListener('click', () => {
    clearTimeout(playTimer);
    let guard = 0;
    while (B && !B.over && guard++ < 400) playEvents(E.step(B));
    endFight();
  });
  $('btnSpeed').addEventListener('click', () => {
    speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
    $('btnSpeed').textContent = '×' + speed;
  });
  $('btnNext').addEventListener('click', showSettle);

  // 结算
  $('ovAgain').addEventListener('click', () => {
    if (ovMode === 'over') { showOver(); return; }
    if (ovMode === 'again') { $('ov').hidden = true; startTable(); beginRound(); return; }
    nextRound();
  });
  $('ovHome').addEventListener('click', () => { $('ov').hidden = true; go('home'); renderHome(); });

  // 开桌
  startTable();
  $('boot').style.display = 'none';

  // 无头验收钩子：?_test=1&go=bet|fight|settle 直接落到某一屏，
  // 免得每张截图都要点三下。线上没人带这个参数就什么都不做。
  const q = new URLSearchParams(location.search);
  if (q.get('_test') === '1') {
    window.__bf = {
      table: () => S, battle: () => B,
      bet: (side, amt2) => { pickedSide = side; amt = amt2; renderBet(); doBet(side); },
      settle: () => showSettle(),
      skip: () => { clearTimeout(playTimer); let g = 0; while (B && !B.over && g++ < 400) playEvents(E.step(B)); endFight(); },
      rules: showRules,
      mob: (i) => showMob(DATA.mobs[i], 1),
    };
    const go2 = q.get('go');
    if (go2 === 'bet' || go2 === 'fight' || go2 === 'settle') {
      startTable();
      beginRound();
      if (go2 !== 'bet') {
        amt = T.minStake(S.round);
        doBet(0);
        setTimeout(() => {
          if (!B) return;
          if (go2 === 'fight') { setTimeout(() => { if (B && !B.over) { /* 让画面停在半场 */ } }, 900); }
          if (go2 === 'settle') { window.__bf.skip(); setTimeout(showSettle, 60); }
        }, 1100);
      }
    }
  }
}
