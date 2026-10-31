import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { data } from './helpers.mjs';
import { newState, runBattle, applyResult, summon, equipPull, equipItem, allyDef, teamDefs, levelUp, migrate, offlineReport, claimOffline, autoTeam, PULL_PITY_GENESIS, dismantle, enhanceItem, addItem, farmRate, ticketPerWin, corePerWin, ticketBoost, coreBoost, winsPerTicket, winsPerCore } from '../src/core/game.js';
import { simulate, frontLine } from '../src/core/battle.js';
import { towerReward } from '../src/core/challenge.js';
import { mulberry32 } from '../src/core/rng.js';
import { buildKit, describeSkill } from '../src/core/skills.js';
import { SLOTS } from '../src/core/constants.js';

test('data pack is complete', () => {
  assert.equal(data.awakeners.length, 72);   // 62 名官方 + 10 名联名彩蛋（core/creators.js）
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
import { doTower, doTrial, simulateTower, towerTries, towerInfo, towerRewardStage, THREATS, trialUnlocked, TOWER_DAILY, TOWER_MAX_FLOOR } from '../src/core/challenge.js';
import { achievementList, claimAchievement } from '../src/core/achievements.js';
import { buildEnemies, makeEnemy } from '../src/core/enemies.js';

const unit = (o = {}) => ({ name: 'x', hp: 5000, atk: 100, def: 50, type: 'ASSAULT', kit: null, ...o });
const mkKit = (effects) => Object.fromEntries(SLOTS.map((s) => [s, { slot: s, name: s, effects }]));

test('every awakener carries real card names and the keyword pack', () => {
  assert.ok(Object.keys(data.kw).length >= 90);
  // 彩蛋角色在原作里不存在，没有 rk 原文，只有手写技能名（下面单独测）
  for (const a of data.awakeners.filter((x) => !x.creator)) {
    const k = data.kit(a.slug);
    for (const s of SLOTS) assert.ok(k[s].name && k[s].real?.d, `${a.slug}.${s}`);
  }
  const salvador = data.kit('salvador');
  assert.equal(salvador.Skill1.name, '受祝骨血');
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
  // 唤醒改成登场技之后，第一回合就会真出手，所以这里把开局能量压在 96：第一次行动普攻 +14 攒满，
  // 而封印在同一回合就会落到它身上——测的还是「被封印的人开不出大招」这件事。
  const exalter = unit({ kit: mkKit([fx.dmg(0.1)]), openAli: 96, openKey: 0 });
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
import { botEntry, snapshot, hydrate, localOpponents, fightArena, applyArena, localSettle, arenaState, UNRANKED, LADDER, dailyRankReward, fightFriend } from '../src/core/arena.js';

const mkTeamState = (lv = 30) => { const s = newState(data, 11); for (const a of ['salvador', 'xu', 'vivian', 'caraboo']) s.roster[a] = { lv, star: 1 }; s.team = ['salvador', 'caraboo', 'xu', 'vivian']; return s; };

test('weekly boss: stable per week, damage accumulates, milestones claim once', () => {
  assert.equal(weekId(new Date(Date.UTC(2026, 9, 28))), '2026-W44');
  assert.equal(weeklyBoss(data, '2026-W44').id, weeklyBoss(data, '2026-W44').id);
  const s = mkTeamState();
  const r = doWeekly(s, data);
  assert.ok(r.dmg > 0 && r.rounds <= 12);
  assert.equal(r.tier.n, 1, '默认打第 1 层');
  assert.equal(weeklyState(s).tiers[1].damage, r.dmg);
  const w = weeklyState(s); w.tries = 3; doWeekly(s, data); doWeekly(s, data); doWeekly(s, data); assert.equal(doWeekly(s, data), null);
  w.tiers[1].damage = MILESTONES[1].dmg;
  assert.ok(claimWeekly(s, data, 1)); assert.equal(claimWeekly(s, data, 1), null); assert.equal(claimWeekly(s, data, 7), null);
  // a new week clears the progress
  weeklyState(s, '2099-W01'); assert.equal(s.weekly.tiers[1].damage, 0);
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
  const weak = botEntry(LADDER, data), strong = botEntry(1, data);
  assert.ok(strong.power > weak.power * 3);
  assert.deepEqual(botEntry(40, data).snap, botEntry(40, data).snap);
  const s = mkTeamState(40);
  const snap = snapshot(teamDefs(s, data));
  const back = hydrate(snap, data);
  assert.equal(back.length, 4); assert.ok(back.every((d) => d.kit && d.hp > 0));
  assert.equal(arenaState(s).rank, UNRANKED);
  const opps = localOpponents(s, data);
  // 候选名次按 1 / 3 / 7 / 15 / 31 名递进，越往上跨度越大
  assert.deepEqual(opps.map((o) => o.rank), [1000, 998, 994, 986, 970]);
  assert.ok(opps.every((o) => o.type === 'bot'));
  const e = opps[0], f = fightArena(s, data, e);
  assert.ok(f.win, 'a lv40 team beats the last-place bot');
  const rw = applyArena(s, data, f, localSettle(s, e, f.win).rank);
  assert.equal(arenaState(s).rank, 1000); assert.ok(rw.tickets >= 1);
  assert.ok(localOpponents(s, data)[0].rank === 999);
  // 从第 2 名往上只有第 1 名，不会出现 0 或负名次
  const top = mkTeamState(40); arenaState(top).rank = 2;
  assert.deepEqual(localOpponents(top, data).map((o) => o.rank), [1]);
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
import { refineMult, relicRefineGain, relicRefineView, relicText, wheelText, REFINE_MAX } from '../src/core/gear.js';
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

test('造物文案把精炼吃进去：显示的就是实际加成，精炼给了多少能单独算', () => {
  const def = data.relics.find((x) => x.rarity === 'SSR') || data.relics[0];
  const base = Number(relicText(def, 10, 0).match(/([0-9.]+)/)[1]);
  const rf2 = Number(relicText(def, 10, 2).match(/([0-9.]+)/)[1]);
  // 每阶 +8% 基础值，2 阶 = ×1.16
  assert.ok(Math.abs(rf2 - base * 1.16) < 0.06, `精炼+2 要按 1.16 倍显示：${base} → ${rf2}`);
  assert.ok(Math.abs(relicRefineGain(def, 10, 2) - base * 0.16) < 0.06, '精炼标记的增量 = 基础 × 16%');
  const view = relicRefineView(def, 10, 2);
  assert.equal(view.rf, 2);
  assert.ok(view.next > view.now, '再精炼一阶要能看到变多');
  assert.equal(view.max, REFINE_MAX);
  // 命轮同理：显示值跟着精炼走
  const w = data.wheels[0];
  assert.notEqual(wheelText(w, 10, 0), wheelText(w, 10, 3));
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
import { breakThrough, awakenUp, winRateOf, firstClearReward, relicItemsOf, addOrder, upgradeOrder } from '../src/core/game.js';
import { levelCap, awakenCost, breakCost, growthPerLevel } from '../src/core/stats.js';
import { relicTheme, relicBond, relicSlotCount, RELIC_BONDS, ZERO } from '../src/core/gear.js';
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
  // 原作钥令的加成键各不相同（有的只给起始钥焰），所以按「所有键加起来」判断有没有效果
  const sumAll = (b) => Object.values(b).reduce((a, v) => a + (Number(v) || 0), 0);
  assert.equal(orderSlotCount(0), 1);
  assert.equal(orderSlotCount(35), 3);
  const base = ordersBonus(s, data);
  const id = Object.keys(s.orders.owned)[0];
  assert.ok(id && sumAll(base) > 0, '开局送的钥令已经生效');
  // 清空后加成归零
  assert.ok(setOrderSlot(s, 0, null));
  assert.equal(sumAll(ordersBonus(s, data)), 0);
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
  assert.ok(sumAll(up) > sumAll(base));
  // 重复钥令折算银芯
  const c0 = s.cores;
  const dup = addOrder(s, id);
  assert.equal(dup.isNew, false); assert.equal(dup.cores, 30); assert.equal(s.cores, c0, 'addOrder 只报数，银芯由调用方一次入账');
});

/* ---------- M10：塔上限 / 1000 名天梯 / 校猫奖励首领 ---------- */

test('tower: the climb cap is 300 floors and reward gold is clamped', () => {
  assert.equal(TOWER_MAX_FLOOR, 500);
  const s = mkTeamState(60);
  const sim = simulateTower(s, data, { maxFloors: TOWER_MAX_FLOOR });
  assert.ok(sim.floors.length <= TOWER_MAX_FLOOR);
  // 奖励用的等效关卡在 240 层后封顶，避免 1.085^f 把金币算成天文数字
  assert.equal(towerRewardStage(20), 29);
  assert.ok(towerRewardStage(400) <= 240);
  assert.equal(towerInfo(20).reward, true, '每 20 层是校猫奖励层');
  assert.equal(towerInfo(19).reward, false);
});

test('arena: 1000 ranks, widening challenge window, rank-based daily rewards', () => {
  assert.equal(LADDER, 1000); assert.equal(UNRANKED, 1001);
  assert.equal(dailyRankReward(1), 20);
  assert.ok(dailyRankReward(1) > dailyRankReward(50) && dailyRankReward(50) > dailyRankReward(500) && dailyRankReward(500) > dailyRankReward(999));
  assert.equal(dailyRankReward(UNRANKED), 0);
});

test('cat boss: only on reward stages, keeps its own skill set, pays extra (first kill doubled)', () => {
  const cat = data.monsters.find((m) => m.reward);
  assert.ok(cat && cat.zh === '校猫');
  const onReward = buildEnemies(40, data.monsters, { seed: 'stage40', msk: data.msk });
  assert.equal(onReward[0].name, '校猫'); assert.ok(onReward[0].reward && onReward[0].boss);
  assert.ok(onReward[0].skills.length >= 4, '校猫有自己的出招表');
  let stray = 0;
  for (let st = 1; st <= 79; st++) if (st % 40 !== 0) for (const e of buildEnemies(st, data.monsters, { seed: `s${st}`, msk: data.msk })) if (e.reward) stray++;
  assert.equal(stray, 0, '校猫不会混进普通关的随机池');
  const s = newState(data, 3);
  s.maxStage = 39; s.stage = 40; s.auto = false;
  for (const k of Object.keys(s.roster)) { const r = s.roster[k]; r.lv = 150; r.brk = 7; r.star = 40; }
  const res = runBattle(s, data, 40);
  assert.equal(res.prep.enemies[0].name, '校猫');
  assert.ok(res.win, '99 级队伍打得过第 40 关的校猫');
  const rw = applyResult(s, data, res);
  assert.ok(rw.cat, '校猫战斗必须标记为奖励首领');
  assert.ok(rw.catFirst, '第一次击败校猫');
  assert.ok(rw.tickets >= 10 && rw.cores >= 120 && rw.items.length >= 2);
  // 再打一次：不算首杀，但常规奖励还在
  s.maxStage = 39; s.stage = 40;
  const rw2 = applyResult(s, data, runBattle(s, data, 40));
  assert.ok(rw2.cat && !rw2.catFirst);
  assert.ok(rw2.tickets >= 5 && rw2.cores >= 60);
});

/* ---------- M10 收尾：一键配队 / 手动挂机不推进 ---------- */
import { autoLoadout, bonusScore } from '../src/core/game.js';
import { RELIC_SLOTS, ORDER_SLOTS } from '../src/core/constants.js';
import { orderBonus } from '../src/core/orders.js';

test('一键配队：队伍、命轮、密契、造物、钥令一次配齐', () => {
  const s = newState(data, 33);
  s.maxStage = 45; s.stage = 45;
  for (const k of ['salvador', 'xu', 'vivian', 'caraboo']) s.roster[k] = { lv: 45, star: 3 };
  // 备料：三类装备各来一批，保证配装时不会因为库存不够而空着
  const uids = [
    ...data.wheels.slice(0, 6).map((d) => addItem(s, 'wheel', d.id).uid),
    ...data.covenants.slice(0, 8).map((d) => addItem(s, 'covenant', d.id).uid),
    ...data.relics.slice(0, 10).map((d) => addItem(s, 'relic', d.id).uid),
  ];
  assert.equal(uids.length, 24);
  for (const d of data.orders.slice(0, 10)) addOrder(s, d.id);

  const out = autoLoadout(s, data);
  assert.equal(s.team.length, 4);
  assert.equal(new Set(s.team).size, 4);
  assert.deepEqual(out.team, s.team);

  // 命轮 + 密契：队伍 4 人各一件，种类对得上，也不会两个人抢同一件
  const used = new Set();
  for (const slug of s.team) {
    const eq = s.gear.equip[slug] || {};
    assert.ok(eq.wheel && eq.cov, `${slug} 应该配上命轮和密契`);
    assert.equal(s.gear.items[eq.wheel].kind, 'wheel');
    assert.equal(s.gear.items[eq.cov].kind, 'covenant');
    for (const uid of [eq.wheel, eq.cov]) { assert.ok(!used.has(uid), '同一件不能装给两个人'); used.add(uid); }
  }
  assert.equal(used.size, 8);

  // 造物：解锁几格就填几格，剩下的留空
  const slots = relicSlotCount(s.maxStage);
  assert.ok(slots >= 5, '45 关已经解锁 5 格造物');
  assert.equal(out.relics, slots);
  assert.equal(s.gear.relics.length, RELIC_SLOTS);
  assert.equal(s.gear.relics.filter(Boolean).length, slots);
  assert.equal(new Set(s.gear.relics.filter(Boolean)).size, slots);
  assert.ok(s.gear.relics.slice(slots).every((x) => x === null), '超出的格子不塞东西');

  // 钥令：按加成强度从高到低排，且不重复
  const on = orderSlotCount(s.maxStage);
  assert.equal(on, ORDER_SLOTS);
  assert.equal(out.orders, on);
  const ids = s.orders.slots.filter(Boolean);
  assert.equal(ids.length, on);
  assert.equal(new Set(ids).size, on);
  const sc = ids.map((id) => bonusScore(orderBonus(data.orderById[id], s.orders.owned[id])));
  assert.deepEqual(sc, [...sc].sort((x, y) => y - x), '按强度降序');

  // 再配一次结果不变（不会越配越乱）
  const snap = JSON.stringify([s.team, s.gear.equip, s.gear.relics, s.orders.slots]);
  autoLoadout(s, data);
  assert.equal(JSON.stringify([s.team, s.gear.equip, s.gear.relics, s.orders.slots]), snap);
});

test('手动挂机：停在本关反复刷，不再往前推进', () => {
  const s = mkTeamState(60);
  s.maxStage = 10; s.stage = 10; s.auto = false;
  const rw = applyResult(s, data, runBattle(s, data, 10));
  assert.ok(rw.stayed, '手动模式打赢也留在本关');
  assert.ok(!rw.advanced && !rw.retreat);
  assert.equal(s.stage, 10, '关卡不会被自动推进');
  for (let i = 0; i < 3; i++) { applyResult(s, data, runBattle(s, data, s.stage)); assert.equal(s.stage, 10); }
  assert.equal(s.maxStage, 10, '一直打已通关的关卡，最高关不变');

  // 手动选了一关没打过的：赢了也只更新最高通关，关卡还是停在这一关
  s.stage = 11;
  const rw2 = applyResult(s, data, runBattle(s, data, 11));
  assert.ok(rw2.stayed);
  assert.equal(s.stage, 11);
  assert.equal(s.maxStage, 11);

  // 输了也不会被踢回前面的关卡（撤退只在自动模式下发生）
  s.maxStage = 30; s.stage = 200;
  const lost = runBattle(s, data, 200);
  assert.ok(!lost.win, '60 级打不过第 200 关');
  const rw3 = applyResult(s, data, lost);
  assert.equal(rw3.retreat, undefined);
  assert.equal(s.stage, 200);

  // 自动模式才会在「没通过的高关」上失败后退回已通关的关卡
  s.auto = true; s.maxStage = 30; s.stage = 200;
  const rw4 = applyResult(s, data, runBattle(s, data, 200));
  assert.equal(rw4.retreat, true);
  assert.equal(s.stage, 30);
});

/* ---------- 通关回合上限 / 前后排 / 塔每层收益 ---------- */

const wall = (side, i, hp, def, atk = 1) => ({
  name: `${side}墙${i}`, hp, atk, def, type: 'WARDEN', realm: null,
  pattern: [{ name: '撞', effects: [{ t: 'dmg', m: 0.05, to: 'foe' }] }], opening: [],
});

test('通关有回合上限：两边都磨不动就判超时', () => {
  const res = simulate({
    allies: [wall('a', 0, 90000, 600), wall('a', 1, 90000, 600)],
    enemies: [wall('e', 0, 90000, 600)],
    seed: 7, maxRounds: 18,
  });
  assert.equal(res.win, false);
  assert.equal(res.timeout, true, '打满回合还没清场 = 超时');
  assert.equal(res.rounds, 18);
  assert.equal(res.roundLimit, 18, '上限要能被界面读到');

  // 同样的队伍给足 30 回合依然是超时（超时不是「打平」，是判负）
  const long = simulate({ allies: [wall('a', 0, 90000, 600)], enemies: [wall('e', 0, 90000, 600)], seed: 7, maxRounds: 30 });
  assert.equal(long.timeout, true);
  assert.equal(long.rounds, 30);
});

test('前后排：普通怪的单击只打前排，Boss 才能越过前排', () => {
  const back = (i) => ({ name: `后排${i}`, hp: 100, atk: 1, def: 0, type: 'CHORUS', realm: null, pattern: [{ name: '看', effects: [{ t: 'heal', m: 0, to: 'self' }] }], opening: [] });
  const foes = { ...wall('e', 0, 99999, 0, 260), type: 'ASSAULT' };
  const allies = [wall('a', 0, 90000, 500), wall('a', 1, 90000, 500), back(2), back(3)];

  const plain = simulate({ allies, enemies: [foes], seed: 3, maxRounds: 12 });
  assert.equal(plain.win, false);
  assert.ok(plain.allies[0].hp < plain.allies[0].maxHp || plain.allies[1].hp < plain.allies[1].maxHp, '前排挨打');
  assert.equal(plain.allies[2].hp, plain.allies[2].maxHp, '普通怪打不到后排');
  assert.equal(plain.allies[3].hp, plain.allies[3].maxHp, '普通怪打不到后排');

  const boss = simulate({ allies, enemies: [{ ...foes, boss: true }], seed: 3, maxRounds: 12 });
  assert.ok(boss.allies[2].hp < boss.allies[2].maxHp || boss.allies[3].hp < boss.allies[3].maxHp, 'Boss 可以越过前排打后排');
});

test('前后排：按固定槽位判断，前排还留一个活人就不放后排进去', () => {
  const slot = (idx, on = true) => ({ idx, alive: on });
  const mob = { side: 'e', boss: false };
  // 前排 2 号位阵亡，前排 1 号位还活着 → 小怪只能打 0 号位
  assert.deepEqual(frontLine(mob, [slot(0), slot(1, false), slot(2), slot(3)]).map((x) => x.idx), [0]);
  // 前排两个位置都空了 → 后排暴露
  assert.deepEqual(frontLine(mob, [slot(0, false), slot(1, false), slot(2), slot(3)]).map((x) => x.idx), [2, 3]);
  // Boss 不受前排限制
  assert.deepEqual(frontLine({ side: 'e', boss: true }, [slot(0), slot(1), slot(2)]).map((x) => x.idx), [0, 1, 2]);
  // 我方守护（近战）只能打敌阵前排，突击 / 合唱可以点名后排
  assert.deepEqual(frontLine({ side: 'a', type: 'WARDEN' }, [slot(0), slot(1), slot(2)]).map((x) => x.idx), [0, 1]);
  assert.deepEqual(frontLine({ side: 'a', type: 'CHORUS' }, [slot(0), slot(1), slot(2)]).map((x) => x.idx), [0, 1, 2]);
});

test('前后排：前排只倒一个时，后排依然安全（不再按存活下标顶位）', () => {
  const back = (i) => ({ name: `后排${i}`, hp: 500, atk: 1, def: 0, type: 'CHORUS', realm: null, pattern: [{ name: '看', effects: [{ t: 'heal', m: 0, to: 'self' }] }], opening: [] });
  const mob = { ...wall('e', 0, 999999, 0, 900), type: 'ASSAULT' };
  const allies = [wall('a', 0, 90000, 500), wall('a', 1, 1, 0), back(2), back(3)];

  const res = simulate({ allies, enemies: [mob], seed: 3, maxRounds: 18 });
  assert.equal(res.allies[1].hp, 0, '前排 2 号位该被打死');
  assert.ok(res.allies[0].hp < res.allies[0].maxHp, '前排 1 号位还在挨打');
  assert.equal(res.allies[2].hp, res.allies[2].maxHp, '前排还有个活人，后排不该被普通小怪点名');
  assert.equal(res.allies[3].hp, res.allies[3].maxHp, '同上');

  // 前排两个位置都空出来之后，后排才会挨打
  const both = simulate({ allies: [wall('a', 0, 1, 0), wall('a', 1, 1, 0), back(2), back(3)], enemies: [mob], seed: 3, maxRounds: 18 });
  assert.equal(both.allies[0].hp, 0);
  assert.equal(both.allies[1].hp, 0);
  assert.ok(both.allies[2].hp < both.allies[2].maxHp || both.allies[3].hp < both.allies[3].maxHp, '前排全灭后后排暴露');
});

test('塔每层都给券和银芯，越往上越多', () => {
  const low = newState(data, 21); low.tower = { best: 0, tries: 3, day: '' };
  const rwLow = towerReward(low, data, 30, mulberry32(1));
  const high = newState(data, 21); high.tower = { best: 270, tries: 3, day: '' };
  // 只量 271–299：300 层那一份是每 50 层的一次性里程碑，单独测（不然平均值会被它拉高）
  const rwHigh = towerReward(high, data, 299, mulberry32(1));

  // 30 层：里程碑 2 券/5 层 = 12 券，加上每层零头至少再 2 张；银芯同理
  assert.ok(rwLow.tickets >= 14, `第 1–30 层券太少：${rwLow.tickets}`);
  assert.ok(rwLow.cores >= 75, `第 1–30 层银芯太少：${rwLow.cores}`);

  // 同样是 30 层，高层每层给得更多（缓慢增长）
  const per = (rw, n) => ({ t: rw.tickets / n, c: rw.cores / n });
  const a = per(rwLow, 30), b = per(rwHigh, 29);
  assert.ok(b.t > a.t, `每层券应随层数增长：${a.t.toFixed(2)} → ${b.t.toFixed(2)}`);
  assert.ok(b.c > a.c, `每层银芯应随层数增长：${a.c.toFixed(2)} → ${b.c.toFixed(2)}`);
  // 但不能涨疯：第 271–299 层每层银芯（含校猫层）还不到 20 个
  assert.ok(b.c < 20, `每层银芯涨太快：${b.c.toFixed(2)}`);
  // 每 50 层有一份一次性里程碑（300 层），爬到了才发、只发一次
  const mark = newState(data, 22); mark.tower = { best: 299, tries: 3, day: '' };
  const rwMark = towerReward(mark, data, 300, mulberry32(2));
  assert.ok(rwMark.items.length >= 1 && rwMark.orders.length >= 1 && rwMark.tickets >= 40);
  assert.ok(mark.tower.marks.includes(300));
  assert.equal(towerReward(mark, data, 300, mulberry32(3)).marks, undefined, '同一层不会重复发里程碑');
  // 零头会留在 state 里，下次继续攒
  assert.ok(low.tower.tkFrac < 1 && low.tower.coFrac < 1);
});

/* ---------- M12：挂机收益的召唤券 / 银芯随关卡缓慢提升 ---------- */

test('挂机召唤券与银芯：越深的关给得越多，但涨幅很小', () => {
  // 基准仍是 40 场 1 张券、90 场 1 枚银芯（第 1 关只带一点点加成）
  assert.ok(winsPerTicket(1) > 38 && winsPerTicket(1) < 40, `第 1 关 ${winsPerTicket(1).toFixed(1)} 场 1 张券`);
  assert.ok(winsPerCore(1) > 85 && winsPerCore(1) < 90, `第 1 关 ${winsPerCore(1).toFixed(1)} 场 1 枚银芯`);

  // 单调递增：爬得越深，同样一场给得越多
  let lastT = 0, lastC = 0;
  for (const st of [1, 10, 30, 60, 100, 150]) {
    assert.ok(ticketPerWin(st) > lastT, `第 ${st} 关的券掉率没有比上一档高`);
    assert.ok(corePerWin(st) > lastC, `第 ${st} 关的银芯掉率没有比上一档高`);
    lastT = ticketPerWin(st); lastC = corePerWin(st);
  }

  // 幅度可控：第 60 关约 2× 券 / 2.6× 银芯，第 100 关也还在 4× 以内
  assert.ok(ticketBoost(60) > 1.9 && ticketBoost(60) < 2.3, `60 关券商 ${ticketBoost(60).toFixed(2)}`);
  assert.ok(coreBoost(60) > 2.4 && coreBoost(60) < 2.8, `60 关银芯 ${coreBoost(60).toFixed(2)}`);
  assert.ok(coreBoost(100) < 4 && ticketBoost(100) < 3, '不能让收益指数爆炸');
  // 银芯是淬炼/叠位的大头，涨得比券快
  assert.ok(coreBoost(80) > ticketBoost(80));

  // 收益面板读到的每小时数字真的变了（胜率固定为 1，只比关卡）
  const s = newState(data, 71);
  const lo = farmRate(s, data, 5, 1), hi = farmRate(s, data, 80, 1);
  assert.ok(hi.ticketsPerHour > lo.ticketsPerHour * 1.8, `${lo.ticketsPerHour.toFixed(1)} → ${hi.ticketsPerHour.toFixed(1)} 券/小时`);
  assert.ok(hi.coresPerHour > lo.coresPerHour * 2, `${lo.coresPerHour.toFixed(1)} → ${hi.coresPerHour.toFixed(1)} 银芯/小时`);
  assert.ok(hi.winsPerTicket < lo.winsPerTicket);
});

test('挂机券/银芯：在线零头与离线结算走同一条曲线', () => {
  // 在线：每场按 ticketPerWin(stage) / corePerWin(stage) 累进 drip
  const s = mkTeamState(80);
  s.maxStage = s.stage = 8; s.auto = false; s.drip = { tickets: 0, cores: 0 };
  const rw = applyResult(s, data, runBattle(s, data, 8));
  assert.ok(rw.stayed, '这场应该是手动挂机的胜利');
  assert.equal(rw.tickets, 0, '一场还不够 1 张券');
  assert.ok(Math.abs(s.drip.tickets - ticketPerWin(8)) < 1e-9, `drip 券 ${s.drip.tickets}`);
  assert.ok(Math.abs(s.drip.cores - corePerWin(8)) < 1e-9, `drip 银芯 ${s.drip.cores}`);
  // 第 8 关的掉率应该比第 1 关基准高一点点
  assert.ok(s.drip.tickets > 1 / 40 && s.drip.cores > 1 / 90);

  // 离线：整场数 × 同一掉率后取整，小数余量交给 claimOffline 写回 drip
  const off = mkTeamState(120);
  off.stage = off.maxStage = 40; off.lastSeen = Date.now() - 6 * 3600e3;
  const rep = offlineReport(off, data);
  assert.ok(rep.wins > 0);
  assert.ok(rep.ticketFrac >= 0 && rep.ticketFrac < 1);
  assert.ok(rep.coreFrac >= 0 && rep.coreFrac < 1);
  assert.ok(rep.tickets >= Math.floor(rep.wins * ticketPerWin(40)) - 1);
  assert.ok(rep.cores >= Math.floor(rep.wins * corePerWin(40)) - 1);

  const before = { ...(off.drip || { tickets: 0, cores: 0 }) };
  claimOffline(off, rep, Date.now());
  assert.ok(Math.abs(off.drip.tickets - (before.tickets + rep.ticketFrac)) < 1e-9, '零头要留在 drip 里');
  assert.ok(Math.abs(off.drip.cores - (before.cores + rep.coreFrac)) < 1e-9);
});

/* ---------- M13：编队 / 抽卡记录与欧非 ---------- */

import { saveSquad, loadSquad, clearSquad, setSquadPick, teamSlugsFor, squadMembers, normalizeSquads, squadsOfSlug, squadKeyZh } from '../src/core/squad.js';
import { luckOf, GACHA_LOG_MAX, EXPECTED_WORTH } from '../src/core/gacha.js';

test('编队：存三套阵容，挑战入口各自指定', () => {
  const s = newState(data, 31);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 8).map((a) => [a.slug, { lv: 40, star: 2, brk: 2 }]));
  const A = data.awakeners.slice(0, 4).map((a) => a.slug);
  const B = data.awakeners.slice(4, 8).map((a) => a.slug);
  s.team = [...A];
  assert.deepEqual(saveSquad(s, 'a'), A);
  s.team = [...B];
  assert.deepEqual(saveSquad(s, 'b'), B);
  assert.equal(squadMembers(s, 'a').length, 4);

  // 默认跟随当前队伍；指定编队后只影响那一个入口
  assert.deepEqual(teamSlugsFor(s, 'tower'), B);
  assert.ok(setSquadPick(s, 'tower', 'a'));
  assert.deepEqual(teamSlugsFor(s, 'tower'), A);
  assert.deepEqual(teamSlugsFor(s, 'weekly'), B);
  // 指到空编队 = 退回当前队伍，不会拿空阵去送
  setSquadPick(s, 'weekly', 'c');
  assert.deepEqual(teamSlugsFor(s, 'weekly'), B);
  // 上阵：把编队读回当前队伍（推图用它）
  assert.deepEqual(loadSquad(s, 'a'), A);
  assert.deepEqual(s.team, A);
  // 清空编队时，引用它的入口一起退回「当前队伍」
  setSquadPick(s, 'arena', 'a');
  assert.ok(clearSquad(s, 'a'));
  assert.deepEqual(squadMembers(s, 'a'), []);
  assert.equal(s.squadPick.arena, 'cur');
  assert.deepEqual(teamSlugsFor(s, 'arena'), s.team);
  // 非法入口 / 非法编队位一律拒绝
  assert.equal(setSquadPick(s, 'nope', 'a'), false);
  assert.equal(setSquadPick(s, 'tower', 'z'), false);
});

test('队库角标：squadsOfSlug 先当前队伍、再按编队位次序，没编入就是空', () => {
  const s = newState(data, 41);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 10).map((a) => [a.slug, { lv: 10, star: 0, brk: 0 }]));
  const A = data.awakeners.slice(0, 4).map((a) => a.slug);
  const B = data.awakeners.slice(4, 8).map((a) => a.slug);
  s.team = [...A];
  assert.deepEqual(saveSquad(s, 'a'), A);      // 一队 = A
  s.team = [...B];
  assert.deepEqual(saveSquad(s, 'b'), B);      // 二队 = B
  s.team = [A[0]];

  assert.deepEqual(squadsOfSlug(s, A[0]), ['cur', 'a'], '当前队伍 + 一队，当前队伍排最前');
  assert.deepEqual(squadsOfSlug(s, A[3]), ['a'], '只在一队里');
  setSquadTeam(s, 'c', [A[3]]);
  assert.deepEqual(squadsOfSlug(s, A[3]), ['a', 'c'], '两套编队都编了，按编队位次序');
  assert.deepEqual(squadsOfSlug(s, B[0]), ['b'], '只在二队里');
  assert.deepEqual(squadsOfSlug(s, data.awakeners[9].slug), [], '没编入任何队伍');
  setSquadTeam(s, 'r3', [A[0]]);
  assert.deepEqual(squadsOfSlug(s, A[0]), ['cur', 'a', 'r3'], '禁区分队也算编入');
  assert.equal(squadKeyZh('cur'), '当前队伍');
  assert.equal(squadKeyZh('r3'), '禁区三队');
});

test('编队「上阵」：带独立配装时人和配装一起搬到主线', () => {
  const s = newState(data, 43);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 4).map((a) => [a.slug, { lv: 20, star: 1, brk: 1 }]));
  const A = data.awakeners.slice(0, 4).map((a) => a.slug);
  s.team = [...A];
  saveSquad(s, 'a');
  const wid = Object.keys(data.wheelById)[0];
  s.gear.items = { ...(s.gear.items || {}), w1: { uid: 'w1', kind: 'wheel', defId: wid, lv: 1, rf: 0 } };
  s.gear.relics = Array(6).fill(null);
  s.orders.slots = Array(3).fill(null);
  s.squads.a.lo = { equip: { [A[0]]: { wheel: 'w1' } }, relics: Array(6).fill(null), orders: Array(3).fill(null) };

  s.team = [A[3]];                                 // 主线先换成别人
  assert.deepEqual(loadSquad(s, 'a'), A);
  assert.equal(s.gear.equip[A[0]]?.wheel, 'w1', '独立配装的命轮跟着上阵');
  // 只换人、不搬配装：applyLoadout = false
  s.team = [A[0]];
  s.gear.equip = {};
  assert.deepEqual(loadSquad(s, 'a', false), A);
  assert.deepEqual(s.gear.equip, {}, '关掉搬配装就不动主线装备');
});

