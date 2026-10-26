import { hash, mulberry32 } from './rng.js';
import { fx } from './skills.js';

export const CHAPTERS = ['序章·雾港', '蚀刻回廊', '沉没钟楼', '猩红温室', '回响墓园', '潮汐监牢', '倒悬教堂', '无光之海', '镜面都市', '终末列车'];
export const stageInfo = (stage) => {
  const chapter = Math.floor((stage - 1) / 10) + 1;
  const node = ((stage - 1) % 10) + 1;
  return { stage, chapter, node, boss: node === 10, elite: node === 5, name: CHAPTERS[(chapter - 1) % CHAPTERS.length] + (chapter > CHAPTERS.length ? `·${Math.floor((chapter - 1) / CHAPTERS.length) + 1}周` : '') };
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

export function buildEnemies(stage, monsters) {
  const info = stageInfo(stage);
  const rng = mulberry32(hash(`stage${stage}`));
  const pool = { Normal: monsters.filter((m) => m.rank === 'Normal'), Elite: monsters.filter((m) => m.rank === 'Elite'), Boss: monsters.filter((m) => m.rank === 'Boss') };
  const comp = info.boss ? ['Boss', 'Normal', 'Normal'] : info.elite ? ['Elite', 'Normal'] : Array(2 + (info.node >= 3 ? 1 : 0) + (info.node >= 8 ? 0 : 0)).fill('Normal');
  if (info.node === 9) comp.push('Normal');
  const S = enemyScale(stage);
  return comp.map((rank, i) => {
    const m = pool[rank][Math.floor(rng() * pool[rank].length)];
    const hpM = { Normal: 1, Elite: 2.4, Boss: 5.5 }[rank];
    const atkM = { Normal: 1, Elite: 1.15, Boss: 1.3 }[rank];
    const def = {
      name: m.zh, img: m.img, type: 'ASSAULT', realm: null, boss: rank === 'Boss', rank,
      hp: Math.round(220 * S * hpM), atk: Math.round(34 * S * atkM), def: Math.round(28 + 5 * stage),
      pattern: P[rank], critRate: 0, critDmg: 50,
    };
    if (stage >= 6 && rank !== 'Boss' && rng() < 0.4) {
      const a = AFFIX_KEYS[Math.floor(rng() * AFFIX_KEYS.length)];
      def.affix = a; def.name = AFFIX[a] + def.name;
      if (a === 'fury') def.atk = Math.round(def.atk * 1.25);
      if (a === 'shell') { def.hp = Math.round(def.hp * 1.4); def.def = Math.round(def.def * 1.3); }
      if (a === 'bleeder') def.pattern = def.pattern.map((p, j) => (j === 0 ? { ...p, effects: [...p.effects, fx.dot(0.3, 3)] } : p));
    }
    return def;
  });
}
