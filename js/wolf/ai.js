// 弥萨格狼人杀：AI 的脑子
//
// 这里只做三件事：
//   1. 算「我现在怀疑谁」——只读公开账本（谁自称什么、谁指控过谁、谁被票出去时是什么身份）
//   2. 决定「这一轮我说什么」
//   3. 决定「我投谁」「夜里我要动谁」
//
// 每个 AI 的偏见来自 hash01(种子, 我的 id, 对方 id, 第几天)：同一局里前后一致，
// 换一局就换一套，所以复玩不会每次都撞见同一批人抱同一团。

import { ROLES, TONES, WOLF_SIDE } from './data.js';
import { alive, byId, hash01, weighted } from './util.js';

// ---------------------------------------------------------------- 敌我
export function isAlly(ai, p) {
  if (!p || p.id === ai.id) return false;
  const aw = WOLF_SIDE.has(ai.role);
  const pw = WOLF_SIDE.has(p.role);
  if (aw && pw) return true;
  if (ai.role === 'twin' && p.role === 'twin') return true;
  return false;
}

export const isWolfRole = (r) => WOLF_SIDE.has(r);

const POWER = new Set(['seer', 'watch', 'coroner', 'lamp']);

// 这个人的「话」现在值多少分量：独一份的能力者声明最值钱，撞车了就一文不值
export function claimCred(G, pid) {
  const r = G.claims[pid];
  if (!r) return 0.25;
  const rivals = Object.keys(G.claims)
    .filter((k) => +k !== pid && G.claims[k] === r && byId(G, +k) && byId(G, +k).alive).length;
  if (r === 'eroded' || r === 'lurker') return 0.05;
  if (r === 'mole' || r === 'forgotten') return 0.15;
  if (r === 'crew' || r === 'twin') return 0.55;
  if (rivals === 0 && POWER.has(r)) return 1;
  return Math.max(0.2, 0.8 - rivals * 0.35);
}

// 出局时翻开的身份（夜里死的人不翻）
export function revealedRole(G, pid) {
  const p = byId(G, pid);
  return p && p.revealed ? p.role : null;
}

function revealedWolf(G, pid) {
  const r = revealedRole(G, pid);
  return r ? WOLF_SIDE.has(r) : null;
}

// ---------------------------------------------------------------- 怀疑值
export function suspicionOf(G, ai, tid) {
  const t = byId(G, tid);
  if (!t || !t.alive || tid === ai.id) return -999;
  if (isAlly(ai, t)) return -999;
  if (ai.role === 'twin' && t.role === 'twin') return -999;

  const wit = G.diff.ai.wit;
  const noise = hash01(G.seed, ai.id, tid, G.day * 13 + G.round + 1);
  // 基础怀疑：笨的人工智能疑心重又乱，聪明的更信证据
  let s = 16 + noise * 9 + (1 - wit) * 12;

  // 1) 身份撞车：两个人认领同一个唯一身份，必有一个在撒谎
  const tc = G.claims[tid];
  // 有人当众说「我是融蚀体」——那不是伪装，那是自爆
  if (tc === 'eroded' || tc === 'lurker') s += 180;
  else if (tc === 'mole' || tc === 'forgotten') s += 55;
  if (tc && tc !== 'crew' && tc !== 'twin') {
    const rivals = alive(G).filter((p) => p.id !== tid && G.claims[p.id] === tc).length;
    if (rivals) s += 38 + 9 * rivals;
    else if (POWER.has(tc)) s -= 12;      // 独一份的能力者声明，先信一半
  }
  // 自称能力者却从没给过任何信息，越到后面越可疑
  if (tc && POWER.has(tc) && tc !== 'lamp') {
    const gave = G.reports.some((r) => r.by === tid);
    if (!gave && G.day >= 2) s += 8;
  }

  // 2) 有人公布查验结果
  for (const r of G.reports) {
    if (r.to !== tid) continue;
    const cred = claimCred(G, r.by);
    if (r.res === 'eroded') s += 44 * cred + 6;
    else if (r.res === 'void') s += 24;   // 不是融蚀体，但也不是人
    else s -= 20 * cred;
  }

  // 3) 谁指控过他。只算前三个：第一个开口的人才是真正在推，后面的只是跟风。
  const accs = G.acc.filter((a) => a.to === tid);
  for (const a of accs.slice(0, 3)) s += 5 * claimCred(G, a.by) + 1.5;
  // 同一天里到处咬人的，反而更可疑
  const bites = new Set(G.acc.filter((a) => a.by === tid && a.day === G.day).map((a) => a.to));
  if (bites.size >= 3) s += 9;
  // 自己给自己辩白，说得好的那种，能减一点怀疑
  if (G.def.some((d) => d.by === tid && d.to === tid)) s -= 8;

  // 3.5) 翻牌之后反查谎报：把好人说成融蚀的、替融蚀体担保的，都是狼
  for (const r of G.reports) {
    if (r.by !== tid) continue;
    const actual = revealedRole(G, r.to);
    if (!actual) continue;
    const realWolf = actual === 'eroded' || actual === 'lurker';
    if (r.res === 'eroded' && !realWolf) s += 52;
    if (r.res === 'clean' && realWolf) s += 52;
    if (r.res === 'eroded' && realWolf) s -= 40;
  }

  // 4) 他自己的历史行为
  for (const d of G.def) {
    if (d.by === tid && revealedWolf(G, d.to) === true) s += 26;
    if (d.by === tid && revealedWolf(G, d.to) === false) s -= 9;
  }
  for (const a of G.acc) {
    if (a.by === tid && revealedWolf(G, a.to) === true) s -= 12;
    if (a.by === tid && revealedWolf(G, a.to) === false) s += 9;
  }
  for (const v of G.voteHist) {
    if (v.by !== tid) continue;
    if (revealedWolf(G, v.to) === true) s -= 8;
    if (revealedWolf(G, v.to) === false) s += 7;
  }

  // 5) 狼的私心：把自称能力者的清醒方推上去
  if (WOLF_SIDE.has(ai.role) && tc && POWER.has(tc)) s += 16 + 10 * wit;

  // 6) 完全不说话的人，后期很可疑
  if (G.day >= 2 && (t.talk || 0) === 0) s += 6;

  // 7) 玩家自称过身份时，AI 会把这个身份当真的称量（简单档尤其容易信）
  return s + (noise - 0.5) * 26 * (1 - wit);
}