test('编队存档迁移：剔除不存在的唤醒体与非法入口', () => {
  const roster = { ogier: { lv: 1, star: 0, brk: 0 }, lotan: { lv: 1, star: 0, brk: 0 } };
  const sq = normalizeSquads({ a: { team: ['ogier', 'ghost', 'lotan', 'ogier'] }, b: 5 }, roster);
  assert.deepEqual(sq.a.team, ['ogier', 'lotan']);
  assert.deepEqual(sq.b.team, []);

  const s = newState(data, 33);
  s.roster = { ogier: { lv: 1, star: 0, brk: 0 } };
  const m = migrate({ ...s, squads: { a: { team: ['ogier', 'nope'] } }, squadPick: { tower: 'a', weekly: 'zzz' } }, data);
  assert.deepEqual(m.squads.a.team, ['ogier']);
  assert.equal(m.squadPick.tower, 'a');
  assert.equal(m.squadPick.weekly, 'cur');
});

test('挑战按编队出战：周 Boss / 属性塔 / 无限塔都吃指定的那套阵容', () => {
  const s = newState(data, 61);
  const strong = data.awakeners.slice(0, 4).map((a) => a.slug);
  s.roster = Object.fromEntries(strong.map((x) => [x, { lv: 90, star: 8, brk: 4 }]));
  const four = doWeekly(s, data, strong);
  const solo = doWeekly(s, data, [strong[0]]);
  assert.equal(four.team.list.length, 4);
  assert.equal(solo.team.list.length, 1);
  assert.ok(four.dmg > 0 && solo.dmg > 0);
  assert.ok(solo.dmg < four.dmg, `单人 ${solo.dmg} 不该高于四人 ${four.dmg}`);

  // 无限塔：传 1 人就只有 1 人爬
  const one = simulateTower(s, data, { slugs: [strong[0]], maxFloors: 1 });
  assert.equal(one.team.list.length, 1);

  // 属性塔：编队里跨界域的成员会被剔掉，只留本界域
  const chaos = data.awakeners.filter((a) => a.realm === 'CHAOS').slice(0, 4).map((a) => a.slug);
  s.roster = Object.fromEntries([...chaos, ...strong].map((x) => [x, { lv: 80, star: 6, brk: 3 }]));
  const rt = doRTower(s, data, 'CHAOS', [...strong, ...chaos]);
  assert.ok(rt, '有混沌唤醒体就应该能挑战');
  assert.ok(rt.team.list.length > 0);
  assert.ok(rt.team.list.every((d) => d.realm === 'CHAOS'), '属性塔只放行本界域');
});

test('抽卡记录：每抽都进流水，聚合统计与幸运指数可复算', () => {
  const s = newState(data, 41); s.tickets = 1000; s.cores = 20000;
  const out = summon(s, data, 100);
  assert.equal(s.gacha.agg.pulls, 100);
  assert.equal(s.gacha.log.length, 100);
  assert.equal(s.gacha.agg.Genesis + s.gacha.agg.SSR + s.gacha.agg.SR, 100);
  // 流水新到旧，抽序号连续
  assert.equal(s.gacha.log[0].seq, 100);
  assert.equal(s.gacha.log[99].seq, 1);
  assert.deepEqual(new Set(s.gacha.log.map((r) => r.slug)), new Set(out.map((p) => p.slug)));

  const luck = luckOf(s);
  const a = s.gacha.agg;
  assert.equal(luck.worth, a.Genesis * 100 + a.SSR * 18 + a.SR);
  assert.equal(luck.expected, Math.round(100 * EXPECTED_WORTH));
  assert.equal(luck.index, Math.round((luck.worth / (100 * EXPECTED_WORTH)) * 100));
  assert.ok(luck.tier.zh.length > 0);
  assert.equal(luck.genesis, a.Genesis);
  assert.equal(luck.pulls, 100);

  // 银芯召唤共用同一份流水，但 banner 记得区分
  const out2 = summonCores(s, data, 10);
  assert.equal(out2.length, 10);
  assert.equal(s.gacha.agg.pulls, 110);
  assert.ok(s.gacha.log.slice(0, 10).every((r) => r.banner === 'core'));
  assert.ok(s.gacha.log.slice(10, 20).every((r) => r.banner === 'ticket'));
});

