import {
  allyDef, teamDefs, levelUp, levelUpMax, setTeam, autoTeam, setPreset, PRESETS, equipItem, unequipItem, isEquipped,
  enhanceItem, dismantle, summon, equipPull, EQUIP_PULL_COST, claimDaily, PULL_PITY_GENESIS, newState, migrate,
} from '../core/game.js';
import { REALMS, TYPES, SLOTS, SLOT_ZH, MAX_LV, MAX_STAR, TEAM_SIZE, RARITY_ZH, RARITY_ORDER, GEAR_MAX_LV } from '../core/constants.js';
import { sound } from './audio.js';
import { lvUpCost, power, skillLevel } from '../core/stats.js';
import { describeSkill } from '../core/skills.js';
import { wheelText, relicText, covTheme, gearCost, dismantleValue, MAINSTAT, COV_THEMES } from '../core/gear.js';
import { esc, img, fmt, openModal, closeModal, toast, store, markup } from './util.js';

const R = (a) => REALMS[a.realm];
const stars = (n) => '★'.repeat(n) + '☆'.repeat(MAX_STAR - n);

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
    <img src="${img(def.img)}" alt="" loading="lazy"><div class="i-body"><b>${esc(def.zh)}</b> <em>${def.rarity || ''} Lv${it.lv}</em><small>${esc(itemText(app, it))}</small>${who ? `<small class="who">装备于 ${esc(who)}</small>` : ''}</div>${extra}</div>`;
}
function holder(app, uid) {
  const s = app.state;
  if (s.gear.relics.includes(uid)) return '队伍造物栏';
  for (const [slug, e] of Object.entries(s.gear.equip)) if (e.wheel === uid || e.cov === uid) return app.data.bySlug[slug]?.zh;
  return '';
}

/* ----------------------------- TEAM ----------------------------- */
export function teamPage(app) {
  const { state: s, data } = app;
  const t = teamDefs(s, data);
  const slots = Array.from({ length: TEAM_SIZE }, (_, i) => s.team[i] || null);
  const synText = t.synergy ? `同领域加成 +${Math.round(t.synergy * 100)}% 生命/攻击` : '同领域 3 人 +8%，4 人 +15%';
  const cards = slots.map((slug, i) => {
    if (!slug) return `<div class="slot empty" data-act="pick-slot" data-i="${i}">＋ 选择唤醒体</div>`;
    const a = data.bySlug[slug], d = t.list.find((x) => x.slug === slug);
    return `<div class="slot" style="--rc:${R(a).color}" data-act="pick-slot" data-i="${i}">
      <img src="${img(a.portrait)}" alt=""><div><b>${esc(a.zh)}</b><small>${R(a).zh} · ${TYPES[a.type].zh}</small>
      <small>Lv${s.roster[slug].lv} ${stars(s.roster[slug].star)}</small><small>战力 ${fmt(d.power)}</small></div>
      <button class="btn sm" data-act="detail" data-slug="${slug}">详情</button></div>`;
  }).join('');
  const relics = s.gear.relics.map((uid, i) => {
    const it = uid && s.gear.items[uid];
    if (!it) return `<div class="relic-slot empty" data-act="pick-relic" data-i="${i}">＋ 造物 ${i + 1}</div>`;
    const def = itemDef(app, it);
    return `<div class="relic-slot ${rarCls(def.rarity)}" data-act="pick-relic" data-i="${i}"><img src="${img(def.img)}" alt=""><small><b>${esc(def.zh)}</b><br>${esc(itemText(app, it))}</small></div>`;
  }).join('');
  const pre = Object.entries(PRESETS).map(([k, p]) => `<button class="btn sm ${s.strategy.preset === k ? 'on' : ''}" data-act="preset" data-k="${k}">${p.zh}</button>`).join('');
  return `<div class="page">
    <h2>队伍编成 <small>战力 ${fmt(t.power)}</small></h2>
    <p class="hint">${synText}。站位按从左到右依次行动；守护被敌人攻击的概率更高。</p>
    <div class="slots">${cards}</div>
    <div class="row"><button class="btn" data-act="autoteam">一键最优编队</button></div>
    <h3>战斗策略 <small>全自动，仅可设定倾向</small></h3>
    <div class="row">${pre}</div>
    <p class="hint">${PRESETS[s.strategy.preset]?.zh || ''}：血量低于 ${Math.round(s.strategy.defend * 100)}% 时优先架势；目标选择：${{ low: '血量最低', first: '前排优先', atk: '攻击最高' }[s.strategy.target]}。</p>
    <h3>造物栏 <small>全队被动</small></h3><div class="relic-row">${relics}</div>
  </div>`;
}

export function pickAwakener(app, title, onPick, exclude = []) {
  const { state: s, data } = app;
  const list = Object.keys(s.roster).filter((x) => !exclude.includes(x)).map((x) => ({ x, p: allyDef(s, data, x, [x]).power })).sort((a, b) => b.p - a.p);
  const html = `<h3>${title}</h3><div class="grid mini">${list.map(({ x, p }) => { const a = data.bySlug[x]; return `<div class="tile" style="--rc:${R(a).color}" data-pick="${x}"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${TYPES[a.type].short} Lv${s.roster[x].lv} ${fmt(p)}</small></div>`; }).join('')}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { closeModal(); onPick(t.dataset.pick); } });
}

