// 黑流树海：界面。
// 主页（难度 / 券匣 / 成就）→ 募队弹窗（黑露 100 预算选 4 人）→ 局内（三条岔路二选一 + 古树试炼）→ 结算。
import {
  TREE_ACTS, TREE_STEPS, TREE_BUDGET, TREE_DIFFS, TREE_PRICE, treeDiffOf, TREE_EVENTS, TREE_RELICS, TREE_ACH,
  treeState, priceOf, enhOvr, ENH_STEPS, giftOptions, REST_OPTS, treeStage,
  allyDefsOf, offerPool,
} from '../core/treerun.js';
import { LUCK_BUFFS } from '../core/luckrun.js';
import { esc, img, fmt, openModal } from './util.js';

const KIND_ZH = { battle: '战斗', elite: '紧急作战', boss: '首领', event: '奇遇', shop: '黑市', rest: '休整', trial: '古树试炼' };
const KIND_ICON = { battle: '⚔', elite: '✦', boss: '☠', event: '❖', shop: '⌂', rest: '♨', trial: '✧' };
const RAR_ZH = { N: '普通', R: '稀有', SR: '精良', SSR: '史诗', Genesis: '创生' };
const hpPct = (run, slug) => Math.max(0, Math.min(1, run.hp[slug] ?? 1));
const TREE_EVENT_BY_ID = Object.fromEntries(TREE_EVENTS.map((e) => [e.id, e]));
const allyDefs = (app, run) => allyDefsOf(app.state, app.data, run);

export function treePage(app) {
  const s = treeState(app.state);
  const run = s.cur;
  if (run && !run.end) return runPage(app, run);
  return homePage(app, s);
}