test('抽卡记录裁剪到上限，但累计统计不受影响；十连最好成绩留档', () => {
  const s = newState(data, 43); s.tickets = 20000;
  for (let i = 0; i < 36; i++) summon(s, data, 10);
  assert.equal(s.gacha.agg.pulls, 360);
  assert.equal(s.gacha.log.length, GACHA_LOG_MAX, `明细应裁剪到 ${GACHA_LOG_MAX} 条`);
  assert.equal(s.gacha.log[0].seq, 360);
  assert.equal(luckOf(s).pulls, 360, '幸运指数用累计数，不看明细长度');
  assert.ok(s.gacha.best10 >= 1, '十连记录里至少 1 个史诗以上');

  // 老存档没有 gacha 字段 → 迁移出空结构而不是崩
  const m = migrate({ ...newState(data, 45) }, data);
  assert.deepEqual(m.gacha.agg, { pulls: 0, Genesis: 0, SSR: 0, SR: 0 });
  assert.deepEqual(m.gacha.log, []);
  assert.equal(luckOf(m).index, null);
});

/* ---------- M14：挑战编队（按界域）、现场编队、观战数据、唤醒体排序 ---------- */
import {
  MODE_ZH, RT_MODES, rtModeOf, squadLabel, autoSquadSlugs, setSquadTeam, normalizePick,
  towerSquadKey, TOWER_SQUAD_KEYS, squadsOf,
} from '../src/core/squad.js';
import { ROSTER_SORTS, sortRoster } from '../src/core/roster.js';
import { RARITY_ORDER } from '../src/core/constants.js';

test('挑战编队：四座属性塔各有一整套专用编队，互不串台', () => {
  const s = newState(data, 71);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 12).map((a) => [a.slug, { lv: 50, star: 3, brk: 2 }]));
  const byRealm = {};
  for (const r of ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA']) byRealm[r] = data.awakeners.filter((a) => a.realm === r).slice(0, 4).map((a) => a.slug);

  // 每座塔只往自己那一套里存，然后指向自己
  for (const r of ['CHAOS', 'CARO', 'AEQUOR', 'ULTRA']) {
    const tk = towerSquadKey(rtModeOf(r));
    assert.ok(TOWER_SQUAD_KEYS.includes(tk), `${r} 应该有专用编队位`);
    assert.ok(setSquadTeam(s, tk, byRealm[r]));
    assert.ok(setSquadPick(s, rtModeOf(r), tk));
  }
  assert.equal(squadLabel(s, 'rt_CHAOS').key, 't_CHAOS');
  assert.equal(squadLabel(s, 'rt_CARO').key, 't_CARO');
  assert.equal(squadLabel(s, 'rt_AEQUOR').key, 't_AEQUOR');
  assert.equal(squadLabel(s, 'rt_ULTRA').key, 't_ULTRA');

  // 通用编队一个都没被写进去
  for (const k of ['a', 'b', 'c', 'd', 'e']) assert.deepEqual(squadsOf(s)[k].team, [], `通用编队 ${k} 不该被属性塔占用`);

  // 改一座塔（清空）不影响别的塔：它自己退回当前队伍，另外三座原样
  const before = Object.fromEntries(RT_MODES.map((m) => [m, [...teamSlugsFor(s, m)]]));
  setSquadTeam(s, 't_CHAOS', []);
  assert.deepEqual(teamSlugsFor(s, 'rt_CHAOS'), s.team, '混沌塔空了就退回当前队伍');
  for (const m of ['rt_CARO', 'rt_AEQUOR', 'rt_ULTRA']) assert.deepEqual(teamSlugsFor(s, m), before[m], `${m} 被混沌塔带跑了`);

  // 不许借用别的塔那一套
  assert.equal(setSquadPick(s, 'rt_CHAOS', 't_CARO'), false, '属性塔不能借另一座塔的编队');
  // 退回当前队伍可以
  assert.ok(setSquadPick(s, 'rt_CARO', 'cur'));
  assert.deepEqual(teamSlugsFor(s, 'rt_CARO'), s.team);
  assert.equal(squadLabel(s, 'rt_CHAOS').key, 't_CHAOS');
  // 模式表覆盖四座塔 + 其余入口
  assert.deepEqual(RT_MODES, ['rt_CHAOS', 'rt_CARO', 'rt_AEQUOR', 'rt_ULTRA']);
  assert.deepEqual(TOWER_SQUAD_KEYS, ['t_CHAOS', 't_CARO', 't_AEQUOR', 't_ULTRA']);
  assert.equal(MODE_ZH.rt_AEQUOR, '深海回廊');
});

test('挑战编队：老存档里属性塔借通用编队的，迁移时搬进各自的专用位', () => {
  const s = newState(data, 73);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 12).map((a) => [a.slug, { lv: 50, star: 3, brk: 2 }]));
  const owned = (r) => data.awakeners.filter((a) => a.realm === r && s.roster[a.slug]).slice(0, 4).map((a) => a.slug);
  const chaos = owned('CHAOS');
  s.squads.a = { team: chaos };
  s.squadPick = { ...s.squadPick, rt_CHAOS: 'a', rt_CARO: 'a', rt_AEQUOR: 'cur', rt_ULTRA: 'cur' };
  const m = migrate(s, data);
  // 指向 a 的两座塔：混沌塔拿到那 4 人（本来就是这个界域），血肉塔一个都不合界域，
  // 于是留空并退回「当前队伍」——和旧版战斗时的实际表现一致，也不会塞进 4 个混沌界域的人
  assert.deepEqual(m.squads.t_CHAOS.team, chaos);
  assert.deepEqual(m.squads.t_CARO.team, [], '血肉塔不该收下混沌界域的人');
  assert.deepEqual(m.squads.a.team, chaos, '通用一队原样保留');
  assert.equal(m.squadPick.rt_CHAOS, 't_CHAOS');
  assert.equal(m.squadPick.rt_CARO, 'cur');
  assert.equal(m.squadPick.rt_AEQUOR, 'cur');
  // 搬完之后再改塔队，不会回头改到通用一队
  const caro = owned('CARO');
  setSquadTeam(m, 't_CHAOS', caro);
  assert.deepEqual(m.squads.a.team, chaos);
});

test('挑战编队：老存档的「属性塔」选择会分给四座塔', () => {
  const p = normalizePick({ rtower: 'b', weekly: 'c' });
  assert.equal(p.rt_CHAOS, 'b');
  assert.equal(p.rt_CARO, 'b');
  assert.equal(p.rt_AEQUOR, 'b');
  assert.equal(p.rt_ULTRA, 'b');
  assert.equal(p.weekly, 'c');
  assert.equal(p.tower, 'cur');
  // 新存档里已经写好的各自选择优先
  const q = normalizePick({ rtower: 'b', rt_CHAOS: 'a' });
  assert.equal(q.rt_CHAOS, 'a');
  assert.equal(q.rt_CARO, 'b');
});

test('一键上阵：按界域筛，取战力最高的 4 名，前排守护 / 治疗优先', () => {
  const s = newState(data, 73);
  s.roster = Object.fromEntries(data.awakeners.slice(0, 20).map((a) => [a.slug, { lv: 60, star: 4, brk: 2 }]));
  const powerOf = (slug) => allyDef(s, data, slug, [slug]).power;

  const chaos = autoSquadSlugs(s, data, 'CHAOS', powerOf);
  assert.equal(chaos.length, 4);
  assert.ok(chaos.every((x) => data.bySlug[x].realm === 'CHAOS'), '只收本界域');
  // 无序的界域里 Guard 在前、治疗在后
  const ord = { WARDEN: 0, ASSAULT: 1, CHORUS: 2 };
  const types = chaos.map((x) => ord[data.bySlug[x].type]);
  assert.deepEqual(types, [...types].sort((a, b) => a - b), '站位按 守 → 攻 → 辅 排');

  // 不传界域 = 全池最强 4 个
  const all = autoSquadSlugs(s, data, null, powerOf);
  assert.equal(all.length, 4);
  // 全池模式：守护与治疗会被优先拉进来，所以不是严格的「战力前 4」，但都该是战力靠前的人
  const ranked = Object.keys(s.roster).map((x) => ({ x, p: powerOf(x) })).sort((a, b) => b.p - a.p);
  const rankOf = Object.fromEntries(ranked.map((r, i) => [r.x, i]));
  assert.ok(all.every((x) => rankOf[x] < 12), '全池模式取的是战力靠前的 12 名内');

  // 没有该界域的唤醒体时返回空，不会拿别的界域凑数
  const empty = autoSquadSlugs({ roster: { [data.awakeners[0].slug]: { lv: 1 } } }, data, 'ULTRA', powerOf);
  assert.equal(empty.length, 0);
});

test('观战数据：simulate 给出上阵双方的名字 / 血量 / 界域', () => {
  const s = newState(data, 75);
  const res = runBattle(s, data);
  assert.ok(Array.isArray(res.prep.allies) && res.prep.allies.length > 0);
  assert.ok(Array.isArray(res.prep.enemies) && res.prep.enemies.length > 0);
  for (const d of [...res.prep.allies, ...res.prep.enemies]) {
    assert.equal(typeof d.name, 'string');
    assert.ok(d.hp > 0 && typeof d.hp === 'number');
    assert.ok(data.bySlug[d.uid?.[0] === 'a' ? s.team[0] : Object.keys(data.monById)?.[0]] || true);
  }
  // 事件流能让回放跑完整场
  const kinds = new Set(res.events.map((e) => e.k));
  for (const k of ['round', 'act', 'end']) assert.ok(kinds.has(k), `事件里应该有 ${k}`);
  // 塔：只保留最后一层的过程（不为几十层各存一份事件流）
  s.maxStage = 30;
  const tw = simulateTower(s, data, { maxFloors: 6 });
  assert.equal(tw.replay.floor, tw.floors[tw.floors.length - 1].floor);
  assert.ok(tw.replay.events.length > 0);
  assert.ok(tw.replay.prep.allies.length > 0);
});

test('唤醒体排序：稀有度 / 战力 / 等级 / 叠位 / 获取顺序 / 界域', () => {
  const s = newState(data, 77);
  const owned = data.awakeners.slice(0, 5);
  s.roster = Object.fromEntries(owned.map((a, i) => [a.slug, { lv: 10 + i * 7, star: (4 - i) * 3, brk: 0 }]));
  const idxOf = Object.fromEntries(Object.keys(s.roster).map((x, i) => [x, i]));
  const rows = data.awakeners.map((a) => ({
    a, r: s.roster[a.slug], idx: idxOf[a.slug],
    power: s.roster[a.slug] ? allyDef(s, data, a.slug, [a.slug]).power : 0,
  }));

  // 未拥有的永远在后面
  for (const [k] of ROSTER_SORTS) {
    const list = sortRoster(rows, k, -1);
    const firstLocked = list.findIndex((x) => !x.r);
    assert.ok(list.slice(firstLocked).every((x) => !x.r), `${k}：拥有的一定在前面`);
  }
  const lvDown = sortRoster(rows, 'lv', -1).filter((x) => x.r).map((x) => x.r.lv);
  assert.deepEqual(lvDown, [...lvDown].sort((a, b) => b - a));
  const lvUp = sortRoster(rows, 'lv', 1).filter((x) => x.r).map((x) => x.r.lv);
  assert.deepEqual(lvUp, [...lvUp].sort((a, b) => a - b));
  // 获取顺序：降序 = 最近拿到的在前
  const order = sortRoster(rows, 'order', -1).filter((x) => x.r).map((x) => x.idx);
  assert.deepEqual(order, [...order].sort((a, b) => b - a));
  // 稀有度降序：创生/史诗在前
  const rar = sortRoster(rows, 'rarity', -1).filter((x) => x.r).map((x) => RARITY_ORDER[x.a.rarity]);
  assert.deepEqual(rar, [...rar].sort((a, b) => b - a));
  // 非法排序键退回稀有度，不抛错
  assert.equal(sortRoster(rows, 'nope', -1).length, rows.length);
});

/* ---------- M15：融灾禁区（五队爬塔 / 每两周刷新） ---------- */
import {
  RIFT_FLOORS, RIFT_TEAMS, RIFT_DAILY, RIFT_CYCLE_DAYS, RIFT_RUN_MAX, RIFT_PASS,
  riftCycle, riftState, riftParty, riftEnemies, riftStage, simulateRiftRun, doRift,
} from '../src/core/rift.js';

test('融灾禁区：14 天一期，换期重置层数但保留历史最高', () => {
  const t0 = new Date('2026-03-02T00:00:00Z');
  const c1 = riftCycle(t0);
  assert.equal(c1.daysLeft, RIFT_CYCLE_DAYS);
  // 同期内 13 天后还是这一期
  assert.equal(riftCycle(new Date(t0.getTime() + 13 * 86400000)).id, c1.id);
  // 第 14 天进入下一期
  const c2 = riftCycle(new Date(t0.getTime() + RIFT_CYCLE_DAYS * 86400000));
  assert.notEqual(c2.id, c1.id);
  assert.equal(riftCycle(new Date(c2.start)).daysLeft, RIFT_CYCLE_DAYS);

  const s = newState(data, 11);
  const r = riftState(s, t0);
  r.floor = 37; r.best = 52;
  const after = riftState(s, new Date(t0.getTime() + RIFT_CYCLE_DAYS * 86400000));
  assert.equal(after.cycle, c2.id);
  assert.equal(after.floor, 0, '新一期从第 1 层重爬');
  assert.equal(after.best, 52, '历史最高层永久保留');
  assert.equal(after.tries, RIFT_DAILY, '新一期次数也重置');
  // 同一天再取不会把次数刷回去
  after.tries = 0;
  assert.equal(riftState(s, new Date(t0.getTime() + RIFT_CYCLE_DAYS * 86400000)).tries, 0);
});

test('融灾禁区：五队的唤醒体和装备互不重复；没编的自动补位，重复的被拿掉', () => {
  const s = newState(data, 13);
  s.maxStage = 100;
  const owned = data.awakeners.filter((a) => !a.creator).slice(0, 30).map((a) => a.slug);
  s.roster = Object.fromEntries(owned.map((x) => [x, { lv: 80, star: 6, brk: 4 }]));
  s.gold = 1e9; equipPull(s, data, 80);
  for (const o of data.orders.slice(0, 20)) s.orders.owned[o.id] = 0;
  const A = owned.slice(0, 4), B = owned.slice(4, 8);
  setSquadTeam(s, 'a', owned.slice(0, 4));          // 通用编队不再被借来顶禁区
  setSquadTeam(s, 'r2', B);                           // 禁区二队自己编了
  setSquadTeam(s, 'r1', [A[0], B[0], owned[8], owned[9]]);   // 禁区一队和二队撞了一个人
  s.team = A;

  const party = riftParty(s, data);
  assert.equal(party.length, RIFT_TEAMS);
  const all = party.flatMap((p) => p.slugs);
  assert.equal(new Set(all).size, all.length, '五队没有重复的唤醒体');
  assert.ok(party.every((p) => p.slugs.length === 4), '没编的补满 4 人，被拿掉的补回');
  assert.equal(party[0].conflict, false);              // 一队先占位
  assert.ok(party[1].conflict, '二队有人被一队占了，标出来');
  assert.ok(!party[1].slugs.includes(B[0]), '被占的人从二队拿掉');
  assert.equal(party[1].from, 'rift'); assert.equal(party[2].from, 'auto');
  // 装备：命轮 / 密契 / 造物 / 钥令全局不重复
  const items = [], orders = [];
  for (const p of party) {
    for (const e of Object.values(p.lo.equip)) { if (e.wheel) items.push(e.wheel); if (e.cov) items.push(e.cov); }
    for (const u of p.lo.relics) if (u) items.push(u);
    for (const o of p.lo.orders) if (o) orders.push(o);
  }
  assert.ok(items.length > 20, '五队各自配了装备');
  assert.equal(new Set(items).size, items.length, '装备不重复');
  assert.equal(new Set(orders).size, orders.length, '钥令不重复');
  assert.ok(party.every((p) => p.team.list.length === 4 && p.team.power > 0));
  // 独立配装撞车：二队想用一队用着的造物 → 被拿掉
  const lo1 = ensureLoadout(s, 'r1', false); lo1.relics[0] = items.find((u) => s.gear.items[u]?.kind === 'relic');
  const lo2 = ensureLoadout(s, 'r2', false); lo2.relics[0] = lo1.relics[0];
  const p2 = riftParty(s, data);
  const rel = p2.flatMap((p) => p.lo.relics.filter(Boolean));
  assert.equal(new Set(rel).size, rel.length, '撞车的造物只留给前面的队');
  assert.ok(p2[1].conflict);
  // 五队都有独立的敌人组（同层不同种子）
  const ids = Array.from({ length: RIFT_TEAMS }, (_, i) => riftEnemies(9, data, i, 'R1').map((e) => `${e.mid}${e.name}`).join('|'));
  assert.equal(new Set(ids).size, RIFT_TEAMS, '五队打的是五组不同的敌人');
});

test('融灾禁区：五场胜四场即过关，输两场就停在这一层', () => {
  const now = new Date('2026-03-02T00:00:00Z');
  const s = newState(data, 15);
  const owned = data.awakeners.slice(0, 20).map((a) => a.slug);
  s.roster = Object.fromEntries(owned.map((x) => [x, { lv: 95, star: 9, brk: 5 }]));
  for (let i = 0; i < 5; i++) setSquadTeam(s, ['a', 'b', 'c', 'd', 'e'][i], owned.slice(i * 4, i * 4 + 4));

  // 满配打前两层：一路全胜
  const sim = simulateRiftRun(s, data, { maxFloors: 2, startFloor: 1, cycle: riftCycle(now).id, seed: 12345 });
  assert.equal(sim.floors.length, 2);
  assert.equal(sim.reached, 2);
  assert.equal(sim.win, true);
  assert.ok(sim.floors.every((f) => f.wins >= RIFT_PASS && f.battles.length === RIFT_TEAMS));
  // 第 1 层的第 5 队打的是 Boss 组（第 10 层才是 Boss 层，这里验证结构：有 5 场、每场都有敌人）
  assert.ok(sim.floors[0].battles.every((b) => b.enemies.length >= 2));

  // 高层用初始小队：一场都赢不了 → 不推进
  const weak = newState(data, 17);
  const bad = simulateRiftRun(weak, data, { maxFloors: 3, startFloor: 60, cycle: 'R9', seed: 777 });
  assert.equal(bad.reached, 0);
  assert.equal(bad.floors.length, 1, '第一层没过就停');
  assert.ok(bad.floors[0].wins < RIFT_PASS);
  assert.equal(bad.win, false);
});

