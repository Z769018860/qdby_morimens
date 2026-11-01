// 弥萨格轮盘的对手（人机那一路用的）。
//
// 三条底线：只用自己做得到的信息（s.know[side]＋公开的实弹/空壳剩数），
// 不偷看 s.shells，也不改状态——它只回一个「下一步动作」，由 view 照着喂给引擎，
// 所以人机的每一步和玩家点出来的动作完全同构（好友房不需要这一层）。
//
// 另外：它提的动作必须过引擎的合法性（同一个回合不能用两把锯、对手被铐着不能再铐……）。
// 这一层用 legal() 兜住，免得界面弹出「这一下不行」——AI 不该有无效操作。
import { liveLeft, blankLeft, SLOT_MAX } from './engine.js';
import { ITEMS } from './items.js';

const LEVELS = {
  easy: { item: 0.45, smart: false, blunder: 0.24 },
  normal: { item: 0.85, smart: true, blunder: 0.08 },
  hard: { item: 1, smart: true, blunder: 0 },
};

export const DIFFS = [
  { k: 'easy', n: '看心情', d: '道具懒得用，常常凭直觉乱扣扳机。' },
  { k: 'normal', n: '按本分', d: '会数剩下的实弹，该用道具就用。' },
  { k: 'hard', n: '算到底', d: '每颗子弹都要算清得失，逆变器也会玩。' },
];

// 自己这一侧对「当前这颗」的判断：true 实弹 / false 空壳 / null 不知道。
// 不知道时也能从剩数反推：实弹打光了就是空壳，空壳打光了就是实弹。
function known(s, side) {
  const k = s.know[side] && s.know[side][0];
  if (k === true || k === false) return k;
  if (liveLeft(s) === 0) return false;
  if (blankLeft(s) === 0) return true;
  return null;
}

export function aiStep(s, side, lv = 'normal') {
  if (s.phase !== 'play' || s.turn !== side) return null;
  const cfg = LEVELS[lv] || LEVELS.normal;
  const you = 1 - side;
  const mine = s.items[side] || [];
  const has = (id) => mine.find((x) => x.id === id);
  const myHP = s.hp[side];
  const myMax = s.max[side];
  const foeHP = s.hp[you];
  const k = known(s, side);
  const roll = (p) => Math.random() < p;
  // 道具用不用：easy 有一半时候懒得翻口袋，hard 全用
  const want = () => cfg.item >= 1 || roll(cfg.item);

  // 引擎那一侧的合法性，先过一遍
  const legal = (x) => {
    if (!x) return null;
    const kind = ITEMS[x.id] ? ITEMS[x.id].k : '';
    if (kind === 'cuff' && (s.cuff[you] || 0) > 0) return null;
    if (kind === 'saw' && (s.saw[side] || 0) > 0) return null;
    if (kind === 'steal' && !(s.items[you] || []).length) return null;
    if (kind === 'draw' && mine.length >= SLOT_MAX) return null;
    if (kind === 'blood' && myHP <= 1) return null;
    return { t: 'item', uid: x.uid };
  };
  // 按顺序挑第一件「有、且能用的」
  const act = (...ids) => {
    for (const id of ids) {
      const a = legal(has(id));
      if (a) return a;
    }
    return null;
  };

  // 血量见底时先保命，这一条不看难度
  if (myHP <= 2 && k !== false) {
    const a = act('smoke', 'pill');
    if (a) return a;
  }
  // 白拿的信息牌：剩得多就整膛看一眼，剩一两颗就用窥镜
  if (k === null) {
    const a = s.shells.length > 3 ? act('oracle', 'scroll', 'lens') : act('lens', 'scroll', 'oracle');
    if (a && want()) return a;
  }
  if (myHP < myMax) {
    const a = act('needle');
    if (a && want()) return a;
  }
  {
    const a = act('whisper');
    if (a && want()) return a;
  }
  // 回环沙漏：白摸两件，没有代价
  {
    const a = act('hourglass');
    if (a && want()) return a;
  }
  // 手上一件都不到就敢抛筹码（输了也没什么可输的）
  if (mine.length <= 1) {
    const a = act('coin');
    if (a && want()) return a;
  }
  {
    const a = act('glove');
    if (a && (cfg.smart || want())) return a;
  }

  if (k === true) {
    // 一击必杀：直接开枪，别磨
    if (foeHP <= 1 + s.shield[you] && (s.saw[side] || 0) === 0) return { t: 'shoot', target: 'foe' };
    // 逆变器：把已知的实弹翻成空壳，然后打自己——白赚一颗实弹、保住回合
    if (cfg.smart && (liveLeft(s) > 1 || blankLeft(s) > 0) && roll(0.85)) {
      const a = act('invert');
      if (a) return a;
    }
    {
      const a = act('saw');
      if (a && want()) return a;
    }
    {
      const a = act('blood');
      if (a && want()) return a;
    }
    {
      const a = act('cuff');
      if (a && foeHP > 1 && want()) return a;
    }
    {
      const a = act('shield');
      if (a && want()) return a;
    }
    return { t: 'shoot', target: 'foe' };
  }

  if (k === false) {
    // 空壳对自己开：不扣血还保住回合，稳赚。护盾这种白拿的先用掉
    const a = act('shield');
    if (a && want()) return a;
    return { t: 'shoot', target: 'self' };
  }

  // 完全不知道：按剩下的比例赌
  const n = s.shells.length || 1;
  const pLive = liveLeft(s) / n;
  if (cfg.smart && pLive > 0.8 && roll(0.4)) {
    const a = act('seal');
    if (a) return a;
  }
  if (pLive >= 0.5 && foeHP > 1) {
    const a = act('cuff');
    if (a && want()) return a;
  }
  if (pLive >= 0.62 && foeHP > 1) {
    const a = act('saw');
    if (a && want()) return a;
  }
  if (pLive >= 0.62) {
    const a = act('shield');
    if (a && want()) return a;
  }

  // 偶尔犯错：明知道该往哪打，也可能手滑
  if (roll(cfg.blunder)) {
    const pool = mine.map((x) => legal(x)).filter(Boolean);
    if (pool.length && roll(0.5)) return pool[Math.floor(Math.random() * pool.length)];
    return { t: 'shoot', target: pLive >= 0.5 ? 'self' : 'foe' };
  }
  return { t: 'shoot', target: pLive >= 0.5 ? 'foe' : 'self' };
}