export function topSuspects(G, ai, n) {
  const list = alive(G)
    .filter((p) => p.id !== ai.id && !isAlly(ai, p))
    .map((p) => ({ p, s: suspicionOf(G, ai, p.id) }))
    .sort((a, b) => b.s - a.s);
  return list.slice(0, n);
}

// ---------------------------------------------------------------- 台词
function fill(text, ctx) {
  return String(text)
    .replace(/\{who\}/g, ctx.who || '某人')
    .replace(/\{role\}/g, ctx.role || '清醒者')
    .replace(/\{call\}/g, ctx.call || '守密人');
}

const REPORT_WOLF = [
  '我查过{who}。他体内有黑液，很浓。',
  '灵视里，{who}是黑的。',
  '{who}。我看见黑液从他眼睛里渗出来了。',
];
const REPORT_CLEAN = [
  '{who}是干净的。我查过。',
  '我看过{who}——没有黑液，一点都没有。',
  '{who}暂时可以信。灵视里是白的。',
];
const AUTOPSY_WOLF = ['我验过{who}。他的血是黑的，是融蚀体。', '{who}的尸检结果：融蚀。不会有错。'];
const AUTOPSY_CLEAN = ['我验过{who}。他是干净的，死得冤枉。', '{who}的尸体上没有黑液。是清醒方。'];
const REPORT_VOID = [
  '我看过{who}。没有黑液，但里面什么也没有——他不是人。',
  '{who}。灵视里是空的，一片空白。那不是清醒，也不是融蚀。',
];
const AUTOPSY_VOID = ['{who}的尸体……是空的。没有黑液，也没有人。', '我验过{who}。他不是人，也不是融蚀体。']; 

// 取一句台词：角色专属 → 语气池 → 兜底。偶尔缀上口癖。
export function makeLine(G, p, kind, ctx) {
  const c = p.char || {};
  const own = c.say && c.say[kind];
  const pool = (own && own.length ? own : null)
    || (TONES[c.tone] && TONES[c.tone][kind])
    || TONES.cold[kind]
    || ['……'];
  const rnd = G.rnd;
  G.said = G.said || [];
  // 同一个角色别连着说同一句；整桌也别在几行之内撞同一句（池子是按语气共用的）
  const taken = (t) => t === p.lastLine || G.said.indexOf(t) >= 0;
  let text = pool[Math.floor(rnd() * pool.length)];
  for (let i = 0; i < 4 && taken(text); i++) text = pool[Math.floor(rnd() * pool.length)];
  if (taken(text) && pool.length > 1) {
    const i0 = pool.indexOf(text);
    for (let k = 1; k <= pool.length; k++) {
      const t = pool[(i0 + k) % pool.length];
      if (t !== p.lastLine && G.said.indexOf(t) < 0) { text = t; break; }
    }
  }
  p.lastLine = text;
  G.said.push(text);
  if (G.said.length > 14) G.said.shift();
  text = fill(text, ctx);
  if (c.q && rnd() < 0.16) text += c.q;
  return text;
}

