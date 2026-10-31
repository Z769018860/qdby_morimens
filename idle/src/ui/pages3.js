// Weekly boss, realm towers, arena
import { REALMS } from '../core/constants.js';
import { weeklyState, weeklyBoss, MILESTONES, WEEKLY_DAILY, WEEKLY_ROUNDS, weekId, weeklyEnemy } from '../core/weekly.js';
import { REALM_TOWERS, TOWER_NAME, rtBest, rtTeam, rtEnemies, rtStage, rtInfo } from '../core/rtower.js';
import { arenaState, arenaTries, ARENA_DAILY, LADDER, dailyRankReward, canClaimArenaDaily, hydrate } from '../core/arena.js';
import { RIFT_FLOORS, RIFT_TEAMS, RIFT_DAILY, RIFT_RUN_MAX, RIFT_PASS, RIFT_MILESTONES, riftCycle, riftState, riftParty, riftEnemies, riftStage } from '../core/rift.js';
import { encodeCode } from '../core/friend.js';
import { teamDefs } from '../core/game.js';
import { teamSlugsFor, rtModeOf, squadKeyFor, withLoadout } from '../core/squad.js';
import { squadBar } from './pages.js';
import { esc, img, fmt, openModal, rewardText } from './util.js';
import { meterHtml, trialSection } from './pages2.js';
import { reportHtml } from './report.js';
import { analyzeBattle } from '../core/report.js';

import { intentIcon } from './codex.js';

const REWARD = rewardText;
const daysLeft = () => { const d = new Date(); const n = d.getUTCDay() || 7; return 8 - n; };

/* ---------- weekly boss ---------- */
export function weeklyPage(app) {
  const { state: s, data } = app;
  const w = weeklyState(s), boss = weeklyBoss(data), e = weeklyEnemy(data);
  // 战力和人数都按「周 Boss 指定的那套阵容」算，别拿当前队伍糊弄人
  const t = withLoadout(s, squadKeyFor(s, 'weekly'), () => teamDefs(s, data, teamSlugsFor(s, 'weekly')));
  const row = (m, i) => {
    const done = w.damage >= m.dmg, got = w.claimed.includes(i);
    return `<div class="ach ${done ? 'done' : ''}"><div class="ab"><b>累计伤害 ${fmt(m.dmg)}</b><div class="bar"><i style="width:${Math.min(100, (w.damage / m.dmg) * 100)}%"></i></div>
      <small>奖励：${REWARD(m)}${m.item ? '　装备 ×1' : ''}${m.order ? '　钥令 ×1' : ''}</small></div>
      <button class="btn sm ${done && !got ? 'gold' : ''}" data-act="weekly-claim" data-i="${i}" ${done && !got ? '' : 'disabled'}>${got ? '已领取' : done ? '领取' : '未达成'}</button></div>`;
  };
  // 一共 56 档：只摆「能领的 + 接下来 4 档」，已领的和更远的折起来
  const ready = [], claimed = [], later = [];
  let nextShown = 0;
  MILESTONES.forEach((m, i) => {
    if (w.claimed.includes(i)) claimed.push(i);
    else if (w.damage >= m.dmg) ready.push(i);
    else if (nextShown < 4) { ready.push(i); nextShown++; } else later.push(i);
  });
  const claimable = MILESTONES.filter((m, i) => w.damage >= m.dmg && !w.claimed.includes(i)).length;
  const fold = (title, ids) => (ids.length ? `<details class="wkfold"><summary>${title}（${ids.length} 档）</summary><div class="list">${ids.map((i) => row(MILESTONES[i], i)).join('')}</div></details>` : '');
  const rows = `${claimable ? `<div class="row"><button class="btn gold" data-act="weekly-claim-all">一键领取 ${claimable} 档</button></div>` : ''}
    <div class="list">${ready.map((i) => row(MILESTONES[i], i)).join('')}</div>
    ${fold('已领取', claimed)}${fold(`更高的档位（最高累计伤害 ${fmt(MILESTONES[MILESTONES.length - 1].dmg)}）`, later)}`;
  return `<div class="page"><h2>周 Boss <small>${weekId()} · 本周剩余约 ${daysLeft()} 天 · 出战战力 ${fmt(t.power)}</small></h2>
    ${squadBar(app, 'weekly')}
    <div class="banner-card wk"><img src="${img(boss.img)}" alt=""><div><h3>${esc(boss.zh)}</h3>
      <p class="hint">${esc(boss.desc)}</p>
      <p>本周累计伤害 <b>${fmt(w.damage)}</b>　单次最高 <b>${fmt(w.best)}</b>　今日剩余 <b>${w.tries}/${WEEKLY_DAILY}</b></p>
      <div class="seq">${e.skills.map((x) => `<span>${intentIcon(x.ic, 18)}${esc(x.name)}</span>`).join('')}</div>
      <p class="hint">每次挑战只打 ${WEEKLY_ROUNDS} 回合，Boss 血量近乎无限，比拼的是这段时间能打出多少伤害；全队倒下则提前结束。每周一（UTC）换新 Boss、清空累计。</p>
      <div class="row"><button class="btn big gold" data-act="weekly-go" ${w.tries > 0 ? '' : 'disabled'}>${w.tries > 0 ? '挑战周 Boss' : '今日次数已用完'}</button>
      <button class="btn" data-act="monster" data-id="${boss.id}">查看出招</button></div></div></div>
    <h3>累计伤害奖励</h3>${rows}</div>`;
}
export function weeklyResultModal(app, r) {
  const names = r.team.list.map((d) => d.name);
  openModal(`<h3>周 Boss · ${esc(r.boss.zh)}</h3>
    <p>本次伤害 <b>${fmt(r.dmg)}</b>${r.newBest ? ' <em class="new">本周最高</em>' : ''}　本周累计 <b>${fmt(r.week.damage)}</b></p>
    ${reportHtml(analyzeBattle(r, r.team.list, [{ name: r.boss.zh, img: r.boss.img, hp: 1e12, boss: true }]))}<p class="hint">累计伤害达到里程碑后回到页面领取奖励。</p>`, 'wide');
}

