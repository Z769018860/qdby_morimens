// 弥萨格轮盘的界面层：把引擎的确定性状态画成一张赌桌，并把玩家/对手的操作喂回去。
//
// 人机、同屏、好友房三种模式共用同一套渲染与动作管线——差别只有两点：
//   1) 谁在操作（人机＝AI 定时驱动，同屏＝当前行动的一方，好友房＝本机那一侧）；
//   2) 动作要不要发出去（好友房发，其它不发）。
// 所以「动作只有一条路」这件事必须守住：任何点击都走 doAction()，
// 一旦有人绕过它直接改状态，两台机器的 s 就会分叉，房间立刻不同步。
import { CHAR_ORDER, CHARS, POWER, CREATORS } from './gen.js';
import { ITEMS, ITEM_ORDER } from './items.js';
import {
  create, shoot, useItem, view, roundsFor, BEST_OF,
} from './engine.js';
import { aiStep, DIFFS } from './ai.js';
import { gainFor, effectiveDiff, foePool } from './rank.js';
import { progress as rankProgress, TIERS } from '../duel/tiers.js';
import * as net from './net.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const S = {
  mode: 'ai',
  diff: 'normal',
  best: 3,          // 赛制：3 = 三局两胜，5 = 五局三胜
  aiLv: 'normal',   // 这一场人机实际用的档位（段位会把难度抬上去）
  q: '',            // 选人搜索框
  tab: 'all',       // 选人筛选：all / 界域名 / creator
  pick: [null, null],
  picking: 0,
  expect: 1,        // 这一轮要选几个人（人机/好友房 1，同屏 2）
  s: null,          // 引擎状态
  me: 0,            // 本机是第几侧（好友房：房主 0、客人 1）
  viewer: 0,        // 这一屏以谁的眼睛在看（同屏＝当前行动方）
  net: null, room: null, peer: null,
  seq: 0, remoteSeq: 0, hiTimer: 0,
  token: 0,         // 每次重开 +1，用来作废上一局遗留的 AI 定时器
  busy: false,
  muted: false,
  stats: { w: 0, l: 0, streak: 0, best: 0, rp: 0, bestStreak: 0 },
};

// ---------------------------------------------------------------- 存档小工具
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 无痕模式 */ } };
// 存档键统一挂在 zjtt: 前缀下。js/gamestats.js（个人中心 / 云端档案摘要 / 首页排行榜）
// 读的是 zjtt:roulette:v1——第一版这里写成了裸 'roulette:v1'，于是战绩和段位分只存在本机，
// 上报时永远是空数组，榜单上也永远不会出现这个游戏。
const STATS_KEY = 'zjtt:roulette:v1';
const OLD_KEYS = { stats: 'roulette:v1', diff: 'roulette:diff', best: 'roulette:best', mute: 'roulette:mute' };
// 老版本写的是裸键：第一次读先看新键，没有就把旧值搬过来（旧键留着，回滚也不会丢）
function lsPick(k, oldK) {
  const v = lsGet(k);
  if (v != null) return v;
  const o = lsGet(oldK);
  if (o != null) lsSet(k, o);
  return o;
}

function loadStats() {
  try {
    const j = JSON.parse(lsPick(STATS_KEY, OLD_KEYS.stats) || '{}');
    S.stats = {
      w: j.w | 0, l: j.l | 0, streak: j.streak | 0, best: j.best | 0,
      rp: Math.max(0, j.rp | 0), bestStreak: j.bestStreak | 0,
    };
    // 老存档只有 w/l：段位分从 0 起算，连胜数沿用原来的
    if (!S.stats.bestStreak) S.stats.bestStreak = S.stats.best;
  } catch (e) { /* 存档坏了就当没有 */ }
}
function saveStats() {
  lsSet(STATS_KEY, JSON.stringify(S.stats));
}

// 银芯钱包：全站共用 zjtt:credits（有人写 JSON 数字、有人写裸数字，两种都认）
function walletGet() {
  const raw = lsGet('zjtt:credits');
  if (!raw) return 0;
  try { const v = Number(JSON.parse(raw)); if (Number.isFinite(v)) return Math.max(0, Math.round(v)); } catch (e) { /* 裸数字 */ }
  const v = parseInt(raw, 10);
  return Math.max(0, Number.isFinite(v) ? v : 0);
}
function walletAdd(n) {
  const add = Math.max(0, Math.round(n));
  if (!add) return;
  lsSet('zjtt:credits', String(walletGet() + add));
  document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
}

// ---------------------------------------------------------------- 音效（现场合成，不带音频文件）
const sfx = {
  ctx: null,
  on() { return !S.muted; },
  init() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { this.ctx = new C(); } catch (e) { return null; }
    }
    if (this.ctx.state === 'suspended') { try { this.ctx.resume(); } catch (e) { /* 用户还没交互 */ } }
    return this.ctx;
  },
  noise(dur, freq, peak) {
    const c = this.init();
    if (!c) return;
    const len = Math.round(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(peak, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0008, c.currentTime + dur);
    src.connect(flt).connect(g).connect(c.destination);
    src.start();
  },
  tone(freq, dur, type, peak) {
    const c = this.init();
    if (!c) return;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(peak || 0.12, c.currentTime + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  },
  blast() { if (this.on()) { this.noise(0.34, 1400, 0.5); this.tone(70, 0.26, 'sine', 0.35); } },
  dry() { if (this.on()) { this.noise(0.1, 2600, 0.14); this.tone(220, 0.06, 'square', 0.05); } },
  click() { if (this.on()) this.tone(320, 0.05, 'square', 0.06); },
  heal() { if (this.on()) { this.tone(660, 0.12, 'sine', 0.1); setTimeout(() => this.tone(880, 0.14, 'sine', 0.09), 90); } },
  bad() { if (this.on()) this.tone(150, 0.28, 'sawtooth', 0.12); },
  win() { if (this.on()) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'triangle', 0.1), i * 110)); },
  lose() { if (this.on()) [392, 330, 262].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.1), i * 150)); },
};

