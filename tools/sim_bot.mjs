// Balance bot: plays the idle loop greedily and prints the progress curve.
import { readFileSync } from 'node:fs';
import { indexData, newState, runBattle, applyResult, levelUp, autoTeam, summon, equipPull, equipItem, enhanceItem, allyDef, teamDefs } from '../src/core/game.js';
import { MAX_LV } from '../src/core/constants.js';
import { doTower, doTrial, THREATS, trialUnlocked } from '../src/core/challenge.js';
import { doWeekly, weeklyState, MILESTONES } from '../src/core/weekly.js';
import { doRTower, REALM_TOWERS } from '../src/core/rtower.js';
import { arenaState, localOpponents, fightArena, applyArena, localSettle } from '../src/core/arena.js';
import { signToday } from '../src/core/signin.js';
import { claimAllAchievements } from '../src/core/achievements.js';
import { summonCores } from '../src/core/game.js';
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
  if (i % 400 === 0) {
    signToday(s, data, new Date(Date.UTC(2026, 0, 1 + Math.floor(i / 400))));
    claimAllAchievements(s, data);
    while (s.cores >= 1900) summonCores(s, data, 10);
    for (let k = 0; k < 3; k++) doTower(s, data, String(i));
    const w = weeklyState(s); w.tries = 3; for (let k = 0; k < 3; k++) { w.tries = 3 - k; doWeekly(s, data); }
    for (const realm of REALM_TOWERS) for (let k = 0; k < 6; k++) { const q = doRTower(s, data, realm); if (!q || !q.win) break; }
    const ar = arenaState(s); ar.tries = 5;
    for (let k = 0; k < 5; k++) { const opps = localOpponents(s, data); if (!opps.length) break; const e = opps[opps.length - 1 - (k % 2)] || opps[0]; const f = fightArena(s, data, e); applyArena(s, data, f, localSettle(s, e, f.win).rank); }
    for (const t of data.trials) for (let th = 0; th < THREATS.length; th++) { if (!trialUnlocked(s, t, th)) break; const q = doTrial(s, data, t.id, th); if (!q || !q.win) break; }
  }
  const r = runBattle(s, data);
  const rw = applyResult(s, data, r);
  if (!r.win) fails++;
  if (i - lastReport >= BATTLES / 10) {
    lastReport = i;
    const t = teamDefs(s, data);
    console.log(`#${i} stage=${s.stage} max=${s.maxStage} gold=${s.gold} tickets=${s.tickets} cores=${s.cores} roster=${Object.keys(s.roster).length} pow=${t.power} lvs=${s.team.map((x) => s.roster[x].lv)} fails=${fails} tower=${s.tower.best} wk=${s.weekly?.best | 0}/${MILESTONES.filter((m) => (s.weekly?.damage || 0) >= m.dmg).length} rt=${REALM_TOWERS.map((r) => s.rtower?.[r]?.best | 0).join('/')} arena=${s.arena?.rank} trials=${Object.keys(s.trials.cleared).length}(${['C','B','A','S','SS','SSS'].map((k) => Object.keys(s.trials.cleared).filter((x) => x.endsWith('-' + k)).length).join('/')})`);
  }
}
