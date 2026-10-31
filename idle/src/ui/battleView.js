import { runBattle, applyResult, farmRate, firstClearReward, winRateOf, farmableStage } from '../core/game.js';
import { roundLimitFor, FRONT_SLOTS } from '../core/battle.js';
import { stageInfo } from '../core/enemies.js';
import { REALMS, TYPES, STATUS } from '../core/constants.js';
import { esc, img, fmt, $, toast, kwIcon, stripMarks } from './util.js';
import { reportHtml, settlementModal, settleMode } from './report.js';
import { analyzeBattle } from '../core/report.js';
import { monsterModal, intentIcon } from './codex.js';
import { sound } from './audio.js';
import { FX, COLORS } from './fx.js';

const STAT_ZH = { atk: '攻击', def: '防御', crit: '暴击', amp: '增伤', vuln: '易伤' };

/* 播放节奏：固定一套，不再有倍速 / 极速开关。
   数值约等于原来默认的 ×2，既看得到演出，也不至于一场打太久。 */
const PACE = { act: 150, dmg: 56, dot: 42, heal: 52, shield: 42, round: 74, die: 86, end: 0 };
const GAP = 24;            // 默认事件间隔
const NEXT_GAP = 700;      // 一场结束到下一场开始的停顿

// Plays a pre-computed battle log. 自动挂机时无限连战；手动攻坚时每场都要点「开战」。
export class BattleView {
  constructor(root, app) {
    this.root = root; this.app = app; this.timer = null; this.running = false; this.token = 0;
    this.phase = 'idle';
    root.innerHTML = `
      <div class="stage-head">
        <div><div class="stage-name" id="bv-name"></div><div class="stage-sub" id="bv-sub"></div></div>
        <div class="stage-ctl">
          <button class="btn sm" data-bv="prev" id="bv-prev" title="上一关">◀</button>
          <button class="btn sm" data-bv="next" id="bv-next" title="下一关">▶</button>
          <button class="btn sm" data-bv="auto" id="bv-auto"></button>
        </div>
      </div>
      <div class="farm" id="bv-farm"></div>
      <div class="fightbar" id="bv-fight"></div>
      <div class="field" id="bv-field"><div class="bv-scene" id="bv-scene"></div><div class="side enemies" id="bv-e"></div><div class="vs" id="bv-round">—</div><div class="side allies" id="bv-a"></div></div>
      <div class="banner" id="bv-banner"></div>
      <div class="rewards" id="bv-rw"></div>
      <details class="meterbox"><summary>战斗数据（上一战）</summary><div id="bv-meter"></div></details>
      <div class="logbar"><span>战斗记录</span>
        <button class="btn xs" id="bv-loglock" title="锁定后不再自动滚到底部，方便回看刚才发生了什么">🔓 跟随最新</button>
        <button class="btn xs" id="bv-logjump" hidden>回到底部 ↓</button>
      </div>
      <div class="log" id="bv-log"></div>`;
    root.addEventListener('click', (e) => {
      if (e.target.closest('#bv-loglock')) { this.setLogFollow(!this.logFollow); return; }
      if (e.target.closest('#bv-logjump')) { this.setLogFollow(true); return; }
      const b = e.target.closest('[data-bv]'); if (b) { this.ctl(b.dataset.bv); return; }
      const f = e.target.closest('.unit.foe[data-mid]'); if (f) monsterModal(this.app, f.dataset.mid);
    });
    // 战斗记录：默认「跟随最新」，但玩家一往上翻就自动锁住不再抢滚动条，
    // 下面会亮起「回到底部」；点锁定按钮也能手动钉住 / 恢复。选择记在本地，下次进来还是上次的样子。
    const lg = $('#bv-log', root);
    this.logFollow = localStorage.getItem('idle.logFollow') !== '0';
    this.setLogFollow(this.logFollow, true);
    lg.addEventListener('scroll', () => {
      const atEnd = lg.scrollHeight - lg.scrollTop - lg.clientHeight < 18;
      if (atEnd && !this.logFollow) this.setLogFollow(true);
      else if (!atEnd && this.logFollow) this.setLogFollow(false);
    });
    this.fx = new FX($('#bv-field', root));
    this.fx.speed = 1;
    this.refreshHead();
  }

