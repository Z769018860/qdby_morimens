// 新手引导：遮罩挖洞指向底部导航的各个分组，逐条说明这一块能干什么。
// 不用第三方库，纯定位计算；目标元素找不到时自动跳过该步，不会卡住。
import { esc } from './util.js';
import { sound } from './audio.js';

// 每步：g = 底部导航的分组（null = 居中说明，不指向任何按钮）；d 里用 <ul> 分点，别写成一整段。
const STEPS = [
  {
    g: null, t: '欢迎来到挂机前夜',
    d: `<p>四人小队<b>自动战斗</b>，你只负责「变强」。核心循环就三步：</p>
      <ol><li><b>挂机</b>：打赢关卡拿金币、召唤券、银芯、装备（关上也能离线收益，最多 8 小时）。</li>
        <li><b>养成</b>：金币升级角色、银芯突破 / 叠位，装上命轮、密契、造物、钥令。</li>
        <li><b>推进</b>：队伍变强，就能打更深的关，收益更高。</li></ol>
      <p>下面按底部导航逐个看一遍，<b>30 秒</b>就够。之后第一次点开「队伍」「唤醒体」「召唤」页，页面顶上还有一张对应的新手提示卡。</p>`,
  },
  {
    g: 'battle', t: '战斗：自动挂机，打不过会自己退',
    d: `<ul><li>默认<b>自动挂机</b>：打赢且够从容就自动进下一关；<b>打不过的关不会死守</b>，会退到「有收益的最高层」继续刷。</li>
        <li>右上角「自动挂机」关掉 = <b>手动挂机</b>：永远停在你选的那一关反复刷，用 ◀ ▶ 换关。</li>
        <li>关上方两块面板写着<b>当前关 / 下一关</b>的胜率和每小时收益，换关前先看一眼划不划算。</li></ul>`,
  },
  {
    g: 'team', t: '养成：队伍、唤醒体、命轮密契、钥令',
    d: `<ul><li><b>队伍</b>：决定谁上场。1–2 号位前排、3–4 号位后排；同界域 3 人 +8%、4 人 +15%。<b>不会配就点「一键配队」</b>，人、装备、造物、钥令一次排好。</li>
        <li><b>唤醒体</b>：点角色进详情，在这里<b>升级（金币）、突破（金币 + 银芯，每 20 级一次）、叠位（银芯）</b>；等级不满意还能花 100 银芯回溯。</li>
        <li><b>命轮密契</b>：每人各 1 件；<b>钥令</b>：全队 3 个。造物栏 6 格，同主题 2/4/6 件触发羁绊。</li></ul>
      <p>推图最快的路：金币先给主线 4 人升级，装备交给「一键配队」。</p>`,
  },
  {
    g: 'summon', t: '召唤：抽新角色，重复就叠位',
    d: `<ul><li><b>召唤券</b>抽唤醒体：十连至少 1 个史诗，<b>50 抽内必出创生</b>。券来自挂机掉落、首通、签到、成就和各挑战奖励。</li>
        <li><b>银芯</b>也能抽（200 / 抽，十连 1900），和召唤券<b>共用保底</b>。</li>
        <li><b>重复抽到 = 叠位 +1</b>：每叠位全属性 +1.5%，等级上限 +1。</li>
        <li>页面下方还有<b>银芯商店</b>（换券 / 金币 / 装备 / 钥令匣，每日限购）和<b>装备祈愿</b>（金币抽命轮 / 密契 / 造物）。</li></ul>`,
  },
  {
    g: 'challenge', t: '挑战：推图卡住时来这里',
    d: `<ul><li><b>无限塔</b>每天 3 次；<b>周 Boss</b> 每周换人，比累计伤害；<b>属性塔</b>只收对应界域；<b>竞技场</b>可和好友代码对战。</li>
        <li><b>融灾禁区</b>：五队齐上的爬塔，<b>五队的角色和装备不能重复</b>，没编的队会自动补位。</li>
        <li>每个入口都能单独指定出战编队，还能给编队开「独立配装」。</li>
        <li>塔和周 Boss 里程碑会掉<b>钥令</b>，奖励是银芯和召唤券的重要来源。</li></ul>`,
  },
  {
    g: 'more', t: '更多：先去领福利',
    d: `<ul><li><b>签到</b>页有一次性的注册福利（银芯 1000 + 召唤券 10 + 金币 5000 + 装备）和 7 日新手礼，<b>先领了再玩</b>。</li>
        <li><b>联动</b>页：攒人气换「嘉宾征召券」，兑换联名角色（不进召唤池，重复兑换 = 叠位）。</li>
        <li><b>设置</b>页能导出存档、调音量，也能随时「重看新手引导」。</li></ul>`,
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
  return step.g ? document.querySelector(`#tabs button[data-group="${step.g}"]`) : null;
}

function draw() {
  if (!state) return;
  const step = STEPS[state.i];
  const el = targetOf(step);
  if (step.g && !el) { next(); return; }
  const vh = window.innerHeight, vw = window.innerWidth;
  // 居中说明步（g = null）：没有高亮目标，高亮框缩成一个点放在屏幕外，气泡居中
  const r = el ? el.getBoundingClientRect() : { left: vw / 2, top: vh / 2, width: 0, height: 0 };
  const pad = el ? 7 : 0;
  state.box.style.display = el ? '' : 'none';

  // 高亮框：用超大 box-shadow 把四外遮暗，就是「挖洞」
  Object.assign(state.box.style, {
    left: `${r.left - pad}px`, top: `${r.top - pad}px`,
    width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px`,
  });

  const isLast = state.i === STEPS.length - 1;
  // d 里的 <b> 是写死在 STEPS 里的强调标签（不是外部数据），直接当 HTML 用；
  // 原先走 esc() 会把标签原样显示出来。
  state.pop.innerHTML = `<div class="gp-head"><span class="gp-n">${state.i + 1}/${STEPS.length}</span><b>${esc(step.t)}</b></div>
    <div class="gp-body">${step.d}</div>
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
  state.pop.style.top = el ? `${Math.max(10, r.top - pad - ph - 12)}px` : `${Math.max(10, (vh - ph) / 2)}px`;
  state.pop.dataset.last = isLast || !el ? '1' : '0';   // 最后一步和居中步不画箭头
  if (!el) { state.pop.style.left = `${(vw - w) / 2}px`; }
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
