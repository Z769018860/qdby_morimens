// 工坊：把玩家自撰的「卷宗」编译成一份能直接喂给 engine.js 的 G。
// 这里不碰 DOM，纯数据变换，方便用 node --test 覆盖。
// 约定：一条记录 = 一个人的死亡；记录名仍是「死亡先后-区块-名册编号」，与正篇同一套推理方式。

export const WSV = 1;
export const PLACES = {
  A1: '海蚀断崖', B1: '盐滩', C1: '旧码头', D1: '观星台', E1: '钥冢',
  A2: '竹林', B2: '溶洞', C2: '温室', D2: '湿地', E2: '旧锅炉房',
  A3: '废弃宿舍', B3: '图书馆', C3: '弥萨格钟楼', D3: '礼堂', E3: '医务楼',
  A4: '果园', B4: '校猫的窝', C4: '操场', D4: '体育馆', E4: '仓库',
  A5: '港湾', B5: '旧渔村', C5: '航标塔', D5: '砂石场', E5: '雷达站',
};
export const CAUSES = {
  blast: '爆炸致死', slash: '斩击致死', pierce: '刺击致死', blunt: '钝击致死', shoot: '射击致死',
  poison: '中毒致死', strangle: '勒杀致死', fall: '坠落致死', accident: '意外死亡',
};
// 死因归类只用来写第二级提示，不参与判定
const CAT = {
  blast: '环境所致', slash: '利器所致', pierce: '利器所致', blunt: '钝器所致', shoot: '射击所致',
  poison: '毒物所致', strangle: '扼压所致', fall: '坠落所致', accident: '自身过失',
};

export const MIN_PEOPLE = 3, MAX_PEOPLE = 12;
export const MIN_TEXT = 20, MAX_TEXT = 1200, MAX_TOTAL = 7000;
export const MAX_START = 4;         // 开场直接给几条；剩下的必须靠别人正文里提到
export const CELLS = Object.keys(PLACES);

const pad2 = (n) => String(Math.max(0, Math.min(99, Math.trunc(+n) || 0))).padStart(2, '0');
const chars = (s) => [...String(s ?? '')].length;

export const newId = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export function blank() {
  return {
    v: WSV, id: newId(), t: '', a: '', b: '', o: '', e: '', at: Date.now(),
    p: [{ n: 1, m: '', i: '' }, { n: 2, m: '', i: '' }, { n: 3, m: '', i: '' }],
    r: [1, 2, 3].map((n) => ({ num: n, day: 1, hour: 7 + n, min: 0, cell: 'C3', cause: 'accident', weapon: 0, culprit: 0, text: '' })),
  };
}

// 存档/云端读回来的东西一律先过一遍：字段白名单 + 长度截断，别让一条畸形数据把界面炸掉
export function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const cs = {
    v: WSV,
    id: String(raw.id || '').slice(0, 24) || newId(),
    t: String(raw.t || '').slice(0, 40),
    a: String(raw.a || '').slice(0, 20),
    b: String(raw.b || '').slice(0, 80),
    o: String(raw.o || '').slice(0, 2000),
    e: String(raw.e || '').slice(0, 600),
    at: Number(raw.at) || 0,
    p: [], r: [],
  };
  for (const p of Array.isArray(raw.p) ? raw.p.slice(0, MAX_PEOPLE) : []) {
    cs.p.push({ n: cs.p.length + 1, m: String(p?.m || '').slice(0, 12), i: String(p?.i || '').slice(0, 16) });
  }
  for (const r of Array.isArray(raw.r) ? raw.r.slice(0, MAX_PEOPLE) : []) {
    const num = Math.trunc(+r?.num) || 0;
    if (num < 1 || num > cs.p.length) continue;                     // 指向不存在的人：丢掉
    if (cs.r.some((x) => x.num === num)) continue;                  // 一个人只能死一次
    cs.r.push({
      num,
      day: Math.max(1, Math.min(9, Math.trunc(+r?.day) || 1)),
      hour: Math.max(0, Math.min(23, Math.trunc(+r?.hour) || 0)),
      min: Math.max(0, Math.min(59, Math.trunc(+r?.min) || 0)),
      cell: PLACES[r?.cell] ? r.cell : 'C3',
      cause: CAUSES[r?.cause] ? r.cause : 'accident',
      weapon: Math.max(0, Math.min(MAX_PEOPLE, Math.trunc(+r?.weapon) || 0)),
      culprit: Math.max(0, Math.min(MAX_PEOPLE, Math.trunc(+r?.culprit) || 0)),
      text: String(r?.text || '').slice(0, MAX_TEXT),
    });
  }
  return cs;
}