/* ---------------------------------------------------------------- 主页 */
function homePage(app, s) {
  const { state: st, data } = app;
  const owned = Object.keys(st.roster || {}).filter((x) => data.bySlug[x]);
  const diffs = TREE_DIFFS.map((d) => {
    const done = !!s.cleared[d.id];
    return `<div class="lkdiff ${done ? 'on' : ''}">
      <div class="hd"><b>${esc(d.zh)}</b>${done ? '<em class="new">已首通</em>' : ''}<span class="dim">开局 50 级 · 无强化</span></div>
      <p class="hint">${esc(d.note)}</p>
      <p class="dim">敌人强度≈主线 ${d.off >= 0 ? `第 ${treeStage(0, 0, d.off)}~${treeStage(2, 9, d.off)} 关` : `第 ${treeStage(0, 0, d.off)}~${treeStage(2, 9, d.off)} 关`} · 敌人 ×${d.scale.toFixed(2)} · 分数 ×${d.mult.toFixed(1)}</p>
      <button class="btn gold" data-act="tree-open-draft" data-k="${d.id}">进入树海（募队）</button>
    </div>`;
  }).join('');
  const v = st.vouchers || {};
  const wallet = `<div class="banner-card lk"><div><h3>券匣 <small>树海产出的账号级道具在这里使用</small></h3>
    <div class="row">
      <button class="btn" data-act="tree-use-direct" ${(v.direct || 0) > 0 && owned.length ? '' : 'disabled'}>直升券 ×${v.direct || 0} <small class="dim">——把一位角色直接练到超限满</small></button>
      <button class="btn" data-act="tree-use-awaken" ${(v.awaken || 0) > 0 ? '' : 'disabled'}>唤醒券 ×${v.awaken || 0} <small class="dim">——唤醒一位未拥有的血肉界域角色</small></button>
    </div>
    <p class="hint">唤醒券在「深根」首通 / 成就 / 黑市上架；直升券只从「黑流之心」首通与成就里出——它们等效几十亿金币的养成，树海不会大方到哪去。</p>
  </div></div>`;
  const achRows = TREE_ACH.map((a) => {
    const done = s.ach[a.id] && s.ach[a.id] !== true, claimed = s.ach[a.id] === true;
    const rw = [a.reward.gold ? `金币 +${fmt(a.reward.gold)}` : '', a.reward.tickets ? `唤醒券 +${a.reward.tickets}` : '', a.reward.cores ? `银芯 +${fmt(a.reward.cores)}` : '',
      a.reward.voucher ? `直升券 ×1` : '', a.reward.voucher2 ? `唤醒券 ×1` : ''].filter(Boolean).join('　');
    return `<div class="ach ${done || claimed ? 'done' : ''}"><div class="ab"><b>${esc(a.zh)}</b><small>${esc(a.desc)}　奖励：${rw}</small></div>
      <button class="btn sm ${done ? 'gold' : ''}" data-act="tree-ach" data-id="${a.id}" ${done ? '' : 'disabled'}>${claimed ? '已领取' : done ? '领取' : '未达成'}</button></div>`;
  }).join('');
  return `<div class="page"><h2>黑流树海 <small>3 层 · 每层 ${TREE_STEPS} 步（每步两条岔路二选一）· 开局募队 · 全员 50 级白板出发</small></h2>
  <div class="banner-card lk"><div><h3>黑流树海 <small>${s.runs} 趟 · 通关 ${s.clears} 次 · 最高单局 ${fmt(s.best)} 分</small></h3>
    <p>启程时花 <b>${TREE_BUDGET} 黑露</b>从自己拥有的角色里募一队（史诗 ${TREE_PRICE.SSR} 一位，四张正好买不起）；全员一律 <b>50 级、无叠位、无超限、无法则</b>出发，命轮密契与钥令照常生效。
    地图每一步给<b>两条岔路</b>——战斗、紧急、奇遇、黑市、休整、古树试炼，走到哪条算哪条；打完首领掉一枚古树之芽，在古树试炼里点亮 <b>高枝（159 级）→ 超限 → 终焉法则</b>。</p>
    <p class="hint">通关与黑市会产出<b>唤醒券</b>；「深根」首通送<b>唤醒券</b>（唤醒血肉界域角色），「黑流之心」首通送<b>直升券</b>（直接练到超限满）。</p>
  </div></div>
  ${wallet}
  <h3>选一个深度</h3><div class="lkdiffs">${diffs}</div>
  <h3>树海成就 <small>奖励直接领取，含唤醒券 / 直升券</small></h3><div class="list">${achRows}</div>
  ${s.lastRun ? `<h3>上一趟</h3><div class="list"><div class="lkrow"><b>${s.lastRun.win ? '走出树海' : `倒在第 ${s.lastRun.act + 1} 层`}</b><span>得分 <b>${fmt(s.lastRun.score)}</b></span><span class="dim">强化档 ${s.lastRun.enh}/3 · ${new Date(s.lastRun.at).toLocaleString()}</span></div></div>` : ''}
  </div>`;
}

/* ---------------------------------------------------------------- 募队弹窗 */
export function treeDraftModal(app, diffId) {
  const { state: st, data } = app;
  app.ui.treeDraft ||= { diff: diffId, team: [] };
  renderDraft(app);
}

