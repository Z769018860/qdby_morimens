// 生成 js/gskills-data.js：小游戏「携带技能」的角色表。
//   - 62 名唤醒体：界域 / 定位 / 稀有度取自 data/dict.json，技能名取自原作「狂气爆发」(Exalt) 的名字（data/skills.json）
//   - 10 位主播：取自 idle/src/core/creators.js（界域 / 定位 / 稀有度 / 狂气爆发名），头像在 assets/avatars/creator-<slug>.webp
// 合成大杜勒与忘却 2048 共用这份表；每个角色的具体效果由「界域 × 定位」决定（12 种），见 js/gskills.js。
// 用法：node scripts/gen_gskills.mjs
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const dict = JSON.parse(read('data/dict.json'));
const skills = JSON.parse(read('data/skills.json'));
const REALM = { CHAOS: 'c', CARO: 'f', AEQUOR: 'a', ULTRA: 'u' };
const ROLE = { ASSAULT: 'a', WARDEN: 'w', CHORUS: 'h' };
const RAR = { SR: 'SR', SSR: 'SSR' };
const rows = [];
for (const a of dict.awakener) {
  const sk = (skills[a.pid]?.skills || []).find((x) => x.slot === 'Exalt') || (skills[a.pid]?.skills || []).find((x) => x.slot === 'Rouse');
  rows.push([a.id, a.zh, REALM[a.realmCode], ROLE[a.roleCode], a.rarity, (sk?.n || '').replace(/[【】]/g, ''), a.img ? `assets/avatars/a-${a.id}.webp` : '']);
}
// 头像：avatars.json 里 a-<id>.webp
const av = JSON.parse(read('data/avatars.json')).items.filter((x) => x.k === 'awakener');
const avByName = Object.fromEntries(av.map((x) => [x.n, x.src]));
for (const r of rows) r[6] = avByName[r[1]] || '';
// 主播
const cs = read('idle/src/core/creators.js');
const reg = [...cs.matchAll(/slug: '([a-z0-9]+)', zh: '([^']+)', en: '[^']*', realm: '([A-Z]+)', type: '([A-Z]+)', rarity: '([A-Z]+)'/g)];
const ex = [...cs.matchAll(/(?<!Over)Exalt: \['([^']+)'/g)].map((m) => m[1]);
if (reg.length !== 10 || ex.length !== 10) throw new Error(`主播解析不对：${reg.length} / ${ex.length}`);
reg.forEach((m, i) => rows.push(['c-' + m[1], m[2], REALM[m[3]], ROLE[m[4]], RAR[m[5]] || 'SR', ex[i], `assets/avatars/creator-${m[1]}.webp`, 1]));
const out = `// 由 scripts/gen_gskills.mjs 生成，请勿手改。[id, 名字, 界域(c/f/a/u), 定位(a/w/h), 稀有度, 技能名, 头像, 主播?]\nexport const GS_ROWS = ${JSON.stringify(rows)};\n`;
fs.writeFileSync('js/gskills-data.js', out);
console.log('角色', rows.length, '（唤醒体', dict.awakener.length, '+ 主播', reg.length, '）', out.length, 'B');
const miss = rows.filter((r) => !r[5] || !r[6]); if (miss.length) console.log('缺技能名或头像：', miss.map((r) => r[1]).join('、'));
