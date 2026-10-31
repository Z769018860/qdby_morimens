import { mulberry32 } from './rng.js';

export const DEF_K = 150;
export const MAX_ROUNDS = 30;
// 通关回合上限：普通关 18 回合、Boss 关 22 回合（周 Boss 另有自己的 12 回合赛制）。
// 打不完就判「超时」= 本次不通关，四奶互相吊着磨的打法因此不成立。
export const ROUND_LIMIT = { normal: 18, boss: 22 };
export const roundLimitFor = (info = {}) => (info.boss || info.reward ? ROUND_LIMIT.boss : ROUND_LIMIT.normal);
// 前排几个位置能吃单体攻击：站位 1–2 是前排，3–4 是后排
export const FRONT_SLOTS = 2;
// 全局伤害系数：把「磨」压成「决」——两边都打得动，战斗才会在十几回合内见分晓，
// 通关的回合上限才有意义（以前一场常拖到 25–30 回合）。
const DMG_SCALE = 1.6;
// Imported enemy/skill data may contain missing or non-finite values. Never let them poison combat state.
const num = (x, fallback = 0) => { const v = Number(x); return Number.isFinite(v) ? v : fallback; };
const positive = (x, fallback = 1) => Math.max(1, num(x, fallback));
const WEIGHT = { WARDEN: 3, ASSAULT: 1.6, CHORUS: 1 };

// A unit is a plain object so the whole simulation is serialisable and
// deterministic given (allies, enemies, seed, strategy).
export function makeUnit(def, side, idx) {
  return {
    uid: `${side}${idx}`, side, idx, slug: def.slug || null,
    name: def.name, img: def.img, type: def.type || 'ASSAULT', realm: def.realm,
    maxHp: positive(def.hp), hp: Math.max(1, Math.min(positive(def.hp), num(def.hpNow, positive(def.hp)))), atk: Math.max(0, num(def.atk)), def: Math.max(0, num(def.def)),
    critRate: num(def.critRate, 0), critDmg: num(def.critDmg, 50), amp: num(def.amp, 0),
    aliGain: num(def.aliGain, 0), keyGain: num(def.keyGain, 0),
    healBonus: num(def.healBonus, 0), shieldBonus: num(def.shieldBonus, 0), steal: num(def.steal, 0),
    surviveChance: num(def.surviveChance, 0), survived: false,
    openAli: num(def.openAli, 0), openKey: num(def.openKey, 0),
    firstBoost: num(def.firstBoost, 0),
    kit: def.kit || null, extra: def.extra || null, pattern: def.pattern || null, opening: def.opening || [], boss: !!def.boss, reward: !!def.reward, affix: def.affix || null,
    mid: def.mid || null, trait: def.trait || null,
    ali: num(def.openAli, 0), key: num(def.openKey, 0), shield: 0, buffs: [], dots: [], cd: {}, st: {}, sig: '',
    roused: false, patIdx: 0, enrage: 0, alive: true, acted: 0,
    taunt: 0, reflect: null, stunned: 0, echo: 0, delayed: [],     // 专属技能用到的状态（core/extra.js）
  };
}

const sumBuff = (u, stat) => u.buffs.reduce((s, b) => (b.stat === stat ? s + num(b.v) : s), 0);
const WEAK_MULT = 0.75, FRAGILE_MULT = 0.75, POISON_CAP = 40, COUNTER_CAP = 8;

// status icons shown by the UI: [{ id, n }] — derived from buffs, dots and the status table
export function statusList(u) {
  const out = [];
  const atk = sumBuff(u, 'atk');
  if (atk > 0) out.push({ id: 'str', n: Math.round(atk) });
  if (atk < 0) out.push({ id: 'strdown', n: Math.round(-atk) });
  if (sumBuff(u, 'vuln') > 0) out.push({ id: 'vulnerable', n: Math.round(sumBuff(u, 'vuln')) });
  if (u.dots.length) out.push({ id: 'bleed', n: u.dots.length });
  for (const k of ['poison', 'counter', 'barrier', 'fortress', 'weakness', 'fragile', 'sealed']) if (u.st[k]) out.push({ id: k, n: u.st[k].n || 1 });
  return out;
}
const alive = (arr) => arr.filter((u) => u.alive);
const hpPct = (u) => num(u.hp) / positive(u.maxHp);

// 能越过前排直取后排的单位：我方合唱 / 突击（远程与突进），敌方 Boss。
// 其余（我方守护、普通怪）都是近战，前排还有人时只能打前排——这就是「前后排」的实际作用。
export const canReachBack = (u) => (u.side === 'a' ? u.type !== 'WARDEN' : u.boss);

/**
 * 单体这一下能选中谁。站位是**固定槽位**（`u.idx`），不随阵亡压缩：
 * 前排两个位置都空了，后排才会被点名。
 * （早先按「存活数组的前两个」判断，前排死一个就把后排顶上来，
 *  普通小怪于是能越过还活着的前排直取后排——那是个 bug。）
 */
export function frontLine(unit, foes) {
  const live = foes.filter((f) => f.alive !== false);
  if (!live.length) return live;
  const front = live.filter((f) => (f.idx ?? 0) < FRONT_SLOTS);
  if (!front.length) return live;            // 前排两个位置全灭 → 后排才暴露
  return canReachBack(unit) ? live : front;
}

