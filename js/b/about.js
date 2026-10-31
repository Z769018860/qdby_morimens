(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/i18n.js
const m_i18n = await (async () => {

// UI 文案双语字典（战报侦探）
// 与 data/*.json 里条目的 en/zh 字段配合，实现中英文切换。
const I18N = {
  zh: {
    brand: '战报侦探',
    brandSub: '忘却前夜 · 同人推理',
    footNote: '同人作品，与官方无关。',
    navHome: '返回项目列表',
    navGame: '推理',
    navGallery: '典藏馆',
    navWorkshop: '工坊',
    navCodex: '图鉴',
    navAbout: '说明',
    loading: '载入中…',
    loadFail: '题目加载失败，检查网络后重试',
    retry: '重试',
    // 难度档
    lv1: '入门', lv2: '进阶', lv3: '老手', lv4: '大师',
    lv1d: '只猜 4 名唤醒体', lv2d: '+ 命轮', lv3d: '+ 密契、钥令', lv4d: '+ 潜能进阶、造物',
    daily: '每日一题', random: '随机一题',
    played: '已玩', won: '胜', streak: '连胜', best: '最佳',
    // 战报
    reportTitle: '融灾战报', season: '第 {s} 期',
    zone: '区域 {z}', threat: '危险等级 {t}', madness: '疯狂度 {m}', diffStar: '难度 {d}', extra: '含额外通关',
    diffScore: '难度分 {s}', diffWhy: '难度构成', diffInfo: '信息排除度', diffSpread: '伤害集中度', diffPeel: '数值常见度',
    bossLabel: '区域 Boss', bossSkills: '区域 Boss 技能（推理线索）',
    rounds: '回合数', bossRounds: 'Boss 战 {n}', cards: '出牌数', energy: '能量 {n}',
    mlLevel: '推荐等级 {n}', keysUsed: '钥令开启',
    maxBout: '单回合最高伤害', deathResist: '死扛触发', leftHp: '剩余生命', keyDmg: '守密人伤害',
    score: '榜单分数', relicCount: '造物数量', relicAll: '需要全部还原',
    relicInnate: '含固有 {n} 件（名字要用线索买）', innateTag: '固有造物', clueInnate: '固有造物', relicFillTag: '需补齐',
    dmg: '伤害', blk: '格挡', heal: '治疗',
    cardUp: '卡牌升级 {n} 次', talentSum: '天赋合计 Lv.{n}',
    // 伤害构成
    dmgCompTitle: '伤害构成（守密人 & 特殊来源）',
    keeper: '守密人伤害', tentacle: '触腕伤害', counter: '反击伤害', strength: '力量峰值', poison: '侵蚀/中毒',
    // 养成线索（替代晦涩的 up/tal）
    investTitle: '养成线索',
    cardLv: '指令卡总等级', madnessLv: '疯狂预兆', potLv: '灵塑',
    // 排序说明
    sortNote: '已按队内伤害从高到低排序：A 是伤害最高者。队伍成员以匿名 A–D 呈现，顺序即答案顺序。',
    // 还原面板
    boardTitle: '还原队伍', boardLevel: '{l}档',
    submit: '提交推理', submitLeft: '（剩余 {n} 次）', reset: '重置选择',
    clearWrong: '清除选错的角色', clearDone: '清掉了 {n} 个不在队内的角色', clearNone: '还没有能判断对错的角色',
    swapPick: '已选中 {l} 位，再点另一个卡位就能换过去；再点自己一次是改选',
    swapDone: '{a} 位 ↔ {b} 位已互换', swapHint: '交换中：点另一个卡位互换，点自己可改选',
    pickAwakener: '选择唤醒体', pickWheel: '选择命轮', pickCovenant: '选择密契', pickKey: '选择钥令', pickCreation: '选择造物',
    searchName: '搜索名称（中/英）', allRealm: '全部阵营', allRole: '全部定位', allRarity: '全部稀有度', allType: '全部类型',
    allKw: '全部关键词', clear: '清空', close: '关闭', done: '完成', add: '添加', noMatch: '没有匹配项',
    decoy: '未上榜',
    hintRealm: '提示阵营', hintRole: '提示定位', hintLv: '提示等级', hintKey: '钥令阵营',
    acctTag: '账号', guestTag2: '', lvTag: '等级', brkTag: '内在灵格',
    clueTitle: '线索台', clueNote: '花银芯解锁，本局内一直有效',
    clueBrk: '内在灵格', cluePot: '灵塑等级',
    cluePotTeam: '潜能（灵塑）汇总', cluePotSum: '合计 {n}',
    // 开局线索：除入门外的三档白送几条最贵的
    giftTag: '赠送', giftToast: '本档开局赠送 {n} 条线索', clueGiftOn: '已赠送 {n} 条',
    loadMore: '加载更多',
    clueBuild: '养成（指令卡 / 疯狂预兆）', clueAssist: '助战',
    clueAssistN: '没有借用助战', clueAssistY: '借用了 {n} 位助战',
    cluePeak: '单回合极值 / 守密人', cluePeakCard: '最高出牌 {n}', cluePeakEnergy: '最高耗能 {n}',
    cluePeakLv: '守密人 Lv.{n}',
    clueWheelOne: '命轮线索 {n}', clueCovOne: '密契线索 {n}',
    clueWheelSeen: '命轮', clueCovSeen: '密契',
    clueRelTitle: '造物 · 按功能',
    clueRelOut: '造物 · 输出（伤害 / 力量 / 暴击）', clueRelDraw: '造物 · 抽牌',
    clueRelRage: '造物 · 狂气', clueRelCost: '造物 · 算力与消耗', clueRelGuard: '造物 · 防御续航',
    clueRelGold: '造物 · 金色（SSR）件数', clueRelBase: '造物 · 含基础伤害加成',
    clueRelHeal: '造物 · 含治疗 / 回复',
    clueRelGoldMin: '{n} 件（另有 {m} 件稀有度未知）',
    clueRelN: '{n} 件', clueRelNone: '没有',
    clueDeckTitle: '牌组', clueDeckSize: '牌组张数',
    clueDeckCur: '症状卡', clueDeckExt: '衍生卡', clueDeckWhl: '命轮附加卡',
    clueDeckN: '{n} 张',
    clueStepNote: '越往后越贵', clueWheelMax: '最高强化 +{n}', clueWheelHi: '{n} 件 ≥+12',
    clueWheelUp: '命轮强化', clueMul: '本档价格 ×{m}',
    clueBuildCard: '养成（指令卡）', clueBuildOmen: '养成（疯狂预兆）',
    // 反馈
    fillAll: '先选满 4 名唤醒体', noDup: '唤醒体不能重复',
    // 历史
    histTitle: '推理记录', histEmpty: '还没有提交。绿色=正确，黄色=在队内但位置/归属不对，灰色=不在队内。',
    // 结果
    winTitle: '还原成功', loseTitle: '推理失败', grade: '评级 {g}',
    scoreText: '得分 {s}（提示 {h} 次，提交 {n} 次）',
    slotHead: '{l} 位', lv: 'Lv.{n}', potFull: '潜能 {n}', brk: '内在灵格 {n}',
    keyLabel: '钥令', relicLabel: '造物',
    copy: '复制战绩', again: '再来一题',
    copied: '已复制',
    // 登录 / 统计
    loginTitle: '登录 / 档案', nickname: '昵称', login: '登录', logout: '退出',
    nicknamePh: '输入昵称（本地保存）',
    guestTag: '游客（本机存档）', loginRegister: '登录 / 注册', pfGuestData: '本机存档',
    guestShort: '游客',
    statsTitle: '我的战绩', accuracy: '总体准确率', totalPlayed: '累计已玩', totalWon: '累计胜场',
    favTitle: '喜好干员', favHint: '点选你喜欢的唤醒体（用于个性化）',
    // 配队规则（圈外人也能玩）
    teamRuleTitle: '忘却前夜配队规则（给圈外人）',
    // 提示
    noSkills: '暂无技能数据',
    // 关于
    aboutFoot: '同人作品，与官方无关。素材版权归原权利人所有；战报数据来自公开榜单，玩家信息已匿名。',
    // 银芯
    credits: '银芯', creditsTip: '银芯：答对按难度获得，用于购买提示与解锁典藏馆 CG',
    hintCost: '提示 · {n} 分',
    noCredits: '银芯不足，答对题目可赚取银芯',
    ptsGain: '获得 {n} 银芯', ptsHint: '−{n} 银芯', ptsRefund: '旧线索退回 {n} 银芯',
    ckTitle: '每日签到', ckBtn: '签到', ckDone: '今日已签到', ckStreak: '连续 {n} 天',
    ckTomorrow: '明天再来', ckNote: '每天可签一次，得 10 银芯；连着签天数会累加', ckGain: '签到成功，+{n} 银芯',
    pfGrant: '收到赠礼，+{n} 银芯',
    acctMigrated: '账号档案已搬到新后端',
    // 失败题库
    failedTitle: '失败题库', failedMark: '已入失败题库',
    failedNote: '这些题目已用完 {n} 次机会，不会再出现；可以在这里查看答案与回放。',
    failedEmpty: '还没有彻底失败的题目。',
    // 回放
    replayTitle: '回放复盘', replayApi: '官方回放数据',
    replayReview: '去忘忘看报复盘', replayCopy: '复制 battleUuid',
    replayHint: '打开复盘页后粘贴 battleUuid，可看逐回合时间轴与伤害归因。',
    // 典藏馆
    galleryTitle: 'CG 典藏馆', gallerySub: '灰机 wiki 收录的官方 CG；用银芯解锁后可放大观看。',
    galleryAll: '全部', galleryUnlock: '用 {n} 银芯解锁', galleryUnlocked: '已解锁',
    gallerySearch: '搜索标题 / 文件名', galleryClear: '清除筛选',
    galleryProgress: '已解锁 {a}/{b}', galleryOriginal: '查看原图', galleryEmpty: '这一组还没有 CG',
    galleryLockNote: '未解锁的 CG 以模糊预览显示，解锁后高清呈现。',
    // 工坊
    workshopTitle: '创意工坊', workshopSub: '导入战斗回放就能出一道自己的题，分享给好友挑战。',
    wsImport: '导入回放', wsUuid: '回放 battleUuid（或回放码 UUID#E#a）', wsParse: '解析并生成',
    wsJson: '或粘贴战报 JSON（战报摘要 / 队伍记录）', wsBuild: '生成题目',
    wsManual: '手动出题', wsMine: '我的题目', wsCloud: '云题库',
    wsShare: '复制题目代码', wsPlay: '自己做一遍', wsDel: '删除',
    wsUpload: '上传到云题库', wsCloudLoad: '用云端编码载入', wsLoad: '载入',
    wsNeedUuid: '请先填 battleUuid', wsParsing: '正在解析回放…',
    wsParseFail: '解析失败：请检查 UUID，或改用粘贴战报 JSON',
    wsSaved: '已保存到我的题目', wsCodeCopied: '题目代码已复制',
    wsCodePh: '粘贴题目代码 ZJ2-...', wsImportCode: '导入代码',
    wsCloudId: '云端编码', wsCloudUploaded: '已上传，编码：{id}',
    wsBank: '本站题库', wsBankNote: '别人上传的题，直接载入或试玩。',
    wsBankEmpty: '还没有人上传题目。', wsBankOff: '后端未配置，暂时只能用自己的分享码。',
    // 配队 / 造物编辑
    wsTeamRealm: '当前界域：{r}',
    wsTeamNoRealm: '还没选唤醒体',
    wsRealmRule: '配队规则：混沌以外只能有一种界域，冲突的唤醒体选不了。',
    wsRealmAnchor: '队内已有「{r}」，只能再选「{r}」或「混沌」的唤醒体。',
    wsRealmBlocked: '与队内 {r} 冲突',
    wsRealmUsed: '这个卡位已经选过',
    wsRelicOrderNote: '造物顺序不影响判分：随便加、随便删，判分按「有没有这几件」比。',
    wsBankAnon: '匿名', wsBankOpen: '载入',
    wsCloudFail: '上传失败（网络或服务限制）', wsNoMine: '还没有自建题目。',
    wsFile: '选回放 JSON 文件', wsOpenReplay: '打开官方回放',
    wsHintTitle: '自定义线索', wsHintNone: '还没有自定义线索。',
    wsHintNote: '自己写标题和内容，玩家在线索台按你定的价买；最多 {max} 条，价格不打难度折扣',
    wsHintLabelPh: '线索标题（玩家先看到这个）',
    wsHintTextPh: '线索内容，比如「这一局只有 A 位打出过这张牌」',
    wsHintCostTip: '价格（银芯，1–40）', wsHintFull: '最多 {n} 条', wsHintDefault: '线索 {n}',
    wsHintColN: '标题', wsHintColV: '内容', wsHintColC: '价格',
    clueAuthorTitle: '作者线索', clueAuthorOne: '作者线索 {n}', clueAuthorNote: '出题人自己写的',
    likeBtn: '点赞', likeDone: '已点赞',
    likeLeft: '今天还能点 {n} 次', likeZero: '今天的 {n} 次点赞用完了',
    likeThanks: '谢啦，今天还能点 {n} 次',
    likeSelf: '这是你自己出的题，别人点的赞才换银芯',
    likeSelfFail: '不能给自己的题点赞',
    likeQueue: '{n} 个赞排队发送中',
    likeCloudOff: '云端存储还在开通中，这个赞先记在本机了',
    likeCloudNote: '云端存储开通中，赞暂时只记在本机',
    likeGain: '收到 {n} 个新赞，+{n} 银芯',
    likeTotal: '共获赞 {n}', likeTip: '每被一个人点赞，作者得 1 银芯；每人每天最多 {n} 个赞',
    wsUuidLabel: '回放码（battleUuid）', wsLoadByCode: '按回放码载入',
    wsCodeMiss: '题库里没有这条回放：只能从回放文件解析（命轮/造物/钥令准确，密契需手选）',
    thmSet: '设为背景', thmUsing: '背景使用中', thmOn: '取消背景',
    thmApplied: '已把「{n}」设为全站背景主题', thmCleared: '已恢复默认背景',
    thmLocked: '先解锁这张 CG 才能设为背景', thmFail: '主题应用失败',
    thmCurrent: '背景：{n}', thmBadge: '背景中',
    galleryJustUnlocked: '已解锁「{n}」，点卡片上的「设为背景」就能把它铺到全站',
    myCenter: '个人中心', login: '登录',
    pfTitle: '个人中心', pfSub: '账号、头像与推理战绩。',
    pfGuestTitle: '登录后保存你的战绩', pfGuestSub: '用用户名 + 密码注册，账号存在 Waline 数据库里；本地银芯与解锁记录仍保存在这台设备。',
    pfLoginBtn: '登录 / 注册', pfJoined: '加入于', pfNoName: '未命名守密人', pfNamePh: '给自己起个名字',
    pfStoreNote: '账号与头像存在云端，银芯/解锁/失败题库存在本机浏览器。',
    pfPlayed: '已答题', pfWinRate: '正确率', pfUnlockedCg: '解锁 CG', pfFailed: '失败题库',
    pfEdit: '资料与头像', pfNick: '昵称', pfNickNote: '只影响显示；登录名才唯一，改名不会改登录名', pfAvatarUrl: '或填入图片直链（≤250 字符）',
    pfAvatarNote: '头像取自 Waline 的 Q 版头像集，也可以贴自己的图片地址。',
    pfAvatarPick: 'Q 版头像', pfAvatarAll: '全部（{n}）', pfAvatarN: '共 {n} 张', pfSaved: '已保存', pfSaveFail: '保存失败', pfLogout: '退出登录', pfLoggedOut: '已退出登录',
    pfGuestNote: '游客模式：银芯、解锁、记录都只存在这台设备；注册后会自动上传到云端。',
    pfSyncNote: '已登录：银芯 / 典藏解锁 / 推理记录 / 工坊战报随账号同步。',
    pfAccNote: '换设备登录同一个账号，银芯、解锁、推理记录与工坊战报都会自动恢复。',
    pfLastSync: '上次同步 {t}', pfSyncNever: '还没同步过',
    pfFavTitle: '偏好唤醒体', pfFavPicked: '已选', pfFavNone: '未选择', pfFavGo: '去设置',
    pfFavNote: '选中的唤醒体存进账号，作为你的喜好收藏；不影响出题难度。',
    pfFavSave: '保存偏好', pfFavClear: '全不选', pfFavSaved: '偏好已保存',
    pfHistTitle: '推理记录', pfHistNote: '每一局（每日 / 随机 / 自建 / 工坊导入）都会记录，最多保留 {n} 条。',
    pfHistEmpty: '还没有记录，先去推理一局。',
    pfModeDaily: '每日', pfModeRandom: '随机', pfModeCustom: '工坊',
    pfWinTag: '胜', pfLoseTag: '负', lvShort: '{n} 档',
    pfImpTitle: '工坊战报', pfImpNote: '从回放导入或自己出的题都会存进账号，可直接复现或看官方回放。',
    pfImpEmpty: '还没有导入战报。', pfImpTeam: '名唤醒体', pfImpPlay: '复现', pfImpReplay: '官方回放', pfImpDel: '删除',
    pfCgTitle: '典藏进度', pfCgNote: '已解锁 {a} / {b} 张，解锁后可在典藏馆设为背景主题。',
    pfMiniTitle: '同人小游戏',
    pfMiniNote: '两个小游戏的纪录都记在账号档案里，换设备登录也能接上。',
    pfMiniBest: '最高 {n} 分', pfMiniBird: '最深 {n} 层', pfMiniNone: '还没玩过', pfMiniGo: '去玩一局',
    pfSyncTitle: '存档与同步', pfSyncNow: '立即同步', pfSyncing: '同步中…', pfSyncOk: '已同步', pfSyncFail: '同步失败',
    poolNote: '题池 {n} 题', poolDiff: '难度 {a}–{b} 档',
    pfLocal: '本地存档', pfLocalNote: '银芯、已解锁 CG、失败题库、自建题目都只存在这台设备的浏览器里，清空后无法恢复。',
    pfClear: '清空本地存档', pfClearAsk: '清空后银芯、解锁、失败题库、自建题全部丢失，且无法恢复。确定继续？', pfCleared: '本地存档已清空',
    wsReplayExact: '已按回放码载入完整队伍：命轮、密契、造物、钥令全部来自题库答案',
    wsReplayNote: '回放已解析：队伍/钥令/造物已填好；命轮与密契不在回放里，请手动补；数值为回放口径，可微调。',
    wsNote: '回放解析在浏览器内完成；若解析器不可用，可直接粘贴战报数据或手动出题。',
    wsCloudCfg: '云题库设置', wsCloudBusy: '正在上传…',
    wsCloudCfgUrl: '自建端点（可选）',
    wsCloudCfgNote: '本站没有自己的服务器。默认用公共的 jsonblob.com，若你的网络访问不了，可填一个 GitHub token（会自动建 secret gist，只存在本机）或自建 POST 端点（返回 {id}，GET /{id} 取回）。',
    save: '保存', cancel: '取消',
  },
  en: {
    brand: 'Report Detective',
    brandSub: 'Morimens · Fan Puzzle',
    footNote: 'Fan work, not affiliated with the official game.',
    navHome: 'All projects',
    navGame: 'Game',
    navGallery: 'Gallery',
    navWorkshop: 'Workshop',
    navCodex: 'Codex',
    navAbout: 'Help',
    loading: 'Loading…',
    loadFail: 'Could not load the puzzle — check your connection and retry',
    retry: 'Retry',
    lv1: 'Novice', lv2: 'Advanced', lv3: 'Veteran', lv4: 'Master',
    lv1d: '4 awakeners only', lv2d: '+ wheels', lv3d: '+ covenant & key', lv4d: '+ potency & relics',
    daily: 'Daily', random: 'Random',
    played: 'played', won: 'won', streak: 'streak', best: 'best',
    reportTitle: 'Dzone Report', season: 'Season {s}',
    zone: 'Zone {z}', threat: 'Threat {t}', madness: 'Madness {m}', diffStar: 'Diff {d}', extra: 'extra pass',
    diffScore: 'Difficulty {s}', diffWhy: 'Difficulty breakdown', diffInfo: 'Clue exclusion', diffSpread: 'Damage concentration', diffPeel: 'Number familiarity',
    bossLabel: 'Zone Boss', bossSkills: 'Zone Boss skills (clues)',
    rounds: 'Rounds', bossRounds: 'Boss {n}', cards: 'Cards', energy: 'Energy {n}',
    mlLevel: 'Recommended Lv.{n}', keysUsed: 'Posse used',
    maxBout: 'Max bout dmg', deathResist: 'Death resist', leftHp: 'HP left', keyDmg: 'Keeper dmg',
    score: 'Score', relicCount: 'Relics', relicAll: 'restore all',
    relicInnate: '{n} innate (names cost a clue)', innateTag: 'Innate relic', clueInnate: 'Innate relics', relicFillTag: 'to fill in',
    dmg: 'DMG', blk: 'Block', heal: 'Heal',
    cardUp: '{n} card-ups', talentSum: 'Talent Lv.{n}',
    dmgCompTitle: 'Damage composition (keeper & special)',
    keeper: 'Keeper dmg', tentacle: 'Tentacle dmg', counter: 'Counter dmg', strength: 'Peak STR', poison: 'Corrosion/Poison',
    investTitle: 'Build clues',
    cardLv: 'Command card lv', madnessLv: 'Madness omen', potLv: 'Potency',
    sortNote: 'Sorted by damage desc: A is the top dealer. Members are anonymized as A–D; order matches the answer.',
    boardTitle: 'Restore team', boardLevel: '{l}',
    submit: 'Submit', submitLeft: ' ({n} left)', reset: 'Reset',
    clearWrong: 'Clear wrong picks', clearDone: 'Cleared {n} flagged pick(s)', clearNone: 'Nothing flagged yet',
    swapPick: '{l} selected — tap another slot to move it there; tap it again to change it',
    swapDone: 'Swapped {a} ↔ {b}', swapHint: 'Swapping: tap another slot to swap, tap it again to change',
    pickAwakener: 'Pick awakener', pickWheel: 'Pick wheel', pickCovenant: 'Pick covenant', pickKey: 'Pick key', pickCreation: 'Pick relic',
    searchName: 'Search (CN/EN)', allRealm: 'All realms', allRole: 'All roles', allRarity: 'All rarities', allType: 'All types',
    allKw: 'All keywords', clear: 'Clear', close: 'Close', done: 'Done', add: 'Add', noMatch: 'No match',
    decoy: 'unseen',
    hintRealm: 'Reveal realm', hintRole: 'Reveal role', hintLv: 'Reveal level', hintKey: 'Key realm',
    acctTag: 'Account', guestTag2: '', lvTag: 'Lv', brkTag: 'Gnostic Potential',
    clueTitle: 'Clue desk', clueNote: 'Spend Silver Core — stays unlocked for this puzzle',
    clueBrk: 'Gnostic Potential', cluePot: 'Potency',
    cluePotTeam: 'Potency overview', cluePotSum: 'total {n}',
    giftTag: 'FREE', giftToast: '{n} clue(s) unlocked free for this tier', clueGiftOn: '{n} free',
    loadMore: 'Load more',
    clueBuild: 'Build (cards / omen)', clueAssist: 'Assist',
    clueAssistN: 'No assist borrowed', clueAssistY: '{n} assist borrowed',
    cluePeak: 'Single-turn peak / Keeper', cluePeakCard: 'most cards {n}', cluePeakEnergy: 'most energy {n}',
    cluePeakLv: 'Keeper Lv.{n}',
    clueWheelOne: 'Wheel clue {n}', clueCovOne: 'Covenant clue {n}',
    clueWheelSeen: 'Wheels', clueCovSeen: 'Covenants',
    clueRelTitle: 'Relics · by function',
    clueRelOut: 'Relics · damage / strength / crit', clueRelDraw: 'Relics · card draw',
    clueRelRage: 'Relics · Aliemus', clueRelCost: 'Relics · Arithmetica & exhaust', clueRelGuard: 'Relics · block & healing',
    clueRelGold: 'Relics · golden (SSR) count', clueRelBase: 'Relics · base damage bonus',
    clueRelHeal: 'Relics · healing',
    clueRelGoldMin: '{n} pcs (+{m} with unknown rarity)',
    clueRelN: '{n} pcs', clueRelNone: 'none',
    clueDeckTitle: 'Deck', clueDeckSize: 'Deck size',
    clueDeckCur: 'Symptom cards', clueDeckExt: 'Derived cards', clueDeckWhl: 'Cards added by Wheels',
    clueDeckN: '{n} cards',
    clueStepNote: 'pricier further along', clueWheelMax: 'best upgrade +{n}', clueWheelHi: '{n} at +12 or more',
    clueWheelUp: 'Wheel upgrades', clueMul: 'prices ×{m} at this tier',
    clueBuildCard: 'Build (cards)', clueBuildOmen: 'Build (omen)',
    fillAll: 'Pick 4 awakeners first', noDup: 'No duplicate awakeners',
    histTitle: 'Guesses', histEmpty: 'Nothing yet. Green=correct, yellow=in team but wrong spot, gray=not in team.',
    winTitle: 'Solved', loseTitle: 'Failed', grade: 'Grade {g}',
    scoreText: 'Score {s} ({h} hints, {n} submits)',
    slotHead: 'Slot {l}', lv: 'Lv.{n}', potFull: 'Potency {n}', brk: 'Gnostic Potential {n}',
    keyLabel: 'Key', relicLabel: 'Relics',
    copy: 'Copy result', again: 'New puzzle',
    copied: 'Copied',
    loginTitle: 'Profile', nickname: 'Nickname', login: 'Sign in', logout: 'Sign out',
    nicknamePh: 'Enter nickname (local)',
    guestTag: 'Guest (local save)', loginRegister: 'Sign in / Sign up', pfGuestData: 'Local save',
    guestShort: 'Guest',
    statsTitle: 'My stats', accuracy: 'Overall accuracy', totalPlayed: 'Total played', totalWon: 'Total won',
    favTitle: 'Favorite awakeners', favHint: 'Pick your favorites (personalization)',
    teamRuleTitle: 'Morimens team rules (for newcomers)',
    noSkills: 'No skill data',
    aboutFoot: 'Fan work, unrelated to the official game. Assets belong to their owners; report data from public leaderboards, player info anonymized.',
    credits: 'Silver Core', creditsTip: 'Silver Core: earned by solving by difficulty, spent on hints and gallery CGs',
    hintCost: 'Hint · {n} cr',
    noCredits: 'Not enough Silver Core — solve a puzzle to earn more',
    ptsGain: '+{n} Silver Core', ptsHint: '−{n} Silver Core', ptsRefund: '{n} Silver Core refunded for old clues',
    ckTitle: 'Daily check-in', ckBtn: 'Check in', ckDone: 'Checked in today', ckStreak: '{n}-day streak',
    ckTomorrow: 'come back tomorrow', ckNote: 'Once a day for 10 Silver Core; the streak keeps counting', ckGain: 'Checked in: +{n} Silver Core',
    pfGrant: 'Gift received: +{n} Silver Core',
    acctMigrated: 'Account data moved to the new backend',
    failedTitle: 'Failed bank', failedMark: 'In failed bank',
    failedNote: 'These puzzles used up all {n} tries and will not return; answers and replays are kept here.',
    failedEmpty: 'No fully failed puzzles yet.',
    replayTitle: 'Replay review', replayApi: 'Official replay JSON',
    replayReview: 'Open review on Wangwang Kanbao', replayCopy: 'Copy battleUuid',
    replayHint: 'Paste the battleUuid on the review page for a round-by-round timeline.',
    galleryTitle: 'CG Gallery', gallerySub: 'Official CGs collected by the Huiji wiki; unlock with Silver Core and view full size.',
    galleryAll: 'All', galleryUnlock: 'Unlock · {n} Silver Core', galleryUnlocked: 'Unlocked',
    gallerySearch: 'Search title / filename', galleryClear: 'Clear filter',
    galleryProgress: 'Unlocked {a}/{b}', galleryOriginal: 'Original', galleryEmpty: 'No CG in this group yet',
    galleryLockNote: 'Locked CGs show a blurred preview; unlocking reveals the full image.',
    workshopTitle: 'Workshop', workshopSub: 'Import a battle replay to build your own puzzle and challenge friends.',
    wsImport: 'Import replay', wsUuid: 'battleUuid (or replay code UUID#E#a)', wsParse: 'Parse & build',
    wsJson: 'Or paste report JSON (battle summary / team record)', wsBuild: 'Build puzzle',
    wsManual: 'Build manually', wsMine: 'My puzzles', wsCloud: 'Cloud bank',
    wsShare: 'Copy puzzle code', wsPlay: 'Play it', wsDel: 'Delete',
    wsUpload: 'Upload to cloud', wsCloudLoad: 'Load by cloud code', wsLoad: 'Load',
    wsNeedUuid: 'Enter a battleUuid first', wsParsing: 'Parsing replay…',
    wsParseFail: 'Parse failed: check the UUID, or paste report JSON instead',
    wsSaved: 'Saved to my puzzles', wsCodeCopied: 'Puzzle code copied',
    wsCodePh: 'Paste puzzle code ZJ2-...', wsImportCode: 'Import code',
    wsCloudId: 'Cloud code', wsCloudUploaded: 'Uploaded, code: {id}',
    wsBank: 'Site puzzle bank', wsBankNote: 'Puzzles uploaded by others — load or play directly.',
    wsBankEmpty: 'Nobody has uploaded a puzzle yet.', wsBankOff: 'Backend not configured — sharing codes only for now.',
    // team / relic editing
    wsTeamRealm: 'Realms in team: {r}',
    wsTeamNoRealm: 'No Awakener picked yet',
    wsRealmRule: 'Team rule: only one non-Chaos realm is allowed; conflicting Awakeners cannot be picked.',
    wsRealmAnchor: 'Team already has “{r}” — only “{r}” or Chaos Awakeners can be added.',
    wsRealmBlocked: 'conflicts with {r} in team',
    wsRealmUsed: 'already used in another slot',
    wsRelicOrderNote: 'Relic order does not matter — add or remove freely; judging compares the set.',
    wsBankAnon: 'anonymous', wsBankOpen: 'Load',
    wsCloudFail: 'Upload failed (network or service limit)', wsNoMine: 'No puzzles yet.',
    wsFile: 'Pick replay JSON', wsOpenReplay: 'Open official replay',
    wsUuidLabel: 'Replay code (battleUuid)', wsLoadByCode: 'Load by replay code',
    wsCodeMiss: 'This replay is not in the bank: only file import works (wheels/creations/keeper accurate, covenant must be picked by hand)',
    thmSet: 'Use as backdrop', thmUsing: 'In use', thmOn: 'Remove backdrop',
    thmApplied: '“{n}” is now the site backdrop theme', thmCleared: 'Backdrop reset to default',
    thmLocked: 'Unlock this CG first', thmFail: 'Could not apply the theme',
    thmCurrent: 'Backdrop: {n}', thmBadge: 'Backdrop',
    galleryJustUnlocked: '“{n}” unlocked — hit “Use as backdrop” on the card to paint the whole site with it',
    myCenter: 'Profile', login: 'Sign in',
    pfTitle: 'Profile', pfSub: 'Account, avatar and your detective record.',
    pfGuestTitle: 'Sign in to keep your record', pfGuestSub: 'Register with a username and password — the account lives in the Waline database. Credits and unlocks stay in this browser.',
    pfLoginBtn: 'Sign in / Register', pfJoined: 'Joined', pfNoName: 'Unnamed Keeper', pfNamePh: 'Pick a display name',
    pfStoreNote: 'Account and avatar live in the cloud; Silver Core, unlocks and the failed bank stay in this browser.',
    pfPlayed: 'Played', pfWinRate: 'Accuracy', pfUnlockedCg: 'CG unlocked', pfFailed: 'Failed bank',
    pfEdit: 'Profile & avatar', pfNick: 'Display name', pfNickNote: 'display only — your login name stays the same', pfAvatarUrl: 'or paste an image URL (≤250 chars)',
    pfAvatarNote: 'Avatars come from the Waline chibi pack; you can also paste your own image URL.',
    pfAvatarPick: 'Chibi avatars', pfAvatarAll: 'All ({n})', pfAvatarN: '{n} avatars', pfSaved: 'Saved', pfSaveFail: 'Save failed', pfLogout: 'Sign out', pfLoggedOut: 'Signed out',
    pfGuestNote: 'Guest mode: Silver Core, unlocks and records stay on this device. Sign up to sync them.',
    pfSyncNote: 'Signed in: Silver Core / CG unlocks / records / workshop reports sync with your account.',
    pfAccNote: 'Sign in on another device and your Silver Core, unlocks, records and workshop reports come back.',
    pfLastSync: 'Last sync {t}', pfSyncNever: 'Never synced yet',
    pfFavTitle: 'Favorite awakeners', pfFavPicked: 'picked', pfFavNone: 'none yet', pfFavGo: 'Set up',
    pfFavNote: 'Picks are saved to your account as a personal collection — they do not change puzzle difficulty.',
    pfFavSave: 'Save picks', pfFavClear: 'Clear all', pfFavSaved: 'Picks saved',
    pfHistTitle: 'Solve history', pfHistNote: 'Every finished round (daily / random / custom / workshop) is recorded, up to {n}.',
    pfHistEmpty: 'No rounds yet — go solve one.',
    pfModeDaily: 'Daily', pfModeRandom: 'Random', pfModeCustom: 'Workshop',
    pfWinTag: 'Win', pfLoseTag: 'Loss', lvShort: 'Lv{n}',
    pfImpTitle: 'Workshop reports', pfImpNote: 'Replay imports and self-made puzzles are saved to your account — reopen or replay them here.',
    pfImpEmpty: 'No imported reports yet.', pfImpTeam: 'awakeners', pfImpPlay: 'Replay it', pfImpReplay: 'Official replay', pfImpDel: 'Delete',
    pfCgTitle: 'Gallery progress', pfCgNote: '{a} / {b} unlocked — unlocked CG can be used as a page theme.',
    pfMiniTitle: 'Fan mini-games',
    pfMiniNote: 'Your best runs in both mini-games are stored in your account, so they follow you to other devices.',
    pfMiniBest: 'Best {n}', pfMiniBird: 'Deepest {n}', pfMiniNone: 'Not played yet', pfMiniGo: 'Play a round',
    pfSyncTitle: 'Save & sync', pfSyncNow: 'Sync now', pfSyncing: 'Syncing…', pfSyncOk: 'Synced', pfSyncFail: 'Sync failed',
    poolNote: '{n} in pool', poolDiff: 'difficulty {a}–{b}',
    pfLocal: 'Local save', pfLocalNote: 'Credits, unlocked CG, the failed bank and your own puzzles are stored only in this browser. Clearing cannot be undone.',
    pfClear: 'Clear local save', pfClearAsk: 'Credits, unlocks, the failed bank and your own puzzles will be lost permanently. Continue?', pfCleared: 'Local save cleared',
    wsReplayExact: 'Full team loaded from the replay code: wheels, covenants, creations and keeper all come from the bank answer',
    wsReplayNote: 'Replay decoded: team, Keeper skill and Creations filled in. Wheels and Covenants are not in the replay — add them manually. Stats use replay counters and can be tweaked.',
    wsNote: 'Replay parsing runs in your browser; if the parser is unavailable, paste report data or build manually.',
    wsCloudCfg: 'Cloud bank settings', wsCloudBusy: 'Uploading…',
    wsCloudCfgUrl: 'Custom endpoint (optional)',
    wsCloudCfgNote: 'This site has no server of its own. By default it uses the public jsonblob.com; if that is unreachable, add a GitHub token (creates a secret gist, stored locally) or your own POST endpoint (returns {id}, GET /{id} to read back).',
    wsHintTitle: 'Custom clues', wsHintNone: 'No custom clues yet.',
    wsHintNote: 'Write your own title and text; players buy them from the clue desk at your price — up to {max} entries, no tier markup',
    wsHintLabelPh: 'Clue title (the player sees this first)',
    wsHintTextPh: 'Clue text, e.g. "only slot A played this card in that run"',
    wsHintCostTip: 'Price (Silver Core, 1–40)', wsHintFull: 'Up to {n} entries', wsHintDefault: 'Clue {n}',
    wsHintColN: 'Title', wsHintColV: 'Text', wsHintColC: 'Price',
    clueAuthorTitle: 'Author clues', clueAuthorOne: 'Author clue {n}', clueAuthorNote: 'written by the puzzle author',
    likeBtn: 'Like', likeDone: 'Liked',
    likeLeft: '{n} likes left today', likeZero: 'All {n} likes used up today',
    likeThanks: 'Thanks! {n} likes left today',
    likeSelf: 'This is your own puzzle — likes from others pay you Silver Core',
    likeSelfFail: 'You cannot like your own puzzle',
    likeQueue: '{n} likes queued to send',
    likeCloudOff: 'Cloud storage is still being provisioned — this like was kept on your device',
    likeCloudNote: 'Cloud storage pending — likes are kept on this device for now',
    likeGain: '{n} new likes · +{n} Silver Core',
    likeTotal: '{n} likes received', likeTip: 'Each like gives the author 1 Silver Core; up to {n} likes per person per day',
    save: 'Save', cancel: 'Cancel',
  },
};
return { I18N };
})();

// ---- js/common.js
const m_common = await (async () => {
const { I18N } = m_i18n;
// shared helpers for the game and the codex


const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const store = {
  get(k, d) { try { const v = localStorage.getItem('zjtt:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('zjtt:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem('zjtt:' + k); } catch { /* private mode */ } },
};

// ------------------------------------------------------------------ language
// 中英文切换：语言偏好存在 localStorage，名称类字段（en/zh）随语言切换。
const lang = {
  cur: (store.get('lang', 'zh') === 'en' ? 'en' : 'zh'),
  set(l) { this.cur = (l === 'en' ? 'en' : 'zh'); store.set('lang', this.cur); document.documentElement.lang = this.cur === 'en' ? 'en' : 'zh-CN'; },
  toggle() { this.set(this.cur === 'en' ? 'zh' : 'en'); },
};
document.documentElement.lang = lang.cur === 'en' ? 'en' : 'zh-CN';

// t(key, vars)：取当前语言文案，支持 {x} 占位符
// 用 split/join 而不是 replaceAll：后者要 Chrome 85+ / Safari 13.1+，
// 老一点的手机内置浏览器直接抛 TypeError，整页文案全变成报错。
function t(key, vars = {}) {
  let s = (I18N[lang.cur] && I18N[lang.cur][key]) ?? I18N.zh[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

// 根据当前语言取条目的显示名（e 有 en/zh 字段）
const nameOf = (e) => (e ? (lang.cur === 'en' ? (e.en || e.zh) : (e.zh || e.en)) : '');

function h(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}

// 空状态占位（虚线框 + 居中说明），各面板共用一套视觉
const emptyState = (text) => h('p', { class: 'empty' }, text);

function toast(msg, ms = 1800) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
  return el;
}

// 页面上所有银芯数字都带 data-sc="图标尺寸"，花/加之后统一就地重绘，
// 免得顶栏还显示旧值（不用整页 render）。
function syncCreditsDom() {
  const n = wallet.get();
  document.querySelectorAll('[data-sc]').forEach((el) => {
    el.replaceChildren(scNum(n, Number(el.getAttribute('data-sc')) || 14));
  });
}

// 本机数据改动 → 通知 js/account.js 排队同步到账号（登录态才推）
function markDirty(what = '') {
  document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: what }));
}

// 战绩统计的标准字段。云端档案可能是旧版本（或空对象）写进来的，
// 所以读取一律走 statsOf() 补默认值，避免界面出现 undefined。
const STAT0 = { played: 0, won: 0, streak: 0, best: 0, last: '', fields: 0, totalFields: 0 };
const statsOf = () => {
  const v = store.get('stats', null);
  return { ...STAT0, ...(v && typeof v === 'object' ? v : {}) };
};

// 主题面板色是 rgba(…, .72)：直接铺在明亮的 CG 上会把卡片冲成一片白。
// 这里按同色系提高不透明度再与底色混合，得到「实心」面板色给卡片用。
function parseColor(c) {
  if (!c) return null;
  const s = String(c).trim();
  let m = s.match(/^#([0-9a-f]{3,8})$/i);
  if (m) {
    let h = m[1];
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  m = s.match(/^rgba?\(([^)]+)\)$/i);
  if (m) {
    const q = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
    if (q.length >= 3 && q.slice(0, 3).every((x) => !Number.isNaN(x))) return [q[0], q[1], q[2], q.length > 3 ? q[3] : 1];
  }
  return null;
}

function solidOf(panel, bg) {
  const p = parseColor(panel);
  const b = parseColor(bg) || [0, 0, 0, 1];
  if (!p) return panel;
  const a = Math.min(1, (p[3] == null ? 1 : p[3]) + 0.18);
  const mix = (x, y) => Math.round(x * a + y * (1 - a));
  return `rgb(${mix(p[0], b[0])}, ${mix(p[1], b[1])}, ${mix(p[2], b[2])})`;
}

// 主题皮肤：js/theme.js 把算好的变量写进 store('theme')，这里同步恢复，
// 这样任何页面（只要调了 nav）都会立刻带上上次选的 CG 背景。
function themeVars(th) {
  const root = document.documentElement;
  if (!th || !th.vars) return;
  for (const [k, v] of Object.entries(th.vars)) root.style.setProperty(`--${k}`, v);
  const p2 = solidOf(th.vars.panel2, th.vars.bg);
  root.style.setProperty('--panel-solid', solidOf(th.vars.panel, th.vars.bg));
  root.style.setProperty('--panel2-solid', p2);
  // 卡片内部的小面板（统计块 / 签到条 / 槽位…）直接吃面板色，不再把 CG 透进来
  root.style.setProperty('--panel2', p2);
  if (th.img) root.style.setProperty('--theme-img', `url("${new URL(th.img, document.baseURI).href}")`);
  root.setAttribute('data-themed', th.dark ? 'dark' : 'light');
  document.body.classList.add('themed');
}

function applyThemeSkin() {
  themeVars(store.get('theme', null));
  upgradeThemeImage();
}

// 早期版本把 900 宽缩略图存成了背景，这里在进页面后悄悄换成 1920 宽的大图。
// 走 store 而不是 theme.js，避免 common ←→ theme 循环依赖。
let themeImgChecked = false;
async function upgradeThemeImage() {
  if (themeImgChecked) return;
  themeImgChecked = true;
  const th = store.get('theme', null);
  if (!th || !th.vars || !th.id) return;
  try {
    const r = await fetch('data/gallery.json', { cache: 'force-cache' });
    const g = await r.json();
    const it = (g.items || []).find((x) => x.id === th.id);
    const want = it && (it.big || it.f);
    if (want && want !== th.img) {
      th.img = want;
      store.set('theme', th);
      themeVars(th);
    }
  } catch { /* 没有图库就保持原样 */ }
}

// 账号（js/auth.js 写入，nav 只读，避免循环依赖）
const authUser = () => store.get('authUser', null);

const KINDS = {
  awakener: '唤醒体', wheel: '命轮', covenant: '密契', key: '钥令', creation: '造物', monster: '怪物',
};

// ------------------------------------------------------------------ 银芯 / 失败题库 / 回放
// 银芯就是原来叫「积分」的货币：答对按难度拿银芯，提示与 CG 解锁花银芯。
// 名字与图标都对齐游戏内货币（维基 银芯.png），标识统一走 scIcon()。
const SC_ICON = 'assets/ui/silvercore.webp';
function scIcon(size = 14) {
  return h('img', { class: 'sc-ico', src: SC_ICON, alt: '', width: size, height: size, decoding: 'async' });
}
// 图标 + 数字，例如 nav 里的「🪙 500」
function scNum(n, size = 14) {
  return h('span', { class: 'sc-num' }, scIcon(size), h('b', {}, String(n)));
}

const wallet = {
  get() { return Number(store.get('credits', 0)) || 0; },
  add(n) { const v = this.get() + Math.max(0, Math.round(n)); store.set('credits', v); markDirty('credits'); syncCreditsDom(); return v; },
  spend(n) {
    if (this.get() < n) return false;
    store.set('credits', this.get() - n);
    markDirty('credits');
    syncCreditsDom();
    return true;
  },
};

// 彻底失败（用完次数仍未还原）的题目 id：永久移出题池，只能去失败题库看答案
const failedBank = {
  list() { return store.get('failed', []); },
  has(id) { return this.list().includes(id); },
  add(id) {
    const l = this.list();
    if (!l.includes(id)) { l.push(id); store.set('failed', l); markDirty('failed'); }
  },
};

// 官方回放 & 忘忘看报的复盘工具
const REPLAY = {
  json: (uuid) => `https://z1g-warreport.qookkagames.com/publish/BattleReplay_${uuid}.json`,
  review: 'https://z769018860.github.io/qdby_chinese/morimens-tools.html#replay',
};

// 典藏馆解锁记录
const unlocked = {
  list() { return store.get('cg', []); },
  has(id) { return this.list().includes(id); },
  add(id) { const l = this.list(); if (!l.includes(id)) { l.push(id); store.set('cg', l); markDirty('cg'); } return l; },
};

// 题目分享码：ZJ2-<base64url(JSON)>，工坊与推理页共用
function b64uEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64uDecode(s) {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - b.length % 4) % 4));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
const shareCode = {
  enc(obj) { return 'ZJ2-' + b64uEncode(JSON.stringify(obj)); },
  dec(code) {
    try {
      const s = String(code || '').trim();
      if (!s) return null;
      return JSON.parse(b64uDecode(s.replace(/^ZJ2-/, '')));
    } catch { return null; }
  },
};

// 分类名称（中英）
const KIND_EN = { awakener: 'Awakener', wheel: 'Wheel of Destiny', covenant: 'Covenant', key: 'Key Token', creation: 'Relic', monster: 'Monster' };
const kindName = (k) => (lang.cur === 'en' ? KIND_EN[k] : KINDS[k]);

// ------------------------------------------------------------------ 配队规则
// 忘却前夜的界域（阵营）规则：除「混沌」外，唤醒体只能与「自身界域 + 混沌」同队。
// 换成可以直接判定的说法：一支队伍里，混沌以外的界域最多只能出现一种。
// 所以队伍已有「血肉」和「混沌」时，再填「超维」就是非法配队——填不进去。
const REALM_CHAOS = '混沌';

// 队内已经确定的「锚界域」（混沌不算）：返回第一个非混沌界域，没有则空串
const realmAnchor = (realms) => {
  const list = (realms || []).map(String).filter(Boolean);
  const hit = list.find(r => r !== REALM_CHAOS);
  return hit || '';
};

// 候选界域能不能进这支队伍
function realmFits(realms, candidate) {
  const c = String(candidate || '');
  if (!c || c === REALM_CHAOS) return true;   // 混沌跟谁都能组
  const a = realmAnchor(realms);
  return !a || a === c;
}

// 界域名的中英显示（字典里只有中文名，英文界面按官方译名兜底）
const REALM_EN_ZH = { 深海: 'Aequor', 混沌: 'Chaos', 血肉: 'Caro', 超维: 'Ultra', 褪色遗产: 'Faded Legacy', 通用: 'Universal', 其他: 'Other' };
const realmName = (r) => (lang.cur === 'en' ? (REALM_EN_ZH[r] || r) : r);

// bootP：页面 HTML 里已经开拉的 data/boot.json（字典/标签/关键词/索引合成的一个请求）。
// 各页面不用自己传参，这里兜底复用，省掉「字典、关键词、标签各来一次」的三个轮次。
const bootDataP = () => (typeof window !== 'undefined' && window.__boot && window.__boot.data) || null;

async function loadDict(prefetched, kwPrefetched) {
  const boot = bootDataP();
  const bootDict = (typeof window !== 'undefined' && window.__boot && window.__boot.dict) || null;
  const dictP = prefetched
    || bootDict
    || (boot ? boot.then(j => j.dict) : fetch('data/dictionary.json').then(r => r.json()));
  const kwP = kwPrefetched || (boot ? boot.then(j => j.kw) : null);
  const [D] = await Promise.all([dictP, loadKeywords(kwP)]);
  const idx = {};
  for (const k of Object.keys(KINDS)) idx[k] = new Map(D[k].filter(e => e.id != null).map(e => [String(e.id), e]));
  return { D, idx };
}

// ------------------------------------------------------------------ SHA-256
// 题库答案是拿 SHA-256 当密钥流异或出来的（见 scripts/build_data.py）。
// 优先用浏览器的 crypto.subtle —— 但它在「非安全上下文」里是 undefined：
// 手机上从 http 打开、或在某些内置浏览器 / WebView 里，题目就会「解码失败」、
// 一题都出不来。所以带一份纯 JS 的实现兜底，慢一点但一定能用。
const K256 = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Raw(bytes) {
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const len = bytes.length;
  // padding：0x80 + 若干 0 + 64 位长度
  const withPad = new Uint8Array((((len + 9) + 63) >> 6) << 6);
  withPad.set(bytes);
  withPad[len] = 0x80;
  const bits = len * 8;
  const dv = new DataView(withPad.buffer);
  dv.setUint32(withPad.length - 4, bits >>> 0, false);
  dv.setUint32(withPad.length - 8, Math.floor(bits / 4294967296), false);

  const w = new Uint32Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let off = 0; off < withPad.length; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, hh] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (hh + S1 + ch + K256[i] + w[i]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      hh = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + hh) | 0;
  }
  const out = new Uint8Array(32);
  const odv = new DataView(out.buffer);
  H.forEach((x, i) => odv.setUint32(i * 4, x >>> 0, false));
  return out;
}

