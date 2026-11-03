// 《寻找伪人：Morimens》的状态机（v4）。
//
// 结构：白天（屋子里）↔ 夜里（门后）。每个难度天数不同（7 / 10 / 14 / 18），
// 每晚敲门的次数**不固定**（2~5 个，按难度和那一夜的剧情来）。
//
// 白天你面对的是**已经住进来的人**，夜里你面对的是门外的人。
// 放错人进来不会当场扣理智——它会在这个晚上杀掉屋里的一个真人。天亮你才发现少了谁。
//
// 一条铁律：伪人身上有且只有**一处不对**，一定查得到。
// 这一处可能落在七种地方：
//   card 登记卡（界域/职介/登记号）   ask 答话（生日/身高/别名/星座）
//   self 自称   eye 瞳色   item 随身物   pet 身上的动物   line 口头禅
// 前两种档案里就有真值，随时可对；后五种**档案上没有**，只能靠图鉴里你核实过的真值。
// 图鉴的真值只在「对方说的就是真的」时才点亮——所以一周目靠档案，多周目靠眼力。
//
// 随机全部走种子：同一个种子 + 同一个难度重开一局完全一样（方便复现 bug、也方便机器人跑平衡）。

import { CHARS, META } from './gen.js';

export const FIELD_LABEL = {
  realm: '界域', role: '职介', no: '登记号', platform: '平台',
  birthday: '生日', height: '身高', alias: '别名', zodiac: '星座',
  sign: '签名', live: '直播间标题', area: '分区',
};

export const FIELD_ASK = {
  birthday: '你生日是哪天？',
  height: '你多高？',
  alias: '还有别的叫法吗？',
  zodiac: '你什么星座？',
  sign: '你主页上那句签名，写的什么？',
  live: '今晚直播间挂的什么标题？',
  area: '你挂在哪个分区？',
};

// 七处破绽的人话名字
export const LIE_LABEL = {
  card: '登记卡', ask: '答话', self: '自称', eye: '眼睛', item: '随身物',
  pet: '身上的动物', line: '口头禅',
};

/* ================================================================ 难度 */
// mul 是银芯的难度乘区；days 决定这一局有多长。
// 敲门次数是每晚现摇的（vmin~vmax），所以同一档玩两遍，节奏也不一样。
export const DIFFS = [
  {
    k: 'intro', n: '入门', days: 7, vmin: 2, vmax: 4,
    rate0: 0.30, rate1: 0.44, san: 100, bullets: 4, roomMax: 8, mul: 1,
    sub: '七夜 · 敲门两到四个', note: '第一遍值夜就该从这儿开始：人不多，破绽也多落在档案上。',
  },
  {
    k: 'std', n: '标准', days: 10, vmin: 2, vmax: 5,
    rate0: 0.34, rate1: 0.50, san: 100, bullets: 4, roomMax: 10, mul: 1.6,
    sub: '十夜 · 名单越来越长', note: '十夜，屋里会住得比较满。后半程几乎全靠图鉴。',
  },
  {
    k: 'hard', n: '硬核', days: 14, vmin: 3, vmax: 5,
    rate0: 0.38, rate1: 0.54, san: 90, bullets: 3, roomMax: 12, mul: 2.4,
    sub: '十四夜 · 理智只有 90', note: '十四夜。开局理智不满，子弹也少一发。',
  },
  {
    k: 'night', n: '噩梦', days: 18, vmin: 2, vmax: 5,
    rate0: 0.42, rate1: 0.58, san: 90, bullets: 3, roomMax: 14, mul: 3.4,
    sub: '十八夜 · 没人替你数', note: '十八夜，理智 80。破绽从第三夜起就不在纸上了。',
  },
];
export const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[0];
export const DIFF_INDEX = (k) => Math.max(0, DIFFS.findIndex((d) => d.k === k));

export const ROOM_MAX = 9;       // 屋子最多住几个人（硬核/噩梦放开到 9）
export const START_HOME = 2;     // 开局屋里已有的住户（都是真人）
export const HEAR_LIMIT = 1;     // 门外「听它说」的次数
export const PEEK_LIMIT = 1;     // 门外「凑近看」的次数
export const TALK_PER_DAY = 2;   // 白天每个住户能聊几个话题
export const ACTS = 3;           // 每个人给你三次问话

// 夜的编号：天数一长，七夜的名字就不够用了
const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十'];
export const nightName = (i) => '第' + (CN_NUM[i] || (i + 1)) + '夜';

/* ============================================================ 固定剧情 */
// 每一局都会撞上的四场戏：位置按天数比例算，所以 7 夜和 18 夜都会遇到，
// 只是「第几夜」不同。它们不只是文本——每一个都会改那一夜的规矩。
export const EVENT_INFO = {
  blackout: { n: '停电', tag: '走廊的灯全灭了，今晚来的人最少，但来的那个多半不对' },
  letter: { n: '一页名单', tag: '档案室塞进门缝一页纸：今晚多给你一次「听」和一次「看」' },
  chairs: { n: '楼上的椅子', tag: '拖椅子的声音没停过：这一夜它们不会只是坐着' },
  final: { n: '档案室来电', tag: '最后一夜，名单比平时长，而且不止一个不对' },
};

