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
import { sound, TRACK_LIST } from './audio.js';
import {
  SQUAD_KEYS, SQUAD_ZH, SQUAD_MODES, MODE_ZH, MODE_GROUPS, RIFT_MODE, squadMembers, squadUsage, pickedSquad,
  squadLabel, teamSlugsFor, setSquadTeam, setSquadPick, autoSquadSlugs,
} from '../core/squad.js';
import { ROSTER_SORTS, SORT_ZH, sortRoster } from '../core/roster.js';
import { luckOf, luckBarPct, GACHA_LOG_MAX, RARITY_WORTH, RARITY_RATE } from '../core/gacha.js';
import { roundLimitFor, ROUND_LIMIT, FRONT_SLOTS } from '../core/battle.js';
import { fxMode } from './fx.js';
import { settleMode } from './report.js';
import { watchMode } from './replay.js';
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
  const t = slugs.length ? teamDefs(s, data, slugs) : null;
  const used = squadUsage(s, key);
  const av = slugs.length
    ? slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
    : '<span class="sqempty">还没有保存队伍</span>';
  return `<div class="squad ${slugs.length ? 'on' : ''}" data-squad="${key}">
    <header><b>${SQUAD_ZH[key]}</b><small>${slugs.length ? `${slugs.length} 人 · 战力 ${fmt(t.power)}` : '空位'}</small></header>
    <div class="sqav">${av}</div>
    <div class="squse">${used.length ? `挑战在用：${used.join('、')}` : '未被挑战引用'}</div>
    <div class="row">
      <button class="btn sm" data-act="squad-save" data-k="${key}">存为当前队伍</button>
      <button class="btn sm" data-act="squad-load" data-k="${key}" ${slugs.length ? '' : 'disabled'}>上阵</button>
      <button class="btn sm danger" data-act="squad-clear" data-k="${key}" ${slugs.length ? '' : 'disabled'}>清空</button>
    </div></div>`;
}

/** 挑战页顶部的「出战阵容」选择条：当前队伍 / 一队 / 二队 / 三队 + 现场编队 */
export function squadBar(app, mode, note = '') {
  const s = app.state;
  const cur = pickedSquad(s, mode);
  const chip = (k, label, on) => `<button class="sqchip ${on ? 'on' : ''}" data-act="squad-pick" data-mode="${mode}" data-k="${k}">${label}</button>`;
  const list = SQUAD_KEYS.map((k) => {
    const n = squadMembers(s, k).length;
    return chip(k, `${SQUAD_ZH[k]}${n ? `<em>${n}人</em>` : '<em class="dim">空</em>'}`, cur === k);
  }).join('');
  const fb = cur !== 'cur' && !squadMembers(s, cur).length;
  return `<div class="squadbar"><span class="sqh">出战阵容</span>${chip('cur', '当前队伍', cur === 'cur')}${list}
    <button class="btn sm sqedit" data-act="squad-edit" data-mode="${mode}" data-k="${cur === 'cur' ? 'a' : cur}">现场编队</button>
    <small class="dim">${fb ? `「${SQUAD_ZH[cur]}」是空的，暂时按当前队伍打` : note || '在「队伍 → 挑战编队」里指定，或点「现场编队」当场排'}</small></div>`;
}

