// 难度表：唯一真源。
//
// 以前这张表在 js/lovelive.js 里，scripts/ll-song-check.mjs 又抄了一份，
// 改游戏忘了改体检脚本，脚本就一直拿旧参数在测一份「游戏里根本不存在的谱面」。
// 现在两处都从这里读。
//
// 难度只改谱面，不改血量：四档的 stam（漏一个扣多少体力）是同一个数。
// 区分靠三件事——出球间隔 gap（秒，越小越密）、tapQ（丢掉最弱的那一档起音，
// 越大越稀）、双押概率 dbl。EASY 大约每秒 1.5 球、基本没有双押；
// EXPERT 每秒 6~8 球、强拍成对下来，长条也更长。
//
// 各字段：
//   win      Perfect / Great / Good / Bad 的半宽（秒，实际再乘判定宽松）
//   lead     音符从发球点飞到框里要走几秒（越大越好读，flow 设置会再乘一次）
//   gap      谱面最小间隔（节奏密集时会按响度再缩到 0.72 倍）
//   hold     原曲里拖长音留成长条的概率；holdCap 长条占比上限
//   holdAt   同时最多几根长条在按着；maxTail 长条最长几秒
//   holdCd   同一条轨两条长条之间的冷却（秒）：刚松手就再来一根，手指换不过来
//   jump     相邻两下最多跨几格
//   dbl      双押比例（强音处再翻倍）；dblHold 长条配第二只手的比例
//   stam     Miss 扣体力；pad 芯片改编时叠鼓点的概率
export const STAM_LOSS = 5.5;

export const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.068, 0.122, 0.172, 0.222], lead: 1.85, gap: 0.62,  hold: 0.45, holdCap: 0.11, holdAt: 1, maxTail: 1.1, holdCd: 2.2, jump: 2, tapQ: 0.46, dbl: 0,    dblHold: 0,    stam: STAM_LOSS, pad: 0.20 },
  { k: 'normal', n: 'NORMAL', win: [0.052, 0.098, 0.148, 0.198], lead: 1.55, gap: 0.33,  hold: 0.72, holdCap: 0.15, holdAt: 2, maxTail: 1.4, holdCd: 1.9, jump: 2, tapQ: 0.28, dbl: 0.07, dblHold: 0.30, stam: STAM_LOSS, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.28, gap: 0.19,  hold: 0.88, holdCap: 0.18, holdAt: 2, maxTail: 1.8, holdCd: 1.6, jump: 3, tapQ: 0.12, dbl: 0.16, dblHold: 0.55, stam: STAM_LOSS, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.082, 0.125, 0.170], lead: 1.08, gap: 0.115, hold: 0.95, holdCap: 0.20, holdAt: 2, maxTail: 2.0, holdCd: 1.4, jump: 4, tapQ: 0.03, dbl: 0.26, dblHold: 0.70, stam: STAM_LOSS, pad: 0.95 },
];

export const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];
