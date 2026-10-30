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
    relicInnate: '固有 {n} 件已给出', innateTag: '固有造物', relicFillTag: '需补齐',
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
    relicInnate: '{n} innate given', innateTag: 'Innate relic', relicFillTag: 'to fill in',
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

// ---- js/api.js
const m_api = await (async () => {
const { store } = m_common;
// 后端客户端：所有需要服务端记账的请求都从这里走。
//
// 线上跑的是 EdgeOne Pages 的 Edge Functions + KV（代码在 edge-functions/api/），
// 和站点同域同证书，所以没有跨域、也没有 https 页面调 http 接口被拦的问题。
// 另外还留着两份等价实现，规则逐条对齐：
//   · server/worker.js  —— Cloudflare Worker + D1
//   · server/node.js    —— Node + 内置 SQLite（自托管 / Docker）
//
// 三个模块：点赞（每人每天 10 次、同题只能赞一次）、账号档案（带版本号乐观锁）、工坊题库。
//
// 地址优先取 store 里的 apiBase（设置里可改，方便临时指向本地后端），其次是下面的常量。


// 部署后把这里换成接口地址（末尾要带 /api）。只有「站点不在自家域名下」时才会用到它，
// 比如 GitHub Pages 那份镜像站；站点本身就部署在 EdgeOne 上时走同源 /api，不用配。
// 用 `node scripts/set_api_base.mjs https://<你的域名>/api` 改这一行，别手改错。
const API_BASE = 'https://zjtt-api.workers.dev';

// 还是占位符就当作「没配后端」：各模块退回纯本机模式，不会去打一个不存在的域名
const PLACEHOLDER = 'https://zjtt-api.workers.dev';

// 本地开发：站点由 scripts/preview.mjs 起在 8899（可用 PREVIEW_SITE_PORT 改），
// 后端用 `node server/node.js`（这里按 8795 起；换端口就改这一行，
// 或在控制台 store.set('apiBase', 'http://127.0.0.1:端口') 临时覆盖）
const LOCAL = 'http://127.0.0.1:8795';

class ApiError extends Error {
  constructor(status, code, data) {
    super(code || `HTTP ${status}`);
    this.status = status;
    this.code = code;
    this.data = data || null;
  }
}

function isLocalDev() {
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

const api = {
  get base() {
    const custom = String(store.get('apiBase', '') || '').trim().replace(/\/+$/, '');
    if (custom) return custom;
    if (isLocalDev()) return LOCAL;
    // 站点和函数在同一个项目里（EdgeOne 的自定义域名、预览域都算）就直接同源调，
    // 好处是换域名、换预览地址都不用改代码，也不会因为域名写错打到别人的站上
    if (!/\.github\.io$/i.test(location.hostname)) return location.origin + '/api';
    // 只剩 GitHub Pages 镜像站这种异源情况，才需要绝对地址
    return String(API_BASE || '').replace(/\/+$/, '');
  },

  set base(v) {
    const s = String(v || '').trim().replace(/\/+$/, '');
    if (s) store.set('apiBase', s); else store.del('apiBase');
  },

  // 有没有可用的后端地址（没配好时各模块自动退回本机模式）
  ready() {
    const b = this.base;
    return Boolean(b) && b !== PLACEHOLDER;
  },

  // 本机随机身份：游客点赞、未登录时的「我赞过谁」都靠它
  devId() {
    let v = store.get('likeDev', '');
    if (!v) {
      v = Math.random().toString(36).slice(2, 10);
      store.set('likeDev', v);
    }
    return v;
  },

  token() { return store.get('authToken', '') || ''; },

  async call(path, { method = 'GET', body, timeout = 9000 } = {}) {
    const base = this.base;
    if (!this.ready()) throw new ApiError(0, 'no_api');

    const headers = { Accept: 'application/json', 'X-Dev-Id': this.devId() };
    const token = this.token();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const tmr = ac ? setTimeout(() => ac.abort(), timeout) : 0;
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ac ? ac.signal : undefined,
      });
    } catch (e) {
      throw new ApiError(0, /abort/i.test(String((e && e.name) || e)) ? 'timeout' : 'offline');
    } finally {
      if (tmr) clearTimeout(tmr);
    }

    let data = {};
    try { data = await res.json(); } catch { data = {}; }

    if (!res.ok || (data && data.ok === false)) {
      throw new ApiError(res.status, (data && data.error) || `http_${res.status}`, data);
    }
    return data;
  },

  get(path) { return this.call(path); },
  post(path, body) { return this.call(path, { method: 'POST', body }); },
  put(path, body) { return this.call(path, { method: 'PUT', body }); },
  del(path) { return this.call(path, { method: 'DELETE' }); },
};
return { API_BASE, ApiError, api };
})();

// ---- js/auth.js
const m_auth = await (async () => {
const { h, store, toast } = m_common;
// 账号系统：复用 qdby_chinese 的 Waline 服务端（真实数据库，零部署成本）
// 用户名在内部映射为 <name>@zjtt.local 的邮箱形式，对用户只暴露「用户名 + 密码」。


const SERVER = 'https://textbox.qingdengbuyi.top';
const DOMAIN = 'zjtt.local';
const KEY = { token: 'authToken', user: 'authUser' };

// 用户名归一化：全角→半角（NFKC）、去掉零宽 / 控制字符、裁掉首尾空白。
// 不做这一步会漏出「看起来重名、实际是两个账号」的口子：
//   「Ａlice」「Alice」「Alice<零宽>」「 Alice 」在界面上完全一样，
//   但邮箱分别是 ａlice@zjtt.local / alice@zjtt.local / alice<零宽>@zjtt.local …，
//   服务端的唯一约束管不到它们，于是题库署名、赠礼、排行榜会出现两个同名的人。
// 归一化之后它们都落成 alice@zjtt.local，重名才会被服务端以 USER_EXIST 拦住。
const normalizeName = (raw) => String(raw == null ? '' : raw)
  .normalize('NFKC')
  .replace(/[\u00AD\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g, '')
  .replace(/[\u0000-\u001F\u007F]/g, '')
  .trim();

// 允许的字符：任何语言的字母、数字，加下划线 / 连字符 / 间隔号。
// 不收空格和标点：空格进邮箱会被 Waline 判非法，标点则是各种仿冒重名的主要来源。
const NAME_RE = /^[\p{L}\p{N}_\-·]+$/u;

const enc = (name) => {
  const s = normalizeName(name);
  return s.includes('@') ? s : `${s.toLowerCase()}@${DOMAIN}`;
};
const nameOfMail = (mail) => String(mail || '').replace(new RegExp(`@${DOMAIN}$`, 'i'), '');

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  const token = store.get(KEY.token, '');
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(SERVER + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* 非 JSON 响应 */ }
  if (json && json.errno) {
    // Waline 的错误码不区分场景（errno 1000 既可能是「没这个号」也可能是「密码错」），
    // 能用的只有 errmsg：同名注册固定回 USER_EXIST。把原始码挂到 error 上，别靠猜文案。
    const err = new Error(json.errmsg || `errno ${json.errno}`);
    err.errno = Number(json.errno);
    err.code = String(json.errmsg || '');
    throw err;
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json.data;
}

// 服务端判重的唯一可靠信号
const isNameTaken = (e) => Boolean(e) && (
  e.code === 'USER_EXIST' || /USER_EXIST/i.test(String(e.message || ''))
);


// 给 js/account.js 复用：同一套 token 与错误处理
const wApi = api;
const WALINE = { server: SERVER, domain: DOMAIN };

function persist(user) {
  if (!user) {
    store.set(KEY.token, '');
    store.set(KEY.user, null);
    return null;
  }
  const clean = {
    id: user.objectId, token: user.token, mail: user.email,
    name: user.display_name || nameOfMail(user.email),
    avatar: user.avatar || '', url: user.url || '',
    created: user.createdAt || '',
  };
  store.set(KEY.token, clean.token || '');
  store.set(KEY.user, clean);
  return clean;
}

const auth = {
  get user() { return store.get(KEY.user, null); },
  get token() { return store.get(KEY.token, ''); },
  get logged() { return !!store.get(KEY.token, ''); },

  checkName(name) {
    const s = normalizeName(name);
    if (s.length < 2) return 'tooShort';
    if (s.length > 20) return 'tooLong';
    if (!NAME_RE.test(s)) return 'badChar';
    return '';
  },

  async register(name, pass) {
    // 一律用归一化后的名字注册与判重，免得「Ａlice」「 alice<零宽> 」各占一个号
    const clean = normalizeName(name);
    const bad = this.checkName(clean);
    if (bad) throw new Error(bad);
    if (String(pass || '').length < 6) throw new Error('shortPass');
    const mail = enc(clean);
    try {
      await api('/api/user', { method: 'POST', auth: false, body: { email: mail, password: pass, name: clean, url: '' } });
    } catch (e) {
      // 同名（归一化后落在同一个邮箱）由服务端唯一约束挡住，这里翻译成「已被占用」。
      // 注意：这一步失败时服务端没有写入任何东西，所以不会出现「两个人共用一份存档」。
      if (isNameTaken(e)) throw new Error('nameTaken');
      throw e;
    }
    const user = await api('/api/token', { method: 'POST', auth: false, body: { email: mail, password: pass } });
    const out = persist(user);
    document.dispatchEvent(new CustomEvent('zjtt:login', { detail: out }));
    if (!out.name || out.name === nameOfMail(mail)) {
      try {
        const patched = await api('/api/user', { method: 'PUT', body: { display_name: clean } });
        if (patched && patched.display_name) persist({ ...user, display_name: patched.display_name });
      } catch { /* 昵称补写失败不影响登录 */ }
    }
    return this.user;
  },

  async login(name, pass) {
    let user;
    try {
      user = await api('/api/token', { method: 'POST', auth: false, body: { email: enc(name), password: pass } });
    } catch (e) {
      // 没这个号和密码不对在服务端是同一个错误码，只能给一句合并提示
      if (e && e.errno === 1000 && !e.code) throw new Error('badAuth');
      throw e;
    }
    const clean = persist(user);
    document.dispatchEvent(new CustomEvent('zjtt:login', { detail: clean }));
    return clean;
  },

  logout() { persist(null); },

  // 刷新头像 / 昵称（改完之后拿一次最新资料）
  //
  // 打的是「带 Bearer 的 GET /api/token」：Waline 的 /api/token 只有 POST 需要邮箱密码，
  // 之前这里 POST 一个空 body，固定回 errno 1001（email/password 不能为空），
  // catch 之后原样返回旧资料 —— 所以改完昵称头像，页面上永远不会变。
  // GET 的返回里没有 token 字段，persist 时要把本机的 token 带上，否则等于把自己登出。
  async refresh() {
    if (!this.logged) return null;
    try {
      const data = await api('/api/token');
      if (!data || !data.objectId) return this.user;
      return persist({ ...data, token: this.token });
    } catch {
      return this.user;
    }
  },

  async update(patch) {
    if (!this.logged) throw new Error('needLogin');
    const body = {};
    if (patch.name != null) {
      // 昵称也走同一套归一化与字符规则：它会作为作者名快照写进工坊题目里，
      // 混进零宽字符或全角仿冒字，别人看到的作者名就跟你一模一样了。
      // 例外：名字没改动就放行——早年注册的名字可能不满足新规则，
      // 不能因为改个头像就卡住老用户。
      const n = normalizeName(patch.name);
      const cur = normalizeName(this.user && this.user.name);
      if (n !== cur) {
        const bad = this.checkName(n);
        if (bad) throw new Error(bad);
      }
      body.display_name = n.slice(0, 20);
    }
    if (patch.avatar != null) body.avatar = String(patch.avatar).slice(0, 250);
    if (patch.url != null) body.url = String(patch.url).slice(0, 250);
    await api('/api/user', { method: 'PUT', body });
    const cur = this.user || {};
    return persist({ ...cur, objectId: cur.id, display_name: body.display_name ?? cur.name, avatar: body.avatar ?? cur.avatar, url: body.url ?? cur.url, email: cur.mail, token: this.token, createdAt: cur.created });
  },

  avatarOf(user) {
    const u = user || this.user;
    return (u && u.avatar) || DEFAULT_AVATAR;
  },
};

// ------------------------------------------------------------------ 头像库
// 用 Waline 的 Q 版头像集（qdby_chinese/assets/waline-avatars），构建成 data/avatars-q.json。
// 旧的 assets/avatars/*（立绘裁切）保留，老账号存的路径还能正常显示。
const DEFAULT_AVATAR = 'assets/avatars-q/char-albino.webp';
let AVQ = null;
async function avatarLib() {
  if (AVQ) return AVQ;
  try {
    const r = await fetch('data/avatars-q.json', { cache: 'no-cache' });
    const d = await r.json();
    AVQ = { size: d.size || 96, groups: d.groups || [], items: d.items || [] };
  } catch {
    AVQ = { size: 96, groups: [], items: [] };
  }
  return AVQ;
}

// ------------------------------------------------------------------ 登录弹窗
function openLogin(onDone) {
  if (auth.logged) { if (onDone) onDone(auth.user); return; }
  let mode = 'login';
  const userEl = h('input', { type: 'text', placeholder: '用户名', autocomplete: 'username', maxlength: 20 });
  const passEl = h('input', { type: 'password', placeholder: '密码（至少 6 位）', autocomplete: 'current-password' });
  const pass2El = h('input', { type: 'password', placeholder: '确认密码', autocomplete: 'new-password' });
  const tip = h('p', { class: 'note' }, '');
  const rule = h('p', { class: 'note hide' }, '用户名唯一（不区分大小写，全角会自动转半角），2–20 个字，只能用中文、字母、数字和 _ - ·');
  const btn = h('button', { type: 'button', class: 'btn' }, '登录');
  const tabLogin = h('button', { type: 'button', class: 'link on' }, '登录');
  const tabReg = h('button', { type: 'button', class: 'link' }, '注册');
  const dlg = h('dialog', { class: 'authdlg' },
    h('div', { class: 'authbox' },
      h('div', { class: 'authtabs' }, tabLogin, tabReg),
      h('h3', {}, '战报侦探 · 账号'),
      h('label', { class: 'fld' }, userEl),
      h('label', { class: 'fld' }, passEl),
      h('label', { class: 'fld hide', id: 'auth-p2' }, pass2El),
      rule,
      tip,
      h('div', { class: 'actions' },
        btn,
        h('button', { type: 'button', class: 'btn ghost', onclick: () => dlg.close() }, '取消'))));

  const setMode = (m) => {
    mode = m;
    tabLogin.classList.toggle('on', m === 'login');
    tabReg.classList.toggle('on', m === 'register');
    h; // keep tree stable
    dlg.querySelector('#auth-p2').classList.toggle('hide', m !== 'register');
    rule.classList.toggle('hide', m !== 'register');
    btn.textContent = m === 'login' ? '登录' : '注册并登录';
    passEl.setAttribute('autocomplete', m === 'login' ? 'current-password' : 'new-password');
    tip.textContent = '';
  };
  tabLogin.onclick = () => setMode('login');
  tabReg.onclick = () => setMode('register');

  btn.onclick = async () => {
    // 一律按归一化后的名字提交（全角自动转半角、不可见字符去掉），
    // 并把结果显示回输入框，让用户看清自己到底注册了哪个名字
    const name = normalizeName(userEl.value);
    const pass = passEl.value;
    if (name !== userEl.value) userEl.value = name;
    if (mode === 'register' && pass !== pass2El.value) { tip.textContent = '两次密码不一致'; return; }
    btn.disabled = true;
    tip.textContent = '处理中…';
    try {
      if (mode === 'login') await auth.login(name, pass);
      else await auth.register(name, pass);
      dlg.close();
      dlg.remove();
      toast(`欢迎，${auth.user?.name || name}`);
      if (onDone) onDone(auth.user);
      else location.reload();
    } catch (e) {
      const map = {
        tooShort: '用户名至少 2 个字符', tooLong: '用户名最多 20 个字符',
        badChar: '用户名只能用中文、字母、数字和 _ - ·（不要空格和标点）',
        shortPass: '密码至少 6 位',
        needLogin: '请先登录',
        badAuth: '用户名或密码不对；没注册过就先切到「注册」',
        nameTaken: `用户名「${name}」已经有人用了，换一个，或者切到「登录」`,
      };
      const msg = String(e.message || '');
      tip.textContent = map[msg] || (/USER_EXIST|already|exist|重复/i.test(msg)
        ? `用户名「${name}」已经有人用了，换一个，或者切到「登录」`
        : `失败：${msg}`);
      // 重名时不留在注册 tab（用户会一直试点）：直接切到登录并把名字填好
      if (msg === 'nameTaken' || /USER_EXIST/i.test(msg)) {
        setTimeout(() => { setMode('login'); userEl.value = name; passEl.focus(); }, 900);
      }
    } finally {
      btn.disabled = false;
    }
  };
  passEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });

  document.body.append(dlg);
  dlg.showModal();
  setTimeout(() => userEl.focus(), 50);
}

// 导航栏用的小头像按钮
function avatarChip(size = 26) {
  const u = auth.user;
  return h('a', { class: 'avatar-chip', href: 'profile.html', title: u ? u.name : '登录 / 注册' },
    h('img', { src: auth.avatarOf(u), alt: '', width: size, height: size, loading: 'lazy' }),
    h('span', {}, u ? u.name : '登录'));
}
return { normalizeName, nameOfMail, wApi, WALINE, auth, DEFAULT_AVATAR, avatarLib, openLogin, avatarChip };
})();

