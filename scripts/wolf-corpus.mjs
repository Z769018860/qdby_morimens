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
//   ✅ x/space/wbi/arc/search（wbi 签名）            全量投稿列表，ps=30/页，标题+简介摘要一次拿全
//   ✅ x/polymer/web-space/seasons_series_list（wbi）合集/系列名与集数（「代售小超市」这类栏目就在这儿）
//   ✅ live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=   直播间号 + 当前标题，不签名
//   ✅ live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=（wbi）直播间标题/tags/分区/公告
//   ✅ x/polymer/web-dynamic/v1/feed/space?host_mid=  空间动态（图文/转发）
//   ⚠️ x/space/wbi/arc/search 有风控期：一天内打太多次会 -412，睡 9s×n 重试，仍失败就先停手隔天再跑
//   ❌ x/web-interface/newlist?mid=                   会忽略 mid，返回全站最新投稿（拿到过别人的车评视频）
//   ❌ app.bilibili.com/x/v2/space/archive/cursor     现在固定 -400，别试
//
// 限速：默认每次请求间隔 4 秒（BILI_GAP 可改）。低于 2 秒连续打，基本十分钟内必被 -412。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const GAP = Number(process.env.BILI_GAP || 4000);
// 采集范围（2026-10-30 扩了一轮：简介、评论都要多翻几页）
const SPAGES = Number(process.env.BILI_SEARCH_PAGES || 3);   // 每个关键词搜几页（20 条/页）
const VIDEOS = Number(process.env.BILI_VIDEOS || 40);        // 每人保留多少条投稿
const VIEWN = Number(process.env.BILI_VIEWS || 20);          // 其中多少条去取完整简介
const CMTV = Number(process.env.BILI_CMT_VIDEOS || 6);       // 取几条视频的评论
const CMT_PAGES = Number(process.env.BILI_CMT_PAGES || 1);   // 每条视频评论翻几页
const CMT_SUB = Number(process.env.BILI_CMT_SUB || 5);       // 每楼取几条楼中楼
const ARCPAGES = Number(process.env.BILI_ARC_PAGES || 4);     // wbi 投稿列表翻几页（30 条/页）
const SERN = Number(process.env.BILI_SER_PAGES || 2);         // 每个合集的视频翻几页（30 条/页）

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
  { key: 'baiyun', mid: 621616293, name: '-白云出岫-', kws: ['白云出岫', '白云出岫 忘却前夜'] },
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

