// 签到
import { signinState, monthKey, daysInMonth, dayReward, CUM, BACKFILL_COST } from '../core/signin.js';
import {
  EVENT_ZH, EVENT_SUB, SIGNIN_FAME, MILE, eventSummary, dailyView, tiersView, milePending, fameOf,
} from '../core/event.js';
import { SIGNIN_GIFTS } from '../core/creators.js';
import { REALMS, TYPES } from '../core/constants.js';
import { esc, img, fmt, rewardText } from './util.js';

export function signinPage(app) {
  const { state: s } = app, now = new Date(), st = signinState(s, now), today = now.getUTCDate(), n = daysInMonth(now);
  const can = !st.claimed.includes(today);
  const cells = Array.from({ length: n }, (_, i) => {
    const d = i + 1, got = st.claimed.includes(d), r = dayReward(d), big = d % 7 === 0;
    const state = got ? 'got' : d === today ? 'today' : d < today ? 'miss' : 'future';
    return `<div class="sday ${state} ${big ? 'big' : ''}"><b>${d}</b><small>${r.tickets} <img class="ico-sm" src="public/img/ui/lumen.webp" alt="召唤券"> ${r.cores} <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${r.item ? ' +装备' : ''}</small>
      ${state === 'today' ? `<button class="btn sm gold" data-act="sign-today">签到</button>` : state === 'miss' ? `<button class="btn sm" data-act="sign-back" data-d="${d}" ${s.cores >= BACKFILL_COST ? '' : 'disabled'}>补签  <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${BACKFILL_COST}</button>` : state === 'got' ? '<span class="ok">✓</span>' : ''}</div>`;
  }).join('');
  const cum = CUM.map((c, i) => {
    const ok = st.claimed.length >= c.n, got = st.cum.includes(i);
    return `<div class="ach ${ok ? 'done' : ''}"><div class="ab"><b>本月累计签到 ${c.n} 天</b><small>奖励：${rewardText(c)}${c.item ? '　装备 ×1' : ''}</small></div>
      <button class="btn sm ${ok && !got ? 'gold' : ''}" data-act="sign-cum" data-i="${i}" ${ok && !got ? '' : 'disabled'}>${got ? '已领取' : ok ? '领取' : `${st.claimed.length}/${c.n}`}</button></div>`;
  }).join('');
  return `<div class="page">${welcomeCard(app)}<h2>签到 <small>${esc(monthKey(now))} · 已签 ${st.claimed.length}/${n} 天${can ? ' · 今日未签' : ''}</small></h2>
    <p class="hint">每天签到一次（UTC 日期）；每逢 7 的倍数的日子奖励翻倍并附带装备。漏签的日子可以花 ${BACKFILL_COST} 银芯补签。每月 1 日重置。</p>
    <div class="scal">${cells}</div><h3>累计奖励</h3><div class="list">${cum}</div></div>`;
}

// ---- 注册福利 card (shown on the sign-in page)
import { portalUser, welcomeStatus, WELCOME, SEVEN, sevenState, PORTAL_URL } from '../core/welcome.js';
export function welcomeCard(app) {
  const { state: s } = app, user = portalUser(), st = welcomeStatus(s, user);
  const gift = rewardText(WELCOME) + (WELCOME.item ? '　装备 ×1' : '');
  let body;
  if (!st.loggedIn) body = `<p>登录或注册项目账号后，可领取一次性<b>注册福利</b>：${gift}，并解锁 <b>7 日新手福利</b>。</p><div class="row"><a class="btn gold" href="${PORTAL_URL}">去首页登录 / 注册</a></div><p class="hint">在首页登录后回到本页即可（同一个账号只能领取一次，换存档也不会重复）。</p>`;
  else if (st.claimedElsewhere) body = `<p>账号 <b>${esc(st.name)}</b> 的注册福利已经在本浏览器领取过了。</p>`;
  else if (!st.claimed) body = `<p>欢迎，<b>${esc(st.name)}</b>！领取注册福利：${gift}</p><div class="row"><button class="btn big gold" data-act="welcome-claim">领取注册福利</button></div>`;
  else {
    const sv = sevenState(s), days = SEVEN.map((r, i) => {
      const got = sv.days.includes(i), open = i + 1 <= sv.idx && !sv.over;
      return `<div class="sday ${got ? 'got' : open ? 'today' : 'future'}"><b>第 ${i + 1} 天</b><small>${r.cores} <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯"> ${r.tickets} <img class="ico-sm" src="public/img/ui/lumen.webp" alt="召唤券">${r.item ? ' +装备' : ''}</small>${got ? '<span class="ok">✓</span>' : `<button class="btn sm ${open ? 'gold' : ''}" data-act="welcome-7" data-i="${i}" ${open ? '' : 'disabled'}>${open ? '领取' : '未到'}</button>`}</div>`;
    }).join('');
    body = `<p>账号 <b>${esc(st.name)}</b> · 注册福利已领取。7 日新手福利（从领取当天起算，错过的天数可在之后 7 天内补领）：</p><div class="scal">${days}</div>`;
  }
  return `<div class="banner-card welcome"><h3>🎁 注册福利 <small>银芯  <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯"></small></h3>${body}</div>`;
}

