// 弥萨格狼人杀：全局状态机
//
// 界面只做两件事：把 nextEvent() 吐出来的事件画出来，把玩家的选择交给 submit()。
// 所有规则都在这里，AI 的脑子在 ai.js，台词在 data.js。
//
// 事件类型：
//   {t:'phase', phase, day}   昼夜切换
//   {t:'sys', text}           广播 / 旁白
//   {t:'say', pid, text, claim} 某个人说了一句（claim = 自称的身份）
//   {t:'turn', kind, role, opts} 等玩家操作：talk / vote / night / revive
//   {t:'tally', votes, tied}  投票明细
//   {t:'out', pid, role, cause} 出局（role 为 null 表示身份不明）
//   {t:'over', winner, playerWin} 结束

import { ROLES, CHARS, DIFFS, SYS, DAY_LEAD, KEEPER, WOLF_SIDE } from './data.js';
import { mulberry32, shuffle, alive, byId, hash01 } from './util.js';
import {
  aiStatement, aiVote, suspicionOf, wolfTarget, guardTarget, checkTarget,
  autopsyTarget, isAlly, makeLine,
} from './ai.js';

const POWER = ['seer', 'watch', 'coroner', 'lamp'];

// 灵视/验尸看到的东西：融蚀、空壳（忘却者）、清醒
function checkRes(role) {
  if (WOLF_SIDE.has(role) && role !== 'mole') return 'eroded';
  if (role === 'forgotten') return 'void';
  return 'clean';
}

const KEEPER_FILL = (s, ctx) => String(s)
  .replace(/\{who\}/g, ctx.who || '你')
  .replace(/\{role\}/g, ctx.role || '清醒者');

// ---------------------------------------------------------------- 开局
export function createGame(opt) {
  const diff = DIFFS.find((d) => d.k === (opt && opt.diff)) || DIFFS[1];
  const seed = (opt && opt.seed) || (Math.floor(Math.random() * 0xffffffff) >>> 0);
  const rnd = mulberry32(seed);

  // 先抽人，再发牌：守密人固定坐在 0 号位
  const roster = shuffle(CHARS, rnd).slice(0, diff.players - 1);
  const players = [{
    id: 0, isPlayer: true, name: '守密人', char: { zh: '守密人', tone: 'cold', call: '守密人', say: null },
    alive: true, revealed: false, talk: 0, lastLine: '',
  }];
  roster.forEach((c, i) => {
    players.push({
      id: i + 1, isPlayer: false, name: c.zh, char: c, alive: true,
      revealed: false, talk: 0, lastLine: '', checks: [], given: [],
    });
  });

  const roles = shuffle(diff.roles, rnd);
  players.forEach((p, i) => {
    p.role = roles[i];
    p.faction = WOLF_SIDE.has(p.role) ? 'wolf' : (p.role === 'forgotten' ? 'forgotten' : 'crew');
    p.claimRole = null;
    p.checks = p.checks || [];
  });

  // 双子互认
  const twins = players.filter((p) => p.role === 'twin');
  twins.forEach((p) => { p.twinId = twins.find((q) => q !== p).id; });

  const G = {
    seed, rnd, diff, diffKey: diff.k, players, queue: [],
    day: 0, round: 0, phase: 'brief', si: 0, speakers: [],
    claims: {}, reports: [], acc: [], def: [], voteHist: [],
    votes: {}, runoff: false, waitingStart: true,
    night: null, pendingRevive: null, winner: null, over: false,
    player: players[0],
  };

  push(G, { t: 'phase', phase: 'brief', day: 0 });
  for (const line of SYS.intro) push(G, { t: 'sys', text: line });
  push(G, { t: 'sys', text: '——现在，翻开你的身份牌。' });
  push(G, { t: 'turn', kind: 'start' });
  return G;
}

function push(G, e) { G.queue.push(e); return e; }

