// 页面层：首页 / 对战 / 房间 / 卡包 / 卡表 / 世界观（游戏名：唤醒王：决斗链接）。
// 所有规则判断都走 engine.js，这里只负责「把状态画出来」和「把点击翻译成操作」。
//
// 三种对局共用同一块棋盘：
//   pve   人机（B 边由 ai.js 走）
//   local 同屏双人（一台设备轮流，棋盘跟着当前回合翻面）
//   net   好友房（房间码，双方各自重放同一串动作）
import { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART } from './gen.js';
import * as E from './engine.js';
import { nextAction } from './ai.js';
import * as net from './net.js';
import {
  loadSave, saveSave, freeLeft, ticketDayLeft, payPack, grantPveTicket, addRank, RULES, PVE_SILVER, PVE_LOSS_MIN_ROUNDS,
} from './store.js';
import { progress as rankProgress, DIFF_TXT, TIERS } from './tiers.js';
import { aiFor, foePick } from './rank.js';
import { NAMES } from './names.js';
import { walletGet, walletAdd, walletSpend, scTag } from '../silver.js';

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PACK_PRICE = RULES.PACK_PRICE;

const REALM_TXT = { chaos: '混沌', caro: '血肉', aqua: '深海', ultra: '超维', any: '无界' };
const KIND_TXT = { M: '怪兽', S: '魔法', T: '陷阱', E: '觉醒体' };
// 命轮代价只写在魔法·陷阱上（cost.lp）。卡面已经标了，卡表/编辑器/详情也带一句，
// 不然玩家只在「点开卡牌」的那一屏看到，列表里像是白板。
const costTag = (c) => {
  const lp = (c && c.cost && c.cost.lp) || 0;
  return lp ? ` · 代价 ${lp}` : '';
};
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
  bt: 'pve',        // pve | local | net
  side: 0,          // 我在哪一边（local 跟着回合走）
  seq: 0,           // 好友房动作序号
  ai: null,         // 本局人机档位 { lv, n, sloppy, pool }（随段位变强，见 duel/rank.js）
  foeName: '',      // 人机对手的名字（取自融灾榜单，见 names.js）
  foeDeck: '',      // 对手这套牌的名字（同一个名字永远同一套，见 nameDeck）
  room: null,       // { code, role, state, peerDeck }
  net: null,
  timers: [],
  mute: false,      // 音效开关（存档里 sfx=0 表示关）
  fxLp: null,       // 上一帧双方命轮值，用来飘伤害数字
  fxSeq: 0,         // 已经播过音效的日志序号
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
  if (id === 'room') renderRoom();
  if (id === 'packs') renderPacks();
  if (id === 'codex') renderCodex();
  if (id === 'lore') renderLore();
  if (id === 'build') renderBuild();
}

function silverBar() {
  const n = $('#silver');
  if (n) n.textContent = walletGet();
  const t = $('#tickets');
  if (t) t.textContent = S.save.tickets || 0;
}

// 现在轮到哪一边：同屏双人跟着回合走，其它两种固定
function SIDE() {
  if (!S.G) return 0;
  return S.bt === 'local' ? S.G.active : S.side;
}

// 名字直接写进 innerHTML，榜单里有人带尖括号（比如「<#R34>Aurora」），得转义
function escTxt(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 名字 → 牌组：同一个名字永远带同一套牌（换段位只是「打得更认真」，不会换牌）。
// 用名字的稳定哈希落位，所以不同名字的牌组天然分散在九套预组上。
function nameDeck(name) {
  let h = 2166136261;
  const t = String(name);
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return DECKS[h % DECKS.length].id;
}

// 按牌组把名字分好桶，开局先按难度定「这局该用哪套牌」，再从这套牌的名字里抽一个人
const NAMES_BY_DECK = (() => {
  const map = {};
  for (const d of DECKS) map[d.id] = [];
  for (const n of NAMES) {
    const id = nameDeck(n);
    if (map[id]) map[id].push(n);
  }
  return map;
})();

// 这个牌组的「主人」们；空桶就退回全名单（新加牌组时不至于没人）
function namesOfDeck(deckId) {
  const list = NAMES_BY_DECK[deckId];
  return list && list.length ? list : NAMES;
}

function pickName(deckId) {
  const list = namesOfDeck(deckId);
  if (!list.length) return '对手';
  return list[Math.floor(Math.random() * list.length)];
}

function nameOf(idx) {
  if (S.bt === 'local') return idx === 0 ? '甲' : '乙';
  if (S.bt === 'net') return idx === S.side ? '你' : '好友';
  if (idx === 0) return '你';
  return escTxt(S.foeName || '对手');
}

// 引擎日志是按「0 号视角」写的（你 / 对手），换到 1 号视角要翻过来
function logText(t, side) {
  if (side === 0) return t;
  return t.replace(/你/g, '\u0001').replace(/对手/g, '你').replace(/\u0001/g, '对手');
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
    // 场上的怪兽要显示「现在的」攻守（回合开始成长、光环、羁绊、装备都算进去），涨了标绿、被压了标红；
    // 以前一直画卡表上的原始数值，图鲁每回合 +200 在界面上看不出来
    const a = o.atk != null ? o.atk : c.atk, df = o.defv != null ? o.defv : c.def;
    const cl = (v, base) => (v > base ? ' class="up"' : (v < base ? ' class="down"' : ''));
    tail = `<div class="pt"><b${cl(a, c.atk)}>${a}</b><span>/</span><b${cl(df, c.def)}>${df}</b></div>`;
  } else {
    const t = { normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击', field: '场地' }[c.t] || '';
    const cost = c.cost && c.cost.lp ? ` · 代价 ${c.cost.lp}` : '';
    tail = `<div class="pt">${c.k === 'S' ? '魔法' : '陷阱'} · ${t}${cost}</div>`;
  }
  const lv = c.k === 'M' || c.k === 'E' ? `<span class="lv">${c.lv >= 8 ? '★8' : 'Lv' + c.lv}</span>` : '';
  return `<div class="${cls.join(' ')}" data-r="${realm}" data-k="${c.k || 'M'}" data-rar="${rb}" data-id="${c.id}"`
    + `${o.uid != null ? ` data-uid="${o.uid}"` : ''}>`
    + `<span class="rm"></span>`
    + `<div class="face" ${face}></div>`
    + `<span class="rb">${rb}</span>${lv}`
    + `<div class="ct"><b class="nm">${name}</b>${tail}</div>`
    + `${o.tag ? `<span class="tagp">${o.tag}</span>` : ''}`
    + `</div>`;
}

// ------------------------------------------------------------------ 首页
// 预组和自己组的牌在列表里平级：对战、人机、好友房都从这里取，
// 所以「自组卡组能打」不需要在别处再开一条分支。
function myDecks() { return (S.save && S.save.mine) || []; }
function allDecks() { return DECKS.concat(myDecks()); }
function isMyDeck(id) { return myDecks().some((d) => d.id === id); }
function deckById(id) {
  return DECKS.find((d) => d.id === id) || myDecks().find((d) => d.id === id) || DECKS[0];
}

function deckList(def) {
  const out = [];
  for (const p of def.cards) for (let i = 0; i < p[1]; i++) out.push(p[0]);
  return out;
}

function renderHome() {
  const decks = DECKS.map((d) => {
    const bonds = E.evalBonds(deckList(d));
    const total = d.cards.reduce((s, p) => s + p[1], 0);
    return `<div class="dwrap"><button class="deck ${d.id === S.deckId ? 'on' : ''}" data-deck="${d.id}" style="--rc:${
      (E.REALM[d.r] || E.REALM.any).c}">
      <div class="dh"><b>${d.n}</b><span class="rm">${(E.REALM[d.r] || E.REALM.any).n}</span></div>
      <div class="ds">${d.desc}</div>
      <div class="db">${bonds.map((b) => `<span class="bond">${b.n}</span>`).join('') || '<span class="bond" style="opacity:.5">无羁绊</span>'}</div>
      <div class="dm">主卡组 ${total} 张 · 额外 ${d.extra.length} 张 · 羁绊 ${bonds.length} 条</div>
    </button><button class="btn sm ghost dview" data-deckview="${d.id}">查看卡组内容</button></div>`;
  }).join('');

  // 自己组的牌：一套一行按钮（用 / 看 / 编 / 改名 / 复制 / 删），
  // 预组不提供这些——它们是「拿来就打的」，改了就没对照组了。
  const mine = myDecks();
  const mineHtml = mine.map((d) => {
    const total = d.cards.reduce((a, p) => a + p[1], 0);
    const bs = E.evalBonds(deckList(d));
    return `<div class="dwrap"><button class="deck ${d.id === S.deckId ? 'on' : ''}" data-deck="${d.id}" style="--rc:${
      (E.REALM[d.r] || E.REALM.any).c}">
      <div class="dh"><b>${d.n}</b><span class="rm">自组</span></div>
      <div class="ds">${d.desc || '自己组的一套牌。'}</div>
      <div class="db">${bs.map((b) => `<span class="bond">${b.n}</span>`).join('') || '<span class="bond" style="opacity:.5">无羁绊</span>'}</div>
      <div class="dm">主卡组 ${total} 张 · 额外 ${d.extra.length} 张 · 羁绊 ${bs.length} 条</div>
    </button><div class="brow">
      <button class="btn sm ghost" data-bview="${d.id}">查看</button>
      <button class="btn sm ghost" data-bedit="${d.id}">编辑</button>
      <button class="btn sm ghost" data-bren="${d.id}">改名</button>
      <button class="btn sm ghost" data-bcopy="${d.id}">复制</button>
      <button class="btn sm ghost" data-bdel="${d.id}">删除</button>
    </div></div>`;
  }).join('');

  const sel = deckById(S.deckId);
  const bonds = E.evalBonds(deckList(sel));
  const free = freeLeft(S.save);
  const tk = S.save.tickets || 0;
  const rk = rankProgress(S.save.rp);
  const ai = aiFor(S.diff, rk.idx);
  const stars = [0, 1, 2].map((i) => `<i class="${i < rk.stars ? 'on' : ''}">★</i>`).join('');

  $('#scr-home').innerHTML = `
    <div class="hero">
      <p class="kicker">FORGETTING EVE · DUEL OF THE WHEEL</p>
      <h1 class="longname">唤醒王：决斗链接</h1>
      <p class="lead">你是守密人，桌上摊着两套记忆。每一张卡都是一个<strong>你还记得的人</strong>：
        召唤她是承认她存在，把她当祭品是承认有更重要的东西。命轮值归零不是死，是<strong>不再确定自己是谁</strong>。</p>
      <div class="hr"></div>
    </div>

    <div class="sec-h"><h2>你的段位</h2><span class="r">${TIERS.length} 段 · 只靠人机对战计分</span></div>
    <div class="rankcard" style="--rc:${rk.tier.c}">
      <div class="rktop">
        <span class="rkb">${rk.idx + 1}</span>
        <span class="rkname">${rk.tier.n}<em>「${rk.tier.t}」</em></span>
        <span class="rksc">${rk.rp}<small>分</small></span>
      </div>
      <div class="rkbar"><i style="width:${rk.pct.toFixed(1)}%"></i></div>
      <div class="rkfoot">
        <span>${rk.next ? `距「${rk.next.n}」还差 <b>${rk.left}</b> 分` : '已经是最高段位——命轮由你来转'}</span>
        <span class="rkstars">${stars}</span>
      </div>
      <p class="note" style="margin:8px 0 0">下一局对手的档位：<b>Lv${ai.lv}／${ai.max}「${ai.n}」</b>。
        段位越高，对方越少打错牌——该召唤时会召唤、该盖的怪会盖、不会拿小的去撞大的；
        它还会挑一套偏向<b>克你这套</b>的预组。但两边命轮值永远是 8000，它不会靠多血赢你。
        对手是融灾榜单上的玩家名，一个人固定一套牌，同一个人换段位也不会换牌。
        ${S.save.bestStreak ? `你最长连胜过 ${S.save.bestStreak} 场。` : ''}</p>
    </div>

    <div class="sec-h"><h2>选一套卡组</h2><span class="r">预组 ${DECKS.length} 套 · 每套 40 张 + 觉醒体</span></div>
    <div class="decks">${decks}</div>

    <div class="sec-h"><h2>我的卡组</h2><span class="r">${mine.length} 套 · 40~50 张 / 同名最多 3 张 · 人机与好友房都能用</span></div>
    ${mine.length ? `<div class="decks">${mineHtml}</div>` : '<p class="note" style="margin:2px 0 8px">还没有自己组的牌。下面点「新建卡组」会打开编辑器：左边是全部卡池，右边是你这套牌（40~50 张）。</p>'}
    <div class="row" style="margin-top:6px">
      <button class="btn pri" data-bnew="1">＋ 新建卡组</button>
      ${mine.length ? '<button class="btn ghost" data-bedit="' + mine[0].id + '">编辑最近一套</button>' : ''}
    </div>

    <div class="row" style="margin-top:8px"><button class="btn sm" data-deckview="${sel.id}">查看「${sel.n}」的 ${sel.cards.reduce((a, p) => a + p[1], 0)} 张卡与觉醒体</button></div>
    ${sel.tips ? `<p class="note" style="margin:8px 0 0"><b style="color:var(--gold2)">打法提示</b>：${sel.tips}</p>` : ''}

    <div class="sec-h"><h2>这套牌的羁绊</h2><span class="r">${bonds.length} 条已触发</span></div>
    <div class="row" style="gap:6px">${bonds.map((b) => `<span class="bond" title="${b.text}">${b.n}</span>`).join('') || '<span class="note">这套牌凑不出羁绊——它只是三十张牌。</span>'}</div>
    <ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>

    <div class="sec-h"><h2>开始</h2><span class="r">人机可选难度</span></div>
    <div class="row">
      <div class="seg" id="diff">
        <button data-d="easy" class="${S.diff === 'easy' ? 'on' : ''}">轻松</button>
        <button data-d="normal" class="${S.diff === 'normal' ? 'on' : ''}">普通</button>
        <button data-d="hard" class="${S.diff === 'hard' ? 'on' : ''}">认真</button>
      </div>
      <button class="btn pri" data-act="start">与人机对决</button>
      <button class="btn ghost" data-act="howto">规则</button>
    </div>

    <div class="sec-h"><h2>好友对战</h2><span class="r">房间码 / 一台设备轮流</span></div>
    <div class="row">
      <button class="btn" data-act="room-create">创建房间</button>
      <button class="btn" data-act="room-join">加入房间</button>
      <button class="btn ghost" data-act="local-duel">同屏双人</button>
    </div>
    <p class="note" style="margin:6px 0 0">房间码对战靠公共中继同步，双方各自开着这一页即可；同屏双人不需要网络。</p>

    <div class="nav-tiles">
      <button class="tile" data-act="go-packs"><span class="ti">✦</span><span><span class="tn">卡包</span><br><span class="td">今日免费 ${free} 次 · 券 ${tk} 张 · ${Object.keys(S.save.coll).length} 种已收录</span></span></button>
      <button class="tile" data-act="go-codex"><span class="ti">▤</span><span><span class="tn">卡表</span><br><span class="td">${Object.keys(CARDS).length} 张 · 效果全文</span></span></button>
      <button class="tile" data-act="go-lore"><span class="ti">◈</span><span><span class="tn">世界观</span><br><span class="td">弥萨格、守密人与四界域</span></span></button>
    </div>
    <p class="note" style="margin-top:12px">战绩：${S.save.wins} 胜 ${S.save.losses} 负 · 已开 ${S.save.opened} 包。银芯是全站共用的钱包：打人机赢一场 +8 / +14 / +22（轻松 / 普通 / 认真），打满 4 回合输了也有一点辛苦费；
      每天免费开一包，打赢人机再送开包券（每天最多 ${RULES.TICKET_PER_DAY} 张）。</p>
  `;
}

// ------------------------------------------------------------------ 开局
function newGame(bt, side, mine, foe, seed) {
  clearTimers();
  S.bt = bt;
  S.side = side;
  S.seq = 0;
  S.busy = false;
  S.result = false;
  // 音效/飘字的比对基线必须跟着新一局归零：seq 是每局从头数的，
  // 留着上一局的大序号，新一局的日志全都「不新」，第二局就彻底没声音了。
  S.fxLp = null; S.fxSeq = 0; S.fxGrave = null;
  S.turnKey = null; S.acted = false;
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
  // 两边命轮值都是 8000（羁绊加成各算各的）：段位只影响对手「会不会打、拿什么牌」，不改血量
  S.G = E.createGame({ cards: mine.cards, extra: mine.extra }, { cards: foe.cards, extra: foe.extra }, { seed });
  show('duel');
  renderDuel();
}

// 对手牌组：按 rank.js 的对位表抽，而不是按「整体谁强」。
// 九套预组的整体胜率只差 44~52，但克制关系很硬（d5 打 d2 七成、d3 打 d5 只有三成），
// 所以只有「打你这套顺不顺手」才是真的难度旋钮。
function startDuel() {
  const mine = deckById(S.deckId);
  // 段位越高，人机档位越高：难度定起点，段位往上抬
  const rk = rankProgress(S.save.rp);
  S.ai = aiFor(S.diff, rk.idx);
  // 先定这局对手用哪套牌（段位越高越偏向克你的那套），再挑一个「这套牌的主人」
  const foeId = foePick(S.ai.pool, S.deckId, DECKS.map((d) => d.id));
  const foe = deckById(foeId) || mine;
  S.foeName = pickName(foe.id);
  // 彩蛋：抽到「校猫的私藏」时，坐下来的可能是做这套牌的人。
  // 米酒是脑缸组的战斗设计师，校猫的牌是他设计的 —— 他不打牌，他来看你怎么打。
  if (foe.id === 'd6' && Math.random() < 0.3) S.foeName = '米酒';
  S.foeDeck = foe.n;
  newGame('pve', 0, mine, foe, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  toast(`${S.foeName}（Lv${S.ai.lv}「${S.ai.n}」）带着「${foe.n}」坐下了`);
}

function startLocal() {
  const mine = deckById(S.deckId);
  const others = DECKS.filter((d) => d.id !== mine.id);
  const foe = others[Math.floor(Math.random() * others.length)];
  newGame('local', 0, mine, foe, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  toast('同屏双人：' + mine.n + '（甲）对阵 ' + foe.n + '（乙）');
}

function phaseText(G, side) {
  if (G.phase === 'battle') return '战斗阶段';
  return G.active === side ? '你的主要阶段' : (S.bt === 'pve' ? '对手的主要阶段' : '等好友出牌');
}

// ------------------------------------------------------------------ 音效与打击感
// 全部用 WebAudio 现场合成：边缘每个请求 1~2 秒，为了几声「咚」再拉几个 mp3 不值得。
// 浏览器要求先有一次用户手势，对决本来就是点进来的，所以这里惰性建上下文。
let AC = null;
function ac() {
  if (AC === null) {
    const C = window.AudioContext || window.webkitAudioContext;
    AC = C ? new C() : false;
  }
  if (!AC) return null;
  if (AC.state === 'suspended') AC.resume();
  return AC;
}

function tone(o) {
  if (S.mute) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + (o.delay || 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, o.to), t0 + o.d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.g || 0.14, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + o.d + 0.02);
}

function noise(o) {
  if (S.mute) return;
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime + (o.delay || 0);
  const len = Math.max(0.05, o.d || 0.2);
  const buf = a.createBuffer(1, Math.ceil(a.sampleRate * len), a.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const flt = a.createBiquadFilter();
  flt.type = o.type || 'lowpass';
  flt.frequency.setValueAtTime(o.f || 1200, t0);
  if (o.to) flt.frequency.exponentialRampToValueAtTime(Math.max(80, o.to), t0 + len);
  const g = a.createGain();
  g.gain.setValueAtTime(o.g || 0.12, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
  src.connect(flt).connect(g).connect(a.destination);
  src.start(t0);
}

const SFX = {
  summon() { tone({ f: 420, to: 760, d: 0.16, type: 'triangle', g: 0.12 }); tone({ f: 630, d: 0.2, type: 'sine', g: 0.07, delay: 0.07 }); },
  awaken() { [523, 659, 784, 1046].forEach((f, i) => tone({ f, d: 0.32, type: 'sine', g: 0.1, delay: i * 0.055 })); noise({ d: 0.35, f: 2400, to: 300, g: 0.07 }); },
  attack() { noise({ d: 0.12, f: 2600, to: 700, g: 0.1, type: 'highpass' }); tone({ f: 220, to: 90, d: 0.16, type: 'square', g: 0.06 }); },
  hit() { tone({ f: 150, to: 60, d: 0.18, type: 'square', g: 0.1 }); noise({ d: 0.16, f: 900, to: 200, g: 0.09 }); },
  destroy() { noise({ d: 0.4, f: 1800, to: 120, g: 0.12 }); tone({ f: 320, to: 70, d: 0.35, type: 'sawtooth', g: 0.06 }); },
  heal() { tone({ f: 660, d: 0.18, type: 'sine', g: 0.08 }); tone({ f: 990, d: 0.22, type: 'sine', g: 0.06, delay: 0.06 }); },
  trap() { tone({ f: 900, to: 300, d: 0.14, type: 'square', g: 0.05 }); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ f, d: 0.4, type: 'triangle', g: 0.1, delay: i * 0.1 })); },
  lose() { [440, 349, 262].forEach((f, i) => tone({ f, d: 0.45, type: 'sine', g: 0.1, delay: i * 0.13 })); },
};

function pulse(el, cls) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;          // 强制回流，连续两次同名动画才会重播
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 600);
}

