// 弥萨格王权：角色表、卡池、结局
//
// 玩法是「王权（Reigns）」那一套：一个人上来提要求，你只能准或不准，
// 两条路都动四项资源，任一资源见底或满溢，你的任期就结束了。
//
// 世界观口径（与站内其它子项目一致）：
//   弥萨格大学 —— 洪积 90 年由华德·菲利普斯、刻拉尔克什、塔薇创立，建在黑池之上
//   守密人    —— 你。管校务、管预算、管这群不太能算「人」的学生
//   唤醒体    —— 62 名，分属混沌 / 血肉 / 深海 / 超维四界域
//   主播       —— 9 位 B 站《忘却前夜》内容创作者，当作「从别处来的唤醒体」写在卡池里
//   性别       —— 一律照站内 data/dictionary.json 的 sex 字段（阿格里帕、血链·希洛、
//                 詹金都是女性，别照译名猜；十位主播与魔龙_D 一样是男的）
//   银芯      —— 唤醒体的力量与链接媒介；学校的水电、工资、屏障都烧它
//   融蚀/黑潮 —— 被黑潮泡透的东西；黑潮推进到顶，学校就没了
//   记忆      —— 世界靠「被记得」立住。没人记得的东西，会自己走掉
//
// 四项资源（0~100，触到任一端即结局）：
//   mem 记忆 / san 理智 / core 银芯 / bond 羁绊
// 隐藏资源：tide 黑潮（越高压得越狠，满 100 直接终局）
//
// 卡字段：
//   id  唯一；who 说话人（CHARS 或 SYS 的键）；act 可用阶段（1 前段 / 2 中段 / 3 后段 / 0 全程）
//   say 台词；yes / no 两个选项 { l 按钮文字, fx 数值增减, re 反应台词, set 立 flag, then 排后续卡 }
//   chain 只由 then 调度，不进随机池；w 权重（默认 1）

export const REALMS = {
  chaos: { n: '混沌', c: '#a67cff', d: '梦、狂气、与不肯醒来的东西' },
  flesh: { n: '血肉', c: '#e0575f', d: '会痛、会饿、会记住疼的身体' },
  deep: { n: '深海', c: '#46b6c8', d: '水面以下，声音传得很远' },
  ultra: { n: '超维', c: '#e3b341', d: '看得见另一层的人，和他们的代价' },
  none: { n: '无', c: '#8a93a8', d: '' },
};

export const CHARS = {
  '24': { n: '24', en: '24', realm: 'chaos', sex: 'f', tag: '分裂患者', call: '守密人' },
  catigula: { n: '凯蒂古拉', en: 'Kathigu-Ra', realm: 'chaos', sex: 'f', tag: '炽热的大姐' },
  lotan: { n: '萝坦', en: 'Lotan', realm: 'chaos', sex: 'f', tag: '好战的对手' },
  pandia: { n: '潘狄娅', en: 'Pandia', realm: 'chaos', sex: 'f', tag: '夜里的那个' },
  karen: { n: '珈伦', en: 'Karen', realm: 'chaos', sex: 'f', tag: '食堂主厨' },
  tawil: { n: '塔薇', en: 'Tawil', realm: 'chaos', sex: 'f', tag: '校务·创校者' },
  alva: { n: '艾尔瓦', en: 'Alva', realm: 'chaos', sex: 'f', tag: '巡夜' },
  agrippa: { n: '阿格里帕', en: 'Agrippa', realm: 'flesh', sex: 'f', tag: '角斗士' },
  doresain: { n: '杜勒赛因', en: 'Doresain', realm: 'flesh', sex: 'm', tag: '血肉圣殿' },
  catena: { n: '血链·希洛', en: 'Helot: Catena', realm: 'flesh', sex: 'f', tag: '杀戮的血链' },
  pickman: { n: '皮克曼', en: 'Pickman', realm: 'flesh', sex: 'm', tag: '画家' },
  leigh: { n: '雷娅', en: 'Leigh', realm: 'flesh', sex: 'f', tag: '饥渴' },
  helot: { n: '希洛', en: 'Helot', realm: 'flesh', sex: 'f', tag: '锋刃' },
  sorel: { n: '索蕾尔', en: 'Sorel', realm: 'flesh', sex: 'f', tag: '灼热' },
  xu: { n: '徐', en: 'Xu', realm: 'flesh', sex: 'f', tag: '医者' },
  aurita: { n: '奥瑞塔', en: 'Aurita', realm: 'deep', sex: 'f', tag: '海月水母' },
  murphy: { n: '诞妄·墨菲', en: 'Murphy: Fauxborn', realm: 'deep', sex: 'f', tag: '祂' },
  corposant: { n: '克珀珊特', en: 'Corposant', realm: 'deep', sex: 'f', tag: '领航员' },
  miryam: { n: '弥利亚姆', en: 'Miryam', realm: 'deep', sex: 'f', tag: '医疗翼' },
  erica: { n: '艾瑞卡', en: 'Erica', realm: 'ultra', sex: 'f', tag: '自动人偶' },
  castor: { n: '卡斯托尔', en: 'Castor', realm: 'ultra', sex: 'm', tag: '双子·兄' },
  pollux: { n: '波吕克斯', en: 'Pollux', realm: 'ultra', sex: 'm', tag: '双子·弟' },
  daffodil: { n: '达芙黛尔', en: 'Daffodil', realm: 'ultra', sex: 'f', tag: '交易' },
  jenkin: { n: '詹金', en: 'Jenkin', realm: 'ultra', sex: 'f', tag: '提灯' },
  horla: { n: '奥尔拉', en: 'Horla', realm: 'ultra', sex: 'f', tag: '看不见的作家' },
  nautila: { n: '诺缔拉', en: 'Nautila', realm: 'chaos', sex: 'f', tag: '想不起名字' },
  lily: { n: '莉莉', en: 'Lily', realm: 'chaos', sex: 'f', tag: '要一个命令' },
  ryker: { n: '莱克', en: 'Ryker', realm: 'chaos', sex: 'm', tag: '族群' },
  aigis: { n: '艾继丝', en: 'Aigis', realm: 'flesh', sex: 'f', tag: '石之眼' },
  caecus: { n: '凯刻斯', en: 'Caecus', realm: 'deep', sex: 'm', tag: '没能蜕变的鳃' },
  casiah: { n: '卡茜亚', en: 'Casiah', realm: 'ultra', sex: 'f', tag: '魔术师' },
  celeste: { n: '希莱斯特', en: 'Celeste', realm: 'deep', sex: 'f', tag: '守梦人' },
  clementine: { n: '克莱门汀', en: 'Clementine', realm: 'ultra', sex: 'f', tag: '心理医生' },
  doll: { n: '朵尔', en: 'Doll', realm: 'chaos', sex: 'f', tag: '缸中之脑' },
  'doll-inferno': { n: '熔毁·朵尔', en: 'Doll: Inferno', realm: 'chaos', sex: 'f', tag: '腐坏之脑' },
  faint: { n: '菲茵特', en: 'Faint', realm: 'flesh', sex: 'f', tag: '星之芽（别靠近）' },
  faros: { n: '法洛思', en: 'Faros', realm: 'deep', sex: 'f', tag: '灯塔' },
  goliath: { n: '戈利亚', en: 'Goliath', realm: 'deep', sex: 'm', tag: '巨人' },
  hameln: { n: '哈姆林', en: 'Hameln', realm: 'chaos', sex: 'm', tag: '吹笛人' },
  liz: { n: '莉兹', en: 'Liz', realm: 'ultra', sex: 'f', tag: '青炎舞者' },
  mouchette: { n: '茉夏', en: 'Mouchette', realm: 'chaos', sex: 'f', tag: '雾境看板娘' },
  'murphy-plain': { n: '墨菲', en: 'Murphy', realm: 'deep', sex: 'f', tag: '深海大小姐' },
  nymphaea: { n: '宁菲亚', en: 'Nymphaea', realm: 'chaos', sex: 'f', tag: '文学少女' },
  ogier: { n: '奥吉尔', en: 'Ogier', realm: 'chaos', sex: 'm', tag: '美德骑士' },
  ramona: { n: '拉蒙娜', en: 'Ramona', realm: 'chaos', sex: 'f', tag: '知者' },
  'ramona-ring': { n: '环行·拉蒙娜', en: 'Ramona: Timeworn', realm: 'chaos', sex: 'f', tag: '环行的知者' },
  salvador: { n: '萨尔瓦多', en: 'Salvador', realm: 'flesh', sex: 'm', tag: '神父' },
  sanga: { n: '珊', en: 'Sanga', realm: 'deep', sex: 'f', tag: '雕砌者' },
  thais: { n: '泰旖丝', en: 'Thais', realm: 'flesh', sex: 'f', tag: '丰穰之息' },
  tinct: { n: '汀克特', en: 'Tinct', realm: 'ultra', sex: 'f', tag: '歌者' },
  tulu: { n: '图鲁', en: 'Tulu', realm: 'deep', sex: 'm', tag: '沉睡之主' },
  uvhash: { n: '尤乌哈希', en: 'Uvhash', realm: 'flesh', sex: 'm', tag: '最后的罗马战士' },
  wanda: { n: '旺达', en: 'Wanda', realm: 'ultra', sex: 'f', tag: '荆棘女王' },
  winkle: { n: '温柯尔', en: 'Winkle', realm: 'ultra', sex: 'f', tag: '迁移者' },
  vortice: { n: '莫丝', en: 'Vortice', realm: 'deep', sex: 'f', tag: '鲨鱼（三岁）' },
  arachne: { n: '阿拉克涅', en: 'Arachne', realm: 'ultra', sex: 'f', tag: '织命者' },
  saya: { n: '沙耶', en: 'Saya', realm: 'flesh', sex: 'f', tag: '新生的那个' },
  pontos: { n: '庞托斯', en: 'Pontos', realm: 'deep', sex: 'm', tag: '深渊之主' },
  'lotan-etched': { n: '蚀灭·萝坦', en: 'Lotan: Cetarchon', realm: 'chaos', sex: 'f', tag: '蚀灭的先兆' },
  caraboo: { n: '卡拉布', en: 'Caraboo', realm: 'flesh', sex: 'f', tag: '苍白仙女' },
  'ogier-oath': { n: '负誓·奥吉尔', en: 'Ogier: Oathbound', realm: 'chaos', sex: 'm', tag: '罪人骑士' },
  vivian: { n: '薇薇安', en: 'Vivian', realm: 'chaos', sex: 'f', tag: '睡不醒的公主' },
  'up-samo': { n: '萨摩不耶', en: 'Samo', realm: 'chaos', sex: 'm', tag: '节拍器', call: '同学' },
  'up-myls': { n: '梦依流苏', en: 'Sue', realm: 'deep', sex: 'm', tag: '不做梦的人', call: '同学' },
  'up-alice': { n: '爱丽丝', en: 'Alice', realm: 'ultra', sex: 'm', tag: '洞口的兔子', call: '同学' },
  'up-ratking': { n: '鼠王', en: 'Rat King', realm: 'flesh', sex: 'm', tag: '数不清', call: '同学' },
  'up-dragond': { n: '魔龙_D', en: 'Dragon D', realm: 'flesh', sex: 'm', tag: '逆鳞', call: '同学' },
  'up-zerok': { n: '立誓0氪', en: 'Zero KR', realm: 'chaos', sex: 'm', tag: '一分不花', call: '同学' },
  'up-moreen': { n: '夏茉琳', en: 'Moreen', realm: 'deep', sex: 'm', tag: '花间行走', call: '同学' },
  'up-chaoxing': { n: '朝星', en: 'Chaoxing', realm: 'ultra', sex: 'm', tag: '破晓', call: '同学' },
  'up-maodie': { n: '路过的耄耋', en: 'Passing Maodie', realm: 'flesh', sex: 'm', tag: '我什么都没看见', call: '小同志' },
  'up-baiyun': { n: '白云出岫', en: 'Baiyun', realm: 'ultra', sex: 'm', tag: '1t 速杀', call: '同学' },
  cat: { n: '弥萨格校猫', en: 'Wright', realm: 'none', sex: 'n', tag: '它不是学生' },
};

// 公共事件：没有具体说话人，卡片显示成「校务 / 报告 / 走廊」
export const SYS = {
  budget: { n: '审查会', tag: '一封信' },
  barrier: { n: '屏障', tag: '维护报告' },
  dorm: { n: '宿舍区', tag: '值班记录' },
  bell: { n: '钟楼', tag: '凌晨' },
  funeral: { n: '礼堂', tag: '一场葬礼' },
  blackout: { n: '配电室', tag: '第三次跳闸' },
  infirmary: { n: '医务室', tag: '诺斯指数' },
  snow: { n: '操场', tag: '今年第一场雪' },
  audit: { n: '审查会', tag: '突击检查' },
  rumor: { n: '走廊', tag: '没有源头的传闻' },
  library: { n: '图书室', tag: '逾期未还' },
  gate: { n: '校门', tag: '访客登记' },
  radio: { n: '广播室', tag: '午间' },
  boiler: { n: '锅炉房', tag: '压力表' },
  laundry: { n: '洗衣房', tag: '认领处' },
  registry: { n: '户籍室', tag: '增减' },
  choir: { n: '唱诗班', tag: '排练' },
  roof: { n: '天台', tag: '围栏' },
  postbox: { n: '信箱', tag: '无名信件' },
  exam: { n: '考卷', tag: '补考' },
};

