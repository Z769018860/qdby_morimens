import { readFileSync } from 'node:fs';
import { indexData } from '../src/core/game.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
const orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8'));
pack.orders = orders.items || [];
// 奖励首领校猫走独立的附加表（和线上同一个来源），测试里也要带上
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
export const data = indexData(pack);
export const orderPack = orders;
export const CAT_ID = pack.special.monsters[0].id;