function floatNum(n, mine, kind) {
  const bar = document.getElementById(mine ? 'lpMe' : 'lpOp');
  const host = bar || document.body;
  const r = host.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'float' + (kind === 'heal' ? ' heal' : '');
  el.textContent = (n > 0 ? '+' : '') + n;
  el.style.left = (r.left + r.width * 0.5) + 'px';
  el.style.top = (r.top + r.height * 0.5) + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), S.floatLife || 950);
}

// 每帧渲染后跑一次：血变了飘字，日志里新出现的条目出音效和冲击
function fxFrame(v) {
  const side = SIDE();
  const lps = [v.op.lp, v.me.lp];
  if (!S.fxLp) S.fxLp = lps;
  for (let i = 0; i < 2; i++) {
    const d = lps[i] - S.fxLp[i];
    if (d === 0) continue;
    const mine = i === 1;
    floatNum(d, mine, d > 0 ? 'heal' : 'dmg');
    if (d < 0) {
      pulse(document.getElementById(mine ? 'lpMe' : 'lpOp'), 'shake');
      SFX.hit();
    } else SFX.heal();
  }
  S.fxLp = lps;

  const fresh = (v.log || []).filter((e) => e.seq && e.seq > (S.fxSeq || 0));
  if (fresh.length) S.fxSeq = fresh[fresh.length - 1].seq;
  // 战斗与破坏的句式只写怪兽名、没有主语（「A」破坏了「B」），
  // 所以这两类只能看「这一帧谁的墓地在涨」——那是最靠得住的线索。
  const gravez = [v.op.grave, v.me.grave];
  if (!S.fxGrave) S.fxGrave = gravez;
  const dGrave = [gravez[0] - S.fxGrave[0], gravez[1] - S.fxGrave[1]];
  S.fxGrave = gravez;
  // 返回 1 = 自己那排（monsMe），0 = 对面那排（monsOp）
  const rowOf = (e) => {
    const t = e.text || '';
    // 日志是「0 号视角」写的：0 号永远是「你」。坐到 1 号位上（同屏二号、好友房作客）就得反过来
    if (t.indexOf('你') === 0) return side === 0 ? 1 : 0;
    if (t.indexOf('对手') === 0) return side === 1 ? 1 : 0;
    if (dGrave[1] > 0 && dGrave[0] <= 0) return 1;
    if (dGrave[0] > 0 && dGrave[1] <= 0) return 0;
    return v.active === side ? 1 : 0;   // 攻击方一般是当前回合的人
  };
  for (const e of fresh) {
    const row = document.getElementById(rowOf(e) ? 'monsMe' : 'monsOp');
    if (e.kind === 'summon') { SFX.summon(); pulse(row, 'cast'); }
    else if (e.kind === 'awaken') { SFX.awaken(); pulse(row, 'cast'); }
    else if (e.kind === 'battle') { SFX.attack(); pulse(row, 'lunge'); }
    else if (e.kind === 'grave') { SFX.destroy(); pulse(row, 'shatter'); }
    else if (e.kind === 'trap') SFX.trap();
  }
}

function lpBar(p, id) {
  const pct = Math.max(0, Math.min(100, (p.lp / p.lpMax) * 100));
  return `<div class="lp ${pct < 30 ? 'low' : ''}"${id ? ` id="${id}"` : ''}><i style="width:${pct}%"></i>`
    + `<span class="lpn">${Math.max(0, p.lp)} / ${p.lpMax}</span></div>`;
}

// 玩家身上的两种状态（中毒层数 / 屏障次数）：挂在命轮条后面一行小字
function stTags(pl) {
  let s = '';
  if (pl.psn > 0) s += `<span class="stt ps" title="中毒 ${pl.psn} 层：自己回合开始失去 ${pl.psn * 100} 点命轮值">毒 ${pl.psn}</span>`;
  if (pl.br > 0) s += `<span class="stt brt" title="屏障 ${pl.br} 层：抵挡 ${pl.br} 次伤害">盾 ${pl.br}</span>`;
  return s;
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
  // 新机制的场上面板：屏障 / 流血 / 反击 / 嘲讽都要看得见，
  // 不然玩家算不准「这一下打不打」，只能靠翻日志。
  const badges = [];
  if (m.br > 0) badges.push(`<i class="sf br" title="屏障 ${m.br} 层：抵挡 ${m.br} 次破坏或伤害">盾${m.br}</i>`);
  if (m.bld > 0) badges.push(`<i class="sf bd" title="流血 ${m.bld} 层：每回合攻击力 -${m.bld * 100}">血${m.bld}</i>`);
  if (m.psn > 0) badges.push(`<i class="sf ps" title="中毒 ${m.psn} 层：每回合攻守各 -${m.psn * 100}，攻守归零就化掉">毒${m.psn}</i>`);
  if (m.ctr > 0) badges.push(`<i class="sf ct" title="反击：被攻击后${m.ctrOnMon ? '削攻击者攻击力 ' : '对对方造成 '}${m.ctr} 点${m.ctrOnMon ? '' : '伤害'}">反${m.ctr}</i>`);
  if (m.taunt) badges.push('<i class="sf tt" title="嘲讽：对方必须优先攻击此卡">嘲</i>');
  else if (m.tauntCap > 0) badges.push(`<i class="sf tt" title="嘲讽（限高）：攻击力 ${m.tauntCap} 以下的怪兽必须先打它，更大的可以跨过去">嘲≤${m.tauntCap}</i>`);
  if (m.tauntOnce) badges.push('<i class="sf to" title="只拦一次：这回合拦过之后就能被绕开">一</i>');
  const sfx = badges.length ? `<div class="sfs">${badges.join('')}</div>` : '';
  return `<div class="slot" data-slot="${side}-${i}">`
    + cardHTML(c, { uid: m.uid, def: m.pos === 'def', tag, used: side === 'me' && m.canAtk === false, atk: m.atk, defv: m.def })
    + sfx + '</div>';
}

function spellSlotHTML(s, i, side, hot) {
  if (!s) return `<div class="slot sp empty ${hot ? 'hot' : ''}" data-slot="${side}-sp-${i}"></div>`;
  const c = s.id ? CARDS[s.id] : null;
  const card = c && !s.set
    ? cardHTML(c, { mini: true, tag: '发动' })
    : cardHTML({ id: 'back', n: '盖放', k: 'T', r: 'any', rar: 'N', lv: 0, atk: 0, def: 0 }, { mini: true, set: true });
  return `<div class="slot sp" data-slot="${side}-sp-${i}">${card}</div>`;
}

// 每回合开始时中间弹一下「你的回合 / 对方的回合」：不点掉，1.5 秒自己淡掉，
// 免得挡着看牌（手机屏上正中一块最容易挡住对面那排）。
function banner(text, mine) {
  const d = document.createElement('div');
  d.className = 'turnb' + (mine ? ' me' : ' op');
  d.textContent = text;
  document.body.appendChild(d);
  setTimeout(() => { if (d.parentNode) d.remove(); }, 1500);
}