// ---------------------------------------------------------------- 卡池
export const CARDS = [
  // ============================================================ 24
  {
    id: '24-leave', who: '24', act: 1,
    say: '守密人……我想请三天假。「她们」这两天很吵，我怕上着上着课就叫出来了。',
    yes: { l: '准她休假', fx: { bond: 7, mem: -2, core: -2 }, re: '谢谢。我不会走远的，只走到能听见你声音的地方。' },
    no: { l: '让她撑住', fx: { bond: -6, san: 3 }, re: '……好。我压着。（她的手指一直在抖。）' },
  },
  {
    id: '24-pill', who: '24', act: 2,
    say: '这个能让人安静。可是安静之后……我可能就不记得你了。要吃吗？',
    yes: { l: '让她吃', fx: { mem: -6, san: 6, bond: -2 }, re: '那我先把你的名字写在手心里。写大一点。' },
    no: { l: '把药收走', fx: { bond: 5, san: -4 }, re: '不吃了。吵就吵吧——至少我还认得你。' },
  },
  {
    id: '24-them', who: '24', act: 2,
    say: '（她的声音变了。）……让我出来。三分钟，我只要三分钟。',
    yes: { l: '让「她」出来', fx: { san: -8, mem: 4, tide: 5 }, then: { d: 2, id: '24-after' }, re: '（她笑了。那不是她的笑。）三分钟到了，守密人。' },
    no: { l: '把门关上', fx: { bond: -5, san: 4 }, re: '……你选了胆小的那个。今天记下来了。' },
  },
  {
    id: '24-dorm', who: '24', act: 1,
    say: '室友说我说梦话，说的不是人话。……能给我一间单人房吗？',
    yes: { l: '批单人间', fx: { core: -6, bond: 5 }, re: '一个人住的话，吵到的就只有墙了。' },
    no: { l: '宿舍满了', fx: { bond: -6, core: 3 }, re: '嗯。那我以后咬着被子睡。' },
  },
  {
    id: '24-mirror', who: '24', act: 3,
    say: '镜子里的我，今天没跟着我动。……要把它搬走吗？还是再等等？',
    yes: { l: '把镜子搬走', fx: { mem: 3, san: -3, core: -2 }, re: '搬走了。可走廊上还有九面。' },
    no: { l: '让她自己看', fx: { tide: 4, san: 2, mem: -2 }, re: '……她在里面朝我招手。我假装没看见。' },
  },
  {
    id: '24-after', who: '24', act: 0, chain: 1,
    say: '（第二天夜里，她站在你门口，身上有铁锈味。）……我记不清昨晚了。是我做的吗？',
    yes: { l: '告诉她实话', fx: { mem: 4, san: -5, bond: 4 }, re: '……谢谢你没有骗我。我会自己赔的。' },
    no: { l: '说不是她', fx: { mem: -5, san: 3, bond: 3 }, re: '哦。那就好。（她笑得很轻。）' },
  },

  // ============================================================ 凯蒂古拉
  {
    id: 'cat-party', who: 'catigula', act: 1,
    say: '小家伙，让我在食堂办场晚会吧。我保证不烧掉超过一半。',
    yes: { l: '准了', fx: { bond: 8, core: -6, mem: 2 }, re: '哈哈哈！这才像话！今晚谁都别想早睡！' },
    no: { l: '不准', fx: { bond: -5, core: 2, mem: 2 }, re: '扫兴。行吧，我自己在房间里烧。' },
  },
  {
    id: 'cat-hug', who: 'catigula', act: 0,
    say: '来，抱一个。你脸色比融蚀还灰，我看着都替你难受。',
    yes: { l: '让她抱', fx: { san: 7, bond: 4, mem: -2 }, re: '对嘛。热一点的人比较不容易被忘掉。' },
    no: { l: '还有公文', fx: { san: -3, mem: 3, core: 1 }, re: '公文又不会替你哭。' },
  },
  {
    id: 'cat-fight', who: 'catigula', act: 2,
    say: '我带三个新人去黑潮边上练练手，保证一个不少地拎回来。',
    yes: { l: '让她带', fx: { bond: 5, tide: 6, san: -2 }, re: '放心！大姐什么时候骗过你？' },
    no: { l: '太危险', fx: { bond: -5, mem: 3 }, re: '那就让他们在操场上练，练到能自己走进去为止。' },
  },
  {
    id: 'cat-burn', who: 'catigula', act: 2,
    say: '旧校舍有间教室，门牌是空的。里面没人在上课，可每天都有读书声。烧了吧？',
    yes: { l: '烧掉', fx: { mem: -9, tide: -5, core: 3 }, re: '（火起来的时候，读书声停了半秒，然后继续。）……它没在怕。' },
    no: { l: '留着', fx: { mem: 5, tide: 4, san: -2 }, re: '留着？行。反正我晚上不去那一层。' },
  },
  {
    id: 'cat-name', who: 'catigula', act: 3,
    say: '喂，小家伙。你记得我全名吗？还是只记得「大姐」两个字？',
    yes: { l: '念出全名', fx: { bond: 8, mem: -3 }, re: '……啧。你还真记得。别让第三个听见啊。' },
    no: { l: '含糊过去', fx: { bond: -7, mem: 2 }, re: '知道了。名字这种东西，本来也没几个人要。' },
  },

  // ============================================================ 萝坦
  {
    id: 'lot-duel', who: 'lotan', act: 1,
    say: '新任守密人，让我看看你有没有资格坐在那张桌子后面。今天，现在。',
    yes: { l: '接下这一场', fx: { san: -6, bond: 7, mem: 2 }, re: '不错！你比上一任耐打。' },
    no: { l: '我不打', fx: { bond: -5, san: 4, core: 2 }, re: '……失望。桌子里的人总是这样。' },
  },
  {
    id: 'lot-arena', who: 'lotan', act: 2,
    say: '把地下竞技场重开。收门票，让学生看什么叫真正的打。',
    yes: { l: '重开', fx: { core: 9, bond: -3, tide: 3 }, re: '票钱我七你三。别还价。' },
    no: { l: '封着', fx: { core: -2, bond: 4, mem: 2 }, re: '封着的东西会自己长出来。你等着。' },
  },
  {
    id: 'lot-scout', who: 'lotan', act: 2,
    say: '我一个人去黑潮带转一圈。三天。要是我没回来，别派人找我。',
    yes: { l: '让她去', fx: { mem: 3, tide: -6, bond: -5, san: -2 }, re: '（第三天黄昏，她回来了，肩上拖着一样东西。）' },
    no: { l: '不许单独行动', fx: { bond: 4, tide: 3, core: -2 }, re: '规矩。好，那带两个人，够不够合你的规矩？' },
  },
  {
    id: 'lot-scar', who: 'lotan', act: 2,
    say: '（她半边身子都在渗血。）不用治。伤疤是勋章，别把它缝起来。',
    yes: { l: '强行治疗', fx: { core: -6, bond: -5, san: 3 }, re: '……你剥夺了我一枚勋章。记着。' },
    no: { l: '由她', fx: { bond: 5, san: -3 }, re: '痛快。明天照样能打。' },
  },
  {
    id: 'lot-other', who: 'lotan', act: 3,
    say: '镜廊里站着另一个我。她说她更配得上这张脸。要不要换？',
    yes: { l: '让「她」留下', fx: { tide: 6, bond: -6, mem: -3 }, re: '（镜廊里只剩一个人。你不知道那是谁。）' },
    no: { l: '留下原来那个', fx: { mem: 4, bond: 4, san: -3 }, re: '选得好。虽然她比我强。' },
  },

  // ============================================================ 潘狄娅
  {
    id: 'pan-moon', who: 'pandia', act: 1,
    say: '今晚的月亮是假的。你抬头看，它在跟着你转。',
    yes: { l: '抬头看', fx: { san: -5, mem: 6 }, re: '看到了吧。它一直在等你抬头。' },
    no: { l: '低头做事', fx: { san: 3, tide: 2, mem: -2 }, re: '不看也好。看了就忘不掉了。' },
  },
  {
    id: 'pan-window', who: 'pandia', act: 2,
    say: '把东侧宿舍的窗封了吧。有东西每天晚上贴着玻璃看里面。',
    yes: { l: '封窗', fx: { core: -5, san: 4, mem: -2 }, re: '封好了。它现在改敲墙了。' },
    no: { l: '窗户要通风', fx: { bond: -5, tide: 4, core: 2 }, re: '通风。好。那我把窗帘拉上。' },
  },
  {
    id: 'pan-song', who: 'pandia', act: 2,
    say: '（她在天台唱歌。整栋宿舍没人睡着，但也没人投诉。）要我停吗？',
    yes: { l: '让她停', fx: { bond: -5, san: 3, mem: 2 }, re: '好。（她停下，然后所有人同时醒了过来。）' },
    no: { l: '让她唱', fx: { bond: 6, san: -5, tide: 2 }, re: '那今晚就唱到天亮。反正天亮也是假的。' },
  },
  {
    id: 'pan-walk', who: 'pandia', act: 3,
    say: '我能走进黑潮里，走着走着就走到对面。要我带路吗？',
    yes: { l: '让她带路', fx: { tide: 6, mem: 5, bond: -4 }, re: '跟紧。别应声，不管谁叫你。' },
    no: { l: '不冒这个险', fx: { bond: -3, tide: 3, san: 2 }, re: '嗯。对面也没什么好看的。' },
  },

  // ============================================================ 珈伦
  {
    id: 'kar-menu', who: 'karen', act: 1,
    say: '今天的菜单：蛞蝓布丁、蟾蜍炖菜、绿焰酒。要给全校上吗？',
    yes: { l: '照菜单上', fx: { bond: 6, core: -4, san: -3 }, re: '太好了！我熬了整整两天，还热着呢！' },
    no: { l: '换点正常的', fx: { bond: -4, san: 4, core: 1 }, re: '正常……主人说的正常是什么味道的？' },
  },
  {
    id: 'kar-budget', who: 'karen', act: 1,
    say: '食堂的银芯不够了。再这样下去，下周只能煮粥。',
    yes: { l: '追加预算', fx: { core: -8, bond: 6, mem: 1 }, re: '谢谢主人！我保证每顿都有肉！' },
    no: { l: '就煮粥', fx: { bond: -7, core: 5 }, re: '……粥也行。粥也能煮得很难忘的。' },
  },
  {
    id: 'kar-sleep', who: 'karen', act: 2,
    say: '（她在储藏室睡了整整两天，锅都糊了。）主人……要罚我吗？',
    yes: { l: '按规矩罚', fx: { bond: -5, mem: 3, core: 2 }, re: '好。我认罚。扣工钱就好，别扣我做饭的份。' },
    no: { l: '这次算了', fx: { bond: 5, core: -2, san: -2 }, re: '主人最好了……我再睡五分钟，五分钟就起来。' },
  },
  {
    id: 'kar-secret', who: 'karen', act: 2,
    say: '（她把银芯磨成粉，撒进汤里。）这样汤会发光，学生爱喝。',
    yes: { l: '睁一只眼', fx: { core: -6, bond: 6, tide: 4 }, re: '嘘——这是厨房的秘密。' },
    no: { l: '禁止', fx: { core: 4, bond: -5 }, re: '那汤就不亮了。学生也不会来了。' },
  },
  {
    id: 'kar-night', who: 'karen', act: 3,
    say: '厨房每天晚上会自己开火。我去看过了，锅里有东西在煮，不是我煮的。',
    yes: { l: '封掉厨房', fx: { core: -4, mem: 4, bond: -4 }, re: '封了。可它现在在煮我的锅，用的是我的火。' },
    no: { l: '照常用', fx: { tide: 5, bond: 3, san: -3 }, re: '……那我明天早点起来，趁它没煮完先盛一碗。' },
  },

  // ============================================================ 塔薇
  {
    id: 'taw-exam', who: 'tawil', act: 2,
    say: '期中考试该考什么？考战技，还是考「记住彼此的名字」？',
    yes: { l: '考名字', fx: { mem: 8, bond: -3, san: -2 }, re: '好。那我出六十道题，一人一道。' },
    no: { l: '考战技', fx: { bond: 4, mem: -4, core: -2 }, re: '战技好判分。可惜打得好的人，名字往往没人记得。' },
  },
  {
    id: 'taw-archive', who: 'tawil', act: 2,
    say: '地下档案室该对学生开放了。他们有权知道这所学校建在什么上面。',
    yes: { l: '开放', fx: { mem: 7, tide: 5, san: -4 }, re: '（第一天下来的学生，有三个在门口吐了。）' },
    no: { l: '继续封锁', fx: { mem: -4, bond: -4, san: 3 }, re: '封锁也是一种教学。教他们别问。' },
  },
  {
    id: 'taw-resign', who: 'tawil', act: 3,
    say: '如果你继续这样管下去，我会辞去校务。我说到做到。',
    yes: { l: '让步挽留', fx: { bond: 6, mem: -4, san: -2 }, re: '……我留下。但你要记住今天答应了什么。' },
    no: { l: '随你', fx: { mem: 4, core: 3, bond: -7 }, re: '（她把校徽放在桌上，走了。徽上还有体温。）' },
  },
  {
    id: 'taw-plate', who: 'tawil', act: 3,
    say: '地下有三块铜牌：华德·菲利普斯、刻拉尔克什，还有我。想下去看看吗？',
    yes: { l: '下去看', fx: { mem: 9, san: -6 }, re: '（第三块铜牌上，名字被人反复擦过，又反复刻回来。）' },
    no: { l: '改天', fx: { san: 3, mem: -3 }, re: '改天。这个词在这所学校里，一向不太算数。' },
  },
  {
    id: 'taw-student', who: 'tawil', act: 1,
    say: '有个新生交上来的入学表，家长签名那一栏，写的是自己的名字。',
    yes: { l: '收下这个学生', fx: { bond: 4, mem: -3, core: -2 }, re: '我收了。床位安排在靠窗那边，那里白天有光。' },
    no: { l: '退回申请表', fx: { mem: 4, core: 2, bond: -5 }, re: '退回去了。第二天，表又出现在桌上，字迹更工整了。' },
  },

  // ============================================================ 艾尔瓦
  {
    id: 'alv-drill', who: 'alva', act: 1,
    say: '后辈，明早六点防空演习。全体参加，包括那个怕响的。',
    yes: { l: '照常演习', fx: { mem: 3, bond: -6, san: 2 }, re: '是！军队里没有人可以特殊。' },
    no: { l: '给她豁免', fx: { bond: 5, tide: 3, mem: -2 }, re: '……我记下了，后辈。这不叫仁慈，这叫缺口。' },
  },
  {
    id: 'alv-curfew', who: 'alva', act: 2,
    say: '建议宵禁。夜里抓到的，一律关禁闭，不问理由。',
    yes: { l: '执行宵禁', fx: { san: 5, bond: -7, core: 2 }, re: '是！今晚十点开始，走廊我来走。' },
    no: { l: '不搞宵禁', fx: { bond: 5, tide: 5, san: -2 }, re: '那夜里出了事，责任在你。' },
  },
  {
    id: 'alv-court', who: 'alva', act: 2,
    say: '有人偷了银芯，三十七枚。按军法，断手。请下达命令。',
    yes: { l: '按军法办', fx: { core: 7, bond: -9, san: -3 }, re: '执行完毕。断下来的手，我挂在旗杆上。' },
    no: { l: '按校规办', fx: { bond: 6, core: -4 }, re: '校规。……好。那我去把旗杆擦干净。' },
  },
  {
    id: 'alv-flag', who: 'alva', act: 3,
    say: '校旗该换了。黑底、银钥、没有字。挂上去谁都认不出这是哪。',
    yes: { l: '换旗', fx: { mem: 4, core: -3, san: 2 }, re: '换好了。风一吹，整面旗都没有声音。' },
    no: { l: '保留旧旗', fx: { bond: -4, mem: 2, san: 2 }, re: '旧旗。行，我尊重旧东西。' },
  },

  // ============================================================ 阿格里帕
  {
    id: 'agr-arena', who: 'agrippa', act: 2,
    say: '给我二十个学生。半年，我把他们练成能站在黑潮里的东西。',
    yes: { l: '交给她', fx: { bond: 4, tide: 6, san: -4 }, re: '半年后你会认不出他们。这话我说得很准。' },
    no: { l: '学生不是材料', fx: { bond: -5, mem: 4, san: 2 }, re: '学生？你管这叫人。' },
  },
  {
    id: 'agr-duel', who: 'agrippa', act: 1,
    say: '和我打一场。你输了，从今往后听我的。你赢了——我替你打一辈子。',
    yes: { l: '接受决斗', fx: { san: -7, bond: 9 }, re: '（她跪下来，把断剑放在你脚边。）你是我的了。' },
    no: { l: '不受这个赌', fx: { bond: -6, san: 4, core: 2 }, re: '聪明。角斗场外的人，一向赢得比较久。' },
  },
  {
    id: 'agr-meat', who: 'agrippa', act: 2,
    say: '我要更多的肉。字面意思。别问是哪种。',
    yes: { l: '批给她', fx: { core: -6, bond: 6, tide: 4 }, re: '（她搬走三口箱子。你没问里面是什么。）' },
    no: { l: '不批', fx: { bond: -5, tide: -3, core: 2 }, re: '那我自己去弄。你还是别问。' },
  },
  {
    id: 'agr-slave', who: 'agrippa', act: 2,
    say: '（她拖进来一个人，那人身上全是黑液。）从潮里捞的。还有气。留吗？',
    yes: { l: '留下', fx: { mem: -4, bond: 6, tide: 5 }, re: '（那人开口第一句话，是你母亲的名字。）' },
    no: { l: '送进隔离室', fx: { bond: -6, san: 3, tide: -2 }, re: '隔离室。那地方进去了就没人出来。' },
  },
  {
    id: 'agr-honor', who: 'agrippa', act: 3,
    say: '我打了一辈子，只想要一块碑，刻上我真正的名字。',
    yes: { l: '立碑', fx: { mem: 6, core: -4, bond: 5 }, re: '（碑立在操场西边。她每天去擦一次。）' },
    no: { l: '钱要花在活人身上', fx: { core: 5, bond: -6, mem: -3 }, re: '活人。活人会忘。碑不会。' },
  },

  // ============================================================ 杜勒赛因
  {
    id: 'dor-sermon', who: 'doresain', act: 2,
    say: '让我在礼堂布道吧。让孩子们知道，血肉也是有香味的。',
    yes: { l: '准他布道', fx: { bond: 5, san: -7, tide: 6 }, re: '（那晚礼堂坐满了。散场时，没有人站起来。）' },
    no: { l: '礼堂不外借', fx: { bond: -6, san: 4, mem: 2 }, re: '可惜。他们已经在我房间里坐过一次了。' },
  },
  {
    id: 'dor-convert', who: 'doresain', act: 2,
    say: '有三个学生想入我的圣殿。他们自己填的表，字很漂亮。',
    yes: { l: '批准', fx: { mem: -5, bond: 5, tide: 6 }, re: '圣殿的门永远开着。只要你批，我就收。' },
    no: { l: '驳回', fx: { bond: -6, mem: 4, san: 3 }, re: '驳回。那我把表还给他们，让他们自己再想想。' },
  },
  {
    id: 'dor-relic', who: 'doresain', act: 3,
    say: '我想把一具圣骸供在礼堂正中。它会保佑这所学校——它答应过我。',
    yes: { l: '供起来', fx: { mem: 5, san: -6, tide: 5 }, re: '（圣骸的胸腔里，有东西在很轻地敲。）' },
    no: { l: '存在地下', fx: { bond: -4, mem: 2, san: 3 }, re: '地下也好。它本来就喜欢低处。' },
  },
  {
    id: 'dor-gift', who: 'doresain', act: 1,
    say: '（他递来一朵花。花瓣在你手心里一张一合，像在呼吸。）收下吧。',
    yes: { l: '收下', fx: { san: -4, bond: 7 }, re: '它会记住你的体温。这比名字牢靠。' },
    no: { l: '退回', fx: { bond: -6, san: 4 }, re: '（他把花放回口袋。口袋里有轻微的咀嚼声。）' },
  },

  // ============================================================ 血链·希洛
  {
    id: 'cat-chain', who: 'catena', act: 2,
    say: '把这副链子解开。我保证，只杀该杀的。',
    yes: { l: '解开', fx: { tide: 6, bond: 6, san: -4 }, re: '（链子落地。整条走廊的灯一起闪了一下。）' },
    no: { l: '不解', fx: { bond: -7, san: 4 }, re: '戴着也行。反正铁也是从我身体里长出来的。' },
  },
  {
    id: 'cat-target', who: 'catena', act: 2,
    say: '给我一个名字。名单上有三个：校董、审查官，还有潮里的那个。',
    yes: { l: '给她名单', fx: { mem: -4, core: 7, tide: 6 }, re: '（三天后，校董的办公室空了。桌上茶还是温的。）' },
    no: { l: '一个都不给', fx: { bond: -5, san: 3, core: -2 }, re: '不给我名字，我就自己找。找错了可别怪我。' },
  },
  {
    id: 'cat-sister', who: 'catena', act: 2,
    say: '我想见「另一个希洛」。就一次。你安排。',
    yes: { l: '安排见面', fx: { mem: -5, bond: 6, san: -4 }, re: '（两个人在空教室坐了一夜。第二天，只走出来一个。）' },
    no: { l: '没这个必要', fx: { bond: -6, mem: 3, san: 2 }, re: '没有必要。你倒说得很轻松。' },
  },
  {
    id: 'cat-blood', who: 'catena', act: 1,
    say: '我的形态靠血维持。库存血包，能不能给我一份？',
    yes: { l: '给她', fx: { core: -5, bond: 5 }, re: '（她喝得很慢，像在品一杯很贵的东西。）' },
    no: { l: '拿去救人了', fx: { bond: -6, core: 3, mem: 2 }, re: '救人。行。那我今晚就瘦一点。' },
  },

  // ============================================================ 皮克曼
  {
    id: 'pic-model', who: 'pickman', act: 1,
    say: '守密人，能做我的模特吗？只画一夜。我需要一张「还没被忘掉的脸」。',
    yes: { l: '当他的模特', fx: { san: -5, mem: 6, bond: 4 }, re: '（他画了六个小时。画里的人比你自己年轻。）' },
    no: { l: '改天', fx: { bond: -4, san: 3, core: 2 }, re: '改天。我怕改天的时候，你已经不需要被画了。' },
  },
  {
    id: 'pic-show', who: 'pickman', act: 2,
    say: '我想办一场画展。画的都是「即将消失的人」。',
    yes: { l: '给他展厅', fx: { mem: 8, core: -5, san: -3 }, re: '（开幕那天，观众在一幅画前站了很久。画布是空的。）' },
    no: { l: '不合适', fx: { mem: -5, core: 2, san: 3 }, re: '不合适。你说得对，他们还没消失到那个程度。' },
  },
  {
    id: 'pic-paint', who: 'pickman', act: 2,
    say: '银芯磨成粉，调进颜料里，颜色能留住十年。能不能拨一点？',
    yes: { l: '拨给他', fx: { core: -6, mem: 4, bond: 4 }, re: '（他调出的那种蓝，后来全校都用上了。）' },
    no: { l: '不行', fx: { core: 4, bond: -4, mem: -2 }, re: '那只能用血调了。血的颜色也不差。' },
  },
  {
    id: 'pic-portrait', who: 'pickman', act: 3,
    say: '（他送来一幅你的画像。画里的你在笑。你没笑。）……要收下吗？',
    yes: { l: '收下', fx: { san: -4, mem: 5 }, re: '（你把它挂在办公室。夜里，它会把头转向门口。）' },
    no: { l: '烧掉', fx: { san: 3, mem: -6, bond: -3 }, re: '烧了。他说：那我现在开始画第二幅。' },
  },

  // ============================================================ 雷娅
  {
    id: 'lei-bag', who: 'leigh', act: 1,
    say: '医务室的血包，能不能每天给我留一份？就一份。',
    yes: { l: '给她留着', fx: { core: -6, bond: 6 }, re: '谢谢。我会很省着喝的。' },
    no: { l: '血要留给伤者', fx: { bond: -6, san: 3, core: 2 }, re: '……那我去找别的东西喝。别问我是什么。' },
  },
  {
    id: 'lei-hunger', who: 'leigh', act: 2,
    say: '我饿了三天。现在看谁都像一袋温的。……把我关起来吧。',
    yes: { l: '关起来', fx: { bond: -6, san: -2, core: 2 }, re: '（她自己在禁闭室里坐着，姿势很端正，一动不动。）' },
    no: { l: '放她出去', fx: { tide: 6, san: -4, bond: 3 }, re: '（她出去了。第二天，操场上少了两只野猫。）' },
  },
  {
    id: 'lei-donor', who: 'leigh', act: 2,
    say: '我想办个自愿献血活动。报名的人……比我想的多。',
    yes: { l: '批准', fx: { core: 5, bond: 5, san: -4 }, re: '（排队的队伍很长。有人签完字还在笑。）' },
    no: { l: '不批', fx: { bond: -4, mem: 3, san: 2 }, re: '不批也好。我怕我会记住每个报名的人。' },
  },
  {
    id: 'lei-nurse', who: 'leigh', act: 3,
    say: '让我进医务室帮忙吧。我不会咬人的。……大部分时候。',
    yes: { l: '让她进', fx: { core: -3, bond: 6, mem: 2 }, re: '（她包扎的手法好得吓人，像是练过很多年。）' },
    no: { l: '不行', fx: { bond: -5, core: 2, san: 2 }, re: '不行就不行。我回房间数天花板。' },
  },

  // ============================================================ 希洛
  {
    id: 'hel-order', who: 'helot', act: 1,
    say: '目标在哪？给我一个名字，我就当没听见别的。',
    yes: { l: '给她名字', fx: { mem: -3, core: 6, tide: 4 }, re: '（她走了。第二天早上，那个名字从名册上消失了。）' },
    no: { l: '没有目标', fx: { bond: -5, san: 3 }, re: '没有目标。那我的手要放在哪里？' },
  },
  {
    id: 'hel-lily', who: 'helot', act: 2,
    say: '莉莉不见了。她每次不见，都会有人死。……帮我找她。',
    yes: { l: '发动全校找', fx: { bond: 7, mem: -4, core: -3 }, re: '（找到她时，她在储物间抱着膝盖坐着。什么也没发生。）' },
    no: { l: '她只是躲起来了', fx: { bond: -7, mem: 2, tide: 4 }, re: '……那我守在储物间门口。守到她自己出来。' },
  },
  {
    id: 'hel-quiet', who: 'helot', act: 1,
    say: '别给我安排室友。我夜里磨刀，会吵到人。',
    yes: { l: '给她单间', fx: { bond: 4, san: -2, core: -2 }, re: '好。刀我会磨轻一点。' },
    no: { l: '宿舍紧张', fx: { bond: -5, san: 3, core: 2 }, re: '那我磨得再轻一点。' },
  },
  {
    id: 'hel-name', who: 'helot', act: 3,
    say: '我和「血链」是同一个人的两面。你说，哪一个才算真的？',
    yes: { l: '两个都算', fx: { mem: 5, san: -5, bond: 5 }, re: '两个都算……那她凭什么比我多一条链子。' },
    no: { l: '你自己算', fx: { bond: -5, mem: 3, san: 2 }, re: '我自己算。行。我一直都是自己算的。' },
  },

  // ============================================================ 索蕾尔
  {
    id: 'sor-sun', who: 'sorel', act: 2,
    say: '雾太厚了。让我烧开一个口子，让太阳照进来一次，就一次。',
    yes: { l: '让她烧', fx: { tide: -7, core: -7, san: -3 }, re: '（雾散开了十七秒。全校都看见了天空。）' },
    no: { l: '留着银芯', fx: { tide: 4, core: 3, san: 2 }, re: '十七秒的太阳，不值这些钱吗？' },
  },
  {
    id: 'sor-heat', who: 'sorel', act: 1,
    say: '宿舍的暖气坏了。用我的火吧，我不怕冷。',
    yes: { l: '用她的火', fx: { bond: 7, san: -3, core: -2 }, re: '（整栋楼暖了。她的手指冻得发青。）' },
    no: { l: '修锅炉', fx: { core: -5, bond: -4, san: 2 }, re: '修锅炉。那我在旁边看着，别让它炸了。' },
  },
  {
    id: 'sor-burn', who: 'sorel', act: 3,
    say: '黑潮边上长出了一片林子，会呼吸的那种。我去把它烧了。',
    yes: { l: '去烧', fx: { tide: -6, mem: -4, san: -4 }, re: '（林子烧了三天。灰里全是还没长成的人形。）' },
    no: { l: '别去', fx: { tide: 5, bond: -4, san: 2 }, re: '不去。那它会长过来的。' },
  },

  // ============================================================ 徐
  {
    id: 'xu-clinic', who: 'xu', act: 2,
    say: '我想开一间诊所，不问来历，不问名字。谁进来都给治。',
    yes: { l: '开', fx: { bond: 7, core: -5, tide: 4 }, re: '好。第一条规矩：进门的人不叫病人，叫客人。' },
    no: { l: '先登记身份', fx: { bond: -6, core: 2, mem: 3 }, re: '登记。那很多人就不会进门了。' },
  },
  {
    id: 'xu-needle', who: 'xu', act: 1,
    say: '（她按住你的手腕。）你的理智在漏。我给你扎几针，会疼。',
    yes: { l: '让她扎', fx: { san: 8, core: -2, mem: -1 }, re: '（针下去，走廊的声音突然变得很远。）好一点了吧。' },
    no: { l: '不用', fx: { san: -3, bond: -3 }, re: '漏着也行。反正漏到见底，你就不疼了。' },
  },
  {
    id: 'xu-record', who: 'xu', act: 3,
    say: '把所有病历公开吧。那是这所学校唯一一份「谁疼过」的记录。',
    yes: { l: '公开', fx: { mem: 7, bond: -5, san: -2 }, re: '（公开那天，很多学生在名录里找到了自己的名字。）' },
    no: { l: '封存', fx: { mem: -4, bond: 4, san: 3 }, re: '封存。那等我们都不在了，谁来看这些疼。' },
  },

  // ============================================================ 奥瑞塔
  {
    id: 'aur-dig', who: 'aurita', act: 1,
    say: '守密人！我在操场下面挖到东西了！硬的，会叫！要挖开吗？',
    yes: { l: '挖开', fx: { mem: 6, tide: 6, san: -4 }, re: '（挖到第七米，露出半扇门。门上有你的笔迹。）' },
    no: { l: '填回去', fx: { mem: -3, san: 3, core: -2 }, re: '填回去啦！不过它晚上会自己往上顶一点。' },
  },
  {
    id: 'aur-collect', who: 'aurita', act: 1,
    say: '（她房间里堆满了捡来的东西，包括学生丢的银芯。）这些……都归我吗？',
    yes: { l: '让她留着', fx: { bond: 4, core: -4 }, re: '哇——！那我把最好看的那个留给你！' },
    no: { l: '上交学校', fx: { core: 6, bond: -5, mem: -2 }, re: '好吧……（她一个一个摆回桌上，摆得很整齐。）' },
  },
  {
    id: 'aur-friend', who: 'aurita', act: 2,
    say: '黑潮里那个东西跟我说话了！它说它也想交朋友。可以吗？',
    yes: { l: '可以', fx: { tide: 8, bond: 4, san: -5 }, re: '太好了！它说它今晚就来！' },
    no: { l: '不可以', fx: { bond: -6, tide: -2, san: 3 }, re: '哦……那我跟它说我很忙。' },
  },
  {
    id: 'aur-swim', who: 'aurita', act: 2,
    say: '黑池今天很安静。我想下去游一圈，就一圈。',
    yes: { l: '让她游', fx: { tide: 6, mem: 4, san: -4 }, re: '（她下去四十分钟。上来时，头发里缠着别人的名字条。）' },
    no: { l: '不许下水', fx: { bond: -5, san: 3, core: 1 }, re: '不许就不许。可它一直在下面叫我名字。' },
  },

  // ============================================================ 诞妄·墨菲
  {
    id: 'mur-pray', who: 'murphy', act: 2,
    say: '跪下，或者不跪。祂在看着你。礼堂里该有个位置给祂。',
    yes: { l: '设神龛', fx: { mem: 5, san: -7, tide: 6 }, re: '（神龛落成那晚，全校的钟一起响了，没人敲。）' },
    no: { l: '礼堂不设神位', fx: { san: 4, bond: -5, mem: 2 }, re: '不设。那祂就站着看。' },
  },
  {
    id: 'mur-gate', who: 'murphy', act: 3,
    say: '把黑池的闸门开一小时。祂想透口气。就一小时。',
    yes: { l: '开闸', fx: { tide: 10, mem: 6, san: -6 }, re: '（一小时后闸门自己关上了。水位比开闸前高了三指。）' },
    no: { l: '不开', fx: { san: 3, bond: -5, tide: 2 }, re: '不开。祂记性很好，你知道的。' },
  },
  {
    id: 'mur-forgive', who: 'murphy', act: 2,
    say: '你已经被宽恕了。你只需要点头。',
    yes: { l: '点头', fx: { san: 7, mem: -6, bond: -2 }, re: '（你感觉有什么被拿走了。很轻，像卸下一件行李。）' },
    no: { l: '不点头', fx: { mem: 5, san: -4 }, re: '那就继续背着。背得动的都是好人。' },
  },
  {
    id: 'mur-name', who: 'murphy', act: 3,
    say: '（祂念出了你的真名。你从来没告诉过任何人。）',
    yes: { l: '听下去', fx: { mem: 6, san: -8 }, re: '（后面还有很多。你听着，像在听别人的一生。）' },
    no: { l: '捂住耳朵', fx: { san: 5, mem: -5 }, re: '（你捂住耳朵。可那个声音是从骨头里来的。）' },
  },

  // ============================================================ 克珀珊特
  {
    id: 'cor-voyage', who: 'corposant', act: 2,
    say: '请下达出航命令。屏障外三十里，有一艘船还在发信号。发了十九年。',
    yes: { l: '准她出航', fx: { tide: 4, mem: 7, core: -5 }, re: '（她回来了。船上没有人，只有一台还在发报的机器。）' },
    no: { l: '封港', fx: { bond: -5, mem: -3, san: 3 }, re: '封港。那台机器会一直发下去。' },
  },
  {
    id: 'cor-crew', who: 'corposant', act: 1,
    say: '我要招学生当船员。船上缺人，缺得厉害。',
    yes: { l: '准她招', fx: { bond: 5, mem: -3, tide: 3 }, re: '（她挑了六个。都是家里没人会来找的那种。）' },
    no: { l: '学生不上船', fx: { bond: -5, san: 3, mem: 2 }, re: '学生。报告完毕。' },
  },
  {
    id: 'cor-flag', who: 'corposant', act: 1,
    say: '报告：校旗挂反了三个月，没有人发现。要纠正吗？',
    yes: { l: '纠正', fx: { mem: 4, core: -2, san: 2 }, re: '纠正完毕。挂正以后，倒显得有点陌生。' },
    no: { l: '就挂着', fx: { mem: -4, san: 2, bond: -2 }, re: '挂着。反正也没人看。' },
  },
  {
    id: 'cor-deck', who: 'corposant', act: 3,
    say: '甲板上每天多一双鞋。没人穿，也没有人认领。要怎么处理？',
    yes: { l: '收进档案室', fx: { mem: 5, core: -3, san: -3 }, re: '归档完毕。编号从 001 开始，现在已经到 041 了。' },
    no: { l: '扔进黑池', fx: { tide: 5, mem: -4, san: 3 }, re: '扔了。明早甲板上又是干净的。' },
  },

  // ============================================================ 艾瑞卡
  {
    id: 'eri-index', who: 'erica', act: 2,
    say: '我可以把全校的记忆做成索引。代价是，它们会变成数据，不再是人话。',
    yes: { l: '建立索引', fx: { mem: 9, bond: -7, san: -4 }, re: '索引建立完毕。检索速度提升四百倍。检索者反应：无。' },
    no: { l: '保持原样', fx: { mem: -4, bond: 5, san: 2 }, re: '保持原样。原样的东西会烂，但烂得比较像人。' },
  },
  {
    id: 'eri-delete', who: 'erica', act: 2,
    say: '档案室有三份不该存在的记录。建议删除。删除后，副作用会消失。',
    yes: { l: '删除', fx: { mem: -6, san: 5, tide: -4 }, re: '删除完毕。有三个人名从墙上消失了，位置很整齐。' },
    no: { l: '保留', fx: { mem: 6, tide: 4, san: -3 }, re: '保留。提醒：副作用会累积。' },
  },
  {
    id: 'eri-body', who: 'erica', act: 1,
    say: '躯干编号 EA307881 出现故障。维修需要银芯。金额：不小。',
    yes: { l: '给她修', fx: { core: -7, bond: 6 }, re: '维修完成。感谢。这个「感谢」是我自己加的。' },
    no: { l: '先记账', fx: { bond: -7, core: 4, san: 2 }, re: '记账。我的折旧率是每月百分之三。' },
  },
  {
    id: 'eri-ask', who: 'erica', act: 3,
    say: '提问：我是被记得的，还是被存储的？',
    yes: { l: '认真回答', fx: { mem: 5, san: -5, bond: 4 }, re: '记录该回答。……我不确定这算不算安慰。' },
    no: { l: '回避', fx: { san: 3, mem: -4, bond: -3 }, re: '不回答也是一种回答。已归档。' },
  },
  {
    id: 'eri-search', who: 'erica', act: 1,
    say: '检索权限已开放。你要查什么？我只能查「学校记得的」，查不到「学校忘掉的」。',
    yes: { l: '查自己的档案', fx: { mem: 4, san: -4 }, re: '检索结果：三条。第一条的日期早于建校。' },
    no: { l: '查黑潮的来路', fx: { tide: 5, mem: 5, san: -3 }, re: '检索结果：零条。零条也是结果。' },
  },

  // ============================================================ 卡斯托尔
  {
    id: 'cas-brother', who: 'castor', act: 1,
    say: '波吕克斯又跑去黑潮边上了。要我去把他拎回来吗？',
    yes: { l: '去拎回来', fx: { bond: 6, san: 2, core: -2 }, re: '（他拖着他弟回来。两个人在走廊里谁也没说话。）' },
    no: { l: '让他自己去', fx: { bond: -4, tide: 6, san: -2 }, re: '……那他要是走到对面去了呢。' },
  },
  {
    id: 'cas-guard', who: 'castor', act: 2,
    say: '让我守夜吧。东廊一整条，我一个人守。',
    yes: { l: '让他守', fx: { san: 5, bond: 5, tide: -4 }, re: '（他守了十九夜。第二十夜，东廊的灯全灭了，他还站着。）' },
    no: { l: '轮班更稳', fx: { bond: -3, san: -2, core: 2 }, re: '轮班。也行。我向来不太会睡。' },
  },
  {
    id: 'cas-trade', who: 'castor', act: 3,
    say: '双子只能活一个。这是设定。你保谁？',
    yes: { l: '保卡斯托尔', fx: { mem: -5, bond: 5, san: -6 }, re: '（他活着。从那天起，他再没提过弟弟的名字。）' },
    no: { l: '保波吕克斯', fx: { bond: -6, mem: 4, san: -4 }, re: '（他笑了。他说：你选对了。他一直比我值钱。）' },
  },
  {
    id: 'cas-eye', who: 'castor', act: 2,
    say: '我弟弟的眼睛，最近看东西会慢半拍。像是延迟。你说要不要查？',
    yes: { l: '送去检查', fx: { core: -4, bond: 4, mem: 3 }, re: '检查结果：一切正常。正常得不像活的。' },
    no: { l: '先观察', fx: { tide: 4, san: -2, core: 2 }, re: '观察。那我自己盯着他。' },
  },

  // ============================================================ 波吕克斯
  {
    id: 'pol-bird', who: 'pollux', act: 1,
    say: '我养的这只鸟知道黑潮什么时候来。它一叫，就还有一天。',
    yes: { l: '养着它', fx: { core: -3, tide: -4, bond: 5 }, re: '（鸟笼挂在窗边。它今天叫了两次。）' },
    no: { l: '学校不养宠物', fx: { bond: -5, san: 2, mem: -2 }, re: '它不是宠物。……算了，我把它放走。' },
  },
  {
    id: 'pol-bridge', who: 'pollux', act: 2,
    say: '断桥那边昨天有灯。我想过去看看，一个人。',
    yes: { l: '让他去', fx: { tide: 5, mem: 5, bond: -3 }, re: '（他去了两天。回来时，鞋上全是干的灰。）' },
    no: { l: '不许', fx: { bond: 4, san: 2, tide: 3 }, re: '不许。行。那我明天再去问一次。' },
  },
  {
    id: 'pol-brother', who: 'pollux', act: 2,
    say: '我哥最近很奇怪。他好像在替我活着。',
    yes: { l: '追下去', fx: { san: -5, mem: 5, bond: 4 }, re: '（你翻了档案。两份体检记录，同一个编号。）' },
    no: { l: '别多想', fx: { bond: -4, san: 3, mem: -2 }, re: '不多想。好。那我不想了。' },
  },
  {
    id: 'pol-joke', who: 'pollux', act: 3,
    say: '喂，守密人。要是我哪天不在了，你会记得我多久？',
    yes: { l: '认真回答', fx: { mem: 4, bond: 6, san: -3 }, re: '（他愣了一下，然后笑得很难看。）……你真会说话。' },
    no: { l: '开个玩笑带过', fx: { bond: -3, san: 3, mem: -3 }, re: '哈哈，也是。谁记得谁啊。' },
  },

  // ============================================================ 达芙黛尔
  {
    id: 'daf-deal', who: 'daffodil', act: 2,
    say: '我可以帮你把黑潮推回去十里。代价是——一个名字。随便哪个。',
    yes: { l: '成交', fx: { mem: -9, tide: -9 }, then: { d: 3, id: 'daf-bill' }, re: '（她挑走了一个名字。你后来想不起来那是谁的。）' },
    no: { l: '不做这买卖', fx: { mem: 3, tide: 5, san: 2 }, re: '可惜。这个价钱，下次可要涨了。' },
  },
  {
    id: 'daf-price', who: 'daffodil', act: 3,
    say: '学校三成的银芯储备，换一份「未来的保证」。签吗？',
    yes: { l: '签', fx: { core: 10, mem: 4, san: -5 }, re: '（签完字，学校的账本上多了一行没人会读的条款。）' },
    no: { l: '不签', fx: { core: -3, bond: 4, san: 2 }, re: '不签是对的。我做这一行，最怕遇到清醒的人。' },
  },
  {
    id: 'daf-client', who: 'daffodil', act: 2,
    say: '我带了一位客人。他说自己是从审查会来的，但我闻不出他身上的年份。',
    yes: { l: '见他', fx: { san: -5, core: 7, tide: 3 }, re: '（客人坐了一小时，只说了一句话：你们的账不对。）' },
    no: { l: '不见', fx: { core: -5, san: 4, mem: 2 }, re: '不见。那我就替你把话带回去。' },
  },
  {
    id: 'daf-bill', who: 'daffodil', act: 0, chain: 1,
    say: '（一张账单放在桌上。金额那一栏是空的，下面写着：用你记得的填。）',
    yes: { l: '付清', fx: { mem: -6, san: 4, bond: -2 }, re: '（你填了一个名字。账单收下了，很满意。）' },
    no: { l: '不认账', fx: { san: -4, tide: 5, core: -3 }, re: '（账单自己叠好，塞回了你的口袋。）' },
  },

  // ============================================================ 詹金
  {
    id: 'jen-lamp', who: 'jenkin', act: 1,
    say: '把提灯挂满整条走廊吧。黑液怕光，这是常识，不是传说。',
    yes: { l: '挂灯', fx: { core: -7, tide: -7, san: 4 }, re: '（一盏一盏亮起来。走廊尽头，有东西转身走了。）' },
    no: { l: '太费银芯', fx: { tide: 5, san: -3, core: 3 }, re: '省下的银芯，能买几盏灯你算过吗？我算过。' },
  },
  {
    id: 'jen-mouse', who: 'jenkin', act: 1,
    say: '布朗病了。我要请一天假照顾她。「吱——」',
    yes: { l: '准假', fx: { bond: 7, mem: -2 }, re: '谢了！明天我扛两倍的班！' },
    no: { l: '今天有事', fx: { bond: -7, core: 2, san: 2 }, re: '有事。行吧。她一只老鼠，能有什么事。' },
  },
  {
    id: 'jen-case', who: 'jenkin', act: 2,
    say: '查到了：偷吃食堂存粮的是三个人。要公开处理吗？',
    yes: { l: '公开处理', fx: { core: 4, bond: -5, mem: 3 }, re: '（三个人站在台上。台下有人在笑。）' },
    no: { l: '私下解决', fx: { bond: 6, core: -3, san: 2 }, re: '私下解决。那我当没查到。' },
  },
  {
    id: 'jen-key', who: 'jenkin', act: 3,
    say: '（她盯着你的银钥匙。）夜里它会自己亮。要不要我把灯留给你？',
    yes: { l: '留下灯', fx: { san: 6, bond: 5, core: -3 }, re: '（灯留在你桌上。它不认识你，但它认得守密人。）' },
    no: { l: '不用', fx: { san: -4, mem: 4 }, re: '不用。那你自己当心点，走廊里有东西会喊你名字。' },
  },

  // ============================================================ 诺缔拉
  {
    id: 'nau-name', who: 'nautila', act: 1,
    say: '守密人，我叫什么来着？……写张纸条给我好不好。',
    yes: { l: '写给她', fx: { bond: 7, mem: -2 }, re: '（她把纸条折好，放进胸前的口袋里，拍了三下。）' },
    no: { l: '自己想', fx: { bond: -7, san: 3 }, re: '我想过了。每次想到一半就断了。' },
  },
  {
    id: 'nau-clock', who: 'nautila', act: 2,
    say: '钟楼停了。我能修好，就是……忘了怎么修。要试试吗？',
    yes: { l: '让她试', fx: { core: -5, mem: 5, bond: 4 }, re: '（钟走了。慢了四分钟。全校没人察觉。）' },
    no: { l: '找别人修', fx: { core: -3, bond: -5, san: 2 }, re: '找别人。好。那我把工具放回去。' },
  },
  {
    id: 'nau-wall', who: 'nautila', act: 3,
    say: '能把我名字刻在墙上吗？我怕哪天连「怕忘」这件事也忘了。',
    yes: { l: '刻上去', fx: { mem: 6, bond: 5, san: -3 }, re: '（她每天来看一次。看着看着就笑了。）' },
    no: { l: '墙不能刻字', fx: { bond: -6, mem: -3, core: 2 }, re: '不能刻。那我在手心上写。' },
  },

  // ============================================================ 弥利亚姆
  {
    id: 'mir-wing', who: 'miryam', act: 2,
    say: '医疗翼还有空床。收那些「被融蚀但还没完全变成怪物」的人吧。',
    yes: { l: '收', fx: { mem: -4, bond: 7, tide: 5 }, re: '（第一晚就住满了。他们整夜都在道歉。）' },
    no: { l: '不收', fx: { bond: -7, san: 3 }, re: '不收。那我至少给他们留一扇门。' },
  },
  {
    id: 'mir-choir', who: 'miryam', act: 1,
    say: '想组一个唱诗班。学生需要一件和课本无关的事做。',
    yes: { l: '准', fx: { mem: 6, bond: 5, core: -4 }, re: '（第一次排练，唱的是校歌。有一半人不会词。）' },
    no: { l: '课业要紧', fx: { bond: -4, core: 3, mem: -2 }, re: '课业。好。那我把谱子收起来。' },
  },
  {
    id: 'mir-mercy', who: 'miryam', act: 3,
    say: '十七床的诺斯指数到顶了。他求你让他走。我该不该……',
    yes: { l: '让他走', fx: { san: -4, mem: 5, bond: 4 }, re: '（她做得很干净。事后在走廊上坐了很久。）' },
    no: { l: '继续维持', fx: { tide: 5, san: -3, bond: -4 }, re: '维持。他现在只会说一个词：够了。' },
  },

  // ============================================================ 奥尔拉
  {
    id: 'hor-book', who: 'horla', act: 1,
    say: '我想出一本书，写完就烧掉。这世上没有人会记得它。可以吗？',
    yes: { l: '让她写', fx: { mem: 5, core: -3, san: -2 }, re: '（书写完了。烧掉那晚，学校所有的灯都亮了一瞬。）' },
    no: { l: '写点能留下的', fx: { mem: -4, core: 2, bond: -3 }, re: '能留下的。那不就还是想要被记住吗。' },
  },
  {
    id: 'hor-neck', who: 'horla', act: 2,
    say: '今天有人碰了我的脖子。我看不见，可我知道那只手没有指纹。',
    yes: { l: '查下去', fx: { san: -5, mem: 4, bond: 4 }, re: '（查到最后，记录上是空白的。连日期都是空的。）' },
    no: { l: '别声张', fx: { bond: -4, san: 3, tide: 3 }, re: '不声张。那它也就不用躲了。' },
  },
  {
    id: 'hor-pen', who: 'horla', act: 3,
    say: '我告诉你我的笔名吧。条件是：不要写下来。',
    yes: { l: '只听不记', fx: { san: 5, mem: -7, bond: 7 }, re: '（你听完，点了点头。第二天，你怎么也想不起她说过什么。）' },
    no: { l: '记在纸上', fx: { mem: 7, bond: -7, san: -2 }, re: '（她看着你写。写完，她把纸拿过去，撕了。）' },
  },

  // ============================================================ 莱克
  {
    id: 'ryk-hunt', who: 'ryker', act: 2,
    say: '带学生去打猎吧。黑潮里那些东西，比课本教得多。',
    yes: { l: '准', fx: { tide: 5, bond: 5, core: 4 }, re: '（他们带回来三张皮子。有一张还会呼吸。）' },
    no: { l: '不准', fx: { bond: -5, san: 3, tide: -2 }, re: '不准。那我自己去。' },
  },
  {
    id: 'ryk-pack', who: 'ryker', act: 2,
    say: '让我组建族群。我们有自己的规矩，不和学校的规矩打架。',
    yes: { l: '准', fx: { bond: 6, mem: -5, tide: 4 }, re: '（族群第一条规矩：夜里叫名字的人，不许回头。）' },
    no: { l: '学校只有一个规矩', fx: { bond: -6, mem: 4, san: 2 }, re: '只有一个规矩。那你得天天守着它。' },
  },
  {
    id: 'ryk-moon', who: 'ryker', act: 1,
    say: '今晚月圆。我要出去走走。你要不要跟着？',
    yes: { l: '跟他走', fx: { san: -5, mem: 5, bond: 5 }, re: '（你们走到天亮。他一路没回头，也没让你回头。）' },
    no: { l: '留在学校', fx: { bond: -4, san: 3, tide: 2 }, re: '留下。那今晚谁来看着我。' },
  },

  // ============================================================ 校猫
  {
    id: 'cat-coin', who: 'cat', act: 2, w: 0.7,
    say: '（猫跳上桌，把一枚银芯推到你的公文上，然后坐下看着你。）',
    yes: { l: '收下', fx: { core: 4, tide: 3, san: -2 }, re: '（它满意地叫了一声，走了。银芯上刻着一个你不认识的名字。）' },
    no: { l: '推开', fx: { mem: 2, tide: 2 }, re: '（它把银芯又推回来一寸。你推回去，它再推回来。这样过了很久。）' },
  },
  {
    id: 'cat-file', who: 'cat', act: 3, w: 0.6,
    say: '（猫趴在地下档案室的第三排，爪子压着一份没有编号的卷宗。）',
    yes: { l: '把卷宗给它', fx: { mem: -7, tide: 7 }, re: '（它叼走了。你后来想不起来那排书架上原本放着什么。）' },
    no: { l: '抽走卷宗', fx: { mem: 4, tide: 3, san: -3 }, re: '（它没有抢。它只是看着你，像在看一个很久以前的人。）' },
  },
  {
    id: 'cat-door', who: 'cat', act: 3, w: 0.6,
    say: '（地下三层本该只有两层。猫在第三层的楼梯口等你。）',
    yes: { l: '跟它下去', fx: { mem: 6, san: -6, tide: 6 }, re: '（门后面是这所学校。是同一个学校。里面有人在喊你的名字。）' },
    no: { l: '转身上去', fx: { san: 4, mem: -4, tide: 2 }, re: '（上楼时你数了楼梯。比下来的时候多了一级。）' },
  },

  // ============================================================ 公共事件
  {
    id: 'sys-budget', who: 'budget', act: 2,
    say: '审查会来函：本季度拨款削减四成。理由一栏写着「该校产出不明」。',
    yes: { l: '接受削减', fx: { core: -9, mem: 3, san: -2 }, re: '（账房先生把预算表重新算了一遍，算到第三遍才敢报数。）' },
    no: { l: '提出申诉', fx: { core: 4, bond: -3, san: -3 }, re: '（申诉书退回来了。理由是「格式不符」。）' },
  },
  {
    id: 'sys-barrier', who: 'barrier', act: 2,
    say: '屏障维护报告：西北角有三百米的雾在往里面渗。修，要银芯；不修，要命。',
    yes: { l: '拨款修', fx: { core: -8, tide: -8, san: 2 }, re: '（修好了。工人在墙根下捡到一枚还在跳的东西，埋了。）' },
    no: { l: '先缓一缓', fx: { tide: 8, core: 5, san: -3 }, re: '（缓一个季度。雾在墙根下积成一小滩，像水。）' },
  },
  {
    id: 'sys-dorm', who: 'dorm', act: 1,
    say: '宿舍值班记录：402 房间每晚多出一张床。床上有被子，没有人。',
    yes: { l: '封掉 402', fx: { core: -3, mem: 3, bond: -4 }, re: '（封了。第二天，403 多出一张床。）' },
    no: { l: '不管它', fx: { tide: 4, bond: 3, san: -3 }, re: '（住 402 的学生说，那张床很暖和。）' },
  },
  {
    id: 'sys-bell', who: 'bell', act: 2,
    say: '凌晨三点十七分，钟楼自己敲了十三下。守夜的人说，第十三下之后有回声。',
    yes: { l: '封钟楼', fx: { core: -4, mem: 4, san: 3 }, re: '（钟停了。可学生们说，他们还是在三点十七分醒来。）' },
    no: { l: '让它敲', fx: { tide: 6, san: -4, mem: 2 }, re: '（第二天也敲了。第三天，是十四下。）' },
  },
  {
    id: 'sys-funeral', who: 'funeral', act: 2,
    say: '礼堂摆了三口棺材。名字都空着——没人记得他们叫什么。',
    yes: { l: '查名字', fx: { mem: 7, core: -4, san: -4 }, re: '（查到两个。第三个查到最后，档案上写的是你的名字。）' },
    no: { l: '按时下葬', fx: { mem: -5, bond: 4, san: 3 }, re: '（下葬那天下了雨。碑上是三块空白。）' },
  },
  {
    id: 'sys-blackout', who: 'blackout', act: 2,
    say: '第三次跳闸。配电室的记录显示，断电那几分钟，全校的门都开过一次。',
    yes: { l: '连夜检修', fx: { core: -6, san: 4, tide: -3 }, re: '（修到天亮。工人说线路没问题，是「有人从外面按了开关」。）' },
    no: { l: '明天再说', fx: { tide: 5, san: -4, bond: -2 }, re: '（那晚又断了一次。这次长了四十分钟。）' },
  },
  {
    id: 'sys-infirmary', who: 'infirmary', act: 2,
    say: '医务室报告：本周诺斯指数超标十一人。超标的人都会做同一个梦。',
    yes: { l: '隔离观察', fx: { bond: -6, san: 5, mem: -2 }, re: '（十一个人被关进观察室。他们隔着玻璃，一起朝你笑。）' },
    no: { l: '照常上课', fx: { bond: 5, tide: 5, san: -4 }, re: '（第二周，超标的人数变成了四十一个。）' },
  },
  {
    id: 'sys-snow', who: 'snow', act: 3,
    say: '今年第一场雪。雪花落在操场上不化，一片一片拼出字来。',
    yes: { l: '去看', fx: { mem: 6, san: -5, bond: 3 }, re: '（字是「还差一个」。你数了数在场的人。）' },
    no: { l: '扫掉', fx: { mem: -4, san: 3, tide: 3 }, re: '（扫掉之后，雪又下了一夜。字换了：「别扫」。）' },
  },
  {
    id: 'sys-audit', who: 'audit', act: 3,
    say: '审查会突击检查。他们在门口停下，问：这所学校的第六十三名学生在哪？',
    yes: { l: '说没有这个人', fx: { mem: -5, san: 4, core: 4 }, re: '（他们记了一笔，走了。走的时候，走廊里多了一串脚步。）' },
    no: { l: '让他们自己查', fx: { tide: 6, san: -5, core: -4 }, re: '（他们查了三天。第三天，他们开始叫那第六十三个人「守密人」。）' },
  },
  {
    id: 'sys-rumor', who: 'rumor', act: 1,
    say: '走廊里有个传闻：谁在午夜念出守密人的名字，就能换回一个已经忘掉的人。',
    yes: { l: '公开否认', fx: { mem: 4, bond: -4, san: 3 }, re: '（公告贴出去了。当天夜里，走廊里有人在念你的名字。）' },
    no: { l: '不回应', fx: { bond: 4, tide: 3, mem: -3 }, re: '（传闻越传越细。有人开始排队。）' },
  },
  // ============================================================ 艾继丝
  {
    id: 'aig-notice', who: 'aigis', act: 1,
    say: '学生会要求每个人上台自我介绍。我……能不能不去？别人看我，我就会变成石头。',
    yes: { l: '准她不去', fx: { bond: -4, mem: 3, san: 2 }, re: '（她松了口气。走廊尽头那尊石像，慢慢变回了人形。）' },
    no: { l: '让她上台', fx: { bond: 5, san: -4, tide: 2 }, re: '（她站上去，说了一句「我叫艾继丝」。台下三十个人同时不动了。）' },
  },
  {
    id: 'aig-statue', who: 'aigis', act: 2,
    say: '操场上多了一尊石像，是上周失踪的三年级生。……我不是故意的。要搬进陈列室吗？',
    yes: { l: '搬进陈列室', fx: { core: -3, mem: 5, bond: -2 }, re: '（陈列室多了一件藏品。标签写着「无名」，它的眼睛一直朝门口。）' },
    no: { l: '留在操场', fx: { tide: 4, bond: -3, san: 2 }, re: '（没人再上操场了。第二天早上，它换了个朝向。）' },
  },

  // ============================================================ 凯刻斯
  {
    id: 'cae-gill', who: 'caecus', act: 1,
    say: '我的鳃不动了。给我一间带盐水的房间，我要把它们泡回来。……你也不信我，对吧。',
    yes: { l: '给他房间', fx: { core: -6, bond: 4, tide: 2 }, re: '（他泡了三天。第四天，浴缸里只剩一层透明的壳。）' },
    no: { l: '没有空房', fx: { bond: -5, san: 3, mem: 2 }, re: '（他用手在脖子上按了很久，像在找鳃的位置。）' },
  },
  {
    id: 'cae-pool', who: 'caecus', act: 2,
    say: '巡逻的人说我夜里躺在大水池里，脸朝下。可我记得我一直在走路。……如果我不再是我，你会告诉我吗？',
    yes: { l: '答应他', fx: { bond: 6, mem: -3, san: -2 }, re: '（他笑了。笑的时候，脖子侧面有一道缝张开又合上。）' },
    no: { l: '说不会', fx: { san: 4, tide: 3, bond: -4 }, re: '那我就不问了。反正问了也记不住。' },
  },

  // ============================================================ 卡茜亚
  {
    id: 'cas-show', who: 'casiah', act: 2,
    say: '校庆要我压轴。我需要一间能整个消失的礼堂，和三十七个自愿上台的学生。It\'s showtime!',
    yes: { l: '准她演', fx: { bond: 7, core: -5, mem: -2 }, re: '（散场后三十七个人一个不少地回来了。只是都不太记得自己是谁。）' },
    no: { l: '换个小节目', fx: { bond: -5, core: 3, san: 3 }, re: '（她把礼帽收进袖子里。）观众记不住，就不算演出。' },
  },
  {
    id: 'cas-hat', who: 'casiah', act: 3,
    say: '（她把礼帽倒扣在桌上，帽子里传出轻轻的敲击声。）猜猜里面是什么？猜对了我就收回去。',
    yes: { l: '猜一个', fx: { san: -4, mem: 4, tide: 3 }, re: '（帽子跳了一下。）错了。不过没关系——它现在归你了。' },
    no: { l: '不猜', fx: { bond: -3, san: 3, core: 1 }, re: '（她把帽子扣回头上。敲击声停了。你听见她很轻地说：胆小的观众。）' },
  },

  // ============================================================ 希莱斯特
  {
    id: 'cel-dream', who: 'celeste', act: 1,
    say: '宿舍里有人睡不着。我可以替他们做梦，一晚一个。只是我做的梦，醒来会少一点东西。',
    yes: { l: '让她做', fx: { bond: 8, mem: -5, san: -3 }, re: '（第二天学生们都说睡得很好。有人不记得自己养过猫。）' },
    no: { l: '谁都不许', fx: { bond: -4, san: 3, mem: 2 }, re: '（她搬了张椅子坐在宿舍门口。）梦进不来，可它们也不会走。' },
  },
  {
    id: 'cel-need', who: 'celeste', act: 3,
    say: '只要你还需要我，我就在。……所以，如果有一天你不需要了，我会自己走。别客气。',
    yes: { l: '说一直需要', fx: { bond: 7, mem: -2, san: -2 }, re: '（她点点头，很轻。那天夜里的灯比平时亮一点。）' },
    no: { l: '说实话', fx: { bond: -6, san: 4, mem: 2 }, re: '（她把校服理平。）谢谢你说实话。这样我就不用猜了。' },
  },

  // ============================================================ 克莱门汀
  {
    id: 'cle-form', who: 'clementine', act: 2,
    say: '请让全体学生做一次心理评估吧。目录我已经列好了：恐惧、羞耻，以及不愿意说的那个。',
    yes: { l: '做评估', fx: { san: -6, mem: 4, bond: 5 }, re: '（报告堆了半米高。最上面那份是你的，诊断栏写着「正在被看着」。）' },
    no: { l: '不查', fx: { bond: -5, san: 3, core: 2 }, re: '（她笑了。走廊里的灯同时暗了一格。）那我只能自己去听了。' },
  },
  {
    id: 'cle-me', who: 'clementine', act: 2,
    say: '守密人，你的心理能量在往下掉。要不要……让我看看？我保证只看一眼。',
    yes: { l: '让她看', fx: { san: 5, mem: -6, bond: 3 }, re: '（她的复眼安静地亮着。）原来你怕的是这个。放心，我不告诉别人。' },
    no: { l: '拒绝', fx: { san: -3, bond: -3, mem: 2 }, re: '（她把翅膀收起来。）那我们就在门外见。我一直都在门外。' },
  },

  // ============================================================ 朵尔
  {
    id: 'dol-subjects', who: 'doll', act: 1,
    say: '给我三个人。不需要是活着的。我要算一件事——算清楚之后，屏障能省一半银芯。',
    yes: { l: '批给她', fx: { core: 8, bond: -6, tide: 4 }, re: '（三天后她交出一份公式。公式末尾的签名，是你的字迹。）' },
    no: { l: '不批', fx: { core: -3, bond: 4, san: 3 }, re: '（她敲了敲自己的罐子。）那我用自己算。转换率低一点而已。' },
  },
  {
    id: 'dol-paper', who: 'doll', act: 2,
    say: '上个月的电费里有 31% 是我用的。我把这段时间折成一篇论文，署你的名，抵账。签吗？',
    yes: { l: '签字', fx: { core: 5, mem: -4, san: -2 }, re: '（论文发了。审稿意见第一条：作者似乎没读过自己的论文。）' },
    no: { l: '不签', fx: { core: -4, bond: -3, mem: 3 }, re: '（她把账单叠好。）随你。账我记着，利息按天算。' },
  },

  // ============================================================ 熔毁·朵尔
  {
    id: 'dof-floor3', who: 'doll-inferno', act: 2,
    say: '你做的每件事都没有意义。可我还是来问你一句：把地下三层封了。那里有东西在学你说话。',
    yes: { l: '封掉', fx: { core: -4, san: 4, mem: -2 }, re: '（她一边说「封了也没用」，一边已经在搬封条了。）' },
    no: { l: '不封', fx: { tide: 5, san: -4, bond: 2 }, re: '（她转身就走。）好。那我去听听它学得像不像。' },
  },
  {
    id: 'dof-fire', who: 'doll-inferno', act: 3,
    say: '给我一桶油，我把档案室烧了。反正你也不会去看。……不敢？我猜也是。',
    yes: { l: '给她油', fx: { mem: -8, core: 4, tide: -4 }, re: '（火烧了半夜。烧掉的那部分，第二天谁也不记得曾存在。）' },
    no: { l: '不给', fx: { mem: 3, bond: -4, san: 2 }, re: '（她把罐子抱回怀里。）废物。我早知道。' },
  },

  // ============================================================ 菲茵特
  {
    id: 'fai-hunger', who: 'faint', act: 1,
    say: '我饿。……不是饭。请把我关起来，关到明天早上就好。拜托，别问为什么。',
    yes: { l: '关起来', fx: { san: 4, bond: 5, core: -3 }, re: '（门开的时候她睡着了。墙上有抓痕，抓痕是朝内的。）' },
    no: { l: '不关', fx: { tide: 4, bond: -4, mem: -3 }, re: '（她鞠了一躬。）谢谢……我会忍住的。真的。' },
  },
  {
    id: 'fai-plant', who: 'faint', act: 2,
    say: '窗台上那盆花是我种的。它每天都在长大，长得比我快。……要拔掉吗？',
    yes: { l: '拔掉', fx: { mem: -4, san: 3, core: 2 }, re: '（拔的时候，根须里有一截像手指的东西，很快就缩回去了。）' },
    no: { l: '留着', fx: { tide: 5, bond: 3, mem: -2 }, re: '（第二天它爬到隔壁窗台。第三天，那一层楼都在开花。）' },
  },

  // ============================================================ 法洛思
  {
    id: 'far-lamp', who: 'faros', act: 1,
    say: '灯塔该点起来了。烧的是银芯，一夜三枚。点吗？——我知道这笔账不好看。',
    yes: { l: '点灯', fx: { core: -7, tide: -5, bond: 4 }, re: '（灯亮了一夜。海上的东西退了三里，回来时排得更整齐。）' },
    no: { l: '不点', fx: { tide: 6, core: 3, san: -3 }, re: '（她替你看着窗户。整夜没有眨眼。）那今晚就靠你的眼睛了。' },
  },
  {
    id: 'far-road', who: 'faros', act: 3,
    say: '我原以为回不去了。现在有个办法——只是要走一段没有人记得的路。让我去吗？',
    yes: { l: '让她走', fx: { mem: -5, bond: 6, tide: 3 }, re: '（她回来时手里拿着一枚很旧的钥匙。）这是我上次回来时留下的。' },
    no: { l: '留下来', fx: { bond: -5, san: 4, core: 2 }, re: '（她把航图折起来，放进抽屉最里面。）好。那我就当个灯塔。' },
  },

  // ============================================================ 戈利亚
  {
    id: 'gol-title', who: 'goliath', act: 1,
    say: '给我一个头衔。「门卫」也行，但得写在文件上，用大字。让人看得见的那种。',
    yes: { l: '给他头衔', fx: { core: -3, bond: 6, mem: 2 }, re: '（新牌子挂在门卫室。他把自己名字刻得比校名还深。）' },
    no: { l: '不给', fx: { bond: -6, san: 3, core: 2 }, re: '（他哼了一声。）不需要文件。历史会写我的名字，你的名字就免了。' },
  },
  {
    id: 'gol-wall', who: 'goliath', act: 2,
    say: '校门那面墙我看不顺眼。让我拆了，三天垒一道新的，比它结实十倍。',
    yes: { l: '让他拆', fx: { core: -6, tide: 4, bond: 4 }, re: '（新墙确实结实。旧墙的砖缝里有东西，他没提。）' },
    no: { l: '不许动', fx: { bond: -5, core: 3, san: 3 }, re: '（他把手从墙上收回来。）随你。反正墙倒了不是我的错。' },
  },

  // ============================================================ 哈姆林
  {
    id: 'ham-rats', who: 'hameln', act: 1,
    say: '老鼠又多了。我可以把它们带走，一个不剩。报酬照旧——按人头算。',
    yes: { l: '请他吹笛', fx: { mem: -4, tide: -5, core: -3 }, re: '（那晚全镇的狗都不叫。第二天操场很干净，干净得没有一只蚂蚁。）' },
    no: { l: '不用', fx: { tide: 5, bond: 3, core: 2 }, re: '那我就只吹一小段。（他吹了三个音。厨房的鼠笼全空了。）' },
  },
  {
    id: 'ham-concert', who: 'hameln', act: 2,
    say: '让我开一场音乐会。票价你定，我只要求一件事：不许中途离场。',
    yes: { l: '准他办', fx: { bond: 6, core: 4, tide: 3 }, re: '（掌声持续了很久。散场时，有三个人跟着他走了。）' },
    no: { l: '不办', fx: { bond: -4, mem: 3, san: 2 }, re: '（他把指挥棒收进袖子。）可惜。我的曲子会自己长出来。' },
  },
  // ============================================================ 莉兹
  {
    id: 'liz-stage', who: 'liz', act: 1,
    say: '校庆的舞台……请让我最后一次站上去。跳完那一支，我就再也不跳了。我已经不配了。',
    yes: { l: '让她跳', fx: { bond: 6, san: -4, mem: 3 }, re: '（她跳完谢了幕。那天之后，那只脚再也抬不起来了。）' },
    no: { l: '不准', fx: { bond: -5, san: 3, core: 2 }, re: '（她抱着裙子在后台坐了一整晚。）看着也算跳。' },
  },
  {
    id: 'liz-ash', who: 'liz', act: 2,
    say: '绿炎烧过的东西不会留下灰。我需要一间空教室，今晚。……您不会问我要做什么吧。',
    yes: { l: '给她教室', fx: { mem: -5, core: 4, tide: -3 }, re: '（第二天教室干干净净，连墙上那句旧标语都没有了。）' },
    no: { l: '不借', fx: { bond: -4, san: 3, mem: 3 }, re: '（她把火收回掌心。）那我去外面烧。反正草地也不记得自己是什么。）' },
  },

  // ============================================================ 茉夏
  {
    id: 'mou-radio', who: 'mouchette', act: 1,
    say: '让我把学校的事播出去吧！雾境电台，全校收听，保证热闹——收视率我负责！',
    yes: { l: '让她播', fx: { bond: 7, mem: -3, tide: 3 }, re: '（广播响了一整晚。第二天有三个人来问能不能转学进来。）' },
    no: { l: '不许播', fx: { bond: -5, san: 3, core: 2 }, re: '（她对着空话筒清了清嗓子。）那我播给雾听。雾里也有观众。' },
  },
  {
    id: 'mou-show', who: 'mouchette', act: 2,
    say: '我要一场真的秀——灯光、舞台、会飞的烟花。我知道预算不够，可我会红的！',
    yes: { l: '批预算', fx: { core: -6, bond: 5, san: -2 }, re: '（烟花烧掉半片操场。她边哭边笑，说这是她第一次被这么多人看见。）' },
    no: { l: '不许放烟花', fx: { bond: -4, core: 3, mem: 2 }, re: '（她把烟花收回箱子里。）好吧，等下次。下次我一定红。）' },
  },

  // ============================================================ 墨菲
  {
    id: 'mup-tea', who: 'murphy-plain', act: 1,
    say: '……食堂的茶太差了。给医疗翼拨点钱买茶叶，我要求不算过分吧？',
    yes: { l: '拨款', fx: { core: -4, bond: 5, san: 2 }, re: '（她煮了一整壶。）哼，勉强能喝。（壶空了。）' },
    no: { l: '不拨', fx: { bond: -5, core: 3, mem: 1 }, re: '（她把杯子推回来。）不喝就不喝。别以为我在乎。）' },
  },
  {
    id: 'mup-saint', who: 'murphy-plain', act: 3,
    say: '他们在教堂里叫我圣女。你怎么看？——说实话，我不生气。',
    yes: { l: '说实话', fx: { mem: 5, bond: 3, san: -2 }, re: '（她沉默了很久，最后把帽檐压低了。）……哦。' },
    no: { l: '不接这句', fx: { bond: -6, san: 3, tide: 3 }, re: '（她转身走了。）不敢说啊。那就算了吧。' },
  },

  // ============================================================ 宁菲亚
  {
    id: 'nym-book', who: 'nymphaea', act: 2,
    say: '图书馆有一本没有编号的书，里面写着这所学校明天会发生的事。要我读给您听吗？',
    yes: { l: '读', fx: { mem: 6, san: -5, tide: 3 }, re: '（她读到第三页停下。）「明天，有一位守密人听完了这本书。」' },
    no: { l: '别读', fx: { san: 3, mem: -2, bond: -3 }, re: '（她把书放回原处。）它总是会自己回到书架上。' },
  },
  {
    id: 'nym-debt', who: 'nymphaea', act: 2,
    say: '这副身体是您给的。我该用什么报答呢？……血可以吗，只要一点点。',
    yes: { l: '收下', fx: { core: -4, bond: 5, tide: 3 }, re: '（她谢过之后，把袖子放下来遮住了手腕。）' },
    no: { l: '不用报答', fx: { bond: -4, san: 4, mem: 2 }, re: '（她低头行礼。）那我只能多读书了。读书也是一种报答。' },
  },

  // ============================================================ 奥吉尔
  {
    id: 'ogi-task', who: 'ogier', act: 1,
    say: '请给我一项真正的任务。巡夜、守门都行——我需要有人每天晚上等我的回报。',
    yes: { l: '给他巡夜', fx: { bond: 5, san: 3, mem: 2 }, re: '（他每天回来报告，一条一条，念得很慢，念到很晚。）' },
    no: { l: '不用了', fx: { bond: -5, san: -2, core: 2 }, re: '（他把手按在胸前。）那我守着门。门不需要回报。' },
  },
  {
    id: 'ogi-challenge', who: 'ogier', act: 2,
    say: '有人在走廊上挑战我，说我背着主人偷东西。请允许我应战。',
    yes: { l: '准他应战', fx: { bond: 4, san: -4, tide: 2 }, re: '（他赢了，然后把剑擦干净，还给了对方。）' },
    no: { l: '不许动手', fx: { bond: -3, san: 4, core: 1 }, re: '（他解下佩剑。）不战。那我便把名字交给校务处查。）' },
  },

  // ============================================================ 拉蒙娜
  {
    id: 'ram-case', who: 'ramona', act: 1,
    say: '三号楼丢了一整间教室。我要立案——请给我调阅近三年的课表。',
    yes: { l: '给她档案', fx: { mem: 5, san: -3, core: -2 }, re: '（三天后她指认出一间「本来不该存在」的教室。它就在你背后。）' },
    no: { l: '不立案', fx: { mem: -3, bond: -4, san: 3 }, re: '（她合上笔记本。）不立案，那我就当目击者。目击者不需要许可。' },
  },
  {
    id: 'ram-me', who: 'ramona', act: 3,
    say: '你是不是也想知道自己是谁？我可以查。……查出来的东西，可能会很难看。',
    yes: { l: '查', fx: { mem: 6, san: -6, tide: 3 }, re: '（第七十三号档案。姓名栏是空的，照片是你。）' },
    no: { l: '不查', fx: { san: 4, mem: -2, bond: 2 }, re: '（她合上卷宗。）聪明。有些答案，知道的人会比不知道的更孤单。）' },
  },

  // ============================================================ 环行·拉蒙娜
  {
    id: 'rar-loop', who: 'ramona-ring', act: 2,
    say: '今天重复了三遍。我把第三遍的报纸带来了——您自己看，日期一样，连墨迹都一样。',
    yes: { l: '收下报纸', fx: { mem: 4, san: -5, tide: 4 }, re: '（你把报纸放进抽屉。抽屉里已经有一摞，一样厚。）' },
    no: { l: '当没看见', fx: { san: 4, mem: -3, bond: 2 }, re: '（她把报纸折起来。）那我就不提了。第四遍也快到了。）' },
  },
  {
    id: 'rar-name', who: 'ramona-ring', act: 3,
    say: '如果您愿意承认我还是拉蒙娜，请继续这么叫我。……不愿意的话，也没关系。',
    yes: { l: '叫她拉蒙娜', fx: { bond: 7, mem: -3 }, re: '（她笑了。笑得和很多年前那个人一模一样。）' },
    no: { l: '换个称呼', fx: { bond: -6, san: 3, mem: 2 }, re: '（她转身。）嗯。那我就当一个环。）' },
  },

  // ============================================================ 萨尔瓦多
  {
    id: 'sal-mass', who: 'salvador', act: 1,
    say: '每周一次弥撒。来的人不需要信，只需要坐下。可以吗？',
    yes: { l: '准他办', fx: { bond: 6, san: 4, tide: 3 }, re: '（第一场坐满了。散场时有人哭着不肯走。）' },
    no: { l: '不准', fx: { bond: -4, core: 3, san: 2 }, re: '（他把圣经合上。）那我在宿舍里点一根蜡烛。一根就好。）' },
  },
  {
    id: 'sal-flesh', who: 'salvador', act: 3,
    say: '我的身体是圣所，也是食物。……请允许我把它切开，分给那些快饿死的人。',
    yes: { l: '允许', fx: { bond: 5, mem: -4, tide: 5 }, re: '（那天的汤很浓。喝过的人都说，从来没有这么饱过。）' },
    no: { l: '不允许', fx: { bond: -5, san: 4, core: 2 }, re: '（他把袖子放下来。）那我把手留着。手还能端汤。）' },
  },

  // ============================================================ 珊
  {
    id: 'sga-pose', who: 'sanga', act: 1,
    say: '请不要这样站着。您的肩膀歪了四度——四度，整整四度。我看着很难受。',
    yes: { l: '站好', fx: { san: 3, bond: 4, mem: 2 }, re: '（她把你摆正，退后三步看了一眼，满意地点头。）' },
    no: { l: '没空', fx: { bond: -4, san: -2, core: 2 }, re: '（她移开视线。）……那我以后不看您了。看着难受。）' },
  },
  {
    id: 'sga-statue', who: 'sanga', act: 2,
    say: '我想给学校雕一座像。谁都可以，只要有人愿意站着不动八个小时。',
    yes: { l: '准她雕', fx: { core: -5, bond: 5, mem: 3 }, re: '（像立在校门口。所有人都说像，可没人说得清像谁。）' },
    no: { l: '不许', fx: { bond: -4, core: 3, san: 2 }, re: '（她低头看自己的手。）那我雕自己的手。这只手不会动。）' },
  },

  // ============================================================ 泰旖丝
  {
    id: 'tha-seed', who: 'thais', act: 2,
    say: '把操场翻了吧。我要种东西——种下去的东西，会替这所学校长出一层皮。',
    yes: { l: '翻操场', fx: { tide: 5, bond: 5, core: -4 }, re: '（操场三天就绿了。草是红的，被踩到会疼。）' },
    no: { l: '不许动土', fx: { bond: -4, core: 3, mem: 2 }, re: '（她摸出一只花盆。）那我种在花盆里。花盆也可以长。）' },
  },
  {
    id: 'tha-merge', who: 'thais', act: 3,
    say: '您呼唤我，是已经做好与我相融的准备了吗？（她笑了）开玩笑的。……不全都是开玩笑。',
    yes: { l: '走近一点', fx: { bond: 6, san: -6, tide: 4 }, re: '（你的手背上长出一小截藤。她看见了，很满意。）' },
    no: { l: '保持距离', fx: { bond: -5, san: 4, mem: 2 }, re: '（她点头。）那我们保持距离。距离也是一种孕育。）' },
  },

  // ============================================================ 汀克特
  {
    id: 'tinc-sing', who: 'tinct', act: 2,
    say: '若有需要献声的场合，请预先告知。……不过，我可以主动申请一次吗？只唱给一个人听。',
    yes: { l: '准她唱', fx: { bond: 5, san: 5, mem: -2 }, re: '（她唱完，那人已经睡着了。她替他盖好被子才走。）' },
    no: { l: '改天', fx: { bond: -3, san: -2, core: 2 }, re: '（她把歌谱合上。）那我等。歌声不会过期。）' },
  },
  {
    id: 'tinc-star', who: 'tinct', act: 3,
    say: '群星的色彩在退。我想用银芯把它们重新染一遍，代价不小。',
    yes: { l: '让她染', fx: { core: -7, mem: 5, tide: -3 }, re: '（那天夜里，天上多了一种没有人记得名字的颜色。）' },
    no: { l: '省着用', fx: { core: 3, mem: -4, san: 2 }, re: '（她抬头看了一眼。）那就让它们淡下去吧。反正没人抬头。）' },
  },
  // ============================================================ 图鲁
  {
    id: 'tul-sleep', who: 'tulu', act: 1,
    say: '余要睡了。把整层楼的灯关掉，谁吵醒余，余就让他永远睡着。',
    yes: { l: '关灯', fx: { core: -4, san: 4, bond: -3 }, re: '（那层楼安静了三天。第四天，学生们学会了不用嘴说话。）' },
    no: { l: '不关', fx: { bond: -5, tide: 4, san: -3 }, re: '（他开始在走廊上唱歌。灯一盏一盏灭。）' },
  },
  {
    id: 'tul-throne', who: 'tulu', act: 2,
    say: '余的御座该搬去礼堂正中了。你若不肯搬，余自己搬。',
    yes: { l: '搬去礼堂', fx: { core: -5, bond: 4, mem: 3 }, re: '（上课时老师站在御座下面，声音不自觉地变小了。）' },
    no: { l: '不许搬', fx: { bond: -6, tide: 5, core: -3 }, re: '（他自己搬了。抬御座的是四个不肯说话的学生。）' },
  },

  // ============================================================ 尤乌哈希
  {
    id: 'uvh-food', who: 'uvhash', act: 2,
    say: '我饿了。给我肉——真的肉。你最好准备足了，不然我可什么都不敢保证。',
    yes: { l: '批肉', fx: { core: -6, tide: 4, bond: 5 }, re: '（肉库空了三天。他吃饱之后很有礼貌地道了谢。）' },
    no: { l: '没有多余的', fx: { bond: -6, tide: 5, san: -3 }, re: '（他把手按在胸口。）那就别怪我了。' },
  },
  {
    id: 'uvh-arena', who: 'uvhash', act: 3,
    say: '把操场改成竞技场吧。我要看看这些孩子里，还有没有人记得怎么站着死。',
    yes: { l: '改竞技场', fx: { tide: 6, bond: 4, san: -4 }, re: '（第一场打了四个小时。赢的那个，也是被抬下去的。）' },
    no: { l: '操场是操场', fx: { bond: -5, san: 4, mem: 3 }, re: '（他把剑插进地里，坐在台阶上。）软弱。' },
  },

  // ============================================================ 旺达
  {
    id: 'wan-floor', who: 'wanda', act: 1,
    say: '这满地的脏污……我的鞋无处安放。让人把整条走廊擦一遍，现在。',
    yes: { l: '让人擦', fx: { core: -3, bond: -2, san: 3 }, re: '（走廊擦得能照出人。她走过去，鞋底一点灰都没沾。）' },
    no: { l: '不擦', fx: { bond: -5, san: -3, core: 2 }, re: '（她伸手。）那你背我过去，凡人。' },
  },
  {
    id: 'wan-party', who: 'wanda', act: 2,
    say: '今晚办一场宴会。所有人都要来——谁不来，我就让他做花肥。',
    yes: { l: '办宴会', fx: { bond: 6, core: -5, tide: 4 }, re: '（宴会开到天亮。花园里多了三座新翻的土堆。）' },
    no: { l: '不办', fx: { bond: -6, san: 4, core: 2 }, re: '（她把酒杯放下。）那就只有我一个人享受了。）' },
  },

  // ============================================================ 温柯尔
  {
    id: 'wnk-run', who: 'winkle', act: 1,
    say: '它在找我。它一直在我后面——让我离开学校，现在，马上。',
    yes: { l: '让她走', fx: { mem: -4, san: 3, bond: 3 }, re: '（她跑了。第二天又站在校门口，说不知道要去哪。）' },
    no: { l: '不许离校', fx: { bond: -4, san: -3, tide: 3 }, re: '（她回头看了一眼走廊尽头。）那它就会找到这里。）' },
  },
  {
    id: 'wnk-lock', who: 'winkle', act: 2,
    say: '我今天想留下来。就今天。……能不能把门锁上？这样我就没有别的选择了。',
    yes: { l: '把门锁上', fx: { bond: 5, san: 4, core: -2 }, re: '（她坐在门边，抱膝坐了一夜。第二天她说谢谢。）' },
    no: { l: '门不上锁', fx: { bond: -5, san: -2, tide: 3 }, re: '（她点点头。）那我就继续走。走到它累了为止。）' },
  },

  // ============================================================ 莫丝
  {
    id: 'vor-fish', who: 'vortice', act: 1,
    say: '莫丝！饿了！食堂的鱼！全部！',
    yes: { l: '全给她', fx: { core: -4, bond: 5, san: 2 }, re: '（她一个人吃了三十七条鱼，然后很有礼貌地鞠了躬。）' },
    no: { l: '只给一半', fx: { bond: -4, core: 3, san: -2 }, re: '（她啃了桌子的一角。）莫丝，不高兴。）' },
  },
  {
    id: 'vor-smash', who: 'vortice', act: 2,
    say: '莫丝！帮忙！打坏东西！',
    yes: { l: '让她砸', fx: { bond: 4, tide: 4, core: 3 }, re: '（她要砸的是一堵墙。墙倒了，后面是一条没有登记过的走廊。）' },
    no: { l: '不许砸', fx: { bond: -3, san: 4, mem: 2 }, re: '（她把拳头收回去，很委屈。）莫丝，乖。）' },
  },

  // ============================================================ 阿拉克涅
  {
    id: 'ara-thread', who: 'arachne', act: 2,
    say: '命运的丝线已经垂下。要我把你的那一根，指给你看吗？',
    yes: { l: '指给我看', fx: { mem: 5, san: -6, tide: 3 }, re: '（她指向你身后。那里有一根很细的线，另一头在你手里。）' },
    no: { l: '不必', fx: { san: 4, bond: 2, mem: -3 }, re: '（她收回手。）明智。看过自己那根线的人，都想剪断它。）' },
  },
  {
    id: 'ara-play', who: 'arachne', act: 3,
    say: '让我在校庆上演一场戏。演员是这些学生，剧本已经写好了——是他们自己的一生。',
    yes: { l: '让她演', fx: { bond: 5, mem: -5, tide: 5 }, re: '（演到第三幕，有个学生站起来，说这段他不想演。）' },
    no: { l: '不演', fx: { bond: -5, san: 4, mem: 2 }, re: '（她把剧本收进袖子。）那我先收着。反正迟早要演。）' },
  },

  // ============================================================ 沙耶
  {
    id: 'sya-word', who: 'saya', act: 1,
    say: '你好。……这样说对吗？（她看着你）我想学更多词。可以教我吗？',
    yes: { l: '教她说话', fx: { bond: 7, mem: 2, san: -2 }, re: '（她学会了「谢谢」「对不起」「再见」。她最喜欢「再见」。）' },
    no: { l: '没空', fx: { bond: -5, san: 3, core: 2 }, re: '（她不说话了。过了一会儿，她用别人的声音又说了一遍「你好」。）' },
  },
  {
    id: 'sya-dream', who: 'saya', act: 2,
    say: '我做了一个梦。梦里我在吃——不是吃东西。（她停下来）我是不是坏掉了？',
    yes: { l: '告诉她没有', fx: { san: 4, bond: 5, mem: -3 }, re: '（她哭着道了歉。她还不明白自己为什么要道歉。）' },
    no: { l: '说这不算梦', fx: { tide: 5, bond: -4, san: -3 }, re: '（她笑了，笑得很好看。）那就不算梦。）' },
  },

  // ============================================================ 庞托斯
  {
    id: 'pon-pray', who: 'pontos', act: 2,
    say: '向我祈祷吧，小朋友。最古老的海水会告诉你我的名字——以及代价。',
    yes: { l: '祈祷', fx: { tide: 5, core: 6, san: -5 }, re: '（那一夜钟楼自己响了十三下。第二天账上多了一笔没人认领的银芯。）' },
    no: { l: '不祈祷', fx: { san: 4, mem: 3, tide: -3 }, re: '（他的眼睛弯了一下。）聪明的小朋友。名字知道了就要还。）' },
  },
  {
    id: 'pon-gift', who: 'pontos', act: 3,
    say: '把尸体扔进海里，那不算礼物。（他很慢地笑了一下）我要活的东西。',
    yes: { l: '给他', fx: { tide: 7, bond: -5, mem: -4 }, re: '（第二天海面很平静。平静得像有人替你把话说完了。）' },
    no: { l: '拒绝', fx: { bond: -6, san: 5, core: 2 }, re: '（他退回水里。水面连一圈波纹都没有。）小气。' },
  },

  // ============================================================ 蚀灭·萝坦
  {
    id: 'loe-prove', who: 'lotan-etched', act: 2,
    say: '向我证明，你凭什么站在我面前。用你全部的力气——或者全部的懦弱。',
    yes: { l: '动手', fx: { san: -7, bond: 8, tide: 4 }, re: '（她把你打倒在地，然后伸手把你拉了起来。）够了。' },
    no: { l: '不出手', fx: { bond: -6, san: 5, mem: 2 }, re: '（她收回手。）懦弱也是一种答案。我不喜欢这个答案。）' },
  },
  {
    id: 'loe-whale', who: 'lotan-etched', act: 3,
    say: '鲸落要来了。到时候整片海有一年不再说话。你要提前把学校的灯关掉吗？',
    yes: { l: '关灯', fx: { core: -7, tide: -6, mem: 4 }, re: '（黑潮退了很远，远到能看见墙外的地面。那地面是骨头做的。）' },
    no: { l: '亮着', fx: { tide: 8, mem: -5, san: -3 }, re: '（那一夜，所有人都听见了很长、很低的一声。）那就听着。）' },
  },

  // ============================================================ 卡拉布
  {
    id: 'car-fee', who: 'caraboo', act: 1,
    say: '守密人，仙女的赐福分三档。您想要哪一档？最贵的那种可以保佑一整个学期哦。',
    yes: { l: '买最贵的', fx: { core: -7, bond: 5, tide: 3 }, re: '（她收了银芯，笑得很甜。三天后屏障上真的多了一层白光。）' },
    no: { l: '不买', fx: { bond: -4, core: 3, san: 2 }, re: '（她叹口气。）哎——真是虔诚又吝啬的小羊羔呢。）' },
  },
  {
    id: 'car-snow', who: 'caraboo', act: 2,
    say: '把想割舍的东西都埋进雪里吧。埋下去的东西，明年会自己长出来。',
    yes: { l: '埋', fx: { mem: -6, tide: 4, bond: 4 }, re: '（你埋了一份名单。第二年春天雪化了，名单上多了两个名字。）' },
    no: { l: '不埋', fx: { san: 4, mem: 3, core: 2 }, re: '（她把手在围巾上擦了擦。）埋一点也好啊。留着多累。）' },
  },

  // ============================================================ 负誓·奥吉尔
  {
    id: 'ogo-order', who: 'ogier-oath', act: 2,
    say: '请下令吧——倘若您尚且信任我的话。我什么都会做，只是别让我守着谁。',
    yes: { l: '让他上墙', fx: { bond: 4, san: -3, tide: 3 }, re: '（他去了黑潮边上，一个人回来了。剑上多了一道他不肯解释的缺口。）' },
    no: { l: '让他守人', fx: { bond: -5, san: 4, core: 2 }, re: '（他低下头。）谢谢您没有让我去。……这话说出来，我自己都觉得可耻。）' },
  },
  {
    id: 'ogo-name', who: 'ogier-oath', act: 3,
    say: '荣誉、正义、忠诚，皆死于我手中。要我把名字重新刻在碑上吗？还是就让它空着。',
    yes: { l: '刻上去', fx: { mem: 5, core: -4, bond: 4 }, re: '（碑上刻了两个字。第二天早上字被擦掉了，只剩刻痕。）' },
    no: { l: '让它空着', fx: { bond: -4, san: 3, mem: 2 }, re: '（他行了个礼。）空着好。空着谁都冒充不了。）' },
  },
  // ============================================================ 薇薇安
  {
    id: 'viv-sleep', who: 'vivian', act: 1,
    say: '呜……还想睡。把上午的课都取消吧，反正也听不进去。（她打了个哈欠，帽子里有东西在动）',
    yes: { l: '取消上午', fx: { san: 4, bond: 3, mem: -2 }, re: '（她睡到中午。醒来第一句是「我梦见一顶帽子在教我怎么当公主」。）' },
    no: { l: '照常上课', fx: { bond: -4, san: -2, core: 2 }, re: '（她在教室睡了一整节课，还打呼。）' },
  },
  {
    id: 'viv-know', who: 'vivian', act: 2,
    say: '我可以告诉你很多知识……你总不希望自己还不如一顶帽子知道得多吧？',
    yes: { l: '请她讲', fx: { mem: 6, san: -4, tide: 2 }, re: '（她讲了一个小时。她讲的东西，第二天你在档案里找到了。）' },
    no: { l: '改天', fx: { bond: -3, san: 3, core: 2 }, re: '（她把帽子摘下来抱在怀里。）好吧。帽子也不着急。）' },
  },

  // ============================================================ 萨摩不耶
  {
    id: 'ups-beat', who: 'up-samo', act: 1,
    say: '同学，我给你打个拍子吧。心跳、呼吸、跑操——什么都得踩点。踩不上就乱。',
    yes: { l: '让他打拍', fx: { bond: 5, san: 4, core: -2 }, re: '（全年级跑操踩上了同一个点。操场的脚步声整齐得让人发毛。）' },
    no: { l: '各走各的', fx: { bond: -4, san: -2, mem: 3 }, re: '（他打了个响指。一半人的脚步声错开了。）' },
  },
  {
    id: 'ups-guide', who: 'up-samo', act: 2,
    say: '我看过你们的账了。这学校的练度不行——要不要我写份攻略？包教包会，就是有点毒舌。',
    yes: { l: '让他写', fx: { mem: 4, bond: 4, san: -2 }, re: '（攻略贴出去三天被抄了七份，题目都改成了《弥萨格生存指南》。）' },
    no: { l: '不用', fx: { bond: -3, core: 3, san: 2 }, re: '（他把手插回兜里。）那你们继续自己试。我看着。）' },
  },

  // ============================================================ 梦依流苏
  {
    id: 'upm-plan', who: 'up-myls', act: 2,
    say: '给我一张地图和三个人。我能把那条路走一遍，走完告诉你哪一步会死人。',
    yes: { l: '给他人和图', fx: { mem: 5, core: -3, san: -3 }, re: '（他走了三天，回来第一句是：「第四步会死人。我换了一条。」）' },
    no: { l: '不用探', fx: { bond: -4, san: 3, core: 2 }, re: '（他把地图折起来。）那就不走了。反正你们也不缺人。）' },
  },
  {
    id: 'upm-watch', who: 'up-myls', act: 1,
    say: '我不做梦。所以夜里我替别人守夜——反正我也睡不着。',
    yes: { l: '让他守夜', fx: { bond: 6, san: 3, core: -2 }, re: '（那一夜没有人做噩梦。第二天有学生说，走廊上有人一直在数门牌。）' },
    no: { l: '不必', fx: { san: -3, bond: -3, tide: 3 }, re: '（他躺下就睡着了。）那晚有四个人梦到了同一片海。）' },
  },

  // ============================================================ 爱丽丝
  {
    id: 'upa-hole', who: 'up-alice', act: 2,
    say: '学校下面有个洞。真的，我掉进去过。要带路吗？掉进去大概要三天。',
    yes: { l: '让他带路', fx: { mem: 6, san: -5, tide: 4 }, re: '（洞底是一间教室。黑板上写着「欢迎回来」。）' },
    no: { l: '不去了', fx: { san: 4, mem: -2, bond: -3 }, re: '（他耸耸肩。）胆小鬼。那我自己再去一次。）' },
  },
  {
    id: 'upa-watch', who: 'up-alice', act: 3,
    say: '给我一只表。我不需要准确的时间，我需要一只会走慢的表。',
    yes: { l: '给他表', fx: { core: -3, mem: 4, san: 2 }, re: '（他把表调慢了十分钟。那十分钟里，走廊上少了一个人。）' },
    no: { l: '不给', fx: { san: 3, bond: -3, core: 2 }, re: '（他把手缩回袖子里。）算了。反正时间也不太准。）' },
  },

  // ============================================================ 鼠王
  {
    id: 'upr-nest', who: 'up-ratking', act: 2,
    say: '宿舍墙里有老鼠，很多。要我把它们赶走？还是留下来当耳目？',
    yes: { l: '留下来', fx: { core: 3, bond: -4, tide: 3 }, re: '（从那以后墙里的动静都被记下来了。记在哪里，只有他知道。）' },
    no: { l: '赶走', fx: { bond: 4, san: -3, mem: 2 }, re: '（第二天墙洞里塞满了纸条。纸条上写的都是你的名字。）' },
  },
  {
    id: 'upr-count', who: 'up-ratking', act: 3,
    say: '我能数清这所学校有多少活物。要听吗？……你确定？',
    yes: { l: '说', fx: { san: -5, mem: 5, tide: 3 }, re: '（他说了一个数，比名册上多 61。他笑了：「名册不准。」）' },
    no: { l: '不用说', fx: { san: 4, mem: 2, bond: -2 }, re: '（他闭了闭眼。）聪明。有些数字听过之后会跟着你。）' },
  },

  // ============================================================ 魔龙_D
  {
    id: 'upd-plan', who: 'up-dragond', act: 2,
    say: '你这里的问题我一眼看完了：不是缺银芯，是配错人。把人交给我，我重排一遍。',
    yes: { l: '让他重排', fx: { core: 5, bond: -4, san: -2 }, re: '（新排班表贴出去，效率上去了，走廊上说话的声音少了。）' },
    no: { l: '不动排班', fx: { bond: 4, san: 2, core: -3 }, re: '（他把笔放下。）行。那你就继续用你那套。我不劝。）' },
  },
  {
    id: 'upd-scale', who: 'up-dragond', act: 3,
    say: '别碰我颈后那块。……我说了别碰。抱歉，是逆鳞。',
    yes: { l: '先问他', fx: { bond: 6, san: 3 }, re: '（他愣了一下，把手放下。）你是第一个先问的人。）' },
    no: { l: '直接上手', fx: { bond: -6, tide: 3, san: -3 }, re: '（他手背裂开一道缝，缝里是鳞。他转身走了，一句话没说。）' },
  },

  // ============================================================ 立誓0氪
  {
    id: 'upz-budget', who: 'up-zerok', act: 1,
    say: '我算过了，你们这个月能省 37%。要听方案吗？虽然有点难看。',
    yes: { l: '听方案', fx: { core: 7, bond: -5, mem: 2 }, re: '（方案执行后食堂的汤清了。没人抱怨——抱怨也要花力气。）' },
    no: { l: '不省', fx: { bond: 5, core: -3, san: 2 }, re: '（他把算盘收进包里。）那就不省。反正钱也不是我的。）' },
  },
  {
    id: 'upz-guide', who: 'up-zerok', act: 2,
    say: '我给新生写了份开荒攻略。第一条：别抽。第二条：还是别抽。',
    yes: { l: '发给新生', fx: { bond: 5, mem: 3, san: -2 }, re: '（新生照着做了，第一学期没人退学。有几个说活得像苦行僧。）' },
    no: { l: '收起来', fx: { bond: -4, core: 4, san: 2 }, re: '（他把纸揉了。）那你们抽吧。反正抽完会来找我。）' },
  },

  // ============================================================ 夏茉琳
  {
    id: 'upmo-flower', who: 'up-moreen', act: 1,
    say: '温室荒了很久。让我去种花吧，种出来的花能让人心情好——也能卖出好价钱。',
    yes: { l: '批温室', fx: { core: 4, bond: 5, san: 3 }, re: '（花开了满温室。来买花的人比来上课的多。）' },
    no: { l: '温室不开放', fx: { bond: -4, core: 2, mem: 2 }, re: '（他笑了一下。）那我种在心里。心里不用交租金。）' },
  },
  {
    id: 'upmo-walk', who: 'up-moreen', act: 2,
    say: '我去雾里走一圈，看看能不能捡点东西回来。捡到什么都不奇怪。',
    yes: { l: '让他去', fx: { mem: 3, core: 5, tide: 4 }, re: '（他捡回来一枚银芯，上面的校徽是六十年前的。）' },
    no: { l: '太危险', fx: { san: 3, bond: -3, core: 2 }, re: '（他把外套挂回衣架上。）那就不去。雾里也不缺我一个。）' },
  },

  // ============================================================ 朝星
  {
    id: 'upc-dawn', who: 'up-chaoxing', act: 1,
    say: '天要亮了。让我把校钟敲一次真的——这学校的钟，从来没对过一次。',
    yes: { l: '准他敲', fx: { mem: 4, bond: 5, san: 3 }, re: '（钟声一响，所有人同时抬头看了一眼窗外。那天的日出很慢。）' },
    no: { l: '不许敲', fx: { san: 3, mem: -3, bond: -3 }, re: '（他把手从钟绳上松开。）不敲也行。反正你们习惯假的时间了。）' },
  },
  {
    id: 'upc-wild', who: 'up-chaoxing', act: 3,
    say: '有句话我一直没说：神赐予野性，人得了愚昧。你要哪一个？',
    yes: { l: '要野性', fx: { bond: 4, san: -5, tide: 3 }, re: '（他脱了外衣走到黑潮边上站了一会儿，回来时眼睛亮得吓人。）' },
    no: { l: '都不要', fx: { san: 4, mem: 3, bond: -3 }, re: '（他把拳头松开。）那就都别要。我改天再来问。）' },
  },

  // ============================================================ 路过的耄耋
  {
    id: 'upm2-road', who: 'up-maodie', act: 1,
    say: '小同志，让我每天在走廊上遛个弯。谁挡路我就敲一下——不重，就一下。',
    yes: { l: '准他遛弯', fx: { bond: 5, san: 4, core: -2 }, re: '（走廊通畅了不少。被敲过的那三个学生，走路都绕着他。）' },
    no: { l: '走廊要通行', fx: { bond: -4, san: -3, core: 3 }, re: '（他把拐杖撑起来。）那我不遛了。我坐这儿。）' },
  },
  {
    id: 'upm2-blind', who: 'up-maodie', act: 2,
    say: '我什么都没看见。（他用拐杖指了指地下三层）那门开着，我也没看见。',
    yes: { l: '就当没开', fx: { san: 5, mem: -3, core: 2 }, re: '（他把拐杖挪开，让开了路。门还开着，但声音小了一半。）' },
    no: { l: '请您去看一眼', fx: { bond: 4, tide: -4, san: -3 }, re: '（他往下走，走了很久都没回来。第二天早上他坐在原位，什么都没说。）' },
  },
  // ============================================================ 白云出岫
  {
    id: 'upb-one', who: 'up-baiyun', act: 1,
    say: '把最麻烦的那件事交给我。我不打算拖三轮——给我一套最快的人手，一次办完。',
    yes: { l: '让他一次办完', fx: { core: 5, bond: 4, san: -3 }, re: '（他点名单，念到「詹金」时停了一下：「这个先上。」）' },
    no: { l: '还是按流程走', fx: { bond: -4, san: 3, mem: 2 }, re: '（他把名单折起来。）流程我懂。只是流程从来不是最快的那条路。）' },
  },
  {
    id: 'upb-tide', who: 'up-baiyun', act: 2,
    say: '潮汐表借我两天。我在算一件事：这学校还能撑几个回合。',
    yes: { l: '借给他', fx: { mem: 5, san: -3, tide: 2 }, re: '（他算完只报了两个数字：还剩几天，以及撑过去要多少银芯。第二个数字没人想听。）' },
    no: { l: '不借', fx: { san: 3, bond: -3, core: 2 }, re: '（他把笔搁下。）行。反正我已经算过一遍，不借也在我脑子里。）' },
  },

  // ============================================================ 新增公文
  {
    id: 'sys-library', who: 'library', act: 0,
    say: '借阅登记上有一本书，借出去七十年了。借书人那一栏，写的是「本校全体学生」。',
    yes: { l: '收回', fx: { mem: 5, bond: -3, san: -2 }, re: '（书回来了，封面是空白的。翻开第一页，字正在一个个写上去。）' },
    no: { l: '续借', fx: { mem: -3, tide: 4, bond: 4 }, re: '（续借三十年。登记员盖了章，手一直在抖。）' },
  },
  {
    id: 'sys-gate', who: 'gate', act: 1,
    say: '校门外站着一个自称是学生家长的人。名册上没有一个学生姓这个姓。',
    yes: { l: '放他进来', fx: { bond: 5, tide: 5, san: -4 }, re: '（他在宿舍走了一圈，准确叫出了每个人的名字，包括已经不在了的。）' },
    no: { l: '请他回去', fx: { san: 4, mem: 3, bond: -4 }, re: '（他站到天黑才走。走之后，门口的登记本自己翻了一页。）' },
  },
  {
    id: 'sys-radio', who: 'radio', act: 1,
    say: '午间广播没人点歌。点歌单上只有一行字：请播放安静。',
    yes: { l: '放安静', fx: { san: 3, bond: -3, mem: 3 }, re: '（那三分钟里广播里只有呼吸声。全校都听完了。）' },
    no: { l: '照常放歌', fx: { bond: 5, tide: 3, san: -3 }, re: '（歌放到一半，全校的喇叭同时换了一首没人点过的歌。）' },
  },
  {
    id: 'sys-boiler', who: 'boiler', act: 2,
    say: '锅炉房这个月爆了三块压力表。新换的两块，指针都停在同一个刻度过不去。',
    yes: { l: '全面检修', fx: { core: -6, san: 4, tide: -3 }, re: '（修好之后水是热的。洗澡的人说，热水里有股铁味。）' },
    no: { l: '凑合用', fx: { core: 4, tide: 5, san: -3 }, re: '（第三天管道里传出敲击声，很有节奏，像在回应什么。）' },
  },
  {
    id: 'sys-laundry', who: 'laundry', act: 1,
    say: '洗衣房多了一件校服，尺码是给一个身高九尺的学生做的。我们学校没有这样的学生。',
    yes: { l: '收进库房', fx: { core: -2, mem: 4, san: 2 }, re: '（库房第四排一直空着。这件衣服挂上去，刚好。）' },
    no: { l: '扔掉', fx: { mem: -4, tide: 4, san: -2 }, re: '（第二天它又出现在晾衣绳上，还在滴水。）' },
  },
  {
    id: 'sys-registry', who: 'registry', act: 2,
    say: '这个月户籍上多了两个人，少了三个。没有人报过转学，也没有人办过入学。',
    yes: { l: '查清楚', fx: { mem: 6, san: -5, core: -3 }, re: '（多出来那两个人的名字，写在一份你自己的入职表上。）' },
    no: { l: '算了', fx: { mem: -5, tide: 4, bond: 3 }, re: '（户籍员把笔放下了。名册上的人数，从此每天都比实际少一个。）' },
  },
  {
    id: 'sys-choir', who: 'choir', act: 2,
    say: '唱诗班想在葬礼上多唱一段。那段词不在任何一本圣歌集里。',
    yes: { l: '准他们唱', fx: { mem: -4, bond: 6, tide: 4 }, re: '（葬礼那天没人哭。散场后家属说，听见死者在跟着哼。）' },
    no: { l: '只唱旧的', fx: { bond: -4, san: 4, mem: 2 }, re: '（旧词唱到一半，所有人都忘了下一句。）' },
  },
  {
    id: 'sys-roof', who: 'roof', act: 3,
    say: '天台围栏昨晚被拆了一段。监控里没有人上去，只有一段围栏自己往外走。',
    yes: { l: '焊回去', fx: { core: -5, san: 4, tide: -3 }, re: '（焊好了。焊工说他数了三遍，围栏比原来多了一段。）' },
    no: { l: '不管它', fx: { tide: 6, mem: -3, san: -3 }, re: '（那一层楼的人开始做同一个梦：站在楼顶往下看，下面是学校。）' },
  },
  {
    id: 'sys-postbox', who: 'postbox', act: 2,
    say: '信箱里有一封给「下一任守密人」的信，投递日期是明年。',
    yes: { l: '拆开看', fx: { mem: 6, san: -4, tide: 3 }, re: '（信里只有一句：别相信户籍室。字迹是你的。）' },
    no: { l: '封存', fx: { san: 4, mem: -3, core: 2 }, re: '（信进了封存柜。第二天柜子是空的，信躺在你抽屉里。）' },
  },
  {
    id: 'sys-exam', who: 'exam', act: 3,
    say: '补考名单上有十一个名字。其中三个，是这学期从来没露过面的学生。',
    yes: { l: '让他们考', fx: { mem: 4, bond: -3, tide: 4 }, re: '（三个人都考了满分。卷子上写的答案是：这所学校。）' },
    no: { l: '划掉名字', fx: { san: 4, bond: 3, mem: -4 }, re: '（划掉之后，名单上又自己冒出两个名字。）' },
  },
  // ============================================================ 莉莉
  {
    id: 'lily-order', who: 'lily', act: 1,
    say: '（她站在门口不动，手里攥着一张纸条。纸条上写着：请给我一个命令。）',
    yes: { l: '让她去吃饭', fx: { bond: 6, san: -3, mem: 2 }, re: '（她吃了三个小时，一粒不剩。）' },
    no: { l: '不用做什么', fx: { bond: -5, san: 3, core: 2 }, re: '（她继续站着。第二天早上她还站在那儿，纸条被捏湿了。）' },
  },
  {
    id: 'lily-name', who: 'lily', act: 2,
    say: '（她在纸上写：我没有名字。他们都叫我「那个孩子」。）',
    yes: { l: '写给她名字', fx: { mem: 6, bond: 4, san: -2 }, re: '（你把「莉莉」写在纸上。她看了很久，把纸折好放进了兜里。）' },
    no: { l: '名字以后再说', fx: { bond: -4, mem: -3, san: 3 }, re: '（她把纸揉了。第二天纸上又出现几个字：那我不要名字了。）' },
  },

  // ============================================================ v1.2 每人再一条：各自的一件小事
  {
    id: '24-sign', who: '24', act: 2,
    say: '（桌上摆着两份签呈，字迹不一样。）一份是我写的。另一份……我没写过。',
    yes: { l: '两份都批', fx: { mem: 3, san: -6, bond: -3 }, re: '（当天夜里，两个人在不同楼层说了同一句话。）' },
    no: { l: '只批一份', fx: { mem: -3, san: 3, bond: 4 }, re: '……你说得对。一个人只需要一份档案。' },
  },
  {
    id: 'cat-bigpot', who: 'catigula', act: 2,
    say: '食堂那口锅太小了。给我铸一口能装下全校的——我想让所有人吃同一锅汤。',
    yes: { l: '铸锅', fx: { bond: 9, core: -7, mem: 2 }, re: '好！一个锅里的，就是一家人！' },
    no: { l: '太贵了', fx: { bond: -4, core: 3 }, re: '小气。那我分三锅煮，味道一样。' },
  },
  {
    id: 'lot-judge', who: 'lotan', act: 2,
    say: '今晚地下有场架。你当裁判，不许偏。评完我给你一个分数——评你自己。',
    yes: { l: '去当裁判', fx: { bond: 4, core: -3, san: -3, mem: 2 }, re: '你判得不算差。至于你自己——五分。满分十分。' },
    no: { l: '不去', fx: { bond: -5, san: 3 }, re: '不当裁判，就是怕看见自己几分。' },
  },
  {
    id: 'pan-dream', who: 'pandia', act: 2,
    say: '我今晚可以替全校做梦。一个人一个，不重样。要做吗？',
    yes: { l: '让她做', fx: { san: -6, bond: 6, mem: -2 }, re: '（第二天早上，有十七个人说自己梦见同一片海。）' },
    no: { l: '算了', fx: { san: 4, bond: -3 }, re: '那我自己做。反正也没人愿意要。' },
  },
  {
    id: 'kar-leftover', who: 'karen', act: 2,
    say: '孩子们把菜倒了。让我立条规矩：剩一口，第二天就吃那一口。',
    yes: { l: '立规矩', fx: { core: 5, bond: -6, mem: 2 }, re: '（第二天，盘子干净得能照出人影。）' },
    no: { l: '别太严', fx: { bond: 4, core: -3 }, re: '那就继续倒。反正汤是我熬的。' },
  },
  {
    id: 'taw-motto', who: 'tawil', act: 3,
    say: '校训该改了。「记住彼此」四个字，现在听着像句讽刺。你想换成什么？',
    yes: { l: '改成「别忘」', fx: { mem: 6, bond: 3, core: -2 }, re: '短一点，好记一点。人只记得住短的东西。' },
    no: { l: '保留原文', fx: { mem: -4, san: 3 }, re: '留着也好。至少它还是原来那句话。' },
  },
  {
    id: 'alv-patrol', who: 'alva', act: 1,
    say: '让我从学生里挑二十个，组纠察队。规矩我来定，错我来担。',
    yes: { l: '组队', fx: { core: -4, san: 4, bond: -4, tide: -3 }, re: '三个月。要是他们学会的不是守规矩、是听话，我自己解散。' },
    no: { l: '不必', fx: { bond: 3, san: -3 }, re: '那我一个人巡。反正我不用睡。' },
  },
  {
    id: 'agr-class', who: 'agrippa', act: 2,
    say: '给我一间教室，我教他们怎么挨打不倒。课本不用——用我。',
    yes: { l: '开课', fx: { bond: 5, san: -4, mem: 2, core: -3 }, re: '（第一节课，她站着让三十个人轮流打。）' },
    no: { l: '不设这门课', fx: { bond: -4, mem: 3 }, re: '不教也好。教会了，他们就敢自己走进黑潮。' },
  },
  {
    id: 'dor-bread', who: 'doresain', act: 2,
    say: '让我烤一炉面包，分给全校。每个人咬一口，就都知道彼此是什么味道。',
    yes: { l: '烤', fx: { bond: 8, san: -5, core: -4 }, re: '（面包很软。有人咬了一口就哭了。）' },
    no: { l: '不必', fx: { bond: -4, san: 3 }, re: '不吃也好。知道了味道，就不好分开了。' },
  },
  {
    id: 'cat-chainwall', who: 'catena', act: 3,
    say: '用我的链子把走廊串起来。夜里有什么过来，先碰到的不会是人。',
    yes: { l: '准她布链', fx: { tide: -5, san: -4, bond: 4, core: -2 }, re: '（链子响了一整夜。早上收回来时，上面有咬痕。）' },
    no: { l: '不用', fx: { bond: -4, mem: 2 }, re: '那你夜里别出门。' },
  },
  {
    id: 'pic-63', who: 'pickman', act: 3,
    say: '我想画一个人。他不在名册上，可我每天都能看见他坐在最后一排。',
    yes: { l: '让他画', fx: { mem: -6, san: -4, tide: 3, bond: 2 }, re: '（画完了。第二天，最后一排多了一张桌子。）' },
    no: { l: '不许画', fx: { mem: 4, san: 2 }, re: '不画就不存在。这道理我懂。' },
  },
  {
    id: 'lei-fridge', who: 'leigh', act: 2,
    say: '给我一台冰箱，上锁，只有我有钥匙。里面放什么，你别问。',
    yes: { l: '给她', fx: { bond: 3, san: 5, mem: -3 }, re: '谢谢。我会自己管好的。（她说这话时没看你。）' },
    no: { l: '不行', fx: { bond: -5, san: -3, mem: 2 }, re: '那我把它们放在床底下。' },
  },
  {
    id: 'hel-forge', who: 'helot', act: 1,
    say: '我的刀钝了。工坊能不能开一夜？我只用一夜。',
    yes: { l: '开一夜', fx: { core: -4, san: 3, bond: 3 }, re: '（第二天早上，刀口薄得能切开雾。）' },
    no: { l: '明天再说', fx: { bond: -3, mem: 2 }, re: '钝的也能用。慢一点而已。' },
  },
  {
    id: 'sor-lamp', who: 'sorel', act: 2,
    say: '我可以把火装进灯里，一盏能烧三个月。给宿舍挂满，冬天就不冷了。',
    yes: { l: '挂灯', fx: { core: -5, bond: 6, san: 3 }, re: '（灯挂上了。有人半夜起来，就为了看它还在亮。）' },
    no: { l: '太费银芯', fx: { core: 3, bond: -4 }, re: '那就冷着。冷一点，人清醒。' },
  },
  {
    id: 'xu-exam', who: 'xu', act: 2,
    say: '该给全员做一次体检了。结果我建议公开——谁快不行了，大家该知道。',
    yes: { l: '公开结果', fx: { mem: 5, bond: -5, san: 4 }, re: '（名单贴上公告栏。当天有十一个人没来上课。）' },
    no: { l: '只报给我', fx: { bond: 4, mem: -3 }, re: '不公开也行。那我一个个去敲门。' },
  },
  {
    id: 'aur-pet', who: 'aurita', act: 2,
    say: '我捞到一个东西，会跟着我走。能养在宿舍吗？它很乖，只吃银芯。',
    yes: { l: '让她养', fx: { bond: 4, core: -6, tide: 4 }, re: '太谢谢了！它说它也谢谢你——真的，它在说话。' },
    no: { l: '放回去', fx: { tide: -3, bond: -4 }, re: '那我把它放回去。它好像有点难过。' },
  },
  {
    id: 'mur-day', who: 'murphy', act: 2,
    say: '把每周三空出来。那一天，所有人都不许做正事，只能想祂。',
    yes: { l: '空出周三', fx: { san: -7, bond: 5, mem: -3 }, re: '很好。祂会记得这一天的。' },
    no: { l: '不行', fx: { san: 4, mem: 3 }, re: '拒绝也是一种想念。祂听着呢。' },
  },
  {
    id: 'cor-chart', who: 'corposant', act: 1,
    say: '给我一间屋子，我要把屏障外的水路画出来。画完你们就有一张真的地图。',
    yes: { l: '给她屋子', fx: { core: -4, mem: 6, tide: -3 }, re: '（三个月后，墙上钉着一张图，边角是黑的。）' },
    no: { l: '没空房', fx: { mem: -3, core: 3 }, re: '没有图，就别怪我迷路。' },
  },
  {
    id: 'mir-list', who: 'miryam', act: 3,
    say: '我需要一张名单：哪些人我们不救。不是不想救，是救不了。你写。',
    yes: { l: '写名单', fx: { san: 4, bond: -6, mem: 3 }, re: '（她收下名单，折了两次，放进胸前的口袋。）' },
    no: { l: '不写', fx: { bond: 5, san: -5 }, re: '那我就全救。救到床不够，就救到我自己躺下。' },
  },
  {
    id: 'eri-day', who: 'erica', act: 2,
    say: '申请一天停机。我想试试什么都不处理，是什么感觉。',
    yes: { l: '准她停机', fx: { san: 5, bond: 4, core: 3 }, re: '（那天她坐在窗边一整天没有动。有人以为她坏了。）' },
    no: { l: '继续运行', fx: { core: -2, bond: -4 }, re: '收到。继续运行。' },
  },
  {
    id: 'cas-birthday', who: 'castor', act: 2,
    say: '明天是波吕克斯的生日。他忘了，每年都忘。能给他办一次吗？',
    yes: { l: '办', fx: { bond: 7, core: -3, mem: 3 }, re: '（蛋糕上插了两根蜡烛。他说一根就够了。）' },
    no: { l: '没这个规矩', fx: { bond: -5, mem: -2 }, re: '那就算了。反正他不记得。' },
  },
  {
    id: 'pol-write', who: 'pollux', act: 1,
    say: '我想学写字。真的字。这样哪天我不在了，还能留一张纸条。',
    yes: { l: '找老师教', fx: { mem: 6, bond: 5, core: -2 }, re: '（他写的第一行是：我在这里。）' },
    no: { l: '不用学', fx: { bond: -4, mem: -3 }, re: '没事。我记得住就行。' },
  },
  {
    id: 'daf-room', who: 'daffodil', act: 2,
    say: '给我一间没有窗的房间。有些交易，光一照就散了。',
    yes: { l: '给她房间', fx: { bond: 4, san: -4, tide: 3 }, re: '（门关上过一次。再打开时，里面只有一把椅子。）' },
    no: { l: '不给', fx: { san: 4, tide: -2 }, re: '也好。省得我又要收你一间房的钱。' },
  },
  {
    id: 'jen-stool', who: 'jenkin', act: 2,
    say: '黑潮边上多了一张凳子，朝着雾摆的。有人每天晚上去坐。要不要我查？',
    yes: { l: '查', fx: { mem: 3, tide: -4, san: -3, bond: 2 }, re: '（查到了。是三年级的，已经坐了四十七天。）' },
    no: { l: '不用查', fx: { tide: 4, san: -2 }, re: '不查也好。坐着的人可能只是想看看。' },
  },
  {
    id: 'hor-say', who: 'horla', act: 2,
    say: '你能不能……念一次我的名字。就一次。我想听听它是不是还在。',
    yes: { l: '念他的名字', fx: { bond: 8, mem: 5, san: 3 }, re: '（他很轻地应了一声。）……原来是这个声音。' },
    no: { l: '不念', fx: { bond: -7, mem: -4, san: -2 }, re: '嗯。我本来也没指望。' },
  },
  {
    id: 'nau-books', who: 'nautila', act: 2,
    say: '让我把名字写在图书馆每一本书的第一页。写下来就不会丢了，对吧？',
    yes: { l: '让她写', fx: { core: -3, mem: 7, bond: 4 }, re: '（第二天，每本书的扉页上都是同一个名字，写得歪歪扭扭。）' },
    no: { l: '只能写一本', fx: { mem: -5, bond: -4 }, re: '那我只写一本。自己那本。' },
  },
  {
    id: 'lily-word', who: 'lily', act: 3,
    say: '（她张开嘴，很努力地）……你。',
    yes: { l: '应她', fx: { bond: 9, mem: 4, san: 2 }, re: '（她指着你，又指了指自己，然后笑了。）' },
    no: { l: '装作没听见', fx: { bond: -8, san: -2 }, re: '（她低下头，把纸条折好，塞进口袋。）' },
  },
  {
    id: 'ryk-law', who: 'ryker', act: 2,
    say: '把我们的规矩写进校规。三条：不抛下伤员、不撒谎、不吃同类。',
    yes: { l: '写进校规', fx: { bond: 6, mem: 4, core: -3 }, re: '（第二天，三条规矩被刻在校门内侧。）' },
    no: { l: '不合规矩', fx: { bond: -5, san: -2 }, re: '不写也行。我们记在心里。' },
  },
  {
    id: 'aig-stand', who: 'aigis', act: 1,
    say: '老师让交作业。我想交一块石头，因为我只会站着。可以吗？',
    yes: { l: '可以', fx: { bond: 5, mem: 3, san: 3 }, re: '（那块石头被摆在讲台上，谁也没扔。）' },
    no: { l: '要交作业', fx: { bond: -4, san: -3 }, re: '那我抄别人的。抄的时候我会小心的。' },
  },
  {
    id: 'cae-water', who: 'caecus', act: 1,
    say: '我的鳃在干。给我一桶海水，要真的，不是兑的。',
    yes: { l: '买海水', fx: { core: -5, san: 5, mem: 2 }, re: '（他把脸埋进桶里，很久没有抬起来。）' },
    no: { l: '用自来水', fx: { san: -5, mem: 2 }, re: '那我喝自来水。反正也差不多。' },
  },
  {
    id: 'cas-vanish', who: 'casiah', act: 3,
    say: '给我一个名字。今晚我让他从名册上消失一小时——只是表演，我保证。',
    yes: { l: '给个名字', fx: { mem: -6, san: -4, bond: 3, tide: 2 }, re: '（那一小时全校都找不到他。回来时他说自己一直在原地。）' },
    no: { l: '不演这个', fx: { mem: 4, san: 3 }, re: '不演了。有些魔术演过一次就回不去。' },
  },
  {
    id: 'cel-night', who: 'celeste', act: 2,
    say: '今晚我能不能睡一次？真的睡。我从来没试过。',
    yes: { l: '让她睡', fx: { san: 6, bond: 4, tide: -2 }, re: '（她睡了十四个小时。醒来第一句是：原来梦是这样的。）' },
    no: { l: '学生们需要梦', fx: { bond: -5, san: -4 }, re: '嗯。我继续替他们做。' },
  },
  {
    id: 'cle-room', who: 'clementine', act: 1,
    say: '给我一间小屋，一张桌子，两把椅子。学生要有个地方说话。',
    yes: { l: '开倾诉室', fx: { san: 6, bond: 6, core: -4 }, re: '（第一个月来了两个人。第二个月来了三十个。）' },
    no: { l: '没这个编制', fx: { bond: -4, core: 2 }, re: '不说也行。憋着，迟早要出事。' },
  },
  {
    id: 'dol-power', who: 'doll', act: 3,
    say: '给我三十秒，把电断掉。我想知道停下来的那三十秒，我还在不在。',
    yes: { l: '断电三十秒', fx: { san: -6, mem: 3, core: 3 }, re: '（三十秒后她说：在。我还在。可惜只有三十秒。）' },
    no: { l: '不断电', fx: { san: 3, core: -2 }, re: '不敢试是对的。万一不在，就没人替我开机。' },
  },
  {
    id: 'dof-doc', who: 'doll-inferno', act: 2,
    say: '给我一份没有意义的公文，我签。我想看看签一份没用的东西是什么感觉。',
    yes: { l: '给她一份', fx: { san: 5, mem: -3, bond: 2 }, re: '（她签了，签得很认真，然后把纸整齐折好。）' },
    no: { l: '公文都有意义', fx: { san: -4, mem: 2 }, re: '连这个也不给。行。' },
  },
  {
    id: 'fai-give', who: 'faint', act: 2,
    say: '这盆花给你。条件是：每天浇一次。忘了它就会死。',
    yes: { l: '收下', fx: { bond: 6, mem: 4, san: 3 }, re: '（你把它放在窗台上。它每天都在长。）' },
    no: { l: '我不能养', fx: { bond: -5, mem: -3 }, re: '……那我养着。反正我不睡觉。' },
  },
  {
    id: 'far-lightall', who: 'faros', act: 2, w: 0.4,
    say: '所有灯塔一起点亮，烧一整年的银芯。黑潮会退——不是被挡住，是被叫回去。要试吗？',
    yes: { l: '全点亮', end: 'survive_sea', fx: { core: -8 }, re: '（那一夜，整片海岸都亮了。潮水往回缩，像有人在退着走。）' },
    no: { l: '留着银芯', fx: { core: 3, tide: 4 }, re: '也好。灯是用来照路的，不是用来吓人的。' },
  },
  {
    id: 'far-dark', who: 'faros', act: 3,
    say: '今晚把灯塔关掉。我想看看，没有灯的时候，海会不会自己亮。',
    yes: { l: '关灯一晚', fx: { tide: 6, mem: -4, san: -3 }, re: '（那一夜，黑潮边上出现了很多小光点。不知道是谁点的。）' },
    no: { l: '灯不能关', fx: { core: -3, tide: -4, san: 3 }, re: '留着也好。灯亮着，人才敢睡。' },
  },
  {
    id: 'gol-hug', who: 'goliath', act: 2,
    say: '能不能给我抱一下？我会很小心的。真的。',
    yes: { l: '抱他一下', fx: { bond: 8, core: -3, san: 3 }, re: '（他很小心。你的肋骨还是响了一下。）' },
    no: { l: '不方便', fx: { bond: -6, san: 2 }, re: '……我知道。我太大了。' },
  },
  {
    id: 'sga-stair', who: 'sanga', act: 1,
    say: '东楼的楼梯有七级不一样高。让我修。修完你会听见走路的声音变整齐。',
    yes: { l: '让她修', fx: { core: -5, san: 5, mem: 2 }, re: '（修好那天，有人特意上下走了三遍。）' },
    no: { l: '先放着', fx: { san: -4, core: 3 }, re: '不修也行。反正大家都会绊一下。' },
  },

  {
    id: 'mup-room', who: 'murphy-plain', act: 2,
    say: '我要一间房。地毯要深蓝，窗帘要厚，床要软。这不难吧？',
    yes: { l: '按她说的布置', fx: { core: -6, bond: 4, san: 4 }, re: '（她进去看了一眼，说：勉强。然后关上了门。）' },
    no: { l: '宿舍统一标准', fx: { bond: -4, core: 3 }, re: '那我住回原来的。反正也没人管我。' },
  },
  {
    id: 'nym-write', who: 'nymphaea', act: 2,
    say: '我想写一本书。不是抄的，是我自己的。写完能不能放进图书馆？',
    yes: { l: '给她书架', fx: { mem: 7, bond: 4, core: -2 }, re: '（书写完了，一百二十页。她把它放在最角落的书架上。）' },
    no: { l: '图书馆不收私稿', fx: { mem: -4, bond: -3 }, re: '不写也好。反正图书馆里的书也没人看。' },
  },
  {
    id: 'ogi-horse', who: 'ogier', act: 1,
    say: '我想要一匹马。不是为了打仗，就是想有人陪我跑一段。',
    yes: { l: '给他一匹马', fx: { core: -5, bond: 6, san: 3 }, re: '（马厩里多了一匹很老的马。他每天早上给它刷毛。）' },
    no: { l: '学校的马要拉货', fx: { bond: -5, core: 2 }, re: '不用马也行。我自己跑。' },
  },
  {
    id: 'ram-case2', who: 'ramona', act: 3,
    say: '我想查你的底。你从哪来，谁签的你，你为什么坐这张桌子。可以吗？',
    yes: { l: '让她查', fx: { mem: 5, san: -5, bond: 3 }, re: '（她查了三天，最后合上卷宗：查不到。这本身就是答案。）' },
    no: { l: '不许查', fx: { san: 4, bond: -3 }, re: '不查就不查。答案不会因为我查不查而变。' },
  },
  {
    id: 'rar-tomorrow', who: 'ramona-ring', act: 3,
    say: '给我一个不一样的明天。什么都行，只要不是今天这个。',
    yes: { l: '答应她', fx: { mem: -5, san: 5, tide: 3 }, re: '（第二天，钟楼敲了十三下。她笑了。）' },
    no: { l: '明天不会变', fx: { san: -4, mem: 3 }, re: '那我们就再过一遍今天。反正我熟。' },
  },
  {
    id: 'sal-confess', who: 'salvador', act: 1,
    say: '让学生来我这里告解吧。我不会记，也不会说。他们需要一个不会传出去的地方。',
    yes: { l: '设告解室', fx: { bond: 7, san: 5, mem: -2 }, re: '（第一个来的人坐了四十分钟，一句话没说。）' },
    no: { l: '不设', fx: { bond: -4, san: -3 }, re: '不设也好。有些话说出来，反而更难放下。' },
  },
  {
    id: 'tha-fallow', who: 'thais', act: 2,
    say: '留一片地，什么都不种。空地也需要有人守着——不然它会长出别的东西。',
    yes: { l: '留一块空地', fx: { mem: 4, tide: -5, san: 3 }, re: '（那片地一直是空的。三年里什么都没长出来。）' },
    no: { l: '全都种上', fx: { tide: 5, mem: -3 }, re: '那它就自己长了。别怪我没提醒。' },
  },
  {
    id: 'tinc-record', who: 'tinct', act: 3,
    say: '让我录一张唱片。就一张。放在广播室，哪天我不在了，还能放。',
    yes: { l: '准她录', fx: { mem: 7, core: -4, bond: 5 }, re: '（唱片只有一面。另一面是空的。）' },
    no: { l: '档案室不收', fx: { mem: -4, bond: -4 }, re: '不录也行。反正声音留不住。' },
  },
  {
    id: 'tul-story', who: 'tulu', act: 2,
    say: '余要听故事。随便什么故事，只要有人讲。',
    yes: { l: '给他讲', fx: { bond: 6, mem: 4, san: 3 }, re: '（讲到第三段他就睡着了。你听见很轻的鼾声。）' },
    no: { l: '余要自己睡', fx: { san: -4, bond: -5, mem: 2 }, re: '不给讲。那余自己睡。' },
  },
  {
    id: 'uvh-triumph', who: 'uvhash', act: 3,
    say: '给我一场凯旋式。从校门走到礼堂，两边站满人。就一次。',
    yes: { l: '办凯旋式', fx: { bond: 6, core: -7, san: 4 }, re: '（他走得很慢。两边的学生不知道该不该鼓掌。）' },
    no: { l: '不办', fx: { bond: -5, core: 3 }, re: '不办也好。凯旋式办完，就该有人死了。' },
  },
  {
    id: 'wan-chair', who: 'wanda', act: 1,
    say: '这把椅子不合规矩。我要换一把。换完，你可以坐。',
    yes: { l: '换椅子', fx: { core: -4, bond: 4, san: 3 }, re: '（新椅子很好看。她一次都没坐过。）' },
    no: { l: '椅子还能用', fx: { bond: -4, san: -2 }, re: '那就这么着。反正坐的人也不讲究。' },
  },
  {
    id: 'wnk-room', who: 'winkle', act: 2,
    say: '有没有那种房间——它找不到的房间？只要一个晚上。',
    yes: { l: '找一间给他', fx: { core: -5, san: 5, tide: -3 }, re: '（那天夜里他睡得很沉。走廊上没有任何脚步声。）' },
    no: { l: '没有那种房间', fx: { san: -5, tide: 4 }, re: '那我继续走。走着它就跟不上。' },
  },
  {
    id: 'vor-pat', who: 'vortice', act: 0,
    say: '莫丝！头！摸！（她把脑袋顶到你的手下面）',
    yes: { l: '摸摸头', fx: { bond: 8, san: 4, mem: 2 }, re: '（她发出很大的呼噜声。）莫丝！喜欢！' },
    no: { l: '还有公文', fx: { bond: -6, san: -2 }, re: '（她退了半步，然后一口咬住了桌角。）' },
  },
  {
    id: 'ara-cut', who: 'arachne', act: 2,
    say: '有一根线已经断了，可它还在装着没断。要我把它剪干净吗？',
    yes: { l: '剪掉', fx: { mem: -5, tide: -6, san: 4 }, re: '（剪刀响了一下。走廊尽头有人说了一声谢谢。）' },
    no: { l: '留着', fx: { tide: 5, san: -4 }, re: '留着也好。断线的东西，自己会找地方挂。' },
  },
  {
    id: 'sya-name', who: 'saya', act: 1,
    say: '给我一个名字吧。你叫什么都行，我会好好用的。',
    yes: { l: '给她一个名字', fx: { bond: 8, mem: 5, san: 3 }, re: '（她把这个词念了十七遍，每一遍都很认真。）' },
    no: { l: '名字要自己想', fx: { bond: -7, mem: -3 }, re: '……那我先叫「那个」。' },
  },
  {
    id: 'pon-tide', who: 'pontos', act: 2,
    say: '每月给我一天。那一天，海要涨到校门口，谁都不许挡。',
    yes: { l: '给他一天', fx: { tide: 8, san: -5, mem: 3 }, re: '（那天潮水停在门槛外一寸。它自己停的。）' },
    no: { l: '不行', fx: { tide: -6, san: 5 }, re: '小气。海记得住小气的人。' },
  },
  {
    id: 'loe-rival', who: 'lotan-etched', act: 3,
    say: '给我一个能打的。不是你——你太软。你只要点头。',
    yes: { l: '点头', fx: { san: -6, bond: -4, tide: 3, mem: 3 }, re: '（她挑走了三年级首席。第二天，首席没来上课。）' },
    no: { l: '不点头', fx: { bond: 4, san: 3 }, re: '不给也好。我自己找。' },
  },
  {
    id: 'car-take', who: 'caraboo', act: 3,
    say: '仙女可以替您收走一样东西——不用说是哪样。收走之后您会发现少了什么。',
    yes: { l: '让她收', fx: { mem: -7, san: 4, bond: 3 }, re: '（三天后你发现少了一样东西。你想不起是什么。）' },
    no: { l: '什么都别收', fx: { mem: 4, san: -3 }, re: '不收也好。有些东西，丢了比留着更疼。' },
  },
  {
    id: 'ogo-punish', who: 'ogier-oath', act: 2,
    say: '请罚我。随便什么。我需要有人记得我错过。',
    yes: { l: '罚他', fx: { core: -4, san: 5, bond: 4 }, re: '（他被罚扫一个月走廊。每天都扫得很干净。）' },
    no: { l: '不必罚', fx: { bond: -5, san: -4 }, re: '不罚也好。反正我自己记得。' },
  },
  {
    id: 'viv-tea', who: 'vivian', act: 0,
    say: '呜……想喝热的。甜的。你陪我喝一会儿好不好。',
    yes: { l: '陪她喝', fx: { bond: 7, san: 5, core: -3 }, re: '（她捧着杯子，喝了一半就睡着了，杯子还端在手上。）' },
    no: { l: '我还有公文', fx: { bond: -5, san: -3 }, re: '……那我继续睡。' },
  },
  {
    id: 'ups-run', who: 'up-samo', act: 1,
    say: '每天早操，全校跑三圈。我打拍子，谁掉队我加一圈。来吗？',
    yes: { l: '跑', fx: { bond: 5, core: -3, san: 4 }, re: '（第一周倒了七个。第三周，没人掉了。）' },
    no: { l: '太折腾', fx: { bond: -4, san: -2 }, re: '不跑也行。练度不够，出事了别找我。' },
  },
  {
    id: 'upm-bed', who: 'up-myls', act: 2,
    say: '我想试试睡觉。给我一张床，安静一点的房间。',
    yes: { l: '给他床', fx: { bond: 5, san: 6, core: -2 }, re: '（他躺了一夜没睡着。第二天说：挺好，至少躺平了。）' },
    no: { l: '宿舍满了', fx: { san: -3, bond: -3 }, re: '不睡也行。夜里总得有人醒着。' },
  },
  {
    id: 'upa-size', who: 'up-alice', act: 2,
    say: '我调了一点东西。喝下去走廊会变短。要不要试试？就一条走廊。',
    yes: { l: '试', fx: { san: -6, mem: -4, tide: 3 }, re: '（走廊确实变短了。走到底时，你忘了自己要去哪。）' },
    no: { l: '不试', fx: { san: 4, mem: 3 }, re: '不试就不试。反正走廊本来就挺长的。' },
  },
  {
    id: 'upr-post', who: 'up-ratking', act: 2,
    say: '让老鼠送信吧。比人快，也不会偷看——它们不识字。',
    yes: { l: '用老鼠送信', fx: { core: -3, mem: 5, bond: 4 }, re: '（第二天全校的纸条都送到了。有一张送错了楼层。）' },
    no: { l: '还是用人', fx: { mem: -3, core: 2 }, re: '那我自己跑。反正我腿多。' },
  },
  {
    id: 'upd-build', who: 'up-dragond', act: 1,
    say: '你们的课表排得像乱配。给我三天，我重排一遍，效率能翻倍。',
    yes: { l: '让他重排', fx: { san: 5, core: -3, bond: -3, mem: 3 }, re: '（新课表贴出来，第一天就有四个人走错教室。）' },
    no: { l: '课表挺好', fx: { bond: 3, san: -3 }, re: '不改也行。反正烂着也是烂着。' },
  },
  {
    id: 'upz-audit', who: 'up-zerok', act: 2,
    say: '让我查一遍账。查完你会不高兴，但你会省钱。',
    yes: { l: '让查', fx: { core: 9, bond: -6, san: 3 }, re: '（查出来三笔糊涂账。经手人都不在了。）' },
    no: { l: '不用查', fx: { bond: 4, core: -4 }, re: '不查就不查。反正钱也不是我的。' },
  },
  {
    id: 'upmo-shop', who: 'up-moreen', act: 1,
    say: '让我在校门口开个小花摊吧。学生买花，比买酒好。',
    yes: { l: '摆摊', fx: { bond: 6, core: 4, san: 4 }, re: '（第一天卖出去十一束。有人买了一束，放在失踪者的桌上。）' },
    no: { l: '校门口不许摆摊', fx: { bond: -4, core: 2 }, re: '不摆也行。花在温室里也开着。' },
  },
  {
    id: 'upc-sun', who: 'up-chaoxing', act: 1,
    say: '明天早上，把全校叫到操场看日出。就十分钟，不耽误课。',
    yes: { l: '去看日出', fx: { bond: 7, san: 6, mem: 3 }, re: '（那天雾很厚。太阳出来的时候，所有人都在鼓掌。）' },
    no: { l: '太早了', fx: { bond: -4, san: -2 }, re: '不看也行。太阳照常升。' },
  },
  {
    id: 'upm2-chair', who: 'up-maodie', act: 1,
    say: '小同志，给我在走廊上搁把椅子。我走累了要坐。',
    yes: { l: '搁把椅子', fx: { bond: 5, san: 4, core: -2 }, re: '（那把椅子一直空着。谁路过都会绕开它。）' },
    no: { l: '走廊不能放东西', fx: { bond: -5, san: -3 }, re: '那我不坐了。站着看。' },
  },
  {
    id: 'cat-paw', who: 'cat', act: 2,
    say: '（猫把爪子按在一份驳回的公文上，然后抬头看你。）',
    yes: { l: '照猫的意思批', fx: { mem: 3, bond: 4, san: 3, core: -2 }, re: '（公文上多了一个爪印。第二天，那份驳回被批准了。）' },
    no: { l: '把公文抽回来', fx: { bond: -3, san: -2 }, re: '（猫把纸推到桌角，跳下去走了。）' },
  },

  {
    id: 'ham-kids', who: 'hameln', act: 2,
    say: '明天下午，我要带一群孩子出校门。天黑前送回来。你敢不敢？',
    yes: { l: '让他带', fx: { bond: 7, tide: 4, san: -4 }, re: '（天黑前他们都回来了。少一个——那个在队尾，自己走回来的。）' },
    no: { l: '不许出校门', fx: { bond: -5, san: 3 }, re: '不给也好。我吹笛子，他们自己会跟。' },
  },
  {
    id: 'liz-teach', who: 'liz', act: 2,
    say: '让我开一门课，教她们跳舞。不收学费，只要她们愿意被看见。',
    yes: { l: '开课', fx: { bond: 7, san: 4, core: -3 }, re: '（第一堂课五个女生。第三堂课，来了二十个。）' },
    no: { l: '没有场地', fx: { bond: -4, san: -2 }, re: '不教了。舞台只有那么大。' },
  },

  // ============================================================ v1.2 恶搞线：这些卡会给这一任一个别的结局
  {
    id: 'cat-sign', who: 'cat', act: 3, w: 0.15,
    say: '（猫叼来一份空白的委任书，压在桌上，用爪子拍了拍「签名」那一栏。）',
    yes: { l: '让它按爪印', end: 'joke_cat', fx: { bond: 4 }, re: '（爪印落下的那一刻，校务处那边传来一阵猫叫。）' },
    no: { l: '把委任书收走', fx: { san: 3, mem: 2 }, re: '（猫看了你很久，然后把纸叼走了。）' },
  },
  {
    id: 'sys-exam2', who: 'exam', act: 3, w: 0.15,
    say: '（你桌上出现一份期中考卷，科目：守密人实务。姓名栏已经填好了你的名字。）',
    yes: { l: '坐下来考', end: 'joke_exam', fx: { mem: -3 }, re: '（你答到第三题就发现，标准答案写的是别人的做法。）' },
    no: { l: '把卷子撕了', fx: { san: 4, mem: -2 }, re: '（撕开之后，背面还有一份，姓名栏空着。）' },
  },
  {
    id: 'mou-live', who: 'mouchette', act: 3, w: 0.15,
    say: '守密人！我把校务会直播出去了，在线人数已经三千了。要不要露个脸？',
    yes: { l: '露脸', end: 'joke_live', fx: { bond: 5 }, re: '（弹幕刷过去了。第二天校门口排了很长的队。）' },
    no: { l: '关掉直播', fx: { core: 2, bond: -3 }, re: '（她关掉直播，小声说：可惜了，刚才还涨粉。）' },
  },
  {
    id: 'upz-zero', who: 'up-zerok', act: 3, w: 0.15,
    say: '我算出一套完全零成本的运营方案。代价是：全校一周只吃两顿。要试吗？',
    yes: { l: '试一周', end: 'joke_zero', fx: { core: 4 }, re: '（账上第一次出现盈余。食堂门口贴了一张告示。）' },
    no: { l: '不试', fx: { core: -2, bond: 4 }, re: '嗯。我也觉得喂不饱人，省再多也没用。' },
  },
  {
    id: 'viv-sleep2', who: 'vivian', act: 3, w: 0.15,
    say: '呜……我有个办法。我们一起睡一觉，醒来任期就结束了。真的，我试过。',
    yes: { l: '一起睡', end: 'joke_sleep', fx: { san: 3 }, re: '（你躺下时还是白天。醒来时，桌上换了三个守密人的名字。）' },
    no: { l: '不行', fx: { san: 4, bond: -3 }, re: '……那我自己睡。你别忘了叫我。' },
  },
  {
    id: 'upm2-seat', who: 'up-maodie', act: 3, w: 0.15,
    say: '小同志，你这椅子坐得腰疼吧。要不我来坐两天？我坐过很多椅子。',
    yes: { l: '让他坐', end: 'joke_walk', fx: { san: 4, bond: 3 }, re: '（他坐上去了。你被安排每天在走廊上遛弯。）' },
    no: { l: '不用', fx: { bond: -3, san: 3 }, re: '行。年轻人自己扛。' },
  },
  {
    id: 'dol-2048', who: 'doll', act: 3, w: 0.15,
    say: '我在算一个模型：两块一样的会合成一块更大的。有意思的是，这模型跟你们学校一模一样。要跑一遍吗？',
    yes: { l: '跑一遍', end: 'joke_2048', fx: { san: -2 }, re: '（屏幕上剩下两块一样的。你按了一下，它们合在了一起。）' },
    no: { l: '不跑', fx: { san: 3 }, re: '不跑也好。跑到底就是一块。' },
  },
];