  colorOf(u) { return (u && COLORS[u.realm]) || (u?.el.classList.contains('foe') ? '#ff8c7a' : COLORS.none); }

  maxTarget() { return this.app.state.maxStage + 1; }

  ctl(a) {
    const s = this.app.state;
    if (a === 'detail') { if (this.lastCtx) settlementModal(this.app, this.lastCtx); return; }
    if (a === 'auto') {
      s.auto = !s.auto;
      toast(s.auto ? '自动挂机：打赢且从容就自动推进下一关' : '手动挂机：留在当前关反复刷，不再自动推进；用 ◀ ▶ 换关');
      this.app.save(); this.refreshHead(); this.restart();
      return;
    }
    if (a === 'prev' && s.stage > 1) { s.stage--; this.restart(); }
    if (a === 'next') {
      if (s.stage < this.maxTarget()) { s.stage++; this.restart(); }
      else toast('先通关当前关卡才能继续');
    }
    // 当前关胜率 0：一键退到「有收益的最高层」（和自动挂机的兜底、离线结算同一套判定）
    if (a === 'fallback') {
      const cur = s.stage;
      const farm = farmableStage(s, this.app.data);
      if (farm.fellBack) {
        s.stage = farm.stage;
        toast(`第 ${cur} 关打不过（胜率 0），已退回第 ${farm.stage} 关挂机`);
        this.app.save(); this.refreshHead(); this.restart();
      } else toast('这一关打得过，不用退');
      return;
    }
    this.app.save(); this.refreshHead();
  }

  refreshHead() {
    const s = this.app.state, i = stageInfo(s.stage);
    const lim = roundLimitFor(i);
    $('#bv-name', this.root).textContent = `第 ${s.stage} 关 · ${i.name}`;
    $('#bv-sub', this.root).innerHTML = `${i.node}/10 ${i.boss ? '· BOSS' : i.elite ? '· 精英' : ''}　最高通关：${s.maxStage}　<b class="turncap">限 ${lim} 回合</b>${s.stage > s.maxStage ? '　· 攻坚中' : ''}`;
    $('#bv-auto', this.root).textContent = s.auto ? '自动挂机' : '手动挂机';
    $('#bv-auto', this.root).classList.toggle('on', s.auto);
    // 战场背景跟着章节换（典藏室 CG 压暗后铺在战场后面）
    const sc = $('#bv-scene', this.root);
    if (sc) { const n = 27 + ((i.chapter - 1) % 6); sc.style.backgroundImage = `url(public/img/bg/hall-${String(n).padStart(2, '0')}.webp)`; }
    $('#bv-next', this.root).disabled = s.stage >= this.maxTarget();
    const prev = $('#bv-prev', this.root); if (prev) prev.disabled = s.stage <= 1;
    this.renderFarm();
    this.app.refreshTop();
  }

  /* ---------- 挂机收益面板：当前关 / 下一关，口径与离线结算一致 ---------- */
  farmSig() {
    const s = this.app.state;
    return [s.stage, s.maxStage, s.auto ? 1 : 0, s.team.join(','), Object.values(s.roster).map((r) => `${r.lv}.${r.star}.${r.brk}.${r.od || 0}.${r.law || 0}`).join('|'), (s.gear.relics || []).join(','), (s.orders?.slots || []).join(','), Object.keys(s.gear.items).length].join('#');
  }
  farmData() {
    const s = this.app.state, d = this.app.data;
    const sig = this.farmSig();
    if (this._farm?.sig === sig) return this._farm;
    const cur = farmRate(s, d, s.stage);
    const nxtStage = s.stage + 1;
    const nxt = farmRate(s, d, nxtStage);
    this._farm = { sig, cur, nxt: nxtStage, nxtRate: nxt };
    return this._farm;
  }

