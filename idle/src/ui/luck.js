// 疾驰欢愉的大运：界面
//
// 主页 = 难度 + 分数进度 + 天赋 + 成就；有进行中的局就整页切成「车厢」——
// 一条 12 格的进度条（战斗 / 事件 / 商店 / 精英 / 首领各不相同）、队伍血条、
// 当前节点面板、右边挂着这一局攒下的造物与增益。
import {
  LUCK_ACTS, LUCK_NODES, NODE_PLAN, LUCK_DIFFS, diffOf, LUCK_BUFFS, LUCK_RELICS, LUCK_TALENTS,
  LUCK_ACH, LUCK_LEVELS, LUCK_EVENTS, luckState, levelOf, talentLv, freeTp, spentTp,
  nodeKindOf, nodeStage, offerPool, eventOf, shopStock,
} from '../core/luckrun.js';
import { esc, img, fmt, openModal, rewardText } from './util.js';
import { squadBar } from './pages.js';
import { teamSlugsFor, withLoadout } from '../core/squad.js';
import { allyDefsOf } from '../core/luckrun.js';
import { domainRules, DOMAINS } from '../core/enemies.js';

const KIND_ZH = { battle: '战斗', elite: '精英', boss: '首领', event: '事件', shop: '商店' };
const KIND_ICON = { battle: '⚔', elite: '✦', boss: '☠', event: '❖', shop: '⌂' };
const REWARD = rewardText;
const EV_BY_ID = Object.fromEntries(LUCK_EVENTS.map((e) => [e.id, e]));

const hpPct = (run, slug) => Math.max(0, Math.min(1, run.hp[slug] ?? 1));
const teamZh = (data, run) => run.slugs.map((sl) => data.bySlug[sl]?.zh || sl);

/* ---------------------------------------------------------------- 主页 */
export function luckPage(app) {
  const s = luckState(app.state);
  const run = s.cur;
  if (run && !run.end) return runPage(app, run);
  return homePage(app, s);
}

