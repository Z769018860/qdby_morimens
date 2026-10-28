// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持顶层 await，顺序即依赖顺序。

// ---- js/binding-data.js
const m_binding_data = await (async () => {

// 「校猫的结合」的全部静态数据：毛色 / 瞳色 / 造型 / 造物 / 密契 / 钥令 / 敌人 / 首领 / 楼层。
//
// 设计对照：以撒的结合里「道具改变外观」是核心乐趣，所以这里的每件造物都同时给了
// 一组数值和一个挂件（look），捡到之后校猫身上会多一样东西——帽子、眼镜、披风、提灯……
// 数值只是外壳，真正想让人一直捡下去的是「这只猫被我改成什么样了」。

// ------------------------------------------------------------------ 手感常量
const TUNE = {
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
const FURS = [
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
const EYES = [
  { k: 'gold', n: '金瞳', c: '#f4c850', g: '#ffb43c', unlock: null },
  { k: 'jade', n: '碧瞳', c: '#7be3b0', g: '#28c98a', unlock: { type: 'floor', v: 1 } },
  { k: 'blood', n: '赤瞳', c: '#ff6b5e', g: '#e0332b', unlock: { type: 'kills', v: 40 } },
  { k: 'cyan', n: '苍瞳', c: '#8fd8ff', g: '#39a8ff', unlock: { type: 'floor', v: 2 } },
  { k: 'violet', n: '紫瞳', c: '#c7a4ff', g: '#8b5cf6', unlock: { type: 'items', v: 5 } },
  { k: 'void', n: '空瞳', c: '#eef2ff', g: '#9fb4ff', unlock: { type: 'clear', v: 1 } },
];

// ------------------------------------------------------------------ 造型
// officer 直接换一张原图（小煤球二世，戴军帽），所以轮廓都不一样。
const COSTUMES = [
  { k: 'plain', n: '小煤球', hint: '校门口那只，谁都能摸。', unlock: null },
  { k: 'officer', n: '小煤球二世', hint: '戴上军帽的二代目，表情都没变。', unlock: { type: 'clear', v: 1 } },
];

// ------------------------------------------------------------------ 造物
// eff 里能用的字段（全部由 applyItem 处理，见 js/binding.js）：
//   hp / dmg / rate / shots / pierce / crit / critMul / speed / tearSpeed / range /
//   luck / coinMul / chargeMul / vision / thorns / healKill / healRoom / revive /
//   autoAim / explodeKill / invulnBonus / dmgTaken / tearSize / floorCoins
const ITEMS = [
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
const TRINKETS = [
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
const ACTIVES = [
  { k: 'dash', n: '跨越回溯之扉', ic: 'dash', cd: 5, charges: 3, t: '朝瞄准方向瞬移一段，落地有 0.5 秒无敌。' },
  { k: 'nova', n: '不落的太阳', ic: 'nova', cd: 7, charges: 2, t: '以自身为中心炸开一圈，造成 26 点伤害并击退。' },
  { k: 'twin', n: '全部的她', ic: 'twin', cd: 12, charges: 2, t: '分出一只小猫，12 秒内自己帮你打。' },
  { k: 'slow', n: '仲夏之梦', ic: 'slow', cd: 9, charges: 2, t: '全房间的敌人减速 60%，持续 6 秒。' },
];

// ------------------------------------------------------------------ 敌人
// draw 决定画法（见 js/binding-draw.js 的 drawEnemy），ai 决定行为。
const ENEMIES = {
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
const BOSSES = {
  b1: { n: '守灯人', sub: '第一层的提灯教牧，灯一直没熄过', art: 'b1', hp: 150, r: 34, sp: 46, atks: ['ring', 'aimed', 'summon'], ringN: 14, ringSp: 105 },
  b2: { n: '劳伦斯先生', sub: '解剖教室里的蜡像绅士，走路没有声音', art: 'b2', hp: 230, r: 38, sp: 58, atks: ['charge', 'ring', 'summon'], ringN: 18, ringSp: 118 },
  b3: { n: '「以眼还眼」', sub: '天台上面那只眼睛，替你看了整晚', art: 'b3', hp: 320, r: 40, sp: 54, atks: ['ring', 'aimed', 'charge', 'summon'], ringN: 22, ringSp: 128 },
};

// ------------------------------------------------------------------ 楼层
const FLOORS = [
  { n: '一层 · 晚自习走廊', theme: 'wood', rooms: 9, pool: ['crawler', 'crawler', 'eye', 'bat'], boss: 'b1', tip: '走廊尽头的灯是坏的' },
  { n: '二层 · 解剖教室', theme: 'tile', rooms: 10, pool: ['crawler', 'eye', 'spider', 'blob'], boss: 'b2', tip: '别碰泡在罐子里的东西' },
  { n: '三层 · 天台与梦', theme: 'stone', rooms: 11, pool: ['bat', 'spider', 'wisp', 'wraith'], boss: 'b3', tip: '上面没有天台，只有一只眼睛' },
];

// ------------------------------------------------------------------ 文案
const TEXT = {
  title: '校猫的结合',
  sub: 'The Binding of School Cat',
  intro: '弥萨格大学的夜里，校猫小煤球掉进了地下室。往下走，捡起这里散落的造物，把自己改造成另一只猫。',
  tip: 'WASD / 摇杆 移动 · 鼠标或方向键 射击 · 空格 钥令 · Esc 暂停',
  deadTitle: '这一夜到此为止',
  winTitle: '校猫爬出来了',
  winSub: '天亮了。走廊还是那条走廊，猫不太一样了。',
};
return { TUNE, FURS, EYES, COSTUMES, ITEMS, TRINKETS, ACTIVES, ENEMIES, BOSSES, FLOORS, TEXT };
})();

// ---- js/binding-art.js
const m_binding_art = await (async () => {

// 由 scripts/build_binding_art.mjs 从 data/binding-art.json 生成，请勿手改。
// 全部素材都是 data URI：四十多张图合成一次传输，页面只发一个脚本请求。
const ART = {"cat":"data:image/webp;base64,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","cat2":"data:image/webp;base64,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","coin":"data:image/webp;base64,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","items":{"heart":"data:image/webp;base64,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","blood":"data:image/webp;base64,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","clamp":"data:image/webp;base64,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","ink":"data:image/webp;base64,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","ruby":"data:image/webp;base64,UklGRowWAABXRUJQVlA4WAoAAAAQAAAAdwAAdwAAQUxQSC8NAAABAUhuIzmSoMiy05H/f3BVu1lzjuj/BPAv9tJaaw/tM1u7EREGTLehjHEtVjgO2HyeuSjpQoTNjczMsxkRSYB1Apm5kyMCdCFslTKuSY7YsXxqvRKSbWAAxS46wVIpAAsIFmn3kYopZdfEek2b6QlqzRJI2tg6DgB7To7DDjGpF6SdO0CEZubJGGNXSm6Xfkbv2gPYjqi1XirOdGyAyEwu0JudDrtsbJvrdria/QM4uPCkTa0v0OCVn8hQkLYB0/pXviMgItSmbcDgOfUMCvjBUBN7FM6RVWJbgc7BDtaxhWz/MA8O/i8REzABvrD/X9w2/r/n8z0zkgwxhXFDC+kn3TQMy8zMVFhmZmZm5i0zQ65yF8pN4oaZ7JjtRDjWzLzf79eBNJJHds4+BxExAcT/QtYnZwMilnGCSpnSWCEESBAAKFVEBABkiiIAgiBIkABjrIglAYBTEQGQigQsLKBAAoBSCmIsSUzJBEEqGus2d7U1L0qnFre7KQSnhkb6RgvWgapGcAqhEKSikqj1nC2rly5wItQq2d7d92wfUg5BAAKQUwMBEsqhwfyXvG1TM+KDQmDFSbdmAJy8/Zb9BgSJKZMgqRyxLavf+KrFqD7Ws6dnYHi0aC2bO+Yv3rhyJvytf90L0CErZNIRoFIO7KKXv2ljBpWl/Y/t7FN6MKJYbUUANs1Z8epN7WP/cmdk+02FYLITUMpVZvEF71qIyvKeBx46kV/91cXek18bs0aMgeN6xOLnvf5pwJoVm1r+HhDWTjqQSknTe96Cqr3333Gw6HDuxwHgrmxb/wkYgQ2XvW8l4ncVHZCcbFRKYelLUBl2b314RFtjzY8R699PQTDrgo2odeROV0iAk4cgqSS1cR2qnt52bEe3LkfByhvjCncqmNe8HXXedFIpYrIrzN48DzWO/+JaHfkf+HYc7xxv/UoH6j11MQkSnDQkFeevImrue8uIzqxHvP3BHd/GBP52wBVMakWmu1BncENx9J7FNWCgd8NE3HmbC5HJQ4ESTOiOrlomeOQXIQUQTg4BHBNNzBok/6s+irWCxicEEPf4ICbr7a5SCmw8Qir9S23M6d2nosa6VymCmAQEIOkH7kfVvRf/5s+n0dj3KJIA2FAE6ShC/VjlK0oPbRvcNYYGvxckJqFSxjr2A6ha+HPR1VujRrupH8ZCALKxsGXV0RnNVeTy68V4Co3+23EaiBACNogAIu6JCzEPsblt5zw0gob/ZR/ogCAIsCEgIqpwFGAccGne1iVBJqnHZ5nS6XHHJSrJRgDo343ER5rRgMVDd916RFEACJgcCfe27oRCc7znTY0AoP8PV4pDAQAmRQD6A2N1bFcrMjXpS3vav49kzaMDuXPObQWAy27UgKABlUDlPxHVgR92rN5Qjgtvvnv+8xYndPuPQ+0s/fhzAGDZFaBARJgMoWBX96NO+dZjWj2OIe1WyJlD3XORbOuT6xTMkUteU4FeowAR5FTm9aj7F1tl5qrclz/7vGfNQeUGScbDqmYDpP0/j1b42xWMtYIaQjnz6rv18t7XtnfveRgz1718ZTtAJBmdcNyWEAC8ExdX4PARFRmNmqRS9cnd33g/9hW1MaZ5yavPd5Ho2zc7qYhCAbxbhypwe15HUQbSjNTHmQ6hwnGhF/30whAJH/jICAVCsW7fjirHD4IQpIAgwudm6sM4ylguoQjw6DVIunj+fkcAsZBgsAqGRh1ISAna1mkT8LA5Kk/t0AoSPBolNnxBDyEWFqJVtY49bhUFAFJPtNa392F3R89TnhumEc3sQeLBLX8a8UQMRFRntVXbjAiVqNNX6nr0j8fM0H9xUWeObR9HrWf69JL2CQD2NofaiIik51SbvgwuiURFYFN3/ihb00B3OGBCub646qK/p7+KeHNw646RaNbGF67I1IcmESOC8Om6mnoGFSQRAay13ouvqUU/GTSJMe7uP+Jjex5egfxV01dO4+j+xw7krLFaN63Y/AJTF7btp4X13ofYTipSkgBExMoPL48JSwt/9o31C1y44l6xt/VLf/oYT64s9Bg0LxGxkTYWsOz66uU99Wz/gUMbfBTxszxSIIlQYG3UWc1c//MxeKs/2e9L77bHXvBl95rviOORhdTy6Toc8guRC0tFOHNXv2RTZw3RHy4Nw5bPRDV0uAAEycCI1U3VRr96+2BPBIXKkcc2zSh/6nGawHvW6+eI1QP+/sfuKyoDOI5i5inPvihu8I878i97FWpVBIikBQgGq+FUYbznpjt7W1tSqP74531/9QccxG/79n5qESrH44LL4mAHx1G/MDERnY/BodLcNTP6VSmYu35FRfCJ3eef34Jaj3ymT0q+o0B58d9qqD+0EEhSgGNLceMvFgA43XP31v/mAeBO/x2ofvThI09/dRtGc2r0f7f0OrDPvDiBXi2CBnSceXGSO9Zrpy/tAl7cdkQDMA6qHr/5wZzl9zej6rEv73TR/LMEShaNmV4VV/hIcZrNzXzeW+Zj0fQ1XYg/dMWgGP3u9znV0Pe5HPTKsYkbo1JUBBMRSP76uP+e3+VJIHbJdwG+/R1xJ255eRBE6b8/HfH3XUerP39kwrJRREcpBSZACNUNj1cLb4ocAHTMAgLTV8Wo7qwJwS5Bjf3nOvRsWeZ1TkzvfXcprRQJJgLJ/aFcUbxmQGlN0EtLqgk1NmURknRKteDH84zR9Ie4LOUE/kh7HYD541rrKEUkIAKNXbuAYxf/7N5md+6r00293T0Z7y1La5hpxAjZZGvJD4XQZaO8KLdrZxGveQkAiftP33mLX3XXP1JIWqwp3QGcfGz1l3/wwzwAnPnbffjkW2uYDVhFr+fmWv7wtSxMWdNJp/yRtRe1A6Y7iMl/di+6PnKxUkmJiPUe7sXTnvt6xNu7H137mrjo9HRDAvjQQNzAN8oioIIN3RWvXgSgtP1xibnF59CDxRDCpCDg8MOY90rUbAodcX6YBkBRv7w95sAle0EvE9nMvPM2tgPAtoMnBdVHv2S0qEBrIwkBgvKbXg6211azD0tAxN55wT/zsNkg/eT9o4PlcnPnsrX/h8qjt/glxF/2L9FRpI0RAZgMomVvbkeCtnmMFAtzZuuF53/1h1/6wUs3Q4oWmTQqc7sfyb3wq+Nxw186YozW2oogcUYvQbJLj0MEBnDdo2PZaNQu27x6lkexNsqd6H581G+ehfgW6yMwVgRgcuKtT+h53T6pXNelsU2uKJ3TrQu6MtboYKyglQs3U0PbIGG0FSEgDTAuySyf/USrl1Y69AMNAWhpracEIoDoaRnUGkSup2FFBMmLsl8ePpmIeu+ufrfoj2tQQBFFUYpCERFjznu3U8u+IaqUAtAQpLInd7hJALkwyOajtKsIQHSoFS0BQG/Xgan/j0J5PBKAMMkRAFKD9/iJAA66FoKAhOVAI+VYArDusz8Lxldst1E5JIS00ggiFv3zMsnMXLe4XSmFsFB0Wpo9gCLeyrecg/mO2wIDKgWBtWhAEVgT9bUlg+nP3tCb1a7nNrekFUU4Y83LzkWdfX88PU435UFEtDQCIYAz1NNTmz2VrQNAtudQ30iuLFabpuXrF6FuXtMv8FKuImg1GlMgcHu/XqjJv/PSJ+qqLJ3Ja2M4x6L+5q7+lOu5iiBNJA0CUKiOHKqpL1v6X4+egAQznR0pEhAoiraUxiAEwtHP/+popENTMfxgZIqXXVpqnFK6KR0ZbSxgIi0ORRqiUgQYu8vLqC1NheKx410qD5zck2+UMzeiq2zEAjocLxsAaBBWsYJTkuruhW+mOQPBkgVt+480RnSob2bzuIUVE4yXrQYgaNwKE8IyM11ZorjqQjTswMGChgaNCUt+RExCMaHFtA4vMsgt+AAaNbj/aEQXEFP2S4FgUhJi0e6c9hF4L0eD+jv+c+DVM4wYE5Q1XUxOAmJFqWyYOffTiPePFHJNK9omxo7ufbAXjEITBUEEj5i0hCjCa2t9NmL1if17U82Fk9YOranHjh3b1VOEhOUwCgILj5jUTHumTXUg1gah60KQ7+nP7Cv6NYSjxw8P+FaiwC9mQw3PIya7mxKK7ctVOzWstAbg6HHf10tXz+zMCOTMYP9Y2VodlIr57Omsk3aJxwlSEU7v4TNV9KGiFQEhlbTipD0qRFZMGPj5XPZMtuCHDonnqcQqa7keVUf6RqxDgLAQOgqKBHQYjhcLuWy2UCwHxgoxFVpdKIVB+zOr5do0tC+OsvAcCAGrw7CUz+fzxdJ4GFkRgWBq9FqaLBY9o9rYrf7Awd2R54rqbHHFRDooVZYDrY0VCARTp6LjnWE1+4i/bfdexxo40zIVRoehMVYEAoFgSqXKdJWuNVWA9d0F34ksoAhAAEG8YKp122e3PPhgUOXkzUVCUDsrBFOxEwauu+f40xaZ4b03nIIVnC2ZH8lFGNoxqPPF0ETGiJwtgsKZXJjKaEeJLodarPDsAERBaKmUQ7EVgrMmSUCsooixRoRnDRAQCAGpxFmVqC7AWeb/HwQAVlA4IDYJAAAwJwCdASp4AHgAPmEukkakIqGhKJpaCIAMCWUAee2aP2n6citgJ7Kfpc3CPO12UrPoOYX017jetBkT609RT5F9vP4nkz/wPAf4V6gX41/Q/9P51r2/lb8x6AXth9C/43hR6jV6rxLVAP9O+q3/Zf+zyy/UXsD/zj+4f9Psl+kcX2ijXyRul/bvgSEi9zlKqW3JTNAK9J3Ewau/cQccUKyfEsyxRFkPJ1C6UvjFBvTzMwhWu/54L0LwdHnd4mj+VwACYcD441cqcsznZ0/zfe3A5pqz17sdazX91KnJ52xVRMY4Ph9x8GvsL/ruo0MA1ZTJVIoUcG9WXhYlBfVcnUDIIj/eh4NPdVH3xWMnRGgTQjGrWUkuG0h7/OTdobMP3Ciw0z/iq3n2uhG/sf5Gf1DP5bMBeYVfo2ihw33wo19LjPPAAP79NmgPF0g7xeaxaxdkTZZlI+6SH7t81axTJd2WdGTYFnbupx8/p908N+zlAHfgX+mD4/8JO4DvjBBS8u/uujQgnDIH6HXU6M76knIaMGyWd5hYnI7pg2897Gm2nchdGoVl6JZRyTMs0+WTScpt05QeJ11++G1U9+F2M5Z9Gzdh2ViaX8ioFkU0ost9s7E3MG3t6UYI5YxQjF35YXMq3fW15hngVnOhqSx+kEwaW6/su73AIk0G8OYeAK+sF2JrBrs3GHO30djKskF9AdwUXEkn/8h46x3Iv/zu2np9XDLdC430KL8hYhCfMe6Osf0tr79MPuPKyDwkO8X56YyivhFAiywp02wSs9/cLxBqU+ArrQJmtIssZU0sflA/Pu9m9RMXc9/PaqSTc8GFe4zfLqlPZZ4IxwtxiLiCMY2eNrzPXt/bJIDJXTiWQ+PuThEU6vFXH06iZG4BtpTaTS/yzOK5fYNQRD/DRgWTI7su73G4qIcAlMixdLbQOngSXxBKkEdLfSIZGC6N7a18F3izJDv/S8L84RdOY12NxiH/ecigr6nf7hqOjYJ+arrAZ3h2aWWpD/u3EQ0TYYcJZmOBF/wolzdORB2D98MA3soznydPoPuOS+4k01JD8VZIb0P3ucNXfqE/h08oZ5geWEj5Y2I9BcHwyhvSNEt67pm0FLjoy3ZDS9tUpDfqp+zBuV5WawzOkPXXpA1GDh+h2ki4fmnQfpPxoFQjjoW9I8ll4W6YaFxEhF2NQ7q0PnsON7CUzv3krupYHhiWd1sgwRzoomFL68N1yF80k07VqnoVO3yH7BZsT6aO/kN7ENkXHSwUoPdBuEdZm/3tzSponCrvZQ8gi0hnrmmtryptTyoeV5V9yeyxEcSH9RR5DTKle2nDi/7x8G1w5uqpSmoYbdT/2x/oUHvg6nKid6hT4TafY2nXGE/vfrHzEC6tWbwpcKgE97lplW4eej0hhZFoAqKrWDZvKN/LAkrY2xyLAsNiw2+ZndmL/qngtvz5Bql95gB27y9hDxiE+CSxEWZAu9vILPVCsni6vZ5P0ETXXk2Qj+v49ldMIZjptZHhBr6fnhx/YsAXgsoxP+T3AgCt6mq7q0hhQd7i0ASom6fvWqjMSY3f1dvJp3OXtFlWw0dnAsEDKh7g/CUVstyJpB00G3Q+Wm3idWs2IaFz4IRxGdBTAG6NhScWkPkrwLBwBZUdBvp7Z8wOA8JfGI36fY/0xYvdua8J4Bi2ChMmPaDOELSwz+/GaE/+WPfKiAdrSIOv9falF9vt7A32wTnguoI5E3vv8FZb5YDVlJrrAQPHKoVblXVHC/gx2m9Y9GqIT7DuyNEQOHFZkEOLHDkmvlxeSFjQCKbGpXSjks6or8wlWhWVW4MSI21YJv2tY8x+30lhVz6VeeerG35IKUaVXX1Aj7elsdIitBsc80uRAEzMJ2JH8AbQcFliJZExwhVDOlXavNIKSPIyCVHt/joCvcj4MMeokU0qSnk1XT9Z2aQ+tk0jmNBHWP+kuZZaX2UlbP+s4/lmA/FneIr4hDt5um4Il5Nyi6zYrBgPuWEOLXhCbFa59m5HZKFyRwq8UbQHLfhsnY0sK/1gKkG3aPegPM3Jl0ijMaUkvV8RgC8uleSZEdndpAyX74OHNZe9r8ZwyvJIJ6aeheybxA8BR9Z5CUAzm3h32foW8x6sYKmtiOq7Pl/eRik0d8zdip+oHktACyBEqaMM9n9sTTXDgdypLq0LEK8c0SwYJ3QASBOnD/0voNmNF3gDyFkq+gZaiwp7VVx/0przt/CJr7FD66es6bY9i38I1lQejOSZhIPcLgOOdRGtSYR0pnKsWzI6F8qMEgCwtwNtOFuBbzHpBX8pmU2wmx5QjOUlvPe4GvF1sMcEAUhydF7Yiig+0UL2NOG4VGX6hSoZ2HEHyZiCf6hMwP4z1fKUduVkftYwg6jGQQgNfkzHyq4cd3TtBjBJNedbxcXN1/PzgJNFbI3bddxn5FAWiTgePK6cX/bgx76bWJCIcNs+sJ7CjnhkkMHevWjEqUF7YNoj+s8pDKM0t93zLvR9QU0sjoeE6QXS//XQ7ZubYbGrNctwE2TvtUbxvILRqmJtjR0ihtU1TNKd4oXJzzrxrEkbkIlQQQtQSiGrywEMoCst+fC7P1HqAvBFIje4XifWFuxuPrIgim0E7aKSd+cRFj1n/vWH4zMCqKBisk/Elfdm/+ScvvdXg0Ysi84gLgugnBFb34gspPuPEz4IskyxHAiHD/hQBvMoquHP3Pw/fuHihYNchYJdyuwW/pO2Gomvl2E3myIt8k/NpprLr6JXBOn5+mCQPDSgtKR9WdkA7MRfvpAf643PTJocSvlGbH7KJkCo2NR2/MKJtE9gaBfowYHL/jWHbnd9VwrGc/pdrbnUb/yYQAOo+rZFvrUzGKM2Bo1toGz13m0/d6/pvHI2DLfkziR6bq9frp8jIE8/H6MW0hp8MhuG+xmKHgLd9cpvrozR0lzt/nnYt/XDTVZlY1up/+MN0eif47Yog3Nswx2hKDmp8i/SL3Sy4zHxdU1TcnMIYocPUvUSjgsbawGMu/J4x0/lPhcOPNpnxbxtx/THIwbaEJRl6H0ov1W9ePA6RUNsSHJ9gZUWn0Vr9Og7xOGeXrr9y9t0cG8D4ogxmXqr8KmWERh3XcD0wNrVPNvlA0F6x5e2qHQGLMv9QABZ25KAAAAAAAA=","fan":"data:image/webp;base64,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","lock":"data:image/webp;base64,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","kaleido":"data:image/webp;base64,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","prism":"data:image/webp;base64,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","mirror":"data:image/webp;base64,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","plano":"data:image/webp;base64,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","watch":"data:image/webp;base64,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","dial":"data:image/webp;base64,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","butterfly":"data:image/webp;base64,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","umbrella":"data:image/webp;base64,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","vest":"data:image/webp;base64,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","bone":"data:image/webp;base64,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","eyeball":"data:image/webp;base64,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","lantern":"data:image/webp;base64,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","ribbon":"data:image/webp;base64,UklGRq4YAABXRUJQVlA4WAoAAAAQAAAAdwAAdwAAQUxQSH4RAAAB/yckSPD/eGtEpO4TENs2kiSV7drrqWt1/gHPE0NE/yegXgXnnPOSQHd3VakqSehrdYW/9RD71zXZnsw8gW24YRtwMzMSM17KanFP4iUZJOkN8yid/yWzNxAwLOFruxOALOlqQPqib98ZDNq2ERTzh73t/iFExAT0qGd4oRgUHbClEHqZw1ID2p0banDcW18eR1c/0tW2bZGkPM9X3b24xoTu7hASckKcl52NRkTu1P8G1d31/zU1WBQRE+AN+//DjrRt+3x//6oVO51OK213j3GMcdi2ddq27fM8bFvn2IcxnnOOQSPtpBk0kyxU/X8vqlaG5/uImAD+w1WJ3i6CXCXcomIUQuAI3goiIsJjjG5HkP0XcZE5s+7hoVUrJj+ZNHsnzExyb9Cz9rzzlndk0Bc9COnZThZivXXZWVdvDJTbXC1IFN0xGfnSl75wgCfYEZAK2SWRzPIl776W0onbfd3qgZK019zZbUExufwNyyh97F8HtX9u5Ysu7QXSHjkh+4TkC69eTfldXx5emlfH7/nusUt3ABpqgUX2JgvvOdco/9pPh4fnhFWy0Rs/+9GHgFOnbS1hdyWkbTT90KFFvXUBUUlqx67/9KPUbm5J2Ft3UCbK2w9/2NIWNNKIyfQ9Qzx4PBHPQm7VGuX5s0HSFKAljxH7nSE6qkEC7YwmpyjXISQBhBA8RuqvfCObpw3xbKvZbZRbmwiLZQzIGPkndaYnAoD74U62JzbpDQBeIhaS5ANDLNtrhb1McPexKuVDFWRlwKyS/+FVdJ0+aY7vBeCcnKV8YTtaBcjS+Jrfg97RgLNRqxYh/eK2/wTlw/0R1ToppGHrB2BgtO5ONiCEq8iT73iY3E35I49RoqvAo44eg/R5SoIcJ4QMJzX0JDnuPrON8nseV+npjnNqP3BlXzADBxlI1MPGFUcTyb2PO/mOrMlzJy3VVeDu2V5g1ToSM6NcRr3jeW/8wHuPP1INHntp9BTlTz+aqaSze34IaLmAYDLa1Ki84u2Rja2VsGMMpQduew9RPvJ4Crvh2g9wQSWEQQHVzv8Dp7zv2AONCuQqx92mt1PefoE12c1xpjJg8wIzwAHA7Ovfxzwrh+763YRrxd2rj9D0kk6r6O9Rx2aBRRtIZGSSevXLmP+9ny9yVcS3zTXZvManKvsBMzUg2UIYoWJ3Tvnp7/y0seKXB18y4iapmRDDzknKW48esdaCvZL4ywmATS02BMLUSsp3/tWDTvVDbx5Y7SbmqW7jj9O0ZbucMPbXkjXdVoK9ZNnkirLD+ycCsiOEpZI0D/SZe2jat6uGh6GhzRUWDWvR346OhBLVRdUtO4X63URTQe450yStHQruyYiQ+WShe60m0k+1EyMU50yxnilkXWDGPNDatp+m/TvcneF/TRVsvU3SXelYnwrXLnSjEZUzAAmiqTr9fB9Ne6dPyt0HJakX2NDSTUdxbClA/2+2BFOGaFsPmYRUUP3rnmwe+wyeMkheMtROAXYoSA6FUHjBRVSCOYqL14Mb8/W312i64FCVCDggBKiVLBr4syQdhCxfuY7i//085NFjzW8/DImkEiHCn9P89NVEBp2fLelbSCnrhQJ6PaU/rhLdxdNHQLtEs8ZbvNnMNzNbDM6VhKUorhImNd7RXXLmgQSQNT/3ATBokgC51PIGmt/47UQ2AMyWsAZZL9TwkFK+fV+CkM4v3wds7ZBJAiku7mw28+0QwA3UyzYc6SldvEr352UncyFheR/Ahg0eJOQi3xCb/XBgYqtedvecdcLDH6xj2WxJXNSNivjLov3FHoKZQPE8mjauX6QBt1A++i1bS1aAZb913lsXULrtL6uhAPV1AF42ZMGEULKh2f21xSqbtOz66Ta3sFYkh771jvay+8dAiKS++G6x+vlZYiaI/YubxK8u6gjqOEGFI7fzx18tZAWIV9H0qrabCThg49sK/PyWkEWHOJKXafhwEDJcLhc3A535aROQ6+UWB65stuJdLR84kADRZ28r4RvTHnGyrZQvOlMVgKNAwu8DBg4IcI1c1F9A8zP20hN3p8I9hhunSsbvJDqwpUwLxoN8E8K8oxu6D52R01NUXt1s9p/HtlwynKPouXZ9q4T7x8zdW9aWDR2v8rSUm1G/fAjjgLkHXSPVz+9q9uBc/10jw7nwGHM+dqwk3lM1z4Y7SqxyIOAeHCNuEskbjMG9GU5CR38zzR9a35LUMeQec0b/q4Sph5PW+tWUjpzM5DzFLsyw6rWR1umjRHd6xt6Lm2U/X+cYZorRY2afubWEsen93c8vCd0TgadWQDXD5ta/AcIOubtjB83+5RsuKJs6tSRKhoF7zOPcH60pIf/PrrRk4GADB+wjgGpNRsyueRu0PVIlOk+mpDB6/aFfWFf4wXtRQIKQ6bslfSXsmbi45LplSzJJSgeBIwlkkrT+JSPQ/RQ1VaEdQGn+wKKXv+Vc+NsPVKmcTfCgvrSk6Z6fLRMFrlcBhJBk8iw9/z2vaINk9aGmsugsPLHYe/HLt/7qY0iSc2CE4nwa/7J6JJPEPFVwhBCGJM9s+Mrnv6EPYKStqkqxD05MgmXWMZdzMQCCodrcPO78i3UZAvCCyyUJuUwQ82TxBVeuonxBt02TjHQPZiIqz4WzAWF24ngTv+NDR4OBEw0CCgmEzPNo3asuuHAhzYcGFcrCfo7LTC6PZ3KBACg5vq8M9vz0pmqASACpCEMeoye9I1vPHRHz7V2iYIUMlhDOWS8BUkj12pc04R3pZ3a3OB4Eqei5W9fC1Zs3DThPUL2GrGQYpUkM11maLnzgj5pVXvaq2/63lhLTWuPUO7xq9bqFgSdx8rhLSHHQ0Prbmb/f9eH7a7nSnmUbN25ZNtjBk3rwzp0xungGC+Urriq5rfb8tgLMfOOR4aUjI4NtPMmHH/nh2FjMo/MM1k2Nd1Gc/saB6d9dU/JUxqk9jz10asH6tY16ljvoxmDK1l5ScsOaDT/51Otf8hRkp8f37dw+071y7ZqFltWyPHecG6vI3k9x4q7VWTr+n7/4S51PKM6cOXZi+viBsUPTMxnL+itkUVbPY3SeuUp23taS61Yur5M0/Mp/HWlSO3P62MT4wfGJk2caWXQJz/M8giHLowN6xgDZFRQPfX8kw1GaX/qvaT596PDkkWNTp2cbmQvAJZyY5zhIJkCg0hsgkP5gUy/w5ZGlGfKYpqHfPGvEKDm4x+i4ZCaPWcyTAAjMLJiZqaW6sWKy/U5gx8+X1yWcOX7n8XjSudESYRCU5LFzeO3m5Ys/dlcFIaPojrvj7iA9jeQA/vUM//TyBVECTwvMiWhEhJlC/ey3rml3GP1pf5TMUQF3j+7RYxRCTxPhmOPJvduY+MmqDIE7aQlLQRdS0jjvNyju+O8lI/XMFSzg4BHhHvM8F4CeFnJkEEynbub06fYUcDwJiVhQRDBZtvj3Ke7+xLoNpxY8d3F/X5rk0auTU0ePTs2cqLrnSPjTQi6JWpIkVrlxYvU/f/Kx1uBFSAqNBSIhkj+huPszZ28+ceFvM//GqZk9P75v32lLBA4OA0nhNbsqmVr3/+Xci96x7Wt75TEGkIKiKURM+a9QvPuGCzfMvOkVPJlndj54bHej4u7oIN2w+vPftfBbv7bR7c4vs+D1L7j9w2n0BEqOd+dw51hFd3d96pwhoPHF3ZeMpL/dzwN70vaO7vaOnrZ5ANcMP7jNlLs4SMgq76H1yr+//n9+/0svBwZeeee4aKGoPz/+MIQwN3IqDeD4BxdfrpW/B5/7wdJGtTbX0tG/fPP569Jm2vS6/JZZcgaLZNVXZPDj9vNeSfnSK74UBGBxxVXEU9VT9dCZYq3Aw+O5a9UyuGF0Y5rnjaw+d3xs+67wwtkmUHnj2f8x6a1lCGJxwXtg/19Mvf7dS8q4JmnIhZS9EP7lByFXZOFrru5i/BsHPG9ZvwAW3rFeDY/CMbOZnXf81sPN4KrlXwqNMA+Rst8CPnMwfHLJu1/fU6iftXA/ckmVa2B3h1Ias7tuOHrpyd1nX1zvX5/CiuF1nQ1H7nL3qGB3//4d85h6ZF0eiC29BDWu2QQsNpIDf7l+ZX/L7MnJUyc9SlK+chC6Z/KYQ4jbbh/cvGhm6Uqga62trbmBcDwS3avH/uW+Zl89b20uKN1Q8rMAXjp0sBH9MSR5nsVYdiEwciDm7u6kiTV4zyDQtqES5mSSAJccYi07+fGTZd/2sxsqJizSK5gyAYs235TXc0xyj3meRQPZJcDG3XX3HEfmbX9CcVO3BSPIJMlw9zzWq9m2+0oevf9CMytR7QboZDdgW528EREQPcaICXUA50yOW3SX5C1/RHF4gRKzNAQJPOYePXqjVq+dLlS/fEkHFkooRniye3EFOLfzNDGPAE50BMTda2Ho7DtSd7nlnX9KsaMvaWlrCwE8FkEyC4nnoXDj8JY8BFMq9DfYwQmAnkdrMcY8BwiAO7YdYM91ZJ4aLZ0U24baOtrbWxVjHt0xC2YWyLTmJSeBvT86zy0EA8ua7BRwJh4vtOw8QozuZ4yAa98cwK1HsbbQ2kWxMtjR3pbIM5dkFhTMgmftF72kF2D7t87tIwST1ORU9Hev/7CAj1p0nAAh4FFHDhUm7kwrSXcLxaS/NSFm1UYwKchkphgXXPv8CPj/XT9x9oY8JCarOoj0T8ztB6cKvY9mMTrhonv0E/sL/HS89WWDFMOyFuX1WqMRzcwwM+WseslFFB/52sw5WzrzJAmW2DTVnBF4ZOePC21jU2K+jnus7iyp7v7zeyj6hsFUeXSETGamRstZL19F8dgXxs4/tzVTSIIlMmUO/YPHvP7VSHHUojvmDODRf9Yo0Po7Ly+of2taMTOTmSmIrOvyl7ZR9O/feOlzWutuSmQ43hqD3XP7wd2FgW2ZRwxnBXj6498bazjlx2754qn+9pZKmoSQJGbRF73gKsr3fyVetrQaJQU3l7s3hsU8n/lwBrTMTpgj5x3A7a7t12cqGUwmjvcMdHd0tLVWKpU0putfsoXyE9c99JzzYy4LwSQAj4wW8DBmBuz/cqw2nNDanuKNuuOh3nlJB02zI498/+4T1UaWe7Cu8188SHn2/Vs2XtJTw5Igk3j6OorbegE+Me5WaWuPtVrS22OBethyPvOfvPuB0T1Tuezy90ea7vx2+wtWZSiYSVJ0j8UtgGt6dAi49/bBodbK1JFTmSVdHaFzywWUnz4zrALQGHv0kX3xb5ZQfvKWseeflzegkoYQzC01IMbsrnECdxvdGiD7Zt8SP3g4trZl03OrL7rUKf/JNxojb1pRVvR6C6Xxnh+tvySdiyYFMzOhrh6zEFR/eByFSNsIcP/egekjXYPmA8+5poem8TujLxl5eO3Vq4fVpPneb+uKoYZCaiGAHBkdHcgb1fpdGxDgTsdCaHw/TLYN9G29eivzPH7DwG/2kXSaL1m3MMzr1HWPXLY1WEvamqShEpKQoKC5k/XabK0R2KS759KaHpiO4y+4cHXOPPN9u655+dyZ06ejG4eHtyzubBLvu27tZf2h0tKSVkJILOJ5zLL6xGQjJ/C09ShbM1iBgXOY/8mjPRd1T83VPZBNP3Bb26ZLzl7S1wmc+WntJasVKknw2Mjq1blGtVqrx7yRWeDpK8FYPNBlPMHZSR/udxJlJ/dvf3j0RKWSdG142brO3p7Gg5svb3WfOTM7M1edrdezSKyDxcZDQGnfYGNetVP0d9XPTB3ev+fwybSBVUKSJiy64OyVvXmtp6Hjjx3uMFeSpIFnrIDHasdwXGFlfma2euSxvdOnSSkKySyExGhbvLYjxtqxWSHxrOiT4/UrV6XAqX2j+w+fau9ur6TBzB1ASDKFYO4eCTIj8iypmQc2nXPhotHHdx5csGRooLcVi2KeAkkyAWbkPGu6uyy0tjRc3pUSJcl4ggIJQBLPKjEkwczzKJlhxpMpSniWjWYm8CiTSfx/KaISkkC4RQUWQLh1hfD/Z1ZQOCAKBwAAkCIAnQEqeAB4AD5hLJJGpCKhoScUm4CADAlBDgAyTQ7oMuvMc6Af04TyNsz5kfOh9KX+Z9QD+zdSb6AHlz+zF+6XpR5p1tb+UT2hKzuK+wyNxlTOtXAUEqr6GreVH639gj9ci8ZtAi/fvijMXqNSNIBEAZPTFGhavgXGASKjzTTpiN4zJ6WHO5A9BluajMczgXQ5e5a4zWytZpHfXczAJNacSbFdq1mR+5JMKoXWRYxIrCRP6MbLR7BzGS3SeSHDc3PYuGdwdzviaFmkewTC2BraxilixOvr33H85Xg3YPi1zQoYEN1jQVPh65h+/jYRD9eVkOW1w+vwp3yhGlXaNVk7+hCxXWfr9z1/p8Vi0W8bH//HBCkerKG306wAAP7ZHwF+WubQ9UOMojO5Kytz/EP5HqFZA0YmJtSE7H1ptrUmdFOcrBE/UCfuXcRXJMP5vo17wib2ZUxsFPxnqtaYBwJH8JyKyODCv6I4jrWiyFYzLfXUNBK/Ma+WScIPoNxJhKY069KjdMKZZdbheoNGTcw1U0KYFiG56tteQ/OX/MnB604AX3E9b+TGvb99CpUfoZ0crdQ7/cpbBc1yC/q6veLen42e/38afHBZuXSi5JaNZZSzTgEUkhlICcWo5y7np/YZhuYGuoDfiHKgCnK8D7/y9LiCw/ZxtZxAbPtb9d34T7WidOU0iJKTu485V76jd9OALkMHrqm+VaW+01A6QMpKN36o0/I+gV1Cy9Bm+csTBbdMC8gTI2KqgYlPUv9LbKrF8oJKj4oW5jSmgyKbVaM8Hgyo/jyxrNdSFdQpm5ZfIyBkovGl+bPk0FwYTz/XuR7e5iTfTNJlxsXzp66MGFB7YK8MMnFCb+PkYElEnVe3220HNLpbn3SS0bJg4yR0C0zvIUrcD3VaI9BfXdz40Dah7DQQ2ZWPZ/tBt9+8F2RpSPRgttu1D7zXGPqaFHj1lDGVYxk9GpeGTx8rIcWGrQmOJ5T0FcGPuWOI72glF4GOqqfoqi07NYuf9lRXJbZXNJHJf+aZNxW4NxXmoJKZAM2EuJHac/o6UzSvoapg4+Jm1Yp20uA3p3RXMW9Z40QIcInci2nZMqttx4VnH+IyuVcZm1UN2EzbXVKzIQpy3j+zTs7DxrZgiXiKSlJM2sBB90dqpP6mBW102mRlaNzr9oZl0iAmh6P+vr02q4czzzvxSHZLc/Gmuxyw7diP75Mp8m/RhUrFbUHHwadEa4/G98ee0wRgZB0xBagv+zKc7oXMJpsogB9YlQs/0HTBRlFpCRRn2YRAFh3MVAW7KeaxHWTf/BEJk+RaMoNObCWs0b/G93zrRIdPPasb8ahv6c7cWDHe+S19/E50P/fFU3Hci6u+fyzKfg6Kvv0zfgruv+MVv/9Lg07+qYKW3+L5AAYhNa1L7Thgfp/fVTGap4IP9c4fnuigTA5bBh4PlDu8Iqp3mnfrW1HAAIJQdqy0A64hLiVBsPfYCLkOspyKMRzAQVGygCM8C519+QQj9hWqss1+Y3cu4n2cN6B6g41d7axzAz5Fb2jbPxVJva8PCjq7+piCmfy1K0gBtFdmLNiyPO25VHUGhX/vBn8YQjVPnXfqMwikhsv94xrwotf+kwW0gJ59oTeGsIWM2KTOqLOl+5yKHuEc1IIV4aMqG4bISSddzDrYmYy+mCquj4V+LY3j8Iy3DkDi9E/ttUYqoMKIkt/2mw2Cjz1VyON/ND5lLsOoAOvO6IfC0RMZRR9UzG0GdNM1r/nfob/D9d5O6IBkTQQzZufaIhNJiXKIKt2qlHf/MJLeY9NCJlFKInsdl7l+Fr//j5i/Txf/NLNkkPYXaH+wv9lsrMdz9Bw4uvZ7UczpJvK1/RRsVFtrpT1jOHxg1gg6llvDFRb+5Lo+Lp2MZLqiwgkQ/ZG8R0Oq3Ih65lHqUr/IY/62no56brtLAMyqiY5gYGzgZD0oeEO9hAjUj/RUcxLOKUsiliOA9rTXcSdtzXuHADyddnhzxu1X+5mNXYEThEu8zrGjCfU4vj/k4Comy6VC5+3LeDYY3vj/JD4KS+alJ43U1WADh7crIgJM2za7SeYILQPqlEZE+4h7GafQe+7dK2A9/R47yNDVOEsOxRGsVbwkxLSrO1vQBSqJ35IaVCnCC5NLgtiTkd5s1x0cc5SlVrDcI9sSACy5V3vmIIoIhVKrGbvWWYR2D3aItDIngMwkXwVWqIlw5fv5iXUsq7UovogoGp4a50BfNT2/MjWBkLrEOCo6J/U0SwxmU/AF/OrJFs+/HB1j6cmbsl/BHDBUCYUDqqyMnYes3oLFQfr+iMoxgJ+o4W9cVN+D+rlczxxveSXCKBxYmbZfdaFGoTB2SphQE1qROnhF5GMWHJl7zvvIMbPPJNBDrR3xXqVYHzAAAAAAAAA=","tear":"data:image/webp;base64,UklGRlgLAABXRUJQVlA4WAoAAAAQAAAAdwAAdwAAQUxQSCIIAAABCYZt20aCz+mTg7L/wO29E0T0fwL0V6MRdxLFeQdUx4228CDzHtk2ERLYxVIxw7YLJCACbGwrQSu1gVyA3dhcM8Y9hoK2bRiXP/DuEIiICXA1NTu3NU+tsm0kSdFIl8ClQM8fG4P1iaM9h+ZLERMwAZZt21bcStr7nHtDLJmSmZmZmZmZmamfH5D/kVUtZmauSmZm9KtnlBxSxL2nYVtW6IV71YiICUD4racRsE2HQ5CbCAGQIGAwGrlZECQhIoCZiRDgpkBQhIAIDaATITZDgiIMyV6H7dfh8hcfvN9XRwPA0hOKuXOv3b6D1YPP9twy5wgYSl803/2ZNoY85hL/JmAGWKkRwqd3AHL6gLrQAJYYSf2UZsD3UgSi1EmRTuDQXs8CwTKD9gfg9JO/G2BlRvRqbvCdr8QMLC/dMg2OX/whgxlK2mDhyz1c9Z7rwWAsJZrJ18G5wnOfI8SSgtB2PATO1TsVlDQlnIACExWWE0HKyQUMnBAsJQgwsWcByyIkSlrj3rGARYIoZYKMB6HAbyJKmhDowUV8EGK0cqJJdeciXglmsDICxKbqBdi/djEBS0kQd8wLmH9hlwhKCREmtgsK/OC9GRNBKRPYrYi/9RIKSpmE7FxA9ptKpIBlBNJPFvDRK7WoECsjI6rtAv7QM4qghAkYWn50vZ92+iJkGRG0ThyZ36GrQqCMABObGd2uAwiIsjZsj1Fzx3kBSZYUbceRzaQZAaCcDJDtRsWZWaURZW3iJkY13c0AwMqKVhkV698KDGApEQBalRFNzZoQpUUDJuOI8q1OVIlyNoBxpxF9+ZmB6kTKCYDYHhhp/G7XYjR1wlIiobLbaP6gFqIZVcsJoLpdR/LZn88M0cwgTkqJAKZao0ifP2/ajCCpLI4bsbEAJNu1P4rv7X5YMMN4ECAIcA2zVTYWywdihH//5qxcA0gCUhwhFFKMMESLIgSLIkDpONhpwiXOGwAQoBUlAXQqQiEBC4lTFgYKWgo3uZ3z3jkYjSANxdLaT618npp3DtnS1v8tDiqJVyVYCCFxvwtVnXDeO6dYTSKyEEJ4+bMHJVgds/TLN/64m0u8kiiSJhJOBtbN6GqhwAgyomBqzW9/xJFHHr091n36xh3VO0LAkUGI5rGMVn3iVNQJCJAIhflWu1Zrtne86JJkLex9yUFOSWLkJCQcGghOOnHeiYiAJGjFifeu1t5up85JtyRrAXvsJkQBoFKvB5l4deqciggBCkIsCqSIJvUdD9r5wnPWQ6JCGAw2CkIYTm5vgLq2UxGAhOVjAFLU1faYmt1jej3ELryQxEhjsBdexvBGcRoNa9NgwVgYQJDq2tZaOoLrYekr55QYpVmM87/C0GFRVJzaKpIwWB6IcSQgWulW4q6TQ+BbcSokN2KwGOI/54cKuYk65yIEAAggz4nxJKg+y2p+32FwQO6EADcAmOGTDzBsf1FURMWRBEGCYUCMJ0HRRHto7K/D7DdpTgjYRiIW3sGwC0sUFfWqBEGSCJmNB0GKS4T7nLM3hpbDoxMSw5IAMPgWw377DVScinMKrhWzXDCOBEW944EPXYmN1vdKnQiHAUGzL/Mh8k++zuic86rOrWODXDGOhIgmnL79QYxwz2ZU0tbiKtIlEesvvDe3EilOvXNrkLAsI8ZTKMyPfwSj3fJCyC3ENUChxuTJCtb/6MPecl8cVUiAzqk6FcF4EiLCW87FqN/8HDHGaIBAhIO9nsb6i69+1V/qRvVKMQJwzqkSHA9CSXl6EqN/JzWECCMUeeWyy7H+e68s5cuLmXovBAGYcyrEmBIiqDyLIkOPEBgs5vUTbsL6X/3tw2yQLqdw3hNrwDnGaBwLgkp5CsXKLt//IoPUdjvp5IB1e//472LW76epqfMeoIGAIgbDmFJl8IgVBF4WlthuG9bv//MPX2T9fh4C/GoQgMUs5MHGhBAZXHAo1rY8zyMoLt8IOvvtIBhy6V8/eaefpf0cKuqTxCcwACHt9oNhXIXY4T6snv1qIQ2mFBB/+efLH23Nhhn+sz+/sH037aY5fOKdd847DyL2uymDYUxJaHYPAMy+0JvoNFVURYSAqa9P7TjV4kZmX/vry1vyPqKrdqZraQwGGoGYpd2sQowtoWGfEwH751t7zDDCV2r1atU7gRCAVie3n5qoKldli1+8/8o736RhkKZaaU5N6OJCMAJAzNJeqooxNmG4Ggg/mTvU5RZzqdSa7U6r0awlSpJCumrNx+7y/Pzs7Fwvi/kgzQIbnU6lP788AGAxrHRXBkiIcSYxcSrwg5VjRb3ADOIq9WZrcma6U/cqFArF0rmvv11YyfIsy2KAq7abfrC40IswC/3ewvycVgVjbWQ4LMO/Pj7ReydKmgEQdZX29PYzk+1G4kmhIHTnt84tp1kwJpVGs9XvLnUHZmHQW5zburCSE+MfjsfCT45vOREVYk2jUX29PTG93XSnnqiKGPL+ysogGDVxXqW3kud5nva2bp1b7hsx9gbRA/GHzj6qIoINUn29PTUz027WE+8EQDSD0SyGvJ/1B4M0s8U0YJuMEmvbh9/sX1OKkBsAQE3qzVan02w2q4kXBWKI2SDtdfMsREkqHtsqzSqND+Z2c2YwjJbifbVabzTq1cQzWgwxwKg+SZTYlk3k9clpg6FIijjnnXOMoDrvEhVs6wazj6YqLGhNgqAJiZK0rJc1hSQLK1tD+s0uEBKbiwHI3j9uXkBstmb2ynmzILjZIMoLhzXnddMxgD23ZQnZAQF5vwuD/BIWIzZvy9b/IQdWUDggEAMAAPASAJ0BKngAeAA+YTCVRyQjIiEmErkQgAwJZwhwAZnJ0VRnta+P4MMcIa3Lsqpp5IQMgyECIDU4biGC8av87EbkIASa5aoijswEqnGrDTfIO8TqYZm61rH6IpoUSEK0HD8HnZZZHRsqdh6ZKz/cTVEwyrma86hjQPuTEdvfd6ORn4v86Kp21cWYb9AEuJV3WcHE2CQrGPVHgfCBg5KSpgAA/tXJgALa+tccTFw+8vI/CjXgul5TESXPQzjtlnPUI275OWdlzdr74HZmUSPK6g8aZp52N1YDifjelAA9IJrcPq8x4gjwlA4/haYrWSaASOyQ78RIGDSmDwvWpLPrT5fc6u1T6DH1lwFJ35KfZXeaDCyRNtr0BDF79TRJiTDpiQ/FAb53dQsW5LBE2phSnWm/a8N3ekKbXAvDNz3YoGp3V5Q/oDOEWHyyVUItTfVL68er9iJLJb+IEIF/dgMd58K6ZscI671/2Qvjt02MyCFz28TFgLvGOCnC2pWPRwQ0yRr69OYZw2/++MD1fzyuWZwFXUDASfkw3MrIddHQvvy1PPVri5RQiWj9kE+7Bt29KVgWD5VSouwDs5rFKZzhYQcNtVBJnWmTd0/u9VJP5EkvXgSk9lgvYhOGDv+N228vRFR4P3i/ieEu8I1BJ0jJTwTzWtXLDsbGRqShNzG/O4EdjvF+rvGLKClAXZ7XONo/bfg+iD1ViI/uWLLS+Tok1haX/YloeLw9bLhg5iaarafS9TNxbhlh3WvKfUHHCe0N/1SWPFcv5yQOdzczjItkMpTxp+oGT6cHY6Zafvjht4UUTMu23EA21UWhUHfpShY0xIpH9/lKBbbJVnRgmePkcIvKSyRB1zGX3OYRfBj4P6cHKgejrEOiV1rw6Uf5UYs8i9m6Bq/ZzdgbMrrqWn/ntWdarUe4xww5X0d98vYcphZnmtwVbxXlymOcnst61NNDA0JzXDLDvJjDlN8/txzmFRrslVzm382E8YKv1aj3ZVouExC3s6Lf3wnsgaJQbwEF9DJFiSXXc3Yx9jqQAAAAAAA=","book":"data:image/webp;base64,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","lamp":"data:image/webp;base64,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","core":"data:image/webp;base64,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","wine":"data:image/webp;base64,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","jaw":"data:image/webp;base64,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"},"trinkets":{"deus":"data:image/webp;base64,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","rabbit":"data:image/webp;base64,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","ring36":"data:image/webp;base64,UklGRgwRAABXRUJQVlA4WAoAAAAQAAAAdwAAdgAAQUxQSDEIAAABCYaNpDYSOQj67xfsDx1E9N9s2jZyuvYQ+Bi/rrtvVVWg94IWsNlxQUQ0PBMApU5QiQu3JSvfuF8iEADcmBeRyHJWrTrfH1MF6MPPgKGgbRumDX/W+0MQEROgVY+BDnkBtg0USgu6H4zyqnZeuBk8Vdsl20iS4mz+GeL+YIL7KYBZV1UREzABdGzbrttI54D1ySus+c+yJNwAD3LjkY46iYgJsGRbeyJJ0vf9ksnMHCOymXnUq8BxL4n31MPeATMzdwe5G0r6v0FmQbhHzSNiAlT+YA0KfisuwcpvZDgBUIBIAXrPEAAo4nUB4HuDABIAIRmdggwGgj6YAJIePIpwUE4jzI0gA30sheA0IoEraCgWKKMFV2A8kSD+gLGmWKu2cWmq5SgkMCA6AkZ8FMERufzB0LXp5mPTX1qcN651H6Qebr6usIqPIaDz8vp9/eq2y6b97pe+8YMEqECl3UbEFuJgDg34EBTFUKK3Cpvs4ZXK7fc/+6VUEDli2MzjnB9mhkhZNoECXwABJ4yeAhjC8kF4nL/4lz9+PQeoq4Zsy/k+62HTtg5Gr8HtpTDAG/OYUhMP4359+PBHv/e1D6zjQeu643n09ZT9adOwgXWTJBgIvZUAEAxL09etbjxMKcT3//QLnwhos5V9xjyu0+N8N9SURMNTcrDADbyXIDykFPwVuoHq79//kTHd4C0Nr2s+/cs6qasT3UejKLyRmxbotvDD3NbT7a3jXX61i2xjNzVTWuEVg/sKqMFi7Ku/30Y0uxs8Y9i0tfpYkmEw9wDmNuaHRW9u5l0wf/o4nputPQ5NA22njPkeM96BBGAmBp1S2VL+0rH88f3Hw75fQyqQE2Q7AZCMAWztGGN4/aHpcZsQz1qACplwB9LpUQyFGx5+0/Ym4eBHAnIIsJkAYmjagFwQ0BuNw/6m31ZxXVkM2EogQbPYLltMbYfL5mZ4yr6uY4UINpKVtODhDmldcel8bBZoCMjyQecKoqXNaSiOy/fq7VrzXFQxfQQhiaaNzSJcpZ9OleOZFZm2kZUwYXtsp+FBYD10nfcbMIw25SChtsQ4bALdott1ZQ0I2kJA3k5y7TahEequaVOw2L9iaCGreGQIa+ofDI9NlTTPBLXBKlhqrKFqK9ym3bsrOJDGwnWxbccOhO7kFvkigudcBlJrRKMW5BjG6nPyz4n2kNdVlnq+O10X2tIvU96TKedKeWyOGtt4i+vu28cDVXPGBQhA0GLugjUxXxk+PC9FOYMEPVQbZKyHpx2u/X2FTLPXCuGwhZkzTl0TcPVpP3NYqiBcJOUxxF6I6epwU0uGaQGBDVhgKTTT3FxfOzbrlDMkdGQwVo+7p1tc/65ic2+DKi6RQkzRNd7wBWj7pQ651MpncgFZnR76fv8CADva1oOcZ7KQ1RLCscmbF4C7c6uSsxPgARc4UXxcMtNLEJa2HSijIAdKEjQE64K/AKiqJdAkdCTW0Da1iXgRuk0spVawAeWoOiVN+SXo1qVYURDOE4aa56LS8CXAgiUXMyd4TLJChmz1JXjqVGtdMwA5R2WGh3CaXwBf3xcmyvjacYIAGz6E8gJUYZVqlQAeI0wMVB50fXPmdJcz3nCagGirPQzzqV7fqMVRvIIXAAIelHKdH8v1nfahzqu7AMgxQl7l8/8f7q+uPnXzudQivO4xAMo+nMvyz6tb/vrBOM+ZLqIhAVL5cV2W/6/X9v8PTMtcsMr1TKl0ms6qpVfhunbFbJdWGoyAHCgFxs8rGA4t+6uyVykxd5HVcJGiBpQATBuSunYMiU3TBPIiVo1x07axaVHspqxQquFCBQdsMGuZG1CqNe37qQkSCJBzgAm5tqsHfjjtHKS25kgQz54dyFhZ/L8RpsnCNHnjgPSaR7YiWF0IMQQL5fzgOedcJBCv55CFyAZqlbf2gd117JvN4Wa/7SxSSgsI3SHYJm43dg3Hfdtb6hA0p1l6CgqI1oVit7t0BemmibetpRARSs/JljAvxfoU1t3F0cau6TwgmFk13EgAMHoMcWa+MGoba3uIAQalsMFeBkDGvs9rk/JFrXH17cLYECTpayEgmKu0eY39+DTXy1nPvco2BIJGvMkWtQApV42FqbVYz/OlPA1i9DWyMQmSjVzKEKOkXB/HY94eeQHLr87/nacsBxmqrKEb07hQUe7no3r2PZ/J//777TStHkotY4ZQStd8YKZU3avyHs32nPrEZ6j3f1j3H1uGeagEvBhWjS0EENVQa70LnZuax+JdfJeG//7j8SMfCafz4lMFNWVro48jRciXMQWWFHMYhiwLfAca//dwd3tolmWfn2ZIDkxuT3q2LASp8TH4Ot8/DI8l7RNUXCVP99NS24+fejOVW19qrQQBC3tZCAhy2CoZZBjbqfpcGoflcnYbrBn5ynebMjAfk/Vnd8jlHm4dAAFTBaJAlXXVaV3mfz+o2IG7pnoc2lJDAmJAirFWOkg8YZIZZPIezOA+Y54U5j60NUyDxhnLXZ7XUrNcc0qAPEAZIvkxHSw/Wn4cLSb0gzLm5jRPzKOyWyk2wRDK3CNVgEwIvq9X1lhrxvzUqcshR0xateaVqMgOYibc3mKvKClBq+dpilw6sjSaUTlVN68GUeFDb/NhCiCCUM0X0KtZcC+As1CqgACIZ0wFoTayoppRIgVzD0V0CBIIAUg2uRVuwAIIB52gUANFEVWiKLwutnLz7MANKEAU3lqA8GZhGx7QDchXJcs+7D9i0k3pJ59m2X/E5rH4WPhRbZXlix+x6xf+82DZc+G5PRC+RYNLDJLlezX8jxAAVlA4ILQIAACwJQCdASp4AHcAPmEukUakIqGhKBr6gIAMCWcAcDR17LkkO+l/b789Rpqu8xz6zln9We4fKo6Z8xv5F9+/2PDvwCPZ/+H74ruweUf1P/if23vlfR769+aR/pPKu8ISgB/M/7r6Cv/P/nvPj9Hf+T/PfAT/Lv6r/xfXS9lPpMmMj8jNt96MsGBzuEwCc+WDZtOEjV9Vwe4KpbxcdK8jPkVHmH8qPF44f/6o74avHVUdykrFvc8ZwoAn3i6yXsFGuskBYyG5O8hJ6mX2qfjjQLj/YjT2tSmSz3aMRBIu2XosozSBxjcnWBNwpgF+zqyVeJuaZ+mycCx1hxMvRQeUggSoAdz2qe0x3LA0krhjhhhn11q0zSGOwvRwL2FFo/iX0+KtnB/GAulXSF3wwMxGR42lVn/gwOQAAP79bkyvw/RIOcR/p4xdgbedJFi6s/pRQ9g+DV7rD665+zYMKZ9MSuIGjxEAQxNkLppygGhl1nnt7XhkTuc32azQ10TIzkH6R6Qkt/p8uB16RU+sdva/+cXntAtu+U/dCkW/0KXwR0/oouwVSt4F7Zi5diyhE4g+2vUa3iJDcpAvCiFRuHpNMG4oh2HHvBq6PTpupjP+cMjZOfhpkRIPjanfuQzc9xNoaqD0WF83lysmQ/QAYRq+uytR6wUK/eG/eWFa7Qg1kOVNCz6+abF2aFaKJ9BzSk+jF1Dzy+v8u7GSiXz5ctlRn7vDa4AvQJ4Kn+JMeLQQjDCTbJXy+QI1ai/XvMfn4VE8+s54VqnrDBZBvd9RDqgvVF0V5Z8K5YCxSpHD9g0uFbYm6lzhAn55Iv1jq2EhSwz1SaFgzwCngHGMtMWmz8wtqY6SGFcQdB+Y7LRdh5lTcZnSsGWO/8GgGKNDgnRGuO02rUeRn9IWB/kymOLjcRYXjCDJqKII9i8EG8qAZZqzk/GcMVmc8Qn/yMXbajwiu2zx/qKDV/p8UxlSz2elsufcC1e/5h2k4ssMtPD77+yaV6GzjNggn/ukFyavg1J94XPBehfYxBXWOqxzZy/Gh8JMBZtWFvTNE5h5xIT1twcAOIruza0C9bd3tjXRxOcVgwGHPU5YwODTYBOQ+vHkevDzRG0f31m7kSBGvopZKhSTjenlWz65NtI/MaITCW9mnYDvSJvZE3ActGxeWWX4hwR4bjFGAs2M2G/DMqBS/HJ72vZ+Xhp2Be1/H6cYeNDZR8eEPpuJSjauPkU/p5xUcvXL1D7EvJzu6J/V8WvVLHihtL2lwcu8wnJ3LN1ZnF9UsUhoxVrE5L6I8jGycbf1uhmCnXf0DYMtmsFgAJlYfrWR90thze/HS6BCTnheDj/WMohIlgCaF3KbmizC4oZMIXIlTWfGEv/3XWaqWP7gPhmnoRqIt9JpoTyRTQHu4638SSMFyVr9imwbIAIq4t+lWBYCP8UeyK6t8W+iqgeh1bpon5nkFifUEvRWODfY1N4XNFJQEaDP/LOvWwzbXT2FzZ0W1XZWEpIHKL804yviFfFhKiHJ2nqQrXigDmxkuBeugYFG9roptMsQZ1+wtczEu5ya94FNYgx5hCLQLzRhyvzxzM2mG5ugY/Kke/hmbQIPy9AoVy+lGVrO/C6JMUrzkzZxquwVE8LZWsL2Ljyp1PxUawYBNZ5AKmUwqf429axR3EX0pThoClUvbE9OYvTKjUvEh7vd0B1LbX9S5qr8dnNIGJSH4umhUawEYCIPPgQfJuFKQ4JA9vwzJGpMkEz7qNhMh9Yn+ocLxa1S2k+HLRn0153zmdxf9Ppgn/FFQiCsS+leLvoMcdcugLxtPCiSoz4n/q/O99XpLQK1kHV34D59Dg5a4e6+Tr4VMqltT9v1HE+HuSLsX4cYY3eJ97B4IfC9NdxYUNdj9yVRwO/vTGkHdhH2m628vsdjZFk/1NePuryf3EFyyyVs6nT/Q/nNAvrsWq1r2zNCuAldp/VbftSO9jFTxRr5LPuO4Xr3hk2t5u9SUVhkHO9w+jvIORxBw6ILoYpL7gfOc7Zfu32MBpRE1H2rZAcFBPPw1INqP6IQXldFKR8S2ZgCJhxmorDejUZYJFz+r6Ga1YQTaQ2693nkfXVWORn0VjyZG3rbN674Wfv+DXZ5mf1xEXiazURP2NJr39X6Z55RLXyQ243e2hXJvXkuSdihkeM+YtTya2svQUr+w7qKJsq0U9qzrEDTHFA+rmSpbdsZ+FWXdpvOS2akfGDv9nF9tP3x1QFn7k0SVtP1Eca5FdTmczsflQ68dpTW3R3nO5PhoTEU/gGR+qAsP565NbhAIM+T/+KEf+S1kur8dQg3enxKUevD8qouqeVLNFtvktYniwqw0PLODXkYHf76HvXnCJQnPBHJ7mgdugAyvek/Uasv8lCD+VZFmNkqG5j9ln4Lf8f3hwkZCTKbeDiRvTv2wTWHmWd12yE+qRFmX+jlsPXwanTDOH39Wkf6NGctSjrowwDr7cRa5jR/roLvEXftHBvaSWm5/E5XW1n5eVLy+OaplK77edFAb1a2JOnEq0BtJ57/hLhbzZ6HdkPjUz8jfTqWET/G3uYVB1+ojTRgOE+CfUVw7S70y5Q9X3hc0FF/iSUWJuf5jF6gDkTnuI8gzEXAB2iLgccsrlXb+IYIbN4b1qzq0L/mLiqtBwlWCbbOckoTTJAizvHwcfJO9c0qlKMR1zWk7oplJsh3DiwK9X18iiBzSTYIQ9fdu28nOTk50ezcr2PB8CuxfeKJYJgOQveXTyKKLvmmrizUEHLo8Psrz2XjvKTOOHWtnbeCf/Ihbd9POPvlDR93uWJLAnPdUUetWIfl9bWSKDfFbbrhktqto61fRfjTW6HjRmWvK4dNemCEw6HHQn9whpLTGgJx5BzvEdZCKwUfPy/uluO4JzDw553E1lNQDaGjDT/2oXAbb474wC/aNRMowFbaaHbtdlrhyerXvznVW4bzpjAxqGUjSvA8IwOrVgHdXAj/AAAAAA==","feast":"data:image/webp;base64,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","wolf":"data:image/webp;base64,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","chrysalis":"data:image/webp;base64,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","antinomy":"data:image/webp;base64,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","april":"data:image/webp;base64,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"},"actives":{"dash":"data:image/webp;base64,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","nova":"data:image/webp;base64,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","twin":"data:image/webp;base64,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","slow":"data:image/webp;base64,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"},"bosses":{"b1":"data:image/webp;base64,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","b2":"data:image/webp;base64,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","b3":"data:image/webp;base64,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"}};
return { ART };
})();

// ---- js/binding-cat.js
const m_binding_cat = await (async () => {
const { ART } = m_binding_art;
// 校猫的绘制：把 96×96 的官方头像「改造成不同样式的黑猫」，再往上挂饰品。
//
// 关键手法：原图是浅灰白的猫，直接调色会变成一块黑饼。这里按像素取亮度，
// 把亮度重新映射到「暗部 / 中间调 / 高光」三段调色板上——阴影层次因此保留下来，
// 换一套调色板就是换一个毛色（玄猫、乌云盖雪、玳瑁、星斑……）。
// 花纹（白肚子、白点、玳瑁块、星点、火星）在同一趟像素遍历里叠上去，只做一次，
// 结果按「造型+毛色+瞳色」缓存成离屏 canvas，之后每帧只是 drawImage 一张图。
//
// 坐标约定：所有饰品都在「素材空间」里画 —— 0..96 是原图那张方块，地面在 y=104。
// 于是眼睛在 (30,31)/(61,31)，鼻尖 (47,44)，脖子 (48,78)，这些数来自对着原图量的网格。


const IMG = new Map();
const SKIN = new Map();

function artImage(key) {
  return IMG.get(key) || null;
}

function loadArt() {
  const keys = ['cat', 'cat2', 'coin'];
  const jobs = [];
  const add = (k, src) => {
    if (!src) return;
    jobs.push(new Promise((res) => {
      const im = new Image();
      im.onload = () => { IMG.set(k, im); res(); };
      im.onerror = () => res();
      im.src = src;
    }));
  };
  add('cat', ART.cat);
  add('cat2', ART.cat2);
  add('coin', ART.coin);
  for (const [k, v] of Object.entries(ART.items)) add('i:' + k, v);
  for (const [k, v] of Object.entries(ART.trinkets)) add('t:' + k, v);
  for (const [k, v] of Object.entries(ART.actives)) add('a:' + k, v);
  for (const [k, v] of Object.entries(ART.bosses)) add('b:' + k, v);
  return Promise.all(jobs);
}

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// 便宜的确定性噪声：同一个 (x,y) 永远同一个值，图案每次生成都长一样
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, s) {
  const gx = Math.floor(x / s), gy = Math.floor(y / s);
  const fx = x / s - gx, fy = y / s - gy;
  const a = hash2(gx, gy), b = hash2(gx + 1, gy), c = hash2(gx, gy + 1), d = hash2(gx + 1, gy + 1);
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

// ------------------------------------------------------------------ 毛色合成
function makeSkin(costume, fur, eye) {
  const key = `${costume.k}|${fur.k}|${eye.k}`;
  const hit = SKIN.get(key);
  if (hit) return hit;

  const src = artImage(costume.k === 'officer' ? 'cat2' : 'cat');
  const size = 192;                       // 2× 96，高清屏放大不糊
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  if (src) cx.drawImage(src, 0, 0, size, size);

  const dark = hex(fur.d), mid = hex(fur.m), light = hex(fur.l);
  const id = cx.getImageData(0, 0, size, size);
  const d = id.data;
  const pat = fur.pat || 'none';
  const pale = [226, 231, 240];           // 乌云盖雪 / 白点用的白
  const rust = [138, 74, 34];
  const cyan = [110, 227, 200];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const a = d[i + 3];
      if (a < 8) { d[i + 3] = 0; continue; }
      const nx = x / size, ny = y / size;            // 0..1，和分辨率无关

      // 原图是一张「亮脸 + 暗背景/暗身体」的方形裁切图，直接画就是一个黑方块。
      // 所以先按源图亮度做一次抠图：留亮的部分（脸、前爪），把暗的边角丢掉，
      // 剩下的头再和下面程序化的身体接起来，才是一只站着的猫。
      const L = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const keep = smooth(0.24, 0.46, L);
      const a2 = a * keep;
      if (a2 < 6) { d[i + 3] = 0; continue; }
      d[i + 3] = a2;
      let t = 0.1 + Math.pow(L, 0.92) * 0.92;

      let r, g, b;
      if (t < 0.52) {
        const u = t / 0.52;
        r = dark[0] + (mid[0] - dark[0]) * u;
        g = dark[1] + (mid[1] - dark[1]) * u;
        b = dark[2] + (mid[2] - dark[2]) * u;
      } else {
        const u = (t - 0.52) / 0.48;
        r = mid[0] + (light[0] - mid[0]) * u;
        g = mid[1] + (light[1] - mid[1]) * u;
        b = mid[2] + (light[2] - mid[2]) * u;
      }

      if (pat === 'belly') {
        // 乌云盖雪：下半张脸 / 胸口白，边缘用噪声打碎，免得像贴了个白罩子
        // 注意：原图下半截是不透明的整块身体，不能按 y 直接切，否则白肚皮会变成
        // 一个横跨整幅的白色矩形。这里用椭圆的径向距离来圈胸口。
        const dx = (nx - 0.5) / 0.34;
        const dy = (ny - 0.90) / 0.26;
        const dd = Math.sqrt(dx * dx + dy * dy) + (vnoise(x, y, 20) - 0.5) * 0.3;
        const w = (1 - smooth(0.72, 1.04, dd)) * 0.92;
        if (w > 0) {
          const k = w * (0.55 + 0.45 * L);
          r += (pale[0] * (0.35 + L * 0.65) - r) * k;
          g += (pale[1] * (0.35 + L * 0.65) - g) * k;
          b += (pale[2] * (0.35 + L * 0.65) - b) * k;
        }
      } else if (pat === 'specks') {
        // 墨里藏针：零星几根白毛，密度随机但固定
        const h = hash2(x >> 1, y >> 1);
        if (h > 0.982 && L > 0.35) {
          r += (pale[0] - r) * 0.75; g += (pale[1] - g) * 0.75; b += (pale[2] - b) * 0.75;
        }
      } else if (pat === 'tortie') {
        // 玳瑁：低频噪声切出锈色块
        const n = vnoise(x, y, 34);
        if (n > 0.58) {
          const k = smooth(0.58, 0.72, n) * 0.55;
          r += (rust[0] * (0.3 + L) - r) * k;
          g += (rust[1] * (0.3 + L) - g) * k;
          b += (rust[2] * (0.3 + L) - b) * k;
        }
      } else if (pat === 'stars') {
        // 星斑：格子里撒亮点，亮度随深度衰减
        const c = 14;
        const gx = Math.floor(x / c), gy = Math.floor(y / c);
        if (hash2(gx, gy) > 0.66) {
          const px = (gx + hash2(gx + 7, gy)) * c, py = (gy + hash2(gx, gy + 13)) * c;
          const dist = Math.hypot(x - px, y - py);
          if (dist < 4.2) {
            const k = (1 - dist / 4.2) * 0.95;
            r += (200 - r) * k; g += (215 - g) * k; b += (255 - b) * k;
          }
        }
      } else if (pat === 'ember') {
        // 焦黑：缝里透出火星，只在中间调偏暗的地方亮
        const n = vnoise(x, y, 18);
        if (n > 0.62 && L > 0.42) {
          const k = smooth(0.62, 0.78, n) * 0.85;
          r += (255 - r) * k * 0.9; g += (120 - g) * k * 0.7; b += (40 - b) * k * 0.6;
        }
      } else if (pat === 'ghost') {
        // 幽灵：往青绿偏，整体半透明
        const k = 0.22;
        r += (cyan[0] * (0.25 + L * 0.75) - r) * k;
        g += (cyan[1] * (0.25 + L * 0.75) - g) * k;
        b += (cyan[2] * (0.25 + L * 0.75) - b) * k;
        d[i + 3] = a2 * (0.66 + 0.3 * L);
      }

      // 边缘一圈冷光，黑猫在暗房间里才立得起来
      const edge = a < 190 ? (190 - a) / 190 : 0;
      if (edge > 0) {
        const rim = hex(fur.rim);
        r += (rim[0] - r) * edge * 0.55;
        g += (rim[1] - g) * edge * 0.55;
        b += (rim[2] - b) * edge * 0.55;
      }

      d[i] = r < 0 ? 0 : r > 255 ? 255 : r;
      d[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      d[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
  }
  cx.putImageData(id, 0, 0);

  // 眼睛：原图那对黑眼窝换成发光的猫瞳，这是「一眼看出是猫」的关键
  const eu = size / 96;
  for (const ex of [30, 61]) {
    const px = ex * eu, py = 31.5 * eu;
    const g = cx.createRadialGradient(px, py, 0, px, py, 13 * eu);
    g.addColorStop(0, eye.g);
    g.addColorStop(0.45, eye.c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.save();
    cx.globalCompositeOperation = 'lighter';
    cx.globalAlpha = 0.42;
    cx.fillStyle = g;
    cx.beginPath(); cx.ellipse(px, py, 11 * eu, 9.5 * eu, 0, 0, 7); cx.fill();
    cx.restore();

    cx.save();
    cx.beginPath(); cx.ellipse(px, py, 6 * eu, 6.6 * eu, 0, 0, 7); cx.clip();
    cx.fillStyle = eye.c;
    cx.fillRect(px - 8 * eu, py - 9 * eu, 16 * eu, 18 * eu);
    cx.fillStyle = eye.g;
    cx.globalAlpha = 0.55;
    cx.beginPath(); cx.ellipse(px, py + 3 * eu, 5.4 * eu, 3.6 * eu, 0, 0, 7); cx.fill();
    cx.globalAlpha = 1;
    // 竖瞳
    cx.fillStyle = '#05060a';
    cx.beginPath(); cx.ellipse(px, py + 0.5 * eu, 1.7 * eu, 5.9 * eu, 0, 0, 7); cx.fill();
    cx.restore();
    // 眼白高光
    cx.fillStyle = 'rgba(255,255,255,.85)';
    cx.beginPath(); cx.ellipse(px - 2 * eu, py - 2.2 * eu, 1.3 * eu, 1.3 * eu, 0, 0, 7); cx.fill();
  }

  SKIN.set(key, cv);
  return cv;
}

// ------------------------------------------------------------------ 猫本体
// o: { x, y, size, fur, eye, costume, t, moving, accs, hurt, ghost, bob, flip, dim }
function drawCat(ctx, o) {
  const fur = o.fur, skin = makeSkin(o.costume, fur, o.eye);
  const size = o.size;
  const S = size / 96;
  const t = o.t || 0;
  const moving = !!o.moving;
  const bob = o.bob == null ? (moving ? Math.sin(t * 13) * 1.6 : Math.sin(t * 2.4) * 0.9) : o.bob;
  const accs = o.accs || [];

  // 地面投影：径向渐变化开边缘——纯黑实心椭圆压在木地板上像个洞
  const shY = o.y - size * 0.02;
  const sh = ctx.createRadialGradient(o.x, shY, 0, o.x, shY, size * 0.34);
  sh.addColorStop(0, 'rgba(0,0,0,.44)');
  sh.addColorStop(0.5, 'rgba(0,0,0,.26)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.ellipse(o.x, shY, size * 0.34, size * 0.13, 0, 0, 7);
  ctx.fill();

  ctx.save();
  ctx.translate(o.x, o.y - bob * S);
  ctx.scale(S * (o.flip || 1), S);
  ctx.translate(-48, -104);
  if (o.ghost) ctx.globalAlpha = 0.82;
  // 受伤无敌时闪烁：整只猫半透明，身体部件不会各闪各的
  if (o.dim) ctx.globalAlpha *= 0.42;

  // ---- 背后层
  for (const a of accs) if (BEHIND[a]) BEHIND[a](ctx, t);
  // 尾巴（扇尾会盖掉它）
  if (!accs.includes('fanTail')) {
    const sway = Math.sin(t * 2.2) * 7 + (moving ? Math.sin(t * 9) * 3 : 0);
    ctx.strokeStyle = fur.m;
    ctx.lineWidth = 6.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(64, 98);
    ctx.quadraticCurveTo(90, 96, 88 + sway * 0.5, 72 + sway * 0.3);
    ctx.stroke();
    ctx.strokeStyle = fur.rim;
    ctx.globalAlpha *= 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = o.ghost ? 0.82 : 1;
  }
  // 身体（头像原图下半截是胸口和前爪，这里补一个躯干让整只猫站得住）
  // 用 mid 色而不是最暗色：整只都画成 d 的话，头和身子会糊成同一块黑。
  const bodyG = ctx.createLinearGradient(0, 66, 0, 108);
  bodyG.addColorStop(0, 'rgba(0,0,0,0)');
  bodyG.addColorStop(0.32, fur.m);
  bodyG.addColorStop(1, fur.m);
  ctx.fillStyle = bodyG;
  ctx.beginPath(); ctx.ellipse(48, 96, 24, 16, 0, 0, 7); ctx.fill();
  ctx.fillStyle = fur.m;
  ctx.beginPath(); ctx.ellipse(37, 103, 8, 5, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(59, 103, 8, 5, 0, 0, 7); ctx.fill();
  // 躯干上缘一道冷光：黑猫压在深色地板上，不描一下整只就糊成一块
  ctx.save();
  ctx.globalAlpha *= 0.5;
  ctx.strokeStyle = fur.rim;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(48, 96, 23.4, 15.4, 0, Math.PI * 1.08, Math.PI * 1.92);
  ctx.stroke();
  ctx.restore();

  // 耳朵：原图是圆毛球，没有立起来的耳尖，这里补一对才像猫
  for (const s of [-1, 1]) {
    ctx.fillStyle = fur.d;
    ctx.beginPath();
    ctx.moveTo(48 + s * 13, 24);
    ctx.quadraticCurveTo(48 + s * 20, -4, 48 + s * 28, 6);
    ctx.quadraticCurveTo(48 + s * 33, 18, 48 + s * 26, 26);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.globalAlpha *= 0.5;
    ctx.strokeStyle = fur.rim;
    ctx.lineWidth = 1.1;
    ctx.stroke();
    ctx.restore();
  }

  // 原图（黑猫化之后）
  ctx.drawImage(skin, 0, 0, 96, 96);
  // 底边那道硬切用一撮毛盖掉
  ctx.fillStyle = fur.m;
  ctx.beginPath(); ctx.ellipse(48, 99, 25, 7.5, 0, 0, 7); ctx.fill();

  // 胡须
  ctx.strokeStyle = 'rgba(220,226,240,.22)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(40, 50); ctx.lineTo(20, 46); ctx.moveTo(40, 53); ctx.lineTo(21, 54);
  ctx.moveTo(55, 50); ctx.lineTo(75, 46); ctx.moveTo(55, 53); ctx.lineTo(74, 54);
  ctx.stroke();

  // ---- 正面层
  for (const a of accs) if (FRONT[a]) FRONT[a](ctx, t, o);
  // 受击闪白
  if (o.hurt > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.75, o.hurt * 1.6);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(48, 60, 34, 40, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 眨眼睛：直接在眼睛位置盖两块毛色，几帧的事，比逐帧图便宜
  if (o.blink) {
    ctx.save();
    ctx.translate(o.x, o.y - bob * S);
    ctx.scale(S * (o.flip || 1), S);
    ctx.translate(-48, -104);
    ctx.fillStyle = fur.m;
    for (const ex of [30, 61]) { ctx.beginPath(); ctx.ellipse(ex, 31.5, 7, 7.6, 0, 0, 7); ctx.fill(); }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 饰品：画在身体后面
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.32);
  ctx.bezierCurveTo(x - s * 1.1, y - s * 0.5, x - s * 0.35, y - s * 1.05, x, y - s * 0.42);
  ctx.bezierCurveTo(x + s * 0.35, y - s * 1.05, x + s * 1.1, y - s * 0.5, x, y + s * 0.32);
  ctx.closePath();
}

const BEHIND = {
  auraHeart(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(48, 50, 4, 48, 50, 52);
    g.addColorStop(0, 'rgba(255,120,170,.42)');
    g.addColorStop(1, 'rgba(255,120,170,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, 50, 52, 0, 7); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const a = t * 1.3 + i * 2.1;
      const x = 48 + Math.cos(a) * 34, y = 34 + Math.sin(a * 1.4) * 12;
      ctx.globalAlpha = 0.6 + 0.35 * Math.sin(t * 3 + i);
      ctx.fillStyle = '#ff9dc0';
      heartPath(ctx, x, y, 8);
      ctx.fill();
    }
    ctx.restore();
  },
  cape(ctx, t) {
    ctx.save();
    const w = Math.sin(t * 3) * 2;
    const g = ctx.createLinearGradient(0, 64, 0, 114);
    g.addColorStop(0, '#8a2b33');
    g.addColorStop(1, '#3a0f15');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(20, 72);
    ctx.quadraticCurveTo(48, 64, 76, 72);
    ctx.quadraticCurveTo(92 + w, 94, 88, 110);
    ctx.quadraticCurveTo(48, 100, 8, 110);
    ctx.quadraticCurveTo(4 + w, 94, 20, 72);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,180,120,.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  umbrella(ctx, t) {
    ctx.save();
    ctx.translate(0, Math.sin(t * 1.8) * 1.2);
    ctx.strokeStyle = '#8b6a3f';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(48, 96); ctx.lineTo(48, 22); ctx.stroke();
    const g = ctx.createLinearGradient(0, -14, 0, 34);
    g.addColorStop(0, '#5c7398');
    g.addColorStop(1, '#28334a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(2, 32);
    ctx.quadraticCurveTo(48, -26, 94, 32);
    for (let i = 8; i >= 0; i--) {
      const x = 2 + (92 * i) / 8;
      ctx.quadraticCurveTo(x + 5, 24, x, 30);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,180,255,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  coreAura(ctx, t) {
    const coin = artImage('coin');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(190,205,235,.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(48, 88, 36, 12, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 2; i++) {
      const a = t * 1.6 + i * Math.PI;
      const x = 48 + Math.cos(a) * 36, y = 88 + Math.sin(a) * 12;
      if (coin) ctx.drawImage(coin, x - 5, y - 5, 10, 10);
    }
    ctx.restore();
  },
  stars(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = t * 0.9 + i * 1.05;
      const x = 48 + Math.cos(a) * (34 + (i % 2) * 8);
      const y = 46 + Math.sin(a * 1.7) * 26;
      const s = 1.6 + 1.4 * (0.5 + 0.5 * Math.sin(t * 4 + i));
      ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 3 + i * 2);
      ctx.fillStyle = '#cfe0ff';
      ctx.beginPath();
      ctx.moveTo(x, y - s * 2.2); ctx.lineTo(x + s * 0.6, y - s * 0.4);
      ctx.lineTo(x + s * 2.2, y); ctx.lineTo(x + s * 0.6, y + s * 0.4);
      ctx.lineTo(x, y + s * 2.2); ctx.lineTo(x - s * 0.6, y + s * 0.4);
      ctx.lineTo(x - s * 2.2, y); ctx.lineTo(x - s * 0.6, y - s * 0.4);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------------ 饰品：画在身体前面
const FRONT = {
  dripMouth(ctx, t) {
    ctx.save();
    ctx.fillStyle = '#8c1f24';
    ctx.beginPath();
    ctx.ellipse(47, 58, 4.2, 2.2, 0, 0, 7);
    ctx.fill();
    const drip = (t * 14) % 10;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.ellipse(49, 62 + drip, 1.3, 2.2 + drip * 0.2, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  },
  earClip(ctx) {
    ctx.save();
    ctx.strokeStyle = '#9aa6bb';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 26); ctx.lineTo(26, 12); ctx.moveTo(20, 32); ctx.lineTo(32, 18);
    ctx.stroke();
    ctx.strokeStyle = '#cfd8e8';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(16, 12, 3.4, 0, 7); ctx.stroke();
    ctx.restore();
  },
  bow(ctx) {
    ctx.save();
    const g = ctx.createLinearGradient(20, 68, 76, 94);
    g.addColorStop(0, '#2b3348'); g.addColorStop(1, '#141a27');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(48, 82); ctx.quadraticCurveTo(26, 64, 16, 82); ctx.quadraticCurveTo(26, 100, 48, 82);
    ctx.moveTo(48, 82); ctx.quadraticCurveTo(70, 64, 80, 82); ctx.quadraticCurveTo(70, 100, 48, 82);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,205,235,.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#c9d3e6';
    ctx.beginPath(); ctx.ellipse(48, 82, 3.8, 4.2, 0, 0, 7); ctx.fill();
    ctx.restore();
  },
  brooch(ctx) {
    ctx.save();
    const g = ctx.createRadialGradient(46, 86, 1, 48, 88, 7);
    g.addColorStop(0, '#ff8b8b'); g.addColorStop(0.5, '#c8202f'); g.addColorStop(1, '#5c0a12');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, 88, 5.4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(48, 88, 6.6, 0, 7); ctx.stroke();
    ctx.restore();
  },
  fanTail(ctx, t) {
    ctx.save();
    ctx.translate(78, 90);
    ctx.rotate(-0.42 + Math.sin(t * 2) * 0.06);
    for (let i = -2; i <= 2; i++) {
      ctx.save();
      ctx.rotate(i * 0.28);
      const g = ctx.createLinearGradient(0, 0, 0, -30);
      g.addColorStop(0, '#8a93a8'); g.addColorStop(1, '#e9edf6');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -20, 6, 19, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },
  chain(ctx) {
    ctx.save();
    ctx.strokeStyle = '#aeb9cd';
    ctx.lineWidth = 2.8;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.8 + (i / 8) * Math.PI * 1.6;
      ctx.beginPath();
      ctx.arc(48, 64, 29, a - 0.07, a + 0.07);
      ctx.stroke();
    }
    ctx.fillStyle = '#3b4252';
    ctx.strokeStyle = '#9aa6bb';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(41, 88, 14, 12, 3) : ctx.rect(41, 88, 14, 12);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  },
  prismEye(ctx, t) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(61, 20); ctx.lineTo(74, 40); ctx.lineTo(48, 40);
    ctx.closePath();
    const g = ctx.createLinearGradient(48, 20, 74, 40);
    g.addColorStop(0, 'rgba(160,220,255,.55)');
    g.addColorStop(0.5, 'rgba(200,160,255,.45)');
    g.addColorStop(1, 'rgba(255,200,160,.5)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,235,255,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  },
  monocle(ctx) {
    ctx.save();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(61, 31, 11, 0, 7); ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,255,.14)';
    ctx.beginPath(); ctx.arc(61, 31, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9a94a';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(50, 36); ctx.quadraticCurveTo(36, 52, 30, 66); ctx.stroke();
    ctx.restore();
  },
  glasses(ctx) {
    ctx.save();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(30, 31, 9.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(61, 31, 9.5, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(39.5, 31); ctx.lineTo(51.5, 31); ctx.stroke();
    ctx.fillStyle = 'rgba(180,210,255,.10)';
    ctx.beginPath(); ctx.arc(30, 31, 9.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(61, 31, 9.5, 0, 7); ctx.fill();
    ctx.restore();
  },
  goggles(ctx) {
    ctx.save();
    ctx.fillStyle = '#2a3346';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(14, 24, 68, 8, 4) : ctx.rect(14, 24, 68, 8);
    ctx.fill();
    for (const ex of [30, 61]) {
      ctx.fillStyle = '#111826';
      ctx.beginPath(); ctx.arc(ex, 31, 11, 0, 7); ctx.fill();
      ctx.strokeStyle = '#6b7c9e';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(ex, 31, 11, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(150,220,255,.22)';
      ctx.beginPath(); ctx.arc(ex - 3, 28, 4, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  pocketWatch(ctx, t) {
    ctx.save();
    ctx.strokeStyle = '#c9a94a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(62, 76); ctx.quadraticCurveTo(72, 84, 70, 92); ctx.stroke();
    ctx.fillStyle = '#2a3244';
    ctx.beginPath(); ctx.arc(70, 96, 6, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e3b341';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(70, 96, 6, 0, 7); ctx.stroke();
    const a = t * 2;
    ctx.strokeStyle = '#f0e2b0';
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(70, 96); ctx.lineTo(70 + Math.cos(a) * 4, 96 + Math.sin(a) * 4); ctx.stroke();
    ctx.restore();
  },
  haloDial(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = 'rgba(240,200,110,.85)';
    ctx.beginPath(); ctx.arc(48, 4, 21, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(170,200,255,.8)';
    ctx.beginPath(); ctx.arc(48, 4, 21, 0, Math.PI); ctx.stroke();
    const a = t * 1.4;
    ctx.fillStyle = 'rgba(255,225,150,.9)';
    ctx.beginPath(); ctx.arc(48 + Math.cos(a) * 21, 4 + Math.sin(a) * 21, 2.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  hairClip(ctx, t) {
    ctx.save();
    ctx.translate(78, 14);
    ctx.rotate(Math.sin(t * 2) * 0.12);
    for (const s of [-1, 1]) {
      const g = ctx.createLinearGradient(0, 0, 10 * s, -8);
      g.addColorStop(0, '#7c5cff'); g.addColorStop(1, '#c9b6ff');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(6 * s, -4, 6, 5, s * 0.5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(5 * s, 4, 4.4, 4, s * 0.5, 0, 7); ctx.fill();
    }
    ctx.strokeStyle = '#1a1f2b';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 6); ctx.stroke();
    ctx.restore();
  },
  armor(ctx) {
    ctx.save();
    for (const s of [-1, 1]) {
      const x = 48 + s * 25;
      const g = ctx.createLinearGradient(x, 70, x, 92);
      g.addColorStop(0, '#f0ead8'); g.addColorStop(1, '#b9af94');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - s * 3, 72);
      ctx.quadraticCurveTo(x + s * 14, 74, x + s * 9, 92);
      ctx.quadraticCurveTo(x - s * 2, 86, x - s * 3, 72);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,80,60,.55)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  },
  eyepatch(ctx, t) {
    ctx.save();
    const g = ctx.createRadialGradient(30, 31, 1, 30, 31, 11);
    g.addColorStop(0, '#dfe9ff'); g.addColorStop(0.35, '#7f8ca8'); g.addColorStop(1, '#2b3242');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(30, 31, 10, 0, 7); ctx.fill();
    ctx.strokeStyle = '#1b2130';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(30, 31, 10, 0, 7); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(120,220,255,${0.35 + 0.25 * Math.sin(t * 3)})`;
    ctx.beginPath(); ctx.arc(30, 31, 3.4, 0, 7); ctx.fill();
    ctx.restore();
  },
  lantern(ctx, t) {
    ctx.save();
    ctx.translate(86, 46 + Math.sin(t * 1.6) * 2.2);
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
    g.addColorStop(0, 'rgba(255,190,90,.55)');
    g.addColorStop(0.5, 'rgba(255,150,60,.20)');
    g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#7a6438';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.rect(-6, -8, 12, 15); ctx.stroke();
    ctx.fillStyle = 'rgba(255,200,110,.9)';
    ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 5, 0, 0, 7); ctx.fill();
    ctx.restore();
  },
  ribbonTail(ctx) {
    ctx.save();
    ctx.fillStyle = '#c9d3e6';
    ctx.beginPath(); ctx.ellipse(62, 88, 8, 4.2, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#8f9bb4';
    ctx.beginPath(); ctx.ellipse(62, 88, 2.6, 2.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#c9d3e6';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(66, 89); ctx.quadraticCurveTo(80, 94, 78, 104); ctx.stroke();
    ctx.restore();
  },
  tearDrop(ctx, t) {
    ctx.save();
    const d = (t * 9) % 8;
    ctx.fillStyle = 'rgba(150,225,255,.9)';
    ctx.beginPath();
    ctx.ellipse(23, 40 + d, 2.6, 3.4, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(23, 32); ctx.lineTo(26, 38); ctx.lineTo(20, 38); ctx.closePath();
    ctx.fill();
    ctx.restore();
  },
  book(ctx, t) {
    ctx.save();
    ctx.translate(48, -2 + Math.sin(t * 1.7) * 1.2);
    ctx.rotate(Math.sin(t * 1.1) * 0.05);
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath();
    ctx.moveTo(-26, -1); ctx.quadraticCurveTo(-11, -9, 0, -3);
    ctx.quadraticCurveTo(11, -9, 26, -1);
    ctx.quadraticCurveTo(11, 5, 0, 10);
    ctx.quadraticCurveTo(-11, 5, -26, -1);
    ctx.fill();
    ctx.strokeStyle = '#8a6a4a';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.lineTo(0, 8); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,100,80,.4)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(-14, -1 + i * 2); ctx.lineTo(-4, 1 + i * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(4, 1 + i * 2); ctx.lineTo(14, -1 + i * 2); ctx.stroke();
    }
    ctx.restore();
  },
  wishLamp(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const y = -10 + Math.sin(t * 1.9) * 2;
    const g = ctx.createRadialGradient(48, y, 2, 48, y, 26);
    g.addColorStop(0, 'rgba(255,230,150,.55)');
    g.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(48, y, 26, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255,235,170,.95)';
    ctx.beginPath(); ctx.ellipse(48, y, 2.6, 4, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(230,200,140,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(48, y, 7, 0, 7); ctx.stroke();
    ctx.restore();
  },
  jawGlow(ctx, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.2 + 0.18 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(255,70,50,${a})`;
    ctx.beginPath(); ctx.ellipse(47, 58, 12, 6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = `rgba(255,120,90,${a + 0.2})`;
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(41, 56); ctx.lineTo(53, 56); ctx.stroke();
    ctx.restore();
  },
};

// ------------------------------------------------------------------ 肖像（首领 / 精英）
// 把真实怪物立绘封进一枚会转的圆框里：既用上了官方素材，又不用给它们画出走路动画。
function drawPortrait(ctx, o) {
  const im = artImage('b:' + o.art);
  const r = o.r, t = o.t || 0;
  ctx.save();
  ctx.translate(o.x, o.y);

  // 外圈光
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.9);
  g.addColorStop(0, o.glow || 'rgba(120,160,255,.28)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, 7); ctx.fill();
  ctx.restore();

  // 圆底 + 立绘
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.clip();
  ctx.fillStyle = '#0b0e16';
  ctx.fillRect(-r, -r, r * 2, r * 2);
  if (im) {
    // 立绘是 1:1 的方图，取中间那块，缩放后刚好填满圆
    const s = r * 2.6;
    ctx.drawImage(im, -s / 2, -s / 2 + r * 0.12, s, s);
  }
  const sh = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r);
  sh.addColorStop(0, 'rgba(0,0,0,0)');
  sh.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = sh;
  ctx.fillRect(-r, -r, r * 2, r * 2);
  ctx.restore();

  // 框
  ctx.strokeStyle = o.rim || 'rgba(190,205,235,.65)';
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke();
  // 转动的刻痕
  ctx.save();
  ctx.rotate(t * 0.5);
  ctx.strokeStyle = 'rgba(210,220,255,.35)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2));
    ctx.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
    ctx.stroke();
  }
  ctx.restore();

  if (o.hurt > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.7, o.hurt * 1.4);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}
return { artImage, loadArt, makeSkin, drawCat, drawPortrait };
})();

// ---- js/binding-draw.js
const m_binding_draw = await (async () => {
const { TUNE } = m_binding_data;
const { artImage, drawPortrait } = m_binding_cat;
// 房间、敌人、掉落物的画法。
//
// 房间是「静态的」，所以整间房（地板 + 墙 + 踢脚线 + 门 + 课桌）在进入时烘焙进一张
// 离屏 canvas，之后每帧只 drawImage 一次；只有灯光的呼吸、门的开合这些动态层才逐帧画。
// 边缘机器的手机端跑不动几百次 fillRect，这个拆法是必须的。



const T = TUNE.tile;
const WALL = TUNE.wall;

// ------------------------------------------------------------------ 主题配色
const THEMES = {
  wood: {
    floorA: '#3a2d24', floorB: '#332820', line: '#241a14', grain: 'rgba(255,220,180,.05)',
    wall: '#221a20', wallTop: '#2e2430', skirt: '#181118', trim: '#4a3a3a',
  },
  tile: {
    floorA: '#2b323b', floorB: '#262c35', line: '#1a1f26', grain: 'rgba(200,230,255,.045)',
    wall: '#1d232c', wallTop: '#28303c', skirt: '#141920', trim: '#3d4a5c',
  },
  stone: {
    floorA: '#2a2a30', floorB: '#25252b', line: '#1a1a1f', grain: 'rgba(220,220,255,.04)',
    wall: '#1c1c22', wallTop: '#262630', skirt: '#131317', trim: '#3a3a48',
  },
};

function rnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ------------------------------------------------------------------ 房间烘焙
function bakeRoom(room, themeKey, W, H) {
  const th = THEMES[themeKey] || THEMES.wood;
  const cv = document.createElement('canvas');
  const scale = 2;
  cv.width = W * scale;
  cv.height = H * scale;
  const c = cv.getContext('2d');
  c.scale(scale, scale);
  const rand = rnd(room.seed || 1);

  // 地板
  c.fillStyle = th.floorA;
  c.fillRect(0, 0, W, H);
  if (themeKey === 'wood') {
    const ph = 20;
    for (let y = 0; y < H; y += ph) {
      const off = (Math.floor(y / ph) % 2) * 60;
      for (let x = -60; x < W; x += 120) {
        const v = 0.85 + rand() * 0.3;
        c.fillStyle = `rgba(${Math.round(58 * v)},${Math.round(45 * v)},${Math.round(36 * v)},1)`;
        c.fillRect(x + off, y, 118, ph - 1);
        c.strokeStyle = th.grain;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(x + off + 6, y + 5 + rand() * 8);
        c.lineTo(x + off + 90 + rand() * 20, y + 5 + rand() * 8);
        c.stroke();
      }
      c.fillStyle = th.line;
      c.fillRect(0, y + ph - 1, W, 1.4);
    }
  } else if (themeKey === 'tile') {
    const s = 40;
    for (let y = 0; y < H; y += s) {
      for (let x = 0; x < W; x += s) {
        const v = 0.9 + rand() * 0.2;
        c.fillStyle = `rgba(${Math.round(50 * v)},${Math.round(57 * v)},${Math.round(66 * v)},1)`;
        c.fillRect(x + 1, y + 1, s - 2, s - 2);
      }
    }
    c.strokeStyle = th.line;
    c.lineWidth = 1;
    for (let y = 0; y < H; y += s) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
    for (let x = 0; x < W; x += s) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  } else {
    for (let y = 0; y < H; y += 34) {
      const w = 50 + rand() * 40;
      for (let x = -20; x < W; x += w) {
        const v = 0.86 + rand() * 0.26;
        c.fillStyle = `rgba(${Math.round(46 * v)},${Math.round(46 * v)},${Math.round(52 * v)},1)`;
        c.fillRect(x + 1, y + 1, w - 2, 32);
      }
    }
    c.strokeStyle = th.line;
    c.lineWidth = 1.2;
    for (let y = 0; y < H; y += 34) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  }

  // 地上的旧痕迹：血/水渍
  for (let i = 0; i < 7; i++) {
    const x = 50 + rand() * (W - 100), y = 50 + rand() * (H - 100);
    const r = 8 + rand() * 22;
    const g = c.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, `rgba(20,10,14,${0.16 + rand() * 0.12})`);
    g.addColorStop(1, 'rgba(20,10,14,0)');
    c.fillStyle = g;
    c.beginPath(); c.ellipse(x, y, r, r * 0.7, rand() * 3, 0, 7); c.fill();
  }

  // ---- 墙体：只画四条墙带（不能用 destination-out 挖洞，那会把地板一起挖掉）
  c.fillStyle = th.wall;
  c.fillRect(0, 0, W, WALL);
  c.fillRect(0, H - WALL, W, WALL);
  c.fillRect(0, 0, WALL, H);
  c.fillRect(W - WALL, 0, WALL, H);
  // 墙面上的竖向板缝
  c.strokeStyle = 'rgba(255,255,255,.03)';
  c.lineWidth = 1;
  for (let x = 0; x < W; x += 26) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, WALL); c.stroke();
    c.beginPath(); c.moveTo(x, H - WALL); c.lineTo(x, H); c.stroke();
  }
  for (let y = 0; y < H; y += 26) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(WALL, y); c.stroke();
    c.beginPath(); c.moveTo(W - WALL, y); c.lineTo(W, y); c.stroke();
  }
  // 墙面下沿压一条深色，和地板拉开层次
  c.fillStyle = 'rgba(0,0,0,.28)';
  c.fillRect(0, 0, W, 6);
  c.fillRect(0, H - 8, W, 8);
  // 挖出地板
  // 内墙阴脚线 + 上沿高光
  const inner = [WALL, WALL, W - WALL * 2, H - WALL * 2];
  const vg = c.createLinearGradient(0, inner[1], 0, inner[1] + 26);
  vg.addColorStop(0, 'rgba(0,0,0,.55)');
  vg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = vg;
  c.fillRect(inner[0], inner[1], inner[2], 26);
  const hg = c.createLinearGradient(inner[0], 0, inner[0] + 22, 0);
  hg.addColorStop(0, 'rgba(0,0,0,.45)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg;
  c.fillRect(inner[0], inner[1], 22, inner[3]);
  const hg2 = c.createLinearGradient(W - inner[0], 0, W - inner[0] - 22, 0);
  hg2.addColorStop(0, 'rgba(0,0,0,.45)');
  hg2.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = hg2;
  c.fillRect(W - inner[0] - 22, inner[1], 22, inner[3]);

  // 踢脚线
  c.strokeStyle = th.skirt;
  c.lineWidth = 4;
  c.strokeRect(WALL - 2, WALL - 2, W - WALL * 2 + 4, H - WALL * 2 + 4);

  // 环境装饰：海报 / 标本罐 / 星点。全部画进烘焙图，运行时零成本
  decorate(c, themeKey, W, H, rand);

  // 障碍物（课桌/病床/水泥墩）
  for (const ob of room.obstacles || []) {
    c.save();
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.beginPath();
    if (c.roundRect) c.roundRect(ob.x + 3, ob.y + 5, ob.w, ob.h, 5);
    else c.rect(ob.x + 3, ob.y + 5, ob.w, ob.h);
    c.fill();
    const g = c.createLinearGradient(ob.x, ob.y, ob.x, ob.y + ob.h);
    g.addColorStop(0, themeKey === 'tile' ? '#4a5568' : '#4a382b');
    g.addColorStop(1, themeKey === 'tile' ? '#2c3543' : '#2c2118');
    c.fillStyle = g;
    c.beginPath();
    if (c.roundRect) c.roundRect(ob.x, ob.y, ob.w, ob.h, 5);
    else c.rect(ob.x, ob.y, ob.w, ob.h);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.10)';
    c.lineWidth = 1.2;
    c.stroke();
    // 桌面上一道亮边
    c.strokeStyle = 'rgba(255,240,220,.18)';
    c.beginPath();
    c.moveTo(ob.x + 5, ob.y + 3.5);
    c.lineTo(ob.x + ob.w - 5, ob.y + 3.5);
    c.stroke();
    c.restore();
  }

  // 门：先画门洞（黑洞洞的），门的开合状态在运行时再叠
  for (const [dir, on] of Object.entries(room.doors)) {
    if (!on) continue;
    const d = doorRect(dir, W, H);
    c.save();
    c.fillStyle = '#07080c';
    c.fillRect(d.x, d.y, d.w, d.h);
    // 门框
    c.strokeStyle = th.trim;
    c.lineWidth = 3;
    c.strokeRect(d.x - 1.5, d.y - 1.5, d.w + 3, d.h + 3);
    c.restore();
  }

  return cv;
}

// ------------------------------------------------------------------ 房间装饰
// 每一层给一眼能认出来的「这层是什么地方」：
//   一层走廊 → 墙上贴的晚自习通知、地上粉笔划的线
//   二层教室 → 架上的标本罐、地面排水口
//   三层天台 → 墙面的星点、裂缝、地上的积水
// 全部只画在墙带（0..WALL / H-WALL..H）与地面边缘，不会挡住房间中央的战斗区。
function decorate(c, themeKey, W, H, rand) {
  const m = WALL;
  c.save();
  if (themeKey === 'wood') {
    // 通知单：白纸 + 几行假字，避开门口那一段
    const spots = [W * 0.18, W * 0.38, W * 0.66, W * 0.82];
    for (let i = 0; i < spots.length; i++) {
      const x = spots[i] + rand() * 10 - 5;
      const y = 7 + rand() * 4;
      const pw = 20 + rand() * 8, ph = 26 + rand() * 5;
      c.fillStyle = 'rgba(226,222,208,.16)';
      c.fillRect(x, y, pw, ph);
      c.strokeStyle = 'rgba(255,255,255,.10)';
      c.lineWidth = 0.8;
      c.strokeRect(x + 0.4, y + 0.4, pw - 0.8, ph - 0.8);
      c.strokeStyle = 'rgba(20,20,26,.35)';
      for (let k = 1; k < 5; k++) {
        c.beginPath();
        c.moveTo(x + 3, y + 4 + k * 4.4);
        c.lineTo(x + pw - 4 - rand() * 6, y + 4 + k * 4.4);
        c.stroke();
      }
    }
    // 地上的粉笔线，指向房间中间
    c.strokeStyle = 'rgba(230,230,235,.10)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(W * 0.06, H - m + 14);
    c.lineTo(W * 0.20, H - m - 22);
    c.lineTo(W * 0.30, H - m - 6);
    c.stroke();
  } else if (themeKey === 'tile') {
    // 标本罐：玻璃 + 液体 + 里面那团东西
    for (let i = 0; i < 5; i++) {
      const cw = 15 + rand() * 5;
      const x = W * (0.08 + i * 0.19) + rand() * 8;
      const y = 9;
      const hh = 26 + rand() * 6;
      c.fillStyle = 'rgba(110,175,170,.16)';
      c.fillRect(x, y, cw, hh);
      c.fillStyle = 'rgba(140,210,200,.10)';
      c.fillRect(x + 1.5, y + 1.5, cw * 0.3, hh - 4);
      c.strokeStyle = 'rgba(180,230,225,.22)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y + 0.5, cw - 1, hh - 1);
      c.fillStyle = 'rgba(18,28,32,.8)';
      c.beginPath();
      c.ellipse(x + cw / 2, y + hh * 0.62, cw * 0.26, hh * 0.18, rand() * 0.6, 0, 7);
      c.fill();
    }
    // 排水口
    for (const gx of [W * 0.5]) {
      c.fillStyle = 'rgba(0,0,0,.35)';
      c.fillRect(gx - 7, H - m - 5, 14, 10);
      c.strokeStyle = 'rgba(180,200,220,.14)';
      c.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        c.beginPath(); c.moveTo(gx - 5, H - m - 3 + k * 3); c.lineTo(gx + 5, H - m - 3 + k * 3); c.stroke();
      }
    }
  } else {
    // 天台：墙面星点 + 一条裂缝
    for (let i = 0; i < 26; i++) {
      const x = rand() * W, y = rand() * m;
      c.fillStyle = `rgba(200,215,255,${0.05 + rand() * 0.22})`;
      c.fillRect(x, y, 1.2, 1.2);
    }
    c.strokeStyle = 'rgba(0,0,0,.4)';
    c.lineWidth = 1.4;
    c.beginPath();
    let cx = W * 0.34, cy = 2;
    c.moveTo(cx, cy);
    while (cy < m) { cx += rand() * 8 - 4; cy += 5; c.lineTo(cx, cy); }
    c.stroke();
    // 积水
    for (let i = 0; i < 3; i++) {
      const x = W * (0.2 + rand() * 0.6), y = H - m + 10 + rand() * 18;
      const g = c.createRadialGradient(x, y, 1, x, y, 18 + rand() * 12);
      g.addColorStop(0, 'rgba(110,150,200,.13)');
      g.addColorStop(1, 'rgba(110,150,200,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(x, y, 20, 8, 0, 0, 7); c.fill();
    }
  }
  c.restore();
}

// 门洞的矩形（含墙体那一段）
function doorRect(dir, W, H) {
  const half = 30;
  if (dir === 'n') return { x: W / 2 - half, y: 0, w: half * 2, h: WALL };
  if (dir === 's') return { x: W / 2 - half, y: H - WALL, w: half * 2, h: WALL };
  if (dir === 'w') return { x: 0, y: H / 2 - half, w: WALL, h: half * 2 };
  return { x: W - WALL, y: H / 2 - half, w: WALL, h: half * 2 };
}

// 门关上时的木板（运行时叠在烘焙图上层，随房间清空与否切换）
function drawDoorState(ctx, room, W, H, t, open) {
  for (const [dir, on] of Object.entries(room.doors)) {
    if (!on) continue;
    const d = doorRect(dir, W, H);
    const horiz = dir === 'n' || dir === 's';
    ctx.save();
    if (!open) {
      // 铁栅栏
      ctx.strokeStyle = '#5d6478';
      ctx.lineWidth = 3;
      const n = horiz ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const p = (i + 1) / (n + 1);
        ctx.beginPath();
        if (horiz) {
          const x = d.x + d.w * p;
          ctx.moveTo(x, d.y + 4); ctx.lineTo(x, d.y + d.h - 4);
        } else {
          const y = d.y + d.h * p;
          ctx.moveTo(d.x + 4, y); ctx.lineTo(d.x + d.w - 4, y);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(190,205,235,.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (horiz) {
        ctx.moveTo(d.x + 3, d.y + d.h / 2); ctx.lineTo(d.x + d.w - 3, d.y + d.h / 2);
      } else {
        ctx.moveTo(d.x + d.w / 2, d.y + 3); ctx.lineTo(d.x + d.w / 2, d.y + d.h - 3);
      }
      ctx.stroke();
    } else {
      // 开着：门口透一点光，提示可以走
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
      const a = 0.16 + 0.06 * Math.sin(t * 3);
      g.addColorStop(0, `rgba(140,180,255,${a})`);
      g.addColorStop(1, 'rgba(140,180,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
}

// ------------------------------------------------------------------ 敌人
function drawEnemy(ctx, e, t) {
  const r = e.r;
  const bob = Math.sin(t * 3 + e.seed) * 1.6;
  ctx.save();
  ctx.translate(e.x, e.y + bob);

  // 影子
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, r * 0.95, r * 0.9, r * 0.3, 0, 0, 7); ctx.fill();

  if (e.draw === 'wraith') {
    ctx.restore();
    drawPortrait(ctx, { x: e.x, y: e.y + bob, r, t, art: e.art || 'b3', rim: 'rgba(200,180,255,.6)', glow: 'rgba(150,120,255,.3)' });
    return;
  }

  const c1 = e.c || '#2b3140', c2 = e.c2 || '#9fb0d8';
  if (e.draw === 'blob') {
    const w = r * (1 + Math.sin(t * 4 + e.seed) * 0.06);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, 1, 0, 0, w * 1.2);
    g.addColorStop(0, c2);
    g.addColorStop(0.35, c1);
    g.addColorStop(1, '#0b0d12');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, w, w * 0.94, 0, 0, 7);
    ctx.fill();
    // 两只眼睛
    ctx.fillStyle = '#f2f5ff';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(s * r * 0.34, -r * 0.15, r * 0.19, r * 0.24, 0, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#14161c';
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * r * 0.34, -r * 0.12, r * 0.09, 0, 7); ctx.fill();
    }
  } else if (e.draw === 'eye') {
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
    g.addColorStop(0, '#eef3ff');
    g.addColorStop(0.6, c1);
    g.addColorStop(1, '#2a3140');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    // 瞳孔跟着玩家转
    const a = e.aimA || 0;
    ctx.fillStyle = c2;
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.28, Math.sin(a) * r * 0.28, r * 0.42, 0, 7); ctx.fill();
    ctx.fillStyle = '#100c12';
    ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.2, 0, 7); ctx.fill();
    // 血丝
    ctx.strokeStyle = 'rgba(200,80,90,.35)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      const ang = i * 1.7 + e.seed;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ang) * r * 0.5, Math.sin(ang) * r * 0.5);
      ctx.lineTo(Math.cos(ang + 0.4) * r * 0.92, Math.sin(ang + 0.4) * r * 0.92);
      ctx.stroke();
    }
  } else if (e.draw === 'bat') {
    const flap = Math.sin(t * 16 + e.seed) * 0.5;
    ctx.fillStyle = c1;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * r * 1.8, -r * (0.9 + flap), s * r * 2.1, r * 0.25);
      ctx.quadraticCurveTo(s * r * 1.2, r * 0.5, 0, r * 0.5);
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, 7); ctx.fill();
    ctx.fillStyle = c2;
    for (const s of [-1, 1]) ctx.beginPath(); ctx.arc(s * r * 0.3, -r * 0.1, r * 0.13, 0, 7); ctx.fill();
  } else if (e.draw === 'spider') {
    ctx.strokeStyle = c1;
    ctx.lineWidth = 2.6;
    for (let i = 0; i < 4; i++) {
      const a = i * 0.7 + Math.sin(t * 8 + i) * 0.12;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(s * r * 0.9, Math.sin(a) * r * 0.6, s * r * 1.6, Math.cos(a) * r * 0.9);
        ctx.stroke();
      }
    }
    ctx.fillStyle = c1;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.75, 0, 0, 7); ctx.fill();
    ctx.fillStyle = c2;
    for (const s of [-1, 1]) for (let i = 0; i < 2; i++) {
      ctx.beginPath(); ctx.arc(s * r * 0.2, -r * 0.2 + i * r * 0.28, r * 0.11, 0, 7); ctx.fill();
    }
  } else if (e.draw === 'wisp') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.4);
    g.addColorStop(0, 'rgba(255,220,140,.55)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = c2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.8, 0, 0, r);
    ctx.quadraticCurveTo(-r * 0.8, 0, 0, -r);
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath(); ctx.ellipse(0, r * 0.1, r * 0.3, r * 0.45, 0, 0, 7); ctx.fill();
  }
  if (e.hurt > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = Math.min(0.8, e.hurt * 2);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawBoss(ctx, b, t) {
  ctx.save();
  drawPortrait(ctx, {
    x: b.x, y: b.y, r: b.r, t, art: b.art,
    rim: b.phase > 1 ? 'rgba(255,140,140,.8)' : 'rgba(190,205,235,.65)',
    glow: b.phase > 1 ? 'rgba(255,90,90,.35)' : 'rgba(120,160,255,.3)',
    hurt: b.hurt,
  });
  // 蓄力时外圈发红
  if (b.windup > 0) {
    ctx.globalCompositeOperation = 'lighter';
    const a = Math.min(0.5, b.windup * 1.4);
    ctx.strokeStyle = `rgba(255,120,110,${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 8 + Math.sin(t * 18) * 2, 0, 7); ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ 掉落物
function drawHeart(ctx, x, y, s, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 16, s / 16);
  ctx.beginPath();
  ctx.moveTo(0, 5.4);
  ctx.bezierCurveTo(-10, -3, -6.6, -12, 0, -6.4);
  ctx.bezierCurveTo(6.6, -12, 10, -3, 0, 5.4);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -8, 0, 6);
  if (filled) { g.addColorStop(0, '#ff6b62'); g.addColorStop(1, '#c31b2b'); }
  else { g.addColorStop(0, '#241018'); g.addColorStop(1, '#150a10'); }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = filled ? 'rgba(255,190,185,.55)' : 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  ctx.stroke();
  if (filled) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath(); ctx.ellipse(-3.4, -4.4, 2, 1.4, -0.4, 0, 7); ctx.fill();
  }
  ctx.restore();
}

function drawPickup(ctx, p, t) {
  const bob = Math.sin(t * 3 + (p.seed || 0)) * 2;
  ctx.save();
  if (p.kind === 'coin') {
    const im = artImage('coin');
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 7, 7, 2.6, 0, 0, 7); ctx.fill();
    if (im) ctx.drawImage(im, p.x - 8, p.y - 8 + bob, 16, 16);
    else { ctx.fillStyle = '#cfd6e4'; ctx.beginPath(); ctx.arc(p.x, p.y + bob, 7, 0, 7); ctx.fill(); }
    if (p.value > 1) {
      ctx.fillStyle = '#e3b341';
      ctx.font = 'bold 9px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x' + p.value, p.x, p.y + 20);
    }
  } else if (p.kind === 'heart') {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 7, 8, 3, 0, 0, 7); ctx.fill();
    drawHeart(ctx, p.x, p.y + bob, p.half ? 12 : 15, true);
  } else if (p.kind === 'item') {
    // 基座
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 16, 18, 6, 0, 0, 7); ctx.fill();
    const pg = ctx.createLinearGradient(p.x, p.y + 2, p.x, p.y + 16);
    pg.addColorStop(0, '#6b5a48');
    pg.addColorStop(1, '#2b231c');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y + 15);
    ctx.lineTo(p.x - 9, p.y + 3);
    ctx.lineTo(p.x + 9, p.y + 3);
    ctx.lineTo(p.x + 14, p.y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,230,190,.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // 光柱
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(p.x, p.y - 34, p.x, p.y + 6);
    g.addColorStop(0, 'rgba(255,220,150,0)');
    g.addColorStop(0.65, 'rgba(255,220,150,.14)');
    g.addColorStop(1, 'rgba(255,220,150,.30)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y - 34); ctx.lineTo(p.x + 5, p.y - 34);
    ctx.lineTo(p.x + 15, p.y + 6); ctx.lineTo(p.x - 15, p.y + 6);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    const im = artImage('i:' + p.icon);
    const s = 34;
    if (im) ctx.drawImage(im, p.x - s / 2, p.y - 34 + bob, s, s);
    ctx.restore();
    return;
  } else if (p.kind === 'stair') {
    // 下一层的楼梯：地上一个黑洞，往下三级台阶，边上呼吸的光
    ctx.save();
    const rr = 26;
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, rr * 1.6);
    g.addColorStop(0, 'rgba(120,170,255,.30)');
    g.addColorStop(1, 'rgba(120,170,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, rr * 1.6, 0, 7); ctx.fill();
    ctx.fillStyle = '#05070b';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.72, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(170,195,240,.45)';
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, rr, rr * 0.72, 0, 0, 7); ctx.stroke();
    // 台阶
    for (let i = 1; i <= 3; i++) {
      ctx.strokeStyle = `rgba(150,180,230,${0.3 - i * 0.06})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + i * 6, rr - i * 5, (rr - i * 5) * 0.66, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(200,220,255,.85)';
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('下一层', p.x, p.y - rr - 8);
    ctx.restore();
    return;
  } else if (p.kind === 'trinket') {
    const im = artImage('t:' + p.icon);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, 20);
    g.addColorStop(0, 'rgba(180,200,255,.35)');
    g.addColorStop(1, 'rgba(180,200,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, 7); ctx.fill();
    ctx.restore();
    if (im) ctx.drawImage(im, p.x - 12, p.y - 12 + bob, 24, 24);
  }
  // 商店价签
  if (p.price != null && !p.taken) {
    ctx.fillStyle = p.afford === false ? '#e8695f' : '#e3b341';
    ctx.font = 'bold 11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.price + ' 银芯', p.x, p.y + 30);
  }
  ctx.restore();
}
return { WALL, bakeRoom, doorRect, drawDoorState, drawEnemy, drawBoss, drawHeart, drawPickup };
})();

// ---- js/binding-audio.js
const m_binding_audio = await (async () => {

// 全部声音都在这里用 WebAudio 现场合成，页面不带任何音频文件。
//
// 分两层：
//   · 音效（blip / noise 派生）——短、干、可叠加，一次一个包络，不做混响。
//   · 背景音乐（SONGS + 一个前瞻调度器）——每层一套和声走向，只用振荡器：
//     低音铺底、和弦垫、每拍一个琶音，首领层加噪声脉冲。音量压得很低（0.02~0.05），
//     作用是「房间有空气」，不是「有首歌」。静音一个开关全管。
//
// 调度器用 lookahead：每 90ms 醒来一次，把未来 0.28 秒内该响的音符用 ac.currentTime
// 精确排期。这样即使主线程在算弹幕，拍子也不会抖。

const SONGS = {
  // 标题：音乐盒。五声音阶，慢，尾音长
  title: { bpm: 64, root: 60, wave: 'triangle', chords: [[0, 4, 7, 11], [-3, 2, 5, 9], [-5, 0, 4, 7], [-1, 4, 7, 11]], arp: 1, pad: 1, bass: 0, hat: 0, vol: 0.030 },
  // 一层：A 小调，木走廊的步子
  hall: { bpm: 72, root: 57, wave: 'triangle', chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [-2, 2, 5, 9], [0, 3, 7, 10]], arp: 1, pad: 1, bass: 1, hat: 0.5, vol: 0.026 },
  // 二层：D 小调，瓷砖下的半音摩擦
  lab: { bpm: 66, root: 50, wave: 'sine', chords: [[0, 3, 7, 10], [1, 5, 8, 11], [-2, 1, 5, 8], [0, 3, 6, 10]], arp: 1, pad: 1, bass: 1, hat: 0.7, vol: 0.026 },
  // 蜡像馆：三拍子的圆舞曲，慢半拍
  wax: { bpm: 92, root: 55, wave: 'triangle', chords: [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, 0, 3]], arp: 1, pad: 0, bass: 1, hat: 0, vol: 0.024, waltz: 1 },
  // 天台：最稀疏，只有垫音和偶尔的星点
  roof: { bpm: 54, root: 54, wave: 'sine', chords: [[0, 7, 12], [-2, 5, 10], [0, 7, 14], [-4, 3, 8]], arp: 0.4, pad: 1, bass: 0, hat: 0, vol: 0.024 },
  // 首领：低音脉冲 + 三全音
  boss: { bpm: 104, root: 45, wave: 'sawtooth', chords: [[0, 6, 12], [-1, 5, 11], [0, 6, 13], [-2, 4, 10]], arp: 1, pad: 1, bass: 1, hat: 1, vol: 0.030, drive: 1 },
  // 天亮：大调，收束
  dawn: { bpm: 70, root: 62, wave: 'triangle', chords: [[0, 4, 7, 12], [2, 5, 9, 14], [-3, 0, 4, 9], [0, 4, 7, 12]], arp: 1, pad: 1, bass: 1, hat: 0, vol: 0.028 },
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const Audio2 = {
  ac: null,
  master: null,
  muted: false,
  ducked: false,
  key: null,
  step: 0,
  next: 0,
  timer: 0,

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume();
      return this.ac;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ac.destination);
      if (this.key) this.music(this.key, true);
    } catch (e) { this.ac = null; }
    return this.ac;
  },

  setMuted(v) {
    this.muted = !!v;
    if (this.master) this.master.gain.value = this.muted ? 0 : (this.ducked ? 0.32 : 0.9);
  },

  // 暂停 / 对话框打开时把音乐压下去，不是掐断
  duck(on) {
    this.ducked = !!on;
    if (this.master) {
      const ac = this.ac;
      const target = this.muted ? 0 : (this.ducked ? 0.3 : 0.9);
      try { this.master.gain.setTargetAtTime(target, ac.currentTime, 0.12); } catch (e) { this.master.gain.value = target; }
    }
  },

  // ---------------------------------------------------------------- 音效
  tone(freq, at, dur, type, vol) {
    const ac = this.ac;
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(vol, at + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g).connect(this.master);
    o.start(at);
    o.stop(at + dur + 0.03);
  },

  blip(freq, dur, type, vol, slide) {
    if (this.muted) return;
    const ac = this.ensure();
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    const t0 = ac.currentTime;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol == null ? 0.05 : vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  noise(dur, vol, hp) {
    if (this.muted) return;
    const ac = this.ensure();
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp || 400;
    g.gain.value = vol == null ? 0.06 : vol;
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  },

  shoot() { this.blip(620, 0.07, 'square', 0.022, 0.5); },
  hit() { this.noise(0.07, 0.04, 1100); },
  crit() { this.blip(1320, 0.06, 'square', 0.03, 1.7); this.noise(0.1, 0.05, 1800); },
  kill() { this.blip(180, 0.16, 'sawtooth', 0.035, 0.35); },
  hurt() { this.blip(140, 0.22, 'sawtooth', 0.07, 0.6); },
  coin() { this.blip(1180, 0.06, 'triangle', 0.045); setTimeout(() => this.blip(1580, 0.07, 'triangle', 0.035), 52); },
  pickup() { [720, 960, 1240].forEach((f, i) => setTimeout(() => this.blip(f, 0.1, 'triangle', 0.04), i * 55)); },
  item() { [660, 880, 1180, 1480].forEach((f, i) => setTimeout(() => this.blip(f, 0.16, 'triangle', 0.045), i * 85)); },
  heart() { [520, 780].forEach((f, i) => setTimeout(() => this.blip(f, 0.22, 'sine', 0.05), i * 110)); },
  door() { this.blip(220, 0.12, 'sine', 0.045, 1.6); },
  boom() { this.noise(0.32, 0.09, 120); this.blip(90, 0.34, 'sine', 0.07, 0.4); },
  die() { [440, 330, 260, 180].forEach((f, i) => setTimeout(() => this.blip(f, 0.24, 'sine', 0.045), i * 140)); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'triangle', 0.04), i * 70)); },
  stairs() { [700, 560, 440, 330].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'sine', 0.04), i * 90)); },
  roar() {
    this.noise(0.55, 0.085, 90);
    this.blip(70, 0.7, 'sawtooth', 0.07, 0.55);
    setTimeout(() => this.blip(52, 0.6, 'square', 0.05, 0.6), 120);
  },
  unlock() { [784, 988, 1175, 1568].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.04), i * 95)); },
  deny() { this.blip(200, 0.1, 'square', 0.04, 0.8); },
  buy() { this.blip(900, 0.08, 'triangle', 0.04); setTimeout(() => this.blip(1200, 0.1, 'triangle', 0.035), 70); },
  // 打字机：每几个字一声，极轻，避免吵
  type() { this.blip(1500 + Math.random() * 300, 0.02, 'square', 0.008); },

  // ---------------------------------------------------------------- BGM
  music(key, force) {
    if (!key || key === 'none') { this.stopMusic(); return; }
    if (this.key === key && !force) return;
    this.key = key;
    this.step = 0;
    if (!this.ac) { this.ensure(); if (!this.ac) return; }
    const ac = this.ac;
    this.next = ac.currentTime + 0.08;
    if (!this.timer) this.timer = setInterval(() => this._sched(), 90);
    this._sched();
  },

  stopMusic() {
    this.key = null;
    if (this.timer) { clearInterval(this.timer); this.timer = 0; }
  },

  _sched() {
    const ac = this.ac;
    if (!ac || !this.key) return;
    const song = SONGS[this.key];
    if (!song) return;
    const beat = 60 / song.bpm;
    if (this.next < ac.currentTime) this.next = ac.currentTime + 0.05;   // 标签页回来时会落后一大截
    let guard = 0;
    while (this.next < ac.currentTime + 0.28 && guard++ < 24) {
      this._playStep(song, this.step, this.next, beat);
      this.step += 1;
      this.next += beat;
    }
  },

  _playStep(song, step, at, beat) {
    const bar = Math.floor(step / 4) % song.chords.length;
    const chord = song.chords[bar];
    const inBar = step % 4;
    const vol = song.vol;

    // 低音：每两拍一次，压到 root-24 附近，撑住整段
    if (song.bass && inBar % 2 === 0) {
      this.tone(mtof(song.root - 24 + chord[0]), at, beat * 1.7, 'sine', vol * 0.9);
    }
    // 和弦垫：每小节第一个音，长衰减（相当于没有混响的铺底）
    if (song.pad && inBar === 0) {
      for (let i = 0; i < chord.length; i++) {
        this.tone(mtof(song.root - 12 + chord[i]), at, beat * 3.4, song.wave, vol * 0.45);
      }
    }
    // 琶音：每拍一个音，按小节轮转，隔一个八度
    if (song.arp && (song.waltz || inBar % 1 === 0)) {
      const idx = (step + bar) % chord.length;
      const oct = (step % 8 < 4) ? 0 : 12;
      const gate = song.arp < 1 ? (Math.random() < song.arp) : true;
      if (gate) this.tone(mtof(song.root + 12 + chord[idx] + oct), at, beat * 0.85, song.wave, vol * 0.7);
    }
    // 噪声：当节拍器，首领层密一点
    if (song.hat && inBar % (song.drive ? 1 : 2) === 0) {
      this.noiseAt(at, 0.05, song.drive ? 2600 : 3600, vol * 0.32);
    }
    // 首领：每小节第一拍补一个低频冲击
    if (song.drive && inBar === 0) {
      this.tone(mtof(song.root - 12), at, beat * 0.5, 'square', vol * 0.6);
    }
  },

  noiseAt(at, dur, hp, vol) {
    const ac = this.ac;
    if (!ac) return;
    const n = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, n, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = hp;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.buffer = buf;
    src.connect(f).connect(g).connect(this.master);
    src.start(at);
  },
};
return { Audio2 };
})();

// ---- js/binding-story.js
const m_binding_story = await (async () => {

// 「校猫的结合」的世界观与剧情文本。
//
// 全部设定取自《忘却前夜 / Morimens》客户端里提取的剧情与收藏馆档案：
//   · 收藏馆条目原文（银芯、融蚀、提灯教会、小煤球二世、猫的愿望、噩梦魂灯……）
//   · AvgDialog 里关于弥萨格大学、守密人、融蚀侵蚀、提灯灯卫的台词
//   · 唤醒体档案与语音里的语气（学院腔、书面语、偶尔的黑色幽默）
// 同人部分（这只校猫的经历、三层地下、三位首领）是按原作的世界规则新写的，
// 所以每一条世界观都能在原作里找到出处，而故事本身不冒充官方剧情。
//
// 结构：
//   WORLD   世界观条目。随进度解锁，在「设定集」里按原始文本读。
//   SCENES  剧情场景。每个场景一组台词 + 一张程序化背景 + 一段音乐。
//   DEATHS  死亡后的短句池。
//   LORE    造物 / 密契 / 钥令的原作档案原句（items 的 lore 字段从这里取）。

// ------------------------------------------------------------------ 世界观
// cat：world 世界规则 / place 地点 / folk 人与势力 / cat 校猫
// unlock 复用 binding.js 的 meets()：floor / clear / kills / deaths / items / coins / boss / win
const WORLD = [
  {
    k: 'misag', t: '弥萨格大学', en: 'Schola Morimens', cat: 'place', unlock: null,
    body: '山坳里的学校。彩色玻璃把阳光切成碎片，通识课的作业永远写不完，走廊尽头的房间永远比平面图上多一间。\n它真正的课表上只有一门课：怎么和融蚀相处。这门课没有教材，因为教材会自己改写。',
  },
  {
    k: 'erosion', t: '融蚀', en: 'Erosion', cat: 'world', unlock: null,
    body: '现实被啃出来的一道口子。黑色的、黏的、会呼吸。被融蚀浸过的东西会长出不该长的部分，人也是。\n弥萨格把融蚀事件登记在册。最低的那一栏写着：走廊灯坏了，一只猫失踪了。',
  },
  {
    k: 'silver', t: '银芯', en: 'Silver Core', cat: 'world', unlock: null,
    body: '生命被融蚀侵蚀后，极小的概率会析出一种类银物质。它既是巨大的物理能量，也是通往精神维度的一道门缝。\n弥萨格人拿它当钱、当燃料、当武器——反正它本来就不是给人的。',
  },
  {
    k: 'awaken', t: '唤醒体', en: 'Awakener', cat: 'world', unlock: { type: 'floor', v: 1 },
    body: '从银芯里醒来的东西。有人的形状，也有不是人的形状。它们与守密人链接，一起下到不该去的地方。\n学院提醒每一位新生：唤醒体刚苏醒时偶有狂暴迹象，接触时请保持谨慎。',
  },
  {
    k: 'keeper', t: '守密人', en: 'Keeper of Secrets', cat: 'folk', unlock: { type: 'floor', v: 1 },
    body: '弥萨格授予调查员的称号。职责是知道，而不是说出来。\n每个守密人都至少有一只唤醒体，也都有一些不能写进报告里的事。这两件事通常是同一件。',
  },
  {
    k: 'lantern', t: '提灯教会', en: 'The Lantern Church', cat: 'folk', unlock: { type: 'boss', v: 1 },
    body: '信「融蚀是神的赐福，是人类唯一的救赎」的一群人。他们提着灯走进黑暗，把病痛缠身的患者也带进去。\n灯卫是他们的手，守灯人是他们的嘴。他们说光会指引方向——光确实会，只是方向朝下。',
  },
  {
    k: 'catname', t: '小煤球', en: 'Little Coalball', cat: 'cat', unlock: null,
    body: '校门口那只黑猫的名字。其实不是一只猫的名字，是一个名号：谁在校门口待得最久，谁就是小煤球。\n第一代是一只海獭，第二代也是。传到这一代，终于真的是只猫了。\n名誉这种东西，就是这样一辈一辈稀释掉的。',
  },
  {
    k: 'catlaw', t: '乌撒猫猫律', en: 'The Law of Cats', cat: 'cat', unlock: { type: 'deaths', v: 1 },
    body: '第一条：猫可以出现在任何地方。\n第二条：如果猫不该出现在那里，参见第一条。\n第三条：猫不解释。',
  },
  {
    k: 'creation', t: '造物', en: 'Creation', cat: 'world', unlock: { type: 'items', v: 3 },
    body: '银芯凝出来的「记忆的形状」。一枚胸针、一把锁、一盏灯，曾经都属于某个具体的人。\n它们记得自己是什么，所以挂到猫身上时会想家。这就是为什么捡得越多，猫越不像原来那只。',
  },
  {
    k: 'covenant', t: '密契与钥令', en: 'Covenant & Key', cat: 'world', unlock: { type: 'items', v: 6 },
    body: '密契是随身带着的约定，钥令是一次性的许可。\n学院不鼓励学生许愿，因为这里的愿望大多会实现——只是实现的形状和你想要的差一点。',
  },
  {
    k: 'floor1', t: '一层 · 晚自习走廊', en: 'The Late Study Hall', cat: 'place', unlock: { type: 'boss', v: 1 },
    body: '十点半熄灯。十点三十一分，走廊尽头多出一扇门。\n自习室里还坐着人，笔尖一直在动。但没有一个人的作业本上有字。',
  },
  {
    k: 'floor2', t: '二层 · 解剖教室', en: 'The Anatomy Room', cat: 'place', unlock: { type: 'boss', v: 2 },
    body: '泡在罐子里的标本会翻身，翻完就忘了自己翻过。\n蜡像馆的绅士偶尔下来借东西：一把刀、一段肠子、一个人的名字。他从来不还。',
  },
  {
    k: 'floor3', t: '三层 · 天台与梦', en: 'The Roof and the Dream', cat: 'place', unlock: { type: 'boss', v: 3 },
    body: '弥萨格的天台其实没有天台，只有一只替所有人守夜的眼睛。\n它看过每一扇门后面的东西，所以它哪儿也去不了。',
  },
  {
    k: 'wax', t: '以蜡像之名', en: 'In the Name of Wax', cat: 'place', unlock: { type: 'boss', v: 2 },
    body: '为每一个不想被忘记的人塑一尊。塑到第七尊的时候，蜡开始自己走路。\n馆里的规矩只有一条：不要碰展品。因为展品也在等着碰你。',
  },
  {
    k: 'eye', t: '以眼还眼', en: 'An Eye for an Eye', cat: 'world', unlock: { type: 'boss', v: 3 },
    body: '它替你看了整晚：走廊、教室、蜡像、每一扇门后面。\n所以它要你还点什么。这是弥萨格最古老的一条校规，比校规本身还老。',
  },
  {
    k: 'dream', t: '长梦', en: 'The Long Dream', cat: 'world', unlock: { type: 'clear', v: 1 },
    body: '融蚀的尽头是梦，梦的尽头也是融蚀。\n下去的人以为自己在往下走，其实是在往一个已经做过很多次的梦里走。\n唯一的区别是：这一次，猫记得路。',
  },
  {
    k: 'dawn', t: '第十三个小时', en: 'The Thirteenth Hour', cat: 'world', unlock: { type: 'clear', v: 1 },
    body: '弥萨格的夜有十三个小时。第十三个小时不属于任何一天，属于地下。\n它结束的方式很朴素：天亮了，走廊恢复原来的长度，而猫从楼梯口走上来。\n没有人看见。除了门口那个抱着作业本的二年级生。',
  },
];

// ------------------------------------------------------------------ 场景
// k 决定说话人的样式与头像：narr 旁白（无头像）/ cat 校猫内心 / voice 通讯器 / boss 首领
// bg 对应 js/binding-scene.js 的场景键；music 对应 binding-audio.js 的曲目键。
// codex 是这场戏看完解锁的世界观条目。
const SCENES = {
  intro: {
    bg: 'hall', music: 'hall', title: '十点三十一分', codex: ['misag', 'erosion'],
    lines: [
      { k: 'narr', t: '十点三十一分，弥萨格的走廊比熄灯前长了一点。' },
      { k: 'cat', t: '（墙是凉的。凉的就不是梦。梦里的墙是温的。）' },
      { k: 'narr', t: '走廊尽头有一扇平时没有的门。门缝下面漏出光，颜色像泡过银芯的水。' },
      { k: 'cat', t: '（守门的二年级生说过：看见没见过的门，要去找守密人。）' },
      { k: 'cat', t: '（可是守密人今晚在补考。）' },
      { k: 'narr', t: '门里飘出来的味道像罐头。于是这只猫做了一个猫会做的决定。' },
      { k: 'voice', t: '……喂？谁把通讯器打开了。这里信号很差——你已经在下面了？' },
      { k: 'cat', t: '（咪。）' },
      { k: 'voice', t: '是猫。居然真的是猫。行吧，往下的路我记得一点，你跟着我说的走。' },
      { k: 'voice', t: '第一件事：别用爪子碰墙上的黑东西。第二件事：银芯都捡着，下面能换东西。' },
      { k: 'narr', t: '门在身后合上。走廊的灯，一盏接一盏地灭了。' },
    ],
  },
  f1: {
    bg: 'hall', music: 'hall', title: '一层 · 晚自习走廊', codex: ['floor1'],
    lines: [
      { k: 'narr', t: '自习室的门全开着。学生坐得很整齐，笔尖一直在动。' },
      { k: 'cat', t: '（他们的本子上没有字。写了很久了，一页都没有字。）' },
      { k: 'voice', t: '别看他们。看见他们的人会被记进考勤表。' },
      { k: 'cat', t: '（考勤表比融蚀可怕。）' },
    ],
  },
  b1pre: {
    bg: 'hall', music: 'boss', title: '守灯人', codex: ['lantern'],
    lines: [
      { k: 'narr', t: '走廊尽头站着一个提灯的人。灯很亮，亮到看不清他的脸。' },
      { k: 'boss', who: '守灯人', t: '你闻到了吗，孩子。这盏灯里的油，是从很多人身上榨出来的。' },
      { k: 'boss', who: '守灯人', t: '他们说我疯了。我原来也这么觉得，直到我看见了灯照到的地方。' },
      { k: 'narr', t: '灯举高了一点。光落在地板上，地板就往下陷了一点。' },
      { k: 'boss', who: '守灯人', t: '融蚀是赐福。这是教会说的。而教会从不撒谎——他们只是不说全。' },
      { k: 'boss', who: '守灯人', t: '别怕。光会指引方向。' },
      { k: 'cat', t: '（方向朝下。）' },
    ],
  },
  b1post: {
    bg: 'hall', music: 'hall', title: '灯灭了', codex: ['silver'],
    lines: [
      { k: 'narr', t: '灯灭了。走廊没有变亮，反而更暗了一点，像谁松了一只手。' },
      { k: 'narr', t: '灯座底下压着一枚银芯，还有一段往下的楼梯。' },
      { k: 'cat', t: '（凿痕朝上。不是从下面凿的。）' },
      { k: 'voice', t: '……你赢了？一只猫赢了守灯人。我要把这条写进报告，没人会信。' },
      { k: 'voice', t: '下层是解剖教室。罐子里的东西别碰，蜡做的也别碰。' },
    ],
  },
  f2: {
    bg: 'lab', music: 'lab', title: '二层 · 解剖教室', codex: ['floor2'],
    lines: [
      { k: 'narr', t: '瓷砖墙，白得发青。架子上排着一列标本罐，里面的东西都侧着身。' },
      { k: 'cat', t: '（它们在装睡。装得不好，尾巴露出来了。）' },
      { k: 'voice', t: '解剖教室的规矩：只看，不摸，不问这具是谁。' },
      { k: 'voice', t: '……对了。如果你看见一尊会走路的蜡像，那说明今天他心情不错。' },
    ],
  },
  b2pre: {
    bg: 'wax', music: 'wax', title: '劳伦斯先生', codex: ['wax'],
    lines: [
      { k: 'narr', t: '教室中央立着一尊蜡像。绅士打扮，手套雪白，脚下没有影子。' },
      { k: 'boss', who: '劳伦斯先生', t: '晚上好。请不要碰展品。' },
      { k: 'boss', who: '劳伦斯先生', t: '我在等一个人。他说会回来，把我拆掉，然后好好埋了。' },
      { k: 'narr', t: '蜡像的关节响了一声，像有人在他身体里慢慢转一把钥匙。' },
      { k: 'boss', who: '劳伦斯先生', t: '他没来。来的是你。' },
      { k: 'boss', who: '劳伦斯先生', t: '既然我们都被留在这里，就陪我站一会儿吧。站到蜡凉下来为止。' },
      { k: 'cat', t: '（蜡本来就是凉的。）' },
    ],
  },
  b2post: {
    bg: 'wax', music: 'lab', title: '一地蜡', codex: [],
    lines: [
      { k: 'narr', t: '蜡像碎成一地。里面没有骨架，只有一卷胶片。' },
      { k: 'narr', t: '胶片上是这只猫，站在同一条走廊里。毛色不同，眼睛也不同。' },
      { k: 'cat', t: '（……这是第几次了？）' },
      { k: 'voice', t: '别看了。上面那层的东西，看得越久越像自己。' },
      { k: 'voice', t: '楼梯在解剖台后面。第三层不在图纸上——那上面本来什么都没有。' },
    ],
  },
  f3: {
    bg: 'roof', music: 'roof', title: '三层 · 天台与梦', codex: ['floor3'],
    lines: [
      { k: 'narr', t: '楼梯的尽头是夜空。可弥萨格的天台没有这么高。' },
      { k: 'cat', t: '（星星的位置不对。左边那几颗，是教室天花板上的图钉。）' },
      { k: 'voice', t: '……通讯器进水里了。听得见吗？' },
      { k: 'voice', t: '如果上面有只眼睛，别和它对视。它靠这个认人。' },
    ],
  },
  b3pre: {
    bg: 'roof', music: 'boss', title: '「以眼还眼」', codex: ['eye'],
    lines: [
      { k: 'narr', t: '天台中央悬着一只眼睛。它不眨，也没有身体。' },
      { k: 'boss', who: '「以眼还眼」', t: '你终于上来了。' },
      { k: 'boss', who: '「以眼还眼」', t: '我替你看了一整晚：走廊、教室、蜡像、每一扇门后面。' },
      { k: 'boss', who: '「以眼还眼」', t: '我看见了你还不知道的事。比如你为什么会在门口。' },
      { k: 'cat', t: '（它没有身体。它只有一只眼睛，和很多很多影子。）' },
      { k: 'boss', who: '「以眼还眼」', t: '现在，轮到你还我点什么了。' },
      { k: 'boss', who: '「以眼还眼」', t: '以眼还眼，以牙还牙。这是弥萨格最古老的一条校规。' },
    ],
  },
  win: {
    bg: 'dawn', music: 'dawn', title: '天亮', codex: ['dream', 'dawn'],
    lines: [
      { k: 'narr', t: '眼睛闭上了。天上的图钉一颗一颗掉下来。' },
      { k: 'narr', t: '天台终于有了天台的样子：栏杆、风、远处的城市，和一颗不肯天亮的星。' },
      { k: 'narr', t: '然后天就亮了。' },
      { k: 'cat', t: '（身上挂满了不属于我的东西。有一半我认不出来。）' },
      { k: 'cat', t: '（另一半……我记得。是别人的。）' },
      { k: 'narr', t: '十点三十一分，走廊恢复了原来的长度。猫从楼梯口走上来，尾巴上多了一件小东西。' },
      { k: 'narr', t: '没有人看见。除了门口那个抱着作业本的二年级生。' },
      { k: 'voice', who: '二年级生', t: '……小煤球？你怎么弄得这么脏。' },
      { k: 'narr', t: '猫没有回答。猫从来不需要回答。' },
      { k: 'narr', t: '它只是跳上窗台，把那只不属于自己的眼睛，放在了阳光最暖的地方。' },
      { k: 'narr', t: '— 完 —' },
    ],
  },
};

// ------------------------------------------------------------------ 死亡短句
// 每次死随机一句，放在结算页副标题上。
const DEATHS = [
  '猫没有站起来。走廊把他收了起来，像收起一件暂时用不上的东西。',
  '灯又灭了。自习室里的笔尖，一支也没有停。',
  '第十三个小时结束了，而猫还在地下。',
  '它一直走到走不动为止。地板上留下来一串很小的印子，天亮前就没了。',
  '门在身后合上。这一次，没有人听见爪子挠门的声音。',
];

// ------------------------------------------------------------------ 造物档案原句
// 全部来自客户端收藏馆（CollectionHall）条目正文；未收录的几件按同样语气补写。
const LORE = {
  heart: '两颗相依相偎的「心脏」。',
  blood: '它甘甜醇美，散发着蔷薇花香。',
  clamp: '「快、快把它给我！」',
  ink: '有人说这是魔鬼的血，但是，嘿，先试试看吧！',
  ruby: '隐约渗出鲜红。',
  fan: '精致、昂贵，只是不那么实用。',
  lock: '厚实而且坚固的锁，如果没有钥匙，想必很难开启。',
  kaleido: '所思所见皆为幻象。',
  prism: '「光由七种色彩构成。」',
  mirror: '「你在其中窥见了什么？」',
  plano: '光与影的戏法。',
  watch: '记忆凝固在往昔的时间，深埋于黑色之底。',
  dial: '猜一猜，是黑还是白？',
  butterfly: '至今，他也被谁深深地喜爱着。',
  umbrella: '在无光之地绽放。',
  vest: '无法分辨沾染的液体。',
  bone: '鲸落之后，骨头还在长。',
  eyeball: '看得见，就不必再猜。',
  lantern: '引入幻梦。',
  ribbon: '曾经出现在案发现场的缎带，被外力撕扯成了两截。',
  tear: '不要将它放入水中。',
  book: '阅读时请注意安全。',
  lamp: '回应你的愿望。',
  core: '一整块银芯，安静得像一颗还没醒的心脏。',
  wine: '游走于繁星之间。',
  jaw: '陈列在某个收藏家私人展厅内的遗骨。',
  deus: '机械绝对纯净，神明至高无上。',
  rabbit: '所有人都会喜欢白色绒绒兔，包括可爱的爱丽丝。',
  ring36: '旋转，然后遗忘——这是她生命的全部。',
  feast: '尽情享受欢宴吧，于歌声中，庆祝被毁灭的故乡。',
  wolf: '嗷呜，嗷呜！',
  chrysalis: '荷蒙库鲁斯在上，为您奉上纯洁无暇的躯壳。',
  antinomy: '必然的，偶然的。有限的，无限的。',
  april: '他被埋葬在某年的春天。',
  dash: '推开一扇门，门后面是三秒前的你。',
  nova: '它只在最黑的地方升起，然后烧掉一整间房。',
  twin: '所有的她都想帮你，虽然她们只有一只猫大。',
  slow: '把时间泡进蜜里，谁都别想快。',
};

// ------------------------------------------------------------------ 载入提示
// 载入层轮播，比「正在载入」四个字有信息量。
const BOOT_TIPS = [
  '校猫正在把银芯含到安全的地方……',
  '正在清点造物。少了一件，猫不承认。',
  '融蚀正在渗进来。请稍等。',
  '正在说服蜡像先生让一让路……',
];
return { WORLD, SCENES, DEATHS, LORE, BOOT_TIPS };
})();

// ---- js/binding-scene.js
const m_binding_scene = await (async () => {

// 剧情场景的程序化背景。
//
// 为什么画而不是贴图：这一页总共只有「HTML + 一个 bundle」两个请求，任何一张背景图
// 都会让边缘多一次 1~2 秒的往返；而这些场景（走廊 / 教室 / 蜡像馆 / 天台 / 天亮）
// 本来就是几何体堆出来的，用 canvas 画反而更可控——同一段代码既能在 390 宽的手机上
// 成立，也能在 1080 宽的桌面上成立，不用为两种比例各压一张图。
//
// 全部画法是「透视盒子 + 光」：先定消失点，再把地板/墙/门按比例投过去，最后压一层暗角。
// 随机量都用固定种子，保证每次进同一个场景，星星和罐子都在原来的位置。

const TAU = Math.PI * 2;

function seedRnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sky(c, W, H, stops) {
  const g = c.createLinearGradient(0, 0, 0, H);
  for (const [p, col] of stops) g.addColorStop(p, col);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

function glow(c, x, y, r, col, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(0.45, col.replace(/[\d.]+\)$/, (a * 0.45).toFixed(3) + ')'));
  g.addColorStop(1, col.replace(/[\d.]+\)$/, '0)'));
  c.save();
  c.globalAlpha = a;
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.restore();
}

function vignette(c, W, H, a) {
  const g = c.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.25, W / 2, H * 0.52, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ 走廊
function hall(c, t, W, H) {
  sky(c, W, H, [[0, '#0a0d14'], [0.45, '#121722'], [1, '#080b10']]);
  const vx = W * 0.5, vy = H * 0.47;

  // 尽头那扇窗：唯一的光源
  const ww = W * 0.09, wh = H * 0.1;
  glow(c, vx, vy, Math.min(W, H) * 0.42, 'rgba(150,190,255,0.42)', 0.5);
  c.fillStyle = '#20304a';
  c.fillRect(vx - ww, vy - wh * 1.1, ww * 2, wh * 2);
  c.fillStyle = '#9fc0f0';
  c.globalAlpha = 0.5;
  c.fillRect(vx - ww + 2, vy - wh * 1.1 + 2, ww * 2 - 4, wh * 2 - 4);
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(12,18,28,.9)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(vx, vy - wh * 1.1); c.lineTo(vx, vy + wh * 0.9);
  c.moveTo(vx - ww, vy - wh * 0.1); c.lineTo(vx + ww, vy - wh * 0.1);
  c.stroke();

  // 地板：木条朝消失点收敛
  c.save();
  c.beginPath();
  c.moveTo(0, H); c.lineTo(vx - ww * 1.2, vy + wh * 0.9);
  c.lineTo(vx + ww * 1.2, vy + wh * 0.9); c.lineTo(W, H);
  c.closePath(); c.clip();
  c.fillStyle = '#241a16';
  c.fillRect(0, 0, W, H);
  for (let i = -14; i <= 14; i++) {
    const x0 = vx + i * W * 0.035;
    const x1 = vx + i * W * 0.36;
    c.strokeStyle = i % 2 ? 'rgba(74,52,38,.55)' : 'rgba(48,34,26,.7)';
    c.lineWidth = Math.max(1, Math.abs(i) * 0.12);
    c.beginPath(); c.moveTo(x0, vy + wh * 0.9); c.lineTo(x1, H); c.stroke();
  }
  // 横向接缝，越远越密
  for (let k = 1; k <= 9; k++) {
    const p = Math.pow(k / 9, 2.1);
    const y = vy + wh * 0.9 + (H - vy - wh * 0.9) * p;
    c.strokeStyle = 'rgba(20,14,10,.55)';
    c.lineWidth = 1 + p * 2;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  c.restore();

  // 两侧墙 + 门
  for (const side of [-1, 1]) {
    const ex = side < 0 ? 0 : W;
    c.fillStyle = side < 0 ? '#151119' : '#1a1520';
    c.beginPath();
    c.moveTo(ex, 0); c.lineTo(vx + side * ww * 1.2, vy - wh * 1.1);
    c.lineTo(vx + side * ww * 1.2, vy + wh * 0.9); c.lineTo(ex, H);
    c.closePath(); c.fill();

    // 三扇门：靠近观众的更大更靠外，越远越挤向中心（透视缩比 0.42 / 0.30 / 0.20）
    const persp = [0.42, 0.30, 0.20];
    for (let i = 0; i < 3; i++) {
      const p = persp[i];
      const dw = W * 0.075 * p * 2.4;
      const dh = H * 0.62 * p * 1.7;
      const yTop = H * (0.50 - dh * 0.5) + i * H * 0.012;
      const xOuter = side < 0 ? W * (0.03 + (1 - p) * 0.45) : W * (0.97 - (1 - p) * 0.45);
      const x0 = side < 0 ? xOuter : xOuter - dw;
      c.fillStyle = 'rgba(6,5,9,.92)';
      c.fillRect(x0, yTop, dw, dh);
      c.strokeStyle = 'rgba(150,170,215,.07)';
      c.lineWidth = 1;
      c.strokeRect(x0 + 0.5, yTop + 0.5, dw - 1, dh - 1);
      // 门缝里漏出来的光：只有最近那扇门是暖的
      c.fillStyle = i === 0 ? 'rgba(255,205,140,.13)' : 'rgba(130,160,210,.06)';
      c.fillRect(x0 + dw * 0.06, yTop + dh * 0.04, Math.max(2, dw * 0.06), dh * 0.92);
    }
  }

  // 吊灯
  for (const lx of [W * 0.30, W * 0.70]) {
    const lw = Math.min(W, H) * 0.055;
    const ly = H * (0.12 + Math.sin(t * 0.6 + lx) * 0.004);
    c.strokeStyle = 'rgba(20,24,32,.85)';
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx, ly); c.stroke();
    c.fillStyle = '#2a2f3c';
    c.beginPath(); c.ellipse(lx, ly, lw, lw * 0.45, 0, 0, TAU); c.fill();
    const flick = 0.72 + Math.sin(t * 7 + lx) * 0.05 + Math.sin(t * 17.3) * 0.03;
    glow(c, lx, ly + lw * 0.5, lw * 5.4, 'rgba(255,190,110,0.55)', 0.55 * flick);
    c.fillStyle = `rgba(255,222,168,${0.75 * flick})`;
    c.beginPath(); c.ellipse(lx, ly + lw * 0.22, lw * 0.55, lw * 0.3, 0, 0, TAU); c.fill();
  }

  vignette(c, W, H, 0.72);
}

// ------------------------------------------------------------------ 解剖教室
function lab(c, t, W, H) {
  sky(c, W, H, [[0, '#0a1016'], [1, '#060a0e']]);
  // 瓷砖墙
  const s = Math.max(26, Math.min(W, H) * 0.075);
  c.fillStyle = '#1b232c';
  c.fillRect(0, 0, W, H * 0.78);
  for (let y = 0; y < H * 0.78; y += s) {
    for (let x = 0; x < W; x += s) {
      const v = ((x / s + y / s) % 3) * 0.02;
      c.fillStyle = `rgba(${44 + v * 255},${54 + v * 255},${64 + v * 255},1)`;
      c.fillRect(x + 1, y + 1, s - 2, s - 2);
    }
  }
  c.strokeStyle = 'rgba(10,16,22,.65)';
  c.lineWidth = 1;
  for (let y = 0; y < H * 0.78; y += s) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  for (let x = 0; x < W; x += s) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H * 0.78); c.stroke(); }

  // 架子 + 标本罐
  const shelfY = [H * 0.30, H * 0.46, H * 0.62];
  const rnd = seedRnd(9173);
  for (let i = 0; i < shelfY.length; i++) {
    const y = shelfY[i];
    c.fillStyle = '#141b22';
    c.fillRect(W * 0.03, y, W * 0.94, Math.max(3, H * 0.008));
    const n = 7 - i;
    for (let j = 0; j < n; j++) {
      const cw = Math.min(W, H) * 0.042;
      const x = W * 0.06 + j * (W * 0.9 / n) + rnd() * 6;
      const hh = cw * (1.4 + rnd() * 0.9);
      c.fillStyle = 'rgba(120,180,170,.16)';
      c.fillRect(x, y - hh, cw, hh);
      c.strokeStyle = 'rgba(170,220,215,.22)';
      c.lineWidth = 1;
      c.strokeRect(x + 0.5, y - hh + 0.5, cw - 1, hh - 1);
      // 罐子里的东西
      c.fillStyle = 'rgba(28,40,44,.85)';
      const bw = cw * (0.36 + rnd() * 0.26);
      const bh = hh * (0.3 + rnd() * 0.28);
      c.beginPath();
      c.ellipse(x + cw / 2, y - bh * 0.8 - 2, bw * 0.6, bh * 0.6, 0.3, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(200,240,235,.06)';
      c.fillRect(x + cw * 0.15, y - hh + 3, cw * 0.22, hh * 0.5);
    }
  }

  // 中央解剖台
  const tx = W * 0.5, ty = H * 0.74;
  const tw = W * 0.46, th = H * 0.055;
  c.fillStyle = 'rgba(0,0,0,.35)';
  c.beginPath(); c.ellipse(tx, ty + th * 1.9, tw * 0.62, th * 0.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#2c333c';
  c.beginPath();
  c.moveTo(tx - tw / 2, ty); c.lineTo(tx + tw / 2, ty);
  c.lineTo(tx + tw * 0.42, ty + th); c.lineTo(tx - tw * 0.42, ty + th);
  c.closePath(); c.fill();
  c.fillStyle = 'rgba(190,215,230,.10)';
  c.fillRect(tx - tw * 0.46, ty - th * 0.12, tw * 0.92, th * 0.14);
  c.fillStyle = '#1b2128';
  c.fillRect(tx - tw * 0.34, ty + th, tw * 0.06, th * 1.7);
  c.fillRect(tx + tw * 0.28, ty + th, tw * 0.06, th * 1.7);

  // 手术灯
  const lx = tx, ly = H * 0.10;
  c.fillStyle = '#20262e';
  c.beginPath(); c.ellipse(lx, ly, W * 0.06, W * 0.018, 0, 0, TAU); c.fill();
  const flick = 0.86 + Math.sin(t * 5.1) * 0.05;
  // 光锥
  const g = c.createLinearGradient(lx, ly, lx, ty);
  g.addColorStop(0, `rgba(210,240,255,${0.16 * flick})`);
  g.addColorStop(1, 'rgba(210,240,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(lx - W * 0.055, ly); c.lineTo(lx + W * 0.055, ly);
  c.lineTo(lx + W * 0.26, ty); c.lineTo(lx - W * 0.26, ty);
  c.closePath(); c.fill();
  glow(c, lx, ly, Math.min(W, H) * 0.3, 'rgba(200,235,255,0.5)', 0.35 * flick);

  vignette(c, W, H, 0.66);
}

// ------------------------------------------------------------------ 蜡像馆
function wax(c, t, W, H) {
  sky(c, W, H, [[0, '#120b16'], [0.6, '#0d0810'], [1, '#07050a']]);
  // 拱形壁龛
  for (let i = 0; i < 5; i++) {
    const w = W * 0.17;
    const x = W * 0.09 + i * (W * 0.185);
    c.fillStyle = '#1a1220';
    c.beginPath();
    c.moveTo(x, H * 0.66);
    c.lineTo(x, H * 0.30);
    c.quadraticCurveTo(x + w / 2, H * 0.19, x + w, H * 0.30);
    c.lineTo(x + w, H * 0.66);
    c.closePath(); c.fill();
  }
  // 蜡像：头 + 肩 + 底座
  const rnd = seedRnd(4412);
  for (let i = 0; i < 5; i++) {
    const w = W * 0.17;
    const x = W * 0.09 + i * (W * 0.185) + w / 2;
    const base = H * 0.66;
    const hh = H * (0.20 + rnd() * 0.06);
    const bw = w * 0.42;
    c.fillStyle = '#0a070d';
    c.fillRect(x - bw * 0.72, base, bw * 1.44, H * 0.03);
    c.fillStyle = '#2a2130';
    c.beginPath();
    c.moveTo(x - bw * 0.62, base);
    c.lineTo(x - bw * 0.5, base - hh * 0.62);
    c.quadraticCurveTo(x, base - hh * 0.78, x + bw * 0.5, base - hh * 0.62);
    c.lineTo(x + bw * 0.62, base);
    c.closePath(); c.fill();
    // 头
    c.fillStyle = '#332738';
    c.beginPath();
    c.ellipse(x, base - hh * 0.9, bw * 0.33, bw * 0.42, 0, 0, TAU);
    c.fill();
    // 眼窝（暗）+ 一丁点反光
    c.fillStyle = 'rgba(0,0,0,.55)';
    c.beginPath(); c.ellipse(x - bw * 0.13, base - hh * 0.93, bw * 0.07, bw * 0.05, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(x + bw * 0.13, base - hh * 0.93, bw * 0.07, bw * 0.05, 0, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,240,220,.14)';
    c.fillRect(x - bw * 0.28, base - hh * 0.78, bw * 0.1, hh * 0.3);
  }
  // 地面
  c.fillStyle = '#0b0810';
  c.fillRect(0, H * 0.69, W, H * 0.31);
  c.strokeStyle = 'rgba(180,160,200,.05)';
  for (let i = 0; i < 9; i++) {
    const y = H * 0.69 + Math.pow(i / 9, 1.7) * H * 0.31;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // 两盏烛台
  for (const cx of [W * 0.12, W * 0.88]) {
    const cy = H * 0.72;
    c.fillStyle = '#2a2028';
    c.fillRect(cx - 2, cy - H * 0.1, 4, H * 0.1);
    const f = 0.8 + Math.sin(t * 6.2 + cx) * 0.12 + Math.sin(t * 13.1) * 0.06;
    c.fillStyle = '#f6d69a';
    c.beginPath(); c.ellipse(cx, cy - H * 0.105, 3 * f, 6 * f, 0, 0, TAU); c.fill();
    glow(c, cx, cy - H * 0.105, Math.min(W, H) * 0.24, 'rgba(255,190,110,0.5)', 0.5 * f);
  }
  vignette(c, W, H, 0.76);
}

// ------------------------------------------------------------------ 天台
function roof(c, t, W, H) {
  sky(c, W, H, [[0, '#05081a'], [0.5, '#0b1030'], [0.8, '#171a3c'], [1, '#0a0b18']]);
  // 星
  const rnd = seedRnd(77213);
  for (let i = 0; i < 110; i++) {
    const x = rnd() * W, y = rnd() * H * 0.72;
    const s = 0.4 + rnd() * 1.3;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.7 + rnd()) + i));
    c.fillStyle = `rgba(210,225,255,${0.25 + tw * 0.6})`;
    c.fillRect(x, y, s, s);
  }
  // 月
  const mx = W * 0.74, my = H * 0.20, mr = Math.min(W, H) * 0.075;
  glow(c, mx, my, mr * 4.2, 'rgba(180,200,255,0.5)', 0.42);
  c.fillStyle = '#e8eeff';
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(150,165,200,.35)';
  c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, TAU); c.fill();
  c.beginPath(); c.arc(mx + mr * 0.28, my + mr * 0.3, mr * 0.15, 0, TAU); c.fill();
  // 城市剪影
  const rnd2 = seedRnd(3311);
  c.fillStyle = '#05060f';
  let bx = 0;
  while (bx < W) {
    const bw = W * (0.03 + rnd2() * 0.05);
    const bh = H * (0.06 + rnd2() * 0.16);
    c.fillRect(bx, H * 0.70 - bh, bw, bh + H * 0.05);
    // 窗
    c.fillStyle = 'rgba(255,200,120,.18)';
    for (let k = 0; k < 2; k++) {
      if (rnd2() > 0.55) c.fillRect(bx + bw * (0.2 + k * 0.4), H * 0.70 - bh + H * 0.02, bw * 0.12, H * 0.012);
    }
    c.fillStyle = '#05060f';
    bx += bw + W * 0.004;
  }
  // 天台地面
  c.fillStyle = '#0c0d16';
  c.fillRect(0, H * 0.74, W, H * 0.26);
  c.strokeStyle = 'rgba(160,180,230,.06)';
  for (let i = 1; i < 7; i++) {
    const y = H * 0.74 + Math.pow(i / 7, 1.6) * H * 0.26;
    c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
  }
  // 栏杆
  c.strokeStyle = 'rgba(120,140,180,.5)';
  c.lineWidth = Math.max(2, H * 0.006);
  c.beginPath();
  c.moveTo(0, H * 0.70); c.lineTo(W, H * 0.70);
  c.moveTo(0, H * 0.755); c.lineTo(W, H * 0.755);
  c.stroke();
  c.lineWidth = Math.max(1, H * 0.003);
  c.strokeStyle = 'rgba(110,130,170,.36)';
  for (let x = W * 0.02; x < W; x += W * 0.055) {
    c.beginPath(); c.moveTo(x, H * 0.70); c.lineTo(x, H * 0.76); c.stroke();
  }
  vignette(c, W, H, 0.6);
}

// ------------------------------------------------------------------ 融蚀 / 深渊
function abyss(c, t, W, H) {
  sky(c, W, H, [[0, '#050409'], [0.55, '#08060c'], [1, '#030205']]);
  const cx = W / 2, cy = H * 0.46;
  glow(c, cx, cy, Math.min(W, H) * 0.5, 'rgba(120,170,255,0.35)', 0.28);
  // 触须
  for (let i = 0; i < 9; i++) {
    const ph = i * 1.7;
    const baseX = W * (i / 8);
    c.strokeStyle = `rgba(${14 + i * 2},${16 + i},${24 + i * 3},.95)`;
    c.lineWidth = Math.max(3, Math.min(W, H) * (0.02 - i * 0.0014));
    c.beginPath();
    for (let k = 0; k <= 24; k++) {
      const p = k / 24;
      const x = baseX + Math.sin(p * 4 + t * 0.5 + ph) * W * 0.06 * p;
      const y = H - p * H * (0.55 + (i % 3) * 0.12);
      if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
  }
  // 浮着的银芯微粒
  const rnd = seedRnd(5521);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * W;
    const y = ((rnd() * H + t * (6 + rnd() * 14)) % H);
    const a = 0.18 + 0.5 * Math.abs(Math.sin(t * 1.4 + i));
    c.fillStyle = `rgba(190,215,255,${a})`;
    c.fillRect(x, y, 1.6, 1.6);
  }
  vignette(c, W, H, 0.86);
}

// ------------------------------------------------------------------ 天亮
function dawn(c, t, W, H) {
  sky(c, W, H, [
    [0, '#101a3a'], [0.35, '#2c3163'], [0.6, '#7a5470'], [0.78, '#d88a63'], [1, '#f0b57a'],
  ]);
  // 云带
  const rnd = seedRnd(9917);
  for (let i = 0; i < 7; i++) {
    const y = H * (0.22 + i * 0.06);
    const x = ((rnd() * W + t * (2 + i)) % (W * 1.4)) - W * 0.2;
    const w = W * (0.3 + rnd() * 0.5);
    const a = 0.05 + rnd() * 0.07;
    c.fillStyle = `rgba(255,220,200,${a})`;
    c.beginPath(); c.ellipse(x, y, w, H * 0.012, 0, 0, TAU); c.fill();
  }
  // 太阳
  const sx = W * 0.66, sy = H * 0.66;
  glow(c, sx, sy, Math.min(W, H) * 0.6, 'rgba(255,220,160,0.75)', 0.55);
  c.fillStyle = 'rgba(255,246,225,.95)';
  c.beginPath(); c.arc(sx, sy, Math.min(W, H) * 0.048, 0, TAU); c.fill();
  // 校舍剪影
  c.fillStyle = '#1c1a2a';
  const gy = H * 0.74;
  c.fillRect(0, gy, W, H * 0.26);
  for (let i = 0; i < 5; i++) {
    const bw = W * 0.15;
    const bx = W * 0.02 + i * W * 0.2;
    const bh = H * (0.1 + (i % 2) * 0.05);
    c.fillRect(bx, gy - bh, bw, bh);
    // 尖顶
    c.beginPath();
    c.moveTo(bx, gy - bh); c.lineTo(bx + bw / 2, gy - bh - H * 0.05); c.lineTo(bx + bw, gy - bh);
    c.closePath(); c.fill();
  }
  // 树影
  for (let i = 0; i < 6; i++) {
    const tx = W * (0.05 + i * 0.17);
    c.beginPath();
    c.ellipse(tx, gy + H * 0.06, W * 0.05, H * 0.05, 0, 0, TAU);
    c.fill();
  }
  vignette(c, W, H, 0.4);
}

// ------------------------------------------------------------------ 标题：夜空下的校舍
function title(c, t, W, H) {
  sky(c, W, H, [[0, '#070c1c'], [0.4, '#101a38'], [0.72, '#1d2b55'], [1, '#0b1020']]);
  const rnd = seedRnd(20261);
  for (let i = 0; i < 120; i++) {
    const x = rnd() * W, y = rnd() * H * 0.62;
    const s = 0.5 + rnd() * 1.5;
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * (0.5 + rnd() * 0.8) + i * 1.7));
    c.fillStyle = `rgba(214,228,255,${0.3 + tw * 0.7})`;
    c.fillRect(x, y, s, s);
  }
  // 月
  const mx = W * 0.82, my = H * 0.16, mr = Math.min(W, H) * 0.06;
  glow(c, mx, my, mr * 6, 'rgba(180,205,255,0.5)', 0.5);
  c.fillStyle = '#eef3ff';
  c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(170,185,220,.35)';
  c.beginPath(); c.arc(mx - mr * 0.28, my - mr * 0.22, mr * 0.2, 0, TAU); c.fill();
  // 云
  const rnd3 = seedRnd(881);
  for (let i = 0; i < 5; i++) {
    const cy = H * (0.12 + rnd3() * 0.3);
    const cx = ((rnd3() * W + t * (1.5 + i * 0.6)) % (W * 1.5)) - W * 0.25;
    c.fillStyle = `rgba(140,165,220,${0.05 + rnd3() * 0.05})`;
    c.beginPath(); c.ellipse(cx, cy, W * (0.12 + rnd3() * 0.18), H * 0.018, 0, 0, TAU); c.fill();
  }
  // 校舍
  const gy = H * 0.80;
  const rnd2 = seedRnd(6611);
  c.fillStyle = '#060a14';
  // 主楼
  const mw = W * 0.52, mx0 = W * 0.24;
  c.fillRect(mx0, gy - H * 0.30, mw, H * 0.30);
  c.beginPath();
  c.moveTo(mx0, gy - H * 0.30); c.lineTo(mx0 + mw / 2, gy - H * 0.42); c.lineTo(mx0 + mw, gy - H * 0.30);
  c.closePath(); c.fill();
  // 钟楼
  c.fillRect(W * 0.47, gy - H * 0.50, W * 0.06, H * 0.22);
  c.beginPath();
  c.moveTo(W * 0.47, gy - H * 0.50); c.lineTo(W * 0.50, gy - H * 0.58); c.lineTo(W * 0.53, gy - H * 0.50);
  c.closePath(); c.fill();
  // 彩色玻璃窗：唯一暖色
  for (let i = 0; i < 9; i++) {
    const wx = mx0 + mw * (0.06 + i * 0.1);
    const wy = gy - H * 0.24;
    const hue = [255, 205, 155][i % 3];
    const pulse = 0.5 + 0.3 * Math.abs(Math.sin(t * 0.8 + i));
    c.fillStyle = `rgba(${hue},${Math.round(hue * 0.66)},${Math.round(hue * 0.44)},${pulse})`;
    c.fillRect(wx, wy, W * 0.028, H * 0.075);
    glow(c, wx + W * 0.014, wy + H * 0.037, W * 0.06, 'rgba(255,190,120,0.45)', 0.34 * pulse);
  }
  // 侧楼
  c.fillStyle = '#060a14';
  for (let i = 0; i < 2; i++) {
    const bw = W * 0.14;
    const bx = i === 0 ? W * 0.04 : W * 0.80;
    const bh = H * (0.2 + rnd2() * 0.06);
    c.fillRect(bx, gy - bh, bw, bh);
    c.beginPath();
    c.moveTo(bx, gy - bh); c.lineTo(bx + bw / 2, gy - bh - H * 0.06); c.lineTo(bx + bw, gy - bh);
    c.closePath(); c.fill();
  }
  // 地面雾
  const fg = c.createLinearGradient(0, gy - H * 0.02, 0, H);
  fg.addColorStop(0, 'rgba(10,14,26,0)');
  fg.addColorStop(0.35, 'rgba(9,12,22,.85)');
  fg.addColorStop(1, 'rgba(6,8,16,.96)');
  c.fillStyle = fg;
  c.fillRect(0, gy - H * 0.02, W, H - gy + H * 0.02);
  vignette(c, W, H, 0.32);
}

const DRAW = { hall, lab, wax, roof, abyss, dawn, title };

// 对外只留一个入口：key 不认识就画走廊（宁可画错场景，也别让剧情卡住）
function drawScene(c, key, t, W, H) {
  (DRAW[key] || hall)(c, t, W, H);
}
return { drawScene };
})();

// ---- js/binding.js
const m_binding = await (async () => {
const { TUNE, FURS, EYES, COSTUMES, ITEMS, TRINKETS, ACTIVES, ENEMIES, BOSSES, FLOORS, TEXT } = m_binding_data;
const { loadArt, drawCat, drawPortrait, artImage } = m_binding_cat;
const { bakeRoom, drawDoorState, drawEnemy, drawBoss, drawPickup, drawHeart, WALL } = m_binding_draw;
const { ART } = m_binding_art;
const { Audio2 } = m_binding_audio;
const { WORLD, SCENES, DEATHS, LORE } = m_binding_story;
const { drawScene } = m_binding_scene;
// 「校猫的结合」——以撒式房间地牢，主角是弥萨格大学的校猫小煤球。
//
// 结构：
//   G.mode  title → play →（dead / win）       暂停只是 play 上的一个开关
//   run     = 一局的全部状态（血量、造物、楼层、房间表）
//   room    = 网格里的一格，第一次进去才生成内容（build）
// 每帧的顺序固定：输入 → 移动/碰撞 → 射击 → 敌人 → 掉落 → 清房判定 → 画。








const T = TUNE.tile;
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rnd = (a, b) => a + Math.random() * (b - a);
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const DIRS = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] };
const OPP = { n: 's', s: 'n', w: 'e', e: 'w' };
const TAU = Math.PI * 2;

// ------------------------------------------------------------------ 存档
const SAVE_KEY = 'zjtt:binding';
const SAVE_VER = 1;

function defaultMeta() {
  return {
    v: SAVE_VER,
    fur: 'coal', eye: 'gold', costume: 'plain',
    unlock: ['fur:coal', 'eye:gold', 'cos:plain'],
    stats: { kills: 0, deaths: 0, runs: 0, clears: 0, itemsMax: 0, coinsMax: 0, bestFloor: 0, bestScore: 0, rooms: 0, bossKills: 0 },
    muted: false,
    codex: {},       // 已读的世界观条目（设定集）
    seen: {},        // 已看过的剧情场景，避免每次重开都重播
  };
}
function loadMeta() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!raw || raw.v !== SAVE_VER) return defaultMeta();
    const m = Object.assign(defaultMeta(), raw);
    m.stats = Object.assign(defaultMeta().stats, raw.stats || {});
    if (!Array.isArray(m.unlock)) m.unlock = defaultMeta().unlock;
    if (!m.codex || typeof m.codex !== 'object') m.codex = {};
    if (!m.seen || typeof m.seen !== 'object') m.seen = {};
    return m;
  } catch (e) { return defaultMeta(); }
}
function saveMeta() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.meta)); } catch (e) { /* 无痕模式就算了 */ }
}
const hasUnlock = (id) => G.meta.unlock.includes(id);

