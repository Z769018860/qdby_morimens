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
    relicInnate: '固有 {n} 件已给出', innateTag: '固有造物', clueDim: '维度影像', clueDimNone: '没有更多维度影像了，已返还银芯', clueDimBtn: '再解锁一个', relicFillTag: '需补齐',
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
    relicInnate: '{n} innate given', innateTag: 'Innate relic', clueDim: 'Dimensional Images', clueDimNone: 'No more Dimensional Images — credits refunded', clueDimBtn: 'Unlock another', relicFillTag: 'to fill in',
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

// ---- js/sitestats.js
const m_sitestats = await (async () => {
const { store } = m_common;
// 站点计数 + 打点 + 「我是不是管理员」。
//
// 左上角那三个数（注册用户 / 今日浏览 / 总浏览）来自 edge-functions 的 /stats。
// 边缘一个来回 1~2 秒，所以这里做三件事，避免每页都去问一遍：
//   1. 结果缓存 60 秒（localStorage），过期了先给旧数、后台再刷新；
//   2. 打点 POST /visit 走 keepalive 且不 await，页面跳走也不会被取消；
//   3. 后端不可用时给缓存值，界面显示「—」而不是把整块藏起来。


const CACHE = 'site:stats';       // 上一次拿到的数字
const TTL = 60e3;
const LIVE = 'site:api';          // 探测结果：{ base, at, v, store, storeOk }
const LIVE_TTL = 10 * 60e3;

// GitHub Pages 那份镜像没有自己的后端。但 EdgeOne 那套函数回了 CORS
// （Access-Control-Allow-Origin 回显请求方，OPTIONS 也放行 Authorization），
// 所以镜像站可以跨域读统计、也能调管理接口。
//
// 这条别删：删了镜像站上三个数永远是「—」，管理页永远说「你不是站长」——
// 因为前端连请求都没发，只能当没登录/没权限。
const EDGE_API = 'https://morimens.qingdengbuyi.top/api';

// 候选后端，按优先级排队：手填的 → 同源 → EdgeOne
function candidates() {
  const out = [];
  try {
    const custom = String(store.get('apiBase', '') || '').trim().replace(/\/+$/, '');
    if (custom) out.push(custom);
  } catch { /* 隐私模式 */ }
  try {
    if (/^https?:$/.test(location.protocol) && !/\.github\.io$/i.test(location.hostname)) {
      out.push(location.origin + '/api');
    }
  } catch { /* 非浏览器环境 */ }
  if (out.indexOf(EDGE_API) < 0) out.push(EDGE_API);
  return out;
}

function liveCache() {
  const v = store.get(LIVE, null);
  return v && v.base && Date.now() - Number(v.at || 0) < LIVE_TTL ? v : null;
}

// 带超时的 fetch。
// 探活只是「顺手问一句」，一处来回本来 1~2 秒；没有上限的话，碰上挂住的后端
// 整个页面就停在那儿（管理页的「正在检查后端…」就是这么卡住的）。
// 不用 Promise.prototype.finally：Safari 11 没有，老浏览器会直接抛 TypeError。
function fetchT(url, opts, ms) {
  if (typeof AbortController !== 'function') return fetch(url, opts);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms || 6000);
  const stop = () => clearTimeout(timer);
  const o = Object.assign({}, opts, { signal: ac.signal });
  return fetch(url, o).then((r) => { stop(); return r; }, (e) => { stop(); throw e; });
}

// 当前该打哪个后端。管理页要自己拼 Authorization（不走 js/api.js），从这里取。
function base() {
  const hit = liveCache();
  if (hit) return hit.base;
  const list = candidates();
  return list[0] || '';
}

// 探一次活的后端，结果缓存 10 分钟；返回 '' 表示一个都不通。
// 判定用 service==='zjtt' 而不是 r.ok：/health 在存储没配好时是 503，
// 但那种情况正需要报给用户（说明接口在、存储坏了），不能当成「后端不存在」。
async function probe(force = false) {
  if (!force) {
    const hit = liveCache();
    if (hit) return hit.base;
  }
  for (const b of candidates()) {
    try {
      const r = await fetchT(b + '/health', { headers: { Accept: 'application/json' } }, 6000);
      const j = await r.json().catch(() => null);
      if (j && j.service === 'zjtt') {
        store.set(LIVE, {
          base: b, at: Date.now(), v: Number(j.v) || 0,
          store: String(j.store || ''), storeOk: !!j.storeOk,
        });
        return b;
      }
    } catch { /* 试下一个 */ }
  }
  return '';
}

// 后端版本 + 存储状态。管理页用它区分「函数没部署」和「你没权限」——
// 这两种情况在前端看起来都是「进不去」，但处理办法完全不同。
async function health(force = true) {
  const b = await probe(force);
  if (!b) return { ok: false, base: '', v: 0, store: '', storeOk: false };
  const hit = store.get(LIVE, null) || {};
  return { ok: true, base: b, v: Number(hit.v) || 0, store: hit.store || '', storeOk: !!hit.storeOk };
}

const pick = (j) => ({
  users: Number(j && j.users) || 0,
  today: Number(j && j.today) || 0,
  total: Number(j && j.total) || 0,
});

function cached() {
  const c = store.get(CACHE, null);
  return c && typeof c === 'object' && Number.isFinite(Number(c.total)) ? pick(c) : null;
}

// 拿最新数字：force=false 时优先给缓存（同时在后台刷新）
async function stats(force = false) {
  const c = store.get(CACHE, null);
  const fresh = c && Date.now() - Number(c.at || 0) < TTL;
  if (c && fresh && !force) return pick(c);

  const b = await probe();
  if (!b) return c ? pick(c) : null;
  try {
    const r = await fetchT(b + '/stats', { headers: { Accept: 'application/json' } }, 8000);
    const j = await r.json();
    if (!r.ok || !j || j.ok === false) throw new Error('bad');
    const out = pick(j);
    store.set(CACHE, { ...out, at: Date.now() });
    return out;
  } catch {
    return c ? pick(c) : null;
  }
}

// 浏览打点。同一页面同一次会话只算一次（刷新算新的一次，符合 PV 口径），
// 免得 SPA 内部反复调用把数字刷飞。
let pinged = false;
async function ping() {
  if (pinged) return;
  pinged = true;
  try {
    const key = 'pv:' + location.pathname;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch { /* 隐私模式：照发 */ }

  const b = await probe();
  if (!b) return;
  try {
    fetch(b + '/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device': devId() },
      body: JSON.stringify({ p: location.pathname }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* 忽略 */ }
}

const token = () => { try { return store.get('authToken', '') || ''; } catch { return ''; } };
const devId = () => {
  let v = store.get('did', '');
  if (!v) { v = 'd_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); store.set('did', v); }
  return v;
};

// 我是不是管理员（服务端判定，前端只拿来决定要不要显示入口）
//
// 返回值里的 error 很重要，别一律当「没权限」：
//   no_token  本机没登录
//   no_api    一个后端都连不上
//   old_api   后端是老版本，没有 /whoami（需要重新部署 edge-functions）
//   http_xxx  其他状态码
async function whoami() {
  const t = token();
  if (!t) return { logged: false, admin: false, error: 'no_token' };

  const b = await probe();
  if (!b) return { logged: true, admin: false, error: 'no_api' };

  try {
    const r = await fetchT(b + '/whoami', {
      headers: { Accept: 'application/json', Authorization: 'Bearer ' + t },
    }, 8000);
    const j = await r.json().catch(() => null);
    // 老后端没有这个路由，返回的是 404 + {"ok":false,"error":"not_found"}
    if (r.status === 404) return { logged: true, admin: false, error: 'old_api', status: 404, base: b };
    if (!r.ok || !j) return { logged: true, admin: false, error: 'http_' + r.status, status: r.status, base: b };
    return {
      logged: !!j.logged, admin: !!j.admin,
      name: j.name || '', uid: j.uid || '',
      reason: j.reason || '', pinned: j.pinned || '', hint: j.hint || '',
      base: b,
    };
  } catch {
    return { logged: true, admin: false, error: 'offline', base: b };
  }
}

// 一万以上折成「1.2 万」，左上角位置很窄
function fmt(n) {
  n = Number(n) || 0;
  if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
  return String(n);
}
return { EDGE_API, base, probe, health, cached, stats, ping, whoami, fmt };
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
      { k: '结局', v: got + ' / 30' },
    ],
    extra: best.gold ? '拿到过「守灯人」' : (got ? '还有 ' + (30 - got) + ' 个结局没见过' : ''),
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
  { k: 'reign', n: '弥萨格王权', href: 'reign.html', icon: '👑', read: reign, tip: '准或不准，四项账' },
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

// ---- js/admin.js
const m_admin = await (async () => {
const { $, h, toast, store } = m_common;
const { auth, openLogin } = m_auth;
const sitestats = m_sitestats;
const { GD_SPEC, fmtDur } = m_gamestats;
// 管理后台 —— 只有「姜酒」这个账号能进。
//
// 权限判定全在服务端（edge-functions 的 /whoami 与 /admin/*）：
// 前端这个页面只是个界面，就算有人直接打开 admin.html，拿不到 /admin/overview
// 也什么都看不到。第一次认领时服务端会把 uid 钉进 admin_uid，
// 之后别人把昵称改成「姜酒」也进不来。



// 九个游戏的字段名与显示顺序只在 js/gamestats.js 里写一遍（GD_SPEC），
// 后台按它渲染，跟 digest() 上报的数组一一对应。

// 不用 js/api.js：那份在 GitHub Pages 上认为「没有后端」（ready() 为 false → 直接抛 no_api），
// 而镜像站其实能跨域打到 EdgeOne 的函数（对方回了 CORS）。这里自己拼请求，
// 地址从 sitestats.base() 拿，跟统计口径保持一致。

const app = $('#app');
const sheet = $('#sheet');
const sheetBox = $('#sheetBox');

const fmt = sitestats.fmt;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const when = (ms) => {
  const n = Number(ms) || 0;
  if (!n) return '—';
  const d = new Date(n);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const ago = (ms) => {
  const n = Number(ms) || 0;
  if (!n) return '—';
  const s = Math.max(0, (Date.now() - n) / 1000);
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s / 60) + ' 分钟前';
  if (s < 86400) return Math.floor(s / 3600) + ' 小时前';
  if (s < 86400 * 30) return Math.floor(s / 86400) + ' 天前';
  return when(n).slice(0, 10);
};

// ------------------------------------------------------------------ 请求
// 自己拼，不吃 js/api.js 的「github.io 就当没后端」
function tokenOf() {
  try { return store.get('authToken', '') || ''; } catch { return ''; }
}

async function req(path, { method = 'GET', body, timeout = 20000 } = {}) {
  const b = sitestats.base();
  if (!b) {
    const e = new Error('no_api'); e.status = 0; e.code = 'no_api'; throw e;
  }
  const headers = { Accept: 'application/json' };
  const t = tokenOf();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  // 一定要有上限：边缘函数的 /admin/overview 要扫全部用户，碰上慢请求能挂几十秒，
  // 没有超时的话页面就一直停在「正在检查后端…」，看起来像卡死。
  const ac = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), timeout) : null;
  let res;
  try {
    res = await fetch(b + path, {
      method, headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ac ? ac.signal : undefined,
    });
  } catch (err) {
    const slow = err && err.name === 'AbortError';
    const e = new Error(slow ? 'timeout' : 'offline');
    e.status = 0; e.code = slow ? 'timeout' : 'offline'; e.ms = timeout;
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) {
    const e = new Error(j.error || ('http_' + res.status));
    e.status = res.status;
    e.code = j.error || '';
    e.detail = j.detail || null;
    throw e;
  }
  return j;
}

// ------------------------------------------------------------------ 门禁
function gate(title, ...parts) {
  app.replaceChildren(h('section', { class: 'card gate' }, h('h1', {}, title), ...parts));
}

// 诊断块：把「前端以为的」和「服务端看到的」都摊开。
// 之前这里只写一句「不是站长账号」，站长本人看到了也无从下手——
// 搞不清是昵称不对、位置被占、还是函数根本没部署。
function diag(rows) {
  return h('div', { class: 'diag' },
    rows.map(([k, v]) => h('div', { class: 'diagrow' },
      h('span', {}, k),
      h('b', {}, String(v == null || v === '' ? '—' : v)))));
}

function needsLogin() {
  const t = tokenOf();
  gate('需要登录', h('p', {}, '这个页面只对站长的账号开放。请先用「姜酒」登录。'),
    t ? diag([
      ['本机登录状态', '有 token，但后端不认'],
      ['后端地址', sitestats.base() || '（一个都没探通）'],
      ['提示', '后端要是 v3 之前的版本，验票接口是坏的，重新部署 edge-functions 后再点重试'],
    ]) : null,
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'),
      t ? retryBtn() : null));
}

// 阶段提示：这一步可能要等十几秒，写清楚在等什么，别让人以为卡死了
function loading(title, sub) {
  gate(title, h('p', {}, sub || '最多等 20 秒；超时会自动报错并给重试按钮，不用刷新页面。'));
}

function denied(d) {
  const name = (d && d.name) || (auth.user && auth.user.name) || '未知';
  const uid = String((d && d.uid) || '');
  const pinned = d && d.pinned ? String(d.pinned) : '';
  gate('没有权限',
    h('p', {}, d && d.hint ? d.hint : `当前登录的是「${name}」，不是站长账号。`),
    diag([
      ['当前显示名', name],
      ['当前 UID', uid ? uid.slice(0, 16) + '…' : ''],
      ['服务端钉住的 UID', pinned ? pinned.slice(0, 16) + '…' : '还没被认领'],
      ['后端地址', sitestats.base()],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页'),
      h('button', { class: 'btn ghost', onclick: () => location.reload() }, '重新判定')));
}

// ------------------------------------------------------------------ 发放面板
function openGrant(u, onDone) {
  const amountEl = h('input', { type: 'number', min: '1', max: '100000', value: '100', placeholder: '银芯数量' });
  const noteEl = h('input', { type: 'text', maxlength: '120', placeholder: '备注（会显示给用户，例如「BUG 反馈奖励」）' });
  const okBtn = h('button', { class: 'btn gold', onclick: send }, '确认发放');
  const quick = h('div', { class: 'quick' }, [50, 100, 300, 1000, 3000].map((v) => h('button', {
    type: 'button', onclick: () => { amountEl.value = String(v); },
  }, String(v))));

  async function send() {
    const amount = Math.round(Number(amountEl.value) || 0);
    if (!(amount > 0)) { toast('数量要大于 0'); return; }
    okBtn.disabled = true;
    okBtn.textContent = '发放中…';
    try {
      const r = await req('/admin/grant', { method: 'POST', body: { uid: u.uid, amount, note: noteEl.value.trim() } });
      toast(`已给「${u.name || u.uid}」发放 ${r.amount} 银芯（对方下次打开站点时到账）`);
      closeSheet();
      if (onDone) onDone();
    } catch (e) {
      toast('发放失败：' + (e.message || e.code || '未知错误'));
      okBtn.disabled = false;
      okBtn.textContent = '确认发放';
    }
  }

  sheetBox.replaceChildren(
    h('h3', {}, '发放银芯'),
    h('p', { class: 'who' }, `${u.name || '（未命名）'} · 当前 ${u.acct ? u.acct.cr : 0} 银芯 · UID ${String(u.uid).slice(0, 10)}…`),
    quick,
    h('div', { class: 'row' }, amountEl),
    h('div', { class: 'row' }, noteEl),
    h('div', { class: 'acts' },
      h('button', { class: 'btn ghost', onclick: closeSheet }, '取消'), okBtn));
  sheetBox.classList.remove('wide');
  sheet.classList.add('on');
  amountEl.focus();
}
function closeSheet() { sheet.classList.remove('on'); }
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

// ------------------------------------------------------------------ 九个游戏的详情
// 数据来自云端档案的 gd（js/gamestats.js 的 digest）：只有数字摘要，没有整份存档。
function openGames(u) {
  const a = u.acct || {};
  const gd = (a.gd && typeof a.gd === 'object' && !Array.isArray(a.gd)) ? a.gd : null;
  const cards = [];
  if (gd) {
    for (const spec of GD_SPEC) {
      const v = gd[spec.k];
      if (!Array.isArray(v) || !v.length) continue;
      cards.push(h('div', { class: 'gcard' },
        h('b', {}, spec.n),
        h('div', { class: 'ggrid' }, spec.f(v).map(([k, val]) =>
          h('span', {}, h('i', {}, k), h('em', {}, val))))));
    }
  }
  sheetBox.replaceChildren(
    h('h3', {}, `游戏数据 · ${u.name || '（未命名）'}`),    h('p', { class: 'who' }, `云端档案同步于 ${a.at ? when(a.at) : '—'}。九个游戏的进度都来自对方本机存档，只有数字摘要；换设备不会带走存档本体。`),
    cards.length
      ? h('div', { class: 'gwrap' }, cards)
      : h('p', { class: 'empty' }, '这个账号还没上报游戏数据——档案是旧版，或者他上次同步时还没带上（让对方再打开一次站点就会补上）。'),
    h('div', { class: 'acts' },
      h('button', { class: 'btn ghost', onclick: closeSheet }, '关闭'),
      h('button', { class: 'btn ghost', onclick: () => openIdleSave(u) }, '挂机存档详情'),
      h('button', { class: 'btn gold', onclick: () => { closeSheet(); openGrant(u, load); } }, '发放银芯')));
  sheetBox.classList.add('wide');
  sheet.classList.add('on');
}

// 挂机前夜云存档详情：账号档案里的摘要只在个人中心等页面同步时才更新，可能是旧的；这里读的是挂机自己上传的云存档
async function openIdleSave(u) {
  const body = h('div', {}, h('p', { class: 'sub' }, '读取中…'));
  sheetBox.replaceChildren(h('h3', {}, `挂机存档 · ${u.name || '（未命名）'}`), body,
    h('div', { class: 'acts' }, h('button', { class: 'btn ghost', onclick: () => openGames(u) }, '返回')));
  sheetBox.classList.add('wide');
  const note = (t) => body.replaceChildren(h('p', { class: 'sub' }, t));
  try {
    const r = await req('/admin/idle-save?uid=' + encodeURIComponent(u.uid), { timeout: 40000 });
    if (!r.found) { note('这个账号没有上传过挂机前夜的云存档（只在本机玩，或没登录）。'); return; }
    if (r.broken) { note('云存档正文损坏，读不出来。'); return; }
    const sm = r.summary, g = (k, v) => h('span', {}, h('i', {}, k), h('em', {}, String(v)));
    const fmtT = (s) => (s ? fmtDur(s) : '—');
    body.replaceChildren(
      h('p', { class: 'sub' }, `云端版本 ${r.ver} · 上传于 ${when(r.cloudAt)} · 创建于 ${when(sm.created)} · 最后在线 ${when(sm.lastSeen)}`),
      r.flags.length
        ? h('div', { class: 'gcard', style: 'border-color:#e8695f' }, h('b', {}, '⚠ 对不上的地方'), ...r.flags.map((f) => h('p', { class: 'sub', style: 'color:#b42318' }, f)))
        : h('p', { class: 'sub', style: 'color:#1a7f37' }, '没有发现明显对不上的地方（游玩时长 / 战斗场数 / 胜场 / 关数基本吻合）。'),
      h('div', { class: 'gcard' }, h('b', {}, '进度'), h('div', { class: 'ggrid' },
        g('游玩时长', fmtT(sm.play)), g('创建到最后在线', fmtT(sm.wallSeconds)), g('最高关卡', '第 ' + sm.maxStage + ' 关'), g('当前关卡', '第 ' + sm.stage + ' 关'),
        g('战斗场数', sm.battles), g('胜场', sm.wins), g('累计击杀', sm.kills), g('召唤次数', sm.pulls),
        g('金币', sm.gold), g('召唤券', sm.tickets), g('银芯', sm.cores), g('累计获得金币', sm.goldEarned), g('累计花费银芯', sm.coresSpent),
        g('拥有角色', sm.roster), g('成就', sm.ach), g('收到的赠礼', sm.giftIds))),
      h('div', { class: 'gcard' }, h('b', {}, '养成最高的 12 位'), h('div', { class: 'ggrid' },
        ...r.top.map((t) => g(t.slug, `Lv ${t.lv} · 叠位 ${t.star}${t.brk ? ' · 突破 ' + t.brk : ''}`)))));
  } catch (e) {
    note('读取失败：' + (e.message || e.code || '未知错误'));
  }
}

// ------------------------------------------------------------------ 主体
let USERS = [];
let Q = '';
const SEL = new Set();          // 勾选的 uid（批量发放用）
let AWK = null;                  // 挂机前夜唤醒体清单（slug / 中文名），第一次打开批量面板时再读

function kpis(s, users) {
  const synced = users.filter((u) => u.acct).length;
  const withGd = users.filter((u) => u.acct && u.acct.gd && typeof u.acct.gd === 'object').length;
  const active7 = users.filter((u) => Date.now() - (u.seen || u.at || 0) < 7 * 86400e3).length;
  const box = (label, value, sub) => h('div', { class: 'kpi' }, h('small', {}, label), h('b', {}, value), h('span', {}, sub || ''));
  return h('div', { class: 'kpis' },
    box('注册用户', fmt(s.users), `最近 7 天活跃 ${active7}`),
    box('今日浏览', fmt(s.today), ''),
    box('总浏览', fmt(s.total), ''),
    box('有云端档案', String(synced), `占 ${pct(synced, users.length)}%`),
    box('有游戏数据', String(withGd), '九个游戏的进度摘要'),
    box('BUG 反馈', String(s.bugs || 0), '历史累计'));
}

function row(u) {
  const a = u.acct || null;
  const gd = (a && a.gd && typeof a.gd === 'object' && !Array.isArray(a.gd)) ? a.gd : null;
  const il = gd && Array.isArray(gd.il) ? gd.il : null;
  const cb = h('input', { type: 'checkbox', checked: SEL.has(String(u.uid)), 'aria-label': '选择 ' + (u.name || u.uid) });
  cb.addEventListener('change', () => { if (cb.checked) SEL.add(String(u.uid)); else SEL.delete(String(u.uid)); batchHint(); });
  return h('tr', {},
    h('td', {}, cb),
    h('td', {}, h('div', { class: 'namecell' },
      h('b', {}, u.name || '（未命名）'),
      a ? h('span', { class: 'badge ok' }, '已同步') : h('span', { class: 'badge no' }, '未同步'))),
    h('td', {}, ago(u.seen || u.at)),
    h('td', {}, when(u.at)),
    h('td', { class: 'num' }, a ? String(a.cr) : '—'),
    h('td', { class: 'num' }, a ? (a.played ? `${a.played} 局 · ${pct(a.won, a.played)}%` : '0 局') : '—'),
    h('td', { class: 'num' }, a ? String(a.cg) : '—'),
    h('td', { class: 'num' }, a ? String(a.mb) : '—'),
    h('td', { class: 'num' }, a ? String(a.bb) : '—'),
    h('td', {}, il ? fmtDur(il[0]) : '—'),
    h('td', { class: 'num' }, il ? String(il[1]) : '—'),
    h('td', {}, a ? when(a.at) : '—'),
    h('td', {}, h('div', { class: 'rowacts' },
      h('button', { class: 'btn sm ghost', onclick: () => openGames(u) }, '游戏'),
      h('button', { class: 'btn sm gold', onclick: () => openGrant(u, load) }, '发放'))));
}

const matched = () => (Q
  ? USERS.filter((u) => (u.name || '').toLowerCase().includes(Q) || String(u.uid).includes(Q))
  : USERS);

function table() {
  const list = matched();
  if (!list.length) return h('p', { class: 'empty' }, Q ? '没有匹配的用户。' : '还没有任何账号登录过本站。');
  return h('div', { class: 'tblwrap' },
    h('table', {},
      h('thead', {}, h('tr', {},
        h('th', {}, ''), h('th', {}, '账号'), h('th', {}, '最近活跃'), h('th', {}, '首次登录'),
        h('th', {}, '银芯'), h('th', {}, '推理'), h('th', {}, 'CG'),
        h('th', {}, '合成'), h('th', {}, '鸟弟'),
        h('th', {}, '挂机时长'), h('th', {}, '角色'),
        h('th', {}, '同步时间'), h('th', {}, '操作'))),
      h('tbody', {}, list.slice(0, 300).map(row))));
}


// ------------------------------------------------------------------ 批量发放
// 银芯是账号级的（所有游戏共用钱包），唤醒体是挂机前夜的：对方下次打开站点 / 进挂机前夜时到账。
let batchHintEl = null;
function batchHint() {
  if (batchHintEl) batchHintEl.textContent = `已勾选 ${SEL.size} 人 · 当前搜索结果 ${matched().length} 人 · 全部 ${USERS.length} 人`;
}

async function loadAwk() {
  if (AWK) return AWK;
  try {
    const r = await fetch('idle/public/data/game-data.json', { cache: 'no-cache' });
    const d = await r.json();
    AWK = (d.awakeners || []).filter((a) => a && a.slug).map((a) => ({ slug: a.slug, zh: a.zh || a.slug, rarity: a.rarity || '' }));
  } catch { AWK = []; }
  return AWK;
}

function batchCard(onDone) {
  const picked = new Set();
  let target = 'all';
  const amountEl = h('input', { type: 'number', min: '0', max: '100000', value: '100', placeholder: '银芯数量（0 = 不发）' });
  const noteEl = h('input', { type: 'text', maxlength: '120', placeholder: '备注（会显示给用户，例如「全服补偿」）' });
  const awkBox = h('div', { class: 'awkbox' }, h('span', { class: 'sub' }, '读取唤醒体清单…'));
  const awkSearch = h('input', { type: 'text', placeholder: '搜唤醒体名字', style: 'width:160px' });
  const pickedEl = h('p', { class: 'sub' }, '没有选唤醒体（只发银芯）');
  const okBtn = h('button', { class: 'btn gold', onclick: send }, '确认批量发放');
  batchHintEl = h('p', { class: 'sub' });
  batchHint();

  const tgt = h('div', { class: 'tgt' }, [
    ['all', '所有人'], ['sel', '表格里勾选的人'], ['filter', '当前搜索结果'],
  ].map(([k, label]) => {
    const r = h('input', { type: 'radio', name: 'tgt', value: k, checked: k === 'all' });
    r.addEventListener('change', () => { target = k; });
    return h('label', {}, r, ' ' + label);
  }));

  function paintPicked() {
    pickedEl.textContent = picked.size
      ? `唤醒体 ${picked.size} 名：` + [...picked].map((s) => (AWK.find((a) => a.slug === s) || {}).zh || s).join('、') + '（已有的会叠位 +1）'
      : '没有选唤醒体（只发银芯）';
  }
  function paintAwk() {
    const q = awkSearch.value.trim().toLowerCase();
    awkBox.replaceChildren(...AWK.filter((a) => !q || a.zh.toLowerCase().includes(q) || a.slug.includes(q)).map((a) => {
      const b = h('button', { type: 'button', class: 'chip' + (picked.has(a.slug) ? ' on' : ''), title: a.slug }, a.zh);
      b.addEventListener('click', () => { if (picked.has(a.slug)) picked.delete(a.slug); else picked.add(a.slug); b.classList.toggle('on'); paintPicked(); });
      return b;
    }));
    if (!AWK.length) awkBox.replaceChildren(h('span', { class: 'sub' }, '读不到唤醒体清单（idle/public/data/game-data.json），只能发银芯。'));
  }
  loadAwk().then(() => { paintAwk(); });
  awkSearch.addEventListener('input', paintAwk);

  async function send() {
    const amount = Math.round(Number(amountEl.value) || 0);
    const awk = [...picked];
    if (!(amount > 0) && !awk.length) { toast('银芯和唤醒体至少发一样'); return; }
    let body = { amount, awk, note: noteEl.value.trim() };
    let who = '';
    if (target === 'all') { body.all = true; who = `全部 ${USERS.length} 个账号`; }
    else {
      const list = target === 'sel' ? USERS.filter((u) => SEL.has(String(u.uid))) : matched();
      if (!list.length) { toast(target === 'sel' ? '还没有勾选任何人' : '当前搜索没有结果'); return; }
      body.uids = list.map((u) => String(u.uid));
      who = `${list.length} 个账号`;
    }
    const what = [amount > 0 ? `${amount} 银芯` : '', awk.length ? `${awk.length} 名唤醒体` : ''].filter(Boolean).join(' + ');
    if (!confirm(`给 ${who} 各发放：${what}。\n\n发出去收不回，确定？`)) return;
    okBtn.disabled = true; okBtn.textContent = '发放中…';
    try {
      const r = await req('/admin/grant-batch', { method: 'POST', body, timeout: 60000 });
      toast(r.failed
        ? `已发放给 ${r.sent}/${r.total} 个账号，${r.failed} 个失败（存储限流）：再点一次会重复发给已成功的人，请改用「勾选」只补发漏掉的`
        : `已发放给 ${r.sent}/${r.total} 个账号（对方下次打开站点 / 进挂机前夜时到账）`, 8000);
      if (r.failedUids && r.failedUids.length) { SEL.clear(); r.failedUids.forEach((x) => SEL.add(String(x))); }
      if (onDone) onDone();
    } catch (e) {
      toast('批量发放失败：' + (e.message || e.code || '未知错误') + (typeof e.detail === 'string' && e.detail ? '（' + e.detail + '）' : ''), 8000);
    } finally { okBtn.disabled = false; okBtn.textContent = '确认批量发放'; }
  }

  return h('section', { class: 'card' },
    h('h2', {}, '批量发放'),
    h('p', { class: 'sub' }, '银芯进账号钱包（所有游戏通用），唤醒体进挂机前夜的角色库——没有就新增，已有就叠位 +1。可以只发其中一样。'),
    tgt, batchHintEl,
    h('div', { class: 'quick' }, [50, 100, 300, 1000, 3000].map((v) => h('button', { type: 'button', onclick: () => { amountEl.value = String(v); } }, String(v)))),
    h('div', { class: 'row' }, amountEl, noteEl),
    h('div', { class: 'row' }, awkSearch, h('button', { type: 'button', class: 'btn sm ghost', onclick: () => { picked.clear(); paintAwk(); paintPicked(); } }, '清空唤醒体')),
    awkBox, pickedEl,
    h('div', { class: 'acts' }, okBtn));
}

function render(data, h0) {
  const me = data.me || {};
  const stats = data.stats || { users: 0, today: 0, total: 0, bugs: 0 };
  const who = me.name || (auth.user && auth.user.name) || '管理员';
  const searchEl = h('input', { type: 'text', placeholder: '搜昵称或 UID', value: Q, style: 'width:200px' });
  searchEl.addEventListener('input', () => {
    Q = searchEl.value.trim().toLowerCase();
    body.replaceChildren(table());
    batchHint();
  });
  const body = h('div', {}, table());
  const refresh = h('button', { class: 'btn ghost sm', onclick: (e) => { e.target.disabled = true; load(); } }, '刷新');

  app.replaceChildren(
    h('section', { class: 'pagehead' },
      h('h1', {}, '管理后台'),
      h('p', {}, `当前登录：${who} · 只对站长可见。用户数据是「登录过本站的账号」，不是 Waline 全站注册表。`),
      h('p', { class: 'sub' }, `后端 ${(h0 && h0.base) || sitestats.base()} · 接口 v${(h0 && h0.v) || 0} · 存储 ${(h0 && h0.store) || '未知'}${h0 && h0.storeOk === false ? '（不可写！）' : ''}`)),
    h('section', { class: 'card' },
      h('h2', {}, '站点概况'),
      h('p', { class: 'sub' }, '浏览数从 2026-10 起统计；注册用户指用过本站的账号。'),
      kpis(stats, data.users || [])),
    batchCard(),
    h('section', { class: 'card' },
      h('h2', {}, `用户列表 · ${(data.users || []).length}`),
      h('p', { class: 'sub', id: 'ixmsg', style: 'color:#b45309' }, ''),
      h('p', { class: 'sub' }, '「未同步」= 登录过但没传过云端档案，说明他只在游客模式下点过登录。发放的银芯在对方下次打开站点、同步档案时到账。'),
      h('div', { class: 'toolbar' }, searchEl, refresh),
      body));
}

// ------------------------------------------------------------------ 补全用户索引
// 后台和榜单读的是一份「用户索引」（谁的数据变了就更新谁那一行）。索引上线之前注册的老用户
// 还没有那一行：这里自动补——先拿键名清单，再每次 8 个让服务端读完写进索引，期间显示进度。
let reindexing = false;
let reindexTried = false;          // 一次页面生命周期只自动补一次：有读不出来的用户时别无限重试
async function reindexIfNeeded(data) {
  const st = data.stats || {};
  const msg = () => document.getElementById('ixmsg');
  if (reindexing || reindexTried || !(st.users > (st.indexed || 0))) return;
  reindexing = true; reindexTried = true;
  try {
    if (msg()) msg().textContent = `注册 ${st.users} 人，索引里只有 ${st.indexed || 0} 人，正在补全…`;
    const { keys } = await req('/admin/reindex-keys', { timeout: 40000 });
    let done = 0;
    for (let i = 0; i < keys.length; i += 8) {
      const r = await req('/admin/reindex', { method: 'POST', body: { keys: keys.slice(i, i + 8) }, timeout: 60000 });
      done += Number(r.done) || 0;
      if (msg()) msg().textContent = `正在补全用户索引 ${Math.min(i + 8, keys.length)}/${keys.length}…`;
    }
    if (msg()) msg().textContent = `索引已补全（${done} 人）。`;
    reindexing = false;
    await load();
  } catch (e) {
    reindexing = false;
    if (msg()) msg().textContent = '补全索引中断：' + (e.message || e.code || '未知错误') + '。刷新页面会从头再来。';
  }
}

// ------------------------------------------------------------------ 载入
let BACKEND = { base: '', v: 0, store: '', storeOk: true };

const retryBtn = () => h('button', { class: 'btn ghost', onclick: () => location.reload() }, '重试');

function noBackend(h0) {
  gate('连不上后端',
    h('p', {}, '统计和管理都放在站点后端里，但这一次一个地址都没探通。GitHub Pages 那份镜像自己没有函数，只能借 EdgeOne 的；那边要是没部署或挂了，这里就是空的。'),
    diag([
      ['试过的地址', sitestats.EDGE_API],
      ['当前页面', location.host],
      ['本机配置的后端', (() => { try { return store.get('apiBase', '') || '（没配）'; } catch { return ''; } })()],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
}

function oldBackend(h0) {
  gate('后端还是旧版本',
    h('p', {}, `线上这版函数是 v${h0.v}，只有点赞 / 账号档案 / 工坊题库，没有 /stats、/whoami、/admin/*。`),
    h('p', {}, '代码已经在仓库里了，去 EdgeOne 控制台把这个项目重新部署一次就会生效。数据不会丢——存储还是同一个 Blob 命名空间（zjtt），新函数读的是同一份。'),
    diag([
      ['探测到的后端', h0.base],
      ['接口版本', 'v' + h0.v],
      ['存储', (h0.store || '未知') + (h0.storeOk ? '' : '（不可写）')],
    ]),
    h('div', { class: 'acts', style: 'margin-top:14px' },
      h('a', { class: 'btn ghost', href: 'https://console.cloud.tencent.com/edgeone/pages', target: '_blank', rel: 'noopener' }, '打开 EdgeOne 控制台'),
      retryBtn()));
}

async function load(mode) {
  try {
    const data = await req('/admin/overview');
    USERS = data.users || [];
    render(data, BACKEND);
    void mode;
    reindexIfNeeded(data);
  } catch (e) {
    if (e.status === 401) { needsLogin(); return; }
    if (e.status === 403) { denied(e.detail); return; }
    if (e.code === 'not_found' || e.status === 404) { oldBackend(BACKEND); return; }
    if (e.code === 'timeout') {
      gate('读取超时',
        h('p', {}, `等了 ${Math.round((e.ms || 20000) / 1000)} 秒还没返回。这一屏要把全部用户和云端档案扫一遍，用户多了会慢；也可能是边缘函数那边卡住了。`),
        diag([
          ['后端地址', sitestats.base()],
          ['接口版本', 'v' + (BACKEND.v || 0)],
          ['状态', '请求已中止'],
        ]),
        h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
      return;
    }
    if (e.status === 0) { noBackend(BACKEND); return; }
    gate('载入失败',
      h('p', {}, `接口没返回数据：${e.message || '未知错误'}。`),
      diag([['后端地址', sitestats.base()], ['状态码', e.status || ''], ['错误码', e.code || ''], ['详情', typeof e.detail === 'string' ? e.detail : (e.detail ? JSON.stringify(e.detail).slice(0, 200) : '')]]),
      h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
  }
}

// 先问后端版本，再决定是「没部署」「没权限」还是真的坏了。
// 这三种在前端看起来都是「进不去」，但要做的事完全不同。
async function boot() {
  loading('正在检查后端…', '先确认站点函数是哪一版，再决定给不给看。最多等 20 秒。');
  let h0;
  try {
    h0 = await sitestats.health(true);
  } catch (e) {
    // 之前这里没有 catch：探测一抛异常，页面就永远停在「正在检查后端…」，
    // 站长看到的只有一句「载入中」，连错在哪都不知道。
    gate('检查后端出错',
      h('p', {}, `探测接口时抛了异常：${(e && e.message) || e}。`),
      diag([['当前页面', location.host], ['候选后端', sitestats.EDGE_API]]),
      h('div', { class: 'acts', style: 'margin-top:14px' }, retryBtn()));
    return;
  }
  BACKEND = h0 || { base: '', v: 0, store: '', storeOk: true };
  if (!h0 || !h0.base) { noBackend(BACKEND); return; }
  if (h0.v < 3) { oldBackend(h0); return; }
  loading('正在读取用户列表…', `后端 ${h0.base} · 接口 v${h0.v}，这一屏要扫一遍用户表，最多等 20 秒。`);
  await load('boot');
}

if (!auth.logged) {
  needsLogin();
} else {
  boot();
}
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

