import {
  allyDef, teamDefs, levelUp, levelUpMax, setTeam, autoTeam, setPreset, PRESETS, equipItem, unequipItem, isEquipped,
  enhanceItem, dismantle, dismantleCores, summon, equipPull, EQUIP_PULL_COST, CORE_PULL_COST, CORE_PULL10_COST, EQUIP_CORE_COST,
  PULL_PITY_GENESIS, newState, migrate, relicItemsOf, stageGold, BATTLES_PER_HOUR,
} from '../core/game.js';
import {
  REALMS, TYPES, SLOTS, SLOT_ZH, MAX_LV, MAX_AWAKEN, MAX_LV_HARD, TEAM_SIZE, RARITY_ORDER, GEAR_MAX_LV,
  RELIC_SLOTS, RELIC_BASE_SLOTS, RELIC_UNLOCK, ORDER_SLOTS, ORDER_UNLOCK, ORDER_MAX_LV, LEVEL_GATE,
  AWAKEN_STAT_PER, AWAKEN_AMP_EVERY, AWAKEN_AMP_PER, AWAKEN_SKILL_EVERY,
} from '../core/constants.js';
import { sound } from './audio.js';
import { fxMode } from './fx.js';
import { settleMode } from './report.js';
import { SHOP, boughtToday } from '../core/shop.js';
import { refineCost } from '../core/gear.js';
import {
  lvUpCost, power, skillLevel, levelCap, breakNeeded, breakCost, awakenCost, growthPerLevel,
  awakenAmp, awakenSkill, nextAwakenMilestone,
} from '../core/stats.js';
import { describeSkill } from '../core/skills.js';
import {
  wheelText, relicText, covTheme, gearCost, dismantleValue, relicBond, relicSlotCount, RELIC_BONDS, BOND_TIERS, bonusText,
} from '../core/gear.js';
import { orderSlotCount, orderLockedHint, orderText, orderUpCost, orderLvMult } from '../core/orders.js';
import { esc, img, fmt, openModal, closeModal, toast, markup } from './util.js';

const R = (a) => REALMS[a.realm];
// 叠位到 99 之后不能再画星星，改成数字 + 一档小标
const awk = (n) => `叠位 ${n || 0}`;

export function itemDef(app, it) {
  const d = app.data;
  return (it.kind === 'wheel' ? d.wheelById : it.kind === 'relic' ? d.relicById : d.covById)[it.defId];
}
export function itemText(app, it) {
  const def = itemDef(app, it);
  if (it.kind === 'wheel') return wheelText(def, it.lv);
  if (it.kind === 'relic') return relicText(def, it.lv);
  const th = covTheme(def.id);
  const f = (o) => Object.entries(o).map(([k, v]) => `${k}+${Math.round(v * (1 + 0.08 * it.lv))}`).join(' ');
  return `${th.zh}套：2件 ${f(th.two)}；4件 ${f(th.four)}`.replace(/atkPct/g, '攻击%').replace(/hpPct/g, '生命%').replace(/defPct/g, '防御%').replace(/critRate/g, '暴击').replace(/critDmg/g, '爆伤').replace(/amp/g, '增伤').replace(/aliGain/g, '共鸣回复').replace(/keyGain/g, '钥焰回复').replace(/healBonus/g, '治疗').replace(/shieldBonus/g, '护盾').replace(/steal/g, '吸血').replace(/openAli/g, '起始共鸣').replace(/openKey/g, '起始钥焰').replace(/firstBoost/g, '首击增伤');
}
const rarCls = (r) => `r-${r}`;

