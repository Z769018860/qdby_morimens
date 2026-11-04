// 黑流树海：挑战页里的第二个肉鸽。模板沿用大运的「3 层 × 10 场战斗」，玩法换成明日方舟
// 集成战略（萨米肉鸽 / 黑流树海）的路子：
//
//   · 地图每一步给**两条岔路**二选一（战斗 / 紧急 / 奇遇 / 黑市 / 休整 / 试炼），走到头是首领；
//   · 开局花「黑露」从自己拥有的角色里**募队**（按稀有度定价，四张史诗买不起——预算就是取舍）；
//   · 出发时全员影子练度锁死在 **50 级、无叠位、无超限、无法则**，账号的装备 / 造物 / 钥令照常带入；
//   · 局内靠「古树的馈赠」按 高枝(159 级) → 超限 → 终焉法则 三档逐步把练度点回来；
//   · 结算与商店产出 唤醒券 / 直升券（把一位角色直接练到超限满）/ 唤醒券（唤醒一位未拥有的血肉界域角色）。
//
// 这一层只放纯逻辑：所有函数吃 (state, data, run) 纯数据、不碰 DOM——能在 Node 里跑完整一局做平衡体检。
import { hash, mulberry32 } from './rng.js';
import { simulate, roundLimitFor } from './battle.js';
import { buildEnemies, domainRules, lateDotBoost } from './enemies.js';
import { teamDefs } from './game.js';
import { LUCK_BUFFS, charUp } from './luckrun.js';

export const TREE_ACTS = 3;
export const TREE_STEPS = 10;            // 每层 10 步：9 步岔路 + 1 步首领
export const TREE_BUDGET = 100;          // 开局黑露：按稀有度买人
export const TREE_PRICE = { Genesis: 26, SSR: 26, SR: 18, R: 12, N: 8 };
export const TEAM_MAX = 4;

/** 五档难度：off 是敌人曲线整体挪动的主线关卡数，scale 在挪档之上再乘，mult 是分数与结算倍率。
 *  起步队伍固定 50 级无强化（≈主线 30 关的练度），所以曲线整体比大运低一截；高难度靠域规（stage ≥ 91）抬压力。 */
export const TREE_DIFFS = [
  { id: 'dim', zh: '微光', lv: 50, scale: 0.6, off: -6, mult: 1.0, note: '黑露只够照亮脚下的路。什么强化都不点，也应该能走出去' },
  { id: 'whisper', zh: '低语', lv: 50, scale: 0.8, off: 0, mult: 1.5, note: '树海开始跟你说话。标准难度，推荐从这里开始' },
  { id: 'shade', zh: '树影', lv: 50, scale: 1.05, off: 6, mult: 2.2, note: '影子比树干更密。敌人的血和拳头都厚一档' },
  { id: 'root', zh: '深根', lv: 50, scale: 1.3, off: 14, mult: 3.2, note: '根须缠到脚踝——首通送唤醒券，商店开始卖无名之物' },
  { id: 'heart', zh: '黑流之心', lv: 50, scale: 1.15, off: 18, mult: 4.6, note: '树海的心脏：越深域规越多，不点亮终焉法则几乎走不完。首通送直升券' },
];
export const treeDiffOf = (id) => TREE_DIFFS.find((d) => d.id === id) || TREE_DIFFS[1];

/** 敌人曲线：1 层 6~24、2 层 30~48、3 层 54~72，再按难度挪档。
 *  90 关之后主线才有的域规（屏障 / 反震 / 压疗 / 重甲 / 封印）跟着 stage 自然出现。 */
export const treeStage = (act, node, off = 0) => Math.max(1, Math.round(6 + act * 24 + node * 2.0) + (off || 0));

/** 影子练度：enh 0..3 → 全队统一的 lv / star / od / law。
 *  四个键都显式给出（0 就置 0），账号里原本的练度完全不掺进来——「50 级无强化」就是真的无强化。 */
export const enhOvr = (enh) => ({
  lv: enh >= 1 ? 159 : 50,
  star: enh >= 1 ? 99 : 0,
  od: enh >= 2 ? 99 : 0,
  law: enh >= 3 ? 10 : 0,
});
export const ENH_STEPS = [
  null,
  { zh: '高枝', desc: '全队升到 159 级（叠位视作满 99），属性按满叠位的等级曲线重算' },
  { zh: '超限', desc: '全队解锁超限 99：生命 / 攻击 / 防御 ×1.79，增伤 +28.5%，解锁各自的超限技' },
  { zh: '终焉法则', desc: '全队法则 +10：再 ×1.12 身板、增伤 +5%、暴伤 +8%，并解锁各自的终焉技' },
];

