// 「校猫的结合」的全部静态数据：毛色 / 瞳色 / 造型 / 造物 / 密契 / 钥令 / 敌人 / 首领 / 楼层。
//
// 设计对照：以撒的结合里「道具改变外观」是核心乐趣，所以这里的每件造物都同时给了
// 一组数值和一个挂件（look），捡到之后校猫身上会多一样东西——帽子、眼镜、披风、提灯……
// 数值只是外壳，真正想让人一直捡下去的是「这只猫被我改成什么样了」。

// ------------------------------------------------------------------ 手感常量
export const TUNE = {
  tile: 40,            // 逻辑像素。房间按格子排，横屏 15×9、竖屏 9×13
  wall: 44,            // 墙体厚度（含踢脚线）
  baseHp: 6,           // 6 = 3 颗心，半心为 1
  playerR: 12,
  speed: 156,
  dmg: 3.4,
  rate: 2.2,           // 每秒射击次数
  tearSpeed: 320,
  range: 320,
  tearR: 6,
  crit: 0.05,
  critMul: 1.8,
  invuln: 0.85,
  contactIframe: 0.55,
};

// ------------------------------------------------------------------ 难度
// 同一栋楼，只看你敢走到第几层。三层 / 五层 / 八层各拿一个首领当终点，地形、房间、
// 剧情都不用另做一套——往下是同一段楼梯，区别是「到哪儿为止」。
// hp/dmg/drop 是相对倍率（敌人血量、吃到的伤害、掉落概率），score 只乘在结算分上。
export const DIFFS = [
  {
    k: 'easy', n: '简单', en: 'Easy', floors: 3,
    hp: 0.78, dmg: 0.6, drop: 1.25, score: 0.7, extraHp: 4,   // 多两颗心（4 = 2 颗）
    hint: '三层为止。蜡像馆的夫人是这条路上的最后一个人，桌子底下那段楼梯当没看见。',
    end: 'winE',
  },
  {
    k: 'hard', n: '困难', en: 'Hard', floors: 5,
    hp: 1, dmg: 1, drop: 1, score: 1, extraHp: 0,
    hint: '五层。锅炉灭了火，路就断在那儿。上面的礼堂、礼拜堂、深渊都还是空的。',
    end: 'winH',
  },
  {
    k: 'mad', n: '癫狂', en: 'Madness', floors: 8,
    hp: 1.3, dmg: 1.4, drop: 0.85, score: 1.6, extraHp: 0,
    hint: '八层到底。融蚀深渊里那滩东西会站起来，而且没打算让你上来。',
    end: 'win',
  },
];

// ------------------------------------------------------------------ 毛色
// d/m/l = 暗部 / 中间调 / 高光。原图是浅灰白的校猫，渲染时按亮度重新映射成「黑猫」，
// 所以这里给的是调色板，不是滤镜——阴影层次会跟着保留下来。
export const FURS = [
  { k: 'coal', n: '玄猫', d: '#060709', m: '#12151b', l: '#31384a', rim: '#4a5470', pat: 'none', hint: '最普通的一只黑猫，黑得发亮。', unlock: null },
  { k: 'snow', n: '乌云盖雪', d: '#07080b', m: '#141821', l: '#343b4c', rim: '#5a6b8f', pat: 'belly', hint: '背是黑的，肚子和爪子是白的。', unlock: { type: 'floor', v: 1 } },
  { k: 'needle', n: '墨里藏针', d: '#060709', m: '#131720', l: '#353c4d', rim: '#6b7794', pat: 'specks', hint: '黑毛里零星几根白，凑近才看得见。', unlock: { type: 'floor', v: 2 } },
  { k: 'tortie', n: '玳瑁', d: '#0a0806', m: '#1a1512', l: '#3a2c22', rim: '#7a4a22', pat: 'tortie', hint: '黑里掺一点锈红，像烧过头的糖。', unlock: { type: 'items', v: 8 } },
  { k: 'star', n: '星斑', d: '#05060c', m: '#0f1224', l: '#2b3160', rim: '#7f8bff', pat: 'stars', hint: '毛里嵌着星点，夜里会自己亮。', unlock: { type: 'clear', v: 1 } },
  { k: 'ghost', n: '幽灵猫', d: '#08110f', m: '#12211f', l: '#2b4a45', rim: '#6fe3c8', pat: 'ghost', hint: '半透明，尾巴尖会散成雾。', unlock: { type: 'kills', v: 150 } },
  { k: 'ember', n: '焦黑', d: '#0a0605', m: '#1b100c', l: '#40231a', rim: '#ff7a3c', pat: 'ember', hint: '从火灾里跑出来的猫，缝隙里有火。', unlock: { type: 'deaths', v: 8 } },
  { k: 'ink', n: '墨蓝', d: '#050a12', m: '#0e1a2c', l: '#2a4470', rim: '#5b9bff', pat: 'none', hint: '像被墨水泡过，光是蓝的。', unlock: { type: 'coins', v: 120 } },
  { k: 'void', n: '寂灭', d: '#08050f', m: '#150e26', l: '#342a58', rim: '#a06bff', pat: 'stars', hint: '从深渊底下带上来的颜色，毛尖是紫的，抖一下会掉一点浆。', unlock: { type: 'mad', v: 1 } },
];