function renderDuel() {
  const G = S.G;
  if (!G) { show('home'); return; }
  const side = SIDE();
  const v = E.publicView(G, side);
  const myTurn = v.active === side && !v.over;
  const canAct = myTurn && !S.busy;

  // 换人（或者新一局）才弹横幅，顺便把「这一步算不算已经进主要阶段」清掉
  const turnKey = G.turn + ':' + v.active + ':' + (v.over ? 1 : 0);
  if (S.turnKey !== turnKey) {
    S.turnKey = turnKey;
    S.acted = false;
    if (!v.over) banner(myTurn ? '你的回合' : (S.bt === 'pve' ? '对方的回合' : nameOf(v.active) + '的回合'), myTurn);
  }

  const logHTML = v.log.map((l) => `<li data-k="${l.kind}">${logText(l.text, side)}</li>`).join('');

  const hotAttack = S.mode === 'attack';
  // 必须优先攻击的那只：走引擎那一份判断，免得界面和规则各认一套。
  // 传当前选中的攻击者攻击力——嘲讽的「灵活版」（tauntMax）只拦得住比它小的怪。
  const selMon = S.sel ? G.players[side].mons.find((m) => m && m.uid === S.sel.uid) : null;
  const guard = E.mustHitFirst(G.players[1 - side], selMon ? E.atkOf(G, G.players[side], selMon) : null);
  const opSlots = v.op.mons.map((m, i) => {
    const hot = hotAttack && (m ? (!guard || m === guard) : false);
    return slotHTML(m, i, 'op', hot);
  }).join('');
  const mySlots = v.me.mons.map((m, i) => slotHTML(m, i, 'me', S.mode === 'tribute' && !!m)).join('');
  const opSp = v.op.spells.map((s, i) => spellSlotHTML(s, i, 'op', false)).join('');
  const mySp = v.me.spells.map((s, i) => spellSlotHTML(s, i, 'me', false)).join('');

  const extraLeft = v.me.extra.length;
  const awakenable = v.me.extra.filter((id) => (
    CARDS[id] && CARDS[id].direct ? E.canDirect(G, G.players[side], id) : E.canAwaken(G, G.players[side], id)
  )).length;

  const hand = v.me.hand.map((h) => {
    const c = CARDS[h.id];
    const usable = canAct && (c.k === 'M' ? E.canSummon(G, G.players[side], h.id) : true);
    return cardHTML(c, {
      uid: h.uid,
      on: S.sel && S.sel.type === 'hand' && S.sel.uid === h.uid,
      dim: canAct && !usable,
    });
  }).join('');

  const modeTag = S.bt === 'local' ? `<span class="btag">同屏 · 轮到${nameOf(G.active)}</span>`
    : (S.bt === 'net' ? `<span class="btag">房间 ${S.room ? S.room.code : '—'}</span>`
      : (S.ai ? `<span class="btag ai">Lv${S.ai.lv} · ${S.ai.n}</span>` : ''));

  const waitTxt = S.bt === 'net'
    ? (v.over ? '对决结束。' : '等好友出牌…')
    : (S.bt === 'local' ? '轮到' + nameOf(G.active) + '了。' : '对手正在想牌。');

  // 状态条：现在什么阶段、还能通常召唤几次、要不要去战斗阶段。
  // 阶段是界面推出来的——规则里没有独立的「准备阶段」，这一回合还没出过手就叫准备阶段，
  // 出过一次手就是主要阶段，点过「战斗阶段」才是战斗阶段。
  const callLeft = (v.me.normalUsed ? 0 : 1) + (v.me.normalExtra || 0);
  const stage = v.phase === 'battle' ? '战斗阶段' : (S.acted || S.busy ? '主要阶段' : '准备阶段');
  const atkReady = v.phase === 'main' && v.me.mons.some((m) => m && m.canAtk);
  const hintBits = [];
  if (myTurn) {
    hintBits.push(`<b>${stage}</b>`);
    hintBits.push(callLeft > 0 ? `通常召唤剩 ${callLeft} 次` : '<s>通常召唤已用完</s>');
    if (v.phase === 'battle') hintBits.push('点自己的怪兽，再点要打的目标');
    else if (atkReady) hintBits.push('需要攻击请进入战斗阶段');
    else if (v.me.mons.some(Boolean)) hintBits.push('场上的怪这回合已经打过，或本来就不能攻击');
    else hintBits.push('先铺一只怪兽再进战斗阶段');
  } else {
    hintBits.push(`<b>${S.bt === 'pve' ? '对方的回合' : nameOf(v.active) + '的回合'}</b>`);
    hintBits.push(v.over ? '对决结束' : (v.phase === 'battle' ? '对方在打人' : '等对方出牌'));
  }
  const hint = `<div class="dhint">${hintBits.join('<i>·</i>')}</div>`;

  $('#scr-duel').innerHTML = `
    <div class="duelbar">
      <span class="turn">第 ${Math.ceil(v.turn / 2)} 回合</span>
      <span class="ph">${phaseText(G, side)}</span>
      ${modeTag}
      <span class="sp">
        ${canAct && v.phase === 'main' && extraLeft ? `<button class="btn sm" data-act="extra">额外 ${awakenable}/${extraLeft}</button>` : ''}
        ${canAct && v.phase === 'main' ? '<button class="btn sm" data-act="battle">战斗阶段</button>' : ''}
        ${canAct ? '<button class="btn sm pri" data-act="end">结束回合</button>' : ''}
        <button class="btn sm ghost" data-act="sfx">${S.mute ? '音效关' : '音效开'}</button>
        ${S.bt === 'pve' ? '' : '<button class="btn sm ghost" data-act="leave">离开</button>'}
      </span>
    </div>

    ${hint}

    <div class="side op-side">
      <div class="pinfo">
        <span class="who">${nameOf(1 - side)}</span>
        ${S.bt === 'pve' && S.foeDeck ? `<i class="dv" title="对手这套牌">${S.foeDeck}</i>` : ''}
        ${lpBar(v.op, 'lpOp')}
        <span class="meta"><span>手 ${v.op.hand}</span><span>组 ${v.op.deck}</span>${stTags(v.op)}</span>
        ${bondsDots(v.op.bonds)}
      </div>
      <div class="field">${opSp}</div>
      <div class="field" id="monsOp">${opSlots}</div>
    </div>

    <div class="mid"><ul class="log" id="log">${logHTML}</ul>
      <div class="acts">
        ${S.mode === 'attack'
          ? attackBar(G, side, v, guard)
          : '<span class="note">' + (myTurn ? '点手牌出牌，点场上的怪兽看它能做什么。' : waitTxt) + '</span>'}
      </div>
    </div>

    <div class="side me-side">
      <div class="field" id="monsMe">${mySlots}</div>
      <div class="field">${mySp}</div>
      <div class="pinfo">
        <span class="who">${nameOf(side)}</span>
        ${lpBar(v.me, 'lpMe')}
        <span class="meta"><span>手 ${v.me.hand.length}</span><span>组 ${v.me.deck}</span>${stTags(v.me)}</span>
        ${bondsDots(v.me.bonds)}
      </div>
    </div>

    <div class="hand ${hand ? '' : 'empty-h'}">${hand || '手牌空了'}</div>
  `;

  const log = $('#log');
  if (log) log.scrollTop = log.scrollHeight;
  renderActbar();
  fxFrame(v);
  if (v.over && !S.result) showResult(v);
}

// 攻击模式的操作条：「直接攻击」只在真的能直接打的时候可点（对方场上没有怪兽，或者这只怪兽本回合带「可直接攻击」），
// 否则灰着并写明原因——以前按钮一直亮着、点了才弹一句提示，看起来像「按键没反应」。
function attackBar(G, side, v, guard) {
  const me = G.players[side];
  const m = S.sel ? me.mons.find((x) => x && x.uid === S.sel.uid) : null;
  const opMons = v.op.mons.filter(Boolean).length;
  const can = !!m && (opMons === 0 || m.direct);
  let tip;
  if (can) tip = opMons ? '这只怪兽本回合可以无视对方怪兽直接攻击。' : '对方场上没有怪兽，可以直接攻击。';
  else if (guard && E.isTaunt(guard)) tip = '对方的「' + (CARDS[guard.id] ? CARDS[guard.id].n : '嘲讽怪兽') + '」在嘲讽：不管攻守，必须先打它。';
  else if (guard) tip = '对方的「' + (CARDS[guard.id] ? CARDS[guard.id].n : '守护怪兽') + '」在守备守护：必须先点它来打。';
  else tip = '对方场上有怪兽：点高亮的对方怪兽选择攻击目标，打光了才能直接攻击。';
  return `<div class="atkbar"><span class="note">${tip}</span>`
    + `<button class="btn ${can ? 'pri' : ''}" data-act="direct" ${can ? '' : 'disabled title="现在不能直接攻击"'}>直接攻击</button>`
    + '<button class="btn ghost" data-act="cancel">取消</button></div>';
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
  const side = SIDE();
  const p = G.players[side];
  const isHand = S.sel.type === 'hand';
  const h = isHand ? p.hand.find((x) => x.uid === S.sel.uid) : null;
  const c = isHand ? CARDS[h && h.id] : null;
  if (isHand && !c) { bar.classList.remove('on'); return; }
  if (!isHand) {
    const m = p.mons.find((x) => x && x.uid === S.sel.uid);
    if (!m) { bar.classList.remove('on'); return; }
    const d = CARDS[m.id];
    const canFight = G.phase === 'battle' && E.canAttack(G, p, m) && G.active === side;
    bar.innerHTML = `
      <div class="ah"><b>${d.n}</b><span class="note">${d.atk} / ${d.def}</span>
        <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
      <div class="ab">
        ${canFight ? '<button class="btn pri" data-act="pick-target">攻击</button>' : ''}
        ${G.phase === 'main' && G.active === side && E.canAttack(G, p, m) ? '<button class="btn pri" data-act="battle">进入战斗阶段</button>' : ''}
        ${G.phase === 'main' && G.active === side ? '<button class="btn" data-act="flip">切换表示</button>' : ''}
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
    // 速攻（钥令那批）战斗阶段也能开；其余魔法只能在主要阶段。
    // 以前按钮一直亮着、点了才被引擎拒，看起来像「按键没反应」。
    const canNow = G.phase === 'main' || (c.t === 'quick' && G.phase === 'battle');
    opts.push(canNow
      ? '<button class="btn pri" data-act="spell">发动</button>'
      : '<button class="btn" disabled>不是发动时机</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  } else if (c.k === 'T') {
    opts.push('<button class="btn pri" data-act="trap">盖放</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  }
  const hint = c.k === 'M'
    ? (E.canSummon(G, p, c.id)
      ? `等级 ${c.lv}：${E.tributeNeed(c.id) ? '需要 ' + E.tributeNeed(c.id) + ' 只祭品' : '可以直接召唤'}`
      : (p.normalUsed ? '本回合已经通常召唤过了' : '现在不能召唤它'))
    : (c.k === 'S'
      ? (c.t === 'quick'
        ? '速攻魔法：主要阶段和战斗阶段都能发动；开完立刻结算。'
        : '魔法只能在自己的主要阶段从手牌发动；永续与装备留在场上。')
      : '陷阱盖放后，对方满足条件时自动发动。');
  bar.innerHTML = `
    <div class="ah"><b>${c.n}</b><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}${costTag(c)}</span>
      <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
    <div class="ab">${opts.join('')}</div>
    <div class="hint">${hint}</div>`;
  bar.classList.add('on');
}

// 结算里的段位条：本局 +多少分、现在第几段、离下一段还差多少，升段单独提一行
function rankBlock(rk) {
  const p = rk.progress;
  const stars = [0, 1, 2].map((i) => `<i class="${i < p.stars ? 'on' : ''}">★</i>`).join('');
  return `<div class="rankcard sm" style="--rc:${p.tier.c}">
    <div class="rktop">
      <span class="rkb">${p.idx + 1}</span>
      <span class="rkname">${p.tier.n}<em>「${p.tier.t}」</em></span>
      <span class="rksc">${p.rp}<small>分</small></span>
    </div>
    <div class="rkbar"><i style="width:${p.pct.toFixed(1)}%"></i></div>
    <div class="rkfoot">
      <span>段位 <b>+${rk.gain}</b>${rk.streak > 1 ? ` · 连胜 ${rk.streak}` : ''}</span>
      <span>${p.next ? `距「${p.next.n}」还差 <b>${p.left}</b> 分` : '已经是最高段位'}</span>
      <span class="rkstars">${stars}</span>
    </div>
    ${rk.up ? `<div class="rkup">升段 — ${p.tier.n}「${p.tier.t}」</div>` : ''}
  </div>`;
}

function showResult(v) {
  S.result = true;
  const side = SIDE();
  const win = v.winner === side;
  const rounds = Math.ceil(v.turn / 2);
  let reward = '';

  if (S.bt === 'pve') {
    const tier = PVE_SILVER[S.diff] || PVE_SILVER.normal;
    const gain = win ? tier[0] : (rounds >= PVE_LOSS_MIN_ROUNDS ? tier[1] : 0);
    if (gain > 0) walletAdd(gain);
    if (win) S.save.wins++; else S.save.losses++;
    let ticket = '';
    if (win) {
      const g = grantPveTicket(S.save);
      ticket = g.granted ? '<span class="bond">开包券 +1</span>' : '<span class="note">今天的券已经领满</span>';
    }
    // 段位分要和银芯一起落盘，再推一次云端档案（排行榜读的就是这份摘要）
    const rk = addRank(S.save, win, S.diff);
    saveSave(S.save);
    silverBar();
    pushCloud();
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${gain > 0 ? scTag('+' + gain) : '这局太短，没有银芯'}</span><span class="note">${DIFF_TXT[S.diff] || '普通'}难度 · 钱包 ${walletGet()}</span>${ticket}
      <span class="note">累计 ${S.save.wins} 胜 ${S.save.losses} 负</span></div>
      ${rankBlock(rk)}`;
  } else if (S.bt === 'local') {
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${nameOf(v.winner)} 赢下这场</span>
      <span class="note">同屏双人不计战绩</span></div>`;
  } else {
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${win ? '你赢了' : '好友赢了'}</span>
      <span class="note">房间对局不计战绩</span></div>`;
  }

  openModal(`
    <div class="mtitle"><h3>${win
      ? (S.bt === 'local' ? nameOf(v.winner) + '赢下了这场对决' : '你赢下了这场对决')
      : (S.bt === 'pve' && S.foeName ? escTxt(S.foeName) + ' 赢下了这场对决' : '命轮断了')}</h3></div>
    <p class="sub">${rounds} 回合 · ${win ? '对手交出一张牌' : '你从此不再确定一张牌'}</p>
    <p class="note">${win
      ? '输的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡。'
      : '命轮值归零不是死，是「不再确定自己是谁」。再摆一次就好——弥萨格的守密人从不轻易认输。'}</p>
    ${reward}
    <div class="mb">
      <button class="btn ghost" data-modal="close">留在这</button>
      ${S.bt === 'pve' ? '<button class="btn" data-modal="again">再打一场</button>' : ''}
      <button class="btn pri" data-modal="home">回首页</button>
    </div>
  `);
}

