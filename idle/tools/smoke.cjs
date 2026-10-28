const { chromium } = require('playwright');(async()=>{
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 420, height: 860 } });
const errs=[]; p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push('CE '+m.text())});
await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(6000);
await p.screenshot({path:'/tmp/s_battle.png'});
for (const t of ['team','roster','gear','summon','settings']) { await p.click(`[data-tab=${t}]`); await p.waitForTimeout(400); await p.screenshot({path:`/tmp/s_${t}.png`}); }
await p.click('[data-tab=summon]'); await p.click('[data-act=pull][data-n="10"]'); await p.waitForTimeout(700); await p.screenshot({path:'/tmp/s_pull.png'}); await p.click('.modal-x');
await p.click('[data-tab=roster]'); await p.click('.tile:not(.locked)'); await p.waitForTimeout(300); await p.screenshot({path:'/tmp/s_detail.png'});
console.log(errs.join('\n')||'no errors', await p.evaluate(()=>JSON.stringify({stage:__game.state.stage,b:__game.state.stats.battles,gold:__game.state.gold})));
await b.close();})();
