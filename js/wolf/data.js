// 弥萨格狼人杀：身份牌、难度、名单
//
// 台词全部在 lines.js（62 名唤醒体 × 11 种身份 × 10 种场合），这里只管规则与设定。
//
// 世界观口径（与站内其它子项目一致）：
//   融蚀 / 黑液    —— 被黑潮泡透的东西，渗进人身上就变成「融蚀体」
//   忘却           —— 记忆被抹掉的人；抹干净了，就谁也不是
//   界域           —— 混沌 / 血肉 / 深海 / 超维，唤醒体各归其一
//   提灯 / 银钥    —— 走廊里能照亮的东西、能换命的东西
// 身份牌不是凭空编的规则名词，每张都挂在这些设定上（见 ROLES 的 lore 字段）。

export const ROLES = {
  // ---------------------------------------------------------------- 清醒方
  crew: {
    zh: '清醒者', en: 'Lucid', f: 'crew', short: '没有能力',
    d: '没有特殊能力。你的武器只有一双眼睛、一张嘴，和一票。',
    lore: '在弥萨格，能把昨天完整记住的人本来就不多。你还记得，所以你还算清醒。',
    tag: '我什么都不会。但我记得每个人看我的眼神。',
  },
  watch: {
    zh: '守夜人', en: 'Nightwatch', f: 'crew', short: '每晚守一人', unique: true,
    d: '每晚守住一个人，黑液今晚碰不到他。不能连续两晚守同一个人。',
    lore: '提灯走过一圈，走廊里就没有黑液敢抬头。这是弥萨格的规矩，不是谁定的。',
    tag: '今晚我提着灯走一圈。谁的门我没敲，明早你们就知道了。',
  },
  seer: {
    zh: '灵视者', en: 'Seer', f: 'crew', short: '每晚观测一人', unique: true,
    d: '每晚观测一个人，能看见他体内有没有黑液：得到「融蚀」「干净」，或者一片空白。',
    lore: '超维界域留下的残响。看得见的东西太多，闭上眼睛也关不掉。',
    tag: '我看得见。不是用眼睛看。',
  },
  coroner: {
    zh: '解剖助手', en: 'Coroner', f: 'crew', short: '查验出局者', unique: true,
    d: '每晚查验一具还没定性的尸体，确认他是不是融蚀体。死人不会说谎。',
    lore: '解剖室在地下二层，那里的灯从来没熄过。死人比活人老实。',
    tag: '给我一具尸体，我能告诉你他死前是谁。',
  },
  lamp: {
    zh: '灯守', en: 'Lantern', f: 'crew', short: '一生一次，拉回一人', unique: true,
    d: '一生一次。天亮时把今夜被融蚀的人从黑液里拽回来——但你自己会暴露在灯下。',
    lore: '灯灭了才是真的死了。灯还亮着，就还能把人叫回来。只有一次。',
    tag: '灯还亮着，就能把人叫回来。只有一次。',
  },
  twin: {
    zh: '双子', en: 'Twin', f: 'crew', short: '与另一名双子互认',
    d: '场上一定有两名双子，互认，都是清醒方。少一个，另一个会知道是谁动的手。',
    lore: '同一次觉醒裂开的两半。共用一个记忆，也共用一份疼。',
    tag: '我们是一体的。',
  },
  chain: {
    zh: '链缚者', en: 'Chainbound', f: 'crew', short: '被投出时带走一人', unique: true,
    d: '你腕上还锁着一条链子。当你被投票送出弥萨格时，可以把一个人一起拖出门——夜里被杀则不会触发。',
    lore: '镣铐的另一端从来不是空的。血链·希洛比谁都清楚这一点。',
    tag: '这条链子我早晚会解开——带上一个人一起。',
  },

  // ---------------------------------------------------------------- 融蚀方
  eroded: {
    zh: '融蚀体', en: 'Eroded', f: 'wolf', short: '每晚融蚀一人',
    d: '和同伙一起，每晚融蚀一个人。活着的融蚀体追平其余人时，你们赢。',
    lore: '黑液从指缝里渗出来的时候，很安静。安静到屋里的人还以为自己在做梦。',
    tag: '……（你嘴里有股甜味。）',
  },
  lurker: {
    zh: '潜伏者', en: 'Lurker', f: 'wolf', short: '免死一次',
    d: '融蚀体的一员。第一次被投票出局时不会死，会当场蜕壳——但身份也就此暴露。',
    lore: '你以为那层皮是它穿上去的？那是它剩下的一点东西。',
    tag: '别急着投我。这张脸，你杀不掉。',
  },
  whisper: {
    zh: '低语者', en: 'Whisperer', f: 'wolf', short: '每晚让一人失声', unique: true,
    d: '融蚀体的一员，但不动手杀人。每晚可以让一个人听见黑液的低语：他第二天说不出话，也公布不了任何东西。同一个人只能被低语一次。',
    lore: '它不咬人。它只是在你耳边说话，说到你忘了自己本来要说什么。',
    tag: '你刚才想说什么来着？',
  },

  // ---------------------------------------------------------------- 融蚀方的暗桩
  mole: {
    zh: '共谋者', en: 'Accomplice', f: 'mole', short: '被看成清醒，随融蚀一起赢',
    d: '灵视者看你也像清醒的。你和融蚀体一起赢，而且你知道他们是谁。',
    lore: '有些人的记忆被换过，换得很干净，连他自己都没发现。',
    tag: '我什么都没做。我只是什么都没做而已。',
  },

  // ---------------------------------------------------------------- 第三方
  forgotten: {
    zh: '忘却者', en: 'Forgotten', f: 'third', short: '独自活到最后',
    d: '第三方。不论哪一边赢，只要那一刻你还活着，你就独赢——他们的胜利会被你吞掉。',
    lore: '被所有人忘掉的人，最后会变成忘掉所有人的人。',
    tag: '我不属于任何一边。我只想活到最后。',
  },
};

