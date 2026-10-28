import test from 'node:test';
import assert from 'node:assert/strict';
import { CASE, CODEBOOK, enc } from '../data/case1.js';
import { newGame, run, complete } from '../js/engine.js';

const play = (st, ...lines) => lines.flatMap((l) => run(CASE, st, l));
const text = (lines) => lines.map((l) => l.s).join('\n');

test('data integrity: every reference resolves', () => {
  for (const [p, f] of Object.entries(CASE.files)) {
    assert.ok(p.startsWith('/'), p);
    for (const c of f.reveals || []) assert.ok(CASE.clues[c], `${p} -> ${c}`);
  }
  for (const [id, P] of Object.entries(CASE.people)) {
    for (const t of Object.values(P.topics)) for (const c of [...(t.reveals || []), ...(t.requires || []), ...(t.when || [])]) assert.ok(CASE.clues[c], `${id}: ${c}`);
    for (const [k, r] of Object.entries(P.react)) { assert.ok(CASE.clues[k] || CASE.files[k], `${id} react ${k}`); for (const c of r.reveals || []) assert.ok(CASE.clues[c]); }
  }
  for (const [id, c] of Object.entries(CASE.clues)) for (const s of [...(c.clears || []), ...(c.implicates || [])]) assert.ok(CASE.people[s], `${id} ${s}`);
  for (const k of CASE.solution.key) assert.ok(CASE.clues[k]);
  for (const h of CASE.hints) for (const c of h.after) assert.ok(CASE.clues[c]);
});

test('every clue is obtainable (files, interviews or evidence reactions)', () => {
  const src = new Set();
  for (const f of Object.values(CASE.files)) for (const c of f.reveals || []) src.add(c);
  for (const P of Object.values(CASE.people)) { for (const t of Object.values(P.topics)) for (const c of t.reveals || []) src.add(c); for (const r of Object.values(P.react)) for (const c of r.reveals || []) src.add(c); }
  for (const id of Object.keys(CASE.clues)) assert.ok(src.has(id), `unobtainable: ${id}`);
});

test('ciphers: codebook round-trips and ciphertext hides the words', () => {
  for (const [p, f] of Object.entries(CASE.files)) if (f.cipher) {
    const cipher = enc(f.cipher.plain);
    assert.ok(!/[一-鿿]/.test(cipher), `${p} cipher still has Chinese`);
    const back = cipher.replace(/\[(\d\d)\]/g, (_, n) => CODEBOOK[+n - 1]);
    assert.equal(back, f.cipher.plain);
  }
});

test('locks: every password is derivable from a readable file', () => {
  for (const [p, f] of Object.entries(CASE.files)) if (f.lock) {
    const open = Object.entries(CASE.files).filter(([q, g]) => q !== p && !g.lock && !g.cipher);
    assert.ok(open.some(([, g]) => g.text.includes(`LZ-${f.lock.password}`) || g.text.includes(f.lock.password)), `${p} password not discoverable`);
  }
});

test('solvable: reachable evidence clears every innocent suspect and leaves one', () => {
  const S = CASE.solution;
  const cleared = new Set(), implicated = new Set();
  for (const c of Object.values(CASE.clues)) { (c.clears || []).forEach((x) => cleared.add(x)); (c.implicates || []).forEach((x) => implicated.add(x)); }
  const left = S.suspects.filter((s) => !cleared.has(s));
  assert.deepEqual(left, [S.culprit]);
  assert.ok(implicated.has(S.culprit));
  for (const s of S.suspects.filter((x) => x !== S.culprit)) assert.ok(!implicated.has(s), `${s} is implicated by a clue`);
  assert.ok(S.key.length >= S.needKey);
});

test('commands unlock progressively; broken ones say so', () => {
  const st = newGame(CASE);
  assert.match(text(play(st, 'ask lin')), /已损坏/);
  assert.match(text(play(st, 'cat readme')), /RECORDS-7/);
  play(st, 'cat /case/briefing.txt');
  assert.ok(st.unlocked.includes('ask') && st.unlocked.includes('accuse'));
  assert.match(text(play(st, 'grep 林昼')), /损坏/);
  play(st, 'cat timeline');
  assert.match(text(play(st, 'grep 林昼')), /林昼/);
  assert.match(text(play(st, 'xyzzy')), /未知指令/);
});

test('paths, prefixes, people names and hidden files', () => {
  const st = newGame(CASE);
  play(st, 'cd people');
  assert.equal(st.cwd, '/people');
  assert.match(text(play(st, 'cat 林昼')), /LZ-4417/);
  play(st, 'cd /');
  assert.ok(!text(play(st, 'ls')).includes('.archive'));
  assert.ok(text(play(st, 'ls -a')).includes('.archive'));
  assert.match(text(play(st, 'cat /.archive/duty_roster_y3.txt')), /林微/);
  assert.match(text(play(st, 'cat nonexistent')), /找不到/);
  assert.ok(complete(CASE, st, 'ca').includes('cat'));
});

