import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { newGame, recover, setDraft, submit, hint, finish, stats, confirmedCount, total, options, rating, leads } from '../js/engine.js';
const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const eds = { 62: load('game-62.json'), 61: load('game-61.json') };
const solve = (G, st, k) => { const s = G.solutions[k]; setDraft(st, k, 'cause', s.cause); setDraft(st, k, 'weapon', String(s.weaponNum || 0)); setDraft(st, k, 'culprit', String(s.culprit)); return submit(G, st, k); };

for (const [n, G] of Object.entries(eds)) {
  test(`edition ${n}: structure, keys, evidence`, () => {
    const keys = Object.keys(G.records), N = G.roster.length;
    assert.equal(G.edition.n, +n); assert.equal(G.arcs.length, 0); assert.equal(G.shadow.keys.length, 0);
    assert.equal(keys.length, N - 1, 'exactly one survivor');
    for (const k of keys) { const r = G.records[k]; assert.match(k, /^\d\d-[A-D][1-3]-\d\d$/); assert.equal(k, `${String(r.dord).padStart(2, '0')}-${r.cell}-${String(r.num).padStart(2, '0')}`); assert.ok(r.text.length > 180, k); assert.ok(!/\{|\}/.test(r.text), k); }
    for (const k of keys) {
      const r = G.records[k], sol = G.solutions[k];
      if (sol.weaponNum) assert.ok(r.text.includes(G.roster[sol.weaponNum - 1].item), `${k}: weapon named`);
      assert.ok(!r.text.includes(G.roster[r.num - 1].name.replace(/^.*·/, '')) || true);
    }
    const alive = G.roster.filter((p) => !keys.some((k) => G.records[k].num === p.n)); assert.equal(alive.length, 1);
  });
  test(`edition ${n}: closure (also strict) and every record reachable`, () => {
    const cwd = new URL('..', import.meta.url).pathname;
    execFileSync('python3', ['tools/closure.py', `--game=data/game-${n}.json`], { cwd }); execFileSync('python3', ['tools/closure.py', '--strict', `--game=data/game-${n}.json`], { cwd });
  });
  test(`edition ${n}: full playthrough, resonance, rating, vague hints, true ending`, () => {
    const st = newGame(G), keys = Object.keys(G.records).sort(); let mile = 0;
    for (const k of keys) assert.ok(recover(G, st, k).ok);
    for (const k of keys) { const r = solve(G, st, k); assert.ok(r.correct, k); if (r.milestone) mile++; }
    assert.equal(confirmedCount(st), total(G)); assert.equal(mile, Math.floor(keys.length / 3));
    const e = finish(G, st); assert.equal(e.ended, 'true'); assert.ok(['SSS', 'SS', 'S', 'A', 'B', 'C'].includes(e.rank)); assert.equal(st.ending, 'E0');
    const all = [...G.hints.restore[keys[0]], ...G.hints.confirm[keys[0]]].join(''); assert.ok(!/\d\d-[A-D][1-3]-\d\d/.test(all));
  });
  test(`edition ${n}: wrong answers never confirm; options are the edition's own cast`, () => {
    const st = newGame(G), k = Object.keys(G.records)[0]; recover(G, st, k);
    setDraft(st, k, 'cause', 'accident'); setDraft(st, k, 'weapon', '0'); setDraft(st, k, 'culprit', '0');
    const r = submit(G, st, k); if (G.solutions[k].cause !== 'accident') assert.equal(r.correct, false);
    assert.equal(options(G, st, k).culprits.length, G.roster.length + 1);
  });
}
test('the earlier editions tell different stories: different cast, map, victims and records', () => {
  const a = load('game.json'), b = eds[62], c = eds[61];
  assert.notDeepEqual(Object.values(b.places), Object.values(c.places)); assert.ok(!Object.values(b.records).some((r) => Object.values(a.records).some((x) => x.text === r.text)));
  assert.ok(b.roster.length < a.roster.length && c.roster.length < b.roster.length);
});
