// 各小游戏的本机进度汇总。
//
// 个人中心要「一个页面看到所有游戏的数据」，但九个游戏各写各的存档键，
// 有的用 store（JSON），有的用 localStorage 裸字符串，有的根本不在 zjtt 命名空间
// （挂机版是 morimens-idle-*，死亡调查报告是 morimens-deathreport-*）。
// 这里只做一件事：把全部键读成一个结构化的结果，读不到的字段给 0 / 空，
// 让页面永远有东西可显示，而不是「这一块没接」。
//
// 三条约束：
//   · 只读，不写、不发请求 —— 任何页面都能安全 import；
//   · 全部 try/catch —— 无痕模式下 localStorage 会抛，不能连累整页；
//   · 键名必须和各游戏里的字面量一致，改名请一起改（下面每组都标了出处）。

const RD = (k) => { try { const v = localStorage.getItem('zjtt:' + k); return v == null ? null : JSON.parse(v); } catch { return null; } };
const RAW = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const arr = (v) => (Array.isArray(v) ? v : []);

// 数字键既可能是 JSON（store.set）也可能是裸字符串（游戏里直接 setItem），
// JSON.parse 对 "123" 和 123 都成立，所以统一走 RD。
const numKey = (k) => n(RD(k));

export const DIFF_MERGE = [
  { k: 'easy', n: '简单' }, { k: 'normal', n: '普通' }, { k: 'hard', n: '困难' }, { k: 'frenzy', n: '癫狂' },
];
export const DIFF_BIRD = [
  { k: 'easy', n: '简单' }, { k: 'normal', n: '普通' }, { k: 'hard', n: '困难' }, { k: 'mad', n: '癫狂' },
];

// ------------------------------------------------------------------ 各游戏
function detective() {
  const st = RD('stats') || {};
  const hist = arr(RD('hist'));
  const played = n(st.played);
  const won = n(st.won);
  const failed = arr(RD('failed')).length;
  return {
    played, won,
    items: [
      { k: '已玩', v: String(played) },
      { k: '胜率', v: played ? Math.round((won / played) * 100) + '%' : '—' },
      { k: '最高分', v: String(n(st.best)) },
    ],
    extra: failed ? `失败题库 ${failed} 题` : (hist.length ? `最近一次 ${String(new Date(n(hist[0] && hist[0].at) || Date.now()).toLocaleDateString('zh-CN'))}` : ''),
  };
}

function merge() {
  const all = numKey('merge:best');
  const byDiff = DIFF_MERGE.map((d) => ({ ...d, v: numKey('merge:best:' + d.k) }));
  const skins = arr(RD('merge:skins')).filter((x) => n(x) > 0).length;
  const bestDiff = byDiff.filter((d) => d.v > 0).sort((a, c) => c.v - a.v)[0];
  return {
    items: [
      { k: '最高分', v: all ? String(all) : '—' },
      { k: '最顺手', v: bestDiff ? bestDiff.n : '—' },
      { k: '换皮', v: skins ? `${skins}/9` : '原样' },
    ],
    extra: byDiff.filter((d) => d.v > 0).map((d) => `${d.n} ${d.v}`).join(' · '),
  };
}

function bird() {
  const lvAll = numKey('bird:bestLv');
  const scAll = numKey('bird:best');
  const byDiff = DIFF_BIRD.map((d) => ({ ...d, lv: numKey('bird:bestLv:' + d.k), sc: numKey('bird:best:' + d.k) }));
  return {
    items: [
      { k: '最深层数', v: lvAll ? `${lvAll} 层` : '—' },
      { k: '最高分', v: scAll ? String(scAll) : '—' },
      { k: '下过难度', v: String(byDiff.filter((d) => d.lv > 0).length) + '/4' },
    ],
    extra: byDiff.filter((d) => d.lv > 0).map((d) => `${d.n} ${d.lv} 层`).join(' · '),
  };
}

function binding() {
  const m = RD('binding') || null;
  const st = (m && m.stats) || {};
  return {
    items: [
      { k: '最深纪录', v: st.bestFloor ? `第 ${st.bestFloor} 层` : '—' },
      { k: '通关次数', v: String(n(st.clears)) },
      { k: '首领击杀', v: String(n(st.bossKills)) },
    ],
    extra: st.runs ? `共 ${n(st.runs)} 局 · 死亡 ${n(st.deaths)} 次` : '',
  };
}

