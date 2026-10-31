import { potLabel, POT_VALUES, potGroup, potRank } from './pot.js';
import { $, h, store, loadDict, imgEl, wan, nav, KINDS, kindName, KW, KW_TYPE, renderText, t, nameOf, lang,
  wallet, failedBank, unlocked, REPLAY, shareCode, markDirty, statsOf, scIcon, scNum, emptyState, sha256 } from './common.js';
import { PEPPER } from './pepper.js';
import { bank } from './bank.js';
import { auth, openLogin } from './auth.js';
import { account } from './account.js';
import * as likes from './likes.js';
import { checkinBar } from './checkin.js';

const sOnly = () => store.get('detectiveSOnly', false);
const matchesThreat = p => !sOnly() || /^S{1,3}$/.test(p.threat || '');

const KW_TYPE_EN = { realm: 'Realm', mechanic: 'State / Mechanic', tag: 'Tag', help: 'Help' };

const MAX_TRIES = 6;
const HINT_COST = 6;       // 卡位提示与队伍级线索的基础价
const POINT_BASE = 8;      // 答对的基础积分
// 难度越高，信息越值钱：同一份提示在更高档位按倍数加价（入门不打折）
const LV_COST_MUL = { 1: 1, 2: 1.25, 3: 1.6, 4: 2 };
const priceOf = (base) => Math.max(1, Math.round(base * (LV_COST_MUL[level] || 1)));
const LEVELS = {
  1: { name: () => t('lv1'), desc: () => t('lv1d') },
  2: { name: () => t('lv2'), desc: () => t('lv2d') },
  3: { name: () => t('lv3'), desc: () => t('lv3d') },
  4: { name: () => t('lv4'), desc: () => t('lv4d') },
};
const LETTERS = ['A', 'B', 'C', 'D'];
const EMO = { g: '🟩', y: '🟨', n: '⬛', '': '⬜' };

// ------------------------------------------------------------------ user profile
// 本机档案：只保留「偏好唤醒体」。昵称/头像属于账号，放个人中心。
let profile = store.get('profile', { favs: [] });
if (!Array.isArray(profile.favs)) profile.favs = [];
delete profile.name;
function saveProfile() { store.set('profile', profile); markDirty('profile'); }

document.body.prepend(nav('game'));
const root = $('#app');
// detective.html 里已经放了静态占位（转圈 + 「正在载入数据…」），到这一步说明
// 模块已经跑起来了，占位继续留着，别把它抹成一行干字——首屏观感差别很大。
if (!document.getElementById('boot')) root.textContent = t('loading');

// 启动数据：boot.json（索引 / 标签 / 关键词）先到，拿到它就能开始取题库分片；
// dict.json（图鉴字典）大得多，和分片并行下载，谁也不等谁。
// window.__boot 是 HTML 里先开拉的同一批请求，直接复用，不会重复下载。
const bootData = ((typeof window !== 'undefined' && window.__boot) || {}).data
  || fetch('data/boot.json').then(r => r.json());
let dictRes;
let RELIC_TAGS = {};
let firstPuzzle = null;
try {
  const bd = await bootData;
  RELIC_TAGS = bd.tags || {};
  await bank.load(bd.bank);
  // 索引到手就先把「今天这道题」的分片请求发出去，别等 520KB 的字典
  firstPuzzle = dailyPuzzle();
  firstPuzzle.catch(() => {});
  dictRes = await loadDict();
} catch (e) {
  // 慢网/断网时别停在「载入中」不动，给个能重试的界面
  console.error('初始化失败', e);
  root.replaceChildren(h('div', { class: 'card' },
    h('p', {}, t('loadFail')),
    h('button', { class: 'btn', onclick: () => location.reload() }, t('retry'))));
  throw e;
}
const { D, idx } = dictRes;

// 自建题目（创意工坊）以 team 明文存在本地，与官方题库一起参与随机
const customPuzzles = () => store.get('myPuzzles', []);

// 失败题库里的题不再出现；难度档对应不同的题目难度带（入门只出简单题，大师只出难题）
const LV_RANGE = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [3, 4] };
// 题池里放的是索引条目 { id, diff, core, c }，不是题目本身——
// 题目要在真正抽中之后才去取它所在的那一片。
function basePool() {
  const all = bank.items().filter(matchesThreat);
  const ok = all.filter(p => !failedBank.has(p.id));
  const src = ok.length > 8 ? ok : all;
  const [lo, hi] = LV_RANGE[level] || [1, 4];
  const band = src.filter(p => p.diff >= lo && p.diff <= hi);
  return (band.length >= 12 ? band : src).concat(customPuzzles().filter(matchesThreat));
}
// 每天一题只在核心题库里挑（核心 = 原来的 puzzles.json，顺序和以前一致，
// 所以同一天抽到的题跟改造前是同一道）
function corePool() {
  const core = bank.coreItems().filter(matchesThreat);
  const ok = core.filter(p => !failedBank.has(p.id));
  return ok.length ? ok : core;
}

// 随机抽题：从当前难度带（含自建题）里挑，再取那一片
const pickAny = async () => {
  const l = basePool();
  if (!l.length) throw new Error('题池为空');
  const e = l[Math.floor(Math.random() * l.length)];
  if (e && e.team) return e;                 // 自建题：本地就是明文
  const p = await bank.fetchPuzzle(e.id);
  if (!p) throw new Error('题目加载失败');
  bank.warm(e.id);
  return p;
};

// 题目的积分价值：难度分越高给得越多
const ptsOf = (p) => Math.round(POINT_BASE + (p.diffScore || 20) * 1.2);

// ------------------------------------------------------------------ state
let puzzle, ans, level, mode, sel, fb, history, hintsUsed, finished, won, pickerKind;
// 交换模式：点了某个已选卡位后记下它的序号，再点另一个卡位就互换内容（null = 没在交换）
let swapFrom = null;
level = store.get('level', 1);
mode = 'daily';

// 这几个是函数声明（不是 const 箭头函数）：启动时要在字典下完之前就把分片请求发出去，
// 那时候 const 还处在 TDZ 里，调用会直接抛 ReferenceError。
function todayKey() {
  const d = new Date(Date.now() + 8 * 3600e3); // UTC+8, same as the leaderboard
  return d.toISOString().slice(0, 10);
}
function dayNumber() { return Math.floor((Date.now() + 8 * 3600e3) / 864e5); }
async function dailyPuzzle() {
  const list = corePool();
  if (!list.length) throw new Error('题库为空');
  const from = (dayNumber() * 7919) % list.length;
  // 每日题若已进失败题库，顺延到下一题
  for (let i = 0; i < list.length; i++) {
    const e = list[(from + i) % list.length];
    if (failedBank.has(e.id)) continue;
    const p = await bank.fetchPuzzle(e.id);
    if (p) { bank.warm(e.id); return p; }
  }
  return bank.fetchPuzzle(list[from].id);
}

function newSel() {
  return {
    slots: LETTERS.map(() => ({ awk: null, wheels: [null, null], cov: null, pot: null })),
    key: null, relics: [],
  };
}

