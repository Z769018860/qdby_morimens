import assert from 'node:assert/strict';
import { G, reset, buy, levelUp, beginWave, update, UNITS_BY_ID } from '../js/pf/engine.js';
import { interestOf, LEVEL_COST, LEVEL_REWARD, WAVE_GOLD } from '../js/pf/defs.js';
for (const [gold, interest] of [[0,0],[4,0],[5,1],[9,1],[10,2],[24,4],[25,5],[100,5]]) assert.equal(interestOf(gold), interest);
reset(42); G.gold = 100;
const original = structuredClone(G.shop), items = structuredClone(G.itemShop);
const before = G.gold;
assert.equal(levelUp(), true);
assert.deepEqual(G.shop, original); assert.deepEqual(G.itemShop, items);
assert.equal(G.gold, before - LEVEL_COST + LEVEL_REWARD.gold);
// Nine purchases cascade to three stars. Other original slots and sold slots survive.
const id = Object.keys(UNITS_BY_ID)[0];
for (let i=0;i<9;i++) { G.shop[0]={id}; assert.equal(buy(0),true); }
assert.equal(G.units.length,1); assert.equal(G.units[0].star,3);
assert.equal(G.bonusShops.length,1);
assert.equal(G.shop[0],null);assert.deepEqual(G.shop.slice(1),original.slice(1));
assert.deepEqual(G.itemShop,items);
const preserved = structuredClone(G.shop);
const bonusID = G.bonusShops[0][0].id;
assert.equal(buy(0,true),true);
assert.equal(G.bonusShops[0][0],null);assert.deepEqual(G.shop,preserved);
assert(G.units.some(u=>u.id===bonusID));
G.gold=0;assert.equal(buy(1,true),false);assert(G.bonusShops[0][1]);
// Check the actual wave settlement, not only the helper.
reset(47); G.gold=10;beginWave();G.enemies=[];G.spawnQ=[];
update(1/60);
assert.equal(G.phase,'prep');assert.equal(G.gold,10+WAVE_GOLD+2);
reset(48);assert.deepEqual(G.bonusShops,[]);
console.log('Protocol economy, level-up preservation, cascade merge, bonus-shop purchase and settlement checks passed');