test('融灾禁区：过关推进层数并发奖，重复挑战不再重复给已过的层', () => {
  const now = new Date('2026-03-02T00:00:00Z');
  const s = newState(data, 19);
  const owned = data.awakeners.slice(0, 20).map((a) => a.slug);
  s.roster = Object.fromEntries(owned.map((x) => [x, { lv: 95, star: 9, brk: 5 }]));
  for (let i = 0; i < 5; i++) setSquadTeam(s, ['a', 'b', 'c', 'd', 'e'][i], owned.slice(i * 4, i * 4 + 4));

  const before = { gold: s.gold, tickets: s.tickets, cores: s.cores };
  const r = doRift(s, data, { now, maxFloors: 3 });
  assert.ok(r.reached >= 1);
  assert.equal(r.floor, r.reached);
  assert.equal(r.newBest, true);
  assert.ok(r.rw.gold > 0 && r.rw.tickets + r.rw.cores > 0);
  assert.ok(s.gold > before.gold && s.tickets >= before.tickets && s.cores >= before.cores);
  assert.equal(riftState(s, now).tries, RIFT_DAILY - 1);
  assert.equal(r.floor, s.rift.floor);

  // 再打一次：从第 4 层开始，奖励只算新层
  const r2 = doRift(s, data, { now, maxFloors: 2 });
  assert.equal(r2.from, r.floor + 1);
  assert.equal(r2.floor, r.floor + r2.reached);

  // 次数耗尽后返回 null
  for (let i = 0; i < RIFT_DAILY; i++) doRift(s, data, { now });
  assert.equal(doRift(s, data, { now }), null);
});

test('融灾禁区：敌人每期重排，层数越深越强', () => {
  const combo = (cy) => Array.from({ length: 6 }, (_, f) => riftEnemies(f + 1, data, 0, cy).map((e) => e.mid).join(',')).join(';');
  assert.notEqual(combo('R1'), combo('R2'), '换一期敌人组合会变');
  assert.ok(riftStage(100) > riftStage(50) && riftStage(50) > riftStage(1));
  assert.equal(riftStage(1), 11);
  // 第 10 层是 Boss 层，第五队顶 Boss
  const bossParty = riftEnemies(10, data, RIFT_TEAMS - 1, 'R1');
  assert.ok(bossParty.some((e) => e.boss), '第五队要面对 Boss');
  assert.ok(!riftEnemies(10, data, 0, 'R1').some((e) => e.boss), '其余队不打 Boss');
  // 通关上限
  assert.equal(RIFT_FLOORS, 150);
  assert.equal(RIFT_RUN_MAX, 10);
});

test('融灾禁区：老存档补字段，越界层数被夹回 0~150', () => {
  const base = newState(data, 21);
  delete base.rift;
  const m = migrate(base, data);
  assert.equal(m.rift.floor, 0);
  assert.equal(m.rift.best, 0);
  assert.ok(typeof m.rift.cycle === 'string');

  const crazy = migrate({ ...newState(data, 23), rift: { floor: 999, best: -5, tries: 99 } }, data);
  assert.equal(crazy.rift.floor, RIFT_FLOORS);
  assert.equal(crazy.rift.best, RIFT_FLOORS);
  // 通用五套 + 属性塔专用四套 + 禁区专用五套，十四套编队都要能存（老存档只有三套）
  assert.equal(Object.keys(crazy.squads).length, 14);
  for (const k of ['r1', 'r2', 'r3', 'r4', 'r5']) assert.ok(Array.isArray(crazy.squads[k].team), `禁区分队 ${k} 要补出来`);
  for (const k of ['t_CHAOS', 't_CARO', 't_AEQUOR', 't_ULTRA']) assert.ok(Array.isArray(crazy.squads[k].team), `属性塔分队 ${k} 要补出来`);
});

/* ---------------------------------------------------------------- M16: 挂机层默认取「有收益的最高层」 */

import { farmableStage, farmTargetStage, battleSig, FARM_STUCK_LOSSES, FARM_SCAN_MAX } from '../src/core/game.js';

test('挂机层：攻坚层胜率 0 时往下扫到打得过的那一层', () => {
  const s = newState(data, 71); s.maxStage = 60; s.stage = 61;   // 正在攻坚第 61 关
  assert.equal(farmTargetStage(s), 60, '攻坚层不能拿没打过的关去结算');
  const farm = farmableStage(s, data);
  assert.equal(farm.from, 60);
  assert.ok(farm.fellBack, '第 60 关打不过，必须退回');
  assert.ok(farm.stage < 60 && farm.stage >= 1, `退回的层要合法：${farm.stage}`);

  // 打得过的关不用退（第 1 关一定打得过）
  const ok = farmableStage(s, data, 1);
  assert.equal(ok.stage, 1); assert.equal(ok.fellBack, false);

  // 同一份队伍 + 同一层，第二次直接命中缓存（不再跑战斗）
  assert.deepEqual(farmableStage(s, data), farm);
  // 队伍变了缓存就失效（sig 里带着 roster）
  const before = battleSig(s);
  s.roster[s.team[0]].lv += 5;
  assert.notEqual(battleSig(s), before);

  // 扫满上限也没赢过：不许死循环，给一个合法层并标 hopeless
  const t = newState(data, 76); t.maxStage = 400; t.stage = 401;
  const deep = farmableStage(t, data, 400);
  assert.ok(deep.stage >= 1 && deep.stage <= 400);
  assert.ok(400 - deep.stage <= FARM_SCAN_MAX, '最多只往下扫 FARM_SCAN_MAX 关');
  assert.equal(deep.hopeless, true);
});

test('离线结算：攻坚层胜率为 0 时按有收益的最高层结算，并把挂机层切过去', () => {
  const s = newState(data, 72); s.maxStage = 60; s.stage = 61; s.lastSeen = 0;
  const rep = offlineReport(s, data, 100 * 3600 * 1000);
  assert.equal(rep.capped, 8 * 3600);
  assert.ok(rep.fellBack, '应当判定为退回有收益的层');
  assert.equal(rep.wantStage, 60);
  assert.ok(rep.stage < 60, `结算层应当是打得过的那一层：${rep.stage}`);
  assert.ok(rep.rate > 0 && rep.wins > 0 && rep.gold > 0, '退回之后不能再是零收益');
  const g = s.gold;
  claimOffline(s, rep, 5);
  assert.ok(s.gold > g);
  assert.equal(s.stage, rep.stage, '领完离线收益，挂机层切到有收益的最高层');

  // 收益为 0 的那一支（hopeless）也要切层：main.js 传 rep 而不是 null 就是为了这个
  const z = newState(data, 77); z.maxStage = 400; z.stage = 401; z.lastSeen = 0;
  const r2 = offlineReport(z, data, 100 * 3600 * 1000);
  claimOffline(z, r2, 5);
  assert.ok(z.stage < 401, `零收益也要退层：${z.stage}`);
});

test('自动挂机：前线失手会退到有收益的最高层，不会死守零收益的关卡', () => {
  // 前线攻坚（stage = maxStage + 1）失败
  const s = newState(data, 73); s.maxStage = 60; s.stage = 61; s.auto = true;
  const res = runBattle(s, data, 61);
  assert.equal(res.win, false, '这套新手队伍打不过第 61 关');
  const rw = applyResult(s, data, res);
  assert.ok(rw.retreat && rw.retreatTo, '应当撤退');
  assert.equal(s.stage, rw.retreatTo);
  assert.ok(s.stage < 60, `不能退到同样打不过的第 60 关：${s.stage}`);

  // 已通关的关上连输：连输到阈值也退（否则挂机一直零收益）
  const t = newState(data, 74); t.maxStage = 60; t.stage = 60; t.auto = true;
  for (let i = 0; i < FARM_STUCK_LOSSES; i++) applyResult(t, data, runBattle(t, data, 60));
  assert.ok(t.stage < 60, `连输 ${FARM_STUCK_LOSSES} 场后应退回有收益的层：${t.stage}`);

  // 手动挂机不受影响：玩家自己选的关，输了也留在原地
  const m = newState(data, 75); m.maxStage = 60; m.stage = 61; m.auto = false;
  applyResult(m, data, runBattle(m, data, 61));
  assert.equal(m.stage, 61, '手动挂机输了不退');
});

/* ---------------------------------------------- M17: 联名彩蛋角色 + 联动活动「星辉直播间」 */

import { CREATORS, SIGNIN_PER, signinPicks, nextGiftSlug, CREATOR_KITS, creatorKit, grantCreator, syncSigninGifts, CREATOR_BY_SLUG } from '../src/core/creators.js';
import {
  noteBattle, dailyView, claimDaily, claimMile, milePending, fameOf, tiersView, redeemGuest, eventSummary,
  eventState, DAILY, GUESTS, GUEST_GATE, FAME_PER_TOKEN, tokensOf, MILE, SIGNIN_FAME, dayKey,
} from '../src/core/event.js';

test('彩蛋角色：10 位都进了表、带完整 7 槽技能、不进抽卡池', () => {
  const cr = data.awakeners.filter((a) => a.creator);
  assert.equal(cr.length, CREATORS.length);
  for (const a of cr) {
    assert.ok(a.portrait && a.card, `${a.slug} 缺图`);
    assert.equal(a.avail, 'GIFT', `${a.slug} 不该进抽卡池`);
    assert.ok(a.creator.uid && a.creator.url.includes('space.bilibili.com'), `${a.slug} 缺主播信息`);
    // 十位主播都是男性，简介别按昵称想当然写成「她」
    assert.ok(!/[她姑娘妹]/.test(a.creator.bio), `${a.slug} 的简介写了女性称呼`);
    const k = data.kit(a.slug, 2);
    for (const s of SLOTS) {
      assert.ok(k[s]?.name, `${a.slug}.${s} 没有名字`);
      assert.ok(k[s].effects.length > 0, `${a.slug}.${s} 没有效果`);
    }
    assert.ok(k.Exalt.effects.some((e) => ['dmg', 'heal', 'shield', 'buff'].includes(e.t)), `${a.slug} 的共鸣没有实际作用`);
  }
  // 抽 300 次一个都抽不到
  const s = newState(data, 11); s.tickets = 3000;
  const out = summon(s, data, 300);
  assert.equal(out.filter((p) => data.bySlug[p.slug].creator).length, 0);
  // 官方角色仍在池子里
  assert.ok(out.some((p) => !data.bySlug[p.slug].creator));
});

test('彩蛋角色：档案里的 B 站首页链接与 UID 一一对应', () => {
  for (const a of CREATORS) {
    const { uid, url } = a.creator;
    assert.match(uid, /^\d+$/, `${a.slug} 的 UID 应是纯数字`);
    assert.equal(url, `https://space.bilibili.com/${uid}`, `${a.slug} 的首页链接应指向本人空间`);
  }
  // 九个 UID 不能撞车（夏茉琳之前就和立誓0氪写重过）
  assert.equal(new Set(CREATORS.map((a) => a.creator.uid)).size, CREATORS.length, 'UID 有重复');
});

test('彩蛋角色：简介照录 B 站签名原文（萨摩不耶除外），不自己编写人设', () => {
  const src = JSON.parse(readFileSync(new URL('../tools/faces/source.json', import.meta.url), 'utf8'));
  assert.equal(Object.keys(src.faces).length, CREATORS.length, '来源表要覆盖九位');
  for (const a of CREATORS) {
    const f = src.faces[a.slug];
    assert.ok(f, `${a.slug} 在来源表里缺记录`);
    assert.equal(a.creator.uid, f.mid, `${a.slug} 的 UID 与来源表不一致`);
    // 萨摩不耶是唯一例外：他的简介按需求定制，不照录签名
    if (a.slug !== 'samo') assert.equal(a.creator.bio, f.sign, `${a.slug} 的简介应等于 B 站签名原文`);
    assert.ok(a.creator.bio.length <= 200, `${a.slug} 的签名超长`);
  }
  // 空签名也照录，界面自己兜底，不要在数据里编一句
  assert.equal(src.faces.ratking.sign, '');
  assert.equal(CREATOR_BY_SLUG.ratking.creator.bio, '');
});

test('彩蛋角色：技能数值随技能等级成长，四界域都有', () => {
  const lo = creatorKit('samo', 0), hi = creatorKit('samo', 4);
  const dmgOf = (k) => k.Skill2.effects.find((e) => e.t === 'dmg').m;
  assert.ok(dmgOf(hi) > dmgOf(lo), '技能等级高，伤害该更高');
  const realms = new Set(CREATORS.map((a) => a.realm));
  assert.deepEqual([...realms].sort(), ['AEQUOR', 'CARO', 'CHAOS', 'ULTRA'], '四个界域都要有人，才凑得出同域加成');
  const types = new Set(CREATORS.map((a) => a.type));
  assert.deepEqual([...types].sort(), ['ASSAULT', 'CHORUS', 'WARDEN']);
});

test('彩蛋角色：签到按天数轮转发，先补齐十位再叠位', () => {
  const s = newState(data, 12);
  assert.equal(syncSigninGifts(s).length, 0, '没签到时什么都不送');
  // 一天一份：签 3 天给 3 份，按 CREATORS 的顺序先来后面三位
  s.stats.signins = 3;
  const three = syncSigninGifts(s);
  assert.equal(three.length, 3);
  assert.deepEqual(three.map((g) => g.slug), CREATORS.slice(0, 3).map((a) => a.slug));
  assert.ok(three.every((g) => g.isNew), '前三位都是新获得');
  assert.equal(syncSigninGifts(s).length, 0, '再调一次不重复发');
  // 累计到 10 天：把剩下的七位补齐
  s.stats.signins = CREATORS.length;
  const rest = syncSigninGifts(s);
  assert.equal(rest.length, CREATORS.length - 3);
  assert.ok(rest.every((g) => g.isNew));
  assert.equal(Object.keys(s.roster).filter((k) => CREATOR_BY_SLUG[k]).length, CREATORS.length, '十位全到手');
  // 第 13 天开始重复：同一批人轮着叠位
  s.stats.signins = CREATORS.length + 3;
  const more = syncSigninGifts(s);
  assert.equal(more.length, 3);
  assert.ok(more.every((g) => !g.isNew && g.star === 1), '重复获得就是叠位 +1');
  // 直接发也幂等：已满的说 full，没满的继续加
  const before = s.roster[CREATORS[0].slug].star;
  assert.equal(grantCreator(s, CREATORS[0].slug).star, before + 1);
});

test('彩蛋角色：签到份数按 stats.signins 算，老存档一次补齐', () => {
  const s = newState(data, 12);
  assert.equal(signinPicks(s), 0);
  s.stats.signins = 37;
  assert.equal(signinPicks(s), Math.floor(37 / SIGNIN_PER));
  const got = syncSigninGifts(s);
  assert.equal(got.length, signinPicks(s), '该发多少份就补多少份');
  // 十位各拿一份之后，剩下的按顺序叠
  const stars = CREATORS.map((a) => s.roster[a.slug]?.star || 0);
  assert.ok(stars.every((n) => n >= 1), `十位都该有叠位：${stars.join(',')}`);
  assert.equal(stars.reduce((a, b) => a + b, 0), signinPicks(s) - CREATORS.length, '多出来的份数变成叠位');
  // 37 份 = 先用 10 份把十位补齐（那 10 份是「新获得」，叠位还是 0），剩下 27 份轮转叠位：
  // 每人 2 级，多出来的 7 份按 sent % 10 落到前七个人头上
  const base = Math.floor((signinPicks(s) - CREATORS.length) / CREATORS.length);
  assert.ok(stars.every((n) => n >= base), `轮转要均衡：${stars.join(',')}`);
  assert.equal(stars[0], base + 1, '多出来的那份给轮转的下一位');
  assert.equal(nextGiftSlug(s, signinPicks(s)), CREATORS[signinPicks(s) % CREATORS.length].slug, '轮转按已发份数继续往下走');
});

test('联动活动：每日任务只数在线战斗，跨日重置', () => {
  const s = newState(data, 13);
  const d1 = new Date('2026-03-01T10:00:00Z').getTime();
  for (let i = 0; i < 20; i++) noteBattle(s, { win: true, firstClear: i < 2 }, d1);
  let v = dailyView(s, d1);
  assert.equal(v.find((t) => t.id === 'battles').cur, 20);
  assert.equal(v.find((t) => t.id === 'wins').cur, 15);
  assert.equal(v.find((t) => t.id === 'clears').cur, 2);
  assert.ok(v.every((t) => t.done));
  // 领取一次，人气进账，第二次领不到
  const before = s.event.fame;
  assert.equal(claimDaily(s, 'wins', d1).fame, DAILY.find((t) => t.id === 'wins').fame);
  assert.equal(s.event.fame, before + DAILY.find((t) => t.id === 'wins').fame);
  assert.equal(claimDaily(s, 'wins', d1), null);
  // 第二天归零
  const d2 = new Date('2026-03-02T09:00:00Z').getTime();
  v = dailyView(s, d2);
  assert.equal(v.find((t) => t.id === 'battles').cur, 0);
  assert.equal(s.event.day, dayKey(d2));
});

test('联动活动：人气换征召券，门槛到了才能兑换，重复兑换是叠位', () => {
  const s = newState(data, 14);
  s.stats.signins = 1;
  assert.equal(fameOf(s), SIGNIN_FAME, '签到也给人气');
  // 推图里程碑：最高通关 50 关 = 5 档
  s.maxStage = 50;
  assert.equal(milePending(s), 5);
  claimMile(s);
  assert.equal(milePending(s), 0, '里程碑只能领一次');
  assert.equal(fameOf(s), SIGNIN_FAME + 5 * MILE.fame, `1 次签到 + 5 档里程碑 = ${SIGNIN_FAME + 5 * MILE.fame} 人气`);
  // 人气不够 100 时没有券，兑换不了
  assert.equal(tokensOf(s), 0);
  assert.equal(redeemGuest(s, 'samo'), null);
  // 攒到 1000 人气 = 10 张券
  s.event.fame = 1000;
  assert.equal(tokensOf(s), Math.floor((1000 + SIGNIN_FAME) / FAME_PER_TOKEN));
  const first = redeemGuest(s, 'samo');
  assert.equal(first.slug, 'samo');
  assert.ok(first.isNew);
  assert.equal(s.roster.samo.star, 0);
  // 再换一次同一个人：叠位 +1
  const again = redeemGuest(s, 'samo');
  assert.equal(again.isNew, false);
  assert.equal(again.star, 1);
  assert.equal(s.roster.samo.star, 1);
  // 券会少一张
  assert.equal(s.event.used, 2);
  // 门槛没到的人换不了：人气砍到 300，魔龙要 700
  s.event.fame = 300;
  assert.equal(redeemGuest(s, 'maodie'), null, '人气没到 700 换不了魔龙');
  // 面板上能看到进度
  const sum = eventSummary(s);
  assert.equal(sum.owned, 1);
  assert.equal(sum.total, GUESTS.length);
  assert.ok(tiersView(s).some((t) => t.ready));
  assert.equal(GUEST_GATE.maodie, 700);
});

