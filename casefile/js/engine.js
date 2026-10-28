// Terminal investigation engine: pure state + command interpreter (no DOM), so it can be tested in Node.
// run(CASE, state, line) -> [{ k, s }]  where k = out | sys | err | dim | clue | ask | cmd | head
import { enc } from '../data/case1.js';

const COMMANDS = {
  help: 'help                  查看可用指令',
  ls: 'ls [-a] [目录]        列出文件（-a 含隐藏项）',
  cd: 'cd 目录               进入目录（cd .. / cd /）',
  pwd: 'pwd                   显示当前目录',
  cat: 'cat 文件              读取文件（可写前几个字母或人名）',
  clear: 'clear                 清屏',
  hint: 'hint                  请求提示（会影响评级）',
  save: 'save                  手动存档（自动存档一直开着）',
  grep: 'grep 关键词 [目录]    在【已读】文件里搜索',
  who: 'who                   列出相关人员',
  ask: 'ask 人 [话题]         问话（不写话题看可问的话题）',
  show: 'show 线索/文件 人     出示线索或文件，观察反应',
  board: 'board [编号]          查看线索板',
  note: 'note [文字]           记笔记（单独输入查看）',
  decode: 'decode 文件           解码密文文件（需读过码本）',
  open: 'open 文件 密码        用密码打开加锁文件',
  accuse: 'accuse                提交最终报告',
};
export const ALL_COMMANDS = Object.keys(COMMANDS);
const L = (k, s) => ({ k, s });
const split = (line) => line.trim().split(/\s+/).filter(Boolean);

export function newGame(C) {
  return { v: 1, id: C.id, cwd: '/', unlocked: [...C.start], read: {}, decoded: {}, opened: {}, clues: [], notes: [], hints: 0, lastHint: -1, wrong: 0, asked: {}, prompt: null, done: null, turns: 0 };
}
export const boot = (C) => C.boot.map((s) => L('sys', s));

// ---------------------------------------------------------------- paths
const dirOf = (p) => p.slice(0, p.lastIndexOf('/')) || '/';
const baseOf = (p) => p.slice(p.lastIndexOf('/') + 1);
function joinPath(cwd, arg) {
  const parts = (arg.startsWith('/') ? arg : `${cwd}/${arg}`).split('/').filter((x) => x && x !== '.');
  const out = [];
  for (const x of parts) { if (x === '..') out.pop(); else out.push(x); }
  return '/' + out.join('/');
}
const allDirs = (C) => { const s = new Set(['/']); for (const p of Object.keys(C.files)) { let d = dirOf(p); while (d !== '/') { s.add(d); d = dirOf(d); } } return s; };
const hidden = (p) => p.split('/').some((x) => x.startsWith('.'));
const stem = (p) => baseOf(p).replace(/\.[^.]+$/, '');

function findFile(C, st, arg) {
  if (!arg) return { err: '请指定文件。' };
  const abs = joinPath(st.cwd, arg);
  if (C.files[abs]) return { path: abs };
  const q = arg.toLowerCase();
  // match in cwd first, then everywhere: basename / stem prefix, title, alias
  const score = (p) => {
    const f = C.files[p], b = baseOf(p).toLowerCase(), s = stem(p).toLowerCase();
    if (b === q || s === q) return 3;
    if (f.t && f.t.toLowerCase() === q) return 3;
    if (b.startsWith(q) || s.startsWith(q)) return 2;
    if (f.t && f.t.toLowerCase().includes(q)) return 1;
    return 0;
  };
  for (const scope of [(p) => dirOf(p) === st.cwd, () => true]) {
    const hits = Object.keys(C.files).filter(scope).map((p) => [p, score(p)]).filter((x) => x[1] > 0);
    if (!hits.length) continue;
    const best = Math.max(...hits.map((x) => x[1])), top = hits.filter((x) => x[1] === best).map((x) => x[0]);
    if (top.length === 1) return { path: top[0] };
    return { err: `有多个匹配：${top.join('、')}` };
  }
  return { err: `找不到文件：${arg}` };
}
const fileState = (st, p) => (st.read[p] ? '' : '新');

