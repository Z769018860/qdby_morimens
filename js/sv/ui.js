// 《唤醒体幸存者》界面层：选人、HUD、升级三选一、暂停与结算。
//
// 界面全部是叠在 canvas 上的 DOM —— 文字排版、滚动列表、按钮反馈交给浏览器
// 比自己画省事得多，也自动适配中文换行。只有真正每帧变化的东西（血条、
// 经验条、计时）才走这里的高频更新，而且都做了「值没变就不动 DOM」的判断。
//
// 图标不额外请求：全部按格位从图集里用 background-position 切出来。

import { G, applyChoice, summary, remaining } from './engine.js';
import { CHARS, WEAPONS, META, ATLAS, CREATIONS, WHEELS, COVENANTS } from './gen.js';
import {
  PROTOS, LV, WHEEL_FX, COVENANT_FX, CREATION_FX, DIFFS,
  creditsAt, nextTier,
} from './defs.js';

const ATLAS_URI = ATLAS;

const $ = (id) => document.getElementById(id);

export const ui = {
  diff: 'normal',
  charId: null,
  onChoice: null,
  onRestart: null,
  last: {},
};

// ---------------------------------------------------------------- 图集取图
export function atlasStyle(idx, size) {
  if (idx == null) return '';
  const col = idx % META.cols;
  const row = (idx / META.cols) | 0;
  const scale = size / META.cell;
  return [
    `background-image:url(${ATLAS_URI});`,
    `background-size:${META.w * scale}px ${META.h * scale}px;`,
    `background-position:${-col * size}px ${-row * size}px;`,
    `width:${size}px;height:${size}px;`,
  ].join('');
}
// ATLAS 是 data URI，直接拼进 style 会让字符串比较变慢，单独取出引用

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const REALM_CLASS = { 混沌: 'r-chaos', 血肉: 'r-caro', 深海: 'r-aequor', 超维: 'r-ultra' };

// ---------------------------------------------------------------- 选人
export function showPick() {
  const ov = $('ovPick');
  ov.hidden = false;
  $('ovUp').hidden = true;
  $('ovEnd').hidden = true;

  const list = $('charList');
  if (!list.dataset.built) {
    list.innerHTML = CHARS.map((c) => `
      <button class="ch ${REALM_CLASS[c.realm] || ''}" data-id="${c.id}" title="${esc(c.n)}">
        <i style="${atlasStyle(c.img, 54)}"></i>
        <b>${esc(c.n)}</b>
      </button>`).join('');
    list.dataset.built = '1';
  }

  const diffBox = $('diffBox');
  diffBox.innerHTML = DIFFS.map((d) => `<button data-k="${d.k}" class="${d.k === ui.diff ? 'on' : ''}">${d.n}</button>`).join('');
  $('diffTip').textContent = DIFFS.find((d) => d.k === ui.diff).tip;

  diffBox.onclick = (e) => {
    const b = e.target.closest('button[data-k]');
    if (!b) return;
    ui.diff = b.dataset.k;
    [...diffBox.children].forEach((x) => x.classList.toggle('on', x.dataset.k === ui.diff));
    $('diffTip').textContent = DIFFS.find((d) => d.k === ui.diff).tip;
  };

  list.onclick = (e) => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    ui.charId = b.dataset.id;
    [...list.children].forEach((x) => x.classList.toggle('on', x.dataset.id === ui.charId));
    renderCharInfo();
  };

  if (!ui.charId) {
    ui.charId = CHARS[0].id;
    [...list.children].forEach((x) => x.classList.toggle('on', x.dataset.id === ui.charId));
  }
  renderCharInfo();
}