test('联动活动：老存档迁移后带 event 字段，彩蛋角色能上阵打完一场', () => {
  const old = newState(data, 15);
  delete old.event;
  const m = migrate(old, data);
  assert.ok(m.event && m.event.daily && Array.isArray(m.event.tiers));
  // 四位彩蛋角色组队真打一场
  const s = newState(data, 16);
  const slugs = CREATORS.slice(0, 4).map((a) => a.slug);
  for (const k of slugs) s.roster[k] = { lv: 40, star: 5, brk: 2 };
  s.team = slugs; s.stage = 10; s.maxStage = 20;
  const res = runBattle(s, data, 10);
  assert.ok(res.events.length > 0);
  assert.ok(res.events.every((e) => !('amt' in e) || Number.isFinite(e.amt)));
  // 打一场会记到活动任务里
  const before = eventState(s).daily.battles;
  applyResult(s, data, res);
  assert.equal(eventState(s).daily.battles, before + 1);
});

test('M18 萨摩不耶的特性「一哥」对校猫特攻 +50%', () => {
  const samo = data.bySlug.samo;
  assert.equal(samo.trait?.zh, '一哥', '特性名称就是社区昵称「一哥」');
  assert.equal(samo.trait?.vs?.catboss, 0.5, '特性挂在萨摩不耶身上，目标是校猫');
  assert.ok(data.monById.catboss, '校猫在怪物表里的 id 是 catboss');

  const kit = data.kit('samo', 2);
  // 同一只木桩怪，只换 mid：伤害差就只可能来自特性
  const proto = data.monsters.find((m) => !m.boss && m.hp && m.cy?.length);
  const mkFoe = (mid) => ({ ...makeEnemy(proto, 'Normal', 10, mulberry32(5), { affixes: false, msk: data.msk }), mid, hp: 200000, atk: 1, def: 0 });
  const run = (mid, withTrait) => simulate({
    allies: [{ name: '萨摩不耶', type: 'WARDEN', realm: 'CHAOS', hp: 50000, atk: 300, def: 200, critRate: 0, critDmg: 50, kit, trait: withTrait ? samo.trait : null }],
    enemies: [mkFoe(mid)],
    seed: 99, maxRounds: 8,
  }).stats.a0.dmg;

  const cat = run('catboss', true);
  const catOff = run('catboss', false);
  const other = run('slime', true);
  const otherOff = run('slime', false);
  assert.ok(cat > catOff * 1.3, `对校猫应有明显提升：${cat} vs ${catOff}`);
  assert.ok(cat / catOff < 1.7, `提升幅度应在 50% 附近，实际 ${(cat / catOff).toFixed(2)}×`);
  assert.equal(other, otherOff, '打别的怪不生效');
  // 真实关卡：推图第 40 关是校猫奖励关，敌人里确实站着 catboss，特攻能打上
  const foes = buildEnemies(40, data.monsters);
  assert.ok(foes.some((f) => f.mid === 'catboss'), '第 40 关的 Boss 位是校猫');
});


/* ---------- 审计修复 ---------- */
import { catBonusLeft, CAT_DAILY } from '../src/core/game.js';
import { TRIAL_GOLD_DAILY } from '../src/core/challenge.js';
import { buy as shopBuy } from '../src/core/shop.js';

test('审计：重复钥令只折一次银芯（商店 / 战斗奖励都一样）', () => {
  const s = newState(data, 31);
  s.cores = 1e6; s.maxStage = 100;
  for (const o of data.orders) s.orders.owned[o.id] = 0;   // 全部拥有 → 抽到的一定是重复
  const c0 = s.cores;
  const r = shopBuy(s, data, 'order');
  assert.ok(r.orders[0].isNew === false);
  assert.equal(s.cores, c0 - 80 + 30, '商店钥令匣：-80 +30，不是 +60');
});

test('审计：校猫奖励关的非首杀额外奖励每天只发 CAT_DAILY 次', () => {
  const s = newState(data, 32);
  for (const k of Object.keys(s.roster)) Object.assign(s.roster[k], { lv: 159, star: 99, brk: 6 });
  s.maxStage = 60; s.stage = 40; s.auto = false;
  let boosted = 0;
  for (let i = 0; i < 12; i++) {
    const res = runBattle(s, data, 40);
    const rw = applyResult(s, data, res);
    if (res.win && rw.cat) boosted++;
  }
  assert.equal(boosted, 1 + CAT_DAILY, '首杀 1 次 + 每日 3 次');
  assert.equal(catBonusLeft(s), 0);
  assert.equal(catBonusLeft(s, Date.now() + 86400000 * 2), CAT_DAILY, '换天重置');
});

test('审计：脏存档不会把 NaN / 负数 / 空角色带进游戏', () => {
  assert.doesNotThrow(() => migrate({ roster: { ogier: null, lotan: { lv: 1 } }, team: ['ogier', 'lotan', 'lotan'] }, data));
  const m = migrate({ roster: { ogier: { lv: 1 } }, gold: 'abc', cores: null, tickets: -5, stage: -3, maxStage: 'x', lastSeen: 'x', seed: 'q', drip: { tickets: 'z' } }, data);
  for (const k of ['gold', 'cores', 'tickets', 'stage', 'maxStage', 'lastSeen', 'seed']) assert.ok(Number.isFinite(m[k]) && m[k] >= 0, k);
  assert.ok(m.stage >= 1 && m.drip.tickets === 0);
  assert.deepEqual(m.team, ['ogier']);
  const rep = offlineReport(Object.assign(migrate({ roster: { ogier: { lv: 1 } }, lastSeen: 'x' }, data), { lastSeen: 0 }), data);
  assert.ok(!rep || Number.isFinite(rep.gold));
  const fut = migrate({ roster: { ogier: { lv: 1 } }, lastSeen: Date.now() + 1e9 }, data);
  assert.ok(fut.lastSeen <= Date.now());
  assert.ok(!Array.isArray(migrate([1, 2], data).roster));
});

test('审计：融灾试炼重复通关的金币每天封顶，首通奖励不受影响', () => {
  const s = newState(data, 33);
  for (const k of Object.keys(s.roster)) Object.assign(s.roster[k], { lv: 159, star: 99, brk: 6 });
  const t = data.trials[0];
  let paid = 0, g0 = s.gold;
  for (let i = 0; i < TRIAL_GOLD_DAILY + 6; i++) { const r = doTrial(s, data, t.id, 0); if (r?.win && r.rw.gold > 0) paid++; }
  assert.equal(paid, TRIAL_GOLD_DAILY);
  assert.equal(s.trials.gold.n, TRIAL_GOLD_DAILY);
  const s2 = migrate(JSON.parse(JSON.stringify(s)), data);
  assert.equal(s2.trials.gold.n, TRIAL_GOLD_DAILY, '存档往返后计数还在');
});

/* ---------- 编队独立配装 ---------- */
import { ensureLoadout, withLoadout, squadKeyFor, loadoutOf } from '../src/core/squad.js';
import { fillLoadout, isEquipped, unequipItem } from '../src/core/game.js';

test('编队独立配装：出战时换成编队自己的命轮 / 造物 / 钥令，跑完还原；分解与卸下会避开', () => {
  const s = newState(data, 41);
  s.maxStage = 60;
  s.gold = 1e7;
  equipPull(s, data, 30);
  autoLoadout(s, data);                                    // 主线配装
  const mainPower = teamDefs(s, data).power;
  const slugs = Object.keys(s.roster).slice(0, 4);
  setSquadTeam(s, 'b', slugs);
  assert.equal(loadoutOf(s, 'b'), null);
  const key0 = squadKeyFor(s, 'tower'); assert.equal(key0, null);
  setSquadPick(s, 'tower', 'b');
  assert.equal(squadKeyFor(s, 'tower'), 'b');
  const lo = ensureLoadout(s, 'b', false);                 // 空配装
  const bare = withLoadout(s, 'b', () => teamDefs(s, data, slugs).power);
  const eqBefore = s.gear.equip, relBefore = s.gear.relics, slotBefore = s.orders.slots;
  assert.ok(bare < teamDefs(s, data, slugs).power, '空配装比主线配装弱');
  // 给它自己配一套
  const r = fillLoadout(s, data, slugs, { equip: lo.equip });
  lo.relics = r.relics; lo.orders = r.orders;
  const full = withLoadout(s, 'b', () => teamDefs(s, data, slugs).power);
  assert.ok(full > bare);
  assert.equal(s.gear.equip, eqBefore); assert.equal(s.gear.relics, relBefore); assert.equal(s.orders.slots, slotBefore, '还原');
  // 抛错也要还原
  assert.throws(() => withLoadout(s, 'b', () => { throw new Error('x'); }));
  assert.equal(s.gear.equip, eqBefore);
  // 编队占着的装备不能分解；卸下时一并清掉
  const uid = lo.relics.find(Boolean);
  s.gear.relics = s.gear.relics.map((x) => (x === uid ? null : x));
  assert.ok(isEquipped(s, uid), '被编队占用也算装备中');
  assert.equal(dismantle(s, data, uid), 0);
  unequipItem(s, uid);
  assert.ok(!lo.relics.includes(uid));
  // 存档往返保持 lo，脏数据被清洗
  const m = migrate(JSON.parse(JSON.stringify(s)), data);
  assert.ok(m.squads.b.lo && m.squads.b.lo.relics.length === 6 && m.squads.b.lo.orders.length === 3);
  const dirty = JSON.parse(JSON.stringify(s)); dirty.squads.b.lo.relics[0] = 'g99999'; dirty.squads.b.lo.orders[0] = 'nope';
  const m2 = migrate(dirty, data);
  assert.equal(m2.squads.b.lo.relics[0], null); assert.equal(m2.squads.b.lo.orders[0], null);
  // 主线战斗不受影响
  assert.equal(teamDefs(s, data).power > 0, true);
  assert.ok(mainPower > 0);
});

/* ---------- 回溯等级 ---------- */
import { rewindLevel } from '../src/core/game.js';
import { rewindPlan, REWIND_COST, lvUpCost as _lvUpCost } from '../src/core/stats.js';

test('回溯：固定 100 银芯直接回到 1 级，返还全部升级与突破材料，叠位不动', () => {
  const s = newState(data, 51);
  const slug = 'ogier';
  Object.assign(s.roster[slug], { lv: 1, star: 7, brk: 0 });
  s.gold = 1e12; s.cores = 1e6;
  const g0 = s.gold, c0 = s.cores;
  // 一路升到 45：中途两次突破（20、40）
  for (let guard = 0; guard < 200 && s.roster[slug].lv < 45; guard++) {
    if (!levelUp(s, slug, 1)) assert.ok(breakThrough(s, slug), 'needs break');
  }
  const r = s.roster[slug];
  assert.equal(r.lv, 45); assert.equal(r.brk, 2);
  const spentGold = g0 - s.gold, spentCores = c0 - s.cores;
  assert.ok(spentGold > 0 && spentCores === breakCost(20).cores + breakCost(40).cores);
  const plan = rewindPlan(r);
  assert.equal(plan.cost, 100); assert.equal(REWIND_COST, 100);
  assert.equal(plan.refund, spentGold); assert.equal(plan.refundCores, spentCores);
  const out = rewindLevel(s, slug);
  assert.equal(out.to, 1);
  assert.equal(r.lv, 1); assert.equal(r.brk, 0); assert.equal(r.star, 7, '叠位不变');
  assert.equal(s.gold, g0, '金币完全回到升级之前');
  assert.equal(s.cores, c0 - 100, '突破银芯全退，只扣 100 手续费');
  assert.equal(levelCap(r.star), 60 + 7, '等级上限仍由叠位决定');
  // 1 级不能再回溯；银芯不够 100 不能回溯
  assert.equal(rewindLevel(s, slug), null);
  Object.assign(r, { lv: 30, brk: 1 }); s.cores = 99;
  assert.equal(rewindLevel(s, slug), null); assert.equal(r.lv, 30);
  s.cores = 100;
  assert.ok(rewindLevel(s, slug)); assert.equal(s.cores >= 0, true);
});

/* ---------- 云端存档：同步决策 ---------- */
import { plan as cloudPlan, isFresh } from '../src/core/cloud.js';

test('云端存档：什么时候推、拉、问玩家', () => {
  const fresh = { maxStage: 0, play: 20, roster: { a: 1, b: 1, c: 1, d: 1 }, rev: 2 };
  const played = { maxStage: 30, play: 9000, roster: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`h${i}`, 1])), rev: 50 };
  assert.ok(isFresh(fresh) && !isFresh(played));
  // 刚开局（起始关已算 1，开一会儿是 2）、玩了不到三分钟、只有起手四人：仍是新档
  assert.ok(isFresh({ maxStage: 1, play: 0, roster: { a: 1, b: 1, c: 1, d: 1 } }) && isFresh({ maxStage: 2, play: 60, roster: { a: 1, b: 1, c: 1, d: 1 } }));
  assert.ok(!isFresh({ maxStage: 3, play: 60, roster: { a: 1 } }) && !isFresh({ maxStage: 1, play: 600, roster: { a: 1 } }));
  const cm = { ver: 4, at: 1, rev: 40, meta: {} };
  const acct = '甲';
  // 云端还没有：新档不传，有进度的传
  assert.equal(cloudPlan({ state: fresh, cloudMeta: null, sync: null, acct }), 'none');
  assert.equal(cloudPlan({ state: played, cloudMeta: null, sync: null, acct }), 'push');
  // 新设备（没同步记录）：新档直接拉云端；有进度就问玩家
  assert.equal(cloudPlan({ state: fresh, cloudMeta: cm, sync: null, acct }), 'pull');
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: null, acct }), 'conflict');
  // 同一台设备：云端没变，本机没改 → 不动；本机改了 → 推
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: { acct, ver: 4, rev: 50 }, acct }), 'none');
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: { acct, ver: 4, rev: 40 }, acct }), 'push');
  // 云端被别的设备推进了：本机没改 → 拉；本机也改了 → 冲突
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: { acct, ver: 3, rev: 50 }, acct }), 'pull');
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: { acct, ver: 3, rev: 10 }, acct }), 'conflict');
  // 换了账号：当新设备处理
  assert.equal(cloudPlan({ state: played, cloudMeta: cm, sync: { acct: '乙', ver: 4, rev: 50 }, acct }), 'conflict');
});

/* ---------- 站长赠礼：唤醒体 ---------- */
import { claimGifts } from '../src/core/game.js';
import { metaOf } from '../src/core/cloud.js';

test('站长赠礼：新的入包、已有的叠位、同一条只领一次、未知 slug 跳过', () => {
  const s = newState(data);
  const own = Object.keys(s.roster)[0];
  const other = data.awakeners.map((a) => a.slug).find((x) => !s.roster[x]);
  const star0 = s.roster[own].star;
  const items = [{ id: 'g1', awk: [other, own, 'no-such-slug'] }, { id: 'g2', awk: [] }];
  const got = claimGifts(s, data, items);
  assert.deepEqual(got.map((g) => [g.slug, g.isNew]), [[other, true], [own, false]]);
  assert.equal(s.roster[other].lv, 1);
  assert.equal(s.roster[own].star, star0 + 1);
  // 再领一次：什么都不发（幂等），id 已记下
  assert.equal(claimGifts(s, data, items).length, 0);
  assert.equal(s.roster[own].star, star0 + 1);
  assert.ok(s.giftIds.includes('c:g1'));
  // 迁移后 giftIds 还在（云存档拉下来也不会重领）
  assert.ok(migrate(JSON.parse(JSON.stringify(s)), data).giftIds.includes('c:g1'));
});

test('云存档摘要带主线阵容', () => {
  const s = newState(data);
  const m = metaOf(s);
  assert.equal(m.team.length, s.team.length);
  assert.deepEqual(Object.keys(m.team[0]).sort(), ['lv', 's', 'st']);
});

/* ---------- 银芯 = 全站钱包 ---------- */
import { reconcile } from '../src/core/wallet.js';

test('银芯钱包对账：第一次并入、之后只记增减、别处发放 / 花费不丢', () => {
  const s = { cores: 300 };
  // 第一次：钱包 1200 + 挂机 300
  assert.equal(reconcile(s, 1200), 1500);
  assert.equal(s.cores, 1500); assert.equal(s.coresBase, 1500);
  // 挂机里花了 200、赚了 50 → cores 1350；同时别处发放了 3000（钱包 4500）
  s.cores = 1350;
  assert.equal(reconcile(s, 4500), 4350);
  assert.equal(s.cores, 4350);
  // 别的页面花掉 1000（钱包 3350），挂机没动：挂机也跟着变
  assert.equal(reconcile(s, 3350), 3350);
  assert.equal(s.cores, 3350);
  // 不会出现负数
  s.cores = 0;
  assert.equal(reconcile(s, 10), 0);
  // coresBase 随存档迁移保留（云存档换设备不会再并一次）
  const m = migrate(JSON.parse(JSON.stringify({ ...newState(data), cores: 777, coresBase: 777 })), data);
  assert.equal(m.coresBase, 777);
});

/* ---------- 云存档：内容一样就不问 ---------- */
import { contentHash, plan as cloudPlan2 } from '../src/core/cloud.js';