// ------------------------------------------------------------------ 瞳色
export const EYES = [
  { k: 'gold', n: '金瞳', c: '#f4c850', g: '#ffb43c', unlock: null },
  { k: 'jade', n: '碧瞳', c: '#7be3b0', g: '#28c98a', unlock: { type: 'floor', v: 1 } },
  { k: 'blood', n: '赤瞳', c: '#ff6b5e', g: '#e0332b', unlock: { type: 'kills', v: 40 } },
  { k: 'cyan', n: '苍瞳', c: '#8fd8ff', g: '#39a8ff', unlock: { type: 'floor', v: 2 } },
  { k: 'violet', n: '紫瞳', c: '#c7a4ff', g: '#8b5cf6', unlock: { type: 'items', v: 5 } },
  { k: 'void', n: '空瞳', c: '#eef2ff', g: '#9fb4ff', unlock: { type: 'clear', v: 1 } },
];

// ------------------------------------------------------------------ 造型
// 主角是弥萨格校猫，就叫「弥萨格校猫」。这两个造型只是换一张原图（第二张是戴军帽的
// 那一版，轮廓都不一样），名字描述的是「长什么样」，不是它叫什么。
// ------------------------------------------------------------------ 基础模型
// 校猫不是一整张图：头是官方头像逐像素改造来的（换的是毛色），身体 / 耳朵 / 尾巴 / 毛边
// 都是程序画的。这里把「程序那部分」的骨架参数抽出来，一套参数就是一个基础模型。
//
// 换模型换的是比例，不是颜色——幼猫头大身小、老校猫瘦长拱背、胖校猫横着长、
// 长毛猫一圈毛边、折耳尾巴只剩一个球。坐标仍在素材空间里（0..96 是头像那张方块，
// 地面在 y=104），和饰品共用同一把尺子，所以换模型不会让帽子和项圈跑位。
//
// 字段：
//   body        躯干椭圆：cy / 横向半径 rx / 纵向半径 ry。底边落在 107 上下，
//               爪子的下缘要比它再低 2~3 才露得出来，否则整只就是「头下面一口碗」
//   paw         前爪：y / 半径 / 两只相距 gap
//   ear         style: point | round | notch（缺角）| fold（折耳）| tuft（耳尖一撮毛）
//   tail        mode: curl（向上卷）| up（短而竖）| droop（细长下垂）| plume（蓬松）| stub（球）
//   fluff       身体轮廓的毛边强度，0 是光毛，1 是长毛
//   eye         眼睛缩放（瞳孔、眼白、眨眼时盖的那块都跟着）
//   breathe     呼吸幅度倍率
export const BUILDS = {
  school: {
    n: '校猫',
    body: { cy: 84, rx: 26, ry: 24, topW: 0.74 },
    paw: { y: 106, rx: 7.6, ry: 5, gap: 11 },
    ear: { style: 'point', h: 1, w: 1 },
    tail: { mode: 'curl', w: 6.2, len: 1 },
    fluff: 0.12, eye: 1, breathe: 1,
    whisker: { len: 1, droop: 0 },
  },
  kitten: {
    n: '幼猫',
    // 头不缩，把身子缩小：视觉上头就显得大，这也是小猫真正的比例
    body: { cy: 87, rx: 20, ry: 21, topW: 0.72 },
    paw: { y: 104, rx: 6, ry: 4, gap: 8.5 },
    ear: { style: 'round', h: 0.84, w: 1.16 },
    tail: { mode: 'up', w: 5, len: 0.55 },
    fluff: 0.34, eye: 1.3, breathe: 1.6,
    whisker: { len: 0.62, droop: 0 },
  },
  elder: {
    n: '老校猫',
    body: { cy: 82, rx: 22, ry: 25, topW: 0.7 },
    paw: { y: 105, rx: 6.6, ry: 4.6, gap: 12.5 },
    ear: { style: 'notch', h: 1.06, w: 0.94 },
    tail: { mode: 'droop', w: 4.6, len: 1.1 },
    fluff: 0.52, eye: 0.8, breathe: 0.7,
    whisker: { len: 1.4, droop: 1 },
  },
  chonk: {
    n: '胖校猫',
    body: { cy: 85, rx: 32, ry: 22, topW: 0.8 },
    paw: { y: 106, rx: 9, ry: 4.4, gap: 14 },
    ear: { style: 'point', h: 0.88, w: 0.96 },
    tail: { mode: 'stub', w: 7.6, len: 0.9 },
    fluff: 0.22, eye: 0.94, breathe: 1.45,
    whisker: { len: 1.05, droop: 0.2 },
  },
  fluff: {
    n: '长毛',
    body: { cy: 83, rx: 28, ry: 24, topW: 0.76 },
    paw: { y: 105.5, rx: 8, ry: 4.8, gap: 11 },
    ear: { style: 'tuft', h: 1.1, w: 1.06 },
    tail: { mode: 'plume', w: 10, len: 1.05 },
    fluff: 1, eye: 1.05, breathe: 1.15,
    whisker: { len: 1.25, droop: 0.35 },
  },
  bobtail: {
    n: '折耳',
    body: { cy: 83, rx: 24, ry: 23, topW: 0.74 },
    paw: { y: 104.5, rx: 7.4, ry: 4.4, gap: 11 },
    ear: { style: 'fold', h: 1, w: 1 },
    tail: { mode: 'stub', w: 6.4, len: 0.8 },
    fluff: 0.26, eye: 1.12, breathe: 1.1,
    whisker: { len: 0.9, droop: 0.15 },
  },
};

