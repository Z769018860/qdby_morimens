// 世界 Boss 的界面：一只 Boss、一条全服共享的血池、一份本期排行。
//
// 页面的数据源是后端（core/wboss.js 的 net），本机只做展示缓存：
//   · 进页面 / 点刷新 → GET /wboss，把血池、排行榜、我的名次拉下来；
//   · 打完一次 → POST /wboss/hit，服务端扣次数、扣血池，返回新的剩余血量；
//   · 上期结算 → POST /wboss/claim，服务端只回名次与「是否已领」，奖励内容按本地那张表发。
import * as Cloud from '../core/cloud.js';
import {
  WBOSS_DAILY, WBOSS_ROUNDS, WBOSS_RANK_TIERS, WBOSS_KILL_BONUS,
  wbossWeek, wbossBoss, wbossEnemy, wbossState, applyServer, wbossHpMax, wbossHpLeft,
  wbossRewardOf, wbossGrant, wbossFight, net,
} from '../core/wboss.js';
import { teamSlugsFor, squadKeyFor, withLoadout } from '../core/squad.js';
import { squadBar } from './pages.js';
import { esc, img, fmt, openModal, toast } from './util.js';

const rwLine = (rw) => [
  rw.gold ? `金币 +${fmt(rw.gold)}` : '', rw.cores ? `银芯 +${fmt(rw.cores)}` : '',
  rw.tickets ? `唤醒券 +${rw.tickets}` : '', rw.item ? '装备 ×1' : '',
].filter(Boolean).join('　');

/** 进页面时拉一次（15 秒内不重复拉，避免每次 render 都打接口） */
export function enter(app, rerender) {
  const wb = (app.wb ||= { data: null, at: 0, loading: false, err: '' });
  if (wb.loading) return;
  if (wb.data && Date.now() - wb.at < 15000) return;
  refresh(app, rerender);
}

export async function refresh(app, rerender) {
  const wb = (app.wb ||= { data: null, at: 0, loading: false, err: '' });
  if (wb.loading) return;
  wb.loading = true; wb.err = '';
  rerender?.();
  try {
    const j = await net.fetch();
    if (j && j.ok) {
      wb.data = j; wb.at = Date.now();
      if (j.me) { applyServer(app.state, { ...j.me, week: j.week }); app.save(); }
    } else {
      wb.err = (j && j.error) || 'bad_reply';
    }
  } catch (e) {
    wb.err = e && e.message ? e.message : 'offline';
  }
  wb.loading = false;
  rerender?.();
}

