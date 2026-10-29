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

// ---- js/pepper.js
const m_pepper = await (async () => {

// generated by scripts/build_data.py
const PEPPER = '6ad17e01b5f33ee9';
return { PEPPER };
})();

// ---- js/bank.js
const m_bank = await (async () => {

// 题库加载：索引常驻，题目按片取。
//
// 以前首页把 data/puzzles.json（1000 题、1.7MB）整包下完才开始渲染，
// 在慢网络上就表现为「一直载入中」。现在只加载：
//   data/bank/index.json   所有题的 [id, diff, core]，约 76KB
//   data/bank/cNNN.json    抽到哪一题就取哪一片（50 题，约 85KB）
// 首屏数据量从 1.7MB 降到 160KB（gzip 后约 60KB）。
//
// 分片文件名固定、内容随部署变，所以 URL 带上索引里的 stamp：
// stamp 一变就是新 URL，强缓存不会拿到上一次部署的旧题。

const INDEX_URL = 'data/bank/index.json';
const CHUNK_SIZE_DEFAULT = 50;

const state = {
  list: [],            // [{ id, diff, core, c }]  c = 所在片号
  byId: new Map(),
  stamp: '',
  chunkSize: CHUNK_SIZE_DEFAULT,
  nChunks: 0,
  seasons: {},
  chunks: new Map(),   // 片号 → 题目数组
  inflight: new Map(), // 片号 → Promise（并发时复用同一个请求）
  ready: false,
};

const pad3 = (n) => String(n).padStart(3, '0');

// 加载索引。失败要抛出，让上层知道题库不可用，而不是静默变成空题池。
// prefetched：页面里已经先开拉的启动数据 promise（省一个下载轮次）
async function load(prefetched) {
  const j = prefetched
    ? await prefetched
    : await (await fetch(INDEX_URL, { cache: 'no-cache' })).json();
  const raw = Array.isArray(j.items) ? j.items : [];
  state.chunkSize = Number(j.chunkSize) || CHUNK_SIZE_DEFAULT;
  state.stamp = String(j.stamp || '');
  state.seasons = j.seasons || {};
  state.list = raw.map((it, i) => ({
    id: String(it[0]),
    diff: Number(it[1]) || 2,
    core: Number(it[2]) === 1,
    c: Math.floor(i / state.chunkSize),
  }));
  state.byId = new Map(state.list.map((e) => [e.id, e]));
  state.nChunks = Math.ceil(state.list.length / state.chunkSize);
  state.ready = true;
  return bank;
}

function entry(id) { return state.byId.get(String(id)) || null; }

async function chunk(n) {
  if (state.chunks.has(n)) return state.chunks.get(n);
  if (state.inflight.has(n)) return state.inflight.get(n);
  const url = `data/bank/c${pad3(n)}.json?s=${encodeURIComponent(state.stamp)}`;
  const job = fetch(url, { cache: 'force-cache' })
    .then((r) => (r.ok ? r.json() : { puzzles: [] }))
    .then((j) => {
      const list = Array.isArray(j.puzzles) ? j.puzzles : [];
      state.chunks.set(n, list);
      state.inflight.delete(n);
      return list;
    })
    .catch((e) => { state.inflight.delete(n); throw e; });
  state.inflight.set(n, job);
  return job;
}

// 按 id 取题，返回密文题目（和以前 P.find(...) 拿到的一样）；找不到给 null
async function fetchPuzzle(id) {
  const e = entry(id);
  if (!e) return null;
  if (state.chunks.has(e.c)) {
    return state.chunks.get(e.c).find((p) => String(p.id) === e.id) || null;
  }
  const list = await chunk(e.c);
  return list.find((p) => String(p.id) === e.id) || null;
}

// 闲时预热相邻的片，翻下一题更快。
// 一定要延后：边缘只给 HTTP/1.1（单域名 6 条连接），首屏那几张卡图正在抢连接，
// 这时候再去拽 85KB 的分片，只会让图更晚出来。
function warm(id) {
  const e = entry(id);
  if (!e || !state.nChunks) return;
  const run = () => {
    const next = (e.c + 1) % state.nChunks;
    if (!state.chunks.has(next)) chunk(next).catch(() => {});
  };
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(run, { timeout: 9000 });
  } else {
    setTimeout(run, 6000);
  }
}

const bank = {
  load, entry, chunk, fetchPuzzle, warm,
  items: () => state.list,
  coreItems: () => state.list.filter((e) => e.core),
  count: () => state.list.length,
  seasons: () => state.seasons,
  isReady: () => state.ready,
};
return { bank };
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
  async refresh() {
    if (!this.logged) return null;
    try {
      const data = await api(`/api/token`, { method: 'POST', auth: false, body: {} });
      return persist(data);
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

// ---- js/account.js
const m_account = await (async () => {
const { store, wallet, failedBank, unlocked, STAT0, toast, t } = m_common;
const { auth, wApi, nameOfMail } = m_auth;
const { api } = m_api;
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

function mergeDoc(remote = {}, local = {}) {
  const st = mergeStats(remote.st, local.st);
  return {
    v: 1,
    at: Math.max(Number(remote.at) || 0, Number(local.at) || 0),
    cr: numMax(remote.cr, local.cr),
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
      return { ver: Number(r.ver) || ver + 1 };
    } catch (e) {
      if (!(e && e.status === 409 && e.data && e.data.doc)) throw e;
      const merged = mergeDoc(e.data.doc, doc);
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
    } else {
      await pushLegacy(doc);
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

async function claimGrants() {
  if (!auth.logged) return 0;
  const list = await grants();
  // 按「登录名」匹配，不按昵称：昵称谁都能改，也可能和别人重名，
  // 用它当钥匙会漏领（改名后领不到）或者误领（同名的人各领一份）。
  const u = auth.user || {};
  const me = String(nameOfMail(u.mail || '') || u.name || '').trim().toLowerCase();
  if (!me) return 0;
  const mine = list.filter((g) => g && g.id && String(g.user || '').trim().toLowerCase() === me);
  if (!mine.length) return 0;
  const claimed = new Set(uniq(store.get('gr', [])));
  let gain = 0;
  for (const g of mine) {
    if (claimed.has(String(g.id))) continue;
    claimed.add(String(g.id));
    const n = Math.max(0, Math.round(Number(g.amount) || 0));
    gain += n;
  }
  if (!gain) return 0;
  store.set('gr', [...claimed]);
  wallet.add(gain);                       // 会触发 dirty，但 sync 里紧接着会 push
  try { toast(t('pfGrant', { n: gain })); } catch { /* 页面还没挂 body 时忽略 */ }
  return gain;
}

async function sync() {
  if (!auth.logged) return { ok: false, why: 'guest' };
  const remote = await pull().catch(() => null);
  const local = snapshot();
  const merged = remote ? mergeDoc(remote, local) : local;
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

// ---- js/checkin.js
const m_checkin = await (async () => {
const { store, wallet, markDirty, h, t, scIcon, toast } = m_common;
// 每日签到：每天可签一次，+10 银芯，连续签到记录天数。
// 状态存 zjtt:checkin，跟着账号档案同步（换设备当天也不能再签）。


const KEY = 'checkin';
const REWARD = 10;

const pad = (n) => String(n).padStart(2, '0');
function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const prevKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

function state() {
  const s = store.get(KEY, null);
  return s && typeof s === 'object' ? { last: '', streak: 0, total: 0, ...s } : { last: '', streak: 0, total: 0 };
}
const done = () => state().last === dayKey();

// 领取今天的签到。返回 { ok, gain, streak }；已签过时 ok=false。
function claim() {
  if (done()) return { ok: false, gain: 0, streak: state().streak };
  const s = state();
  const streak = s.last === prevKey() ? (s.streak || 0) + 1 : 1;
  store.set(KEY, { last: dayKey(), streak, total: (s.total || 0) + 1 });
  // 注意顺序：先记签到，再加银芯，这样中途失败也不会重复发放
  wallet.add(REWARD);
  markDirty('checkin');
  return { ok: true, gain: REWARD, streak };
}

// 面板里的签到条：已签到时是静态状态，未签到时是可点的按钮
function checkinBar(cls = '', onDone) {
  const s = state();
  const ok = done();
  const btn = h('button', {
    class: `btn ck-btn${ok ? ' ghost' : ''}`, type: 'button', disabled: ok,
    onclick: () => {
      const r = claim();
      if (!r.ok) return;
      toast(t('ckGain', { n: r.gain }));
      const host = btn.closest('.ck');
      if (host) host.replaceWith(checkinBar(cls, onDone));
      if (onDone) onDone(r);
    },
  }, ok ? t('ckDone') : [t('ckBtn'), ' ', scIcon(13), ` ${REWARD}`]);

  return h('div', { class: `ck ${cls}`.trim() },
    h('div', { class: 'cktext' },
      h('b', {}, t('ckTitle')),
      h('small', { class: 'note' }, ok
        ? `${t('ckStreak', { n: s.streak })} · ${t('ckTomorrow')}`
        : t('ckNote'))),
    btn);
}
return { REWARD, dayKey, state, done, claim, checkinBar };
})();

// ---- js/game.js
const m_game = await (async () => {
const { $, h, store, loadDict, imgEl, wan, nav, KINDS, kindName, KW, KW_TYPE, renderText, t, nameOf, lang, wallet, failedBank, unlocked, REPLAY, shareCode, markDirty, statsOf, scIcon, scNum, emptyState, sha256 } = m_common;
const { PEPPER } = m_pepper;
const { bank } = m_bank;
const { auth, openLogin } = m_auth;
const { account } = m_account;
const likes = m_likes;
const { checkinBar } = m_checkin;
const KW_TYPE_EN = { realm: 'Realm', mechanic: 'State / Mechanic', tag: 'Tag', help: 'Help' };

const MAX_TRIES = 6;
const HINT_COST = 6;       // 卡位提示与队伍级线索的基础价
const POINT_BASE = 8;      // 答对的基础积分
// 难度越高，信息越值钱：同一份提示在更高档位按倍数加价（入门不打折）
const LV_COST_MUL = { 1: 1, 2: 1.25, 3: 1.6, 4: 2 };
const priceOf = (base) => Math.max(1, Math.round(base * (LV_COST_MUL[level] || 1)));
const LEVELS = {
  1: { name: () => t('lv1'), desc: () => t('lv1d') },
  2: { name: () => t('lv2'), desc: () => t('lv2d') },
  3: { name: () => t('lv3'), desc: () => t('lv3d') },
  4: { name: () => t('lv4'), desc: () => t('lv4d') },
};
const LETTERS = ['A', 'B', 'C', 'D'];
const EMO = { g: '🟩', y: '🟨', n: '⬛', '': '⬜' };

// ------------------------------------------------------------------ user profile
// 本机档案：只保留「偏好唤醒体」。昵称/头像属于账号，放个人中心。
let profile = store.get('profile', { favs: [] });
if (!Array.isArray(profile.favs)) profile.favs = [];
delete profile.name;
function saveProfile() { store.set('profile', profile); markDirty('profile'); }

document.body.prepend(nav('game'));
const root = $('#app');
// detective.html 里已经放了静态占位（转圈 + 「正在载入数据…」），到这一步说明
// 模块已经跑起来了，占位继续留着，别把它抹成一行干字——首屏观感差别很大。
if (!document.getElementById('boot')) root.textContent = t('loading');

// 启动数据：boot.json（索引 / 标签 / 关键词）先到，拿到它就能开始取题库分片；
// dict.json（图鉴字典）大得多，和分片并行下载，谁也不等谁。
// window.__boot 是 HTML 里先开拉的同一批请求，直接复用，不会重复下载。
const bootData = ((typeof window !== 'undefined' && window.__boot) || {}).data
  || fetch('data/boot.json').then(r => r.json());
let dictRes;
let RELIC_TAGS = {};
let firstPuzzle = null;
try {
  const bd = await bootData;
  RELIC_TAGS = bd.tags || {};
  await bank.load(bd.bank);
  // 索引到手就先把「今天这道题」的分片请求发出去，别等 520KB 的字典
  firstPuzzle = dailyPuzzle();
  firstPuzzle.catch(() => {});
  dictRes = await loadDict();
} catch (e) {
  // 慢网/断网时别停在「载入中」不动，给个能重试的界面
  console.error('初始化失败', e);
  root.replaceChildren(h('div', { class: 'card' },
    h('p', {}, t('loadFail')),
    h('button', { class: 'btn', onclick: () => location.reload() }, t('retry'))));
  throw e;
}
const { D, idx } = dictRes;

// 自建题目（创意工坊）以 team 明文存在本地，与官方题库一起参与随机
const customPuzzles = () => store.get('myPuzzles', []);

// 失败题库里的题不再出现；难度档对应不同的题目难度带（入门只出简单题，大师只出难题）
const LV_RANGE = { 1: [1, 2], 2: [1, 3], 3: [2, 4], 4: [3, 4] };
// 题池里放的是索引条目 { id, diff, core, c }，不是题目本身——
// 题目要在真正抽中之后才去取它所在的那一片。
function basePool() {
  const all = bank.items();
  const ok = all.filter(p => !failedBank.has(p.id));
  const src = ok.length > 8 ? ok : all;
  const [lo, hi] = LV_RANGE[level] || [1, 4];
  const band = src.filter(p => p.diff >= lo && p.diff <= hi);
  return (band.length >= 12 ? band : src).concat(customPuzzles());
}
// 每天一题只在核心题库里挑（核心 = 原来的 puzzles.json，顺序和以前一致，
// 所以同一天抽到的题跟改造前是同一道）
function corePool() {
  const core = bank.coreItems();
  const ok = core.filter(p => !failedBank.has(p.id));
  return ok.length ? ok : core;
}

// 随机抽题：从当前难度带（含自建题）里挑，再取那一片
const pickAny = async () => {
  const l = basePool();
  if (!l.length) throw new Error('题池为空');
  const e = l[Math.floor(Math.random() * l.length)];
  if (e && e.team) return e;                 // 自建题：本地就是明文
  const p = await bank.fetchPuzzle(e.id);
  if (!p) throw new Error('题目加载失败');
  bank.warm(e.id);
  return p;
};

// 题目的积分价值：难度分越高给得越多
const ptsOf = (p) => Math.round(POINT_BASE + (p.diffScore || 20) * 1.2);

// ------------------------------------------------------------------ state
let puzzle, ans, level, mode, sel, fb, history, hintsUsed, finished, won, pickerKind;
// 交换模式：点了某个已选卡位后记下它的序号，再点另一个卡位就互换内容（null = 没在交换）
let swapFrom = null;
level = store.get('level', 1);
mode = 'daily';

// 这几个是函数声明（不是 const 箭头函数）：启动时要在字典下完之前就把分片请求发出去，
// 那时候 const 还处在 TDZ 里，调用会直接抛 ReferenceError。
function todayKey() {
  const d = new Date(Date.now() + 8 * 3600e3); // UTC+8, same as the leaderboard
  return d.toISOString().slice(0, 10);
}
function dayNumber() { return Math.floor((Date.now() + 8 * 3600e3) / 864e5); }
async function dailyPuzzle() {
  const list = corePool();
  if (!list.length) throw new Error('题库为空');
  const from = (dayNumber() * 7919) % list.length;
  // 每日题若已进失败题库，顺延到下一题
  for (let i = 0; i < list.length; i++) {
    const e = list[(from + i) % list.length];
    if (failedBank.has(e.id)) continue;
    const p = await bank.fetchPuzzle(e.id);
    if (p) { bank.warm(e.id); return p; }
  }
  return bank.fetchPuzzle(list[from].id);
}

function newSel() {
  return {
    slots: LETTERS.map(() => ({ awk: null, wheels: [null, null], cov: null, pot: null })),
    key: null, relics: [],
  };
}

// answers ship obfuscated (see scripts/build_data.py); this keeps them out of plain sight, nothing more
// 密钥流用 common.js 的 sha256：crypto.subtle 不可用（http / 老内置浏览器）时自动走纯 JS，
// 否则手机上会「题目解码失败」、一题都出不来。
async function unseal(p) {
  if (p.team) return p;
  const raw = Uint8Array.from(atob(p.ans), c => c.charCodeAt(0));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 32) {
    const ks = await sha256(`${PEPPER}|${p.id}|${i / 32}`);
    for (let j = 0; j < 32 && i + j < raw.length; j++) out[i + j] = raw[i + j] ^ ks[j];
  }
  const txt = new TextDecoder().decode(out);
  if (!txt.startsWith('ZJ1:')) throw new Error('题目解码失败');
  return { ...p, ...JSON.parse(txt.slice(4)) };
}

async function start(p0, m) {
  // p0 既可以是题目对象，也可以是「还在加载中」的 promise（抽题要先取分片）
  let p;
  try {
    p = await unseal(await p0);
  } catch (e) {
    console.error('题目加载失败', e);
    toast(t('loadFail'));
    return;
  }
  puzzle = p; mode = m;
  ans = p.team; // already sorted by damage desc: slot A = top damage
  sel = newSel(); fb = {}; history = []; hintsUsed = 0; finished = false; won = false; swapFrom = null;
  loadClues();
  if (m === 'daily') {
    const saved = store.get(`daily:${todayKey()}:${level}`, null);
    if (saved) {
      sel = saved.sel; history = saved.history; hintsUsed = saved.hintsUsed;
      finished = saved.finished; won = saved.won; fb = saved.fb || {};
    }
  }
  // 固有造物现在由题面直接给出：老存档里如果填过它，得剔掉，否则会被倒扣分
  if (Array.isArray(sel.relics)) sel.relics = sel.relics.filter(id => !isInnateRelic(id));
  if (p.custom) loadLike(p.id);
  // 开局线索：把这一档白送的那几条直接摊开（已经答完的局就不再弹提示）
  const gift = grantGift();
  render();
  if (gift && !finished) setTimeout(() => toast(t('giftToast', { n: gift })), 350);
}

function persist() {
  if (mode !== 'daily') return;
  store.set(`daily:${todayKey()}:${level}`, { sel, history, hintsUsed, finished, won, fb });
}

// ------------------------------------------------------------------ evaluation
function active() {
  return { wheels: level >= 2, cov: level >= 3, key: level >= 3, pot: level >= 4, relics: level >= 4 };
}

function evaluate() {
  const A = active();
  const teamIds = ans.map(a => a.tid);
  const r = { slots: [], key: null, relics: [], green: 0, total: 0 };
  const count = (state) => { r.total++; if (state === 'g') r.green++; };
  sel.slots.forEach((g, k) => {
    const a = ans[k];
    const s = { awk: null, wheels: [], cov: null, pot: null };
    s.awk = g.awk == null ? 'n' : g.awk === a.tid ? 'g' : teamIds.includes(g.awk) ? 'y' : 'n';
    count(s.awk);
    if (A.wheels) {
      const left = [...a.wheels];
      const others = ans.filter((_, j) => j !== k).flatMap(x => x.wheels);
      g.wheels.forEach((w, i) => {
        // 真实战报里有人只带 1 件命轮：那一格空对空，不应算作失误
        if (i >= a.wheels.length) {
          if (w != null) { s.wheels.push('n'); count('n'); }
          else s.wheels.push('');
          return;
        }
        let st = 'n';
        if (w != null) {
          const j = left.indexOf(w);
          if (j >= 0) { st = 'g'; left.splice(j, 1); } else if (others.includes(w)) st = 'y';
        }
        s.wheels.push(st); count(st);
      });
    }
    if (A.cov) {
      s.cov = g.cov == null ? 'n' : g.cov === a.cov ? 'g' : ans.some((x, j) => j !== k && x.cov === g.cov) ? 'y' : 'n';
      count(s.cov);
    }
    if (A.pot) {
      if (g.pot == null) s.pot = { st: 'n', dir: '' };
      else {
        const d = a.pot - g.pot;
        s.pot = { st: d === 0 ? 'g' : Math.abs(d) <= 2 ? 'y' : 'n', dir: d > 0 ? '↑' : d < 0 ? '↓' : '' };
      }
      count(s.pot.st);
    }
    r.slots.push(s);
  });
  if (A.key) { r.key = sel.key == null ? 'n' : sel.key === puzzle.key ? 'g' : 'n'; count(r.key); }
  if (A.relics) {
    // 固有造物已经白送了，不算字段；只判定玩家需要补的那部分
    const need = fillRelics();
    const want = new Set(need);
    sel.relics.forEach(x => r.relics.push(want.has(x) ? 'g' : 'n'));
    need.forEach(x => { r.total++; if (sel.relics.includes(x)) r.green++; });
    sel.relics.forEach(x => { if (!want.has(x)) r.total++; });
  }
  r.win = r.green === r.total;
  return r;
}

function fillFeedback(r) {
  fb = {};
  r.slots.forEach((s, k) => {
    const g = sel.slots[k];
    fb[`awk${k}`] = { v: g.awk, c: s.awk };
    s.wheels.forEach((st, i) => { fb[`w${k}${i}`] = { v: g.wheels[i], c: st }; });
    if (s.cov) fb[`cov${k}`] = { v: g.cov, c: s.cov };
    if (s.pot) fb[`pot${k}`] = { v: g.pot, c: s.pot.st, dir: s.pot.dir };
  });
  if (r.key) fb.key = { v: sel.key, c: r.key };
  r.relics.forEach((st, i) => { fb[`rel${sel.relics[i]}`] = { v: sel.relics[i], c: st }; });
}

function emojiRow(r) {
  const A = active();
  let s = r.slots.map(x => EMO[x.awk]).join('');
  if (A.wheels) s += ' ' + r.slots.map(x => x.wheels.map(w => EMO[w]).join('')).join('|');
  if (A.cov) s += ' ' + r.slots.map(x => EMO[x.cov]).join('');
  if (A.key) s += ' ' + EMO[r.key];
  if (A.pot) s += ' ' + r.slots.map(x => EMO[x.pot.st]).join('');
  if (A.relics) s += ` 🧪${r.relics.filter(x => x === 'g').length}/${fillRelics().length}`;
  return s;
}

function submit() {
  if (finished) return;
  if (sel.slots.some(s => s.awk == null)) { toast(t('fillAll')); return; }
  if (new Set(sel.slots.map(s => s.awk)).size < 4) { toast(t('noDup')); return; }
  const r = evaluate();
  fillFeedback(r);
  history.push({ row: emojiRow(r), frac: r.green / r.total, green: r.green, total: r.total });
  if (r.win) { finished = true; won = true; } else if (history.length >= MAX_TRIES) { finished = true; won = false; }
  if (finished) {
    recordStats();
    if (won) {
      // 按难度给分；提示已经扣过分，这里只结算答对奖励
      const gain = ptsOf(puzzle);
      wallet.add(gain);
      if (mode === 'daily') {
        const st = statsOf();
        st.pts = (st.pts || 0) + gain;
        store.set('stats', st);
      }
      toast(t('ptsGain', { n: gain }));
    } else {
      // 彻底失败：永久移出题池
      failedBank.add(puzzle.id);
    }
    // 每一局（每日/随机/自建/工坊导入）都记进账号档案
    const { score, g } = grade();
    const last = history[history.length - 1];
    account.record({
      i: puzzle.id, m: mode, l: level, w: won ? 1 : 0, tr: history.length,
      sc: score, g, h: hintsUsed, f: [last.green, last.total],
      u: puzzle.uuid || '', ti: puzzle.title || '',
    });
  }
  persist();
  render();
}

function grade() {
  const last = history[history.length - 1];
  const frac = last ? last.frac : 0;
  const base = won ? 100 : Math.round(frac * 70);
  const score = Math.max(0, base - 8 * (history.length - 1) * (won ? 1 : 0) - 5 * hintsUsed);
  const g = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : score >= 30 ? 'C' : 'D';
  return { score, g };
}

function recordStats() {
  const st = statsOf();
  // 同一道题只计一次，避免反复刷统计
  if ((mode === 'daily' && st.last === todayKey() + ':' + level) || account.history().some(e => e.i === puzzle.id)) return;
  st.played++;
  if (mode === 'daily') st.last = todayKey() + ':' + level;
  if (won) {
    st.won++;
    if (mode === 'daily') { st.streak++; st.best = Math.max(st.best, st.streak); }
  } else if (mode === 'daily') st.streak = 0;
  // 准确率：统计命中的字段数 / 总字段数（最后一条历史记录的 frac）
  const last = history[history.length - 1];
  if (last && last.total != null) { st.fields = (st.fields || 0) + last.green; st.totalFields = (st.totalFields || 0) + last.total; }
  store.set('stats', st);
}

// ------------------------------------------------------------------ 线索
// 线索分两类：卡位上的（阵营、定位、等级）和队伍级的（钥令、内在灵格、灵塑、养成、助战、极值），
// 以及按位解锁的命轮 / 密契。
// 队伍级线索全部按当前这道题的真实数据算，没有数据的条目直接不出现；解锁状态按题存在本机。
const REALM_EN = { CHAOS: 'Chaos', CARO: 'Caro', AEQUOR: 'Aequor', ULTRA: 'Ultra', FADED_LEGACY: 'Faded Legacy' };
// 钥令/命轮只带中文阵营名（没有 realmCode），英文界面下按官方译名兜底
const REALM_ZH2EN = { 深海: 'Aequor', 混沌: 'Chaos', 血肉: 'Caro', 超维: 'Ultra', 褪色遗产: 'Faded Legacy', 通用: 'Universal', 其他: 'Other' };
const ROLE_EN = { ASSAULT: 'Damage', WARDEN: 'Defense', CHORUS: 'Support' };
const realmOf = (e) => (!e ? '—' : lang.cur === 'en' ? (REALM_EN[e.realmCode] || REALM_ZH2EN[e.realm] || e.realm) : e.realm);
const roleOf = (e) => (!e ? '—' : lang.cur === 'en' ? (ROLE_EN[e.roleCode] || e.role) : e.role);

let opened = new Set();
const clueStoreKey = () => `clues:${puzzle.id}`;
// 第二版按位线索（会点名位置的命轮 / 密契）的旧价，用来退款
const LEGACY_WHEEL_COST = [8, 10, 12, 14];
const LEGACY_COV_COST = [6, 8, 10, 12];
function loadClues() {
  const list = store.get(clueStoreKey(), null);
  const raw = new Set(Array.isArray(list) ? list : []);
  // 老版本买过的提示按新结构折算，别让人白花银芯：
  //   阵营·定位（a{k}）→ 只留阵营（r{k}），定位需要重新解锁
  //   等级/突破（c:lv）→ 内在灵格（c:brk）
  // 旧的按位命轮 / 密契（c:wheel{k}、c:cov{k}、c:wheel）语义已变（现在只报出现、
  // 不报位置），直接原价退回银芯，让玩家按新规则重新挑。
  let changed = false;
  let refund = 0;
  for (const key of [...raw]) {
    const m = /^a(\d)$/.exec(key);
    if (m) {
      raw.delete(key);
      raw.add(`r${m[1]}`);
      changed = true;
      continue;
    }
    if (key === 'c:lv') {
      raw.delete(key);
      raw.add('c:brk');
      changed = true;
      continue;
    }
    const w = /^c:wheel(\d)?$/.exec(key);
    if (w) {
      raw.delete(key);
      refund += w[1] == null ? 8 : (LEGACY_WHEEL_COST[+w[1]] || 8);
      changed = true;
      continue;
    }
    const c = /^c:cov(\d)$/.exec(key);
    if (c) {
      raw.delete(key);
      refund += LEGACY_COV_COST[+c[1]] || 6;
      changed = true;
    }
  }
  opened = raw;
  if (changed) store.set(clueStoreKey(), [...raw]);
  if (refund) { wallet.add(refund); toast(t('ptsRefund', { n: refund })); }
}
function openClue(key) {
  opened.add(key);
  store.set(clueStoreKey(), [...opened]);
  persist();
}
const isOpen = (key) => opened.has(key);

// ------------------------------------------------------------------ 开局线索
// 除「入门」外的三档被反馈太硬，所以每档开局白送几条最贵的线索
// （不是打折、不是提示次数，是直接摊开在桌上，开局就能看）：
//   进阶：命轮 ×3
//   老手：命轮 ×4 + 密契 ×2
//   大师：命轮 ×4 + 密契 ×2 + 造物 ×3 + 潜能（灵塑）汇总 ×1
// 命轮线索本身是按题目 id 打散过的，送的这几条不会固定落在 A 位。
const OPEN_GIFT = {
  2: { wheel: 3 },
  3: { wheel: 4, cov: 2 },
  4: { wheel: 4, cov: 2, relic: 3, pot: 1 },
};
let giftKeys = new Set();

function grantGift() {
  giftKeys = new Set();
  const g = OPEN_GIFT[level];
  if (!g) return 0;
  const L = clueList();
  const ids = [];
  const take = (arr, n) => { for (const c of (arr || []).slice(0, n || 0)) ids.push(c.id); };
  take(L.slots.filter(c => c.group === 'wheel'), g.wheel);
  take(L.slots.filter(c => c.group === 'cov'), g.cov);
  take(L.relics, g.relic);
  take(L.team.filter(c => c.id === 'pot'), g.pot);
  let fresh = 0;
  for (const id of ids) {
    const key = `c:${id}`;
    if (!opened.has(key)) { opened.add(key); fresh++; }
    giftKeys.add(key);          // 已经买过的那条也标上「赠送」，不然玩家会以为白送没生效
  }
  if (ids.length) store.set(clueStoreKey(), [...opened]);
  return fresh;
}

// 传进来的都是「基础价」，实际扣费按当前难度档乘以系数
function payHint(base = HINT_COST) {
  const cost = priceOf(base);
  if (!wallet.spend(cost)) { toast(t('noCredits')); return false; }
  hintsUsed++;
  toast(t('ptsHint', { n: cost }));
  return true;
}

// 卡位提示：阵营、定位、等级各一条（「内在灵格」属队伍级线索，见 clueList）
const slotRealm = (k) => realmOf(idx.awakener.get(ans[k].tid));
const slotRole = (k) => roleOf(idx.awakener.get(ans[k].tid));
const slotLv = (k) => `${t('lvTag')} ${ans[k].lv}`;
const wheelIds = (k) => (ans[k].wheels || []);
const wheelName = (id) => nameOf(idx.wheel.get(String(id))) || String(id);
const covNameOf = (id) => {
  const e = idx.covenant.get(String(id));
  return e ? nameOf(e) : '—';
};

// 造物：融灾里固有造物是「开局第一个造物 + 那一期的戒指」，两件都写在题面上、不用玩家填；
// 玩家只需要补齐剩下那些。老题库（自建题 / 早期题）没有 inn 字段时，退回按「维度影像」判定。
const INNATE_KIND = '维度影像';
const creationOf = (id) => idx.creation.get(String(id)) || null;
// 造物说明书原文（中文库；英文界面也读这份，宁可中文也别不给）
const relicDesc = (id) => {
  const e = creationOf(id);
  return e ? (e.desc || []).map(x => (x && x.t) || '').join(' ') : '';
};
const relicRarity = (id) => ((creationOf(id) || {}).rarity || '');
const relicList = () => puzzle.relics || [];
const innateIds = () => (Array.isArray(puzzle.inn) && puzzle.inn.length
  ? puzzle.inn.map(String)
  : relicList().filter(id => (creationOf(id) || {}).kind === INNATE_KIND));
const isInnateRelic = (id) => innateIds().includes(String(id));
const innateRelics = () => relicList().filter(id => isInnateRelic(id));
const fillRelics = () => relicList().filter(id => !isInnateRelic(id));
const relicTags = (id) => RELIC_TAGS[String(id)] || [];

function hintAwk(k) {
  if (finished || isOpen(`r${k}`)) return;
  if (!payHint()) return;
  openClue(`r${k}`);
  render();
}
function hintRole(k) {
  if (finished || isOpen(`o${k}`)) return;
  if (!payHint()) return;
  openClue(`o${k}`);
  render();
}
function hintLv(k) {
  if (finished || isOpen(`l${k}`)) return;
  if (!payHint()) return;
  openClue(`l${k}`);
  render();
}

// 线索台：队伍级线索（一次解锁整队）+ 出现型线索（命轮 / 密契，一次解锁一条，
// 只报「这局里有它」，不说在哪个位置、也不给组合，越往后越贵）。
// 值在渲染时才计算，保证和这一题完全对应；缺字段的线索直接不出现，
// 绝不卖一条全是「—」的线索。价格一律是基础价，实际扣费走 payHint 的难度系数。
const WHEEL_CLUE_COST = [6, 8, 10, 12, 14, 16, 18, 20];   // 第 1 条最便宜，往后逐条加价
const COV_CLUE_COST = [5, 7, 9, 11];

// 造物线索：按效果标签统计件数，只报「有几件带这个功能」，不报名字
const RELIC_CLUES = [
  { id: 'relOut', cost: 5, tags: ['dmg', 'str', 'crit'], label: 'clueRelOut' },
  { id: 'relDraw', cost: 4, tags: ['draw'], label: 'clueRelDraw' },
  { id: 'relRage', cost: 4, tags: ['rage'], label: 'clueRelRage' },
  { id: 'relCost', cost: 4, tags: ['energy', 'exhaust'], label: 'clueRelCost' },
  { id: 'relGuard', cost: 4, tags: ['guard'], label: 'clueRelGuard' },
  // 下面三条不看人工标签，直接按造物数据本身判（稀有度 / 说明书原文），
  // 覆盖率更好，也不怕标签漏打。
  { id: 'relGold', cost: 6, label: 'clueRelGold', value: (ids) => {
    // 稀有度有缺失（事件/摆锤造物常见）时不说死，改成「至少 n 件 + m 件未知」
    const known = ids.filter(id => /^(SSR|SR|N)$/.test(relicRarity(id)));
    const unknown = ids.length - known.length;
    const n = known.filter(id => relicRarity(id) === 'SSR').length;
    if (!unknown) return n ? t('clueRelN', { n }) : t('clueRelNone');
    return t('clueRelGoldMin', { n, m: unknown });
  } },
  { id: 'relBase', cost: 6, label: 'clueRelBase', test: id => /基础伤害|base damage/i.test(relicDesc(id)) },
  { id: 'relHeal', cost: 5, label: 'clueRelHeal', test: id => /治疗|回复.{0,6}生命|恢复.{0,6}生命|heal|restore .{0,6}HP/i.test(relicDesc(id)) },
];

// 用题目 id 做种子的确定性打散：每次渲染顺序一致，但不能是「按 A→D 排」，
// 否则第 1 条永远来自 A 位，等于变相泄露位置。
function seededShuffle(arr, seed) {
  let st = 2166136261;
  const key = String(seed || '');
  for (let i = 0; i < key.length; i++) { st ^= key.charCodeAt(i); st = Math.imul(st, 16777619); }
  const rnd = () => {
    st ^= st << 13; st ^= st >>> 17; st ^= st << 5;
    return (st >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
  return out;
}

// 本题出现过的命轮 / 密契（去重，保持「谁先出现」无关的顺序）
function appeared(list) {
  const seen = new Set();
  const out = [];
  for (const id of list) {
    if (id == null) continue;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(id);
  }
  return out;
}

function clueList() {
  const A = active();
  const x = puzzle.x || {};
  const j = (arr) => arr.map(v => (v == null ? '—' : v)).join(' / ');
  const full = (f) => ans.length > 0 && ans.every(a => a[f] != null);
  const team = [];
  const slots = [];
  const seed = puzzle.id;

  if (puzzle.key != null) {
    team.push({ id: 'key', cost: 6, label: t('hintKey'), value: () => realmOf(idx.key.get(puzzle.key)) });
  }

  // 等级在下方的卡位提示里已经能买到，这里只给「内在灵格」
  if (full('brk')) {
    team.push({ id: 'brk', cost: 6, label: t('clueBrk'), value: () => j(ans.map(a => a.brk)) });
  }

  // 「灵塑等级」和「养成（指令卡 / 疯狂预兆）」不再当线索卖：
  // 战报面板（reportPanel 的 invest 行）本来就把每个卡位的灵塑、指令卡总等级
  // 原样印在桌上，再花银芯买一条一模一样的信息属于重复收费。

  // 命轮强化只报整队统计，不带位置：最高强化到几、有几件 ≥+12
  const wl = (x.wl || []).filter(v => v != null);
  if (wl.length) {
    team.push({
      id: 'wheelUp', cost: 6, label: t('clueWheelUp'),
      value: () => {
        const hi = wl.filter(v => v >= 12).length;
        return t('clueWheelMax', { n: Math.max(...wl) }) + (hi ? ` · ${t('clueWheelHi', { n: hi })}` : '');
      },
    });
  }

  if (x.as != null) {
    team.push({
      id: 'assist', cost: 4, label: t('clueAssist'),
      value: () => (x.as ? t('clueAssistY', { n: x.as }) : t('clueAssistN')),
    });
  }

  if (x.bc != null || x.be != null || x.pl != null) {
    team.push({
      id: 'peak', cost: 5, label: t('cluePeak'),
      value: () => [
        x.bc != null ? t('cluePeakCard', { n: x.bc }) : '',
        x.be != null ? t('cluePeakEnergy', { n: x.be }) : '',
        x.pl != null ? t('cluePeakLv', { n: x.pl }) : '',
      ].filter(Boolean).join(' · '),
    });
  }

  // 潜能（灵塑）：四个卡位的数值本来就印在战报面板的「养成」行里，
  // 这里给一条汇总（含合计），省得玩家在面板和卡位之间来回对；只在要填潜能的档上架。
  if (A.pot && full('pot')) {
    team.push({
      id: 'pot', cost: 8, label: t('cluePotTeam'),
      value: () => `${ans.map((a, k) => `${LETTERS[k]} ${a.pot}`).join(' · ')}`
        + ` · ${t('cluePotSum', { n: ans.reduce((s, a) => s + (a.pot || 0), 0) })}`,
    });
  }

  // 命轮：一次解锁一条，只说这局用了哪几件，不说在哪一位，也不成对给出
  if (A.wheels && full('wheels')) {
    const all = appeared(ans.flatMap((a, k) => wheelIds(k)));
    seededShuffle(all, seed).forEach((id, i) => {
      slots.push({
        id: `wh${i}`, cost: WHEEL_CLUE_COST[i] || WHEEL_CLUE_COST[WHEEL_CLUE_COST.length - 1], group: 'wheel',
        label: t('clueWheelOne', { n: i + 1 }),
        value: () => wheelName(id),
      });
    });
  }

  // 密契：同样只报出现
  if (A.cov && full('cov')) {
    const all = appeared(ans.map(a => a.cov));
    seededShuffle(all, `${seed}#cov`).forEach((id, i) => {
      slots.push({
        id: `cv${i}`, cost: COV_CLUE_COST[i] || COV_CLUE_COST[COV_CLUE_COST.length - 1], group: 'cov',
        label: t('clueCovOne', { n: i + 1 }),
        value: () => covNameOf(id),
      });
    });
  }

  // 造物：按功能报件数（含固有造物，因为那几件也是这一局的造物）
  const relics = A.relics && relicList().length
    ? RELIC_CLUES.map(c => ({
      id: c.id, cost: c.cost, label: t(c.label),
      value: () => {
        const ids = relicList();
        if (c.value) return c.value(ids);
        const n = ids.filter(id => relicTags(id).some(x => (c.tags || []).includes(x)) || (c.test && c.test(id))).length;
        return n ? t('clueRelN', { n }) : t('clueRelNone');
      },
    }))
    : [];

  // 牌组：总张数 / 症状卡 / 衍生卡 / 命轮塞进牌组的附加卡，件数在构建题目时就按战报算好
  const dk = (puzzle.x && puzzle.x.dk) || null;
  const decks = dk
    ? [
      dk.n != null ? { id: 'dkN', cost: 3, label: t('clueDeckSize'), value: () => t('clueDeckN', { n: dk.n }) } : null,
      dk.cur != null ? { id: 'dkCur', cost: 5, label: t('clueDeckCur'), value: () => t('clueDeckN', { n: dk.cur }) } : null,
      // 延展（衍生）卡打完就没了，战报牌组里基本不留存：有才上架，没有就不占一格
      dk.ext ? { id: 'dkExt', cost: 5, label: t('clueDeckExt'), value: () => t('clueDeckN', { n: dk.ext }) } : null,
      dk.whl != null ? { id: 'dkWhl', cost: 4, label: t('clueDeckWhl'), value: () => t('clueDeckN', { n: dk.whl }) } : null,
    ].filter(Boolean)
    : [];

  // 作者自定义线索：内容原样展示，价格也按作者定的来
  const extra = authorHints().map((c, i) => ({
    id: `au${i}`, fixed: true, cost: Math.max(1, Math.round(Number(c.c) || 5)),
    label: String(c.n || t('clueAuthorOne', { n: i + 1 })),
    value: () => String(c.v || '—'),
  }));

  return { team, relics, decks, slots, extra };
}

// 作者自定义线索（工坊里手写的）：按作者定的价出售，不参与难度加价，
// 因为它是「作者额外告诉你的信息」，不是从数据里算出来的那份。
// 分享码里压成三元组（h），云题库 / 本地题库存的是完整对象（hints），两种都认。
const authorHints = () => {
  const p = puzzle || {};
  if (Array.isArray(p.hints)) return p.hints.filter(c => c && (c.n || c.v));
  if (Array.isArray(p.h)) {
    return p.h.map(c => (Array.isArray(c) ? { n: c[0], v: c[1], c: c[2] } : c))
      .filter(c => c && (c.n || c.v));
  }
  return [];
};

function payFixed(cost) {
  const c = Math.max(1, Math.round(Number(cost) || 1));
  if (!wallet.spend(c)) { toast(t('noCredits')); return false; }
  hintsUsed++;
  toast(t('ptsHint', { n: c }));
  return true;
}

function buyClue(c) {
  if (finished || isOpen(`c:${c.id}`)) return;
  const ok = c.fixed ? payFixed(c.cost) : payHint(c.cost);
  if (!ok) return;
  openClue(`c:${c.id}`);
  render();
}

function clueCard(c) {
  const key = `c:${c.id}`;
  if (isOpen(key)) {
    return h('div', { class: 'clue on' }, h('small', {}, c.label), h('b', {}, c.value()),
      giftKeys.has(key) ? h('em', { class: 'gift' }, t('giftTag')) : null);
  }
  // 卡上显示的是这一档的真实价格（payHint 会按难度系数扣；作者线索是固定价）
  return h('button', { type: 'button', class: 'clue lock', onclick: () => buyClue(c) },
    h('small', {}, c.label), h('b', { class: 'cost' }, scIcon(12), ` ${c.fixed ? c.cost : priceOf(c.cost)}`));
}

function cluePanel() {
  if (finished) return null;
  const { team, relics, decks, slots, extra } = clueList();
  const wheels = slots.filter(c => c.group === 'wheel');
  const covs = slots.filter(c => c.group === 'cov');
  const mul = LV_COST_MUL[level] || 1;
  const note = (mul > 1 ? `${t('clueNote')} · ${t('clueMul', { m: mul })}` : t('clueNote'))
    + (giftKeys.size ? ` · ${t('clueGiftOn', { n: giftKeys.size })}` : '');
  return h('section', { class: 'card clues' },
    h('div', { class: 'cluehead' },
      h('h3', {}, t('clueTitle')),
      h('span', { class: 'note' }, note)),
    team.length ? h('div', { class: 'cluegrid' }, team.map(clueCard)) : null,
    relics.length ? h('div', { class: 'cluesub' }, h('b', {}, t('clueRelTitle'))) : null,
    relics.length ? h('div', { class: 'cluegrid' }, relics.map(clueCard)) : null,
    decks.length ? h('div', { class: 'cluesub' }, h('b', {}, t('clueDeckTitle'))) : null,
    decks.length ? h('div', { class: 'cluegrid four' }, decks.map(clueCard)) : null,
    wheels.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueWheelSeen')), h('span', { class: 'note' }, t('clueStepNote'))) : null,
    wheels.length ? h('div', { class: 'cluegrid four' }, wheels.map(clueCard)) : null,
    covs.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueCovSeen')), h('span', { class: 'note' }, t('clueStepNote'))) : null,
    covs.length ? h('div', { class: 'cluegrid four' }, covs.map(clueCard)) : null,
    extra.length ? h('div', { class: 'cluesub' },
      h('b', {}, t('clueAuthorTitle')), h('span', { class: 'note' }, t('clueAuthorNote'))) : null,
    extra.length ? h('div', { class: 'cluegrid' }, extra.map(clueCard)) : null);
}

// ------------------------------------------------------------------ 点赞
// 只有工坊出的自建题能点赞：每被一个人点赞，作者得 1 银芯；每人每天最多 10 次。
// 赞数来自共享存储（见 js/likes.js），点完立刻 +1，真正的写入在后台排队。
let likeCount = null;
let likeFor = '';

async function loadLike(id) {
  const key = String(id || '');
  likeFor = key;
  const cached = likes.cachedCounts()[key];
  likeCount = cached == null ? null : Number(cached) || 0;
  try {
    const c = await likes.counts([key]);
    if (likeFor !== key) return;
    likeCount = c[key] || 0;
    store.set('likeCnt', { ...likes.cachedCounts(), [key]: likeCount });
  } catch { /* 离线就只显示缓存里的数 */ }
  if (puzzle && String(puzzle.id) === key) render();
}

function likeBar() {
  if (!puzzle || !puzzle.custom) return null;
  const id = String(puzzle.id || '');
  const mine = customPuzzles().some(p => String(p.id) === id);
  const voted = likes.hasVoted(id);
  const left = likes.leftToday();
  const tip = likes.pending();
  return h('div', { class: 'likestrip' },
    h('span', { class: 'likecnt', title: t('likeTip', { n: likes.LIKE_MAX }) },
      '❤', h('b', {}, likeCount == null ? '·' : String(likeCount))),
    mine
      ? h('span', { class: 'note' }, t('likeSelf'))
      : voted
        ? h('button', { type: 'button', class: 'btn sm ghost', disabled: true }, t('likeDone'))
        : h('button', { type: 'button', class: 'btn sm', disabled: left <= 0, onclick: doLike }, t('likeBtn')),
    mine ? null : likes.cloudReady()
      ? h('span', { class: 'note' }, left > 0 ? t('likeLeft', { n: left }) : t('likeZero', { n: likes.LIKE_MAX }))
      : h('span', { class: 'note dim' }, t('likeCloudNote')),
    mine && !likes.cloudReady() ? h('span', { class: 'note dim' }, t('likeCloudNote')) : null,
    tip ? h('span', { class: 'note dim' }, t('likeQueue', { n: tip })) : null);
}

function doLike() {
  const id = String((puzzle && puzzle.id) || '');
  if (!id) return;
  const r = likes.like(id);
  if (r.ok === 'quota') { toast(t('likeZero', { n: likes.LIKE_MAX })); return; }
  if (r.ok === 'ok') {
    likeCount = (Number(likeCount) || 0) + 1;
    store.set('likeCnt', { ...likes.cachedCounts(), [id]: likeCount });
    toast(likes.cloudReady() ? t('likeThanks', { n: r.left }) : t('likeCloudOff'));
  }
  render();
}

// ------------------------------------------------------------------ UI pieces
function toast(msg) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 1800);
}

const cls = (k) => {
  const f = fb[k];
  return f ? ` fb-${f.c}` : '';
};
const fbOk = (k, cur) => fb[k] && fb[k].v === cur ? cls(k) : '';

function chip(text, tone = '') { return h('span', { class: 'chip ' + tone }, text); }

const bline = (c, pct, text) => h('div', { class: 'bline' }, h('div', { class: 'track' }, h('div', { class: `bar ${c}`, style: `width:${pct}%` })), h('i', {}, text));

function reportPanel() {
  const p = puzzle;
  const total = ans.reduce((s, a) => s + a.dmg, 0) || 1;
  const maxBlk = Math.max(...ans.map(a => a.blk), 1);
  const maxHeal = Math.max(...ans.map(a => a.heal), 1);
  const stat = (k, v, sub) => h('div', { class: 'stat' }, h('small', {}, k), h('b', {}, v), sub ? h('em', {}, sub) : null);
  const rows = ans.map((a, k) => {
    // 养成线索：优先展示新字段（指令卡总等级/狂气等级/灵塑），旧字段作为补充
    const invest = [];
    if (a.cardLv != null) invest.push(`${t('cardLv')} Lv.${a.cardLv}`);
    if (a.madness != null) invest.push(`${t('madnessLv')} Lv.${a.madness}`);
    if (a.pot != null) invest.push(`${t('potLv')} Lv.${a.pot}`);
    if (!invest.length && a.up != null) invest.push(t('cardUp', { n: a.up }), t('talentSum', { n: a.tal }));
    return h('div', { class: 'brow' },
      h('span', { class: 'bl' }, LETTERS[k]),
      h('div', { class: 'bars' },
        bline('dmg', Math.max(a.dmg / total * 100, 0.8), `${t('dmg')} ${(a.dmg / total * 100).toFixed(1)}% · ${wan(a.dmg)}`),
        bline('blk', Math.max(a.blk / maxBlk * 100, 0.8), `${t('blk')} ${wan(a.blk)}`),
        bline('heal', Math.max(a.heal / maxHeal * 100, 0.8), `${t('heal')} ${wan(a.heal)}`),
        h('div', { class: 'invest' }, invest.join(' · '))),
    );
  });
  const bosses = (p.boss || []).map(id => D.monster.find(m => m.id === id)).filter(Boolean);
  // 伤害构成面板
  const dc = p.dmgComp;
  const dmgCompBox = dc ? h('div', { class: 'dmgcomp' },
    h('div', { class: 'dchead' }, t('dmgCompTitle')),
    h('div', { class: 'dcgrid' },
      h('div', { class: 'dc', 'data-k': 'keeper' }, h('small', {}, t('keeper')), h('b', {}, wan(dc.keeper))),
      h('div', { class: 'dc', 'data-k': 'tentacle' }, h('small', {}, t('tentacle')), h('b', {}, wan(dc.tentacle))),
      h('div', { class: 'dc', 'data-k': 'counter' }, h('small', {}, t('counter')), h('b', {}, wan(dc.counter))),
      h('div', { class: 'dc', 'data-k': 'strength' }, h('small', {}, t('strength')), h('b', {}, wan(dc.strength))),
      h('div', { class: 'dc', 'data-k': 'poison' }, h('small', {}, t('poison')), h('b', {}, wan(dc.poison))))) : null;
  return h('section', { class: 'card report' },
    h('div', { class: 'rhead' },
      h('div', {}, h('h2', {}, `${t('reportTitle')} · ${t('season', { s: p.season })}`),
        h('div', { class: 'chips' }, chip(t('zone', { z: p.zone })), chip(t('threat', { t: p.threat })),
          p.madness ? chip(t('madness', { m: p.madness })) : null, chip(t('diffStar', { d: '★'.repeat(p.diff) }), 'gold'),
          p.diffScore != null ? chip(t('diffScore', { s: p.diffScore }), 'gold') : null,
          p.extra ? chip(t('extra'), 'dim') : null)),
      bosses.length ? h('div', { class: 'boss' }, h('div', { class: 'bimgs' }, bosses.map(b => imgEl(b.img, nameOf(b)))), h('small', {}, `${t('bossLabel')}：${bosses.map(b => nameOf(b)).join('、')}`)) : null),
    h('div', { class: 'stats' },
      stat(t('rounds'), p.rounds, t('bossRounds', { n: p.bossRounds })), stat(t('cards'), p.cards, t('energy', { n: p.energy })),
      stat(t('maxBout'), wan(p.maxBout)), stat(t('deathResist'), p.deathResist),
      stat(t('leftHp'), `${p.left}/${p.hp}`), stat(t('keyDmg'), wan(p.playerDmg)),
      stat(t('score'), p.score), stat(t('relicCount'), p.relics.length,
        level >= 4 ? t('relicInnate', { n: p.relics.filter(isInnateRelic).length }) : '')),
    dmgCompBox,
    p.diffWhy ? h('div', { class: 'diffwhy' },
      h('b', {}, `${t('diffWhy')}：`),
      h('span', {}, `${t('diffInfo')} ${Math.round(p.diffWhy.info * 100)}%`),
      h('span', {}, `${t('diffSpread')} ${Math.round(p.diffWhy.spread * 100)}%`),
      h('span', {}, `${t('diffPeel')} ${Math.round(p.diffWhy.peel * 100)}%`)) : null,
    bosses.length ? h('details', { class: 'bskills' }, h('summary', {}, t('bossSkills')),
      bosses.map(b => h('div', {}, h('b', {}, nameOf(b)), h('ul', {}, (b.skills || []).map(x => h('li', {}, renderText(x))))))) : null,
    h('div', { class: 'brows' }, rows,
      h('p', { class: 'note' }, t('sortNote'))));
}

function pickBtn(kind, current, onPick, fkey, extraCls = '') {
  const e = current == null ? null : idx[kind].get(String(current));
  const f = fkey ? fbOk(fkey, current) : '';
  return h('button', { class: `pick ${kind} ${f}${extraCls}`, type: 'button', title: e ? nameOf(e) : t('pick' + (kind[0].toUpperCase() + kind.slice(1))), onclick: onPick },
    e ? imgEl(e.img, nameOf(e)) : h('span', { class: 'plus' }, '＋'),
    e ? h('small', {}, nameOf(e)) : h('small', {}, KINDS[kind]));
}

// 交换 / 清除都得把那一格的反馈颜色抹掉：颜色评的是「原来摆在那个位置的人」，
// 人挪走了还留着颜色就是误导（也不该靠挪位置白拿一份新的对错信息）。
function dropFb(k) {
  delete fb[`awk${k}`];
  delete fb[`w${k}0`];
  delete fb[`w${k}1`];
  delete fb[`cov${k}`];
  delete fb[`pot${k}`];
}

// 两个卡位整体互换：唤醒体连同命轮、密契、灵塑一起搬过去
function swapSlots(a, b) {
  const s = sel.slots;
  const t0 = s[a];
  s[a] = s[b];
  s[b] = t0;
  dropFb(a);
  dropFb(b);
  toast(t('swapDone', { a: LETTERS[a], b: LETTERS[b] }));
}

// 反馈是红色（这人不在队里）的卡位 = 一定选错，可以一键清掉
const wrongSlots = () => sel.slots
  .map((g, k) => {
    const f = fb[`awk${k}`];
    return g.awk != null && f && f.c === 'n' && f.v === g.awk ? k : -1;
  })
  .filter(k => k >= 0);

function clearWrong() {
  const list = wrongSlots();
  if (!list.length) { toast(t('clearNone')); return; }
  list.forEach(k => {
    sel.slots[k] = { awk: null, wheels: [null, null], cov: null, pot: null };
    dropFb(k);
  });
  swapFrom = null;
  persist();
  render();
  toast(t('clearDone', { n: list.length }));
}

function slotCard(k) {
  const A = active();
  const g = sel.slots[k];
  const locked = finished;
  const open = (kind, apply) => () => { if (!locked) openPicker(kind, apply, k); };
  // 唤醒体卡位：空着直接开选择器；已经选了的先进入交换状态，
  // 再点自己（第二次）才改选，点别的卡位就换过去。
  const onAwk = () => {
    if (locked) return;
    if (swapFrom == null) {
      if (g.awk == null) { openPicker('awakener', v => { g.awk = v; }, k); return; }
      swapFrom = k;
      toast(t('swapPick', { l: LETTERS[k] }));
      render();
      return;
    }
    if (swapFrom === k) { swapFrom = null; openPicker('awakener', v => { g.awk = v; }, k); return; }
    swapSlots(swapFrom, k);
    swapFrom = null;
    persist();
    render();
  };
  const card = h('div', { class: `slot${swapFrom === k ? ' swapfrom' : ''}` },
    h('div', { class: 'shead' }, h('b', {}, t('slotHead', { l: LETTERS[k] })),
      h('span', { class: 'chips' },
        isOpen(`r${k}`) ? chip(slotRealm(k), 'gold') : null,
        isOpen(`o${k}`) ? chip(slotRole(k), 'gold') : null,
        isOpen(`l${k}`) ? chip(slotLv(k), 'gold') : null)),
    pickBtn('awakener', g.awk, onAwk, `awk${k}`, ` big${swapFrom != null && swapFrom !== k ? ' droppable' : ''}`));
  if (A.wheels) {
    card.append(h('div', { class: 'row2' }, [0, 1].map(i =>
      pickBtn('wheel', g.wheels[i], open('wheel', v => { g.wheels[i] = v; }), `w${k}${i}`))));
  }
  if (A.cov) card.append(pickBtn('covenant', g.cov, open('covenant', v => { g.cov = v; }), `cov${k}`));
  if (A.pot) {
    const f = fb[`pot${k}`] && fb[`pot${k}`].v === g.pot ? fb[`pot${k}`] : null;
    card.append(h('div', { class: `pot${f ? ' fb-' + f.c : ''}` },
      h('small', {}, t('potLv')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.max(0, (g.pot ?? 1) - 1); persist(); render(); } } }, '−'),
      h('b', {}, g.pot == null ? '—' : g.pot + (f && f.dir ? ' ' + f.dir : '')),
      h('button', { type: 'button', onclick: () => { if (!locked) { g.pot = Math.min(15, (g.pot ?? -1) + 1); persist(); render(); } } }, '+')));
  }
  if (!locked) {
    card.append(h('div', { class: 'hints' },
      isOpen(`r${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintAwk(k) }, t('hintRealm'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`),
      isOpen(`o${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintRole(k) }, t('hintRole'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`),
      isOpen(`l${k}`) ? null : h('button', { type: 'button', class: 'link', onclick: () => hintLv(k) }, t('hintLv'), ' ', scIcon(11), ` ${priceOf(HINT_COST)}`)));
  }
  return card;
}

function teamExtras() {
  const A = active();
  const box = h('div', { class: 'extras' });
  if (A.key) {
    box.append(h('div', { class: 'extra' }, h('b', {}, t('keyLabel')),
      pickBtn('key', sel.key, () => { if (!finished) openPicker('key', v => { sel.key = v; }); }, 'key'),
      isOpen('c:key') ? chip(realmOf(idx.key.get(puzzle.key)), 'gold') : null));
  }
  if (A.relics) {
    const inn = innateRelics();
    const need = fillRelics();
    const relicChip = (id, title) => {
      const e = creationOf(id);
      return { e, label: e ? nameOf(e) : id };
    };
    box.append(h('div', { class: 'extra wide' }, h('b', {}, `${t('relicLabel')} ${sel.relics.length}/${need.length}`),
      // 固有造物跟着唤醒体走，题面直接给，玩家不用也不能填
      inn.length ? h('div', { class: 'relics innate' },
        h('span', { class: 'innatetag' }, t('innateTag')),
        inn.map(id => {
          const { e, label } = relicChip(id);
          return h('span', { class: 'pick mini fixed', title: label },
            imgEl(e && e.img, label), h('small', {}, label));
        })) : null,
      h('div', { class: 'relics mine' },
        inn.length ? h('span', { class: 'innatetag mine' }, t('relicFillTag')) : null,
        sel.relics.map(id => {
          const { e, label } = relicChip(id);
          const f = fb[`rel${id}`];
          return h('button', { type: 'button', class: `pick mini${f ? ' fb-' + f.c : ''}`, title: label,
            onclick: () => { if (!finished) { sel.relics = sel.relics.filter(x => x !== id); persist(); render(); } } },
            imgEl(e && e.img, label), h('small', {}, label));
        }),
        finished ? null : h('button', { type: 'button', class: 'pick mini add', onclick: () => openPicker('creation', null) }, h('span', { class: 'plus' }, '＋'), h('small', {}, t('add')))
      )));
  }
  return box;
}

function historyPanel() {
  return h('section', { class: 'card hist' },
    h('h3', {}, `${t('histTitle')} ${history.length}/${MAX_TRIES}`),
    history.length ? h('ol', {}, history.map(x => h('li', {}, x.row, h('em', {}, ` ${Math.round(x.frac * 100)}%`)))) : emptyState(t('histEmpty')));
}

function copyText(txt, ok = t('copied')) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject())
    .then(() => toast(ok), () => prompt(t('copy'), txt));
}

// 回放：官方原始 JSON + 忘忘看报复盘入口
function replayBox(p) {
  if (!p.uuid) return h('p', { class: 'note' }, `${t('replayTitle')}：—`);
  return h('div', { class: 'replaybox' },
    h('b', {}, t('replayTitle')),
    h('div', { class: 'rlinks' },
      h('a', { href: REPLAY.json(p.uuid), target: '_blank', rel: 'noopener' }, t('replayApi')),
      h('a', { href: REPLAY.review, target: '_blank', rel: 'noopener' }, t('replayReview')),
      h('button', { type: 'button', class: 'link', onclick: () => copyText(p.uuid) }, t('replayCopy'))),
    h('p', { class: 'note mono' }, p.uuid),
    h('p', { class: 'note' }, t('replayHint')));
}

// 一支队伍答案的展示（结果面板 & 失败题库共用）
function teamBlock(team) {
  const mk = (kind, id, extra = '') => {
    const e = idx[kind].get(String(id));
    return h('span', { class: `ans-i${extra}`, title: e ? nameOf(e) : id },
      imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
  };
  const awkAttr = (a) => {
    const e = idx.awakener.get(String(a.tid));
    if (!e) return '';
    return [realmOf(e), roleOf(e), e.rarity].filter(Boolean).join(' · ');
  };
  return h('div', { class: 'ans-team' }, team.map((a, k) => h('div', { class: 'ans-slot' },
    h('b', {}, `${t('slotHead', { l: LETTERS[k] })} · ${t('lv', { n: a.lv })} · ${t('potFull', { n: a.pot })} · ${t('brk', { n: a.brk })}`),
    h('div', { class: 'ans-attr' }, awkAttr(a)),
    h('div', { class: 'ans-row' }, mk('awakener', a.tid), (a.wheels || []).map(w => mk('wheel', w)), mk('covenant', a.cov)))));
}

function answerPanel() {
  const { score, g } = grade();
  const mk = (kind, id, extra = '') => {
    const e = idx[kind].get(String(id));
    return h('span', { class: `ans-i${extra}`, title: e ? nameOf(e) : id },
      imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : id));
  };
  return h('section', { class: `card result ${won ? 'win' : 'lose'}` },
    h('h2', {}, won ? `${t('winTitle')} · ${t('grade', { g })}` : `${t('loseTitle')} · ${t('grade', { g })}`),
    h('p', {}, t('scoreText', { s: score, h: hintsUsed, n: history.length })),
    h('div', { class: 'chips' },
      won ? chip(t('ptsGain', { n: ptsOf(puzzle) }), 'gold') : chip(t('failedMark'), 'warn'),
      chip([`${t('credits')} `, scIcon(12), ` ${wallet.get()}`])),
    teamBlock(ans),
    h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', puzzle.key)),
    h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')),
      puzzle.relics.map(r => mk('creation', r, isInnateRelic(r) ? ' innate' : ''))),
    replayBox(puzzle),
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: share }, t('copy')),
      h('button', { class: 'btn ghost', onclick: () => start(pickAny(), 'random') }, t('again'))));
}

