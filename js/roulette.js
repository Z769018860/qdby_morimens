// 弥萨格轮盘 · 页面入口。
//
// 只做一件事：把界面挂起来。规则在 engine.js，对手在 ai.js，房间在 net.js，
// 页面本身（src/pages/roulette.html）只有壳和样式——构建时这几层会被打成一个脚本。
import { mount } from './roulette/view.js';

mount();
