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
// officer 直接换一张原图（小煤球二世，戴军帽），所以轮廓都不一样。
export const COSTUMES = [
  { k: 'plain', n: '小煤球', hint: '校门口那只，谁都能摸。', unlock: null },
  { k: 'officer', n: '小煤球二世', hint: '戴上军帽的二代目，表情都没变。', unlock: { type: 'clear', v: 1 } },
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
export const ACTIVES = [
  { k: 'dash', n: '跨越回溯之扉', ic: 'dash', cd: 5, charges: 3, t: '朝瞄准方向瞬移一段，落地有 0.5 秒无敌。' },
  { k: 'nova', n: '不落的太阳', ic: 'nova', cd: 7, charges: 2, t: '以自身为中心炸开一圈，造成 26 点伤害并击退。' },
  { k: 'twin', n: '全部的她', ic: 'twin', cd: 12, charges: 2, t: '分出一只小猫，12 秒内自己帮你打。' },
  { k: 'slow', n: '仲夏之梦', ic: 'slow', cd: 9, charges: 2, t: '全房间的敌人减速 60%，持续 6 秒。' },
];

// ------------------------------------------------------------------ 敌人
// draw 决定画法（见 js/binding-draw.js 的 drawEnemy），ai 决定行为。
export const ENEMIES = {
  crawler: { n: '煤渣团', draw: 'blob', hp: 9, r: 12, sp: 54, dmg: 1, ai: 'chase', c: '#2b3140', c2: '#9fb0d8' },
  eye: { n: '游荡之眼', draw: 'eye', hp: 10, r: 13, sp: 40, dmg: 1, ai: 'keep', keep: 130, shoot: { cd: 2.2, n: 1, sp: 130, dmg: 1 }, c: '#c8d4ee', c2: '#ff6b6b' },
  bat: { n: '灰羽', draw: 'bat', hp: 7, r: 11, sp: 92, dmg: 1, ai: 'chase', wobble: 1, c: '#3a3f52', c2: '#8b96b9' },
  spider: { n: '撕裂之足', draw: 'spider', hp: 12, r: 12, sp: 58, dmg: 1, ai: 'dash', c: '#241f2b', c2: '#c58bff' },
  blob: { n: '脓疱', draw: 'blob', hp: 16, r: 15, sp: 38, dmg: 1, ai: 'chase', split: 2, c: '#3a2430', c2: '#e0697f' },
  wisp: { n: '灯芯', draw: 'wisp', hp: 13, r: 12, sp: 46, dmg: 1, ai: 'orbit', shoot: { cd: 2.6, n: 3, sp: 115, dmg: 1, spread: 0.5 }, c: '#e8c07a', c2: '#ffd98a' },
  wraith: { n: '肖像幽灵', draw: 'wraith', hp: 26, r: 17, sp: 44, dmg: 1, ai: 'blink', shoot: { cd: 2.4, n: 8, sp: 110, dmg: 1, spread: Math.PI * 2 }, c: '#8892b8', c2: '#e0e6ff', art: 'b1' },
};

// ------------------------------------------------------------------ 首领
// 画成「悬着的肖像」：圆形底 + 真素材 + 旋转的框，和以撒里那种飘着的头是同一个路数。
export const BOSSES = {
  b1: { n: '守灯人', sub: '第一层的提灯教牧，灯一直没熄过', art: 'b1', hp: 150, r: 34, sp: 46, atks: ['ring', 'aimed', 'summon'], ringN: 14, ringSp: 105 },
  b2: { n: '劳伦斯先生', sub: '解剖教室里的蜡像绅士，走路没有声音', art: 'b2', hp: 230, r: 38, sp: 58, atks: ['charge', 'ring', 'summon'], ringN: 18, ringSp: 118 },
  b3: { n: '「以眼还眼」', sub: '天台上面那只眼睛，替你看了整晚', art: 'b3', hp: 320, r: 40, sp: 54, atks: ['ring', 'aimed', 'charge', 'summon'], ringN: 22, ringSp: 128 },
};

// ------------------------------------------------------------------ 楼层
export const FLOORS = [
  { n: '一层 · 晚自习走廊', theme: 'wood', rooms: 9, pool: ['crawler', 'crawler', 'eye', 'bat'], boss: 'b1', tip: '走廊尽头的灯是坏的' },
  { n: '二层 · 解剖教室', theme: 'tile', rooms: 10, pool: ['crawler', 'eye', 'spider', 'blob'], boss: 'b2', tip: '别碰泡在罐子里的东西' },
  { n: '三层 · 天台与梦', theme: 'stone', rooms: 11, pool: ['bat', 'spider', 'wisp', 'wraith'], boss: 'b3', tip: '上面没有天台，只有一只眼睛' },
];

// ------------------------------------------------------------------ 文案
export const TEXT = {
  title: '校猫的结合',
  sub: 'The Binding of School Cat',
  intro: '弥萨格大学的夜里，校猫小煤球掉进了地下室。往下走，捡起这里散落的造物，把自己改造成另一只猫。',
  tip: 'WASD / 摇杆 移动 · 鼠标或方向键 射击 · 空格 钥令 · Esc 暂停',
  deadTitle: '这一夜到此为止',
  winTitle: '校猫爬出来了',
  winSub: '天亮了。走廊还是那条走廊，猫不太一样了。',
};
