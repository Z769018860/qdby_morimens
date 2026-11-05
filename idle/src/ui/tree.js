// 红流树海：界面。
// 主页（等级 / 天赋树 / 券匣 / 难度 / 成就）→ 募队弹窗（黑露买人进仓库）→
// 局内（岔路二选一 + 仓库编队 + 古树试炼）→ 结算。
import {
  TREE_ACTS, TREE_STEPS, TREE_BUDGET, TREE_DIFFS, TREE_PRICE, treeDiffOf, TREE_EVENTS, TREE_RELICS, TREE_ACH,
  treeState, priceOf, enhOvr, ENH_STEPS, giftOptions, REST_OPTS, treeStage,
  allyDefsOf, offerPool, TREE_GEAR, GEAR_KIND_ZH, GEAR_LIMIT, gearRows, POOL_MAX, TEAM_MAX,
  TREE_TALENTS, TREE_BRANCHES, talentLv, talentCost, canTalent, talentMods,
  TREE_LEVELS, treeLevelOf, treeLevelDef, TREE_LEVEL_MAX, TREE_BLESSINGS,
  TREE_SQUADS, squadOf, draftCaps, teamMax, poolCap, gearLimit, shrineCost,
  STASH_MAX, stashTake, stashPut, stashDrop, carryOptions,
} from '../core/treerun.js';
import { LUCK_BUFFS } from '../core/luckrun.js';
import { REALMS } from '../core/constants.js';
import { awakenOf, universalOf } from '../core/game.js';
import { esc, img, fmt, openModal } from './util.js';

const KIND_ZH = { battle: '战斗', elite: '紧急作战', hunt: '猎场', boss: '首领', event: '奇遇', shop: '黑市', rest: '休整', trial: '古树试炼', chest: '宝箱', spring: '回声之泉', shrine: '古树祭坛' };
const KIND_ICON = { battle: '⚔', elite: '✦', hunt: '🐗', boss: '☠', event: '❖', shop: '⌂', rest: '♨', trial: '✧', chest: '🎁', spring: '⛲', shrine: '🕯' };
const RAR_ZH = { N: '普通', R: '稀有', SR: '精良', SSR: '史诗', Genesis: '创生' };
const hpPct = (run, slug) => Math.max(0, Math.min(1, run.hp[slug] ?? 1));
const TREE_EVENT_BY_ID = Object.fromEntries(TREE_EVENTS.map((e) => [e.id, e]));
const allyDefs = (app, run) => allyDefsOf(app.state, app.data, run);
const voucherZh = (tag) => {
  if (tag === 'direct') return '直升券';
  if (tag === 'awaken:ANY') return '通用唤醒券';
  const m = /^awaken:([A-Z]+)$/.exec(String(tag));
  return m ? `${REALMS[m[1]]?.zh || m[1]}唤醒券` : String(tag);
};

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
  const tm = talentMods(s);
  const budget = TREE_BUDGET + tm.budget;
  const diffs = TREE_DIFFS.map((d) => {
    const done = !!s.cleared[d.id];
    return `<div class="lkdiff ${done ? 'on' : ''}">
      <div class="hd"><b>${esc(d.zh)}</b>${done ? '<em class="new">已首通</em>' : ''}<span class="dim">开局 50 级 · 无装备</span></div>
      <p class="hint">${esc(d.note)}</p>
      <p class="dim">敌人强度≈主线第 ${treeStage(0, 0, d.off)}~${treeStage(2, 9, d.off)} 关 · 敌人 ×${d.scale.toFixed(2)} · 分数 ×${d.mult.toFixed(1)}</p>
      <button class="btn gold" data-act="tree-open-draft" data-k="${d.id}">进入树海（募队）</button>
    </div>`;
  }).join('');
  return `<div class="page"><h2>红流树海 <small>3 层 · 每层 ${TREE_STEPS} 步（每步两条岔路）· 先选分队再募队 · 50 级白板 + 局内装备</small></h2>
  ${levelCard(s)}
  <div class="banner-card lk"><div><h3>红流树海 <small>${s.runs} 趟 · 通关 ${s.clears} 次 · 最高单局 ${fmt(s.best)} 分</small></h3>
    <p>启程分两步：先挑一支<b>分队</b>（${TREE_SQUADS.length} 支，每支改一套规矩——多一个人上场、多一条岔路、团灭能站起来一次），再花 <b>${budget} 黑露</b>从自己的角色里募一队（史诗 ${TREE_PRICE.SSR} 一位）。募到的人进<b>仓库</b>（常规 ${POOL_MAX} 人）——<b>每个战斗节点前都能在仓库面板里换人上场、换装备</b>。</p>
    <p>这个模式的练度和装备<b>都跟账号无关</b>：全员 50 级、无叠位、无超限、无法则，命轮 / 密契 / 造物 / 钥令一概不带；装备要在黑市、宝箱、猎场、首领和奇遇里现赚。</p>
    <p class="hint">局外成长分两块：<b>天赋树</b>（四支，前三支加数值，第四支「枝杈」直接改玩法规则）与<b>等级奖励</b>。进度随<b>云端存档</b>同步：换设备登录同一个账号，进行中的这一趟、天赋树、等级经验都会接着走。</p>
  </div></div>
  ${walletCard(st)}
  <h3>选一个深度</h3><div class="lkdiffs">${diffs}</div>
  ${stashCard(s)}
  ${talentCard(s)}
  <h3>树海成就 <small>奖励直接领取，含界域唤醒券 / 直升券 / 天赋点</small></h3><div class="list">${achRows(s)}</div>
  ${s.lastRun ? `<h3>上一趟</h3><div class="list"><div class="lkrow"><b>${s.lastRun.win ? '走出树海' : `倒在第 ${s.lastRun.act + 1} 层`}</b><span>得分 <b>${fmt(s.lastRun.score)}</b></span><span class="dim">强化档 ${s.lastRun.enh}/3 · 仓库 ${s.lastRun.pool || 0} 人 · ${new Date(s.lastRun.at).toLocaleString()}</span></div></div>` : ''}
  </div>`;
}