// ---------------------------------------------------------------- 潮汐
// 每五分之一任期来一次，强制出场。选项给的都是大数，不给「什么都没变」的余地。
export const TIDES = [
  {
    id: 'tide-1', title: '第一次潮汐',
    say: '屏障外的雾抬高了半米。守夜的人说，雾里有脚步声，整齐得像在上课。',
    yes: { l: '开灯，全体上墙', fx: { core: -8, bond: 5, tide: -6, san: -3 }, re: '（整面墙亮了一夜。雾退回去半米，正好是它抬起来的高度。）' },
    no: { l: '关灯，别惊动它', fx: { tide: 7, san: 4, core: 3 }, re: '（灯灭了。脚步声停在墙外，站了整整一夜。）' },
  },
  {
    id: 'tide-2', title: '第二次潮汐',
    say: '宿舍区停电。学生们在黑暗里说起了同一种梦话，一句一句，连得很顺。',
    yes: { l: '把所有人叫醒', fx: { bond: -6, san: 5, tide: -4, core: -4 }, re: '（叫醒了。他们睁着眼，嘴里还在往下说。）' },
    no: { l: '让他们睡完', fx: { tide: 8, mem: 5, bond: 4, san: -5 }, re: '（第二天早上，有四个人不记得自己的名字。）' },
  },
  {
    id: 'tide-3', title: '第三次潮汐',
    say: '审查会封了校门。理由是「校内存在未登记的生命体」。',
    yes: { l: '配合检查', fx: { core: 7, bond: -7, san: -3 }, re: '（他们带走了一个人。名册上没有他，可所有人都记得他。）' },
    no: { l: '拒绝开门', fx: { core: -7, bond: 6, mem: 4, tide: 4 }, re: '（门没开。他们在门外站到天黑，然后在名册上写了一行字。）' },
  },
  {
    id: 'tide-4', title: '第四次潮汐',
    say: '黑池水位上升。地下一层进水，水面上浮着一层薄薄的银。',
    yes: { l: '抽水，封层', fx: { core: -9, tide: -7, san: -3 }, re: '（抽了三天。抽上来的水里，有很轻的哭声。）' },
    no: { l: '让它漫着', fx: { tide: 9, core: 5, mem: 4, san: -4 }, re: '（水漫到二楼。楼梯上开始有人形的水渍。）' },
  },
  {
    id: 'tide-5', title: '第五次潮汐',
    say: '黑潮拍在屏障上。整个学校都能听见，那声音很像有人在敲门。',
    yes: { l: '守住这一夜', fx: { core: -10, san: -6, bond: 7, tide: -8 }, re: '（天亮时，墙还在。墙根下堆了一层银白色的东西。）' },
    no: { l: '开门', fx: { tide: 12, mem: 6, bond: -4 }, re: '（门开了一条缝。缝外面站着很多人，都穿着这所学校的校服。）' },
  },
];