export function nextEvent(G) {
  if (!G.queue.length) fill(G);
  return G.queue.length ? G.queue.shift() : null;
}

function fill(G) {
  let guard = 0;
  while (!G.queue.length && guard++ < 400) {
    if (G.phase === 'discuss') stepDiscuss(G);
    else if (G.phase === 'vote') stepVote(G);
    else if (G.phase === 'night') stepNight(G);
    else return;
  }
}

// ---------------------------------------------------------------- 白天
function beginDay(G) {
  G.day += 1;
  G.round = 0;
  G.phase = 'discuss';
  G.runoff = false;
  push(G, { t: 'phase', phase: 'day', day: G.day });
  push(G, { t: 'sys', text: DAY_LEAD[Math.min(G.day - 1, DAY_LEAD.length - 1)] });
  startRound(G);
}

function startRound(G) {
  G.speakers = shuffle(alive(G).map((p) => p.id), G.rnd);
  G.si = 0;
}

function stepDiscuss(G) {
  while (G.si < G.speakers.length) {
    const p = byId(G, G.speakers[G.si++]);
    if (!p || !p.alive) continue;
    if (p.isPlayer) {
      push(G, { t: 'turn', kind: 'talk' });
      return;
    }
    const acts = aiStatement(G, p);
    for (const a of acts) {
      p.talk = (p.talk || 0) + 1;
      push(G, { t: 'say', pid: p.id, text: a.text, claim: a.claim || null, act: a.kind });
    }
    return;
  }
  // 本轮说完
  if (G.round + 1 < G.diff.rounds) {
    G.round += 1;
    startRound(G);
    return;
  }
  G.phase = 'vote';
  G.runoff = false;
}

function stepVote(G) {
  G.votes = {};
  for (const p of alive(G)) {
    if (p.isPlayer) continue;
    G.votes[p.id] = aiVote(G, p);
  }
  push(G, { t: 'phase', phase: 'vote', day: G.day });
  if (!G.player.alive) { resolveVote(G, null); return; }
  push(G, { t: 'turn', kind: 'vote', opts: { tied: G.runoff ? G.tied : null } });
  G.phase = 'wait-vote';
}

function tally(votes) {
  const c = {};
  for (const k of Object.keys(votes)) {
    const v = votes[k];
    if (v == null) continue;
    c[v] = (c[v] || 0) + 1;
  }
  let max = 0;
  for (const k of Object.keys(c)) max = Math.max(max, c[k]);
  const top = Object.keys(c).filter((k) => c[k] === max).map(Number);
  return { c, max, top };
}

function resolveVote(G, target) {
  const votes = Object.assign({}, G.votes);
  if (G.player.alive) {
    if (target != null) votes[0] = target;
    else votes[0] = null;
  }
  const { top } = tally(votes);
  push(G, { t: 'tally', votes, tied: top.length > 1 ? top : null });

  if (top.length !== 1) {
    if (!G.runoff && top.length > 1) {
      G.runoff = true;
      G.tied = top;
      push(G, { t: 'sys', text: '票数平了。有人提议再投一次——只在票数最高的几个人里选。' });
      G.votes = {};
      const pool = top.map((id) => byId(G, id)).filter(Boolean);
      for (const p of alive(G)) {
        if (p.isPlayer) continue;
        G.votes[p.id] = aiVote(G, p, pool);
      }
      push(G, { t: 'turn', kind: 'vote', opts: { tied: top } });
      G.phase = 'wait-vote';
      return;
    }
    // 复投还是平票：抽签。谁都不出去等于白送融蚀方一个夜晚，桌上没人愿意这样收场。
    const pickId = top[Math.floor(G.rnd() * top.length)];
    const p2 = byId(G, pickId);
    push(G, { t: 'sys', text: '还是平票。最后只能抽签——被抽中的人自己站起来，往门口走。' });
    if (p2) {
      if (p2.role === 'lurker' && !p2.molted) {
        p2.molted = true;
        p2.revealed = true;
        push(G, { t: 'out', pid: pickId, role: 'lurker', cause: 'molt' });
        push(G, { t: 'sys', text: SYS.lurkerMolt.replace('{who}', p2.name) });
      } else {
        killPlayer(G, pickId, 'vote');
      }
    }
    afterVote(G);
    return;
  }

  const id = top[0];
  const p = byId(G, id);
  if (!p) { afterVote(G); return; }

  // 潜伏者：第一次被投出去不会死，当场蜕壳
  if (p.role === 'lurker' && !p.molted) {
    p.molted = true;
    p.revealed = true;
    push(G, { t: 'out', pid: id, role: 'lurker', cause: 'molt' });
    push(G, { t: 'sys', text: SYS.lurkerMolt.replace('{who}', p.name) });
    if (!p.isPlayer) {
      push(G, { t: 'say', pid: id, text: '……被看见了。那就没必要再披着这张皮了。', claim: null });
    }
    afterVote(G);
    return;
  }

  killPlayer(G, id, 'vote');
  afterVote(G);
}