/** 等级条：pts → 树海等级，每级一份奖励（自领） */
function levelCard(s) {
  const lv = treeLevelOf(s.pts);
  const cur = treeLevelDef(lv);
  const next = lv < TREE_LEVEL_MAX ? treeLevelDef(lv + 1) : null;
  const prevNeed = lv > 1 ? treeLevelDef(lv - 1).need : 0;
  const pct = next ? Math.max(0, Math.min(100, Math.round(((s.pts - prevNeed) / Math.max(1, next.need - prevNeed)) * 100))) : 100;
  const claimable = TREE_LEVELS.filter((L) => L.lv <= lv && !s.lvClaimed[L.lv]);
  const rows = claimable.slice(0, 4).map((L) => `<button class="btn sm gold" data-act="tree-lv-claim" data-lv="${L.lv}">领取 Lv.${L.lv} 奖励</button>`).join(' ');
  return `<div class="banner-card lk"><div><h3>树海等级 <small>Lv.${lv} / ${TREE_LEVEL_MAX} · 经验 ${fmt(s.pts)} · 天赋点 ${s.tp}</small></h3>
    <div class="lkxp"><i style="width:${pct}%"></i><em>${next ? `${fmt(Math.max(0, s.pts - prevNeed))} / ${fmt(next.need - prevNeed)} → Lv.${next.lv}` : '已满级'}</em></div>
    <p class="hint">每局结束按得分给经验（通关另加 30），升级拿金币 / 银芯 / 唤醒券 / 天赋点；每 10 级给一张对应界域的唤醒券，5 / 15 / 25 级各给一张<b>通用唤醒券</b>，25 级给直升券。</p>
    ${rows ? `<div class="row">${rows}</div>` : ''}
    <div class="row"><button class="btn sm" data-act="tree-lv-open">查看全部等级奖励</button></div>
  </div></div>`;
}

/** 券匣：直升券 + 通用唤醒券 + 四种界域唤醒券 */
function walletCard(st) {
  const v = st.vouchers || {};
  const keys = Object.keys(REALMS);
  const rows = keys.map((k) => {
    const n = awakenOf(st, k);
    return `<button class="btn" data-act="tree-use-awaken" data-realm="${k}" ${n > 0 ? '' : 'disabled'}>
      <span class="lkdot" style="background:${REALMS[k].color}"></span>${REALMS[k].zh}唤醒券 ×${n}<small class="dim">——唤醒一位未拥有的${REALMS[k].zh}界域角色</small></button>`;
  }).join('');
  const uni = universalOf(st);
  return `<div class="banner-card lk"><div><h3>券匣 <small>树海限定 · 出发后在一趟里使用</small></h3>
    <div class="row">
      <button class="btn" data-act="tree-use-direct" ${(v.direct || 0) > 0 ? '' : 'disabled'}>直升券 ×${v.direct || 0} <small class="dim">——这一趟里把一位队员练到超限满</small></button>
      <button class="btn ${uni > 0 ? 'gold' : ''}" data-act="tree-use-awaken" data-realm="ANY" ${uni > 0 ? '' : 'disabled'}>
        <span class="lkdot lkany"></span>通用唤醒券 ×${uni}<small class="dim">——任意界域都能换，四个界域通吃</small></button>
    </div>
    <div class="row lkwallet">${rows}</div>
    <p class="hint">券匣是<b>红流树海限定</b>的：出发之后，在一趟里从仓库面板打开券匣使用。<b>唤醒券</b>按界域分（混沌 / 血肉 / 深海 / 超维），把账号还没有的角色唤醒进<b>这一趟的仓库</b>（50 级白板影子，本趟有效，不加入名册）；<b>通用券</b>没有界域限制，先扣对应界域券、界域券空了才动它。<b>直升券</b>在这一趟里把一位队员的个人练度拉到超限满（只在本趟生效）。黑市、首通、成就、等级奖励都会出。</p>
  </div></div>`;
}

/** 行囊：跨局仓库，最多 STASH_MAX 件 */
function stashCard(s) {
  const list = s.stash || [];
  const rows = list.map((it) => `<div class="lkrow">
    <b>${esc(it.zh)}</b><span class="dim">${esc(it.tag || (it.kind === 'gear' ? '装备' : '造物'))} · ${esc(it.desc || '')}</span>
    <button class="btn sm" data-act="tree-stash-drop" data-key="${it.key}">丢掉</button></div>`).join('');
  return `<div class="banner-card lk"><div><h3>行囊 <small>${list.length}/${STASH_MAX} 件 · 跨局保留</small></h3>
    <p class="hint">每趟结算可以<b>带一件局内道具</b>回来（输了也能带），存进行囊；下一趟出发后，在仓库面板里挑一件带上——<b>每趟限一件，取用不消耗</b>。行囊是这个账号自己的收藏，越多，开局可选的起手就越舒服。</p>
    <div class="list">${rows || '<p class="dim">行囊还是空的。打完一趟，结算时挑一件带回来。</p>'}</div>
  </div></div>`;
}

/** 天赋树：四支（生长 / 低语 / 根须 加数值，枝杈改规则），每支线性解锁 */
function talentCard(s) {
  const cols = TREE_BRANCHES.map((br) => {
    const rule = br === '枝杈';
    const items = TREE_TALENTS.filter((t) => t.br === br).map((t) => {
      const lv = talentLv(s, t.id), max = t.max;
      const c = talentCost(s, t.id);
      const ok = canTalent(s, t.id);
      const req = t.req ? TREE_TALENTS.find((x) => x.id === t.req) : null;
      return `<div class="lktal ${lv >= max ? 'done' : ''} ${rule ? 'rule' : ''}">
        <div class="hd"><b>${esc(t.zh)}</b><span class="dim">${lv}/${max}</span></div>
        <p class="hint">${esc(t.desc)}</p>
        ${req ? `<p class="dim">前置：${esc(req.zh)} ≥ 1</p>` : ''}
        <button class="btn sm ${ok.ok ? 'gold' : ''}" data-act="tree-talent" data-id="${t.id}" ${ok.ok ? '' : 'disabled'}>${lv >= max ? '已点满' : `点一级（${c} 点）`}</button>
      </div>`;
    }).join('');
    return `<div class="lkbranch ${rule ? 'rule' : ''}"><h4>${esc(br)}${rule ? '<small class="dim"> · 改玩法</small>' : ''}</h4>${items}</div>`;
  }).join('');
  return `<h3>天赋树 <small>剩 ${s.tp} 点 · 通关与等级奖励给点 · 前 ${TREE_BRANCHES.length - 1} 支加数值，「枝杈」改规则</small></h3><div class="lkbrs">${cols}</div>`;
}

