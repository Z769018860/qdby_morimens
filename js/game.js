import { $, h, store, loadDict, imgEl, wan, nav, KINDS, kindName, KW, KW_TYPE, renderText, t, nameOf, lang } from './common.js';
import { PEPPER } from './pepper.js';

const KW_TYPE_EN = { realm: 'Realm', mechanic: 'State / Mechanic', tag: 'Tag', help: 'Help' };

const MAX_TRIES = 6;
const LEVELS = {
  1: { name: () => t('lv1'), desc: () => t('lv1d') },
  2: { name: () => t('lv2'), desc: () => t('lv2d') },
  3: { name: () => t('lv3'), desc: () => t('lv3d') },
  4: { name: () => t('lv4'), desc: () => t('lv4d') },
};
const LETTERS = ['A', 'B', 'C', 'D'];
const EMO = { g: '🟩', y: '🟨', n: '⬛', '': '⬜' };

// ------------------------------------------------------------------ user profile
// 本地档案：昵称、喜好干员；准确率等统计独立存 stats。
let profile = store.get('profile', { name: '', favs: [] });
function saveProfile() { store.set('profile', profile); }

document.body.prepend(nav('game'));
const root = $('#app');
root.textContent = t('loading');

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
  if (sel.slots.some(s => s.awk == null)) { toast(t('fillAll')); return; }
  if (new Set(sel.slots.map(s => s.awk)).size < 4) { toast(t('noDup')); return; }
  const r = evaluate();
  fillFeedback(r);
  history.push({ row: emojiRow(r), frac: r.green / r.total, green: r.green, total: r.total });
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
  const st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0, last: '', fields: 0, totalFields: 0 });
  if (st.last === todayKey() + ':' + level) return;
  st.played++; st.last = todayKey() + ':' + level;
  if (won) { st.won++; st.streak++; st.best = Math.max(st.best, st.streak); } else st.streak = 0;
  // 准确率：统计命中的字段数 / 总字段数（最后一条历史记录的 frac）
  const last = history[history.length - 1];
  if (last && last.total != null) { st.fields = (st.fields || 0) + last.green; st.totalFields = (st.totalFields || 0) + last.total; }
  store.set('stats', st);
}

