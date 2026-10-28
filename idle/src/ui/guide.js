// 新手引导：遮罩挖洞指向底部导航的各个分组，逐条说明这一块能干什么。
// 不用第三方库，纯定位计算；目标元素找不到时自动跳过该步，不会卡住。
import { esc } from './util.js';
import { sound } from './audio.js';

const STEPS = [
  {
    g: 'battle', t: '战斗：自动挂机，或手动挂机',
    d: '默认自动挂机：循环刷当前关，打赢且够从容就自动推进到下一关。点右上角「自动挂机」关掉就切成手动挂机——战斗照常连打，但不再自动往前走，永远停在你选的那一关反复刷，输了也不会被退回；想换关卡点右上角 ◀ ▶ 自己走过去。关上方两块面板写着当前关和下一关的胜率 / 金币 / 召唤券 / 银芯 / 装备，换关前先算算划不划算。召唤券与银芯的掉率<b>随关卡缓慢提升</b>（每深一关 +1.8% / +2.6%），所以能挂多深就挂多深。离开游戏也会按同样口径累积收益（最多 8 小时）。',
  },
  {
    g: 'team', t: '养成：队伍 / 唤醒体 / 命轮密契 / 钥令',
    d: '这一组有四个页面，用顶部胶囊切换。队伍页决定谁上场（同界域 3 人 +8%、4 人 +15%），右上角「一键配队」会把 4 人队伍、每人的命轮与密契、已解锁格里的造物、3 个钥令位一次性排好。命轮密契页能直接看到队伍每人装了什么，点槽位就能换。造物同主题 2/4/6 件触发羁绊；钥令提供起始能量、首击、濒死存活等全队效果。',
  },
  {
    g: 'summon', t: '召唤：抽卡与叠位',
    d: '用召唤券或银芯抽卡，十连至少一个史诗，38 抽内必出创生。重复抽到同一角色 = 叠位 +1，上限 99：每 1 叠位全属性 +1.5%、等级上限 +1，满叠位能到 159 级。抽不到重复时也能用银芯「共鸣」叠位。',
  },
  {
    g: 'challenge', t: '挑战：塔、周本、属性塔、竞技场',
    d: '推图卡住时来这组。无限塔每天 3 次、生命继承；周 Boss 每周换人、比累计伤害；属性塔只收对应界域；竞技场是和好友代码对战，不需要服务器。塔每 10 层、周 Boss 里程碑都会掉钥令。',
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