function achRows(s) {
  return TREE_ACH.map((a) => {
    const done = s.ach[a.id] && s.ach[a.id] !== true, claimed = s.ach[a.id] === true;
    const rw = [a.reward.gold ? `金币 +${fmt(a.reward.gold)}` : '', a.reward.tickets ? `唤醒券 +${a.reward.tickets}` : '', a.reward.cores ? `银芯 +${fmt(a.reward.cores)}` : '',
      a.reward.tp ? `天赋点 +${a.reward.tp}` : '', ...(a.reward.vouchers || []).map((v) => `${voucherZh(v)} ×1`)].filter(Boolean).join('　');
    return `<div class="ach ${done || claimed ? 'done' : ''}"><div class="ab"><b>${esc(a.zh)}</b><small>${esc(a.desc)}　奖励：${rw}</small></div>
      <button class="btn sm ${done ? 'gold' : ''}" data-act="tree-ach" data-id="${a.id}" ${done ? '' : 'disabled'}>${claimed ? '已领取' : done ? '领取' : '未达成'}</button></div>`;
  }).join('');
}

/* ---------------------------------------------------------------- 募队弹窗 */
export function treeDraftModal(app, diffId) {
  app.ui.treeDraft ||= { diff: diffId, team: [], squad: TREE_SQUADS[0].id };
  // 只有真给了难度才覆盖：main.js 的几个内部调用（选分队 / 选人 / 清空后重画）不带 diffId，
  // 以前无条件覆盖会把「tree-open-draft 时选好的难度」冲成 undefined，再被 treeDiffOf 回退成默认低语——
  // 五个难度点哪个进来都是低语，出发也按低语算（这就是「切不了难度」）。
  if (diffId) app.ui.treeDraft.diff = diffId;
  if (!app.ui.treeDraft.squad) app.ui.treeDraft.squad = TREE_SQUADS[0].id;
  renderDraft(app);
}

function renderDraft(app) {
  const { state: st, data } = app;
  const d = app.ui.treeDraft;
  const diff = treeDiffOf(d.diff);
  const caps = draftCaps(st, d.squad);
  const { budget, recruit, poolMax, teamMax: teamCap } = caps;
  const squad = squadOf(d.squad);
  const owned = Object.keys(st.roster || {}).filter((x) => data.bySlug[x])
    .sort((a, b) => (data.bySlug[b].rarity || '').localeCompare(data.bySlug[a].rarity || '') || (st.roster[b].lv || 0) - (st.roster[a].lv || 0));
  const spent = d.team.reduce((n, x) => n + priceOf(data, x, recruit), 0);
  const over = spent > budget;
  const squadCards = TREE_SQUADS.map((q) => `<button class="lkpick squad ${d.squad === q.id ? 'relic' : ''}" data-act="tree-squad" data-id="${q.id}">
      <em>${esc(q.tag)}</em><b>${esc(q.zh)}</b><p>${esc(q.desc)}</p></button>`).join('');
  const cards = owned.map((slug) => {
    const a = data.bySlug[slug], p = priceOf(data, slug, recruit);
    const inTeam = d.team.includes(slug);
    const afford = spent + p <= budget || inTeam;
    const full = d.team.length >= poolMax && !inTeam;
    return `<button class="lkpick ${inTeam ? 'relic' : ''}" data-act="tree-draft-toggle" data-s="${slug}" ${afford && !full ? '' : 'disabled style="opacity:.45"'}>
      <em>${RAR_ZH[a.rarity] || a.rarity} · ${p} 黑露</em><b>${esc(a.zh)}</b><p class="hint">${a.type === 'ASSAULT' ? '突击' : a.type === 'WARDEN' ? '守护' : '合唱'} · ${REALMS[a.realm]?.zh || ''}</p></button>`;
  }).join('');
  openModal(`<h3>出发前 <small>${esc(diff.zh)} · 预算 ${budget} · 已花 ${spent} · 仓库 ${d.team.length}/${poolMax}（前 ${teamCap} 人先上场）</small></h3>
    <h4 class="lkh4">第一步 · 挑一支分队 <small class="dim">决定这一趟的规矩</small></h4>
    <div class="lkpicks lksquads">${squadCards}</div>
    <p class="hint">${squad ? `<b>${esc(squad.zh)}</b>：${esc(squad.note)}` : ''} 分队只是这一趟的规矩，下一趟可以换。</p>
    <h4 class="lkh4">第二步 · 花黑露募队</h4>
    <p class="hint">募到的人进<b>仓库</b>，开局先上前 ${teamCap} 个；之后在黑市、奇遇里还能加人，每个战斗节点前都能重新编队。价格${recruit ? `已打 ${recruit}% 折` : `按稀有度算（史诗 ${TREE_PRICE.SSR}）`}——四张史诗（${TREE_PRICE.SSR * 4}）在没点天赋时买不起，这就是取舍。</p>
    <p class="hint">这个模式的练度和装备都跟账号无关：出发后全员 50 级白板、身上一件装备都没有。</p>
    ${over ? `<p class="hint" style="color:#e0736a">已经超预算 ${spent - budget} 黑露，减几个人再出发。</p>` : ''}
    <div class="lkpicks">${cards}</div>
    <div class="row"><button class="btn sm" data-act="tree-draft-clear">清空</button>
      <button class="btn gold" data-act="tree-depart" ${d.team.length && !over ? '' : 'disabled'}>出发（${esc(diff.zh)} · ${esc(squad?.zh || '')}）</button></div>`, 'wide');
}