// ------------------------------------------------------------------ hints
const REALM_EN = { CHAOS: 'Chaos', CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra', FADED_LEGACY: 'Faded Legacy' };
const ROLE_EN = { ASSAULT: 'Damage', WARDEN: 'Defense', CHORUS: 'Support' };
const realmOf = (e) => (lang.cur === 'en' ? (REALM_EN[e.realmCode] || e.realm) : e.realm);
const roleOf = (e) => (lang.cur === 'en' ? (ROLE_EN[e.roleCode] || e.role) : e.role);
function hintAwk(k) {
  if (finished || hintTags[`a${k}`]) return;
  const e = idx.awakener.get(ans[k].tid);
  hintTags[`a${k}`] = `${realmOf(e)} · ${roleOf(e)}`;
  hintsUsed++; persist(); render();
}
function hintLv(k) {
  if (finished || hintTags[`l${k}`]) return;
  hintTags[`l${k}`] = `${t('lv', { n: ans[k].lv })} · ${t('brk', { n: ans[k].brk })}`;
  hintsUsed++; persist(); render();
}
function hintKey() {
  if (finished || hintTags.key) return;
  hintTags.key = realmOf(idx.key.get(puzzle.key)) || '—';
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
  const rows = ans.map((a, k) => {
    // 养成线索：优先展示新字段（指令卡总等级/狂气等级/灵塑），旧字段作为补充
    const invest = [];
    if (a.cardLv != null) invest.push(`${t('cardLv')} Lv.${a.cardLv}`);
    if (a.madness != null) invest.push(`${t('madnessLv')} Lv.${a.madness}`);
    if (a.pot != null) invest.push(`${t('potLv')} Lv.${a.pot}`);
    if (!invest.length && a.up != null) invest.push(t('cardUp', { n: a.up }), t('talentSum', { n: a.tal }));
    return h('div', { class: 'brow' },
      h('span', { class: 'bl' }, LETTERS[k]),
      h('div', { class: 'bars' },
        bline('dmg', Math.max(a.dmg / total * 100, 0.8), `${t('dmg')} ${(a.dmg / total * 100).toFixed(1)}% · ${wan(a.dmg)}`),
        bline('blk', Math.max(a.blk / maxBlk * 100, 0.8), `${t('blk')} ${wan(a.blk)}`),
        bline('heal', Math.max(a.heal / maxHeal * 100, 0.8), `${t('heal')} ${wan(a.heal)}`),
        h('div', { class: 'invest' }, invest.join(' · '))),
    );
  });
  const bosses = (p.boss || []).map(id => D.monster.find(m => m.id === id)).filter(Boolean);
  // 伤害构成面板
  const dc = p.dmgComp;
  const dmgCompBox = dc ? h('div', { class: 'dmgcomp' },
    h('div', { class: 'dchead' }, t('dmgCompTitle')),
    h('div', { class: 'dcgrid' },
      h('div', { class: 'dc', 'data-k': 'keeper' }, h('small', {}, t('keeper')), h('b', {}, wan(dc.keeper))),
      h('div', { class: 'dc', 'data-k': 'tentacle' }, h('small', {}, t('tentacle')), h('b', {}, wan(dc.tentacle))),
      h('div', { class: 'dc', 'data-k': 'counter' }, h('small', {}, t('counter')), h('b', {}, wan(dc.counter))),
      h('div', { class: 'dc', 'data-k': 'strength' }, h('small', {}, t('strength')), h('b', {}, wan(dc.strength))),
      h('div', { class: 'dc', 'data-k': 'poison' }, h('small', {}, t('poison')), h('b', {}, wan(dc.poison))))) : null;
  return h('section', { class: 'card report' },
    h('div', { class: 'rhead' },
      h('div', {}, h('h2', {}, `${t('reportTitle')} · ${t('season', { s: p.season })}`),
        h('div', { class: 'chips' }, chip(t('zone', { z: p.zone })), chip(t('threat', { t: p.threat })),
          p.madness ? chip(t('madness', { m: p.madness })) : null, chip(t('diffStar', { d: '★'.repeat(p.diff) }), 'gold'),
          p.diffScore != null ? chip(t('diffScore', { s: p.diffScore }), 'gold') : null,
          p.extra ? chip(t('extra'), 'dim') : null)),
      bosses.length ? h('div', { class: 'boss' }, h('div', { class: 'bimgs' }, bosses.map(b => imgEl(b.img, nameOf(b)))), h('small', {}, `${t('bossLabel')}：${bosses.map(b => nameOf(b)).join('、')}`)) : null),
    h('div', { class: 'stats' },
      stat(t('rounds'), p.rounds, t('bossRounds', { n: p.bossRounds })), stat(t('cards'), p.cards, t('energy', { n: p.energy })),
      stat(t('maxBout'), wan(p.maxBout)), stat(t('deathResist'), p.deathResist),
      stat(t('leftHp'), `${p.left}/${p.hp}`), stat(t('keyDmg'), wan(p.playerDmg)),
      stat(t('score'), p.score), stat(t('relicCount'), p.relics.length, level >= 4 ? t('relicAll') : '')),
    dmgCompBox,
    p.diffWhy ? h('div', { class: 'diffwhy' },
      h('b', {}, `${t('diffWhy')}：`),
      h('span', {}, `${t('diffInfo')} ${Math.round(p.diffWhy.info * 100)}%`),
      h('span', {}, `${t('diffSpread')} ${Math.round(p.diffWhy.spread * 100)}%`),
      h('span', {}, `${t('diffPeel')} ${Math.round(p.diffWhy.peel * 100)}%`)) : null,
    bosses.length ? h('details', { class: 'bskills' }, h('summary', {}, t('bossSkills')),
      bosses.map(b => h('div', {}, h('b', {}, nameOf(b)), h('ul', {}, (b.skills || []).map(x => h('li', {}, renderText(x))))))) : null,
    h('div', { class: 'brows' }, rows,
      h('p', { class: 'note' }, t('sortNote'))));
}

function pickBtn(kind, current, onPick, fkey, extraCls = '') {
  const e = current == null ? null : idx[kind].get(String(current));
  const f = fkey ? fbOk(fkey, current) : '';
  return h('button', { class: `pick ${kind} ${f}${extraCls}`, type: 'button', title: e ? nameOf(e) : t('pick' + (kind[0].toUpperCase() + kind.slice(1))), onclick: onPick },
    e ? imgEl(e.img, nameOf(e)) : h('span', { class: 'plus' }, '＋'),
    e ? h('small', {}, nameOf(e)) : h('small', {}, KINDS[kind]));
}

function slotCard(k) {
  const A = active();
  const g = sel.slots[k];
  const locked = finished;
  const open = (kind, apply) => () => { if (!locked) openPicker(kind, apply, k); };
  const card = h('div', { class: 'slot' },
    h('div', { class: 'shead' }, h('b', {}, t('slotHead', { l: LETTERS[k] })),
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
      h('small', {}, t('potLv')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.max(0, (g.pot ?? 1) - 1); persist(); render(); } } }, '−'),
      h('b', {}, g.pot == null ? '—' : g.pot + (f && f.dir ? ' ' + f.dir : '')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.min(15, (g.pot ?? -1) + 1); persist(); render(); } } }, '+')));
  }
  if (!locked) {
    card.append(h('div', { class: 'hints' },
      h('button', { type: 'button', class: 'link', onclick: () => hintAwk(k), disabled: !!hintTags[`a${k}`] }, t('hintRealm')),
      A.pot ? h('button', { type: 'button', class: 'link', onclick: () => hintLv(k), disabled: !!hintTags[`l${k}`] }, t('hintLv')) : null));
  }
  return card;
}

