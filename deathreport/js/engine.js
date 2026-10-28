// 死亡游戏调查报告 · 纯逻辑引擎（无 DOM）。数据来自 data/game.json（tools/build.py 生成）。
export const SAVE_VERSION = 1;
export const REC_RE = /^(\d{2})-([A-E][1-5])-(\d{2})$/, DOC_RE = /^00-[A-Z]+$/;

export function newGame(G) {
  const st = { v: SAVE_VERSION, recovered: [], docs: [], msgs: [], drafts: {}, confirmed: {}, wrong: {}, hl: {}, notes: '', hintStep: {}, hints: 0, tries: 0, bad: 0, ended: null, startedAt: Date.now(), playMs: 0 };
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

// ---- reference bookkeeping (the [X] badge and the dotted underline)
export function unrecoveredRefs(G, st, id) {
  const r = G.records[id] || G.docs[id] || G.msgs.find((m) => m.id === id);
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
  st.recovered.forEach((k, i) => { const r = G.records[k]; out.push({ id: k, kind: 'rec', title: r.name, when: r.when, order: i, refs: unrecoveredRefs(G, st, k), dotted: unreadSysDocs(G, st, k).length > 0, status: st.confirmed[k] ? 'ok' : st.wrong[k] ? 'ng' : st.drafts[k]?.cause ? 'draft' : '' }); });
  return out;
}

// ---- roster / report options
export function rosterView(G, st) {
  const seen10 = st.recovered.some((k) => G.records[k].num === 50);
  return G.roster.map((p) => ({ ...p, shownName: p.melted && !seen10 ? '▇▇' : p.name, recordKnown: st.recovered.includes(p.key) }));
}
export function options(G, st) {
  const ros = rosterView(G, st);
  const culprits = [{ v: '0', t: '其他（无加害人）' }, ...ros.map((p) => ({ v: String(p.n), t: `${String(p.n).padStart(2, '0')} ${p.shownName}${p.melted ? '（融蚀）' : ''}` }))];
  if (shadowUnlocked(G, st)) culprits.push({ v: '63', t: '63 名册外的个体（黑影）' });
  return {
    causes: Object.entries(G.causes).map(([v, t]) => ({ v, t })),
    weapons: [{ v: '0', t: '无' }, ...ros.filter((p) => p.itemClass !== 'none' || !p.melted).map((p) => ({ v: String(p.n), t: p.melted ? '（融蚀）' : p.item }))],
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
  if (okAll) { st.confirmed[key] = true; delete st.wrong[key]; const arrived = deliver(G, st); return { ok: true, correct: true, arrived, msg: '报告已确认。' }; }
  st.wrong[key] = true;
  return { ok: true, correct: false, msg: '存在错误的报告。' };
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
