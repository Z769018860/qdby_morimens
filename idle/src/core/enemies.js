import { hash, mulberry32 } from './rng.js';
import { fx } from './skills.js';
import { patternOf } from './monsters.js';

export const CHAPTERS = ['序章·雾港', '蚀刻回廊', '沉没钟楼', '猩红温室', '回响墓园', '潮汐监牢', '倒悬教堂', '无光之海', '镜面都市', '终末列车'];
export const stageInfo = (stage) => {
  const chapter = Math.floor((stage - 1) / 10) + 1;
  const node = ((stage - 1) % 10) + 1;
  // 每 40 关的 Boss 关换成「奖励首领」校猫（第 40/80/120… 关），打赢掉额外奖励
  return { stage, chapter, node, boss: node === 10, elite: node === 5, reward: stage % 40 === 0, name: CHAPTERS[(chapter - 1) % CHAPTERS.length] + (chapter > CHAPTERS.length ? `·${Math.floor((chapter - 1) / CHAPTERS.length) + 1}周` : '') };
};

const P = {
  Normal: [
    { name: '撕咬', effects: [fx.dmg(1.0)] },
    { name: '蠕动冲击', effects: [fx.dmg(1.0)] },
    { name: '低语', effects: [fx.dmg(0.55, { to: 'foes' })] },
  ],
  Elite: [
    { name: '利爪', effects: [fx.dmg(1.2)] },
    { name: '狂化', effects: [fx.buff('atk', 25, 3)] },
    { name: '横扫', effects: [fx.dmg(0.7, { to: 'foes' })] },
    { name: '重击', effects: [fx.dmg(2.0)] },
  ],
  Boss: [
    { name: '碾压', effects: [fx.dmg(1.2)] },
    { name: '嘶鸣', effects: [fx.dmg(0.8, { to: 'foes' })] },
    { name: '侵蚀', effects: [fx.debuff('def', 20, 2, 'foes')] },
    { name: '灭世重击', effects: [fx.dmg(2.4)] },
    { name: '蚀潮', effects: [fx.dmg(1.0, { to: 'foes' })] },
    { name: '暴怒', effects: [fx.buff('atk', 20, 3)] },
  ],
};
const AFFIX = { fury: '狂暴的', shell: '坚壳的', bleeder: '蚀咬的', swift: '迅捷的' };
export const AFFIX_KEYS = Object.keys(AFFIX);

// 90 关之前的曲线不动；90 关之后复利放缓（每关 ×1.065，原来 ×1.085），难度改由下面的「域规」提供：
// 数值只负责「有门槛」，破局靠带对机制的阵容，而不是继续堆满养成。
export const CURVE_FROM = 90;
export const enemyScale = (stage) => Math.pow(1.085, stage - 1);   // 无限塔 / 试炼 / 周 Boss 等沿用的老曲线
export const enemyScaleMain = (stage) => {
  const s = Math.max(1, Number(stage) || 1);
  if (s <= CURVE_FROM) return Math.pow(1.085, s - 1);
  return Math.pow(1.085, CURVE_FROM - 1) * Math.pow(1.065, s - CURVE_FROM);
};

// 后期加压：80 关之前不变；80~90 关每 10 关生命 ×1.10、攻击 ×1.06、防御 +4%（复利）；
// 90 关之后加压减半（生命 ×1.04、攻击 ×1.03、防御 +2% / 10 关）——原来每 10 关 ×2.5 的叠法，
// 满养成队伍到 100 关之后只剩「数值墙」，换什么阵容都一样；现在曲线更缓，墙让给域规去立。
export const LATE_FROM = 80;
export const lateBoost = (stage) => {
  const k = Math.max(0, (Number(stage) || 0) - LATE_FROM) / 10;
  return { hp: Math.pow(1.10, k), atk: Math.pow(1.06, k), def: 1 + 0.04 * k };
};
export const lateBoostMain = (stage) => {
  const st = Number(stage) || 0;
  const k = Math.max(0, Math.min(st, CURVE_FROM) - LATE_FROM) / 10;
  const k2 = Math.max(0, st - CURVE_FROM) / 10;
  return { hp: Math.pow(1.10, k) * Math.pow(1.04, k2), atk: Math.pow(1.06, k) * Math.pow(1.03, k2), def: 1 + 0.04 * k + 0.02 * k2 };
};