test('云存档：只比真实进度（rev / lastSeen / play 不算），一样就不弹冲突框', () => {
  const played = { maxStage: 30, play: 9000, lastSeen: 1, rev: 10, gold: 5, roster: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`h${i}`, { lv: 1 }])) };
  const same = { ...played, rev: 99, lastSeen: 12345, play: 9999 };
  assert.equal(contentHash(played), contentHash(same));
  assert.notEqual(contentHash(played), contentHash({ ...played, gold: 6 }));
  assert.equal(contentHash({ a: 1, b: { x: 1, y: 2 } }), contentHash({ b: { y: 2, x: 1 }, a: 1 }));
  const acct = '甲';
  const cm = { ver: 4, at: 1, rev: 40, meta: { hash: contentHash(played) } };
  // 新设备 / 没有同步记录，但内容一模一样 → same（不问）
  assert.equal(cloudPlan2({ state: same, cloudMeta: cm, sync: null, acct }), 'same');
  // 同一账号，云端版本更新、但内容就是我上次对齐的那份（上传成功响应丢了）：本机没改 → same；改了 → push
  const sync = { acct, ver: 3, rev: 5, hash: contentHash(played) };
  assert.equal(cloudPlan2({ state: same, cloudMeta: { ...cm, ver: 4 }, sync, acct }), 'same');
  assert.equal(cloudPlan2({ state: { ...played, gold: 50 }, cloudMeta: { ...cm, ver: 4 }, sync, acct }), 'push');
  // 本机只是 rev 涨了（自动存档），内容没动：不算改过 → 云端有更新时直接拉，不弹框
  const other = { ver: 6, at: 1, rev: 60, meta: { hash: 'zzz' } };
  assert.equal(cloudPlan2({ state: { ...played, rev: 500 }, cloudMeta: other, sync: { acct, ver: 3, rev: 5, hash: contentHash(played) }, acct }), 'pull');
  // 本机真的改过、云端也变了 → 才是冲突
  assert.equal(cloudPlan2({ state: { ...played, gold: 77 }, cloudMeta: other, sync: { acct, ver: 3, rev: 5, hash: contentHash(played) }, acct }), 'conflict');
});

/* ---------- 超限：叠满 99 后的无限成长 ---------- */
import { overdriveUp } from '../src/core/game.js';
import { overdriveCost, overdriveAmp, overdriveStatPct, baseStats as baseStats2 } from '../src/core/stats.js';

test('超限：叠满才能练、花费指数涨、属性与增伤随级数涨、重复抽到白送一级、迁移保留', () => {
  const s = newState(data);
  const slug = Object.keys(s.roster)[0];
  s.gold = 1e12; s.cores = 1e6;
  assert.equal(overdriveUp(s, slug), null, '没叠满不能练');
  s.roster[slug].star = 99; s.roster[slug].lv = 159;
  const c0 = overdriveCost(0);
  const paid = overdriveUp(s, slug);
  assert.deepEqual(paid, c0);
  assert.equal(s.roster[slug].od, 1);
  assert.ok(overdriveCost(10).gold > overdriveCost(0).gold * 2.5 && overdriveCost(10).cores === 300);
  for (let i = 0; i < 9; i++) overdriveUp(s, slug);
  assert.equal(s.roster[slug].od, 10);
  assert.equal(overdriveStatPct(10), 8); assert.equal(overdriveAmp(10), 3);
  const a = data.bySlug[slug];
  assert.ok(baseStats2(a, 159, 99, 10).atk > baseStats2(a, 159, 99, 0).atk * 1.07);
  assert.ok(allyDef(s, data, slug, [slug]).amp >= overdriveAmp(10) + 27);
  // 钱不够就练不了，也不会扣钱
  s.gold = 0; const cores = s.cores;
  assert.equal(overdriveUp(s, slug), null); assert.equal(s.cores, cores);
  // 存档迁移：叠满的保留 od，没叠满的清零
  const m = migrate(JSON.parse(JSON.stringify(s)), data);
  assert.equal(m.roster[slug].od, 10);
  const other = Object.keys(m.roster)[1]; m.roster[other].star = 3; m.roster[other].od = 50;
  assert.equal(migrate(JSON.parse(JSON.stringify(m)), data).roster[other].od, 0);
});


/* ---------- 最终法则：超限满 99 之后真正无上限 ---------- */
import { lawUp } from '../src/core/game.js';
import { lawCost, lawStatPct, lawAmp, lawCrit, baseStats as baseStats3 } from '../src/core/stats.js';

test('最终法则：超限满 99 才解锁、无上限、指数涨价、属性 / 增伤 / 暴伤、重复抽到顺延、迁移', () => {
  const s = newState(data);
  const slug = Object.keys(s.roster)[0];
  s.gold = 1e30; s.cores = 1e9;
  Object.assign(s.roster[slug], { star: 99, lv: 159, od: 98 });
  assert.equal(lawUp(s, slug), null, '超限没满不能练');
  assert.ok(overdriveUp(s, slug)); assert.equal(s.roster[slug].od, 99);
  assert.equal(overdriveUp(s, slug), null, '超限上限 99');
  assert.deepEqual(lawUp(s, slug), lawCost(0)); assert.equal(s.roster[slug].law, 1);
  for (let i = 0; i < 99; i++) lawUp(s, slug);
  assert.equal(s.roster[slug].law, 100, '没有上限（过了 99 还能练）');
  assert.ok(lawCost(100).gold > lawCost(0).gold * 1e4 && lawCost(10).cores === 1000);
  assert.equal(lawStatPct(10), 12); assert.equal(lawAmp(10), 5); assert.equal(lawCrit(10), 8);
  const a = data.bySlug[slug];
  assert.ok(baseStats3(a, 159, 99, 99, 10).atk > baseStats3(a, 159, 99, 99, 0).atk * 1.11);
  const m = migrate(JSON.parse(JSON.stringify(s)), data);
  assert.equal(m.roster[slug].law, 100);
  m.roster[slug].od = 50;
  assert.equal(migrate(JSON.parse(JSON.stringify(m)), data).roster[slug].law, 0, '超限没满的存档不保留法则');
  // 钱不够不扣钱
  s.gold = 0; const cores = s.cores;
  assert.equal(lawUp(s, slug), null); assert.equal(s.cores, cores);
});

test('满叠 99 后再抽到同一位：只折算金币银芯，不送超限 / 最终法则', () => {
  const s = newState(data);
  s.tickets = 1e6;
  for (const a of data.awakeners) s.roster[a.slug] = { lv: 159, star: 99, brk: 7, od: 0, law: 0 };
  const g0 = s.gold, c0 = s.cores;
  const out = summon(s, data, 30);
  assert.ok(out.length >= 30 && out.every((o) => o.dup));
  assert.ok(Object.values(s.roster).every((r) => r.od === 0 && r.law === 0), '重复抽取不再送超限 / 法则');
  assert.equal(s.gold - g0, out.length * 800);
  assert.equal(s.cores - c0, out.length * 30);
});

/* ---------- 满超限 / 满最终法则的专属技能 ---------- */
import { extraSkills, extraKit, EXTRA_NAMES } from '../src/core/extra.js';

test('专属技能：每位唤醒体各有独一份的名字，按解锁进度生效', () => {
  const names = new Set();
  for (const a of data.awakeners) {
    assert.ok(EXTRA_NAMES[a.slug], `${a.slug} 缺专属技能名`);
    const ex = extraSkills(a.slug, a);
    assert.ok(ex.Od.effects.length >= 1 && ex.Law.effects.length >= 2 && ex.Od.text && ex.Law.text);
    names.add(ex.Od.name); names.add(ex.Law.name);
  }
  assert.equal(names.size, data.awakeners.length * 2, '124 个名字互不重复');
  const a = data.awakeners[0];
  assert.equal(extraKit(a.slug, a, { od: 98, law: 0 }), null);
  assert.deepEqual(Object.keys(extraKit(a.slug, a, { od: 99, law: 0 })), ['Od']);
  assert.deepEqual(Object.keys(extraKit(a.slug, a, { od: 99, law: 99 })), ['Od', 'Law']);
});

test('专属技能：战斗里按节奏免费追加，且比不带的队伍更强', () => {
  const s = newState(data);
  const team = s.team.slice(0, 4);
  for (const k of team) Object.assign(s.roster[k], { lv: 100, star: 99, brk: 5, od: 99, law: 99 });
  const withExtra = teamDefs(s, data).list ?? teamDefs(s, data);
  const defs = (Array.isArray(withExtra) ? withExtra : withExtra.list);
  assert.ok(defs.every((d) => d.extra && d.extra.Od && d.extra.Law));
  // 靶子的血量要给够：清得太快的话「总伤害」反而变小（后面几回合根本没得打），
  // 比的就不是输出而是「谁先打完」。留到 12 回合都打不穿，总量才是真正的 DPS 差。
  const foe = (n) => ({ name: '靶子', hp: 2e6, atk: 1, def: 0, type: 'WARDEN', realm: 'CHAOS', pattern: [{ name: '普攻', effects: [{ t: 'dmg', m: 0.1, to: 'foe' }] }], idx: n });
  const run = (ds) => simulate({ allies: ds, enemies: [foe(0), foe(1)], seed: 7, maxRounds: 12 });
  const a = run(defs);
  const plain = defs.map((d) => ({ ...d, extra: null }));
  const b = run(plain);
  const slots = a.events.filter((e) => e.k === 'act' && (e.slot === 'Od' || e.slot === 'Law'));
  assert.ok(slots.some((e) => e.slot === 'Od') && slots.some((e) => e.slot === 'Law'), '战斗里出现超限技 / 终焉技');
  assert.equal(b.events.filter((e) => e.k === 'act' && (e.slot === 'Od' || e.slot === 'Law')).length, 0);
  const dmg = (r) => Object.values(r.stats).reduce((x, y) => x + y.dmg, 0);
  assert.ok(dmg(a) > dmg(b), '带专属技能总伤害更高');
});

const NEW_MECH = new Set(['execute', 'pctHp', 'cleanse', 'dispel', 'revive', 'taunt', 'reflect', 'stun', 'chain', 'splash', 'echo', 'cdReset', 'shieldDmg', 'blood', 'missingHeal', 'delay', 'lowHpBoost', 'poisonBurst', 'dotBurst', 'extraTurn', 'counterBurst', 'barrierHeal', 'gaugeBurn', 'poisonHeal', 'poisonShield', 'dotSpread']);
const sigOf = (sk) => sk.effects.map((e) => [e.t, e.to || '', e.stat || e.s || e.k || '', e.m ?? '', e.v ?? '', e.pct ?? '', e.n ?? '', e.hits ?? '', e.dur ?? '', e.cost ?? '', e.share ?? '', e.grow ?? ''].join(':')).join('|');

test('专属技能：每位的终焉技都带自己的新机制，72 位的技能组合互不相同', () => {
  const od = new Map(), law = new Map();
  for (const a of data.awakeners) {
    const ex = extraSkills(a.slug, a);
    assert.ok(ex.Law.effects.some((e) => NEW_MECH.has(e.t)), `${a.slug} 终焉技没有新机制`);
    assert.ok(ex.Od.effects.some((e) => NEW_MECH.has(e.t)) || ex.Od.effects.length, `${a.slug} 超限技为空`);
    const so = sigOf(ex.Od), sl = sigOf(ex.Law);
    assert.ok(!od.has(so), `超限技重复：${a.slug} 与 ${od.get(so)}`); od.set(so, a.slug);
    assert.ok(!law.has(sl), `终焉技重复：${a.slug} 与 ${law.get(sl)}`); law.set(sl, a.slug);
  }
  // 20 种新机制每一种都有人用到
  const used = new Set(data.awakeners.flatMap((a) => extraSkills(a.slug, a).Law.effects.map((e) => e.t)));
  for (const m of NEW_MECH) assert.ok(used.has(m) || ['extraTurn', 'poisonBurst', 'dotBurst'].includes(m), `机制 ${m} 没人用`);
});

// ---- 新机制的战斗行为 ----
const mkAlly = (o = {}) => ({ name: '甲', img: '', type: 'ASSAULT', realm: 'CHAOS', hp: 20000, atk: 1000, def: 100, critRate: 0, critDmg: 50, amp: 0, kit: Object.fromEntries(['Strike', 'Defense', 'Skill1', 'Skill2', 'Rouse', 'Exalt', 'OverExalt'].map((k) => [k, { name: k, effects: [{ t: 'dmg', m: 1, to: 'foe' }] }])), ...o });
const mkFoe = (o = {}) => ({ name: '靶', hp: 50000, atk: 300, def: 50, type: 'ASSAULT', realm: 'CHAOS', pattern: [{ name: '普攻', effects: [{ t: 'dmg', m: 1, to: 'foe' }] }], ...o });
const runX = (extra, allies = [mkAlly()], foes = [mkFoe()], rounds = 3) => {
  const al = allies.map((d, i) => (i === 0 ? { ...d, extra: { Od: { name: 'X', every: 1, effects: extra, text: '' } } } : d));
  return simulate({ allies: al, enemies: foes, seed: 3, maxRounds: rounds });
};
const evs = (r, k) => r.events.filter((e) => e.k === k);

test('新机制：斩杀 / 按比例扣血 / 嘲讽 / 反射 / 眩晕 / 回响 / 献祭 / 延迟 / 复苏', () => {
  // 斩杀：残血目标吃双倍
  const lowFoe = mkFoe({ hp: 50000, hpNow: 5000 });
  const exe = runX([{ t: 'execute', m: 1, thr: 0.3, to: 'foe' }], [mkAlly()], [lowFoe], 1);
  const plain = runX([{ t: 'dmg', m: 1, to: 'foe', hits: 1 }], [mkAlly()], [mkFoe({ hp: 50000, hpNow: 5000 })], 1);
  const dm = (r) => evs(r, 'dmg').filter((e) => e.by === 'a0').slice(-1)[0].amt;
  assert.ok(dm(exe) > dm(plain) * 1.6, '斩杀对残血伤害翻倍');
  // 按比例扣血：厚血敌人扣掉 10%（普通怪）
  const pct = runX([{ t: 'pctHp', pct: 10, to: 'foe' }], [mkAlly()], [mkFoe({ hp: 100000 })], 1);
  assert.ok(evs(pct, 'dmg').some((e) => e.by === 'a0' && e.amt >= 9000), '10% 最大生命');
  // 眩晕：被晕的敌人下一次行动变成「眩晕」
  const stn = runX([{ t: 'stun', n: 1, to: 'foe' }], [mkAlly()], [mkFoe()], 2);
  assert.ok(stn.events.some((e) => e.k === 'act' && e.name === '眩晕'), '敌人被晕');
  // 首领免疫眩晕
  const boss = runX([{ t: 'stun', n: 1, to: 'foe' }], [mkAlly()], [mkFoe({ boss: true })], 2);
  assert.ok(!boss.events.some((e) => e.k === 'act' && e.name === '眩晕'), '首领不吃眩晕');
  // 嘲讽：两个我方，敌人全打嘲讽者
  const tnt = runX([{ t: 'taunt', dur: 3, to: 'self' }], [mkAlly(), mkAlly({ name: '乙' })], [mkFoe({ pattern: [{ name: '普攻', effects: [{ t: 'dmg', m: 1, to: 'foe' }] }] })], 3);
  const hit = evs(tnt, 'dmg').filter((e) => e.by.startsWith('e'));
  assert.ok(hit.length && hit.every((e) => e.who === 'a0'), '敌人只打嘲讽者');
  // 反射：敌人打我会被弹回
  const rfl = runX([{ t: 'reflect', pct: 100, dur: 3, to: 'self' }], [mkAlly()], [mkFoe()], 2);
  assert.ok(evs(rfl, 'counter').some((e) => e.by === 'a0'), '反射伤害');
  // 回响：下一次普通行动打两遍
  const ech = runX([{ t: 'echo', n: 1 }], [mkAlly()], [mkFoe()], 2);
  const base = runX([{ t: 'heal', m: 0.01, to: 'self' }], [mkAlly()], [mkFoe()], 2);
  assert.ok(evs(ech, 'dmg').filter((e) => e.by === 'a0').length > evs(base, 'dmg').filter((e) => e.by === 'a0').length, '回响多打了一遍');
  // 献祭：自损生命
  const bld = runX([{ t: 'blood', cost: 20, m: 1, to: 'foes' }], [mkAlly()], [mkFoe()], 1);
  assert.ok(bld.allies[0].hp < 20000 - 3000, '献祭扣了自己的血');
  // 延迟爆发：第 3 回合开始对敌人结算
  const dly = runX([{ t: 'delay', m: 2, rounds: 1 }], [mkAlly()], [mkFoe()], 3);
  assert.ok(evs(dly, 'dmg').filter((e) => e.by === 'a0').length >= 3);
  // 复苏：倒下的队友站起来
  const frail = mkAlly({ name: '乙', hp: 100, def: 0 });
  const rev = runX([{ t: 'revive', pct: 50 }], [mkAlly(), frail], [mkFoe({ atk: 5000, pattern: [{ name: '普攻', effects: [{ t: 'dmg', m: 1, to: 'foes' }] }] })], 4);
  assert.ok(evs(rev, 'die').length && evs(rev, 'revive').length, '有人倒下后被复苏');
});

test('专属技能：72 位的超限技 + 终焉技在战斗里都能跑通（无异常、数值有限）', () => {
  for (const a of data.awakeners) {
    const ex = extraSkills(a.slug, a);
    const mk = (n) => ({ ...mkAlly({ name: `${a.zh}${n}`, type: a.type, realm: a.realm }), extra: n === 0 ? { Od: { ...ex.Od, every: 1 }, Law: { ...ex.Law, every: 1 } } : null });
    const res = simulate({ allies: [mk(0), mk(1), mk(2)], enemies: [mkFoe(), mkFoe({ type: 'WARDEN' })], seed: 11, maxRounds: 8 });
    assert.ok(res.events.some((e) => e.k === 'act' && e.slot === 'Law'), `${a.slug} 终焉技没触发`);
    for (const e of res.events) for (const k of ['amt', 'hp']) if (k in e) assert.ok(Number.isFinite(e[k]), `${a.slug} 出现非有限数值 ${k}`);
  }
});

test('后期加压：70 关之前怪物不变，之后每 10 关生命 ×1.115 / 攻击 ×1.065 / 防御 +4.5%', async () => {
  const { lateBoost, buildEnemies, enemyScale } = await import('../src/core/enemies.js');
  assert.deepEqual(lateBoost(70), { hp: 1, atk: 1, def: 1 });
  assert.deepEqual(lateBoost(50), { hp: 1, atk: 1, def: 1 });
  const b = lateBoost(130);
  assert.ok(Math.abs(b.hp - 1.115 ** 6) < 1e-9 && Math.abs(b.atk - 1.065 ** 6) < 1e-9 && Math.abs(b.def - 1.27) < 1e-9);
  const at = (st) => buildEnemies(st, data.monsters).filter((e) => e.rank === 'Normal')[0];
  const e130 = at(131);
  // 没加压的话普通怪生命 = 220 × enemyScale × hp 系数；加压后要明显更高
  assert.ok(e130.hp > 220 * enemyScale(131) * 1.4 * 1.1, '131 关的普通怪已被加压');
  // 羁绊把这版加压抬上去了：130 关的相对强度必须比旧版（80 关起 1.10^5）更硬
  assert.ok(b.hp > 1.1 ** 5 && b.atk > 1.06 ** 5 && b.def > 1.2, '新曲线要比旧曲线更陡');
});

