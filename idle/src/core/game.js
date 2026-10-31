import { hash, mulberry32 } from './rng.js';
import {
  MAX_LV_HARD, MAX_AWAKEN, OVERDRIVE_MAX, LAW_MAX, LEVEL_GATE, TEAM_SIZE, RELIC_SLOTS, ORDER_SLOTS, SAVE_VERSION, GEAR_MAX_LV, RARITY_ORDER,
} from './constants.js';
import { extraKit } from './extra.js';
import { baseStats, lvUpCost, power, skillLevel, levelCap, breakNeeded, breakCost, awakenCost, rewindPlan, overdrive, overdriveAmp, overdriveCost, law, lawAmp, lawCrit, lawCost } from './stats.js';
import { buildKit, makeMedians } from './skills.js';
import {
  ZERO, addBonus, wheelBonus, relicBonus, relicBond, relicSlotCount, relicTheme, covenantBonus, gearCost, dismantleValue,
  refineMult, refineCost, scaleBonus, REFINE_COST,
} from './gear.js';
import { ordersBonus, orderUpCost, orderBonus, orderSlotCount } from './orders.js';
import { buildEnemies, stageInfo } from './enemies.js';
import { simulate, roundLimitFor } from './battle.js';
import { emptySquads, emptyPick, normalizeSquads, normalizePick, squadUsesItem, squadsRemoveItem } from './squad.js';
import { emptyGacha, normalizeGacha, recordPull, recordBatch } from './gacha.js';
import { CREATORS, creatorKit } from './creators.js';
import { emptyEvent, noteBattle } from './event.js';

export const BATTLE_SECONDS = 25;       // assumed wall-clock length of one farm battle (offline maths)
export const OFFLINE_CAP_HOURS = 8;
export const PULL_PITY_GENESIS = 50;
export const DUP_ORDER_CORES = 30;
export const CAT_DAILY = 3;           // 校猫奖励关：非首杀的额外奖励每天最多发几次（UTC 日）
const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
export function catBonusLeft(state, now = Date.now()) {
  const c = (state.cat ||= { day: '', n: 0 });
  const d = utcDay(now);
  if (c.day !== d) { c.day = d; c.n = 0; }
  return Math.max(0, CAT_DAILY - c.n);
}
const STARTERS = ['ogier', 'lotan', 'doll', 'ramona'];

// ---------- data index ----------
export function indexData(pack) {
  const by = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
  const kits = {};
  const med = makeMedians(pack.awakeners);
  // 附加怪物表（public/data/special.json）：奖励首领校猫 + 它的出招表，跟主表一个格式，直接并进来
  const extra = pack.special || {};
  const monsters = extra.monsters?.length ? [...pack.monsters, ...extra.monsters] : pack.monsters;
  const msk = extra.msk ? { ...pack.msk, ...extra.msk } : pack.msk;
  /* 彩蛋角色（联名主播）走 core/creators.js，和官方角色同一张表：
     剧情 / 养成 / 编队全部通用，但 avail = 'GIFT'，抽卡池会按 a.creator 把他们排除。 */
  const extraAw = (pack.creators || CREATORS).filter((a) => !pack.awakeners.some((x) => x.slug === a.slug));
  const awakeners = extraAw.length ? [...pack.awakeners, ...extraAw] : pack.awakeners;
  const d = {
    ...pack,
    awakeners, monsters, msk,
    orders: pack.orders || [],
    bySlug: Object.fromEntries(awakeners.map((a) => [a.slug, a])),
    monById: Object.fromEntries(monsters.map((m) => [m.id, m])),
    wheelById: by(pack.wheels), covById: by(pack.covenants), relicById: by(pack.relics),
    orderById: by(pack.orders || []),
    kit(slug, level = 2) {
      // 彩蛋角色的技能是手写的，不走「类型模板 + 原作文本反推」那一套
      const ck = creatorKit(slug, level);
      if (ck) return ck;
      const id = `${slug}:${level}`;
      return kits[id] || (kits[id] = buildKit(d.bySlug[slug], level, med));
    },
  };
  return d;
}

// ---------- state ----------
export function newState(data, now = Date.now()) {
  const roster = {};
  for (const s of STARTERS) roster[s] = { lv: 1, star: 0, brk: 0 };
  // 开局送三个稀有钥令，让「钥令配置」一进游戏就能用（不是空系统）
  const free = (data?.orders || []).filter((o) => o.rarity === 'R').slice(0, 3).map((o) => o.id);
  return {
    v: SAVE_VERSION, created: now, lastSeen: now, seed: (now ^ 0x9e3779b9) >>> 0,
    // play = 累计游玩秒数（只在页面可见时按墙钟累加，见 src/main.js）。
    // 个人中心与站长后台的「挂机时长」都读它；离线结算的时间不算进来。
    play: 0,
    gold: 600, tickets: 12, cores: 300, stage: 1, maxStage: 0,
    auto: true,
    strategy: { defend: 0.4, target: 'low', preset: 'balanced', ult: 'first' },
    roster, team: [...STARTERS], codex: {},
    gear: { items: {}, next: 1, equip: {}, relics: Array(RELIC_SLOTS).fill(null) },
    drip: { tickets: 0, cores: 0 },
    orders: { owned: Object.fromEntries(free.map((id) => [id, 0])), slots: [free[0] || null, null, null] },
    pity: { genesis: 0, ssr: 0 },
    stats: { battles: 0, wins: 0, pulls: 0, kills: 0, gold: 0 },
    daily: { day: '' }, log: [],
    tower: { best: 0, day: '', tries: 0, runs: 0 }, trials: { cleared: {} }, ach: {}, tutorial: false,
    // 融灾禁区（M15）：每两周一期，层数在期内累积，best 永久保留
    rift: { cycle: '', floor: 0, best: 0, day: '', tries: 0, tkFrac: 0, coFrac: 0, runs: 0 },
    squads: emptySquads(), squadPick: emptyPick(), gacha: emptyGacha(),
    // 联动活动「星辉直播间」：每日任务计数 + 人气 + 已用征召券（core/event.js）
    event: emptyEvent(),
    // 签到轮转发到第几份了（core/creators.js 的 syncSigninGifts）
    gift: { signin: 0 },
  };
}