// ------------------------------------------------------------------ 树海造物
export const TREE_RELICS = [
  { id: 'n_tree', zh: '世界树之荫', desc: '每层开局全队回复 22% 生命', act: 22 },
  { id: 'n_moon', zh: '黑月印记', desc: '全队增伤 +10%、暴击伤害 +25%', mod: { amp: 10, critDmg: 25 } },
  { id: 'n_moth', zh: '扑火之蛾', desc: '全队首击加成 +35%', mod: { firstBoost: 35 } },
  { id: 'n_bark', zh: '铁桦皮', desc: '全队防御 +25%、濒死存活 +15%', mod: { def: 25, surviveChance: 0.15 } },
  { id: 'n_sap', zh: '黑流树汁', desc: '每打赢一场额外得 9 余晖', glow: 9 },
  { id: 'n_root', zh: '缠根', desc: '每场战斗开局全队获得 18% 最大生命的护盾', mod: { shield: 18 } },
  { id: 'n_veil', zh: '雾纱', desc: '全队治疗加成 +40%', mod: { healBonus: 40 } },
  { id: 'n_fang', zh: '低语之牙', desc: '全队吸血 +12%、攻击 +8%', mod: { steal: 12, atk: 8 } },
];
const relicOf = (id) => TREE_RELICS.find((r) => r.id === id) || null;
const relicSum = (run, key) => (run.relics || []).reduce((n, id) => n + Number(relicOf(id)?.[key]) || 0, 0);

// ------------------------------------------------------------------ 奇遇（黑流树海的事件）
// 收益字段：glow 余晖 / heal 回血%（负掉血）/ maxhp 生命上限 / reroll 重掷 / score 分数 /
// relic 造物 / buff 增益 id / gamble 概率（成→造物 败→失血 12%）/ bud 古树之芽 / tk 唤醒券（进账号）。
export const TREE_EVENTS = [
  {
    id: 'w_whisper', zh: '低语的树洞', text: '树干上有一个黑洞，里面传出来的声音很像你认识的人，但语序全是反的。',
    opts: [
      { k: '凑近听清', desc: '全队获得一条增益，失去 6% 生命', gain: { buff: 'roll', heal: -6 } },
      { k: '塞住耳朵快走', desc: '得 22 余晖', gain: { glow: 22 } },
    ],
  },
  {
    id: 'w_boneflower', zh: '开花的白骨', text: '一具兽骨上开满了白花，花心里凝着发亮的露水。',
    opts: [
      { k: '采下花露', desc: '换一件造物，全队失去 12% 生命', gain: { relic: 1, heal: -12 } },
      { k: '绕开', desc: '得 10 余晖', gain: { glow: 10 } },
    ],
  },
  {
    id: 'w_face', zh: '无面的石像', text: '石像的脸被树根整个盖住，只露出两只空空的眼窝。',
    opts: [
      { k: '向眼窝里投余晖', desc: '花 20 余晖，全队生命上限 +8%', cost: 20, gain: { maxhp: 8 } },
      { k: '抠出眼底的宝石', desc: '得 45 余晖，全队失去 10% 生命', gain: { glow: 45, heal: -10 } },
    ],
  },
  {
    id: 'w_frost', zh: '霜结的溪流', text: '溪水在石面上冻成一层黑冰，冰下有什么东西在缓慢地动。',
    opts: [
      { k: '凿开冰面取髓', desc: '全队失去 8% 生命，得分 +200', gain: { heal: -8, score: 200 } },
      { k: '化一碗冰水喝', desc: '全队回复 22% 生命', gain: { heal: 22 } },
    ],
  },
  {
    id: 'w_ring', zh: '树环祭坛', text: '九块石碑围成一个环，每块都刻着同一句话的前半句。',
    opts: [
      { k: '沿环走满三圈', desc: '全队生命上限 +10%，回复 12% 生命', gain: { maxhp: 10, heal: 12 } },
      { k: '推倒一块石碑', desc: '得 55 余晖，全队失去 14% 生命', gain: { glow: 55, heal: -14 } },
      { k: '把后半句念出来', desc: '得分 +240，失去 6% 生命', gain: { score: 240, heal: -6 } },
    ],
  },
  {
    id: 'w_mist', zh: '迷雾岔路', text: '雾里有两盏灯，一盏是白的，一盏在你看它的瞬间变成了黑的。',
    opts: [
      { k: '跟白灯走', desc: '得 30 余晖，回复 10% 生命', gain: { glow: 30, heal: 10 } },
      { k: '跟黑灯走', desc: '五成得一件造物，五成全队失去 12% 生命', gain: { gamble: 0.5 } },
    ],
  },
  {
    id: 'w_cocoon', zh: '枝头的茧', text: '一只人头大小的茧挂在头顶，表面有规律地起伏着。',
    opts: [
      { k: '剖开它', desc: '得一枚古树之芽，全队失去 10% 生命', gain: { bud: 1, heal: -10 } },
      { k: '等它自己破开', desc: '全队回复 20% 生命，得 15 余晖', gain: { heal: 20, glow: 15 } },
    ],
  },
  {
    id: 'w_shroom', zh: '发光的菌毯', text: '整片林间空地铺着蓝白色的菌毯，踩上去会留下发光的脚印。',
    opts: [
      { k: '踩着菌毯过去', desc: '回复 15% 生命，得 20 余晖', gain: { heal: 15, glow: 20 } },
      { k: '连根采起一大片', desc: '换一件造物，全队失去 8% 生命', gain: { relic: 1, heal: -8 } },
    ],
  },
  {
    id: 'w_hunter', zh: '树影里的猎手', text: '他一动不动地站在两棵树之间，弓已经上弦，但箭头指着地面。',
    opts: [
      { k: '请他指点路径', desc: '全队攻击永久 +9%', gain: { buff: 'b_atk' } },
      { k: '分他一半干粮', desc: '得 25 余晖，重掷次数 +2', gain: { glow: 25, reroll: 2 } },
      { k: '从他的射界外绕行', desc: '全队防御永久 +10%', gain: { buff: 'b_def' } },
    ],
  },
  {
    id: 'w_upside', zh: '倒悬之树', text: '一棵树根朝上、冠朝下地悬在半空，树影里的鸟都倒着飞。',
    opts: [
      { k: '爬上去看树根', desc: '得分 +320，失去 9% 生命', gain: { score: 320, heal: -9 } },
      { k: '在树冠下捡果子', desc: '全队回复 20% 生命，生命上限 +4%', gain: { heal: 20, maxhp: 4 } },
    ],
  },
  {
    id: 'w_birds', zh: '迁徙的候鸟', text: '一大群灰鸟贴着树梢往同一个方向飞，飞过的树全都白了。',
    opts: [
      { k: '跟着鸟群走一程', desc: '重掷次数 +3，得 12 余晖', gain: { reroll: 3, glow: 12 } },
      { k: '捡一根落下的白羽', desc: '全队生命上限 +6%，回复 8% 生命', gain: { maxhp: 6, heal: 8 } },
    ],
  },
  {
    id: 'w_echo', zh: '树海的残响', text: '空气里反复播放着一段没有来源的喊声，喊的像一个名字。',
    opts: [
      { k: '跟着喊回去', desc: '全队生命上限 +8%，失去 8% 生命', gain: { maxhp: 8, heal: -8 } },
      { k: '捂住嘴不出声', desc: '得 18 余晖，得分 +80', gain: { glow: 18, score: 80 } },
    ],
  },
  {
    id: 'w_sap', zh: '黑流泉眼', text: '地面裂开一道缝，黑色的液体从里面往外涌，气味像烧焦的糖。',
    opts: [
      { k: '把瓶子灌满', desc: '得 55 余晖，全队失去 10% 生命', gain: { glow: 55, heal: -10 } },
      { k: '只洗掉手上的灰', desc: '回复 16% 生命', gain: { heal: 16 } },
    ],
  },
  {
    id: 'w_trader', zh: '低语者的交易', text: '披斗篷的人从雾里伸出手，掌心摊着一枚种子：「用点东西换，什么都行。」',
    opts: [
      { k: '用自己的血换', desc: '全队失去 12% 生命，换一件造物', gain: { relic: 1, heal: -12 } },
      { k: '花 30 余晖买下种子', desc: '花 30 余晖，五成得造物，五成失去 10% 生命', cost: 30, gain: { gamble: 0.5 } },
      { k: '摇头走开', desc: '得 10 余晖', gain: { glow: 10 } },
    ],
  },
  // 高难度限定：黑流之心的「无名之物」——账号级的硬通货只从最深的地方长出来
  {
    id: 'w_unnamed', zh: '无名之物', text: '雾最浓的地方浮着一小团不发光的黑，靠近时所有人都听见了同一句话：「带出去。」',
    opts: [
      { k: '把它包好带走', desc: '得一枚古树之芽与 2 张唤醒券，全队失去 15% 生命', gain: { bud: 1, tk: 2, heal: -15 } },
      { k: '拿余晖跟它交换', desc: '得 70 余晖，全队失去 6% 生命', gain: { glow: 70, heal: -6 } },
    ],
  },
];
export const treeEventOf = (run) => {
  const rng = runRng(run, `tev:${run.act}:${run.node}`);
  // 黑流之心专属事件只在高难度出现；其余池子全难度共享
  const pool = TREE_EVENTS.filter((e) => e.id !== 'w_unnamed' || run.diff === 'heart');
  return pool[Math.floor(rng() * pool.length)];
};