// ------------------------------------------------------------------ 全局
const G = {
  mode: 'title',
  meta: loadMeta(),
  run: null,
  W: 0, H: 0,             // 当前房间的逻辑尺寸
  cols: 15, rows: 9,
  scale: 1, ox: 0, oy: 0, dpr: 1,
  t: 0, lastTime: 0,
  paused: false,
  ui: {},
  keys: {},
  mouse: { x: 0, y: 0, down: false, active: false },
  touch: { move: null, aim: null },
  toastTimer: 0,
  fx: [],
  shake: 0,
  banner: null,
  story: null,          // 剧情状态机：{ id, scene, i, reveal, full, onDone }
  bg: { cv: null, ctx: null, on: false, w: 0, h: 0 },
};
const run = () => G.run;
const room = () => G.run && G.run.room;

// ------------------------------------------------------------------ 画布
const cv = $('cv');
const ctx = cv.getContext('2d');
const stage = $('stage');

function fit() {
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  G.dpr = dpr;
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  cv.style.width = r.width + 'px';
  cv.style.height = r.height + 'px';
  const W = G.W || G.cols * T, H = G.H || G.rows * T;
  G.scale = Math.min(r.width / W, r.height / H) * 0.98;
  G.ox = (r.width - W * G.scale) / 2;
  G.oy = (r.height - H * G.scale) / 2;
  if (room()) room().baked = bakeRoom(room(), FLOORS[G.run.floor].theme, W, H);
}