// 造型＝基础模型 + 用哪张原图。新增一条就多一只可以换的猫。
export const COSTUMES = [
  { k: 'plain', n: '校猫', build: 'school', hint: '校门口那只，谁都能摸。', unlock: null },
  { k: 'officer', n: '戴军帽', build: 'school', src: 'cat2', hint: '换一张原图，帽檐压得很低，表情一点没变。', unlock: { type: 'clear', v: 1 } },
  { k: 'kitten', n: '幼猫', build: 'kitten', hint: '头还是这么大，身子还没长起来。尾巴竖着，站不太稳。', unlock: { type: 'floor', v: 3 } },
  { k: 'elder', n: '老校猫', build: 'elder', hint: '在这一层待太久了。肩塌下去，一只耳朵缺了一角。', unlock: { type: 'deaths', v: 4 } },
  { k: 'chonk', n: '胖校猫', build: 'chonk', hint: '谁路过都要喂它。走一步整只都在晃。', unlock: { type: 'items', v: 14 } },
  { k: 'fluff', n: '长毛', build: 'fluff', hint: '不是另一种猫，是同一个冬天没剪过毛。', unlock: { type: 'kills', v: 60 } },
  { k: 'fold', n: '折耳', build: 'bobtail', hint: '耳朵折下来了，尾巴也只剩一个球。', unlock: { type: 'coins', v: 60 } },
];