export const people = (cs) => cs.p.filter((p) => p.m.trim());
export const personOf = (cs, n) => cs.p.find((p) => p.n === +n) || null;
export const nameOf = (cs, n) => (personOf(cs, n)?.m || '').trim() || `（第${n}号）`;
export const itemOf = (cs, n) => (personOf(cs, n)?.i || '').trim();

export function sortRecs(cs) {
  return [...cs.r].sort((a, b) => a.day * 1440 + a.hour * 60 + a.min - (b.day * 1440 + b.hour * 60 + b.min) || a.num - b.num);
}

// 一条记录的完整编译结果：记录名、时刻、显示用的 when
export function compile(cs) {
  return sortRecs(cs).map((r, i) => ({
    ...r, dord: i + 1,
    key: `${pad2(i + 1)}-${r.cell}-${pad2(r.num)}`,
    when: `第${r.day}天 ${pad2(r.hour)}:${pad2(r.min)}`,
    min: r.day * 1440 + r.hour * 60 + r.min,
    name: nameOf(cs, r.num),
  }));
}

// 正文里出现谁的名字，就指向谁的记录——这就是这一卷的全部线索
export function refsOf(cs, row) {
  const out = [];
  for (const p of cs.p) {
    if (p.n === row.num) continue;
    const m = (p.m || '').trim();
    if (m && row.text.includes(m)) out.push(p.n);
  }
  return out;
}

export function startKeys(cs, rows) {
  const pointed = new Set();
  for (const r of rows) for (const n of refsOf(cs, r)) pointed.add(n);
  const roots = rows.filter((r) => !pointed.has(r.num)).map((r) => r.key);
  return (roots.length ? roots : rows.map((r) => r.key)).slice(0, MAX_START);
}

export function reachableSet(cs, rows) {
  const keyOf = new Map(rows.map((r) => [r.num, r.key]));
  const seen = new Set(startKeys(cs, rows));
  const q = [...seen];
  while (q.length) {
    const k = q.pop();
    const row = rows.find((r) => r.key === k); if (!row) continue;
    for (const n of refsOf(cs, row)) { const kk = keyOf.get(n); if (kk && !seen.has(kk)) { seen.add(kk); q.push(kk); } }
  }
  return seen;
}