const toWorld = (clientX, clientY) => {
  const r = cv.getBoundingClientRect();
  return { x: (clientX - r.left - G.ox) / G.scale, y: (clientY - r.top - G.oy) / G.scale };
};

// ------------------------------------------------------------------ 音效
// 合成器在 js/binding-audio.js：音效 + 每层一套程序化和声，页面不带音频文件。
// 这里只负责在正确的时机点一下。


// ------------------------------------------------------------------ 属性
function baseStats() {
  return {
    hp: TUNE.baseHp, dmg: TUNE.dmg, rate: TUNE.rate, shots: 1, pierce: 0,
    crit: TUNE.crit, critMul: TUNE.critMul, speed: TUNE.speed, tearSpeed: TUNE.tearSpeed,
    range: TUNE.range, luck: 0, coinMul: 1, chargeMul: 1, vision: 0, thorns: 0,
    healKill: 0, healRoom: 0, revive: 0, autoAim: false, explodeKill: false,
    invulnBonus: 0, dmgTaken: 1, tearSize: 1, floorCoins: 0, roomCoins: 0, alternator: 0, dmgMul: 1,
  };
}

function recalcStats() {
  const p = run().p;
  const s = baseStats();
  for (const k of run().items) {
    const eff = (ITEMS.find((i) => i.k === k) || {}).eff || {};
    for (const [key, v] of Object.entries(eff)) {
      if (key === 'dmgMul') s.dmgMul *= v;
      else if (['rate', 'speed', 'tearSpeed', 'range', 'coinMul', 'chargeMul'].includes(key)) s[key] *= v;
      else s[key] = (s[key] || 0) + v;
    }
  }
  if (run().trinket) {
    const tr = TRINKETS.find((x) => x.k === run().trinket);
    if (tr) for (const [key, v] of Object.entries(tr.eff)) {
      if (key === 'dmgMul') s.dmgMul *= v;
      else if (['rate', 'speed', 'tearSpeed', 'range', 'coinMul', 'chargeMul'].includes(key)) s[key] *= v;
      else s[key] = (s[key] || 0) + v;
    }
  }
  const prevMax = p.maxHp || TUNE.baseHp;
  p.maxHp = Math.round(s.hp);
  p.hp = clamp(p.hp + Math.max(0, p.maxHp - prevMax), 0, p.maxHp);
  p.stats = s;
  refreshHud();
}