function eventFor(i, days) {
  if (days <= 4) return i === days - 1 ? 'final' : null;
  if (i === 2) return 'blackout';
  const l = Math.max(3, Math.round((days - 1) * 0.4));
  const c = Math.max(4, Math.round((days - 1) * 0.65));
  if (i === l && l !== c) return 'letter';
  if (i === c) return 'chairs';
  if (i === days - 1) return 'final';
  return null;
}

// 破绽池：越到后面越隐晦。一周目能抓到的就那么多，剩下的要靠图鉴——这是「多周目」存在的理由。
function poolOf(frac) {
  if (frac < 0.18) return ['card', 'ask'];
  if (frac < 0.34) return ['card', 'ask', 'self'];
  if (frac < 0.52) return ['ask', 'self', 'eye'];
  if (frac < 0.70) return ['ask', 'self', 'eye', 'item'];
  if (frac < 0.86) return ['self', 'eye', 'item', 'pet', 'line'];
  return ['eye', 'item', 'pet', 'line'];
}

/* ============================================================ 固定任务 */
// 每局抽三条，写在白天的侧栏上。全部达成 → 「值夜人手册」结局，并且银芯翻一档。
export const TASK_POOL = [
  { k: 'noleak', t: '一个伪人都别放进来', goal: 0, cmp: '<=', val: (s) => s.leaked },
  { k: 'clean', t: '别误杀任何一个活人', goal: 0, cmp: '<=', val: (s) => s.killedReal },
  { k: 'talk', t: '和屋里的人说满 8 次话', goal: 8, cmp: '>=', val: (s) => s.talks },
  { k: 'exec', t: '处决至少 1 个伪人', goal: 1, cmp: '>=', val: (s) => s.killedFake },
  { k: 'look', t: '听 / 看满 10 次', goal: 10, cmp: '>=', val: (s) => (s.hearN || 0) + (s.peekN || 0) },
  { k: 'guard', t: '夜里别死超过 2 个人', goal: 2, cmp: '<=', val: (s) => s.deaths.filter((d) => d.how === 'night').length },
  { k: 'close', t: '至少拦下 6 个伪人', goal: 6, cmp: '>=', val: (s) => s.caught },
  { k: 'few', t: '开门的次数不超过 10 次', goal: 10, cmp: '<=', val: (s) => s.admitted },
];
const TASK_TARGET = 3;

export function tasksOf(s) {
  return (s.tasks || []).map((t) => {
    const def = TASK_POOL.find((x) => x.k === t.k) || TASK_POOL[0];
    const v = def.val(s);
    const done = def.cmp === '<=' ? v <= def.goal : v >= def.goal;
    return { ...def, v, done, key: t.k };
  });
}
export const tasksDone = (s) => tasksOf(s).filter((t) => t.done).length;

