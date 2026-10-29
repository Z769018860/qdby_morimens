import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, recover, submit, setDraft, finish, stats, canFinish } from '../js/engine.js';
import { sample, blank, toGame, validate, sanitize, compile, encode, decodeWork, decodeRate, PLACES } from '../js/workshop.js';

const solveAll = (G, st) => {
  for (const k of st.recovered) {
    setDraft(st, k, 'cause', G.solutions[k].cause);
    setDraft(st, k, 'weapon', String(G.solutions[k].weaponNum || 0));
    setDraft(st, k, 'culprit', String(G.solutions[k].culprit));
    assert.equal(submit(G, st, k).correct, true, `${k} 应该能答对`);
  }
};

test('示例卷宗：体检全绿，线索链完整', () => {
  const cs = sample();
  const v = validate(cs);
  assert.deepEqual(v.errors, [], '示例不该有必须修的错');
  assert.equal(v.rows.length, 5);
  assert.deepEqual(v.start, ['01-C4-05', '02-B3-02', '03-D3-01', '04-A2-03']);
  // 正文里出现的名字会变成线索；活人（白鸦）不进线索链，他也没有记录可复原
  const G = toGame(cs);
  assert.deepEqual(G.records['01-C4-05'].refs, ['02-B3-02']);
  assert.ok(G.records['05-E4-06'].refs.includes('01-C4-05'));
  const all = Object.values(G.records).flatMap((r) => r.refs);
  assert.equal(all.some((k) => G.records[k] === undefined), false, '线索不能指向不存在的记录');
});

test('示例卷宗能从头玩到结案', () => {
  const G = toGame(sample());
  const st = newGame(G);
  for (const k of G.start) assert.equal(recover(G, st, k).ok, true);
  let guard = 0;
  while (st.recovered.length < Object.keys(G.records).length && guard++ < 20) {
    for (const k of [...st.recovered]) for (const ref of G.records[k].refs) if (!st.recovered.includes(ref)) recover(G, st, ref);
  }
  assert.equal(st.recovered.length, 5, '顺着线索应该能全部复原');
  assert.equal(canFinish(G, st), false, '一份报告都没确认时还不能结案');
  solveAll(G, st);
  assert.equal(canFinish(G, st), true);
  const r = finish(G, st);
  assert.equal(r.ended, 'true');
  const s = stats(G, st);
  assert.equal(s.confirmed, 5);
  assert.equal(s.rate, 100);
  assert.ok(['SSS', 'SS', 'S'].includes(s.rating.rank), `无提示全对应拿高评价，实际 ${s.rating.rank}`);
});

test('记录名按死亡时刻排序，答案与正文里的序号对得上', () => {
  const cs = sample();
  const rows = compile(cs);
  assert.deepEqual(rows.map((r) => r.key), ['01-C4-05', '02-B3-02', '03-D3-01', '04-A2-03', '05-E4-06']);
  // 江屿的正文写“他是第二个死的……死在图书馆”，与 02-B3-02 一致
  assert.ok(rows[0].text.includes('图书馆') && rows[1].cell === 'B3');
  for (const r of rows) assert.ok(PLACES[r.cell]);
});

test('永远读不到的人会被拦下来', () => {
  // 六条记录：甲一与乙二互相提到，形成一个小环，外面没人指向他们 → 从开场永远走不到
  const names = ['甲一', '乙二', '丙三', '丁四', '戊五', '己六'];
  const cs = { v: 1, id: 'wtest', t: '测试卷宗', a: '', b: '', o: '', e: '', at: 1,
    p: names.map((m, i) => ({ n: i + 1, m, i: '' })),
    r: names.map((m, i) => ({ num: i + 1, day: 1, hour: 8 + i, min: 0, cell: 'C3', cause: 'accident', weapon: 0, culprit: 0,
      text: i === 0 ? `我在这里等着。乙二说过会来，他死在第三区，是第二个死的。` : i === 1 ? `我去找甲一，他死在钟楼，是第一个死的。` : `雨一直下。我坐在这里，谁也没有来。天亮之前我就凉了。` })) };
  const v = validate(cs);
  assert.ok(v.errors.some((e) => e.includes('永远读不到')), '甲乙这一环从开场走不到，应该报错');
  assert.equal(v.start.length, 4);
});