// ---- wbi 签名（arc/search、合集、直播间详情都要它） --------------------------
const TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];
const md5 = (x) => crypto.createHash('md5').update(x).digest('hex');
let MK = null;
async function signed(url, params = {}) {
  if (!MK) {
    const d = await get('https://api.bilibili.com/x/web-interface/nav', 'https://www.bilibili.com/');
    const img = (d.data && d.data.wbi_img) || {};
    const base = (u) => String(u || '').split('/').pop().split('.')[0];
    MK = TAB.map((i) => (base(img.img_url) + base(img.sub_url))[i]).join('').slice(0, 32);
  }
  const ref = params.__ref || 'https://space.bilibili.com/';
  const p = { ...params, wts: Math.floor(Date.now() / 1000) - 5 };
  delete p.__ref;
  const q = Object.keys(p).sort().map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(String(p[k]).replace(/[!'()*]/g, ''))).join('&');
  return get(url + '?' + q + '&w_rid=' + md5(q + MK), ref);
}
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
    let r;
    try {
      r = await fetch(url, {
        headers: {
          'User-Agent': UA,
          Referer: referer,
          Accept: 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Cookie: ck(),
        },
      });
    } catch (e) {
      // 代理抖动会抛 ECONNRESET / fetch failed，整轮采集不能因为一次握手失败就全崩
      console.log(new Date().toISOString().slice(11, 19), 'net-retry', attempt, e.cause && e.cause.code ? e.cause.code : e.message);
      await sleep(4000 * (attempt + 1));
      continue;
    }
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

  // ---- 直播间：标题 / 标签 / 分区 / 公告（直播间标题里的口癖比视频标题更鲜活） ----
  const room = await get('https://api.live.bilibili.com/room/v1/Room/getRoomInfoOld?mid=' + u.mid, 'https://live.bilibili.com/');
  if (room.code === 0 && room.data) {
    rec.live = { roomid: room.data.roomid, title: room.data.title || '', liveStatus: room.data.liveStatus };
    if (room.data.roomid) {
      const ri = await signed('https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom',
        { room_id: room.data.roomid, __ref: 'https://live.bilibili.com/' + room.data.roomid });
      if (ri.code === 0 && ri.data) {
        const info = ri.data.room_info || {};
        rec.live.title = info.title || rec.live.title;
        rec.live.tags = info.tags || '';
        rec.live.area = [info.parent_area_name, info.area_name].filter(Boolean).join(' / ');
        rec.live.announce = clip(ri.data.announcement && ri.data.announcement.content, 600);
      }
    }
  }
  log('live', room.code, '|', clip(rec.live && rec.live.title, 40), '|', (rec.live && rec.live.tags) || '');

  // ---- 全量投稿（wbi arc/search）：search/type 只按相关度给几十条，这里是按时间从新到旧翻页 ----
  rec.arc = rec.arc || [];
  for (let pn = 1; pn <= ARCPAGES; pn++) {
    const r = await signed('https://api.bilibili.com/x/space/wbi/arc/search',
      { mid: u.mid, ps: 30, pn, order: 'pubdate', __ref: 'https://space.bilibili.com/' + u.mid + '/video' });
    const vlist = (r.data && r.data.list && r.data.list.vlist) || [];
    let add = 0;
    for (const x of vlist) {
      if (rec.arc.some((v) => v.bvid === x.bvid)) continue;
      rec.arc.push({
        bvid: x.bvid, aid: x.aid, title: clip(x.title, 160), desc: clip(x.description, 600),
        pub: x.created ? new Date(x.created * 1000).toISOString().slice(0, 10) : '',
        play: x.play, len: x.length,
      });
      add++;
    }
    log('arc', pn, r.code, 'vlist', vlist.length, 'new', add, 'total', rec.arc.length);
    if (vlist.length < 30) break;
  }

  const list = rec.videos || [];
  const pushV = (bvid, title, desc) => {
    if (!bvid || list.some((v) => v.bvid === bvid)) return false;
    list.push({ bvid, title: clip(title, 120), desc: clip(desc, 400) });
    return true;
  };
  for (const kw of u.kws) {
    for (let page = 1; page <= SPAGES; page++) {
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
  for (const a of rec.arc || []) pushV(a.bvid, a.title, a.desc);
  rec.videos = list.slice(0, VIDEOS);
  log('videos', rec.videos.length, '(arc', (rec.arc || []).length, ')');

  let n = 0;
  for (const v of rec.videos.slice(0, VIEWN)) {
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
  for (const v of rec.videos.filter((x) => x.aid).slice(0, CMTV)) {
    for (const sort of [2, 0]) {
      for (let pn = 1; pn <= CMT_PAGES; pn++) {
      const rep = await get(`https://api.bilibili.com/x/v2/reply?type=1&oid=${v.aid}&pn=${pn}&ps=20&sort=${sort}`, 'https://www.bilibili.com/video/' + v.bvid);
      if (rep.code !== 0) continue;
      for (const r of rep.data.replies || []) {
        const t = clip(r.content && r.content.message, 240);
        if (!t || rec.comments.some((c) => c.text === t)) continue;
        rec.comments.push({ bvid: v.bvid, user: r.member && r.member.uname, text: t, like: r.like });
        for (const s2 of (r.replies || []).slice(0, CMT_SUB)) {
          const t2 = clip(s2.content && s2.content.message, 240);
          if (t2 && !rec.comments.some((c) => c.text === t2)) rec.comments.push({ bvid: v.bvid, user: s2.member && s2.member.uname, text: t2, like: s2.like });
        }
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

  // ---- 合集 / 系列：栏目名本身就是口癖（例：爱丽丝的「代售小超市」） ----
  const ser = await signed('https://api.bilibili.com/x/polymer/web-space/seasons_series_list',
    { mid: u.mid, page_num: 1, page_size: 20, __ref: 'https://space.bilibili.com/' + u.mid });
  rec.series = rec.series || [];
  const il = (ser.data && ser.data.items_lists) || {};
  for (const it of [...(il.seasons_list || []), ...(il.series_list || [])]) {
    const meta = it.meta || {};
    const name = clip(meta.name, 60);
    if (!name || rec.series.some((x) => x.name === name)) continue;
    rec.series.push({
      name, title: clip(meta.title, 60), total: meta.total,
      id: meta.season_id || meta.series_id,
      kind: (il.seasons_list || []).includes(it) ? 'season' : 'series',
      sample: (it.archives || []).slice(0, 6).map((a) => clip(a.title, 80)),
    });
  }
  log('series', ser.code, rec.series.length, rec.series.map((x) => x.name).join(' / ').slice(0, 90));

  // 每个合集的全部视频：栏目里的标题密度最高（「神秘抽卡记录」17 条全是金句）
  for (const sr of rec.series) {
    if (!sr.id || sr.kind !== 'season') continue;
    sr.titles = sr.titles || [];
    for (let pn = 1; pn <= SERN; pn++) {
      const r = await signed('https://api.bilibili.com/x/polymer/web-space/seasons_archives_list',
        { mid: u.mid, season_id: sr.id, sort_reverse: false, page_num: pn, page_size: 30, __ref: 'https://space.bilibili.com/' + u.mid });
      const arcs = (r.data && r.data.archives) || [];
      for (const a of arcs) {
        const t = clip(a.title, 160);
        if (t && !sr.titles.includes(t)) sr.titles.push(t);
        if (!list.some((v) => v.bvid === a.bvid)) list.push({ bvid: a.bvid, title: t, desc: '', _aid: a.aid });
      }
      if (arcs.length < 30) break;
    }
    log('  series-arc', clip(sr.name, 20), sr.titles.length);
  }
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
