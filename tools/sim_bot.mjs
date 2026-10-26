// Balance bot: plays the idle loop greedily and prints the progress curve.
import { readFileSync } from 'node:fs';
import { indexData, newState, runBattle, applyResult, levelUp, autoTeam, summon, equipPull, equipItem, enhanceItem, allyDef, teamDefs, claimDaily } from '../src/core/game.js';
import { MAX_LV } from '../src/core/constants.js';
import { lvUpCost } from '../src/core/stats.js';

const data = indexData(JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8')));
const s = newState(data, 1);
const BATTLES = +process.argv[2] || 3000;
let lastReport = 0;
function spend() {
  while (s.tickets >= 10) summon(s, data, 10);
  autoTeam(s, data);
  // gear: pull when rich, equip best (by rarity) to the team
  if (s.gold > 3000 && s.maxStage > 8) equipPull(s, data, 5);
  for (const slug of s.team) {
    const e = (s.gear.equip[slug] ||= {});
    for (const kind of ['wheel', 'covenant']) {
      const key = kind === 'wheel' ? 'wheel' : 'cov';
      if (e[key]) continue;
      const free = Object.values(s.gear.items).find((it) => it.kind === kind && !Object.values(s.gear.equip).some((x) => x[key] === it.uid));
      if (free) equipItem(s, data, slug, free.uid);
    }
  }
  for (;;) {
    const next = [...s.team].sort((x, y) => s.roster[x].lv - s.roster[y].lv)[0];
    if (s.roster[next].lv >= MAX_LV || s.gold < lvUpCost(s.roster[next].lv) || !levelUp(s, next)) break;
  }
  for (const it of Object.values(s.gear.items)) if (s.gold > 5000) enhanceItem(s, it.uid);
}
let fails = 0;
for (let i = 1; i <= BATTLES; i++) {
  if (i % 50 === 0) spend();
  if (i % 400 === 0) claimDaily(s, String(i));
  const r = runBattle(s, data);
  const rw = applyResult(s, data, r);
  if (!r.win) fails++;
  if (i - lastReport >= BATTLES / 10) {
    lastReport = i;
    const t = teamDefs(s, data);
    console.log(`#${i} stage=${s.stage} max=${s.maxStage} gold=${s.gold} tickets=${s.tickets} roster=${Object.keys(s.roster).length} pow=${t.power} lvs=${s.team.map((x) => s.roster[x].lv)} fails=${fails}`);
  }
}