test('重名、名字互相包含、无人可填，都要报出来', () => {
  const cs = sample();
  cs.p[0].m = '柯望';
  cs.p[1].m = '柯望山';
  const v = validate(cs);
  assert.ok(v.errors.some((e) => e.includes('互相包含')));
  cs.p[0].m = '柯望';
  cs.p[1].m = '柯望';
  assert.ok(validate(cs).errors.some((e) => e.includes('两个人都叫')));
});

test('正文里没写地点或序数时给提醒，但不拦发布', () => {
  const cs = sample();
  cs.r[0].text = '我在操场坐下，把药吃了。\n林雾从远处走过，没有看见我。\n后来我就睡过去了，再也没有醒来，雨一直在下，天也没有亮。';
  const v = validate(cs);
  assert.deepEqual(v.errors, []);
  assert.ok(v.warns.some((w) => w.includes('没写他死在哪一区')));
  assert.ok(v.warns.some((w) => w.includes('第几个')));
});

test('畸形数据不会把编译器炸掉', () => {
  assert.equal(sanitize(null), null);
  const cs = sanitize({ id: 'x'.repeat(80), t: 't'.repeat(200), p: [{ m: '甲' }, { m: '乙' }, { m: '丙' }], r: [{ num: 9, text: 'x' }, { num: 1, text: 'y' }, { num: 1, text: 'z' }] });
  assert.equal(cs.id.length, 24);
  assert.equal(cs.t.length, 40);
  assert.deepEqual(cs.r.map((r) => r.num), [1], '指向不存在的人与重复的人都应被丢掉');
  assert.equal(cs.r[0].cell, 'C3');
  assert.equal(cs.r[0].cause, 'accident');
  const fresh = blank();
  assert.equal(validate(fresh).errors.length > 0, true, '空白卷宗当然不合法，但不能抛异常');
});

test('云端编码能原样还原', () => {
  const cs = sample();
  const back = decodeWork(encode(cs));
  assert.equal(back.t, cs.t);
  assert.equal(back.r.length, cs.r.length);
  assert.equal(back.r[0].text, cs.r[0].text);
  assert.equal(decodeWork('随便一句评论'), null);
  assert.equal(decodeWork('@@DRW1 这不是 JSON'), null);
  const rt = decodeRate('@@DRR1 {"t":"w1","s":9,"r":"SSS","sc":1234,"rt":98,"h":1,"b":"某人","d":"dev1","n":"好"}');
  assert.equal(rt.s, 5, '超过 5 星要夹住');
  assert.equal(rt.sc, 1234);
});

test('工坊 G 的字段齐全，主界面不会踩空', () => {
  const G = toGame(sample());
  for (const k of ['edition', 'roster', 'places', 'zones', 'causes', 'records', 'docs', 'msgs', 'start', 'solutions', 'hints', 'puzzles', 'arcs', 'milestones', 'endings']) assert.ok(k in G, `缺字段 ${k}`);
  assert.ok(G.docs['00-ORDER'] && G.docs['00-REPORT']);
  assert.equal(G.roster.length, 6);
  for (const p of G.roster) { assert.equal(typeof p.item, 'string'); assert.ok(['HUMAN'].includes(p.realm)); }
  for (const k of Object.keys(G.records)) {
    const h = G.hints;
    for (const step of [0, 1, 2]) { assert.ok(h.restore[k][step].length > 4); assert.ok(h.confirm[k][step].length > 4); }
    assert.equal(G.solutions[k].weaponNum, G.solutions[k].weapon === '无' ? 0 : G.solutions[k].weaponNum);
  }
  assert.equal(G.noZone, true);
  assert.equal(G.shadow, null);
});
