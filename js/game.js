import { $, h, store, loadDict, imgEl, wan, nav, KINDS, kindName, KW, KW_TYPE, renderText, t, nameOf, lang,
  wallet, failedBank, unlocked, REPLAY, shareCode, markDirty, statsOf, scIcon, scNum, emptyState } from './common.js';
import { PEPPER } from './pepper.js';
import { auth, openLogin } from './auth.js';
import { account } from './account.js';
import { checkinBar } from './checkin.js';

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
root.textContent = t('loading');

const { D, idx } = await loadDict();
// 造物的功能标签（scripts/tag_creations.py 生成），没有也能玩
const RELIC_TAGS = await fetch('data/creation-tags.json', { cache: 'no-cache' })
  .then(r => (r.ok ? r.json() : {}))
  .catch(() => ({}));
const CORE_JSON = await (await fetch('data/puzzles.json', { cache: 'no-cache' })).json();
const P = CORE_JSON.puzzles;
// 扩充题库（data/puzzles-extra.json 等）后台加载，不拖慢首屏
let EXTRA = [];
const allP = () => P.concat(EXTRA);
// 自建题目（创意工坊）以 team 明文存在本地，与官方题库一起参与随机
const customPuzzles = () => store.get('myPuzzles', []);

// 失败题库里的题不再出现；难度档对应不同的题目难度带（入门只出简单题，大师只出难题）
const LV_RANGE = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [3, 4] };
function basePool() {
  const all = allP();
  const ok = all.filter(p => !failedBank.has(p.id));
  const src = ok.length > 8 ? ok : all;
  const [lo, hi] = LV_RANGE[level] || [1, 4];
  const band = src.filter(p => (p.diff || 2) >= lo && (p.diff || 2) <= hi);
  return (band.length >= 12 ? band : src).concat(customPuzzles());
}
// 每天一题只在核心题库里挑，避免扩充题库加载后题目跳变
const corePool = () => {
  const ok = P.filter(p => !failedBank.has(p.id));
  return ok.length ? ok : P;
};

// 随机抽题：从当前难度带（含自建题）里挑
const pickAny = () => {
  const l = basePool();
  return l[Math.floor(Math.random() * l.length)];
};

// 题目的积分价值：难度分越高给得越多
const ptsOf = (p) => Math.round(POINT_BASE + (p.diffScore || 20) * 1.2);

// ------------------------------------------------------------------ state
let puzzle, ans, level, mode, sel, fb, history, hintsUsed, finished, won, pickerKind;
level = store.get('level', 1);
mode = 'daily';

const todayKey = () => {
  const d = new Date(Date.now() + 8 * 3600e3); // UTC+8, same as the leaderboard
  return d.toISOString().slice(0, 10);
};
const dayNumber = () => Math.floor((Date.now() + 8 * 3600e3) / 864e5);
const dailyPuzzle = () => {
  const list = corePool();
  const start = (dayNumber() * 7919) % list.length;
  // 每日题若已进失败题库，顺延到下一题
  for (let i = 0; i < list.length; i++) {
    const p = list[(start + i) % list.length];
    if (!failedBank.has(p.id)) return p;
  }
  return list[start];
};

function newSel() {
  return {
    slots: LETTERS.map(() => ({ awk: null, wheels: [null, null], cov: null, pot: null })),
    key: null, relics: [],
  };
}