export function pickItem(app, kind, title, onPick, { allowNone = true } = {}) {
  const items = Object.values(app.state.gear.items).filter((i) => i.kind === kind).sort((a, b) => (RARITY_ORDER[itemDef(app, b).rarity || 'SR'] - RARITY_ORDER[itemDef(app, a).rarity || 'SR']) || b.lv - a.lv);
  const html = `<h3>${title}</h3>${allowNone ? '<button class="btn sm" data-pick="">卸下</button>' : ''}<div class="list">${items.map((i) => itemCard(app, i, `<button class="btn sm" data-pick="${i.uid}">选择</button>`)).join('') || '<p class="hint">没有可用的装备，去推图或祈愿获取。</p>'}</div>`;
  const m = openModal(html, 'wide');
  m.addEventListener('click', (e) => { const t = e.target.closest('[data-pick]'); if (t) { closeModal(); onPick(t.dataset.pick); } });
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
      <img src="${img(a.portrait)}" alt="" loading="lazy"><b>${esc(a.zh)}</b><small>${r ? `Lv${r.lv} ${'★'.repeat(r.star)}` : '未获得'} · ${TYPES[a.type].short}</small></div>`; }).join('')}</div></div>`;
}

const NUM_ZH = { dmg: '伤害', shield: '护盾', gauge: '狂气' };
const numLine = (sk) => {
  const n = sk.real?.nums, c = sk.real?.cur;
  if (!n || !Object.keys(n).length) return '';
  const part = (k) => `${NUM_ZH[k]} ${n[k][0] === n[k][1] ? n[k][0] : `${n[k][0]}–${n[k][1]}`}${k === 'gauge' ? '' : '%'} → <b>${c[k]}${k === 'gauge' ? '' : '%'}</b>`;
  return `<small class="nums">原作数值（Lv.1–5 → 当前）：${Object.keys(n).map(part).join('　')}</small>`;
};