// 四类阵营账：清醒 / 融蚀 / 暗桩 / 第三方
export const WOLF_SIDE = new Set(['eroded', 'lurker', 'whisper', 'mole']);
// 会动手的只有这两种，胜负「追平」只数它们
export const KILLERS = new Set(['eroded', 'lurker']);
export const POWER_ROLES = new Set(['seer', 'watch', 'coroner', 'lamp']);
// 低语者一生只能说两次：说多了自己的嗓子也会哑，牌桌上更容易被认出来。
// （不限次数时，它能在四天里把灵视、解剖、守夜全按哑，清醒方等于没有能力）
export const WHISPER_MAX = 2;

// ------------------------------------------------------------------ 难度
// ai 里的五个旋钮：
//   wit   推理质量（噪声大小、证据权重、能否识破对跳）
//   lie   融蚀方的撒谎意愿（假跳、假报告、替同伙背书）
//   coord 融蚀方的协同度（合票、互相打掩护）
//   mem   记性（旧证据衰减得多快；低档会「忘了昨天谁说过什么」）
//   heat  主动指认的积极程度（低档更容易划水）
export const DIFFS = [
  {
    k: 'easy', n: '初见', c: 'easy', sub: '九个人，一只融蚀体',
    note: '牌堆干净，没有潜伏者、低语者和共谋者。讨论两轮就投票。AI 记性差、不太会撒谎，灵视者报的查验桌上通常还是信的。',
    players: 9, rounds: 2,
    roles: ['eroded', 'watch', 'seer', 'crew', 'crew', 'crew', 'crew', 'crew', 'crew'],
    ai: { wit: 0.5, lie: 0.1, coord: 0.15, mem: 0.45, heat: 0.4 },
  },
  {
    k: 'normal', n: '夜巡', c: 'normal', sub: '十二个人，三只融蚀体',
    note: '标准局。桌上只有灵视者与解剖助手两张查验牌，三只融蚀体混在九个人里——手里的信息永远不够，得靠谁在替谁说话。融蚀体会假跳灵视者，台上会出现两个灵视者，其中一个在说谎。',
    players: 12, rounds: 2,
    roles: ['eroded', 'eroded', 'eroded', 'seer', 'coroner', 'crew', 'crew', 'crew', 'crew', 'crew', 'crew', 'crew'],
    ai: { wit: 0.62, lie: 0.42, coord: 0.4, mem: 0.66, heat: 0.62 },
  },
  {
    k: 'hard', n: '蜕壳', c: 'hard', sub: '十二个人，四只融蚀体',
    note: '四只融蚀体对八个人——错投一票，第二夜就追上了。混进来一个潜伏者：第一次被投出去不会死，只蜕壳。链缚者也会上场，被投出时能拖一个人一起走。讨论三轮，狼会抱团、会专挑灵视者下手。',
    players: 12, rounds: 3,
    roles: ['eroded', 'eroded', 'eroded', 'lurker', 'watch', 'seer', 'lamp', 'coroner', 'chain', 'crew', 'crew', 'crew'],
    ai: { wit: 0.7, lie: 0.64, coord: 0.62, mem: 0.78, heat: 0.74 },
  },
  {
    k: 'mad', n: '低语', c: 'mad', sub: '十四个人：三个会动手的、一个低语者、一个共谋者',
    note: '低语者不说话，只让灵视者说不出话——查验烂在手里。共谋者被验是清醒的，一张票能白花；忘却者只想活到最后，谁赢它都吞一口。双子互认，但说出来就是两只一起进刀口。讨论两轮。',
    players: 14, rounds: 2,
    roles: ['eroded', 'eroded', 'lurker', 'whisper', 'mole', 'forgotten',
      'watch', 'seer', 'lamp', 'twin', 'twin', 'coroner', 'crew', 'crew'],
    ai: { wit: 0.76, lie: 0.78, coord: 0.78, mem: 0.84, heat: 0.82 },
  },
  {
    k: 'abyss', n: '终夜', c: 'abyss', sub: '十四个人，最脏的一桌',
    note: '三只融蚀体加潜伏者、低语者，一个只想活到最后的忘却者。灯守、链缚者、解剖助手都在，讨论三轮。这一档的 AI 会记着你三天前说过的话，会为了保同伙把票掰开，也会故意报一次假查验，浪费你手上的一次观测。',
    players: 14, rounds: 3,
    roles: ['eroded', 'eroded', 'eroded', 'lurker', 'whisper', 'forgotten',
      'watch', 'seer', 'lamp', 'chain', 'coroner', 'crew', 'crew', 'crew'],
    ai: { wit: 0.84, lie: 0.86, coord: 0.88, mem: 0.92, heat: 0.88 },
  },
];