// ------------------------------------------------------------------ 统计与状态
export function treeState(state) {
  const t = (state.tree ||= {});
  t.runs ??= 0; t.clears ??= 0; t.best ??= 0;
  t.cleared ||= {}; t.ach ||= {};
  if (t.cur === undefined) t.cur = null;
  return t;
}

// ------------------------------------------------------------------ 开一局
const num = (x, f = 0) => { const v = Number(x); return Number.isFinite(v) ? v : f; };
const runRng = (run, salt) => mulberry32(hash(`${run.seed}:${salt}`));

/** 募队价目：从已拥有的角色里花黑露挑人（同一人只能上一次），总价不能超预算。 */
export const priceOf = (data, slug) => TREE_PRICE[data.bySlug[slug]?.rarity] ?? 18;

/** 校验一队募队名单：全是已拥有的、不重复、不超预算。返回 { ok, spent } 或 { err }。 */
export function checkDraft(data, owned, slugs) {
  const list = [...new Set(slugs || [])];
  if (!list.length) return { err: '还没选人' };
  if (list.length > TEAM_MAX) return { err: `最多 ${TEAM_MAX} 人` };
  let spent = 0;
  for (const s of list) {
    if (!owned[s]) return { err: '只能带已经唤醒的角色' };
    spent += priceOf(data, s);
  }
  if (spent > TREE_BUDGET) return { err: '黑露不够' };
  return { ok: true, team: list, spent };
}

