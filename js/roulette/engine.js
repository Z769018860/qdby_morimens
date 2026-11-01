// 弥萨格轮盘 · 规则引擎
//
// 恶魔轮盘（Buckshot Roulette）那一套：枪膛里混着实弹与空壳，双方轮流扣扳机，
// 对着自己开是空壳就保住回合，对着对手开完就交回合。道具在自家回合里随时用，不消耗行动。
//
// 这一层是纯函数式的「确定性状态机」：所有随机都从 s.r 这一个种子推进，
// 同样的动作按同样的顺序喂进来，两台机器的 s 就一模一样——好友房就是靠这条做同步的
// （房主发种子，双方重放同一串动作，谁也不传整份状态）。
//
// 另外两条硬规矩（构建产物里也是）：
//   · 不碰 DOM、不读 localStorage、不调 Math.random —— 换种子必须能完全复现；
//   · 动作一律走 shoot() / useItem()，别在外面直接改 s，不然同步立刻对不上。
import { CHARS } from './gen.js';
import { ITEMS, POOL } from './items.js';

// 每局：几实几空、双方各摸几件。越往后子弹越多，也就越赌。
// 三局两胜打前三局（3/3 → 4/4 → 5/5），五局三胜中间插两局 3/3、4/4 的「加赛」，
// 让一场长盘不是简单地「多打两局」——先手轮得更匀，道具也攒得更厚。
const BO3 = [
  { live: 3, blank: 3, items: 2 },
  { live: 4, blank: 4, items: 3 },
  { live: 5, blank: 5, items: 4 },
];
const BO5 = [
  { live: 3, blank: 3, items: 2 },
  { live: 3, blank: 3, items: 2 },
  { live: 4, blank: 4, items: 3 },
  { live: 4, blank: 4, items: 3 },
  { live: 5, blank: 5, items: 4 },
];
// 赛制：s.best=3 是三局两胜，5 是五局三胜。默认三局两胜（和旧存档、旧房间对得上）。
export const BEST_OF = [3, 5];
export function roundsFor(best) { return (Number(best) === 5 ? BO5 : BO3).slice(); }
export const ROUNDS = BO3;
// 道具槽上限。带满 5 件之后摸到的东西直接留在桌上（不进包）。
export const SLOT_MAX = 5;
// 三局两胜（默认赛制的胜场数）
export const WIN_NEED = 2;
export const needFor = (best) => Math.floor((Number(best) === 5 ? 5 : 3) / 2) + 1;

