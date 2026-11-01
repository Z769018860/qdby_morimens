// 电子斗蛐蛐 · 战斗引擎（纯逻辑，不碰 DOM / 不进 localStorage）
//
// 这里只做一件事：把两只队伍按《忘却前夜》原作的**意图表**自动打完。
// 数值一律来自 data/bugfight-mobs.json（也就是客户端 game-data.json 的倍率），
// 本文件只负责换算与结算，不额外发明机制：
//
//   血量 = hp 倍率 × BASE_HP × 阶级系数 × 势级
//   攻击 = atk 倍率 × BASE_ATK × 势级
//   技能伤害 = 攻击 × 技能倍率（a 参数），多段则逐段结算
//   护盾   = 攻击 × 技能倍率（d 参数）
//   力量   = 攻击 × 技能倍率（a 参数）层，每层 +1 点伤害（原作 strength 语义）
//   虚弱   = 造成的伤害 -25%，每回合结束 -1 层
//   易伤   = 受到的伤害 +50%，每回合结束 -1 层
//   脆弱   = 同易伤（原作 fragile 与 vulnerable 在怪物技能里混用）
//   出血   = 回合结束时受到等同层数的纯粹伤害，随即清空
//   中毒   = 回合结束时受到等同层数的伤害，不清空
//   屏障   = 受到一次伤害免疫并 -1 层
//
// 随机只有一处：同血量平局的加赛判定用 s.r（mulberry32）。其余全确定。

export const BASE_HP = 900;
export const BASE_ATK = 125;

// 阶级系数：原作 hp/atk 是「同档位内的相对倍率」，跨档位要靠这一层放大，
// 否则首领和杂兵都是 1.0 倍，打起来一样硬。首领 2.3 是让它在 1v1 里大约
// 顶两个半杂兵——实测出来的手感值，不是原作字段。
export const RANK = {
  Normal: { n: '普通', hp: 1, atk: 1 },
  Elite: { n: '精英', hp: 1.55, atk: 1.06 },
  Boss: { n: '首领', hp: 2.3, atk: 1.12 },
};

// 势级：整队的身价档，等比放大血与攻。原作怪物没有等级字段（走的是关卡威胁），
// 斗蛐蛐要一个「这局敢下多少注」的旋钮，就放在这里，页面上如实标成换算项。
export const LV = [
  { n: '势一', hp: 0.8, atk: 0.9, tag: '杂兵局' },
  { n: '势二', hp: 1, atk: 1, tag: '常局' },
  { n: '势三', hp: 1.25, atk: 1.12, tag: '硬局' },
  { n: '势四', hp: 1.6, atk: 1.25, tag: '凶局' },
];

export const MAX_TURN = 20;      // 超过就按残血判，避免治疗/召唤流拖成无限
export const MAX_UNITS = 4;      // 一方场上最多几只（含召唤物）
export const SUMMON_HP = 0.55;   // 召唤物血量比例
export const SUMMON_ATK = 0.7;   // 召唤物攻击比例，且不再召唤

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INT = Math.round;

/** 怪物 → 面板。lv 是势级下标（0~3）。 */
export function makeUnit(mob, lv, side, slot) {
  const r = RANK[mob.rank] || RANK.Normal;
  const L = LV[lv] || LV[1];
  const maxHp = Math.max(60, INT(mob.hp * BASE_HP * r.hp * L.hp));
  return {
    uid: side + ':' + slot + ':' + mob.id,
    sid: mob.id, n: mob.n, rank: mob.rank, size: mob.size, desc: mob.desc || '',
    ix: mob.ix, lv,
    side, slot,
    maxHp, hp: maxHp,
    atk: Math.max(4, Math.round(mob.atk * BASE_ATK * r.atk * L.atk * 10) / 10),
    str: 0, shield: 0, weak: 0, vuln: 0, bleed: 0, poison: 0, barrier: 0,
    op: mob.op || [], cy: mob.cy || [],
    acted: 0, alive: true, summoned: false, dmgDone: 0, healDone: 0,
  };
}

