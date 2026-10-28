// Balance bot: plays the idle loop greedily and prints the progress curve.
import { readFileSync } from 'node:fs';
import { indexData, newState, runBattle, applyResult, levelUp, breakThrough, autoLoadout, summon, equipPull, enhanceItem, allyDef, teamDefs } from '../src/core/game.js';
import { levelCap, breakNeeded, lvUpCost } from '../src/core/stats.js';
import { doTower, doTrial, THREATS, trialUnlocked } from '../src/core/challenge.js';
import { doWeekly, weeklyState, MILESTONES } from '../src/core/weekly.js';
import { doRTower, REALM_TOWERS } from '../src/core/rtower.js';
import { arenaState, localOpponents, fightArena, applyArena, localSettle } from '../src/core/arena.js';
import { signToday } from '../src/core/signin.js';
import { claimAllAchievements } from '../src/core/achievements.js';
import { summonCores } from '../src/core/game.js';

const pack = JSON.parse(readFileSync(new URL('../public/data/game-data.json', import.meta.url), 'utf8'));
pack.orders = JSON.parse(readFileSync(new URL('../public/data/orders.json', import.meta.url), 'utf8')).items || [];
pack.special = JSON.parse(readFileSync(new URL('../public/data/special.json', import.meta.url), 'utf8'));
const data = indexData(pack);
const s = newState(data, 1);
const BATTLES = +process.argv[2] || 3000;
let lastReport = 0;
function spend() {
  while (s.tickets >= 10) summon(s, data, 10);
  // 抽完装备让「一键配队」把命轮 / 密契 / 造物 / 钥令一起排好（和游戏里那颗按钮同一套逻辑）
  if (s.gold > 3000 && s.maxStage > 8) equipPull(s, data, 5);
  autoLoadout(s, data);
  // 升级：碰到 20/40/60… 的突破关卡就先付材料突破，突破不了才算这次花完钱
  for (let guard = 0; guard < 500; guard++) {
    const next = [...s.team].sort((x, y) => s.roster[x].lv - s.roster[y].lv)[0];
    const r = s.roster[next];
    if (breakNeeded(r.lv, r.brk)) { if (!breakThrough(s, next)) break; continue; }
    if (r.lv >= levelCap(r.star) || s.gold < lvUpCost(r.lv) || !levelUp(s, next)) break;
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