function share() {
  const txt = `${t('brand')} ${mode === 'daily' ? todayKey() : puzzle.id} · ${LEVELS[level].name()} ${won ? history.length : 'X'}/${MAX_TRIES}\n` + history.map(x => x.row).join('\n');
  copyText(txt);
}

// ------------------------------------------------------------------ 失败题库
// <dialog> 在 iOS 15.4 之前根本不存在：没有 showModal 时退化成「加 open 属性」，
// 版式由 css/style.css 的 dialog.picker[open] 兜住——选卡能用，不会整页崩掉。
function openModal(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); }
function closeModal(d) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open'); }

const ansDlg = h('dialog', { class: 'picker review' });
document.body.append(ansDlg);

async function viewFailed(id) {
  const p0 = (await bank.fetchPuzzle(id)) || customPuzzles().find(x => x.id === id);
  if (!p0) return;
  const p = await unseal(p0);
  const mk = (kind, i) => { const e = idx[kind].get(String(i)); return h('span', { class: 'ans-i', title: e ? nameOf(e) : i }, imgEl(e && e.img, e && nameOf(e)), h('small', {}, e ? nameOf(e) : i)); };
  ansDlg.replaceChildren(
    h('div', { class: 'phead' },
      h('b', {}, `${t('failedTitle')} · ${p.id}`),
      h('span', { class: 'note' }, `${t('season', { s: p.season })} · ${t('score', { s: p.score })}`),
      h('button', { class: 'btn sm', onclick: () => closeModal(ansDlg) }, t('close'))),
    h('div', { class: 'ans-wrap' },
      teamBlock(p.team),
      h('div', { class: 'ans-row' }, h('b', {}, t('keyLabel')), mk('key', p.key)),
      h('div', { class: 'ans-row wrap' }, h('b', {}, t('relicLabel')), (p.relics || []).map(r => mk('creation', r))),
      replayBox(p)));
  openModal(ansDlg);
}

