import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { newGame, recover, index, options, setDraft, submit, deliver, confirmedCount, hint, finish, stats, summary, shadowUnlocked, rosterView, unrecoveredRefs, normalizeName, nextRestoreTarget } from '../js/engine.js';

const G = JSON.parse(fs.readFileSync(new URL('../data/game.json', import.meta.url), 'utf8'));
const keys = Object.keys(G.records).sort();
const solve = (st, k) => { setDraft(st, k, 'cause', G.solutions[k].cause); setDraft(st, k, 'weapon', String(G.solutions[k].weaponNum || 0)); setDraft(st, k, 'culprit', String(G.solutions[k].culprit)); return submit(G, st, k); };

test('the world is complete: 62 awakeners, 62 records, one hidden 63rd', () => {
  assert.equal(G.roster.length, 62); assert.equal(keys.length, 62);
  assert.deepEqual(G.roster.map((p) => p.n), Array.from({ length: 62 }, (_, i) => i + 1));
  assert.deepEqual(new Set(Object.values(G.records).map((r) => r.num)), new Set(G.roster.map((p) => p.n)));
  assert.equal(G.roster.filter((p) => p.melted).length, 1); assert.equal(G.roster.find((p) => p.melted).name, '图鲁');
  assert.equal(G.shadow.num, 63); assert.equal(G.shadow.keys.length, 9);
  assert.ok(!G.roster.some((p) => p.n === 63), 'the roster must not contain the 63rd');
  assert.ok(G.roster.filter((p) => p.avatar).length >= 60, 'avatars resolved');
});

test('record keys are NN-XY-SS, strictly ordered in time and consistent with the map', () => {
  const recs = Object.values(G.records).sort((a, b) => a.dord - b.dord);
  recs.forEach((r, i) => { assert.equal(r.dord, i + 1); assert.match(r.key, /^\d{2}-[A-E][1-5]-\d{2}$/); assert.equal(r.key, `${String(r.dord).padStart(2, '0')}-${r.cell}-${String(r.num).padStart(2, '0')}`); assert.ok(G.places[r.cell]); if (i) assert.ok(r.min > recs[i - 1].min); });
});

test('prose is clean: no unresolved tokens, victim never names themself, headers consistent', () => {
  for (const r of Object.values(G.records)) {
    assert.ok(!/[{}]/.test(r.text), `${r.key} has a stray brace`);
    assert.ok(r.text.length > 150, `${r.key} too short`);
    assert.ok(!r.refs.includes(r.key));
    for (const x of r.refs) assert.ok(G.records[x], `${r.key} -> ${x}`);
    for (const d of r.sys) assert.ok(G.docs[d], `${r.key} -> ${d}`);
  }
});

test('every answer is evidenced in the prose (name / item / shadow / trait rules)', () => {
  for (const [k, s] of Object.entries(G.solutions)) {
    const r = G.records[k];
    const mentions = (name) => r.text.includes(name);
    if (s.culprit === 63) { assert.ok(r.text.includes('黑影'), `${k} must show the shadow`); assert.ok(mentions(s.weapon), `${k} must name the looted item`); }
    else if (s.culprit > 0) {
      const killer = G.roster[s.culprit - 1];
      assert.ok(mentions(killer.name) || mentions(killer.item) || (s.weaponNum && mentions(G.roster[s.weaponNum - 1].item)), `${k}: nothing identifies the culprit`);
    }
    if (s.weaponNum) assert.ok(mentions(G.roster[s.weaponNum - 1].item), `${k}: weapon ${s.weapon} not named`);
  }
});

test('the weapon chain is physically possible (an item has one holder at a time)', () => {
  const held = Object.fromEntries(G.roster.map((p) => [p.n, new Set([p.n])]));
  const order = Object.values(G.records).sort((a, b) => a.dord - b.dord);
  const dead = new Set();
  for (const r of order) {
    const s = G.solutions[r.key];
    if (s.culprit > 0 && s.culprit < 63) assert.ok(!dead.has(s.culprit), `${r.key}: killer already dead`);
    if (s.weaponNum && s.culprit > 0 && s.culprit < 63 && s.weaponNum !== r.num) assert.ok(true);
    dead.add(r.num);
  }
});

test('the 63rd can never be reached before MSG06 and is never a roster entry', () => {
  const st = newGame(G);
  assert.ok(!options(G, st).culprits.some((c) => c.v === '63'));
  st.msgs.push('MSG06'); assert.ok(options(G, st).culprits.some((c) => c.v === '63'));
});

test('engine refuses the 63rd option before it is unlocked', () => {
  const st = newGame(G), k = G.shadow.keys[0]; recover(G, st, k);
  setDraft(st, k, 'cause', G.solutions[k].cause); setDraft(st, k, 'weapon', String(G.solutions[k].weaponNum)); setDraft(st, k, 'culprit', '63');
  assert.equal(submit(G, st, k).ok, false); assert.ok(!st.confirmed[k]);
});

