// 弥萨格狼人杀：AI 的脑子
//
// 这一版不是「掷骰子挑一个人怀疑」，而是一个小号的推理机：
//
//   1. 公开牌数（census）
//      桌上有什么牌是人人都知道的（难度表就是公开的）。所以 AI 能算：
//      「灵视者一共只有一张，已经报了两个人，那其中一个一定是假的。」
//      翻牌之后还会继续收窄。这是所有推理的主干。
//
//   2. 证据链（evidence）
//      每一份怀疑都由若干条「可以说出口的理由」组成，每条带权重和一句话解释。
//      权重随难度（wit）、记性（mem）、时间衰减变化。发言时取最重的那条当依据，
//      所以「他为什么怀疑我」是看得见的，不是玄学。
//
//   3. 私心（rel）
//      每个唤醒体对特定的人有好感或成见（见 rel.js）。私心只影响「没证据时先看谁」，
//      不改变证据本身：查到黑液，再亲近的人也保不住。
//
//   4. 阵营协同（coord）
//      融蚀方共享一份「谁最危险」的账，会合票、会替同伙掰票、会故意把票分给第二人选。
//
// 所有随机都走 hash01(种子, 我, 他, 天)，同一局里前后一致，换一局就换一套。

import { ROLES, WOLF_SIDE, KILLERS, POWER_ROLES, WHISPER_MAX } from './data.js';
import { pickLine } from './lines.js';
import { relOf } from './rel.js';
import { alive, byId, hash01, weighted } from './util.js';

export const isWolfRole = (r) => WOLF_SIDE.has(r);
export const isKillerRole = (r) => KILLERS.has(r);

export function isAlly(ai, p) {
  if (!p || p.id === ai.id) return false;
  if (WOLF_SIDE.has(ai.role) && WOLF_SIDE.has(p.role)) return true;
  if (ai.role === 'twin' && p.role === 'twin') return true;
  return false;
}

// 敌我口径：融蚀方眼里的「好人」是全部非融蚀；好人眼里的「敌人」是所有融蚀 + 忘却者
function relevantFoes(G, ai) {
  return alive(G).filter((p) => p.id !== ai.id && !isAlly(ai, p));
}

// ---------------------------------------------------------------- 公开牌数
// 桌上还剩哪些牌：难度表是公开的，减去自己的牌、减去已经翻开的死者
export function publicLeft(G, ai) {
  const left = {};
  for (const r of G.diff.roles) left[r] = (left[r] || 0) + 1;
  if (ai.role) left[ai.role] = (left[ai.role] || 0) - 1;
  for (const p of G.players) {
    if (!p.revealed || p.id === ai.id) continue;
    left[p.role] = (left[p.role] || 0) - 1;
  }
  for (const k of Object.keys(left)) if (left[k] < 0) left[k] = 0;
  return left;
}

// 活人里，有多少人自称某个身份
function claimCount(G, role, exceptId) {
  let n = 0;
  for (const p of alive(G)) {
    if (p.id === exceptId) continue;
    if (G.claims[p.id] === role) n++;
  }
  return n;
}

// 这个人的自称有多可信：0~1。撞车就摊薄，牌数不够就直接作废
export function credOf(G, ai, pid) {
  const p = byId(G, pid);
  if (!p) return 0;
  if (p.revealed) {
    const r = p.role;
    if (WOLF_SIDE.has(r) && r !== 'mole') return 0.05;
    return 1;
  }
  const c = G.claims[pid];
  if (!c) return 0.3;
  if (c === 'eroded' || c === 'lurker' || c === 'whisper') return 0.03;
  if (c === 'mole' || c === 'forgotten') return 0.12;
  if (c === 'crew') return 0.5;
  if (c === 'twin') return 0.6;
  const left = publicLeft(G, ai);
  const pool = (left[c] || 0);
  const claims = claimCount(G, c, ai.id) + (G.claims[ai.id] === c ? 1 : 0);
  if (pool <= 0) return 0.02;                 // 这张牌根本不够分，必是假的
  const ratio = Math.min(1, pool / Math.max(1, claims));
  return 0.35 + 0.6 * ratio;
}