export function startRun(state, data, diffId, slugs) {
  const s = treeState(state);
  const diff = treeDiffOf(diffId);
  const check = checkDraft(data, state.roster, slugs);
  if (!check.ok) return { err: check.err };
  const base = (state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0);
  const hp = {};
  for (const sl of check.team) hp[sl] = 1;
  const run = {
    seed: base, diff: diff.id, act: 0, node: 0, slugs: check.team, hp,
    spent: check.spent,                             // 这趟花掉的黑露（结算界面展示）
    glow: 40, buds: 0, enh: 0,                      // 余晖 / 古树之芽 / 强化档（0..3）
    relics: [], buffs: {}, ups: [],
    maxhpPct: 0, reroll: 1, rr: 0,
    branch: null, kind: null, ev: null, shop: null, gift: null, offer: null,
    score: 0, kills: 0, battles: 0, seen: {},
    started: Date.now(), end: null, log: [],
  };
  nextBranch(run);
  s.cur = run;
  s.runs++;
  return { run };
}

/** 每一步的两条岔路：第 10 步固定首领；前面每步从类型池里抽 2 个（尽量不同）。
 *  保底：一层快走完还没见过商店 / 奇遇的话，把它们的权重拉满——「一条都没遇到」比「遇到坏的」更伤体验。 */
function nextBranch(run) {
  if (run.node >= TREE_STEPS - 1) { run.branch = ['boss']; return; }
  const rng = runRng(run, `br:${run.act}:${run.node}:${run.rr2 || 0}`);
  const pool = [];
  const push = (k, w) => { for (let i = 0; i < w; i++) pool.push(k); };
  const near = run.node >= TREE_STEPS - 3;          // 最后三步：补保底
  push('battle', 5);
  push('elite', run.node >= 2 || run.act > 0 ? 2 : 1);
  push('event', run.seen.event || near ? 3 : 9);
  push('shop', run.seen.shop || near ? 2 : 9);
  push('rest', 2);
  push('trial', 2);
  const a = pool[Math.floor(rng() * pool.length)];
  const rest = pool.filter((k) => k !== a);
  const b = rest[Math.floor(rng() * rest.length)];
  run.branch = [a, b];
  run.kind = null;
}

// ------------------------------------------------------------------ 战斗准备
/** 局内养成总表：增益（可叠）+ 树海造物 + 本队专属强化，结构与大运一致。 */
function modsOf(run, slug = '') {
  const m = { hp: 0, atk: 0, def: 0, critRate: 0, critDmg: 0, amp: 0, healBonus: 0, shieldBonus: 0, steal: 0, surviveChance: 0, firstBoost: 0, aliGain: 0, keyGain: 0, shield: 0 };
  const add = (o) => { if (!o) return; for (const k of Object.keys(m)) if (o[k]) m[k] += o[k]; };
  for (const [id, n] of Object.entries(run.buffs || {})) {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    if (b) add({ [b.key]: b.v * num(n, 1) });
  }
  for (const id of run.relics) add(relicOf(id)?.mod);
  for (const u of run.ups) if (!slug || u.slug === slug) add(u.mod);
  return m;
}

/** 队伍此刻的实际属性：真实练度被 ovr（影子练度）盖掉，再叠局内养成；血量按 run.hp 的比例注入。 */
export function allyDefsOf(state, data, run, slugs = run.slugs) {
  const ovr = enhOvr(run.enh);
  const t = teamDefs(state, data, slugs, ovr);
  return t.list.map((d) => {
    const m = modsOf(run, d.slug);
    const out = { ...d };
    out.hp = Math.max(1, Math.round(d.hp * (1 + (m.hp + num(run.maxhpPct)) / 100)));
    out.atk = Math.max(1, Math.round(d.atk * (1 + m.atk / 100)));
    out.def = Math.max(0, Math.round(d.def * (1 + m.def / 100)));
    out.critRate = (d.critRate || 0) + m.critRate;
    out.critDmg = (d.critDmg || 0) + m.critDmg;
    out.amp = (d.amp || 0) + m.amp;
    out.healBonus = (d.healBonus || 0) + m.healBonus;
    out.shieldBonus = (d.shieldBonus || 0) + m.shieldBonus;
    out.steal = (d.steal || 0) + m.steal;
    out.surviveChance = Math.min(0.9, (d.surviveChance || 0) + m.surviveChance);
    out.firstBoost = (d.firstBoost || 0) + m.firstBoost;
    out.aliGain = (d.aliGain || 0) + m.aliGain;
    out.keyGain = (d.keyGain || 0) + m.keyGain;
    out.shield = Math.round(out.hp * m.shield / 100);
    out.hpNow = Math.max(1, Math.round(out.hp * (run.hp[d.slug] ?? 1)));
    return out;
  });
}

export function battlePrep(state, data, run) {
  const diff = treeDiffOf(run.diff);
  const kind = run.kind || 'battle';
  const alive = run.slugs.filter((x) => (run.hp[x] ?? 1) > 0.001);
  if (!alive.length) return null;
  const info = { boss: kind === 'boss', elite: kind === 'elite', node: kind === 'boss' ? 10 : kind === 'elite' ? 5 : 3 };
  const stage = treeStage(run.act, run.node, diff.off);
  const enemies = buildEnemies(stage, data.monsters, { seed: `tree${run.seed}:${run.act}:${run.node}`, info, msk: data.msk, main: true })
    .map((e) => ({
      ...e,
      hp: Math.max(1, Math.round(e.hp * diff.scale)),
      atk: Math.max(1, Math.round(e.atk * diff.scale)),
      def: Math.round(e.def * diff.scale),
    }));
  return {
    allies: allyDefsOf(state, data, run, alive), enemies, stage, kind,
    seed: hash(`${run.seed}:fight:${run.act}:${run.node}`) >>> 0,
    maxRounds: roundLimitFor(info),
    rules: domainRules(stage), dotBoost: lateDotBoost(stage),
  };
}