/* ---------------------------------------------------------------- 局内 */
function runPage(app, run) {
  const { data } = app;
  const diff = treeDiffOf(run.diff);
  const enh = ENH_STEPS.slice(1).map((e, i) => `<span class="lktag ${run.enh > i ? 'up' : ''}" title="${esc(e.desc)}">${run.enh > i ? '✦ ' : ''}${esc(e.zh)}</span>`).join('');
  const path = Array.from({ length: TREE_STEPS }, (_, i) => {
    const st = i < run.node ? 'done' : i === run.node ? 'now' : '';
    const k = i === TREE_STEPS - 1 ? 'boss' : i === run.node ? (run.branch ? 'branch' : (run.kind || 'battle')) : 'battle';
    return `<div class="lknode ${st} k-${k === 'branch' ? 'battle' : k}" title="${k === 'branch' ? '岔路（二选一）' : KIND_ZH[k]}"><i>${k === 'branch' ? '❓' : (KIND_ICON[k] || '·')}</i><small>${i + 1}</small></div>`;
  }).join('');
  const team = (run.slugs || []).map((sl) => {
    const p = hpPct(run, sl);
    const face = data.bySlug[sl]?.portrait;
    return `<div class="lkface ${p <= 0 ? 'dead' : p <= 0.4 ? 'hurt' : ''}">${face ? `<img src="${img(face)}" alt="">` : '<i class="noface"></i>'}<b>${esc(data.bySlug[sl]?.zh || sl)}</b>
      <div class="bar"><i style="width:${Math.round(p * 100)}%"></i></div><small>${Math.round(p * 100)}%</small></div>`;
  }).join('');
  const rows = gearRows(run);
  const equipOn = rows.filter((x) => x.where);
  const relics = (run.relics || []).length
    ? run.relics.map((id) => { const r = TREE_RELICS.find((x) => x.id === id); return `<span class="lktag relic" title="${esc(r?.desc || '')}">${esc(r?.zh || id)}</span>`; }).join('')
    : '<span class="dim">还没有树海造物</span>';
  const gears = equipOn.length
    ? equipOn.map((x) => `<span class="lktag gear" title="${esc(x.def?.desc || '')}">${esc(x.def?.zh || '')}${x.where && x.where !== 'team' ? `·${esc(data.bySlug[x.where]?.zh || x.where)}` : ''}</span>`).join('')
    : '<span class="dim">一件装备都没有（去黑市 / 宝箱 / 猎场赚）</span>';
  const buffs = Object.entries(run.buffs || {}).map(([id, n]) => {
    const b = LUCK_BUFFS.find((x) => x.id === id);
    return `<span class="lktag buff" title="${esc(b?.desc || '')}">${esc(b?.zh || id)}${n > 1 ? ` ×${n}` : ''}</span>`;
  }).join('') || '<span class="dim">还没有增益</span>';
  const bless = (run.bless || []).length
    ? run.bless.map((id) => { const b = TREE_BLESSINGS_BY_ID[id]; return `<span class="lktag bless" title="${esc(b?.desc || '')}">${esc(b?.zh || id)}</span>`; }).join('')
    : '<span class="dim">还没有祭坛祝福</span>';
  const ups = (run.ups || []).length
    ? run.ups.map((u) => `<span class="lktag up" title="${esc(u.desc)}">${esc(u.zh)}</span>`).join('')
    : '<span class="dim">还没有专属强化</span>';

  const stage = treeStage(run.act, run.node, diff.off);
  let body = '';
  if (run.gift) body = giftPanel(app, run);
  else if (run.branch) {
    const picks = run.branch.map((k, i) => `<button class="btn big ${i === 0 ? 'gold' : ''}" data-act="tree-branch" data-i="${i}">${KIND_ICON[k] || '·'} ${KIND_ZH[k] || k}</button>`).join('');
    body = `<div class="lkbattle"><p>前面分成了 ${run.branch.length} 条路——走哪边？</p>
      <div class="row">${picks}</div>
      <p class="hint">战斗 / 紧急作战 / 猎场要开打；奇遇是事件，黑市买东西，休整回血，宝箱白给装备，泉水救人，祭坛换永久祝福，古树试炼白给一次「古树的馈赠」。第 ${TREE_STEPS} 步固定首领。</p>
      ${run.gearDrop ? `<p class="hint">猎场战利品已入库：${esc((run.gearDrop.uids || [run.gearDrop.uid]).map((u) => TREE_GEAR.find((g) => g.id === (run.gear?.pool || []).find((x) => x.uid === u)?.defId)?.zh || '一件装备').join('、'))}（去仓库装上）</p>` : ''}
    </div>`;
  } else if (run.chest) {
    const cols = run.chest.map((g) => `<button class="lkpick relic" data-act="tree-chest" data-id="${g.id}"><em>${GEAR_KIND_ZH[g.kind]} · ${RAR_ZH[g.rar] || g.rar}</em><b>${esc(g.zh)}</b><p>${esc(g.desc)}</p></button>`).join('');
    body = `<div class="lkevent"><h3>树海宝箱 <small>免费挑一件</small></h3><p>箱子上缠着新鲜的藤，像是刚被人放下的。</p><div class="lkpicks">${cols}</div></div>`;
  } else if (run.spring) {
    const dead = (run.pool || []).filter((x) => (run.hp[x] ?? 1) <= 0.001);
    body = `<div class="lkevent"><h3>回声之泉 <small>${dead.length ? `倒下 ${dead.length} 人` : '没有人倒下'}</small></h3>
      <p>水面平得像一块黑玻璃，往里看能看见自己队伍的影子——倒下的那几个也在。</p>
      <div class="row">
        <button class="btn gold" data-act="tree-spring" data-i="0">${dead.length ? '把一个人捞回来<br><small>复活一位倒下者（50% 生命）</small>' : '捧水洗把脸<br><small>全队回复 30% 生命</small>'}</button>
        <button class="btn" data-act="tree-spring" data-i="1">让全队喝饱<br><small>全队回复 40% 生命，得 20 余晖</small></button>
      </div></div>`;
  } else if (run.shrine) {
    const costPct = Math.round(shrineCost(run) * 100);
    const cols = run.shrine.map((b) => `<button class="lkpick buff" data-act="tree-shrine" data-id="${b.id}"><em>祭坛祝福</em><b>${esc(b.zh)}</b><p>${esc(b.desc)}</p></button>`).join('');
    body = `<div class="lkevent"><h3>古树祭坛 <small>代价：全队 ${costPct}% 生命</small></h3><p>石台上压着一层又一层的旧祭品，最上面那层还没干。</p><div class="lkpicks">${cols}</div>
      <div class="row"><button class="btn sm" data-act="tree-leave">不碰它，离开</button></div></div>`;
  } else if (run.rest) {
    body = `<div class="lkevent"><h3>休整 <small>余烬里的火堆</small></h3><p>树影围出一小块空地，中间烧着一堆捡来的枝子。睡一觉，聊聊天，还是先清点行装？</p><div class="row">${REST_OPTS.map((o, i) => `<button class="btn ${i === 0 ? 'gold' : ''}" data-act="tree-rest" data-i="${i}">${esc(o.k)}<br><small>${esc(o.desc)}</small></button>`).join('')}</div></div>`;
  } else if (run.ev) {
    const def = TREE_EVENT_BY_ID[run.ev.id];
    const opts = def.opts.map((o, i) => {
      const cheap = !o.cost || run.glow >= o.cost;
      return `<button class="btn ${i === 0 ? 'gold' : ''}" data-act="tree-ev" data-i="${i}" ${cheap ? '' : 'disabled'}>${esc(o.k)}<br><small>${esc(o.desc)}</small></button>`;
    }).join('');
    body = `<div class="lkevent"><h3>${esc(def.zh)}</h3><p>${esc(def.text)}</p><div class="row">${opts}</div></div>`;
  } else if (run.shop) {
    const rows2 = run.shop.map((it, i) => `<div class="lkrow"><b>${esc(it.zh)}</b><span class="dim">${esc(it.desc)}</span>
      <button class="btn sm ${run.glow >= it.price ? 'gold' : ''}" data-act="tree-buy" data-i="${i}" ${run.glow >= it.price ? '' : 'disabled'}>${fmt(it.price)} 余晖</button></div>`).join('');
    body = `<div class="lkshop"><h3>黑市 <small>持有 ${fmt(run.glow)} 余晖 · 仓库 ${(run.pool || []).length}/${POOL_MAX}</small></h3><div class="list">${rows2 || '<p class="dim">货架空了</p>'}</div>
      <div class="row"><button class="btn sm" data-act="tree-depot">打开仓库</button><button class="btn" data-act="tree-leave">离开</button></div></div>`;
  } else if (run.kind) {
    body = `<div class="lkbattle"><p>下一场：<b>${KIND_ZH[run.kind]}</b>　强度≈主线第 <b>${stage}</b> 关　深度 <b>${esc(diff.zh)}</b></p>
      <div class="row"><button class="btn gold" data-act="tree-depot">仓库 / 编队</button><button class="btn big gold" data-act="tree-fight">开打</button></div>
      <p class="hint">上场 ${(run.slugs || []).length}/${teamMax(run)} 人；倒下的人上不了场。打之前可以先把装备穿上。</p></div>`;
  }

  return `<div class="page"><h2>红流树海 · 第 ${run.act + 1} / ${TREE_ACTS} 层 <small>${esc(diff.zh)} · ${esc(squadOf(run.squad)?.zh || '常规分队')} · 余晖 ${fmt(run.glow)} · 古树之芽 ${run.buds} · 得分 ${fmt(run.score)}</small></h2>
  <div class="lkpath">${path}</div>
  <div class="lkfaces">${team}</div>
  <div class="row"><button class="btn sm" data-act="tree-depot">仓库 / 编队（${(run.pool || []).length}/${poolCap(run)} 人 · ${rows.filter((x) => x.where).length} 件装备）</button>
    ${run.buds > 0 ? `<button class="btn sm gold" data-act="tree-gift-open">古树试炼（芽 ×${run.buds}）</button>` : ''}</div>
  ${statusPanel(app, run)}
  <div class="lkside"><b>这一趟的规矩</b><div class="lktags">${ruleTags(run)}</div>
    <b>练度（影子）</b><div class="lktags">${enh}</div>
    <b>装备</b><div class="lktags">${gears}</div>
    <b>树海造物</b><div class="lktags">${relics}</div>
    <b>祭坛祝福</b><div class="lktags">${bless}</div>
    <b>增益</b><div class="lktags">${buffs}</div>
    <b>专属强化</b><div class="lktags">${ups}</div>
    ${run.maxhpPct ? `<b>额外</b><div class="lktags"><span class="lktag buff">生命上限 +${run.maxhpPct}%</span></div>` : ''}</div>
  ${body}
  <div class="row"><button class="btn sm" data-act="tree-abandon">放弃这一趟</button></div>
  </div>`;
}

