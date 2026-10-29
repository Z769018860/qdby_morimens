// 弥萨格狼人杀：全局状态机
//
// 界面只做两件事：把 nextEvent() 吐出来的事件画出来，把玩家的选择交给 submit()。
// 规则在这里，脑子在 ai.js，话在 lines.js。
//
// 事件类型：
//   {t:'phase', phase, day}            昼夜切换
//   {t:'sys', text, tone}             广播 / 旁白
//   {t:'say', pid, text, claim, stance, why, last}
//   {t:'turn', kind, sub, opts}       等玩家操作：start/talk/vote/night/revive/chain
//   {t:'tally', votes, tied}          投票明细
//   {t:'out', pid, role, cause}       出局（role 为 null 表示身份不明）
//   {t:'over', winner, playerWin}     结束

import { ROLES, CHARS, DIFFS, SYS, DAY_LEAD, KEEPER, WOLF_SIDE, KILLERS, WHISPER_MAX } from './data.js';
import { mulberry32, shuffle, alive, byId } from './util.js';
import {
  aiStatement, aiVote, isAlly, say, packVote, wolfTarget, guardTarget,
  checkTarget, autopsyTarget, whisperTarget, lampWorthy, chainPick, callResponders,
} from './ai.js';

// 灵视 / 验尸看到的东西
function checkRes(role) {
  if (role === 'whisper' || role === 'eroded' || role === 'lurker') return 'eroded';
  if (role === 'forgotten') return 'void';
  return 'clean';   // 共谋者被看成清醒——这是它的价值
}

const KEEPER_FILL = (s, ctx) => String(s)
  .replace(/\{who\}/g, ctx.who || '你')
  .replace(/\{role\}/g, ctx.role || '清醒者');
// 系统文案有的是字符串、有的是池子，取句前统一成数组
const oneOr = (v) => (Array.isArray(v) ? v : (v == null ? [] : [v]));

// ---------------------------------------------------------------- 开局
export function createGame(opt) {
  const diff = DIFFS.find((d) => d.k === (opt && opt.diff)) || DIFFS[1];
  const seed = (opt && opt.seed) || (Math.floor(Math.random() * 0xffffffff) >>> 0);
  const rnd = mulberry32(seed);

  // 先抽人，再发牌：守密人固定坐 0 号位
  const roster = shuffle(CHARS, rnd).slice(0, diff.players - 1);
  const players = [{
    id: 0, isPlayer: true, name: '守密人',
    char: { zh: '守密人', tone: 'cold', call: '守密人', say: null, realm: '' },
    alive: true, revealed: false, talk: 0, lastLine: '', checks: [], given: [],
  }];
  roster.forEach((c, i) => {
    players.push({
      id: i + 1, isPlayer: false, name: c.zh, char: c, alive: true,
      revealed: false, talk: 0, lastLine: '', checks: [], given: [],
    });
  });

  const roles = shuffle(diff.roles, rnd);
  players.forEach((p, i) => {
    // 兜底：难度表的牌数比人数少时不该崩，多出来的人当清醒者
    p.role = roles[i] || 'crew';
    p.faction = WOLF_SIDE.has(p.role) ? 'wolf' : (p.role === 'forgotten' ? 'forgotten' : 'crew');
    p.claimRole = null;
  });

  // 双子互认（只有一只 twin 的时候不该崩）
  const twins = players.filter((p) => p.role === 'twin');
  twins.forEach((p) => {
    const other = twins.find((q) => q !== p);
    if (other) p.twinId = other.id;
  });

  const G = {
    seed, rnd, diff, diffKey: diff.k, players, queue: [],
    day: 0, round: 0, phase: 'brief', si: 0, speakers: [],
    claims: {}, claimHist: [], reports: [], acc: [], def: [], voteHist: [],
    calls: [], callDay: {},
    votes: {}, preVotes: null, packTarget: null, runoff: false, waitingStart: true,
    night: null, pendingRevive: null, pendingChain: null, silenceMap: {},
    winner: null, over: false, recentSaid: [], silenced: null,
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
  G.preVotes = null;
  push(G, { t: 'phase', phase: 'day', day: G.day });
  push(G, { t: 'sys', text: DAY_LEAD[Math.min(G.day - 1, DAY_LEAD.length - 1)] });
  startRound(G);
}

function startRound(G) {
  G.speakers = shuffle(alive(G).map((p) => p.id), G.rnd);
  G.si = 0;
}

// 桌上有人报了身份（或报了查验），旁人不一定忍得住——接一句能让「有人在听」这件事成立。
// 一天最多两次，否则整局就是一片附和声。
function bystander(G, about, chance) {
  if (!about || G.rnd() > chance) return;
  G.commentDay = G.commentDay || {};
  if ((G.commentDay[G.day] || 0) >= 2) return;
  const others = alive(G).filter((x) => x.id !== about.id && !x.isPlayer);
  if (!others.length) return;
  const q = others[Math.floor(G.rnd() * others.length)];
  G.commentDay[G.day] = (G.commentDay[G.day] || 0) + 1;
  q.talk = (q.talk || 0) + 1;
  push(G, {
    t: 'say', pid: q.id, stance: 'comment',
    text: say(G, q, 'comment', {
      who: about.name,
      role: about.claimRole && ROLES[about.claimRole] ? ROLES[about.claimRole].zh : '',
    }),
  });
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
      push(G, {
        t: 'say', pid: p.id, text: a.text, claim: a.claim || null,
        stance: a.stance || a.kind, why: a.why || null, act: a.kind,
      });
    }
    // 他要是刚报了什么，桌上会有人当场评一句
    const big = acts.find((a) => a.claim || a.kind === 'report');
    if (big) bystander(G, p, big.claim ? 0.5 : 0.34);
    return;
  }
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
  // 融蚀方先开个会：这一票投谁
  G.packTarget = packVote(G, null);
  // 第一遍：各自打算投谁；据此算出「大盘」在谁身上
  for (const p of alive(G)) {
    if (p.isPlayer) continue;
    G.votes[p.id] = aiVote(G, p);
  }
  const first = tally(G.votes);
  G.preVotes = { lead: first.top.length === 1 ? first.top[0] : (first.top[0] || null) };
  // 第二遍：知道大盘之后，愿意跟票的人改票（避免把票投废）
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