test('locks and ciphers gate evidence', () => {
  const st = newGame(CASE);
  play(st, 'cat /case/briefing.txt');
  const locked = text(play(st, 'cat dispense'));
  assert.match(locked, /加锁/); assert.ok(!st.clues.includes('c_dispense_victims'));
  assert.match(text(play(st, 'open dispense 0000')), /密码错误/);
  play(st, 'open dispense 4417');
  assert.ok(st.clues.includes('c_dispense_victims'));
  assert.match(text(play(st, 'cat analyzer')), /\[\d\d\]/);
  assert.match(text(play(st, 'decode analyzer')), /损坏/);
  play(st, 'cat codebook');
  assert.match(text(play(st, 'decode analyzer')), /阳性/);
  assert.ok(st.clues.includes('c_lab_positive') && st.clues.includes('c_cups_negative'));
});

test('lies only become clues once you hold the contradicting evidence', () => {
  const st = newGame(CASE);
  play(st, 'cat briefing', 'ask 林昼 药');
  assert.ok(!st.clues.includes('c_lin_lie1'));
  play(st, 'cat dispense', 'open dispense 4417', 'ask 林昼 药');
  assert.ok(st.clues.includes('c_lin_lie1'));
  const out = play(st, 'show c_dispense_victims 林昼');
  assert.match(text(out), /自动记录/); assert.ok(st.clues.includes('c_lin_admits'));
  assert.match(text(play(st, 'show 1 周棠')), /没有明显反应/);
});

function solve(st) {
  const cmds = ['cat briefing', 'cat timeline', 'cat rules', 'cat codebook', 'cat linzhou', 'cd reports', 'cat fangyao', 'cat hance', 'cd /logs', 'cat meal', 'cat door_kitchen', 'cat door_med', 'cat door_corr', 'cat gm_b',
    'cat dispense', 'open dispense 4417', 'cd /lab', 'cat analyzer', 'decode analyzer', 'cat med_manual', 'cat inventory_d1', 'cd /scene', 'cat medbay', 'cat room104', 'cd /', 'cat /.archive/duty_roster_y3.txt', 'cat /sys/.gm_script.hist',
    'ask 林昼 药', 'show c_dispense_victims 林昼', 'ask 周棠 第二夜', 'show c_kitchen_zhou 周棠', 'ask 沈烬 第三夜', 'show c_locked_rooms 沈烬', 'ask 顾言 规则', 'show c_page11_missing 顾言', 'cat /scene/room101.txt', 'cat /comm/radio.enc', 'decode radio', 'ask 林昼 药品库', 'ask 林昼 家人'];
  return play(st, ...cmds);
}

test('full playthrough reaches the perfect ending with rank S', () => {
  const st = newGame(CASE);
  solve(st);
  for (const k of CASE.solution.key) assert.ok(st.clues.includes(k), `missing key clue ${k}`);
  assert.equal(st.clues.length, Object.keys(CASE.clues).length - CASE.hints.length * 0, 'every clue was found');
  const idx = (id) => st.clues.indexOf(id) + 1;
  const out = play(st, 'accuse', '1', '2', '2', [idx('c_dispense_victims'), idx('c_lab_positive'), idx('c_old_roster')].join(' '));
  assert.match(text(out), /报告通过/); assert.equal(st.done, 'perfect'); assert.equal(st.rank, 'S');
});

test('accusation feedback: wrong person, wrong method, too little evidence; three strikes end it', () => {
  const st = newGame(CASE);
  solve(st);
  const idx = (id) => st.clues.indexOf(id) + 1, good = [idx('c_dispense_victims'), idx('c_lab_positive'), idx('c_old_roster')].join(' ');
  assert.match(text(play(st, 'accuse', '2', '2', '2', good)), /驳回/); assert.equal(st.wrong, 1);
  const partial = text(play(st, 'accuse', '1', '1', '2', good));
  assert.match(partial, /手法站不住脚/); assert.ok(!/动机缺乏/.test(partial)); assert.equal(st.wrong, 2);
  assert.match(text(play(st, 'accuse', '1', '2', '2', '1 2 3')), /关键证据不足/);
  assert.equal(st.done, 'partial');
  const st2 = newGame(CASE); play(st2, 'cat briefing');
  assert.match(text(play(st2, 'accuse', 'cancel')), /取消/);
  assert.match(text(play(st2, 'accuse', '9')), /请输入编号/);
});

test('hints are progressive and cost rank', () => {
  const st = newGame(CASE);
  play(st, 'cat briefing');
  assert.match(text(play(st, 'hint')), /who/);
  solve(st);
  assert.match(text(play(st, 'hint')), /accuse/);
  assert.equal(st.hints, 2);
});