export function migrate(s, data) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return newState(data);
  const base = newState(data, Number.isFinite(Number(s.created)) && Number(s.created) > 0 ? Number(s.created) : Date.now());
  // roster 里的空值 / 非对象 / 数组一律剔掉（导入的存档可能是手改过的）
  if (!s.roster || typeof s.roster !== 'object' || Array.isArray(s.roster)) s = { ...s, roster: base.roster };
  else s = { ...s, roster: Object.fromEntries(Object.entries(s.roster).filter(([, r]) => r && typeof r === 'object' && !Array.isArray(r))) };
  const m = { ...base, ...s, strategy: { ...base.strategy, ...s.strategy }, gear: { ...base.gear, ...s.gear }, stats: { ...base.stats, ...s.stats }, pity: { ...base.pity, ...s.pity }, tower: { ...base.tower, ...s.tower }, trials: { cleared: { ...(s.trials?.cleared || {}) }, ...(s.trials?.gold ? { gold: { ...s.trials.gold } } : {}) }, ach: { ...s.ach }, signin: s.signin ? { ...s.signin } : null, welcome: s.welcome ? { ...s.welcome } : null, shop: s.shop ? { ...s.shop } : null, codex: { ...s.codex }, weekly: s.weekly ? { ...s.weekly } : null, rtower: { ...s.rtower }, arena: s.arena ? { ...s.arena } : null };
  // 数值字段：非数字 / 负数 / 无穷一律回到安全值，免得 NaN 写进存档后一路传染（金币、离线结算……）
  const num = (v, d, lo = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, n) : d; };
  m.gold = Math.floor(num(m.gold, base.gold)); m.tickets = Math.floor(num(m.tickets, base.tickets)); m.cores = Math.floor(num(m.cores, base.cores));
  m.maxStage = Math.floor(num(m.maxStage, 0));
  m.stage = Math.max(1, Math.min(m.maxStage + 1, Math.floor(num(m.stage, 1, 1))));
  m.lastSeen = Math.min(Date.now(), num(m.lastSeen, Date.now()));
  m.seed = (Math.floor(num(m.seed, base.seed)) >>> 0);
  m.auto = m.auto !== false;
  if (!m.drip || typeof m.drip !== 'object') m.drip = { tickets: 0, cores: 0 };
  // 加速 / 极速已下线：老存档里的字段直接丢掉，免得 UI 以为还有开关
  delete m.speed; delete m.skipAnim;
  // 累计游玩秒数：老存档没有就从 0 开始
  m.play = Math.max(0, Math.floor(Number(m.play) || 0));
  m.team = [...new Set(Array.isArray(m.team) ? m.team : [])].filter((x) => m.roster[x] && data.bySlug[x]).slice(0, TEAM_SIZE);
  if (!m.team.length) m.team = Object.keys(m.roster).slice(0, TEAM_SIZE);
  // roster：补 brk（突破档数），并按新的叠位上限收紧
  for (const [k, r] of Object.entries(m.roster)) {
    if (!data.bySlug[k]) { delete m.roster[k]; continue; }
    r.star = Math.max(0, Math.min(MAX_AWAKEN, Math.floor(r.star || 0)));
    r.lv = Math.max(1, Math.min(levelCap(r.star), Math.floor(r.lv || 1)));
    if (r.brk == null) r.brk = Math.min(6, Math.floor(r.lv / LEVEL_GATE));
    r.od = r.star >= MAX_AWAKEN ? overdrive(r.od) : 0;      // 超限只有叠满 99 才有
    r.law = r.od >= OVERDRIVE_MAX ? law(r.law) : 0;           // 最终法则只有超限满 99 才有
  }
  // 造物栏 3 -> 6 格：老存档补齐空位
  const rel = Array.isArray(m.gear.relics) ? m.gear.relics.slice(0, RELIC_SLOTS) : [];
  while (rel.length < RELIC_SLOTS) rel.push(null);
  m.gear.relics = rel.map((uid) => (uid && m.gear.items[uid] ? uid : null));
  // Repair legacy saves in which an automatic team change left one physical
  // gear UID on both an active member and an inactive member.
  const equipped = m.gear.equip && typeof m.gear.equip === 'object' && !Array.isArray(m.gear.equip)
    ? m.gear.equip : {};
  const seenGear = new Set();
  const priority = [...m.team, ...Object.keys(equipped).filter(slug => !m.team.includes(slug))];
  for (const slug of priority) {
    const eq = equipped[slug];
    if (!eq || typeof eq !== 'object') continue;
    for (const kind of ['wheel', 'cov']) {
      const uid = eq[kind], item = m.gear.items[uid];
      const expectedKind = kind === 'wheel' ? 'wheel' : 'covenant';
      if (!uid || !item || item.kind !== expectedKind || seenGear.has(uid)) delete eq[kind];
      else seenGear.add(uid);
    }
  }
  m.gear.equip = equipped;
  m.drip = { tickets: 0, cores: 0, ...(s.drip || {}) };
  m.drip.tickets = Math.max(0, Number(m.drip.tickets) || 0); m.drip.cores = Math.max(0, Number(m.drip.cores) || 0);
  // 钥令：老存档没有就按开局配置补上；M10 换成原作 63 件后，旧的自造 id 会被清掉
  const o = m.orders || {};
  m.orders = { owned: { ...(o.owned || base.orders.owned) }, slots: Array.isArray(o.slots) ? o.slots.slice(0, 3) : base.orders.slots };
  m.orders.owned = Object.fromEntries(Object.entries(m.orders.owned).filter(([id]) => data.orderById[id]));
  while (m.orders.slots.length < 3) m.orders.slots.push(null);
  m.orders.slots = m.orders.slots.map((id) => (id && m.orders.owned[id] != null ? id : null));
  if (!Object.keys(m.orders.owned).length) { m.orders = { ...base.orders }; }
  if (!m.orders.slots.some(Boolean)) m.orders.slots = [Object.keys(m.orders.owned)[0] || null, ...m.orders.slots.slice(1)];
  // 编队 / 挑战阵容 / 抽卡记录（M13）：老存档补空位；不存在的唤醒体、非法的编队位直接剔掉
  m.squads = normalizeSquads(s.squads, m.roster, m.gear, m.orders);
  m.squadPick = normalizePick(s.squadPick);
  m.gacha = normalizeGacha(s.gacha);
  // 融灾禁区：老存档没有就从第 0 层开始；层数夹在 0..100（换期由 riftState 惰性重置）
  const rf = { ...base.rift, ...(s.rift || {}) };
  rf.floor = Math.max(0, Math.min(100, Math.floor(rf.floor || 0)));
  rf.best = Math.max(rf.floor, Math.min(100, Math.floor(rf.best || 0)));
  rf.tries = Math.max(0, Math.floor(rf.tries || 0));
  m.rift = rf;
  // 联动活动：老存档没有就从零开始；每日计数按当天惰性重置（eventState）
  m.event = { ...base.event, ...(s.event || {}), daily: { ...base.event.daily, ...(s.event?.daily || {}) } };
  // 签到轮转：老存档按已经签到的天数折算，进游戏一次补齐（syncSigninGifts 会做）
  m.gift = { signin: Math.max(0, Math.floor(s.gift?.signin || 0)) };
  return m;
}

