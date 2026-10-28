// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持顶层 await，顺序即依赖顺序。

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
    pickAwakener: '选择唤醒体', pickWheel: '选择命轮', pickCovenant: '选择密契', pickKey: '选择钥令', pickCreation: '选择造物',
    searchName: '搜索名称（中/英）', allRealm: '全部阵营', allRole: '全部定位', allRarity: '全部稀有度', allType: '全部类型',
    allKw: '全部关键词', clear: '清空', close: '关闭', done: '完成', add: '添加', noMatch: '没有匹配项',
    decoy: '未上榜',
    hintRealm: '提示阵营', hintRole: '提示定位', hintLv: '提示等级', hintKey: '钥令阵营',
    acctTag: '账号', guestTag2: '', lvTag: '等级', brkTag: '内在灵格',
    clueTitle: '线索台', clueNote: '花银芯解锁，本局内一直有效',
    clueBrk: '内在灵格', cluePot: '灵塑等级',
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
    pickAwakener: 'Pick awakener', pickWheel: 'Pick wheel', pickCovenant: 'Pick covenant', pickKey: 'Pick key', pickCreation: 'Pick relic',
    searchName: 'Search (CN/EN)', allRealm: 'All realms', allRole: 'All roles', allRarity: 'All rarities', allType: 'All types',
    allKw: 'All keywords', clear: 'Clear', close: 'Close', done: 'Done', add: 'Add', noMatch: 'No match',
    decoy: 'unseen',
    hintRealm: 'Reveal realm', hintRole: 'Reveal role', hintLv: 'Reveal level', hintKey: 'Key realm',
    acctTag: 'Account', guestTag2: '', lvTag: 'Lv', brkTag: 'Gnostic Potential',
    clueTitle: 'Clue desk', clueNote: 'Spend Silver Core — stays unlocked for this puzzle',
    clueBrk: 'Gnostic Potential', cluePot: 'Potency',
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
function t(key, vars = {}) {
  let s = (I18N[lang.cur] && I18N[lang.cur][key]) ?? I18N.zh[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
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
  const dictP = prefetched
    || (boot ? boot.then(j => j.dict) : fetch('data/dictionary.json').then(r => r.json()));
  const kwP = kwPrefetched || (boot ? boot.then(j => j.kw) : null);
  const [D] = await Promise.all([dictP, loadKeywords(kwP)]);
  const idx = {};
  for (const k of Object.keys(KINDS)) idx[k] = new Map(D[k].filter(e => e.id != null).map(e => [String(e.id), e]));
  return { D, idx };
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
return { $, $$, store, lang, t, nameOf, h, emptyState, toast, syncCreditsDom, markDirty, STAT0, statsOf, parseColor, solidOf, themeVars, applyThemeSkin, upgradeThemeImage, authUser, KINDS, SC_ICON, scIcon, scNum, wallet, failedBank, REPLAY, unlocked, shareCode, KIND_EN, kindName, REALM_CHAOS, realmAnchor, realmFits, REALM_EN_ZH, realmName, loadDict, imgEl, wan, RARITY_CLASS, nav, KW, loadKeywords, KW_TYPE, plain, slugsIn, kwChip, renderText, kwIcon, showKwPop };
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
// 把「积分 / 解锁 CG / 失败题库 / 推理记录 / 工坊导入的战报 / 偏好唤醒体 / 背景主题」
// 打包成一份文档存到自己的后端（server/worker.js 的 accounts 表），换设备登录即可恢复。
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
  };
}

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
  snapshot, apply, mergeDoc, pathOf,
};
return { CAP, snapshot, apply, mergeDoc, pull, push, schedule, sync, ready, record, history, lastSync, pendingState, forget, account };
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