  renderFarm() {
    const s = this.app.state;
    const f = this.farmData();
    // 关数加成：挂机越深，每场的券/银芯掉率越高（金币本来就跟关数走，不用标）
    const bst = (r) => `<div class="farmbst">关数加成　券 ×${r.ticketBoost.toFixed(2)}（${r.winsPerTicket.toFixed(0)} 场 1 张）· 银芯 ×${r.coreBoost.toFixed(2)}（${r.winsPerCore.toFixed(0)} 场 1 枚）</div>`;
    const col = (label, r, extra = '') => `<div class="farmc">
      <div class="farmh"><span>${label}</span><b>第 ${r.stage} 关</b></div>
      <div class="farmrows">
        <div><span>胜率</span><b class="${r.rate >= 1 ? 'ok' : r.rate <= 0 ? 'bad' : ''}">${Math.round(r.rate * 100)}%</b></div>
        <div><span>金币/小时</span><b class="g">${fmt(r.goldPerHour)}</b></div>
        <div><span>单场金币</span><b>${fmt(r.perBattle)}</b></div>
        <div><span>召唤券/小时</span><b class="t">${r.ticketsPerHour.toFixed(2)}</b></div>
        <div><span>银芯/小时</span><b class="c">${r.coresPerHour.toFixed(2)}</b></div>
        <div><span>装备/小时</span><b class="i">${r.dropsPerHour.toFixed(2)}</b></div>
      </div>${bst(r)}${extra}</div>`;
    const nf = f.nxtRate;
    const pct = (a, b) => (b >= a ? '+' : '') + ((b / a - 1) * 100).toFixed(1) + '%';
    // 胜率为 0 的科目不参与对比（算出来没意义），一项都比不了就直说打不过
    const deltas = [['金币', f.cur.goldPerHour, nf.goldPerHour], ['召唤券', f.cur.ticketsPerHour, nf.ticketsPerHour], ['银芯', f.cur.coresPerHour, nf.coresPerHour]]
      .filter(([, a]) => a > 0).map(([n, a, b]) => `${pct(a, b)} ${n}`);
    const first = firstClearReward(f.nxt);
    const extra = `<div class="farmx">${deltas.length ? `下一关 ${deltas.join(' · ')}` : '下一关：当前队伍还打不过（胜率 0）'}${f.nxt > s.maxStage ? `　首通：券+${first.tickets} 银芯+${first.cores}${first.order ? ' 钥令+1' : ''}${first.gear ? ' 装备+1' : ''}` : ''}</div>`;
    // 校猫奖励关：每 40 关一次，提示一下，别让人以为只是普通 Boss
    const catNote = (st) => (stageInfo(st)?.reward ? `<div class="farmx cat">🐈 第 ${st} 关是「校猫」奖励关：打赢额外掉召唤券 5 + 银芯 60 + 装备，首杀翻倍；非首杀的额外奖励每天限 3 次</div>` : '');
    /* 当前这一关胜率 0 = 挂机没有收益。攻坚时挂机跟着攻打层走，很容易撞上这种情况，
       所以直接把「有收益的最高层」找出来，给一颗一键退回的按钮。 */
    const best = f.cur.rate <= 0 ? farmableStage(s, this.app.data) : null;
    const stall = best?.fellBack
      ? `<div class="farmx warn">⚠ 第 ${f.cur.stage} 关胜率 0，挂在这儿<b>没有收益</b>；有收益的最高层是第 ${best.stage} 关。<button class="btn sm" data-bv="fallback">退回第 ${best.stage} 关挂机</button></div>`
      : '';
    $('#bv-farm', this.root).innerHTML = `
      <div class="farmgrid">
        ${col('当前挂机', f.cur, stall + catNote(f.cur.stage))}
        ${col('下一关', nf, extra + catNote(f.nxt))}
      </div>
      <p class="hint">一场按 25 秒结算：金币 = 单场金币 × 胜率；召唤券与银芯的基础掉率是 40 场 1 张 / 90 场 1 枚，并<b>随关卡缓慢提升</b>——每深一关 +1.8% / +2.6%（第 60 关约 2.1× / 2.6×，第 100 关约 2.8× / 3.6×），挂得越深越值钱；装备每场 10% 掉落。在线与离线同一口径（离线最多累计 8 小时）。
        ${s.auto ? '自动挂机中：打赢且「从容」（存活 ≥3 人、回合数达标）才自动推进，否则原地刷；<b>打不过的关不会死守</b>——前线失手、或在已通关的关上连输 3 场，都会自动退到有收益的最高层。' : '手动挂机中：<b>不会自动推进关卡</b>，只在这一关反复刷（收益按本关算）；要打更高关用右上角 ▶ 自己走过去。'}</p>`;
  }