function idle() {
  // 挂机版是独立子项目，键不带 zjtt: 前缀（idle/src/ui/util.js 的 KEY）
  let s = null;
  try { s = JSON.parse(RAW('morimens-idle-save-v1') || 'null'); } catch { s = null; }
  if (!s) return { items: [{ k: '存档', v: '未开始' }], extra: '' };
  const team = arr(s.roster).length;
  return {
    items: [
      { k: '当前关卡', v: String(n(s.stage) || 1) },
      { k: '最高关卡', v: String(n(s.maxStage)) },
      { k: '唤醒体', v: String(team) },
    ],
    extra: s.gold != null ? `金币 ${n(s.gold)} · 券 ${n(s.tickets)} · 核心 ${n(s.cores)}` : '',
    // 同一句带图标版：券 = 流明之芯、核心 = 银芯（都用原作图标，跟挂机版顶栏一致）
    extraHtml: s.gold != null
      ? `金币 ${n(s.gold)} · <img class="ico-inl" src="assets/ui/lumen.webp" alt="召唤券">${n(s.tickets)}`
        + ` · <img class="ico-inl" src="assets/ui/silvercore.webp" alt="银芯">${n(s.cores)}`
      : '',
  };
}

function survivors() {
  const p = RD('survivors:progress') || {};
  const best = numKey('survivors:best');
  return {
    items: [
      { k: '最高分', v: best ? String(best) : '—' },
      { k: '通关角色', v: String(arr(p.clears).length) },
      { k: '累计局数', v: String(n(p.runs)) },
    ],
    extra: arr(p.diffs).length ? `通关难度：${arr(p.diffs).join(' / ')}` : (n(p.bosses) ? `击败强敌 ${n(p.bosses)} 只` : ''),
  };
}

function protocol() {
  // 2026-10 之后才记的键（js/pf/ui.js 的 showEnd）；老玩家这里会是空，显示「—」就行
  const b = RD('pf:best') || null;
  return {
    items: [
      { k: '最远波次', v: b && b.wave ? `第 ${n(b.wave)} 波` : '—' },
      { k: '最高分', v: b && b.score ? String(n(b.score)) : '—' },
      { k: '守住次数', v: String(n(b && b.wins)) },
    ],
    extra: b && b.runs ? `共 ${n(b.runs)} 局` : '',
  };
}

function wolf() {
  const st = RD('wolf:stat') || null;
  const runs = n(st && st.n);
  const win = n(st && st.win);
  return {
    items: [
      { k: '局数', v: String(runs) },
      { k: '胜场', v: String(win) },
      { k: '胜率', v: runs ? Math.round((win / runs) * 100) + '%' : '—' },
    ],
    extra: '',
  };
}

function deathreport() {
  // 本篇 + 往届两届，各自一个存档键（deathreport/js/ui.js 的 EDS）
  const EDS = [
    ['本篇', 'morimens-deathreport-save-v1'],
    ['62届', 'morimens-deathreport-save-ed62-v1'],
    ['61届', 'morimens-deathreport-save-ed61-v1'],
  ];
  let recovered = 0;
  let docs = 0;
  let done = 0;
  const parts = [];
  for (const [tag, key] of EDS) {
    let s = null;
    try { s = JSON.parse(RAW(key) || 'null'); } catch { s = null; }
    if (!s) continue;
    const r = arr(s.recovered).length;
    const d = arr(s.docs).length;
    recovered += r;
    docs += d;
    if (s.ended) done += 1;
    parts.push(`${tag} ${r} 条`);
  }
  return {
    items: [
      { k: '已复原', v: String(recovered) },
      { k: '结案', v: String(done) },
      { k: '归档卷宗', v: String(docs) },
    ],
    extra: parts.join(' · '),
  };
}

// 卡片顺序 = 首页的排列顺序，用户不用重新认路
export const GAMES = [
  { k: 'detective', n: '战报侦探', href: 'detective.html', icon: '🔍', read: detective, tip: '六边形自走棋推演' },
  { k: 'merge', n: '合成大杜勒', href: 'merge.html', icon: '⚫', read: merge, tip: '两个同级合成下一级' },
  { k: 'bird', n: '是鸟弟就下100层', href: 'bird.html', icon: '🐤', read: bird, tip: '往下跳，别被扎到' },
  { k: 'binding', n: '校猫的结合', href: 'binding.html', icon: '🐱', read: binding, tip: '地牢射击' },
  { k: 'idle', n: '弥萨格挂机版', href: 'idle/', icon: '🏰', read: idle, tip: '五人队爬塔' },
  { k: 'survivors', n: '唤醒体幸存者', href: 'survivors.html', icon: '✨', read: survivors, tip: '15 分钟一局' },
  { k: 'protocol', n: '忘却协议', href: 'protocol.html', icon: '⬡', read: protocol, tip: '守住十二波' },
  { k: 'wolf', n: '弥萨格狼人杀', href: 'wolf.html', icon: '🐺', read: wolf, tip: '身份推理' },
  { k: 'deathreport', n: '死亡调查报告', href: 'deathreport/', icon: '📄', read: deathreport, tip: '档案式复盘' },
];

// 一次性读全部：页面只调这一个
export function readAll() {
  const out = {};
  for (const g of GAMES) {
    try { out[g.k] = g.read(); } catch { out[g.k] = { items: [], extra: '' }; }
  }
  return out;
}

// 银芯钱包（所有小游戏共用 zjtt:credits）
export const credits = () => numKey('credits');
