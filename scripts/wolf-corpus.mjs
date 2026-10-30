#!/usr/bin/env node
// 弥萨格狼人杀：B 站主播语料采集
//
// 台词里主播的口癖不是我编的，是从他们自己的投稿简介、动态、评论里抠出来的。
// 这个脚本就是采集器。跑一次能把十位主播的「签名 + 投稿标题 + 完整简介 + 评论 + 动态」抓成一份 JSON，
// 再拿去对着写台词（见 js/wolf/lines-up*.js 文件头的口癖说明）。
//
// 用法：
//   https_proxy=http://127.0.0.1:7897 node scripts/wolf-corpus.mjs --out H:/work/tmp/corpus.json
//   BILI_GAP=2500 node scripts/wolf-corpus.mjs --mid 1800901917 --out /tmp/myls.json
//
// 接口现状（2026-10 实测，踩过的坑都在这儿，别再走一遍）：
//   ✅ x/web-interface/card?mid=                      空间签名、粉丝、投稿数，不签名
//   ✅ x/web-interface/search/type?search_type=video  投稿搜索，不签名，20 条/页，带 author/bvid/description
//   ✅ x/web-interface/view?bvid=                     完整简介 desc、UP 主自写的 dynamic、分区、tag
//   ✅ x/v2/reply?type=1&oid=                        评论，热度 sort=2 / 时间 sort=0，含楼中楼
//   ✅ x/polymer/web-dynamic/v1/feed/space?host_mid=  空间动态（图文/转发）
//   ❌ x/space/wbi/arc/search                         要 wbi 签名，且现在已经 -412 风控，别浪费时间
//   ❌ x/web-interface/newlist?mid=                   会忽略 mid，返回全站最新投稿（拿到过别人的车评视频）
//
// 限速：默认每次请求间隔 4 秒（BILI_GAP 可改）。低于 2 秒连续打，基本十分钟内必被 -412。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const GAP = Number(process.env.BILI_GAP || 4000);

// 十位主播。key 只是本地用的短名，mid 才是身份。
const UPS = [
  { key: 'xiaomao', mid: 11425051, name: '弥萨格校猫Light', kws: ['弥萨格校猫'] },
  { key: 'samo', mid: 345114332, name: '萨摩_不耶', kws: ['萨摩不耶', '萨摩_不耶'] },
  { key: 'myls', mid: 1800901917, name: '梦依流苏_myls', kws: ['梦依流苏', '梦依 忘却前夜'] },
  { key: 'alice', mid: 545164270, name: '金发女人丨型', kws: ['金发女人 忘却前夜'] },
  { key: 'rat', mid: 399273416, name: '伊莎玛拉-大群来了', kws: ['伊莎玛拉 忘却前夜', '鼠王 忘却前夜'] },
  { key: 'dragon', mid: 190977084, name: '魔龙_D', kws: ['魔龙_D 忘却前夜'] },
  { key: 'lshi', mid: 3493105187687321, name: '立誓0氪吃400', kws: ['立誓0氪', '牢播 忘却前夜'] },
  { key: 'summer', mid: 515298109, name: '夏茉琳summerring', kws: ['夏茉琳 忘却前夜'] },
  { key: 'zhaoxing', mid: 14997071, name: '朝星-', kws: ['朝星', '朝星-', '朝星 忘却前夜'] },
  { key: 'maodie', mid: 1475217387, name: '路过的耄耋', kws: ['路过的耄耋', '耄耋 忘却前夜'] },
];

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? process.argv[i + 1] : d;
};
const OUT = arg('out', 'wolf-corpus.json');
const ONLY = arg('mid', null);
const clip = (s, n) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- cookie / 限速 / 重试 -------------------------------------------------
let jar = {};
const ck = () => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
function absorb(sc) {
  for (const line of sc || []) {
    const kv = line.split(';')[0];
    const i = kv.indexOf('=');
    if (i > 0) jar[kv.slice(0, i)] = kv.slice(i + 1);
  }
}
let booted = false;
let last = 0;
async function get(url, referer = 'https://www.bilibili.com/') {
  if (!booted) {
    const r = await fetch('https://www.bilibili.com/', { headers: { 'User-Agent': UA, 'Accept': 'text/html' } });
    absorb(r.headers.getSetCookie ? r.headers.getSetCookie() : []);
    const spi = await fetch('https://api.bilibili.com/x/frontend/finger/spi', { headers: { 'User-Agent': UA, 'Referer': 'https://www.bilibili.com/' } });
    try {
      const d = await spi.json();
      if (d.data && d.data.b_3) jar.buvid3 = d.data.b_3;
    } catch { }
    booted = true;
    await sleep(600);
  }
  const wait = last + GAP - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(url, {
      headers: {
        'User-Agent': UA,
        Referer: referer,
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Cookie: ck(),
      },
    });
    absorb(r.headers.getSetCookie ? r.headers.getSetCookie() : []);
    const txt = await r.text();
    let d;
    try { d = JSON.parse(txt); } catch { d = { code: -1, message: 'NOT_JSON ' + txt.slice(0, 60) }; }
    if (d.code === 0) return d;
    if (d.code === -412 || d.code === -799 || d.code === -352) { await sleep(9000 * (attempt + 1)); continue; }
    return d;
  }
  return { code: -412, message: 'banned after retries' };
}