  /* ---------- 战斗流 ---------- */
  start() {
    if (this.running) return;
    this.running = true;
    this.next();
  }
  stop() { this.running = false; this.token++; clearTimeout(this.timer); this.phase = 'idle'; }
  restart() { this.stop(); this.start(); }

  // 手动挂机：战斗照常连打（还是挂机），只是**不自动推进关卡**，关卡由 ◀ ▶ 自己选
  renderFightBar() {
    const s = this.app.state, bar = $('#bv-fight', this.root);
    if (s.auto) { bar.innerHTML = ''; return; }
    const frontier = s.stage > s.maxStage;
    bar.innerHTML = `<span class="manual-note">手动挂机 · 停在第 <b>${s.stage}</b> 关${frontier ? '（攻坚中）' : ''}反复刷，打赢也<b>不往前推进</b>${frontier ? `，输了也留在这关` : ''}；要换关卡用右上角 ◀ ▶。</span>`;
  }

  next() {
    if (!this.running) return;
    const tok = ++this.token;
    const s = this.app.state;
    s.lastSeen = Date.now();
    const res = runBattle(s, this.app.data, s.stage);
    this.res = res;
    this.roundLimit = res.roundLimit || roundLimitFor(stageInfo(s.stage));
    this.units = {};
    this.draw(res);
    this.fx.clear(); this.fx.speed = 1;
    $('#bv-round', this.root).textContent = `— / ${this.roundLimit}`;
    $('#bv-round', this.root).classList.remove('urgent');
    this.phase = 'playing';
    this.renderFightBar();
    const bossFight = res.prep.enemies.some((d) => d.boss);
    this.bossNow = bossFight;   // 切回战斗页时 show() 用它决定放「战场」还是「威压」
    sound.setMood(bossFight ? 'boss' : 'field');
    if (bossFight) { sound.play('boss'); this.fx.bossIntro(); }
    $('#bv-banner', this.root).textContent = '';
    $('#bv-banner', this.root).className = 'banner';
    this.evs = res.events;
    this.ei = 0;
    const step = () => {
      if (tok !== this.token) return;
      const e = this.evs[this.ei++];
      if (!e) { this.finish(this.res, tok); return; }
      this.apply(e, false);
      const d = PACE[e.k] ?? GAP;
      this.timer = setTimeout(step, d);
    };
    step();
  }