// 体检：错（不修就发布不了）与警告（能发，但玩家可能卡住）
export function validate(cs) {
  const errors = [], warns = [];
  const E = (msg) => errors.push(msg), W = (msg) => warns.push(msg);
  if (chars(cs.t) < 2) E('卷宗标题至少 2 个字。');
  if (chars(cs.t) > 40) E('卷宗标题最多 40 个字。');
  if (chars(cs.b) > 80) E('简介最多 80 个字。');

  const ps = cs.p;
  const names = [];
  for (const p of ps) {
    const m = (p.m || '').trim();
    if (!m) E(`名册第 ${p.n} 号还没有名字。`);
    else if (chars(m) < 2) E(`名册第 ${p.n} 号的名字至少 2 个字（单字会和其他字混在一起，正文里认不出来）。`);
    else if (chars(m) > 12) E(`名册第 ${p.n} 号的名字最多 12 个字。`);
    else names.push({ n: p.n, m });
  }
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
    const a = names[i].m, b = names[j].m;
    if (a === b) E(`名册里有两个人都叫「${a}」，正文里分不清是谁。`);
    else if (a.includes(b) || b.includes(a)) E(`「${a}」和「${b}」互相包含，正文里会认错人，换一个名字。`);
  }
  if (ps.length < MIN_PEOPLE) E(`至少要 ${MIN_PEOPLE} 个人。`);
  if (ps.length > MAX_PEOPLE) E(`最多 ${MAX_PEOPLE} 个人。`);

  if (!cs.r.length) E('一条记录都没有。');
  if (cs.r.length > ps.length) E('记录比人还多。');

  const rows = compile(cs);
  let totalChars = 0;
  for (const r of rows) {
    const who = nameOf(cs, r.num);
    if (!(r.text || '').trim()) E(`「${who}」的正文还是空的。`);
    else if (chars(r.text) < MIN_TEXT) E(`「${who}」的正文太短（至少 ${MIN_TEXT} 字）。`);
    else if (chars(r.text) > MAX_TEXT) E(`「${who}」的正文太长（最多 ${MAX_TEXT} 字）。`);
    totalChars += chars(r.text);
    if (!PLACES[r.cell]) E(`「${who}」的死亡地点无效。`);
    if (!CAUSES[r.cause]) E(`「${who}」的死因无效。`);
    if (r.culprit === r.num) E(`「${who}」的加害人不能是他自己；自杀请把加害人填「其他」。`);
    if (r.weapon && !itemOf(cs, r.weapon) && r.culprit !== 0) W(`「${who}」的凶器指向第 ${r.weapon} 号，但那件装备还没有名字。`);
    if (r.culprit === 0 && r.weapon && r.weapon !== r.num && itemOf(cs, r.weapon))
      W(`「${who}」的加害人是「其他」，凶器却挂在别人名下——玩家会分不清这是意外还是他杀。`);
  }
  if (totalChars > MAX_TOTAL) E(`全文共 ${totalChars} 字，超过 ${MAX_TOTAL} 字上限（云端单条存不下）。`);

  // 次序不能撞：两个人的死亡时刻一样，记录名的第一段就没有唯一解
  const seenWhen = new Map();
  for (const r of rows) {
    if (seenWhen.has(r.min)) W(`「${nameOf(cs, r.num)}」和「${nameOf(cs, seenWhen.get(r.min))}」死在同一个时刻，先后分不出来。`);
    else seenWhen.set(r.min, r.num);
  }

  // 线索链：谁提到了谁、谁根本读不到
  const keyOf = new Map(rows.map((r) => [r.num, r.key]));
  for (const r of rows) {
    const refs = refsOf(cs, r);
    for (const n of refs) {
      const t = rows.find((x) => x.num === n);
      if (!t) continue;                       // 提到的是活着的人：不构成线索，不用管
      const place = PLACES[t.cell], ord = /第[0-9一二三四五六七八九十]+个|最后[一]?个|最先/.test(r.text);
      if (!r.text.includes(place) && !r.text.includes(t.cell)) W(`「${r.name}」提到了「${t.name}」，但没写他死在哪一区——玩家拼不出记录名的第二段。`);
      if (!ord) W(`「${r.name}」提到了「${t.name}」，但没写他是第几个死的——玩家拼不出记录名的第一段。`);
    }
    if (!refs.length) W(`「${r.name}」的正文谁也没提到，这条记录推不出别的记录。`);
  }
  const live = reachableSet(cs, rows);
  for (const r of rows) if (!live.has(r.key)) E(`「${r.name}」(${r.key}) 永远读不到：没有任何记录在正文里提到他。请在别人的正文里写到他，或者把他挪进开场。`);

  return { errors, warns, rows, start: startKeys(cs, rows), live };
}

// ---------------------------------------------------------------- 编译成 G
function esc4sys(s) { return String(s || '').replace(/\r\n/g, '\n').trim(); }