function renderDraft(app) {
  const { state: st, data } = app;
  const d = app.ui.treeDraft;
  const diff = treeDiffOf(d.diff);
  const owned = Object.keys(st.roster || {}).filter((x) => data.bySlug[x])
    .sort((a, b) => (data.bySlug[b].rarity || '').localeCompare(data.bySlug[a].rarity || '') || (st.roster[b].lv || 0) - (st.roster[a].lv || 0));
  const spent = d.team.reduce((n, s) => n + priceOf(data, s), 0);
  const cards = owned.map((slug) => {
    const a = data.bySlug[slug], p = priceOf(data, slug);
    const inTeam = d.team.includes(slug);
    const afford = spent + p <= TREE_BUDGET || inTeam;
    const full = d.team.length >= 4 && !inTeam;
    return `<button class="lkpick ${inTeam ? 'relic' : ''}" data-act="tree-draft-toggle" data-s="${slug}" ${afford && !full ? '' : 'disabled style="opacity:.45"'}>
      <em>${RAR_ZH[a.rarity] || a.rarity} · ${p} 黑露</em><b>${esc(a.zh)}</b><p class="hint">${a.type === 'ASSAULT' ? '突击' : a.type === 'WARDEN' ? '守护' : '合唱'} · Lv.${st.roster[slug].lv}</p></button>`;
  }).join('');
  openModal(`<h3>黑露募队 <small>预算 ${TREE_BUDGET} · 已花 ${spent} · ${4 - d.team.length} 个空位</small></h3>
    <p class="hint">黑露不够就带不上——史诗 ${TREE_PRICE.SSR} 一位，四张史诗（${TREE_PRICE.SSR * 4}）买不起，这就是取舍。出发后全员 50 级白板，练度靠古树的馈赠一步一步点回来。</p>
    <div class="lkpicks">${cards}</div>
    <div class="row"><button class="btn sm" data-act="tree-draft-clear">清空</button>
      <button class="btn gold" data-act="tree-depart" ${d.team.length ? '' : 'disabled'}>出发（${esc(diff.zh)}）</button></div>`, 'wide');
}

