// 「唤醒王：决斗链接」与账号档案之间的连接件（只为段位分上首页排行榜）。
//
// 为什么不写在 view.js 里：对战页的首屏要的是「点开就能打」，而账号这条链
// （account + auth + api + gamestats）有几十 KB。所以游戏先跑起来，空闲时再把这个文件
// 动态 import 进来（构建后是 js/b/duel-sync.js，一个额外请求、不挡任何东西）：
//   · 拉到了 → 云端档案里就有本机的段位分，首页排行榜能看到自己
//   · 拉不到 / 没登录 / 后端没起来 → 完全不影响玩，段位分照旧存本机
//
// 注意：这里同步的是「档案摘要」（js/account.js 的 snapshot → js/gamestats.js 的 digest），
// 不是整份存档——整份存档走 js/gamecloud.js 的 /save/duel。
import { account } from './account.js';
import { auth } from './auth.js';

// 进页面问一次账号（account.ready 自己会判断数据还新不新鲜，不用额外控频）
export function pull() {
  if (!auth.logged) return Promise.resolve(false);
  return account.ready().catch(() => false);
}

// 结算之后推一次：段位分 / 战绩已经写进 localStorage，account 会节流合并成一次 PUT
export function flush() {
  if (!auth.logged) return;
  account.schedule(1200);
}