// 出局（投票或夜里）。投票出局要翻牌 + 遗言。
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
    let words;
    if (p.isPlayer) words = '（你被送出了门。门在身后关上，走廊的灯一盏一盏灭下去。）';
    else words = say(G, p, 'death', { who: p.name, faction: p.role === 'forgotten' ? 'third' : (WOLF_SIDE.has(p.role) ? 'wolf' : 'crew') });
    push(G, { t: 'say', pid: p.isPlayer ? 0 : id, text: words, claim: null, last: true, stance: 'last' });
  }
}

// 投票结算。target = 玩家投的人（null = 弃票）
function resolveVote(G, target) {
  const votes = Object.assign({}, G.votes);
  if (G.player.alive) votes[0] = target != null ? target : null;
  const { top } = tally(votes);
  push(G, { t: 'tally', votes, tied: top.length > 1 ? top : null });

  // 一个人都没投出来（全场弃票）：没人出门，直接进夜里
  if (!top.length) { afterVote(G); return; }

  if (top.length !== 1) {
    if (!G.runoff && top.length > 1) {
      G.runoff = true;
      G.tied = top;
      push(G, { t: 'sys', text: '票数平了。有人提议再投一次——只在票数最高的几个人里选。' });
      const pool = top.map((id) => byId(G, id)).filter(Boolean);
      G.votes = {};
      G.packTarget = packVote(G, pool);
      for (const p of alive(G)) {
        if (p.isPlayer) continue;
        G.votes[p.id] = aiVote(G, p, pool);
      }
      push(G, { t: 'turn', kind: 'vote', opts: { tied: top } });
      G.phase = 'wait-vote';
      return;
    }
    const pickId = top[Math.floor(G.rnd() * top.length)];
    push(G, { t: 'sys', text: '还是平票。最后只能抽签——被抽中的人自己站起来，往门口走。' });
    sentOut(G, pickId, afterVote);
    return;
  }
  sentOut(G, top[0], afterVote);
}