function itemCard(app, it, extra = '') {
  const def = itemDef(app, it);
  const who = holder(app, it.uid);
  return `<div class="item ${rarCls(def.rarity || 'SR')} ${isEquipped(app.state, it.uid) ? 'eq' : ''}" data-uid="${it.uid}">
    <img src="${img(def.img)}" alt="" loading="lazy"><div class="i-body"><b>${esc(def.zh)}</b> <em>${def.rarity || ''} Lv${it.lv}${it.rf ? ` · 精炼+${it.rf}` : ''}</em><small>${esc(itemText(app, it))}</small>${who ? `<small class="who">装备于 ${esc(who)}</small>` : ''}</div>${extra}</div>`;
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

export function teamPage(app) {
  const { state: s, data } = app;
  const t = teamDefs(s, data);
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => s.team[i] || null);
  const synText = t.synergy ? `同领域加成 +${Math.round(t.synergy * 100)}% 生命/攻击` : '同领域 3 人 +8%，4 人 +15%';
  const cards = slots.map((slug, i) => {
    if (!slug) return `<div class="slot empty" data-act="pick-slot" data-i="${i}">＋ 选择唤醒体</div>`;
    const a = data.bySlug[slug], d = t.list.find((x) => x.slug === slug), r = s.roster[slug];
    return `<div class="slot" style="--rc:${R(a).color}" data-act="pick-slot" data-i="${i}">
      <img src="${img(a.portrait)}" alt=""><div><b>${esc(a.zh)}</b><small>${R(a).zh} · ${TYPES[a.type].zh}</small>
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
    return `<div class="relic-slot ${rarCls(def.rarity)}" data-act="pick-relic" data-i="${i}"><img src="${img(def.img)}" alt=""><small><b>${esc(def.zh)}</b><br>${esc(itemText(app, it))}</small></div>`;
  }).join('');

  const pre = Object.entries(PRESETS).map(([k, p]) => `<button class="btn sm ${s.strategy.preset === k ? 'on' : ''}" data-act="preset" data-k="${k}">${p.zh}</button>`).join('');
  const on = orderSlotCount(s.maxStage);
  const ochips = Array.from({ length: ORDER_SLOTS }, (_, i) => {
    if (i >= on) return `<span class="ochip locked">🔒 最高通关 ${orderLockedHint(i, s.maxStage)} 关</span>`;
    const id = s.orders.slots[i], def = id && data.orderById[id];
    return def ? `<span class="ochip on" title="${esc(orderText(def, s.orders.owned[id]))}">${oglyph(def)} ${esc(def.zh)}<em>Lv${s.orders.owned[id]}</em></span>` : `<span class="ochip">空位 ${i + 1}</span>`;
  }).join('');
  return `<div class="page">
    <h2>队伍编成 <small>战力 ${fmt(t.power)}</small></h2>
    <p class="hint">${synText}。站位按从左到右依次行动；守护被敌人攻击的概率更高。</p>
    <div class="slots">${cards}</div>
    <div class="row"><button class="btn gold" data-act="autoteam">一键配队</button><button class="btn sm" data-act="guide-growth">养成指南</button></div>
    <p class="hint">「一键配队」会一起排好：4 人队伍（含同界域加成）、每人的命轮与密契、已解锁格里的造物（优先凑羁绊）、3 个钥令位。</p>
    <h3>战斗策略 <small>全自动，仅可设定倾向</small></h3>
    <div class="row">${pre}</div>
    <p class="hint">${PRESETS[s.strategy.preset]?.zh || ''}：血量低于 ${Math.round(s.strategy.defend * 100)}% 时优先架势；目标选择：${{ low: '血量最低', first: '前排优先', atk: '攻击最高' }[s.strategy.target]}。</p>
    <h3>造物栏 <small>全队被动 · ${n}/${RELIC_SLOTS} 格</small></h3>
    <div class="relic-row">${relics}</div>
    <h4>造物羁绊 <small class="dim">同主题 2 / 4 / 6 件</small></h4>
    ${bondPanel(app)}
    <h3>钥令 <small>全队 3 位 · 已开 ${on}/${ORDER_SLOTS}</small></h3>
    <div class="orderbar">${ochips}</div>
    <div class="row"><button class="btn sm" data-act="go-orders">配置钥令 →</button></div>
  </div>`;
}

export function pickAwakener(app, title, onPick, exclude = []) {
  const { state: s, data } = app;
  const list = Object.keys(s.roster).filter((x) => !exclude.includes(x)).map((x) => ({ x, p: allyDef(s, data, x, [x]).power })).sort((a, b) => b.p - a.p);
  const html = `<h3>${title}</h3><div class="grid mini">${list.map(({ x, p }) => { const a = data.bySlug[x]; const r = s.roster[x]; return `<div class="tile" style="--rc:${R(a).color}" data-pick="${x}"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${r.lv} ${awk(r.star)}</small><small>${fmt(p)}</small></div>`; }).join('')}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { closeModal(); onPick(t.dataset.pick); } });
}

