// 银芯 = 全站共用的局外资源。
//
// 站点个人中心（js/account.js）的钱包存在 localStorage 的 zjtt:credits，战报侦探、校猫的结合等游戏、
// 管理员发放的银芯都走它；挂机前夜过去自己有一套「银芯」(state.cores)，两边互不相通——
// 管理员发的银芯挂机里看不到，挂机里花掉的银芯个人中心也不扣。这里把两者并成一个数：
// state.cores 只是钱包的「本局镜像」，每次存档前后对一次账：
//   本机上次对账时的镜像值 = state.coresBase；这段时间挂机里的增减 = state.cores - coresBase；
//   新钱包 = 当前钱包 + 这段增减（别的页面 / 别的标签页在这期间发放、花费的也都算在 当前钱包 里）。
// 第一次（还没有 coresBase）把挂机里原有的银芯并进钱包，之后两边就是同一个数。
// coresBase 跟着存档走：云存档拉到另一台设备时不会再并第二次。
export const WALLET_KEY = 'zjtt:credits';

export function readWallet() {
  try {
    const v = JSON.parse(globalThis.localStorage?.getItem(WALLET_KEY) ?? '0');
    const n = Math.floor(Number(v));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}
export function writeWallet(n) {
  try { globalThis.localStorage?.setItem(WALLET_KEY, JSON.stringify(Math.max(0, Math.floor(n)))); return true; } catch { return false; }
}

/** 纯函数：把 state.cores 与钱包 w 对账，改写 state.cores / state.coresBase，返回新的钱包值 */
export function reconcile(state, w) {
  const wallet = Math.max(0, Math.floor(Number(w) || 0));
  const cores = Math.max(0, Math.floor(Number(state.cores) || 0));
  const base = Number(state.coresBase);
  let total;
  if (!Number.isFinite(base)) total = wallet + cores;             // 第一次：两边的银芯合并
  else total = Math.max(0, wallet + (cores - Math.floor(base)));  // 之后：只加这段时间挂机里的增减
  state.cores = total;
  state.coresBase = total;
  return total;
}
