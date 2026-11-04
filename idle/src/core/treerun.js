// 黑流树海：挑战页里的第二个肉鸽。模板沿用大运的「3 层 × 10 场战斗」，玩法换成
// 明日方舟集成战略（萨米肉鸽 / 黑流树海）的路子：
//
//   · 地图每一步给**两条岔路**二选一（战斗 / 紧急 / 猎场 / 奇遇 / 黑市 / 休整 / 宝箱 / 祭坛 / 泉水 / 试炼），
//     走到头是首领；
//   · 开局花「黑露」从自己拥有的角色里**募队**，募到的人进**仓库**（最多 8 人），
//     每个战斗节点前都能在仓库面板里换 4 人上场、换装备——这是这个模式和主线最大的不同；
//   · **练度与账号无关**：全员影子练度锁死在 50 级、无叠位、无超限、无法则；
//   · **装备也与账号无关**：命轮 / 密契 / 造物 / 钥令一概不带，局内装备（环 / 契 / 令）只能在
//     黑市、宝箱、猎场、首领和奇遇里拿——拿到什么，这一趟就是什么阵容；
//   · 局内靠「古树的馈赠」按 高枝(159 级) → 超限 → 终焉法则 三档逐步把练度点回来；
//   · 局外有**天赋树**与**等级奖励**（pts 累积），通关给天赋点与树海经验；
//   · 结算与商店产出**按界域分的唤醒券**（混沌 / 血肉 / 深海 / 超维）与直升券。
//
// 这一层只放纯逻辑：所有函数吃 (state, data, run) 纯数据、不碰 DOM——能在 Node 里跑完整一局做平衡体检。
import { hash, mulberry32 } from './rng.js';
import { simulate, roundLimitFor } from './battle.js';
import { buildEnemies, domainRules, lateDotBoost } from './enemies.js';
import { teamDefs, addAwaken, addUniversal, emptyAwaken } from './game.js';
import { LUCK_BUFFS, charUp } from './luckrun.js';
import { REALMS } from './constants.js';

export const TREE_ACTS = 3;
export const TREE_STEPS = 10;            // 每层 10 步：9 步岔路 + 1 步首领
export const TREE_BUDGET = 100;          // 开局黑露：按稀有度买人
export const TREE_PRICE = { Genesis: 26, SSR: 26, SR: 18, R: 12, N: 8 };
export const TEAM_MAX = 4;               // 上场人数
export const POOL_MAX = 8;               // 仓库上限（募到的人都能存着，战斗前再挑）

/** 五档难度：off 是敌人曲线整体挪动的主线关卡数，scale 在挪档之上再乘，mult 是分数与结算倍率。
 *  起步队伍固定 50 级、0 装备（≈主线 25 关的练度），局内靠装备 + 造物 + 祝福慢慢补回来；
 *  所以曲线比大运低一截，高难度靠域规（stage ≥ 91）抬压力。
 *  定档口径见 tools/tree-audit.mjs（0 天赋、自动装备的模拟玩家，14 局/档：100/100/79/43/21%）。 */
export const TREE_DIFFS = [
  { id: 'dim', zh: '微光', lv: 50, scale: 0.65, off: -6, mult: 1.0, note: '黑露只够照亮脚下的路。什么强化都不点，也应该能走出去' },
  { id: 'whisper', zh: '低语', lv: 50, scale: 1.05, off: 4, mult: 1.5, note: '树海开始跟你说话。标准难度，推荐从这里开始' },
  { id: 'shade', zh: '树影', lv: 50, scale: 1.4, off: 14, mult: 2.2, note: '影子比树干更密。敌人的血和拳头都厚一档，装备不齐会打不动' },
  { id: 'root', zh: '深根', lv: 50, scale: 1.45, off: 17, mult: 3.2, note: '根须缠到脚踝——首通送唤醒券，商店开始卖无名之物' },
  { id: 'heart', zh: '黑流之心', lv: 50, scale: 1.5, off: 20, mult: 4.6, note: '树海的心脏：越深域规越多，不点亮终焉法则几乎走不完。首通送直升券' },
];
export const treeDiffOf = (id) => TREE_DIFFS.find((d) => d.id === id) || TREE_DIFFS[1];

// ------------------------------------------------------------------ 开局分队
// 明日方舟肉鸽的「分队」：开局挑一个，整趟的规矩就不一样。
// 这里的分队不是数值小礼包，而是**改变这一趟怎么打**——多一个人上场、多一条岔路、团灭能站起来一次。
// 和天赋树叠加：分队定基调，天赋管长期。mod 的键和天赋那套对齐（budget/recruit/start/…），
// 额外几个是分队专属：teamMax 上场人数 / poolMax 仓库上限 / gear 开局装备 / huntDrop 猎场多掉 /
// bless 开局祝福 / shrineHalf 祭坛代价减半 / glow 每胜余晖 / score 结算分数%。
export const TREE_SQUADS = [
  {
    id: 's_front', zh: '前锋分队', tag: '人多',
    desc: '可上场 5 人（比常规多一位），但全队生命 -12%',
    note: '四个人的位置塞五个人：赢得更快，也更容易一起倒。',
    mod: { teamMax: 1, hp: -12 },
  },
  {
    id: 's_logi', zh: '后勤分队', tag: '起手厚',
    desc: '开局黑露 +30、招募价 -20%、初始余晖 +12；背着补给，全队生命 -3%',
    note: '背着补给箱进树海：人能挑得更讲究，走路却慢半拍。',
    mod: { budget: 30, recruit: 20, start: 12, hp: -3 },
  },
  {
    id: 's_hunt', zh: '猎手分队', tag: '装备',
    desc: '开局白得 2 件局内装备；猎场战利品翻倍（每次掉 2 件）',
    note: '走之前就把刀磨好了。装备来得快，是这趟唯一的底气。',
    mod: { gear: 2, huntDrop: 1 },
  },
  {
    id: 's_rite', zh: '祭祀分队', tag: '祝福',
    desc: '开局带 1 条祭坛祝福；祭坛代价减半（扣 5% 生命）',
    note: '出门前先祭过一次。树海认这个，收的价也便宜。',
    mod: { bless: 1, shrineHalf: 1 },
  },
  {
    id: 's_scav', zh: '拾荒分队', tag: '余晖',
    desc: '每打赢一场额外 +10 余晖；结算得分 +12%',
    note: '什么都捡，什么都卖。走得慢，但从不缺钱。',
    mod: { glow: 10, score: 12 },
  },
  {
    id: 's_free', zh: '漂泊分队', tag: '仓库',
    desc: '仓库 +2 人（10 人）、开局重掷 +1、招募价 -10%、白得 1 件装备；人杂，全队生命 -3%',
    note: '不挑人，谁来都带。人多好换，就是队伍杂一点。',
    mod: { poolMax: 2, reroll: 1, recruit: 10, gear: 1, hp: -3 },
  },
];
export const squadOf = (id) => TREE_SQUADS.find((x) => x.id === id) || null;
export const SQUAD_MOD_KEYS = ['teamMax', 'poolMax', 'gear', 'huntDrop', 'bless', 'shrineHalf', 'glow', 'score', 'budget', 'recruit', 'start', 'hp', 'reroll'];
/** 分队加成表（没有分队就是全 0，老存档 / 旧调用照常跑） */
export function squadMods(id) {
  const m = Object.fromEntries(SQUAD_MOD_KEYS.map((k) => [k, 0]));
  const q = squadOf(id);
  if (q?.mod) for (const k of SQUAD_MOD_KEYS) m[k] = Number(q.mod[k]) || 0;
  return m;
}

/** 场上人数上限 / 仓库上限 / 装备槽上限：分队与天赋都能改，所以一律走函数，别直接读常量 */
export const teamMax = (run) => TEAM_MAX + num(run?.teamMax);
export const poolCap = (run) => POOL_MAX + num(run?.poolMax);
export const gearLimit = (run, kind) => (GEAR_LIMIT[kind] || 1) + (kind === 'ring' ? 0 : num(run?.pack));

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