/* ---------- 域规：90 关之后，每一章（10 关）换一条规则，首领关再叠一条 ----------
   规则都有至少两种破法，换阵容就能过，不是「只有某一队能打」。
   id 对应 battle.js 里的实现；hint 是写给玩家看的对策提示。 */
// 持续 / 反击伤害的后期补偿：跟着怪物成长走（指数 k），90 关为 1
export const DOT_K = 1.1;
export const lateDotBoost = (stage) => (Number(stage) > CURVE_FROM ? Math.pow(enemyScaleMain(stage) / enemyScaleMain(CURVE_FROM), globalThis.__DOT_K ?? DOT_K) : 1);   // __DOT_K：仅供调参脚本覆盖
export const DOMAIN_FROM = 91;
export const DOMAINS = {
  barrier: { zh: '屏障怪', short: '屏障', d: '敌人带多层屏障（普通 5 / 精英 8 / 首领 14），每层抵消一次直接伤害，每 2 回合回 2 层', hint: '多段攻击、群体伤害，或者毒 / 流血 / 反击这类不被屏障挡的持续伤害' },
  thorns: { zh: '反震', short: '反震', d: '单次伤害超过敌人最大生命 7% 的一击，会被反震 35% 给攻击者', hint: '把输出拆成小伤害：持续伤害、反击、多段攻击；或者上护盾 / 治疗扛反震' },
  antiheal: { zh: '治疗压制', short: '压疗', d: '我方受到的治疗效果只剩 40%，敌人攻击 +12%', hint: '护盾、屏障、嘲讽减伤，或者反击 / 速攻在被打死之前把对面打完' },
  armor: { zh: '重甲', short: '重甲', d: '敌人防御 ×2，直接伤害大幅缩水', hint: '易伤 / 降防、毒 / 流血 / 反击这类无视防御的伤害，或者直接用比例伤害' },
  seal: { zh: '封印', short: '封印', d: '每 2 回合封印攒能量最多的两名队友（本回合不能放大招）', hint: '净化，或者分散能量（别让一个人独占满条）、多带不靠大招的输出' },
};
export const DOMAIN_KEYS = Object.keys(DOMAINS);
export function domainRules(stage) {
  const st = Number(stage) || 0;
  if (st < DOMAIN_FROM) return [];
  const ch = Math.floor((st - 1) / 10) + 1;                    // 10 起
  const i = (ch - 10) % DOMAIN_KEYS.length;
  const out = [DOMAIN_KEYS[i]];
  const boss = ((st - 1) % 10) + 1 === 10;
  if (boss || ch >= 15) out.push(DOMAIN_KEYS[(i + 2) % DOMAIN_KEYS.length]);
  return out;
}

// Real monster design: class sets the budget, the record's hp/atk/df multipliers fine-tune it, and the enemy plays its
// real opening (`op`) once, then loops its real cycle (`cy`). Without a skill table the generic pattern is used.
const clamp = (x, lo, hi) => { const v = Number(x); return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : 1)); };