/* -------- 队伍页的「挑战编队」：每个模式一行，直接在这里指定用哪套 -------- */
export function squadAssignPanel(app) {
  const { state: s, data } = app;
  const row = (m) => {
    const lab = squadLabel(s, m);
    const slugs = teamSlugsFor(s, m).filter((x) => s.roster[x]);
    const t = slugs.length ? teamDefs(s, data, slugs) : null;
    const av = slugs.length
      ? slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(data.bySlug[x].zh)}">`).join('')
      : '<span class="sqempty">空缺</span>';
    const chips = ['cur', ...SQUAD_KEYS].map((k) => {
      const n = k === 'cur' ? s.team.length : squadMembers(s, k).length;
      const zh = k === 'cur' ? '当前队伍' : SQUAD_ZH[k];
      return `<button class="sqchip ${lab.key === k ? 'on' : ''}" data-act="squad-pick" data-mode="${m}" data-k="${k}" title="${n ? `${n} 人` : '这套还空着'}">${zh}${k === 'cur' ? '' : n ? '' : '<em class="dim">空</em>'}</button>`;
    }).join('');
    return `<div class="assign ${lab.key !== 'cur' && !lab.fallback ? 'on' : ''}">
      <header><b>${MODE_ZH[m]}</b><small>${lab.fallback ? `${lab.zh}（空）→ 当前队伍` : `${lab.zh} · ${slugs.length} 人${t ? ` · 战力 ${fmt(t.power)}` : ''}`}</small>
        <button class="btn sm" data-act="squad-edit" data-mode="${m}" data-k="${lab.key === 'cur' ? 'a' : lab.key}">编队</button></header>
      <div class="sqav">${av}</div>
      <div class="achips">${chips}</div></div>`;
  };
  // 融灾禁区不吃单选：它固定按一队~五队的顺序派五个队伍，这里只显示各队编没编、点进去改
  const riftRow = () => {
    const sets = SQUAD_KEYS.map((k) => ({ k, slugs: squadMembers(s, k) }));
    const filled = sets.filter((x) => x.slugs.length).length;
    const av = sets.map(({ k, slugs }) => `<span class="sqset ${slugs.length ? '' : 'e'}">${slugs.length
      ? slugs.map((x) => `<img src="${img(data.bySlug[x].portrait)}" alt="" title="${esc(SQUAD_ZH[k])} · ${esc(data.bySlug[x].zh)}">`).join('')
      : '<i>空</i>'}</span>`).join('');
    const chips = sets.map(({ k, slugs }) => `<button class="sqchip ${slugs.length ? '' : 'empty'}" data-act="squad-edit" data-k="${k}" data-mode="${RIFT_MODE}" title="${slugs.length ? `${SQUAD_ZH[k]} ${slugs.length} 人，点击编队` : `${SQUAD_ZH[k]}空着，会用当前队伍顶上`}">${SQUAD_ZH[k]}${slugs.length ? '' : '<em class="dim">空</em>'}</button>`).join('');
    return `<div class="assign ${filled === SQUAD_KEYS.length ? 'on' : ''}">
      <header><b>融灾禁区</b><small>五队齐上 · 已编 ${filled}/${SQUAD_KEYS.length} 队${filled < SQUAD_KEYS.length ? '（空位用当前队伍顶上）' : ''}</small>
        <button class="btn sm" data-act="go-rift">去挑战 →</button></header>
      <div class="sqav sqsets">${av}</div>
      <div class="achips">${chips}</div></div>`;
  };
  return `<div class="assigns">${SQUAD_MODES.map(([m]) => row(m)).join('')}${riftRow()}</div>
    <p class="hint">属性塔的四个界域各存一份选择：编队里不属于该界域的成员会被剔掉，一个都不剩就自动挑你最强的 4 名本界域唤醒体。<b>融灾禁区</b>一层要同时派五队，一队~五队按顺序各打一组敌人，所以那五行都得编好（空着的会用当前队伍顶上）。挑战页也能改，两处是同一份数据。</p>`;
}

/**
 * 编队编辑器：四个槽位 + 界域筛选 + 一键上阵，存到一/二/三队。
 * mode 有值时，保存后把这个挑战入口直接指向刚存的编队。
 */
