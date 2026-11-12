// 逆潮守关（Den）：这一次你站在怪物这一边。
//
// 每关给一支「玩家阵容」（4 位唤醒体 + 等级 / 叠位 + 战术规则），你要在**算力**上限里
// 从现有怪物库里挑怪、给每只怪定一个成长档，组成守关队，把它们全部打光才算守住。
//
// 三条设计底线：
//  1. 算力把「一只大怪」锁死：首领单价 8.5 起，预算 10~31，单首领最多拿个 1 星不到的结局；
//     另外「孤军」规则——守关队只有 1 只时玩家全体增伤，四打一是真的打不过。
//  2. 每只怪要么是「近战」（只能打前排），要么是「远程」（可以越过前排），站位因此有代价。
//  3. 八条守关特性各自被一种玩家战术克制，玩家的关卡规则（屏障 / 反震 / 重甲 / 压疗 / 封印）
//     反过来克制某些怪——所以每一关的「最优解」都不一样，抄不了上一关的阵容。
import { hash, mulberry32 } from './rng.js';
import { simulate, DMG_SCALE } from './battle.js';
import { teamDefs, newState } from './game.js';
import { makeEnemy, DOMAINS } from './enemies.js';
import { patternOf } from './monsters.js';
import { DEN_MAX, MAX_LV, MAX_AWAKEN } from './constants.js';

export { DEN_MAX };
// 前 100 关是「第一程」：玩家的练度从这里一路长到满级满叠。
// 101~200 是「第二程」：玩家的等级叠位已经到顶，变强改走装备 / 法则 / 战术三条线，
// 守关方这边同步解锁更狠的战术组合与更厚的算力预算。分段是为了不把前 100 关的定档打乱
// （直接把 200 关摊到同一条曲线上，第 1~100 关会突然全部变简单）。
export const DEN_BASE = 100;
export const DEN_SLOTS = 5;              // 守关队最多 5 只（再多玩家一张群体技就洗完了）
export const DEN_ROUNDS = 20;

/* ------------------------------------------------------------------ 成长档 */
// 同一只怪可以练成三档。档位越高越贵，但属性涨得比价钱快一点点——
// 高档是「少而精」，低档是「多而杂」：一个吃玩家群体技，一个吃玩家单体集火。
export const DEN_TIERS = [
  { id: 't1', zh: '幼体', short: '幼', cost: 1, hp: 1, atk: 1, def: 1, note: '便宜、量大，怕群攻' },
  { id: 't2', zh: '成体', short: '成', cost: 1.55, hp: 1.62, atk: 1.5, def: 1.32, note: '主力档，性价比最稳' },
  { id: 't3', zh: '巨体', short: '巨', cost: 2.35, hp: 2.55, atk: 2.25, def: 1.75, note: '一口价很贵，单只却怕集火' },
];
export const tierOf = (id) => DEN_TIERS.find((t) => t.id === id) || DEN_TIERS[0];

/* ------------------------------------------------------------------ 守关特性 */
/* 每条特性都对着一种「玩家怎么打」：
   bulwark 怕多段 / 毒；spines 怕小刀慢磨；venom 怕治疗与速杀；leech 怕爆发；
   sunder 怕护盾；frenzy 怕控血；ward 怕群体；seal 怕不靠大招的队。 */
export const DEN_GUARDS = {
  bulwark: { zh: '壁垒', short: '壁', d: '单次受到的直接伤害不超过自身最大生命的 14%（多段 / 毒 / 流血照常打满）', counter: '多段、持续伤害' },
  spines: { zh: '棘刺', short: '棘', d: '受到直接伤害时反弹 10% 给攻击者（不吃防御）', counter: '小刀慢磨、治疗' },
  venom: { zh: '蚀毒', short: '毒', d: '普通攻击附带 1 层中毒（每层每回合掉施毒者 10% 攻击）', counter: '净化、速杀' },
  leech: { zh: '汲取', short: '汲', d: '造成直接伤害的 22% 转为自身治疗', counter: '爆发秒杀' },
  sunder: { zh: '破甲', short: '破', d: '直接命中时有 30% 概率让目标防御 -18%（2 回合）', counter: '护盾、免伤' },
  frenzy: { zh: '狂血', short: '狂', d: '生命首次降到 45% 以下时，攻击永久 +45%', counter: '控血、拖到最后一击' },
  ward: { zh: '庇护', short: '庇', d: '每 2 回合给最残的友军 10% 最大生命的护盾', counter: '群体伤害、溢出点杀' },
  seal: { zh: '噤声', short: '噤', d: '每 3 回合封住玩家能量最高的一人 1 回合（放不出大招）', counter: '分散能量、平A 输出' },
  cleanse: { zh: '涤净', short: '涤', d: '每回合开始净化自身的中毒，并撕掉 2 条流血（持续伤害流在它面前只剩零头）', counter: '多段直接伤害、速杀' },
  ironscale: { zh: '逆鳞', short: '鳞', d: '吃到的反击 / 反震伤害削减 70%（靠反击被动蹭血的打法在它面前失效）', counter: '真刀真枪的直接输出' },
  /* 第三程（201 关起）才解禁的两条：前 200 关的怪物特性保持不变，老关卡的平衡不会被这两条打乱。 */
  regrow: { zh: '再生', short: '生', d: '每回合开始回复自身 6% 最大生命（玩家带压疗时只剩 3%）——磨血拖不死，得靠爆发一口吃掉', counter: '爆发、压疗' },
  thornmail: { zh: '棘甲', short: '甲', d: '单次直接伤害低于自身最大生命 6% 时反弹 18%（一次重击反而不会被弹）——专治多段小刀', counter: '一击重击、毒与流血' },
};
export const DEN_GUARD_KEYS = Object.keys(DEN_GUARDS);
const GUARD_BY_RANK = {
  Normal: ['venom', 'spines', 'ward', 'sunder', 'cleanse'],
  Elite: ['spines', 'sunder', 'seal', 'bulwark', 'frenzy', 'cleanse', 'ironscale'],
  Boss: ['bulwark', 'leech', 'frenzy', 'seal', 'ward', 'ironscale'],
};
/* 201 关之后（第三程）追加的新特性池：同样按 id 定死，只是换了一套「更针对后期打法」的表。
   不直接并进上面那张表，是因为 guard 是按怪物 id 定的——并进去会让前 200 关的同一只怪
   突然换了特性，老关卡的手感与平衡全部跟着变。 */