// 字符串 → SHA-256 字节；crypto.subtle 不可用（http / 老内置浏览器）时走纯 JS
async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof crypto !== 'undefined' && crypto && crypto.subtle && crypto.subtle.digest) {
    try { return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)); } catch { /* 落到下面 */ }
  }
  return sha256Raw(bytes);
}

function imgEl(src, alt = '', cls = '') {
  // 没有图就直接给个占位方块：既不会请求坏图，也不会在图片统计里算成 broken
  if (!src) return h('span', { class: `imgph ${cls}`.trim(), title: alt || '' });
  const i = h('img', { src, alt, loading: 'lazy', class: cls });
  i.addEventListener('error', () => { i.style.visibility = 'hidden'; });
  return i;
}

const wan = n => {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(2) + ' 亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + ' 万';
  return String(n);
};

const RARITY_CLASS = { SSR: 'r-ssr', SR: 'r-sr', R: 'r-r' };

function avatarEntry() {
  const u = authUser();
  const src = (u && u.avatar) || 'assets/avatars-q/char-albino.webp';
  return h('a', { class: 'avatar-chip', href: 'profile.html', title: u ? t('myCenter') : t('login') },
    h('img', { src, alt: '', width: 26, height: 26, loading: 'lazy' }),
    h('span', {}, u ? u.name : t('login')));
}

