import {
  allyDef, teamDefs, levelUp, levelUpMax, setTeam, autoTeam, setPreset, PRESETS, ULT_MODES, normalizeUltOrder, normalizeOrder, orderIsCustom, equipItem, unequipItem, isEquipped,
  enhanceItem, enhanceAllEquipped, enhanceScopes, dismantle, dismantlePreview, autoDmOf, dismantleCores, summon, equipPull, gearDexKey, EQUIP_PULL_COST, CORE_PULL_COST, CORE_PULL10_COST, EQUIP_CORE_COST,
  PULL_PITY_GENESIS, newState, migrate, relicItemsOf, stageGold, runeCost, BATTLES_PER_HOUR, fillLoadout, MIXED_SYNERGY, teamView,
} from '../core/game.js';
import {
  REALMS, TYPES, SLOTS, SLOT_ZH, MAX_LV, MAX_AWAKEN, MAX_LV_HARD, TEAM_SIZE, RARITY_ORDER, GEAR_MAX_LV,
  RELIC_SLOTS, RELIC_BASE_SLOTS, RELIC_UNLOCK, ORDER_SLOTS, ORDER_UNLOCK, ORDER_MAX_LV, LEVEL_GATE,
  AWAKEN_STAT_PER, AWAKEN_AMP_EVERY, AWAKEN_AMP_PER, AWAKEN_SKILL_EVERY,
} from '../core/constants.js';
import { sound, TRACK_LIST } from './audio.js';
import { affinityCard } from './affinity.js';
import {
  SQUAD_KEYS, RIFT_SQUAD_KEYS, TOWER_SQUAD_KEYS, LUCK_SQUAD_KEYS, ALL_SQUAD_KEYS, SQUAD_ZH, SQUAD_MODES, MODE_ZH, RIFT_MODE,
  isRiftSquad, isTowerSquad, isLuckSquad, towerSquadKey, squadMembers, squadUsage, pickedSquad, loadoutOf, riftTaken, normalizeLoadout, withLoadout, squadKeyFor, squadsOf,
  squadLabel, teamSlugsFor, setSquadTeam, setSquadPick, autoSquadSlugs, squadsOfSlug, squadKeyZh, squadIsOnMain,
  squadsUsingItem, squadsEffectivelyUsing, sharedItemsOf,
  RT_MODES, rtModeOf, realmOfMode,
} from '../core/squad.js';
import { riftParty } from '../core/rift.js';
import * as Cloud from '../core/cloud.js';
import { ROSTER_SORTS, SORT_ZH, sortRoster } from '../core/roster.js';
import { luckOf, luckBarPct, GACHA_LOG_MAX, RARITY_WORTH, RARITY_RATE } from '../core/gacha.js';
import { roundLimitFor, ROUND_LIMIT, FRONT_SLOTS } from '../core/battle.js';
import { fxMode } from './fx.js';
import { settleMode } from './report.js';
import { watchMode } from './replay.js';
import { SHOP, boughtToday, goldTicketPrice, GOLD_TICKET_ID, GOLD_TICKET_LIMIT } from '../core/shop.js';
import { refineCost, refineMult, relicRefineGain, relicRefineView, relicTheme, REFINE_MAX, gearRewindPlan, GEAR_REWIND_COST } from '../core/gear.js';
import {
  lvUpCost, power, skillLevel, levelCap, breakNeeded, breakCost, awakenCost, growthPerLevel,
  awakenAmp, awakenSkill, nextAwakenMilestone, rewindPlan, REWIND_COST,
  overdrive, overdriveCost, overdriveStatPct, overdriveAmp, law, lawCost, lawStatPct, lawAmp, lawCrit,
} from '../core/stats.js';
import { extraSkills, EXTRA_OD_AT, EXTRA_LAW_AT } from '../core/extra.js';
import {
  OVERDRIVE_STAT_PER, OVERDRIVE_AMP_EVERY, OVERDRIVE_AMP_PER, OVERDRIVE_MAX, LAW_STAT_PER, LAW_AMP_EVERY, LAW_AMP_PER, LAW_CRIT_EVERY, LAW_CRIT_PER,
} from '../core/constants.js';
import { describeSkill } from '../core/skills.js';
import {
  wheelText, runeOf, runeLabel, runeValue, RUNE_TIERS, RUNE_KEYS, STAT_ZH, relicText, covTheme, covenantTiers, gearCost, dismantleValue, relicBond, relicSlotCount, RELIC_BONDS, BOND_TIERS, bonusText, MAINSTAT, RELIC_THEMES,
} from '../core/gear.js';
import { orderSlotCount, orderLockedHint, orderText, orderUpCost, orderLvMult } from '../core/orders.js';
import { teamBonds, bondHint, bondsOf, BONDS, BOND_CATS, scaleTier } from '../core/bonds.js';
import { roleChipOf, chorusRoleOf } from '../core/roles.js';
import { esc, img, fmt, openModal, closeModal, toast, markup, dropModalScroll, modalEl } from './util.js';

const R = (a) => REALMS[a.realm];
// 叠位到 99 之后不能再画星星，改成数字 + 一档小标
const awk = (n) => `叠位 ${n || 0}`;

export function itemDef(app, it) {
  const d = app.data;
  return (it.kind === 'wheel' ? d.wheelById : it.kind === 'relic' ? d.relicById : d.covById)[it.defId];
}
export function itemText(app, it) {
  const def = itemDef(app, it);
  if (it.kind === 'wheel') return wheelText(def, it.lv, it.rf, it.rune);
  if (it.kind === 'relic') return relicText(def, it.lv, it.rf, it.rune);
  // 密契：判定是「全队同款」，不是同主题；4 件那档印的是累计值（2 件 + 4 件），别让人以为只有 15%
  const { th, two, four } = covenantTiers(def.id, it.lv, it.rf);
  const f = (o) => Object.entries(o).map(([k, v]) => `${k}+${Math.round(v * 10) / 10}`).join(' ');
  return `${th.zh}系（同款）：2 件 ${f(two)}；4 件 ${f(four)}`.replace(/atkPct/g, '攻击%').replace(/hpPct/g, '生命%').replace(/defPct/g, '防御%').replace(/critRate/g, '暴击').replace(/critDmg/g, '爆伤').replace(/amp/g, '增伤').replace(/aliGain/g, '共鸣回复').replace(/keyGain/g, '钥焰回复').replace(/healBonus/g, '治疗').replace(/shieldBonus/g, '护盾').replace(/steal/g, '吸血').replace(/openAli/g, '起始共鸣').replace(/openKey/g, '起始钥焰').replace(/firstBoost/g, '首击增伤');
}
const rarCls = (r) => `r-${r}`;

/* 「词条」= 这件装备到底加什么：
   命轮看主词条（暴击率 / 暴击伤害 / 伤害提升……），密契与造物看同主题套装（攻伐 / 生机 / 锋锐……）。
   装备多了以后在长列表里找「加增伤的造物」很费劲，所以列表和换装弹窗都按词条筛。 */
export function itemAffix(app, it) {
  const def = itemDef(app, it);
  if (!def) return { key: '', zh: '' };
  if (it.kind === 'wheel') return { key: `w:${def.main}`, zh: MAINSTAT[def.main]?.zh || '其它' };
  if (it.kind === 'covenant') return { key: `c:${covTheme(def.id).zh}`, zh: covTheme(def.id).zh };
  return { key: `r:${relicTheme(def.id).zh}`, zh: relicTheme(def.id).zh };
}

/** 某一类装备的全部词条（按数据里的固定顺序，不按获得顺序抖） */
function affixList(app, kind) {
  if (kind === 'wheel') return Object.entries(MAINSTAT).map(([k, v]) => [`w:${k}`, v.zh]);
  if (kind === 'covenant') return [...new Set(Object.values(app.data.covById).map((d) => covTheme(d.id).zh))].map((zh) => [`c:${zh}`, zh]);
  // 造物主题是按 id 哈希出来的，直接枚举主题表，顺序稳定
  return RELIC_THEMES.map((t) => [`r:${t.zh}`, t.zh]);
}

/** 词条筛选条：只列库存里真有的词条（后面跟件数）。
 *  act 非空时胶囊带 data-act（走 main.js 的全局分发），否则只带 data-affix（由弹窗自己接管）。 */
export function affixBar(app, kind, cur, act = '') {
  const items = Object.values(app.state.gear.items).filter((i) => i.kind === kind);
  if (!items.length) return '';
  const n = {};
  for (const it of items) { const k = itemAffix(app, it).key; n[k] = (n[k] || 0) + 1; }
  const chip = (k, zh, c, on) => `<button class="sqchip ${on ? 'on' : ''}" ${act ? `data-act="${act}"` : ''} data-affix="${k}">${esc(zh)}<em>${c}</em></button>`;
  const chips = affixList(app, kind).filter(([k]) => n[k]).map(([k, zh]) => chip(k, zh, n[k], cur === k)).join('');
  return `<div class="row affixbar"><span class="dim">词条</span>${chip('', '全部', items.length, !cur)}${chips}</div>`;
}

/* 编队编辑器开着的时候，装备列表里的「已编入 …」要按**草稿**算：
   刚把某件造物配进「三队」、还没点保存，列表里就该显示「三队」，而不是只显示存着的旧归属。
   以前这里只读存档里的 squads，所以玩家在编辑器里换完装备，卡片上的队伍标签一动不动，
   看着像「没生效」（实际改的是草稿，存下来才算）。 */
let sqDraftCtx = null;   // 编队编辑器的草稿（app.ui.sqDraft 本身，属性随时在变，不能快照）
export function setSquadDraftCtx(ctx) { sqDraftCtx = ctx; }

/** 这件装备会在哪些编队里出战（含正在编辑的草稿）。 */
function squadsForItem(state, uid) {
  const st = sqDraftCtx;
  if (!st || !st.key) return squadsEffectivelyUsing(state, uid);
  const sq = { ...(squadsOf(state)[st.key] || { team: [] }), team: st.team || [] };
  if (st.lo) sq.lo = st.lo; else delete sq.lo;
  const tmp = { ...state, squads: { ...squadsOf(state), [st.key]: sq } };
  return squadsEffectivelyUsing(tmp, uid);
}

function itemCard(app, it, extra = '') {
  const def = itemDef(app, it);
  const who = holder(app, it.uid);
  // 「已编入」提示：这件装备被哪些编队的独立配装占着。
  // 拿它配装时最怕以为它是没人用的散件，结果别的编队战力被抽空——所以列表里就写清楚。
  const inSquads = squadsForItem(app.state, it.uid);
  const editing = sqDraftCtx?.key;
  return `<div class="item ${rarCls(def.rarity || 'SR')} ${isEquipped(app.state, it.uid) ? 'eq' : ''}" data-uid="${it.uid}">
    <img src="${img(def.img)}" alt="" loading="lazy"><div class="i-body"><b>${esc(def.zh)}</b> <em>${def.rarity || ''} Lv${it.lv}${it.rf ? ` · 精炼+${it.rf}` : ''}</em><small>${esc(itemText(app, it))}</small>${who ? `<small class="who">装备于 ${esc(who)}</small>` : ''}${inSquads.length ? `<small class="who sqin" title="这件装备会在这些编队里出战；正在编辑的那套按草稿算，保存后才算数">${inSquads.map((k) => `<span class="sqchip${k === 'cur' ? ' on' : ''}${k === editing ? ' ed' : ''}">${esc(squadKeyZh(k))}${k === editing ? '·草稿' : ''}</span>`).join('')}</small>` : `<small class="who sqnone">${editing ? '还没编入任何编队（包括正在编的这套）' : '未编入任何编队'}</small>`}</div>${extra}</div>`;
}
function holder(app, uid) {
  const s = app.state;
  if (s.gear.relics.includes(uid)) {
    const i = s.gear.relics.indexOf(uid);
    return i < relicSlotCount(s.maxStage) ? `造物栏 ${i + 1}` : '造物栏（未解锁格）';
  }
  for (const [slug, e] of Object.entries(s.gear.equip)) if (e.wheel === uid || e.cov === uid) return app.data.bySlug[slug]?.zh;
  return '';
}

/* ----------------------------- TEAM ----------------------------- */
function bondPanel(app) {
  const { state: s, data } = app;
  const defs = relicItemsOf(s).map((it) => (it && data.relicById[it.defId]) || null);
  const { count, active, bonus } = relicBond(defs);
  const themes = Object.entries(count).filter(([, n]) => n > 0);
  if (!themes.length) return `<p class="hint">造物栏还空着。同主题造物凑 2 / 4 / 6 件会激活<b>造物羁绊</b>（全队被动）。</p>`;
  const chips = themes.map(([zh, n]) => {
    const t = RELIC_BONDS[zh];
    const tiers = BOND_TIERS.map((k) => {
      const on = n >= k;
      return `<span class="${on ? 'on' : ''}" title="${k}件：${bonusText(t[k])}">${k}件${on ? '✓' : `（差 ${k - n}）`}</span>`;
    }).join('');
    const nextTier = BOND_TIERS.find((k) => n < k);
    return `<div class="bond ${active.some((x) => x.zh === zh) ? 'on' : ''}">
      <b>${zh} ×${n}</b><div class="btiers">${tiers}</div>
      <small>${nextTier ? `再凑 ${nextTier - n} 件：${bonusText(t[nextTier])}` : '已满羁绊'}</small></div>`;
  }).join('');
  const on = active.length ? `已激活：${Object.entries(active.reduce((a, x) => ({ ...a, [x.zh]: (a[x.zh] || []).concat(x.tier) }), {})).map(([zh, ts]) => `${zh} ${ts.sort((a, b) => a - b).join('+')}件`).join('、')} → ${bonusText(bonus)}` : '还没凑够 2 件同主题造物';
  return `<div class="bonds">${chips}</div><p class="hint">${on}。羁绊是全队被动，与单件造物加成叠加。</p>`;
}

/* -------- 唤醒体羁绊（core/bonds.js）：队伍页与编队编辑器共用 -------- */
export function bondStrip(app, slugs, { compact = false } = {}) {
  const { data } = app;
  const b = teamBonds(slugs, data);
  const on = b.active.map((x) => `<span class="bd on" title="${esc(x.desc)}"><b>${esc(x.zh)}</b><em>${esc(bonusText(x.bonus))}</em></span>`).join('');
  // 差一步就能凑出来的：只列最近的 4 条，避免挤满屏
  const near = b.near.slice(0, compact ? 2 : 4).map((x) => `<span class="bd near" title="${esc(x.desc)}">${esc(x.zh)} <em>${esc(bondHint(x, data.bySlug))}${x.gap ? ` · 差 ${x.gap}` : ''}</em></span>`).join('');
  const mix = b.realms.length >= 3 ? `<span class="bd mix">跨 ${b.realms.length} 域 <em>生命 / 攻击 +${Math.round((MIXED_SYNERGY[b.realms.length] || 0) * 100)}%</em></span>` : '';
  const head = b.count ? `已激活 ${b.count} 条 → ${bonusText(b.bonus)}` : '这套阵容还没凑出羁绊';
  if (compact) return `<div class="bdline slim">${on || '<span class="bd none">无羁绊</span>'}${mix}</div>`;
  return `<div class="bdline">${on}${mix}${near}</div><p class="hint">${head}。羁绊是<b>全队被动</b>（不看站位、人倒了也还在），和造物羁绊、同界域加成叠加。混编队凑 3 / 4 个不同界域还有<b>跨域共鸣</b>。</p>`;
}

/** 全部羁绊一览：队伍页里折起来，方便照着凑 */
export function bondBook(app) {
  const { data } = app;
  const groups = Object.keys(BOND_CATS).map((cat) => {
    const items = BONDS.filter((x) => x.cat === cat);
    if (!items.length) return '';
    const rows = items.map((x) => {
      const tiers = Object.entries(x.tiers).map(([n, bo]) => `<span class="btier">${n} 人：${esc(bonusText(scaleTier(bo)))}</span>`).join('');
      return `<li><b>${esc(x.zh)}</b><small>${esc(bondHint(x, data.bySlug))}</small><div>${tiers}</div><small class="dim">${esc(x.desc)}</small></li>`;
    }).join('');
    // 条数多的那一组（本命羁绊 13 条）再折一层，不然展开图鉴要滚很久
    if (items.length > 6) return `<details class="bdgroup more"><summary>${BOND_CATS[cat]}（${items.length} 条）</summary><ul>${rows}</ul></details>`;
    return `<div class="bdgroup"><h5>${BOND_CATS[cat]}（${items.length}）</h5><ul>${rows}</ul></div>`;
  }).join('');
  return `<details class="bdall"><summary>全部羁绊一览（${BONDS.length} 条）</summary>${groups}</details>`;
}

/* -------- 命轮 / 密契槽位：队伍页与装备页共用，点一下弹候选直接换 -------- */
function equipSlot(app, slug, kind) {
  const s = app.state, eq = s.gear.equip[slug] || {};
  const uid = eq[kind === 'wheel' ? 'wheel' : 'cov'], it = uid && s.gear.items[uid];
  const label = kind === 'wheel' ? '命轮' : '密契';
  if (!it) return `<button class="eqslot empty" data-act="gear-slot" data-slug="${slug}" data-kind="${kind}" title="还没装${label}"><span class="plus">＋</span><small>${label}</small></button>`;
  const def = itemDef(app, it);
  return `<button class="eqslot on ${rarCls(def.rarity)}" data-act="gear-slot" data-slug="${slug}" data-kind="${kind}" title="${esc(itemText(app, it))}">
    <img src="${img(def.img)}" alt=""><b>${esc(def.zh)}</b><small>Lv${it.lv}${it.rf ? ` · 精炼+${it.rf}` : ''}</small></button>`;
}

/** 当前这层「造物详情」的换件上下文：编队编辑器开着它时是非空函数（换的是那套编队的草稿）。
    强化 / 精炼之后 main.js 会重开一层详情，那时候不带 opts，靠这个沿用上一次的上下文。 */
let relicSwapCtx = null;

/** 造物详情：队伍页点「详情」进来，能直接强化 / 精炼，精炼前后数值对照着看。
 *  opts.onSwap：编队编辑器里点进来时用——「换一件」要改的是那套编队的独立配装草稿，
 *  而不是主线的造物栏。以前不传这个，点在编队里的「换一件」会去改 s.gear.relics：
 *  草稿纹丝不动（看着像没生效），主线那 6 件反倒被悄悄换掉。
 *  opts 传 null（默认）= 沿用上一次的上下文（强化 / 精炼后重开用），传 {} = 回主线。 */
/** 免费回溯券的张数：有券的时候回溯不花银芯，按钮直接写「券」 */
const rwCount = (s) => Math.max(0, Math.floor(Number(s?.vouchers?.rewind) || 0));
/** 命轮器纹弹窗：当前器纹 + 刷一次的价格 + 候选（换上 / 保留原来）+ 五个品阶的概率表 */
export function runeModal(app, uid) {
  const s = app.state, it = s.gear.items[uid];
  if (!it || (it.kind !== 'wheel' && it.kind !== 'relic')) return;
  const def = itemDef(app, it);
  const nm = it.kind === 'relic' ? '特质' : '器纹';          // 命轮叫器纹，造物叫特质，刷取规则一样
  const cur = runeOf(def, it.rune, it.kind), cost = runeCost(s, def), can = s.gold >= cost;
  const tag = (r) => `<b style="color:${RUNE_TIERS[r.t - 1].color}">${esc(runeLabel(r))}</b>`;
  const cand = it.runeNew;
  const total = RUNE_TIERS.reduce((n, x) => n + x.w, 0);
  const tiers = RUNE_TIERS.map((x) => `<span style="color:${x.color}">${x.zh} ×${x.m}（${Math.round(x.w / total * 100)}%）</span>`).join(' · ');
  const html = `<h3>${esc(def.zh)} · ${nm} <small class="dim">${def.rarity || ''} Lv${it.lv}</small></h3>
    <div class="rfbox">
      <div class="rfrow"><span>当前${nm}</span>${tag(cur)}</div>
      ${cand ? `<div class="rfrow"><span>刷出来的新${nm}</span>${tag(cand)}</div>` : ''}
    </div>
    ${cand ? `<div class="row"><button class="btn sm gold" data-act="rune-take" data-uid="${uid}">换上新的</button><button class="btn sm" data-act="rune-keep" data-uid="${uid}">保留原来的</button></div>
      <p class="hint">不满意就保留原来的——这一次的金币不退。再刷一次会直接顶掉这条候选。</p>` : ''}
    <div class="row"><button class="btn sm ${can ? 'gold' : ''}" data-act="rune-roll" data-uid="${uid}" ${can ? '' : 'disabled'}>刷取${nm} 🪙${fmt(cost)}</button></div>
    <p class="hint">每次随机抽 <b>${RUNE_KEYS.length} 种属性</b>（${RUNE_KEYS.map((k) => STAT_ZH[k]).join(' / ')}）之一，和 <b>5 个品阶</b>：${tiers}。品阶只管倍率，「精」= 基础值，凡 / 良更低，极 / 绝更高；新装备获得时也是随机抽一条。${nm}是固定加成，<b>不吃强化等级与精炼</b>；价格 = 约 12 场胜利的金币 × 稀有度，随最高通关关卡一起涨。</p>
    <p class="hint dim">金币 ${fmt(s.gold)}</p>`;
  openModal(html);
}