function afterVote(G) {
  if (checkWin(G)) return;
  G.phase = 'night';
  G.night = null;
}

function killPlayer(G, id, cause) {
  const p = byId(G, id);
  if (!p || !p.alive) return;
  p.alive = false;
  p.deathDay = G.day;
  p.deathCause = cause;
  if (cause === 'vote' || cause === 'molt') p.revealed = true;
  G.voteHist.push({ by: -1, to: id, day: G.day, cause });
  push(G, { t: 'out', pid: id, role: p.revealed ? p.role : null, cause });
  if (cause === 'vote') {
    push(G, { t: 'sys', text: SYS.voteOut.replace('{who}', p.name) });
    // 遗言
    let words;
    if (p.isPlayer) words = '（你被送出了门。门在身后关上，走廊的灯一盏一盏灭下去。）';
    else words = makeLine(G, p, 'death', { call: p.char.call, who: p.name });
    push(G, { t: 'say', pid: p.isPlayer ? 0 : id, text: words, claim: null, last: true });
  }
}

// ---------------------------------------------------------------- 夜里
function stepNight(G) {
  G.phase = 'night';
  push(G, { t: 'phase', phase: 'night', day: G.day });
  push(G, { t: 'sys', text: SYS.nightFall });

  const me = G.player;
  const pack = alive(G).filter((p) => WOLF_SIDE.has(p.role));
  const wolves = alive(G).filter((p) => p.role === 'eroded' || p.role === 'lurker');

  const n = {
    wolves: wolves.map((p) => p.id),
    victim: null,
    guard: null,
    check: null,
    autopsy: null,
  };

  // 融蚀方今晚的目标（玩家是融蚀方就等玩家选）
  if (me.alive && WOLF_SIDE.has(me.role) && me.role !== 'mole') {
    n.needKill = true;
  } else {
    n.victim = wolfTarget(G, pack);
  }
  // 守夜人
  const watch = alive(G).find((p) => p.role === 'watch');
  if (watch && !watch.isPlayer) n.guard = guardTarget(G, watch);
  if (me.alive && me.role === 'watch') n.needGuard = true;
  // 灵视者
  const seer = alive(G).find((p) => p.role === 'seer');
  if (seer && !seer.isPlayer) n.aiCheck = seer;
  if (me.alive && me.role === 'seer') n.needCheck = true;
  // 解剖助手
  const cor = alive(G).find((p) => p.role === 'coroner');
  if (cor && !cor.isPlayer) n.aiAutopsy = cor;
  if (me.alive && me.role === 'coroner') n.needAutopsy = true;

  G.night = n;

  if (n.needKill || n.needGuard || n.needCheck || n.needAutopsy) {
    const phaseList = ['kill', 'guard', 'check', 'autopsy'].filter((k) => n['need' + k[0].toUpperCase() + k.slice(1)]);
    n.steps = phaseList;
    n.step = 0;
    push(G, { t: 'turn', kind: 'night', sub: phaseList[0] });
    G.phase = 'wait-night';
    return;
  }
  finishNight(G, null);
}

