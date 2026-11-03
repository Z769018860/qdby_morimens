// 《寻找伪人：Morimens》的状态机（v3）。
//
// 结构：白天（屋子里）↔ 夜里（门后），七天。
//
// 白天你面对的是**已经住进来的人**，夜里你面对的是门外的人。
// 放错人进来不会当场扣理智——它会在这个晚上杀掉屋里的一个真人。天亮你才发现少了谁。
// 所以判断的代价变成了「别人的命」，而不是你自己的一条进度条。
//
// 一条铁律：伪人身上有且只有**一处不对**，一定查得到。
// 这一处可能落在六种地方：
//   card 登记卡（界域/职介/登记号）   ask 答话（生日/身高/别名/星座）
//   self 自称   eye 瞳色   item 随身物   pet 身上的动物   line 口头禅
// 前两种档案里就有真值，随时可对；后五种**档案上没有**，只能靠图鉴里你核实过的真值。
// 图鉴的真值只在「对方说的就是真的」时才点亮——所以一周目靠档案，多周目靠眼力。
//
// 随机全部走种子：同一个种子重开一局完全一样（方便复现 bug、也方便机器人跑平衡）。

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

// 六处破绽的人话名字
export const LIE_LABEL = {
  card: '登记卡', ask: '答话', self: '自称', eye: '眼睛', item: '随身物',
  pet: '身上的动物', line: '口头禅',
};

export const NIGHT_NAME = ['第一夜', '第二夜', '第三夜', '第四夜', '第五夜', '第六夜', '第七夜'];

export const DAYS = 7;
export const VISITS = 3;         // 每晚敲几次门
export const ROOM_MAX = 8;       // 屋子最多住几个人（挤一点没关系，命要紧）
export const START_HOME = 2;     // 开局屋里已有的住户（都是真人）
export const HEAR_LIMIT = 1;     // 门外「听它说」的次数
export const PEEK_LIMIT = 1;     // 门外「凑近看」的次数
export const TALK_PER_DAY = 2;   // 白天每个住户能聊几个话题

// 每晚几个伪人 + 破绽可能落在哪几处。
// 前三夜一定留着 card / ask（档案里有真值），第四夜起才让隐晦的那几种登场——
// 一周目能抓到的就那么多，剩下的要靠图鉴，这是「多周目」存在的理由。
export const NIGHTS = [
  { f: 1, acts: 3, pool: ['card', 'ask'] },
  { f: 1, acts: 3, pool: ['card', 'ask'] },
  { f: 2, acts: 3, pool: ['card', 'ask', 'self'] },
  { f: 1, acts: 3, pool: ['ask', 'self', 'eye'] },
  { f: 2, acts: 3, pool: ['ask', 'self', 'eye', 'item'] },
  { f: 2, acts: 3, pool: ['self', 'eye', 'item', 'pet', 'line'] },
  { f: 2, acts: 3, pool: ['eye', 'item', 'pet', 'line'] },
];
export const FAKE_TOTAL = NIGHTS.reduce((a, b) => a + b.f, 0);