/** 当前这一下要放的技能 id：开局按 op 走，走完循环 cy。 */
export function intentOf(u) {
  const op = u.op, cy = u.cy;
  if (!op.length && !cy.length) return null;
  if (u.acted < op.length) return op[u.acted];
  if (!cy.length) return op[u.acted % op.length];
  return cy[(u.acted - op.length) % cy.length];
}

/** 模板里的 {1}{2}{3} 换成这一只怪的实际数字，给界面直接用。 */
export function skillText(sk, u) {
  if (!sk) return '';
  const args = sk.a || [];
  return String(sk.t || '').replace(/\{(\d)\}/g, (m, i) => {
    const a = args[Number(i) - 1];
    if (!a) return '?';
    const [k, v] = a;
    if (v == null) return '?';
    if (k === 'a') return String(Math.round(u.atk * v));
    if (k === 'd') return String(Math.round(u.atk * v));
    if (k === 'n') return String(Math.round(v));
    return String(Math.round(v));
  });
}

function alive(side) {
  return side.units.filter((u) => u.alive);
}

function totalHpFrac(team) {
  let hp = 0, max = 0;
  for (const u of team.units) { hp += Math.max(0, u.hp); max += u.maxHp; }
  return max ? hp / max : 0;
}

/**
 * 开一局。left / right = [{ mob, lv }, …]（mob 是 data.mobs 里的对象）。
 * 队伍顺序就是场上顺序：第一个是前排，单体技能打它。
 */
export function newBattle(left, right, seed, data) {
  const s = {
    r: mulberry32(seed >>> 0),
    seed: seed >>> 0,
    turn: 1,
    phase: 'act',
    teams: [
      { side: 0, units: left.map((x, i) => makeUnit(x.mob, x.lv, 0, i)) },
      { side: 1, units: right.map((x, i) => makeUnit(x.mob, x.lv, 1, i)) },
    ],
    log: [],
    over: false,
    winner: null,         // 0 / 1 / 'draw'
    reason: '',
    seq: 0,
    data,
  };
  // 先手：按种子随机，免得「左边总是先动」变成系统性优势（实测 52.1% → 51% 以内）
  s.first = (seed >>> 1) % 2;
  s.order = [];
  for (let i = 0; i < Math.max(s.teams[0].units.length, s.teams[1].units.length); i++) {
    for (const side of [s.first, 1 - s.first]) {
      const u = s.teams[side].units[i];
      if (u) s.order.push(u.uid);
    }
  }
  s.cursor = 0;
  pushLog(s, { k: 'start', t: '两边的闩已经放下。' });
  return s;
}

function pushLog(s, e) {
  e.seq = ++s.seq;
  e.turn = s.turn;
  s.log.push(e);
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
  return e;
}

/** 受一次伤害：先屏障、再护盾、最后血。返回 {blocked, hp} */
function takeDamage(t, dmg, src) {
  const out = { dealt: 0, blocked: 0, hp: 0 };
  if (dmg <= 0) return out;
  if (t.barrier > 0) {
    t.barrier -= 1;
    out.blocked = dmg;
    return out;
  }
  let rest = dmg;
  if (t.shield > 0) {
    const use = Math.min(t.shield, rest);
    t.shield -= use;
    rest -= use;
    out.blocked = use;
  }
  if (rest > 0) {
    t.hp -= rest;
    out.hp = rest;
    if (t.hp <= 0) { t.hp = 0; t.alive = false; }
  }
  out.dealt = dmg - out.blocked;
  return out;
}

function healUnit(t, n) {
  if (!t.alive) return 0;
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + n);
  return t.hp - before;
}

/** 单体技能打谁：对方第一个还站着的。 */
function frontOf(team) {
  return team.units.find((u) => u.alive) || null;
}

/** 找一只同名怪来当召唤物；池里没有就用最低级的普通怪顶替。 */
function findMob(data, name) {
  const pool = data.mobs;
  return pool.find((m) => m.n === name) || pool.find((m) => m.n && m.n.includes(name)) || null;
}

