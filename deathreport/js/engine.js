// 死亡游戏调查报告 · 纯逻辑引擎（无 DOM）。数据来自 data/game.json（tools/build.py 生成）。
export const SAVE_VERSION = 2;   // 2：多存界面位置（读到哪条 / 哪个页签），老档 v1 由 ui.js 的 migrate() 并进来
export const REC_RE = /^(\d{2})-([A-E][1-5])-(\d{2})$/, DOC_RE = /^00-[A-Z]+$/;

export function newGame(G) {
  const st = { v: SAVE_VERSION, recovered: [], docs: [], msgs: [], arcs: [], lastMile: 0, badges: [], tokens: 0, freeHints: 0, bonus: 0, firstTry: 0, missed: {}, drafts: {}, confirmed: {}, wrong: {}, hl: {}, marks: {}, rnotes: {}, notes: '', hintStep: {}, hints: 0, tries: 0, bad: 0, ended: null, startedAt: Date.now(), playMs: 0 };
  st.docs.push('00-ORDER');
  deliver(G, st);
  return st;
}
export const confirmedCount = (st) => Object.keys(st.confirmed).length;
export const total = (G) => Object.keys(G.records).length;
export const shadowUnlocked = (G, st) => st.msgs.includes((G.shadow && G.shadow.msg) || 'MSG06');

// ---- messages arrive as reports get confirmed
export function deliver(G, st) {
  const got = [], n = confirmedCount(st);
  for (const m of G.msgs) if (m.need <= n && !st.msgs.includes(m.id)) { st.msgs.push(m.id); got.push(m.id); }
  st.arcs ||= [];
  for (const a of G.arcs || []) {
    if (st.arcs.includes(a.id)) continue;
    if (a.hidden) { if (a.cond && condMet(G, st, a.cond)) { grant(G, st, a.id, a.cond.streak ? 'streak' : 'set'); got.push(a.id); } }
    else if (a.need <= n) { st.arcs.push(a.id); got.push(a.id); }
  }
  return got;
}

// hidden archives open when something specific has been deduced, not when enough has been done
export function h32(str) { let h = 0x811c9dc5; for (const b of new TextEncoder().encode(str)) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
const BONUS = { puzzle: 500, set: 250, streak: 300 };
// opening a hidden archive: the archive itself, a badge, a free-hint voucher and score
export function grant(G, st, id, how) {
  const a = G.arcs.find((x) => x.id === id); st.arcs ||= [];
  if (!a || st.arcs.includes(id)) return null;
  st.arcs.push(id); (st.badges ||= []).push(id); st.tokens = (st.tokens || 0) + 1; st.bonus = (st.bonus || 0) + BONUS[how];
  return { id, badge: a.badge, points: BONUS[how], how };
}
export function condMet(G, st, c) {
  if (c.streak) return (st.streak || 0) >= c.streak;
  const done = new Set(Object.keys(st.confirmed).map((k) => G.records[k].num));
  return c.nums.every((n) => done.has(n));
}
export const lockedHidden = (G, st) => (G.arcs || []).filter((a) => a.hidden && !(st.arcs || []).includes(a.id)).map((a) => ({ id: a.id, riddle: a.riddle }));

// ---- recovering by name
export function normalizeName(s) {
  return String(s || '').replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[－—–]/g, '-').replace(/\s+/g, '').toUpperCase();
}
export function recover(G, st, input) {
  const s = normalizeName(input);
  st.tries++;
  if (!s) return { ok: false, code: 'empty', msg: '× 尚未输入。请输入记录名。' };
  if (!REC_RE.test(s) && !DOC_RE.test(s)) {
    const pz = (G.puzzles || []).find((p) => p.h === h32(s));
    if (pz) {
      st.arcs ||= [];
      if (st.arcs.includes(pz.id)) return { ok: true, again: true, kind: 'arc', id: pz.id, msg: '● 该档案已经打开。' };
      const seen = (src) => { const [k, v] = src.split(':'); return k === 'rec' ? st.recovered.includes(G.roster[+v - 1].key) : k === 'arc' ? st.arcs.includes(v) : st.docs.includes(v); };
      if (!pz.src.every(seen)) { st.bad++; return { ok: false, code: 'silent', msg: '× 没有回应。' }; }
      const reward = grant(G, st, pz.id, 'puzzle'); deliver(G, st);
      return { ok: true, kind: 'arc', id: pz.id, puzzle: true, reward, msg: '● 有回应——隐藏档案已打开。' };
    }
    st.bad++; return { ok: false, code: 'format', msg: '× 输入格式不正确。（例：05-D2-29 ／ 00-ORDER）' }; }
  if (DOC_RE.test(s)) {
    const d = G.docs[s];
    if (!d) { st.bad++; return { ok: false, code: '404', msg: `× ERROR 404 ― 无对应记录: ${s}` }; }
    if (st.docs.includes(s)) return { ok: true, again: true, kind: 'doc', id: s, msg: '● 该系统文档已经复原。' };
    if (d.final && !st.ended && confirmedCount(st) < total(G)) { st.bad++; return { ok: false, code: '404', msg: `× ERROR 404 ― 无对应记录: ${s}` }; }
    st.docs.push(s); return { ok: true, kind: 'doc', id: s, msg: '● 已复原系统文档。' };
  }
  const r = G.records[s];
  if (!r) { st.bad++; return { ok: false, code: '404', msg: `× ERROR 404 ― 无对应记录: ${s}` }; }
  if (st.recovered.includes(s)) return { ok: true, again: true, kind: 'rec', id: s, msg: '● 该记录已经复原。' };
  st.recovered.push(s);
  return { ok: true, kind: 'rec', id: s, msg: '● 已复原死亡记录。' };
}
// recover by clicking a link inside a document
export const follow = (G, st, id) => recover(G, st, id);

