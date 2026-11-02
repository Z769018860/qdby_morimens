(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/ll/songs-ip.js
const m_songs_ip = await (async () => {

// 第二批曲目：国风原创 / 剑网3 / 明日方舟 / 边狱巴士 / 鸣潮。
//
// 和第一批一样的规矩（这条要一直成立）：**这里没有一个字节的原曲音源**。
// 旋律是按原曲的气质手写的短版（走向、节奏型贴近，不逐音还原），和弦与鼓组自配，
// 全部在页面里用振荡器现场合成。曲名借原曲，谱面由旋律生成。
// 有原曲包（assets/ll-music/*.bin）的曲子会改用原曲抓点出谱，这份改编只当兜底。
//
// 记号见 songs.js 顶部注释：小节 4 拍，裸 token 半拍，`1:2` 是两拍，`r` 是休止，
// `^`/`v` 升降八度。每段 ch 是和弦级数，e 是能量（决定鼓组铺多满）。
// 写错了 arrange() 会直接抛错，构建期就能发现。
//
// 归类按「歌到底是谁的」算，不按听感：
//   国风原创 —— 万神纪（bilibili 拜年祭 VOCALOID 曲）、不见长安（河图《风起天阑》）
//   剑网3   —— 万重山 / 当战 / 何曾惧 / 狂（官方或大师赛）、江湖意 / 我的一个道姑朋友（同人）
//   鸣潮    —— Waking of a World / Dawnbreaker / 余烬重燃 / 风之所在 / 愿戴荣光坠入天渊

const IP_SONGS = [
  /* ================================================================ 国风原创 */
  {
    id: 'wanshen',
    n: '万神纪',
    sub: '国风原创 · bilibili 拜年祭',
    bpm: 170, root: 55, mode: 'min', wave: 'sawtooth',
    desc: '国风神曲那股劲儿：鼓点密、字字砸在拍上，副歌全是双押。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 r 5 r 1^ r 5 r | 6 r 3 r 6 r 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VI', 'VII'], m: `
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 5 5 4 4 3 3 2 2 | 3 3 2 2 1 r r r
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 7 7 | 1^ 1^ 7 7 6 6 5 5 | 6 6 7 7 1^ r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 3 3 2 3 | 5 5 6 5 3 r 2 r | 6 6 7 6 5 5 4 5 | 6 6 7 1^ 6 r 5 r
        5 5 6 5 3 3 2 3 | 1^ 1^ 7 6 5 r 3 r | 4 4 5 4 6 6 5 6 | 5 3 2 3 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 3 5 6 5 3 1 3 | 6 5 6 7 1^ 7 6 5 | 3 5 6 7 6 5 3 2 | 3 4 5 4 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'i'], m: `
        6 r 7 r 1^ r 7 r | 1:3 r r` },
    ],
  },
  {
    id: 'bujian',
    n: '不见长安',
    sub: '国风原创 · 河图',
    bpm: 138, root: 57, mode: 'min', wave: 'triangle',
    desc: '慢起、长句、后来收不住。前两段稀，副歌才把鼓铺满。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 r r r 3 r r r | 6 r r r 5 r r r` },
      { tag: '主歌', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1:2 3:2 | 5:2 3:2 | 4:2 3:2 | 2:2 1:2
        6:2 5:2 | 4:2 3:2 | 6:2 7:2 | 1:2 r:2` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 3 3 2 3 | 5 5 6 5 3 r 2 r | 6 6 7 6 5 5 4 5 | 5 5 4 5 1 r r r
        5 5 6 5 3 3 2 3 | 1^ 1^ 7 6 5 r 3 r | 6 6 7 1^ 7 6 5 4 | 3 2 3 1 r r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 r 5 r 4 r 3 r | 2 r 3 r 2 r 1 r | 1:2 r:2` },
    ],
  },

  /* ================================================================ 剑网3 */
  {
    id: 'jianghu',
    n: '江湖意',
    sub: '剑网3 · 同人群像',
    bpm: 164, root: 52, mode: 'min', wave: 'sawtooth',
    desc: '剑三群像合唱那股江湖气：开场就是主 riff，一路顶到底。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VII', 'VII'], m: `
        1 1 5 5 1^ 1^ 5 5 | 1 1 5 5 1^ 1^ 5 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1 1 1 5 3 3 1 1 | 7 7 7 5 3 3 7 7 | 6 6 6 3 2 2 6 6 | 5 5 4 5 7 r r r
        1 1 1 5 3 3 1 1 | 7 7 7 5 3 3 7 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 5 5 4 4 1 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 6 5 3 5 6 5 3 | 1^ 7 6 5 6 5 3 r | 6 7 6 5 6 7 6 5 | 5 4 3 2 3 r 5 r
        5 6 5 3 5 6 5 3 | 1^ 1^ 7 6 5 r 3 r | 4 5 6 5 4 3 2 3 | 1 5 4 3 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 2 2 3 2 1 r r r | 1:3 r r` },
    ],
  },
  {
    id: 'wanchong',
    n: '万重山',
    sub: '剑网3 · 剧情歌',
    bpm: 128, root: 57, mode: 'min', wave: 'triangle',
    desc: '一层一层往上翻的山。主歌全是两拍长音，副歌才把十六分放出来。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 r r r 3 r r r | 5 r 3 r 2 r 1 r` },
      { tag: '主歌', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1:2 5:2 | 6:2 3:2 | 3:2 2:2 | 7:2 5:2
        1:2 5:2 | 6:2 1^:2 | 7:2 6:2 | 5:2 r:2` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        3 3 4 3 2 2 3 2 | 5 5 6 5 3 3 2 3 | 6 6 7 6 5 5 4 5 | 5 4 3 2 3 r 5 r
        3 3 4 3 2 2 3 2 | 1^ 1^ 7 6 5 5 3 5 | 6 6 7 1^ 7 6 5 4 | 3 2 1 2 1 r r r` },
      { tag: '间奏', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 3 5 1^ 5 3 1 3 | 6 5 4 3 2 3 4 5 | 3 5 6 1^ 6 5 3 5 | 7 6 5 4 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'i'], m: `
        6:2 5:2 | 1:3 r r` },
    ],
  },
  {
    id: 'dangzhan',
    n: '当战',
    sub: '剑网3 · 大师赛战歌',
    bpm: 174, root: 55, mode: 'min', wave: 'sawtooth',
    desc: '一开口就是开打的曲子。全程十六分，手慢一点就断。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VII', 'VII'], m: `
        1 1 5 5 1 1 5 5 | 7 7 5 5 7 7 5 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1 1 3 3 5 5 3 3 | 7 7 6 6 5 5 7 7 | 6 6 5 5 4 4 3 3 | 5 5 4 4 3 3 2 2
        1 1 3 3 5 5 1^ 1^ | 7 7 6 6 5 5 7 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 5 5 4 4 3 r 2 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 5 5 6 5 | 7 7 1^ 7 7 7 1^ 7 | 6 6 7 6 6 6 7 6 | 5 5 6 5 3 r 2 r
        5 5 6 5 5 5 6 5 | 1^ 1^ 2^ 1^ 7 7 6 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 3 5 6 5 3 1 5 | 6 5 3 2 3 5 6 1^ | 3 5 6 7 6 5 3 2 | 3 2 1 2 3 5 6 7` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 2 2 3 2 1 r r r | 1:3 r r` },
    ],
  },
  {
    id: 'hezengju',
    n: '何曾惧',
    sub: '剑网3 · 大师赛战歌',
    bpm: 168, root: 52, mode: 'min', wave: 'sawtooth',
    desc: '比《当战》沉一档，句尾爱往下走。副歌连续八个小节不给你喘。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'VI', 'i', 'VII'], m: `
        1 r 5 r 6 r 5 r | 1 r 5 r 7 r 5 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 2 3 5 3 2 1 | 6 6 5 6 3 3 2 3 | 3 3 4 5 6 5 4 3 | 7 7 6 5 3 3 2 2
        1 1 2 3 5 3 5 6 | 6 6 7 6 1^ 7 6 5 | 1^ 1^ 7 7 6 6 5 5 | 5 4 3 2 3 r 2 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 3 2 3 5 | 7 7 6 7 5 3 5 7 | 6 6 5 6 4 3 4 6 | 5 5 4 3 2 r 3 r
        5 5 6 5 3 2 3 5 | 1^ 1^ 7 6 5 3 5 6 | 6 6 7 7 1^ 1^ 7 6 | 5 4 3 2 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'kuang',
    n: '狂',
    sub: '剑网3 · 战歌',
    bpm: 160, root: 50, mode: 'min', wave: 'square',
    desc: '低音区一直砸同一块地方。方波最冲，副歌全在高八度上喊。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'VII', 'i', 'VII'], m: `
        1 1 1 1 1 r 5 r | 7 7 7 7 7 r 5 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'VII'], m: `
        1 1 1 2 3 3 1 1 | 7 7 7 6 5 5 7 7 | 6 6 6 5 4 4 6 6 | 5 5 4 5 6 r 7 r
        1 1 1 2 3 3 5 5 | 7 7 6 6 5 5 3 3 | 6 6 7 7 1^ 1^ 2^ 2^ | 5 5 4 4 3 2 1 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1^ 1^ 1^ 7 6 6 6 5 | 7 7 7 6 5 5 5 4 | 6 6 6 5 4 4 4 3 | 5 5 4 3 2 3 5 7
        1^ 1^ 1^ 7 6 6 6 5 | 3^ 3^ 2^ 1^ 7 7 5 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 5 5 4 4 3 3 2 2 | 1:3 r r` },
    ],
  },
  {
    id: 'daogu',
    n: '我的一个道姑朋友',
    sub: '剑网3 · 同人曲',
    bpm: 76, root: 57, mode: 'min', wave: 'triangle',
    desc: '慢板古风，长音多、留白多。副歌几乎全是长条，按稳比按快重要。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1:2 3:2 | 5:2 6:2 | 6:2 5:2 | 2:2 1:2` },
      { tag: '主歌', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'i'], m: `
        3 3 2 3 5 r 3 r | 2 2 1 2 3 r 1 r | 6 6 5 6 1^ r 6 r | 5 5 4 5 6 r 5 r
        3 3 2 3 5 r 5 r | 6 6 5 6 7 r 6 r | 1^ 1^ 7 6 5 5 3 5 | 3 2 1 r 1 r r r` },
      { tag: '副歌', e: 2, rep: 2, ch: ['i', 'VII', 'VI', 'III', 'i', 'VII', 'VI', 'i'], m: `
        5:2 6 5 3 2 | 3:2 2 3 1 2 | 6:2 7 1^ 6 5 | 5:3 3 2
        5:2 6 5 3 5 | 1^:2 7 6 5 3 | 6 6 7 7 1^:2 | 1^:3 r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'VII', 'i'], m: `
        6:2 5:2 | 3:2 2:2 | 1:3 r r` },
    ],
  },

  /* ================================================================ 明日方舟 */
  {
    id: 'opblade',
    n: 'Operation Blade',
    sub: '明日方舟 · 战斗曲',
    bpm: 176, root: 50, mode: 'min', wave: 'sawtooth',
    desc: '切城的压迫感。小调锯齿波打底，副歌是连续的十六分重击。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'VII'], m: `
        1 1 1 1 5 5 5 5 | 6 6 6 6 7 7 7 7` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'III', 'VII'], m: `
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 3 3 5 5 3 3 2 2 | 7 7 6 6 5 5 4 4
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 7 7 | 1^ 1^ 2^ 2^ 1^ 1^ 7 7 | 5 5 6 6 7 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1 1 1 5 1 1 1 5 | 7 7 7 6 7 7 7 6 | 6 6 6 4 6 6 6 4 | 5 5 5 7 5 5 5 7
        1 1 1 5 3 3 3 1 | 7 7 6 6 5 5 4 4 | 6 6 7 7 1^ 1^ 7 7 | 5:1 4:1 1:2` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 5 5 4 4 3 3 2 2 | 1:3 r r` },
    ],
  },
  {
    id: 'reconn',
    n: 'Reconnection',
    sub: '明日方舟 · 主题曲',
    bpm: 168, root: 57, mode: 'maj', wave: 'triangle',
    desc: '开场的琶音一出来就知道要起飞。副歌长句连成一片，最吃手感。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        1 3 5 3 1^ 5 3 1 | 5 7 2^ 7 5 2 7 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        1 1 5 5 6 6 5 5 | 4 4 3 3 2 2 1 1 | 6 6 5 5 4 4 3 3 | 2 2 3 3 4 4 5 r
        1 1 5 5 6 6 5 5 | 4 4 5 5 6 6 7 7 | 1^ 1^ 2^ 2^ 3^ 3^ 2^ 2^ | 5 5 6 6 7 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        3 3 4 3 1 1 2 1 | 5 5 6 5 3 3 4 3 | 6 6 7 6 4 4 5 4 | 5 5 6 5 2 r 5 r
        3 3 4 3 1 1 2 1 | 1^ 1^ 7 6 5 5 4 5 | 6 6 5 5 4 4 3 3 | 2 2 3 3 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 5 4 6 6 5 6 | 5 r 4 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'radiant',
    n: 'Radiant',
    sub: '明日方舟 · 主题曲',
    bpm: 150, root: 62, mode: 'maj', wave: 'square',
    desc: '明亮、上扬、一路推到顶。跳跃音型多，读谱轻松但节奏不能松。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        5 r 3 r 1 r 3 r | 6 r 5 r 4 r 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        1 3 5 3 1 3 5 3 | 6 5 6 5 6 1^ 6 5 | 4 6 1^ 6 4 6 1^ 6 | 5 4 3 2 3 4 5 r
        1 3 5 3 1 3 5 3 | 6 5 6 5 6 1^ 6 5 | 7 7 6 6 5 5 4 4 | 3 3 4 4 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        5 5 5 3 5 5 6 5 | 4 4 4 2 4 4 5 4 | 6 6 6 4 6 6 7 6 | 5 5 6 5 3 r 2 r
        5 5 5 3 5 5 6 5 | 1^ 1^ 1^ 6 1^ 1^ 2^ 1^ | 7 7 6 6 5 5 4 4 | 3 4 5 4 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 5 4 6 6 5 6 | 5 r 3 r 2 r 1 r | 1:3 r r` },
    ],
  },
  {
    id: 'renegade',
    n: 'Renegade',
    sub: '明日方舟 · 角色曲',
    bpm: 166, root: 55, mode: 'min', wave: 'sawtooth',
    desc: '阴沉、压抑、突然炸开。低音区徘徊很久，副歌才抬上去。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'i', 'VI', 'VII'], m: `
        1 r 1 r 3 r 1 r | 6 r 6 r 5 r 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1 1 3 1 1 1 3 1 | 6 6 5 6 6 6 5 6 | 3 3 5 3 3 3 5 3 | 7 7 6 7 7 7 6 7
        1 1 3 1 1 1 3 1 | 6 6 5 6 6 6 7 7 | 1^ 1^ 7 7 6 6 5 5 | 6 6 7 7 1^ r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1^ 1^ 7 6 5 5 6 5 | 7 7 6 5 4 4 5 4 | 6 6 5 4 3 3 4 3 | 5 5 4 3 2 r 3 r
        1^ 1^ 7 6 5 5 6 5 | 3^ 3^ 2^ 1^ 7 r 5 r | 6 6 7 6 5 5 4 5 | 5 4 3 2 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'pyrite',
    n: 'Operation Pyrite',
    sub: '明日方舟 · 危机合约',
    bpm: 176, root: 49, mode: 'min', wave: 'sawtooth',
    desc: '黄铁行动的鼓点，一根弦从头压到尾。副歌是一整面十六分的墙。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VII', 'VII'], m: `
        1 1 5 1^ 1 1 5 1^ | 7 7 5 3 7 7 5 3` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'VII', 'i', 'i', 'VI', 'V'], m: `
        1 1 1 3 1 1 1 5 | 1 1 1 3 5 3 1 r | 6 6 6 5 6 6 6 4 | 7 7 7 6 5 5 4 4
        1 1 1 3 1 1 1 5 | 1 1 3 5 1^ 7 5 3 | 6 6 7 7 1^ 1^ 7 6 | 5 5 4 4 3 2 1 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1 1 5 1 1 1 5 1 | 7 7 5 7 7 7 5 7 | 6 6 4 6 6 6 4 6 | 5 5 3 5 5 5 3 5
        1 1 5 1 1 1 5 1 | 1^ 1^ 7 5 3 5 7 1^ | 6 6 7 7 1^ 1^ 2^ 2^ | 5 5 4 4 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 5 1^ 5 3 1 5 1 | 6 4 6 1^ 6 4 3 1 | 3 1 3 5 6 5 3 1 | 7 5 7 1^ 7 5 3 2` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 2 2 3 3 4 4 5 5 | 1:3 r r` },
    ],
  },
  {
    id: 'solight',
    n: 'Speed of Light',
    sub: '明日方舟 · 音律联觉',
    bpm: 146, root: 60, mode: 'maj', wave: 'square',
    desc: '现场版那首跑得最快的大调。跳跃音型多，手感最像打鼓。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        1 1 3 1 5 3 1 3 | 6 6 5 6 3 5 3 1` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        1 3 5 3 1 3 5 3 | 5 7 2^ 7 5 7 2^ 7 | 6 1^ 6 5 4 6 1^ 6 | 5 4 3 2 3 4 5 r
        1 3 5 3 1 3 5 6 | 5 7 2^ 7 5 7 2^ 3^ | 4 4 5 5 6 6 7 7 | 5 4 3 2 1 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        5 5 6 5 3 3 5 3 | 5 5 6 5 7 r 5 r | 6 6 7 6 4 4 6 4 | 5 5 6 5 3 r 2 r
        5 5 6 5 3 3 5 3 | 1^ 1^ 7 6 5 3 5 6 | 4 4 5 4 6 6 7 6 | 5 4 3 2 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['IV', 'V', 'I', 'V'], m: `
        4 6 1^ 6 4 6 1^ 6 | 5 7 2^ 7 5 7 2^ 7 | 1 3 5 3 1^ 5 3 1 | 5 5 6 5 7 6 5 4` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 5 4 6 6 5 6 | 5 r 4 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'wolfking',
    n: '狼之主',
    sub: '明日方舟 · 叙拉古人',
    bpm: 180, root: 50, mode: 'min', wave: 'sawtooth',
    desc: '追着你跑的速度。一百八十拍全是八分，读谱不难、撑住最难。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VII', 'VII'], m: `
        1 1 1 5 1 1 1 5 | 7 7 7 5 7 7 7 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'VII'], m: `
        1 1 1 1 3 3 1 1 | 7 7 7 7 5 5 7 7 | 6 6 6 6 4 4 6 6 | 5 5 5 5 7 7 5 5
        1 1 1 1 3 3 5 5 | 7 7 7 7 6 6 5 5 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 5 r 3 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 5 6 5 3 | 7 7 1^ 7 7 1^ 7 5 | 6 6 7 6 6 7 6 4 | 5 5 6 5 3 2 3 r
        5 5 6 5 5 6 5 3 | 1^ 1^ 2^ 1^ 7 6 5 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 4 r 3 r | 1:3 r r` },
    ],
  },
  {
    id: 'boiling',
    n: 'Boiling Blood',
    sub: '明日方舟 · 战斗曲',
    bpm: 170, root: 53, mode: 'min', wave: 'square',
    desc: '血在烧的那种推进感。主歌一直在同一个音上绕，副歌才散开。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'VI', 'VII', 'i'], m: `
        1 1 1 5 6 6 6 5 | 1 1 1 5 7 7 7 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 3 3 5 3 1 1 | 6 6 5 5 6 5 3 6 | 3 3 5 5 6 5 3 3 | 7 7 6 6 5 3 2 7
        1 1 3 3 5 3 5 6 | 6 6 7 6 1^ 7 6 5 | 1^ 1^ 7 6 5 5 6 7 | 5 5 4 4 3 r 2 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 6 5 3 2 3 5 6 | 7 1^ 7 6 5 6 7 1^ | 6 7 6 5 4 5 6 7 | 5 6 5 4 3 r 5 r
        5 6 5 3 2 3 5 6 | 1^ 2^ 1^ 7 6 5 6 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 2 2 3 2 1 r r r | 1:3 r r` },
    ],
  },

  /* ================================================================ 边狱巴士 */
  {
    id: 'flywings',
    n: 'Fly, My Wings',
    sub: '边狱巴士 · 主题曲',
    bpm: 144, root: 60, mode: 'min', wave: 'triangle',
    desc: '像被风托起来一样。前段轻，副歌一路往上翻，长音很多。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1:2 3:2 | 6:2 5:2` },
      { tag: '主歌', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1 3 5 3 6 5 3 r | 6 1^ 6 5 4 3 2 r | 3 5 6 5 3 2 1 r | 5 6 7 6 5 r 3 r
        1 3 5 3 6 5 3 r | 6 1^ 6 5 4 3 2 r | 6 7 1^ 7 6 5 3 5 | 3 2 3 1 r r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 6 7 1^ 7 6 5 6 | 7 1^ 2^ 1^ 7 6 5 6 | 6 7 1^ 2^ 1^ 7 6 5 | 5 6 7 6 5 r 3 r
        5 6 7 1^ 7 6 5 6 | 1^ 2^ 3^ 2^ 1^ 7 6 5 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6:2 5:2 | 4:2 3:2 | 2:2 1:2 | 1:3 r r` },
    ],
  },
  {
    id: 'lament',
    n: 'In Hell We Live, Lament',
    sub: '边狱巴士 · 主题曲',
    bpm: 132, root: 53, mode: 'min', wave: 'sawtooth',
    desc: '重、慢、压得低。拍子大，长条和双押撑起整首的重量。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'V'], m: `
        1:2 3:2 | 6:2 5:2` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 3 1 5 3 1 r | 6 6 5 6 4 3 2 r | 3 3 5 3 7 5 3 r | 7 7 6 5 3 2 1 r
        1 1 3 1 5 3 1 r | 6 6 7 6 1^ 7 6 r | 1^ 1^ 7 6 5 5 4 5 | 5 4 3 2 1 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1 1 1 3 5 5 5 3 | 7 7 7 6 5 5 5 3 | 6 6 6 5 4 4 4 3 | 5 5 5 4 3 r 2 r
        1 1 1 3 5 5 5 6 | 1^ 1^ 1^ 7 6 6 5 3 | 6 6 7 7 1^ 1^ 7 7 | 5 5 4 4 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6:2 5:2 | 4:2 3:2 | 2:2 1:2 | 1:3 r r` },
    ],
  },
  {
    id: 'tiantian',
    n: 'TIAN TIAN',
    sub: '边狱巴士 · 主题曲',
    bpm: 118, root: 55, mode: 'min', wave: 'square',
    desc: '一步一停的切分，像走路时踩到什么东西。空拍很多，别抢。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'VII'], m: `
        1 r 1 1 r 1 3 r | 6 r 6 6 r 5 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1 1 r 3 5 r 3 1 | 6 6 r 5 6 r 5 3 | 3 3 r 5 3 r 2 1 | 7 7 r 6 5 r 3 2
        1 1 r 3 5 r 6 5 | 6 6 r 7 1^ r 7 6 | 1^ 1^ r 7 6 r 5 3 | 5 6 7 r 1^ r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 3 r 3 5 | 7 7 1^ 7 6 r 5 3 | 6 6 7 6 5 r 4 3 | 5 r 4 r 3 r 2 r
        5 5 6 5 3 r 5 6 | 1^ 1^ 7 6 5 r 3 5 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6:2 5:2 | 4:2 3:2 | 1:3 r r` },
    ],
  },
  {
    id: 'patches',
    n: 'Through Patches of Violet',
    sub: '边狱巴士 · 主题曲',
    bpm: 160, root: 53, mode: 'min', wave: 'sawtooth',
    desc: '一直往前推的十六分墙，中间不给你喘的地方。手别松。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'VII'], m: `
        1 1 1 1 5 5 5 5 | 6 6 6 6 7 7 7 7` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 5 1 3 3 1 1 | 6 6 3 6 5 5 3 3 | 5 5 2 5 4 4 2 2 | 7 7 5 7 6 6 5 5
        1 1 5 1 3 3 5 5 | 6 6 7 7 1^ 1^ 7 6 | 1^ 1^ 7 6 5 5 4 3 | 5 5 4 3 2 r 1 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1 1 1 3 5 5 5 3 | 7 7 7 6 5 5 3 3 | 6 6 6 5 4 4 2 3 | 5 5 4 3 2 r 3 r
        1 1 1 3 5 5 6 7 | 1^ 1^ 1^ 7 6 6 5 3 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 5 5 4 4 3 3 2 2 | 1:3 r r` },
    ],
  },

  /* ================================================================ 鸣潮 */
  {
    id: 'wakingworld',
    n: 'Waking of a World',
    sub: '鸣潮 · 公测主题曲',
    bpm: 112, root: 57, mode: 'maj', wave: 'triangle',
    desc: '慢、宽、一路铺开。这段最好用来练长按：主歌全是两拍以上的长音。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        1 r 3 r 5 r 3 r | 6 r 5 r 4 r 3 r` },
      { tag: '主歌', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        1:2 3:2 | 5:2 3:2 | 6:2 5:2 | 4:2 3:2
        1:2 5:2 | 6:2 1^:2 | 7:2 6:2 | 5:2 r:2` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        5 5 6 5 3 3 2 3 | 5 5 6 5 3 r 2 r | 6 6 7 6 5 5 4 5 | 5 5 4 3 2 3 5 r
        5 5 6 5 3 3 2 3 | 1^ 1^ 7 6 5 3 5 6 | 6 6 7 1^ 7 6 5 4 | 3 2 3 1 1 r r r` },
      { tag: '间奏', e: 2, rep: 1, ch: ['IV', 'V', 'I', 'V'], m: `
        4 6 1^ 6 4 6 1^ 6 | 5 7 2^ 7 5 7 2^ 7 | 1 3 5 3 1^ 5 3 1 | 5 6 5 4 3 2 3 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4:2 5:2 | 6 r 5 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'dawnbreaker',
    n: 'Dawnbreaker',
    sub: '鸣潮 · 剧情曲',
    bpm: 132, root: 55, mode: 'min', wave: 'sawtooth',
    desc: '破晓那一段的摇滚。前段压着唱，副歌整条线往上抬一个八度。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 r r 3 r r 5 r | 6 r r 5 r r 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 2 3 1 1 2 3 | 6 6 5 6 3 3 2 3 | 3 3 4 5 3 3 4 5 | 7 7 6 5 3 2 1 2
        1 1 2 3 1 1 2 3 | 6 6 7 6 1^ 7 6 5 | 1^ 1^ 7 7 6 6 5 5 | 5 5 4 4 3 r 2 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        1^ 1^ 7 6 5 5 6 5 | 7 7 6 5 4 5 6 7 | 6 6 5 4 3 4 5 6 | 5 5 4 3 2 r 3 r
        1^ 1^ 7 6 5 5 6 5 | 3^ 3^ 2^ 1^ 7 6 5 7 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'ashesreign',
    n: '余烬重燃',
    sub: '鸣潮 · 主题曲',
    bpm: 150, root: 58, mode: 'min', wave: 'square',
    desc: '灰里还有火。主歌一路小跳，副歌换成头两个音反复砸。',
    secs: [
      { tag: '开场', e: 2, rep: 1, ch: ['i', 'i', 'VI', 'VII'], m: `
        1 1 1 5 1 1 1 5 | 6 6 6 5 7 7 7 5` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'VII'], m: `
        1 1 3 1 5 3 1 1 | 6 6 5 6 4 3 6 6 | 3 3 5 3 6 5 3 3 | 7 7 6 7 5 3 7 7
        1 1 3 1 5 3 5 6 | 6 6 7 6 1^ 7 6 5 | 1^ 1^ 7 7 6 6 5 5 | 6 6 7 7 1^ r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5 5 6 5 3 3 2 3 | 7 7 1^ 7 6 5 3 5 | 6 6 7 6 5 4 3 4 | 5 5 4 3 2 r 3 r
        5 5 6 5 3 3 2 3 | 1^ 1^ 2^ 1^ 7 6 5 3 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6 6 5 5 4 4 3 3 | 5 5 4 4 3 3 2 2 | 1:3 r r` },
    ],
  },
  {
    id: 'windwhere',
    n: '风之所在',
    sub: '鸣潮 · 主题曲',
    bpm: 140, root: 60, mode: 'maj', wave: 'triangle',
    desc: '开阔、带一点惆怅的大调。副歌每句都是「上行再落回来」。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        5 r 3 r 1 r 3 r | 6 r 5 r 4 r 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        1 3 5 3 1 3 5 3 | 6 5 6 5 6 1^ 6 5 | 4 6 1^ 6 4 6 1^ 6 | 5 4 3 2 3 4 5 r
        1 3 5 3 1 3 5 3 | 6 5 6 5 6 1^ 6 5 | 7 7 6 6 5 5 4 4 | 3 3 4 4 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'IV', 'V'], m: `
        5 6 5 3 2 3 5 r | 4 5 4 2 1 2 4 r | 6 7 6 4 3 4 6 r | 5 6 5 3 2 3 5 7
        5 6 5 3 2 3 5 6 | 1^ 2^ 1^ 7 6 5 3 5 | 4 4 5 5 6 6 7 7 | 3 4 5 4 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 5 4 6 6 5 6 | 5 r 3 r 2 r 1 r | 1:3 r r` },
    ],
  },
  {
    id: 'glory',
    n: '愿戴荣光坠入天渊',
    sub: '鸣潮 · 剧情曲',
    bpm: 108, root: 50, mode: 'min', wave: 'sawtooth',
    desc: '史诗感的慢燃，鼓重、句长。副歌一句一句往上抬，长条压在句尾。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1:2 5:2 | 6:2 3:2` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VI', 'III', 'VII', 'i', 'VI', 'VII', 'V'], m: `
        1 1 2 3 5 3 2 1 | 6 6 5 3 6 5 3 2 | 3 3 5 6 5 3 2 1 | 7 7 6 5 3 2 1 r
        1 1 2 3 5 5 6 5 | 6 6 7 6 1^ 7 6 5 | 1^ 1^ 7 6 5 5 4 5 | 5 5 4 3 2 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'V', 'i', 'VII', 'VI', 'V'], m: `
        5:1 6 5 3 5 6 5 | 7:1 1^ 7 6 5 6 5 | 6:1 7 6 5 4 5 4 | 5:3 3 2
        5:1 6 5 3 5 6 5 | 1^:1 2^ 1^ 7 6 5 3 | 6 6 7 7 1^ 1^ 2^ 2^ | 3^ 2^ 1^ 7 1^ r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'V', 'i'], m: `
        6:2 5:2 | 4:2 3:2 | 1:3 r r` },
    ],
  },

];
return { IP_SONGS };
})();

// ---- js/ll/songs.js
const m_songs = await (async () => {
const { IP_SONGS } = m_songs_ip;
// 曲目库：Love Live! 经典曲 + 剑网3 / 明日方舟 / 边狱巴士 的高燃曲 × 《忘却前夜》的短版芯片风改编。
//
// 第二批（剑网3 / 明日方舟 / 边狱巴士）单独放在 songs-ip.js，记号完全一样。
//
// 版权说明（这条要一直成立）：这里没有任何原曲音源——旋律是按原曲的气质
// 手工重编的短版（走向 + 节奏贴近，音高不逐音还原），和弦与鼓组也是自配的，
// 全部在页面里用振荡器现场合成。曲名借原曲，谱面数据（击打时机）由旋律生成。
//
// ---------------------------------------------------------------- 记号
// 每段 sec：ch 是和弦级数（每小节一个，循环用），m 是旋律，| 分小节。
// 音符 token = 音名:拍数，音名是级数 1~7（按 mode 展开成半音），
//   ^ 升八度、v 降八度、#/b 变化音（如 #4）；r 是休止。
// 裸 token 一律按半拍记（这一版的旋律都写在八分音符网格上），
// 想要长音就写显式拍数（1:1 = 一拍，1:2 = 两拍，1:3 = 三拍）。
// 例：`5 5 6 5 3 3 2 3` 是一条 4 拍小节（八个八分音符）。
// e 是段落能量 0~3：0 前奏/尾声（稀）、1 主歌轻、2 主歌满、3 副歌满。
// arrange() 会校验每小节拍数 == 4，写错了构建期直接抛错。



const SONGS = [
  {
    id: 'bokura',
    n: '僕らは今のなかで',
    sub: 'μ\'s · 2期 OP',
    bpm: 186, root: 62, mode: 'maj', wave: 'square',
    desc: '全员冲刺的开场曲。八分音符铺满，副歌一口气冲到最高处。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'V', 'vi', 'IV'], m: `
        1 1 3 5 6 5 3 2 | 5 5 7 6 5 3 2 r | 6 6 1^ 6 5 3 2 3 | 2 3 2 1 v6 v5 1 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        1 3 5 5 5 r 5 r | 6 5 6 7 6 r 5 r | 4 4 6 6 6 r 6 r | 5 3 2 3 2 r 1 r
        1 3 5 5 5 r 6 r | 6 5 6 7 1^ r 7 r | 6 6 5 5 4 4 3 3 | 2 2 3 2 1 r r r` },
      { tag: '预副歌', e: 3, rep: 1, ch: ['IV', 'V', 'iii', 'vi'], m: `
        4 4 4 4 5 5 5 5 | 5 5 6 5 7 r 7 r | 3 3 3 3 4 4 4 4 | 6 7 1^ 1^ 7 6 5 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'V', 'vi', 'IV', 'I', 'V', 'vi', 'IV'], m: `
        5 5 6 5 3 3 2 3 | 5 5 6 5 3 r 2 r | 6 6 7 6 5 5 4 5 | 6 6 7 1^ 6 r 5 r
        5 5 6 5 3 3 2 3 | 1^ 1^ 7 6 5 r 3 r | 4 4 5 4 6 6 5 6 | 5 3 2 3 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['vi', 'IV', 'I', 'V'], m: `
        6 6 5 6 6 5 6 5 | 4 4 3 4 4 3 4 3 | 1 1 2 1 1 2 1 2 | 5 4 3 2 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'I'], m: `
        4 4 5 4 6 6 5 6 | 1 r r r 1:2` },
    ],
  },
  {
    id: 'snow',
    n: 'Snow halation',
    sub: 'μ\'s · 单曲',
    bpm: 152, root: 57, mode: 'maj', wave: 'triangle',
    desc: '白色雪夜里最出名的那段副歌。慢拍长音，判定环会安静很多。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'vi', 'IV', 'V'], m: `
        1 r 3 r 5 r 3 r | 6 r 5 r 3 r 2 r | 4 r 3 r 2 r 3 r | 2 r 3 r 2 r 1 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        3 3 2 3 5 r 3 r | 2 2 1 2 3 r 1 r | 6 6 5 6 1^ r 6 r | 5 5 4 5 6 r 5 r
        3 3 2 3 5 r 5 r | 6 6 5 6 7 r 6 r | 5 5 4 4 3 3 2 2 | 3 r 2 r 1 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['IV', 'V', 'iii', 'vi', 'IV', 'V', 'V', 'V'], m: `
        4 4 4 r 5 r 5 r | 6 6 6 r 7 r 7 r | 1^ 1^ 7 r 6 r 6 r | 5 5 6 5 4 4 5 r
        4 4 4 r 5 r 5 r | 6 6 6 r 7 r 7 r | 1^ 1^ 2^ r 3^ r 2^ r | 7 6 5 4 5 r 7 r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        5 r 3 r 5 6 5 r | 3 r 5 r 6 r 5 r | 4 r 5 r 6 7 6 r | 5 r 6 r 7 r 6 r
        5 r 3 r 5 6 5 r | 1^ r 6 r 5 r 3 r | 4 r 5 r 4 5 6 r | 5 r 2 r 1 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 r 5 r 6 r 5 r | 3 r 2 r 3 r 2 r | 1:3 r r` },
    ],
  },
  {
    id: 'kiseki',
    n: 'それは僕たちの奇跡',
    sub: 'μ\'s · 3期 OP',
    bpm: 155, root: 52, mode: 'min', wave: 'sawtooth',
    desc: '小调的奇迹。前奏压着走，副歌陡然抬起来——鼓也跟着翻倍。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 1 3 1 5 1 3 1 | 6 6 5 6 1^ 6 5 3 | 3 3 5 3 7 3 5 3 | 7 6 5 6 5 4 3 r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1 r 5 r 5 5 5 r | 7 r 5 r 5 5 5 r | 6 r 6 r 6 6 6 r | 5 5 4 5 6 r r r
        1 r 5 r 5 5 5 r | 7 r 5 r 5 5 5 r | 6 r 6 r 7 r 1^ r | 5 r 4 r 5 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['VI', 'VII', 'i', 'i', 'VI', 'VII', 'V', 'V'], m: `
        6 6 6 6 7 7 7 7 | 1^ 1^ 1^ 1^ 2^ 2^ 2^ 2^ | 7 7 7 7 6 6 6 6 | 5 5 5 5 4 4 5 r
        6 6 6 6 7 7 7 7 | 1^ 1^ 1^ 1^ 2^ 2^ 2^ 2^ | 3^ 3^ 2^ 2^ 1^ 1^ 7 7 | 5 6 7 6 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['i', 'VII', 'VI', 'VII', 'i', 'VII', 'VI', 'V'], m: `
        1^ 1^ 7 6 5 5 6 5 | 1^ 1^ 7 6 5 r 3 r | 6 6 5 6 7 7 6 7 | 1^ 1^ 7 1^ 6 r 5 r
        1^ 1^ 7 6 5 5 6 5 | 3^ 3^ 2^ 1^ 7 r 5 r | 6 6 7 6 5 5 4 5 | 5 4 3 2 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['i', 'VI', 'III', 'VII'], m: `
        1 3 5 6 5 3 1 3 | 5 6 7 1^ 7 6 5 3 | 6 5 6 7 1^ 7 6 5 | 3 4 5 4 3 2 1 r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['VI', 'VII', 'i'], m: `
        6 r 7 r 1^ r 7 r | 6 r 5 r 6 r 7 r | 1:3 r r` },
    ],
  },
  {
    id: 'natsuiro',
    n: '夏色えがおで1,2,Jump!',
    sub: 'μ\'s · 单曲',
    bpm: 185, root: 60, mode: 'maj', wave: 'square',
    desc: '夏日晴天进行曲。跳跃的短音符最多，玩起来最像「蹦蹦跳跳」。',
    secs: [
      { tag: '开场', e: 1, rep: 1, ch: ['I', 'IV', 'V', 'I'], m: `
        1 3 5 3 1 3 5 3 | 4 6 1^ 6 4 6 1^ 6 | 5 7 2^ 7 5 7 2^ 7 | 5 4 3 2 1 r r r` },
      { tag: '主歌', e: 2, rep: 1, ch: ['I', 'vi', 'IV', 'V', 'I', 'vi', 'IV', 'V'], m: `
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 4 4 3 3 4 4 2 2 | 5 5 4 4 3 3 2 2
        1 1 3 3 5 5 3 3 | 6 6 5 5 6 6 1^ 1^ | 7 7 6 6 5 5 6 6 | 5 r 4 r 3 r r r` },
      { tag: '预副歌', e: 2, rep: 1, ch: ['IV', 'V', 'iii', 'vi', 'ii', 'V', 'V', 'V'], m: `
        4 4 4 4 5 5 5 5 | 6 6 6 6 7 7 7 7 | 3 3 3 3 4 4 4 4 | 5 5 5 5 6 6 6 6
        2 2 2 2 3 3 3 3 | 4 4 4 4 5 5 5 5 | 6 6 7 7 1^ 1^ 2^ 2^ | 7 7 6 6 5 r r r` },
      { tag: '副歌', e: 3, rep: 2, ch: ['I', 'IV', 'V', 'I', 'vi', 'IV', 'V', 'I'], m: `
        5 5 5 3 5 5 6 5 | 4 4 4 2 4 4 5 4 | 3 3 3 1 3 3 4 3 | 2 2 3 2 5 r 5 r
        5 5 5 3 5 5 6 5 | 1^ 1^ 1^ 6 1^ 1^ 2^ 1^ | 7 7 6 6 5 5 4 4 | 5 4 3 2 1 r r r` },
      { tag: '间奏', e: 3, rep: 1, ch: ['I', 'vi', 'ii', 'V'], m: `
        1 5 3 5 1 5 3 5 | 6 3^ 1^ 3^ 6 3^ 1^ 3^ | 2 6 4 6 2 6 4 6 | 5 7 2^ 7 5 r r r` },
      { tag: '尾声', e: 1, rep: 1, ch: ['IV', 'V', 'I'], m: `
        4 4 4 4 5 5 5 5 | 3 4 5 5 6 6 7 7 | 1^:3 r r` },
    ],
  },
  ...IP_SONGS,
];

// ------------------------------------------------------------------ 级数 → 半音
// 大调：I ii iii IV V vi vii；小调用自然小调级位（V 级按和声小调升三半音处理成大和弦）。
const MAJ = { I: [0, 'M'], ii: [2, 'm'], iii: [4, 'm'], IV: [5, 'M'], V: [7, 'M'], vi: [9, 'm'], vii: [11, 'd'] };
const MIN = { i: [0, 'm'], ii: [2, 'd'], III: [3, 'M'], iv: [5, 'm'], v: [7, 'm'], V: [7, 'M'], VI: [8, 'M'], VII: [10, 'M'] };
const SCALE_MAJ = [0, 2, 4, 5, 7, 9, 11];
const SCALE_MIN = [0, 2, 3, 5, 7, 8, 10];

// 解析一条旋律：返回 [{ deg, oct, acc, dur, rest }]，并校验每小节 4 拍。
function parseMel(m) {
  // 小节分隔除了 |，还认换行（长段落折行写时忘画 | 也不至于悄悄错位）
  const bars = m.split(/\||\n/).filter((b) => b.trim());
  const out = [];
  bars.forEach((bar, bi) => {
    let sum = 0;
    for (let tok of bar.trim().split(/\s+/)) {
      if (!tok) continue;
      let rest = false;
      const mr = tok.match(/^r(?::([\d.]+))?$/);
      if (mr) rest = true;
      const mo = mr || tok.match(/^([v^]?)([b#]?)([1-7])([v^]?)?(?::([\d.]+))?$/);
      if (!mo) throw new Error('旋律记号看不懂：' + tok);
      let d = mr ? (mr[1] != null ? parseFloat(mr[1]) : 0.5) : (mo[5] != null ? parseFloat(mo[5]) : 0.5);
      if (!(d > 0) || d > 8) throw new Error('拍数不对：' + tok);
      sum += d;
      const om = (mr ? '' : (mo[1] || mo[4] || ''));
      out.push({
        deg: mr ? 1 : +mo[3], oct: om === '^' ? 1 : om === 'v' ? -1 : 0,
        acc: mr ? '' : mo[2], dur: d, rest,
      });
    }
    if (Math.abs(sum - 4) > 1e-6) throw new Error(`第 ${bi + 1} 小节拍了 ${sum} 拍（应为 4）`);
  });
  return out;
}

// 把一首歌编成「事件表」：旋律、和弦、鼓。谱面生成只吃这张表。
function arrange(song) {
  const scale = song.mode === 'min' ? SCALE_MIN : SCALE_MAJ;
  const table = song.mode === 'min' ? MIN : MAJ;
  const spb = 60 / song.bpm;                 // 一拍几秒
  const deg2semi = (deg, acc) => {
    let s = scale[deg - 1];
    if (acc === '#') s += 1;
    if (acc === 'b') s -= 1;
    return s;
  };
  const chords = [];
  const notes = [];
  const drums = [];
  let bar = 0;
  for (const sec of song.secs) {
    const mel = parseMel(sec.m);
    const melBars = Math.ceil(mel.reduce((a, x) => a + x.dur, 0) / 4);
    for (let r = 0; r < (sec.rep || 1); r++) {
      // 这一遍的和弦表：按小节循环
      for (let b = 0; b < melBars; b++) {
        const rn = sec.ch[(b) % sec.ch.length];
        const def = table[rn];
        if (!def) throw new Error(`${song.n}：和弦级数 ${rn} 不在 ${song.mode} 表里`);
        const t0 = (bar + b) * 4 * spb;
        chords.push({ t: t0, d: 4 * spb, off: def[0], type: def[1] });
      }
      // 旋律：逐音符铺
      let beat = 0;
      for (const nt of mel) {
        const t = (bar * 4 + beat) * spb;
        if (!nt.rest) {
          const midi = song.root + 12 + deg2semi(nt.deg, nt.acc) + nt.oct * 12;
          notes.push({ t, d: nt.dur * spb, m: midi, sec: sec.tag, e: sec.e });
        }
        beat += nt.dur;
      }
      // 鼓组按能量铺
      for (let b = 0; b < melBars; b++) {
        const t0 = (bar + b) * 4 * spb;
        const e = sec.e;
        if (e >= 1) { drums.push({ t: t0, k: 'k' }); drums.push({ t: t0 + 2 * spb, k: 'k' }); }
        if (e >= 2) {
          drums.push({ t: t0 + spb, k: 's' }); drums.push({ t: t0 + 3 * spb, k: 's' });
          for (let i = 0; i < 8; i++) drums.push({ t: t0 + i * 0.5 * spb, k: i % 2 ? 'h' : 'H' });
          drums.push({ t: t0 + 2.5 * spb, k: 'k' });
        }
        if (e >= 3) {
          drums.push({ t: t0 + 3.5 * spb, k: 'k' });
          drums.push({ t: t0 + 1.75 * spb, k: 'h' }); drums.push({ t: t0 + 3.75 * spb, k: 'h' });
        }
        if (e <= 1) { drums.push({ t: t0 + spb, k: 'h' }); drums.push({ t: t0 + 3 * spb, k: 'h' }); }
      }
      // 段落开头给一记 crash（第一遍才给，避免副歌反复两遍都炸）
      if (r === 0 && bar > 0 && sec.e >= 2) drums.push({ t: bar * 4 * spb, k: 'c' });
      bar += melBars;
    }
  }
  const beats = bar * 4;
  // 每个旋律音到下一个旋律音的间隔（含休止）：乐句尾的音后面跟着一串休止，
  // 谱面生成用它判断「这里可以拉一条长条」。
  for (let i = 0; i < notes.length; i++) {
    notes[i].gap = (i + 1 < notes.length ? notes[i + 1].t : beats * spb) - notes[i].t;
  }
  return { bpm: song.bpm, spb, beats, dur: beats * spb + spb, chords, notes, drums };
}
return { SONGS, arrange };
})();

// ---- js/ll/audio.js
const m_audio = await (async () => {

// 声音：两条音源线路 + 一套判定音效。
//
//   ① 原曲线路 —— 解码后的 AudioBuffer 直接排进 AudioContext，时钟就是
//      ac.currentTime；暂停用 ac.suspend()，恢复后 currentTime 接着走，
//      音画判定天然同步。
//   ② 芯片线路 —— 没有导入原曲时的兜底：把 songs.js 的事件表交给前瞻调度器，
//      每 80ms 醒一次，把未来 0.3 秒的旋律/贝斯/和弦/鼓按 ac.currentTime 精确排期。
//      事件表从 0 秒开始，而谱面第一条音符落在 lead 秒（见 analyze.js 的
//      chartFromArr）：这 lead 秒是「音符飞进来」的时间，音乐必须跟着往后挪，
//      否则每个音都会在听到之后 lead 秒才被敲到——整首听起来都踩在反拍上。
//
// 音效单独一路增益（fxGain）：原曲本身就响，判定音得不靠音量的运气。
// 五档判定各有一套音色（亮铃+实心一击 / 软铃 / 木鱼 / 闷响 / 嗡嗡下坠），
// 每一下都垫一个 60ms 的低频「砸」——这是打击感的来源，光有高频叮当只有塑料味。

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// decodeAudioData 只会重采样，不会减声道。手机上最吃内存的就是这两条 4 字节浮点
// 声道，混成单声道再省一半（听歌、外放都听不出差别）。
function toMono(buf, OC) {
  if (!buf || buf.numberOfChannels < 2) return buf;
  try {
    const n = buf.length;
    const ch = buf.numberOfChannels;
    const m = new OC(1, 1, buf.sampleRate).createBuffer(1, n, buf.sampleRate);
    const out = m.getChannelData(0);
    for (let c = 0; c < ch; c++) {
      const src = buf.getChannelData(c);
      for (let i = 0; i < n; i++) out[i] += src[i];
    }
    const k = 1 / ch;
    for (let i = 0; i < n; i++) out[i] *= k;
    return m;
  } catch (e) {
    return buf;                        // 混不了就照原样用，别为了省内存把歌弄没了
  }
}

const Audio = {
  ac: null,
  master: null,
  limiter: null,
  musGain: null,
  fxGain: null,
  muted: false,
  playing: false,
  mode: 'idle',     // 'buffer' | 'chip'
  node: null,       // 原曲的 BufferSource
  t0: 0,            // 曲目零点（ac 时间轴）
  leadIn: 0,        // 芯片线路的前奏留白（秒）：音乐整体后挪这么久，跟谱面对齐
  usePerf: false,   // 没有可用的 AudioContext 时，用 performance.now 走表
  pt0: 0,
  evs: [],
  ei: 0,
  timer: 0,
  wave: 'square',
  vol: { mus: 0.6, fx: 0.78 },
  lite: false,          // 上一次解码是不是走了「22.05k 单声道」降级路
  forceLite: false,     // 强制走降级路（省内存 / 测试）
  lastDecodeErr: '',

  ensure() {
    if (this.ac) {
      if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      return this.ac;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    // 音游要最低延迟：明说 interactive（有的浏览器默认是 balanced），不支持这个参数就退回无参
    try { this.ac = new AC({ latencyHint: 'interactive' }); } catch (e) { try { this.ac = new AC(); } catch (e2) { return null; } }
    const ac = this.ac;
    this.master = ac.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    // 判定音和原曲会同时砸下来，加起来容易超过 1.0（手机上就是破音）。
    // 串一个温和的限幅：阈值 -3dB、12:1，只在峰值上动手，平时听不出压缩。
    if (ac.createDynamicsCompressor) {
      const lim = ac.createDynamicsCompressor();
      lim.threshold.value = -3;
      lim.knee.value = 0;
      lim.ratio.value = 12;
      lim.attack.value = 0.002;
      lim.release.value = 0.12;
      this.master.connect(lim);
      lim.connect(ac.destination);
      this.limiter = lim;
    } else {
      this.master.connect(ac.destination);
    }
    this.musGain = ac.createGain();
    this.musGain.gain.value = this.vol.mus * this.vol.mus;
    this.musGain.connect(this.master);
    this.fxGain = ac.createGain();
    this.fxGain.gain.value = this.vol.fx * this.vol.fx;
    this.fxGain.connect(this.master);
    return ac;
  },

  setMute(m) {
    this.muted = !!m;
    if (this.master) this.master.gain.value = this.muted ? 0 : 1;
  },

  // 音量独立调：原曲常常比现场合成的响一截，两边得能分开拧
  setVol(mus, fx) {
    if (mus != null) this.vol.mus = mus;
    if (fx != null) this.vol.fx = fx;
    if (this.musGain) this.musGain.gain.value = this.vol.mus * this.vol.mus;
    if (this.fxGain) this.fxGain.gain.value = this.vol.fx * this.vol.fx;
  },

  // 解码。手机上一首 4 分钟的原曲解出来是 90MB 的浮点 PCM（双声道 44.1k），
  // 内存紧的机器 decodeAudioData 会直接抛 EncodingError —— 页面随后退回芯片，
  // 用户听到的就是「电子音」。所以这里留一条降级路：用离线上下文按 22.05k
  // 单声道重解，内存降到 1/4，音质差一档但原曲还在。AudioBuffer 可以跨
  // context 使用，解出来的照样喂给主线路播放。
  async decode(data) {
    this.lite = false;
    this.lastDecodeErr = '';
    const ac = this.ensure();
    if (!ac) throw new Error('浏览器不支持 WebAudio');
    // 每次解码都用一份新的字节：Safari 会把传进 decodeAudioData 的 ArrayBuffer
    // transfer 掉（detach），同一份拿两次会失败
    const once = (ctx) => new Promise((res, rej) => {
      // 老 Safari 只认回调式；新浏览器返回 Promise
      let p;
      try { p = ctx.decodeAudioData(data.slice(0), res, rej); } catch (e) { rej(e); return; }
      if (p && typeof p.then === 'function') p.then(res, rej);
    });
    try {
      // forceLite：跳过主路径直接走降级（测试用，也当「省内存模式」的钩子）
      if (this.forceLite) throw new Error('force-lite');
      return await once(ac);
    } catch (e) {
      this.lastDecodeErr = (e && (e.name || e.message)) || String(e);
      const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (OC) {
        try {
          const off = new OC(1, 1, 22050);
          const buf = await once(off);
          if (buf) { this.lite = true; return toMono(buf, OC); }
        } catch (e2) { this.lastDecodeErr += ' / 降级也失败：' + ((e2 && (e2.name || e2.message)) || e2); }
      }
      throw e;
    }
  },

  // 曲目时间（秒）。暂停靠 ac.suspend()，currentTime 会停住。
  // 手感相关的两处修正（点击判定全靠这个钟）：
  //  1) ac.currentTime 是按渲染块（128 帧 ≈ 3~6ms，Safari / Firefox 更粗）跳的，直接读会让每一帧的 now 抖几毫秒、
  //     连按时判定忽早忽晚；这里记下「上次读到变化时的 performance.now」，两次变化之间按墙钟外推（最多 50ms，
  //     暂停 / 挂起时不外推），再保证不倒退。
  //  2) 声音从 currentTime 到真正进耳朵还有输出延迟（outputLatency，蓝牙耳机能到 150ms+）：玩家是照「听到的」点，
  //     所以曲目时间要减掉它（浏览器不报就是 0，行为和以前一样）。
  time() {
    if (!this.playing) return 0;
    if (this.ac && !this.usePerf) {
      const ac = this.ac, p = performance.now(), ct = ac.currentTime;
      if (ct !== this._ct) { this._ct = ct; this._cp = p; }
      const ext = ac.state === 'running' ? Math.min(0.05, Math.max(0, (p - this._cp) / 1000)) : 0;
      const lat = Math.min(0.25, Math.max(0, Number(ac.outputLatency) || 0));
      let r = ct + ext - lat - this.t0;
      if (this._rt != null && r < this._rt && this._rt - r < 0.04) r = this._rt;   // 外推过头了，别倒退
      this._rt = r;
      return Math.max(0, r);
    }
    return Math.max(0, performance.now() / 1000 - this.pt0);
  },

  // ---------------------------------------------------------------- 原曲
  playBuffer(buffer, fromSec) {
    const ac = this.ensure();
    this.stop();
    if (!ac) return false;
    const from = Math.max(0, fromSec || 0);
    const src = ac.createBufferSource();
    src.buffer = buffer;
    src.connect(this.musGain);
    const at = ac.currentTime + 0.22;
    try { src.start(at, from); } catch (e) { return false; }
    this.node = src;
    this.mode = 'buffer';
    this.usePerf = false;
    this.t0 = at - from; this._rt = null; this._ct = -1;
    this.playing = true;
    return true;
  },

  // 只有时钟、没有音乐：自制谱面在本机找不到音频时的兜底（判定音照样响）
  playClock() {
    const ac = this.ensure();
    this.stop();
    this.mode = 'clock';
    if (ac) {
      this.usePerf = false;
      this.t0 = ac.currentTime + 0.05; this._rt = null; this._ct = -1;
    } else {
      this.usePerf = true;
      this.pt0 = performance.now() / 1000;
    }
    this.playing = true;
    return true;
  },

  // ---------------------------------------------------------------- 芯片
  // leadIn：谱面里第一条音符在 lead 秒，这段时间是「音符飞进来」。
  // 事件表本身从 0 秒开始，所以整条音乐往后挪 leadIn，两条时间轴才对得上。
  playChip(arr, wave, leadIn) {
    const ac = this.ensure();
    this.stop();
    this.wave = wave || 'square';
    this.mode = 'chip';
    this.leadIn = Math.max(0, Number(leadIn) || 0);
    if (!ac || ac.state === 'suspended') {
      // 拿不到声就只走表：照样能玩，只是没声
      this.usePerf = true;
      this.pt0 = performance.now() / 1000;
      this.playing = true;
      return true;
    }
    this.usePerf = false;
    const evs = [];
    for (const n of arr.notes) evs.push({ t: n.t, d: n.d, m: n.m, kind: 'mel' });
    for (const c of arr.chords) {
      evs.push({ t: c.t, d: c.d, m: c.off, kind: 'bass' });
      evs.push({ t: c.t, d: c.d, off: c.off, type: c.type, kind: 'chord' });
    }
    for (const d of arr.drums) evs.push({ t: d.t, kind: d.k });
    evs.sort((a, b) => a.t - b.t);
    this.evs = evs;
    this.ei = 0;
    this.t0 = ac.currentTime + 0.12; this._rt = null; this._ct = -1;
    this.playing = true;
    const tick = () => {
      if (!this.playing || this.mode !== 'chip') return;
      const horizon = ac.currentTime + 0.3;
      while (this.ei < this.evs.length && this.t0 + this.leadIn + this.evs[this.ei].t < horizon) {
        this.voice(this.evs[this.ei], this.t0 + this.leadIn + this.evs[this.ei].t);
        this.ei++;
      }
      this.timer = setTimeout(tick, 80);
    };
    tick();
    return true;
  },

  stop() {
    this.playing = false;
    if (this.timer) { clearTimeout(this.timer); this.timer = 0; }
    if (this.node) {
      try { this.node.stop(); } catch (e) { /* 已经停了 */ }
      try { this.node.disconnect(); } catch (e) { /* 已经断了 */ }
      this.node = null;
    }
    this.evs = [];
    this.ei = 0;
    if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {});
  },

  suspend() {
    // 没有声卡的兜底时钟（usePerf）也要跟着停，不然暂停时谱面自己在跑
    if (this.usePerf) {
      if (this.playing && this._psAt == null) this._psAt = performance.now() / 1000;
      return;
    }
    if (this.ac) { if (this.ac.state === 'running') this.ac.suspend().catch(() => {}); }
    else if (this.playing) this._psAt = performance.now() / 1000;
  },
  resume() {
    if (this.usePerf) {
      if (this._psAt != null) { this.pt0 += performance.now() / 1000 - this._psAt; this._psAt = null; }
      if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {});
      return;
    }
    if (this.ac) { if (this.ac.state === 'suspended') this.ac.resume().catch(() => {}); }
    else if (this.playing) {
      if (this._psAt != null) { this.pt0 += performance.now() / 1000 - this._psAt; this._psAt = null; }
    }
  },

  /* ---------------------------------------------------------------- 芯片音色 */
  env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.001, t + a + d);
  },

  voice(ev, t) {
    const ac = this.ac;
    if (ev.kind === 'mel') {
      const dur = Math.max(0.1, Math.min(ev.d * 0.92, 0.9));
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.012, dur, 0.075);
      const o = ac.createOscillator();
      o.type = this.wave;
      o.frequency.value = mtof(ev.m);
      const o2 = ac.createOscillator();
      o2.type = 'triangle';
      o2.frequency.value = mtof(ev.m) * 2.002;
      const g2 = ac.createGain();
      g2.gain.value = 0.35;
      o.connect(g); o2.connect(g2); g2.connect(g);
      o.start(t); o.stop(t + dur + 0.05);
      o2.start(t); o2.stop(t + dur + 0.05);
      return;
    }
    if (ev.kind === 'bass') {
      const g = ac.createGain();
      g.connect(this.musGain);
      this.env(g, t, 0.02, ev.d * 0.95, 0.09);
      const o = ac.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(mtof(36 + ev.m), t);
      o.connect(g);
      o.start(t); o.stop(t + ev.d + 0.05);
      return;
    }
    if (ev.kind === 'chord') {
      const iv = ev.type === 'm' ? [0, 3, 7] : ev.type === 'd' ? [0, 3, 6] : [0, 4, 7];
      for (const ivl of iv) {
        const g = ac.createGain();
        g.connect(this.musGain);
        this.env(g, t, 0.05, ev.d * 0.9, 0.018);
        const o = ac.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(48 + ev.off + ivl);
        o.connect(g);
        o.start(t); o.stop(t + ev.d + 0.05);
      }
      return;
    }
    this.drum(ev.kind, t);
  },

  drum(k, t) {
    const ac = this.ac;
    if (k === 'k') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.1);
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(this.musGain);
      o.start(t); o.stop(t + 0.15);
      return;
    }
    const dur = k === 's' ? 0.12 : k === 'H' ? 0.03 : k === 'h' ? 0.05 : 0.5;
    const vol = k === 's' ? 0.075 : k === 'H' ? 0.02 : k === 'h' ? 0.03 : 0.05;
    const hp = k === 's' ? 1200 : k === 'c' ? 4000 : 6500;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (dur + 0.02)), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(this.musGain);
    n.start(t); n.stop(t + dur + 0.02);
  },

  /* ---------------------------------------------------------------- 判定音效 */
  // 学 SIF 的手感：每一下都是极短、极亮、带一点噪声「啪」的电子音。
  // 音高不是固定的——连击每 10 下一个台阶（五声音阶，两个八度内循环），
  // 左右声道按第几格偏一点声像。连打起来会自己长出一条旋律，
  // 「贴不贴节奏」靠的就是「短、准、有音高」这三件事。
  //
  // 五档是五种手感，不是五档音量：
  //   PERFECT 亮铃 + 一记实心低频（最实、最亮，打在手指上）
  //   GREAT   软铃 + 半记低频（好听但不抢）
  //   GOOD    木鱼：只有中频「哒」，没有低频，明显比上一档空
  //   BAD     闷响：低、短、脏，一听就知道没打准
  //   MISS    往下掉的嗡嗡（不垫低频，避免和音乐的低音糊在一起）
  scaleRoot: 60,
  setScale(root) { this.scaleRoot = Number(root) || 60; },

  // 声像宿主：九格从左到右 -0.6 ~ +0.6；浏览器不支持就直连
  bus(pan) {
    const ac = this.ac;
    if (!pan || !ac.createStereoPanner) return this.fxGain;
    const p = ac.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.fxGain);
    return p;
  },

  // 连击 → 音高：每 10 连击升一级，五声音阶走完升八度，最高两圈
  hitFreq(combo) {
    const PENT = [0, 2, 4, 7, 9];
    const c = Math.max(0, combo || 0);
    return mtof(this.scaleRoot + 12 + PENT[Math.floor(c / 10) % 5] + (Math.floor(c / 50) % 2) * 12);
  },

  tone(t, freq, dur, vol, type, glide, dest) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(30, glide), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest || this.fxGain);
    o.start(t); o.stop(t + dur + 0.02);
  },

  // 打击感的那一半：正弦从 186Hz 掉到 58Hz、70ms 收干。
  // 手机小喇叭放不出 60Hz，但谐波和二三次谐波还在，耳朵听成「咚」，
  // 手指按下去的那一下就有了「打实了」的反馈。
  punch(t, vol, dest) {
    const ac = this.ac;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(186, t);
    o.frequency.exponentialRampToValueAtTime(58, t + 0.055);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.085);
    o.connect(g); g.connect(dest || this.fxGain);
    o.start(t); o.stop(t + 0.1);
  },

  click(t, dur, vol, hp, dest) {
    const ac = this.ac;
    const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * (dur + 0.01)), ac.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3);
    }
    const n = ac.createBufferSource();
    n.buffer = buf;
    const f = ac.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = hp || 2400;
    f.Q.value = 0.9;
    const g = ac.createGain();
    g.gain.value = vol;
    n.connect(f); f.connect(g); g.connect(dest || this.fxGain);
    n.start(t); n.stop(t + dur + 0.01);
  },

  fx(kind, combo, lane) {
    const ac = this.ac;
    if (!ac || this.usePerf || ac.state !== 'running') return;
    const t = ac.currentTime;
    const pan = lane == null ? 0 : ((lane - 4) / 4) * 0.55;
    const out = this.bus(pan);
    const f = this.hitFreq(combo);
    switch (kind) {
      case 'p':
        // 亮铃：实心低频 + 基音 + 两个高泛音 + 一记玻璃脆响，60ms 内收干
        this.punch(t, 0.17, out);
        this.tone(t, f * 1.5, 0.1, 0.1, 'sine', null, out);
        this.tone(t, f * 2, 0.055, 0.055, 'sine', null, out);
        this.tone(t, f * 3, 0.032, 0.03, 'sine', null, out);
        this.click(t, 0.016, 0.07, 4600, out);
        break;
      case 'g':
        // 软铃：同样的音高关系，低频减半、少一个泛音
        this.punch(t, 0.09, out);
        this.tone(t, f, 0.085, 0.085, 'sine', null, out);
        this.tone(t, f * 2, 0.042, 0.035, 'sine', null, out);
        this.click(t, 0.013, 0.045, 3600, out);
        break;
      case 'go':
        // 木鱼：中频三角波 + 一点噪声，没有低频——「打到了，但没打准」
        this.tone(t, f * 0.75, 0.06, 0.08, 'triangle', null, out);
        this.click(t, 0.018, 0.045, 1400, out);
        break;
      case 'b':
        this.tone(t, 196, 0.09, 0.115, 'sawtooth', 118, out);
        this.click(t, 0.03, 0.05, 680, out);
        break;
      case 'm':
        this.tone(t, 212, 0.22, 0.1, 'square', 84, out);
        this.tone(t + 0.02, 106, 0.19, 0.06, 'sine', 62, out);
        break;
      case 'hold':
        // 尾音：两个音的小上扬，比判定音更「收」
        this.tone(t, f * 1.25, 0.09, 0.06, 'triangle', null, out);
        this.tone(t + 0.045, f * 1.5, 0.1, 0.05, 'sine', null, out);
        break;
      case 'holdstart':
        // 跟判定音同时响，只留一点点「咬住」的质感，别叠成一团
        this.click(t, 0.02, 0.035, 1900, out);
        break;
      case 'break':
        this.tone(t, 300, 0.12, 0.08, 'sawtooth', 158, out);
        break;
      case 'skill':
        this.tone(t, 1046, 0.07, 0.06, 'triangle', null, out);
        this.tone(t + 0.06, 1318, 0.07, 0.06, 'triangle', null, out);
        this.tone(t + 0.12, 1568, 0.11, 0.07, 'triangle', null, out);
        break;
      case 'combo':
        this.tone(t, f * 2, 0.06, 0.05, 'sine', null, out);
        this.tone(t + 0.05, f * 3, 0.08, 0.045, 'sine', null, out);
        break;
      default:
        break;
    }
  },
};
return { Audio };
})();

// ---- js/ll/diffs.js
const m_diffs = await (async () => {

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
const STAM_LOSS = 5.5;

const DIFFS = [
  { k: 'easy',   n: 'EASY',   win: [0.068, 0.122, 0.172, 0.222], lead: 1.85, gap: 0.62,  hold: 0.45, holdCap: 0.11, holdAt: 1, maxTail: 1.1, holdCd: 2.2, jump: 2, tapQ: 0.46, dbl: 0,    dblHold: 0,    stam: STAM_LOSS, pad: 0.20 },
  { k: 'normal', n: 'NORMAL', win: [0.052, 0.098, 0.148, 0.198], lead: 1.55, gap: 0.33,  hold: 0.72, holdCap: 0.15, holdAt: 2, maxTail: 1.4, holdCd: 1.9, jump: 2, tapQ: 0.28, dbl: 0.07, dblHold: 0.30, stam: STAM_LOSS, pad: 0.45 },
  { k: 'hard',   n: 'HARD',   win: [0.046, 0.090, 0.135, 0.185], lead: 1.28, gap: 0.19,  hold: 0.88, holdCap: 0.18, holdAt: 2, maxTail: 1.8, holdCd: 1.6, jump: 3, tapQ: 0.12, dbl: 0.16, dblHold: 0.55, stam: STAM_LOSS, pad: 0.70 },
  { k: 'expert', n: 'EXPERT', win: [0.042, 0.082, 0.125, 0.170], lead: 1.08, gap: 0.115, hold: 0.95, holdCap: 0.20, holdAt: 2, maxTail: 2.0, holdCd: 1.4, jump: 4, tapQ: 0.03, dbl: 0.26, dblHold: 0.70, stam: STAM_LOSS, pad: 0.95 },
];

const diffOf = (k) => DIFFS.find((d) => d.k === k) || DIFFS[1];
return { STAM_LOSS, DIFFS, diffOf };
})();

// ---- js/ll/analyze.js
const m_analyze = await (async () => {

// 谱面生成 v3：两条路线，同一种产物。
//
//   ① 原曲路线 —— 把解码后的 AudioBuffer 拆成三条频段（低/中/高）的能量包络，
//      每条各自做「相对通量」起音检测，再合起来取局部极大。
//      每个起音顺手补三个属性，谱面就靠它们贴合原曲：
//        · d（拖了多久）—— 中频持续发声的长度：原曲里拖住的长音变长条；
//        · p（音高 0~1）—— 8.8k 采样上的自相关基频，决定落在哪一格
//          （旋律往上走，音符跟着往右移）；
//        · b（[低, 中, 高] 三段通量）—— 判断这道重音有多「宽」，
//          宽的地方才配双押 / 双长按。
//      分轨时按音高排名等分九格，全曲的音高分布再偏也能把九格用满。
//   ② 芯片改编路线 —— 走 songs.js 的 arrange() 事件表（旋律 + 鼓），
//      没有导入原音时的默认音源，谱面由旋律的音高与时长生成。
//
// 产物统一是 { notes, dur, src }，notes 里每条：
//   { t, lane 0~8, kind: 'tap'|'hold', tail, s, b }（s = 强度 0~1，只影响表现）
// 同一时刻的两条 note 就是双押，两条都是 hold 就是双长按（最多两根）。

/* ================================================================ 随机 */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/* ================================================================ 声道合并 */
function monoMix(buf) {
  const nCh = Math.min(2, buf.numberOfChannels || 1);
  const a = buf.getChannelData(0);
  if (nCh < 2) return a;
  const b = buf.getChannelData(1);
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = (a[i] + b[i]) * 0.5;
  return out;
}

/* ================================================================ 音高 */
// 音区必须来自「这个音到底多高」，不能来自频谱重心——重心量的是亮度，
// 一进副歌加了镲片就整片往右跑，谱面看着像乱撒。
// 这里在 8.8kHz 上做归一化自相关，取 130~1000Hz 里第一个像样的峰当基频，
// 再对八度错误做一次纠正。算一个点两万次乘加，一首歌几十毫秒。
const PBASE = 140, PTOP = 1000;
const decBuf = new Float64Array(512);
function pitchAt(x, sr, t, prevF0) {
  const start = Math.round((t + 0.008) * sr);
  const n = 2048, dec = Math.max(2, Math.round(sr / 8820));
  const m = Math.floor(n / dec);
  // 抽取 + 去直流
  let mean = 0;
  for (let i = 0; i < m * dec; i++) mean += x[start + i] || 0;
  mean /= Math.max(1, m * dec);
  for (let i = 0; i < m; i++) {
    let s = 0;
    for (let k = 0; k < dec; k++) s += (x[start + i * dec + k] || 0) - mean;
    decBuf[i] = (s / dec) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / m));
  }
  const sr2 = sr / dec;
  const kmin = Math.max(2, Math.floor(sr2 / PTOP));
  const kmax = Math.min(m - 2, Math.ceil(sr2 / PBASE));
  if (kmax <= kmin + 2) return null;
  let e0 = 0;
  for (let i = 0; i < m; i++) e0 += decBuf[i] * decBuf[i];
  if (e0 <= 1e-9) return null;
  let best = 0;
  const r = new Float64Array(kmax + 2);
  for (let k = kmin - 1; k <= kmax + 1; k++) {
    let num = 0, e1 = 0;
    const lim = m - k;
    for (let i = 0; i < lim; i++) {
      num += decBuf[i] * decBuf[i + k];
      e1 += decBuf[i + k] * decBuf[i + k];
    }
    const v = e1 > 0 ? num / Math.sqrt(e0 * e1) : 0;
    r[k] = v;
    if (k >= kmin && k <= kmax && v > best) best = v;
  }
  if (best < 0.28) return null;                         // 没有像样的周期性
  // 所有够高的局部峰都是候选（含八度关系），再挑一个「和上一个音最连贯」的。
  // 只看最高峰会因为八度错误让旋律整段乱跳，谱面跟着上下乱窜。
  const cands = [];
  for (let k = kmin + 1; k < kmax; k++) {
    if (r[k] < 0.28 || r[k] < 0.72 * best) continue;
    if (r[k] < r[k - 1] || r[k] < r[k + 1]) continue;
    const y0 = r[k - 1], y1 = r[k], y2 = r[k + 1];
    const den = y0 - 2 * y1 + y2;
    const shift = Math.abs(den) > 1e-9 ? clamp((0.5 * (y0 - y2)) / den, -0.5, 0.5) : 0;
    cands.push({ f0: sr2 / (k + shift), conf: y1 });
  }
  if (!cands.length) return null;
  let pick = cands[0];
  if (prevF0 > 0) {
    let bs = -9;
    for (const c of cands) {
      const oct = Math.abs(Math.log2(c.f0 / prevF0));
      const score = c.conf - 0.30 * Math.min(3, oct);   // 每个八度罚 0.30
      if (score > bs) { bs = score; pick = c; }
    }
  } else {
    for (const c of cands) if (c.conf > pick.conf) pick = c;
  }
  const p = (Math.log2(pick.f0) - Math.log2(PBASE)) / (Math.log2(PTOP) - Math.log2(PBASE));
  return { p: clamp(p, 0, 1), conf: pick.conf, f0: pick.f0 };
}

/* ================================================================ 频段分析 */
// 一条链：200Hz 两点低通（低）、200~2k 带通（中）、2k 以上高通（高）。
// 全部一阶，逐样本递推——比每帧做 FFT 便宜一个数量级，20 秒的歌也就几十毫秒。
const HOP = 256;                                  // 5.8ms 一帧

function bandTrack(x, sr) {
  const aLow = 1 - Math.exp((-2 * Math.PI * 200) / sr);
  const aMid = 1 - Math.exp((-2 * Math.PI * 2000) / sr);
  const frames = Math.floor(x.length / HOP);
  const eLo = new Float64Array(frames), eMid = new Float64Array(frames);
  const eHi = new Float64Array(frames), rms = new Float64Array(frames);
  const rMid = new Float64Array(frames);           // 中频原始音量，判长音用
  let l1 = 0, l2 = 0, m1 = 0;
  for (let f = 0; f < frames; f++) {
    let sl = 0, sm = 0, sh = 0, st = 0;
    const s0 = f * HOP;
    for (let i = 0; i < HOP; i++) {
      const v = x[s0 + i];
      l1 += aLow * (v - l1);
      l2 += aLow * (l1 - l2);
      m1 += aMid * (v - m1);
      const md = m1 - l2;
      const hg = v - m1;
      sl += l2 * l2; sm += md * md; sh += hg * hg; st += v * v;
    }
    rMid[f] = Math.sqrt(sm / HOP);
    // 对数压缩：轻声的起音和爆音落在同一量级，弱拍不会被重拍吃掉
    eLo[f] = Math.log10(1 + 900 * Math.sqrt(sl / HOP));
    eMid[f] = Math.log10(1 + 900 * rMid[f]);
    eHi[f] = Math.log10(1 + 900 * Math.sqrt(sh / HOP));
    rms[f] = Math.sqrt(st / HOP);
  }
  return { frames, eLo, eMid, eHi, rms, rMid };
}

/* ================================================================ 起音检测 */
// 每个频段先算「这一帧比两帧前多出来多少」，再除以它自己 0.5 秒窗内的均值，
// 得到相对通量——这样安静段落里的镲、副歌里的人声换字都能被认出来，
// 而不是只有底鼓响的那一下才算。三段的相对通量按音乐里的比重加权合并。
//
// 参数只在极端音频下才需要动：hop 256 约 5.8ms 一帧，够细了。
function detectOnsets(buf, opt) {
  const o = opt || {};
  const sr = buf.sampleRate || 44100;
  const x = monoMix(buf);
  if (!x.length) return [];
  const bt = bandTrack(x, sr);
  const { frames, eLo, eMid, eHi, rms, rMid } = bt;
  const lag = o.lag == null ? 2 : o.lag;                 // 跟几帧前比（≈12ms）
  const minGap = o.minGap == null ? 0.07 : o.minGap;

  // 每段的通量
  const flux = (e, w1) => {
    const f = new Float64Array(frames);
    for (let i = lag; i < frames; i++) {
      const d = e[i] - e[i - lag];
      f[i] = d > 0 ? d : 0;
    }
    return f;
  };
  const fLo = flux(eLo), fMid = flux(eMid), fHi = flux(eHi);

  // 相对化：除以本地均值，再和绝对值混合
  const W = Math.max(8, Math.round((o.win || 0.5) * sr / HOP));
  const rel = (f) => {
    const pre = new Float64Array(frames + 1);
    for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + f[i];
    const out = new Float64Array(frames);
    const gl = pre[frames] / Math.max(1, frames);
    for (let i = 0; i < frames; i++) {
      const a = Math.max(0, i - W), b = Math.min(frames, i + W + 1);
      const mean = (pre[b] - pre[a]) / (b - a);
      out[i] = f[i] / (mean * 0.6 + gl * 0.4 + 1e-4);
    }
    return out;
  };
  const gLo = rel(fLo), gMid = rel(fMid), gHi = rel(fHi);

  // 合并：中频（人声/旋律）最重，其次低频（鼓）、高频（镲）
  const nov = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    nov[i] = 0.85 * Math.min(4, gMid[i]) + 0.55 * Math.min(4, gLo[i]) + 0.32 * Math.min(4, gHi[i]);
  }

  // 自适应门限 + 局部极大
  const pre = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) pre[i + 1] = pre[i] + nov[i];
  const raw = [];
  for (let f = 2; f < frames - 2; f++) {
    const v = nov[f];
    if (v < nov[f - 1] || v < nov[f + 1] || v < nov[f - 2] || v < nov[f + 2]) continue;
    const a = Math.max(0, f - W), b = Math.min(frames, f + W + 1);
    const mean = (pre[b] - pre[a]) / (b - a || 1);
    const th = mean * (o.th || 1.30) + 0.35;
    if (v < th) continue;
    raw.push({ f, v });
  }
  // 太挤的合并（保留强的那个）
  raw.sort((p, q) => p.f - q.f);
  const kept = [];
  for (const p of raw) {
    const last = kept[kept.length - 1];
    if (last && (p.f - last.f) * HOP / sr < minGap) {
      if (p.v > last.v) { last.f = p.f; last.v = p.v; }
      continue;
    }
    kept.push(p);
  }

  /* ---------- 每个起音的强度 / 拖长 / 音区 ---------- */
  // 长音只在「中频」（人声、弦乐、主奏乐器）上量：整轨 RMS 在密集编曲里
  // 几乎不会掉下去，拿它判长短会把每一下都当成拖了三秒。
  // 中频包络快起慢落，掉到峰值的 62% 以下就算这个音松了。
  const rel2 = Math.exp(-HOP / (0.045 * sr));
  const env = new Float64Array(frames);
  let cur = 0;
  for (let f = 0; f < frames; f++) {
    const v = rMid[f];
    cur = v > cur ? v : cur * rel2 + v * (1 - rel2);
    env[f] = cur;
  }
  // 底噪：整首 env 的 15% 分位
  const sortedEnv = Float32Array.from(env).sort();
  const noise = sortedEnv[Math.floor(sortedEnv.length * 0.15)] || 0;

  let mx = 0;
  for (const p of kept) if (p.v > mx) mx = p.v;

  const onsets = [];
  const maxHold = 2.8;
  const FPS = sr / HOP;
  let prevF0 = 0, prevT = -9;
  let prevP = null;                                     // 上一个量出来的音区
  for (const p of kept) {
    const t = (p.f * HOP) / sr;
    // 找这一下的峰值帧（起音检测会略早于能量峰）
    const fEnd = Math.min(frames - 1, p.f + Math.round(0.09 * FPS));
    let pi = p.f, pv = env[p.f];
    for (let f = p.f; f <= fEnd; f++) if (env[f] > pv) { pv = env[f]; pi = f; }
    // 往后走到中频掉下去为止（允许 90ms 的气口）
    const thr = Math.max(pv * 0.62, noise * 1.6);
    let lastGood = pi, bad = 0;
    const limit = Math.min(frames - 1, pi + Math.round(maxHold * FPS));
    let jumpAt = -1;
    for (let f = pi + 1; f <= limit; f++) {
      // 又进来一个新的重音（音量忽然翻倍）：这是一个新音，不是延续
      if (env[f] > env[f - 1] * 1.9 + noise) { jumpAt = f; break; }
      if (env[f] >= thr) { lastGood = f; bad = 0; }
      else if (++bad / FPS > 0.09) break;
    }
    if (jumpAt > 0) lastGood = Math.min(lastGood, jumpAt);
    const d = Math.max(0, (lastGood - p.f) / FPS);
    if (t - prevT > 1.6) prevF0 = 0;                    // 断句太久，清掉音高惯性
    const pt = pitchAt(x, sr, t, prevF0);
    if (pt && pt.conf > 0.45) { prevF0 = pt.f0; prevP = pt.p; }
    prevT = t;
    // 三段通量归一成「占比」（低+中+高 = 1）：拿它判这道音有多宽，
    // 比原始比值稳——原始值随段落响度飘，同一套阈值没法通用
    const raw = [gLo[p.f], gMid[p.f], gHi[p.f]];
    const sum = raw[0] + raw[1] + raw[2] + 1e-6;
    onsets.push({
      t,
      s: mx > 0 ? p.v / mx : 0,
      d,
      // 估不出基频（气声、纯噪声）就沿用上一个音的音区——乱跳比留在原地更难看
      p: pt ? pt.p : (prevP == null ? 0.5 : prevP),
      pc: pt ? 1 : 0,                                     // 音区是不是量出来的
      f0: pt ? pt.f0 : 0,
      b: [raw[0] / sum, raw[1] / sum, raw[2] / sum],
    });
  }

  /* ---------- 音区拉满：按音高分位做直方图均衡 ---------- */
  // 直接线性拉伸没用：流行歌的音区本来就偏中低，谱面会挤在中间三格。
  // 按分位排序映射成均匀分布，九格才用得满；映射是单调的，旋律走向不变。
  const tuned = onsets.filter((q) => q.pc).map((q) => q.p).sort((a, b) => a - b);
  if (tuned.length > 16) {
    const n = tuned.length;
    const qmap = (v) => {
      let lo = 0, hi = n - 1;
      if (v <= tuned[0]) return 0;
      if (v >= tuned[n - 1]) return 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (tuned[mid] <= v) lo = mid; else hi = mid;
      }
      const span = tuned[hi] - tuned[lo];
      const f = span > 1e-9 ? (v - tuned[lo]) / span : 0;
      return clamp((lo + f) / (n - 1), 0, 1);
    };
    for (const q2 of onsets) q2.p = qmap(q2.p);
  }
  return onsets;
}

/* ================================================================ 分析入口 */
// 浏览器里一首歌只跑一次，结果按 [t,s,d,p,lo,hi] 存 IndexedDB。
function analyzeTrack(buf, opt) {
  const onsets = detectOnsets(buf, opt);
  return { onsets, dur: buf.duration || 0 };
}

// 缓存序列化：7 个数一档，比对象省一半体积
function packOnsets(onsets) {
  return onsets.map((p) => [
    +p.t.toFixed(3), +p.s.toFixed(2), +p.d.toFixed(2), +p.p.toFixed(2),
    +p.b[0].toFixed(2), +p.b[1].toFixed(2), +p.b[2].toFixed(2),
  ]);
}
function unpackOnsets(flat) {
  return flat.map((a) => ({
    t: a[0], s: a[1], d: a[2] || 0, p: a[3] == null ? 0.5 : a[3],
    b: [a[4] == null ? 0.34 : a[4], a[5] == null ? 0.33 : a[5], a[6] == null ? 0.33 : a[6]],
  }));
}

/* ================================================================ 选点 */
// 按时间顺序贪心。两个门槛都是「相对本地」的，绝对强弱不管用：
// 拿全曲分位卡强度，安静的主歌会整段没音符；拿全曲均值卡间隔，副歌又不够密。
//   · 强度：低于本地均值的 55% 当噪声丢掉（同时兜一个全曲地板）；
//   · 间隔：随本地响度缩放，副歌挤、主歌松。
function pickOnsets(onsets, D, t0, tEnd) {
  const cand = onsets.filter((p) => p.t >= t0 && p.t <= tEnd);
  if (!cand.length) return [];
  // 局部响度：前后 1.6 秒的强度均值
  const loud = cand.map((p, i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0, i - 24); j <= Math.min(cand.length - 1, i + 24); j++) { s += cand[j].s; n++; }
    return s / n;
  });
  let lmin = 9, lmax = -9;
  for (const v of loud) { if (v < lmin) lmin = v; if (v > lmax) lmax = v; }
  const lspan = Math.max(1e-3, lmax - lmin);
  // 全曲地板：最弱的那一档不要
  const q = D.tapQ == null ? 0.2 : D.tapQ;
  const ss = cand.map((p) => p.s).sort((a, b) => a - b);
  const gFloor = ss[Math.floor(q * (ss.length - 1))] * 0.7;
  const keep = [];
  let last = -9;
  for (let i = 0; i < cand.length; i++) {
    const p = cand[i];
    if (p.s < gFloor || p.s < loud[i] * 0.52) continue;
    const dyn = (loud[i] - lmin) / lspan;             // 0 安静 … 1 最响
    const gap = D.gap * (1.18 - 0.46 * dyn);
    if (p.t - last < gap) {
      // 挤在一起的：只有明显更强才顶掉前一个
      const prev = keep[keep.length - 1];
      if (prev && p.s > prev.s * 1.5) { keep[keep.length - 1] = p; last = p.t; }
      continue;
    }
    keep.push(p);
    last = p.t;
  }
  return keep;
}

/* ================================================================ 长条 */
// 长条只认一件事：这个音在音乐里真的拖住了（d 是包络量出来的秒数）。
// 拖够长的变成长按，短促的点一下。难度只调「留不留」和上限，不凭空造长条。
function decideHolds(notes, D, rnd) {
  const cap = Math.max(2, Math.round(notes.length * (D.holdCap == null ? 0.16 : D.holdCap)));
  const maxTail = D.maxTail == null ? 1.6 : D.maxTail;
  const pSustain = D.hold == null ? 0.8 : Math.min(1, D.hold / 0.55);
  const maxAt = D.holdAt == null ? 1 : D.holdAt;      // 同时最多几根长条
  const dblHold = D.dblHold || 0;                     // 配第二只手的比例
  let holds = 0;
  const active = [];
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    // 清掉已经收尾的。要求「上一根松手后再过 90ms」才算腾出手指：
    // 不然两根长条会在时间轴上叠一小段，实际得三根手指一起按
    for (let k = active.length - 1; k >= 0; k--) if (active[k] + 0.09 <= n.t) active.splice(k, 1);
    const gap = Math.max(n.dg || 0, i + 1 < notes.length ? notes[i + 1].t - n.t : 9);
    let want = 0, prob = 0;
    if (n.d >= 0.5) {
      want = clamp(n.d * 0.9, 0.4, maxTail);          // 长音长度贴着音乐走
      prob = pSustain;
      // 前后都在密集出音的地方，长条会把画面糊成一堵墙：降一半概率
      if (gap < 0.42) prob *= 0.5;
    } else if (n.d >= 0.34) {
      want = clamp(n.d * 0.85, 0.34, 0.7);
      prob = pSustain * 0.45;
    } else if (gap >= 0.8) {
      // 没有拖音但后面空了半秒以上：给一个短句尾长条（点缀）
      want = Math.min(0.75, gap * 0.6);
      prob = (D.hold || 0.3) * 0.4;
    }
    if (prob <= 0 || holds >= cap) continue;
    if (active.length >= maxAt) continue;             // 手指不够用了
    if (rnd() >= prob) continue;
    if (want < 0.32) continue;
    // 双长按：这道音在中低频都拖着（贝斯 + 人声/弦乐），就配第二只手一起按。
    // 第二根用同一条尾，落点在分轨时错开 3~5 格。
    let pair = false;
    if (dblHold > 0 && maxAt >= 2 && active.length + 2 <= maxAt) {
      const b = n.b || [1, 1, 1];
      const chordy = b[0] > 0.34 && b[1] > 0.36;
      const long = Math.min(1, (n.d - 0.5) / 0.7);
      const p2 = dblHold * (chordy ? 1.5 : 0.35) * Math.max(0, long);
      pair = p2 > 0 && rnd() < p2;
    }
    n.kind = 'hold';
    n.tail = n.t + want;
    active.push(n.tail);
    holds++;
    if (pair) {
      notes.splice(i + 1, 0, {
        t: n.t, lane: n.lane, kind: 'hold', tail: n.tail, s: n.s, duo: true,
        p: clamp((n.p == null ? 0.5 : n.p) + (rnd() < 0.5 ? -0.14 : 0.14), 0, 1),
        b: n.b,
      });
      active.push(n.tail);
      holds++;
      i++;                                            // 跳过刚插进来的伙伴
    }
  }
}

/* ================================================================ 分轨道 */
// 音区（p）决定落在哪一格：旋律往上走，音符往右移，读谱时能「听见」走向。
// 但音区本身不是均匀分布的（流行歌大半时间在中低音区），直接线性映射会
// 把谱面挤在中间两三格。所以先按音高排名做一次均匀化：把这一首用到的
// 音高按名次等分成九档，每档一格——顺序不变，九格都能用到。
//
// 光有「音高目标 + 步伐上限」是不够的：那等于让落点做一次随机游走，
// 走成一条钟形——中间三格堆满、最外两格整首摸不到（实测 240 音里最右一格
// 只有 2 下），而且走到哪停就在哪连着，同一格里能叠两三个长条。
// 所以现在每一步在「不越级」的候选里按代价挑：
//   · 离音高目标多远（保持旋律走向）；
//   · 这条轨已经用掉多少（超出当前应得份额就罚，九格才会都用上）；
//   · 刚才是不是刚用过（隔开同轨连按）；
//   · 这条轨刚收过一条长条就再也不给长条（长按冷却，免得一手连按三次）。
// 音高只是「倾向」，九格均衡和可读性优先。
function rankSpread(notes) {
  const n = notes.length;
  const idx = notes.map((q, i) => i);
  idx.sort((a, b) => {
    const pa = notes[a].p == null ? 0.5 : notes[a].p;
    const pb = notes[b].p == null ? 0.5 : notes[b].p;
    if (pa !== pb) return pa - pb;
    return a - b;                                   // 同音高按时间排，摊开
  });
  const out = new Array(n);
  for (let k = 0; k < n; k++) out[idx[k]] = n > 1 ? k / (n - 1) : 0.5;
  return out;
}

function assignLanes(notes, D, rnd) {
  const jump = D.jump == null ? 3 : D.jump;
  const ps = rankSpread(notes);
  const use = new Array(9).fill(0);           // 每条轨已经落了多少
  const lastAt = new Array(9).fill(-9);       // 上一次落点时间
  const holdCool = new Array(9).fill(-9);     // 这个时刻之前别再给长条
  const busy = new Array(9).fill(-9);         // 这条轨忙到这个时刻（长条按到尾）
  const holdCd = D.holdCd == null ? 1.7 : D.holdCd;   // 长按冷却（秒）
  let prev = 4, same = 0;

  const take = (n, l) => {
    n.lane = l;
    use[l]++;
    lastAt[l] = n.t;
    if (n.kind === 'hold') {
      holdCool[l] = n.tail + holdCd;
      busy[l] = n.tail + 0.06;
    } else busy[l] = n.t;
  };

  for (let i = 0; i < notes.length; i++) {
    const n = notes[i];
    // 双押 / 双长按的第二只：跟前一下隔 2 格以上（两只手分开，不打架），
    // 在同等的距离里挑「用得最少」的那条轨，别让某一条轨专收双押。
    if (n.duo) {
      let lane = -1, bestScore = 1e9;
      let cool = -1, coolScore = 1e9;
      for (let l = 0; l <= 8; l++) {
        if (n.t < busy[l] + 0.02) continue;
        const dist = Math.abs(l - prev);
        if (dist < 2) continue;
        let sc = dist + use[l] * 0.45;
        if (n.kind === 'hold') {
          if (holdCool[l] > n.t) sc += 3;
          else if (sc < coolScore) { coolScore = sc; cool = l; }
        }
        if (sc < bestScore) { bestScore = sc; lane = l; }
      }
      if (n.kind === 'hold' && cool >= 0) lane = cool;
      if (lane < 0) { n.kind = 'tap'; n.tail = 0; n.duo = false; continue; }
      take(n, lane);
      continue;
    }

    // 音高目标：按名次均匀铺开（0.15~7.85，两端留一点点余量不贴边）
    const tgt = 0.15 + ps[i] * 7.7;
    const fair = ((i + 1) / 9) * 1.08;        // 到这一下为止每条轨「应得」的量
    const lo0 = Math.max(0, prev - jump), hi0 = Math.min(8, prev + jump);
    let lane = -1, best = 1e9;
    let cool = -1, bestCool = 1e9;              // 没在冷却期的最佳候选（长条优先用它）
    // 候选先看「不跨级」的那一段；全被长条占着就逐圈放宽（谱面不能凭空少一个音）
    for (let span = 0; span <= 8 && lane < 0; span++) {
      for (let l = Math.max(0, lo0 - span); l <= Math.min(8, hi0 + span); l++) {
        if (n.t < busy[l] + 0.02) continue;
        let sc = Math.abs(l - tgt) * 0.9 + (l === prev ? 0.5 : 0) + span * 0.4;
        const over = use[l] - fair;
        if (over > 0) sc += over * 2.4;         // 用超了自己的份额：罚
        if (n.t - lastAt[l] < 0.33) sc += 1.1;  // 刚用过
        if (l === prev && same >= 2) sc += 1.6; // 同轨不许连着三下
        if (n.kind === 'hold') {
          if (holdCool[l] > n.t) sc += 4.5;     // 这条轨刚长按过
          else if (sc < bestCool) { bestCool = sc; cool = l; }
        }
        if (sc < best) { best = sc; lane = l; }
      }
    }
    // 长条优先落到「不在冷却期」的轨上：同一格连着两三个长按，手指根本没法换气。
    // 冷却期全满才退回普通评分（宁可连，也不能让这个音没落点）。
    if (n.kind === 'hold' && cool >= 0) lane = cool;
    if (lane < 0) {
      // 整条谱面九条轨全忙（理论上只有极端密集才会）：退回原地的最近空闲轨
      for (let k = 1; k <= 8 && lane < 0; k++) {
        for (const d2 of [-k, k]) {
          const l2 = prev + d2;
          if (l2 >= 0 && l2 <= 8 && n.t >= busy[l2] + 0.02) { lane = l2; break; }
        }
      }
      if (lane < 0) lane = clamp(Math.round(tgt), 0, 8);
    }
    same = lane === prev ? same + 1 : 0;
    prev = lane;
    take(n, lane);
  }
  // 收尾：同轨的长条不许压到下一张
  const byLane = new Map();
  for (const n of notes) {
    if (!byLane.has(n.lane)) byLane.set(n.lane, []);
    byLane.get(n.lane).push(n);
  }
  for (const q of byLane.values()) {
    q.sort((a, b) => a.t - b.t);
    for (let i = 0; i < q.length; i++) {
      const n = q[i];
      if (n.kind !== 'hold') continue;
      const nx = q[i + 1];
      if (nx && nx.t < n.tail - 1e-6) {
        const tail = nx.t - 0.12;
        if (tail - n.t < 0.3) { n.kind = 'tap'; n.tail = 0; }
        else n.tail = tail;
      }
    }
  }
}

/* ================================================================ 收尾：九格摊平 */
// 前面按份额罚分只能做到「大体匀」，短谱面（EASY 五十来个音）还是会漏下：
// 某一格整首没摸到、另一格却占了全曲一成半。这一步在生成完之后做微调，
// 每次只挪一个音，四条硬约束一条都不能破：
//   ① 目的格这个时刻空着（0.2 秒内没有别的音，也没有长条按着）；
//   ② 前后两个音到目的格都不超过 jump+1 格（一眼还能读出来）；
//   ③ 不把别的格子搬空（搬完不能比下限还少）；
//   ④ 长条搬过去之后，目的格前后冷却期里不能再有长条。
// 顺带把「同一格连着两条长条」也给拆开——这是玩家最容易骂的地方：
// 手指刚松、下一根长条又落在同一点上，根本没时间换手。
function tidyLanes(notes, D) {
  const n = notes.length;
  if (n < 27) return;
  const jump = (D.jump == null ? 3 : D.jump) + 1;
  const cd = D.holdCd == null ? 1.7 : D.holdCd;
  const seq = notes.slice().sort((a, b) => a.t - b.t || a.lane - b.lane);
  const avg = n / 9;
  const floor = Math.max(2, Math.round(avg * 0.4));
  const cap = Math.max(floor + 1, Math.round(avg * 1.45));

  let byLane = [];
  const rebuild = () => {
    byLane = [[], [], [], [], [], [], [], [], []];
    for (const x of seq) byLane[x.lane].push(x);
  };
  rebuild();

  const fits = (l, x, i) => {
    for (const m of byLane[l]) {
      if (m === x) continue;
      if (Math.abs(m.t - x.t) < 0.19) return false;
      if (m.kind === 'hold' && m.t <= x.t + 1e-6 && m.tail >= x.t - 0.02) return false;
      if (x.kind === 'hold' && m.t > x.t && m.t <= x.tail + 0.02) return false;
      // 长条的冷却按「上一根的尾音」算：两根长条起点隔得远、但中间几乎没空隙，
      // 手感一样是「刚松手又要按」。只看起点会让它们互相搬来搬去搬不完。
      if (x.kind === 'hold' && m.kind === 'hold') {
        if (m.t <= x.t && (m.tail || m.t) + cd > x.t) return false;
        if (m.t > x.t && x.tail + cd > m.t) return false;
      }
    }
    const pv = seq[i - 1], nx2 = seq[i + 1];
    if (pv && Math.abs(pv.lane - l) > jump) return false;
    if (nx2 && Math.abs(nx2.lane - l) > jump) return false;
    return true;
  };
  const move = (x, l) => { x.lane = l; rebuild(); };

  // ① 补闲置格
  for (let l = 0; l < 9; l++) {
    let guard = 0;
    while (byLane[l].length < floor && guard++ < 24) {
      let pick = -1, bestD = 99;
      for (let i = 0; i < seq.length; i++) {
        const x = seq[i];
        if (x.duo || x.lane === l) continue;
        if (byLane[x.lane].length <= floor) continue;
        if (!fits(l, x, i)) continue;
        const d = Math.abs(x.lane - l);
        if (d < bestD) { bestD = d; pick = i; }
      }
      if (pick < 0) break;
      move(seq[pick], l);
    }
  }
  // ② 削冒头：超过 cap 的格子往还欠账的格子里匀
  for (let l = 0; l < 9; l++) {
    let guard = 0;
    while (byLane[l].length > cap && guard++ < 48) {
      const order = [0, 1, 2, 3, 4, 5, 6, 7, 8]
        .filter((k) => k !== l && byLane[k].length < avg)
        .sort((a, b) => byLane[a].length - byLane[b].length || Math.abs(a - l) - Math.abs(b - l));
      let done = false;
      for (const k of order) {
        for (let i = 0; i < seq.length && !done; i++) {
          const x = seq[i];
          if (x.lane !== l || x.duo) continue;
          if (!fits(k, x, i)) continue;
          move(x, k);
          done = true;
        }
        if (done) break;
      }
      if (!done) break;
    }
  }
  // ③ 拆同格连长条
  for (let pass = 0; pass < 3; pass++) {
    let changed = false;
    for (let l = 0; l < 9; l++) {
      const q = byLane[l];
      for (let i = 1; i < q.length; i++) {
        if (q[i].kind !== 'hold' || q[i - 1].kind !== 'hold') continue;
        const prevEnd = q[i - 1].tail || q[i - 1].t;
        if (q[i].t - prevEnd >= cd) continue;
        const x = q[i];
        const idx = seq.indexOf(x);
        let moved = false;
        for (const k of [l + 1, l - 1, l + 2, l - 2, l + 3, l - 3, l + 4, l - 4]) {
          if (k < 0 || k > 8) continue;
          if (!fits(k, x, idx)) continue;
          move(x, k);
          moved = true;
          changed = true;
          break;
        }
        // 九条轨全被人占着：降成单点。留着它只会让人「刚松手又要按」，
        // 长条本来就是点缀，少一条不影响曲子，手感坏一条却会毁掉整段。
        // 双长按的第二只要拆位置很难（另一手正按在同一条弧上），直接降成单点，
        // 这一下仍然是「两手一起下」，只是不用再按住而已。
        if (!moved && (x.duo || x.tail - x.t < 1.0)) {
          x.kind = 'tap';
          x.tail = 0;
          rebuild();
          changed = true;
        }
        break;                                  // 这一格改完重新扫（byLane 已重建）
      }
    }
    if (!changed) break;
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

/* ================================================================ 双押 */
// 两轨同时落 = 音乐里的强音。判据是这道重音「又响又宽」：
//   响（s 高）+ 低频和高频同时砸（底鼓叠镲、军鼓叠人声）。
// 不合条件的地方概率压得很低，所以副歌的强拍会成对出现、主歌基本单点。
// 落点选对侧 3~4 格——两只手分开按是最顺的，也是读谱最清楚的间距。
function addDoubles(notes, D, rnd) {
  if (D.dbl <= 0) return;
  // 按轨分组，判断「对侧那条轨这个时刻是不是空着」。
  // 以前用一条 busy[] 记「这条轨最晚到什么时候忙」，那是最晚值，
  // 于是每条轨看起来都永远是忙的，双押几乎全被挡掉。
  const byLane = [];
  for (let i = 0; i < 9; i++) byLane.push([]);
  for (const n of notes) byLane[n.lane].push(n);
  const freeAt = (lane, t) => {
    const q = byLane[lane];
    for (let i = 0; i < q.length; i++) {
      const m = q[i];
      if (m.t > t + 0.3) break;
      if (Math.abs(m.t - t) < 0.24) return false;
      if (m.kind === 'hold' && m.t < t && m.tail > t - 0.02) return false;
    }
    return true;
  };
  const extra = [];
  for (const n of notes) {
    if (n.kind !== 'tap' || n.duo) continue;
    const b = n.b || [0.34, 0.33, 0.33];
    const loud = n.s >= 0.78;
    const wide = b[0] > 0.3 && b[2] > 0.22;          // 低频和高频同时砸下去
    const p = D.dbl * (loud ? 2.0 : 0.5) * (wide ? 1.6 : 1);
    if (rnd() >= p) continue;
    const dir = n.lane <= 2 ? 1 : n.lane >= 6 ? -1 : (rnd() < 0.5 ? -1 : 1);
    for (const k of [3, 4, 5, 2]) {
      const l2 = n.lane + dir * k;
      if (l2 < 0 || l2 > 8) continue;
      if (!freeAt(l2, n.t)) continue;
      const twin = { t: n.t, lane: l2, kind: 'tap', tail: 0, s: n.s, b: n.b, duo: true };
      extra.push(twin);
      byLane[l2].push(twin);
      break;
    }
  }
  for (const x of extra) notes.push(x);
  if (extra.length) notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
}

/* ================================================================ 两条入口 */
// 原曲：onsets 来自 detectOnsets(buf, ...)，dur 是整首长度
function chartFromOnsets(onsets, dur, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const t0 = Math.min(1.2, dur * 0.05);
  const picked = pickOnsets(onsets, D, t0, dur - 0.8);
  const notes = picked.map((p) => ({
    t: p.t, lane: 4, kind: 'tap', tail: 0, s: p.s, d: p.d, p: p.p, b: p.b,
  }));
  decideHolds(notes, D, rnd);
  assignLanes(notes, D, rnd);
  addDoubles(notes, D, rnd);
  tidyLanes(notes, D);
  return { notes, dur, src: 'audio' };
}

// 芯片改编：arr 是 songs.js arrange() 的产物
function chartFromArr(arr, D, seed) {
  const rnd = mulberry32(seed >>> 0);
  const lead = D.lead;
  // 旋律音高范围按本曲实际用到的音拉满，免得整首挤在中间三格
  let mlo = 999, mhi = -999;
  for (const n of arr.notes) { if (n.m < mlo) mlo = n.m; if (n.m > mhi) mhi = n.m; }
  const mspan = Math.max(6, mhi - mlo);
  // 旋律音之间的空隙：乐句尾的空拍给一个短句尾长条，和原曲路线一个思路
  const mel = arr.notes.slice().sort((a, b) => a.t - b.t);
  const gapAfter = new Map();
  for (let i = 0; i < mel.length; i++) {
    gapAfter.set(mel[i], i + 1 < mel.length ? mel[i + 1].t - mel[i].t : 9);
  }
  const cand = arr.notes.map((n) => ({
    t: n.t, d: n.d, m: n.m, dg: gapAfter.get(n) || 0, b: [1, 1, 0.4],
    p: clamp((n.m - mlo) / mspan, 0, 1),
  }));
  if (D.pad > 0) {
    for (const dr of arr.drums) {
      if ((dr.k === 'k' || dr.k === 's') && rnd() < D.pad) {
        cand.push({ t: dr.t, d: 0, m: null, dg: 0, p: dr.k === 'k' ? 0.1 : 0.55, b: dr.k === 'k' ? [3, 1, 0.3] : [1, 2, 1.4] });
      }
    }
  }
  cand.sort((a, b) => a.t - b.t);
  const notes = [];
  let last = -9;
  for (const c of cand) {
    if (c.t - last < D.gap - 1e-4) continue;
    if (c.t < lead * 0.25) continue;
    last = c.t;
    notes.push({
      t: c.t + lead, lane: 4, kind: 'tap', tail: 0,
      s: 0.5 + Math.min(0.5, c.d / 1.2), d: c.d, dg: c.dg, p: c.p, b: c.b,
    });
  }
  decideHolds(notes, D, rnd);
  assignLanes(notes, D, rnd);
  addDoubles(notes, D, rnd);
  tidyLanes(notes, D);
  return { notes, dur: arr.dur + lead + 1.1, src: 'chip' };
}
return { mulberry32, hashStr, detectOnsets, analyzeTrack, packOnsets, unpackOnsets, chartFromOnsets, chartFromArr };
})();

// ---- js/ll/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 从 data/lovelive-units.json + data/avatars.json 生成，请勿手改。
// art 是 data URI：上场名册一次传输，页面只发一个脚本请求。
// card 是立绘路径（assets/card/*.webp），按需取，不内联。
const UNITS = [{"id":"a-15601","n":"24","hue":262,"skill":{"n":"狂气爆发","txt":"每 40 连击：判定范围 ×1.7，持续 8 秒","trig":"combo","need":40,"fx":"judge","val":1.7,"dur":8},"pass":{"score":0.03},"art":"data:image/webp;base64,UklGRpoHAABXRUJQVlA4II4HAAAQHgCdASpIAEgAPm0okUYkIiGhLhubaIANiWMnWhRSwz/KE4155fdEmo4f62vqv6Pxe8AL2B/md6U5x/Vf+Fxo6Tv5z7AH5p/3fqMf9/+n87n03+0HwD/zj+yf8310PYn+4vsoftazpDj4M2kHzfcYiPzUU48uqdV9TGtduuqlhj+wHGm2y3FrQcfHPc+2e1KhISVYd9M08Q2gcabHno3czMBST1M7ZlJxFWrzHRD6KY1OqTqVoIXjFbiD5YdcUB7y8427zav8eWyJZLhhzPj6ihsvUu1G8ihzVin1+N6lZmv+JIFUalxu9W4T5jXHz1uirK4EtK3JO8AA/v6jKnQ7j+UYvrBPvwyscypuovbActGe1vd1D9R5GkeH81W51hwNJrvSTagPDuv7wLT7MxWkRpgsf2wRwmKURGKGZtPgvm9ea9PLb1M/1ec76aKEFkmhK/ChnelcIFxdNESSXeS2PJVlm9ta+KMvIC/Nva6cAo/Opi1UDtRdhTAj7K5EGi5KYh2ljkjkm8N2cl73nsSqKaXBMLVqv9uofCT1uMKoe0cBuBy11pd/q84OitMfarY3Un5qj4NjEvtJVjzb4v62DU60ljKt6GDmd+htATAemo6k87m3m0qQYk+84sTXgeDp8JlLpLTtS5AUgmjlK3pkxjVSEsmGl/Xz/C7N9PX2CeV7/UM4IJO0Xb33WO868FVa0lTnu90GgXavJsFaRu6vfVKyUpgXo5B0dYMmVrhuDKdqMoqJbpuF6lbcOVC/yLnAfnrhqDgSbBEC0tJM/QFrZ9/YeRVE2u3N8GWMTHd6WEpb67eKUh5TFLsY3X12kIJnTJVQlk56gNS6x6xhiVAidPVGz7hO4X08G86hAKwyJOGGUZH/AiWZquRwCOhoi1Wutvz7uRIMO31Y7FlYXR6LeDYCKu3TU5EqIrSUF0lbqpO7nhGUgdTLYrJtlDY+4H8MCcy+J6xFoCSrEAL39tXkv/KP4qLWnPNIQsRR9fnpN8qxYrhC2EZuGSYUgCcVEy+NU5btJM3SmoGlIlJmceDChGPegcLwgbjYJXSrt3sUPYab/ytn+2zz+cwy1Zp+5L3TQ0bycuXxWymu0eb/B3PNMGQhPZ/w15/n72Qj4jbyZvtrem1Odlq85BvXMqc9Nu48ZRd/Z7VKaKfNb5iME4qFGXR+cnxcc0U2SpAF7JV49jUXynaXfM0HouWXY9QWGWl/C7+uLkvSIwxyAejQpGKpN3hvCrBN4ZeVZwWipddfa3OwHiPm31EaTXEGapWKy5cKgi34qNf9xvtdK8DY/kX9fGKh10i7/v8cdqH6LcCoGRs/EQFmbcHXegtg4ypkBoaJWDda+d6kHZ5s1xyMB4u9qlHGzdV/1aJnIKS5Y6tUSEpVUDkCj6eLc63UkjIz90pgyzhiq1OZWt9breP0osrb919xJsWtqATMAAd/yeCGiZjPX8N6PhRiSGt/KOo06l05Lp5HiQIe6m6R3rkLnfGBL4kPXr6AfRGgiHmyR96FVnqsN463yfbVxwF0vbecaFzG/tM6WD1+01/8qf+RxiqcapFu5GzR3bCaugmaC4FNBMEepNPN+Q3me4txgv4FIIJhhDGLH+f+357uY0V2LrVlkiemdNKW9PQO6OK+YGKWmSUnW6nYE6Ic9lYUug9ScKWbtRLdAL9a7QeKxOl8K1fP4xFv/xM34Ztevbaj2qcgkZ+ORlePl3MAVu9CpKasygTIO1sD3q2aYL0BSmq/T6qJ7GLuPeZ8p03hr2v2gzaL5MhdQBn6dE2+RYAq7UPuLybPy/HFK0jXvG9MhfQ0H9YWf9/VeaGwSYDHe/ZO9a/XVkGouGSM0wM6oMx4INoBn1jg2wsxdu2oRHvvDVBw1Lksxdd9xphuTMeHJcDu57ZOILU+XIkd4/jkJs6lzVn4KYPW9a84dHiU6W9ac2owzggmb18jBg+fAcvfS7yd6MZeJLoDpSKbwiserzeYU9AjaMWJtTwlaxxuT/fyhIG5eMM7IHFRMWI9m/je2HO36pZAvElk34p90kPQoSsB1Zo+l3J1dpPXmuRwkl3sDdyyV7evAjjnbeH2sGOEsoRSksqXMZVKiy72t0ptcozIb5q7s+9NdxZvS9Nh2Zym3h+lILD5+dAFYVdSOEAoQR0riq5fM23zPQW4NjFl55IeThcBI/8DiVueo9gokgJE2diCkIR+3S8X3MyBPQmEMtZOkyfOe7QhL/qUQrM8EWRxri+Msx/cJSMnXTPDAlCP4Nu0Bu0ccM1R5me7QAa1xqCtzvT+iH1T+l9NTAl1tgD4mPRd8yx3cQ97Mx3+PLWVpvNxdqs+g0kc1ln7D3t11Xc7pvG/ZSOy3PRCmPQg3r+2YqqD3qu86L4jighxL6CmUuMVb18Ntsvh4RyVieOJqgDRCZS6XZVMt8+lpQc0kN0b/bPEXJcKQXpXJpoOxTd3XRd4+b0E0eJWcnSCNCv1oHbzFCkMz0UurvDzfDWLSTgPeheDeHnfUEFDoa5cjAEJdgnm1wcYB+84S67MPhOLZNi1sQN/9fh78Che7o+0EEgexgIb2cV/NhQLUVq/+5OVDJAAAA==","card":"assets/gallery-full/cg-c06-010.webp","wide":true},{"id":"a-15600","n":"阿格里帕","hue":139,"skill":{"n":"凝视","txt":"每 %d 秒：6 秒内判定范围 ×1.35","trig":"time","need":28,"fx":"judge","val":1.35,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/agrippa.webp","wide":false},{"id":"a-15591","n":"艾继丝","hue":336,"skill":{"n":"蔷薇安可","txt":"每 20 秒：接下来 6 秒得分 ×1.5","trig":"time","need":20,"fx":"score","val":1.5,"dur":6},"pass":{"score":0.04},"art":"data:image/webp;base64,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","card":"assets/card/aigis.webp","wide":false},{"id":"a-15588","n":"艾尔瓦","hue":210,"skill":{"n":"铁壁演出","txt":"每 25 秒：8 秒内 Miss 不断连、不掉血","trig":"time","need":25,"fx":"guard","val":1,"dur":8},"pass":{"judge":0.04},"art":"data:image/webp;base64,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","card":"assets/card/alva.webp","wide":false},{"id":"a-15573","n":"奥瑞塔","hue":150,"skill":{"n":"安眠曲","txt":"每 30 秒：回复 20 体力","trig":"time","need":30,"fx":"heal","val":20,"dur":0},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/aurita.webp","wide":false},{"id":"a-15594","n":"凯刻斯","hue":14,"skill":{"n":"猫爪连打","txt":"每 60 个 Perfect：5 秒得分 ×1.4","trig":"perfect","need":60,"fx":"score","val":1.4,"dur":5},"pass":{"score":0.05},"art":"data:image/webp;base64,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","card":"assets/card/caecus.webp","wide":false},{"id":"a-15572","n":"卡茜亚","hue":28,"skill":{"n":"全场应援","txt":"每 18 秒：直接 +15 连击","trig":"time","need":18,"fx":"combo","val":15,"dur":0},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/casiah.webp","wide":false},{"id":"a-77923","n":"卡斯托尔","hue":251,"skill":{"n":"替身","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":40,"fx":"auto","val":1,"dur":5},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/castor.webp","wide":false},{"id":"a-15566","n":"希莱斯特","hue":47,"skill":{"n":"星光护佑","txt":"每 30 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":30,"fx":"auto","val":1,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/celeste.webp","wide":false},{"id":"a-77925","n":"克莱门汀","hue":320,"skill":{"n":"慢镜头","txt":"每 35 秒：8 秒内音符飞得慢 25%（更好看清）","trig":"time","need":35,"fx":"lead","val":1.25,"dur":8},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/clementine.webp","wide":false},{"id":"a-77922","n":"克珀珊特","hue":268,"skill":{"n":"次元口袋","txt":"每 40 秒：回复 30 体力","trig":"time","need":40,"fx":"heal","val":30,"dur":0},"pass":{"judge":0.05},"art":"data:image/webp;base64,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","card":"assets/card/corposant.webp","wide":false},{"id":"a-15590","n":"达芙黛尔","hue":172,"skill":{"n":"白翼","txt":"每次 Miss：立刻回复 8 体力","trig":"miss","need":1,"fx":"heal","val":8,"dur":0},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/daffodil.webp","wide":false},{"id":"a-15570","n":"朵尔","hue":350,"skill":{"n":"变奏曲","txt":"每 45 秒：6 秒得分 ×1.35","trig":"time","need":45,"fx":"score","val":1.35,"dur":6},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/doll.webp","wide":false},{"id":"a-95786","n":"杜勒赛因","hue":290,"skill":{"n":"融合终章","txt":"每 60 秒：10 秒得分 ×1.8（终点的力量）","trig":"time","need":60,"fx":"score","val":1.8,"dur":10},"pass":{"score":0.06},"art":"data:image/webp;base64,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","card":"assets/card/doresain.webp","wide":false},{"id":"a-15603","n":"艾瑞卡","hue":52,"skill":{"n":"起手式","txt":"开场立刻：前 20 秒得分 ×1.3","trig":"start","need":0,"fx":"score","val":1.3,"dur":20},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/erica.webp","wide":false},{"id":"a-15577","n":"菲茵特","hue":205,"skill":{"n":"银芯共鸣","txt":"每 25 秒：5 秒得分 ×1.5","trig":"time","need":25,"fx":"score","val":1.5,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/faint.webp","wide":false},{"id":"a-15575","n":"法洛思","hue":254,"skill":{"n":"补给","txt":"每 %d 秒：回复 14 体力","trig":"time","need":36,"fx":"heal","val":14,"dur":0},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/faros.webp","wide":false},{"id":"a-15602","n":"熔毁·朵尔","hue":102,"skill":{"n":"全场齐唱","txt":"每 %d 秒：6 秒内得分 ×1.35","trig":"time","need":30,"fx":"score","val":1.35,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/doll-inferno.webp","wide":false},{"id":"a-15567","n":"血链·希洛","hue":348,"skill":{"n":"嗜血链球","txt":"每 30 秒：回复 14 体力","trig":"time","need":30,"fx":"heal","val":14,"dur":0},"pass":{"score":0.04},"art":"data:image/webp;base64,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","card":"assets/card/helot-catena.webp","wide":false},{"id":"a-15568","n":"环行·拉蒙娜","hue":96,"skill":{"n":"循环往复","txt":"每 40 秒：直接 +20 连击","trig":"time","need":40,"fx":"combo","val":20,"dur":0},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/ramona-timeworn.webp","wide":false},{"id":"a-15564","n":"戈利亚","hue":200,"skill":{"n":"梦引","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":35,"fx":"auto","val":1,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,UklGRvQHAABXRUJQVlA4IOgHAACQHgCdASpIAEgAPmUijEWkIaEZn3bMQAZEs4BlsCkcjP1zwV8l/tPOyx92j/Wh9l5t97/ACdh0XfAA1Ee/voe/br1t79j7Z/wvYA/Nv/a9Tn/v/1Pnu+mPYH/m/9o6wfob/s+tV8vyE2NtTMhyVXLmq6BckYbFrsBOmG/kbejQDmZI/gAtNbcv0+jkbn6PXgAH+fNO+ZpxGEq3380M+hfJkJ8tRrIPHqkbP+9bxUFrEHELm08EmHafqeIn/W0OXQYbUS2V32iGwICa9+1WDTIp3YEK4gtlL7zKOi0ltiFCd3ShuXs3z8eTfjvnrzKnMRxuflly/0zgDl1Rj2GwAP7+oxsJeAOhsTVmIK3GwKSdYX0UWXKou6Z3BHh8Z5wv4gSV+ERJsxgrNlyXEhhLbtbt06dxkl/i61gZmtf1visWVcN7OhndPkINfwkkpK5/tVlNsq4XYofno+KUQYRHHgW+uc1Ysd4z7DCVJlmyrE7zC9wynynuH5T9fb9y8VEHF82oADbXNwUCNCz1FHga10i9Ppa0CyrLX+kKoA0bj47UnQyPo495kJtfNfEtMsafQc9ZPA0kwpgP442FhQiyI6g/IoZSTePmdAaLaRtMsYH2R1OWO9w4SdaTyalmOJBpQqe/1vsq5u2wEnSIw59KwsvWj0FYJbA8JcI9TH9a2sl98T9WG2AnnTohUdydGSSwu/RvUUV8ENF2bc/amnewKu6S0CVE5YaYvlY6gBs/LbMTJZk1RGN5bXVLM3CGPA0dtUag9HJZMerzSF8k7mkdhP0FhwXwcQjXhj7Eshqs8lQyjAsnu+Gn8e8fBI/z1NN1qd+Qy99cQcGY4+ulSz7fBleqLIJ4OuZQthtnAPbVJrrTIkevz2wwbTNhP29bzOZivOyUPvFjPH37Gqh+XMcg6PzWOGYGh7Z4bSr9FvNk0h8sxfnLihfj96ofKq8bAv6sNgNX3q0Rr6bJdrpo914H3UqKW8xyPAALoqN1hsbDqfT3bLV7tsXy7OxuztiE++mQYjqD0qfag6URxgc9SWAPKokG9Ck7rvm9eEM/s4Hg2befc5v0TCrC/HXL/ERvrFKYjf9R2bIag2uQ6N6jKn1yAbdzg8hVkazmRlLiIT3cYYS21o1wPfrWm5hcHNU1JpjR49eFl9/+h+FJZj8o+bZmpiwi9iPYvnB09Gy7Xa9d0wmESrv9P0NqG+JX/28Y8RHQnQHLMxVVywkRUCExNuSsNlTzWpzj/tT4p7FRuG/Rn//W+sMBnWuYGWAkgfxaTdM4PJZnhhhrAw5hL+J17HWlsKmBj6nrj25Kui0qdSuZZzAoq7x92M02bAIzY8ozqi80hsJTOe1C0tQF9T9wjC6mPZdUEiBEYSzbhoDMF2o08OfbJwUZeFu/Y6oOFl/v7Pxid64U5Lzh28IwUc/i+AiJurFko0hbGZPmLzbTrCVnNTpV8f5tEolYAXhRhpWvMi2eEE+1s84okLPg04XNTdG+yav/KlSLnjkb48mgiWO218urphEAoE5TXit/22q4ZYoZxmXI7QACq5KguoCHXepRzvOzYgluXRP+DbtL0POJ3yyUiFxoRJTypMAP1f3WGg75ot84yMZvrX2PtgFeKJonRhlKCLDFZ+j6B7zOeBFu7kH0eZG/jLgS+uUvx03S7koPmw6EGTe1Sa/bIPXyCRz2lccCMG+HzYe9I9trSwY9j5kB3Gm4JRZYPyAC0xoXrfldwye9Ln8EUcuG9EGA7ZXzlSbbT3wvXtroXiWfZrzcLZFd00+wWbfUgaSxGBz6vf6u7czdVRwTHnTiKgEwTKLWf60CIAwTar1jZvgzeJoC3kOb1ygTlpHtcrF81V8eNOeXBGNp8kTwWaakMC+DRc/FNAuNGVQu5p7auAVLJ0LV4edHWwZECscV8Qu4PXPjHxzM8e6fg30s55w0IKMkbIIULgbnpR0SGWWQlkpfYFIAAiXU6YzdqhYUjp9WKA0ngAJKvW6lllS9wFmxCNXQGFKsIXKhLx4EvghSCOfDoXiiPkaJuIdGAUsyPRjAJ3euffvjeuC7Ob/Yg5zerN++3O8i1RN9Q4JvcT3Epl/lDczeGc3+EBtLXdSDpSW7JmLMSMGamJ1Txl5qCcUM8CMJ5gJsfsnR9tpD7Woo9/WeWXKQDZXzeR/bIqLOvGXgkWh6W3RNy5PFaDBrechKfNMr3LoJ5RQz4yVC4tok+v5cjmfrnadxgl9r8Vz+oTV5S9Bw66Zb7a+kvwlESPcARw54dHY2Cm24kkMubHM1Lbok3UOpyR67KHJNWKaBSSqyqcphuf6YIMwOa/hKJGRTzTe2WSjNAX4TSj6tTpI6bo6otyYatkyXjqjFV4XdGhsl25fZzl19IkoQ0VSkJc2k/5tU1VSKJC2cj6SgGNUjfbFHDoKRkwfRIf/i8HMH+8u8MuzX5KM/GL3nnQ9mk+SjrhyMHOLTWGOF/VBIPO96pTKZmiFYSLhkhGl/tLNOlDgyvif4e2FmAMQZDdckgvSvrUygxgf3O90IHudA4RH3sD0nHsz+7OmDbo9ojlO6BkXVOEbDRatqO/uAW3zyTrc7uHEfyUHk/onYaF7PGf9KBRJA/fRziJKbBaE8pleujZQRs+PdDxijMpCM2h/h1aUXP4yaX/Lkkqvb+3wqt9v/40BvkG6jix67IdTiabQSLsArsqQNWFiS/QEh0ciUy1AAAA==","card":"assets/card/goliath.webp","wide":false},{"id":"a-54117","n":"哈姆林","hue":286,"skill":{"n":"魔笛","txt":"每 30 秒：6 秒内判定范围 ×1.5","trig":"time","need":30,"fx":"judge","val":1.5,"dur":6},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/hameln.webp","wide":false},{"id":"a-15587","n":"希洛","hue":230,"skill":{"n":"晨星","txt":"开场立刻：前 15 秒判定范围 ×1.5","trig":"start","need":0,"fx":"judge","val":1.5,"dur":15},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/helot.webp","wide":false},{"id":"a-15583","n":"奥尔拉","hue":240,"skill":{"n":"终焉预感","txt":"每 45 秒：8 秒得分 ×1.4","trig":"time","need":45,"fx":"score","val":1.4,"dur":8},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/horla.webp","wide":false},{"id":"a-15593","n":"詹金","hue":346,"skill":{"n":"静默屏障","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":30,"fx":"guard","val":1,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/jenkin.webp","wide":false},{"id":"a-15571","n":"珈伦","hue":240,"skill":{"n":"补给","txt":"每 %d 秒：回复 14 体力","trig":"time","need":32,"fx":"heal","val":14,"dur":0},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/karen.webp","wide":false},{"id":"a-77913","n":"凯蒂古拉","hue":77,"skill":{"n":"补给","txt":"每 %d 秒：回复 14 体力","trig":"time","need":36,"fx":"heal","val":14,"dur":0},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/kathigu-ra.webp","wide":false},{"id":"a-15597","n":"雷娅","hue":37,"skill":{"n":"聚光灯","txt":"每 %d 秒：6 秒内得分 ×1.35","trig":"time","need":30,"fx":"score","val":1.35,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/leigh.webp","wide":false},{"id":"a-15581","n":"莉莉","hue":63,"skill":{"n":"长曝光","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":48,"fx":"lead","val":1.18,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/lily.webp","wide":false},{"id":"a-15562","n":"莉兹","hue":291,"skill":{"n":"缓一拍","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":44,"fx":"lead","val":1.18,"dur":6},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/liz.webp","wide":false},{"id":"a-15569","n":"萝坦","hue":296,"skill":{"n":"补给","txt":"每 %d 秒：回复 14 体力","trig":"time","need":36,"fx":"heal","val":14,"dur":0},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/lotan.webp","wide":false},{"id":"a-15582","n":"弥利亚姆","hue":252,"skill":{"n":"梦引","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":35,"fx":"auto","val":1,"dur":5},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/miryam.webp","wide":false},{"id":"a-94450","n":"茉夏","hue":92,"skill":{"n":"接力棒","txt":"每 %d 秒：直接 +12 连击","trig":"time","need":34,"fx":"combo","val":12,"dur":0},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/mouchette.webp","wide":false},{"id":"a-15576","n":"墨菲","hue":311,"skill":{"n":"拦截","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":34,"fx":"guard","val":1,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/murphy.webp","wide":false},{"id":"a-15589","n":"诞妄·墨菲","hue":297,"skill":{"n":"聚光灯","txt":"每 %d 秒：6 秒内得分 ×1.35","trig":"time","need":34,"fx":"score","val":1.35,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/murphy-fauxborn.webp","wide":false},{"id":"a-15565","n":"诺缔拉","hue":118,"skill":{"n":"拦截","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":38,"fx":"guard","val":1,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/nautila.webp","wide":false},{"id":"a-15580","n":"宁菲亚","hue":247,"skill":{"n":"第二遍副歌","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":45,"fx":"auto","val":1,"dur":5},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/nymphaea.webp","wide":false},{"id":"a-15585","n":"奥吉尔","hue":133,"skill":{"n":"静默屏障","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":30,"fx":"guard","val":1,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/ogier.webp","wide":false},{"id":"a-15560","n":"潘狄娅","hue":306,"skill":{"n":"梦引","txt":"每 20 秒：5 秒内 Miss 自动救成 Good","trig":"time","need":20,"fx":"auto","val":1,"dur":5},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/pandia.webp","wide":false},{"id":"a-77926","n":"皮克曼","hue":42,"skill":{"n":"缓一拍","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":40,"fx":"lead","val":1.18,"dur":6},"pass":{"score":0.04},"art":"data:image/webp;base64,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","card":"assets/card/pickman.webp","wide":false},{"id":"a-77917","n":"波吕克斯","hue":17,"skill":{"n":"安眠","txt":"每 %d 秒：回复 14 体力","trig":"time","need":36,"fx":"heal","val":14,"dur":0},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/pollux.webp","wide":false},{"id":"a-15595","n":"拉蒙娜","hue":353,"skill":{"n":"安可","txt":"每 %d 秒：6 秒内得分 ×1.35","trig":"time","need":30,"fx":"score","val":1.35,"dur":6},"pass":{"score":0.02},"art":"data:image/webp;base64,UklGRi4IAABXRUJQVlA4ICIIAAAQIACdASpIAEgAPm0oj0WkIiEYXY1UQAbEs4BmRkpclH4DwV8f3uuQ63BajXaP5v4o+AE8HtAvaf7N/ufBw1JvCPmi/7n1q72Hz32A/5x/dv+V6j3/X5a/pn/1f6L4B/5l/Y/+p18f2w9lL9uBVEYLkKnEhcFBz14kfwQIQiyuMe/QEOMNtX+YNjuwXZ3Rt9EPqTVXe0cNi+jgJqoSzdCVM8ExiFELJ0/+xsDPD6gH+3rimol912+JSjqfadELQrMLAtqW+P0JuSJO8CJHE1dx6irrn3N/kMh8DoQ7a3b9vks40vsrmqhAD6s/JZqc0JJT7k6Js6Vlqm9//6BNbHOeGTJmgG9QW74AAP76W67XEKsETlO4yeP+HMePonmhVzNMbIUoDOD6/4mcw3cDdhntSLKCA4+Zs2kh1x/yAH9upWG+w0mpNp9gb1aQrWW+5hkzS3qKk1VQL5pkkF5/s6sNuV2ZQXFW30aDpzeuMB2jbYd6PET7HAeeflNQbHx6aVSaZ7+vIB/Evqeyj7EW/f60nlSLa/WzU/i2PXqKHufjfkAGw284AvQQ8JMlI4sFGlzZOf7k2KA+QTJoJgP0/cHhB2m5+UZVYalod8dTICPZZuqZJ4qNmfhXFGJrtQ2FSNqOfNjW0Tgv5r7jWxDoMHaBTjxxh2UH/uZxI9U688ILRl1dxE57Opdl68Ojb/8zgbcWfPeFMIoZW1e0BUoM5a2Z6Sx97Kv+5+g7SftS5vVVD1JyXEGNCJc9/SfZy703b/IiKKFnV/8fxeDTSLfPSQhA9ILLJid2/XinYQxEFCXBsapbANIFjMHhogoddbfPA18gNrQDyhnITqYKKoc8dsSaRIsi/nCVg/kyd/aynMEz0Sd2eE/GnrQAcHF43jZbTDaDWpvZqlZ/m8ViWpW1Nq4s0l/9ZlHNHfSP7Y+WOwXrIBHMYYimPs36vye8O3Ns85UIQ7cI74OuXm/kGqq7VlLfB2beVSVGYZEDspTJEHNoJRQchYmAiTvk4g6UEsbJC81QPN0QbeB2brjtTOI5xVb1oskycU55HdLnH28ctXjmF6ELrTzKEE8fKZYF9GrBlGGT+8MMb3rc6nwKHzkYqIgGi0lpYKqdayJCq6oSpswumlTNaHPDWvr/op3QWKnyYTOdLihRSQiEwh6MgjiJrohZZikGgFKdfZzwkujzf37OUv0MY3hMsQBDpRHNZ2ojwdvppurv692bUtwoiOguBf52cTwpTZnlwTYfAKe8UruQIGM3EEfeGxpZ3dhx6Ao+qX0YZ51/DgUy3+prgCAccVjGSQW1DB4bkZ0Tds2MWuF+B8e9Gu0NYZeiuPmvd0LoDy41cWd1ERhtFkPnpcEjX2KdrLheli7fPob8tSFMrhNfiKjhP6WfGrJwAlUisf5kmL6n8jbK27cRmr7TtMzDxjv/To748sYgqakE0KgGp7B/n3mJYUUmPWsd6sfvYE1yC1qBHyKR+Z8cv0orHnz8KmN/+qH//kw7mgynHjErxrpFvPMNU9vs0RzFPuVFcVErPd2juDF2kj96hXUKohgm0PUoZhROwJH6S6UbBGPEw7RwviLuJqyD6htGxka4HGcJdnXtnic3WKo6LXND0bz47uLMeVFKgu1rrQqXjO3wIqdxEhqfZHnKxZ6aj7Ozp8ZRGWlAuGrGS+494l/OYnxeyqrDKIoWdGqbSw/PE5YoOkVPPbz8mWQ+Yv8G7BpHBfy8MZw2LWKUEfrEACfjxEBjZONPWVX0mij8mRpZGnPZudia1RKbFHtokbkicte3oCmHmTkQHtS1n6Y2bacbb5XP7Vjzhj7slt/iCQap/4GhBYGcRj8vg+fgH7zBKaCa4swzH9ZVbNzeL4yHklUCpScdmTqy5aYTAxT5TVsGMx1v6+WYl0/gW2mwZYn6MbzmulSMlfvckj9BYP2aN2CezUWNScCok2hbs2PXnHxZXPC6X0F4ySIJYML+JvE1krDx2AP/C1KsoqYf+FXNePrWGJetSjCgiHmoOftcvwCwioDMR0cH+FdsVpcc4kQKkTwgvldO1wTuQW8SPhN9CxCyHApaSQL9N6OkKP7yWu/l80aFFFP+G5iw5PmwUYo8elgI1WGTaXlZx8DuGYng5nh9c2S8XALvW9KK1E3jEuPOgkOUC+IOUWBIJRr0embpCdS8j0gJZRQ5EWhFOc51abpLPZKAiYFob15FtXuArxpKyX8DkAy6UOlzEDEsbrgLDqdSHHrw2p/XGlBUM56mcV2ndUKmUUntu90fy7ATgE3M4xlRO6ApdeGFth14Skw+0Cv6410pPyCe6mn7wE8l14A9ImB6V3In0l7Jby/8hTQ/TqVO1YGRFJeRepaR+Hlo1qPne7poURyqUAXJvZ7RUYG0MBWvGytDhWNOk/Ctaom/+0tkHvK0mppPd/iOpV4piAELeWHUeYzyxqow9QDa/okJDpe4bx7LiBlkE6xsUIemC9dozm7AtiW5BmISARlEPTVrTiZevtu3sXS/m5B0wX8hPb7LxDMNdBcp/CS2jUKYcp5eLf1dF6ZH5cABjCHtPnxAVhW/BcsH23+LGHRxowoyqGUkWMiqnsaqzvWPANjSxq8EIMVbwlEsT3IyC7kpszxBFiYLsdXidyZkJ70hCsCCpAHuO7Kciv4jCuH5LOAmw+dX/hmY622aUR68Rs3KNvHgf5QnrvU6v+/yNkow4DGmyneY3//wyP/54UzRAkqQFlNWBM4QRqbI+Ir34gxlXY+fMLNQFGPG7yhNEo9avA2LMSRogDORCAA=","card":"assets/card/ramona.webp","wide":false},{"id":"a-15604","n":"莱克","hue":316,"skill":{"n":"守夜","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":34,"fx":"guard","val":1,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/ryker.webp","wide":false},{"id":"a-15599","n":"萨尔瓦多","hue":310,"skill":{"n":"缓一拍","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":40,"fx":"lead","val":1.18,"dur":6},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/salvador.webp","wide":false},{"id":"a-15592","n":"珊","hue":260,"skill":{"n":"疗愈","txt":"每 %d 秒：回复 14 体力","trig":"time","need":32,"fx":"heal","val":14,"dur":0},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/sanga.webp","wide":false},{"id":"a-15584","n":"索蕾尔","hue":137,"skill":{"n":"满场的手灯","txt":"每 %d 秒：直接 +12 连击","trig":"time","need":30,"fx":"combo","val":12,"dur":0},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/sorel.webp","wide":false},{"id":"a-54116","n":"塔薇","hue":145,"skill":{"n":"第二遍副歌","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":35,"fx":"auto","val":1,"dur":5},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/tawil.webp","wide":false},{"id":"a-15596","n":"泰旖丝","hue":63,"skill":{"n":"夜航","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":48,"fx":"lead","val":1.18,"dur":6},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/thais.webp","wide":false},{"id":"a-15574","n":"汀克特","hue":198,"skill":{"n":"鹰眼视界","txt":"每 %d 秒：6 秒内判定范围 ×1.35","trig":"time","need":28,"fx":"judge","val":1.35,"dur":6},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/tinct.webp","wide":false},{"id":"a-15563","n":"图鲁","hue":285,"skill":{"n":"接力棒","txt":"每 %d 秒：直接 +12 连击","trig":"time","need":34,"fx":"combo","val":12,"dur":0},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/tulu.webp","wide":false},{"id":"a-15598","n":"尤乌哈希","hue":127,"skill":{"n":"补给","txt":"每 %d 秒：回复 14 体力","trig":"time","need":40,"fx":"heal","val":14,"dur":0},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/uvhash.webp","wide":false},{"id":"a-15586","n":"旺达","hue":171,"skill":{"n":"拦截","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":30,"fx":"guard","val":1,"dur":6},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/wanda.webp","wide":false},{"id":"a-15579","n":"温柯尔","hue":154,"skill":{"n":"夜航","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":44,"fx":"lead","val":1.18,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/winkle.webp","wide":false},{"id":"a-125346","n":"徐","hue":155,"skill":{"n":"挽回","txt":"每 %d 连击：5 秒内 Miss 自动救成 Good","trig":"combo","need":40,"fx":"auto","val":1,"dur":5},"pass":null,"art":"data:image/webp;base64,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","card":"assets/card/xu.webp","wide":false},{"id":"a-130901","n":"莫丝","hue":205,"skill":{"n":"安眠","txt":"每 %d 秒：回复 14 体力","trig":"time","need":32,"fx":"heal","val":14,"dur":0},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/vortice.webp","wide":false},{"id":"a-77918","n":"阿拉克涅","hue":204,"skill":{"n":"镜面回响","txt":"每 %d 秒：6 秒内判定范围 ×1.35","trig":"time","need":36,"fx":"judge","val":1.35,"dur":6},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/arachne.webp","wide":false},{"id":"a-130226","n":"沙耶","hue":337,"skill":{"n":"接力棒","txt":"每 %d 秒：直接 +12 连击","trig":"time","need":38,"fx":"combo","val":12,"dur":0},"pass":{"score":0.03},"art":"data:image/webp;base64,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","card":"assets/card/saya.webp","wide":false},{"id":"a-141302","n":"庞托斯","hue":162,"skill":{"n":"温热的掌心","txt":"每 %d 秒：回复 14 体力","trig":"time","need":40,"fx":"heal","val":14,"dur":0},"pass":{"judge":0.03},"art":"data:image/webp;base64,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","card":"assets/card/pontos.webp","wide":false},{"id":"a-145363","n":"蚀灭·萝坦","hue":235,"skill":{"n":"慢镜头","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":44,"fx":"lead","val":1.18,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/lotan-cetarchon.webp","wide":false},{"id":"a-77921","n":"卡拉布","hue":318,"skill":{"n":"不破之壁","txt":"每 %d 秒：6 秒内 Miss 不断连、不掉血","trig":"time","need":38,"fx":"guard","val":1,"dur":6},"pass":{"judge":0.02},"art":"data:image/webp;base64,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","card":"assets/card/caraboo.webp","wide":false},{"id":"a-148578","n":"负誓·奥吉尔","hue":243,"skill":{"n":"夜航","txt":"每 %d 秒：6 秒内音符飞得慢 18%","trig":"time","need":44,"fx":"lead","val":1.18,"dur":6},"pass":{"score":0.04},"art":"data:image/webp;base64,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","card":"assets/card/ogier-oathbound.webp","wide":false},{"id":"a-151844","n":"薇薇安","hue":246,"skill":{"n":"聚光灯","txt":"每 %d 秒：6 秒内得分 ×1.35","trig":"time","need":30,"fx":"score","val":1.35,"dur":6},"pass":{"score":0.02},"art":"data:image/webp;base64,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","card":"assets/card/vivian.webp","wide":false}];
const PACKS = {"ashesreign":{"file":"assets/ll-music/ashesreign.bin","dur":247.88,"kb":3389},"boiling":{"file":"assets/ll-music/boiling.bin","dur":208.69,"kb":2853},"bokura":{"file":"assets/ll-music/bokura.bin","dur":276.09,"kb":3775},"bujian":{"file":"assets/ll-music/bujian.bin","dur":363.68,"kb":4972},"dangzhan":{"file":"assets/ll-music/dangzhan.bin","dur":204.88,"kb":2801},"daogu":{"file":"assets/ll-music/daogu.bin","dur":284.16,"kb":3885},"dawnbreaker":{"file":"assets/ll-music/dawnbreaker.bin","dur":235.28,"kb":3217},"flywings":{"file":"assets/ll-music/flywings.bin","dur":194.72,"kb":2662},"glory":{"file":"assets/ll-music/glory.bin","dur":232.25,"kb":3175},"hezengju":{"file":"assets/ll-music/hezengju.bin","dur":194.98,"kb":2666},"jianghu":{"file":"assets/ll-music/jianghu.bin","dur":306.86,"kb":4195},"kiseki":{"file":"assets/ll-music/kiseki.bin","dur":254.85,"kb":3484},"kuang":{"file":"assets/ll-music/kuang.bin","dur":205.56,"kb":2810},"lament":{"file":"assets/ll-music/lament.bin","dur":223.87,"kb":3061},"natsuiro":{"file":"assets/ll-music/natsuiro.bin","dur":269.77,"kb":3688},"opblade":{"file":"assets/ll-music/opblade.bin","dur":238.39,"kb":3259},"patches":{"file":"assets/ll-music/patches.bin","dur":232.91,"kb":3184},"pyrite":{"file":"assets/ll-music/pyrite.bin","dur":262.92,"kb":3595},"radiant":{"file":"assets/ll-music/radiant.bin","dur":252.34,"kb":3450},"reconn":{"file":"assets/ll-music/reconn.bin","dur":261.67,"kb":3578},"renegade":{"file":"assets/ll-music/renegade.bin","dur":234.11,"kb":3201},"snow":{"file":"assets/ll-music/snow.bin","dur":256.21,"kb":3503},"solight":{"file":"assets/ll-music/solight.bin","dur":245.89,"kb":3362},"tiantian":{"file":"assets/ll-music/tiantian.bin","dur":248.66,"kb":3400},"wakingworld":{"file":"assets/ll-music/wakingworld.bin","dur":199.34,"kb":2725},"wanchong":{"file":"assets/ll-music/wanchong.bin","dur":242.08,"kb":3310},"wanshen":{"file":"assets/ll-music/wanshen.bin","dur":307.07,"kb":4198},"windwhere":{"file":"assets/ll-music/windwhere.bin","dur":290.17,"kb":3967},"wolfking":{"file":"assets/ll-music/wolfking.bin","dur":214.7,"kb":2935}};
return { UNITS, PACKS };
})();

// ---- js/ll/aesjs.js
const m_aesjs = await (async () => {

// 纯 JS 的 AES-256-CTR：给「没有 crypto.subtle」的环境留一条能解出原曲的路。
//
// 为什么需要它：crypto.subtle 只在安全上下文（https / localhost / file）里存在。
// 手机上从 http 打开、或者用的是某些内置浏览器（QQ / UC / 老 WebView），
// 这个对象直接是 undefined，WebCrypto 那条路连钥匙都拿不到，页面就只剩芯片合成，
// 玩家听到的全是电子音。包里的口令、格式都没有变，这里只是把 GCM 的 CTR 段
// 用纯 JS 再算一遍——解出来的字节和 WebCrypto 那条路完全一样。
//
// 只做加密方向：GCM 的正文就是 CTR 模式的密钥流异或，用不到解密的 InvMixColumns。
// T 表实现，手机上一次 4MB 大约 100~300ms，只发生在开歌那一下。
//
// 注意：不做 GCM 的 tag 校验（GHASH 要再写一套 GF(2^128) 乘法，为这点完整性不值）。
// 解错时结果是乱码，由调用方的 looksAudio() 嗅魔数挡住，然后照旧退回芯片合成。

const SBOX = new Uint8Array(256);
const T0 = new Uint32Array(256);
const T1 = new Uint32Array(256);
const T2 = new Uint32Array(256);
const T3 = new Uint32Array(256);

function mul2(b) { return ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 0xff; }
function rotl8(x, n) { return ((x << n) | (x >> (8 - n))) & 0xff; }

(function buildTables() {
  // S 盒：GF(2^8) 的逆元再套仿射变换。p 走 3 的幂、q 走逆元，一圈覆盖所有非零元。
  let p = 1, q = 1;
  do {
    p = (p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)) & 0xff;
    // 每一步都得截到 8 位：C 里 q 是 uint8_t，赋值天然会砍掉高位，
    // JS 不砍的话后面 q<<2 / q<<4 会带着溢出位，整个 S 盒就歪了
    q = (q ^ (q << 1)) & 0xff;
    q = (q ^ (q << 2)) & 0xff;
    q = (q ^ (q << 4)) & 0xff;
    if (q & 0x80) q ^= 0x09;
    const x = (q ^ rotl8(q, 1) ^ rotl8(q, 2) ^ rotl8(q, 3) ^ rotl8(q, 4)) & 0xff;
    SBOX[p] = x ^ 0x63;
  } while (p !== 1);
  SBOX[0] = 0x63;

  for (let i = 0; i < 256; i++) {
    const s = SBOX[i];
    const s2 = mul2(s);
    const s3 = s2 ^ s;
    T0[i] = ((s2 << 24) | (s << 16) | (s << 8) | s3) >>> 0;
    T1[i] = ((s3 << 24) | (s2 << 16) | (s << 8) | s) >>> 0;
    T2[i] = ((s << 24) | (s3 << 16) | (s2 << 8) | s) >>> 0;
    T3[i] = ((s << 24) | (s << 16) | (s3 << 8) | s2) >>> 0;
  }
})();

const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

// AES-256：8 个 32 位字一段，14 轮
function expandKey(key) {
  const Nk = 8, Nr = 14;
  const w = new Uint32Array(4 * (Nr + 1));
  for (let i = 0; i < Nk; i++) {
    w[i] = ((key[4 * i] << 24) | (key[4 * i + 1] << 16) | (key[4 * i + 2] << 8) | key[4 * i + 3]) >>> 0;
  }
  const subWord = (t) => ((SBOX[t >>> 24] << 24) | (SBOX[(t >>> 16) & 255] << 16)
    | (SBOX[(t >>> 8) & 255] << 8) | SBOX[t & 255]) >>> 0;
  for (let i = Nk; i < w.length; i++) {
    let t = w[i - 1];
    if (i % Nk === 0) {
      t = ((t << 8) | (t >>> 24)) >>> 0;                    // RotWord
      t = (subWord(t) ^ (RCON[(i / Nk | 0) - 1] << 24)) >>> 0;
    } else if (i % Nk === 4) {
      t = subWord(t);                                       // AES-256 独有的那半步
    }
    w[i] = (w[i - Nk] ^ t) >>> 0;
  }
  return { w, Nr };
}

// 加密一个 16 字节块：状态按列存成四个 u32，字节 0 在最高位
function encBlock(w, Nr, src, so, dst, dO) {
  let s0 = ((src[so] << 24) | (src[so + 1] << 16) | (src[so + 2] << 8) | src[so + 3]) ^ w[0];
  let s1 = ((src[so + 4] << 24) | (src[so + 5] << 16) | (src[so + 6] << 8) | src[so + 7]) ^ w[1];
  let s2 = ((src[so + 8] << 24) | (src[so + 9] << 16) | (src[so + 10] << 8) | src[so + 11]) ^ w[2];
  let s3 = ((src[so + 12] << 24) | (src[so + 13] << 16) | (src[so + 14] << 8) | src[so + 15]) ^ w[3];
  for (let r = 1; r < Nr; r++) {
    const k = r << 2;
    const t0 = (T0[s0 >>> 24] ^ T1[(s1 >>> 16) & 255] ^ T2[(s2 >>> 8) & 255] ^ T3[s3 & 255] ^ w[k]) >>> 0;
    const t1 = (T0[s1 >>> 24] ^ T1[(s2 >>> 16) & 255] ^ T2[(s3 >>> 8) & 255] ^ T3[s0 & 255] ^ w[k + 1]) >>> 0;
    const t2 = (T0[s2 >>> 24] ^ T1[(s3 >>> 16) & 255] ^ T2[(s0 >>> 8) & 255] ^ T3[s1 & 255] ^ w[k + 2]) >>> 0;
    const t3 = (T0[s3 >>> 24] ^ T1[(s0 >>> 16) & 255] ^ T2[(s1 >>> 8) & 255] ^ T3[s2 & 255] ^ w[k + 3]) >>> 0;
    s0 = t0; s1 = t1; s2 = t2; s3 = t3;
  }
  // 末轮：只做 SubBytes + ShiftRows，不再 MixColumns，最后照样要 AddRoundKey。
  // （漏掉最后这一步的话，结果看起来一样是「一片随机字节」，但谁也认不出来。）
  const k = Nr << 2;
  const r0 = w[k], r1 = w[k + 1], r2 = w[k + 2], r3 = w[k + 3];
  dst[dO] = SBOX[s0 >>> 24] ^ (r0 >>> 24);
  dst[dO + 1] = SBOX[(s1 >>> 16) & 255] ^ ((r0 >>> 16) & 255);
  dst[dO + 2] = SBOX[(s2 >>> 8) & 255] ^ ((r0 >>> 8) & 255);
  dst[dO + 3] = SBOX[s3 & 255] ^ (r0 & 255);
  dst[dO + 4] = SBOX[s1 >>> 24] ^ (r1 >>> 24);
  dst[dO + 5] = SBOX[(s2 >>> 16) & 255] ^ ((r1 >>> 16) & 255);
  dst[dO + 6] = SBOX[(s3 >>> 8) & 255] ^ ((r1 >>> 8) & 255);
  dst[dO + 7] = SBOX[s0 & 255] ^ (r1 & 255);
  dst[dO + 8] = SBOX[s2 >>> 24] ^ (r2 >>> 24);
  dst[dO + 9] = SBOX[(s3 >>> 16) & 255] ^ ((r2 >>> 16) & 255);
  dst[dO + 10] = SBOX[(s0 >>> 8) & 255] ^ ((r2 >>> 8) & 255);
  dst[dO + 11] = SBOX[s1 & 255] ^ (r2 & 255);
  dst[dO + 12] = SBOX[s3 >>> 24] ^ (r3 >>> 24);
  dst[dO + 13] = SBOX[(s0 >>> 16) & 255] ^ ((r3 >>> 16) & 255);
  dst[dO + 14] = SBOX[(s1 >>> 8) & 255] ^ ((r3 >>> 8) & 255);
  dst[dO + 15] = SBOX[s2 & 255] ^ (r3 & 255);
}

// AES-GCM 的正文 = AES-CTR(J0+1)，J0 = iv || 0x00000001，12 字节 IV 时正好是
// 「iv 后面补 00 00 00 02」开头，之后只递增最后 4 字节。
function aesGcmCtr(key, iv, ct) {
  const { w, Nr } = expandKey(key);
  const ctr = new Uint8Array(16);
  ctr.set(iv.subarray(0, 12));
  ctr[15] = 2;
  const ks = new Uint8Array(16);
  const out = new Uint8Array(ct.length);
  for (let off = 0; off < ct.length; off += 16) {
    encBlock(w, Nr, ctr, 0, ks, 0);
    const n = Math.min(16, ct.length - off);
    for (let i = 0; i < n; i++) out[off + i] = ct[off + i] ^ ks[i];
    for (let i = 15; i >= 12; i--) {
      ctr[i] = (ctr[i] + 1) & 0xff;
      if (ctr[i]) break;
    }
  }
  return out;
}

// 解出来的到底是不是音频：只认几个开头的魔数。
// 这一步替代了 GCM 的 tag 校验——密钥/IV 不对时算出来的是噪声，解不出可播的头。
function looksAudio(b) {
  if (!b || b.length < 12) return false;
  const be = (o, s) => {
    for (let i = 0; i < s.length; i++) if (b[o + i] !== s.charCodeAt(i)) return false;
    return true;
  };
  if (be(0, 'ID3')) return true;                       // mp3 带标签
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) return true;   // mp3 裸帧同步字
  if (be(4, 'ftyp')) return true;                      // m4a / mp4
  if (be(0, 'OggS')) return true;
  if (be(0, 'fLaC')) return true;
  if (be(0, 'RIFF')) return true;
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return true;   // webm
  return false;
}
return { aesGcmCtr, looksAudio };
})();

// ---- js/ll/musicbox.js
const m_musicbox = await (async () => {
const { aesGcmCtr, looksAudio } = m_aesjs;
// 曲库原曲包：仓库里放的是加过密的音频块，页面拿到之后在本地解开。
//
// 为什么要这样：音游最好听的是原曲，但公开仓库直接放 mp3 等于把唱片重新分发一遍。
// 这里做成「加密打包 + 浏览器内解密」——资源包里没有能直接播放的文件，
// 顺手拖出来的也是一堆密文。要说清楚的是：**这不是版权保护**，
// 密钥就在这个脚本里，任何肯读代码的人都能解开；它只是让仓库里不出现裸音频，
// 也避免被当成公开下载源。曲目版权归原权利人所有，仓库只做同人小游戏的技术演示。
//
// 包格式（scripts/ll-music.py 生成，别手改）：
//   [0..8)  魔数 "MBLLPK1\n"
//   [8..20) AES-GCM 的 12 字节 IV
//   [20..]  密文（尾部 16 字节是 GCM tag）
//
// 口令走 SHA-256 当密钥：Python 和 WebCrypto 两边算出来必须是同一串。
// 改口令 = 之前打的所有包全部作废，得重跑脚本。



const MAGIC = 'MBLLPK1\n';
// 口令拆成几段拼起来，纯粹为了不让它在源码里以整串明文出现（还是那句话：不是保护）
const PASS = ['mori', 'mens', '\u2605', 'love', 'live', '-pack-1'].join('');

// 纯 JS 解密用的密钥字节：就是上面那段口令的 SHA-256，和 WebCrypto 那条路
// digest 出来的是同一串（'1b255e8e…'）。写死是因为没有 subtle 的时候也就没有
// digest，为了省掉一套纯 JS 的 SHA-256 实现——真要改口令，这里得跟着改。
const KEY32 = (() => {
  const hex = '1b255e8ee4ed6c3b3307c8e313026ab08568618591b1a2d87086e6c482633cb8';
  const b = new Uint8Array(32);
  for (let i = 0; i < 32; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
  return b;
})();

const CACHE = new Map();          // id -> ArrayBuffer（只留最近两份，别把内存吃光）
const enc = new TextEncoder();
let keyP = null;
let keyS = null;                  // 这份 key 是拿哪个 subtle 算出来的

// 为什么要有 why()：手机上一旦取包/解密失败，页面会安静地退回芯片合成，
// 用户只听见「电子音」却不知道坏在哪一步。把原因留在这里，暂停面板直接显示。
let lastWhy = '';
function why() { return lastWhy; }
// 上一次是走哪条路解开的：'wc' = WebCrypto，'js' = 纯 JS 兜底。
// 面板上写一句「纯 JS 解密」比让用户以为卡住要好。
let lastHow = '';
function how() { return lastHow; }

// WebCrypto：iOS 11 之前叫 crypto.webkitSubtle；某些手机内置浏览器两个都没有
// （常见于非 https 打开），那时只能退回芯片合成。
function subtleOf() {
  const c = window.crypto;
  if (!c) return null;
  return c.subtle || c.webkitSubtle || null;
}

function getKey(s) {
  if (keyP && keyS === s) return keyP;
  keyS = s;
  keyP = s.digest('SHA-256', enc.encode(PASS))
    .then((h) => s.importKey('raw', h, { name: 'AES-GCM' }, false, ['decrypt']));
  return keyP;
}

// 解一个包：返回 ArrayBuffer（音频原始字节）。没有包 / 不是包 / 解不开都返回 null，
// 调用方退回芯片改编，页面不能因此挂掉。
async function unpack(buf) {
  lastWhy = '';
  if (!buf || buf.byteLength < 32) { lastWhy = '包不对（太短）'; return null; }
  const head = new Uint8Array(buf, 0, 8);
  for (let i = 0; i < MAGIC.length; i++) {
    if (head[i] !== MAGIC.charCodeAt(i)) { lastWhy = '取回来的不是原曲包'; return null; }
  }
  const iv = new Uint8Array(buf.slice(8, 20));
  const body = buf.slice(20);
  // ① 有 WebCrypto 就先走它：快，而且 GCM 的 tag 顺带做了完整性校验。
  const s = subtleOf();
  if (s) {
    try {
      const key = await getKey(s);
      const plain = await s.decrypt({ name: 'AES-GCM', iv }, key, body);
      if (looksAudio(new Uint8Array(plain, 0, Math.min(16, plain.byteLength)))) { lastHow = 'wc'; return plain; }
      lastWhy = 'WebCrypto 解出来的不是音频';
    } catch (e) {
      lastWhy = 'WebCrypto 解不开：' + ((e && (e.name || e.message)) || e);
    }
  }
  // ② 没有 subtle、或者它解不开——纯 JS 再算一遍。
  //    手机从 http 打开、或者内置浏览器把 crypto.subtle 关掉时就落到这里：
  //    以前到这一步就只剩芯片合成了，玩家听到的全是电子音。
  try {
    const plain = aesGcmCtr(KEY32, iv, new Uint8Array(body, 0, body.byteLength - 16));
    if (looksAudio(plain)) { lastWhy = ''; lastHow = 'js'; return plain.buffer; }
    lastWhy = (lastWhy ? lastWhy + '；' : '') + '解出来的不是音频（包与密钥不匹配）';
  } catch (e) {
    lastWhy = (lastWhy ? lastWhy + '；' : '') + '纯 JS 解密失败：' + ((e && e.message) || e);
  }
  return null;
}

// 取某个曲子的原曲包字节。PACKS 是构建时从 data/ll-music.json 生成的清单。
async function fetchPack(packs, id) {
  const meta = packs && packs[id];
  if (!meta || !meta.file) { lastWhy = '这首没有原曲包'; return null; }
  if (CACHE.has(id)) return CACHE.get(id);
  const want = (meta.kb || 0) * 1024;
  // 两次尝试：第一次带 no-cache（有 304 就复用，省流量）；万一拿回来的是缓存里
  // 躺着的旧包 / 上次没下完的截断包（手机上换网、后台被杀都很常见），
  // 第二次换成带时间戳的 URL 硬重下 —— 这条能绕开所有中间缓存与 Service Worker。
  const tries = [
    { url: meta.file, cache: 'no-cache' },
    { url: meta.file + (meta.file.includes('?') ? '&' : '?') + 'r=' + Date.now(), cache: 'reload' },
  ];
  for (const t of tries) {
    let raw = null;
    try {
      const r = await fetch(t.url, { cache: t.cache });
      if (!r.ok) { lastWhy = '取包失败 HTTP ' + r.status; continue; }
      raw = await r.arrayBuffer();
    } catch (e) {
      lastWhy = '取包失败：' + ((e && e.message) || e);
      continue;
    }
    // 长度对不上就当这份不能用（清单里记着 kb，正好拿来校验）
    if (want > 0 && Math.abs(raw.byteLength - want) > want * 0.05) {
      lastWhy = '包长度不对（' + raw.byteLength + ' / ' + want + '）';
      continue;
    }
    const plain = await unpack(raw);
    if (!plain) continue;
    lastWhy = '';
    CACHE.set(id, plain);
    while (CACHE.size > 2) CACHE.delete(CACHE.keys().next().value);
    return plain;
  }
  return null;
}

function hasPack(packs, id) {
  return !!(packs && packs[id] && packs[id].file);
}
return { why, how, unpack, fetchPack, hasPack };
})();

// ---- js/ll/shop.js
const m_shop = await (async () => {

// 工坊：导入一首自己的音频 → 按鼓点自动出谱 → 在时间轴上改 → 存本机 / 发布到云端曲库。
//
// 这里只管「谱面的制作与发行」，不碰对局逻辑：对局那一侧只要拿到
// 「一段 notes + 一个 AudioBuffer」就能开局，接口由 lovelive.js 注入（api）。
//
// 三条硬规矩（和整站一致）：
//   ① 音频不上传。导入的文件只进本机 IndexedDB，云库里发的是谱面（时间 + 轨道），
//      别人拿到谱面要自己配音频；这也是公开仓库能收谱面的前提。
//   ② 谱面是纯数据，最大 3000 个音符（约 40KB），服务端限 900KB，够用。
//   ③ 发布要登录（走站点同一套 authToken），没登录就明确告诉用户去首页登录。

const LANES = 9;
const NOTE_R = 0.3;             // 音符半径 = 行高 × 这个比例

function initShop(api) {
  const { G, SAVE, persist, Audio, show, startLive, renderSongs, $, $$ } = api;
  const chartFromOnsets = api.chartFromOnsets;
  const detectOnsets = api.detectOnsets;
  const packOnsets = api.packOnsets;
  const diffOf = api.diffOf;
  const fmt = api.fmt;
  const mmss = api.mmss;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ---------------------------------------------------------------- 小工具 */
  const idbCGet = api.idbCGet, idbCSet = api.idbCSet, idbCDel = api.idbCDel;
  const idbGet = api.idbGet, idbSet = api.idbSet, idbDel = api.idbDel;
  const decode = (raw) => Audio.decode(raw);
  const now = () => Date.now();
  const uid = () => 'm' + now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 5);

  function status(el, msg, err) {
    const n = $(el);
    if (!n) return;
    n.textContent = msg || '';
    n.classList.toggle('err', !!err);
  }

  /* ---------------------------------------------------------------- 云端 */
  // 站点和函数同源时直接 /api；GitHub Pages 镜像站才需要绝对地址
  const apiBase = () => (/\.github\.io$/i.test(location.hostname)
    ? 'https://zjtt-api.workers.dev'
    : location.origin + '/api');
  function token() {
    try {
      const raw = localStorage.getItem('zjtt:authToken');
      if (!raw) return '';
      const v = JSON.parse(raw);
      return typeof v === 'string' ? v : '';
    } catch (e) { return ''; }
  }
  async function call(path, opt) {
    const o = opt || {};
    const t = token();
    const r = await fetch(apiBase() + path, {
      method: o.method || 'GET',
      headers: Object.assign({ Accept: 'application/json' }, t ? { Authorization: 'Bearer ' + t } : {},
        o.body ? { 'Content-Type': 'application/json' } : {}),
      body: o.body ? JSON.stringify(o.body) : undefined,
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) {
      const code = (j && j.error) || ('http_' + r.status);
      const e = new Error(code);
      e.code = code;
      e.status = r.status;
      throw e;
    }
    return j;
  }

  /* ---------------------------------------------------------------- 我的谱面 */
  const MINE = () => SAVE.mine;
  function saveMine(list) { SAVE.mine = list.slice(0, 60); persist(); }

  // 把任意记录压成一份「对局能吃的谱面」
  function packNotes(list) {
    return list
      .slice()
      .sort((a, b) => a.t - b.t || a.lane - b.lane)
      .map((n) => [+n.t.toFixed(3), n.lane | 0, n.kind === 'hold' ? 1 : 0, +(n.tail || 0).toFixed(3), +((n.s || 0.6)).toFixed(2)]);
  }
  function unpackNotes(arr) {
    return (arr || []).map((a) => ({
      t: +a[0], lane: clamp(a[1] | 0, 0, 8), kind: a[2] ? 'hold' : 'tap',
      tail: a[2] ? +a[3] : 0, s: a[4] == null ? 0.6 : +a[4], judged: false, hit: false, holding: false,
    }));
  }

  async function saveChart(rec) {
    // rec: {id, title, artist, dur, audioKey, notes: [..packed..], cloud}
    await idbCSet(rec.id, { notes: rec.notes, dur: rec.dur, audioKey: rec.audioKey, at: now() });
    const list = MINE().slice();
    const i = list.findIndex((m) => m.id === rec.id);
    const meta = {
      id: rec.id, title: rec.title, artist: rec.artist || '', dur: rec.dur,
      count: rec.notes.length, at: now(), cloud: rec.cloud || (i >= 0 ? list[i].cloud : '') || '',
    };
    if (i >= 0) list[i] = Object.assign(list[i], meta); else list.unshift(meta);
    saveMine(list);
    return meta;
  }

  /* ---------------------------------------------------------------- 列表渲染 */
  function songOf(m) {
    return {
      id: 'c-' + m.id, n: m.title, sub: '我的谱面' + (m.artist ? ' · ' + m.artist : ''),
      bpm: 0, custom: true, mineId: m.id, dur: m.dur, count: m.count,
    };
  }
  function songs() { return MINE().map(songOf); }

  function renderMine() {
    const box = $('#shop-mine');
    if (!box) return;
    const list = MINE();
    if (!list.length) { box.innerHTML = '<p class="dim">还没有。上面选一个音频文件，先让它自动出一版谱子。</p>'; return; }
    box.innerHTML = list.map((m) => (
      '<div class="mrow" data-id="' + m.id + '">'
      + '<div class="mi"><b>' + esc(m.title) + '</b><span>' + (m.count || 0) + ' 音符 · ' + mmss(m.dur)
      + (m.cloud ? ' · ☁ 已发布' : '') + '</span></div>'
      + '<div class="ma">'
      + '<button data-act="play" type="button">试玩</button>'
      + '<button data-act="edit" type="button">编辑</button>'
      + '<button data-act="pub" type="button">发布</button>'
      + '<button data-act="del" type="button">删</button>'
      + '</div></div>'
    )).join('');
  }

  function renderCloud() {
    const box = $('#shop-cloud');
    if (!box) return;
    if (!CLOUD.items.length) {
      box.innerHTML = '<p class="dim">云端还没有谱面。你发布的第一份就会出现在这里。</p>';
      return;
    }
    box.innerHTML = CLOUD.items.map((c) => (
      '<div class="mrow" data-cid="' + esc(c.id) + '">'
      + '<div class="mi"><b>' + esc(c.title || '未命名') + '</b><span>'
      + (c.authorName ? esc(c.authorName) + ' · ' : '') + (c.count || 0) + ' 音符 · ' + mmss(c.dur)
      + (SAVE.cloudAudio[c.id] ? ' · ♪ 已配音频' : '') + '</span></div>'
      + '<div class="ma"><button data-act="cplay" type="button">试玩</button></div>'
      + '</div>'
    )).join('');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const CLOUD = { items: [], loaded: false };

  async function loadCloud(force) {
    if (CLOUD.loaded && !force) return;
    status('#shop-cloud-status', '正在拉云端曲库…');
    try {
      const j = await call('/llsongs?limit=40');
      CLOUD.items = (j.items || []).slice();
      CLOUD.loaded = true;
      status('#shop-cloud-status', CLOUD.items.length ? ('共 ' + (j.total || CLOUD.items.length) + ' 份谱面') : '云端还没有谱面。');
    } catch (e) {
      status('#shop-cloud-status', '云端连不上（' + (e.code || 'offline') + '）。静态站能玩，但曲库要等接口部署好。', true);
    }
    renderCloud();
  }

  /* ---------------------------------------------------------------- 导入 → 自动出谱 */
  let shopDiff = 'normal';
  let pending = null;      // 正在等文件：{ mode:'new' } | { mode:'audio', cloudId }

  async function importNew(file) {
    status('#shop-status', '正在读取「' + file.name + '」…');
    try {
      const raw = await file.arrayBuffer();
      const ac = Audio.ensure();
      if (!ac) throw new Error('这个浏览器没有 WebAudio，放不了音频');
      status('#shop-status', '正在解码…（大文件要等几秒）');
      await new Promise((r) => setTimeout(r, 20));
      const buf = await decode(raw.slice(0));
      status('#shop-status', '正在抓鼓点…（' + mmss(buf.duration) + '）');
      await new Promise((r) => setTimeout(r, 20));
      const onsets = detectOnsets(buf);
      const D = diffOf(shopDiff);
      const seed = (Date.now() & 0x7fffffff) >>> 0;
      const c = chartFromOnsets(onsets, buf.duration, D, seed);
      const id = uid();
      const audioKey = 'au:' + id;
      await idbSet(audioKey, { name: file.name, data: raw.slice(0), onsets: packOnsets(onsets), dur: buf.duration });
      const title = file.name.replace(/\.[^.]+$/, '').slice(0, 40) || '未命名曲目';
      const meta = await saveChart({
        id, title, artist: '', dur: buf.duration, audioKey,
        notes: packNotes(c.notes),
      });
      status('#shop-status', '好了：' + meta.count + ' 个音符。进编辑器看看？');
      renderMine();
      openEditor(Object.assign({ audio: buf, audioKey }, meta, { notes: packNotes(c.notes) }));
    } catch (e) {
      status('#shop-status', '没成功：' + (e && e.message ? e.message : '这个文件解不开（换个 mp3 / m4a / wav 试试）'), true);
    }
  }

  // 云端谱面配本地音频：时长差超过 6 秒就提醒（谱面按原曲时间写死，差太多会错位）
  async function bindCloudAudio(cloudId, file) {
    status('#shop-status', '正在给云端谱面配音频…');
    try {
      const raw = await file.arrayBuffer();
      const buf = await decode(raw.slice(0));
      const one = await call('/llsongs/' + encodeURIComponent(cloudId));
      const want = Number(one.dur) || 0;
      const diff = Math.abs(buf.duration - want);
      const audioKey = 'cl:' + cloudId;
      await idbSet(audioKey, { name: file.name, data: raw.slice(0), dur: buf.duration });
      SAVE.cloudAudio[cloudId] = { name: file.name, dur: buf.duration };
      persist();
      status('#shop-status', diff > 6
        ? ('配上了，但这段音频 ' + mmss(buf.duration) + ' 和谱面的 ' + mmss(want) + ' 差了 ' + Math.round(diff) + ' 秒，可能会错位。')
        : ('配好了：' + mmss(buf.duration) + '，和谱面对得上。'), diff > 6);
      renderCloud();
      playCloud(cloudId, buf, audioKey);
    } catch (e) {
      status('#shop-status', '配音频失败：' + (e && e.message ? e.message : e.code || '未知'), true);
    }
  }

  /* ---------------------------------------------------------------- 对局入口 */
  async function playMine(id) {
    const m = MINE().find((x) => x.id === id);
    if (!m) return;
    G.song = songOf(m);
    G.diffK = 'normal';
    startLive();
  }
  async function playCloud(cloudId, buf, audioKey) {
    let title = '';
    let dur = 0;
    try {
      const one = await call('/llsongs/' + encodeURIComponent(cloudId));
      title = one.title || '云端谱面';
      dur = Number(one.dur) || 0;
    } catch (e) {
      status('#shop-cloud-status', '云端谱面拉不下来（' + (e.code || 'offline') + '）', true);
      return;
    }
    G.song = {
      id: 'k-' + cloudId, n: title, sub: '云端曲库', bpm: 0, custom: true,
      cloudId, dur, count: 0,
    };
    G.diffK = 'normal';
    if (buf) { /* 已经解码好，startLive 会从 IndexedDB 再取一次（缓存命中，不会重复解码） */ }
    startLive();
  }

  /* ---------------------------------------------------------------- 编辑器 */
  const ED = {
    open: false, rec: null, notes: [], audio: null, sel: -1,
    t0: 0, pps: 110, snap: 0.05, undo: [], playing: false, playT: 0,
    w: 0, h: 0, rowH: 0, dpr: 1, drag: null, down: null,
  };
  const edCv = () => $('#ed-cv');

  function edFit() {
    const cv = edCv();
    if (!cv) return;
    const b = cv.parentElement.getBoundingClientRect();
    ED.w = Math.max(200, b.width);
    ED.h = Math.max(120, b.height);
    ED.dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(ED.w * ED.dpr);
    cv.height = Math.round(ED.h * ED.dpr);
    cv.style.width = ED.w + 'px';
    cv.style.height = ED.h + 'px';
    ED.rowH = ED.h / LANES;
  }

  const xOf = (t) => (t - ED.t0) * ED.pps;
  const tOf = (x) => ED.t0 + x / ED.pps;
  const snapT = (t) => (ED.snap > 0 ? Math.round(t / ED.snap) * ED.snap : t);

  function edPushUndo() {
    ED.undo.push(ED.notes.map((n) => ({ t: n.t, lane: n.lane, kind: n.kind, tail: n.tail, s: n.s })));
    if (ED.undo.length > 30) ED.undo.shift();
  }

  function edDraw() {
    const cv = edCv();
    if (!cv) return;
    const c = cv.getContext('2d');
    c.setTransform(ED.dpr, 0, 0, ED.dpr, 0, 0);
    c.clearRect(0, 0, ED.w, ED.h);
    c.fillStyle = '#0d1018';
    c.fillRect(0, 0, ED.w, ED.h);
    // 轨道
    for (let i = 0; i < LANES; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,0.022)' : 'transparent';
      c.fillRect(0, i * ED.rowH, ED.w, ED.rowH);
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, i * ED.rowH);
      c.lineTo(ED.w, i * ED.rowH);
      c.stroke();
      c.fillStyle = 'rgba(190,200,225,0.4)';
      c.font = '600 ' + Math.round(Math.min(11, ED.rowH * 0.3)) + 'px ui-monospace,monospace';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillText(api.KEYS[i], 4, i * ED.rowH + ED.rowH / 2);
    }
    // 时间网格：0.25 秒细线，1 秒粗线 + 刻度
    const step = ED.pps > 200 ? 0.1 : ED.pps > 90 ? 0.25 : 0.5;
    const tEnd = tOf(ED.w);
    c.textAlign = 'center';
    c.textBaseline = 'top';
    for (let t = Math.floor(ED.t0 / step) * step; t <= tEnd; t += step) {
      const x = xOf(t);
      const one = Math.abs(t - Math.round(t)) < 1e-6;
      c.strokeStyle = one ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)';
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ED.h);
      c.stroke();
      if (one) {
        c.fillStyle = 'rgba(190,200,225,0.35)';
        c.font = '10px ui-monospace,monospace';
        c.fillText(Math.round(t) + 's', x, ED.h - 12);
      }
    }
    // 音符
    for (let i = 0; i < ED.notes.length; i++) {
      const n = ED.notes[i];
      const x = xOf(n.t);
      if (x < -40 || x > ED.w + 40) continue;
      const y = n.lane * ED.rowH + ED.rowH / 2;
      const r = ED.rowH * NOTE_R;
      const hue = (n.lane * 40 + 190) % 360;
      if (n.kind === 'hold') {
        const w = Math.max(6, (n.tail - n.t) * ED.pps);
        c.fillStyle = 'hsla(' + hue + ',70%,60%,0.28)';
        c.fillRect(x, y - r * 0.5, w, r);
        c.strokeStyle = 'hsla(' + hue + ',80%,70%,0.8)';
        c.lineWidth = 1.5;
        c.strokeRect(x, y - r * 0.5, w, r);
      }
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fillStyle = 'hsl(' + hue + ',65%,52%)';
      c.fill();
      if (i === ED.sel) {
        c.strokeStyle = '#ffd76a';
        c.lineWidth = 2.5;
        c.stroke();
      }
    }
    // 播放头
    if (ED.playing) {
      const t = ED.playT + Audio.time();
      const x = xOf(t);
      c.strokeStyle = '#ff9ecb';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ED.h);
      c.stroke();
    }
  }

  function openEditor(rec) {
    ED.rec = rec;
    ED.notes = unpackNotes(rec.notes);
    ED.sel = -1;
    ED.undo = [];
    ED.t0 = 0;
    ED.playing = false;
    ED.playT = 0;
    $('#ed-name').value = rec.title || '未命名曲目';
    $('#ed-artist').value = rec.artist || '';
    $('#ed-status').textContent = ED.notes.length + ' 个音符 · ' + mmss(rec.dur) + '　点空白处加一个，拖音符改时间/轨道，右键删。';
    ED.open = true;
    show('edit');
    edFit();
    edDraw();
  }

  async function ensureAudio(rec) {
    if (ED.audio && ED.audioKey === rec.audioKey) return ED.audio;
    const row = await idbGet(rec.audioKey).catch(() => null);
    if (!row || !row.data) return null;
    ED.audio = await decode(row.data.slice(0));
    ED.audioKey = rec.audioKey;
    return ED.audio;
  }

  function edHit(x, y) {
    const lane = clamp(Math.floor(y / ED.rowH), 0, LANES - 1);
    const t = tOf(x);
    let best = -1, bd = 1e9;
    for (let i = 0; i < ED.notes.length; i++) {
      const n = ED.notes[i];
      if (n.lane !== lane) continue;
      const d = Math.abs(n.t - t);
      const near = n.kind === 'hold' ? (t >= n.t && t <= n.tail) : false;
      const dd = near ? 0 : d;
      if (dd < bd && (near || d * ED.pps < ED.rowH * 0.5)) { bd = dd; best = i; }
    }
    return best;
  }

  function edPointerDown(e) {
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    const idx = edHit(x, y);
    ED.down = { x, y, t0: ED.t0, idx };
    if (idx >= 0) {
      ED.sel = idx;
      edPushUndo();
      ED.drag = { idx, t: ED.notes[idx].t, tail: ED.notes[idx].tail, lane: ED.notes[idx].lane, x0: x, y0: y };
    } else {
      ED.drag = { pan: true };
    }
    edDraw();
  }
  function edPointerMove(e) {
    if (!ED.drag) return;
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const x = e.clientX - b.left, y = e.clientY - b.top;
    if (ED.drag.pan) {
      ED.t0 = Math.max(0, ED.drag.t0 - (x - ED.down.x) / ED.pps);
      edDraw();
      return;
    }
    const d = ED.drag;
    if (Math.abs(x - ED.down.x) < 3 && Math.abs(y - ED.down.y) < 3) return;
    const n = ED.notes[d.idx];
    if (!n) return;
    const dt = (x - ED.down.x) / ED.pps;
    n.t = Math.max(0, snapT(d.t + dt));
    n.lane = clamp(Math.floor(y / ED.rowH), 0, LANES - 1);
    if (n.kind === 'hold') n.tail = n.t + Math.max(0.25, d.tail - d.t);
    edDraw();
  }
  function edPointerUp(e) {
    if (!ED.drag || !ED.down) { ED.drag = null; ED.down = null; return; }
    const cv = edCv();
    const b = cv.getBoundingClientRect();
    const dx = Math.abs(e.clientX - b.left - ED.down.x);
    const dy = Math.abs(e.clientY - b.top - ED.down.y);
    if (ED.drag.pan) {
      if (dx < 6 && dy < 6) {
        // 轻点空白：在这一点加个音符
        edPushUndo();
        const t = Math.max(0, snapT(tOf(ED.down.x)));
        const lane = clamp(Math.floor(ED.down.y / ED.rowH), 0, LANES - 1);
        ED.notes.push({ t, lane, kind: 'tap', tail: 0, s: 0.6 });
        ED.notes.sort((a, b2) => a.t - b2.t || a.lane - b2.lane);
        ED.sel = ED.notes.findIndex((n) => n.t === t && n.lane === lane);
      }
    }
    ED.drag = null;
    ED.down = null;
    edDraw();
    edCount();
  }

  function edCount() {
    const el = $('#ed-status');
    if (el) el.textContent = ED.notes.length + ' 个音符 · 拖音符改位置，右键删，滚轮缩放。';
  }

  async function edSave() {
    if (!ED.rec) return null;
    const title = ($('#ed-name').value || '').trim().slice(0, 40) || '未命名曲目';
    const artist = ($('#ed-artist').value || '').trim().slice(0, 24);
    const meta = await saveChart({
      id: ED.rec.id, title, artist, dur: ED.rec.dur, audioKey: ED.rec.audioKey,
      notes: packNotes(ED.notes), cloud: ED.rec.cloud,
    });
    ED.rec = Object.assign({}, ED.rec, meta);
    $('#ed-status').textContent = '已保存：' + meta.count + ' 个音符。';
    renderMine();
    if (G.scr === 'songs' || G.scr === 'title') renderSongs();
    return meta;
  }

  async function edPublish() {
    if (!ED.rec) return;
    if (!token()) {
      status('#ed-status', '发布要登录：回首页右上角点登录，再回来发布。', true);
      return;
    }
    status('#ed-status', '正在发布…');
    try {
      const meta = await edSave();
      const j = await call('/llsongs', {
        method: 'POST',
        body: {
          id: ED.rec.cloud || undefined,
          title: meta.title, artist: meta.artist, dur: ED.rec.dur,
          count: meta.count, notes: packNotes(ED.notes),
        },
      });
      ED.rec.cloud = j.id || ED.rec.cloud;
      const list = MINE().slice();
      const i = list.findIndex((m) => m.id === ED.rec.id);
      if (i >= 0) { list[i].cloud = ED.rec.cloud; saveMine(list); }
      status('#ed-status', '发布成功，云端曲库已经有了（id ' + ED.rec.cloud + '）。');
      CLOUD.loaded = false;
      loadCloud(true);
      renderMine();
    } catch (e) {
      const code = e.code || '';
      status('#ed-status', code === 'need_login' ? '登录过期了，回首页重新登录。'
        : code === 'too_large' ? '谱面太大了（超过 900KB），先删掉一些音符。'
        : '发布失败：' + (code || e.message || '未知'), true);
    }
  }

  function edDel() {
    if (ED.sel < 0) return;
    edPushUndo();
    ED.notes.splice(ED.sel, 1);
    ED.sel = -1;
    ED.dirty = true;
    edDraw();
  }
  function edToggleHold() {
    const n = ED.notes[ED.sel];
    if (!n) return;
    edPushUndo();
    if (n.kind === 'hold') { n.kind = 'tap'; n.tail = 0; }
    else {
      n.kind = 'hold';
      const next = ED.notes.filter((x) => x !== n && x.t > n.t).sort((a, b) => a.t - b.t)[0];
      const maxTail = next ? next.t - 0.06 : n.t + 1.2;
      n.tail = Math.min(maxTail, n.t + 0.8);
      if (n.tail - n.t < 0.2) { n.kind = 'tap'; n.tail = 0; }
    }
    ED.dirty = true;
    edDraw();
  }
  function edUndo() {
    const prev = ED.undo.pop();
    if (!prev) return;
    ED.notes = prev;
    ED.sel = -1;
    edDraw();
  }

  async function edPlayToggle() {
    if (ED.playing) {
      Audio.stop();
      ED.playing = false;
      $('#ed-play').textContent = '▶ 试听';
      edDraw();
      return;
    }
    const buf = await ensureAudio(ED.rec);
    if (!buf) { status('#ed-status', '这段音频没在本机存上，重新导入一次。', true); return; }
    ED.playT = ED.t0;
    Audio.setVol(SAVE.musVol, SAVE.fxVol);
    Audio.playBuffer(buf, ED.playT);
    ED.playing = true;
    $('#ed-play').textContent = '■ 停';
    const tick = () => {
      if (!ED.playing) return;
      const t = ED.playT + Audio.time();
      if (xOf(t) > ED.w * 0.85) ED.t0 = t - ED.w * 0.2 / ED.pps;
      edDraw();
      if (t > ED.rec.dur - 0.05) { edPlayToggle(); return; }
      requestAnimationFrame(tick);
    };
    tick();
  }

  /* ---------------------------------------------------------------- 接线 */
  function openShop() {
    renderMine();
    renderCloud();
    show('shop');
    loadCloud(false);
  }

  function bind() {
    const f = $('#shop-file');
    if (f) f.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (pending && pending.mode === 'audio') bindCloudAudio(pending.cloudId, file);
      else importNew(file);
    });

    $$('#shop-diff button').forEach((b) => {
      b.classList.toggle('on', b.dataset.v === shopDiff);
      b.onclick = () => {
        shopDiff = b.dataset.v;
        $$('#shop-diff button').forEach((x) => x.classList.toggle('on', x === b));
      };
    });
    const imp = $('#shop-import');
    if (imp) imp.onclick = () => {
      pending = { mode: 'new' };
      const f2 = $('#shop-file');
      f2.accept = 'audio/*';
      f2.click();
    };
    const rf = $('#shop-refresh');
    if (rf) rf.onclick = () => loadCloud(true);
    const back = $('#shop-back');
    if (back) back.onclick = () => { show('title'); renderSongs(); };

    const mineBox = $('#shop-mine');
    if (mineBox) mineBox.onclick = async (e) => {
      const btn = e.target.closest('button[data-act]');
      const row = e.target.closest('[data-id]');
      if (!btn || !row) return;
      const id = row.dataset.id;
      const act = btn.dataset.act;
      if (act === 'play') return playMine(id);
      if (act === 'edit') {
        const m = MINE().find((x) => x.id === id);
        const rec = await idbCGet(id).catch(() => null);
        if (!m || !rec) { status('#shop-status', '谱面数据丢了，删掉重做一份吧。', true); return; }
        openEditor(Object.assign({}, rec, m, { id }));
        ensureAudio({ audioKey: rec.audioKey }).catch(() => {});
        return;
      }
      if (act === 'pub') {
        const rec = await idbCGet(id).catch(() => null);
        const m = MINE().find((x) => x.id === id);
        if (!rec || !m) return;
        openEditor(Object.assign({}, rec, m, { id }));
        return;
      }
      if (act === 'del') {
        if (!confirm('删掉这份谱面？音频也会一起清掉。')) return;
        const m = MINE().find((x) => x.id === id);
        await idbCDel(id).catch(() => {});
        if (m && m.cloud) { /* 云端的留着，本机删掉 */ }
        saveMine(MINE().filter((x) => x.id !== id));
        renderMine();
        renderSongs();
        status('#shop-status', '删掉了。');
      }
    };

    const cloudBox = $('#shop-cloud');
    if (cloudBox) cloudBox.onclick = (e) => {
      const btn = e.target.closest('button[data-act]');
      const row = e.target.closest('[data-cid]');
      if (!btn || !row) return;
      const cid = row.dataset.cid;
      if (SAVE.cloudAudio[cid]) return playCloud(cid);
      pending = { mode: 'audio', cloudId: cid };
      status('#shop-status', '这份谱面对应 ' + mmss((CLOUD.items.find((x) => x.id === cid) || {}).dur || 0)
        + ' 的音频：选你手里同一个版本的文件，就能跟着打。');
      const f3 = $('#shop-file');
      f3.accept = 'audio/*';
      f3.click();
    };

    // 编辑器
    const cv = edCv();
    if (cv) {
      cv.addEventListener('pointerdown', edPointerDown);
      cv.addEventListener('pointermove', edPointerMove);
      cv.addEventListener('pointerup', edPointerUp);
      cv.addEventListener('pointercancel', () => { ED.drag = null; ED.down = null; });
      cv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const b = cv.getBoundingClientRect();
        const i = edHit(e.clientX - b.left, e.clientY - b.top);
        if (i >= 0) { ED.sel = i; edDel(); }
      });
      cv.addEventListener('wheel', (e) => {
        e.preventDefault();
        const b = cv.getBoundingClientRect();
        const x = e.clientX - b.left;
        const t = tOf(x);
        ED.pps = clamp(ED.pps * (e.deltaY < 0 ? 1.15 : 0.87), 30, 400);
        ED.t0 = Math.max(0, t - x / ED.pps);
        edDraw();
      }, { passive: false });
      window.addEventListener('resize', () => { if (ED.open) { edFit(); edDraw(); } });
    }
    const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
    on('#ed-back', () => { if (ED.playing) edPlayToggle(); ED.open = false; openShop(); });
    on('#ed-save', () => edSave());
    on('#ed-del', () => edDel());
    on('#ed-hold', () => edToggleHold());
    on('#ed-undo', () => edUndo());
    on('#ed-play', () => edPlayToggle());
    on('#ed-zoomin', () => { ED.pps = clamp(ED.pps * 1.25, 30, 400); edDraw(); });
    on('#ed-zoomout', () => { ED.pps = clamp(ED.pps / 1.25, 30, 400); edDraw(); });
    on('#ed-snap', () => {
      ED.snap = ED.snap ? 0 : 0.05;
      $('#ed-snap').classList.toggle('on', !!ED.snap);
      $('#ed-status').textContent = ED.snap ? '吸附 0.05 秒' : '自由摆（不吸附）';
    });
    on('#ed-test', async () => {
      await edSave();
      G.song = songOf(ED.rec);
      G.diffK = 'normal';
      ED.playing = false;
      Audio.stop();
      startLive();
    });
    on('#ed-publish', () => edPublish());
  }

  bind();

  return { songs, openShop, openEditor, renderMine, loadCloud, token, ed: ED, cloud: CLOUD };
}
return { initShop };
})();

// ---- js/gamecloud.js
const m_gamecloud = await (async () => {

// 小游戏云存档（除挂机前夜以外的各游戏共用的一份通用实现）。
//
// 个人中心的「云端档案」只同步积分 / 解锁 / 最高分和各游戏的进度摘要。这里把每个游戏自己的真实存档
// （localStorage 里属于它的那几个键）整包存到后端的 /save/<游戏>，登录同一个账号换设备就能接着玩。
// 挂机前夜的存档是一个大对象、有自己的合并逻辑，走 idle/src/core/cloud.js，不在这里。
//
// 规则（和挂机前夜一致，乐观锁 + 不悄悄覆盖）：
//   · 本机记着「上次和云端对齐时的云端 ver 和本机内容的哈希」。
//   · 云端没变、本机改了 → 推；云端变了、本机没改 → 拉；两边都改了 / 新设备两边都有内容 → 弹窗选。
//   · 拉下来之后游戏已经把旧数据读进内存了，所以写完 localStorage 就刷新一次页面（带防循环保护）。
// 没登录就什么都不做。
const EDGE_API = 'https://morimens.qingdengbuyi.top/api';

// 每个游戏同步哪些键：prefix 是前缀（含完全相等），skip 是不同步的（音量 / 倍速 / 模式这类设备偏好）
const GAMES = {
  deathreport: {
    zh: '弥萨格大逃杀', prefix: ['morimens-deathreport-save', 'morimens-deathreport-meta'], skip: /pref|ws-|workshop|-ed$/,
    // 没有任何一份进度存档（只有启动时写的 meta 默认值）就当空
    trivial: (keys) => !Object.keys(keys).some((k) => k.includes('-save')),
  },
  // trivial(keys)：只有游戏自己启动时写进去的默认值、还没有任何进度——这种本机内容当「空」处理，
  // 新设备上不会因为它跟云端冲突，也不会把一份默认存档推上去
  binding: {
    zh: '校猫的结合', prefix: ['zjtt:binding'], skip: /:(mute|snd)/,
    trivial: (keys) => {
      try {
        const m = JSON.parse(keys['zjtt:binding'] || 'null');
        if (!m) return true;
        const st = m.stats || {};
        // 只看真正的进度（跑过局 / 解锁过东西）；看过开场剧情、读过设定这类不算
        return !(st.runs || st.kills || st.deaths || st.bestFloor || st.bestScore || st.rooms) && (m.unlock || []).length <= 3;
      } catch { return false; }
    },
  },
  survivors: { zh: '唤醒体幸存者', prefix: ['zjtt:survivors'], skip: /:(mute|snd)/ },
  protocol: { zh: '忘却协议', prefix: ['zjtt:pf'], skip: /:(mute|speed|snd)/ },
  wolf: { zh: '弥萨格狼人杀', prefix: ['zjtt:wolf'], skip: /:(mode|mute|snd)/ },
  merge: { zh: '合成大杜勒', prefix: ['zjtt:merge'], skip: /:(played|snd|mute)/ },
  bird: { zh: '是鸟弟就下100层', prefix: ['zjtt:bird'], skip: /:(snd|mute|diff|ctl)/ },
  // 唤醒王：决斗链接：收藏、战绩、开包记录（卡组选择和难度是偏好，跟着走也无妨）
  duel: { zh: '唤醒王：决斗链接', prefix: ['zjtt:duel'], skip: /^$/ },
  // 弥萨格王权：进行中的任期、结局图鉴、人物册（音效是这台设备的偏好）
  reign: { zh: '弥萨格王权', prefix: ['zjtt:reign'], skip: /:sound/ },
  // 杀死守密人：结局图鉴 + 形态记录 + 中途那一夜（刷新能接着玩）
  keeper: { zh: '杀死守密人', prefix: ['zjtt:keeper'], skip: /^$/ },
  // 2048：局面（save）和最高分都值得跟着账号走，难度 / 侵蚀 / 音效是这台设备的偏好
  // （皮肤不同步：换设备一进来就得多拉四百来 KB 的换皮池，不值）
  g2048: {
    zh: '忘却 2048', prefix: ['zjtt:g2048'], skip: /:(snd|diff|rot|played|skin)/,
    trivial: (keys) => !keys['zjtt:g2048:save'] && !keys['zjtt:g2048:best'],
  },
  // lovelive！mori⭐mens！：各谱最高分 / 最长连击 / 编队跟着账号走，静音是设备偏好
  lovelive: { zh: 'lovelive！mori⭐mens！', prefix: ['zjtt:lovelive'], skip: /:(mute|snd)/ },
};

const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const readJson = (k, d) => { const v = lsGet(k); if (v == null) return d; try { return JSON.parse(v); } catch { return d; } };

function account() {
  const token = readJson('zjtt:authToken', '') || lsGet('zjtt:authToken') || '';
  const u = readJson('zjtt:authUser', null);
  if (!token || !u) return null;
  const raw = u.name || u.display_name || u.nick || u.username || u.email || '';
  const name = String(raw).replace(/@zjtt\.local$/i, '').trim();
  return name ? { name, token: String(token) } : null;
}

// ---------- 本机内容 ----------
function isTrivial(game, keys) {
  const n = Object.keys(keys).length;
  if (!n) return true;
  const f = GAMES[game].trivial;
  return !!f && f(keys);
}
function collect(game) {
  const cfg = GAMES[game], out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !cfg.prefix.some((p) => k === p || k.startsWith(p + ':') || k.startsWith(p + '-') || k.startsWith(p))) continue;
    if (cfg.skip && cfg.skip.test(k)) continue;
    out[k] = localStorage.getItem(k);
  }
  return out;
}
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const hashOf = (keys) => fnv(Object.keys(keys).sort().map((k) => k + '=' + keys[k]).join('\n'));

const recKey = (g) => 'zjtt:gc:' + g;     // 本机同步记录 { acct, ver, hash, at }
const record = (g) => readJson(recKey(g), null);
const setRecord = (g, r) => lsSet(recKey(g), JSON.stringify(r));

/** 决策（纯函数，可测）：local = { empty, hash }，cloud = 云端摘要或 null，rec = 本机记录，acct = 账号名 */
function plan({ local, cloud, rec, acct }) {
  const dirty = !!rec && local.hash !== rec.hash;
  if (!cloud) return local.empty ? 'none' : 'push';
  const mine = !!rec && rec.acct === acct;
  if (mine && rec.ver === cloud.ver) return dirty ? 'push' : 'none';
  if (cloud.meta && cloud.meta.hash && cloud.meta.hash === local.hash) return 'sync';       // 内容一样，只记一笔
  if (mine && rec.ver < cloud.ver) return dirty ? 'conflict' : 'pull';
  if (local.empty) return 'pull';
  return 'conflict';
}

// ---------- 网络 ----------
let liveBase = '';
function candidates() {
  const out = [];
  const custom = String(readJson('zjtt:apiBase', '') || '').trim().replace(/\/+$/, '');
  if (custom) out.push(custom);
  if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname)) out.push(location.origin + '/api');
  if (!out.includes(EDGE_API)) out.push(EDGE_API);
  return out;
}
async function probe() {
  if (liveBase) return liveBase;
  for (const base of candidates()) {
    try {
      const r = await fetch(base + '/health', { headers: { Accept: 'application/json' } });
      const j = await r.json().catch(() => null);
      if (j && j.service === 'zjtt') { liveBase = base; return base; }
    } catch { /* 下一个 */ }
  }
  return '';
}
async function call(method, path, body, keepalive = false) {
  const a = account(); if (!a) throw new Error('not_logged_in');
  const base = await probe(); if (!base) throw new Error('offline');
  const r = await fetch(base + path, {
    method, keepalive, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + a.token, Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok && j.ok !== false, json: j };
}
async function fetchCloud(game, withData) {
  const r = await call('GET', `/save/${game}${withData ? '' : '?meta=1'}`);
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  return r.json.save || null;
}
async function pushCloud(game, ver, keys, keepalive) {
  const a = account();
  const r = await call('PUT', `/save/${game}`, { data: JSON.stringify({ v: 1, keys }), ver, rev: Date.now(), meta: { hash: hashOf(keys), n: Object.keys(keys).length } }, keepalive);
  if (r.status === 409) return { conflict: true };
  if (!r.ok) throw new Error(r.json.error || 'HTTP ' + r.status);
  setRecord(game, { acct: a.name, ver: r.json.ver, hash: hashOf(keys), at: Date.now() });
  return { ver: r.json.ver };
}
function applyCloud(game, save) {
  const doc = JSON.parse(save.data);
  const keys = (doc && doc.keys) || {};
  for (const [k, v] of Object.entries(keys)) lsSet(k, String(v));
  setRecord(game, { acct: account().name, ver: save.ver, hash: hashOf(collect(game)), at: Date.now() });
  return Object.keys(keys).length;
}

// ---------- 一次同步 ----------
const status = {};            // game -> { s: 'ok'|'error'|'conflict'|'nologin'|'syncing', at, err }
const statusOf = (g) => status[g] || { s: 'idle', at: 0 };
const busy = new Set();
const RELOAD_KEY = 'zjtt:gc:reload';

// pullOk：只有刚进游戏那一次允许把云端覆盖到本机（游戏还没把数据读进内存）；游戏玩到一半只推不拉，免得把正在玩的进度刷没
async function syncGame(game, { interactive = true, reload = true, keepalive = false, pullOk = true } = {}) {
  const a = account();
  if (!a) { status[game] = { s: 'nologin', at: 0 }; return 'nologin'; }
  if (busy.has(game)) return 'busy';
  busy.add(game); status[game] = { s: 'syncing', at: 0 };
  try {
    const keys = collect(game), local = { empty: isTrivial(game, keys), hash: hashOf(keys) };
    const cloud = await fetchCloud(game, false);
    const act = plan({ local, cloud, rec: record(game), acct: a.name });
    let res = act;
    if (act === 'push') {
      const r = await pushCloud(game, cloud ? cloud.ver : 0, keys, keepalive);
      if (r.conflict) { res = 'conflict'; }
    } else if (act === 'pull' && !pullOk) {
      res = 'skipped';
    } else if (act === 'pull') {
      const n = applyCloud(game, await fetchCloud(game, true));
      res = 'pulled';
      if (reload) reloadOnce(game, n);
    } else if (act === 'sync') {
      setRecord(game, { acct: a.name, ver: cloud.ver, hash: local.hash, at: Date.now() });
    } else if (act === 'none' && cloud) {
      setRecord(game, { acct: a.name, ver: cloud.ver, hash: local.hash, at: Date.now() });
    }
    if (res === 'conflict') {
      status[game] = { s: 'conflict', at: 0 };
      if (interactive) conflictDialog(game, cloud, local, reload);
    } else status[game] = { s: 'ok', at: Date.now() };
    return res;
  } catch (e) {
    status[game] = { s: e.message === 'not_logged_in' ? 'nologin' : 'error', at: 0, err: e.message };
    return 'error';
  } finally { busy.delete(game); }
}

function reloadOnce(game, n) {
  // 防循环：10 秒内刚因同步刷新过就不再刷
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - last < 10000) return;
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
  location.reload();
}

// ---------- 冲突弹窗（自带样式，不依赖各游戏的 CSS） ----------
function conflictDialog(game, cloud, local, reload) {
  if (document.getElementById('gcDlg')) return;
  const cfg = GAMES[game];
  const wrap = document.createElement('div');
  wrap.id = 'gcDlg';
  wrap.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(5,8,14,.72);padding:16px;font:14px/1.6 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif';
  const t = (ms) => (ms ? new Date(ms).toLocaleString() : '—');
  wrap.innerHTML = `<div style="max-width:360px;width:100%;background:#151b27;color:#e6ebf5;border:1px solid #3a4560;border-radius:14px;padding:16px 16px 12px;box-shadow:0 20px 60px #000b">
    <b style="font-size:16px">「${cfg.zh}」本机和云端的存档不一样</b>
    <p style="margin:8px 0;color:#a9b4c8;font-size:13px">这个账号在云端有一份存档，和这台设备上的不同。选一份留下，<b style="color:#f0d28a">另一份会被覆盖</b>。</p>
    <p style="margin:4px 0;font-size:13px">本机：${Object.keys(collect(game)).length} 项存档数据</p>
    <p style="margin:4px 0 12px;font-size:13px">云端：${cloud && cloud.meta ? cloud.meta.n || '?' : '?'} 项 · 最后保存 ${t(cloud && cloud.at)}</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button data-k="cloud" style="flex:1;padding:9px;border-radius:9px;border:1px solid #c9a13a;background:#7a5d17;color:#fff8e6;font-weight:600">用云端的</button>
      <button data-k="local" style="flex:1;padding:9px;border-radius:9px;border:1px solid #3a4560;background:#1d2635;color:#e6ebf5">用本机的</button>
    </div>
    <div style="text-align:center;margin-top:8px"><button data-k="later" style="background:none;border:0;color:#8794ab;font-size:12.5px;padding:6px">先不处理</button></div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', async (e) => {
    const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    wrap.remove();
    if (k === 'later') return;
    try {
      if (k === 'cloud') { const n = applyCloud(game, await fetchCloud(game, true)); status[game] = { s: 'ok', at: Date.now() }; if (reload) reloadOnce(game, n); }
      else { const keys = collect(game); const r = await pushCloud(game, cloud ? cloud.ver : 0, keys); status[game] = r.conflict ? { s: 'error', at: 0, err: 'conflict' } : { s: 'ok', at: Date.now() }; }
    } catch (err) { status[game] = { s: 'error', at: 0, err: err.message }; }
  });
}