function summon(s, u, name) {
  const team = s.teams[u.side];
  if (team.units.filter((x) => x.alive).length >= MAX_UNITS) {
    pushLog(s, { k: 'info', by: u.uid, t: `${u.n} 想召「${name}」，场子已经挤满 ${MAX_UNITS} 只。` });
    return;
  }
  const mob = findMob(s.data, name);
  if (!mob) {
    pushLog(s, { k: 'info', by: u.uid, t: `「${name}」不在名录上，这一下召了个空。` });
    return;
  }
  const nu = makeUnit(mob, u.lv, u.side, team.units.length);
  nu.maxHp = Math.max(40, INT(nu.maxHp * SUMMON_HP));
  nu.hp = nu.maxHp;
  nu.atk = Math.round(nu.atk * SUMMON_ATK * 10) / 10;
  nu.summoned = true;              // 召唤物本身不会再召唤，其余照打
  team.units.push(nu);
  pushLog(s, { k: 'summon', by: u.uid, to: nu.uid, t: `${u.n} 把「${nu.n}」叫了上来（${nu.maxHp} 血）。` });
}

/** 放一个技能。返回 false 表示这一下什么都没发生（界面可以跳快一点）。 */
function castSkill(s, u, sid) {
  const sk = s.data.skills[sid];
  if (!sk) {
    pushLog(s, { k: 'info', by: u.uid, t: `${u.n} 停了一拍。` });
    return false;
  }
  const foe = s.teams[1 - u.side];
  const mine = s.teams[u.side];
  const text = skillText(sk, u);
  pushLog(s, { k: 'cast', by: u.uid, sk: sid, nm: sk.n, it: sk.i, t: text });

  let did = false;
  let bleedCarry = 0;

  for (const f of sk.fx) {
    switch (f.k) {
      case 'hit': {
        let base = u.atk * f.m;
        const times = Math.max(1, f.t | 0);
        let target = frontOf(foe);
        for (let i = 0; i < times; i++) {
          if (!target) break;
          let dmg = base + u.str;
          if (u.weak > 0) dmg *= 0.75;
          if (target.vuln > 0) dmg *= 1.5;
          dmg = Math.max(1, INT(dmg));
          const res = takeDamage(target, dmg, u);
          u.dmgDone += res.dealt;
          did = true;
          if (f.k === 'hit') bleedCarry += res.hp;    // 只有真进到血里的部分出血
          pushLog(s, {
            k: 'hit', by: u.uid, to: target.uid, dmg: res.dealt, blocked: res.blocked,
            hp: target.hp, dead: !target.alive,
            t: res.blocked > 0
              ? `${u.n} 打「${target.n}」${res.dealt}（护盾吃掉 ${res.blocked}）`
              : `${u.n} 打「${target.n}」${res.dealt}`,
          });
          if (!target.alive) {
            pushLog(s, { k: 'down', to: target.uid, t: `「${target.n}」倒了。` });
            target = frontOf(foe);
          }
        }
        break;
      }
      case 'shield': {
        const n = INT(u.atk * f.m);
        u.shield += n;
        did = true;
        pushLog(s, { k: 'buff', by: u.uid, t: `${u.n} 撑起 ${n} 点护盾` });
        break;
      }
      case 'str': {
        const n = Math.max(1, INT(u.atk * f.v));
        u.str += n;
        did = true;
        pushLog(s, { k: 'buff', by: u.uid, t: `${u.n} 力量 +${n}（每层伤害 +1）` });
        break;
      }
      case 'weak': {
        const t = frontOf(foe);
        if (t) { t.weak += Math.max(1, INT(f.t)); did = true; pushLog(s, { k: 'debuff', to: t.uid, t: `「${t.n}」虚弱 ${INT(f.t)}` }); }
        break;
      }
      case 'vuln': {
        const t = frontOf(foe);
        if (t) { t.vuln += Math.max(1, INT(f.t)); did = true; pushLog(s, { k: 'debuff', to: t.uid, t: `「${t.n}」易伤 ${INT(f.t)}` }); }
        break;
      }
      case 'bleed': {
        const t = frontOf(foe);
        const n = f.eq ? bleedCarry : Math.max(1, INT(f.v || 0));
        if (t && n > 0) {
          t.bleed += n;
          did = true;
          pushLog(s, { k: 'debuff', to: t.uid, t: `「${t.n}」出血 ${n} 层` });
        }
        break;
      }
      case 'poison': {
        const t = frontOf(foe);
        if (t && f.v) { t.poison += Math.max(1, INT(f.v)); did = true; pushLog(s, { k: 'debuff', to: t.uid, t: `「${t.n}」中毒 ${INT(f.v)}` }); }
        break;
      }
      case 'barrier': {
        u.barrier += Math.max(1, INT(f.v));
        did = true;
        pushLog(s, { k: 'buff', by: u.uid, t: `${u.n} 屏障 ${INT(f.v)} 层` });
        break;
      }
      case 'heal': {
        const n = INT(u.atk * f.v);
        const got = healUnit(u, n);
        u.healDone += got;
        did = did || got > 0;
        pushLog(s, { k: 'heal', by: u.uid, n: got, t: `${u.n} 回了 ${got} 点` });
        break;
      }
      case 'selfhurt': {
        const n = INT(u.atk * f.v);
        takeDamage(u, n, u);
        pushLog(s, { k: 'hit', by: u.uid, to: u.uid, dmg: n, hp: u.hp, t: `${u.n} 自伤 ${n}` });
        break;
      }
      case 'summon': {
        if (!u.summoned) { summon(s, u, f.n); did = true; }
        break;
      }
      case 'special':
      default: {
        // 原作里靠牌库/位置才成立的技能（抽牌、洗入、封印…），斗蛐蛐没有对位，
        // 退化成「按意图给一口最小的效果」，不让它空放。
        const g = intentFallback(s, u, sk.i);
        did = did || g;
        break;
      }
    }
  }
  // 整条技能一个效果都没成立（纯文字），也给一口最低限度的动静
  if (!did) intentFallback(s, u, sk.i);
  return did;
}