function nextNightStep(G) {
  const n = G.night;
  n.step += 1;
  if (n.step < n.steps.length) {
    push(G, { t: 'turn', kind: 'night', sub: n.steps[n.step] });
    G.phase = 'wait-night';
    return true;
  }
  return false;
}

function finishNight(G, choice) {
  const n = G.night;
  const me = G.player;
  // 玩家刚才那一步
  if (n.steps && n.step < n.steps.length) {
    const sub = n.steps[n.step];
    if (sub === 'kill' && choice != null) n.victim = byId(G, choice);
    if (sub === 'guard' && choice != null) n.guard = byId(G, choice);
    if (sub === 'check' && choice != null) n.check = byId(G, choice);
    if (sub === 'autopsy' && choice != null) n.autopsy = byId(G, choice);
    if (nextNightStep(G)) return;
  }

  // AI 的查验
  if (n.aiCheck) {
    const t = checkTarget(G, n.aiCheck);
    if (t) {
      const res = checkRes(t.role);
      n.aiCheck.checks.push({ to: t.id, res, pub: false });
    }
  }
  if (n.aiAutopsy) {
    const t = autopsyTarget(G, n.aiAutopsy);
    if (t) n.aiAutopsy.checks.push({ to: t.id, res: checkRes(t.role), pub: false, dead: true });
  }
  // 玩家的查验
  if (me.role === 'seer' && n.check) {
    const res = checkRes(n.check.role);
    me.checks.push({ to: n.check.id, res, pub: false });
  }
  if (me.role === 'coroner' && n.autopsy) {
    me.checks.push({ to: n.autopsy.id, res: checkRes(n.autopsy.role), pub: false, dead: true });
  }
  if (me.role === 'watch' && n.guard) me.lastGuard = n.guard.id;

  // 结算
  let died = null;
  if (n.victim && (!n.guard || n.guard.id !== n.victim.id)) died = n.victim;
  G.nightResult = { victim: n.victim ? n.victim.id : null, guard: n.guard ? n.guard.id : null, died: died ? died.id : null };

  // 灯守：还没用过就能把今晚的人拉回来
  const lamp = alive(G).find((p) => p.role === 'lamp' && !p.lampUsed);
  if (died && lamp) {
    if (lamp.isPlayer) {
      G.pendingRevive = died.id;
      push(G, { t: 'turn', kind: 'revive', opts: { victim: died.id } });
      G.phase = 'wait-revive';
      return;
    }
    const value = (died.claimRole && POWER.includes(died.claimRole) ? 40 : 0)
      + (died.isPlayer ? 8 : 0) + hash01(G.seed, lamp.id, died.id, 33) * 30;
    if (value > 26) {
      lamp.lampUsed = true;
      died.alive = true;
      push(G, { t: 'sys', text: SYS.lampSave.replace('{who}', died.name) });
      push(G, { t: 'say', pid: lamp.id, text: '灯还亮着。我把人拉回来了——现在你们知道我是谁了。', claim: 'lamp' });
      G.claims[lamp.id] = 'lamp';
      died = null;
    }
  }

  dawn(G, died);
}

function dawn(G, died) {
  push(G, { t: 'phase', phase: 'dawn', day: G.day });
  if (died) {
    push(G, { t: 'sys', text: SYS.dawnDead.replace('{who}', died.name) });
    died.alive = false;
    died.deathDay = G.day;
    died.deathCause = 'night';
    push(G, { t: 'out', pid: died.id, role: null, cause: 'night' });
  } else if (G.nightResult.guard && G.nightResult.victim && G.nightResult.guard === G.nightResult.victim) {
    push(G, { t: 'sys', text: SYS.dawnNoneProtected });
  } else {
    push(G, { t: 'sys', text: SYS.dawnNone });
  }
  if (checkWin(G)) return;
  G.phase = 'dawn';
  beginDay(G);
}