// ------------------------------------------------------------------ 造物
// eff 里能用的字段（全部由 applyItem 处理，见 js/binding.js）：
//   hp / dmg / rate / shots / pierce / crit / critMul / speed / tearSpeed / range /
//   luck / coinMul / chargeMul / vision / thorns / healKill / healRoom / revive /
//   autoAim / explodeKill / invulnBonus / dmgTaken / tearSize / floorCoins
export const ITEMS = [
  { k: 'heart', n: '异形之心', ic: 'heart', q: 'SSR', look: 'auraHeart', eff: { hp: 2 }, t: '最大生命 +1 心。心脏外面套了一层别的东西，跳得比原来稳。' },
  { k: 'blood', n: '恩赐之血', ic: 'blood', q: 'N', look: 'dripMouth', eff: { healKill: 6 }, t: '每击杀 6 个敌人回复半颗心。血从嘴角漏下来一点。' },
  { k: 'clamp', n: '止血钳', ic: 'clamp', q: 'N', look: 'earClip', eff: { invulnBonus: 0.35 }, t: '受伤后的无敌时间 +0.35 秒，钳在耳朵上。' },
  { k: 'ink', n: '甜蜜墨水', ic: 'ink', q: 'N', look: 'bow', eff: { hp: 2 }, t: '最大生命 +1 心。舔一口会变甜，别舔。' },
  { k: 'ruby', n: '红宝石胸针', ic: 'ruby', q: 'N', look: 'brooch', eff: { dmg: 0.9 }, t: '泪弹伤害 +0.9。别在胸口，正对心脏。' },
  { k: 'fan', n: '鸽羽扇', ic: 'fan', q: 'N', look: 'fanTail', eff: { rate: 1.18 }, t: '射击频率 +18%。尾巴换成了扇子，扇一下一发。' },
  { k: 'lock', n: '重锁', ic: 'lock', q: 'N', look: 'chain', eff: { dmg: 1.7, rate: 0.86, tearSize: 1.4 }, t: '泪弹变大、伤害 +1.7，但射速 -14%。拖着一把锁走路。' },
  { k: 'kaleido', n: '万花筒', ic: 'kaleido', q: 'N', look: 'prismEye', eff: { shots: 1, dmgMul: 0.85 }, t: '每次多射 1 发（伤害 -15%）。眼睛被换成三棱镜了。' },
  { k: 'prism', n: '三棱镜', ic: 'prism', q: 'N', look: 'monocle', eff: { pierce: 1 }, t: '泪弹可以多穿透 1 个敌人。' },
  { k: 'mirror', n: '孟菲斯仪式镜', ic: 'mirror', q: 'SSR', look: 'glasses', eff: { crit: 0.15 }, t: '暴击率 +15%。镜片里映出来的不是你。' },
  { k: 'plano', n: '普拉斯诺镜', ic: 'plano', q: 'SSR', look: 'goggles', eff: { tearSpeed: 1.3, range: 1.15 }, t: '泪弹速度 +30%、射程 +15%。' },
  { k: 'watch', n: '怀表镜', ic: 'watch', q: 'N', look: 'pocketWatch', eff: { speed: 1.12 }, t: '移动速度 +12%。表针走得比你快。' },
  { k: 'dial', n: '日月轮盘', ic: 'dial', q: 'N', look: 'haloDial', eff: { rate: 1.15, alternator: 0.28 }, t: '射速 +15%，每发交替获得 +28% 伤害（日）/ 无（月）。' },
  { k: 'butterfly', n: '蝴蝶标本', ic: 'butterfly', q: 'N', look: 'hairClip', eff: { luck: 3 }, t: '幸运 +3，掉落更容易出好东西。' },
  { k: 'umbrella', n: '旅行阳伞', ic: 'umbrella', q: 'N', look: 'umbrella', eff: { dmgTaken: 0.8 }, t: '受到的伤害 -20%。撑开就淋不到。' },
  { k: 'vest', n: '刺荨麻背心', ic: 'vest', q: 'N', look: 'cape', eff: { thorns: 8 }, t: '碰到你的敌人受到 8 点伤害。' },
  { k: 'bone', n: '鲸骨铠甲', ic: 'bone', q: 'SSR', look: 'armor', eff: { hp: 4, speed: 0.9 }, t: '最大生命 +2 心，移动速度 -10%。' },
  { k: 'eyeball', n: '☆精制义眼☆', ic: 'eyeball', q: 'N', look: 'eyepatch', eff: { autoAim: true, crit: 0.08 }, t: '不用瞄准，泪弹自己找最近的敌人。暴击率 +8%。' },
  { k: 'lantern', n: '☆噩梦魂灯☆', ic: 'lantern', q: 'SSR', look: 'lantern', eff: { vision: 90, luck: 1 }, t: '视野变大，房间看得更清，幸运 +1。' },
  { k: 'ribbon', n: '银色方扣缎带', ic: 'ribbon', q: 'N', look: 'ribbonTail', eff: { coinMul: 1.3 }, t: '银芯掉落 +30%。' },
  { k: 'tear', n: '人鱼泪珠', ic: 'tear', q: 'N', look: 'tearDrop', eff: { revive: 1 }, t: '本局第一次死亡时原地复活，回 1 心。' },
  { k: 'book', n: '求知读书轮', ic: 'book', q: 'SSR', look: 'book', eff: { healRoom: 1 }, t: '每清空一个房间回复半颗心。头顶一直顶着一本书。' },
  { k: 'lamp', n: '先知的许愿灯', ic: 'lamp', q: 'N', look: 'wishLamp', eff: { chargeMul: 1.6 }, t: '钥令充能速度 +60%。' },
  { k: 'core', n: '纯银之核', ic: 'core', q: 'SR', look: 'coreAura', eff: { floorCoins: 25 }, t: '每通过一层额外获得 25 银芯。' },
  { k: 'wine', n: '群星之酒', ic: 'wine', q: 'N', look: 'stars', eff: { critMul: 0.6 }, t: '暴击伤害 +60%。喝多了眼前全是星星。' },
  { k: 'jaw', n: '镭射颌骨', ic: 'jaw', q: 'N', look: 'jawGlow', eff: { explodeKill: true }, t: '击杀敌人时引发小范围爆炸。下巴那道缝在发红光。' },

  // ---- 第二批：这一批全身上下都能挂，戴上去一眼看得出来是哪件
  { k: 'tophat', n: '诡术礼帽', ic: 'tophat', q: 'N', look: 'topHat', eff: { dmgMul: 1.18, luck: 1 }, t: '泪弹伤害 +18%，幸运 +1。帽子里有东西在动，别往里看。' },
  { k: 'chime', n: '蛊惑风铃', ic: 'chime', q: 'N', look: 'windChime', eff: { rate: 1.12, tearSize: 0.9 }, t: '射击频率 +12%，泪弹小一点。风铃响的时候，房间里的东西会慢半拍。' },
  { k: 'bell', n: '哀嚎摇铃', ic: 'bell', q: 'N', look: 'collarBell', eff: { dmg: 1.1, thorns: 5 }, t: '泪弹伤害 +1.1，碰到你的敌人受 5 点伤害。摇一下，它就叫。' },
  { k: 'veil', n: '无名之神的面纱', ic: 'veil', q: 'SR', look: 'veil', eff: { dmgTaken: 0.8, vision: -55 }, t: '受到的伤害 -20%，但视野变小。看不见的东西，也一样看不见你。' },
  { k: 'wallet', n: '崭新的钱包', ic: 'wallet', q: 'N', look: 'satchel', eff: { roomCoins: 3 }, t: '清空房间时额外掉 3 银芯。里面的钱不是你的，但也没人来要。' },
  { k: 'crow', n: '厄运仪式鸟', ic: 'crow', q: 'N', look: 'crow', eff: { crit: 0.1, dmgMul: 1.05 }, t: '暴击率 +10%，伤害 +5%。它落在肩上就不走了，赶也赶不走。' },
  { k: 'pipe', n: '哭泣烟斗', ic: 'pipe', q: 'N', look: 'pipe', eff: { healKill: 7, speed: 0.93 }, t: '每击杀 7 个敌人回复半颗心，移动速度 -7%。烟一直往眼睛上飘。' },
  { k: 'ring', n: '深海戒指', ic: 'ring', q: 'SR', look: 'pawRing', eff: { pierce: 1, tearSpeed: 0.92 }, t: '泪弹多穿透 1 个敌人，速度 -8%。戴在前爪上，有点松。' },
];