/** 意图兜底：抽牌/封印/位移这类在斗蛐蛐里没法实现时，按意图码给最小效果。 */
function intentFallback(s, u, code) {
  const foe = s.teams[1 - u.side];
  const t = frontOf(foe);
  switch (code) {
    case '001': case '002': case '009': case '010': {
      if (!t) return false;
      const dmg = Math.max(1, INT(u.atk * (code === '002' ? 0.9 : 0.5)));
      const res = takeDamage(t, dmg, u);
      u.dmgDone += res.dealt;
      pushLog(s, { k: 'hit', by: u.uid, to: t.uid, dmg: res.dealt, hp: t.hp, dead: !t.alive,
        t: `${u.n} 顺手补了「${t.n}」一下（${res.dealt}）` });
      if (!t.alive) pushLog(s, { k: 'down', to: t.uid, t: `「${t.n}」倒了。` });
      return true;
    }
    case '003': case '004': case '012': {
      if (!t) return false;
      t.weak += 1;
      pushLog(s, { k: 'debuff', to: t.uid, t: `「${t.n}」虚弱 1` });
      return true;
    }
    case '005': case '006': case '011': {
      const n = Math.max(1, INT(u.atk * 0.08));
      u.str += n;
      pushLog(s, { k: 'buff', by: u.uid, t: `${u.n} 力量 +${n}` });
      return true;
    }
    case '007': case '008': {
      const n = INT(u.atk * 0.6);
      u.shield += n;
      pushLog(s, { k: 'buff', by: u.uid, t: `${u.n} 撑起 ${n} 点护盾` });
      return true;
    }
    default:
      pushLog(s, { k: 'info', by: u.uid, t: `${u.n} 在做一件这里做不了的事。` });
      return false;
  }
}

/** 回合末：毒 / 出血 / 虚弱易伤递减。 */
function endOfTurn(s) {
  for (const team of s.teams) {
    for (const u of team.units) {
      if (!u.alive) continue;
      if (u.poison > 0) {
        const res = takeDamage(u, INT(u.poison), null);
        pushLog(s, { k: 'dot', to: u.uid, dmg: res.dealt, hp: u.hp, dead: !u.alive, t: `「${u.n}」中毒发了 ${res.dealt}` });
        if (!u.alive) pushLog(s, { k: 'down', to: u.uid, t: `「${u.n}」倒了。` });
      }
      if (u.alive && u.bleed > 0) {
        const n = INT(u.bleed);
        const res = takeDamage(u, n, null);
        u.bleed = 0;
        pushLog(s, { k: 'dot', to: u.uid, dmg: res.dealt, hp: u.hp, dead: !u.alive, t: `「${u.n}」出血流了 ${res.dealt}` });
        if (!u.alive) pushLog(s, { k: 'down', to: u.uid, t: `「${u.n}」倒了。` });
      }
      if (u.weak > 0) u.weak -= 1;
      if (u.vuln > 0) u.vuln -= 1;
    }
  }
}

