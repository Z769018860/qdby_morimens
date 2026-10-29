// 《唤醒体幸存者》界面层：选人、HUD、升级三选一、暂停与结算。
//
// 界面全部是叠在 canvas 上的 DOM —— 文字排版、滚动列表、按钮反馈交给浏览器
// 比自己画省事得多，也自动适配中文换行。只有真正每帧变化的东西（血条、
// 经验条、计时）才走这里的高频更新，而且都做了「值没变就不动 DOM」的判断。
//
// 图标不额外请求：全部按格位从图集里用 background-position 切出来。

import { G, applyChoice, skipChoice, summary, remaining, useItem, rollChoices } from './engine.js';
import { CHARS, WEAPONS, META, ATLAS, CREATIONS, WHEELS, COVENANTS } from './gen.js';
import {
  PROTOS, LV, WHEEL_FX, COVENANT_FX, CREATION_FX, DIFFS, RAGE, EVOS,
  creditsAt, nextTier, MECHS, GROWTHS,
} from './defs.js';
import { isUnlocked, unlockNeed, unlockProg, svProgress, recordRun, unlockedByRun } from './unlock.js';

const ATLAS_URI = ATLAS;

const $ = (id) => document.getElementById(id);

export const ui = {
  diff: 'normal',
  charId: null,
  onChoice: null,
  onRestart: null,
  onRage: null,
  last: {},
};

