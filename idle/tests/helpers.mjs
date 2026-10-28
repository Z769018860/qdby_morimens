import { readFileSync } from 'node:fs';
import { indexData } from '../src/core/game.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
const orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8'));
pack.orders = orders.items || [];
export const data = indexData(pack);
export const orderPack = orders;
