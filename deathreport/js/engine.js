// 死亡游戏调查报告 · 纯逻辑引擎（无 DOM）。数据来自 data/game.json（tools/build.py 生成）。
export const SAVE_VERSION = 1;
export const REC_RE = /^(\d{2})-([A-E][1-5])-(\d{2})$/, DOC_RE = /^00-[A-Z]+$/;

export function newGame(G) {
  const st = { v: SAVE_VERSION, recovered: [], docs: [], msgs: [], arcs: [], lastMile: 0, drafts: {}, confirmed: {}, wrong: {}, hl: {}, marks: {}, rnotes: {}, notes: '', hintStep: {}, hints: 0, tries: 0, bad: 0, ended: null, startedAt: Date.now(), playMs: 0 };
  st.docs.push('00-ORDER');
  deliver(G, st);
  return st;
}
export const confirmedCount = (st) => Object.keys(st.confirmed).length;
export const total = (G) => Object.keys(G.records).length;
export const shadowUnlocked = (G, st) => st.msgs.includes('MSG06');

// ---- messages arrive as reports get confirmed
export function deliver(G, st) {
  const got = [], n = confirmedCount(st);
  for (const m of G.msgs) if (m.need <= n && !st.msgs.includes(m.id)) { st.msgs.push(m.id); got.push(m.id); }
  st.arcs ||= [];
  for (const a of G.arcs || []) if (a.need <= n && !st.arcs.includes(a.id)) { st.arcs.push(a.id); got.push(a.id); }
  return got;
}

// ---- recovering by name
export function normalizeName(s) {
  return String(s || '').replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[－—–]/g, '-').replace(/\s+/g, '').toUpperCase();
}
export function recover(G, st, input) {
  const s = normalizeName(input);
  st.tries++;
  if (!s) return { ok: false, code: 'empty', msg: '× 尚未输入。请输入记录名。' };
  if (!REC_RE.test(s) && !DOC_RE.test(s)) { st.bad++; return { ok: false, code: 'format', msg: '× 输入格式不正确。（例：05-D2-29 ／ 00-ORDER）' }; }
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
  const culprits = [{ v: '0', t: '其他（无加害人）' }, ...ros.map((p) => ({ v: String(p.n), t: `${nm.includes(p.n) ? '★ ' : ''}${String(p.n).padStart(2, '0')} ${p.shownName}${p.melted ? '（融蚀）' : ''}` }))];
  if (shadowUnlocked(G, st)) culprits.push({ v: '63', t: '63 名册外的个体（黑影）' });
  return {
    causes: Object.entries(G.causes).map(([v, t]) => ({ v, t })),
    weapons: [{ v: '0', t: '无' }, ...ros.filter((p) => p.itemClass !== 'none' || !p.melted).map((p) => ({ v: String(p.n), t: (ev.includes(p.n) ? '★ ' : '') + (p.melted ? '（融蚀）' : p.item) }))].sort((a, b) => (b.t.startsWith('★') ? 1 : 0) - (a.t.startsWith('★') ? 1 : 0)),
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
  if (String(d.culprit) === '63' && !shadowUnlocked(G, st)) return { ok: false, msg: '该选项尚不可用。' };
  const okAll = d.cause === sol.cause && String(d.weapon) === String(sol.weaponNum || 0) && String(d.culprit) === String(sol.culprit);
  if (okAll) { st.confirmed[key] = true; delete st.wrong[key]; const arrived = deliver(G, st); return { ok: true, correct: true, arrived, milestone: milestone(G, st, arrived), msg: '报告已确认。' }; }
  st.wrong[key] = true;
  return { ok: true, correct: false, msg: '存在错误的报告。' };
}
// every third confirmed report: a resonance (popup + effect), a free nudge toward what can be deduced next, and the archives that just arrived
export function milestone(G, st, arrived = []) {
  const n = confirmedCount(st);
  if (n % 3 !== 0 || n <= (st.lastMile || 0) || n > 60) return null;
  st.lastMile = n;
  return { k: n / 3, confirmed: n, line: (G.milestones || [])[n / 3 - 1] || '', arcs: arrived.filter((x) => x.startsWith('AR-')).map((x) => G.arcs.find((a) => a.id === x)), nudge: nudge(G, st) };
}
export function nudge(G, st) {
  const out = new Set(); const feed = (r) => (r.refs || []).forEach((k) => { if (!st.recovered.includes(k)) out.add(G.records[k].name); });
  st.recovered.forEach((k) => feed(G.records[k])); (st.arcs || []).forEach((a) => feed(G.arcs.find((x) => x.id === a))); st.docs.forEach((d) => feed(G.docs[d])); st.msgs.forEach((m) => feed(G.msgs.find((x) => x.id === m)));
  return [...out].slice(0, 4);
}
// the confirmation line shown after a correct report ("flavor" built from the solution)
export function summary(G, key) {
  const s = G.solutions[key], r = G.records[key];
  const who = s.culprit === 0 ? null : (s.culprit === 63 ? '名册外的个体（黑影）' : G.roster[s.culprit - 1].name);
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
  st.hintStep[stepKey] = next; st.hints++;
  return { ok: true, id, step: next, total: 3, text: G.hints[kind][id][next], kind };
}

// ---- ending
export function stats(G, st) {
  const n = confirmedCount(st), t = total(G);
  return { confirmed: n, total: t, rate: Math.round((n / t) * 100), hints: st.hints, tries: st.tries, bad: st.bad, minutes: Math.round(st.playMs / 60000) };
}
export function canFinish(G, st) { return confirmedCount(st) >= Math.ceil(total(G) / 2); }
export function finish(G, st) {
  const n = confirmedCount(st);
  st.ended = n >= total(G) ? 'true' : 'partial';
  if (!st.docs.includes('00-DECREE') && st.ended === 'true') st.docs.push('00-DECREE', '00-SEALED');
  const r = st.ended === 'true' ? (st.hints === 0 ? 'S' : st.hints <= 20 ? 'A' : 'B') : 'C';
  st.rank = r;
  return { ended: st.ended, rank: r };
}