// ---------------------------------------------------------------- 胜负
function playerFaction(G) {
  const r = G.player.role;
  if (WOLF_SIDE.has(r)) return 'wolf';
  if (r === 'forgotten') return 'forgotten';
  return 'crew';
}

function checkWin(G) {
  const al = alive(G);
  const wolves = al.filter((p) => p.role === 'eroded' || p.role === 'lurker');
  // 只有真正的融蚀体算「追平」的一方：共谋者虽然站在融蚀那边，但它不能杀人，
  // 把它算进人头会让融蚀方凭空多一个身位。
  const others = al.filter((p) => p.role !== 'eroded' && p.role !== 'lurker');
  const forgotten = al.find((p) => p.role === 'forgotten');

  let winner = null;
  if (!wolves.length) winner = 'crew';
  else if (wolves.length >= others.length) winner = 'wolf';
  else if (al.length === 1 && al[0].role === 'forgotten') winner = 'forgotten';

  // 忘却者：活到最后（场上不多于五人）时，才吞得掉别人的胜利
  if (winner && forgotten && winner !== 'forgotten' && al.length <= 5) winner = 'forgotten';
  if (!winner) return false;

  G.over = true;
  G.winner = winner;
  G.phase = 'over';
  const pf = playerFaction(G);
  const playerWin = pf === winner;
  push(G, { t: 'over', winner, playerWin, faction: pf, day: G.day });
  return true;
}

// ---------------------------------------------------------------- 玩家操作
export function submit(G, act) {
  if (!act || G.over) return;
  if (act.type === 'start') { beginDay(G); return; }
  if (act.type === 'talk') { playerTalk(G, act); return; }
  if (act.type === 'vote') {
    if (G.phase !== 'wait-vote') return;
    resolveVote(G, act.target == null ? null : act.target);
    return;
  }
  if (act.type === 'night') {
    if (G.phase !== 'wait-night') return;
    finishNight(G, act.target == null ? null : act.target);
    return;
  }
  if (act.type === 'revive') {
    if (G.phase !== 'wait-revive') return;
    const me = G.player;
    if (act.yes) {
      me.lampUsed = true;
      const p = byId(G, G.pendingRevive);
      if (p) {
        p.alive = true;
        push(G, { t: 'sys', text: SYS.lampSave.replace('{who}', p.name) });
      }
      G.claims[me.id] = 'lamp';
      me.claimRole = 'lamp';
      push(G, { t: 'say', pid: 0, text: '灯还亮着。我把人拉回来了。', claim: 'lamp' });
      G.pendingRevive = null;
      push(G, { t: 'phase', phase: 'dawn', day: G.day });
      if (checkWin(G)) return;
      beginDay(G);
      return;
    }
    G.pendingRevive = null;
    const victim = byId(G, G.nightResult.died);
    push(G, { t: 'phase', phase: 'dawn', day: G.day });
    if (victim) {
      victim.alive = false;
      push(G, { t: 'sys', text: SYS.dawnDead.replace('{who}', victim.name) });
      push(G, { t: 'out', pid: victim.id, role: null, cause: 'night' });
    } else {
      push(G, { t: 'sys', text: SYS.dawnNone });
    }
    if (checkWin(G)) return;
    beginDay(G);
    return;
  }
}