export function squadEditor(app, { key = 'a', mode = null } = {}) {
  const { state: s, data } = app;
  if (!SQUAD_KEYS.includes(key)) key = 'a';
  const lockRealm = mode && String(mode).startsWith('rt_') ? String(mode).slice(3) : null;
  // 融灾禁区（rift）不吃「用哪一套」，而是五套一起上——所以保存时只存人，不改挑战选择
  const modeZh = mode ? (MODE_ZH[mode] || (mode === RIFT_MODE ? '融灾禁区' : mode)) : '';
  const isRift = mode === RIFT_MODE;
  const powerOf = (slug) => allyDef(s, data, slug, [slug]).power;
  const st = { key, mode, realm: lockRealm || '', team: [...squadMembers(s, key)] };
  if (!st.team.length && mode) st.team = teamSlugsFor(s, mode).filter((x) => s.roster[x]);

  const rows = () => Object.keys(s.roster).map((x, i) => ({ x, a: data.bySlug[x], r: s.roster[x], idx: i, power: powerOf(x) }));
  const cands = () => rows().filter((o) => o.a && (!st.realm || o.a.realm === st.realm)).sort((x, y) => y.power - x.power);

  const body = () => {
    const slots = Array.from({ length: TEAM_SIZE }, (_, i) => {
      const slug = st.team[i], a = slug && data.bySlug[slug];
      if (!a) return `<button class="sqslot empty" data-sq="del" data-i="${i}"><span class="plus">＋</span><small>${i < FRONT_SLOTS ? '前排' : '后排'} ${i + 1}</small></button>`;
      const r = s.roster[slug];
      return `<button class="sqslot on" data-sq="del" data-i="${i}" title="点一下移出"><img src="${img(a.portrait)}" alt="">
        <b>${esc(a.zh)}</b><small>${REALMS[a.realm].zh} · Lv${r.lv} · ${awk(r.star)}</small><small>战力 ${fmt(powerOf(slug))}</small></button>`;
    }).join('');
    const list = cands().map((o) => {
      const on = st.team.includes(o.x), full = st.team.length >= TEAM_SIZE;
      return `<button class="tile ${on ? 'on' : ''} ${full && !on ? 'dis' : ''} ${rarCls(o.a.rarity)} ${o.r ? '' : 'locked'}" style="--rc:${R(o.a).color}" data-sq="add" data-slug="${o.x}">
        <img src="${img(o.a.portrait)}" alt=""><b>${esc(o.a.zh)}</b><small>${REALMS[o.a.realm].zh} · ${TYPES[o.a.type].short} · Lv${o.r.lv} · 叠${o.r.star}</small><small>${fmt(o.power)}</small>
        ${on ? '<i class="tick">✓</i>' : ''}</button>`;
    }).join('');
    const realmChips = [['', '全部'], ...Object.entries(REALMS).map(([k, v]) => [k, v.zh])]
      .map(([k, zh]) => `<button class="sqchip ${st.realm === k ? 'on' : ''}" data-sq="realm" data-v="${k}" ${lockRealm && k !== lockRealm ? 'disabled' : ''}>${zh}</button>`).join('');
    return `<h3>编队 · ${SQUAD_ZH[st.key]} <small>${st.team.length}/${TEAM_SIZE} 人</small></h3>
      <p class="hint">点下面的头像加入这队，点上面的槽位移出；顺序就是站位（前两个是前排）。${lockRealm ? `<b>${REALMS[lockRealm].zh}塔只收${REALMS[lockRealm].zh}界域</b>，筛选已锁定。` : '「一键上阵」按当前筛选的界域取战力最高的 4 名（优先前排守护 + 治疗）。'}
        ${mode ? (isRift ? `保存后 <b>${SQUAD_ZH[st.key]}</b> 就是融灾禁区里的第 ${SQUAD_KEYS.indexOf(st.key) + 1} 队。` : `保存后 <b>${modeZh}</b> 就用这套出战。`) : ''}</p>
      <div class="row sqrealms">${realmChips}</div>
      <div class="sqslots">${slots}</div>
      <div class="row"><button class="btn gold" data-sq="auto">一键上阵</button><button class="btn sm" data-sq="clear" ${st.team.length ? '' : 'disabled'}>清空</button>
        <button class="btn sm" data-sq="from-team">套用当前队伍</button></div>
      <h4>可选唤醒体 <small class="dim">${cands().length} 名</small></h4>
      <div class="grid mini sqpick">${list}</div>
      <div class="row sqsave"><span class="dim">存到</span>
        ${SQUAD_KEYS.map((k) => `<button class="btn ${k === st.key ? 'gold' : ''}" data-sq="save" data-k="${k}" ${st.team.length ? '' : 'disabled'}>${SQUAD_ZH[k]}</button>`).join('')}
      </div>`;
  };

  const m = openModal(body(), 'wide sqeditor');
  const paint = () => { m.querySelector('.modal').innerHTML = `<button class="modal-x" data-act="close">✕</button>${body()}`; };
  m.addEventListener('click', (e) => {
    const el = e.target.closest('[data-sq]');
    if (!el || el.disabled) return;
    const a = el.dataset.sq;
    if (a === 'realm') { st.realm = el.dataset.v; paint(); return; }
    if (a === 'del') {
      const i = +el.dataset.i;
      if (st.team[i]) { st.team.splice(i, 1); paint(); sound.play('click'); }
      return;
    }
    if (a === 'add') {
      const slug = el.dataset.slug, i = st.team.indexOf(slug);
      if (i >= 0) st.team.splice(i, 1);
      else if (st.team.length < TEAM_SIZE) st.team.push(slug);
      else { toast('已经 4 人了，先移出一个'); sound.play('deny'); return; }
      sound.play('click'); paint(); return;
    }
    if (a === 'auto') {
      const pick = autoSquadSlugs(s, data, st.realm, powerOf);
      if (!pick.length) { toast(`没有可用的${st.realm ? REALMS[st.realm].zh : ''}唤醒体`); return; }
      st.team = pick; sound.play('stamp'); paint(); return;
    }
    if (a === 'clear') { st.team = []; sound.play('deny'); paint(); return; }
    if (a === 'from-team') {
      st.team = [...s.team].filter((x) => s.roster[x] && (!st.realm || data.bySlug[x]?.realm === st.realm)).slice(0, TEAM_SIZE);
      sound.play('click'); paint(); return;
    }
    if (a === 'save') {
      if (!st.team.length) { toast('先选人'); return; }
      const k = el.dataset.k;
      const saved = setSquadTeam(s, k, st.team);
      if (st.mode && !isRift) setSquadPick(s, st.mode, k);
      app.save(); sound.play('stamp');
      toast(`已存入「${SQUAD_ZH[k]}」：${saved.length} 人${st.mode ? ` · ${isRift ? '融灾禁区第 ' + (SQUAD_KEYS.indexOf(k) + 1) + ' 队' : modeZh + ' 用它出战'}` : ''}`);
      closeModal();
      app.render?.();
    }
  });
}