// answers ship obfuscated (see scripts/build_data.py); this keeps them out of plain sight, nothing more
async function unseal(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), c => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  const enc = new TextEncoder();
  for (let i = 0; i < raw.length; i += 32) {
    const ks = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${PEPPER}|${p.id}|${i / 32}`)));
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('题目解码失败');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function start(p0, m) {
  const p = await unseal(p0);
  puzzle = p; mode = m;
  ans = p.team; // already sorted by damage desc: slot A = top damage
  sel = newSel(); fb = {}; history = []; hintsUsed = 0; finished = false; won = false;
  loadClues();
  if (m === 'daily') {
    const saved = store.get(`daily:${todayKey()}:${level}`, null);
    if (saved) {
      sel = saved.sel; history = saved.history; hintsUsed = saved.hintsUsed;
      finished = saved.finished; won = saved.won; fb = saved.fb || {};
    }
  }
  // 固有造物现在由题面直接给出：老存档里如果填过它，得剔掉，否则会被倒扣分
  if (Array.isArray(sel.relics)) sel.relics = sel.relics.filter(id => !isInnateRelic(id));
  render();
}

function persist() {
  if (mode !== 'daily') return;
  store.set(`daily:${todayKey()}:${level}`, { sel, history, hintsUsed, finished, won, fb });
}

// ------------------------------------------------------------------ evaluation
function active() {
  return { wheels: level >= 2, cov: level >= 3, key: level >= 3, pot: level >= 4, relics: level >= 4 };
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
        const d = a.pot - g.pot;
        s.pot = { st: d === 0 ? 'g' : Math.abs(d) <= 2 ? 'y' : 'n', dir: d > 0 ? '↑' : d < 0 ? '↓' : '' };
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
const relicList = () => puzzle.relics || [];
const innateIds = () => (Array.isArray(puzzle.inn) && puzzle.inn.length
  ? puzzle.inn.map(String)
  : relicList().filter(id => (creationOf(id) || {}).kind === INNATE_KIND));
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

  // 等级在下方的卡位提示里已经能买到，这里只给「内在灵格」
  if (full('brk')) {
    team.push({ id: 'brk', cost: 6, label: t('clueBrk'), value: () => j(ans.map(a => a.brk)) });
  }

  if (A.pot && full('pot')) {
    team.push({ id: 'pot', cost: 8, label: t('cluePot'), value: () => j(ans.map(a => a.pot)) });
  }

  const hasCard = full('cardLv');
  const hasOmen = full('madness');
  if (hasCard || hasOmen) {
    team.push({
      id: 'build', cost: 7,
      // 老版本战报只有指令卡等级、没有疯狂预兆，标题就别把说不到的东西写上去
      label: hasCard && hasOmen ? t('clueBuild') : (hasCard ? t('clueBuildCard') : t('clueBuildOmen')),
      value: () => [
        hasCard ? `${t('cardLv')} ${j(ans.map(a => a.cardLv))}` : '',
        hasOmen ? `${t('madnessLv')} ${j(ans.map(a => a.madness))}` : '',
      ].filter(Boolean).join(' · '),
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
        const n = relicList().filter(id => relicTags(id).some(x => c.tags.includes(x))).length;
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

function clueCard(c) {
  if (isOpen(`c:${c.id}`)) {
    return h('div', { class: 'clue on' }, h('small', {}, c.label), h('b', {}, c.value()));
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
  const note = mul > 1 ? `${t('clueNote')} · ${t('clueMul', { m: mul })}` : t('clueNote');
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
    if (a.pot != null) invest.push(`${t('potLv')} Lv.${a.pot}`);
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
  const bosses = (p.boss || []).map(id => D.monster.find(m => m.id === id)).filter(Boolean);
  // 伤害构成面板
  const dc = p.dmgComp;
  const dmgCompBox = dc ? h('div', { class: 'dmgcomp' },
    h('div', { class: 'dchead' }, t('dmgCompTitle')),
    h('div', { class: 'dcgrid' },
      h('div', { class: 'dc', 'data-k': 'keeper' }, h('small', {}, t('keeper')), h('b', {}, wan(dc.keeper))),
      h('div', { class: 'dc', 'data-k': 'tentacle' }, h('small', {}, t('tentacle')), h('b', {}, wan(dc.tentacle))),
      h('div', { class: 'dc', 'data-k': 'counter' }, h('small', {}, t('counter')), h('b', {}, wan(dc.counter))),
      h('div', { class: 'dc', 'data-k': 'strength' }, h('small', {}, t('strength')), h('b', {}, wan(dc.strength))),
      h('div', { class: 'dc', 'data-k': 'poison' }, h('small', {}, t('poison')), h('b', {}, wan(dc.poison))))) : null;
  return h('section', { class: 'card report' },
    h('div', { class: 'rhead' },
      h('div', {}, h('h2', {}, `${t('reportTitle')} · ${t('season', { s: p.season })}`),
        h('div', { class: 'chips' }, chip(t('zone', { z: p.zone })), chip(t('threat', { t: p.threat })),
          p.madness ? chip(t('madness', { m: p.madness })) : null, chip(t('diffStar', { d: '★'.repeat(p.diff) }), 'gold'),
          p.diffScore != null ? chip(t('diffScore', { s: p.diffScore }), 'gold') : null,
          p.extra ? chip(t('extra'), 'dim') : null)),
      bosses.length ? h('div', { class: 'boss' }, h('div', { class: 'bimgs' }, bosses.map(b => imgEl(b.img, nameOf(b)))), h('small', {}, `${t('bossLabel')}：${bosses.map(b => nameOf(b)).join('、')}`)) : null),
    h('div', { class: 'stats' },
      stat(t('rounds'), p.rounds, t('bossRounds', { n: p.bossRounds })), stat(t('cards'), p.cards, t('energy', { n: p.energy })),
      stat(t('maxBout'), wan(p.maxBout)), stat(t('deathResist'), p.deathResist),
      stat(t('leftHp'), `${p.left}/${p.hp}`), stat(t('keyDmg'), wan(p.playerDmg)),
      stat(t('score'), p.score), stat(t('relicCount'), p.relics.length,
        level >= 4 ? t('relicInnate', { n: p.relics.filter(isInnateRelic).length }) : '')),
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

function slotCard(k) {
  const A = active();
  const g = sel.slots[k];
  const locked = finished;
  const open = (kind, apply) => () => { if (!locked) openPicker(kind, apply, k); };
  const card = h('div', { class: 'slot' },
    h('div', { class: 'shead' }, h('b', {}, t('slotHead', { l: LETTERS[k] })),
      h('span', { class: 'chips' },
        isOpen(`r${k}`) ? chip(slotRealm(k), 'gold') : null,
        isOpen(`o${k}`) ? chip(slotRole(k), 'gold') : null,
        isOpen(`l${k}`) ? chip(slotLv(k), 'gold') : null)),
    pickBtn('awakener', g.awk, open('awakener', v => { g.awk = v; }), `awk${k}`, ' big'));
  if (A.wheels) {
    card.append(h('div', { class: 'row2' }, [0, 1].map(i =>
      pickBtn('wheel', g.wheels[i], open('wheel', v => { g.wheels[i] = v; }), `w${k}${i}`))));
  }
  if (A.cov) card.append(pickBtn('covenant', g.cov, open('covenant', v => { g.cov = v; }), `cov${k}`));
  if (A.pot) {
    const f = fb[`pot${k}`] && fb[`pot${k}`].v === g.pot ? fb[`pot${k}`] : null;
    card.append(h('div', { class: `pot${f ? ' fb-' + f.c : ''}` },
      h('small', {}, t('potLv')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.max(0, (g.pot ?? 1) - 1); persist(); render(); } } }, '−'),
      h('b', {}, g.pot == null ? '—' : g.pot + (f && f.dir ? ' ' + f.dir : '')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.min(15, (g.pot ?? -1) + 1); persist(); render(); } } }, '+')));
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
    h('b', {}, `${t('slotHead', { l: LETTERS[k] })} · ${t('lv', { n: a.lv })} · ${t('potFull', { n: a.pot })} · ${t('brk', { n: a.brk })}`),
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
      puzzle.relics.map(r => mk('creation', r, isInnateRelic(r) ? ' innate' : ''))),
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
const ansDlg = h('dialog', { class: 'picker review' });
document.body.append(ansDlg);

async function viewFailed(id) {
  const p0 = P.find(x => x.id === id) || customPuzzles().find(x => x.id === id);
  if (!p0) return;
  const p = await unseal(p0);
  const mk = (kind, i) => { const e = idx[kind].get(String(i)); return h('span', { class: 'ans-i', title: e ? nameOf(e) : i }, imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : i)); };
  ansDlg.replaceChildren(
    h('div', { class: 'phead' },
      h('b', {}, `${t('failedTitle')} · ${p.id}`),
      h('span', { class: 'note' }, `${t('season', { s: p.season })} · ${t('score', { s: p.score })}`),
      h('button', { class: 'btn sm', onclick: () => ansDlg.close() }, t('close'))),
    h('div', { class: 'ans-wrap' },
      teamBlock(p.team),
      h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', p.key)),
      h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')), (p.relics || []).map(r => mk('creation', r))),
      replayBox(p)));
  ansDlg.showModal();
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
  const draw = () => {
    grid.replaceChildren();
    // 固有造物已经在题面给出去了，选择器里不再列出来
    const list = all.filter(e => (!multi || !isInnateRelic(e.id))
      && (!q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q)) && (!f1 || e[f1key] === f1) && (!f2 || e[f2key] === f2) && (!fk || (e.kw || []).includes(fk)));
    list.forEach(e => {
      const chosen = multi && sel.relics.includes(String(e.id));
      const full = multi && !chosen && sel.relics.length >= fillRelics().length;
      grid.append(h('button', { type: 'button', class: `pitem${chosen ? ' chosen' : ''}${used.has(String(e.id)) ? ' used' : ''}`, disabled: full, title: e.en,
        onclick: () => {
          const id = String(e.id);
          if (multi) {
            sel.relics = chosen ? sel.relics.filter(x => x !== id) : [...sel.relics, id];
            persist(); draw(); count.textContent = `${sel.relics.length}/${fillRelics().length}`; return;
          }
          apply(id); persist(); dlg.close(); render();
        } }, imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)), e.real === false ? h('em', { class: 'decoy' }, t('decoy')) : null));
    });
    if (!list.length) grid.append(h('p', { class: 'note' }, t('noMatch')));
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
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, `${kindName(kind)}`), count,
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); draw(); } }),
      sub(f1key, f1key === 'kind' ? t('allType') : t('allRealm'), v => { f1 = v; }), sub(f2key, f2key === 'role' ? t('allRole') : t('allRarity'), v => { f2 = v; }),
      kwSelect(),
      !multi ? h('button', { class: 'btn ghost sm', onclick: () => { apply(null); persist(); dlg.close(); render(); } }, t('clear')) : null,
      h('button', { class: 'btn sm', onclick: () => { dlg.close(); render(); } }, multi ? t('done') : t('close'))),
    grid);
  draw();
  dlg.showModal();
}

// ------------------------------------------------------------------ render
// ------------------------------------------------------------------ 配队规则说明（让圈外人也能玩）
function teamRules() {
  const R = lang.cur === 'en' ? {
    t: 'Morimens team rules (for newcomers)',
    items: [
      'Realm (阵营/界域): each Awakener belongs to one of 4 realms — Chaos, Caro (Flesh), Aequor (Deep Sea), Ultra.',
      'Teaming: except Chaos, an Awakener can only team with its own realm plus Chaos. Chaos teams with any realm.',
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
      '组队：除「混沌」外，唤醒体只能与「自身界域 + 混沌」组队；「混沌」可与任意界域组队。',
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
    reportPanel(),
    cluePanel(),
    h('section', { class: 'card board' },
      h('h3', {}, `${t('boardTitle')} · ${LEVELS[level].name()}${t('boardLevel', { l: '' })}`),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotCard(k))),
      teamExtras(),
      h('div', { class: 'actions' },
        finished ? null : h('button', { class: 'btn', onclick: submit }, `${t('submit')}${t('submitLeft', { n: MAX_TRIES - history.length })}`),
        finished ? null : h('button', { class: 'btn ghost', onclick: () => { sel = newSel(); fb = {}; persist(); render(); } }, t('reset')))),
    teamRules(),
    historyPanel(),
    failedPanel(),
    finished ? answerPanel() : null,
  ].filter(Boolean));
}

// 登录态：先把云端档案合并下来（最多等 4.5 秒），保证积分 / 解锁 / 记录是最新的
await account.ready();

await start(dailyPuzzle(), 'daily');

// 扩充题库后台加载：不阻塞首屏，加载完并入题池。
// extraFile 可以是单个路径或路径数组（题库分片），逐片加载、边到边用。
(() => {
  const files = CORE_JSON.extraFiles || (CORE_JSON.extraFile ? [CORE_JSON.extraFile] : []);
  if (!files.length) return;
  (async () => {
    for (const f of files) {
      try {
        const r = await fetch(f, { cache: 'no-cache' });
        if (!r.ok) continue;
        const j = await r.json();
        if (!j || !Array.isArray(j.puzzles) || !j.puzzles.length) continue;
        const have = new Set(allP().map(p => p.id));
        const add = j.puzzles.filter(p => !have.has(p.id));
        if (!add.length) continue;
        EXTRA = EXTRA.concat(add);
        if (!finished) render();
      } catch { /* 单个分片失败不影响其他分片 */ }
    }
  })();
})();

// 工坊 / 好友分享的题目：index.html?p=ZJ2-...
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
