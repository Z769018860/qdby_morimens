// 电子斗蛐蛐 · 页面入口。
//
// 规则在 engine.js（战斗）、table.js（押注与彩池）、ai.js（九个人的下注脑子），
// 这一页只有壳和样式；构建时这几层会被打成一个脚本，怪物名录与头像内联在 gen.js。
import { mount } from './bugfight/view.js';

mount();
