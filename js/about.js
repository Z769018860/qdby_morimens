// 说明页：只做语言切换与导航注入
import { nav, lang, t } from './common.js';
document.body.prepend(nav('about'));
// 两段内容按语言只留一段：默认 HTML 里给 sec-en 加了 hidden，
// 英文态必须把 sec-zh 也显式隐藏，否则中英会同时出现。
const zhSec = document.getElementById('sec-zh');
const enSec = document.getElementById('sec-en');
const isEn = lang.cur === 'en';
zhSec.hidden = isEn;
enSec.hidden = !isEn;
document.documentElement.lang = lang.cur === 'en' ? 'en' : 'zh-CN';
document.title = t('navAbout') + ' · ' + t('brand');
document.querySelector('footer.foot').textContent = t('footNote');
