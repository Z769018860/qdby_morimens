#!/usr/bin/env node
// 把 wiki 抄下来的角色语音台词整理成引擎能直接吃的模块：js/sv/voices.js
//
// 数据源 data/sv-voices.json 由「灰机 wiki 角色页的语音段落」整理而来，
// 字段就是 wiki 上的键名（技能·一 / 技能·二 / 狂气爆发 / 超限狂气爆发 /
// 灵知觉醒 / 唤醒 / 受击·一 / 获得提升·一），这里只做「槽位重命名 + 瘦身」。
//
// 为什么要单独生成一个模块而不是运行时去读 json：
// 站点每个请求固定 1~2 秒，为 25KB 台词多开一个请求完全不划算，
// 而 js/sv/*.js 会被 scripts/build.mjs 打进 survivors.js 的单文件里，零额外请求。
//
// 用法：node scripts/build_survivors_voices.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data/sv-voices.json');
const OUT = path.join(ROOT, 'js/sv/voices.js');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// 槽位顺序固定下来，产物稳定（diff 好看，也不会因为键序变化产生无意义变更）
const SLOTS = ['wake', 's1', 's2', 'rage', 'rage2', 'evo', 'hurt', 'lv'];
const SLOT_CN = {
  wake: '唤醒', s1: '技能·一', s2: '技能·二',
  rage: '狂气爆发', rage2: '超限狂气爆发', evo: '灵知觉醒',
  hurt: '受击', lv: '获得提升',
};

// 神王·图鲁在 wiki 上只有形态页、没有语音段；它是图鲁的本源降临形态，
// 所以直接沿用图鲁（15563）的台词 —— 总比对着神王一句不说合理。
const ALIAS = { 90001: '15563' };

const out = {};
let lines = 0;
for (const [id, rec] of Object.entries(raw)) {
  const clean = {};
  for (const s of SLOTS) {
    const t = rec[s];
    if (typeof t === 'string' && t.trim()) { clean[s] = t.trim(); lines++; }
  }
  if (Object.keys(clean).length) out[id] = clean;
}
for (const [to, from] of Object.entries(ALIAS)) {
  if (!out[to] && out[from]) { out[to] = out[from]; }
}

const sorted = {};
for (const k of Object.keys(out).sort()) sorted[k] = out[k];

const body = JSON.stringify(sorted, null, 0);
const head = `// 由 scripts/build_survivors_voices.mjs 生成，不要手改。
// 数据源：data/sv-voices.json（灰机 wiki 角色页「语音」段的台词原文）
//
// 槽位：${SLOTS.map((s) => `${s}=${SLOT_CN[s]}`).join(' / ')}
// 说明：wiki 上只有文字台词，没有音频文件；这里只负责「说什么」，「什么时候说」
// 由 js/sv/engine.js 的 say() 决定，气泡渲染在 js/sv/render.js 的 drawVoice()。
`;
fs.writeFileSync(OUT, `${head}export const VOICES = ${body};\n`, 'utf8');

console.log(`js/sv/voices.js  ${Object.keys(sorted).length} 名角色 / ${lines} 条台词 / ${Math.round(fs.statSync(OUT).size / 1024)}KB`);