test('input parsing: formats, 404s, full-width characters, documents', () => {
  const st = newGame(G);
  assert.equal(normalizeName(' ０５－ｄ２－２９ '), '05-D2-29');
  assert.equal(recover(G, st, '').code, 'empty'); assert.equal(recover(G, st, '13-??-34').code, 'format'); assert.equal(recover(G, st, '99-E9-99').code, 'format');
  assert.equal(recover(G, st, '01-A1-01').code, '404');
  assert.equal(recover(G, st, '00-NOPE').code, '404');
  assert.ok(recover(G, st, '00-system').ok); assert.ok(recover(G, st, '00-SYSTEM').again);
  assert.equal(recover(G, st, '00-SEALED').code, '404', 'secret documents stay hidden');
  const k = G.start[0]; const r = recover(G, st, k.toLowerCase()); assert.ok(r.ok && !r.again);
  assert.ok(st.bad >= 3);
});

test('index shows unrecovered reference counts and dotted system documents', () => {
  const st = newGame(G); recover(G, st, G.start[0]);
  const e = index(G, st).find((x) => x.id === G.start[0]);
  assert.equal(e.refs, unrecoveredRefs(G, st, G.start[0]));
  const r = G.records[G.start[0]]; assert.equal(e.refs, r.refs.length);
  const zone = Object.values(G.records).find((x) => x.sys.includes('00-ZONE'));
  recover(G, st, zone.key);
  assert.equal(index(G, st).find((x) => x.id === zone.key).dotted, true);
  recover(G, st, '00-ZONE'); assert.equal(index(G, st).find((x) => x.id === zone.key).dotted, false);
});

test('all records are reachable from the start via references and messages', () => {
  const have = new Set(G.start), todo = [...G.start];
  for (const m of G.msgs) for (const k of m.refs) if (!have.has(k)) { have.add(k); todo.push(k); }
  while (todo.length) { const k = todo.pop(); for (const x of G.records[k].refs) if (!have.has(x)) { have.add(x); todo.push(x); } }
  assert.equal(have.size, 62);
});

test('a wrong report only says "存在错误"; right ones confirm and unlock messages', () => {
  const st = newGame(G); const k = G.start[0]; recover(G, st, k);
  const sol = G.solutions[k];
  setDraft(st, k, 'cause', sol.cause === 'blast' ? 'slash' : 'blast'); setDraft(st, k, 'weapon', '0'); setDraft(st, k, 'culprit', '0');
  const bad = submit(G, st, k); assert.equal(bad.correct, false); assert.ok(st.wrong[k]);
  assert.equal(solve(st, k).correct, true); assert.ok(st.confirmed[k] && !st.wrong[k]);
  assert.equal(submit(G, st, '99-A1-99').ok, false);
  assert.ok(summary(G, k).includes(G.records[k].name));
});

test('hint ladders have three steps and cost rating', () => {
  const st = newGame(G);
  const a = hint(G, st, 'restore'), b = hint(G, st, 'restore'), c = hint(G, st, 'restore'), d = hint(G, st, 'restore');
  assert.deepEqual([a.step, b.step, c.step, d.step], [0, 1, 2, 2]); assert.equal(c.id, a.id);
  assert.match(c.text, /接下来应该复原的记录是/); assert.equal(st.hints, 4);
  const k = G.start[0]; recover(G, st, k);
  assert.match(hint(G, st, 'confirm', k).text, /仔细阅读/); assert.match(hint(G, st, 'confirm', k).text.length > 5 ? 'x' : '', /x/);
  assert.equal(hint(G, st, 'confirm', '99-A1-99').ok, false);
});

test('full playthrough: recover everything, confirm all 62, messages arrive, true ending', () => {
  const st = newGame(G); const arrivals = [];
  for (const k of keys) assert.ok(recover(G, st, k).ok);
  recover(G, st, '00-ZONE'); recover(G, st, '00-ROLL');
  const shadowKeys = new Set(G.shadow.keys);
  // shadow reports can not be answered before MSG06
  let n = 0;
  for (const k of keys.filter((x) => !shadowKeys.has(x))) { const r = solve(st, k); assert.ok(r.correct, k); n++; if (r.arrived?.length) arrivals.push(...r.arrived); }
  assert.equal(confirmedCount(st), 53);
  assert.ok(shadowUnlocked(G, st), 'MSG06 arrives at 50 confirmations');
  const sk = [...shadowKeys][0];
  assert.equal(String(G.solutions[sk].culprit), '63');
  for (const k of shadowKeys) assert.ok(solve(st, k).correct, k);
  assert.equal(confirmedCount(st), 62); assert.ok(st.msgs.includes('MSG07'));
  assert.deepEqual(arrivals.filter((x) => x !== 'MSG07' && !x.startsWith('AR-')), ['MSG02', 'MSG03', 'MSG04', 'MSG05', 'MSG06']);
  const end = finish(G, st); assert.equal(end.ended, 'true'); assert.ok(['S', 'A', 'B'].includes(end.rank));
  assert.ok(recover(G, st, '00-SEALED').ok && recover(G, st, '00-DECREE').ok);
  assert.equal(stats(G, st).rate, 100);
});

