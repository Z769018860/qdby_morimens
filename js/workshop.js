// 创意工坊：导入战报 → 生成自己的推理题 → 分享码 / 云题库
import { $, h, store, nav, t, lang, loadDict, imgEl, nameOf, shareCode, REPLAY, markDirty } from './common.js';
import { cloud, cloudConfig } from './cloud.js';
import { account } from './account.js';
import { decodeReplay, replayTeam } from './replay.js';
import { PEPPER } from './pepper.js';
import * as likes from './likes.js';

await account.ready();
document.body.prepend(nav('workshop'));
const root = $('#app');
root.textContent = t('loading');

const { D, idx } = await loadDict();
const KINDS = { awakener: '唤醒体', wheel: '命轮', covenant: '密契', key: '钥令', creation: '造物' };
const LETTERS = ['A', 'B', 'C', 'D'];

function toast(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

// ------------------------------------------------------------------ draft
function emptyDraft() {
  return {
    id: '', custom: true, title: '', uuid: '',
    season: 0, zone: 0, threat: '?', madness: 0, boss: [],
    score: 0, rounds: 0, cards: 0, maxBout: 0, deathResist: 0, hp: 0, left: 0,
    playerDmg: 0, extra: false, diff: 3, diffScore: 30,
    key: null, relics: [], hints: [],
    team: LETTERS.map(() => ({ tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 })),
  };
}
let draft = emptyDraft();

const myPuzzles = () => store.get('myPuzzles', []);
const saveMine = (list) => store.set('myPuzzles', list);

// ------------------------------------------------------------------ 自定义线索
// 作者自己写的线索：标题 + 内容 + 价格，玩家在题目的线索台里按这个价格买。
// 题库自带的线索是「按数据算出来的」，这里的是「作者知道但数据算不出来的」
// （比如这局怎么打的、某个位置的怪癖），所以价格也由作者定。
const HINT_MAX = 12;
const HINT_COST_MIN = 1;
const HINT_COST_MAX = 40;
const clampCost = (v) => {
  const n = Math.round(num(v, 5));
  return Math.min(HINT_COST_MAX, Math.max(HINT_COST_MIN, n));
};
const hintsOf = (d) => (Array.isArray(d && d.hints) ? d.hints : []);
// 分享码里压成三元组，省点长度
const packHints = (list) => list.map(c => [c.n || '', c.v || '', clampCost(c.c)]);
const unpackHints = (arr) => (Array.isArray(arr) ? arr : []).map(c => ({
  n: String(c && c.n != null ? c.n : (Array.isArray(c) ? c[0] : '')) || '',
  v: String(c && c.v != null ? c.v : (Array.isArray(c) ? c[1] : '')) || '',
  c: clampCost(c && c.c != null ? c.c : (Array.isArray(c) ? c[2] : 5)),
}));

// ------------------------------------------------------------------ 解析导入
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

function pickTeam(obj) {
  // 1) 已经是答案结构：{team:[{tid,lv,pot,brk,wheels,cov}]}
  if (Array.isArray(obj.team) && obj.team.length) {
    return obj.team.slice(0, 4).map(a => ({
      tid: String(a.tid), lv: num(a.lv ?? a.level, 60), pot: num(a.pot, 0), brk: num(a.brk, 0),
      wheels: (a.wheels || []).slice(0, 2).map(String), cov: a.cov ? String(a.cov) : null,
      dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
    }));
  }
  // 2) 战报摘要：awakers[] / members[]
  const raw = obj.awakers || obj.members || obj.awakeners || obj.teamMembers || [];
  if (Array.isArray(raw) && raw.length) {
    return raw.slice(0, 4).map(a => ({
      tid: String(a.tid ?? a.id ?? a.awakenerId), lv: num(a.level ?? a.lv, 60), pot: num(a.pot ?? a.potency, 0),
      brk: num(a.brk ?? a.break, 0), wheels: [], cov: null,
      dmg: num(a.damage ?? a.dmg), blk: num(a.block ?? a.blk), heal: num(a.heal),
    })).filter(a => a.tid !== 'undefined');
  }
  return null;
}

function fromJson(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (Array.isArray(obj)) obj = obj[0] || {};
  // battle-summary 的 jsonl 也可能整段粘进来
  const team = pickTeam(obj);
  if (!team || team.length < 2) return null;
  const d = emptyDraft();
  d.team = LETTERS.map((_, i) => team[i] || { tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 });
  // 按伤害从高到低排序：A 是最高伤害
  d.team.sort((a, b) => (b.dmg || 0) - (a.dmg || 0));
  d.uuid = String(obj.battleUuid || obj.uuid || obj.replayUuid || '');
  d.rounds = num(obj.stageRoundCount ?? obj.rounds);
  d.cards = num(obj.totalUseCard ?? obj.cards);
  d.maxBout = num(obj.maxBoutDamage ?? obj.maxBout);
  d.deathResist = num(obj.deathResistCount ?? obj.deathResist);
  d.hp = num(obj.maxHp ?? obj.hp);
  d.left = num(obj.leftHp ?? obj.left);
  d.playerDmg = num(obj.playerDamage ?? obj.playerDmg);
  d.score = num(obj.score);
  d.relics = (obj.relics || []).map(x => String(x && x.id != null ? x.id : x)).filter(Boolean);
  d.key = obj.keeperSkill != null ? String(obj.keeperSkill) : (obj.key != null ? String(obj.key) : null);
  d.extra = !!(obj.extraPass ?? obj.extra);
  d.diff = d.relics.length ? 4 : (d.key ? 3 : (d.team.some(a => a.wheels.length) ? 2 : 1));
  // 难度分：用回合/伤害离散度粗估
  d.diffScore = Math.round(18 + Math.min(30, Math.log10(Math.max(1, d.maxBout)) * 4) + (d.extra ? 3 : 0));
  return d;
}

// ------------------------------------------------------------------ 编辑区
function pickBtn(kind, id, set, label) {
  const e = id != null ? idx[kind].get(String(id)) : null;
  return h('button', {
    type: 'button', class: `pick ${kind}`,
    onclick: () => openPicker(kind, (v) => { set(v); draw(); }),
  }, e ? imgEl(e.img, nameOf(e)) : h('span', { class: 'plus' }, '＋'), h('small', {}, e ? nameOf(e) : (label || KINDS[kind])));
}

function slotEditor(k) {
  const a = draft.team[k];
  return h('div', { class: 'slot' },
    h('div', { class: 'shead' }, h('b', {}, `${LETTERS[k]} 位`),
      h('span', { class: 'chips' }, a.dmg ? h('span', { class: 'chip' }, `伤害 ${Math.round(a.dmg).toLocaleString()}`) : null)),
    pickBtn('awakener', a.tid, v => { a.tid = v; }, '选唤醒体'),
    h('div', { class: 'row2' },
      pickBtn('wheel', (a.wheels || [])[0], v => { a.wheels = [v, (a.wheels || [])[1] || null].filter(Boolean); }, '命轮 1'),
      pickBtn('wheel', (a.wheels || [])[1], v => { a.wheels = [(a.wheels || [])[0] || null, v].filter(Boolean); }, '命轮 2')),
    pickBtn('covenant', a.cov, v => { a.cov = v; }, '密契'),
    h('div', { class: 'pot' },
      h('small', {}, '等级/灵塑'),
      h('input', { type: 'number', min: 1, max: 90, value: a.lv, class: 'tiny', oninput: ev => { a.lv = num(ev.target.value, 60); } }),
      h('input', { type: 'number', min: 0, max: 15, value: a.pot, class: 'tiny', oninput: ev => { a.pot = num(ev.target.value, 0); } })));
}

function metaEditor() {
  const f = (label, key, type = 'number') => h('label', { class: 'fld' }, h('small', {}, label),
    h('input', { type, value: draft[key] ?? '', oninput: ev => { draft[key] = type === 'number' ? num(ev.target.value) : ev.target.value; } }));
  return h('div', { class: 'metagrid' },
    f('回合数', 'rounds'), f('出牌数', 'cards'), f('单回合最高伤害', 'maxBout'),
    f('剩余生命', 'left'), f('满血', 'hp'), f('守密人伤害', 'playerDmg'),
    h('label', { class: 'fld' }, h('small', {}, '回放 battleUuid'),
      h('input', { type: 'text', value: draft.uuid || '', oninput: ev => { draft.uuid = ev.target.value.trim(); } })));
}

// 自定义线索编辑器：一行一条，标题 / 内容 / 价格，写一条加一条
let focusLastHint = false;
function clueEditor() {
  const list = draft.hints || (draft.hints = []);
  const row = (c, i) => h('div', { class: 'hintrow' },
    h('input', {
      type: 'text', class: 'hn', value: c.n || '', maxlength: 24, placeholder: t('wsHintLabelPh'),
      oninput: ev => { c.n = ev.target.value; },
    }),
    h('input', {
      type: 'text', class: 'hv', value: c.v || '', maxlength: 140, placeholder: t('wsHintTextPh'),
      oninput: ev => { c.v = ev.target.value; },
    }),
    h('input', {
      type: 'number', class: 'hc', min: HINT_COST_MIN, max: HINT_COST_MAX, value: c.c ?? 5,
      title: t('wsHintCostTip'),
      oninput: ev => { c.c = ev.target.value === '' ? '' : num(ev.target.value, 5); },
      onblur: ev => { c.c = clampCost(ev.target.value); ev.target.value = c.c; },
    }),
    h('button', {
      type: 'button', class: 'link', onclick: () => { list.splice(i, 1); draw(); },
    }, t('wsDel')));
  const box = h('div', { class: 'hintsed' },
    h('div', { class: 'hinthead' },
      h('b', {}, t('wsHintTitle')),
      h('span', { class: 'note' }, t('wsHintNote', { max: HINT_MAX }))),
    list.length
      ? h('div', { class: 'hintcols' },
        h('small', {}, t('wsHintColN')), h('small', {}, t('wsHintColV')),
        h('small', {}, t('wsHintColC')), h('small', {}, ''))
      : null,
    list.length
      ? h('div', { class: 'hintrows' }, list.map(row))
      : h('p', { class: 'note' }, t('wsHintNone')),
    h('div', { class: 'hintact' },
      h('button', {
        type: 'button', class: 'btn ghost sm', onclick: () => {
          if (list.length >= HINT_MAX) { toast(t('wsHintFull', { n: HINT_MAX })); return; }
          list.push({ n: '', v: '', c: 5 });
          focusLastHint = true;
          draw();
        },
      }, `＋ ${t('wsHintTitle')}`)));
  // 新加的一行直接把光标送进标题框，不用再点一次
  if (focusLastHint) {
    focusLastHint = false;
    requestAnimationFrame(() => {
      const els = root.querySelectorAll('.hintrow .hn');
      if (els.length) els[els.length - 1].focus();
    });
  }
  return box;
}

// ------------------------------------------------------------------ 点赞
// 别人在题目的线索台上方点「赞」，作者这边每 1 个赞换 1 银芯。
// 赞数存在共享存储里（js/likes.js），结算基准跟着账号档案走，换设备不会重复领。
const likeText = (id) => {
  const n = Number(likes.cachedCounts()[String(id)]) || 0;
  return n > 0 ? `❤ ${n}` : '';
};

function paintLikes() {
  const c = likes.cachedCounts();
  root.querySelectorAll('[data-like]').forEach(el => {
    const n = Number(c[el.getAttribute('data-like')]) || 0;
    el.textContent = n > 0 ? `❤ ${n}` : '';
  });
  const tot = root.querySelector('[data-liketotal]');
  if (tot) {
    const sum = myPuzzles().reduce((s, p) => s + (Number(c[String(p.id)]) || 0), 0);
    tot.textContent = sum ? t('likeTotal', { n: sum }) : '';
  }
}

async function refreshLikes() {
  const list = myPuzzles();
  if (!list.length) return;
  const r = await likes.syncMine(list);
  if (!r.ok) return;
  paintLikes();
  if (r.gain > 0) toast(t('likeGain', { n: r.gain }));
}

function draw() {
  root.replaceChildren(
    h('section', { class: 'card' },
      h('h2', {}, t('workshopTitle')),
      h('p', { class: 'note' }, t('workshopSub')),
      h('p', { class: 'note' }, t('wsNote')),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsJson')),
          h('textarea', { rows: 5, id: 'ws-json', placeholder: '{"awakers":[…],"relics":[…],"battleUuid":"…"}' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn', onclick: () => importJson() }, t('wsBuild')),
          h('label', { class: 'btn ghost filebtn' }, t('wsFile'),
            h('input', { type: 'file', accept: '.json,application/json', onchange: (ev) => readFile(ev) })),
          h('button', { class: 'btn ghost', onclick: () => importCode() }, t('wsImportCode')))),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsUuidLabel')),
          h('input', { type: 'text', id: 'ws-uuid', placeholder: 'a7637e49-3ee0-3748-85ba-ca1a12efdf32', value: draft.uuid || '' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn', onclick: () => loadByCode() }, t('wsLoadByCode')),
          h('button', { class: 'btn ghost', onclick: () => openReplay() }, t('wsOpenReplay')))),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsCodePh')),
          h('input', { type: 'text', id: 'ws-code', placeholder: 'ZJ2-…' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn ghost', onclick: () => loadCloud() }, t('wsCloudLoad'))))),
    h('section', { class: 'card' },
      h('h3', {}, t('wsManual')),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotEditor(k))),
      h('div', { class: 'extras' },
        h('div', { class: 'extra' }, h('b', {}, t('keyLabel') || '钥令'), pickBtn('key', draft.key, v => { draft.key = v; })),
        h('div', { class: 'extra wide' }, h('b', {}, '造物'),
          h('div', { class: 'relics' },
            draft.relics.map(id => {
              const e = idx.creation.get(String(id));
              return h('button', { type: 'button', class: 'pick mini', title: e ? nameOf(e) : id,
                onclick: () => { draft.relics = draft.relics.filter(x => x !== id); draw(); } },
                imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
            }),
            h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', v => {
              if (v && !draft.relics.includes(v)) draft.relics.push(v); draw();
            }) }, h('span', { class: 'plus' }, '＋'), h('small', {}, t('add')))))),
      metaEditor(),
      clueEditor(),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => saveDraft() }, '保存到我的题目'),
        h('button', { class: 'btn ghost', onclick: () => copyCode() }, t('wsShare')),
        h('button', { class: 'btn ghost', onclick: () => play() }, t('wsPlay')),
        h('button', { class: 'btn ghost', onclick: () => upload() }, t('wsUpload')),
        h('button', { class: 'btn ghost', onclick: () => openReplay() }, t('wsOpenReplay')),
        h('button', { class: 'btn ghost', onclick: () => cloudSettings() }, t('wsCloudCfg')),
        h('button', { class: 'btn ghost', onclick: () => { draft = emptyDraft(); draw(); } }, t('reset') || '重置'))),
    h('section', { class: 'card' },
      h('h3', {}, `${t('wsMine')} · ${myPuzzles().length}`,
        h('span', { class: 'note likesum', 'data-liketotal': '' }, '')),
      mineList()));
  paintLikes();
}