  draw(res) {
    const mk = (d, u, side) => {
      const id = `${side}${u}`;
      return `<div class="unit ${side === 'e' ? 'foe' : ''} ${d.boss ? 'boss' : ''} ${d.reward ? 'reward' : ''}" id="u-${id}" ${d.mid ? `data-mid="${d.mid}"` : ''} style="--rc:${REALMS[d.realm]?.color || '#6b7280'}">
        <div class="u-pic"><img src="${img(d.img)}" alt=""><span class="u-tag">${esc(d.type && side === 'a' ? TYPES[d.type].short : '')}</span><div class="u-say"></div></div>
        <div class="u-name" ${side === 'e' && d.skills?.length ? `title="${esc(d.skills.map((x) => `${x.name}：${stripMarks(x.plain)}`).join('\n'))}"` : ''}>${esc(d.name)}${d.reward ? '<span class="rw-tag">奖励</span>' : ''}</div>
        <div class="u-row ${u < FRONT_SLOTS ? 'front' : 'back'}">${u < FRONT_SLOTS ? '前排' : '后排'}</div>
        ${side === 'e' ? '<div class="u-int" title="下一步行动"></div>' : ''}
        <div class="u-st"></div>
        <div class="bar hp"><i style="width:100%"></i><b>${fmt(d.hp)}</b><u class="sh" style="width:0"></u></div>
        ${side === 'a' ? `<div class="bar ali"><i style="width:${Math.min(100, d.openAli || 0)}%"></i></div><div class="bar key"><i style="width:${Math.min(100, d.openKey || 0)}%"></i></div>` : ''}
      </div>`;
    };
    $('#bv-e', this.root).innerHTML = res.prep.enemies.map((d, i) => mk(d, i, 'e')).join('');
    $('#bv-a', this.root).innerHTML = res.prep.allies.map((d, i) => mk(d, i, 'a')).join('');
    for (const [side, arr] of [['e', res.prep.enemies], ['a', res.prep.allies]]) arr.forEach((d, i) => { this.units[`${side}${i}`] = { max: d.hp, el: $(`#u-${side}${i}`, this.root), name: d.name, realm: d.realm }; });
  }

  float(u, text, cls) {
    if (!u?.el) return;
    const f = document.createElement('span');
    f.className = `float ${cls}`; f.textContent = text;
    f.style.left = 20 + Math.random() * 50 + '%';
    u.el.querySelector('.u-pic').appendChild(f);
    setTimeout(() => f.remove(), 900);
  }

  setLogFollow(on, silent) {
    this.logFollow = on;
    try { localStorage.setItem('idle.logFollow', on ? '1' : '0'); } catch { /* 隐私模式下写不了，无所谓 */ }
    const b = $('#bv-loglock', this.root), j = $('#bv-logjump', this.root), l = $('#bv-log', this.root);
    if (b) { b.textContent = on ? '🔓 跟随最新' : '🔒 已锁定'; b.classList.toggle('on', !on); }
    if (j) j.hidden = on;
    if (on && l) l.scrollTop = l.scrollHeight;
    if (!silent && !on) toast('战斗记录已锁定：不会再自动往下滚，看完点「回到底部」或再点一次锁定恢复', 2600);
  }

  log(html, cls = '') {
    const l = $('#bv-log', this.root);
    const d = document.createElement('div');
    d.className = cls; d.innerHTML = html;
    l.appendChild(d);
    while (l.children.length > 60) l.firstChild.remove();
    if (this.logFollow) l.scrollTop = l.scrollHeight;
    else { const j = $('#bv-logjump', this.root); if (j) j.hidden = false; }
  }

  setStatus(u, list) {
    const kw = this.app.data.kw;
    u.el.querySelector('.u-st').innerHTML = (list || []).map((x) => {
      const st = STATUS[x.id];
      const k = kw?.[st.kw];
      return `<span class="sti" data-kw="${st.kw}" title="${esc(st.zh)} ${x.n}">${kwIcon(kw, st.kw, 14) || `<em>${esc(st.zh.slice(0, 1))}</em>`}<b>${x.n}</b></span>`;
    }).join('');
  }

  setBars(u, e) {
    const hp = u.el.querySelector('.hp');
    hp.firstElementChild.style.width = `${Math.max(0, (e.hp / u.max) * 100)}%`;
    hp.querySelector('b').textContent = fmt(e.hp);
    if (e.shield != null) hp.querySelector('.sh').style.width = `${Math.min(100, (e.shield / u.max) * 100)}%`;
  }