/* ---------- realm towers ---------- */
export function rtowerPage(app) {
  const { state: s, data } = app;
  const cards = REALM_TOWERS.map((realm) => {
    // 四座塔各记一份出战阵容：混沌塔用混沌队，深海塔用深海队
    const mode = rtModeOf(realm), pick = teamSlugsFor(s, mode);
    const best = rtBest(s, realm), team = withLoadout(s, squadKeyFor(s, mode), () => rtTeam(s, data, realm, pick)), next = best + 1;
    const foes = rtEnemies(realm, next, data);
    const R = REALMS[realm];
    return `<div class="banner-card rt" style="--rc:${R.color}"><h3 style="color:${R.color}">${TOWER_NAME[realm]} <small>${R.zh}界域</small></h3>
      ${squadBar(app, mode, `${R.zh}塔只取编队里${R.zh}界域的成员`)}
      <p>已通关 <b>${best}</b> 层　下一层（第 ${next} 层${rtInfo(next).reward ? ' · 🐈 校猫奖励层' : next % 10 === 0 ? ' · BOSS' : next % 5 === 0 ? ' · 精英' : ''}，强度≈第 ${rtStage(next)} 关）：${foes.map((x) => esc(x.name)).join('、')}</p>
      <p class="hint">出战：${team ? team.slugs.map((x) => esc(data.bySlug[x].zh)).join('、') + `（${team.slugs.length}人${team.synergy ? ` · 同界域加成 +${Math.round(team.synergy * 100)}%` : ''}）` : `你还没有任何${R.zh}唤醒体，去召唤吧`}</p>
      <div class="row"><button class="btn gold" data-act="rt-go" data-realm="${realm}" ${team ? '' : 'disabled'}>挑战第 ${next} 层</button>
      <button class="btn" data-act="rt-auto" data-realm="${realm}" ${team ? '' : 'disabled'}>连续挑战（最多 10 层）</button></div></div>`;
  }).join('');
  return `<div class="page"><h2>属性塔</h2>
    <p class="hint">四座塔分别只允许对应界域的唤醒体进入，自动选取你拥有的战力最高的 4 名（凑满 3 名同界域有 +8%、4 名 +15% 加成）。每层只打一场，失败可无限重试，只有首次通关的层数给奖励：金币、每 3 层 1 张召唤券、每 10 层 3 张召唤券与装备。敌人优先从带有对应界域特征的怪物中抽取（混沌无对应特征，抽全部）。</p>
    ${cards}</div>`;
}
export function rtResultModal(app, list) {
  const last = list[list.length - 1], names = last.team.list.map((d) => d.name);
  const wins = list.filter((x) => x.win).length;
  const rw = list.reduce((a, x) => ({ gold: a.gold + x.rw.gold, tickets: a.tickets + x.rw.tickets, items: a.items + x.rw.items.length }), { gold: 0, tickets: 0, items: 0 });
  openModal(`<h3>${TOWER_NAME[last.realm]} · ${wins ? `通过 ${wins} 层` : '挑战失败'}</h3>
    <p>${list.map((x) => `第 ${x.floor} 层 ${x.win ? '✓' : '✗'}`).join('　')}</p>
    <p>${REWARD(rw) || '没有新的奖励'}${rw.items ? `　装备 +${rw.items}` : ''}${wins ? '' : '　提升战力或调整装备后再来。'}</p>
    <h4>最后一战</h4>${reportHtml(analyzeBattle(last, last.team.list, last.enemies))}`, 'wide');
}