function mineList() {
  const list = myPuzzles();
  if (!list.length) return h('p', { class: 'note' }, t('wsNoMine'));
  return h('div', { class: 'minelist' }, list.map((p, i) => h('div', { class: 'mine' },
    h('b', {}, p.title || p.id),
    h('span', { class: 'likebadge', 'data-like': String(p.id || '') }, likeText(p.id)),
    h('small', { class: 'note' }, `${p.team.filter(a => a.tid).length} 名唤醒体 · ${p.relics.length} 造物${hintsOf(p).length ? ` · ${hintsOf(p).length} 条自定义线索` : ''}${p.uuid ? ' · 有回放' : ''}`),
    h('div', { class: 'mineact' },
      h('button', { class: 'link', onclick: () => { draft = JSON.parse(JSON.stringify(p)); draw(); } }, '编辑'),
      h('button', { class: 'link', onclick: () => { draft = JSON.parse(JSON.stringify(p)); copyCode(); } }, t('wsShare')),
      h('button', { class: 'link', onclick: () => removeMine(i) }, t('wsDel'))))));
}

// 从官方回放 JSON 文件导入（浏览器不能跨域 fetch，所以让用户先下载再选文件）
async function readFile(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  try {
    await applyReplay(decodeReplay(new Uint8Array(await f.arrayBuffer())));
  } catch (e) {
    console.warn('replay decode failed', e);
    toast(t('wsParseFail'));
  }
}