const accs = () => run().items.map((k) => (ITEMS.find((i) => i.k === k) || {}).look).filter(Boolean);

// ------------------------------------------------------------------ 楼层 / 房间生成
function makeFloor(idx) {
  const F = FLOORS[idx];
  const cells = new Map();
  const key = (x, y) => x + ',' + y;
  const start = { x: 4, y: 4, type: 'start' };
  cells.set(key(4, 4), start);
  const list = [start];
  let guard = 0;
  while (list.length < F.rooms && guard++ < 5000) {
    const base = pickOne(list);
    const d = pickOne(Object.values(DIRS));
    const nx = base.x + d[0], ny = base.y + d[1];
    if (nx < 1 || nx > 7 || ny < 1 || ny > 7 || cells.has(key(nx, ny))) continue;
    const cell = { x: nx, y: ny, type: 'fight' };
    cells.set(key(nx, ny), cell);
    list.push(cell);
  }
  // 连通关系
  for (const c of list) {
    c.doors = { n: false, e: false, s: false, w: false };
    for (const [d, dd] of Object.entries(DIRS)) if (cells.has(key(c.x + dd[0], c.y + dd[1]))) c.doors[d] = true;
  }
  // 广度优先算距离：最远的当首领房，其余死胡同分别当宝箱房 / 商店
  const q = [start];
  const seen = new Map([[key(start.x, start.y), 0]]);
  while (q.length) {
    const c = q.shift();
    for (const dd of Object.values(DIRS)) {
      const nk = key(c.x + dd[0], c.y + dd[1]);
      if (cells.has(nk) && !seen.has(nk)) { seen.set(nk, seen.get(key(c.x, c.y)) + 1); q.push(cells.get(nk)); }
    }
  }
  const rest = list.filter((c) => c !== start).sort((a, b) => (seen.get(key(b.x, b.y)) || 0) - (seen.get(key(a.x, a.y)) || 0));
  const boss = rest.shift();
  if (boss) boss.type = 'boss';
  const deadEnds = rest.filter((c) => Object.values(c.doors).filter(Boolean).length === 1);
  const item = deadEnds.shift() || rest.shift();
  if (item) item.type = 'item';
  const shop = deadEnds.shift() || rest.shift();
  if (shop) shop.type = 'shop';
  for (const c of list) c.seed = Math.floor(Math.random() * 1e9);
  return { cells, start, boss, floorIdx: idx, F };
}

