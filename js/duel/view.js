// 页面层：首页 / 对战 / 卡包 / 卡表 / 世界观。
// 所有规则判断都走 engine.js，这里只负责「把状态画出来」和「把点击翻译成操作」。
import { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART } from './gen.js';
import * as E from './engine.js';
import { nextAction } from './ai.js';
import { loadSave, saveSave } from './store.js';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PACK_PRICE = 60;

const REALM_TXT = { chaos: '混沌', caro: '血肉', aqua: '深海', ultra: '超维', any: '无界' };
const KIND_TXT = { M: '怪兽', S: '魔法', T: '陷阱', E: '觉醒体' };
const RAR_ORDER = ['N', 'R', 'SR', 'UR', 'GR'];

const S = {
  save: loadSave(),
  view: 'home',
  deckId: 'd1',
  diff: 'normal',
  G: null,
  sel: null,        // { type:'hand'|'mon', uid }
  mode: 'idle',     // idle | act | tribute | attack | extra
  tribute: [],
  busy: false,
  result: false,
  codex: { k: 'all', r: 'all' },
};

// ------------------------------------------------------------------ 工具
function toast(msg) {
  const d = document.createElement('div');
  d.textContent = msg;
  d.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99;'
    + 'background:rgba(12,16,24,.94);color:#e8ecf5;border:1px solid #354053;border-radius:10px;'
    + 'padding:8px 14px;font-size:12.5px;box-shadow:0 12px 30px -18px #000;transition:opacity .3s';
  document.body.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; }, 1500);
  setTimeout(() => { d.remove(); }, 1900);
}

function show(id) {
  S.view = id;
  $$('#stage .scr').forEach((s) => s.classList.toggle('on', s.id === 'scr-' + id));
  if (id === 'home') renderHome();
  if (id === 'packs') renderPacks();
  if (id === 'codex') renderCodex();
  if (id === 'lore') renderLore();
}

function silverBar() {
  const n = $('#silver');
  if (n) n.textContent = S.save.silver;
}

// ------------------------------------------------------------------ 卡面
function facePos(name) {
  const i = ART.index[name];
  if (i == null) return '';
  const col = i % ART.cols;
  const row = Math.floor(i / ART.cols);
  const px = ART.cols > 1 ? (col * 100) / (ART.cols - 1) : 0;
  const py = ART.rows > 1 ? (row * 100) / (ART.rows - 1) : 0;
  return `background-position:${px}% ${py}%`;
}