// 玩家这一轮说什么
function playerTalk(G, act) {
  const me = G.player;
  if (!me.alive) return;
  const rnd = G.rnd;
  const say = KEEPER.say;
  const pickLine = (arr, ctx) => KEEPER_FILL(arr[Math.floor(rnd() * arr.length)], ctx);

  if (act.kind === 'claim' && act.role) {
    G.claims[0] = act.role;
    me.claimRole = act.role;
    push(G, { t: 'say', pid: 0, text: pickLine(say.claim, { role: ROLES[act.role].zh }), claim: act.role });
    me.talk = (me.talk || 0) + 1;
  } else if (act.kind === 'accuse' && act.target != null) {
    const t = byId(G, act.target);
    if (t) {
      G.acc.push({ by: 0, to: t.id, day: G.day, round: G.round });
      push(G, { t: 'say', pid: 0, text: pickLine(say.accuse, { who: t.name }), claim: null });
      me.talk = (me.talk || 0) + 1;
    }
  } else if (act.kind === 'defend' && act.target != null) {
    const t = byId(G, act.target);
    if (t) {
      G.def.push({ by: 0, to: t.id, day: G.day });
      push(G, { t: 'say', pid: 0, text: pickLine(say.defend, { who: t.name }), claim: null });
      me.talk = (me.talk || 0) + 1;
    }
  } else if (act.kind === 'report' && act.target != null) {
    const res = act.res === 'eroded' ? 'eroded' : (act.res === 'void' ? 'void' : 'clean');
    const t = byId(G, act.target);
    if (!G.claims[0]) { G.claims[0] = me.role; me.claimRole = me.role; }
    G.reports.push({ by: 0, to: t.id, res, day: G.day, round: G.round });
    const line = res === 'eroded'
      ? (me.role === 'coroner' ? '我验过{who}。他的血是黑的。' : '我查过{who}。他体内有黑液。')
      : res === 'void'
        ? (me.role === 'coroner' ? '我验过{who}。他是空的。' : '我看过{who}——里面什么也没有，他不是人。')
        : (me.role === 'coroner' ? '我验过{who}。他是干净的。' : '我看过{who}——他是干净的。');
    push(G, { t: 'say', pid: 0, text: KEEPER_FILL(line, { who: t.name }), claim: me.role });
    const c = (me.checks || []).find((x) => x.to === t.id && !x.pub);
    if (c) c.pub = true;
    me.talk = (me.talk || 0) + 1;
  } else {
    me.talk = (me.talk || 0) + 1;
    push(G, { t: 'say', pid: 0, text: pickLine(say.idle, {}), claim: null });
  }
  // 说完继续这一轮
  G.phase = 'discuss';
  fill(G);
}

// 界面用：玩家现在有哪些夜间选项 / 投票选项
export function nightOptions(G) {
  const n = G.night;
  if (!n || G.phase !== 'wait-night') return null;
  const sub = n.steps ? n.steps[n.step] : null;
  const me = G.player;
  if (sub === 'kill') {
    return {
      sub, title: '今夜，融蚀谁？', hint: '你和同伙一起动手。挑一个最像威胁的人。',
      list: alive(G).filter((p) => !WOLF_SIDE.has(p.role)).map((p) => p.id),
      optional: false,
    };
  }
  if (sub === 'guard') {
    return {
      sub, title: '今夜守谁？', hint: me.lastGuard != null ? '不能连着两晚守同一个人。' : '守对了，他今晚就不会死。',
      list: alive(G).filter((p) => p.id !== me.lastGuard).map((p) => p.id),
      optional: false,
    };
  }
  if (sub === 'check') {
    const done = new Set((me.checks || []).map((c) => c.to));
    return {
      sub, title: '观测谁？', hint: '你能看见他体内有没有黑液。',
      list: alive(G).filter((p) => p.id !== 0 && !done.has(p.id)).map((p) => p.id),
      optional: false,
    };
  }
  if (sub === 'autopsy') {
    const done = new Set((me.checks || []).map((c) => c.to));
    return {
      sub, title: '查验哪一具尸体？', hint: '死人不会说谎。',
      list: G.players.filter((p) => !p.alive && !p.revealed && !done.has(p.id)).map((p) => p.id),
      optional: false,
    };
  }
  return null;
}

// 界面用：玩家手上还没公开的查验结果
export function playerFindings(G) {
  return (G.player.checks || []).filter((c) => !c.pub);
}