function buildRoom(rm) {
  const W = G.W, H = G.H;
  rm.ents = [];
  rm.shots = [];
  rm.eshot = [];
  rm.pickups = [];
  rm.fx = [];
  rm.boss = null;
  rm.obstacles = [];
  const F = FLOORS[G.run.floor];
  const spawnPt = { x: W / 2, y: H / 2 };

  if (rm.type === 'fight' || rm.type === 'boss') {
    // 课桌：避开门口和中心
    const n = rm.type === 'boss' ? 0 : 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const w = rnd(58, 96), h = rnd(34, 46);
      for (let tryN = 0; tryN < 24; tryN++) {
        const x = rnd(WALL + 26, W - WALL - w - 26), y = rnd(WALL + 26, H - WALL - h - 26);
        const cx = x + w / 2, cy = y + h / 2;
        if (dist(cx, cy, spawnPt.x, spawnPt.y) < 92) continue;
        if (Math.abs(cx - W / 2) < 42 || Math.abs(cy - H / 2) < 42) continue;
        if (rm.obstacles.some((o) => Math.abs(o.x - x) < 40 && Math.abs(o.y - y) < 40)) continue;
        rm.obstacles.push({ x, y, w, h });
        break;
      }
    }
  }

  if (rm.type === 'fight') {
    const cnt = Math.min(7, 2 + G.run.floor + Math.floor(Math.random() * 2) + Math.floor(G.run.roomsCleared / 3));
    for (let i = 0; i < cnt; i++) {
      const pts = { x: rnd(WALL + 50, W - WALL - 50), y: rnd(WALL + 50, H - WALL - 50) };
      if (dist(pts.x, pts.y, spawnPt.x, spawnPt.y) < 110) { i--; continue; }
      rm.ents.push(makeEnemy(pickOne(F.pool), pts.x, pts.y));
    }
  } else if (rm.type === 'item') {
    const key = rollItemKeyFor(rm);
    rm.pickups.push({ kind: 'item', x: W / 2, y: H / 2 - 10, item: key, icon: (ITEMS.find((i) => i.k === key) || {}).ic, seed: 0 });
  } else if (rm.type === 'shop') {
    const opts = [
      { kind: 'heart', half: false, price: 6 },
      { kind: 'item', item: rollItemKeyFor(rm), price: 18 },
      { kind: 'trinket', trinket: pickOne(TRINKETS).k, price: 12 },
    ];
    opts.forEach((o, i) => {
      const p = { x: W / 2 + (i - 1) * 96, y: H / 2 - 6, price: o.price, seed: i, taken: false };
      if (o.kind === 'item') { p.kind = 'item'; p.item = o.item; p.icon = (ITEMS.find((x) => x.k === o.item) || {}).ic; }
      else if (o.kind === 'trinket') { p.kind = 'trinket'; p.trinket = o.trinket; p.icon = (TRINKETS.find((x) => x.k === o.trinket) || {}).ic; }
      else { p.kind = 'heart'; p.half = false; }
      rm.pickups.push(p);
    });
  } else if (rm.type === 'boss') {
    const B = BOSSES[F.boss];
    rm.boss = {
      k: F.boss, n: B.n, sub: B.sub, art: B.art, x: W / 2, y: H / 2 - 20,
      hp: B.hp, maxHp: B.hp, r: B.r, sp: B.sp, atks: B.atks, ringN: B.ringN, ringSp: B.ringSp,
      phase: 1, atkCd: 1.6, atkIdx: 0, windup: 0, dash: 0, dvx: 0, dvy: 0, hurt: 0,
      t: 0, a: 0, seed: Math.random() * 9,
    };
    G.mode = G.mode === 'title' ? G.mode : G.mode;
  }
  rm.cleared = !(rm.type === 'fight' || rm.type === 'boss');
  rm.built = true;
}