export function toGame(raw) {
  const cs = sanitize(raw);
  if (!cs) throw new Error('bad case');
  const { rows, start } = validate(cs);
  const keyOf = new Map(rows.map((r) => [r.num, r.key]));
  const itemOwner = new Map();   // 装备名 → 名册编号，用来从正文里认出凶器
  for (const p of cs.p) { const it = (p.i || '').trim(); if (it) itemOwner.set(it, p.n); }

  const records = {}, solutions = {}, hints = { restore: {}, confirm: {} };
  for (const r of rows) {
    const names = new Set(), items = new Set();
    for (const p of cs.p) {
      if (p.n === r.num) continue;
      const m = (p.m || '').trim();
      if (m && r.text.includes(m)) names.add(p.n);
    }
    for (const [it, n] of itemOwner) if (it && r.text.includes(it)) items.add(n);
    const refs = refsOf(cs, r).map((n) => keyOf.get(n)).filter(Boolean);
    records[r.key] = {
      key: r.key, dord: r.dord, cell: r.cell, num: r.num, name: r.name,
      when: r.when, min: r.min, text: r.text.replace(/\r\n/g, '\n'),
      refs, sys: [], facts: { names: [...names], items: [...items], locs: [], bcs: [], wits: [] },
    };
    const wp = r.weapon && itemOf(cs, r.weapon) ? r.weapon : 0;
    solutions[r.key] = {
      cause: r.cause, causeZh: CAUSES[r.cause],
      weapon: wp ? itemOf(cs, wp) : '无', weaponNum: wp, culprit: r.culprit,
      culpritZh: r.culprit ? nameOf(cs, r.culprit) : '其他',
    };
    const who = r.name;
    hints.restore[r.key] = [
      `下一个该复原的人死在${PLACES[r.cell]}（${r.cell}区）。先翻翻提到那个地方的记录。`,
      `记录名 = 死亡先后 + 区块 + 名册编号。他死在 ${r.when}，在名册上是第 ${r.num} 号。`,
      `记录名是 ${r.key}。`,
    ];
    const weaponTxt = wp ? `「${itemOf(cs, wp)}」` : '没有凶器';
    const culpritTxt = r.culprit ? nameOf(cs, r.culprit) : '其他（0）';
    hints.confirm[r.key] = [
      `${who}死在${PLACES[r.cell]}。先看尸身上的痕迹：是别人下的手，还是他自己的过失？`,
      `死因属于「${CAT[r.cause] || '意外'}」；凶器${wp ? '是配发给某个人的东西——想想谁的东西会出现在那里' : '一栏填「无」'}。`,
      `死因：${CAUSES[r.cause]}。凶器：${weaponTxt}。加害人：${culpritTxt}。`,
    ];
  }

  const peopleList = cs.p.map((p) => ({
    n: p.n, slug: `w-${p.n}`, name: p.m.trim(), realm: 'HUMAN', role: 'INV',
    item: p.i.trim() || '（无配发）', itemClass: p.i.trim() ? 'item' : 'none',
    itemImg: '', avatar: '', melted: false, human: true,
    key: keyOf.get(p.n) || '', lore: { 简介: p.i.trim() ? `配发：${p.i.trim()}` : '没有配发装备。' },
  }));

  const docs = {
    '00-ORDER': {
      id: '00-ORDER', title: '任务指示书', source: '工坊卷宗',
      text: `[sys]
[b]■ 工坊卷宗[/b]
《${cs.t}》　作者：${cs.a || '无名守密人'}
${cs.b ? cs.b : ''}
[b]■ 命令[/b]
复原这份卷宗里的 ${rows.length} 条死亡记录，查明每一起死亡的经过，并提交死亡调查报告。
[b]■ 步骤[/b]
一、在输入栏键入[b]“记录名”[/b]并点击“复原”。记录名 = 死亡先后 + 区块 + 名册编号，例如 03-B2-07。
二、依据复原的记录核实[b]“死因、凶器、加害人”[/b]。填写规定见 [link]00-REPORT[/link]。
${cs.o ? '三、作者另有几句话，见 [link]00-OPEN[/link]。' : ''}
[b]■ 注意[/b]
这是玩家自撰的卷宗，不是钥冢档案室的正式备份。名册与地图沿用同一套设定，故事与答案由作者自己写过。
[/sys]`,
    },
    '00-REPORT': {
      id: '00-REPORT', title: '死亡报告填写规定', source: '工坊卷宗',
      text: `[sys]
[b]■ 三项怎么填[/b]
[b]一、死因[/b]　看这套记录自己的说法：利器、钝器、射击、毒物、扼压、坠落、爆炸、意外，八类之外还有一类“中毒致死”用于投毒。
[b]二、凶器[/b]　填“配发在某个人名下”的那件装备；如果死的时候没有凶器（坠落、自饮毒药、被自己弄塌的东西砸到），填“无”。
　　装备出现在现场，不等于它就是凶器。要问的是：这件东西当时在哪里、在谁手里。
[b]三、加害人[/b]　填动手的人。没人动手就填“其他（无加害人）”：自杀、失足、塌方都算这一类。
　　死者本人不进加害人栏——他不会是自己这份报告里的加害人。

[b]■ 记录名怎么拼[/b]
第一段是死亡的先后（第几个死），第二段是死亡地点的区块，第三段是死者在名册上的编号。
别人转述他的死时，正文里往往会写到[b]地点[/b]和[b]他是第几个[/b]；两段拼起来就是记录名。

[b]■ 提交之后[/b]
三项全对才会显示“确认”；有一项不对，只会告诉你“存在错误的报告”，不告诉你是哪一项。
[/sys]`,
    },
  };
  if (cs.o) docs['00-OPEN'] = { id: '00-OPEN', title: '作者的话', source: '工坊', text: cs.o.replace(/\r\n/g, '\n') };

  const milestones = Array.from({ length: Math.max(1, Math.ceil(rows.length / 3)) }, (_, i) =>
    `共鸣 ${i + 1}/${Math.max(1, Math.ceil(rows.length / 3))}　${['记录开始彼此靠近。', '名册上的名字，一个一个亮起来。', '有人在记录的另一头，听见了你的脚步。', '这一卷快读到尽头了。'][i % 4]}`);

  const endingLines = (cs.e || '').trim()
    ? cs.e.split('\n').map((s) => s.trim()).filter(Boolean)
    : ['最后一份报告确认完毕。', '', `《${cs.t}》的记录，全部复原。`, '名册上的名字，一个一个熄掉了。', '', '这一卷是别人写的。写到这里，他把笔放下了。'];

  return {
    workshop: true,
    edition: {
      n: 0, label: '工坊卷宗', title: cs.t, subtitle: cs.b || '玩家自撰', theme: 'w',
      grid: { cols: 'ABCDE', rows: [1, 2, 3, 4, 5], size: 25 },
      help: `《${cs.t}》`,
      boot: ['> 工坊卷宗　载入中……', `> 《${cs.t}》　作者：${cs.a || '无名守密人'}`, `> 记录 ${rows.length} 条　·　名册 ${cs.p.length} 人`, '> 这是一份玩家自撰的档案。', '> 请守密人开始复原。'],
    },
    title: cs.t, subtitle: cs.b,
    roster: peopleList,
    places: { ...PLACES },
    zones: [], noZone: true,
    causes: { ...CAUSES },
    records, docs,
    msgs: [], start,
    solutions, hints,
    puzzles: [], arcs: [], milestones,
    shadow: null,
    endings: [{ id: 'W1', title: '结案', need: [], lines: endingLines }],
    stats: { records: rows.length, edges: Object.values(records).reduce((a, r) => a + r.refs.length, 0) },
  };
}

