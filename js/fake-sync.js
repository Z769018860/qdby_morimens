// 「寻找伪人：Morimens」与账号档案之间的连接件。
//
// 和「杀死守密人」同构：游戏页只负责玩，账号这条链（account + auth + api + gamestats + gamecloud）
// 有几十 KB，不该塞进首屏。所以第一次解锁结局时由 js/fake/main.js 的 cloudTouch() 动态 import 进来
// （构建后是 js/b/fake-sync.js）：
//   · 拉到了 → 云端档案里的「最高分 / 走到的天数 / 见过的结局数」就是最新的，首页排行榜能看到自己
//   · 拉不到 / 没登录 / 后端没起来 → 完全不影响玩，图鉴与最高分照旧存本机
//
// 两层同步：
//   1. 档案摘要（digest）→ 个人中心 / 站长后台 / 首页排行榜用的那一份，只有三个数字
//      （见 js/gamestats.js 的 digest() 里 out.fk = [最高分, 走到第几天, 结局数]）
//   2. 整份存档（gamecloud /save/fake）→ 图鉴里点亮了哪几格、中途停在哪一夜，换设备能接着玩
import { account } from './account.js';
import { auth } from './auth.js';
import { startGameCloud } from './gamecloud.js';

let started = false;

// 登录了才开始同步。第一次解锁结局时调（js/fake/main.js 的 cloudTouch）。
// startGameCloud 自带：1.5 秒后拉一次（换设备能把图鉴和中途那一夜拿回来，
// 两边都改过就弹窗让你选），之后每 45 秒看一眼本机内容有没有变、
// 切后台或离开页面时推一次。
export function boot() {
  if (!auth.logged) return false;
  if (started) return true;
  started = true;
  try { startGameCloud('fake'); } catch { /* 同步起不来也能玩 */ }
  return true;
}

export function pull() {
  if (!auth.logged) return Promise.resolve(false);
  boot();
  return account.ready().catch(() => false);
}

// 解锁结局之后调一次：account 会节流合并成一次 PUT，把摘要（含 gd.fk）推上去
export function flush() {
  if (!auth.logged) return;
  boot();
  account.schedule(1500);
}