// ------------------------------------------------------------------ 局内装备（环 / 契 / 令）
// 这个模式不带账号装备，所以「装备」得自己长出来。三类：
//   ring（环）  个人，每人 1 个 —— 攻击 / 生命 / 防御 / 暴击 / 吸血这类取向选择；
//   pact（契）  全队，最多 3 个 —— 团队底盘；
//   order（令） 全队，最多 3 个 —— 效果型（首击 / 吸血 / 不倒 / 回春 / 余晖）。
// 数值刻意比账号装备小：局内一局最多拿七八件，全队摊下来大约等于半套主线装备。
export const TREE_GEAR = [
  // 环（个人）
  { id: 'rg_claw', zh: '裂爪指环', kind: 'ring', rar: 'N', price: 34, mod: { atk: 10 }, desc: '攻击 +10%' },
  { id: 'rg_fang', zh: '兽牙环', kind: 'ring', rar: 'R', price: 62, mod: { atk: 16 }, desc: '攻击 +16%' },
  { id: 'rg_crown', zh: '荆棘冠', kind: 'ring', rar: 'SR', price: 96, mod: { atk: 22, critRate: 5 }, desc: '攻击 +22%、暴击率 +5%' },
  { id: 'rg_bark', zh: '树皮护腕', kind: 'ring', rar: 'N', price: 34, mod: { hp: 14 }, desc: '生命 +14%' },
  { id: 'rg_heart', zh: '木质心脏', kind: 'ring', rar: 'R', price: 62, mod: { hp: 20, def: 8 }, desc: '生命 +20%、防御 +8%' },
  { id: 'rg_bulwark', zh: '铁桦胸甲', kind: 'ring', rar: 'SR', price: 96, mod: { hp: 26, def: 14 }, desc: '生命 +26%、防御 +14%' },
  { id: 'rg_shell', zh: '甲壳护符', kind: 'ring', rar: 'N', price: 34, mod: { def: 16 }, desc: '防御 +16%' },
  { id: 'rg_stone', zh: '石心', kind: 'ring', rar: 'R', price: 62, mod: { def: 24 }, desc: '防御 +24%' },
  { id: 'rg_eye', zh: '夜视之眼', kind: 'ring', rar: 'R', price: 58, mod: { critRate: 10 }, desc: '暴击率 +10%' },
  { id: 'rg_vein', zh: '血纹环', kind: 'ring', rar: 'SR', price: 92, mod: { critRate: 12, critDmg: 18 }, desc: '暴击率 +12%、暴击伤害 +18%' },
  { id: 'rg_leech', zh: '汲血环', kind: 'ring', rar: 'R', price: 60, mod: { steal: 10 }, desc: '吸血 +10%' },
  { id: 'rg_ember', zh: '余烬指环', kind: 'ring', rar: 'SR', price: 90, mod: { firstBoost: 28 }, desc: '首击增伤 +28%' },
  // 契（全队，最多 3）
  { id: 'pc_life', zh: '共生藤', kind: 'pact', rar: 'N', price: 60, mod: { hp: 7 }, desc: '全队生命 +7%' },
  { id: 'pc_edge', zh: '磨刀石', kind: 'pact', rar: 'R', price: 90, mod: { atk: 7 }, desc: '全队攻击 +7%' },
  { id: 'pc_hide', zh: '兽皮幕', kind: 'pact', rar: 'R', price: 88, mod: { def: 8 }, desc: '全队防御 +8%' },
  { id: 'pc_eye', zh: '众目', kind: 'pact', rar: 'SR', price: 120, mod: { critRate: 5 }, desc: '全队暴击率 +5%' },
  { id: 'pc_roar', zh: '战吼号角', kind: 'pact', rar: 'SR', price: 130, mod: { amp: 6 }, desc: '全队增伤 +6%' },
  { id: 'pc_song', zh: '和声铃', kind: 'pact', rar: 'SR', price: 118, mod: { healBonus: 20 }, desc: '全队治疗加成 +20%' },
  { id: 'pc_ward', zh: '护盾符文', kind: 'pact', rar: 'SR', price: 120, mod: { shieldBonus: 22 }, desc: '全队护盾加成 +22%' },
  { id: 'pc_fury', zh: '狂怒图腾', kind: 'pact', rar: 'SSR', price: 150, mod: { critDmg: 16, atk: 6 }, desc: '全队暴击伤害 +16%、攻击 +6%' },
  // 令（全队，最多 3）
  { id: 'od_first', zh: '先手之令', kind: 'order', rar: 'R', price: 100, mod: { firstBoost: 26 }, desc: '全队首击增伤 +26%' },
  { id: 'od_blood', zh: '血偿令', kind: 'order', rar: 'R', price: 95, mod: { steal: 8 }, desc: '全队吸血 +8%' },
  { id: 'od_stand', zh: '不倒令', kind: 'order', rar: 'SR', price: 130, mod: { surviveChance: 0.1 }, desc: '全队濒死存活 +10%' },
  { id: 'od_key', zh: '钥焰令', kind: 'order', rar: 'SR', price: 120, mod: { keyGain: 3 }, desc: '全队起手钥焰 +3' },
  { id: 'od_ali', zh: '共鸣令', kind: 'order', rar: 'SR', price: 120, mod: { aliGain: 3 }, desc: '全队起手共鸣 +3' },
  { id: 'od_after', zh: '回春令', kind: 'order', rar: 'SSR', price: 150, after: 6, desc: '每场战斗后全队回复 6% 生命' },
  { id: 'od_greed', zh: '贪婪令', kind: 'order', rar: 'SR', price: 140, glow: 8, desc: '每打赢一场额外得 8 余晖' },
  { id: 'od_wall', zh: '铁壁令', kind: 'order', rar: 'SSR', price: 150, mod: { shield: 10 }, desc: '每场战斗开局全队获得 10% 最大生命的护盾' },
];
export const GEAR_LIMIT = { ring: 1, pact: 3, order: 3 };
export const GEAR_KIND_ZH = { ring: '环', pact: '契', order: '令' };
export const gearDefOf = (id) => TREE_GEAR.find((g) => g.id === id) || null;

// ------------------------------------------------------------------ 树海造物（不可装备，拿了就生效）
export const TREE_RELICS = [
  { id: 'n_tree', zh: '世界树之荫', desc: '每层开局全队回复 22% 生命', act: 22 },
  { id: 'n_moon', zh: '黑月印记', desc: '全队增伤 +10%、暴击伤害 +25%', mod: { amp: 10, critDmg: 25 } },
  { id: 'n_moth', zh: '扑火之蛾', desc: '全队首击加成 +35%', mod: { firstBoost: 35 } },
  { id: 'n_bark', zh: '铁桦皮', desc: '全队防御 +25%、濒死存活 +15%', mod: { def: 25, surviveChance: 0.15 } },
  { id: 'n_sap', zh: '黑流树汁', desc: '每打赢一场额外得 9 余晖', glow: 9 },
  { id: 'n_root', zh: '缠根', desc: '每场战斗开局全队获得 18% 最大生命的护盾', mod: { shield: 18 } },
  { id: 'n_veil', zh: '雾纱', desc: '全队治疗加成 +40%', mod: { healBonus: 40 } },
  { id: 'n_fang', zh: '低语之牙', desc: '全队吸血 +12%、攻击 +8%', mod: { steal: 12, atk: 8 } },
  { id: 'n_seed', zh: '未名之种', desc: '全队生命 +12%，每层开局多回复 10% 生命', mod: { hp: 12 }, act: 10 },
  { id: 'n_antler', zh: '鹿角枝', desc: '全队攻击 +10%、暴击率 +4%', mod: { atk: 10, critRate: 4 } },
  { id: 'n_bell', zh: '静默之铃', desc: '全队治疗加成 +25%、护盾加成 +20%', mod: { healBonus: 25, shieldBonus: 20 } },
  { id: 'n_pact', zh: '树海旧盟', desc: '商店价格 -18%，结算分数 +6%', discount: 18, score: 6 },
];
const relicOf = (id) => TREE_RELICS.find((r) => r.id === id) || null;
const relicSum = (run, key) => (run.relics || []).reduce((n, id) => n + (Number(relicOf(id)?.[key]) || 0), 0);