const TREE_BLESSINGS_BY_ID = Object.fromEntries(TREE_BLESSINGS.map((b) => [b.id, b]));
const n0 = (x) => Number(x) || 0;

/** 这一趟的「规矩」标签：分队特性 + 天赋「枝杈」改出来的规则，让玩家看得见自己点了什么 */
function ruleTags(run) {
  const q = squadOf(run.squad);
  const out = [];
  if (q) out.push(`<span class="lktag up" title="${esc(q.note)}">${esc(q.zh)}</span>`);
  if (teamMax(run) !== TEAM_MAX) out.push(`<span class="lktag gear">上场 ${teamMax(run)} 人</span>`);
  if (poolCap(run) !== POOL_MAX) out.push(`<span class="lktag gear">仓库 ${poolCap(run)} 人</span>`);
  if (n0(run.paths) > 2) out.push('<span class="lktag up" title="天赋「岔路生枝」">每步三选一</span>');
  if (n0(run.pack) > 0) out.push(`<span class="lktag gear" title="天赋「行囊加层」">契 / 令 +${run.pack} 槽</span>`);
  if (n0(run.mercy) > 0) out.push('<span class="lktag up" title="全队第一次倒下时会以 35% 生命站起">留手 ×1（未用）</span>');
  else if (n0(run.revives) > 0) out.push('<span class="lktag buff">留手已用</span>');
  if (n0(run.reroll) > 1) out.push(`<span class="lktag buff">重掷 ${run.reroll}</span>`);
  if (n0(run.huntDrop) > 0) out.push('<span class="lktag gear">猎场掉 2 件</span>');
  if (n0(run.shrineHalf) > 0) out.push('<span class="lktag buff">祭坛代价减半</span>');
  if (n0(run.glowPerWin) > 0) out.push(`<span class="lktag buff">每胜 +${run.glowPerWin} 余晖</span>`);
  if (n0(run.scoreMod) > 0) out.push(`<span class="lktag buff">结算 +${run.scoreMod}%</span>`);
  return out.length ? out.join('') : '<span class="dim">常规配置</span>';
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
  let defs = [];
  try { defs = allyDefs(app, run); } catch { return ''; }
  const f1 = (x) => (Math.round(x * 10) / 10);
  const cell = (k, v, tip = '') => `<span class="lkst" title="${esc(tip)}"><em>${k}</em><b>${v}</b></span>`;
  const ovr = enhOvr(run.enh);
  const rows = defs.map((d) => {
    const p = hpPct(run, d.slug), now = Math.round(d.hp * p);
    const dead = p <= 0.001;
    const a = app.data.bySlug[d.slug];
    const ring = (run.gear?.ring || {})[d.slug];
    const ringDef = ring && TREE_GEAR.find((g) => g.id === (run.gear.pool || []).find((x) => x.uid === ring)?.defId);
    return `<details class="lkunit ${dead ? 'dead' : ''}" ${dead ? '' : 'open'}>
      <summary>${a?.portrait ? `<img src="${img(a.portrait)}" alt="">` : ''}<b>${esc(a?.zh || d.slug)}</b>
        <span class="dim">Lv.${ovr.lv}${ovr.star ? ' · 叠位 99' : ''}${ovr.od ? ' · 超限 99' : ''}${ovr.law ? ' · 法则 10' : ''}　生命 ${fmt(now)} / ${fmt(d.hp)}（${Math.round(p * 100)}%）${ringDef ? `　环：${esc(ringDef.zh)}` : ''}</span>${dead ? '<em class="new">倒下</em>' : ''}</summary>
      <div class="lkstats">
        ${cell('攻击', fmt(d.atk))}${cell('防御', fmt(d.def))}${cell('暴击率', f1(d.critRate) + '%')}${cell('暴击伤害', '+' + f1(d.critDmg) + '%')}
        ${cell('增伤', f1(d.amp) + '%')}${cell('治疗加成', f1(d.healBonus) + '%')}${cell('护盾加成', f1(d.shieldBonus) + '%')}${cell('吸血', f1(d.steal) + '%')}
        ${cell('濒死存活', f1((d.surviveChance || 0) * 100) + '%', '触发一次后概率折半，可连续触发')}${cell('首击增伤', f1(d.firstBoost) + '%')}
      </div></details>`;
  }).join('');
  return `<details class="lkstatus" open><summary><b>上场队伍状态</b><span class="dim">（影子练度 + 局内装备与养成；战斗里就用这份）</span></summary>${rows}</details>`;
}

