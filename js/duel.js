// 「唤醒王：决斗链接」的入口：只做一件事——把页面接上。
// 规则在 duel/engine.js，对手在 duel/ai.js，段位在 duel/rank.js，画面在 duel/view.js，
// 卡表与图集由 scripts/build.mjs 从 data/duel-*.json 生成到 duel/gen.js。
import { boot } from './duel/view.js';
import { startGameCloud } from './gamecloud.js';

// 段位分要出现在首页排行榜上，靠的是账号档案里的摘要（js/gamestats.js 的 digest）。
// 这条链几十 KB，浏览器空闲了再动态 import，不挡首屏（构建后是 js/b/duel-sync.js）。
let sync = null;
function syncMod() {
  if (!sync) sync = import('./duel-sync.js').catch(() => null);
  return sync;
}

boot({ afterPve: () => { syncMod().then((m) => { if (m) m.flush(); }); } });
setTimeout(() => { syncMod().then((m) => { if (m) m.pull(); }); }, 1500);

// 登录了本站账号就把收藏 / 战绩整份存档同步到云端（js/gamecloud.js）
startGameCloud('duel');
