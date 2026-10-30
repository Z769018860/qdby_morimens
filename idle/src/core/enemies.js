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

export const enemyScale = (stage) => Math.pow(1.085, stage - 1);

// 后期加压：80 关之前不变；之后每 10 关生命再 ×1.10、攻击 ×1.06、防御 +4%（复利）。
// 原因：超限 / 最终法则 / 专属技能把满养成队伍的输出拉得很高，不加压的话 100 关之后就没有挑战了。
export const LATE_FROM = 80;
export const lateBoost = (stage) => {
  const k = Math.max(0, (Number(stage) || 0) - LATE_FROM) / 10;
  return { hp: Math.pow(1.10, k), atk: Math.pow(1.06, k), def: 1 + 0.04 * k };
};

// Real monster design: class sets the budget, the record's hp/atk/df multipliers fine-tune it, and the enemy plays its
// real opening (`op`) once, then loops its real cycle (`cy`). Without a skill table the generic pattern is used.
const clamp = (x, lo, hi) => { const v = Number(x); return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : 1)); };

// One enemy definition from a monster record (shared by stages, the tower and the trials).
export function makeEnemy(m, rank, stage, rng, { affixes = true, msk = null } = {}) {
  const S = enemyScale(Math.max(1, Number.isFinite(Number(stage)) ? Number(stage) : 1));
  const late = lateBoost(stage);
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
  const plain = monsters.filter((m) => !m.reward);
  const pool = { Normal: plain.filter((m) => m.rank === 'Normal'), Elite: plain.filter((m) => m.rank === 'Elite'), Boss: plain.filter((m) => m.rank === 'Boss') };
  const comp = info.boss ? ['Boss', 'Normal', 'Normal'] : info.elite ? ['Elite', 'Normal'] : Array(2 + (info.node >= 3 ? 1 : 0)).fill('Normal');
  if (info.node === 9) comp.push('Normal');
  return comp.map((rank, i) => {
    const m = reward && i === 0 ? reward : pool[rank][Math.floor(rng() * pool[rank].length)];
    return makeEnemy(m, rank, stage, rng, { msk: opts.msk });
  });
}