// ---- js/cloud.js
const m_cloud = await (async () => {
const { store } = m_common;
const { api } = m_api;
const { auth } = m_auth;
// 云题库：自建后端优先，公共存储兜底。
// 后端顺序：本站后端（server/worker.js 的 puzzles 表，需登录）→ 自建端点（store:cloudUrl）
//           → GitHub Gist（store:ghToken）→ jsonblob.com
// 保存返回 { id, backend }；读取用 load(id)，先问本站，不认识了再按 id 的老后端去找，
// 这样以前传到 jsonblob / Gist 的题仍然打得开。




const PREFIX = 'zjtt-puzzle';
const FILE = 'zjtt-puzzle.json';

const ghToken = {
  get() { return store.get('ghToken', '') || ''; },
  set(v) { store.set('ghToken', String(v || '').trim()); },
};
const customUrl = {
  get() { return store.get('cloudUrl', '') || ''; },
  set(v) { store.set('cloudUrl', String(v || '').trim().replace(/\/+$/, '')); },
};

const cloudConfig = { ghToken, customUrl };

// 记录 id → 后端，读取时优先直达
const idMap = {
  get() { return store.get('cloudMap', {}) || {}; },
  put(id, backend) {
    const m = this.get();
    m[id] = backend;
    store.set('cloudMap', m);
  },
};

// ---------------------------------------------------------------- 后端实现
const jsonblob = {
  id: 'jsonblob',
  label: 'jsonblob.com',
  async save(obj) {
    const r = await fetch('https://jsonblob.com/api/jsonBlob', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(obj),
    });
    const loc = r.headers.get('Location') || '';
    const id = loc.split('/').filter(Boolean).pop() || r.headers.get('X-jsonblob') || '';
    if (!r.ok || !id) throw new Error('jsonblob: ' + r.status);
    return id;
  },
  async load(id) {
    const r = await fetch(`https://jsonblob.com/api/jsonBlob/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('jsonblob: ' + r.status);
    return r.json();
  },
};

const gist = {
  id: 'gist',
  label: 'GitHub Gist',
  async save(obj) {
    const token = ghToken.get();
    if (!token) throw new Error('gist: no token');
    const r = await fetch('https://api.github.com/gists', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
      body: JSON.stringify({ description: PREFIX, public: false, files: { [FILE]: { content: JSON.stringify(obj) } } }),
    });
    if (!r.ok) throw new Error('gist: ' + r.status);
    const j = await r.json();
    return j.id;
  },
  async load(id) {
    const r = await fetch(`https://api.github.com/gists/${encodeURIComponent(id)}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('gist: ' + r.status);
    const j = await r.json();
    const f = j.files && (j.files[FILE] || Object.values(j.files)[0]);
    if (!f) throw new Error('gist: empty');
    const raw = f.content ?? (f.raw_url ? await (await fetch(f.raw_url)).text() : '');
    return JSON.parse(raw);
  },
};

const custom = {
  id: 'custom',
  label: 'custom',
  async save(obj) {
    const base = customUrl.get();
    if (!base) throw new Error('custom: no url');
    const r = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(obj),
    });
    if (!r.ok) throw new Error('custom: ' + r.status);
    const j = await r.json().catch(() => ({}));
    const id = j.id || j.key || j.name || r.headers.get('X-Id') || '';
    if (!id) throw new Error('custom: no id');
    return id;
  },
  async load(id) {
    const base = customUrl.get();
    if (!base) throw new Error('custom: no url');
    const r = await fetch(`${base}/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('custom: ' + r.status);
    return r.json();
  },
};

// 本站后端：题目进 puzzles 表，别人按 id 直接拉，赞数也跟着题目走
const server = {
  id: 'server',
  label: '本站',
  async save(obj) {
    if (!api.ready() || !auth.logged) throw new Error('server: no login');
    const puzzle = (obj && obj.puzzle) || obj;
    let id = String(puzzle.id || '');
    let data = puzzle;
    for (let i = 0; i < 2; i++) {
      try {
        const d = await api.post('/puzzle', { id, payload: data, title: data.title || '' });
        return String(d.id);
      } catch (e) {
        // id 撞了别人的题：换一个再传，不要覆盖
        if (e && e.code === 'dup_id' && i === 0) {
          id = 'w-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
          data = { ...data, id };
          continue;
        }
        throw e;
      }
    }
    throw new Error('server: dup');
  },
  async load(id) {
    const d = await api.get(`/puzzle/${encodeURIComponent(id)}`);
    if (!d || !d.puzzle) throw new Error('server: empty');
    return { kind: PREFIX, v: 2, puzzle: d.puzzle, at: new Date(d.updatedAt || Date.now()).toISOString() };
  },
};

const ALL = { server, jsonblob, gist, custom };

// ---------------------------------------------------------------- 对外接口
const cloud = {
  // 依次尝试，返回 { id, backend }
  async save(puzzle) {
    const body = { kind: PREFIX, v: 2, puzzle, at: new Date().toISOString() };
    const order = [];
    if (api.ready() && auth.logged) order.push(server);
    if (customUrl.get()) order.push(custom);
    if (ghToken.get()) order.push(gist);
    order.push(jsonblob);
    const errs = [];
    for (const b of order) {
      try {
        const id = await b.save(body);
        idMap.put(id, b.id);
        return { id, backend: b.id, label: b.label };
      } catch (e) {
        errs.push(b.id + ': ' + (e.message || e));
      }
    }
    const err = new Error(errs.join(' | '));
    err.detail = errs;
    throw err;
  },

  async load(id) {
    const known = idMap.get()[id];
    const order = known && ALL[known] ? [ALL[known]] : [];
    if (api.ready() && !order.includes(server)) order.push(server);
    for (const b of [custom, gist, jsonblob]) if (!order.includes(b)) order.push(b);
    const errs = [];
    for (const b of order) {
      try {
        const obj = await b.load(id);
        if (!obj) throw new Error('empty');
        idMap.put(id, b.id);
        return obj;
      } catch (e) {
        errs.push(b.id + ': ' + (e.message || e));
      }
    }
    const err = new Error(errs.join(' | '));
    err.detail = errs;
    throw err;
  },

  // 本站题库列表（别人出的题，可按新到旧或按赞数排）
  async list({ sort = 'new', author = '', limit = 20, offset = 0 } = {}) {
    if (!api.ready()) throw new Error('server: no api');
    const qs = new URLSearchParams({ sort, limit: String(limit), offset: String(offset) });
    if (author) qs.set('author', author);
    const d = await api.get(`/puzzles?${qs.toString()}`);
    return { items: d.items || [], total: Number(d.total) || 0 };
  },

  // 是否配置了「更稳」的后端（用来在 UI 上提示）
  ready() { return Boolean(api.ready() || ghToken.get() || customUrl.get()); },
};
return { cloudConfig, cloud };
})();

// ---- js/gamestats.js
const m_gamestats = await (async () => {

// 各小游戏的本机进度汇总。
//
// 个人中心要「一个页面看到所有游戏的数据」，但九个游戏各写各的存档键，
// 有的用 store（JSON），有的用 localStorage 裸字符串，有的根本不在 zjtt 命名空间
// （挂机版是 morimens-idle-*，弥萨格大逃杀是 morimens-deathreport-*）。
// 这里只做一件事：把全部键读成一个结构化的结果，读不到的字段给 0 / 空，
// 让页面永远有东西可显示，而不是「这一块没接」。
//
// 三条约束：
//   · 只读，不写、不发请求 —— 任何页面都能安全 import；
//   · 全部 try/catch —— 无痕模式下 localStorage 会抛，不能连累整页；
//   · 键名必须和各游戏里的字面量一致，改名请一起改（下面每组都标了出处）。

const RD = (k) => { try { const v = localStorage.getItem('zjtt:' + k); return v == null ? null : JSON.parse(v); } catch { return null; } };
const RAW = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const arr = (v) => (Array.isArray(v) ? v : []);

// 数字键既可能是 JSON（store.set）也可能是裸字符串（游戏里直接 setItem），
// JSON.parse 对 "123" 和 123 都成立，所以统一走 RD。
const numKey = (k) => n(RD(k));

// 秒 → 「12 小时 30 分」。挂机版的时长要能一眼看懂，不要 45213 这种数字
const fmtDur = (s) => {
  s = Math.max(0, Math.round(n(s)));
  if (!s) return '—';
  if (s < 60) return s + ' 秒';
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h} 小时 ${m} 分` : `${m} 分钟`;
};

const DIFF_MERGE = [
  { k: 'easy', n: '简单' }, { k: 'normal', n: '普通' }, { k: 'hard', n: '困难' }, { k: 'frenzy', n: '癫狂' },
];
const DIFF_BIRD = [
  { k: 'easy', n: '简单' }, { k: 'normal', n: '普通' }, { k: 'hard', n: '困难' }, { k: 'mad', n: '癫狂' },
];

// ------------------------------------------------------------------ 各游戏
function detective() {
  const st = RD('stats') || {};
  const hist = arr(RD('hist'));
  const played = n(st.played);
  const won = n(st.won);
  const failed = arr(RD('failed')).length;
  return {
    played, won,
    items: [
      { k: '已玩', v: String(played) },
      { k: '胜率', v: played ? Math.round((won / played) * 100) + '%' : '—' },
      { k: '最高分', v: String(n(st.best)) },
    ],
    extra: failed ? `失败题库 ${failed} 题` : (hist.length ? `最近一次 ${String(new Date(n(hist[0] && hist[0].at) || Date.now()).toLocaleDateString('zh-CN'))}` : ''),
  };
}

function merge() {
  const all = numKey('merge:best');
  const byDiff = DIFF_MERGE.map((d) => ({ ...d, v: numKey('merge:best:' + d.k) }));
  const skins = arr(RD('merge:skins')).filter((x) => n(x) > 0).length;
  const bestDiff = byDiff.filter((d) => d.v > 0).sort((a, c) => c.v - a.v)[0];
  return {
    items: [
      { k: '最高分', v: all ? String(all) : '—' },
      { k: '最顺手', v: bestDiff ? bestDiff.n : '—' },
      { k: '换皮', v: skins ? `${skins}/9` : '原样' },
    ],
    extra: byDiff.filter((d) => d.v > 0).map((d) => `${d.n} ${d.v}`).join(' · '),
  };
}

function bird() {
  const lvAll = numKey('bird:bestLv');
  const scAll = numKey('bird:best');
  const byDiff = DIFF_BIRD.map((d) => ({ ...d, lv: numKey('bird:bestLv:' + d.k), sc: numKey('bird:best:' + d.k) }));
  return {
    items: [
      { k: '最深层数', v: lvAll ? `${lvAll} 层` : '—' },
      { k: '最高分', v: scAll ? String(scAll) : '—' },
      { k: '下过难度', v: String(byDiff.filter((d) => d.lv > 0).length) + '/4' },
    ],
    extra: byDiff.filter((d) => d.lv > 0).map((d) => `${d.n} ${d.lv} 层`).join(' · '),
  };
}

function binding() {
  const m = RD('binding') || null;
  const st = (m && m.stats) || {};
  return {
    items: [
      { k: '最深纪录', v: st.bestFloor ? `第 ${st.bestFloor} 层` : '—' },
      { k: '通关次数', v: String(n(st.clears)) },
      { k: '首领击杀', v: String(n(st.bossKills)) },
    ],
    extra: st.runs ? `共 ${n(st.runs)} 局 · 死亡 ${n(st.deaths)} 次` : '',
  };
}

function idle() {
  // 挂机版是独立子项目，键不带 zjtt: 前缀（idle/src/ui/util.js 的 KEY）
  let s = null;
  try { s = JSON.parse(RAW('morimens-idle-save-v1') || 'null'); } catch { s = null; }
  if (!s) return { items: [{ k: '存档', v: '未开始' }], extra: '' };
  const team = s.roster && typeof s.roster === 'object' ? Object.keys(s.roster).length : 0;
  const sec = n(s.play);
  return {
    items: [
      { k: '时长', v: sec ? fmtDur(sec) : '—' },
      { k: '最高关卡', v: String(n(s.maxStage)) },
      { k: '拥有角色', v: String(team) },
    ],
    extra: `当前第 ${n(s.stage) || 1} 关` + (s.gold != null ? ` · 金币 ${n(s.gold)} · 券 ${n(s.tickets)} · 核心 ${n(s.cores)}` : ''),
    // 同一句带图标版：券 = 流明之芯、核心 = 银芯（都用原作图标，跟挂机版顶栏一致）
    extraHtml: s.gold != null
      ? `金币 ${n(s.gold)} · <img class="ico-inl" src="assets/ui/lumen.webp" alt="召唤券">${n(s.tickets)}`
        + ` · <img class="ico-inl" src="assets/ui/silvercore.webp" alt="银芯">${n(s.cores)}`
      : '',
  };
}

function survivors() {
  const p = RD('survivors:progress') || {};
  const best = numKey('survivors:best');
  return {
    items: [
      { k: '最高分', v: best ? String(best) : '—' },
      { k: '通关角色', v: String(arr(p.clears).length) },
      { k: '累计局数', v: String(n(p.runs)) },
    ],
    extra: arr(p.diffs).length ? `通关难度：${arr(p.diffs).join(' / ')}` : (n(p.bosses) ? `击败强敌 ${n(p.bosses)} 只` : ''),
  };
}

function protocol() {
  // 2026-10 之后才记的键（js/pf/ui.js 的 showEnd）；老玩家这里会是空，显示「—」就行
  const b = RD('pf:best') || null;
  return {
    items: [
      { k: '最远波次', v: b && b.wave ? `第 ${n(b.wave)} 波` : '—' },
      { k: '最高分', v: b && b.score ? String(n(b.score)) : '—' },
      { k: '守住次数', v: String(n(b && b.wins)) },
    ],
    extra: b && b.runs ? `共 ${n(b.runs)} 局` : '',
  };
}

function wolf() {
  const st = RD('wolf:stat') || null;
  const runs = n(st && st.n);
  const win = n(st && st.win);
  return {
    items: [
      { k: '局数', v: String(runs) },
      { k: '胜场', v: String(win) },
      { k: '胜率', v: runs ? Math.round((win / runs) * 100) + '%' : '—' },
    ],
    extra: '',
  };
}

function reign() {
  // js/reign.js 的键：best {runs, bestDay, bestEnd, gold} / endings {结局id: 次数}
  const best = RD('reign:best') || {};
  const end = RD('reign:endings') || {};
  const got = Object.keys(end).length;
  return {
    items: [
      { k: '当过几任', v: n(best.runs) ? String(n(best.runs)) : '—' },
      { k: '最长任期', v: n(best.bestDay) ? '第 ' + n(best.bestDay) + ' 天' : '—' },
      { k: '结局', v: got + ' / 15' },
    ],
    extra: best.gold ? '拿到过「守灯人」' : (got ? '还有 ' + (15 - got) + ' 个结局没见过' : ''),
  };
}

function g2048() {
  // js/g2048.js 的 KEY：best 全难度 / best:<难度> / seen 历史合到过的最大块
  const best = numKey('g2048:best');
  const seen = numKey('g2048:seen');
  const byDiff = [['classic', '4×4'], ['wide', '5×5'], ['brutal', '3×3']]
    .map(([k, n]) => ({ n, v: numKey('g2048:best:' + k) }));
  const played = byDiff.filter((d) => d.v > 0);
  return {
    items: [
      { k: '最高分', v: best ? String(best) : '—' },
      { k: '最高块', v: seen ? String(seen) : '—' },
      { k: '下过棋盘', v: played.length + '/3' },
    ],
    extra: played.map((d) => `${d.n} ${d.v}`).join(' · '),
  };
}

function deathreport() {
  // 本篇 + 往届两届，各自一个存档键（deathreport/js/ui.js 的 EDS）
  const EDS = [
    ['本篇', 'morimens-deathreport-save-v1'],
    ['62届', 'morimens-deathreport-save-ed62-v1'],
    ['61届', 'morimens-deathreport-save-ed61-v1'],
  ];
  let recovered = 0;
  let docs = 0;
  let done = 0;
  const parts = [];
  for (const [tag, key] of EDS) {
    let s = null;
    try { s = JSON.parse(RAW(key) || 'null'); } catch { s = null; }
    if (!s) continue;
    const r = arr(s.recovered).length;
    const d = arr(s.docs).length;
    recovered += r;
    docs += d;
    if (s.ended) done += 1;
    parts.push(`${tag} ${r} 条`);
  }
  return {
    items: [
      { k: '已复原', v: String(recovered) },
      { k: '结案', v: String(done) },
      { k: '归档卷宗', v: String(docs) },
    ],
    extra: parts.join(' · '),
  };
}

// 卡片顺序 = 首页的排列顺序，用户不用重新认路
const GAMES = [
  { k: 'detective', n: '战报侦探', href: 'detective.html', icon: '🔍', read: detective, tip: '六边形自走棋推演' },
  { k: 'merge', n: '合成大杜勒', href: 'merge.html', icon: '⚫', read: merge, tip: '两个同级合成下一级' },
  { k: 'bird', n: '是鸟弟就下100层', href: 'bird.html', icon: '🐤', read: bird, tip: '往下跳，别被扎到' },
  { k: 'binding', n: '校猫的结合', href: 'binding.html', icon: '🐱', read: binding, tip: '地牢射击' },
  { k: 'idle', n: '弥萨格挂机版', href: 'idle/', icon: '🏰', read: idle, tip: '五人队爬塔' },
  { k: 'survivors', n: '唤醒体幸存者', href: 'survivors.html', icon: '✨', read: survivors, tip: '15 分钟一局' },
  { k: 'protocol', n: '忘却协议', href: 'protocol.html', icon: '⬡', read: protocol, tip: '守住十二波' },
  { k: 'wolf', n: '弥萨格狼人杀', href: 'wolf.html', icon: '🐺', read: wolf, tip: '身份推理' },
  { k: 'deathreport', n: '弥萨格大逃杀', href: 'deathreport/', icon: '📄', read: deathreport, tip: '档案式复盘' },
  { k: 'g2048', n: '忘却 2048', href: '2048.html', icon: '🔢', read: g2048, tip: '两块同样的合流' },
  { k: 'reign', n: '忘却王权', href: 'reign.html', icon: '👑', read: reign, tip: '准或不准，四项账' },
];

// 一次性读全部：页面只调这一个
function readAll() {
  const out = {};
  for (const g of GAMES) {
    try { out[g.k] = g.read(); } catch { out[g.k] = { items: [], extra: '' }; }
  }
  return out;
}

// 银芯钱包（所有小游戏共用 zjtt:credits）
const credits = () => numKey('credits');

// ------------------------------------------------------------------ 后台渲染表
// 站长后台按这张表把 digest() 的数字翻成人话。顺序必须和下面 digest() 的数组一致
// （改一个键就要改两处，别只改这边）。
const GD_SPEC = [
  { k: 'dr', n: '战报侦探', f: (v) => {
    const played = n(v[0]);
    const won = n(v[1]);
    return [['已玩', played + ' 局'], ['胜场', won + ' 局'],
      ['胜率', played ? Math.round((won / played) * 100) + '%' : '—'],
      ['最高分', v[2] ? String(n(v[2])) : '—']];
  } },
  { k: 'mg', n: '合成大杜勒', f: (v) => [['最高分', v[0] ? String(n(v[0])) : '—']] },
  { k: 'bd', n: '是鸟弟就下100层', f: (v) => [
    ['最深层数', v[0] ? n(v[0]) + ' 层' : '—'],
    ['最高分', v[1] ? String(n(v[1])) : '—'],
  ] },
  { k: 'bn', n: '校猫的结合', f: (v) => [
    ['最深楼层', v[0] ? '第 ' + n(v[0]) + ' 层' : '—'],
    ['通关次数', n(v[1]) + ' 次'],
    ['首领击杀', String(n(v[2]))],
    ['总对局', n(v[3]) + ' 局'],
  ] },
  { k: 'il', n: '弥萨格挂机版', f: (v) => [
    ['游戏时长', fmtDur(v[0])],
    ['拥有角色', n(v[1]) + ' 名'],
    ['最高关卡', v[2] ? '第 ' + n(v[2]) + ' 关' : '—'],
    ['当前关卡', v[3] ? '第 ' + n(v[3]) + ' 关' : '—'],
    ['金币', String(n(v[4]))],
  ] },
  { k: 'sv', n: '唤醒体幸存者', f: (v) => [
    ['最高分', v[0] ? String(n(v[0])) : '—'],
    ['累计局数', n(v[1]) + ' 局'],
    ['通关角色', n(v[2]) + ' 名'],
  ] },
  { k: 'pf', n: '忘却协议', f: (v) => [
    ['最远波次', v[0] ? '第 ' + n(v[0]) + ' 波' : '—'],
    ['最高分', v[1] ? String(n(v[1])) : '—'],
    ['守住次数', n(v[2]) + ' 次'],
  ] },
  { k: 'wf', n: '弥萨格狼人杀', f: (v) => {
    const runs = n(v[0]);
    const win = n(v[1]);
    return [['局数', runs + ' 局'], ['胜场', win + ' 局'],
      ['胜率', runs ? Math.round((win / runs) * 100) + '%' : '—']];
  } },
  { k: 'dt', n: '弥萨格大逃杀', f: (v) => [
    ['已复原', n(v[0]) + ' 条'],
    ['归档卷宗', String(n(v[1]))],
    ['结案', n(v[2]) + ' 届'],
    ['提交报告', v[3] ? n(v[3]) + ' 份' : '—'],
    ['确认报告', v[4] ? n(v[4]) + ' 份' : '—'],
    ['正确率', n(v[3]) ? Math.round((n(v[4]) / n(v[3])) * 100) + '%' : '—'],
  ] },
  { k: 'g2', n: '忘却 2048', f: (v) => [
    ['最高分', v[0] ? String(n(v[0])) : '—'],
    ['最高块', v[1] ? String(n(v[1])) : '—'],
  ] },
];


// ------------------------------------------------------------------ 上报用的摘要
// 云端档案（js/account.js 的 snapshot）只带「数字」，不带各游戏的整份存档：
//   · 挂机存档动辄上百 KB，整份上云会顶穿 /account 的请求体；
//   · 后台只需要「多少人玩、玩到哪」。
// 键名两个字母，数组顺序固定（下面 admin 的渲染表按同样的顺序读，改一处要改两处）：
//   dr 侦探 [已玩, 胜场, 最高分]      mg 合成 [最高分]        bd 鸟弟 [最深层, 最高分]
//   bn 结合 [最深楼层, 通关, 首领, 局数]
//   il 挂机 [时长秒, 拥有角色, 最高关, 当前关, 金币]
//   sv 幸存者 [最高分, 局数, 通关角色] pf 协议 [最远波, 最高分, 守住]
//   wf 狼人 [局数, 胜场]             dt 报告 [已复原, 卷宗, 结案, 提交报告数, 确认报告数]
//   g2 2048 [最高分, 最高块]
// 单调递增的量（最好成绩、累计局数、时长），服务端合并时逐项取大即可。
function digest() {
  const out = { at: Date.now() };
  const st = RD('stats') || {};
  out.dr = [n(st.played), n(st.won), n(st.best)];
  out.mg = [numKey('merge:best')];
  out.bd = [numKey('bird:bestLv'), numKey('bird:best')];
  const bm = RD('binding') || null;
  const bs = (bm && bm.stats) || {};
  out.bn = [n(bs.bestFloor), n(bs.clears), n(bs.bossKills), n(bs.runs)];
  let s = null;
  try { s = JSON.parse(RAW('morimens-idle-save-v1') || 'null'); } catch { s = null; }
  if (s) out.il = [Math.floor(n(s.play)), (s.roster && typeof s.roster === 'object' ? Object.keys(s.roster).length : 0), n(s.maxStage), n(s.stage), n(s.gold)];
  const sv = RD('survivors:progress') || {};
  out.sv = [numKey('survivors:best'), n(sv.runs), arr(sv.clears).length];
  const pf = RD('pf:best') || {};
  out.pf = [n(pf.wave), n(pf.score), n(pf.wins)];
  const wf = RD('wolf:stat') || {};
  out.wf = [n(wf.n), n(wf.win)];
  let rec = 0, docs = 0, done = 0, sub = 0, okRep = 0;
  for (const key of ['morimens-deathreport-save-v1', 'morimens-deathreport-save-ed62-v1', 'morimens-deathreport-save-ed61-v1']) {
    let d = null;
    try { d = JSON.parse(RAW(key) || 'null'); } catch { d = null; }
    if (!d) continue;
    rec += arr(d.recovered).length;
    docs += arr(d.docs).length;
    if (d.ended) done += 1;
    // 提交过的报告 = 已确认的 + 每份报告交错过的次数（missed）；确认数用 confirmed 里的真值
    const okN = Object.values(d.confirmed || {}).filter(Boolean).length;
    okRep += okN;
    sub += okN + Object.values(d.missed || {}).reduce((a, x) => a + n(x), 0);
  }
  out.dt = [rec, docs, done, sub, okRep];
  out.g2 = [numKey('g2048:best'), numKey('g2048:seen')];
  return out;
}
return { fmtDur, DIFF_MERGE, DIFF_BIRD, GAMES, readAll, credits, GD_SPEC, digest };
})();