function renderCharInfo() {
  const c = CHARS.find((x) => x.id === ui.charId);
  if (!c) return;
  const realmFx = {
    混沌: '暴击率 +8%，暴击伤害 +30%',
    血肉: '伤害的 3% 转为治疗，攻击力 +10%',
    深海: '受伤 -8%，每秒回复 0.6 生命',
    超维: '冷却 -10%，作用范围 +10%',
  }[c.realm];
  const roleFx = { 伤害型: '攻击力 +8%', 防御型: '最大生命 +25', 辅助型: '经验获取 +12%' }[c.role];
  const ws = c.weapons.map((w, i) => `
    <div class="wi">
      <span class="pk">${i === 0 ? '初始' : '可抽'}</span>
      <b>${esc(w.n)}</b>
      <em>${PROTOS[w.proto] ? PROTOS[w.proto].name : ''}</em>
    </div>`).join('');
  $('charInfo').innerHTML = `
    <div class="ci-top">
      <i class="ci-portrait" style="${atlasStyle(c.img, 72)}"></i>
      <div>
        <h3>${esc(c.n)} <small>${esc(c.en)}</small></h3>
        <p class="ci-tags">
          <span class="tg ${REALM_CLASS[c.realm] || ''}">${esc(c.realm)}</span>
          <span class="tg">${esc(c.role)}</span>
          <span class="tg">${esc(c.rarity)}</span>
        </p>
        <p class="ci-line"><b>界域</b>${realmFx}</p>
        <p class="ci-line"><b>定位</b>${roleFx}</p>
      </div>
    </div>
    <p class="ci-talent"><b>天赋 · ${esc(c.talent)}</b>${esc(c.talentText || '')}</p>
    <div class="ci-w">${ws}</div>`;
}

// ---------------------------------------------------------------- HUD
export function buildHUD() {
  $('hud').innerHTML = `
    <div class="hud-top">
      <div class="hud-time"><b id="hTime">15:00</b><span id="hKill">0 击杀</span></div>
      <div class="hud-lv"><span>Lv.<b id="hLv">1</b></span><div class="xp"><i id="hXp"></i></div></div>
      <button class="hud-pause" id="hPause" title="暂停">❚❚</button>
    </div>
    <div class="hud-bars">
      <div class="bar hp"><i id="hHp"></i><em id="hHpTxt">100 / 100</em></div>
      <div class="bar sh" id="hShBox" hidden><i id="hSh"></i></div>
    </div>
    <div class="hud-weapons" id="hWeapons"></div>
    <div class="hud-passives" id="hPassives"></div>
    <div class="bossbar" id="hBoss" hidden><span id="hBossName"></span><i><b id="hBossFill"></b></i></div>`;
  $('hPause').onclick = () => togglePause();
}