/* ------------------------------------------------------------------ 随机 */
export function makeRng(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  return function rng() {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
const shuffle = (rng, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
};
// 存进存档的随机：只存一个整数，取第 n 个数时按需推进（读档后照样接得上）
function roll(s) {
  s.rp = (s.rp || 0) + 1;
  return makeRng((s.seed ^ Math.imul(s.rp, 0x9e3779b1)) >>> 0)();
}
const rollInt = (s, n) => Math.floor(roll(s) * n) % n;

const byName = new Map(CHARS.map((c) => [c.n, c]));
export const charOf = (cid) => byName.get(cid) || null;
export const ALL_CHARS = CHARS;

const realmOf = (c) => (c.k === 's' ? '主播' : c.realm);

// 同一界域里别人的自称/瞳色/随身物——伪人抄错时就从这些里拿
function othersOf(c, key) {
  const out = [];
  for (const x of CHARS) {
    if (x === c || realmOf(x) !== realmOf(c)) continue;
    const v = x.tr && x.tr[key];
    if (v && v !== c.tr[key]) out.push(v);
  }
  return Array.from(new Set(out));
}
function anyRealmOthers(c, key) {
  const out = [];
  for (const x of CHARS) {
    if (x === c || realmOf(x) === realmOf(c)) continue;
    const v = x.tr && x.tr[key];
    if (v) out.push(v);
  }
  return Array.from(new Set(out));
}

// 口头禅里换掉一个词：换完还是通顺的，就是念着不对劲
const SWAP = [
  ['灯', '火'], ['水', '雨'], ['门', '口'], ['影子', '颜色'], ['名字', '编号'],
  ['上面', '里面'], ['记得', '知道'], ['走廊', '楼梯'], ['疼', '冷'], ['镜子', '窗户'],
  ['眼睛', '眼眶'], ['梦', '日子'],
];
function twistLine(line) {
  for (const [a, b] of SWAP) {
    if (line.includes(a)) return line.replace(a, b);
  }
  return line + '（它把尾音吞了）';
}

/* --------------------------------------------------------------- 造人 */
function makePerson(rng, c, fake, night, pool) {
  const claims = { ...c.facts };
  const shown = c.tr ? { ...c.tr } : { self: '我', eye: '灰', item: '什么也没有', pet: '', line: '' };
  let lie = null;
  let lieV = null;

  if (fake) {
    const kinds = shuffle(rng, pool || ['card', 'ask']);
    for (const kind of kinds) {
      if (kind === 'card' || kind === 'ask') {
        const fields = shuffle(rng, (kind === 'card' ? c.card : c.ask) || []);
        let done = false;
        for (const f of fields) {
          const cands = CHARS
            .filter((x) => x.k === c.k && x.facts[f] && x.facts[f] !== c.facts[f])
            .map((x) => x.facts[f]);
          if (!cands.length) continue;
          lie = kind;
          lieV = pick(rng, Array.from(new Set(cands)));
          claims[f] = lieV;
          done = true;
          break;
        }
        if (done) break;
      } else if (kind === 'self') {
        const cands = anyRealmOthers(c, 'self');   // 自称要串界域才起疑
        if (!cands.length) continue;
        lie = 'self';
        lieV = pick(rng, cands);
        shown.self = lieV;
        break;
      } else if (kind === 'eye') {
        const cands = othersOf(c, 'eye');
        if (!cands.length) continue;
        lie = 'eye';
        lieV = pick(rng, cands);
        shown.eye = lieV;
        break;
      } else if (kind === 'item') {
        const cands = othersOf(c, 'item');
        if (!cands.length) continue;
        lie = 'item';
        lieV = pick(rng, cands);
        shown.item = lieV;
        break;
      } else if (kind === 'pet') {
        lie = 'pet';
        if (shown.pet) { lieV = '空着手，什么动物也没有'; shown.pet = ''; }
        else {
          const cands = Array.from(new Set(CHARS.map((x) => x.tr && x.tr.pet).filter(Boolean)));
          if (!cands.length) { lie = null; continue; }
          lieV = pick(rng, cands);
          shown.pet = lieV;
        }
        break;
      } else if (kind === 'line') {
        if (!shown.line) continue;
        lie = 'line';
        lieV = twistLine(shown.line);
        shown.line = lieV;
        break;
      }
    }
    // 兜底：真出现「什么都换不动」的怪事，就退回界域
    if (!lie) {
      lie = 'card';
      lieV = c.realm === '混沌' ? '血肉' : '混沌';
      claims.realm = lieV;
    }
  }

  return {
    cid: c.n, c, fake, lie, lieV, claims, shown,
    alive: true, joined: night, from: 'door', talked: {}, killedBy: null, killedDay: null,
  };
}

function makeResident(rng, c, night, pool) {
  const p = makePerson(rng, c, false, night, pool);
  p.from = 'start';
  return p;
}

/* ------------------------------------------------------------- 一局的生成 */
export function newRun(seed, diffKey) {
  const cfg = diffOf(diffKey);
  const rng = makeRng(seed);
  const roster = shuffle(rng, CHARS);
  const start = roster.slice(0, START_HOME);
  const residents = start.map((c) => makeResident(rng, c, 0, ['card', 'ask']));
  const stock = roster.slice(START_HOME);

  // 1) 先摇每晚来几个人，再按「人数不够」的情况削回去
  const visitsArr = [];
  for (let i = 0; i < cfg.days; i++) {
    let v = cfg.vmin + Math.floor(rng() * (cfg.vmax - cfg.vmin + 1));
    const ev = eventFor(i, cfg.days);
    if (ev === 'blackout') v = cfg.vmin;
    if (ev === 'final') v += 1;
    visitsArr.push(Math.max(2, v));
  }
  let total = visitsArr.reduce((a, b) => a + b, 0);
  while (total > stock.length) {
    const i = visitsArr.findIndex((v) => v > 2);
    if (i < 0) break;
    visitsArr[i] -= 1;
    total -= 1;
  }

  // 2) 按夜装配：谁站在门外、几个不对、能问几次
  const list = [];
  const nights = [];
  const offsets = [];
  let cursor = 0;
  for (let i = 0; i < cfg.days; i++) {
    const visits = visitsArr[i];
    const ev = eventFor(i, cfg.days);
    const frac = cfg.days > 1 ? i / (cfg.days - 1) : 0;
    const pool = poolOf(frac);
    const rate = cfg.rate0 + (cfg.rate1 - cfg.rate0) * frac;
    let fN = Math.max(1, Math.min(visits - 1, Math.round(visits * rate)));
    if (ev === 'blackout') fN = Math.min(visits - 1, fN + 1);
    if (ev === 'final') fN = Math.max(fN, Math.min(visits - 1, 2));

    const pos = shuffle(rng, Array.from({ length: visits }, (_, k) => k)).slice(0, fN);
    offsets.push(list.length);
    for (let k = 0; k < visits; k++) {
      const fake = pos.includes(k);
      const c = stock[cursor++];
      if (!c) break;
      const v = makePerson(rng, c, fake, i, pool);
      v.acts = ACTS;
      v.askedFields = [];
      v.heard = false;
      v.peeked = false;
      v.peekOdd = -1;
      v.obsRoll = rng();
      v.done = false;
      v.result = null;
      list.push(v);
    }
    nights.push({ visits: Math.min(visits, list.length - offsets[i]), fakes: fN, acts: ACTS, ev, pool: pool.slice() });
  }

  const fakeTotal = list.filter((v) => v.fake).length;
  const tasks = shuffle(rng, TASK_POOL).slice(0, TASK_TARGET).map((t) => ({ k: t.k }));

  const s = {
    v: 4,
    seed: seed >>> 0,
    diff: cfg.k,
    days: cfg.days,
    rp: 0,
    day: 0,
    night: 0,
    phase: 'day',        // day | night | over
    vi: 0,
    list,
    nights,
    offsets,
    home: residents,
    bullets: cfg.bullets,
    sanity: cfg.san,
    caught: 0,           // 看破的伪人（门外拒掉 + 屋里打死）
    leaked: 0,           // 放进来的伪人
    admitted: 0,         // 一共开过几次门
    refusedReal: 0,
    killedReal: 0,
    killedFake: 0,
    hearN: 0,
    peekN: 0,
    deaths: [],          // 屋里死的人
    talks: 0,
    met: [],
    log: [],
    tasks,
    nightReport: null,   // 昨夜死了谁
    over: false,
    ending: null,
    endingWho: null,
    started: Date.now(),
  };
  s.fakeTotal = fakeTotal;
  touch(s);
  // 一开始就坐在屋里的人，你也算见过——图鉴别等他进门才点亮
  residents.forEach((h) => markMet(h.cid));
  return s;
}

/* -------------------------------------------------------------- 查询 */
export const currentVisitor = (s) => (s.over ? null : s.list[s.vi] || null);
export const nightCfg = (s) => s.nights[Math.min(s.night, s.nights.length - 1)] || { visits: 2, acts: ACTS, ev: null };
export const homeAlive = (s) => s.home.filter((h) => h.alive);
export const homeReal = (s) => s.home.filter((h) => h.alive && !h.fake);
export const homeFake = (s) => s.home.filter((h) => h.alive && h.fake);
export const homeOf = (s, cid) => s.home.find((h) => h.cid === cid && h.alive) || null;
export const roomFull = (s) => homeAlive(s).length >= roomMax(s);
export const roomMax = (s) => diffOf(s.diff).roomMax || ROOM_MAX;
// 那一夜特殊规矩：多给一次听/看；它们一定下手
export const nightExtraLook = (s) => nightCfg(s).ev === 'letter';
export const shareLimit = (s, kind) => (kind === 'hear' ? HEAR_LIMIT : PEEK_LIMIT) + (nightExtraLook(s) ? 1 : 0);
export const nightVisits = (s) => (s.nights[s.night] ? s.nights[s.night].visits : 0);
export const nightFrom = (s) => s.offsets[s.night] || 0;

export function startVisit(s) {
  const v = currentVisitor(s);
  if (!v) return null;
  v.acts = nightCfg(s).acts;
  return v;
}

/* ---------------------------------------------------------- 门外的动作 */
export function canAsk(s, v, field) {
  return !!(v && !v.done && !s.over && v.acts > 0 && v.c.ask.includes(field) && !v.askedFields.includes(field));
}
export const canHear = (s, v) => !!(v && !v.done && !s.over && (v.hearN || 0) < shareLimit(s, 'hear'));
export const canPeek = (s, v) => !!(v && !v.done && !s.over && (v.peekN || 0) < shareLimit(s, 'peek'));

export function ask(s, field) {
  const v = currentVisitor(s);
  if (!canAsk(s, v, field)) return null;
  v.acts -= 1;
  v.askedFields.push(field);
  const ok = v.claims[field] === v.c.facts[field];
  touch(s);
  return { field, claim: v.claims[field], truth: v.c.facts[field], ok };
}

// 「听它说」：一次听两样东西——自称和口头禅。真人说的就是真值，伪人可能抄错。
export function hear(s) {
  const v = currentVisitor(s);
  if (!canHear(s, v)) return null;
  v.heard = true;
  v.hearN = (v.hearN || 0) + 1;
  s.hearN = (s.hearN || 0) + 1;
  const kn = { self: judge(v, 'self', v.shown.self), line: judge(v, 'line', v.shown.line) };
  touch(s);
  return { self: v.shown.self, line: v.shown.line, kn, times: v.hearN };
}

// 「凑近看」：瞳色、随身的东西、有没有带动物。另外还有一层说不清的直觉（软破绽）。
export function peek(s) {
  const v = currentVisitor(s);
  if (!canPeek(s, v)) return null;
  v.peeked = true;
  v.peekN = (v.peekN || 0) + 1;
  s.peekN = (s.peekN || 0) + 1;
  const kn = {
    eye: judge(v, 'eye', v.shown.eye),
    item: judge(v, 'item', v.shown.item),
    pet: judge(v, 'pet', v.shown.pet),
  };
  // 软破绽：真人永远看不出，伪人按夜里的概率露一相（和底细无关的另一层不安）
  const chance = [0.42, 0.4, 0.36, 0.32, 0.28, 0.22, 0.16][Math.min(6, s.night)];
  const odd = v.fake && v.obsRoll < chance ? Math.floor(roll(s) * 12) : -1;
  v.peekOdd = odd;
  touch(s);
  return { eye: v.shown.eye, item: v.shown.item, pet: v.shown.pet, odd, kn };
}

// 记图鉴 + 给这一项一个判定。
//   'ok'  你**本来就记着**，而且对得上 —— 这一句可以放心
//   'bad' 你本来就记着，但它说的不一样 —— 直接是破绽
//   'new' 你没记过：悄悄记一笔（只有说对了才会真的记进去），当下不给你结论
// 「new」不告诉你真假，是为了别让「它没被记进去」变成一眼看穿的测谎仪——
// 要知道真假，得自己翻图鉴、自己比。
function judge(v, field, value) {
  const pre = isKnown(v.cid, field);
  if (pre) {
    const truth = v.c.tr ? v.c.tr[field] : undefined;
    return (value || '') === (truth || '') ? 'ok' : 'bad';
  }
  noteTruth(v, field, value);
  return 'new';
}

// 记图鉴：只有当对方说的**确实是真值**时才点亮（伪人说错的那一项永远点不亮）
function noteTruth(v, field, value) {
  if (!v.c.tr) return false;
  if (value === v.c.tr[field]) {
    markKnown(v.cid, field);
    return true;
  }
  return false;
}

// 门外决定：只有开门 / 不开门。枪留到白天——先让人进来，再决定要不要杀，这才是这套玩法。
export function decide(s, kind) {
  const v = currentVisitor(s);
  if (!v || v.done || s.over) return null;
  const full = roomFull(s);
  if (kind === 'admit' && full) return null;
  // 屋里住满了，门外的人只能走。这不叫误拒——你自己也没地方了，所以不扣理智、不计账。
  if (kind === 'refuse' && full) kind = 'refuse_full';

  let key;
  let d = 0;
  let tag = '';
  if (kind === 'admit') {
    if (v.fake) { key = 'admit-fake'; d = 0; s.leaked++; tag = '放进'; }
    else { key = 'admit-real'; d = +2; tag = '放行'; }
    s.admitted = (s.admitted || 0) + 1;
  } else if (kind === 'refuse_full') {
    key = 'refuse-full';
    d = 0;
    tag = '没地方';
  } else {
    if (v.fake) { key = 'refuse-fake'; d = +3; s.caught++; tag = '拦下'; }
    else { key = 'refuse-real'; d = -8; s.refusedReal++; tag = '误拒'; }
  }
  s.sanity = clampSan(s.sanity + d);
  v.done = true;
  v.result = { kind, key, d, tag, fake: v.fake };

  if (kind === 'admit') {
    const h = {
      cid: v.cid, c: v.c, fake: v.fake, lie: v.lie, lieV: v.lieV,
      claims: v.claims, shown: v.shown, alive: true,
      joined: s.day, from: 'door', talked: {}, killedBy: null, killedDay: null,
    };
    s.home.push(h);
  }
  s.log.push({ night: s.night, name: v.c.n, fake: v.fake, lie: v.lie, lieV: v.lieV, kind, tag, at: 'door' });
  if (!s.met.includes(v.cid)) { s.met.push(v.cid); markMet(v.cid); }
  touch(s);
  return v.result;
}

export function nextVisitor(s) {
  const v = currentVisitor(s);
  if (v && !v.done) return null;
  const from = nightFrom(s);
  const to = from + nightVisits(s);
  // 今夜的几个人走完就该收摊，别再顺手把明晚第一个放进来
  if (s.vi + 1 >= to) return null;
  s.vi += 1;
  touch(s);
  return startVisit(s);
}

// 今夜这几个都处理完了没有（不能看整局：几十个人里绝大部分还没轮到）
export const nightDone = (s) => {
  const from = nightFrom(s);
  const to = from + nightVisits(s);
  return s.vi >= to - 1 && s.list.slice(from, to).every((v) => v.done);
};

/* -------------------------------------------------------- 夜里结算 */
// 屋子里的伪人，一个一个挑人杀。挑的是**活着的真人**——它们不杀同类。
// 天亮你只知道少了谁，不知道是谁动的手：这是这套玩法的核心恐惧。
export function endNight(s) {
  const deaths = [];
  const fakes = homeFake(s);
  const hardKill = nightCfg(s).ev === 'chairs' || nightCfg(s).ev === 'final';
  for (const f of fakes) {
    const targets = homeReal(s);
    if (!targets.length) break;
    if (!hardKill && roll(s) > 0.8) continue;   // 这一夜它只是坐着看了很久
    const t = targets[rollInt(s, targets.length)];
    t.alive = false;
    t.killedBy = f.cid;
    t.killedDay = s.day + 1;
    deaths.push({ cid: t.cid, name: t.c.n, by: f.c.n, realm: t.c.realm, k: t.c.k });
    s.deaths.push({ cid: t.cid, name: t.c.n, by: f.c.n, day: s.day + 1, how: 'night' });
    s.sanity = clampSan(s.sanity - 8);
  }
  const lonely = fakes.length > 0 && homeReal(s).length === 0;
  if (lonely) s.sanity = clampSan(s.sanity - 8);
  // 天亮回一点理智，回多少看屋里还剩几个活人：
  // 你为谁守夜，谁就是你的锚。人是你的理智来源，不是分数。
  // 一夜平安才回得了理智：屋里人多回得多，人少了就回不动。
  // 连着死人那几夜，你睡不下，也补不回来——长局的压力就压在这儿。
  if (!lonely && !deaths.length) s.sanity = clampSan(s.sanity + 2 + Math.min(4, homeReal(s).length));

  // 屋里太挤，天亮时总有人自己走。走的是真人——它们不走。
  const left = [];
  const cap = roomMax(s);
  if (homeReal(s).length > Math.max(2, cap - 2) && roll(s) < 0.45) {
    const reals = homeReal(s);
    const t = reals[rollInt(s, reals.length)];
    t.alive = false;
    t.leftDay = s.day + 1;
    left.push({ cid: t.cid, name: t.c.n });
  }

  // 屋里一个活人都不剩、而且坐着两个以上的它们：这一层已经不算你的了
  if (lonely && fakes.length >= 2) { s.over = true; s.ending = 'leak'; s.phase = 'over'; }
  s.nightReport = { deaths, lonely, left, night: s.night, ev: nightCfg(s).ev };
  s.night += 1;
  if (s.night >= s.days) { finish(s); return s.nightReport; }
  s.phase = 'day';
  s.day = s.night;
  // 新的一天：每个人又能聊两句了
  s.home.forEach((h) => { h.talkCount = 0; });
  // 每天补给一发：十四夜下来能攒出几发，但不富余
  s.bullets = Math.min(9, s.bullets + 1);
  if (s.sanity <= 0) { s.over = true; s.ending = 'san'; }
  checkOver(s);
  touch(s);
  return s.nightReport;
}

/* ---------------------------------------------------------- 白天的动作 */
export const TOPICS = ['card', 'fact', 'self', 'eye', 'item', 'who', 'past'];

export function canTalk(s, h, topic) {
  if (!h || !h.alive || s.over || s.phase !== 'day') return false;
  if (h.talked[topic]) return false;
  return (h.talkCount || 0) < TALK_PER_DAY;
}

export function talk(s, cid, topic) {
  const h = homeOf(s, cid);
  if (!h || !canTalk(s, h, topic)) return null;
  h.talked[topic] = 1;
  h.talkCount = (h.talkCount || 0) + 1;
  s.talks += 1;

  const out = { topic, who: h.c.n, lines: [], known: [], lie: null };

  if (topic === 'card') {
    // 让它把卡上那几行再报一遍，和档案对
    out.pairs = [];
    (h.c.card || []).forEach((f) => {
      const ok = h.claims[f] === h.c.facts[f];
      out.pairs.push({ f, claim: h.claims[f], truth: h.c.facts[f], ok });
      out.lines.push(FIELD_LABEL[f] + '：' + h.claims[f]);
      if (!ok) out.lie = f;
    });
  } else if (topic === 'fact') {
    const left = (h.c.ask || []).filter((f) => !h.talked['f_' + f]);
    const f = left.length ? left[0] : (h.c.ask || [])[0];
    if (f) {
      h.talked['f_' + f] = 1;
      out.field = f;
      out.lines.push(FIELD_ASK[f] + '\n「' + h.claims[f] + '」');
      out.claim = h.claims[f];
      out.truth = h.c.facts[f];
      if (h.claims[f] !== h.c.facts[f]) out.lie = f;
    }
  } else if (topic === 'self') {
    out.lines.push('「' + h.shown.self + '。」');
    out.kn = { self: judge(h, 'self', h.shown.self) };
    if (h.lie === 'self') out.lie = 'self';
  } else if (topic === 'eye') {
    out.lines.push('它把眼睛转过来。瞳色是' + h.shown.eye + '的。');
    out.kn = { eye: judge(h, 'eye', h.shown.eye) };
    if (h.lie === 'eye') out.lie = 'eye';
    out.odd = h.fake && roll(s) < 0.34 ? Math.floor(roll(s) * 12) : -1;
  } else if (topic === 'item') {
    out.lines.push('它把口袋翻出来：' + (h.shown.item || '什么也没有') +
      (h.shown.pet ? '。身上还带着' + h.shown.pet : '。身边没有活物'));
    out.kn = { item: judge(h, 'item', h.shown.item), pet: judge(h, 'pet', h.shown.pet) };
    if (h.lie === 'item') out.lie = 'item';
    if (h.lie === 'pet') out.lie = 'pet';
    out.odd = h.fake && roll(s) < 0.34 ? Math.floor(roll(s) * 12) : -1;
  } else if (topic === 'who') {
    // 情报：真人可能看错，伪人一定往真人身上指
    const reals = homeReal(s).filter((x) => x.cid !== h.cid);
    const fakes = homeFake(s).filter((x) => x.cid !== h.cid);
    let target = null;
    if (h.fake) {
      if (reals.length) target = reals[rollInt(s, reals.length)];
    } else if (fakes.length && roll(s) < 0.62) {
      target = fakes[rollInt(s, fakes.length)];
    } else if (reals.length) {
      target = reals[rollInt(s, reals.length)];
    }
    out.accuse = target ? target.cid : null;
    out.accuseName = target ? target.c.n : '';
    out.trust = target ? (h.fake ? 'lie' : (fakes.includes(target) ? 'hit' : 'miss')) : 'none';
  } else if (topic === 'past') {
    out.realmLine = h.c.realm;
  }
  touch(s);
  return out;
}

export function shoot(s, cid) {
  const h = homeOf(s, cid);
  if (!h || !h.alive || s.bullets <= 0 || s.over) return null;
  s.bullets -= 1;
  h.alive = false;
  h.killedBy = 'you';
  h.killedDay = s.day;
  let key;
  if (h.fake) {
    key = 'shoot-fake';
    s.killedFake += 1;
    s.caught += 1;
    s.sanity = clampSan(s.sanity + 8);
  } else {
    key = 'shoot-real';
    s.killedReal += 1;
    s.sanity = clampSan(s.sanity - 25);
    s.deaths.push({ cid: h.cid, name: h.c.n, by: '你', day: s.day, how: 'you' });
  }
  s.log.push({ night: s.night, name: h.c.n, fake: h.fake, lie: h.lie, lieV: h.lieV, kind: key, tag: h.fake ? '处决' : '误杀', at: 'home' });
  checkOver(s);
  touch(s);
  return { key, fake: h.fake, cid: h.cid, name: h.c.n, lie: h.lie, lieV: h.lieV, sanity: s.sanity };
}

// 天亮之后点「去门后」：进下一夜
export function startNight(s) {
  if (s.over) return null;
  s.phase = 'night';
  s.vi = nightFrom(s);
  s.home.forEach((h) => { h.talkCount = 0; });
  touch(s);
  return startVisit(s);
}

function checkOver(s) {
  if (s.over) return;
  if (s.sanity <= 0) { s.over = true; s.ending = 'san'; return; }
  if (s.killedReal >= 3) { s.over = true; s.ending = 'kill'; }
}

/* ------------------------------------------------------------- 结局 */
export function finish(s) {
  if (s.over) { if (!s.ending) s.ending = 'san'; return s.ending; }
  s.over = true;
  s.phase = 'over';
  const reals = homeReal(s);
  const fakes = homeFake(s);
  const clean = s.deaths.filter((d) => d.how === 'night').length === 0 && s.killedReal === 0;
  const names = reals.map((h) => h.cid);
  const allTasks = tasksDone(s) === (s.tasks || []).length && (s.tasks || []).length > 0;

  if (s.sanity <= 0) s.ending = 'san';
  else if (s.killedReal >= 3) s.ending = 'kill';
  else if (!reals.length && fakes.length >= 2) s.ending = 'leak';
  else if (!reals.length) s.ending = 'alone';
  else if ((s.admitted || 0) <= 2 || s.refusedReal >= 6) s.ending = 'shut';
  else if (allTasks && clean) s.ending = 'doctrine';
  else if (clean && s.leaked === 0 && knownCount() >= 300) s.ending = 'archive';
  else if (clean && s.leaked === 0) s.ending = 'perfect';
  else if ((s.hearN || 0) + (s.peekN || 0) === 0) s.ending = 'deaf';
  else if (names.includes('24') && reals.some((h) => h.c.k === 's')) s.ending = 'host';
  else if (names.includes('24')) s.ending = 'split';
  else if (reals.some((h) => h.c.k === 's')) s.ending = 'broadcast';
  else if (reals.length >= 6) s.ending = 'crowd';
  else if (s.leaked >= 6) s.ending = 'tenant';
  else if (DIFF_INDEX(s.diff) >= 2) s.ending = 'cockroach';
  else if (reals.length >= 3) s.ending = 'keeper';
  else s.ending = 'dawn';
  s.endingWho = reals.map((h) => h.c.n);
  return s.ending;
}

// 分数：难度乘区 + 时间乘区（活得越久越值钱），这就是「银芯跟难度和时间挂钩」的算法
export function scoreParts(s) {
  const cfg = diffOf(s.diff);
  const base = Math.max(0, Math.round(
    s.caught * 90 + s.killedFake * 50 + s.leaked * -70 + s.refusedReal * -40 + s.killedReal * -150
    + s.sanity * 3 + s.bullets * 12 + knownCount() * 3
    + (s.ending === 'perfect' ? 500 : 0) + (s.ending === 'archive' ? 900 : 0)
    + (s.ending === 'doctrine' ? 700 : 0),
  ));
  const timeMul = 0.6 + 0.4 * Math.min(1, (s.day + 1) / cfg.days);
  return { base, timeMul, diffMul: cfg.mul, total: Math.round(base * cfg.mul * timeMul) };
}
export function score(s) { return scoreParts(s).total; }

// 银芯：基础分按难度和时间放大，任务再补一档
export function rewardOf(s) {
  const p = scoreParts(s);
  const taskBonus = tasksDone(s) * 18;
  const gain = Math.max(2, Math.round(p.total / 12) + taskBonus);
  return { gain, taskBonus, ...p };
}

/* -------------------------------------------------------------- 存档 */
const K = { save: 'zjtt:fake:save', codex: 'zjtt:fake:codex', best: 'zjtt:fake:best', stat: 'zjtt:fake:stat' };

function read(key, dflt) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return dflt;
    const v = JSON.parse(raw);
    return v == null ? dflt : v;
  } catch (e) { return dflt; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* 隐私模式 */ }
}

