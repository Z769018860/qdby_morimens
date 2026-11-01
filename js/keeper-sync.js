// 「杀死守密人」与账号档案之间的连接件。
//
// 为什么单独一个文件：游戏页要的是「一个脚本点开就能玩」，而账号这条链
// （account + auth + api + gamestats + gamecloud）有几十 KB，塞进首屏不值当。所以等玩家第一次
// 真的解锁了结局，再把这个文件动态 import 进来（构建后是 js/b/keeper-sync.js）：
//   · 拉到了 → 云端档案里的结局数 / 形态数就是最新的，首页排行榜能看到自己
//   · 拉不到 / 没登录 / 后端没起来 → 完全不影响玩，图鉴照旧存本机
//
// 两层同步，别搞混：
//   1. 档案摘要（digest）→ 个人中心与首页排行榜用的那一份，只有三个数字
//   2. 整份存档（gamecloud /save/keeper）→ 图鉴里到底点亮了哪几格、中途停在哪一夜
import { account } from './account.js';
import { auth } from './auth.js';
import { startGameCloud } from './gamecloud.js';

let started = false;

// 登录了才开始同步。第一次解锁结局时调（js/keeper.js 的 cloudTouch）。
// startGameCloud 自带：1.5 秒后拉一次（换设备能把图鉴和中途那一夜拿回来，
// 两边都改过就弹窗让你选），之后每 45 秒看一眼本机内容有没有变、
// 切后台或离开页面时推一次。
export function boot() {
  if (!auth.logged) return false;
  if (started) return true;
  started = true;
  try { startGameCloud('keeper'); } catch { /* 同步起不来也能玩 */ }
  return true;
}

export function pull() {
  if (!auth.logged) return Promise.resolve(false);
  boot();
  return account.ready().catch(() => false);
}

// 解锁结局之后调一次：account 会节流合并成一次 PUT，把摘要推上去
export function flush() {
  if (!auth.logged) return;
  boot();
  account.schedule(1500);
}