let hudCache = {};
export function updateHUD() {
  if (G.phase === 'idle') return;
  const P = G.player;
  const t = Math.ceil(remaining());
  const tm = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  if (hudCache.tm !== tm) { hudCache.tm = tm; $('hTime').textContent = tm; }
  if (hudCache.kill !== G.kills) { hudCache.kill = G.kills; $('hKill').textContent = `${G.kills} 击杀`; }
  if (hudCache.lv !== G.lv) { hudCache.lv = G.lv; $('hLv').textContent = G.lv; }
  const xp = Math.max(0, Math.min(1, G.exp / G.expNext));
  if (hudCache.xp == null || Math.abs(hudCache.xp - xp) > 0.008) {
    hudCache.xp = xp; $('hXp').style.width = (xp * 100).toFixed(1) + '%';
  }
  const hp = Math.max(0, Math.min(1, P.hp / P.maxHp));
  if (hudCache.hp == null || Math.abs(hudCache.hp - hp) > 0.004) {
    hudCache.hp = hp; $('hHp').style.width = (hp * 100).toFixed(1) + '%';
    $('hHpTxt').textContent = `${Math.max(0, Math.ceil(P.hp))} / ${P.maxHp}`;
  }
  const shOn = P.shield > 0;
  if (hudCache.shOn !== shOn) { hudCache.shOn = shOn; $('hShBox').hidden = !shOn; }
  if (shOn) {
    const sr = Math.max(0, Math.min(1, P.shield / Math.max(1, P.maxShield)));
    if (hudCache.sh == null || Math.abs(hudCache.sh - sr) > 0.01) {
      hudCache.sh = sr; $('hSh').style.width = (sr * 100).toFixed(1) + '%';
    }
  }
  // Boss 血条：场上有强敌时出现在底部，没有就整块收起来
  const boss = G.enemies.find((e) => e.tier === 2);
  if (hudCache.boss !== !!boss) { hudCache.boss = !!boss; $('hBoss').hidden = !boss; }
  if (boss) {
    $('hBossName').textContent = boss.n;
    $('hBossFill').style.width = (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + '%';
  }
  const wkey = G.weapons.map((w) => w.def.id + w.lv).join(',');
  if (hudCache.wkey !== wkey) {
    hudCache.wkey = wkey;
    $('hWeapons').innerHTML = G.weapons.map((w) => `
      <div class="slot" title="${esc(w.def.n)} · ${esc(w.def.charName)}">
        <i style="${atlasStyle(charFrame(w.def.char), 30)}"></i>
        <span class="pips">${'<b class="on"></b>'.repeat(w.lv + 1)}${'<b></b>'.repeat(LV.max - w.lv)}</span>
      </div>`).join('');
  }
  const pkey = G.passives.map((p) => p.id + p.stack).join(',') + '|' + G.wheels.map((w) => w.idx).join(',') + '|' + G.covs.map((c) => c.idx).join(',');
  if (hudCache.pkey !== pkey) {
    hudCache.pkey = pkey;
    const ps = G.passives.map((p) => `<div class="slot p" title="${esc(p.n)}">${'<u></u>'.repeat(p.stack)}</div>`).join('');
    const ws = G.wheels.map((w) => `<div class="slot w" title="${esc(w.n)}">命</div>`).join('');
    const cs = G.covs.map((c) => `<div class="slot c" title="${esc(c.n)}">契</div>`).join('');
    $('hPassives').innerHTML = ws + cs + ps;
  }
}

function charFrame(id) {
  const c = CHARS.find((x) => x.id === String(id));
  return c ? c.img : null;
}

// ---------------------------------------------------------------- 升级三选一
const KIND_LABEL = { wnew: '新技能', wlv: '技能升级', creation: '造物', wheel: '命轮', cov: '契物' };

export function showUpgrade(choices) {
  const ov = $('ovUp');
  ov.hidden = false;
  $('upList').innerHTML = choices.map((o, i) => {
    if (o.kind === 'wnew' || o.kind === 'wlv') {
      const d = o.kind === 'wlv' ? o.w.def : o.def;
      const lv = o.kind === 'wlv' ? o.w.lv + 1 : 0;
      const proto = PROTOS[d.proto];
      const title = o.kind === 'wlv' ? `${d.n} → ${lv + 1} 级` : `${d.n}（${d.charName}）`;
      const desc = proto ? proto.desc(lv) : '';
      return card(i, o.kind === 'wlv' ? 'wlv' : 'wnew', title, desc, d.text || '', atlasStyle(charFrame(d.char), 46), KIND_LABEL[o.kind]);
    }
    if (o.kind === 'creation') {
      const fx = CREATION_FX[o.c.fx];
      const desc = fx ? fx.txt : '通用强化';
      const have = G.passives.find((p) => p.id === String(o.c.id));
      return card(i, 'creation', o.c.n, desc, have ? `已叠 ${have.stack} 层 · 可叠 3 层` : '可叠 3 层', atlasStyle(META.frames['k:' + o.c.id], 46), KIND_LABEL[o.kind]);
    }
    if (o.kind === 'wheel') {
      return card(i, 'wheel', o.w.n, WHEEL_FX[o.i % WHEEL_FX.length].txt, '命轮 · 质变', atlasStyle(META.frames['w:' + o.w.id], 46), KIND_LABEL[o.kind]);
    }
    return card(i, 'cov', o.c.n, COVENANT_FX[o.i % COVENANT_FX.length].txt, '契物 · 唯一', atlasStyle(META.frames['v:' + o.c.id], 46), KIND_LABEL[o.kind]);
  }).join('');

  $('upList').onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    choose(Number(b.dataset.i));
  };
}

