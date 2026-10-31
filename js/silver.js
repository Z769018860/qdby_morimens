// 银芯钱包（所有小游戏共用的 zjtt:credits）的最小读写件。
//
// 不 import js/common.js：那一条链（common + i18n + auth + account）有 60 多 KB，
// 为了写一个数字把首屏翻几倍不值当。写入格式必须和 common.js 的 store.set() 一致
// （JSON.stringify 的数字），读的时候两种写法（"120" / 120）都认。
const KEY = 'zjtt:credits';

export function walletGet() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const v = Number(JSON.parse(raw));
    return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  } catch { return 0; }
}

// 入账。n 必须是正数；返回入账后的余额。zjtt:dirty 让 account.js（登录后）把这笔钱排队推上云，
// 没人听的时候事件白丢，但本机数字是对的。
export function walletAdd(n) {
  const add = Math.round(Number(n) || 0);
  if (add <= 0) return walletGet();
  try {
    const v = walletGet() + add;
    localStorage.setItem(KEY, JSON.stringify(v));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return v;
  } catch { return walletGet(); }
}

// 扣钱：不够返回 false，不会扣成负数
export function walletSpend(n) {
  const cost = Math.round(Number(n) || 0);
  if (cost <= 0) return true;
  if (walletGet() < cost) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(walletGet() - cost));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return true;
  } catch { return false; }
}

// 原作的银芯图标（assets/ui/silvercore.webp），小图直接引用，不额外内联
export const SC_SRC = 'assets/ui/silvercore.webp';
export const scTag = (txt) => `<img src="${SC_SRC}" alt="银芯" width="16" height="16" decoding="async" style="vertical-align:-3px;margin-right:3px">${txt == null ? '' : `<b>${txt}</b>`}`;
