import { readFileSync } from 'node:fs';
import { indexData } from '../src/core/game.js';
export const data = indexData(JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8')));