// ---- js/account.js
const m_account = await (async () => {
const { store, wallet, failedBank, unlocked, STAT0, toast, t } = m_common;
const { auth, wApi, nameOfMail } = m_auth;
const { api } = m_api;
const { digest } = m_gamestats;
// 账号云端档案
// 把「积分 / 解锁 CG / 失败题库 / 推理记录 / 工坊导入的战报 / 偏好唤醒体 / 背景主题 /
// 小游戏最高分」打包成一份文档存到自己的后端（server/worker.js 的 accounts 表），
// 换设备登录即可恢复。
//
// 说明：
//  · 每条档案带版本号：写入时比对版本，对不上说明别处先写过，合并后再推，多端不会互相覆盖。
//  · 老用户的数据还留在 Waline 的评论里，第一次连上新后端时会自动搬过来（只搬一次）。
//  · 后端不可用时退回 Waline 老路径读写，功能不至于整块消失。





const MAGIC = 'ZJ1D:';
const K = { doc: 'acctDoc', obj: 'acctObj', at: 'acctAt', pend: 'acctPend', ver: 'acctVer' };
const CAP = { hist: 300, mine: 40 };
const MAX_AGE = 5 * 60e3;      // 5 分钟内不重复拉取
const PUSH_DELAY = 1500;       // 改动后延迟推送，避免连点产生大量请求

// ------------------------------------------------------------------ 编码
const fnv = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
const pathOf = (u) => `/zjtt/u/${u.id}-${fnv(String(u.mail || u.name || ''))}`;

function b64e(str) {
  const b = new TextEncoder().encode(str);
  let s = '';
  for (let i = 0; i < b.length; i += 4096) s += String.fromCharCode(...b.subarray(i, i + 4096));
  return btoa(s);
}
function b64d(s) {
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '').trim();

function decodeDoc(item) {
  const raw = String(item.orig || stripTags(item.comment) || '');
  if (!raw.startsWith(MAGIC)) return null;
  try {
    const doc = JSON.parse(b64d(raw.slice(MAGIC.length)));
    return doc && typeof doc === 'object' ? doc : null;
  } catch { return null; }
}

// ------------------------------------------------------------------ 本机快照 / 回写
function snapshot() {
  const prof = store.get('profile', { favs: [] });
  return {
    v: 1, at: Date.now(),
    cr: wallet.get(),
    cg: unlocked.list(),
    fb: failedBank.list(),
    st: { ...STAT0, ...(store.get('stats', null) || {}) },
    fv: prof.favs || [],
    mp: store.get('myPuzzles', []),
    hi: store.get('hist', []),
    th: store.get('theme', null),
    ck: store.get('checkin', null),
    gr: store.get('gr', []),
    // 点赞：赞过谁（lk）、今日额度（ld）、作者已结算的赞数（lc）
    lk: store.get('likeVote', {}),
    ld: store.get('likeDay', null),
    lc: store.get('likeCredited', {}),
    // 合成大杜勒的最高分：游戏页只认 'merge:best' 这一个键（它自己也能单机跑），
    // 这里把它一起带上档案，换设备登录就能拿回来。
    mb: mergeBest(),
    // 是鸟弟就下100层：bb = 最深到达的层数，bs = 最高分。
    // 同样是「游戏页自己也能跑」的键（zjtt:bird:bestLv / zjtt:bird:best），这里只负责带上档案。
    bb: birdBest().lv,
    bs: birdBest().sc,
    // 九个游戏的「进度摘要」，只给个人中心 / 站长后台看（js/gamestats.js 的 digest）。
    // 各游戏的真实存档仍然只在本机：结合 / 幸存者 / 协议 / 狼人 / 报告 / 挂机都是大对象，
    // 整份上云会顶穿请求体；换设备靠「加密存档整包搬」。
    gd: digest(),
  };
}

// 是鸟弟就下100层的纪录。键名与 js/bird.js 用的一致，store 读 JSON、
// 游戏写纯数字字符串，两种格式 JSON.parse 都吃得下。
const BIRD_LV = 'bird:bestLv';
const BIRD_SC = 'bird:best';
const birdBest = () => ({
  lv: Math.max(0, Math.round(Number(store.get(BIRD_LV, 0)) || 0)),
  sc: Math.max(0, Math.round(Number(store.get(BIRD_SC, 0)) || 0)),
});
const setBirdBest = (lv, sc) => {
  const cur = birdBest();
  const nlv = Math.max(cur.lv, Math.max(0, Math.round(Number(lv) || 0)));
  const nsc = Math.max(cur.sc, Math.max(0, Math.round(Number(sc) || 0)));
  if (nlv > cur.lv) store.set(BIRD_LV, nlv);
  if (nsc > cur.sc) store.set(BIRD_SC, nsc);
  return { lv: nlv, sc: nsc };
};

// 合成大杜勒的最高分。键名与 js/merge.js 用的是同一个（zjtt:merge:best），
// store 读的是 JSON、游戏写的是纯数字字符串，两种格式 JSON.parse 都吃得下，老存档不会丢。
const MERGE_BEST = 'merge:best';
const mergeBest = () => Math.max(0, Math.round(Number(store.get(MERGE_BEST, 0)) || 0));
const setMergeBest = (v) => {
  const n = Math.max(0, Math.round(Number(v) || 0));
  if (n > mergeBest()) store.set(MERGE_BEST, n);
  return mergeBest();
};

function apply(d) {
  if (!d) return;
  store.set('credits', Math.max(0, Number(d.cr) || 0));
  store.set('cg', Array.isArray(d.cg) ? d.cg : []);
  store.set('failed', Array.isArray(d.fb) ? d.fb : []);
  // 云端可能是旧版 / 空对象，回写时补齐默认字段，否则界面会显示 undefined
  if (d.st && typeof d.st === 'object') store.set('stats', { ...STAT0, ...d.st });
  if (Array.isArray(d.fv)) {
    const prof = store.get('profile', { favs: [] });
    prof.favs = d.fv.map(String);
    delete prof.name;                       // 旧版本地昵称，已废弃
    store.set('profile', prof);
  }
  if (Array.isArray(d.mp)) store.set('myPuzzles', d.mp);
  if (Array.isArray(d.hi)) store.set('hist', d.hi);
  if (d.th) store.set('theme', d.th);
  if (d.ck && typeof d.ck === 'object') store.set('checkin', d.ck);
  if (Array.isArray(d.gr)) store.set('gr', uniq(d.gr));
  if (d.lk && typeof d.lk === 'object') store.set('likeVote', d.lk);
  if (d.ld && typeof d.ld === 'object') store.set('likeDay', d.ld);
  if (d.lc && typeof d.lc === 'object') store.set('likeCredited', d.lc);
  // 最高分只增不减：云端比本机低（本机多打了一局还没推上去）时保留本机的
  if (d.mb != null) setMergeBest(d.mb);
  if (d.bb != null || d.bs != null) setBirdBest(d.bb, d.bs);
  // 告诉页面「档案刚落下来」，合成大杜勒靠这个把云端分数显示出来
  try { document.dispatchEvent(new CustomEvent('zjtt:acct', { detail: d })); } catch { /* 无 DOM 环境 */ }
}

// ------------------------------------------------------------------ 合并
const uniq = (a) => [...new Set((a || []).map(String))];
const numMax = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

function mergeStats(a = {}, b = {}) {
  const out = { ...STAT0 };
  for (const k of new Set([...Object.keys(a || {}), ...Object.keys(b || {})])) {
    if (k === 'last') out.last = String(a.last || '') > String(b.last || '') ? a.last : b.last;
    else out[k] = numMax(a[k], b[k]);
  }
  return out;
}

function mergeHist(a = [], b = []) {
  const map = new Map();
  for (const e of [...a, ...b]) {
    if (!e || !e.i) continue;
    const key = `${e.i}|${e.at || 0}`;
    if (!map.has(key) || (Number(e.at) || 0) > (Number(map.get(key).at) || 0)) map.set(key, e);
  }
  return [...map.values()].sort((x, y) => (Number(y.at) || 0) - (Number(x.at) || 0)).slice(0, CAP.hist);
}

// 签到状态：取「最近签到的那个日期更大」的一份，顺带把天数取大（防回退）
function pickCheckin(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ka = String(a.last || ''), kb = String(b.last || '');
  const win = ka === kb ? (Number(a.streak) || 0) >= (Number(b.streak) || 0) ? a : b : (ka > kb ? a : b);
  return { ...win, streak: Math.max(Number(a.streak) || 0, Number(b.streak) || 0), total: Math.max(Number(a.total) || 0, Number(b.total) || 0) };
}

function mergeMine(a = [], b = []) {
  const map = new Map();
  for (const p of [...a, ...b]) {
    if (!p) continue;
    const key = String(p.id || p.uuid || '');
    if (!key) continue;
    const prev = map.get(key);
    if (!prev || (Number(p.at || 0) >= Number(prev.at || 0))) map.set(key, p);
  }
  return [...map.values()].slice(-CAP.mine);
}

// 点赞：赞过谁的记录、作者结算基准都取「更大的数」，今日额度取当天更大的那份
function mergeLikes(a = {}, b = {}) {
  const out = {};
  for (const [k, v] of [...Object.entries(a || {}), ...Object.entries(b || {})]) {
    if (v == null) continue;
    out[k] = Math.max(Number(out[k]) || 0, Number(v) || 0);
  }
  return out;
}

function pickQuota(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const ka = String(a.d || ''), kb = String(b.d || '');
  if (ka !== kb) return ka > kb ? a : b;
  return { d: a.d, n: Math.max(Number(a.n) || 0, Number(b.n) || 0) };
}

// 九个游戏的进度摘要（gd）：都是一路只增不减的量，逐项取大就行。
// 手机和电脑各玩一半的情况，合起来正好是「这台玩过的最高分 + 那台玩过的最深关」。
function mergeDigest(a = {}, b = {}) {
  const A = a && typeof a === 'object' ? a : {};
  const B = b && typeof b === 'object' ? b : {};
  const out = { at: Math.max(Number(A.at) || 0, Number(B.at) || 0) };
  for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
    if (k === 'at') continue;
    const x = A[k];
    const y = B[k];
    if (Array.isArray(x) || Array.isArray(y)) {
      const ax = Array.isArray(x) ? x : [];
      const ay = Array.isArray(y) ? y : [];
      const len = Math.max(ax.length, ay.length);
      const row = [];
      for (let i = 0; i < len; i++) row.push(Math.max(Number(ax[i]) || 0, Number(ay[i]) || 0));
      out[k] = row;
    } else {
      out[k] = Math.max(Number(x) || 0, Number(y) || 0);
    }
  }
  return out;
}

// base = 上次和云端对齐时的银芯数（crBase）。有 base 时钱包按「流水」合并：
//   云端当前值 + 本机自上次对齐以来的增减，所以一台设备花掉的银芯、另一台赚到的银芯都不会被「取大」吃掉。
//   没有 base（第一次同步）才退回取大，免得老档案丢钱。
function mergeDoc(remote = {}, local = {}, base = null) {
  const st = mergeStats(remote.st, local.st);
  return {
    v: 1,
    at: Math.max(Number(remote.at) || 0, Number(local.at) || 0),
    cr: Number.isFinite(Number(base)) && base !== null
      ? Math.max(0, Math.round((Number(remote.cr) || 0) + (Number(local.cr) || 0) - Number(base)))
      : numMax(remote.cr, local.cr),
    cg: uniq([...(remote.cg || []), ...(local.cg || [])]),
    fb: uniq([...(remote.fb || []), ...(local.fb || [])]),
    st,
    fv: (local.fv && local.fv.length) ? uniq(local.fv) : uniq(remote.fv),
    mp: mergeMine(remote.mp, local.mp),
    hi: mergeHist(remote.hi, local.hi),
    th: local.th || remote.th || null,
    ck: pickCheckin(remote.ck, local.ck),
    gr: uniq([...(remote.gr || []), ...(local.gr || [])]),
    lk: mergeLikes(remote.lk, local.lk),
    ld: pickQuota(remote.ld, local.ld),
    lc: mergeLikes(remote.lc, local.lc),
    mb: numMax(remote.mb, local.mb),
    bb: numMax(remote.bb, local.bb),
    bs: numMax(remote.bs, local.bs),
    gd: mergeDigest(remote.gd, local.gd),
  };
}

// ------------------------------------------------------------------ 读写远端
let busy = false;
let timer = null;
let pending = false;

async function pull() {
  if (!auth.logged) return null;
  if (!api.ready()) return pullLegacy();

  try {
    const d = await api.get('/account');
    store.set(K.ver, Number(d.ver) || 0);
    if (d.doc) return d.doc;

    // 新库里还没有这份档案：把 Waline 里的老档案接过来，下次 push 就落进新库
    const legacy = await pullLegacy().catch(() => null);
    if (legacy) {
      store.set(K.ver, 0);
      try { toast(t('acctMigrated')); } catch { /* 页面还没挂 body */ }
    }
    return legacy;
  } catch (e) {
    if (e && e.status === 401) return null;
    // 后端暂时不可用：退回老路径读，至少还能拿到上次的数据
    return pullLegacy().catch(() => null);
  }
}

// 老路径：档案藏在用户自己的一条 Waline 评论里
async function pullLegacy() {
  const u = auth.user;
  const res = await wApi(`/api/comment?path=${encodeURIComponent(pathOf(u))}&pageSize=20&sortBy=insertedAt_desc`);
  const list = (res && res.data) || [];
  const mine = list.filter((c) => String(c.user_id) === String(u.id));
  const hit = mine.map((c) => ({ c, d: decodeDoc(c) })).find((x) => x.d);
  if (!hit) return null;
  store.set(K.obj, hit.c.objectId);
  return hit.d;
}

// 新后端：版本号对不上就合并重推，最多两轮
async function pushRemote(input) {
  let doc = input;
  let ver = Number(store.get(K.ver, 0)) || 0;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await api.put('/account', { doc, ver });
      return { ver: Number(r.ver) || ver + 1, doc };
    } catch (e) {
      if (!(e && e.status === 409 && e.data && e.data.doc)) throw e;
      const merged = mergeDoc(e.data.doc, doc, store.get('crBase', null));
      apply(merged);
      doc = merged;
      ver = Number(e.data.ver) || 0;
    }
  }
  throw new Error('conflict');
}

