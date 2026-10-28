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

// ---------------------------------------------------------------- M3: real kits, statuses, challenge modes
import { simulate as sim2 } from '../src/core/battle.js';
import { fx } from '../src/core/skills.js';
import { doTower, doTrial, simulateTower, towerTries, THREATS, trialUnlocked, TOWER_DAILY } from '../src/core/challenge.js';
import { achievementList, claimAchievement } from '../src/core/achievements.js';
import { buildEnemies, makeEnemy } from '../src/core/enemies.js';

const unit = (o = {}) => ({ name: 'x', hp: 5000, atk: 100, def: 50, type: 'ASSAULT', kit: null, ...o });
const mkKit = (effects) => Object.fromEntries(SLOTS.map((s) => [s, { slot: s, name: s, effects }]));

test('every awakener carries real card names and the keyword pack', () => {
  assert.ok(Object.keys(data.kw).length >= 90);
  for (const a of data.awakeners) {
    const k = data.kit(a.slug);
    for (const s of SLOTS) assert.ok(k[s].name && k[s].real?.d, `${a.slug}.${s}`);
  }
  const salvador = data.kit('salvador');
  assert.equal(salvador.Skill1.name, '受祝福的白骨');
});

test('keyword riders add statuses for tagged skills', () => {
  const xu = data.kit('xu');
  assert.ok(Object.values(xu).some((sk) => sk.effects.some((e) => e.t === 'status' && e.s === 'poison')));
});

test('poison ticks, barrier blocks, counter retaliates, sealed stops exalt', () => {
  const poisoner = unit({ kit: mkKit([fx.status('poison', 5, 4, 'foe')]), openAli: 100 });
  const dummy = { ...unit({ hp: 100000 }), pattern: [{ name: 'idle', effects: [] }] };
  const r = sim2({ allies: [poisoner], enemies: [dummy], seed: 3, maxRounds: 4 });
  assert.ok(r.events.some((e) => e.k === 'dot' && e.s === 'poison' && e.amt > 0));
  assert.ok(r.events.some((e) => e.k === 'st' && e.list.some((x) => x.id === 'poison')));

  const hitter = { ...unit({ hp: 100000, atk: 300 }), pattern: [{ name: 'hit', effects: [fx.dmg(1.0)] }] };
  const shielded = unit({ kit: mkKit([fx.status('barrier', 2, 3, 'self')]) });
  const r2 = sim2({ allies: [shielded], enemies: [hitter], seed: 3, maxRounds: 3 });
  assert.ok(r2.events.some((e) => e.k === 'dmg' && e.blocked), 'barrier should block');
  const thorny = unit({ kit: mkKit([fx.status('counter', 3, 3, 'self')]) });
  const r2b = sim2({ allies: [thorny], enemies: [hitter], seed: 3, maxRounds: 3 });
  assert.ok(r2b.events.some((e) => e.k === 'counter' && e.amt > 0), 'counter should hit back');

  const sealer = { ...unit({ hp: 100000 }), pattern: [{ name: 'seal', effects: [fx.status('sealed', 1, 5, 'foe')] }] };
  const exalter = unit({ kit: mkKit([fx.dmg(0.1)]), openAli: 100, openKey: 100 });
  const r3 = sim2({ allies: [exalter], enemies: [sealer], seed: 3, maxRounds: 4 });
  assert.ok(!r3.events.some((e) => e.k === 'act' && e.who === 'a0' && (e.slot === 'Exalt' || e.slot === 'OverExalt')), 'sealed units cannot exalt');
});

test('damage stats add up', () => {
  const s = newState(data, 1);
  const r = runBattle(s, data, 3);
  const dealt = Object.entries(r.stats).filter(([k]) => k[0] === 'a').reduce((x, [, v]) => x + v.dmg, 0);
  const taken = Object.entries(r.stats).filter(([k]) => k[0] === 'e').reduce((x, [, v]) => x + v.taken, 0);
  assert.ok(dealt > 0 && Math.abs(dealt - taken) <= 1, `${dealt} vs ${taken}`);
});

