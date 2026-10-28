import { THREATS, trialKey, trialUnlocked, towerTries, TOWER_DAILY, towerStage, towerInfo, towerEnemies } from '../core/challenge.js';
import { achievementList, claimableCount } from '../core/achievements.js';
import { teamDefs } from '../core/game.js';
import { esc, img, fmt, openModal, markup } from './util.js';

const REWARD = (r) => [r.gold ? `金币 +${fmt(r.gold)}` : '', r.tickets ? `召唤券 +${r.tickets}` : ''].filter(Boolean).join('　');

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
  return `<div class="page"><h2>挑战 <small>队伍战力 ${fmt(t.power)}</small></h2>
    <div class="banner-card"><h3>无限塔·倒悬回廊</h3>
      <p>最高层数：<b>${s.tower.best}</b>　今日剩余挑战：<b>${tries}/${TOWER_DAILY}</b>　下一层：${ne.map((e) => esc(e.name)).join('、')}</p>
      <p class="hint">从第 1 层开始连续战斗，存活者保留生命并回复 30%，倒下的不会复活；全灭即止。每 5 层奖励召唤券，每 10 层掉落装备，首次到达的新层数才有奖励。</p>
      <div class="row"><button class="btn big gold" data-act="tower-go" ${tries > 0 ? '' : 'disabled'}>${tries > 0 ? '开始爬塔' : '今日次数已用完'}</button></div></div>
    <div class="banner-card"><h3>融灾试炼</h3>
      <p class="hint">真实的融灾区域首领，使用原作技能效果；威胁等级越高越强，需依次解锁。首通奖励召唤券与装备，重复挑战获得金币。</p>
      <div class="trials">${trials}</div></div></div>`;
}

export function towerResultModal(app, r) {
  const names = r.team.list.map((d) => d.name);
  const last = r.floors[r.floors.length - 1];
  const rows = r.floors.slice(-12).map((f) => `<div class="frow ${f.win ? 'w' : 'l'}"><span>第 ${f.floor} 层</span><span>${f.win ? '胜利' : '失败'} · ${f.rounds} 回合</span><span>存活 ${f.alive}/${names.length}</span></div>`).join('');
  openModal(`<h3>爬塔结束 · 到达第 ${r.reached} 层${r.rw.newBest ? ' <em class="new">新纪录</em>' : ''}</h3>
    <p>${REWARD(r.rw) || '没有新的奖励'}${r.rw.items.length ? `　装备 +${r.rw.items.length}` : ''}</p>
    ${r.floors.length > 12 ? '<p class="hint">仅显示最后 12 层</p>' : ''}<div class="frows">${rows}</div>
    <h4>最后一战伤害 / 治疗</h4>${meterHtml(names, last.stats)}`, 'wide');
}

export function trialResultModal(app, r) {
  const names = r.team.list.map((d) => d.name);
  openModal(`<h3>${r.win ? '试炼胜利' : '试炼失败'} · ${esc(r.trial.name)} ${r.th.k}</h3>
    <p>${r.rounds} 回合${r.win ? `　${REWARD(r.rw) || ''}${r.rw.first ? ' <em class="new">首通</em>' : ''}${r.rw.items.length ? `　装备 +${r.rw.items.length}` : ''}` : '　提升战力或调整队伍后再来。'}</p>
    <h4>伤害 / 治疗</h4>${meterHtml(names, r.stats)}`, 'wide');
}

/* ---------- achievements ---------- */
export function achievementPage(app) {
  const list = achievementList(app.state, app.data);
  const done = list.filter((a) => a.claimed).length;
  return `<div class="page"><h2>成就 <small>${done}/${list.length}</small></h2><div class="list">${list.map((a) => `
    <div class="ach ${a.done ? 'done' : ''}"><div class="ab"><b>${esc(a.zh)}</b><small>${esc(a.desc)}</small>
      <div class="bar"><i style="width:${(a.cur / a.goal) * 100}%"></i></div><small>${fmt(a.cur)} / ${fmt(a.goal)}　奖励：${REWARD(a.reward)}</small></div>
      <button class="btn sm ${a.done && !a.claimed ? 'gold' : ''}" data-act="ach-claim" data-id="${a.id}" ${a.done && !a.claimed ? '' : 'disabled'}>${a.claimed ? '已领取' : a.done ? '领取' : '进行中'}</button></div>`).join('')}</div></div>`;
}
export { claimableCount };

/* ---------- tutorial ---------- */
const STEPS = [
  ['欢迎来到忘却之夜', '这是一款全自动的挂机游戏：你的 4 人小队会不停地推关、战斗、掉落。你只需要决定「队伍怎么配」「钱花在哪」。离线时也会累积收益（最多 8 小时）。'],
  ['养成', '金币用来给唤醒体升级、强化命轮 / 密契 / 造物。重复召唤到同一名唤醒体会提升星级。3 个以上同界域的队员有额外加成。'],
  ['状态与关键词', '战斗里出现的「中毒、易伤、反击、屏障……」都是原作中的关键词。点一下任何带图标的标签，都能看到它的说明；唤醒体详情里能看到每个技能的原作名称与文本（译文）。'],
  ['挑战', '推图遇到瓶颈时，去「挑战」页：无限塔每天有 3 次，融灾试炼是真实的融灾首领，威胁等级从 C 到 SSS。奖励的召唤券可以抽新的唤醒体。'],
];
export function tutorial(app, i = 0, done) {
  const [t, body] = STEPS[i];
  const m = openModal(`<h3>${t}</h3><p>${body}</p><div class="row"><small class="hint">${i + 1}/${STEPS.length}</small><button class="btn gold" data-tut>${i + 1 < STEPS.length ? '下一步' : '开始游戏'}</button></div>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-tut]')) { if (i + 1 < STEPS.length) tutorial(app, i + 1, done); else { m.remove(); done?.(); } } });
}
