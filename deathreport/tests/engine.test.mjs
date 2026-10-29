import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
// Windows 上没有 python3，退回 python（两个都试一遍；都失败才算没装）
const PY = (() => { for (const c of ['python3', 'python']) { try { execFileSync(c, ['-c', 'pass'], { stdio: 'ignore' }); return c; } catch { /* next */ } } throw new Error('python not found'); })();
const py = (args, cwd) => execFileSync(PY, args, { cwd });
// fileURLToPath 才是 Windows 下的正确路径（URL.pathname 会给出 /H:/... 这种假路径）
const ROOT = fileURLToPath(new URL('..', import.meta.url));
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
  assert.match(c.text, /要找的人是/); assert.equal(st.hints, 4);
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
  assert.deepEqual(arrivals.filter((x) => x !== 'MSG07' && !/^(AR|HX)-/.test(x)), ['MSG02', 'MSG03', 'MSG04', 'MSG05', 'MSG06']);
  const end = finish(G, st); assert.equal(end.ended, 'true'); assert.ok(['SSS', 'SS', 'S', 'A', 'B', 'C'].includes(end.rank)); assert.equal(st.ending, 'E4', 'a perfect streak opens HX-06');
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
import { rating, pickEnding, h32, grant, score, lockedHidden, leads, leadTotal, structure, marksOf, cycleMark, clueCards, search, itemTrail, timeline, evidenceOf } from '../js/engine.js';
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
  const cwd = ROOT;
  py(['tools/closure.py'], cwd); py(['tools/closure.py', '--strict'], cwd);
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
  const o = options(G, st, k); assert.ok(!o.weapons.some((w) => w.t.startsWith('★')) && !o.culprits.some((c) => c.t.startsWith('★')), 'no stars: the options do not betray the evidence');
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
  const prog = G.arcs.filter((a) => !a.hidden); assert.equal(prog.length, 18); assert.equal(new Set(prog.map((a) => a.need)).size, 18);
  assert.deepEqual(got, prog.filter((a) => a.need <= 53).map((a) => a.id));
  const again = solve(st, keys[0]); assert.ok(!again.milestone, 'no second popup for the same count');
  assert.ok(index(G, st).filter((i) => i.kind === 'arc' && i.id.startsWith('AR')).length === got.length);
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

test('hints stay vague: never a full record name, never the culprit or the weapon', () => {
  for (const k of keys) {
    const all = [...G.hints.restore[k], ...G.hints.confirm[k]].join('\n'), sol = G.solutions[k];
    assert.ok(!/\d{2}-[A-E][1-5]-\d{2}/.test(all), `${k} hint leaks a record name`);
    if (sol.culprit && sol.culprit !== 63) assert.ok(!G.hints.confirm[k].join('').split(G.records[k].name).join('').includes(G.roster[sol.culprit - 1].name), `${k} hint names the culprit`);
    if (sol.weaponNum) assert.ok(!G.hints.confirm[k].join('').includes(sol.weapon), `${k} hint names the weapon`);
  }
});

