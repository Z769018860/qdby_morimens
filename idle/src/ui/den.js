// 逆潮守关：界面。
// 关卡列表（10 章 × 10 关）→ 编队页（看这一关的玩家阵容 / 规则，在算力里挑怪定档）→ 开打 → 结算。
import {
  DEN_MAX, DEN_SLOTS, DEN_TIERS, DEN_GUARDS, DEN_CHAPTERS, tierOf,
  denStage, denPlayerDefs, denHint, denPool, monById, monCost, monStats,
  denState, denUnlocked, denStarOf, denTotalStars, denCheck, denStarClaims,
} from '../core/denrun.js';
import { esc, img, fmt, openModal, toast } from './util.js';

const RANK_ZH = { Normal: '普通', Elite: '精英', Boss: '首领' };
const TYPE_ZH = { WARDEN: '守护', CHORUS: '合唱', ASSAULT: '突击' };
const TYPE_TA = { WARDEN: '扛伤、给盾、嘲讽', CHORUS: '群攻、治疗、增益', ASSAULT: '单体爆发、越前排' };
const RULE_ZH = { thorns: '反震', antiheal: '压疗', armor: '重甲', crit: '暴击', heal: '续航', seal: '封印', barrier: '屏障' };
const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 3 - n));
const rwZh = (rw) => [rw.gold ? `金币 +${fmt(rw.gold)}` : '', rw.cores ? `银芯 +${fmt(rw.cores)}` : '', rw.tickets ? `唤醒券 +${rw.tickets}` : ''].filter(Boolean).join('　');
const picksOf = (app) => (app.ui.denPicks ||= []);
const sumCost = (data, picks) => Math.round((picks || []).reduce((s, p) => {
  const m = monById(data, p.id);
  return s + (m ? monCost(m, p.tier) : 0);
}, 0) * 10) / 10;

export function denPage(app) {
  const n = Number(app.ui.denN) || 0;
  return n ? stagePage(app, n) : listPage(app);
}