// ---------------------------------------------------------------- 图集取图
export function atlasStyle(idx, size) {
  // 没有立绘的唤醒体（四位神秘唤醒体）走剪影：一块深色渐变圆，
  // 没有细节、没有配色，只留一个轮廓。这是「它是谁你得自己打出来」的一部分。
  if (idx == null) {
    // 三层叠出一个「有个人站在那儿」的剪影：头、肩、底光。
    // 只画一块纯黑方块的话，四位神秘人看起来像四个占位符。
    return [
      'background:',
      'radial-gradient(34% 32% at 50% 34%, #46516b 0%, #333c50 62%, transparent 74%),',
      'radial-gradient(50% 38% at 50% 98%, #3b4560 0%, #2a3345 60%, transparent 76%),',
      'radial-gradient(76% 76% at 50% 42%, #1a202b 0%, #0c0f16 100%);',
      'box-shadow:inset 0 0 0 1px rgba(150,170,210,.2), inset 0 -6px 12px rgba(0,0,0,.6);',
      `width:${size}px;height:${size}px;`,
    ].join('');
  }
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
  const sw = $('ovSwap');
  if (sw) sw.hidden = true;

  const list = $('charList');
  // 每次打开都重建：解锁状态会在结算后变化，缓存 DOM 会出现「已经解锁了
  // 但列表里还是剪影」的错觉。66 个按钮重建一次是毫秒级的，不值得为它做脏检查。
  list.innerHTML = CHARS.map((c) => {
    const locked = c.lock && !isUnlocked(c.lock);
    const cls = ['' , REALM_CLASS[c.realm] || ''];
    if (c.lock) cls.push('hidden-one');
    if (locked) cls.push('locked');
    const label = locked ? '???' : c.n;
    const tip = locked ? `${c.n} · 未解锁` : c.n;
    return `
      <button class="ch${cls.join(' ')}" data-id="${c.id}" title="${esc(tip)}">
        <i style="${atlasStyle(locked || c.img == null ? null : c.img, 54)}"></i>
        ${locked ? '<em class="lkb">锁</em>' : (c.lock ? '<em class="lkb open">✦</em>' : '')}
        <b>${esc(label)}</b>
      </button>`;
  }).join('');
  list.dataset.built = '1';

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
  const locked = c.lock && !isUnlocked(c.lock);
  const mech = MECHS[c.id];
  const realmFx = {
    混沌: '暴击率 +8%，暴击伤害 +30%',
    血肉: '伤害的 3% 转为治疗，攻击力 +10%',
    深海: '受伤 -8%，每秒回复 0.6 生命',
    超维: '冷却 -10%，作用范围 +10%',
  }[c.realm];
  const roleFx = { 伤害型: '攻击力 +8%', 防御型: '最大生命 +25', 辅助型: '经验获取 +12%' }[c.role];
  // 未解锁时不剧透技能：只给剪影、名字和条件。名字本身是钩子，
  // 技能与机制留到解锁后自己看，才值得为它打那十把。
  const ws = (locked ? [] : c.weapons).map((w, i) => `
    <div class="wi">
      <span class="pk">${i === 0 ? '初始' : '可抽'}</span>
      <b>${esc(w.n)}</b>
      <em>${PROTOS[w.proto] ? PROTOS[w.proto].name : ''}</em>
    </div>`).join('');
  const lockBox = locked ? `
    <div class="ci-lock">
      <b>未解锁</b>
      <p>${esc(unlockNeed(c.lock))}</p>
      <u>进度 ${esc(unlockProg(c.lock))}</u>
    </div>` : '';
  const mechBox = mech && !locked ? `
    <p class="ci-mech"><b>机制 · ${esc(mech.n)}</b>${esc(mech.text)}</p>` : '';
  // 档案：解锁前连人都不给看，解锁后才亮出来 —— 和技能同一套逻辑。
  // 出处单独标在底部，别让「这是官方设定」和「这是我们编的」混在一起。
  const bioBox = !locked && c.bio ? `
    <div class="ci-bio"><b>档案</b><span>${esc(c.bio)}</span>${c.bioSrc ? `<u>出处 · ${esc(c.bioSrc)}</u>` : ''}</div>` : '';
  $('charInfo').innerHTML = `
    <div class="ci-top">
      <i class="ci-portrait${locked || c.img == null ? ' sil' : ''}" style="${atlasStyle(locked ? null : c.img, 72)}"></i>
      <div>
        <h3>${locked ? '???' : esc(c.n)} <small>${locked ? '未解锁' : esc(c.en)}</small></h3>
        <p class="ci-tags">
          <span class="tg ${REALM_CLASS[c.realm] || ''}">${esc(c.realm)}</span>
          <span class="tg">${esc(c.role)}</span>
          <span class="tg">${esc(c.rarity)}</span>
        </p>
        <p class="ci-line"><b>界域</b>${realmFx}</p>
        <p class="ci-line"><b>定位</b>${roleFx}</p>
      </div>
    </div>
    ${lockBox}
    ${mechBox}
    <p class="ci-talent"><b>天赋 · ${esc(c.talent)}</b>${esc(c.talentText || '')}</p>
    ${bioBox}
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
      <div class="ragebox" id="hRageBox">
        <div class="bar rage" id="hRageBar"><i id="hRage"></i><em id="hRageTxt">狂气 0</em></div>
        <button class="ragebtn" id="btnRage" title="狂气爆发（空格）" disabled>狂</button>
      </div>
    </div>
    <div class="hud-weapons" id="hWeapons"></div>
    <div class="hud-passives" id="hPassives"></div>
    <div class="hud-items" id="hItems" hidden></div>
    <div class="mechchip" id="hMech" hidden></div>
    <div class="bossbar" id="hBoss" hidden><span id="hBossName"></span><i><b id="hBossFill"></b></i></div>`;
  $('hPause').onclick = () => togglePause();
  $('btnRage').onclick = () => { if (ui.onRage) ui.onRage(); };
  // 点技能/造物/命轮 → 弹出构筑详情（会顺带暂停，否则一边看面板一边挨打）
  $('hWeapons').onclick = (e) => { if (e.target.closest('[data-info]')) openInfo(); };
  $('hPassives').onclick = (e) => { if (e.target.closest('[data-info]')) openInfo(); };
  // 道具是「点了就用」，没有二次确认：危急时刻多一步确认等于没有这个道具
  $('hItems').onclick = (e) => {
    const b = e.target.closest('[data-use]');
    if (!b) return;
    if (useItem(b.dataset.use)) hudCache.ikey = '';
  };
  const ic = $('btnInfoClose');
  if (ic) ic.onclick = closeInfo;
}

// ---------------------------------------------------------------- 构筑详情
// 一块面板把「我到底拿了什么、每个东西在干什么」列全。
// 战斗中随时可开（自动暂停），关掉继续打。
let infoPaused = false;

export function openInfo() {
  const ov = $('ovInfo');
  if (!ov) return;
  infoPaused = G.phase === 'run';
  if (infoPaused) G.phase = 'pause';
  $('infoBody').innerHTML = buildInfo();
  ov.hidden = false;
}

export function closeInfo() {
  const ov = $('ovInfo');
  if (!ov) return;
  ov.hidden = true;
  $('ovPause').hidden = true;
  if (infoPaused) { infoPaused = false; G.phase = 'run'; }
}

// 「这把技能的超武还差什么」：按 engine 相同的判定顺序（专武在前、通用原型在后）
// 找到第一个还没满足的条目，把条件翻译成人话。
function evoNeedText(w) {
  const list = EVOS.filter((e) => (e.char ? String(e.char) === String(w.def.char) : e.proto === w.def.proto));
  const next = list.find((e) => !w.evo || e.id !== w.evo.id);
  if (!next) return '';
  const n = next.need || {};
  const parts = [];
  if (n.level != null) parts.push(`这把技能升到 ${n.level + 1} 级`);
  if (n.creation) {
    const fx = CREATION_FX[n.creation.fx];
    parts.push(`${fx ? fx.txt.split('，')[0] : n.creation.fx} ×${n.creation.n} 层`);
  }
  if (n.wheel) {
    const wl = WHEEL_FX.find((x) => x.key === n.wheel);
    parts.push(`命轮「${wl ? wl.txt : n.wheel}」`);
  }
  if (n.proto) parts.push(`同时持有 ${n.proto} 类技能`);
  return `超武「${esc(next.n)}」：需要 ${esc(parts.join(' + ') || '未知条件')}`;
}