/* ---------------------------------------------------------------- 局内 */
function runPage(app, run) {
  const { data } = app;
  const diff = treeDiffOf(run.diff);
  const enh = ENH_STEPS.slice(1).map((e, i) => `<span class="lktag ${run.enh > i ? 'up' : ''}" title="${esc(e.desc)}">${run.enh > i ? '✦ ' : ''}${esc(e.zh)}</span>`).join('');
  const path = Array.from({ length: TREE_STEPS }, (_, i) => {
    const st = i < run.node ? 'done' : i === run.node ? 'now' : '';
    const k = i === TREE_STEPS - 1 ? 'boss' : i === run.node ? (run.branch ? 'branch' : (run.kind || 'battle')) : 'battle';
    return `<div class="lknode ${st} k-${k === 'branch' ? 'battle' : k}" title="${k === 'branch' ? '岔路' : KIND_ZH[k]}"><i>${k === 'branch' ? '❓' : KIND_ICON[k]}</i><small>${i + 1}</small></div>`;
  }).join('');
  const team = run.slugs.map((sl) => {
    const p = hpPct(run, sl);
    const face = data.bySlug[sl]?.portrait;
    return `<div class="lkface ${p <= 0 ? 'dead' : p <= 0.4 ? 'hurt' : ''}">${face ? `<img src="${img(face)}" alt="">` : '<i class="noface"></i>'}<b>${esc(data.bySlug[sl]?.zh || sl)}</b>
      <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div><small>${Math.round(p * 100)}%</small></div>`;
  }).join('');
  const relics = run.relics.length
    ? run.relics.map((id) => { const r = TREE_RELICS.find((x) => x.id === id); return `<span class="lktag relic" title="${esc(r?.desc || '')}">${esc(r?.zh || id)}</span>`; }).join('')
    : '<span class="dim">还没有树海造物</span>';
  const buffs = Object.entries(run.buffs || {}).map(([id, n]) => {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    return `<span class="lktag buff" title="${esc(b?.desc || '')}">${esc(b?.zh || id)}${n > 1 ? ` ×${n}` : ''}</span>`;
  }).join('') || '<span class="dim">还没有增益</span>';
  const ups = run.ups.length
    ? run.ups.map((u) => `<span class="lktag up" title="${esc(u.desc)}">${esc(u.zh)}</span>`).join('')
    : '<span class="dim">还没有专属强化</span>';

  const stage = Math.max(1, Math.round(6 + run.act * 24 + run.node * 2.0) + diff.off);
  let body = '';
  if (run.gift) body = giftPanel(app, run);
  else if (run.branch) {
    const [a, b] = run.branch;
    body = `<div class="lkbattle"><p>前面分成了两条路——走哪边？</p>
      <div class="row">
        <button class="btn big gold" data-act="tree-branch" data-i="0">${KIND_ICON[a]} ${KIND_ZH[a]}</button>
        <button class="btn big" data-act="tree-branch" data-i="1">${KIND_ICON[b]} ${KIND_ZH[b]}</button>
      </div>
      <p class="hint">战斗 / 紧急作战需要开打；奇遇是事件，黑市能买东西，休整回血，古树试炼白给一次「古树的馈赠」。第 ${TREE_STEPS} 步固定首领。</p></div>`;
  } else if (run.rest) {
    body = `<div class="lkevent"><h3>休整 <small>余烬里的火堆</small></h3><p>树影围出一小块空地，中间烧着一堆捡来的枝子。睡一觉，还是聊聊天？</p><div class="row">${REST_OPTS.map((o, i) => `<button class="btn ${i === 0 ? 'gold' : ''}" data-act="tree-rest" data-i="${i}">${esc(o.k)}<br><small>${esc(o.desc)}</small></button>`).join('')}</div></div>`;
  } else if (run.ev) {
    const def = TREE_EVENT_BY_ID[run.ev.id];
    const opts = def.opts.map((o, i) => {
      const cheap = !o.cost || run.glow >= o.cost;
      return `<button class="btn ${i === 0 ? 'gold' : ''}" data-act="tree-ev" data-i="${i}" ${cheap ? '' : 'disabled'}>${esc(o.k)}<br><small>${esc(o.desc)}</small></button>`;
    }).join('');
    body = `<div class="lkevent"><h3>${esc(def.zh)}</h3><p>${esc(def.text)}</p><div class="row">${opts}</div></div>`;
  } else if (run.shop) {
    const rows = run.shop.map((it, i) => `<div class="lkrow"><b>${esc(it.zh)}</b><span class="dim">${esc(it.desc)}</span>
      <button class="btn sm ${run.glow >= it.price ? 'gold' : ''}" data-act="tree-buy" data-i="${i}" ${run.glow >= it.price ? '' : 'disabled'}>${fmt(it.price)} 余晖</button></div>`).join('');
    body = `<div class="lkshop"><h3>黑市 <small>持有 ${fmt(run.glow)} 余晖</small></h3><div class="list">${rows || '<p class="dim">货架空了</p>'}</div>
      <div class="row"><button class="btn" data-act="tree-leave">离开</button></div></div>`;
  } else if (run.kind) {
    body = `<div class="lkbattle"><p>下一场：<b>${KIND_ZH[run.kind]}</b>　强度≈主线第 <b>${stage}</b> 关　深度 <b>${esc(diff.zh)}</b></p>
      <button class="btn big gold" data-act="tree-fight">开打</button></div>`;
  }

  return `<div class="page"><h2>黑流树海 · 第 ${run.act + 1} / ${TREE_ACTS} 层 <small>${esc(diff.zh)} · 余晖 ${fmt(run.glow)} · 古树之芽 ${run.buds} · 得分 ${fmt(run.score)}</small></h2>
  <div class="lkpath">${path}</div>
  <div class="lkfaces">${team}</div>
  ${statusPanel(app, run)}
  <div class="lkside"><b>练度（影子）</b><div class="lktags">${enh}${run.buds > 0 ? ` <button class="btn sm gold" data-act="tree-gift-open">古树试炼（芽 ×${run.buds}）</button>` : ''}</div>
    <b>树海造物</b><div class="lktags">${relics}</div>
    <b>增益</b><div class="lktags">${buffs}</div>
    <b>专属强化</b><div class="lktags">${ups}</div>
    ${run.maxhpPct ? `<b>额外</b><div class="lktags"><span class="lktag buff">生命上限 +${run.maxhpPct}%</span></div>` : ''}</div>
  ${body}
  <div class="row"><button class="btn sm" data-act="tree-abandon">放弃这一趟</button></div>
  </div>`;
}