// ------------------------------------------------------------------ 唤醒体
// av   = 头像编号（assets/avatars/a-<av>.webp，构建时内联进 js/wolf/art.js）
// tone = 语气原型（台词缺项时的兜底，见 lines.js 的 TONES）
// realm= 界域：混沌 / 血肉 / 深海 / 超维。同界域的人会互相多一点信任（界域共鸣）
// cls  = 战斗定位：伤害型更爱先开火、防御型更爱替人挡、辅助型更爱观望试探
export const CHARS = [
  { av: '15601', zh: '24', en: 'Mason', tone: 'meek', realm: '混沌', cls: '伤害型', call: '守密人', hint: '分裂患者' },
  { av: '15600', zh: '阿格里帕', en: 'Agrippa', tone: 'lord', realm: '血肉', cls: '防御型', call: '守密人', hint: '迷宫 · 角斗' },
  { av: '15591', zh: '艾继丝', en: 'Aigis', tone: 'cold', realm: '血肉', cls: '辅助型', call: '守密人', hint: '石之眼' },
  { av: '15588', zh: '艾尔瓦', en: 'Alva', tone: 'cold', realm: '混沌', cls: '防御型', call: '后辈', hint: '正义 · 纪律' },
  { av: '15573', zh: '奥瑞塔', en: 'Aurita', tone: 'child', realm: '深海', cls: '伤害型', call: '大朋友', hint: '海月水母' },
  { av: '15594', zh: '凯刻斯', en: 'Caecus', tone: 'cold', realm: '深海', cls: '防御型', call: '守密人', hint: '深潜者' },
  { av: '15572', zh: '卡茜亚', en: 'Casiah', tone: 'jest', realm: '超维', cls: '辅助型', call: '观众', hint: '魔术 · 异次元' },
  { av: '77923', zh: '卡斯托尔', en: 'Castor', tone: 'cold', realm: '超维', cls: '防御型', call: '守密人', hint: '圣子' },
  { av: '15566', zh: '希莱斯特', en: 'Celeste', tone: 'meek', realm: '深海', cls: '辅助型', call: '守密人', hint: '不死鸟 · 守梦' },
  { av: '77925', zh: '克莱门汀', en: 'Clementine', tone: 'cold', realm: '超维', cls: '辅助型', call: '守密人', hint: '心理医生' },
  { av: '77922', zh: '克珀珊特', en: 'Corposant', tone: 'cold', realm: '深海', cls: '防御型', call: '守密人', hint: '领航 · 秩序' },
  { av: '15590', zh: '达芙黛尔', en: 'Daffodil', tone: 'jest', realm: '超维', cls: '伤害型', call: '客人', hint: '交易 · 头颅' },
  { av: '15570', zh: '朵尔', en: 'Doll', tone: 'gear', realm: '混沌', cls: '辅助型', call: '守密人', hint: '缸中之脑' },
  { av: '95786', zh: '杜勒赛因', en: 'Doresain', tone: 'dark', realm: '血肉', cls: '伤害型', call: '守密人', hint: '食尸鬼之王' },
  { av: '15603', zh: '艾瑞卡', en: 'Erica', tone: 'gear', realm: '超维', cls: '防御型', call: '守密人', hint: '自动人偶' },
  { av: '15577', zh: '菲茵特', en: 'Faint', tone: 'meek', realm: '血肉', cls: '防御型', call: '守密人', hint: '星之芽' },
  { av: '15575', zh: '法洛思', en: 'Faros', tone: 'cold', realm: '深海', cls: '辅助型', call: '守密人', hint: '灯塔' },
  { av: '15602', zh: '熔毁·朵尔', en: 'Doll: Inferno', tone: 'dark', realm: '混沌', cls: '辅助型', call: '守密人', hint: '腐坏之脑' },
  { av: '15567', zh: '血链·希洛', en: 'Helot: Catena', tone: 'dark', realm: '血肉', cls: '伤害型', call: '守密人', hint: '镣铐 · 复仇' },
  { av: '15568', zh: '环行·拉蒙娜', en: 'Ramona: Timeworn', tone: 'meek', realm: '混沌', cls: '辅助型', call: '守密人', hint: '知者 · 记忆' },
  { av: '15564', zh: '戈利亚', en: 'Goliath', tone: 'lord', realm: '深海', cls: '伤害型', call: '守密人', hint: '鲨鱼 · 力量' },
  { av: '54117', zh: '哈姆林', en: 'Hameln', tone: 'art', realm: '混沌', cls: '辅助型', call: '守密人', hint: '吹笛人' },
  { av: '15587', zh: '希洛', en: 'Helot', tone: 'cold', realm: '血肉', cls: '伤害型', call: '守密人', hint: '破链者' },
  { av: '15583', zh: '奥尔拉', en: 'Horla', tone: 'art', realm: '超维', cls: '辅助型', call: '您', hint: '诗人 · 虚无' },
  { av: '15593', zh: '詹金', en: 'Jenkin', tone: 'child', realm: '超维', cls: '伤害型', call: '你', hint: '老鼠 · 提灯' },
  { av: '15571', zh: '珈伦', en: 'Karen', tone: 'child', realm: '混沌', cls: '辅助型', call: '主人', hint: '女仆 · 故事' },
  { av: '77913', zh: '凯蒂古拉', en: 'Kathigu-Ra', tone: 'warm', realm: '混沌', cls: '伤害型', call: '小家伙', hint: '火焰 · 家人' },
  { av: '15597', zh: '雷娅', en: 'Leigh', tone: 'dark', realm: '血肉', cls: '辅助型', call: '您', hint: '渴血' },
  { av: '15581', zh: '莉莉', en: 'Lily', tone: 'gear', realm: '混沌', cls: '防御型', call: '主人', hint: '人偶 · 命令' },
  { av: '15562', zh: '莉兹', en: 'Liz', tone: 'art', realm: '超维', cls: '伤害型', call: '您', hint: '绿炎 · 舞者' },
  { av: '15569', zh: '萝坦', en: 'Lotan', tone: 'lord', realm: '混沌', cls: '伤害型', call: '守密人', hint: '信念 · 对手' },
  { av: '15582', zh: '弥利亚姆', en: 'Miryam', tone: 'warm', realm: '深海', cls: '辅助型', call: '孩子', hint: '海之使徒' },
  { av: '94450', zh: '茉夏', en: 'Mouchette', tone: 'dark', realm: '混沌', cls: '伤害型', call: '守密人', hint: '雾境' },
  { av: '15576', zh: '墨菲', en: 'Murphy', tone: 'lord', realm: '深海', cls: '防御型', call: '守密人', hint: '深海淑女' },
  { av: '15589', zh: '诞妄·墨菲', en: 'Murphy: Fauxborn', tone: 'dark', realm: '深海', cls: '辅助型', call: '守密人', hint: '海嗣神母' },
  { av: '15565', zh: '诺缔拉', en: 'Nautila', tone: 'jest', realm: '混沌', cls: '防御型', call: '守密人', hint: '扳手 · 失忆' },
  { av: '15580', zh: '宁菲亚', en: 'Nymphaea', tone: 'meek', realm: '混沌', cls: '伤害型', call: '您', hint: '海 · 悲剧' },
  { av: '15585', zh: '奥吉尔', en: 'Ogier', tone: 'warm', realm: '混沌', cls: '防御型', call: '守密人', hint: '美德骑士' },
  { av: '15560', zh: '潘狄娅', en: 'Pandia', tone: 'jest', realm: '混沌', cls: '伤害型', call: '守密人', hint: '蜡烛 · 恶鬼' },
  { av: '77926', zh: '皮克曼', en: 'Pickman', tone: 'art', realm: '血肉', cls: '辅助型', call: '守密人', hint: '画家 · 尸骸' },
  { av: '77917', zh: '波吕克斯', en: 'Pollux', tone: 'child', realm: '超维', cls: '伤害型', call: '守密人', hint: '鸟弟' },
  { av: '15595', zh: '拉蒙娜', en: 'Ramona', tone: 'meek', realm: '混沌', cls: '辅助型', call: '守密人', hint: '知者 · 搭档' },
  { av: '15604', zh: '莱克', en: 'Ryker', tone: 'jest', realm: '混沌', cls: '辅助型', call: '守密人', hint: '赌徒 · 侦探' },
  { av: '15599', zh: '萨尔瓦多', en: 'Salvador', tone: 'cold', realm: '血肉', cls: '防御型', call: '守密人', hint: '神父' },
  { av: '15592', zh: '珊', en: 'Sanga', tone: 'cold', realm: '深海', cls: '防御型', call: '守密人', hint: '雕砌者' },
  { av: '15584', zh: '索蕾尔', en: 'Sorel', tone: 'lord', realm: '血肉', cls: '伤害型', call: '客人', hint: '沙龙 · 红女王' },
  { av: '54116', zh: '塔薇', en: 'Tawil', tone: 'cold', realm: '混沌', cls: '辅助型', call: '守密人', hint: '门之钥' },
  { av: '15596', zh: '泰旖丝', en: 'Thais', tone: 'dark', realm: '血肉', cls: '辅助型', call: '守密人', hint: '黑山羊' },
  { av: '15574', zh: '汀克特', en: 'Tinct', tone: 'meek', realm: '超维', cls: '辅助型', call: '您', hint: '歌者' },
  { av: '15563', zh: '图鲁', en: 'Tulu', tone: 'lord', realm: '深海', cls: '伤害型', call: '臣子', hint: '沉睡之主' },
  { av: '15598', zh: '尤乌哈希', en: 'Uvhash', tone: 'dark', realm: '血肉', cls: '伤害型', call: '守密人', hint: '猩红心脏' },
  { av: '15586', zh: '旺达', en: 'Wanda', tone: 'lord', realm: '超维', cls: '防御型', call: '凡人', hint: '荆棘女王' },
  { av: '15579', zh: '温柯尔', en: 'Winkle', tone: 'meek', realm: '超维', cls: '防御型', call: '守密人', hint: '迁移者' },
  { av: '125346', zh: '徐', en: 'Xu', tone: 'lord', realm: '血肉', cls: '辅助型', call: '守密人', hint: '千扇' },
  { av: '130901', zh: '莫丝', en: 'Vortice', tone: 'dark', realm: '深海', cls: '伤害型', call: '守密人', hint: '漩涡' },
  { av: '77918', zh: '阿拉克涅', en: 'Arachne', tone: 'art', realm: '超维', cls: '辅助型', call: '您', hint: '命运织者' },
  { av: '130226', zh: '沙耶', en: 'Saya', tone: 'child', realm: '血肉', cls: '辅助型', call: '守密人', hint: '肉块少女' },
  { av: '141302', zh: '庞托斯', en: 'Pontos', tone: 'cold', realm: '深海', cls: '防御型', call: '守密人', hint: '古旧渊影' },
  { av: '145363', zh: '蚀灭·萝坦', en: 'Lotan: Cetarchon', tone: 'lord', realm: '混沌', cls: '伤害型', call: '对手', hint: '鲸落' },
  { av: '77921', zh: '卡拉布', en: 'Caraboo', tone: 'meek', realm: '血肉', cls: '防御型', call: '守密人', hint: '白色蠕虫' },
  { av: '148578', zh: '负誓·奥吉尔', en: 'Ogier: Oathbound', tone: 'warm', realm: '混沌', cls: '防御型', call: '您', hint: '负誓骑士' },
  { av: '151844', zh: '薇薇安', en: 'Vivian', tone: 'jest', realm: '混沌', cls: '辅助型', call: '守密人', hint: '魔女' },
];