// 弹窗可以叠一层：卡池 / 拆包 / 卡组列表里点一张牌看详情，详情里点「返回」回到刚才那一屏
function openModal(html, push) {
  const m = $('#modal');
  if (push && $('#mask').classList.contains('on') && m.innerHTML) { (S.mstack || (S.mstack = [])).push(m.innerHTML); m.dataset.depth = S.mstack.length; }
  else { S.mstack = []; m.dataset.depth = 0; }
  m.innerHTML = html;
  m.scrollTop = 0;
  $('#mask').classList.add('on');
}
function backModal() {
  const prev = S.mstack && S.mstack.pop();
  if (prev == null) return closeModal();
  $('#modal').innerHTML = prev;
  $('#modal').dataset.depth = S.mstack.length;
}
function closeModal() {
  S.mstack = [];
  $('#mask').classList.remove('on');
  $('#modal').innerHTML = '';
}

// ------------------------------------------------------------------ 动作
// 玩家（或同屏的当前一方）的每个操作都走这里：好友房顺手把动作发给对面。
function act(a) {
  const G = S.G;
  if (!G) return { ok: false, err: '没有对局' };
  const r = E.applyAction(G, SIDE(), a);
  if (r.ok) S.acted = true;      // 出过一次手就不再是「准备阶段」
  if (r.ok && S.bt === 'net' && S.net) {
    S.seq += 1;
    S.net.send({ k: 'act', n: S.seq, a });
  }
  return r;
}

function aiAction(a) {
  if (a.t === 'awaken') return { t: 'awaken', id: a.id };
  if (a.t === 'direct') return { t: 'direct', id: a.id };
  if (a.t === 'summon') return { t: 'summon', uid: a.uid, tribs: a.tribs };
  if (a.t === 'setMon') return { t: 'setMon', uid: a.uid };
  if (a.t === 'trap') return { t: 'trap', uid: a.uid };
  if (a.t === 'pos') return { t: 'pos', uid: a.uid };
  if (a.t === 'battle') return { t: 'battle' };
  if (a.t === 'attack') return { t: 'attack', uid: a.uid, target: a.target };
  if (a.t === 'spell') return { t: 'spell', uid: a.uid };
  return { t: 'end' };
}

// ------------------------------------------------------------------ AI 回合
async function runAI() {
  const G = S.G;
  S.busy = true;
  renderDuel();
  let steps = 0;
  while (!G.over && G.active === 1 && steps < 80) {
    steps++;
    const a = nextAction(G, 1, S.bt === 'pve' && S.ai ? S.ai.sloppy : S.diff);
    if (!a) break;
    const r = E.applyAction(G, 1, aiAction(a));
    if (!r.ok && a.t !== 'end') break;
    renderDuel();
    await sleep(steps > 24 ? 90 : 460);
    if (a.t === 'end') break;
  }
  // 兜底：AI 要是想不出动作，也别把回合卡死在那里
  if (!G.over && G.active === 1) E.endTurn(G);
  S.busy = false;
  S.sel = null; S.mode = 'idle';
  renderDuel();
}

function afterTurnEnd() {
  const G = S.G;
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
  renderDuel();
  if (S.bt === 'pve' && !G.over && G.active === 1) runAI();
}

function playerEndTurn() {
  if (!S.G || S.busy || S.G.active !== SIDE()) return;
  const r = act({ t: 'end' });
  if (!r.ok) { toast(r.err); return; }
  afterTurnEnd();
}

