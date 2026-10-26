import { $, h, store, loadDict, imgEl, wan, nav, KINDS, KW, KW_TYPE, renderText } from './common.js';
import { PEPPER } from './pepper.js';

const MAX_TRIES = 6;
const LEVELS = {
  1: { name: '入门', desc: '只猜 4 名唤醒体' },
  2: { name: '进阶', desc: '+ 命轮' },
  3: { name: '老手', desc: '+ 密契、钥令' },
  4: { name: '大师', desc: '+ 潜能进阶、造物' },
};
const LETTERS = ['A', 'B', 'C', 'D'];
const EMO = { g: '🟩', y: '🟨', n: '⬛', '': '⬜' };

document.body.prepend(nav('game'));
const root = $('#app');
root.textContent = '载入中…';

const { D, idx } = await loadDict();
const P = (await (await fetch('data/puzzles.json')).json()).puzzles;

// ------------------------------------------------------------------ state
let puzzle, ans, level, mode, sel, fb, history, hintsUsed, hintTags, finished, won, pickerKind;
level = store.get('level', 1);
mode = 'daily';

const todayKey = () => {
  const d = new Date(Date.now() + 8 * 3600e3); // UTC+8, same as the leaderboard
  return d.toISOString().slice(0, 10);
};
const dayNumber = () => Math.floor((Date.now() + 8 * 3600e3) / 864e5);
const dailyPuzzle = () => P[(dayNumber() * 7919) % P.length];

function newSel() {
  return {
    slots: LETTERS.map(() => ({ awk: null, wheels: [null, null], cov: null, pot: null })),
    key: null, relics: [],
  };
}