export function detailModal(app, slug) {
  const { state: s, data } = app;
  const a = data.bySlug[slug], r = s.roster[slug];
  const view = r ? allyDef(s, data, slug, [slug]) : null;
  const preview = r || { lv: 1, star: 0 };
  const st = view || (() => { const ghost = { ...s, roster: { ...s.roster, [slug]: preview } }; return allyDef(ghost, data, slug, [slug]); })();
  const lvl = skillLevel(preview.lv, preview.star), kit = data.kit(slug, lvl);
  const eq = s.gear.equip[slug] || {};
  const slotBox = (key, kind, label) => { const it = eq[key] && s.gear.items[eq[key]]; const def = it && itemDef(app, it); return `<div class="eqslot" data-act="equip-slot" data-slug="${slug}" data-kind="${kind}">${def ? `<img src="${img(def.img)}" alt=""><span><b>${esc(def.zh)}</b> Lv${it.lv}<br><small>${esc(itemText(app, it))}</small></span>` : `<span class="empty">＋ ${label}</span>`}</div>`; };
  const cost = r && r.lv < MAX_LV ? lvUpCost(r.lv) : 0;
  const html = `<div class="detail" style="--rc:${R(a).color}">
    <div class="d-art"><img src="${img(a.card)}" alt=""></div>
    <div class="d-body"><h3>${esc(a.zh)} <small>${esc(a.en)}</small></h3>
      <div class="tags"><span class="tag" style="background:${R(a).color}">${R(a).zh}</span><span class="tag">${TYPES[a.type].zh}</span><span class="tag ${rarCls(a.rarity)}">${a.rarity === 'Genesis' ? '创生' : a.rarity}</span></div>
      ${r ? `<div class="lv">Lv ${r.lv}/${MAX_LV}　<span class="star">${stars(r.star)}</span></div>` : '<div class="lv dim">尚未获得 · 通过召唤获取</div>'}
      <div class="stats"><span>生命 <b>${fmt(st.hp)}</b></span><span>攻击 <b>${fmt(st.atk)}</b></span><span>防御 <b>${fmt(st.def)}</b></span><span>暴击 <b>${st.critRate.toFixed(1)}%</b></span><span>爆伤 <b>${st.critDmg.toFixed(0)}%</b></span><span>战力 <b>${fmt(power(st))}</b></span></div>
      ${r ? `<div class="row"><button class="btn" data-act="lvup" data-slug="${slug}" data-n="1" ${cost && s.gold >= cost ? '' : 'disabled'}>升级 (${fmt(cost)})</button><button class="btn" data-act="lvup" data-slug="${slug}" data-n="10" ${cost && s.gold >= cost ? '' : 'disabled'}>×10</button><button class="btn" data-act="lvmax" data-slug="${slug}">升至最高</button></div>
      <div class="eqrow">${slotBox('wheel', 'wheel', '命轮')}${slotBox('cov', 'covenant', '密契')}</div>` : ''}
      <h4>技能 <small class="dim">技能等级 Lv.${lvl + 1}/5（随角色等级与★提升）</small></h4><div class="skills">${SLOTS.map((k) => `<div class="skill"><b class="sk ${k}">${SLOT_ZH[k]}</b> <em>${esc(kit[k].name)}</em>${kit[k].real?.e ? ` <small class="en">${esc(kit[k].real.e)}</small>` : ''}<small>本作效果：${esc(describeSkill(kit[k]))}</small>${numLine(kit[k])}${kit[k].real ? `<details><summary>原作技能文本（译）</summary><p class="real">${markup(kit[k].real.d, data.kw)}</p></details>` : ''}</div>`).join('')}</div>
      ${a.rk_en?.length ? `<details class="en-box"><summary>启灵（原作文本，仅供参考）</summary>${a.rk_en.map((x) => `<div class="skill"><b>${esc(x.ty)}</b> <em>${esc(x.n)}</em><p class="real">${markup(x.d, data.kw)}</p></div>`).join('')}</details>` : ''}
      <p class="hint">星级：重复获得同一唤醒体 +1★（每★ 全属性 +8%，3★ 起增伤 +10%）。技能名称与文本取自原作（中文为译文），数值与效果由本作自行设计，与官方无关。</p>
    </div></div>`;
  openModal(html, 'wide');
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
    const cost = it.lv < GEAR_MAX_LV ? gearCost(it.kind, it.lv) : 0;
    const eqd = isEquipped(s, it.uid);
    const btns = `<div class="ibtns"><button class="btn sm" data-act="gear-equip" data-uid="${it.uid}">${tab === 'relic' ? (eqd ? '卸下' : '装备') : '装备'}</button><button class="btn sm" data-act="gear-up" data-uid="${it.uid}" ${cost && s.gold >= cost ? '' : 'disabled'}>${cost ? `强化 ${fmt(cost)}` : '满级'}</button><button class="btn sm danger" data-act="gear-dis" data-uid="${it.uid}" ${eqd ? 'disabled' : ''}>分解 ${fmt(dismantleValue(def.rarity || 'SR', it.lv))}</button></div>`;
    return itemCard(app, it, btns);
  }).join('') || '<p class="hint">暂无。推图有概率掉落，也可在「召唤」页用金币祈愿。</p>';
  return `<div class="page"><h2>装备库</h2><div class="row">${tabs}</div><div class="list">${rows}</div></div>`;
}