// ---------------------------------------------------------------- 证据
// 返回 [{ k, w, why }]。w 是原始权重（还没乘难度和个人系数）。
export function evidence(G, ai, tid) {
  const t = byId(G, tid);
  const out = [];
  if (!t || !t.alive || tid === ai.id) return out;
  const left = publicLeft(G, ai);
  const tc = G.claims[tid];
  const wolfEyes = WOLF_SIDE.has(ai.role);

  // 0) 直接自爆：当众说自己是融蚀方
  if (tc === 'eroded' || tc === 'lurker' || tc === 'whisper') {
    out.push({ k: 'selfOut', w: 200, why: '他自己说他是融蚀体' });
  } else if (tc === 'mole' || tc === 'forgotten') {
    out.push({ k: 'thirdOut', w: 55, why: '他自己承认站在融蚀那边' });
  }

  // 1) 牌数对不上：最好用的一条
  if (tc && tc !== 'crew' && !WOLF_SIDE.has(tc)) {
    const pool = left[tc] || 0;
    const others = claimCount(G, tc, tid);
    if (pool <= 0) {
      out.push({ k: 'census', w: 85, why: `桌上已经没有「${ROLES[tc].zh}」这张牌了，他还在自称` });
    } else if (others >= pool) {
      out.push({
        k: 'claimConflict', w: 34 + 11 * (others - pool + 1),
        why: `他和另外 ${others} 个人都自称「${ROLES[tc].zh}」，可桌上只剩 ${pool} 张`,
      });
    } else if (others > 0) {
      out.push({ k: 'claimConflict', w: 20, why: `他也自称「${ROLES[tc].zh}」，和別人撞了` });
    }
  }

  // 2) 改口：第一天不可能有，所以按天数算
  const hist = (G.claimHist || []).filter((h) => h.id === tid);
  if (hist.length >= 2) {
    const first = hist[0];
    const last = hist[hist.length - 1];
    if (first.role !== last.role) {
      out.push({
        k: 'flip', w: 30 + 8 * Math.min(3, G.day - first.day),
        why: `他第 ${first.day} 天自称「${ROLES[first.role].zh}」，第 ${last.day} 天改称「${ROLES[last.role].zh}」`,
      });
    }
  }

  // 3) 别人的查验
  for (const r of G.reports || []) {
    if (r.to !== tid) continue;
    const cred = credOf(G, ai, r.by);
    if (cred <= 0.1) continue;
    if (r.res === 'eroded') {
      out.push({ k: 'reportWolf', w: 46 * cred + 4, why: `${byId(G, r.by) ? byId(G, r.by).name : '有人'}公布过「他是融蚀体」` });
    } else if (r.res === 'void') {
      out.push({ k: 'reportVoid', w: 26 * cred, why: `有人验出他「不是人」` });
    } else {
      out.push({ k: 'reportClean', w: -22 * cred, why: `有人验出他是干净的` });
    }
  }
  // 报假账：翻牌之后能反查
  for (const r of G.reports || []) {
    if (r.by !== tid) continue;
    const actual = byId(G, r.to) && byId(G, r.to).revealed ? byId(G, r.to).role : null;
    if (!actual) continue;
    const realWolf = WOLF_SIDE.has(actual) && actual !== 'mole';
    if (r.res === 'eroded' && !realWolf) {
      out.push({ k: 'falseReport', w: 55, why: `他说${byId(G, r.to).name}是融蚀体，可那个人翻牌是「${ROLES[actual].zh}」` });
    }
    if (r.res === 'clean' && realWolf) {
      out.push({ k: 'shieldWolf', w: 55, why: `他替${byId(G, r.to).name}担保过，可那个人翻牌是「${ROLES[actual].zh}」` });
    }
  }

  // 4) 历史行为（翻牌之后才有效）
  for (const d of G.def || []) {
    if (d.by !== tid) continue;
    const tp = byId(G, d.to);
    if (!tp || !tp.revealed) continue;
    if (WOLF_SIDE.has(tp.role) && tp.role !== 'mole') {
      out.push({ k: 'defendWolf', w: 24, why: `他替${tp.name}说过话，后来${tp.name}翻牌是融蚀体` });
    } else if (!WOLF_SIDE.has(tp.role)) {
      out.push({ k: 'defendGood', w: -8, why: `他替${tp.name}说过话，那个人是干净的` });
    }
  }
  for (const a of G.acc || []) {
    if (a.by !== tid) continue;
    const tp = byId(G, a.to);
    if (!tp || !tp.revealed) continue;
    if (WOLF_SIDE.has(tp.role) && tp.role !== 'mole') {
      out.push({ k: 'accuseWolf', w: -14, why: `他指认过${tp.name}，那个人翻牌是融蚀体` });
    } else if (!WOLF_SIDE.has(tp.role)) {
      out.push({ k: 'accuseGood', w: 16, why: `他指认过${tp.name}，那个人翻牌是「${ROLES[tp.role].zh}」` });
    }
  }
  for (const v of G.voteHist || []) {
    if (v.by !== tid || v.cause !== 'vote') continue;
    const tp = byId(G, v.to);
    if (!tp || !tp.revealed) continue;
    if (WOLF_SIDE.has(tp.role) && tp.role !== 'mole') {
      out.push({ k: 'voteWolf', w: -10, why: `他把票投给过${tp.name}，那个人是融蚀体` });
    } else if (!WOLF_SIDE.has(tp.role)) {
      out.push({ k: 'voteGood', w: 11, why: `他把票投给过${tp.name}，那个人翻牌是「${ROLES[tp.role].zh}」` });
    }
  }

  // 5) 行为面：只在前几天还看不出什么时起作用
  const bites = (G.acc || []).filter((a) => a.by === tid && a.day === G.day).length;
  if (bites >= 3) out.push({ k: 'scatter', w: 9, why: '他今天到处咬人，咬了三个人' });
  if (G.day >= 2 && (t.talk || 0) === 0) out.push({ k: 'quiet', w: 7, why: '他一整天一句话都没说' });
  if (G.day >= 2 && tc && POWER_ROLES.has(tc) && tc !== 'lamp') {
    const gave = (G.reports || []).some((r) => r.by === tid);
    if (!gave) out.push({ k: 'claimNoInfo', w: 12, why: `他自称「${ROLES[tc].zh}」，却一条查验都没报过` });
  }
  // 一直逼别人亮身份、自己却不说：这不算证据，但聪明人会记着
  const fish = (G.calls || []).filter((c) => c.by === tid).length;
  if (fish >= 2 && !G.claims[tid]) {
    out.push({ k: 'fishing', w: 7, why: `他已经 ${fish} 次要别人亮身份，自己一直不说` });
  }

  // 6) 私心：没有硬证据时才露出来的那一点
  const hard = out.reduce((s, e) => s + Math.max(0, e.w), 0);
  const rel = relOf(ai.name, t.name);
  if (rel > 0) out.push({ k: 'like', w: -(12 + (hard < 20 ? 10 : 0)), why: `我看他不像那种东西` });
  if (rel < 0) out.push({ k: 'war', w: 13 + (hard < 20 ? 12 : 0), why: `我一向觉得他不对劲` });
  if (!wolfEyes && ai.char && ai.char.realm && ai.char.realm === t.char.realm) {
    out.push({ k: 'realm', w: -5, why: '同一个界域的人，总归多一点信任' });
  }

  // 7) 融蚀方的私心：把自称能力者的清醒方推上去（这是他们的战术，不是证据）
  if (wolfEyes && tc && POWER_ROLES.has(tc)) {
    out.push({ k: 'wolfPush', w: 14, why: `他自称「${ROLES[tc].zh}」，威胁最大` });
  }

  // 记性：越久的证据越淡（mem 低的 AI 会忘事）
  const mem = G.diff.ai.mem;
  for (const e of out) {
    if (e.k === 'like' || e.k === 'war' || e.k === 'realm') continue;
    e.w *= Math.pow(mem, Math.max(0, G.day - 1) * 0.5);
  }
  return out;
}