function homePage(app, s) {
  const { state: st, data } = app;
  const lv = levelOf(s.pts);
  const next = LUCK_LEVELS.find((L) => L.lv === lv + 1);
  const prevNeed = lv ? LUCK_LEVELS[lv - 1].need : 0;
  const pct = next ? Math.max(0, Math.min(100, ((s.pts - prevNeed) / Math.max(1, next.need - prevNeed)) * 100)) : 100;
  const avg = (() => {
    const t = teamSlugsFor(st, 'luck').filter((x) => st.roster[x]);   // 选了哪一队就按哪一队算
    if (!t.length) return 0;
    return Math.round(t.reduce((n, x) => n + (st.roster[x].lv || 1), 0) / t.length);
  })();
  const diffs = LUCK_DIFFS.map((d) => {
    const ok = avg >= d.lv - 8;       // 差 8 级以内就算「能试试」，差太多标红提醒
    const near = Math.abs(avg - d.lv) <= 8;
    return `<div class="lkdiff ${near ? 'on' : ''}">
      <div class="hd"><b>${esc(d.zh)}</b><span class="dim">推荐平均 ${d.lv} 级</span></div>
      <p class="hint">${esc(d.note)}</p>
      <p class="dim">敌人 ×${d.scale.toFixed(2)} · 分数 ×${d.mult.toFixed(1)}</p>
      <button class="btn ${near ? 'gold' : ''}" data-act="luck-start" data-k="${d.id}">${ok ? '出发' : '等级偏低，仍要出发'}</button>
    </div>`;
  }).join('');
  const t = (st.team || []).filter((x) => st.roster[x]);
  // 30 级一条长阶梯，全铺出来太长：默认只显示当前等级往前 2 级，想看历史点「查看全部」
  const allLv = !!app.ui.luckAllLv;
  const vis = allLv ? LUCK_LEVELS : LUCK_LEVELS.filter((L) => L.lv >= Math.max(1, lv - 2));
  const claimed = LUCK_LEVELS.filter((L) => s.lvClaimed[L.lv]).length;
  const lvRows = vis.map((L) => {
    const got = !!s.lvClaimed[L.lv], can = s.pts >= L.need && !got;
    return `<div class="lkrow ${got ? 'done' : ''}"><b>Lv.${L.lv}</b><span>累积 ${fmt(L.need)} 分</span>
      <span class="dim">${REWARD(L)}${L.tp ? ` · 天赋点 +${L.tp}` : ''}</span>
      <button class="btn sm ${can ? 'gold' : ''}" data-act="luck-claim-lv" data-i="${L.lv}" ${can ? '' : 'disabled'}>${got ? '已领' : can ? '领取' : '未达成'}</button></div>`;
  }).join('') + `<button class="btn sm" data-act="luck-lv-toggle">${allLv ? '只看最近的等级' : `查看全部 ${LUCK_LEVELS.length} 级（已领 ${claimed}）`}</button>`;
  const achRows = LUCK_ACH.map((a) => {
    const done = s.ach[a.id] && s.ach[a.id] !== true, claimed = s.ach[a.id] === true;
    return `<div class="ach ${done || claimed ? 'done' : ''}"><div class="ab"><b>${esc(a.zh)}</b><small>${esc(a.desc)}　奖励：${REWARD(a.reward)}${a.reward.tickets ? ` · 召唤券 ${a.reward.tickets}` : ''}</small></div>
      <button class="btn sm ${done ? 'gold' : ''}" data-act="luck-ach" data-id="${a.id}" ${done ? '' : 'disabled'}>${claimed ? '已领取' : done ? '领取' : '未达成'}</button></div>`;
  }).join('');
  const talRows = LUCK_TALENTS.map((x) => {
    const lv2 = talentLv(s, x.id), max = x.cost.length, cost = x.cost[lv2];
    const can = lv2 < max && freeTp(s) > 0;
    return `<div class="lkrow"><b>${esc(x.zh)}</b><span class="dim">${esc(x.desc)}</span>
      <span class="dots">${Array.from({ length: max }, (_, i) => `<i class="${i < lv2 ? 'on' : ''}"></i>`).join('')}</span>
      <button class="btn sm ${can ? 'gold' : ''}" data-act="luck-talent" data-id="${x.id}" ${can ? '' : 'disabled'}>${lv2 >= max ? '已满' : `升级（${cost} 点）`}</button></div>`;
  }).join('');

  return `<div class="page"><h2>疾驰欢愉的大运 <small>三层 · 每层 ${LUCK_NODES} 个节点（${NODE_PLAN.filter((x) => x !== 'event' && x !== 'shop').length} 场战斗）· 打完选增益与造物</small></h2>
  <div class="banner-card lk"><div><h3>开往欢愉的大运 <small>${s.runs} 趟 · 通关 ${s.clears} 次 · 最高单局 ${fmt(s.best)} 分</small></h3>
    <p>三层，每层 ${NODE_PLAN.filter((x) => x !== 'event' && x !== 'shop').length} 场战斗：中间夹着事件与商店，血量在节点之间继承，不会自动回满。
    每场战斗之后从「战斗增益 / 造物 / 本队角色的专属强化」里挑一个；造物整局生效，是这套玩法真正改命的东西。</p>
    <p class="hint">出战队伍平均等级 <b>${avg}</b>${t.length < 4 ? '（不满 4 人，建议先编好队）' : ''}　·　分数累积到 <b>${fmt(s.pts)}</b>，等级 <b>Lv.${lv}</b></p>
    <div class="bar big"><i style="width:${pct}%"></i></div>
    <p class="dim">${next ? `${fmt(next.need - s.pts)} 分升到 Lv.${next.lv}` : '等级已经满了，继续刷最高分吧'}</p>
  </div></div>
  ${squadBar(app, 'luck', '整趟大运固定用这一队；「大运专用队」只给大运用，不动推图 / 塔的编队')}
  <h3>选一个难度</h3><div class="lkdiffs">${diffs}</div>
  <h3>挑战等级 <small>累积分数换等级（共 ${LUCK_LEVELS.length} 级），30 级以前每级 1 点天赋点，之后每 4 级 1 点；每 10 级送 1 张免费回溯券</small></h3><div class="list">${lvRows}</div>
  <h3>大运专属天赋 <small>天赋点 ${freeTp(s)} 可用 · 已投入 ${spentTp(s)}（点满需要 ${LUCK_TALENTS.reduce((n, x) => n + x.cost.length, 0)} 点）</small></h3><div class="list">${talRows}</div>
  <h3>专属成就</h3><div class="list">${achRows}</div>
  ${s.lastRun ? `<h3>上一趟</h3><div class="list"><div class="lkrow"><b>${s.lastRun.win ? '打通三层' : `止步第 ${s.lastRun.act + 1} 层`}</b><span>得分 <b>${fmt(s.lastRun.score)}</b></span><span class="dim">${new Date(s.lastRun.at).toLocaleString()}</span></div></div>` : ''}
  </div>`;
}