function teamExtras() {
  const A = active();
  const box = h('div', { class: 'extras' });
  if (A.key) {
    box.append(h('div', { class: 'extra' }, h('b', {}, t('keyLabel')),
      pickBtn('key', sel.key, () => { if (!finished) openPicker('key', v => { sel.key = v; }); }, 'key'),
      hintTags.key ? chip(hintTags.key, 'gold') : (finished ? null : h('button', { type: 'button', class: 'link', onclick: hintKey }, t('hintKey')))));
  }
  if (A.relics) {
    const n = puzzle.relics.length;
    box.append(h('div', { class: 'extra wide' }, h('b', {}, `${t('relicLabel')} ${sel.relics.length}/${n}`),
      h('div', { class: 'relics' },
        sel.relics.map(id => {
          const e = idx.creation.get(id);
          const f = fb[`rel${id}`];
          return h('button', { type: 'button', class: `pick mini${f ? ' fb-' + f.c : ''}`, title: e ? nameOf(e) : id,
            onclick: () => { if (!finished) { sel.relics = sel.relics.filter(x => x !== id); persist(); render(); } } },
            imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
        }),
        finished ? null : h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', null) }, h('span', { class: 'plus' }, '＋'), h('small', {}, t('add')))
      )));
  }
  return box;
}

function historyPanel() {
  return h('section', { class: 'card hist' },
    h('h3', {}, `${t('histTitle')} ${history.length}/${MAX_TRIES}`),
    history.length ? h('ol', {}, history.map(x => h('li', {}, x.row, h('em', {}, ` ${Math.round(x.frac * 100)}%`)))) : h('p', { class: 'note' }, t('histEmpty')));
}

function answerPanel() {
  const { score, g } = grade();
  const mk = (kind, id) => { const e = idx[kind].get(String(id)); return h('span', { class: 'ans-i', title: e ? nameOf(e) : id }, imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id)); };
  // 每个唤醒体的属性（阵营/定位/稀有度）—— 无论难度档都给出完整信息
  const awkAttr = (a) => {
    const e = idx.awakener.get(String(a.tid));
    if (!e) return '';
    const parts = [realmOf(e), roleOf(e), e.rarity].filter(Boolean);
    return parts.join(' · ');
  };
  return h('section', { class: `card result ${won ? 'win' : 'lose'}` },
    h('h2', {}, won ? `${t('winTitle')} · ${t('grade', { g })}` : `${t('loseTitle')} · ${t('grade', { g })}`),
    h('p', {}, t('scoreText', { s: score, h: hintsUsed, n: history.length })),
    h('div', { class: 'ans-team' }, ans.map((a, k) => h('div', { class: 'ans-slot' },
      h('b', {}, `${t('slotHead', { l: LETTERS[k] })} · ${t('lv', { n: a.lv })} · ${t('potFull', { n: a.pot })} · ${t('brk', { n: a.brk })}`),
      h('div', { class: 'ans-attr' }, awkAttr(a)),
      h('div', { class: 'ans-row' }, mk('awakener', a.tid), a.wheels.map(w => mk('wheel', w)), mk('covenant', a.cov))))),
    h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', puzzle.key)),
    h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')), puzzle.relics.map(r => mk('creation', r))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: share }, t('copy')),
      h('button', { class: 'btn ghost', onclick: () => start(P[Math.floor(Math.random() * P.length)], 'random') }, t('again'))));
}

