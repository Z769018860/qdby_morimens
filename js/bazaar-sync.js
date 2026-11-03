// 「大巴扎：银钥」和榜单 / 云端档案之间的连接件。
//
// 和 bird-sync.js 一个道理：游戏页要的是「一个脚本请求点开就能玩」，
// 而账号那条链（common + i18n + auth + api + account）有几十 KB，塞进首屏不值当。
// 所以这里是一个额外的动态 import 目标（构建后落在 js/b/bazaar-sync.js）：
//   · openBoard() → fetchBoard()，只读一次 GET /board，取 bz 那一栏
//   · 一局散场 → pushScore()，把本机成绩交给 account 的节流推送，跟着云端档案走
// 拉不到 / 没登录 / 后端没起来，都只影响这一屏，不影响玩。
import { account } from './account.js';

// 接口地址：和 js/api.js 的 api.base 同一套判断，但不 import api.js（那会多带五十来 KB，
// 而我们只需要一个字符串）。改规则时两处一起改。
const PLACEHOLDER = 'https://zjtt-api.workers.dev';
function base() {
  // common.js 的 store 是 JSON 存的（写进去的字符串带引号），这里照它的样子解一次
  let custom = '';
  try {
    const raw = localStorage.getItem('zjtt:apiBase');
    if (raw != null) custom = String(JSON.parse(raw) || '').trim().replace(/\/+$/, '');
  } catch (e) { custom = ''; }
  if (custom) return custom;
  const h = location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') return 'http://127.0.0.1:8795';
  if (!/\.github\.io$/i.test(h)) return location.origin + '/api';
  return PLACEHOLDER.replace(/\/+$/, '');
}

const TIMEOUT = 7000;

// 返回 { label, unit, items: [{ name, score, sub }] }，取不到就抛，让调用方自己兜底
export async function fetchBoard() {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), TIMEOUT) : 0;
  try {
    const r = await fetch(base() + '/board', {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: ctl ? ctl.signal : undefined,
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const g = d && d.games && d.games.bz;
    if (!g) throw new Error('no bz');
    return {
      label: String(g.label || '最高分'),
      unit: String(g.unit || '分'),
      items: (Array.isArray(g.items) ? g.items : []).map((it) => ({
        name: String(it && it.name || '无名摊主').slice(0, 24),
        score: Math.round(Number(it && it.score) || 0),
        sub: String(it && it.sub || ''),
      })).filter((it) => it.score > 0),
    };
  } finally {
    if (t) clearTimeout(t);
  }
}

// 一局散场后调：先把远端档案并进来（不然会拿旧版本覆盖），再让 account 自己节流推一次。
// bz 那段摘要由 js/gamestats.js 的 digest() 从本机成绩算出来，所以不用在这里传参数。
export function pushScore() {
  return account.ready({ maxAge: 30000, timeout: 3000 })
    .catch(() => false)
    .then(() => { account.schedule(1200); return true; })
    .catch(() => false);
}