/* ---------- equipment helpers ---------- */
// 只有「已解锁」的造物栏位里装的造物才算数（栏位按最高通关解锁）
export function relicItemsOf(state) {
  const n = relicSlotCount(state.maxStage || 0);
  return (state.gear.relics || []).slice(0, n).map((uid) => (uid && state.gear.items[uid]) || null);
}
export function relicBonuses(state, data) {
  const items = relicItemsOf(state);
  const defs = [], bonus = ZERO();
  for (const it of items) {
    const def = it && data.relicById[it.defId];
    if (!def) { defs.push(null); continue; }
    defs.push(def);
    addBonus(bonus, scaleBonus(relicBonus(def, it.lv), refineMult(it)));
  }
  return { items, defs, bonus, bond: relicBond(defs) };
}

// ---------- stats pipeline ----------
export function allyDef(state, data, slug, teamSlugs = state.team) {
  const a = data.bySlug[slug];
  const r = state.roster[slug];
  const st = baseStats(a, r.lv, r.star, r.od, r.law);
  const bonus = ZERO();
  const eq = state.gear.equip[slug] || {};
  const wi = eq.wheel && state.gear.items[eq.wheel];
  if (wi) addBonus(bonus, scaleBonus(wheelBonus(data.wheelById[wi.defId], wi.lv, a), refineMult(wi)));
  const ci = eq.cov && state.gear.items[eq.cov];
  if (ci) {
    const count = teamSlugs.filter((t) => { const e = state.gear.equip[t]; const it = e?.cov && state.gear.items[e.cov]; return it && it.defId === ci.defId; }).length;
    addBonus(bonus, scaleBonus(covenantBonus(ci.defId, ci.lv, count), refineMult(ci)));
  }
  // 造物（含主题羁绊）与钥令都是全队被动
  const rel = relicBonuses(state, data);
  addBonus(bonus, rel.bonus);
  addBonus(bonus, rel.bond.bonus);
  addBonus(bonus, ordersBonus(state, data));
  // 叠位：每 10 层 +3% 增伤（属性与等级上限在 baseStats / levelCap 里）
  bonus.amp += Math.floor((Number.isFinite(Number(r.star)) ? Number(r.star) : 0) / 10) * 3;
  bonus.amp += overdriveAmp(r.od);          // 超限：叠满 99 之后的成长（上限 99）
  bonus.amp += lawAmp(r.law);               // 最终法则：超限满 99 之后真正无上限的成长
  bonus.critDmg += lawCrit(r.law);
  const def = {
    slug, name: a.zh, img: a.portrait, type: a.type, realm: a.realm, lv: r.lv, star: r.star,
    hp: Math.round(st.hp * (1 + bonus.hpPct / 100)),
    atk: Math.round(st.atk * (1 + bonus.atkPct / 100)),
    def: Math.round(st.def * (1 + bonus.defPct / 100)),
    critRate: st.critRate + bonus.critRate, critDmg: st.critDmg + bonus.critDmg, amp: st.amp + bonus.amp,
    aliGain: st.aliGain + bonus.aliGain, keyGain: st.keyGain + bonus.keyGain,
    healBonus: bonus.healBonus, shieldBonus: bonus.shieldBonus, steal: bonus.steal,
    surviveChance: Math.min(0.9, bonus.surviveChance), openAli: bonus.openAli, openKey: bonus.openKey,
    firstBoost: bonus.firstBoost, kit: data.kit(slug, skillLevel(r.lv, r.star)), goldBonus: bonus.gold,
    trait: a.trait || null,
    extra: extraKit(slug, a, r),            // 满超限 / 满最终法则解锁的专属技能（没解锁是 null）
  };
  def.power = power(def);
  return def;
}

// realm synergy: 3+ same realm in team => +8% atk/hp ; 4 => +15%
export function teamDefs(state, data, slugs = state.team) {
  const list = slugs.filter(Boolean).map((s) => allyDef(state, data, s, slugs));
  const realms = {};
  for (const d of list) realms[d.realm] = (realms[d.realm] || 0) + 1;
  const syn = Math.max(0, ...Object.values(realms));
  const k = syn >= 4 ? 0.15 : syn >= 3 ? 0.08 : 0;
  if (k) for (const d of list) { d.hp = Math.round(d.hp * (1 + k)); d.atk = Math.round(d.atk * (1 + k)); }
  const goldBonus = list.reduce((s, d) => s + d.goldBonus, 0);
  return { list, synergy: k, goldBonus, power: list.reduce((s, d) => s + power(d), 0) };
}

// ---------- rewards ----------
export const stageGold = (stage) => Math.round(18 * Math.pow(1.085, stage) + 9 * stage);
const DROP_RATE = 0.1;
// 每场胜利的基础掉落：金币 + 10% 装备 + 1/40 召唤券 + 1/90 银芯。
// 在线和离线用同一套比率（不足 1 的零头存进 state.drip，攒够就发），所以收益面板上的数字既是离线预估也是在线实收。
export const TICKET_PER_WIN = 1 / 40, CORE_PER_WIN = 1 / 90;

/* 挂机收益随关卡缓慢提升：召唤券每关 +1.8%、银芯每关 +2.6%，纯线性、不会指数爆炸。
   第 60 关约 2.1× / 2.6×，第 100 关约 2.8× / 3.6×——队伍能挂得越深，抽卡与淬炼才跟得上消耗。
   低于第 1 关（不该出现）按第 1 关算，避免负增长。 */
export const ticketBoost = (stage) => 1 + Math.max(0, stage) * 0.018;
export const coreBoost = (stage) => 1 + Math.max(0, stage) * 0.026;
export const ticketPerWin = (stage) => TICKET_PER_WIN * ticketBoost(stage);
export const corePerWin = (stage) => CORE_PER_WIN * coreBoost(stage);
// 面板上「平均几场掉一张券 / 一枚银芯」，方便玩家直观比较不同关卡
export const winsPerTicket = (stage) => 1 / ticketPerWin(stage);
export const winsPerCore = (stage) => 1 / corePerWin(stage);

/* 挂机收益：一场战斗按 BATTLE_SECONDS 秒算，收益 = 胜率 × 单场收益。
   这套公式同时给「当前关 / 下一关收益」面板和离线结算用，保证两处口径一致。 */
export const BATTLES_PER_HOUR = 3600 / BATTLE_SECONDS;
export function winRateOf(state, data, stage, probes = 3) {
  const copy = JSON.parse(JSON.stringify(state));
  let w = 0;
  for (let i = 0; i < probes; i++) if (runBattle(copy, data, stage).win) w++;
  return w / probes;
}
export function farmRate(state, data, stage, rate) {
  const t = teamDefs(state, data);
  const r = rate == null ? winRateOf(state, data, stage) : rate;
  const winsPerHour = BATTLES_PER_HOUR * r;
  const perBattle = Math.round(stageGold(stage) * (1 + t.goldBonus / 100));
  return {
    stage, rate: r, perBattle, power: t.power,
    goldPerHour: Math.round(perBattle * winsPerHour),
    ticketsPerHour: winsPerHour * ticketPerWin(stage), coresPerHour: winsPerHour * corePerWin(stage), dropsPerHour: winsPerHour * DROP_RATE,
    ticketBoost: ticketBoost(stage), coreBoost: coreBoost(stage),
    winsPerTicket: winsPerTicket(stage), winsPerCore: winsPerCore(stage),
  };
}
/* ---------- 挂机层：默认挂在「有收益的最高层」 ---------- */
/* 收益 = 胜率 × 单场收益，所以胜率 0 的关就是零收益。
   但挂机层一直跟着「正在攻打的那一关」走：攻坚（stage = maxStage + 1）时挂机也跟过去，
   一旦这一关——或者 maxStage 本身——打不过（一次侥幸首通、换过队伍、叠位被清、装备换掉……），
   挂机就永远卡在 0，离线结算也一直是 0。
   这里的判定统一成一句话：从想打的那一关往下扫，第一个打得过的层才是真正该挂的层。 */