// ------------------------------------------------------------------ 结算
function healLiving(run, frac) {
  for (const x of run.slugs) {
    const hp = run.hp[x] ?? 1;
    if (hp <= 0.001) continue;
    run.hp[x] = Math.max(0, Math.min(1, hp + frac));
  }
}

/** 打完一步：写血量、加分、发余晖、往前走。首领战胜利掉 1 枚古树之芽（下一层曲子更紧）。 */
export function applyBattle(state, data, run, res) {
  const diff = treeDiffOf(run.diff);
  const prep = res.__prep;
  if (prep) {
    res.allies.forEach((a, i) => {
      const slug = prep.allies[i]?.slug;
      if (slug) run.hp[slug] = Math.max(0, Math.min(1, a.hp / Math.max(1, a.maxHp)));
    });
  }
  const kind = run.kind || 'battle';
  const base = kind === 'boss' ? 45 : kind === 'elite' ? 24 : 12;
  const hpLeft = run.slugs.reduce((n, x) => n + (run.hp[x] || 0), 0) / Math.max(1, run.slugs.length);
  const roundBonus = res.win ? Math.round(10 * Math.max(0, 1 - res.rounds / Math.max(1, res.roundLimit || 20))) : 0;
  if (res.win) {
    run.score += Math.round((base + Math.round(25 * hpLeft) + roundBonus) * diff.mult);
    run.glow += Math.round(((kind === 'boss' ? 34 : kind === 'elite' ? 20 : 12) + relicSum(run, 'glow')) * (1 + diff.mult * 0.12));
    run.kills += res.kills || 0;
  }
  run.battles++;
  const afterPct = relicSum(run, 'after');
  if (afterPct) healLiving(run, afterPct / 100);
  run.log.push({ k: kind, win: !!res.win, rounds: res.rounds, score: Math.round(run.score) });
  const wiped = run.slugs.every((x) => (run.hp[x] ?? 0) <= 0.001);
  if (!res.win || wiped) { endRun(state, false); return { lost: true }; }
  if (kind === 'boss') {
    run.buds++;
    run.gift = { src: 'boss' };                       // 古树之芽到账，去试炼面板点亮
  }
  return stepForward(state, run);
}

function stepForward(state, run) {
  if (run.node >= TREE_STEPS - 1) {
    if (run.act >= TREE_ACTS - 1) { endRun(state, true); return { cleared: true }; }
    run.act++; run.node = 0; run.seen = {};
    healLiving(run, 0.18 + relicSum(run, 'act') / 100);
    nextBranch(run);
    return { newAct: run.act };
  }
  run.node++;
  nextBranch(run);
  return { next: run.node };
}

/** 选一条岔路：写 run.kind，事件 / 商店 / 休整 / 试炼当场结算面板，战斗等玩家点「开打」。 */
export function pickBranch(state, run, i) {
  const k = (run.branch || [])[i];
  if (!k) return null;
  run.kind = k;
  run.branch = null;
  run.seen[k] = (run.seen[k] || 0) + 1;
  if (k === 'event') run.ev = { id: treeEventOf(run).id };
  if (k === 'shop') run.shop = shopStock(state, run);
  if (k === 'rest') run.rest = true;
  if (k === 'trial') run.gift = { src: 'node' };
  return k;
}

// ------------------------------------------------------------------ 古树的馈赠（试炼）
// 三选一：① 点亮下一档强化 ② 树海造物二选一 ③ 回血 30% + 25 余晖。
// 节点「古树试炼」免费给一次；首领战掉的「古树之芽」在试炼面板花 1 枚再换一次。
export const GLOW_OFFER_HEAL = 0.3;
export const GLOW_OFFER_GLOW = 25;

export function giftOptions(state, data, run) {
  const rng = runRng(run, `gift:${run.act}:${run.node}:${run.battles}:${run.gi || 0}`);
  const pool = TREE_RELICS.filter((r) => !run.relics.includes(r.id));
  const a = pool.length ? pool.splice(Math.floor(rng() * pool.length), 1)[0] : null;
  const b = pool.length ? pool[Math.floor(rng() * pool.length)] : null;
  return {
    enh: run.enh < 3 ? { k: 'enh', zh: `点亮 · ${ENH_STEPS[run.enh + 1].zh}`, desc: ENH_STEPS[run.enh + 1].desc } : null,
    relics: [a, b].filter(Boolean),
    glow: { k: 'glow', zh: '树液的馈赠', desc: `全队回复 ${Math.round(GLOW_OFFER_HEAL * 100)}% 生命，得 ${GLOW_OFFER_GLOW} 余晖` },
  };
}