/* ---------------------------------------------------------------- 仓库弹窗 */
export function treeDepotModal(app) {
  const run = treeState(app.state).cur;
  if (!run) { openModal('<h3>仓库</h3><p>当前没有进行中的一趟。</p>'); return; }
  const { data } = app;
  const pick = app.ui.treeGearPick || null;
  const rows = gearRows(run);
  const eq = new Set(rows.filter((x) => x.where).map((x) => x.uid));
  const lineup = new Set(run.slugs || []);

  // 手里拿着环的时候，点队员 = 装给他；平时点队员 = 上 / 下场
  const members = (run.pool || []).map((sl) => {
    const a = data.bySlug[sl] || { zh: sl };
    const p = hpPct(run, sl);
    const on = lineup.has(sl);
    const dead = p <= 0.001;
    const act = pick ? 'tree-equip' : 'tree-lineup';
    return `<button class="lkpick ${on ? 'relic' : ''}" data-act="${act}" data-s="${sl}" ${pick ? `data-uid="${pick}"` : ''} ${dead && !pick ? 'disabled style="opacity:.45"' : ''}>
      <em>${pick ? '装给他' : on ? '上场' : dead ? '倒下' : '替补'} · ${Math.round(p * 100)}%${(run.direct || {})[sl] ? ' · 🏅超限满' : ''}</em><b>${esc(a.zh)}</b>
      <p class="hint">${pick ? '点一下把这件环装给他' : p <= 0.001 ? '要去泉水 / 事件里救回来' : on ? '点一下换下' : '点一下上场（最多 4 人）'}</p></button>`;
  }).join('');

  const gearList = rows.map((x) => {
    const on = x.where;
    const onWho = on && on !== 'team' ? data.bySlug[on]?.zh || on : on === 'team' ? '全队' : '';
    const kind = x.def?.kind || 'ring';
    return `<div class="lkrow ${on ? 'on' : ''}"><b>${esc(x.def?.zh || '')}</b>
      <span class="dim">${GEAR_KIND_ZH[kind]} · ${esc(x.def?.desc || '')}${on ? `　→ ${esc(onWho)}` : ''}</span>
      ${on ? `<button class="btn sm" data-act="tree-unequip" data-uid="${x.uid}">卸下</button>`
        : kind === 'ring' ? `<button class="btn sm ${pick === x.uid ? 'gold' : ''}" data-act="tree-gear-pick" data-uid="${x.uid}">${pick === x.uid ? '选个人…' : '装备'}</button>`
          : `<button class="btn sm" data-act="tree-equip" data-uid="${x.uid}">装备</button>`}</div>`;
  }).join('') || '<p class="dim">仓库里还没有装备。去黑市、宝箱、猎场、首领那里赚。</p>';

  const total = gearRows(run).filter((x) => x.where).length;
  const bag = treeState(app.state).stash || [];
  const v = app.state.vouchers || {};
  const wallet = `<h4 class="lkh4">券匣 <small>树海限定 · 只在本趟生效</small></h4>
    <div class="row">
      <button class="btn sm" data-act="tree-use-direct" ${(v.direct || 0) > 0 ? '' : 'disabled'}>直升券 ×${v.direct || 0}</button>
      <button class="btn sm" data-act="tree-use-awaken">唤醒券…</button>
    </div>
    <p class="hint">直升券：这一趟里把一位队员的个人练度拉到超限满；唤醒券：把账号还没有的角色唤醒进这趟的仓库。都只在本趟生效，不碰账号。</p>`;
  const bagHtml = `<h4 class="lkh4">行囊 <small>${run.bagUsed ? '这一趟已经带过一件' : `这一趟可带一件 · ${bag.length}/${STASH_MAX}`}</small></h4>
    <div class="list">${bag.length ? bag.map((it) => `<div class="lkrow ${run.bagUsed ? '' : 'on'}">
      <b>${esc(it.zh)}</b><span class="dim">${esc(it.tag || '')} · ${esc(it.desc || '')}</span>
      <button class="btn sm ${run.bagUsed ? '' : 'gold'}" data-act="tree-bag-take" data-key="${it.key}" ${run.bagUsed ? 'disabled' : ''}>${run.bagUsed ? '已带' : '带上'}</button></div>`).join('')
      : '<p class="dim">行囊是空的。每趟结算可以带一件局内道具回去。</p>'}</div>`;
  openModal(`<h3>仓库 <small>${(run.pool || []).length}/${poolCap(run)} 人 · 上场 ${(run.slugs || []).length}/${teamMax(run)} · 已装 ${total} 件</small></h3>
    <p class="hint">${pick ? '点一下队员，把「' + esc(TREE_GEAR.find((g) => g.id === (run.gear.pool || []).find((x) => x.uid === pick)?.defId)?.zh || '') + '」装给他。' : `战斗前在这里换人、换装备。环是个人装备（每人 1 个），契 / 令是全队生效（各限 ${gearLimit(run, 'pact')} 件${n0(run.pack) ? `，含天赋加的 ${run.pack} 个槽` : ''}）。`}</p>
    <h4 class="lkh4">上场编队</h4><div class="lkpicks">${members}</div>
    ${bagHtml}
    ${wallet}
    <h4 class="lkh4">装备库</h4><div class="list">${gearList}</div>
    <div class="row"><button class="btn gold" data-act="tree-depot-close">收好（返回）</button></div>`, 'wide', 'tree-depot');
}