function roleName(key) {
  return (ROLES[key] || ROLES.crew).zh;
}

// ---------------------------------------------------------------- 这一轮说什么
// 返回一个 act 数组，每个 act 对应聊天气泡里的一条发言。
export function aiStatement(G, ai) {
  const acts = [];
  const others = alive(G).filter((p) => p.id !== ai.id);
  const foes = others.filter((p) => !isAlly(ai, p));
  if (!foes.length) return [{ kind: 'idle', text: makeLine(G, ai, 'idle', {}) }];
  const rnd = G.rnd;
  const wit = G.diff.ai.wit;
  const lie = G.diff.ai.lie;

  const claim = (roleKey, kind) => {
    if (G.claims[ai.id]) return false;
    G.claims[ai.id] = roleKey;
    ai.claimRole = roleKey;
    acts.push({
      kind: 'claim',
      role: roleKey,
      claim: roleKey,
      text: makeLine(G, ai, kind || claimKind(ai, roleKey), { role: roleName(roleKey) }),
    });
    return true;
  };

  const report = (targetId, res) => {
    const pool = ai.role === 'coroner'
      ? (res === 'eroded' ? AUTOPSY_WOLF : (res === 'void' ? AUTOPSY_VOID : AUTOPSY_CLEAN))
      : (res === 'eroded' ? REPORT_WOLF : (res === 'void' ? REPORT_VOID : REPORT_CLEAN));
    let text = fill(pool[Math.floor(rnd() * pool.length)], { who: byId(G, targetId).name });
    acts.push({ kind: 'report', target: targetId, res, role: ai.claimRole || ai.role, text });
    G.reports.push({ by: ai.id, to: targetId, res, day: G.day, round: G.round });
    ai.reported = true;
  };

  // ---- 1. 灵视者 / 解剖助手
  if (ai.role === 'seer' || ai.role === 'coroner') {
    const rivalClaimed = alive(G).some((p) => p.id !== ai.id && G.claims[p.id] === ai.role);
    const pending = (ai.checks || []).filter((c) => !c.pub);
    const wolfRes = pending.filter((c) => c.res === 'eroded');
    const claimed = G.claims[ai.id] === ai.role;
    // 什么时候亮牌：被对跳、查到融蚀体、或者拖到第二天（再拖信息就烂在手里了）
    if (!claimed && (rivalClaimed || wolfRes.length > 0 || pending.length > 0 && G.day >= 2
      && rnd() < 0.3 + wit * 0.6)) {
      claim(ai.role, 'claimCrew');
    }
    if (G.claims[ai.id] === ai.role && pending.length) {
      const show = wolfRes.length ? wolfRes : pending;
      for (const c of show.slice(0, 2)) {
        c.pub = true;
        report(c.to, c.res);
      }
      return acts;
    }
    if (acts.length) return acts;
    // 没到跳的时机：像普通人一样怀疑别人
    return [crewAccuse(G, ai, foes)];
  }

  // ---- 2. 融蚀方：假跳 / 咬人
  if (WOLF_SIDE.has(ai.role) && ai.role !== 'mole') {
    const packClaimed = alive(G).some((p) => p.id !== ai.id && WOLF_SIDE.has(p.role) && G.claims[p.id]);
    const rivalSeer = alive(G).some((p) => G.claims[p.id] === 'seer' && !WOLF_SIDE.has(p.role));
    // 真灵视者跳出来了就立刻对跳；没人跳的话，第二天再主动演一个
    const wantFake = !packClaimed && (
      (rivalSeer && rnd() < lie) || (G.day >= 2 && rnd() < lie * 0.55)
    );
    if (wantFake) {
      const fakeRole = rnd() < 0.72 ? 'seer' : 'watch';
      if (claim(fakeRole, 'claimWolf')) {
        if (fakeRole === 'seer') {
          // 挑一个「公众已经有点怀疑」的清醒方来背黑锅，最像真的
          const scapegoat = weighted(foes, (p) => {
            const base = suspicionOf(G, { id: -1, role: 'crew' }, p.id) + 30;
            return base + hash01(G.seed, ai.id, p.id, 7) * 20;
          }, rnd);
          if (scapegoat) report(scapegoat.id, 'eroded');
        }
        return acts;
      }
    }
    // 假跳之后要接着演：每天再报一个「查验结果」，不然没人信
    const mine = G.claims[ai.id];
    if (mine === 'seer' && G.day >= 2 && rnd() < 0.55 + 0.35 * wit) {
      const said = new Set(G.reports.filter((r) => r.by === ai.id).map((r) => r.to));
      const fresh = foes.filter((p) => !said.has(p.id));
      if (fresh.length) {
        // 优先把真灵视者之外、公众最怀疑的人推出去
        const scapegoat = weighted(fresh, (p) => suspicionOf(G, { id: -1, role: 'crew' }, p.id)
          + (G.claims[p.id] === 'seer' ? 40 : 0) + hash01(G.seed, ai.id, p.id, G.day * 3) * 18, rnd);
        if (scapegoat) {
          report(scapegoat.id, 'eroded');
          return acts;
        }
      }
    }
    // 抱团：如果同伙正在被围攻，替他说话（只在高难档，低难档装看不见）
    const allyInTrouble = alive(G).find((p) => p.id !== ai.id && isAlly(ai, p)
      && G.acc.filter((a) => a.to === p.id).length >= 2);
    if (allyInTrouble && rnd() < 0.35 + 0.4 * wit) {
      acts.push({
        kind: 'defend', target: allyInTrouble.id,
        text: makeLine(G, ai, 'defend', { who: allyInTrouble.name }),
      });
      G.def.push({ by: ai.id, to: allyInTrouble.id, day: G.day });
      return acts;
    }
    // 指向一个清醒方：优先指向自称能力者（真的那个）
    const target = weighted(foes, (p) => {
      const claimW = G.claims[p.id] && POWER.has(G.claims[p.id]) ? 55 : 14;
      return claimW + Math.max(0, suspicionOf(G, ai, p.id)) * 0.5 + hash01(G.seed, ai.id, p.id, G.day) * 12;
    }, rnd);
    if (target) {
      acts.push({
        kind: 'accuse', target: target.id,
        text: makeLine(G, ai, 'accuse', { who: target.name }),
      });
      G.acc.push({ by: ai.id, to: target.id, day: G.day, round: G.round });
      return acts;
    }
  }

  // ---- 3. 被围攻了：先自辩，再反咬
  const heat = G.acc.filter((a) => a.to === ai.id && a.day === G.day).length;
  if (heat >= 2) {
    if (!G.claims[ai.id] && rnd() < 0.5 + 0.3 * wit) {
      claim(ai.role, WOLF_SIDE.has(ai.role) ? 'claimWolf' : 'claimCrew');
    }
    acts.push({
      kind: 'defend', self: true, target: ai.id,
      text: makeLine(G, ai, 'defendSelf', { who: ai.name, call: ai.char.call }),
    });
    G.def.push({ by: ai.id, to: ai.id, day: G.day });
    const back = weighted(foes, (p) => Math.max(0, suspicionOf(G, ai, p.id)) + 8, rnd);
    if (back) {
      acts.push({ kind: 'accuse', target: back.id, text: makeLine(G, ai, 'accuse', { who: back.name }) });
      G.acc.push({ by: ai.id, to: back.id, day: G.day, round: G.round });
    }
    return acts;
  }

  // ---- 4. 普通一轮：指认 / 附和 / 观望
  const best = topSuspects(G, ai, 3)[0];
  if (best && best.s > 34 + (1 - wit) * 10) {
    return [crewAccuse(G, ai, best.p)];
  }
  // 有人被两个人以上指认时，跟票
  const hot = alive(G).find((p) => p.id !== ai.id && !isAlly(ai, p)
    && G.acc.filter((a) => a.to === p.id && a.day === G.day).length >= 2);
  if (hot && rnd() < 0.45 + 0.4 * wit) {
    acts.push({ kind: 'accuse', target: hot.id, text: makeLine(G, ai, 'accuse', { who: hot.name }) });
    G.acc.push({ by: ai.id, to: hot.id, day: G.day, round: G.round });
    return acts;
  }
  // 偶尔给一个正在被围攻的人说话（好人也会这么干，所以别把它当铁证）
  const picked = alive(G).find((p) => p.id !== ai.id && !isAlly(ai, p)
    && G.acc.filter((a) => a.to === p.id && a.day === G.day).length === 1);
  if (picked && rnd() < 0.22) {
    acts.push({ kind: 'defend', target: picked.id, text: makeLine(G, ai, 'defend', { who: picked.name }) });
    G.def.push({ by: ai.id, to: picked.id, day: G.day });
    return acts;
  }
  return [{ kind: 'idle', text: makeLine(G, ai, 'idle', {}) }];
}