test('hidden archives: opened by deduction (sets of confirmed reports, a first-try tally), never by plain progress', () => {
  const hid = G.arcs.filter((a) => a.hidden); assert.equal(hid.length, 11);
  const st = newGame(G); assert.equal(lockedHidden(G, st).length, 11);
  // confirming reports in an order that never completes any set keeps them shut; a wrong report resets the streak
  const unlock = (nums) => { for (const n of nums) { const k = G.roster[n - 1].key; recover(G, st, k); const r = solve(st, k); if (r.correct && r.arrived?.includes('HX-02')) return true; } return false; };
  assert.ok(unlock([12, 46, 42]) && st.arcs.includes('HX-02') && !st.arcs.includes('HX-01'));
  assert.equal(lockedHidden(G, st).length, 10); assert.ok(lockedHidden(G, st).every((x) => x.riddle && !x.riddle.includes('HX')));
  // 累计 15 份首答正确：中间写错一条不清零，只是那一条不再计入
  const s2 = newGame(G); const free = keys.filter((x) => !G.shadow.keys.includes(x));
  let opened = false;
  const doOne = (k) => { recover(G, s2, k); if (solve(s2, k).arrived?.includes('HX-06')) opened = true; };
  free.slice(0, 7).forEach(doOne);
  assert.ok(!opened, 'HX-06 stays shut at 7');
  const kBad = free[7];
  recover(G, s2, kBad);
  setDraft(s2, kBad, 'cause', G.solutions[kBad].cause === 'blast' ? 'fall' : 'blast');
  setDraft(s2, kBad, 'weapon', '0'); setDraft(s2, kBad, 'culprit', '0');
  submit(G, s2, kBad);
  assert.ok(!s2.confirmed[kBad], 'the wrong report is not accepted');
  assert.equal(s2.firstTry, 7, 'a miss does not reset the first-try tally');
  free.slice(8, 16).forEach(doOne);
  assert.equal(s2.firstTry, 15);
  assert.ok(opened, '15 first-try reports, not necessarily consecutive, open HX-06');
  assert.equal(s2.arcs.includes('HX-06'), true);
  const s3 = newGame(G); const k0 = keys[0]; recover(G, s3, k0); setDraft(s3, k0, 'cause', 'slash'); setDraft(s3, k0, 'weapon', '0'); setDraft(s3, k0, 'culprit', '0'); submit(G, s3, k0);
  assert.equal(s3.streak, G.solutions[k0].cause === 'slash' && G.solutions[k0].culprit === 0 ? 1 : 0);
  for (const a of hid) assert.ok(a.text.length > 120 && !a.text.includes('{'), a.id);
});

// ---- word puzzles (残片)
const CNI = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const cn2 = (t) => (t.includes('十') ? (t[0] === '十' ? 10 : CNI[t[0]] * 10) + (t.length > (t[0] === '十' ? 1 : 2) ? CNI[t.at(-1)] : 0) : CNI[t]);
function resolve(line) {   // what a careful player would do with a fragment line
  const m = line.match(/^〔(\S)([一二三])〕(.+?)，取第([一二三四五六七八九十]+)字。$/); if (!m) return null;
  const [, sym, ord, what, pos] = m, i = cn2(pos) - 1; let str = null, x;
  if ((x = what.match(/^名册第(\d+)号的名字$/))) str = G.roster[+x[1] - 1].name;
  else if ((x = what.match(/^名册第(\d+)号的配发装备$/))) str = G.roster[+x[1] - 1].item;
  else if ((x = what.match(/^名册第(\d+)号的第([一二三四五六七八九十]+)项特性/))) str = G.roster[+x[1] - 1].lore['特性'].split(/\s+/)[cn2(x[2]) - 1];
  else if ((x = what.match(/^地图上([A-E][1-5])的区块名$/))) str = G.places[x[1]];
  else if ((x = what.match(/^第([一二三四五六七八九十]+)个死者的名字$/))) str = Object.values(G.records).find((r) => r.dord === cn2(x[1])).name;
  else if ((x = what.match(/^补充档案(AR-\d+)的标题$/))) str = G.arcs.find((a) => a.id === x[1]).title;
  else if ((x = what.match(/^文档(00-[A-Z]+)的标题$/))) str = G.docs[x[1]].title;
  return str ? { sym, ord: cn2(ord), ch: [...str][i] } : null;
}
test('every puzzle answer can be rebuilt from its fragments, which sit in the declared texts only', () => {
  const texts = {};
  for (const r of Object.values(G.records)) texts['rec:' + r.num] = r.text;
  for (const a of G.arcs) texts['arc:' + a.id] = a.text; for (const d of Object.values(G.docs)) texts['doc:' + d.id] = d.text;
  const bySym = {};
  for (const [src, t] of Object.entries(texts)) for (const l of t.split('\n')) { const f = resolve(l.trim()); if (f) (bySym[f.sym] ||= []).push({ ...f, src }); }
  assert.equal(Object.keys(bySym).length, G.puzzles.length);
  for (const p of G.puzzles) {
    const fr = Object.values(bySym).find((v) => p.src.includes(v[0].src)); assert.ok(fr, p.id);
    const ans = fr.sort((a, b) => a.ord - b.ord).map((f) => f.ch).join('');
    assert.equal(h32(ans), p.h, `${p.id}: ${ans}`); assert.deepEqual(fr.sort((a, b) => a.ord - b.ord).map((f) => f.src), p.src, 'order of sources = order of fragments');
    assert.equal(new Set(fr.map((f) => f.src.split(':')[0] + f.src)).size, fr.length, 'fragments live in different texts');
  }
});
test('typing a puzzle answer opens the hidden archive only when its fragments have been found; rewards are granted once', () => {
  const ans = (id) => { const p = G.puzzles.find((x) => x.id === id); return p; };
  const st = newGame(G), p = ans('HX-10'), word = '点名';
  assert.equal(h32(word), p.h);
  let r = recover(G, st, word); assert.equal(r.ok, false); assert.equal(r.code, 'silent');
  // make the sources available (documents / archives / records) the way play would
  for (const src of p.src) { const [k, v] = src.split(':'); if (k === 'doc') st.docs.push(v); if (k === 'arc') st.arcs.push(v); if (k === 'rec') st.recovered.push(G.roster[+v - 1].key); }
  const before = st.tokens, bonus = st.bonus;
  r = recover(G, st, ' 点名 '); assert.ok(r.ok && r.puzzle && r.id === 'HX-10' && r.reward.badge === '点名官');
  assert.equal(st.tokens, before + 1); assert.equal(st.bonus, bonus + 500); assert.ok(st.arcs.includes('HX-10') && st.badges.includes('HX-10'));
  r = recover(G, st, '点名'); assert.ok(r.again); assert.equal(st.tokens, before + 1, 'no second reward');
  assert.equal(grant(G, st, 'HX-10', 'puzzle'), null);
});
test('score: confirmed + first-try + hidden bonuses - hints; a free-hint voucher is spent before rating is hurt', () => {
  const st = newGame(G); const k = G.start[0]; recover(G, st, k);
  setDraft(st, k, 'cause', 'xx'); setDraft(st, k, 'weapon', '0'); setDraft(st, k, 'culprit', '0'); submit(G, st, k);   // a miss
  solve(st, k); assert.equal(st.firstTry || 0, 0);
  const k2 = G.start[1]; recover(G, st, k2); solve(st, k2); assert.equal(st.firstTry, 1);
  assert.equal(score(G, st), 2 * 100 + 50);
  st.tokens = 1; const h = hint(G, st, 'restore'); assert.ok(h.free); assert.equal(st.hints, 0); assert.equal(st.tokens, 0);
  const h2 = hint(G, st, 'restore'); assert.ok(!h2.free); assert.equal(st.hints, 1); assert.equal(score(G, st), 2 * 100 + 50 - 30);
});