// ---------------------------------------------------------------- clues
function addClue(C, st, id, out) {
  if (!id || st.clues.includes(id) || !C.clues[id]) return false;
  st.clues.push(id);
  out.push(L('clue', `[线索 +1] #${st.clues.length} ${C.clues[id].t}`));
  return true;
}
function applyUnlocks(C, st, unlocks, out) {
  for (const u of unlocks || []) if (!st.unlocked.includes(u)) { st.unlocked.push(u); out.push(L('sys', `※ 终端功能恢复：${u}　（${COMMANDS[u]?.split('  ')[0] || u}）`)); }
}
const isOpen = (st, p, f) => !f.lock || st.opened[p];
const isPlain = (st, p, f) => !f.cipher || st.decoded[p];

// ---------------------------------------------------------------- people
function findPerson(C, q) {
  const s = (q || '').toLowerCase();
  if (!s) return null;
  for (const [id, p] of Object.entries(C.people)) if (id === s || p.name === q || p.alias.some((a) => a.toLowerCase() === s)) return id;
  const hits = Object.entries(C.people).filter(([id, p]) => p.name.startsWith(q) || p.alias.some((a) => a.toLowerCase().startsWith(s)));
  return hits.length === 1 ? hits[0][0] : null;
}
const deadOf = (C) => Object.keys(C.files).filter((p) => p.startsWith('/reports/')).map((p) => stem(p));

// ---------------------------------------------------------------- the interpreter
export function run(C, st, line) {
  const out = [];
  line = line.trim();
  if (!line) return out;
  st.turns++;
  if (st.prompt) return handlePrompt(C, st, line, out);
  const [cmd0, ...args] = split(line), cmd = cmd0.toLowerCase();
  if (!ALL_COMMANDS.includes(cmd)) { out.push(L('err', `未知指令：${cmd0}。输入 help 查看可用指令。`)); return out; }
  if (!st.unlocked.includes(cmd)) { out.push(L('err', `指令 ${cmd} 已损坏。（读到相关档案后可能恢复——先 cat /sys/README.txt）`)); return out; }
  const fn = { help, ls, cd, pwd, cat, clear, hint, save, grep, who, ask, show, board, note, decode, open, accuse }[cmd];
  fn(C, st, args, out, line);
  return out;
}

function help(C, st, a, out) {
  out.push(L('head', '可用指令：'));
  for (const c of ALL_COMMANDS) if (st.unlocked.includes(c)) out.push(L('out', '  ' + COMMANDS[c]));
  const bad = ALL_COMMANDS.filter((c) => !st.unlocked.includes(c)).length;
  if (bad) out.push(L('dim', `  …… 另有 ${bad} 条指令尚未恢复（读档案会让它们逐步恢复）`));
  out.push(L('dim', '  小提示：按 Tab 补全，↑↓ 翻历史；点击输出里的路径可直接填入。'));
}
function pwd(C, st, a, out) { out.push(L('out', st.cwd)); }
function clear() { /* handled by the UI via the 'clear' marker */ }
clear.marker = true;
function save(C, st, a, out) { out.push(L('sys', '已存档。（自动存档一直开着。）')); }

