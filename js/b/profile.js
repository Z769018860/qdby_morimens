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

// ---- js/savedata.js
const m_savedata = await (async () => {

// 加密存档：本机 localStorage → AES-GCM 包 → .zjtt 文件，反方向也能走。
//
// 这套逻辑原本只写在 src/pages/offline.html 的内联脚本里，结果是：
// 从离线版/桌面版导出来的文件，换设备后必须回到「离线版」那一页才找得到导入按钮，
// 而用户真正想做的事是「登录后把离线数据并进账号」，那一步在个人中心。所以抽成模块。
//
// 格式必须与 offline.html 那份完全一致，谁改了都要两边一起改：
//   app='zjtt-save', v=1, kdf=PBKDF2-SHA256/200000, 正文 AES-GCM 256
//
// 注意：crypto.subtle 只在安全上下文（https / localhost / 127.0.0.1）里有值，
// 用局域网 IP 走 http 打开时它是 undefined，这时要明确告诉用户，而不是抛 TypeError。

const SAVE_APP = 'zjtt-save';
const MIN_PASS = 6;

// zjtt: 是本站主命名空间；morimens- 是挂机版（idle）和弥萨格大逃杀（deathreport）的存档，
// 它们历史原因没加 zjtt: 前缀，早期导出漏了这两个，换设备就丢进度。
const PREFIXES = ['zjtt:', 'morimens-'];

const secure = () => !!(globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.getRandomValues);

const UNSAFE_MSG = '当前地址不是安全上下文（要用 https，或 localhost / 127.0.0.1 打开），浏览器不给用加密接口。';

const isMine = (k) => !!k && PREFIXES.some((p) => k.startsWith(p));

function b64(buf) {
  const b = new Uint8Array(buf);
  let s = '';
  // 一次拼一大段，避免逐字节 += 在几 MB 的存档上卡死
  const CH = 0x8000;
  for (let i = 0; i < b.length; i += CH) s += String.fromCharCode.apply(null, b.subarray(i, i + CH));
  return btoa(s);
}

function unb64(str) {
  const s = atob(str);
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  return b;
}

function derive(pass, salt) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
    .then((km) => crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
    ));
}

// 本机所有属于本站的键（原样取出，不解码）
function collect() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!isMine(k)) continue;
      out[k] = localStorage.getItem(k);
    }
  } catch { /* 隐私模式读不了就返回空 */ }
  return out;
}

const count = () => Object.keys(collect()).length;

function fileName(now = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `忘忘存档-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.zjtt`;
}

// 导出：返回 { blob, name, count }，下载交给调用方（要用户手势触发 a.click）
async function exportPack(pass) {
  if (!secure()) throw new Error(UNSAFE_MSG);
  if (String(pass || '').length < MIN_PASS) throw new Error(`密码至少 ${MIN_PASS} 位。`);
  const data = collect();
  const keys = Object.keys(data);
  if (!keys.length) throw new Error('本机还没有可导出的存档。');

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify({
    app: SAVE_APP, v: 1, at: Date.now(), url: location.origin, data,
  }));
  const key = await derive(pass, salt);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  const pack = {
    app: SAVE_APP,
    v: 1,
    at: Date.now(),
    kdf: { alg: 'PBKDF2-SHA256', iter: 200000, salt: b64(salt) },
    iv: b64(iv),
    ct: b64(ct),
  };
  return {
    blob: new Blob([JSON.stringify(pack)], { type: 'application/octet-stream' }),
    name: fileName(),
    count: keys.length,
    keys,
  };
}

// 解密但先不落盘：让调用方先看清「会覆盖什么」再决定
async function readPack(file, pass) {
  if (!secure()) throw new Error(UNSAFE_MSG);
  if (String(pass || '').length < MIN_PASS) throw new Error(`先填导出时用的密码（至少 ${MIN_PASS} 位）。`);
  let pack;
  try {
    pack = JSON.parse(await file.text());
  } catch {
    throw new Error('这不是有效的存档文件（读不出 JSON）。');
  }
  if (!pack || pack.app !== SAVE_APP || !pack.kdf || !pack.ct) throw new Error('不是本站导出的存档文件。');
  const key = await derive(pass, unb64(pack.kdf.salt));
  let buf;
  try {
    buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(pack.iv) }, key, unb64(pack.ct));
  } catch {
    throw new Error('密码不对，或者文件被改过。');
  }
  const doc = JSON.parse(new TextDecoder().decode(buf));
  const data = doc && doc.data && typeof doc.data === 'object' ? doc.data : {};
  const keys = Object.keys(data).filter(isMine);
  return { at: Number(doc.at) || 0, data, keys };
}