// ------------------------------------------------------------------ 操作
function onHandAct(action) {
  const G = S.G;
  if (!G || !S.sel) return;
  const uid = S.sel.uid;
  const p = G.players[SIDE()];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return;
  const c = CARDS[h.id];
  if (action === 'summon') {
    const need = E.tributeNeed(c.id);
    if (!need) {
      const r = act({ t: 'summon', uid, tribs: [] });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
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
  const map = { setmon: 'setMon', spell: 'spell', trap: 'trap' };
  if (map[action]) {
    const r = act({ t: map[action], uid });
    if (!r.ok) return toast(r.err);
    S.sel = null; S.mode = 'idle'; renderDuel();
  }
}

function onSlotClick(side, idx, isSpell) {
  const G = S.G;
  if (!G || S.busy) return;
  if (isSpell) return;
  const me = SIDE();
  if (side === 'me') {
    if (S.mode === 'tribute') {
      const m = G.players[me].mons[idx];
      if (!m) return;
      if (S.tribute.indexOf(m.uid) >= 0) return;
      S.tribute.push(m.uid);
      const need = (S.pendingSummon && S.pendingSummon.need) || 1;
      if (S.tribute.length >= need) {
        const uid = S.pendingSummon.uid;
        S.pendingSummon = null;
        const r = act({ t: 'summon', uid, tribs: S.tribute });
        if (!r.ok) { toast(r.err); S.tribute = []; S.mode = 'idle'; renderDuel(); return; }
        S.tribute = []; S.mode = 'idle'; S.sel = null;
        renderDuel();
        return;
      }
      renderDuel();
      return;
    }
    if (S.mode === 'attack') return;
    const m = G.players[me].mons[idx];
    if (!m) return;
    S.sel = { type: 'mon', uid: m.uid };
    S.mode = 'act';
    renderActbar();
    return;
  }
  // 点对方场地
  if (S.mode === 'attack') {
    const tg = G.players[1 - me].mons[idx];
    if (!tg) return;
    const r = act({ t: 'attack', uid: S.sel.uid, target: tg.uid });
    if (!r.ok) return toast(r.err);
    S.mode = 'idle'; S.sel = null;
    renderDuel();
    return;
  }
  const m = G.players[1 - me].mons[idx];
  if (m && !m.set) {
    const c = CARDS[m.id];
    openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r]}${costTag(c)}</span>
      <button class="btn sm ghost x" data-modal="close">关闭</button></div>
      <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ''}</p>
      <p class="note">${c.text}</p>`);
  }
}

// 直接召唤的条件文字（引擎里是 cond 码，这里翻译成玩家看得懂的一句）
const DIRECT_TXT = {
  mons2: '自己场上有 2 只以上怪兽',
  mons3: '自己场上有 3 只怪兽',
  graveMon3: '自己墓地有 3 只以上怪兽',
  graveMagic3: '自己墓地有 3 张以上魔法卡',
  spell1: '自己场上有已发动的魔法·陷阱',
  lpHalf: '自己命轮值在半数以下',
};
function directText(d) {
  const c = d.direct || {};
  const why = c.cond ? (DIRECT_TXT[c.cond] || c.cond) : '';
  const cost = c.lp ? `献出 ${c.lp} 点命轮值` : '';
  return [why, cost].filter(Boolean).join(' ＋ ') || '无条件';
}

function onExtra() {
  const G = S.G;
  const me = SIDE();
  const p = G.players[me];
  const list = p.extra.map((id) => {
    const c = CARDS[id];
    if (c.direct) {
      const ok = E.canDirect(G, p, id);
      return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
        ${cardHTML(c, { mini: true, dim: !ok })}
        <div style="min-width:0">
          <b style="font-size:12.5px">${c.n}</b>
          <p class="note" style="margin:2px 0">${c.atk} / ${c.def} · 直接召唤：${directText(c)}</p>
        </div>
        <button class="btn sm ${ok ? 'pri' : ''}" style="margin-left:auto" data-direct="${id}" ${ok ? '' : 'disabled'}>直接召唤</button>
      </div>`;
    }
    const ok = E.canAwaken(G, p, id);
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
    <p class="sub">觉醒召唤：凑齐素材（至少一只在自己场上），两只都送进墓地。
    直接召唤：满足卡面条件或献出命轮值即可，每回合 1 次，当回合不能攻击。两种都不占通常召唤。</p>
    ${list || '<p class="empty">额外卡组是空的。</p>'}`);
}

// ------------------------------------------------------------------ 好友房
function clearTimers() {
  for (const t of S.timers) clearInterval(t);
  S.timers = [];
}

function dropRoom(silent) {
  clearTimers();
  if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 已经断了 */ } S.net.close(); }
  S.net = null;
  S.room = null;
  if (!silent) toast('已离开房间');
}

function onNetState(st) {
  if (!S.room) return;
  if (st === 'on' && S.room.state === 'wait') S.room.state = 'live';
  if (st === 'err') S.room.state = 'err';
  if (S.view === 'room') renderRoom();
}

function renderRoom() {
  const r = S.room;
  const el = $('#scr-room');
  if (!el) return;
  if (!r) {
    el.innerHTML = '<div class="empty">还没有房间。回首页点「创建房间」或「加入房间」。</div>';
    return;
  }
  const stTxt = r.state === 'err' ? '中继连不上（网络被挡了？可以先玩同屏双人）'
    : (r.state === 'wait' ? '正在连中继…' : (r.state === 'playing' ? '已开局' : '已连上中继，等好友回应…'));
  el.innerHTML = `
    <div class="sec-h"><h2>好友房</h2><span class="r">${r.role === 'a' ? '你是房主' : '你是加入方'}</span></div>
    <div class="room">
      <div class="rcode" id="rcode">${r.code}</div>
      <p class="note" style="text-align:center">把上面 5 位房间码发给好友，让他在「加入房间」里填。</p>
      <div class="row" style="justify-content:center">
        <button class="btn" data-act="room-copy">复制房间码</button>
        <button class="btn ghost" data-act="leave">离开房间</button>
      </div>
      <div class="rstate"><i class="dot ${r.state === 'err' ? 'bad' : (r.state === 'wait' ? '' : 'ok')}"></i>${stTxt}</div>
      <p class="note" style="text-align:center">你的卡组：${deckById(S.deckId).n}${r.peerDeck ? ' · 好友选了：' + (deckById(r.peerDeck.id) || r.peerDeck).n : ''}</p>
    </div>
    <p class="note" style="margin-top:14px">房间靠公共中继转发动作：双方各自开着这一页，你出的每一手都会发到房间里，对面按同一串动作重放，
      所以两边看到的必然是同一局。中继不通时先玩「同屏双人」。</p>
  `;
}

function createRoom() {
  dropRoom(true);
  const code = net.makeCode();
  S.room = { code, role: 'a', state: 'wait', peerDeck: '' };
  S.net = net.connect(code, onNetMsg, onNetState);
  S.net.send({ k: 'hi', role: 'a', deck: deckPayload(S.deckId) });
  S.timers.push(setInterval(() => {
    if (!S.net || !S.room || S.room.state === 'playing') return;
    S.net.send({ k: 'hi', role: 'a', deck: deckPayload(S.deckId) });
  }, 5000));
  show('room');
}

function joinRoom(code) {
  dropRoom(true);
  S.room = { code, role: 'b', state: 'wait', peerDeck: '' };
  S.net = net.connect(code, onNetMsg, onNetState);
  S.net.send({ k: 'hi', role: 'b', deck: deckPayload(S.deckId) });
  S.timers.push(setInterval(() => {
    if (!S.net || !S.room || S.room.state === 'playing') return;
    S.net.send({ k: 'hi', role: 'b', deck: deckPayload(S.deckId) });
  }, 5000));
  show('room');
}

function askJoin() {
  openModal(`<div class="mtitle"><h3>加入房间</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">填好友给你的 5 位房间码（字母数字，不含 I O 0 1）。</p>
    <input class="rin" id="rin" maxlength="5" placeholder="例如 K7M2Q" autocapitalize="characters" autocomplete="off">
    <div class="mb"><button class="btn ghost" data-modal="close">算了</button>
      <button class="btn pri" data-act="room-go">进房间</button></div>`);
  setTimeout(() => { const i = $('#rin'); if (i) i.focus(); }, 60);
}

// 好友房里传的是「卡组内容」而不是 id：自己组的牌对面没有，
// 只发个 id 过去，对面按 id 找不到就只能退回第一套预组。
function deckPayload(id) {
  const d = deckById(id);
  return { id: d.id, n: d.n, r: d.r, cards: d.cards, extra: d.extra || [] };
}

function deckFromPeer(v) {
  if (!v) return DECKS[0];
  if (typeof v === 'string') return deckById(v);        // 旧版本只发 id
  const local = DECKS.find((d) => d.id === v.id) || myDecks().find((d) => d.id === v.id);
  if (local) return local;
  const cards = (v.cards || []).filter((x) => Array.isArray(x) && CARDS[x[0]] && x[1] > 0);
  const extra = (v.extra || []).filter((id) => CARDS[id]);
  if (!cards.length) return DECKS[0];
  return { id: v.id || 'peer', n: v.n || '好友的卡组', r: v.r || 'any', cards, extra, desc: '', combo: [], tips: '' };
}

function startNetGame(side, seed, deckA, deckB) {
  if (S.room) S.room.state = 'playing';
  const a = deckFromPeer(deckA);
  const b = deckFromPeer(deckB);
  newGame('net', side, side === 0 ? a : b, side === 0 ? b : a, seed);
  toast(side === 0 ? '好友已加入，你先手' : '已进入房间，房主先手');
}

function onNetMsg(p) {
  const r = S.room;
  if (!r) return;
  if (p.k === 'hi') {
    // 已经开打了就不理会：对方的握手每 5 秒重发一次，中继又会把 12 小时内的旧消息补发给重连的人，
    // 不挡的话，房主每收到一次旧的「hi」就会换个种子重开一局
    if (r.state === 'playing') return;
    if (r.role === 'a' && p.role === 'b') {
      r.peerDeck = deckFromPeer(p.deck);
      r.state = 'playing';
      const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      const a = deckPayload(S.deckId);
      // 对面那套是自组的，本地没有这个 id，就直接用他发来的内容
      const b = (DECKS.some((d) => d.id === r.peerDeck.id) || myDecks().some((d) => d.id === r.peerDeck.id))
        ? deckPayload(r.peerDeck.id) : r.peerDeck;
      S.net.send({ k: 'open', seed, a, b });
      startNetGame(0, seed, a, b);
    }
    return;
  }
  if (p.k === 'open' && r.role === 'b') {
    if (r.state === 'playing') return;       // 补发的旧开局消息，别把正在打的这局重开
    r.state = 'playing';
    S.net.send({ k: 'ack' });
    startNetGame(1, p.seed, p.a, p.b);
    return;
  }
  if (p.k === 'act') {
    const G = S.G;
    if (!G || S.bt !== 'net') return;
    if (p.n !== S.seq + 1) { toast('房间消息不连续，重开一局吧'); return; }
    // 只认「对方的回合里、对方发的动作」：中继是公共话题，别人也能往里发消息；引擎里除了「结束回合」不检查轮到谁
    if (G.over || G.active !== 1 - S.side || !p.a || typeof p.a !== 'object') return;
    const res = E.applyAction(G, 1 - S.side, p.a);
    S.seq = p.n;
    if (!res.ok) toast('同步失败：' + res.err);
    S.sel = null; S.mode = 'idle';
    renderDuel();
    return;
  }
  if (p.k === 'bye') {
    toast('好友离开了房间');
    if (S.bt === 'net' && S.G && !S.G.over) {
      S.room = null;
      show('home');
    }
  }
}

// ------------------------------------------------------------------ 自组卡组
// 预组是「拿来就打的」，自组是「自己排的」。两者在选卡组列表里平级，
// deckById() 同时认这两份，所以人机 / 同屏 / 好友房都不用额外改分支。
// 主卡组 40~50 张：预组一律按 40 构筑（越少越稳，牌堆薄了才抽得到要的），
// 自组放到 50 是留给「想塞满的」——多了容错高，但关键牌也被稀释。
const DECK_SIZE = 50;
const DECK_MIN = 40;
const MAX_COPY = 3;     // 同名卡上限
const EXTRA_MAX = 10;   // 额外卡组上限
// 「直接召唤」不占通常召唤，白给一个身位太强，所以额外卡组里最多放 2 张。
const DIRECT_MAX = 2;

let deckSeq = 0;
function blankDeck() {
  deckSeq++;
  return {
    id: 'c' + Date.now().toString(36) + deckSeq.toString(36),
    n: '我的卡组 ' + (myDecks().length + 1), r: 'any',
    cards: [], extra: [], desc: '自己组的一套牌。', combo: [], tips: '', mine: true,
  };
}

function startBuild(id) {
  const d = id === 'new' ? blankDeck() : deckById(id);
  S.build = {
    src: id === 'new' ? null : d.id,
    id: d.id, n: d.n, r: d.r || 'any',
    cards: (d.cards || []).map((x) => [x[0], x[1]]),
    extra: (d.extra || []).slice(),
    k: 'all', rf: 'all', q: '',
    preset: 'all',      // 按预组筛：'all' = 全卡池，否则只显示那套预组用到的牌
  };
  show('build');
}

function bCount(id) {
  const p = S.build.cards.find((x) => x[0] === id);
  return p ? p[1] : 0;
}
function bTotal() { return S.build.cards.reduce((a, p) => a + p[1], 0); }

function bAdd(id) {
  const b = S.build;
  const c = CARDS[id];
  if (!c) return;
  if (c.k === 'E') {
    if (b.extra.indexOf(id) >= 0) return toast('这张已经在额外卡组里了');
    if (b.extra.length >= EXTRA_MAX) return toast('额外卡组最多 ' + EXTRA_MAX + ' 张');
    if (c.direct && b.extra.filter((x) => CARDS[x] && CARDS[x].direct).length >= DIRECT_MAX) {
      return toast('「直接召唤」的额外怪兽最多 ' + DIRECT_MAX + ' 张（它不占通常召唤）');
    }
    b.extra.push(id);
    return renderBuild();
  }
  if (bTotal() >= DECK_SIZE) return toast('主卡组已经有 ' + DECK_SIZE + ' 张了，先减一张');
  if (bCount(id) >= MAX_COPY) return toast('「' + c.n + '」最多放 ' + MAX_COPY + ' 张');
  const p = b.cards.find((x) => x[0] === id);
  if (p) p[1]++; else b.cards.push([id, 1]);
  renderBuild();
}

function bSub(id, isExtra) {
  const b = S.build;
  if (isExtra) {
    const i = b.extra.indexOf(id);
    if (i >= 0) b.extra.splice(i, 1);
  } else {
    const i = b.cards.findIndex((x) => x[0] === id);
    if (i < 0) return;
    if (--b.cards[i][1] <= 0) b.cards.splice(i, 1);
  }
  renderBuild();
}

// 预组筛选用的索引：选中某套预组后，候选池只留这套牌真的会用的卡
function presetSet(presetId) {
  if (!presetId || presetId === 'all') return null;
  const d = DECKS.find((x) => x.id === presetId);
  if (!d) return null;
  return new Set(d.cards.map(([id]) => id).concat(d.extra));
}

function bPool() {
  const b = S.build;
  const q = (b.q || '').trim();
  const preset = presetSet(b.preset);
  const out = [];
  for (const id of Object.keys(CARDS)) {
    const c = CARDS[id];
    if (!c || c.token) continue;                 // 衍生物不能自己放
    if (b.k !== 'all' && c.k !== b.k) continue;
    if (b.rf !== 'all' && c.r !== b.rf) continue;
    if (preset && !preset.has(id)) continue;
    if (q && c.n.indexOf(q) < 0 && (c.text || '').indexOf(q) < 0) continue;
    out.push(id);
  }
  const ord = { M: 0, S: 1, T: 2, E: 3 };
  return out.sort((x, y) => {
    const a = CARDS[x]; const b2 = CARDS[y];
    return (ord[a.k] - ord[b2.k]) || ((a.lv || 0) - (b2.lv || 0)) || a.n.localeCompare(b2.n, 'zh');
  });
}

function bRow(id, n, onClick) {
  const c = CARDS[id];
  if (!c) return '';
  const sub = c.k === 'E' ? '觉醒体'
    : KIND_TXT[c.k] + ' · ' + (REALM_TXT[c.r] || c.r) + costTag(c)
      + (c.lv ? ' · Lv' + c.lv : '') + (c.atk !== undefined ? ' · ' + c.atk + '/' + c.def : '');
  return `<button class="bit" ${onClick}><b>${c.n}</b><span>${sub}</span>`
    + `<i>${n > 0 ? '×' + n : '＋'}</i></button>`;
}

function renderBuild() {
  const el = $('#scr-build');
  const b = S.build;
  if (!el || !b) { show('home'); return; }
  // 重绘前先把输入框里的字存回去，不然「加一张牌」就会把刚打的卡组名冲掉
  const oldName = $('#bname');
  if (oldName) b.n = oldName.value;
  const oldQ = $('#bq');
  const hadFocus = oldQ && document.activeElement === oldQ;
  if (oldQ) b.q = oldQ.value;
  // 每点一下都整块重绘：候选池与右侧清单的滚动位置得留着，不然选一张牌就跳回顶部
  const oldPool = document.querySelector('.bpool');
  const oldList = document.querySelector('.bpanel:nth-child(2) .blist');
  const poolTop = oldPool ? oldPool.scrollTop : 0;
  const listTop = oldList ? oldList.scrollTop : 0;

  const total = bTotal();
  const kinds = [['all', '全部'], ['M', '怪兽'], ['S', '魔法'], ['T', '陷阱'], ['E', '额外卡组']];
  const realms = [['all', '全部'], ['chaos', '混沌'], ['caro', '血肉'], ['aqua', '深海'], ['ultra', '超维'], ['any', '无界']];
  const seg = (arr, cur, attr) => `<div class="seg">${arr.map(([v, t]) => `<button ${attr}="${v}" class="${cur === v ? 'on' : ''}">${t}</button>`).join('')}</div>`;

  // 候选池按卡表的样子摊开：分区 + 卡面，点卡面加一张，点卡面下的「−」减一张。
  // 以前是一行一行的列表，看不见卡面、也看不出「这张我已经放了几张」。
  const pool = bPool();
  const cell = (id) => {
    const c = CARDS[id];
    const isExtra = c.k === 'E';
    const n = isExtra ? (b.extra.indexOf(id) >= 0 ? 1 : 0) : bCount(id);
    const cls = ['bcell'];
    if (n) cls.push('on');
    if (n >= (isExtra ? 1 : MAX_COPY)) cls.push('max');
    const minus = n > 0
      ? `<button class="bmi" ${isExtra ? `data-subx="${id}"` : `data-sub="${id}"`} title="减一张">−</button>`
      : '<span class="bmn"></span>';
    return `<div class="${cls.join(' ')}">
      <div class="bf" data-add="${id}">${cardHTML(c, {})}</div>
      <div class="bbar">${minus}<b>${n ? '×' + n : '＋'}</b></div>
    </div>`;
  };
  const poolHtml = CODEX_GROUPS.map(([k, label]) => {
    const arr = pool.filter((id) => CARDS[id].k === k);
    if (!arr.length) return '';
    return `<div class="chead"><b>${label}</b><span>${arr.length} 种</span></div>
      <div class="bgrid">${arr.map(cell).join('')}</div>`;
  }).join('');

  // 按预组筛：新手从「这套预组用了哪些牌」开始改，比面对 369 张无从下手好
  const presetOpts = [['all', '全部卡池']].concat(DECKS.map((d) => [d.id, `预组 · ${d.n}`]));
  const presetSel = `<select class="bpreset" id="bpreset" title="只看某套预组用到的牌">`
    + presetOpts.map(([v, t]) => `<option value="${v}"${(b.preset || 'all') === v ? ' selected' : ''}>${t}</option>`).join('')
    + '</select>';

  const secM = b.cards.filter(([id]) => CARDS[id] && CARDS[id].k === 'M');
  const secS = b.cards.filter(([id]) => CARDS[id] && CARDS[id].k === 'S');
  const secT = b.cards.filter(([id]) => CARDS[id] && CARDS[id].k === 'T');
  const cntOf = (arr) => arr.reduce((a, p) => a + p[1], 0);
  const deckGroup = (arr, title, k) => `<h4>${title} · ${cntOf(arr)} 张</h4>`
    + (arr.length ? arr.map(([id, n]) => bRow(id, n, `data-sub="${id}" data-k="${k}"`)).join('')
      : '<p class="note" style="margin:0 0 4px">还没有</p>');

  // 额外卡组的素材检查：素材不在主卡组里，这张觉醒体一辈子召不出来
  const names = new Set(b.cards.map(([id]) => CARDS[id] && CARDS[id].n));
  const extraHtml = b.extra.length ? b.extra.map((id) => {
    const c = CARDS[id];
    if (!c) return '';
    const miss = c.matRealm ? [] : (c.mat || []).filter((n) => !names.has(n));
    return `<button class="bit" data-subx="${id}"><b>${c.n}</b><span>${miss.length ? '缺素材：' + miss.join('、') : (c.matRealm ? '任意两界域' : '素材齐了')}</span>`
      + `<em>${miss.length ? '缺' : ''}</em><i>${c.atk}/${c.def}</i></button>`;
  }).join('') : '<p class="note" style="margin:0 0 4px">还没有（额外卡组可以空着）</p>';

  el.innerHTML = `
    <div class="bhead">
      <input class="bname" id="bname" maxlength="20" value="${b.n.replace(/"/g, '&quot;')}" placeholder="给这套牌起个名字">
      <span class="bmeta">主卡组 ${total}/${DECK_SIZE} · 额外 ${b.extra.length}/${EXTRA_MAX}</span>
      <button class="btn sm pri" data-bsave="1">保存</button>
      <button class="btn sm ghost" data-bback="1">返回</button>
    </div>
    <div class="bbody">
      <div class="bpanel">
        <div class="bq">
          <input id="bq" placeholder="搜卡名或效果文字" value="${(b.q || '').replace(/"/g, '&quot;')}">
        </div>
        ${seg(kinds, b.k, 'data-bk')}
        ${seg(realms, b.rf, 'data-br')}
        <div class="bsel">${presetSel}<span class="note">${b.preset && b.preset !== 'all' ? '只看这套预组用到的牌' : '点卡面加一张，点「−」减一张'}</span></div>
        <div class="bpool">${poolHtml || '<p class="note">没有符合条件的牌</p>'}</div>
      </div>
      <div class="bpanel">
        ${deckGroup(secM, '怪兽', 'm')}
        ${secM.length ? '' : ''}
        ${deckGroup(secS, '魔法', 's')}
        ${deckGroup(secT, '陷阱', 't')}
        <h4>额外卡组 · ${b.extra.length} 张</h4>
        <div class="blist" style="max-height:22vh">${extraHtml}</div>
        <p class="note" style="margin:6px 0 0">同名卡最多 ${MAX_COPY} 张；主卡组 ${DECK_MIN}~${DECK_SIZE} 张（${DECK_MIN} 张最稳，越往上越容易抽不到要的牌）；
          「直接召唤」的额外怪兽最多 ${DIRECT_MAX} 张；觉醒体的素材必须在这套牌里，否则它永远召不出来。</p>
      </div>
    </div>`;

  const q = $('#bq');
  if (q) {
    if (q.value !== (b.q || '')) q.value = b.q || '';
    if (hadFocus) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
  const np = document.querySelector('.bpool');
  if (np && poolTop) np.scrollTop = poolTop;
  const nl = document.querySelector('.bpanel:nth-child(2) .blist');
  if (nl && listTop) nl.scrollTop = listTop;
}

function saveBuild() {
  const b = S.build;
  const el = $('#bname');
  if (el) b.n = el.value;
  const total = bTotal();
  if (total < DECK_MIN || total > DECK_SIZE) {
    return toast('主卡组要 ' + DECK_MIN + '~' + DECK_SIZE + ' 张（现在 ' + total + ' 张）');
  }
  const names = new Set(b.cards.map(([id]) => CARDS[id] && CARDS[id].n));
  for (const id of b.extra) {
    const e2 = CARDS[id];
    if (!e2 || e2.matRealm) continue;
    const miss = (e2.mat || []).filter((n) => !names.has(n));
    if (miss.length) return toast('「' + e2.n + '」的素材不在这套牌里：' + miss.join('、'));
  }
  // 领域取主卡组里张数最多的那个，只影响列表上的颜色和图标
  const cnt = {};
  for (const [id, n] of b.cards) {
    const c = CARDS[id];
    if (c && c.r !== 'any') cnt[c.r] = (cnt[c.r] || 0) + n;
  }
  const r = Object.keys(cnt).sort((x, y) => cnt[y] - cnt[x])[0] || 'any';
  const list = myDecks();
  const rec = {
    id: b.id, n: (b.n || '').trim() || '我的卡组', r,
    cards: b.cards.filter((p) => p[1] > 0), extra: b.extra.slice(),
    desc: '自己组的一套牌（' + total + ' 张）。', combo: [], tips: '', mine: true,
  };
  const i = list.findIndex((d) => d.id === rec.id);
  const isNew = i < 0;
  if (isNew) list.push(rec); else list[i] = rec;
  S.save.mine = list;
  if (!isMyDeck(S.deckId) && !DECKS.some((d) => d.id === S.deckId)) S.deckId = DECKS[0].id;
  saveSave(S.save);
  toast(isNew ? '卡组已保存' : '改好了');
  show('home');
}

function askRename(id) {
  const d = deckById(id);
  openModal(`<div class="mtitle"><h3>改个名字</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">现在叫「${d.n}」。</p>
    <input class="rin" id="bren" maxlength="20" value="${d.n.replace(/"/g, '&quot;')}" autocomplete="off">
    <div class="mb"><button class="btn ghost" data-modal="close">算了</button>
      <button class="btn pri" data-bren-do="${id}">改</button></div>`);
  setTimeout(() => { const i = $('#bren'); if (i) { i.focus(); i.select(); } }, 60);
}

function doRename(id) {
  const el = $('#bren');
  const nm = (el && el.value || '').trim();
  if (!nm) return toast('名字不能空着');
  const list = myDecks();
  const d = list.find((x) => x.id === id);
  if (!d) return;
  d.n = nm;
  S.save.mine = list;
  saveSave(S.save);
  closeModal();
  renderHome();
  toast('改名成功');
}

function copyDeck(id) {
  const d = deckById(id);
  const list = myDecks();
  const rec = {
    id: 'c' + Date.now().toString(36) + (deckSeq++).toString(36),
    n: d.n + ' 副本', r: d.r, cards: d.cards.map((p) => [p[0], p[1]]), extra: (d.extra || []).slice(),
    desc: d.desc || '', combo: [], tips: '', mine: true,
  };
  list.push(rec);
  S.save.mine = list;
  saveSave(S.save);
  renderHome();
  toast('已复制成「' + rec.n + '」');
}

function askDelete(id) {
  const d = deckById(id);
  openModal(`<div class="mtitle"><h3>删掉「${d.n}」？</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">这套牌会一起没掉（卡本身还在收藏里，只是这个卡组不见了）。删了就找不回来。</p>
    <div class="mb"><button class="btn ghost" data-modal="close">算了</button>
      <button class="btn pri" data-bdel-do="${id}">删掉</button></div>`);
}

function doDelete(id) {
  const list = myDecks().filter((d) => d.id !== id);
  S.save.mine = list;
  if (S.deckId === id) { S.deckId = DECKS[0].id; S.save.deck = S.deckId; }
  saveSave(S.save);
  closeModal();
  renderHome();
  toast('已删除');
}

// ------------------------------------------------------------------ 卡包
function drawFromPack(pack) {
  const pool = pack.cards.map((id) => CARDS[id]).filter(Boolean);
  const byRar = {};
  for (const c of pool) (byRar[c.rar || 'N'] = byRar[c.rar || 'N'] || []).push(c.id);
  const ALL_RAR = Object.keys(byRar);
  const out = [];
  const sameIn = (id) => out.filter((x) => x === id).length;
  // 一包里同一种卡可以重复，但最多 3 张（再多就是「这一包全是同一个人」了）。
  // 满 3 张的牌直接不进候选——不能回退成「允许第 4 张」，那样上限就白写了。
  const pick = (list) => {
    const cands = [];
    for (const r of list) for (const id of byRar[r] || []) cands.push(id);
    if (!cands.length) return null;
    const room = cands.filter((id) => sameIn(id) < PACK_COPY_MAX);
    if (!room.length) return null;
    return room[Math.floor(Math.random() * room.length)];
  };
  // 兜底：某些卡包根本没有 N/R（bp08 融灾首领 全是 SR 以上），
  // 以前 roll 到 N 就 pick 不到、push 进一个空位，开出来只有 3~4 张卡。
  const anyRoom = () => {
    const room = [];
    for (const r of ALL_RAR) for (const id of byRar[r]) if (sameIn(id) < PACK_COPY_MAX) room.push(id);
    return room.length ? room[Math.floor(Math.random() * room.length)] : null;
  };
  out.push(pick(['GR', 'UR', 'SR']) || anyRoom());
  const roll = () => {
    const r = Math.random();
    return r < 0.45 ? 'N' : r < 0.80 ? 'R' : r < 0.96 ? 'SR' : r < 0.99 ? 'UR' : 'GR';
  };
  for (let i = 0; i < 4; i++) {
    let id = null;
    for (let t = 0; t < 8 && !id; t++) id = pick([roll()]);
    out.push(id || anyRoom() || pick(['N', 'R']));
  }
  return out.filter(Boolean);
}

function packBtnLabel() {
  if (freeLeft(S.save) > 0) return '免费开包';
  if ((S.save.tickets || 0) > 0) return '用券开包';
  return '开包 ' + PACK_PRICE;
}

function renderPacks() {
  const free = freeLeft(S.save);
  const tk = S.save.tickets || 0;
  const canBySilver = walletGet() >= PACK_PRICE;
  const packs = PACKS.map((pk) => {
    const have = pk.cards.filter((id) => S.save.coll[id]).length;
    const total = pk.cards.length;
    const pct = Math.round((have / total) * 100);
    const rar = {};
    for (const id of pk.cards) { const c = CARDS[id]; if (c) rar[c.rar] = (rar[c.rar] || 0) + 1; }
    const rarTxt = RAR_ORDER.filter((r) => rar[r]).map((r) => `${r}×${rar[r]}`).join(' · ');
    const dis = (free > 0 || tk > 0 || canBySilver) ? '' : 'disabled';
    return `<div class="pack" data-pack="${pk.id}">
      <div><div class="pn">${pk.n}</div><div class="pe">${pk.en}</div></div>
      <div class="ps">${pk.sub}</div>
      <div class="pd">${pk.desc}</div>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <div class="pf"><span style="white-space:nowrap">收录 ${have}/${total}</span>
        <button class="btn sm pri" data-buy="${pk.id}" ${dis}>${packBtnLabel()}</button>
      </div>
      <div class="note" style="font-size:10px;margin-top:-2px">${rarTxt}</div>
      <button class="btn sm" data-pool="${pk.id}" style="align-self:flex-start">查看卡池 · 每张效果</button>
    </div>`;
  }).join('');

  $('#scr-packs').innerHTML = `
    <div class="sec-h"><h2>卡包</h2><span class="r">银芯 ${walletGet()} · 券 ${tk} · 今日免费 ${free}</span></div>
    <p class="note" style="margin:0 0 10px">每包 5 张，第一张保底 SR 以上。开包的顺序是：先用每天白给的那一次，再用打人机赢来的券，
      最后才扣银芯（${PACK_PRICE}，全站共用的那份）。开出来的卡进收藏，不影响预组卡组——对决用的是整套预组，收藏是「我还记得这些人」。</p>
    <div class="packs">${packs}</div>
    <p class="note" style="margin-top:12px">已收录 ${Object.keys(S.save.coll).length} / ${Object.keys(CARDS).filter((id) => !CARDS[id].token).length} 种。
      今天还能拿 ${ticketDayLeft(S.save)} 张开包券（打赢人机 +1）。</p>
    <p class="note" style="margin-top:6px">每张卡留 3 张就够，第 4 张起开包时会自动折算成银芯（每张 1 芯）。
      一包里同一种卡最多出 3 张。
      <button class="btn sm ghost" data-recycle="1" style="margin-left:6px">一键回收多余</button></p>
  `;
}

// ------------------------------------------------------------------ 重复卡回收
// 收藏不是卡组：每张留 3 张就够看了，第 4 张起自动折算成银芯。
// 不这么做的话，收集到后期开包永远是「全是重复」，什么也拿不到。
const KEEP_COPY = 3;        // 每张留 3 张，第 4 张起才折算
const PACK_COPY_MAX = 3;    // 一包里同一种卡的上限
// 重复卡一律 1 银芯：这只是「别让你白开一包」的止损，不是收益。
// 按稀有度给价（旧版 SR 45 / GR 220）会让刷包变成最赚的银芯来源，反而没人去打牌。
function recycleValue() { return 1; }

// 开完包先把多出来的折算掉；返回折算了几张、给了多少银芯
function autoRecycle(ids) {
  let n = 0, silver = 0;
  for (const id of ids) {
    const cnt = S.save.coll[id] || 0;
    if (cnt <= KEEP_COPY) continue;
    S.save.coll[id] = cnt - 1;
    silver += recycleValue();
    n++;
  }
  if (silver > 0) walletAdd(silver);
  return { n, silver };
}

// 「一键回收多余」：把收藏里所有超过 3 张的部分都换掉
function recycleAll() {
  let n = 0, silver = 0;
  for (const id of Object.keys(S.save.coll)) {
    const cnt = S.save.coll[id] || 0;
    if (cnt <= KEEP_COPY) continue;
    const extra = cnt - KEEP_COPY;
    S.save.coll[id] = KEEP_COPY;
    n += extra;
    silver += extra * recycleValue();
  }
  if (!n) return toast('没有多于 ' + KEEP_COPY + ' 张的重复卡');
  walletAdd(silver);
  saveSave(S.save);
  silverBar();
  renderPacks();
  toast(`回收 ${n} 张重复卡，换到 ${silver} 银芯`);
}

function buyPack(packId) {
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  if (freeLeft(S.save) <= 0 && (S.save.tickets || 0) <= 0 && walletGet() < PACK_PRICE) {
    return toast(`银芯不够，还差 ${PACK_PRICE - walletGet()}；今天也没有免费次数和券了`);
  }
  const pay = payPack(S.save);
  if (pay.kind === 'silver' && !walletSpend(pay.price)) return toast('银芯不够');
  S.save.opened++;
  const ids = drawFromPack(pk);
  const isNew = {};
  for (const id of ids) if (id && !S.save.coll[id]) isNew[id] = true;
  const newN = Object.keys(isNew).length;
  for (const id of ids) if (id) S.save.coll[id] = (S.save.coll[id] || 0) + 1;
  const rec = autoRecycle(ids);
  saveSave(S.save);
  silverBar();
  renderPacks();

  const payTxt = pay.kind === 'free' ? '今日免费' : (pay.kind === 'ticket' ? '用掉 1 张开包券' : `银芯 -${pay.price}`);
  const cards = ids.map((id) => CARDS[id]).filter(Boolean);
  openModal(`<div class="mtitle"><h3>${pk.n}</h3><span class="note">${pk.sub}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">第 ${S.save.opened} 包 · ${payTxt}</p>
    <p class="note" style="margin:0 0 4px">${newN ? `本次新收录 ${newN} 种。` : '这五张都已收录过。'}${rec.n ? `重复的 ${rec.n} 张已折算成 <b style="color:var(--gold)">${rec.silver} 银芯</b>。` : ''}点任意一张看详细效果。</p>
    <div class="pull">${cards.map((c) => `<div class="pc" data-read="${c.id}">${cardHTML(c, { tag: isNew[c.id] ? 'NEW' : '' })}<div class="rar" style="color:var(--rc)">${c.rar}${isNew[c.id] ? '' : ` · ×${S.save.coll[c.id]}`}</div></div>`).join('')}</div>
    <div class="mb"><button class="btn ghost" data-modal="close">收下</button>
      <button class="btn pri" data-buy2="${pk.id}">再开一包</button></div>`);
}

// ------------------------------------------------------------------ 卡表
// 卡表分区：以前 369 张全挤在一个网格里，「额外卡组」被排在最后一屏外面，
// 看起来就像卡表里没有额外卡组。现在按 怪兽 / 魔法 / 陷阱 / 额外卡组 分块，每块带小标题和计数。
const CODEX_GROUPS = [['M', '怪兽'], ['S', '魔法'], ['T', '陷阱'], ['E', '额外卡组']];

function renderCodex() {
  const kinds = [['all', '全部'], ['M', '怪兽'], ['S', '魔法'], ['T', '陷阱'], ['E', '额外卡组']];
  const realms = [['all', '全界域'], ['chaos', '混沌'], ['caro', '血肉'], ['aqua', '深海'], ['ultra', '超维'], ['any', '无界']];
  // 衍生物（tk1/tk2）不进卡表：它不是能收进收藏的牌，只由效果叫出来
  const all = Object.keys(CARDS).map((id) => CARDS[id]).filter((c) => !c.token);
  const list = all.filter((c) => {
    if (S.codex.k !== 'all' && c.k !== S.codex.k) return false;
    if (S.codex.r !== 'all' && (c.r || 'any') !== S.codex.r) return false;
    return true;
  });
  const order = { M: 0, S: 1, T: 2, E: 3 };
  list.sort((a, b) => (order[a.k] - order[b.k]) || (a.r || '').localeCompare(b.r || '')
    || (Number(!!b.direct) - Number(!!a.direct)) || (b.atk || 0) - (a.atk || 0));

  const cell = (c) => `<div>${cardHTML(c, {})}<div style="text-align:center;font-size:9px;color:var(--dim2);margin-top:2px">`
    + `${c.rar}${(S.save.coll || {})[c.id] ? ` · ×${S.save.coll[c.id]}` : ' · 未收录'}</div></div>`;
  const grid = (arr) => `<div class="grid-cards">${arr.map(cell).join('')}</div>`;

  const blocks = CODEX_GROUPS.map(([k, label]) => {
    const arr = list.filter((c) => c.k === k);
    if (!arr.length) return '';
    if (k !== 'E') return `<div class="chead"><b>${label}</b><span>${arr.length} 张</span></div>${grid(arr)}`;
    // 额外卡组里两种召唤方式分开列：凑素材的、满足条件白给的，混在一起看不懂
    const aw = arr.filter((c) => !c.direct), dr = arr.filter((c) => c.direct);
    return `<div class="chead"><b>${label}</b><span>${arr.length} 张 · 觉醒 ${aw.length} / 直接召唤 ${dr.length}</span></div>`
      + (aw.length ? `<div class="csub">觉醒召唤<span>凑齐素材，从额外卡组特召</span></div>${grid(aw)}` : '')
      + (dr.length ? `<div class="csub">直接召唤<span>满足卡面条件，或献出命轮值</span></div>${grid(dr)}` : '');
  }).join('');

  $('#scr-codex').innerHTML = `
    <div class="sec-h"><h2>卡表</h2><span class="r">${list.length} / ${all.length} 张</span></div>
    <div class="filters">
      ${kinds.map(([k, n]) => `<button class="chip ${S.codex.k === k ? 'on' : ''}" data-ck="${k}">${n}</button>`).join('')}
    </div>
    <div class="filters">
      ${realms.map(([r, n]) => `<button class="chip ${S.codex.r === r ? 'on' : ''}" data-cr="${r}" data-r="${r}">${n}</button>`).join('')}
    </div>
    ${blocks || '<p class="note">这个筛选下没有卡。</p>'}
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
    <h1>忘却前夜 · 唤醒王：决斗链接</h1>
    <p class="intro">${LORE.intro}</p>
    <div class="realms">${realms}</div>
    ${chapters}
    <div class="sec-h"><h2>名词</h2><span class="r">照本作的口径</span></div>
    <div class="terms">${terms}</div>
    <p class="note" style="margin-top:14px">术语沿用原作，卡牌规则与「唤醒王：决斗链接」这套玩法是本作私设。卡面头像来自游戏原作素材，仅用于同人。</p>
  </div>`;
}

// ------------------------------------------------------------------ 规则
function showHowTo() {
  openModal(`<div class="mtitle"><h3>怎么打</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">目标是先把对方的命轮值打到 0。双方各 8000 点起手。</p>
    <ul class="tips">
      <li><b>场地</b>：怪兽 3 格、魔法·陷阱 3 格，卡组 40~50 张，起手 5 张。先手第一回合不抽牌。</li>
      <li><b>召唤</b>：每回合 1 次。等级 1–4 直接出，5–6 需要 1 只祭品，7 以上需要 2 只。祭品送墓。
        带「额外通常召唤」的牌（如「灯下夜谈」）可以让你这回合多召一次。</li>
      <li><b>特殊召唤</b>：<b>不占通常召唤权</b>。衍生物（「维度残影」这类）凭空多一个身位，可以当祭品、当墙、当嘲讽的靶子；
        特殊召唤则直接从手牌或墓地拉一只小怪出来。</li>
      <li><b>盖放</b>：怪兽可以里侧守备（等级 5 以上不行）；陷阱从手牌盖到魔陷区，盖放当回合不能发动。</li>
      <li><b>战斗</b>：攻击表示互殴，输的一方破坏、差值打脸；打守备怪兽时超过守备力就破坏它，没有贯穿就没有伤害；场上没有怪兽才能直接攻击。</li>
      <li><b>拦路</b>：三档。<b>嘲讽</b>不管攻守都得先打它；<b>限高嘲讽</b>（卡上写「攻击力 2000 以下的怪兽必须先打它」）只拦比它小的，
        大怪可以直接跨过去；<b>只拦一次</b>的嘲讽挨过一下就失效。<b>守备守护</b>是最老的一档：守备表示时挡在前面。</li>
      <li><b>中毒 / 流血</b>：回合开始时结算，然后层数 -1。<b>中毒</b>挂在人身上就扣命轮值（每层 100），挂在怪兽身上就攻守各降
        （每层 100，攻守同时归零就化掉——这是拆守备大墙的办法）；<b>流血</b>只削攻击力，削锋不拆墙。</li>
      <li><b>屏障</b>：抵消一次战斗伤害或一次效果伤害；挂在怪兽身上的还能顶掉一次破坏、一次弹回或一次弱化。</li>
      <li><b>反击</b>：被攻击之后还手。多数打攻击方的命轮值，写了「咬住」的那种改打攻击方怪兽的攻击力，削到 0 就破坏它。
        整套「以牙还牙」就是靠这个逼对手不敢随便撞。</li>
      <li><b>觉醒召唤</b>：把指定的素材送进墓地，从额外卡组特召，<b>不占通常召唤</b>。素材至少有一只在自己场上，另一只可以直接从手牌来；
        少数觉醒体（写了「素材可从墓地」的）还能从墓地拼回来；<b>刚觉醒的那一回合它不能攻击</b>。</li>
      <li><b>自组卡组</b>：首页「我的卡组」里可以新建 / 编辑 / 改名 / 复制 / 删除，随便存几套。
        主卡组 40~50 张（预组都是 40 张，牌越少越容易抽到要的），同名最多 3 张，额外最多 10 张、其中「直接召唤」最多 2 张；
        觉醒体的素材必须在这套牌里，否则它永远召不出来。
        人机、同屏双人、好友房都能用自己组的牌——好友房里传的是卡组内容，不是编号。</li>
      <li><b>命轮代价</b>：有些魔法·陷阱写着「代价 1500」——<b>发动时先付命轮值</b>，付不起就发不动（付完不能正好死）。
        代价牌通常比同级的常规牌强一档：「以命换命」2000 换对方 2000、「铁处女」2500 直接拆掉对方最大的怪。</li>
      <li><b>造物</b>：「造物·××」只做魔法·陷阱（装备 / 永续 / 场地 / 通常 / 速攻），
        <b>不当怪兽、也不进觉醒体</b>——它们是道具，不是人。场地魔法占一格，同一时间只能有一张，新的把旧的顶掉；
        造物各有一枚自己的道具图标，认图标比认名字快。</li>
      <li><b>直接召唤</b>：额外卡组里另一种召唤方式。<b>满足卡面条件</b>（如「自己场上有 2 只怪兽」）或<b>献出命轮值</b>即可召唤，
        不用素材、<b>不占通常召唤</b>；代价是每回合只能 1 次，而且当回合不能攻击。为了不破坏平衡，额外卡组里最多放 2 张。</li>
      <li><b>陷阱</b>：本作的陷阱是「自动迎击」——满足条件就发动，不用你宣言。所以盖牌的顺序要考虑对手会先干什么。</li>
      <li><b>重复卡</b>：收藏里每张留 3 张就够，第 4 张起开包时自动折算成银芯（每张 1 芯），
        卡包页也有「一键回收多余」。一包里同一种卡最多出 3 张——所以开包能开出重复，但不会一包全是同一张。</li>
      <li><b>羁绊</b>：卡组里同时有指定角色就会在开局触发，加攻、加血、多抽牌。配队比单卡重要。</li>
      <li><b>好友对战</b>：创建房间拿到 5 位码，好友在同一页「加入房间」填码即可。房间靠公共中继转发动作，
        两边各自按同一串动作重放，所以看到的一定是同一局。中继不通时可以「同屏双人」。</li>
    </ul>
    <div class="mb"><button class="btn pri" data-modal="close">知道了</button></div>`);
}

const RAR_COL = { N: 'N 普通', R: 'R 稀有', SR: 'SR 超稀', UR: 'UR 极稀', GR: 'GR 传说' };
const ROLL_TXT = 'N 45% · R 35% · SR 16% · UR 3% · GR 1%；第一张保底 SR 以上';

function lineCard(id, n, own) {
  const c = CARDS[id];
  if (!c) return '';
  const st = c.k === 'M' || c.k === 'E' ? `${c.atk}/${c.def}`
    : (({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击', field: '场地' }[c.t] || '')
      + (c.cost && c.cost.lp ? ` · 代价 ${c.cost.lp}` : ''));
  const have = (S.save.coll || {})[id];
  return `<div class="lc" data-read="${id}" data-rar="${c.rar}" style="--rc:${(E.REALM[c.r] || E.REALM.any).c}">
    <div class="lh"><b>${c.n}</b>${n > 1 ? `<i>×${n}</i>` : ''}<span class="lr">${c.rar}</span>${own && have === undefined ? '<span class="lo">未收录</span>' : ''}</div>
    <div class="ls">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}${c.lv ? ` · Lv${c.lv}` : ''}${costTag(c)} · ${st}</div>
    <div class="lt">${c.text}</div></div>`;
}

function showPackPool(packId) {
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  const have = pk.cards.filter((id) => S.save.coll[id]).length;
  const groups = RAR_ORDER.slice().reverse().filter((r) => pk.cards.some((id) => CARDS[id] && CARDS[id].rar === r)).map((r) => {
    const ids = pk.cards.filter((id) => CARDS[id] && CARDS[id].rar === r);
    return `<h4 class="gh">${RAR_COL[r] || r} · ${ids.length} 种</h4><div class="lcs">${ids.map((id) => lineCard(id, 1, true)).join('')}</div>`;
  }).join('');
  openModal(`<div class="mtitle"><h3>${pk.n} · 卡池</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${pk.cards.length} 种，已收录 ${have} 种。${ROLL_TXT}。点任意一张看大图。</p>${groups}
    <div class="mb"><button class="btn ghost" data-modal="close">关闭</button>
      <button class="btn pri" data-buy2="${pk.id}">开一包</button></div>`);
}

function showDeck(deckId) {
  const d = deckById(deckId);
  const bonds = E.evalBonds(deckList(d));
  const total = d.cards.reduce((s, p) => s + p[1], 0);
  const kinds = [['M', '怪兽'], ['S', '魔法'], ['T', '陷阱']];
  const grp = kinds.map(([k, n]) => {
    const rows = d.cards.filter((p) => CARDS[p[0]] && CARDS[p[0]].k === k);
    if (!rows.length) return '';
    const cnt = rows.reduce((s, p) => s + p[1], 0);
    return `<h4 class="gh">${n} · ${cnt} 张</h4><div class="lcs">${rows.map((p) => lineCard(p[0], p[1])).join('')}</div>`;
  }).join('');
  const ex = d.extra.length ? `<h4 class="gh">额外卡组 · ${d.extra.length} 张（觉醒 / 直接召唤）</h4><div class="lcs">${d.extra.map((id) => lineCard(id, 1)
    + (CARDS[id] && CARDS[id].mat ? `<div class="lm">素材：${CARDS[id].mat.join(' ＋ ')}</div>` : '')).join('')}</div>` : '';
  openModal(`<div class="mtitle"><h3>${d.n}</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${(E.REALM[d.r] || E.REALM.any).n} · 主卡组 ${total} 张 · 点任意一张看详细效果</p>
    <p class="note" style="margin:0 0 8px">${d.desc}</p>
    ${bonds.length ? `<h4 class="gh">羁绊</h4><ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>` : ''}
    ${(d.combo || []).length ? `<h4 class="gh">连动</h4><ul class="tips">${d.combo.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${d.tips ? `<h4 class="gh">打法提示</h4><p class="note">${d.tips}</p>` : ''}
    ${grp}${ex}
    <div class="mb"><button class="btn ghost" data-modal="close">关闭</button>
      <button class="btn pri" data-deck-use="${d.id}">用这套卡组</button></div>`);
}

