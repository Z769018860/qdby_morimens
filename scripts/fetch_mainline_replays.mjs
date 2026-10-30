// 抓主线战报的回放，抽出构题需要的明细，写成 jsonl。
// 输出每行：uuid / bouts / cards / energy / key / relics / 每人 dmg-blk-heal /
//           死亡与"应急灵知体"相关的几个候选计数器（供筛选用，先全部记下来）
import fs from 'node:fs';
import path from 'node:path';
import { decodeReplay } from 'file:///H:/work/qdby_morimens/js/replay.js';

const ST = 'C:/Users/Administrator/AppData/Local/MorimensMainlineCollector/stages';
const OUT = process.argv[2] || 'H:/work/tmp/ml-replays.jsonl';
const WORKERS = Number(process.argv[3] || 6);

const have = new Set();
if (fs.existsSync(OUT)) {
  for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { have.add(JSON.parse(line).uuid); } catch {}
  }
}
console.log('已完成', have.size);

const jobs = [];
for (const f of fs.readdirSync(ST).filter((x) => x.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(ST, f), 'utf8'));
  const st = d.stage;
  for (const r of d.reviews || []) {
    if (have.has(r.battleUuid)) continue;
    jobs.push({ file: f, stage: st, review: r });
  }
}
console.log('待抓', jobs.length);

const out = fs.createWriteStream(OUT, { flags: 'a' });
let done = 0, fail = 0;
const t0 = Date.now();

async function get(uuid, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(`https://z1g-warreport.qookkagames.com/publish/BattleReplay_${uuid}.json`, {
        signal: AbortSignal.timeout(40000),
      });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
      if (r.status === 404) return null;
    } catch {}
    await new Promise((s) => setTimeout(s, 600 * (i + 1)));
  }
  return null;
}

async function one(job) {
  const b = await get(job.review.battleUuid);
  if (!b) { fail++; return; }
  let rep;
  try { rep = decodeReplay(b); } catch { fail++; return; }
  const bd = rep.battleDat || {};
  const st = bd.statistics || {};
  const num = (v) => (Number.isFinite(+v) ? +v : 0);
  const roles = (bd.roleData || []).filter((x) => x && x.tid != null);
  const dmg = st.AwakerDoDamage || {}, blk = st.AwakerDoBlock || {}, heal = st.AwakerDoHeal || {};
  const rec = {
    uuid: job.review.battleUuid,
    file: job.file,
    stageTid: job.stage.stageTid,
    campaign: job.stage.campaign,
    chapter: job.stage.chapter,
    stage: job.stage.stage,
    displayName: job.stage.displayName,
    recLevel: job.stage.recommendedLevel,
    reviewBout: job.review.totalBout,
    keeperSkill: bd.keeperSkill ?? (job.review.teamData || {}).keeperSkill,
    bouts: num(st.BoutCount),
    cards: num(st.UsedCardCount),
    energy: num(st.ConsumeEnergy),
    keyUses: num(st.UsedKeeperSkillCount),
    deathResist: num(st.DeathResistCount),
    playerDeath: num(st.PlayerDeathCount),
    respawned: num(bd.respawnedNum),
    lives: num(bd.lives),
    autoAwakerCmd: num(st.AutoAwakerCmdCardUsedCount),
    autoAwakerEnergy: num(st.AutoAwakerConsumeEnergy),
    autoAwakerUlti: num(st.AutoAwakerConsumeUltiEnergy),
    autoNonCmd: num(st.AutoNonCmdCardUsedCount),
    backupUse: (bd.backupAwakeCards || []).reduce((a, c) => a + (c && c.useCount ? 1 : 0), 0),
    relics: (bd.relics || []).map((x) => (x && x.tid != null ? x.tid : x)).filter((x) => x != null),
    roles: roles.map((r) => ({
      tid: r.tid, lv: num(r.level), pot: num(r.potencyLevel), brk: num(r.breakLevel),
      dmg: num(dmg[String(r.tid)]), blk: num(blk[String(r.tid)]), heal: num(heal[String(r.tid)]),
    })),
    reviewTids: (job.review.awakerOutlineList || []).map((a) => a.tid),
  };
  out.write(JSON.stringify(rec) + '\n');
  done++;
  if (done % 100 === 0) {
    const el = (Date.now() - t0) / 1000;
    console.log(`  ${done} 完成 / ${fail} 失败 · ${(done / el).toFixed(1)}/s`);
  }
}

let idx = 0;
await Promise.all(Array.from({ length: WORKERS }, async () => {
  while (idx < jobs.length) {
    const j = jobs[idx++];
    await one(j);
  }
}));
out.end();
console.log(`结束：完成 ${done} 失败 ${fail}，用时 ${((Date.now() - t0) / 1000 / 60).toFixed(1)} 分钟`);