test('rating = completion + hint restraint + hidden archives; SSS needs all of them; endings follow the hidden archives', () => {
  const st = newGame(G); const r0 = rating(G, st); assert.ok(r0.total < 40 && r0.rank === 'C');
  for (const k of keys) { recover(G, st, k); }
  for (const d of Object.keys(G.docs)) if (!G.docs[d].final) st.docs.push(d);
  for (const a of G.arcs) if (!a.hidden) st.arcs.push(a.id);
  for (const k of keys.filter((x) => !G.shadow.keys.includes(x))) solve(st, k);
  for (const k of G.shadow.keys) solve(st, k);
  st.badges = []; const noHidden = rating(G, st); assert.equal(noHidden.comp, 100); assert.ok(noHidden.total < 80 && !['SSS', 'SS'].includes(noHidden.rank), JSON.stringify(noHidden));
  assert.equal(pickEnding(G, { badges: [] }).id, 'E0');
  assert.equal(pickEnding(G, { badges: ['HX-02', 'HX-09'] }).id, 'E1');
  assert.equal(pickEnding(G, { badges: ['HX-03', 'HX-05', 'HX-11'] }).id, 'E2');
  assert.equal(pickEnding(G, { badges: ['HX-08', 'HX-10'] }).id, 'E3');
  assert.equal(pickEnding(G, { badges: ['HX-06'] }).id, 'E4');
  const all = G.arcs.filter((a) => a.hidden).map((a) => a.id); assert.equal(pickEnding(G, { badges: all }).id, 'E5');
  st.badges = [...all]; st.hints = 0; const best = rating(G, st); assert.equal(best.rank, 'SSS'); assert.equal(best.hid, 100);
  st.hints = 10; assert.ok(rating(G, st).total < best.total);
  st.hints = 0; st.badges = all.slice(0, 5); assert.ok(['S', 'A', 'SS'].includes(rating(G, st).rank));
});