function ls(C, st, args, out) {
  const all = args.includes('-a');
  const target = args.find((x) => !x.startsWith('-'));
  const dir = target ? joinPath(st.cwd, target) : st.cwd;
  const dirs = allDirs(C);
  if (!dirs.has(dir)) { out.push(L('err', `没有这个目录：${target}`)); return; }
  const subs = [...dirs].filter((d) => dirOf(d) === dir && d !== dir && (all || !baseOf(d).startsWith('.'))).sort();
  const files = Object.keys(C.files).filter((p) => dirOf(p) === dir && (all || !baseOf(p).startsWith('.'))).sort();
  out.push(L('head', `${dir}：`));
  for (const d of subs) out.push(L('out', `  ${baseOf(d)}/`));
  for (const p of files) {
    const f = C.files[p], tag = [fileState(st, p) && '新', f.lock && !st.opened[p] && '锁', f.cipher && !st.decoded[p] && '密'].filter(Boolean).map((x) => `[${x}]`).join('');
    out.push(L('out', `  ${baseOf(p).padEnd(22, ' ')} ${f.d || ''} ${tag}`));
  }
  if (!subs.length && !files.length) out.push(L('dim', '  （空）'));
  if (!all && Object.keys(C.files).some((p) => hidden(p) && dirOf(p) === dir)) out.push(L('dim', '  （这里还有隐藏项，试试 ls -a）'));
}
function cd(C, st, args, out) {
  const t = args[0] || '/';
  const abs = joinPath(st.cwd, t), dirs = allDirs(C);
  if (dirs.has(abs)) { st.cwd = abs; return; }
  const hit = [...dirs].filter((d) => baseOf(d).startsWith(t) && dirOf(d) === st.cwd);
  if (hit.length === 1) { st.cwd = hit[0]; return; }
  out.push(L('err', `没有这个目录：${t}`));
}

function showFile(C, st, p, out) {
  const f = C.files[p];
  out.push(L('head', `── ${p} ──`));
  if (f.lock && !st.opened[p]) {
    out.push(L('out', '【文件已加锁】')); out.push(L('dim', f.lock.hint));
    out.push(L('sys', '用 open 文件 密码 打开。'));
    applyUnlocks(C, st, ['open'], out);
    return false;
  }
  if (f.cipher && !st.decoded[p]) {
    for (const ln of enc(f.cipher.plain).split('\n')) out.push(L('out', ln));
    out.push(L('dim', '（这是密文。找一本码本，然后 decode 它。）'));
    return false;
  }
  for (const ln of (f.cipher ? f.cipher.plain : f.text).split('\n')) out.push(L('out', ln));
  st.read[p] = true;
  applyUnlocks(C, st, f.unlocks, out);
  for (const c of f.reveals || []) addClue(C, st, c, out);
  return true;
}
function cat(C, st, args, out) {
  const r = findFile(C, st, args.join(' '));
  if (r.err) { out.push(L('err', r.err)); return; }
  showFile(C, st, r.path, out);
}
function open(C, st, args, out) {
  const r = findFile(C, st, args[0]);
  if (r.err) { out.push(L('err', r.err)); return; }
  const f = C.files[r.path];
  if (!f.lock) { out.push(L('err', '这个文件没有加锁。')); return; }
  if (st.opened[r.path]) { out.push(L('dim', '已经打开过了，直接 cat。')); return; }
  if (!args[1]) { out.push(L('err', '用法：open 文件 密码')); return; }
  if (args[1] !== f.lock.password) { out.push(L('err', '密码错误。')); return; }
  st.opened[r.path] = true;
  out.push(L('sys', '密码正确，文件已解锁。'));
  showFile(C, st, r.path, out);
}
function decode(C, st, args, out) {
  const r = findFile(C, st, args[0]);
  if (r.err) { out.push(L('err', r.err)); return; }
  const f = C.files[r.path];
  if (!f.cipher) { out.push(L('err', '这个文件不是密文。')); return; }
  if (st.decoded[r.path]) { out.push(L('dim', '已经解码过了，直接 cat。')); return; }
  if (!st.read['/lab/codebook.txt']) { out.push(L('err', '没有码本，无法解码。（码本在哪里？看看 /lab）')); return; }
  st.decoded[r.path] = true;
  out.push(L('sys', '已用码本解码。'));
  showFile(C, st, r.path, out);
}

function readable(C, st) { return Object.keys(C.files).filter((p) => st.read[p]); }
function grep(C, st, args, out) {
  const kw = args[0];
  if (!kw) { out.push(L('err', '用法：grep 关键词 [目录]')); return; }
  const scope = args[1] ? joinPath(st.cwd, args[1]) : '/';
  let n = 0, unread = 0;
  for (const p of Object.keys(C.files)) {
    if (!p.startsWith(scope === '/' ? '/' : scope)) continue;
    const f = C.files[p], txt = f.cipher ? f.cipher.plain : f.text;
    if (!txt.includes(kw)) continue;
    if (!st.read[p]) { unread++; continue; }
    for (const ln of txt.split('\n')) if (ln.includes(kw)) { out.push(L('out', `${p}: ${ln.trim()}`)); n++; }
  }
  if (!n) out.push(L('dim', `在已读文件里没有找到“${kw}”。`));
  if (unread) out.push(L('dim', `（还有 ${unread} 个没读过的文件含有“${kw}”）`));
}