/* ---------------------------------------------------------------- 关卡列表 */
function listPage(app) {
  const { state: st } = app;
  const s = denState(st);
  const total = denTotalStars(st);
  const unlocked = denUnlocked(st);
  // 20 章 × 10 关一次全铺出来太长了：没打到的章节先折成一行，点「展开全部章节」再看。
  const showAll = !!app.ui.denAll;
  let hiddenCh = 0;
  const chapters = DEN_CHAPTERS.map((ch, i) => {
    const ci = i + 1;
    const first = (ci - 1) * 10 + 1;
    const locked = first > unlocked;
    if (locked && !showAll) {
      hiddenCh++;
      return `<div class="denchap lock"><b>第 ${ci} 章 · ${esc(ch.zh)}</b><span class="dim">🔒 打到第 ${unlocked} 关后解锁（第 ${first} 关）</span></div>`;
    }
    const cells = [];
    for (let k = 1; k <= 10; k++) {
      const n = (ci - 1) * 10 + k;
      const star = denStarOf(st, n);
      const off = n > unlocked;
      const isBoss = n % 10 === 0;
      cells.push(`<button class="dencell${off ? ' lock' : ''}${star ? ' on' : ''}${isBoss ? ' boss' : ''}" data-act="den-open" data-n="${n}" ${off ? 'disabled' : ''}>
        <b>${n}</b><em>${off ? '🔒' : stars(star)}</em></button>`);
    }
    // 章节整体进度：这一章拿到多少星（0..30）+ 星级里程碑奖励（12 / 21 / 30 三档）
    const got = Array.from({ length: 10 }, (_, k) => denStarOf(st, (ci - 1) * 10 + k + 1)).reduce((a, b) => a + b, 0);
    const cleared = got >= 10;
    const claimable = cleared && !(s.claim || {})[ci];
    const sc = denStarClaims(st, ci);
    const chips = sc.tiers.map((t) => {
      const title = `${t.d}：${rwZh(t.rw)}`;
      if (t.claimed) return `<button class="btn xs" disabled title="${esc(title)}">${t.need}★ 已领</button>`;
      if (t.done) return `<button class="btn xs gold" data-act="den-star" data-ch="${ci}" data-ti="${t.ti}" title="${esc(title)}">${t.need}★ 可领</button>`;
      return `<button class="btn xs" disabled title="${esc(title)}">${t.need}★（${sc.got}/${t.need}）</button>`;
    }).join('');
    return `<h3>第 ${ci} 章 · ${esc(ch.zh)} <small>${got}/30 星${claimable ? ' · <b class="new">全章奖励可领</b>' : ''}</small></h3>
      <p class="hint">${esc(ch.note)}</p>
      <div class="dencells">${cells.join('')}</div>
      <div class="row denmile">${chips}${claimable ? `<button class="btn xs gold" data-act="den-claim" data-ch="${ci}">全通奖励可领</button>` : ''}</div>`;
  }).join('');

  return `<div class="page"><h2>逆潮守关 <small>${DEN_MAX} 关 · 你守，玩家攻 · 算力编队</small></h2>
  <div class="banner-card lk"><div><h3>逆潮守关 <small>最高第 ${s.best} 关 · ${total} / ${DEN_MAX * 3} 星 · 守成 ${s.wins} / ${s.runs} 次</small></h3>
    <p>这一次你站在怪物这边。每一关有一支<b>玩家阵容</b>（四位唤醒体 + 等级叠位 + 这一关的战术规则），你要在<b>算力</b>上限里从图鉴里挑怪、给每只怪定一个<b>成长档</b>，把它们全部打光才算守住。</p>
    <p>三条硬规矩：<b>算力</b>——首领单价 9 起、巨体再乘 ${tierOf('t3').cost}，预算只有 ${denStage(1).cpu}→${denStage(DEN_MAX).cpu}，堆一两只大怪永远填不满一队；<b>同种一只</b>——同一种怪只能上一只；<b>孤军不成立</b>——只带一两只时玩家会收拢阵型：防御大增、还腾出手集火，四打一在这里是打不赢的。</p>
    <p class="hint">每只怪带一条<b>守关特性</b>（壁垒 / 棘刺 / 蚀毒 / 汲取 / 破甲 / 狂血 / 庇护 / 噤声 / <b>涤净</b> / <b>逆鳞</b>），各自被一种玩家打法克制——涤净专撕毒与流血，逆鳞让反击队蹭不到血；玩家的战术规则（${Object.values(RULE_ZH).slice(0, 5).join(' / ')}）反过来也克制一部分怪，而且对面的辅助会先手铺增益、输出后手吃增益再打。所以每一关的最优解都不一样，抄不了上一关的阵容。</p>
    <p class="hint">前 100 关是<b>第一程</b>：玩家的等级叠位一路长到满级满叠。第 101 关起是<b>第二程</b>——玩家练度到顶，改由装备与法则变强，规则也从「一种主题」变成「两种叠着来」，算力预算继续涨到 ${denStage(DEN_MAX).cpu}。</p>
  </div></div>
  <div class="row denchapbar"><button class="btn sm" data-act="den-all">${showAll ? '收起未解锁的章节' : `展开全部章节${hiddenCh ? `（还有 ${hiddenCh} 章未解锁）` : ''}`}</button>
    <span class="dim">已解锁到第 ${unlocked} 关</span></div>
  ${chapters}
  </div>`;
}

