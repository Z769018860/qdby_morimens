// 对战页的存档：收藏、战绩、段位分、开包次数。
// 只写 localStorage，不碰云端档案（云端字段是给「九个游戏」的分数用的，
// 这里的东西换设备靠加密存档整包搬，和挂机版同一套思路）。
import { gainFor } from './rank.js';
import { tierOf, progress as rankProgress } from './tiers.js';

const KEY = 'zjtt:duel:v1';

// 卡包的钱有三个来源：每天一次白给的、打人机赢来的券、银芯。
const FREE_PER_DAY = 1;
const TICKET_PER_DAY = 3;
// 卡包钱包：直接用全站共用的银芯（zjtt:credits），开一包 20 枚
const PACK_PRICE = 20;

// 打人机的银芯：[赢, 输]，按难度走。输只在打满 4 回合后给一点辛苦费，开局投降不给。
export const PVE_SILVER = { easy: [8, 2], normal: [14, 3], hard: [22, 4] };
export const PVE_LOSS_MIN_ROUNDS = 4;

const DEFAULT = {
  silver: 0, coll: {}, opened: 0, wins: 0, losses: 0, deck: 'd1', diff: 'normal',
  sfx: 1,           // 音效开关：0 = 关（对决页顶栏可以切）
  mine: [],          // 自己组的卡组：[{id,n,r,cards,extra}]，见 view.js 的自组编辑器
  tickets: 0,        // 开包券：打赢人机才有
  freeDay: '',       // 最近一次领免费包的日子（YYYY-MM-DD，本地时区）
  freeUsed: 0,       // 那天已经用掉几次免费
  pveDay: '',        // 券的日上限按天重置
  pveToday: 0,       // 今天已经发出几张券
  rp: 0,             // 段位分（人机对战，只增不减，见 duel/rank.js）
  streak: 0,         // 当前连胜：连赢才有加成，输一局清零
  bestStreak: 0,     // 历史最长连胜
};

function today() {
  const d = new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return Object.assign({}, DEFAULT);
    const o = JSON.parse(raw);
    return Object.assign({}, DEFAULT, o, { coll: (o && o.coll) || {}, mine: (o && o.mine) || [] });
  } catch (e) {
    return Object.assign({}, DEFAULT);
  }
}

export function saveSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 隐私模式里写不进去，不影响玩 */ }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 同上 */ }
}

// 今天还剩几次免费包 / 今天还能拿到几张券
export function freeLeft(s) {
  const t = today();
  if (s.freeDay !== t) return FREE_PER_DAY;
  return Math.max(0, FREE_PER_DAY - (s.freeUsed || 0));
}

export function ticketDayLeft(s) {
  const t = today();
  if (s.pveDay !== t) return TICKET_PER_DAY;
  return Math.max(0, TICKET_PER_DAY - (s.pveToday || 0));
}

// 开包先扣什么：先免费、再券、最后银芯（返回 kind 由调用方决定提示文案）
export function payPack(s) {
  const t = today();
  if (freeLeft(s) > 0) {
    if (s.freeDay !== t) { s.freeDay = t; s.freeUsed = 0; }
    s.freeUsed = (s.freeUsed || 0) + 1;
    return { ok: true, kind: 'free', price: 0 };
  }
  if ((s.tickets || 0) > 0) {
    s.tickets -= 1;
    return { ok: true, kind: 'ticket', price: 0 };
  }
  return { ok: true, kind: 'silver', price: PACK_PRICE };
}

// 打赢人机发一张券，每天最多 TICKET_PER_DAY 张
export function grantPveTicket(s) {
  const t = today();
  if (s.pveDay !== t) { s.pveDay = t; s.pveToday = 0; }
  if (s.pveToday >= TICKET_PER_DAY) return { granted: false, left: 0 };
  s.pveToday += 1;
  s.tickets = (s.tickets || 0) + 1;
  return { granted: true, left: TICKET_PER_DAY - s.pveToday };
}

export const RULES = { FREE_PER_DAY, TICKET_PER_DAY, PACK_PRICE };

// 结算段位分：只增不减（见 duel/rank.js 开头的说明）。返回这一局的变化，交给弹窗显示。
export function addRank(s, win, diff) {
  const before = Math.max(0, Math.round(Number(s.rp) || 0));
  const tierBefore = tierOf(before);
  s.streak = win ? Math.max(0, Number(s.streak) || 0) + 1 : 0;
  if (win) s.bestStreak = Math.max(Number(s.bestStreak) || 0, s.streak);
  const gain = gainFor({ win, diff, tier: tierBefore, streak: s.streak });
  s.rp = before + gain;
  const after = s.rp;
  const tierAfter = tierOf(after);
  return {
    gain, before, after, streak: s.streak, bestStreak: s.bestStreak,
    tierBefore, tierAfter, up: tierAfter > tierBefore,
    progress: rankProgress(after),
  };
}