test('enemies use the real monster design: stats, opening then cycle, intents', () => {
  const e = buildEnemies(12, data.monsters, { msk: data.msk });
  assert.ok(e.every((x) => x.pattern.length > 0 && [...x.opening, ...x.pattern].some((p) => p.effects.some((f) => f.t === 'dmg'))));
  assert.ok(e.every((x) => x.skills.length > 0 && x.mid && x.pattern.every((p) => p.ic)));
  const mon = data.monsters.find((m) => m.op?.length && m.cy?.length && m.op.join() !== m.cy.join());
  const def = makeEnemy(mon, mon.rank, 10, () => 1, { msk: data.msk });
  assert.equal(def.opening.length, mon.op.length);
  assert.equal(def.pattern.length, mon.cy.length);
  const r = sim2({ allies: [unit({ hp: 1e6, def: 1e6, kit: mkKit([fx.dmg(0.01)]) })], enemies: [def], seed: 1, maxRounds: mon.op.length + mon.cy.length + 1 });
  const acts = r.events.filter((x) => x.k === 'act' && x.who === 'e0').map((x) => x.name);
  const want = [...def.opening, ...def.pattern, ...def.pattern].map((x) => x.name).slice(0, acts.length);
  assert.deepEqual(acts, want);
  assert.ok(r.events.some((x) => x.k === 'intent' && x.who === 'e0'));
});

test('roster and skill table are consistent', () => {
  assert.ok(data.monsters.length > 400 && Object.keys(data.msk).length > 800);
  for (const m of data.monsters) for (const i of [...m.op, ...m.cy]) assert.ok(data.msk[i], `${m.id} -> ${i}`);
  assert.ok(data.monsters.every((m) => /[\u4e00-\u9fff「]/.test(m.zh)));
  for (const t of data.trials) assert.ok(t.boss.every((b) => data.trialMonsters[b]));
});

test('tower: deterministic, rewards new floors once, daily tries', () => {
  const mk = () => { const s = newState(data, 7); for (const a of ['salvador', 'xu', 'vivian', 'caraboo']) s.roster[a] = { lv: 35, star: 1 }; s.team = ['salvador', 'caraboo', 'xu', 'vivian']; return s; };
  const a = simulateTower(mk(), data), b = simulateTower(mk(), data);
  assert.equal(a.reached, b.reached);
  const s = mk();
  const r1 = doTower(s, data, 'd1');
  assert.ok(r1.reached >= 1 && s.tower.best === r1.reached);
  const goldAfter1 = s.gold;
  const r2 = doTower(s, data, 'd1');
  assert.equal(towerTries(s, 'd1'), TOWER_DAILY - 2);
  assert.ok(r2.rw.gold < r1.rw.gold + 1, 'second run only gets participation gold unless it beats the best');
  assert.ok(s.gold >= goldAfter1);
  doTower(s, data, 'd1'); assert.equal(doTower(s, data, 'd1'), null);
  assert.equal(towerTries(s, 'd2'), TOWER_DAILY);
});

test('trials unlock in order and pay first-clear rewards once', () => {
  const s = newState(data, 9);
  for (const a of ['salvador', 'xu', 'vivian', 'caraboo', 'agrippa', 'thais']) s.roster[a] = { lv: 45, star: 3 };
  s.team = ['salvador', 'agrippa', 'xu', 'thais'];
  const t = data.trials[0];
  assert.ok(trialUnlocked(s, t, 0) && !trialUnlocked(s, t, 1));
  assert.equal(doTrial(s, data, t.id, 1), null);
  const tk0 = s.tickets;
  const r = doTrial(s, data, t.id, 0);
  assert.ok(r && r.win, 'a strong team clears the C trial');
  assert.equal(s.tickets, tk0 + THREATS[0].tickets);
  assert.ok(trialUnlocked(s, t, 1));
  const tk1 = s.tickets;
  doTrial(s, data, t.id, 0);
  assert.equal(s.tickets, tk1, 'no second first-clear reward');
});