let dirty = 0;
export function touch(s) {
  if (dirty) return;
  dirty = setTimeout(() => { dirty = 0; write(K.save, s); }, 400);
}
export function flush(s) { write(K.save, s); }
export function loadSave() {
  const s = read(K.save, null);
  if (!s || s.v !== 4 || !Array.isArray(s.list) || !Array.isArray(s.home)) return null;
  return s;
}
export function clearSave() { try { localStorage.removeItem(K.save); } catch (e) {} }

export function codex() {
  const c = read(K.codex, { met: [], known: {} });
  if (!Array.isArray(c.met)) c.met = [];
  if (!c.known || typeof c.known !== 'object') c.known = {};
  return c;
}
export function markKnown(cid, field) {
  const c = codex();
  const k = c.known[cid] || (c.known[cid] = {});
  if (k[field]) return false;
  k[field] = 1;
  write(K.codex, c);
  return true;
}
export function isKnown(cid, field) {
  const c = codex();
  return !!(c.known[cid] && c.known[cid][field]);
}
export function knownCount() {
  const c = codex();
  return Object.keys(c.known || {}).reduce((a, k) => a + Object.keys(c.known[k]).length, 0);
}
export const KNOWN_MAX = CHARS.length * 5;
// 见过一面就记进图鉴：局内点「鉴」也能看到这个人，不用等这一局走完
export function markMet(cid) {
  const c = codex();
  if (c.met.includes(cid)) return false;
  c.met.push(cid);
  write(K.codex, c);
  return true;
}
export function meetAll(names) {
  const c = codex();
  let add = 0;
  for (const n of names) if (!c.met.includes(n)) { c.met.push(n); add++; }
  if (add) write(K.codex, c);
  return add;
}