// ------------------------------------------------------------------ 密契（小饰品，一局最多带一件）
export const TRINKETS = [
  { k: 'deus', n: '机械降神', ic: 'deus', eff: { chargeMul: 1.4 }, t: '钥令充能速度 +40%。' },
  { k: 'rabbit', n: '诅咒兔', ic: 'rabbit', eff: { luck: 2 }, t: '幸运 +2。' },
  { k: 'ring36', n: '36室之环', ic: 'ring36', eff: { speed: 1.07 }, t: '移动速度 +7%。' },
  { k: 'feast', n: '远方的欢宴', ic: 'feast', eff: { roomCoins: 2 }, t: '清空房间时额外掉 2 银芯。' },
  { k: 'wolf', n: '荒原狼', ic: 'wolf', eff: { dmgMul: 1.12 }, t: '泪弹伤害 +12%。' },
  { k: 'chrysalis', n: '少女之蛹', ic: 'chrysalis', eff: { invulnBonus: 0.4 }, t: '受伤无敌时间 +0.4 秒。' },
  { k: 'antinomy', n: '二律背反', ic: 'antinomy', eff: { crit: 0.08 }, t: '暴击率 +8%。' },
  { k: 'april', n: '四月礼赞', ic: 'april', eff: { healRoom: 1 }, t: '每清空 3 个房间回复半颗心。' },
];