/* ---------- arena ---------- */
export function arenaPage(app) {
  const { state: s, data } = app;
  const a = arenaState(s), tries = arenaTries(s), ranked = a.rank <= LADDER;
  const opp = app.ui.arena?.list || [];
  const entry = (o) => `<div class="opp"><div class="rk">#${o.rank}</div>
      <div class="ob"><b>${esc(o.name)}</b> <span class="tag">人机</span><small>战力 ${fmt(o.power || 0)}</small>
      <div class="oteam">${(o.snap || []).map((x) => { const d = data.bySlug[x.slug]; return d ? `<img src="${img(d.portrait)}" title="${esc(d.zh)} Lv${x.lv}★${x.star}" alt="">` : ''; }).join('')}</div></div>
      <button class="btn sm gold" data-act="arena-go" data-rank="${o.rank}" ${tries > 0 ? '' : 'disabled'}>挑战</button></div>`;
  const code = app.ui.arena?.code || '';
  return `<div class="page"><h2>竞技场 <small>${ranked ? `当前第 ${a.rank} 名` : '未上榜'} · 最高 ${a.best <= LADDER ? `第 ${a.best} 名` : '—'} · ${a.wins}胜${a.losses}负 · 今日 ${tries}/${ARENA_DAILY}</small></h2>
    ${squadBar(app, 'arena', '天梯与好友对战都用这套阵容出战')}
    <div class="banner-card"><h3>天梯（人机）</h3><p>${LADDER} 个名次，对手都是人机，名次越靠前越强。战胜名次更高的对手即可取代其名次；候选对手分别落后你 1 / 3 / 7 / 15 / 31 名，越往上跨的跨度越大。每天 ${ARENA_DAILY} 次。</p>
      <div class="row"><button class="btn ${canClaimArenaDaily(s) ? 'gold' : ''}" data-act="arena-daily" ${canClaimArenaDaily(s) ? '' : 'disabled'}>每日排名奖励${ranked ? `（召唤券 ${dailyRankReward(a.rank)} + 金币 1500）` : '（上榜后可领）'}</button></div>
      <div class="opps">${opp.length ? opp.map(entry).join('') : '<p class="dim">你已经是第 1 名了。</p>'}</div></div>
    <div class="banner-card"><h3>好友对战</h3>
      <p class="hint">把<b>对战码</b>发给好友，好友粘贴后就能和你当前的队伍（含装备、等级、星级）对战；你也可以输入好友的对战码挑战 TA 的队伍。对战码是队伍快照，不联网，不限次数，没有奖励，只记录胜负。队伍或装备变了请重新生成。</p>
      <label class="snd">我的昵称 <input type="text" maxlength="12" value="${esc(a.name)}" data-arena-name></label>
      <div class="row"><button class="btn gold" data-act="friend-make">生成我的对战码</button>${code ? '<button class="btn" data-act="friend-copy">复制</button>' : ''}</div>
      ${code ? `<textarea class="code" readonly rows="4" id="my-code">${esc(code)}</textarea>` : ''}
      <div class="row"><input type="text" class="wide" id="friend-code" placeholder="粘贴好友的对战码（MMX1-…）"><button class="btn gold" data-act="friend-go">挑战好友</button></div>
      ${a.friends.length ? `<h4>好友战绩</h4><div class="list">${a.friends.map((f) => `<div class="frow"><span>${esc(f.name)}</span><span>战力 ${fmt(f.power)}</span><span>${f.wins} 胜 ${f.losses} 负</span></div>`).join('')}</div>` : ''}</div></div>`;
}
export function arenaResultModal(app, r, rw, newRank) {
  const mine = r.team.list.map((d) => d.name), foes = r.foes.map((d) => d.name), friend = r.entry.type === 'friend';
  openModal(`<h3>${r.win ? '胜利' : '失败'} · ${friend ? `好友 ${esc(r.entry.name)}` : `对手 ${esc(r.entry.name)}（人机，原第 ${r.entry.rank} 名）`}</h3>
    <p>${r.rounds} 回合${friend ? '　友谊赛，无奖励' : `　${r.win ? `名次：第 ${newRank} 名${rw.up ? ` <em class="new">最高名次提升 ${rw.up}</em>` : ''}` : '名次不变'}　${REWARD(rw)}`}</p>
    ${reportHtml(analyzeBattle(r, r.team.list, r.foes))}`, 'wide');
}
/* ---------- 融灾禁区：五队齐上的爬塔 ---------- */
export function riftPage(app) {
  const { state: s, data } = app;
  const c = riftCycle(), r = riftState(s);
  const party = riftParty(s, data);
  const filled = party.filter((p) => p.filled).length;
  const next = Math.min(RIFT_FLOORS, r.floor + 1), cleared = r.floor >= RIFT_FLOORS;
  const foes = cleared ? [] : Array.from({ length: RIFT_TEAMS }, (_, i) => riftEnemies(next, data, i, c.id));
  const pct = (r.floor / RIFT_FLOORS) * 100;
  const marks = RIFT_MILESTONES.map((m) => `<i class="mk ${r.floor >= m ? 'on' : ''}" style="left:${(m / RIFT_FLOORS) * 100}%" title="第 ${m} 层"></i>`).join('');
  const teams = party.map((p) => `<div class="rt-team ${p.filled ? 'on' : 'empty'}">
      <header><b>${p.zh}</b><small>${p.filled
        ? `${p.slugs.length} 人 · 战力 ${fmt(p.team.power)}`
        : `${p.slugs.length} 人 · 战力 ${fmt(p.team.power)} · 自动补位（用没被占用的人和装备）`}${p.conflict ? ' · <em class="new">有重复，已自动调整</em>' : ''}</small></header>
      <div class="sqav">${p.slugs.length
        ? p.slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
        : '<span class="sqempty">没有可上阵的唤醒体</span>'}</div>
      <div class="row"><button class="btn sm" data-act="squad-edit" data-k="${p.key}" data-mode="rift">编队</button>
        <button class="btn sm" data-act="squad-load" data-k="${p.key}" ${p.slugs.length ? '' : 'disabled'}>上阵</button></div>
    </div>`).join('');
  const foeRows = foes.map((en, i) => `<div class="rf ${i === RIFT_TEAMS - 1 ? 'boss' : ''}">
      <span>第 ${i + 1} 队</span><small>${en.map((e) => esc(e.name)).join('、')}</small></div>`).join('');
  return `<div class="page"><h2>融灾禁区 <small>第 ${c.id.slice(1)} 期 · ${c.startText}–${c.endText} · 剩 ${c.daysLeft} 天 · 历史最高 ${r.best || 0} 层</small></h2>
    <div class="banner-card riftcard">
      <p>本期进度：<b>${r.floor}</b> / ${RIFT_FLOORS}${cleared ? ' <em class="new">已通关</em>' : ''}　今日剩余挑战：<b>${r.tries}/${RIFT_DAILY}</b>　禁区编队：<b>${filled}/${RIFT_TEAMS}</b>${filled < RIFT_TEAMS ? '<span class="dim">（没编的队自动用没被占用的唤醒体和装备补位）</span>' : ''}</p>
      <div class="riftbar"><i style="width:${pct}%"></i>${marks}${r.floor ? `<span class="now" style="left:${Math.min(96, Math.max(4, pct))}%">${r.floor}</span>` : ''}</div>
      <p class="hint">一层同时派 <b>${RIFT_TEAMS} 个队伍</b>：禁区一队~五队各打一组敌人，<b>${RIFT_TEAMS} 场胜 ${RIFT_PASS} 场</b>即通过。这五套是<b>融灾禁区专用</b>的，不会动到推图 / 塔 / 周 Boss 在用的通用编队；<b>五队的唤醒体和装备（命轮 / 密契 / 造物 / 钥令）都不能重复</b>，没编的队会自动用没被占用的补满，重复的会按一队→五队的顺序让给前面的队。每层满状态、不继承血量；一次挑战最多连爬 ${RIFT_RUN_MAX} 层。最高 ${RIFT_FLOORS} 层，<b>每两周换一期</b>：敌人重排、层数从头爬、奖励重发，历史最高层永久保留。</p>
      ${cleared ? '<p>本期已经打穿第 100 层，等下期刷新再来。</p>' : `<h4>第 ${next} 层 · 强度≈第 ${riftStage(next)} 关 <small class="dim">第 5 队负责顶 Boss / 精英</small></h4><div class="riftfoes">${foeRows}</div>`}
      <div class="row"><button class="btn big gold" data-act="rift-go" ${cleared || r.tries <= 0 ? 'disabled' : ''}>${cleared ? '本期已通关' : r.tries > 0 ? `挑战第 ${next} 层起（连续最多 ${RIFT_RUN_MAX} 层）` : '今日次数已用完'}</button></div>
      <p class="hint">奖励：每层金币与券/银芯（随层数增长），每 5 层额外召唤券与银芯，每 10 层一件装备，<b>每 25 层</b>钥令 + 校猫奖励（券 6 / 银芯 80），打穿第 ${RIFT_FLOORS} 层再额外给 40 券与 600 银芯。</p>
    </div>
    <h3>出战五队 <small>禁区一队~五队分别对应第 1~5 组敌人 · 队伍页可单独编排</small></h3>
    <div class="rt-teams">${teams}</div>
    <h3>区域首领 <small>单队挑战 · 就是以前的「融灾试炼」</small></h3>
    ${trialSection(app)}</div>`;
}