export const CHAR_BY_NAME = Object.fromEntries(CHARS.map((c) => [c.zh, c]));

// 界域：同界域之间有一层说不清的亲近感，AI 会因此少疑一点（分量很小，只是味道）
export const REALMS = ['混沌', '血肉', '深海', '超维'];

// ------------------------------------------------------------------ 守密人（玩家）
export const KEEPER = {
  name: '守密人',
  say: {
    claim: ['我是{role}。', '我说了，我是{role}。信不信随你们。', '{role}。别的不多说。', '我摊牌：{role}。'],
    accuse: ['我觉得{who}不对劲。', '我听着{who}的话，总觉得哪里不对。', '{who}，你能解释一下刚才那句吗。', '我提一个名字：{who}。'],
    defend: ['我认为{who}不是。', '先别急着投{who}。', '{who}的话还没说完。', '我替{who}说一句。'],
    idle: ['……我先听着。', '再等等。今晚的答案会自己浮上来。', '（你把每个人的表情记在心里）', '我先不表态。'],
    vote: ['{who}。', '我投{who}。', '就{who}吧。', '票给{who}。'],
    // 号召：让有身份的人自己报出来。说得越硬，越有人应，也越有人记恨。
    call: [
      '有身份的，现在站出来。藏着对谁都没好处——今晚死的就是藏着的人。',
      '我把话说白：手里有牌的，报出来。我担保今天不投报牌的人。',
      '别等了。守夜人、灵视者、解剖的——站出来。剩下的人自己掂量该信谁。',
      '我给大家一个机会，也说一次威胁：有身份的现在说，被我一个一个问出来，就没这待遇了。',
      '我不喜欢逼人。但今天必须有人在明处。有身份的，站出来。',
    ],
    callEnd: ['……记下了。', '好。现在我知道该看谁了。', '记着你们今天说的话。', '说出来的话，我一句都没忘。'],
    callNone: ['……一个人都没站出来。行，这份沉默我记着。', '没人说。那今晚谁死了，别怪我把账算在没说话的人头上。'],
    death: ['……剩下的交给你们了。'],
  },
};