async function pushLegacy(doc) {
  const u = auth.user;
  const body = MAGIC + b64e(JSON.stringify(doc));
  const obj = store.get(K.obj, '');
  if (obj) {
    await wApi(`/api/comment/${obj}`, { method: 'PUT', body: { comment: body } });
  } else {
    const made = await wApi('/api/comment', { method: 'POST', body: { comment: body, url: pathOf(u), ua: 'zjtt/1' } });
    if (made && made.objectId) store.set(K.obj, made.objectId);
  }
}

async function push() {
  if (!auth.logged) return { ok: false, why: 'guest' };
  if (busy) { schedule(2500); return { ok: false, why: 'busy' }; }
  busy = true;
  const doc = snapshot();
  try {
    if (api.ready()) {
      const r = await pushRemote(doc);
      store.set(K.ver, r.ver);
      store.set('crBase', Number(r.doc && r.doc.cr) || 0);
    } else {
      await pushLegacy(doc);
      store.set('crBase', Number(doc.cr) || 0);
    }
    store.set(K.at, Date.now());
    store.set(K.pend, false);
    store.set(K.doc, doc);
    return { ok: true, at: doc.at };
  } catch (e) {
    pending = true;
    store.set(K.pend, true);
    // 「Comment too fast!」是 Waline 的发帖频率限制：等一会儿再补
    if (/too fast|rate/i.test(String(e.message || ''))) {
      clearTimeout(timer);
      timer = setTimeout(() => { push(); }, 25e3);
      return { ok: false, why: 'slow' };
    }
    return { ok: false, why: String(e.message || 'error') };
  } finally {
    busy = false;
  }
}

function schedule(delay = PUSH_DELAY) {
  if (!auth.logged) return;
  store.set(K.pend, true);
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => { push(); }, delay);
}

// ------------------------------------------------------------------ 赠礼（data/grants.json）
// 直接改别人的云端评论需要管理员权限，所以「给某个账号发银芯」做成站内赠礼：
// 配置在 data/grants.json 里，登录同步时按用户名匹配、幂等领取，领过的 id 写进档案 gr。
let GRANTS = null;
async function grants() {
  if (GRANTS) return GRANTS;
  try {
    const r = await fetch('data/grants.json', { cache: 'no-cache' });
    const d = await r.json();
    GRANTS = Array.isArray(d.grants) ? d.grants : [];
  } catch { GRANTS = []; }
  return GRANTS;
}

// 云端赠礼：管理员在后台发的（edge-functions 的 /grants/mine）。
// 服务端已经按 uid 过滤过，这里只负责和本地「已领过」的记录对账，
// 所以拿不到后端时就是空数组，不影响静态 grants.json 那条路。
async function cloudGrants() {
  if (!api.ready()) return [];
  try {
    const r = await api.get('/grants/mine');
    return Array.isArray(r.items) ? r.items : [];
  } catch { return []; }
}

async function claimGrants() {
  if (!auth.logged) return 0;
  const list = await grants();
  // 按「登录名」匹配，不按昵称：昵称谁都能改，也可能和别人重名，
  // 用它当钥匙会漏领（改名后领不到）或者误领（同名的人各领一份）。
  const u = auth.user || {};
  const me = String(nameOfMail(u.mail || '') || u.name || '').trim().toLowerCase();
  const mine = me
    ? list.filter((g) => g && g.id && String(g.user || '').trim().toLowerCase() === me)
    : [];
  const cloud = await cloudGrants();
  if (!mine.length && !cloud.length) return 0;

  const claimed = new Set(uniq(store.get('gr', [])));
  let gain = 0;
  for (const g of mine) {
    if (claimed.has(String(g.id))) continue;
    claimed.add(String(g.id));
    gain += Math.max(0, Math.round(Number(g.amount) || 0));
  }
  for (const g of cloud) {
    // 加前缀：静态赠礼的 id 是手写的，可能和云端生成的撞上
    const key = 'c:' + String(g.id);
    if (claimed.has(key)) continue;
    claimed.add(key);
    gain += Math.max(0, Math.round(Number(g.amount) || 0));
    if (g.note) { try { toast(`收到一份赠礼：${g.note}`); } catch { /* 无 body */ } }
  }
  if (!gain) { store.set('gr', [...claimed]); return 0; }
  store.set('gr', [...claimed]);
  wallet.add(gain);                       // 会触发 dirty，但 sync 里紧接着会 push
  try { toast(t('pfGrant', { n: gain })); } catch { /* 页面还没挂 body 时忽略 */ }
  return gain;
}

async function sync() {
  if (!auth.logged) return { ok: false, why: 'guest' };
  const remote = await pull().catch(() => null);
  const local = snapshot();
  const merged = remote ? mergeDoc(remote, local, store.get('crBase', null)) : local;
  apply(merged);
  const gifted = await claimGrants().catch(() => 0);
  const r = await push();
  syncAt = Date.now();
  return { ok: !!r.ok, merged: !!remote, why: r.why, gift: gifted };
}

let syncAt = 0;
let inflight = null;