// ---- deduction structure: every record can carry the full key (name + place + order) of earlier deaths; [N] on the left = how many are still unrecovered
export function leads(G, st, id) {
  const r = G.records[id] || G.docs[id] || G.msgs.find((m) => m.id === id) || (G.arcs || []).find((a) => a.id === id);
  return ((r && r.refs) || []).filter((k) => !st.recovered.includes(k)).map((k) => ({ key: k, name: G.records[k].name, num: G.records[k].num }));
}
export function leadTotal(G, st) {
  const out = new Set();
  const feed = (r) => (r.refs || []).forEach((k) => { if (!st.recovered.includes(k)) out.add(k); });
  st.recovered.forEach((k) => feed(G.records[k])); st.docs.forEach((d) => feed(G.docs[d])); st.msgs.forEach((m) => feed(G.msgs.find((x) => x.id === m)));
  (st.arcs || []).forEach((a) => feed(G.arcs.find((x) => x.id === a)));
  return out.size;
}
export function structure(G, st) {
  const pointed = new Set(), edges = [];
  const feed = (from, r) => (r.refs || []).forEach((k) => { pointed.add(k); if (from != null) edges.push({ from, to: G.records[k].num }); });
  st.recovered.forEach((k) => feed(G.records[k].num, G.records[k]));
  st.docs.forEach((d) => feed(null, G.docs[d])); st.msgs.forEach((m) => feed(null, G.msgs.find((x) => x.id === m)));
  (st.arcs || []).forEach((a) => feed(null, G.arcs.find((x) => x.id === a)));
  for (const k of G.start) pointed.add(k);
  const nodes = G.roster.map((p) => {
    const k = p.key, state = st.confirmed[k] ? 'confirmed' : st.recovered.includes(k) ? 'recovered' : pointed.has(k) ? 'lead' : 'unknown';
    return { n: p.n, name: p.melted && !st.recovered.some((x) => G.records[x].num === 50) ? '▇▇' : p.name, state, out: state === 'unknown' || state === 'lead' ? 0 : unrecoveredRefs(G, st, k) };
  });
  return { nodes, edges };
}