const rewindBtn = (s, it, cls = 'btn sm') => {
  const p = gearRewindPlan(it); if (!p.cost) return '';
  const back = `${p.refund ? `金币 ${fmt(p.refund)}` : ''}${p.refund && p.refundCores ? ' + ' : ''}${p.refundCores ? `银芯 ${p.refundCores}` : ''}`;
  const rw = rwCount(s), free = rw > 0;
  return `<button class="${cls}" data-act="gear-rewind" data-uid="${it.uid}" ${free || s.cores >= p.cost ? '' : 'disabled'} title="回溯：强化和精炼倒回 0，返还 ${back}${free ? `（用一张免费回溯券，不花银芯；还剩 ${rw} 张）` : ''}">回溯 ${free ? `券×${rw}` : `<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${p.cost}`}</button>`;
};
export function relicModal(app, uid, opts = null) {
  if (opts) relicSwapCtx = opts.onSwap || null;
  const onSwap = relicSwapCtx;
  const s = app.state, it = s.gear.items[uid];
  if (!it || it.kind !== 'relic') return;
  const def = itemDef(app, it);
  const v = relicRefineView(def, it.lv, it.rf || 0);
  const unit = v.open ? '点' : '%';
  const f = (x) => x.toFixed(1);
  const upCost = it.lv < GEAR_MAX_LV ? gearCost('relic', it.lv) : 0;
  const rc = refineCost(it);
  const canUp = upCost && s.gold >= upCost, canRf = rc && s.cores >= rc;
  const nextLine = v.rf >= REFINE_MAX
    ? '<p class="hint">已经精炼满 ' + REFINE_MAX + ' 阶（+40%）。</p>'
    : `<p class="hint">下一阶：${f(v.next)}${unit}（再多 +${f(v.next - v.now)}${unit}，花 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${rc}）</p>`;
  const html = `<h3>${esc(def.zh)} <small class="dim">${def.rarity || ''} Lv${it.lv}${v.rf ? ` · 精炼+${v.rf}` : ''}</small></h3>
    <div class="rfbox">
      <div class="rfrow"><span>精炼所在加成</span><b>+${f(v.now - v.base)}${unit}</b></div>
      <div class="rfrow"><span>基础（Lv${it.lv}）</span><b>${f(v.base)}${unit}</b></div>
      <div class="rfrow"><span>当前实际（全队${esc(v.zh)}）</span><b>${f(v.now)}${unit}</b></div>
      <div class="rfrow"><span>精炼 ${v.rf}/${REFINE_MAX} 阶</span><b>每阶 +8% 基础值</b></div>
    </div>
    ${nextLine}
    <p class="hint">精炼乘的是<b>整件造物的全部加成</b>（强化越高，精炼吃到的绝对值越多），所以先强化再精炼最划算。它只作用于装上它的造物栏，不占唤醒体栏位。</p>
    <div class="row">
      <button class="btn sm" data-act="relic-up" data-uid="${uid}" ${canUp ? '' : 'disabled'}>${upCost ? `强化 ${fmt(upCost)} 金币` : `已满级 Lv${GEAR_MAX_LV}`}</button>
      <button class="btn sm gold" data-act="relic-refine" data-uid="${uid}" ${canRf ? '' : 'disabled'}>${rc ? `精炼 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${rc}` : '精炼满'}</button>
      <button class="btn sm" data-act="${onSwap ? 'sq-relic-swap' : 'relic-swap'}" data-i="${relicIndexOf(s, uid)}">换一件</button>
      <button class="btn sm" data-act="rune-open" data-uid="${uid}" title="特质：花金币随机刷 16 种属性 × 5 个品阶">特质${it.rune ? `·${RUNE_TIERS[it.rune.t - 1].zh}` : ''}</button>
      ${rewindBtn(s, it)}
    </div>
    ${gearRewindPlan(it).cost ? `<p class="hint">回溯：${rwCount(s) ? `用一张<b>免费回溯券</b>（还剩 ${rwCount(s)} 张），不花银芯` : `花 ${GEAR_REWIND_COST} 银芯`}，把这件造物的强化和精炼倒回 0，当初花的金币和精炼银芯<b>全部返还</b>。</p>` : ''}
    <p class="hint dim">金币 ${fmt(s.gold)} · 银芯 ${fmt(s.cores)}</p>`;
  const m = openModal(html);
  // 编队编辑器里：这里的「换一件」必须换成草稿那一格，不能落到主线的造物栏上
  if (onSwap) m.addEventListener('click', (e) => {
    if (!e.target.closest('[data-act="sq-relic-swap"]')) return;
    e.stopPropagation();
    pickItem(app, 'relic', '选择造物', (uid2) => { closeModal(); onSwap(uid2); });
  });
}

const relicIndexOf = (s, uid) => s.gear.relics.indexOf(uid);

/** 队伍 4 人各一行：头像一个 + 命轮槽 + 密契槽 */
export function equipPanel(app) {
  return (app.state.team || []).map((slug) => {
    const a = app.data.bySlug[slug], r = app.state.roster[slug];
    if (!a || !r) return '';
    const p = allyDef(app.state, app.data, slug, app.state.team).power;
    return `<div class="eqrow">
      <div class="eqwho"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${r.lv} · ${awk(r.star)} · 战力 ${fmt(p)}</small></div>
      ${equipSlot(app, slug, 'wheel')}${equipSlot(app, slug, 'covenant')}</div>`;
  }).join('');
}

/** 密契套装统计：同款 2 / 4 件 */
export function covenantSetText(app) {
  const s = app.state, n = {};
  for (const slug of s.team) {
    const ci = (s.gear.equip[slug] || {}).cov && s.gear.items[(s.gear.equip[slug] || {}).cov];
    if (ci) n[ci.defId] = (n[ci.defId] || 0) + 1;
  }
  const sets = Object.entries(n).filter(([, c]) => c >= 2).map(([id, c]) => `${esc(app.data.covById[id]?.zh || id)} ×${c}`);
  return sets.length ? sets.join('、') : '';
}

/* -------- 编队：预先存 3 套阵容，挑战页各自选用 -------- */
export function squadCard(app, key) {
  const { state: s, data } = app;
  const slugs = squadMembers(s, key);
  const t = slugs.length ? withLoadout(s, key, () => teamDefs(s, data, slugs)) : null;
  const used = squadUsage(s, key);
  const lo = loadoutOf(s, key);
  // 这套独立配装里有几件装备同时被别的编队编着：共用不冲突（战斗各算各的），但要让人看得见
  const shared = lo ? sharedItemsOf(s, key) : 0;
  // 这套能凑出几条羁绊：编队卡上直接标出来，省得进编辑器才发现「凑不出来」
  const bd = slugs.length ? teamBonds(slugs, data).count : 0;
  // 这套是不是就是主线当前队伍：是的话「上阵」没有意义，按钮直接标成「已在主线」
  const cur = (s.team || []).filter((x) => s.roster[x]);
  const same = squadIsOnMain(s, key);
  const sameCrew = slugs.length > 0 && slugs.length === cur.length && slugs.every((x, i) => x === cur[i]);   // 人和站位都对，只差配装
  const av = slugs.length
    ? slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
    : '<span class="sqempty">还没有保存队伍</span>';
  return `<div class="squad ${slugs.length ? 'on' : ''}" data-squad="${key}">
    <header><b>${SQUAD_ZH[key]}</b><small>${slugs.length ? `${slugs.length} 人 · 战力 ${fmt(t.power)}` : '空位'}${bd ? ` · 羁绊 ${bd}` : ''}</small></header>
    <div class="sqav">${av}</div>
    <div class="sqlo-note">${lo ? `独立配装 · ${loSummary(lo)}` : slugs.length ? '沿用主线配装' : ''}${shared ? `<em class="sqshare" title="这些装备同时也被别的编队编入：两套编队各用各的，互不影响">共用装备 ${shared} 件</em>` : ''}</div>
    <div class="squse">${same ? '<b class="scur">✓ 主线正在用这套</b>' : used.length ? `挑战在用：${used.join('、')}` : '未被挑战引用'}</div>
    <div class="row">
      <button class="btn sm" data-act="squad-edit" data-k="${key}" data-mode="">编队 / 配装</button>
      <button class="btn sm" data-act="squad-save" data-k="${key}">存为当前队伍</button>
      <button class="btn sm" data-act="squad-load" data-k="${key}" ${slugs.length && !same ? '' : 'disabled'} title="${same ? '这套编队（含独立配装）已经是主线当前队伍' : lo ? '把这套编队和它的独立配装一起搬到主线' : '把这 4 人搬到主线（沿用主线配装）'}">${same ? '已在主线' : sameCrew && lo ? '换上配装' : '上阵'}</button>
      <button class="btn sm danger" data-act="squad-clear" data-k="${key}" ${slugs.length ? '' : 'disabled'}>清空</button>
    </div></div>`;
}

/** 独立配装的一行摘要：命轮密契件数、造物件数、钥令个数 */
function loSummary(lo) {
  const eq = Object.values(lo.equip || {}).reduce((n, e) => n + (e?.wheel ? 1 : 0) + (e?.cov ? 1 : 0), 0);
  const rl = (lo.relics || []).filter(Boolean).length, od = (lo.orders || []).filter(Boolean).length;
  return `命轮密契 ${eq} · 造物 ${rl} · 钥令 ${od}`;
}

/** 挑战入口正用「当前队伍」时，「编队」该打开哪一套：优先第一个还空着的通用编队。
    以前写死打开一队——一队往往已经被别的挑战占着，点「编队」看到的是别人那套，更容易存错。 */
function freeSquadKey(app) {
  const s = app.state;
  return SQUAD_KEYS.find((k) => !squadMembers(s, k).length) || 'a';
}

/** 挑战页顶部的「出战阵容」选择条：当前队伍 / 一队 / 二队 / 三队 + 现场编队 */
export function squadBar(app, mode, note = '') {
  const s = app.state;
  const cur = pickedSquad(s, mode);
  const chip = (k, label, on) => `<button class="sqchip ${on ? 'on' : ''}" data-act="squad-pick" data-mode="${mode}" data-k="${k}">${label}</button>`;
  const list = (mode === 'luck' ? [...SQUAD_KEYS, ...LUCK_SQUAD_KEYS] : SQUAD_KEYS).map((k) => {
    const n = squadMembers(s, k).length;
    return chip(k, `${SQUAD_ZH[k]}${n ? `<em>${n}人</em>` : '<em class="dim">空</em>'}`, cur === k);
  }).join('');
  const fb = cur !== 'cur' && !squadMembers(s, cur).length;
  return `<div class="squadbar"><span class="sqh">出战阵容</span>${chip('cur', '当前队伍', cur === 'cur')}${list}
    <button class="btn sm sqedit" data-act="squad-edit" data-mode="${mode}" data-k="${cur === 'cur' ? (mode === 'luck' ? 'lk' : freeSquadKey(app)) : cur}">现场编队</button>
    <small class="dim">${fb ? `「${SQUAD_ZH[cur]}」是空的，暂时按当前队伍打` : note || '在「队伍 → 挑战编队」里指定，或点「现场编队」当场排'}</small></div>`;
}

/* -------- 队伍页：标签切换 -------- */
// 以前 8 个挑战入口 + 融灾禁区 + 5 套编队全堆在同一页，钥令和造物被挤到最底下，看一次要滚很久。
// 现在按入口拆成标签：主线一个页、每个挑战一个页、编队库一个页，钥令与造物就在队伍正下方。
export const TEAM_TABS = [
  ['main', '主线队伍', '推图挂机就这一队'],
  ['tower', '无限塔', '一层层往上爬的连续战斗'],
  ['rift', '融灾禁区', '五队齐上，另含区域首领'],
  ['weekly', '周 Boss', '限 12 回合拼伤害'],
  ['wboss', '世界 Boss', '全服共讨同一条血池：一天三次，限 12 回合'],
  ['rt', '属性塔', '只收本界域成员，四座塔各存一套'],
  ['arena', '竞技场', '天梯与好友对战共用'],
  ['luck', '疾驰大运', '整趟用选定的那一队，另有大运专用队'],
  ['squads', '编队库', '通用 / 属性塔 / 禁区，分开存'],
];
const TEAM_TAB_KEYS = TEAM_TABS.map(([k]) => k);
export const teamTabOf = (app) => (TEAM_TAB_KEYS.includes(app.ui?.teamTab) ? app.ui.teamTab : 'main');

/** 一个挑战入口：现在用哪套 + 这套的缩略头像 + 可切换的一排 */
function modeBlock(app, mode, title = '') {
  const { state: s, data } = app;
  const lab = squadLabel(s, mode);
  const slugs = teamSlugsFor(s, mode).filter((x) => s.roster[x]);
  const t = slugs.length ? withLoadout(s, squadKeyFor(s, mode), () => teamDefs(s, data, slugs)) : null;
  const loUsed = loadoutOf(s, squadKeyFor(s, mode));
  const av = slugs.length
    ? slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
    : '<span class="sqempty">空缺</span>';
  // 属性塔只用「自己那套专用编队」或「当前队伍」：不再列出通用一队~五队——
  // 让四座塔借用通用编队正是它们互相覆盖的根源
  const tk = towerSquadKey(mode);
  const chipKeys = tk ? ['cur', tk] : mode === 'luck' ? ['cur', ...SQUAD_KEYS, ...LUCK_SQUAD_KEYS] : ['cur', ...SQUAD_KEYS];
  const chips = chipKeys.map((k) => {
    const n = k === 'cur' ? s.team.length : squadMembers(s, k).length;
    const zh = k === 'cur' ? '当前队伍' : SQUAD_ZH[k];
    return `<button class="sqchip ${lab.key === k ? 'on' : ''}" data-act="squad-pick" data-mode="${mode}" data-k="${k}" title="${n ? `${n} 人` : '这套还空着'}">${zh}${k === 'cur' || n ? '' : '<em class="dim">空</em>'}</button>`;
  }).join('');
  const nameZh = tk && lab.key === tk ? '本塔专用队' : lab.zh;
  return `<div class="assign ${lab.key !== 'cur' && !lab.fallback ? 'on' : ''}">
    <header><b>${title || MODE_ZH[mode]}</b><small>${lab.fallback ? `${lab.zh}（空）→ 当前队伍` : `${nameZh} · ${slugs.length} 人${t ? ` · 战力 ${fmt(t.power)}` : ''}`}</small>
      <button class="btn sm" data-act="squad-edit" data-mode="${mode}" data-k="${lab.key === 'cur' ? (tk || (mode === 'luck' ? 'lk' : freeSquadKey(app))) : lab.key}" title="${lab.key === 'cur' ? `「${MODE_ZH[mode] || ''}」用的是当前队伍；这里编的是另一套，存下来才会换过去` : ''}">编队</button></header>
    <div class="sqav">${av}</div>
    <div class="sqlo-note">${loUsed ? `独立配装 · ${loSummary(loUsed)}` : '沿用主线配装（点「编队」可给这套单独配命轮 / 造物 / 钥令）'}</div>
    <div class="achips">${chips}</div></div>`;
}

/** 属性塔：四座塔共用一套界面，用界域小胶囊切换，一次只看一座 */
function rtPanel(app) {
  const { state: s, data } = app;
  const realm = REALMS[app.ui?.rtTab] ? app.ui.rtTab : 'CHAOS';
  const chips = RT_MODES.map((m) => {
    const r = realmOfMode(m);
    const n = teamSlugsFor(s, m).filter((x) => s.roster[x]).length;
    return `<button class="sqchip ${r === realm ? 'on' : ''}" data-act="team-rt" data-k="${r}">${REALMS[r].zh}${n ? `<em>${n}人</em>` : '<em class="dim">空</em>'}</button>`;
  }).join('');
  return `<div class="ttsub">${chips}</div>
    ${modeBlock(app, rtModeOf(realm))}
    <p class="hint">属性塔只收对应界域的成员：编队里不属于该界域的会被剔掉，一个都不剩就自动挑你最强的 4 名本界域唤醒体。<b>四座塔各有一套专用编队</b>（编队库里的「属性塔专用」），调一座不影响另外三座，也不动通用编队。</p>`;
}

/** 融灾禁区：一队~五队各打一组敌人；五队的唤醒体和装备不许重复，界面显示的是「去重后实际出战」的样子 */
function riftPanel(app) {
  const { state: s, data } = app;
  const party = riftParty(s, data);
  const filled = party.filter((p) => p.filled).length;
  const lines = party.map((p, i) => {
    const av = p.slugs.length
      ? p.slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
      : '<span class="sqempty">没有可上阵的唤醒体</span>';
    const gear = Object.values(p.lo.equip).reduce((n, e) => n + (e?.wheel ? 1 : 0) + (e?.cov ? 1 : 0), 0) + p.lo.relics.filter(Boolean).length;
    const tag = p.filled ? (p.hasLo ? '自编 · 独立配装' : '自编 · 装备自动配') : '自动补位';
    return `<div class="riftline ${p.filled ? 'on' : ''}"><b>第 ${i + 1} 队</b>
      <div class="sqav">${av}</div><small>战力 ${fmt(p.team.power)} · ${tag} · 装备 ${gear} 件 · 钥令 ${p.lo.orders.filter(Boolean).length}${p.conflict ? ' · <em class="new">有重复，已自动调整</em>' : ''}</small>
      <button class="btn sm" data-act="squad-edit" data-k="${p.key}" data-mode="${RIFT_MODE}">编队</button></div>`;
  }).join('');
  return `<div class="assign ${filled === RIFT_SQUAD_KEYS.length ? 'on' : ''}">
      <header><b>融灾禁区</b><small>五队齐上 · 自己编了 ${filled}/${RIFT_SQUAD_KEYS.length}${filled < RIFT_SQUAD_KEYS.length ? '（没编的自动补位）' : ''}</small>
        <button class="btn sm" data-act="go-rift">去挑战 →</button></header>
      <div class="riftlines">${lines}</div></div>
    <p class="hint">一层派五队各打一组敌人，5 场胜 4 场即通过，最高 100 层、每两周换一期。这五套就是<b>禁区一队~禁区五队</b>，只给禁区用，不动通用那五套。<b>五队的唤醒体和装备（命轮 / 密契 / 造物 / 钥令）都不能重复</b>：没编的队自动用没被占用的人和装备补满；你编的队里如果有人或装备已被前面的队占了，会按一队→五队的顺序让给前面的队，缺口自动补。上表就是去重后实际出战的样子。</p>
    <h4>区域首领出战阵容 <small class="dim">单队挑战，和上面的五队互不影响</small></h4>
    ${modeBlock(app, 'trial', '融灾禁区 · 区域首领')}`;
}