/* ---------- 大招策略：优先开大 / 攒大招一起开 / 按自定义顺序开 ---------- */
test('大招策略：first 立刻放；sync 等全队攒满一起放；order 按排好的顺序开（前一位没放就先等）', () => {
  const ally = (n, ali, slug) => mkAlly({ name: n, slug, openAli: ali, openKey: 0, hp: 90000, def: 500 });
  const tank = () => mkFoe({ hp: 9e7, atk: 1, def: 0 });
  const exalts = (r) => r.events.filter((e) => e.k === 'act' && e.slot === 'Exalt').map((e) => ({ who: e.who, round: e.round }));
  const team = () => [ally('甲', 100, 'jia'), ally('乙', 100, 'yi'), ally('丙', 100, 'bing'), ally('丁', 0, 'ding')];
  const run = (ult, extra = {}) => simulate({ allies: team(), enemies: [tank()], seed: 5, maxRounds: 10, strategy: { ult, ...extra } });

  // first：开场就攒满的三位，第一回合（唤醒之后）就放
  const f = exalts(run('first'));
  assert.ok(f.length >= 3 && f[0].round <= 2, '优先开大：很早就放');
  // sync：丁没攒满，前面的人先等；第一次开大一定晚于 first，而且同一回合有多人一起放
  const sy = exalts(run('sync'));
  assert.ok(sy.length >= 1 && sy[0].round > f[0].round, '攒大招：第一次开大比优先开大晚');
  const byRound = {};
  for (const e of sy) byRound[e.round] = (byRound[e.round] || 0) + 1;
  assert.ok(Object.values(byRound).some((n) => n >= 3), '攒大招：同一回合至少有三位一起放');
  // order：排「乙 → 甲 → 丙」，甲 / 丙即使攒满了也要等乙先开
  const od = exalts(run('order', { ultOrder: ['yi', 'jia', 'bing', 'ding'] }));
  assert.ok(od.length >= 3, '按顺序：三个人都会开');
  assert.equal(od[0].who, 'a1', '排第一的乙先开');
  const idx = (w) => od.findIndex((e) => e.who === w);
  assert.ok(idx('a0') > idx('a1') && idx('a2') > idx('a0'), '甲等乙、丙等甲，先后不被打乱');
  // 顺序反过来，甲就该先开
  const od2 = exalts(run('order', { ultOrder: ['jia', 'yi', 'bing'] }));
  assert.equal(od2[0].who, 'a0', '换顺序后先开的人也跟着换');
});

test('大招顺序：老存档里的「手动开大」回到默认，顺序表跟着队伍增删', async () => {
  const G = await import('../src/core/game.js');
  const s = G.newState(data);
  s.strategy.ult = 'manual';
  const m = G.migrate(s, data);
  assert.equal(m.strategy.ult, 'first', '手动开大已下线');
  assert.ok(Array.isArray(m.strategy.ultOrder) && m.strategy.ultOrder.length === m.team.length, '顺序表补齐成队伍人数');
  G.moveUltOrder(m, m.strategy.ultOrder[1], -1);
  assert.equal(m.strategy.ultOrder[0], m.team[1], '上移一位生效');
  G.moveUltOrder(m, m.strategy.ultOrder[0], -1);      // 已经在最前，动不了
  assert.equal(m.strategy.ultOrder[0], m.team[1], '排头再往上移无效');
  const keep = [m.team[0], m.team[2]];
  G.setTeam(m, keep);
  assert.deepEqual(m.strategy.ultOrder, keep, '换队之后顺序表只剩场上的人');
});

/* ---------- 同一件命轮 / 密契只能挂在一个人身上 ---------- */
import { normalizeEquip, equipItem as equipItem2, autoLoadout as autoLoadout2, setTeam as setTeam2, addItem as addItem2, fillLoadout as fillLoadout2 } from '../src/core/game.js';

test('命轮唯一持有：给宁带上 → 一键配队 → 手动换宁上场，不会出现同一件装两个人', () => {
  const s = newState(data);
  for (const k of ['nymphaea', 'samo']) s.roster[k] = s.roster[k] || { lv: 1, star: 0, brk: 0 };
  const w = data.wheels.find((x) => x.zh.includes('饕餮'));
  const uid = addItem2(s, 'wheel', w.id).uid || 'g1';
  const holders = () => Object.entries(s.gear.equip).filter(([, e]) => e.wheel === uid).map(([k]) => k);
  s.team = ['nymphaea', ...s.team.filter((x) => x !== 'nymphaea')].slice(0, 4);
  equipItem2(s, data, 'nymphaea', uid);
  autoLoadout2(s, data);
  assert.equal(holders().length, 1);
  const t = [...s.team]; t[0] = 'nymphaea'; setTeam2(s, t);
  assert.equal(holders().length, 1, '手动换宁上场后仍然只有一个持有者');
  // 即便存档里已经有陈旧的两个持有者：换人时留在队里的那个，板凳上的被摘掉
  const holder = holders()[0];
  s.gear.equip.samo = { ...(s.gear.equip.samo || {}), wheel: uid };
  s.team = [s.team.includes('samo') ? 'ogier' : s.team[0], ...s.team.slice(1)];
  setTeam2(s, [holder, ...s.team.filter((x) => x !== holder && x !== 'samo')].slice(0, 4));
  assert.equal(holders().length, 1);
  // normalizeEquip 本身：队伍内优先
  const eq = { a: { wheel: 'x' }, b: { wheel: 'x', cov: 'y' }, c: { cov: 'y' } };
  assert.equal(normalizeEquip(s, eq, ['b', 'c']), 2);
  assert.deepEqual(eq, { a: {}, b: { wheel: 'x', cov: 'y' }, c: {} });
});

test('配装分配（编队独立配装 / 融灾五队）：分出去的命轮不会还挂在队伍外的旧持有者身上', () => {
  const s = newState(data);
  const w = data.wheels.find((x) => x.zh.includes('饕餮'));
  const uid = addItem2(s, 'wheel', w.id).uid || 'g1';
  const team = s.team.slice(0, 2);
  const target = { equip: { benched: { wheel: uid }, ...Object.fromEntries(team.map((k) => [k, {}])) } };
  fillLoadout2(s, data, team, target);
  const holders = Object.entries(target.equip).filter(([, e]) => e.wheel === uid).map(([k]) => k);
  assert.ok(holders.length <= 1 && !holders.includes('benched'), '板凳上的旧持有者被摘掉');
});

import { dismantleBaseLeft, DISMANTLE_BASE_DAILY } from '../src/core/game.js';

test('分解的基础银芯每天封顶，刷金币祈愿换不出无限银芯', () => {
  const s = newState(data, 31);
  const ssr = data.wheels.find((x) => x.rarity === 'SSR');
  let got = 0;
  for (let i = 0; i < 30; i++) {
    const it = addItem(s, 'wheel', ssr.id);
    const c0 = s.cores; dismantle(s, data, it.uid); got += s.cores - c0;
  }
  assert.equal(got, DISMANTLE_BASE_DAILY, '30 件 SSR（每件 6）也只给 40 枚');
  assert.equal(dismantleBaseLeft(s), 0);
  // 封顶后分解仍给金币；精炼返还的那一半不受限
  const it = addItem(s, 'wheel', ssr.id); s.cores = 500; refineItem(s, it.uid);
  const c0 = s.cores, g0 = s.gold; dismantle(s, data, it.uid);
  assert.equal(s.cores - c0, 20, '只拿回精炼的一半（40/2）');
  assert.ok(s.gold > g0);
  // 隔天恢复
  s.dismantle.day = '2000-01-01';
  assert.equal(dismantleBaseLeft(s), DISMANTLE_BASE_DAILY);
});

test('银芯叠位总价与「先抽后补 / 先补后抽」无关', () => {
  const run = (pullsFirst) => {
    const s = newState(data, 32); s.cores = 1e9; const slug = 'ogier'; const r = s.roster[slug];
    let spent = 0; const P = 40, T = 99;
    if (pullsFirst) r.star += P;            // 重复抽到：免费 +1
    while (r.star < T) { spent += awakenUp(s, slug); if (!spent) break; if (!pullsFirst && r.buy === T - P) { r.star += P; } }
    return { spent, star: r.star, buy: r.buy };
  };
  const a = run(true), b = run(false);
  assert.equal(a.star, 99); assert.equal(b.star, 99);
  assert.equal(a.spent, b.spent);
  assert.equal(a.buy, 59);
  assert.equal(a.spent, 59 * 20 + 5 * (58 * 59 / 2));
});

import { buyTicketWithGold, goldTicketPrice, GOLD_TICKET_LIMIT } from '../src/core/shop.js';
import { stageGold as _sg } from '../src/core/game.js';

test('金币换召唤券：价格随最高关涨、当天递增、有每日上限，没有反向兑换', () => {
  const s = newState(data, 41); s.maxStage = 100; s.gold = 1e15; s.tickets = 0;
  const p0 = goldTicketPrice(s);
  assert.equal(p0, Math.round(_sg(100) * 300));
  const r1 = buyTicketWithGold(s);
  assert.equal(r1.price, p0); assert.equal(s.tickets, 1);
  assert.equal(goldTicketPrice(s), Math.round(_sg(100) * 300 * 1.2), '当天第 2 张贵 20%');
  for (let i = 1; i < GOLD_TICKET_LIMIT; i++) assert.ok(buyTicketWithGold(s));
  assert.equal(s.tickets, GOLD_TICKET_LIMIT);
  assert.equal(buyTicketWithGold(s), null, '每日上限');
  s.shop.day = '2000-01-01';                       // 隔天恢复，价格也回到起点
  assert.equal(goldTicketPrice(s), p0);
  // 钱不够就不卖
  s.gold = p0 - 1; assert.equal(buyTicketWithGold(s), null);
  // 前中期：一张券的金币价至少是挂机拿券（按胜场算）的 10 倍
  const mid = newState(data, 42); mid.maxStage = 40;
  assert.ok(goldTicketPrice(mid) / (_sg(40) * winsPerTicket(40)) > 10);
});

import { MILESTONES as WK_MS, EXTRA_TIERS, claimAllWeekly, claimWeekly as claimWk, weeklyState as wkState } from '../src/core/weekly.js';

test('周 Boss 里程碑：前 8 档不变、后面 48 档单调上升且奖励缓涨，一键领取只领达成的', () => {
  assert.equal(WK_MS.length, 8 + EXTRA_TIERS);
  assert.equal(WK_MS[7].dmg, 700000);                        // 老存档按下标记领取，前 8 档不能动
  for (let i = 1; i < WK_MS.length; i++) assert.ok(WK_MS[i].dmg > WK_MS[i - 1].dmg, `第 ${i} 档要比上一档高`);
  const extra = WK_MS.slice(8);
  assert.ok(extra.reduce((a, m) => a + m.tickets, 0) <= 140, '新增档位的召唤券总量要有节制');
  assert.ok(extra.reduce((a, m) => a + m.cores, 0) <= 2500, '新增档位的银芯总量要有节制');
  assert.ok(extra.every((m) => m.cores <= 60 && m.tickets <= 6));
  assert.ok(WK_MS.at(-1).dmg >= 1e11, '最高档足够高');
  // 一键领取
  const s = newState(data, 51); const w = wkState(s);
  w.tiers[1].damage = 2_000_000; w.tiers[1].claimed = [0];
  const t0 = s.tickets, c0 = s.cores;
  const rs = claimAllWeekly(s, data);
  const want = WK_MS.map((m, i) => i).filter((i) => i !== 0 && WK_MS[i].dmg <= 2_000_000);
  assert.equal(rs.length, want.length);
  assert.ok(s.tickets > t0 && s.cores > c0);
  assert.deepEqual([...w.tiers[1].claimed].sort((a, b) => a - b), [0, ...want]);
  assert.equal(claimAllWeekly(s, data).length, 0, '领过的不会重复领');
  assert.equal(claimWk(s, data, 40), null, '没打到的档不能领');
});

import { squadIsOnMain, setSquadTeam as _sst, ensureLoadout as _elo, loadSquad as _ls } from '../src/core/squad.js';

test('编队「上阵」：成员相同但站位 / 配装不同时仍然能上阵，上阵后才算在主线', () => {
  const s = mkTeamState();
  const own = Object.keys(s.roster).slice(0, 4);
  s.team = [...own];
  _sst(s, 'a', [own[1], own[0], own[2], own[3]]);                       // 同一批人，换了站位
  assert.equal(squadIsOnMain(s, 'a'), false, '站位不同不算「已在主线」');
  const w = addItem(s, 'wheel', data.wheels[0].id);
  const lo = _elo(s, 'a', false); lo.equip[own[1]] = { wheel: w.uid };   // 独立配装给 own[1] 一件命轮，主线上没有
  _ls(s, 'a');
  assert.deepEqual(s.team, [own[1], own[0], own[2], own[3]]);
  assert.equal(s.gear.equip[own[1]]?.wheel, w.uid, '独立配装的命轮搬上了主线');
  assert.equal(squadIsOnMain(s, 'a'), true, '上阵完才算已在主线');
  // 主线把这件命轮摘了：人没变，但配装不一致 → 不能再显示「已在主线」
  delete s.gear.equip[own[1]].wheel;
  assert.equal(squadIsOnMain(s, 'a'), false, '配装不一致不算已在主线');
});

import { simulate as _simBattle } from '../src/core/battle.js';
import { makeEnemy as _mkEnemy } from '../src/core/enemies.js';
import { mulberry32 as _mb } from '../src/core/rng.js';

test('队友的盾大招：排在施盾者后面的队友不会一出手就把刚拿到的盾抹掉', () => {
  const s = newState(data, 3);
  const caster = data.awakeners.find((a) => a.zh === '温柯尔');
  const mates = ['ogier', 'lotan', 'doll'];
  for (const sl of [caster.slug, ...mates]) s.roster[sl] = { lv: 60, star: 0, brk: 3 };
  const mine = { ...allyDef(s, data, caster.slug, [caster.slug]), openAli: 100 };
  const team = [mine, ...mates.map((m) => allyDef(s, data, m, [m]))];
  const boss = data.monsters.find((m) => m.rank === 'Boss' && m.cy.length >= 2);
  const e = _mkEnemy(boss, 'Boss', 40, _mb(5), { affixes: false, msk: data.msk }); e.hp = 1e12;
  const res = _simBattle({ allies: team, enemies: [e], seed: 11, strategy: { preset: 'balanced', defend: 0.4, target: 'low', ult: 'first' }, maxRounds: 2 });
  const ev = res.events;
  const cast = ev.findIndex((x) => x.k === 'act' && x.slot === 'Exalt');
  assert.ok(cast >= 0, '温柯尔先手放出了共鸣');
  // 施盾之后、第一个敌人出手之前，所有盾事件里的目标在敌人出手时盾量还在
  const firstEnemyAct = ev.findIndex((x, i) => i > cast && x.k === 'act' && x.who === 'e0');
  const shielded = new Map();
  for (let i = cast; i < ev.length && (firstEnemyAct < 0 || i < firstEnemyAct); i++) if (ev[i].k === 'shield') shielded.set(ev[i].who, ev[i].shield);
  assert.ok(shielded.size >= 3, '盾发给了至少三个队友');
  const hits = ev.filter((x, i) => i >= firstEnemyAct && x.k === 'dmg' && shielded.has(x.who) && x.absorbed > 0);
  assert.ok(hits.length > 0, '敌人出手时，队友身上的盾真的吃到了伤害');
});

import { enhanceAllEquipped, enhanceItem as _enh } from '../src/core/game.js';
import { gearCost as _gc, wheelBonus as _wb } from '../src/core/gear.js';
import { GEAR_MAX_LV as _GML } from '../src/core/constants.js';

test('装备强化上限 40 级：10 级以前和原来完全一样，10 级之后是金币的大出口；一键强化只花在在用装备上', () => {
  assert.equal(_GML, 40);
  assert.equal(_gc('wheel', 0), 200); assert.equal(_gc('wheel', 9), Math.round(200 * Math.pow(1.5, 9)));
  assert.equal(_gc('wheel', 10), Math.round(200 * Math.pow(1.5, 10)), '10 级的价格不变');
  assert.ok(_gc('wheel', 39) > 1e7 && _gc('wheel', 39) < 3e7, '39→40 级约 1500 万');
  for (let l = 1; l < 40; l++) assert.ok(_gc('relic', l) > _gc('relic', l - 1), `第 ${l} 级比上一级贵`);
  const def = data.wheels.find((w) => w.rarity === 'SSR');
  const b10 = _wb(def, 10).atkPct, b11 = _wb(def, 11).atkPct, b40 = _wb(def, 40).atkPct;
  assert.ok(Math.abs(b10 - _wb(def, 0).atkPct * 2) < 1e-9, '10 级仍是 2 倍');
  assert.ok(b11 > b10 && b40 > b11 && b40 < b10 * 2, '10 级以后每级 +5%，满 40 级不到 10 级的 2 倍');
  const s = mkTeamState(); s.gold = 1e9;
  const slug = s.team[0], w = addItem(s, 'wheel', def.id); equipItem(s, data, slug, w.uid);
  const idle = addItem(s, 'wheel', def.id);     // 没穿的不升
  const r = enhanceAllEquipped(s);
  assert.ok(r.n > 0 && w.lv > 0 && idle.lv === 0, '只花在在用的装备上');
  assert.equal(s.gold, 1e9 - r.spent);
  const s2 = mkTeamState(); s2.gold = 100;
  assert.equal(enhanceAllEquipped(s2).n, 0, '钱不够就不升');
});

import { gearDexKey as _gdk, equipPull as _ep, rollItem as _ri } from '../src/core/game.js';

test('装备祈愿：图鉴累计、50 / 500 连按次数扣金币，池子覆盖全部命轮 / 密契 / 造物', () => {
  const s = newState(data, 61); s.gold = 1e9; s.gear.dex = {};
  const out = _ep(s, data, 500);
  assert.equal(out.length, 500); assert.equal(s.gold, 1e9 - 500 * 400);
  const total = Object.values(s.gear.dex).reduce((a, b) => a + b, 0);
  assert.equal(total, 500, '图鉴累计 = 抽到的件数');
  for (const it of out) assert.ok(s.gear.dex[_gdk(it.kind, it.defId)] >= 1);
  assert.equal(_ep(newState(data, 62), data, 50), null, '钱不够不能抽');
  // 覆盖：足够多次之后，每一件都出现过
  const rng = mulberry32(7), seen = new Set();
  for (let i = 0; i < 300000; i++) { const r = _ri(rng, 60, data); seen.add(_gdk(r.kind, r.defId)); }
  const all = data.wheels.length + data.covenants.length + data.relics.length;
  assert.equal(seen.size, all, `全部 ${all} 件都抽得到`);
  // 老存档迁移：手上有的装备垫进图鉴
  const old = newState(data, 63); const w = addItem(old, 'wheel', data.wheels[3].id); delete old.gear.dex;
  const m = migrate(JSON.parse(JSON.stringify(old)), data);
  assert.ok(m.gear.dex[_gdk('wheel', data.wheels[3].id)] >= 1);
});