export function takeGift(state, data, run, kind, arg) {
  if (!run.gift) return null;
  if (run.gift.src === 'boss') { if (run.buds <= 0) return null; run.buds--; run.gi = (run.gi || 0) + 1; }
  const out = { got: [], heal: 0, glow: 0, enh: 0 };
  if (kind === 'enh' && run.enh < 3) {
    run.enh++;
    out.enh = run.enh;
    out.got.push(`${ENH_STEPS[run.enh].zh}（全队练度提升）`);
  } else if (kind === 'relic' && arg) {
    const r = relicOf(arg);
    if (r && !run.relics.includes(arg)) { run.relics.push(arg); out.got.push(r.zh); }
  } else if (kind === 'glow') {
    healLiving(run, GLOW_OFFER_HEAL);
    run.glow += GLOW_OFFER_GLOW;
    out.heal = Math.round(GLOW_OFFER_HEAL * 100); out.glow = GLOW_OFFER_GLOW;
  }
  if (run.gift.src === 'node') { const step = stepForward(state, run); out.step = step; }
  run.gift = null;
  return out;
}

// ------------------------------------------------------------------ 奇遇 / 休整 / 商店
export function applyEvent(state, run, optIdx) {
  const def = TREE_EVENTS.find((e) => e.id === run.ev?.id);
  const opt = def?.opts[optIdx];
  if (!def || !opt) return null;
  if (opt.cost && run.glow < opt.cost) return { err: '余晖不够' };
  if (opt.cost) run.glow -= opt.cost;
  const g = opt.gain || {};
  const out = { zh: def.zh, k: opt.k, glow: 0, heal: 0, score: 0, maxhp: 0, reroll: 0, tk: 0, got: [] };
  if (g.glow) { run.glow += g.glow; out.glow = g.glow; }
  if (g.score) { run.score += g.score; out.score = g.score; }
  if (g.heal) { healLiving(run, g.heal / 100); out.heal = g.heal; }
  if (g.maxhp) { run.maxhpPct = num(run.maxhpPct) + g.maxhp; out.maxhp = g.maxhp; }
  if (g.reroll) { run.reroll += g.reroll; out.reroll = g.reroll; }
  if (g.bud) { run.buds += g.bud; out.bud = g.bud; }
  if (g.tk) { state.tickets = (state.tickets || 0) + g.tk; out.tk = g.tk; }
  if (g.buff) {
    if (g.buff === 'roll') {          // 低语树洞：随机一条增益
      const rng = runRng(run, `tb:${run.act}:${run.node}`);
      const b = LUCK_BUFFS[Math.floor(rng() * LUCK_BUFFS.length)];
      run.buffs[b.id] = (run.buffs[b.id] || 0) + 1;
      out.got.push(b.zh);
    } else {
      const b = LUCK_BUFFS.find((x) => x.id === g.buff);
      if (b) { run.buffs[b.id] = (run.buffs[b.id] || 0) + 1; out.got.push(b.zh); }
    }
  }
  if (g.relic || g.gamble != null) {
    const rng = runRng(run, `tr:${run.act}:${run.node}`);
    const grant = () => {
      const pool = TREE_RELICS.filter((r) => !run.relics.includes(r.id));
      if (!pool.length) return;
      const r = pool[Math.floor(rng() * pool.length)];
      run.relics.push(r.id); out.got.push(r.zh);
    };
    if (g.relic) grant();
    else if (rng() < g.gamble) grant();
    else { for (const x of run.slugs) run.hp[x] = Math.max(0, Math.min(1, (run.hp[x] ?? 1) - 0.12)); out.heal = -12; }
  }
  run.ev = null;
  out.step = stepForward(state, run);
  return out;
}

/** 休整（篝火）：两条路——大回血，或小回血 + 白得一条增益。 */
export const REST_OPTS = [
  { k: '围着火堆睡一觉', desc: '全队回复 45% 生命' },
  { k: '轮流守夜，聊聊天', desc: '全队回复 18% 生命，随机获得一条增益' },
];
export function applyRest(state, run, i) {
  if (!run.rest) return null;
  const out = { heal: 0, got: [] };
  if (i === 0) { healLiving(run, 0.45); out.heal = 45; }
  else {
    healLiving(run, 0.18); out.heal = 18;
    const rng = runRng(run, `rest:${run.act}:${run.node}`);
    const b = LUCK_BUFFS[Math.floor(rng() * LUCK_BUFFS.length)];
    run.buffs[b.id] = (run.buffs[b.id] || 0) + 1;
    out.got.push(b.zh);
  }
  run.rest = false;
  out.step = stepForward(state, run);
  return out;
}

/** 黑市货架：2 造物 + 2 增益 + 热汤 + 概率商品（唤醒券 / 古树之芽；深根以上还有无名之物——直升券 / 唤醒券）。 */
export function shopStock(state, run) {
  const rng = runRng(run, `tshop:${run.act}:${run.node}`);
  const diff = treeDiffOf(run.diff);
  const off = 1 - Math.min(0.4, relicSum(run, 'discount'));
  const pool = TREE_RELICS.filter((r) => !run.relics.includes(r.id));
  const pick2 = (arr, n) => { const a = [...arr]; const o = []; while (o.length < n && a.length) o.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return o; };
  const items = pick2(pool, 2).map((r) => ({ type: 'relic', id: r.id, zh: r.zh, desc: r.desc, price: Math.round((60 + run.act * 20) * off) }));
  for (const b of pick2(LUCK_BUFFS, 2)) items.push({ type: 'buff', id: b.id, zh: b.zh, desc: b.desc, price: Math.round(38 * off) });
  items.push({ type: 'heal', id: 's_heal', zh: '热汤', desc: '全队回复 30% 生命', price: Math.round(42 * off) });
  // 账号级商品：唤醒券随时可能上架；直升券 / 唤醒券只出现在深根与黑流之心
  if (rng() < 0.6) items.push({ type: 'tk', id: 's_tk', zh: '唤醒券 ×2', desc: '唤醒体用的券，直接进账号', price: Math.round(140 * off), tk: 2 });
  if (rng() < 0.5) items.push({ type: 'bud', id: 's_bud', zh: '古树之芽', desc: '在古树试炼点亮练度，或换一次馈赠', price: Math.round(130 * off), bud: 1 });
  const deep = diff.id === 'root' || diff.id === 'heart';
  if (deep && rng() < 0.35) items.push({ type: 'voucher', id: 's_direct', zh: '无名之契', desc: '直升券：把一位角色直接练到超限满（账号资产）', price: Math.round(300 * off), voucher: 'direct' });
  if (deep && rng() < 0.35) items.push({ type: 'voucher', id: 's_awaken', zh: '血肉之茧', desc: '唤醒券：唤醒一位未拥有的血肉界域角色（账号资产）', price: Math.round(300 * off), voucher: 'awaken' });
  return items;
}