function failedPanel() {
  const list = failedBank.list();
  return h('section', { class: 'card failedbank' },
    h('h3', {}, `${t('failedTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('failedNote', { n: MAX_TRIES })),
    list.length ? h('div', { class: 'fbrow' }, list.map(id => h('button', {
      type: 'button', class: 'btn ghost sm', onclick: () => viewFailed(id),
    }, `${id} · ${t('replayTitle')}`))) : emptyState(t('failedEmpty')));
}

// ------------------------------------------------------------------ profile / login
// 只有两种状态：游客（读本机缓存）与已登录（账号云端档案）。
function profilePanel() {
  const st = statsOf();
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  const u = auth.user;
  const acts = u
    ? [
        h('a', { class: 'btn ghost sm', href: 'profile.html' }, t('myCenter')),
        h('button', { class: 'btn ghost sm', onclick: () => { auth.logout(); account.forget(); render(); } }, t('pfLogout')),
      ]
    : [
        h('button', { class: 'btn sm', onclick: () => openLogin(() => location.reload()) }, t('loginRegister')),
        h('a', { class: 'btn ghost sm', href: 'profile.html' }, t('pfGuestData')),
      ];
  const chips = [`${t('totalPlayed')} ${st.played}`, `${t('totalWon')} ${st.won}`, `${t('accuracy')} ${acc}`];
  return h('section', { class: 'card profile' },
    h('div', { class: 'prow' },
      u
        ? imgEl(auth.avatarOf(u), u.name, 'pfavatar tiny')
        : h('span', { class: 'pfavatar tiny guest', title: t('guestTag') }, '👤'),
      h('div', { class: 'pmeta' },
        h('div', { class: 'pname' },
          h('b', {}, u ? u.name : t('guestTag')),
          h('span', { class: `ptag${u ? ' acct' : ''}` }, u ? t('acctTag') : t('guestShort'))),
        h('div', { class: 'pchips' }, chips.map(x => h('span', { class: 'chip dim' }, x)))),
      h('div', { class: 'pactions' }, acts)),
    h('p', { class: 'pnote' }, u ? t('pfSyncNote') : t('pfGuestNote')),
    checkinBar('', () => render()));
}

function controls() {
  const st = statsOf();
  const acc = st.totalFields ? Math.round(st.fields / st.totalFields * 100) + '%' : '—';
  const range = LV_RANGE[level] || [1, 4];
  const poolN = basePool().length;
  return h('section', { class: 'card ctl' },
    h('div', { class: 'levels' }, Object.entries(LEVELS).map(([k, v]) =>
      h('button', { class: `lv${+k === level ? ' on' : ''}`, onclick: () => { level = +k; store.set('level', level); start(mode === 'daily' ? dailyPuzzle() : puzzle, mode); } },
        h('b', {}, v.name()), h('small', {}, v.desc())))),
    h('div', { class: 'modes' },
      h('button', { class: `btn${mode === 'daily' ? '' : ' ghost'}`, onclick: () => start(dailyPuzzle(), 'daily') }, `${t('daily')} ${todayKey()}`),
      h('button', { class: `btn${mode === 'random' ? '' : ' ghost'}`, onclick: () => start(pickAny(), 'random') }, t('random')),
      h('span', { class: 'credits big' }, `${t('credits')} `, scNum(wallet.get(), 16)),
      h('span', { class: 'note' }, `${t('played')} ${st.played} · ${t('won')} ${st.won} · ${t('streak')} ${st.streak} · ${t('best')} ${st.best} · ${t('accuracy')} ${acc}`)),
    h('div', { class: 'poolnote' }, `${t('poolNote', { n: poolN })} · ${t('poolDiff', { a: range[0], b: range[1] })}`));
}

// ------------------------------------------------------------------ picker modal
const dlg = h('dialog', { class: 'picker' });
document.body.append(dlg);

function openPicker(kind, apply, slot) {
  const multi = kind === 'creation';
  const all = D[kind].filter(e => e.id != null).sort((a, b) => (b.real !== false) - (a.real !== false));
  const used = kind === 'awakener' ? new Set(sel.slots.map(s => s.awk).filter(Boolean)) : new Set();
  let q = '', f1 = '', f2 = '', fk = '';
  const f1key = { awakener: 'realm', wheel: 'realm', key: 'realm', creation: 'kind' }[kind];
  const f2key = { awakener: 'role', wheel: 'rarity', creation: 'rarity' }[kind];
  const opts = (key) => key ? [...new Set(all.map(e => e[key]).filter(Boolean))].sort() : [];
  const grid = h('div', { class: 'pgrid' });
  // 只挡「同一名唤醒体已经占到别的卡位」：一个人不能同时在两个位置。
  // 界域不再做过滤——以前选了深海之后，其它界域的唤醒体整片变灰，想按自己的
  // 思路先摆位置都做不到，反而像 bug。现在四大界域随便选。
  const usedOther = (id) => sel.slots.some((s, i) => i !== slot && s.awk != null && String(s.awk) === String(id));
  const blockWhy = (e) => (kind === 'awakener' && usedOther(e.id) ? t('wsRealmUsed') : '');
  // 分批铺卡片：造物有 390 件，一次性铺开会同时发 390 个图片请求，
  // 手机上一个域名只有 6 条连接，表现就是「点开面板一片白、等半分钟」。
  // 先铺 60 张，滚到底再续 60 张。
  const PAGE = 60;
  let items = [];
  let shown = 0;
  const more = h('button', {
    type: 'button', class: 'btn ghost sm', style: 'grid-column:1/-1',
    onclick: () => { grow(); if (shown < items.length) grid.append(more); },
  }, t('loadMore'));
  const cell = (e) => {
    const id = String(e.id);
    const chosen = multi && sel.relics.includes(id);
    const full = multi && !chosen && sel.relics.length >= fillRelics().length;
    const why = blockWhy(e);
    const btn = h('button', { type: 'button', class: `pitem${chosen ? ' chosen' : ''}${used.has(id) ? ' used' : ''}${why ? ' blocked' : ''}`, disabled: full || Boolean(why), title: why || e.en,
      onclick: why ? null : () => {
        if (multi) { toggleRelic(id); return; }
        apply(id); persist(); closeModal(dlg); render();
      } }, imgEl(e.img, nameOf(e)), h('small', {}, nameOf(e)),
      why ? h('em', { class: 'decoy' }, why) : (e.real === false ? h('em', { class: 'decoy' }, t('decoy')) : null));
    btn.__id = id;
    return btn;
  };
  // 造物多选：只改这一格的状态和计数，不重画整张网格（重画会把滚动位置弹回顶部）
  const toggleRelic = (id) => {
    const max = fillRelics().length;
    sel.relics = sel.relics.includes(id) ? sel.relics.filter(x => x !== id) : [...sel.relics, id];
    persist();
    count.textContent = `${sel.relics.length}/${max}`;
    const pick = new Set(sel.relics);
    for (const el of grid.children) {
      if (!el.__id) continue;
      const on = pick.has(el.__id);
      el.classList.toggle('chosen', on);
      if (!el.classList.contains('blocked')) el.disabled = !on && sel.relics.length >= max;
    }
  };
  const grow = () => {
    const end = Math.min(shown + PAGE, items.length);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) frag.append(cell(items[i]));
    grid.append(frag);
    shown = end;
    if (shown >= items.length) more.remove();
    else more.textContent = `${t('loadMore')}（${shown}/${items.length}）`;
  };
  const draw = () => {
    // 固有造物已经在题面给出去了，选择器里不再列出来
    items = all.filter(e => (!multi || !isInnateRelic(e.id))
      && (!q || ((e.zh || '') + (e.en || '')).toLowerCase().includes(q)) && (!f1 || e[f1key] === f1) && (!f2 || e[f2key] === f2) && (!fk || (e.kw || []).includes(fk)));
    shown = 0;
    grid.replaceChildren();
    if (!items.length) { grid.append(h('p', { class: 'note' }, t('noMatch'))); return; }
    grow();
    if (shown < items.length) grid.append(more);
  };
  const sub = (key, label, set) => {
    const o = opts(key);
    return o.length ? h('select', { onchange: ev => { set(ev.target.value); draw(); } }, h('option', { value: '' }, label), o.map(x => h('option', { value: x }, x))) : null;
  };
  const kwSelect = () => {
    const have = new Set(all.flatMap(e => e.kw || []));
    const ks = KW.list.filter(k => have.has(k.s));
    if (!ks.length) return null;
    return h('select', { title: t('allKw'), onchange: ev => { fk = ev.target.value; draw(); } }, h('option', { value: '' }, t('allKw')),
      Object.entries(KW_TYPE).map(([ty, label]) => { const g = ks.filter(k => k.t === ty); return g.length ? h('optgroup', { label: lang.cur === 'en' ? KW_TYPE_EN[ty] : label }, g.map(k => h('option', { value: k.s }, lang.cur === 'en' ? k.e : k.n))) : null; }));
  };
  const count = h('span', { class: 'note' }, multi ? `${sel.relics.length}/${fillRelics().length}` : '');
  // 唤醒体选择器不再挂界域提示：四个界域都能选，挂着「只能再选深海或混沌」只会误导
  const realmNote = null;
  dlg.replaceChildren(
    h('div', { class: 'phead' }, h('b', {}, `${kindName(kind)}`), count,
      h('input', { type: 'search', placeholder: t('searchName'), oninput: ev => { q = ev.target.value.trim().toLowerCase(); draw(); } }),
      sub(f1key, f1key === 'kind' ? t('allType') : t('allRealm'), v => { f1 = v; }), sub(f2key, f2key === 'role' ? t('allRole') : t('allRarity'), v => { f2 = v; }),
      kwSelect(),
      !multi ? h('button', { class: 'btn ghost sm', onclick: () => { apply(null); persist(); closeModal(dlg); render(); } }, t('clear')) : null,
      h('button', { class: 'btn sm', onclick: () => { closeModal(dlg); render(); } }, multi ? t('done') : t('close'))),
    realmNote,
    grid);
  draw();
  openModal(dlg);
}

// ------------------------------------------------------------------ render
// ------------------------------------------------------------------ 配队规则说明（让圈外人也能玩）
function teamRules() {
  const R = lang.cur === 'en' ? {
    t: 'Morimens team rules (for newcomers)',
    items: [
      'Realm (阵营/界域): each Awakener belongs to one of 4 realms — Chaos, Caro (Flesh), Aequor (Deep Sea), Ultra.',
      'Teaming: an Awakener can only team with its own realm plus Chaos; Chaos teams with any realm. (Reference only — this game does not block picks by realm, any Awakener can be placed anywhere.)',
      'A team = 4 Awakeners + 1 Keeper (you, who carries a Key Token skill).',
      'Each Awakener: 2 Wheels of Destiny (weapons) + 1 Covenant set (3/6-piece bonuses) + Command cards (Strike/Defense/Skill).',
      'Aliemus (狂气): the ultimate energy bar. When full, the Awakener unleashes Exalt (狂气爆发) — it costs Aliemus, NOT Arithmetica.',
      'Arithmetica (算力): spent to play command cards each turn.',
      'Relics (造物): items collected during the run.',
      'Damage sources in the report: Keeper dmg (your key), Tentacle, Counter, Strength, Corrosion/Poison — these help you identify the build.',
    ],
  } : {
    t: '忘却前夜配队规则（给圈外人）',
    items: [
      '界域（阵营）：每个唤醒体属于四大界域之一——混沌、血肉、深海、超维。',
      '组队：除「混沌」外，唤醒体一般只与「自身界域 + 混沌」组队；「混沌」可与任意界域组队。（这只是背景知识——选卡位不按界域限制，四个界域随便摆）',
      '一支队伍 = 4 名唤醒体 + 1 名守密人（你，携带钥令技能）。',
      '每个唤醒体：2 个命轮（武器）+ 1 套密契（3/6 件套效果）+ 指令卡（打击/防御/技能）。',
      '狂气：大招能量条，集满触发「狂气爆发」——消耗的是狂气，不是算力。',
      '算力：每回合打出指令卡所消耗的资源。',
      '造物：探索过程中获得的道具/遗物。',
      '战报里的伤害来源：守密人伤害（你的钥令）、触腕、反击、力量、侵蚀/中毒——它们能帮你锁定队伍构筑。',
    ],
  };
  return h('details', { class: 'bskills teamrules' },
    h('summary', {}, R.t),
    h('ul', {}, R.items.map(x => h('li', {}, x))));
}

function render() {
  root.replaceChildren(...[
    profilePanel(),
    controls(),
    likeBar(),
    reportPanel(),
    cluePanel(),
    h('section', { class: 'card board' },
      h('h3', {}, `${t('boardTitle')} · ${LEVELS[level].name()}${t('boardLevel', { l: '' })}`),
      h('div', { class: 'slots' }, LETTERS.map((_, k) => slotCard(k))),
      swapFrom != null
        ? h('p', { class: 'note swapnote' }, t('swapHint', { l: LETTERS[swapFrom] }))
        : null,
      teamExtras(),
      h('div', { class: 'actions' },
        finished ? null : h('button', { class: 'btn', onclick: submit }, `${t('submit')}${t('submitLeft', { n: MAX_TRIES - history.length })}`),
        finished ? null : wrongSlots().length
          ? h('button', { class: 'btn ghost', onclick: clearWrong }, `${t('clearWrong')}（${wrongSlots().length}）`)
          : null,
        finished ? null : h('button', { class: 'btn ghost', onclick: () => { sel = newSel(); fb = {}; swapFrom = null; persist(); render(); } }, t('reset')))),
    teamRules(),
    historyPanel(),
    failedPanel(),
    finished ? answerPanel() : null,
  ].filter(Boolean));
}

// 云端档案不再挡首屏：先用本机存档把界面画出来，云端合并回来再补一次。
// 以前这里是 await account.ready()，最长要等 4.5 秒，白白一段「载入中」。
account.ready()
  .then((merged) => { if (merged && puzzle && !finished) render(); })
  .catch(() => {});

// 每日题的分片请求在启动时就发出去了（见文件开头的 firstPuzzle），这里只是等它回来；
// 万一那一次失败了（手机切网、边缘挂起连接），再顺次重试一次。
await start(firstPuzzle ? firstPuzzle.catch(() => dailyPuzzle()) : dailyPuzzle(), 'daily');

// 扩充题库（puzzles-extra / puzzles-more）不再整包预载：
// 现在题库是「索引 + 分片」，抽到哪道才取哪片，见 js/bank.js。

// 工坊 / 好友分享的题目：detective.html?p=ZJ2-...
const sharedCode = new URLSearchParams(location.search).get('p');
if (sharedCode) {
  const p = shareCode.dec(sharedCode);
  if (p && p.team) {
    p.custom = true;
    p.id = p.id || 'custom-' + Date.now().toString(36);
    start(p, 'random');
  } else {
    toast('题目代码无法解析');
  }
}

// 上次没发完的赞，进页面后接着发。
// 延后 1 秒：HTTP/1.1 下一个域名只有 6 个连接，这条预热请求（只为了同步
// 「我赞过谁 / 还剩几次」）不该跟首屏的图片抢连接。
setTimeout(() => likes.resume(), 1000);

// 队列里的赞发出去了：服务端回来的权威计数与额度会改本地缓存，重画一下赞数条
// （数字和「排队发送中」任一变化就重画，否则发完了提示会赖着不走）
let likeSaid = -1;
document.addEventListener('zjtt:likes', () => {
  const cur = puzzle && String(puzzle.id || '');
  if (!cur || !puzzle.custom) return;
  const n = Number(likes.cachedCounts()[cur]);
  const q = likes.pending();
  if (n !== likeCount || q !== likeSaid) {
    likeCount = Number.isNaN(n) ? likeCount : n;
    likeSaid = q;
    render();
  }
});
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