// ---- 抓一个人 --------------------------------------------------------------
async function collect(u, rec) {
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), u.key, ...a);

  const card = await get('https://api.bilibili.com/x/web-interface/card?mid=' + u.mid, 'https://space.bilibili.com/' + u.mid);
  if (card.code === 0) {
    const c = card.data.card;
    rec.name = c.name;
    rec.sign = c.sign || '';
    rec.fans = card.data.follower;
    rec.archiveCount = card.data.archive_count;
  }
  log('card', card.code, '|', clip(rec.sign, 34));

  const list = rec.videos || [];
  const pushV = (bvid, title, desc) => {
    if (!bvid || list.some((v) => v.bvid === bvid)) return false;
    list.push({ bvid, title: clip(title, 120), desc: clip(desc, 400) });
    return true;
  };
  for (const kw of u.kws) {
    for (let page = 1; page <= 3; page++) {
      const r = await get('https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=' + encodeURIComponent(kw) + '&page=' + page, 'https://search.bilibili.com/');
      const arr = (r.data && r.data.result) || [];
      let hit = 0;
      for (const x of arr) {
        // 搜索是按相关度排的，别人的视频混在里面很正常，必须按 author 过滤
        const a = String(x.author || '').replace(/\s/g, '');
        const n = String(rec.name || '').replace(/\s/g, '');
        const base = n.replace(/[-_].*$/, '');
        if (!a || !(a === n || (base.length >= 2 && a.includes(base)))) continue;
        if (pushV(x.bvid, x.title, x.description)) hit++;
      }
      log('search', kw, page, r.code, 'hit', hit, 'total', list.length);
      if (!arr.length) break;
    }
  }
  rec.videos = list.slice(0, 40);
  log('videos', rec.videos.length);

  let n = 0;
  for (const v of rec.videos.slice(0, 20)) {
    if (v.descFull) continue;
    const view = await get('https://api.bilibili.com/x/web-interface/view?bvid=' + v.bvid, 'https://www.bilibili.com/video/' + v.bvid);
    if (view.code !== 0) { log('view fail', v.bvid, view.code); continue; }
    const d = view.data;
    v.aid = d.aid;
    v.title = clip(d.title, 120);
    v.descFull = clip(d.desc, 2000);
    v.upWords = clip(d.dynamic, 600);
    v.tname = d.tname;
    v.tags = (d.tags || []).map((t) => t.tag_name).slice(0, 12);
    v.pub = d.pubdate ? new Date(d.pubdate * 1000).toISOString().slice(0, 10) : '';
    n++;
  }
  log('desc', n);

  rec.comments = rec.comments || [];
  for (const v of rec.videos.filter((x) => x.aid).slice(0, 6)) {
    for (const sort of [2, 0]) {
      const rep = await get(`https://api.bilibili.com/x/v2/reply?type=1&oid=${v.aid}&pn=1&ps=20&sort=${sort}`, 'https://www.bilibili.com/video/' + v.bvid);
      if (rep.code !== 0) continue;
      for (const r of rep.data.replies || []) {
        const t = clip(r.content && r.content.message, 240);
        if (!t || rec.comments.some((c) => c.text === t)) continue;
        rec.comments.push({ bvid: v.bvid, user: r.member && r.member.uname, text: t, like: r.like });
        for (const s2 of (r.replies || []).slice(0, 5)) {
          const t2 = clip(s2.content && s2.content.message, 240);
          if (t2 && !rec.comments.some((c) => c.text === t2)) rec.comments.push({ bvid: v.bvid, user: s2.member && s2.member.uname, text: t2, like: s2.like });
        }
      }
    }
  }
  log('comments', rec.comments.length);

  const dyn = await get('https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=' + u.mid, 'https://space.bilibili.com/' + u.mid + '/dynamic');
  rec.dynamics = rec.dynamics || [];
  for (const it of ((dyn.data && dyn.data.items) || []).slice(0, 24)) {
    const m = it.modules && it.modules.module_dynamic;
    const txt = (m && m.desc && m.desc.text) || (m && m.major && m.major.opus && m.major.opus.summary && m.major.opus.summary.text) || '';
    const t = clip(txt, 800);
    if (t && !rec.dynamics.some((d) => d.text === t)) rec.dynamics.push({ text: t, pub: it.modules && it.modules.module_author && it.modules.module_author.pub_time });
  }
  log('dynamics', rec.dynamics.length);
}

const db = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const targets = ONLY ? UPS.filter((u) => String(u.mid) === String(ONLY)) : UPS;
for (const u of targets) {
  db[u.key] = db[u.key] || { mid: u.mid, name: u.name };
  await collect(u, db[u.key]);
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(db, null, 1));
}
console.log('done ->', OUT);