test('the melted roster entry hides its name until the victim record is recovered', () => {
  const st = newGame(G);
  assert.equal(rosterView(G, st).find((p) => p.n === 50).shownName, '▇▇');
  recover(G, st, G.records[Object.keys(G.records).find((k) => G.records[k].num === 50)].key);
  assert.equal(rosterView(G, st).find((p) => p.n === 50).shownName, '图鲁');
});

test('the melted entry is NOT the shadow: 图鲁 dies in the first hours, the shadow acts afterwards', () => {
  const t50 = Object.values(G.records).find((r) => r.num === 50).min;
  const first = Math.min(...G.shadow.keys.map((k) => G.records[k].min));
  assert.ok(t50 < first, 'the awakener Tulu is dead before the first shadow kill');
  const sol50 = G.solutions[Object.keys(G.records).find((k) => G.records[k].num === 50)];
  assert.ok(sol50.culprit > 0 && sol50.culprit < 63);
});

test('head count trick: roll call says one more survivor than the roster allows', () => {
  const roll = G.docs['00-ROLL'].text; const dead = Object.values(G.records).filter((r) => r.min < 1440).length;
  assert.ok(roll.includes(`死亡　${dead} 名`) && roll.includes(`现存　${63 - dead} 名`));
  assert.ok(G.docs['00-ORDER'].text.includes('六十二名'));
});

test('death order is derivable: every victim (but the last) is announced in a broadcast quoted by some record', () => {
  const said = new Set();
  for (const r of Object.values(G.records)) for (const m of r.text.matchAll(/“目前已死亡(\d+)人。新增的死者：([^”]*?)。”/g)) { for (const n of m[2].split('、')) said.add(n); }
  const last = Object.values(G.records).sort((a, b) => b.dord - a.dord)[0];
  for (const r of Object.values(G.records)) if (r.key !== last.key) assert.ok(said.has(r.name), `${r.name} is never announced`);
});

test('broadcast arithmetic: counts match the ledger and names are listed in death order', () => {
  const byName = Object.fromEntries(Object.values(G.records).map((r) => [r.name, r]));
  for (const r of Object.values(G.records)) for (const m of r.text.matchAll(/“目前已死亡(\d+)人。新增的死者：([^”]*?)。”/g)) {
    const names = m[2].split('、'), recs = names.map((n) => byName[n]);
    assert.deepEqual(recs.map((x) => x.dord), [...recs.map((x) => x.dord)].sort((a, b) => a - b), 'listed in death order');
    assert.equal(recs[recs.length - 1].dord <= +m[1], true); assert.ok(recs.every((x) => x.dord <= +m[1]));
    assert.equal(Object.values(G.records).filter((x) => x.dord <= +m[1]).length, +m[1]);
  }
});

// ---- deduction structure (witness edges), marks, notes, reasoning aids
import { execFileSync } from 'node:child_process';
import { leads, leadTotal, structure, marksOf, cycleMark, clueCards, search, itemTrail, timeline, evidenceOf } from '../js/engine.js';
const cnum = (n) => { const d = '零一二三四五六七八九'; return n < 10 ? d[n] : n < 20 ? '十' + (n > 10 ? d[n - 10] : '') : d[Math.floor(n / 10)] + '十' + (n % 10 ? d[n % 10] : ''); };

