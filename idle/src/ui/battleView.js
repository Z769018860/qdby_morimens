import { runBattle, applyResult, prepareBattle, farmRate, firstClearReward, winRateOf } from '../core/game.js';
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
      <div class="field" id="bv-field"><div class="side enemies" id="bv-e"></div><div class="vs" id="bv-round">—</div><div class="side allies" id="bv-a"></div></div>
      <div class="banner" id="bv-banner"></div>
      <div class="rewards" id="bv-rw"></div>
      <details class="meterbox"><summary>战斗数据（上一战）</summary><div id="bv-meter"></div></details>
      <div class="log" id="bv-log"></div>`;
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-bv]'); if (b) { this.ctl(b.dataset.bv); return; }
      const f = e.target.closest('.unit.foe[data-mid]'); if (f) monsterModal(this.app, f.dataset.mid);
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
      toast(s.auto ? '自动挂机：循环刷本关，从容胜利才推进' : '手动攻坚：点「开战」打一场，胜利即推进');
      this.app.save(); this.refreshHead(); this.restart();
      return;
    }
    if (a === 'fight') { if (this.phase !== 'playing') this.next(); return; }
    if (a === 'prev' && s.stage > 1) { s.stage--; this.restart(); }
    if (a === 'next') {
      if (s.stage < this.maxTarget()) { s.stage++; this.restart(); }
      else toast('先通关当前关卡才能继续');
    }
    this.app.save(); this.refreshHead();
  }

  refreshHead() {
    const s = this.app.state, i = stageInfo(s.stage);
    $('#bv-name', this.root).textContent = `第 ${s.stage} 关 · ${i.name}`;
    $('#bv-sub', this.root).textContent = `${i.node}/10 ${i.boss ? '· BOSS' : i.elite ? '· 精英' : ''}　最高通关：${s.maxStage}　${s.stage > s.maxStage ? '· 攻坚中' : ''}`;
    $('#bv-auto', this.root).textContent = s.auto ? '自动挂机：开' : '自动挂机：关';
    $('#bv-auto', this.root).classList.toggle('on', s.auto);
    $('#bv-next', this.root).disabled = s.stage >= this.maxTarget();
    const prev = $('#bv-prev', this.root); if (prev) prev.disabled = s.stage <= 1;
    this.renderFarm();
    this.app.refreshTop();
  }

  /* ---------- 挂机收益面板：当前关 / 下一关，口径与离线结算一致 ---------- */
  farmSig() {
    const s = this.app.state;
    return [s.stage, s.maxStage, s.auto ? 1 : 0, s.team.join(','), Object.values(s.roster).map((r) => `${r.lv}.${r.star}.${r.brk}`).join('|'), (s.gear.relics || []).join(','), (s.orders?.slots || []).join(','), Object.keys(s.gear.items).length].join('#');
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
    const col = (label, r, extra = '') => `<div class="farmc">
      <div class="farmh"><span>${label}</span><b>第 ${r.stage} 关</b></div>
      <div class="farmrows">
        <div><span>胜率</span><b class="${r.rate >= 1 ? 'ok' : r.rate <= 0 ? 'bad' : ''}">${Math.round(r.rate * 100)}%</b></div>
        <div><span>金币/小时</span><b class="g">${fmt(r.goldPerHour)}</b></div>
        <div><span>单场金币</span><b>${fmt(r.perBattle)}</b></div>
        <div><span>召唤券/小时</span><b class="t">${r.ticketsPerHour.toFixed(1)}</b></div>
        <div><span>银芯/小时</span><b class="c">${r.coresPerHour.toFixed(1)}</b></div>
        <div><span>装备/小时</span><b class="i">${r.dropsPerHour.toFixed(2)}</b></div>
      </div>${extra}</div>`;
    const nf = f.nxtRate;
    const delta = f.cur.goldPerHour > 0 ? (nf.goldPerHour / f.cur.goldPerHour - 1) * 100 : 0;
    const first = firstClearReward(f.nxt);
    const extra = `<div class="farmx">${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% 金币收益${f.nxt > s.maxStage ? `　首通：券+${first.tickets} 银芯+${first.cores}${first.order ? ' 钥令+1' : ''}${first.gear ? ' 装备+1' : ''}` : ''}</div>`;
    $('#bv-farm', this.root).innerHTML = `
      <div class="farmgrid">
        ${col('当前挂机', f.cur)}
        ${col('下一关', nf, extra)}
      </div>
      <p class="hint">一场按 25 秒结算：金币 = 单场金币 × 胜率；召唤券每 40 场 1 张、银芯每 90 场 1 枚、装备每场 10% 掉落。在线与离线同一口径（离线最多累计 8 小时）。
        ${s.auto ? '自动挂机中：打赢且「从容」（存活 ≥3 人、回合数达标）才自动推进，否则原地刷。' : '手动攻坚中：战斗不会自动重开，点「开战」打一场；<b>赢了就推进</b>，不看是否从容，适合硬闯高关拿更高挂机收益。'}</p>`;
  }

  /* ---------- 战斗流 ---------- */
  start() {
    if (this.running) return;
    this.running = true;
    if (this.app.state.auto) this.next();
    else this.preview();
  }
  stop() { this.running = false; this.token++; clearTimeout(this.timer); this.phase = 'idle'; }
  restart() { this.stop(); this.start(); }

  // 手动模式下的「待战」画面：把这一关的敌人摆出来，等玩家点开战
  preview(keepBanner = false) {
    const s = this.app.state;
    const prep = prepareBattle(s, this.app.data, s.stage);
    this.res = null; this.units = {};
    this.draw({ prep });
    this.fx.clear();
    $('#bv-round', this.root).textContent = '—';
    if (!keepBanner) {
      const b = $('#bv-banner', this.root);
      b.className = 'banner'; b.textContent = '';
      $('#bv-rw', this.root).innerHTML = '';
    }
    this.phase = 'ready';
    this.renderFightBar();
  }

  renderFightBar() {
    const s = this.app.state, bar = $('#bv-fight', this.root);
    if (s.auto) { bar.innerHTML = ''; return; }
    if (this.phase === 'playing') { bar.innerHTML = `<span class="dim">战斗中…</span>`; return; }
    const frontier = s.stage > s.maxStage;
    bar.innerHTML = `<button class="btn big gold" data-bv="fight">开战 · 第 ${s.stage} 关${frontier ? '（攻坚）' : ''}</button>
      <span class="hint">手动攻坚不会自动重开：赢一场推进一关，输了退回第 ${Math.max(1, s.maxStage)} 关。</span>`;
  }

  next() {
    if (!this.running) return;
    const tok = ++this.token;
    const s = this.app.state;
    s.lastSeen = Date.now();
    const res = runBattle(s, this.app.data);
    this.res = res;
    this.units = {};
    this.draw(res);
    this.fx.clear(); this.fx.speed = 1;
    this.phase = 'playing';
    this.renderFightBar();
    const bossFight = res.prep.enemies.some((d) => d.boss);
    sound.setMood(bossFight ? 'boss' : 'field');
    if (bossFight) { sound.play('boss'); this.fx.bossIntro(); }
    $('#bv-banner', this.root).textContent = '';
    $('#bv-banner', this.root).className = 'banner';
    const evs = res.events;
    let i = 0;
    const step = () => {
      if (tok !== this.token) return;
      const e = evs[i++];
      if (!e) { this.finish(res, tok); return; }
      this.apply(e, false);
      const d = PACE[e.k] ?? GAP;
      this.timer = setTimeout(step, d);
    };
    step();
  }

  draw(res) {
    const mk = (d, u, side) => {
      const id = `${side}${u}`;
      return `<div class="unit ${side === 'e' ? 'foe' : ''} ${d.boss ? 'boss' : ''}" id="u-${id}" ${d.mid ? `data-mid="${d.mid}"` : ''} style="--rc:${REALMS[d.realm]?.color || '#6b7280'}">
        <div class="u-pic"><img src="${img(d.img)}" alt=""><span class="u-tag">${esc(d.type && side === 'a' ? TYPES[d.type].short : '')}</span><div class="u-say"></div></div>
        <div class="u-name" ${side === 'e' && d.skills?.length ? `title="${esc(d.skills.map((x) => `${x.name}：${stripMarks(x.plain)}`).join('\n'))}"` : ''}>${esc(d.name)}</div>
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

  log(html, cls = '') {
    const l = $('#bv-log', this.root);
    const d = document.createElement('div');
    d.className = cls; d.innerHTML = html;
    l.appendChild(d);
    while (l.children.length > 60) l.firstChild.remove();
    l.scrollTop = l.scrollHeight;
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
      case 'round': $('#bv-round', this.root).textContent = `第 ${e.n} 回合`; if (!quiet) this.log(`—— 第 ${e.n} 回合 ——`, 'rnd'); break;
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
      case 'status': { const u = U(e.who); if (u && !quiet) { this.float(u, STATUS[e.s]?.zh || '', u.el.classList.contains('foe') ? 'debuff' : 'buff'); sound.play('status'); this.fx.aura(u.el, u.el.classList.contains('foe') ? COLORS.debuff : COLORS.buff, !u.el.classList.contains('foe')); } break; }
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
    b.textContent = res.win ? `胜利 · ${res.rounds} 回合` : (res.rounds >= 30 ? '超时 · 战斗失败' : '全员倒下 · 战斗失败');
    const parts = [];
    if (res.win) parts.push(`<span class="g">金币 +${fmt(rw.gold)}</span>`);
    if (rw.tickets) parts.push(`<span class="t">召唤券 +${rw.tickets}</span>`);
    if (rw.cores) parts.push(`<span class="c">银芯 +${rw.cores}</span>`);
    for (const it of rw.items) parts.push(`<span class="i">获得装备：${esc(this.app.itemName(it))}</span>`);
    for (const od of rw.orders) parts.push(`<span class="i">获得钥令：${esc(this.app.data.orderById[od.id]?.zh || od.id)}</span>`);
    if (rw.firstClear) parts.push('<span class="n">首通!</span>');
    if (rw.advanced) parts.push(`<span class="n">${rw.manual ? '攻坚成功' : '推进'} → 第 ${s.stage} 关</span>`);
    if (rw.retreat) parts.push('<span class="r">挑战失败，退回上一关挂机，提升战力再来</span>');
    if (res.win && !rw.advanced && !rw.comfortable && s.stage <= s.maxStage) parts.push('<span class="r">赢得不够从容，继续在此关积累</span>');
    $('#bv-rw', this.root).innerHTML = parts.join('');
    const rep = analyzeBattle(res, res.prep.allies, res.prep.enemies), boss = res.prep.enemies.some((d) => d.boss);
    const ctx = { title: `第 ${res.stage} 关 · ${stageInfo(res.stage).name}`, rep, rw, fast: boss ? 20 : 14 };
    this.lastCtx = ctx;
    $('#bv-meter', this.root).innerHTML = reportHtml(rep) + '<div class="row"><button class="btn sm" data-bv="detail">打开完整结算</button></div>';
    const mode = settleMode.get();
    const pop = mode === 'all' || (mode === 'key' && (rw.firstClear || (boss && res.win) || (rw.newMon?.length && res.win)));
    if (rw.firstClear && s.maxStage > before) this.log(`首次通关第 ${s.maxStage} 关`, 'rnd');
    this.app.save();
    this.refreshHead();
    this.app.onBattleDone?.(rw);

    if (!s.auto) {
      // 手动攻坚：不自动重开，摆出下一场的待战画面并等点击
      const txt = b.textContent, cls = b.className, rwHtml = $('#bv-rw', this.root).innerHTML;
      this.preview(true);
      const nb = $('#bv-banner', this.root);
      nb.className = cls; nb.textContent = txt;
      $('#bv-rw', this.root).innerHTML = rwHtml;
      if (pop) this.popSettle(ctx);
      return;
    }
    if (pop) { this.popSettle(ctx); return; }
    this.timer = setTimeout(() => this.next(), NEXT_GAP);
  }

  // auto-opened settlement: pause the chain until it is closed
  popSettle(ctx) {
    this.paused = true;
    settlementModal(this.app, ctx);
    const mo = new MutationObserver(() => {
      if (!document.querySelector('.modal-bg')) {
        mo.disconnect(); this.paused = false;
        if (this.running && this.app.state.auto) this.timer = setTimeout(() => this.next(), 320);
        else if (this.running) this.renderFightBar();
      }
    });
    mo.observe(document.body, { childList: true });
  }
}
