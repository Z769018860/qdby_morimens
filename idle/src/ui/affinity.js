// 同调率界面：总览页（礼物仓库 + 全员同调一览）、详情页里那块「同调」，以及赠送弹窗。
// 只依赖 core/affinity.js 与 ui/util.js —— 不 import pages.js，免得和 detailModal 循环引用。
import { esc, fmt, img, openModal } from './util.js';
import {
  AFF_MAX, AFF_STEPS, AFF_TALENTS, GIFTS, GIFT_BY_ID, DAILY_GIFTS,
  affLv, affOf, affProgress, cardEffectText,
} from '../core/affinity.js';

const REALM_ZH = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' };
const TYPE_ZH = { ASSAULT: '突击', WARDEN: '守护', CHORUS: '合唱' };
const RCOLOR = { Genesis: '#e5b84b', SSR: '#c58bff', SR: '#7ec8ff', R: '#8b95a7', N: '#6b7280' };
const rc = (a) => RCOLOR[a?.rarity] || '#8b95a7';

const giftCount = (s, id) => Math.max(0, Math.floor(Number(s.aff?.gifts?.[id]) || 0));

/** 一条进度条 + 「Lv.n · 120/180」 */
function barOf(pts) {
  const p = affProgress(pts);
  const right = p.next == null ? '已满级' : `${p.pts}/${p.next}`;
  return `<div class="affbar"><i style="width:${Math.round(p.pct * 100)}%"></i></div><small class="affnum">Lv.${p.lv} · ${right}</small>`;
}

/* ---------------- 总览页 ---------------- */
export function affinityPage(app) {
  const s = app.state, data = app.data;
  const owned = Object.keys(s.roster).filter((k) => data.bySlug[k]);
  const lvOf = (k) => affLv(affOf(s, k));
  const sum = owned.reduce((n, k) => n + affOf(s, k), 0);
  const maxed = owned.filter((k) => lvOf(k) >= AFF_MAX).length;
  // 高等级的排前面，同级按拥有顺序（老玩家一眼看到自己在养的那几个）
  const list = owned.slice().sort((a2, b2) => lvOf(b2) - lvOf(a2) || affOf(s, b2) - affOf(s, a2) || owned.indexOf(a2) - owned.indexOf(b2));

  const gifts = GIFTS.map((g) => `<div class="giftbox">
      <b>${esc(g.zh)}</b><em>+${g.pts}</em>
      <span class="gcount">×${giftCount(s, g.id)}</span>
      <button class="btn sm" data-act="aff-buy" data-k="${g.id}">买（🪙${fmt(g.price)}）</button>
    </div>`).join('');

  const rows = list.map((slug) => {
    const a = data.bySlug[slug];
    const lv = lvOf(slug);
    return `<div class="affrow" data-slug="${slug}">
      <img src="${img(a.portrait)}" alt="" style="border-color:${rc(a)}">
      <div class="affmain">
        <b>${esc(a.zh)} <small>${TYPE_ZH[a.type] || a.type} · ${REALM_ZH[a.realm] || '—'}</small>${lv >= AFF_MAX ? '<span class="affmax">满</span>' : ''}</b>
        ${barOf(affOf(s, slug))}
      </div>
      <button class="btn sm ${lv >= AFF_MAX ? '' : 'gold'}" data-act="aff-gift" data-slug="${slug}" data-back="aff" ${lv >= AFF_MAX ? 'disabled' : ''}>赠送</button>
    </div>`;
  }).join('');

  const daily = Object.entries(DAILY_GIFTS).map(([k, n]) => `${GIFT_BY_ID[k].zh} ×${n}`).join(' · ');
  return `<div class="page"><h2>同调率 <small>带着她推关、送她礼物，就会越来越默契</small></h2>
    <div class="banner-card"><h3>这一页是什么 <small>${owned.length} 位唤醒体 · 累计 ${fmt(sum)} 点 · 满级 ${maxed} 位</small></h3>
      <p class="hint">每次<b>打赢</b>一场，当前队伍的四个人各涨同调点（第 40 关起 2 点、第 80 关起 3 点，首领关翻倍）。离线挂机也算，但压得很低（一场约 0.35 点、单次最多 60 点）。</p>
      <p class="hint">同调等级给的是<b>这个人自己</b>的属性（生命 / 攻击 / 防御 / 暴击），满级再给她的「技能一」加一条<b>专属效果</b>：
        突击拿真伤、守护拿屏障、合唱拿全队增伤。和等级、叠位、装备都不冲突，是给「一直带着的那几个」的第二条养成线。</p>
    </div>
    <div class="banner-card"><h3>礼物仓库 <small>每天跨天自动补：${esc(daily)}</small></h3>
      <div class="giftrow">${gifts}</div>
      <p class="hint">礼物也能用金币买——金币本来只用来升级，后期会越攒越多，这里是它的另一个出口。买完在下面挑人送。</p>
    </div>
    <div class="banner-card"><h3>同调一览 <small>点「赠送」挑礼物</small></h3>
      <div class="afflist">${rows || '<p class="hint">还没有唤醒体。</p>'}</div>
    </div></div>`;
}