/* ---------------------------------------------------------------- 局内 */
function runPage(app, run) {
  const { data } = app;
  const kind = nodeKindOf(run);
  const diff = diffOf(run.diff);
  const names = teamZh(data, run);
  const path = NODE_PLAN.map((k, i) => {
    const st = i < run.node ? 'done' : i === run.node ? 'now' : '';
    return `<div class="lknode ${st} k-${k}" title="${KIND_ZH[k]}"><i>${KIND_ICON[k]}</i><small>${i + 1}</small></div>`;
  }).join('');
  const team = run.slugs.map((sl, i) => {
    const p = hpPct(run, sl);
    // 头像是 awakeners 里的 portrait 字段（不是 img——data 里根本没有 img，取错就是四个破图）
    const face = data.bySlug[sl]?.portrait;
    return `<div class="lkface ${p <= 0 ? 'dead' : p <= 0.4 ? 'hurt' : ''}">${face ? `<img src="${img(face)}" alt="">` : '<i class="noface"></i>'}<b>${esc(names[i])}</b>
      <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div><small>${Math.round(p * 100)}%</small></div>`;
  }).join('');
  const relics = run.relics.length
    ? run.relics.map((id) => { const r = LUCK_RELICS.find((x) => x.id === id); return `<span class="lktag relic" title="${esc(r?.desc || '')}">${esc(r?.zh || id)}</span>`; }).join('')
    : '<span class="dim">还没有造物</span>';
  const buffs = Object.entries(run.buffs || {}).map(([id, n]) => {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    return `<span class="lktag buff" title="${esc(b?.desc || '')}">${esc(b?.zh || id)}${n > 1 ? ` ×${n}` : ''}</span>`;
  }).join('') || '<span class="dim">还没有增益</span>';
  const ups = run.ups.length
    ? run.ups.map((u) => `<span class="lktag up" title="${esc(u.desc)}">${esc(u.zh)}</span>`).join('')
    : '<span class="dim">还没有专属强化</span>';

  const stage = nodeStage(run.act, run.node, diff.stage);
  const rules = domainRules(stage);
  const body = kind === 'event' ? eventPanel(app, run)
    : kind === 'shop' ? shopPanel(app, run)
      : `<div class="lkbattle"><p>下一场：<b>${KIND_ZH[kind]}</b>　强度≈主线第 <b>${stage}</b> 关　难度 <b>${esc(diff.zh)}</b>${rules.length ? `　域规 ${rules.map((k) => `<span class="lktag buff" title="${esc(DOMAINS[k].d)}">${esc(DOMAINS[k].short)}</span>`).join('')}` : ''}</p>
        <p class="hint">${kind === 'boss' ? '本层首领，打完进下一层（全队回复 15% 生命）。' : kind === 'elite' ? '精英战，敌人比普通关多一个、血更厚。' : '普通战斗，赢下来才能继续前进。'}</p>
        <button class="btn big gold" data-act="luck-fight">开打</button></div>`;

  return `<div class="page"><h2>大运 · 第 ${run.act + 1} / ${LUCK_ACTS} 层 <small>${esc(diff.zh)} · 余晖 ${fmt(run.glow)} · 得分 ${fmt(run.score)}</small></h2>
  <div class="lkpath">${path}</div>
  <div class="lkfaces">${team}</div>
  ${statusPanel(app, run)}
  <div class="lkside"><b>造物</b><div class="lktags">${relics}</div>
    <b>增益</b><div class="lktags">${buffs}</div>
    <b>专属强化</b><div class="lktags">${ups}</div>
    ${run.maxhpPct ? `<b>额外</b><div class="lktags"><span class="lktag buff" title="事件里献出来的生命上限，整局有效">生命上限 +${run.maxhpPct}%</span></div>` : ''}</div>
  ${body}
  <div class="row"><button class="btn sm" data-act="luck-abandon">放弃这一趟</button></div>
  </div>`;
}

/** 队伍状态：每个人此刻的实际属性（队伍基础值 + 天赋 / 增益 / 造物 / 专属强化 + 当前血量）。
 *  战斗用的就是 allyDefsOf 算出来的这份，所以这里看到的数字和打起来的数字一致；每走一格页面都会重绘，随时是最新的。 */