// 「送一个人出门」的通用结算：潜伏者蜕壳、链缚者拖人
function sentOut(G, id, done) {
  const p = byId(G, id);
  if (!p) { done(G); return; }
  if (p.role === 'lurker' && !p.molted) {
    p.molted = true;
    p.revealed = true;
    push(G, { t: 'out', pid: id, role: 'lurker', cause: 'molt' });
    push(G, { t: 'sys', text: SYS.lurkerMolt.replace('{who}', p.name) });
    if (!p.isPlayer) {
      push(G, { t: 'say', pid: id, text: '……被看见了。那就没必要再披着这张皮了。', claim: null, stance: 'taunt' });
    }
    done(G);
    return;
  }
  killPlayer(G, id, 'vote');
  // 链缚者：被投出去时能把一个人一起拖走
  if (p.role === 'chain' && !p.chainUsed) {
    p.chainUsed = true;
    const cands = alive(G).filter((q) => q.id !== id);
    if (!cands.length) { done(G); return; }
    if (p.isPlayer) {
      G.pendingChain = { by: id };
      push(G, { t: 'turn', kind: 'chain', opts: { list: cands.map((q) => q.id) } });
      G.phase = 'wait-chain';
      return;
    }
    const t = chainPick(G, p);
    const q = byId(G, t) || cands[0];
    push(G, { t: 'sys', text: SYS.chainPull.replace('{who}', p.name).replace('{to}', q.name) });
    killPlayer(G, q.id, 'vote');
    done(G);
    return;
  }
  done(G);
}

function afterVote(G) {
  if (checkWin(G)) return;
  G.phase = 'night';
  G.night = null;
}