/** 编队库：通用五套 + 融灾禁区专用五套，都能往当前队伍套、也能一键上阵 */
function squadsPanel(app) {
  return `<h3>通用编队 <small>无限塔 / 周 Boss / 竞技场各自选用</small></h3>
    <div class="squads">${SQUAD_KEYS.map((k) => squadCard(app, k)).join('')}</div>
    <p class="hint">每套编队除了 4 名唤醒体，还可以开「<b>独立配装</b>」：给这套单独配每人 1 件命轮 + 1 件密契、6 格造物、3 个钥令位（和主线队伍一样完整）；不开就沿用主线配装。同一件装备可以同时出现在不同编队里，只是同一套里不能重复。<b>推图挂机始终用「当前队伍」</b>，想换阵容就点「上阵」或回「主线队伍」改那 4 个槽位。</p>
    <h3>属性塔专用 <small>四座塔各一套 · 只收本界域成员</small></h3>
    <div class="squads">${TOWER_SQUAD_KEYS.map((k) => squadCard(app, k)).join('')}</div>
    <p class="hint">这四套<b>只给对应的那座塔用</b>（混沌尖塔 / 血肉之塔 / 深海回廊 / 超维阶梯），和上面的通用编队、和别的塔都分开存：调混沌塔不会动到其它塔。<b>留空就退回「当前队伍」</b>（会自动剔掉非本界域的成员，一个都不剩时挑最强的 4 名补上）。</p>
    <h3>疾驰大运专用 <small>只给大运用</small></h3>
    <div class="squads">${LUCK_SQUAD_KEYS.map((k) => squadCard(app, k)).join('')}</div>
    <h3>融灾禁区专用 <small>禁区一队~禁区五队 · 对应第 1~5 组敌人</small></h3>
    <div class="squads">${RIFT_SQUAD_KEYS.map((k) => squadCard(app, k)).join('')}</div>
    <p class="hint">这五套<b>只给融灾禁区用</b>，调它们不会动到上面那五套通用编队。<b>五队的唤醒体和装备不能重复</b>；哪队还没编，挑战时会自动用没被占用的人和装备补满。</p>`;
}

/** 编队编辑器的弹窗标识：换装备要「弹窗套弹窗」，靠这个把滚动位置带回来 */
const SQ_EDITOR_KEY = 'sqeditor';
/** 编辑器里连续换装用的挑装备弹窗标识：同一类装备连着换，列表停在原处，不用每次重新往下拉 */
const sqPickKey = (kind) => `sqpick:${kind}`;

/**
 * 编队编辑器：四个槽位 + 界域筛选 + 一键上阵，存到一/二/三队。
 * mode 有值时，保存后把这个挑战入口直接指向刚存的编队。
 */
export function squadEditor(app, { key = 'a', mode = null, resume = false } = {}) {
  const { state: s, data } = app;
  let st = resume ? app.ui.sqDraft : null;
  if (!st) {
    // 从编队库点「编队 / 配装」进来时 mode 是空的，得靠 key 判断这套是不是禁区专用队，
    // 否则禁区一队会被当成普通编队编辑，保存按钮只剩通用一队~五队。
    const isTowerM = !!towerSquadKey(mode);
    const isRiftM = mode === RIFT_MODE || isRiftSquad(key);
    // 属性塔：只能编自己那套（t_CHAOS..），默认就落在这一套上——四座塔互不借用
    if (isTowerM && !isTowerSquad(key)) key = towerSquadKey(mode);
    const keys0 = isRiftM ? RIFT_SQUAD_KEYS : isTowerM ? [towerSquadKey(mode)] : SQUAD_KEYS;
    if (!ALL_SQUAD_KEYS.includes(key)) key = keys0[0];
    const lockR = mode && String(mode).startsWith('rt_') ? String(mode).slice(3) : null;
    st = { key, mode: mode || null, realm: lockR || '', team: [...squadMembers(s, key)], lo: JSON.parse(JSON.stringify(loadoutOf(s, key) || null)) };
    // 禁区这队还空着：先把它现在自动补位的那 4 个人填进来当草稿（五队互不重复，所以不能拿主线队伍顶）
    if (!st.team.length && isRiftM) st.team = [...(riftParty(s, data).find((p) => p.key === key)?.slugs || [])];
    // 以前这里还有一句「草稿空着就拿 teamSlugsFor(s, mode) 预填」。当挑战入口选的是「当前队伍」时，
    // 那句会把主线那 4 个人填进「一队」：标题写着编一队，槽位里却是主线队伍，改完存下一队还白改一套。
    // 现在草稿只反映这套编队自己存了什么；想从主线 4 人起手，编辑器里有「套用当前队伍」。
    // 属性塔只收本界域的人：草稿里不合界的先剔掉（不然给血肉塔开编辑器，
    // 预填进来的是当前队伍里那 4 个混沌界域的人，保存时又全被剔空）
    if (lockR) st.team = st.team.filter((x) => data.bySlug[x]?.realm === lockR);
  }
  app.ui.sqDraft = st;
  // 装备列表里的「已编入 …」按这份草稿算：编进这套、还没保存，列表里也立刻显示出来
  setSquadDraftCtx(st);
  mode = st.mode;
  // 禁区那五套（r1~r5）永远是禁区专用：不管是从「融灾禁区」页进来，还是从编队库直接点它们进来
  const isRift = mode === RIFT_MODE || isRiftSquad(st.key);
  // 属性塔那四套（t_CHAOS..）同理：只给对应的那座塔用，不和通用编队、别的塔混
  const isTower = !!towerSquadKey(st.mode) || isTowerSquad(st.key);
  // 融灾禁区编辑的是它自己那五套（禁区一队~五队），存完只落这一处，不碰通用编队；
  // 属性塔更窄：只有一座塔的那一套，保存按钮就一个
  // 大运：从「大运」入口进来可以存到通用一队~五队或大运专用队；从编队库直接编专用队就只留它自己
  const keys = isRift ? RIFT_SQUAD_KEYS : isTower ? [towerSquadKey(st.mode) || st.key] : st.mode === 'luck' ? [...SQUAD_KEYS, ...LUCK_SQUAD_KEYS] : isLuckSquad(st.key) ? LUCK_SQUAD_KEYS : SQUAD_KEYS;
  const lockRealm = mode && String(mode).startsWith('rt_') ? String(mode).slice(3) : null;
  const modeZh = mode ? (MODE_ZH[mode] || (mode === RIFT_MODE ? '融灾禁区' : mode)) : '';
  const powerOf = (slug) => teamView(s, data)(slug)?.power || 0;
  // 融灾禁区：别的四队占着的唤醒体 / 装备 / 钥令不能再选（五队不许重复）
  const taken = () => (isRift ? riftTaken(s, st.key) : { chars: new Map(), items: new Set(), orders: new Set() });

  const rows = () => Object.keys(s.roster).map((x, i) => ({ x, a: data.bySlug[x], r: s.roster[x], idx: i, power: powerOf(x) }));
  // 可选唤醒体的筛选：界域（属性塔会锁死）+ 定位 + 稀有度；排序固定按战力，强的在上面
  const cands = () => rows()
    .filter((o) => o.a && (!st.realm || o.a.realm === st.realm) && (!st.type || o.a.type === st.type) && (!st.rar || o.a.rarity === st.rar))
    .sort((x, y) => y.power - x.power);
  const filterCount = () => (st.realm ? 1 : 0) + (st.type ? 1 : 0) + (st.rar ? 1 : 0);

  /* ---- 独立配装草稿：用一份「假 state」算战力，不动真实存档 ---- */
  const fakeWith = (lo) => ({ ...s, gear: { ...s.gear, equip: lo.equip, relics: lo.relics }, orders: { ...s.orders, slots: lo.orders } });
  const loPower = () => (st.lo && st.team.length ? teamDefs(fakeWith(st.lo), data, st.team).power : null);
  const copyMain = () => {
    const t = taken(), ok = (u) => (u && !t.items.has(u) ? u : null);
    return {
      equip: Object.fromEntries(st.team.map((slug) => { const e = s.gear.equip[slug] || {}; return [slug, { ...(ok(e.wheel) ? { wheel: e.wheel } : {}), ...(ok(e.cov) ? { cov: e.cov } : {}) }]; })),
      relics: Array.from({ length: RELIC_SLOTS }, (_, i) => ok(s.gear.relics[i])),
      orders: Array.from({ length: ORDER_SLOTS }, (_, i) => (s.orders.slots[i] && !t.orders.has(s.orders.slots[i]) ? s.orders.slots[i] : null)),
    };
  };
  const eqBtn = (slug, kind) => {
    const e = (st.lo.equip[slug] ||= {});
    const uid = e[kind === 'wheel' ? 'wheel' : 'cov'], it = uid && s.gear.items[uid];
    const label = kind === 'wheel' ? '命轮' : '密契';
    if (!it) return `<button class="eqslot empty" data-sq="eq" data-slug="${slug}" data-kind="${kind}"><span class="plus">＋</span><small>${label}</small></button>`;
    const def = itemDef(app, it);
    return `<button class="eqslot on ${rarCls(def.rarity)}" data-sq="eq" data-slug="${slug}" data-kind="${kind}" title="${esc(itemText(app, it))}"><img src="${img(def.img)}" alt=""><b>${esc(def.zh)}</b><small>Lv${it.lv}${it.rf ? ` · 精炼+${it.rf}` : ''}</small></button>`;
  };
  const loSection = () => {
    if (!st.lo) {
      return `<h4>配装 <small class="dim">现在沿用主线队伍的命轮 / 密契 / 造物 / 钥令</small></h4>
        <div class="row"><button class="btn" data-sq="lo-on">开启独立配装</button></div>
        <p class="hint">开启后这套编队出战时用自己的命轮、密契、造物与钥令，不再吃主线队伍的穿戴；起手是主线配装的拷贝，可以随便改。</p>`;
    }
    const n = relicSlotCount(s.maxStage), on = orderSlotCount(s.maxStage);
    const mem = st.team.map((slug) => {
      const a = data.bySlug[slug], r = s.roster[slug];
      if (!a || !r) return '';
      return `<div class="eqrow"><div class="eqwho"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${r.lv}</small></div>${eqBtn(slug, 'wheel')}${eqBtn(slug, 'covenant')}</div>`;
    }).join('') || '<p class="hint">先在上面选人，再给他们配命轮和密契。</p>';
    const rel = Array.from({ length: RELIC_SLOTS }, (_, i) => {
      if (i >= n) return `<div class="relic-slot locked">🔒 第 ${i + 1} 格<br><small>最高通关 ${RELIC_UNLOCK[i - RELIC_BASE_SLOTS]} 关解锁</small></div>`;
      const uid = st.lo.relics[i], it = uid && s.gear.items[uid];
      if (!it) return `<div class="relic-slot empty" data-sq="relic" data-i="${i}">＋ 造物 ${i + 1}</div>`;
      const def = itemDef(app, it);
      const rf = it.rf || 0, gain = relicRefineGain(def, it.lv, rf);
      const unit = relicTheme(def.id).key.startsWith('open') ? '点' : '%';
      return `<div class="relic-slot ${rarCls(def.rarity)}" data-sq="relic" data-i="${i}" title="${esc(itemText(app, it))}">
        <img src="${img(def.img)}" alt=""><small><b>${esc(def.zh)}</b><br>${esc(itemText(app, it))}<br>Lv${it.lv}${rf ? ` · 精炼+${rf}` : ''}</small>
        ${rf ? `<em class="rf">精炼+${rf} 已含 +${gain.toFixed(1)}${unit}</em>` : ''}
        <button class="btn sm rfbtn" data-act="relic-detail" data-uid="${it.uid}">详情</button></div>`;
    }).join('');
    const och = Array.from({ length: ORDER_SLOTS }, (_, i) => {
      if (i >= on) return `<span class="ochip locked">🔒 最高通关 ${orderLockedHint(i, s.maxStage)} 关</span>`;
      const id = st.lo.orders[i], def = id && data.orderById[id];
      return def ? `<button class="ochip on" data-sq="order" data-i="${i}" title="${esc(orderText(def, s.orders.owned[id]))}">${oglyph(def)} ${esc(def.zh)}<em>Lv${s.orders.owned[id]}</em></button>` : `<button class="ochip" data-sq="order" data-i="${i}">空位 ${i + 1}</button>`;
    }).join('');
    const p = loPower();
    return `<h4>独立配装 <small class="dim">${p != null ? `这套战力 ${fmt(p)}` : ''}</small></h4>
      <div class="row"><button class="btn gold" data-sq="lo-auto">一键配装</button><button class="btn sm" data-sq="lo-main">复制主线配装</button><button class="btn sm danger" data-sq="lo-off">关闭（沿用主线）</button></div>
      <h5>命轮 · 密契 <small class="dim">每人各 1 件</small></h5><div class="eqpanel">${mem}</div>
      <h5>造物 <small class="dim">${n}/${RELIC_SLOTS} 格</small></h5><div class="relic-row">${rel}</div>
      <h5>钥令 <small class="dim">已开 ${on}/${ORDER_SLOTS}</small></h5><div class="orderbar">${och}</div>`;
  };

  /* 草稿空着时把话说清楚：这个挑战现在到底在用什么、你正在编的是哪一套。
     以前这里什么都不说，草稿又被主线队伍填满，就会误以为「当前队伍」正在被编辑。 */
  const modeLab = mode ? squadLabel(s, mode) : null;
  const nowUsingZh = modeLab ? (modeLab.key === 'cur' ? '当前队伍' : modeLab.fallback ? `「${SQUAD_ZH[modeLab.key]}」（空）→ 当前队伍` : `「${SQUAD_ZH[modeLab.key]}」`) : '';
  const nowUsingPeople = mode ? teamSlugsFor(s, mode).filter((x) => s.roster[x]).map((x) => data.bySlug[x]?.zh || x).join(' / ') : '';
  const emptyNote = () => {
    if (!mode || st.team.length) return '';
    if (modeLab && modeLab.key === st.key) {
      return `<p class="hint sqnote">「<b>${SQUAD_ZH[st.key]}</b>」是空的，${modeZh}现在暂时按 <b>当前队伍</b> 打${nowUsingPeople ? `：${esc(nowUsingPeople)}` : ''}。<b>编好存下来就生效</b>，别在这套还是空的时候去挑战。</p>`;
    }
    return `<p class="hint sqnote">${modeZh}现在用的是 <b>${nowUsingZh}</b>${nowUsingPeople ? `：${esc(nowUsingPeople)}` : ''}。你现在编的是「<b>${SQUAD_ZH[st.key]}</b>」，它还是空的——点下面的「套用当前队伍」把这几位搬过来，或者自己重排；存完 ${modeZh} 就改用它。</p>`;
  };

  const body = () => {
    const slots = Array.from({ length: TEAM_SIZE }, (_, i) => {
      const slug = st.team[i], a = slug && data.bySlug[slug];
      if (!a) return `<button class="sqslot empty" data-sq="del" data-i="${i}"><span class="plus">＋</span><small>${i < FRONT_SLOTS ? '前排' : '后排'} ${i + 1}</small></button>`;
      const r = s.roster[slug];
      return `<button class="sqslot on" data-sq="del" data-i="${i}" title="点一下移出"><img src="${img(a.portrait)}" alt="">
        <b>${esc(a.zh)}</b><small>${REALMS[a.realm].zh} · Lv${r.lv} · ${awk(r.star)}</small><small>战力 ${fmt(powerOf(slug))}</small></button>`;
    }).join('');
    const list = cands().map((o) => {
      const on = st.team.includes(o.x), full = st.team.length >= TEAM_SIZE, by = taken().chars.get(o.x);
      return `<button class="tile ${on ? 'on' : ''} ${(full && !on) || by ? 'dis' : ''} ${rarCls(o.a.rarity)} ${o.r ? '' : 'locked'}" style="--rc:${R(o.a).color}" data-sq="add" data-slug="${o.x}">
        <img src="${img(o.a.portrait)}" alt=""><b>${esc(o.a.zh)}</b><small>${REALMS[o.a.realm].zh} · ${TYPES[o.a.type].short} · Lv${o.r.lv} · 叠${o.r.star}</small><small>${by ? `已在${SQUAD_ZH[by]}` : fmt(o.power)}</small>
        ${on ? '<i class="tick">✓</i>' : ''}</button>`;
    }).join('');
    const realmChips = [['', '全部'], ...Object.entries(REALMS).map(([k, v]) => [k, v.zh])]
      .map(([k, zh]) => `<button class="sqchip ${st.realm === k ? 'on' : ''}" data-sq="realm" data-v="${k}" ${lockRealm && k !== lockRealm ? 'disabled' : ''}>${zh}</button>`).join('');
    // 定位 / 稀有度筛选：人多了以后只按界域挑不够用（同界域里还要分守 / 攻 / 辅）
    const typeChips = [['', '全部定位'], ...Object.entries(TYPES).map(([k, v]) => [k, v.zh])]
      .map(([k, zh]) => `<button class="sqchip ${st.type === k ? 'on' : ''}" data-sq="type" data-v="${k}">${zh}</button>`).join('');
    const rarChips = [['', '全部稀有度'], ['Genesis', '创生'], ['SSR', '史诗'], ['SR', '精良'], ['R', '稀有']]
      .map(([k, zh]) => `<button class="sqchip ${st.rar === k ? 'on' : ''}" data-sq="rar" data-v="${k}">${zh}</button>`).join('');
    return `<h3>编队 · ${SQUAD_ZH[st.key]} <small>${st.team.length}/${TEAM_SIZE} 人</small></h3>
      <p class="hint">点下面的头像加入这队，点上面的槽位移出；顺序就是站位（前两个是前排）。${lockRealm ? `<b>${REALMS[lockRealm].zh}塔只收${REALMS[lockRealm].zh}界域</b>，筛选已锁定。` : '「一键上阵」按当前筛选的界域取战力最高的 4 名（优先前排守护 + 治疗）。'}
        ${mode ? (isRift ? `保存后 <b>${SQUAD_ZH[st.key]}</b> 就是融灾禁区里的第 ${RIFT_SQUAD_KEYS.indexOf(st.key) + 1} 队（专用编队，不动通用那五套）。`
      : isTower ? `这套只给 <b>${modeZh}</b> 用：存完只动 <b>${SQUAD_ZH[st.key]}</b> 这一套，通用编队和别的塔都不受影响。`
        : `保存后 <b>${modeZh}</b> 就用这套出战。`) : ''}</p>
      ${emptyNote()}
      <div class="row sqrealms">${realmChips}</div>
      <div class="row sqrealms">${typeChips}${rarChips}${filterCount() ? '<button class="btn sm" data-sq="fclear" title="清空界域 / 定位 / 稀有度筛选">清除筛选</button>' : ''}</div>
      <div class="sqslots">${slots}</div>
      ${bondStrip(app, st.team, { compact: true })}
      <div class="row"><button class="btn gold" data-sq="auto">一键上阵</button><button class="btn sm" data-sq="clear" ${st.team.length ? '' : 'disabled'}>清空</button>
        <button class="btn ${st.team.length ? 'sm' : 'sm gold'}" data-sq="from-team">套用当前队伍</button></div>
      <div class="sqlo">${loSection()}</div>
      <h4>可选唤醒体 <small class="dim">${cands().length}/${rows().length} 名${filterCount() ? ` · 已筛选 ${filterCount()} 项` : ''}</small></h4>
      <div class="grid mini sqpick">${list || '<p class="hint">没有符合筛选条件的唤醒体，换个定位或稀有度试试。</p>'}</div>
      <div class="row sqsave"><span class="dim">存到</span>
        ${keys.map((k) => `<button class="btn ${k === st.key ? 'gold' : ''}" data-sq="save" data-k="${k}" ${st.team.length ? '' : 'disabled'}>${SQUAD_ZH[k]}</button>`).join('')}
      </div>`;
  };

  const m = openModal(body(), 'wide sqeditor', SQ_EDITOR_KEY);
  // 这个弹窗会为了「选装备 / 看造物详情」被另一层顶掉（本身 DOM 被移除），选完再重开一次。
  // 带上 SQ_EDITOR_KEY 后位置跟着走：在造物那一段换完一件就还在造物那一段，
  // 不会被弹回最上面、再往下拉一遍。
  // 只重绘内容层：✕ 挂在外面的 .modal 上，不参与重绘也不跟着滚
  const paint = () => { const sc = m.querySelector('.modal-body'); const y = sc.scrollTop; sc.innerHTML = body(); sc.scrollTop = y; };
  // 选装备 / 钥令会弹出另一层窗口，把编队窗口顶掉；选完（或点 ✕ 取消）都回到编队窗口，草稿还在 app.ui.sqDraft
  const pickThenBack = (open) => {
    let picked = false;
    const back = () => squadEditor(app, { resume: true });
    open((fn) => { picked = true; fn(); back(); });
    const mo = new MutationObserver(() => { if (!document.querySelector('.modal-bg')) { mo.disconnect(); if (!picked) back(); } });
    mo.observe(document.body, { childList: true });
  };
  m.addEventListener('click', (e) => {
    // 关掉编辑器（✕ 或点遮罩）就作废草稿：否则「已编入 …·草稿」会跟着跑到装备页上
    if (e.target === m || e.target.closest('[data-act="close"]')) {
      if (sqDraftCtx === st) setSquadDraftCtx(null);
      // 编辑器真的关掉了，别再记着这一层滚到哪；下次从编队库进来从头看
      dropModalScroll(SQ_EDITOR_KEY);
      for (const k of ['wheel', 'cov', 'relic']) dropModalScroll(sqPickKey(k));
      return;
    }
    // 造物「详情」：这里是弹窗套弹窗，文档级处理器会把编队窗口顶掉，所以自己接管
    const det = e.target.closest('[data-act="relic-detail"]');
    if (det) {
      e.stopPropagation();
      let back = false;
      // 「换一件」换的是草稿里这格（st.lo.relics），不能让它去动主线的造物栏
      relicModal(app, det.dataset.uid, {
        onSwap: (uid2) => {
          if (!st.lo) return;
          const i = st.lo.relics.indexOf(det.dataset.uid);
          st.lo.relics = st.lo.relics.map((x) => (x === uid2 ? null : x));
          if (i >= 0) st.lo.relics[i] = uid2 || null;
        },
      });
      const mo = new MutationObserver(() => {
        if (!document.querySelector('.modal-bg')) { mo.disconnect(); if (!back) { back = true; squadEditor(app, { resume: true }); } }
      });
      mo.observe(document.body, { childList: true });
      return;
    }
    const el = e.target.closest('[data-sq]');
    if (!el || el.disabled) return;
    const a = el.dataset.sq;
    if (a === 'realm') { st.realm = el.dataset.v; paint(); return; }
    if (a === 'type') { st.type = el.dataset.v; paint(); return; }
    if (a === 'rar') { st.rar = el.dataset.v; paint(); return; }
    if (a === 'fclear') { st.realm = lockRealm || ''; st.type = ''; st.rar = ''; paint(); return; }
    if (a === 'del') {
      const i = +el.dataset.i;
      if (st.team[i]) { st.team.splice(i, 1); paint(); sound.play('click'); }
      return;
    }
    if (a === 'add') {
      const slug = el.dataset.slug, i = st.team.indexOf(slug);
      if (i < 0 && taken().chars.has(slug)) { toast(`${data.bySlug[slug].zh} 已经在${SQUAD_ZH[taken().chars.get(slug)]}了，禁区五队不能重复`); sound.play('deny'); return; }
      if (i >= 0) st.team.splice(i, 1);
      else if (st.team.length < TEAM_SIZE) st.team.push(slug);
      else { toast('已经 4 人了，先移出一个'); sound.play('deny'); return; }
      sound.play('click'); paint(); return;
    }
    if (a === 'auto') {
      const pick = autoSquadSlugs(s, data, st.realm, powerOf, TEAM_SIZE, [...taken().chars.keys()]);
      if (!pick.length) { toast(`没有可用的${st.realm ? REALMS[st.realm].zh : ''}唤醒体`); return; }
      st.team = pick; sound.play('stamp'); paint(); return;
    }
    if (a === 'clear') { st.team = []; sound.play('deny'); paint(); return; }
    if (a === 'from-team') {
      st.team = [...s.team].filter((x) => s.roster[x] && !taken().chars.has(x) && (!st.realm || data.bySlug[x]?.realm === st.realm)).slice(0, TEAM_SIZE);
      sound.play('click'); paint(); return;
    }
    // ---- 独立配装 ----
    if (a === 'lo-on') { st.lo = copyMain(); sound.play('stamp'); paint(); return; }
    if (a === 'lo-off') { st.lo = null; sound.play('deny'); paint(); return; }
    if (a === 'lo-main') { st.lo = copyMain(); sound.play('click'); paint(); return; }
    if (a === 'lo-auto') {
      if (!st.team.length) { toast('先选人'); return; }
      const eqs = {};
      const r = fillLoadout(s, data, st.team, { equip: eqs, exclude: { items: taken().items, orders: taken().orders } });
      st.lo = { equip: eqs, relics: r.relics, orders: r.orders };
      sound.play('stamp'); paint(); return;
    }
    if (a === 'eq') {
      const { slug, kind } = el.dataset, f = kind === 'wheel' ? 'wheel' : 'cov';
      pickThenBack((done) => pickItem(app, kind, `${data.bySlug[slug].zh} · ${kind === 'wheel' ? '命轮' : '密契'}`, (uid) => done(() => {
        for (const o of Object.values(st.lo.equip)) if (uid && o[f] === uid) delete o[f];   // 同一套里一件装备只给一个人
        const e = (st.lo.equip[slug] ||= {});
        if (uid) e[f] = uid; else delete e[f];
      }), { exclude: taken().items, key: sqPickKey(kind) }));
      return;
    }
    if (a === 'relic') {
      const i = +el.dataset.i;
      pickThenBack((done) => pickItem(app, 'relic', '选择造物', (uid) => done(() => {
        st.lo.relics = st.lo.relics.map((x) => (x === uid ? null : x));
        st.lo.relics[i] = uid || null;
      }), { exclude: taken().items, key: sqPickKey('relic') }));
      return;
    }
    if (a === 'order') {
      const i = +el.dataset.i;
      pickThenBack((done) => pickOrder(app, i, (id) => done(() => { st.lo.orders[i] = id || null; }), st.lo.orders.concat([...taken().orders])));
      return;
    }
    if (a === 'save') {
      if (!st.team.length) { toast('先选人'); return; }
      // 属性塔：保存前再兜一声，把不合本界域的人剔掉（草稿可能来自界域锁定之前的旧状态）
      if (isTower) {
        const realm = realmOfMode(st.mode);
        const bad = st.team.filter((x) => data.bySlug[x]?.realm !== realm);
        if (bad.length) {
          st.team = st.team.filter((x) => data.bySlug[x]?.realm === realm);
          toast(`${bad.map((x) => data.bySlug[x]?.zh || x).join('、')} 不是${REALMS[realm].zh}界域，已剔除`, 2600);
        }
        if (!st.team.length) { paint(); return; }
      }
      const k = el.dataset.k;
      if (isRift) {
        const tk = riftTaken(s, k), dup = st.team.filter((x) => tk.chars.has(x));
        if (dup.length) { toast(`${dup.map((x) => data.bySlug[x].zh).join('、')} 已在别的禁区队里，五队不能重复`); sound.play('deny'); return; }
      }
      const saved = setSquadTeam(s, k, st.team);
      // st.lo 为空 = 这套编队不单独配装（关掉独立配装之后保存，要把旧的 lo 一起删掉，
      // 否则卡片还写着「独立配装」，实际配装却已经不打算用了）
      if (st.lo) squadsOf(s)[k].lo = normalizeLoadout(st.lo, saved, s.gear, s.orders);
      else if (squadsOf(s)[k].lo) delete squadsOf(s)[k].lo;
      if (st.mode && !isRift) setSquadPick(s, st.mode, k);
      app.ui.sqDraft = null;
      setSquadDraftCtx(null);
      app.save(); sound.play('stamp');
      toast(`已存入「${SQUAD_ZH[k]}」：${saved.length} 人${st.lo ? ' · 独立配装' : ''}${st.mode ? ` · ${isRift ? '融灾禁区第 ' + (RIFT_SQUAD_KEYS.indexOf(k) + 1) + ' 队' : isTower ? '只给 ' + modeZh + ' 用' : modeZh + ' 用它出战'}` : ''}`);
      closeModal();
      dropModalScroll(SQ_EDITOR_KEY);
      for (const k of ['wheel', 'cov', 'relic']) dropModalScroll(sqPickKey(k));
      app.render?.();
    }
  });
}


