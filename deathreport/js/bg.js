// 背景：黑池涟漪 + 漂浮的银芯微粒 + 远处的钟楼月光。低开销（≤30fps，标签页隐藏时暂停），尊重 prefers-reduced-motion。
const THEMES = { 63: [127, 227, 255], 62: [200, 160, 255], 61: [120, 230, 190] };
let tint = THEMES[63], run = false;
export function setTheme(ed) { tint = THEMES[ed] || THEMES[63]; document.documentElement.style.setProperty('--tint', tint.join(',')); document.documentElement.dataset.ed = ed; }
export function startBg() {
  const c = document.getElementById('bg'); if (!c || run) return; run = true;
  const g = c.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, t = 0, last = 0;
  const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.8, v: 0.02 + Math.random() * 0.05, p: Math.random() * 7 }));
  const rings = [];
  const size = () => { const d = Math.min(devicePixelRatio || 1, 1.5); W = c.width = innerWidth * d; H = c.height = innerHeight * d; };
  size(); addEventListener('resize', size);
  function draw(ts) {
    requestAnimationFrame(draw); if (document.hidden || ts - last < 33) return; last = ts; t += 0.033;
    const [r, gg, b] = tint, d = W / innerWidth;
    // 画布要透明：底下的 #bglayer 是背景插画，这里只叠一层很薄的雾色与装饰
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(4,7,13,.34)'; g.fillRect(0, 0, W, H);
    const bgr = g.createLinearGradient(0, 0, 0, H); bgr.addColorStop(0, 'rgba(4,7,13,0)'); bgr.addColorStop(1, `rgba(${r * 0.07 | 0},${gg * 0.1 | 0},${b * 0.13 | 0},.55)`); g.fillStyle = bgr; g.fillRect(0, 0, W, H);
    // moon
    const mx = W * 0.82, my = H * 0.16, mg = g.createRadialGradient(mx, my, 0, mx, my, H * 0.28); mg.addColorStop(0, `rgba(${r},${gg},${b},.20)`); mg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = mg; g.fillRect(0, 0, W, H);
    g.fillStyle = `rgba(${r},${gg},${b},.55)`; g.beginPath(); g.arc(mx, my, 16 * d, 0, 7); g.fill();
    // black pool: slow waves at the bottom
    for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 16 * d) g.lineTo(x, H * (0.9 - k * 0.025) + Math.sin(x / (110 * d) + t * (0.6 + k * 0.2) + k) * 7 * d); g.lineTo(W, H); g.closePath(); g.fillStyle = `rgba(${r * 0.1 | 0},${gg * 0.16 | 0},${b * 0.22 | 0},${0.5 - k * 0.12})`; g.fill(); }
    // ripples from the tower base
    if (!still && Math.random() < 0.018) rings.push({ k: 0 });
    for (let i = rings.length - 1; i >= 0; i--) { const q = rings[i]; q.k += 0.6; if (q.k > 180) { rings.splice(i, 1); continue; } g.strokeStyle = `rgba(${r},${gg},${b},${0.22 * (1 - q.k / 180)})`; g.lineWidth = 1.2 * d; g.beginPath(); g.ellipse(W * 0.5, H * 0.93, q.k * 4.2 * d, q.k * 0.9 * d, 0, 0, 7); g.stroke(); }
    // motes
    for (const m of motes) { if (!still) { m.y -= m.v * 0.01; m.x += Math.sin(t + m.p) * 0.0004; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } } g.fillStyle = `rgba(${r},${gg},${b},${0.25 + 0.2 * Math.sin(t * 1.3 + m.p)})`; g.beginPath(); g.arc(m.x * W, m.y * H, m.r * d, 0, 7); g.fill(); }
  }
  requestAnimationFrame(draw);
}