// ---- marks (three colours per paragraph), clue cards, per-record notes, search
export const MARK_NAMES = ['', '线索', '证词', '矛盾'];
export function marksOf(st, id) {
  const m = (st.marks ||= {}); if (!m[id] && st.hl && st.hl[id]) { m[id] = Object.fromEntries(st.hl[id].map((i) => [i, 1])); }
  return m[id] || {};
}
export function cycleMark(st, id, i) {
  const m = ((st.marks ||= {})[id] = { ...marksOf(st, id) }); const c = ((m[i] || 0) + 1) % 4;
  if (c) m[i] = c; else delete m[i];
  return c;
}
const paraList = (text) => text.split(/(\[sys\][\s\S]*?\[\/sys\])/).filter((b) => b.trim() && !b.startsWith('[sys]')).flatMap((b) => b.split('\n').filter((l) => l.trim()));
export const paragraphs = paraList;
export function clueCards(G, st) {
  const out = [];
  for (const id of [...st.recovered, ...st.docs, ...st.msgs, ...(st.arcs || [])]) {
    const r = G.records[id] || G.docs[id] || G.msgs.find((m) => m.id === id) || G.arcs.find((a) => a.id === id); if (!r) continue;
    const ps = paraList(r.text), m = marksOf(st, id);
    for (const [i, c] of Object.entries(m)) if (ps[i]) out.push({ id, i: +i, c, text: ps[i], title: G.records[id]?.name || G.arcs.find((a) => a.id === id)?.title || id });
  }
  return out.sort((a, b) => b.c - a.c || a.id.localeCompare(b.id));
}
export function search(G, st, q) {
  q = String(q || '').trim(); if (!q) return [];
  const out = [];
  for (const id of [...st.recovered, ...st.docs, ...st.msgs, ...(st.arcs || [])]) {
    const r = G.records[id] || G.docs[id] || G.msgs.find((m) => m.id === id) || G.arcs.find((a) => a.id === id); if (!r) continue;
    paraList(r.text).forEach((t, i) => { if (t.includes(q)) out.push({ id, i, text: t, title: G.records[id]?.name || G.docs[id]?.title || G.arcs.find((a) => a.id === id)?.title || id }); });
  }
  return out;
}

// ---- reasoning aids built from what has been recovered
export function itemTrail(G, st) {
  const uses = {};
  for (const k of st.recovered) for (const n of G.records[k].facts.items) (uses[n] ||= []).push({ key: k, name: G.records[k].name, when: G.records[k].when, min: G.records[k].min, own: G.records[k].num === n });
  return Object.entries(uses).map(([n, u]) => ({ n: +n, item: G.roster[n - 1].item, owner: G.roster[n - 1].name, uses: u.sort((a, b) => a.min - b.min) })).sort((a, b) => a.n - b.n);
}
export function timeline(G, st) {
  const zoneAt = (min) => G.zones.filter((z) => (z.day - 1) * 1440 + z.hour * 60 <= min).map((z) => z.cell);
  return st.recovered.map((k) => G.records[k]).sort((a, b) => a.min - b.min).map((r) => ({ key: r.key, name: r.name, when: r.when, cell: r.cell, place: G.places[r.cell], closed: st.docs.includes('00-ZONE') ? zoneAt(r.min) : null, confirmed: !!st.confirmed[r.key] }));
}
export function evidenceOf(G, key) {
  const f = G.records[key].facts, own = G.records[key].num;
  return { items: f.items, names: f.names.filter((n) => n !== own), locs: f.locs };
}

// ---- reference bookkeeping (the [X] badge and the dotted underline)
export function unrecoveredRefs(G, st, id) {
  const r = G.records[id] || G.docs[id] || G.msgs.find((m) => m.id === id) || (G.arcs || []).find((a) => a.id === id);
  if (!r) return 0;
  return (r.refs || []).filter((k) => !st.recovered.includes(k)).length;
}
export function unreadSysDocs(G, st, id) {
  const r = G.records[id]; if (!r) return [];
  return (r.sys || []).filter((d) => !st.docs.includes(d));
}
export function index(G, st) {
  const out = [];
  for (const d of st.docs) out.push({ id: d, kind: 'doc', title: G.docs[d].title, refs: unrecoveredRefs(G, st, d) });
  for (const m of st.msgs) out.push({ id: m, kind: 'msg', title: '发件人不明', refs: unrecoveredRefs(G, st, m) });
  for (const a of st.arcs || []) out.push({ id: a, kind: 'arc', title: G.arcs.find((x) => x.id === a).title, refs: unrecoveredRefs(G, st, a) });
  st.recovered.forEach((k, i) => { const r = G.records[k]; out.push({ id: k, kind: 'rec', title: r.name, when: r.when, order: i, refs: unrecoveredRefs(G, st, k), dotted: unreadSysDocs(G, st, k).length > 0, status: st.confirmed[k] ? 'ok' : st.wrong[k] ? 'ng' : st.drafts[k]?.cause ? 'draft' : '' }); });
  return out;
}