export function riftResultModal(app, r) {
  const last = r.floors[r.floors.length - 1];
  const total = r.floors.reduce((a, f) => a + f.wins, 0);
  const rows = r.floors.map((f) => `<div class="rfl ${f.win ? 'w' : 'l'}"><b>第 ${f.floor} 层</b>
      <span>${f.wins}/${RIFT_TEAMS} 胜 · ${f.win ? '通过' : '失败'}</span>
      <small>${f.battles.map((b) => `${b.zh}${b.win ? '✓' : b.timeout ? '⌛' : '✗'}`).join('　')}</small></div>`).join('');
  const detail = last ? `<h4>第 ${last.floor} 层五队明细</h4><div class="riftdet">${last.battles.map((b) => `<div class="rd ${b.win ? 'w' : 'l'}"><b>${b.zh}</b>
      <small>${b.enemies.map((e) => esc(e.name)).join('、')}</small>
      <span>${b.win ? '胜利' : b.timeout ? '超时' : `${b.alive}/${b.total} 存活`} · ${b.rounds} 回合</span></div>`).join('')}</div>` : '';
  openModal(`<h3>融灾禁区 · ${r.reached ? `通过 ${r.reached} 层` : '挑战失败'}${r.newBest ? ' <em class="new">新纪录</em>' : ''}</h3>
    <p>本期进度 <b>${r.floor}</b> / ${RIFT_FLOORS}　本次 ${r.floors.length} 层共 ${total}/${r.floors.length * RIFT_TEAMS} 场胜利${last && !last.win ? `　卡在第 ${last.floor} 层` : ''}</p>
    <p>${r.rw ? (REWARD(r.rw) || '没有新的奖励') + (r.rw.items.length ? `　装备 +${r.rw.items.length}` : '') : '没有推进到新层数，本次没有奖励。'}</p>
    <div class="rfls">${rows}</div>${detail}`, 'wide');
}

export { hydrate };