// ---------------------------------------------------------------- 题库回查
// 回放只记录「触发过」的密契，精确值要回查题库（题库答案里有完整命轮/密契/造物）。
let PUZZLES = null;
async function puzzleLib() {
  if (PUZZLES) return PUZZLES;
  try {
    const r = await fetch('data/puzzles.json', { cache: 'force-cache' });
    const obj = await r.json();
    PUZZLES = obj.puzzles || obj;
  } catch {
    PUZZLES = [];
  }
  return PUZZLES;
}

async function unsealPuzzle(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), (c) => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  const enc = new TextEncoder();
  for (let i = 0; i < raw.length; i += 32) {
    const ks = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(`${PEPPER}|${p.id}|${i / 32}`)));
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('decode failed');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function lookupPuzzle(uuid) {
  const id = String(uuid || '').trim().toLowerCase();
  if (!id) return null;
  const list = await puzzleLib();
  const hit = list.find((x) => String(x.uuid || '').toLowerCase() === id);
  if (!hit) return null;
  try { return await unsealPuzzle(hit); } catch { return null; }
}

const covByName = () => {
  const m = new Map();
  for (const c of D.covenant || []) {
    if (c.zh) m.set(String(c.zh).trim(), String(c.id));
    if (c.en) m.set(String(c.en).trim().toLowerCase(), String(c.id));
  }
  return m;
};