export const FARM_SCAN_MAX = 60;   // 最多往下扫 60 关（单场模拟约 1ms，扫满也不会卡）
const FARM_PROBES = 2;             // 每关最多试 2 场，避免一次运气差就把能挂的关跳过去
export const FARM_STUCK_LOSSES = 3; // 在已通关的关上连输这么多场，就认为这一关也打不过了

// 战斗结果只跟这些字段有关（关卡另算），用它给扫描结果做缓存：升级 / 换装备 / 换队伍后自动失效
export function battleSig(state) {
  return [
    state.maxStage || 0,
    (state.team || []).join(','),
    Object.entries(state.roster || {}).map(([k, r]) => `${k}.${r.lv}.${r.star}.${r.brk ?? 0}.${r.od || 0}.${r.law || 0}`).join('|'),
    (state.gear?.relics || []).join(','),
    Object.entries(state.gear?.equip || {}).map(([k, e]) => `${k}:${e?.wheel || ''}/${e?.cov || ''}`).join(';'),
    Object.entries(state.orders?.owned || {}).map(([k, v]) => `${k}.${v}`).join('|'),
    (state.orders?.slots || []).join(','),
    Object.keys(state.gear?.items || {}).length,
    `${state.strategy?.defend ?? ''}/${state.strategy?.target ?? ''}/${state.strategy?.ult ?? 'first'}`,
  ].join('#');
}

// 想挂的那一关：攻坚时不能超过最高通关（推图的下一关还没打过，不能按它结算）
export function farmTargetStage(state) {
  return Math.max(1, Math.min(state.stage || 1, state.maxStage || state.stage || 1));
}

const farmCache = new Map();
export function farmableStage(state, data, from = farmTargetStage(state)) {
  const key = `${from}|${battleSig(state)}`;
  if (farmCache.has(key)) return farmCache.get(key);
  const copy = JSON.parse(JSON.stringify(state));
  let out = null;
  for (let st = from; st >= 1 && from - st < FARM_SCAN_MAX; st--) {
    for (let i = 0; i < FARM_PROBES; i++) if (runBattle(copy, data, st).win) { out = { stage: st, from, fellBack: st !== from }; break; }
    if (out) break;
  }
  if (!out) out = { stage: Math.max(1, from - FARM_SCAN_MAX), from, fellBack: true, hopeless: true };
  if (farmCache.size > 12) farmCache.clear();
  farmCache.set(key, out);
  return out;
}

// 首通奖励（面板上标出来，方便判断值不值得攻坚）
export const firstClearReward = (stage) => (stageInfo(stage).boss ? { tickets: 3, cores: 20, gear: 1, order: 1 } : { tickets: 1, cores: 4 });

export function rollItem(rng, stage, data) {
  const kinds = ['wheel', 'wheel', 'covenant', 'covenant', 'relic'];
  const kind = kinds[Math.floor(rng() * kinds.length)];
  const pool = kind === 'wheel' ? data.wheels : kind === 'covenant' ? data.covenants : data.relics;
  const boost = Math.min(0.25, stage / 200);
  const r = rng();
  const want = r < 0.04 + boost * 0.4 ? 'SSR' : r < 0.25 + boost ? 'SR' : r < 0.6 ? 'R' : 'N';
  let cand = kind === 'covenant' ? pool : pool.filter((x) => x.rarity === want);
  if (!cand.length) cand = pool.filter((x) => (x.rarity === 'SR' || x.rarity === 'SSR'));
  if (!cand.length) cand = pool;
  const def = cand[Math.floor(rng() * cand.length)];
  return { kind, defId: def.id };
}
export function addItem(state, kind, defId) {
  const uid = `g${state.gear.next++}`;
  state.gear.items[uid] = { uid, kind, defId, lv: 0 };
  return state.gear.items[uid];
}

// ---------- 钥令 ----------
export function rollOrder(rng, data) {
  const pool = data.orders || [];
  if (!pool.length) return null;
  const r = rng();
  const want = r < 0.08 ? 'SSR' : r < 0.42 ? 'SR' : 'R';
  const cand = pool.filter((x) => x.rarity === want);
  const list = cand.length ? cand : pool;
  return list[Math.floor(rng() * list.length)];
}
export function addOrder(state, id) {
  const o = (state.orders ||= { owned: {}, slots: [null, null, null] });
  o.owned ||= {};
  if (o.owned[id] == null) { o.owned[id] = 0; return { id, isNew: true, cores: 0 }; }
  // 重复的钥令折成 30 银芯：只在返回值里报数，由调用方并进自己的奖励再一次性入账（以前这里先加一遍、调用方再加一遍，会发双份）
  return { id, isNew: false, cores: DUP_ORDER_CORES };
}
export function upgradeOrder(state, id) {
  const o = state.orders; if (!o?.owned || o.owned[id] == null) return false;
  const c = orderUpCost(o.owned[id]); if (!c || state.cores < c) return false;
  state.cores -= c; state.stats.coresSpent = (state.stats.coresSpent || 0) + c;
  o.owned[id] += 1; return true;
}

export function battleSeed(state) { return (state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0); }

export function prepareBattle(state, data, stage = state.stage) {
  const t = teamDefs(state, data);
  const enemies = buildEnemies(stage, data.monsters, { msk: data.msk });
  return { team: t, enemies, seed: battleSeed(state), allies: t.list };
}

export function runBattle(state, data, stage = state.stage, extra = null) {
  const p = prepareBattle(state, data, stage);
  // 每场都有回合上限：普通关 18、Boss 关 22，打满没清场就是超时判负（见 battle.js）
  const res = simulate({ allies: p.allies, enemies: p.enemies, seed: p.seed, strategy: extra ? { ...state.strategy, ...extra } : state.strategy, maxRounds: roundLimitFor(stageInfo(stage)) });
  return { ...res, prep: p, stage };
}

// monster codex: how often each real monster was met / beaten
export function recordCodex(state, enemies, win) {
  state.codex ||= {};
  const fresh = [], bossFirst = [];
  for (const e of enemies) {
    if (!e.mid) continue;
    const c = (state.codex[e.mid] ||= { seen: 0, kills: 0 });
    if (!c.seen && !fresh.includes(e.mid)) fresh.push(e.mid);
    c.seen++;
    if (win) { if (!c.kills && e.rank === 'Boss') { state.cores = (state.cores || 0) + 5; bossFirst.push(e.mid); } c.kills++; }
  }
  return { fresh, bossFirst };
}