// ---------------------------------------------------------------- 夜里
function stepNight(G) {
  G.phase = 'night';
  push(G, { t: 'phase', phase: 'night', day: G.day });
  push(G, { t: 'sys', text: SYS.nightFall });

  const me = G.player;
  const n = { wolves: [], victim: null, guard: null, check: null, autopsy: null, silence: null };

  const killers = alive(G).filter((p) => KILLERS.has(p.role));
  n.wolves = killers.map((p) => p.id);
  if (me.alive && KILLERS.has(me.role)) n.needKill = true;
  else n.victim = wolfTarget(G);

  const whisper = alive(G).find((p) => p.role === 'whisper');
  if (whisper) {
    if (whisper.isPlayer) {
      if ((me.whisperDone || []).length < WHISPER_MAX) n.needSilence = true;
    } else if ((whisper.whisperDone || []).length < WHISPER_MAX) {
      const target = whisperTarget(G, whisper);
      if (target) {
        n.silence = target.id;
        whisper.whisperDone = whisper.whisperDone || [];
        whisper.whisperDone.push(target.id);
      }
    }
  }

  const watch = alive(G).find((p) => p.role === 'watch');
  if (watch && !watch.isPlayer) n.guard = guardTarget(G, watch);
  if (me.alive && me.role === 'watch') n.needGuard = true;

  const seer = alive(G).find((p) => p.role === 'seer');
  if (seer && !seer.isPlayer) n.aiCheck = seer;
  if (me.alive && me.role === 'seer') n.needCheck = true;

  const cor = alive(G).find((p) => p.role === 'coroner');
  if (cor && !cor.isPlayer) n.aiAutopsy = cor;
  if (me.alive && me.role === 'coroner') n.needAutopsy = true;

  G.night = n;

  const order = ['silence', 'kill', 'guard', 'check', 'autopsy'].filter((k) => n['need' + k[0].toUpperCase() + k.slice(1)]);
  if (order.length) {
    n.steps = order;
    n.step = 0;
    push(G, { t: 'turn', kind: 'night', sub: order[0] });
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
  if (n.steps && n.step < n.steps.length) {
    const sub = n.steps[n.step];
    if (sub === 'kill' && choice != null) n.victim = byId(G, choice);
    if (sub === 'guard' && choice != null) n.guard = byId(G, choice);
    if (sub === 'check' && choice != null) n.check = byId(G, choice);
    if (sub === 'autopsy' && choice != null) n.autopsy = byId(G, choice);
    if (sub === 'silence' && choice != null) {
      n.silence = choice;
      me.whisperDone = me.whisperDone || [];
      me.whisperDone.push(choice);
    }
    if (nextNightStep(G)) return;
  }

  // AI 的查验
  if (n.aiCheck) {
    const t = checkTarget(G, n.aiCheck);
    if (t) n.aiCheck.checks.push({ to: t.id, res: checkRes(t.role), pub: false });
  }
  if (n.aiAutopsy) {
    const t = autopsyTarget(G, n.aiAutopsy);
    if (t) n.aiAutopsy.checks.push({ to: t.id, res: checkRes(t.role), pub: false, dead: true });
  }
  // 玩家的查验
  if (me.role === 'seer' && n.check) me.checks.push({ to: n.check.id, res: checkRes(n.check.role), pub: false });
  if (me.role === 'coroner' && n.autopsy) me.checks.push({ to: n.autopsy.id, res: checkRes(n.autopsy.role), pub: false, dead: true });
  if (me.role === 'watch' && n.guard) me.lastGuard = n.guard.id;

  // 低语：谁今晚张不开嘴
  G.silenced = null;
  if (n.silence != null) {
    G.silenced = n.silence;
    const p = byId(G, n.silence);
    if (p) p.silencedDay = G.day + 1;
  }

  // 结算
  let died = null;
  if (n.victim && (!n.guard || n.guard.id !== n.victim.id)) died = n.victim;
  G.nightResult = {
    victim: n.victim ? n.victim.id : null,
    guard: n.guard ? n.guard.id : null,
    died: died ? died.id : null,
  };

  // 灯守：一生一次，把今晚的人拉回来
  const lamp = alive(G).find((p) => p.role === 'lamp' && !p.lampUsed);
  if (died && lamp) {
    if (lamp.isPlayer) {
      G.pendingRevive = died.id;
      push(G, { t: 'turn', kind: 'revive', opts: { victim: died.id } });
      G.phase = 'wait-revive';
      return;
    }
    if (lampWorthy(G, lamp, died) > 28) {
      lamp.lampUsed = true;
      died.alive = true;
      push(G, { t: 'sys', text: SYS.lampSave.replace('{who}', died.name) });
      G.claims[lamp.id] = 'lamp';
      G.claimHist.push({ id: lamp.id, role: 'lamp', day: G.day + 1, round: 0 });
      push(G, {
        t: 'say', pid: lamp.id, stance: 'claim', claim: 'lamp',
        text: say(G, lamp, 'claim', { role: ROLES.lamp.zh, roleKey: 'lamp' }),
      });
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

  // 天亮之后，桌上会有人开口——这是免费的线索（也可能会被利用）
  const sit = died ? 'dead' : 'safe';
  const talkers = alive(G).filter((p) => !p.isPlayer);
  const pickN = Math.min(2, talkers.length);
  const shuffled = talkers.slice().sort(() => G.rnd() - 0.5).slice(0, pickN);
  for (const p of shuffled) {
    push(G, { t: 'say', pid: p.id, text: say(G, p, 'react', { sit }), stance: 'react' });
  }

  if (checkWin(G)) return;
  G.phase = 'dawn';
  beginDay(G);
}

// ---------------------------------------------------------------- 胜负
export function playerFaction(G) {
  const r = G.player.role;
  if (WOLF_SIDE.has(r)) return 'wolf';
  if (r === 'forgotten') return 'forgotten';
  return 'crew';
}

function checkWin(G) {
  const al = alive(G);
  // 融蚀方 = 融蚀体 / 潜伏者 / 低语者 / 共谋者 全算（他们都是「那边的人」）
  const wolfSide = al.filter((p) => WOLF_SIDE.has(p.role));
  // 清醒方阵营不含忘却者：它谁也不帮
  const crewSide = al.filter((p) => !WOLF_SIDE.has(p.role) && p.role !== 'forgotten');
  // 追平只数会动手的：共谋者与低语者不占刀口，算进人头会让融蚀方凭空快一步
  const killers = al.filter((p) => KILLERS.has(p.role));
  const forgotten = al.find((p) => p.role === 'forgotten');

  let winner = null;
  // 清醒方的目标是把「会动手的东西」清干净：融蚀体与潜伏者。
  // 低语者与共谋者不动手——刀都折了，它们再折腾也杀不死人，所以不挡胜负。
  if (!killers.length) winner = 'crew';
  else if (!crewSide.length) winner = 'wolf';
  else if (killers.length >= crewSide.length) winner = 'wolf';
  else if (al.length === 1 && al[0].role === 'forgotten') winner = 'forgotten';

  // 忘却者：只要在「最后一刻」还活着，就能把别人的胜利吞掉
  if (winner && forgotten && winner !== 'forgotten' && al.length <= 4) winner = 'forgotten';
  if (!winner) return false;

  G.over = true;
  G.winner = winner;
  G.phase = 'over';
  const pf = playerFaction(G);
  push(G, { t: 'over', winner, playerWin: pf === winner, faction: pf, day: G.day });
  return true;
}

// ---------------------------------------------------------------- 玩家操作
export function submit(G, act) {
  if (!act || G.over) return;
  if (act.type === 'start') { beginDay(G); return; }
  if (act.type === 'talk') { playerTalk(G, act); return; }
  if (act.type === 'vote') {
    if (G.phase !== 'wait-vote') return;
    // 守密人投票也有一句话，别让玩家像个哑巴——顺便把 vote 池子用起来
    if (act.target != null && G.player.alive) {
      const t = byId(G, act.target);
      if (t) {
        push(G, { t: 'say', pid: 0, text: keeperPick(G, KEEPER.say.vote, { who: t.name }, true), stance: 'vote' });
      }
    }
    resolveVote(G, act.target == null ? null : act.target);
    return;
  }
  if (act.type === 'night') {
    if (G.phase !== 'wait-night') return;
    finishNight(G, act.target == null ? null : act.target);
    return;
  }
  if (act.type === 'chain') {
    if (G.phase !== 'wait-chain') return;
    const q = byId(G, act.target);
    G.pendingChain = null;
    if (q && q.alive) {
      push(G, { t: 'say', pid: 0, stance: 'taunt', text: '链子的另一头……我早就选好了。' });
      push(G, { t: 'sys', text: SYS.chainPull.replace('{who}', G.player.name).replace('{to}', q.name) });
      killPlayer(G, q.id, 'vote');
    }
    G.phase = 'wait-vote';
    afterVote(G);
    return;
  }
  if (act.type === 'revive') {
    if (G.phase !== 'wait-revive') return;
    const me = G.player;
    const victimId = G.pendingRevive;
    G.pendingRevive = null;
    push(G, { t: 'phase', phase: 'dawn', day: G.day });
    if (act.yes) {
      me.lampUsed = true;
      const p = byId(G, victimId);
      if (p) {
        p.alive = true;
        push(G, { t: 'sys', text: SYS.lampSave.replace('{who}', p.name) });
      }
      G.claims[me.id] = 'lamp';
      G.claimHist.push({ id: me.id, role: 'lamp', day: G.day + 1, round: 0 });
      push(G, { t: 'say', pid: 0, text: '灯还亮着。我把人拉回来了。', claim: 'lamp', stance: 'claim' });
    } else {
      const victim = byId(G, victimId);
      if (victim) {
        victim.alive = false;
        push(G, { t: 'sys', text: SYS.dawnDead.replace('{who}', victim.name) });
        push(G, { t: 'out', pid: victim.id, role: null, cause: 'night' });
      } else {
        push(G, { t: 'sys', text: SYS.dawnNone });
      }
    }
    if (checkWin(G)) return;
    beginDay(G);
    return;
  }
}

// 守密人自己说的话也记账：一局里同一句不会说第二遍。
// （原来纯 random，四句 accuse 说到第三次就必然重复。）
// 池子被点空了就借 S.spare 的通用句（不带人名、不带立场），而不是原样复读。
export function keeperPick(G, arr, ctx, borrow) {
  const me = G.player;
  const mine = me.keepSaid || (me.keepSaid = new Set());
  let use = arr.filter((x) => !mine.has(x));
  if (!use.length && borrow) use = oneOr(KEEPER.say.spare).filter((x) => !mine.has(x));
  if (!use.length) use = arr;
  const s = use[Math.floor(G.rnd() * use.length)];
  mine.add(s);
  return KEEPER_FILL(s, ctx || {});
}

function playerTalk(G, act) {
  const me = G.player;
  if (!me.alive) return;
  const rnd = G.rnd;
  const S = KEEPER.say;
  const pickLine = (arr, ctx, borrow) => keeperPick(G, arr, ctx, borrow);

  // 被低语过：今天张不开嘴。说什么都会被吞掉，所以直接把这一轮咽下去。
  if (me.silencedDay === G.day && act.kind !== 'idle') {
    me.talk = (me.talk || 0) + 1;
    push(G, { t: 'say', pid: 0, text: pickLine(oneOr(SYS.silenceSelf), {}), stance: 'silent' });
    G.phase = 'discuss';
    fill(G);
    return;
  }

  if (act.kind === 'claim' && act.role) {
    G.claims[0] = act.role;
    me.claimRole = act.role;
    G.claimHist.push({ id: 0, role: act.role, day: G.day, round: G.round });
    push(G, {
      t: 'say', pid: 0, text: pickLine(S.claim, { role: ROLES[act.role].zh }),
      claim: act.role, stance: 'claim',
    });
    me.talk = (me.talk || 0) + 1;
    // 你自己报了牌，桌上会有人接一句
    bystander(G, me, 0.55);
  } else if (act.kind === 'accuse' && act.target != null) {
    const t = byId(G, act.target);
    if (t) {
      G.acc.push({ by: 0, to: t.id, day: G.day, round: G.round });
      push(G, { t: 'say', pid: 0, text: pickLine(S.accuse, { who: t.name }, true), stance: 'accuse' });
      me.talk = (me.talk || 0) + 1;
    }
  } else if (act.kind === 'defend' && act.target != null) {
    const t = byId(G, act.target);
    if (t) {
      G.def.push({ by: 0, to: t.id, day: G.day });
      push(G, { t: 'say', pid: 0, text: pickLine(S.defend, { who: t.name }, true), stance: 'defend' });
      me.talk = (me.talk || 0) + 1;
    }
  } else if (act.kind === 'report' && act.target != null) {
    const res = act.res === 'eroded' ? 'eroded' : (act.res === 'void' ? 'void' : 'clean');
    const t = byId(G, act.target);
    if (t) {
      if (!G.claims[0]) {
        G.claims[0] = me.role;
        me.claimRole = me.role;
        G.claimHist.push({ id: 0, role: me.role, day: G.day, round: G.round });
      }
      G.reports.push({ by: 0, to: t.id, res, day: G.day, round: G.round });
      // 报查验的说法也从池子里抽（并且不重复）——原来是一句写死的话，一局能说三遍
      const verb = me.role === 'coroner' ? '验' : '查';
      const pool = res === 'eroded' ? S.reportWolf : (res === 'void' ? S.reportVoid : S.reportClean);
      const line = pickLine(pool, { who: t.name }).replace(/\{verb\}/g, verb);
      push(G, {
        t: 'say', pid: 0, text: KEEPER_FILL(line, { who: t.name }), claim: me.role,
        stance: res === 'eroded' ? 'reportWolf' : (res === 'void' ? 'reportVoid' : 'reportClean'),
        why: res === 'eroded' ? '我验出的结果是融蚀' : (res === 'void' ? '我验出的结果是空白' : '我验出的结果是干净'),
      });
      const c = (me.checks || []).find((x) => x.to === t.id && !x.pub);
      if (c) c.pub = true;
      me.talk = (me.talk || 0) + 1;
    }
  } else if (act.kind === 'call') {
    // 号召：一天只能喊一次，喊完桌上会有人应声、有人对跳、有人推脱
    if (G.callDay[G.day]) {
      me.talk = (me.talk || 0) + 1;
      push(G, { t: 'say', pid: 0, text: pickLine(S.idle, {}, true), stance: 'idle' });
    } else {
      G.callDay[G.day] = true;
      G.calls.push({ by: 0, day: G.day, round: G.round });
      push(G, { t: 'say', pid: 0, text: pickLine(S.call, {}), stance: 'call' });
      me.talk = (me.talk || 0) + 1;
      let stepped = 0;
      for (const r of callResponders(G)) {
        const p = byId(G, r.pid);
        if (!p || !p.alive) continue;
        for (const a of r.acts) {
          if (a.kind === 'claim') stepped += 1;
          p.talk = (p.talk || 0) + 1;
          push(G, {
            t: 'say', pid: p.id, text: a.text, claim: a.claim || null,
            stance: a.stance || a.kind, why: a.why || null, act: a.kind,
          });
        }
      }
      push(G, {
        t: 'say', pid: 0, stance: 'idle',
        text: pickLine(stepped ? S.callEnd : S.callNone, {}),
      });
    }
  } else {
    me.talk = (me.talk || 0) + 1;
    push(G, { t: 'say', pid: 0, text: pickLine(S.idle, {}, true), stance: 'idle' });
  }
  G.phase = 'discuss';
  fill(G);
}

// 界面用：玩家今天还能不能号召（一天一次）
export function canCall(G) {
  return !!(G && !G.over && G.player.alive && !(G.callDay && G.callDay[G.day]));
}

// 界面用：玩家现在有哪些夜间选项
export function nightOptions(G) {
  const n = G.night;
  if (!n || G.phase !== 'wait-night') return null;
  const sub = n.steps ? n.steps[n.step] : null;
  const me = G.player;

  if (sub === 'silence') {
    const done = me.whisperDone || [];
    return {
      sub, title: '今夜，对谁说那句话？',
      hint: `被低语的人明天说不出话，也公布不了查验。同一个人只能低语一次；你一共只有 ${WHISPER_MAX} 次（已用 ${done.length} 次）。`,
      list: alive(G).filter((p) => p.id !== 0 && !done.includes(p.id) && !WOLF_SIDE.has(p.role)).map((p) => p.id),
      optional: true,
    };
  }
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

// 界面用：这一局谁跟谁有交情（结算时复盘）
export function relTable(G) {
  return G.players.filter((p) => !p.isPlayer).map((p) => p.name);
}
