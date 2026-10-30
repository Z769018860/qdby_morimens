// 通用游戏云存档的决策逻辑（js/gamecloud.js 的 plan）。node scripts/test_gamecloud.mjs
import assert from 'node:assert/strict';
import { plan, hashOf, GAMES } from '../js/gamecloud.js';

const h = (o) => hashOf(o);
const A = { 'zjtt:binding': '{"x":1}' }, B = { 'zjtt:binding': '{"x":2}' };
const empty = { empty: true, hash: h({}) };
const mine = (k) => ({ empty: false, hash: h(k) });
const cloud = (ver, keys) => ({ ver, at: 1, meta: { hash: h(keys), n: 1 } });
const acct = '甲';
let n = 0; const t = (name, got, want) => { assert.equal(got, want, name); n++; };

t('云端没有、本机空 → 不动', plan({ local: empty, cloud: null, rec: null, acct }), 'none');
t('云端没有、本机有 → 推', plan({ local: mine(A), cloud: null, rec: null, acct }), 'push');
t('新设备（本机空）、云端有 → 拉', plan({ local: empty, cloud: cloud(3, A), rec: null, acct }), 'pull');
t('新设备、两边内容一样 → 只记一笔', plan({ local: mine(A), cloud: cloud(3, A), rec: null, acct }), 'sync');
t('新设备、两边都有且不同 → 冲突', plan({ local: mine(A), cloud: cloud(3, B), rec: null, acct }), 'conflict');
t('同设备云端没变、本机没改 → 不动', plan({ local: mine(A), cloud: cloud(3, A), rec: { acct, ver: 3, hash: h(A) }, acct }), 'none');
t('同设备云端没变、本机改了 → 推', plan({ local: mine(B), cloud: cloud(3, A), rec: { acct, ver: 3, hash: h(A) }, acct }), 'push');
t('云端被别的设备推进、本机没改 → 拉', plan({ local: mine(A), cloud: cloud(4, B), rec: { acct, ver: 3, hash: h(A) }, acct }), 'pull');
t('云端推进、本机也改了 → 冲突', plan({ local: mine(B), cloud: cloud(4, { 'zjtt:binding': '3' }), rec: { acct, ver: 3, hash: h(A) }, acct }), 'conflict');
t('换了账号当新设备：本机有内容且不同 → 冲突', plan({ local: mine(A), cloud: cloud(4, B), rec: { acct: '乙', ver: 3, hash: h(A) }, acct }), 'conflict');
assert.ok(Object.keys(GAMES).length >= 7); n++;
assert.notEqual(h(A), h(B)); assert.equal(h(A), h({ ...A })); n++;
console.log(`gamecloud: ${n} 项通过`);