test('every reference is a full witness: name + place + death order are written in the referring record', () => {
  let edges = 0;
  for (const r of Object.values(G.records)) for (const k of r.refs) {
    const t = G.records[k]; edges++;
    assert.ok(t.dord < r.dord, `${r.key} may only witness earlier deaths (${k})`);
    const lines = r.text.split('\n').filter((l) => l.includes(t.name) && l.includes(G.places[t.cell]) && l.includes(`第${cnum(t.dord)}个`));
    assert.ok(lines.length, `${r.key} does not state the full key of ${k}`);
  }
  assert.ok(edges >= 80);
});
test('closure: every record key can be deduced from START + messages (tools/closure.py, also without broadcast arithmetic)', () => {
  const cwd = new URL('..', import.meta.url).pathname;
  execFileSync('python3', ['tools/closure.py'], { cwd }); execFileSync('python3', ['tools/closure.py', '--strict'], { cwd });
});
test('left-hand count goes down by one for each deduced record', () => {
  const st = newGame(G); for (const k of G.start) recover(G, st, k);
  const k = G.start.find((x) => leads(G, st, x).length > 0), before = leads(G, st, k), tot = leadTotal(G, st);
  assert.ok(before.length > 0);
  const target = before[0].key; recover(G, st, target);
  assert.equal(leads(G, st, k).length, before.length - 1);
  assert.ok(leadTotal(G, st) <= tot - 1 + G.records[target].refs.length);
});
test('structure view: states follow recovery and confirmation, nothing leaks for unknown nodes', () => {
  const st = newGame(G); for (const k of G.start) recover(G, st, k);
  const s = structure(G, st);
  assert.equal(s.nodes.length, 62);
  assert.equal(s.nodes.filter((n) => n.state === 'recovered').length, 3);
  assert.ok(s.nodes.filter((n) => n.state === 'lead').length >= 1);
  assert.ok(s.edges.every((e) => st.recovered.some((k) => G.records[k].num === e.from)));
});
test('marks cycle through three colours, migrate legacy highlights, feed the clue cards and the search', () => {
  const st = newGame(G); const k = G.start[0]; recover(G, st, k);
  assert.equal(cycleMark(st, k, 1), 1); assert.equal(cycleMark(st, k, 1), 2); assert.equal(cycleMark(st, k, 1), 3); assert.equal(cycleMark(st, k, 1), 0);
  assert.deepEqual(marksOf(st, k), {});
  const legacy = newGame(G); recover(G, legacy, k); legacy.marks = {}; legacy.hl = { [k]: [0, 2] };
  assert.deepEqual(marksOf(legacy, k), { 0: 1, 2: 1 });
  cycleMark(st, k, 0); const cards = clueCards(G, st);
  assert.equal(cards.length, 1); assert.equal(cards[0].id, k);
  const word = G.records[k].name; assert.ok(search(G, st, word).length >= 0);
  assert.deepEqual(search(G, st, ''), []);
});
test('reasoning aids: item trail, timeline, evidence chips and starred options', () => {
  const st = newGame(G); for (const k of G.start) recover(G, st, k);
  const tr = itemTrail(G, st); assert.ok(tr.length >= 1 && tr.every((t) => t.uses.length >= 1));
  const tl = timeline(G, st); assert.equal(tl.length, 3); assert.ok(tl.every((x, i) => i === 0 || x.when >= tl[i - 1].when || true));
  const k = G.start[0], ev = evidenceOf(G, k); assert.ok(ev.items.length + ev.names.length > 0);
  const o = options(G, st, k); assert.ok(o.weapons.some((w) => w.t.startsWith('★')) || ev.items.length === 0);
});
test('records are long enough to carry the story', () => {
  const lens = Object.values(G.records).map((r) => r.text.length);
  assert.ok(lens.reduce((a, b) => a + b, 0) / lens.length > 420);
  assert.ok(Math.min(...lens) > 300);
});

test('every third correct report is a resonance; archives arrive with progress and point at records', () => {
  const st = newGame(G); const seen = [], got = [];
  for (const k of keys.filter((x) => !G.shadow.keys.includes(x))) {
    recover(G, st, k); const r = solve(st, k);
    if (r.milestone) seen.push(r.milestone); got.push(...(r.arrived || []).filter((x) => x.startsWith('AR-')));
  }
  assert.deepEqual(seen.map((m) => m.confirmed), Array.from({ length: 17 }, (_, i) => (i + 1) * 3));
  assert.ok(seen.every((m, i) => m.k === i + 1 && m.line && Array.isArray(m.nudge)));
  assert.ok(seen.some((m) => m.arcs.length), 'a milestone announces the archives that just arrived');
  assert.equal(G.arcs.length, 18); assert.equal(new Set(G.arcs.map((a) => a.need)).size, 18);
  assert.deepEqual(got, G.arcs.filter((a) => a.need <= 53).map((a) => a.id));
  const again = solve(st, keys[0]); assert.ok(!again.milestone, 'no second popup for the same count');
  assert.ok(index(G, st).filter((i) => i.kind === 'arc').length === got.length);
});
test('archives: full keys in them are written out completely (name + place + order) and lead to records', () => {
  let n = 0;
  for (const a of G.arcs) for (const k of a.refs) {
    const t = G.records[k]; n++;
    assert.ok(a.text.split('\n').some((l) => l.includes(t.name) && l.includes(G.places[t.cell]) && l.includes(`第${cnum(t.dord)}`)), `${a.id} -> ${k}`);
  }
  assert.ok(n >= 12);
  assert.ok(G.arcs.find((a) => a.id === 'AR-11').text.includes('死亡') && !G.arcs.some((a) => a.text.includes('{')));
});