// answers ship obfuscated (see scripts/build_data.py); this keeps them out of plain sight, nothing more
async function unseal(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), c => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  const enc = new TextEncoder();
  for (let i = 0; i < raw.length; i += 32) {
    const ks = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${PEPPER}|${p.id}|${i / 32}`)));
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('题目解码失败');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function start(p0, m) {
  const p = await unseal(p0);
  puzzle = p; mode = m;
  ans = p.team; // already sorted by damage desc: slot A = top damage
  sel = newSel(); fb = {}; history = []; hintsUsed = 0; hintTags = {}; finished = false; won = false;
  if (m === 'daily') {
    const saved = store.get(`daily:${todayKey()}:${level}`, null);
    if (saved) {
      sel = saved.sel; history = saved.history; hintsUsed = saved.hintsUsed; hintTags = saved.hintTags;
      finished = saved.finished; won = saved.won; fb = saved.fb || {};
    }
  }
  render();
}

function persist() {
  if (mode !== 'daily') return;
  store.set(`daily:${todayKey()}:${level}`, { sel, history, hintsUsed, hintTags, finished, won, fb });
}

// ------------------------------------------------------------------ evaluation
function active() {
  return { wheels: level >= 2, cov: level >= 3, key: level >= 3, pot: level >= 4, relics: level >= 4 };
}

function evaluate() {
  const A = active();
  const teamIds = ans.map(a => a.tid);
  const r = { slots: [], key: null, relics: [], green: 0, total: 0 };
  const count = (state) => { r.total++; if (state === 'g') r.green++; };
  sel.slots.forEach((g, k) => {
    const a = ans[k];
    const s = { awk: null, wheels: [], cov: null, pot: null };
    s.awk = g.awk == null ? 'n' : g.awk === a.tid ? 'g' : teamIds.includes(g.awk) ? 'y' : 'n';
    count(s.awk);
    if (A.wheels) {
      const left = [...a.wheels];
      const others = ans.filter((_, j) => j !== k).flatMap(x => x.wheels);
      g.wheels.forEach(w => {
        let st = 'n';
        if (w != null) {
          const i = left.indexOf(w);
          if (i >= 0) { st = 'g'; left.splice(i, 1); } else if (others.includes(w)) st = 'y';
        }
        s.wheels.push(st); count(st);
      });
    }
    if (A.cov) {
      s.cov = g.cov == null ? 'n' : g.cov === a.cov ? 'g' : ans.some((x, j) => j !== k && x.cov === g.cov) ? 'y' : 'n';
      count(s.cov);
    }
    if (A.pot) {
      if (g.pot == null) s.pot = { st: 'n', dir: '' };
      else {
        const d = a.pot - g.pot;
        s.pot = { st: d === 0 ? 'g' : Math.abs(d) <= 2 ? 'y' : 'n', dir: d > 0 ? '↑' : d < 0 ? '↓' : '' };
      }
      count(s.pot.st);
    }
    r.slots.push(s);
  });
  if (A.key) { r.key = sel.key == null ? 'n' : sel.key === puzzle.key ? 'g' : 'n'; count(r.key); }
  if (A.relics) {
    const want = new Set(puzzle.relics);
    sel.relics.forEach(x => r.relics.push(want.has(x) ? 'g' : 'n'));
    // every real relic is a field; missing ones count as misses
    puzzle.relics.forEach(x => { r.total++; if (sel.relics.includes(x)) r.green++; });
    sel.relics.forEach(x => { if (!want.has(x)) r.total++; });
  }
  r.win = r.green === r.total;
  return r;
}

function fillFeedback(r) {
  fb = {};
  r.slots.forEach((s, k) => {
    const g = sel.slots[k];
    fb[`awk${k}`] = { v: g.awk, c: s.awk };
    s.wheels.forEach((st, i) => { fb[`w${k}${i}`] = { v: g.wheels[i], c: st }; });
    if (s.cov) fb[`cov${k}`] = { v: g.cov, c: s.cov };
    if (s.pot) fb[`pot${k}`] = { v: g.pot, c: s.pot.st, dir: s.pot.dir };
  });
  if (r.key) fb.key = { v: sel.key, c: r.key };
  r.relics.forEach((st, i) => { fb[`rel${sel.relics[i]}`] = { v: sel.relics[i], c: st }; });
}

function emojiRow(r) {
  const A = active();
  let s = r.slots.map(x => EMO[x.awk]).join('');
  if (A.wheels) s += ' ' + r.slots.map(x => x.wheels.map(w => EMO[w]).join('')).join('|');
  if (A.cov) s += ' ' + r.slots.map(x => EMO[x.cov]).join('');
  if (A.key) s += ' ' + EMO[r.key];
  if (A.pot) s += ' ' + r.slots.map(x => EMO[x.pot.st]).join('');
  if (A.relics) s += ` 🧪${r.relics.filter(x => x === 'g').length}/${puzzle.relics.length}`;
  return s;
}

function submit() {
  if (finished) return;
  if (sel.slots.some(s => s.awk == null)) { toast('先选满 4 名唤醒体'); return; }
  if (new Set(sel.slots.map(s => s.awk)).size < 4) { toast('唤醒体不能重复'); return; }
  const r = evaluate();
  fillFeedback(r);
  history.push({ row: emojiRow(r), frac: r.green / r.total });
  if (r.win) { finished = true; won = true; } else if (history.length >= MAX_TRIES) { finished = true; won = false; }
  if (finished) recordStats();
  persist();
  render();
}

function grade() {
  const last = history[history.length - 1];
  const frac = last ? last.frac : 0;
  const base = won ? 100 : Math.round(frac * 70);
  const score = Math.max(0, base - 8 * (history.length - 1) * (won ? 1 : 0) - 5 * hintsUsed);
  const g = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 30 ? 'C' : 'D';
  return { score, g };
}

function recordStats() {
  if (mode !== 'daily') return;
  const st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0, last: '' });
  if (st.last === todayKey() + ':' + level) return;
  st.played++; st.last = todayKey() + ':' + level;
  if (won) { st.won++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
  store.set('stats', st);
}

// ------------------------------------------------------------------ hints
function hintAwk(k) {
  if (finished || hintTags[`a${k}`]) return;
  const e = idx.awakener.get(ans[k].tid);
  hintTags[`a${k}`] = `${e.realm} · ${e.role}`;
  hintsUsed++; persist(); render();
}
function hintLv(k) {
  if (finished || hintTags[`l${k}`]) return;
  hintTags[`l${k}`] = `Lv.${ans[k].lv} · 突破 ${ans[k].brk}`;
  hintsUsed++; persist(); render();
}
function hintKey() {
  if (finished || hintTags.key) return;
  hintTags.key = idx.key.get(puzzle.key).realm || '无阵营';
  hintsUsed++; persist(); render();
}

// ------------------------------------------------------------------ UI pieces
function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const cls = (k) => {
  const f = fb[k];
  return f ? ` fb-${f.c}` : '';
};
const fbOk = (k, cur) => fb[k] && fb[k].v === cur ? cls(k) : '';

function chip(text, tone = '') { return h('span', { class: 'chip ' + tone }, text); }

const bline = (c, pct, text) => h('div', { class: 'bline' }, h('div', { class: 'track' }, h('div', { class: `bar ${c}`, style: `width:${pct}%` })), h('i', {}, text));

function reportPanel() {
  const p = puzzle;
  const total = ans.reduce((s, a) => s + a.dmg, 0) || 1;
  const maxBlk = Math.max(...ans.map(a => a.blk), 1);
  const maxHeal = Math.max(...ans.map(a => a.heal), 1);
  const stat = (k, v, sub) => h('div', { class: 'stat' }, h('small', {}, k), h('b', {}, v), sub ? h('em', {}, sub) : null);
  const rows = ans.map((a, k) => h('div', { class: 'brow' },
    h('span', { class: 'bl' }, LETTERS[k]),
    h('div', { class: 'bars' },
      bline('dmg', Math.max(a.dmg / total * 100, 0.8), `伤害 ${(a.dmg / total * 100).toFixed(1)}% · ${wan(a.dmg)}`),
      bline('blk', Math.max(a.blk / maxBlk * 100, 0.8), `格挡 ${wan(a.blk)}`),
      bline('heal', Math.max(a.heal / maxHeal * 100, 0.8), `治疗 ${wan(a.heal)}`),
      h('div', { class: 'invest' }, `卡牌升级 ${a.up} 次 · 天赋合计 Lv.${a.tal}`)),
  ));
  const bosses = (p.boss || []).map(id => D.monster.find(m => m.id === id)).filter(Boolean);
  return h('section', { class: 'card report' },
    h('div', { class: 'rhead' },
      h('div', {}, h('h2', {}, `融灾战报 · 第 ${p.season} 期`),
        h('div', { class: 'chips' }, chip(`区域 ${p.zone}`), chip(`危险等级 ${p.threat}`),
          p.madness ? chip(`疯狂度 ${p.madness}`) : null, chip(`难度 ${'★'.repeat(p.diff)}`, 'gold'),
          p.extra ? chip('含额外通关', 'dim') : null)),
      bosses.length ? h('div', { class: 'boss' }, h('div', { class: 'bimgs' }, bosses.map(b => imgEl(b.img, b.zh))), h('small', {}, `区域 Boss：${bosses.map(b => b.zh).join('、')}`)) : null),
    h('div', { class: 'stats' },
      stat('回合数', p.rounds, `Boss 战 ${p.bossRounds}`), stat('出牌数', p.cards, `能量 ${p.energy}`),
      stat('单回合最高伤害', wan(p.maxBout)), stat('死扛触发', p.deathResist),
      stat('剩余生命', `${p.left}/${p.hp}`), stat('钥令/玩家伤害', wan(p.playerDmg)),
      stat('榜单分数', p.score), stat('造物数量', p.relics.length, level >= 4 ? '需要全部还原' : '')),
    bosses.length ? h('details', { class: 'bskills' }, h('summary', {}, '区域 Boss 技能（推理线索）'),
      bosses.map(b => h('div', {}, h('b', {}, b.zh), h('ul', {}, (b.skills || []).map(t => h('li', {}, renderText(t))))))) : null,
    h('div', { class: 'brows' }, rows,
      h('p', { class: 'note' }, '已按队内伤害从高到低排序：A 是伤害最高者。队伍成员以匿名 A–D 呈现，顺序即答案顺序。')));
}

function pickBtn(kind, current, onPick, fkey, extraCls = '') {
  const e = current == null ? null : idx[kind].get(String(current));
  const f = fkey ? fbOk(fkey, current) : '';
  return h('button', { class: `pick ${kind} ${f}${extraCls}`, type: 'button', title: e ? e.zh : `选择${KINDS[kind]}`, onclick: onPick },
    e ? imgEl(e.img, e.zh) : h('span', { class: 'plus' }, '＋'),
    e ? h('small', {}, e.zh) : h('small', {}, KINDS[kind]));
}

function slotCard(k) {
  const A = active();
  const g = sel.slots[k];
  const locked = finished;
  const open = (kind, apply) => () => { if (!locked) openPicker(kind, apply, k); };
  const card = h('div', { class: 'slot' },
    h('div', { class: 'shead' }, h('b', {}, `${LETTERS[k]} 位`),
      h('span', { class: 'chips' }, hintTags[`a${k}`] ? chip(hintTags[`a${k}`], 'gold') : null, hintTags[`l${k}`] ? chip(hintTags[`l${k}`], 'gold') : null)),
    pickBtn('awakener', g.awk, open('awakener', v => { g.awk = v; }), `awk${k}`, ' big'));
  if (A.wheels) {
    card.append(h('div', { class: 'row2' }, [0, 1].map(i =>
      pickBtn('wheel', g.wheels[i], open('wheel', v => { g.wheels[i] = v; }), `w${k}${i}`))));
  }
  if (A.cov) card.append(pickBtn('covenant', g.cov, open('covenant', v => { g.cov = v; }), `cov${k}`));
  if (A.pot) {
    const f = fb[`pot${k}`] && fb[`pot${k}`].v === g.pot ? fb[`pot${k}`] : null;
    card.append(h('div', { class: `pot${f ? ' fb-' + f.c : ''}` },
      h('small', {}, '潜能进阶'),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.max(0, (g.pot ?? 1) - 1); persist(); render(); } } }, '−'),
      h('b', {}, g.pot == null ? '—' : g.pot + (f && f.dir ? ' ' + f.dir : '')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.min(15, (g.pot ?? -1) + 1); persist(); render(); } } }, '+')));
  }
  if (!locked) {
    card.append(h('div', { class: 'hints' },
      h('button', { type: 'button', class: 'link', onclick: () => hintAwk(k), disabled: !!hintTags[`a${k}`] }, '提示阵营/定位 −5'),
      A.pot ? h('button', { type: 'button', class: 'link', onclick: () => hintLv(k), disabled: !!hintTags[`l${k}`] }, '提示等级 −5') : null));
  }
  return card;
}

function teamExtras() {
  const A = active();
  const box = h('div', { class: 'extras' });
  if (A.key) {
    box.append(h('div', { class: 'extra' }, h('b', {}, '钥令'),
      pickBtn('key', sel.key, () => { if (!finished) openPicker('key', v => { sel.key = v; }); }, 'key'),
      hintTags.key ? chip(hintTags.key, 'gold') : (finished ? null : h('button', { type: 'button', class: 'link', onclick: hintKey }, '提示阵营 −5'))));
  }
  if (A.relics) {
    const n = puzzle.relics.length;
    box.append(h('div', { class: 'extra wide' }, h('b', {}, `造物 ${sel.relics.length}/${n}`),
      h('div', { class: 'relics' },
        sel.relics.map(id => {
          const e = idx.creation.get(id);
          const f = fb[`rel${id}`];
          return h('button', { type: 'button', class: `pick mini${f ? ' fb-' + f.c : ''}`, title: e ? e.zh : id,
            onclick: () => { if (!finished) { sel.relics = sel.relics.filter(x => x !== id); persist(); render(); } } },
            imgEl(e && e.img, e && e.zh), h('small', {}, e ? e.zh : id));
        }),
        finished ? null : h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', null) }, h('span', { class: 'plus' }, '＋'), h('small', {}, '添加'))
      )));
  }
  return box;
}

function historyPanel() {
  return h('section', { class: 'card hist' },
    h('h3', {}, `推理记录 ${history.length}/${MAX_TRIES}`),
    history.length ? h('ol', {}, history.map(x => h('li', {}, x.row, h('em', {}, ` ${Math.round(x.frac * 100)}%`)))) : h('p', { class: 'note' }, '还没有提交。绿色=正确，黄色=在队内但位置/归属不对，灰色=不在队内。'));
}

function answerPanel() {
  const { score, g } = grade();
  const mk = (kind, id) => { const e = idx[kind].get(String(id)); return h('span', { class: 'ans-i', title: e ? e.zh : id }, imgEl(e && e.img, e && e.zh), h('small', {}, e ? e.zh : id)); };
  return h('section', { class: `card result ${won ? 'win' : 'lose'}` },
    h('h2', {}, won ? `还原成功 · 评级 ${g}` : `推理失败 · 评级 ${g}`),
    h('p', {}, `得分 ${score}（提示 ${hintsUsed} 次，提交 ${history.length} 次）`),
    h('div', { class: 'ans-team' }, ans.map((a, k) => h('div', { class: 'ans-slot' },
      h('b', {}, `${LETTERS[k]} 位 · Lv.${a.lv} · 潜能 ${a.pot} · 突破 ${a.brk}`),
      h('div', { class: 'ans-row' }, mk('awakener', a.tid), a.wheels.map(w => mk('wheel', w)), mk('covenant', a.cov))))),
    h('div', { class: 'ans-row' }, h('b', {}, '钥令'), mk('key', puzzle.key)),
    h('div', { class: 'ans-row wrap' }, h('b', {}, '造物'), puzzle.relics.map(r => mk('creation', r))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: share }, '复制战绩'),
      h('button', { class: 'btn ghost', onclick: () => start(P[Math.floor(Math.random() * P.length)], 'random') }, '再来一题')));
}

function share() {
  const txt = `战报侦探 ${mode === 'daily' ? todayKey() : puzzle.id} · ${LEVELS[level].name}档 ${won ? history.length : 'X'}/${MAX_TRIES}\n` + history.map(x => x.row).join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('已复制'), () => prompt('复制战绩', txt));
}

function controls() {
  const st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0 });
  return h('section', { class: 'card ctl' },
    h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, v]) =>
      h('button', { class: `lv${+k === level ? ' on' : ''}`, onclick: () => { level = +k; store.set('level', level); start(mode === 'daily' ? dailyPuzzle() : puzzle, mode); } },
        h('b', {}, v.name), h('small', {}, v.desc)))),
    h('div', { class: 'modes' },
      h('button', { class: `btn${mode === 'daily' ? '' : ' ghost'}`, onclick: () => start(dailyPuzzle(), 'daily') }, `每日一题 ${todayKey()}`),
      h('button', { class: `btn${mode === 'random' ? '' : ' ghost'}`, onclick: () => start(P[Math.floor(Math.random() * P.length)], 'random') }, '随机一题'),
      h('span', { class: 'note' }, `已玩 ${st.played} · 胜 ${st.won} · 连胜 ${st.streak} · 最佳 ${st.best}`)));
}

// ------------------------------------------------------------------ picker modal
const dlg = h('dialog', { class: 'picker' });
document.body.append(dlg);

function openPicker(kind, apply, slot) {
  const multi = kind === 'creation';
  const all = D[kind].filter(e => e.id != null).sort((a, b) => (b.real !== false) - (a.real !== false));
  const used = kind === 'awakener' ? new Set(sel.slots.map(s => s.awk).filter(Boolean)) : new Set();
  let q = '', f1 = '', f2 = '', fk = '';
  const f1key = { awakener: 'realm', wheel: 'realm', key: 'realm', creation: 'kind' }[kind];
  const f2key = { awakener: 'role', wheel: 'rarity', creation: 'rarity' }[kind];
  const opts = (key) => key ? [...new Set(all.map(e => e[key]).filter(Boolean))].sort() : [];
  const grid = h('div', { class: 'pgrid' });
  const draw = () => {
    grid.replaceChildren();
    const list = all.filter(e => (!q || (e.zh + e.en).toLowerCase().includes(q)) && (!f1 || e[f1key] === f1) && (!f2 || e[f2key] === f2) && (!fk || (e.kw || []).includes(fk)));
    list.forEach(e => {
      const chosen = multi && sel.relics.includes(String(e.id));
      const full = multi && !chosen && sel.relics.length >= puzzle.relics.length;
      grid.append(h('button', { type: 'button', class: `pitem${chosen ? ' chosen' : ''}${used.has(String(e.id)) ? ' used' : ''}`, disabled: full, title: e.en,
        onclick: () => {
          const id = String(e.id);
          if (multi) {
            sel.relics = chosen ? sel.relics.filter(x => x !== id) : [...sel.relics, id];
            persist(); draw(); count.textContent = `${sel.relics.length}/${puzzle.relics.length}`; return;
          }
          apply(id); persist(); dlg.close(); render();
        } }, imgEl(e.img, e.zh), h('small', {}, e.zh), e.real === false ? h('em', { class: 'decoy' }, '未上榜') : null));
    });
    if (!list.length) grid.append(h('p', { class: 'note' }, '没有匹配项'));
  };
  const sub = (key, label, set) => {
    const o = opts(key);
    return o.length ? h('select', { onchange: ev => { set(ev.target.value); draw(); } }, h('option', { value: '' }, label), o.map(x => h('option', { value: x }, x))) : null;
  };
  const kwSelect = () => {
    const have = new Set(all.flatMap(e => e.kw || []));
    const ks = KW.list.filter(k => have.has(k.s));
    if (!ks.length) return null;
    return h('select', { title: '按技能/描述中的关键词筛选', onchange: ev => { fk = ev.target.value; draw(); } }, h('option', { value: '' }, '全部关键词'),
      Object.entries(KW_TYPE).map(([t, label]) => { const g = ks.filter(k => k.t === t); return g.length ? h('optgroup', { label }, g.map(k => h('option', { value: k.s }, k.n))) : null; }));
  };
  const count = h('span', { class: 'note' }, multi ? `${sel.relics.length}/${puzzle.relics.length}` : '');
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, `选择${KINDS[kind]}`), count,
      h('input', { type: 'search', placeholder: '搜索名称（中/英）', oninput: ev => { q = ev.target.value.trim().toLowerCase(); draw(); } }),
      sub(f1key, f1key === 'kind' ? '全部类型' : '全部阵营', v => { f1 = v; }), sub(f2key, f2key === 'role' ? '全部定位' : '全部稀有度', v => { f2 = v; }),
      kwSelect(),
      !multi ? h('button', { class: 'btn ghost sm', onclick: () => { apply(null); persist(); dlg.close(); render(); } }, '清空') : null,
      h('button', { class: 'btn sm', onclick: () => { dlg.close(); render(); } }, multi ? '完成' : '关闭')),
    grid);
  draw();
  dlg.showModal();
}

// ------------------------------------------------------------------ render
function render() {
  root.replaceChildren(
    controls(),
    reportPanel(),
    h('section', { class: 'card board' },
      h('h3', {}, `还原队伍 · ${LEVELS[level].name}档`),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotCard(k))),
      teamExtras(),
      h('div', { class: 'actions' },
        finished ? null : h('button', { class: 'btn', onclick: submit }, `提交推理（剩余 ${MAX_TRIES - history.length} 次）`),
        finished ? null : h('button', { class: 'btn ghost', onclick: () => { sel = newSel(); fb = {}; persist(); render(); } }, '重置选择'))),
    historyPanel(),
    ...(finished ? [answerPanel()] : []));
}

await start(dailyPuzzle(), 'daily');
