// 「是鸟弟就下100层」与账号档案之间的连接件。
//
// 和 merge-sync.js 一个道理：游戏页要的是「一个脚本请求点开就能玩」，
// 而账号那条链（common + i18n + auth + api + account）有 60 多 KB，塞进首屏不值当。
// 所以游戏先跑起来，空闲时再把这个文件动态 import 进来
// （构建后是 js/b/sync 的兄弟文件 js/b/bird-sync.js，一个额外请求、不挡任何东西）：
//   · 拉到了 → 云端纪录比本机高就接上，打完一局顺手推上去
//   · 拉不到 / 没网 / 没登录 → 完全不影响玩，纪录照旧存本机
import { account, birdBest } from './account.js';
import { auth } from './auth.js';

// 首次进游戏时问一次账号：云端最深到过几层、最高多少分。
// 返回 { lv, sc }，最多等 wait 毫秒——等不到就按本机算。
export function pullBest(wait = 6000) {
  if (!auth.logged) return Promise.resolve(birdBest());
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener('zjtt:acct', finish);
      resolve(birdBest());
    };
    document.addEventListener('zjtt:acct', finish);
    account.ready()
      .catch(() => false)
      .then(() => setTimeout(finish, 800));
    setTimeout(finish, wait);
  });
}

// 刷新纪录：先落本机（立刻生效），再让 account 延后推送。
// 只在一局结束时调，别每下一层就调一次。
export function pushBest(lv, sc) {
  return account.setBirdBest(lv, sc);
}

// 推送时机交给 account 自己的节流（默认 1.5 秒后合并成一次 PUT）
export function flush() {
  account.schedule(1200);
}