// ---------------------------------------------------------------- 云端编解码
// 直接放 JSON：Waline 的 orig 字段保留原文，比 base64 好调试、也省体积
export const TAG_WORK = '@@DRW1', TAG_RATE = '@@DRR1', TAG_DEL = '@@DRD1';

export function encode(cs) {
  const { v, id, t, a, b, o, e, p, r } = cs;
  // u 只是上传时刻：Waline 会把「同一作者 + 同样内容」判成重复，加一个易变字段就能重复上传
  return TAG_WORK + JSON.stringify({ v, id, t, a, b, o, e, p, r, u: Date.now() });
}
export function decodeWork(str) {
  const s = String(str || '').trim();
  if (!s.startsWith(TAG_WORK)) return null;
  try { return sanitize(JSON.parse(s.slice(TAG_WORK.length))); } catch { return null; }
}
export function decodeRate(str) {
  const s = String(str || '').trim();
  if (!s.startsWith(TAG_RATE)) return null;
  try {
    const j = JSON.parse(s.slice(TAG_RATE.length));
    return { t: String(j.t || '').slice(0, 24), s: Math.max(0, Math.min(5, Math.trunc(+j.s) || 0)), r: String(j.r || '').slice(0, 3), sc: Math.trunc(+j.sc) || 0, rt: Math.max(0, Math.min(100, Math.trunc(+j.rt) || 0)), h: Math.trunc(+j.h) || 0, b: String(j.b || '').slice(0, 20), d: String(j.d || '').slice(0, 16), n: String(j.n || '').slice(0, 140), at: Number(j.at) || 0 };
  } catch { return null; }
}
export const decodeDel = (str) => {
  const s = String(str || '').trim();
  if (!s.startsWith(TAG_DEL)) return '';
  try { return String(JSON.parse(s.slice(TAG_DEL.length))?.t || '').slice(0, 24); } catch { return ''; }
};