function share() {
  const txt = `${t('brand')} ${mode === 'daily' ? todayKey() : puzzle.id} · ${LEVELS[level].name()} ${won ? history.length : 'X'}/${MAX_TRIES}\n` + history.map(x => x.row).join('\n');
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast(t('copied')), () => prompt(t('copy'), txt));
}

// ------------------------------------------------------------------ profile / login / favorites
function profilePanel() {
  const st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0, fields: 0, totalFields: 0 });
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  const box = h('section', { class: 'card profile' },
    h('div', { class: 'prow' },
      h('div', { class: 'pname' },
        h('b', {}, profile.name ? `👤 ${profile.name}` : t('loginTitle')),
        h('span', { class: 'note' }, profile.name ? `${t('statsTitle')}：${t('totalPlayed')} ${st.played} · ${t('totalWon')} ${st.won} · ${t('accuracy')} ${acc}` : t('nicknamePh'))),
      h('div', { class: 'pactions' },
        profile.name
          ? h('button', { class: 'btn ghost sm', onclick: () => { profile.name = ''; saveProfile(); render(); } }, t('logout'))
          : h('input', { type: 'text', placeholder: t('nickname'), maxlength: 16, id: 'nick-input',
              onkeydown: ev => { if (ev.key === 'Enter') doLogin(); } }),
        profile.name ? null : h('button', { class: 'btn sm', onclick: doLogin }, t('login')))),
    favPanel());
  return box;
}
function doLogin() {
  const v = ($('#nick-input') ? $('#nick-input').value : '').trim();
  if (!v) { toast(t('nickname')); return; }
  profile.name = v; saveProfile(); render();
}
function favPanel() {
  const box = h('div', { class: 'favs' },
    h('div', { class: 'fhead' }, h('small', {}, `${t('favTitle')} · ${t('favHint')}`)));
  const awks = D.awakener.filter(a => a.id != null);
  const row = h('div', { class: 'frow' },
    awks.map(a => {
      const on = profile.favs.includes(String(a.id));
      return h('button', { type: 'button', class: `fitem${on ? ' on' : ''}`, title: nameOf(a),
        onclick: () => { profile.favs = on ? profile.favs.filter(x => x !== String(a.id)) : [...profile.favs, String(a.id)]; saveProfile(); render(); } },
        imgEl(a.img, nameOf(a)), h('small', {}, nameOf(a)));
    }));
  box.append(row);
  return box;
}

function controls() {
  const st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0, fields: 0, totalFields: 0 });
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  return h('section', { class: 'card ctl' },
    h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, v]) =>
      h('button', { class: `lv${+k === level ? ' on' : ''}`, onclick: () => { level = +k; store.set('level', level); start(mode === 'daily' ? dailyPuzzle() : puzzle, mode); } },
        h('b', {}, v.name()), h('small', {}, v.desc())))),
    h('div', { class: 'modes' },
      h('button', { class: `btn${mode === 'daily' ? '' : ' ghost'}`, onclick: () => start(dailyPuzzle(), 'daily') }, `${t('daily')} ${todayKey()}`),
      h('button', { class: `btn${mode === 'random' ? '' : ' ghost'}`, onclick: () => start(P[Math.floor(Math.random() * P.length)], 'random') }, t('random')),
      h('span', { class: 'note' }, `${t('played')} ${st.played} · ${t('won')} ${st.won} · ${t('streak')} ${st.streak} · ${t('best')} ${st.best} · ${t('accuracy')} ${acc}`)));
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
    const list = all.filter(e => (!q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q)) && (!f1 || e[f1key] === f1) && (!f2 || e[f2key] === f2) && (!fk || (e.kw || []).includes(fk)));
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
        } }, imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)), e.real === false ? h('em', { class: 'decoy' }, t('decoy')) : null));
    });
    if (!list.length) grid.append(h('p', { class: 'note' }, t('noMatch')));
  };
  const sub = (key, label, set) => {
    const o = opts(key);
    return o.length ? h('select', { onchange: ev => { set(ev.target.value); draw(); } }, h('option', { value: '' }, label), o.map(x => h('option', { value: x }, x))) : null;
  };
  const kwSelect = () => {
    const have = new Set(all.flatMap(e => e.kw || []));
    const ks = KW.list.filter(k => have.has(k.s));
    if (!ks.length) return null;
    return h('select', { title: t('allKw'), onchange: ev => { fk = ev.target.value; draw(); } }, h('option', { value: '' }, t('allKw')),
      Object.entries(KW_TYPE).map(([ty, label]) => { const g = ks.filter(k => k.t === ty); return g.length ? h('optgroup', { label: lang.cur === 'en' ? KW_TYPE_EN[ty] : label }, g.map(k => h('option', { value: k.s }, lang.cur === 'en' ? k.e : k.n))) : null; }));
  };
  const count = h('span', { class: 'note' }, multi ? `${sel.relics.length}/${puzzle.relics.length}` : '');
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, `${kindName(kind)}`), count,
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); draw(); } }),
      sub(f1key, f1key === 'kind' ? t('allType') : t('allRealm'), v => { f1 = v; }), sub(f2key, f2key === 'role' ? t('allRole') : t('allRarity'), v => { f2 = v; }),
      kwSelect(),
      !multi ? h('button', { class: 'btn ghost sm', onclick: () => { apply(null); persist(); dlg.close(); render(); } }, t('clear')) : null,
      h('button', { class: 'btn sm', onclick: () => { dlg.close(); render(); } }, multi ? t('done') : t('close'))),
    grid);
  draw();
  dlg.showModal();
}