/* ---------- 新手提示卡：第一次进「队伍 / 唤醒体 / 召唤」页自动展开，关掉后标题旁留一个「💡 提示」可以再打开 ---------- */
const TIPS = {
  team: {
    t: '新手提示 · 怎么养成、怎么变强',
    d: `<ol><li><b>战力从哪来</b>：等级 → 突破 → 叠位，再加装备。先把金币花在主线 4 个人身上。</li>
      <li><b>升级</b>：到「唤醒体」页点角色进详情，点「升级」（花金币，挂机就能赚）。每到 20 级要<b>突破</b>（金币 + 银芯），突破后才能继续升。</li>
      <li><b>叠位</b>：重复抽到同一个角色自动 +1，也能在详情页花银芯「叠位」。每叠位全属性 +1.5%、等级上限 +1。</li>
      <li><b>装备</b>：每人 <b>1 件命轮 + 1 件密契</b>，造物栏 6 格（随通关解锁）全队共用，钥令 3 个。来源：推图掉落与 Boss 首通、召唤页的「装备祈愿」（金币）和银芯商店。</li>
      <li><b>懒人做法</b>：点下面的「一键配队」，队伍、装备、造物、钥令一次排好；换了装备或角色再点一次。</li>
      <li><b>站位</b>：1–2 号位是前排，3–4 号位是后排；同界域 3 人 +8%，4 人 +15%。</li></ol>`,
  },
  roster: {
    t: '新手提示 · 唤醒体页怎么用',
    d: `<ul><li><b>点任意角色</b>进详情：升级（金币）、突破（金币 + 银芯，每 20 级一次）、叠位（银芯）、装命轮 / 密契。<b>花错了也不怕</b>：详情里「回溯到 1 级」花 100 银芯，升级和突破的材料全部返还，叠位不变。</li>
      <li><b>灰色的是还没拿到的</b>：去「召唤」页用券或银芯抽；带「联名」角标的不进召唤池，到「更多 → 联动」用嘉宾征召券兑换。</li>
      <li>真正<b>上场的是「队伍」页的 4 个人</b>，这一页只负责养成。想先养谁：看战力、看同界域能不能凑 3 人。</li>
      <li>上面能按稀有度 / 战力 / 等级 / 叠位排序，再点一次反向；「仅已拥有」可以隐藏没拿到的。</li></ul>`,
  },
  summon: {
    t: '新手提示 · 怎么召唤、怎么兑换',
    d: `<ul><li><b>唤醒券</b>抽唤醒体：单抽 1 张、十连 10 张，十连至少 1 个史诗，<b>50 抽内必出创生</b>。券来自挂机掉落（越深的关越多）、关卡首通、签到、成就和各挑战奖励。</li>
      <li><b>银芯</b>也能抽：200 / 抽，十连 1900，和唤醒券<b>共用保底</b>。银芯来自首通、成就、签到、塔和周 Boss，分解装备也有。</li>
      <li><b>重复抽到 = 叠位 +1</b>（上限 99），所以抽到老角色不亏；满叠位折成金币和银芯。</li>
      <li><b>兑换</b>：本页下方的<b>银芯商店</b>可以用银芯换唤醒券、金币、装备、钥令匣和挑战次数（每日限购）；<b>装备祈愿</b>用金币抽命轮 / 密契 / 造物；联名嘉宾去「更多 → 联动」用征召券兑换。</li>
      <li>第一次玩？先去「更多 → 签到」领<b>注册福利</b>（银芯 1000 + 唤醒券 10），再回来十连。</li></ul>`,
  },
};
export function tipCard(app, key) {
  const t = TIPS[key], s = app.state;
  if (!t) return '';
  const seen = (s.tips || {})[key], open = !seen || app.ui?.tipOpen === key;
  if (!open) return '';
  return `<div class="tipcard" data-tip="${key}"><h4>💡 ${t.t}</h4>${t.d}<div class="tiprow"><button class="btn sm" data-act="tip-close" data-k="${key}">知道了</button></div></div>`;
}
const tipBtn = (app, key) => ((app.state.tips || {})[key] && app.ui?.tipOpen !== key
  ? `<button class="tipopen" data-act="tip-open" data-k="${key}">💡 提示</button>` : '');

export function teamPage(app) {
  const tab = teamTabOf(app);
  const info = TEAM_TABS.find(([k]) => k === tab);
  const t = teamDefs(app.state, app.data);
  const tabBar = `<div class="ttabs">${TEAM_TABS.map(([k, zh]) =>
    `<button class="ttab ${k === tab ? 'on' : ''}" data-act="team-tab" data-k="${k}">${zh}</button>`).join('')}</div>`;
  const panel = {
    main: mainPanel,
    tower: () => modeBlock(app, 'tower'),
    rt: rtPanel,
    weekly: () => modeBlock(app, 'weekly'),
    wboss: () => modeBlock(app, 'wboss'),
    trial: () => modeBlock(app, 'trial'),
    arena: () => modeBlock(app, 'arena'),
    luck: () => `${modeBlock(app, 'luck', '疾驰欢愉的大运')}<p class="hint">大运一趟三层，<b>开局时定下上阵的 4 人</b>，整趟不换。这里选的是下一趟出发用哪一队：「大运专用队」只给大运用，不动推图 / 塔 / 周 Boss 在用的那几套；也可以直接借通用一队~五队。出发前在大运主页也能改。</p>`,
    rift: riftPanel,
    squads: squadsPanel,
  }[tab];
  const head = tab === 'main'
    ? `<h2>队伍编成 <small>战力 ${fmt(t.power)}</small></h2>`
    : `<h2>${info[1]} <small>${info[2]}</small></h2>`;
  return `<div class="page">${head.replace('</h2>', `${tab === 'main' ? tipBtn(app, 'team') : ''}</h2>`)}${tab === 'main' ? tipCard(app, 'team') : ''}${tabBar}${panel(app)}</div>`;
}

/** 主线队伍：4 个槽位 + 命轮密契 + 造物 + 钥令 + 策略，一眼能看完，不用翻页 */
function mainPanel(app) {
  const { state: s, data } = app;
  const t = teamDefs(s, data);
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => s.team[i] || null);
  // 合唱光环：带了哪几位辅助，队伍就偏向哪条路（core/roles.js）
  const auraText = (t.aura && t.aura.roles.length)
    ? `；合唱光环 ${t.aura.roles.map((r) => `${r.zh}×${Math.min(2, r.n)}`).join(' + ')}`
    : '';
  const synText = t.synergy ? `同领域加成 +${Math.round(t.synergy * 100)}% 生命/攻击`
    : t.mixed ? `跨域共鸣 +${Math.round(t.mixed * 100)}% 生命/攻击`
      : '同领域 3 人 +8%、4 人 +15%；凑 3 / 4 个不同界域则改为跨域共鸣 +6% / +10%';
  const cards = slots.map((slug, i) => {
    const row = i < FRONT_SLOTS ? '前排' : '后排';
    if (!slug) return `<div class="slot empty" data-act="pick-slot" data-i="${i}">＋ 选择唤醒体<small class="pos ${i < FRONT_SLOTS ? 'front' : 'back'}">${row}</small></div>`;
    const a = data.bySlug[slug], d = t.list.find((x) => x.slug === slug), r = s.roster[slug];
    return `<div class="slot" style="--rc:${R(a).color}" data-act="pick-slot" data-i="${i}">
      <img src="${img(a.portrait)}" alt=""><div><b>${esc(a.zh)}</b><small class="typ">${R(a).zh} · ${TYPES[a.type].short}${a.type === 'CHORUS' ? `<em class="subtyp">${chorusRoleOf(a).zh}</em>` : ''}<span class="pos ${i < FRONT_SLOTS ? 'front' : 'back'}">${row}</span></small>
      <small>Lv${r.lv}/${levelCap(r.star)} · ${awk(r.star)}</small><small>战力 ${fmt(d.power)}</small></div>
      <button class="btn sm" data-act="detail" data-slug="${slug}">详情</button></div>`;
  }).join('');

  const n = relicSlotCount(s.maxStage);
  const relics = Array.from({ length: RELIC_SLOTS }, (_, i) => {
    if (i >= n) {
      const need = RELIC_UNLOCK[i - RELIC_BASE_SLOTS];
      return `<div class="relic-slot locked">🔒 第 ${i + 1} 格<br><small>最高通关 ${need} 关解锁</small></div>`;
    }
    const uid = s.gear.relics[i], it = uid && s.gear.items[uid];
    if (!it) return `<div class="relic-slot empty" data-act="pick-relic" data-i="${i}">＋ 造物 ${i + 1}</div>`;
    const def = itemDef(app, it);
    const rf = it.rf || 0;
    // 精炼到底给多少：直接写成「精炼+n 已含 +x」，不用玩家自己算 8%
    const gain = relicRefineGain(def, it.lv, rf);
    const unit = relicTheme(def.id).key.startsWith('open') ? '点' : '%';
    const rfTag = rf ? `<em class="rf">精炼+${rf} 已含 +${gain.toFixed(1)}${unit}</em>` : '';
    return `<div class="relic-slot ${rarCls(def.rarity)}" data-act="pick-relic" data-i="${i}" title="${esc(itemText(app, it))}">
      <img src="${img(def.img)}" alt="">
      <small><b>${esc(def.zh)}</b><br>${esc(itemText(app, it))}<br>Lv${it.lv}${rf ? ` · 精炼+${rf}` : ''}</small>
      ${rfTag}
      <button class="btn sm rfbtn" data-act="relic-detail" data-uid="${it.uid}">详情</button></div>`;
  }).join('');

  const ultNow = s.strategy.ult || 'first';
  const ultBtns = Object.entries(ULT_MODES).map(([k, m]) => `<button class="btn sm ${ultNow === k ? 'on' : ''}" data-act="ult-mode" data-k="${k}" title="${esc(m.desc)}">${m.zh}</button>`).join('');
  // 自定义大招顺序：只有选了「按顺序开大」才展开。↑ 提前、↓ 后移，队外的人不会出现在这里。
  const orderList = normalizeUltOrder(s);
  const orderRows = ultNow !== 'order' ? '' : `<div class="ultorder">${orderList.map((slug, i) => {
    const a0 = data.bySlug[slug];
    if (!a0) return '';
    return `<div class="uo-row"><b>${i + 1}</b><img src="${img(a0.portrait)}" alt=""><span>${esc(a0.zh)}<small>${TYPES[a0.type].short}</small></span>
      <button class="btn xs" data-act="ult-order" data-slug="${slug}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="提前一位">↑</button>
      <button class="btn xs" data-act="ult-order" data-slug="${slug}" data-dir="1" ${i === orderList.length - 1 ? 'disabled' : ''} title="后移一位">↓</button></div>`;
  }).join('')}</div>`;
  const pre = Object.entries(PRESETS).map(([k, p]) => `<button class="btn sm ${s.strategy.preset === k ? 'on' : ''}" data-act="preset" data-k="${k}">${p.zh}</button>`).join('');
  // 高级设置 · 自动行动顺序：改的是「谁先动手」，和站位解耦（站位减伤 / 刺客越前排都还按原位算）
  const actList = normalizeOrder(s);
  const actCustom = orderIsCustom(s);
  const actRows = actList.map((slug, i) => {
    const a0 = data.bySlug[slug];
    if (!a0) return '';
    const tag = i === 0 ? '先手' : i === actList.length - 1 ? '压轴' : '';
    return `<div class="uo-row"><b>${i + 1}</b><img src="${img(a0.portrait)}" alt=""><span>${esc(a0.zh)}<small>${TYPES[a0.type].short}${tag ? ` · ${tag}` : ''}</small></span>
      <button class="btn xs" data-act="order-move" data-slug="${slug}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="提前一位">↑</button>
      <button class="btn xs" data-act="order-move" data-slug="${slug}" data-dir="1" ${i === actList.length - 1 ? 'disabled' : ''} title="后移一位">↓</button></div>`;
  }).join('');
  const on = orderSlotCount(s.maxStage);
  const ochips = Array.from({ length: ORDER_SLOTS }, (_, i) => {
    if (i >= on) return `<span class="ochip locked">🔒 最高通关 ${orderLockedHint(i, s.maxStage)} 关</span>`;
    const id = s.orders.slots[i], def = id && data.orderById[id];
    return def ? `<span class="ochip on" title="${esc(orderText(def, s.orders.owned[id]))}">${oglyph(def)} ${esc(def.zh)}<em>Lv${s.orders.owned[id]}</em></span>` : `<span class="ochip">空位 ${i + 1}</span>`;
  }).join('');

  return `<p class="hint">${synText}${auraText}。站位 1–2 是<b>前排</b>、3–4 是<b>后排</b>：敌人的单体攻击只会打前排，前排全灭才轮到后排（Boss 例外，可以越过前排）；我方守护也只能打敌阵前排，突击与合唱（远程）可以直接点名后排。每场还有<b>回合上限</b>（${ROUND_LIMIT.normal === ROUND_LIMIT.boss ? `统一 ${ROUND_LIMIT.normal} 回合` : `普通关 ${ROUND_LIMIT.normal} 回合、Boss 关 ${ROUND_LIMIT.boss} 回合`}），打不完算超时判负，四奶互相吊着磨是过不去的。</p>
    <div class="slots">${cards}</div>
    <div class="row"><button class="btn gold" data-act="autoteam">一键配队</button><button class="btn sm" data-act="guide-growth">养成指南</button></div>
    <p class="hint">「一键配队」会一起排好：4 人队伍（含同界域加成）、<b>每人 1 件命轮 + 1 件密契</b>、已解锁格里的造物（优先凑羁绊）、3 个钥令位。下面三块就是给它填的地方，格子都能直接点开换。</p>
    <h3>唤醒体羁绊 <small>同队凑齐特定组合 · 全队被动</small></h3>
    ${bondStrip(app, slots.filter(Boolean))}
    ${bondBook(app)}
    <h3>命轮 · 密契 <small>每人各 1 件 · 点格子直接换</small></h3>
    <div class="eqpanel">${equipPanel(app)}</div>
    <p class="hint">命轮与密契<b>绑在单个唤醒体身上</b>；密契全队同款凑到 2 / 4 件触发套装（当前：${covenantSetText(app) || '还没有凑成套'}）。</p>
    <h3>造物 <small>全队被动 · ${n}/${RELIC_SLOTS} 格</small></h3>
    <div class="relic-row">${relics}</div>
    <h4>造物羁绊 <small class="dim">同主题 2 / 4 / 6 件</small></h4>
    ${bondPanel(app)}
    <h3>钥令 <small>全队 3 位 · 已开 ${on}/${ORDER_SLOTS}</small></h3>
    <div class="orderbar">${ochips}</div>
    <div class="row"><button class="btn sm" data-act="go-orders">配置钥令 →</button></div>
    <h3>战斗策略 <small>全自动，仅可设定倾向</small></h3>
    <div class="row">${pre}</div>
    <p class="hint">${PRESETS[s.strategy.preset]?.zh || ''}：血量低于 ${Math.round(s.strategy.defend * 100)}% 时优先架势；目标选择：${{ low: '血量最低', first: '前排优先', atk: '攻击最高' }[s.strategy.target]}。</p>
    <h4>大招 <small class="dim">什么时候开大</small></h4>
    <div class="row">${ultBtns}</div>${orderRows}
    <p class="hint"><b>${ULT_MODES[ultNow].zh}</b>：${ULT_MODES[ultNow].desc}</p>
    <h3>高级设置 <small>进阶 · 不动也能正常打</small></h3>
    <details class="advbox" ${actCustom ? 'open' : ''}>
      <summary>自动行动顺序 <small class="dim">谁先动手</small>${actCustom ? '<em class="new">已自定义</em>' : ''}</summary>
      <p class="hint">默认按<b>站位 1→4</b> 出手。先手适合上增益 / 上盾 / 下毒 / 降防，让后手吃现成的增益去打爆发；<b>毒与流血在中招者自己行动后</b>才跳伤，所以顺序也会改变第一跳毒的时机（先手先手的人，毒跳得也早）。<br>
        这里只改出手先后，<b>不动站位</b>：前排照样吃单体、守护照样只能打敌阵前排、刺客照样能越前排。四人全自动，这一项纯粹是给想再抠一点输出的玩法。</p>
      <div class="ultorder">${actRows}</div>
      <div class="row"><button class="btn sm" data-act="order-reset" ${actCustom ? '' : 'disabled'}>恢复默认（按站位）</button></div>
    </details>`;
}