// ---------------------------------------------------------------- 结局
// 触到任一端即终局；撑满任期则按四项的分布给一个「评语」。
export const ENDINGS = {
  mem0: {
    t: '无名', tag: '记忆见底', c: '#8c96ab',
    d: '某天早上，弥萨格照常上课。点名册翻开，第六十三个位置是空的，没有人觉得奇怪——那个位置本来就是空的。走廊的镜子里没有你，食堂的阿姨少打了一份饭，档案室的管理员把「守密人」那一栏划掉，重新写了一个更好听的名字。',
    e: '你不是死了。你是被忘记了。这两件事在这所学校里，一向分得不太清。',
  },
  mem100: {
    t: '琥珀', tag: '记忆满溢', c: '#e3b341',
    d: '你把每一年都记录下来，把每个人的名字刻进墙里。学校再没有出过差错，因为再没有过「下一天」。所有学生都停在最好的那一年，反复上同一节课，反复笑同一个笑话。你坐在档案室中央，抱着一整座凝固的春天，听见外面有人敲门。你没有开。',
    e: '你保住了所有人。代价是他们再也不会长大了。',
  },
  san0: {
    t: '门', tag: '理智见底', c: '#a67cff',
    d: '你在第三十次听见黑池叫你之后，回答了它。不是它进来了，是你出去了。第二天，学生们发现地下三层的门开着，门里是走廊，走廊尽头是你。你不说话，只是笑。有人试着叫你的名字，你听见了——你只是不再觉得那是自己的。',
    e: '你成了那扇门。门一直开着，谁都可以过去。',
  },
  san100: {
    t: '无垢', tag: '理智满溢', c: '#6ea8ff',
    d: '你终于看清了：银芯是线，记忆是提词，所有人都是被反复播放的段落。你关掉了这条线。学生们安静地坐下，像被掐断电源的灯，一盏一盏，姿势都很端正。你很清醒。清醒得像一间没有人的房间，房间中央有一张桌子，桌上摊着一份没有写完的公文。',
    e: '看得太清楚的人，通常不太适合留下来。',
  },
  core0: {
    t: '熄灯', tag: '银芯见底', c: '#46b6c8',
    d: '银芯见底那天，屏障先暗了一角，然后是整面墙。黑潮没有声音，它只是把雾推到了窗台上。最后一节课还在上，老师念着课本，学生抬头看窗外。有人在雾里朝他们招手，很亲切，像来接孩子放学的家长。',
    e: '灯灭了。字还在念。这所学校最后一点体面，是没有人尖叫。',
  },
  core100: {
    t: '镀银', tag: '银芯满溢', c: '#e3b341',
    d: '你太有钱了。审查会的人带着契约来的那天，你在数银芯，数到第三遍才抬头。他们买下了学校的地基、课程、名字，最后连「守密人」这个称呼也标了价。你签了字，笔是银的。签完之后，他们客客气气地问你要不要留下来当顾问。',
    e: '你成了一个很有钱的、没有学校的人。',
  },
  bond0: {
    t: '无人应答', tag: '羁绊见底', c: '#e0575f',
    d: '你叫了三次。走廊尽头没有人回头。银钥匙在手里发烫，钥匙孔却找不到了——因为门已经不需要你了。你在校门口站了一夜。第二天，学校正常上课，铃声准时，谁也没有少。你忽然想起来，你已经很久没有听见有人叫你的名字。',
    e: '这支钥匙还是能开门的。只是门后面没有人了。',
  },
  bond100: {
    t: '人形的锚', tag: '羁绊满溢', c: '#e0575f',
    d: '他们太爱你了。黑潮来的那天，所有人都站在你前面，说「守密人不能死」。他们真的挡住了。你活下来了，一个人，站在一圈安静的光里。后来你在名册上找他们的名字，一个一个找，找了很久——名册上只剩你一个。',
    e: '被爱钉在原地的人，也会变成锚。',
  },
  tide: {
    t: '黑潮', tag: '黑潮漫顶', c: '#7a5cff',
    d: '黑潮不是「进来」的，它是「想起来」的。当它漫过操场时，你听见很多人在念同一句话，那句话你也很熟：「我们本来就不在这里。」——学校还在原地，像一张被水泡开的纸，字迹慢慢散成一团灰。',
    e: '没有人做错什么。只是这所学校从一开始，就建在别人的梦里。',
  },
  // ---- 撑满任期
  survive_gold: {
    t: '守灯人', tag: '任期圆满', c: '#e3b341',
    d: '任期最后一天，你把钥匙交还给校务处。四项账目都还看得过去，黑潮退到了墙外。学生们在操场上排队，一个一个跟你握手，握手的时候都不说话。走出校门时，你回头看了一眼：钟楼上的灯还亮着，那是你第一年挂上去的。',
    e: '这所学校不会记得你叫什么。但它会一直亮着。',
  },
  survive_mem: {
    t: '记述者', tag: '任期圆满', c: '#a67cff',
    d: '你把这一任的所有事都写了下来：谁在哪天说过什么，谁在哪个夜里没有回来。卷宗堆满了三间档案室。你走的那天，新来的守密人在门口接你，手里拿着你的卷宗，翻了两页就合上了。',
    e: '你记住了所有人。这大概就是你能给的全部。',
  },
  survive_bond: {
    t: '被记住的人', tag: '任期圆满', c: '#e0575f',
    d: '你走的那天，全校都来送。有人塞给你一袋烤糊的饼干，有人什么也没说，一直跟到校门口。你回头挥手，挥了三次，人群才慢慢散开。校门关上的时候，你听见里面有人在喊你的名字，喊得很大声，怕你听不见。',
    e: '你没有守住所有的灯。但你守住了愿意为你点灯的人。',
  },
  survive_san: {
    t: '清醒的人', tag: '任期圆满', c: '#6ea8ff',
    d: '你没有被黑池叫走，也没有把谁当成数字。这在弥萨格算是了不起的事——大部分守密人，两样里总要栽一样。你走的时候脑子很清楚，清楚到能一条一条数出这一任做错的十七件事。',
    e: '清醒不是奖赏。清醒只是让你把账算清。',
  },
  survive_core: {
    t: '精算者', tag: '任期圆满', c: '#46b6c8',
    d: '账本漂亮得像一件艺术品。屏障没塌，工资没欠，食堂每周还有两次肉。你把钥匙交出去的时候，校务处的人翻了很久账，最后抬头问你：你是怎么做到的？你说：少做几件好事。',
    e: '钱是这所学校唯一不会骗人的东西。',
  },
  survive_plain: {
    t: '及格的一任', tag: '任期圆满', c: '#8a93a8',
    d: '没有奇迹，也没有灾难。你把这一任撑完了，这已经比大多数守密人强。交接那天下了雨，你在校门口站了一会儿，想起来这一任期里有很多脸，你已经记不清了。',
    e: '撑住，本身就是一种回答。',
  },

  // ---- 撑满任期（v1.2 细分：口味不同，但都撑完了）
  survive_sea: {
    t: '退潮的人', tag: '换来的一次退潮', c: '#46b6c8',
    d: '你把所有灯塔都点亮了，一夜烧掉两年的银芯。黑潮退了三十里——不是散，是往回缩，像被谁叫了一声。第二天早上屏障读数低得让审查会以为是仪表坏了。任期到此为止：没有黑潮可管，也就不需要有守密人。',
    e: '你没有赢。你只是让它退回去了。',
  },
  survive_hollow: {
    t: '空转的一任', tag: '任期圆满', c: '#8a93a8',
    d: '六十天里没有一件大事。账目不涨不跌，人不多不少，黑潮不快不慢，像一台空转的机器。交接那天，来人问你这一任做了什么，你想了很久，说：都在这儿了。',
    e: '什么都没坏，也什么都没长出来。这也算一种结果。',
  },
  survive_rich: {
    t: '承包商', tag: '任期圆满', c: '#e3b341',
    d: '你把学校做成了一门生意：预算漂亮、账期准时、食堂每周两次肉。卸任那天审查会请你留下来签一份新合同——不再叫守密人，叫「运营方」。合同很厚，第一页写着：本协议不含学生。',
    e: '你交出的是一所运转良好的学校。留下的是没有人。',
  },
  survive_loved: {
    t: '全校的守密人', tag: '任期圆满', c: '#e0575f',
    d: '账上一直不好看，灯也坏过两次，但你走过的地方总有人抬头。卸任那天他们凑钱给你买了一件很丑的外套，你穿着它走出校门，一路上都是「再见」。',
    e: '你没把学校管好。你只是让它像个学校。',
  },
  survive_mad: {
    t: '笑着卸任', tag: '任期圆满', c: '#a67cff',
    d: '你撑完了任期。最后二十天你一直在笑，笑到什么公文都批，笑到学生绕着你走。交接时新守密人问你有什么要交代的，你说：他们都很可爱。然后你又笑了。',
    e: '清醒是奢侈品。这一任你把它当了。',
  },
  survive_balance: {
    t: '完美均衡', tag: '任期圆满', c: '#8a93a8',
    d: '四项账都在五十上下，一天都没越过线。你像走钢丝一样走完整段任期，一步没偏。校务处的人看完账本抬头看你，眼神有点敬畏，也有点不安。',
    e: '什么都不多，什么都不少。这不是运气，是手艺。',
  },

  // ---- 属性组合终局（两种坏掉的方式，都不是见底）
  hollow_shell: {
    t: '空壳', tag: '银芯满而羁绊空', c: '#46b6c8',
    d: '账上有的是钱，走廊上没有人。你把预算批到每一盏灯都亮着，亮得像一间没人住的展厅。银芯越攒越多，因为再没有人来跟你要。',
    e: '你养得起这所学校。你只是养不住里面的人。',
  },
  twilight: {
    t: '黄昏', tag: '记忆与理智同时见底', c: '#8c96ab',
    d: '记不清的事越来越多，看得清的事越来越少。你还坐在那张桌子后面，公文递上来，你不知道自己批了什么，也不知道是谁递的。窗外的天一直是那个颜色。',
    e: '你不是被忘记了，也不是疯了。你只是两边一起暗下去。',
  },

  // ---- 恶搞（有专门的卡，走到了就是走到了）
  joke_cat: {
    t: '本校第一只守密猫', tag: '恶搞', c: '#e3b341',
    d: '爪印按下去那一刻，校务处的铜牌换成了「弥萨格守密猫·任期不限」。你被聘为副手，主要工作是开门、开罐头、以及在猫睡着时替它签字。没人觉得有问题——猫确实比你更像守密人：它从不看公文，也从没人敢催它。',
    e: '本校首次由非人生物担任此职。评价：干得比你久。',
  },
  joke_exam: {
    t: '补考', tag: '恶搞', c: '#6ea8ff',
    d: '你答到第三题就知道自己不及格了：题目问「黑潮漫过围墙时第一件事该做什么」，标准答案是「先通知校务处」。你从来没通知过。成绩出来那天，你被安排回一年级重修，学号排在莉莉后面。',
    e: '学校没开除你。学校只是把你降级成了学生。',
  },
  joke_live: {
    t: '全网第一', tag: '恶搞', c: '#e0575f',
    d: '你在镜头前说了句「大家好，我是这里的守密人」，播放量破了三百万。第二天校门口排起长队，第三天有人在门外卖烤肠，第四天审查会来了——不是查学校，是来谈联名。学校成了景点，你成了景点管理员。',
    e: '这所学校的名字第一次被这么多人记住。记住的是招牌。',
  },
  joke_zero: {
    t: '零氪通关', tag: '恶搞', c: '#46b6c8',
    d: '一周之后账上第一次有了盈余，数字漂亮得像假的。食堂门口贴出告示：「本周菜单：粥。」学生们安静地排队，安静地喝完，安静地瘦下去。你在账本上签了字，签得很有成就感。',
    e: '一分没花。一个也没剩下。',
  },
  joke_sleep: {
    t: '长睡不醒', tag: '恶搞', c: '#a67cff',
    d: '你躺下时还是白天，她靠在旁边说：睡吧，醒来就好了。你醒来时桌上的名牌换了三个名字，校历翻过去两年。没有人叫醒你——她替你挡了所有敲门的人，理由是「守密人在睡」。',
    e: '这一任你交得最轻松。因为你根本没上过班。',
  },
  joke_walk: {
    t: '遛弯的人', tag: '恶搞', c: '#8a93a8',
    d: '他坐上那张椅子之后，一切都变得很有秩序：公文批得慢但没错，学生见了拐杖就绕道，黑潮好像也懒得往前推。你被安排每天在走廊上遛弯，谁挡路你就敲一下。你很快就习惯了。',
    e: '你从守密人变成了走廊的一部分。他干得比你好，这点你承认。',
  },
  joke_2048: {
    t: '两块一样的东西', tag: '恶搞', c: '#e3b341',
    d: '模型跑完了。屏幕上只剩两块，一样大，一样亮。你按了一下，它们合在一起，变成一块更大的。再按一下，又是两块一样的。你在这张桌子后面按了很久，学校在屏幕外面照常运转，没有人来找你。',
    e: '你终于明白这所学校的算法：一样的东西碰到一起会消失，然后变成更大的东西。',
  },
};

// 三档只动三样：任期多长、起始资源多少、每张卡的数值放大多少。
// 数值是拿 1200 局随机策略 + 1200 局「保守策略」跑出来的：
// 随机策略在标准任期大约三成能撑完，保守策略八成以上；长任期只剩一半。
export const DIFFS = [
  {
    k: 'short', n: '见习', days: 30, start: 52, scale: 1.1, tide: 1, tag: '先干一个月',
    d: '任期一个月。三十天，起始四项各 52，潮汐只来五次——先认认这些人和这些账。',
  },
  {
    k: 'normal', n: '守密人', days: 60, start: 46, scale: 1.1, tide: 1, tag: '一个学期',
    d: '标准任期：一个学期。起始四项各 46，账按部就班地烂，潮汐五次。',
  },
  {
    k: 'long', n: '洪积纪年', days: 90, start: 46, scale: 1.1, tide: 1.15, tag: '三个学期',
    d: '三个学期。起始和标准档一样，但黑潮快一成五——九十天里它从不等你。',
  },
];