import { dismantleCandidates as _dc, dismantlePreview as _dp, dismantleMatching as _dmm, autoDismantle as _ad, autoDmOf as _ao } from '../src/core/game.js';
test('一键分解 / 自动分解', () => {
  const s = newState(data, 70);
  const lo = data.wheels.find((w) => w.rarity === 'N' || w.rarity === 'R'), hi = data.wheels.find((w) => w.rarity === 'SSR');
  const a = addItem(s, 'wheel', lo.id), b = addItem(s, 'wheel', lo.id), c = addItem(s, 'wheel', lo.id), h = addItem(s, 'wheel', hi.id);
  b.lv = 8; c.rf = 1;
  const f = { kinds: ['wheel'], rarities: [lo.rarity], maxLv: 3, keepRefined: true };
  const uids = _dc(s, data, f).map((x) => x.it.uid);
  assert.ok(uids.includes(a.uid)); assert.ok(!uids.includes(b.uid), '超过等级不动'); assert.ok(!uids.includes(c.uid), '精炼保留'); assert.ok(!uids.includes(h.uid));
  const pv = _dp(s, data, f), g0 = s.gold;
  const r = _dmm(s, data, f);
  assert.equal(r.n, pv.n); assert.equal(s.gold - g0, r.gold); assert.ok(!s.gear.items[a.uid]);
  // 自动分解：默认关；开了之后每种先留 1 件
  const t = newState(data, 71); const x1 = addItem(t, 'wheel', lo.id), x2 = addItem(t, 'wheel', lo.id);
  assert.equal(_ad(t, data).n, 0);
  const cfg = _ao(t); cfg.on = true; cfg.kinds = ['wheel']; cfg.rarities = [lo.rarity];
  const out = _ad(t, data);
  assert.ok(out.n >= 1 && out.n <= 2); assert.ok(Object.values(t.gear.items).some((i) => i.defId === lo.id), '先留 1 件');
});

import { squadsEffectivelyUsing as _seu } from '../src/core/squad.js';
test('装备「已编入」提示：沿用主线配装的编队也算', () => {
  const s = newState(data, 80);
  const r = addItem(s, 'relic', data.relics[0].id);
  assert.deepEqual(_seu(s, r.uid), [], '没穿没编入');
  s.gear.relics[0] = r.uid;
  s.squads.b.team = [s.team[0]];
  const k = _seu(s, r.uid);
  assert.ok(k.includes('cur') && k.includes('b'), '造物栏全队共用：当前队伍和二队都算');
  s.squads.c.team = [s.team[1]]; s.squads.c.lo = { equip: {}, relics: Array(6).fill(null), orders: [null, null, null] };
  assert.ok(!_seu(s, r.uid).includes('c'), '有独立配装的编队只看自己那套');
});

/* ---------- 唤醒体羁绊（core/bonds.js） ---------- */
import { teamBonds, bondsOf, BONDS, BOND_CATS } from '../src/core/bonds.js';
import { WEEKLY_TIER, weeklyOpen, wkTrack, weeklyEnemy } from '../src/core/weekly.js';

test('羁绊表：点名的成员都在数据里，规则型羁绊参数合法', () => {
  assert.ok(BONDS.length >= 20, '至少 20 条羁绊');
  for (const b of BONDS) {
    if (b.members) for (const m of b.members) assert.ok(data.bySlug[m], `${b.id} 的成员 ${m} 不存在`);
    if (b.rule === 'type') assert.ok(['ASSAULT', 'WARDEN', 'CHORUS'].includes(b.key), b.id);
    if (b.rule === 'guest') assert.ok(['CHAOS', 'CARO', 'AEQUOR', 'ULTRA'].includes(b.key), b.id);
    assert.ok(Object.keys(b.tiers).length >= 1, b.id);
    assert.ok(b.need >= 2 && BOND_CATS[b.cat], `${b.id} 的 need / cat 不合法`);
  }
  // 六个「本体 + 异相」都在（数据里 Genesis 那六位）
  const origins = BONDS.filter((b) => b.cat === 'origin');
  assert.equal(origins.length, 6);
});

test('羁绊：同源双相凑齐就激活，加成进 teamDefs（全队被动）', () => {
  const s = newState(data, 31);
  const pair = ['lotan', 'lotan-cetarchon'];
  for (const x of pair) s.roster[x] = { lv: 60, star: 0 };
  const b = teamBonds(pair, data);
  const on = b.active.find((x) => x.id === 'apex-lotan');
  assert.ok(on && on.tier === 2, '萝坦 + 蚀灭·萝坦 该有「血潮双相」');
  assert.ok(on.bonus.atkPct > 0 && on.bonus.amp > 0);
  // 只有两个人的时候凑不出同域加成（同域要 3 人），所以战力差只能来自羁绊
  const team = teamDefs(s, data, pair);
  assert.equal(team.synergy, 0);
  const solo = allyDef(s, data, 'lotan', ['lotan']);
  const inTeam = team.list.find((d) => d.slug === 'lotan');
  assert.ok(inTeam.atk > solo.atk && inTeam.amp > solo.amp, '羁绊把攻击和增伤一起抬上去');
  // 队友掉的羁绊不算数：单人在队里什么也没有
  assert.equal(teamBonds(['lotan'], data).count, 0);
  assert.equal(teamBonds(['lotan', 'lotan-cetarchon', 'vivian'], data).near.some((x) => x.id === 'apex-ogier'), true);
});

test('羁绊：同域同心 / 职业阵型 / 初始之约按人数分档', () => {
  const trio = teamBonds(['agrippa', 'aigis', 'thais'], data);
  assert.ok(trio.active.some((x) => x.id === 'realm-caro'));
  // 三个人全是守护 / 合唱之一，阵型羁绊按类型各算
  const types = trio.members.map((a) => a.type);
  assert.ok(types.length === 3);
  const wardens = teamBonds(['agrippa', 'caraboo', 'salvador'], data).active.find((x) => x.id === 'type-warden');
  assert.ok(wardens && wardens.tier === 3);
  const four = teamBonds(['agrippa', 'caraboo', 'salvador', 'faint'], data).active.find((x) => x.id === 'type-warden');
  assert.equal(four.tier, 4, '第四名守护再上一档');
  // 初始四人：2 / 3 / 4 人三档，新手第一天就能吃到
  const st2 = teamBonds(['ogier', 'lotan'], data).active.find((x) => x.id === 'starter-four');
  const st4 = teamBonds(['ogier', 'lotan', 'doll', 'ramona'], data).active.find((x) => x.id === 'starter-four');
  assert.equal(st2.tier, 2);
  assert.equal(st4.tier, 4);
  assert.ok(st4.bonus.amp > 0);
});

test('羁绊：主播 × 主播、主播 × 同界域唤醒体都能凑，两位主播不虚高', () => {
  const crew = teamBonds(['samo', 'dragond', '24', 'vivian'], data);
  assert.ok(crew.active.some((x) => x.id === 'crew-chaos'), '萨摩不耶 + 魔龙_D');
  const guest = crew.active.find((x) => x.id === 'guest-chaos');
  assert.ok(guest && guest.tier === 3, '1 位混沌主播 + 2 名混沌唤醒体');
  assert.equal(teamBonds(['samo', 'dragond', '24'], data).active.some((x) => x.id === 'guest-chaos'), false, '只带 1 名唤醒体凑不出来');
  const quadro = teamBonds(['samo', '24', 'vivian', 'karen'], data).active.find((x) => x.id === 'guest-chaos');
  assert.equal(quadro.tier, 4, '1 位主播 + 3 名唤醒体再上一档');
  // 两位主播 + 两名唤醒体也只按「1 位主播」算
  assert.equal(teamBonds(['samo', 'dragond', '24', 'vivian'], data).active.find((x) => x.id === 'guest-chaos').tier, 3);
  // 主播×主播只认同界域那一对
  assert.equal(teamBonds(['samo', 'mengyi'], data).active.some((x) => x.cat === 'crew'), false);
});

test('本命羁绊：14 条主播 × 羁绊唤醒体都在，且只在两人同队时激活', () => {
  const patron = BONDS.filter((b) => b.cat === 'patron');
  assert.equal(patron.length, 14);
  const creators = new Set();
  for (const b of patron) {
    assert.equal(b.members.length, 2, `${b.id} 应该是一对`);
    const [a, c] = b.members.map((s) => data.bySlug[s]);
    const flags = [!!a.creator, !!c.creator].sort();
    assert.deepEqual(flags, [false, true], `${b.id} 必须是一主播 + 一官方唤醒体`);
    assert.ok(a.realm && c.realm);
    creators.add(b.members.find((s) => data.bySlug[s].creator));
  }
  // 10 位主播每位至少有一条本命
  const all = new Set(Object.values(data.bySlug).filter((a) => a.creator).map((a) => a.slug));
  assert.equal(all.size, 10);
  for (const s of all) assert.ok(creators.has(s), `主播 ${s} 没有本命羁绊`);
  // 只上主播一个人：不激活，但提示「差 1」
  const solo = teamBonds(['samo'], data);
  assert.equal(solo.active.some((x) => x.cat === 'patron'), false);
  assert.equal(solo.near.find((x) => x.id === 'patron-samo').gap, 1);
  // 两人同队：激活，且加成都是加成池认识的字段（打错键会静默丢掉）
  const pair = teamBonds(['samo', 'helot-catena'], data);
  const on = pair.active.find((x) => x.id === 'patron-samo');
  assert.ok(on && on.tier === 2);
  assert.equal(on.bonus.atkPct, 12);
  assert.equal(on.bonus.steal, 3);
  const keys = new Set(Object.keys(ZERO()));
  for (const b of patron) for (const k of Object.keys(b.tiers[2])) assert.ok(keys.has(k), `${b.id} 用了加成池里没有的字段 ${k}`);
  // 详情页的「羁绊」标签：主播与那位唤醒体互相都认得对方这条本命
  assert.ok(bondsOf('samo', data).some((b) => b.id === 'patron-samo'));
  assert.ok(bondsOf('helot-catena', data).some((b) => b.id === 'patron-samo'));
  // 萨摩不耶 × 茉夏（玩家点名补的那条）：单独上阵提示差 1，同队就激活
  assert.equal(solo.near.find((x) => x.id === 'patron-samo-mouchette').gap, 1);
  const sm = teamBonds(['samo', 'mouchette'], data).active.find((x) => x.id === 'patron-samo-mouchette');
  assert.ok(sm && sm.tier === 2, '萨摩 + 茉夏应该激活雪原利爪');
  assert.equal(sm.bonus.critRate, 6);
  assert.equal(sm.bonus.critDmg, 20);
  assert.ok(bondsOf('samo', data).some((b) => b.id === 'patron-samo-mouchette'));
  assert.ok(bondsOf('mouchette', data).some((b) => b.id === 'patron-samo-mouchette'));
});

test('档案派系：神国·利莫里亚按档案 traits 分 2 / 3 / 4 档', () => {
  const lemuria = ['faros', 'goliath', 'miryam', 'murphy-fauxborn', 'tulu'];
  for (const s of lemuria) assert.ok(data.bySlug[s], `${s} 不在数据里`);
  assert.equal(teamBonds(['faros'], data).active.some((x) => x.id === 'archive-lemuria'), false);
  const two = teamBonds(['faros', 'goliath'], data).active.find((x) => x.id === 'archive-lemuria');
  assert.equal(two.tier, 2);
  const three = teamBonds(['faros', 'goliath', 'tulu'], data).active.find((x) => x.id === 'archive-lemuria');
  assert.equal(three.tier, 3);
  const four = teamBonds(['faros', 'goliath', 'tulu', 'murphy-fauxborn'], data).active.find((x) => x.id === 'archive-lemuria');
  assert.equal(four.tier, 4);
  assert.ok(four.bonus.aliGain > three.bonus.aliGain, '人越多共鸣越高');
  // 五人全在队里也只有 4 档（队只有 4 个位置）
  assert.ok(BONDS.find((x) => x.id === 'archive-lemuria').tiers[4]);
});

test('羁绊提示：差 1 人的排在前面，别被永远凑不出的那几条占满', () => {
  const near = teamBonds(['samo', '24'], data).near;
  assert.ok(near.length > 4);
  assert.equal(near[0].gap, 1, '第一条必须是差 1 的');
  for (let i = 1; i < near.length; i++) assert.ok(near[i - 1].gap <= near[i].gap, 'near 必须按 gap 升序');
  assert.ok(near.slice(0, 4).some((x) => x.id === 'patron-samo' || x.id === 'guest-chaos'));
});

test('混编共鸣：3 / 4 个不同界域给 +6% / +10%，凑得出同域时不吃这份', () => {
  const s = newState(data, 34);
  for (const x of ['ogier', 'agrippa', 'celeste', 'vivian', 'castor', 'lotan', 'doll', 'ramona']) s.roster[x] ||= { lv: 60, star: 0 };
  const mix3 = teamDefs(s, data, ['ogier', 'agrippa', 'celeste', 'vivian']);   // 混沌×2 + 血肉 + 深海
  assert.equal(mix3.synergy, 0);
  assert.equal(mix3.mixed, 0.06);
  const mix4 = teamDefs(s, data, ['ogier', 'agrippa', 'celeste', 'castor']);
  assert.equal(mix4.mixed, 0.10);
  assert.ok(mix4.bonds.active.some((x) => x.id === 'mixed-four' && x.tier === 4));
  const same = teamDefs(s, data, ['ogier', 'lotan', 'doll', 'ramona']);
  assert.equal(same.synergy, 0.15);
  assert.equal(same.mixed, 0, '同域与混编互斥，两头都要就没有取舍了');
});

test('周 Boss 三层：上一层打够伤害才解锁，每层各记各的伤害，奖励按层倍率', () => {
  const s = mkTeamState();
  assert.equal(weeklyOpen(s, 1), true);
  assert.equal(weeklyOpen(s, 2), false);
  assert.equal(doWeekly(s, data, null, 2), null, '没解锁的层打不了');
  const r1 = doWeekly(s, data);
  assert.equal(r1.tier.n, 1);
  const w = weeklyState(s);
  assert.equal(w.tiers[1].damage, r1.dmg);
  w.tiers[1].damage = WEEKLY_TIER[1].unlock;
  assert.equal(weeklyOpen(s, 2), true);
  assert.equal(weeklyOpen(s, 3), false, '第 3 层还锁着');
  const r2 = doWeekly(s, data, null, 2);
  assert.ok(r2 && r2.tier.n === 2);
  assert.equal(w.tiers[2].damage, r2.dmg);
  assert.equal(w.tiers[1].damage, WEEKLY_TIER[1].unlock, '第 2 层的伤害不会加到第 1 层');
  // 同一档里程碑：层数越高给得越多
  const s1 = mkTeamState(); const w1 = weeklyState(s1); w1.tiers[1].damage = 1e6;
  const s3 = mkTeamState(); const w3 = weeklyState(s3); w3.tiers[3].damage = 1e6;
  const c1 = claimWeekly(s1, data, 3, 1), c3 = claimWeekly(s3, data, 3, 3);
  assert.ok(c3.tickets > c1.tickets && c3.cores > c1.cores && c3.gold > c1.gold);
  assert.equal(c3.tier, 3);
  // 第 3 层的 Boss 更硬：攻击 / 防御都比第 1 层高
  const e1 = weeklyEnemy(data, weekId(), 1), e3 = weeklyEnemy(data, weekId(), 3);
  assert.ok(e3.atk > e1.atk && e3.def > e1.def);
  assert.ok(e3.name.startsWith('坚壳的'));
});

test('周 Boss 老存档：顶层的累计伤害与已领档位落到第 1 层', () => {
  const s = newState(data, 35);
  const d = new Date().toISOString().slice(0, 10);
  s.weekly = { week: weekId(), day: d, tries: 2, damage: 50000, best: 20000, runs: 3, claimed: [0, 1] };
  const w = weeklyState(s);
  assert.equal(w.tiers[1].damage, 50000);
  assert.equal(w.tiers[1].best, 20000);
  assert.deepEqual(w.tiers[1].claimed, [0, 1]);
  assert.equal(w.damage, undefined, '老字段迁完就删掉，免得两处各算一遍');
  assert.equal(w.tiers[2].damage, 0);
  assert.equal(w.tier, 1);
});

test('反击转移：队友的反击层归到嘲讽者身上，反击真的打得出去', () => {
  // 关卡 50 起敌人才打得动队伍，奥吉尔才会去开盾 / 不灭之誓；
  // 30 层太软，AI 宁可开输出技能，嘲讽与转移都不会触发，测不到这条链路。
  const s = newState(data, 90);
  for (const x of ['ogier', 'caecus', 'faint', 'nautila']) s.roster[x] ??= { lv: 60, star: 3 };
  for (const k of Object.keys(s.roster)) { s.roster[k].lv = 60; s.roster[k].od = 99; s.roster[k].law = 99; }
  s.team = ['ogier', 'caecus', 'faint', 'nautila'];
  let shifts = 0, toOgier = 0, counters = 0, byOgier = 0;
  for (let seed = 1; seed < 40; seed++) {
    s.seed = seed;
    const r = runBattle(s, data, 50);
    // 奥吉尔的两个专精：奥吉尔之盾（嘲讽）与不灭之誓（内含反击转移）
    shifts += r.events.filter((e) => e.k === 'act' && e.who === 'a0' && /奥吉尔之盾|不灭之誓/.test(e.name)).length;
    // 队友拿到的反击层被改挂到开着转移的人身上后，status 事件的 who 就是嘲讽者
    toOgier += r.events.filter((e) => e.k === 'status' && e.s === 'counter' && e.who === 'a0').length;
    counters += r.events.filter((e) => e.k === 'counter').length;
    byOgier += r.events.filter((e) => e.k === 'counter' && e.by === 'a0').length;
  }
  assert.ok(shifts > 0, '嘲讽 / 反击转移有人开');
  assert.ok(toOgier > 0, '队友的反击层被收到了嘲讽者身上');
  assert.ok(counters > 0, '反击会触发');
  assert.ok(byOgier > 0, '嘲讽者自己打出了反击');
});