function claimKind(ai, roleKey) {
  if (WOLF_SIDE.has(ai.role)) return 'claimWolf';
  if (ai.role === 'forgotten') return 'claimThird';
  return 'claimCrew';
}

function crewAccuse(G, ai, foes, target) {
  const t = target || (topSuspects(G, ai, 3)[0] || {}).p;
  if (!t) return { kind: 'idle', text: makeLine(G, ai, 'idle', {}) };
  G.acc.push({ by: ai.id, to: t.id, day: G.day, round: G.round });
  return { kind: 'accuse', target: t.id, text: makeLine(G, ai, 'accuse', { who: t.name }) };
}

// ---------------------------------------------------------------- 投票
export function aiVote(G, ai, pool) {
  const cands = (pool || alive(G)).filter((p) => p.alive && p.id !== ai.id && !isAlly(ai, p));
  if (!cands.length) return null;
  const sorted = cands
    .map((p) => ({ p, s: suspicionOf(G, ai, p.id) + hash01(G.seed, ai.id, p.id, G.day + 91) * 9 }))
    .sort((a, b) => b.s - a.s);
  // 笨的更容易被第二个候选带偏
  if (sorted.length > 1 && hash01(G.seed, ai.id, sorted[0].p.id, G.day + 55) > G.diff.ai.wit) {
    return sorted[1].p.id;
  }
  return sorted[0].p.id;
}