// apply result to state; returns reward summary
export function applyResult(state, data, res) {
  const rng = mulberry32(res.prep.seed ^ 0xabcdef);
  const rw = { gold: 0, tickets: 0, cores: 0, items: [], orders: [], firstClear: false, advanced: false };
  state.stats.battles++;
  const cx = recordCodex(state, res.prep.enemies, res.win);
  rw.newMon = cx.fresh; rw.firstBoss = cx.bossFirst; rw.coresBoss = cx.bossFirst.length * 5;
  if (res.win) {
    state.stats.wins++;
    state.stats.kills += res.kills;
    const gb = 1 + res.prep.team.goldBonus / 100;
    rw.gold = Math.round(stageGold(res.stage) * gb);
    if (res.stage > state.maxStage) {
      state.maxStage = res.stage; rw.firstClear = true;
      rw.tickets = stageInfo(res.stage).boss ? 3 : 1;
      rw.cores = stageInfo(res.stage).boss ? 20 : 4;
      if (stageInfo(res.stage).boss) {
        rw.items.push(addItem(state, ...Object.values(rollItem(rng, res.stage, data))));
        const od = rollOrder(rng, data);
        if (od) { const got = addOrder(state, od.id); if (got.isNew) rw.orders.push(got); else rw.cores += got.cores; }
      }
    }
    if (rng() < DROP_RATE * (stageInfo(res.stage).boss ? 3 : 1)) {
      const it = rollItem(rng, res.stage, data);
      rw.items.push(addItem(state, it.kind, it.defId));
    }
    // 校猫（奖励首领）：每 40 关的 Boss 关换成它，打赢额外给券 + 银芯 + 装备，首杀再翻一倍
    const cat = res.prep.enemies.find((e) => e.reward);
    const firstCat = !!cat && (state.codex?.[cat.mid]?.kills || 0) <= 1;
    if (cat && (firstCat || catBonusLeft(state) > 0)) {
      // 首杀不占每日名额；之后的每场额外奖励一天只发 CAT_DAILY 次，否则停在奖励关手动刷，一小时能刷几百张召唤券
      if (!firstCat) state.cat.n += 1;
      rw.cat = true;
      rw.tickets += 5; rw.cores += 60;
      rw.items.push(addItem(state, ...Object.values(rollItem(rng, res.stage + 8, data))));
      if (firstCat) {
        rw.catFirst = true; rw.tickets += 5; rw.cores += 60;
        rw.items.push(addItem(state, ...Object.values(rollItem(rng, res.stage + 12, data))));
      }
    }
    // 挂机零头：召唤券 / 银芯按关卡加成后的比率累积（越深的关每场给得越多），攒满 1 就进账
    const drip = (state.drip ||= { tickets: 0, cores: 0 });
    drip.tickets += ticketPerWin(res.stage); drip.cores += corePerWin(res.stage);
    const dt = Math.floor(drip.tickets), dc = Math.floor(drip.cores);
    if (dt) { drip.tickets -= dt; rw.tickets += dt; }
    if (dc) { drip.cores -= dc; rw.cores += dc; rw.dripCores = dc; }
    state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores; state.stats.gold += rw.gold;
    const alive = res.allies.filter((a) => a.alive).length;
    rw.comfortable = alive >= 3 && res.rounds <= (stageInfo(res.stage).boss ? 20 : 14);
    if (state.auto) {
      // 自动挂机：只有「从容胜利」才推进，否则留在本关继续积累
      if (res.stage === state.stage && rw.comfortable && state.stage <= state.maxStage) {
        state.stage = Math.min(state.maxStage + 1, state.stage + 1); rw.advanced = true;
      }
    } else {
      // 手动挂机：关卡由玩家用 ◀ ▶ 自己选，打赢也不自动往前走（只更新最高通关），
      // 就地留在这一关继续刷，收益按这一关算。
      rw.stayed = true;
    }
  } else if (state.auto) {
    /* 打输了。原来只在前线失败时退回 maxStage，可 maxStage 自己也可能打不过
       （首通靠运气、换过队伍、装备被卸了……），那样挂机就一直零收益。
       现在统一问 farmableStage 要「有收益的最高层」：前线失败退回去，
       在已通关的关上连输 FARM_STUCK_LOSSES 场也退回去。 */
    const miss = (state.miss ||= { stage: 0, n: 0 });
    const frontier = state.stage > state.maxStage;
    if (miss.stage === state.stage) miss.n += 1; else { miss.stage = state.stage; miss.n = 1; }
    if (frontier || miss.n >= FARM_STUCK_LOSSES) {
      const farm = farmableStage(state, data, Math.max(1, Math.min(state.stage, state.maxStage || 1)));
      if (farm.stage !== state.stage) {
        state.stage = farm.stage; rw.retreat = true; rw.retreatTo = farm.stage;
        rw.fellBack = !!farm.fellBack; rw.stuck = !frontier;
      }
      miss.stage = state.stage; miss.n = 0;
    }
  }
  // 联动活动的每日任务只数在线战斗（离线那 1000 多场不算，否则睡一觉任务就满了）
  rw.win = res.win;
  noteBattle(state, rw);
  return rw;
}

// ---------- offline ----------
export function offlineReport(state, data, now = Date.now()) {
  const secs = Math.max(0, (now - state.lastSeen) / 1000);
  if (secs < 60) return null;
  const capped = Math.min(secs, OFFLINE_CAP_HOURS * 3600);
  const n = Math.floor(capped / BATTLE_SECONDS);
  // estimate win rate on the stage we would be farming
  /* 结算层 = 真正在挂的那一关。玩家停在攻坚层（胜率 0）时不能按它结算，
     否则离线收益永远是 0——所以默认退到「有收益的最高层」（farmableStage）。 */
  const want = farmTargetStage(state);
  const farm = farmableStage(state, data, want);
  const stage = farm.stage;
  const copy = JSON.parse(JSON.stringify(state));
  let wins = 0; const probes = 6;
  for (let i = 0; i < probes; i++) if (runBattle(copy, data, stage).win) wins++;
  // 扫描时赢过、这里 6 次全擦边（胜率本来就很低）时按 1/6 兜底，避免又变成零收益
  const rate = wins ? wins / probes : (farm.hopeless ? 0 : 1 / probes);
  const w = Math.round(n * rate);
  const t = teamDefs(state, data);
  const gold = Math.round(w * stageGold(stage) * (1 + t.goldBonus / 100));
  const tickets = Math.floor(w * ticketPerWin(stage)), cores = Math.floor(w * corePerWin(stage));
  const ticketFrac = w * ticketPerWin(stage) - tickets, coreFrac = w * corePerWin(stage) - cores;
  const rng = mulberry32(hash(String(state.lastSeen)));
  const drops = [];
  const nd = Math.min(25, Math.round(w * DROP_RATE));
  for (let i = 0; i < nd; i++) { const it = rollItem(rng, stage, data); drops.push(it); }
  return {
    secs, capped, battles: n, wins: w, rate, stage, gold, tickets, cores, drops, ticketFrac, coreFrac,
    wantStage: want, fellBack: farm.fellBack, hopeless: !!farm.hopeless,
  };
}
export function claimOffline(state, rep, now = Date.now()) {
  if (rep) {
    state.gold += rep.gold; state.tickets += rep.tickets; state.cores += rep.cores || 0;
    // 离线的零头也留在 drip 里，别把它丢掉（和在线挂机完全同一套账）
    const drip = (state.drip ||= { tickets: 0, cores: 0 });
    drip.tickets += rep.ticketFrac || 0; drip.cores += rep.coreFrac || 0;
    for (const d of rep.drops) addItem(state, d.kind, d.defId);
    state.stats.gold += rep.gold;
    /* 结算时已经按「有收益的最高层」算过了，就把挂机层也切过去：
       否则领完收益又回去对着零收益的关卡打，下一次离线还是 0。 */
    if (rep.fellBack && rep.stage) { state.stage = rep.stage; const miss = (state.miss ||= { stage: 0, n: 0 }); miss.stage = rep.stage; miss.n = 0; }
  }
  state.lastSeen = now;
}

