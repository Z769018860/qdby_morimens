// 弥萨格狼人杀：自动档
//
// 自动进行时，守密人的那一手也交给这里——它不是第二个引擎，
// 只把「现在该做什么」压成一个动作对象，跟人点按钮一样交给 submit()。
// 判断沿用 ai.js 的怀疑值，所以自动驾驶看到的依据，和人坐下来想的是同一条。

import { ROLES, WOLF_SIDE, POWER_ROLES } from './data.js';
import { alive, byId } from './util.js';
import { suspicionOf, isAlly, credOf, publicLeft } from './ai.js';
import { relOf } from './rel.js';

const pickBest = (list, score) => {
  let best = null;
  let bs = -Infinity;
  for (const x of list) {
    const s = score(x);
    if (s > bs) { bs = s; best = x; }
  }
  return best;
};

// 融蚀方眼里的「该先动谁」：自称能力的最危险，其次话多的
function threatOf(G, p) {
  const c = G.claims[p.id];
  let s = 6;
  if (c === 'seer') s += 50;
  else if (c === 'coroner') s += 26;
  else if (c === 'watch') s += 30;
  else if (c === 'lamp') s += 18;
  s += (p.talk || 0) * 1.5;
  s += (G.acc || []).filter((a) => a.by === p.id).length * 6;
  if (p.isPlayer) s += 5;
  return s;
}

const IDLE = { type: 'talk', kind: 'idle' };

// ---------------------------------------------------------------- 白天
export function autoTalk(G) {
  const me = G.player;
  if (!me || !me.alive) return IDLE;
  if (me.silencedDay === G.day) return IDLE;

  const others = alive(G).filter((p) => p.id !== 0);
  const foes = others.filter((p) => !isAlly(me, p));
  if (!foes.length) return IDLE;

  const heat = (G.acc || []).filter((a) => a.to === 0 && a.day === G.day).length;
  const pending = (me.checks || []).filter((c) => !c.pub && byId(G, c.to));
  const myClaim = G.claims[0] || null;
  const rivals = others.filter((p) => G.claims[p.id] === me.role).length;
  const claimedPowers = foes.filter((p) => G.claims[p.id] && POWER_ROLES.has(G.claims[p.id]));

  // 1) 手上有查验：一轮只能说一句，所以先亮牌、下一轮再报
  if (POWER_ROLES.has(me.role) && pending.length) {
    const wolfRes = pending.filter((c) => c.res === 'eroded' && byId(G, c.to).alive);
    if (!myClaim && (wolfRes.length || rivals || heat >= 2 || G.day >= 2)) {
      return { type: 'talk', kind: 'claim', role: me.role };
    }
    if (myClaim === me.role) {
      const c = wolfRes[0] || pending.find((x) => byId(G, x.to).alive) || pending[0];
      return { type: 'talk', kind: 'report', target: c.to, res: c.res };
    }
  }

  // 2) 号召：桌上一个人都没报牌的时候值得逼一次。故意放在第二轮——
  //    开场就喊太像剧本，先听别人说一轮，再问「谁有身份」更像人话。
  const canCall = !(G.callDay && G.callDay[G.day]);
  const noClaims = !others.some((p) => G.claims[p.id]);
  if (canCall && noClaims) {
    const eager = (G.day === 1 && G.round >= 1 && G.rnd() < 0.6) || (G.day === 2 && G.rnd() < 0.45);
    if (eager) return { type: 'talk', kind: 'call' };
  }

  // 3) 被围攻：只能反咬（守密人没有「自辩」这一手）
  if (heat >= 1) {
    const accusers = (G.acc || []).filter((a) => a.to === 0 && a.day === G.day)
      .map((a) => byId(G, a.by)).filter((p) => p && p.alive && !isAlly(me, p));
    if (accusers.length && G.rnd() < 0.7) {
      const t = pickBest(accusers, (p) => suspicionOf(G, me, p.id));
      return { type: 'talk', kind: 'accuse', target: t.id };
    }
  }

  // 4) 融蚀方：能对跳就对跳，不能就咬最危险的好人
  if (WOLF_SIDE.has(me.role)) {
    if (!myClaim && claimedPowers.length && G.day >= 2 && G.rnd() < 0.4) {
      const role = G.claims[claimedPowers[0].id];
      const left = publicLeft(G, me);
      if ((left[role] || 0) > 0) return { type: 'talk', kind: 'claim', role };
    }
    const t = pickBest(foes, (p) => threatOf(G, p) + G.rnd() * 12);
    if (t) return { type: 'talk', kind: 'accuse', target: t.id };
    return IDLE;
  }

  // 5) 好人：证据够了就开火，不够就想保人
  const best = pickBest(foes, (p) => suspicionOf(G, me, p.id));
  if (best && suspicionOf(G, me, best.id) > 42) {
    return { type: 'talk', kind: 'accuse', target: best.id };
  }
  const friend = foes.find((p) => relOf(me.name, p.name) > 0
    && (G.acc || []).some((a) => a.to === p.id && a.day === G.day));
  if (friend && G.rnd() < 0.45) return { type: 'talk', kind: 'defend', target: friend.id };
  if (best && G.rnd() < 0.5) return { type: 'talk', kind: 'accuse', target: best.id };
  return IDLE;
}