function card(i, tier, title, sub, foot, imgStyle, tag) {
  return `
    <button class="up ${tier}" data-i="${i}">
      <span class="up-tag">${tag}</span>
      <span class="up-img" style="${imgStyle}"></span>
      <span class="up-txt">
        <b>${esc(title)}</b>
        <em>${esc(sub)}</em>
        ${foot ? `<u>${esc(foot)}</u>` : ''}
      </span>
      <span class="up-key">${i + 1}</span>
    </button>`;
}

export function choose(i) {
  const o = G.choices[i];
  if (!o) return;
  $('ovUp').hidden = true;
  applyChoice(o);
  if (G.phase === 'run') hudCache = {};
  else if (G.phase === 'levelup') showUpgrade(G.choices);
}

// ---------------------------------------------------------------- 暂停 / 结算
export function togglePause(force) {
  if (G.phase === 'run' && force !== false) {
    G.phase = 'pause';
    showPause();
  } else if (G.phase === 'pause' && force !== true) {
    G.phase = 'run';
    $('ovPause').hidden = true;
  }
}

function showPause() {
  const ov = $('ovPause');
  ov.hidden = false;
  $('pauseWeapons').innerHTML = G.weapons.map((w) => `
    <div class="pw"><i style="${atlasStyle(charFrame(w.def.char), 34)}"></i>
      <b>${esc(w.def.n)}</b><em>Lv.${w.lv + 1}</em></div>`).join('') || '<p class="dim">还没有技能</p>';
  $('pauseStats').innerHTML = `
    <span>击杀 <b>${G.kills}</b></span><span>等级 <b>${G.lv}</b></span>
    <span>存活 <b>${Math.floor(G.t / 60)}:${String(Math.floor(G.t % 60)).padStart(2, '0')}</b></span>
    <span>造物 <b>${G.passives.length}</b></span>`;
}

export function showEnd(sm) {
  const ov = $('ovEnd');
  ov.hidden = false;
  $('endTitle').textContent = sm.win ? '撑到潮水退去' : '倒在了半路';
  const best0 = Number(localStorage.getItem('zjtt:survivors:best') || 0);
  const sub = sm.win ? `15 分钟打满，${sm.char} 活着走了出来` : `${sm.char} 在第 ${Math.floor(sm.t / 60)} 分 ${String(Math.floor(sm.t % 60)).padStart(2, '0')} 秒力竭`;
  $('endSub').textContent = sm.score > best0 ? `${sub} · 新纪录` : sub;
  const cred = creditsAt(sm.score);
  const nxt = nextTier(sm.score);
  const isBest = sm.score > best0;
  if (isBest) localStorage.setItem('zjtt:survivors:best', String(sm.score));
  $('endStats').innerHTML = `
    <div class="es"><b>${sm.score.toLocaleString()}</b><span>本局得分</span></div>
    <div class="es"><b>${sm.kills}</b><span>击杀</span></div>
    <div class="es"><b>${sm.lv}</b><span>等级</span></div>
    <div class="es"><b>${sm.bossKills}</b><span>强敌</span></div>
    <div class="es"><b>+${cred}</b><span>银芯</span></div>`;
  $('endTier').textContent = nxt ? `再拿 ${(nxt[0] - sm.score).toLocaleString()} 分可换 ${nxt[1]} 银芯` : '已达最高档';
  if (cred > 0) grantCredits(cred);
}

// 银芯走与「合成大杜勒」「战报侦探」同一个钱包键（zjtt:credits）
function grantCredits(n) {
  try {
    const cur = Number(localStorage.getItem('zjtt:credits') || 0) || 0;
    localStorage.setItem('zjtt:credits', String(cur + n));
    document.dispatchEvent(new CustomEvent('zjtt:credits', { detail: { add: n } }));
  } catch { /* 隐私模式 */ }
}

