import { runBattle, applyResult, allyDef } from '../core/game.js';
import { stageInfo } from '../core/enemies.js';
import { REALMS, TYPES } from '../core/constants.js';
import { esc, img, fmt, $, toast } from './util.js';

const STAT_ZH = { atk: '攻击', def: '防御', crit: '暴击', amp: '增伤', vuln: '易伤' };

// Plays a pre-computed battle log; battles chain forever while the tab is visible.
export class BattleView {
  constructor(root, app) {
    this.root = root; this.app = app; this.timer = null; this.running = false; this.token = 0;
    root.innerHTML = `
      <div class="stage-head">
        <div><div class="stage-name" id="bv-name"></div><div class="stage-sub" id="bv-sub"></div></div>
        <div class="stage-ctl">
          <button class="btn sm" data-bv="prev" title="上一关">◀</button>
          <button class="btn sm" data-bv="next" title="挑战下一关">▶</button>
          <button class="btn sm" data-bv="auto" id="bv-auto"></button>
          <button class="btn sm" data-bv="speed" id="bv-speed"></button>
          <button class="btn sm" data-bv="skip" id="bv-skip"></button>
        </div>
      </div>
      <div class="field" id="bv-field"><div class="side enemies" id="bv-e"></div><div class="vs" id="bv-round">—</div><div class="side allies" id="bv-a"></div></div>
      <div class="banner" id="bv-banner"></div>
      <div class="rewards" id="bv-rw"></div>
      <div class="log" id="bv-log"></div>`;
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-bv]'); if (b) this.ctl(b.dataset.bv); });
    this.refreshHead();
  }

  ctl(a) {
    const s = this.app.state;
    if (a === 'auto') s.auto = !s.auto;
    if (a === 'speed') s.speed = { 1: 2, 2: 4, 4: 8, 8: 1 }[s.speed] || 1;
    if (a === 'skip') s.skipAnim = !s.skipAnim;
    if (a === 'prev' && s.stage > 1) { s.stage--; this.restart(); }
    if (a === 'next') { if (s.stage <= s.maxStage) { s.stage++; this.restart(); } else toast('先通关当前关卡'); }
    this.app.save(); this.refreshHead();
  }

  refreshHead() {
    const s = this.app.state, i = stageInfo(s.stage);
    $('#bv-name', this.root).textContent = `第 ${s.stage} 关 · ${i.name}`;
    $('#bv-sub', this.root).textContent = `${i.node}/10 ${i.boss ? '· BOSS' : i.elite ? '· 精英' : ''}　最高通关：${s.maxStage}`;
    $('#bv-auto', this.root).textContent = s.auto ? '自动推进:开' : '自动推进:关';
    $('#bv-speed', this.root).textContent = `×${s.speed}`;
    $('#bv-skip', this.root).textContent = s.skipAnim ? '极速:开' : '极速:关';
    $('#bv-skip', this.root).classList.toggle('on', s.skipAnim);
    $('#bv-auto', this.root).classList.toggle('on', s.auto);
    this.app.refreshTop();
  }

  start() { if (this.running) return; this.running = true; this.next(); }
  stop() { this.running = false; this.token++; clearTimeout(this.timer); }
  restart() { this.stop(); this.start(); }

  next() {
    if (!this.running) return;
    const tok = ++this.token;
    const s = this.app.state;
    s.lastSeen = Date.now();
    const res = runBattle(s, this.app.data);
    this.res = res;
    this.units = {};
    this.draw(res);
    $('#bv-banner', this.root).textContent = '';
    $('#bv-banner', this.root).className = 'banner';
    const evs = res.events;
    let i = 0;
    const skip = s.skipAnim;
    const step = () => {
      if (tok !== this.token) return;
      if (skip) { for (; i < evs.length; i++) this.apply(evs[i], true); this.finish(res, tok); return; }
      const e = evs[i++];
      if (!e) { this.finish(res, tok); return; }
      this.apply(e, false);
      const sp = this.app.state.speed;
      const d = { act: 300, dmg: 110, dot: 80, heal: 100, shield: 80, round: 140, die: 160, end: 0 }[e.k] ?? 40;
      this.timer = setTimeout(step, d / sp);
    };
    step();
  }

  draw(res) {
    const mk = (d, u, side) => {
      const id = `${side}${u}`;
      return `<div class="unit ${side === 'e' ? 'foe' : ''} ${d.boss ? 'boss' : ''}" id="u-${id}" style="--rc:${REALMS[d.realm]?.color || '#6b7280'}">
        <div class="u-pic"><img src="${img(d.img)}" alt=""><span class="u-tag">${esc(d.type && side === 'a' ? TYPES[d.type].short : '')}</span><div class="u-say"></div></div>
        <div class="u-name">${esc(d.name)}</div>
        <div class="bar hp"><i style="width:100%"></i><b>${fmt(d.hp)}</b><u class="sh" style="width:0"></u></div>
        ${side === 'a' ? `<div class="bar ali"><i style="width:${Math.min(100, d.openAli || 0)}%"></i></div><div class="bar key"><i style="width:${Math.min(100, d.openKey || 0)}%"></i></div>` : ''}
      </div>`;
    };
    $('#bv-e', this.root).innerHTML = res.prep.enemies.map((d, i) => mk(d, i, 'e')).join('');
    $('#bv-a', this.root).innerHTML = res.prep.allies.map((d, i) => mk(d, i, 'a')).join('');
    for (const [side, arr] of [['e', res.prep.enemies], ['a', res.prep.allies]]) arr.forEach((d, i) => { this.units[`${side}${i}`] = { max: d.hp, el: $(`#u-${side}${i}`, this.root), name: d.name }; });
  }

  float(u, text, cls) {
    if (this.app.state.skipAnim || !u?.el) return;
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
          this.log(`${nm(e.who)} 使用 <i class="sk ${e.slot}">${esc(e.name)}</i>`);
        }
        break;
      }
      case 'dmg': case 'dot': {
        const u = U(e.who); if (!u) break;
        this.setBars(u, e);
        if (!quiet) {
          this.float(u, (e.crit ? '暴击 ' : '') + '-' + fmt(e.amt), e.crit ? 'crit' : e.k === 'dot' ? 'dot' : 'dmg');
          u.el.classList.remove('hit'); void u.el.offsetWidth; u.el.classList.add('hit');
          if (e.saved) this.float(u, '死扛!', 'heal');
          this.log(`　${e.k === 'dot' ? '流血 ' : ''}${nm(e.who)} −${fmt(e.amt)}${e.absorbed ? `（盾 ${fmt(e.absorbed)}）` : ''}${e.crit ? ' 暴击' : ''}`, 'dm');
        }
        break;
      }
      case 'heal': { const u = U(e.who); if (!u) break; this.setBars(u, { hp: e.hp }); if (!quiet && e.amt) { this.float(u, '+' + fmt(e.amt), 'heal'); this.log(`　${nm(e.who)} +${fmt(e.amt)}`, 'hl'); } break; }
      case 'shield': { const u = U(e.who); if (!u) break; u.el.querySelector('.sh').style.width = `${Math.min(100, (e.shield / u.max) * 100)}%`; if (!quiet) this.float(u, '盾 ' + fmt(e.amt), 'sh'); break; }
      case 'buff': if (!quiet) { const u = U(e.who); this.float(u, `${STAT_ZH[e.stat] || ''}${e.v > 0 ? '↑' : '↓'}`, e.v > 0 ? 'buff' : 'debuff'); } break;
      case 'gauge': { const u = U(e.who); if (!u || e.ali == null) break; const a = u.el.querySelector('.ali i'), k = u.el.querySelector('.key i'); if (a) a.style.width = e.ali + '%'; if (k) k.style.width = e.key + '%'; break; }
      case 'die': { const u = U(e.who); if (u) u.el.classList.add('dead'); if (!quiet) this.log(`　${nm(e.who)} 倒下了`, 'dead'); break; }
      case 'end': break;
    }
  }

  finish(res, tok) {
    if (tok !== this.token) return;
    const s = this.app.state;
    const before = s.maxStage;
    const rw = applyResult(s, this.app.data, res);
    s.lastSeen = Date.now();
    const b = $('#bv-banner', this.root);
    b.className = `banner ${res.win ? 'win' : 'lose'}`;
    b.textContent = res.win ? `胜利 · ${res.rounds} 回合` : (res.rounds >= 30 ? '超时 · 战斗失败' : '全员倒下 · 战斗失败');
    const parts = [];
    if (res.win) parts.push(`<span class="g">金币 +${fmt(rw.gold)}</span>`);
    if (rw.tickets) parts.push(`<span class="t">召唤券 +${rw.tickets}</span>`);
    for (const it of rw.items) parts.push(`<span class="i">获得装备：${esc(this.app.itemName(it))}</span>`);
    if (rw.firstClear) parts.push('<span class="n">首通!</span>');
    if (rw.retreat) parts.push('<span class="r">挑战失败，退回上一关挂机，提升战力再来</span>');
    if (res.win && !rw.advanced && !rw.comfortable && s.stage <= s.maxStage) parts.push('<span class="r">赢得不够从容，继续在此关积累</span>');
    $('#bv-rw', this.root).innerHTML = parts.join('');
    if (rw.firstClear && s.maxStage > before) this.log(`首次通关第 ${s.maxStage} 关`, 'rnd');
    this.app.save();
    this.refreshHead();
    this.app.onBattleDone?.(rw);
    const wait = s.skipAnim ? 160 : 900 / s.speed;
    this.timer = setTimeout(() => this.next(), wait);
  }
}