/* ---------------------------------------------------------------- 编队页 */
function stagePage(app, n) {
  const { state: st, data } = app;
  const stage = denStage(n);
  const picks = picksOf(app).filter((p) => monById(data, p.id));
  const used = sumCost(data, picks);
  const left = Math.round((stage.cpu - used) * 10) / 10;
  const over = used > stage.cpu + 1e-6;
  const chk = picks.length ? denCheck(n, picks, data) : { err: '还没选怪' };
  const players = denPlayerDefs(n, data);
  const hints = denHint(n);
  const lastLine = (denState(st).lineups || {})[n];

  /* 玩家阵容 */
  const pcards = players.map((d) => {
    const sk = Object.values(d.kit || {}).map((k) => k && k.name).filter(Boolean);
    return `<div class="denpcard ${d.type}">
      <img src="${img(d.img)}" alt="${esc(d.name)}" loading="lazy">
      <div class="denpi">
        <div class="denpn"><b>${esc(d.name)}</b><em>${TYPE_ZH[d.type] || d.type}</em></div>
        <span class="dim">Lv.${d.lv}${d.star ? ` · ${d.star} 叠` : ''}</span>
        <span class="dim denst"><i>HP ${fmt(d.hp)}</i><i>ATK ${fmt(d.atk)}</i><i>DEF ${fmt(d.def)}</i></span>
        <span class="dim densk" title="${esc(sk.join(' / '))}">${esc(sk.join(' / ') || TYPE_TA[d.type] || '')}</span>
      </div>
    </div>`;
  }).join('');

  /* 已选守关队 */
  const slots = [];
  for (let i = 0; i < DEN_SLOTS; i++) {
    const p = picks[i];
    if (!p) { slots.push('<div class="denslot empty">空</div>'); continue; }
    const m = monById(data, p.id);
    const g = DEN_GUARDS[m.guard];
    const s2 = monStats(m, p.tier, n);
    const tbtns = DEN_TIERS.map((t) => `<button class="btn xs ${p.tier === t.id ? 'gold' : ''}" data-act="den-tier" data-id="${m.id}" data-tier="${t.id}" title="${esc(t.note)}">${t.short}</button>`).join('');
    slots.push(`<div class="denslot">
      <img src="${img(m.img)}" alt="" loading="lazy">
      <b>${esc(m.zh)}</b>
      <span class="dim">${RANK_ZH[m.rank]} · ${m.reach === 'front' ? '近战' : '远程'} · <i class="deng">${esc(g.short)}</i>${esc(g.zh)}</span>
      <span class="dim">HP ${fmt(s2.hp)}　ATK ${fmt(s2.atk)}</span>
      <div class="row">${tbtns}<button class="btn xs" data-act="den-remove" data-id="${m.id}">撤</button></div>
    </div>`);
  }

  /* 怪物库 */
  const rank = app.ui.denRank || 'all';
  const fitOnly = app.ui.denFit !== false;
  const pool = denPool(data, n).list;
  let shown = pool.filter((m) => (rank === 'all' || m.rank === rank));
  if (fitOnly) shown = shown.filter((m) => monCost(m, 't1') <= left + 1e-6);
  const cut = 150;
  const more = Math.max(0, shown.length - cut);
  const rows = shown.slice(0, cut).map((m) => {
    const g = DEN_GUARDS[m.guard];
    const picked = picks.some((p) => p.id === m.id);
    const c1 = monCost(m, 't1');
    const c3 = monCost(m, 't3');
    const poor = picks.length >= DEN_SLOTS || c1 > left + 1e-6;
    return `<button class="denmon ${m.rank}${picked ? ' sel' : ''}${poor && !picked ? ' poor' : ''}" data-act="den-pick" data-id="${m.id}"
      title="${esc(m.zh)}｜${RANK_ZH[m.rank]}｜${m.reach === 'front' ? '近战（只能打前排）' : '远程（可越过前排）'}\n${esc(g.zh)}：${esc(g.d)}">
      <img src="${img(m.img)}" alt="" loading="lazy">
      <b>${esc(m.zh)}</b>
      <em class="dencost">${c1}</em>
      <span class="dim">${RANK_ZH[m.rank]} · ${m.reach === 'front' ? '近' : '远'}</span>
      <i class="deng" title="${esc(g.zh)}：${esc(g.d)}">${esc(g.short)}</i>
      ${picked ? '<u class="denon">已上场</u>' : ''}
    </button>`;
  }).join('');

  return `<div class="page"><h2>逆潮守关 <small>第 ${n} 关 · ${esc(stage.name)}</small></h2>
  <div class="row"><button class="btn sm" data-act="den-back">← 关卡列表</button>
    <span class="dim">算力 <b class="${over ? 'denbad' : ''}">${used}</b> / ${stage.cpu}</span></div>

  <div class="banner-card lk"><div>
    <h3>${esc(stage.name)} <small>玩家 Lv.${stage.lv}${stage.star ? ` · ${stage.star} 叠` : ''} · 算力 ${stage.cpu}${stage.boss ? ' · 精英玩家' : ''}</small></h3>
    <p>${esc(stage.note)}</p>
    <div class="row">${stage.rules.length ? stage.rules.map((r) => `<i class="denrule">${esc(RULE_ZH[r] || r)}</i>`).join('') : '<i class="denrule off">这一关没有额外战术</i>'}</div>
    <div class="denteam">${pcards}</div>
    ${hints.length ? `<p class="hint">${hints.map((x) => esc(x)).join('<br>')}</p>` : ''}
  </div></div>

  <div class="banner-card lk"><div>
    <h3>守关队 <small>${picks.length}/${DEN_SLOTS} 只 · 算力 ${used} / ${stage.cpu}${left >= 0 ? `　余 ${left}` : '　<span class="denbad">超了</span>'}</small></h3>
    <div class="denbar"><i class="${over ? 'denbad' : ''}" style="width:${Math.min(100, Math.round((used / Math.max(0.1, stage.cpu)) * 100))}%"></i><em>${used} / ${stage.cpu}</em></div>
    <div class="denslots">${slots.join('')}</div>
    <div class="row">
      <button class="btn gold" data-act="den-fight" ${chk.ok ? '' : 'disabled'}>开打</button>
      <button class="btn" data-act="den-clear" ${picks.length ? '' : 'disabled'}>清空</button>
      ${lastLine && lastLine.length ? `<button class="btn sm" data-act="den-last">载入上次这套</button>` : ''}
    </div>
    <p class="hint">${chk.ok ? '守关成功 = 把四个玩家全部打光（20 回合内）。剩六成血 2 星，剩八成血且 12 回合内解决 3 星。' : esc(chk.err || '')}</p>
    <p class="hint">近战怪只能打前排，远程怪可以越过前排点后排——站位本身就是一种克制。「幼 / 成 / 巨」是同一只怪的三个成长档：幼体便宜量大怕群攻，巨体一口价很贵但单只怕集火。</p>
  </div></div>

  <h3>怪物库 <small>第 ${denStage(n).chapter} 章已解锁 ${pool.length} 只${more ? ` · 只显示前 ${cut} 只` : ''}</small></h3>
  <div class="row denfilter">
    ${[['all', '全部'], ['Normal', '普通'], ['Elite', '精英'], ['Boss', '首领']].map(([k, zh]) => `<button class="btn sm ${rank === k ? 'gold' : ''}" data-act="den-rank" data-k="${k}">${zh}</button>`).join('')}
    <button class="btn sm ${fitOnly ? 'gold' : ''}" data-act="den-fit">只看装得下的</button>
  </div>
  <div class="denmons">${rows || '<p class="dim">没有装得下的怪了，把档位降一档或者先撤一只。</p>'}</div>
  </div>`;
}

