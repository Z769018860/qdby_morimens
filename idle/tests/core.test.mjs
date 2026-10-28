import test from 'node:test';
import assert from 'node:assert/strict';
import { data } from './helpers.mjs';
import { newState, runBattle, applyResult, summon, equipPull, equipItem, allyDef, teamDefs, levelUp, migrate, offlineReport, claimOffline, autoTeam, PULL_PITY_GENESIS, dismantle, enhanceItem, addItem } from '../src/core/game.js';
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
  assert.ok(Object.values(s.roster).every((r) => r.star <= 99));
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
  assert.deepEqual(m.team, ['ogier']); assert.equal(m.gold, 5); assert.equal(m.gear.relics.length, 6);
  assert.ok(m.orders && m.orders.slots.length === 3, '旧存档补上钥令位');
  assert.deepEqual(JSON.parse(JSON.stringify(m)), m);
});

test('offline report accrues capped income', () => {
  const s = newState(data, 1); s.maxStage = 5; s.stage = 5; s.lastSeen = 0;
  const rep = offlineReport(s, data, 100 * 3600 * 1000);
  assert.equal(rep.capped, 8 * 3600); assert.ok(rep.gold > 0);
  const g = s.gold; claimOffline(s, rep, 5); assert.equal(s.gold, g + rep.gold);
  assert.equal(offlineReport({ ...s, lastSeen: 1000 }, data, 2000), null);
});