// ---- roster / report options
export function rosterView(G, st) {
  const seen10 = st.recovered.some((k) => G.records[k].num === 50);
  return G.roster.map((p) => ({ ...p, shownName: p.melted && !seen10 ? '▇▇' : p.name, recordKnown: st.recovered.includes(p.key) }));
}
export function options(G, st, key) {
  const ev = key && G.records[key] ? G.records[key].facts.items : [], nm = key && G.records[key] ? G.records[key].facts.names : [];
  const ros = rosterView(G, st);
  const culprits = [{ v: '0', t: '其他（无加害人）' }, ...ros.map((p) => ({ v: String(p.n), t: `${String(p.n).padStart(2, '0')} ${p.shownName}${p.melted ? '（融蚀）' : ''}` }))];
  if (shadowUnlocked(G, st)) culprits.push({ v: String((G.shadow && G.shadow.num) || 63), t: (G.shadow && G.shadow.label) || '63 名册外的个体（黑影）' });
  return {
    causes: Object.entries(G.causes).map(([v, t]) => ({ v, t })),
    weapons: [{ v: '0', t: '无' }, ...ros.filter((p) => p.itemClass !== 'none' || !p.melted).map((p) => ({ v: String(p.n), t: (p.melted ? '（融蚀）' : p.item) }))],
    culprits,
  };
}
export function setDraft(st, key, field, value) {
  const d = (st.drafts[key] ||= {});
  d[field] = value;
  if (st.wrong[key]) delete st.wrong[key];
}
export function submit(G, st, key) {
  const d = st.drafts[key], sol = G.solutions[key];
  if (!st.recovered.includes(key)) return { ok: false, msg: '这条记录还没有复原。' };
  if (st.confirmed[key]) return { ok: true, again: true, msg: '这份报告已经确认。' };
  if (!d || d.cause == null || d.weapon == null || d.culprit == null) return { ok: false, msg: '三项都需要填写。' };
  if (String(d.culprit) === String((G.shadow && G.shadow.num) || 63) && !shadowUnlocked(G, st)) return { ok: false, msg: '该选项尚不可用。' };
  const okAll = d.cause === sol.cause && String(d.weapon) === String(sol.weaponNum || 0) && String(d.culprit) === String(sol.culprit);
  if (okAll) { st.streak = (st.streak || 0) + 1; if (!(st.missed || {})[key]) st.firstTry = (st.firstTry || 0) + 1; st.confirmed[key] = true; delete st.wrong[key]; const arrived = deliver(G, st); return { ok: true, correct: true, arrived, milestone: milestone(G, st, arrived), msg: '报告已确认。' }; }
  st.streak = 0; st.missed[key] = (st.missed[key] || 0) + 1; st.wrong[key] = true;
  return { ok: true, correct: false, msg: '存在错误的报告。' };
}
// every third confirmed report: a resonance (popup + effect), a free nudge toward what can be deduced next, and the archives that just arrived
export function milestone(G, st, arrived = []) {
  const n = confirmedCount(st);
  if (n % 3 !== 0 || n <= (st.lastMile || 0) || n > (G.milestones || []).length * 3) return null;
  st.lastMile = n;
  return { k: n / 3, confirmed: n, line: (G.milestones || [])[n / 3 - 1] || '', arcs: arrived.filter((x) => /^(AR|HX)-/.test(x)).map((x) => G.arcs.find((a) => a.id === x)), nudge: nudge(G, st) };
}
export function nudge(G, st) {
  const out = new Set(); const feed = (r) => (r.refs || []).forEach((k) => { if (!st.recovered.includes(k)) out.add(G.records[k].name); });
  st.recovered.forEach((k) => feed(G.records[k])); (st.arcs || []).forEach((a) => feed(G.arcs.find((x) => x.id === a))); st.docs.forEach((d) => feed(G.docs[d])); st.msgs.forEach((m) => feed(G.msgs.find((x) => x.id === m)));
  return [...out].slice(0, 4);
}
// the confirmation line shown after a correct report ("flavor" built from the solution)
export function summary(G, key) {
  const s = G.solutions[key], r = G.records[key];
  const who = s.culprit === 0 ? null : (s.culprit === ((G.shadow && G.shadow.num) || 63) ? ((G.shadow && G.shadow.label) || '名册外的个体（黑影）') : G.roster[s.culprit - 1].name);
  const cause = s.causeZh;
  if (s.cause === 'blast') return `${r.name} 因银芯被强制崩解而死`;
  if (s.cause === 'accident') return `${r.name} 因自身过失而死`;
  if (!who) return s.cause === 'fall' ? `${r.name} 主动从高处跳下而死` : `${r.name} 因自行服毒而死`;
  return `${r.name} 被${who}${s.weapon !== '无' ? `用${s.weapon}` : ''}杀死，死因：${cause}`;
}