// ------------------------------------------------------------------ 系统文案
export const SYS = {
  intro: [
    '闭馆广播响过第三遍，主教学楼四层的灯一齐灭了。',
    '门是从外面锁上的。窗外的弥萨格在下雨，雨里混着别的东西。',
    '广播里有个人在说话，声音像是从很远的水底浮上来——',
    '「有融蚀体混在你们中间。天亮之前，把它们找出来。」',
  ],
  dawnNone: '天亮了。走廊里的水渍是干净的，没有黑液。一夜无事。',
  dawnNoneProtected: '天亮了。有人在你门口停了一整夜，最后什么也没做。',
  dawnDead: '{who}没有回来。房间里只剩下被褥上的一圈黑渍。',
  voteOut: '{who}被送出了门。门在身后关上的声音很轻。',
  voteNone: '票数平了。没有人被送出去。走廊里安静得能听见呼吸。',
  nightFall: '熄灯。走廊里只剩下脚步声。',
  lampSave: '灯亮了。黑液从{who}的七窍里退回去，像被谁按下了暂停。',
  lurkerMolt: '{who}没有死。他的皮从后背裂开，露出一层不属于人的黑。',
  chainPull: '{who}被送出门的时候，链子的另一端还系着{to}。两个人一起消失在走廊尽头。',
  lastWords: '——遗言。',
  winCrew: '天亮的时候，走廊里的黑液已经干了。剩下的人还站着。',
  winWolf: '剩下的人互相看着，谁也没有说话。黑液从地板缝里漫上来，很安静。',
  winForgotten: '最后一个人站在门口。他既不属于这边，也不属于那边。谁也没有记住他的名字。',
  silenceOn: '{who}张了张嘴，没发出声音。喉咙里全是黑液的味道。',
  silenceSelf: '你想说话。喉咙里只有一股铁锈味——有人在夜里对你说过话。',
};

// 每天开场的一句氛围（按日数轮换）
export const DAY_LEAD = [
  '第一夜过去了。没人敢先开口。',
  '第二天的空气里有股铁锈味。',
  '又过了一夜。有人开始不敢看别人的眼睛。',
  '走廊尽头的灯开始闪。今天必须有个结果。',
  '剩下的人不多了。每个人的呼吸都很响。',
  '最后一次点名。',
];
