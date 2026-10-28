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
  return `<div class="page"><h2>签到 <small>${esc(monthKey(now))} · 已签 ${st.claimed.length}/${n} 天${can ? ' · 今日未签' : ''}</small></h2>
    <p class="hint">每天签到一次（UTC 日期）；每逢 7 的倍数的日子奖励翻倍并附带装备。漏签的日子可以花 ${BACKFILL_COST} 银芯补签。每月 1 日重置。</p>
    <div class="scal">${cells}</div><h3>累计奖励</h3><div class="list">${cum}</div></div>`;
}
