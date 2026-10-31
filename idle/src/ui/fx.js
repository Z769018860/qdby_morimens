// Battle effects: a canvas layer over the battle field (particles, slashes, rings, trails, flashes, confetti).
// Modes (设置 → 战斗特效): 'full' | 'lite' (fewer particles, no screen shake) | 'off'. Respects prefers-reduced-motion.
const KEY = 'morimens-idle-fx';
export const fxMode = {
  get() { try { const v = localStorage.getItem(KEY); if (v) return v; } catch { /* ignore */ } return matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'lite' : 'full'; },
  set(v) { try { localStorage.setItem(KEY, v); } catch { /* ignore */ } },
};
const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
export const COLORS = { CHAOS: '#ff5a4d', CARO: '#ffa94d', AEQUOR: '#4db8ff', ULTRA: '#b58cff', none: '#e8e4d0', heal: '#6fe3a0', shield: '#7fc4ff', poison: '#8bd34f', debuff: '#c26bff', buff: '#ffd36b', gold: '#ffd36b' };

export class FX {
  constructor(field) {
    this.field = field; this.ps = []; this.raf = 0; this.speed = 1;
    this.cv = document.createElement('canvas'); this.cv.className = 'fx-layer';
    field.appendChild(this.cv);
    this.ctx = this.cv.getContext('2d');
    this.flashEl = document.createElement('div'); this.flashEl.className = 'fx-flash'; field.appendChild(this.flashEl);
    new ResizeObserver(() => this.resize()).observe(field);
    this.resize();
  }
  get mode() { return fxMode.get(); }
  get on() { return this.mode !== 'off'; }
  resize() {
    const r = this.field.getBoundingClientRect(), d = Math.min(matchMedia('(pointer:coarse)').matches ? 1.5 : 2, devicePixelRatio || 1);
    this.cv.width = Math.max(1, r.width * d); this.cv.height = Math.max(1, r.height * d);
    this.cv.style.width = r.width + 'px'; this.cv.style.height = r.height + 'px';
    this.d = d;
  }
  // centre of an element relative to the field
  at(el, dy = 0) {
    const f = this.field.getBoundingClientRect(), r = (el.querySelector?.('.u-pic') || el).getBoundingClientRect();
    return { x: r.left - f.left + r.width / 2, y: r.top - f.top + r.height / 2 + dy, w: r.width, h: r.height };
  }
  n(k) { return Math.max(1, Math.round(k * (this.mode === 'lite' ? 0.4 : 1) / Math.sqrt(this.speed))); }
  push(p) { if (this.ps.length < 420) this.ps.push({ age: 0, ...p }); if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame((t) => this.tick(t)); } }

  // ---- effects
  hit(el, color, { crit = false, amt = 0 } = {}) {
    if (!this.on) return;
    const c = this.at(el), big = crit ? 1.7 : 1;
    this.push({ type: 'slash', x: c.x, y: c.y, ang: rnd(-0.9, -0.3) + (Math.random() < 0.5 ? Math.PI : 0), len: c.w * (crit ? 1.25 : 0.85), life: 0.22, color, w: crit ? 5 : 3 });
    if (crit) this.push({ type: 'slash', x: c.x, y: c.y, ang: rnd(0.3, 0.9), len: c.w * 1.1, life: 0.26, color: '#fff', w: 3 });
    this.push({ type: 'ring', x: c.x, y: c.y, r0: 6, r1: c.w * 0.5 * big, life: 0.3, color, w: crit ? 4 : 2 });
    for (let i = 0; i < this.n(crit ? 18 : 8 + Math.min(8, amt / 400)); i++) {
      const a = rnd(0, TAU), v = rnd(60, 220) * big;
      this.push({ type: 'spark', x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 260, life: rnd(0.25, 0.55), size: rnd(1.5, 3.5), color: Math.random() < 0.3 ? '#fff' : color });
    }
  }
  trail(fromEl, toEl, color) {
    if (!this.on || !fromEl || !toEl || fromEl === toEl) return;
    const a = this.at(fromEl), b = this.at(toEl);
    this.push({ type: 'trail', x: a.x, y: a.y, x2: b.x, y2: b.y, life: 0.2, color });
  }
  heal(el) {
    if (!this.on) return;
    const c = this.at(el);
    for (let i = 0; i < this.n(10); i++) this.push({ type: 'spark', x: c.x + rnd(-c.w * 0.35, c.w * 0.35), y: c.y + c.h * 0.3, vx: rnd(-12, 12), vy: rnd(-70, -35), g: 0, life: rnd(0.6, 1), size: rnd(2, 4), color: COLORS.heal, plus: true });
    this.push({ type: 'ring', x: c.x, y: c.y + c.h * 0.25, r0: 4, r1: c.w * 0.45, life: 0.5, color: COLORS.heal, w: 2 });
  }
  shield(el) {
    if (!this.on) return;
    const c = this.at(el);
    this.push({ type: 'ring', x: c.x, y: c.y, r0: c.w * 0.2, r1: c.w * 0.62, life: 0.45, color: COLORS.shield, w: 4, fill: 0.12 });
    this.push({ type: 'ring', x: c.x, y: c.y, r0: c.w * 0.1, r1: c.w * 0.5, life: 0.35, color: '#fff', w: 1.5 });
  }
  aura(el, color, up = true) {
    if (!this.on) return;
    const c = this.at(el);
    for (let i = 0; i < this.n(7); i++) this.push({ type: 'tri', x: c.x + rnd(-c.w * 0.4, c.w * 0.4), y: c.y + (up ? c.h * 0.35 : -c.h * 0.3), vy: up ? rnd(-60, -35) : rnd(35, 60), life: rnd(0.5, 0.8), size: rnd(4, 7), color, up });
  }
  poison(el) {
    if (!this.on) return;
    const c = this.at(el);
    for (let i = 0; i < this.n(8); i++) this.push({ type: 'bubble', x: c.x + rnd(-c.w * 0.4, c.w * 0.4), y: c.y + c.h * 0.3, vy: rnd(-45, -20), life: rnd(0.5, 0.9), size: rnd(2, 5), color: COLORS.poison });
  }
  bleed(el) {
    if (!this.on) return;
    const c = this.at(el);
    for (let i = 0; i < this.n(6); i++) this.push({ type: 'spark', x: c.x + rnd(-8, 8), y: c.y, vx: rnd(-40, 40), vy: rnd(-20, 40), g: 400, life: rnd(0.3, 0.5), size: rnd(1.5, 3), color: '#d23a3a' });
  }
  death(el, color) {
    if (!this.on) return;
    const c = this.at(el);
    for (let i = 0; i < this.n(26); i++) { const a = rnd(0, TAU), v = rnd(30, 150); this.push({ type: 'spark', x: c.x + rnd(-c.w / 3, c.w / 3), y: c.y + rnd(-c.h / 3, c.h / 3), vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, g: -20, life: rnd(0.6, 1.1), size: rnd(2, 4), color: Math.random() < 0.5 ? color : '#888' }); }
    this.push({ type: 'ring', x: c.x, y: c.y, r0: 8, r1: c.w * 0.8, life: 0.6, color, w: 3 });
  }
  exalt(el, color, over = false) {
    if (!this.on) return;
    const c = this.at(el);
    this.flash(color, over ? 0.38 : 0.22);
    for (let k = 0; k < 3; k++) this.push({ type: 'ring', x: c.x, y: c.y, r0: 6, r1: c.w * (0.9 + k * 0.4), life: 0.5 + k * 0.12, color: k ? color : '#fff', w: 4 - k });
    for (let i = 0; i < this.n(over ? 46 : 28); i++) { const a = rnd(0, TAU), v = rnd(120, 340); this.push({ type: 'spark', x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: rnd(0.4, 0.8), size: rnd(2, 4.5), color: Math.random() < 0.4 ? '#fff' : color }); }
    this.shake(over ? 8 : 4);
  }
  bossIntro() { if (!this.on) return; this.flash('#000', 0.55); this.shake(9); }
  confetti() {
    if (!this.on) return;
    const w = this.cv.width / this.d;
    for (let i = 0; i < this.n(60); i++) this.push({ type: 'conf', x: rnd(0, w), y: -10, vx: rnd(-40, 40), vy: rnd(60, 160), g: 40, rot: rnd(0, TAU), vr: rnd(-8, 8), life: rnd(1.4, 2.4), size: rnd(4, 8), color: ['#ffd36b', '#6fe3a0', '#7fc4ff', '#ff8fa3', '#c9a0ff'][i % 5] });
  }
  flash(color, a = 0.25) {
    if (!this.on) return;
    const f = this.flashEl; f.style.background = color; f.style.setProperty('--a', a);
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  }
  shake(px = 5) {
    if (this.mode !== 'full') return;
    this.field.style.setProperty('--sh', px + 'px');
    this.field.classList.remove('shaking'); void this.field.offsetWidth; this.field.classList.add('shaking');
  }
  clear() { this.ps.length = 0; }

  // ---- render loop
  tick(t) {
    const dt = Math.min(0.05, (t - this.last) / 1000); this.last = t;
    const c = this.ctx, d = this.d;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.cv.width / d, this.cv.height / d);
    c.globalCompositeOperation = 'lighter';
    const live = [];
    for (const p of this.ps) {
      p.age += dt; const k = p.age / p.life;
      if (k >= 1) continue;
      live.push(p);
      const a = 1 - k;
      c.globalAlpha = a; c.strokeStyle = c.fillStyle = p.color;
      switch (p.type) {
        case 'spark':
          p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
          if (p.plus) { c.fillRect(p.x - p.size, p.y - 0.8, p.size * 2, 1.6); c.fillRect(p.x - 0.8, p.y - p.size, 1.6, p.size * 2); } else { c.beginPath(); c.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, TAU); c.fill(); }
          break;
        case 'ring': {
          const r = p.r0 + (p.r1 - p.r0) * (1 - (1 - k) * (1 - k));
          c.lineWidth = p.w * a + 0.3; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.stroke();
          if (p.fill) { c.globalAlpha = a * p.fill; c.fill(); }
          break;
        }
        case 'slash': {
          const L = p.len * Math.min(1, k * 3 + 0.3) / 2, dx = Math.cos(p.ang) * L, dy = Math.sin(p.ang) * L;
          c.lineWidth = p.w * a + 0.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x - dx, p.y - dy); c.lineTo(p.x + dx, p.y + dy); c.stroke();
          break;
        }
        case 'trail': {
          const e = Math.min(1, k * 2.2), x = p.x + (p.x2 - p.x) * e, y = p.y + (p.y2 - p.y) * e, s = Math.max(0, e - 0.35);
          const g = c.createLinearGradient(p.x + (p.x2 - p.x) * s, p.y + (p.y2 - p.y) * s, x, y);
          g.addColorStop(0, 'transparent'); g.addColorStop(1, p.color);
          c.strokeStyle = g; c.lineWidth = 4 * a + 1; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x + (p.x2 - p.x) * s, p.y + (p.y2 - p.y) * s); c.lineTo(x, y); c.stroke();
          break;
        }
        case 'tri':
          p.y += p.vy * dt; c.beginPath();
          if (p.up) { c.moveTo(p.x, p.y - p.size); c.lineTo(p.x - p.size * 0.8, p.y + p.size * 0.6); c.lineTo(p.x + p.size * 0.8, p.y + p.size * 0.6); } else { c.moveTo(p.x, p.y + p.size); c.lineTo(p.x - p.size * 0.8, p.y - p.size * 0.6); c.lineTo(p.x + p.size * 0.8, p.y - p.size * 0.6); }
          c.closePath(); c.fill(); break;
        case 'bubble':
          p.y += p.vy * dt; p.x += Math.sin(p.age * 8 + p.size) * 12 * dt; c.lineWidth = 1.2; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.stroke(); break;
        case 'conf':
          p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.globalCompositeOperation = 'source-over'; c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); c.restore(); break;
      }
    }
    c.globalAlpha = 1; this.ps = live;
    this.raf = live.length ? requestAnimationFrame((x) => this.tick(x)) : 0;
    if (!live.length) c.clearRect(0, 0, this.cv.width / d, this.cv.height / d);
  }
}
