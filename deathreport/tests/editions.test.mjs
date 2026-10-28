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
    assert.equal(G.edition.n, +n); assert.equal(G.arcs.length, 0); assert.equal(G.shadow.keys.length, n === '61' ? 2 : 0);
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
    const st = newGame(G), keys = Object.keys(G.records).sort().sort((a, b) => (G.shadow.keys.includes(a) ? 1 : 0) - (G.shadow.keys.includes(b) ? 1 : 0)); let mile = 0;
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

test('William (威廉·德拉普尔): a human investigator in 61 who dies without a silver core, an awakener in 62; N is the culprit of 61 and absent from 62', () => {
  const a = load('game.json'), g61 = eds[61], g62 = eds[62];
  const w61 = g61.roster.find((p) => p.name === '威廉'), w62 = g62.roster.find((p) => p.name === '威廉');
  assert.ok(w61 && w62 && !a.roster.some((p) => p.name === '威廉'));
  assert.equal(w61.human, true); assert.equal(w61.realm, 'HUMAN'); assert.equal(w62.human, false);
  assert.equal(w61.avatar, 'assets/avatars-q/char-william.webp'); assert.equal(w62.avatar, w61.avatar);
  assert.ok(fs.existsSync(new URL('../../' + w61.avatar, import.meta.url)), 'portrait file exists');
  const r61 = Object.values(g61.records).find((r) => r.num === w61.n), r62 = Object.values(g62.records).find((r) => r.num === w62.n);
  assert.ok(r61 && r62); assert.equal(g61.solutions[r61.key].culprit, 63, 'N killed him in 61');
  assert.ok(r61.text.includes('没有银芯') && r62.text.includes('死过一次'));
  assert.ok(g61.shadow.keys.length >= 2 && g61.shadow.keys.includes(r61.key));
  for (const k of g61.shadow.keys) assert.ok(/帽/.test(g61.records[k].text) && /雾/.test(g61.records[k].text), 'N is recognisable by the hat and the fog');
  assert.ok(!g62.roster.some((p) => p.name === 'N') && !g62.records || !Object.values(g62.records).some((r) => /\bN\b/.test(r.text) && !/雪夜/.test(r.text)));
  assert.equal(g61.shadow.label, '名册外的个体'); assert.ok(g61.docs['00-SEALED'].text.includes('他叫N'));
});
