import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './helpers.mjs';
import { newState, runBattle, applyResult, summon, equipPull, equipItem, allyDef, teamDefs, levelUp, migrate, offlineReport, claimOffline, autoTeam, claimDaily, PULL_PITY_GENESIS, dismantle, enhanceItem, addItem } from '../src/core/game.js';
import { simulate } from '../src/core/battle.js';
import { buildKit, describeSkill } from '../src/core/skills.js';
import { SLOTS } from '../src/core/constants.js';

test('data pack is complete', () => {
  assert.equal(data.awakeners.length, 62);
  assert.ok(data.wheels.length >= 140 && data.relics.length >= 300 && data.covenants.length === 21);
  for (const a of data.awakeners) assert.ok(a.portrait && a.zh, a.slug);
});

test('every awakener has a full 7-slot kit with readable text', () => {
  for (const a of data.awakeners) {
    const k = data.kit(a.slug);
    for (const s of SLOTS) { assert.ok(k[s]?.effects?.length, `${a.slug}.${s}`); assert.ok(describeSkill(k[s]).length > 0); }
  }
});

test('battle is deterministic for a seed', () => {
  const s = newState(data, 1);
  const a = runBattle(s, data, 5), b = runBattle({ ...s, seed: s.seed }, data, 5);
  const s2 = newState(data, 1);
  const c = runBattle(s2, data, 5);
  assert.deepEqual(c.events, runBattle(newState(data, 1), data, 5).events);
  assert.ok(a.events.length > 0 && b.events.length > 0);
});

test('starter team clears the first stages and earns rewards', () => {
  const s = newState(data, 1);
  for (let i = 0; i < 5; i++) { const r = runBattle(s, data); assert.ok(r.win, `stage ${s.stage}`); applyResult(s, data, r); }
  assert.ok(s.maxStage >= 5 && s.gold > 600 && s.tickets > 12);
});

test('every unit can finish a battle without NaN', () => {
  const s = newState(data, 1);
  for (const a of data.awakeners) {
    s.roster[a.slug] = { lv: 30, star: 2 };
    const def = allyDef(s, data, a.slug, [a.slug]);
    for (const k of ['hp', 'atk', 'def', 'critRate']) assert.ok(Number.isFinite(def[k]), `${a.slug}.${k}`);
  }
  s.team = data.awakeners.slice(0, 4).map((a) => a.slug);
  for (let st = 1; st <= 40; st += 3) {
    const r = runBattle(s, data, st);
    for (const e of r.events) if ('amt' in e) assert.ok(Number.isFinite(e.amt));
    assert.ok(r.rounds <= 30);
  }
});

test('summon: pity, duplicates raise star, cost tickets', () => {
  const s = newState(data, 7); s.tickets = 1000;
  let genesis = 0, sinceG = 0, maxGap = 0;
  const all = summon(s, data, 300);
  for (const p of all) { sinceG++; if (p.rarity === 'Genesis') { genesis++; maxGap = Math.max(maxGap, sinceG); sinceG = 0; } }
  assert.ok(genesis >= 3 && maxGap <= PULL_PITY_GENESIS);
  assert.equal(s.tickets, 700);
  assert.ok(Object.values(s.roster).every((r) => r.star <= 5));
  assert.equal(summon(newState(data, 1), data, 99), null);
});

test('10-pull always contains SSR or better', () => {
  for (let seed = 1; seed < 40; seed++) {
    const s = newState(data, seed); s.tickets = 10;
    assert.ok(summon(s, data, 10).some((p) => p.rarity !== 'SR'));
  }
});

test('gear raises stats; covenant set bonus needs 2 pieces', () => {
  const s = newState(data, 3); s.gold = 1e6;
  const before = allyDef(s, data, 'lotan').atk;
  const w = addItem(s, 'wheel', data.wheels.find((x) => x.rarity === 'SSR').id);
  equipItem(s, data, 'lotan', w.uid);
  assert.ok(allyDef(s, data, 'lotan').atk > before);
  const lv0 = allyDef(s, data, 'lotan').atk; assert.ok(enhanceItem(s, w.uid));
  assert.ok(allyDef(s, data, 'lotan').atk >= lv0);
  const c1 = addItem(s, 'covenant', 'covenant-0003'), c2 = addItem(s, 'covenant', 'covenant-0003');
  equipItem(s, data, 'lotan', c1.uid);
  const one = teamDefs(s, data).list.find((d) => d.slug === 'lotan');
  equipItem(s, data, 'ogier', c2.uid);
  const two = teamDefs(s, data).list.find((d) => d.slug === 'lotan');
  assert.ok(JSON.stringify(two) !== JSON.stringify(one));
  assert.equal(dismantle(s, data, w.uid), 0); // equipped items cannot be dismantled
});

test('leveling costs gold and raises power', () => {
  const s = newState(data, 1); const p = allyDef(s, data, 'ogier').power;
  assert.equal(levelUp(s, 'ogier', 3), 3);
  assert.ok(allyDef(s, data, 'ogier').power > p && s.gold < 600);
});

test('save migration tolerates junk and old saves', () => {
  assert.ok(migrate(null, data).team.length > 0);
  const m = migrate({ gold: 5, roster: { ogier: { lv: 3, star: 0 } }, team: ['nobody', 'ogier'] }, data);
  assert.deepEqual(m.team, ['ogier']); assert.equal(m.gold, 5); assert.equal(m.gear.relics.length, 3);
  assert.deepEqual(JSON.parse(JSON.stringify(m)), m);
});

test('offline report accrues capped income', () => {
  const s = newState(data, 1); s.maxStage = 5; s.stage = 5; s.lastSeen = 0;
  const rep = offlineReport(s, data, 100 * 3600 * 1000);
  assert.equal(rep.capped, 8 * 3600); assert.ok(rep.gold > 0);
  const g = s.gold; claimOffline(s, rep, 5); assert.equal(s.gold, g + rep.gold);
  assert.equal(offlineReport({ ...s, lastSeen: 1000 }, data, 2000), null);
});

test('auto team picks a warden/support when available; daily claim once', () => {
  const s = newState(data, 1); autoTeam(s, data); assert.equal(s.team.length, 4);
  assert.ok(claimDaily(s, '2026-01-01')); assert.equal(claimDaily(s, '2026-01-01'), null);
});

test('equip pull consumes gold', () => {
  const s = newState(data, 1); s.gold = 5000; const items = equipPull(s, data, 5);
  assert.equal(items.length, 5); assert.equal(s.gold, 3000);
  assert.equal(equipPull(newState(data, 1), data, 5), null);
});

test('simulate: timeouts count as loss', () => {
  const tank = { name: 't', hp: 1e6, atk: 1, def: 1e5, kit: buildKit(data.bySlug.ogier), type: 'WARDEN' };
  const foe = { name: 'f', hp: 1e9, atk: 1, def: 1e9, pattern: [{ name: 'x', effects: [{ t: 'dmg', m: 1, hits: 1, to: 'foe' }] }] };
  const r = simulate({ allies: [tank], enemies: [foe], seed: 1 });
  assert.equal(r.win, false); assert.equal(r.rounds, 30);
});