// ---------- progression ----------
export const capOf = (state, slug) => levelCap(state.roster[slug]?.star || 0);
export function levelUp(state, slug, times = 1) {
  const r = state.roster[slug]; let n = 0;
  const cap = levelCap(r.star);
  // 碰到 20 级的突破关卡就停下，等玩家付材料
  while (n < times && r.lv < cap && !breakNeeded(r.lv, r.brk) && state.gold >= lvUpCost(r.lv)) {
    state.gold -= lvUpCost(r.lv); r.lv++; n++;
  }
  return n;
}
export function levelUpMax(state, slug) { return levelUp(state, slug, MAX_LV_HARD); }

// 突破：每 20 级一次，材料 = 金币 + 银芯（银芯是全作通用材料，见详情页的「材料来源」）
export function breakThrough(state, slug) {
  const r = state.roster[slug];
  if (!r || r.lv >= levelCap(r.star) || !breakNeeded(r.lv, r.brk)) return null;
  const c = breakCost(r.lv);
  if (state.gold < c.gold || state.cores < c.cores) return null;
  state.gold -= c.gold; state.cores -= c.cores;
  state.stats.coresSpent = (state.stats.coresSpent || 0) + c.cores;
  r.brk = Math.floor(r.lv / LEVEL_GATE);
  return c;
}
// 回溯：花 100 银芯把等级直接倒回 1 级，返还当初升级与突破花的全部金币和银芯；叠位不变，等级上限也不变（上限归叠位）
export function rewindLevel(state, slug) {
  const r = state.roster[slug];
  if (!r || r.lv <= 1) return null;
  const plan = rewindPlan(r);
  if (state.cores < plan.cost) return null;
  state.cores -= plan.cost; state.stats.coresSpent = (state.stats.coresSpent || 0) + plan.cost;
  state.gold += plan.refund; state.cores += plan.refundCores;
  r.lv = 1; r.brk = 0;
  return plan;
}
// 叠位：抽到重复唤醒体 +1，也可以在详情页用银芯共鸣（成本随叠位线性上升）
/** 超限 +1：叠满 99 才能练，上限 99，花金币 + 银芯。返回花费 {gold,cores}，不能练返回 null */
export function overdriveUp(state, slug) {
  const r = state.roster[slug];
  if (!r || r.star < MAX_AWAKEN || overdrive(r.od) >= OVERDRIVE_MAX) return null;
  const c = overdriveCost(r.od);
  if (state.gold < c.gold || state.cores < c.cores) return null;
  state.gold -= c.gold; state.cores -= c.cores;
  state.stats.coresSpent = (state.stats.coresSpent || 0) + c.cores;
  r.od = overdrive(r.od) + 1;
  return c;
}

/** 最终法则 +1：超限满 99 才能练，没有上限，花金币 + 银芯 */
export function lawUp(state, slug) {
  const r = state.roster[slug];
  if (!r || r.star < MAX_AWAKEN || overdrive(r.od) < OVERDRIVE_MAX || law(r.law) >= LAW_MAX) return null;
  const c = lawCost(r.law);
  if (state.gold < c.gold || state.cores < c.cores) return null;
  state.gold -= c.gold; state.cores -= c.cores;
  state.stats.coresSpent = (state.stats.coresSpent || 0) + c.cores;
  r.law = law(r.law) + 1;
  return c;
}

export function awakenUp(state, slug) {
  const r = state.roster[slug];
  if (!r || r.star >= MAX_AWAKEN) return 0;
  const c = awakenCost(r.star);
  if (state.cores < c) return 0;
  state.cores -= c; state.stats.coresSpent = (state.stats.coresSpent || 0) + c;
  r.star += 1;
  return c;
}

export function setTeam(state, slots) {
  const seen = new Set();
  state.team = slots.filter((s) => s && state.roster[s] && !seen.has(s) && seen.add(s)).slice(0, TEAM_SIZE);
}

/* ---------- 一键配队：队伍 + 命轮 + 密契 + 造物 + 钥令 ---------- */
// 加成键的权重（越靠前越直接体现在战力上），用来比较「哪件更好」
const BW = {
  atkPct: 1, hpPct: 0.7, defPct: 0.7, critRate: 1.1, critDmg: 0.45, amp: 1.4,
  aliGain: 0.5, keyGain: 0.5, healBonus: 0.5, shieldBonus: 0.5, steal: 1.2,
  surviveChance: 120, openAli: 0.4, openKey: 0.4, firstBoost: 0.6, gold: 0.15,
};
export const bonusScore = (b) => Object.entries(b || {}).reduce((s, [k, v]) => s + (BW[k] ?? 0.2) * (Number(v) || 0), 0);

export function autoLoadout(state, data) {
  autoTeam(state, data);                     // 先按战力 + 同界域加成排出 4 人
  state.gear.equip ||= {};
  // An item UID represents one physical piece of equipment. Before the auto
  // allocator reassigns it, release old holders (including benched heroes).
  // Otherwise swapping an old hero back creates two visually equipped copies.
  for (const eq of Object.values(state.gear.equip)) {
    if (!eq) continue;
    delete eq.wheel;
    delete eq.cov;
  }
  const r = fillLoadout(state, data, state.team, { equip: state.gear.equip });
  state.gear.relics = r.relics;
  state.orders.slots = r.orders;
  return { team: [...state.team], relics: r.nRelics, orders: r.nOrders };
}