function nav(active) {
  applyThemeSkin();
  const langBtn = h('button', {
    class: 'langbtn', type: 'button', title: '中文 / English',
    onclick: () => { lang.toggle(); location.reload(); },
  }, lang.cur === 'en' ? '中文' : 'EN');
  // 同步页脚语言
  const foot = document.querySelector('.foot');
  if (foot) foot.textContent = t('aboutFoot');
  const credits = h('span', { class: 'credits', title: t('creditsTip'), 'data-sc': 17 }, scNum(wallet.get(), 17));
  return h('header', { class: 'top' },
    h('a', { class: 'brand', href: 'index.html', title: t('navHome') }, h('b', {}, t('brand')), h('small', {}, t('brandSub'))),
    h('nav', {},
      h('a', { href: 'detective.html', class: active === 'game' ? 'on' : '' }, t('navGame')),
      h('a', { href: 'gallery.html', class: active === 'gallery' ? 'on' : '' }, t('navGallery')),
      h('a', { href: 'workshop.html', class: active === 'workshop' ? 'on' : '' }, t('navWorkshop')),
      h('a', { href: 'codex.html', class: active === 'codex' ? 'on' : '' }, t('navCodex')),
      h('a', { href: 'about.html', class: active === 'about' ? 'on' : '' }, t('navAbout'))),
    h('div', { class: 'navright' }, credits, avatarEntry(), langBtn));
}