// ---------------------------------------------------------------- 种子随机
// mulberry32：一个 32 位整数就能复现整局，够用且比 LCG 均匀。
function rand(s) {
  s.r = (s.r + 0x6d2b79f5) | 0;
  let t = Math.imul(s.r ^ (s.r >>> 15), 1 | s.r);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function shuffle(s, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// ---------------------------------------------------------------- 小工具
export const nameOf = (s, side) => (CHARS[s.chars[side]] || { n: '？' }).n;
export const charOf = (s, side) => CHARS[s.chars[side]];
export const foe = (side) => 1 - side;
export const liveLeft = (s) => s.shells.reduce((n, x) => n + (x ? 1 : 0), 0);
export const blankLeft = (s) => s.shells.length - liveLeft(s);
export const canAct = (s, side) => s.phase === 'play' && s.turn === side;

function say(s, txt, cls) {
  s.log.push({ txt, cls: cls || '' });
  if (s.log.length > 40) s.log.shift();
}

// ---------------------------------------------------------------- 开局
export function create(seed, chars, opt) {
  const best = Number(opt && opt.best) === 5 ? 5 : 3;
  const s = {
    r: (seed >>> 0) || 1,
    chars: [chars[0], chars[1]],
    best, need: needFor(best), rounds: roundsFor(best),
    hp: [0, 0], max: [0, 0], shield: [0, 0],
    round: 0, wins: [0, 0], turn: 0,
    shells: [], know: [[], []],
    items: [[], []], uid: 1,
    saw: [0, 0], blood: [0, 0], cuff: [0, 0], mute: [0, 0],
    used: [{}, {}],        // 每局计数：echo 2 次、lifesteal 2 次
    rev: [false, false],   // 整场一次的「回环」是否已经用掉
    phase: 'play', winner: null,
    log: [],
  };
  startRound(s, 1);
  return s;
}

function startRound(s, n) {
  s.round = n;
  const cfg = s.rounds[n - 1];
  s.hp = s.chars.map((id) => CHARS[id].hp);
  s.max = s.hp.slice();
  s.shield = [0, 0];
  s.saw = [0, 0];
  s.blood = [0, 0];
  s.cuff = [0, 0];
  s.mute = [0, 0];
  s.items = [[], []];
  s.used = [{}, {}];
  s.roundOver = null;
  // 先手逐局轮换（第一局 0、第二局 1、第三局 0……）：奇数局不会有人连着先手两次。
  s.turn = (n - 1) % 2;

  for (const side of [0, 1]) {
    const ch = CHARS[s.chars[side]];
    const other = CHARS[s.chars[foe(side)]];
    let cnt = cfg.items;
    if (ch.passive.k === 'extra') cnt += 1;      // 朵尔：自己多拿一件
    if (other.passive.k === 'greed') cnt -= 1;   // 杜勒赛因：对手少拿一件
    cnt = Math.max(1, cnt);
    // 固定道具（专属 + 随身）先发，再摸通用池
    for (const id of ch.items) {
      if (s.items[side].length >= SLOT_MAX) break;
      s.items[side].push({ uid: s.uid++, id });
    }
    for (let i = 0; i < cnt; i++) drawItem(s, side);
  }

  // 开局被动：护盾
  for (const side of [0, 1]) {
    const pc = CHARS[s.chars[side]].passive;
    if (pc.k === 'armor') {
      const n = pc.v || 1;
      s.shield[side] += n;
      say(s, `${nameOf(s, side)} 的自律装甲展开：+${n} 护盾。`, 'good');
    }
  }

  reload(s);
  say(s, `第 ${n} 局：枪膛里 ${cfg.live} 发实弹、${cfg.blank} 发空壳。`, 'hd');

  // 开局被动：预知（放在装填之后，才知道是哪几颗）
  for (const side of [0, 1]) {
    const k = CHARS[s.chars[side]].passive.k;
    const pn = CHARS[s.chars[side]].passive.n || '预感';
    if (k === 'precog1' || k === 'aim') {
      reveal(s, side, 1);
      say(s, `${nameOf(s, side)} 的「${pn}」：看清了第一颗——${s.know[side][0] ? '实弹' : '空壳'}。`, 'good');
    } else if (k === 'precog2') {
      const n = CHARS[s.chars[side]].passive.v || 2;
      reveal(s, side, n);
      const seen = s.know[side].slice(0, n).map((x) => (x ? '实弹' : '空壳')).join('、');
      say(s, `${nameOf(s, side)} 的「${pn}」：前 ${n} 颗是${seen}。`, 'good');
    }
  }
  if (s.rev[0] || s.rev[1]) say(s, '（「回环」这一场已经用掉了，不会再有第二次。）', 'dim');
}

function reload(s) {
  const cfg = s.rounds[s.round - 1];
  const arr = [];
  for (let i = 0; i < cfg.live; i++) arr.push(true);
  for (let i = 0; i < cfg.blank; i++) arr.push(false);
  shuffle(s, arr);
  s.shells = arr;
  s.know = [arr.map(() => null), arr.map(() => null)];
}

function drawItem(s, side) {
  if (s.items[side].length >= SLOT_MAX) return null;
  const id = POOL[Math.floor(rand(s) * POOL.length)];
  const it = { uid: s.uid++, id };
  s.items[side].push(it);
  return it;
}

// 记录某侧看清了前 n 颗（n 超出剩余颗数就都看清）
function reveal(s, side, n) {
  const lim = Math.min(n, s.shells.length);
  for (let i = 0; i < lim; i++) s.know[side][i] = s.shells[i];
  return s.know[side].slice(0, lim);
}

function hurt(s, side, dmg) {
  const cut = Math.min(s.shield[side], dmg);
  s.shield[side] -= cut;
  const real = Math.max(0, dmg - cut);
  s.hp[side] = Math.max(0, s.hp[side] - real);
  return { real, cut };
}

// 交回合：被铐住的人自动跳过（一次镣铐抵一次行动）
function give(s, who, ev) {
  let next = who;
  for (let i = 0; i < 2; i++) {
    if ((s.cuff[next] || 0) > 0) {
      s.cuff[next] -= 1;
      ev.push({ t: 'cuffed', side: next });
      say(s, `${nameOf(s, next)} 被镣铐拖着，这一回合跳过。`, 'warn');
      next = foe(next);
    } else break;
  }
  s.turn = next;
}

// ---------------------------------------------------------------- 开枪
export function shoot(s, side, target) {
  if (s.phase !== 'play') return { ok: false, err: '这一局已经结束了' };
  if (s.turn !== side) return { ok: false, err: '还没轮到你' };
  if (target !== 'self' && target !== 'foe') return { ok: false, err: '目标不对' };
  if (!s.shells.length) reload(s);

  s.mute[side] = 0; // 这一枪把「这一回合」用掉了，压制到此为止
  const live = s.shells.shift();
  // 「算准了再打」：开枪前这一颗是不是自己亲手看清的（阿格里帕的演算就吃这一条）
  const knewLive = s.know[side][0] === true;
  s.know[0].shift();
  s.know[1].shift();
  const victim = target === 'self' ? side : foe(side);
  const ev = [{ t: 'shot', side, target, live }];
  const sawed = s.saw[side] || 0;
  const chained = !!s.blood[side];
  s.saw[side] = 0;
  s.blood[side] = 0;

  if (live) {
    const pc = CHARS[s.chars[side]].passive;
    // 阿格里帕「算准了再打」：每局最多 v 次，只认自己亲手看清的那一颗
    let aim = 0;
    if (pc.k === 'aim' && knewLive && (s.used[side].aim || 0) < (pc.v || 1)) {
      aim = 1;
      s.used[side].aim = (s.used[side].aim || 0) + 1;
    }
    let dmg = 1 + sawed + (chained ? 1 : 0) + aim;
    // 「韧性」：每局第一次被实弹打中，那一下少掉 1 点（至少 0）
    const vpc = CHARS[s.chars[victim]].passive;
    let grit = 0;
    if (vpc.k === 'grit' && !s.used[victim].grit) {
      s.used[victim].grit = 1;
      grit = 1;
      dmg = Math.max(0, dmg - 1);
    }
    const { real, cut } = hurt(s, victim, dmg);
    ev.push({ t: 'damage', side: victim, dmg: real, cut, hp: s.hp[victim], shield: s.shield[victim], grit: grit || 0 });
    say(s, target === 'self'
      ? `${nameOf(s, side)} 对着自己扣下扳机——实弹。${grit ? '被「' + vpc.n + '」卸掉 1 点，' : ''}${cut ? `护盾挡住 ${cut} 点，` : ''}理智 -${real}。`
      : `${nameOf(s, side)} 朝 ${nameOf(s, victim)} 开枪——实弹${aim ? '（算准了，+1）' : ''}。${grit ? '被「' + vpc.n + '」卸掉 1 点，' : ''}${cut ? `护盾挡住 ${cut} 点，` : ''}理智 -${real}。`,
    target === 'self' ? 'warn' : 'bad');

    // 「噤声」：打中对手之后，他下一回合抬不起手（用不了道具）
    if (victim !== side && real > 0 && pc.k === 'menace') {
      s.mute[victim] = 1;
      ev.push({ t: 'mute', side: victim });
      say(s, `${nameOf(s, side)} 的「${pc.n}」压住了 ${nameOf(s, victim)}：下一回合用不了道具。`, 'warn');
    }
    // 「幸灾乐祸」：对手自射吃实弹，你在旁边回 1 点
    if (target === 'self' && real > 0) {
      const opc = CHARS[s.chars[foe(side)]].passive;
      const other = foe(side);
      if (opc.k === 'siphon' && (s.used[other].siphon || 0) < (opc.v || 1)
        && s.hp[other] > 0 && s.hp[other] < s.max[other]) {
        s.used[other].siphon = (s.used[other].siphon || 0) + 1;
        s.hp[other] += 1;
        ev.push({ t: 'heal', side: other, n: 1 });
        say(s, `${nameOf(s, other)} 的「${opc.n}」：看着你流血，自己缓了 1 点。`, 'good');
      }
    }

    // 血链·希洛：打中对手回血
    const lifesteal = CHARS[s.chars[side]].passive;
    if (victim !== side && lifesteal.k === 'lifesteal'
      && (s.used[side].lifesteal || 0) < (lifesteal.v || 2) && s.hp[side] < s.max[side] && s.hp[side] > 0) {
      s.used[side].lifesteal = (s.used[side].lifesteal || 0) + 1;
      s.hp[side] += 1;
      ev.push({ t: 'heal', side, n: 1 });
      say(s, `${nameOf(s, side)} 的嗜血链抽了一口：理智 +1。`, 'good');
    }

    if (s.hp[victim] <= 0) {
      endRound(s, foe(victim), ev);
      return { ok: true, ev };
    }
    give(s, foe(side), ev);
    afterShot(s, ev);
    return { ok: true, ev };
  }

  // 空壳
  say(s, target === 'self'
    ? `${nameOf(s, side)} 对着自己扣下扳机——空壳，回合还留着。`
    : `${nameOf(s, side)} 朝 ${nameOf(s, victim)} 开枪——空壳，什么也没发生。`,
  target === 'self' ? 'good' : 'dim');
  if (target === 'self') {
    // 「她们」：自射空壳多摸一件
    const echo = CHARS[s.chars[side]].passive;
    if (echo.k === 'echo' && (s.used[side].echo || 0) < (echo.v || 2)) {
      const it = drawItem(s, side);
      if (it) {
        s.used[side].echo = (s.used[side].echo || 0) + 1;
        ev.push({ t: 'draw', side, id: it.id, auto: true });
        say(s, `${nameOf(s, side)} 的「她们」递来一件：${ITEMS[it.id].n}。`, 'good');
      }
    }
  } else {
    give(s, foe(side), ev);
  }
  afterShot(s, ev);
  return { ok: true, ev };
}

// 一枪打完的收尾：枪膛空了就重装填（同一局里总数不变，顺序重洗）
function afterShot(s, ev) {
  if (s.phase !== 'play') return;
  if (!s.shells.length) {
    reload(s);
    ev.push({ t: 'reload' });
    say(s, '枪膛空了，重新装填——还是那么多发实弹与空壳，顺序重洗。', 'hd');
  }
}

// ---------------------------------------------------------------- 道具
export function useItem(s, side, uid) {
  if (s.phase !== 'play') return { ok: false, err: '这一局已经结束了' };
  if (s.turn !== side) return { ok: false, err: '还没轮到你' };
  if (s.mute[side]) return { ok: false, err: `被「压」着，这一回合用不了道具——先开一枪吧` };
  const idx = s.items[side].findIndex((x) => x.uid === uid);
  if (idx < 0) return { ok: false, err: '你没有这件道具' };
  const it = s.items[side][idx];
  const def = ITEMS[it.id];
  if (!def) return { ok: false, err: '道具表里没有它' };

  // 用不了的场合：先说清楚，别白白吃掉道具
  if (def.k === 'cuff' && (s.cuff[foe(side)] || 0) > 0) return { ok: false, err: '对手已经被铐住了' };
  if (def.k === 'saw' && (s.saw[side] || 0) > 0) return { ok: false, err: '枪口上已经装着一把锯' };
  if (def.k === 'steal' && !s.items[foe(side)].length) return { ok: false, err: '对手身上没有道具' };
  if (def.k === 'draw' && s.items[side].length >= SLOT_MAX) return { ok: false, err: '道具已经拿满了' };
  if (def.k === 'blood' && s.hp[side] <= 1) return { ok: false, err: '理智只剩 1 点，割不动' };

  s.items[side].splice(idx, 1);
  const ev = [{ t: 'use', side, id: it.id, uid }];
  const me = nameOf(s, side);

  switch (def.k) {
    case 'peek': {
      const vals = reveal(s, side, def.v);
      ev.push({ t: 'peek', side, vals: vals.slice() });
      say(s, `${me} 举起${def.n}。`, 'hd');
      break;
    }
    case 'heal': {
      const before = s.hp[side];
      s.hp[side] = Math.min(s.max[side], s.hp[side] + def.v);
      ev.push({ t: 'heal', side, n: s.hp[side] - before });
      say(s, `${me} 用掉${def.n}：理智 +${s.hp[side] - before}。`, 'good');
      break;
    }
    case 'eject': {
      if (!s.shells.length) reload(s);
      const live = s.shells.shift();
      s.know[0].shift();
      s.know[1].shift();
      ev.push({ t: 'eject', side, live });
      say(s, `${me} 倾出一颗——${live ? '实弹' : '空壳'}，退膛了，没打出去。`, 'dim');
      if (!s.shells.length) { reload(s); ev.push({ t: 'reload' }); }
      break;
    }
    case 'saw': {
      const pc = CHARS[s.chars[side]].passive;
      let add = 1;
      // 尤乌哈希：每局前 v 把锯才是「锯齿」（+2），再往后就退回普通的 +1
      if (pc.k === 'serrate' && (s.used[side].sharp || 0) < (pc.v || 1)) {
        add = 2;
        s.used[side].sharp = (s.used[side].sharp || 0) + 1;
      }
      s.saw[side] = add;
      ev.push({ t: 'saw', side, add });
      say(s, `${me} 锯短了枪管：下一次击发 +${add} 伤害。`, 'warn');
      break;
    }
    case 'cuff': {
      s.cuff[foe(side)] = (s.cuff[foe(side)] || 0) + 1;
      ev.push({ t: 'cuff', side: foe(side) });
      say(s, `${me} 给 ${nameOf(s, foe(side))} 扣上镣铐：他下一次行动跳过。`, 'warn');
      break;
    }
    case 'pill': {
      const lucky = CHARS[s.chars[side]].passive.k === 'lucky';
      const good = lucky || rand(s) < 0.5;
      if (good) {
        const before = s.hp[side];
        s.hp[side] = Math.min(s.max[side], s.hp[side] + 2);
        ev.push({ t: 'heal', side, n: s.hp[side] - before });
        say(s, `${me} 咽下残念药剂——药效还在，理智 +${s.hp[side] - before}${lucky ? '（赌徒之运，必定成功）' : ''}。`, 'good');
      } else {
        const { real } = hurt(s, side, 1);
        ev.push({ t: 'damage', side, dmg: real, hp: s.hp[side], pill: true });
        say(s, `${me} 咽下残念药剂——过期了，理智 -${real}。`, 'bad');
        if (s.hp[side] <= 0) { endRound(s, foe(side), ev); return { ok: true, ev }; }
      }
      break;
    }
    case 'invert': {
      if (!s.shells.length) reload(s);
      s.shells[0] = !s.shells[0];
      if (s.know[side][0] !== null && s.know[side][0] !== undefined) s.know[side][0] = s.shells[0];
      ev.push({ t: 'invert', side, now: s.shells[0] });
      say(s, `${me} 拧动逆变器：这一颗现在是${s.shells[0] ? '实弹' : '空壳'}（只有他知道）。`, 'hd');
      break;
    }
    case 'steal': {
      const pool = s.items[foe(side)];
      const i = Math.floor(rand(s) * pool.length);
      const taken = pool.splice(i, 1)[0];
      s.items[side].push(taken);
      ev.push({ t: 'steal', side, from: foe(side), id: taken.id });
      say(s, `${me} 戴上窃取手套，从 ${nameOf(s, foe(side))} 身上摸走一件：${ITEMS[taken.id].n}。`, 'warn');
      break;
    }
    case 'shield': {
      s.shield[side] += def.v;
      ev.push({ t: 'shield', side, n: s.shield[side] });
      say(s, `${me} 展开护壁：护盾 ${s.shield[side]} 层。`, 'good');
      break;
    }
    case 'draw': {
      const got = drawItem(s, side);
      if (got) {
        ev.push({ t: 'draw', side, id: got.id });
        say(s, `${me} 摸到 ${ITEMS[got.id].n}。`, 'good');
      }
      break;
    }
    case 'stitch': {
      const before = s.hp[side];
      s.hp[side] = Math.min(s.max[side], s.hp[side] + 1);
      ev.push({ t: 'heal', side, n: s.hp[side] - before });
      const got = drawItem(s, side);
      if (got) ev.push({ t: 'draw', side, id: got.id });
      say(s, `${me} 用缝合针缝了缝：理智 +${s.hp[side] - before}${got ? `，顺手摸到 ${ITEMS[got.id].n}` : ''}。`, 'good');
      break;
    }
    case 'blood': {
      s.blood[side] = 1;
      s.hp[side] -= 1;
      ev.push({ t: 'damage', side, dmg: 1, hp: s.hp[side], self: true });
      say(s, `${me} 拉开血链：这一枪若命中对手 +1 伤害，自己先付 1 点理智。`, 'warn');
      break;
    }
    case 'reload': {
      reload(s);
      ev.push({ t: 'reload', seal: true });
      say(s, `${me} 按下寂灭王印：枪膛清空重装，顺序重洗。`, 'hd');
      break;
    }
    case 'loop': {
      let n = 0;
      for (let i = 0; i < 2; i++) if (drawItem(s, side)) n++;
      ev.push({ t: 'draw', side, n });
      say(s, `${me} 翻过沙漏，昨日的手又伸回口袋：摸到 ${n} 件道具，回合还在。`, 'warn');
      break;
    }
    case 'gamble': {
      if (rand(s) < 0.5) {
        let n = 0;
        for (let i = 0; i < 2; i++) if (drawItem(s, side)) n++;
        ev.push({ t: 'draw', side, n });
        say(s, `${me} 抛出筹码——赢了，摸到 ${n} 件道具。`, 'good');
      } else {
        const lost = s.items[side].length;
        s.items[side] = [];
        ev.push({ t: 'discard', side, n: lost });
        say(s, `${me} 抛出筹码——输了，手上 ${lost} 件道具全丢光。`, 'bad');
      }
      break;
    }
    default:
      break;
  }
  return { ok: true, ev };
}

// ---------------------------------------------------------------- 一局的收尾
function endRound(s, winner, ev) {
  const loser = foe(winner);
  // 环行·拉蒙娜的「回环」：整场一次，死不了
  if (CHARS[s.chars[loser]].passive.k === 'revive' && !s.rev[loser]) {
    s.rev[loser] = true;
    s.hp[loser] = 2;
    ev.push({ t: 'revive', side: loser });
    say(s, `${nameOf(s, loser)} 的回环合上了——昨日重来，理智回到 2 点，这一回合还归她。`, 'good');
    // 规则：复活者接着行动（被打倒又站起来的人，手里还有一次机会）
    give(s, loser, ev);
    return;
  }
  s.wins[winner] += 1;
  ev.push({ t: 'roundend', winner, wins: s.wins.slice(), loser });
  say(s, `第 ${s.round} 局结束：${nameOf(s, winner)} 拿下。比分 ${s.wins[0]} : ${s.wins[1]}。`, 'hd');
  if (s.wins[winner] >= s.need) {
    s.phase = 'over';
    s.winner = winner;
    ev.push({ t: 'over', winner });
    say(s, `${nameOf(s, winner)} 赢下了这一场。`, 'hd');
    return;
  }
  const n = s.round + 1;
  startRound(s, n);
  ev.push({ t: 'roundstart', round: n });
}

// 给界面用：桌面上的公开信息（谁都知道的部分）
export function view(s, side) {
  return {
    round: s.round, best: s.best, need: s.need, total: s.rounds.length,
    turn: s.turn,
    wins: s.wins.slice(),
    hp: s.hp.slice(), max: s.max.slice(), shield: s.shield.slice(),
    cuff: s.cuff.slice(), saw: s.saw.slice(), blood: s.blood.slice(), mute: s.mute.slice(),
    live: liveLeft(s), blank: blankLeft(s), shells: s.shells.length,
    know: (s.know[side] || []).slice(),
    myItems: s.items[side].slice(),
    foeItems: s.items[foe(side)].slice(),
    phase: s.phase, winner: s.winner,
    logLen: s.log.length,
  };
}