// ---------------------------------------------------------------- 夜里
// 融蚀方今晚动谁：威胁最大的那个（自称能力者、指控过同伙的、话多的）
export function wolfTarget(G, pack) {
  const cands = alive(G).filter((p) => !WOLF_SIDE.has(p.role));
  if (!cands.length) return null;
  const score = (p) => {
    let s = 10;
    const c = G.claims[p.id];
    if (c === 'seer') s += 55;
    else if (c === 'watch') s += 34;
    else if (c === 'coroner') s += 26;
    else if (c === 'lamp') s += 22;
    s += G.acc.filter((a) => a.by === p.id).length * 7;
    s += (p.talk || 0) * 1.5;
    if (p.isPlayer) s += 5;
    // 别动双子的另一半——会立刻暴露
    if (p.role === 'twin') s -= 6;
    // 狼之间的共识：用同一套打分，加大一点的抖动
    s += hash01(G.seed, p.id, G.day, pack.length) * 16;
    return s;
  };
  return weighted(cands, score, G.rnd);
}

// 守夜人守谁：猜狼会动谁
export function guardTarget(G, ai) {
  const cands = alive(G).filter((p) => p.id !== ai.id);
  if (!cands.length) return ai.id;
  const score = (p) => {
    let s = 6;
    if (G.claims[p.id] === 'seer') s += 40;
    if (G.claims[p.id] === 'watch') s += 20;
    if (p.isPlayer) s += 6;
    s += G.acc.filter((a) => a.by === p.id).length * 4;
    s += hash01(G.seed, ai.id, p.id, G.day + 3) * 20;
    if (p.id === ai.lastGuard) s -= 100;   // 不能连着守同一个
    return s;
  };
  return weighted(cands, score, G.rnd);
}

// 灵视者查谁：最可疑的、还没查过的
export function checkTarget(G, ai) {
  const done = new Set((ai.checks || []).map((c) => c.to));
  const cands = alive(G).filter((p) => p.id !== ai.id && !done.has(p.id));
  if (!cands.length) return null;
  const score = (p) => Math.max(0, suspicionOf(G, ai, p.id)) + (G.claims[p.id] ? 10 : 0)
    + hash01(G.seed, ai.id, p.id, G.day + 17) * 14;
  return weighted(cands, score, G.rnd);
}

// 解剖助手验谁：验身份还不明的出局者
export function autopsyTarget(G, ai) {
  const done = new Set((ai.checks || []).map((c) => c.to));
  const cands = G.players.filter((p) => !p.alive && !p.revealed && !done.has(p.id));
  if (!cands.length) return null;
  return weighted(cands, (p) => 10 + hash01(G.seed, ai.id, p.id, 5) * 10, G.rnd);
}