// 页面启动时调用：本机数据过期才拉云端，最多等 4.5 秒，失败就当游客继续用本机
function ready({ maxAge = MAX_AGE, timeout = 4500 } = {}) {
  if (!auth.logged) return Promise.resolve(false);
  if (Date.now() - (syncAt || store.get(K.at, 0)) < maxAge && !store.get(K.pend, false)) {
    // 数据还新鲜不重拉，但赠礼是「登录后迟早要发到」的东西，顺手补一次
    claimGrants().then((g) => { if (g) push().catch(() => {}); }).catch(() => {});
    return Promise.resolve(true);
  }
  if (inflight) return inflight;
  inflight = Promise.race([
    sync().then((r) => !!r.ok).catch(() => false),
    new Promise((r) => setTimeout(() => r(false), timeout)),
  ]).finally(() => { inflight = null; });
  return inflight;
}

// ------------------------------------------------------------------ 记录
// 每局结束（不论模式）都写一条，个人中心与「我的推理记录」都用它
function record(entry) {
  const list = store.get('hist', []);
  list.unshift({ at: Date.now(), ...entry });
  store.set('hist', list.slice(0, CAP.hist));
  schedule();
  return list.length;
}

const history = () => store.get('hist', []);
const lastSync = () => store.get(K.at, 0);
const pendingState = () => !!store.get(K.pend, false);

// 任何页面改了积分/解锁/失败题库都会冒泡到这里
document.addEventListener('zjtt:dirty', () => schedule());
// 刚登录：立刻把本机存档并进账号档案
document.addEventListener('zjtt:login', () => { sync().catch(() => {}); });

// 退出登录：云端文档保留，本机只清「同步凭据」，避免串号
function forget() {
  store.set('crBase', null);          // 换号 / 退出：旧账号的对账基线不能带到下一个账号
  for (const k of [K.doc, K.obj, K.at, K.pend, K.ver]) store.del(k);
  syncAt = 0;
  clearTimeout(timer);
  pending = false;
}

const account = {
  pull, push, sync, schedule, ready, record, history, lastSync, pendingState, forget,
  snapshot, apply, mergeDoc, pathOf, mergeBest, setMergeBest, birdBest, setBirdBest,
};
return { CAP, snapshot, birdBest, setBirdBest, mergeBest, setMergeBest, apply, mergeDoc, pull, push, schedule, sync, ready, record, history, lastSync, pendingState, forget, account };
})();

// ---- js/replay.js
const m_replay = await (async () => {

// 战斗回放解码：直接复用 qdby_chinese / morimens-tools 的口径
// 参考：qc_sparse/morimens-replay-review-v2.js（LZ4 frame -> MessagePack，含旧版 compStr 包壳）
// 回放文件不是 JSON：顶层 LZ4 帧里是 MessagePack；recordZips 的每一项又是「LZ4 帧 + MessagePack」的战斗分段。
//
// 导出：decodeReplay / replaySummary / unpack / unpackLz4Msgpack / lz4Frame / replayUrl / isReplayBytes

const PUBLIC_BASE = 'https://z1g-warreport.qookkagames.com/publish/BattleReplay_';
const decoder = new TextDecoder('utf-8');
const strictDecoder = new TextDecoder('utf-8', { fatal: true });

const readU32LE = (a, p) => (a[p] | (a[p + 1] << 8) | (a[p + 2] << 16) | (a[p + 3] << 24)) >>> 0;
function readU64LE(a, p) {
  const lo = BigInt(readU32LE(a, p));
  const hi = BigInt(readU32LE(a, p + 4));
  return Number((hi << 32n) | lo);
}

// ------------------------------------------------------------------ LZ4 帧
function lz4Frame(input) {
  const src = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  if (src.length < 7 || src[0] !== 0x04 || src[1] !== 0x22 || src[2] !== 0x4d || src[3] !== 0x18) {
    throw new Error('Expected LZ4 frame');
  }
  p = 4;
  const flg = src[p++];
  p++; // BD
  const blockChecksum = !!(flg & 0x10);
  const contentSizeFlag = !!(flg & 0x08);
  const contentChecksum = !!(flg & 0x04);
  const dictFlag = !!(flg & 0x01);
  let contentSize = 0;
  if (contentSizeFlag) { contentSize = readU64LE(src, p); p += 8; }
  if (dictFlag) p += 4;
  p += 1;

  let cap = Math.max(contentSize || 0, src.length * 4, 65536);
  let out = new Uint8Array(cap);
  let op = 0;
  const ensure = (n) => {
    if (n <= out.length) return;
    let c = out.length;
    while (c < n) c = Math.max(c * 2, n);
    const z = new Uint8Array(c);
    z.set(out);
    out = z;
  };

  const decompressBlock = (end) => {
    while (p < end) {
      const token = src[p++];
      let lit = token >>> 4;
      if (lit === 15) { let x; do { x = src[p++]; lit += x; } while (x === 255 && p < end); }
      ensure(op + lit + 16);
      out.set(src.subarray(p, p + lit), op);
      p += lit;
      op += lit;
      if (p >= end) break;
      if (p + 2 > end) throw new Error('LZ4 truncated offset');
      const off = src[p] | (src[p + 1] << 8);
      p += 2;
      if (!off || off > op) throw new Error('LZ4 invalid offset');
      let ml = token & 15;
      if (ml === 15) { let x; do { x = src[p++]; ml += x; } while (x === 255 && p < end); }
      ml += 4;
      ensure(op + ml + 16);
      let from = op - off;
      for (let i = 0; i < ml; i++) out[op++] = out[from + i];
    }
  };

  while (p + 4 <= src.length) {
    const raw = readU32LE(src, p);
    p += 4;
    if (raw === 0) break;
    const plain = !!(raw & 0x80000000);
    const size = raw & 0x7fffffff;
    const end = p + size;
    if (end > src.length) throw new Error('LZ4 truncated block');
    if (plain) {
      ensure(op + size);
      out.set(src.subarray(p, end), op);
      op += size;
      p = end;
    } else {
      decompressBlock(end);
      p = end;
    }
    if (blockChecksum) p += 4;
  }
  if (contentChecksum && p + 4 <= src.length) p += 4;
  return out.slice(0, op);
}

// ------------------------------------------------------------------ MessagePack
class Msgpack {
  constructor(bytes) {
    this.a = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.p = 0;
    this.v = new DataView(this.a.buffer, this.a.byteOffset, this.a.byteLength);
  }
  need(n) { if (this.p + n > this.a.length) throw new Error('MessagePack truncated'); }
  u8() { this.need(1); return this.a[this.p++]; }
  u16() { this.need(2); const x = this.v.getUint16(this.p, false); this.p += 2; return x; }
  u32() { this.need(4); const x = this.v.getUint32(this.p, false); this.p += 4; return x; }
  i8() { this.need(1); const x = this.v.getInt8(this.p); this.p++; return x; }
  i16() { this.need(2); const x = this.v.getInt16(this.p, false); this.p += 2; return x; }
  i32() { this.need(4); const x = this.v.getInt32(this.p, false); this.p += 4; return x; }
  u64() { this.need(8); const x = this.v.getBigUint64(this.p, false); this.p += 8; return Number(x); }
  i64() { this.need(8); const x = this.v.getBigInt64(this.p, false); this.p += 8; return Number(x); }
  bytes(n) { this.need(n); const x = this.a.slice(this.p, this.p + n); this.p += n; return x; }
  // recordZips 的每一项是以 MessagePack str 头包着的 LZ4 帧，非 UTF-8 时保留原始字节
  str(n) {
    const b = this.bytes(n);
    if (b.length > 3 && b[0] === 0x04 && b[1] === 0x22 && b[2] === 0x4d && b[3] === 0x18) return b;
    try { return strictDecoder.decode(b); } catch { return b; }
  }
  arr(n) { const a = new Array(n); for (let i = 0; i < n; i++) a[i] = this.read(); return a; }
  map(n) {
    const o = {};
    for (let i = 0; i < n; i++) {
      let k = this.read();
      if (k instanceof Uint8Array) { try { k = decoder.decode(k); } catch { k = String(k); } }
      o[String(k)] = this.read();
    }
    return o;
  }
  ext(n) { const type = this.i8(); return { $extType: type, $data: this.bytes(n) }; }
  read() {
    const b = this.u8();
    if (b <= 0x7f) return b;
    if (b >= 0xe0) return b - 256;
    if ((b & 0xf0) === 0x80) return this.map(b & 15);
    if ((b & 0xf0) === 0x90) return this.arr(b & 15);
    if ((b & 0xe0) === 0xa0) return this.str(b & 31);
    switch (b) {
      case 0xc0: return null;
      case 0xc2: return false;
      case 0xc3: return true;
      case 0xc4: return this.bytes(this.u8());
      case 0xc5: return this.bytes(this.u16());
      case 0xc6: return this.bytes(this.u32());
      case 0xc7: return this.ext(this.u8());
      case 0xc8: return this.ext(this.u16());
      case 0xc9: return this.ext(this.u32());
      case 0xca: { this.need(4); const x = this.v.getFloat32(this.p, false); this.p += 4; return x; }
      case 0xcb: { this.need(8); const x = this.v.getFloat64(this.p, false); this.p += 8; return x; }
      case 0xcc: return this.u8();
      case 0xcd: return this.u16();
      case 0xce: return this.u32();
      case 0xcf: return this.u64();
      case 0xd0: return this.i8();
      case 0xd1: return this.i16();
      case 0xd2: return this.i32();
      case 0xd3: return this.i64();
      case 0xd4: return this.ext(1);
      case 0xd5: return this.ext(2);
      case 0xd6: return this.ext(4);
      case 0xd7: return this.ext(8);
      case 0xd8: return this.ext(16);
      case 0xd9: return this.str(this.u8());
      case 0xda: return this.str(this.u16());
      case 0xdb: return this.str(this.u32());
      case 0xdc: return this.arr(this.u16());
      case 0xdd: return this.arr(this.u32());
      case 0xde: return this.map(this.u16());
      case 0xdf: return this.map(this.u32());
      default: throw new Error('Unsupported MessagePack byte 0x' + b.toString(16));
    }
  }
}

const unpack = (b) => new Msgpack(b).read();
const unpackLz4Msgpack = (b) => unpack(lz4Frame(b));

const latin1 = (bytes) => {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) out += String.fromCharCode(...bytes.subarray(i, Math.min(bytes.length, i + CHUNK)));
  return out;
};
const stringToBytes8 = (s) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 255;
  return out;
};

const isReplayBytes = (u8) => u8.length > 4 && u8[0] === 0x04 && u8[1] === 0x22 && u8[2] === 0x4d && u8[3] === 0x18;
const replayUrl = (uuid) => `${PUBLIC_BASE}${uuid}.json`;

// ------------------------------------------------------------------ 对外：解码
function decodeReplay(input) {
  let u8 = input;
  if (typeof input === 'string') {
    const t = input.trim();
    if (t.startsWith('{') || t.startsWith('[')) return JSON.parse(t); // 已是 JSON 摘要
    u8 = new TextEncoder().encode(t);
  }
  if (u8 instanceof ArrayBuffer) u8 = new Uint8Array(u8);
  if (!isReplayBytes(u8)) return JSON.parse(decoder.decode(u8));

  let root;
  if (u8[0] === 0x04 && u8[1] === 0x22 && u8[2] === 0x4d && u8[3] === 0x18) {
    root = unpackLz4Msgpack(u8);
  } else {
    const env = JSON.parse(latin1(u8));
    if (typeof env.compStr !== 'string') throw new Error('Replay compStr missing');
    root = unpackLz4Msgpack(stringToBytes8(env.compStr));
  }
  if (!root || !Array.isArray(root.recordZips)) throw new Error('Unexpected replay structure');

  const segments = root.recordZips.map((blob) => {
    try { return unpackLz4Msgpack(blob); } catch { return null; }
  }).filter(Boolean);
  return {
    battleDat: root.battleDat || {},
    resourceRecords: root.resourceRecords || {},
    recordZips: root.recordZips,
    segments,
    format: 'LZ4 -> MessagePack; recordZips -> LZ4 -> MessagePack',
  };
}

// ------------------------------------------------------------------ 对外：回放 → 战报摘要
// 说明：榜单接口的 stageRoundCount / totalUseCard 是服务端口径，回放里没有等价字段，
// 这里用回放自带的战场统计（battleDat.statistics）近似，工坊里可以手动改。
function replaySummary(rep) {
  const bd = (rep && rep.battleDat) || rep || {};
  const st = bd.statistics || {};
  const n = (v) => (Number.isFinite(+v) ? +v : 0);
  const dmg = st.AwakerDoDamage || {};
  const blk = st.AwakerDoBlock || {};
  const heal = st.AwakerDoHeal || {};
  const roles = (bd.roleData || []).filter((r) => r && r.tid != null);
  return {
    source: 'replay',
    battleUuid: String(bd.battleUuid || bd.gameLogBattleUid || ''),
    stageId: n(bd.stageId),
    playerLevel: n(bd.playerLevel),
    stageRoundCount: n(st.BoutCount),
    totalUseCard: n(st.UsedCardCount),
    maxBoutDamage: n(st.BoutMaxPlayerDoDamage),
    deathResistCount: n(st.DeathResistCount),
    playerDamage: n((dmg && dmg['1']) || st.PlayerDoDamage),
    keeperSkill: bd.keeperSkill != null ? bd.keeperSkill : null,
    relics: (bd.relics || []).map((r) => (r && r.tid != null ? r.tid : r)).filter((x) => x != null),
    awakers: roles.map((r) => ({
      tid: r.tid,
      level: n(r.level),
      potency: n(r.potencyLevel),
      break: n(r.breakLevel),
      damage: n(dmg[String(r.tid)]),
      block: n(blk[String(r.tid)]),
      heal: n(heal[String(r.tid)]),
    })),
  };
}

// ------------------------------------------------------------------ 对外：回放 → 完整队伍
// 命轮在回放里是「状态@武器X」的挂载状态，其 source.sourceType === 'Weapon' 且带 tid；
// 密契（饰品/Trinket）只有在本局触发过时才会留下「状态@饰品X」，因此这里只能给出候选，
// 精确值需要回查题库（见 workshop.js 的 lookupPuzzle）。
const COV_TAIL = /(效果|计数|标记|标识|层数|叠层|数值|次数|记录)$/;

function pushOnce(map, key, val) {
  if (val == null || val === '') return;
  const arr = map.get(key) || [];
  if (!arr.some((x) => String(x) === String(val))) arr.push(val);
  map.set(key, arr);
}

