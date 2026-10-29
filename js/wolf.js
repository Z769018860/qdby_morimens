// 弥萨格狼人杀：页面入口
//
// 真正的活都在 js/wolf/ 里：
//   data.js   身份牌、难度、62 名唤醒体的人设与台词
//   ai.js     每个 AI 的怀疑模型与发言决策
//   engine.js 发牌、昼夜流程、投票、胜负
//   ui.js     对话流、操作条、名单、身份牌、结算
//   art.js    62 张头像（构建时内联，整页只有这一个脚本请求）
import { boot } from './wolf/ui.js';

boot();