// 破绽落在「档案上」还是「身上」——结算和提示文案都要用
export const ON_PAPER = { card: 1, ask: 1 };

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
function makePerson(rng, c, fake, night) {
  const claims = { ...c.facts };
  const shown = c.tr ? { ...c.tr } : { self: '我', eye: '灰', item: '什么也没有', pet: '', line: '' };
  let lie = null;
  let lieV = null;

  if (fake) {
    const pool = shuffle(rng, NIGHTS[night] ? NIGHTS[night].pool : ['card', 'ask']);
    for (const kind of pool) {
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

function makeResident(rng, c, night) {
  const p = makePerson(rng, c, false, night);
  p.from = 'start';
  return p;
}

export function newRun(seed) {
  const rng = makeRng(seed);
  const roster = shuffle(rng, CHARS);
  const realN = VISITS * DAYS - FAKE_TOTAL;
  const residents = roster.slice(0, START_HOME).map((c) => makeResident(rng, c, 0));
  const real = roster.slice(START_HOME, START_HOME + realN);
  const fakes = roster.slice(START_HOME + realN, START_HOME + realN + FAKE_TOTAL);

  const list = [];
  let ri = 0;
  let fi = 0;
  for (let n = 0; n < NIGHTS.length; n++) {
    const pos = shuffle(rng, [0, 1, 2]).slice(0, NIGHTS[n].f);
    for (let i = 0; i < VISITS; i++) {
      const fake = pos.includes(i);
      const c = fake ? fakes[fi++] : real[ri++];
      const v = makePerson(rng, c, fake, n);
      v.acts = NIGHTS[n].acts;
      v.askedFields = [];
      v.heard = false;
      v.peeked = false;
      v.peekOdd = -1;
      v.obsRoll = rng();
      v.done = false;
      v.result = null;
      list.push(v);
    }
  }

  const s = {
    v: 3,
    seed: seed >>> 0,
    rp: 0,
    day: 0,
    night: 0,
    phase: 'day',        // day | night | over
    vi: 0,
    list,
    home: residents,
    bullets: 6,
    sanity: 100,
    caught: 0,           // 看破的伪人（门外拒掉 + 屋里打死）
    leaked: 0,           // 放进来的伪人
    admitted: 0,         // 一共开过几次门
    refusedReal: 0,
    killedReal: 0,
    killedFake: 0,
    deaths: [],          // 屋里死的人
    talks: 0,
    met: [],
    log: [],
    nightReport: null,   // 昨夜死了谁
    over: false,
    ending: null,
    endingWho: null,
    started: Date.now(),
  };
  touch(s);
  // 一开始就坐在屋里的人，你也算见过——图鉴别等他进门才点亮
  residents.forEach((h) => markMet(h.cid));
  return s;
}

/* -------------------------------------------------------------- 查询 */
export const currentVisitor = (s) => (s.over ? null : s.list[s.vi] || null);
export const nightCfg = (s) => NIGHTS[Math.min(s.night, NIGHTS.length - 1)];
export const homeAlive = (s) => s.home.filter((h) => h.alive);
export const homeReal = (s) => s.home.filter((h) => h.alive && !h.fake);
export const homeFake = (s) => s.home.filter((h) => h.alive && h.fake);
export const homeOf = (s, cid) => s.home.find((h) => h.cid === cid && h.alive) || null;
export const roomFull = (s) => homeAlive(s).length >= ROOM_MAX;

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
export const canHear = (s, v) => !!(v && !v.done && !s.over && !v.heard);
export const canPeek = (s, v) => !!(v && !v.done && !s.over && !v.peeked);

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
  const kn = { self: judge(v, 'self', v.shown.self), line: judge(v, 'line', v.shown.line) };
  touch(s);
  return { self: v.shown.self, line: v.shown.line, kn };
}

// 「凑近看」：瞳色、随身的东西、有没有带动物。另外还有一层说不清的直觉（软破绽）。
export function peek(s) {
  const v = currentVisitor(s);
  if (!canPeek(s, v)) return null;
  v.peeked = true;
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
  if (kind === 'admit' && roomFull(s)) return null;

  let key;
  let d = 0;
  let tag = '';
  if (kind === 'admit') {
    if (v.fake) { key = 'admit-fake'; d = 0; s.leaked++; tag = '放进'; }
    else { key = 'admit-real'; d = +2; tag = '放行'; }
    s.admitted = (s.admitted || 0) + 1;
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
  const to = (s.night + 1) * VISITS;
  // 今夜的三个人走完就该收摊，别再顺手把明晚第一个放进来
  if (s.vi + 1 >= to) return null;
  s.vi += 1;
  touch(s);
  return startVisit(s);
}

// 今夜这 3 个都处理完了没有（不能看整局：21 个里绝大部分还没轮到）
export const nightDone = (s) => {
  const from = s.night * VISITS;
  const to = from + VISITS;
  return s.vi >= to - 1 && s.list.slice(from, to).every((v) => v.done);
};

/* -------------------------------------------------------- 夜里结算 */
// 屋子里的伪人，一个一个挑人杀。挑的是**活着的真人**——它们不杀同类。
// 天亮你只知道少了谁，不知道是谁动的手：这是这套玩法的核心恐惧。
export function endNight(s) {
  const deaths = [];
  const fakes = homeFake(s);
  for (const f of fakes) {
    const targets = homeReal(s);
    if (!targets.length) break;
    if (roll(s) > 0.8) continue;   // 这一夜它只是坐着看了很久
    const t = targets[rollInt(s, targets.length)];
    t.alive = false;
    t.killedBy = f.cid;
    t.killedDay = s.day + 1;
    deaths.push({ cid: t.cid, name: t.c.n, by: f.c.n, realm: t.c.realm, k: t.c.k });
    s.deaths.push({ cid: t.cid, name: t.c.n, by: f.c.n, day: s.day + 1, how: 'night' });
    s.sanity = clampSan(s.sanity - 12);
  }
  const lonely = fakes.length > 0 && homeReal(s).length === 0;
  if (lonely) s.sanity = clampSan(s.sanity - 8);
  // 屋里一个活人都不剩、而且坐着两个以上的它们：这一层已经不算你的了
  if (lonely && fakes.length >= 2) { s.over = true; s.ending = 'leak'; s.phase = 'over'; }
  s.nightReport = { deaths, lonely, night: s.night };
  s.night += 1;
  if (s.night >= DAYS) { finish(s); return s.nightReport; }
  s.phase = 'day';
  s.day = s.night;
  // 新的一天：每个人又能聊两句了
  s.home.forEach((h) => { h.talkCount = 0; });
  // 每天补给一发：七夜下来一共 6+6 发，够用但不富余
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
    // 让它把卡上那三行再报一遍，和档案对
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
  s.vi = s.day * VISITS;
  s.list.forEach((v) => { v.talkCount = 0; });
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

  if (s.sanity <= 0) s.ending = 'san';
  else if (s.killedReal >= 3) s.ending = 'kill';
  else if (!reals.length && fakes.length >= 2) s.ending = 'leak';
  else if (!reals.length) s.ending = 'alone';
  else if ((s.admitted || 0) <= 2 || s.refusedReal >= 6) s.ending = 'shut';
  else if (clean && s.leaked === 0 && knownCount() >= 300) s.ending = 'archive';
  else if (clean && s.leaked === 0) s.ending = 'perfect';
  else {
    // 和你一起活到最后的是谁，决定这是哪个结局
    const names = reals.map((h) => h.cid);
    if (names.includes('24')) s.ending = 'split';
    else if (reals.some((h) => h.c.k === 's')) s.ending = 'broadcast';
    else if (reals.length >= 3) s.ending = 'keeper';
    else s.ending = 'dawn';
  }
  s.endingWho = reals.map((h) => h.c.n);
  return s.ending;
}

export function score(s) {
  const knownN = Object.keys(codex().known || {}).reduce((a, k) => a + Object.keys(codex().known[k]).length, 0);
  return Math.max(0, Math.round(
    s.caught * 90 + s.killedFake * 50 + s.leaked * -70 + s.refusedReal * -40 + s.killedReal * -150
    + s.sanity * 3 + s.bullets * 12 + knownN * 4
    + (s.ending === 'perfect' ? 500 : 0) + (s.ending === 'archive' ? 900 : 0),
  ));
}

/* -------------------------------------------------------------- 存档 */
const K = { save: 'zjtt:fake:save', codex: 'zjtt:fake:codex', best: 'zjtt:fake:best' };

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
  if (!s || s.v !== 3 || !Array.isArray(s.list) || !Array.isArray(s.home)) return null;
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
export function best() { return read(K.best, { ending: null, score: 0, runs: 0, days: 0 }); }
export function saveBest(res) {
  const b = best();
  const out = {
    ending: res.score > (b.score || 0) ? res.ending : b.ending,
    score: Math.max(b.score || 0, res.score),
    runs: (b.runs || 0) + 1,
    days: Math.max(b.days || 0, res.day + 1),
  };
  write(K.best, out);
  return out;
}
const clampSan = (v) => Math.max(0, Math.min(100, v));
export const ART_META = META;