// ---------------------------------------------------------------- 投票
export function autoVote(G, e) {
  const me = G.player;
  const tied = e && e.opts && e.opts.tied && e.opts.tied.length ? e.opts.tied : null;
  const pool = alive(G).filter((p) => p.id !== 0 && (!tied || tied.includes(p.id)));
  if (!pool.length) return { type: 'vote', target: null };
  const cands = pool.filter((p) => !isAlly(me, p));
  const list = cands.length ? cands : pool;
  const t = pickBest(list, (p) => suspicionOf(G, me, p.id) + G.rnd() * 6);
  return { type: 'vote', target: t ? t.id : null };
}

// ---------------------------------------------------------------- 夜里
export function autoNight(G, o) {
  const me = G.player;
  if (!o || !o.list.length) return { type: 'night', target: null };
  const cands = o.list.map((id) => byId(G, id)).filter(Boolean);
  if (!cands.length) return { type: 'night', target: null };

  const score = (p) => {
    const c = G.claims[p.id];
    let s = 0;
    if (o.sub === 'kill') {
      if (c && POWER_ROLES.has(c)) s += 48;
      s += (p.talk || 0) * 2 + (G.acc || []).filter((a) => a.by === p.id).length * 6;
      s += credOf(G, me, p.id) * 14;
      if (relOf(me.name, p.name) > 0) s -= 12;
    } else if (o.sub === 'check') {
      s = suspicionOf(G, me, p.id) * 1.2 + (c && POWER_ROLES.has(c) ? 30 : 0);
    } else if (o.sub === 'autopsy') {
      s = (c ? 22 : 0) + (G.acc || []).filter((a) => a.to === p.id).length * 4;
    } else if (o.sub === 'guard') {
      if (c === 'seer') s += 48;
      else if (c === 'coroner') s += 26;
      else if (c === 'lamp') s += 18;
      s += relOf(me.name, p.name) * 12 + (p.talk || 0);
    } else if (o.sub === 'silence') {
      if (c === 'seer') s += 60;
      else if (c === 'coroner') s += 40;
      else if (c === 'watch') s += 30;
      s += (p.talk || 0) * 2;
    }
    return s + G.rnd() * 8;
  };
  const t = pickBest(cands, score);
  return { type: 'night', target: t ? t.id : null };
}

// ---------------------------------------------------------------- 灯与链
export function autoRevive(G) {
  const v = byId(G, G.pendingRevive);
  if (!v) return { type: 'revive', yes: false };
  const c = G.claims[v.id];
  let chance = 0.22;
  if (c && POWER_ROLES.has(c)) chance = 0.5 + 0.4 * credOf(G, G.player, v.id);
  else if (relOf(G.player.name, v.name) > 0) chance = 0.5;
  if ((v.talk || 0) >= 3) chance += 0.1;
  return { type: 'revive', yes: G.rnd() < chance };
}

export function autoChain(G, e) {
  const list = (e && e.opts && e.opts.list) || [];
  const cands = list.map((id) => byId(G, id)).filter(Boolean);
  if (!cands.length) return { type: 'chain', target: null };
  const t = pickBest(cands, (p) => suspicionOf(G, G.player, p.id) + G.rnd() * 8);
  return { type: 'chain', target: t ? t.id : null };
}

// ---------------------------------------------------------------- 入口
export function autoAct(G, e, nightOpt) {
  if (!e) return null;
  if (e.kind === 'start') return { type: 'start' };
  if (e.kind === 'talk') return autoTalk(G);
  if (e.kind === 'vote') return autoVote(G, e);
  if (e.kind === 'night') return autoNight(G, nightOpt);
  if (e.kind === 'revive') return autoRevive(G);
  if (e.kind === 'chain') return autoChain(G, e);
  return null;
}

// 界面用：把决定翻成一句人话，让人知道刚刚替你做了什么
export function autoNote(G, act) {
  if (!act) return '';
  const nm = (id) => (byId(G, id) || {}).name || '?';
  if (act.type === 'talk') {
    if (act.kind === 'accuse') return '指认 ' + nm(act.target);
    if (act.kind === 'claim') return '亮牌：' + (ROLES[act.role] ? ROLES[act.role].zh : act.role);
    if (act.kind === 'defend') return '替 ' + nm(act.target) + ' 说话';
    if (act.kind === 'report') return '公布查验：' + nm(act.target) + (act.res === 'eroded' ? ' 是融蚀' : (act.res === 'void' ? ' 不是人' : ' 干净'));
    if (act.kind === 'call') return '号召有身份的人站出来';
    return '先不说话';
  }
  if (act.type === 'vote') return act.target == null ? '弃票' : '投给 ' + nm(act.target);
  if (act.type === 'night') return act.target == null ? '今晚什么都不做' : '选了 ' + nm(act.target);
  if (act.type === 'revive') return act.yes ? '点灯救人' : '不点灯';
  if (act.type === 'chain') return act.target == null ? '不拖人' : '拖走 ' + nm(act.target);
  return '';
}