function replayTeam(rep) {
  const bd = (rep && rep.battleDat) || rep || {};
  const rr = (rep && rep.resourceRecords) || {};
  const stateDef = rr.State || {};
  const st = bd.statistics || {};
  const n = (v) => (Number.isFinite(+v) ? +v : 0);
  const roles = (bd.roleData || []).filter((r) => r && r.tid != null);
  const roleUids = new Set(roles.map((r) => String(r.uid)));
  const wheelsOf = new Map();
  const covOf = new Map();

  for (const s of bd.stateList || []) {
    const owner = String((s.ownerData && s.ownerData.uid) ?? s.casterUid ?? '');
    if (!roleUids.has(owner)) continue;
    const def = stateDef[String(s.stateId)] || {};
    const cn = String(def.CnID || '');
    const m = cn.match(/^状态@饰品(.+)$/);
    if (m) pushOnce(covOf, owner, m[1].replace(COV_TAIL, ''));
    for (const src of s.source || []) {
      if (src && src.sourceType === 'Weapon') pushOnce(wheelsOf, owner, src.tid);
    }
  }

  const dmg = st.AwakerDoDamage || {};
  const blk = st.AwakerDoBlock || {};
  const heal = st.AwakerDoHeal || {};
  const pick = (map, r) => map[String(r.tid)] ?? map[String(r.uid)] ?? 0;

  const team = roles.map((r) => {
    const uid = String(r.uid);
    const covs = covOf.get(uid) || [];
    return {
      tid: String(r.tid),
      lv: n(r.level),
      pot: n(r.potencyLevel),
      brk: n(r.breakLevel),
      like: n(r.likeLevel),
      wheels: (wheelsOf.get(uid) || []).slice(0, 2).map(String),
      cov: null,
      covName: covs[0] || '',
      covNames: covs,
      dmg: n(pick(dmg, r)),
      blk: n(pick(blk, r)),
      heal: n(pick(heal, r)),
    };
  });
  // 与题库答案一致：A = 伤害最高
  team.sort((a, b) => b.dmg - a.dmg);

  return {
    source: 'replay',
    uuid: String(bd.battleUuid || bd.gameLogBattleUid || ''),
    playerUid: n(bd.playerUid),
    stageId: n(bd.stageId),
    playerLevel: n(bd.playerLevel),
    keeperSkill: bd.keeperSkill != null ? bd.keeperSkill : null,
    relics: (bd.relics || []).map((r) => (r && r.tid != null ? r.tid : r)).filter((x) => x != null).map(String),
    team,
    stats: {
      rounds: n(st.BoutCount),
      cards: n(st.UsedCardCount),
      maxBout: n(st.BoutMaxPlayerDoDamage),
      deathResist: n(st.DeathResistCount),
      playerDamage: n(st.PlayerDoDamage),
    },
  };
}
return { lz4Frame, unpack, unpackLz4Msgpack, isReplayBytes, replayUrl, decodeReplay, replaySummary, replayTeam };
})();

// ---- js/pepper.js
const m_pepper = await (async () => {

// generated by scripts/build_data.py
const PEPPER = '6ad17e01b5f33ee9';
return { PEPPER };
})();

// ---- js/likes.js
const m_likes = await (async () => {
const { store, wallet, markDirty, toast, t } = m_common;
const { auth } = m_auth;
const { api } = m_api;
// 点赞：自建题每被一个人点赞，作者得 1 银芯；每人每天最多 10 次。
//
// 规则由后端执行（server/worker.js）：(题目, 身份) 主键唯一，每日额度服务端计数，
// 所以清 localStorage 也刷不出额度，换设备也骗不到第二个赞。
//
// 前端仍然「先记账、后发送」：点下去数字立刻 +1，请求进队列慢慢发，
// 网络恢复或下次打开页面继续。服务端回来的权威计数会覆盖本地乐观值。




const LIKE_MAX = 10;      // 每人每天最多点几个
const GAP = 800;                 // 两次发送之间稍等一下，别把请求堆成一串
const HARD_TRIES = 4;            // 网络类错误重试几次后放弃

// 后端在、但存储还没开通（EdgeOne 的 KV 是白名单审核，未通过时接口返回 503/no_kv）。
// 这种情况重试多少次都不会好，所以整页生命周期内直接转「本机模式」：
// 赞只记在这台设备上，界面明说，不再空转重试。审核通过后刷新页面即自动恢复。
let cloudOff = false;
let warned = false;              // 「存储没开通」只提示一次，别每点一个赞弹一遍
const cloudReady = () => !cloudOff;
const isNoStore = (e) => {
  const code = String((e && e.code) || '');
  const status = Number((e && e.status) || 0);
  // no_store = 后端在但没有任何存储可用（KV 未绑定、Blob 也没凭据）
  return code === 'no_kv' || code === 'no_store' || code === 'not_ready' || status === 503;
};

// 与签到、每日一题同一套「东八区今天」
const dayKey = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// 旧接口保留：路径形式不再用于存储，但分享码里可能还带着老 id
const pathOf = (id) => `/zjtt/like/${String(id || '').replace(/[^A-Za-z0-9._-]/g, '_')}`;

// ---------------------------------------------------------------- 本机缓存
const votes = () => store.get('likeVote', {}) || {};
const votedSet = () => store.get('likeVoted', {}) || {};
const countsCache = () => store.get('likeCnt', {}) || {};

const hasVoted = (id) => Boolean(votes()[String(id)] || votedSet()[String(id)]);
const cachedCounts = () => countsCache();

function setCount(id, n) {
  const c = countsCache();
  c[String(id)] = Math.max(0, Number(n) || 0);
  store.set('likeCnt', c);
  return c;
}

function markVoted(id) {
  const v = votes();
  if (!v[String(id)]) { v[String(id)] = Date.now(); store.set('likeVote', v); }
  const s = votedSet();
  if (!s[String(id)]) { s[String(id)] = 1; store.set('likeVoted', s); }
}

// 今日额度：服务端给的数优先，没拿到就用本机记的
function dayState() {
  const d = dayKey();
  const srv = store.get('likeLeft', null);
  if (srv && srv.d === d && typeof srv.n === 'number') {
    return { d, n: Math.max(0, LIKE_MAX - Math.min(LIKE_MAX, srv.n)) };
  }
  const q = store.get('likeDay', null);
  if (!q || q.d !== d) return { d, n: 0 };
  return { d, n: Math.max(0, Number(q.n) || 0) };
}

function setLeft(n) {
  const left = Math.max(0, Math.min(LIKE_MAX, Number(n) || 0));
  store.set('likeLeft', { d: dayKey(), n: left });
  store.set('likeDay', { d: dayKey(), n: LIKE_MAX - left });
}

const usedToday = () => dayState().n;
const leftToday = () => Math.max(0, LIKE_MAX - dayState().n);

const notify = () => {
  try { document.dispatchEvent(new CustomEvent('zjtt:likes')); } catch { /* 非浏览器环境 */ }
};

// ---------------------------------------------------------------- 读赞数
// 一次问一批，返回 { 题目 id: 赞数 }；顺便把「我赞过谁」和今日额度同步下来
async function counts(ids) {
  const list = [...new Set((ids || []).map((x) => String(x || '')).filter(Boolean))].slice(0, 60);
  if (!api.ready()) {
    const cache = countsCache();
    const out = {};
    for (const id of list) out[id] = Number(cache[id]) || 0;
    return out;
  }
  try {
    const d = await api.get(`/likes?ids=${encodeURIComponent(list.join(','))}`);
    const out = {};
    for (const id of list) out[id] = Math.max(0, Number(d.counts && d.counts[id]) || 0);
    if (d.counts) store.set('likeCnt', { ...countsCache(), ...d.counts });
    if (d.voted) {
      const s = votedSet();
      for (const id of Object.keys(d.voted)) if (d.voted[id]) s[String(id)] = 1;
      store.set('likeVoted', s);
    }
    if (typeof d.left === 'number') setLeft(d.left);
    return out;
  } catch (e) {
    if (isNoStore(e)) cloudOff = true;
    const cache = countsCache();
    const out = {};
    for (const id of list) out[id] = Number(cache[id]) || 0;
    return out;
  }
}

// ---------------------------------------------------------------- 发赞（排队）
const queue = () => store.get('likeQ', []) || [];
const setQueue = (q) => store.set('likeQ', q);
const nextAt = () => Number(store.get('likeNext', 0)) || 0;
const pending = () => queue().length;

const drop = (id) => setQueue(queue().filter((x) => String(x.id) !== String(id)));

// 服务端拒了（额度用完 / 自己的题 / 不是合法题目）：把乐观加上的那一次撤掉
function revert(id, reason) {
  const key = String(id);
  const v = votes();
  if (v[key]) { delete v[key]; store.set('likeVote', v); }
  const s = votedSet();
  if (s[key]) { delete s[key]; store.set('likeVoted', s); }

  const c = countsCache();
  if (c[key] > 0) { c[key] -= 1; store.set('likeCnt', c); }

  const q = store.get('likeDay', null);
  if (q && q.d === dayKey() && q.n > 0) store.set('likeDay', { d: q.d, n: q.n - 1 });
  store.del('likeLeft');

  if (reason === 'quota') toast(t('likeZero', { n: LIKE_MAX }));
  else if (reason === 'self') toast(t('likeSelfFail'));
  notify();
}

let running = false;
let tmr = 0;
function later(ms) {
  clearTimeout(tmr);
  tmr = setTimeout(() => { flush(); }, Math.max(200, ms));
}

// 把队列里的赞一条条发出去
async function flush() {
  if (running || !queue().length) return;
  if (!api.ready()) return;
  if (cloudOff) { setQueue([]); return; }   // 存储没开通：别再空转
  running = true;
  try {
    for (;;) {
      if (!queue().length) break;
      const wait = nextAt() - Date.now();
      if (wait > 0) { later(wait); break; }

      const item = { ...queue()[0] };
      try {
        const d = await api.post('/like', { puzzle: String(item.id) });
        if (d && typeof d.count === 'number') setCount(item.id, d.count);
        if (d && typeof d.left === 'number') setLeft(d.left);
        markVoted(item.id);
        drop(item.id);
        store.set('likeNext', Date.now() + GAP);
        notify();
      } catch (e) {
        const code = String((e && e.code) || '');
        const status = Number(e && e.status) || 0;

        // 后端回来了但存储还没开通：不算失败，赞留在本机，之后统一说一次
        if (isNoStore(e)) {
          cloudOff = true;
          drop(item.id);
          setQueue([]);
          if (!warned) { warned = true; toast(t('likeCloudOff')); }
          notify();
          break;
        }

        // 不可重试：额度没了、自己的题、题目不合法、没登录
        if (code === 'quota' || code === 'self' || code === 'rate' || code === 'bad_puzzle' || code === 'no_voter' || status === 401 || status === 403) {
          if (e && e.data && typeof e.data.count === 'number') setCount(item.id, e.data.count);
          if (e && e.data && typeof e.data.left === 'number') setLeft(e.data.left);
          revert(item.id, code);
          drop(item.id);
          continue;
        }

        // 网络类错误：记一次，等会儿再试
        const n = (Number(item.n) || 0) + 1;
        if (n >= HARD_TRIES) {
          revert(item.id, 'offline');
          drop(item.id);
        } else {
          const q = queue();
          q[0] = { ...item, n };
          setQueue(q);
          store.set('likeNext', Date.now() + n * 5000);
        }
        later(n * 5000);
        break;
      }
    }
  } finally {
    running = false;
  }
}

// 点赞：本机立刻记下、扣一次今日额度，网络交给队列
function like(id) {
  const key = String(id || '');
  if (!key) return { ok: 'bad', left: leftToday() };
  if (hasVoted(key)) return { ok: 'voted', left: leftToday() };
  if (leftToday() <= 0) return { ok: 'quota', left: 0 };

  markVoted(key);
  setCount(key, (Number(countsCache()[key]) || 0) + 1);
  store.set('likeDay', { d: dayKey(), n: dayState().n + 1 });
  store.del('likeLeft');                    // 服务端数还没回来，先按本机记的走

  // 没配后端、或后端存储还没开通，就只记本机，别让「排队发送中」永远挂着
  if (api.ready() && !cloudOff) {
    const q = queue();
    if (!q.some((x) => String(x.id) === key)) q.push({ id: key, at: Date.now(), n: 0 });
    setQueue(q);
    later(400);
  }
  try { markDirty('like'); } catch { /* common 里没导出时忽略 */ }
  return { ok: 'ok', left: leftToday() };
}

// ---------------------------------------------------------------- 作者结算
// 登录后走服务端 claim：每题已折过银芯的赞数记在 claims 表，只升不降，换设备也不会重复领。
// 游客出的题没有归属记录，退回本机比较，银芯只加在本机。
async function syncMine(list) {
  const ids = (list || []).map((p) => (p && p.id ? String(p.id) : '')).filter(Boolean);
  if (!ids.length) return { counts: {}, gain: 0, ok: false };

  if (api.ready() && auth.logged) {
    try {
      const d = await api.post('/claim', { puzzles: ids });
      const c = d.counts || {};
      store.set('likeCnt', { ...countsCache(), ...c });
      const gain = Math.max(0, Number(d.gain) || 0);
      if (gain > 0) wallet.add(gain);
      return { counts: c, gain, ok: true };
    } catch { /* 落到本机算法，下面继续 */ }
  }

  const c = await counts(ids);
  const cred = store.get('likeCredited', {}) || {};
  let gain = 0;
  for (const id of ids) {
    const n = Number(c[id]) || 0;
    const prev = Number(cred[id]) || 0;
    if (n > prev) gain += n - prev;
    // 结算基准只升不降：接口偶尔抽风返回 0 时不能把基准冲掉，否则下次会重复发钱
    cred[id] = Math.max(prev, n);
  }
  store.set('likeCredited', cred);
  if (gain > 0) wallet.add(gain);
  return { counts: c, gain, ok: true };
}

// 页面打开时：同步一次「我赞过谁 / 今天还剩几次」，再把上次没发完的赞补上
function resume() {
  if (!api.ready()) return;
  counts([]).catch(() => {});
  if (queue().length) later(1200);
}
return { LIKE_MAX, cloudReady, pathOf, hasVoted, cachedCounts, usedToday, leftToday, counts, pending, flush, like, syncMine, resume };
})();