function buildInfo() {
  const ws = G.weapons.map((x) => {
    const proto = PROTOS[x.def.proto];
    const ev = x.evo ? x.evo.fx : null;
    const cd = proto ? proto.cd * LV.cd(x.lv) * G.mods.cd * (ev && ev.cd ? ev.cd : 1) : 0;
    const dmg = proto ? proto.dmg * LV.dmg(x.lv) * G.mods.atk * G.mods.dmgMul * (ev && ev.dmg ? 1 + ev.dmg : 1) : 0;
    // 没觉醒的武器给出「还差什么」—— 不给线索的话，玩家根本不知道有超武这回事
    const hint = x.evo ? '' : evoNeedText(x);
    return `<div class="if-row${x.evo ? ' has-evo' : ''}">
      <i style="${atlasStyle(charFrame(x.def.char), 34)}"></i>
      <div>
        <b>${esc(x.def.n)} <em>Lv.${x.lv + 1}</em>${x.evo ? `<em class="evo-tag">超武 · ${esc(x.evo.n)}</em>` : ''}</b>
        <span>${esc(x.def.charName)} · ${proto ? proto.name : ''} · 单发约 ${Math.round(dmg)} · 每 ${cd.toFixed(2)} 秒</span>
        <u>${esc(proto ? proto.desc(x.lv) : '')}</u>
        ${x.evo ? `<u class="evo-line">${esc(x.evo.txt)}</u>` : hint ? `<u class="evo-need">${hint}</u>` : ''}
      </div></div>`;
  }).join('') || '<p class="dim">还没有技能</p>';

  const ps = G.passives.map((x) => {
    const fx = CREATION_FX[x.fx];
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['k:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)} <em>×${x.stack}</em></b><span>${fx ? fx.txt : '通用强化'}</span></div></div>`;
  }).join('') || '<p class="dim">还没有造物</p>';

  const wheelRows = G.wheels.map((x) => {
    const fx = WHEEL_FX.find((f) => f.key === x.key);
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['w:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)}</b><span>${fx ? fx.txt : ''}</span></div></div>`;
  }).join('');
  const covRows = G.covs.map((x) => {
    const fx = COVENANT_FX.find((f) => f.key === x.key);
    return `<div class="if-row sm">
      <i style="${atlasStyle(META.frames['v:' + x.id], 26)}"></i>
      <div><b>${esc(x.n)}</b><span>${fx ? fx.txt : ''}</span></div></div>`;
  }).join('');

  // 机制：神秘唤醒体的规则条目单独列，不和造物混在一起 ——
  // 它不是「捡到的」，而是「这个人自带」的，位置不同才不会看混。
  const mm = G.char ? MECHS[G.char.id] : null;
  const mechRow = mm ? (() => {
    let now = '';
    if (mm.id === 'royalty') now = `当前 ${G.mech.stacks}/25 层`;
    else if (mm.id === 'seal') now = `当前 ${G.mech.stacks}/5 道`;
    else if (mm.id === 'paradox') now = '已生效';
    else if (mm.id === 'nightwatch') now = G.mech.low ? '燃灯中' : '待触发';
    return `<div class="if-row mech">
      <i class="if-glyph" style="color:${mm.color}">◈</i>
      <div><b>${esc(mm.n)} <em>${esc(now)}</em></b><span>${esc(mm.text)}</span></div></div>`;
  })() : '';

  const growRows = G.growth.length ? G.growth.reduce((acc, g) => {
    const hit = acc.find((x) => x.id === g.id);
    if (hit) hit.n++;
    else acc.push({ id: g.id, n: 1, name: g.n, icon: g.icon, fx: g.fx });
    return acc;
  }, []).map((g) => `<div class="if-row sm">
      <i class="if-glyph" style="color:#ffd479">${g.icon}</i>
      <div><b>${esc(g.name)} <em>×${g.n}</em></b><span>${esc((GROWTHS.find((x) => x.id === g.id) || {}).txt || '')}</span></div></div>`).join('') : '';

  const itemRows = G.items.map((it) => `<div class="if-row sm">
      <i class="if-glyph" style="color:${it.color}">${it.icon}</i>
      <div><b>${esc(it.n)}</b><span>${esc(it.txt)}</span></div></div>`).join('');

  return `
    ${mechRow ? `<h3 class="if-h">机制</h3>${mechRow}` : ''}
    <h3 class="if-h">技能 · ${G.weapons.length}/6</h3>${ws}
    <h3 class="if-h">命轮 · ${G.wheels.length}</h3>${wheelRows || '<p class="dim">第 3 分钟开始出现</p>'}
    <h3 class="if-h">契物 · ${G.covs.length}</h3>${covRows || '<p class="dim">第 10 分钟后出现</p>'}
    <h3 class="if-h">造物 · ${G.passives.length}/8</h3>${ps}
    ${growRows ? `<h3 class="if-h">极限淬炼 · ${G.growth.length} 次</h3>${growRows}` : ''}
    ${itemRows ? `<h3 class="if-h">道具 · ${G.items.length}/3</h3>${itemRows}` : ''}`;
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
  // ---- 狂气：一条槽 + 一个「狂」按钮。满了按钮才可点，爆发期间显示倒计时。
  const rk = Math.max(0, Math.min(1, G.rage / RAGE.max));
  if (hudCache.rage == null || Math.abs(hudCache.rage - rk) > 0.008) {
    hudCache.rage = rk;
    $('hRage').style.width = (rk * 100).toFixed(1) + '%';
  }
  const rageTxt = G.rageT > 0 ? `狂气爆发 ${G.rageT.toFixed(1)}s` : `狂气 ${Math.floor(G.rage)}`;
  if (hudCache.rageTxt !== rageTxt) { hudCache.rageTxt = rageTxt; $('hRageTxt').textContent = rageTxt; }
  const rOn = G.rageReady || G.rageT > 0;
  const rBurst = G.rageT > 0;
  if (hudCache.rOn !== rOn || hudCache.rBurst !== rBurst) {
    hudCache.rOn = rOn; hudCache.rBurst = rBurst;
    $('hRageBox').classList.toggle('ready', G.rageReady && !rBurst);
    $('hRageBox').classList.toggle('burst', rBurst);
    $('btnRage').disabled = !G.rageReady || rBurst;
  }

  // Boss 血条：场上有强敌时出现在底部，没有就整块收起来
  const boss = G.enemies.find((e) => e.tier === 2);
  if (hudCache.boss !== !!boss) { hudCache.boss = !!boss; $('hBoss').hidden = !boss; }
  if (boss) {
    $('hBossName').textContent = boss.n;
    $('hBossFill').style.width = (Math.max(0, boss.hp / boss.maxHp) * 100).toFixed(1) + '%';
  }
  const wkey = G.weapons.map((w) => w.def.id + w.lv + (w.evo ? 'E' : '')).join(',');
  if (hudCache.wkey !== wkey) {
    hudCache.wkey = wkey;
    // 超武的槽要一眼能认出来：金边 + 右上角「超」字角标。
    // 不标的话，玩家只会觉得「这把好像打得比别的疼」，根本不知道有机制。
    $('hWeapons').innerHTML = G.weapons.map((w) => `
      <div class="slot${w.evo ? ' evo' : ''}" data-info="1" title="${esc(w.def.n)} · ${esc(w.def.charName)}${w.evo ? ' · 超武「' + esc(w.evo.n) + '」' : ''}">
        <i style="${atlasStyle(charFrame(w.def.char), 30)}"></i>
        <b class="cdm"></b>
        ${w.evo ? '<em class="evb">超</em>' : ''}
        <span class="pips">${'<b class="on"></b>'.repeat(w.lv + 1)}${'<b></b>'.repeat(LV.max - w.lv)}</span>
      </div>`).join('');
    // 缓存遮罩节点：每帧 querySelector 会让这套 HUD 变成瓶颈
    hudCache.cdEls = [...$('hWeapons').children].map((el) => el.querySelector('.cdm'));
    hudCache.cdK = [];
  }
  // 冷却：一层从上往下收的暗色遮罩，收完就是这一发打出去的瞬间。
  // 只在变化超过 3% 时写 style —— 六个槽每帧无条件写会触发样式重算。
  if (hudCache.cdEls) {
    for (let i = 0; i < hudCache.cdEls.length; i++) {
      const w = G.weapons[i];
      const el = hudCache.cdEls[i];
      if (!w || !el) continue;
      const k = w.cdMax > 0.02 ? Math.max(0, Math.min(1, (w.cdLeft || 0) / w.cdMax)) : 0;
      if (hudCache.cdK[i] == null || Math.abs(hudCache.cdK[i] - k) > 0.03) {
        hudCache.cdK[i] = k;
        el.style.transform = `scaleY(${k.toFixed(2)})`;
      }
    }
  }
  const pkey = G.passives.map((p) => p.id + p.stack).join(',') + '|' + G.wheels.map((w) => w.idx).join(',') + '|' + G.covs.map((c) => c.idx).join(',');
  if (hudCache.pkey !== pkey) {
    hudCache.pkey = pkey;
    // 造物/命轮/契物全部换成真实图标 + 层数角标。
    // 之前造物是几根绿条、命轮只有个「命」字 —— 玩家根本不知道自己捡了什么、
    // 叠了几层、到底加的是什么。点一下会弹出构筑详情（含每条效果的原文）。
    const slot = (frameIdx, cls, title, badge) => `
      <div class="slot ${cls}" data-info="1" title="${esc(title)}">
        <i style="${atlasStyle(frameIdx, 26)}"></i>
        ${badge ? `<em class="stk">${badge}</em>` : ''}
      </div>`;
    const ps = G.passives.map((p) => {
      const fx = CREATION_FX[p.fx];
      return slot(META.frames['k:' + p.id], 'p', `${p.n} ×${p.stack} · ${fx ? fx.txt : '通用强化'}`, p.stack > 1 ? p.stack : '');
    }).join('');
    const ws = G.wheels.map((w) => {
      const fx = WHEEL_FX.find((x) => x.key === w.key);
      return slot(META.frames['w:' + w.id], 'w', `${w.n} · ${fx ? fx.txt : ''}`, '');
    }).join('');
    const cs = G.covs.map((c) => {
      const fx = COVENANT_FX.find((x) => x.key === c.key);
      return slot(META.frames['v:' + c.id], 'c', `${c.n} · ${fx ? fx.txt : ''}`, '');
    }).join('');
    $('hPassives').innerHTML = ws + cs + ps;
  }

  // ---- 道具栏：只在内容变化时重建（点一下用掉一件，key 就变了）
  const ikey = G.items.map((i) => i.id).join(',');
  if (hudCache.ikey !== ikey) {
    hudCache.ikey = ikey;
    const box = $('hItems');
    if (box) {
      box.hidden = G.items.length === 0;
      box.innerHTML = G.items.map((it) => `
        <button class="itm" data-use="${esc(it.id)}" title="${esc(it.n)} · ${esc(it.txt)}" style="--c:${it.color}">
          <b>${it.icon}</b><span>${esc(it.n)}</span>
        </button>`).join('');
    }
  }

  // ---- 机制角标：王权层数 / 封印道数 / 守夜的燃灯状态都在这里
  const mm = G.char ? MECHS[G.char.id] : null;
  let mkey = '';
  if (mm) {
    if (mm.id === 'royalty') mkey = `王权 ${G.mech.stacks}/25`;
    else if (mm.id === 'seal') mkey = `封印 ${G.mech.stacks}/5`;
    else if (mm.id === 'paradox') mkey = '悖论';
    else if (mm.id === 'nightwatch') mkey = G.mech.low ? '守夜 · 燃灯' : '守夜';
  }
  if (hudCache.mkey !== mkey) {
    hudCache.mkey = mkey;
    const el = $('hMech');
    if (el) {
      el.hidden = !mkey;
      el.textContent = mkey;
      el.style.color = mm ? mm.color : '';
      el.style.borderColor = mm ? mm.color + '55' : '';
      el.classList.toggle('hot', mm && mm.id === 'nightwatch' && G.mech.low);
    }
  }
}

function charFrame(id) {
  const c = CHARS.find((x) => x.id === String(id));
  return c ? c.img : null;
}

// ---------------------------------------------------------------- 升级三选一
const KIND_LABEL = {
  wnew: '新技能', wlv: '技能升级', wswap: '替换技能', creation: '造物', wheel: '命轮', cov: '契物',
  growth: '极限淬炼', item: '一次性道具',
};

export function showUpgrade(choices) {
  const ov = $('ovUp');
  ov.hidden = false;
  const list = choices || [];
  // 逐张兜底：以前是一整段 map，任何一张卡取图/取文案出错就会让整块 innerHTML
  // 赋值失败，面板只剩标题和提示，既没有卡也点不动（只能刷新页面）。
  const html = [];
  for (let i = 0; i < list.length; i++) {
    try { html.push(upgradeCard(list[i], i)); }
    catch (e) { console.warn('[升级卡] 渲染失败，已跳过', list[i], e); }
  }
  $('upList').innerHTML = html.length
    ? html.join('')
    : '<p class="up-none">技能都满级了、造物也叠满了，这一轮确实没什么可给的</p>';
  // 一张卡都没有的时候还写「键盘 1 / 2 / 3」，玩家会以为是自己没看清
  $('upHint').textContent = html.length
    ? '选一个带走 · 键盘 1 / 2 / 3 · 0 跳过'
    : '按 0 或点下面直接继续';

  $('upList').onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    choose(Number(b.dataset.i));
  };
  $('btnSkipUp').onclick = () => choose(-1);
}

// 一张卡的文案拼装。抽出来是为了单独 try/catch —— 见 showUpgrade 里的说明。
function upgradeCard(o, i) {
  if (o.kind === 'wnew' || o.kind === 'wlv' || o.kind === 'wswap') {
    const isSwap = o.kind === 'wswap';
    const d = o.kind === 'wlv' ? o.w.def : o.def;
    const lv = o.kind === 'wlv' ? o.w.lv + 1 : 0;
    const proto = PROTOS[d.proto];
    const title = o.kind === 'wlv' ? `${d.n} → ${lv + 1} 级` : `${d.n}（${d.charName}）`;
    const desc = proto ? proto.desc(lv) : '';
    // 替换卡是两段式的：点开之后自己指定「换掉哪一把」，
    // 以前固定换等级最低的那把，想把满级但不合流派的技能换掉根本没门路
    const foot = isSwap
      ? '点开后可自选要换掉的技能（新技能从 1 级起）'
      : (d.text || '');
    return card(i, isSwap ? 'wswap' : o.kind === 'wlv' ? 'wlv' : 'wnew', title, desc, foot, atlasStyle(charFrame(d.char), 46), KIND_LABEL[o.kind]);
  }
  if (o.kind === 'creation') {
    const fx = CREATION_FX[o.c.fx];
    const desc = fx ? fx.txt : '通用强化';
    const have = G.passives.find((p) => p.id === String(o.c.id));
    return card(i, 'creation', o.c.n, desc, have ? `已叠 ${have.stack} 层 · 可叠 3 层` : '可叠 3 层', atlasStyle(META.frames['k:' + o.c.id], 46), KIND_LABEL[o.kind]);
  }
  if (o.kind === 'wheel') {
    const fx = WHEEL_FX[o.i % WHEEL_FX.length];
    return card(i, 'wheel', o.w.n, fx ? fx.txt : '命轮质变', '命轮 · 质变', atlasStyle(META.frames['w:' + o.w.id], 46), KIND_LABEL[o.kind]);
  }
  // 后期两条线：淬炼用文字图标（没有对应的图集格位），道具同样走 emoji 图标，
  // 这样不必为几张卡再占图集格位，也不会和已有的造物图标撞脸。
  if (o.kind === 'growth') {
    const n = (G.growth || []).filter((g) => g.id === o.g.id).length;
    return card(i, 'growth', o.g.n, o.g.txt, n ? `已淬炼 ${n} 次 · 可无限叠加` : '永久成长 · 可无限叠加',
      iconStyle('#ffd479'), KIND_LABEL[o.kind], o.g.icon);
  }
  if (o.kind === 'item') {
    return card(i, 'item', o.it.n, o.it.txt, `一次性 · 持有 ${G.items.length}/3`, iconStyle(o.it.color), KIND_LABEL[o.kind], o.it.icon);
  }
  const cfx = COVENANT_FX[o.i % COVENANT_FX.length];
  return card(i, 'cov', o.c.n, cfx ? cfx.txt : '契物强化', '契物 · 唯一', atlasStyle(META.frames['v:' + o.c.id], 46), KIND_LABEL[o.kind]);
}

// 文字图标：和立绘同尺寸的方块，中间放一个符号。宽度/高度必须在这里给全 ——
// 立绘是用 background-size 撑出来的，符号没有内在尺寸，不给就是一块 0px 的空格。
function iconStyle(color) {
  return [
    'display:flex;align-items:center;justify-content:center;',
    `color:${color};font-size:22px;line-height:1;width:46px;height:46px;`,
    `background:radial-gradient(circle at 50% 40%, ${color}33 0%, ${color}0d 62%, transparent 100%);`,
    `box-shadow:inset 0 0 0 1px ${color}55;border-radius:12px;`,
  ].join('');
}

function card(i, tier, title, sub, foot, imgStyle, tag, glyph) {
  return `
    <button class="up ${tier}" data-i="${i}">
      <span class="up-tag">${tag}</span>
      <span class="up-img" style="${imgStyle}">${glyph || ''}</span>
      <span class="up-txt">
        <b>${esc(title)}</b>
        <em>${esc(sub)}</em>
        ${foot ? `<u>${esc(foot)}</u>` : ''}
      </span>
      <span class="up-key">${i + 1}</span>
    </button>`;
}

export function choose(i) {
  // i < 0 是「跳过」：不拿任何东西，但同样要消耗掉这次待选次数
  const o = i >= 0 ? G.choices[i] : null;
  if (i >= 0 && !o) return;
  // 替换卡要分两步：先让玩家点「哪一把技能让位」，再真正换上去
  if (o && o.kind === 'wswap') { openSwapPicker(o); return; }
  $('ovUp').hidden = true;
  if (o) applyChoice(o); else skipChoice();
  afterChoice();
}

// 一次选择之后的收尾：要么回到战斗（刷新 HUD），要么接着弹下一屏三选一
function afterChoice() {
  $('ovUp').hidden = true;
  if (G.phase === 'run') hudCache = {};
  else if (G.phase === 'levelup') showUpgrade(G.choices);
}

// ---------------------------------------------------------------- 替换目标选择
// 技能栏满了之后抽到的「替换」卡，点开先弹这一屏：六个技能槽全列出来，
// 显示等级与是否已升格成超武，玩家自己决定让谁下场。
let pendingSwap = null;

function openSwapPicker(o) {
  const ov = $('ovSwap');
  // 面板缺失时不能把玩家卡住：直接按「换等级最低的那把」兜底
  if (!ov) {
    applyChoice({ kind: 'wswap', def: o.def, dropId: null });
    afterChoice();
    return;
  }
  pendingSwap = o;
  $('ovUp').hidden = true;
  $('swapTitle').textContent = `用「${o.def.n}」替换掉哪一个？`;
  $('swapList').innerHTML = G.weapons.map((w, i) => `
    <button class="sw${w.evo ? ' evo' : ''}" data-i="${i}">
      <i style="${atlasStyle(charFrame(w.def.char), 32)}"></i>
      <b>${esc(w.def.n)}</b>
      <em>Lv.${w.lv + 1}</em>
      ${w.evo ? `<u class="evo-tag">超武 · ${esc(w.evo.n)}</u>` : ''}
    </button>`).join('');
  $('swapList').onclick = (e) => {
    const b = e.target.closest('button[data-i]');
    if (!b) return;
    confirmSwap(Number(b.dataset.i));
  };
  $('btnSwapCancel').onclick = closeSwap;
  ov.hidden = false;
}

function confirmSwap(idx) {
  const o = pendingSwap;
  const target = G.weapons[idx];
  if (!o || !target) return;
  pendingSwap = null;
  $('ovSwap').hidden = true;
  applyChoice({ kind: 'wswap', def: o.def, dropId: target.def.id });
  afterChoice();
}

// 键盘 1~6 在替换面板里直接选槽位
export function pickSwap(i) {
  const ov = $('ovSwap');
  if (ov && !ov.hidden) confirmSwap(i);
}

// 「算了」/ Esc：关掉替换面板，回到三选一重新挑
export function closeSwap() {
  const ov = $('ovSwap');
  if (!ov || ov.hidden) return false;
  ov.hidden = true;
  pendingSwap = null;
  showUpgrade(G.choices);
  return true;
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
  // 「放弃这局」是从暂停面板点出来的，不关掉它，结算卡就和暂停卡叠在一起；
  // 升级面板同理（极端情况下两者会同时在栈上）。
  $('ovPause').hidden = true;
  $('ovUp').hidden = true;
  ov.hidden = false;
  // 解锁记账：每局结束都要记（输掉的局也累计强敌数），再比对这一次刚好
  // 放出了谁。必须在渲染文案之前做，否则「新解锁」要等下一局才显示。
  const beforeP = svProgress();
  const afterP = recordRun(sm);
  const fresh = unlockedByRun(beforeP, afterP);
  $('endTitle').textContent = sm.win ? '撑到潮水退去' : sm.gaveUp ? '主动收兵' : '倒在了半路';
  const best0 = Number(localStorage.getItem('zjtt:survivors:best') || 0);
  // 不足 1 分钟别写成「第 0 分 04 秒」——刚开局就放弃/阵亡时特别刺眼
  const clock = sm.t >= 60
    ? `${Math.floor(sm.t / 60)} 分 ${String(Math.floor(sm.t % 60)).padStart(2, '0')} 秒`
    : `${Math.max(1, Math.floor(sm.t))} 秒`;
  // 主动收兵不是阵亡：文案要写清楚「战果照常算」，否则玩家会以为这一局白打了
  const sub = sm.win
    ? `15 分钟打满，${sm.char} 活着走了出来`
    : sm.gaveUp
      ? `${sm.char} 在第 ${clock}时主动收兵，战果照常结算`
      : `${sm.char} 在第 ${clock}时力竭`;
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
    <div class="es"><b>${cred > 0 ? '+' + cred : '—'}</b><span>银芯</span></div>`;
  // 得 0 银芯时别只写「+0」——那句话看不出是「打得太少」还是「奖励没发」。
  // 已入账的一次性说清楚，没够档的直接告诉还差多少。
  $('endTier').textContent = cred > 0
    ? `${cred} 银芯已存入账户${nxt ? ` · 再拿 ${(nxt[0] - sm.score).toLocaleString()} 分可换 ${nxt[1]} 银芯` : ' · 已达最高档'}`
    : nxt
      ? `本局还差 ${(nxt[0] - sm.score).toLocaleString()} 分够到 ${nxt[1]} 银芯（最低档 ${nxt[0].toLocaleString()} 分）`
      : '已达最高档';
  renderDmgBreakdown(sm);
  renderUnlockBox(fresh);
  if (cred > 0) grantCredits(cred);
}

// 结算里的「解锁」区块：平时不占位置（空着就整块收起来），
// 刚好放出神秘唤醒体时才出现 —— 这是长线玩家唯一能立刻拿到的反馈。
function renderUnlockBox(ids) {
  const box = $('endUnlock');
  if (!box) return;
  if (!ids || !ids.length) { box.innerHTML = ''; box.hidden = true; return; }
  box.hidden = false;
  const rows = ids.map((id) => {
    const c = CHARS.find((x) => String(x.id) === String(id));
    if (!c) return '';
    const m = MECHS[c.id];
    return `<div class="ul-row">
      <i style="${atlasStyle(c.img, 40)}"></i>
      <div><b>${esc(c.n)}</b><span>${esc(m ? m.text : c.talentText || '')}</span></div>
    </div>`;
  }).join('');
  box.innerHTML = `<div class="ul-box"><h3>新的唤醒体已解锁</h3>${rows}
    <p class="ul-tip">回到选人面板即可选用 · 他们的技能从此会出现在抽取池里</p></div>`;
}

// ---------------------------------------------------------------- 结算伤害明细
// 「每个技能打了多少」是这局唯一能复盘的东西：谁在划水、谁是真主力。
// 条形按「本局最高那把」归一化，不是按占比 —— 占比会让主力条永远接近满格，
// 看不出第二名和第六名的差距。
function renderDmgBreakdown(sm) {
  const box = $('endDmg');
  if (!box) return;
  const ws = sm.weapons || [];
  const max = Math.max(1, ...ws.map((w) => w.dmg), sm.rageDmg || 0);
  const total = sm.totalDmg || 0;
  // 小于 0.5% 直接四舍五入会显示成 0%，看上去像「一点伤害都没打」，
  // 这种情况统一写 <1%，读者才不会误判成辅助技能。
  const pct = (v) => {
    if (total <= 0 || v <= 0) return '0';
    const p = (v / total) * 100;
    return p < 1 ? '<1' : String(Math.round(p));
  };
  const row = (imgHtml, name, sub, dmg, color) => `
    <div class="dmg-row">
      ${imgHtml}
      <div class="dmg-meta"><b>${esc(name)}</b><em>${esc(sub)}</em></div>
      <div class="dmg-bar"><u style="width:${Math.max(2, (dmg / max) * 100).toFixed(1)}%;background:${color}"></u></div>
      <span class="dmg-num">${dmg > 0 ? dmg.toLocaleString() : '—'}<em>${dmg > 0 ? pct(dmg) + '%' : '辅助'}</em></span>
    </div>`;
  const rows = ws.map((w) => row(
    `<i style="${atlasStyle(charFrame(w.charId), 24)}"></i>`,
    w.n + (w.evo ? ' · 超武' : ''), `Lv.${w.lv} · ${w.char}`, w.dmg, w.color,
  )).join('');
  const rageRow = sm.rageDmg > 0
    ? row('<i class="dmg-ico">狂</i>', '狂气爆发', `${sm.rageUsed} 次`, sm.rageDmg, '#ff9350')
    : '';
  box.innerHTML = `
    <h3 class="if-h">技能伤害 · 合计 ${total.toLocaleString()}</h3>
    ${rows || '<p class="dim">这局没有打出伤害</p>'}
    ${rageRow}
    <p class="dmg-sub">共承受 ${(sm.taken || 0).toLocaleString()} 点伤害</p>`;
}

// 银芯走与「合成大杜勒」「战报侦探」同一个钱包键（zjtt:credits）
function grantCredits(n) {
  try {
    const cur = Number(localStorage.getItem('zjtt:credits') || 0) || 0;
    localStorage.setItem('zjtt:credits', String(cur + n));
    document.dispatchEvent(new CustomEvent('zjtt:credits', { detail: { add: n } }));
  } catch { /* 隐私模式 */ }
}