/* ---------------------------------------------------------------- 弹窗 */
/** 结算：胜负 / 星级 / 剩余血量 / 奖励 / 这一关的机制提示 */
export function denResultModal(app, out, rw, n) {
  const stage = denStage(n);
  const hint = denHint(n);
  const bits = [
    rw.gold ? `金币 +${fmt(rw.gold)}` : '', rw.cores ? `银芯 +${fmt(rw.cores)}` : '', rw.tickets ? `唤醒券 +${rw.tickets}` : '',
  ].filter(Boolean).join('　');
  const lineup = out.mons.map((m) => `${esc(m.name)}（${m.cost}）`).join('、');
  openModal(`<h3>${out.win ? `守住第 ${n} 关` : `第 ${n} 关被攻破`}</h3>
    <p>${out.win ? `<b class="gold">${stars(out.stars)}</b>　剩 ${Math.round(out.hpLeft * 100)}% 生命　${out.res.rounds} 回合` : `玩家还剩 ${Math.round(out.playerLeft * 100)}% 生命`}</p>
    <p class="hint">${esc(stage.name)} · 玩家 Lv.${stage.lv}${stage.star ? ` · ${stage.star} 叠` : ''} · 算力 ${out.cpu}</p>
    <p class="hint">你的守关队：${lineup || '—'}</p>
    ${bits ? `<p class="hint">${bits}${rw.first ? '（首通）' : ''}${rw.starsUp ? `　星级提升 +${rw.starsUp}` : ''}</p>` : ''}
    ${hint.length ? `<p class="hint">这一关的机制：${hint.map((x) => esc(x)).join('；')}</p>` : ''}
    <div class="row">
      <button class="btn gold" data-act="den-retry" data-n="${n}">重新编队</button>
      ${out.win ? `<button class="btn" data-act="den-next" data-n="${Math.min(DEN_MAX, n + 1)}">下一关</button>` : ''}
      <button class="btn" data-act="den-back">关卡列表</button>
    </div>`, 'wide');
}

/** 星级里程碑 / 全章奖励的领取反馈 */
export function denClaimModal(rw, ch) {
  openModal(`<h3>第 ${ch} 章 · 全部守住</h3>
    <p>金币 +${fmt(rw.gold)}　银芯 +${fmt(rw.cores)}　唤醒券 +${rw.tickets}</p>
    <div class="row"><button class="btn gold" data-act="den-back">回关卡列表</button></div>`);
}

export function denStarClaimToast(rw, need) {
  toast(`🏅 星级 ${need} 星达成：${rwZh(rw)}`, 4200);
}