export function shopBuy(state, run, idx) {
  const it = (run.shop || [])[idx];
  if (!it || run.glow < it.price) return { err: '余晖不够' };
  const out = { ok: true, zh: it.zh, got: [] };
  run.glow -= it.price;
  if (it.type === 'heal') { healLiving(run, 0.3); out.heal = 30; }
  else if (it.type === 'relic') { if (!run.relics.includes(it.id)) run.relics.push(it.id); }
  else if (it.type === 'buff') run.buffs[it.id] = (run.buffs[it.id] || 0) + 1;
  else if (it.type === 'tk') { state.tickets = (state.tickets || 0) + it.tk; out.tk = it.tk; }
  else if (it.type === 'bud') { run.buds += it.bud; out.bud = it.bud; }
  else if (it.type === 'voucher') {
    (state.vouchers ||= { rewind: 0, direct: 0, awaken: 0 });
    state.vouchers[it.voucher] = (state.vouchers[it.voucher] || 0) + 1;
    out.voucher = it.voucher;
  }
  run.shop = (run.shop || []).filter((_, i) => i !== idx);
  return out;
}

export const leaveNode = (state, run) => {
  run.ev = null; run.shop = null; run.rest = false; run.offer = null;
  return stepForward(state, run);
};

// ------------------------------------------------------------------ 战后三选一
function giveRelic(run, id) {
  if (!relicOf(id) || run.relics.includes(id)) return false;
  run.relics.push(id);
  return true;
}

export function offerPool(state, data, run, n = 3, skip = []) {
  const rng = runRng(run, `toff:${run.act}:${run.node}:${run.battles}:${run.rr || 0}`);
  const fresh = (arr) => { const f = arr.filter((x) => !skip.includes(x.id)); return f.length ? f : arr; };
  const relics = fresh(TREE_RELICS.filter((r) => !run.relics.includes(r.id)));
  const ups = fresh(run.slugs.flatMap((sl) => [0, 1].map((i) => charUp(sl, data, i))).filter((u) => u && !run.ups.some((x) => x.id === u.id)));
  const buffs = fresh(LUCK_BUFFS);
  const out = [];
  if (relics.length) out.push({ type: 'relic', ...relics[Math.floor(rng() * relics.length)] });
  if (ups.length) out.push({ type: 'up', ...ups[Math.floor(rng() * ups.length)] });
  const rest = [...buffs];
  while (out.length < n && rest.length) out.push({ type: 'buff', ...rest.splice(Math.floor(rng() * rest.length), 1)[0] });
  return out.slice(0, n);
}

export function takeOffer(state, data, run, id) {
  const it = (run.offer || []).find((x) => x.id === id);
  if (!it) return null;
  if (it.type === 'buff') run.buffs[id] = num(run.buffs[id], 0) + 1;
  else if (it.type === 'relic') giveRelic(run, id);
  else if (it.type === 'up' && !run.ups.some((u) => u.id === id)) run.ups.push({ id: it.id, slug: it.slug, zh: it.zh, desc: it.desc, mod: it.mod });
  run.offer = null;
  return it;
}

export function rerollOffer(state, data, run) {
  if (run.reroll <= 0) return false;
  run.reroll--;
  run.rr = (run.rr || 0) + 1;
  const prev = (run.offer || []).map((x) => x.id);
  run.offer = offerPool(state, data, run, 3, prev);
  return true;
}

// ------------------------------------------------------------------ 开打（UI 入口）
export function fightNode(state, data, run) {
  if (!run || !['battle', 'elite', 'boss'].includes(run.kind)) return null;
  const prep = battlePrep(state, data, run);
  if (!prep) { endRun(state, false); return null; }
  const res = simulate({ allies: prep.allies, enemies: prep.enemies, seed: prep.seed, strategy: state.strategy, maxRounds: prep.maxRounds, rules: prep.rules, dotBoost: prep.dotBoost });
  res.__prep = prep;
  const step = applyBattle(state, data, run, res);
  return { res, prep, step };
}

