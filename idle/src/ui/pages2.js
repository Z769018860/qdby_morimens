import { THREATS, trialKey, trialUnlocked, towerTries, TOWER_DAILY, TOWER_MAX_FLOOR, towerStage, towerInfo, towerEnemies } from '../core/challenge.js';
import { RIFT_FLOORS, RIFT_TEAMS, RIFT_DAILY, riftCycle, riftState, riftInfo, riftEnemies, riftParty } from '../core/rift.js';
import { achievementList, claimableCount, CATEGORIES } from '../core/achievements.js';
import { teamDefs } from '../core/game.js';
import { squadBar } from './pages.js';
import { esc, img, fmt, openModal, markup, rewardText } from './util.js';
import { reportHtml } from './report.js';
import { analyzeBattle } from '../core/report.js';


const REWARD = rewardText;

/* ---------- damage meter (shared with the battle view) ---------- */
export function meterHtml(names, stats, side = 'a') {
  const rows = names.map((n, i) => ({ n, ...(stats[`${side}${i}`] || { dmg: 0, heal: 0, taken: 0 }) }));
  const max = Math.max(1, ...rows.map((r) => r.dmg)), maxH = Math.max(1, ...rows.map((r) => r.heal));
  return `<div class="meter">${rows.map((r) => `<div class="mrow"><span class="mn">${esc(r.n)}</span>
    <span class="mb"><i class="d" style="width:${(r.dmg / max) * 100}%"></i></span><span class="mv">${fmt(r.dmg)}</span>
    ${r.heal ? `<span class="mb h"><i class="h" style="width:${(r.heal / maxH) * 100}%"></i></span><span class="mv">${fmt(r.heal)}</span>` : ''}</div>`).join('')}</div>`;
}

/* ---------- challenge page ---------- */
export function challengePage(app) {
  const { state: s, data } = app;
  const t = teamDefs(s, data);
  const tries = towerTries(s);
  const nextFloor = s.tower.best + 1;
  const ne = towerEnemies(nextFloor, data);
  const rc = riftCycle(), rs = riftState(s);
  const nextRift = Math.min(RIFT_FLOORS, rs.floor + 1), riftClear = rs.floor >= RIFT_FLOORS;
  const party = riftParty(s, data), filled = party.filter((p) => p.filled).length;
  const riftFoes = riftClear ? [] : Array.from({ length: RIFT_TEAMS }, (_, i) => riftEnemies(nextRift, data, i, rc.id));
  const trials = data.trials.map((tr) => {
    const row = THREATS.map((th, i) => {
      const done = s.trials.cleared[trialKey(tr, th)], open = trialUnlocked(s, tr, i);
      return `<button class="btn sm th th-${th.k} ${done ? 'done' : ''}" data-act="trial-go" data-id="${tr.id}" data-i="${i}" ${open ? '' : 'disabled'} title="推荐等级约第 ${th.stage} 关强度${done ? '，已首通' : `，首通奖励：召唤券 ${th.tickets}`}">${th.k}${done ? ' ✓' : ''}</button>`;
    }).join('');
    const boss = app.data.trialMonsters[tr.boss[0]];
    return `<div class="trial"><img src="${img(boss.img)}" alt=""><div class="tb"><b>${esc(tr.name)}</b><small>第 ${tr.season} 期融灾 · 区域 ${tr.zone}</small>
      <details><summary>敌方技能（原作文本译）</summary>${tr.boss.map((id) => `<p class="real"><b>${esc(data.trialMonsters[id].zh)}</b>\n${(data.trialMonsters[id].sk || []).map((x) => '· ' + markup(x, data.kw)).join('\n')}</p>`).join('')}</details>
      <div class="ths">${row}</div></div></div>`;
  }).join('');
  return `<div class="page"><h2>挑战 <small>当前队伍战力 ${fmt(t.power)}</small></h2>
    <div class="banner-card"><h3>无限塔·倒悬回廊</h3>
      ${squadBar(app, 'tower')}
      <p>最高层数：<b>${s.tower.best}</b> / ${TOWER_MAX_FLOOR}　今日剩余挑战：<b>${tries}/${TOWER_DAILY}</b>　下一层（第 ${nextFloor} 层${towerInfo(nextFloor).reward ? ' · 🐈 校猫奖励层' : towerInfo(nextFloor).boss ? ' · BOSS' : towerInfo(nextFloor).elite ? ' · 精英' : ''}）：${ne.map((e) => esc(e.name)).join('、')}</p>
      <p class="hint">从第 1 层开始连续战斗，存活者保留生命并回复 30%，倒下的不会复活；全灭即止。每 5 层奖励召唤券，每 10 层掉落装备，<b>每 20 层是「校猫」奖励层</b>（额外给券、银芯与一件装备），首次到达的新层数才有奖励。塔共 ${TOWER_MAX_FLOOR} 层。</p>
      <div class="row"><button class="btn big gold" data-act="tower-go" ${tries > 0 ? '' : 'disabled'}>${tries > 0 ? '开始爬塔' : '今日次数已用完'}</button></div></div>
    <div class="banner-card riftcard"><h3>融灾禁区 <small>第 ${rc.id.slice(1)} 期 · ${rc.startText}–${rc.endText} · 剩 ${rc.daysLeft} 天</small></h3>
      <p>本期进度：<b>${rs.floor}</b> / ${RIFT_FLOORS}${riftClear ? ' <em class="new">已通关</em>' : ''}　今日剩余挑战：<b>${rs.tries}/${RIFT_DAILY}</b>　禁区编队：<b>${filled}/${RIFT_TEAMS}</b>${filled < RIFT_TEAMS ? '<span class="dim">（没编的先借用通用一队~五队，再没有才用当前队伍）</span>' : ''}</p>
      <p class="hint">一层要同时派出 <b>五个队伍</b>：禁区一队~五队各打一组敌人，<b>5 场胜 4 场</b>即通过该层（漏掉的那队只影响这一层的评价）。这五套是<b>融灾禁区专用</b>的编队，不会动到推图 / 塔 / 周 Boss 在用的通用编队。每层都是满状态，不继承血量；一次挑战最多连爬 10 层。塔共 ${RIFT_FLOORS} 层，<b>每两周换一期</b>：敌人重排、层数从头爬、每层奖励重发，历史最高层永久保留。</p>
      ${riftClear ? '<p>本期已经打穿第 100 层了，等下期刷新再来。</p>' : `<div class="riftfoes">${riftFoes.map((en, i) => `<div class="rf ${i === RIFT_TEAMS - 1 ? 'boss' : ''}"><span>第 ${i + 1} 队</span><small>${en.map((e) => esc(e.name)).join('、')}</small></div>`).join('')}</div>`}
      <div class="row"><button class="btn big gold" data-act="go-rift">${riftClear ? '查看本期战绩' : `进入融灾禁区（第 ${nextRift} 层）`}</button></div></div>
    <div class="banner-card"><h3>融灾试炼</h3>
      ${squadBar(app, 'trial')}
      <p class="hint">真实的融灾区域首领，使用原作技能效果；威胁等级越高越强，需依次解锁。首通奖励召唤券与装备，重复挑战获得金币。</p>
      <div class="trials">${trials}</div></div></div>`;
}

