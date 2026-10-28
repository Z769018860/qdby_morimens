// Detailed battle report (victory / defeat settlement)
import { analyzeBattle, grade } from '../core/report.js';
import { esc, img, fmt, openModal, rewardText } from './util.js';
import { STATUS } from '../core/constants.js';

const pct = (x) => `${Math.round(x * 100)}%`;
const GRADE_COLOR = { S: '#ffd36b', A: '#6fe3a0', B: '#7fc4ff', C: '#c9c9c9', D: '#ff6b6b' };
const ST_ZH = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.zh]));

function timelineSvg(tl) {
  if (tl.length < 1) return '';
  const W = 560, H = 120, pad = 18, n = Math.min(tl.length, 40), rows = tl.slice(0, n);
  const max = Math.max(1, ...rows.map((r) => Math.max(r.dmgA, r.dmgE)));
  const bw = Math.min(22, (W - pad * 2) / n / 2.4), step = (W - pad * 2) / n;
  const bars = rows.map((r, i) => {
    const x = pad + i * step, ha = (r.dmgA / max) * (H - 34), he = (r.dmgE / max) * (H - 34);
    return `<rect x="${x}" y="${H - 16 - ha}" width="${bw}" height="${ha}" fill="#e0b84a"><title>第 ${r.n} 回合 我方伤害 ${fmt(r.dmgA)}</title></rect>
      <rect x="${x + bw + 1}" y="${H - 16 - he}" width="${bw}" height="${he}" fill="#e0574f"><title>第 ${r.n} 回合 受到伤害 ${fmt(r.dmgE)}</title></rect>
      ${n <= 20 || i % 2 === 0 ? `<text x="${x + bw}" y="${H - 4}" font-size="9" text-anchor="middle" fill="#8a94a8">${r.n}</text>` : ''}`;
  }).join('');
  const heal = rows.map((r, i) => `${pad + i * step + bw} ${H - 16 - (r.heal / max) * (H - 34)}`);
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="每回合伤害">
    <line x1="${pad - 4}" y1="${H - 16}" x2="${W - pad}" y2="${H - 16}" stroke="#2b3447"/>${bars}
    ${rows.some((r) => r.heal) ? `<polyline fill="none" stroke="#6fe3a0" stroke-width="1.6" points="${heal.join(' ')}"/>` : ''}</svg>
    <div class="tlg"><i style="background:#e0b84a"></i>我方伤害　<i style="background:#e0574f"></i>受到伤害　<i style="background:#6fe3a0"></i>治疗　<small class="dim">纵轴峰值 ${fmt(max)}</small></div>`;
}

function allyRow(u, rep) {
  const badges = [rep.mvp.dmg === u.uid ? '🏆 输出' : '', rep.mvp.tank === u.uid ? '🛡 承伤' : '', rep.mvp.heal === u.uid ? '💚 治疗' : '', rep.mvp.crit === u.uid && u.maxHit ? '💥 最高单击' : ''].filter(Boolean);
  const a = u.acts;
  return `<div class="rrow ${u.deaths ? 'dead' : ''}">
    <div class="rwho"><img src="${img(u.img)}" alt=""><div><b>${esc(u.name)}</b>${badges.map((b) => `<span class="mvp">${b}</span>`).join('')}<small>${u.deaths ? `第 ${u.diedRound} 回合倒下` : `剩余生命 ${pct(u.hpPct)}`}</small></div></div>
    <div class="rbars"><div class="rb"><span>伤害</span><i class="d" style="width:${Math.max(1, u.share * 100)}%"></i><b>${fmt(u.dmg)} · ${pct(u.share)}</b></div>
      <div class="rb"><span>承伤</span><i class="t" style="width:${Math.min(100, (u.taken / Math.max(1, u.maxHp)) * 100)}%"></i><b>${fmt(u.taken)}${u.absorbedByShield ? `（盾挡 ${fmt(u.absorbedByShield)}）` : ''}</b></div></div>
    <div class="rstat"><span>暴击 <b>${u.hits ? pct(u.crits / u.hits) : '—'}</b></span><span>最高单击 <b>${fmt(u.maxHit)}</b></span><span>治疗 <b>${fmt(u.heal)}</b></span><span>护盾 <b>${fmt(u.shield)}</b></span><span>击杀 <b>${u.kills}</b></span>
      <span>出手 <b>${a.strike}普 ${a.skill}技 ${a.exalt}爆${a.defense ? ` ${a.defense}防` : ''}</b></span>${u.dot ? `<span>持续伤害 <b>${fmt(u.dot)}</b></span>` : ''}${u.counter ? `<span>反击 <b>${fmt(u.counter)}</b></span>` : ''}${u.blocked ? `<span>屏障挡 <b>${u.blocked}</b></span>` : ''}${u.saved ? `<span>死扛 <b>${u.saved}</b></span>` : ''}</div></div>`;
}
function foeRow(u, rep) {
  const st = Object.entries(u.status).map(([k, n]) => `${ST_ZH[k] || k}×${n}`).join(' ');
  return `<div class="rrow foe ${u.deaths ? 'dead' : ''}"><div class="rwho"><img src="${img(u.img)}" alt=""><div><b>${esc(u.name)}</b>${u.boss ? '<span class="mvp">BOSS</span>' : ''}<small>${u.deaths ? `第 ${u.diedRound} 回合被击败` : `剩余生命 ${u.maxHp >= 1e11 ? '∞' : pct(u.hpPct)}`}</small></div></div>
    <div class="rstat"><span>承受伤害 <b>${fmt(u.taken)}</b></span><span>造成伤害 <b>${fmt(u.dmg)}</b></span><span>暴击 <b>${u.hits ? pct(u.crits / u.hits) : '—'}</b></span>${u.heal ? `<span>治疗 <b>${fmt(u.heal)}</b></span>` : ''}${u.shield ? `<span>护盾 <b>${fmt(u.shield)}</b></span>` : ''}${st ? `<span>受到状态 <b>${esc(st)}</b></span>` : ''}</div></div>`;
}

// compact = tables + chart only (used inside other modals / the collapsible box)
export function reportHtml(rep, { compact = true } = {}) {
  const t = rep.totals;
  const tiles = [['总伤害', fmt(t.dmg)], ['每回合伤害', fmt(t.dpr)], ['受到伤害', fmt(t.taken)], ['治疗', fmt(t.heal)], ['护盾', fmt(t.shield)], ['暴击率', pct(t.critRate)], ['最高单击', fmt(t.maxHit)], ['击杀', t.kills], ['共鸣释放', t.exalts], ['剩余生命', pct(t.hpLeft)]];
  return `<div class="rtiles">${tiles.map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
    <h4>我方</h4><div class="rrows">${rep.A.map((u) => allyRow(u, rep)).join('')}</div>
    <h4>敌方</h4><div class="rrows">${rep.E.map((u) => foeRow(u, rep)).join('')}</div>
    <h4>回合时间线</h4>${timelineSvg(rep.timeline)}${compact ? '' : ''}`;
}

export function makeReport(res, allies, enemies) { return analyzeBattle(res, allies, enemies); }

// full settlement modal. ctx: { title, res, allies, enemies, rw, fast, extra }
export function settlementModal(app, ctx) {
  const rep = ctx.rep || analyzeBattle(ctx.res, ctx.allies, ctx.enemies), g = grade(rep, { fast: ctx.fast || 12 });
  const rw = ctx.rw || {};
  const chips = [rewardText(rw), ...(rw.items || []).map((it) => `装备：${esc(app.itemName ? app.itemName(it) : '')}`), rw.coresBoss ? `首杀首领 银芯 +${rw.coresBoss}` : '', rw.newMon?.length ? `新遭遇怪物 ×${rw.newMon.length}` : ''].filter(Boolean);
  openModal(`<div class="settle">
    <div class="shead"><div class="grade" style="--gc:${GRADE_COLOR[g.rank]}">${g.rank}</div>
      <div><h3>${rep.win ? '战斗胜利' : '战斗失败'} · ${esc(ctx.title || '')}</h3><div class="stars">${[0, 1, 2].map((i) => `<span class="${i < g.stars ? 'on' : ''}">★</span>`).join('')}</div>
      <small class="dim">${rep.rounds} 回合${g.notes.length ? ' · ' + g.notes.join(' · ') : ''}</small></div></div>
    ${chips.length ? `<div class="rchips">${chips.map((c) => `<span>${c}</span>`).join('')}${rw.firstClear ? '<span class="new">首通</span>' : ''}${rw.newBest ? '<span class="new">新纪录</span>' : ''}</div>` : ''}
    ${ctx.extra || ''}
    ${reportHtml(rep, { compact: false })}</div>`, 'wide');
  return { rep, g };
}

// auto-popup preference: 'key' = first clears / boss wins / new monsters (default), 'all' = every battle, 'off'
const SKEY = 'morimens-idle-settle';
export const settleMode = {
  get() { try { return localStorage.getItem(SKEY) || 'key'; } catch { return 'key'; } },
  set(v) { try { localStorage.setItem(SKEY, v); } catch { /* ignore */ } },
};