// ---------------------------------------------------------------- 怀疑值
export function suspicionOf(G, ai, tid) {
  const t = byId(G, tid);
  if (!t || !t.alive || tid === ai.id) return -999;
  if (isAlly(ai, t)) return -999;

  const wit = G.diff.ai.wit;
  const noise = hash01(G.seed, ai.id, tid, G.day * 13 + G.round + 1);
  let s = 18 + (1 - wit) * 10;

  for (const e of evidence(G, ai, tid)) {
    // 聪明人对证据吃得准，笨的会被自己的私心带跑
    const scale = (e.k === 'like' || e.k === 'war' || e.k === 'realm') ? (1.4 - 0.6 * wit) : (0.65 + 0.55 * wit);
    s += e.w * scale;
  }
  // 完全不说话的极早期不罚，第二天之后才罚
  s += (noise - 0.5) * 30 * (1 - wit);
  return s;
}

// 最重的那条理由（给人看的「依据」）
export function reasonOf(G, ai, tid) {
  const list = evidence(G, ai, tid).filter((e) => e.w > 0 && e.k !== 'wolfPush');
  if (!list.length) return null;
  list.sort((a, b) => b.w - a.w);
  return list[0];
}

export function topSuspects(G, ai, n) {
  return relevantFoes(G, ai)
    .map((p) => ({ p, s: suspicionOf(G, ai, p.id) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, n || 3);
}

// ---------------------------------------------------------------- 台词
// 统一走 lines.js 的 pickLine：它管天数过滤、不重复、不撞车
export function say(G, p, kind, ctx) {
  return pickLine(G, p, kind || 'idle', Object.assign({ call: (p.char && p.char.call) || '守密人', who: '' }, ctx || {}));
}

function roleName(k) { return (ROLES[k] || ROLES.crew).zh; }

// 公开的自称：记账 + 出一句话。aiStatement 与 answerCall 共用一份口径，
// 免得「什么时候算改口」在两处写得不一样。
function claimAct(G, ai, roleKey, stance) {
  G.claims[ai.id] = roleKey;
  ai.claimRole = roleKey;
  (G.claimHist || (G.claimHist = [])).push({ id: ai.id, role: roleKey, day: G.day, round: G.round });
  return {
    kind: 'claim', role: roleKey, claim: roleKey, stance: stance || 'claim',
    text: say(G, ai, 'claim', { role: roleName(roleKey), roleKey }),
  };
}

// ---------------------------------------------------------------- 融蚀方的算术
// 谁最该被刀：威胁（自称能力者、说话有人听、指认过同伙）＋ 少一点「刀了会露馅」的风险
function threatOf(G, ai, p) {
  let s = 8;
  const c = G.claims[p.id];
  if (c === 'seer') s += 52;
  else if (c === 'coroner') s += 26;
  else if (c === 'watch') s += 30;
  else if (c === 'lamp') s += 20;
  s += (G.acc || []).filter((a) => a.by === p.id).length * 6;
  s += (p.talk || 0) * 1.2;
  const cred = credOf(G, ai, p.id);
  s += cred * 18;
  if (p.isPlayer) s += 6;
  // 同伙公开替他说过话：刀了他等于自己打自己
  const shielded = (G.def || []).some((d) => d.to === p.id && isAlly(ai, byId(G, d.by)));
  if (shielded) s -= 14 * G.diff.ai.lie;
  if (p.role === 'twin') s -= 5;
  return s;
}

// ---------------------------------------------------------------- 这一轮说什么
// 返回 { acts:[...], } —— 每个 act 是一条发言：{kind,target?,res?,text,why?,stance?}
export function aiStatement(G, ai) {
  const acts = [];
  const rnd = G.rnd;
  const wit = G.diff.ai.wit;
  const lie = G.diff.ai.lie;
  const foes = relevantFoes(G, ai);

  const push = (o) => { acts.push(o); return o; };

  const doClaim = (roleKey, flavor) => {
    if (G.claims[ai.id]) return false;
    push(claimAct(G, ai, roleKey, 'claim'));
    return true;
  };

  const doReport = (targetId, res) => {
    const t = byId(G, targetId);
    if (!t) return false;
    (G.reports || (G.reports = [])).push({ by: ai.id, to: targetId, res, day: G.day, round: G.round });
    push({
      kind: 'report', target: targetId, res, stance: res === 'eroded' ? 'reportWolf' : (res === 'void' ? 'reportVoid' : 'reportClean'),
      text: say(G, ai, 'report', { who: t.name, res, role: roleName(ai.claimRole || ai.role) }),
      why: res === 'eroded' ? '我验出的结果是融蚀' : (res === 'void' ? '我验出的结果是空白' : '我验出的结果是干净'),
    });
    ai.reported = true;
    return true;
  };

  const doAccuse = (t, whyText) => {
    if (!t) return false;
    (G.acc || (G.acc = [])).push({ by: ai.id, to: t.id, day: G.day, round: G.round });
    push({
      kind: 'accuse', target: t.id, stance: 'accuse',
      text: say(G, ai, 'accuse', { who: t.name }),
      why: whyText || null,
    });
    return true;
  };

  const doDefend = (t) => {
    if (!t) return false;
    (G.def || (G.def = [])).push({ by: ai.id, to: t.id, day: G.day });
    push({
      kind: 'defend', target: t.id, stance: 'defend',
      text: say(G, ai, 'defend', { who: t.name }),
      why: relOf(ai.name, t.name) > 0 ? '我跟他有交情，我说不出他坏' : null,
    });
    return true;
  };

  // ---- 0. 被低语了：说不了正经话
  if (ai.silencedDay === G.day) {
    push({ kind: 'idle', stance: 'silent', text: say(G, ai, 'idle', {}) + '（喉咙里全是铁锈味）' });
    return acts;
  }

  if (!foes.length) {
    push({ kind: 'idle', stance: 'idle', text: say(G, ai, 'idle', {}) });
    return acts;
  }

  const heat = (G.acc || []).filter((a) => a.to === ai.id && a.day === G.day).length;

  // ---- 1. 灵视者 / 解剖助手：决定要不要亮牌
  if (ai.role === 'seer' || ai.role === 'coroner') {
    const pending = (ai.checks || []).filter((c) => !c.pub);
    const wolfRes = pending.filter((c) => c.res === 'eroded');
    const claimed = G.claims[ai.id] === ai.role;
    const rivals = claimCount(G, ai.role, ai.id);
    const left = publicLeft(G, ai);
    // 牌数不够的时候别硬跳（跳了等于自曝说谎）
    const canClaim = (left[ai.role] || 0) + (claimed ? 1 : 0) > 0 || rivals > 0;
    if (!claimed && pending.length && canClaim) {
      const urgent = wolfRes.length > 0 || rivals > 0 || heat >= 2
        || (G.day >= 2 && rnd() < 0.25 + wit * 0.6);
      if (urgent) doClaim(ai.role, 'claimCrew');
      if (acts.length && !pending.length) return acts;
    }
    if (G.claims[ai.id] === ai.role && pending.length) {
      // 报最值钱的：查到狼立刻报；查到干净的，只在能救人时报
      const show = wolfRes.length ? wolfRes : pending.filter((c) => {
        const t = byId(G, c.to);
        if (!t || !t.alive) return false;
        const votes = (G.acc || []).filter((a) => a.to === c.to && a.day === G.day).length;
        return votes >= 1 || G.day >= 2 && rnd() < 0.35 + wit * 0.4;
      });
      for (const c of show.slice(0, wolfRes.length ? 2 : 1)) {
        c.pub = true;
        doReport(c.to, c.res);
      }
      if (acts.length) return acts;
    }
    if (acts.length) return acts;
  }

  // ---- 2. 融蚀方：假跳 / 假报告 / 抱团 / 咬人
  if (WOLF_SIDE.has(ai.role) && ai.role !== 'mole') {
    const claimed = G.claims[ai.id];
    const rivalPower = alive(G).find((p) => p.id !== ai.id && !isAlly(ai, p)
      && G.claims[p.id] && POWER_ROLES.has(G.claims[p.id]));
    const left = publicLeft(G, ai);
    // 想跳什么：先看桌上还剩什么牌，别跳一张根本没有的
    const fakePool = ['seer', 'watch', 'coroner'].filter((r) => (left[r] || 0) > 0
      || (G.claims[ai.id] === r));
    const wantFake = !claimed && fakePool.length && (
      (rivalPower && rnd() < lie * 0.8) || (G.day >= 2 && rnd() < lie * 0.5)
    );
    if (wantFake) {
      const fakeRole = weighted(fakePool, (r) => (r === 'seer' ? 6 : r === 'coroner' ? 3 : 2), rnd);
      if (doClaim(fakeRole)) {
        if (fakeRole === 'seer' || fakeRole === 'coroner') {
          // 挑一个「大家本来就在怀疑」的好人背锅，最像真的
          const scape = weighted(foes, (p) => Math.max(0, suspicionOf(G, { id: -1, role: 'crew', char: {} }, p.id))
            + 20 + hash01(G.seed, ai.id, p.id, 7) * 25, rnd);
          if (scape) doReport(scape.id, 'eroded');
        }
        return acts;
      }
    }
    // 已经假跳了就得接着演
    if ((claimed === 'seer' || claimed === 'coroner') && G.day >= 2 && rnd() < 0.5 + 0.4 * wit) {
      const said = new Set((G.reports || []).filter((r) => r.by === ai.id).map((r) => r.to));
      const fresh = foes.filter((p) => !said.has(p.id));
      if (fresh.length) {
        const scape = weighted(fresh, (p) => Math.max(0, suspicionOf(G, { id: -1, role: 'crew', char: {} }, p.id))
          + (G.claims[p.id] && POWER_ROLES.has(G.claims[p.id]) ? 45 : 0)
          + hash01(G.seed, ai.id, p.id, G.day * 3) * 20, rnd);
        // 高手会顺手给同伙发一张「干净」，把两个人一起洗白
        const mate = alive(G).find((p) => p.id !== ai.id && isAlly(ai, p) && !said.has(p.id));
        if (mate && G.diff.ai.lie > 0.7 && rnd() < 0.28) doReport(mate.id, 'clean');
        else if (scape) doReport(scape.id, 'eroded');
        if (acts.length) return acts;
      }
    }
    // 同伙被围攻：要么替他说话，要么把火引到别人身上
    const allyInTrouble = alive(G)
      .filter((p) => p.id !== ai.id && isAlly(ai, p))
      .map((p) => ({ p, n: (G.acc || []).filter((a) => a.to === p.id && a.day === G.day).length }))
      .sort((a, b) => b.n - a.n)[0];
    if (allyInTrouble && allyInTrouble.n >= 2 && rnd() < 0.3 + 0.55 * G.diff.ai.coord) {
      if (rnd() < 0.5) { doDefend(allyInTrouble.p); return acts; }
      const other = topSuspects(G, { id: -1, role: 'crew', char: {} }, 4)
        .map((x) => x.p).find((p) => !isAlly(ai, p) && p.id !== allyInTrouble.p.id);
      if (other) { doAccuse(other, '他一直在带节奏，先看他'); return acts; }
    }
    // 平时：咬威胁最大的好人
    const target = weighted(foes, (p) => threatOf(G, ai, p) + hash01(G.seed, ai.id, p.id, G.day) * 14, rnd);
    if (target) {
      const why = G.claims[target.id] && POWER_ROLES.has(G.claims[target.id])
        ? `他自称「${ROLES[G.claims[target.id]].zh}」，看着最像在装`
        : '他说话一直在躲，我不敢信';
      doAccuse(target, why);
      return acts;
    }
  }

  // ---- 3. 被围攻：先自辩，再反咬
  if (heat >= 2 || (heat >= 1 && rnd() < 0.35 + 0.4 * wit)) {
    push({
      kind: 'defend', self: true, target: ai.id, stance: 'defendSelf',
      text: say(G, ai, 'defendSelf', { who: ai.name }),
    });
    (G.def || (G.def = [])).push({ by: ai.id, to: ai.id, day: G.day });
    // 反咬：优先咬那个最卖力推我的人
    const accusers = (G.acc || []).filter((a) => a.to === ai.id && a.day === G.day)
      .map((a) => byId(G, a.by)).filter((p) => p && p.alive && !isAlly(ai, p));
    const back = accusers.sort((a, b) => suspicionOf(G, ai, b.id) - suspicionOf(G, ai, a.id))[0]
      || topSuspects(G, ai, 1)[0].p;
    if (back) {
      const why = (G.acc || []).some((a) => a.by === back.id && a.to === ai.id)
        ? '他带头发难，却一条证据都拿不出来' : null;
      doAccuse(back, why);
    }
    return acts;
  }

  // ---- 4. 常规：有硬证据就开火
  const best = topSuspects(G, ai, 3)[0];
  if (best && best.s > 34 + (1 - wit) * 12) {
    const why = reasonOf(G, ai, best.p.id);
    doAccuse(best.p, why ? why.why : null);
    return acts;
  }

  // ---- 5. 有人已经被推上台：跟票，或者替他说话（看关系）
  const hot = alive(G)
    .filter((p) => p.id !== ai.id && !isAlly(ai, p))
    .map((p) => ({ p, n: (G.acc || []).filter((a) => a.to === p.id && a.day === G.day).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (hot && hot.n >= 2) {
    if (relOf(ai.name, hot.p.name) > 0 && rnd() < 0.5 + 0.3 * wit) { doDefend(hot.p); return acts; }
    if (rnd() < 0.4 + 0.5 * wit) {
      const why = reasonOf(G, ai, hot.p.id);
      doAccuse(hot.p, why ? why.why : `大家都看着${hot.p.name}，我也觉得他不对`);
      return acts;
    }
  }

  // ---- 6. 想替某个亲近的人说句话
  const friend = alive(G).find((p) => p.id !== ai.id && !isAlly(ai, p)
    && relOf(ai.name, p.name) > 0
    && (G.acc || []).some((a) => a.to === p.id && a.day === G.day));
  if (friend && rnd() < 0.45) { doDefend(friend); return acts; }

  // ---- 7. 心里有个人选，但证据不够：说出来
  if (best && best.s > 24 && rnd() < 0.25 + 0.5 * G.diff.ai.heat) {
    const why = reasonOf(G, ai, best.p.id);
    doAccuse(best.p, why ? why.why : null);
    return acts;
  }

  // ---- 8. 划水
  push({ kind: 'idle', stance: 'idle', text: say(G, ai, 'idle', {}) });
  return acts;
}

// ---------------------------------------------------------------- 响应号召
// 守密人可以当众喊一句「有身份的站出来」。这一嗓子是全桌最贵的一次提问：
// 好人回答，等于把自己的牌摊在灯下（也把自己写进今晚的刀口）；
// 融蚀体回答，等于白拿一张假身份（也可能立刻被牌数拆穿）。
//
// 好人算三件事：这张牌有多要紧、我信不信守密人、现在有没有人正指着我。
// 融蚀体算两件事：桌上还剩哪张牌能跳、跳了会不会直接被对死。
const STEP_CHANCE = { seer: 0.6, coroner: 0.54, watch: 0.5, twin: 0.44, lamp: 0.4, chain: 0.36 };

export function answerCall(G, ai) {
  const acts = [];
  if (!ai || !ai.alive) return acts;

  // 被低语过的人张不开嘴——这一条比什么都优先
  if (ai.silencedDay === G.day) {
    acts.push({
      kind: 'idle', stance: 'silent',
      text: say(G, ai, 'idle', {}) + '（喉咙里全是铁锈味，一个字也吐不出来）',
    });
    return acts;
  }

  const rnd = G.rnd;
  const wit = G.diff.ai.wit;
  // 已经跳过牌的人不用再跳一次
  if (G.claims[ai.id]) return acts;

  const heat = (G.acc || []).filter((a) => a.to === ai.id && a.day === G.day).length;

  // ---- 清醒方：有牌的才会站出来
  if (!WOLF_SIDE.has(ai.role) && ai.role !== 'forgotten') {
    const base = STEP_CHANCE[ai.role] || 0;
    if (!base) return acts;               // 清醒者没牌可亮，只能沉默
    const trust = credOf(G, ai, 0);       // 守密人自己的话有多少分量
    const rivals = claimCount(G, ai.role, ai.id);
    let p = base * (0.55 + 0.7 * trust)
      + 0.1 * Math.min(2, heat)           // 被围攻的时候，亮牌是自保
      + 0.06 * (G.day - 1);               // 越往后越拖不起
    if (rivals > 0) p = Math.max(p, 0.78 + 0.18 * wit);   // 有人抢我的牌，必须站出来
    if (rnd() >= p) return acts;

    acts.push(claimAct(G, ai, ai.role, 'stepUp'));

    // 灵视者 / 解剖助手亮牌时，多半会顺手把最要紧的一条结果一起摊开
    if (ai.role === 'seer' || ai.role === 'coroner') {
      const pending = (ai.checks || []).filter((c) => !c.pub);
      const wolfRes = pending.filter((c) => c.res === 'eroded');
      const pickOne = wolfRes.length
        ? (rnd() < 0.78 ? wolfRes[0] : null)
        : (pending.length && rnd() < 0.35 + 0.45 * wit ? pending[0] : null);
      if (pickOne) {
        const t = byId(G, pickOne.to);
        if (t && t.alive) {
          pickOne.pub = true;
          (G.reports || (G.reports = [])).push({
            by: ai.id, to: t.id, res: pickOne.res, day: G.day, round: G.round,
          });
          acts.push({
            kind: 'report', target: t.id, res: pickOne.res, stance: pickOne.res === 'eroded' ? 'reportWolf' : (pickOne.res === 'void' ? 'reportVoid' : 'reportClean'),
            text: say(G, ai, 'report', { who: t.name, res: pickOne.res, role: roleName(ai.role) }),
            why: pickOne.res === 'eroded' ? '我验出的结果是融蚀' : (pickOne.res === 'void' ? '我验出的结果是空白' : '我验出的结果是干净'),
          });
        }
      }
    }
    return acts;
  }

  // ---- 融蚀方：应声等于白捡一张牌，但要挑桌上还剩得下的
  if (WOLF_SIDE.has(ai.role) && ai.role !== 'mole') {
    const left = publicLeft(G, ai);
    const rivalPower = alive(G).find((q) => q.id !== ai.id && !isAlly(ai, q)
      && G.claims[q.id] && POWER_ROLES.has(G.claims[q.id]));
    const fakePool = ['seer', 'watch', 'coroner'].filter((r) => (left[r] || 0) > 0);
    if (!fakePool.length) return acts;

    let p = G.diff.ai.lie * 0.3;
    if (rivalPower) p += G.diff.ai.lie * 0.55;   // 已经有人跳了，正好对着跳
    p += 0.1 * (G.day - 1);
    if (rnd() >= p) return acts;

    const fakeRole = weighted(fakePool, (r) => (r === 'seer' ? 6 : r === 'coroner' ? 3 : 2), rnd);
    acts.push(claimAct(G, ai, fakeRole, 'stepUp'));

    // 跳了灵视 / 解剖就得马上有货，否则等于白送一条命
    if ((fakeRole === 'seer' || fakeRole === 'coroner') && rnd() < 0.55 + 0.35 * G.diff.ai.lie) {
      const foes = alive(G).filter((q) => q.id !== ai.id && !isAlly(ai, q));
      const scape = weighted(foes, (q) => Math.max(0, suspicionOf(G, { id: -1, role: 'crew', char: {} }, q.id))
        + 18 + hash01(G.seed, ai.id, q.id, 7) * 25, rnd);
      if (scape) {
        (G.reports || (G.reports = [])).push({
          by: ai.id, to: scape.id, res: 'eroded', day: G.day, round: G.round,
        });
        acts.push({
          kind: 'report', target: scape.id, res: 'eroded', stance: 'reportWolf',
          text: say(G, ai, 'report', { who: scape.name, res: 'eroded', role: roleName(fakeRole) }),
          why: '我验出的结果是融蚀',
        });
      }
    }
    return acts;
  }

  return acts;
}

// 守密人喊完之后，桌上谁应声、谁推脱。顺序就是发言顺序：
// 先好人应声，再融蚀体对跳，最后留一个人推脱——不然场面太配合，像排练过。
export function callResponders(G) {
  const tag = G.day * 31 + G.round;
  const pool = alive(G).filter((p) => !p.isPlayer)
    .slice()
    .sort((a, b) => hash01(G.seed, a.id, tag, 5) - hash01(G.seed, b.id, tag, 5));
  const out = [];
  let stepN = 0;
  let wolfN = 0;

  for (const p of pool) {
    if (stepN >= 2) break;
    if (WOLF_SIDE.has(p.role) || p.role === 'forgotten') continue;
    const acts = answerCall(G, p);
    if (acts.length) { out.push({ pid: p.id, acts }); stepN++; }
  }
  for (const p of pool) {
    if (wolfN >= 1) break;
    if (!WOLF_SIDE.has(p.role) || p.role === 'mole') continue;
    const acts = answerCall(G, p);
    if (acts.length) { out.push({ pid: p.id, acts }); wolfN++; }
  }
  // 一个人推脱，场面才不像被脚本推着走
  if (out.length < 3) {
    const rest = pool.filter((p) => !out.some((o) => o.pid === p.id));
    if (rest.length) {
      const p = rest[Math.floor(G.rnd() * rest.length)];
      out.push({ pid: p.id, acts: [{ kind: 'idle', stance: 'refuse', text: say(G, p, 'refuse', {}) }] });
    }
  }
  return out;
}

// ---------------------------------------------------------------- 投票
// 融蚀方先算一个「集体目标」，个人再按协同度靠拢；好人会避免把票投废。
export function packVote(G, pool) {
  const wolves = alive(G).filter((p) => KILLERS.has(p.role) || p.role === 'whisper');
  if (!wolves.length) return null;
  const cands = (pool || alive(G)).filter((p) => !WOLF_SIDE.has(p.role));
  if (!cands.length) return null;
  const fake = { id: -1, role: 'crew', char: {} };
  const score = (p) => threatOf(G, wolves[0], p) + Math.max(0, suspicionOf(G, fake, p.id)) * 1.2
    + hash01(G.seed, 77, p.id, G.day) * 10;
  return weighted(cands, score, G.rnd);
}

export function aiVote(G, ai, pool) {
  const cands = (pool || alive(G)).filter((p) => p.alive && p.id !== ai.id && !isAlly(ai, p));
  if (!cands.length) return null;
  const rnd = G.rnd;
  const wit = G.diff.ai.wit;

  // 融蚀方：跟着集体目标走。共谋者要装得像好人，跟票不能太齐；
  // 低语者手上没有刀，跟得太紧容易被看出是一伙的
  if (WOLF_SIDE.has(ai.role)) {
    const t = G.packTarget;
    const c = G.diff.ai.coord;
    const follow = ai.role === 'mole' ? 0.18 + 0.25 * c
      : (ai.role === 'whisper' ? 0.2 + 0.35 * c : 0.32 + 0.45 * c);
    if (t && cands.some((p) => p.id === t) && rnd() < follow) return t;
  }
  // 忘却者：跟着大盘，别让自己显眼
  if (ai.role === 'forgotten') {
    const t = G.packTarget || null;
    if (t && cands.some((p) => p.id === t) && rnd() < 0.6) return t;
  }

  const scored = cands
    .map((p) => ({ p, s: suspicionOf(G, ai, p.id) + hash01(G.seed, ai.id, p.id, G.day + 91) * 8 }))
    .sort((a, b) => b.s - a.s);

  // 笨的会被第二人选带偏（私心、跟风）
  if (scored.length > 1 && hash01(G.seed, ai.id, scored[0].p.id, G.day + 55) > wit * 1.15) {
    const alt = scored[1];
    if (alt.s > scored[0].s - 12) return alt.p.id;
  }

  // 别把票投废：如果自己这票明显赢不了，就跟大盘（大盘由引擎先算一遍票）
  const lead = G.preVotes ? G.preVotes.lead : null;
  if (lead != null && lead !== scored[0].p.id && rnd() < 0.45 + 0.4 * wit) {
    const cand = cands.find((p) => p.id === lead);
    if (cand && suspicionOf(G, ai, cand.id) > 8) return lead;
  }
  return scored[0].p.id;
}

// ---------------------------------------------------------------- 夜里
export function wolfTarget(G) {
  const cands = alive(G).filter((p) => !WOLF_SIDE.has(p.role));
  if (!cands.length) return null;
  const fake = { id: -1, role: 'eroded', char: {} };
  return weighted(cands, (p) => threatOf(G, fake, p) + hash01(G.seed, p.id, G.day, 3) * 15, G.rnd);
}

// 低语者：让最会说话的人失声（先灵视，再解剖，再守夜）
export function whisperTarget(G, ai) {
  if ((ai.whisperDone || []).length >= WHISPER_MAX) return null;
  const cands = alive(G).filter((p) => p.id !== ai.id && !WOLF_SIDE.has(p.role)
    && !(ai.whisperDone || []).includes(p.id));
  if (!cands.length) return null;
  return weighted(cands, (p) => {
    const c = G.claims[p.id];
    let s = 8;
    if (c === 'seer') s += 60;
    else if (c === 'coroner') s += 30;
    else if (c === 'watch') s += 26;
    else if (c === 'lamp') s += 18;
    s += (p.talk || 0) * 2;
    s += (G.acc || []).filter((a) => a.by === p.id).length * 5;
    if (p.isPlayer) s += 6;
    return s + hash01(G.seed, ai.id, p.id, G.day + 61) * 12;
  }, G.rnd);
}

export function guardTarget(G, ai) {
  const cands = alive(G).filter((p) => p.id !== ai.lastGuard);
  if (!cands.length) return ai.id;
  return weighted(cands, (p) => {
    let s = 8;
    if (G.claims[p.id] === 'seer') s += 44;
    else if (G.claims[p.id] === 'coroner') s += 24;
    else if (G.claims[p.id] === 'lamp') s += 16;
    if (p.isPlayer) s += 5;
    s += (G.acc || []).filter((a) => a.by === p.id).length * 3;
    if (relOf(ai.name, p.name) > 0) s += 10;
    return s + hash01(G.seed, ai.id, p.id, G.day + 3) * 18;
  }, G.rnd);
}

export function checkTarget(G, ai) {
  const done = new Set((ai.checks || []).map((c) => c.to));
  const cands = alive(G).filter((p) => p.id !== ai.id && !done.has(p.id));
  if (!cands.length) return null;
  return weighted(cands, (p) => {
    // 优先查「自称能力者」里的对跳，其次查最可疑的
    let s = Math.max(0, suspicionOf(G, ai, p.id)) * 1.4;
    if (G.claims[p.id] && POWER_ROLES.has(G.claims[p.id])) s += 26;
    if (relOf(ai.name, p.name) < 0) s += 8;
    return s + hash01(G.seed, ai.id, p.id, G.day + 17) * 12;
  }, G.rnd);
}

export function autopsyTarget(G, ai) {
  const done = new Set((ai.checks || []).map((c) => c.to));
  const cands = G.players.filter((p) => !p.alive && !p.revealed && !done.has(p.id));
  if (!cands.length) return null;
  return weighted(cands, (p) => 10 + hash01(G.seed, ai.id, p.id, 5) * 10, G.rnd);
}

// 灯守要不要救人：救「自称能力者且可信」的，或者跟自己有交情的
export function lampWorthy(G, ai, victim) {
  if (!victim) return 0;
  let v = 10;
  const c = G.claims[victim.id];
  if (c && POWER_ROLES.has(c)) v += 34 * Math.max(0.3, credOf(G, ai, victim.id));
  else if (c === 'crew') v += 6;
  if (victim.isPlayer) v += 6;
  if (relOf(ai.name, victim.name) > 0) v += 16;
  v += hash01(G.seed, ai.id, victim.id, 33) * 18;
  return v;
}

// 链缚者被投出去时拖谁：最可疑的那个
export function chainPick(G, ai) {
  const t = topSuspects(G, ai, 1)[0];
  return t ? t.p.id : null;
}