// ------------------------------------------------------------------ keywords
// Texts in data/*.json mark keywords as ⟦slug|文字⟧ (see scripts/i18n_lib.py)
const KW = { list: [], by: {} };
async function loadKeywords(prefetched) {
  if (!KW.list.length) {
    KW.list = prefetched
      ? await prefetched
      : await (await fetch('data/keywords.json')).json();
    KW.by = Object.fromEntries(KW.list.map(k => [k.s, k]));
  }
  return KW;
}
const KW_TYPE = { realm: '界域', mechanic: '状态 / 机制', tag: '标签', help: '说明' };
const MARK = /⟦([^|⟧]+)\|([^⟧]*)⟧/g;
const plain = t => (t || '').replace(MARK, '$2');
const slugsIn = t => [...new Set([...(t || '').matchAll(MARK)].map(m => m[1]))];

function kwChip(slug, text) {
  const k = KW.by[slug];
  if (!k) return document.createTextNode(text);
  const cls = k.t === 'realm' ? `realm-${k.s}` : (k.c || 'misc');
  const b = h('button', { type: 'button', class: `kw kw-${cls}`, 'data-s': slug, title: `${k.n}：${plain(k.d).replace(/\s+/g, ' ').slice(0, 150)}`,
    onclick: e => { e.stopPropagation(); showKwPop(slug, b); } },
    k.i ? h('img', { src: k.i, alt: '' }) : null, text);
  return b;
}

