// 签到
import { signinState, monthKey, daysInMonth, dayReward, CUM, BACKFILL_COST } from '../core/signin.js';
import { esc, rewardText } from './util.js';

export function signinPage(app) {
  const { state: s } = app, now = new Date(), st = signinState(s, now), today = now.getUTCDate(), n = daysInMonth(now);
  const can = !st.claimed.includes(today);
  const cells = Array.from({ length: n }, (_, i) => {
    const d = i + 1, got = st.claimed.includes(d), r = dayReward(d), big = d % 7 === 0;
    const state = got ? 'got' : d === today ? 'today' : d < today ? 'miss' : 'future';
    return `<div class="sday ${state} ${big ? 'big' : ''}"><b>${d}</b><small>${r.tickets}🎫 ${r.cores}💠${r.item ? ' +装备' : ''}</small>
      ${state === 'today' ? `<button class="btn sm gold" data-act="sign-today">签到</button>` : state === 'miss' ? `<button class="btn sm" data-act="sign-back" data-d="${d}" ${s.cores >= BACKFILL_COST ? '' : 'disabled'}>补签 💠${BACKFILL_COST}</button>` : state === 'got' ? '<span class="ok">✓</span>' : ''}</div>`;
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
      return `<div class="sday ${got ? 'got' : open ? 'today' : 'future'}"><b>第 ${i + 1} 天</b><small>${r.cores}💠 ${r.tickets}🎫${r.item ? ' +装备' : ''}</small>${got ? '<span class="ok">✓</span>' : `<button class="btn sm ${open ? 'gold' : ''}" data-act="welcome-7" data-i="${i}" ${open ? '' : 'disabled'}>${open ? '领取' : '未到'}</button>`}</div>`;
    }).join('');
    body = `<p>账号 <b>${esc(st.name)}</b> · 注册福利已领取。7 日新手福利（从领取当天起算，错过的天数可在之后 7 天内补领）：</p><div class="scal">${days}</div>`;
  }
  return `<div class="banner-card welcome"><h3>🎁 注册福利 <small>银芯 💠</small></h3>${body}</div>`;
}