// ------------------------------------------------------------------ 钥令（主动道具，占一格，按空格 / 点按钮放）
// 名字全部是游戏自带的钥令（data/boot.json 的 dict.key），效果按地牢的需要重写：
// 原作是卡牌回合制，这里得是一按就见效的东西。cd 是冷却秒数，charges 只用于说明强度。
export const ACTIVES = [
  { k: 'dash', n: '跨越回溯之扉', ic: 'dash', cd: 5, charges: 3, t: '朝瞄准方向瞬移一段，落地有 0.5 秒无敌。' },
  { k: 'nova', n: '不落的太阳', ic: 'nova', cd: 7, charges: 2, t: '以自身为中心炸开一圈，造成 26 点伤害并击退。' },
  { k: 'twin', n: '全部的她', ic: 'twin', cd: 12, charges: 2, t: '分出一只小猫，12 秒内自己帮你打。' },
  { k: 'slow', n: '仲夏之梦', ic: 'slow', cd: 9, charges: 2, t: '全房间的敌人减速 60%，持续 6 秒。' },
  { k: 'shield', n: '注射守护', ic: 'shield', cd: 13, charges: 2, t: '3 秒内免疫伤害，并把身边的弹幕一起清掉。换成血就打折了。' },
  { k: 'snipe', n: '一声枪响', ic: 'snipe', cd: 9, charges: 2, t: '朝瞄准方向打出一发贯穿一切的重弹，40 点伤害，墙才会拦住它。' },
  { k: 'plague', n: '虚无瘟疫', ic: 'plague', cd: 11, charges: 2, t: '给房间里每个敌人上毒，8 秒内每秒掉 3 点，毒死也算击杀。' },
  { k: 'chain', n: '不灭的雷光', ic: 'chain', cd: 8, charges: 3, t: '雷光在敌人之间连跳 6 次，每跳 14 点伤害，越跳越远。' },
  { k: 'draw', n: '不平等交换', ic: 'draw', cd: 30, charges: 1, t: '立刻从这一层的东西里拿一件造物。等价交换的意思是：你说不上话。' },
  { k: 'mend', n: '泣血的圣心', ic: 'mend', cd: 22, charges: 1, t: '原地回 2 颗心。心是别人的，疼是自己的。' },
];

// ------------------------------------------------------------------ 敌人
// draw 决定画法（见 js/binding-draw.js 的 drawEnemy），ai 决定行为。
// ------------------------------------------------------------------ 怪物
// 全部是游戏自带的怪物图鉴条目（data/boot.json 的 dict.monster），名字、英文名、
// 图鉴描述都照原样，art 指向 data/binding-art.json 里 monsters 那张立绘。
// 数值和 AI 是这一夜的地牢需要的部分，原作里是回合制，这里得自己给行为。
//   ai: chase 直追 / keep 拉开距离射 / orbit 绕圈射 / dash 蓄力冲 / blink 闪现
export const ENEMIES = {
  follower: {
    n: '提灯教众', en: 'Lightbearer Followers', art: 'follower', cls: '普通',
    desc: '提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。',
    hp: 9, r: 12, sp: 52, dmg: 1, ai: 'chase', c: '#3b2b58', c2: '#b9a3f0',
  },
  dog: {
    n: '融蚀野犬', en: 'Frenzied Wild Dog', art: 'dog', cls: '普通',
    desc: '身上满是融蚀痕的流浪犬，它的攻击迅猛而连续。',
    hp: 8, r: 12, sp: 86, dmg: 1, ai: 'chase', wobble: 1, c: '#2b2f3d', c2: '#9fb0d8',
  },
  clump: {
    n: '协作型融蚀体', en: 'Collaborative Dissolute', art: 'clump', cls: '普通',
    desc: '融蚀浆中诞生的小型怪物，威胁性较低。',
    hp: 11, r: 11, sp: 42, dmg: 1, ai: 'orbit', c: '#1d2230', c2: '#8d9cc0',
    shoot: { cd: 2.4, n: 1, sp: 122, dmg: 1 },
  },
  surgeon: {
    n: '手术医生', en: 'Surgeon', art: 'surgeon', cls: '普通',
    desc: '医生的刀刃本应切除伤病，他们却用其带来疼痛。攻击力很高的个体。',
    hp: 13, r: 12, sp: 66, dmg: 2, ai: 'dash', c: '#c9d2e4', c2: '#8d99b5',
  },
  waxman: {
    n: '蜡像绅士', en: 'Wax Sculpture Gentleman', art: 'waxman', cls: '普通',
    desc: '垂头丧气的新派绅士，厌恶一切柔软的东西，包括他自己。',
    hp: 19, r: 14, sp: 34, dmg: 1, ai: 'chase', c: '#d8cfbb', c2: '#8a7a63',
  },
  abscess: {
    n: '双生脓疱', en: 'Twin Abscesses', art: 'abscess', cls: '普通',
    desc: '双生的命运纠缠于一体，相互牵扯，相互裹挟，无处可逃。',
    hp: 16, r: 15, sp: 38, dmg: 1, ai: 'chase', split: 2, c: '#3a2430', c2: '#e0697f',
  },
  claw: {
    n: '奔袭之足', en: 'Hunting Dog\'s Claw', art: 'claw', cls: '精英',
    desc: '自其他维度撕裂缝隙而来的追逐之足，捕捉每个冒失的灵魂。',
    hp: 22, r: 14, sp: 92, dmg: 1, ai: 'dash', c: '#6b3550', c2: '#ff8fc4',
  },
  chanter: {
    n: '「永恒助祭」', en: 'Chanter', art: 'chanter', cls: '精英',
    desc: '永恒之国的低级祭司，在得到主祭首肯前，祂们不被允许踏入神殿。',
    hp: 26, r: 15, sp: 44, dmg: 1, ai: 'blink', c: '#4a2f6b', c2: '#c08bff',
    shoot: { cd: 2.4, n: 8, sp: 110, dmg: 1, spread: Math.PI * 2 },
  },
  hunter: {
    n: '维度猎手', en: 'Dimensional Hunter', art: 'hunter', cls: '精英',
    desc: '游离的维度碎片拼合而成的异兽，与祂的战利品和谐相处。',
    hp: 24, r: 15, sp: 56, dmg: 1, ai: 'blink', c: '#4a3a2a', c2: '#d8b476',
    shoot: { cd: 2.8, n: 3, sp: 116, dmg: 1, spread: 0.5 },
  },
};