export function pickAwakener(app, title, onPick, exclude = []) {
  const { state: s, data } = app;
  const tv = teamView(s, data);
  const list = Object.keys(s.roster).filter((x) => !exclude.includes(x)).map((x) => ({ x, p: tv(x)?.power || 0 })).sort((a, b) => b.p - a.p);
  const html = `<h3>${title}</h3><div class="grid mini">${list.map(({ x, p }) => { const a = data.bySlug[x]; const r = s.roster[x]; return `<div class="tile" style="--rc:${R(a).color}" data-pick="${x}"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${r.lv} ${awk(r.star)}</small><small>${fmt(p)}</small></div>`; }).join('')}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { closeModal(); onPick(t.dataset.pick); } });
}

export function pickItem(app, kind, title, onPick, { allowNone = true, exclude = null, key = '' } = {}) {
  let affix = '';     // 这个弹窗自己的词条筛选（关掉就忘，不污染下一页）
  let opened = false; // 第一次打开时别把「上一层弹窗」的滚动位置当成自己的
  const render = () => {
    // 切词条筛选也要停在同一处，不然刚拉到下半截一筛就跳回顶部
    const prev = opened ? modalEl()?.querySelector('.modal-body') : null, y = prev ? prev.scrollTop : 0;
    opened = true;
    const all = Object.values(app.state.gear.items)
      .filter((i) => i.kind === kind && !(exclude && exclude.has(i.uid)))
      .sort((a, b) => (RARITY_ORDER[itemDef(app, b).rarity || 'SR'] - RARITY_ORDER[itemDef(app, a).rarity || 'SR']) || b.lv - a.lv);
    const items = affix ? all.filter((i) => itemAffix(app, i).key === affix) : all;
    const rows = items.map((i) => itemCard(app, i, `<button class="btn sm" data-pick="${i.uid}">选择</button>`)).join('');
    const html = `<h3>${title} <small class="dim">${items.length}${affix ? ` / ${all.length}` : ''} 件</small></h3>
      ${allowNone ? '<button class="btn sm" data-pick="">卸下</button>' : ''}
      ${affixBar(app, kind, affix)}
      <div class="list">${rows || `<p class="hint">${affix ? '这个词条下没有可用的装备了。' : '没有可用的装备，去推图或祈愿获取。'}</p>`}</div>`;
    const m = openModal(html, 'wide', key);
    if (y) { const sc = m.querySelector('.modal-body'); if (sc) sc.scrollTop = y; }
    m.addEventListener('click', (e) => {
      const af = e.target.closest('[data-affix]');
      if (af) { affix = af.dataset.affix === affix ? '' : af.dataset.affix; render(); return; }
      const t = e.target.closest('[data-pick]');
      if (t) { closeModal(); onPick(t.dataset.pick); }
    });
  };
  render();
}

export function pickOrder(app, i, onPick, slots = null) {
  const { state: s, data } = app;
  slots = slots || s.orders.slots;
  const owned = Object.keys(s.orders.owned).map((id) => data.orderById[id]).filter(Boolean);
  const html = `<h3>第 ${i + 1} 个钥令位</h3><button class="btn sm" data-pick="">清空</button>
    <div class="list">${owned.map((def) => {
      const lv = s.orders.owned[def.id], used = slots.some((x, j) => x === def.id && j !== i);
      return `<div class="item ${rarCls(def.rarity)}">${oglyph(def)}<div class="i-body"><b>${esc(def.zh)}</b>${otag(def)} <em>Lv${lv}</em><small>${esc(orderText(def, lv))}</small>${used ? '<small class="who">已装在别的位置</small>' : ''}</div><button class="btn sm" data-pick="${def.id}" ${used ? 'disabled' : ''}>选择</button></div>`;
    }).join('') || '<p class="hint">还没有钥令。Boss 首通、无限塔每 10 层、周 Boss 里程碑、银芯商店都会给。</p>'}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t && !t.disabled) { closeModal(); onPick(t.dataset.pick); } });
}

