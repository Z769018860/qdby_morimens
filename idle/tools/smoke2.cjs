const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push('PE ' + e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto('http://localhost:8765/index.html'); await p.waitForTimeout(800);
  await p.evaluate(() => { __game.state.skipAnim = false; __game.state.speed = 8; });
  await p.waitForTimeout(12000);
  const mid = await p.evaluate(() => JSON.stringify({ stage: __game.state.stage, b: __game.state.stats.battles, gold: __game.state.gold, items: Object.keys(__game.state.gear.items).length }));
  await p.screenshot({ path: '/tmp/m_battle.png' });
  await p.evaluate(() => { __game.state.skipAnim = true; });
  await p.waitForTimeout(15000);
  const end = await p.evaluate(() => JSON.stringify({ stage: __game.state.stage, b: __game.state.stats.battles, gold: __game.state.gold, items: Object.keys(__game.state.gear.items).length }));
  await p.click('[data-tab=gear]'); await p.waitForTimeout(300); await p.screenshot({ path: '/tmp/m_gear.png' });
  await p.reload(); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => JSON.stringify({ stage: __game.state.stage, b: __game.state.stats.battles }));
  console.log(errs.join('\n') || 'no errors', mid, end, after);
  await b.close();
})();