/* ----------------------------- SUMMON ----------------------------- */
export function summonPage(app) {
  const { state: s } = app;
  const p = s.pity;
  return `<div class="page"><h2>召唤</h2>
    <div class="banner-card"><h3>唤醒体召唤</h3>
      <p>召唤券：<b>${s.tickets}</b>　　创生保底：<b>${p.genesis}/${PULL_PITY_GENESIS}</b>　　史诗保底：<b>${p.ssr}/10</b></p>
      <div class="row"><button class="btn big" data-act="pull" data-n="1" ${s.tickets >= 1 ? '' : 'disabled'}>单抽 ×1</button><button class="btn big gold" data-act="pull" data-n="10" ${s.tickets >= 10 ? '' : 'disabled'}>十连 ×10</button></div>
      <p class="hint">概率：精良 60% · 史诗 37% · 创生 3%（第 38 抽起逐步提升，${PULL_PITY_GENESIS} 抽必出）。十连至少 1 个史诗以上。重复获得提升星级，满星折算金币。</p></div>
    <div class="banner-card"><h3>装备祈愿</h3>
      <p>金币：<b>${fmt(s.gold)}</b>　每次 ${EQUIP_PULL_COST} 金币，随机获得命轮 / 密契 / 造物。</p>
      <div class="row"><button class="btn big" data-act="epull" data-n="1" ${s.gold >= EQUIP_PULL_COST ? '' : 'disabled'}>祈愿 ×1</button><button class="btn big" data-act="epull" data-n="5" ${s.gold >= EQUIP_PULL_COST * 5 ? '' : 'disabled'}>祈愿 ×5</button></div></div>
  </div>`;
}
export function showPulls(app, out) {
  const { data } = app;
  const html = `<h3>召唤结果</h3><div class="grid mini pulls">${out.map((p) => { const a = data.bySlug[p.slug]; return `<div class="tile ${rarCls(p.rarity)} pull" style="--rc:${R(a).color}"><img src="${img(a.portrait)}" alt=""><b>${esc(a.zh)}</b><small>${p.isNew ? '<em class="new">NEW</em>' : p.gold ? `+${p.gold}金币` : `★${p.star}`}</small></div>`; }).join('')}</div>`;
  openModal(html, 'wide');
}
export function showItems(app, items) {
  openModal(`<h3>获得装备</h3><div class="list">${items.map((i) => itemCard(app, i)).join('')}</div>`, 'wide');
}

/* ----------------------------- SETTINGS ----------------------------- */
export function settingsPage(app) {
  const s = app.state;
  const st = s.stats;
  const today = new Date().toISOString().slice(0, 10);
  return `<div class="page"><h2>设置与存档</h2>
    <div class="banner-card"><h3>每日奖励</h3><button class="btn big gold" data-act="daily" ${s.daily.day === today ? 'disabled' : ''}>${s.daily.day === today ? '今日已领取' : '领取 召唤券×10 + 金币×1000'}</button></div>
    <div class="banner-card"><h3>声音</h3>
      <label class="snd"><input type="checkbox" data-aud="mute" ${sound.cfg.mute ? 'checked' : ''}> 静音</label>
      <label class="snd">音效 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.sfx * 100)}" data-aud="sfx"></label>
      <label class="snd">背景氛围 <input type="range" min="0" max="100" value="${Math.round(sound.cfg.bgm * 100)}" data-aud="bgm"></label>
      <div class="row">${[['hit', '命中'], ['crit', '暴击'], ['heal', '治疗'], ['shield', '护盾'], ['exalt', '共鸣'], ['win', '胜利'], ['summon', '召唤'], ['ach', '成就']].map(([k, z]) => `<button class="btn sm" data-act="snd-test" data-k="${k}">${z}</button>`).join('')}</div>
      <p class="hint">所有声音均由浏览器实时合成，没有音频文件；首次点击页面后才会发声。命中音色随攻击者界域变化（混沌/血肉/深海/超维）。</p></div>
    <div class="banner-card"><h3>统计</h3><p>战斗 ${st.battles} 场 · 胜利 ${st.wins} · 击杀 ${st.kills} · 累计金币 ${fmt(st.gold)} · 召唤 ${st.pulls} 次 · 最高通关 ${s.maxStage}</p></div>
    <div class="banner-card"><h3>存档</h3>
      <div class="row"><button class="btn" data-act="export">导出存档</button><button class="btn" data-act="import">导入存档</button><button class="btn danger" data-act="reset">重置游戏</button></div>
      <p class="hint">存档保存在浏览器本地（localStorage）。换设备请先导出。离线最多结算 8 小时收益。</p></div>
    <div class="banner-card"><h3>关于</h3>
      <p class="hint">《忘却之夜·挂机录》是基于《忘却前夜》（Morimens）的非官方同人作品，免费、非商业。游戏内的角色、图像素材版权归原权利方所有，数值与技能效果为本作自行设计。如有侵权请联系删除。</p></div></div>`;
}

export function offlineModal(app, rep, onClaim) {
  const items = rep.drops.length;
  const m = openModal(`<h3>欢迎回来</h3><p>离线 ${Math.round(rep.secs / 60)} 分钟（结算 ${Math.round(rep.capped / 60)} 分钟），在第 ${rep.stage} 关挂机 ${rep.battles} 场，预计胜 ${rep.wins} 场。</p>
    <p>金币 <b>+${fmt(rep.gold)}</b>　召唤券 <b>+${rep.tickets}</b>　装备 <b>+${items}</b></p><button class="btn big gold" data-act="claim-offline">领取</button>`);
  m.addEventListener('click', (e) => { if (e.target.closest('[data-act="claim-offline"]')) { closeModal(); onClaim(); } });
}
