import { CASE } from '../data/case1.js';
import { newGame, boot, run, complete } from './engine.js';

const KEY = `morimens-casefile-${CASE.id}`, MUTE = 'morimens-casefile-mute';
const $ = (s) => document.querySelector(s);
const screen = $('#screen'), input = $('#in'), prompt = $('#prompt');
let st, hist = [], hi = 0, busy = false, mute = (() => { try { return localStorage.getItem(MUTE) === '1'; } catch { return false; } })();

const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ st, hist })); } catch { /* ignore */ } };
function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); if (j?.st?.id === CASE.id) { st = j.st; hist = j.hist || []; return true; } } catch { /* ignore */ } return false; }

// ---- sound: a tiny keyboard blip (WebAudio), off by default for reduced-motion users? no: user toggle
let ac;
function blip(f = 520, d = 0.03, v = 0.03) {
  if (mute) return;
  try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch { /* ignore */ }
}

// ---- rendering
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const linkify = (s) => esc(s).replace(/(\/[A-Za-z0-9_.\-/]+\.[a-z]{2,4}|\/(?:people|reports|scene|logs|lab|comm|case|sys|\.archive)\b[A-Za-z0-9_.\-/]*)/g, '<span class="path" data-p="$1">$1</span>');
function add(k, s, instant) {
  const d = document.createElement('div');
  d.className = `ln ${k}`; d.innerHTML = k === 'cmd' ? esc(s) : linkify(s);
  screen.appendChild(d);
  screen.scrollTop = screen.scrollHeight;
  if (!instant && k === 'clue') blip(880, 0.08, 0.05);
}
async function emit(lines) {
  busy = true;
  const fast = lines.length > 14;
  for (const l of lines) { add(l.k, l.s); if (!fast) await new Promise((r) => setTimeout(r, 14)); }
  busy = false; screen.scrollTop = screen.scrollHeight;
}
function setPrompt() {
  const dir = st.cwd === '/' ? '/' : st.cwd;
  prompt.textContent = st.prompt ? '提交报告>' : `inspector@records-7:${dir}$`;
}
function quick() {
  const q = st.prompt ? ['cancel'] : ['help', 'ls', 'who', 'board', 'hint', 'accuse'].filter((c) => st.unlocked.includes(c) || c === 'help' || c === 'ls');
  $('#quick').innerHTML = q.map((c) => `<button data-c="${c}">${c}</button>`).join('');
}

// ---- input handling
async function submit(line) {
  if (busy) return;
  line = line.trim();
  if (!line) return;
  add('cmd', `${prompt.textContent} ${line}`, true);
  hist.push(line); hi = hist.length;
  const low = line.toLowerCase();
  if (!st.prompt && low === 'clear') { screen.innerHTML = ''; }
  else if (!st.prompt && low === 'restart') {
    if (confirm('重新开始会清除当前进度，确定吗？')) { st = newGame(CASE); hist = []; screen.innerHTML = ''; await emit(boot(CASE)); }
  } else await emit(run(CASE, st, line));
  setPrompt(); quick(); save();
}
$('#line').addEventListener('submit', (e) => { e.preventDefault(); const v = input.value; input.value = ''; submit(v); });
input.addEventListener('keydown', (e) => {
  if (e.key.length === 1) blip(420 + Math.random() * 160);
  if (e.key === 'ArrowUp') { e.preventDefault(); if (hi > 0) input.value = hist[--hi]; }
  else if (e.key === 'ArrowDown') { e.preventDefault(); input.value = hi < hist.length - 1 ? hist[++hi] : ''; hi = Math.min(hi + 1, hist.length); }
  else if (e.key === 'Tab') {
    e.preventDefault();
    const v = input.value, c = complete(CASE, st, v);
    if (c.length === 1) input.value = v.replace(/(\S*)$/, c[0]) + ' ';
    else if (c.length > 1) add('dim', c.join('   '), true);
  }
});
screen.addEventListener('click', (e) => { const p = e.target.closest('.path'); if (p) { const cmd = /\.(txt|rpt|log|dos|csv|raw|enc|hist)$/.test(p.dataset.p) ? 'cat ' : 'ls '; input.value = cmd + p.dataset.p; input.focus(); } else if (!getSelection().toString()) input.focus(); });
$('#quick').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (b) submit(b.dataset.c); });
$('#mute').addEventListener('click', (e) => { mute = !mute; e.target.classList.toggle('off', mute); try { localStorage.setItem(MUTE, mute ? '1' : '0'); } catch { /* ignore */ } });
$('#mute').classList.toggle('off', mute);

// ---- start
(async function start() {
  if (load()) { add('sys', '── 已读取存档 ──', true); add('dim', `目录 ${st.cwd}　线索 ${st.clues.length}/${Object.keys(CASE.clues).length}　输入 help 继续。`, true); }
  else { st = newGame(CASE); await emit(boot(CASE)); }
  setPrompt(); quick(); save(); input.focus();
  window.__casefile = { get st() { return st; }, CASE };
})();