  apply(e, quiet) {
    const U = (id) => this.units[id.replace(/^(.)(\d+)$/, '$1$2')];
    const nm = (id) => `<b class="${id[0] === 'a' ? 'ca' : 'ce'}">${esc(U(id)?.name)}</b>`;
    switch (e.k) {
      case 'round': {
        const lim = this.roundLimit || 0;
        const el = $('#bv-round', this.root);
        el.textContent = lim ? `第 ${e.n} / ${lim} 回合` : `第 ${e.n} 回合`;
        el.classList.toggle('urgent', !!lim && e.n >= lim - 2);
        if (!quiet) this.log(`—— 第 ${e.n} 回合 ——`, 'rnd');
        break;
      }
      case 'act': {
        const u = U(e.who);
        if (!quiet && u) {
          for (const x of Object.values(this.units)) x.el.classList.remove('acting');
          u.el.classList.add('acting');
          const say = u.el.querySelector('.u-say'); say.textContent = e.name; say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop');
          const fu = u.el.classList.contains('foe');
          const side = fu ? 'e' : 'a';
          u.el.classList.remove('lunge-a', 'lunge-e'); void u.el.offsetWidth; u.el.classList.add(`lunge-${side}`);
          if (e.slot === 'Exalt' || e.slot === 'OverExalt') { this.fx.exalt(u.el, this.colorOf(u), e.slot === 'OverExalt'); u.el.classList.remove('exalting'); void u.el.offsetWidth; u.el.classList.add('exalting'); }
          if (e.slot === 'Exalt' || e.slot === 'OverExalt') sound.play('exalt');
          else if (e.slot === 'Skill1' || e.slot === 'Skill2' || e.slot === 'Rouse') sound.play('skill', { realm: u.realm });
          else if (!fu) sound.play('swing', { realm: u.realm });
          this.log(`${nm(e.who)} 使用 <i class="sk ${e.slot}" ${e.text ? `title="${esc(e.text)}"` : ''}>${esc(e.name)}</i>`);
        }
        break;
      }
      case 'intent': {
        const u = U(e.who); if (!u) break;
        const el = u.el.querySelector('.u-int');
        if (el) { el.innerHTML = `${intentIcon(e.ic, 18)}<span>${esc(e.name)}</span>`; el.title = `下一步：${e.name}${e.text ? '\n' + stripMarks(e.text) : ''}`; }
        break;
      }
      case 'st': { const u = U(e.who); if (u) this.setStatus(u, e.list); break; }
      case 'status': { const u = U(e.who); if (u && !quiet) { this.float(u, STATUS[e.s]?.zh || ({ cleanse: '净化', stun: '眩晕', delay: '蓄力' })[e.s] || '', u.el.classList.contains('foe') ? 'debuff' : 'buff'); sound.play('status'); this.fx.aura(u.el, u.el.classList.contains('foe') ? COLORS.debuff : COLORS.buff, !u.el.classList.contains('foe')); } break; }
      case 'dmg': case 'dot': case 'counter': {
        const u = U(e.who); if (!u) break;
        this.setBars(u, e);
        if (e.blocked) { if (!quiet) { this.float(u, '屏障!', 'sh'); sound.play('block'); } break; }
        if (!quiet) {
          const att = e.by ? this.units[e.by] : null, foe = u.el.classList.contains('foe');
          const col = this.colorOf(att);
          if (e.k === 'dot') (e.s === 'poison' ? this.fx.poison(u.el) : this.fx.bleed(u.el));
          else { this.fx.hit(u.el, col, { crit: e.crit, amt: e.amt }); if (e.k === 'dmg') this.fx.trail(att?.el, u.el, col); if (e.crit) { this.fx.flash('#fff', 0.18); this.fx.shake(5); } }
          sound.play(e.k === 'counter' ? 'counter' : e.k === 'dot' ? 'dot' : e.crit ? 'crit' : 'hit', { realm: att?.realm, foe, s: e.s, amt: e.amt });
          this.float(u, (e.crit ? '暴击 ' : e.k === 'counter' ? '反击 ' : e.s === 'poison' ? '中毒 ' : '') + '-' + fmt(e.amt), e.crit ? 'crit' : e.k === 'dot' ? 'dot' : 'dmg');
          u.el.classList.remove('hit'); void u.el.offsetWidth; u.el.classList.add('hit');
          if (e.saved) this.float(u, '死扛!', 'heal');
          this.log(`　${e.k === 'dot' ? (e.s === 'poison' ? '中毒 ' : '流血 ') : e.k === 'counter' ? '反击 ' : ''}${nm(e.who)} −${fmt(e.amt)}${e.absorbed ? `（盾 ${fmt(e.absorbed)}）` : ''}${e.crit ? ' 暴击' : ''}`, 'dm');
        }
        break;
      }
      case 'heal': { const u = U(e.who); if (!u) break; this.setBars(u, { hp: e.hp }); if (!quiet && e.amt) { sound.play('heal'); this.fx.heal(u.el); this.float(u, '+' + fmt(e.amt), 'heal'); this.log(`　${nm(e.who)} +${fmt(e.amt)}`, 'hl'); } break; }
      case 'shield': { const u = U(e.who); if (!u) break; u.el.querySelector('.sh').style.width = `${Math.min(100, (e.shield / u.max) * 100)}%`; if (!quiet) { this.float(u, '盾 ' + fmt(e.amt), 'sh'); sound.play('shield'); this.fx.shield(u.el); } break; }
      case 'buff': if (!quiet) { sound.play(e.v > 0 ? 'buff' : 'debuff'); const u = U(e.who); if (u) this.fx.aura(u.el, e.v > 0 ? COLORS.buff : COLORS.debuff, e.v > 0); this.float(u, `${STAT_ZH[e.stat] || ''}${e.v > 0 ? '↑' : '↓'}`, e.v > 0 ? 'buff' : 'debuff'); } break;
      case 'gauge': { const u = U(e.who); if (!u || e.ali == null) break; const a = u.el.querySelector('.ali i'), k = u.el.querySelector('.key i'); if (a) a.style.width = e.ali + '%'; if (k) k.style.width = e.key + '%'; break; }
      case 'revive': { const u = U(e.who); if (!u) break; u.el.classList.remove('dead'); this.setBars(u, { hp: e.hp }); if (!quiet) { sound.play('heal'); this.fx.heal(u.el); this.float(u, '复苏', 'heal'); this.log(`　${nm(e.who)} 复苏了`, 'hl'); } break; }
      case 'die': { const u = U(e.who); if (u) { u.el.classList.add('dead'); this.setStatus(u, []); const ii = u.el.querySelector('.u-int'); if (ii) ii.innerHTML = ''; } if (!quiet) { sound.play('die', { foe: u?.el.classList.contains('foe') }); if (u) this.fx.death(u.el, this.colorOf(u)); this.log(`　${nm(e.who)} 倒下了`, 'dead'); } break; }
      case 'end': break;
    }
  }