function finish(s, winner, reason) {
  s.over = true;
  s.winner = winner;
  s.reason = reason;
  const nm = winner === 'draw' ? '打平' : (winner === 0 ? '左边赢了' : '右边赢了');
  pushLog(s, { k: 'end', w: winner, t: `${nm}。${reason}` });
}

/** 一方全灭？ */
function checkEnd(s) {
  const a = alive(s.teams[0]).length;
  const b = alive(s.teams[1]).length;
  if (a > 0 && b > 0) return false;
  if (a === 0 && b === 0) { finish(s, 'draw', '最后两只一起倒下。'); return true; }
  finish(s, a > 0 ? 0 : 1, a > 0 ? '右边清空了。' : '左边清空了。');
  return true;
}

/**
 * 推进一步（一个单位行动一次）。界面按这个节奏播放。
 * 返回事件数组（这一帧新增的日志），没得打了返回 []。
 */
export function step(s) {
  if (s.over) return [];
  const start = s.log.length;
  let guard = 0;

  while (!s.over && guard++ < 40) {
    // 找下一个还没在这回合行动的单位：左 0 号 → 右 0 号 → 左 1 号 → …
    const order = [];
    const maxLen = Math.max(s.teams[0].units.length, s.teams[1].units.length);
    for (let i = 0; i < maxLen; i++) {
      for (const side of [s.first, 1 - s.first]) {
        const u = s.teams[side].units[i];
        if (u) order.push(u);
      }
    }
    let picked = null;
    // 用游标走一遍本回合的出场顺序：每个单位每回合动一次
    while (s.cursor < s.order.length) {
      const uid = s.order[s.cursor++];
      const u = order.find((x) => x.uid === uid);
      if (u && u.alive) { picked = u; break; }
    }
    if (!picked) {
      // 一轮走完 → 回合末结算
      endOfTurn(s);
      if (checkEnd(s)) break;
      if (s.turn >= MAX_TURN) {
        const fa = totalHpFrac(s.teams[0]);
        const fb = totalHpFrac(s.teams[1]);
        if (Math.abs(fa - fb) < 0.02) {
          finish(s, s.r() < 0.5 ? 0 : 1, `打满 ${MAX_TURN} 回合，血线几乎一样，按残血抖了一次。`);
        } else {
          finish(s, fa > fb ? 0 : 1, `打满 ${MAX_TURN} 回合，按剩余血量判（${INT(fa * 100)}% 对 ${INT(fb * 100)}%）。`);
        }
        break;
      }
      s.turn += 1;
      s.cursor = 0;
      s.order = [];
      // 新回合重新排一遍（召唤物可能刚进场）
      const ord2 = [];
      const mx = Math.max(s.teams[0].units.length, s.teams[1].units.length);
      for (let i = 0; i < mx; i++) for (const side of [s.first, 1 - s.first]) {
        const u = s.teams[side].units[i];
        if (u) ord2.push(u.uid);
      }
      s.order = ord2;
      pushLog(s, { k: 'turn', t: `第 ${s.turn} 回合` });
      continue;
    }
    const sid = intentOf(picked);
    picked.acted += 1;
    if (sid) castSkill(s, picked, sid);
    if (checkEnd(s)) break;
    break;  // 一次 step 只推一个单位，播放才有节奏
  }

  return s.log.slice(start);
}

/** 一口气跑完（模拟脚本用）。 */
export function run(s) {
  let guard = 0;
  while (!s.over && guard++ < 400) step(s);
  return s;
}

/** 给界面用的一帧摘要：谁的意图、下一手是什么。 */
export function intentBadge(data, u) {
  if (!u || !u.alive) return null;
  const sid = intentOf(u);
  const sk = sid && data.skills[sid];
  if (!sk) return null;
  const code = sk.i;
  return {
    code,
    n: (data.intent && data.intent[code]) || '特殊行动',
    sk: sk.n || '',
  };
}