// ---- js/workshop.js
const m_workshop = await (async () => {
const { $, h, store, nav, t, lang, loadDict, imgEl, nameOf, shareCode, REPLAY, markDirty, realmFits, realmAnchor, realmName, REALM_CHAOS, sha256 } = m_common;
const { cloud, cloudConfig } = m_cloud;
const { account } = m_account;
const { decodeReplay, replayTeam } = m_replay;
const { PEPPER } = m_pepper;
const likes = m_likes;
// 创意工坊：导入战报 → 生成自己的推理题 → 分享码 / 云题库







await account.ready();
document.body.prepend(nav('workshop'));
const root = $('#app');
if (!document.getElementById('boot')) root.textContent = t('loading');

const { D, idx } = await loadDict();
const KINDS = { awakener: '唤醒体', wheel: '命轮', covenant: '密契', key: '钥令', creation: '造物' };
const LETTERS = ['A', 'B', 'C', 'D'];

function toast(msg) {
  const el = h('div', { class: 'toast' }, msg);
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

// ------------------------------------------------------------------ draft
function emptyDraft() {
  return {
    id: '', custom: true, title: '', uuid: '',
    season: 0, zone: 0, threat: '?', madness: 0, boss: [],
    score: 0, rounds: 0, cards: 0, maxBout: 0, deathResist: 0, hp: 0, left: 0,
    playerDmg: 0, extra: false, diff: 3, diffScore: 30,
    key: null, relics: [], hints: [],
    team: LETTERS.map(() => ({ tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 })),
  };
}
let draft = emptyDraft();

const myPuzzles = () => store.get('myPuzzles', []);
const saveMine = (list) => store.set('myPuzzles', list);

// ------------------------------------------------------------------ 自定义线索
// 作者自己写的线索：标题 + 内容 + 价格，玩家在题目的线索台里按这个价格买。
// 题库自带的线索是「按数据算出来的」，这里的是「作者知道但数据算不出来的」
// （比如这局怎么打的、某个位置的怪癖），所以价格也由作者定。
const HINT_MAX = 12;
const HINT_COST_MIN = 1;
const HINT_COST_MAX = 40;
const clampCost = (v) => {
  const n = Math.round(num(v, 5));
  return Math.min(HINT_COST_MAX, Math.max(HINT_COST_MIN, n));
};
const hintsOf = (d) => (Array.isArray(d && d.hints) ? d.hints : []);
// 分享码里压成三元组，省点长度
const packHints = (list) => list.map(c => [c.n || '', c.v || '', clampCost(c.c)]);
const unpackHints = (arr) => (Array.isArray(arr) ? arr : []).map(c => ({
  n: String(c && c.n != null ? c.n : (Array.isArray(c) ? c[0] : '')) || '',
  v: String(c && c.v != null ? c.v : (Array.isArray(c) ? c[1] : '')) || '',
  c: clampCost(c && c.c != null ? c.c : (Array.isArray(c) ? c[2] : 5)),
}));

// ------------------------------------------------------------------ 解析导入
const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);

function pickTeam(obj) {
  // 1) 已经是答案结构：{team:[{tid,lv,pot,brk,wheels,cov}]}
  if (Array.isArray(obj.team) && obj.team.length) {
    return obj.team.slice(0, 4).map(a => ({
      tid: String(a.tid), lv: num(a.lv ?? a.level, 60), pot: num(a.pot, 0), brk: num(a.brk, 0),
      wheels: (a.wheels || []).slice(0, 2).map(String), cov: a.cov ? String(a.cov) : null,
      dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
    }));
  }
  // 2) 战报摘要：awakers[] / members[]
  const raw = obj.awakers || obj.members || obj.awakeners || obj.teamMembers || [];
  if (Array.isArray(raw) && raw.length) {
    return raw.slice(0, 4).map(a => ({
      tid: String(a.tid ?? a.id ?? a.awakenerId), lv: num(a.level ?? a.lv, 60), pot: num(a.pot ?? a.potency, 0),
      brk: num(a.brk ?? a.break, 0), wheels: [], cov: null,
      dmg: num(a.damage ?? a.dmg), blk: num(a.block ?? a.blk), heal: num(a.heal),
    })).filter(a => a.tid !== 'undefined');
  }
  return null;
}

function fromJson(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { return null; }
  if (Array.isArray(obj)) obj = obj[0] || {};
  // battle-summary 的 jsonl 也可能整段粘进来
  const team = pickTeam(obj);
  if (!team || team.length < 2) return null;
  const d = emptyDraft();
  d.team = LETTERS.map((_, i) => team[i] || { tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 });
  // 按伤害从高到低排序：A 是最高伤害
  d.team.sort((a, b) => (b.dmg || 0) - (a.dmg || 0));
  d.uuid = String(obj.battleUuid || obj.uuid || obj.replayUuid || '');
  d.rounds = num(obj.stageRoundCount ?? obj.rounds);
  d.cards = num(obj.totalUseCard ?? obj.cards);
  d.maxBout = num(obj.maxBoutDamage ?? obj.maxBout);
  d.deathResist = num(obj.deathResistCount ?? obj.deathResist);
  d.hp = num(obj.maxHp ?? obj.hp);
  d.left = num(obj.leftHp ?? obj.left);
  d.playerDmg = num(obj.playerDamage ?? obj.playerDmg);
  d.score = num(obj.score);
  d.relics = (obj.relics || []).map(x => String(x && x.id != null ? x.id : x)).filter(Boolean);
  d.key = obj.keeperSkill != null ? String(obj.keeperSkill) : (obj.key != null ? String(obj.key) : null);
  d.extra = !!(obj.extraPass ?? obj.extra);
  d.diff = d.relics.length ? 4 : (d.key ? 3 : (d.team.some(a => a.wheels.length) ? 2 : 1));
  // 难度分：用回合/伤害离散度粗估
  d.diffScore = Math.round(18 + Math.min(30, Math.log10(Math.max(1, d.maxBout)) * 4) + (d.extra ? 3 : 0));
  return d;
}

// ------------------------------------------------------------------ 编辑区
// 界域规则：混沌之外只能有一种界域。队伍里已有「血肉」时，超维/深海/第二套界域都填不进去。
const realmOfSlot = (k) => {
  const a = draft.team[k];
  const e = a && a.tid != null ? idx.awakener.get(String(a.tid)) : null;
  return e ? e.realm : '';
};
const otherRealms = (k) => draft.team.map((_, i) => (i === k ? '' : realmOfSlot(i))).filter(Boolean);
const anchorOf = (k) => realmAnchor(otherRealms(k));

// 某个唤醒体在这个卡位能不能选：返回空串=能选，否则是「为什么不能」
function blockReason(k, e) {
  if (!e) return '';
  const usedElsewhere = draft.team.some((a, i) => i !== k && a.tid != null && String(a.tid) === String(e.id));
  if (usedElsewhere) return t('wsRealmUsed');
  const others = otherRealms(k);
  if (!realmFits(others, e.realm)) return t('wsRealmBlocked', { r: realmName(realmAnchor(others)) });
  return '';
}

function pickBtn(kind, id, set, label, opts) {
  const e = id != null ? idx[kind].get(String(id)) : null;
  return h('button', {
    type: 'button', class: `pick ${kind}`,
    onclick: () => openPicker(kind, (v) => { set(v); draw(); }, opts),
  }, e ? imgEl(e.img, nameOf(e)) : h('span', { class: 'plus' }, '＋'), h('small', {}, e ? nameOf(e) : (label || KINDS[kind])));
}

function slotEditor(k) {
  const a = draft.team[k];
  return h('div', { class: 'slot' },
    h('div', { class: 'shead' }, h('b', {}, `${LETTERS[k]} 位`),
      h('span', { class: 'chips' }, a.dmg ? h('span', { class: 'chip' }, `伤害 ${Math.round(a.dmg).toLocaleString()}`) : null)),
    pickBtn('awakener', a.tid, v => { a.tid = v; }, '选唤醒体', {
      block: (e) => blockReason(k, e),
      note: () => {
        const anchor = anchorOf(k);
        return anchor ? t('wsRealmAnchor', { r: realmName(anchor) }) : t('wsRealmRule');
      },
    }),
    h('div', { class: 'row2' },
      pickBtn('wheel', (a.wheels || [])[0], v => { a.wheels = [v, (a.wheels || [])[1] || null].filter(Boolean); }, '命轮 1'),
      pickBtn('wheel', (a.wheels || [])[1], v => { a.wheels = [(a.wheels || [])[0] || null, v].filter(Boolean); }, '命轮 2')),
    pickBtn('covenant', a.cov, v => { a.cov = v; }, '密契'),
    h('div', { class: 'pot' },
      h('small', {}, '等级/灵塑'),
      h('input', { type: 'number', min: 1, max: 90, value: a.lv, class: 'tiny', oninput: ev => { a.lv = num(ev.target.value, 60); } }),
      h('input', { type: 'number', min: 0, max: 15, value: a.pot, class: 'tiny', oninput: ev => { a.pot = num(ev.target.value, 0); } })));
}

// 队伍界域现状：冲突时直接点出来，别让人选完才发现不自洽
function teamRealmNote() {
  const rs = draft.team.map((_, i) => realmOfSlot(i)).filter(Boolean);
  const uniq = [...new Set(rs)];
  const nonChaos = uniq.filter(r => r !== REALM_CHAOS);
  const bad = nonChaos.length > 1;
  const label = uniq.length ? uniq.map(realmName).join(' + ') : t('wsTeamNoRealm');
  return h('p', { class: `note realmnote${bad ? ' bad' : ''}` },
    t('wsTeamRealm', { r: label }),
    bad ? h('b', {}, ' · ' + t('wsRealmRule')) : null);
}

function metaEditor() {
  const f = (label, key, type = 'number') => h('label', { class: 'fld' }, h('small', {}, label),
    h('input', { type, value: draft[key] ?? '', oninput: ev => { draft[key] = type === 'number' ? num(ev.target.value) : ev.target.value; } }));
  return h('div', { class: 'metagrid' },
    f('回合数', 'rounds'), f('出牌数', 'cards'), f('单回合最高伤害', 'maxBout'),
    f('剩余生命', 'left'), f('满血', 'hp'), f('守密人伤害', 'playerDmg'),
    h('label', { class: 'fld' }, h('small', {}, '回放 battleUuid'),
      h('input', { type: 'text', value: draft.uuid || '', oninput: ev => { draft.uuid = ev.target.value.trim(); } })));
}

// 自定义线索编辑器：一行一条，标题 / 内容 / 价格，写一条加一条
let focusLastHint = false;
function clueEditor() {
  const list = draft.hints || (draft.hints = []);
  const row = (c, i) => h('div', { class: 'hintrow' },
    h('input', {
      type: 'text', class: 'hn', value: c.n || '', maxlength: 24, placeholder: t('wsHintLabelPh'),
      oninput: ev => { c.n = ev.target.value; },
    }),
    h('input', {
      type: 'text', class: 'hv', value: c.v || '', maxlength: 140, placeholder: t('wsHintTextPh'),
      oninput: ev => { c.v = ev.target.value; },
    }),
    h('input', {
      type: 'number', class: 'hc', min: HINT_COST_MIN, max: HINT_COST_MAX, value: c.c ?? 5,
      title: t('wsHintCostTip'),
      oninput: ev => { c.c = ev.target.value === '' ? '' : num(ev.target.value, 5); },
      onblur: ev => { c.c = clampCost(ev.target.value); ev.target.value = c.c; },
    }),
    h('button', {
      type: 'button', class: 'link', onclick: () => { list.splice(i, 1); draw(); },
    }, t('wsDel')));
  const box = h('div', { class: 'hintsed' },
    h('div', { class: 'hinthead' },
      h('b', {}, t('wsHintTitle')),
      h('span', { class: 'note' }, t('wsHintNote', { max: HINT_MAX }))),
    list.length
      ? h('div', { class: 'hintcols' },
        h('small', {}, t('wsHintColN')), h('small', {}, t('wsHintColV')),
        h('small', {}, t('wsHintColC')), h('small', {}, ''))
      : null,
    list.length
      ? h('div', { class: 'hintrows' }, list.map(row))
      : h('p', { class: 'note' }, t('wsHintNone')),
    h('div', { class: 'hintact' },
      h('button', {
        type: 'button', class: 'btn ghost sm', onclick: () => {
          if (list.length >= HINT_MAX) { toast(t('wsHintFull', { n: HINT_MAX })); return; }
          list.push({ n: '', v: '', c: 5 });
          focusLastHint = true;
          draw();
        },
      }, `＋ ${t('wsHintTitle')}`)));
  // 新加的一行直接把光标送进标题框，不用再点一次
  if (focusLastHint) {
    focusLastHint = false;
    requestAnimationFrame(() => {
      const els = root.querySelectorAll('.hintrow .hn');
      if (els.length) els[els.length - 1].focus();
    });
  }
  return box;
}

// ------------------------------------------------------------------ 点赞
// 别人在题目的线索台上方点「赞」，作者这边每 1 个赞换 1 银芯。
// 赞数存在共享存储里（js/likes.js），结算基准跟着账号档案走，换设备不会重复领。
const likeText = (id) => {
  const n = Number(likes.cachedCounts()[String(id)]) || 0;
  return n > 0 ? `❤ ${n}` : '';
};

function paintLikes() {
  const c = likes.cachedCounts();
  root.querySelectorAll('[data-like]').forEach(el => {
    const n = Number(c[el.getAttribute('data-like')]) || 0;
    el.textContent = n > 0 ? `❤ ${n}` : '';
  });
  const tot = root.querySelector('[data-liketotal]');
  if (tot) {
    const sum = myPuzzles().reduce((s, p) => s + (Number(c[String(p.id)]) || 0), 0);
    tot.textContent = sum ? t('likeTotal', { n: sum }) : '';
  }
}

async function refreshLikes() {
  const list = myPuzzles();
  if (!list.length) return;
  const r = await likes.syncMine(list);
  if (!r.ok) return;
  paintLikes();
  if (r.gain > 0) toast(t('likeGain', { n: r.gain }));
}

function draw() {
  root.replaceChildren(
    h('section', { class: 'card' },
      h('h2', {}, t('workshopTitle')),
      h('p', { class: 'note' }, t('workshopSub')),
      h('p', { class: 'note' }, t('wsNote')),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsJson')),
          h('textarea', { rows: 5, id: 'ws-json', placeholder: '{"awakers":[…],"relics":[…],"battleUuid":"…"}' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn', onclick: () => importJson() }, t('wsBuild')),
          h('label', { class: 'btn ghost filebtn' }, t('wsFile'),
            h('input', { type: 'file', accept: '.json,application/json', onchange: (ev) => readFile(ev) })),
          h('button', { class: 'btn ghost', onclick: () => importCode() }, t('wsImportCode')))),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsUuidLabel')),
          h('input', { type: 'text', id: 'ws-uuid', placeholder: 'a7637e49-3ee0-3748-85ba-ca1a12efdf32', value: draft.uuid || '' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn', onclick: () => loadByCode() }, t('wsLoadByCode')),
          h('button', { class: 'btn ghost', onclick: () => openReplay() }, t('wsOpenReplay')))),
      h('div', { class: 'importrow' },
        h('label', { class: 'fld grow' }, h('small', {}, t('wsCodePh')),
          h('input', { type: 'text', id: 'ws-code', placeholder: 'ZJ2-…' })),
        h('div', { class: 'importact' },
          h('button', { class: 'btn ghost', onclick: () => loadCloud() }, t('wsCloudLoad'))))),
    h('section', { class: 'card' },
      h('h3', {}, t('wsManual')),
      teamRealmNote(),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotEditor(k))),
      h('div', { class: 'extras' },
        h('div', { class: 'extra' }, h('b', {}, t('keyLabel') || '钥令'), pickBtn('key', draft.key, v => { draft.key = v; })),
        h('div', { class: 'extra wide' }, h('b', {}, '造物'),
          h('small', { class: 'note relicnote' }, t('wsRelicOrderNote')),
          h('div', { class: 'relics' },
            draft.relics.map(id => {
              const e = idx.creation.get(String(id));
              return h('button', { type: 'button', class: 'pick mini', title: e ? nameOf(e) : id,
                onclick: () => { draft.relics = draft.relics.filter(x => x !== id); draw(); } },
                imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
            }),
            h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', v => {
              if (v && !draft.relics.includes(v)) draft.relics.push(v); draw();
            }) }, h('span', { class: 'plus' }, '＋'), h('small', {}, t('add')))))),
      metaEditor(),
      clueEditor(),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => saveDraft() }, '保存到我的题目'),
        h('button', { class: 'btn ghost', onclick: () => copyCode() }, t('wsShare')),
        h('button', { class: 'btn ghost', onclick: () => play() }, t('wsPlay')),
        h('button', { class: 'btn ghost', onclick: () => upload() }, t('wsUpload')),
        h('button', { class: 'btn ghost', onclick: () => openReplay() }, t('wsOpenReplay')),
        h('button', { class: 'btn ghost', onclick: () => cloudSettings() }, t('wsCloudCfg')),
        h('button', { class: 'btn ghost', onclick: () => { draft = emptyDraft(); draw(); } }, t('reset') || '重置'))),
    h('section', { class: 'card' },
      h('h3', {}, `${t('wsMine')} · ${myPuzzles().length}`,
        h('span', { class: 'note likesum', 'data-liketotal': '' }, '')),
      mineList()),
    h('section', { class: 'card', 'data-bankcard': '' },
      h('h3', {}, t('wsBank')),
      h('p', { class: 'note' }, t('wsBankNote')),
      h('div', { 'data-bank': '' }, h('p', { class: 'note' }, t('loading')))));
  paintLikes();
  loadBank();
}

// ------------------------------------------------------------------ 本站题库
// 别人上传的题，按 id 从后端直接拉，不再依赖 jsonblob / Gist。
let BANK = null;