const vibrate = (n) => { try { if (navigator.vibrate) navigator.vibrate(n); } catch (e) { /* 不支持就算了 */ } };

// ---------------------------------------------------------------- 那把枪
function gunSVG() {
  return `<svg viewBox="0 0 240 76" fill="none" aria-hidden="true">
  <defs>
    <linearGradient id="gm" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4353"/><stop offset=".55" stop-color="#252a35"/><stop offset="1" stop-color="#141820"/>
    </linearGradient>
    <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5d4634"/><stop offset="1" stop-color="#31241a"/>
    </linearGradient>
  </defs>
  <g class="flash"><circle cx="14" cy="33" r="14" fill="#ffd27a" opacity=".85"/><circle cx="11" cy="33" r="6.5" fill="#fff"/></g>
  <rect x="18" y="26" width="130" height="13" rx="4" fill="url(#gm)" stroke="#4b5263" stroke-width="1.2"/>
  <rect x="18" y="39" width="130" height="5" rx="2.5" fill="#191c24" opacity=".85"/>
  <ellipse cx="19" cy="32.5" rx="3.4" ry="6.6" fill="#0a0c11" stroke="#5b6274" stroke-width="1.2"/>
  <ellipse cx="19" cy="32.5" rx="1.7" ry="3.4" fill="#000"/>
  <rect x="58" y="42" width="54" height="8" rx="3" fill="url(#gw)" stroke="#6b5138" stroke-width="1"/>
  <rect x="146" y="22" width="40" height="26" rx="5" fill="url(#gm)" stroke="#4b5263" stroke-width="1.2"/>
  <rect x="152" y="26" width="28" height="3" rx="1.5" fill="#e3b341" opacity=".5"/>
  <path d="M186 26q10-6 14 2l-4 5q-5-4-10-2z" fill="#3a4150" stroke="#5b6274" stroke-width="1"/>
  <path d="M186 34q26-6 40 6l6 18q-16 8-34 2l-16-10z" fill="url(#gw)" stroke="#6b5138" stroke-width="1.2"/>
  <path d="M160 48q0 12 12 12h6" stroke="#4b5263" stroke-width="3" stroke-linecap="round"/>
  <path d="M166 46q4 8 0 11" stroke="#7c8496" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

// ---------------------------------------------------------------- 屏切换
const SCREENS = ['home', 'pick', 'room', 'battle'];
function show(name) {
  for (const id of SCREENS) {
    const el = document.getElementById('scr-' + id);
    if (el) el.hidden = id !== name;
  }
  $('#sub').textContent = name === 'battle' ? `第 ${S.s ? S.s.round : 1} 局 · ${fmtBest(S.best)}`
    : name === 'pick' ? '选出战的唤醒体'
      : name === 'room' ? '好友房' : '一把枪、一膛子弹、两个人';
  if (name === 'home') renderHome();
  if (name === 'pick') renderPick();
}

// ---------------------------------------------------------------- 首页
const fmtBest = (b) => (Number(b) === 5 ? '五局三胜' : '三局两胜');

function rankCardHTML() {
  const p = rankProgress(S.stats.rp);
  const tier = p.tier;
  // 段位会把「看心情」往上抬：先告诉玩家这一档实际会打成什么样
  const eff = effectiveDiff(p.idx, S.diff);
  const effName = (DIFFS.find((d) => d.k === eff) || { n: '' }).n;
  return `<div class="rk" style="--rc:${tier.c}">
    <div class="rk-h">
      <b>${esc(tier.n)}</b>
      <span>${p.rp} 分</span>
    </div>
    <div class="rk-bar"><i style="width:${p.pct}%"></i></div>
    <div class="rk-n">${p.next ? `距「${esc(p.next.n)}」还差 <b>${p.left}</b> 分` : '已经是最高段位——命轮由你来转'}
      <span class="rk-eff">这一档人机实际按「${esc(effName || '普通')}」打</span></div>
  </div>`;
}

function renderHome() {
  $('#diffRow').innerHTML = '<span class="lb">人机难度</span>' + DIFFS.map((d) => (
    `<button type="button" data-diff="${d.k}" aria-pressed="${d.k === S.diff}" title="${esc(d.d)}">${esc(d.n)}</button>`
  )).join('');
  $('#bestRow').innerHTML = '<span class="lb">赛制</span>' + BEST_OF.map((b) => (
    `<button type="button" data-best="${b}" aria-pressed="${b === S.best}" title="${b === 5 ? '谁先赢三局' : '谁先赢两局'}">${fmtBest(b)}</button>`
  )).join('');
  $('#rankCard').innerHTML = rankCardHTML();
  const st = S.stats;
  const rate = st.w + st.l ? Math.round((st.w / (st.w + st.l)) * 100) : 0;
  $('#rec').innerHTML = st.w + st.l
    ? `人机战绩 <b>${st.w}</b> 胜 <b>${st.l}</b> 负（${rate}%）· 当前连胜 <b>${st.streak}</b> · 最高 <b>${st.bestStreak}</b> 连胜`
    : '还没有人机战绩。同屏与好友房不记账——那两样是跟人打的，不算数；段位也只认人机。';
}

// ---------------------------------------------------------------- 选人
function cardOf(id) { return CHARS[id]; }

// 选人筛选：界域（四个）＋ 主播，另配一个搜索框。73 个人一屏滚下来太长了。
const REALMS = ['混沌', '血肉', '深海', '超维'];
const TABS = [['all', '全部'], ...REALMS.map((r) => [r, r]), ['creator', '主播']];

function matchQuery(c, q) {
  if (!q) return true;
  const hay = [c.n, c.en || '', c.realm, c.role, c.passive.n, ...c.items.map((i) => ITEMS[i].n)].join('|').toLowerCase();
  return hay.indexOf(q) >= 0;
}

function pickList() {
  const q = S.q.trim().toLowerCase();
  return CHAR_ORDER.filter((id) => {
    const c = CHARS[id];
    if (S.tab === 'creator' && !c.creator) return false;
    if (S.tab !== 'all' && S.tab !== 'creator' && c.realm !== S.tab) return false;
    return matchQuery(c, q);
  });
}

function renderPick() {
  const need = S.expect;
  const idx = S.picking;
  $('#pickHint').innerHTML = need === 1
    ? `选一位出战的唤醒体——理智上限、随身道具和被动就是你这局的本钱。<span class="ph-n">共 ${CHAR_ORDER.length} 位：${CHAR_ORDER.length - CREATORS.length} 名唤醒体 + ${CREATORS.length} 位主播</span>`
    : `同屏双人：先给 <b>${idx === 0 ? '玩家一' : '玩家二'}</b> 选一位。`;
  $('#pickTabs').innerHTML = TABS.map(([k, n]) => (
    `<button type="button" data-tab="${k}" aria-pressed="${k === S.tab}">${esc(n)}</button>`
  )).join('');
  const ids = pickList();
  const grid = $('#pickGrid');
  grid.innerHTML = ids.length ? ids.map((id) => {
    const c = CHARS[id];
    const on = S.pick[idx] === id;
    const taken = need === 2 && S.pick[1 - idx] === id && idx === 1;
    return `<button class="pcard" type="button" data-pick="${id}" aria-pressed="${on}" ${taken ? 'disabled' : ''}>
      <img src="${c.face}" alt="" width="44" height="44" decoding="async">
      <div class="pm">
        <div class="pn">${esc(c.n)}${c.creator ? '<span class="cb">主播</span>' : ''}</div>
        <div class="pt">${esc(c.realm)} · ${esc(c.role)} · 理智 ${c.hp}</div>
        <div class="pp">${esc(c.passive.n)}：${esc(c.passive.d)}</div>
        <div class="php">随身：${c.items.map((i) => esc(ITEMS[i].n)).join(' / ')}</div>
      </div>
    </button>`;
  }).join('') : '<p class="hint" style="grid-column:1/-1">没搜到——换个字试试，或者点「全部」。</p>';
  $('#pickGo').disabled = !S.pick[idx];
  $('#pickGo').textContent = need === 1 ? '就她了'
    : (idx === 0 ? '下一位' : '开打');
  $('#pickBack').textContent = idx === 0 ? '返回' : '上一位';
  // 卡面上的被动被截成两行（73 张卡滚下来太长）：选中之后在吸底条里读全文
  const cur = S.pick[idx] ? CHARS[S.pick[idx]] : null;
  const info = $('#pickInfo');
  if (info) {
    info.innerHTML = cur
      ? `<b>${esc(cur.n)}</b> · ${esc(cur.realm)} · ${esc(cur.role)} · 理智 ${cur.hp} · 随身 ${cur.items.map((i) => esc(ITEMS[i].n)).join(' / ')}<br>
         <span class="pw">${esc(cur.passive.n)}</span>：${esc(cur.passive.d)}`
      : '点一张卡看她的被动全文——理智上限、随身道具和被动就是你这局的本钱。';
  }
}

function pickChar(id) {
  S.pick[S.picking] = id;
  renderPick();
  sfx.click();
}

// 人机挑人：段位越高，它挑的越靠前（scripts/roulette-power.mjs 量的胜率分位）。
// 和决斗链接的「对手按对位表挑牌组」是一回事——不给它加血，只让它选个更能打的。
function pickFoeId(myId) {
  const tier = rankProgress(S.stats.rp).idx;
  const pool = foePool(tier, POWER, CHAR_ORDER).filter((id) => id !== myId);
  const list = pool.length ? pool : CHAR_ORDER.filter((id) => id !== myId);
  return list[Math.floor(Math.random() * list.length)];
}

function pickNext() {
  if (!S.pick[S.picking]) return;
  if (S.picking < S.expect - 1) { S.picking += 1; renderPick(); sfx.click(); return; }
  if (S.mode === 'net') { openNetSheet(); return; }
  if (S.mode === 'hot') { startMatch([S.pick[0], S.pick[1]], 0); return; }
  const foeId = pickFoeId(S.pick[0]);
  // 段位会把人机档位往上抬（见 rank.js 的 floorFor）
  S.aiLv = effectiveDiff(rankProgress(S.stats.rp).idx, S.diff);
  startMatch([S.pick[0], foeId], 0);
}

// ---------------------------------------------------------------- 开局
function newSeed() { return ((Date.now() & 0x7fffffff) ^ (Math.random() * 0xffffffff)) >>> 0; }

function startMatch(chars, meSide) {
  S.s = create(newSeed(), chars, { best: S.best });
  S.me = meSide;
  S.token += 1;
  S.busy = false;
  hideOv();
  show('battle');
  renderBattle();
  afterAction();
}

// ---------------------------------------------------------------- 战场渲染
function chipHTML(it, mine) {
  const d = ITEMS[it.id];
  if (!mine) {
    return `<span class="chip mini c-${d.c}" title="${esc(d.n)}：${esc(d.d)}"><i>${esc(d.g)}</i></span>`;
  }
  return `<button class="chip c-${d.c}" type="button" data-uid="${it.uid}" title="${esc(d.n)}：${esc(d.d)}">
    <i>${esc(d.g)}</i><span>${esc(d.n)}</span></button>`;
}

function cardHTML(side) {
  const s = S.s;
  const c = CHARS[s.chars[side]];
  const hp = Math.max(0, s.hp[side]);
  const max = s.max[side];
  const pips = Array.from({ length: max }, (_, i) => `<i class="${i < hp ? 'on' : ''}"></i>`).join('');
  const bdg = [];
  if (s.shield[side]) bdg.push(`<i class="sh">护盾 ${s.shield[side]}</i>`);
  if (s.cuff[side]) bdg.push(`<i class="cf">镣铐 ${s.cuff[side]}</i>`);
  if (s.saw[side]) bdg.push(`<i class="sw">锯 +${s.saw[side]}</i>`);
  if (s.blood[side]) bdg.push('<i class="bl">血链</i>');
  if (s.mute[side]) bdg.push('<i class="mu">压制</i>');
  const items = s.items[side];
  // 自己的道具在下面那排「道具格」里已经有了一份，卡上只画对手的（省地方，也不重复）
  const chips = side === S.viewer ? ''
    : (items.length
      ? items.map((it) => chipHTML(it, false)).join('')
      : Array.from({ length: 2 }, () => '<span class="chip empty" aria-hidden="true"></span>').join(''));
  const acting = s.turn === side && s.phase === 'play';
  return `<img class="av" src="${c.face}" alt="" width="46" height="46" decoding="async">
    <div class="hf">
      <div class="nm"><b>${esc(c.n)}</b><span>${esc(c.realm)} · ${esc(c.role)}</span></div>
      <div class="pips">${pips}<span class="hpn">${hp}/${max}</span></div>
      ${bdg.length ? `<div class="bdgs">${bdg.join('')}</div>` : ''}
    </div>
    <div class="chips" data-side="${side}">${chips}</div>`;
}

function renderBattle() {
  const s = S.s;
  if (!s) return;
  // 同屏双人：谁的回合谁在下面（看着的人和操作的人是同一个）
  S.viewer = S.mode === 'hot' ? s.turn : S.me;
  const v = view(s, S.viewer);
  const foeSide = 1 - S.viewer;

  const foe = $('#foeCard'); const me = $('#meCard');
  foe.innerHTML = cardHTML(foeSide);
  me.innerHTML = cardHTML(S.viewer);
  foe.className = 'side' + (s.turn === foeSide && s.phase === 'play' ? ' acting' : '') + (s.hp[foeSide] <= 0 ? ' dead' : '');
  me.className = 'side' + (s.turn === S.viewer && s.phase === 'play' ? ' acting' : '') + (s.hp[S.viewer] <= 0 ? ' dead' : '');

  $('#nLive').textContent = v.live;
  $('#nBlank').textContent = v.blank;

  const tb = $('#turnBadge');
  const mine = s.turn === S.viewer;
  tb.className = 'turnbadge ' + (mine ? 'me' : 'foe');
  tb.textContent = s.phase === 'over' ? '结束'
    : (S.mode === 'hot' ? (mine ? '你的回合' : '对手回合') : (mine ? '你的回合' : '对手回合'));

  // 枪膛里还剩几颗：只把「本屏这个人知道的」点亮
  const know = s.know[S.viewer] || [];
  $('#rack').innerHTML = s.shells.map((_, i) => {
    const k = know[i];
    const cls = k === true ? 'seen live' : k === false ? 'seen blank' : '';
    return `<i class="${cls}" title="第 ${i + 1} 颗"></i>`;
  }).join('');

  // 道具格（只有自己的能点）
  $('#myChips').innerHTML = s.items[S.viewer].length
    ? s.items[S.viewer].map((it) => chipHTML(it, true)).join('')
    : '<span class="hint" style="font-size:11px">手上没有道具了</span>';

  const canShoot = s.phase === 'play' && s.turn === S.viewer && !S.busy;
  $('#shootSelf').disabled = !canShoot;
  $('#shootFoe').disabled = !canShoot;
  for (const b of $('#myChips').querySelectorAll('button[data-uid]')) {
    b.disabled = !canShoot;
  }

  const last = s.log[s.log.length - 1];
  const sayEl = $('#say');
  sayEl.textContent = last ? last.txt : '装填完毕。';
  sayEl.className = 'say ' + (last ? last.cls : '');

  $('#sub').textContent = `第 ${s.round} / ${s.rounds.length} 局 · ${fmtBest(s.best)} · ${s.wins[0]} : ${s.wins[1]}`;
}

// ---------------------------------------------------------------- 动画
function floatOn(sel, txt, cls) {
  const host = document.querySelector(sel);
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'float ' + (cls || '');
  el.textContent = txt;
  host.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

function gunFire() {
  const g = $('#gun');
  if (!g) return;
  g.classList.remove('fire');
  void g.offsetWidth;
  g.classList.add('fire');
}

function animate(ev) {
  const s = S.s;
  let shake = false;
  let hitSide = null;
  const floats = [];
  for (const e of ev) {
    if (e.t === 'shot') {
      gunFire();
      if (e.live) { shake = true; hitSide = e.side; sfx.blast(); vibrate(35); } else { sfx.dry(); }
    } else if (e.t === 'damage') {
      floats.push({ side: e.side, txt: `-${e.dmg}`, cls: 'dmg' });
      hitSide = e.side;
      if (!e.self && e.pill !== true) sfx.bad();
    } else if (e.t === 'heal' && e.n > 0) {
      floats.push({ side: e.side, txt: `+${e.n}`, cls: 'heal' });
      sfx.heal();
    } else if (e.t === 'peek') {
      const val = e.vals && e.vals.length ? e.vals[0] : null;
      if (val !== null && val !== undefined) {
        floatOn('.rack', val ? '实弹' : '空壳', 'info');
      }
    } else if (e.t === 'revive') {
      floats.push({ side: e.side, txt: '回环', cls: 'info' });
      sfx.heal();
    } else if (e.t === 'roundend' || e.t === 'over') {
      // 结算浮层在 afterAction 里统一弹
    }
  }
  renderBattle();
  if (shake) {
    document.body.classList.remove('shake');
    void document.body.offsetWidth;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
  }
  if (hitSide !== null) {
    const el = hitSide === S.viewer ? $('#meCard') : $('#foeCard');
    if (el) { el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  }
  for (const f of floats) {
    floatOn(f.side === S.viewer ? '#meCard' : '#foeCard', f.txt, f.cls);
  }
  if (s.phase === 'over') setTimeout(showResult, 700);
}

// ---------------------------------------------------------------- 动作
function doAction(a, remote) {
  const s = S.s;
  if (!s || s.phase !== 'play') return { ok: false };
  const side = s.turn;
  const r = a.t === 'shoot' ? shoot(s, side, a.target) : useItem(s, side, a.uid);
  if (!r.ok) {
    if (!remote) toast(r.err || '这一下不行');
    return r;
  }
  if (!remote && S.mode === 'net' && S.net) {
    S.seq += 1;
    S.net.send({ k: 'act', n: S.seq, a });
  }
  animate(r.ev);
  afterAction();
  return r;
}

// 一手指完之后收尾：谁该动就动，没人动就等人
function afterAction() {
  const s = S.s;
  if (!s) return;
  if (s.phase === 'over') {
    setTimeout(showResult, 900);
    return;
  }
  if (S.mode === 'ai' && s.turn !== S.me) driveAi();
}

function driveAi() {
  const s = S.s;
  if (S.mode !== 'ai' || !s || s.phase !== 'play' || s.turn === S.me) return;
  const tok = S.token;
  const a = aiStep(s, s.turn, S.aiLv || S.diff);
  if (!a) return;
  const delay = 520 + Math.round(Math.random() * 320);
  setTimeout(() => {
    if (tok !== S.token || !S.s || S.s.phase !== 'play' || S.s.turn === S.me) return;
    let r = a.t === 'shoot' ? shoot(S.s, S.s.turn, a.target) : useItem(S.s, S.s.turn, a.uid);
    if (!r.ok) r = shoot(S.s, S.s.turn, 'foe'); // 兜底：道具点不动就直接开枪
    if (!r.ok) return;
    animate(r.ev);
    afterAction();
  }, delay);
}

// ---------------------------------------------------------------- 结算
function showResult() {
  const s = S.s;
  if (!s || s.phase !== 'over') return;
  const ov = $('#ov');
  if (!ov.hidden) return;
  const win = s.winner === S.viewer;
  const hot = S.mode === 'hot';
  $('#ovk').textContent = hot ? '这一场' : (win ? '你赢了' : '你输了');
  const t = $('#ovt');
  t.textContent = hot ? `${CHARS[s.chars[s.winner]].n} 赢` : (win ? '活下来了' : '留在了桌上');
  t.className = 'big ' + (win || hot ? 'win' : 'lose');
  $('#ovs').innerHTML = `比分 <b>${s.wins[0]} : ${s.wins[1]}</b>　（${fmtBest(s.best)}）`;

  let tip = '';
  let rankHtml = '';
  if (S.mode === 'ai') {
    const rk0 = rankProgress(S.stats.rp);
    if (win) {
      S.stats.w += 1;
      S.stats.streak += 1;
      if (S.stats.streak > S.stats.bestStreak) S.stats.bestStreak = S.stats.streak;
      S.stats.best = S.stats.streak;
      const sweep = s.wins[1] === 0;
      // 五局三胜更长，银芯也多给一点
      const bonus = (S.best === 5 ? 5 : 3) + (sweep ? 2 : 0);
      walletAdd(bonus);
      tip = `银芯 +${bonus}${sweep ? '（横扫额外 +2）' : ''}。`;
      sfx.win();
    } else {
      S.stats.l += 1;
      S.stats.streak = 0;
      walletAdd(1);
      tip = '银芯 +1（输也有参与奖）。';
      sfx.lose();
    }
    // 段位分：只算人机。难度用的是「段位抬过之后」的实际档位，
    // 所以高段位选「看心情」也拿不到低难度的分。
    const gain = gainFor({
      win, diff: S.aiLv || S.diff, tier: rk0.idx, streak: S.stats.streak, best: S.best,
    });
    S.stats.rp += gain;
    saveStats();
    const rk = rankProgress(S.stats.rp);
    rankHtml = `<div class="rkg" style="--rc:${rk.tier.c}">
      <div class="rk-h"><b>${esc(rk.tier.n)}</b><span>段位 <b>+${gain}</b>${S.stats.streak > 1 ? ` · ${S.stats.streak} 连胜` : ''}</span></div>
      <div class="rk-bar"><i style="width:${rk.pct}%"></i></div>
      <div class="rk-n">${rk.idx > rk0.idx ? `<b class="up">升段！</b>` : ''}${rk.next ? `距「${esc(rk.next.n)}」还差 <b>${rk.left}</b> 分` : '已经是最高段位'}</div>
    </div>`;
    const rate = Math.round((S.stats.w / (S.stats.w + S.stats.l)) * 100);
    tip += ` 人机战绩 ${S.stats.w} 胜 ${S.stats.l} 负（${rate}%）。`;
  } else if (hot) {
    tip = '同屏双人不记账：换个人再来。';
    sfx.win();
  } else {
    tip = win ? '这一把算你跟朋友之间的账。' : '房间还在，让房主再开一局。';
    if (win) sfx.win(); else sfx.lose();
  }
  $('#ovd').textContent = tip;
  $('#ovRank').innerHTML = rankHtml;
  const again = $('#ovAgain');
  again.textContent = S.mode === 'net' ? '回大厅' : '再来一局';
  ov.hidden = false;
}

function hideOv() { $('#ov').hidden = true; }

// ---------------------------------------------------------------- 好友房
function openNetSheet() {
  const html = `
    <p>房间靠一个公共中继转消息，所以不用登录。房主先手；两个人各选自己的唤醒体。</p>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn pri" type="button" id="mkRoom">开一间房</button>
    </div>
    <h4>或者进朋友的房</h4>
    <div style="display:flex;gap:8px">
      <input id="joinCode" maxlength="5" placeholder="5 位房间码" style="flex:1;height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--line2);background:var(--bg2);color:var(--text);letter-spacing:.2em;text-transform:uppercase">
      <button class="btn ghost" type="button" id="doJoin" style="flex:0 0 88px">加入</button>
    </div>`;
  sheet('好友房', html);
  $('#mkRoom').onclick = () => { closeSheet(); hostRoom(); };
  $('#doJoin').onclick = () => {
    const code = net.normCode($('#joinCode').value);
    if (!code) { toast('房间码是 5 位，字母数字都行'); return; }
    closeSheet();
    joinRoom(code);
  };
}

function roomStateUI(txt, cls) {
  const st = $('#roomState');
  const dot = $('#roomDot');
  if (st) st.textContent = txt;
  if (dot) dot.className = cls || '';
}

function hostRoom() {
  const code = net.makeCode();
  S.room = { code, role: 'a', state: 'wait' };
  S.mode = 'net';
  show('room');
  $('#roomK').textContent = '把下面这个房间码念给朋友';
  $('#roomCode').textContent = code;
  roomStateUI('正在连中继…', '');
  S.net = net.connect(code, onNetMsg, onNetState);
  const hi = () => { if (S.room && S.room.state === 'wait' && S.net) S.net.send({ k: 'hi', role: 'a', ch: S.pick[0] }); };
  hi();
  clearInterval(S.hiTimer);
  S.hiTimer = setInterval(hi, 3000);
}

function joinRoom(code) {
  S.room = { code, role: 'b', state: 'wait' };
  S.mode = 'net';
  show('room');
  $('#roomK').textContent = '正在进这间房';
  $('#roomCode').textContent = code;
  roomStateUI('正在连中继…', '');
  S.net = net.connect(code, onNetMsg, onNetState);
  const hi = () => { if (S.room && S.room.state === 'wait' && S.net) S.net.send({ k: 'hi', role: 'b', ch: S.pick[0] }); };
  hi();
  clearInterval(S.hiTimer);
  S.hiTimer = setInterval(hi, 3000);
}

function onNetState(st) {
  if (!S.room) return;
  if (st === 'on') { if (S.room.state === 'wait') roomStateUI('房间里等对手进来…', ''); }
  if (st === 'err') roomStateUI('中继断了，正在重连…', 'bad');
}

function startNetGame(seed, chars, side) {
  clearInterval(S.hiTimer);
  S.hiTimer = 0;
  if (S.room) S.room.state = 'live';
  S.me = side;
  S.s = create(seed, chars, { best: S.best });
  S.token += 1;
  S.busy = false;
  S.remoteSeq = 0;
  hideOv();
  show('battle');
  renderBattle();
  afterAction();
}

function onNetMsg(p) {
  if (!p || !S.room) return;
  if (p.k === 'hi') {
    if (S.room.role === 'a' && p.role === 'b') {
      if (!CHARS[p.ch]) return;
      S.peer = p.ch;
      if (S.room.state !== 'wait') return;
      // 房主定种子、定双方唤醒体，然后先手
      const seed = newSeed();
      roomStateUI('对手进来了，开局！', 'ok');
      // 赛制由房主定，跟着 open 一起发过去
      S.net.send({ k: 'open', seed, a: S.pick[0], b: S.peer, best: S.best });
      startNetGame(seed, [S.pick[0], S.peer], 0);
    } else if (S.room.role === 'b' && p.role === 'a') {
      // 房主的握手：回一句，等他的 open
      S.net.send({ k: 'hi', role: 'b', ch: S.pick[0] });
      roomStateUI('房主在，等你进桌…', 'ok');
    }
    return;
  }
  if (p.k === 'open' && S.room.role === 'b') {
    if (!CHARS[p.a] || !CHARS[p.b]) { toast('对方的唤醒体不认识，可能是版本不一致'); return; }
    S.net.send({ k: 'ack' });
    S.best = Number(p.best) === 5 ? 5 : 3;   // 赛制以房主为准
    startNetGame(p.seed >>> 0, [p.a, p.b], 1);
    return;
  }
  if (p.k === 'act' && S.room.state === 'live') {
    if (p.n <= S.remoteSeq) return;
    S.remoteSeq = p.n;
    doAction(p.a, true);
    return;
  }
  if (p.k === 'bye') {
    toast('对手离开了房间');
    if (S.room) S.room.state = 'end';
    setTimeout(() => leaveRoom(), 900);
  }
}

function leaveRoom() {
  clearInterval(S.hiTimer);
  S.hiTimer = 0;
  if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 已经断了 */ } S.net.close(); }
  S.net = null; S.room = null; S.peer = null; S.s = null;
  S.token += 1;
  hideOv();
  show('home');
}

// ---------------------------------------------------------------- 说明弹层
function sheet(title, html) {
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
}
function closeSheet() { $('#sheet').hidden = true; }

function rulesHTML() {
  return `
  <h4>桌上那点事</h4>
  <ul>
    <li>开局前选赛制：<b>三局两胜</b>或<b>五局三胜</b>。每局开打前补满理智、重新发道具、重新装填。</li>
    <li>枪膛里的<b>实弹与空壳数量公开，顺序不知道</b>；打完一膛就按同样的数量重装、重洗。</li>
    <li><b>对自己开枪</b>：空壳＝不扣血，而且回合还归你，可以接着打（继续开枪或用道具）；实弹＝扣血，交回合。</li>
    <li><b>对对手开枪</b>：不管响没响，回合都交出去。</li>
    <li>道具只在自己的回合用，用道具<b>不消耗行动</b>——用完还能接着开枪。</li>
    <li>理智归零就输掉这一局；三局两胜先赢两局、五局三胜先赢三局的人赢下整场。</li>
    <li>先手逐局轮换：第一局房主 / 玩家一先手，第二局换人，第三局再换回来。</li>
  </ul>
  <h4>每局的子弹</h4>
  <div class="rulelist">
    ${roundsFor(3).map((r, i) => `<div class="row"><i>${i + 1}</i><div><b>三局两胜 · 第 ${i + 1} 局</b><span>　${r.live} 实弹 + ${r.blank} 空壳，双方各摸 ${r.items} 件道具</span></div></div>`).join('')}
    ${roundsFor(5).map((r, i) => `<div class="row"><i>${i + 1}</i><div><b>五局三胜 · 第 ${i + 1} 局</b><span>　${r.live} 实弹 + ${r.blank} 空壳，双方各摸 ${r.items} 件道具</span></div></div>`).join('')}
  </div>
  <h4>段位</h4>
  <p>只有人机对战记段位分（同屏和好友房不记）。段位表与「唤醒王：决斗链接」共用一套：见习守密人 → 铜钥级 → 银钥级 → 金印级 → 白夜级 → 命轮师 → 界域传说 → 唤醒大师 → 唤醒王。段位越高，人机至少按更高的档位打，也会挑更能打的唤醒体出场；输一局会给一点读档分，不会掉段。</p>
  <h4>道具</h4>
  <div class="rulelist">${ITEM_ORDER.map((id) => {
    const d = ITEMS[id];
    return `<div class="row"><i style="color:var(--gold)">${esc(d.g)}</i><div><b>${esc(d.n)}</b><span>　${esc(d.d)}</span></div></div>`;
  }).join('')}</div>
  <h4>唤醒体</h4>
  <div class="rulelist">${CHAR_ORDER.map((id) => {
    const c = CHARS[id];
    return `<div class="row"><i>${c.hp}</i><div><b>${esc(c.n)}</b><span>　理智 ${c.hp} · 随身 ${c.items.map((x) => esc(ITEMS[x].n)).join('、')} · ${esc(c.passive.n)}：${esc(c.passive.d)}</span></div></div>`;
  }).join('')}</div>
  <h4>好友房</h4>
  <p>房间码 5 位（去掉了 I O 0 1，念出来不会错）。房间靠公共中继转发消息，两边只传「动作」，不传整局状态——所以断线重连不会让两边算错账。同屏双人是「明牌」：窥镜看出来的东西两个人都会看见，这一点在同一个屏幕上没法藏。</p>`;
}

function itemsHTML() {
  const cls = { info: 'var(--blue)', heal: 'var(--green)', atk: 'var(--red2)', ctrl: 'var(--violet)', util: 'var(--gold)' };
  return `<p>通用道具每局从池子里随机摸；专属道具只会跟着对应唤醒体上场，不进随机池。</p>
  <div class="rulelist">${ITEM_ORDER.map((id) => {
    const d = ITEMS[id];
    const own = CHAR_ORDER.filter((c) => CHARS[c].items.indexOf(id) >= 0);
    return `<div class="row"><i style="color:${cls[d.c] || 'var(--gold)'}">${esc(d.g)}</i>
      <div><b>${esc(d.n)}</b>${own.length ? `<span style="color:var(--dim2)">（${own.length} 人随身：${own.slice(0, 3).map((c) => esc(CHARS[c].n)).join('、')}${own.length > 3 ? ' 等' : ''}）</span>` : ''}
      <span><br>${esc(d.d)}</span></div></div>`;
  }).join('')}</div>`;
}

// ---------------------------------------------------------------- 小提示条
let toastTimer = 0;
function toast(txt) {
  const el = $('#toast');
  el.textContent = txt;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
}

// ---------------------------------------------------------------- 事件绑定
function bind() {
  for (const b of document.querySelectorAll('.mode')) {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      S.mode = mode;
      S.pick = [null, null];
      S.picking = 0;
      S.expect = mode === 'hot' ? 2 : 1;
      sfx.init(); sfx.click();
      show('pick');
    });
  }
  $('#diffRow').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-diff]');
    if (!b) return;
    S.diff = b.dataset.diff;
    lsSet('zjtt:roulette:diff', S.diff);
    renderHome(); sfx.click();
  });
  $('#bestRow').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-best]');
    if (!b) return;
    S.best = Number(b.dataset.best) === 5 ? 5 : 3;
    lsSet('zjtt:roulette:best', String(S.best));
    renderHome(); sfx.click();
  });
  $('#pickTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    S.tab = b.dataset.tab;
    S.picking = S.picking; // 选到一半换筛选不影响已选的人
    renderPick(); sfx.click();
  });
  $('#pickSearch').addEventListener('input', (e) => {
    S.q = e.target.value || '';
    renderPick();
  });
  $('#pickGrid').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-pick]');
    if (!b) return;
    pickChar(b.dataset.pick);
  });
  $('#pickGo').addEventListener('click', () => { sfx.click(); pickNext(); });
  $('#pickBack').addEventListener('click', () => {
    sfx.click();
    if (S.picking > 0) { S.picking -= 1; renderPick(); } else { S.pick = [null, null]; show('home'); }
  });

  $('#shootSelf').addEventListener('click', () => { sfx.init(); doAction({ t: 'shoot', target: 'self' }); });
  $('#shootFoe').addEventListener('click', () => { sfx.init(); doAction({ t: 'shoot', target: 'foe' }); });
  $('#myChips').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-uid]');
    if (!b) return;
    sfx.init();
    doAction({ t: 'item', uid: Number(b.dataset.uid) });
  });

  $('#btnRules').addEventListener('click', () => sheet('怎么玩', rulesHTML()));
  $('#btnRule2').addEventListener('click', () => sheet('怎么玩', rulesHTML()));
  $('#btnItems').addEventListener('click', () => sheet('道具图鉴', itemsHTML()));
  $('#btnItems2').addEventListener('click', () => sheet('道具图鉴', itemsHTML()));
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') closeSheet(); });

  $('#btnMute').addEventListener('click', () => {
    S.muted = !S.muted;
    lsSet('zjtt:roulette:mute', S.muted ? '1' : '');
    $('#btnMute').classList.toggle('off', S.muted);
    if (!S.muted) { sfx.init(); sfx.click(); }
  });

  $('#ovAgain').addEventListener('click', () => {
    hideOv();
    if (S.mode === 'net') { leaveRoom(); return; }
    if (S.mode === 'hot') { S.picking = 0; S.expect = 2; S.pick = [null, null]; show('pick'); return; }
    // 人机：同一对人马换个种子再打
    const chars = S.s ? [S.s.chars[0], S.s.chars[1]] : null;
    if (chars) startMatch(chars, S.me); else show('home');
  });

  $('#roomCopy').addEventListener('click', () => {
    const code = S.room ? S.room.code : '';
    if (!code) return;
    const done = () => toast('房间码已复制：' + code);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => toast('复制失败，手动念一下：' + code));
    } else toast('房间码：' + code);
  });
  $('#roomQuit').addEventListener('click', leaveRoom);

  window.addEventListener('beforeunload', () => {
    if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 来不及了 */ } }
  });
}

// ---------------------------------------------------------------- 启动
export function mount() {
  loadStats();
  S.muted = lsPick('zjtt:roulette:mute', OLD_KEYS.mute) === '1';
  $('#btnMute').classList.toggle('off', S.muted);
  const d = lsPick('zjtt:roulette:diff', OLD_KEYS.diff);
  if (DIFFS.some((x) => x.k === d)) S.diff = d;
  const b = Number(lsPick('zjtt:roulette:best', OLD_KEYS.best));
  S.best = b === 5 ? 5 : 3;

  $('#gun').innerHTML = gunSVG();
  $('#heroGun').innerHTML = gunSVG();

  bind();
  renderHome();
  show('home');
  const boot = document.getElementById('boot');
  if (boot) boot.remove();
}