function cardHTML(id, opt) {
  const o = opt || {};
  const c = typeof id === 'string' ? CARDS[id] : id;
  if (!c) return '';
  const cls = ['card'];
  if (o.mini) cls.push('mini');
  if (o.big) cls.push('big');
  if (o.set) cls.push('set');
  if (o.on) cls.push('on');
  if (o.dim) cls.push('dim');
  if (o.def) cls.push('def');
  if (o.used) cls.push('used');
  const rb = c.rar || 'N';
  const realm = c.r || 'any';
  const name = o.set ? '盖放' : c.n;
  const face = o.set ? '' : `style="${facePos(c.art || c.n)}"`;
  let tail = '';
  if (c.k === 'M' || c.k === 'E') {
    tail = `<div class="pt"><b>${c.atk}</b><span>/</span><b>${c.def}</b></div>`;
  } else {
    const t = { normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '';
    tail = `<div class="pt">${c.k === 'S' ? '魔法' : '陷阱'} · ${t}</div>`;
  }
  const lv = c.k === 'M' || c.k === 'E' ? `<span class="lv">${c.lv >= 8 ? '★8' : 'Lv' + c.lv}</span>` : '';
  return `<div class="${cls.join(' ')}" data-r="${realm}" data-rar="${rb}" data-id="${c.id}"`
    + `${o.uid != null ? ` data-uid="${o.uid}"` : ''}>`
    + `<span class="rm"></span>`
    + `<div class="face" ${face}></div>`
    + `<span class="rb">${rb}</span>${lv}`
    + `<div class="ct"><b class="nm">${name}</b>${tail}</div>`
    + `${o.tag ? `<span class="tagp">${o.tag}</span>` : ''}`
    + `</div>`;
}

// ------------------------------------------------------------------ 首页
function renderHome() {
  const decks = DECKS.map((d) => {
    const bonds = E.evalBonds(deckList(d));
    const total = d.cards.reduce((s, p) => s + p[1], 0);
    return `<button class="deck ${d.id === S.deckId ? 'on' : ''}" data-deck="${d.id}" style="--rc:${
      (E.REALM[d.r] || E.REALM.any).c}">
      <div class="dh"><b>${d.n}</b><span class="rm">${(E.REALM[d.r] || E.REALM.any).n}</span></div>
      <div class="ds">${d.desc}</div>
      <div class="db">${bonds.map((b) => `<span class="bond">${b.n}</span>`).join('') || '<span class="bond" style="opacity:.5">无羁绊</span>'}</div>
      <div class="dm">主卡组 ${total} 张 · 额外 ${d.extra.length} 张 · 羁绊 ${bonds.length} 条</div>
    </button>`;
  }).join('');

  const sel = DECKS.find((d) => d.id === S.deckId) || DECKS[0];
  const bonds = E.evalBonds(deckList(sel));

  $('#scr-home').innerHTML = `
    <div class="hero">
      <p class="kicker">FORGETTING EVE · DUEL OF THE WHEEL</p>
      <h1>命轮对决</h1>
      <p class="lead">你是守密人，桌上摊着两套记忆。每一张卡都是一个<strong>你还记得的人</strong>：
        召唤她是承认她存在，把她当祭品是承认有更重要的东西。命轮值归零不是死，是<strong>不再确定自己是谁</strong>。</p>
      <div class="hr"></div>
    </div>

    <div class="sec-h"><h2>选一套卡组</h2><span class="r">共 ${DECKS.length} 套 · 每套 30 张 + 觉醒体</span></div>
    <div class="decks">${decks}</div>

    <div class="sec-h"><h2>这套牌的羁绊</h2><span class="r">${bonds.length} 条已触发</span></div>
    <div class="row" style="gap:6px">${bonds.map((b) => `<span class="bond" title="${b.text}">${b.n}</span>`).join('') || '<span class="note">这套牌凑不出羁绊——它只是三十张牌。</span>'}</div>
    <ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>

    <div class="sec-h"><h2>开始</h2><span class="r">对手从其余五套里随机</span></div>
    <div class="row">
      <div class="seg" id="diff">
        <button data-d="easy" class="${S.diff === 'easy' ? 'on' : ''}">轻松</button>
        <button data-d="normal" class="${S.diff === 'normal' ? 'on' : ''}">普通</button>
        <button data-d="hard" class="${S.diff === 'hard' ? 'on' : ''}">认真</button>
      </div>
      <button class="btn pri" data-act="start">开始对决</button>
      <button class="btn ghost" data-act="howto">规则</button>
    </div>

    <div class="nav-tiles">
      <button class="tile" data-act="go-packs"><span class="ti">✦</span><span><span class="tn">卡包</span><br><span class="td">开包、收集 · ${Object.keys(S.save.coll).length} 种已收录</span></span></button>
      <button class="tile" data-act="go-codex"><span class="ti">▤</span><span><span class="tn">卡表</span><br><span class="td">${Object.keys(CARDS).length} 张 · 效果全文</span></span></button>
      <button class="tile" data-act="go-lore"><span class="ti">◈</span><span><span class="tn">世界观</span><br><span class="td">弥萨格、守密人与四界域</span></span></button>
    </div>
    <p class="note" style="margin-top:12px">战绩：${S.save.wins} 胜 ${S.save.losses} 负 · 已开 ${S.save.opened} 包。银芯赢一场 +120、输一场 +40，开一包 -${PACK_PRICE}。</p>
  `;
}

function deckList(def) {
  const out = [];
  for (const p of def.cards) for (let i = 0; i < p[1]; i++) out.push(p[0]);
  return out;
}

// ------------------------------------------------------------------ 对战
function startDuel() {
  const mine = DECKS.find((d) => d.id === S.deckId) || DECKS[0];
  const others = DECKS.filter((d) => d.id !== mine.id);
  const foe = others[Math.floor(Math.random() * others.length)];
  S.G = E.createGame(
    { cards: mine.cards, extra: mine.extra },
    { cards: foe.cards, extra: foe.extra },
    { seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0 },
  );
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.result = false; S.busy = false;
  show('duel');
  renderDuel();
}

function phaseText(G) {
  if (G.phase === 'battle') return '战斗阶段';
  return G.active === 0 ? '你的主要阶段' : '对手的主要阶段';
}

function lpBar(p) {
  const pct = Math.max(0, Math.min(100, (p.lp / p.lpMax) * 100));
  return `<div class="lp ${pct < 30 ? 'low' : ''}"><i style="width:${pct}%"></i>`
    + `<span class="lpn">${Math.max(0, p.lp)} / ${p.lpMax}</span></div>`;
}

function bondsDots(bonds) {
  if (!bonds || !bonds.length) return '';
  return `<div class="bonds">${bonds.map((b) => `<span title="羁绊：${b.n}"></span>`).join('')}</div>`;
}

function slotHTML(m, i, side, hot) {
  if (!m) return `<div class="slot empty ${hot ? 'hot' : ''}" data-slot="${side}-${i}" data-l="空位"></div>`;
  if (!m.id) {
    return `<div class="slot" data-slot="${side}-${i}">`
      + cardHTML({ id: 'back', n: '盖放', k: 'M', r: 'any', rar: 'N', lv: 0, atk: 0, def: 0 }, { set: true, uid: m.uid })
      + '</div>';
  }
  const c = CARDS[m.id];
  const tag = c.k === 'E' ? '觉醒' : (m.pos === 'def' ? '守备' : '攻击');
  return `<div class="slot" data-slot="${side}-${i}">`
    + cardHTML(c, { uid: m.uid, def: m.pos === 'def', tag, used: side === 'me' && m.canAtk === false })
    + '</div>';
}

function spellSlotHTML(s, i, side, hot) {
  if (!s) return `<div class="slot sp empty ${hot ? 'hot' : ''}" data-slot="${side}-sp-${i}"></div>`;
  const c = s.id ? CARDS[s.id] : null;
  const card = c && !s.set
    ? cardHTML(c, { mini: true, tag: '发动' })
    : cardHTML({ id: 'back', n: '盖放', k: 'T', r: 'any', rar: 'N', lv: 0, atk: 0, def: 0 }, { mini: true, set: true });
  return `<div class="slot sp" data-slot="${side}-sp-${i}">${card}</div>`;
}

function renderDuel() {
  const G = S.G;
  if (!G) { show('home'); return; }
  const v = E.publicView(G, 0);
  const myTurn = v.active === 0 && !v.over;
  const canAct = myTurn && !S.busy;

  const logHTML = v.log.map((l) => `<li data-k="${l.kind}">${l.text}</li>`).join('');

  const hotAttack = S.mode === 'attack';
  const guard = v.op.mons.find((m) => m && m.guard);
  const opSlots = v.op.mons.map((m, i) => {
    const hot = hotAttack && (m ? (!guard || m.guard) : false);
    return slotHTML(m, i, 'op', hot);
  }).join('');
  const mySlots = v.me.mons.map((m, i) => slotHTML(m, i, 'me', S.mode === 'tribute' && !!m)).join('');
  const opSp = v.op.spells.map((s, i) => spellSlotHTML(s, i, 'op', false)).join('');
  const mySp = v.me.spells.map((s, i) => spellSlotHTML(s, i, 'me', false)).join('');

  const extraLeft = v.me.extra.length;
  const awakenable = v.me.extra.filter((id) => E.canAwaken(G, G.players[0], id)).length;

  const hand = v.me.hand.map((h) => {
    const c = CARDS[h.id];
    const usable = canAct && (c.k === 'M' ? E.canSummon(G, G.players[0], h.id) : true);
    return cardHTML(c, {
      uid: h.uid,
      on: S.sel && S.sel.type === 'hand' && S.sel.uid === h.uid,
      dim: canAct && !usable,
    });
  }).join('');

  $('#scr-duel').innerHTML = `
    <div class="duelbar">
      <span class="turn">第 ${Math.ceil(v.turn / 2)} 回合</span>
      <span class="ph">${phaseText(G)}</span>
      <span class="sp">
        ${canAct && v.phase === 'main' && extraLeft ? `<button class="btn sm" data-act="extra">觉醒 ${awakenable}/${extraLeft}</button>` : ''}
        ${canAct && v.phase === 'main' ? '<button class="btn sm" data-act="battle">战斗阶段</button>' : ''}
        ${canAct ? '<button class="btn sm pri" data-act="end">结束回合</button>' : ''}
      </span>
    </div>

    <div class="side">
      <div class="pinfo">
        <span class="who">对手</span>
        ${lpBar(v.op)}
        <span class="meta"><span>手 ${v.op.hand}</span><span>组 ${v.op.deck}</span></span>
        ${bondsDots(v.op.bonds)}
      </div>
      <div class="field">${opSp}</div>
      <div class="field">${opSlots}</div>
    </div>

    <div class="mid"><ul class="log" id="log">${logHTML}</ul></div>

    <div class="side">
      <div class="field">${mySlots}</div>
      <div class="field">${mySp}</div>
      <div class="pinfo">
        <span class="who">你</span>
        ${lpBar(v.me)}
        <span class="meta"><span>手 ${v.me.hand.length}</span><span>组 ${v.me.deck}</span></span>
        ${bondsDots(v.me.bonds)}
      </div>
    </div>

    <div class="acts">
      ${S.mode === 'attack'
        ? '<button class="btn" data-act="direct">直接攻击</button><button class="btn ghost" data-act="cancel">取消</button>'
        : '<span class="note">' + (myTurn ? '点手牌出牌，点场上的怪兽看它能做什么。' : (v.over ? '对决结束。' : '对手正在想牌。')) + '</span>'}
    </div>

    <div class="hand ${hand ? '' : 'empty-h'}">${hand || '手牌空了'}</div>
  `;

  const log = $('#log');
  if (log) log.scrollTop = log.scrollHeight;
  renderActbar();
  if (v.over && !S.result) showResult(v);
}

function renderActbar() {
  const bar = $('#actbar');
  const G = S.G;
  if (!bar) return;
  if (!G || S.view !== 'duel' || !S.sel || S.mode === 'attack' || S.mode === 'extra') {
    bar.classList.remove('on');
    bar.innerHTML = '';
    return;
  }
  const p = G.players[0];
  const isHand = S.sel.type === 'hand';
  const h = isHand ? p.hand.find((x) => x.uid === S.sel.uid) : null;
  const c = isHand ? CARDS[h && h.id] : null;
  if (isHand && !c) { bar.classList.remove('on'); return; }
  if (!isHand) {
    const m = p.mons.find((x) => x && x.uid === S.sel.uid);
    if (!m) { bar.classList.remove('on'); return; }
    const d = CARDS[m.id];
    const canFight = G.phase === 'battle' && E.canAttack(G, p, m) && G.active === 0;
    bar.innerHTML = `
      <div class="ah"><b>${d.n}</b><span class="note">${d.atk} / ${d.def}</span>
        <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
      <div class="ab">
        ${canFight ? '<button class="btn pri" data-act="pick-target">攻击</button>' : ''}
        ${G.phase === 'main' && G.active === 0 ? '<button class="btn" data-act="flip">切换表示</button>' : ''}
        <button class="btn ghost" data-act="read">效果</button>
      </div>
      <div class="hint">${m.set ? '盖放的怪兽：翻开后按守备表示。' : (m.pos === 'def' ? '守备表示，不会受到战斗伤害（对方打过来时反过来算）。' : (canFight ? '点它再选目标；对方有守备的「嘲讽」怪兽时必须先打它。' : '本回合它已经攻击过了，或者现在不是战斗阶段。'))}</div>`;
    bar.classList.add('on');
    return;
  }

  const opts = [];
  if (c.k === 'M') {
    const canS = E.canSummon(G, p, c.id);
    const need = E.tributeNeed(c.id);
    if (canS) opts.push('<button class="btn pri" data-act="summon">召唤</button>');
    if (need === 0) opts.push('<button class="btn" data-act="setmon">里侧守备</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  } else if (c.k === 'S') {
    opts.push('<button class="btn pri" data-act="spell">发动</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  } else if (c.k === 'T') {
    opts.push('<button class="btn pri" data-act="trap">盖放</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  }
  const hint = c.k === 'M'
    ? (E.canSummon(G, p, c.id)
      ? `等级 ${c.lv}：${E.tributeNeed(c.id) ? '需要 ' + E.tributeNeed(c.id) + ' 只祭品' : '可以直接召唤'}`
      : (p.normalUsed ? '本回合已经通常召唤过了' : '现在不能召唤它'))
    : (c.k === 'S' ? '魔法只能在自己的主要阶段从手牌发动；永续与装备留在场上。' : '陷阱盖放后，对方满足条件时自动发动。');
  bar.innerHTML = `
    <div class="ah"><b>${c.n}</b><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}</span>
      <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
    <div class="ab">${opts.join('')}</div>
    <div class="hint">${hint}</div>`;
  bar.classList.add('on');
}

function showResult(v) {
  S.result = true;
  const win = v.winner === 0;
  const gain = win ? 120 : 40;
  S.save.silver += gain;
  if (win) S.save.wins++; else S.save.losses++;
  saveSave(S.save);
  silverBar();
  const rounds = Math.ceil(v.turn / 2);
  openModal(`
    <div class="mtitle"><h3>${win ? '你赢下了这场对决' : '命轮断了'}</h3></div>
    <p class="sub">${rounds} 回合 · ${win ? '对手交出一张牌' : '你从此不再确定一张牌'}</p>
    <p class="note">${win
      ? '输的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡。'
      : '命轮值归零不是死，是「不再确定自己是谁」。再摆一次就好——弥萨格的守密人从不轻易认输。'}</p>
    <div class="row" style="margin-top:10px"><span class="bond">银芯 +${gain}</span>
      <span class="note">累计 ${S.save.wins} 胜 ${S.save.losses} 负</span></div>
    <div class="mb">
      <button class="btn ghost" data-modal="close">留在这</button>
      <button class="btn" data-modal="again">再打一场</button>
      <button class="btn pri" data-modal="home">回首页</button>
    </div>
  `);
}

function openModal(html) {
  $('#modal').innerHTML = html;
  $('#mask').classList.add('on');
}
function closeModal() {
  $('#mask').classList.remove('on');
  $('#modal').innerHTML = '';
}

// ------------------------------------------------------------------ AI 回合
async function runAI() {
  const G = S.G;
  S.busy = true;
  renderDuel();
  let steps = 0;
  while (!G.over && G.active === 1 && steps < 80) {
    steps++;
    const act = nextAction(G, 1, S.diff);
    if (!act) break;
    if (act.t === 'awaken') E.awaken(G, 1, act.id);
    else if (act.t === 'spell') E.activateSpell(G, 1, act.uid);
    else if (act.t === 'summon') E.summon(G, 1, act.uid, act.tribs);
    else if (act.t === 'setMon') E.setMonster(G, 1, act.uid);
    else if (act.t === 'trap') E.setTrap(G, 1, act.uid);
    else if (act.t === 'pos') E.changePos(G, 1, act.uid);
    else if (act.t === 'battle') E.toBattle(G, 1);
    else if (act.t === 'attack') E.attack(G, 1, act.uid, act.target);
    else if (act.t === 'end') { E.endTurn(G); break; }
    renderDuel();
    await sleep(steps > 24 ? 90 : 460);
  }
  // 兜底：AI 要是想不出动作，也别把回合卡死在那里
  if (!G.over && G.active === 1) E.endTurn(G);
  S.busy = false;
  S.sel = null; S.mode = 'idle';
  renderDuel();
}

function playerEndTurn() {
  if (!S.G || S.busy || S.G.active !== 0) return;
  S.sel = null; S.mode = 'idle';
  E.endTurn(S.G);
  renderDuel();
  if (!S.G.over && S.G.active === 1) runAI();
}

// ------------------------------------------------------------------ 操作
function doSummon(uid, tribs) {
  const r = E.summon(S.G, 0, uid, tribs);
  if (!r.ok) { toast(r.err); return false; }
  S.sel = null; S.mode = 'idle'; S.tribute = [];
  renderDuel();
  return true;
}

function onHandAct(action) {
  const G = S.G;
  if (!G || !S.sel) return;
  const uid = S.sel.uid;
  const p = G.players[0];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return;
  const c = CARDS[h.id];
  if (action === 'summon') {
    const need = E.tributeNeed(c.id);
    if (!need) { doSummon(uid, []); return; }
    S.mode = 'tribute';
    S.tribute = [];
    S.pendingSummon = { uid, need };
    renderDuel();
    const bar = $('#actbar');
    bar.innerHTML = `<div class="ah"><b>召唤「${c.n}」</b><span class="note">等级 ${c.lv}</span>
      <button class="btn sm ghost x" data-act="cancel">取消</button></div>
      <div class="hint">需要 ${need} 只祭品：点击自己场上的怪兽（会送进墓地）。已选 ${S.tribute.length}/${need}。</div>`;
    bar.classList.add('on');
    return;
  }
  if (action === 'setmon') {
    const r = E.setMonster(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
  if (action === 'spell') {
    const r = E.activateSpell(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
  if (action === 'trap') {
    const r = E.setTrap(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
}

function onSlotClick(side, idx, isSpell) {
  const G = S.G;
  if (!G || S.busy) return;
  if (isSpell) return;
  if (side === 'me') {
    if (S.mode === 'tribute') {
      const m = G.players[0].mons[idx];
      if (!m) return;
      if (S.tribute.indexOf(m.uid) >= 0) return;
      S.tribute.push(m.uid);
      const need = (S.pendingSummon && S.pendingSummon.need) || 1;
      if (S.tribute.length >= need) {
        const uid = S.pendingSummon.uid;
        S.pendingSummon = null;
        doSummon(uid, S.tribute);
        return;
      }
      renderDuel();
      return;
    }
    if (S.mode === 'attack') return;
    const m = G.players[0].mons[idx];
    if (!m) return;
    S.sel = { type: 'mon', uid: m.uid };
    S.mode = 'act';
    renderActbar();
    return;
  }
  // 点对方场地
  if (S.mode === 'attack') {
    const t = G.players[1].mons[idx];
    if (!t) return;
    const r = E.attack(G, 0, S.sel.uid, t.uid);
    if (!r.ok) return toast(r.err);
    S.mode = 'idle'; S.sel = null;
    renderDuel();
    if (!G.over && G.active === 1) runAI();
    return;
  }
  const m = G.players[1].mons[idx];
  if (m && !m.set) {
    const c = CARDS[m.id];
    openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r]}</span>
      <button class="btn sm ghost x" data-modal="close">关闭</button></div>
      <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ''}</p>
      <p class="note">${c.text}</p>`);
  }
}

function onExtra() {
  const G = S.G;
  const p = G.players[0];
  const list = p.extra.map((id) => {
    const ok = E.canAwaken(G, p, id);
    const c = CARDS[id];
    const mats = c.mat ? c.mat.join(' ＋ ') : '任意 2 只界域不同的怪兽';
    return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
      ${cardHTML(c, { mini: true, dim: !ok })}
      <div style="min-width:0">
        <b style="font-size:12.5px">${c.n}</b>
        <p class="note" style="margin:2px 0">${c.atk} / ${c.def} · 素材：${mats}</p>
      </div>
      <button class="btn sm ${ok ? 'pri' : ''}" style="margin-left:auto" data-awaken="${id}" ${ok ? '' : 'disabled'}>觉醒</button>
    </div>`;
  }).join('');
  openModal(`<div class="mtitle"><h3>额外卡组</h3><span class="note">不占通常召唤</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">觉醒召唤：把素材送进墓地，从额外卡组特召。素材必须已经在场上。</p>
    ${list || '<p class="empty">额外卡组是空的。</p>'}`);
}

// ------------------------------------------------------------------ 卡包
function drawFromPack(pack) {
  const pool = pack.cards.map((id) => CARDS[id]).filter(Boolean);
  const byRar = {};
  for (const c of pool) (byRar[c.rar || 'N'] = byRar[c.rar || 'N'] || []).push(c.id);
  const out = [];
  const pick = (list) => {
    const cands = [];
    for (const r of list) for (const id of byRar[r] || []) cands.push(id);
    if (!cands.length) return null;
    const left = cands.filter((id) => out.indexOf(id) < 0);
    const arr = left.length ? left : cands;
    return arr[Math.floor(Math.random() * arr.length)];
  };
  out.push(pick(['GR', 'UR', 'SR']));
  const roll = () => {
    const r = Math.random();
    return r < 0.45 ? 'N' : r < 0.80 ? 'R' : r < 0.96 ? 'SR' : r < 0.99 ? 'UR' : 'GR';
  };
  for (let i = 0; i < 4; i++) {
    let id = null;
    for (let t = 0; t < 8 && !id; t++) id = pick([roll()]);
    out.push(id || pick(['N', 'R']));
  }
  return out;
}

function renderPacks() {
  const packs = PACKS.map((pk) => {
    const have = pk.cards.filter((id) => S.save.coll[id]).length;
    const total = pk.cards.length;
    const pct = Math.round((have / total) * 100);
    const rar = {};
    for (const id of pk.cards) { const c = CARDS[id]; if (c) rar[c.rar] = (rar[c.rar] || 0) + 1; }
    const rarTxt = RAR_ORDER.filter((r) => rar[r]).map((r) => `${r}×${rar[r]}`).join(' · ');
    return `<div class="pack" data-pack="${pk.id}">
      <div><div class="pn">${pk.n}</div><div class="pe">${pk.en}</div></div>
      <div class="ps">${pk.sub}</div>
      <div class="pd">${pk.desc}</div>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <div class="pf"><span style="white-space:nowrap">收录 ${have}/${total}</span>
        <button class="btn sm pri" data-buy="${pk.id}">开包 ${PACK_PRICE}</button>
      </div>
      <div class="note" style="font-size:10px;margin-top:-2px">${rarTxt}</div>
      <button class="btn sm ghost" data-toggle="${pk.id}" style="align-self:flex-start">看这包里有什么</button>
      <div class="plist">${pk.cards.map((id) => {
        const c = CARDS[id];
        return `<span style="color:var(--dim)">${c.n}<span style="color:var(--dim2)">（${c.rar}）</span></span>`;
      }).join('、')}</div>
    </div>`;
  }).join('');

  $('#scr-packs').innerHTML = `
    <div class="sec-h"><h2>卡包</h2><span class="r">银芯 ${S.save.silver} · 一包 ${PACK_PRICE}</span></div>
    <p class="note" style="margin:0 0 10px">每包 5 张，第一张保底 SR 以上。开出来的卡进收藏，不影响预组卡组——对决用的是整套预组，收藏是「我还记得这些人」。</p>
    <div class="packs">${packs}</div>
    <p class="note" style="margin-top:12px">已收录 ${Object.keys(S.save.coll).length} / ${Object.keys(CARDS).length} 种。</p>
  `;
}

function buyPack(packId) {
  if (S.save.silver < PACK_PRICE) return toast(`银芯不够，还差 ${PACK_PRICE - S.save.silver}`);
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  S.save.silver -= PACK_PRICE;
  S.save.opened++;
  const ids = drawFromPack(pk);
  for (const id of ids) if (id) S.save.coll[id] = (S.save.coll[id] || 0) + 1;
  saveSave(S.save);
  silverBar();
  renderPacks();

  const cards = ids.map((id) => CARDS[id]).filter(Boolean);
  openModal(`<div class="mtitle"><h3>${pk.n}</h3><span class="note">${pk.sub}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">第 ${S.save.opened} 包 · 银芯 -${PACK_PRICE}</p>
    <div class="pull">${cards.map((c) => `<div>${cardHTML(c, {})}<div class="rar" style="color:var(--rc)">${c.rar}</div></div>`).join('')}</div>
    <div class="mb"><button class="btn ghost" data-modal="close">收下</button>
      <button class="btn pri" data-buy2="${pk.id}">再开一包</button></div>`);
}

// ------------------------------------------------------------------ 卡表
function renderCodex() {
  const kinds = [['all', '全部'], ['M', '怪兽'], ['S', '魔法'], ['T', '陷阱'], ['E', '觉醒体']];
  const realms = [['all', '全界域'], ['chaos', '混沌'], ['caro', '血肉'], ['aqua', '深海'], ['ultra', '超维'], ['any', '无界']];
  const list = Object.keys(CARDS).map((id) => CARDS[id]).filter((c) => {
    if (S.codex.k !== 'all' && c.k !== S.codex.k) return false;
    if (S.codex.r !== 'all' && (c.r || 'any') !== S.codex.r) return false;
    return true;
  });
  const order = { M: 0, S: 1, T: 2, E: 3 };
  list.sort((a, b) => (order[a.k] - order[b.k]) || (a.r || '').localeCompare(b.r || '') || (b.atk || 0) - (a.atk || 0));

  $('#scr-codex').innerHTML = `
    <div class="sec-h"><h2>卡表</h2><span class="r">${list.length} / ${Object.keys(CARDS).length} 张</span></div>
    <div class="filters">
      ${kinds.map(([k, n]) => `<button class="chip ${S.codex.k === k ? 'on' : ''}" data-ck="${k}">${n}</button>`).join('')}
    </div>
    <div class="filters">
      ${realms.map(([r, n]) => `<button class="chip ${S.codex.r === r ? 'on' : ''}" data-cr="${r}" data-r="${r}">${n}</button>`).join('')}
    </div>
    <div class="grid-cards">
      ${list.map((c) => `<div>${cardHTML(c, {})}<div style="text-align:center;font-size:9px;color:var(--dim2);margin-top:2px">${c.rar}</div></div>`).join('')}
    </div>
    <p class="note" style="margin-top:12px">点一张看完整效果。</p>
  `;
}

// ------------------------------------------------------------------ 世界观
function renderLore() {
  const realms = LORE.realms.map((r) => `<div class="realm" style="--rc:${r.color}">
    <div class="rn">${r.n}<span>${r.en}</span></div>
    <div class="rm2">${r.motto}</div>
    <div class="rd">${r.desc}</div>
    <div class="rs">打法：${r.style}</div>
  </div>`).join('');

  const chapters = LORE.chapters.map((c) => `<div class="chap">
    <h2>${c.t}</h2><div class="en">${c.sub}</div>
    <div class="q">「${c.quote}」</div>
    ${c.ps.map((p) => `<p>${p}</p>`).join('')}
  </div>`).join('');

  const terms = LORE.terms.map((t) => `<div class="term"><b>${t.n}</b><p>${t.d}</p></div>`).join('');

  $('#scr-lore').innerHTML = `<div class="lore">
    <p class="kicker" style="font-size:10px;letter-spacing:.3em;color:var(--dim2)">SETTING</p>
    <h1>忘却前夜 · 命轮对决</h1>
    <p class="intro">${LORE.intro}</p>
    <div class="realms">${realms}</div>
    ${chapters}
    <div class="sec-h"><h2>名词</h2><span class="r">照本作的口径</span></div>
    <div class="terms">${terms}</div>
    <p class="note" style="margin-top:14px">术语沿用原作，卡牌规则与「命轮对决」这套玩法是本作私设。卡面头像来自游戏原作素材，仅用于同人。</p>
  </div>`;
}

// ------------------------------------------------------------------ 规则
function showHowTo() {
  openModal(`<div class="mtitle"><h3>怎么打</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">目标是先把对方的命轮值打到 0。双方各 8000 点起手。</p>
    <ul class="tips">
      <li><b>场地</b>：怪兽 3 格、魔法·陷阱 3 格，卡组 30 张，起手 5 张。先手第一回合不抽牌。</li>
      <li><b>召唤</b>：每回合 1 次。等级 1–4 直接出，5–6 需要 1 只祭品，7 以上需要 2 只。祭品送墓。</li>
      <li><b>盖放</b>：怪兽可以里侧守备（等级 5 以上不行）；陷阱从手牌盖到魔陷区，盖放当回合不能发动。</li>
      <li><b>战斗</b>：攻击表示互殴，输的一方破坏、差值打脸；打守备怪兽时超过守备力就破坏它，没有贯穿就没有伤害；场上没有怪兽才能直接攻击。</li>
      <li><b>嘲讽</b>：带「守备时对方不能攻击其他怪兽」的怪兽挡在前面时，必须先打它。</li>
      <li><b>觉醒召唤</b>：额外卡组的觉醒体，把场上指定的两只素材送墓就能特召，<b>不占通常召唤</b>。</li>
      <li><b>陷阱</b>：本作的陷阱是「自动迎击」——满足条件就发动，不用你宣言。所以盖牌的顺序要考虑对手会先干什么。</li>
      <li><b>羁绊</b>：卡组里同时有指定角色就会在开局触发，加攻、加血、多抽牌。配队比单卡重要。</li>
    </ul>
    <div class="mb"><button class="btn pri" data-modal="close">知道了</button></div>`);
}

function readCard(id) {
  const c = CARDS[id];
  if (!c) return;
  const extra = c.k === 'E' ? `<p class="note">素材：${c.mat ? c.mat.join(' ＋ ') : '自己场上 2 只界域不同的怪兽'}</p>` : '';
  openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r} · ${c.rar}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '')}</p>
    ${extra}
    <p class="note" style="font-size:13px;line-height:1.9">${c.text}</p>`);
}

// ------------------------------------------------------------------ 事件
function bind() {
  document.addEventListener('click', (e) => {
    const gc = e.target.closest('.grid-cards .card');
    if (gc && gc.dataset.id) { readCard(gc.dataset.id); return; }
    const t = e.target.closest('[data-act],[data-deck],[data-buy],[data-buy2],[data-toggle],[data-modal],[data-awaken],[data-ck],[data-cr],[data-d]');
    if (!t) {
      // 点空白处收起操作条
      if (e.target.closest('#scr-duel') && !e.target.closest('.slot') && !e.target.closest('.card')) {
        S.sel = null; if (S.mode === 'act') S.mode = 'idle';
        renderActbar();
      }
      return;
    }

    if (t.dataset.deck) {
      S.deckId = t.dataset.deck;
      S.save.deck = S.deckId; saveSave(S.save);
      renderHome();
      return;
    }
    if (t.dataset.d) {
      S.diff = t.dataset.d; S.save.diff = S.diff; saveSave(S.save);
      $$('#diff button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.diff));
      return;
    }
    if (t.dataset.modal) {
      const a = t.dataset.modal;
      if (a === 'close') closeModal();
      if (a === 'home') { closeModal(); show('home'); }
      if (a === 'again') { closeModal(); startDuel(); }
      return;
    }
    if (t.dataset.buy) { buyPack(t.dataset.buy); return; }
    if (t.dataset.buy2) { closeModal(); buyPack(t.dataset.buy2); return; }
    if (t.dataset.toggle) {
      const box = t.closest('.pack');
      if (box) box.classList.toggle('open');
      return;
    }
    if (t.dataset.awaken) {
      const r = E.awaken(S.G, 0, t.dataset.awaken);
      if (!r.ok) return toast(r.err);
      closeModal();
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (t.dataset.ck) { S.codex.k = t.dataset.ck; renderCodex(); return; }
    if (t.dataset.cr) { S.codex.r = t.dataset.cr; renderCodex(); return; }
    if (t.dataset.id && t.closest('.grid-cards')) { readCard(t.dataset.id); return; }

    const act = t.dataset.act;
    if (act === 'start') return startDuel();
    if (act === 'howto') return showHowTo();
    if (act === 'go-packs') return show('packs');
    if (act === 'go-codex') return show('codex');
    if (act === 'go-lore') return show('lore');
    if (act === 'end') return playerEndTurn();
    if (act === 'battle') {
      const r = E.toBattle(S.G, 0);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (act === 'extra') return onExtra();
    if (act === 'cancel') {
      S.sel = null; S.mode = 'idle'; S.tribute = [];
      renderDuel();
      return;
    }
    if (act === 'pick-target') {
      S.mode = 'attack';
      renderDuel();
      return;
    }
    if (act === 'direct') {
      const r = E.attack(S.G, 0, S.sel.uid, null);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      if (!S.G.over && S.G.active === 1) runAI();
      return;
    }
    if (act === 'flip') {
      const r = E.changePos(S.G, 0, S.sel.uid);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (act === 'summon' || act === 'setmon' || act === 'spell' || act === 'trap') {
      return onHandAct(act);
    }
    if (act === 'read') {
      const c = S.sel && S.sel.type === 'hand'
        ? S.G.players[0].hand.find((x) => x.uid === S.sel.uid)
        : S.G.players[0].mons.find((x) => x && x.uid === S.sel.uid);
      if (c) readCard(c.id);
      return;
    }
  });

  // 手牌 / 场地
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.hand .card');
    if (card && S.G && !S.busy && S.G.active === 0 && !S.G.over) {
      S.sel = { type: 'hand', uid: Number(card.dataset.uid) };
      S.mode = 'act';
      renderDuel();
      return;
    }
    const slot = e.target.closest('.slot');
    if (slot && S.G && !S.busy) {
      const parts = slot.dataset.slot.split('-');
      const side = parts[0];
      const isSpell = parts[1] === 'sp';
      const idx = Number(parts[isSpell ? 2 : 1]);
      const mon = slot.querySelector('.card');
      if (mon && side === 'me' && !isSpell && S.mode !== 'tribute' && S.mode !== 'attack') {
        S.sel = { type: 'mon', uid: Number(mon.dataset.uid) };
        S.mode = 'act';
        renderDuel();
        return;
      }
      onSlotClick(side, idx, isSpell);
    }
  });

  $('#mask').addEventListener('click', (e) => {
    if (e.target.id === 'mask') closeModal();
  });
}

// ------------------------------------------------------------------ 启动
export function boot() {
  document.documentElement.style.setProperty('--sheet', `url("${FACES}")`);
  document.documentElement.style.setProperty('--backimg', `url("${BACK}")`);
  document.documentElement.style.setProperty('--sheet-size', `${ART.cols * 100}% ${ART.rows * 100}%`);
  S.deckId = S.save.deck && DECKS.some((d) => d.id === S.save.deck) ? S.save.deck : DECKS[0].id;
  S.diff = S.save.diff || 'normal';
  silverBar();
  bind();
  show('home');
}