  finish(res, tok) {
    if (tok !== this.token) return;
    const s = this.app.state;
    const before = s.maxStage;
    const rw = applyResult(s, this.app.data, res);
    s.lastSeen = Date.now();
    this.phase = 'done';
    const b = $('#bv-banner', this.root);
    b.className = `banner ${res.win ? 'win' : 'lose'}`;
    sound.play(res.win ? 'win' : 'lose');
    if (res.win) { this.fx.confetti(); this.fx.flash('#ffd36b', 0.12); }
    b.textContent = res.win
      ? `胜利 · ${res.rounds} 回合`
      : res.timeout
        ? `超时判负 · ${res.rounds} 回合没清场（上限 ${res.roundLimit}）`
        : '全员倒下 · 战斗失败';
    const parts = [];
    if (res.win) parts.push(`<span class="g">金币 +${fmt(rw.gold)}</span>`);
    if (rw.tickets) parts.push(`<span class="t">召唤券 +${rw.tickets}</span>`);
    if (rw.cores) parts.push(`<span class="c">银芯 +${rw.cores}</span>`);
    // 挂机零头：券/银芯一场给不满 1 个，把当前攒到多少写出来，玩家能看到进度
    if (res.win) {
      const dt = Math.max(0, s.drip?.tickets || 0), dc = Math.max(0, s.drip?.cores || 0);
      if (dt < 1 || dc < 1) parts.push(`<span class="d">挂机零头：券 ${dt.toFixed(2)} / 银芯 ${dc.toFixed(2)}</span>`);
    }
    for (const it of rw.items) parts.push(`<span class="i">获得装备：${esc(this.app.itemName(it))}</span>`);
    for (const od of rw.orders) parts.push(`<span class="i">获得钥令：${esc(this.app.data.orderById[od.id]?.zh || od.id)}</span>`);
    if (rw.firstClear) parts.push('<span class="n">首通!</span>');
    if (rw.advanced) parts.push(`<span class="n">推进 → 第 ${s.stage} 关</span>`);
    if (rw.stayed && res.win) parts.push(`<span class="n">留在第 ${s.stage} 关继续挂机</span>`);
    if (rw.retreat) parts.push(`<span class="r">打不过第 ${res.stage} 关，退回第 ${rw.retreatTo || s.stage} 关挂机（有收益的最高层），提升战力再来</span>`);
    if (res.win && !rw.advanced && !rw.comfortable && s.stage <= s.maxStage) parts.push('<span class="r">赢得不够从容，继续在此关积累</span>');
    $('#bv-rw', this.root).innerHTML = parts.join('');
    const rep = analyzeBattle(res, res.prep.allies, res.prep.enemies), boss = res.prep.enemies.some((d) => d.boss);
    const ctx = { title: `第 ${res.stage} 关 · ${stageInfo(res.stage).name}`, rep, rw, fast: boss ? 20 : 14 };
    this.lastCtx = ctx;
    $('#bv-meter', this.root).innerHTML = reportHtml(rep) + '<div class="row"><button class="btn sm" data-bv="detail">打开完整结算</button></div>';
    const mode = settleMode.get();
    // 新手引导还没走完时不弹结算（弹出来会盖住引导，引导一关闭它又突然冒出来）
    const pop = !!s.guide && (mode === 'all' || (mode === 'key' && (rw.firstClear || (boss && res.win) || (rw.newMon?.length && res.win))));
    if (rw.firstClear && s.maxStage > before) this.log(`首次通关第 ${s.maxStage} 关`, 'rnd');
    this.app.save();
    this.refreshHead();
    this.app.onBattleDone?.(rw);

    if (!s.auto) this.renderFightBar();
    if (pop) { this.popSettle(ctx); return; }
    this.timer = setTimeout(() => this.next(), NEXT_GAP);
  }

  // auto-opened settlement: pause the chain until it is closed
  popSettle(ctx) {
    this.paused = true;
    const tok = this.token;
    settlementModal(this.app, ctx);
    const mo = new MutationObserver(() => {
      if (!document.querySelector('.modal-bg')) {
        mo.disconnect(); this.paused = false;
        // 自动 / 手动都是连打（手动只是不推进关卡），所以关闭结算后一律继续
        // token 变了说明期间已经 stop / restart 过，新的战斗链自己在跑，别再叠一条
        if (this.running && tok === this.token) this.timer = setTimeout(() => this.next(), 320);
      }
    });
    mo.observe(document.body, { childList: true });
  }
}
