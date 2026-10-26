// 创意工坊：导入战报 → 生成自己的推理题 → 分享码 / 云题库
import { $, h, store, nav, t, lang, loadDict, imgEl, nameOf, shareCode, REPLAY } from './common.js';
import { cloud, cloudConfig } from './cloud.js';
import { decodeReplay, replaySummary } from './replay.js';

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
    key: null, relics: [], team: LETTERS.map(() => ({ tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 })),
  };
}
let draft = emptyDraft();

const myPuzzles = () => store.get('myPuzzles', []);
const saveMine = (list) => store.set('myPuzzles', list);

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
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => saveDraft() }, '保存到我的题目'),
        h('button', { class: 'btn ghost', onclick: () => copyCode() }, t('wsShare')),
        h('button', { class: 'btn ghost', onclick: () => play() }, t('wsPlay')),
        h('button', { class: 'btn ghost', onclick: () => upload() }, t('wsUpload')),
        h('button', { class: 'btn ghost', onclick: () => openReplay() }, t('wsOpenReplay')),
        h('button', { class: 'btn ghost', onclick: () => cloudSettings() }, t('wsCloudCfg')),
        h('button', { class: 'btn ghost', onclick: () => { draft = emptyDraft(); draw(); } }, t('reset') || '重置'))),
    h('section', { class: 'card' }, h('h3', {}, `${t('wsMine')} · ${myPuzzles().length}`), mineList()));
}

function mineList() {
  const list = myPuzzles();
  if (!list.length) return h('p', { class: 'note' }, t('wsNoMine'));
  return h('div', { class: 'minelist' }, list.map((p, i) => h('div', { class: 'mine' },
    h('b', {}, p.title || p.id),
    h('small', { class: 'note' }, `${p.team.filter(a => a.tid).length} 名唤醒体 · ${p.relics.length} 造物${p.uuid ? ' · 有回放' : ''}`),
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
    const buf = new Uint8Array(await f.arrayBuffer());
    const rep = decodeReplay(buf);
    const data = rep && rep.battleDat ? replaySummary(rep) : rep;
    const txt = JSON.stringify(data);
    $('#ws-json').value = txt;
    importJson();
    if (data && data.source === 'replay') toast(t('wsReplayNote'));
  } catch (e) {
    console.warn('replay decode failed', e);
    toast(t('wsParseFail'));
  }
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
  return d;
}

function importJson() {
  const el = $('#ws-json');
  const d = fromJson(el ? el.value : '');
  if (!d) { toast(t('wsParseFail')); return; }
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function importCode() {
  const raw = ($('#ws-code')?.value || '').trim();
  const obj = shareCode.dec(raw);
  if (!obj || !obj.team) { toast('题目代码无法解析'); return; }
  draft = { ...emptyDraft(), ...obj };
  draw();
}

function saveDraft() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  const list = myPuzzles();
  const i = list.findIndex(x => x.id === d.id);
  if (i >= 0) list[i] = d; else list.push(d);
  saveMine(list);
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function removeMine(i) {
  const list = myPuzzles();
  list.splice(i, 1);
  saveMine(list);
  draw();
}

function codeOf(d) {
  // 分享码只带题目必需字段，避免超长
  return shareCode.enc({
    v: 2, id: d.id, title: d.title, uuid: d.uuid,
    rounds: d.rounds, cards: d.cards, maxBout: d.maxBout, deathResist: d.deathResist,
    hp: d.hp, left: d.left, playerDmg: d.playerDmg, score: d.score, diff: d.diff, diffScore: d.diffScore,
    key: d.key, relics: d.relics, team: d.team,
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