function statusPanel(app, run) {
  const { state: s } = app;
  let defs = [];
  try { defs = withLoadout(s, run.sq || null, () => allyDefsOf(s, app.data, run)); } catch { return ''; }
  const f1 = (x) => (Math.round(x * 10) / 10);
  const cell = (k, v, tip = '') => `<span class="lkst" title="${esc(tip)}"><em>${k}</em><b>${v}</b></span>`;
  const rows = defs.map((d) => {
    const p = hpPct(run, d.slug), now = Math.round(d.hp * p);
    const dead = p <= 0.001;
    const a = app.data.bySlug[d.slug];
    return `<details class="lkunit ${dead ? 'dead' : ''}" ${dead ? '' : 'open'}>
      <summary>${a?.portrait ? `<img src="${img(a.portrait)}" alt="">` : ''}<b>${esc(a?.zh || d.slug)}</b>
        <span class="dim">生命 ${fmt(now)} / ${fmt(d.hp)}（${Math.round(p * 100)}%）</span>${dead ? '<em class="new">倒下</em>' : ''}</summary>
      <div class="lkstats">
        ${cell('攻击', fmt(d.atk))}${cell('防御', fmt(d.def))}${cell('暴击率', f1(d.critRate) + '%')}${cell('暴击伤害', '+' + f1(d.critDmg) + '%')}
        ${cell('增伤', f1(d.amp) + '%')}${cell('治疗加成', f1(d.healBonus) + '%')}${cell('护盾加成', f1(d.shieldBonus) + '%')}${cell('吸血', f1(d.steal) + '%')}
        ${cell('濒死存活', f1((d.surviveChance || 0) * 100) + '%', '触发一次后概率折半，可连续触发')}${cell('首击增伤', f1(d.firstBoost) + '%')}
        ${cell('共鸣回复', f1(d.aliGain) + '%')}${cell('钥焰回复', f1(d.keyGain) + '%')}${d.shield ? cell('开场护盾', fmt(d.shield)) : ''}
      </div></details>`;
  }).join('');
  return `<details class="lkstatus" open><summary><b>队伍状态</b><span class="dim">（实时；数值含天赋 / 增益 / 造物 / 专属强化，战斗里就用这份）</span></summary>${rows}</details>`;
}

function eventPanel(app, run) {
  const def = (run.ev && EV_BY_ID[run.ev.id]) || eventOf(run);
  if (!run.ev) run.ev = { id: def.id };
  const opts = def.opts.map((o, i) => {
    const cheap = !o.cost || run.glow >= o.cost;
    return `<button class="btn ${i === 0 ? 'gold' : ''}" data-act="luck-ev" data-i="${i}" ${cheap ? '' : 'disabled'}>${esc(o.k)}<br><small>${esc(o.desc)}</small></button>`;
  }).join('');
  return `<div class="lkevent"><h3>${esc(def.zh)}</h3><p>${esc(def.text)}</p><div class="row">${opts}</div></div>`;
}

function shopPanel(app, run) {
  if (!run.shop) run.shop = shopStock(app.state, app.data, run);
  const rows = run.shop.map((it, i) => `<div class="lkrow"><b>${esc(it.zh)}</b><span class="dim">${esc(it.desc)}</span>
    <button class="btn sm ${run.glow >= it.price ? 'gold' : ''}" data-act="luck-buy" data-i="${i}" ${run.glow >= it.price ? '' : 'disabled'}>${fmt(it.price)} 余晖</button></div>`).join('');
  return `<div class="lkshop"><h3>商店 <small>持有 ${fmt(run.glow)} 余晖</small></h3><div class="list">${rows || '<p class="dim">货架空了</p>'}</div>
    <div class="row"><button class="btn" data-act="luck-leave">离开</button></div></div>`;
}

/* ---------------------------------------------------------------- 弹窗 */
/** 战后三选一 */
export function luckOfferModal(app, run) {
  const list = run.offer || (run.offer = offerPool(app.state, app.data, run, 3));
  const cols = list.map((it) => {
    const t = it.type === 'relic' ? '造物' : it.type === 'up' ? '专属强化' : '增益';
    const cls = it.type === 'relic' ? 'relic' : it.type === 'up' ? 'up' : 'buff';
    return `<button class="lkpick ${cls}" data-act="luck-pick" data-id="${it.id}">
      <em>${t}</em><b>${esc(it.zh)}</b><p>${esc(it.desc)}</p></button>`;
  }).join('');
  openModal(`<h3>选一个带走</h3>
    <p class="hint">造物整局生效、不会重复；专属强化只加在对应的那位身上；增益可以叠加。</p>
    <div class="lkpicks">${cols}</div>
    <div class="row"><button class="btn sm" data-act="luck-reroll" ${run.reroll > 0 ? '' : 'disabled'}>重掷（剩 ${run.reroll}）</button></div>`, 'wide');
}

/** 一局结束 */
export function luckEndModal(app, end) {
  const s = luckState(app.state);
  const lv = levelOf(s.pts);
  const got = (end.got || []).map((id) => LUCK_ACH.find((a) => a.id === id)).filter(Boolean);
  openModal(`<h3>${end.win ? '打通三层' : `止步第 ${end.act + 1} 层`}</h3>
    <p>本局得分 <b>${fmt(end.score)}</b>　累计 <b>${fmt(s.pts)}</b> 分（Lv.${lv}）　最高单局 <b>${fmt(s.best)}</b></p>
    ${got.length ? `<p class="hint">达成成就：${got.map((a) => esc(a.zh)).join('、')}（去大运主页领奖）</p>` : ''}
    <p class="hint">分数会累积到大运等级里，等级奖励在主页领取；天赋点随等级到账。</p>
    <div class="row"><button class="btn gold" data-act="go-luck">回大运主页</button></div>`, 'wide');
}