function rollItemKey() { return pickOne(ITEMS).k; }
// 已经拿过的少出，避免满地黄装同一样
function rollItemKeyFor(rm) {
  const owned = G.run.items;
  const pool = ITEMS.filter((i) => !owned.includes(i.k));
  const chosen = pickOne(pool.length ? pool : ITEMS);
  return chosen.k;
}

function makeEnemy(type, x, y, scale) {
  const d = ENEMIES[type];
  const sc = scale || 1;
  return {
    type, draw: d.draw, ai: d.ai, n: d.n, x, y, r: d.r * sc,
    hp: d.hp * sc, maxHp: d.hp * sc, sp: d.sp, dmg: d.dmg, c: d.c, c2: d.c2,
    shoot: d.shoot, keep: d.keep, split: d.split, art: d.art,
    vx: 0, vy: 0, hurt: 0, seed: Math.random() * 9, cd: rnd(0.6, 1.8), state: 0, timer: 0, aimA: 0,
  };
}

// ------------------------------------------------------------------ 开始一局
function startRun() {
  G.cols = stage.clientWidth / stage.clientHeight < 0.95 ? 9 : 15;
  G.rows = G.cols === 9 ? 13 : 9;
  G.W = G.cols * T;
  G.H = G.rows * T;
  G.run = {
    floor: 0, p: null, room: null, items: [], trinket: null, active: null,
    coins: 0, hp: TUNE.baseHp, maxHp: TUNE.baseHp, score: 0, kills: 0, roomsCleared: 0,
    startTime: performance.now(), map: null, visitedRooms: 0, t: 0, dead: false, minFloorReached: 0,
  };
  const p = {
    x: G.W / 2, y: G.H / 2, vx: 0, vy: 0, r: TUNE.playerR,
    hp: TUNE.baseHp, maxHp: TUNE.baseHp, invuln: 0, fireCd: 0, hurt: 0, blink: 0, blinkT: rnd(2, 5),
    aim: -Math.PI / 2, moving: false, stats: baseStats(), alt: 0,
  };
  G.run.p = p;
  const m = makeFloor(0);
  G.run.map = m;
  G.run.room = m.start;
  buildRoom(m.start);
  m.start.visited = true;
  p.x = G.W / 2;
  p.y = G.H / 2;
  const act = pickOne(ACTIVES);
  G.run.active = { k: act.k, cd: 0, max: act.cd, twinT: 0, slowT: 0 };
  G.run.fxFresh = true;
  G.mode = 'play';
  G.paused = false;
  document.body.classList.remove('titlestate');
  hideOverlays();
  fit();
  refreshHud();
  renderMinimap();
  banner(FLOORS[0].n, FLOORS[0].tip);
  toast('钥令：' + act.n + '（空格 / 右下角按钮）');
  Audio2.door();
  Audio2.music('hall');
  G.meta.codex['ac:' + act.k] = 1;
  saveMeta();
}

// 真正的开局：先看开场，再落地。开场看完才建房间，这样剧情里不会有人在背后开枪
function beginRun() {
  Audio2.ensure();
  Audio2.setMuted(G.meta.muted);
  playScene('intro', () => {
    startRun();
    playScene('f1');
  });
}

// ------------------------------------------------------------------ 移动与碰撞
function collideRect(e, ob) {
  const cx = clamp(e.x, ob.x, ob.x + ob.w);
  const cy = clamp(e.y, ob.y, ob.y + ob.h);
  let dx = e.x - cx, dy = e.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= e.r * e.r) return false;
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    e.x = cx + (dx / d) * e.r;
    e.y = cy + (dy / d) * e.r;
  } else {
    const dl = e.x - ob.x, dr = ob.x + ob.w - e.x, dt = e.y - ob.y, db = ob.y + ob.h - e.y;
    const mn = Math.min(dl, dr, dt, db);
    if (mn === dl) e.x = ob.x - e.r;
    else if (mn === dr) e.x = ob.x + ob.w + e.r;
    else if (mn === dt) e.y = ob.y - e.r;
    else e.y = ob.y + ob.h + e.r;
  }
  return true;
}

function clampInside(e, allowDoor) {
  const W = G.W, H = G.H, rm = room();
  const cx = W / 2, cy = H / 2;
  const open = (d) => allowDoor && rm.doors[d] && rm.cleared;
  const nGap = open('n') && Math.abs(e.x - cx) < 26;
  const sGap = open('s') && Math.abs(e.x - cx) < 26;
  const wGap = open('w') && Math.abs(e.y - cy) < 26;
  const eGap = open('e') && Math.abs(e.y - cy) < 26;
  const minX = (wGap ? 4 : WALL) + e.r, maxX = (eGap ? W - 4 : W - WALL) - e.r;
  const minY = (nGap ? 4 : WALL) + e.r, maxY = (sGap ? H - 4 : H - WALL) - e.r;
  e.x = clamp(e.x, minX, maxX);
  e.y = clamp(e.y, minY, maxY);
}

// ------------------------------------------------------------------ 输入
function aimAngle() {
  const p = run().p;
  // 鼠标优先（桌面）
  if (G.mouse.active) {
    const w = toWorld(G.mouse.x, G.mouse.y);
    return Math.atan2(w.y - p.y, w.x - p.x);
  }
  // 右摇杆（触屏）
  if (G.touch.aim && (G.touch.aim.dx || G.touch.aim.dy)) return Math.atan2(G.touch.aim.dy, G.touch.aim.dx);
  // 方向键（正统以撒）
  const k = G.keys;
  let ax = 0, ay = 0;
  if (k.ArrowLeft) ax -= 1;
  if (k.ArrowRight) ax += 1;
  if (k.ArrowUp) ay -= 1;
  if (k.ArrowDown) ay += 1;
  if (ax || ay) return Math.atan2(ay, ax);
  // 自动瞄准
  const tgt = nearestEnemy(p.x, p.y, 520);
  if (tgt && p.stats.autoAim) return Math.atan2(tgt.y - p.y, tgt.x - p.x);
  return p.aim;
}

function nearestEnemy(x, y, maxD) {
  let best = null, bd = maxD || 1e9;
  for (const e of room().ents) {
    const d = dist(x, y, e.x, e.y);
    if (d < bd) { bd = d; best = e; }
  }
  if (room().boss) {
    const d = dist(x, y, room().boss.x, room().boss.y);
    if (d < bd) { bd = d; best = room().boss; }
  }
  return best;
}

function wantShoot() {
  if (G.mouse.down) return true;
  if (G.touch.aim) return true;
  const k = G.keys;
  return !!(k.ArrowLeft || k.ArrowRight || k.ArrowUp || k.ArrowDown);
}

// ------------------------------------------------------------------ 射击
function fire() {
  const p = run().p, s = p.stats;
  const a = aimAngle();
  p.aim = a;
  const n = Math.max(1, Math.round(s.shots));
  const spread = n > 1 ? Math.min(0.5, 0.16 * (n - 1)) : 0;
  for (let i = 0; i < n; i++) {
    const ang = a + (i - (n - 1) / 2) * spread;
    let dmg = s.dmg * s.dmgMul;
    if (s.alternator) { p.alt = (p.alt || 0) + 1; if (p.alt % 2 === 0) dmg *= 1 + s.alternator; }
    const crit = Math.random() < s.crit;
    if (crit) dmg *= s.critMul;
    room().shots.push({
      x: p.x + Math.cos(ang) * 14, y: p.y + Math.sin(ang) * 14,
      vx: Math.cos(ang) * s.tearSpeed, vy: Math.sin(ang) * s.tearSpeed,
      r: TUNE.tearR * s.tearSize, dmg, life: (s.range / s.tearSpeed), pierce: s.pierce,
      crit, hit: [], t: 0,
    });
  }
  Audio2.shoot();
  G.shake = Math.max(G.shake, 0.6);
}