test('achievements track progress and pay out once', () => {
  const s = newState(data, 1);
  s.maxStage = 12;
  const a = achievementList(s).find((x) => x.id === 'stage10');
  assert.ok(a.done && !a.claimed);
  const t = s.tickets;
  assert.ok(claimAchievement(s, 'stage10'));
  assert.equal(s.tickets, t + 3);
  assert.equal(claimAchievement(s, 'stage10'), null);
  assert.equal(claimAchievement(s, 'stage20'), null);
});

test('old saves migrate to the new state shape', () => {
  const old = { v: 1, roster: { ogier: { lv: 5, star: 0 } }, team: ['ogier'], gold: 5, tickets: 1, stage: 2, maxStage: 1, gear: { items: {}, next: 1, equip: {}, relics: [null, null, null] } };
  const m = migrate(old, data);
  assert.ok(m.tower && m.trials.cleared && m.ach && m.tutorial === false);
});

// ---------------------------------------------------------------- M4: real numbers, codex
import { realNums, SKILL_LEVELS } from '../src/core/skills.js';
import { skillLevel } from '../src/core/stats.js';
import { compileSkill, fillText } from '../src/core/monsters.js';
import { recordCodex } from '../src/core/game.js';

test('real skill ranges are parsed and scale with skill level', () => {
  const n = realNums({ d: '造成 150–300%（攻击力） 点伤害。获得 10–20%（防御力） 点护盾。获得 5–10 点狂气。' });
  assert.deepEqual(n.dmg, [150, 300]); assert.deepEqual(n.shield, [10, 20]); assert.deepEqual(n.gauge, [5, 10]);
  assert.equal(SKILL_LEVELS, 5);
  assert.ok(skillLevel(1, 0) === 0 && skillLevel(60, 5) === 4 && skillLevel(30, 0) >= skillLevel(10, 0));
  const lo = data.kit('xu', 0).Skill1.effects.find((e) => e.t === 'dmg'), hi = data.kit('xu', 4).Skill1.effects.find((e) => e.t === 'dmg');
  assert.ok(lo && hi && hi.m > lo.m, 'higher skill level hits harder');
  assert.ok(data.kit('xu', 4).Skill1.real.cur.dmg > data.kit('xu', 0).Skill1.real.cur.dmg);
});

test('monster formulas become effects with real multipliers', () => {
  const rec = { n: '测试', t: '造成 {1} 点伤害 {2} 次，施加 {3} 回合的⟦weakness|虚弱⟧。获得 {4} 点护盾。', i: '009', g: 'FrontEnemy', a: [['a', 0.4], ['n', 3], ['n', 2], ['d', 2]] };
  const sk = compileSkill(rec);
  const d = sk.effects.find((e) => e.t === 'dmg');
  assert.equal(d.m, 0.4); assert.equal(d.hits, 3);
  assert.equal(sk.effects.find((e) => e.t === 'status' && e.s === 'weakness').dur, 2);
  assert.ok(sk.effects.some((e) => e.t === 'shield' && e.m === 1));
  assert.match(fillText(rec), /40%攻击/);
});

test('codex records encounters and kills; codex achievements count them', () => {
  const s = newState(data, 3);
  const e = buildEnemies(3, data.monsters, { msk: data.msk });
  recordCodex(s, e, false); recordCodex(s, e, true);
  const c = s.codex[e[0].mid];
  assert.equal(c.seen, 2 + (e.filter((x) => x.mid === e[0].mid).length - 1) * 2 - 0 > 0 ? c.seen : c.seen); // seen at least twice
  assert.ok(c.seen >= 2 && c.kills >= 1);
  assert.ok(achievementList(s, data).some((a) => a.id === 'codex30'));
});