export function simulate({ allies, enemies, seed = 1, strategy = {}, maxRounds = MAX_ROUNDS }) {
  const rng = mulberry32(seed);
  const strat = { defend: 0.4, target: 'low', ult: 'first', ...strategy };
  // 大招策略：first = 优先开大（默认，能开就开）；sync = 攒大招一起开大；
  // order = 按玩家排好的顺序开大（前一位还没开、而且它攒满了，就等它先开）。
  const ultMode = strat.ult || 'first';
  const ultOrder = Array.isArray(strat.ultOrder) ? strat.ultOrder : [];
  let burstRound = 0;     // sync：全员到位后的那一回合，之后到位的人这回合也一起放
  const A = allies.map((d, i) => makeUnit(d, 'a', i));
  const E = enemies.map((d, i) => makeUnit(d, 'e', i));
  const ev = [];
  const stats = {};
  for (const u of [...A, ...E]) stats[u.uid] = { dmg: 0, heal: 0, taken: 0 };
  const push = (e) => ev.push(e);
  let round = 0;
  let kills = 0;

  const foesOf = (u) => alive(u.side === 'a' ? E : A);
  const friendsOf = (u) => alive(u.side === 'a' ? A : E);

  // 单体可选目标：按固定槽位切出「够得着」的那一排
  const reachable = (u) => frontLine(u, foesOf(u));

  function chooseFoe(u, mode) {
    const foes = reachable(u);
    if (!foes.length) return null;
    if (!u.kit) { const tn = foes.find((f) => f.taunt > 0); if (tn) return tn; }      // 嘲讽：敌人的单体攻击只会打它
    if (u.kit) {
      if (mode === 'foeLow') return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
      if (mode === 'foeRand') return foes[Math.floor(rng() * foes.length)];
      if (strat.target === 'first') return foes[0];
      if (strat.target === 'atk') return foes.reduce((a, b) => (b.atk > a.atk ? b : a));
      return foes.reduce((a, b) => (b.hp < a.hp ? b : a));
    }
    if (mode === 'foeRand') return foes[Math.floor(rng() * foes.length)];
    const w = foes.map((f) => WEIGHT[f.type] || 1);
    let r = rng() * w.reduce((s, x) => s + x, 0);
    for (let i = 0; i < foes.length; i++) { r -= w[i]; if (r <= 0) return foes[i]; }
    return foes[foes.length - 1];
  }

  function targets(u, to) {
    switch (to) {
      case 'self': return [u];
      case 'allies': return friendsOf(u);
      case 'ally': { const f = friendsOf(u); return f.length ? [f.reduce((a, b) => (hpPct(b) < hpPct(a) ? b : a))] : []; }
      case 'foes': return foesOf(u);
      case 'foeLow': case 'foeRand': case 'foe': { const t = chooseFoe(u, to); return t ? [t] : []; }
      default: return [];
    }
  }

  /** 斩杀牌的目标：阈值以下的里头挑血最多的；一个都没有，才按玩家的目标规则来 */
  function execTargets(u, e) {
    const to = e.to || 'foe';
    if (to !== 'foe') return targets(u, to);
    const live = reachable(u).filter((t) => t.alive);
    const thr = num(e.thr, 0.3);
    const weak = live.filter((t) => hpPct(t) < thr);
    return weak.length ? [weak.reduce((a, b) => (b.hp > a.hp ? b : a))] : targets(u, 'foe');
  }
  /** 按比例扣血的牌：单体时挑血条最厚的那个（首领虽然会被封顶，但仍是最大收益） */
  function fatTargets(u, e) {
    const to = e.to || 'foe';
    if (to !== 'foe') return targets(u, to);
    const live = reachable(u).filter((t) => t.alive);
    return live.length ? [live.reduce((a, b) => (b.maxHp > a.maxHp ? b : a))] : targets(u, 'foe');
  }

  function gainGauge(u, k, v) {
    if (!u.alive) return;
    const mult = 1 + (k === 'ali' ? u.aliGain : u.keyGain) / 100;
    u[k] = Math.max(0, Math.min(100, num(u[k]) + num(v) * num(mult, 1)));
  }

  function damage(src, tgt, mult, ctx) {
    if (!tgt.alive) return 0;
    const crit = rng() < Math.min(1, (src.critRate + sumBuff(src, 'crit')) / 100);
    let raw = src.atk * (1 + sumBuff(src, 'atk') / 100) * num(mult, 1);
    if (src.st.weakness) raw *= WEAK_MULT;
    raw *= 1 + (src.amp + sumBuff(src, 'amp')) / 100;
    if (src.firstBoost && src.acted <= 1) raw *= 1 + src.firstBoost / 100;
    if (crit) raw *= 1 + src.critDmg / 100;
    if (src.enrage) raw *= 1 + src.enrage;
    // 特性特攻：按目标 id 匹配（例：萨摩不耶的「一哥」对校猫 catboss 额外 +50%）
    const vs = src.trait && src.trait.vs;
    if (vs && tgt.mid && vs[tgt.mid]) raw *= 1 + vs[tgt.mid];
    raw *= 0.95 + rng() * 0.1;
    raw *= src.side === 'a' ? DMG_SCALE : 1;
    const d = Math.max(0, tgt.def * (1 + sumBuff(tgt, 'def') / 100));
    let dmg = raw * (1 - d / (d + DEF_K)) * (1 + sumBuff(tgt, 'vuln') / 100);
    if (tgt.st.fortress) dmg *= 1 - Math.min(50, tgt.st.fortress.n) / 100;
    dmg = Math.max(1, Math.round(num(dmg, 1)));
    return applyDamage(src, tgt, dmg, crit, ctx);
  }

  function applyDamage(src, tgt, dmg, crit, ctx, kind = 'dmg', extra) {
    dmg = Math.max(0, Math.round(num(dmg)));
    tgt.hp = Math.max(0, Math.min(tgt.maxHp, num(tgt.hp, tgt.maxHp)));
    tgt.shield = Math.max(0, num(tgt.shield));
    if (kind === 'dmg' && tgt.st.barrier && tgt.st.barrier.n > 0) {
      if (--tgt.st.barrier.n <= 0) delete tgt.st.barrier;
      push({ k: 'dmg', by: src.uid, who: tgt.uid, amt: 0, absorbed: 0, crit: false, hp: tgt.hp, shield: tgt.shield, blocked: true });
      return 0;
    }
    let absorbed = 0;
    if (tgt.shield > 0) { absorbed = Math.min(tgt.shield, dmg); tgt.shield -= absorbed; dmg -= absorbed; }
    let saved = false;
    if (dmg >= tgt.hp && tgt.surviveChance && !tgt.survived && rng() < tgt.surviveChance) {
      tgt.survived = true; saved = true; dmg = tgt.hp - 1;
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    push({ k: kind, by: src.uid, who: tgt.uid, amt: dmg, absorbed, crit, hp: tgt.hp, shield: tgt.shield, saved, ...extra });
    if (ctx) ctx.dealt += dmg;
    if (src.side !== tgt.side || kind !== 'dmg') { if (stats[src.uid]) stats[src.uid].dmg += dmg; }
    if (stats[tgt.uid]) stats[tgt.uid].taken += dmg;
    if (src.side !== tgt.side) {
      gainGauge(tgt, 'ali', 9);
      if (src.steal && dmg > 0) heal(src, src, dmg * src.steal / 100, true);
    }
    if (tgt.hp <= 0) {
      tgt.alive = false;
      if (tgt.side === 'e') kills++;
      push({ k: 'die', who: tgt.uid });
    } else if (kind === 'dmg' && src.side !== tgt.side && tgt.st.counter && src.alive) {
      const c = tgt.st.counter;
      applyDamage(tgt, src, Math.max(1, Math.round(c.per * c.n)), false, null, 'counter');
    }
    // 反射：把受到伤害的一部分原样弹回去（只对直接伤害生效，反射出去的不再反射）
    if (kind === 'dmg' && tgt.reflect && tgt.alive && src.side !== tgt.side && src.alive && dmg > 0) {
      applyDamage(tgt, src, Math.max(1, Math.round(dmg * tgt.reflect.pct / 100)), false, null, 'counter');
    }
    return dmg;
  }

  function addStatus(src, t, s, n, dur) {
    if (!t.alive) return;
    n = Math.max(0, num(n, 1)); dur = positive(dur);
    const cur = t.st[s];
    switch (s) {
      case 'poison': t.st.poison = { n: Math.min(POISON_CAP, (cur?.n || 0) + n), per: Math.max(cur?.per || 0, src.atk * 0.1), dur: 99 }; break;
      case 'counter': t.st.counter = { n: Math.min(COUNTER_CAP, (cur?.n || 0) + n), per: Math.max(cur?.per || 0, src.atk * 0.22), dur }; break;
      case 'barrier': t.st.barrier = { n: Math.min(3, (cur?.n || 0) + n), dur }; break;
      case 'fortress': t.st.fortress = { n: Math.min(50, Math.max(cur?.n || 0, n)), dur }; break;
      default: t.st[s] = { n: 1, dur: Math.max(cur?.dur || 0, dur) };
    }
    push({ k: 'status', who: t.uid, s });
  }
  function emitSt(u) {
    const list = statusList(u);
    const sig = list.map((x) => `${x.id}${x.n}`).join(',');
    if (sig !== u.sig) { u.sig = sig; push({ k: 'st', who: u.uid, list }); }
  }
  const emitAll = () => { for (const u of [...A, ...E]) if (u.alive || u.sig) emitSt(u); };

  function heal(src, tgt, amt, silent) {
    if (!tgt.alive) return;
    amt = Math.max(0, Math.round(num(amt)));
    const real = Math.max(0, Math.min(amt, tgt.maxHp - tgt.hp));
    tgt.hp += real;
    if (stats[src.uid]) stats[src.uid].heal += real;
    if (!silent || real > 0) push({ k: 'heal', by: src.uid, who: tgt.uid, amt: real, hp: tgt.hp });
  }

  function run(u, effects) {
    const ctx = { dealt: 0 };
    for (const e of effects) {
      if (!A.some((x) => x.alive) || !E.some((x) => x.alive)) break;
      switch (e.t) {
        case 'dmg': {
          const tl = targets(u, e.to);
          for (let h = 0; h < (e.hits || 1); h++) {
            const live = e.to === 'foes' ? tl.filter((t) => t.alive) : e.to === 'foeRand' ? targets(u, 'foeRand') : tl.filter((t) => t.alive);
            const list = live.length ? live : (e.to === 'foe' ? targets(u, 'foe') : []);
            for (const t of list) damage(u, t, e.m, ctx);
          }
          break;
        }
        case 'heal':
          for (const t of targets(u, e.to)) heal(u, t, u.atk * (1 + sumBuff(u, 'atk') / 100) * e.m * (1 + u.healBonus / 100));
          break;
        case 'shield':
          for (const t of targets(u, e.to)) {
            const amt = Math.max(0, Math.round(num((u.def * 1.2 + u.maxHp * 0.08) * num(e.m) * (1 + u.shieldBonus / 100) * (t.st.fragile ? FRAGILE_MULT : 1))));
            t.shield += amt;
            push({ k: 'shield', who: t.uid, amt, shield: t.shield });
          }
          break;
        case 'buff': case 'debuff':
          for (const t of targets(u, e.to)) {
            const v = e.t === 'debuff' ? (e.stat === 'vuln' ? num(e.v) : -num(e.v)) : num(e.v);
            t.buffs.push({ stat: e.stat, v: num(v), dur: positive(e.dur) });
            push({ k: 'buff', who: t.uid, stat: e.stat, v, dur: e.dur });
          }
          break;
        case 'dot':
          for (const t of targets(u, e.to)) { t.dots.push({ dmg: Math.max(0, num(u.atk * num(e.m))), dur: positive(e.dur), by: u.uid }); push({ k: 'dot', who: t.uid }); }
          break;
        case 'gauge':
          for (const t of targets(u, e.to)) { gainGauge(t, e.k === 'aliemus' ? 'ali' : 'key', e.v); push({ k: 'gauge', who: t.uid, ali: t.ali, key: t.key }); }
          break;
        case 'status':
          for (const t of targets(u, e.to)) addStatus(u, t, e.s, e.n, e.dur);
          break;
        case 'lifesteal':
          if (ctx.dealt) heal(u, u, ctx.dealt * e.v / 100, true);
          break;
        // ---- 专属技能（core/extra.js）用到的机制 ----
        case 'execute':    // 斩杀：目标血量低于 thr 时倍率翻倍
          // 打谁有讲究：优先挑「已经在阈值以下、而且血最多」的那一个，翻倍的部分才不浪费；
          // 一个都不在阈值以下时，才回到玩家选的目标规则。
          for (const t of execTargets(u, e)) if (t.alive) damage(u, t, hpPct(t) < num(e.thr, 0.3) ? e.m * 2 : e.m, ctx);
          break;
        case 'pctHp':      // 按目标最大生命的百分比直接扣血（首领封顶 = 自身攻击 × 8）
          // 比例伤害打「血条最厚」的最划算，所以单体时改挑最大生命，而不是血量最低的残兵
          for (const t of fatTargets(u, e)) {
            if (!t.alive) continue;
            let amt = t.maxHp * num(e.pct) / 100;
            if (t.boss || t.reward) amt = Math.min(amt, u.atk * 8);
            applyDamage(u, t, Math.max(1, Math.round(amt)), false, ctx);
          }
          break;
        case 'cleanse':    // 净化：清掉负面增减益、流血、中毒、虚弱、脆弱、封印
          for (const t of targets(u, e.to || 'allies')) {
            t.buffs = t.buffs.filter((b) => !(b.stat === 'vuln' ? b.v > 0 : b.v < 0));
            t.dots = [];
            for (const s of ['poison', 'weakness', 'fragile', 'sealed']) delete t.st[s];
            push({ k: 'status', who: t.uid, s: 'cleanse' });
          }
          break;
        case 'dispel':     // 驱散：清掉敌人的增益与狂暴
          for (const t of targets(u, e.to || 'foes')) { t.buffs = t.buffs.filter((b) => (b.stat === 'vuln' ? b.v > 0 : b.v < 0)); t.enrage = 0; delete t.st.fortress; delete t.st.barrier; }
          break;
        case 'revive': {   // 复苏：让第一个倒下的队友以 pct% 血量回到战场（每场每个技能最多一次）
          if (u.usedRevive) break;
          const dead = (u.side === 'a' ? A : E).find((x) => !x.alive);
          if (dead) {
            u.usedRevive = true;
            dead.alive = true; dead.hp = Math.max(1, Math.round(dead.maxHp * num(e.pct, 30) / 100)); dead.buffs = []; dead.dots = []; dead.st = {};
            push({ k: 'revive', who: dead.uid, hp: dead.hp });
          }
          break;
        }
        case 'taunt': for (const t of targets(u, e.to || 'self')) t.taunt = Math.max(t.taunt, positive(e.dur, 2)); break;
        case 'reflect': for (const t of targets(u, e.to || 'self')) t.reflect = { pct: num(e.pct, 30), dur: positive(e.dur, 2) }; break;
        case 'stun':       // 眩晕：敌人下一次行动被跳过（首领免疫）
          for (const t of targets(u, e.to || 'foe')) if (t.alive && !t.boss && !t.reward) { t.stunned = Math.max(t.stunned, positive(e.n, 1)); push({ k: 'status', who: t.uid, s: 'stun' }); }
          break;
        case 'chain': {    // 连锁：随机命中，每一跳倍率递增
          for (let h = 0; h < positive(e.hits, 3); h++) {
            const t = targets(u, 'foeRand')[0];
            if (!t) break;
            damage(u, t, e.m * (1 + num(e.grow, 0.2) * h), ctx);
          }
          break;
        }
        case 'splash': {   // 溅射：主目标全额，其余敌人吃 share 比例
          const main = targets(u, 'foe')[0];
          if (!main) break;
          damage(u, main, e.m, ctx);
          for (const t of foesOf(u)) if (t !== main && t.alive) damage(u, t, e.m * num(e.share, 0.5), ctx);
          break;
        }
        case 'echo': u.echo += positive(e.n, 1); break;     // 回响：之后 n 次普通行动的效果各重放一遍
        case 'cdReset': for (const t of targets(u, e.to || 'allies')) t.cd = {}; break;
        case 'shieldDmg': {   // 护盾转伤害：全队当前护盾总和 × m 打向单体（不消耗护盾）
          const sum = friendsOf(u).reduce((s, x) => s + num(x.shield), 0);
          const t = targets(u, 'foe')[0];
          if (t && sum > 0) applyDamage(u, t, Math.max(1, Math.round(sum * num(e.m, 1))), false, ctx);
          break;
        }
        case 'blood': {       // 献祭：自损 cost% 最大生命，换取更高倍率的全体伤害
          const loss = Math.min(u.hp - 1, Math.round(u.maxHp * num(e.cost, 15) / 100));
          if (loss > 0) { u.hp -= loss; push({ k: 'dot', by: u.uid, who: u.uid, amt: loss, absorbed: 0, crit: false, hp: u.hp, shield: u.shield }); }
          for (const t of targets(u, e.to || 'foes')) damage(u, t, e.m * (1 + num(e.cost, 15) / 50), ctx);
          break;
        }
        case 'missingHeal':   // 按已损失生命的百分比治疗
          for (const t of targets(u, e.to || 'allies')) heal(u, t, (t.maxHp - t.hp) * num(e.pct, 40) / 100 * (1 + u.healBonus / 100));
          break;
        case 'delay':         // 延迟爆发：rounds 回合后对全体敌人造成伤害
          u.delayed.push({ at: round + positive(e.rounds, 2), m: e.m });
          push({ k: 'status', who: u.uid, s: 'delay' });
          break;
        case 'lowHpBoost': {  // 越残血越痛：倍率随自身已损失生命线性上升（最多 ×3）
          const mul = e.m * (1 + 2 * (1 - hpPct(u)));
          for (const t of targets(u, e.to || 'foe')) damage(u, t, mul, ctx);
          break;
        }
        case 'poisonBurst':   // 引爆中毒：吃掉所有敌人身上的中毒层，一次性结算
          for (const t of foesOf(u)) {
            const p = t.st.poison;
            if (p && t.alive) { applyDamage(u, t, Math.max(1, Math.round(p.n * p.per * num(e.m, 1.5))), false, ctx); delete t.st.poison; }
          }
          break;
        case 'dotBurst':      // 引爆流血：把剩余的流血伤害一次性打出
          for (const t of foesOf(u)) {
            if (!t.alive || !t.dots.length) continue;
            const sum = t.dots.reduce((s, d) => s + num(d.dmg) * num(d.dur), 0);
            t.dots = [];
            applyDamage(u, t, Math.max(1, Math.round(sum * num(e.m, 1))), false, ctx);
          }
          break;
        case 'counterBurst': {   // 反击爆发：把全队身上的反击层数一次性打出去（没层数也有保底两下）
          const stacks = friendsOf(u).reduce((s, x) => s + num(x.st.counter?.n), 0);
          const hit = u.atk * num(e.m, 0.15) * Math.max(2, stacks);
          for (const t of foesOf(u)) if (t.alive) applyDamage(u, t, Math.max(1, Math.round(hit)), false, ctx);
          for (const x of friendsOf(u)) if (x.st.counter) delete x.st.counter;
          break;
        }
        case 'barrierHeal': {   // 屏障化疗：把屏障层数烧成治疗（每层 pct% 最大生命，至少按 1 层算）
          for (const x of friendsOf(u)) {
            if (!x.alive) continue;
            const b = Math.max(1, num(x.st.barrier?.n));
            if (x.st.barrier) delete x.st.barrier;
            heal(u, x, x.maxHp * num(e.pct, 6) / 100 * b);
          }
          break;
        }
        case 'gaugeBurn': {   // 超载：把攒着的共鸣 / 超共鸣能量全烧成伤害（保底按 60 点算）
          const pool = Math.max(60, num(u.ali) + num(u.key));
          u.ali = 0; u.key = 0; u.holdUlt = 0;
          for (const t of targets(u, e.to || 'foe')) if (t.alive) applyDamage(u, t, Math.max(1, Math.round(u.atk * pool * num(e.m, 0.02) / 100)), false, ctx);
          push({ k: 'gauge', who: u.uid, ali: 0, key: 0 });
          break;
        }
        case 'poisonHeal': {   // 以毒养身：敌人身上的毒层转成治疗
          let stacks = 0;
          for (const t of foesOf(u)) stacks += num(t.st.poison?.n);
          const amt = u.atk * num(e.pct, 4) / 100 * Math.max(1, stacks);
          for (const x of friendsOf(u)) if (x.alive) heal(u, x, amt);
          break;
        }
        case 'poisonShield': {   // 毒甲：敌人身上的毒层转成全队护盾
          let stacks = 0;
          for (const t of foesOf(u)) stacks += num(t.st.poison?.n);
          const amt = Math.max(1, Math.round(u.atk * num(e.pct, 3) / 100 * Math.max(1, stacks)));
          for (const x of friendsOf(u)) if (x.alive) { x.shield += amt; push({ k: 'shield', who: x.uid, amt, shield: x.shield }); }
          break;
        }
        case 'dotSpread': {   // 血流成河：把最重的那份流血传染给全体敌人
          let best = 0;
          for (const t of foesOf(u)) for (const d of t.dots) best = Math.max(best, num(d.dmg));
          const dur = positive(e.dur, 3);
          const dmg = Math.max(1, Math.round(Math.max(best * num(e.m, 1), u.atk * num(e.m, 1))));
          for (const t of foesOf(u)) {
            if (!t.alive) continue;
            t.dots.push({ dmg, dur, by: u.uid });
            push({ k: 'dot', who: t.uid });
          }
          break;
        }
        case 'extraTurn': {   // 追击号令：攻击最高的队友立刻额外行动一次
          if (u._xt) break;
          const ally = friendsOf(u).filter((x) => x !== u && x.kit).sort((x, y) => y.atk - x.atk)[0];
          if (ally) { u._xt = true; act(ally, true); u._xt = false; }
          break;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // 出牌评分：自动战斗的大脑
  // ------------------------------------------------------------------  // 71 位唤醒体的 kit 是「类型骨架 + 界域附魔 + 真实卡面关键字」拼出来的：同样是突破手，
  // 有人单体 1.8 倍、有人 4 段随机弹射、有人自带斩杀与溅射；守护里有人只会给盾、有人带嘲讽、
  // 有人带着反射。旧规则按类型写死「有 2 放 2、没有 2 放 1，血少才架势」，对这些差别一律
  // 装作看不见——满血的辅助照样套盾、满血的奶妈照样抬血、斩杀技砸在满血的怪身上。
  //
  // 现在给**每一张能用的牌**估一个收益：伤害 / 治疗 / 护盾 / 增减益 / 控制 / 能量统一折算成
  // 「等效血量」，再乘角色定位的权重，挑分最高的那张。空放（满血治疗、满盾再套盾、没有增益
  // 可驱散）自然得 0 分，会被伤害牌顶掉。全程不掷骰子：同样的种子、同样的战场，指令序列
  // 唯一确定（观战回放和「手动开大」的现场校验都靠这个确定性）。
  const atkOf = (u) => u.atk * (1 + sumBuff(u, 'atk') / 100);
  const critF = (u) => 1 + Math.min(1, Math.max(0, (u.critRate + sumBuff(u, 'crit')) / 100)) * Math.max(0, u.critDmg) / 100;
  /** 这一下大概能打多少（取暴击期望，不含 ±5% 随机浮动）。defMul 用来算破防牌的增量。 */
  function estHit(u, t, m, defMul = 1) {
    let v = atkOf(u) * num(m, 1) * (1 + (u.amp + sumBuff(u, 'amp')) / 100) * critF(u);
    if (u.st.weakness) v *= WEAK_MULT;
    if (u.firstBoost && u.acted <= 1) v *= 1 + u.firstBoost / 100;
    if (u.enrage) v *= 1 + u.enrage;
    const d = t.def * (1 + sumBuff(t, 'def') / 100) * defMul;
    v *= 1 - d / (d + DEF_K);
    v *= 1 + sumBuff(t, 'vuln') / 100;
    if (t.st.fortress) v *= 1 - Math.min(50, t.st.fortress.n) / 100;
    return Math.max(1, v) * (u.side === 'a' ? DMG_SCALE : 1);
  }
  const hitFoes = (u) => foesOf(u).reduce((s, f) => s + atkOf(f), 0);   // 对面一回合大概打出来的伤害
  // 我方一人一回合大概能打出来的伤害：所有「增益 / 破防 / 能量」都按这个折算成血量，量纲才和伤害牌一致
  const dpsOf = (t) => atkOf(t) * DMG_SCALE * critF(t) * 0.75;
  const allyDps = (u) => friendsOf(u).reduce((s, t) => s + dpsOf(t), 0);
  // 血线的「急迫度」：满血时治疗 / 护盾几乎不值钱（挂机是回合数限死 DPS 的战斗，抬满血不加输出），
  // 真掉到半血以下才开始值钱，快死的时候最值钱
  const urgency = (t) => { const p = hpPct(t); return p > 0.75 ? 0.3 : p > 0.5 ? 0.55 : 0.55 + 2.4 * (0.5 - p); };
  /** 敌人「下一步要干什么」：出牌要看着对面的意图，不能等挨完了才想起套盾 */
  const peekSkill = (f) => {
    const cycle = Array.isArray(f.pattern) && f.pattern.length ? f.pattern : [{ name: '普通攻击', effects: [{ t: 'dmg', m: 1, to: 'foe' }] }];
    return (f.patIdx < f.opening.length ? f.opening[f.patIdx] : cycle[(f.patIdx - f.opening.length) % cycle.length]) || cycle[0];
  };
  /** 下回合每个队友大概会吃到多少伤害（按敌人明示的下一步动作算；群攻算到每个人头上，单体算到前排） */
  let incRound = -1, incMap = null;
  function incomingMap(u) {
    if (incRound === round && incMap) return incMap;
    const out = new Map();
    for (const f of foesOf(u)) {
      const efx = Array.isArray(peekSkill(f)?.effects) ? peekSkill(f).effects : [];
      for (const e of efx) {
        if (e.t !== 'dmg') continue;
        const amt = atkOf(f) * num(e.m, 1) * Math.max(1, num(e.hits, 1));
        const list = e.to === 'foes' ? friendsOf(u) : frontLine(f, friendsOf(u));
        if (!list.length) continue;
        const each = e.to === 'foes' ? amt : amt / list.length;
        for (const t of list) out.set(t, (out.get(t) || 0) + each);
      }
    }
    incRound = round; incMap = out;
    return out;
  }
  /** 和 chooseFoe 同一套规则，但不掷骰子（评分只估期望，不能扰动随机数流） */
  const aimAt = (u, to) => {
    const F = reachable(u);
    if (!F.length) return null;
    if (to === 'first') return F[0];
    if (to === 'atk') return F.reduce((a, b) => (b.atk > a.atk ? b : a));
    if (to === 'foeLow') return F.reduce((a, b) => (b.hp < a.hp ? b : a));
    if (strat.target === 'first') return F[0];
    if (strat.target === 'atk') return F.reduce((a, b) => (b.atk > a.atk ? b : a));
    return F.reduce((a, b) => (b.hp < a.hp ? b : a));
  };
  const foeTargets = (u, to) => (to === 'foes' ? foesOf(u) : to === 'foeRand' ? reachable(u) : [aimAt(u, to)].filter(Boolean));
  const allyTargets = (u, to) => {
    const F = friendsOf(u);
    if (to === 'self') return [u];
    if (to === 'allies') return F;
    if (to === 'ally') return F.length ? [F.reduce((a, b) => (hpPct(b) < hpPct(a) ? b : a))] : [];
    return foeTargets(u, to);
  };
  /** 计入伤害，顺带给「打死一个」记一笔溢价：少一个人打我们 */
  function addDmg(u, acc, list, m, opt = {}) {
    const hits = Math.max(1, num(opt.hits, 1));
    const spread = hits > 1 ? hits * (1 + num(opt.grow, 0) * (hits - 1) / 2) : 1;
    for (const t of list) {
      if (!t || !t.alive) continue;
      const est = estHit(u, t, m) * spread;
      const pool = Math.max(1, num(t.hp) + num(t.shield));
      acc.o += Math.min(est, pool);
      if (est >= pool) acc.o += Math.min(num(t.maxHp) * 0.25, num(t.atk) * 1.2);
    }
  }
  /** 一个单位身上负面状态的「值多少钱」：净化 / 复苏这类牌靠它估价 */
  function debuffWorth(t) {
    let v = 0;
    const hit = atkOf(t) * 0.8;
    for (const b of t.buffs) {
      const bad = b.stat === 'vuln' ? b.v > 0 : b.v < 0;
      if (bad) v += hit * (Math.abs(b.v) / 100) * positive(b.dur, 1);
    }
    for (const d of t.dots) v += num(d.dmg) * Math.max(0, num(d.dur));
    const ps = t.st.poison;
    if (ps) v += num(ps.n) * num(ps.per) * 0.7;
    if (t.st.weakness) v += hit * 0.25 * 2;
    if (t.st.fragile) v += hit * 0.2 * 2;
    if (t.st.sealed) v += atkOf(t) * 0.3;
    return v;
  }

  /** 一张牌的效果列表折算成 { o: 输出, s: 保命 } 两个分值（单位都是等效血量） */
  function scoreEffect(u, e, acc) {
    const F = friendsOf(u);
    switch (e.t) {
      case 'dmg': {
        const list = e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe');
        addDmg(u, acc, list, num(e.m, 1), { hits: e.hits });
        break;
      }
      case 'heal': {
        const amt = atkOf(u) * num(e.m, 1) * (1 + u.healBonus / 100);
        const inc = incomingMap(u);
        for (const t of allyTargets(u, e.to || 'ally')) {
          const miss = Math.max(0, t.maxHp - t.hp);
          const lethal = (inc.get(t) || 0) >= t.hp ? 2.2 : 1;    // 这一口是救命的，不是补血的
          acc.s += Math.min(amt, miss) * urgency(t) * lethal;
        }
        break;
      }
      case 'shield': {
        const amt = (u.def * 1.2 + u.maxHp * 0.08) * num(e.m, 1) * (1 + u.shieldBonus / 100);
        const avg = hitFoes(u);
        const inc = incomingMap(u);
        for (const t of allyTargets(u, e.to || 'self')) {
          // 盾能吃掉的量：空出来的血条 + 下一轮真要挨的那一下（看了对面的意图再决定值不值）
          const room = Math.max(0, t.maxHp - t.hp - num(t.shield)) + Math.max(avg * 0.3, (inc.get(t) || 0) * 0.9);
          acc.s += Math.min(amt, room) * urgency(t);
        }
        break;
      }
      case 'buff': {
        const ts = allyTargets(u, e.to || 'self');
        const dur = positive(e.dur, 1);
        for (const t of ts) {
          const cur = sumBuff(t, e.stat);
          if (e.stat === 'atk' || e.stat === 'amp') {
            const fade = Math.max(0.2, 1 - cur / 80);      // 已经叠上去了就递减
            acc.o += dpsOf(t) * (num(e.v) / 100) * dur * (e.stat === 'amp' ? 0.95 : 0.85) * fade;
          } else if (e.stat === 'crit') acc.o += dpsOf(t) * (num(e.v) / 100) * (Math.max(0, t.critDmg) / 100) * dur * 0.8;
          else if (e.stat === 'def') acc.s += hitFoes(u) * (num(e.v) / 100) * dur * 0.3;
          else acc.o += dpsOf(t) * 0.05 * dur;
        }
        break;
      }
      case 'debuff': {
        const ts = e.to === 'allies' ? F : foeTargets(u, e.to || 'foe');
        const dur = positive(e.dur, 1);
        for (const t of ts) {
          if (e.stat === 'vuln') {
            // 受伤加深：落在敌人身上就是我方凭空多打出来的伤害，落在我方身上就是多挨的打
            acc[e.to === 'allies' ? 's' : 'o'] += (t.side === 'e' ? allyDps(u) * 0.6 : hitFoes(u) * 0.6) * (num(e.v) / 100) * dur;
          } else if (e.stat === 'atk') acc.s += atkOf(t) * (num(e.v) / 100) * dur * 0.55;
          else if (e.stat === 'def' && t.side === 'e') {
            // 破防：按「减防之后这一下能多打多少」折算，不是按百分比瞎给分
            acc.o += (estHit(u, t, 1, Math.max(0.1, 1 - num(e.v) / 100)) - estHit(u, t, 1)) * dur * 0.8;
          }
        }
        break;
      }
      case 'dot': {
        const per = atkOf(u) * num(e.m, 0);
        for (const t of foeTargets(u, e.to || 'foe')) acc.o += Math.min(per * positive(e.dur, 1), num(t.hp) * 0.9);
        break;
      }
      case 'gauge': {
        const key = e.k === 'aliemus' ? 'ali' : 'key';
        const unit = dpsOf(u) * 0.025;          // 100 点 ≈ 一发大招（约 2.5 回合的输出）
        for (const t of allyTargets(u, e.to || 'self')) {
          const cur = Math.max(0, Math.min(100, num(t[key])));
          const add = Math.min(100 - cur, num(e.v));
          if (add > 0) acc.o += add * unit * (cur + num(e.v) >= 100 ? 2.2 : 1);
        }
        break;
      }
      case 'status': {
        const list = e.to === 'allies' ? F : e.to === 'self' ? [u] : e.to === 'ally' ? allyTargets(u, 'ally') : foeTargets(u, e.to || 'foe');
        const dur = positive(e.dur, 1);
        for (const t of list) {
          if (!t || !t.alive) continue;
          switch (e.s) {
            case 'poison': acc.o += Math.min(num(e.n, 1) * atkOf(u) * 0.1 * dur * 0.7, num(t.hp)); break;
            case 'counter': acc.s += Math.min(num(e.n, 1), 6) * atkOf(t) * 0.22 * 0.7; break;
            case 'barrier': acc.s += (hitFoes(u) / Math.max(1, foesOf(u).length)) * num(e.n, 1) * (t === u ? 1 : 0.8); break;
            case 'fortress': acc.s += hitFoes(u) * Math.min(50, num(e.n, 1)) / 100 * dur * 0.6; break;
            case 'weakness': acc.s += atkOf(t) * 0.25 * dur * 0.5; break;
            case 'fragile': acc.s += atkOf(t) * 0.2 * dur * 0.5; break;
            case 'stun': if (!t.boss && !t.reward) acc.s += atkOf(t) * num(e.n, 1) * 0.8; break;
            default: break;    // sealed：敌人没有大招，封了也白封
          }
        }
        break;
      }
      case 'lifesteal': acc.s += atkOf(u) * (num(e.v) / 100) * 1.5; break;
      case 'execute': {
        const thr = num(e.thr, 0.3);
        const list = e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe');
        for (const t of list) addDmg(u, acc, [t], hpPct(t) < thr ? num(e.m, 1) * 2 : num(e.m, 1));
        break;
      }
      case 'pctHp': {
        const list = e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe');
        for (const t of list) {
          let amt = num(t.maxHp) * num(e.pct) / 100;
          if (t.boss || t.reward) amt = Math.min(amt, atkOf(u) * 8);
          acc.o += Math.min(amt, num(t.hp));
        }
        break;
      }
      case 'cleanse': for (const t of allyTargets(u, e.to || 'allies')) acc.s += debuffWorth(t) * 0.9; break;
      case 'dispel': {
        let v = 0;
        for (const t of (e.to === 'allies' ? F : foesOf(u))) {
          const pos = t.buffs.filter((b) => (b.stat === 'vuln' ? b.v < 0 : b.v > 0));
          v += pos.length * atkOf(t) * 0.35;
          if (t.st.fortress) v += hitFoes(u) * Math.min(50, t.st.fortress.n) / 100 * 1.5;
          if (t.st.barrier) v += hitFoes(u) / Math.max(1, foesOf(u).length) * t.st.barrier.n;
        }
        acc.o += v * 0.8;
        break;
      }
      case 'revive': {
        const dead = (u.side === 'a' ? A : E).filter((x) => !x.alive);
        if (dead.length && !u.usedRevive) acc.s += num(dead[0].maxHp) * 0.85;
        break;
      }
      case 'taunt': {
        const dur = positive(e.dur, 2);
        // 血厚的人吸火才有意义：自己越健康、队友越惨，越值
        const squish = F.filter((x) => x !== u).reduce((s, x) => s + Math.max(0, 0.75 - hpPct(x)), 0);
        acc.s += hitFoes(u) * dur * (0.18 + squish * 0.9) * (u.type === 'WARDEN' ? 1.25 : 0.8);
        break;
      }
      case 'reflect': {
        const dur = positive(e.dur, 2);
        acc.s += hitFoes(u) * (num(e.pct, 30) / 100) * dur * 0.45 * (hpPct(u) > 0.3 ? 1 : 0.5);
        break;
      }
      case 'stun': {
        const list = e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe');
        for (const t of list) if (!t.boss && !t.reward) acc.s += atkOf(t) * positive(e.n, 1) * 0.85;
        break;
      }
      case 'chain': {
        const hits = positive(e.hits, 3);
        const avg = num(e.m, 1) * (1 + num(e.grow, 0.2) * (hits - 1) / 2);
        const list = reachable(u);
        if (list.length) acc.o += list.reduce((s, t) => s + Math.min(estHit(u, t, avg), num(t.hp) + num(t.shield)) * hits / list.length, 0);
        break;
      }
      case 'splash': {
        const main = aimAt(u, 'foe');
        if (main) addDmg(u, acc, [main], num(e.m, 1));
        for (const t of foesOf(u)) if (t !== main) addDmg(u, acc, [t], num(e.m, 1) * num(e.share, 0.5));
        break;
      }
      case 'echo': acc.o += atkOf(u) * 1.5 * positive(e.n, 1); break;
      case 'cdReset': {
        const saved = friendsOf(u).reduce((s, x) => s + Math.max(0, num(x.cd.Skill1), num(x.cd.Skill2)), 0);
        acc.o += saved * atkOf(u) * 0.25;
        break;
      }
      case 'shieldDmg': {
        const sum = friendsOf(u).reduce((s, x) => s + num(x.shield), 0);
        const t = aimAt(u, 'foe');
        if (t && sum > 0) acc.o += Math.min(sum * num(e.m, 1), num(t.hp));
        break;
      }
      case 'blood': {
        const cost = Math.min(u.hp - 1, u.maxHp * num(e.cost, 15) / 100);
        acc.s -= cost * 1.1 * (hpPct(u) < 0.45 ? 2 : 1);        // 残血献祭是自杀
        for (const t of (e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe'))) addDmg(u, acc, [t], num(e.m, 1) * (1 + num(e.cost, 15) / 50));
        break;
      }
      case 'missingHeal': {
        for (const t of allyTargets(u, e.to || 'allies')) acc.s += Math.max(0, t.maxHp - t.hp) * num(e.pct, 40) / 100 * Math.min(1, 0.5 + urgency(t));
        break;
      }
      case 'delay': {
        // 打的是几回合后的全场：折算成六折（对手可能先死、自己也未必还在）
        const hits = foesOf(u).reduce((s, t) => s + Math.min(estHit(u, t, num(e.m, 1)), num(t.hp) + num(t.shield)), 0);
        acc.o += hits * 0.6;
        break;
      }
      case 'lowHpBoost': {
        const mul = num(e.m, 1) * (1 + 2 * (1 - hpPct(u)));     // 血越少越值 —— 这位的牌就是这么设计的
        for (const t of (e.to === 'foes' ? foesOf(u) : foeTargets(u, e.to || 'foe'))) addDmg(u, acc, [t], mul);
        break;
      }
      case 'poisonBurst': {
        for (const t of foesOf(u)) { const p = t.st.poison; if (p) acc.o += Math.min(num(p.n) * num(p.per) * num(e.m, 1.5), num(t.hp)); }
        break;
      }
      case 'dotBurst': {
        for (const t of foesOf(u)) if (t.dots.length) acc.o += Math.min(t.dots.reduce((s, d) => s + num(d.dmg) * num(d.dur), 0) * num(e.m, 1), num(t.hp));
        break;
      }
      case 'extraTurn': {
        const ally = friendsOf(u).filter((x) => x !== u && x.kit).sort((x, y) => y.atk - x.atk)[0];
        if (ally && !u._xt) acc.o += atkOf(ally) * 1.4;
        break;
      }
      default: break;
    }
  }

  // 定位权重：同样的收益，突破手更看重伤害、守护更看重减伤、辅助更看重治疗与增益。
  // 角色之间的真正差别来自 kit（真实卡面决定手里有什么牌），定位只决定「同样一分我更看重哪头」。
  const ROLE_W = { ASSAULT: { o: 1.15, s: 0.82 }, WARDEN: { o: 0.95, s: 1.2 }, CHORUS: { o: 0.85, s: 1.22 } };
  const TIE = { Skill1: 3, Skill2: 2, Defense: 1, Strike: 0 };   // 同分时优先技能：技能额外给更多能量

  function cardValue(u, slot) {
    const sk = u.kit[slot];
    if (!sk) return -1;
    const acc = { o: 0, s: 0 };
    for (const e of (Array.isArray(sk.effects) ? sk.effects : [])) scoreEffect(u, e, acc);
    const w = ROLE_W[u.type] || ROLE_W.ASSAULT;
    let v = acc.o * w.o + acc.s * w.s;
    // 架势只换盾不换输出：健康时别磨，血线到了阈值才变成好牌（保留预设里的 defend 手感）
    if (slot === 'Defense') v *= hpPct(u) < strat.defend ? 1.45 : 0.7;
    if (u.echo > 0) v *= 1.1;      // 回响期：这一下会被重放一遍
    return v;
  }

  const ultReady = (x) => x.alive && !x.st.sealed && (x.key >= 100 || x.ali >= 100);
  function ultCard(u) { return u.key >= 100 ? 'OverExalt' : 'Exalt'; }
  /** 当前能用的普通牌里，分值最高的那对 { slot, v }（不含唤醒 / 大招） */
  function bestNormal(u) {
    let best = { slot: 'Strike', v: -Infinity };
    for (const slot of ['Skill1', 'Skill2', 'Defense', 'Strike']) {
      if (slot !== 'Strike' && u.cd[slot] > 0) continue;
      const v = cardValue(u, slot) + TIE[slot];
      if (v > best.v) best = { slot, v };
    }
    return best;
  }
  function chooseAllyCard(u) {
    if (ultReady(u)) {
      if (ultMode === 'first') {
        // 血满了还放「治疗型大招」是白扔一次行动：大招和其它牌一起算分，
        // 明显不如手上的牌就先捏着（最多捏两次，能量顶到 100 之后攒得也浪费）。
        const nv = bestNormal(u);
        const uv = cardValue(u, ultCard(u));
        u.holdUlt = (u.holdUlt || 0) + 1;
        if (uv >= nv.v * 0.72 || u.holdUlt > 2 || hpPct(u) < 0.45) { u.holdUlt = 0; return ultCard(u); }
      }
      if (ultMode === 'order') {
        // 按玩家排好的顺序开：排在自己前面、而且已经攒满的人还没开（说明它这轮还没轮到），就先等它；
        // 等 2 次行动还没等到（那位被控 / 已经死了 / 排在别人后面卡住），就自己先开，免得干等。
        const rank = (x) => { const i = ultOrder.indexOf(x.slug); return i < 0 ? 999 : i; };
        const me = rank(u);
        const ahead = friendsOf(u).filter((x) => x.kit && rank(x) < me && ultReady(x) && x.lastUltRound !== round);
        u.ultWait = (u.ultWait || 0) + 1;
        if (!ahead.length || u.ultWait > 2) { u.ultWait = 0; return ultCard(u); }
      } else if (ultMode === 'sync') {
        // 攒大招一起开：每个活着的队友都攒满了（或者已经进入「齐射回合」）才放；
        // 为了不被拖死：自己等了 3 次行动还没等齐，或者自己血量已经见底，就不等了
        const mates = friendsOf(u).filter((x) => x.kit);
        const all = mates.every(ultReady);
        if (all) burstRound = round;
        u.ultWait = (u.ultWait || 0) + 1;
        if (all || burstRound === round || u.ultWait > 3 || hpPct(u) < 0.3) { u.ultWait = 0; return ultCard(u); }
      }
    }
    // 剩下的牌（唤醒 / 大招之外）逐张算分，取最高的那张；普攻永远可用，是兜底
    return bestNormal(u).slot;
  }

  // enemies play their opening once, then loop the cycle
  const nextSkill = (u) => { const cycle = Array.isArray(u.pattern) && u.pattern.length ? u.pattern : [{ name: '普通攻击', effects: [{ t: 'dmg', m: 1, to: 'foe' }] }];
    return (u.patIdx < u.opening.length ? u.opening[u.patIdx] : cycle[(u.patIdx - u.opening.length) % cycle.length]) || cycle[0]; };
  function showIntent(u) {
    if (u.side !== 'e' || !u.alive) return;
    const sk = nextSkill(u);
    push({ k: 'intent', who: u.uid, name: sk.name, ic: sk.ic || null, text: sk.plain || '' });
  }

  function act(u, bonus = false) {
    if (u.stunned > 0) { u.stunned--; push({ k: 'act', who: u.uid, slot: 'Strike', name: '眩晕', round }); return; }
    u.acted++;
    // 敌人的盾到它自己下次出手前失效；我方的盾不在这里清（见回合开头）：
    // 以前每个人出手前都清一遍自己的盾，于是排在施盾者后面的队友一开动就把刚拿到的盾抹了，
    // 团队盾 / 超共鸣的盾大招基本全白给（实测发出去的盾只有 3%~8% 真吃到了伤害）。
    if (u.side === 'e') u.shield = 0;
    for (const k of Object.keys(u.cd)) if (u.cd[k] > 0) u.cd[k]--;
    let slot, sk;
    if (u.kit) {
      slot = chooseAllyCard(u);
      sk = u.kit[slot];
    } else {
      sk = nextSkill(u);
      u.patIdx++;
      slot = 'Strike';
    }
    push({ k: 'act', who: u.uid, slot, name: sk.name, round, ...(sk.text ? { text: sk.text } : {}), ...(sk.ic ? { ic: sk.ic } : {}) });
    if (u.kit) {
      if (slot === 'Rouse') { u.roused = true; gainGauge(u, 'key', 0); }
      if (slot === 'Exalt') { u.ali = 0; gainGauge(u, 'key', 34); u.lastUltRound = round; }
      else if (slot === 'OverExalt') { u.key = 0; u.lastUltRound = round; }
      else if (slot === 'Strike') gainGauge(u, 'ali', 14);
      else if (slot === 'Skill1' || slot === 'Skill2') { gainGauge(u, 'ali', 20); gainGauge(u, 'key', 4); u.cd[slot] = slot === 'Skill1' ? 2 : 3; }
      else if (slot === 'Defense') u.cd.Defense = 3;
      if (slot === 'Strike') gainGauge(u, 'key', 4);
      push({ k: 'gauge', who: u.uid, ali: u.ali, key: u.key });
    }
    const efx = Array.isArray(sk?.effects) ? sk.effects : [];
    run(u, efx);
    if (u.echo > 0 && u.alive) { u.echo--; run(u, efx); }          // 回响：重放一遍
    emitAll();
    // 满超限 / 满最终法则的专属技能：免费追加，不占回合、不进冷却
    if (!bonus && u.kit && u.extra && u.alive && !finished()) {
      for (const slot of ['Od', 'Law']) {
        const ex = u.extra[slot];
        if (!ex || u.acted % ex.every !== 0 || !u.alive || finished()) continue;
        push({ k: 'act', who: u.uid, slot, name: ex.name, round, text: ex.text });
        run(u, ex.effects);
        emitAll();
      }
    }
    showIntent(u);
    if (u.side === 'e' && u.affix === 'swift' && u.alive && rng() < 0.2) {
      push({ k: 'act', who: u.uid, slot: 'Strike', name: '疾袭', round });
      run(u, [{ t: 'dmg', m: 0.6, hits: 1, to: 'foe' }]);
    }
  }

  const finished = () => !A.some((x) => x.alive) || !E.some((x) => x.alive);

  for (const u of E) showIntent(u);
  // ---- 登场：唤醒 ----
  // 「唤醒」是登场技，不是第一回合要花掉的那个动作：开场四人同时唤醒，加成开场就挂在
  // 身上，第一回合就能真正出手。（以前四个人一轮都在喊唤醒，等于白送对面一轮，而挂机
  // 通关是有回合上限的，那一轮直接吃掉 1/18 的预算。）
  // 记一条 round 0 的行动事件，观战回放照旧能把「唤醒」播出来。
  for (const u of A) {
    if (!u.kit || !u.kit.Rouse || u.roused) continue;
    const sk = u.kit.Rouse;
    u.roused = true;
    push({ k: 'act', who: u.uid, slot: 'Rouse', name: sk.name, round: 0, ...(sk.text ? { text: sk.text } : {}) });
    run(u, Array.isArray(sk.effects) ? sk.effects : []);
  }
  emitAll();
  while (round < maxRounds && !finished()) {
    round++;
    push({ k: 'round', n: round });
    for (const u of A) u.shield = 0;      // 我方的盾撑到下一回合开头：本回合队友给的盾要能挡住这回合敌人的出手
    for (const u of A) {      // 延迟爆发到点了
      if (!u.delayed.length) continue;
      const due = u.delayed.filter((d) => d.at <= round);
      u.delayed = u.delayed.filter((d) => d.at > round);
      for (const d of due) for (const t of E) if (t.alive && u.alive) applyDamage(u, t, Math.max(1, Math.round(u.atk * d.m * DMG_SCALE)), false, null, 'dmg');
    }
    for (const u of [...A, ...E]) {
      if (!u.alive) continue;
      for (const d of u.dots) {
        if (!u.alive) break;
        const src = [...A, ...E].find((x) => x.uid === d.by);
        applyDamage(src || u, u, Math.max(1, Math.round(d.dmg)), false, null, 'dot');
      }
      u.dots = u.dots.map((d) => ({ ...d, dur: d.dur - 1 })).filter((d) => d.dur > 0);
      const ps = u.st.poison;
      if (ps && u.alive) {
        applyDamage([...A, ...E].find((x) => x.side !== u.side) || u, u, Math.max(1, Math.round(ps.n * ps.per)), false, null, 'dot', { s: 'poison' });
        ps.n -= Math.max(1, Math.floor(ps.n * 0.2));
        if (ps.n <= 0) delete u.st.poison;
      }
    }
    emitAll();
    if (finished()) break;
    for (const u of [...A, ...E]) {
      if (finished()) break;
      if (u.alive) act(u);
    }
    for (const u of [...A, ...E]) {
      u.buffs = u.buffs.map((b) => ({ ...b, dur: b.dur - 1 })).filter((b) => b.dur > 0);
      if (u.taunt > 0) u.taunt--;
      if (u.reflect && --u.reflect.dur <= 0) u.reflect = null;
      for (const k of Object.keys(u.st)) if (u.st[k].dur < 90 && --u.st[k].dur <= 0) delete u.st[k];
      if (u.side === 'e' && round >= 12) u.enrage += 0.08;
    }
    emitAll();
  }

  const win = !E.some((x) => x.alive) && A.some((x) => x.alive);
  // 回合打满还没清场 = 超时判负（不是「打平」）：挂机通关有时间限制，
  // 四奶互相吊着硬磨的打法拿不到通关，也不会推进关卡。
  const timeout = !win && round >= maxRounds;
  push({ k: 'end', win, rounds: round, timeout });
  return {
    win, rounds: round, timeout, roundLimit: maxRounds, events: ev, kills, stats,
    allies: A.map((u) => ({ uid: u.uid, hp: u.hp, maxHp: u.maxHp, alive: u.alive })),
    // 观战回放用的展示数据（只有画面需要的字段，不含技能 kit）：挑塔 / 周 Boss / 竞技场
    // 这些「直接出结果」的模式原本没有 prep，现在也能把过程放出来。
    prep: { allies: A.map(prepOf), enemies: E.map(prepOf) },
  };
}

/** unit -> 回放画面需要的静态数据（满血值、名字、立绘、界域、类型、Boss/奖励标记） */
function prepOf(u) {
  return {
    uid: u.uid, name: u.name, img: u.img, type: u.type, realm: u.realm,
    hp: u.maxHp, boss: u.boss, reward: u.reward,
    openAli: u.openAli || 0, openKey: u.openKey || 0,
  };
}