// ------------------------------------------------------------------ 更新
function update(dt) {
  const r = G.run, p = r.p, rm = r.room;
  r.t += dt;
  G.t += dt;
  p.invuln = Math.max(0, p.invuln - dt);
  p.hurt = Math.max(0, p.hurt - dt * 3);
  G.shake *= 0.86;

  // ---- 移动
  let mx = 0, my = 0;
  const k = G.keys;
  if (k.KeyA) mx -= 1;
  if (k.KeyD) mx += 1;
  if (k.KeyW) my -= 1;
  if (k.KeyS) my += 1;
  if (G.touch.move) { mx = G.touch.move.dx; my = G.touch.move.dy; }
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  p.moving = ml > 0.05;
  const sp = p.stats.speed * (p.slow ? 0.55 : 1);
  p.vx = mx * sp;
  p.vy = my * sp;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  clampInside(p, true);
  for (const ob of rm.obstacles) collideRect(p, ob);

  // 走路时的轻微上下起伏
  p.bobT = (p.bobT || 0) + dt * (p.moving ? 1 : 0.35);
  // 眨眼
  p.blinkT -= dt;
  if (p.blinkT < 0) { p.blink = 0.12; p.blinkT = rnd(2.4, 6); }
  p.blink = Math.max(0, p.blink - dt);

  // ---- 射击
  p.fireCd -= dt;
  if (wantShoot() && p.fireCd <= 0) {
    fire();
    p.fireCd = 1 / (p.stats.rate || 1);
  }

  // ---- 眼泪
  for (let i = rm.shots.length - 1; i >= 0; i--) {
    const s = rm.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; s.t += dt;
    if (s.life <= 0) { rm.shots.splice(i, 1); continue; }
    let dead = false;
    for (const ob of rm.obstacles) {
      if (s.x > ob.x && s.x < ob.x + ob.w && s.y > ob.y && s.y < ob.y + ob.h) { splash(s, 4); dead = true; break; }
    }
    if (dead) { rm.shots.splice(i, 1); continue; }
    if (s.x < WALL || s.x > G.W - WALL || s.y < WALL || s.y > G.H - WALL) {
      splash(s, 3); rm.shots.splice(i, 1); continue;
    }
    // 打敌人
    const targets = rm.ents.concat(rm.boss ? [rm.boss] : []);
    for (const e of targets) {
      if (s.hit.includes(e)) continue;
      if (dist(s.x, s.y, e.x, e.y) > e.r + s.r) continue;
      hurtEnemy(e, s.dmg, s.crit, s.vx, s.vy);
      s.hit.push(e);
      splash(s, 6);
      if (s.hit.length > s.pierce) { dead = true; }
      break;
    }
    if (dead) rm.shots.splice(i, 1);
  }

  // ---- 敌人
  updateEnemies(dt);

  // ---- 敌方弹幕
  for (let i = rm.eshot.length - 1; i >= 0; i--) {
    const b = rm.eshot[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { rm.eshot.splice(i, 1); continue; }
    let gone = false;
    for (const ob of rm.obstacles) {
      if (b.x > ob.x && b.x < ob.x + ob.w && b.y > ob.y && b.y < ob.y + ob.h) { gone = true; break; }
    }
    if (!gone && (b.x < WALL || b.x > G.W - WALL || b.y < WALL || b.y > G.H - WALL)) gone = true;
    if (gone) { splash(b, 3, true); rm.eshot.splice(i, 1); continue; }
    if (p.invuln <= 0 && dist(b.x, b.y, p.x, p.y) < p.r + b.r) {
      hurtPlayer(b.dmg || 1);
      rm.eshot.splice(i, 1);
    }
  }

  // ---- 掉落物
  for (const pk of rm.pickups) {
    if (pk.taken) continue;
    const d = dist(pk.x, pk.y, p.x, p.y);
    if (pk.kind === 'coin' && d < 44) {
      // 磁吸
      pk.x += (p.x - pk.x) * Math.min(1, dt * 7);
      pk.y += (p.y - pk.y) * Math.min(1, dt * 7);
    }
    const reach = pk.kind === 'item' ? 22 : 16;
    if (d < p.r + reach) tryPickup(pk);
  }

  // ---- 特效
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    f.x += f.vx * dt; f.y += f.vy * dt;
    f.vx *= 0.94; f.vy *= 0.94;
    f.life -= dt;
    if (f.life <= 0) G.fx.splice(i, 1);
  }

  // ---- 钥令冷却
  if (r.active) {
    r.active.cd = Math.max(0, r.active.cd - dt * (p.stats.chargeMul || 1));
    if (r.active.slowT > 0) r.active.slowT -= dt;
    if (r.active.twin && r.active.twinT > 0) {
      r.active.twinT -= dt;
      // 分身自己打
      r.active.twinCd = (r.active.twinCd || 0) - dt;
      if (r.active.twinCd <= 0) {
        r.active.twinCd = 0.45;
        const tg = nearestEnemy(r.active.twin.x, r.active.twin.y, 480);
        if (tg) {
          const a = Math.atan2(tg.y - r.active.twin.y, tg.x - r.active.twin.x);
          rm.shots.push({
            x: r.active.twin.x, y: r.active.twin.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300,
            r: 5, dmg: 2.4, life: 1.1, pierce: 0, crit: false, hit: [], t: 0, twin: true,
          });
        }
      }
    }
  }

  // ---- 清房 / 门
  if (!rm.cleared && rm.ents.length === 0 && !rm.boss) onRoomClear();
  if (rm.boss && rm.boss.hp <= 0) onBossDown();
  if (rm.cleared) checkDoorLeave();

  // ---- 计时类
  if (rm.boss) updateBoss(dt);
}

function updateEnemies(dt) {
  const r = G.run, p = r.p, rm = r.room;
  const slow = r.active && r.active.slowT > 0 ? 0.4 : 1;
  for (const e of rm.ents) {
    e.hurt = Math.max(0, e.hurt - dt * 4);
    const dp = dist(e.x, e.y, p.x, p.y);
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.aimA = ang;
    e.cd -= dt * slow;
    let vx = 0, vy = 0;

    if (e.ai === 'chase') {
      vx = Math.cos(ang) * e.sp;
      vy = Math.sin(ang) * e.sp;
      if (e.wobble) { vx += Math.cos(r.t * 6 + e.seed) * e.sp * 0.5; vy += Math.sin(r.t * 6 + e.seed) * e.sp * 0.5; }
    } else if (e.ai === 'keep') {
      const want = e.keep || 130;
      const dir = dp < want - 20 ? -1 : dp > want + 30 ? 1 : 0;
      vx = Math.cos(ang) * e.sp * dir;
      vy = Math.sin(ang) * e.sp * dir;
      // 侧移
      vx += Math.cos(ang + Math.PI / 2) * e.sp * 0.4 * Math.sin(r.t * 1.2 + e.seed);
      vy += Math.sin(ang + Math.PI / 2) * e.sp * 0.4 * Math.sin(r.t * 1.2 + e.seed);
      if (e.cd <= 0 && dp < 320) { shootAt(e, ang); e.cd = e.shoot.cd; }
    } else if (e.ai === 'orbit') {
      const want = 150;
      const dir = dp < want - 24 ? -1 : dp > want + 24 ? 1 : 0;
      vx = Math.cos(ang) * e.sp * dir + Math.cos(ang + Math.PI / 2) * e.sp * 0.9;
      vy = Math.sin(ang) * e.sp * dir + Math.sin(ang + Math.PI / 2) * e.sp * 0.9;
      if (e.cd <= 0) { shootAt(e, ang); e.cd = e.shoot.cd; }
    } else if (e.ai === 'dash') {
      if (e.state === 0) {
        vx = Math.cos(ang) * e.sp * 0.5; vy = Math.sin(ang) * e.sp * 0.5;
        e.timer += dt;
        if (e.timer > 1.5) { e.state = 1; e.timer = 0; }
      } else if (e.state === 1) {
        // 蓄力（站着抖）
        e.timer += dt;
        if (e.timer > 0.55) { e.state = 2; e.timer = 0; e.dvx = Math.cos(ang) * e.sp * 4.2; e.dvy = Math.sin(ang) * e.sp * 4.2; }
      } else {
        vx = e.dvx; vy = e.dvy;
        e.timer += dt;
        if (e.timer > 0.42) { e.state = 0; e.timer = 0; }
      }
    } else if (e.ai === 'blink') {
      vx = Math.cos(ang) * e.sp * 0.5; vy = Math.sin(ang) * e.sp * 0.5;
      e.timer += dt;
      if (e.timer > 2.6) {
        e.timer = 0;
        for (let i = 0; i < 5; i++) {
          const nx = rnd(WALL + 40, G.W - WALL - 40), ny = rnd(WALL + 40, G.H - WALL - 40);
          if (dist(nx, ny, p.x, p.y) > 90) { e.x = nx; e.y = ny; break; }
        }
        burst(e.x, e.y, 8, 'rgba(180,160,255,.7)');
      }
      if (e.cd <= 0) { shootAt(e, ang); e.cd = e.shoot.cd; }
    }

    // 相互推开，避免叠成一坨
    for (const o of rm.ents) {
      if (o === e) continue;
      const d = dist(e.x, e.y, o.x, o.y);
      const min = e.r + o.r - 2;
      if (d > 0.01 && d < min) {
        e.x += ((e.x - o.x) / d) * (min - d) * 0.5;
        e.y += ((e.y - o.y) / d) * (min - d) * 0.5;
      }
    }

    e.x += vx * dt * slow;
    e.y += vy * dt * slow;
    clampInside(e, false);
    for (const ob of rm.obstacles) collideRect(e, ob);

    // 接触伤害
    if (dp < e.r + p.r - 2 && p.invuln <= 0) {
      hurtPlayer(1);
      if (p.stats.thorns > 0) hurtEnemy(e, p.stats.thorns, false, 0, 0);
    }
  }
}

function shootAt(e, ang) {
  const sh = e.shoot;
  if (!sh) return;
  const n = sh.n || 1;
  const full = sh.spread >= TAU - 0.001;
  for (let i = 0; i < n; i++) {
    const a = full ? (i / n) * TAU : ang + (i - (n - 1) / 2) * (sh.spread || 0.25);
    room().eshot.push({
      x: e.x + Math.cos(a) * (e.r + 2), y: e.y + Math.sin(a) * (e.r + 2),
      vx: Math.cos(a) * sh.sp, vy: Math.sin(a) * sh.sp, r: 5, life: 3.2, dmg: sh.dmg || 1,
    });
  }
  Audio2.blip(320, 0.06, 'sawtooth', 0.02, 0.7);
}

function hurtEnemy(e, dmg, crit, vx, vy) {
  e.hp -= dmg;
  e.hurt = 1;
  const d = Math.hypot(vx, vy) || 1;
  e.x += (vx / d) * 4;
  e.y += (vy / d) * 4;
  G.fx.push({ x: e.x, y: e.y - 4, vx: rnd(-30, 30), vy: rnd(-40, -10), life: 0.35, kind: crit ? 'crit' : 'hit', s: crit ? 9 : 5 });
  Audio2.hit();
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  const r = G.run, rm = r.room;
  const idx = rm.ents.indexOf(e);
  if (idx >= 0) rm.ents.splice(idx, 1);
  r.kills += 1;
  r.score += 12 + r.floor * 6;
  burst(e.x, e.y, 12, e.c2 || '#9fb0d8');
  Audio2.kill();
  if (r.p.stats.explodeKill) {
    G.fx.push({ x: e.x, y: e.y, life: 0.4, kind: 'boom', s: 44 });
    Audio2.boom();
    for (const o of rm.ents.slice()) if (dist(o.x, o.y, e.x, e.y) < 46) hurtEnemy(o, 6, false, 0, 0);
    if (rm.boss && dist(rm.boss.x, rm.boss.y, e.x, e.y) < 60) hurtEnemy(rm.boss, 6, false, 0, 0);
  }
  // 分裂
  if (e.split) {
    for (let i = 0; i < e.split; i++) {
      const c = makeEnemy('crawler', e.x + rnd(-14, 14), e.y + rnd(-14, 14), 0.72);
      rm.ents.push(c);
    }
  }
  // 掉落
  const luck = r.p.stats.luck;
  const coinChance = 0.42 + luck * 0.05;
  if (Math.random() < coinChance) dropCoin(e.x, e.y, Math.random() < 0.12 + luck * 0.04 ? 5 : 1);
  if (Math.random() < 0.035 + luck * 0.012) rm.pickups.push({ kind: 'heart', x: e.x, y: e.y, half: true, seed: Math.random() * 9 });
  if (r.p.stats.healKill) {
    r.healCounter = (r.healCounter || 0) + 1;
    if (r.healCounter >= r.p.stats.healKill) { r.healCounter = 0; heal(1); }
  }
  refreshHud();
}

function dropCoin(x, y, value) {
  room().pickups.push({
    kind: 'coin', x: x + rnd(-6, 6), y: y + rnd(-6, 6), value, seed: Math.random() * 9,
  });
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(30, 150);
    G.fx.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.2, 0.55), kind: 'dot', c: color, s: rnd(1.5, 3.4) });
  }
}

function splash(s, n, enemy) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, sp = rnd(20, 80);
    G.fx.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.12, 0.3), kind: 'dot', c: enemy ? '#ff9aa2' : '#bfe4ff', s: rnd(1, 2.4) });
  }
}

function heal(n) {
  const p = run().p;
  p.hp = Math.min(p.maxHp, p.hp + n);
  refreshHud();
}

function hurtPlayer(dmg) {
  const r = G.run, p = r.p;
  if (p.invuln > 0) return;
  const amount = Math.max(1, Math.round(dmg * (p.stats.dmgTaken || 1)));
  p.hp -= amount;
  p.invuln = TUNE.invuln + (p.stats.invulnBonus || 0);
  p.hurt = 1;
  G.shake = 9;
  Audio2.hurt();
  burst(p.x, p.y, 10, '#ff7a7a');
  refreshHud();
  if (p.hp <= 0) onDeath();
}

function onDeath() {
  const r = G.run;
  if (r.p.stats.revive > 0 && !r.usedRevive) {
    r.usedRevive = true;
    r.p.stats.revive -= 1;
    r.p.hp = 2;
    r.p.invuln = 2.4;
    banner('人鱼泪珠碎了', '你还有一次机会');
    refreshHud();
    return;
  }
  r.dead = true;
  G.mode = 'dead';
  Audio2.die();
  finishRun(false);
}

function onRoomClear() {
  const r = G.run, rm = r.room;
  rm.cleared = true;
  r.roomsCleared += 1;
  r.score += 20;
  Audio2.door();
  banner(rm.type === 'boss' ? '门开了' : '清空', '');
  // 掉落
  const bonus = r.p.stats.roomCoins || 0;
  const n = 1 + Math.floor(Math.random() * 2) + bonus;
  for (let i = 0; i < n; i++) dropCoin(G.W / 2, G.H / 2 + 8, 1);
  if (r.p.stats.healRoom) heal(r.p.stats.healRoom / 2);
  if (Math.random() < 0.09 + r.p.stats.luck * 0.02) {
    rm.pickups.push({ kind: 'trinket', x: G.W / 2 + rnd(-30, 30), y: G.H / 2 + 30, icon: pickOne(TRINKETS).ic, trinket: pickOne(TRINKETS).k, seed: Math.random() * 9 });
  }
  renderMinimap();
  refreshHud();
}

function onBossDown() {
  const r = G.run, rm = r.room;
  if (rm.bossDone) return;
  rm.bossDone = true;
  rm.boss = null;
  rm.cleared = true;
  r.score += 150 + r.floor * 100;
  r.bossKills = (r.bossKills || 0) + 1;
  G.meta.stats.bossKills = (G.meta.stats.bossKills || 0) + 1;
  burst(G.W / 2, G.H / 2, 40, '#ffd98a');
  Audio2.boom();
  // 掉落：一堆银芯 + 一颗心
  for (let i = 0; i < 6; i++) dropCoin(G.W / 2 + rnd(-40, 40), G.H / 2 + rnd(-30, 30), 1);
  rm.pickups.push({ kind: 'heart', x: G.W / 2 + 46, y: G.H / 2, half: false, seed: 1 });
  if (r.floor < FLOORS.length - 1) rm.pickups.push({ kind: 'stair', x: G.W / 2, y: G.H / 2 + 26, seed: 2 });
  if (r.p.stats.floorCoins) r.coins += r.p.stats.floorCoins;
  renderMinimap();
  refreshHud();
  saveMeta();
  if (r.floor >= FLOORS.length - 1) {
    // 最后一只首领倒下 → 结局。这里不放楼梯：上面已经没有地方可以去了
    playScene('win', () => { finishRun(true); });
  } else {
    playScene('b' + (r.floor + 1) + 'post', () => {
      banner('首领倒下', '楼梯出现了');
      Audio2.item();
    });
  }
}

// ------------------------------------------------------------------ 首领
function updateBoss(dt) {
  const r = G.run, rm = r.room, b = rm.boss, p = r.p;
  if (!b) return;
  b.hurt = Math.max(0, b.hurt - dt * 4);
  b.t += dt;
  b.phase = b.hp / b.maxHp < 0.45 ? 2 : 1;
  const ang = Math.atan2(p.y - b.y, p.x - b.x);

  if (b.windup > 0) {
    b.windup -= dt;
    if (b.windup <= 0) {
      // 冲撞
      b.dash = 0.55;
      b.dvx = Math.cos(b.a) * b.sp * 5.2;
      b.dvy = Math.sin(b.a) * b.sp * 5.2;
    }
  } else if (b.dash > 0) {
    b.dash -= dt;
    b.x += b.dvx * dt;
    b.y += b.dvy * dt;
    if (b.x < WALL + b.r || b.x > G.W - WALL - b.r) { b.dvx *= -0.5; b.x = clamp(b.x, WALL + b.r, G.W - WALL - b.r); }
    if (b.y < WALL + b.r || b.y > G.H - WALL - b.r) { b.dvy *= -0.5; b.y = clamp(b.y, WALL + b.r, G.H - WALL - b.r); }
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r && p.invuln <= 0) hurtPlayer(1);
  } else {
    // 缓慢靠近玩家（保持一点距离）
    const d = dist(b.x, b.y, p.x, p.y);
    const want = 150;
    const dir = d > want + 20 ? 1 : d < want - 20 ? -1 : 0;
    b.x += Math.cos(ang) * b.sp * dir * dt;
    b.y += Math.sin(ang) * b.sp * dir * dt;
    b.x = clamp(b.x, WALL + b.r, G.W - WALL - b.r);
    b.y = clamp(b.y, WALL + b.r, G.H - WALL - b.r);
    if (dist(b.x, b.y, p.x, p.y) < b.r + p.r && p.invuln <= 0) hurtPlayer(1);

    b.atkCd -= dt;
    if (b.atkCd <= 0) {
      const atk = b.atks[b.atkIdx % b.atks.length];
      b.atkIdx++;
      b.atkCd = b.phase === 2 ? 1.5 : 2.2;
      b.a = ang;
      if (atk === 'ring') bossRing(b);
      else if (atk === 'aimed') bossAimed(b, ang);
      else if (atk === 'summon') bossSummon(b);
      else if (atk === 'charge') { b.windup = 0.75; }
    }
  }
  // 首领也算「敌人」，让子弹能打中（在 update 的眼泪循环里已包含 rm.boss）
}

function bossRing(b) {
  const n = b.ringN + (b.phase === 2 ? 6 : 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + b.t * 0.4;
    room().eshot.push({ x: b.x, y: b.y, vx: Math.cos(a) * b.ringSp, vy: Math.sin(a) * b.ringSp, r: 5.5, life: 3.4, dmg: 1 });
  }
  Audio2.blip(260, 0.14, 'sawtooth', 0.03, 0.6);
}

function bossAimed(b, ang) {
  const n = b.phase === 2 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.16;
    room().eshot.push({ x: b.x, y: b.y, vx: Math.cos(a) * 190, vy: Math.sin(a) * 190, r: 5.5, life: 3, dmg: 1 });
  }
  Audio2.blip(300, 0.1, 'sawtooth', 0.03, 0.7);
}

function bossSummon(b) {
  const F = FLOORS[G.run.floor];
  for (let i = 0; i < 2; i++) {
    const a = Math.random() * TAU;
    room().ents.push(makeEnemy(pickOne(F.pool), b.x + Math.cos(a) * 80, b.y + Math.sin(a) * 80, 0.9));
  }
  burst(b.x, b.y, 14, '#b0a0ff');
}

// ------------------------------------------------------------------ 拾取
function tryPickup(pk) {
  const r = G.run, p = r.p;
  if (pk.kind === 'heart' && p.hp >= p.maxHp) { toast('血是满的，先别浪费'); return; }
  if (pk.kind === 'stair') { pk.taken = true; goNext(); return; }
  if (pk.price != null && !pk.taken) {
    if (r.coins < pk.price) { toast('银芯不够（要 ' + pk.price + '）'); pk.afford = false; return; }
    r.coins -= pk.price;
    pk.taken = true;
  }
  if (pk.kind === 'coin') {
    r.coins += Math.round(pk.value * (p.stats.coinMul || 1));
    r.score += 2;
    pk.dead = true;
    Audio2.coin();
    G.fx.push({ x: pk.x, y: pk.y, vx: 0, vy: -40, life: 0.5, kind: 'text', txt: '+' + pk.value, c: '#e3b341' });
  } else if (pk.kind === 'heart') {
    heal(pk.half ? 1 : 2);
    pk.dead = true;
    Audio2.item();
  } else if (pk.kind === 'item') {
    takeItem(pk.item);
    pk.dead = true;
  } else if (pk.kind === 'trinket') {
    r.trinket = pk.trinket;
    const t = TRINKETS.find((x) => x.k === pk.trinket);
    recalcStats();
    const tl = LORE[pk.trinket];
    showItemCard(t.n, '密契 · 小饰品', (tl ? '「' + tl + '」\n' : '') + t.t, ART_ICON_T(t.ic));
    Audio2.item();
    G.meta.codex['tr:' + pk.trinket] = 1;
    saveMeta();
    pk.dead = true;
  }
  // 清理
  if (pk.dead) {
    const rm = room();
    const i = rm.pickups.indexOf(pk);
    if (i >= 0) rm.pickups.splice(i, 1);
    refreshHud();
  }
}

function takeItem(key) {
  const r = G.run;
  const it = ITEMS.find((i) => i.k === key);
  if (!it) return;
  r.items.push(key);
  recalcStats();
  // 物品卡上多给一句档案原话：数值看得懂，但那句话才是它原本属于谁
  const lore = LORE[key];
  showItemCard(it.n, '造物 · ' + it.q, (lore ? '「' + lore + '」\n' : '') + it.t, ART_ICON(it.ic));  Audio2.item();
  G.shake = 4;
  G.meta.codex['it:' + key] = 1;
  saveMeta();
  refreshHud();
}

// ------------------------------------------------------------------ 门 / 楼层
function checkDoorLeave() {
  const r = G.run, p = r.p, rm = r.room;
  const W = G.W, H = G.H;
  const cx = W / 2, cy = H / 2;
  let dir = null;
  if (rm.doors.n && Math.abs(p.x - cx) < 26 && p.y < 12) dir = 'n';
  else if (rm.doors.s && Math.abs(p.x - cx) < 26 && p.y > H - 12) dir = 's';
  else if (rm.doors.w && Math.abs(p.y - cy) < 26 && p.x < 12) dir = 'w';
  else if (rm.doors.e && Math.abs(p.y - cy) < 26 && p.x > W - 12) dir = 'e';
  if (!dir) return;
  const [dx, dy] = DIRS[dir];
  const nx = rm.x + dx, ny = rm.y + dy;
  const next = r.map.cells.get(nx + ',' + ny);
  if (!next) return;
  goRoom(next, dir);
}

function goRoom(next, fromDir) {
  const r = G.run;
  r.room = next;
  if (!next.built) buildRoom(next);
  if (!next.visited) {
    next.visited = true;
    r.visitedRooms += 1;
    if (r.p.stats.healRoom && r.trinket === 'april') {
      r.aprilCount = (r.aprilCount || 0) + 1;
      if (r.aprilCount % 3 === 0) heal(1);
    }
  }
  const p = r.p;
  const W = G.W, H = G.H;
  // 从对面那扇门进来
  if (fromDir === 'n') { p.x = W / 2; p.y = H - WALL - 26; }
  else if (fromDir === 's') { p.x = W / 2; p.y = WALL + 26; }
  else if (fromDir === 'w') { p.x = W - WALL - 26; p.y = H / 2; }
  else { p.x = WALL + 26; p.y = H / 2; }
  next.baked = bakeRoom(next, FLOORS[r.floor].theme, W, H);
  G.fx.length = 0;
  renderMinimap();
  Audio2.door();
  if (next.type === 'boss' && next.boss) {
    Audio2.boom();
    // 每层的首领都有一段开场白：先说话，再动手（说过一次就不再打断）
    playScene('b' + (r.floor + 1) + 'pre', () => {
      banner('首领 · ' + next.boss.n, next.boss.sub);
      Audio2.roar();
    });
  } else if (next.type === 'shop') {
    banner('商店', '银芯换东西，价格贴在下面');
  } else if (next.type === 'item') {
    banner('宝箱房', '基座上的东西碰一下就拿走');
  }
}

function goNext() {
  const r = G.run;
  r.floorClear = (r.floorClear || 0) + 1;
  G.meta.stats.floorClear = Math.max(G.meta.stats.floorClear || 0, r.floorClear);
  Audio2.item();
  if (r.floor + 1 >= FLOORS.length) { finishRun(true); return; }
  nextFloor();
}

function nextFloor() {
  const r = G.run;
  r.floor += 1;
  if (r.floor >= FLOORS.length) { finishRun(true); return; }
  r.map = makeFloor(r.floor);
  r.room = r.map.start;
  buildRoom(r.map.start);
  r.map.start.visited = true;
  r.p.x = G.W / 2;
  r.p.y = G.H / 2;
  if (r.p.stats.floorCoins) r.coins += r.p.stats.floorCoins;
  r.baked = null;
  fit();
  renderMinimap();
  refreshHud();
  banner(FLOORS[r.floor].n, FLOORS[r.floor].tip);
  Audio2.item();
  Audio2.music(['hall', 'lab', 'roof'][r.floor] || 'hall');
  // 新一层开场：说完再把操作还给人
  playScene('f' + (r.floor + 1));
}

// ------------------------------------------------------------------ 结算 / 解锁
function finishRun(win) {
  const r = G.run;
  const st = G.meta.stats;
  st.runs += 1;
  st.kills += r.kills;
  if (!win) st.deaths += 1;
  if (win) st.clears += 1;
  st.itemsMax = Math.max(st.itemsMax, r.items.length);
  st.coinsMax = Math.max(st.coinsMax, r.coins);
  st.bestFloor = Math.max(st.bestFloor, win ? FLOORS.length : r.floor + 1);
  st.floorClear = Math.max(st.floorClear || 0, r.floorClear || 0);
  st.bestScore = Math.max(st.bestScore, r.score);
  st.rooms += r.roomsCleared;
  const fresh = checkUnlocks();
  // 设定集和解锁一起结算：进度到了但没读过的东西，在这一刻补进档案
  for (const e of unlockCodexByProgress()) fresh.push({ id: 'codex:' + e.k, name: e.t, kind: '设定' });
  saveMeta();
  G.mode = win ? 'win' : 'dead';
  Audio2.music(win ? 'dawn' : 'none');
  document.body.classList.add('titlestate');
  showEnd(win, fresh);
}

function meets(u) {
  const s = G.meta.stats;
  if (!u) return true;
  if (u.type === 'floor') return (s.floorClear || 0) >= u.v;
  if (u.type === 'clear') return (s.clears || 0) >= u.v;
  if (u.type === 'boss') return (s.bossKills || 0) >= u.v;
  if (u.type === 'win') return (s.clears || 0) >= (u.v || 1);
  if (u.type === 'kills') return (s.kills || 0) >= u.v;
  if (u.type === 'deaths') return (s.deaths || 0) >= u.v;
  if (u.type === 'items') return (s.itemsMax || 0) >= u.v;
  if (u.type === 'coins') return (s.coinsMax || 0) >= u.v;
  return false;
}

function checkUnlocks() {
  const fresh = [];
  const add = (id, name, kind) => {
    if (!G.meta.unlock.includes(id)) { G.meta.unlock.push(id); fresh.push({ id, name, kind }); }
  };
  for (const f of FURS) if (meets(f.unlock)) add('fur:' + f.k, f.n, '毛色');
  for (const e of EYES) if (meets(e.unlock)) add('eye:' + e.k, e.n, '瞳色');
  for (const c of COSTUMES) if (meets(c.unlock)) add('cos:' + c.k, c.n, '造型');
  return fresh;
}

function unlockHint(u) {
  if (!u) return '';
  const map = {
    floor: (v) => `通过第 ${v} 层解锁`,
    clear: (v) => `通关一次解锁`,
    kills: (v) => `累计击杀 ${v} 解锁`,
    deaths: (v) => `累计死亡 ${v} 次解锁`,
    items: (v) => `单局捡到 ${v} 件造物解锁`,
    coins: (v) => `单局拿到 ${v} 银芯解锁`,
  };
  return map[u.type] ? map[u.type](u.v) : '';
}

// ------------------------------------------------------------------ 剧情
// 一条时间线：标题 →（开场）→ 一层 →（首领前 / 后）→ 二层 → …… → 结局。
// 场景是纯数据（js/binding-story.js），这里只做三件事：推进、打字、画背景。
// 剧情期间 G.mode='story'，update() 不跑，但 render() 不画房间——整块画布交给场景背景，
// 所以「对话」不是盖在游戏上的弹窗，而是真的换了一个地方。
function sceneArt(id, scene) {
  if (scene.art) return scene.art;
  const m = /^b(\d)/.exec(id);
  return m ? 'b' + m[1] : null;
}

function storySpeaker(line) {
  if (line.k === 'cat') return '小煤球';
  if (line.k === 'narr') return '旁白';
  if (line.k === 'voice') return line.who || '通讯器';
  if (line.k === 'boss') return line.who || '？？？';
  return line.who || '';
}

function playScene(id, onDone) {
  const scene = SCENES[id];
  if (!scene || !scene.lines || !scene.lines.length) { if (onDone) onDone(); return; }
  // 除结局外，看过的戏不重播（重开一局不该再看一遍同样的独白）
  if (id !== 'win' && G.meta.seen[id]) { if (onDone) onDone(); return; }
  G.meta.seen[id] = 1;
  saveMeta();
  G.story = { id, scene, i: 0, reveal: 0, onDone };
  G.mode = 'story';
  G.paused = false;
  hideOverlays();            // 开局时标题页还盖在上面，不清掉的话剧情在下面演
  $('dlg').classList.add('on');
  $('dlg').className = 'dlg on k-' + (scene.lines[0].k || 'narr');
  $('stage').classList.add('storying');
  Audio2.music(scene.music || 'hall');
  Audio2.duck(true);
  const fresh = unlockCodexByProgress();
  if (fresh.length) toast('设定集解锁：' + fresh.map((e) => e.t).join('、'));
  renderStoryLine();
}

function renderStoryLine() {
  const st = G.story;
  if (!st) return;
  const line = st.scene.lines[st.i];
  const name = storySpeaker(line);
  $('dlgName').textContent = name;
  $('dlg').className = 'dlg on k-' + (line.k || 'narr');
  $('dlgText').textContent = '';
  st.full = line.t;
  st.reveal = 0;
  st.typed = 0;
  drawSpeaker(line);
}

function advanceStory() {
  const st = G.story;
  if (!st) return;
  const line = st.scene.lines[st.i];
  // 第一下先把这句话吐完，第二下才翻页——不然手快的人永远读不完
  if (st.reveal < st.full.length) { st.reveal = st.full.length; $('dlgText').textContent = st.full; return; }
  st.i += 1;
  if (st.i >= st.scene.lines.length) { endStory(); return; }
  renderStoryLine();
  Audio2.blip(520, 0.05, 'triangle', 0.02);
}

function endStory() {
  const st = G.story;
  G.story = null;
  $('dlg').classList.remove('on');
  $('stage').classList.remove('storying');
  Audio2.duck(false);
  const done = st && st.onDone;
  if (G.run && !G.run.dead) {
    G.mode = 'play';
    Audio2.music(G.run.room && G.run.room.type === 'boss' ? 'boss' : (['hall', 'lab', 'roof'][G.run.floor] || 'hall'));
  } else {
    G.mode = 'title';
    Audio2.music('title');
  }
  if (done) done();
}

// 一步推进打字机：每帧按字数补，遇到标点略停（读起来有呼吸）
function tickStory(dt) {
  const st = G.story;
  if (!st) return;
  if (st.reveal < st.full.length) {
    const prev = Math.floor(st.reveal);
    st.reveal = Math.min(st.full.length, st.reveal + dt * 34);
    const now = Math.floor(st.reveal);
    if (now > prev) {
      $('dlgText').textContent = st.full.slice(0, now);
      const ch = st.full[now - 1];
      if (ch && '，。！？…—、'.includes(ch)) st.reveal += 3;
      if (now % 3 === 1) Audio2.type();
    }
  }
  drawStoryBg();
}

function drawStoryBg() {
  const cv = $('storyCv');
  if (!cv || !G.story) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || stage.clientWidth;
  const h = cv.clientHeight || stage.clientHeight;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(c, G.story.scene.bg, G.t, w, h);
}