// ------------------------------------------------------------------ 首领
// 五个首领都是图鉴里真有的 Boss（13956 / 13958 / 14047 / 13986 / 13976），立绘取 BOSSSIZE 那张。
// 画成「悬着的肖像」：圆形底 + 真素材 + 旋转的框，和以撒里那种飘着的头是同一个路数。
// atks 是行为表，按顺序循环：ring 环射 / aimed 散射 / summon 召唤 / charge 蓄力冲 /
// spiral 旋转螺旋 / rain 落点砸下
export const BOSSES = {
  b1: {
    n: '「守灯人」', en: 'Guardian of the Lantern', art: 'b1', cls: 'Boss',
    desc: '提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。',
    sub: '第一层的提灯教牧，灯一直没熄过',
    hp: 150, r: 34, sp: 46, atks: ['ring', 'aimed', 'summon'], ringN: 14, ringSp: 105,
  },
  b2: {
    n: '「劳伦斯先生」', en: 'Mr. Lawrence', art: 'b2', cls: 'Boss',
    desc: '他早已被繁重的任务压弯了背脊。工作、工作、工作——这就是他现在的全部。',
    sub: '解剖教室里的蜡像绅士，走路没有声音',
    hp: 210, r: 38, sp: 58, atks: ['charge', 'ring', 'summon'], ringN: 18, ringSp: 118,
  },
  b3: {
    n: '「查泰德夫人」', en: 'Lady Chatterley', art: 'b3', cls: 'Boss',
    desc: '红酒、甜品、美好的恋爱都已离她远去。站在你面前的，是一位充满怨念的失意者。',
    sub: '蜡像馆的现任馆长，第七尊，也是唯一还在动的那尊',
    hp: 280, r: 36, sp: 50, atks: ['summon', 'aimed', 'spiral'], ringN: 16, ringSp: 112,
  },
  b4: {
    n: '「以眼还眼」', en: 'An Eye for an Eye', art: 'b4', cls: 'Boss',
    desc: '群聚在地下的蜡像弃儿。时刻准备着，为罗杰斯大人的艺术献出一切！',
    sub: '天台上面那一群蜡像弃儿，替你看了整晚',
    hp: 340, r: 40, sp: 54, atks: ['ring', 'aimed', 'charge', 'summon'], ringN: 22, ringSp: 128,
  },
  b5: {
    n: '扳手杰克逊', en: 'Wrench Jackson', art: 'b5', cls: 'Boss',
    desc: '他的橄榄球护具看起来很不合身，但生满铁锈的扳手却不乏威力，能造成大量伤口。',
    sub: '锅炉房的校工，一直在修一台早就没人用的锅炉',
    hp: 300, r: 38, sp: 56, atks: ['charge', 'aimed', 'ring', 'summon'], ringN: 18, ringSp: 118,
  },
  b6: {
    n: '「大魔术师霍迪妮」', en: 'The Great Magician Houdini', art: 'b6', cls: 'Boss',
    desc: '大魔术师霍迪妮闪亮登场！根据海报上的自我介绍，曾有41人在她的演出现场失踪。',
    sub: '礼堂的驻场魔术师，海报在那儿贴了四十一年',
    hp: 360, r: 36, sp: 52, atks: ['summon', 'rain', 'ring', 'spiral'], ringN: 20, ringSp: 124,
  },
  b7: {
    n: '「审判」的使徒', en: 'The Apostle of Judgment', art: 'b7', cls: 'Boss',
    desc: '她抛却人形，抛却人性，只为带来虚幻的幸福。但极端的善举是否还能被称为善举？',
    sub: '礼拜堂尽头那个不肯闭眼的使徒',
    hp: 400, r: 40, sp: 50, atks: ['rain', 'ring', 'aimed', 'charge', 'summon'], ringN: 22, ringSp: 130,
  },
  b8: {
    n: '「万物寂灭」', en: 'The Void Claims All', art: 'b8', cls: 'Boss',
    desc: '融蚀浆平等地赐予万物死亡。万物寂灭合一。',
    sub: '深渊底部那一滩会站起来的东西，它记得每一个掉下来的人',
    hp: 520, r: 42, sp: 44, atks: ['rain', 'ring', 'spiral', 'summon'], ringN: 26, ringSp: 128,
  },
};