function who(C, st, a, out) {
  const dead = deadOf(C);
  out.push(L('head', '相关人员：'));
  for (const [id, p] of Object.entries(C.people)) out.push(L('out', `  ${p.name}  ${p.role}  ${st.asked[id] ? `（已问话 ${st.asked[id]} 次）` : ''}　可 ask ${p.name}`));
  out.push(L('dim', '  死者：方遥、乔明、许芷、韩策（档案见 /people 与 /reports）'));
  void dead;
}

function ask(C, st, args, out) {
  const id = findPerson(C, args[0]);
  if (!args[0]) { out.push(L('err', '用法：ask 人 [话题]　例：ask 林昼 药')); return; }
  if (!id) { out.push(L('err', `没有这个人：${args[0]}。输入 who 查看。`)); return; }
  const P = C.people[id];
  const avail = Object.entries(P.topics).filter(([, t]) => (t.requires || []).every((c) => st.clues.includes(c)));
  if (args.length === 1) {
    out.push(L('head', `${P.name}（${P.role}）— ${P.bio}`));
    out.push(L('out', '可问的话题：' + avail.map(([k]) => k).join('、')));
    out.push(L('dim', '也可以试试别的词，例如线索里出现过的名字或物品。'));
    return;
  }
  const q = args.slice(1).join(' ');
  const hit = Object.entries(P.topics).find(([k]) => k === q) || Object.entries(P.topics).find(([k]) => q.includes(k) || k.includes(q));
  st.asked[id] = (st.asked[id] || 0) + 1;
  if (!hit) { out.push(L('ask', `${P.name}：“……这个我不太清楚。”`)); return; }
  const [k, t] = hit;
  if (!(t.requires || []).every((c) => st.clues.includes(c))) { out.push(L('ask', `${P.name}：“……”（对方没有反应。也许你还缺少与它相关的线索。）`)); return; }
  out.push(L('head', `【${P.name} · ${k}】`));
  out.push(L('ask', t.text));
  for (const c of t.reveals || []) if ((t.when || []).every((w) => st.clues.includes(w))) addClue(C, st, c, out);
  if ((t.when || []).some((w) => !st.clues.includes(w)) && t.reveals) out.push(L('dim', '（这番话有点可疑……也许等你掌握更多线索再来对照。）'));
}