// One enemy definition from a monster record (shared by stages, the tower and the trials).
export function makeEnemy(m, rank, stage, rng, { affixes = true, msk = null, main = false } = {}) {
  const st0 = Math.max(1, Number.isFinite(Number(stage)) ? Number(stage) : 1);
  const S = main ? enemyScaleMain(st0) : enemyScale(st0);
  const late = main ? lateBoostMain(stage) : lateBoost(stage);
  const hpM = { Normal: 1, Elite: 2.4, Boss: 5.5 }[rank] * clamp(m.hp ?? 1, 0.5, 1.8);
  const atkM = { Normal: 1, Elite: 1.15, Boss: 1.3 }[rank] * clamp(m.atk ?? 1, 0.75, 1.25);
  const df = Number(m.df);
  const dfM = clamp(1 + (Number.isFinite(df) ? df : 0) * 0.35, 0.6, 1.8);
  let pat = msk && m.cy?.length ? patternOf(m, msk, rank) : { opening: [], cycle: P[rank] };
  const def = {
    name: m.zh, img: m.img, type: 'ASSAULT', realm: null, boss: rank === 'Boss', rank,
    hp: Math.round(220 * S * hpM * late.hp), atk: Math.round(30 * S * atkM * late.atk), def: Math.round((28 + 5 * stage) * dfM * late.def),
    pattern: pat.cycle, opening: pat.opening, critRate: 0, critDmg: 50, mid: m.id, traits: m.traits || [], size: m.size,
    reward: !!m.reward,
    // 奖励战里陪场的那只（米酒）：界面靠这个标记在名字后面挂「陪场」，也让结算知道他不是校猫
    mate: !!m.mate,
    skills: [...pat.opening, ...pat.cycle].filter((x, i, arr) => arr.findIndex((y) => y.name === x.name && y.plain === x.plain) === i)
      .map((x) => ({ name: x.name, plain: x.plain || '', ic: x.ic || null })),
  };
  if (affixes && stage >= 6 && rank !== 'Boss' && rng() < 0.4) {
    const a = AFFIX_KEYS[Math.floor(rng() * AFFIX_KEYS.length)];
    def.affix = a; def.name = AFFIX[a] + def.name;
    if (a === 'fury') def.atk = Math.round(def.atk * 1.25);
    if (a === 'shell') { def.hp = Math.round(def.hp * 1.4); def.def = Math.round(def.def * 1.3); }
    if (a === 'bleeder') def.pattern = def.pattern.map((p, j) => (j === 0 ? { ...p, effects: [...p.effects, fx.dot(0.3, 3)] } : p));
  }
  return def;
}

export function buildEnemies(stage, monsters, opts = {}) {
  const info = opts.info || stageInfo(stage);
  const rng = mulberry32(hash(opts.seed || `stage${stage}`));
  // 奖励首领（校猫）不进随机池：只在奖励关/奖励层出现，且固定站在 Boss 位
  const reward = info.reward ? monsters.find((m) => m.reward) : null;
  // 陪场的那只（米酒，脑缸组的战斗设计师）同理不进随机池，只在奖励关站第二个位置。
  // 他不带 reward 标记 —— 奖励结算照旧只认校猫，他只是把这一关的难度调一档。
  const mate = info.reward ? monsters.find((m) => m.mate) : null;
  const plain = monsters.filter((m) => !m.reward && !m.mate);
  const pool = { Normal: plain.filter((m) => m.rank === 'Normal'), Elite: plain.filter((m) => m.rank === 'Elite'), Boss: plain.filter((m) => m.rank === 'Boss') };
  const comp = info.boss ? ['Boss', 'Normal', 'Normal'] : info.elite ? ['Elite', 'Normal'] : Array(2 + (info.node >= 3 ? 1 : 0)).fill('Normal');
  if (info.node === 9) comp.push('Normal');
  return comp.map((rank, i) => {
    const isMate = !!(mate && i === 1);
    const m = reward && i === 0 ? reward : isMate ? mate : pool[rank][Math.floor(rng() * pool[rank].length)];
    // 陪场的按精英档给数值（不然第二个回合就没了），但不吃随机词缀 ——
    // 否则他会变成「狂暴米酒」「坚壳米酒」，和「他就是这一关的设计师」对不上。
    return makeEnemy(m, isMate ? 'Elite' : rank, stage, rng, { msk: opts.msk, affixes: !isMate, main: !!opts.main });
  });
}