// 说话人立绘：猫用当前皮肤现画，首领用真立绘套圆框，通讯器画一条波形
function drawSpeaker(line) {
  const cv = $('spkCv');
  if (!cv) return;
  const on = line.k === 'cat' || line.k === 'boss' || line.k === 'voice';
  cv.style.display = on ? 'block' : 'none';
  if (!on) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = 92, h = 92;
  cv.width = w * dpr; cv.height = h * dpr;
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  c.fillStyle = 'rgba(10,14,21,.72)';
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
  c.save();
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 3, 0, 7); c.clip();
  if (line.k === 'cat') {
    drawCat(c, {
      x: w / 2, y: h * 0.99, size: w * 0.98,
      fur: furObj(), eye: eyeObj(), costume: cosObj(), t: G.t, accs: accs(), blink: false,
    });
  } else if (line.k === 'boss') {
    const art = sceneArt(G.story.id, G.story.scene);
    if (art) drawPortrait(c, { x: w / 2, y: h / 2, r: w * 0.42, t: G.t, art, glow: 'rgba(255,120,110,.3)' });
  } else {
    // 通讯器：一圈跳动的波形
    c.strokeStyle = 'rgba(120,200,255,.9)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 32; i++) {
      const x = (i / 32) * w;
      const a = Math.sin(i * 0.7 + G.t * 6) * (h * 0.13) * (0.4 + 0.6 * Math.sin(i * 0.22 + G.t * 2));
      if (i === 0) c.moveTo(x, h / 2 + a); else c.lineTo(x, h / 2 + a);
    }
    c.stroke();
  }
  c.restore();
  c.strokeStyle = line.k === 'boss' ? 'rgba(232,105,95,.6)' : 'rgba(140,160,200,.45)';
  c.lineWidth = 1.5;
  c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2.5, 0, 7); c.stroke();
}

// ------------------------------------------------------------------ 设定集
function unlockCodexByProgress() {
  const fresh = [];
  for (const e of WORLD) {
    if (G.meta.codex[e.k]) continue;
    if (!meets(e.unlock)) continue;
    G.meta.codex[e.k] = 1;
    fresh.push(e);
  }
  if (fresh.length) saveMeta();
  return fresh;
}

function codexHint(u) {
  if (!u) return '';
  const map = {
    floor: (v) => `通过第 ${v} 层`,
    clear: () => '通关一次',
    kills: (v) => `累计击杀 ${v}`,
    deaths: (v) => `累计死亡 ${v} 次`,
    items: (v) => `单局捡到 ${v} 件造物`,
    coins: (v) => `单局拿到 ${v} 银芯`,
    boss: (v) => `打倒第 ${v} 层首领`,
    win: () => '通关一次',
  };
  return map[u.type] ? map[u.type](u.v) : '';
}

function openCodex() {
  G.mode = 'codex';
  $('ovCodex').classList.add('on');
  renderCodex(G.ui.codexTab || 'world');
}

function closeCodex() {
  $('ovCodex').classList.remove('on');
  if (G.run && !G.run.dead) G.mode = 'play';
  else if (G.run) { G.mode = 'dead'; $('ovEnd').classList.add('on'); }
  else { G.mode = 'title'; $('ovTitle').classList.add('on'); }
}

const CAT_NAME = { world: '世界', place: '地点', folk: '人与势力', cat: '校猫' };

function renderCodex(tab) {
  G.ui.codexTab = tab;
  for (const b of $('codexTabs').children) b.classList.toggle('on', b.dataset.tab === tab);
  const host = $('codexList');
  const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
  if (tab === 'world') {
    let html = `<p class="codexcount">已收录 ${got} / ${WORLD.length} 条。往下走、打倒首领、通关，都会往这里添东西。</p>`;
    for (const e of WORLD) {
      const has = !!G.meta.codex[e.k];
      html += `<article class="entry${has ? '' : ' locked'}">
        <h4>${has ? e.t : '？？？'}<span>${has ? (e.en || '') : ''}</span></h4>
        <em>${CAT_NAME[e.cat] || '世界'}</em>
        <p>${has ? e.body.replace(/\n/g, '<br>') : '未解锁 · ' + (codexHint(e.unlock) || '继续探索')}</p>
      </article>`;
    }
    host.innerHTML = html;
  } else {
    const rows = [];
    for (const it of ITEMS) rows.push({ k: 'it:' + it.k, n: it.n, q: it.q, ic: ART_ICON(it.ic), lore: LORE[it.k], t: it.t, kind: '造物' });
    for (const tr of TRINKETS) rows.push({ k: 'tr:' + tr.k, n: tr.n, q: '密契', ic: ART_ICON_T(tr.ic), lore: LORE[tr.k], t: tr.t, kind: '密契' });
    for (const ac of ACTIVES) rows.push({ k: 'ac:' + ac.k, n: ac.n, q: '钥令', ic: ART_ACTIVE(ac.ic), lore: LORE[ac.k], t: ac.t, kind: '钥令' });
    const own = rows.filter((r) => G.meta.codex[r.k]).length;
    let html = `<p class="codexcount">已拾得 ${own} / ${rows.length} 件。捡到过的东西会留下档案——包括官方收藏馆里那句原话。</p>`;
    for (const r of rows) {
      const has = !!G.meta.codex[r.k];
      html += `<article class="entry${has ? '' : ' locked'}">
        <h4>${has ? r.n : '？？？'}<span>${has ? r.kind : ''}</span></h4>
        <div class="row">${r.ic ? `<img src="${r.ic}" alt="">` : ''}<div>
          <em>${has ? (r.lore || '—') : '未拾得 · ' + r.kind}</em>
          <p>${has ? r.t : '还没在下面捡到过这件东西。'}</p>
        </div></div>
      </article>`;
    }
    host.innerHTML = html;
  }
  host.scrollTop = 0;
}

// ------------------------------------------------------------------ UI
function hideOverlays() {
  for (const id of ['ovTitle', 'ovPause', 'ovEnd', 'ovMap', 'ovCodex']) $(id).classList.remove('on');
}
function refreshHud() {
  const r = G.run;
  if (!r) return;
  const p = r.p;
  // ---- 心：整颗 / 半颗 / 空心，用内联 SVG 画，缩放不糊
  const hearts = $('hearts');
  const full = Math.floor(p.hp / 2), half = p.hp % 2;
  const total = Math.ceil(p.maxHp / 2);
  let html = '';
  for (let i = 0; i < total; i++) {
    const kind = i < full ? 'full' : i === full && half ? 'half' : 'empty';
    html += `<svg class="hp ${kind}" viewBox="0 0 16 16" aria-hidden="true"><path class="bg" d="M8 14.2C1.4 9.6 0 5.1 3.3 3.2 5.3 2.1 7.3 3.2 8 4.6 8.7 3.2 10.7 2.1 12.7 3.2 16 5.1 14.6 9.6 8 14.2Z"/><path class="fg" d="M8 14.2C1.4 9.6 0 5.1 3.3 3.2 5.3 2.1 7.3 3.2 8 4.6 8.7 3.2 10.7 2.1 12.7 3.2 16 5.1 14.6 9.6 8 14.2Z"/></svg>`;
  }
  hearts.innerHTML = html;
  $('coinNum').textContent = r.coins;
  // ---- 造物条：一件一张小图，多了折行
  const strip = $('itemStrip');
  strip.innerHTML = r.items.map((k) => {
    const it = ITEMS.find((i) => i.k === k);
    return `<img src="${ART_ICON(it.ic)}" alt="${it.n}" title="${it.n}：${it.t}">`;
  }).join('');
  $('itemCount').textContent = r.items.length;
  // ---- 密契
  const tr = $('trinketSlot');
  if (r.trinket) {
    const t = TRINKETS.find((x) => x.k === r.trinket);
    tr.classList.add('on');
    tr.querySelector('img').src = ART_ICON_T(t.ic);
    tr.title = t.n + '：' + t.t;
  } else {
    tr.classList.remove('on');
    tr.removeAttribute('title');
  }
  // ---- 钥令
  const ab = $('activeBtn');
  if (r.active) {
    ab.classList.add('on');
    const a = ACTIVES.find((x) => x.k === r.active.k);
    ab.querySelector('img').src = ART_ACTIVE(a.ic);
    ab.title = a.n + '：' + a.t;
    ab.querySelector('.ch').textContent = r.active.cd > 0 ? Math.ceil(r.active.cd) + 's' : '就绪';
    ab.classList.toggle('ready', r.active.cd <= 0);
  } else ab.classList.remove('on');
  $('floorName').textContent = FLOORS[r.floor].n;
  $('scoreNum').textContent = r.score;
}

// 图标直取（ART 里全是 data URI，直接查表，不再造 Image 对象）
const ART_ICON = (ic) => ART.items[ic] || '';
const ART_ICON_T = (ic) => ART.trinkets[ic] || '';
const ART_ACTIVE = (ic) => ART.actives[ic] || '';

function banner(title, sub) {
  G.banner = { title, sub, t: 0, life: 2.6 };
}

let toastT = 0;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 1900);
}

// 拾取卡片：不暂停游戏（以撒也不停），但会挂 5 秒，够看清名字和效果
let cardT = 0;
function showItemCard(name, kind, text, src) {
  const el = $('itemCard');
  el.querySelector('img').src = src || '';
  el.querySelector('h4').textContent = name;
  el.querySelector('em').textContent = kind;
  el.querySelector('p').textContent = text;
  el.classList.add('on');
  clearTimeout(cardT);
  cardT = setTimeout(() => el.classList.remove('on'), 5200);
}


// ------------------------------------------------------------------ 小地图
function drawMapTo(canvas, S) {
  const r = G.run;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = canvas.getContext('2d');
  canvas.width = 9 * S * dpr;
  canvas.height = 9 * S * dpr;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, 9 * S, 9 * S);
  if (!r) return;
  const PAD = Math.max(1, S * 0.12);
  const w = S - PAD * 2;
  const cx = (cell) => cell.x * S + S / 2;
  const cy = (cell) => cell.y * S + S / 2;
  // 先画连通线，再画房间块，视觉上像一张地图
  c.strokeStyle = 'rgba(150,168,200,.35)';
  c.lineWidth = Math.max(1, S * 0.12);
  for (const cell of r.map.cells.values()) {
    if (!cell.visited) continue;
    for (const [d, dd] of Object.entries(DIRS)) {
      if (!cell.doors[d]) continue;
      const nx = cell.x + dd[0], ny = cell.y + dd[1];
      const other = r.map.cells.get(nx + ',' + ny);
      if (!other || !other.visited) continue;
      c.beginPath();
      c.moveTo(cx(cell), cy(cell));
      c.lineTo(cx(other), cy(other));
      c.stroke();
    }
  }
  // 与已探索房间相邻、但还没进去过的格子：只画一圈虚框，给个「往哪走」的线索。
  // 大地图上只有一格会很没用（二层开局就是这种情况），但也不该把整层布局白送。
  for (const cell of r.map.cells.values()) {
    if (cell.visited) continue;
    let near = false;
    for (const [d, dd] of Object.entries(DIRS)) {
      if (!cell.doors[d]) continue;
      const other = r.map.cells.get((cell.x + dd[0]) + ',' + (cell.y + dd[1]));
      if (other && other.visited) { near = true; break; }
    }
    if (!near) continue;
    const x = cell.x * S + PAD, y = cell.y * S + PAD;
    c.strokeStyle = 'rgba(150,168,200,.30)';
    c.lineWidth = Math.max(1, S * 0.08);
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, w, Math.max(2, S * 0.16));
    else c.rect(x, y, w, w);
    c.stroke();
  }
  for (const cell of r.map.cells.values()) {
    if (!cell.visited) continue;
    const x = cell.x * S + PAD, y = cell.y * S + PAD;
    let col = '#414d68';
    if (cell.type === 'boss') col = '#8c3038';
    else if (cell.type === 'item') col = '#8a6a2a';
    else if (cell.type === 'shop') col = '#2f6b4f';
    else if (cell.cleared) col = '#44536e';
    c.fillStyle = col;
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, w, w, Math.max(2, S * 0.16));
    else c.rect(x, y, w, w);
    c.fill();
    if (cell === r.room) {
      c.strokeStyle = '#eef2ff';
      c.lineWidth = Math.max(1.4, S * 0.09);
      c.stroke();
    } else {
      c.strokeStyle = 'rgba(255,255,255,.12)';
      c.lineWidth = 1;
      c.stroke();
    }
  }
}

function renderMinimap() {
  if (!G.run) return;
  drawMapTo($('mm'), 18);
  const big = $('bigmap');
  if (big) drawMapTo(big, 26);
}

// ------------------------------------------------------------------ 渲染
function render() {
  const dpr = G.dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.fillStyle = '#05070b';
  ctx.fillRect(0, 0, cv.width, cv.height);
  if (!G.run || !G.run.room) return;
  const r = G.run, rm = r.room, p = r.p;
  const sh = G.shake;
  const sx = sh ? rnd(-sh, sh) : 0, sy = sh ? rnd(-sh, sh) : 0;
  ctx.setTransform(G.scale * dpr, 0, 0, G.scale * dpr, (G.ox + sx) * dpr, (G.oy + sy) * dpr);

  // 房间
  if (rm.baked) ctx.drawImage(rm.baked, 0, 0, G.W, G.H);
  drawDoorState(ctx, rm, G.W, G.H, G.t, rm.cleared);

  // 掉落
  for (const pk of rm.pickups) drawPickup(ctx, pk, G.t);

  // 敌人
  for (const e of rm.ents) drawEnemy(ctx, e, G.t);
  if (rm.boss) drawBoss(ctx, rm.boss, G.t);

  // 敌方弹幕
  for (const b of rm.eshot) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 2.4);
    g.addColorStop(0, 'rgba(255,140,140,.95)');
    g.addColorStop(0.5, 'rgba(235,70,70,.55)');
    g.addColorStop(1, 'rgba(235,70,70,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 2.4, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 眼泪
  for (const s of rm.shots) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 2.2);
    g.addColorStop(0, 'rgba(235,248,255,1)');
    g.addColorStop(0.45, s.crit ? 'rgba(255,230,150,.85)' : 'rgba(150,205,255,.8)');
    g.addColorStop(1, 'rgba(120,180,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 2.2, 0, 7); ctx.fill();
    ctx.restore();
  }

  // 分身
  if (r.active && r.active.twinT > 0) {
    const tw = r.active.twin;
    drawCat(ctx, {
      x: tw.x, y: tw.y, size: 40, fur: furObj(), eye: eyeObj(), costume: cosObj(),
      t: G.t, ghost: true, accs: [],
    });
  }

  // 玩家
  drawCat(ctx, {
    x: p.x, y: p.y, size: 44, fur: furObj(), eye: eyeObj(), costume: cosObj(),
    t: G.t, moving: p.moving, accs: accs(), hurt: p.hurt, ghost: furObj().pat === 'ghost',
    blink: p.blink > 0,
    flip: Math.cos(p.aim) < -0.2 ? -1 : 1,
    dim: p.invuln > 0 && Math.floor(G.t * 20) % 2 === 0,
  });

  // 特效
  for (const f of G.fx) {
    const a = clamp(f.life * 3, 0, 1);
    if (f.kind === 'text') {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.c || '#fff';
      ctx.font = 'bold 12px system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.txt, f.x, f.y);
      ctx.restore();
    } else if (f.kind === 'boom') {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const k = 1 - f.life / 0.4;
      const g = ctx.createRadialGradient(f.x, f.y, 2, f.x, f.y, f.s * (0.4 + k));
      g.addColorStop(0, `rgba(255,220,150,${0.7 * (1 - k)})`);
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.s * (0.4 + k), 0, 7); ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = f.c || (f.kind === 'crit' ? '#ffd98a' : '#bfe4ff');
      ctx.beginPath(); ctx.arc(f.x, f.y, f.s || 2, 0, 7); ctx.fill();
      ctx.restore();
    }
  }

  // 灯光：以猫为中心的一圈亮，其余压暗
  const lightR = 250 + (p.stats.vision || 0);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const lg = ctx.createRadialGradient(p.x, p.y, lightR * 0.45, p.x, p.y, lightR * 1.35);
  lg.addColorStop(0, 'rgba(4,6,10,0)');
  lg.addColorStop(0.6, 'rgba(4,6,10,.12)');
  lg.addColorStop(1, 'rgba(4,6,10,.46)');
  // 猫身上那盏灯照出的暖色，和冷色环境拉一点对比
  const warm = ctx.createRadialGradient(p.x, p.y - 6, 4, p.x, p.y - 6, 120 + (p.stats.vision || 0) * 0.4);
  warm.addColorStop(0, 'rgba(255,190,110,.10)');
  warm.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(-40, -40, G.W + 80, G.H + 80);
  ctx.fillStyle = lg;
  ctx.fillRect(-40, -40, G.W + 80, G.H + 80);
  ctx.restore();

  // 首领血条
  if (rm.boss) {
    const b = rm.boss;
    const w = G.W * 0.56, h = 8;
    const x = (G.W - w) / 2, y = G.H - 34;
    ctx.save();
    ctx.fillStyle = 'rgba(8,10,16,.85)';
    ctx.strokeStyle = 'rgba(200,210,235,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 4);
    else ctx.rect(x - 2, y - 2, w + 4, h + 4);
    ctx.fill(); ctx.stroke();
    const ratio = clamp(b.hp / b.maxHp, 0, 1);
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, b.phase > 1 ? '#ff5a5a' : '#c94a52');
    g.addColorStop(1, b.phase > 1 ? '#ff9a5a' : '#8a2f3a');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '11px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.n, G.W / 2, y - 6);
    ctx.restore();
  }

  // 楼层 / 首领横幅：进出房间的提示，2.6 秒淡出
  if (G.banner) {
    const b = G.banner;
    const k = b.t / b.life;
    const a = k < 0.12 ? k / 0.12 : k > 0.72 ? Math.max(0, (1 - k) / 0.28) : 1;
    const h = b.sub ? 66 : 46;
    ctx.save();
    ctx.globalAlpha = a;
    const bg = ctx.createLinearGradient(0, G.H * 0.16, 0, G.H * 0.16 + h);
    bg.addColorStop(0, 'rgba(6,9,14,0)');
    bg.addColorStop(0.35, 'rgba(6,9,14,.72)');
    bg.addColorStop(1, 'rgba(6,9,14,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, G.H * 0.16, G.W, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eef2ff';
    ctx.font = 'bold 19px system-ui,-apple-system,sans-serif';
    ctx.fillText(b.title, G.W / 2, G.H * 0.16 + 28);
    if (b.sub) {
      ctx.fillStyle = '#9aa4bb';
      ctx.font = '12px system-ui,-apple-system,sans-serif';
      ctx.fillText(b.sub, G.W / 2, G.H * 0.16 + 47);
    }
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const furObj = () => FURS.find((f) => f.k === G.meta.fur) || FURS[0];
const eyeObj = () => EYES.find((e) => e.k === G.meta.eye) || EYES[0];
const cosObj = () => COSTUMES.find((c) => c.k === G.meta.costume) || COSTUMES[0];

// ------------------------------------------------------------------ 帧循环
function loop(now) {
  const dt = G.lastTime ? Math.min(0.05, (now - G.lastTime) / 1000) : 0;
  G.lastTime = now;
  requestAnimationFrame(loop);
  try {
    if (G.mode === 'play' && !G.paused) update(dt);
    if (G.mode === 'story') tickStory(dt);
    // 剧情期间横幅的计时也要停：不然回到房间时提示已经过期了
    if (G.banner && G.mode !== 'story') {
      G.banner.t += dt;
      if (G.banner.t > G.banner.life) G.banner = null;
    }
    G.t += dt;
    if (G.mode === 'play' || G.mode === 'pause') render();
    if (G.mode === 'title') { drawTitleCat(now / 1000); drawBgCanvas(); }
    if (G.mode === 'codex') drawBgCanvas();
    if (G.mode === 'story') drawSpeakerTick();
  } catch (err) {
    // 游戏循环里任何一帧出错都不该把整局冻住：记一次日志，下一帧照常跑
    if (!G.warned) {
      G.warned = true;
      console.error('[binding] frame error', err);
    }
  }
}

// 标题页背后的夜景（校舍 + 星 + 月）。只在标题/设定集时出，进游戏就藏起来，
// 不然一张全屏渐变天天在 60fps 重画是白烧电。
function drawBgCanvas() {
  const cv = G.bg.cv;
  if (!cv) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = cv.clientWidth || window.innerWidth;
  const h = cv.clientHeight || window.innerHeight;
  if (!w || !h) return;
  if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const c = G.bg.ctx;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(c, 'title', G.t, w, h);
}

let spkFrame = 0;
// 头像里的通讯器波形 / 首领刻痕在动，每 3 帧重画一次就够顺
function drawSpeakerTick() {
  if (!G.story) return;
  if (spkFrame++ % 3) return;
  const line = G.story.scene.lines[G.story.i];
  if (line && (line.k === 'voice' || line.k === 'boss')) drawSpeaker(line);
}

// 标题页那只猫（慢慢呼吸、眨眼）
function drawTitleCat(t) {
  const c = G.ui.titleCanvas;
  if (!c) return;
  const x = c.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth || 220, h = c.clientHeight || 220;
  if (c.width !== Math.round(w * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  x.clearRect(0, 0, w, h);
  const blink = (t % 4.2) > 4.05;
  drawCat(x, {
    x: w / 2, y: h * 0.92, size: Math.min(w, h) * 0.82,
    fur: furObj(), eye: eyeObj(), costume: cosObj(), t, accs: [], blink,
  });
}

// ------------------------------------------------------------------ 事件绑定
function bindUi() {
  G.ui.titleCanvas = $('titleCat');

  // 选择器
  const mkChips = (hostId, list, curKey, onPick, kind) => {
    const host = $(hostId);
    host.innerHTML = '';
    for (const it of list) {
      const id = kind + ':' + it.k;
      const locked = !hasUnlock(id);
      const b = document.createElement('button');
      b.className = 'chip' + (curKey === it.k ? ' on' : '') + (locked ? ' locked' : '');
      b.innerHTML = `<span>${it.n}</span>${locked ? '<i>锁</i>' : ''}`;
      b.title = locked ? (it.hint || '') + ' · ' + unlockHint(it.unlock) : (it.hint || '');
      b.onclick = () => {
        if (locked) { toast(unlockHint(it.unlock)); return; }
        onPick(it.k);
        mkChips(hostId, list, it.k, onPick, kind);
        Audio2.blip(700, 0.05, 'triangle', 0.03);
      };
      host.appendChild(b);
    }
  };
  const refreshChips = () => {
    mkChips('furChips', FURS, G.meta.fur, (k) => { G.meta.fur = k; saveMeta(); }, 'fur');
    mkChips('eyeChips', EYES, G.meta.eye, (k) => { G.meta.eye = k; saveMeta(); }, 'eye');
    mkChips('cosChips', COSTUMES, G.meta.costume, (k) => { G.meta.costume = k; saveMeta(); }, 'cos');
  };
  G.ui.refreshChips = refreshChips;
  refreshChips();

  $('btnStart').onclick = () => beginRun();
  $('btnHelp').onclick = () => $('ovHelp').classList.toggle('on');
  $('btnCodex').onclick = () => openCodex();
  $('btnPauseCodex').onclick = () => openCodex();
  $('btnCodexClose').onclick = () => closeCodex();
  for (const b of $('codexTabs').children) b.onclick = () => renderCodex(b.dataset.tab);
  $('dlgSkip').onclick = (e) => { e.stopPropagation(); endStory(); };
  $('btnPause').onclick = () => togglePause();
  $('btnPauseBack').onclick = () => { G.paused = false; hideOverlays(); G.mode = 'play'; Audio2.duck(false); };
  $('btnPauseRetry').onclick = () => { hideOverlays(); Audio2.duck(false); startRun(); };
  $('btnPauseQuit').onclick = () => { G.paused = false; hideOverlays(); Audio2.duck(false); toTitle(); };
  $('btnAgain').onclick = () => { hideOverlays(); beginRun(); };
  $('btnQuit').onclick = () => { hideOverlays(); toTitle(); };
  $('btnMap').onclick = () => { renderMinimap(); $('ovMap').classList.add('on'); };
  $('btnMapClose').onclick = () => $('ovMap').classList.remove('on');
  $('coinIcon').src = ART.coin;
  // 开局的按键说明，玩起来 8 秒后自己淡掉
  setTimeout(() => $('hintBar').classList.add('off'), 8000);
  $('activeBtn').onclick = () => useActive();
  $('muteBtn').onclick = () => {
    G.meta.muted = !G.meta.muted;
    saveMeta();
    Audio2.ensure();
    Audio2.setMuted(G.meta.muted);
    $('muteLabel').textContent = G.meta.muted ? '静音' : '音效';
    $('muteBtn').classList.toggle('off', G.meta.muted);
    toast(G.meta.muted ? '已静音' : '音效已开');
  };
  $('muteLabel').textContent = G.meta.muted ? '静音' : '音效';
  $('muteBtn').classList.toggle('off', G.meta.muted);

  // 对话层：点哪儿都行。手机上不用找按钮
  $('dlg').onclick = () => advanceStory();

  // 键盘
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    // 剧情期间只认「推进」和「跳过」，别让方向键偷偷控制房间里那只猫
    if (G.story) {
      if (e.code === 'Space' || e.code === 'Enter') advanceStory();
      else if (e.code === 'Escape') endStory();
      return;
    }
    G.keys[e.code] = true;
    if (e.code === 'Escape') togglePause();
    if (e.code === 'Space') useActive();
    if (e.code === 'KeyM') $('btnMap').click();
  });
  window.addEventListener('keyup', (e) => { G.keys[e.code] = false; });
  window.addEventListener('blur', () => { G.keys = {}; G.mouse.down = false; });

  // 鼠标（桌面瞄准 + 射击）
  cv.addEventListener('mousemove', (e) => {
    G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.active = true;
  });
  cv.addEventListener('mousedown', (e) => {
    if (G.mode !== 'play') return;
    G.mouse.down = true;
    G.mouse.x = e.clientX; G.mouse.y = e.clientY; G.mouse.active = true;
    Audio2.ensure();
  });
  window.addEventListener('mouseup', () => { G.mouse.down = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  // 触屏：左半屏移动、右半屏瞄准射击（双摇杆）
  const touchStart = (e) => {
    if (G.mode !== 'play') return;
    Audio2.ensure();
    for (const tch of e.changedTouches) {
      const rect = cv.getBoundingClientRect();
      const left = tch.clientX - rect.left < rect.width * 0.5;
      const stick = { id: tch.identifier, x0: tch.clientX, y0: tch.clientY, dx: 0, dy: 0, x: tch.clientX, y: tch.clientY };
      if (left && !G.touch.move) G.touch.move = stick;
      else if (!left && !G.touch.aim) G.touch.aim = stick;
    }
    e.preventDefault();
  };
  const touchMove = (e) => {
    for (const tch of e.changedTouches) {
      for (const key of ['move', 'aim']) {
        const s = G.touch[key];
        if (s && s.id === tch.identifier) {
          s.x = tch.clientX; s.y = tch.clientY;
          const dx = s.x - s.x0, dy = s.y - s.y0;
          const d = Math.hypot(dx, dy);
          const max = 52;
          const k = d > max ? max / d : 1;
          s.dx = (dx * k) / max; s.dy = (dy * k) / max;
        }
      }
    }
    e.preventDefault();
  };
  const touchEnd = (e) => {
    for (const tch of e.changedTouches) {
      for (const key of ['move', 'aim']) {
        const s = G.touch[key];
        if (s && s.id === tch.identifier) G.touch[key] = null;
      }
    }
    e.preventDefault();
  };
  cv.addEventListener('touchstart', touchStart, { passive: false });
  cv.addEventListener('touchmove', touchMove, { passive: false });
  cv.addEventListener('touchend', touchEnd, { passive: false });
  cv.addEventListener('touchcancel', touchEnd, { passive: false });

  window.addEventListener('resize', () => { if (G.mode === 'play') fit(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.mode === 'play' && !G.paused) togglePause();
  });
}

function togglePause() {
  if (G.mode !== 'play') return;
  G.paused = !G.paused;
  if (G.paused) {
    $('ovPause').classList.add('on');
    Audio2.duck(true);
  } else {
    $('ovPause').classList.remove('on');
    Audio2.duck(false);
  }
}

function toTitle() {
  G.mode = 'title';
  G.paused = false;
  G.run = null;
  const st = G.meta.stats;
  $('bestInfo').innerHTML = `最深 <b>${st.bestFloor}</b> 层 · 最高分 <b>${st.bestScore}</b> · 通关 <b>${st.clears}</b> 次 · 累计击杀 <b>${st.kills}</b>`;
  const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
  $('codexInfo').textContent = `设定集 ${got} / ${WORLD.length}`;
  G.ui.refreshChips();
  document.body.classList.add('titlestate');
  $('ovTitle').classList.add('on');
  $('ovEnd').classList.remove('on');
  Audio2.duck(false);
  Audio2.music('title');
}

// ------------------------------------------------------------------ 钥令
function useActive() {
  const r = G.run;
  if (!r || G.mode !== 'play') return;
  if (!r.active) return;
  if (r.active.cd > 0) { toast('还在冷却 ' + Math.ceil(r.active.cd) + 's'); return; }
  const p = r.p, rm = r.room;
  const a = ACTIVES.find((x) => x.k === r.active.k);
  if (r.active.k === 'dash') {
    const ang = aimAngle();
    const nx = clamp(p.x + Math.cos(ang) * 120, WALL + p.r, G.W - WALL - p.r);
    const ny = clamp(p.y + Math.sin(ang) * 120, WALL + p.r, G.H - WALL - p.r);
    for (let i = 0; i < 10; i++) {
      const k = i / 10;
      G.fx.push({ x: p.x + (nx - p.x) * k, y: p.y + (ny - p.y) * k, vx: 0, vy: 0, life: 0.3, kind: 'dot', c: '#8fb8ff', s: 3 });
    }
    p.x = nx; p.y = ny;
    p.invuln = Math.max(p.invuln, 0.5);
    Audio2.blip(900, 0.14, 'sine', 0.05, 0.4);
  } else if (r.active.k === 'nova') {
    for (const e of rm.ents.slice()) if (dist(e.x, e.y, p.x, p.y) < 130) hurtEnemy(e, 26, false, e.x - p.x, e.y - p.y);
    if (rm.boss && dist(rm.boss.x, rm.boss.y, p.x, p.y) < 160) hurtEnemy(rm.boss, 26, false, 0, 0);
    for (const b of rm.eshot.slice()) if (dist(b.x, b.y, p.x, p.y) < 130) { rm.eshot.splice(rm.eshot.indexOf(b), 1); }
    G.fx.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.45, kind: 'boom', s: 130 });
    G.shake = 12;
    Audio2.boom();
  } else if (r.active.k === 'twin') {
    r.active.twin = { x: p.x, y: p.y + 10 };
    r.active.twinT = 12;
    r.active.twinCd = 0;
    Audio2.item();
  } else if (r.active.k === 'slow') {
    r.active.slowT = 6;
    for (const e of rm.ents) e.cd += 0.4;
    toast('仲夏之梦：敌人慢下来了');
    Audio2.blip(420, 0.3, 'sine', 0.04, 0.7);
  }
  r.active.cd = a.cd;
  refreshHud();
}

// ------------------------------------------------------------------ 结束页
function showEnd(win, fresh) {
  const r = G.run;
  const st = G.meta.stats;
  const secs = Math.round((performance.now() - r.startTime) / 1000);
  $('endTitle').textContent = win ? TEXT.winTitle : TEXT.deadTitle;
  $('endSub').textContent = win ? TEXT.winSub : pickOne(DEATHS);
  const got = Object.keys(G.meta.codex).filter((k) => G.meta.codex[k]).length;
  const rows = [
    ['到达', win ? '三层全部打通' : FLOORS[r.floor].n],
    ['击杀', r.kills],
    ['造物', r.items.length + ' 件'],
    ['银芯', r.coins],
    ['分数', r.score],
    ['设定集', got + ' / ' + WORLD.length],
  ];
  $('endStats').innerHTML = rows.map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
  const un = $('endUnlock');
  if (fresh.length) {
    un.innerHTML = '<h4>解锁了新东西</h4>' + fresh.map((f) => `<p>${f.kind} · <b>${f.name}</b></p>`).join('');
    un.classList.add('on');
  } else un.classList.remove('on');
  $('ovEnd').classList.add('on');
}

// ------------------------------------------------------------------ 入口
async function boot() {
  await loadArt();
  G.cols = window.innerWidth / window.innerHeight < 0.95 ? 9 : 15;
  G.rows = G.cols === 9 ? 13 : 9;
  G.W = G.cols * T;
  G.H = G.rows * T;
  // 标题底图：一张全屏 canvas，只在标题/结算时画
  G.bg.cv = $('bgcv');
  if (G.bg.cv) G.bg.ctx = G.bg.cv.getContext('2d');
  Audio2.muted = !!G.meta.muted;
  bindUi();
  fit();
  toTitle();
  const bootEl = document.getElementById('boot');
  if (bootEl) bootEl.remove();
  requestAnimationFrame(loop);
  // 调试钩子：?_test=1 时暴露状态，方便无头浏览器验收
  if (location.search.includes('_test=1')) {
    window.__binding = {
      G, startRun, beginRun, room, ITEMS, FURS, EYES, COSTUMES, TRINKETS, ACTIVES, WORLD, SCENES,
      useActive, nextFloor, goNext, goRoom, takeItem, recalcStats, refreshHud, renderMinimap,
      playScene, advanceStory, endStory, openCodex, renderCodex, unlockCodexByProgress, Audio2,
    };
  }
}

boot();
return {  };
})();