function resolveEvidence(C, st, token) {
  if (/^#?\d+$/.test(token)) { const i = +token.replace('#', '') - 1; return st.clues[i] ? { id: st.clues[i] } : null; }
  if (C.clues[token] && st.clues.includes(token)) return { id: token };
  const byTitle = st.clues.filter((c) => C.clues[c].t.includes(token));
  if (byTitle.length === 1) return { id: byTitle[0] };
  const f = findFile(C, st, token);
  if (f.path && st.read[f.path]) return { id: f.path };
  return null;
}
function show(C, st, args, out) {
  if (args.length < 2) { out.push(L('err', '用法：show 线索编号/文件 人　例：show 3 林昼')); return; }
  const pid = findPerson(C, args[args.length - 1]);
  if (!pid) { out.push(L('err', `没有这个人：${args[args.length - 1]}`)); return; }
  const ev = resolveEvidence(C, st, args.slice(0, -1).join(' '));
  if (!ev) { out.push(L('err', '你还没有这条线索 / 没读过这个文件。（board 查看线索）')); return; }
  const P = C.people[pid], r = P.react[ev.id], title = C.clues[ev.id]?.t || C.files[ev.id]?.t;
  st.asked[pid] = (st.asked[pid] || 0) + 1;
  out.push(L('head', `你向${P.name}出示：${title}`));
  if (!r) { out.push(L('ask', `${P.name}看了一眼，没有明显反应。`)); return; }
  out.push(L('ask', `${P.name}：${r.text}`));
  for (const c of r.reveals || []) addClue(C, st, c, out);
}

function board(C, st, args, out) {
  if (args[0]) {
    const i = +args[0].replace('#', '') - 1, id = st.clues[i];
    if (!id) { out.push(L('err', '没有这条线索。')); return; }
    out.push(L('head', `#${i + 1} ${C.clues[id].t}　[${C.clues[id].kind}]`)); out.push(L('out', C.clues[id].tx)); return;
  }
  if (!st.clues.length) { out.push(L('dim', '线索板是空的。读档案、问话、出示线索都会产生线索。')); return; }
  out.push(L('head', `线索板（${st.clues.length}/${Object.keys(C.clues).length}）　board 编号 看详情`));
  st.clues.forEach((id, i) => out.push(L('out', `  #${String(i + 1).padEnd(3)} [${C.clues[id].kind}] ${C.clues[id].t}`)));
}
function note(C, st, args, out, line) {
  const t = line.replace(/^\s*note\s*/i, '');
  if (!t) { out.push(L('head', '笔记：')); if (!st.notes.length) out.push(L('dim', '（空）')); st.notes.forEach((n, i) => out.push(L('out', `  ${i + 1}. ${n}`))); return; }
  st.notes.push(t); out.push(L('sys', '已记下。'));
}
function hint(C, st, a, out) {
  let idx = -1;
  C.hints.forEach((h, i) => { if (h.after.every((c) => st.clues.includes(c))) idx = i; });
  st.hints++;
  out.push(L('sys', `提示（已用 ${st.hints} 次，会影响评级）：${C.hints[idx].text}`));
}

// ---------------------------------------------------------------- accusation
function accuse(C, st, a, out) {
  if (st.done) { out.push(L('dim', '报告已经提交，案件结束。输入 restart 可重新开始。')); return; }
  if (st.clues.length < 6) out.push(L('dim', `（你只有 ${st.clues.length} 条线索，现在提交很可能会被驳回。）`));
  st.prompt = { step: 'culprit', ans: {} };
  askStep(C, st, out);
}
function askStep(C, st, out) {
  const p = st.prompt, S = C.solution;
  if (p.step === 'culprit') { out.push(L('head', '【提交报告 1/4】凶手是谁？输入编号：')); S.suspects.forEach((id, i) => out.push(L('out', `  ${i + 1}. ${C.people[id].name}（${C.people[id].role}）`))); }
  if (p.step === 'method') { out.push(L('head', '【2/4】手法是什么？')); S.methods.forEach((m, i) => out.push(L('out', `  ${i + 1}. ${m}`))); }
  if (p.step === 'motive') { out.push(L('head', '【3/4】动机是什么？')); S.motives.forEach((m, i) => out.push(L('out', `  ${i + 1}. ${m}`))); }
  if (p.step === 'clues') {
    out.push(L('head', `【4/4】选出至少 ${S.needKey} 条支撑报告的关键线索（用空格分隔线索编号）：`));
    st.clues.forEach((id, i) => out.push(L('out', `  #${i + 1} ${C.clues[id].t}`)));
  }
  out.push(L('dim', '（输入 cancel 取消）'));
}
function handlePrompt(C, st, line, out) {
  const p = st.prompt, S = C.solution;
  if (/^(cancel|取消)$/i.test(line)) { st.prompt = null; out.push(L('sys', '已取消提交。')); return out; }
  const n = +line;
  if (p.step === 'culprit') { if (!(n >= 1 && n <= S.suspects.length)) { out.push(L('err', '请输入编号。')); return out; } p.ans.culprit = S.suspects[n - 1]; p.step = 'method'; }
  else if (p.step === 'method') { if (!(n >= 1 && n <= S.methods.length)) { out.push(L('err', '请输入编号。')); return out; } p.ans.method = n - 1; p.step = 'motive'; }
  else if (p.step === 'motive') { if (!(n >= 1 && n <= S.motives.length)) { out.push(L('err', '请输入编号。')); return out; } p.ans.motive = n - 1; p.step = 'clues'; }
  else if (p.step === 'clues') {
    const ids = [...new Set(line.split(/[\s,，]+/).map((x) => st.clues[+x.replace('#', '') - 1]).filter(Boolean))];
    if (ids.length < S.needKey) { out.push(L('err', `至少选 ${S.needKey} 条，请用空格分隔编号。`)); return out; }
    p.ans.clues = ids; st.prompt = null; return judge(C, st, p.ans, out);
  }
  askStep(C, st, out);
  return out;
}
function judge(C, st, ans, out) {
  const S = C.solution;
  const culpritOk = ans.culprit === S.culprit, methodOk = ans.method === S.method, motiveOk = ans.motive === S.motive;
  const keyHits = ans.clues.filter((c) => S.key.includes(c)).length, keyOk = keyHits >= S.needKey;
  out.push(L('head', '── 审核结果 ──'));
  if (!culpritOk) {
    st.wrong++;
    out.push(L('err', C.epilogue.wrong.split('\n')[0]));
    out.push(L('out', C.epilogue.wrong.split('\n').slice(1).join('\n')));
    if (st.wrong >= 3) { st.done = 'failed'; out.push(L('err', '三次报告均被驳回，案件移交他人。输入 restart 重新开始。')); } else out.push(L('dim', `（剩余机会 ${3 - st.wrong} 次。再看看谁有机会、有手法、有动机。）`));
    return out;
  }
  if (methodOk && motiveOk && keyOk) {
    st.done = 'perfect';
    const rank = st.hints === 0 && st.wrong === 0 ? 'S' : st.hints <= 2 && st.wrong <= 1 ? 'A' : 'B';
    st.rank = rank;
    for (const ln of C.epilogue.perfect.split('\n')) out.push(L('out', ln));
    out.push(L('sys', `评级 ${rank}　线索 ${st.clues.length}/${Object.keys(C.clues).length}　提示 ${st.hints} 次　驳回 ${st.wrong} 次`));
    out.push(L('dim', '输入 restart 重新开始。'));
    return out;
  }
  st.wrong++;
  out.push(L('sys', '凶手正确，但报告存在缺口：'));
  if (!methodOk) out.push(L('err', '　· 手法站不住脚——毒是怎么进入受害者身体的？'));
  if (!motiveOk) out.push(L('err', '　· 动机缺乏依据——凶手为什么选这四个人？'));
  if (!keyOk) out.push(L('err', `　· 关键证据不足——你选的线索只有 ${keyHits} 条能直接支撑（需要 ${S.needKey} 条）。`));
  if (st.wrong >= 3) { st.done = 'partial'; for (const ln of C.epilogue.partial.split('\n')) out.push(L('out', ln)); out.push(L('dim', '输入 restart 重新开始。')); } else out.push(L('dim', `（剩余机会 ${3 - st.wrong} 次。）`));
  return out;
}

// ---------------------------------------------------------------- completion (for the UI)
export function complete(C, st, line) {
  const m = line.match(/^(\S*)$/);
  if (m) return ALL_COMMANDS.filter((c) => c.startsWith(m[1].toLowerCase()) && st.unlocked.includes(c));
  const [cmd] = split(line), last = line.endsWith(' ') ? '' : split(line).pop();
  const people = Object.values(C.people).flatMap((p) => [p.name, p.alias[1] || p.alias[0]]);
  let pool = [];
  if (['cat', 'decode', 'open', 'grep'].includes(cmd)) pool = Object.keys(C.files).filter((p) => !hidden(p)).map(baseOf);
  if (['cd', 'ls'].includes(cmd)) pool = [...allDirs(C)].filter((d) => d !== '/' && !baseOf(d).startsWith('.')).map(baseOf);
  if (['ask', 'show'].includes(cmd)) pool = people;
  return pool.filter((x) => x.toLowerCase().startsWith(last.toLowerCase()) && x !== last);
}