function replayToDraft(t, exact) {
  const d = emptyDraft();
  d.uuid = t.uuid || '';
  const byName = covByName();
  const blank = () => ({ tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 });
  if (exact && Array.isArray(exact.team) && exact.team.length) {
    d.team = LETTERS.map((_, i) => {
      const a = exact.team[i];
      if (!a) return blank();
      return {
        tid: String(a.tid), lv: num(a.lv, 60), pot: num(a.pot), brk: num(a.brk),
        wheels: (a.wheels || []).slice(0, 2).map(String), cov: a.cov ? String(a.cov) : null,
        dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
      };
    });
  } else {
    d.team = LETTERS.map((_, i) => {
      const a = (t.team || [])[i];
      if (!a) return blank();
      const covId = a.covName ? (byName.get(String(a.covName).trim()) || null) : null;
      return {
        tid: String(a.tid), lv: num(a.lv, 60), pot: num(a.pot), brk: num(a.brk),
        wheels: (a.wheels || []).slice(0, 2).map(String), cov: covId,
        dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
      };
    });
  }
  // 命中题库（exact）时，钥令 / 造物 / 题面数值都用答案里的完整字段
  d.relics = ((exact && exact.relics) || t.relics || []).map(String);
  const key = exact && exact.key != null ? exact.key
    : (t.keeperSkill != null ? t.keeperSkill : (t.key != null ? t.key : null));
  d.key = key != null ? String(key) : null;
  d.rounds = num(t.stats?.rounds) || num(exact && exact.rounds);
  d.cards = num(t.stats?.cards) || num(exact && exact.cards);
  d.maxBout = num(t.stats?.maxBout) || num(exact && exact.maxBout);
  d.deathResist = num(t.stats?.deathResist) || num(exact && exact.deathResist);
  d.playerDmg = num(t.stats?.playerDamage) || num(exact && exact.playerDmg);
  if (exact) {
    d.title = `回放 ${exact.id}`;
    d.season = num(exact.season);
    d.zone = num(exact.zone);
    d.threat = exact.threat || '?';
    d.madness = num(exact.madness);
    d.boss = exact.boss || [];
    d.score = num(exact.score);
    d.hp = num(exact.hp);
    d.left = num(exact.left);
    d.extra = !!exact.extra;
    d.diff = num(exact.diff, 3);
    d.diffScore = num(exact.diffScore, 30);
  } else {
    d.diff = 4;
    d.diffScore = Math.round(20 + Math.min(30, Math.log10(Math.max(1, d.maxBout)) * 4));
  }
  return d;
}