/* --------------------------- 联动活动「星辉直播间」 --------------------------- */
// 9 位社区主播彩蛋：3 位签到送、6 位靠人气档位解锁。人气来源见 core/event.js。
function guestCard(app, a, foot) {
  const owned = !!app.state.roster[a.slug];
  const c = a.creator;
  return `<div class="guest ${owned ? 'on' : ''}" style="--rc:${REALMS[a.realm].color}" data-act="detail" data-slug="${a.slug}">
    <div class="gimg"><img src="${img(a.portrait)}" alt="" loading="lazy">${owned ? '<i class="gdone">已获得</i>' : ''}</div>
    <b>${esc(a.zh)}</b>
    <small>${REALMS[a.realm].zh} · ${TYPES[a.type].zh}</small>
    <small class="ghook">${esc(c.hook)}</small>
    <a class="gbil" data-act="bil" href="${esc(c.url)}" target="_blank" rel="noopener" title="打开 ${esc(a.zh)} 的 B 站个人空间">B 站首页 ↗</a>
    <div class="gfoot">${foot}</div>
  </div>`;
}

export function eventPage(app) {
  const { state: s } = app;
  const sum = eventSummary(s);
  const tiers = tiersView(s);
  const tasks = dailyView(s);
  const signins = s.stats?.signins || 0;

  const pct = sum.nextFame ? Math.min(100, Math.round((sum.fame / sum.nextFame) * 100)) : 100;
  const nextA = sum.nextSlug ? app.data.bySlug[sum.nextSlug] : null;
  const fameNote = sum.nextReady ? '人气够了，下面点「解锁」' : sum.nextFame ? `距第 ${fmt(sum.nextFame)} 点还差 ${fmt(sum.nextFame - sum.fame)}` : '全部档位已解锁';
  const fameBar = `<div class="famebar"><div class="fameh"><span>直播间人气</span><b>${fmt(sum.fame)}</b>
      <em>${fameNote}</em></div>
    <div class="famebar-line"><i style="width:${pct}%"></i></div>
    <small>${nextA ? `下一位：${esc(nextA.zh)}` : '嘉宾席已满，感谢陪伴'}　·　已解锁 <b>${sum.owned}</b>/${sum.total}（另 3 位在签到里送）</small></div>`;

  const taskRows = tasks.map((t) => `<div class="ach ${t.claimed ? 'done' : t.done ? 'ready' : ''}">
    <div class="ab"><b>${esc(t.zh)}</b><small>进度 ${t.cur}/${t.need}　·　奖励 人气 +${t.fame}</small></div>
    <button class="btn sm ${t.done && !t.claimed ? 'gold' : ''}" data-act="event-daily" data-id="${t.id}" ${t.done && !t.claimed ? '' : 'disabled'}>${t.claimed ? '已领取' : t.done ? '领取' : `${t.cur}/${t.need}`}</button></div>`).join('');

  const mile = milePending(s);
  const mileRow = `<div class="ach ${mile ? 'ready' : ''}"><div class="ab"><b>推图里程碑</b>
      <small>最高通关每 ${MILE.step} 关 +${MILE.fame} 人气（一次性，最高 ${MILE.max} 关）　当前最高通关：第 ${s.maxStage || 0} 关</small></div>
      <button class="btn sm ${mile ? 'gold' : ''}" data-act="event-mile" ${mile ? '' : 'disabled'}>${mile ? `领取 ${mile * MILE.fame} 人气` : '暂无可领'}</button></div>`;

  const tierGuests = tiers.map((t) => {
    const foot = t.owned || t.claimed
      ? '<span class="ok">已获得</span>'
      : t.ready
        ? `<button class="btn sm gold" data-act="event-tier" data-slug="${t.slug}">解锁</button>`
        : `<span class="dim">还差 ${fmt(t.left)} 人气</span>`;
    return `<div class="gwrap">${guestCard(app, t.a, foot)}<small class="gcost">人气 ${fmt(t.fame)}</small></div>`;
  }).join('');

  const signGuests = SIGNIN_GIFTS.map((g) => {
    const a = app.data.bySlug[g.slug];
    const owned = !!s.roster[g.slug];
    const foot = owned ? '<span class="ok">已获得</span>' : `<span class="dim">还差 ${Math.max(0, g.days - signins)} 天</span>`;
    return `<div class="gwrap">${guestCard(app, a, foot)}<small class="gcost">${esc(g.note)}</small></div>`;
  }).join('');

  return `<div class="page"><h2>${EVENT_ZH} <small>${EVENT_SUB}</small></h2>
    <p class="hint">《忘却前夜》社区里的 9 位主播，作为彩蛋唤醒体加入了弥萨格。他们<b>不进召唤池</b>，只能靠下面的方式拿到；技能按各自昵称的意象原创，与本作世界观无关，也不代表本人观点。</p>
    ${fameBar}
    <h3>今日任务 <small>${sum.doneToday}/${sum.tasks} 已领取 · UTC 日期重置</small></h3>
    <div class="list">${taskRows}${mileRow}</div>
    <p class="hint">每日任务只数<b>在线挂机</b>的战斗（离线那几百场不算，否则睡一觉就做完了）；在线打赢一场算 1，首通再单独算。签到每次也会 +${SIGNIN_FAME} 人气。</p>
    <h3>嘉宾席 <small>人气档位解锁 · ${sum.owned}/${sum.total}</small></h3>
    <div class="guests">${tierGuests}</div>
    <h3>签到赠送 <small>累计签到（跨月累计，不清零）</small></h3>
    <div class="guests">${signGuests}</div>
    <p class="hint">累计签到 ${SIGNIN_GIFTS.map((g) => g.days).join(' / ')} 天各送一位，达标时自动进包（老存档进游戏也会补发）。点嘉宾卡可以看完整技能；拿到之后和普通唤醒体一样能升级、突破、叠位、装备命轮与密契。目前人气：<b>${fmt(fameOf(s))}</b>。</p>
  </div>`;
}