const GUARD_BY_RANK_LATE = {
  Normal: ['venom', 'spines', 'ward', 'sunder', 'cleanse', 'regrow', 'thornmail'],
  Elite: ['spines', 'sunder', 'seal', 'bulwark', 'frenzy', 'cleanse', 'ironscale', 'regrow', 'thornmail'],
  Boss: ['bulwark', 'leech', 'frenzy', 'seal', 'ward', 'ironscale', 'regrow', 'thornmail'],
};

/* ------------------------------------------------------------------ 关卡 */
/* 10 章，每章一种「玩家打法」。玩家的战术规则直接借主线 90 关后的域规（battle.js 里己方加成的那一套），
   语义正好反过来：以前是「敌人怎么恶心玩家」，现在是「玩家怎么恶心怪物」。 */
export const DEN_CHAPTERS = [
  { zh: '雾港巡礼', note: '标准四人小队：一坦一奶两输出，没有花招。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: [] },
  { zh: '熔蚀前线', note: '双合唱洗地，小怪海会被一扫而空；重甲让硬砸更吃亏。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['armor'] },
  { zh: '沉没钟楼', note: '双守护双治疗：血厚、盾厚、还抬得起来，是最考验输出的一章。', comp: ['WARDEN', 'WARDEN', 'CHORUS', 'CHORUS'], rules: [] },
  { zh: '猩红温室', note: '三突击集火，反震会把一次巨伤连本带利弹回来。', comp: ['WARDEN', 'ASSAULT', 'ASSAULT', 'ASSAULT'], rules: ['thorns'] },
  { zh: '回响墓园', note: '高暴击的收割队，血线掉得比你想象快。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['crit'] },
  { zh: '潮汐监牢', note: '双合唱加双坦，重甲让硬砸更吃亏。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['armor'] },
  { zh: '倒悬教堂', note: '压疗加暴击：你的汲取与回复被砍掉一大半，对面还专挑血线崩的那一刻落锤。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['antiheal', 'crit'] },
  { zh: '无光之海', note: '反震加集火：打得太狠会被弹死，打得太慢会被磨死。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['thorns'] },
  { zh: '镜面都市', note: '暴击与重甲并存的均衡队，没有明显短板。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['crit', 'armor'] },
  { zh: '终末列车', note: '重甲加反震，只有针对性的守关队才拦得住。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['armor', 'thorns'] },
  /* ---- 第二程（101~200）：玩家的等级与叠位已经到顶，变强改走装备、法则与战术。
     打法从「一种主题」变成「两种主题叠着来」，而且从第 11 章起章中就会提前叠第二条规则。 ---- */
  { zh: '锈钟回廊', note: '压疗叠重甲：你回不上血，硬砸又吃不进防御——第二程的门槛章。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['antiheal', 'armor'] },
  { zh: '猩红祭坛', note: '暴击叠反震：对面落锤又重又快，你打回去还要被弹。', comp: ['WARDEN', 'ASSAULT', 'ASSAULT', 'ASSAULT'], rules: ['crit', 'thorns'] },
  { zh: '缄默深井', note: '压疗叠暴击：血线一崩就再也抬不回来。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['antiheal', 'crit'] },
  { zh: '千齿墓室', note: '续航叠压疗：奶量与「打不死」的墙一起上，全章最考验「磨」——速杀流会在这里卡住。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['heal', 'antiheal'] },
  { zh: '熔心工厂', note: '暴击叠重甲：既砍得动你的墙，又扛得住你的爆发。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['crit', 'armor'] },
  { zh: '暗潮圣所', note: '续航叠暴击：抬得起来又打得痛，拖久了必翻车。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['heal', 'crit'] },
  { zh: '无归阶梯', note: '压疗叠反震的双奶队：血抬不起来，打回去还要被弹——慢一回合就少一个人。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['crit', 'thorns'] },
  { zh: '逆位天穹', note: '重甲 + 反震 + 暴击三条一起开：没有短板的均衡队，得靠机制硬啃。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['armor', 'thorns', 'crit'] },
  { zh: '尽头的海', note: '反震叠压疗：打回去要被弹，抬血又被砍——倒数第二关，先把续航与站位都想清楚。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['thorns', 'antiheal'] },
  { zh: '逆潮之眼', note: '终局：重甲、暴击、反震全开，玩家的练度也走完了最后一格。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['crit', 'armor', 'thorns'] },
  /* ---- 第三程（201~220）：玩家把「装备 + 法则 + 战术」三条线都走完了，
     守关方这边只剩最后一招——四条战术同时开，而且从章中就开始叠第三条。
     这两章会解禁两条新守关特性（再生 / 棘甲），专门针对「磨血」和「多段小刀」两种打法。 ---- */
  { zh: '逆潮王座', note: '四条战术全开的第一章：治疗被压、硬砸吃防御、打回去被弹、对面还专挑暴击落锤。章中就会叠上第三条。', comp: ['WARDEN', 'CHORUS', 'ASSAULT', 'ASSAULT'], rules: ['antiheal', 'armor', 'thorns', 'crit'] },
  { zh: '终局之潮', note: '终章：它抬得起来，你抬不起来。续航与压疗同时开，再叠重甲与暴击——没有一条打法能一路走到底。', comp: ['WARDEN', 'CHORUS', 'CHORUS', 'ASSAULT'], rules: ['heal', 'antiheal', 'crit', 'armor'] },
];

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, Number(x) || 0));
/* 进度参数：第 1 关 0、第 100 关 1、第 200 关 2、第 220 关 2.2。
   第一程走 (0,1) 的曲线，之后每往后 100 关再 +1 —— 分母固定成 DEN_BASE，不跟着 DEN_MAX 走：
   0.19.0 把总关数从 200 扩到 220 时，如果按 (DEN_MAX - DEN_BASE) 算，第 200 关的 p 会从 2 掉到 1.83，
   前 200 关的数值全部被压缩一遍，老玩家的关卡手感直接变形。 */
const prog = (n) => {
  const num = clamp(Math.round(n), 1, DEN_MAX);
  return num <= DEN_BASE ? (num - 1) / (DEN_BASE - 1) : 1 + (num - DEN_BASE) / DEN_BASE;
};
// 玩家阵容的成长曲线：第 1 关 50 级 0 叠，第 100 关 159 级 99 叠（等级与叠位到顶）。
// 指数取 0.92 / 1.35：前期升得快一点（让玩家先尝到「怪要练档」），后期叠位补上尾段。
export const playerLv = (n) => Math.round(50 + 109 * Math.pow(clamp(prog(n), 0, 1), 0.92));
// 叠位必须够撑住等级：stats.js 的 levelCap = 60 + 叠位（满叠 159 级）。
// 两条曲线原来是各算各的，中段会出现「Lv.108 只有 39 叠」这种根本练不出来的影子号——
// 玩家一眼就看出来（详情里还有每人的 Lv / 叠位），属于「安排出来的作弊号」。
// 现在取「曲线值」与「等级要求的叠位」中的大者，等级曲线本身不动，守关侧的数值也不受影响
// （denPlayerDefs 会把总血 / 总攻归一化到固定曲线，叠位只影响技能等级与增伤那一档）。
export const playerStar = (n) => {
  const curve = Math.round(99 * Math.pow(clamp(prog(n), 0, 1), 1.35));
  return Math.min(MAX_AWAKEN, Math.max(curve, playerLv(n) - MAX_LV));
};
// 守关方的算力预算：10 → 15 → 21，一路只涨不回落。
// 第二程的增量更陡（+0.06/关 vs 第一程 +0.05/关）：玩家那边已经满级，这边只能多给几只怪。
export const cpuBudget = (n) => Math.round((10 + 5 * clamp(prog(n), 0, 1) + 6 * Math.max(0, prog(n) - 1) + 2 * Math.max(0, prog(n) - 2)) * 10) / 10;
// 怪物数值的关卡系数：跟着玩家一起长大，但留一点缺口（5.6 倍 vs 玩家的 6.3 倍），
// 缺口靠「练档 + 特性搭配」补——不补就会被后期的玩家阵容反推。
// 末段加速：后期玩家的强度不是线性的（第 9/10 章开始叠两条战术规则、暴击与重甲同时开），
// 守关方只按线性追就会在最后 30 关集体掉队（实测第 8~10 章只剩 2/10）。t² 那一项就是补这个缺口。
// 第二程（p > 1）继续按同一条抛物线走：p = 2 时约 19 倍，与玩家那边的 3 倍增幅 × 预算 1.4 倍相抵。
export const denScale = (n) => {
  const p = prog(n);
  // 第三程（p > 2）的尾巴再陡一档：玩家那 3 倍增幅也在往上走，只按同一条抛物线追会掉队。
  return 1 + 5.4 * p + 1.8 * p * p + 17 * Math.max(0, p - 2);
};

const RANK_BASE = {
  Normal: { hp: 210, atk: 30, def: 26, cost: 3 },
  Elite: { hp: 480, atk: 42, def: 34, cost: 5.5 },
  Boss: { hp: 760, atk: 64, def: 44, cost: 9 },
};
// 每只怪「每回合能打出多少倍攻击」——从它真实的出招表里算出来。
// 算力按这个定价：纯上 debuff 的辅助怪便宜（当墙用），一套连招的凶怪贵。
// 不这么做的话，抽到一只「技能全是加 buff」的首领就能用 3 算力的价钱买到 5 倍血量。
const REF_RATE = { Normal: 0.75, Elite: 0.66, Boss: 0.62 };
/* 算出来的是「每回合总输出 = 自身攻击的几倍」，所以群体技按**四个目标**算（玩家一共四个人），
   而不是按它在主线里打三只怪的观感。这一点不校正的话，群体怪会被严重低估：
   体检里一只普通群体怪能在第 1 关三回合团灭玩家，因为它的价签只有 4.7 算力。
   毒 / 流血同理——它们按「施毒者攻击 × 层数」结算，四个人各自独立中毒，也是一份群体。 */
const AOE_W = 4;
const dmgRateOf = (rec, msk, rank) => {
  const pat = patternOf(rec, msk, rank);
  const value = (sk) => (sk.effects || []).reduce((a, e) => {
    if (e.t === 'dmg') return a + (Number(e.m) || 1) * (Number(e.hits) || 1) * (e.to === 'foes' ? AOE_W : 1);
    if (e.t === 'dot') return a + 1.6 * AOE_W / 2.4;                      // 上毒 / 上流血：≈ 四个目标各吃几层
    if (e.t !== 'status') return a;
    // 中毒 / 流血：四个人各自独立掉，按「多打三个人」折算
    if (e.s === 'poison' || e.s === 'bleed') return a + 1.2;
    // 反击：挨一下弹「攻击 × 0.20 × 层数」回去（battle.js 的 COUNTER_PER）。玩家一回合打四次，
    // 等于每回合白送 0.8×层数 倍攻击。这一项漏算的话，反击怪会被定价成废物，
    // 实际却能一两回合弹死全队（体检里的头号漏网之鱼）。
    if (e.s === 'counter') return a + 0.2 * (Number(e.n) || 1) * AOE_W;
    // 铁壁：按挨到的伤害百分比反伤，对「高输出阵容」是成比例的惩罚
    if (e.s === 'reflect') return a + 1.2;
    return a;
  }, 0);
  const c = pat.cycle.length ? pat.cycle.reduce((s, sk) => s + value(sk), 0) / pat.cycle.length : 1;
  return Math.max(0.05, Math.min(6, c));
};
// 玩家侧补偿：simulate 里全局伤害系数只作用在 a 侧（守关怪在这边），玩家阵容在 e 侧。
// 不补的话守关怪白拿那份系数（实测差 4 倍胜负），补上才是同一把尺子。
// 直接引用 battle.js 的 DMG_SCALE，别再写死——0.17.2 把它从 1.6 抬到 1.72 时这里漏改过，
// 玩家侧等于被暗中削了 7%，后半程的通过率会莫名其妙掉一截。
const PLAYER_DMG_FIX = DMG_SCALE;

// 守关方的数值口径。和主线不同：主线怪靠 stage 曲线指数堆血，这里靠「算力」定价——
// 1 点算力大概值多少有效生命 / 攻击，直接决定「多带一只」和「练高一档」哪个更划算。
// hp 定得很高、atk 只有血量零头：守关方本来就该是「墙」，赢法是磨死玩家而不是秒掉玩家。
// hp 定得很高、atk 只有血量零头：守关方本来就该是「墙」，赢法是磨死玩家而不是秒掉玩家。
const DEN_K = { hp: 34, atk: 34, def: 1.2 };

export function denStage(n) {
  const num = clamp(Math.round(n), 1, DEN_MAX);
  const ci = Math.floor((num - 1) / 10);
  const ch = DEN_CHAPTERS[ci];
  const within = (num - 1) % 10;                          // 0..9
  const boss = within === 9;                              // 章末：精英玩家
  const mid = within === 4;                               // 章中：多一条战术
  const rules = [];
  // 规则分布：第 2 / 4 / 6 / 8 关各加一条章主题，章末叠满（第 6 章之后才是双规则）。
  // 均匀铺开是为了让同一章里别出现「前四关白给、第五关突然打不过」的断层。
  // 第 1 章（雾港巡礼）整章没有规则——那是让人先看懂「算力怎么花」的一章。
  // 第二程（第 11 章起）从章中就开始叠第二条规则：玩家练度到顶了，只能靠战术加码抬难度。
  const late = ci >= 10;
  if (ch.rules.length && (within === 1 || within === 3 || within === 5 || within === 7)) rules.push(ch.rules[0]);
  if (late && ch.rules.length > 1 && (within === 5 || within === 7)) rules.push(ch.rules[1]);
  // 第三程的章节（21 / 22 章）有四条战术：章中的第 7 关就先把第三条叠上，章末四条全开
  if (ci >= 20 && ch.rules.length > 2 && within === 7) rules.push(ch.rules[2]);
  if (boss) for (const r of ch.rules) if (!rules.includes(r)) rules.push(r);
  return {
    n: num, chapter: ci + 1, chapterZh: ch.zh, within: within + 1, boss, mid,
    lv: playerLv(num), star: playerStar(num),
    cpu: cpuBudget(num),
    rules, comp: ch.comp, note: ch.note,
    tags: denTags(num, rules, ch.comp),
    name: `${ch.zh} · ${within + 1}`,
  };
}

/** 关卡标签：给玩家一句「这关的玩家在干什么」，也用来在列表里一眼分辨打法 */
function denTags(n, rules, comp) {
  const out = [];
  const ruleZh = { thorns: '反震', antiheal: '压疗', armor: '重甲', crit: '暴击', heal: '续航' };
  for (const r of rules) out.push(ruleZh[r] || r);
  const nAs = comp.filter((x) => x === 'ASSAULT').length;
  const nCh = comp.filter((x) => x === 'CHORUS').length;
  if (nAs >= 3) out.push('集火');
  else if (nCh >= 2) out.push('洗地');
  else if (comp.filter((x) => x === 'WARDEN').length >= 2) out.push('双坦');
  if (n === DEN_MAX) out.push('终局');
  return out;
}

/** 一关的玩家阵容：按章节定位表从唤醒体池里挑人，固定种子（同一关永远同一套人） */
export function denPlayerSlugs(n, data) {
  const st = denStage(n);
  const rng = mulberry32(hash(`den:players:${st.n}`));
  const pool = data.awakeners.filter((a) => a.type);
  const used = new Set();
  const pickOne = (type) => {
    const cand = pool.filter((a) => a.type === type && !used.has(a.slug));
    if (!cand.length) return null;
    const a = cand[Math.floor(rng() * cand.length)];
    used.add(a.slug);
    return a.slug;
  };
  const out = [];
  for (const t of st.comp) { const s = pickOne(t); if (s) out.push(s); }
  // 定位不够就从剩下的人里补齐（池子里某个定位比 4 人还少时兜底）
  for (const a of pool) { if (out.length >= 4) break; if (!used.has(a.slug)) { used.add(a.slug); out.push(a.slug); } }
  return out.slice(0, 4);
}

/** 玩家阵容的 def（e 侧）。等级 / 叠位用影子练度，不带任何账号装备——这是「别人的号」。
 *  数值会归一化到一条固定曲线：抽到谁不影响这一关的总血量与总攻击，只影响「用什么机制打你」。
 *  不归一化的话，碰上四个高战力角色的一关会比同章其它关难一倍，100 关的难度就全乱了。 */
export function denPlayerDefs(n, data) {
  const st = denStage(n);
  const slugs = denPlayerSlugs(n, data);
  const fake = newState(data, 1);
  fake.roster = Object.fromEntries(slugs.map((s) => [s, { lv: st.lv, star: st.star, brk: 6 }]));
  const team = teamDefs(fake, data, slugs, { lv: st.lv, star: st.star, brk: 6 }, true);
  const raw = team.list.map((d, i) => ({
    ...d,
    mid: d.slug,                 // 让「特攻型」守关怪有东西可针对
    idx: i,
    atk: d.atk * PLAYER_DMG_FIX,
    boss: false,                 // 不给玩家越前排的能力：守关方有「守」的优势
  }));
  // 目标曲线：第 1 关 4 200 血 / 1 020 攻，第 100 关 ×6.3（与 50 级 → 159 级 99 叠的实际成长一致）。
  // 第二程（101~200）玩家等级叠位到顶，增长改由装备 / 法则 / 战术支撑：整体再 ×3.1，
  // 与守关方那边的「数值系数 2.3 倍 × 预算 1.4 倍」大致对齐，剩下的差距靠特性与双规则补。
  // 章末的「精英玩家」再抬 6%：这是他比你多练的那一点点，比「多给守关方 3 点算力再收回」讲得通。
  const p = prog(n);
  const grow = Math.pow(6.3, Math.min(p, 1)) * Math.pow(3.1, Math.max(0, p - 1)) * (st.boss ? 1.06 : 1);
  const sumHp = raw.reduce((s, d) => s + d.hp, 0) || 1;
  const sumAtk = raw.reduce((s, d) => s + d.atk, 0) || 1;
  const nCh = st.comp.filter((t) => t === 'CHORUS').length;
  const nW = st.comp.filter((t) => t === 'WARDEN').length;
  const kHp = (4200 * grow) / sumHp;
  const kAtk = (1020 * grow) / sumAtk;
  // 「自动战斗的玩家」：护盾与治疗按 75% 结算。真人玩家会卡时机抬血、会把盾留到关键回合，
  // 挂机阵容不会——不折这一档，双守护双治疗的关卡会因为「永远抬得起来」而无解。
  // 再叠一层「续航归一化」：总血量已经归一过了，但治疗人数没归一——双合唱那一章靠回血硬拖，
  // 会变成全场最硬的一关；三突击那一章没有奶，会被一波推平。按阵容把续航折成同一档，
  // 章节之间的差别才回到「打法不同」而不是「肉度不同」。
  const healShift = nCh >= 2 ? -28 : nCh === 0 ? 5 : -12;

  const defShift = nCh === 0 ? 1.32 : nCh >= 2 ? 0.96 : 1;
  void nW;
  // 攻方的出手顺序也讲道理：辅助 / 治疗先动（把增益和盾铺好），输出后手吃现成的增益再打——
  // 和玩家自己在高级设置里排顺序是同一套学问。不这么做的话，「会排顺序的玩家」和
  // 「按站位呆排的 AI」差着一大截，守关方等于在跟下等 AI 打，赢得没有含金量。
  const roleOrd = { CHORUS: 0, WARDEN: 1, ASSAULT: 2 };
  return raw.map((d) => ({
    ...d,
    ord: roleOrd[d.type] ?? 3,
    hp: Math.round(d.hp * kHp),
    atk: Math.round(d.atk * kAtk),
    healBonus: Math.round((d.healBonus || 0) - 25 + healShift),
    shieldBonus: Math.round((d.shieldBonus || 0) - 25 + healShift * 0.5),
    def: Math.round(d.def * Math.pow(grow, 0.5) * defShift),
    // 玩家战术 · 重甲：防御再 ×1.6（main 里的 armor 是 ×2，对守关方太硬了，这里单独收一档）
    ...(st.rules.includes('armor') ? { def: Math.round(d.def * Math.pow(grow, 0.5) * defShift * 1.25) } : {}),
    // 玩家战术 · 暴击：全队暴击率 +26（挂机玩家不会挑时机，但暴击这种东西不看时机）
    ...(st.rules.includes('crit') ? { critRate: (d.critRate || 0) + 26 } : {}),
    // 玩家战术 · 续航：治疗量 +28%（battle 里治疗读的就是 healBonus）。
    // 别给太高：双合唱的阵容本来就靠回血硬拖，+50 会让那一章直接变成「打不死」。
    ...(st.rules.includes('heal') ? { healBonus: (d.healBonus || 0) + 28 } : {}),
  }));
}

/** 这一关推荐玩家看的提示（结算 / 编队界面用） */
export function denHint(n) {
  const st = denStage(n);
  const bits = [];
  if (st.rules.includes('barrier')) bits.push('玩家带屏障：每 2 回合回 2 层，每层吃掉一次直接伤害 —— 上多段或毒');
  if (st.rules.includes('thorns')) bits.push('玩家带反震：单次超过其最大生命 7% 的伤害会被反弹 35% —— 别堆一击巨伤');
  if (st.rules.includes('antiheal')) bits.push('玩家压疗：你的治疗效果只剩 40%，玩家攻击 +12% —— 别带汲取');
  if (st.rules.includes('armor')) bits.push('玩家重甲：防御 ×2 —— 毒 / 流血同样要过防御，考虑破甲与真伤');
  if (st.rules.includes('seal')) bits.push('玩家封印：每 2 回合封住你能量最高的两人 —— 别全靠大招');
  return bits;
}

/* ------------------------------------------------------------------ 怪物 */
let monListCache = null;
export function denMonsters(data) {
  if (monListCache && monListCache.data === data) return monListCache.list;
  const list = (data.monsters || [])
    .filter((m) => !m.reward && !m.mate && m.rank && RANK_BASE[m.rank])
    .map((m) => {
      const guard = monGuard(m);
      const base = RANK_BASE[m.rank];
      const rate = dmgRateOf(m, data.msk, m.rank);
      // 出招表的输出效率：中位怪 = 1.0。价钱只由 rank + 成长档决定，它不进价签——
      // 而是在 monStats 里把攻击力反过来压一压（rate 高 → 攻击低），同算力下总输出接近。
      const outFactor = Math.max(0.45, Math.min(2.6, rate / REF_RATE[m.rank]));
      return {
        id: m.id, zh: m.zh, img: m.img, rank: m.rank, size: m.size || 'Middle',
        traits: m.traits || [],
        // 近战 / 远程：体型决定。大块头够不着后排，小东西能绕过去。
        reach: m.rank === 'Boss' || m.size === 'Mini' || m.size === 'Middle' ? 'any' : 'front',
        guard,
        rate, outFactor,
        cost: base.cost,
        // 血量系数收窄到 ±15%：个体差异不该压过「算力 × 成长档」这条主线
        hpMul: 0.85 + 0.3 * (clamp(m.hp ?? 1, 0.5, 1.8) - 0.5) / 1.3,
        atkMul: clamp(m.atk ?? 1, 0.75, 1.25),
        defMul: clamp(1 + (Number(m.df) || 0) * 0.35, 0.6, 1.8),
        chapter: Math.min(10, 1 + (hash(`den:unlock:${m.id}`) % 10)),   // 第几章解锁
      };
    })
    .sort((a, b) => ({ Normal: 0, Elite: 1, Boss: 2 }[a.rank] - { Normal: 0, Elite: 1, Boss: 2 }[b.rank]) || a.id.localeCompare(b.id));
  monListCache = { data, list };
  return list;
}

/** 守关特性：按 id 定死（同一只怪在哪一关都是同一条特性，玩家记一次就能用一辈子） */
export function monGuard(m) {
  const arr = GUARD_BY_RANK[m.rank] || GUARD_BY_RANK.Normal;
  return arr[hash(`den:guard:${m.id}`) % arr.length];
}

/** 某一关的守关特性：201 关起（第三程）换用「再生 / 棘甲」那一套新池，前 200 关原样不动 */
export function monGuardFor(mon, n) {
  if (!(Number(n) > DEN_BASE * 2)) return mon.guard;
  const arr = GUARD_BY_RANK_LATE[mon.rank] || GUARD_BY_RANK_LATE.Normal;
  return arr[hash(`den:guard2:${mon.id}`) % arr.length];
}

export const monById = (data, id) => denMonsters(data).find((m) => m.id === id) || null;
/** 某只怪在某个成长档下的单价（算力） */
export const monCost = (mon, tierId) => Math.round(mon.cost * tierOf(tierId).cost * 10) / 10;

/** 数值：基础 × 成长档 × 关卡系数。不算技能表（列表页只显示数字，别为 500 只怪编译技能） */
export function monStats(mon, tierId, n) {
  const t = tierOf(tierId);
  const b = RANK_BASE[mon.rank];
  const k = denScale(n);
  // 出招表的输出效率折算：同算力下「一套连招的凶怪」攻击压低、「只会加 buff 的辅助怪」攻击抬高，
  // 让每点算力买到的「每回合期望输出」大致相等，差别只留在机制上（这样才有克制可谈，
  // 而不是「谁抽到群体怪谁赢」）。夹一层上下限，免得极端出招表把攻击压成 0 或抬到离谱。
  const rateK = Math.max(0.1, Math.min(3.4, REF_RATE[mon.rank] / Math.max(0.05, mon.rate)));
  return {
    hp: Math.round(b.hp * mon.hpMul * t.hp * k * DEN_K.hp),
    atk: Math.round(b.atk * mon.atkMul * t.atk * k * DEN_K.atk * rateK),
    def: Math.round(b.def * mon.defMul * t.def * k * DEN_K.def),
    cost: monCost(mon, tierId),
  };
}

const patternCache = new Map();
/** 完整 def（含真实技能表）——只有开打时才生成 */
export function monDef(mon, tierId, n, data) {
  const st = monStats(mon, tierId, n);
  const key = `${mon.id}:${mon.rank}`;
  let base = patternCache.get(key);
  if (!base) {
    const rec = data.monById[mon.id];
    const rng = mulberry32(hash(`den:pat:${mon.id}`));
    base = makeEnemy(rec, mon.rank, 1, rng, { affixes: false, msk: data.msk, main: false });
    patternCache.set(key, base);
  }
  const t = tierOf(tierId);
  return {
    ...base,
    name: `${mon.zh}${t.id === 't1' ? '·幼' : t.id === 't2' ? '·成' : '·巨'}`,
    hp: st.hp, atk: st.atk, def: st.def,
    type: mon.reach === 'front' ? 'WARDEN' : 'ASSAULT',
    guard: monGuardFor(mon, n), guardTier: t.id,
    boss: mon.rank === 'Boss', rank: mon.rank,
    cost: st.cost, monId: mon.id,
    // 让「特攻」有个落点：首领只咬后排（远程），近战优先啃前排——这份偏好由 type / reach 决定
    critRate: 0, critDmg: 50,
  };
}

/* ------------------------------------------------------------------ 进度 */
export function denState(state) {
  const d = (state.den ||= {});
  d.best = clamp(Math.floor(Number(d.best) || 0), 0, DEN_MAX);
  d.stars = { ...(d.stars || {}) };
  d.lineups = { ...(d.lineups || {}) };
  d.starClaim = { ...(d.starClaim || {}) };
  d.runs ||= 0; d.wins ||= 0;
  return d;
}
export const denUnlocked = (state) => Math.min(DEN_MAX, (denState(state).best || 0) + 1);
export const denStarOf = (state, n) => Math.max(0, Math.min(3, Number(denState(state).stars[n]) || 0));
export const denTotalStars = (state) => Object.values(denState(state).stars).reduce((s, x) => s + (Number(x) || 0), 0);

/** 已解锁的怪物：按章放出来（第 1 章 ~54 只，第 10 章全库），顺便让列表页别一次渲染 500 张卡 */
export function denPool(data, n) {
  const ch = denStage(n).chapter;
  const all = denMonsters(data);
  return { list: all.filter((m) => m.chapter <= ch), total: all.length, chapter: ch };
}

/* ------------------------------------------------------------------ 编队 */
/** 编队校验：只认已解锁的怪、档位合法、不超 5 只、不超算力。返回 { ok, picks, used, cpu } 或 { err } */
export function denCheck(n, picks, data) {
  const st = denStage(n);
  const arr = [];
  let used = 0;
  const seen = new Set();
  for (const p of picks || []) {
    if (!p || !p.id) continue;
    const mon = monById(data, p.id);
    if (!mon) return { err: '图鉴里没有这只怪' };
    if (!DEN_TIERS.some((t) => t.id === p.tier)) return { err: '成长档不对' };
    // 同一种只能上一只：不然「把最强的那只堆三份」就是所有关的答案
    if (seen.has(mon.id)) return { err: '同一种怪只能上一只' };
    if (arr.length >= DEN_SLOTS) return { err: `守关队最多 ${DEN_SLOTS} 只` };
    seen.add(mon.id);
    used += monCost(mon, p.tier);
    arr.push({ id: mon.id, tier: p.tier });
  }
  used = Math.round(used * 10) / 10;
  if (!arr.length) return { err: '还没选怪' };
  if (used > st.cpu + 1e-6) return { err: `算力超了（${used} / ${st.cpu}）` };
  return { ok: true, picks: arr, used, cpu: st.cpu };
}

/* ------------------------------------------------------------------ 开打 */
export function denFight(state, data, n, picks) {
  const st = denStage(n);
  const chk = denCheck(n, picks, data);
  if (!chk.ok) return { err: chk.err };
  let mons = chk.picks.map((p) => monDef(monById(data, p.id), p.tier, n, data));
  let players = denPlayerDefs(n, data);
  // 孤军不成立：守关队只有一两只时，玩家不用分兵，直接收拢阵型——防御大增、还腾出手集火。
  // 这不是数值手感问题，是数学问题：一只怪要「在 20 回合内杀光四个人」，输出就得是满编队的四倍，
  // 而它同时还不用挨四个人的集中火力。只给个 +30% 增伤拦不住（实测 537 只怪里有 26 只能单刷第 1 关），
  // 所以这里按「人少就挨得少」直接压受伤。3 只以上不罚：那时候守关方本来就该承受群攻。
  const pinch = mons.length === 1 ? { def: 6, amp: 30, heal: 40, hp: 0.72 } : mons.length === 2 ? { def: 2.2, amp: 0, heal: 0, hp: 0.88 } : null;
  if (pinch) {
    // 另一头也要罚：一只怪挡一整条路，四个人的火力全落在它身上，血量打折是「被拆」的意思
    if (pinch.hp < 1) mons = mons.map((d) => ({ ...d, hp: Math.round(d.hp * pinch.hp), maxHp: Math.round(d.hp * pinch.hp) }));
    players = players.map((d) => ({
      ...d,
      def: Math.round(d.def * pinch.def),
      amp: (d.amp || 0) + pinch.amp,
      healBonus: (d.healBonus || 0) + pinch.heal,
    }));
  }
  const seed = (state.seed = (Math.imul(state.seed ^ (st.n * 2654435761), 1664525) + 1013904223) >>> 0);
  // 只有真能作用于怪物的规则才交给引擎：armor / crit 在玩家 def 上单独实现（见 denPlayerDefs），
  // seal 对没有 kit 的怪物完全无效，所以一律不传。
  const simRules = st.rules.filter((r) => r === 'thorns' || r === 'antiheal');
  // hitCaps: false —— 不套主线的「反击 / 毒单次封顶」。那个封顶是为主线高层设的
  // （怪的攻击复利长、玩家血量线性长）；守关这边的怪是算力定价的，玩家血量也做过归一化，
  // 毒与反击本来就是守关方的主要输出。实测套上封顶后整座塔从 116/200 掉到 48/200。
  const res = simulate({
    allies: mons, enemies: players, seed,
    strategy: state.strategy, maxRounds: DEN_ROUNDS, rules: simRules, hitCaps: false,
  });
  const myHp = res.allies.reduce((s, a) => s + a.hp, 0);
  const myMax = res.allies.reduce((s, a) => s + a.maxHp, 0);
  const plHp = res.enemies.reduce((s, a) => s + a.hp, 0);
  const plMax = res.enemies.reduce((s, a) => s + a.maxHp, 0);
  const left = myMax ? myHp / myMax : 0;
  // 守关成功 = 玩家全灭（超时不算：玩家还站着，只是没打完，那是「没守住」）
  const win = !!res.win;
  // 星级：守住 = 1 星；剩五成半血 = 2 星；剩七成半血且 12 回合内解决 = 3 星。
  // 门槛刻意压得比「惨胜」高一点：1 星是「勉强守住」，2 星是「有余裕」，3 星要「早早收工」。
  const stars = !win ? 0 : (left >= 0.75 && res.rounds <= 12 ? 3 : left >= 0.55 ? 2 : 1);
  return {
    ok: true, res, stage: st, mons, players, cpu: chk.used,
    hpLeft: left, playerLeft: plMax ? plHp / plMax : 0, win, stars,
  };
}

/** 结算：写进度 / 首通奖励 / 星级奖励。重复打只给少量金币。 */
export function denApply(state, n, out) {
  const d = denState(state);
  d.runs++;
  const rw = { gold: 0, cores: 0, tickets: 0, first: false, starsUp: 0 };
  const prevBest = d.best;
  const prevStars = denStarOf(state, n);
  if (out.win) {
    d.wins++;
    const st = denStage(n);
    // 奖励档位跟着「第几百关」走：第 100 关 ×2、第 200 关 ×3，第二程的产出是实打实的翻倍
    const tier = 1 + (n - 1) / (DEN_BASE - 1);                // 1 → 3
    if (!prevStars) {
      rw.first = true;
      rw.gold = Math.round(900 * tier * 1.6);
      rw.cores = Math.round(18 * tier * 1.5);
      rw.tickets = n % 10 === 0 ? 2 : 1;
      // 每 10 关的第一关（章首）不再重复给券，章末给得更多
      if (n % 10 === 0) { rw.tickets = 3; rw.cores += 40; }
    } else {
      rw.gold = Math.round(220 * tier);
    }
    if (out.stars > prevStars) {
      d.stars[n] = out.stars;
      rw.starsUp = out.stars - prevStars;
      rw.gold += 160 * rw.starsUp * tier;
      rw.cores += 6 * rw.starsUp;
    }
    if (n > d.best) d.best = n;
  } else {
    rw.gold = Math.round(80 * (1 + (n - 1) / (DEN_BASE - 1)));
  }
  state.gold += rw.gold; state.cores += rw.cores; state.tickets += rw.tickets;
  state.stats.gold += rw.gold;
  d.played = n;
  return { ...rw, best: d.best, prevBest };
}

/** 每章全通（10 关都拿过星）的额外奖励：只在第一次达成时给 */
export function denChapterReward(state, ch) {
  const d = denState(state);
  d.claim ||= {};
  if (d.claim[ch]) return null;
  for (let i = (ch - 1) * 10 + 1; i <= ch * 10; i++) if (!denStarOf(state, i)) return null;
  d.claim[ch] = true;
  const rw = { gold: 4000 + ch * 1200, cores: 60 + ch * 20, tickets: 2 + Math.floor(ch / 3) };
  state.gold += rw.gold; state.cores += rw.cores; state.tickets += rw.tickets;
  state.stats.gold += rw.gold;
  return rw;
}

/* ------------------------------------------------------------------ 星级里程碑奖励 */
/* 每章 30 颗星里立三档：12 / 21 / 30。刷星（提档重打拿 2~3 星）从此有真奖励，
   也给「这关我只求守住」和「这关我要满星」两种玩法分了层级。 */
export const DEN_STAR_TIERS = [
  { need: 12, zh: '12 星', d: '本章拿到 12 颗星', rw: (ch) => ({ gold: 2200 + ch * 900, cores: 40 + ch * 12 }) },
  { need: 21, zh: '21 星', d: '本章拿到 21 颗星', rw: (ch) => ({ gold: 4200 + ch * 1300, cores: 90 + ch * 20, tickets: 2 }) },
  { need: 30, zh: '满星', d: '本章 10 关全部 3 星', rw: (ch) => ({ gold: 7000 + ch * 1700, cores: 160 + ch * 32, tickets: 2 + Math.floor(ch / 3) }) },
];
export const denStarKey = (ch, ti) => `${ch}:${ti}`;

/** 某章的星级里程碑视图：每档 [是否达标, 是否已领] */
export function denStarClaims(state, ch) {
  const d = denState(state);
  d.starClaim ||= {};
  const got = Array.from({ length: 10 }, (_, k) => denStarOf(state, (ch - 1) * 10 + k + 1)).reduce((a, b) => a + b, 0);
  return {
    got,
    tiers: DEN_STAR_TIERS.map((t, ti) => ({
      ...t, ti, got,
      done: got >= t.need,
      claimed: !!d.starClaim[denStarKey(ch, ti)],
      rw: t.rw(ch),
    })),
  };
}

/** 领取星级里程碑：奖励直接进账，返回奖励或 null（没达标 / 已领过） */
export function denClaimStars(state, ch, ti) {
  const t = DEN_STAR_TIERS[ti];
  if (!t) return null;
  const d = denState(state);
  d.starClaim ||= {};
  const key = denStarKey(ch, ti);
  if (d.starClaim[key]) return null;
  const got = Array.from({ length: 10 }, (_, k) => denStarOf(state, (ch - 1) * 10 + k + 1)).reduce((a, b) => a + b, 0);
  if (got < t.need) return null;
  d.starClaim[key] = true;
  const rw = { ...t.rw(ch) };
  state.gold += rw.gold; state.cores += rw.cores; state.tickets += rw.tickets || 0;
  state.stats.gold += rw.gold;
  return rw;
}