// ------------------------------------------------------------------ 奇遇（黑流树海的事件）
// 收益字段：glow 余晖 / heal 回血%（负掉血）/ maxhp 生命上限 / reroll 重掷 / score 分数 /
// relic 造物 / gear 装备 / buff 增益 id / gamble 概率（成→造物 败→失血 12%）/ bud 古树之芽 /
// rec 招募一位旅人进仓库 / tk 唤醒券（"界域" 或 "random"，直接进账号）。
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
  {
    id: 'w_lantern', zh: '提灯的守夜人', text: '他坐在树桩上擦一盏没点亮的灯，脚边摆着七八件沾泥的东西。',
    opts: [
      { k: '坐下来陪他守一会', desc: '得一件局内装备，全队失去 6% 生命', gain: { gear: 1, heal: -6 } },
      { k: '用 40 余晖买他一件旧物', desc: '花 40 余晖，得一件局内装备', cost: 40, gain: { gear: 1 } },
      { k: '问他树海还有多深', desc: '得分 +160，重掷 +1', gain: { score: 160, reroll: 1 } },
    ],
  },
  {
    id: 'w_puppet', zh: '树下的提线木偶', text: '一具和人等高的木偶吊在枝上，线头一直往上，消失在冠层里。',
    opts: [
      { k: '剪断它的线', desc: '全队攻击永久 +12%，失去 10% 生命', gain: { buff: 'b_atk2', heal: -10 } },
      { k: '把线接在自己身上', desc: '全队生命上限 +12%，失去 14% 生命', gain: { maxhp: 12, heal: -14 } },
    ],
  },
  {
    id: 'w_well', zh: '无声的井', text: '井口没有绳，也没有水声。往下喊一句，回声要过很久才上来。',
    opts: [
      { k: '把余晖丢下去听响', desc: '花 35 余晖，七成得一件装备，三成失去 10% 生命', cost: 35, gain: { gearGamble: 0.7 } },
      { k: '打一桶上来', desc: '回复 25% 生命，得 12 余晖', gain: { heal: 25, glow: 12 } },
    ],
  },
  {
    id: 'w_antler', zh: '鹿角祭', text: '一副巨大的鹿角立在地上，角尖挂满了晒干的小骨头。',
    opts: [
      { k: '取一根骨头带走', desc: '全队攻击 +10%、生命 +5%', gain: { buff: 'b_atk', heal: 0 } },
      { k: '把鹿角推倒', desc: '得 70 余晖，全队失去 12% 生命', gain: { glow: 70, heal: -12 } },
    ],
  },
  {
    id: 'w_scribe', zh: '树海的抄写员', text: '一个没有脸的人坐在石桌前，把你的每一步都写进一本很厚的册子。',
    opts: [
      { k: '请他多写两页好话', desc: '花 45 余晖，得分 +400', cost: 45, gain: { score: 400 } },
      { k: '抢走他的一页', desc: '得一件造物，全队失去 12% 生命', gain: { relic: 1, heal: -12 } },
    ],
  },
  {
    id: 'w_door', zh: '树中的门', text: '一棵空心的树里嵌着一扇门，门缝里透出来的光是第三层才有的颜色。',
    opts: [
      { k: '推门进去', desc: '直接前进一格，得 30 余晖', gain: { glow: 30, skip: 1 } },
      { k: '把门钉死', desc: '全队回复 30% 生命，得分 +120', gain: { heal: 30, score: 120 } },
    ],
  },
  {
    id: 'w_traveler', zh: '迷路的旅人', text: '一个人抱着膝盖坐在岔路边，说自己的队伍都走散了。',
    opts: [
      { k: '邀他同行', desc: '一位随机旅人加入仓库（不花黑露）', gain: { rec: 1 } },
      { k: '给他指条明路', desc: '得 35 余晖，得分 +80', gain: { glow: 35, score: 80 } },
    ],
  },
  {
    id: 'w_egg', zh: '树心的卵', text: '树心裂开一道口子，里面裹着一枚半透明的卵，里面有很多个影子在动。',
    opts: [
      { k: '把卵带走', desc: '得 2 张随机界域唤醒券，全队失去 15% 生命', gain: { tk: 2, heal: -15 } },
      { k: '把卵放回原处', desc: '全队生命上限 +10%，回复 10% 生命', gain: { maxhp: 10, heal: 10 } },
    ],
  },
  // 高难度限定：黑流之心的「无名之物」——账号级的硬通货只从最深的地方长出来
  {
    id: 'w_unnamed', zh: '无名之物', text: '雾最浓的地方浮着一小团不发光的黑，靠近时所有人都听见了同一句话：「带出去。」',
    opts: [
      { k: '把它包好带走', desc: '得一枚古树之芽与 2 张随机界域唤醒券，全队失去 15% 生命', gain: { bud: 1, tk: 2, heal: -15 } },
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

// ------------------------------------------------------------------ 祭坛祝福
export const TREE_BLESSINGS = [
  { id: 'bl_atk', zh: '爪之祝', desc: '全队攻击 +12%', mod: { atk: 12 } },
  { id: 'bl_hp', zh: '根之祝', desc: '全队生命 +12%', mod: { hp: 12 } },
  { id: 'bl_def', zh: '皮之祝', desc: '全队防御 +14%', mod: { def: 14 } },
  { id: 'bl_amp', zh: '焰之祝', desc: '全队增伤 +8%', mod: { amp: 8 } },
  { id: 'bl_crit', zh: '眼之祝', desc: '全队暴击率 +6%、暴击伤害 +12%', mod: { critRate: 6, critDmg: 12 } },
  { id: 'bl_heal', zh: '泉之祝', desc: '全队治疗加成 +30%、护盾加成 +15%', mod: { healBonus: 30, shieldBonus: 15 } },
  { id: 'bl_steal', zh: '牙之祝', desc: '全队吸血 +10%、首击增伤 +15%', mod: { steal: 10, firstBoost: 15 } },
  { id: 'bl_glow', zh: '露之祝', desc: '每打赢一场额外得 10 余晖', glow: 10 },
];
const blessingOf = (id) => TREE_BLESSINGS.find((b) => b.id === id) || null;

// ------------------------------------------------------------------ 天赋树（局外成长）
// 三支管数值（开局 / 滚雪球 / 打赢），第四支「枝杈」专管**玩法规则**：
// 多一条岔路、多两个装备槽、多几次重掷、团灭能站起来一次——点了以后，玩起来是另一副样子。
// 每支线性解锁：第 2 项要第 1 项 ≥1，依次往上。cost 按「点第 n 级要几点」给。
// key 直接映射到开局参数或战斗加成，算在 talentMods() 里。
export const TREE_TALENTS = [
  // 生长：怎么开局
  { id: 'g_seed', br: '生长', zh: '深扎根系', desc: '开局黑露 +12 / 级', cost: [1, 2, 3], max: 3, key: 'budget', per: 12 },
  { id: 'g_deal', br: '生长', zh: '熟人引路', desc: '招募价格 -6% / 级', cost: [1, 2, 3], max: 3, key: 'recruit', per: 6, req: 'g_seed' },
  { id: 'g_leaf', br: '生长', zh: '枝繁叶茂', desc: '全队生命 +6% / 级', cost: [1, 2, 3], max: 3, key: 'hp', per: 6, req: 'g_deal' },
  { id: 'g_gift', br: '生长', zh: '古树所赐', desc: '开局白得一件树海造物（1 级）', cost: [3], max: 1, key: 'relic', per: 1, req: 'g_leaf' },
  // 低语：怎么滚雪球
  { id: 'w_pocket', br: '低语', zh: '余晖口袋', desc: '开局余晖 +25 / 级', cost: [1, 2, 3], max: 3, key: 'start', per: 25 },
  { id: 'w_bargain', br: '低语', zh: '讨价还价', desc: '黑市价格 -7% / 级', cost: [1, 2, 3], max: 3, key: 'discount', per: 7, req: 'w_pocket' },
  { id: 'w_rest', br: '低语', zh: '月下小憩', desc: '每场战斗后回复 5% 生命 / 级', cost: [1, 2, 3], max: 3, key: 'after', per: 5, req: 'w_bargain' },
  { id: 'w_fame', br: '低语', zh: '声名在外', desc: '结算得分 +8% / 级（1 级）', cost: [2], max: 1, key: 'score', per: 8, req: 'w_rest' },
  // 根须：怎么打赢
  { id: 'r_claw', br: '根须', zh: '磨利爪牙', desc: '全队攻击 +5% / 级', cost: [1, 2, 3], max: 3, key: 'atk', per: 5 },
  { id: 'r_hide', br: '根须', zh: '厚皮', desc: '全队防御 +6% / 级', cost: [1, 2, 3], max: 3, key: 'def', per: 6, req: 'r_claw' },
  { id: 'r_eye', br: '根须', zh: '猎手直觉', desc: '全队暴击率 +3% / 级', cost: [1, 2], max: 2, key: 'critRate', per: 3, req: 'r_hide' },
  { id: 'r_flow', br: '根须', zh: '黑流灌注', desc: '全队增伤 +4% / 级', cost: [2, 3], max: 2, key: 'amp', per: 4, req: 'r_eye' },
  // 枝杈：改规则（不是改数字）——点了以后玩起来明显不一样
  { id: 'b_paths', br: '枝杈', zh: '岔路生枝', desc: '每一步给三条岔路（二选一 → 三选一）', cost: [3], max: 1, key: 'paths', per: 1 },
  { id: 'b_pack', br: '枝杈', zh: '行囊加层', desc: '契 / 令 的装备槽各 +1 / 级（3 → 5）', cost: [2, 3], max: 2, key: 'pack', per: 1, req: 'b_paths' },
  { id: 'b_reroll', br: '枝杈', zh: '以叶为签', desc: '开局重掷次数 +1 / 级', cost: [1, 2], max: 2, key: 'reroll', per: 1, req: 'b_pack' },
  { id: 'b_mercy', br: '枝杈', zh: '树海留手', desc: '一趟里第一次全队倒下不算结束：以 35% 生命原地站起', cost: [4], max: 1, key: 'mercy', per: 1, req: 'b_reroll' },
];
export const TREE_BRANCHES = ['生长', '低语', '根须', '枝杈'];
export const talentLv = (s, id) => Math.max(0, Number(s.talents?.[id]) || 0);
export const talentById = (id) => TREE_TALENTS.find((t) => t.id === id) || null;
/** 下一级要几点（点满返回 null） */
export function talentCost(s, id) {
  const t = talentById(id);
  if (!t) return null;
  const lv = talentLv(s, id);
  if (lv >= t.max) return null;
  return t.cost[Math.min(lv, t.cost.length - 1)];
}
/** 能不能点：前置够、点数够 */
export function canTalent(s, id) {
  const t = talentById(id);
  if (!t) return { ok: false, err: '没有这个天赋' };
  if (talentLv(s, id) >= t.max) return { ok: false, err: '已点满' };
  if (t.req && talentLv(s, t.req) < 1) return { ok: false, err: `需要先点「${talentById(t.req)?.zh || t.req}」` };
  const c = talentCost(s, id);
  if ((s.tp || 0) < c) return { ok: false, err: '天赋点不够' };
  return { ok: true, cost: c };
}
export function buyTalent(state, id) {
  const s = treeState(state);
  const c = canTalent(s, id);
  if (!c.ok) return c;
  s.tp -= c.cost;
  s.talents[id] = talentLv(s, id) + 1;
  return { ok: true, lv: s.talents[id], cost: c.cost };
}
/** 天赋汇总（开局前算一次）：budget 黑露 / recruit 招募折扣% / start 初始余晖 / discount 商店折扣% /
 *  paths 岔路条数增量 / pack 契令槽位 / reroll 重掷 / mercy 免死次数 … */
export function talentMods(s) {
  const m = { budget: 0, recruit: 0, start: 0, discount: 0, after: 0, score: 0, relic: 0, hp: 0, atk: 0, def: 0, critRate: 0, amp: 0, paths: 0, pack: 0, reroll: 0, mercy: 0 };
  for (const t of TREE_TALENTS) {
    const lv = talentLv(s, t.id);
    if (lv) m[t.key] += t.per * lv;
  }
  return m;
}
export const treeMods = (state) => talentMods(treeState(state));

// ------------------------------------------------------------------ 等级（pts）与奖励
export const TREE_LEVEL_MAX = 25;
export const TREE_LEVELS = Array.from({ length: TREE_LEVEL_MAX }, (_, i) => {
  const lv = i + 1;
  const realms = Object.keys(REALMS);
  return {
    lv,
    need: Math.round(260 * Math.pow(1.26, i)),
    gold: 600 + lv * 320,
    cores: 10 + lv * 8,
    tickets: lv % 4 === 0 ? 2 : 0,
    tp: lv % 2 === 0 ? 1 : 0,
    // 每 10 级给一张随机界域唤醒券，25 级给直升券——等级本身就是长期目标
    awaken: lv % 10 === 0 ? realms[(lv / 10 - 1) % realms.length] : null,
    // 通用唤醒券只在中途与满级给：5 / 15 / 25 级各一张
    univ: lv === 5 || lv === 15 || lv === TREE_LEVEL_MAX ? 1 : 0,
    direct: lv === TREE_LEVEL_MAX ? 1 : 0,
  };
});
export function treeLevelOf(pts) {
  let lv = 1;
  for (const L of TREE_LEVELS) if (pts >= L.need) lv = L.lv;
  return lv;
}
export const treeLevelDef = (lv) => TREE_LEVELS[Math.max(0, Math.min(TREE_LEVELS.length - 1, lv - 1))];
/** 领一级的奖励（要已到级、没领过） */
export function claimTreeLevel(state, lv) {
  const s = treeState(state);
  const L = treeLevelDef(lv);
  if (!L || L.lv !== lv || s.lvClaimed[lv] || treeLevelOf(s.pts) < lv) return null;
  s.lvClaimed[lv] = true;
  state.gold += L.gold; state.cores += L.cores; state.tickets += L.tickets;
  state.stats.gold = (state.stats.gold || 0) + L.gold;
  s.tp += L.tp;
  const vs = [];
  if (L.awaken) { addAwaken(state, L.awaken, 1); vs.push(`awaken:${L.awaken}`); }
  if (L.univ) { addUniversal(state, L.univ); vs.push('awaken:ANY'); }
  if (L.direct) { state.vouchers.direct = (state.vouchers.direct || 0) + 1; vs.push('direct'); }
  return { ...L, vouchers: vs };
}

// ------------------------------------------------------------------ 统计与状态
export function treeState(state) {
  const t = (state.tree ||= {});
  t.runs ??= 0; t.clears ??= 0; t.best ??= 0;
  t.pts ??= 0; t.tp ??= 0;
  t.talents ||= {}; t.lvClaimed ||= {};
  t.cleared ||= {}; t.ach ||= {};
  t.squads ||= {};
  if (t.cur === undefined) t.cur = null;
  return t;
}

// ------------------------------------------------------------------ 开一局
const num = (x, f = 0) => { const v = Number(x); if (Number.isFinite(v)) return v; return f; };
const runRng = (run, salt) => mulberry32(hash(`${run.seed}:${salt}`));

/** 招募价目：从已拥有的角色里花黑露挑人（同一人只能上一次）。天赋「熟人引路」按百分比打折。 */
export const priceOf = (data, slug, discount = 0) => {
  const base = TREE_PRICE[data.bySlug[slug]?.rarity] ?? 18;
  return Math.max(1, Math.round(base * (1 - Math.min(0.5, discount / 100))));
};

/** 开局可用资源：天赋 + 分队叠出来的预算 / 折扣 / 仓库上限 / 上场人数。募队弹窗也读它，别各算一套。 */
export function draftCaps(state, squadId = null) {
  const tm = talentMods(treeState(state));
  const sm = squadMods(squadId);
  return {
    budget: TREE_BUDGET + tm.budget + sm.budget,
    recruit: tm.recruit + sm.recruit,
    poolMax: POOL_MAX + sm.poolMax,
    teamMax: TEAM_MAX + sm.teamMax,
    tm, sm,
  };
}

/** 校验一份招募名单：全是已拥有的、不重复、不超预算、不超过仓库上限。返回 { ok, pool, spent } 或 { err }。
 *  mods 可以传 talentMods 结果（老调用），也可以传 draftCaps 结果（带 poolMax / budget 合成值）。 */
export function checkDraft(data, owned, slugs, mods = null) {
  const list = [...new Set(slugs || [])];
  const budget = TREE_BUDGET + (mods?.budget || 0);
  const disc = mods?.recruit || 0;
  const cap = Number(mods?.poolMax) || POOL_MAX;
  if (!list.length) return { err: '还没选人' };
  if (list.length > cap) return { err: `仓库最多 ${cap} 人` };
  let spent = 0;
  for (const s of list) {
    if (!owned[s]) return { err: '只能带已经唤醒的角色' };
    spent += priceOf(data, s, disc);
  }
  if (spent > budget) return { err: '黑露不够' };
  return { ok: true, pool: list, spent, budget, poolMax: cap };
}

/** 开一趟。squadId 决定这一趟的规矩（上场人数 / 仓库 / 开局装备与祝福 / 猎场掉落…）。 */
export function startRun(state, data, diffId, drafts, squadId = TREE_SQUADS[0].id) {
  const s = treeState(state);
  const diff = treeDiffOf(diffId);
  const squad = squadOf(squadId) || TREE_SQUADS[0];
  const caps = draftCaps(state, squad.id);
  const sm = caps.sm;
  const tm = caps.tm;
  const check = checkDraft(data, state.roster, drafts, { budget: tm.budget + sm.budget, recruit: caps.recruit, poolMax: caps.poolMax });
  if (!check.ok) return { err: check.err };
  const base = (state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0);
  const pool = check.pool.slice(0, caps.poolMax);
  const hp = {};
  for (const sl of pool) hp[sl] = 1;
  const run = {
    seed: base, diff: diff.id, squad: squad.id, act: 0, node: 0,
    pool, slugs: pool.slice(0, caps.teamMax), hp,
    spent: check.spent, budget: check.budget,                 // 这趟花掉的黑露（结算界面展示）
    glow: 40 + tm.start + sm.start, buds: 0, enh: 0,          // 余晖 / 古树之芽 / 强化档（0..3）
    relics: [], buffs: {}, ups: [], bless: [],
    gear: { pool: [], ring: {}, pact: [], order: [], n: 1 },
    maxhpPct: 0, reroll: 1 + tm.reroll + sm.reroll, rr: 0,
    // —— 这一趟的「规矩」：分队与天赋在开局固化进 run，之后所有判断都读这几个字段 ——
    teamMax: sm.teamMax, poolMax: sm.poolMax, hpMod: sm.hp,
    paths: 2 + (tm.paths || 0), pack: tm.pack || 0, mercy: tm.mercy || 0,
    huntDrop: sm.huntDrop || 0, shrineHalf: sm.shrineHalf || 0,
    glowPerWin: sm.glow || 0, scoreMod: sm.score || 0,
    revives: 0,
    branch: null, kind: null, ev: null, shop: null, gift: null, offer: null,
    chest: null, spring: false, shrine: null,
    score: 0, kills: 0, battles: 0, seen: {},
    started: Date.now(), end: null, log: [],
  };
  // 天赋「古树所赐」：开局白得一件造物
  if (tm.relic) { const r = TREE_RELICS[Math.floor(runRng(run, 'gift0')() * TREE_RELICS.length)]; run.relics.push(r.id); }
  // 分队：猎手开局带装备、祭祀开局带祝福
  for (let i = 0; i < sm.gear; i++) addGear(run, pickGear(run).id);
  for (let i = 0; i < sm.bless; i++) {
    const b = TREE_BLESSINGS[Math.floor(runRng(run, `sbl:${i}`)() * TREE_BLESSINGS.length)];
    if (b && !run.bless.includes(b.id)) run.bless.push(b.id);
  }
  nextBranch(run);
  s.cur = run;
  s.runs++;
  return { run };
}

/** 每一步的岔路：第 10 步固定首领；前面每步从类型池里抽 2 条（天赋「岔路生枝」给 3 条），尽量不同。
 *  保底：一层快走完还没见过商店 / 奇遇的话，把它们的权重拉满——「一条都没遇到」比「遇到坏的」更伤体验。 */
const NODE_POOL = ['battle', 'elite', 'hunt', 'event', 'shop', 'rest', 'trial', 'chest', 'spring', 'shrine'];
function nextBranch(run) {
  if (run.node >= TREE_STEPS - 1) { run.branch = ['boss']; return; }
  const rng = runRng(run, `br:${run.act}:${run.node}:${run.rr2 || 0}`);
  const pool = [];
  const push = (k, w) => { for (let i = 0; i < w; i++) pool.push(k); };
  const near = run.node >= TREE_STEPS - 3;          // 最后三步：补保底
  push('battle', 5);
  push('elite', run.node >= 2 || run.act > 0 ? 2 : 1);
  push('hunt', run.act > 0 ? 2 : 1);
  push('event', run.seen.event || near ? 3 : 8);
  push('shop', run.seen.shop || near ? 2 : 8);
  push('rest', 2);
  push('trial', 2);
  push('chest', 2);
  push('spring', run.slugs.some((x) => (run.hp[x] ?? 1) <= 0.001) ? 3 : 1);
  push('shrine', 2);
  const n = Math.max(2, Math.min(3, num(run.paths, 2)));   // 天赋「岔路生枝」→ 3 条
  const out = [];
  let rest = [...pool];
  while (out.length < n && rest.length) {
    const k = rest[Math.floor(rng() * rest.length)];
    out.push(k);
    rest = rest.filter((x) => x !== k);               // 同一步里不出两条一样的路
  }
  run.branch = out.length ? out : ['battle', 'event'];
  run.kind = null;
}

// ------------------------------------------------------------------ 装备与仓库
const gearDef = (id) => gearDefOf(id);
/** 装备列表（带 v 的 uid），UI 与统计共用 */
export function gearRows(run) {
  const g = run.gear || { pool: [], ring: {}, pact: [], order: [] };
  return (g.pool || []).map((it) => {
    const def = gearDef(it.defId);
    const ringOn = Object.entries(g.ring || {}).find(([, uid]) => uid === it.uid);
    const onOther = (g.pact || []).includes(it.uid) || (g.order || []).includes(it.uid);
    return { uid: it.uid, def, where: ringOn ? ringOn[0] : onOther ? 'team' : null };
  });
}
/** 已装备的 uid 集合 */
const equippedUids = (run) => {
  const g = run.gear || {};
  return new Set([...Object.values(g.ring || {}), ...(g.pact || []), ...(g.order || [])].filter(Boolean));
};
function addGear(run, defId) {
  const g = (run.gear ||= { pool: [], ring: {}, pact: [], order: [], n: 1 });
  g.pool ||= []; g.ring ||= {}; g.pact ||= []; g.order ||= [];
  g.n ||= (g.pool.length + 1);
  const uid = `tg${run.seed % 100000}-${g.n++}`;
  g.pool.push({ uid, defId });
  return uid;
}
/** 装备到某人（环）或全队（契 / 令）。同一件不能重复装；契 / 令 上限由天赋「行囊加层」加槽。 */
export function gearEquip(state, run, uid, slug = null) {
  const g = run.gear || {};
  const item = (g.pool || []).find((x) => x.uid === uid);
  const def = item && gearDef(item.defId);
  if (!def) return { err: '没有这件装备' };
  if (equippedUids(run).has(uid)) return { err: '已经装上了' };
  if (def.kind === 'ring') {
    if (!slug || !(run.pool || []).includes(slug)) return { err: '要选一位队员' };
    const old = g.ring[slug] || null;
    g.ring[slug] = uid;
    return { ok: true, replaced: old };
  }
  const arr = def.kind === 'pact' ? (g.pact ||= []) : (g.order ||= []);
  const cap = gearLimit(run, def.kind);
  if (arr.length >= cap) return { err: `${GEAR_KIND_ZH[def.kind]}最多 ${cap} 件` };
  arr.push(uid);
  return { ok: true };
}
export function gearUnequip(state, run, uid) {
  const g = run.gear || {};
  for (const slug of Object.keys(g.ring || {})) if (g.ring[slug] === uid) { delete g.ring[slug]; return { ok: true }; }
  for (const k of ['pact', 'order']) {
    const i = (g[k] || []).indexOf(uid);
    if (i >= 0) { g[k].splice(i, 1); return { ok: true }; }
  }
  return { err: '没有装这件' };
}
/** 编队：从仓库里挑最多 4 人上场。倒下的人不能上场（先用泉水 / 事件救回来）。 */
export function setLineup(state, run, slugs) {
  const cap = teamMax(run);          // 分队「前锋」可上 5 人
  const want = [...new Set((slugs || []).filter((x) => (run.pool || []).includes(x)))].slice(0, cap);
  if (!want.length) return { err: '至少要留一个人上场' };
  const dead = want.filter((x) => (run.hp[x] ?? 1) <= 0.001);
  if (dead.length) return { err: '倒下的人上不了场，先去泉水或事件里救回来' };
  run.slugs = want;
  return { ok: true, slugs: want, max: cap };
}
/** 局内招募：花余晖把一位旅人请进仓库（黑市 / 事件用） */
export function recruitMember(state, data, run, slug) {
  const cap = poolCap(run);
  if (!data.bySlug[slug] || (run.pool || []).includes(slug)) return { err: '不能重复招募' };
  if ((run.pool || []).length >= cap) return { err: `仓库满了（${cap} 人）` };
  run.pool.push(slug);
  run.hp[slug] = 1;
  return { ok: true, slug };
}

// ------------------------------------------------------------------ 战斗准备
/** 局内加成总表：增益（可叠）+ 树海造物 + 祝福 + 专属强化 + 装备 + 天赋。 */
function modsOf(run, slug = '') {
  const m = { hp: 0, atk: 0, def: 0, critRate: 0, critDmg: 0, amp: 0, healBonus: 0, shieldBonus: 0, steal: 0, surviveChance: 0, firstBoost: 0, aliGain: 0, keyGain: 0, shield: 0 };
  const add = (o) => { if (!o) return; for (const k of Object.keys(m)) if (o[k]) m[k] += o[k]; };
  for (const [id, n] of Object.entries(run.buffs || {})) {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    if (b) add({ [b.key]: b.v * num(n, 1) });
  }
  for (const id of run.relics || []) add(relicOf(id)?.mod);
  for (const id of run.bless || []) add(blessingOf(id)?.mod);
  for (const u of run.ups || []) if (!slug || u.slug === slug) add(u.mod);
  // 局内装备：这个人身上的环 + 全队的契 / 令
  const g = run.gear || {};
  const uids = [];
  if (slug && g.ring?.[slug]) uids.push(g.ring[slug]);
  uids.push(...(g.pact || []), ...(g.order || []));
  for (const uid of uids) {
    const it = (g.pool || []).find((x) => x.uid === uid);
    const def = it && gearDef(it.defId);
    if (def?.mod) add(def.mod);
  }
  return m;
}
/** 装备 / 造物 / 天赋里那些「按场结算」的数值 */
function runSum(run, state, key) {
  const g = run.gear || {};
  let n = relicSum(run, key);
  for (const uid of [...Object.values(g.ring || {}), ...(g.pact || []), ...(g.order || [])]) {
    const it = (g.pool || []).find((x) => x.uid === uid);
    n += Number(gearDef(it?.defId)?.[key]) || 0;
  }
  for (const id of run.bless || []) n += Number(blessingOf(id)?.[key]) || 0;
  if (state) n += Number(talentMods(treeState(state))[key]) || 0;
  return n;
}

/** 队伍此刻的实际属性：账号练度被 ovr 盖掉、账号装备被 bare 屏蔽，再叠局内养成；血量按 run.hp 的比例注入。 */
export function allyDefsOf(state, data, run, slugs = run.slugs) {
  const ovr = enhOvr(run.enh);
  const t = teamDefs(state, data, slugs, ovr, true);
  const tm = talentMods(treeState(state));
  return t.list.map((d) => {
    const m = modsOf(run, d.slug);
    const out = { ...d };
    // hpMod：分队自带的取舍（前锋 +1 人上场，但全队 -12% 生命）
    out.hp = Math.max(1, Math.round(d.hp * (1 + (m.hp + tm.hp + num(run.maxhpPct) + num(run.hpMod)) / 100)));
    out.atk = Math.max(1, Math.round(d.atk * (1 + (m.atk + tm.atk) / 100)));
    out.def = Math.max(0, Math.round(d.def * (1 + (m.def + tm.def) / 100)));
    out.critRate = (d.critRate || 0) + m.critRate + tm.critRate;
    out.critDmg = (d.critDmg || 0) + m.critDmg;
    out.amp = (d.amp || 0) + m.amp + tm.amp;
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
  const info = { boss: kind === 'boss', elite: kind === 'elite' || kind === 'hunt', node: kind === 'boss' ? 10 : kind === 'hunt' ? 7 : kind === 'elite' ? 5 : 3 };
  const stage = treeStage(run.act, run.node, diff.off);
  const hunt = kind === 'hunt';
  const enemies = buildEnemies(stage, data.monsters, { seed: `tree${run.seed}:${run.act}:${run.node}`, info, msk: data.msk, main: true })
    .map((e) => ({
      ...e,
      hp: Math.max(1, Math.round(e.hp * diff.scale * (hunt ? 1.22 : 1))),
      atk: Math.max(1, Math.round(e.atk * diff.scale * (hunt ? 1.12 : 1))),
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
  for (const x of run.pool || run.slugs) {
    const hp = run.hp[x] ?? 1;
    if (hp <= 0.001) continue;
    run.hp[x] = Math.max(0, Math.min(1, hp + frac));
  }
}

/** 打完一步：写血量、加分、发余晖、往前走。首领战胜利掉 1 枚古树之芽；猎场必掉一件装备。 */
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
  const base = kind === 'boss' ? 45 : kind === 'hunt' ? 30 : kind === 'elite' ? 24 : 12;
  const hpLeft = run.slugs.reduce((n, x) => n + (run.hp[x] || 0), 0) / Math.max(1, run.slugs.length);
  const roundBonus = res.win ? Math.round(10 * Math.max(0, 1 - res.rounds / Math.max(1, res.roundLimit || 20))) : 0;
  if (res.win) {
    run.score += Math.round((base + Math.round(25 * hpLeft) + roundBonus) * diff.mult);
    run.glow += Math.round(((kind === 'boss' ? 34 : kind === 'hunt' ? 26 : kind === 'elite' ? 20 : 12) + runSum(run, state, 'glow') + num(run.glowPerWin)) * (1 + diff.mult * 0.12));
    run.kills += res.kills || 0;
  }
  run.battles++;
  const afterPct = runSum(run, state, 'after');
  if (afterPct) healLiving(run, afterPct / 100);
  run.log.push({ k: kind, win: !!res.win, rounds: res.rounds, score: Math.round(run.score) });
  const wiped = run.slugs.every((x) => (run.hp[x] ?? 0) <= 0.001);
  if (!res.win || wiped) {
    // 天赋「树海留手」：一趟里第一次全队倒下不算结束，原地以 35% 生命站起（装备 / 编队还能再调）
    if (wiped && num(run.mercy) > 0) {
      run.mercy = 0;
      run.revives = num(run.revives) + 1;
      for (const x of run.pool || run.slugs) run.hp[x] = Math.max(num(run.hp[x]), 0.35);
      run.gift = null;
      return { mercy: true, revives: run.revives };
    }
    endRun(state, false); return { lost: true };
  }
  if (kind === 'boss') {
    run.buds++;
    run.gift = { src: 'boss' };                       // 古树之芽到账，去试炼面板点亮
  }
  if (kind === 'hunt') {                              // 猎场：必掉装备；猎手分队每次掉两件
    const n = 1 + num(run.huntDrop);
    const drops = [];
    for (let i = 0; i < n; i++) drops.push(addGear(run, pickGear(run, 'any').id));
    run.gearDrop = { uid: drops[0], uids: drops, from: 'hunt' };
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

/** 选一条岔路：写 run.kind，事件 / 商店 / 休整 / 宝箱 / 泉水 / 祭坛当场结算面板，战斗等玩家点「开打」。
 *  data 只用来把黑市的旅人名字显示成人名，不传也能跑（显示 slug）。 */
export function pickBranch(state, run, i, data = null) {
  const k = (run.branch || [])[i];
  if (!k) return null;
  run.kind = k;
  run.branch = null;
  run.seen[k] = (run.seen[k] || 0) + 1;
  if (k === 'event') run.ev = { id: treeEventOf(run).id };
  if (k === 'shop') run.shop = shopStock(state, run, data);
  if (k === 'rest') run.rest = true;
  if (k === 'trial') run.gift = { src: 'node' };
  if (k === 'chest') run.chest = chestOptions(run);
  if (k === 'spring') run.spring = true;
  if (k === 'shrine') run.shrine = shrineOptions(run);
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

// ------------------------------------------------------------------ 奇遇 / 休整 / 宝箱 / 泉水 / 祭坛 / 商店
/** 事件里有「装备」类的收益时抽一件（越深越可能出高稀有度） */
export function pickGear(run, kind = 'any') {
  const rng = runRng(run, `tg:${run.act}:${run.node}:${(run.gn = (run.gn || 0) + 1)}`);
  let pool = TREE_GEAR.filter((g) => kind === 'any' || g.kind === kind);
  // 深度决定稀有度权重：第 3 层才容易出 SSR
  const deep = run.act >= 2;
  pool = pool.filter((g) => deep || g.rar !== 'SSR');
  return pool[Math.floor(rng() * pool.length)] || TREE_GEAR[0];
}

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
  if (g.tk) { const n = grantRandomAwaken(state, g.tk, run); out.tk = n; }
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
  if (g.gear || g.gearGamble != null) {
    const rng = runRng(run, `tge:${run.act}:${run.node}`);
    if (g.gear || rng() < g.gearGamble) {
      const d = pickGear(run);
      addGear(run, d.id); out.got.push(`${d.zh}（${GEAR_KIND_ZH[d.kind]}）`); out.gear = d.id;
    } else {
      for (const x of run.pool) run.hp[x] = Math.max(0, Math.min(1, (run.hp[x] ?? 1) - 0.1));
      out.heal = -10;
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
    else { for (const x of run.pool) run.hp[x] = Math.max(0, Math.min(1, (run.hp[x] ?? 1) - 0.12)); out.heal = -12; }
  }
  if (g.rec) {
    const cand = Object.keys(state.roster).filter((x) => !run.pool.includes(x));
    if (cand.length && run.pool.length < poolCap(run)) {
      const rng = runRng(run, `trec:${run.act}:${run.node}`);
      const sl = cand[Math.floor(rng() * cand.length)];
      run.pool.push(sl); run.hp[sl] = 1;
      out.got.push(`${sl} 加入仓库`);
      out.rec = sl;
    } else out.got.push('没有可加入的旅人');
  }
  run.ev = null;
  if (g.skip) {
    stepForward(state, run);
    out.step = stepForward(state, run);
    return out;
  }
  out.step = stepForward(state, run);
  return out;
}

/** 休整（篝火）：三条路——大回血，小回血 + 白得一条增益，或把仓库里的人换上来（不耗步数）。 */
export const REST_OPTS = [
  { k: '围着火堆睡一觉', desc: '全队回复 45% 生命' },
  { k: '轮流守夜，聊聊天', desc: '全队回复 18% 生命，随机获得一条增益' },
  { k: '在火边清点行装', desc: '不前进：打开仓库整理编队与装备' },
];
export function applyRest(state, run, i) {
  if (!run.rest) return null;
  const out = { heal: 0, got: [] };
  if (i === 0) { healLiving(run, 0.45); out.heal = 45; }
  else if (i === 1) {
    healLiving(run, 0.18); out.heal = 18;
    const rng = runRng(run, `rest:${run.act}:${run.node}`);
    const b = LUCK_BUFFS[Math.floor(rng() * LUCK_BUFFS.length)];
    run.buffs[b.id] = (run.buffs[b.id] || 0) + 1;
    out.got.push(b.zh);
  } else { out.stay = true; return out; }
  run.rest = false;
  out.step = stepForward(state, run);
  return out;
}

// ---- 宝箱：三选一装备，免费
export function chestOptions(run) {
  const rng = runRng(run, `chest:${run.act}:${run.node}`);
  const pool = [...TREE_GEAR];
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
export function takeChest(state, run, defId) {
  const list = run.chest || [];
  const def = list.find((g) => g.id === defId);
  if (!def) return null;
  addGear(run, def.id);
  run.chest = null;
  return { ok: true, zh: def.zh, step: stepForward(state, run) };
}

// ---- 泉水：救回一个人，或全队大回血
export function springOptions(run) {
  const dead = (run.pool || []).filter((x) => (run.hp[x] ?? 1) <= 0.001);
  return [
    { k: '把一个人从水底捞回来', desc: dead.length ? `复活 ${dead.length} 位倒下者中的一位（50% 生命）` : '没有人倒下——改为全队回复 30% 生命', dead: dead.length },
    { k: '让全队喝饱', desc: '全队回复 40% 生命，得 20 余晖' },
  ];
}
export function takeSpring(state, run, i) {
  if (!run.spring) return null;
  const out = { heal: 0, revive: null };
  if (i === 0) {
    const dead = (run.pool || []).filter((x) => (run.hp[x] ?? 1) <= 0.001);
    if (dead.length) { run.hp[dead[0]] = 0.5; out.revive = dead[0]; }
    else { healLiving(run, 0.3); out.heal = 30; }
  } else { healLiving(run, 0.4); run.glow += 20; out.heal = 40; out.glow = 20; }
  run.spring = false;
  out.step = stepForward(state, run);
  return out;
}

// ---- 祭坛：三选一祝福，代价是 10% 生命
export function shrineOptions(run) {
  const rng = runRng(run, `shrine:${run.act}:${run.node}`);
  const pool = [...TREE_BLESSINGS];
  const out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}
/** 祭坛代价：祭祀分队减半（10% → 5%） */
export const shrineCost = (run) => (num(run?.shrineHalf) ? 0.05 : 0.1);
export function takeShrine(state, run, id) {
  const list = run.shrine || [];
  const def = list.find((b) => b.id === id);
  if (!def) return null;
  run.bless.push(def.id);
  const cost = shrineCost(run);
  for (const x of run.pool) run.hp[x] = Math.max(0, Math.min(1, (run.hp[x] ?? 1) - cost));
  run.shrine = null;
  return { ok: true, zh: def.zh, heal: -Math.round(cost * 100), step: stepForward(state, run) };
}

/** 黑市货架：2 造物 + 2 装备 + 2 增益 + 热汤 + 概率商品（招募 / 界域唤醒券 / 古树之芽 / 直升券）。 */
export function shopStock(state, run, data = null) {
  const rng = runRng(run, `tshop:${run.act}:${run.node}`);
  const diff = treeDiffOf(run.diff);
  const tm = talentMods(treeState(state));
  const off = 1 - Math.min(0.55, (relicSum(run, 'discount') + tm.discount) / 100);
  const pool = TREE_RELICS.filter((r) => !run.relics.includes(r.id));
  const pick2 = (arr, n) => { const a = [...arr]; const o = []; while (o.length < n && a.length) o.push(a.splice(Math.floor(rng() * a.length), 1)[0]); return o; };
  const items = pick2(pool, 2).map((r) => ({ type: 'relic', id: r.id, zh: r.zh, desc: r.desc, price: Math.round((60 + run.act * 20) * off) }));
  // 装备：2 件，按种类从环 / 契 / 令里各抽
  for (const g of pick2(TREE_GEAR, 2)) items.push({ type: 'gear', id: g.id, zh: g.zh, desc: `${GEAR_KIND_ZH[g.kind]} · ${g.desc}`, price: Math.round(g.price * off * (1 + run.act * 0.1)), gear: g.id });
  for (const b of pick2(LUCK_BUFFS, 2)) items.push({ type: 'buff', id: b.id, zh: b.zh, desc: b.desc, price: Math.round(38 * off) });
  items.push({ type: 'heal', id: 's_heal', zh: '热汤', desc: '全队回复 30% 生命', price: Math.round(42 * off) });
  // 招募：仓库没满时可能上架一位旅人
  if (run.pool.length < poolCap(run) && rng() < 0.55) {
    const cand = Object.keys(state.roster).filter((x) => !run.pool.includes(x));
    if (cand.length) {
      const sl = cand[Math.floor(rng() * cand.length)];
      const a = state.roster[sl];
      items.push({ type: 'recruit', id: `s_rec_${sl}`, zh: `旅人 · ${data?.bySlug[sl]?.zh || sl}`, desc: '邀请一位角色进仓库（练度带不进来，只有 50 级白板）', price: Math.round(70 * off), slug: sl });
    }
  }
  // 账号级商品：界域唤醒券随时可能上架；直升券只出现在深根与黑流之心
  if (rng() < 0.55) {
    const realms = Object.keys(REALMS);
    const rl = realms[Math.floor(rng() * realms.length)];
    items.push({ type: 'voucher', id: `s_awk_${rl}`, zh: `${REALMS[rl].zh}之茧`, desc: `唤醒券（${REALMS[rl].zh}界域）：唤醒一位未拥有的${REALMS[rl].zh}界域角色`, price: Math.round(150 * off), voucher: `awaken:${rl}` });
  }
  if (rng() < 0.5) items.push({ type: 'bud', id: 's_bud', zh: '古树之芽', desc: '在古树试炼点亮练度，或换一次馈赠', price: Math.round(130 * off), bud: 1 });
  const deep = diff.id === 'root' || diff.id === 'heart';
  if (deep && rng() < 0.32) items.push({ type: 'voucher', id: 's_direct', zh: '无名之契', desc: '直升券：把一位角色直接练到超限满（账号资产）', price: Math.round(320 * off), voucher: 'direct' });
  // 通用唤醒券：比界域券贵，出得也少——「挑哪个界域都行」是它唯一的卖点
  if (deep && rng() < 0.3) items.push({ type: 'voucher', id: 's_univ', zh: '无界之茧', desc: '通用唤醒券：任意界域都可以换一位未拥有的角色', price: Math.round(230 * off), voucher: 'awaken:ANY' });
  return items;
}

export function shopBuy(state, run, idx) {
  const it = (run.shop || [])[idx];
  if (!it || run.glow < it.price) return { err: '余晖不够' };
  const out = { ok: true, zh: it.zh, got: [] };
  run.glow -= it.price;
  if (it.type === 'heal') { healLiving(run, 0.3); out.heal = 30; }
  else if (it.type === 'relic') { if (!run.relics.includes(it.id)) run.relics.push(it.id); }
  else if (it.type === 'gear') { addGear(run, it.gear); out.got.push(it.zh); }
  else if (it.type === 'buff') run.buffs[it.id] = (run.buffs[it.id] || 0) + 1;
  else if (it.type === 'recruit') {
    if ((run.pool || []).length >= poolCap(run)) return { err: `仓库满了（${poolCap(run)} 人）` };
    run.pool.push(it.slug); run.hp[it.slug] = 1; out.got.push(it.zh);
  }
  else if (it.type === 'bud') { run.buds += it.bud; out.bud = it.bud; }
  else if (it.type === 'voucher') { grantVoucher(state, it.voucher); out.voucher = it.voucher; }
  run.shop = (run.shop || []).filter((_, i) => i !== idx);
  return out;
}

// ---- 券：'direct' / 'awaken:REALM' / 'awaken:ANY'（通用唤醒券）
function grantVoucher(state, tag) {
  if (tag === 'direct') { state.vouchers = state.vouchers || { rewind: 0, direct: 0 }; state.vouchers.direct = (state.vouchers.direct || 0) + 1; return 'direct'; }
  if (tag === 'awaken:ANY') { addUniversal(state, 1); return 'awaken:ANY'; }
  const m = /^awaken:([A-Z]+)$/.exec(String(tag));
  if (m && REALMS[m[1]]) { addAwaken(state, m[1], 1); return tag; }
  return null;
}
function grantRandomAwaken(state, n, run) {
  const realms = Object.keys(REALMS);
  const rng = runRng(run || { seed: 1 }, `tk:${run?.act || 0}:${run?.node || 0}:${run?.rr || 0}`);
  let got = 0;
  for (let i = 0; i < n; i++) {
    const rl = realms[Math.floor(rng() * realms.length)];
    addAwaken(state, rl, 1); got++;
  }
  return got;
}

export const leaveNode = (state, run) => {
  run.ev = null; run.shop = null; run.rest = false; run.offer = null;
  run.chest = null; run.spring = false; run.shrine = null; run.gearDrop = null;
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
  const gears = TREE_GEAR;
  const buffs = fresh(LUCK_BUFFS);
  const out = [];
  if (relics.length) out.push({ type: 'relic', ...relics[Math.floor(rng() * relics.length)] });
  const r2 = rng();
  if (r2 < 0.4 && gears.length) { const g = gears[Math.floor(rng() * gears.length)]; out.push({ type: 'gear', ...g }); }
  else if (ups.length) out.push({ type: 'up', ...ups[Math.floor(rng() * ups.length)] });
  const rest = [...buffs];
  while (out.length < n && rest.length) out.push({ type: 'buff', ...rest.splice(Math.floor(rng() * rest.length), 1)[0] });
  return out.slice(0, n);
}

export function takeOffer(state, data, run, id) {
  const it = (run.offer || []).find((x) => x.id === id);
  if (!it) return null;
  if (it.type === 'buff') run.buffs[id] = num(run.buffs[id], 0) + 1;
  else if (it.type === 'relic') giveRelic(run, id);
  else if (it.type === 'gear') addGear(run, it.id);
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
  if (!run || !['battle', 'elite', 'hunt', 'boss'].includes(run.kind)) return null;
  const prep = battlePrep(state, data, run);
  if (!prep) { endRun(state, false); return null; }
  const res = simulate({ allies: prep.allies, enemies: prep.enemies, seed: prep.seed, strategy: state.strategy, maxRounds: prep.maxRounds, rules: prep.rules, dotBoost: prep.dotBoost });
  res.__prep = prep;
  const step = applyBattle(state, data, run, res);
  return { res, prep, step };
}

// ------------------------------------------------------------------ 成就
export const TREE_ACH = [
  { id: 't_first', zh: '踏足树海', desc: '通过黑流树海的第一层', reward: { gold: 1500, cores: 30, tickets: 2 } },
  { id: 't_clear', zh: '穿林而出', desc: '完整走完三层', reward: { gold: 4000, cores: 80, tickets: 3 } },
  { id: 't_whisper', zh: '听过低语', desc: '在「低语」难度下通关', reward: { gold: 3000, cores: 60, tickets: 3, tp: 1 } },
  { id: 't_shade', zh: '树影不侵', desc: '在「树影」难度下通关', reward: { gold: 6000, cores: 120, tickets: 4, tp: 1 } },
  { id: 't_root', zh: '根须缠身', desc: '在「深根」难度下通关', reward: { gold: 12000, cores: 220, tickets: 6, tp: 2, vouchers: ['awaken:AEQUOR'] } },
  { id: 't_heart', zh: '黑流之心', desc: '在「黑流之心」难度下通关', reward: { gold: 30000, cores: 500, tickets: 12, tp: 3, vouchers: ['direct', 'awaken:CHAOS'] } },
  { id: 't_enh3', zh: '古树全馈', desc: '单局点亮全部三档强化', reward: { gold: 6000, cores: 100, tickets: 8 } },
  { id: 't_no_enh', zh: '本来如此', desc: '不点亮任何强化，在「微光」难度下通关', reward: { gold: 8000, cores: 150, tickets: 5, tp: 2 } },
  { id: 't_relic8', zh: '树海收藏家', desc: '单局拿到 6 件树海造物', reward: { gold: 3000, cores: 60 } },
  { id: 't_gear8', zh: '行囊鼓鼓', desc: '单局拿到 8 件局内装备', reward: { gold: 3200, cores: 70 } },
  { id: 't_score', zh: '黑流回响', desc: '单局得分达到 3000', reward: { gold: 4000, cores: 80, tickets: 3 } },
  { id: 't_score6k', zh: '树海回声', desc: '单局得分达到 6000', reward: { gold: 7000, cores: 140, tickets: 4, tp: 1 } },
  { id: 't_rich', zh: '余晖满囊', desc: '单局结束时持有 350 以上余晖', reward: { gold: 2500, cores: 40 } },
  { id: 't_flawless', zh: '雾中无伤', desc: '通关时全队生命都在 70% 以上', reward: { gold: 5000, cores: 90, tickets: 3 } },
  { id: 't_fullpool', zh: '满仓同行', desc: '单局把仓库塞满 8 个人', reward: { gold: 3500, cores: 60, tp: 1 } },
  { id: 't_bless3', zh: '三重祝福', desc: '单局拿到 3 条祭坛祝福', reward: { gold: 4000, cores: 80 } },
  { id: 't_lv10', zh: '树海常客', desc: '树海等级达到 10 级', reward: { gold: 6000, cores: 120, tp: 2 } },
  { id: 't_squads', zh: '六路同行', desc: '六支分队各开过一趟（换着打法走）', reward: { gold: 8000, cores: 160, tp: 1, vouchers: ['awaken:ANY'] } },
  { id: 't_mercy', zh: '死里逃生', desc: '靠「树海留手」站住一次，并且最终走出树海', reward: { gold: 9000, cores: 180, tickets: 4, tp: 1 } },
];

// ------------------------------------------------------------------ 结算
export function endRun(state, win) {
  const s = treeState(state);
  const run = s.cur;
  if (!run) return null;
  const diff = treeDiffOf(run.diff);
  const tm = talentMods(s);
  let score = Math.round((run.score + run.enh * 60 * diff.mult) * (1 + (tm.score + num(run.scoreMod)) / 100));
  if (win) score += Math.round(100 * diff.mult);
  const rw = { gold: 0, tickets: 0, cores: 0, vouchers: [], tp: 0, pts: 0 };
  // 经验（pts）与天赋点：赢一局给得多，输一局也给一点（不至于白跑）
  rw.pts = Math.round(score / 40) + (win ? 30 : 0) + run.act * 8;
  rw.tp = win ? 1 + (diff.mult >= 3 ? 1 : 0) : 0;
  if (win) {
    rw.gold += Math.round(2200 * diff.mult);
    rw.cores += Math.round(30 * diff.mult);
    rw.tickets += 1 + Math.floor(diff.mult / 1.5);
    // 首通某难度：真正的硬奖励在这（界域唤醒券 / 直升券只从这里成对地给）
    const first = !s.cleared[diff.id];
    s.cleared[diff.id] = true;
    if (first) {
      const bonus = { dim: 2, whisper: 3, shade: 4, root: 5, heart: 12 }[diff.id] || 0;
      rw.tickets += bonus;
      const firsts = { dim: ['awaken:CARO'], whisper: ['awaken:AEQUOR'], shade: ['awaken:ULTRA'], root: ['awaken:CARO', 'awaken:AEQUOR'], heart: ['direct', 'awaken:CHAOS'] };
      for (const v of firsts[diff.id] || []) rw.vouchers.push(v);
      rw.first = diff.id;
    }
  } else {
    rw.gold += Math.round(500 * diff.mult);   // 参与奖
  }
  run.end = {
    win, score, act: run.act, node: run.node, glow: run.glow, enh: run.enh, buds: run.buds,
    at: Date.now(), rw, pool: run.pool.length, gear: (run.gear?.pool || []).length, bless: (run.bless || []).length,
  };
  s.best = Math.max(s.best, score);
  s.pts += rw.pts;
  s.tp += rw.tp;
  if (win) s.clears++;
  state.gold += rw.gold; state.tickets += rw.tickets; state.cores += rw.cores;
  state.stats.gold = (state.stats.gold || 0) + rw.gold;
  for (const v of rw.vouchers) grantVoucher(state, v);
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
  if ((run.gear?.pool || []).length >= 8) mark('t_gear8');
  if ((run.bless || []).length >= 3) mark('t_bless3');
  if ((run.pool || []).length >= POOL_MAX) mark('t_fullpool');
  if (score >= 3000) mark('t_score');
  if (score >= 6000) mark('t_score6k');
  if (run.glow >= 350) mark('t_rich');
  if (treeLevelOf(s.pts) >= 10) mark('t_lv10');
  // 分队：六支各开过一趟（不管输赢，重点是换打法）
  s.squads ||= {};
  if (run.squad) s.squads[run.squad] = true;
  if (Object.keys(s.squads).length >= TREE_SQUADS.length) mark('t_squads');
  if (win && num(run.revives) > 0) mark('t_mercy');
  s.cur = null;
  run.end.got = got;
  run.end.lv = treeLevelOf(s.pts);
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
  s.tp += a.reward.tp || 0;
  const vs = [];
  for (const v of a.reward.vouchers || []) { if (grantVoucher(state, v)) vs.push(v); }
  state.stats.gold = (state.stats.gold || 0) + (a.reward.gold || 0);
  return { ...a.reward, vouchers: vs };
}

export const abandonRun = (state) => (treeState(state).cur ? endRun(state, false) : null);

// 兼容：空券对象（外部偶尔要初始化）
export { emptyAwaken };