const shortTime = (ms) => {
  if (!Number(ms)) return '';
  const d = new Date(Number(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

async function loadBank(force = false) {
  // 命中缓存也要重画：draw() 会整块重建 DOM，不重画就只剩「载入中」
  if (BANK && !force) { paintBank(); return BANK; }
  try {
    const d = await cloud.list({ sort: 'new', limit: 12 });
    BANK = d.items || [];
  } catch {
    BANK = [];
  }
  paintBank();
  return BANK;
}

function paintBank() {
  const box = root.querySelector('[data-bank]');
  if (!box) return;
  const items = BANK || [];
  if (!items.length) {
    box.replaceChildren(h('p', { class: 'note' }, cloud.ready() ? t('wsBankEmpty') : t('wsBankOff')));
    return;
  }
  box.replaceChildren(h('div', { class: 'minelist' }, items.map((p) => h('div', { class: 'mine' },
    h('b', {}, p.title || p.id),
    h('span', { class: 'likebadge' }, p.likes > 0 ? `❤ ${p.likes}` : ''),
    h('small', { class: 'note' }, `${p.authorName || t('wsBankAnon')} · ${shortTime(p.updatedAt)}`),
    h('div', { class: 'mineact' },
      h('button', { class: 'link', onclick: () => openBank(p.id) }, t('wsBankOpen')),
      h('button', { class: 'link', onclick: () => playBank(p.id) }, t('wsPlay')))))));
}

async function fetchBank(id) {
  const obj = await cloud.load(id);
  const p = obj && (obj.puzzle || obj);
  if (!p || !Array.isArray(p.team)) throw new Error('bad payload');
  return { ...p, id: p.id || id, custom: true };
}

async function openBank(id) {
  try {
    const p = await fetchBank(id);
    draft = { ...emptyDraft(), ...p, hints: hintsOf(p) };
    draw();
    toast(t('wsSaved'));
  } catch {
    toast(t('wsCloudFail'));
  }
}

async function playBank(id) {
  try {
    const p = await fetchBank(id);
    location.href = 'detective.html?p=' + encodeURIComponent(codeOf(p));
  } catch {
    toast(t('wsCloudFail'));
  }
}

function mineList() {
  const list = myPuzzles();
  if (!list.length) return h('p', { class: 'note' }, t('wsNoMine'));
  return h('div', { class: 'minelist' }, list.map((p, i) => h('div', { class: 'mine' },
    h('b', {}, p.title || p.id),
    h('span', { class: 'likebadge', 'data-like': String(p.id || '') }, likeText(p.id)),
    h('small', { class: 'note' }, `${p.team.filter(a => a.tid).length} 名唤醒体 · ${p.relics.length} 造物${hintsOf(p).length ? ` · ${hintsOf(p).length} 条自定义线索` : ''}${p.uuid ? ' · 有回放' : ''}`),
    h('div', { class: 'mineact' },
      h('button', { class: 'link', onclick: () => { draft = JSON.parse(JSON.stringify(p)); draw(); } }, '编辑'),
      h('button', { class: 'link', onclick: () => { draft = JSON.parse(JSON.stringify(p)); copyCode(); } }, t('wsShare')),
      h('button', { class: 'link', onclick: () => removeMine(i) }, t('wsDel'))))));
}

// 从官方回放 JSON 文件导入（浏览器不能跨域 fetch，所以让用户先下载再选文件）
async function readFile(ev) {
  const f = ev.target.files && ev.target.files[0];
  if (!f) return;
  try {
    await applyReplay(decodeReplay(new Uint8Array(await f.arrayBuffer())));
  } catch (e) {
    console.warn('replay decode failed', e);
    toast(t('wsParseFail'));
  }
}

// ---------------------------------------------------------------- 题库回查
// 回放只记录「触发过」的密契，精确值要回查题库（题库答案里有完整命轮/密契/造物）。
let PUZZLES = null;
async function puzzleLib() {
  if (PUZZLES) return PUZZLES;
  try {
    const r = await fetch('data/puzzles.json', { cache: 'force-cache' });
    const obj = await r.json();
    PUZZLES = obj.puzzles || obj;
  } catch {
    PUZZLES = [];
  }
  return PUZZLES;
}

async function unsealPuzzle(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), (c) => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 32) {
    const ks = await sha256(`${PEPPER}|${p.id}|${i / 32}`);
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('decode failed');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function lookupPuzzle(uuid) {
  const id = String(uuid || '').trim().toLowerCase();
  if (!id) return null;
  const list = await puzzleLib();
  const hit = list.find((x) => String(x.uuid || '').toLowerCase() === id);
  if (!hit) return null;
  try { return await unsealPuzzle(hit); } catch { return null; }
}

const covByName = () => {
  const m = new Map();
  for (const c of D.covenant || []) {
    if (c.zh) m.set(String(c.zh).trim(), String(c.id));
    if (c.en) m.set(String(c.en).trim().toLowerCase(), String(c.id));
  }
  return m;
};

function replayToDraft(t, exact) {
  const d = emptyDraft();
  d.uuid = t.uuid || '';
  const byName = covByName();
  const blank = () => ({ tid: null, lv: 60, pot: 0, brk: 0, wheels: [], cov: null, dmg: 0, blk: 0, heal: 0 });
  if (exact && Array.isArray(exact.team) && exact.team.length) {
    d.team = LETTERS.map((_, i) => {
      const a = exact.team[i];
      if (!a) return blank();
      return {
        tid: String(a.tid), lv: num(a.lv, 60), pot: num(a.pot), brk: num(a.brk),
        wheels: (a.wheels || []).slice(0, 2).map(String), cov: a.cov ? String(a.cov) : null,
        dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
      };
    });
  } else {
    d.team = LETTERS.map((_, i) => {
      const a = (t.team || [])[i];
      if (!a) return blank();
      const covId = a.covName ? (byName.get(String(a.covName).trim()) || null) : null;
      return {
        tid: String(a.tid), lv: num(a.lv, 60), pot: num(a.pot), brk: num(a.brk),
        wheels: (a.wheels || []).slice(0, 2).map(String), cov: covId,
        dmg: num(a.dmg), blk: num(a.blk), heal: num(a.heal),
      };
    });
  }
  // 命中题库（exact）时，钥令 / 造物 / 题面数值都用答案里的完整字段
  d.relics = ((exact && exact.relics) || t.relics || []).map(String);
  const key = exact && exact.key != null ? exact.key
    : (t.keeperSkill != null ? t.keeperSkill : (t.key != null ? t.key : null));
  d.key = key != null ? String(key) : null;
  d.rounds = num(t.stats?.rounds) || num(exact && exact.rounds);
  d.cards = num(t.stats?.cards) || num(exact && exact.cards);
  d.maxBout = num(t.stats?.maxBout) || num(exact && exact.maxBout);
  d.deathResist = num(t.stats?.deathResist) || num(exact && exact.deathResist);
  d.playerDmg = num(t.stats?.playerDamage) || num(exact && exact.playerDmg);
  if (exact) {
    d.title = `回放 ${exact.id}`;
    d.season = num(exact.season);
    d.zone = num(exact.zone);
    d.threat = exact.threat || '?';
    d.madness = num(exact.madness);
    d.boss = exact.boss || [];
    d.score = num(exact.score);
    d.hp = num(exact.hp);
    d.left = num(exact.left);
    d.extra = !!exact.extra;
    d.diff = num(exact.diff, 3);
    d.diffScore = num(exact.diffScore, 30);
  } else {
    d.diff = 4;
    d.diffScore = Math.round(20 + Math.min(30, Math.log10(Math.max(1, d.maxBout)) * 4));
  }
  return d;
}

async function applyReplay(rep) {
  const rt = replayTeam(rep);
  const exact = await lookupPuzzle(rt.uuid);
  const keep = hintsOf(draft);           // 导入回放不改动作者已经写好的线索
  draft = replayToDraft(rt, exact);
  draft.hints = keep;
  draw();
  toast(exact ? t('wsReplayExact') : t('wsReplayNote'));
}

async function loadByCode() {
  const raw = ($('#ws-uuid')?.value || '').trim();
  const uuid = raw.replace(/^.*BattleReplay[_-]/i, '').replace(/\.json$/i, '').trim();
  if (!uuid) { toast(t('wsNeedUuid')); return; }
  const hit = await lookupPuzzle(uuid);
  if (hit) {
    const keep = hintsOf(draft);
    draft = replayToDraft({ uuid, stats: {} }, hit);
    draft.hints = keep;
    draw();
    toast(t('wsReplayExact'));
    return;
  }
  draft.uuid = uuid;
  draw();
  toast(t('wsCodeMiss'));
}

function openReplay() {
  let u = (draft.uuid || '').trim();
  if (!u) { u = prompt(t('wsNeedUuid'), '') || ''; }
  if (!u) return;
  draft.uuid = u;
  window.open(REPLAY.json(u), '_blank', 'noopener');
}

// ------------------------------------------------------------------ actions
function normalize() {
  const d = JSON.parse(JSON.stringify(draft));
  if (!d.id) d.id = 'w-' + Date.now().toString(36);
  if (!d.title) d.title = `自建题 ${new Date().toLocaleDateString()}`;
  d.team = d.team.filter(a => a.tid);
  if (d.team.length < 2) return null;
  d.team.forEach(a => { a.wheels = (a.wheels || []).filter(Boolean).slice(0, 2); });
  d.diff = d.relics.length && d.key ? 4 : d.key ? 3 : d.team.some(a => a.wheels.length) ? 2 : 1;
  d.boss = d.boss || [];
  // 自定义线索：标题和内容都空的不留；只有内容没标题的补个默认标题
  d.hints = hintsOf(d).map(c => ({
    n: String(c.n || '').trim().slice(0, 24),
    v: String(c.v || '').trim().slice(0, 140),
    c: clampCost(c.c),
  })).filter(c => c.n || c.v).slice(0, HINT_MAX)
    .map((c, i) => ({ ...c, n: c.n || t('wsHintDefault', { n: i + 1 }) }));
  return d;
}

function importJson() {
  const el = $('#ws-json');
  const d = fromJson(el ? el.value : '');
  if (!d) { toast(t('wsParseFail')); return; }
  d.hints = hintsOf(draft);
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function importCode() {
  const raw = ($('#ws-code')?.value || '').trim();
  const obj = shareCode.dec(raw);
  if (!obj || !obj.team) { toast('题目代码无法解析'); return; }
  draft = { ...emptyDraft(), ...obj, hints: unpackHints(obj.h || obj.hints) };
  draw();
}

function saveDraft() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  const list = myPuzzles();
  const i = list.findIndex(x => x.id === d.id);
  d.at = Date.now();
  if (i >= 0) list[i] = { ...list[i], ...d }; else list.push(d);
  saveMine(list);
  markDirty('mine');
  draft = d;
  draw();
  toast(t('wsSaved'));
}

function removeMine(i) {
  const list = myPuzzles();
  list.splice(i, 1);
  saveMine(list);
  markDirty('mine');
  draw();
}

function codeOf(d) {
  // 分享码只带题目必需字段，避免超长
  return shareCode.enc({
    v: 2, id: d.id, title: d.title, uuid: d.uuid,
    rounds: d.rounds, cards: d.cards, maxBout: d.maxBout, deathResist: d.deathResist,
    hp: d.hp, left: d.left, playerDmg: d.playerDmg, score: d.score, diff: d.diff, diffScore: d.diffScore,
    key: d.key, relics: d.relics, team: d.team,
    h: packHints(d.hints || []),
  });
}

function copyCode() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  const code = codeOf(d);
  (navigator.clipboard ? navigator.clipboard.writeText(code) : Promise.reject())
    .then(() => toast(t('wsCodeCopied')), () => prompt(t('wsShare'), code));
}

function play() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  location.href = 'detective.html?p=' + encodeURIComponent(codeOf(d));
}

// ------------------------------------------------------------------ 云题库（多后端）
async function upload() {
  const d = normalize();
  if (!d) { toast(t('fillAll')); return; }
  toast(t('wsCloudBusy'));
  try {
    const { id, label } = await cloud.save(JSON.parse(JSON.stringify(d)));
    store.set('lastCloud', id);
    toast(t('wsCloudUploaded', { id }) + ' · ' + label);
    copyText(id);
  } catch (e) {
    console.warn('cloud save failed', e);
    toast(t('wsCloudFail'));
  }
}

async function loadCloud() {
  let id = ($('#ws-code')?.value || '').trim();
  if (!id) { id = prompt(t('wsCloudId'), store.get('lastCloud', '')) || ''; }
  if (!id) return;
  if (id.startsWith('ZJ2-')) { importCode(); return; }
  try {
    const obj = await cloud.load(id);
    const p = obj.puzzle || obj;
    if (!p || !p.team) throw new Error('bad payload');
    draft = { ...emptyDraft(), ...p };
    draw();
    toast(t('wsSaved'));
  } catch (e) {
    console.warn('cloud load failed', e);
    toast(t('wsCloudFail'));
  }
}

// 云题库设置：留空则只用 jsonblob（公共、可能被墙）
function cloudSettings() {
  const dlg = h('dialog', { class: 'dlg' });
  const gh = h('input', { type: 'password', placeholder: 'ghp_… / github_pat_…', value: cloudConfig.ghToken.get() });
  const url = h('input', { type: 'url', placeholder: 'https://your-worker.example.workers.dev/bank', value: cloudConfig.customUrl.get() });
  dlg.append(
    h('h3', {}, t('wsCloudCfg')),
    h('p', { class: 'note' }, t('wsCloudCfgNote')),
    h('label', { class: 'fld' }, h('span', {}, 'GitHub token'), gh),
    h('label', { class: 'fld' }, h('span', {}, t('wsCloudCfgUrl')), url),
    h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => {
        cloudConfig.ghToken.set(gh.value); cloudConfig.customUrl.set(url.value);
        toast(t('wsSaved')); dlg.close();
      } }, t('save')),
      h('button', { class: 'btn ghost', onclick: () => dlg.close() }, t('cancel'))),
  );
  document.body.append(dlg);
  dlg.showModal();
  dlg.addEventListener('close', () => dlg.remove());
}

function copyText(txt) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).catch(() => {});
}

// ------------------------------------------------------------------ picker
const dlg = h('dialog', { class: 'picker' });
document.body.append(dlg);

// opts.block(e) 返回「不能选的原因」，返回空串表示可选；被挡住的仍然显示，
// 只是标灰不可点——总比凭空消失好，用户至少知道这类唤醒体为什么填不进来。
function openPicker(kind, apply, opts = {}) {
  const all = D[kind].filter(e => e.id != null);
  const block = typeof opts.block === 'function' ? opts.block : () => '';
  let q = '';
  const grid = h('div', { class: 'pgrid' });
  const drawList = () => {
    const list = all.filter(e => !q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q));
    // 能选的排前面，被规则挡住的沉底，位置稳定（不排序名字，避免看起来像另一套顺序）
    const rows = list.slice(0, 400).map(e => ({ e, why: block(e) }));
    rows.sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0));
    grid.replaceChildren(...rows.map(({ e, why }) => h('button', {
      type: 'button', class: `pitem${why ? ' blocked' : ''}`, title: why || e.en,
      disabled: Boolean(why),
      onclick: why ? null : () => { apply(String(e.id)); dlg.close(); },
    },
    imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)),
    why ? h('em', { class: 'decoy' }, why) : null)));
    if (!list.length) grid.append(h('p', { class: 'note' }, t('noMatch')));
  };
  const note = typeof opts.note === 'function' ? opts.note() : (opts.note || '');
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, KINDS[kind] || kind),
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); drawList(); } }),
      h('button', { class: 'btn sm ghost', onclick: () => { apply(null); dlg.close(); } }, t('clear')),
      h('button', { class: 'btn sm', onclick: () => dlg.close() }, t('close'))),
    note ? h('p', { class: 'note picknote' }, note) : null,
    grid);
  drawList();
  dlg.showModal();
}

draw();
// 我的题目：拉一次赞数，有新赞就折算成银芯；顺带把上次没发完的赞补发
refreshLikes();
likes.resume();
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