function readCard(id, push) {
  const c = CARDS[id];
  if (!c) return;
  const extra = c.k === 'E' ? `<p class="note">素材：${c.mat ? c.mat.join(' ＋ ') : '自己场上 2 只界域不同的怪兽'}</p>` : '';
  const have = (S.save.coll || {})[id] || 0;
  const canBack = push && S.mstack && S.mstack.length >= 0 && $('#mask').classList.contains('on') && $('#modal').innerHTML;
  openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}${costTag(c)} · ${c.rar} · ${have ? `已收录 ×${have}` : '未收录'}</span>
    ${canBack ? '<button class="btn sm ghost x" data-modal="back">← 返回</button>' : ''}
    <button class="btn sm ghost ${canBack ? '' : 'x'}" data-modal="close">关闭</button></div>
    <div class="readface">${cardHTML(c, {})}</div>
    <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '')}</p>
    ${extra}
    <p class="note" style="font-size:13px;line-height:1.9">${c.text}</p>`, push);
}

// ------------------------------------------------------------------ 事件
function bind() {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#mask').classList.contains('on')) closeModal(); });
  // 卡组编辑器的搜索框：边打边筛，不按回车
  document.addEventListener('input', (e) => {
    if (e.target.id !== 'bq' || !S.build) return;
    S.build.q = e.target.value;
    renderBuild();
  });

  // 编辑器里「按预组筛」的下拉：change 不是 input，得单独听
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'bpreset' || !S.build) return;
    S.build.preset = e.target.value;
    renderBuild();
  });

  document.addEventListener('click', (e) => {
    const rd = e.target.closest('[data-read]');
    if (rd) { readCard(rd.dataset.read, true); return; }
    const gc = e.target.closest('.grid-cards .card');
    if (gc && gc.dataset.id) { readCard(gc.dataset.id); return; }
    const dv = e.target.closest('[data-deckview]');
    if (dv) { e.stopPropagation(); showDeck(dv.dataset.deckview); return; }
    const du = e.target.closest('[data-deck-use]');
    if (du) { S.deckId = du.dataset.deckUse; S.save.deck = S.deckId; saveSave(S.save); closeModal(); renderHome(); toast('已选用这套卡组'); return; }
    const pl = e.target.closest('[data-pool]');
    if (pl) { showPackPool(pl.dataset.pool); return; }

    // ---- 自组卡组 ----
    const bnew = e.target.closest('[data-bnew]');
    if (bnew) { startBuild('new'); return; }
    const bedit = e.target.closest('[data-bedit]');
    if (bedit) { startBuild(bedit.dataset.bedit); return; }
    const bview = e.target.closest('[data-bview]');
    if (bview) { showDeck(bview.dataset.bview); return; }
    const brenDo = e.target.closest('[data-bren-do]');
    if (brenDo) { doRename(brenDo.dataset.brenDo); return; }
    const bren = e.target.closest('[data-bren]');
    if (bren) { askRename(bren.dataset.bren); return; }
    const bcopy = e.target.closest('[data-bcopy]');
    if (bcopy) { copyDeck(bcopy.dataset.bcopy); return; }
    const bdelDo = e.target.closest('[data-bdel-do]');
    if (bdelDo) { doDelete(bdelDo.dataset.bdelDo); return; }
    const bdel = e.target.closest('[data-bdel]');
    if (bdel) { askDelete(bdel.dataset.bdel); return; }
    if (e.target.closest('[data-bsave]')) { saveBuild(); return; }
    if (e.target.closest('[data-bback]')) { S.build = null; show('home'); return; }
    if (e.target.closest('[data-bk]')) { S.build.k = e.target.closest('[data-bk]').dataset.bk; renderBuild(); return; }
    if (e.target.closest('[data-br]')) { S.build.rf = e.target.closest('[data-br]').dataset.br; renderBuild(); return; }
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) { bAdd(addBtn.dataset.add); return; }
    const subX = e.target.closest('[data-subx]');
    if (subX) { bSub(subX.dataset.subx, true); return; }
    const subBtn = e.target.closest('[data-sub]');
    if (subBtn) { bSub(subBtn.dataset.sub, false); return; }
    const t = e.target.closest('[data-act],[data-deck],[data-buy],[data-buy2],[data-toggle],[data-modal],[data-awaken],[data-direct],[data-recycle],[data-ck],[data-cr],[data-d]');
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
      if (a === 'back') backModal();
      if (a === 'home') { closeModal(); dropRoom(true); show('home'); }
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
    if (t.dataset.recycle) { recycleAll(); return; }
    if (t.dataset.direct) {
      const r = act({ t: 'direct', id: t.dataset.direct });
      if (r && r.ok === false) toast(r.msg || '现在不能直接召唤');
      else closeModal();
      return;
    }
    if (t.dataset.awaken) {
      const r = act({ t: 'awaken', id: t.dataset.awaken });
      if (!r.ok) return toast(r.err);
      closeModal();
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (t.dataset.ck) { S.codex.k = t.dataset.ck; renderCodex(); return; }
    if (t.dataset.cr) { S.codex.r = t.dataset.cr; renderCodex(); return; }
    if (t.dataset.id && t.closest('.grid-cards')) { readCard(t.dataset.id); return; }

    const name = t.dataset.act;
    if (name === 'start') return startDuel();
    if (name === 'local-duel') return startLocal();
    if (name === 'howto') return showHowTo();
    if (name === 'go-packs') return show('packs');
    if (name === 'go-codex') return show('codex');
    if (name === 'go-lore') return show('lore');
    if (name === 'room-create') return createRoom();
    if (name === 'room-join') return askJoin();
    if (name === 'room-copy') {
      const code = S.room && S.room.code;
      if (!code) return;
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('房间码已复制'), () => toast('复制失败，手抄一下'));
      else toast('房间码：' + code);
      return;
    }
    if (name === 'room-go') {
      const box = $('#rin');
      const code = net.normCode(box && box.value);
      if (!code) return toast('房间码是 5 位字母数字');
      closeModal();
      joinRoom(code);
      return;
    }
    if (name === 'leave') {
      dropRoom();
      if (S.G) S.G.over = true;
      show('home');
      return;
    }
    if (name === 'end') return playerEndTurn();
    if (name === 'battle') {
      const r = act({ t: 'battle' });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'extra') return onExtra();
    if (name === 'sfx') {
      S.mute = !S.mute;
      S.save.sfx = S.mute ? 0 : 1;
      saveSave(S.save);
      if (!S.mute) SFX.summon();
      renderDuel();
      return;
    }
    if (name === 'cancel') {
      S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
      renderDuel();
      return;
    }
    if (name === 'pick-target') {
      // 对方场上空空如也：不用再多点一步，直接打脸
      const gm = S.G.players[SIDE()], sm = S.sel && gm.mons.find((x) => x && x.uid === S.sel.uid);
      if (sm && S.G.players[1 - SIDE()].mons.filter(Boolean).length === 0) {
        const r = act({ t: 'attack', uid: sm.uid, target: null });
        if (!r.ok) return toast(r.err);
        S.sel = null; S.mode = 'idle';
        renderDuel();
        return;
      }
      S.mode = 'attack';
      renderDuel();
      return;
    }
    if (name === 'direct') {
      const r = act({ t: 'attack', uid: S.sel.uid, target: null });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'flip') {
      const r = act({ t: 'pos', uid: S.sel.uid });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'summon' || name === 'setmon' || name === 'spell' || name === 'trap') {
      return onHandAct(name);
    }
    if (name === 'read') {
      const side = SIDE();
      const c = S.sel && S.sel.type === 'hand'
        ? S.G.players[side].hand.find((x) => x.uid === S.sel.uid)
        : S.G.players[side].mons.find((x) => x && x.uid === S.sel.uid);
      if (c) readCard(c.id);
      return;
    }
  });

  // 手牌 / 场地
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.hand .card');
    if (card && S.G && !S.busy && S.G.active === SIDE() && !S.G.over) {
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

  // 好友房：定时报活
  setInterval(() => {
    if (S.bt !== 'net' || !S.net || !S.room) return;
    if (S.room.state !== 'playing') return;
    S.net.send({ k: 'ping' });
  }, 20000);
}

// ------------------------------------------------------------------ 启动
// opt.afterPve：结算之后的回调，由入口 js/duel.js 注入（把段位分推一份到云端档案）。
// 这一页自己不认识账号模块：对战逻辑不需要知道「登录没登录、往哪推」。
let afterPve = null;
function pushCloud() {
  try { if (afterPve) afterPve(); } catch (e) { /* 推送失败不影响结算 */ }
}

export function boot(opt) {
  afterPve = (opt && opt.afterPve) || null;
  document.documentElement.style.setProperty('--sheet', `url("${FACES}")`);
  document.documentElement.style.setProperty('--backimg', `url("${BACK}")`);
  document.documentElement.style.setProperty('--sheet-size', `${ART.cols * 100}% ${ART.rows * 100}%`);
  S.deckId = S.save.deck && allDecks().some((d) => d.id === S.save.deck) ? S.save.deck : DECKS[0].id;
  S.diff = S.save.diff || 'normal';
  S.mute = S.save.sfx === 0;
  // 老存档里有一份只在这一页用的银芯：并进全站钱包（约 6:1，最多 40 枚），不再单独记
  if (S.save.silver > 0) { walletAdd(Math.min(40, Math.floor(S.save.silver / 6))); S.save.silver = 0; saveSave(S.save); }
  silverBar();
  bind();
  show('home');

  // ?_test=1：给无头浏览器/调试留的把手（和结合、协议那几页一个路数）。
  // 无头环境点不了牌，只能靠它把一局推到中途，看渲染、飘字、动画有没有报错。
  if (/[?&]_test=1/.test(location.search)) {
    window.__duel = {
      S, E, CARDS, DECKS, SFX,
      start: (deckId, seed) => {
        const mine = deckById(deckId || S.deckId);
        const foe = DECKS.filter((d) => d.id !== mine.id)[0];
        S.ai = aiFor(S.diff, 0);
        newGame('pve', 0, mine, foe, seed || 12345);
      },
      // 两边都按 AI 的思路走 steps 步：同步跑完，dump DOM 时前后一致
      auto: (steps) => {
        const G = S.G;
        if (!G) return null;
        const sloppy = S.ai ? S.ai.sloppy : 0.3;
        let n = 0, ends = 0;
        while (!G.over && n < (steps || 60) && ends < 6) {
          n++;
          const a = nextAction(G, G.active, sloppy);
          if (!a) break;
          const r = E.applyAction(G, G.active, aiAction(a));
          renderDuel();
          if (!r.ok && a.t !== 'end') break;
          if (a.t === 'end') ends++;
        }
        renderDuel();
        return { steps: n, turn: G.turn, over: G.over, lp: [G.players[0].lp, G.players[1].lp] };
      },
      // 九个音效各敲一遍：无头环境没有手势，AudioContext 会保持 suspended，
      // 这里只确认不抛异常
      sfx: () => { Object.keys(SFX).forEach((k) => SFX[k]()); return Object.keys(SFX).join(','); },
      build: (id) => startBuild(id || 'new'),
      go: (id) => show(id),
      // 卡表筛选也能从 URL 指定：?_test=1&go=codex&ck=E（无头截图时定位到额外卡组）
      ck: (k) => { S.codex.k = k || 'all'; renderCodex(); return S.codex.k; },
      // 编辑器：加/减一张、切预组筛选（无头验证用）
      badd: (id) => { bAdd(id); return bTotal(); },
      bsub: (id, x) => { bSub(id, !!x); return bTotal(); },
      bpreset: (id) => { S.build.preset = id; renderBuild(); return bPool().length; },
      // 连开 n 包，统计「一包内重复」和「同种最多几张」——开包是核心循环，得能一次验准
      ptest: (n) => {
        const out = { packs: 0, dupPacks: 0, maxSame: 0, over3: 0, empty: 0 };
        for (let i = 0; i < (n || 200); i++) {
          const pk = PACKS[Math.floor(Math.random() * PACKS.length)];
          const ids = drawFromPack(pk).filter(Boolean);
          if (ids.length < 5) out.empty++;
          const cnt = {};
          for (const id of ids) cnt[id] = (cnt[id] || 0) + 1;
          const mx = Math.max(0, ...Object.values(cnt));
          if (ids.length !== new Set(ids).size) out.dupPacks++;
          out.maxSame = Math.max(out.maxSame, mx);
          if (mx > PACK_COPY_MAX) out.over3++;
          out.packs++;
        }
        return out;
      },
      pack: (id) => buyPack(id || 'bp16'),
    };
    // ?_test=1&go=build：无头截图时直接切到某个屏（build / packs / codex / home）
    const mGo = /[?&]go=([a-z]+)/.exec(location.search);
    if (mGo) setTimeout(() => (mGo[1] === 'build' ? window.__duel.build('new') : window.__duel.go(mGo[1])), 60);
    // ?_test=1&diag=1：把关键容器宽度打出来（无头截图有没有横向溢出，看这个比看图准）
    if (/[?&]diag=1/.test(location.search)) {
      setTimeout(() => {
        const g = document.querySelector('.grid-cards');
        const q = (sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().width) : 0; };
        console.log('DIAG ' + JSON.stringify({
          vw: innerWidth, body: document.body.scrollWidth, doc: document.documentElement.scrollWidth,
          app: q('.app'), scr: q('#scr-codex'), grid: q('.grid-cards'),
          cols: g ? getComputedStyle(g).gridTemplateColumns : '',
          build: S.build ? {
            total: bTotal(), extra: S.build.extra.length, pool: bPool().length,
            preset: S.build.preset, picked: document.querySelectorAll('.bcell.on').length,
          } : null,
        }));
      }, 400);
    }
    const mAdd = /[?&]add=([\w,]+)/.exec(location.search);
    if (mAdd) setTimeout(() => mAdd[1].split(',').filter(Boolean).forEach((id) => window.__duel.badd(id)), 200);
    const mPre = /[?&]preset=(\w+)/.exec(location.search);
    if (mPre) setTimeout(() => window.__duel.bpreset(mPre[1]), 260);
    const mPt = /[?&]ptest=(\d+)/.exec(location.search);
    if (mPt) setTimeout(() => console.log('PTEST ' + JSON.stringify(window.__duel.ptest(Number(mPt[1])))), 300);
    const mCk = /[?&]ck=(\w+)/.exec(location.search);
    if (mCk) setTimeout(() => window.__duel.ck(mCk[1]), 120);
    // ?_test=1&buy=bp16：直接开一包，验证开包弹窗（它崩过一次，是模板里多打了个反引号）
    const mBuy = /[?&]buy=(\w+)/.exec(location.search);
    if (mBuy) setTimeout(() => window.__duel.pack(mBuy[1]), 80);
    // ?_test=1&auto=N：无头截图时自动推 N 步，结果写回页面，dump-dom 就能读到
    const mAuto = /[?&]auto=(\d+)/.exec(location.search);
    if (mAuto) {
      setTimeout(() => {
        const W = window.__duel;
        W.start('d22', 20261101);
        W.sfx();
        const r1 = W.auto(+mAuto[1]);
        const box = document.createElement('div');
        box.id = 'testout';
        box.style.cssText = 'position:fixed;left:0;bottom:0;z-index:999;font:12px monospace;color:#9fe;background:#000a;padding:4px 6px';
        box.textContent = 'testout ' + JSON.stringify(r1);
        document.body.appendChild(box);
      }, 60);
    }
    // ?_test=1&fx=1：每 300ms 重播一遍飘字与抖动，静态截图才抓得到（只在测试里用）
    if (/[?&]fx=1/.test(location.search)) {
      const st = document.createElement('style');
      // 无头截图会冻住动画时钟，飘字永远停在 opacity:0 的第一帧；
      // 给一个负延迟让它直接停在「最亮」的那一帧，才截得到。
      st.textContent = '.float{animation-duration:1s !important; animation-delay:-.2s !important}';
      document.head.appendChild(st);
      S.floatLife = 6000;
      setInterval(() => {
        document.querySelectorAll('.float').forEach((e) => e.remove());
        floatNum(-700, false, 'dmg');
        floatNum(500, true, 'heal');
        // 无头浏览器把动画时钟冻在第 0 帧（飘字永远停在 opacity:0），
        // 所以测试模式直接关掉动画、把最亮那一帧钉死，才截得到
        document.querySelectorAll('.float').forEach((e) => {
          e.style.animation = 'none';
          e.style.opacity = '1';
          e.style.transform = 'translate(-50%,-62%) scale(1.18)';
        });
        pulse(document.getElementById('monsMe'), 'cast');
        pulse(document.getElementById('lpOp'), 'shake');
      }, 300);
    }
  }
}
