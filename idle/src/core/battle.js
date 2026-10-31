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
    uid: `${side}${idx}`, side, idx,
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
  // 大招策略：first = 优先开大（默认，能开就开）；sync = 攒大招一起开大；manual = 手动开大（只有实时战斗里才生效，
  // 靠 strat.cmds 里玩家点的指令；离线 / 扫描 / 竞技场这类无人值守的结算一律按 first 算，不然永远不开大会卡进度）
  const ultMode = strat.ult === 'manual' && !strat.live ? 'first' : (strat.ult || 'first');
  const cmds = Array.isArray(strat.cmds) ? strat.cmds.map((c) => ({ ...c, done: false })) : [];
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
          for (const t of targets(u, e.to || 'foe')) if (t.alive) damage(u, t, hpPct(t) < num(e.thr, 0.3) ? e.m * 2 : e.m, ctx);
          break;
        case 'pctHp':      // 按目标最大生命的百分比直接扣血（首领封顶 = 自身攻击 × 8）
          for (const t of targets(u, e.to || 'foe')) {
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
        case 'extraTurn': {   // 追击号令：攻击最高的队友立刻额外行动一次
          if (u._xt) break;
          const ally = friendsOf(u).filter((x) => x !== u && x.kit).sort((x, y) => y.atk - x.atk)[0];
          if (ally) { u._xt = true; act(ally, true); u._xt = false; }
          break;
        }
      }
    }
  }

  const ultReady = (x) => x.alive && !x.st.sealed && (x.key >= 100 || x.ali >= 100);
  function ultCard(u) { return u.key >= 100 ? 'OverExalt' : 'Exalt'; }
  function chooseAllyCard(u) {
    const kit = u.kit;
    if (!u.roused) return 'Rouse';
    if (ultReady(u)) {
      if (ultMode === 'first') return ultCard(u);
      if (ultMode === 'manual') {
        // 手动：只有玩家点过的那一位、而且指令生效的回合到了，才放
        const c = cmds.find((x) => !x.done && x.uid === u.uid && round >= (x.from || 1));
        if (c) { c.done = true; return ultCard(u); }
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
    if (hpPct(u) < strat.defend && !(u.cd.Defense > 0)) return 'Defense';
    if (u.type === 'CHORUS' && !(u.cd.Skill1 > 0) && friendsOf(u).some((f) => hpPct(f) < 0.65)) return 'Skill1';
    if (!(u.cd.Skill2 > 0)) return 'Skill2';
    if (!(u.cd.Skill1 > 0)) return 'Skill1';
    return 'Strike';
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
    u.shield = 0;
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
      if (slot === 'Exalt') { u.ali = 0; gainGauge(u, 'key', 34); }
      else if (slot === 'OverExalt') { u.key = 0; }
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
  while (round < maxRounds && !finished()) {
    round++;
    push({ k: 'round', n: round });
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
