// 「合成大杜勒」与账号档案之间的那一小块连接件。
//
// 为什么不直接写在 js/merge.js 里：合成大杜勒的卖点是「一个脚本请求、点开就能玩」，
// 而账号这条链（common + i18n + auth + api + account）有 60 多 KB，全塞进首屏不值当。
// 所以游戏先跑起来，空闲时再把这个文件动态 import 进来（构建后是 js/b/merge-sync.js，
// 一个额外请求、不挡任何东西）：
//   · 拉到了 → 把云端最高分显示出来，打完一局顺手推上去
//   · 拉不到 / 没网 / 没登录 → 完全不影响玩，分数照旧存本机
import { account, mergeBest } from './account.js';
import { auth } from './auth.js';

// 首次进游戏时问一次账号：云端最高分是多少。
// account.ready() 自己会判断「数据还新鲜就不重拉」，所以这里不额外控制频率。
// 返回一个 Promise，最多等 wait 毫秒——等不到（没登录、后端慢）就先按本机算。
export function pullBest(wait = 6000) {
  if (!auth.logged) return Promise.resolve(mergeBest());
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      document.removeEventListener('zjtt:acct', finish);
      resolve(mergeBest());
    };
    // 档案落地的瞬间就把它交出去，不用等 push 那一轮
    document.addEventListener('zjtt:acct', finish);
    account.ready()
      .catch(() => false)
      // ready 可能是「数据还新鲜、没去拉」，那就给在飞的请求一点时间再收尾
      .then(() => setTimeout(finish, 800));
    setTimeout(finish, wait);
  });
}

// 刷新纪录：先落本机（立刻生效，下一局就按新纪录算），再让 account 延后推送。
// 只在「这局结束 / 页面要走」时调，不要每涨一分调一次。
export function pushBest(v) {
  return account.setMergeBest(v);
}

// 推送时机交给 account 自己的节流（默认 1.5 秒后合并成一次 PUT）
export function flush() {
  account.schedule(1200);
}