/* ----------------------------- ROSTER ----------------------------- */
export function rosterPage(app) {
  const { state: s, data } = app;
  const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false, sort: 'rarity', dir: -1 });
  const idxOf = Object.fromEntries(Object.keys(s.roster).map((x, i) => [x, i]));
  const tv = teamView(s, data);
  const rows = data.awakeners
    .filter((a) => (!f.realm || a.realm === f.realm) && (!f.type || a.type === f.type) && (!f.owned || s.roster[a.slug]))
    .map((a) => ({ a, r: s.roster[a.slug], idx: idxOf[a.slug], power: s.roster[a.slug] ? (tv(a.slug)?.power || 0) : 0 }));
  const list = sortRoster(rows, f.sort, f.dir);
  const opt = (obj, cur, k) => `<select data-filter="${k}"><option value="">全部</option>${Object.entries(obj).map(([v, o]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${o.zh}</option>`).join('')}</select>`;
  const sorts = ROSTER_SORTS.map(([k, zh]) => `<button class="btn sm ${f.sort === k ? 'on' : ''}" data-act="roster-sort" data-k="${k}">${zh}${f.sort === k ? (f.dir < 0 ? ' ↓' : ' ↑') : ''}</button>`).join('');
  return `<div class="page"><h2>唤醒体 <small>${Object.keys(s.roster).length}/${data.awakeners.length}</small>${rwCount(s) ? `<span class="tag rwtag" title="免费回溯券：角色与装备回溯各用一张，不花银芯">回溯券 ×${rwCount(s)}</span>` : ''}${tipBtn(app, 'roster')}</h2>${tipCard(app, 'roster')}
    <div class="row filters"><span class="dim">界域</span>${opt(REALMS, f.realm, 'realm')}<span class="dim">类型</span>${opt(TYPES, f.type, 'type')}<label><input type="checkbox" data-filter="owned" ${f.owned ? 'checked' : ''}> 仅已拥有</label></div>
    <div class="row sortbar"><span class="dim">排序</span>${sorts}</div>
    <div class="grid">${list.map(({ a, r, power: p }) => {
    // 编队角标：在主线队伍里就标「上阵」，只在编队里就标编队名；同时编进几套时后面跟「+N」
    const sq = r ? squadsOfSlug(s, a.slug) : [];
    const mark = sq.length ? `<i class="tmark${sq[0] === 'cur' ? ' on' : ''}" title="${esc(`已编入：${sq.map(squadKeyZh).join('、')}`)}">${sq[0] === 'cur' ? '上阵' : esc(squadKeyZh(sq[0]))}${sq.length > 1 ? `+${sq.length - 1}` : ''}</i>` : '';
    return `<div class="tile ${r ? '' : 'locked'} ${rarCls(a.rarity)} ${a.creator ? 'gift' : ''}" style="--rc:${R(a).color}" data-act="detail" data-slug="${a.slug}">
      <img src="${img(a.portrait)}" alt="" loading="lazy">${mark}<b>${esc(a.zh)}</b><small>${r ? `Lv${r.lv} · 叠位 ${r.star} · ${TYPES[a.type].short}` : a.creator ? '未获得 · 联名赠送' : `未获得 · ${TYPES[a.type].short}`}</small><small>${r ? `战力 ${fmt(p)}` : REALMS[a.realm].zh}</small>${a.creator ? '<i class="gmark">联名</i>' : ''}</div>`;
  }).join('')}</div>
    <p class="hint">排序：稀有度 / 战力 / 等级 / 叠位数 / 获取顺序 / 界域，再点一次当前排序可以反过来。未获得的永远排在后面，筛选里的「仅已拥有」可以只看已有。<b>头像左上角的角标是编队情况</b>：「上阵」= 主线当前队伍，「一队 / 禁区三队…」= 只写在某套编队里（同时编进几套会跟「+N」，鼠标停上去能看到全部）。<b>带「联名」角标的是社区主播彩蛋</b>，不参与召唤，只从「更多 → 联动」的签到与活动里赠送。</p></div>`;
}

const NUM_ZH = { dmg: '伤害', shield: '护盾', gauge: '狂气' };
const numLine = (sk) => {
  const n = sk.real?.nums, c = sk.real?.cur;
  if (!n || !Object.keys(n).length) return '';
  const part = (k) => `${NUM_ZH[k]} ${n[k][0] === n[k][1] ? n[k][0] : `${n[k][0]}–${n[k][1]}`}${k === 'gauge' ? '' : '%'} → <b>${c[k]}${k === 'gauge' ? '' : '%'}</b>`;
  return `<small class="nums">原作数值（Lv.1–5 → 当前）：${Object.keys(n).map(part).join('　')}</small>`;
};

/* 专属技能：满超限（Lv 99）解锁「超限技」，满最终法则（Lv 99）解锁「终焉技」——每位唤醒体各自一套 */
function extraBox(a, slug, r) {
  const ex = extraSkills(slug, a);
  const row = (k, title, need, ok) => `<div class="skill extra-skill ${ok ? '' : 'locked'}"><b class="sk ${k}">${SLOT_ZH[k]}</b> <em>${esc(ex[k].name)}</em>
    <small>${ok ? '已解锁' : need} · 每行动 ${ex[k].every} 次后免费追加一次</small><small>本作效果：${esc(ex[k].text)}</small></div>`;
  const od = r && overdrive(r.od) >= EXTRA_OD_AT, lw = r && law(r.law) >= EXTRA_LAW_AT;
  return `<h4>专属技能 <small class="dim">满超限 / 满最终法则解锁</small></h4><div class="skills">
    ${row('Od', '超限技', `超限练到 ${EXTRA_OD_AT} 级解锁（现在 ${r ? overdrive(r.od) : 0}）`, od)}
    ${row('Law', '终焉技', `最终法则练到 ${EXTRA_LAW_AT} 级解锁（现在 ${r ? law(r.law) : 0}）`, lw)}</div>`;
}

/* 超限：叠满 99 之后的成长（上限 99），之后接最终法则 */
function odBox(s, r, slug) {
  const od = overdrive(r.od), c = overdriveCost(od);
  const full = od >= OVERDRIVE_MAX;
  const can = !full && s.gold >= c.gold && s.cores >= c.cores;
  const ic = '<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">';
  return `<div class="odbox"><h4>超限 <small class="dim">叠满 ${MAX_AWAKEN} 后解锁 · ${od} / ${OVERDRIVE_MAX}</small></h4>
    <div class="growbox">
      <div><span>当前超限</span><b>Lv ${od}</b><em>全属性 +${overdriveStatPct(od)}% · 增伤 +${overdriveAmp(od)}%</em></div>
      <div><span>每 1 级</span><b>生命 / 攻击 / 防御 +${OVERDRIVE_STAT_PER}%</b><em>每 ${OVERDRIVE_AMP_EVERY} 级增伤 +${OVERDRIVE_AMP_PER}%</em></div>
      ${full ? '<div><span>已练满</span><b>超限 99 / 99</b><em>继续往下是「最终法则」</em></div>' : `<div><span>下一级</span><b>🪙${fmt(c.gold)} ${ic}${c.cores}</b><em>每级金币 ×1.1</em></div>`}
    </div>
    ${full ? '' : `<div class="row"><button class="btn gold sm" data-act="od" data-slug="${slug}" ${can ? '' : 'disabled'}>超限 +1</button>
      <button class="btn sm" data-act="od" data-slug="${slug}" data-n="10" ${can ? '' : 'disabled'} title="连续超限，直到金币或银芯不够，最多 10 级">超限 ×10</button></div>`}
    <p class="hint">叠满之后再<b>抽到这位</b>，只折算 <b>800 金币 + 30 银芯</b>，不送超限 / 最终法则——这两条要自己花金币和银芯练。</p>
    ${full ? lawBox(s, r, slug) : ''}</div>`;
}

/* 最终法则：超限满 99 之后真正没有上限的成长 */
function lawBox(s, r, slug) {
  const n = law(r.law), c = lawCost(n);
  const can = s.gold >= c.gold && s.cores >= c.cores;
  const ic = '<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">';
  return `<h4>最终法则 <small class="dim">超限满 ${OVERDRIVE_MAX} 后解锁 · 无上限</small></h4>
    <div class="growbox">
      <div><span>当前法则</span><b>Lv ${n}</b><em>属性 +${lawStatPct(n)}% · 增伤 +${lawAmp(n)}% · 暴伤 +${lawCrit(n)}%</em></div>
      <div><span>每 1 级</span><b>生命 / 攻击 / 防御 +${LAW_STAT_PER}%</b><em>独立乘区，叠在超限之上</em></div>
      <div><span>每 ${LAW_AMP_EVERY} / ${LAW_CRIT_EVERY} 级</span><b>增伤 +${LAW_AMP_PER}% / 暴击伤害 +${LAW_CRIT_PER}%</b><em></em></div>
      <div><span>下一级</span><b>🪙${fmt(c.gold)} ${ic}${c.cores}</b><em>每级金币 ×1.12</em></div>
    </div>
    <div class="row"><button class="btn gold sm" data-act="law" data-slug="${slug}" ${can ? '' : 'disabled'}>最终法则 +1</button>
      <button class="btn sm" data-act="law" data-slug="${slug}" data-n="10" ${can ? '' : 'disabled'} title="连续升级，直到金币或银芯不够，最多 10 级">×10</button></div>`;
}

/* 叠位效果表：把「每 1 / 每 10 / 每 40」三条规则摊开，玩家一眼能算清投入产出 */
function awakenTable(r) {
  const st = r.star, cap = levelCap(st), amp = awakenAmp(st), sk = awakenSkill(st);
  const nxt = nextAwakenMilestone(st);
  const row = (a, b, c = '') => `<div><span>${a}</span><b>${b}</b>${c ? `<em>${c}</em>` : ''}</div>`;
  return `<div class="growbox">
    ${row('每 1 叠位', `全属性 +${AWAKEN_STAT_PER}%`, `当前 +${Math.round(st * AWAKEN_STAT_PER * 10) / 10}%`)}
    ${row('每 1 叠位', '等级上限 +1', `当前 ${cap} 级`)}
    ${row(`每 ${AWAKEN_AMP_EVERY} 叠位`, `增伤 +${AWAKEN_AMP_PER}%`, `当前 +${amp}%`)}
    ${row(`每 ${AWAKEN_SKILL_EVERY} 叠位`, '技能等级 +1（上限 Lv.5）', `当前技能 Lv.${skillLevel(r.lv, st) + 1}`)}
    ${st < MAX_AWAKEN ? row('再叠', `+${nxt.amp} 层 → 增伤 +${AWAKEN_AMP_PER}%${nxt.skill ? `；+${nxt.skill} 层 → 技能 +1` : ''}`, '') : row('已达上限', `${MAX_AWAKEN} 叠位`, '')}
  </div>`;
}

export function detailModal(app, slug) {
  const { state: s, data } = app;
  const a = data.bySlug[slug], r = s.roster[slug];
  const sq = r ? squadsOfSlug(s, slug) : [];   // 编队情况：'cur' = 主线队伍，其余是编队位
  // 在主线队伍里就按整队口径算（密契套装 / 同域加成 / 羁绊），否则按单人算。
  // 不这么写的话，凑了 4 件密契的人在详情页会比实战里少一截属性。
  const inMain = (s.team || []).includes(slug);
  const view = r ? teamView(s, data)(slug) : null;
  const preview = r || { lv: 1, star: 0, brk: 0 };
  const st = view || (() => { const ghost = { ...s, roster: { ...s.roster, [slug]: preview } }; return teamView(ghost, data)(slug) || allyDef(ghost, data, slug, [slug]); })();
  const lvl = skillLevel(preview.lv, preview.star), kit = data.kit(slug, lvl);
  const eq = s.gear.equip[slug] || {};
  const slotBox = (key, kind, label) => { const it = eq[key] && s.gear.items[eq[key]]; const def = it && itemDef(app, it); return `<div class="eqslot" data-act="equip-slot" data-slug="${slug}" data-kind="${kind}">${def ? `<img src="${img(def.img)}" alt=""><span><b>${esc(def.zh)}</b> Lv${it.lv}<br><small>${esc(itemText(app, it))}</small></span>` : `<span class="empty">＋ ${label}</span>`}</div>`; };

  const cap = r ? levelCap(r.star) : MAX_LV;
  const needBrk = r && r.lv < cap && breakNeeded(r.lv, r.brk);
  const cost = r && r.lv < cap && !needBrk ? lvUpCost(r.lv) : 0;
  const brkCost = needBrk ? breakCost(r.lv) : null;
  const awkCost = r && r.star < MAX_AWAKEN ? awakenCost(r.buy) : 0;
  const g = growthPerLevel(a, preview.star, preview.od, preview.law);
  const perBattle = Math.round(stageGold(Math.max(1, s.maxStage)) * (1 + (view?.goldBonus || 0) / 100));

  const growBtns = r ? `<div class="row">
      <button class="btn" data-act="lvup" data-slug="${slug}" data-n="1" ${cost && s.gold >= cost ? '' : 'disabled'}>升级 (${fmt(cost)})</button>
      <button class="btn" data-act="lvup" data-slug="${slug}" data-n="10" ${cost && s.gold >= cost ? '' : 'disabled'}>×10</button>
      <button class="btn" data-act="lvmax" data-slug="${slug}" ${cost ? '' : 'disabled'}>升至最高</button>
      ${needBrk ? `<button class="btn gold" data-act="brk" data-slug="${slug}" ${s.gold >= brkCost.gold && s.cores >= brkCost.cores ? '' : 'disabled'}>突破 Lv${r.lv}→${r.lv + 1}（🪙${fmt(brkCost.gold)} <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${brkCost.cores}）</button>` : ''}
    </div>
    ${r.lv > 1 ? `<div class="row rewind"><button class="btn" data-act="rewind" data-slug="${slug}" ${rwCount(s) || s.cores >= REWIND_COST ? '' : 'disabled'}>${rwCount(s) ? `用回溯券回溯到 1 级（剩 ${rwCount(s)} 张）` : `回溯到 1 级（<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${REWIND_COST}）`}</button>
      <span class="dim">返还 🪙${fmt(rewindPlan(r).refund)}${rewindPlan(r).refundCores ? ` + <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${rewindPlan(r).refundCores}` : ''}</span></div>
    <p class="hint">${rwCount(s) ? `有 <b>${rwCount(s)} 张免费回溯券</b>，这次回溯不花银芯` : `花 ${REWIND_COST} 银芯`}，直接把等级倒回 1 级，当初升级和突破花的金币、银芯<b>全部返还</b>；<b>叠位、等级上限不变</b>。想把等级让给别的唤醒体时用。</p>` : ''}` : '';

  const html = `<div class="detail" style="--rc:${R(a).color}">
    <div class="d-art"><img src="${img(a.card)}" alt="${esc(a.zh)}立绘" data-act="zoom" data-slug="${slug}" loading="lazy"><span class="zoomhint">${a.creator ? '点开看大图' : '点立绘看大图'}</span></div>
    <div class="d-body"><h3>${esc(a.zh)} <small>${esc(a.en)}</small></h3>
      <div class="tags"><span class="tag" style="background:${R(a).color}">${R(a).zh}</span><span class="tag">${TYPES[a.type].zh}</span>${roleChipOf(a) ? `<span class="tag roletag" style="--rc2:${roleChipOf(a).color}">${roleChipOf(a).zh}</span>` : ''}<span class="tag ${rarCls(a.rarity)}">${a.rarity === 'Genesis' ? '创生' : a.rarity}</span>${a.creator ? `<span class="tag ctag">${esc(a.creator.emoji)} 联名嘉宾</span>` : ''}</div>
      ${r ? `<div class="sqtags"><span class="dim">编队</span>${sq.length
        ? sq.map((k) => `<span class="tag sqtag${k === 'cur' ? ' on' : ''}">${squadKeyZh(k)}</span>`).join('')
        : '<span class="tag sqtag none">未编入任何队伍</span>'}</div>` : ''}
      ${(() => {
        const bs = bondsOf(slug, data);
        if (!bs.length) return '';
        const inTeam = new Set(teamBonds((s.team || []).filter(Boolean), data).active.map((x) => x.id));
        return `<div class="sqtags"><span class="dim">羁绊</span>${bs.map((b) => `<span class="tag bdtag${inTeam.has(b.id) ? ' on' : ''}" title="${esc(b.desc)}">${esc(b.zh)}<small>${esc(bondHint(b, data.bySlug))}</small></span>`).join('')}</div>`;
      })()}
      ${a.creator ? `<div class="cbox"><small class="clabel">B 站签名</small><b>${a.creator.bio ? esc(a.creator.bio) : '（这位主播没有填写签名）'}</b>
        ${a.creator.channel ? `<div class="crow"><span>频道</span><em>${esc(a.creator.channel)}</em></div>` : ''}
        ${a.creator.nick ? `<div class="crow"><span>外号</span><em>${esc(a.creator.nick)}</em></div>` : ''}
        <div class="crow"><span>B 站首页</span><a href="${esc(a.creator.url)}" target="_blank" rel="noopener" title="打开 ${esc(a.creator.zh)} 的 B 站个人空间">${esc(a.creator.url.replace(/^https?:\/\//, ''))}</a></div>
        <small>UID ${esc(a.creator.uid)} · 只送不抽（签到 / 活动）</small>
        <small class="dim">技能按昵称里的意象原创，非本人设定，也不代表本人观点。</small></div>` : ''}
      ${r ? `<div class="lv">Lv <b>${r.lv}</b>/${cap}　<span class="awaken">${awk(r.star)}/${MAX_AWAKEN}</span>${r.brk ? `　已突破 ${r.brk} 次` : ''}</div>` : `<div class="lv dim">尚未获得 · ${a.creator ? '签到 / 活动赠送' : '通过召唤获取'}</div>`}
      <div class="stats"><span>生命 <b>${fmt(st.hp)}</b></span><span>攻击 <b>${fmt(st.atk)}</b></span><span>防御 <b>${fmt(st.def)}</b></span><span>暴击 <b>${st.critRate.toFixed(1)}%</b></span><span>爆伤 <b>${st.critDmg.toFixed(0)}%</b></span><span>增伤 <b>${st.amp.toFixed(0)}%</b></span><span>战力 <b>${fmt(power(st))}</b></span>${st.openAli ? `<span>起始共鸣 <b>${Math.round(st.openAli)}</b></span>` : ''}${st.openKey ? `<span>起始钥焰 <b>${Math.round(st.openKey)}</b></span>` : ''}</div>
      <p class="hint">${inMain ? '上面的数值按<b>当前队伍</b>算：已含密契套装、同界域加成与唤醒体羁绊，和实战、队伍页里的战力一致。' : '这个人不在当前队伍里，数值按<b>单人</b>算；密契套装、同域加成与羁绊要等上阵后才会体现在实战里。'}</p>
      <p class="hint">每级成长：生命 +${g.hp}　攻击 +${g.atk}　防御 +${g.def}（已含叠位加成）。技能等级 Lv.${lvl + 1}/5。</p>
      ${growBtns}
      ${r ? `<div class="row"><button class="btn sm" data-act="awaken" data-slug="${slug}" ${awkCost && s.cores >= awkCost ? '' : 'disabled'} title="重复抽取同一唤醒体也能 +1 叠位">叠位 +1（<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${awkCost || '满'}）</button>
        ${awkCost ? `<button class="btn sm" data-act="awaken" data-slug="${slug}" data-n="10" ${s.cores >= awkCost ? '' : 'disabled'} title="连续叠位，直到银芯不够或叠满，最多 10 次">叠位 ×10</button>` : ''}
        <button class="btn sm" data-act="guide-growth">升级材料从哪来？</button></div>
      ${r.star >= MAX_AWAKEN ? odBox(s, r, slug) : ''}` : ''}
      <h4>叠位效果 <small class="dim">${awk(r?.star || 0)} / ${MAX_AWAKEN}</small></h4>
      ${awakenTable(preview)}
      ${r ? `<div class="eqrow">${slotBox('wheel', 'wheel', '命轮')}${slotBox('cov', 'covenant', '密契')}</div>` : ''}
      ${(() => {
        const chip = roleChipOf(a);
        if (!chip) return '';
        return `<h4>定位特性 <small class="dim">${a.type === 'CHORUS' ? '合唱的子定位，决定技能构成' : '常驻，无需触发'}</small></h4>
        <div class="traitbox rolebox" style="--rc2:${chip.color}"><b>${esc(chip.zh)}</b><p>${esc(chip.desc)}</p>
          ${chip.aura ? `<p class="dim">队伍光环：${esc(chip.aura)}（同队同类最多叠 2 人）</p>` : ''}</div>`;
      })()}
      ${a.trait ? `<h4>特性 <small class="dim">常驻，无需触发</small></h4>
        <div class="traitbox"><b>${esc(a.trait.zh)}</b><p>${esc(a.trait.desc)}</p></div>` : ''}
      <h4>技能 <small class="dim">技能等级 Lv.${lvl + 1}/5（每 15 级 +1，每 ${AWAKEN_SKILL_EVERY} 叠位 +1）</small></h4><div class="skills">${SLOTS.map((k) => `<div class="skill"><b class="sk ${k}">${SLOT_ZH[k]}</b> <em>${esc(kit[k].name)}</em>${k === 'Rouse' ? '<small class="dim">登场即生效，不占回合</small>' : ''}${kit[k].real?.e ? ` <small class="en">${esc(kit[k].real.e)}</small>` : ''}<small>本作效果：${esc(describeSkill(kit[k]))}</small>${numLine(kit[k])}${kit[k].real ? `<details><summary>原作技能文本（译）</summary><p class="real">${markup(kit[k].real.d, data.kw)}</p></details>` : ''}</div>`).join('')}</div>
      ${affinityCard(app, slug)}
      ${extraBox(a, slug, r)}
      ${a.rk_en?.length ? `<details class="en-box"><summary>启灵（原作文本，仅供参考）</summary>${a.rk_en.map((x) => `<div class="skill"><b>${esc(x.ty)}</b> <em>${esc(x.n)}</em><p class="real">${markup(x.d, data.kw)}</p></div>`).join('')}</details>` : ''}
      <div class="matsrc">
        <b>升级材料一览</b>
        <div><span>经验 = 金币</span><em>当前第 ${s.maxStage || 1} 关挂机约 ${fmt(perBattle)} 金币/场，每小时约 ${fmt(Math.round(perBattle * BATTLES_PER_HOUR))}；另有首通、周 Boss、无限塔、分解装备。</em></div>
        <div><span>突破（每 ${LEVEL_GATE} 级）</span><em>金币 + 银芯。银芯来自 Boss 首通、成就、签到、周 Boss、属性塔、竞技场、分解装备（每天最多 40 枚基础银芯）。</em></div>
        <div><span>叠位（上限 ${MAX_AWAKEN}）</span><em>抽到重复唤醒体 +1；也可用银芯共鸣（成本 ${awakenCost(r?.buy || 0)}，银芯每叠一层 +5，和抽卡先后无关）。</em></div>
      </div>
    </div></div>`;
  openModal(html, 'wide', 'detail:' + slug);
}

/* 养成指南：把「练谁、怎么练、材料在哪」写成一张可查的表 */
export function growthGuideModal(app) {
  const s = app.state;
  const cap = s.maxStage || 1;
  const perBattle = Math.round(stageGold(cap));
  const html = `<h3>养成指南</h3>
    <p class="hint">三条主线：<b>等级</b>（金币）→ <b>突破</b>（金币 + 银芯，每 ${LEVEL_GATE} 级一次）→ <b>叠位</b>（重复抽取 / 银芯，上限 ${MAX_AWAKEN}）。等级上限完全由叠位决定：0 叠位 ${MAX_LV} 级，${MAX_AWAKEN} 叠位 ${MAX_LV_HARD} 级。</p>
    <div class="growtable">
      <div class="gt-h"><span>做什么</span><span>花什么</span><span>上限</span><span>主要来源</span></div>
      <div><span>升级</span><span>金币，${fmt(lvUpCost(1))} 起 ×1.45^等级</span><span>叠位决定</span><span>挂机 ${fmt(perBattle)}/场 · 首通 · 周 Boss · 塔</span></div>
      <div><span>突破</span><span>金币×4 + 银芯（20+等级）</span><span>每 ${LEVEL_GATE} 级</span><span>银芯：Boss 首通 / 成就 / 签到 / 竞技场 / 分解</span></div>
      <div><span>叠位</span><span>重复唤醒体，或 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${awakenCost(0)} 起</span><span>${MAX_AWAKEN}</span><span>召唤（含保底）、银芯共鸣</span></div>
      <div><span>命轮 / 密契</span><span>金币强化、银芯精炼</span><span>Lv${GEAR_MAX_LV}</span><span>推图掉落、装备祈愿、银芯商店</span></div>
      <div><span>造物</span><span>同上 + 凑同主题</span><span>${RELIC_SLOTS} 格</span><span>推图掉落、塔每 10 层</span></div>
      <div><span>钥令</span><span>银芯淬炼</span><span>Lv${ORDER_MAX_LV}</span><span>Boss 首通、塔每 10 层、周 Boss、银芯商店</span></div>
    </div>
    <h4>叠位给什么</h4>
    <p class="hint">每 1 叠位：全属性 +${AWAKEN_STAT_PER}%、等级上限 +1。每 ${AWAKEN_AMP_EVERY} 叠位：增伤 +${AWAKEN_AMP_PER}%。每 ${AWAKEN_SKILL_EVERY} 叠位：技能等级 +1。99 叠位 = 全属性 +${Math.round(MAX_AWAKEN * AWAKEN_STAT_PER)}%、上限 ${MAX_LV_HARD} 级、增伤 +${(MAX_AWAKEN / AWAKEN_AMP_EVERY) * AWAKEN_AMP_PER}%、技能 +2 级。</p>
    <h4>先练谁</h4>
    <p class="hint">优先把 4 人主力平均推到当前挂机关的推荐战力：队伍页的「一键配队」不仅排队伍（同界域加成 3 人 +8%、4 人 +15%），还会一起换好命轮、密契、造物和钥令。输出位先吃增伤（造物锋锐 / 钥令蚀日），前排先吃生命与防御（造物生机 / 壁垒）。</p>`;
  openModal(html, 'wide');
}

/* 立绘大图：官方素材原图 240×600，弹窗里按屏幕高度撑满 */
export function artModal(app, slug) {
  const a = app.data.bySlug[slug];
  if (!a) return;
  const root = openModal(`<div class="art-big"><img src="${img(a.card)}" alt="${esc(a.zh)}立绘"><div class="ab-cap"><b>${esc(a.zh)}</b><small>${esc(a.en)} · ${esc(REALMS[a.realm].zh)}</small></div></div>`, 'art');
  // 背景压到几乎全黑，让立绘独占视野，不被后面的列表分心
  root?.classList.add('art-dark');
}

/* ----------------------------- GEAR ----------------------------- */
export function gearPage(app) {
  const { state: s } = app;
  const tab = app.ui.gearTab ||= 'wheel';
  const affix = (app.ui.gearAffix ||= { wheel: '', covenant: '', relic: '' })[tab] || '';
  const all = Object.values(s.gear.items).filter((i) => i.kind === tab)
    .sort((a, b) => (RARITY_ORDER[itemDef(app, b).rarity || 'SR'] - RARITY_ORDER[itemDef(app, a).rarity || 'SR']) || b.lv - a.lv);
  const items = affix ? all.filter((it) => itemAffix(app, it).key === affix) : all;
  const tabs = [['wheel', '命轮'], ['covenant', '密契'], ['relic', '造物']].map(([k, z]) => `<button class="btn sm ${tab === k ? 'on' : ''}" data-act="gear-tab" data-k="${k}">${z} <span class="gtabn" data-gearcnt="${k}">${Object.values(s.gear.items).filter((i) => i.kind === k).length}</span></button>`).join('');
  const lim = app.ui.gearLimit ||= 60;
  const rows = items.slice(0, lim).map((it) => {
    const def = itemDef(app, it);
    const cost = it.lv < GEAR_MAX_LV ? gearCost(it.kind, it.lv) : 0, rc = refineCost(it);
    const eqd = isEquipped(s, it.uid);
    const btns = `<div class="ibtns"><button class="btn sm" data-act="gear-equip" data-uid="${it.uid}">${tab === 'relic' ? (eqd ? '卸下' : '装备') : '装备'}</button><button class="btn sm" data-act="gear-up" data-uid="${it.uid}" ${cost && s.gold >= cost ? '' : 'disabled'}>${cost ? `强化 ${fmt(cost)}` : '满级'}</button><button class="btn sm" data-act="gear-refine" data-uid="${it.uid}" ${rc && s.cores >= rc ? '' : 'disabled'} title="精炼：每阶 +8% 该装备全部加成">${rc ? `精炼 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${rc}` : '精炼满'}</button>${it.kind !== 'covenant' ? `<button class="btn sm" data-act="rune-open" data-uid="${it.uid}" title="${it.kind === 'relic' ? '特质' : '器纹'}：花金币随机刷 16 种属性 × 5 个品阶">${it.kind === 'relic' ? '特质' : '器纹'}${it.rune ? `·${RUNE_TIERS[it.rune.t - 1].zh}` : ''}</button>` : ''}${rewindBtn(s, it)}<button class="btn sm danger" data-act="gear-dis" data-uid="${it.uid}" ${eqd ? 'disabled' : ''}>分解 ${fmt(dismantleValue(def.rarity || 'SR', it.lv))}${dismantleCores(def.rarity || 'SR', it, s) ? ` +<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${dismantleCores(def.rarity || 'SR', it, s)}` : ''}</button></div>`;
    return itemCard(app, it, btns);
  }).join('') || '<p class="hint">暂无。推图有概率掉落，也可在「召唤」页用金币祈愿。</p>';
  const more = items.length > lim ? `<button class="btn" data-act="gear-more">显示更多（还有 ${items.length - lim} 件）</button>` : '';

  // 队伍里每个人的命轮 / 密契槽位：点一下直接换，不用先点进角色详情
  const teamRows = equipPanel(app);
  const sets = covenantSetText(app);
  return `<div class="page"><h2>命轮 · 密契 <small>每人各 1 件</small>${rwCount(s) ? `<span class="tag rwtag" title="免费回溯券：角色与装备回溯各用一张，不花银芯">回溯券 ×${rwCount(s)}</span>` : ''}</h2>
    <p class="hint">命轮与密契是<b>绑在单个唤醒体身上</b>的两件装备：点下面的槽位直接更换，点「已装备」的槽位可以卸下。密契全队同款凑到 2 / 4 件会触发套装效果（当前：<span id="covsets">${sets || '还没有凑成套'}</span>）。造物与钥令是全队被动，分别在队伍页与钥令页配置。</p>
    <div class="eqpanel">${teamRows}</div>
    <div class="row"><button class="btn gold" data-act="gear-upall" title="只强化主线编队（队伍页上阵的 4 人 + 造物栏）正在用的装备，每次升当前最便宜的一级">一键强化主线编队</button><button class="btn" data-act="gear-up-pick" title="选择要强化哪几套编队的装备">选择队伍…</button><button class="btn danger" data-act="dm-open" title="按类型 / 稀有度 / 强化等级批量分解没在用的装备">一键分解…</button><small class="dim">每件最高 Lv${GEAR_MAX_LV}；10 级以后每级 +5%，金币花得很多</small></div>
    <p class="hint">「一键强化」只会强化<b>主线编队</b>（队伍页上阵的 4 人身上的命轮 / 密契，加上造物栏）：把金币花在这些装备上，每次挑当前最便宜的一级升，直到金币不够或者全部满级。想强化别的编队（一队～五队、禁区队、属性塔队），点「选择队伍…」勾选；已编入别的编队、但不在主线编队里的装备，默认不会动。</p>
    <p class="hint">想一次性配好？回队伍页点「一键配队」，会连着命轮、密契、造物、钥令一起排；队伍页也有同一块槽位面板，不用来回切页。</p>
    <h3>${tab === 'relic' ? '造物库存' : '库存'} <small id="gearstock">${items.length}${affix ? ` / ${all.length}` : ''} 件</small></h3>
    <div class="row">${tabs}</div>${affixBar(app, tab, affix, 'gear-affix')}<div class="list" id="gearlist">${rows}</div>${more}</div>`;
}

/** 分解 / 换装之后就地刷新库存计数：页签上的「密契 N」、库存「N 件」、密契套装提示。
 *  以前单件分解只把 DOM 节点删掉，这三处数字停在那儿不动，玩家会以为没拆成功。 */
export function syncGearCounts(app) {
  const s = app.state;
  const tab = app.ui.gearTab || 'wheel';
  const affix = (app.ui.gearAffix || {})[tab] || '';
  for (const el of document.querySelectorAll('[data-gearcnt]')) {
    const k = el.dataset.gearcnt;
    el.textContent = String(Object.values(s.gear.items).filter((i) => i.kind === k).length);
  }
  const stock = document.getElementById('gearstock');
  if (stock) {
    const all = Object.values(s.gear.items).filter((i) => i.kind === tab);
    const n = affix ? all.filter((it) => itemAffix(app, it).key === affix).length : all.length;
    stock.textContent = `${n}${affix ? ` / ${all.length}` : ''} 件`;
  }
  const sets = document.getElementById('covsets');
  if (sets) sets.textContent = covenantSetText(app) || '还没有凑成套';
}

/* ----------------------------- ORDERS (钥令) ----------------------------- */
// 钥令图标：改用原作 KeyToken 素材（img/key/*.webp）。
// 图没加载出来时（老缓存 / 文件缺失）自动退回首字，不留下破图问号。
const oglyph = (def) => {
  const ch = esc(def.glyph || def.zh.slice(0, 1) || '钥');
  if (!def.img) return `<span class="oglyph r-${def.rarity}">${ch}</span>`;
  return `<span class="oglyph r-${def.rarity}"><i>${ch}</i><img src="${img(def.img)}" alt="${esc(def.zh)}" loading="lazy" onerror="this.remove()"></span>`;
};

// 钥令定位标签：由「招牌键」决定（锐意 / 起手 / 慈悲…），一眼看出这件是加伤害、
// 给起手资源还是保命，不用先读完加成那串字。数据在 public/data/orders.json 的 tag。
const otag = (def) => (def?.tag ? `<i class="otag">${esc(def.tag)}</i>` : '');

export function ordersPage(app) {
  const { state: s, data } = app;
  const n = orderSlotCount(s.maxStage);
  const slots = Array.from({ length: ORDER_SLOTS }, (_, i) => {
    if (i >= n) return `<div class="oslot locked" >🔒 ${i + 1} 号位<br><small>最高通关 ${orderLockedHint(i, s.maxStage)} 关解锁</small></div>`;
    const id = s.orders.slots[i], def = id && data.orderById[id];
    return `<div class="oslot ${def ? 'on r-' + def.rarity : 'empty'}" data-act="pick-order" data-i="${i}">
      ${def ? `${oglyph(def)}<div><b>${esc(def.zh)}</b>${otag(def)} Lv${s.orders.owned[id]}<small>${esc(orderText(def, s.orders.owned[id]))}</small></div>` : `＋ 空位 ${i + 1}`}</div>`;
  }).join('');
  const owned = data.orders.filter((o) => s.orders.owned[o.id] != null);
  const locked = data.orders.filter((o) => s.orders.owned[o.id] == null);
  const card = (def, have) => {
    const lv = s.orders.owned[def.id] || 0;
    const c = orderUpCost(lv);
    const on = s.orders.slots.includes(def.id);
    return `<div class="order ${have ? '' : 'locked'} ${on ? 'on' : ''} ${rarCls(def.rarity)}">
      ${oglyph(def)}
      <div class="ob"><b>${esc(def.zh)}</b>${otag(def)} <em>${def.rarity}${def.realm ? ` · ${esc(def.realm)}` : ''}${have ? ` · Lv${lv}/${ORDER_MAX_LV}` : ''}</em>
        <small>${have ? esc(orderText(def, lv)) : '未获得'}</small>
        ${have && lv < ORDER_MAX_LV ? `<small class="dim">下一级：${esc(bonusText(Object.fromEntries(Object.entries(def.bonus).map(([k, v]) => [k, v * (orderLvMult(lv + 1) - orderLvMult(lv))]))))}</small>` : ''}
        <small class="flavor">${esc(def.desc)}</small></div>
      ${have ? `<div class="ibtns"><button class="btn sm" data-act="order-up" data-id="${def.id}" ${c && s.cores >= c ? '' : 'disabled'}>${c ? `淬炼 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${c}` : '已满'}</button></div>` : ''}
    </div>`;
  };
  return `<div class="page"><h2>钥令 <small>已开 ${n}/${ORDER_SLOTS} 位 · 全队生效</small></h2>
    <p class="hint">钥令是第三套队伍配置：命轮、密契绑在单个人身上，造物和钥令则是全队被动。钥令偏「开局与规则」——起始共鸣 / 钥焰、首击增伤、濒死存活、金币收益。淬炼每级 +${Math.round(orderLvMult(1) * 100 - 100)}% 效果，上限 Lv${ORDER_MAX_LV}。</p>
    <div class="oslots">${slots}</div>
    <h3>已获得 <small>${owned.length}/${data.orders.length}</small></h3>
    <div class="olist">${owned.map((o) => card(o, true)).join('') || '<p class="hint">还没有钥令——打第一个 Boss 首通就会掉。</p>'}</div>
    <details class="en-box"><summary>未获得的钥令（${locked.length}）</summary><div class="olist dim">${locked.map((o) => card(o, false)).join('')}</div></details>
    <p class="hint">掉落：每关 Boss 首通必掉 1 个 · 无限塔每 10 层 · 周 Boss 累计伤害里程碑 · 银芯商店「钥令匣」。重复获得的钥令折算 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">30。</p>
  </div>`;
}

/* ----------------------------- SUMMON ----------------------------- */
const clock = (t) => { const d = new Date(t || Date.now()); const z = (n) => String(n).padStart(2, '0'); return `${z(d.getMonth() + 1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`; };
const RAR_ZH = { Genesis: '创生', SSR: '史诗', SR: '精良' };

/* 抽卡记录 + 欧非评估：指数 = 实际货值 ÷ 公示概率应有的货值 × 100（100 就是平均水平） */
function luckCard(app) {
  const s = app.state;
  const luck = luckOf(s);
  const g = s.gacha || { log: [] };
  const pct = luckBarPct(luck.index);
  const tier = luck.tier;
  const avg = luck.avgGenesis ? `${Math.round(luck.avgGenesis)} 抽/个` : '—';
  const recent = (g.log || []).slice(0, 14);
  const chips = recent.map((r) => {
    const a = app.data.bySlug[r.slug];
    const tag = r.isNew ? 'NEW' : r.dup ? (r.star >= MAX_AWAKEN ? '已满叠' : `叠位 ${r.star}`) : '';
    return `<span class="gchip r-${r.rarity}" title="${esc(a?.zh || r.slug)} · ${RAR_ZH[r.rarity]} · ${clock(r.t)}${tag ? ' · ' + tag : ''}">
      <img src="${img(a?.portrait)}" alt="" loading="lazy"><em>${esc(a?.zh || r.slug)}</em><small>${RAR_ZH[r.rarity]}${tag ? ' · ' + tag : ''}</small></span>`;
  }).join('') || '<p class="hint">还没有记录。抽一次就会出现在这里，记录只存在本机。</p>';
  return `<div class="banner-card luckcard"><h3>抽卡记录 · 欧非评估 <small>累计 ${luck.pulls} 抽${luck.pulls > GACHA_LOG_MAX ? ` · 只保留最近 ${GACHA_LOG_MAX} 条明细` : ''}</small></h3>
    <div class="luckhead">
      <b class="lk lk-${tier.key}">${tier.zh}</b>
      <span class="lkidx">幸运指数 <b>${luck.index == null ? '—' : luck.index}</b></span>
    </div>
    <div class="luckbar" title="100 = 完全符合公示概率"><i class="lk-${tier.key}" style="width:${pct}%"></i><u></u></div>
    <p class="hint">${tier.desc} 竖线是平均线（100）；货值 ${fmt(luck.worth)} / 期望 ${fmt(luck.expected)}（创生记 ${RARITY_WORTH.Genesis}、史诗记 ${RARITY_WORTH.SSR}、精良记 ${RARITY_WORTH.SR}，基准按公示概率 ${Math.round(RARITY_RATE.Genesis * 100)}% / ${Math.round(RARITY_RATE.SSR * 100)}% / ${Math.round(RARITY_RATE.SR * 100)}%）。</p>
    <div class="luckstats">
      <span>总抽数 <b>${luck.pulls}</b></span>
      <span>创生 <b>${luck.genesis}</b><em>${luck.pulls ? `${(luck.genesisRate * 100).toFixed(2)}%` : '—'}</em></span>
      <span>平均出创生 <b>${avg}</b></span>
      <span>史诗 <b>${luck.ssr}</b></span>
      <span>最好十连 <b>${g.best10 || 0}</b> 个史诗以上</span>
      <span>距创生保底 <b>${Math.max(0, PULL_PITY_GENESIS - (s.pity?.genesis || 0))}</b> 抽</span>    </div>
    <div class="gchips">${chips}</div>
    <div class="row"><button class="btn sm" data-act="gacha-log">完整记录</button><button class="btn sm danger" data-act="gacha-clear" ${luck.pulls ? '' : 'disabled'}>清空记录</button></div>
    <p class="hint">记录保存在本机存档里（最近 ${GACHA_LOG_MAX} 条明细 + 全程累计统计）。换设备前请先导出存档。</p></div>`;
}

export function summonPage(app) {
  const { state: s } = app;
  const p = s.pity;
  return `<div class="page"><h2>召唤${tipBtn(app, 'summon')}</h2>${tipCard(app, 'summon')}
    <div class="banner-card"><h3>唤醒体召唤</h3>
      <p>唤醒券：<b>${s.tickets}</b>　　创生保底：<b>${p.genesis}/${PULL_PITY_GENESIS}</b>　　史诗保底：<b>${p.ssr}/10</b></p>
      <div class="row"><button class="btn big" data-act="pull" data-n="1" ${s.tickets >= 1 ? '' : 'disabled'}>单抽 ×1</button><button class="btn big gold" data-act="pull" data-n="10" ${s.tickets >= 10 ? '' : 'disabled'}>十连 ×10</button></div>
      <p class="hint">概率：精良 60% · 史诗 37% · 创生 3%（第 38 抽起逐步提升，${PULL_PITY_GENESIS} 抽必出）。十连至少 1 个史诗以上。重复获得 = 叠位 +1（上限 ${MAX_AWAKEN}），满叠位折算金币与银芯。</p></div>
    <div class="banner-card"><h3>银芯召唤 <small><img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯"> ${fmt(s.cores)}</small></h3>
      <p class="hint">银芯来自首通、成就、签到、周 Boss、属性塔、竞技场和分解装备（分解的基础银芯每天最多 40 枚）。与唤醒券共用保底。</p>
      <div class="row"><button class="btn big" data-act="cpull" data-n="1" ${s.cores >= CORE_PULL_COST ? '' : 'disabled'}>单抽 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${CORE_PULL_COST}</button><button class="btn big gold" data-act="cpull" data-n="10" ${s.cores >= CORE_PULL10_COST ? '' : 'disabled'}>十连 <img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${CORE_PULL10_COST}</button>
      <button class="btn big" data-act="cepull" ${s.cores >= EQUIP_CORE_COST ? '' : 'disabled'}>精选祈愿（SR 以上装备）<img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯">${EQUIP_CORE_COST}</button></div></div>
    ${luckCard(app)}
    <div class="banner-card"><h3>银芯商店 <small>每日 0 点（UTC）刷新限购</small></h3>
      <div class="shop">${SHOP.map((x) => { const n = boughtToday(s, x.id); return `<div class="shopi"><b>${x.zh}</b><small>今日 ${n}/${x.limit}</small><button class="btn sm" data-act="shop-buy" data-id="${x.id}" ${n < x.limit && s.cores >= x.cost ? '' : 'disabled'}><img class="ico-sm" src="public/img/ui/silvercore.webp" alt="银芯"> ${x.cost}</button></div>`; }).join('')}</div></div>
    ${(() => { const n = boughtToday(s, GOLD_TICKET_ID), pr = goldTicketPrice(s); return `<div class="banner-card"><h3>金币换唤醒券 <small>今日 ${n}/${GOLD_TICKET_LIMIT}</small></h3>
      <p class="hint">金币太多花不完时的出口：每张 <b>${fmt(pr)}</b> 金币（约等于最高关 300 场的收入，当天每买一张再贵 20%）。比挂机直接拿券贵得多，所以前中期不划算，金币先留给升级。</p>
      <div class="row"><button class="btn big" data-act="gold-ticket" ${n < GOLD_TICKET_LIMIT && s.gold >= pr ? '' : 'disabled'}>换 1 张 · ${fmt(pr)} 金币</button></div></div>`; })()}
    <div class="banner-card"><h3>装备祈愿</h3>
      <p>金币：<b>${fmt(s.gold)}</b>　每次 ${EQUIP_PULL_COST} 金币，随机获得命轮 / 密契 / 造物；全部 ${dexTotal(app).all} 件都在池子里，${dexTotal(app).got} 件已收录。</p>
      <div class="row">${[1, 5, 10, 50, 500].map((n) => `<button class="btn big ${n >= 50 ? 'gold' : ''}" data-act="epull" data-n="${n}" ${s.gold >= EQUIP_PULL_COST * n ? '' : 'disabled'}>祈愿 ×${n}<small>${fmt(EQUIP_PULL_COST * n)} 金币</small></button>`).join('')}
        <button class="btn big" data-act="gear-dex">装备图鉴 ${dexTotal(app).got}/${dexTotal(app).all}</button></div>
      <p class="hint">50 连、500 连不逐件弹出，直接给汇总（各稀有度几件、新收录了哪些、最好的几件）；抽到的装备照常进库存，用不上的去「命轮 · 密契」页分解换金币和银芯。</p></div>
  </div>`;
}

/* ---- 一键强化：选队伍 ---- */
export function enhanceModal(app) {
  const s = app.state;
  const sel = (app.ui.eh ||= ['cur']);
  const scopes = enhanceScopes(s);
  const names = (k) => {
    const slugs = k === 'cur' ? s.team : squadsOf(s)[k]?.team || [];
    return slugs.map((x) => app.data.bySlug[x]?.zh).filter(Boolean).join('、') || '（空）';
  };
  const r = enhanceAllEquipped(s, { scopes: sel.filter((k) => scopes.some((x) => x.key === k)), dry: true });
  const row = (x) => `<label class="snd ehrow"><input type="checkbox" data-eh="${x.key}" ${sel.includes(x.key) ? 'checked' : ''}> <b>${x.key === 'cur' ? '主线编队' : esc(squadKeyZh(x.key))}</b> <small class="dim">${esc(names(x.key))} · ${x.n} 件装备${x.key === 'cur' ? '' : x.own ? ' · 独立配装' : ' · 沿用主线穿戴'}</small></label>`;
  openModal(`<h3>一键强化 · 选择队伍</h3>
    <p class="hint">勾选要强化的队伍：金币会花在这些队伍正在用的装备上，每次升当前最便宜的一级。「沿用主线穿戴」的编队没有自己的装备，强化的是主线上这几个人身上的那几件；同一件装备被多个队伍用到只会升一次。</p>
    <div class="ehlist">${scopes.map(row).join('')}</div>
    <div class="banner-card"><p>预计：<b>${r.items}</b> 件装备升 <b>${r.n}</b> 级，花 <b>${fmt(r.spent)}</b> 金币（现有 ${fmt(s.gold)}）${r.total ? '' : '<small class="dim">（所选队伍没有装备）</small>'}</p>
      <div class="row"><button class="btn gold" data-act="gear-up-run" ${r.n ? '' : 'disabled'}>开始强化</button><button class="btn" data-act="close">取消</button></div></div>`, 'wide');
}

/* ---- 一键分解 ---- */
const DM_LEVELS = [[null, '不限'], [0, '未强化'], [3, '≤ 3 级'], [5, '≤ 5 级'], [10, '≤ 10 级'], [20, '≤ 20 级']];
export const dmFilter = (app) => autoDmOf(app.state);
export function dismantleModal(app) {
  const f = dmFilter(app), p = dismantlePreview(app.state, app.data, f);
  const on = (arr, k) => arr.includes(k);
  const chip = (act, k, label, cur) => `<button class="btn sm ${cur ? 'on' : ''}" data-act="${act}" data-k="${k}">${label}</button>`;
  const KIND_ZH = { wheel: '命轮', covenant: '密契', relic: '造物' };
  const parts = ['wheel', 'covenant', 'relic'].filter((k) => p.byKind[k]?.n);
  openModal(`<h3>一键分解</h3>
    <p class="hint">按条件批量分解库存里<b>没在用</b>的装备（穿在身上的、造物栏里的、编队独立配装占着的，一律不动）。分解返还金币，SSR / SR 另有银芯（<b>基础银芯每天最多 40 枚</b>，精炼过的返还一半银芯不受限）。</p>
    <h4>类型</h4><div class="row">${[['wheel', '命轮'], ['relic', '造物']].map(([k, z]) => chip('dm-kind', k, z, on(f.kinds, k))).join('')}</div>
    <h4>稀有度 <small class="dim">只筛命轮与造物；密契看下面那个开关</small></h4><div class="row">${['N', 'R', 'SR', 'SSR'].map((k) => chip('dm-rar', k, k, on(f.rarities, k))).join('')}</div>
    <h4>密契 <small class="dim">21 种，不分稀有度：一律按 SR 折价</small></h4>
    <div class="row"><label class="snd"><input type="checkbox" data-dm="cov" ${f.cov ? 'checked' : ''}> 连密契一起分解<small class="dim">　每件按 SR 算：金币看强化等级、+2 银芯；每人只能装 1 件，同款还要凑套装，默认不碰</small></label></div>
    ${f.cov ? (p.covNames.length ? `<p class="hint">会分解的密契：${p.covNames.slice(0, 12).map((x) => `${esc(x.zh)}${x.n > 1 ? ` ×${x.n}` : ''}`).join('、')}${p.covNames.length > 12 ? ` …等 ${p.covNames.length} 种` : ''}</p>` : '<p class="hint">没有可分解的密契（在用的、精炼过要保留的都不动）。</p>') : ''}
    <h4>强化等级</h4><div class="row">${DM_LEVELS.map(([k, z]) => chip('dm-lv', k == null ? '' : k, z, (f.maxLv ?? null) === k)).join('')}</div>
    <div class="row"><label class="snd"><input type="checkbox" data-dm="keepRefined" ${f.keepRefined ? 'checked' : ''}> 保留精炼过的（精炼花过银芯，默认不分解）</label></div>
    <h4>自动分解 <small class="dim">用上面同一组条件，每隔几秒自动处理新入库的装备</small></h4>
    <div class="row"><label class="snd"><input type="checkbox" data-dm="on" ${f.on ? 'checked' : ''}> 开启自动分解</label></div>
    <div class="row"><label class="snd"><input type="checkbox" data-dm="keepFirst" ${f.keepFirst ? 'checked' : ''}> 每种至少留 1 件在库（刚收录的第一件不分解）</label></div>
    <div class="row"><label class="snd"><input type="checkbox" data-dm="incPull" ${f.incPull ? 'checked' : ''}> 连装备祈愿抽到的也自动分解（默认只处理推图掉落）</label></div>
    <div class="banner-card"><p>符合条件：<b>${p.n}</b> 件　预计返还 <b>${fmt(p.gold)}</b> 金币 + <b>${fmt(p.cores)}</b> 银芯<small class="dim">${p.baseLeft <= 0 ? '（今天的基础银芯额度已用完）' : `（今天基础银芯还剩 ${p.baseLeft} 枚额度）`}</small></p>
      ${parts.length ? `<p class="hint">${parts.map((k) => `${KIND_ZH[k]} <b>${p.byKind[k].n}</b> 件 → ${fmt(p.byKind[k].gold)} 金币 + ${p.byKind[k].cores} 银芯`).join('　·　')}</p>` : '<p class="hint">当前条件下一件都不会分解，调整上面的勾选试试。</p>'}
      ${p.byKind.covenant?.n ? '<p class="hint">密契拆掉就没了（不能再用金币抽回来），确认清楚再按。</p>' : ''}
      <div class="row"><button class="btn gold" data-act="dm-run" ${p.n ? '' : 'disabled'}>分解这 ${p.n} 件</button><button class="btn" data-act="close">取消</button></div></div>`, 'wide');
}

/* ---- 装备图鉴 ---- */
const dexLists = (app) => ({ wheel: app.data.wheels, covenant: app.data.covenants, relic: app.data.relics });
function dexTotal(app) {
  const L = dexLists(app), dex = app.state.gear.dex || {};
  let all = 0, got = 0;
  for (const [k, list] of Object.entries(L)) for (const d of list) { all++; if (dex[gearDexKey(k, d.id)]) got++; }
  return { all, got };
}
/** 把一批刚抽到的装备汇总成一屏（50 连 / 500 连用）：before 是抽之前的图鉴快照（用来判断「新收录」） */
export function showItemsSummary(app, items, before, spent) {
  const L = { wheel: '命轮', covenant: '密契', relic: '造物' };
  const by = {}, kinds = {}, fresh = new Map();
  for (const it of items) {
    const def = itemDef(app, it), r = def.rarity || '—';
    by[r] = (by[r] || 0) + 1; kinds[it.kind] = (kinds[it.kind] || 0) + 1;
    const k = gearDexKey(it.kind, it.defId);
    if (!before[k] && !fresh.has(k)) fresh.set(k, it);
  }
  const order = { SSR: 0, SR: 1, R: 2, N: 3 };
  const best = [...items].sort((a, b) => (order[itemDef(app, a).rarity] ?? 9) - (order[itemDef(app, b).rarity] ?? 9)).slice(0, 12);
  const chip = (it) => { const d = itemDef(app, it); return `<div class="dxchip ${rarCls(d.rarity || 'SR')}" title="${esc(d.zh)}"><img src="${img(d.img)}" alt="" loading="lazy"><span>${esc(d.zh)}</span></div>`; };
  const t = dexTotal(app);
  openModal(`<h3>祈愿 ×${items.length} <small>花了 ${fmt(spent)} 金币</small></h3>
    <p>${['SSR', 'SR', 'R', 'N'].filter((r) => by[r]).map((r) => `<b class="${rarCls(r)}">${r}</b> ×${by[r]}`).join('　')}　<small class="dim">命轮 ${kinds.wheel || 0} · 密契 ${kinds.covenant || 0} · 造物 ${kinds.relic || 0}</small></p>
    <h4>新收录 ${fresh.size} 件 <small class="dim">图鉴 ${t.got}/${t.all}</small></h4>
    <div class="dxrow">${[...fresh.values()].slice(0, 60).map(chip).join('') || '<small class="dim">这一批都是已经收录过的。</small>'}${fresh.size > 60 ? `<small class="dim">…还有 ${fresh.size - 60} 件，去图鉴里看</small>` : ''}</div>
    <h4>最好的 ${best.length} 件</h4><div class="dxrow">${best.map(chip).join('')}</div>
    <div class="row"><button class="btn" data-act="gear-dex">打开装备图鉴</button><button class="btn gold" data-act="close">收下</button></div>`, 'wide');
}
export function gearDexModal(app) {
  const s = app.state, dex = s.gear.dex || {}, L = dexLists(app);
  const tab = app.ui.dexTab || 'wheel', rar = app.ui.dexRar || '', only = app.ui.dexOnly || '';
  const names = { wheel: '命轮', covenant: '密契', relic: '造物' };
  const cnt = (k) => L[k].filter((d) => dex[gearDexKey(k, d.id)]).length;
  const order = { SSR: 0, SR: 1, R: 2, N: 3 };
  let list = [...L[tab]];
  if (rar) list = list.filter((d) => (d.rarity || '') === rar);
  if (only === 'got') list = list.filter((d) => dex[gearDexKey(tab, d.id)]);
  if (only === 'miss') list = list.filter((d) => !dex[gearDexKey(tab, d.id)]);
  list.sort((a, b) => (order[a.rarity] ?? 9) - (order[b.rarity] ?? 9));
  const t = dexTotal(app);
  const tile = (d) => { const n = dex[gearDexKey(tab, d.id)] || 0; return `<div class="dxtile ${rarCls(d.rarity || 'SR')} ${n ? '' : 'miss'}" title="${esc(d.zh)}${d.rarity ? ' · ' + d.rarity : ''}${n ? ' · 累计获得 ' + n : ' · 未获得'}"><img src="${img(d.img)}" alt="" loading="lazy"><b>${esc(d.zh)}</b><small>${d.rarity || ''}${n ? ` ×${n}` : ''}</small></div>`; };
  const chips = (arr, cur, act) => arr.map(([k, z]) => `<button class="btn sm ${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}">${z}</button>`).join('');
  openModal(`<h3>装备图鉴 <small>${t.got}/${t.all} 已收录</small></h3>
    <div class="row">${chips(Object.keys(names).map((k) => [k, `${names[k]} ${cnt(k)}/${L[k].length}`]), tab, 'dex-tab')}</div>
    <div class="row">${chips([['', '全部稀有度'], ['SSR', 'SSR'], ['SR', 'SR'], ['R', 'R'], ['N', 'N']], rar, 'dex-rar')}${chips([['', '全部'], ['got', '已收录'], ['miss', '未收录']], only, 'dex-only')}</div>
    <p class="hint">${names[tab]}共 ${L[tab].length} 件，这里每一件都能从「装备祈愿」抽到（金币祈愿 / 银芯精选 / 推图掉落 / 塔和禁区的奖励）。灰色的是还没获得过的；「×N」是累计获得次数，分解掉也不会减。显示 ${list.length} 件。</p>
    <div class="dxgrid">${list.map(tile).join('') || '<small class="dim">没有符合条件的装备。</small>'}</div>`, 'wide dexmodal');
}

/* 抽卡结果：稀有度越高越亮，逐张弹出；十连额外给一行汇总 */
export function showPulls(app, out) {
  const { data } = app;
  const best = out.reduce((b, p) => (RARITY_ORDER[p.rarity] ?? 0) > (RARITY_ORDER[b] ?? 0) ? p.rarity : b, 'SR');
  const cnt = (r) => out.filter((p) => p.rarity === r).length;
  const summary = [`${out.length} 抽`];
  if (cnt('Genesis')) summary.push(`<b class="r-Genesis">创生 ×${cnt('Genesis')}</b>`);
  if (cnt('SSR')) summary.push(`<b class="r-SSR">史诗 ×${cnt('SSR')}</b>`);
  summary.push(`精良 ×${cnt('SR')}`);
  const newN = out.filter((p) => p.isNew).length;
  if (newN) summary.push(`<em class="new">新唤醒体 ${newN}</em>`);
  const html = `<h3 class="pull-h">召唤结果 <small>${summary.join('　')}</small></h3>
    <div class="grid mini pulls best-${best}">${out.map((p, i) => {
    const a = data.bySlug[p.slug];
    return `<div class="tile ${rarCls(p.rarity)} pull" style="--rc:${R(a).color};--d:${(i * 0.055).toFixed(3)}s">
      <span class="rr">${RAR_ZH[p.rarity]}</span>
      <img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b>
      <small>${p.isNew ? '<em class="new">NEW</em>' : p.gold ? `满叠位 +${p.gold} 金币` : `叠位 ${p.star}`}</small></div>`;
  }).join('')}</div>`;
  openModal(html, 'wide');
}

/* 完整抽卡记录：按稀有度筛选，附「实际 vs 期望」对照 */
export function gachaLogModal(app) {
  const s = app.state;
  const g = app.ui.gachaLog ||= { filter: '' };
  const luck = luckOf(s);
  const log = (s.gacha?.log || []).filter((r) => !g.filter || r.rarity === g.filter);
  const tab = (k, zh) => `<button class="btn sm ${g.filter === k ? 'on' : ''}" data-act="gacha-filter" data-k="${k}">${zh}</button>`;
  const rows = log.map((r) => {
    const a = app.data.bySlug[r.slug];
    return `<div class="glog r-${r.rarity}">
      <span class="gs">#${r.seq}</span>
      <img src="${img(a?.portrait)}" alt="">
      <span class="gn"><b>${esc(a?.zh || r.slug)}</b><small>${RAR_ZH[r.rarity]} · ${r.banner === 'core' ? '银芯召唤' : '唤醒券'}</small></span>
      <span class="gt">${r.isNew ? '<em class="new">NEW</em>' : r.dup ? (r.star >= MAX_AWAKEN ? '已满叠' : `叠位 ${r.star}`) : ''}</span>
      <span class="gd">${clock(r.t)}</span></div>`;
  }).join('') || '<p class="hint">这个筛选下没有记录。</p>';
  const cmp = [['Genesis', '创生'], ['SSR', '史诗'], ['SR', '精良']].map(([k, zh]) => {
    const n = { Genesis: luck.genesis, SSR: luck.ssr, SR: luck.sr }[k];
    const rate = luck.pulls ? ((n / luck.pulls) * 100).toFixed(2) : '0.00';
    const exp = (RARITY_RATE[k] * 100).toFixed(0);
    const diff = luck.pulls ? (n / luck.pulls) * 100 - RARITY_RATE[k] * 100 : 0;
    return `<div><span>${zh}</span><b>${n}</b><em>${rate}% <small class="dim">（期望 ${exp}%）</small></em><i class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%</i></div>`;
  }).join('');
  openModal(`<h3>抽卡记录 <small>累计 ${luck.pulls} 抽 · ${luck.tier.zh} · 幸运指数 ${luck.index ?? '—'}</small></h3>
    <div class="gcrow">${cmp}</div>
    <div class="row">${tab('', `全部 ${luck.pulls}`)}${tab('Genesis', `创生 ${luck.genesis}`)}${tab('SSR', `史诗 ${luck.ssr}`)}${tab('SR', `精良 ${luck.sr}`)}</div>
    <div class="glogs">${rows}</div>
    <p class="hint">只列最近 ${GACHA_LOG_MAX} 条明细；上面的累计数、幸运指数是全程统计，不受裁剪影响。装备祈愿不计入。</p>`, 'wide');
}
export function showItems(app, items) {
  openModal(`<h3>获得装备</h3><div class="list">${items.map((i) => itemCard(app, i)).join('')}</div>`, 'wide');
}
export function showOrders(app, orders) {
  openModal(`<h3>获得钥令</h3><div class="list">${orders.map((o) => { const def = app.data.orderById[o.id]; return `<div class="order on ${rarCls(def.rarity)}">${oglyph(def)}<div class="ob"><b>${esc(def.zh)}</b>${otag(def)} <em>${def.rarity}${def.realm ? ` · ${esc(def.realm)}` : ''}</em><small>${esc(orderText(def, 0))}</small><small class="flavor">${esc(def.desc)}</small></div></div>`; }).join('')}</div>`, 'wide');
}

/* ----------------------------- SETTINGS ----------------------------- */
function cloudCard(app) {
  const acct = Cloud.account(), cfg = Cloud.config(), c = app.cloud || {}, sync = Cloud.syncRecord();
  const errZh = c.err === 'too_large'
    ? `存档太大（${Math.round((c.bytes || 0) / 1024)}KB，服务端上限 480KB），这次没传上去`
    : (c.err || '网络不通');
  const st = {
    idle: '等待同步', syncing: '同步中…', ok: `已同步${c.at ? `（${new Date(c.at).toLocaleTimeString()}）` : ''}`,
    nologin: '还没登录', conflict: '本机和云端进度不同，等你选择', hold: '已暂停同步（有进度冲突，点「立即同步」重新处理）',
    error: `同步失败：${esc(errZh)}，稍后会自动重试`,
  }[c.status] || '';
  const dirty = acct && sync && sync.acct === acct.name && (app.state.rev || 0) > (sync.rev || 0);
  let kb = 0;
  try { kb = Math.round(JSON.stringify(app.state).length / 1024); } catch { kb = 0; }
  return `<div class="banner-card"><h3>云端存档 <small>${acct ? `账号：${esc(acct.name)}` : '未登录'}</small></h3>
    ${acct ? `<p>状态：<b>${st}</b>${dirty && c.status === 'ok' ? '（有新改动，稍后自动上传）' : ''}</p>
      <label class="snd"><input type="checkbox" data-cloud-auto ${cfg.auto ? 'checked' : ''}> 自动同步（登录后每次改动自动上传，进游戏时自动拉取）</label>
      <div class="row"><button class="btn gold" data-act="cloud-sync" ${c.busy ? 'disabled' : ''}>立即同步</button><button class="btn" data-act="cloud-pull">用云端存档覆盖本机</button></div>
      <p class="hint">同步前建议先备份：<button class="btn sm" data-act="export">导出本机存档</button></p>
      <p class="hint">本机存档 ${kb} KB。（服务端单条上限 480KB；超过 400KB 会自动压缩后上传，装备堆到几千件也不会卡住同步。）</p>`
    : `<p>登录本站账号后，挂机前夜的<b>整份进度</b>会自动存到云端，换手机 / 电脑登录同一个账号就能接着玩。</p>
      <div class="row"><a class="btn gold" href="../profile.html">去登录 / 注册</a></div>`}
    <p class="hint">云端存的是整份游戏进度（角色、装备、关卡、抽卡记录……）。两台设备都玩过时，进游戏会让你选用哪一份，<b>不会悄悄覆盖</b>。个人中心的「云端档案」只同步积分和最高分，和这份不是一回事。浏览器清数据前，也可以在下面「导出存档」留一份。</p></div>`;
}

export function settingsPage(app) {
  const s = app.state;
  const st = s.stats;
  // 曲目按钮：手动选定（autoMood=false）的那首高亮。
  const trkBtn = (t) => `<button class="btn sm ${sound.cfg.autoMood === false && sound.mood === t.k ? 'on' : ''}" data-act="bgm-track" data-k="${t.k}">${t.zh}</button>`;
  const trkScene = TRACK_LIST.filter((t) => t.grp !== 'll');
  const trkLL = TRACK_LIST.filter((t) => t.grp === 'll');
  return `<div class="page"><h2>设置与存档</h2>
    ${cloudCard(app)}
    <div class="banner-card"><h3>新手引导</h3>
      <p class="hint">重新过一遍底部五个分组的介绍（战斗 / 养成 / 召唤 / 挑战 / 更多），随时可跳过。</p>
      <div class="row"><button class="btn" data-act="guide">重看新手引导</button><button class="btn" data-act="guide-growth">养成指南</button></div></div>
    <div class="banner-card"><h3>更新公告</h3>
      <p class="hint">每次大更新会在进游戏时弹一次；想回头翻，点这里。</p>
      <div class="row"><button class="btn" data-act="news">查看更新公告</button></div></div>
    <div class="banner-card"><h3>战斗节奏</h3>
      <p class="hint">本作没有倍速与「极速跳过」：战斗按固定节奏播放，胜负由队伍强度与策略决定，挂机收益按 ${Math.round(3600 / BATTLES_PER_HOUR)} 秒一场结算（离线同样口径）。关掉「自动挂机」是手动挂机——照常连打，但停在当前关不再自动推进，用右上角 ◀ ▶ 自己换关。</p></div>
    <div class="banner-card"><h3>每日奖励</h3><p class="hint">每日奖励已并入「签到」页（月历、累计宝箱、可补签）。</p></div>
    <div class="banner-card"><h3>声音</h3>
      <label class="snd"><input type="checkbox" data-aud="mute" ${sound.cfg.mute ? 'checked' : ''}> 静音</label>
      <label class="snd">音效 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.sfx * 100)}" data-aud="sfx"></label>
      <label class="snd">音乐 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.bgm * 100)}" data-aud="bgm"></label>
      <p class="hint">两个滑杆都按「100% ≈ 满幅」标定，默认音效 65 / 音乐 55。<b>战斗里连打时觉得音乐被盖住</b>，把「音乐」拉到 65 以上（音效也可以顺手降到 55）；反过来想安静听音乐就降音效。</p>
      <h4>背景音乐 <small>十首曲子都由浏览器实时合成演奏</small></h4>
      <div class="row tracks">
        <button class="btn sm ${sound.cfg.autoMood === false ? '' : 'on'}" data-act="bgm-auto">跟随页面</button>
        ${trkScene.map(trkBtn).join('')}
      </div>
      <p class="hint">城镇 / 推图 / 战斗 / 首领 / 召唤 / 挑战各一首；换页面自动换曲并交叉淡入，战斗遇到 Boss 会切到「威压」。点上面的曲名可以锁定一首，点「跟随页面」恢复自动。</p>
      <div class="row tracks">${trkLL.map(trkBtn).join('')}</div>
      <p class="hint">下面四首是 Love Live! 的曲子（僕らは今のなかで / Snow halation / それは僕たちの奇跡 / 夏色えがおで1,2,Jump!），按原曲的气质重编了一小段副歌旋律循环演奏——<b>没有原曲音源</b>，只是用振荡器把旋律和鼓组现场弹出来。这几首不会自动出现，点一下才会切过去，切过去以后就固定住（想回自动点「跟随页面」）。</p>
      <h4>音效试听</h4>
      <div class="row">${[['hit', '命中'], ['crit', '暴击'], ['heal', '治疗'], ['shield', '护盾'], ['exalt', '共鸣'], ['summon', '召唤'], ['reveal3', '创生'], ['win', '胜利'], ['lose', '失败'], ['coin', '金币'], ['deny', '不可用']].map(([k, z]) => `<button class="btn sm" data-act="snd-test" data-k="${k}">${z}</button>`).join('')}</div>
      <label class="snd">结算弹窗 <select data-settle>${[['key', '首通 / Boss / 新怪物时'], ['all', '每场战斗'], ['off', '从不（在战斗页手动打开）']].map(([k, z]) => `<option value="${k}" ${settleMode.get() === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <label class="snd">挑战过程 <select data-watch>${[['watch', '先看战斗过程，再出结算'], ['skip', '直接出结算（快，省时间）']].map(([k, z]) => `<option value="${k}" ${watchMode.get() === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <label class="snd">战斗特效 <select data-fx>${[['full', '完整'], ['lite', '简化（少粒子、不震屏）'], ['off', '关闭']].map(([k, z]) => `<option value="${k}" ${fxMode.get() === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <p class="hint">音效与音乐都是实时合成的，没有音频文件；首次点击页面后才会发声。命中音色随攻击者界域变化（混沌/血肉/深海/超维）。</p>
      <p class="hint">「挑战过程」只管挑战模式（无限塔 / 属性塔 / 周 Boss / 融灾 / 竞技场）：选「先看过程」时点挑战会先播一段战斗回放，中途可以加速到 2× / 4× 或直接跳过，播完再弹结算。推图挂机本来就有战斗画面，不受这项影响。</p></div>
    <div class="banner-card"><h3>统计</h3><p>战斗 ${st.battles} 场 · 胜利 ${st.wins} · 击杀 ${st.kills} · 累计金币 ${fmt(st.gold)} · 召唤 ${st.pulls} 次 · 最高通关 ${s.maxStage}</p></div>
    <div class="banner-card"><h3>存档</h3>
      <div class="row"><button class="btn" data-act="export">导出存档</button><button class="btn" data-act="import">导入存档</button><button class="btn danger" data-act="reset">重置游戏</button></div>
      <p class="hint">存档保存在浏览器本地（localStorage）。换设备请先导出。离线最多结算 8 小时收益。</p></div>
    <div class="banner-card"><h3>关于</h3>
      <p class="hint">《挂机前夜》是基于《忘却前夜》（Morimens）的非官方同人作品，免费、非商业。游戏内的角色、图像素材版权归原权利方所有，数值与技能效果为本作自行设计。如有请联系删除。</p></div></div>`;
}

export function offlineModal(app, rep, onClaim) {
  const items = rep.drops.length;
  /* 攻坚层胜率 0 时不能按它结算（那样离线永远是 0），这里说明「已经按有收益的最高层算过」。 */
  const note = rep.fellBack
    ? `<p class="hint offback">⚠ 第 ${rep.wantStage || rep.stage} 关打不过（胜率 0，挂在那儿没有收益），已按<b>有收益的最高层 · 第 ${rep.stage} 关</b>结算；挂机层也切到第 ${rep.stage} 关，之后继续在这儿刷。</p>`
    : '';
  const m = openModal(`<h3>欢迎回来</h3><p>离线 ${Math.round(rep.secs / 60)} 分钟（结算 ${Math.round(rep.capped / 60)} 分钟），在第 ${rep.stage} 关挂机 ${rep.battles} 场，预计胜 ${rep.wins} 场。</p>
    ${note}<p>金币 <b>+${fmt(rep.gold)}</b>　唤醒券 <b>+${rep.tickets}</b>　银芯 <b>+${rep.cores || 0}</b>　装备 <b>+${items}</b></p><button class="btn big gold" data-act="claim-offline">领取</button>`);
  // 点 ✕ / 点遮罩关掉弹窗也算领取：否则收益丢了、战斗也不会开始（onClaim 里才 bv.start）
  let done = false;
  const claim = () => { if (done) return; done = true; mo.disconnect(); onClaim(); };
  const mo = new MutationObserver(() => { if (!m.isConnected) claim(); });
  mo.observe(document.body, { childList: true });
  m.addEventListener('click', (e) => { if (e.target.closest('[data-act="claim-offline"]')) { closeModal(); claim(); } });
}