function giftPanel(app, run) {
  const g = giftOptions(app.state, app.data, run);
  const srcZh = run.gift.src === 'boss' ? '首领掉落的古树之芽' : '古树试炼';
  const rows = [];
  if (g.enh) rows.push(`<button class="lkpick up" data-act="tree-gift" data-k="enh"><em>练度</em><b>${esc(g.enh.zh)}</b><p>${esc(g.enh.desc)}</p></button>`);
  for (const r of g.relics) rows.push(`<button class="lkpick relic" data-act="tree-gift" data-k="relic" data-id="${r.id}"><em>树海造物</em><b>${esc(r.zh)}</b><p>${esc(r.desc)}</p></button>`);
  rows.push(`<button class="lkpick buff" data-act="tree-gift" data-k="glow"><em>休整</em><b>${esc(g.glow.zh)}</b><p>${esc(g.glow.desc)}</p></button>`);
  return `<div class="lkevent"><h3>古树的馈赠 <small>${esc(srcZh)}</small></h3><p>古树的根须递过来一样东西——只要一样。</p><div class="lkpicks">${rows.join('')}</div>
    ${run.gift.src === 'node' ? '<p class="hint">选完这格往前走。</p>' : '<p class="hint">这是用古树之芽换的馈赠，不占步数。</p>'}</div>`;
}

function statusPanel(app, run) {
  const { state: s } = app;
  let defs = [];
  try { defs = allyDefs(app, run); } catch { return ''; }
  const f1 = (x) => (Math.round(x * 10) / 10);
  const cell = (k, v, tip = '') => `<span class="lkst" title="${esc(tip)}"><em>${k}</em><b>${v}</b></span>`;
  const ovr = enhOvr(run.enh);
  const rows = defs.map((d) => {
    const p = hpPct(run, d.slug), now = Math.round(d.hp * p);
    const dead = p <= 0.001;
    const a = app.data.bySlug[d.slug];
    return `<details class="lkunit ${dead ? 'dead' : ''}" ${dead ? '' : 'open'}>
      <summary>${a?.portrait ? `<img src="${img(a.portrait)}" alt="">` : ''}<b>${esc(a?.zh || d.slug)}</b>
        <span class="dim">Lv.${ovr.lv}${ovr.star ? ' · 叠99' : ''}${ovr.od ? ' · 超限99' : ''}${ovr.law ? ' · 法则10' : ''}　生命 ${fmt(now)} / ${fmt(d.hp)}（${Math.round(p * 100)}%）</span>${dead ? '<em class="new">倒下</em>' : ''}</summary>
      <div class="lkstats">
        ${cell('攻击', fmt(d.atk))}${cell('防御', fmt(d.def))}${cell('暴击率', f1(d.critRate) + '%')}${cell('暴击伤害', '+' + f1(d.critDmg) + '%')}
        ${cell('增伤', f1(d.amp) + '%')}${cell('治疗加成', f1(d.healBonus) + '%')}${cell('护盾加成', f1(d.shieldBonus) + '%')}${cell('吸血', f1(d.steal) + '%')}
        ${cell('濒死存活', f1((d.surviveChance || 0) * 100) + '%', '触发一次后概率折半，可连续触发')}${cell('首击增伤', f1(d.firstBoost) + '%')}
      </div></details>`;
  }).join('');
  return `<details class="lkstatus" open><summary><b>队伍状态</b><span class="dim">（影子练度 + 局内养成；战斗里就用这份）</span></summary>${rows}</details>`;
}


/* ---------------------------------------------------------------- 弹窗 */
export function treeOfferModal(app, run) {
  const list = run.offer || (run.offer = offerPool(app.state, app.data, run, 3));
  const cols = list.map((it) => {
    const t = it.type === 'relic' ? '树海造物' : it.type === 'up' ? '专属强化' : '增益';
    const cls = it.type === 'relic' ? 'relic' : it.type === 'up' ? 'up' : 'buff';
    return `<button class="lkpick ${cls}" data-act="tree-pick" data-id="${it.id}"><em>${t}</em><b>${esc(it.zh)}</b><p>${esc(it.desc)}</p></button>`;
  }).join('');
  openModal(`<h3>选一个带走</h3><div class="lkpicks">${cols}</div>
    <div class="row"><button class="btn sm" data-act="tree-reroll" ${run.reroll > 0 ? '' : 'disabled'}>重掷（剩 ${run.reroll}）</button></div>`, 'wide');
}