export function towerResultModal(app, r) {
  const names = r.team.list.map((d) => d.name);
  const last = r.floors[r.floors.length - 1];
  const rows = r.floors.slice(-12).map((f) => `<div class="frow ${f.win ? 'w' : 'l'}"><span>第 ${f.floor} 层</span><span>${f.win ? '胜利' : f.timeout ? '超时' : '全灭'} · ${f.rounds} 回合</span><span>存活 ${f.alive}/${names.length}</span></div>`).join('');
  openModal(`<h3>爬塔结束 · 到达第 ${r.reached} 层${r.rw.newBest ? ' <em class="new">新纪录</em>' : ''}</h3>
    <p>${REWARD(r.rw) || '没有新的奖励'}${r.rw.items.length ? `　装备 +${r.rw.items.length}` : ''}</p>
    ${r.floors.length > 12 ? '<p class="hint">仅显示最后 12 层</p>' : ''}<div class="frows">${rows}</div>
    <h4>最后一战伤害 / 治疗</h4>${meterHtml(names, last.stats)}`, 'wide');
}

export function trialResultModal(app, r) {
  const names = r.team.list.map((d) => d.name);
  openModal(`<h3>${r.win ? '试炼胜利' : '试炼失败'} · ${esc(r.trial.name)} ${r.th.k}</h3>
    <p>${r.rounds} 回合${r.win ? `　${REWARD(r.rw) || ''}${r.rw.first ? ' <em class="new">首通</em>' : ''}${r.rw.items.length ? `　装备 +${r.rw.items.length}` : ''}` : '　提升战力或调整队伍后再来。'}</p>
    ${reportHtml(analyzeBattle(r, r.team.list, r.enemies))}`, 'wide');
}

/* ---------- achievements ---------- */
export function achievementPage(app) {
  const list = achievementList(app.state, app.data);
  const cat = app.ui.achCat || 'all';
  const shown = list.filter((a) => cat === 'all' || a.cat === cat)
    .sort((x, y) => (Number(y.done && !y.claimed) - Number(x.done && !x.claimed)) || (Number(x.claimed) - Number(y.claimed)));
  const done = list.filter((a) => a.claimed).length, ready = list.filter((a) => a.done && !a.claimed).length;
  const cnt = (k) => { const l = list.filter((a) => k === 'all' || a.cat === k); return `${l.filter((a) => a.claimed).length}/${l.length}`; };
  return `<div class="page"><h2>成就 <small>${done}/${list.length}${ready ? ` · ${ready} 个可领取` : ''}</small></h2>
    <div class="row cats">${CATEGORIES.map(([k, z]) => `<button class="btn sm ${cat === k ? 'on' : ''}" data-act="ach-cat" data-k="${k}">${z} ${cnt(k)}</button>`).join('')}</div>
    <div class="row"><button class="btn gold" data-act="ach-all" ${ready ? '' : 'disabled'}>一键领取（${ready}）</button></div>
    <div class="list">${shown.map((a) => `
    <div class="ach ${a.done ? 'done' : ''}"><div class="ab"><b>${esc(a.zh)}</b><small>${esc(a.desc)}</small>
      <div class="bar"><i style="width:${(a.cur / a.goal) * 100}%"></i></div><small>${fmt(a.cur)} / ${fmt(a.goal)}　奖励：${REWARD(a.reward)}</small></div>
      <button class="btn sm ${a.done && !a.claimed ? 'gold' : ''}" data-act="ach-claim" data-id="${a.id}" ${a.done && !a.claimed ? '' : 'disabled'}>${a.claimed ? '已领取' : a.done ? '领取' : '进行中'}</button></div>`).join('')}</div></div>`;
}
export { claimableCount };

/* 新手引导已迁到 ui/guide.js：改成定位到底部导航各分组的高亮引导，
   这里不再保留纯文字版，避免两套文案各说各话。 */