export function wbossPage(app) {
  const s = app.state, d = app.data;
  const week = wbossWeek();
  const boss = wbossBoss(d, week);
  const e = wbossEnemy(d, week);
  const w = wbossState(s, week);
  const wb = (app.wb ||= { data: null, at: 0, loading: false, err: '' });
  const live = wb.data && wb.data.week === week ? wb.data : null;
  const hpMax = (live && Number(live.hpMax)) || wbossHpMax();
  const hp = live ? Math.max(0, Number(live.hp) || 0) : hpMax;
  const left = live ? wbossHpLeft({ hp, hpMax }) : 1;
  const me = live ? live.me : null;
  const acct = Cloud.account();
  const tries = me ? Math.max(0, Math.min(WBOSS_DAILY, Number(me.tries) || 0)) : w.tries;
  const dmg = Math.max(w.dmg, me ? Number(me.dmg) || 0 : 0);
  const rank = me ? Number(me.rank) || 0 : 0;
  const over = !!(live && (live.killed || live.closed)) || hp <= 0;
  const fromServer = !!live;

  if (!boss || !e) return '<div class="page"><p>怪物库里还没有首领，世界 Boss 开不起来。</p></div>';

  const status = wb.loading ? '正在同步…'
    : wb.err === 'not_logged_in' ? '登录后就能上榜'
    : wb.err === 'not_found' ? '后端还没上线世界 Boss 接口（部署新版本后可用）'
    : wb.err === 'offline' ? '连不上后端（离线）：下面是本机记录，伤害不会上榜'
    : wb.err ? `同步失败：${esc(wb.err)}`
    : fromServer ? `已同步 · ${new Date(wb.at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
    : '还没同步';

  const top = (live && Array.isArray(live.top)) ? live.top : [];
  const myName = acct ? acct.name : '';
  const rows = top.map((x) => `<div class="wbrow${x.rank <= 3 ? ' hot' : ''}${myName && x.name === myName ? ' me' : ''}">
      <b>${x.rank}</b><span>${esc(x.name || '旅人')}</span><em>${fmt(x.dmg)}</em></div>`).join('');

  const last = live && live.last;
  const lastRw = last && last.myDmg > 0 ? wbossRewardOf({ rank: last.myRank, dmg: last.myDmg, killed: last.killed }) : null;
  const lastBox = last && last.myDmg > 0 ? `<div class="banner-card wb-last"><div>
      <h3>上一期结算 <small>${esc(last.week)} · ${last.killed ? '血池已被打空' : '时间到'} · ${last.players} 人参与</small></h3>
      <p>你的累计伤害 <b>${fmt(last.myDmg)}</b>　名次 <b>${last.myRank ? `第 ${last.myRank} 名` : '未上榜'}</b>${lastRw ? `　预计奖励：${rwLine(lastRw)}` : ''}</p>
      ${last.claimed ? '<p class="hint">这一期的奖励已经领过了。</p>'
        : `<div class="row"><button class="btn gold" data-act="wboss-claim" data-week="${esc(last.week)}">领取上一期奖励</button></div>`}
    </div></div>` : '';

  const rewards = WBOSS_RANK_TIERS.map((t) => `<div class="wbstep"><b>${esc(t.zh)}</b><span>${rwLine({ ...t, item: t.item })}</span></div>`).join('')
    + `<div class="wbstep"><b>打空血池</b><span>所有参与者额外 ${rwLine(WBOSS_KILL_BONUS)}</span></div>`;

  return `<div class="page"><h2>世界 Boss <small>${week} · 全服共讨 · 每日 ${WBOSS_DAILY} 次</small></h2>
  ${squadBar(app, 'wboss', '世界 Boss 用这套编队出战；伤害按 12 回合内打出的总量算')}
  <div class="banner-card wk wb"><img src="${img(boss.img)}" alt=""><div>
    <h3>${esc(e.name)} <small>${over ? '本期已结束' : `剩余 ${Math.round(left * 100)}%`}</small></h3>
    <p class="hint">${esc(boss.desc || '')}</p>
    <div class="bar hp wbbar"><i style="width:${Math.max(0, Math.round(left * 100))}%"></i><b>${fmt(hp)} / ${fmt(hpMax)}</b></div>
    <p>血池 <b>${fmt(hp)}</b> / ${fmt(hpMax)}　参与 <b>${live ? live.players : '—'}</b> 人　我的伤害 <b>${fmt(dmg)}</b>${rank ? `（第 ${rank} 名）` : ''}　今日剩余 <b>${tries}/${WBOSS_DAILY}</b></p>
    <div class="seq">${e.skills.map((x) => `<span>${esc(x.name)}</span>`).join('')}</div>
    <p class="hint">每周一只，全服打同一条血池：你打掉的伤害会实时从总量里扣，血池清零就提前结算。每次只打 ${WBOSS_ROUNDS} 回合，全队倒下则提前结束；按本期累计伤害排名发奖，周结算时血池没打空也照常结算。</p>
    <div class="row">
      <button class="btn big gold" data-act="wboss-go" ${acct && tries > 0 && !over && !wb.loading ? '' : 'disabled'}>${!acct ? '登录后参与' : over ? '本期已结束' : tries > 0 ? `挑战（今日剩 ${tries} 次）` : '今日次数已用完'}</button>
      <button class="btn" data-act="wboss-refresh" ${wb.loading ? 'disabled' : ''}>${wb.loading ? '同步中…' : '刷新血池'}</button>
      <button class="btn" data-act="monster" data-id="${boss.id}">查看出招</button>
    </div>
    <p class="hint">${status}${acct ? '' : '　（<b>需要登录本站账号</b>才能参与全服血池与排行）'}</p>
  </div></div>
  ${lastBox}
  <h3>本期排行 <small>${live ? `前 ${top.length} 名 / 共 ${live.players} 人` : '等待同步'}</small></h3>
  <div class="wbtop">${rows || (live ? '<p class="dim">这一期还没人出手。第一刀就是你的。</p>'
    : '<p class="dim">同步完成后这里显示本期排行（后端返回前 20 名）。</p>')}</div>
  <h3>奖励 <small>排名分档 + 参与奖，打空血池另有一份</small></h3>
  <div class="wbsteps">${rewards}</div>
  <p class="hint">奖励在下一期开始后、于下方「上一期结算」里领取；同一期只能领一次（服务端记账，换设备也一样）。</p>
  </div>`;
}

/** 打一次：跑战斗（同步），伤害上报走异步 */
export function fight(app) {
  const s = app.state, d = app.data;
  return withLoadout(s, squadKeyFor(s, 'wboss'), () => wbossFight(s, d, teamSlugsFor(s, 'wboss')));
}

/** 上报伤害：服务端是权威，回来后用它的血池 / 次数 / 名次覆盖本机 */
export async function report(app, dmg, rerender) {
  const wb = (app.wb ||= { data: null, at: 0, loading: false, err: '' });
  try {
    const j = await net.hit(dmg);
    if (j && j.ok) {
      const base = wb.data && wb.data.week === j.week ? wb.data : { week: j.week, top: [], players: 0 };
      wb.data = { ...base, week: j.week, hp: j.hp, hpMax: j.hpMax, killed: j.killed, closed: !!j.killed, me: j.me, players: j.players, top: base.top || [] };
      wb.at = Date.now(); wb.err = '';
      applyServer(app.state, { ...j.me, week: j.week });
      app.save();
      if (j.killed) toast('血池被打空了！本期提前结束，等下一期开始就能领奖', 5000);
    } else if (j && j.error === 'no_tries') {
      toast('服务端记的次数已经用完了（本机可能落后）——明天再来', 4200);
      refresh(app, rerender);
      return;
    } else if (j && j.error === 'over') {
      toast('这一期已经被打完了，等下一期', 4200);
      refresh(app, rerender);
      return;
    } else {
      toast(`伤害没记上：${(j && j.error) || '未知原因'}`, 4000);
    }
  } catch (e) {
    toast(`伤害没传上去（${e && e.message === 'offline' ? '连不上后端' : '网络'}）——本机记着这一场，但不进全服排行`, 4600);
  }
  rerender?.();
}

/** 领取上一期奖励：服务端判名次 + 去重，本地按同一张表发 */
export async function claim(app, week, rerender) {
  const wb = (app.wb ||= { data: null, at: 0, loading: false, err: '' });
  try {
    const j = await net.claim(week);
    if (!j || !j.ok) { toast(`领不了：${(j && j.error) || '未知原因'}`, 4200); return; }
    if (wb.data && wb.data.last) wb.data.last.claimed = true;
    const rw = wbossRewardOf({ rank: j.rank, dmg: j.dmg, killed: j.killed });
    if (!rw) { toast('这一期没有可领的奖励'); return; }
    const got = wbossGrant(app.state, app.data, rw);
    wbossState(app.state, j.week).claimed[j.week] = true;
    app.save();
    openModal(`<h3>世界 Boss · 上一期奖励</h3>
      <p>${esc(j.week)} · 本期第 <b>${j.rank}</b> 名　累计伤害 <b>${fmt(j.dmg)}</b></p>
      <p>${rwLine(got)}${rw.killed ? '<br><em class="new">血池被打空：全体参与者额外奖励已一并发放</em>' : ''}</p>
      <div class="row"><button class="btn gold" data-act="close">收下</button></div>`, 'wide');
  } catch (e) {
    toast(e && e.message === 'not_logged_in' ? '先登录本站账号' : `领奖失败：${(e && e.message) || '网络'}`, 4200);
  }
  rerender?.();
}

/** 打完的结算框（回放在 main.js 里先播完再弹这个） */
export function resultModal(app, r) {
  const wb = app.wb && app.wb.data;
  const hpLine = wb && wb.hp != null ? `　血池剩 ${fmt(wb.hp)}` : '';
  openModal(`<h3>世界 Boss · ${esc(r.boss ? r.boss.zh : '共讨')}</h3>
    <p>本次伤害 <b>${fmt(r.dmg)}</b>${r.newBest ? ' <em class="new">本期最高</em>' : ''}${hpLine}</p>
    <p class="hint">出战：${r.team.list.map((x) => esc(x.name)).join('、')}</p>
    <p class="hint">这一刀的伤害会从全服血池里扣掉；排名与剩余次数以服务端为准，回页面刷新即可看到最新名次。</p>
    <div class="row"><button class="btn gold" data-act="close">知道了</button></div>`, 'wide');
}