function renderText(t) {
  const frag = document.createDocumentFragment();
  let pos = 0;
  for (const m of (t || '').matchAll(MARK)) {
    if (m.index > pos) frag.append(t.slice(pos, m.index));
    frag.append(kwChip(m[1], m[2]));
    pos = m.index + m[0].length;
  }
  if (pos < (t || '').length) frag.append(t.slice(pos));
  return frag;
}

function kwIcon(k, size = 28) {
  if (k.i) return h('img', { src: k.i, alt: '', class: 'kwicon', width: size, height: size });
  const cls = k.t === 'realm' ? `realm-${k.s}` : (k.c || 'misc');
  return h('span', { class: `kwicon glyph kw-${cls}`, style: `width:${size}px;height:${size}px;font-size:${size * .55}px` }, k.n.slice(0, 1));
}

let pop;
function showKwPop(slug, anchor) {
  const k = KW.by[slug];
  if (!k) return;
  if (!pop) {
    pop = h('div', { class: 'kwpop', role: 'dialog' });
    document.addEventListener('click', e => { if (pop && !pop.contains(e.target)) pop.hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) pop.hidden = true; });
  }
  pop.replaceChildren(
    h('div', { class: 'kwhead' }, kwIcon(k, 32), h('b', {}, k.n), h('small', {}, k.e)),
    h('div', { class: 'kwdesc' }, renderText(k.d)),
    h('a', { class: 'kwlink', href: `codex.html#tab=awakener&kw=${slug}` }, '在图鉴中筛选包含此关键词的条目 →'));
  (anchor.closest('dialog') || document.body).append(pop); // keep it above modal dialogs
  pop.hidden = false;
  const r = anchor.getBoundingClientRect();
  const w = Math.min(360, innerWidth - 16);
  pop.style.width = w + 'px';
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = '0px';
  const hgt = pop.offsetHeight;
  pop.style.top = (r.bottom + hgt + 12 > innerHeight && r.top > hgt + 12 ? r.top - hgt - 6 : r.bottom + 6) + 'px';
}
return { $, $$, store, lang, t, nameOf, h, emptyState, toast, syncCreditsDom, markDirty, STAT0, statsOf, parseColor, solidOf, themeVars, applyThemeSkin, upgradeThemeImage, authUser, KINDS, SC_ICON, scIcon, scNum, wallet, failedBank, REPLAY, unlocked, shareCode, KIND_EN, kindName, REALM_CHAOS, realmAnchor, realmFits, REALM_EN_ZH, realmName, loadDict, sha256, imgEl, wan, RARITY_CLASS, nav, KW, loadKeywords, KW_TYPE, plain, slugsIn, kwChip, renderText, kwIcon, showKwPop };
})();

// ---- js/about.js
const m_about = await (async () => {
const { nav, lang, t } = m_common;
// 说明页：只做语言切换与导航注入

document.body.prepend(nav('about'));
// 两段内容按语言只留一段：默认 HTML 里给 sec-en 加了 hidden，
// 英文态必须把 sec-zh 也显式隐藏，否则中英会同时出现。
const zhSec = document.getElementById('sec-zh');
const enSec = document.getElementById('sec-en');
const isEn = lang.cur === 'en';
zhSec.hidden = isEn;
enSec.hidden = !isEn;
document.documentElement.lang = lang.cur === 'en' ? 'en' : 'zh-CN';
document.title = t('navAbout') + ' · ' + t('brand');
document.querySelector('footer.foot').textContent = t('footNote');
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