// ---- hints (3-step ladders; they cost rating)
export function nextRestoreTarget(G, st) {
  const have = new Set(st.recovered);
  const reachable = (k) => st.recovered.some((r) => G.records[r].refs.includes(k)) || st.msgs.some((m) => G.msgs.find((x) => x.id === m).refs.includes(k)) || G.start.includes(k);
  const pending = Object.values(G.records).filter((r) => !have.has(r.key)).sort((a, b) => a.dord - b.dord);
  return (pending.find((r) => reachable(r.key)) || pending[0])?.key || null;
}
export function hint(G, st, kind, key) {
  const id = kind === 'restore' ? nextRestoreTarget(G, st) : key;
  if (!id) return { ok: false, msg: '没有需要提示的内容。' };
  if (kind === 'confirm' && !st.recovered.includes(id)) return { ok: false, msg: '这条记录还没有复原。' };
  const stepKey = `${kind}:${id}`, step = Math.min(2, st.hintStep[stepKey] ?? -1) ;
  const next = Math.min(2, (st.hintStep[stepKey] ?? -1) + 1);
  st.hintStep[stepKey] = next;
  const free = (st.tokens || 0) > 0; if (free) { st.tokens--; st.freeHints = (st.freeHints || 0) + 1; } else st.hints++;
  return { ok: true, id, step: next, total: 3, text: G.hints[kind][id][next], kind, free };
}

// ---- ending
export function score(G, st) { return Math.max(0, confirmedCount(st) * 100 + (st.firstTry || 0) * 50 + (st.bonus || 0) - st.hints * 30 - st.bad * 5); }
// rating = archive completion (55) + restraint with hints (20) + hidden archives found (25); SSS needs everything and almost no hints
export const RANKS = [['SSS', 98], ['SS', 90], ['S', 80], ['A', 70], ['B', 55], ['C', 0]];
export function rating(G, st) {
  const t = total(G), visible = Object.values(G.docs).filter((d) => !d.final).length + (G.arcs || []).filter((a) => !a.hidden).length;
  const read = st.docs.filter((d) => !G.docs[d].final).length + (st.arcs || []).filter((a) => !G.arcs.find((x) => x.id === a).hidden).length;
  const comp = Math.min(1, (confirmedCount(st) / t) * 0.88 + (visible ? read / visible : 1) * 0.12);
  const hint = Math.max(0, 1 - st.hints / 25), hh = hiddenTotal(G), hid = hh ? (st.badges || []).length / hh : 1;
  const w = hh ? [0.55, 0.2, 0.25] : [0.7, 0.3, 0];
  const total100 = Math.round(100 * (w[0] * comp + w[1] * hint + w[2] * hid) * 10) / 10;
  return { comp: Math.round(comp * 100), hint: Math.round(hint * 100), hid: Math.round(hid * 100), total: total100, rank: RANKS.find(([, m]) => total100 >= m)[0] };
}
export function pickEnding(G, st) {
  const have = new Set(st.badges || []), hs = G.arcs.filter((a) => a.hidden).map((a) => a.id);
  return (G.endings || []).find((e) => e.need === 'all' ? hs.length > 0 && hs.every((h) => have.has(h)) : e.need.every((h) => have.has(h)));
}
export const hiddenTotal = (G) => G.arcs.filter((a) => a.hidden).length;
export function stats(G, st) {
  const n = confirmedCount(st), t = total(G);
  return { score: score(G, st), rating: rating(G, st), badges: (st.badges || []).length, hiddenTotal: hiddenTotal(G), firstTry: st.firstTry || 0, tokens: st.tokens || 0, confirmed: n, total: t, rate: Math.round((n / t) * 100), hints: st.hints, tries: st.tries, bad: st.bad, minutes: Math.round(st.playMs / 60000) };
}
export function canFinish(G, st) { return confirmedCount(st) >= Math.ceil(total(G) / 2); }
export function finish(G, st) {
  const n = confirmedCount(st);
  st.ended = n >= total(G) ? 'true' : 'partial';
  if (!st.docs.includes('00-DECREE') && st.ended === 'true') st.docs.push('00-DECREE', '00-SEALED');
  const rt = rating(G, st), r = st.ended === 'true' ? rt.rank : (rt.rank === 'SSS' || rt.rank === 'SS' ? 'S' : rt.rank);
  st.finalScore = rt.total; st.ending = st.ended === 'true' ? (pickEnding(G, st) || {}).id || 'E0' : 'P';
  st.rank = r;
  return { ended: st.ended, rank: r };
}
