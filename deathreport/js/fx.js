// 共鸣特效：画布粒子 + 环形涟漪 + 闪屏。无依赖；尊重 prefers-reduced-motion。
const GLYPHS = ['银', '芯', '忘', '◆', '✦', '●', '钥', '梦'];
export function burst(level = 1) {
  const c = document.getElementById('fx'); if (!c) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { c.style.opacity = 0; return; }
  const dpr = devicePixelRatio || 1, W = (c.width = innerWidth * dpr), H = (c.height = innerHeight * dpr), g = c.getContext('2d');
  const cx = W / 2, cy = H * 0.42, n = 70 + level * 30, ps = [];
  const cols = ['#7fe3ff', '#ffcf6b', '#e0a8ff', '#6fe3a0', '#effff9'];
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 7) * dpr; ps.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2 * dpr, life: 1, d: 0.008 + Math.random() * 0.012, s: (11 + Math.random() * 14) * dpr, ch: GLYPHS[(Math.random() * GLYPHS.length) | 0], col: cols[(Math.random() * cols.length) | 0] }); }
  let t = 0; c.style.opacity = 1;
  (function frame() {
    t++; g.clearRect(0, 0, W, H);
    if (t < 14) { g.fillStyle = `rgba(239,255,249,${0.28 * (1 - t / 14)})`; g.fillRect(0, 0, W, H); }
    for (let r = 0; r < 2 + (level > 3); r++) { const k = t - r * 8; if (k > 0 && k < 50) { g.strokeStyle = `rgba(127,227,255,${0.7 * (1 - k / 50)})`; g.lineWidth = 2 * dpr; g.beginPath(); g.arc(cx, cy, k * 9 * dpr, 0, 7); g.stroke(); } }
    let alive = 0;
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.13 * dpr; p.vx *= 0.99; p.life -= p.d; if (p.life <= 0) continue; alive++; g.globalAlpha = Math.max(0, p.life) * 0.65; g.fillStyle = p.col; g.font = `${p.s}px monospace`; g.fillText(p.ch, p.x, p.y); }
    g.globalAlpha = 1;
    if (alive || t < 50) requestAnimationFrame(frame); else { g.clearRect(0, 0, W, H); c.style.opacity = 0; }
  })();
}