// ------------------------------------------------------------------ 结算
export const TREE_ACH = [
  { id: 't_first', zh: '踏足树海', desc: '通过黑流树海的第一层', reward: { gold: 1500, cores: 30, tickets: 2 } },
  { id: 't_clear', zh: '穿林而出', desc: '完整走完三层', reward: { gold: 4000, cores: 80, tickets: 3 } },
  { id: 't_whisper', zh: '听过低语', desc: '在「低语」难度下通关', reward: { gold: 3000, cores: 60, tickets: 3 } },
  { id: 't_shade', zh: '树影不侵', desc: '在「树影」难度下通关', reward: { gold: 6000, cores: 120, tickets: 4 } },
  { id: 't_root', zh: '根须缠身', desc: '在「深根」难度下通关', reward: { gold: 12000, cores: 220, tickets: 6, voucher: 'awaken' } },
  { id: 't_heart', zh: '黑流之心', desc: '在「黑流之心」难度下通关', reward: { gold: 30000, cores: 500, tickets: 12, voucher: 'direct', voucher2: 'awaken' } },
  { id: 't_enh3', zh: '古树全馈', desc: '单局点亮全部三档强化', reward: { gold: 6000, cores: 100, tickets: 8 } },
  { id: 't_no_enh', zh: '本来如此', desc: '不点亮任何强化，在「微光」难度下通关', reward: { gold: 8000, cores: 150, tickets: 5 } },
  { id: 't_relic8', zh: '树海收藏家', desc: '单局拿到 6 件树海造物', reward: { gold: 3000, cores: 60 } },
  { id: 't_score', zh: '黑流回响', desc: '单局得分达到 3000', reward: { gold: 4000, cores: 80, tickets: 3 } },
  { id: 't_rich', zh: '余晖满囊', desc: '单局结束时持有 350 以上余晖', reward: { gold: 2500, cores: 40 } },
  { id: 't_flawless', zh: '雾中无伤', desc: '通关时全队生命都在 70% 以上', reward: { gold: 5000, cores: 90, tickets: 3 } },
];

export function endRun(state, win) {
  const s = treeState(state);
  const run = s.cur;
  if (!run) return null;
  const diff = treeDiffOf(run.diff);
  let score = Math.round(run.score + run.enh * 60 * diff.mult);
  if (win) score += Math.round(100 * diff.mult);
  const rw = { gold: 0, tickets: 0, cores: 0, vouchers: [] };
  if (win) {
    rw.gold += Math.round(2200 * diff.mult);
    rw.cores += Math.round(30 * diff.mult);
    rw.tickets += 1 + Math.floor(diff.mult / 1.5);
    // 首通某难度：真正的硬奖励在这（唤醒券 / 直升券只从这里成对地给）
    const first = !s.cleared[diff.id];
    s.cleared[diff.id] = true;
    if (first) {
      const bonus = { dim: 2, whisper: 3, shade: 4, root: 5, heart: 12 }[diff.id] || 0;
      rw.tickets += bonus;
      if (diff.id === 'root') rw.vouchers.push('awaken');
      if (diff.id === 'heart') { rw.vouchers.push('direct'); rw.vouchers.push('awaken'); }
      rw.first = diff.id;
    }
  } else {
    rw.gold += Math.round(500 * diff.mult);   // 参与奖
  }
  run.end = { win, score, act: run.act, node: run.node, glow: run.glow, enh: run.enh, buds: run.buds, at: Date.now(), rw };
  s.best = Math.max(s.best, score);
  if (win) s.clears++;
  state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores;
  state.stats.gold = (state.stats.gold || 0) + rw.gold;
  for (const v of rw.vouchers) {
    (state.vouchers ||= { rewind: 0, direct: 0, awaken: 0 });
    state.vouchers[v] = (state.vouchers[v] || 0) + 1;
  }
  // 成就判定
  const got = [];
  const mark = (id) => { if (!s.ach[id]) { s.ach[id] = Date.now(); got.push(id); } };
  if (run.act >= 1 || win) mark('t_first');
  if (win) {
    mark('t_clear');
    if (diff.id !== 'dim') mark(`t_${diff.id}`);
    else mark('t_whisper');
    if (run.enh === 0 && diff.id === 'dim') mark('t_no_enh');
    if (run.enh >= 3) mark('t_enh3');
    if (run.slugs.every((x) => (run.hp[x] ?? 0) >= 0.7)) mark('t_flawless');
  }
  if (run.relics.length >= 6) mark('t_relic8');
  if (score >= 3000) mark('t_score');
  if (run.glow >= 350) mark('t_rich');
  s.cur = null;
  run.end.got = got;
  s.lastRun = run.end;
  return run.end;
}

export function claimTreeAch(state, id) {
  const s = treeState(state);
  const a = TREE_ACH.find((x) => x.id === id);
  if (!a || !s.ach[id] || s.ach[id] === true) return null;
  s.ach[id] = true;
  state.gold += a.reward.gold || 0;
  state.cores += a.reward.cores || 0;
  state.tickets += a.reward.tickets || 0;
  const vs = [];
  if (a.reward.voucher) vs.push(a.reward.voucher);
  if (a.reward.voucher2) vs.push(a.reward.voucher2);
  for (const v of vs) {
    (state.vouchers ||= { rewind: 0, direct: 0, awaken: 0 });
    state.vouchers[v] = (state.vouchers[v] || 0) + 1;
  }
  state.stats.gold = (state.stats.gold || 0) + (a.reward.gold || 0);
  return { ...a.reward, vouchers: vs };
}

export const abandonRun = (state) => (treeState(state).cur ? endRun(state, false) : null);