export function pickItem(app, kind, title, onPick, { allowNone = true } = {}) {
  const items = Object.values(app.state.gear.items).filter((i) => i.kind === kind).sort((a, b) => (RARITY_ORDER[itemDef(app, b).rarity || 'SR'] - RARITY_ORDER[itemDef(app, a).rarity || 'SR']) || b.lv - a.lv);
  const html = `<h3>${title}</h3>${allowNone ? '<button class="btn sm" data-pick="">卸下</button>' : ''}<div class="list">${items.map((i) => itemCard(app, i, `<button class="btn sm" data-pick="${i.uid}">选择</button>`)).join('') || '<p class="hint">没有可用的装备，去推图或祈愿获取。</p>'}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { closeModal(); onPick(t.dataset.pick); } });
}

export function pickOrder(app, i, onPick) {
  const { state: s, data } = app;
  const owned = Object.keys(s.orders.owned).map((id) => data.orderById[id]).filter(Boolean);
  const html = `<h3>第 ${i + 1} 个钥令位</h3><button class="btn sm" data-pick="">清空</button>
    <div class="list">${owned.map((def) => {
      const lv = s.orders.owned[def.id], used = s.orders.slots.some((x, j) => x === def.id && j !== i);
      return `<div class="item ${rarCls(def.rarity)}">${oglyph(def)}<div class="i-body"><b>${esc(def.zh)}</b> <em>Lv${lv}</em><small>${esc(orderText(def, lv))}</small>${used ? '<small class="who">已装在别的位置</small>' : ''}</div><button class="btn sm" data-pick="${def.id}" ${used ? 'disabled' : ''}>选择</button></div>`;
    }).join('') || '<p class="hint">还没有钥令。Boss 首通、无限塔每 10 层、周 Boss 里程碑、银芯商店都会给。</p>'}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t && !t.disabled) { closeModal(); onPick(t.dataset.pick); } });
}