// ---- js/theme.js
const m_theme = await (async () => {
const { store, unlocked, toast, t, markDirty, themeVars } = m_common;
// CG 背景主题：解锁某张 CG 后，可把它设成全站背景，并按这张图的主色重排 UI 配色。
// 配色在构建期已经算好（scripts/build_themes.py → data/themes.json），运行时只做变量注入。


let THEMES = null;
let GALLERY = null;
const CACHE_KEY = 'theme';

async function loadJson(path) {
  const r = await fetch(path, { cache: 'force-cache' });
  if (!r.ok) throw new Error(path);
  return r.json();
}

async function themeLib() {
  if (!THEMES) THEMES = await loadJson('data/themes.json');
  return THEMES;
}

async function galleryLib() {
  if (!GALLERY) {
    const g = await loadJson('data/gallery.json');
    GALLERY = { list: g.items || [], by: new Map((g.items || []).map((i) => [i.id, i])) };
  }
  return GALLERY;
}

const activeTheme = () => store.get(CACHE_KEY, null);

// 把主题写进 :root 的行内样式（行内优先级最高，能盖掉 prefers-color-scheme 的媒体查询）
function paint(th) {
  const root = document.documentElement;
  if (!th || !th.vars) {
    root.removeAttribute('data-themed');
    ['--bg', '--panel', '--panel2', '--panel-solid', '--panel2-solid', '--line', '--text', '--dim', '--accent', '--gold', '--theme-img']
      .forEach((k) => root.style.removeProperty(k));
    document.body.classList.remove('themed');
    return;
  }
  themeVars(th);
}

function applyStored() {
  const th = activeTheme();
  if (th && th.vars) paint(th);
}

async function setTheme(id) {
  if (!id) return null;
  if (!unlocked.has(id)) throw new Error('locked');
  const [themes, gal] = await Promise.all([themeLib(), galleryLib()]);
  const vars = themes[id];
  const item = gal.by.get(id);
  if (!vars || !item) throw new Error('missing');
  // 背景铺满整屏，必须用 1920 宽的大图；没有大图时才退回 900 缩略图
  const img = item.big || item.f;
  // 先把新背景解出来再换变量，避免整屏先闪一张空白
  await new Promise((res) => {
    const im = new Image();
    im.onload = im.onerror = () => res();
    im.src = new URL(img, document.baseURI).href;
  });
  const th = { id, n: item.t, img, dark: vars.dark, vars };
  store.set(CACHE_KEY, th);
  markDirty('theme');
  paint(th);
  return th;
}

function clearTheme() {
  store.del(CACHE_KEY);
  markDirty('theme');
  paint(null);
}

// 典藏馆大图里的「设为背景」按钮用得到
function themeButton(id, { onChange } = {}) {
  const cur = activeTheme();
  if (cur && cur.id === id) {
    return {
      label: t('thmOn'), off: true,
      run: () => { clearTheme(); toast(t('thmCleared')); if (onChange) onChange(null); },
    };
  }
  return {
    label: t('thmSet'), off: false,
    run: async () => {
      try {
        const th = await setTheme(id);
        toast(t('thmApplied', { n: th.n }));
        if (onChange) onChange(th);
      } catch (e) {
        toast(e.message === 'locked' ? t('thmLocked') : t('thmFail'));
      }
    },
  };
}
return { themeLib, galleryLib, activeTheme, paint, applyStored, setTheme, clearTheme, themeButton };
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

// ---- js/profile.js
const m_profile = await (async () => {
const { $, h, store, nav, t, lang, wallet, failedBank, unlocked, loadDict, imgEl, nameOf, toast, markDirty, REPLAY, statsOf, scIcon, emptyState } = m_common;
const { auth, openLogin, avatarLib, nameOfMail } = m_auth;
const { account, CAP } = m_account;
const { checkinBar } = m_checkin;
const { galleryLib } = m_theme;
const likes = m_likes;
// 个人中心：账号资料、头像、偏好唤醒体、推理记录、工坊战报、典藏进度、云端同步







document.body.prepend(nav('profile'));
const root = $('#app');

const stat = () => statsOf();
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const day = (iso) => (iso ? String(iso).slice(0, 10) : '—');
const stamp = (ms) => {
  const d = new Date(Number(ms) || 0);
  if (!Number.isFinite(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

let DICT = null;
let GAL = [];

const awakOf = (tid) => {
  const e = DICT && DICT.awakener ? DICT.awakener.find((x) => String(x.id) === String(tid)) : null;
  return e || null;
};

function meter(label, value, sub) {
  return h('div', { class: 'statbox' }, h('small', {}, label), h('b', {}, value), sub ? h('small', { class: 'dim' }, sub) : null);
}

// ------------------------------------------------------------------ 未登录：游客
function guestView() {
  const hists = account.history().length;
  return h('section', { class: 'card authhero' },
    h('div', { class: 'authart' }, h('img', { src: 'assets/avatars/cg-CG_C201_001.webp', alt: '' })),
    h('div', {},
      h('h2', {}, t('pfGuestTitle')),
      h('p', { class: 'note' }, t('pfGuestSub')),
      h('div', { class: 'pfstats four' },
        meter(t('credits'), [scIcon(18), ` ${wallet.get()}`]),
        meter(t('pfPlayed'), stat().played),
        meter(t('pfUnlockedCg'), unlocked.list().length),
        meter(t('pfHistTitle'), hists)),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', onclick: () => openLogin(() => location.reload()) }, t('pfLoginBtn')),
        h('a', { class: 'btn ghost', href: 'detective.html' }, t('navGame')))));
}

// ------------------------------------------------------------------ 已登录：账号概览
function hero(u) {
  const sync = account.lastSync();
  return h('section', { class: 'card pfhero' },
    h('img', { class: 'pfavatar', src: auth.avatarOf(u), alt: '', width: 96, height: 96 }),
    h('div', { class: 'pfmeta' },
      h('h2', {}, u.name || t('pfNoName')),
      h('p', { class: 'note' }, `@${nameOfMail(u.mail)} · ${t('pfJoined')} ${day(u.created)}`),
      h('p', { class: 'note dim', id: 'pf-sync-line' },
        sync ? t('pfLastSync', { t: stamp(sync) }) : t('pfSyncNever'))),
    h('div', { class: 'pfstats' },
      meter(t('credits'), [scIcon(18), ` ${wallet.get()}`]),
      meter(t('pfPlayed'), stat().played, `${t('pfWinRate')} ${pct(stat().won, stat().played)}%`),
      meter(t('pfUnlockedCg'), `${unlocked.list().length}`),
      meter(t('pfFailed'), failedBank.list().length)));
}

// ------------------------------------------------------------------ 资料与头像
const isLocalAvatar = (s) => /^assets\//.test(String(s || ''));

function editBox(u) {
  let picked = u.avatar || '';
  const nameEl = h('input', { type: 'text', value: u.name || '', maxlength: 20, placeholder: t('pfNamePh') });
  const urlEl = h('input', { type: 'text', value: u.avatar && !isLocalAvatar(u.avatar) ? u.avatar : '', placeholder: 'https://…' });
  const preview = h('img', { class: 'pfavatar small', src: auth.avatarOf(u), alt: '' });
  const grid = h('div', { class: 'avgv' });
  const tabs = h('div', { class: 'avtabs' });
  const count = h('small', { class: 'note' });
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
    count.textContent = t('pfAvatarN', { n: list.length });
    tabs.querySelectorAll('.avtab').forEach((b) => b.classList.toggle('on', b.dataset.g === cur));
  };

  avatarLib().then((lib) => {
    all = lib.items || [];
    const mk = (g, label) => h('button', {
      type: 'button', class: `avtab${g === cur ? ' on' : ''}`, 'data-g': g,
      onclick: () => { cur = g; drawGrid(); },
    }, label);
    tabs.replaceChildren(
      mk('all', t('pfAvatarAll', { n: all.length })),
      ...(lib.groups || []).map((gp) => mk(gp.k, lang.cur === 'en' ? gp.en : gp.n)));
    drawGrid();
    if (!picked && all[0]) setPick(all[0].src);
  });

  urlEl.addEventListener('input', () => {
    const v = urlEl.value.trim();
    if (v) setPick(v);
  });

  const saveBtn = h('button', { class: 'btn', onclick: save }, t('save'));
  async function save() {
    saveBtn.disabled = true;
    try {
      const avatar = (urlEl.value.trim() || picked || '').slice(0, 250);
      await auth.update({ name: nameEl.value.trim() || u.name, avatar });
      toast(t('pfSaved'));
      render();
    } catch (e) {
      // auth.update 会按注册同一套规则校验昵称（长度 / 字符 / 归一化）
      const why = {
        tooShort: '昵称至少 2 个字', tooLong: '昵称最多 20 个字',
        badChar: '昵称只能用中文、字母、数字和 _ - ·（不要空格和标点）',
      };
      toast(`${t('pfSaveFail')}：${why[e.message] || e.message}`);
    } finally {
      saveBtn.disabled = false;
    }
  }

  return h('section', { class: 'card' },
    h('h3', {}, t('pfEdit')),
    h('div', { class: 'pfeditrow' },
      preview,
      h('div', { class: 'pfeditflds' },
        h('label', { class: 'fld' }, h('small', {}, `${t('pfNick')}（${t('pfNickNote')}）`), nameEl),
        h('label', { class: 'fld' }, h('small', {}, t('pfAvatarUrl')), urlEl))),
    h('div', { class: 'avpick' },
      h('div', { class: 'avpickhead' }, h('b', {}, t('pfAvatarPick')), count),
      tabs,
      grid),
    h('div', { class: 'actions' },
      saveBtn,
      h('button', {
        class: 'btn ghost',
        onclick: () => { auth.logout(); account.forget(); toast(t('pfLoggedOut')); setTimeout(() => location.reload(), 400); },
      }, t('pfLogout'))));
}

// ------------------------------------------------------------------ 偏好唤醒体
function favBox() {
  const prof = store.get('profile', { favs: [] });
  let favs = new Set((prof.favs || []).map(String));
  const list = (DICT ? DICT.awakener : []).filter((a) => a.id != null);
  const counter = h('span', { class: 'note' }, `${t('pfFavPicked')} ${favs.size}`);
  const grid = h('div', { class: 'favgrid' });

  const paint = () => {
    grid.replaceChildren(...list.map((a) => {
      const on = favs.has(String(a.id));
      return h('button', {
        type: 'button', class: `fav${on ? ' on' : ''}`, title: nameOf(a),
        onclick: () => {
          const id = String(a.id);
          if (favs.has(id)) favs.delete(id); else favs.add(id);
          paint();
        },
      }, imgEl(a.img, nameOf(a)), h('small', {}, nameOf(a)));
    }));
    counter.textContent = `${t('pfFavPicked')} ${favs.size}`;
  };
  paint();

  const save = () => {
    prof.favs = [...favs];
    store.set('profile', prof);
    // 偏好变了，之前的筛选索引作废
    Object.keys(localStorage).filter((k) => k.startsWith('zjtt:favIdx:')).forEach((k) => localStorage.removeItem(k));
    markDirty('favs');
    account.schedule(400);
    toast(t('pfFavSaved'));
    render();
  };

  return h('section', { class: 'card', id: 'fav' },
    h('h3', {}, t('pfFavTitle'), ' ', counter),
    h('p', { class: 'note' }, t('pfFavNote')),
    grid,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', onclick: save }, t('pfFavSave')),
      h('button', { class: 'btn ghost', onclick: () => { favs = new Set(); paint(); } }, t('pfFavClear'))));
}

// ------------------------------------------------------------------ 推理记录
function histBox() {
  const list = account.history();
  const modeName = (m) => (m === 'daily' ? t('pfModeDaily') : m === 'random' ? t('pfModeRandom') : t('pfModeCustom'));
  const rows = list.slice(0, 40).map((e) => h('div', { class: 'hrow' },
    h('span', { class: 'htime' }, stamp(e.at)),
    h('span', { class: 'hname' }, e.ti || e.i || '—'),
    h('span', { class: 'chip dim' }, modeName(e.m)),
    h('span', { class: 'chip' }, `${t('lvShort', { n: e.l || 1 })}`),
    h('span', { class: `hres ${e.w ? 'win' : 'lose'}` }, e.w ? `${t('pfWinTag')} ${e.g || ''}` : `${t('pfLoseTag')} ${e.g || ''}`),
    h('span', { class: 'hsc' }, `${e.sc ?? '—'}`),
    e.u ? h('a', { class: 'link', href: REPLAY.json(e.u), target: '_blank', rel: 'noopener' }, t('replayTitle')) : h('span', {})));
  return h('section', { class: 'card' },
    h('h3', {}, `${t('pfHistTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('pfHistNote', { n: CAP.hist })),
    list.length
      ? h('div', { class: 'hlist' }, rows)
      : emptyState(t('pfHistEmpty')));
}

// ------------------------------------------------------------------ 工坊战报
function impBox() {
  const list = store.get('myPuzzles', []);
  const counts = likes.cachedCounts();
  const opened = (p) => (p.uuid ? REPLAY.json(p.uuid) : '');
  return h('section', { class: 'card' },
    h('h3', {}, `${t('pfImpTitle')} · ${list.length}`),
    h('p', { class: 'note' }, t('pfImpNote')),
    list.length ? h('div', { class: 'implist' }, list.map((p, i) => {
      const team = (p.team || []).filter((a) => a.tid);
      return h('div', { class: 'imp' },
        h('div', { class: 'imphead' },
          h('b', {}, p.title || p.id),
          counts[String(p.id)] ? h('span', { class: 'likebadge' }, `❤ ${counts[String(p.id)]}`) : null,
          h('small', { class: 'note' }, `${team.length} ${t('pfImpTeam')} · ${(p.relics || []).length} ${t('relicLabel')} · ${stamp(p.at)}`)),
        h('div', { class: 'improw' }, team.map((a) => {
          const e = awakOf(a.tid);
          return h('span', { class: 'impawk', title: e ? nameOf(e) : a.tid },
            imgEl(e && e.img, e ? nameOf(e) : a.tid), h('small', {}, e ? nameOf(e) : a.tid));
        })),
        h('div', { class: 'impact' },
          h('a', { class: 'link', href: `detective.html?p=${encodeURIComponent(shareCodeOf(p))}` }, t('pfImpPlay')),
          opened(p) ? h('a', { class: 'link', href: opened(p), target: '_blank', rel: 'noopener' }, t('pfImpReplay')) : null,
          h('button', { class: 'link', onclick: () => { const l = store.get('myPuzzles', []); l.splice(i, 1); store.set('myPuzzles', l); markDirty('mine'); account.schedule(400); render(); } }, t('pfImpDel'))));
    })) : emptyState(t('pfImpEmpty')));
}

// 工坊里同一套分享码逻辑（避免循环依赖，这里内联一份最小实现）
function shareCodeOf(d) {
  const payload = {
    v: 2, id: d.id, title: d.title, uuid: d.uuid,
    rounds: d.rounds, cards: d.cards, maxBout: d.maxBout, deathResist: d.deathResist,
    hp: d.hp, left: d.left, playerDmg: d.playerDmg, score: d.score, diff: d.diff, diffScore: d.diffScore,
    key: d.key, relics: d.relics, team: d.team,
    h: (Array.isArray(d.hints) ? d.hints : []).map(c => [c.n || '', c.v || '', c.c || 5]),
  };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 4096) bin += String.fromCharCode(...bytes.subarray(i, i + 4096));
  return 'ZJ2-' + btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ------------------------------------------------------------------ 典藏进度
function cgBox() {
  const got = new Set(unlocked.list());
  const items = GAL || [];
  const total = items.length || 438;
  const recent = [...got].slice(-8).reverse();
  return h('section', { class: 'card' },
    h('h3', {}, t('pfCgTitle')),
    h('p', { class: 'note' }, t('pfCgNote', { a: got.size, b: total })),
    h('div', { class: 'prog' }, h('div', { class: 'progbar', style: `width:${Math.min(100, got.size / total * 100)}%` })),
    recent.length ? h('div', { class: 'cgmini' }, recent.map((id) => {
      const it = items.find((x) => x.id === id);
      return h('a', { class: 'cgm', href: 'gallery.html', title: it ? nameOf(it) : id }, imgEl(it && it.f, it ? nameOf(it) : id));
    })) : null);
}

// ------------------------------------------------------------------ 存档与同步
function storeBox(u) {
  const syncBtn = h('button', {
    class: 'btn ghost sm',
    onclick: async () => {
      syncBtn.disabled = true;
      const old = syncBtn.textContent;
      syncBtn.textContent = t('pfSyncing');
      const r = await account.push();
      syncBtn.textContent = r.ok ? t('pfSyncOk') : t('pfSyncFail');
      setTimeout(() => { syncBtn.textContent = old; syncBtn.disabled = false; render(); }, 1400);
    },
  }, t('pfSyncNow'));

  return h('section', { class: 'card' },
    h('h3', {}, t('pfSyncTitle')),
    h('p', { class: 'note' }, u ? t('pfAccNote') : t('pfLocalNote')),
    h('div', { class: 'actions' },
      u ? syncBtn : null,
      h('button', {
        class: 'btn ghost danger',
        onclick: async () => {
          if (!confirm(t('pfClearAsk'))) return;
          ['credits', 'cg', 'failed', 'stats', 'myPuzzles', 'profile', 'hist'].forEach((k) => store.del(k));
          if (u) await account.push().catch(() => {});
          toast(t('pfCleared'));
          setTimeout(() => location.reload(), 500);
        },
      }, t('pfClear'))));
}

function render() {
  const u = auth.user;
  const kids = [
    h('section', { class: 'pagehead' }, h('h1', {}, t('pfTitle')), h('p', { class: 'note' }, t('pfSub'))),
    u ? hero(u) : guestView(),
    h('section', { class: 'card ckcard' }, checkinBar('wide', () => render())),
    u ? editBox(u) : null,
    u ? favBox() : null,
    u ? histBox() : null,
    u ? impBox() : null,
    u ? cgBox() : null,
    storeBox(u),
  ].filter(Boolean);
  // 顶栏里也有头像和昵称，一起刷新
  const old = document.querySelector('.top');
  if (old) { old.remove(); document.body.prepend(nav('profile')); }
  root.replaceChildren(...kids);
  if (location.hash === '#fav') {
    const el = document.getElementById('fav');
    if (el) el.scrollIntoView({ block: 'start' });
  }
}

// 先把云端档案合并下来（登录态才有效），再渲染
await account.ready();
try { GAL = (await galleryLib()).list || []; } catch { GAL = []; }
try { DICT = (await loadDict()).D; } catch { DICT = null; }
render();
window.__pfRender = render;   // 供 scripts/preview.mjs 的交互探针重绘

// 我的题目：拉一次赞数（有新赞折算银芯，结果下次渲染就能看到徽标）
likes.syncMine(store.get('myPuzzles', [])).then((r) => {
  if (r.ok && r.gain > 0) { render(); toast(t('likeGain', { n: r.gain })); }
}).catch(() => {});
likes.resume();
return {  };
})();