// answers ship obfuscated (see scripts/build_data.py); this keeps them out of plain sight, nothing more
// 密钥流用 common.js 的 sha256：crypto.subtle 不可用（http / 老内置浏览器）时自动走纯 JS，
// 否则手机上会「题目解码失败」、一题都出不来。
async function unseal(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), c => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 32) {
    const ks = await sha256(`${PEPPER}|${p.id}|${i / 32}`);
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('题目解码失败');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function start(p0, m) {
  // p0 既可以是题目对象，也可以是「还在加载中」的 promise（抽题要先取分片）
  let p;
  try {
    p = await unseal(await p0);
  } catch (e) {
    console.error('题目加载失败', e);
    toast(t('loadFail'));
    return;
  }
  puzzle = p; mode = m;
  ans = p.team; // already sorted by damage desc: slot A = top damage
  sel = newSel(); fb = {}; history = []; hintsUsed = 0; finished = false; won = false; swapFrom = null;
  loadClues();
  if (m === 'daily') {
    const saved = store.get(`daily:${todayKey()}:${level}${sOnly() ? ":S" : ""}`, null);
    if (saved) {
      sel = saved.sel; history = saved.history; hintsUsed = saved.hintsUsed;
      finished = saved.finished; won = saved.won; fb = saved.fb || {};
    }
  }
  // 固有造物现在由题面直接给出：老存档里如果填过它，得剔掉，否则会被倒扣分
  if (Array.isArray(sel.relics)) sel.relics = sel.relics.filter(id => !isInnateRelic(id));
  if (p.custom) loadLike(p.id);
  // 开局线索：把这一档白送的那几条直接摊开（已经答完的局就不再弹提示）
  const gift = grantGift();
  render();
  if (gift && !finished) setTimeout(() => toast(t('giftToast', { n: gift })), 350);
}

function persist() {
  if (mode !== 'daily') return;
  store.set(`daily:${todayKey()}:${level}${sOnly() ? ":S" : ""}`, { sel, history, hintsUsed, finished, won, fb });
}

// ------------------------------------------------------------------ evaluation
function active() {
  // 主线题（kind=mainline）没有命轮/密契快照，永远不要求填这两项
  const ml = puzzle && puzzle.kind === 'mainline';
  return {
    wheels: level >= 2 && !ml,
    cov: level >= 3 && !ml,
    key: level >= 3, pot: level >= 4, relics: level >= 4,
  };
}

function evaluate() {
  const A = active();
  const teamIds = ans.map(a => a.tid);
  const r = { slots: [], key: null, relics: [], green: 0, total: 0 };
  const count = (state) => { r.total++; if (state === 'g') r.green++; };
  sel.slots.forEach((g, k) => {
    const a = ans[k];
    const s = { awk: null, wheels: [], cov: null, pot: null };
    s.awk = g.awk == null ? 'n' : g.awk === a.tid ? 'g' : teamIds.includes(g.awk) ? 'y' : 'n';
    count(s.awk);
    if (A.wheels) {
      const left = [...a.wheels];
      const others = ans.filter((_, j) => j !== k).flatMap(x => x.wheels);
      g.wheels.forEach((w, i) => {
        // 真实战报里有人只带 1 件命轮：那一格空对空，不应算作失误
        if (i >= a.wheels.length) {
          if (w != null) { s.wheels.push('n'); count('n'); }
          else s.wheels.push('');
          return;
        }
        let st = 'n';
        if (w != null) {
          const j = left.indexOf(w);
          if (j >= 0) { st = 'g'; left.splice(j, 1); } else if (others.includes(w)) st = 'y';
        }
        s.wheels.push(st); count(st);
      });
    }
    if (A.cov) {
      s.cov = g.cov == null ? 'n' : g.cov === a.cov ? 'g' : ans.some((x, j) => j !== k && x.cov === g.cov) ? 'y' : 'n';
      count(s.cov);
    }
    if (A.pot) {
      if (g.pot == null) s.pot = { st: 'n', dir: '' };
      else {
        // 按「档」比：+1~+3、+5~+11 各算一档；相邻一档算接近（黄）
        const d = potRank(a.pot) - potRank(g.pot);
        s.pot = { st: d === 0 ? 'g' : Math.abs(d) <= 1 ? 'y' : 'n', dir: d > 0 ? '↑' : d < 0 ? '↓' : '' };
      }
      count(s.pot.st);
    }
    r.slots.push(s);
  });
  if (A.key) { r.key = sel.key == null ? 'n' : sel.key === puzzle.key ? 'g' : 'n'; count(r.key); }
  if (A.relics) {
    // 固有造物已经白送了，不算字段；只判定玩家需要补的那部分
    const need = fillRelics();
    const want = new Set(need);
    sel.relics.forEach(x => r.relics.push(want.has(x) ? 'g' : 'n'));
    need.forEach(x => { r.total++; if (sel.relics.includes(x)) r.green++; });
    sel.relics.forEach(x => { if (!want.has(x)) r.total++; });
  }
  r.win = r.green === r.total;
  return r;
}

function fillFeedback(r) {
  fb = {};
  r.slots.forEach((s, k) => {
    const g = sel.slots[k];
    fb[`awk${k}`] = { v: g.awk, c: s.awk };
    s.wheels.forEach((st, i) => { fb[`w${k}${i}`] = { v: g.wheels[i], c: st }; });
    if (s.cov) fb[`cov${k}`] = { v: g.cov, c: s.cov };
    if (s.pot) fb[`pot${k}`] = { v: g.pot, c: s.pot.st, dir: s.pot.dir };
  });
  if (r.key) fb.key = { v: sel.key, c: r.key };
  r.relics.forEach((st, i) => { fb[`rel${sel.relics[i]}`] = { v: sel.relics[i], c: st }; });
}

function emojiRow(r) {
  const A = active();
  let s = r.slots.map(x => EMO[x.awk]).join('');
  if (A.wheels) s += ' ' + r.slots.map(x => x.wheels.map(w => EMO[w]).join('')).join('|');
  if (A.cov) s += ' ' + r.slots.map(x => EMO[x.cov]).join('');
  if (A.key) s += ' ' + EMO[r.key];
  if (A.pot) s += ' ' + r.slots.map(x => EMO[x.pot.st]).join('');
  if (A.relics) s += ` 🧪${r.relics.filter(x => x === 'g').length}/${fillRelics().length}`;
  return s;
}

function submit() {
  if (finished) return;
  if (sel.slots.some(s => s.awk == null)) { toast(t('fillAll')); return; }
  if (new Set(sel.slots.map(s => s.awk)).size < 4) { toast(t('noDup')); return; }
  const r = evaluate();
  fillFeedback(r);
  history.push({ row: emojiRow(r), frac: r.green / r.total, green: r.green, total: r.total });
  if (r.win) { finished = true; won = true; } else if (history.length >= MAX_TRIES) { finished = true; won = false; }
  if (finished) {
    recordStats();
    if (won) {
      // 按难度给分；提示已经扣过分，这里只结算答对奖励
      const gain = ptsOf(puzzle);
      wallet.add(gain);
      if (mode === 'daily') {
        const st = statsOf();
        st.pts = (st.pts || 0) + gain;
        store.set('stats', st);
      }
      toast(t('ptsGain', { n: gain }));
    } else {
      // 彻底失败：永久移出题池
      failedBank.add(puzzle.id);
    }
    // 每一局（每日/随机/自建/工坊导入）都记进账号档案
    const { score, g } = grade();
    const last = history[history.length - 1];
    account.record({
      i: puzzle.id, m: mode, l: level, w: won ? 1 : 0, tr: history.length,
      sc: score, g, h: hintsUsed, f: [last.green, last.total],
      u: puzzle.uuid || '', ti: puzzle.title || '',
    });
  }
  persist();
  render();
}

function grade() {
  const last = history[history.length - 1];
  const frac = last ? last.frac : 0;
  const base = won ? 100 : Math.round(frac * 70);
  const score = Math.max(0, base - 8 * (history.length - 1) * (won ? 1 : 0) - 5 * hintsUsed);
  const g = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 30 ? 'C' : 'D';
  return { score, g };
}

function recordStats() {
  const st = statsOf();
  // 同一道题只计一次，避免反复刷统计
  if ((mode === 'daily' && st.last === todayKey() + ':' + level) || account.history().some(e => e.i === puzzle.id)) return;
  st.played++;
  if (mode === 'daily') st.last = todayKey() + ':' + level;
  if (won) {
    st.won++;
    if (mode === 'daily') { st.streak++; st.best = Math.max(st.best, st.streak); }
  } else if (mode === 'daily') st.streak = 0;
  // 准确率：统计命中的字段数 / 总字段数（最后一条历史记录的 frac）
  const last = history[history.length - 1];
  if (last && last.total != null) { st.fields = (st.fields || 0) + last.green; st.totalFields = (st.totalFields || 0) + last.total; }
  store.set('stats', st);
}

// ------------------------------------------------------------------ 线索
// 启灵（replay 里的 potencyLevel，0..15）：0~3 启、+1~+3、超限、+5~+11、+12（最终法则），见 js/pot.js。
// 以前这里叫「灵塑」并直接显示 0..15 的裸数字；「灵塑」是另一个东西（天赋里的 soulforge 等级，题库里没有这个字段）。
const potTxt = (n) => potLabel(n, lang.cur === 'en');
// 线索分两类：卡位上的（阵营、定位、等级）和队伍级的（钥令、内在灵格、灵塑、养成、助战、极值），
// 以及按位解锁的命轮 / 密契。
// 队伍级线索全部按当前这道题的真实数据算，没有数据的条目直接不出现；解锁状态按题存在本机。
const REALM_EN = { CHAOS: 'Chaos', CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra', FADED_LEGACY: 'Faded Legacy' };
// 钥令/命轮只带中文阵营名（没有 realmCode），英文界面下按官方译名兜底
const REALM_ZH2EN = { 深海: 'Aequor', 混沌: 'Chaos', 血肉: 'Caro', 超维: 'Ultra', 褪色遗产: 'Faded Legacy', 通用: 'Universal', 其他: 'Other' };
const ROLE_EN = { ASSAULT: 'Damage', WARDEN: 'Defense', CHORUS: 'Support' };
const realmOf = (e) => (!e ? '—' : lang.cur === 'en' ? (REALM_EN[e.realmCode] || REALM_ZH2EN[e.realm] || e.realm) : e.realm);
const roleOf = (e) => (!e ? '—' : lang.cur === 'en' ? (ROLE_EN[e.roleCode] || e.role) : e.role);

let opened = new Set();
const clueStoreKey = () => `clues:${puzzle.id}`;
// 第二版按位线索（会点名位置的命轮 / 密契）的旧价，用来退款
const LEGACY_WHEEL_COST = [8, 10, 12, 14];
const LEGACY_COV_COST = [6, 8, 10, 12];
function loadClues() {
  const list = store.get(clueStoreKey(), null);
  const raw = new Set(Array.isArray(list) ? list : []);
  // 老版本买过的提示按新结构折算，别让人白花银芯：
  //   阵营·定位（a{k}）→ 只留阵营（r{k}），定位需要重新解锁
  //   等级/突破（c:lv）→ 内在灵格（c:brk）
  // 旧的按位命轮 / 密契（c:wheel{k}、c:cov{k}、c:wheel）语义已变（现在只报出现、
  // 不报位置），直接原价退回银芯，让玩家按新规则重新挑。
  let changed = false;
  let refund = 0;
  for (const key of [...raw]) {
    const m = /^a(\d)$/.exec(key);
    if (m) {
      raw.delete(key);
      raw.add(`r${m[1]}`);
      changed = true;
      continue;
    }
    if (key === 'c:lv') {
      raw.delete(key);
      raw.add('c:brk');
      changed = true;
      continue;
    }
    const w = /^c:wheel(\d)?$/.exec(key);
    if (w) {
      raw.delete(key);
      refund += w[1] == null ? 8 : (LEGACY_WHEEL_COST[+w[1]] || 8);
      changed = true;
      continue;
    }
    const c = /^c:cov(\d)$/.exec(key);
    if (c) {
      raw.delete(key);
      refund += LEGACY_COV_COST[+c[1]] || 6;
      changed = true;
    }
  }
  opened = raw;
  if (changed) store.set(clueStoreKey(), [...raw]);
  if (refund) { wallet.add(refund); toast(t('ptsRefund', { n: refund })); }
}
function openClue(key) {
  opened.add(key);
  store.set(clueStoreKey(), [...opened]);
  persist();
}
const isOpen = (key) => opened.has(key);

// ------------------------------------------------------------------ 开局线索
// 除「入门」外的三档被反馈太硬，所以每档开局白送几条最贵的线索
// （不是打折、不是提示次数，是直接摊开在桌上，开局就能看）：
//   进阶：命轮 ×3
//   老手：命轮 ×4 + 密契 ×2
//   大师：命轮 ×4 + 密契 ×2 + 造物 ×3 + 潜能（灵塑）汇总 ×1
// 命轮线索本身是按题目 id 打散过的，送的这几条不会固定落在 A 位。
const OPEN_GIFT = {
  2: { wheel: 3 },
  3: { wheel: 4, cov: 2 },
  4: { wheel: 4, cov: 2, relic: 3, pot: 1 },
};
let giftKeys = new Set();

function grantGift() {
  giftKeys = new Set();
  const g = OPEN_GIFT[level];
  if (!g) return 0;
  const L = clueList();
  const ids = [];
  const take = (arr, n) => { for (const c of (arr || []).slice(0, n || 0)) ids.push(c.id); };
  take(L.slots.filter(c => c.group === 'wheel'), g.wheel);
  take(L.slots.filter(c => c.group === 'cov'), g.cov);
  take(L.relics, g.relic);
  take(L.team.filter(c => c.id === 'pot'), g.pot);
  let fresh = 0;
  for (const id of ids) {
    const key = `c:${id}`;
    if (!opened.has(key)) { opened.add(key); fresh++; }
    giftKeys.add(key);          // 已经买过的那条也标上「赠送」，不然玩家会以为白送没生效
  }
  if (ids.length) store.set(clueStoreKey(), [...opened]);
  return fresh;
}

// 传进来的都是「基础价」，实际扣费按当前难度档乘以系数
function payHint(base = HINT_COST) {
  const cost = priceOf(base);
  if (!wallet.spend(cost)) { toast(t('noCredits')); return false; }
  hintsUsed++;
  toast(t('ptsHint', { n: cost }));
  return true;
}

// 卡位提示：阵营、定位、等级各一条（「内在灵格」属队伍级线索，见 clueList）
const slotRealm = (k) => realmOf(idx.awakener.get(ans[k].tid));
const slotRole = (k) => roleOf(idx.awakener.get(ans[k].tid));
const slotLv = (k) => `${t('lvTag')} ${ans[k].lv}`;
const wheelIds = (k) => (ans[k].wheels || []);
const wheelName = (id) => nameOf(idx.wheel.get(String(id))) || String(id);
const covNameOf = (id) => {
  const e = idx.covenant.get(String(id));
  return e ? nameOf(e) : '—';
};

// 造物：融灾里固有造物是「开局第一个造物 + 那一期的戒指」，两件都写在题面上、不用玩家填；
// 玩家只需要补齐剩下那些。老题库（自建题 / 早期题）没有 inn 字段时，退回按「维度影像」判定。
const INNATE_KIND = '维度影像';
const creationOf = (id) => idx.creation.get(String(id)) || null;
// 造物说明书原文（中文库；英文界面也读这份，宁可中文也别不给）
const relicDesc = (id) => {
  const e = creationOf(id);
  return e ? (e.desc || []).map(x => (x && x.t) || '').join(' ') : '';
};
const relicRarity = (id) => ((creationOf(id) || {}).rarity || '');
// 锈蚀钥匙（13829）是主线开门用的道具，不属于配装造物：不进题面、不进造物栏、也不计入件数。
// 老存档 / 外部导入的题里可能还留着，所以取列表时就地过滤一遍。
const NON_RELIC_IDS = new Set(['13829']);
const isNonRelic = (id) => NON_RELIC_IDS.has(String(id));
const relOf = (p) => (p.relics || []).filter(id => !isNonRelic(id));
const relicList = () => relOf(puzzle);
// 固有造物 = 开局第一件 + 那一期的戒指，只认前两件；维度影像不算固有（它们归「维度影像」线索，一次解锁一个）。
// 老题库没有 inn 字段时，退回「造物列表的前两件」。
const innateIds = () => (Array.isArray(puzzle.inn) && puzzle.inn.length
  ? puzzle.inn.map(String).slice(0, 2)
  : relicList().slice(0, 2).map(String));
const isDimImage = (id) => (creationOf(id) || {}).kind === INNATE_KIND;
const isInnateRelic = (id) => innateIds().includes(String(id));
const innateRelics = () => relicList().filter(id => isInnateRelic(id));
const fillRelics = () => relicList().filter(id => !isInnateRelic(id));
const relicTags = (id) => RELIC_TAGS[String(id)] || [];

function hintAwk(k) {
  if (finished || isOpen(`r${k}`)) return;
  if (!payHint()) return;
  openClue(`r${k}`);
  render();
}
function hintRole(k) {
  if (finished || isOpen(`o${k}`)) return;
  if (!payHint()) return;
  openClue(`o${k}`);
  render();
}
function hintLv(k) {
  if (finished || isOpen(`l${k}`)) return;
  if (!payHint()) return;
  openClue(`l${k}`);
  render();
}

// 线索台：队伍级线索（一次解锁整队）+ 出现型线索（命轮 / 密契，一次解锁一条，
// 只报「这局里有它」，不说在哪个位置、也不给组合，越往后越贵）。
// 值在渲染时才计算，保证和这一题完全对应；缺字段的线索直接不出现，
// 绝不卖一条全是「—」的线索。价格一律是基础价，实际扣费走 payHint 的难度系数。
const WHEEL_CLUE_COST = [6, 8, 10, 12, 14, 16, 18, 20];   // 第 1 条最便宜，往后逐条加价
const COV_CLUE_COST = [5, 7, 9, 11];

// 造物线索：按效果标签统计件数，只报「有几件带这个功能」，不报名字
const RELIC_CLUES = [
  { id: 'relOut', cost: 5, tags: ['dmg', 'str', 'crit'], label: 'clueRelOut' },
  { id: 'relDraw', cost: 4, tags: ['draw'], label: 'clueRelDraw' },
  { id: 'relRage', cost: 4, tags: ['rage'], label: 'clueRelRage' },
  { id: 'relCost', cost: 4, tags: ['energy', 'exhaust'], label: 'clueRelCost' },
  { id: 'relGuard', cost: 4, tags: ['guard'], label: 'clueRelGuard' },
  // 下面三条不看人工标签，直接按造物数据本身判（稀有度 / 说明书原文），
  // 覆盖率更好，也不怕标签漏打。
  { id: 'relGold', cost: 6, label: 'clueRelGold', value: (ids) => {
    // 稀有度有缺失（事件/摆锤造物常见）时不说死，改成「至少 n 件 + m 件未知」
    const known = ids.filter(id => /^(SSR|SR|N)$/.test(relicRarity(id)));
    const unknown = ids.length - known.length;
    const n = known.filter(id => relicRarity(id) === 'SSR').length;
    if (!unknown) return n ? t('clueRelN', { n }) : t('clueRelNone');
    return t('clueRelGoldMin', { n, m: unknown });
  } },
  { id: 'relBase', cost: 6, label: 'clueRelBase', test: id => /基础伤害|base damage/i.test(relicDesc(id)) },
  { id: 'relHeal', cost: 5, label: 'clueRelHeal', test: id => /治疗|回复.{0,6}生命|恢复.{0,6}生命|heal|restore .{0,6}HP/i.test(relicDesc(id)) },
];

// 用题目 id 做种子的确定性打散：每次渲染顺序一致，但不能是「按 A→D 排」，
// 否则第 1 条永远来自 A 位，等于变相泄露位置。
function seededShuffle(arr, seed) {
  let st = 2166136261;
  const key = String(seed || '');
  for (let i = 0; i < key.length; i++) { st ^= key.charCodeAt(i); st = Math.imul(st, 16777619); }
  const rnd = () => {
    st ^= st << 13; st ^= st >>> 17; st ^= st << 5;
    return (st >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// 本题出现过的命轮 / 密契（去重，保持「谁先出现」无关的顺序）
function appeared(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (id == null) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

function clueList() {
  const A = active();
  const x = puzzle.x || {};
  const j = (arr) => arr.map(v => (v == null ? '—' : v)).join(' / ');
  const full = (f) => ans.length > 0 && ans.every(a => a[f] != null);
  const team = [];
  const slots = [];
  const seed = puzzle.id;

  if (puzzle.key != null) {
    team.push({ id: 'key', cost: 6, label: t('hintKey'), value: () => realmOf(idx.key.get(puzzle.key)) });
  }

  // 维度影像（每位唤醒体的专属造物，不算固有）：每买一次解锁一个；没有更多了就把这次的银芯退回来
  if (A.relics) team.push({ id: 'dim', cost: 12, step: true, label: t('clueDim'), value: () => '' });

  // 等级在下方的卡位提示里已经能买到，这里只给「内在灵格」
  if (full('brk')) {
    team.push({ id: 'brk', cost: 6, label: t('clueBrk'), value: () => j(ans.map(a => a.brk)) });
  }

  // 「灵塑等级」和「养成（指令卡 / 疯狂预兆）」不再当线索卖：
  // 战报面板（reportPanel 的 invest 行）本来就把每个卡位的灵塑、指令卡总等级
  // 原样印在桌上，再花银芯买一条一模一样的信息属于重复收费。

  // Recorded outside snapshot, ordered by damage slots A–D. Missing values stay missing.
  const outsideStats = [
    ['blackcoin_upgrade_per', '黑印掉落', 'Sigil yield', '%'],
    ['occupation_master', '界域精通', 'Realm mastery', ''],
    ['atk', '伤害强效', 'Damage amplification', '%'],
    ['crit', '暴击率', 'Critical rate', '%'],
    ['crit_damage', '暴击伤害', 'Critical damage', '%'],
    ['keeper_energy_eff_2', '银钥充能', 'Keyflare regeneration', ''],
  ];
  for (const [key, zh, en, unit] of outsideStats) {
    if (!ans.some(a => Number.isFinite(a.outside?.[key]))) continue;
    team.push({ id: `outside:${key}`, cost: 6,
      label: (lang.cur === 'en' ? 'Outside snapshot · ' + en : '局外属性快照 · ' + zh),
      value: () => ans.map((a, k) => `${LETTERS[k]}: ${Number.isFinite(a.outside?.[key])
        ? Number(a.outside[key].toFixed(2)) + unit : '—'}`).join(' / '),
    });
  }

  // 命轮强化只报整队统计，不带位置：最高强化到几、有几件 ≥+12
  const wl = (x.wl || []).filter(v => v != null);
  if (wl.length) {
    team.push({
      id: 'wheelUp', cost: 6, label: t('clueWheelUp'),
      value: () => {
        const hi = wl.filter(v => v >= 12).length;
        return t('clueWheelMax', { n: Math.max(...wl) }) + (hi ? ` · ${t('clueWheelHi', { n: hi })}` : '');
      },
    });
  }

  if (x.as != null) {
    team.push({
      id: 'assist', cost: 4, label: t('clueAssist'),
      value: () => (x.as ? t('clueAssistY', { n: x.as }) : t('clueAssistN')),
    });
  }

  if (x.bc != null || x.be != null || x.pl != null) {
    team.push({
      id: 'peak', cost: 5, label: t('cluePeak'),
      value: () => [
        x.bc != null ? t('cluePeakCard', { n: x.bc }) : '',
        x.be != null ? t('cluePeakEnergy', { n: x.be }) : '',
        x.pl != null ? t('cluePeakLv', { n: x.pl }) : '',
      ].filter(Boolean).join(' · '),
    });
  }

  // 启灵汇总：四个卡位各自落在哪一档（8 档，见 js/pot.js），只在要填启灵的档上架；
  // 大师档开局免费送这一条（OPEN_GIFT）。战报面板的「养成」行在这一档不再印启灵，所以这是唯一的来源。
  if (A.pot && full('pot')) {
    team.push({
      id: 'pot', cost: 8, label: t('cluePotTeam'),
      value: () => ans.map((a, k) => `${LETTERS[k]} ${potTxt(a.pot)}`).join(' · '),
    });
  }


  // 命轮：一次解锁一条，只说这局用了哪几件，不说在哪一位，也不成对给出
  if (A.wheels && full('wheels')) {
    const all = appeared(ans.flatMap((a, k) => wheelIds(k)));
    seededShuffle(all, seed).forEach((id, i) => {
      slots.push({
        id: `wh${i}`, cost: WHEEL_CLUE_COST[i] || WHEEL_CLUE_COST[WHEEL_CLUE_COST.length - 1], group: 'wheel',
        label: t('clueWheelOne', { n: i + 1 }),
        value: () => wheelName(id),
      });
    });
  }

  // 密契：同样只报出现
  if (A.cov && full('cov')) {
    const all = appeared(ans.map(a => a.cov));
    seededShuffle(all, `${seed}#cov`).forEach((id, i) => {
      slots.push({
        id: `cv${i}`, cost: COV_CLUE_COST[i] || COV_CLUE_COST[COV_CLUE_COST.length - 1], group: 'cov',
        label: t('clueCovOne', { n: i + 1 }),
        value: () => covNameOf(id),
      });
    });
  }

  // 造物：按功能报件数（含固有造物，因为那几件也是这一局的造物）
  const relics = A.relics && relicList().length
    ? RELIC_CLUES.map(c => ({
      id: c.id, cost: c.cost, label: t(c.label),
      value: () => {
        const ids = relicList();
        if (c.value) return c.value(ids);
        const n = ids.filter(id => relicTags(id).some(x => (c.tags || []).includes(x)) || (c.test && c.test(id))).length;
        return n ? t('clueRelN', { n }) : t('clueRelNone');
      },
    }))
    : [];

  // 牌组：总张数 / 症状卡 / 衍生卡 / 命轮塞进牌组的附加卡，件数在构建题目时就按战报算好
  const dk = (puzzle.x && puzzle.x.dk) || null;
  const decks = dk
    ? [
      dk.n != null ? { id: 'dkN', cost: 3, label: t('clueDeckSize'), value: () => t('clueDeckN', { n: dk.n }) } : null,
      dk.cur != null ? { id: 'dkCur', cost: 5, label: t('clueDeckCur'), value: () => t('clueDeckN', { n: dk.cur }) } : null,
      // 延展（衍生）卡打完就没了，战报牌组里基本不留存：有才上架，没有就不占一格
      dk.ext ? { id: 'dkExt', cost: 5, label: t('clueDeckExt'), value: () => t('clueDeckN', { n: dk.ext }) } : null,
      dk.whl != null ? { id: 'dkWhl', cost: 4, label: t('clueDeckWhl'), value: () => t('clueDeckN', { n: dk.whl }) } : null,
    ].filter(Boolean)
    : [];

  // 作者自定义线索：内容原样展示，价格也按作者定的来
  const extra = authorHints().map((c, i) => ({
    id: `au${i}`, fixed: true, cost: Math.max(1, Math.round(Number(c.c) || 5)),
    label: String(c.n || t('clueAuthorOne', { n: i + 1 })),
    value: () => String(c.v || '—'),
  }));

  return { team, relics, decks, slots, extra };
}

// 作者自定义线索（工坊里手写的）：按作者定的价出售，不参与难度加价，
// 因为它是「作者额外告诉你的信息」，不是从数据里算出来的那份。
// 分享码里压成三元组（h），云题库 / 本地题库存的是完整对象（hints），两种都认。
const authorHints = () => {
  const p = puzzle || {};
  if (Array.isArray(p.hints)) return p.hints.filter(c => c && (c.n || c.v));
  if (Array.isArray(p.h)) {
    return p.h.map(c => (Array.isArray(c) ? { n: c[0], v: c[1], c: c[2] } : c))
      .filter(c => c && (c.n || c.v));
  }
  return [];
};

function payFixed(cost) {
  const c = Math.max(1, Math.round(Number(cost) || 1));
  if (!wallet.spend(c)) { toast(t('noCredits')); return false; }
  hintsUsed++;
  toast(t('ptsHint', { n: c }));
  return true;
}

function buyClue(c) {
  if (finished || isOpen(`c:${c.id}`)) return;
  const ok = c.fixed ? payFixed(c.cost) : payHint(c.cost);
  if (!ok) return;
  openClue(`c:${c.id}`);
  render();
}

// 维度影像线索：要补的维度影像按题目 id 打散顺序，每次付费只解锁下一个；解锁完（或者本题根本没有）再点就退款
const dimOrder = () => seededShuffle(fillRelics().filter(isDimImage).map(String), `${puzzle.id}:dim`);
const dimShown = () => dimOrder().filter(id => isOpen(`dim:${id}`));
function buyDim() {
  if (finished) return;
  const next = dimOrder().find(id => !isOpen(`dim:${id}`));
  if (!payHint(12)) return;
  if (next) { openClue(`dim:${next}`); render(); return; }
  // 没有（更多）维度影像：退还刚付的银芯，并把这次不算作用过线索
  wallet.add(priceOf(12));
  hintsUsed = Math.max(0, hintsUsed - 1);
  openClue('dim:done');
  toast(t('clueDimNone'));
  render();
}
function dimCard() {
  const shown = dimShown();
  const exhausted = isOpen('dim:done') || shown.length >= dimOrder().length;
  return h('div', { class: `clue ${shown.length ? 'on' : 'lock'}` },
    h('small', {}, t('clueDim')),
    shown.length ? h('b', {}, shown.map(id => { const e = creationOf(id); return e ? nameOf(e) : id; }).join(' / ')) : null,
    isOpen('dim:done') && !shown.length ? h('b', {}, '—') : null,
    // 解锁完（或已确认本题没有）就不再给按钮
    exhausted ? null
      : h('button', { type: 'button', class: 'link', onclick: buyDim }, shown.length ? t('clueDimBtn') + ' ' : '', scIcon(12), ` ${priceOf(12)}`));
}

function clueCard(c) {
  if (c.id === 'dim') return dimCard();
  const key = `c:${c.id}`;
  if (isOpen(key)) {
    return h('div', { class: 'clue on' }, h('small', {}, c.label), h('b', {}, c.value()),
      giftKeys.has(key) ? h('em', { class: 'gift' }, t('giftTag')) : null);
  }
  // 卡上显示的是这一档的真实价格（payHint 会按难度系数扣；作者线索是固定价）
  return h('button', { type: 'button', class: 'clue lock', onclick: () => buyClue(c) },
    h('small', {}, c.label), h('b', { class: 'cost' }, scIcon(12), ` ${c.fixed ? c.cost : priceOf(c.cost)}`));
}

function cluePanel() {
  if (finished) return null;
  const { team, relics, decks, slots, extra } = clueList();
  const wheels = slots.filter(c => c.group === 'wheel');
  const covs = slots.filter(c => c.group === 'cov');
  const mul = LV_COST_MUL[level] || 1;
  const note = (mul > 1 ? `${t('clueNote')} · ${t('clueMul', { m: mul })}` : t('clueNote'))
    + (giftKeys.size ? ` · ${t('clueGiftOn', { n: giftKeys.size })}` : '');
  return h('section', { class: 'card clues' },
    h('div', { class: 'cluehead' },
      h('h3', {}, t('clueTitle')),
      h('span', { class: 'note' }, note)),
    team.length ? h('div', { class: 'cluegrid' }, team.map(clueCard)) : null,
    relics.length ? h('div', { class: 'cluesub' }, h('b', {}, t('clueRelTitle'))) : null,
    relics.length ? h('div', { class: 'cluegrid' }, relics.map(clueCard)) : null,
    decks.length ? h('div', { class: 'cluesub' }, h('b', {}, t('clueDeckTitle'))) : null,
    decks.length ? h('div', { class: 'cluegrid four' }, decks.map(clueCard)) : null,
    wheels.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueWheelSeen')), h('span', { class: 'note' }, t('clueStepNote'))) : null,
    wheels.length ? h('div', { class: 'cluegrid four' }, wheels.map(clueCard)) : null,
    covs.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueCovSeen')), h('span', { class: 'note' }, t('clueStepNote'))) : null,
    covs.length ? h('div', { class: 'cluegrid four' }, covs.map(clueCard)) : null,
    extra.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueAuthorTitle')), h('span', { class: 'note' }, t('clueAuthorNote'))) : null,
    extra.length ? h('div', { class: 'cluegrid' }, extra.map(clueCard)) : null);
}

// ------------------------------------------------------------------ 点赞
// 只有工坊出的自建题能点赞：每被一个人点赞，作者得 1 银芯；每人每天最多 10 次。
// 赞数来自共享存储（见 js/likes.js），点完立刻 +1，真正的写入在后台排队。
let likeCount = null;
let likeFor = '';

async function loadLike(id) {
  const key = String(id || '');
  likeFor = key;
  const cached = likes.cachedCounts()[key];
  likeCount = cached == null ? null : Number(cached) || 0;
  try {
    const c = await likes.counts([key]);
    if (likeFor !== key) return;
    likeCount = c[key] || 0;
    store.set('likeCnt', { ...likes.cachedCounts(), [key]: likeCount });
  } catch { /* 离线就只显示缓存里的数 */ }
  if (puzzle && String(puzzle.id) === key) render();
}

function likeBar() {
  if (!puzzle || !puzzle.custom) return null;
  const id = String(puzzle.id || '');
  const mine = customPuzzles().some(p => String(p.id) === id);
  const voted = likes.hasVoted(id);
  const left = likes.leftToday();
  const tip = likes.pending();
  return h('div', { class: 'likestrip' },
    h('span', { class: 'likecnt', title: t('likeTip', { n: likes.LIKE_MAX }) },
      '❤', h('b', {}, likeCount == null ? '·' : String(likeCount))),
    mine
      ? h('span', { class: 'note' }, t('likeSelf'))
      : voted
        ? h('button', { type: 'button', class: 'btn sm ghost', disabled: true }, t('likeDone'))
        : h('button', { type: 'button', class: 'btn sm', disabled: left <= 0, onclick: doLike }, t('likeBtn')),
    mine ? null : likes.cloudReady()
      ? h('span', { class: 'note' }, left > 0 ? t('likeLeft', { n: left }) : t('likeZero', { n: likes.LIKE_MAX }))
      : h('span', { class: 'note dim' }, t('likeCloudNote')),
    mine && !likes.cloudReady() ? h('span', { class: 'note dim' }, t('likeCloudNote')) : null,
    tip ? h('span', { class: 'note dim' }, t('likeQueue', { n: tip })) : null);
}

function doLike() {
  const id = String((puzzle && puzzle.id) || '');
  if (!id) return;
  const r = likes.like(id);
  if (r.ok === 'quota') { toast(t('likeZero', { n: likes.LIKE_MAX })); return; }
  if (r.ok === 'ok') {
    likeCount = (Number(likeCount) || 0) + 1;
    store.set('likeCnt', { ...likes.cachedCounts(), [id]: likeCount });
    toast(likes.cloudReady() ? t('likeThanks', { n: r.left }) : t('likeCloudOff'));
  }
  render();
}

// ------------------------------------------------------------------ UI pieces
function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const cls = (k) => {
  const f = fb[k];
  return f ? ` fb-${f.c}` : '';
};
const fbOk = (k, cur) => fb[k] && fb[k].v === cur ? cls(k) : '';

function chip(text, tone = '') { return h('span', { class: 'chip ' + tone }, text); }

const bline = (c, pct, text) => h('div', { class: 'bline' }, h('div', { class: 'track' }, h('div', { class: `bar ${c}`, style: `width:${pct}%` })), h('i', {}, text));

function reportPanel() {
  const A = active();
  const p = puzzle;
  const total = ans.reduce((s, a) => s + a.dmg, 0) || 1;
  const maxBlk = Math.max(...ans.map(a => a.blk), 1);
  const maxHeal = Math.max(...ans.map(a => a.heal), 1);
  const stat = (k, v, sub) => h('div', { class: 'stat' }, h('small', {}, k), h('b', {}, v), sub ? h('em', {}, sub) : null);
  const rows = ans.map((a, k) => {
    // 养成线索：优先展示新字段（指令卡总等级/狂气等级/灵塑），旧字段作为补充
    const invest = [];
    if (a.cardLv != null) invest.push(`${t('cardLv')} Lv.${a.cardLv}`);
    if (a.madness != null) invest.push(`${t('madnessLv')} Lv.${a.madness}`);
    // 要猜启灵的档（大师）不能把答案印在桌上；更低的档不用猜，印出来当背景信息
    if (a.pot != null && !A.pot) invest.push(`${t('potLv')} ${potTxt(a.pot)}`);
    if (!invest.length && a.up != null) invest.push(t('cardUp', { n: a.up }), t('talentSum', { n: a.tal }));
    return h('div', { class: 'brow' },
      h('span', { class: 'bl' }, LETTERS[k]),
      h('div', { class: 'bars' },
        bline('dmg', Math.max(a.dmg / total * 100, 0.8), `${t('dmg')} ${(a.dmg / total * 100).toFixed(1)}% · ${wan(a.dmg)}`),
        bline('blk', Math.max(a.blk / maxBlk * 100, 0.8), `${t('blk')} ${wan(a.blk)}`),
        bline('heal', Math.max(a.heal / maxHeal * 100, 0.8), `${t('heal')} ${wan(a.heal)}`),
        h('div', { class: 'invest' }, invest.join(' · '))),
    );
  });
  // The season-72 zone-5 encounter is 宁菲亚 (14086); legacy bank chunks
  // contain a mismatched boss ID. Correct it at presentation time as well,
  // so existing cached question chunks and shared links display the right boss.
  const bossIds = ({"71-1":["80576","80577"],"71-2":["94940"],"71-3":["67103"],"71-4":["14063"],"71-5":["81279"],"72-1":["14008","14013"],"72-2":["14064"],"72-3":["60096"],"72-4":["120308","120310","120306"],"72-5":["14086"]})[String(p.season) + '-' + String(p.zone)] || (p.boss || []);
  const ml = p.kind === 'mainline';
  const bosses = bossIds.map(id => D.monster.find(m => String(m.id) === String(id))).filter(Boolean);
  // Values below are recorded battle-summary extrema, not a partition of total damage.
  // In particular maxPosion is a peak poison metric, NEVER total poison damage.
  const dc = p.dmgComp || {};
  const measured = [
    ['守密人伤害（累计）', dc.keeper, 'keeper', wan],
    ['触腕单次最高伤害', dc.tentacle, 'tentacle', wan],
    ['反击峰值', dc.counter, 'counter', wan],
    ['力量峰值', dc.strength, 'strength', v => String(v ?? 0)],
    ['中毒峰值', dc.poison, 'poison', v => String(v ?? 0)],
    // 钥令开启次数来自回放本体（statistics.UsedKeeperSkillCount），榜单摘要里没有这一项。
    // 0 也是有效值（这一局没放钥令），所以不过滤 0，只有真的没取到才不显示。
    ['钥令开启次数', p.keyUses, 'keys', v => `${v} 次`],
    // 侵蚀伤害来自回放里逐状态统计的累计值（state[*].AwakerDoDamage，名字含「侵蚀」的那些状态），
    // 和上面的「中毒峰值」不是一个东西：中毒是峰值层数，侵蚀是整场累计伤害。
    ['侵蚀伤害（累计）', p.ero, 'ero', wan],
  ].filter(([label, value, key]) => value != null && (key === 'keeper' || key === 'keys' ? Number(value) >= 0 : Number(value) > 0));
  const dmgCompBox = measured.length ? h('div', { class: 'dmgcomp' },
    h('div', { class: 'dchead' }, '战报实测指标（非累计伤害构成）'),
    h('div', { class: 'dcgrid' }, measured.map(([label, value, key, format]) =>
      h('div', { class: 'dc', 'data-k': key }, h('small', {}, label), h('b', {}, format(value)))))) : null;
  return h('section', { class: 'card report' },
    h('div', { class: 'rhead' },
      h('div', {}, h('h2', {}, `${t('reportTitle')} · ${t('season', { s: p.season })}`),
        ml ? h('div', { class: 'chips' },
          chip(`${p.campaign || ''} ${p.zone}-${p.stageNo}「${p.stageName || ''}」`),
          chip(t('mlLevel', { n: p.recLevel })),
          chip(t('diffStar', { d: '★'.repeat(p.diff) }), 'gold'))
        : h('div', { class: 'chips' }, chip(t('zone', { z: p.zone })), chip(t('threat', { t: p.threat })),
          p.madness ? chip(t('madness', { m: p.madness })) : null, chip(t('diffStar', { d: '★'.repeat(p.diff) }), 'gold'),
          p.diffScore != null ? chip(t('diffScore', { s: p.diffScore }), 'gold') : null,
          p.extra ? chip(t('extra'), 'dim') : null)),
      bosses.length && !ml ? h('div', { class: 'boss' }, h('div', { class: 'bimgs' }, bosses.map(b => imgEl(b.img, nameOf(b)))), h('small', {}, `${t('bossLabel')}：${bosses.map(b => nameOf(b)).join('、')}`)) : null),
    h('div', { class: 'stats' },
      ml ? [
        // 主线战报没有分数 / 首领回合 / 血量快照，只报回放里真实存在的数字
        stat(t('rounds'), p.rounds), stat(t('cards'), p.cards, t('energy', { n: p.energy })),
        stat(t('keysUsed'), p.keyUses != null ? `${p.keyUses}` : '—'), stat(t('deathResist'), p.deathResist),
        stat(t('relicCount'), relOf(p).length,
          level >= 4 ? t('relicInnate', { n: relOf(p).filter(isInnateRelic).length }) : ''),
      ] : [
        stat(t('rounds'), p.rounds, t('bossRounds', { n: p.bossRounds })), stat(t('cards'), p.cards, t('energy', { n: p.energy })),
        stat(t('maxBout'), wan(p.maxBout)), stat(t('deathResist'), p.deathResist),
        stat(t('leftHp'), `${p.left}/${p.hp}`), stat(t('keyDmg'), wan(p.playerDmg)),
        stat(t('score'), p.score), stat(t('relicCount'), relOf(p).length,
          level >= 4 ? t('relicInnate', { n: relOf(p).filter(isInnateRelic).length }) : ''),
      ]),
    dmgCompBox,
    p.diffWhy ? h('div', { class: 'diffwhy' },
      h('b', {}, `${t('diffWhy')}：`),
      h('span', {}, `${t('diffInfo')} ${Math.round(p.diffWhy.info * 100)}%`),
      h('span', {}, `${t('diffSpread')} ${Math.round(p.diffWhy.spread * 100)}%`),
      h('span', {}, `${t('diffPeel')} ${Math.round(p.diffWhy.peel * 100)}%`)) : null,
    bosses.length ? h('details', { class: 'bskills' }, h('summary', {}, t('bossSkills')),
      bosses.map(b => h('div', {}, h('b', {}, nameOf(b)), h('ul', {}, (b.skills || []).map(x => h('li', {}, renderText(x))))))) : null,
    h('div', { class: 'brows' }, rows,
      h('p', { class: 'note' }, t('sortNote'))));
}

function pickBtn(kind, current, onPick, fkey, extraCls = '') {
  const e = current == null ? null : idx[kind].get(String(current));
  const f = fkey ? fbOk(fkey, current) : '';
  return h('button', { class: `pick ${kind} ${f}${extraCls}`, type: 'button', title: e ? nameOf(e) : t('pick' + (kind[0].toUpperCase() + kind.slice(1))), onclick: onPick },
    e ? imgEl(e.img, nameOf(e)) : h('span', { class: 'plus' }, '＋'),
    e ? h('small', {}, nameOf(e)) : h('small', {}, KINDS[kind]));
}

// 交换 / 清除都得把那一格的反馈颜色抹掉：颜色评的是「原来摆在那个位置的人」，
// 人挪走了还留着颜色就是误导（也不该靠挪位置白拿一份新的对错信息）。
function dropFb(k) {
  delete fb[`awk${k}`];
  delete fb[`w${k}0`];
  delete fb[`w${k}1`];
  delete fb[`cov${k}`];
  delete fb[`pot${k}`];
}

// 两个卡位整体互换：唤醒体连同命轮、密契、灵塑一起搬过去
function swapSlots(a, b) {
  const s = sel.slots;
  const t0 = s[a];
  s[a] = s[b];
  s[b] = t0;
  dropFb(a);
  dropFb(b);
  toast(t('swapDone', { a: LETTERS[a], b: LETTERS[b] }));
}

// 反馈是红色（这人不在队里）的卡位 = 一定选错，可以一键清掉
const wrongSlots = () => sel.slots
  .map((g, k) => {
    const f = fb[`awk${k}`];
    return g.awk != null && f && f.c === 'n' && f.v === g.awk ? k : -1;
  })
  .filter(k => k >= 0);

function clearWrong() {
  const list = wrongSlots();
  if (!list.length) { toast(t('clearNone')); return; }
  list.forEach(k => {
    sel.slots[k] = { awk: null, wheels: [null, null], cov: null, pot: null };
    dropFb(k);
  });
  swapFrom = null;
  persist();
  render();
  toast(t('clearDone', { n: list.length }));
}

function slotCard(k) {
  const A = active();
  const g = sel.slots[k];
  const locked = finished;
  const open = (kind, apply) => () => { if (!locked) openPicker(kind, apply, k); };
  // 唤醒体卡位：空着直接开选择器；已经选了的先进入交换状态，
  // 再点自己（第二次）才改选，点别的卡位就换过去。
  const onAwk = () => {
    if (locked) return;
    if (swapFrom == null) {
      if (g.awk == null) { openPicker('awakener', v => { g.awk = v; }, k); return; }
      swapFrom = k;
      toast(t('swapPick', { l: LETTERS[k] }));
      render();
      return;
    }
    if (swapFrom === k) { swapFrom = null; openPicker('awakener', v => { g.awk = v; }, k); return; }
    swapSlots(swapFrom, k);
    swapFrom = null;
    persist();
    render();
  };
  const card = h('div', { class: `slot${swapFrom === k ? ' swapfrom' : ''}` },
    h('div', { class: 'shead' }, h('b', {}, t('slotHead', { l: LETTERS[k] })),
      h('span', { class: 'chips' },
        isOpen(`r${k}`) ? chip(slotRealm(k), 'gold') : null,
        isOpen(`o${k}`) ? chip(slotRole(k), 'gold') : null,
        isOpen(`l${k}`) ? chip(slotLv(k), 'gold') : null)),
    pickBtn('awakener', g.awk, onAwk, `awk${k}`, ` big${swapFrom != null && swapFrom !== k ? ' droppable' : ''}`));
  if (A.wheels) {
    card.append(h('div', { class: 'row2' }, [0, 1].map(i =>
      pickBtn('wheel', g.wheels[i], open('wheel', v => { g.wheels[i] = v; }), `w${k}${i}`))));
  }
  if (A.cov) card.append(pickBtn('covenant', g.cov, open('covenant', v => { g.cov = v; }), `cov${k}`));
  if (A.pot) {
    const f = fb[`pot${k}`] && fb[`pot${k}`].v === g.pot ? fb[`pot${k}`] : null;
    card.append(h('div', { class: `pot${f ? ' fb-' + f.c : ''}` },
      h('small', {}, t('potLv')),
      h('select', { class: 'potsel', disabled: !!locked, 'aria-label': t('potLv'),
        onchange: (ev) => { g.pot = ev.target.value === '' ? null : Number(ev.target.value); persist(); render(); } },
        h('option', { value: '', selected: g.pot == null }, '—'),
        POT_VALUES.map((v) => h('option', { value: String(v), selected: potGroup(g.pot) === v }, potTxt(v)))),
      f && f.dir ? h('b', {}, f.dir) : null));
  }
  if (!locked) {
    card.append(h('div', { class: 'hints' },
      isOpen(`r${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintAwk(k) }, t('hintRealm'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`),
      isOpen(`o${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintRole(k) }, t('hintRole'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`),
      isOpen(`l${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintLv(k) }, t('hintLv'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`)));
  }
  return card;
}

function teamExtras() {
  const A = active();
  const box = h('div', { class: 'extras' });
  if (A.key) {
    box.append(h('div', { class: 'extra' }, h('b', {}, t('keyLabel')),
      pickBtn('key', sel.key, () => { if (!finished) openPicker('key', v => { sel.key = v; }); }, 'key'),
      isOpen('c:key') ? chip(realmOf(idx.key.get(puzzle.key)), 'gold') : null));
  }
  if (A.relics) {
    const inn = innateRelics();
    const need = fillRelics();
    const relicChip = (id, title) => {
      const e = creationOf(id);
      return { e, label: e ? nameOf(e) : id };
    };
    box.append(h('div', { class: 'extra wide' }, h('b', {}, `${t('relicLabel')} ${sel.relics.length}/${need.length}`),
      // 固有造物跟着唤醒体走，题面直接给，玩家不用也不能填
      inn.length ? h('div', { class: 'relics innate' },
        h('span', { class: 'innatetag' }, t('innateTag')),
        inn.map(id => {
          const { e, label } = relicChip(id);
          return h('span', { class: 'pick mini fixed', title: label },
            imgEl(e && e.img, label), h('small', {}, label));
        })) : null,
      h('div', { class: 'relics mine' },
        inn.length ? h('span', { class: 'innatetag mine' }, t('relicFillTag')) : null,
        sel.relics.map(id => {
          const { e, label } = relicChip(id);
          const f = fb[`rel${id}`];
          return h('button', { type: 'button', class: `pick mini${f ? ' fb-' + f.c : ''}`, title: label,
            onclick: () => { if (!finished) { sel.relics = sel.relics.filter(x => x !== id); persist(); render(); } } },
            imgEl(e && e.img, label), h('small', {}, label));
        }),
        finished ? null : h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', null) }, h('span', { class: 'plus' }, '＋'), h('small', {}, t('add')))
      )));
  }
  return box;
}

function historyPanel() {
  return h('section', { class: 'card hist' },
    h('h3', {}, `${t('histTitle')} ${history.length}/${MAX_TRIES}`),
    history.length ? h('ol', {}, history.map(x => h('li', {}, x.row, h('em', {}, ` ${Math.round(x.frac * 100)}%`)))) : emptyState(t('histEmpty')));
}

function copyText(txt, ok = t('copied')) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => toast(ok), () => prompt(t('copy'), txt));
}

// 回放：官方原始 JSON + 忘忘看报复盘入口
function replayBox(p) {
  if (!p.uuid) return h('p', { class: 'note' }, `${t('replayTitle')}：—`);
  return h('div', { class: 'replaybox' },
    h('b', {}, t('replayTitle')),
    h('div', { class: 'rlinks' },
      h('a', { href: REPLAY.json(p.uuid), target: '_blank', rel: 'noopener' }, t('replayApi')),
      h('a', { href: REPLAY.review, target: '_blank', rel: 'noopener' }, t('replayReview')),
      h('button', { type: 'button', class: 'link', onclick: () => copyText(p.uuid) }, t('replayCopy'))),
    h('p', { class: 'note mono' }, p.uuid),
    h('p', { class: 'note' }, t('replayHint')));
}

// 一支队伍答案的展示（结果面板 & 失败题库共用）
function teamBlock(team) {
  const mk = (kind, id, extra = '') => {
    const e = idx[kind].get(String(id));
    return h('span', { class: `ans-i${extra}`, title: e ? nameOf(e) : id },
      imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
  };
  const awkAttr = (a) => {
    const e = idx.awakener.get(String(a.tid));
    if (!e) return '';
    return [realmOf(e), roleOf(e), e.rarity].filter(Boolean).join(' · ');
  };
  return h('div', { class: 'ans-team' }, team.map((a, k) => h('div', { class: 'ans-slot' },
    h('b', {}, `${t('slotHead', { l: LETTERS[k] })} · ${t('lv', { n: a.lv })} · ${t('potFull', { n: potTxt(a.pot) })} · ${t('brk', { n: a.brk })}`),
    h('div', { class: 'ans-attr' }, awkAttr(a)),
    h('div', { class: 'ans-row' }, mk('awakener', a.tid), (a.wheels || []).map(w => mk('wheel', w)), mk('covenant', a.cov)))));
}

function answerPanel() {
  const { score, g } = grade();
  const mk = (kind, id, extra = '') => {
    const e = idx[kind].get(String(id));
    return h('span', { class: `ans-i${extra}`, title: e ? nameOf(e) : id },
      imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
  };
  return h('section', { class: `card result ${won ? 'win' : 'lose'}` },
    h('h2', {}, won ? `${t('winTitle')} · ${t('grade', { g })}` : `${t('loseTitle')} · ${t('grade', { g })}`),
    h('p', {}, t('scoreText', { s: score, h: hintsUsed, n: history.length })),
    h('div', { class: 'chips' },
      won ? chip(t('ptsGain', { n: ptsOf(puzzle) }), 'gold') : chip(t('failedMark'), 'warn'),
      chip([`${t('credits')} `, scIcon(12), ` ${wallet.get()}`])),
    teamBlock(ans),
    h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', puzzle.key)),
    h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')),
      relicList().map(r => mk('creation', r, isInnateRelic(r) ? ' innate' : ''))),
    replayBox(puzzle),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: share }, t('copy')),
      h('button', { class: 'btn ghost', onclick: () => start(pickAny(), 'random') }, t('again'))));
}

function share() {
  const txt = `${t('brand')} ${mode === 'daily' ? todayKey() : puzzle.id} · ${LEVELS[level].name()} ${won ? history.length : 'X'}/${MAX_TRIES}\n` + history.map(x => x.row).join('\n');
  copyText(txt);
}

// ------------------------------------------------------------------ 失败题库
// <dialog> 在 iOS 15.4 之前根本不存在：没有 showModal 时退化成「加 open 属性」，
// 版式由 css/style.css 的 dialog.picker[open] 兜住——选卡能用，不会整页崩掉。
function openModal(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
function closeModal(d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }

const ansDlg = h('dialog', { class: 'picker review' });
document.body.append(ansDlg);

async function viewFailed(id) {
  const p0 = (await bank.fetchPuzzle(id)) || customPuzzles().find(x => x.id === id);
  if (!p0) return;
  const p = await unseal(p0);
  const mk = (kind, i) => { const e = idx[kind].get(String(i)); return h('span', { class: 'ans-i', title: e ? nameOf(e) : i }, imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : i)); };
  ansDlg.replaceChildren(
    h('div', { class: 'phead' },
      h('b', {}, `${t('failedTitle')} · ${p.id}`),
      h('span', { class: 'note' }, `${t('season', { s: p.season })} · ${t('score', { s: p.score })}`),
      h('button', { class: 'btn sm', onclick: () => closeModal(ansDlg) }, t('close'))),
    h('div', { class: 'ans-wrap' },
      teamBlock(p.team),
      h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', p.key)),
      h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')), (p.relics || []).map(r => mk('creation', r))),
      replayBox(p)));
  openModal(ansDlg);
}

function failedPanel() {
  const list = failedBank.list();
  return h('section', { class: 'card failedbank' },
    h('h3', {}, `${t('failedTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('failedNote', { n: MAX_TRIES })),
    list.length ? h('div', { class: 'fbrow' }, list.map(id => h('button', {
      type: 'button', class: 'btn ghost sm', onclick: () => viewFailed(id),
    }, `${id} · ${t('replayTitle')}`))) : emptyState(t('failedEmpty')));
}

// ------------------------------------------------------------------ profile / login
// 只有两种状态：游客（读本机缓存）与已登录（账号云端档案）。
function profilePanel() {
  const st = statsOf();
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  const u = auth.user;
  const acts = u
    ? [
        h('a', { class: 'btn ghost sm', href: 'profile.html' }, t('myCenter')),
        h('button', { class: 'btn ghost sm', onclick: () => { auth.logout(); account.forget(); render(); } }, t('pfLogout')),
      ]
    : [
        h('button', { class: 'btn sm', onclick: () => openLogin(() => location.reload()) }, t('loginRegister')),
        h('a', { class: 'btn ghost sm', href: 'profile.html' }, t('pfGuestData')),
      ];
  const chips = [`${t('totalPlayed')} ${st.played}`, `${t('totalWon')} ${st.won}`, `${t('accuracy')} ${acc}`];
  return h('section', { class: 'card profile' },
    h('div', { class: 'prow' },
      u
        ? imgEl(auth.avatarOf(u), u.name, 'pfavatar tiny')
        : h('span', { class: 'pfavatar tiny guest', title: t('guestTag') }, '👤'),
      h('div', { class: 'pmeta' },
        h('div', { class: 'pname' },
          h('b', {}, u ? u.name : t('guestTag')),
          h('span', { class: `ptag${u ? ' acct' : ''}` }, u ? t('acctTag') : t('guestShort'))),
        h('div', { class: 'pchips' }, chips.map(x => h('span', { class: 'chip dim' }, x)))),
      h('div', { class: 'pactions' }, acts)),
    h('p', { class: 'pnote' }, u ? t('pfSyncNote') : t('pfGuestNote')),
    checkinBar('', () => render()));
}

function controls() {
  const st = statsOf();
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  const range = LV_RANGE[level] || [1, 4];
  const poolN = basePool().length;
  return h('section', { class: 'card ctl' },
    h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, v]) =>
      h('button', { class: `lv${+k === level ? ' on' : ''}`, onclick: () => { level = +k; store.set('level', level); start(mode === 'daily' ? dailyPuzzle() : puzzle, mode); } },
        h('b', {}, v.name()), h('small', {}, v.desc())))),
    h('div', { class: 'modes' },
      h('label', { class: 'note' }, h('input', { type: 'checkbox', checked: sOnly(),
        onchange: e => {
          store.set('detectiveSOnly', e.target.checked);
          start(mode === 'daily' ? dailyPuzzle() : pickAny(), mode);
        } }), lang.cur === 'en' ? ' S and above only' : ' 只看难度 S 及以上'),
      h('button', { class: `btn${mode === 'daily' ? '' : ' ghost'}`, onclick: () => start(dailyPuzzle(), 'daily') }, `${t('daily')} ${todayKey()}`),
      h('button', { class: `btn${mode === 'random' ? '' : ' ghost'}`, onclick: () => start(pickAny(), 'random') }, t('random')),
      h('span', { class: 'credits big' }, `${t('credits')} `, scNum(wallet.get(), 16)),
      h('span', { class: 'note' }, `${t('played')} ${st.played} · ${t('won')} ${st.won} · ${t('streak')} ${st.streak} · ${t('best')} ${st.best} · ${t('accuracy')} ${acc}`)),
    h('div', { class: 'poolnote' }, `${t('poolNote', { n: poolN })} · ${t('poolDiff', { a: range[0], b: range[1] })}`));
}

// ------------------------------------------------------------------ picker modal
const dlg = h('dialog', { class: 'picker' });
document.body.append(dlg);

function openPicker(kind, apply, slot) {
  const multi = kind === 'creation';
  const all = D[kind].filter(e => e.id != null).sort((a, b) => (b.real !== false) - (a.real !== false));
  const used = kind === 'awakener' ? new Set(sel.slots.map(s => s.awk).filter(Boolean)) : new Set();
  let q = '', f1 = '', f2 = '', fk = '';
  const f1key = { awakener: 'realm', wheel: 'realm', key: 'realm', creation: 'kind' }[kind];
  const f2key = { awakener: 'role', wheel: 'rarity', creation: 'rarity' }[kind];
  const opts = (key) => key ? [...new Set(all.map(e => e[key]).filter(Boolean))].sort() : [];
  const grid = h('div', { class: 'pgrid' });
  // 只挡「同一名唤醒体已经占到别的卡位」：一个人不能同时在两个位置。
  // 界域不再做过滤——以前选了深海之后，其它界域的唤醒体整片变灰，想按自己的
  // 思路先摆位置都做不到，反而像 bug。现在四大界域随便选。
  const usedOther = (id) => sel.slots.some((s, i) => i !== slot && s.awk != null && String(s.awk) === String(id));
  const blockWhy = (e) => (kind === 'awakener' && usedOther(e.id) ? t('wsRealmUsed') : '');
  // 分批铺卡片：造物有 390 件，一次性铺开会同时发 390 个图片请求，
  // 手机上一个域名只有 6 条连接，表现就是「点开面板一片白、等半分钟」。
  // 先铺 60 张，滚到底再续 60 张。
  const PAGE = 60;
  let items = [];
  let shown = 0;
  const more = h('button', {
    type: 'button', class: 'btn ghost sm', style: 'grid-column:1/-1',
    onclick: () => { grow(); if (shown < items.length) grid.append(more); },
  }, t('loadMore'));
  const cell = (e) => {
    const id = String(e.id);
    const chosen = multi && sel.relics.includes(id);
    const full = multi && !chosen && sel.relics.length >= fillRelics().length;
    const why = blockWhy(e);
    const btn = h('button', { type: 'button', class: `pitem${chosen ? ' chosen' : ''}${used.has(id) ? ' used' : ''}${why ? ' blocked' : ''}`, disabled: full || Boolean(why), title: why || e.en,
      onclick: why ? null : () => {
        if (multi) { toggleRelic(id); return; }
        apply(id); persist(); closeModal(dlg); render();
      } }, imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)),
      why ? h('em', { class: 'decoy' }, why) : (e.real === false ? h('em', { class: 'decoy' }, t('decoy')) : null));
    btn.__id = id;
    return btn;
  };
  // 造物多选：只改这一格的状态和计数，不重画整张网格（重画会把滚动位置弹回顶部）
  const toggleRelic = (id) => {
    const max = fillRelics().length;
    sel.relics = sel.relics.includes(id) ? sel.relics.filter(x => x !== id) : [...sel.relics, id];
    persist();
    count.textContent = `${sel.relics.length}/${max}`;
    const pick = new Set(sel.relics);
    for (const el of grid.children) {
      if (!el.__id) continue;
      const on = pick.has(el.__id);
      el.classList.toggle('chosen', on);
      if (!el.classList.contains('blocked')) el.disabled = !on && sel.relics.length >= max;
    }
  };
  const grow = () => {
    const end = Math.min(shown + PAGE, items.length);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) frag.append(cell(items[i]));
    grid.append(frag);
    shown = end;
    if (shown >= items.length) more.remove();
    else more.textContent = `${t('loadMore')}（${shown}/${items.length}）`;
  };
  const draw = () => {
    // 固有造物已经在题面给出去了，选择器里不再列出来；
    // 锈蚀钥匙这种开门道具也不是造物，一并挡掉
    items = all.filter(e => (!multi || (!isInnateRelic(e.id) && !isNonRelic(e.id)))
      && (!q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q)) && (!f1 || e[f1key] === f1) && (!f2 || e[f2key] === f2) && (!fk || (e.kw || []).includes(fk)));
    shown = 0;
    grid.replaceChildren();
    if (!items.length) { grid.append(h('p', { class: 'note' }, t('noMatch'))); return; }
    grow();
    if (shown < items.length) grid.append(more);
  };
  const sub = (key, label, set) => {
    const o = opts(key);
    return o.length ? h('select', { onchange: ev => { set(ev.target.value); draw(); } }, h('option', { value: '' }, label), o.map(x => h('option', { value: x }, x))) : null;
  };
  const kwSelect = () => {
    const have = new Set(all.flatMap(e => e.kw || []));
    const ks = KW.list.filter(k => have.has(k.s));
    if (!ks.length) return null;
    return h('select', { title: t('allKw'), onchange: ev => { fk = ev.target.value; draw(); } }, h('option', { value: '' }, t('allKw')),
      Object.entries(KW_TYPE).map(([ty, label]) => { const g = ks.filter(k => k.t === ty); return g.length ? h('optgroup', { label: lang.cur === 'en' ? KW_TYPE_EN[ty] : label }, g.map(k => h('option', { value: k.s }, lang.cur === 'en' ? k.e : k.n))) : null; }));
  };
  const count = h('span', { class: 'note' }, multi ? `${sel.relics.length}/${fillRelics().length}` : '');
  // 唤醒体选择器不再挂界域提示：四个界域都能选，挂着「只能再选深海或混沌」只会误导
  const realmNote = null;
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, `${kindName(kind)}`), count,
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); draw(); } }),
      sub(f1key, f1key === 'kind' ? t('allType') : t('allRealm'), v => { f1 = v; }), sub(f2key, f2key === 'role' ? t('allRole') : t('allRarity'), v => { f2 = v; }),
      kwSelect(),
      !multi ? h('button', { class: 'btn ghost sm', onclick: () => { apply(null); persist(); closeModal(dlg); render(); } }, t('clear')) : null,
      h('button', { class: 'btn sm', onclick: () => { closeModal(dlg); render(); } }, multi ? t('done') : t('close'))),
    realmNote,
    grid);
  draw();
  openModal(dlg);
}

// ------------------------------------------------------------------ render
// ------------------------------------------------------------------ 配队规则说明（让圈外人也能玩）
function teamRules() {
  const R = lang.cur === 'en' ? {
    t: 'Morimens team rules (for newcomers)',
    items: [
      'Realm (阵营/界域): each Awakener belongs to one of 4 realms — Chaos, Caro (Flesh), Aequor (Deep Sea), Ultra.',
      'Teaming: an Awakener can only team with its own realm plus Chaos; Chaos teams with any realm. (Reference only — this game does not block picks by realm, any Awakener can be placed anywhere.)',
      'A team = 4 Awakeners + 1 Keeper (you, who carries a Key Token skill).',
      'Each Awakener: 2 Wheels of Destiny (weapons) + 1 Covenant set (3/6-piece bonuses) + Command cards (Strike/Defense/Skill).',
      'Aliemus (狂气): the ultimate energy bar. When full, the Awakener unleashes Exalt (狂气爆发) — it costs Aliemus, NOT Arithmetica.',
      'Arithmetica (算力): spent to play command cards each turn.',
      'Relics (造物): items collected during the run.',
      'Damage sources in the report: Keeper dmg (your key), Tentacle, Counter, Strength, Corrosion/Poison — these help you identify the build.',
    ],
  } : {
    t: '忘却前夜配队规则（给圈外人）',
    items: [
      '界域（阵营）：每个唤醒体属于四大界域之一——混沌、血肉、深海、超维。',
      '组队：除「混沌」外，唤醒体一般只与「自身界域 + 混沌」组队；「混沌」可与任意界域组队。（这只是背景知识——选卡位不按界域限制，四个界域随便摆）',
      '一支队伍 = 4 名唤醒体 + 1 名守密人（你，携带钥令技能）。',
      '每个唤醒体：2 个命轮（武器）+ 1 套密契（3/6 件套效果）+ 指令卡（打击/防御/技能）。',
      '狂气：大招能量条，集满触发「狂气爆发」——消耗的是狂气，不是算力。',
      '算力：每回合打出指令卡所消耗的资源。',
      '造物：探索过程中获得的道具/遗物。',
      '战报里的伤害来源：守密人伤害（你的钥令）、触腕、反击、力量、侵蚀/中毒——它们能帮你锁定队伍构筑。',
    ],
  };
  return h('details', { class: 'bskills teamrules' },
    h('summary', {}, R.t),
    h('ul', {}, R.items.map(x => h('li', {}, x))));
}

function render() {
  root.replaceChildren(...[
    profilePanel(),
    controls(),
    likeBar(),
    reportPanel(),
    cluePanel(),
    h('section', { class: 'card board' },
      h('h3', {}, `${t('boardTitle')} · ${LEVELS[level].name()}${t('boardLevel', { l: '' })}`),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotCard(k))),
      swapFrom != null
        ? h('p', { class: 'note swapnote' }, t('swapHint', { l: LETTERS[swapFrom] }))
        : null,
      teamExtras(),
      h('div', { class: 'actions' },
        finished ? null : h('button', { class: 'btn', onclick: submit }, `${t('submit')}${t('submitLeft', { n: MAX_TRIES - history.length })}`),
        finished ? null : wrongSlots().length
          ? h('button', { class: 'btn ghost', onclick: clearWrong }, `${t('clearWrong')}（${wrongSlots().length}）`)
          : null,
        finished ? null : h('button', { class: 'btn ghost', onclick: () => { sel = newSel(); fb = {}; swapFrom = null; persist(); render(); } }, t('reset')))),
    teamRules(),
    historyPanel(),
    failedPanel(),
    finished ? answerPanel() : null,
  ].filter(Boolean));
}

// 云端档案不再挡首屏：先用本机存档把界面画出来，云端合并回来再补一次。
// 以前这里是 await account.ready()，最长要等 4.5 秒，白白一段「载入中」。
account.ready()
  .then((merged) => { if (merged && puzzle && !finished) render(); })
  .catch(() => {});

// 每日题的分片请求在启动时就发出去了（见文件开头的 firstPuzzle），这里只是等它回来；
// 万一那一次失败了（手机切网、边缘挂起连接），再顺次重试一次。
await start(firstPuzzle ? firstPuzzle.catch(() => dailyPuzzle()) : dailyPuzzle(), 'daily');

// 扩充题库（puzzles-extra / puzzles-more）不再整包预载：
// 现在题库是「索引 + 分片」，抽到哪道才取哪片，见 js/bank.js。

// 工坊 / 好友分享的题目：detective.html?p=ZJ2-...
const sharedCode = new URLSearchParams(location.search).get('p');
if (sharedCode) {
  const p = shareCode.dec(sharedCode);
  if (p && p.team) {
    p.custom = true;
    p.id = p.id || 'custom-' + Date.now().toString(36);
    start(p, 'random');
  } else {
    toast('题目代码无法解析');
  }
}

// 上次没发完的赞，进页面后接着发。
// 延后 1 秒：HTTP/1.1 下一个域名只有 6 个连接，这条预热请求（只为了同步
// 「我赞过谁 / 还剩几次」）不该跟首屏的图片抢连接。
setTimeout(() => likes.resume(), 1000);

// 队列里的赞发出去了：服务端回来的权威计数与额度会改本地缓存，重画一下赞数条
// （数字和「排队发送中」任一变化就重画，否则发完了提示会赖着不走）
let likeSaid = -1;
document.addEventListener('zjtt:likes', () => {
  const cur = puzzle && String(puzzle.id || '');
  if (!cur || !puzzle.custom) return;
  const n = Number(likes.cachedCounts()[cur]);
  const q = likes.pending();
  if (n !== likeCount || q !== likeSaid) {
    likeCount = Number.isNaN(n) ? likeCount : n;
    likeSaid = q;
    render();
  }
});