// ---------------------------------------------------------------- 示例卷宗
// 一份写好的小案子：6 个人、5 条记录、一条完整的线索链，留一个活人当凶手。
// ---------------------------------------------------------------- 示例
export function sample() {
  const c = {
    v: 1, id: newId(), at: Date.now(),
    t: '雨夜的排练', a: '示例作者', b: '一场没排完的戏，五个人没能走出校园',
    o: '这是我第一次写卷宗。名册上留了一个活人——他没死，不等于他清白。\n\n如果读到这里，请留意：每段文字里都写了下一个人的下落。',
    e: '报告收齐了。\n\n雨还在下。台上那盏灯，最后也没有熄。',
    p: [
      { n: 1, m: '柯望', i: '铜制怀表' },
      { n: 2, m: '林雾', i: '裁纸刀' },
      { n: 3, m: '邵岚', i: '麻绳' },
      { n: 4, m: '白鸦', i: '黑伞' },
      { n: 5, m: '江屿', i: '药瓶' },
      { n: 6, m: '闻笙', i: '录音笔' },
    ],
    r: [
      { num: 5, day: 1, hour: 8, min: 0, cell: 'C4', cause: 'poison', weapon: 5, culprit: 4, text: '操场积了水，我在跑道边坐下，把药倒在手心里。\n那瓶药是白鸦给我的，他说头疼就吃一粒。我吃了两粒。\n过了一会儿，我看见林雾从图书馆那边过来，撑着一把不属于他的伞。\n我喊他，他没听见。他走得很急，说是要去图书馆还书。\n他是第二个死的——后来我才知道，就死在图书馆的书架中间。\n舌头开始发麻。我想站起来，膝盖却不听话。\n最后看到的是自己手心里剩下的那一粒，白得发亮。' },
      { num: 2, day: 1, hour: 9, min: 30, cell: 'B3', cause: 'slash', weapon: 2, culprit: 3, text: '图书馆的灯只开了靠窗的一排。我在找一本借了很久没还的书。\n邵岚进来了，手里捏着一把裁纸刀，是我自己的那把，早上落在礼堂了。\n他说，你别动。我说，那本书我还没看完。\n他笑了，说没有人在乎那本书。\n后来我才明白，他在乎的是我还活着这件事。\n他走的时候提了一句竹林——第四个人就死在那儿，绳子是他自己带去的。\n第三个人死在礼堂——柯望，他说过要在那儿等白鸦。\n刀很薄，进得很轻，像有人在纸上划了一道。\n我倒下去的时候，书架上有一排书跟着塌了下来。' },
      { num: 1, day: 1, hour: 11, min: 0, cell: 'D3', cause: 'blunt', weapon: 1, culprit: 4, text: '礼堂里没有开灯，舞台上的幕布被风掀着。\n白鸦让我在这儿等他，说有话要说。\n等的工夫，我一直在看那块怀表。表是父亲给的，停了很久，我一直没修。\n他来了，手里什么也没拿。他说，你跟我来一下。\n我没有动。他就自己走了过来，从后面抱住我，然后抬起了我的手腕。\n怀表砸在地上的声音，比我想的要闷。\n第四个人死在竹林——邵岚，那天下午他一个人去了竹林。\n白鸦蹲下来，把怀表捡起来，放回我口袋里。他说，这样就像是你自己摔的。' },
      { num: 3, day: 1, hour: 13, min: 0, cell: 'A2', cause: 'strangle', weapon: 3, culprit: 0, text: '竹林的叶子被雨压得很低，走进去要一直低着头。\n麻绳是我自己带来的。本来是用来捆道具箱的。\n我不想再等谁来找我了。白鸦做的事，我知道得太多了。\n我把绳子抛过最粗的那一根，试了试，能承住我。\n跳下来的那一刻我在想，还好不用再看见他。\n第五个人死在仓库——闻笙，她会去那里找她的录音笔。\n如果有谁读到这里：不要去找白鸦要说法，他不会给的。' },
      { num: 6, day: 1, hour: 15, min: 0, cell: 'E4', cause: 'accident', weapon: 0, culprit: 0, text: '仓库的窗子关不严，雨水顺着墙缝往下流。\n我的录音笔掉在货架后面，我搬了一张凳子去够。\n凳子腿断了一条，我摔下来，后脑勺碰在货架角上。\n第一个死的是江屿——那天早上他在操场，我在楼上看见他一个人坐着。\n然后我才想起来，我已经爬不起来了。\n地上的水被我的衣服吸干了，冷得很慢。\n如果有人来收这些东西，请把录音笔拿走。里面的东西，比我的命值钱。' },
    ],
  };
  return sanitize(c);
}