export function treeEndModal(app, end) {
  const s = treeState(app.state);
  const got = (end.got || []).map((id) => TREE_ACH.find((a) => a.id === id)).filter(Boolean);
  const rw = end.rw || {};
  const bits = [rw.gold ? `金币 +${fmt(rw.gold)}` : '', rw.tickets ? `唤醒券 +${rw.tickets}` : '', rw.cores ? `银芯 +${fmt(rw.cores)}` : '',
    (rw.vouchers || []).map((v) => (v === 'direct' ? '直升券 ×1' : '唤醒券 ×1')).join('　')].filter(Boolean).join('　');
  openModal(`<h3>${end.win ? '走出树海' : `倒在第 ${end.act + 1} 层`}</h3>
    <p>本局得分 <b>${fmt(end.score)}</b>　最高单局 <b>${fmt(s.best)}</b>　强化档 <b>${end.enh}/3</b></p>
    ${bits ? `<p class="hint">结算奖励：${bits}${rw.first ? `（「${esc(rw.first)}」首通！）` : ''}</p>` : ''}
    ${got.length ? `<p class="hint">达成成就：${got.map((a) => esc(a.zh)).join('、')}（去树海主页领奖）</p>` : ''}
    <div class="row"><button class="btn gold" data-act="go-tree">回树海主页</button></div>`, 'wide');
}


/* ---------------------------------------------------------------- 券匣弹窗 */
export function treeDirectModal(app) {
  const { state: st, data } = app;
  const owned = Object.keys(st.roster || {}).filter((x) => data.bySlug[x])
    .sort((a, b) => (data.bySlug[a].type || '').localeCompare(data.bySlug[b].type || '') || (st.roster[b].lv || 0) - (st.roster[a].lv || 0));
  const cards = owned.map((slug) => {
    const a = data.bySlug[slug], r = st.roster[slug];
    const full = r.star >= 99 && r.od >= 99;
    return `<button class="lkpick" data-act="tree-direct-pick" data-s="${slug}" ${full ? 'disabled style="opacity:.4"' : ''}>
      <em>Lv.${r.lv} · 叠${r.star}${r.od ? ` · 超限${r.od}` : ''}${r.law ? ` · 法则${r.law}` : ''}</em><b>${esc(a.zh)}</b><p class="hint">${full ? '已经是超限满' : '直升后：叠位99 · 等级159 · 超限99'}</p></button>`;
  }).join('');
  openModal(`<h3>使用直升券 <small>剩 ${st.vouchers?.direct || 0} 张</small></h3>
    <p class="hint">选一位角色：叠位拉到 99、等级拉到 159、超限拉到 99。最终法则不送——那要自己练。已经超限满的人不能再吃券。</p>
    <div class="lkpicks">${cards}</div>`, 'wide');
}

export function treeAwakenModal(app) {
  const { state: st, data } = app;
  const pool = data.awakeners.filter((a) => a.realm === 'CARO' && !st.roster[a.slug]);
  const cards = pool.map((a) => `<button class="lkpick relic" data-act="tree-awaken-pick" data-s="${a.slug}">
    <em>${RAR_ZH[a.rarity] || a.rarity} · 血肉</em><b>${esc(a.zh)}</b><p class="hint">${a.type === 'ASSAULT' ? '突击' : a.type === 'WARDEN' ? '守护' : '合唱'} · 唤醒后 1 级 0 叠</p></button>`).join('');
  openModal(`<h3>使用唤醒券 <small>剩 ${st.vouchers?.awaken || 0} 张</small></h3>
    <p class="hint">选一位<b>未拥有</b>的血肉界域角色直接加入名册。${pool.length ? '' : '血肉界域的角色你已经全收了——券先留着。'}</p>
    <div class="lkpicks">${cards || '<p class="hint">没有可唤醒的血肉界域角色。</p>'}</div>`, 'wide');
}