// ------------------------------------------------------------------ render
// ------------------------------------------------------------------ 配队规则说明（让圈外人也能玩）
function teamRules() {
  const R = lang.cur === 'en' ? {
    t: 'Morimens team rules (for newcomers)',
    items: [
      'Realm (阵营/界域): each Awakener belongs to one of 4 realms — Chaos, Caro (Flesh), Aequor (Deep Sea), Ultra.',
      'Teaming: except Chaos, an Awakener can only team with its own realm plus Chaos. Chaos teams with any realm.',
      'A team = 4 Awakeners + 1 Keeper (you, who carries a Key Token skill).',
      'Each Awakener: 2 Wheels of Destiny (weapons) + 1 Covenant set (3/6-piece bonuses) + Command cards (Strike/Defense/Skill).',
      'Aliemus (狂气): the ultimate energy bar. When full, the Awakener unleashes Exalt (狂气爆发) — it costs Aliemus, NOT Arithmetica.',
      'Arithmetica (算力): spent to play command cards each turn.',
      'Relics (造物): items collected during the run.',
      'Damage sources in the report: Keeper dmg (your key), Tentacle, Counter, Strength, Corrosion/Poison — these help you identify the build.',
    ],
  } : {
    t: '忘却前夜配队规则（给圈外人）',
    items: [
      '界域（阵营）：每个唤醒体属于四大界域之一——混沌、血肉、深海、超维。',
      '组队：除「混沌」外，唤醒体只能与「自身界域 + 混沌」组队；「混沌」可与任意界域组队。',
      '一支队伍 = 4 名唤醒体 + 1 名守密人（你，携带钥令技能）。',
      '每个唤醒体：2 个命轮（武器）+ 1 套密契（3/6 件套效果）+ 指令卡（打击/防御/技能）。',
      '狂气：大招能量条，集满触发「狂气爆发」——消耗的是狂气，不是算力。',
      '算力：每回合打出指令卡所消耗的资源。',
      '造物：探索过程中获得的道具/遗物。',
      '战报里的伤害来源：守密人伤害（你的钥令）、触腕、反击、力量、侵蚀/中毒——它们能帮你锁定队伍构筑。',
    ],
  };
  return h('details', { class: 'bskills teamrules' },
    h('summary', {}, R.t),
    h('ul', {}, R.items.map(x => h('li', {}, x))));
}

function render() {
  root.replaceChildren(
    profilePanel(),
    controls(),
    reportPanel(),
    h('section', { class: 'card board' },
      h('h3', {}, `${t('boardTitle')} · ${LEVELS[level].name()}${t('boardLevel', { l: '' })}`),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotCard(k))),
      teamExtras(),
      h('div', { class: 'actions' },
        finished ? null : h('button', { class: 'btn', onclick: submit }, `${t('submit')}${t('submitLeft', { n: MAX_TRIES - history.length })}`),
        finished ? null : h('button', { class: 'btn ghost', onclick: () => { sel = newSel(); fb = {}; persist(); render(); } }, t('reset')))),
    teamRules(),
    historyPanel(),
    ...(finished ? [answerPanel()] : []));
}

await start(dailyPuzzle(), 'daily');
