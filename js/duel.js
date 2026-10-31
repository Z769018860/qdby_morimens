// 「唤醒王：决斗链接」的入口：只做一件事——把页面接上。
// 规则在 duel/engine.js，对手在 duel/ai.js，画面在 duel/view.js，
// 卡表与图集由 scripts/build.mjs 从 data/duel-*.json 生成到 duel/gen.js。
import { boot } from './duel/view.js';
import { startGameCloud } from './gamecloud.js';

boot();

// 登录了本站账号就把收藏 / 战绩同步到云端（js/gamecloud.js）
startGameCloud('duel');