/**
 * 给一组人配装：每人 1 件命轮 + 1 件密契、已解锁格里的造物（优先凑羁绊）、钥令位。
 * 写进 target.equip（就地改），返回 { relics, orders }；主线队伍和编队的「独立配装」共用这一套。
 */
export function fillLoadout(state, data, team, target) {
  const items = Object.values(state.gear.items);
  const defOf = (it) => (it.kind === 'wheel' ? data.wheelById[it.defId] : it.kind === 'covenant' ? data.covById[it.defId] : data.relicById[it.defId]);
  const rar = (it) => (RARITY_ORDER[defOf(it)?.rarity || 'SR'] ?? 2);
  const ex = target.exclude || {};               // 别的队伍已经占着的装备 / 钥令（融灾禁区五队不许重复）
  const used = new Set(ex.items || []);
  const equip = target.equip;
  // 命轮：稀有度优先，其次同界域（命轮对同领域唤醒体有 ×1.25），再看等级
  const wheels = items.filter((i) => i.kind === 'wheel');
  for (const slug of team) {
    const a = data.bySlug[slug], eq = (equip[slug] ||= {});
    const best = wheels.filter((i) => !used.has(i.uid)).sort((x, y) => (rar(y) - rar(x))
      || (Number(defOf(y)?.realm === a.realm) - Number(defOf(x)?.realm === a.realm)) || (y.lv - x.lv))[0];
    if (best) { eq.wheel = best.uid; used.add(best.uid); } else delete eq.wheel;
  }
  // 密契：先把已有 1 / 3 件的款式凑成 2 / 4 件套装，再按稀有度补
  const covs = items.filter((i) => i.kind === 'covenant'), ccount = {};
  for (const slug of team) {
    const eq = (equip[slug] ||= {});
    const best = covs.filter((i) => !used.has(i.uid)).map((i) => {
      const c = ccount[i.defId] || 0;
      return { i, s: (c === 1 || c === 3 ? 100 : 0) + rar(i) * 10 + i.lv };
    }).sort((a, b) => b.s - a.s)[0];
    if (best) { eq.cov = best.i.uid; used.add(best.i.uid); ccount[best.i.defId] = (ccount[best.i.defId] || 0) + 1; } else delete eq.cov;
  }
  // 造物：填满已解锁的格子，优先补齐 1 / 3 / 5 件的主题（凑 2 / 4 / 6 档羁绊）
  const slots = relicSlotCount(state.maxStage || 0);
  const relics = items.filter((i) => i.kind === 'relic' && !used.has(i.uid)), picked = [], tc = {};
  for (let k = 0; k < slots; k++) {
    const best = relics.filter((i) => !picked.includes(i.uid)).map((i) => {
      const th = relicTheme(defOf(i)?.id || i.defId).zh, c = tc[th] || 0;
      return { i, th, s: (c === 1 || c === 3 || c === 5 ? 60 : 0) + rar(i) * 10 + i.lv };
    }).sort((a, b) => b.s - a.s)[0];
    if (!best) break;
    picked.push(best.i.uid); tc[best.th] = (tc[best.th] || 0) + 1;
  }
  // 钥令：按加成总分排序，取前 N 个不重复的（槽位数按最高通关解锁）
  const on = orderSlotCount(state.maxStage || 0);
  const ranked = Object.keys(state.orders.owned).filter((id) => !(ex.orders && ex.orders.has(id)))
    .map((id) => ({ id, s: bonusScore(orderBonus(data.orderById[id], state.orders.owned[id])) }))
    .sort((a, b) => b.s - a.s);
  return {
    relics: Array.from({ length: RELIC_SLOTS }, (_, i) => picked[i] || null),
    orders: Array.from({ length: ORDER_SLOTS }, (_, i) => (i < on ? ranked[i]?.id || null : null)),
    nRelics: picked.length, nOrders: Math.min(on, ranked.length),
  };
}
export function autoTeam(state, data) {
  const ranked = Object.keys(state.roster).map((s) => ({ s, p: allyDef(state, data, s, [s]).power, t: data.bySlug[s].type }))
    .sort((a, b) => b.p - a.p);
  const team = [];
  const need = ['WARDEN', 'CHORUS'];
  for (const t of need) { const c = ranked.find((x) => x.t === t && !team.includes(x.s)); if (c) team.push(c.s); }
  for (const x of ranked) if (team.length < TEAM_SIZE && !team.includes(x.s)) team.push(x.s);
  // front: warden, dps..., back: support
  const ord = { WARDEN: 0, ASSAULT: 1, CHORUS: 2 };
  team.sort((a, b) => ord[data.bySlug[a].type] - ord[data.bySlug[b].type]);
  state.team = team.slice(0, TEAM_SIZE);
}

export const PRESETS = {
  balanced: { zh: '均衡', defend: 0.4, target: 'low' },
  aggressive: { zh: '强攻', defend: 0.2, target: 'low' },
  defensive: { zh: '稳守', defend: 0.65, target: 'first' },
  focus: { zh: '集火强敌', defend: 0.4, target: 'atk' },
};
export function setPreset(state, key) { const p = PRESETS[key]; state.strategy = { preset: key, defend: p.defend, target: p.target, ult: state.strategy?.ult || 'first' }; }
/** 大招策略：first 优先开大 / sync 攒大招一起开大 / manual 手动开大（实时战斗里点头像开） */
export const ULT_MODES = {
  first: { zh: '优先开大', desc: '大招一攒满就放，排在防御、技能之前（唤醒之后）。' },
  sync: { zh: '攒大招一起开', desc: '等全队的大招都攒满再一起放，打出爆发窗口；等太久（3 次行动）或自己血量见底就不等了。' },
  manual: { zh: '手动开大', desc: '大招攒满后头像会亮起「开大」按钮，点一下，那位下一次行动就放；不点就不放。只对你正在看的实时战斗生效，离线 / 无人值守的结算仍按「优先开大」。' },
};
export function setUltMode(state, key) { if (ULT_MODES[key]) state.strategy = { ...state.strategy, ult: key }; }

