// 新手引导：遮罩挖洞指向底部导航的各个分组，逐条说明这一块能干什么。
// 不用第三方库，纯定位计算；目标元素找不到时自动跳过该步，不会卡住。
import { esc } from './util.js';
import { sound } from './audio.js';

const STEPS = [
  {
    g: 'battle', t: '战斗：什么都不用做',
    d: '你的 4 人小队会全自动推关，技能、共鸣、超共鸣都会自己放。你只需要决定阵容和钱花在哪。离开游戏也会累积收益（最多 8 小时）。',
  },
  {
    g: 'team', t: '养成：队伍 / 唤醒体 / 装备',
    d: '这一组有三个页面，用顶部的胶囊按钮切换。队伍决定谁上场（同界域 3 人 +8%、4 人 +15%）；唤醒体里点开任意角色能看完整立绘和技能原文；装备用来强化命轮、密契、造物。',
  },
  {
    g: 'summon', t: '召唤：抽新的唤醒体',
    d: '用召唤券或银芯抽卡，十连至少一个史诗，38 抽内必出创生。重复抽到同一个角色会升星，每星全属性 +8%。',
  },
  {
    g: 'challenge', t: '挑战：塔、周本、属性塔、竞技场',
    d: '推图卡住时来这组。无限塔每天 3 次、生命继承；周 Boss 每周换人、比累计伤害；属性塔只收对应界域；竞技场是和好友代码对战，不需要服务器。',
  },
  {
    g: 'more', t: '更多：先领福利',
    d: '签到页有一次性的注册福利（银芯 1000 + 召唤券 10 + 金币 5000 + 装备），还有 7 日新手礼。图鉴收录 537 个怪物，成就有 100 多个。',
    btn: '去签到',
    go: 'signin',
  },
];

let state = null;

export function startGuide(app, done) {
  if (state) return;
  state = { app, i: 0, done, box: null, pop: null, bg: null };
  const bg = document.createElement('div');
  bg.className = 'guide-bg';
  document.body.appendChild(bg);
  state.bg = bg;
  const box = document.createElement('div');
  box.className = 'guide-box';
  document.body.appendChild(box);
  state.box = box;
  const pop = document.createElement('div');
  pop.className = 'guide-pop';
  document.body.appendChild(pop);
  state.pop = pop;
  state.onKey = (e) => { if (e.key === 'Escape') end(true); };
  addEventListener('keydown', state.onKey);
  state.onResize = () => draw();
  addEventListener('resize', state.onResize);
  draw();
}

function targetOf(step) {
  return document.querySelector(`#tabs button[data-group="${step.g}"]`);
}

function draw() {
  if (!state) return;
  const step = STEPS[state.i];
  const el = targetOf(step);
  if (!el) { next(); return; }
  const r = el.getBoundingClientRect();
  const pad = 7, vh = window.innerHeight, vw = window.innerWidth;

  // 高亮框：用超大 box-shadow 把四外遮暗，就是「挖洞」
  Object.assign(state.box.style, {
    left: `${r.left - pad}px`, top: `${r.top - pad}px`,
    width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
  });

  const isLast = state.i === STEPS.length - 1;
  state.pop.innerHTML = `<div class="gp-head"><span class="gp-n">${state.i + 1}/${STEPS.length}</span><b>${esc(step.t)}</b></div>
    <p>${esc(step.d)}</p>
    <div class="gp-row"><button class="gp-skip" data-gskip>跳过引导</button><button class="gp-next" data-gnext>${esc(step.btn || (isLast ? '开始游戏' : '下一步'))}</button></div>`;

  // 气泡贴在高亮框上方居中，宽度不超过屏幕
  const w = Math.min(330, vw - 24);
  const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - w - 12);
  state.pop.style.width = `${w}px`;
  state.pop.style.left = `${left}px`;
  // 气泡被屏幕边缘夹住时，箭头要跟着偏移，否则会指偏
  const arrow = Math.min(Math.max(16, r.left + r.width / 2 - left), w - 16);
  state.pop.style.setProperty('--arrow', `${arrow}px`);
  // 先放上去量高度，再决定最终位置，避免超出一屏
  state.pop.style.top = '0px';
  const ph = state.pop.offsetHeight || 180;
  state.pop.style.top = `${Math.max(10, r.top - pad - ph - 12)}px`;
  state.pop.dataset.last = isLast ? '1' : '0';
}

function next() {
  if (!state) return;
  if (state.i + 1 < STEPS.length) { state.i++; sound.play('nav'); draw(); }
  else end(false);
}

function end(skipped) {
  if (!state) return;
  const { done, bg, box, pop, onKey, onResize, i } = state;
  const go = skipped ? null : STEPS[i]?.go || null;
  [bg, box, pop].forEach((n) => n?.remove());
  removeEventListener('keydown', onKey);
  removeEventListener('resize', onResize);
  state = null;
  done?.(skipped, go, i);
}

// 事件委托：引导层是自己插到 body 上的，不经过主应用的 onAct
document.addEventListener('click', (e) => {
  if (!state) return;
  if (e.target.closest('[data-gskip]')) { end(true); return; }
  if (e.target.closest('[data-gnext]')) { next(); }
}, true);
