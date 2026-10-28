#!/usr/bin/env node
// Reference arena server for 《忘却之夜·挂机录》 — zero dependencies, JSON-file storage.
//   node server/arena-server.js            # PORT=8796 DATA=./arena-data.json
// Point the game at it in 设置 → 竞技场服务器 (e.g. http://127.0.0.1:8796).
//
// Only real players are stored; every other rank is a bot that the client generates from the rank number.
// Ranks 1..100, 101 = unranked. Winning against rank r inserts the player at r and shifts the players between down by one.
// Players are only offered as opponents while they sit in ranks 1..HUMAN_ZONE (everything below is bots only).
// The server does not simulate battles (the snapshot fight is run by the challenger's client), so results are trusted:
// fine for a friends' ladder, not for anything with real stakes. Sanity limits: 5 reports per player per day, window check.
import http from 'node:http';
import fs from 'node:fs';

const PORT = +process.env.PORT || 8796, FILE = process.env.DATA || './arena-data.json';
const LADDER = 100, ZONE = 30, WINDOW = 5, DAILY = +process.env.DAILY || 5;
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* fresh */ }
let dirty = false;
setInterval(() => { if (dirty) { dirty = false; fs.writeFileSync(FILE, JSON.stringify(db)); } }, 2000).unref();

const day = () => new Date().toISOString().slice(0, 10);
const okPid = (p) => typeof p === 'string' && /^[a-zA-Z0-9-]{8,48}$/.test(p);
const clean = (s) => String(s || '').replace(/[<>&"'\u0000-\u001f]/g, '').trim().slice(0, 12) || '无名旅人';
const KEYS = ['slug', 'lv', 'star', 'hp', 'atk', 'def', 'critRate', 'critDmg', 'amp', 'aliGain', 'keyGain', 'healBonus', 'shieldBonus', 'steal', 'surviveChance', 'openAli', 'openKey', 'firstBoost'];
const cleanSnap = (snap) => (Array.isArray(snap) ? snap.slice(0, 4).map((s) => Object.fromEntries(KEYS.map((k) => [k, k === 'slug' ? String(s?.slug || '').slice(0, 32) : Math.max(0, Math.min(1e7, +s?.[k] || 0))]))) : []);
const power = (snap) => Math.round(snap.reduce((a, s) => a + s.hp / 10 + s.atk + s.def * 0.8, 0));
const byRank = (r) => Object.entries(db.players).find(([, p]) => p.rank === r);

function player(pid, name) {
  const p = (db.players[pid] ||= { name: clean(name), rank: LADDER + 1, snap: [], wins: 0, losses: 0, day: '', reports: 0 });
  if (name) p.name = clean(name);
  return p;
}
function opponents(p) {
  const out = [];
  for (let r = Math.min(p.rank, LADDER + 1) - 1; r >= 1 && out.length < WINDOW; r--) {
    const hit = byRank(r);
    out.push(hit && r <= ZONE && hit[1].snap.length ? { rank: r, type: 'human', id: hit[0].slice(0, 6), name: hit[1].name, power: power(hit[1].snap), snap: hit[1].snap } : { rank: r, type: 'bot' });
  }
  return out;
}

async function body(req) {
  let s = '';
  for await (const c of req) { s += c; if (s.length > 64e3) throw new Error('big'); }
  return s ? JSON.parse(s) : {};
}
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname === '/arena/top') {
      const top = Object.values(db.players).filter((p) => p.rank <= LADDER).sort((a, b) => a.rank - b.rank).slice(0, 30).map((p) => ({ rank: p.rank, name: p.name, power: power(p.snap), wins: p.wins }));
      return send(res, 200, { top, players: Object.keys(db.players).length, zone: ZONE });
    }
    const b = req.method === 'POST' ? await body(req) : Object.fromEntries(url.searchParams);
    if (!okPid(b.pid)) return send(res, 400, { error: 'bad pid' });
    const p = player(b.pid, b.name);
    if (Array.isArray(b.snap)) p.snap = cleanSnap(b.snap);
    if (url.pathname === '/arena/register') { dirty = true; return send(res, 200, { rank: p.rank, zone: ZONE }); }
    if (url.pathname === '/arena/opponents') return send(res, 200, { rank: p.rank, opponents: opponents(p), zone: ZONE });
    if (url.pathname === '/arena/report' && req.method === 'POST') {
      if (p.day !== day()) { p.day = day(); p.reports = 0; }
      if (p.reports >= DAILY) return send(res, 429, { error: 'daily limit' });
      const t = Math.floor(+b.target);
      if (!(t >= 1 && t < p.rank && t >= p.rank - WINDOW)) return send(res, 400, { error: 'target out of window' });
      p.reports++;
      if (b.win) {
        p.wins++;
        for (const q of Object.values(db.players)) if (q !== p && q.rank >= t && q.rank < p.rank) q.rank++;
        p.rank = t;
      } else p.losses++;
      for (const q of Object.values(db.players)) if (q.rank > LADDER) q.rank = LADDER + 1;
      dirty = true;
      return send(res, 200, { rank: p.rank });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 400, { error: String(e.message) }); }
}).listen(PORT, () => console.log(`arena server on :${PORT} (${FILE})`));