// ---------- gear ops ----------
export function equipItem(state, data, slug, uid) {
  const it = state.gear.items[uid]; if (!it) return false;
  if (it.kind === 'relic') {
    if (state.gear.relics.includes(uid)) return true;
    const n = relicSlotCount(state.maxStage || 0);
    let i = state.gear.relics.indexOf(null, 0);
    if (i < 0 || i >= n) i = 0;
    state.gear.relics[i] = uid; return true;
  }
  const key = it.kind === 'wheel' ? 'wheel' : 'cov';
  // unequip from previous holder
  for (const [s, e] of Object.entries(state.gear.equip)) if (e[key] === uid) delete e[key];
  const e = (state.gear.equip[slug] ||= {});
  e[key] = uid; return true;
}
export function unequipItem(state, uid) {
  squadsRemoveItem(state, uid);
  for (const e of Object.values(state.gear.equip)) for (const k of ['wheel', 'cov']) if (e[k] === uid) delete e[k];
  state.gear.relics = state.gear.relics.map((x) => (x === uid ? null : x));
}
export const isEquipped = (state, uid) => squadUsesItem(state, uid) || state.gear.relics.includes(uid) || Object.values(state.gear.equip).some((e) => e.wheel === uid || e.cov === uid);
export function enhanceItem(state, uid) {
  const it = state.gear.items[uid]; if (!it || it.lv >= GEAR_MAX_LV) return false;
  const c = gearCost(it.kind, it.lv); if (state.gold < c) return false;
  state.gold -= c; it.lv++; return true;
}
export function dismantle(state, data, uid) {
  const it = state.gear.items[uid]; if (!it || isEquipped(state, uid)) return 0;
  const def = (it.kind === 'wheel' ? data.wheelById : it.kind === 'cov' || it.kind === 'covenant' ? data.covById : data.relicById)[it.defId];
  const v = dismantleValue(def?.rarity || 'SR', it.lv);
  state.gold += v; state.cores += dismantleCores(def?.rarity, it); delete state.gear.items[uid]; return v;
}
// 分解 returns a little 银芯: by rarity, plus half of what was spent on refining
export const dismantleCores = (rarity, it) => ({ SSR: 6, SR: 2 }[rarity] || 0) + Math.floor(REFINE_COST.slice(0, it.rf || 0).reduce((a, x) => a + x, 0) / 2);
// 精炼: spend 银芯, +8% of the item's whole bonus per tier (max 5)
export function refineItem(state, uid) {
  const it = state.gear.items[uid]; if (!it) return false;
  const c = refineCost(it); if (!c || state.cores < c) return false;
  state.cores -= c; state.stats.coresSpent = (state.stats.coresSpent || 0) + c; it.rf = (it.rf || 0) + 1; return true;
}
export const bestOwner = (state, data, def) => null;

// ---------- gacha ----------
export function pullOnce(state, data, rng) {
  const p = state.pity;
  p.genesis++; p.ssr++;
  let rarity;
  const gRate = p.genesis >= PULL_PITY_GENESIS ? 1 : 0.03 + Math.max(0, p.genesis - 38) * 0.06;
  const r = rng();
  if (r < gRate) rarity = 'Genesis';
  else if (p.ssr >= 10 || r < gRate + 0.37) rarity = 'SSR';
  else rarity = 'SR';
  if (rarity === 'Genesis') p.genesis = 0;
  if (rarity !== 'SR') p.ssr = 0;
  // 彩蛋角色（联名主播）不进池子：他们只从签到与活动赠送来（见 core/creators.js）
  const pool = data.awakeners.filter((a) => a.rarity === rarity && !a.creator);
  const a = pool[Math.floor(rng() * pool.length)];
  const own = state.roster[a.slug];
  let dup = false, gold = 0;
  if (!own) state.roster[a.slug] = { lv: 1, star: 0, brk: 0 };
  else if (own.star < MAX_AWAKEN) { own.star++; dup = true; }
  else { gold = 800; state.gold += gold; state.cores += 30; dup = true; }   // 满叠后重复：只折算金币银芯，不送超限 / 最终法则
  state.stats.pulls++;
  return { slug: a.slug, rarity, isNew: !own, dup, gold, star: state.roster[a.slug].star };
}
/** 管理员在后台发的唤醒体（站点 /grants/mine 的 awk 列表）：没有就是新获得，已有就叠位 +1。
 *  每条赠礼只领一次（id 记在 state.giftIds 里，云存档会一起带走，换设备也不会重领）。返回这次实际发出去的。 */
export function claimGifts(state, data, items) {
  const done = new Set(Array.isArray(state.giftIds) ? state.giftIds : []);
  const got = [];
  for (const g of Array.isArray(items) ? items : []) {
    const id = 'c:' + String(g && g.id || '');
    if (id === 'c:' || done.has(id)) continue;
    for (const slug of Array.isArray(g.awk) ? g.awk : []) {
      const a = data.bySlug[slug];
      if (!a) continue;
      const own = state.roster[slug];
      if (!own) { state.roster[slug] = { lv: 1, star: 0, brk: 0 }; got.push({ slug, zh: a.zh, isNew: true }); }
      else if (own.star < MAX_AWAKEN) { own.star++; got.push({ slug, zh: a.zh, isNew: false }); }
      else { state.cores += 30; got.push({ slug, zh: a.zh, isNew: false, full: true }); }
    }
    done.add(id);
  }
  if (got.length || done.size !== (Array.isArray(state.giftIds) ? state.giftIds.length : 0)) state.giftIds = [...done].slice(-200);
  return got;
}
export function summon(state, data, n) {
  if (state.tickets < n) return null;
  state.tickets -= n;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const p = pullOnce(state, data, rng);
    recordPull(state, { ...p, banner: 'ticket', idx: i, t: now });   // 流水：面板上的「抽卡记录 / 欧非」
    out.push(p);
  }
  recordBatch(state, out);
  return out;
}
// 银芯召唤: 200 each, 10-pull 1900 (shares the pity counters with 召唤券)
export const CORE_PULL_COST = 200, CORE_PULL10_COST = 1900;
export function summonCores(state, data, n) {
  const cost = n === 10 ? CORE_PULL10_COST : CORE_PULL_COST * n;
  if (state.cores < cost) return null;
  state.cores -= cost; state.stats.coresSpent = (state.stats.coresSpent || 0) + cost;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    const p = pullOnce(state, data, rng);
    recordPull(state, { ...p, banner: 'core', idx: i, t: now });
    out.push(p);
  }
  recordBatch(state, out);
  return out;
}
export const EQUIP_CORE_COST = 80;     // 银芯祈愿: one item, rarity SR or better
export function equipPullCores(state, data, n = 1) {
  if (state.cores < EQUIP_CORE_COST * n) return null;
  state.cores -= EQUIP_CORE_COST * n; state.stats.coresSpent = (state.stats.coresSpent || 0) + EQUIP_CORE_COST * n;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  for (let i = 0; i < n; i++) {
    let it;
    for (let k = 0; k < 20; k++) { it = rollItem(rng, Math.max(20, state.maxStage), data); const def = (it.kind === 'wheel' ? data.wheelById : it.kind === 'covenant' ? data.covById : data.relicById)[it.defId]; if (it.kind === 'covenant' || ['SR', 'SSR'].includes(def?.rarity)) break; }
    out.push(addItem(state, it.kind, it.defId));
  }
  return out;
}
export const EQUIP_PULL_COST = 400;
export function equipPull(state, data, n) {
  const cost = EQUIP_PULL_COST * n;
  if (state.gold < cost) return null;
  state.gold -= cost;
  const rng = mulberry32(battleSeed(state));
  const out = [];
  for (let i = 0; i < n; i++) { const it = rollItem(rng, Math.max(10, state.maxStage), data); out.push(addItem(state, it.kind, it.defId)); }
  return out;
}


export function serialize(state) { return JSON.stringify(state); }