export function best() {
  return read(K.best, { ending: null, score: 0, runs: 0, days: 0, diff: null, endings: {}, gain: 0 });
}
// 结局只增不减的一本账：排行榜和「结局数」这一栏都读它
export function saveBest(res) {
  const b = best();
  const endings = { ...(b.endings || {}) };
  if (res.ending) endings[res.ending] = 1;
  const out = {
    ending: res.score > (b.score || 0) ? res.ending : b.ending,
    score: Math.max(b.score || 0, res.score),
    runs: (b.runs || 0) + 1,
    days: Math.max(b.days || 0, res.days || 0),
    diff: res.score > (b.score || 0) ? res.diff : (b.diff || res.diff),
    endings,
    gain: (b.gain || 0) + (res.gain || 0),
  };
  write(K.best, out);
  return out;
}
export function endingCount() { return Object.keys(best().endings || {}).length; }

// 银芯：和 js/common.js 的钱包同一个键（zjtt:credits，JSON 数字）。
// 本页不加载账号那一整套，所以只写本地；下次进带顶栏的页面时，account.js 会按流水推上云。
export function walletAdd(n) {
  let cur = 0;
  try { cur = Number(localStorage.getItem('zjtt:credits')) || 0; } catch (e) { cur = 0; }
  const v = cur + Math.max(0, Math.round(n));
  try { localStorage.setItem('zjtt:credits', JSON.stringify(v)); } catch (e) { /* 隐私模式 */ }
  try { document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' })); } catch (e) { /* noop */ }
  return v;
}

const clampSan = (v) => Math.max(0, Math.min(100, v));
export const ART_META = META;
