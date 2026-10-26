// 每日签到：每天可签一次，+10 银芯，连续签到记录天数。
// 状态存 zjtt:checkin，跟着账号档案同步（换设备当天也不能再签）。
import { store, wallet, markDirty, h, t, scIcon, scNum, toast } from './common.js';

const KEY = 'checkin';
export const REWARD = 10;

const pad = (n) => String(n).padStart(2, '0');
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const prevKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

export function state() {
  const s = store.get(KEY, null);
  return s && typeof s === 'object' ? { last: '', streak: 0, total: 0, ...s } : { last: '', streak: 0, total: 0 };
}
export const done = () => state().last === dayKey();

// 领取今天的签到。返回 { ok, gain, streak }；已签过时 ok=false。
export function claim() {
  if (done()) return { ok: false, gain: 0, streak: state().streak };
  const s = state();
  const streak = s.last === prevKey() ? (s.streak || 0) + 1 : 1;
  store.set(KEY, { last: dayKey(), streak, total: (s.total || 0) + 1 });
  // 注意顺序：先记签到，再加银芯，这样中途失败也不会重复发放
  wallet.add(REWARD);
  markDirty('checkin');
  return { ok: true, gain: REWARD, streak };
}

// 顶栏的银芯数字是页面加载时渲染的，签到后要手动刷一下
function refreshNavCredits() {
  const el = document.querySelector('.top .credits');
  if (el) el.replaceChildren(scNum(wallet.get(), 17));
}

// 面板里的签到条：已签到时是静态状态，未签到时是可点的按钮
export function checkinBar(cls = '', onDone) {
  const s = state();
  const ok = done();
  const btn = h('button', {
    class: `btn ck-btn${ok ? ' ghost' : ''}`, type: 'button', disabled: ok,
    onclick: () => {
      const r = claim();
      if (!r.ok) return;
      toast(t('ckGain', { n: r.gain }));
      refreshNavCredits();
      const host = btn.closest('.ck');
      if (host) host.replaceWith(checkinBar(cls, onDone));
      if (onDone) onDone(r);
    },
  }, ok ? t('ckDone') : [t('ckBtn'), ' ', scIcon(13), ` ${REWARD}`]);

  return h('div', { class: `ck ${cls}`.trim() },
    h('div', { class: 'cktext' },
      h('b', {}, t('ckTitle')),
      h('small', { class: 'note' }, ok
        ? `${t('ckStreak', { n: s.streak })} · ${t('ckTomorrow')}`
        : t('ckNote'))),
    btn);
}