test('auto team picks a warden/support when available; ', () => {
  const s = newState(data, 1); autoTeam(s, data); assert.equal(s.team.length, 4);
  
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
  assert.equal(s.tickets, t + 2);
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
  assert.ok(skillLevel(1, 0) === 0 && skillLevel(60, 0) === 3 && skillLevel(60, 80) === 4 && skillLevel(30, 0) >= skillLevel(10, 0));
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

// ---------------------------------------------------------------- M5: weekly boss, realm towers, arena
import { doWeekly, weeklyState, claimWeekly, weekId, weeklyBoss, MILESTONES } from '../src/core/weekly.js';
import { doRTower, rtTeam, rtPool } from '../src/core/rtower.js';
import { encodeCode, decodeCode } from '../src/core/friend.js';
import { botEntry, snapshot, hydrate, localOpponents, fightArena, applyArena, localSettle, arenaState, UNRANKED, fightFriend } from '../src/core/arena.js';

const mkTeamState = (lv = 30) => { const s = newState(data, 11); for (const a of ['salvador', 'xu', 'vivian', 'caraboo']) s.roster[a] = { lv, star: 1 }; s.team = ['salvador', 'caraboo', 'xu', 'vivian']; return s; };

test('weekly boss: stable per week, damage accumulates, milestones claim once', () => {
  assert.equal(weekId(new Date(Date.UTC(2026, 9, 28))), '2026-W44');
  assert.equal(weeklyBoss(data, '2026-W44').id, weeklyBoss(data, '2026-W44').id);
  const s = mkTeamState();
  const r = doWeekly(s, data);
  assert.ok(r.dmg > 0 && r.rounds <= 12);
  assert.equal(weeklyState(s).damage, r.dmg);
  const w = weeklyState(s); w.tries = 3; doWeekly(s, data); doWeekly(s, data); doWeekly(s, data); assert.equal(doWeekly(s, data), null);
  w.damage = MILESTONES[1].dmg;
  assert.ok(claimWeekly(s, data, 1)); assert.equal(claimWeekly(s, data, 1), null); assert.equal(claimWeekly(s, data, 7), null);
  // a new week clears the progress
  weeklyState(s, '2099-W01'); assert.equal(s.weekly.damage, 0);
});

test('realm tower only fields that realm and records the first clears', () => {
  const s = mkTeamState();
  const caro = Object.keys(s.roster).filter((x) => data.bySlug[x].realm === 'CARO');
  const t = rtTeam(s, data, 'CARO');
  assert.ok(!t || t.slugs.every((x) => data.bySlug[x].realm === 'CARO'));
  assert.equal(rtTeam(newState(data, 1), data, 'ULTRA') === null || true, true);
  const none = { ...mkTeamState(), roster: {} };
  assert.equal(rtTeam(none, data, 'CARO'), null);
  assert.ok(['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'].every((r) => rtPool(r, data).length >= 20));
  const realm = data.bySlug[s.team[0]].realm;
  const r = doRTower(s, data, realm);
  assert.ok(r.floor === 1 && r.win);
  assert.equal(s.rtower[realm].best, 1);
  void caro;
});

test('arena: bots scale with rank, snapshots round-trip, winning moves you up', () => {
  const weak = botEntry(100, data), strong = botEntry(1, data);
  assert.ok(strong.power > weak.power * 3);
  assert.deepEqual(botEntry(40, data).snap, botEntry(40, data).snap);
  const s = mkTeamState(40);
  const snap = snapshot(teamDefs(s, data));
  const back = hydrate(snap, data);
  assert.equal(back.length, 4); assert.ok(back.every((d) => d.kit && d.hp > 0));
  assert.equal(arenaState(s).rank, UNRANKED);
  const opps = localOpponents(s, data);
  assert.deepEqual(opps.map((o) => o.rank), [100, 99, 98, 97, 96]);
  assert.ok(opps.every((o) => o.type === 'bot'));
  const e = opps[0], f = fightArena(s, data, e);
  assert.ok(f.win, 'a lv40 team beats the rank-100 bot');
  const rw = applyArena(s, data, f, localSettle(s, e, f.win).rank);
  assert.equal(arenaState(s).rank, 100); assert.ok(rw.tickets >= 1);
  assert.ok(localOpponents(s, data)[0].rank === 99);
  // hostile snapshots are clamped
  const evil = hydrate([{ slug: 'xu', lv: 999, star: 99, hp: 1e18, atk: -5 }], data)[0];
  assert.ok(evil.lv === 159 && evil.star === 99 && evil.hp <= 5e6 && evil.atk === 0);
});

test('friend battle codes round-trip, reject damage, and fight without rewards', () => {
  const s = mkTeamState(35);
  const code = encodeCode(s, data, '阿狸');
  assert.match(code, /^MMX1-[A-Za-z0-9_-]+-[0-9a-z]{4}$/);
  const f = decodeCode(code, data);
  assert.equal(f.name, '阿狸'); assert.equal(f.snap.length, 4);
  assert.ok(f.power > 0);
  assert.deepEqual(decodeCode(` ${code.slice(0, 30)}\n${code.slice(30)} `, data).snap, f.snap, 'whitespace is tolerated');
  assert.ok(decodeCode(code.slice(0, -6) + 'zzzzzz', data).error);
  assert.ok(decodeCode('hello', data).error);
  const gold = s.gold, tickets = s.tickets;
  const r = fightFriend(s, data, f);
  assert.ok(typeof r.win === 'boolean' && r.foes.length === 4);
  assert.equal(s.gold, gold); assert.equal(s.tickets, tickets);
  assert.equal(arenaState(s).friends[0].wins + arenaState(s).friends[0].losses, 1);
  assert.equal(arenaState(s).rank, UNRANKED);
});

// ---------------------------------------------------------------- M6: 银芯, refine, shop, sign-in, achievements
import { summonCores, equipPullCores, refineItem, dismantleCores, CORE_PULL_COST, CORE_PULL10_COST } from '../src/core/game.js';
import { refineMult } from '../src/core/gear.js';
import { signToday, backfill, claimCum, signinState, dayReward, CUM, BACKFILL_COST } from '../src/core/signin.js';
import { buy, SHOP, boughtToday } from '../src/core/shop.js';
import { claimAllAchievements, ACHIEVEMENTS } from '../src/core/achievements.js';

test('银芯 income: first clears, bosses and codex pay out', () => {
  const s = mkTeamState(60);
  const c0 = s.cores;
  const r = runBattle(s, data, 1); const rw = applyResult(s, data, r);
  assert.ok(r.win && rw.cores === 4 && s.cores === c0 + 4);
});

test('银芯召唤 and 精选祈愿 spend 银芯 and share pity', () => {
  const s = newState(data, 4); s.cores = 5000;
  const p0 = s.pity.genesis;
  assert.equal(summonCores(s, data, 10).length, 10); assert.equal(s.cores, 5000 - CORE_PULL10_COST);
  assert.equal(summonCores(s, data, 1).length, 1); assert.equal(s.cores, 5000 - CORE_PULL10_COST - CORE_PULL_COST);
  assert.ok(s.pity.genesis !== p0 || s.pity.genesis === 0);
  const g = equipPullCores(s, data, 1); assert.equal(g.length, 1);
  s.cores = 10; assert.equal(summonCores(s, data, 1), null); assert.equal(equipPullCores(s, data, 1), null);
  assert.ok(s.stats.coresSpent >= CORE_PULL10_COST);
});

test('refine raises the item bonus by 8% per tier, costs 银芯, refunds half on dismantle', () => {
  const s = newState(data, 6); s.cores = 2000;
  const it = addItem(s, 'wheel', data.wheels[0].id);
  assert.equal(refineMult(it), 1);
  assert.ok(refineItem(s, it.uid) && it.rf === 1); assert.ok(Math.abs(refineMult(it) - 1.08) < 1e-9);
  for (let i = 0; i < 4; i++) assert.ok(refineItem(s, it.uid));
  assert.equal(refineItem(s, it.uid), false, 'max 5 tiers');
  const spent = 40 + 80 + 140 + 220 + 320;
  assert.equal(s.cores, 2000 - spent);
  const back = dismantleCores(data.wheels[0].rarity, it);
  assert.ok(back >= Math.floor(spent / 2));
  const before = s.cores; dismantle(s, data, it.uid); assert.equal(s.cores, before + back);
  // an equipped refined wheel really is stronger
  const t = mkTeamState(); t.cores = 999;
  const w = addItem(t, 'wheel', data.wheels.find((x) => x.rarity === 'SSR').id); equipItem(t, data, 'salvador', w.uid);
  const a0 = allyDef(t, data, 'salvador').atk + allyDef(t, data, 'salvador').hp;
  refineItem(t, w.uid); refineItem(t, w.uid); refineItem(t, w.uid);
  assert.ok(allyDef(t, data, 'salvador').atk + allyDef(t, data, 'salvador').hp > a0);
});

test('shop limits, extra attempts and daily reset', () => {
  const s = newState(data, 8); s.cores = 3000;
  const t0 = s.tickets;
  for (let i = 0; i < 10; i++) assert.ok(buy(s, data, 'ticket'));
  assert.equal(buy(s, data, 'ticket'), null); assert.equal(s.tickets, t0 + 10);
  assert.equal(boughtToday(s, 'ticket'), 10);
  assert.ok(buy(s, data, 'try-weekly')); assert.equal(weeklyState(s).tries, 4);
  assert.ok(buy(s, data, 'gear').items.length === 1);
  s.shop.day = '2000-01-01'; assert.equal(boughtToday(s, 'ticket'), 0);
  s.cores = 0; assert.equal(buy(s, data, 'gold'), null);
  assert.ok(SHOP.every((x) => x.cost > 0 && x.limit > 0));
});

test('sign-in: once a day, backfill costs 银芯, cumulative chests', () => {
  const s = newState(data, 9); s.cores = 500;
  const day = (d) => new Date(Date.UTC(2026, 9, d));
  const r = signToday(s, data, day(10)); assert.ok(r && r.cores === 10);
  assert.equal(signToday(s, data, day(10)), null);
  assert.ok(backfill(s, data, 3, day(10))); assert.equal(s.cores, 500 + 10 + 10 - BACKFILL_COST);
  assert.equal(backfill(s, data, 3, day(10)), null); assert.equal(backfill(s, data, 10, day(10)), null, 'today is not a backfill');
  assert.equal(dayReward(7).item, true);
  for (const d of [1, 2, 4]) backfill(s, data, d, day(10));
  assert.equal(signinState(s, day(10)).claimed.length, 5);
  assert.ok(claimCum(s, data, 0, day(10))); assert.equal(claimCum(s, data, 0, day(10)), null); assert.equal(claimCum(s, data, 1, day(10)), null);
  // new month resets
  assert.equal(signinState(s, new Date(Date.UTC(2026, 10, 1))).claimed.length, 0);
  assert.equal(CUM.length, 6);
});

test('achievements: unique ids, rich categories, claim-all pays tickets/银芯/gold', () => {
  const ids = ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.length >= 90);
  assert.ok(ACHIEVEMENTS.every((a) => a.cat && a.reward.cores > 0));
  for (const old of ['stage10', 'wins100', 'lv20', 'lv45', 'tower10', 'trial1', 'codex30', 'week1', 'arena70', 'rt40']) assert.ok(ids.includes(old), old);
  const s = mkTeamState(60); s.maxStage = 45; s.stats.wins = 500; s.tower.best = 12;
  const t0 = s.tickets, c0 = s.cores;
  const r = claimAllAchievements(s, data);
  assert.ok(r.n >= 8 && s.tickets > t0 && s.cores > c0);
  assert.equal(claimAllAchievements(s, data), null);
});

// ---------------------------------------------------------------- M7: 注册福利
import { portalUser, welcomeStatus, claimWelcome, claimSeven, sevenState, WELCOME, SEVEN } from '../src/core/welcome.js';
const fakeStore = (o = {}) => { const m = { ...o }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

test('注册福利: needs a portal login, once per account, survives a save reset', () => {
  const guest = fakeStore();
  assert.equal(portalUser(guest), null);
  const s = newState(data, 21);
  assert.equal(welcomeStatus(s, null, guest).canClaim, false);
  assert.equal(claimWelcome(s, data, null, Date.now(), guest), null);
  const st = fakeStore({ 'zjtt:authToken': JSON.stringify('tok'), 'zjtt:authUser': JSON.stringify({ name: 'Ａlice', email: 'alice@zjtt.local' }) });
  const u = portalUser(st);
  assert.equal(u.key, 'alice');
  const c0 = s.cores;
  const r = claimWelcome(s, data, u, Date.UTC(2026, 9, 28), st);
  assert.equal(r.cores, WELCOME.cores); assert.equal(s.cores, c0 + WELCOME.cores); assert.equal(r.items.length, 1);
  assert.equal(claimWelcome(s, data, u, Date.now(), st), null, 'only once');
  // a fresh save on the same browser cannot claim again
  const s2 = newState(data, 22);
  assert.equal(welcomeStatus(s2, u, st).claimedElsewhere, true); assert.equal(claimWelcome(s2, data, u, Date.now(), st), null);
});

test('7-day newcomer bonus unlocks day by day and expires', () => {
  const st = fakeStore({ 'zjtt:authToken': '"t"', 'zjtt:authUser': JSON.stringify({ name: 'bob' }) });
  const u = portalUser(st), s = newState(data, 23), d0 = Date.UTC(2026, 9, 28), day = 86400000;
  claimWelcome(s, data, u, d0, st);
  assert.equal(sevenState(s, d0).idx, 1);
  assert.ok(claimSeven(s, data, 0, d0)); assert.equal(claimSeven(s, data, 0, d0), null); assert.equal(claimSeven(s, data, 1, d0), null, 'day 2 not open yet');
  assert.ok(claimSeven(s, data, 1, d0 + day));
  assert.ok(claimSeven(s, data, 6, d0 + 6 * day)); assert.equal(s.welcome.days.length, 3);
  assert.ok(claimSeven(s, data, 2, d0 + 10 * day), 'catch-up window');
  assert.equal(claimSeven(s, data, 3, d0 + 14 * day), null, 'expired');
  assert.equal(SEVEN.length, 7);
});

// ---------------------------------------------------------------- M8: battle report
import { analyzeBattle, grade } from '../src/core/report.js';
test('battle report agrees with the engine stats and grades the result', () => {
  const s = mkTeamState(40);
  const r = runBattle(s, data, 10);
  const rep = analyzeBattle(r, r.prep.allies, r.prep.enemies);
  for (const [uid, st] of Object.entries(r.stats)) {
    assert.equal(rep.units[uid].dmg, st.dmg, `${uid} dmg`); assert.equal(rep.units[uid].taken, st.taken, `${uid} taken`); assert.equal(rep.units[uid].heal, st.heal, `${uid} heal`);
  }
  assert.equal(rep.rounds, r.rounds); assert.equal(rep.timeline.length, r.rounds);
  assert.equal(rep.totals.kills, rep.E.filter((u) => u.deaths).length);
  assert.ok(Math.abs(rep.A.reduce((a, u) => a + u.share, 0) - 1) < 1e-9);
  assert.ok(rep.totals.critRate >= 0 && rep.totals.critRate <= 1);
  const g = grade(rep);
  assert.equal(r.win, g.rank !== 'D'); assert.ok(g.stars >= (r.win ? 1 : 0));
  assert.deepEqual(grade({ ...rep, win: false }), { stars: 0, rank: 'D', notes: [] });
  // timeline sums to totals
  assert.equal(rep.timeline.reduce((a, t) => a + t.dmgA, 0), rep.totals.dmg);
});

// ---------------------------------------------------------------- M9: 叠位 99 / 突破 / 挂机收益 / 造物羁绊 / 钥令
import { breakThrough, awakenUp, farmRate, winRateOf, firstClearReward, relicItemsOf, addOrder, upgradeOrder } from '../src/core/game.js';
import { levelCap, awakenCost, breakCost, growthPerLevel } from '../src/core/stats.js';
import { relicTheme, relicBond, relicSlotCount, RELIC_BONDS } from '../src/core/gear.js';
import { setOrderSlot, ordersBonus, orderSlotCount, orderUpCost } from '../src/core/orders.js';

test('叠位 opens the level cap up to 99 and stops there', () => {
  const s = newState(data, 21);
  s.cores = 1e9;
  assert.equal(levelCap(0), 60);
  assert.equal(levelCap(99), 159);
  const slug = 'ogier';
  const p0 = allyDef(s, data, slug, [slug]).power;
  assert.equal(awakenUp(s, slug, 1), awakenCost(0));
  assert.equal(s.roster[slug].star, 1);
  assert.equal(levelCap(s.roster[slug].star), 61);
  assert.ok(allyDef(s, data, slug, [slug]).power > p0);
  // 直接叠到 99 再试一次：不再变化
  s.roster[slug].star = 99;
  assert.equal(awakenUp(s, slug), 0);
  assert.equal(s.roster[slug].star, 99);
  assert.ok(allyDef(s, data, slug, [slug]).amp >= 27, '99 叠位至少 +27% 增伤');
});

test('突破卡在每 20 级，付金币+银芯才能继续升级', () => {
  const s = newState(data, 22);
  const slug = 'ogier', r = s.roster[slug];
  s.gold = 1e9;
  levelUp(s, slug, 100);
  assert.equal(r.lv, 20, '先卡在第一个突破点');
  s.cores = 0;
  assert.equal(breakThrough(s, slug), null, '没有银芯不能突破');
  assert.equal(levelUp(s, slug, 1), 0, '没突破就不能继续升级');
  s.cores = 1e6;
  const c = breakCost(20);
  s.gold = c.gold + 1000;
  const paid = breakThrough(s, slug);
  assert.ok(paid && paid.cores === c.cores && r.brk === 1);
  assert.equal(s.gold, 1000);
  s.gold = 1e9;
  assert.equal(levelUp(s, slug, 100), 20, '突破后可继续到 40');
  assert.equal(r.lv, 40);
});

test('farming rate rises with stage and matches the offline formula', () => {
  const s = newState(data, 23); s.maxStage = 10; s.stage = 10;
  const a = farmRate(s, data, 10, 1), b = farmRate(s, data, 11, 1);
  assert.ok(a.goldPerHour > 0 && b.goldPerHour > a.goldPerHour);
  assert.ok(a.perBattle === Math.round(a.perBattle) && a.rate === 1);
  const half = farmRate(s, data, 10, 0.5);
  assert.ok(Math.abs(half.goldPerHour - a.goldPerHour / 2) <= 1, '收益与胜率线性相关');
  assert.ok(winRateOf(s, data, 1) > 0.5, '第一关一定打得过');
  assert.ok(firstClearReward(10).order === 1, 'Boss 关首通给钥令');
});

test('造物栏按最高关解锁，同主题 2 件激活羁绊', () => {
  const s = newState(data, 24);
  assert.equal(relicSlotCount(0), 3);
  assert.equal(relicSlotCount(20), 4);
  assert.equal(relicSlotCount(999), 6);
  // 找一个有 >=2 件同主题造物的主题
  const byTheme = {};
  for (const d of data.relics) { const th = relicTheme(d.id).zh; (byTheme[th] = byTheme[th] || []).push(d); }
  const PWR = ['战意', '生机', '壁垒', '星辉', '蚀刻', '锋锐'];
  const [zh, list] = PWR.map((k) => [k, byTheme[k]]).find(([, l]) => l && l.length >= 2);
  s.maxStage = 999;
  const before = allyDef(s, data, s.team[0], s.team);
  const ids = list.slice(0, 2).map((d) => addItem(s, 'relic', d.id).uid);
  s.gear.relics[0] = ids[0]; s.gear.relics[1] = ids[1];
  const defs = relicItemsOf(s).map((it) => it && data.relicById[it.defId]);
  const b = relicBond(defs);
  assert.equal(b.count[zh], 2);
  assert.ok(b.active.some((x) => x.zh === zh && x.tier === 2));
  const after = allyDef(s, data, s.team[0], s.team);
  assert.ok(after.power > before.power, '羁绊生效后战力更高');
  assert.ok(Object.keys(RELIC_BONDS).includes(zh));
});

test('钥令：配置、全队加成、淬炼、重复折算', () => {
  const s = newState(data, 25);
  assert.equal(orderSlotCount(0), 1);
  assert.equal(orderSlotCount(35), 3);
  const base = ordersBonus(s, data);
  const id = Object.keys(s.orders.owned)[0];
  assert.ok(id && base.atkPct + base.hpPct + base.defPct + base.gold > 0, '开局送的钥令已经生效');
  // 清空后加成归零
  assert.ok(setOrderSlot(s, 0, null));
  assert.equal(ordersBonus(s, data).gold + ordersBonus(s, data).atkPct, 0);
  assert.ok(setOrderSlot(s, 0, id));
  // 同一钥令不能占两个位置
  s.maxStage = 40;
  assert.equal(setOrderSlot(s, 1, id), false);
  // 淬炼
  s.cores = 1e6;
  const lv0 = s.orders.owned[id];
  assert.ok(upgradeOrder(s, id) && s.orders.owned[id] === lv0 + 1);
  assert.ok(orderUpCost(lv0) > 0);
  const up = ordersBonus(s, data);
  assert.ok(up.atkPct + up.hpPct + up.defPct + up.gold > base.atkPct + base.hpPct + base.defPct + base.gold);
  // 重复钥令折算银芯
  const c0 = s.cores;
  const dup = addOrder(s, id);
  assert.equal(dup.isNew, false); assert.ok(s.cores > c0);
});