/* ---------------------------------------------------------------- 弹窗 */
export function treeOfferModal(app, run) {
  const list = run.offer || (run.offer = offerPool(app.state, app.data, run, 3));
  const cols = list.map((it) => {
    const t = it.type === 'relic' ? '树海造物' : it.type === 'gear' ? `局内装备 · ${GEAR_KIND_ZH[it.kind] || ''}` : it.type === 'up' ? '专属强化' : '增益';
    const cls = it.type === 'relic' ? 'relic' : it.type === 'gear' ? 'gear' : it.type === 'up' ? 'up' : 'buff';
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
    rw.tp ? `天赋点 +${rw.tp}` : '', ...(rw.vouchers || []).map((v) => `${voucherZh(v)} ×1`)].filter(Boolean).join('　');
  const carry = end.carry || [];
  const stash = s.stash || [];
  const carryHtml = carry.length ? `
    <h4 class="lkh4">行囊 · 带一件回去 <small>${stash.length}/${STASH_MAX}</small></h4>
    <div class="lkpicks">${carry.map((it) => `<button class="lkpick ${it.kind === 'relic' ? 'relic' : 'gear'}" data-act="tree-stash-put" data-key="${it.key}" ${end.stashed ? 'disabled style="opacity:.45"' : ''}>
      <em>${esc(it.tag || (it.kind === 'gear' ? '装备' : '造物'))}${it.rar ? ` · ${it.rar}` : ''}</em><b>${esc(it.zh)}</b><p>${esc(it.desc || '')}</p></button>`).join('')}</div>
    <p class="hint">${end.stashed ? `已带走「${esc((carry.find((x) => x.key === end.stashed) || {}).zh || '')}」。` : '这一趟只能带一件。带回去的东西进<b>行囊</b>，下一趟出发后可以从仓库面板挑一件带上（取用不消耗）。'}</p>`
    : '<p class="hint">这一趟没捡到什么能带走的东西。</p>';
  openModal(`<h3>${end.win ? '走出树海' : `倒在第 ${end.act + 1} 层`}</h3>
    <p>本局得分 <b>${fmt(end.score)}</b>　最高单局 <b>${fmt(s.best)}</b>　强化档 <b>${end.enh}/3</b></p>
    <p class="hint">仓库 ${end.pool || 0} 人 · 装备 ${end.gear || 0} 件 · 祝福 ${end.bless || 0} 条</p>
    ${bits ? `<p class="hint">结算奖励：${bits}</p>` : ''}
    ${rw.first ? `<p>🏅 <b>「${esc((TREE_DIFFS.find((d) => d.id === rw.first) || {}).zh || rw.first)}」难度首通！</b><span class="hint">额外的唤醒券 / 界域券已在上面发到账，树海主页的难度卡也会亮「已首通」。</span></p>` : ''}
    <p class="hint">树海经验 +${fmt(rw.pts || 0)}　现在 Lv.${end.lv || treeLevelOf(s.pts)}（升级奖励去主页领）</p>
    ${got.length ? `<p class="hint">达成成就：${got.map((a) => esc(a.zh)).join('、')}（去树海主页领奖）</p>` : ''}
    ${carryHtml}
    <div class="row"><button class="btn gold" data-act="go-tree">回树海主页</button></div>`, 'wide');
}

/* ---------------------------------------------------------------- 券匣弹窗 */
export function treeDirectModal(app) {
  const { state: st, data } = app;
  const run = treeState(st).cur;
  if (!run) {
    openModal(`<h3>直升券 <small>树海限定</small></h3>
      <p class="hint">直升券是<b>红流树海限定</b>的：先出发，在一趟里使用——把这一趟里的一位队员的个人练度拉到超限满，<b>只在本趟生效，不碰账号</b>。现在没有进行中的趟，先去树海出发。</p>`);
    return;
  }
  const v = st.vouchers || {};
  const members = [...(run.pool || [])].map((slug) => {
    const a = data.bySlug[slug] || { zh: slug };
    const done = (run.direct || {})[slug];
    const on = (run.slugs || []).includes(slug);
    return `<button class="lkpick" data-act="tree-direct-pick" data-s="${slug}" ${done || !(v.direct > 0) ? 'disabled style="opacity:.4"' : ''}>
      <em>${on ? '上场' : '替补'}${done ? ' · 已直升' : ''}</em><b>${esc(a.zh)}</b>
      <p class="hint">${done ? '这一趟里已经是超限满' : '点一下：这一趟里练度拉到超限满（叠位 99 · 等级 159 · 超限 99）'}</p></button>`;
  }).join('');
  openModal(`<h3>使用直升券 <small>剩 ${v.direct || 0} 张 · 只在本趟生效</small></h3>
    <p class="hint">选这一趟里的一位队员：他的个人练度立刻拉到超限满（叠位 99 · 等级 159 · 超限 99），<b>只在本趟生效，不碰账号</b>。</p>
    <div class="lkpicks">${members}</div>`, 'wide');
}

export function treeAwakenModal(app, realm = null) {
  const { state: st, data } = app;
  const run = treeState(st).cur;
  if (!run) {
    openModal(`<h3>唤醒券 <small>树海限定</small></h3>
      <p class="hint">唤醒券是<b>红流树海限定</b>的：先出发，在一趟里使用——把账号还没有的角色唤醒进<b>这一趟的仓库</b>（50 级白板影子，本趟有效，不加入账号名册）。现在没有进行中的趟，先去树海出发。</p>`);
    return;
  }
  const uni = universalOf(st);
  const keys = Object.keys(REALMS).filter((k) => awakenOf(st, k) > 0);
  const tabsAll = [...keys, ...(uni > 0 ? ['ANY'] : [])];
  const cur = realm && tabsAll.includes(realm) ? realm : tabsAll[0];
  if (!cur) { openModal('<h3>唤醒券</h3><p class="hint">一张都没有。树海的深根 / 红流之心首通、成就与等级奖励会给界域券，5 / 15 / 25 级给通用券。</p>'); return; }
  const any = cur === 'ANY';
  const pool = data.awakeners
    .filter((a) => (any || a.realm === cur) && !st.roster[a.slug] && !(run.pool || []).includes(a.slug))
    .sort((a, b) => (any ? String(a.realm).localeCompare(String(b.realm)) : 0) || String(b.rarity).localeCompare(String(a.rarity)));
  const tabs = tabsAll.map((k) => `<button class="btn sm ${k === cur ? 'gold' : ''}" data-act="tree-use-awaken" data-realm="${k}">${
    k === 'ANY' ? '<span class="lkdot lkany"></span>通用' : `<span class="lkdot" style="background:${REALMS[k].color}"></span>${REALMS[k].zh}`
  } ×${k === 'ANY' ? uni : awakenOf(st, k)}</button>`).join(' ');
  const cards = pool.map((a) => `<button class="lkpick relic" data-act="tree-awaken-pick" data-s="${a.slug}" data-realm="${cur}">
    <em>${RAR_ZH[a.rarity] || a.rarity} · ${REALMS[a.realm]?.zh || a.realm}</em><b>${esc(a.zh)}</b><p class="hint">${a.type === 'ASSAULT' ? '突击' : a.type === 'WARDEN' ? '守护' : '合唱'} · 唤醒进这一趟的仓库（50 级白板影子）</p></button>`).join('');
  const head = any ? '通用唤醒券' : `${REALMS[cur].zh}界域`;
  openModal(`<h3>使用唤醒券 <small>${head} · 剩 ${any ? uni : awakenOf(st, cur)} 张</small></h3>
    <div class="row">${tabs}</div>
    <p class="hint">选一位<b>账号未拥有</b>的角色，唤醒进<b>这一趟的仓库</b>（50 级白板影子，本趟有效，不加入名册）。${any ? '通用券四个界域通吃——但会<b>先扣对应界域的专用券</b>，专用券空了才动通用券。' : `只有${REALMS[cur].zh}界域的角色能换。`}${pool.length ? '' : '这一档没有可唤醒的角色了——换一种券，或者先留着。'}</p>
    <div class="lkpicks">${cards || '<p class="hint">没有可唤醒的角色。</p>'}</div>`, 'wide');
}

export function treeLevelModal(app) {
  const s = treeState(app.state);
  const lv = treeLevelOf(s.pts);
  const rows = TREE_LEVELS.map((L) => {
    const reached = lv >= L.lv, claimed = !!s.lvClaimed[L.lv];
    const rw = [L.gold ? `金币 ${fmt(L.gold)}` : '', L.cores ? `银芯 ${fmt(L.cores)}` : '', L.tickets ? `唤醒券 ${L.tickets}` : '',
      L.tp ? `天赋点 ${L.tp}` : '', L.awaken ? `${REALMS[L.awaken].zh}唤醒券 1` : '', L.univ ? '通用唤醒券 1' : '', L.direct ? '直升券 1' : ''].filter(Boolean).join('　');
    return `<div class="lkrow"><b>Lv.${L.lv}</b><span class="dim">经验 ${fmt(L.need)}　${rw}</span>
      <button class="btn sm ${reached && !claimed ? 'gold' : ''}" data-act="tree-lv-claim" data-lv="${L.lv}" ${reached && !claimed ? '' : 'disabled'}>${claimed ? '已领' : reached ? '领取' : '未到级'}</button></div>`;
  }).join('');
  openModal(`<h3>树海等级奖励 <small>Lv.${lv} · 经验 ${fmt(s.pts)}</small></h3><div class="list">${rows}</div>`, 'wide', 'tree-lv');
}
