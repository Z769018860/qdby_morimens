// 观战回放：挑战（爬塔 / 周 Boss / 属性塔 / 竞技场 / 融灾）原本点一下就出结算，
// 过程完全看不到。这里把 simulate 已经算好的事件流按战斗页的节奏重放一遍：
// 只是播放，不改任何状态——结算在打开播放器之前就已经跑完了。
import { esc, img, openModal, closeModal, kwIcon } from './util.js';
import { REALMS, STATUS, TYPES } from '../core/constants.js';
import { sound } from './audio.js';

const KEY = 'morimens-idle-watch-v1';
/** 挑战时是否放过程：watch = 播完再出结算，skip = 直接出结算（结算弹窗里仍可「重看」） */
export const watchMode = {
  get() { try { return localStorage.getItem(KEY) || 'watch'; } catch { return 'watch'; } },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* 隐私模式忽略 */ } },
};

// 播放节奏比战斗页稍快：观战是「看一遍」，不是挂机，18 回合不该再花一分钟
const PACE = { round: 340, act: 230, dmg: 70, dot: 55, heal: 80, shield: 55, die: 130, end: 0, st: 0, gauge: 0, intent: 0 };
const GAP = 30;

class Replay {
  constructor(spec, onDone) {
    this.spec = spec;
    this.onDone = onDone || (() => {});
    this.speed = 1;
    this.index = 0;
    this.done = false;
    this.units = {};
    const lim = spec.roundLimit || 0;
    const title = spec.title || '战斗回放';
    const sub = spec.sub || (lim ? `限 ${lim} 回合` : '');
    this.root = openModal(`<div class="rp">
      <div class="rp-top"><div><b>${esc(title)}</b><small>${esc(sub)}</small></div>
        <div class="rp-round" id="rp-round">—${lim ? ` / ${lim}` : ''}</div></div>
      <div class="field rp-field" id="rp-field">
        <div class="side enemies" id="rp-e"></div><div class="vs" id="rp-vs">—</div><div class="side allies" id="rp-a"></div>
      </div>
      <div class="rp-log" id="rp-log"></div>
      <div class="rp-bar">
        <span class="rp-hint">${esc(spec.note || '观战中——结果已经结算，这里只是回放过程')}</span>
        <button class="btn sm" data-rp="speed">1×</button>
        <button class="btn sm" data-rp="skip">跳过过程</button>
        <button class="btn sm gold" data-rp="done" hidden>${spec.retry ? '查看结算' : '关闭'}</button>
      </div></div>`, 'wide rp-modal');
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rp]');
      if (!b) return;
      const a = b.dataset.rp;
      if (a === 'speed') { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1; b.textContent = `${this.speed}×`; }
      if (a === 'skip') { this.skip(); }
      if (a === 'done') { this.finish(); }
    });
    this.draw();
    this.play();
  }

  draw() {
    const p = this.spec.prep || { allies: [], enemies: [] };
    const mk = (d, side) => {
      const realm = REALMS[d.realm] || { color: '#6b7280' };
      return `<div class="unit ${side === 'e' ? 'foe' : ''} ${d.boss ? 'boss' : ''} ${d.reward ? 'reward' : ''}" id="rp-u-${d.uid}" style="--rc:${realm.color}">
        <div class="u-pic"><img src="${img(d.img)}" alt=""><span class="u-tag">${esc(d.type && side === 'a' ? TYPES[d.type]?.short || '' : '')}</span><div class="u-say"></div></div>
        <div class="u-name">${esc(d.name)}${d.reward ? '<span class="rw-tag">奖励</span>' : ''}</div>
        <div class="u-st"></div>
        <div class="bar hp"><i style="width:100%"></i><b>${Math.round(d.hp)}</b><u class="sh" style="width:0"></u></div>
        ${side === 'a' ? '<div class="bar ali"><i style="width:0"></i></div><div class="bar key"><i style="width:0"></i></div>' : ''}
      </div>`;
    };
    this.root.querySelector('#rp-e').innerHTML = (p.enemies || []).map((d, i) => mk(d, 'e', i)).join('');
    this.root.querySelector('#rp-a').innerHTML = (p.allies || []).map((d, i) => mk(d, 'a', i)).join('');
    for (const [side, arr] of [['e', p.enemies || []], ['a', p.allies || []]]) {
      arr.forEach((d, i) => {
        const uid = d.uid || `${side}${i}`;
        this.units[uid] = { max: Math.max(1, d.hp), el: this.root.querySelector(`#rp-u-${uid}`), name: d.name };
      });
    }
    // 起始共鸣 / 钥焰按 prep 里的初始值铺出来
    for (const d of p.allies || []) {
      const u = this.units[d.uid]; if (!u) continue;
      const a = u.el.querySelector('.ali i'), k = u.el.querySelector('.key i');
      if (a) a.style.width = `${Math.min(100, d.openAli || 0)}%`;
      if (k) k.style.width = `${Math.min(100, d.openKey || 0)}%`;
    }
  }

  log(html, cls = '') {
    const l = this.root.querySelector('#rp-log');
    if (!l) return;
    const d = document.createElement('div');
    d.className = cls; d.innerHTML = html;
    l.appendChild(d);
    while (l.children.length > 80) l.firstChild.remove();
    l.scrollTop = l.scrollHeight;
  }

  play() {
    const evs = this.spec.events || [];
    const step = () => {
      if (this.done) return;
      const e = evs[this.index++];
      if (!e) { this.end(); return; }
      this.apply(e);
      const d = (PACE[e.k] ?? GAP) / this.speed;
      this.timer = setTimeout(step, d);
    };
    step();
  }

  apply(e) {
    const U = (id) => this.units[id];
    const nm = (id) => `<b class="${String(id)[0] === 'a' ? 'ca' : 'ce'}">${esc(U(id)?.name || '')}</b>`;
    const bar = (u, hp) => {
      if (!u) return;
      const b = u.el.querySelector('.hp');
      b.firstElementChild.style.width = `${Math.max(0, Math.min(100, (hp / u.max) * 100))}%`;
      b.querySelector('b').textContent = String(Math.round(hp));
    };
    const say = (u, text, cls) => {
      if (!u) return;
      const f = document.createElement('span');
      f.className = `float ${cls}`; f.textContent = text;
      f.style.left = `${20 + Math.random() * 50}%`;
      u.el.querySelector('.u-pic').appendChild(f);
      setTimeout(() => f.remove(), 900);
    };
    switch (e.k) {
      case 'round': {
        const el = this.root.querySelector('#rp-round');
        const lim = this.spec.roundLimit || 0;
        el.textContent = lim ? `第 ${e.n} / ${lim} 回合` : `第 ${e.n} 回合`;
        el.classList.toggle('urgent', !!lim && e.n >= lim - 2);
        this.log(`—— 第 ${e.n} 回合 ——`, 'rnd');
        break;
      }
      case 'act': {
        const u = U(e.who);
        if (u) {
          for (const x of Object.values(this.units)) x.el.classList.remove('acting');
          u.el.classList.add('acting');
          const s = u.el.querySelector('.u-say');
          s.textContent = e.name; s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop');
          const foe = u.el.classList.contains('foe');
          u.el.classList.remove('lunge-a', 'lunge-e'); void u.el.offsetWidth; u.el.classList.add(`lunge-${foe ? 'e' : 'a'}`);
          if (e.slot === 'Exalt' || e.slot === 'OverExalt') sound.play('exalt');
          else if (!foe) sound.play('swing');
        }
        this.log(`${nm(e.who)} 使用 <i class="sk ${e.slot || ''}">${esc(e.name)}</i>`);
        break;
      }
      case 'dmg': case 'dot': case 'counter': {
        const u = U(e.who); if (!u) break;
        if (e.hp != null) bar(u, e.hp);
        if (e.blocked) { say(u, '屏障!', 'sh'); sound.play('block'); break; }
        if (e.crit) { u.el.classList.add('shake'); setTimeout(() => u.el.classList.remove('shake'), 260); }
        u.el.classList.remove('hit'); void u.el.offsetWidth; u.el.classList.add('hit');
        sound.play(e.k === 'counter' ? 'counter' : e.k === 'dot' ? 'dot' : e.crit ? 'crit' : 'hit', { foe: u.el.classList.contains('foe') });
        say(u, `${e.crit ? '暴击 ' : e.k === 'counter' ? '反击 ' : ''}-${Math.round(e.amt)}`, e.crit ? 'crit' : 'dmg');
        this.log(`　${e.k === 'dot' ? '持续伤害 ' : e.k === 'counter' ? '反击 ' : ''}${nm(e.who)} −${Math.round(e.amt)}${e.crit ? ' 暴击' : ''}`, 'dm');
        break;
      }
      case 'heal': {
        const u = U(e.who); if (!u) break;
        if (e.hp != null) bar(u, e.hp);
        if (e.amt) { sound.play('heal'); say(u, `+${Math.round(e.amt)}`, 'heal'); this.log(`　${nm(e.who)} +${Math.round(e.amt)}`, 'hl'); }
        break;
      }
      case 'shield': {
        const u = U(e.who); if (!u) break;
        const s = u.el.querySelector('.sh'); if (s) s.style.width = `${Math.min(100, (e.shield / u.max) * 100)}%`;
        sound.play('shield'); say(u, `盾 ${Math.round(e.amt)}`, 'sh');
        break;
      }
      case 'buff': {
        const u = U(e.who); if (!u) break;
        sound.play(e.v > 0 ? 'buff' : 'debuff');
        say(u, `${e.v > 0 ? '强化' : '弱化'}`, e.v > 0 ? 'buff' : 'debuff');
        break;
      }
      case 'status': {
        const u = U(e.who); if (!u) break;
        say(u, STATUS[e.s]?.zh || '', u.el.classList.contains('foe') ? 'debuff' : 'buff');
        break;
      }
      case 'st': {
        const u = U(e.who); if (!u) break;
        const kw = this.spec.kw;
        u.el.querySelector('.u-st').innerHTML = (e.list || []).map((x) => {
          const st = STATUS[x.id];
          return `<span class="sti" title="${esc(st?.zh || '')} ${x.n}">${kwIcon(kw, st?.kw, 14) || `<em>${esc((st?.zh || '?').slice(0, 1))}</em>`}<b>${x.n}</b></span>`;
        }).join('');
        break;
      }
      case 'gauge': {
        const u = U(e.who); if (!u || e.ali == null) break;
        const a = u.el.querySelector('.ali i'), k = u.el.querySelector('.key i');
        if (a) a.style.width = `${e.ali}%`;
        if (k) k.style.width = `${e.key}%`;
        break;
      }
      case 'die': {
        const u = U(e.who); if (!u) break;
        u.el.classList.add('dead'); u.el.querySelector('.u-st').innerHTML = '';
        sound.play('die', { foe: u.el.classList.contains('foe') });
        this.log(`　${nm(e.who)} 倒下了`, 'dead');
        break;
      }
      case 'end': break;
      default: break;
    }
  }

  end() {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    const b = this.root?.querySelector('[data-rp="done"]');
    if (b) { b.hidden = false; }
    const sk = this.root?.querySelector('[data-rp="skip"]');
    if (sk) sk.disabled = true;
    const sp = this.root?.querySelector('[data-rp="speed"]');
    if (sp) sp.disabled = true;
    const s = this.spec.summary;
    if (s) this.log(s, s.includes('胜') ? 'rnd win' : 'rnd');
  }

  skip() {
    if (this.done) { this.finish(); return; }
    this.end();
    this.finish();
  }

  finish() {
    if (this.closed) return;
    this.closed = true;
    clearTimeout(this.timer);
    closeModal();
    try { this.onDone(); } catch (err) { console.error(err); }
  }
}

/**
 * 打开观战。spec: { title, sub, prep, events, roundLimit, summary, note }
 * 播放完或跳过时调用 onDone（只调一次）。
 */
export function replayModal(spec, onDone) {
  return new Replay(spec, onDone);
}

/** 按设置决定是「先看过程再出结算」还是「直接出结算」 */
export function watchOrSkip(spec, done) {
  if (watchMode.get() === 'skip' || !spec?.events?.length) { done(); return null; }
  return replayModal(spec, done);
}

/** 把一场挑战的结果整理成回放入参 */
export function replayOf(res, { title, sub, note, kw } = {}) {
  if (!res?.events?.length) return null;
  return {
    title, sub, note, kw,
    prep: res.prep, events: res.events, roundLimit: res.roundLimit,
    summary: res.win === false
      ? (res.timeout ? `超时判负 · ${res.rounds} 回合没清场` : '全员倒下 · 挑战失败')
      : `战斗胜利 · ${res.rounds} 回合`,
  };
}