export function teamPage(app) {
  const { state: s, data } = app;
  const t = teamDefs(s, data);
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => s.team[i] || null);
  const synText = t.synergy ? `同领域加成 +${Math.round(t.synergy * 100)}% 生命/攻击` : '同领域 3 人 +8%，4 人 +15%';
  const cards = slots.map((slug, i) => {
    const row = i < FRONT_SLOTS ? '前排' : '后排';
    if (!slug) return `<div class="slot empty" data-act="pick-slot" data-i="${i}">＋ 选择唤醒体<small class="pos ${i < FRONT_SLOTS ? 'front' : 'back'}">${row}</small></div>`;
    const a = data.bySlug[slug], d = t.list.find((x) => x.slug === slug), r = s.roster[slug];
    return `<div class="slot" style="--rc:${R(a).color}" data-act="pick-slot" data-i="${i}">
      <img src="${img(a.portrait)}" alt=""><div><b>${esc(a.zh)}</b><small class="typ">${R(a).zh} · ${TYPES[a.type].short}<span class="pos ${i < FRONT_SLOTS ? 'front' : 'back'}">${row}</span></small>
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
    <p class="hint">${synText}。站位 1–2 是<b>前排</b>、3–4 是<b>后排</b>：敌人的单体攻击只会打前排，前排全灭才轮到后排（Boss 例外，可以越过前排）；我方守护也只能打敌阵前排，突击与合唱（远程）可以直接点名后排。每场还有<b>回合上限</b>（普通关 ${ROUND_LIMIT.normal} 回合、Boss 关 ${ROUND_LIMIT.boss} 回合），打不完算超时判负，四奶互相吊着磨是过不去的。</p>
    <div class="slots">${cards}</div>
    <div class="row"><button class="btn gold" data-act="autoteam">一键配队</button><button class="btn sm" data-act="guide-growth">养成指南</button></div>
    <p class="hint">「一键配队」会一起排好：4 人队伍（含同界域加成）、<b>每人 1 件命轮 + 1 件密契</b>、已解锁格里的造物（优先凑羁绊）、3 个钥令位。下面的命轮 / 密契格子可以直接点开换。</p>
    <h3>编队 <small>预先存 3 套，挑战时直接选用</small></h3>
    <div class="squads">${SQUAD_KEYS.map((k) => squadCard(app, k)).join('')}</div>
    <p class="hint">编队只记 4 名唤醒体——命轮、密契绑在人身上会跟着走，造物与钥令本来就是全队共用，不必重复存。<b>推图挂机始终用「当前队伍」</b>，想换阵容就点编队里的「上阵」或直接改上面的 4 个槽位。</p>
    <h3>挑战编队 <small>每个模式单独指定 · 也能现场编</small></h3>
    ${squadAssignPanel(app)}
    <h3>命轮 · 密契 <small>每人各 1 件 · 点格子直接换</small></h3>
    <div class="eqpanel">${equipPanel(app)}</div>
    <p class="hint">命轮与密契<b>绑在单个唤醒体身上</b>；密契全队同款凑到 2 / 4 件触发套装（当前：${covenantSetText(app) || '还没有凑成套'}）。造物与钥令是全队被动，在下面配置。</p>
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
  const f = (app.ui.rosterFilter ||= { realm: '', type: '', owned: false, sort: 'rarity', dir: -1 });
  const idxOf = Object.fromEntries(Object.keys(s.roster).map((x, i) => [x, i]));
  const rows = data.awakeners
    .filter((a) => (!f.realm || a.realm === f.realm) && (!f.type || a.type === f.type) && (!f.owned || s.roster[a.slug]))
    .map((a) => ({ a, r: s.roster[a.slug], idx: idxOf[a.slug], power: s.roster[a.slug] ? allyDef(s, data, a.slug, [a.slug]).power : 0 }));
  const list = sortRoster(rows, f.sort, f.dir);
  const opt = (obj, cur, k) => `<select data-filter="${k}"><option value="">全部</option>${Object.entries(obj).map(([v, o]) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${o.zh}</option>`).join('')}</select>`;
  const sorts = ROSTER_SORTS.map(([k, zh]) => `<button class="btn sm ${f.sort === k ? 'on' : ''}" data-act="roster-sort" data-k="${k}">${zh}${f.sort === k ? (f.dir < 0 ? ' ↓' : ' ↑') : ''}</button>`).join('');
  return `<div class="page"><h2>唤醒体 <small>${Object.keys(s.roster).length}/${data.awakeners.length}</small></h2>
    <div class="row filters"><span class="dim">界域</span>${opt(REALMS, f.realm, 'realm')}<span class="dim">类型</span>${opt(TYPES, f.type, 'type')}<label><input type="checkbox" data-filter="owned" ${f.owned ? 'checked' : ''}> 仅已拥有</label></div>
    <div class="row sortbar"><span class="dim">排序</span>${sorts}</div>
    <div class="grid">${list.map(({ a, r, power: p }) => `<div class="tile ${r ? '' : 'locked'} ${rarCls(a.rarity)} ${a.creator ? 'gift' : ''}" style="--rc:${R(a).color}" data-act="detail" data-slug="${a.slug}">
      <img src="${img(a.portrait)}" alt="" loading="lazy"><b>${esc(a.zh)}</b><small>${r ? `Lv${r.lv} · 叠${r.star} · ${TYPES[a.type].short}` : a.creator ? '未获得 · 联名赠送' : `未获得 · ${TYPES[a.type].short}`}</small><small>${r ? `战力 ${fmt(p)}` : REALMS[a.realm].zh}</small>${a.creator ? '<i class="gmark">联名</i>' : ''}</div>`).join('')}</div>
    <p class="hint">排序：稀有度 / 战力 / 等级 / 叠位数 / 获取顺序 / 界域，再点一次当前排序可以反过来。未获得的永远排在后面，筛选里的「仅已拥有」可以只看已有。<b>带「联名」角标的是社区主播彩蛋</b>，不参与召唤，只从「更多 → 联动」的签到与活动里赠送。</p></div>`;
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
    <div class="d-art"><img src="${img(a.card)}" alt="${esc(a.zh)}立绘" data-act="zoom" data-slug="${slug}" loading="lazy"><span class="zoomhint">${a.creator ? '点开看大图' : '点立绘看大图'}</span></div>
    <div class="d-body"><h3>${esc(a.zh)} <small>${esc(a.en)}</small></h3>
      <div class="tags"><span class="tag" style="background:${R(a).color}">${R(a).zh}</span><span class="tag">${TYPES[a.type].zh}</span><span class="tag ${rarCls(a.rarity)}">${a.rarity === 'Genesis' ? '创生' : a.rarity}</span>${a.creator ? `<span class="tag ctag">${esc(a.creator.emoji)} 联名嘉宾</span>` : ''}</div>
      ${a.creator ? `<div class="cbox"><b>${esc(a.creator.bio)}</b>
        <small><a href="${esc(a.creator.url)}" target="_blank" rel="noopener">bilibili 空间 · UID ${esc(a.creator.uid)}</a> · 只送不抽（签到 / 活动）</small>
        <small class="dim">技能按昵称里的意象原创，非本人设定，也不代表本人观点。</small></div>` : ''}
      ${r ? `<div class="lv">Lv <b>${r.lv}</b>/${cap}　<span class="awaken">${awk(r.star)}/${MAX_AWAKEN}</span>${r.brk ? `　已突破 ${r.brk} 次` : ''}</div>` : `<div class="lv dim">尚未获得 · ${a.creator ? '签到 / 活动赠送' : '通过召唤获取'}</div>`}
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
  const { state: s } = app;
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
  const teamRows = equipPanel(app);
  const sets = covenantSetText(app);
  return `<div class="page"><h2>命轮 · 密契 <small>每人各 1 件</small></h2>
    <p class="hint">命轮与密契是<b>绑在单个唤醒体身上</b>的两件装备：点下面的槽位直接更换，点「已装备」的槽位可以卸下。密契全队同款凑到 2 / 4 件会触发套装效果（当前：${sets || '还没有凑成套'}）。造物与钥令是全队被动，分别在队伍页与钥令页配置。</p>
    <div class="eqpanel">${teamRows}</div>
    <p class="hint">想一次性配好？回队伍页点「一键配队」，会连着命轮、密契、造物、钥令一起排；队伍页也有同一块槽位面板，不用来回切页。</p>
    <h3>${tab === 'relic' ? '造物库存' : '库存'} <small>${items.length} 件</small></h3>
    <div class="row">${tabs}</div><div class="list">${rows}</div></div>`;
}

/* ----------------------------- ORDERS (钥令) ----------------------------- */
// 钥令图标：改用原作 KeyToken 素材（img/key/*.webp）。
// 图没加载出来时（老缓存 / 文件缺失）自动退回首字，不留下破图问号。
const oglyph = (def) => {
  const ch = esc(def.glyph || def.zh.slice(0, 1) || '钥');
  if (!def.img) return `<span class="oglyph r-${def.rarity}">${ch}</span>`;
  return `<span class="oglyph r-${def.rarity}"><i>${ch}</i><img src="${img(def.img)}" alt="${esc(def.zh)}" loading="lazy" onerror="this.remove()"></span>`;
};

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
    const tag = r.isNew ? 'NEW' : r.dup ? `叠位 ${r.star}` : '';
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
  return `<div class="page"><h2>召唤</h2>
    <div class="banner-card"><h3>唤醒体召唤</h3>
      <p>召唤券：<b>${s.tickets}</b>　　创生保底：<b>${p.genesis}/${PULL_PITY_GENESIS}</b>　　史诗保底：<b>${p.ssr}/10</b></p>
      <div class="row"><button class="btn big" data-act="pull" data-n="1" ${s.tickets >= 1 ? '' : 'disabled'}>单抽 ×1</button><button class="btn big gold" data-act="pull" data-n="10" ${s.tickets >= 10 ? '' : 'disabled'}>十连 ×10</button></div>
      <p class="hint">概率：精良 60% · 史诗 37% · 创生 3%（第 38 抽起逐步提升，${PULL_PITY_GENESIS} 抽必出）。十连至少 1 个史诗以上。重复获得 = 叠位 +1（上限 ${MAX_AWAKEN}），满叠位折算金币与银芯。</p></div>
    <div class="banner-card"><h3>银芯召唤 <small>💠 ${fmt(s.cores)}</small></h3>
      <p class="hint">银芯来自首通、成就、签到、周 Boss、属性塔、竞技场和分解装备。与召唤券共用保底。</p>
      <div class="row"><button class="btn big" data-act="cpull" data-n="1" ${s.cores >= CORE_PULL_COST ? '' : 'disabled'}>单抽 💠${CORE_PULL_COST}</button><button class="btn big gold" data-act="cpull" data-n="10" ${s.cores >= CORE_PULL10_COST ? '' : 'disabled'}>十连 💠${CORE_PULL10_COST}</button>
      <button class="btn big" data-act="cepull" ${s.cores >= EQUIP_CORE_COST ? '' : 'disabled'}>精选祈愿（SR 以上装备）💠${EQUIP_CORE_COST}</button></div></div>
    ${luckCard(app)}
    <div class="banner-card"><h3>银芯商店 <small>每日 0 点（UTC）刷新限购</small></h3>
      <div class="shop">${SHOP.map((x) => { const n = boughtToday(s, x.id); return `<div class="shopi"><b>${x.zh}</b><small>今日 ${n}/${x.limit}</small><button class="btn sm" data-act="shop-buy" data-id="${x.id}" ${n < x.limit && s.cores >= x.cost ? '' : 'disabled'}>💠 ${x.cost}</button></div>`; }).join('')}</div></div>
    <div class="banner-card"><h3>装备祈愿</h3>
      <p>金币：<b>${fmt(s.gold)}</b>　每次 ${EQUIP_PULL_COST} 金币，随机获得命轮 / 密契 / 造物。</p>
      <div class="row"><button class="btn big" data-act="epull" data-n="1" ${s.gold >= EQUIP_PULL_COST ? '' : 'disabled'}>祈愿 ×1</button><button class="btn big" data-act="epull" data-n="5" ${s.gold >= EQUIP_PULL_COST * 5 ? '' : 'disabled'}>祈愿 ×5</button></div></div>
  </div>`;
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
      <span class="gn"><b>${esc(a?.zh || r.slug)}</b><small>${RAR_ZH[r.rarity]} · ${r.banner === 'core' ? '银芯召唤' : '召唤券'}</small></span>
      <span class="gt">${r.isNew ? '<em class="new">NEW</em>' : r.dup ? `叠位 ${r.star}` : ''}</span>
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
      <label class="snd">音乐 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.bgm * 100)}" data-aud="bgm"></label>
      <h4>背景音乐 <small>六首曲子都由浏览器实时合成演奏</small></h4>
      <div class="row tracks">
        <button class="btn sm ${sound.cfg.autoMood === false ? '' : 'on'}" data-act="bgm-auto">跟随页面</button>
        ${TRACK_LIST.map((t) => `<button class="btn sm ${sound.cfg.autoMood === false && sound.mood === t.k ? 'on' : ''}" data-act="bgm-track" data-k="${t.k}">${t.zh}</button>`).join('')}
      </div>
      <p class="hint">城镇 / 推图 / 战斗 / 首领 / 召唤 / 挑战各一首；换页面自动换曲并交叉淡入，战斗遇到 Boss 会切到「威压」。点上面的曲名可以锁定一首，点「跟随页面」恢复自动。</p>
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
    ${note}<p>金币 <b>+${fmt(rep.gold)}</b>　召唤券 <b>+${rep.tickets}</b>　银芯 <b>+${rep.cores || 0}</b>　装备 <b>+${items}</b></p><button class="btn big gold" data-act="claim-offline">领取</button>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-act="claim-offline"]')) { closeModal(); onClaim(); } });
}