async function applyReplay(rep) {
  const rt = replayTeam(rep);
  const exact = await lookupPuzzle(rt.uuid);
  const keep = hintsOf(draft);           // 导入回放不改动作者已经写好的线索
  draft = replayToDraft(rt, exact);
  draft.hints = keep;
  draw();
  toast(exact ? t('wsReplayExact') : t('wsReplayNote'));
}

async function loadByCode() {
  const raw = ($('#ws-uuid')?.value || '').trim();
  const uuid = raw.replace(/^.*BattleReplay[_-]/i, '').replace(/\.json$/i, '').trim();
  if (!uuid) { toast(t('wsNeedUuid')); return; }
  const hit = await lookupPuzzle(uuid);
  if (hit) {
    const keep = hintsOf(draft);
    draft = replayToDraft({ uuid, stats: {} }, hit);
    draft.hints = keep;
    draw();
    toast(t('wsReplayExact'));
    return;
  }
  draft.uuid = uuid;
  draw();
  toast(t('wsCodeMiss'));
}

function openReplay() {
  let u = (draft.uuid || '').trim();
  if (!u) { u = prompt(t('wsNeedUuid'), '') || ''; }
  if (!u) return;
  draft.uuid = u;
  window.open(REPLAY.json(u), '_blank', 'noopener');
}

