import { esc, img, openModal, markup } from './util.js';
import { compileSkill, fillText } from '../core/monsters.js';
import { describeSkill } from '../core/skills.js';

// trait names are literal translations of the client's English tags (not official terms)
export const TRAIT_ZH = {
  'Empty Shell': '空壳', Dominion: '主宰', Beast: '野兽', Kynde: '同类', Humanoid: '人形', Awakener: '唤醒体', Aequor: '深海', Ultra: '超维',
  Caro: '血肉', Unknown: '未知', Mutant: '变异体', Sculptors: '塑像师', Lightbearers: '提灯教会', Snowfield: '雪原', Departed: '逝者',
  Plant: '植物', Committee: '委员会', Insectoid: '虫类', 'Primordial Shadow': '原初之影',
};
const RANK_ZH = { Normal: '普通', Elite: '精英', Boss: '首领' };
const SIZE_ZH = { Mini: '小型', Small: '小型', Big: '大型', Medium: '中型' };
export const intentIcon = (ic, size = 22) => (ic ? `<img class="intent" src="${img(`img/intent/intent_${ic}.png`)}" alt="" width="${size}" height="${size}">` : '');

export function codexPage(app) {
  const { state: s, data } = app;
  const f = (app.ui.codex ||= { q: '', rank: '', trait: '', seen: false, more: 1 });
  const q = f.q.trim().toLowerCase();
  const list = data.monsters.filter((m) => (!f.rank || m.rank === f.rank) && (!f.trait || m.traits.includes(f.trait)) && (!f.seen || s.codex?.[m.id]?.seen)
    && (!q || m.zh.toLowerCase().includes(q) || (m.en || '').toLowerCase().includes(q) || m.desc.includes(q)));
  const seen = Object.values(s.codex || {}).filter((c) => c.seen).length;
  const traits = [...new Set(data.monsters.flatMap((m) => m.traits))].sort();
  const shown = list.slice(0, 60 * f.more);
  const card = (m) => {
    const c = s.codex?.[m.id];
    return `<button class="mcard ${m.rank} ${c?.seen ? '' : 'unseen'}" data-act="monster" data-id="${m.id}">
      <img src="${img(m.img)}" alt="" loading="lazy"><b>${esc(m.zh)}</b>
      <small>${RANK_ZH[m.rank]}${c?.kills ? ` · 击败 ${c.kills}` : c?.seen ? ' · 遭遇' : ''}</small></button>`;
  };
  return `<div class="page"><h2>怪物图鉴 <small class="dim">已遭遇 ${seen}/${data.monsters.length}　数据：游戏客户端怪物表（血量/攻击/防御系数、开场与循环出招、意图）</small></h2>
    <div class="filters">
      <input type="search" data-cf="q" value="${esc(f.q)}" placeholder="搜索名称 / 描述">
      <select data-cf="rank"><option value="">全部阶级</option>${Object.entries(RANK_ZH).map(([k, z]) => `<option value="${k}" ${f.rank === k ? 'selected' : ''}>${z}</option>`).join('')}</select>
      <select data-cf="trait"><option value="">全部特征</option>${traits.map((t) => `<option value="${esc(t)}" ${f.trait === t ? 'selected' : ''}>${esc(TRAIT_ZH[t] || t)}</option>`).join('')}</select>
      <label><input type="checkbox" data-cf="seen" ${f.seen ? 'checked' : ''}> 仅已遭遇</label>
    </div>
    <div class="mgrid">${shown.map(card).join('') || '<p class="dim">没有匹配的怪物</p>'}</div>
    ${list.length > shown.length ? `<div class="row"><button class="btn" data-act="codex-more">显示更多（${shown.length}/${list.length}）</button></div>` : ''}
    <p class="hint">怪物名称取自官方译名（缺失处为客户端文本）；特征名为客户端英文标签的直译，非官方。技能数值按本作规则换算。</p></div>`;
}

export function monsterModal(app, id) {
  const { state: s, data } = app;
  const m = data.monById[id];
  if (!m) return;
  const c = s.codex?.[id];
  const same = m.op.join() === m.cy.join();
  const row = (sid, tag) => {
    const rec = data.msk[sid];
    const sk = compileSkill(rec, m.rank);
    return `<div class="mskill">${intentIcon(rec.i, 26)}<div><b>${esc(sk.name)}</b> <em>${tag}</em>
      <p class="real">${markup(fillText(rec), data.kw)}</p>
      ${sk.effects.length ? `<small>本作效果：${esc(describeSkill(sk))}</small>` : '<small class="dim">本作中为蓄力 / 无直接效果</small>'}</div></div>`;
  };
  openModal(`<div class="detail mon ${m.rank}"><div class="d-art"><img src="${img(m.img)}" alt=""></div>
    <div class="d-body"><h3>${esc(m.zh)} ${m.en ? `<small>${esc(m.en)}</small>` : ''}</h3>
      <div class="tags"><span class="tag">${RANK_ZH[m.rank]}</span><span class="tag">${SIZE_ZH[m.size] || m.size}</span>${m.traits.map((t) => `<span class="tag t2">${esc(TRAIT_ZH[t] || t)}</span>`).join('')}</div>
      <p>${esc(m.desc)}</p>
      <div class="stats"><span>生命系数 <b>${m.hp}</b></span><span>攻击系数 <b>${m.atk}</b></span><span>防御系数 <b>${m.df}</b></span><span>${c ? `遭遇 <b>${c.seen}</b> · 击败 <b>${c.kills}</b>` : '尚未遭遇'}</span></div>
      <h4>出招顺序</h4>
      ${same ? '' : `<div class="seq"><b>开场</b>${m.op.map((x) => `<span>${intentIcon(data.msk[x].i, 18)}${esc(data.msk[x].n || '')}</span>`).join('→')}</div>`}
      <div class="seq"><b>${same ? '循环' : '之后循环'}</b>${m.cy.map((x) => `<span>${intentIcon(data.msk[x].i, 18)}${esc(data.msk[x].n || '')}</span>`).join('→')}↺</div>
      <h4>技能</h4>
      ${[...new Set([...m.op, ...m.cy])].map((x) => row(x, same ? '' : (m.op.includes(x) ? '开场' : '') + (m.op.includes(x) && m.cy.includes(x) ? '/' : '') + (m.cy.includes(x) ? '循环' : ''))).join('')}
    </div></div>`, 'wide');
}