// ------------------------------------------------------------------ 楼层
// pool 里放的是 ENEMIES 的 key。music 对应 js/binding-audio.js 的曲目键，
// theme 对应 js/binding-draw.js 的地板/墙面配色。越往下，精英越多。
export const FLOORS = [
  { n: '一层 · 晚自习走廊', theme: 'wood', music: 'hall', rooms: 9, pool: ['follower', 'follower', 'dog', 'clump'], boss: 'b1', tip: '走廊尽头的灯是坏的' },
  { n: '二层 · 解剖教室', theme: 'tile', music: 'lab', rooms: 10, pool: ['surgeon', 'waxman', 'abscess', 'dog'], boss: 'b2', tip: '别碰泡在罐子里的东西' },
  { n: '三层 · 蜡像馆', theme: 'wax', music: 'wax', rooms: 10, pool: ['waxman', 'waxman', 'surgeon', 'abscess', 'chanter'], boss: 'b3', tip: '馆里的规矩只有一条：不要碰展品' },
  { n: '四层 · 天台与梦', theme: 'stone', music: 'roof', rooms: 11, pool: ['claw', 'chanter', 'hunter', 'waxman'], boss: 'b4', tip: '上面没有天台，只有一群不肯散的东西' },
  { n: '五层 · 锅炉房', theme: 'boiler', music: 'boiler', rooms: 11, pool: ['surgeon', 'abscess', 'hunter', 'claw'], boss: 'b5', tip: '管子还是烫的，说明下面还在烧' },
  { n: '六层 · 大礼堂', theme: 'opera', music: 'opera', rooms: 11, pool: ['waxman', 'chanter', 'hunter', 'claw'], boss: 'b6', tip: '海报上从来没印过这一场' },
  { n: '七层 · 长明礼拜堂', theme: 'chapel', music: 'chapel', rooms: 12, pool: ['chanter', 'chanter', 'hunter', 'claw', 'abscess'], boss: 'b7', tip: '灯一直亮着，可这里没人祷告' },
  { n: '八层 · 融蚀深渊', theme: 'abyss', music: 'abyss', rooms: 12, pool: ['claw', 'hunter', 'chanter', 'abscess'], boss: 'b8', tip: '融蚀的尽头是梦，梦的尽头也是融蚀' },
];

// ------------------------------------------------------------------ 文案
export const TEXT = {
  title: '校猫的结合',
  sub: 'The Binding of School Cat',
  intro: '弥萨格大学的夜里，校猫掉进了地下室。往下走八层，捡起这里散落的造物，把自己改造成另一只猫。',
  tip: 'WASD / 摇杆 移动 · 鼠标或方向键 射击 · 空格 钥令 · F 自动攻击 · Esc 暂停',
  deadTitle: '这一夜到此为止',
  winTitle: '校猫爬出来了',
  winSub: '天亮了。走廊还是那条走廊，猫不太一样了。',
};