/* ----------------------------- ROSTER ----------------------------- */
export function rosterPage(app) {
  const { state: s, data } = app;
  const f = app.ui.rosterFilter ||= { realm: '', type: '', owned: false };
  const list = data.awakeners.filter((a) => (!f.realm || a.realm === f.realm) && (!f.type || a.type === f.type) && (!f.owned || s.roster[a.slug]))
    .sort((a, b) => (!!s.roster[b.slug] - !!s.roster[a.slug]) || RARITY_ORDER[b.rarity] - RARITY_ORDER[a.rarity] || data.awakeners.indexOf(a) - data.awakeners.indexOf(b));
  const opt = (obj, cur, k) => `<select data-filter="${k}"><option value="">全部</option>${Object.entries(obj).map(([v, o]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${o.zh}</option>`).join('')}</select>`;
  return `<div class="page"><h2>唤醒体 <small>${Object.keys(s.roster).length}/${data.awakeners.length}</small></h2>
    <div class="row filters">${opt(REALMS, f.realm, 'realm')}${opt(TYPES, f.type, 'type')}<label><input type="checkbox" data-filter="owned" ${f.owned ? 'checked' : ''}> 仅已拥有</label></div>
    <div class="grid">${list.map((a) => { const r = s.roster[a.slug]; return `<div class="tile ${r ? '' : 'locked'} ${rarCls(a.rarity)}" style="--rc:${R(a).color}" data-act="detail" data-slug="${a.slug}">
      <img src="${img(a.portrait)}" alt="" loading="lazy"><b>${esc(a.zh)}</b><small>${r ? `Lv${r.lv} · 叠${r.star}` : '未获得'} · ${TYPES[a.type].short}</small></div>`; }).join('')}</div></div>`;
}

const NUM_ZH = { dmg: '伤害', shield: '护盾', gauge: '狂气' };
const numLine = (sk) => {
  const n = sk.real?.nums, c = sk.real?.cur;
  if (!n || !Object.keys(n).length) return '';
  const part = (k) => `${NUM_ZH[k]} ${n[k][0] === n[k][1] ? n[k][0] : `${n[k][0]}–${n[k][1]}`}${k === 'gauge' ? '' : '%'} → <b>${c[k]}${k === 'gauge' ? '' : '%'}</b>`;
  return `<small class="nums">原作数值（Lv.1–5 → 当前）：${Object.keys(n).map(part).join('　')}</small>`;
};

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
  const view = r ? allyDef(s, data, slug, [slug]) : null;
  const preview = r || { lv: 1, star: 0, brk: 0 };
  const st = view || (() => { const ghost = { ...s, roster: { ...s.roster, [slug]: preview } }; return allyDef(ghost, data, slug, [slug]); })();
  const lvl = skillLevel(preview.lv, preview.star), kit = data.kit(slug, lvl);
  const eq = s.gear.equip[slug] || {};
  const slotBox = (key, kind, label) => { const it = eq[key] && s.gear.items[eq[key]]; const def = it && itemDef(app, it); return `<div class="eqslot" data-act="equip-slot" data-slug="${slug}" data-kind="${kind}">${def ? `<img src="${img(def.img)}" alt=""><span><b>${esc(def.zh)}</b> Lv${it.lv}<br><small>${esc(itemText(app, it))}</small></span>` : `<span class="empty">＋ ${label}</span>`}</div>`; };

  const cap = r ? levelCap(r.star) : MAX_LV;
  const needBrk = r && r.lv < cap && breakNeeded(r.lv, r.brk);
  const cost = r && r.lv < cap && !needBrk ? lvUpCost(r.lv) : 0;
  const brkCost = needBrk ? breakCost(r.lv) : null;
  const awkCost = r && r.star < MAX_AWAKEN ? awakenCost(r.star) : 0;
  const g = growthPerLevel(a, preview.star);
  const perBattle = Math.round(stageGold(Math.max(1, s.maxStage)) * (1 + (view?.goldBonus || 0) / 100));

  const growBtns = r ? `<div class="row">
      <button class="btn" data-act="lvup" data-slug="${slug}" data-n="1" ${cost && s.gold >= cost ? '' : 'disabled'}>升级 (${fmt(cost)})</button>
      <button class="btn" data-act="lvup" data-slug="${slug}" data-n="10" ${cost && s.gold >= cost ? '' : 'disabled'}>×10</button>
      <button class="btn" data-act="lvmax" data-slug="${slug}" ${cost ? '' : 'disabled'}>升至最高</button>
      ${needBrk ? `<button class="btn gold" data-act="brk" data-slug="${slug}" ${s.gold >= brkCost.gold && s.cores >= brkCost.cores ? '' : 'disabled'}>突破 Lv${r.lv}→${r.lv + 1}（🪙${fmt(brkCost.gold)} 💠${brkCost.cores}）</button>` : ''}
    </div>` : '';

  const html = `<div class="detail" style="--rc:${R(a).color}">
    <div class="d-art"><img src="${img(a.card)}" alt="${esc(a.zh)}立绘" data-act="zoom" data-slug="${slug}" loading="lazy"><span class="zoomhint">点立绘看大图</span></div>
    <div class="d-body"><h3>${esc(a.zh)} <small>${esc(a.en)}</small></h3>
      <div class="tags"><span class="tag" style="background:${R(a).color}">${R(a).zh}</span><span class="tag">${TYPES[a.type].zh}</span><span class="tag ${rarCls(a.rarity)}">${a.rarity === 'Genesis' ? '创生' : a.rarity}</span></div>
      ${r ? `<div class="lv">Lv <b>${r.lv}</b>/${cap}　<span class="awaken">${awk(r.star)}/${MAX_AWAKEN}</span>${r.brk ? `　已突破 ${r.brk} 次` : ''}</div>` : '<div class="lv dim">尚未获得 · 通过召唤获取</div>'}
      <div class="stats"><span>生命 <b>${fmt(st.hp)}</b></span><span>攻击 <b>${fmt(st.atk)}</b></span><span>防御 <b>${fmt(st.def)}</b></span><span>暴击 <b>${st.critRate.toFixed(1)}%</b></span><span>爆伤 <b>${st.critDmg.toFixed(0)}%</b></span><span>增伤 <b>${st.amp.toFixed(0)}%</b></span><span>战力 <b>${fmt(power(st))}</b></span>${st.openAli ? `<span>起始共鸣 <b>${Math.round(st.openAli)}</b></span>` : ''}${st.openKey ? `<span>起始钥焰 <b>${Math.round(st.openKey)}</b></span>` : ''}</div>
      <p class="hint">每级成长：生命 +${g.hp}　攻击 +${g.atk}　防御 +${g.def}（已含叠位加成）。技能等级 Lv.${lvl + 1}/5。</p>
      ${growBtns}
      ${r ? `<div class="row"><button class="btn sm" data-act="awaken" data-slug="${slug}" ${awkCost && s.cores >= awkCost ? '' : 'disabled'} title="重复抽取同一唤醒体也能 +1 叠位">叠位 +1（💠${awkCost || '满'}）</button>
        <button class="btn sm" data-act="guide-growth">升级材料从哪来？</button></div>` : ''}
      <h4>叠位效果 <small class="dim">${awk(r?.star || 0)} / ${MAX_AWAKEN}</small></h4>
      ${awakenTable(preview)}
      ${r ? `<div class="eqrow">${slotBox('wheel', 'wheel', '命轮')}${slotBox('cov', 'covenant', '密契')}</div>` : ''}
      <h4>技能 <small class="dim">技能等级 Lv.${lvl + 1}/5（每 15 级 +1，每 ${AWAKEN_SKILL_EVERY} 叠位 +1）</small></h4><div class="skills">${SLOTS.map((k) => `<div class="skill"><b class="sk ${k}">${SLOT_ZH[k]}</b> <em>${esc(kit[k].name)}</em>${kit[k].real?.e ? ` <small class="en">${esc(kit[k].real.e)}</small>` : ''}<small>本作效果：${esc(describeSkill(kit[k]))}</small>${numLine(kit[k])}${kit[k].real ? `<details><summary>原作技能文本（译）</summary><p class="real">${markup(kit[k].real.d, data.kw)}</p></details>` : ''}</div>`).join('')}</div>
      ${a.rk_en?.length ? `<details class="en-box"><summary>启灵（原作文本，仅供参考）</summary>${a.rk_en.map((x) => `<div class="skill"><b>${esc(x.ty)}</b> <em>${esc(x.n)}</em><p class="real">${markup(x.d, data.kw)}</p></div>`).join('')}</details>` : ''}
      <div class="matsrc">
        <b>升级材料一览</b>
        <div><span>经验 = 金币</span><em>当前第 ${s.maxStage || 1} 关挂机约 ${fmt(perBattle)} 金币/场，每小时约 ${fmt(Math.round(perBattle * BATTLES_PER_HOUR))}；另有首通、周 Boss、无限塔、分解装备。</em></div>
        <div><span>突破（每 ${LEVEL_GATE} 级）</span><em>金币 + 银芯。银芯来自 Boss 首通、成就、签到、周 Boss、属性塔、竞技场、分解装备。</em></div>
        <div><span>叠位（上限 ${MAX_AWAKEN}）</span><em>抽到重复唤醒体 +1；也可用银芯共鸣（成本 ${awakenCost(r?.star || 0)} 起，每层 +5）。</em></div>
      </div>
    </div></div>`;
  openModal(html, 'wide');
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
      <div><span>叠位</span><span>重复唤醒体，或 💠${awakenCost(0)} 起</span><span>${MAX_AWAKEN}</span><span>召唤（含保底）、银芯共鸣</span></div>
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
  const { state: s, data } = app;
  const tab = app.ui.gearTab ||= 'wheel';
  const items = Object.values(s.gear.items).filter((i) => i.kind === tab)
    .sort((a, b) => (RARITY_ORDER[itemDef(app, b).rarity || 'SR'] - RARITY_ORDER[itemDef(app, a).rarity || 'SR']) || b.lv - a.lv);
  const tabs = [['wheel', '命轮'], ['covenant', '密契'], ['relic', '造物']].map(([k, z]) => `<button class="btn sm ${tab === k ? 'on' : ''}" data-act="gear-tab" data-k="${k}">${z} ${Object.values(s.gear.items).filter((i) => i.kind === k).length}</button>`).join('');
  const rows = items.map((it) => {
    const def = itemDef(app, it);
    const cost = it.lv < GEAR_MAX_LV ? gearCost(it.kind, it.lv) : 0, rc = refineCost(it);
    const eqd = isEquipped(s, it.uid);
    const btns = `<div class="ibtns"><button class="btn sm" data-act="gear-equip" data-uid="${it.uid}">${tab === 'relic' ? (eqd ? '卸下' : '装备') : '装备'}</button><button class="btn sm" data-act="gear-up" data-uid="${it.uid}" ${cost && s.gold >= cost ? '' : 'disabled'}>${cost ? `强化 ${fmt(cost)}` : '满级'}</button><button class="btn sm" data-act="gear-refine" data-uid="${it.uid}" ${rc && s.cores >= rc ? '' : 'disabled'} title="精炼：每阶 +8% 该装备全部加成">${rc ? `精炼 💠${rc}` : '精炼满'}</button><button class="btn sm danger" data-act="gear-dis" data-uid="${it.uid}" ${eqd ? 'disabled' : ''}>分解 ${fmt(dismantleValue(def.rarity || 'SR', it.lv))}${dismantleCores(def.rarity, it) ? ` +💠${dismantleCores(def.rarity, it)}` : ''}</button></div>`;
    return itemCard(app, it, btns);
  }).join('') || '<p class="hint">暂无。推图有概率掉落，也可在「召唤」页用金币祈愿。</p>';

  // 队伍里每个人的命轮 / 密契槽位：点一下直接换，不用先点进角色详情
  const slot = (slug, kind) => {
    const eq = s.gear.equip[slug] || {};
    const uid = eq[kind === 'wheel' ? 'wheel' : 'cov'], it = uid && s.gear.items[uid];
    if (!it) return `<button class="eqslot empty" data-act="gear-slot" data-slug="${slug}" data-kind="${kind}"><span class="plus">＋</span><small>${kind === 'wheel' ? '命轮' : '密契'}</small></button>`;
    const def = itemDef(app, it);
    return `<button class="eqslot on ${rarCls(def.rarity)}" data-act="gear-slot" data-slug="${slug}" data-kind="${kind}" title="${esc(itemText(app, it))}">
      <img src="${img(def.img)}" alt=""><b>${esc(def.zh)}</b><small>Lv${it.lv}${it.rf ? ` · 精炼+${it.rf}` : ''}</small></button>`;
  };
  const teamRows = (s.team || []).map((slug) => {
    const a = data.bySlug[slug], r = s.roster[slug];
    if (!a || !r) return '';
    return `<div class="eqrow">
      <div class="eqwho"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${r.lv} · ${awk(r.star)}</small></div>
      ${slot(slug, 'wheel')}${slot(slug, 'covenant')}</div>`;
  }).join('');
  const covCount = {};
  for (const slug of s.team) { const ci = (s.gear.equip[slug] || {}).cov && s.gear.items[(s.gear.equip[slug] || {}).cov]; if (ci) covCount[ci.defId] = (covCount[ci.defId] || 0) + 1; }
  const sets = Object.entries(covCount).filter(([, n]) => n >= 2).map(([id, n]) => `${esc(data.covById[id]?.zh || id)} ×${n}`);
  return `<div class="page"><h2>命轮 · 密契 <small>每人各 1 件</small></h2>
    <p class="hint">命轮与密契是<b>绑在单个唤醒体身上</b>的两件装备：点下面的槽位直接更换，点「已装备」的槽位可以卸下。密契全队同款凑到 2 / 4 件会触发套装效果（当前：${sets.length ? sets.join('、') : '还没有凑成套'}）。造物与钥令是全队被动，分别在队伍页与钥令页配置。</p>
    <div class="eqpanel">${teamRows}</div>
    <p class="hint">想一次性配好？回队伍页点「一键配队」，会连着命轮、密契、造物、钥令一起排。</p>
    <h3>${tab === 'relic' ? '造物库存' : '库存'} <small>${items.length} 件</small></h3>
    <div class="row">${tabs}</div><div class="list">${rows}</div></div>`;
}

/* ----------------------------- ORDERS (钥令) ----------------------------- */
// 钥令图标：改用原作 KeyToken 素材（img/key/*.webp），没有图时退回首字
const oglyph = (def) => (def.img
  ? `<span class="oglyph r-${def.rarity}"><img src="${img(def.img)}" alt="${esc(def.zh)}" loading="lazy"></span>`
  : `<span class="oglyph r-${def.rarity}">${esc(def.glyph)}</span>`);

export function ordersPage(app) {
  const { state: s, data } = app;
  const n = orderSlotCount(s.maxStage);
  const slots = Array.from({ length: ORDER_SLOTS }, (_, i) => {
    if (i >= n) return `<div class="oslot locked" >🔒 ${i + 1} 号位<br><small>最高通关 ${orderLockedHint(i, s.maxStage)} 关解锁</small></div>`;
    const id = s.orders.slots[i], def = id && data.orderById[id];
    return `<div class="oslot ${def ? 'on r-' + def.rarity : 'empty'}" data-act="pick-order" data-i="${i}">
      ${def ? `${oglyph(def)}<div><b>${esc(def.zh)}</b> Lv${s.orders.owned[id]}<small>${esc(orderText(def, s.orders.owned[id]))}</small></div>` : `＋ 空位 ${i + 1}`}</div>`;
  }).join('');
  const owned = data.orders.filter((o) => s.orders.owned[o.id] != null);
  const locked = data.orders.filter((o) => s.orders.owned[o.id] == null);
  const card = (def, have) => {
    const lv = s.orders.owned[def.id] || 0;
    const c = orderUpCost(lv);
    const on = s.orders.slots.includes(def.id);
    return `<div class="order ${have ? '' : 'locked'} ${on ? 'on' : ''} ${rarCls(def.rarity)}">
      ${oglyph(def)}
      <div class="ob"><b>${esc(def.zh)}</b> <em>${def.rarity}${def.realm ? ` · ${esc(def.realm)}` : ''}${have ? ` · Lv${lv}/${ORDER_MAX_LV}` : ''}</em>
        <small>${have ? esc(orderText(def, lv)) : '未获得'}</small>
        ${have && lv < ORDER_MAX_LV ? `<small class="dim">下一级：${esc(bonusText(Object.fromEntries(Object.entries(def.bonus).map(([k, v]) => [k, v * (orderLvMult(lv + 1) - orderLvMult(lv))]))))}</small>` : ''}
        <small class="flavor">${esc(def.desc)}</small></div>
      ${have ? `<div class="ibtns"><button class="btn sm" data-act="order-up" data-id="${def.id}" ${c && s.cores >= c ? '' : 'disabled'}>${c ? `淬炼 💠${c}` : '已满'}</button></div>` : ''}
    </div>`;
  };
  return `<div class="page"><h2>钥令 <small>已开 ${n}/${ORDER_SLOTS} 位 · 全队生效</small></h2>
    <p class="hint">钥令是第三套队伍配置：命轮、密契绑在单个人身上，造物和钥令则是全队被动。钥令偏「开局与规则」——起始共鸣 / 钥焰、首击增伤、濒死存活、金币收益。淬炼每级 +${Math.round(orderLvMult(1) * 100 - 100)}% 效果，上限 Lv${ORDER_MAX_LV}。</p>
    <div class="oslots">${slots}</div>
    <h3>已获得 <small>${owned.length}/${data.orders.length}</small></h3>
    <div class="olist">${owned.map((o) => card(o, true)).join('') || '<p class="hint">还没有钥令——打第一个 Boss 首通就会掉。</p>'}</div>
    <details class="en-box"><summary>未获得的钥令（${locked.length}）</summary><div class="olist dim">${locked.map((o) => card(o, false)).join('')}</div></details>
    <p class="hint">掉落：每关 Boss 首通必掉 1 个 · 无限塔每 10 层 · 周 Boss 累计伤害里程碑 · 银芯商店「钥令匣」。重复获得的钥令折算 💠30。</p>
  </div>`;
}

/* ----------------------------- SUMMON ----------------------------- */
export function summonPage(app) {
  const { state: s } = app;
  const p = s.pity;
  return `<div class="page"><h2>召唤</h2>
    <div class="banner-card"><h3>唤醒体召唤</h3>
      <p>召唤券：<b>${s.tickets}</b>　　创生保底：<b>${p.genesis}/${PULL_PITY_GENESIS}</b>　　史诗保底：<b>${p.ssr}/10</b></p>
      <div class="row"><button class="btn big" data-act="pull" data-n="1" ${s.tickets >= 1 ? '' : 'disabled'}>单抽 ×1</button><button class="btn big gold" data-act="pull" data-n="10" ${s.tickets >= 10 ? '' : 'disabled'}>十连 ×10</button></div>
      <p class="hint">概率：精良 60% · 史诗 37% · 创生 3%（第 38 抽起逐步提升，${PULL_PITY_GENESIS} 抽必出）。十连至少 1 个史诗以上。重复获得 = 叠位 +1（上限 ${MAX_AWAKEN}），满叠位折算金币与银芯。</p></div>
    <div class="banner-card"><h3>银芯召唤 <small>💠 ${fmt(s.cores)}</small></h3>
      <p class="hint">银芯来自首通、成就、签到、周 Boss、属性塔、竞技场和分解装备。与召唤券共用保底。</p>
      <div class="row"><button class="btn big" data-act="cpull" data-n="1" ${s.cores >= CORE_PULL_COST ? '' : 'disabled'}>单抽 💠${CORE_PULL_COST}</button><button class="btn big gold" data-act="cpull" data-n="10" ${s.cores >= CORE_PULL10_COST ? '' : 'disabled'}>十连 💠${CORE_PULL10_COST}</button>
      <button class="btn big" data-act="cepull" ${s.cores >= EQUIP_CORE_COST ? '' : 'disabled'}>精选祈愿（SR 以上装备）💠${EQUIP_CORE_COST}</button></div></div>
    <div class="banner-card"><h3>银芯商店 <small>每日 0 点（UTC）刷新限购</small></h3>
      <div class="shop">${SHOP.map((x) => { const n = boughtToday(s, x.id); return `<div class="shopi"><b>${x.zh}</b><small>今日 ${n}/${x.limit}</small><button class="btn sm" data-act="shop-buy" data-id="${x.id}" ${n < x.limit && s.cores >= x.cost ? '' : 'disabled'}>💠 ${x.cost}</button></div>`; }).join('')}</div></div>
    <div class="banner-card"><h3>装备祈愿</h3>
      <p>金币：<b>${fmt(s.gold)}</b>　每次 ${EQUIP_PULL_COST} 金币，随机获得命轮 / 密契 / 造物。</p>
      <div class="row"><button class="btn big" data-act="epull" data-n="1" ${s.gold >= EQUIP_PULL_COST ? '' : 'disabled'}>祈愿 ×1</button><button class="btn big" data-act="epull" data-n="5" ${s.gold >= EQUIP_PULL_COST * 5 ? '' : 'disabled'}>祈愿 ×5</button></div></div>
  </div>`;
}
export function showPulls(app, out) {
  const { data } = app;
  const html = `<h3>召唤结果</h3><div class="grid mini pulls">${out.map((p) => { const a = data.bySlug[p.slug]; return `<div class="tile ${rarCls(p.rarity)} pull" style="--rc:${R(a).color}"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${p.isNew ? '<em class="new">NEW</em>' : p.gold ? `+${p.gold}金币` : `叠位 ${p.star}`}</small></div>`; }).join('')}</div>`;
  openModal(html, 'wide');
}
export function showItems(app, items) {
  openModal(`<h3>获得装备</h3><div class="list">${items.map((i) => itemCard(app, i)).join('')}</div>`, 'wide');
}
export function showOrders(app, orders) {
  openModal(`<h3>获得钥令</h3><div class="list">${orders.map((o) => { const def = app.data.orderById[o.id]; return `<div class="order on ${rarCls(def.rarity)}">${oglyph(def)}<div class="ob"><b>${esc(def.zh)}</b> <em>${def.rarity}${def.realm ? ` · ${esc(def.realm)}` : ''}</em><small>${esc(orderText(def, 0))}</small><small class="flavor">${esc(def.desc)}</small></div></div>`; }).join('')}</div>`, 'wide');
}

/* ----------------------------- SETTINGS ----------------------------- */
export function settingsPage(app) {
  const s = app.state;
  const st = s.stats;
  return `<div class="page"><h2>设置与存档</h2>
    <div class="banner-card"><h3>新手引导</h3>
      <p class="hint">重新过一遍底部五个分组的介绍（战斗 / 养成 / 召唤 / 挑战 / 更多），随时可跳过。</p>
      <div class="row"><button class="btn" data-act="guide">重看新手引导</button><button class="btn" data-act="guide-growth">养成指南</button></div></div>
    <div class="banner-card"><h3>战斗节奏</h3>
      <p class="hint">本作没有倍速与「极速跳过」：战斗按固定节奏播放，胜负由队伍强度与策略决定，挂机收益按 ${Math.round(3600 / BATTLES_PER_HOUR)} 秒一场结算（离线同样口径）。关掉「自动挂机」是手动挂机——照常连打，但停在当前关不再自动推进，用右上角 ◀ ▶ 自己换关。</p></div>
    <div class="banner-card"><h3>每日奖励</h3><p class="hint">每日奖励已并入「签到」页（月历、累计宝箱、可补签）。</p></div>
    <div class="banner-card"><h3>声音</h3>
      <label class="snd"><input type="checkbox" data-aud="mute" ${sound.cfg.mute ? 'checked' : ''}> 静音</label>
      <label class="snd">音效 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.sfx * 100)}" data-aud="sfx"></label>
      <label class="snd">背景氛围 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.bgm * 100)}" data-aud="bgm"></label>
      <div class="row">${[['hit', '命中'], ['crit', '暴击'], ['heal', '治疗'], ['shield', '护盾'], ['exalt', '共鸣'], ['win', '胜利'], ['summon', '召唤'], ['ach', '成就']].map(([k, z]) => `<button class="btn sm" data-act="snd-test" data-k="${k}">${z}</button>`).join('')}</div>
      <label class="snd">结算弹窗 <select data-settle>${[['key', '首通 / Boss / 新怪物时'], ['all', '每场战斗'], ['off', '从不（在战斗页手动打开）']].map(([k, z]) => `<option value="${k}" ${settleMode.get() === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <label class="snd">战斗特效 <select data-fx>${[['full', '完整'], ['lite', '简化（少粒子、不震屏）'], ['off', '关闭']].map(([k, z]) => `<option value="${k}" ${fxMode.get() === k ? 'selected' : ''}>${z}</option>`).join('')}</select></label>
      <p class="hint">所有声音均由浏览器实时合成，没有音频文件；首次点击页面后才会发声。命中音色随攻击者界域变化（混沌/血肉/深海/超维）。</p></div>
    <div class="banner-card"><h3>统计</h3><p>战斗 ${st.battles} 场 · 胜利 ${st.wins} · 击杀 ${st.kills} · 累计金币 ${fmt(st.gold)} · 召唤 ${st.pulls} 次 · 最高通关 ${s.maxStage}</p></div>
    <div class="banner-card"><h3>存档</h3>
      <div class="row"><button class="btn" data-act="export">导出存档</button><button class="btn" data-act="import">导入存档</button><button class="btn danger" data-act="reset">重置游戏</button></div>
      <p class="hint">存档保存在浏览器本地（localStorage）。换设备请先导出。离线最多结算 8 小时收益。</p></div>
    <div class="banner-card"><h3>关于</h3>
      <p class="hint">《忘却之夜·挂机录》是基于《忘却前夜》（Morimens）的非官方同人作品，免费、非商业。游戏内的角色、图像素材版权归原权利方所有，数值与技能效果为本作自行设计。如有请联系删除。</p></div></div>`;
}

export function offlineModal(app, rep, onClaim) {
  const items = rep.drops.length;
  const m = openModal(`<h3>欢迎回来</h3><p>离线 ${Math.round(rep.secs / 60)} 分钟（结算 ${Math.round(rep.capped / 60)} 分钟），在第 ${rep.stage} 关挂机 ${rep.battles} 场，预计胜 ${rep.wins} 场。</p>
    <p>金币 <b>+${fmt(rep.gold)}</b>　召唤券 <b>+${rep.tickets}</b>　银芯 <b>+${rep.cores || 0}</b>　装备 <b>+${items}</b></p><button class="btn big gold" data-act="claim-offline">领取</button>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-act="claim-offline"]')) { closeModal(); onClaim(); } });
}