// 落盘：只写属于本站的键，别的（比如别人的站点数据）不碰
function write(doc) {
  const data = (doc && doc.data) || {};
  let n = 0;
  for (const k of Object.keys(data)) {
    if (!isMine(k)) continue;
    try { localStorage.setItem(k, data[k]); n++; } catch { /* 配额满了就停 */ }
  }
  return n;
}

// 一步到位：读文件 + 解密 + 落盘
async function importPack(file, pass) {
  const doc = await readPack(file, pass);
  const n = write(doc);
  if (!n) throw new Error('文件里没有本站的存档项。');
  return { count: n, at: doc.at, keys: doc.keys };
}
return { SAVE_APP, MIN_PASS, PREFIXES, secure, UNSAFE_MSG, collect, count, fileName, exportPack, readPack, write, importPack };
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

// ---- js/profile.js
const m_profile = await (async () => {
const { $, h, store, wallet, toast, markDirty, scNum, emptyState } = m_common;
const { auth, openLogin, avatarLib, nameOfMail } = m_auth;
const { account, CAP } = m_account;
const { GAMES, readAll, credits } = m_gamestats;
const sitestats = m_sitestats;
const savedata = m_savedata;
const gc = m_gamecloud;
// 忘忘同人小游戏 · 个人中心
//
// 和原来的「战报侦探 个人中心」最大的区别：这个页面属于整个同人合集，
// 不是某一个游戏。所以：
//   · 顶栏自己写（不调 common.js 的 nav()，那份品牌是战报侦探、导航也是推理线）；
//   · 主体是一张「九个游戏进度总览」，数据全部来自 js/gamestats.js；
//   · 左上角显示站点计数（注册用户 / 今日浏览 / 总浏览），数据来自后端 /stats。
//
// 账号那部分（登录、昵称、头像、云端同步）沿用 auth.js / account.js，不重写。








const app = $('#app');
const head = $('#pfhRight');
const stamp = (ms) => {
  const d = new Date(Number(ms) || 0);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const meter = (label, value, sub) => h('div', { class: 'statbox' },
  h('small', {}, label), h('b', {}, value), sub ? h('small', { class: 'dim' }, sub) : null);

// ------------------------------------------------------------------ 站点计数
// 先给缓存里的旧数（立即有内容），再拿新的。后端不可用就整块隐藏，不显示「0」骗人。
async function paintSiteStat() {
  const box = $('#sitestat');
  if (!box) return;
  const put = (s) => {
    if (!s || (!s.total && !s.users)) return;
    box.classList.remove('off');
    $('#st-users').textContent = sitestats.fmt(s.users);
    $('#st-today').textContent = sitestats.fmt(s.today);
    $('#st-total').textContent = sitestats.fmt(s.total);
    box.title = `注册用户 ${s.users} · 今日浏览 ${s.today} · 总浏览 ${s.total}`;
  };
  put(sitestats.cached());
  sitestats.ping();
  const fresh = await sitestats.stats(true);
  put(fresh);
}

// ------------------------------------------------------------------ 游戏总览
function gamesBox() {
  const all = readAll();
  const cards = GAMES.map((g) => {
    const d = all[g.k] || { items: [], extra: '' };
    return h('a', { class: 'gcard', href: g.href },
      h('div', { class: 'gh' },
        h('span', { class: 'ic' }, g.icon),
        h('span', { class: 'nm' }, g.n)),
      h('div', { class: 'items' }, d.items.map((it) => h('div', {},
        h('b', {}, it.v), h('small', {}, it.k)))),
      // 挂机那一格用带图标的一句（券 / 银芯），其余仍是纯文本
      d.extraHtml
        ? h('div', { class: 'extra', html: d.extraHtml })
        : h('div', { class: 'extra' }, d.extra || g.tip),
      h('div', { class: 'go' }, '进入 →'));
  });
  return h('section', { class: 'card' },
    h('h2', {}, '我的游戏数据'),
    h('p', { class: 'sub' }, '九个同人小游戏的进度都存在这台设备上，登录后可以把账号数据同步到云端。'),
    h('div', { class: 'games' }, cards));
}

// ------------------------------------------------------------------ 账号概览
function guestCard() {
  return h('section', { class: 'card' },
    h('h2', {}, '还没有登录'),
    h('p', { class: 'sub' }, '不登录也能玩全部游戏，进度只存在这台设备上。登录后可以换设备继续，也能收到管理员发放的银芯。'),
    h('div', { class: 'pfstats' },
      meter('银芯', [scNum(wallet.get(), 17)]),
      meter('已解锁 CG', String((store.get('cg', []) || []).length)),
      meter('推理记录', String((store.get('hist', []) || []).length)),
      meter('失败题库', String((store.get('failed', []) || []).length))),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'),
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页挑个游戏')));
}

function heroCard(u) {
  const st = store.get('stats', {}) || {};
  const played = Number(st.played) || 0;
  const won = Number(st.won) || 0;
  const sync = account.lastSync();
  return h('section', { class: 'card' },
    h('div', { class: 'hero' },
      h('img', { class: 'pfavatar', src: auth.avatarOf(u), alt: '', width: 76, height: 76 }),
      h('div', { class: 'meta' },
        h('h2', {}, u.name || '（未命名）'),
        h('p', {}, `@${nameOfMail(u.mail)} · 加入于 ${day(u.created)}`),
        h('p', { class: 'dim' }, sync ? `上次同步 ${stamp(sync)}` : '还没同步过云端档案'))),
    h('div', { class: 'pfstats' },
      meter('银芯', [scNum(wallet.get(), 17)]),
      meter('推理局数', String(played), played ? `胜率 ${pct(won, played)}%` : ''),
      meter('已解锁 CG', String((store.get('cg', []) || []).length)),
      meter('失败题库', String((store.get('failed', []) || []).length))));
}

// ------------------------------------------------------------------ 资料与头像
const isLocalAvatar = (s) => /^assets\//.test(String(s || ''));

function editCard(u) {
  let picked = u.avatar || '';
  const nameEl = h('input', { type: 'text', value: u.name || '', maxlength: 20, placeholder: '昵称' });
  const urlEl = h('input', { type: 'text', value: u.avatar && !isLocalAvatar(u.avatar) ? u.avatar : '', placeholder: 'https://…（也可以贴一张外链头像）' });
  const preview = h('img', { class: 'pfavatar small', src: auth.avatarOf(u), alt: '' });
  const grid = h('div', { class: 'avgv' });
  const tabs = h('div', { class: 'avtabs' });
  const count = h('small', { class: 'dim' });
  let all = [];
  let cur = 'all';

  const setPick = (src) => {
    picked = src;
    preview.src = src || auth.avatarOf(u);
    grid.querySelectorAll('.avg').forEach((b) => b.classList.toggle('on', b.dataset.src === picked));
    if (src && isLocalAvatar(src)) urlEl.value = '';
  };

  const drawGrid = () => {
    const list = cur === 'all' ? all : all.filter((a) => a.g === cur);
    grid.replaceChildren(...list.map((a) => h('button', {
      type: 'button', class: `avg${a.src === picked ? ' on' : ''}`, 'data-src': a.src, title: a.n,
      onclick: () => setPick(a.src),
    }, h('img', { src: a.src, alt: a.n, loading: 'lazy' }))));
    count.textContent = `共 ${list.length} 个`;
    tabs.querySelectorAll('.avtab').forEach((b) => b.classList.toggle('on', b.dataset.g === cur));
  };

  // 头像库有几百张，收进 details 里：不展开就完全不请求图片
  const picker = h('details', { class: 'avpick' },
    h('summary', {}, h('b', {}, '换头像'), ' ', count),
    tabs, grid);
  avatarLib().then((lib) => {
    all = lib.items || [];
    const mk = (g, label) => h('button', {
      type: 'button', class: `avtab${g === cur ? ' on' : ''}`, 'data-g': g,
      onclick: () => { cur = g; drawGrid(); },
    }, label);
    tabs.replaceChildren(mk('all', `全部 ${all.length}`), ...(lib.groups || []).map((gp) => mk(gp.k, gp.n)));
    drawGrid();
    if (!picked && all[0]) setPick(all[0].src);
  });

  urlEl.addEventListener('input', () => { const v = urlEl.value.trim(); if (v) setPick(v); });

  const saveBtn = h('button', { class: 'btn', onclick: save }, '保存资料');
  async function save() {
    saveBtn.disabled = true;
    try {
      const avatar = (urlEl.value.trim() || picked || '').slice(0, 250);
      await auth.update({ name: nameEl.value.trim() || u.name, avatar });
      toast('已保存');
      render();
    } catch (e) {
      const why = {
        tooShort: '昵称至少 2 个字', tooLong: '昵称最多 20 个字',
        badChar: '昵称只能用中文、字母、数字和 _ - ·（不要空格和标点）',
        nameTaken: '这个昵称已经被占用了',
      };
      toast(`保存失败：${why[e.message] || e.message}`);
    } finally {
      saveBtn.disabled = false;
    }
  }

  return h('section', { class: 'card' },
    h('h2', {}, '账号资料'),
    h('p', { class: 'sub' }, '昵称和头像会显示在「我的推理记录」、工坊题目作者等地方。'),
    h('div', { class: 'pfeditrow' },
      preview,
      h('div', { style: 'flex:1 1 240px;min-width:0' },
        h('label', { class: 'fld' }, h('small', {}, '昵称（2–20 个字，只能用中文/字母/数字/_ - ·）'), nameEl),
        h('label', { class: 'fld' }, h('small', {}, '外链头像'), urlEl),
        picker)),
    h('div', { class: 'actions' },
      saveBtn,
      h('a', { class: 'btn ghost', href: 'index.html' }, '回首页'),
      h('button', {
        class: 'btn ghost danger',
        onclick: () => { auth.logout(); account.forget(); toast('已退出登录'); setTimeout(() => location.reload(), 400); },
      }, '退出登录')));
}

// ------------------------------------------------------------------ 存档与同步
// 离线版 / 桌面版导出的 .zjtt 就从这个面板导进来——放在个人中心而不是只留在
// offline.html，是因为「导入之后并进账号」发生在这里：导完直接 push 一次，
// 换机器的人不用再自己找「同步」按钮。
// 展开状态和密码存在模块里：account.ready() 回来后 render() 会整页重绘，
// 不记着的话用户正输密码时面板会突然收起、输入内容也没了。
const SAVE_UI = { open: false, pass: '' };

function saveBox(u) {
  const msg = h('p', { class: 'savemsg' });
  const say = (t, cls) => { msg.textContent = t || ''; msg.className = 'savemsg' + (cls ? ' ' + cls : ''); };
  const fail = (e) => say(String((e && e.message) || e || '出错了'), 'bad');

  const pass = h('input', {
    type: 'password',
    autocomplete: 'new-password',
    placeholder: '至少 6 位；导出和导入要用同一个',
    value: SAVE_UI.pass,
  });
  pass.addEventListener('input', () => { SAVE_UI.pass = pass.value; });

  const expBtn = h('button', {
    class: 'btn sm ghost',
    onclick: async () => {
      const n = savedata.count();
      if (!n) { say('本机还没有可导出的存档。', 'bad'); return; }
      expBtn.disabled = true;
      say('正在加密…');
      try {
        const r = await savedata.exportPack(pass.value);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(r.blob);
        a.download = r.name;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        say(`已导出 ${r.count} 项（加密）。换设备时用同一个密码导入。`, 'ok');
      } catch (e) { fail(e); }
      expBtn.disabled = false;
    },
  }, '导出本机存档');

  const file = h('input', { type: 'file', accept: '.zjtt,.json', hidden: true });

  async function doImport(f) {
    say('正在解密…');
    try {
      const doc = await savedata.readPack(f, pass.value);
      const n = doc.keys.length;
      if (!n) throw new Error('文件里没有本站的存档项。');
      // 覆盖是有意的：导入语义就是「用这份文件恢复成导出那台机器的样子」。
      // 所以文件不是二次确认，谁都可能点错文件，写坏本机进度没法撤销。
      if (!confirm(`文件里有 ${n} 项存档。\n\n会写进这台设备并覆盖同名的本机进度（账号、银芯、各游戏纪录）。云端档案不会因此被删。继续？`)) {
        say('已取消。');
        return;
      }
      const cnt = savedata.write(doc);
      if (u) {
        say('已导入，正在并进云端档案…');
        // 用 sync() 而不是 push()：sync 会先拉云端再 mergeDoc（各数值取大），
        // 免得把「另一台设备上打出来的更高纪录」用这份文件压回去。
        const r = await account.sync().catch(() => ({ ok: false }));
        toast(r && r.ok ? `已导入 ${cnt} 项并同步到云端` : `已导入 ${cnt} 项，云端同步失败（稍后可点「立即同步」）`);
      } else {
        toast(`已导入 ${cnt} 项；登录后会随档案一起上传`);
      }
      setTimeout(() => location.reload(), 1000);
    } catch (e) {
      fail(e);
    }
  }

  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    file.value = '';
    if (f) doImport(f);
  });

  const impBtn = h('button', {
    class: 'btn sm',
    onclick: () => {
      if (!pass.value) { pass.focus(); say('先在下面填密码——就是导出那台机器上设的那个。', 'bad'); return; }
      file.click();
    },
  }, '导入离线存档');

  const panel = h('div', { class: 'savebox' },
    h('p', { class: 'savetip' }, '从离线版 / 桌面版的「存档」区导出的 .zjtt 文件，拷到这台设备后从这里导入。加密包里有账号、银芯、各小游戏进度，也包括挂机前夜和弥萨格大逃杀（那两款不在主命名空间，别处导不到）。'),
    h('div', { class: 'saverow' }, pass, file),
    h('div', { class: 'actions' }, impBtn, expBtn),
    msg,
  );

  const moreBtn = h('button', {
    class: 'btn sm ghost',
    onclick: () => {
      SAVE_UI.open = panel.hidden;            // 现在是关着的 → 这次要打开
      panel.hidden = !SAVE_UI.open;
      moreBtn.textContent = SAVE_UI.open ? '收起' : '导入 / 导出离线存档';
      if (SAVE_UI.open) pass.focus();
    },
  }, SAVE_UI.open ? '收起' : '导入 / 导出离线存档');
  panel.hidden = !SAVE_UI.open;

  const syncBtn = h('button', {
    class: 'btn sm',
    onclick: async () => {
      syncBtn.disabled = true;
      const old = syncBtn.textContent;
      syncBtn.textContent = '同步中…';
      const r = await account.push();
      syncBtn.textContent = r.ok ? '已同步 ✓' : '同步失败';
      setTimeout(() => { syncBtn.textContent = old; syncBtn.disabled = false; render(); }, 1400);
    },
  }, '立即同步到云端');

  const clearBtn = h('button', {
    class: 'btn ghost danger',
    onclick: async () => {
      if (!confirm('会清掉这台设备上的所有小游戏进度和银芯（云端档案不动），确定？')) return;
      const keys = [
        'credits', 'cg', 'failed', 'stats', 'myPuzzles', 'profile', 'hist', 'gr',
        'merge:best', 'merge:played', 'merge:skins', 'merge:best:easy', 'merge:best:normal', 'merge:best:hard', 'merge:best:frenzy',
        'bird:best', 'bird:bestLv', 'bird:diff',
        'survivors:best', 'survivors:progress', 'binding', 'pf:best', 'wolf:stat',
      ];
      keys.forEach((k) => store.del(k));
      ['easy', 'normal', 'hard', 'mad'].forEach((d) => { store.del(`bird:best:${d}`); store.del(`bird:bestLv:${d}`); });
      // 挂机版与弥萨格大逃杀不在 zjtt 命名空间，单独清
      ['morimens-idle-save-v1', 'morimens-deathreport-save-v1', 'morimens-deathreport-save-ed62-v1', 'morimens-deathreport-save-ed61-v1']
        .forEach((k) => { try { localStorage.removeItem(k); } catch { /* 忽略 */ } });
      if (u) await account.push().catch(() => {});
      toast('本机进度已清空');
      setTimeout(() => location.reload(), 600);
    },
  }, '清空本机进度');

  return h('section', { class: 'card', id: 'save' },
    h('h2', {}, '存档与同步'),
    h('p', { class: 'sub' }, u
      ? `云端档案最多保留 ${CAP.hist} 条推理记录；小游戏的最高分只增不减，手机上打的纪录不会覆盖电脑上的。换设备时用下面的加密存档整包搬。`
      : '现在是游客状态，进度只在这台设备上。登录后才会同步到云端；先登录再导入，导完会直接上传。'),
    h('div', { class: 'actions' }, u ? syncBtn : null, moreBtn, clearBtn),
    panel);
}


// ------------------------------------------------------------------ 游戏云存档（整份进度，各游戏自己同步）
const GC_TEXT = { ok: '已同步', error: '同步失败', conflict: '有冲突，进游戏时选用哪份', nologin: '未登录', syncing: '同步中…', idle: '还没同步过' };
function cloudSaveCard(u) {
  if (!u) return null;
  const rows = Object.entries(gc.GAMES).map(([g, cfg]) => {
    const rec = gc.record(g), st = gc.statusOf(g);
    const t = rec && rec.at ? new Date(rec.at).toLocaleString() : '';
    return h('div', { class: 'gcrow' }, h('b', {}, cfg.zh),
      h('span', { class: 'dim' }, `${GC_TEXT[st.s] || ''}${t && st.s !== 'syncing' ? ' · 上次对齐 ' + t : ''}`));
  });
  rows.unshift(h('div', { class: 'gcrow' }, h('b', {}, '挂机前夜'), h('span', { class: 'dim' }, '在游戏的「更多 → 设置」里同步（自己的云存档）')));
  const btn = h('button', { class: 'btn', onclick: async (e) => {
    e.currentTarget.disabled = true;
    for (const g of Object.keys(gc.GAMES)) await gc.syncGame(g, { interactive: false, reload: false, pullOk: true });
    toast('已和云端对齐（有冲突的游戏进游戏时会让你选）');
    render();
  } }, '立即同步全部游戏存档');
  return h('section', { class: 'card', id: 'gcloud' },
    h('h2', {}, '游戏云存档'),
    h('p', { class: 'sub' }, '各小游戏的真实存档（关卡进度、解锁、战绩）会随账号同步：电脑上玩的，手机登录同一个账号再打开就是同一份。进游戏时自动拉取，玩的时候自动上传；两边都有进度会让你选，不会悄悄覆盖。'),
    h('div', { class: 'gclist' }, ...rows),
    h('div', { class: 'actions' }, btn));
}

// ------------------------------------------------------------------ 管理员入口（只有姜酒能看到）
function adminCard() {
  return h('section', { class: 'card adminlink' },
    h('h2', {}, '管理员'),
    h('p', { class: 'sub' }, '查看全部注册用户与数据情况、给指定账号发放银芯。'),
    h('div', { class: 'actions' }, h('a', { class: 'btn', href: 'admin.html' }, '打开管理后台 →')));
}

// ------------------------------------------------------------------ 渲染
let IS_ADMIN = false;

function paintHead(u) {
  if (!head) return;
  const kids = [h('a', { class: 'ghost', href: 'index.html' }, '回首页')];
  if (u) {
    kids.push(h('a', { class: 'uchip', href: 'profile.html', title: '个人中心' },
      h('img', { src: auth.avatarOf(u), alt: '', loading: 'lazy' }), h('span', {}, u.name || '我')));
  } else {
    kids.push(h('button', { class: 'btn sm', onclick: () => openLogin(() => location.reload()) }, '登录 / 注册'));
  }
  head.replaceChildren(...kids);
}

function render() {
  const u = auth.user;
  const kids = [
    h('section', { class: 'pagehead' },
      h('h1', {}, '个人中心'),
      h('p', {}, '一个账号管九个同人小游戏：进度、银芯、存档同步都在这里。')),
    u ? heroCard(u) : guestCard(),
    gamesBox(),
    u ? editCard(u) : null,
    cloudSaveCard(u),
    saveBox(u),
    u && IS_ADMIN ? adminCard() : null,
  ].filter(Boolean);
  app.replaceChildren(...kids);
  paintHead(u);
}

// ------------------------------------------------------------------ 启动
// 先把本机数据画出来，再等云端档案合并完刷一次。
// 反过来（等 ready() 再 render）会出现整页转圈 3~4 秒——边缘一次往返 1~2 秒，
// 而本机数据本来就够画完这一页了。
//
// 从离线版/桌面版的「存档」区点「到个人中心导入」过来时带 #save：
// 直接把那个面板展开并滚到位，少点一次。
if (location.hash === '#save') SAVE_UI.open = true;
const jumpSave = () => {
  if (location.hash !== '#save') return;
  // 刚 replaceChildren 完时布局还没稳定，一次 scrollIntoView 会停在半路，
  // 所以硬滚一次、再等两帧补两次。
  const go = () => {
    const el = document.getElementById('save');
    if (el) el.scrollIntoView({ block: 'start' });
  };
  go();
  requestAnimationFrame(() => { go(); requestAnimationFrame(go); });
};
paintSiteStat();               // 不等账号，先把左上角点亮
render();
jumpSave();
account.ready().then((ok) => { if (ok) { render(); jumpSave(); } }).catch(() => {});
sitestats.whoami().then((me) => {
  IS_ADMIN = !!me.admin;
  if (IS_ADMIN) render();
}).catch(() => {});

window.__pfRender = render;
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