/* ---------------- 详情页里的那一块 ---------------- */
export function affinityCard(app, slug) {
  const s = app.state, a = app.data.bySlug[slug];
  if (!a || !s.roster[slug]) return '';
  const pts = affOf(s, slug);
  const lv = affLv(pts);
  const card = cardEffectText(a.type);
  const talents = AFF_TALENTS.map((t) => {
    const on = lv >= t.lv;
    return `<li class="${on ? 'on' : ''}"><b>Lv.${t.lv} ${esc(t.zh)}</b><span>${esc(t.desc)}</span></li>`;
  }).join('');
  return `<h4>同调率 <small class="dim">Lv.${lv}/${AFF_MAX} · 累计 ${pts} 点（满 ${AFF_STEPS[AFF_MAX - 1]}）</small></h4>
    <div class="affcard">
      ${barOf(pts)}
      <ul class="afftal">${talents}</ul>
      <div class="affpact ${lv >= AFF_MAX ? 'on' : ''}"><b>${esc(card.zh)}</b><span>${esc(card.desc)}</span><em>${lv >= AFF_MAX ? '已生效' : `Lv.${AFF_MAX} 解锁`}</em></div>
      <div class="row"><button class="btn sm gold" data-act="aff-gift" data-slug="${slug}" data-back="detail" ${lv >= AFF_MAX ? 'disabled' : ''}>赠送礼物</button>
        <span class="dim">带着她推关也会涨（每场 +1~3，首领关翻倍）</span></div>
    </div>`;
}

/* ---------------- 赠送弹窗 ---------------- */
export function giftModal(app, slug, back = 'aff') {
  const s = app.state, a = app.data.bySlug[slug];
  if (!a) return;
  const lv = affLv(affOf(s, slug));
  const btns = GIFTS.map((g) => {
    const n = giftCount(s, g.id);
    return `<button class="btn ${n ? 'gold' : ''}" data-act="aff-send" data-slug="${slug}" data-k="${g.id}" data-back="${back}" ${n && lv < AFF_MAX ? '' : 'disabled'}>
      ${esc(g.zh)} <small>+${g.pts}（有 ${n}）</small></button>`;
  }).join('');
  const buy = GIFTS.map((g) => `<button class="btn sm" data-act="aff-buy" data-k="${g.id}" ${s.gold >= g.price ? '' : 'disabled'}>买${esc(g.zh)} 🪙${fmt(g.price)}</button>`).join('');
  openModal(`<h3>送给 ${esc(a.zh)} <small>同调 Lv.${lv}/${AFF_MAX}</small></h3>
    ${barOf(affOf(s, slug))}
    <p class="hint">${esc(GIFTS[0].desc)}</p>
    <div class="row">${btns}</div>
    <h4>没有存货？用金币买</h4>
    <div class="row">${buy}</div>
    <p class="hint">同调点只增不减，送错了也不会亏——只是分摊到别人身上会慢一点。</p>`);
}

/** 复盘用：把一次赠送的结果读成一句话 */
export function sendText(app, slug, r) {
  const a = app.data.bySlug[slug];
  if (!r.ok) return r.why || '送不出去';
  const name = a?.zh || slug;
  return r.up > 0 ? `${name} 的同调升到 Lv.${r.lv} 了（+${r.pts}）` : `${name} 同调 +${r.pts}`;
}