// ------------------------------------------------------------------ actions
function normalize() {
  const d = JSON.parse(JSON.stringify(draft));
  if (!d.id) d.id = 'w-' + Date.now().toString(36);
  if (!d.title) d.title = `自建题 ${new Date().toLocaleDateString()}`;
  d.team = d.team.filter(a => a.tid);
  if (d.team.length < 2) return null;
  d.team.forEach(a => { a.wheels = (a.wheels || []).filter(Boolean).slice(0, 2); });
  d.diff = d.relics.length && d.key ? 4 : d.key ? 3 : d.team.some(a => a.wheels.length) ? 2 : 1;
  d.boss = d.boss || [];
  // 自定义线索：标题和内容都空的不留；只有内容没标题的补个默认标题
  d.hints = hintsOf(d).map(c => ({
    n: String(c.n || '').trim().slice(0, 24),
    v: String(c.v || '').trim().slice(0, 140),
    c: clampCost(c.c),
  })).filter(c => c.n || c.v).slice(0, HINT_MAX)
    .map((c, i) => ({ ...c, n: c.n || t('wsHintDefault', { n: i + 1 }) }));
  return d;
}

function importJson() {
  const el = $('#ws-json');
  const d = fromJson(el ? el.value : '');
  if (!d) { toast(t('wsParseFail')); return; }
  d.hints = hintsOf(draft);
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function importCode() {
  const raw = ($('#ws-code')?.value || '').trim();
  const obj = shareCode.dec(raw);
  if (!obj || !obj.team) { toast('题目代码无法解析'); return; }
  draft = { ...emptyDraft(), ...obj, hints: unpackHints(obj.h || obj.hints) };
  draw();
}

function saveDraft() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  const list = myPuzzles();
  const i = list.findIndex(x => x.id === d.id);
  d.at = Date.now();
  if (i >= 0) list[i] = { ...list[i], ...d }; else list.push(d);
  saveMine(list);
  markDirty('mine');
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function removeMine(i) {
  const list = myPuzzles();
  list.splice(i, 1);
  saveMine(list);
  markDirty('mine');
  draw();
}

function codeOf(d) {
  // 分享码只带题目必需字段，避免超长
  return shareCode.enc({
    v: 2, id: d.id, title: d.title, uuid: d.uuid,
    rounds: d.rounds, cards: d.cards, maxBout: d.maxBout, deathResist: d.deathResist,
    hp: d.hp, left: d.left, playerDmg: d.playerDmg, score: d.score, diff: d.diff, diffScore: d.diffScore,
    key: d.key, relics: d.relics, team: d.team,
    h: packHints(d.hints || []),
  });
}

function copyCode() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  const code = codeOf(d);
  (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject())
    .then(() => toast(t('wsCodeCopied')), () => prompt(t('wsShare'), code));
}