// ---------- 游戏页入口：登录了就在进入 / 切后台 / 改动后同步 ----------
function startGameCloud(game) {
  if (!GAMES[game]) return;
  setTimeout(() => syncGame(game, { interactive: true, reload: true, pullOk: true }), 1500);
  let timer = 0;
  const lastHash = { v: hashOf(collect(game)) };
  // 每 45 秒看一眼本机内容有没有变，变了就推（不弹窗、不刷新：冲突留到下次进游戏处理）
  timer = setInterval(() => {
    if (document.hidden || !account()) return;
    const h = hashOf(collect(game));
    if (h === lastHash.v) return;
    lastHash.v = h;
    syncGame(game, { interactive: false, reload: false, pullOk: false });
  }, 45000);
  const flush = () => { if (account()) syncGame(game, { interactive: false, reload: false, keepalive: true, pullOk: false }); };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
  return () => clearInterval(timer);
}
return { GAMES, account, isTrivial, collect, hashOf, record, plan, statusOf, syncGame, startGameCloud };
})();

// ---- js/lovelive.js
const m_lovelive = await (async () => {
const { SONGS, arrange } = m_songs;
const { Audio } = m_audio;
const { DIFFS, diffOf } = m_diffs;
const { detectOnsets, chartFromOnsets, chartFromArr, hashStr, packOnsets, unpackOnsets } = m_analyze;
const { UNITS, PACKS } = m_gen;
const { fetchPack, hasPack, why: packWhy, how: packHow } = m_musicbox;
const { initShop } = m_shop;
const { startGameCloud } = m_gamecloud;
// lovelive！mori⭐mens！ —— 点按式音游（学园偶像祭的玩法壳 + 《忘却前夜》的唤醒体）。
//
// 结构：
//   js/ll/songs.js    曲目库与芯片改编编曲（级数记号 → 事件表）
//   js/ll/analyze.js  原曲抓点（onset detection）+ 谱面生成
//   js/ll/audio.js    声音：原曲 BufferSource / 芯片前瞻调度 / 五档判定音效
//   js/ll/gen.js      构建生成：上场名册 + 头像（data URI 内联）
//   js/lovelive.js    这里：布局、判定、技能、画布渲染、编队、设置、结算
//
// 布局：上方一个发球点，下方九个击打框。音符（唤醒体的脸）从发球点散开，
// 沿直线飞向各自那一格，压到框里的那一刻点它（长条要按住直到尾音进框）。
// 九个人一队，第 i 格永远交给队伍里的第 i 位，技能全自动发动。
//
// 音源：默认芯片改编（页面内合成，不带版权音源）；也可以导入自己手里的
// 原曲 mp3 —— 解码后按鼓点自动生成谱面，存在本机（IndexedDB）。
//
// 自动化测试：?_test=1 把内部状态挂到 window.__ll；加 &_auto=1 自动 Perfect
// 打完全曲，供无头浏览器核对结算。










/* ================================================================ http → https */
// 从 http 打开时浏览器会把 crypto.subtle 整个摘掉（非安全上下文），原曲包就解不开，
// 耳朵里只剩芯片合成。自定义域上是有证书的，能上去就直接上去；
// 上不去（证书没配好、内网）就留在原地——纯 JS 解密那条路能兜住，不影响玩。
// 想留在 http 调试的话，地址后面加 &_http=1。
(function upgradeToHttps() {
  if (location.protocol !== 'http:') return;
  const host = location.hostname;
  if (/^(localhost|127\.|\[::1\]|0\.0\.0\.0)$/.test(host) || /\.local$/i.test(host)) return;
  if (/[?&]_http=1/.test(location.search)) return;
  const to = 'https://' + location.host + location.pathname + location.search + location.hash;
  // no-cors 的 HEAD 只用来问一句「https 通不通」：证书不对会直接 reject，正好当探针
  fetch('https://' + location.host + '/favicon.svg', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
    .then(() => { if (location.protocol === 'http:') location.replace(to); })
    .catch(() => { /* https 上不去：留在 http，靠纯 JS 解密出原曲 */ });
})();

/* ================================================================ 小工具 */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const fmt = (n) => {
  n = Math.round(Number(n) || 0);
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
const mmss = (s) => Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2);
const TEST = /[?&]_test=1/.test(location.search);
const AUTO = TEST && /[?&]_auto=1/.test(location.search);
const FINE = window.matchMedia ? window.matchMedia('(pointer:fine)').matches : false;
// 画面特效的时间轴（秒）：和 rAF 的时间戳同源，暂停时也照常走
const wall = () => performance.now() / 1000;
// 页脚那行红字提示：写一句、抖一下、两秒半后自己消失
function flash(sel, msg) {
  const el = $(sel);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(el._ft);
  el._ft = setTimeout(() => { el.textContent = ''; }, 2600);
}

/* ================================================================ 键位 */
// 九格各绑一个键，存在 SAVE.keymap 里（存的是键位 id，不是字符）：
//   'a'…'z' / '0'…'9' / 'space' / 'left' 这类方向键 / ';' ',' '.' 这些标点
// 默认 ASDF + 空格 + HJKL：正中那颗是全曲打得最多的一格，给空格最省事——
// 两只手的大拇指都落得上去，也不用为了找 G 把手挪一下。
// 认键用 e.code（物理位置）而不是 e.key：换了键盘布局、开着中文输入法，
// 按下去的字符会变，物理位置不会。
const DEFAULT_KEYS = ['a', 's', 'd', 'f', 'space', 'h', 'j', 'k', 'l'];
const KEY_NAMES = { space: '空格', left: '←', right: '→', up: '↑', down: '↓' };
const CODE_MAP = {
  Space: 'space', ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\',
  BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`',
};
// 修饰键和 Tab/回车不参与：按住 Shift 打不出来，回车会把焦点送去按按钮
const BAD_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Enter',
  'Backspace', 'Escape', 'ContextMenu']);

function keyIdOf(e) {
  if (!e || BAD_KEYS.has(e.key)) return '';
  const c = e.code || '';
  if (CODE_MAP[c]) return CODE_MAP[c];
  if (/^Key[A-Z]$/.test(c)) return c.slice(3).toLowerCase();
  if (/^Digit\d$/.test(c) || /^Numpad\d$/.test(c)) return c.slice(-1);
  // 老浏览器没有 e.code，退回字符本身（这时布局差异躲不掉，但至少有键能用）
  const k = (e.key || '').toLowerCase();
  if (k === ' ' || k === 'spacebar') return 'space';
  return k.length === 1 ? k : '';
}
const keyLabel = (id) => KEY_NAMES[id] || (id && id.length === 1 ? id.toUpperCase() : (id || '—'));
// 读存档时体检一遍：重复的键会让某一格永远打不到，缺的补默认
function tidyKeymap(list) {
  const out = [];
  for (let i = 0; i < 9; i++) {
    let k = Array.isArray(list) ? list[i] : '';
    if (typeof k !== 'string' || !k) k = DEFAULT_KEYS[i];
    if (out.indexOf(k) >= 0) k = DEFAULT_KEYS.find((d) => out.indexOf(d) < 0) || DEFAULT_KEYS[i];
    out.push(k);
  }
  return out;
}

/* ================================================================ 存档 */
const KEY = 'zjtt:lovelive';
const TEAM_MAX = 9;
function loadSave() {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { v = null; }
  const s = (v && typeof v === 'object') ? v : {};
  s.best = (s.best && typeof s.best === 'object') ? s.best : {};
  s.team = Array.isArray(s.team) ? s.team.filter((id) => UNITS.some((u) => u.id === id)).slice(0, TEAM_MAX) : [];
  s.tracks = (s.tracks && typeof s.tracks === 'object') ? s.tracks : {};
  s.mute = s.mute ? 1 : 0;
  s.plays = Number(s.plays) || 0;
  s.bestCombo = Number(s.bestCombo) || 0;
  // 手感设置：偏移 / 判定宽松 / 流速 / 两路音量 / 按键提示
  s.offset = clamp(Number(s.offset) || 0, -200, 200);
  // 自动校准：按实际击打偏差微调 offset（默认开）。手动拖过偏移滑块就关掉，
  // 否则手调的值会被下一局又拉回去。
  s.autoLat = s.autoLat == null ? 1 : (s.autoLat ? 1 : 0);
  s.winMul = clamp(Number(s.winMul) || 1, 0.6, 2);
  s.flow = clamp(Number(s.flow) || 1, 0.6, 1.8);
  s.musVol = s.musVol == null ? 0.6 : clamp(Number(s.musVol), 0, 1);
  s.fxVol = s.fxVol == null ? 0.78 : clamp(Number(s.fxVol), 0, 1);
  // 默认比例改过一次（判定音加了低频层、整体更实，音乐这边让一点位置）：
  // 老存档还停在旧默认值（音乐 0.7 / 音效 0.6）的，跟着换一次；
  // 自己拧过滑块的数值不是旧默认值，不会被动。
  if (!s.volRev) {
    s.volRev = 1;
    if (Math.abs(s.musVol - 0.7) < 1e-6) s.musVol = 0.6;
    if (Math.abs(s.fxVol - 0.6) < 1e-6) s.fxVol = 0.78;
  }
  s.keys = s.keys == null ? 1 : (s.keys ? 1 : 0);
  // 九格键位（电脑端用）。老存档没有这一项，直接吃新的默认值（中间是空格）
  s.keymap = tidyKeymap(s.keymap);
  // 震动反馈（Android 的 navigator.vibrate；iOS 没有这个接口，开了也无事发生）：触屏设备默认开
  s.haptic = s.haptic == null ? (matchMedia('(pointer:coarse)').matches ? 1 : 0) : (s.haptic ? 1 : 0);
  s.listen = s.listen ? 1 : 0;
  // 沉浸：进局内时请求全屏，把手机浏览器的地址栏收上去。默认开，设置里能关。
  s.immersive = s.immersive == null ? 1 : (s.immersive ? 1 : 0);
  // 工坊：本机谱面的索引（正文在 IndexedDB，这里只留列表要用的字段）
  s.mine = Array.isArray(s.mine) ? s.mine.filter((m) => m && m.id).slice(0, 60) : [];
  // 云端谱面里「我已经把音频对上了」的那些：{ <cloudId>: { name, dur } }
  s.cloudAudio = (s.cloudAudio && typeof s.cloudAudio === 'object') ? s.cloudAudio : {};
  return s;
}
const SAVE = loadSave();
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(SAVE)); } catch (e) { /* 无痕模式随它去 */ }
}
const bestKey = (songId, diff) => songId + ':' + diff;

/* ================================================================ IndexedDB：本机音源 */
// 只存本机（不上传、不跨设备）：原曲是自己导入的，不存在库里分发给别人。
const DB_NAME = 'll-tracks';
// 两个表：t = 音频（导入的原曲），c = 谱面（工坊里做出来的）
function idbOpen() {
  return new Promise((res, rej) => {
    let r;
    try { r = indexedDB.open(DB_NAME, 2); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const name of ['t', 'c']) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error || new Error('打不开本机音源库'));
  });
}
function idbDo(store, mode, fn) {
  return idbOpen().then((db) => new Promise((res, rej) => {
    const tx = db.transaction(store, mode);
    const st = tx.objectStore(store);
    let out;
    try { out = fn(st); } catch (e) { rej(e); return; }
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  }));
}
const idbGet = (k) => idbDo('t', 'readonly', (st) => st.get(k));
const idbSet = (k, v) => idbDo('t', 'readwrite', (st) => st.put(v, k));
const idbDel = (k) => idbDo('t', 'readwrite', (st) => st.delete(k));
const idbCGet = (k) => idbDo('c', 'readonly', (st) => st.get(k));
const idbCSet = (k, v) => idbDo('c', 'readwrite', (st) => st.put(v, k));
const idbCDel = (k) => idbDo('c', 'readwrite', (st) => st.delete(k));

/* ================================================================ 难度 */
// 难度表在 js/ll/diffs.js（体检脚本也读同一份，免得两边漂）
// 键位常量（DEFAULT_KEYS / keyIdOf / keyLabel）在上面存档那一节，
// 因为 loadSave 要先给 SAVE.keymap 做体检。
const KEYS = DEFAULT_KEYS.slice();        // 每格当前绑的键（id）
const KEY_LABEL = KEYS.map(keyLabel);     // 画在框下面的那个字
let REMAP = -1;                           // 设置里正在等键的那一格（-1 = 没在等）

// 把一份键位表套上去（九个 id）。save=true 时写回存档。
function applyKeymap(next, save) {
  for (let i = 0; i < 9; i++) {
    KEYS[i] = next && next[i] ? next[i] : DEFAULT_KEYS[i];
    KEY_LABEL[i] = keyLabel(KEYS[i]);
  }
  for (let i = 0; i < LAY.boxes.length; i++) LAY.boxes[i].key = KEY_LABEL[i];
  if (save) { SAVE.keymap = KEYS.slice(); persist(); }
  try { buildStatic(); } catch (e) { /* 还没排版，等 fit 完了自然会画 */ }
  paintKeymap();
  // 选人界面那九个小胶囊上的字母也跟着换
  $$('#team-pick .pick em').forEach((el, i) => { el.textContent = KEY_LABEL[i]; });
}

/* ================================================================ DOM 骨架 */
const scr = {
  title: $('#scr-title'), songs: $('#scr-songs'), team: $('#scr-team'),
  set: $('#scr-set'), shop: $('#scr-shop'), edit: $('#scr-edit'),
  live: $('#scr-live'), result: $('#scr-result'),
};
function show(name) {
  for (const k of Object.keys(scr)) scr[k].hidden = k !== name;
  G.scr = name;
  // 打歌时把全站的横竖屏开关收起来（它固定在左下角，会压住最左边两格），
  // 顺便通知它重算一次：它会在竖屏时压一张「把手机横过来」的遮罩，
  // 一进局内就得收起来，不然整局都被盖着。show 里 dispatch，组件监听 resize。
  document.body.classList.toggle('live', name === 'live');
  // 离开设置页就把「等你按键」取消：不然点了某一格直接按返回，全站的键盘
  // 都会被 captureRemap 吃掉，表现得像键盘坏了
  if (name !== 'set') REMAP = -1;
  // 回到菜单就不必占着全屏了；打歌与结算留着，省得来回切地址栏
  if (name !== 'live' && name !== 'result') exitImmersive();
  window.dispatchEvent(new Event('resize'));
}

/* ================================================================ 沉浸：把地址栏收上去 */
// 手机浏览器的地址栏常年占着 50~60px。九格本来就只分到两百多像素高，被它一压，
// 弧顶那两格直接顶到分数条上，看着像「判定错位」其实是版面被挤掉了。
// 全屏是最干净的收法：请求必须在用户手势里发起，所以挂在「上场」那一下的
// 点击链上（startLive 的第一个 await 之前同步调用）。
// 有的环境不给全屏（iOS Safari、某些内嵌 WebView），那就当没这回事。
function vhFix() {
  const vv = window.visualViewport;
  const h = Math.round((vv && vv.height) || window.innerHeight || 0);
  if (h > 120) document.documentElement.style.setProperty('--app-h', h + 'px');
}
function enterImmersive() {
  if (!SAVE.immersive) return;
  const el = document.documentElement;
  if (document.fullscreenElement || !el.requestFullscreen) return;
  try {
    const p = el.requestFullscreen({ navigationUI: 'hide' });
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* 不支持就当没这回事 */ }
}
function exitImmersive() {
  if (document.fullscreenElement && document.exitFullscreen) {
    try { document.exitFullscreen().catch(() => {}); } catch (e) { /* 已经退了 */ }
  }
}
document.addEventListener('fullscreenchange', () => {
  // 用系统手势 / 返回键退出全屏 = 不想打了：顺手暂停，别让音乐在看不见的地方空跑
  if (!document.fullscreenElement && G.running && !G.paused) togglePause();
  vhFix();
  setTimeout(fit, 60);
});
window.addEventListener('resize', vhFix);
window.addEventListener('orientationchange', () => setTimeout(vhFix, 260));
if (window.visualViewport) window.visualViewport.addEventListener('resize', vhFix);
vhFix();

/* ================================================================ 全局状态 */
const G = {
  scr: 'title', song: null, diffK: 'normal', chart: null, chartSrc: 'chip',
  notes: [], ni: 0, di: 0, combo: 0, maxCombo: 0, score: 0,
  cnt: { p: 0, g: 0, go: 0, b: 0, m: 0 },
  accW: 0, stamina: 100, buffs: [], sk: [], banner: null, fx: [], flashes: [],
  holds: {}, active: new Set(), holdingLanes: [], running: false, over: false, paused: false, auto: AUTO,
  // 听歌模式：自动把每个音按最低档（BAD）打掉、体力锁满，单纯把整首听完
  listen: false, srcName: '', srcWhy: '', srcLite: false, srcPack: false,
  tickAt: 0, prep: false, stall: 0, lastT: 0,
  // 击打延迟采样：最近 24 次命中的 dt（毫秒，正 = 按早、负 = 按晚）
  lat: { buf: [], n: 0, avg: 0, last: 0 },
};

const team = () => (SAVE.team.length ? SAVE.team : UNITS.slice(0, TEAM_MAX).map((u) => u.id));
const unitById = (id) => UNITS.find((u) => u.id === id) || UNITS[0];
const laneUnit = (i) => {
  const t = team();
  return unitById(t[i % t.length]);
};
// gen.js 里的 art 是 data URI 字符串：给 DOM 用；画布要的是 Image 对象
for (const u of UNITS) {
  const im = new Image();
  im.decoding = 'async';
  im.src = u.art;
  u.img = im;
}
const FACE_OK = (u) => u.img && u.img.complete && u.img.naturalWidth > 0;

/* 曲目时间：音频时钟 - 偏移。判定、播放、绘制都用这一个 */
// lag：这次输入事件已经在队列里等了多久（performance.now() - e.timeStamp）。手机上事件常比处理晚一两帧，
// 不扣掉就等于每次都「点晚了」；封顶 80ms，防止后台切回来时的陈旧事件把时间拨乱。
const chartTime = (lag) => Math.max(0, Audio.time() - SAVE.offset / 1000 - (lag > 0 ? Math.min(0.08, lag) : 0));
const evLag = (e) => (e && e.timeStamp > 0 ? (performance.now() - e.timeStamp) / 1000 : 0);

/* ================================================================ 技能立绘 */
// 技能发动时，舞台右侧摆上这位唤醒体的立绘：assets/card/<slug>.webp，
// 官方素材库里的竖版卡面（240×600）。原尺寸摆出来就清楚，不用再把 96px
// 的头像放大糊一屏。个别人没有卡面（构建时给了 CG 或留空），空的话退回头像小卡。
const ART = { on: false, timer: 0 };
const ART_PRE = new Set();
function preloadArt(list) {
  for (const id of list) {
    const u = unitById(id);
    if (!u || !u.card || ART_PRE.has(u.id)) continue;
    ART_PRE.add(u.id);
    const im = new Image();
    im.decoding = 'async';
    im.src = u.card;                 // 只把浏览器缓存喂热，不参与绘制
  }
}
function showArt(u, txt) {
  const box = $('#art-box');
  const fig = $('#art-fig');
  if (!box || !fig) return;
  const hasCard = !!u.card;
  box.style.setProperty('--h', u.hue);
  fig.classList.toggle('small', !hasCard);
  fig.classList.toggle('wide', !!u.wide);
  const src = hasCard ? u.card : u.art;
  if (fig.getAttribute('src') !== src) fig.src = src;
  $('#art-name').textContent = u.n;
  $('#art-skill').textContent = txt || ('「' + u.skill.n + '」');
  box.classList.remove('on');
  void box.offsetWidth;              // 重启动画：连着触发两次也要重新滑进来
  box.classList.add('on');
  ART.on = true;
  clearTimeout(ART.timer);
  ART.timer = setTimeout(() => {
    box.classList.remove('on');
    ART.on = false;
  }, 2600);
}

/* ================================================================ 技能 */
function initSkills() {
  G.sk = team().map((id) => {
    const u = unitById(id);
    return { u, last: -1e9, cnt: 0, lastCombo: -1, fires: 0 };
  });
  G.buffs = [];
  // start 触发的技能开场就放（只放一次）
  for (const st of G.sk) if (st.u.skill.trig === 'start') fireSkill(st, 0);
}
function buffMul(fx) {
  let m = 1;
  for (const b of G.buffs) if (b.fx === fx) m *= b.val;
  return m;
}
function buffFlag(fx) {
  for (const b of G.buffs) if (b.fx === fx) return true;
  return false;
}
function passSum(fx) {
  let s = 0;
  for (const x of G.sk) if (x.u.pass && x.u.pass[fx]) s += x.u.pass[fx];
  return s;
}
function fireSkill(st, now) {
  const sk = st.u.skill;
  st.fires++;
  if (sk.dur > 0) G.buffs.push({ fx: sk.fx, val: sk.val, until: now + sk.dur, u: st.u });
  else applyInstant(sk, now);
  G.banner = { txt: st.u.n + '「' + sk.n + '」', until: now + 2.2, hue: st.u.hue };
  showArt(st.u, '「' + sk.n + '」');
  Audio.fx('skill');
  paintSkillChips(true);
}
function applyInstant(sk, now) {
  if (sk.fx === 'heal') G.stamina = clamp(G.stamina + sk.val, 0, 100);
  if (sk.fx === 'combo') addCombo(sk.val, true);
}
function tickSkills(now) {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig === 'time') {
      if (now - st.last >= sk.need) { st.last = now; fireSkill(st, now); }
    } else if (sk.trig === 'combo') {
      if (G.combo > 0 && G.combo % sk.need === 0 && st.lastCombo !== G.combo) {
        st.lastCombo = G.combo;
        fireSkill(st, now);
      }
    }
  }
  G.buffs = G.buffs.filter((b) => b.until > now);
}
function onPerfect() {
  for (const st of G.sk) {
    const sk = st.u.skill;
    if (sk.trig !== 'perfect') continue;
    st.cnt++;
    if (st.cnt % sk.need === 0) fireSkill(st, chartTime());
  }
}

/* ================================================================ 判定与计分 */
const JW = { p: 1, g: 0.8, go: 0.5, b: 0.2, m: 0 };
const JN = { p: 'PERFECT', g: 'GREAT', go: 'GOOD', b: 'BAD', m: 'MISS' };
const JC = { p: '#ffd76a', g: '#8fd0ff', go: '#9be29b', b: '#c9a0ff', m: '#e8695f' };

// 判定窗口：难度 × 技能加成 × 玩家自己的「判定宽松」
function winMul() {
  return buffMul('judge') * (1 + passSum('judge')) * SAVE.winMul;
}
function windows() {
  const w = diffOf(G.diffK).win, m = winMul();
  return [w[0] * m, w[1] * m, w[2] * m, w[3] * m];
}
function judgeBy(dt) {
  const W = windows();
  const a = Math.abs(dt);
  if (a <= W[0]) return 'p';
  if (a <= W[1]) return 'g';
  if (a <= W[2]) return 'go';
  if (a <= W[3]) return 'b';
  return null;
}
/* ---------------------------------------------------------------- 延迟 */
// dt 正 = 音符还没进框就按了（手快/输出延迟小），负 = 按晚。
// 拿最近 24 次的中位数当「这台设备的固有偏差」：比均值抗一次手抖。
const LAT_N = 24;
function medianMs(a) {
  const b = a.slice().sort((x, y) => x - y);
  return b[b.length >> 1];
}
function sampleLat(dt) {
  if (G.listen || G.auto) return;                 // 听歌/自动打不算人手的偏差
  const ms = dt * 1000;
  if (Math.abs(ms) > windows()[3] * 1000) return;
  const L = G.lat;
  L.buf.push(ms);
  if (L.buf.length > LAT_N) L.buf.shift();
  L.n = L.buf.length;
  let sum = 0;
  for (const v of L.buf) sum += v;
  L.avg = Math.round(sum / L.n);
  L.last = Math.round(ms);
  autoTune();
}
// 每攒够 16 次、且中位偏差超过 26ms 才动一次；一次最多 8ms，累计夹在 ±150ms。
// 调完就清空样本，所以要再攒 16 次才会动下一次——这本身就是节流，不用再看时间。
// 调的是 offset：dt 偏正说明判定时刻来早了，offset 要减小（chartTime = 音频 - offset）。
function autoTune() {
  if (!SAVE.autoLat) return;
  const L = G.lat;
  if (L.n < 16) return;
  const med = medianMs(L.buf);
  if (Math.abs(med) < 26) return;
  const step = clamp(-med * 0.25, -8, 8);
  const nv = clamp(Math.round(SAVE.offset + step), -150, 150);
  if (nv === SAVE.offset) return;
  SAVE.offset = nv;
  persist();
  const inp = $('#set-offset');
  if (inp) inp.value = String(nv);
  const lab = $('#set-offset-v');
  if (lab) lab.textContent = (nv > 0 ? '+' : '') + nv + ' ms';
  if (G.scr === 'live') G.banner = { txt: '延迟已校准 ' + (nv > 0 ? '+' : '') + nv + 'ms', until: chartTime() + 1.3, hue: 190 };
  L.buf.length = 0; L.n = 0; L.avg = 0;          // 用新偏移重新采样
}

function addCombo(k, silent) {
  G.combo += k;
  if (G.combo > G.maxCombo) G.maxCombo = G.combo;
  if (!silent && G.combo > 0) {
    if (G.combo % 100 === 0) {
      G.stamina = clamp(G.stamina + 6, 0, 100);
      Audio.fx('combo');
    } else if (G.combo % 50 === 0) Audio.fx('combo');
  }
}
function scoreNote(n, j) {
  const comboMul = 1 + Math.min(G.combo, 300) / 100;
  const base = n.kind === 'hold' ? 240 : 300;
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += base * JW[j] * comboMul * sm;
}
function boxOf(lane) { return LAY.boxes[lane] || LAY.boxes[0]; }
function pushFx(lane, j, txt) {
  const b = boxOf(lane);
  const t = wall();
  // 同一轨道 0.14 秒内只留最后一条：以前 GUARD / SAVED / 判定名会叠成一片看不清
  for (let i = G.fx.length - 1; i >= 0; i--) {
    const f = G.fx[i];
    if (f.x === b.x && t - f.t < 0.14) G.fx.splice(i, 1);
  }
  G.fx.push({ x: b.x, y: b.y - b.h * 0.35, j, t, txt: txt == null ? JN[j] : txt });
  if (G.fx.length > 12) G.fx.shift();
  G.flashes[lane] = { t, j };
}
function judgeNote(n, j) {
  n.judged = true;
  n.hit = true;
  G.cnt[j === 'p' ? 'p' : j === 'g' ? 'g' : j === 'go' ? 'go' : 'b']++;
  G.accW += JW[j];
  scoreNote(n, j);
  if (j === 'p') onPerfect();
  if (j === 'b') G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.55, 0, 100);
  addCombo(1);
  // 听歌模式把判定音与飘字一起收掉：目的是听完整首，不是看满地 BAD
  if (!G.listen) { Audio.fx(j, G.combo, n.lane); pushFx(n.lane, j); }
  if (SAVE.haptic && !G.auto && !G.listen && j !== 'b' && navigator.vibrate) {
    // 判定越准，震得越干脆：PERFECT 一记短的实震，GREAT 轻一点，GOOD 几乎只是一下提示
    try { navigator.vibrate(j === 'p' ? 12 : j === 'g' ? 8 : 5); } catch (e) { /* 不支持就算了 */ }
  }}
function missNote(n) {
  if (n.judged) return;
  n.judged = true;
  const now = chartTime();
  // 听歌模式：漏过去的音也按最低档补一笔，不记 Miss。
  // （局内刚开听歌模式时，暂停期间已经越过判定窗的那几个音会走到这里）
  if (G.listen) {
    G.cnt.b++;
    G.accW += JW.b;
    addCombo(1);
    return;
  }
  G.cnt.m++;
  // 技能优先级：自动救（Miss → Good）> 护盾（不断连不掉血）
  if (buffFlag('auto')) {
    G.cnt.m--; G.cnt.go++;
    G.accW += JW.go;
    scoreNote(n, 'go');
    addCombo(1);
    Audio.fx('go', G.combo, n.lane);
    pushFx(n.lane, 'go', 'SAVED');
    G.banner = { txt: 'Miss 被救回来了！', until: now + 1.2, hue: 140 };
    return;
  }
  if (buffFlag('guard')) {
    Audio.fx('go');
    pushFx(n.lane, 'go', 'GUARD');
    G.banner = { txt: '护盾挡住了断连', until: now + 1.0, hue: 210 };
    return;
  }
  G.combo = 0;
  G.stamina = clamp(G.stamina - diffOf(G.diffK).stam, 0, 100);
  for (const st of G.sk) if (st.u.skill.trig === 'miss') fireSkill(st, now);
  Audio.fx('m');
  pushFx(n.lane, 'm');
}
function releaseHold(nt, early) {
  if (!nt.holding) return;
  nt.holding = false;
  G.active.delete(nt);
  if (nt._ptr != null) { delete G.holds[nt._ptr]; nt._ptr = null; }
  const now = chartTime();
  if (early && now < nt.tail - 0.2) {
    nt.broken = true;
    if (!buffFlag('guard')) {
      G.combo = 0;
      G.stamina = clamp(G.stamina - diffOf(G.diffK).stam * 0.7, 0, 100);
      Audio.fx('break');
      pushFx(nt.lane, 'm', '松手了');
    } else {
      Audio.fx('go');
      pushFx(nt.lane, 'go', 'GUARD');
    }
    return;
  }
  // 撑到尾音：补一笔尾分，算一个 Good 的准确率
  const sm = buffMul('score') * (1 + passSum('score'));
  G.score += 170 * sm;
  G.accW += JW.go;
  G.cnt.go++;
  addCombo(1);
  Audio.fx('hold');
  pushFx(nt.lane, 'go', '');
}

/* ================================================================ 布局：上单点 → 下九框 */
const LAY = { spawn: { x: 0, y: 0 }, boxes: [], bw: 40, bh: 40, arc: 0 };
function layout() {
  const n = 9;
  const wide = W >= 520;
  // 九格要「散得开」而不是「挤成一串」：先把格子压小、间隙放大，再让整条弧
  // 铺满可用宽度。以前格径 88、间隙 8，九个圆几乎相切，远看就是一根彩带，
  // 中间三格（F/G/H）的脸全糊在一起。
  const side = Math.max(8, W * 0.024);
  const gapMin = wide ? Math.max(10, W * 0.012) : Math.max(3, W * 0.012);
  const cap = wide ? Math.min(124, H * 0.22, W * 0.085) : Math.min(40, H * 0.18, W * 0.115);
  const TH = 1.02;                       // 半张角约 58°
  const k = 1 - Math.cos(TH);
  // 给定格径，算出整套布局（九个框的位置 + 发球点）。桌面端要反复试，所以单独成函数
  const place = (bw, spanAll) => {
    const sd = spanAll ? Math.max(8, W * 0.012) : side;
    const pw = spanAll ? 0.85 : 0.9;
    const gap = Math.max(gapMin, (W - sd * 2 - bw * n) / (n - 1));
    const total = spanAll ? W - sd * 2 : bw * n + gap * (n - 1);
    // 底部只留「圆的下半身 + 键位字母」：全屏之后舞台从 280 长到 380，
    // 再多留白九格就离底太远，手指够不到。
    const padB = Math.max(36, bw * 0.5 + (SAVE.keys ? Math.min(18, Math.max(11, bw * 0.16)) + 14 : 10), H * 0.06);
    const baseY = H - padB;
    // 发球圈半径 = bw*0.36，再留 3px，别被上沿切掉
    const spawn = { x: W / 2, y: Math.max(16, bw * 0.36 + 3) };
    // 弧：正中最低、两侧逐级抬高，最外两格一路抬到发球点下方——九格连成半个碗，
    // 发球点就是碗心。上面留 18px 余量，免得最外那格跟右上角的「延迟」打架。
    const room = baseY - (spawn.y + bw * 1.15) - 18;
    // 也不能光看 room：竖屏窄而高，room 有七百多，九格会被拉成一个竖着的长椭圆，
    // 两端到发球点的距离只剩中间的四分之一，球速完全没法统一。横屏按 W*0.45 也够到 room。
    const arc = Math.max(0, Math.min(room, Math.min(H * 0.62, W * 0.45)));
    const boxes = [];
    for (let i = 0; i < n; i++) {
      const t = (i - 4) / 4;               // -1 最左 … 0 正中 … +1 最右
      const lift = (1 - Math.cos(t * TH)) / k;   // 0 正中 / 1 最外侧
      // 横向也按弧来分：等距排的话中间三格（F/G/H）在弧底几乎贴着，两端却拉得很开。
      // 中间放宽、两端略收，九格的「视觉间距」才均匀。
      const sx = Math.sign(t) * Math.pow(Math.abs(t), pw);
      boxes.push({ x: W / 2 + sx * (total - bw) / 2, y: baseY - arc * lift, h: bw, w: bw, key: KEY_LABEL[i], lift });
    }
    return { bw, spawn, arc, boxes };
  };
  const minPitch = (bx) => { let d = 1e9; for (let i = 1; i < bx.length; i++) d = Math.min(d, Math.hypot(bx[i].x - bx[i - 1].x, bx[i].y - bx[i - 1].y)); return d; };
  let L;
  if (FINE && W >= 900) {
    // 电脑端：不再用固定上限，而是「放到相邻两格刚好不碰」为止——1440×800 的屏上格径约 190px
    // （之前封顶 124px，横向还剩大片空地）。从大往小试，相邻圆心距 ≥ 格径的 1.04 倍就收手。
    // 二分找「最大的不碰」格径：格径一变，弧高 / 发球点 / 底边留白都跟着变，不能一步算出来
    let lo = 60, hi = Math.min(300, H * 0.34, W * 0.2);
    L = place(lo, true);
    for (let it = 0; it < 18; it++) {
      const mid = (lo + hi) / 2, T = place(mid, true);
      if (minPitch(T.boxes) >= mid * 1.04) { lo = mid; L = T; } else hi = mid;
    }
  } else {
    L = place(Math.max(22, Math.min(cap, (W - side * 2 - gapMin * (n - 1)) / n)), false);
  }
  LAY.bw = L.bw;
  LAY.bh = L.bw;
  LAY.spawn = L.spawn;
  LAY.arc = L.arc;
  LAY.boxes.length = 0;
  for (const b of L.boxes) LAY.boxes.push(b);
}
// 音符在某时刻的位置：k=0 在发球点，k=1 在框里。
// 越过 1 之后不再钉在 1.05 上（以前被忽略的音符会「贴」在框里不动，
// 看着像卡住了）：让它继续往前滑一点再淡掉，错过的那一刻就消失。
function notePos(n, now, le) {
  const b = boxOf(n.lane);
  const k = clamp(1 - (n.t - now) / le, -0.18, 1.5);
  return {
    x: LAY.spawn.x + (b.x - LAY.spawn.x) * k,
    y: LAY.spawn.y + (b.y - LAY.spawn.y) * k,
    k,
  };
}
const fadeK = (k) => (k <= 1 ? 1 : clamp(1 - (k - 1) / 0.45, 0, 1));
function leadEff() {
  // 偏移大（蓝牙耳机、电视投屏）时，音符也稍微提前出现：±200ms 只动 ±4.4%，
  // 手感几乎不变，但「看到进框」和「听到声音」能重新对上。
  const k = 1 - clamp(SAVE.offset, -200, 200) / 1000 * 0.22;
  return diffOf(G.diffK).lead * SAVE.flow * k;
}

/* ================================================================ 输入 */
function tapLane(lane, ptr, lag) {
  if (!G.running || G.paused) return;
  const now = chartTime(lag);
  const W4 = windows()[3];
  let best = null, bestAbs = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.lane !== lane || n.judged || (n.kind === 'hold' && n.holding)) continue;
    const a = Math.abs(n.t - now);
    if (a > W4) continue;
    if (a < bestAbs) { bestAbs = a; best = n; }
  }
  if (!best) return;
  pressNote(best, ptr, lag);
}
function tapNear(x, y, ptr, lag) {
  if (!G.running || G.paused) return;
  const now = chartTime(lag);
  const W4 = windows()[3];
  const le = leadEff();
  let best = null, bestCost = 1e9;
  for (let i = G.ni; i < G.notes.length; i++) {
    const n = G.notes[i];
    if (n.t - now > W4) break;
    if (n.judged || (n.kind === 'hold' && n.holding)) continue;
    const p = notePos(n, now, le);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > LAY.bw * 0.95) continue;
    const cost = Math.abs(n.t - now) * 2 + d / 300;
    if (cost < bestCost) { bestCost = cost; best = n; }
  }
  // 点音符本身也要把「哪根手指」传下去：长条不登记手指就永远等不到松手，
  // 会一直挂在框上（这一版之前「卡在下面」的主因就是这个）。
  if (best) pressNote(best, ptr == null ? null : ptr, lag);
}
function pressNote(n, ptr, lag) {
  const now = chartTime(lag);
  const dt = n.t - now;
  const j = judgeBy(dt);
  if (!j) return;
  sampleLat(dt);
  if (n.kind === 'hold') {
    n.holding = true;
    if (!(n.tail > n.t)) n.tail = n.t + 0.4;      // 兜底：数据缺尾音也别卡死
    const key = ptr != null ? ptr : ('v' + Math.round(n.t * 1000));
    n._ptr = key;
    G.holds[key] = n;
    G.active.add(n);
    Audio.fx('holdstart');
  }
  judgeNote(n, j);
}
function releasePtr(ptr) {
  const n = G.holds[ptr];
  if (n) { delete G.holds[ptr]; releaseHold(n, true); }
}
function laneAt(x, y) {
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    if (Math.abs(x - b.x) <= b.w / 2 + 3 && Math.abs(y - b.y) <= b.h / 2 + 8) return i;
  }
  return -1;
}

/* ================================================================ 画布 */
const cv = $('#cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;

// 静态层缓存：渐变底、发球点光晕、九条引导线、九个框（含头像和键位）。
// 以前每帧都要重建 11 个渐变、给九个头像做 clip + drawImage、再画九次圆角框——
// 中低端机上掉帧就掉在这里。现在只在尺寸变化时算一次，主循环只做两次 drawImage。
const bgLayer = document.createElement('canvas');
const boxLayer = document.createElement('canvas');
const bgCtx = bgLayer.getContext('2d');
const boxCtx = boxLayer.getContext('2d');
const SPRITE = new Map();

// 圆形头像精灵：一次画好（含描边），之后每帧只是一次 drawImage。
// 音符和框都吃这张缓存——同一张脸在同一尺寸下只做一次 clip。
function sprite(u, px) {
  const size = Math.max(10, Math.round(px));
  const key = u.id + ':' + size;
  const hit = SPRITE.get(key);
  if (hit) return hit;
  if (SPRITE.size > 160) SPRITE.clear();
  const s2 = Math.round(size * 2 * DPR);
  const c = document.createElement('canvas');
  c.width = s2; c.height = s2;
  const g = c.getContext('2d');
  g.save();
  g.beginPath();
  g.arc(s2 / 2, s2 / 2, s2 / 2 - 1, 0, Math.PI * 2);
  g.clip();
  if (FACE_OK(u)) g.drawImage(u.img, 0, 0, s2, s2);
  else { g.fillStyle = 'hsl(' + u.hue + ',30%,24%)'; g.fillRect(0, 0, s2, s2); }
  g.restore();
  g.lineWidth = Math.max(2, s2 * 0.045);
  g.strokeStyle = 'hsl(' + u.hue + ',88%,74%)';
  g.beginPath();
  g.arc(s2 / 2, s2 / 2, s2 / 2 - 2, 0, Math.PI * 2);
  g.stroke();
  SPRITE.set(key, c);
  return c;
}

// 飞行音符用的发光圆环：按轨道色预渲染成一张贴图，每帧一次 drawImage。
// 不现画 shadowBlur —— 一屏十几个音符同时带模糊，中低端机直接掉帧。
const RINGS = new Map();
function ringSprite(hue, px) {
  const size = Math.max(10, Math.round(px));
  const key = hue + ':' + size;
  const hit = RINGS.get(key);
  if (hit) return hit;
  if (RINGS.size > 90) RINGS.clear();
  const s2 = Math.round(size * 2 * DPR);
  const c = document.createElement('canvas');
  c.width = s2; c.height = s2;
  const g = c.getContext('2d');
  const cx = s2 / 2;
  const r = cx * 0.72;                       // 环半径，留 28% 给外发光
  const halo = g.createRadialGradient(cx, cx, r * 0.55, cx, cx, cx);
  halo.addColorStop(0, 'hsla(' + hue + ',96%,70%,0.34)');
  halo.addColorStop(0.55, 'hsla(' + hue + ',96%,66%,0.20)');
  halo.addColorStop(1, 'hsla(' + hue + ',96%,66%,0)');
  g.fillStyle = halo;
  g.beginPath(); g.arc(cx, cx, cx, 0, Math.PI * 2); g.fill();
  // 环体：亮色描边 + 同色投影当辉光，环是空心的，底下轨道看得见
  g.beginPath(); g.arc(cx, cx, r, 0, Math.PI * 2);
  g.lineWidth = Math.max(2, s2 * 0.085);
  g.strokeStyle = 'hsl(' + hue + ',94%,74%)';
  g.shadowColor = 'hsla(' + hue + ',97%,64%,0.95)';
  g.shadowBlur = s2 * 0.15;
  g.stroke();
  g.shadowBlur = 0;
  g.beginPath(); g.arc(cx, cx, r * 0.6, 0, Math.PI * 2);
  g.lineWidth = Math.max(1, s2 * 0.028);
  g.strokeStyle = 'hsla(' + hue + ',92%,84%,0.5)';
  g.stroke();
  g.beginPath(); g.arc(cx, cx, Math.max(1.6, s2 * 0.05), 0, Math.PI * 2);
  g.fillStyle = 'hsla(' + hue + ',96%,90%,0.95)';
  g.fill();
  RINGS.set(key, c);
  return c;
}

function buildStatic() {
  for (const c of [bgLayer, boxLayer]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  bgCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  boxCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  bgCtx.clearRect(0, 0, W, H);
  boxCtx.clearRect(0, 0, W, H);

  const sp = LAY.spawn;
  const bg = bgCtx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0e17');
  bg.addColorStop(0.5, '#101527');
  bg.addColorStop(1, '#0a0d15');
  bgCtx.fillStyle = bg;
  bgCtx.fillRect(0, 0, W, H);

  const halo = bgCtx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, Math.max(W * 0.5, 180));
  halo.addColorStop(0, 'rgba(240,120,180,0.20)');
  halo.addColorStop(0.45, 'rgba(140,120,255,0.07)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = halo;
  bgCtx.fillRect(0, 0, W, H);

  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const g = bgCtx.createLinearGradient(sp.x, sp.y, b.x, b.y);
    g.addColorStop(0, 'hsla(' + u.hue + ',70%,70%,0.10)');
    g.addColorStop(1, 'hsla(' + u.hue + ',70%,70%,0.03)');
    bgCtx.strokeStyle = g;
    bgCtx.lineWidth = 1;
    bgCtx.beginPath();
    bgCtx.moveTo(sp.x, sp.y);
    bgCtx.lineTo(b.x, b.y);
    bgCtx.stroke();
  }

  // 九个框：底、边、头像、键位。底和头像都做成半透明——技能立绘在底下放的时候
  // 要能透出来，框只负责「定住位置」，不该像九块实心砖把舞台下半截盖死。
  // 框是正圆而不是圆角方块：九格既然已经排成弧，方块会在弧线上留一圈拐角，
  // 圆的才连成一串（SIF 那九个头像本来也是一圈圆）。
  boxCtx.textAlign = 'center';
  boxCtx.textBaseline = 'middle';
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const r = b.w / 2;
    boxCtx.beginPath();
    boxCtx.arc(b.x, b.y, r, 0, Math.PI * 2);
    boxCtx.fillStyle = 'rgba(10,14,26,0.20)';
    boxCtx.fill();
    boxCtx.lineWidth = 2;
    boxCtx.strokeStyle = 'hsla(' + u.hue + ',88%,76%,0.7)';
    boxCtx.stroke();
    const ir = r - 3.5;
    boxCtx.globalAlpha = 0.46;                  // 脸还是半透明（音符要压得下去），但别暗成一团
    boxCtx.drawImage(sprite(u, ir), b.x - ir, b.y - ir, ir * 2, ir * 2);
    boxCtx.globalAlpha = 1;
    if (SAVE.keys) {
      boxCtx.font = '600 ' + Math.round(Math.min(20, Math.max(11, b.w * 0.22))) + 'px ui-monospace,SFMono-Regular,Menlo,monospace';
      boxCtx.fillStyle = 'rgba(214,222,244,0.68)';
      boxCtx.fillText(KEY_LABEL[i], b.x, b.y + r + Math.min(18, Math.max(11, b.w * 0.16)));
    }
  }
}

function fit() {
  const box = $('#stage');
  if (!box) return;
  const b = box.getBoundingClientRect();
  // 宽度给个下限防止 0；高度必须**跟着容器**，不能设下限把它顶高——
  // 横屏时舞台只有两百多像素，一撑就超出 .stage，底下的九格直接被裁没
  W = Math.max(240, b.width);
  H = Math.max(160, b.height);
  // 2.5 的像素比在手机上等于白烧一半填充率；2 已经看不出差别
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  cv.style.width = W + 'px';
  cv.style.height = H + 'px';
  layout();
  buildStatic();
}
window.addEventListener('resize', () => fit());
if (window.ResizeObserver) new ResizeObserver(() => fit()).observe($('#stage'));
document.addEventListener('zj:orient', () => setTimeout(fit, 120));

cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const b = cv.getBoundingClientRect();
  // 正常情况下 canvas 的 CSS 尺寸就是 W×H（fit 里钉死），1:1 直接减就行。
  // 但页面被缩放过（双击放大、某些内置浏览器的视口压缩、或者 CSS 把 canvas 拉宽）
  // 时 rect 会跟 W/H 对不上，这时候不减比例就是「看着点到了、判到别的格」。
  const sx = b.width ? W / b.width : 1;
  const sy = b.height ? H / b.height : 1;
  const x = (e.clientX - b.left) * sx, y = (e.clientY - b.top) * sy;
  const lane = laneAt(x, y);
  const lag = evLag(e);
  if (lane >= 0) tapLane(lane, 'p' + e.pointerId, lag);
  else tapNear(x, y, 'p' + e.pointerId, lag);
  cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
}, { passive: false });
window.addEventListener('pointerup', (e) => releasePtr('p' + e.pointerId));
window.addEventListener('pointercancel', (e) => releasePtr('p' + e.pointerId));
// 键盘一律在 capture 阶段拦：局内空格现在是最常打的那一格，不先 preventDefault
// 的话浏览器会顺手把页面往下滚；设置里「等你按键」也得抢在别的监听前面。
window.addEventListener('keydown', (e) => {
  // 设置里点了某一格在等键：这一下只用来改键位，不往局内送
  if (REMAP >= 0) { captureRemap(e); return; }
  if (G.scr !== 'live' && G.scr !== 'edit') return;
  const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '');
  if (typing && G.scr === 'edit') return;      // 编辑器里在填输入框，让字符正常进
  const lane = KEYS.indexOf(keyIdOf(e));
  if (lane >= 0) {
    e.preventDefault();
    if (e.repeat) return;
    tapLane(lane, 'k' + lane, evLag(e));
    return;
  }
  if (e.key === 'Escape' && G.running) togglePause();
}, true);
window.addEventListener('keyup', (e) => {
  const lane = KEYS.indexOf(keyIdOf(e));
  if (lane >= 0) releasePtr('k' + lane);
});

/* ================================================================ 渲染 */
function draw(clock) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const now = G.running ? chartTime() : 0;
  const le = leadEff();
  const beat = (G.chart && G.chart.arr) ? (now / G.chart.arr.spb) % 1 : (now * 2) % 1;

  // 技能立绘在放的时候，把底图压低让它透出来（框和音符仍然是实心的）
  ctx.globalAlpha = ART.on ? 0.3 : 1;
  ctx.drawImage(bgLayer, 0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.drawImage(boxLayer, 0, 0, W, H);

  // 发球点（每帧就这一圈，便宜）
  const sp = LAY.spawn;
  const pulse = 1 + Math.max(0, 0.5 - beat) * 0.12;
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(10, LAY.bw * 0.28) * pulse, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(240,120,180,0.16)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,158,203,0.85)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sp.x, sp.y, Math.max(3.5, LAY.bw * 0.085), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,190,220,0.9)';
  ctx.fill();

  // 按住的框：亮一圈 + 上一帧的命中闪光
  for (let i = 0; i < 9; i++) {
    const b = LAY.boxes[i];
    const u = laneUnit(i);
    const r = b.w / 2;
    if (G.holdingLanes.indexOf(i) >= 0) {
      // 按住时亮一圈：框已经是圆的了，这里也跟着画圆环，别在弧上留个方角
      ctx.beginPath();
      ctx.arc(b.x, b.y, r - 1, 0, Math.PI * 2);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'hsla(' + u.hue + ',90%,76%,0.95)';
      ctx.stroke();
    }
    const fl = G.flashes[i];
    if (!fl) continue;
    const hitA = clamp(1 - (clock - fl.t) / 0.24, 0, 1);
    if (hitA <= 0) { delete G.flashes[i]; continue; }
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 3 + hitA * 8, 0, Math.PI * 2);
    ctx.strokeStyle = JC[fl.j] || '#fff';
    ctx.globalAlpha = hitA * 0.85;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 画到哪儿：已经在框里结算完的音符不用再画
  while (G.di < G.notes.length && G.notes[G.di].judged && !G.notes[G.di].holding) G.di++;

  // 长条：细一点的轨道 + 一根亮芯，之前那样一条 0.44bw 的粗带太压画面
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.kind !== 'hold') continue;
    if (n.judged && !n.holding) continue;
    const b = LAY.boxes[n.lane];
    const hp = n.holding ? { x: b.x, y: b.y } : notePos(n, now, le);
    const tp = notePos({ lane: n.lane, t: n.tail }, now, le);
    const u = laneUnit(n.lane);
    const col = n.broken ? '150,150,165' : (u.hue + ',85%,72%');
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.strokeStyle = n.broken ? 'rgba(150,150,165,0.16)' : 'hsla(' + col + ',0.26)';
    ctx.lineWidth = LAY.bw * 0.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hp.x, hp.y);
    ctx.lineTo(tp.x, tp.y);
    ctx.strokeStyle = n.broken ? 'rgba(160,160,175,0.3)' : 'hsla(' + col + ',0.85)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // 尾音也是一个同色圆环。尺寸跟音符头完全一样（ringSprite 里环半径 = 0.72×径），
    // 以前尾环比头小一圈（0.42 对 0.62），看着像「远处一个小点」，
    // 到底什么时候该松手全凭猜。现在两个环一样大，尾音进框就是松手的那一刻。
    let tx = tp.x, ty = tp.y;
    if (n.holding && tp.k >= 1) { tx = b.x; ty = b.y; }   // 按着时尾音贴在框里
    const tr = LAY.bw * 0.62;
    const tfade = n.broken ? 0.34 : fadeK(n.holding ? Math.min(tp.k, 1) : tp.k);
    if (tfade > 0.02) {
      ctx.globalAlpha = tfade;
      ctx.drawImage(ringSprite(u.hue, tr), tx - tr, ty - tr, tr * 2, tr * 2);
      ctx.globalAlpha = 1;
    }
  }

  // 音符头：轨道色的发光圆环。头像留给下面的九格——飞在半空的十几个小脸
  // 既看不清是谁，又和格子里的同一张脸打架；换成环，靠颜色分轨，干净得多。
  for (let i = G.di; i < G.notes.length; i++) {
    const n = G.notes[i];
    if ((n.t - now) / le > 1.05) break;
    if (n.judged && !(n.kind === 'hold' && n.holding)) continue;
    const u = laneUnit(n.lane);
    const p = n.holding ? { x: LAY.boxes[n.lane].x, y: LAY.boxes[n.lane].y - LAY.bh * 0.42, k: 1 } : notePos(n, now, le);
    const fade = fadeK(p.k);
    if (fade <= 0.02) continue;
    // 环的大小跟下面的格子对齐（格子直径 = LAY.bw）：环直径 = 2×0.72×rr3 ≈ 0.9bw，
    // 压进框里刚好盖住格子，不会出现「球比框小一圈」的错位感。
    // 强音（s 大）再大一点点，双押下来时看得出这两个是一起按的。
    const rr3 = LAY.bw * 0.62 + (n.s || 0.5) * LAY.bw * 0.05;
    ctx.globalAlpha = fade;
    ctx.drawImage(ringSprite(u.hue, rr3), p.x - rr3, p.y - rr3, rr3 * 2, rr3 * 2);
    ctx.globalAlpha = 1;
  }

  // 判定字：每个轨道同一时间只留一条（以前 GUARD / SAVED 叠成一片就是没去重）
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const fs = Math.round(Math.min(15, LAY.bw * 0.44));
  ctx.font = '800 ' + fs + 'px system-ui,sans-serif';
  const txMax = Math.max(50, W - 50);
  for (const f of G.fx) {
    if (!f.txt) continue;
    const age = clock - f.t;
    if (age > 0.5) continue;
    const a = 1 - age / 0.5;
    const tx = clamp(f.x, 50, txMax);       // 最边上的轨道不许把字画出画布
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(8,6,14,0.65)';
    ctx.fillText(f.txt, tx + 1, f.y - 10 - age * 40 + 1);
    ctx.fillStyle = JC[f.j] || '#fff';
    ctx.fillText(f.txt, tx, f.y - 10 - age * 40);
    ctx.globalAlpha = 1;
  }
  ctx.textBaseline = 'alphabetic';
  while (G.fx.length && clock - G.fx[0].t > 0.5) G.fx.shift();

  // 连击
  if (G.combo >= 2) {
    // 两端抬到发球点下方之后，连击数字得退到碗里（0.46H）才不压着它们
    const cy = H * 0.46;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240,244,255,0.9)';
    ctx.font = '900 ' + Math.round(Math.min(56, H * 0.09)) + 'px system-ui,sans-serif';
    ctx.fillText(String(G.combo), W / 2, cy);
    ctx.fillStyle = 'rgba(240,120,180,0.7)';
    ctx.font = '700 ' + Math.round(Math.min(14, H * 0.024)) + 'px system-ui,sans-serif';
    ctx.fillText('COMBO', W / 2, cy + Math.min(34, H * 0.058));
    ctx.textBaseline = 'alphabetic';
  }
}

/* ================================================================ 主循环 */
// HUD 只在数值真变了才写 DOM：每帧改 textContent / style.width 会逼着重排，
// 分数和进度条是「看起来在动」就够的东西，10Hz 跟 60Hz 没区别。
const HUDC = { score: '', combo: '', stam: -1, prog: -1, lat: '' };
let faceTick = 0, lastFrame = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (document.hidden) return;
  // 两帧间隔太近（高刷屏 + 后台标签页回来）就跳过：画了也看不见，白烧 CPU
  if (ts - lastFrame < 8) return;
  lastFrame = ts;
  if (!G.running) { if (G.scr === 'live') draw(ts / 1000); return; }
  const t = ts / 1000;
  draw(t);
  // 头像还没解码完时，静态层里的框是空心的：解码好了补画一次
  if (t - faceTick > 0.5) {
    faceTick = t;
    let waiting = false;
    for (let i = 0; i < 9 && !waiting; i++) if (!FACE_OK(laneUnit(i))) waiting = true;
    if (waiting) buildStatic();
  }
  if (G.paused) return;
  const now = chartTime();
  const prevNow = G.lastNow;
  G.lastNow = now;
  // HUD
  const sc = fmt(G.score);
  if (sc !== HUDC.score) { HUDC.score = sc; $('#live-score').textContent = sc; }
  const cb = G.combo > 0 ? G.combo + ' 连击' : '—';
  if (cb !== HUDC.combo) { HUDC.combo = cb; $('#live-combo').textContent = cb; }
  const la = G.lat.n ? G.lat.avg : 0;
  const lt = (la > 0 ? '+' : '') + la + 'ms';
  if (lt !== HUDC.lat) {
    HUDC.lat = lt;
    const el = $('#live-lat');
    if (el) {
      el.textContent = '延迟 ' + lt;
      el.style.color = Math.abs(la) <= 15 ? 'rgba(150,230,170,.95)'
        : Math.abs(la) <= 35 ? 'rgba(255,215,106,.95)' : 'rgba(255,140,130,.95)';
    }
  }
  const st = Math.round(G.stamina);
  if (st !== HUDC.stam) {
    HUDC.stam = st;
    const stEl = $('#live-stam');
    stEl.style.width = st + '%';
    stEl.parentElement.classList.toggle('low', st <= 30);
  }
  const pr = Math.round(clamp(now / (G.chart ? G.chart.dur : 1), 0, 1) * 200) / 2;
  if (pr !== HUDC.prog) { HUDC.prog = pr; $('#live-prog').style.width = pr + '%'; }
  if (now > (G.tickAt || 0)) {
    G.tickAt = now + 0.2;
    tickSkills(now);
    paintSkillChips(false);
    const bEl = $('#live-banner');
    if (G.banner && now > G.banner.until) G.banner = null;
    const bt = G.banner ? G.banner.txt : '';
    if (bEl.textContent !== bt) bEl.textContent = bt;
    bEl.style.opacity = G.banner ? 1 : 0;
    if (G.banner) bEl.style.borderColor = 'hsla(' + G.banner.hue + ',80%,70%,0.6)';
  }
  // 时钟停摆保护：系统音频被挂起（切设备、系统休眠、蓝牙断开）时
  // ac.currentTime 会冻住，谱面就停在原地不动——看着就是「音符卡在下面」。
  // 先自己 resume 一次；还是不动就把这一局暂停下来，让玩家点「继续」再走。
  const dt = G.lastT ? Math.max(0, t - G.lastT) : 0;
  G.lastT = t;
  if (prevNow != null && Math.abs(now - prevNow) < 1e-6) G.stall += dt;
  else G.stall = 0;
  if (G.stall > 0.8) {
    Audio.resume();
    if (G.stall > 2.2) {
      G.stall = 0;
      togglePause();
      G.banner = { txt: '声音被系统掐断了，点「继续」接着打', until: now + 4, hue: 30 };
    }
  }
  // 按住中的长条撑到尾音（按 active 集合走，不依赖「哪根手指按的」，
  // 万一哪条登记漏了，也会在尾音后自己松开，不会永远挂在框上）
  for (const hn of G.active) {
    if (!hn.holding) { G.active.delete(hn); continue; }
    if (now >= hn.tail + 0.02) releaseHold(hn, false);
  }
  // 同时在按几根就亮几个框（双长按要两个框一起亮，不然看不出按住的是哪两根）
  G.holdingLanes.length = 0;
  for (const hn of G.active) {
    if (hn.holding && G.holdingLanes.indexOf(hn.lane) < 0) G.holdingLanes.push(hn.lane);
  }
  // 过点判定
  const W4 = windows()[3];
  // 听歌模式：体力锁满，怎么打都不会死（音符照样被自动清掉，谱面一直往前走）
  if (G.listen) G.stamina = 100;
  while (G.ni < G.notes.length) {
    const n = G.notes[G.ni];
    if ((G.auto || G.listen) && !n.judged && n.t <= now) {
      autoHit(n, now, G.listen ? 'b' : null);
      continue;
    }
    if (!n.judged) {
      if (n.t < now - W4) { missNote(n); continue; }
      break;
    }
    G.ni++;                       // 长条还在按住：头已经判过了，尾音交给 G.holds 收
  }
  if (G.stamina <= 0) { finish(true); return; }
  if (G.chart && now > G.chart.dur) finish(false);
}
function autoHit(n, now, fixed) {
  if (n.kind === 'hold') {
    n.holding = true;
    const j = fixed || judgeBy(n.t - now) || 'p';
    judgeNote(n, j);
    n.holding = false;
    // 自动模式直接算撑满
    const sm = buffMul('score') * (1 + passSum('score'));
    G.score += 170 * sm;
    G.accW += JW.go; G.cnt.go++;
    addCombo(1);
  } else {
    judgeNote(n, fixed || judgeBy(n.t - now) || 'p');
  }
  G.ni++;
}
requestAnimationFrame(loop);

/* ================================================================ 技能条 UI */
function paintSkillChips(force) {
  const now = chartTime();
  const box = $('#skills');
  if (force || box.childNodes.length !== G.sk.length) {
    box.textContent = '';
    for (const st of G.sk) {
      const el = document.createElement('div');
      el.className = 'skill';
      el.style.setProperty('--h', st.u.hue);
      el.innerHTML = '<img alt="" src="' + st.u.art + '"><i class="gauge"><b></b></i>';
      el.title = st.u.n + '「' + st.u.skill.n + '」\n' + st.u.skill.txt;
      box.appendChild(el);
    }
  }
  const kids = box.childNodes;
  for (let i = 0; i < G.sk.length; i++) {
    const st = G.sk[i], el = kids[i];
    if (!el) continue;
    const sk = st.u.skill;
    let fr = 1;
    if (sk.trig === 'time') fr = clamp((now - st.last) / sk.need, 0, 1);
    else if (sk.trig === 'combo') fr = G.combo > 0 ? (G.combo % sk.need) / sk.need : 0;
    else if (sk.trig === 'perfect') fr = (st.cnt % sk.need) / sk.need;
    else if (sk.trig === 'start') fr = 1;
    el.querySelector('.gauge b').style.width = (fr * 100) + '%';
    el.classList.toggle('ready', fr >= 1);
  }
}

/* ================================================================ 音源准备 */
const TRACK_CACHE = new Map();
// 上一次没能用上原曲的原因：手机上一旦取包/解密/解码失败，页面会安静退回芯片，
// 耳朵里就是「全是电子音」。留个字符串，暂停面板直接摊给用户看。
let trackWhy = '';
// 取一首歌的音频，三档优先级：
//   ① 本机导入的原曲（IndexedDB，玩家的私人版本，能盖过内置包）
//   ② 仓库里的原曲包（assets/ll-music/*.bin，加密的，取回来在这里解）
//   ③ 都没有 → null，回去走页面内合成
// 抓点（onsets）算一次就够了：解出来的重音表存在 IndexedDB 里（'ons2:' 前缀），
// 下次开同一首不用重新扫一遍几十万帧。
// 前缀带版本号：抓点结果多带了「拖长 / 音区 / 频段」三个字段，旧缓存（ons:）
// 只有时间与强度，出谱会退化成没有长条的随机铺点，看见老键就换新的。
async function prepareTrack(songId) {
  if (TRACK_CACHE.has(songId)) return TRACK_CACHE.get(songId);
  const rec = await idbGet(songId).catch(() => null);
  let data = rec && rec.data;
  let name = rec && rec.name;
  let onsets = rec && rec.onsets;
  let pack = false;
  if (!data && hasPack(PACKS, songId)) {
    const plain = await fetchPack(PACKS, songId).catch(() => null);
    if (plain) {
      data = plain;
      pack = true;
      trackWhy = '';
      const meta = PACKS[songId] || {};
      name = meta.src || ('原曲包 · ' + songId);
      const saved = await idbCGet('ons2:' + songId).catch(() => null);
      if (saved && saved.onsets) onsets = saved.onsets;
    } else {
      trackWhy = packWhy() || '原曲包取不到';
    }
  } else if (!data) {
    trackWhy = '本机没有这首的音源';
  }
  if (!data) return null;
  let buffer;
  try {
    buffer = await Audio.decode(data.slice(0));
  } catch (e) {
    // 解码失败（手机内存紧、格式怪）时也把原话留住，别只留一句「电子音」
    trackWhy = '原曲解码失败：' + ((e && (e.name || e.message)) || e);
    throw e;
  }
  let on;
  // 数组形式是缓存下来的（7 个数一档），对象形式是本机导入时刚算的
  if (onsets && onsets.length) on = Array.isArray(onsets[0]) ? unpackOnsets(onsets) : onsets;
  else {
    on = detectOnsets(buffer);
    idbCSet('ons2:' + songId, { onsets: packOnsets(on), dur: buffer.duration }).catch(() => {});
  }
  const v = { buffer, onsets: on, name, dur: buffer.duration, pack };
  TRACK_CACHE.set(songId, v);
  return v;
}
async function buildChart(song, diffK, track) {
  const D = diffOf(diffK);
  const seed = hashStr(song.id + ':' + diffK);
  if (track && track.buffer) {
    let on = track.onsets;
    if (!on || !on.length) on = detectOnsets(track.buffer);
    const c = chartFromOnsets(on, track.buffer.duration, D, seed);
    c.arr = null;
    return c;
  }
  const arr = arrange(song);
  const c = chartFromArr(arr, D, seed);
  c.arr = arr;
  return c;
}

/* ================================================================ 开局 / 暂停 / 结算 */
async function startLive() {
  if (G.prep) return;
  // 全屏请求必须在手势的同一个任务里发出去，下面全是 await，错过这一行就请求不了了
  enterImmersive();
  const song = G.song || SONGS[0];
  G.song = song;
  const D = diffOf(G.diffK);
  G.prep = true;
  const goBtn = $('#team-go');
  if (goBtn) { goBtn.disabled = true; goBtn.textContent = '载入音源…'; }
  let track = null, chart = null;
  if (song.custom) {
    // 工坊里做的谱面：notes 存在 IndexedDB，音频按 audioKey 取（本机，不上传）
    const key = song.mineId || song.cloudId;
    const rec = await idbCGet(key).catch(() => null);
    if (rec && rec.notes) {
      try { track = await prepareTrack(rec.audioKey || ('au:' + key)); } catch (e) { track = null; }
      chart = {
        notes: rec.notes.map((a) => ({
          t: a[0], lane: a[1], kind: a[2] ? 'hold' : 'tap', tail: a[3] || 0,
          s: a[4] == null ? 0.6 : a[4], judged: false, hit: false, holding: false,
        })),
        dur: track ? track.dur : (rec.dur || 60), src: 'custom', arr: null,
      };
    }
  } else {
    try { track = await prepareTrack(song.id); } catch (e) { track = null; }
    try { chart = await buildChart(song, G.diffK, track); }
    catch (e) { chart = await buildChart(song, G.diffK, null); }
  }
  G.prep = false;
  if (!chart) {
    if (goBtn) { goBtn.disabled = false; goBtn.textContent = '上场！'; }
    flash('#team-tip', '这份谱面的数据没在本机（可能换过设备），回工坊重新导入一次');
    return;
  }
  if (goBtn) { goBtn.disabled = false; goBtn.textContent = '上场！'; }

  G.chart = chart;
  G.chartSrc = chart.src;
  G.notes = chart.notes;
  // 谱面必须按时间排好：ni（判定）和 di（绘制）都是「从当前位置往后顺推」，
  // 只要有一条乱序，它后面的音符就再也轮不到判定，会一直贴在框上。
  // 工坊手工编辑 / 云端下载的谱面不保证有序，这里统一排一次。
  G.notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  for (const n of G.notes) { n.judged = false; n.hit = false; n.holding = false; n.broken = false; n._ptr = null; }
  G.active.clear();
  G.stall = 0; G.lastT = 0; G.lastNow = 0;
  G.ni = 0;
  G.holdTotal = chart.notes.reduce((a, n) => a + (n.kind === 'hold' ? 1 : 0), 0);
  G.combo = 0; G.maxCombo = 0; G.score = 0;
  G.cnt = { p: 0, g: 0, go: 0, b: 0, m: 0 };
  G.accW = 0; G.stamina = 100; G.fx = []; G.flashes = []; G.holds = {};
  G.over = false; G.paused = false; G.banner = null; G.tickAt = 0;
  G.di = 0; G.holdingLanes = [];
  // 每局重新采：上一首的偏移不该拿来判断这一首（换了耳机、换了握法都是新的）
  G.lat = { buf: [], n: 0, avg: 0, last: 0 };
  // 这一局到底在放什么、听歌模式开没开：暂停面板要显示，别再让人猜「为什么是电子音」
  G.listen = !!SAVE.listen;
  G.srcPack = !!(track && track.pack);
  G.srcLite = !!(track && Audio.lite);
  G.srcName = track ? (track.name || '') : '';
  G.srcWhy = track ? '' : (trackWhy || '没有可用的原曲');
  Audio.setMute(!!SAVE.mute);
  Audio.setVol(SAVE.musVol, SAVE.fxVol);
  Audio.setScale(song.root || 60);
  if (track && track.buffer) Audio.playBuffer(track.buffer, 0);
  else if (song.custom) Audio.playClock();
  // 芯片线路：谱面第一条音符在 lead 秒，音乐整体后挪同样的时间（以前没挪，
  // 每个音都在听到之后 1~1.8 秒才被敲到，整首听起来踩在反拍上）
  else Audio.playChip(chart.arr, song.wave, D.lead);
  G.running = true;
  show('live');
  $('#live-song').textContent = song.n;
  G.diffText = song.custom ? ('自制谱面' + (track ? '' : ' · 无音频')) : (D.n + (track ? ' · 原曲' : ' · 芯片改编'));
  paintDiffText();
  $('#live-score').textContent = '0';
  $('#live-combo').textContent = '—';
  $('#live-banner').textContent = '';
  fit();
  preloadArt(team());
  initSkills();
  paintSkillChips(true);
}
// 顶栏那行「NORMAL · 原曲」：局内开关听歌模式要跟着变，不然看不出现在是听歌还是正式打
function paintDiffText() {
  const el = $('#live-diff');
  if (el) el.textContent = (G.diffText || '') + (G.listen ? ' · 听歌' : '');
}
function togglePause() {
  if (!G.running) return;
  G.paused = !G.paused;
  $('#pauseDlg').hidden = !G.paused;
  if (G.paused) { paintPause(); Audio.suspend(); } else Audio.resume();
}

// 屏幕方向托管给全站的 zj-orient 组件（它负责锁方向、转屏提示、记本地），
// 这里只做读 / 写两层薄封装，让设置与暂停面板的分段控件跟它同步。
// 手机第一次进来默认横屏（body 上有 data-orient-default="land"）。
function orientPref() {
  try {
    if (window.zjOrient) return window.zjOrient.get();
    return localStorage.getItem('zjtt:orient:lovelive') || 'auto';
  } catch (e) { return 'auto'; }
}
function setOrient(k) {
  try { if (window.zjOrient) window.zjOrient.set(k, true); } catch (e) { /* 组件不在就随它 */ }
  $$('#set-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  $$('#pause-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === k));
  // 转屏后画布尺寸会变，晚一点再排一次（等浏览器把视口改完）
  setTimeout(fit, 300);
}

// 暂停面板：音量两条、屏幕方向、听歌模式、当前音源。局内能直接调，
// 不用退出到设置再进来（打歌中途谁也懒得来回切屏）。
// 从 http 打开时 crypto.subtle 是被浏览器摘掉的，原曲只能走纯 JS 解密：
// 能听，但慢一点，得让用户知道「不是没生效，是换了一条路」。
const HTTP_MODE = location.protocol === 'http:' && !/^(localhost|127\.|\[::1\])/.test(location.hostname);
function srcLine() {
  if (G.srcWhy) return '芯片合成 · ' + G.srcWhy + (HTTP_MODE ? '（http 打开，浏览器关掉了 WebCrypto）' : '');
  const nm = G.song ? G.song.n : '';
  const via = G.srcPack && packHow() === 'js' ? '（纯 JS 解密）' : '';
  return (G.srcPack ? '原曲' : '本机音频') + (nm ? ' · ' + nm : '') + (G.srcLite ? '（降级解码）' : '') + via;
}
function paintPause() {
  const m = $('#pause-mus'), f = $('#pause-fx');
  if (m) {
    m.value = String(Math.round(SAVE.musVol * 100));
    $('#pause-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  }
  if (f) {
    f.value = String(Math.round(SAVE.fxVol * 100));
    $('#pause-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  }
  $$('#pause-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === orientPref()));
  $$('#pause-listen button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!G.listen));
  const el = $('#pause-src');
  if (el) el.textContent = '音源：' + srcLine();
}
function finish(failed) {
  if (G.over) return;
  G.over = true; G.running = false;
  Audio.stop();
  for (const n of G.active) n.holding = false;
  G.active.clear();
  G.holds = {};
  // 长条尾音占半个判定位：满分时 accW 恰好等于这个分母（头 1.0 + 尾 0.5）
  const total = G.notes.length + (G.holdTotal || 0) * 0.5;
  const acc = total ? G.accW / total : 0;
  const ap = total > 0 && G.cnt.p === total;
  const fc = !failed && G.cnt.m === 0 && G.cnt.b === 0;
  const rank = failed ? 'F' : acc >= 0.985 ? 'SSS' : acc >= 0.945 ? 'SS' : acc >= 0.90 ? 'S'
    : acc >= 0.82 ? 'A' : acc >= 0.72 ? 'B' : acc >= 0.60 ? 'C' : 'D';
  const bk = bestKey(G.song.id, G.diffK);
  let isBest = false;
  if (G.listen) {
    // 听歌模式的判定是固定的 BAD，成绩没有可比性：不写最高分、也不计场次
  } else {
    SAVE.plays++;
    if (G.maxCombo > SAVE.bestCombo) SAVE.bestCombo = G.maxCombo;
    isBest = (Number(SAVE.best[bk]) || 0) < Math.round(G.score);
    if (isBest) SAVE.best[bk] = Math.round(G.score);
    // 让 account.js 把新的最高分排队推上云（榜单读的是云端摘要；不通知的话要等下次别的页面触发同步）
    try { document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'gd' })); } catch (e) { /* noop */ }
  }
  persist();
  $('#res-rank').textContent = G.listen ? '🎧' : rank;
  $('#res-title').textContent = G.listen ? '听歌模式 · 完整听完'
    : failed ? '体力见底，Live 中断…' : (ap ? 'ALL PERFECT！' : fc ? 'FULL COMBO！' : 'Live 结束');
  const latEnd = G.lat && G.lat.n ? (' · 延迟 ' + (G.lat.avg > 0 ? '+' : '') + G.lat.avg + 'ms') : '';
  $('#res-song').textContent = G.song.n + ' · ' + diffOf(G.diffK).n
    + (G.chartSrc === 'audio' ? ' · 原曲' : '') + (G.listen ? ' · 不计成绩' : '') + latEnd;
  $('#res-score').textContent = fmt(G.score);
  $('#res-acc').textContent = (acc * 100).toFixed(2) + '%';
  $('#res-combo').textContent = String(G.maxCombo);
  $('#res-notes').textContent = String(G.notes.length);
  $('#res-best').textContent = G.listen ? '听歌模式不计成绩' : (isBest ? '★ 新纪录' : '最高 ' + fmt(SAVE.best[bk] || 0));
  $('#res-judge').innerHTML = ['p', 'g', 'go', 'b', 'm']
    .map((k) => '<li><span style="color:' + JC[k] + '">' + JN[k] + '</span><b>' + G.cnt[k] + '</b></li>').join('');
  $('#res-skills').innerHTML = G.sk.map((st) => (
    '<li style="--h:' + st.u.hue + '"><img src="' + st.u.art + '" alt=""><span>' + esc(st.u.n)
    + '「' + esc(st.u.skill.n) + '」</span><b>' + st.fires + ' 次</b></li>'
  )).join('');
  show('result');
  renderBest();
}

/* ================================================================ 选曲 */
function trackInfo(songId) {
  return SAVE.tracks[songId] || null;
}
function allSongs() { return SONGS.concat(SHOP ? SHOP.songs() : []); }
// 曲目按来源分组（sub 里 `·` 前面那截：μ's / 国风原创 / 剑网3 / 明日方舟 / 边狱巴士 / 鸣潮 / 自制）
function songGroup(s) {
  if (s.custom) return '自制';
  return String(s.sub || '').split('·')[0].trim() || '其它';
}
let songTab = 'all';
function renderSongs() {
  const box = $('#song-list');
  const all = allSongs();
  const groups = [];
  for (const s of all) {
    const g = songGroup(s);
    if (groups.indexOf(g) < 0) groups.push(g);
  }
  if (songTab !== 'all' && groups.indexOf(songTab) < 0) songTab = 'all';
  const tabs = $('#src-tabs');
  if (tabs) {
    tabs.textContent = '';
    for (const g of ['全部'].concat(groups)) {
      const key = g === '全部' ? 'all' : g;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab' + (key === songTab ? ' on' : '');
      b.dataset.g = key;
      b.textContent = g === '全部' ? ('全部 ' + all.length) : g;
      tabs.appendChild(b);
    }
    tabs.onclick = (e) => {
      const b = e.target.closest('button.tab');
      if (!b || b.dataset.g === songTab) return;
      songTab = b.dataset.g;
      renderSongs();
    };
  }
  box.textContent = '';
  for (const s of all) {
    if (songTab !== 'all' && songGroup(s) !== songTab) continue;
    if (s.custom) {
      const card = document.createElement('article');
      card.className = 'song mine';
      card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
        + '<span class="bpm">' + (s.count || 0) + ' 音符</span></div>'
        + '<div class="src on">♪ 自制谱面 · ' + mmss(s.dur) + '（本机音频）</div>'
        + '<div class="dfs"><button type="button" class="df" data-s="' + s.id + '" data-d="normal">'
        + '<b>PLAY</b><span>' + mmss(s.dur) + '</span></button></div>';
      box.appendChild(card);
      continue;
    }
    const t = trackInfo(s.id);
    const pk = hasPack(PACKS, s.id);
    const card = document.createElement('article');
    card.className = 'song';
    const diffs = DIFFS.map((d) => {
      const b = Number(SAVE.best[bestKey(s.id, d.k)]) || 0;
      return '<button type="button" class="df' + (d.k === G.diffK ? ' on' : '') + '" data-s="' + s.id + '" data-d="' + d.k + '">'
        + '<b>' + d.n + '</b><span>' + (b ? fmt(b) : '·—·') + '</span></button>';
    }).join('');
    card.innerHTML = '<div class="sh"><h3>' + esc(s.n) + '</h3><span class="by">' + esc(s.sub) + '</span>'
      + '<span class="bpm">' + s.bpm + ' BPM</span></div>'
      + '<div class="src' + ((t || pk) ? ' on' : '') + '">' + (t
        ? '♪ 原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
        : pk ? '♪ 原曲包（仓库内置 · 加密）'
          : '♪ 芯片改编（页面内合成）') + '</div>'
      + '<div class="dfs">' + diffs + '</div>';
    box.appendChild(card);
  }
  box.onclick = (e) => {
    const b = e.target.closest('button.df');
    if (!b) return;
    G.diffK = b.dataset.d;
    G.song = allSongs().find((x) => x.id === b.dataset.s);
    openTeam();
  };
}

/* ================================================================ 编队（九人） */
let teamSel = [];
function openTeam() {
  teamSel = team().slice(0, TEAM_MAX);
  $('#team-song').textContent = G.song ? (G.song.n + ' · ' + diffOf(G.diffK).n) : '';
  renderTeam();
  show('team');
}
function renderTeam() {
  const grid = $('#unit-grid');
  grid.textContent = '';
  for (const u of UNITS) {
    const idx = teamSel.indexOf(u.id);
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'unit' + (idx >= 0 ? ' on' : '');
    el.style.setProperty('--h', u.hue);
    const ps = (u.pass && u.pass.score) ? ('得分 +' + Math.round(u.pass.score * 100) + '%')
      : (u.pass && u.pass.judge) ? ('判定 +' + Math.round(u.pass.judge * 100) + '%') : '—';
    el.innerHTML = '<span class="uimg"><img src="' + u.art + '" alt="" loading="lazy"></span>'
      + '<b>' + esc(u.n) + '</b>'
      + (idx >= 0 ? '<i class="ord">' + (idx + 1) + '</i>' : '')
      + '<span class="sk"><em>自动</em>' + esc(u.skill.n) + '</span>'
      + '<span class="stxt">' + esc(u.skill.txt) + '</span>'
      + '<span class="pas">' + esc(ps) + '</span>';
    el.onclick = () => {
      const i = teamSel.indexOf(u.id);
      if (i >= 0) teamSel.splice(i, 1);
      else if (teamSel.length >= TEAM_MAX) return flash('#team-tip', '九格已经满了，先取消一位');
      else teamSel.push(u.id);
      SAVE.team = teamSel.slice();
      persist();
      renderTeam();
    };
    grid.appendChild(el);
  }
  const box = $('#team-pick');
  let html = '';
  for (let i = 0; i < TEAM_MAX; i++) {
    const id = teamSel[i];
    if (id) {
      const u = unitById(id);
      html += '<span class="pick" style="--h:' + u.hue + '" title="' + esc(u.n) + '"><img src="' + u.art + '" alt="">'
        + '<em>' + KEY_LABEL[i] + '</em></span>';
    } else {
      html += '<span class="pick empty"><em>' + KEY_LABEL[i] + '</em></span>';
    }
  }
  box.innerHTML = html;
}

/* ================================================================ 设置 */
// 九格键位面板：点一格 → 变成「按键…」→ 下一颗按下的键绑上去。
// 撞到已经绑在别的格上的键就对调（不然那一格永远打不到）。
// 这栏只对电脑有意义，手机上点的是屏幕。
function paintKeymap() {
  const box = $('#set-keymap');
  if (!box) return;
  if (!box.children.length) {
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kmk';
      b.dataset.lane = String(i);
      b.innerHTML = '<b></b><span>' + (i + 1) + '</span>';
      b.title = '第 ' + (i + 1) + ' 格：点一下再按键盘上想用的键';
      b.onclick = () => {
        REMAP = REMAP === i ? -1 : i;
        b.blur();                 // 不然接着按空格会当成「又点了一次这个按钮」
        paintKeymap();
      };
      box.appendChild(b);
    }
  }
  for (let i = 0; i < box.children.length; i++) {
    const b = box.children[i];
    b.querySelector('b').textContent = REMAP === i ? '按键…' : KEY_LABEL[i];
    b.classList.toggle('wait', REMAP === i);
    b.classList.toggle('mid', i === 4);
  }
}
// 改键时把这一下按键吃掉：不算击打、不滚页面、不激活按钮
function captureRemap(e) {
  if (REMAP < 0) return false;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === 'Escape') { REMAP = -1; paintKeymap(); flash('#set-status', '没改，保持原样'); return true; }
  const id = keyIdOf(e);
  if (!id) return true;                       // Shift / F5 / 输入法候选键：继续等着
  const lane = REMAP;
  const next = KEYS.slice();
  const dup = next.indexOf(id);
  if (dup >= 0 && dup !== lane) next[dup] = next[lane];   // 两格撞键 → 对调
  next[lane] = id;
  REMAP = -1;
  applyKeymap(next, true);
  flash('#set-status', '第 ' + (lane + 1) + ' 格改成「' + keyLabel(id) + '」');
  return true;
}

function paintSet() {
  $('#set-offset').value = String(SAVE.offset);
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  $('#set-mus').value = String(Math.round(SAVE.musVol * 100));
  $('#set-fx').value = String(Math.round(SAVE.fxVol * 100));
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  $('#set-flow').value = String(SAVE.flow);
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  $$('#set-win button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === SAVE.winMul));
  $$('#set-keys button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.keys));
  $$('#set-haptic button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.haptic));
  $$('#set-orient button').forEach((b) => b.classList.toggle('on', b.dataset.v === orientPref()));
  $$('#set-immersive button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.immersive));
  $$('#set-listen button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.listen));
  $$('#set-autolat button').forEach((b) => b.classList.toggle('on', (b.dataset.v === '1') === !!SAVE.autoLat));
  paintKeymap();
  renderTrackList();
}
function renderTrackList() {
  const box = $('#set-tracks');
  box.innerHTML = '';
  for (const s of SONGS) {
    const t = trackInfo(s.id);
    const pk = hasPack(PACKS, s.id);
    const row = document.createElement('div');
    row.className = 'trk' + ((t || pk) ? ' on' : '');
    row.innerHTML = '<div class="ti"><b>' + esc(s.n) + '</b><span>' + (t
      ? '本机原曲 · ' + esc(t.name) + ' · ' + mmss(t.dur)
      : pk ? '原曲包（仓库内置 · 加密）'
        : '芯片改编 · ' + mmss(arrange(s).dur)) + '</span></div>'
      + '<div class="ta">' + (t ? '<button type="button" data-clear="' + s.id + '">清除</button>' : '')
      + '<button type="button" data-pick="' + s.id + '">' + (t ? '换一个' : '导入原曲') + '</button></div>';
    box.appendChild(row);
  }
}
async function importTrack(songId, file) {
  const status = $('#set-status');
  status.textContent = '正在读取「' + file.name + '」…';
  status.classList.remove('err');
  try {
    const raw = await file.arrayBuffer();
    const ac = Audio.ensure();
    if (!ac) throw new Error('这个浏览器没有 WebAudio，放不了原曲');
    status.textContent = '正在解码…（大文件要等几秒）';
    await new Promise((r) => setTimeout(r, 30));
    const buffer = await Audio.decode(raw.slice(0));
    status.textContent = '正在抓鼓点…（' + mmss(buffer.duration) + '）';
    await new Promise((r) => setTimeout(r, 30));
    const onsets = detectOnsets(buffer);
    const flat = packOnsets(onsets);
    await idbSet(songId, { name: file.name, data: raw, onsets: flat, dur: buffer.duration });
    TRACK_CACHE.set(songId, { buffer, onsets, name: file.name, dur: buffer.duration });
    SAVE.tracks[songId] = { name: file.name, dur: buffer.duration, notes: onsets.length };
    persist();
    status.textContent = '好了：' + mmss(buffer.duration) + '，抓到 ' + onsets.length + ' 个重音。谱面会跟着这一版走。';
    renderTrackList();
    renderSongs();
  } catch (e) {
    status.textContent = '没成功：' + (e && e.message ? e.message : '这个文件解不开（换个 mp3 / m4a 试试）');
    status.classList.add('err');
  }
}

/* ================================================================ 首屏 */
function renderBest() {
  let played = 0, bestScore = 0;
  for (const k of Object.keys(SAVE.best)) {
    played++;
    bestScore = Math.max(bestScore, Number(SAVE.best[k]) || 0);
  }
  $('#title-best').textContent = played
    ? '玩过 ' + played + ' 张谱 · 最高分 ' + fmt(bestScore) + ' · 最长连击 ' + fmt(SAVE.bestCombo)
    : '还没玩过——选首歌，带上九位唤醒体试试？';
  const n = Object.keys(SAVE.tracks).length;
  const p = Object.keys(PACKS || {}).length;
  const bits = [];
  if (p) bits.push('曲库原曲包 ' + p + ' 首');
  if (n) bits.push('本机导入 ' + n + ' 首');
  $('#title-src').textContent = bits.length ? ('音源：' + bits.join(' · ')) : '音源：芯片改编（可在设置里导入原曲）';
}

/* ================================================================ 接线 */
$('#btn-play').onclick = () => { renderSongs(); show('songs'); };
$('#btn-team').onclick = () => { G.song = G.song || SONGS[0]; openTeam(); };
$('#btn-set').onclick = () => { paintSet(); show('set'); };
$('#btn-shop').onclick = () => SHOP.openShop();
$('#songs-shop').onclick = () => SHOP.openShop();
$('#btn-help').onclick = () => {
  const d = $('#helpDlg');
  if (d.showModal) d.showModal(); else d.setAttribute('open', '');
};
$('#songs-back').onclick = () => { show('title'); renderBest(); };
$('#songs-set').onclick = () => { paintSet(); show('set'); };
$('#team-back').onclick = () => { renderSongs(); show('songs'); };
$('#set-back').onclick = () => { show('title'); renderBest(); };
$('#team-go').onclick = () => {
  if (!teamSel.length) return flash('#team-tip', '至少带一位上场');
  if (teamSel.length !== TEAM_MAX) flash('#team-tip', '九格没满也能打，但空着的格子没人接');
  startLive();
};
$('#live-pause').onclick = () => togglePause();
$('#pause-resume').onclick = () => togglePause();
$('#pause-retry').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; Audio.resume();
  G.running = false; G.over = true; Audio.stop();
  startLive();
};
// 局内音量：拖一下就立刻生效，不用等继续
$('#pause-mus').oninput = (e) => {
  SAVE.musVol = (Number(e.target.value) || 0) / 100;
  $('#pause-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  Audio.setVol(SAVE.musVol, null);
  $('#set-mus').value = String(Math.round(SAVE.musVol * 100));
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  persist();
};
$('#pause-fx').oninput = (e) => {
  SAVE.fxVol = (Number(e.target.value) || 0) / 100;
  $('#pause-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  Audio.setVol(null, SAVE.fxVol);
  $('#set-fx').value = String(Math.round(SAVE.fxVol * 100));
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  persist();
};
$$('#pause-orient button').forEach((b) => { b.onclick = () => setOrient(b.dataset.v); });
// 听歌模式：局内切换立刻生效（打开就把体力补满，关掉继续正常打）
$$('#pause-listen button').forEach((b) => {
  b.onclick = () => {
    const on = b.dataset.v === '1';
    G.listen = on;
    SAVE.listen = on ? 1 : 0;
    if (on) { G.stamina = 100; G.banner = { txt: '听歌模式：自动最低判定，不会掉血', until: chartTime() + 1.6, hue: 200 }; }
    persist();
    paintDiffText();
    paintPause();
  };
});
$('#pause-quit').onclick = () => {
  G.paused = false; $('#pauseDlg').hidden = true; G.running = false; G.over = true; Audio.stop();
  renderSongs(); show('songs');
};
$('#res-retry').onclick = () => startLive();
$('#res-songs').onclick = () => { renderSongs(); show('songs'); };
$('#res-home').onclick = () => { show('title'); renderBest(); };
$('#mute').onclick = () => {
  SAVE.mute = SAVE.mute ? 0 : 1;
  persist();
  Audio.setMute(!!SAVE.mute);
  $('#mute').classList.toggle('off', !!SAVE.mute);
};
$('#mute').classList.toggle('off', !!SAVE.mute);

// 返回小游戏主页：页面外的链接，走了就整页换掉——先把声音停干净再走
const homeEl = $('#to-home');
if (homeEl) homeEl.onclick = () => {
  try { Audio.stop(); } catch (e) { /* 走就完了 */ }
};

// 设置项
$('#set-offset').oninput = (e) => {
  SAVE.offset = Number(e.target.value) || 0;
  $('#set-offset-v').textContent = (SAVE.offset > 0 ? '+' : '') + SAVE.offset + ' ms';
  // 手动拖了滑块就说明「我知道我在调什么」，把自动校准让位给它，不然下一局又被拉走
  if (SAVE.autoLat) {
    SAVE.autoLat = 0;
    $$('#set-autolat button').forEach((b) => b.classList.toggle('on', b.dataset.v === '0'));
  }
  persist();
};
$$('#set-autolat button').forEach((b) => {
  b.onclick = () => {
    SAVE.autoLat = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-autolat button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-win button').forEach((b) => {
  b.onclick = () => {
    SAVE.winMul = Number(b.dataset.v) || 1;
    persist();
    $$('#set-win button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-orient button').forEach((b) => { b.onclick = () => setOrient(b.dataset.v); });
$$('#set-immersive button').forEach((b) => {
  b.onclick = () => {
    SAVE.immersive = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-immersive button').forEach((x) => x.classList.toggle('on', x === b));
    // 当场生效：开就进全屏（这一下是用户点的，还在手势里），关就退出
    if (SAVE.immersive) enterImmersive(); else exitImmersive();
  };
});
$$('#set-listen button').forEach((b) => {
  b.onclick = () => {
    SAVE.listen = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-listen button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$$('#set-keys button').forEach((b) => {
  b.onclick = () => {
    SAVE.keys = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-keys button').forEach((x) => x.classList.toggle('on', x === b));
  };
});
$('#set-km-reset').onclick = () => {
  REMAP = -1;
  applyKeymap(DEFAULT_KEYS.slice(), true);
  flash('#set-status', '按键恢复默认（中间是空格）');
};
$$('#set-haptic button').forEach((b) => {
  b.onclick = () => {
    SAVE.haptic = b.dataset.v === '1' ? 1 : 0;
    persist();
    $$('#set-haptic button').forEach((x) => x.classList.toggle('on', x === b));
    if (SAVE.haptic && navigator.vibrate) { try { navigator.vibrate(30); } catch (e) { /* noop */ } }
  };
});
$('#set-flow').oninput = (e) => {
  SAVE.flow = Number(e.target.value) || 1;
  $('#set-flow-v').textContent = '×' + SAVE.flow.toFixed(1);
  persist();
};
$('#set-mus').oninput = (e) => {
  SAVE.musVol = (Number(e.target.value) || 0) / 100;
  $('#set-mus-v').textContent = Math.round(SAVE.musVol * 100) + '%';
  Audio.setVol(SAVE.musVol, null);
  persist();
};
$('#set-fx').oninput = (e) => {
  SAVE.fxVol = (Number(e.target.value) || 0) / 100;
  $('#set-fx-v').textContent = Math.round(SAVE.fxVol * 100) + '%';
  Audio.setVol(null, SAVE.fxVol);
  persist();
  Audio.fx('p');
};
let pendingSong = null;
$('#set-file').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f || !pendingSong) return;
  importTrack(pendingSong, f);
  e.target.value = '';
});
$('#set-tracks').onclick = (e) => {
  const pick = e.target.closest('[data-pick]');
  const clr = e.target.closest('[data-clear]');
  if (pick) {
    pendingSong = pick.dataset.pick;
    const inp = $('#set-file');
    inp.accept = 'audio/*';
    inp.click();
    return;
  }
  if (clr) {
    const id = clr.dataset.clear;
    idbDel(id).catch(() => {});
    TRACK_CACHE.delete(id);
    delete SAVE.tracks[id];
    persist();
    $('#set-status').textContent = '已清除，这首歌回到芯片改编。';
    renderTrackList();
    renderSongs();
  }
};

/* ================================================================ 测试钩子 */
if (TEST) {
  window.__ll = {
    G, SAVE, UNITS, SONGS, DIFFS, LAY, KEYS, startLive, finish, buildChart, show,
    renderSongs, openTeam, renderTeam, paintSet, importTrack, prepareTrack,
    srcLine, paintPause, LAY, size: () => ({ W, H, DPR }),
    tapLane, tapNear, notePos, leadEff, windows, judgeBy, chartTime, sampleLat, autoTune,
    setDiff: (k) => { G.diffK = k; },
    pickSong: (id) => { G.song = SONGS.find((x) => x.id === id) || SONGS[0]; },
    setTeam: (ids) => { SAVE.team = ids.slice(0, TEAM_MAX); persist(); },
    pickTrackFile: (id) => { pendingSong = id; },
    audio: Audio,
    shop: SHOP,
    PACKS,
    showArt, allSongs, fireSkill, initSkills, preloadArt,
    setSetting: (k, v) => { SAVE[k] = v; persist(); },
    keymap: () => KEYS.slice(),
    setKeymap: (a) => applyKeymap(a, true),
    remapLane: (i) => { REMAP = i; paintKeymap(); },
    keyIdOf,
  };
}

/* ================================================================ 工坊 */
// 工坊要碰的东西不少（存储、对局、选曲列表），这里一次注入，避免两个模块互相 import 打架
var SHOP = initShop({
  G, SAVE, persist, Audio, show, renderSongs, startLive, $, $$,
  KEYS, fmt, mmss, diffOf, chartFromOnsets, detectOnsets, packOnsets,
  idbGet, idbSet, idbDel, idbCGet, idbCSet, idbCDel,
});

// 测试钩子是在这个 var 之前定义的，那时 SHOP 还不是对象，这里补挂一次
if (TEST && window.__ll) window.__ll.shop = SHOP;

/* ================================================================ 启动 */
renderBest();
Audio.setMute(!!SAVE.mute);
Audio.setVol(SAVE.musVol, SAVE.fxVol);
startGameCloud('lovelive');
fit();
applyKeymap(SAVE.keymap);      // 键位要在排版之后套：框下面那行字是画进静态层的
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