function play() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  location.href = 'index.html?p=' + encodeURIComponent(codeOf(d));
}

// ------------------------------------------------------------------ 云题库（多后端）
async function upload() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  toast(t('wsCloudBusy'));
  try {
    const { id, label } = await cloud.save(JSON.parse(JSON.stringify(d)));
    store.set('lastCloud', id);
    toast(t('wsCloudUploaded', { id }) + ' · ' + label);
    copyText(id);
  } catch (e) {
    console.warn('cloud save failed', e);
    toast(t('wsCloudFail'));
  }
}

async function loadCloud() {
  let id = ($('#ws-code')?.value || '').trim();
  if (!id) { id = prompt(t('wsCloudId'), store.get('lastCloud', '')) || ''; }
  if (!id) return;
  if (id.startsWith('ZJ2-')) { importCode(); return; }
  try {
    const obj = await cloud.load(id);
    const p = obj.puzzle || obj;
    if (!p || !p.team) throw new Error('bad payload');
    draft = { ...emptyDraft(), ...p };
    draw();
    toast(t('wsSaved'));
  } catch (e) {
    console.warn('cloud load failed', e);
    toast(t('wsCloudFail'));
  }
}

// 云题库设置：留空则只用 jsonblob（公共、可能被墙）
function cloudSettings() {
  const dlg = h('dialog', { class: 'dlg' });
  const gh = h('input', { type: 'password', placeholder: 'ghp_… / github_pat_…', value: cloudConfig.ghToken.get() });
  const url = h('input', { type: 'url', placeholder: 'https://your-worker.example.workers.dev/bank', value: cloudConfig.customUrl.get() });
  dlg.append(
    h('h3', {}, t('wsCloudCfg')),
    h('p', { class: 'note' }, t('wsCloudCfgNote')),
    h('label', { class: 'fld' }, h('span', {}, 'GitHub token'), gh),
    h('label', { class: 'fld' }, h('span', {}, t('wsCloudCfgUrl')), url),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => {
        cloudConfig.ghToken.set(gh.value); cloudConfig.customUrl.set(url.value);
        toast(t('wsSaved')); dlg.close();
      } }, t('save')),
      h('button', { class: 'btn ghost', onclick: () => dlg.close() }, t('cancel'))),
  );
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());
}

function copyText(txt) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => {});
}

// ------------------------------------------------------------------ picker
const dlg = h('dialog', { class: 'picker' });
document.body.append(dlg);

function openPicker(kind, apply) {
  const all = D[kind].filter(e => e.id != null);
  let q = '';
  const grid = h('div', { class: 'pgrid' });
  const drawList = () => {
    const list = all.filter(e => !q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q));
    grid.replaceChildren(...list.slice(0, 400).map(e => h('button', {
      type: 'button', class: 'pitem', title: e.en,
      onclick: () => { apply(String(e.id)); dlg.close(); },
    }, imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)))));
    if (!list.length) grid.append(h('p', { class: 'note' }, t('noMatch')));
  };
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, KINDS[kind] || kind),
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); drawList(); } }),
      h('button', { class: 'btn sm ghost', onclick: () => { apply(null); dlg.close(); } }, t('clear')),
      h('button', { class: 'btn sm', onclick: () => dlg.close() }, t('close'))),
    grid);
  drawList();
  dlg.showModal();
}

draw();
// 我的题目：拉一次赞数，有新赞就折算成银芯；顺带把上次没发完的赞补发
refreshLikes();
likes.resume();
