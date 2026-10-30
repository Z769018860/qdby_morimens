(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/duel/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 生成，请勿手改。
// 源：data/duel-cards.json + duel-packs.json + duel-lore.json + duel-art.json + assets/duel/*.webp
const CARDS = {"m01":{"k":"M","id":"m01","n":"24","r":"chaos","rar":"SR","lv":4,"atk":1800,"def":1200,"role":"伤害型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m02":{"k":"M","id":"m02","n":"凯蒂古拉","r":"chaos","rar":"SR","lv":5,"atk":2100,"def":1500,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m03":{"k":"M","id":"m03","n":"潘狄娅","r":"chaos","rar":"SR","lv":4,"atk":1700,"def":1000,"role":"伤害型","fx":[{"k":"burn","v":500}],"text":"①：此卡召唤成功时，给予对方 500 点伤害。"},"m04":{"k":"M","id":"m04","n":"诺缔拉","r":"chaos","rar":"R","lv":3,"atk":1200,"def":1900,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m05":{"k":"M","id":"m05","n":"莉莉","r":"chaos","rar":"R","lv":3,"atk":800,"def":2000,"role":"防御型","fx":[{"k":"onDestroyDraw","v":1}],"text":"①：此卡被战斗破坏送去墓地时，自己抽 1 张牌。"},"m06":{"k":"M","id":"m06","n":"哈姆林","r":"chaos","rar":"SR","lv":4,"atk":1600,"def":1400,"role":"辅助型","fx":[{"k":"aura","r":"chaos","v":300}],"text":"①：只要此卡在场上表侧表示，自己场上其他「混沌」怪兽攻击力上升 300。"},"m07":{"k":"M","id":"m07","n":"珈伦","r":"chaos","rar":"R","lv":3,"atk":1300,"def":1300,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"chaos","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「混沌」魔法卡加入手牌。"},"m08":{"k":"M","id":"m08","n":"塔薇","r":"chaos","rar":"SR","lv":5,"atk":2000,"def":1600,"role":"伤害型","fx":[{"k":"twin"}],"text":"①：此卡在同一个战斗阶段中可以攻击 2 次。"},"m09":{"k":"M","id":"m09","n":"莱克","r":"chaos","rar":"SR","lv":4,"atk":1500,"def":1500,"role":"辅助型","fx":[{"k":"discardOpp","v":1}],"text":"①：此卡召唤成功时，对方随机丢弃 1 张手牌。"},"m10":{"k":"M","id":"m10","n":"宁菲亚","r":"chaos","rar":"SR","lv":6,"atk":2400,"def":1800,"role":"伤害型","fx":[{"k":"drain","v":100}],"text":"①：此卡给予对方战斗伤害时，自己回复那个数值的生命值。"},"m11":{"k":"M","id":"m11","n":"薇薇安","r":"chaos","rar":"R","lv":4,"atk":1400,"def":1600,"role":"辅助型","fx":[{"k":"recall","f":"spell","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 张魔法卡加入手牌。"},"m12":{"k":"M","id":"m12","n":"熔毁·朵尔","r":"chaos","rar":"GR","lv":7,"atk":2700,"def":2100,"role":"辅助型","fx":[{"k":"burn","v":800},{"k":"costLp","v":400}],"text":"①：此卡召唤成功时，给予对方 800 点伤害，自己受到 400 点伤害。"},"m13":{"k":"M","id":"m13","n":"蚀灭·萝坦","r":"chaos","rar":"SR","lv":5,"atk":2000,"def":1400,"role":"伤害型","fx":[{"k":"onKillAtk","v":300}],"text":"①：此卡战斗破坏对方怪兽时，此卡攻击力永久上升 300。"},"m14":{"k":"M","id":"m14","n":"环行·拉蒙娜","r":"chaos","rar":"R","lv":4,"atk":1300,"def":1700,"role":"辅助型","fx":[{"k":"heal","v":800}],"text":"①：此卡召唤成功时，自己回复 800 点生命值。"},"m15":{"k":"M","id":"m15","n":"阿格里帕","r":"caro","rar":"SR","lv":4,"atk":1500,"def":1900,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m16":{"k":"M","id":"m16","n":"艾继丝","r":"caro","rar":"R","lv":3,"atk":1100,"def":1500,"role":"辅助型","fx":[{"k":"heal","v":800}],"text":"①：此卡召唤成功时，自己回复 800 点生命值。"},"m17":{"k":"M","id":"m17","n":"杜勒赛因","r":"caro","rar":"SR","lv":6,"atk":2500,"def":1800,"role":"伤害型","fx":[{"k":"onKillAtk","v":300}],"text":"①：此卡战斗破坏对方怪兽时，此卡攻击力永久上升 300。"},"m18":{"k":"M","id":"m18","n":"血链·希洛","r":"caro","rar":"GR","lv":7,"atk":2800,"def":2000,"role":"伤害型","fx":[{"k":"pierce"},{"k":"drain","v":100}],"text":"①：此卡攻击守备表示怪兽时给予贯穿伤害。②：此卡给予对方战斗伤害时，自己回复那个数值的生命值。"},"m19":{"k":"M","id":"m19","n":"希洛","r":"caro","rar":"SR","lv":5,"atk":2200,"def":1500,"role":"伤害型","fx":[{"k":"onDestroyBurn","v":1000}],"text":"①：此卡被破坏送去墓地时，给予对方 1000 点伤害。"},"m20":{"k":"M","id":"m20","n":"菲茵特","r":"caro","rar":"SR","lv":4,"atk":1600,"def":1800,"role":"防御型","fx":[{"k":"turnHeal","v":300}],"text":"①：自己回合开始时，自己回复 300 点生命值。"},"m21":{"k":"M","id":"m21","n":"索蕾尔","r":"caro","rar":"SR","lv":5,"atk":2000,"def":1700,"role":"伤害型","fx":[{"k":"costLp","v":500},{"k":"pumpSelf","v":500}],"text":"①：此卡召唤成功时，自己支付 500 点生命值，此卡攻击力永久上升 500。"},"m22":{"k":"M","id":"m22","n":"尤乌哈希","r":"caro","rar":"SR","lv":4,"atk":1700,"def":1300,"role":"伤害型","fx":[{"k":"burn","v":600},{"k":"costLp","v":300}],"text":"①：此卡召唤成功时，给予对方 600 点伤害，自己受到 300 点伤害。"},"m23":{"k":"M","id":"m23","n":"皮克曼","r":"caro","rar":"R","lv":3,"atk":1000,"def":1600,"role":"辅助型","fx":[{"k":"recall","f":"monster","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 只怪兽加入手牌。"},"m24":{"k":"M","id":"m24","n":"雷娅","r":"caro","rar":"SR","lv":4,"atk":1500,"def":1400,"role":"辅助型","fx":[{"k":"drain","v":50}],"text":"①：此卡给予对方战斗伤害时，自己回复那个数值一半的生命值。"},"m25":{"k":"M","id":"m25","n":"萨尔瓦多","r":"caro","rar":"SR","lv":4,"atk":1200,"def":2000,"role":"防御型","fx":[{"k":"auraDef","v":400}],"text":"①：只要此卡在场上表侧表示，自己场上其他怪兽守备力上升 400。"},"m26":{"k":"M","id":"m26","n":"徐","r":"caro","rar":"SR","lv":6,"atk":2300,"def":2200,"role":"辅助型","fx":[{"k":"lastStand"}],"text":"①：此卡不会被战斗破坏 1 次（每场决斗限 1 次）。"},"m27":{"k":"M","id":"m27","n":"卡拉布","r":"caro","rar":"R","lv":3,"atk":1400,"def":1000,"role":"防御型","fx":[{"k":"heal","v":400}],"text":"①：此卡召唤成功时，自己回复 400 点生命值。"},"m28":{"k":"M","id":"m28","n":"负誓·奥吉尔","r":"caro","rar":"SR","lv":5,"atk":1700,"def":2400,"role":"防御型","fx":[{"k":"guard"},{"k":"auraDef","v":200}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。②：自己场上其他怪兽守备力上升 200。"},"m29":{"k":"M","id":"m29","n":"奥瑞塔","r":"aqua","rar":"SR","lv":4,"atk":1700,"def":1200,"role":"伤害型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m30":{"k":"M","id":"m30","n":"凯刻斯","r":"aqua","rar":"SR","lv":4,"atk":1400,"def":1900,"role":"防御型","fx":[{"k":"spellShield"}],"text":"①：此卡不会成为对方魔法卡的效果对象。"},"m31":{"k":"M","id":"m31","n":"希莱斯特","r":"aqua","rar":"R","lv":3,"atk":1100,"def":1700,"role":"辅助型","fx":[{"k":"heal","v":500},{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己回复 500 点生命值并抽 1 张牌。"},"m32":{"k":"M","id":"m32","n":"克珀珊特","r":"aqua","rar":"SR","lv":5,"atk":1900,"def":2200,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m33":{"k":"M","id":"m33","n":"法洛思","r":"aqua","rar":"SR","lv":4,"atk":1600,"def":1300,"role":"辅助型","fx":[{"k":"bounce","v":1}],"text":"①：此卡召唤成功时，对方场上攻击力最高的 1 只怪兽回到手牌。"},"m34":{"k":"M","id":"m34","n":"戈利亚","r":"aqua","rar":"SR","lv":6,"atk":2400,"def":1700,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m35":{"k":"M","id":"m35","n":"墨菲","r":"aqua","rar":"R","lv":4,"atk":1300,"def":1800,"role":"辅助型","fx":[{"k":"onDestroyDraw","v":1}],"text":"①：此卡被战斗破坏送去墓地时，自己抽 1 张牌。"},"m36":{"k":"M","id":"m36","n":"诞妄·墨菲","r":"aqua","rar":"GR","lv":7,"atk":2600,"def":2300,"role":"辅助型","fx":[{"k":"snipe","v":1}],"text":"①：此卡召唤成功时，破坏对方场上 1 张盖放的魔法·陷阱卡。"},"m37":{"k":"M","id":"m37","n":"弥利亚姆","r":"aqua","rar":"R","lv":3,"atk":1200,"def":1400,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"aqua","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「深海」魔法卡加入手牌。"},"m38":{"k":"M","id":"m38","n":"珊","r":"aqua","rar":"R","lv":4,"atk":1000,"def":2100,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m39":{"k":"M","id":"m39","n":"莫丝","r":"aqua","rar":"R","lv":3,"atk":1400,"def":1000,"role":"伤害型","fx":[{"k":"directDiscard","v":1}],"text":"①：此卡直接攻击给予对方战斗伤害时，对方随机丢弃 1 张手牌。"},"m40":{"k":"M","id":"m40","n":"图鲁","r":"aqua","rar":"SR","lv":5,"atk":2100,"def":1800,"role":"伤害型","fx":[{"k":"atkUpTurn","v":200}],"text":"①：自己回合开始时，此卡攻击力永久上升 200。"},"m41":{"k":"M","id":"m41","n":"庞托斯","r":"aqua","rar":"SR","lv":4,"atk":1500,"def":2000,"role":"防御型","fx":[{"k":"onDestroyBurn","v":600}],"text":"①：此卡被破坏送去墓地时，给予对方 600 点伤害。"},"m42":{"k":"M","id":"m42","n":"威廉","r":"aqua","rar":"UR","lv":7,"atk":2600,"def":2600,"role":"防御型","fx":[{"k":"guard"},{"k":"turnHeal","v":300}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。②：自己回合开始时，自己回复 300 点生命值。"},"m43":{"k":"M","id":"m43","n":"卡茜亚","r":"ultra","rar":"R","lv":3,"atk":1100,"def":1600,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"ultra","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「超维」魔法卡加入手牌。"},"m44":{"k":"M","id":"m44","n":"卡斯托尔","r":"ultra","rar":"SR","lv":4,"atk":1500,"def":1800,"role":"防御型","fx":[{"k":"aura","r":"ultra","v":300}],"text":"①：只要此卡在场上表侧表示，自己场上其他「超维」怪兽攻击力上升 300。"},"m45":{"k":"M","id":"m45","n":"克莱门汀","r":"ultra","rar":"R","lv":4,"atk":1400,"def":1500,"role":"辅助型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m46":{"k":"M","id":"m46","n":"达芙黛尔","r":"ultra","rar":"SR","lv":5,"atk":2000,"def":1500,"role":"伤害型","fx":[{"k":"snipeAttack","v":1}],"text":"①：此卡攻击宣言时，破坏对方场上 1 张盖放的魔法·陷阱卡。"},"m47":{"k":"M","id":"m47","n":"艾瑞卡","r":"ultra","rar":"SR","lv":4,"atk":1300,"def":2000,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m48":{"k":"M","id":"m48","n":"奥尔拉","r":"ultra","rar":"R","lv":3,"atk":1000,"def":1500,"role":"辅助型","fx":[{"k":"recall","f":"trap","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 张陷阱卡加入手牌。"},"m49":{"k":"M","id":"m49","n":"詹金","r":"ultra","rar":"SR","lv":5,"atk":2100,"def":1600,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m50":{"k":"M","id":"m50","n":"莉兹","r":"ultra","rar":"SR","lv":4,"atk":1600,"def":1400,"role":"伤害型","fx":[{"k":"onKillDraw","v":1}],"text":"①：此卡战斗破坏对方怪兽时，自己抽 1 张牌。"},"m51":{"k":"M","id":"m51","n":"波吕克斯","r":"ultra","rar":"SR","lv":6,"atk":2300,"def":1900,"role":"伤害型","fx":[{"k":"negateTrapOnce"}],"text":"①：此卡在场上表侧表示期间，自己可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。"},"m52":{"k":"M","id":"m52","n":"汀克特","r":"ultra","rar":"R","lv":3,"atk":900,"def":1700,"role":"辅助型","fx":[{"k":"bothDraw","v":1}],"text":"①：此卡召唤成功时，双方各抽 1 张牌。"},"m53":{"k":"M","id":"m53","n":"旺达","r":"ultra","rar":"R","lv":4,"atk":1200,"def":1900,"role":"防御型","fx":[{"k":"revive"}],"text":"①：此卡被破坏时，可以回到自己手牌（每场决斗限 1 次）。"},"m54":{"k":"M","id":"m54","n":"阿拉克涅","r":"ultra","rar":"SR","lv":5,"atk":1800,"def":2000,"role":"辅助型","fx":[{"k":"weaken","v":800}],"text":"①：此卡召唤成功时，对方场上攻击力最高的 1 只怪兽攻击力永久下降 800。"},"m55":{"k":"M","id":"m55","n":"神王·图鲁","r":"ultra","rar":"UR","lv":8,"atk":3000,"def":2500,"role":"伤害型","art":"图鲁","fx":[{"k":"destroyStrongest","v":1}],"text":"①：此卡需要 2 只祭品。②：此卡召唤成功时，破坏对方场上攻击力最高的 1 只怪兽。"},"m56":{"k":"M","id":"m56","n":"N","r":"ultra","rar":"UR","lv":8,"atk":2800,"def":2800,"role":"辅助型","fx":[{"k":"discardOpp","v":1},{"k":"draw","v":1}],"text":"①：此卡需要 2 只祭品。②：此卡召唤成功时，对方随机丢弃 1 张手牌，自己抽 1 张牌。"},"s01":{"k":"S","id":"s01","n":"命轮占卜","r":"any","t":"normal","rar":"N","fx":[{"k":"draw","v":2}],"text":"抽 2 张牌。"},"s02":{"k":"S","id":"s02","n":"记忆回溯","r":"any","t":"normal","rar":"R","fx":[{"k":"recall","f":"monster","v":1}],"text":"从自己墓地选 1 只怪兽加入手牌。"},"s03":{"k":"S","id":"s03","n":"银芯交易","r":"any","t":"normal","rar":"R","fx":[{"k":"lpDraw","v":1000}],"text":"自己支付 1000 点生命值，抽 2 张牌。"},"s04":{"k":"S","id":"s04","n":"忘却之楔","r":"any","t":"normal","rar":"SR","fx":[{"k":"destroyWeak","v":1800}],"text":"对方场上攻击力最高的怪兽，若其攻击力不高于 1800，则破坏它。"},"s05":{"k":"S","id":"s05","n":"命轮共鸣","r":"any","t":"normal","rar":"R","fx":[{"k":"pumpHighest","v":800}],"text":"自己场上攻击力最高的 1 只怪兽攻击力永久上升 800。"},"s06":{"k":"S","id":"s06","n":"融蚀风暴","r":"any","t":"normal","rar":"SR","fx":[{"k":"burn","v":1000}],"text":"给予对方 1000 点伤害。"},"s07":{"k":"S","id":"s07","n":"缄默契约","r":"any","t":"cont","rar":"R","fx":[{"k":"contHeal","v":500}],"text":"永续：自己每个回合结束时回复 500 点生命值。"},"s08":{"k":"S","id":"s08","n":"记忆防线","r":"any","t":"quick","rar":"N","fx":[{"k":"quickDef","v":1000}],"text":"速攻：自己场上全部怪兽守备力直到回合结束时上升 1000。"},"s09":{"k":"S","id":"s09","n":"熵增逆转","r":"chaos","t":"normal","rar":"R","fx":[{"k":"selfBurnDraw","v":1000}],"text":"自己受到 1000 点伤害，抽 2 张牌。"},"s10":{"k":"S","id":"s10","n":"猩红邀约","r":"chaos","t":"equip","rar":"SR","fx":[{"k":"equipAtk","v":1000}],"text":"装备：装备怪兽攻击力上升 1000。"},"s11":{"k":"S","id":"s11","n":"业火重燃","r":"chaos","t":"normal","rar":"R","fx":[{"k":"graveBurn","r":"chaos","v":200,"max":5}],"text":"自己墓地每有 1 只「混沌」怪兽，给予对方 200 点伤害（最多 5 只）。"},"s12":{"k":"S","id":"s12","n":"疯狂低语","r":"chaos","t":"quick","rar":"R","fx":[{"k":"quickAtkAll","v":500}],"text":"速攻：自己场上全部怪兽攻击力直到回合结束时上升 500。"},"s13":{"k":"S","id":"s13","n":"血之偿还","r":"caro","t":"normal","rar":"R","fx":[{"k":"graveHeal","v":300}],"text":"自己墓地每有 1 只怪兽，自己回复 300 点生命值。"},"s14":{"k":"S","id":"s14","n":"再生之躯","r":"caro","t":"equip","rar":"SR","fx":[{"k":"equipDef","v":1200},{"k":"turnHeal","v":300}],"text":"装备：装备怪兽守备力上升 1200；自己回合开始时回复 300 点生命值。"},"s15":{"k":"S","id":"s15","n":"红祭礼","r":"caro","t":"normal","rar":"R","fx":[{"k":"sacrificeHeal","v":1500}],"text":"破坏自己场上攻击力最低的 1 只怪兽，自己回复 1500 点生命值并抽 1 张牌。"},"s16":{"k":"S","id":"s16","n":"无尽星光","r":"caro","t":"cont","rar":"SR","fx":[{"k":"contHeal","v":500},{"k":"auraDef","v":300}],"text":"永续：自己每个回合结束时回复 500 点生命值；自己场上怪兽守备力上升 300。"},"s17":{"k":"S","id":"s17","n":"深渊回响","r":"aqua","t":"normal","rar":"N","fx":[{"k":"echoDraw","v":1}],"text":"双方各抽 1 张牌，然后自己再抽 1 张牌。"},"s18":{"k":"S","id":"s18","n":"潮汐逆转","r":"aqua","t":"normal","rar":"SR","fx":[{"k":"bounce","v":1}],"text":"对方场上攻击力最高的 1 只怪兽回到手牌。"},"s19":{"k":"S","id":"s19","n":"沉于深渊","r":"aqua","t":"cont","rar":"SR","fx":[{"k":"summonTaxDiscard","v":1}],"text":"永续：对方每次召唤成功时，随机丢弃 1 张手牌。"},"s20":{"k":"S","id":"s20","n":"海祭典仪","r":"aqua","t":"normal","rar":"R","fx":[{"k":"realmDraw","r":"aqua","v":2}],"text":"自己场上每有 1 只「深海」怪兽，自己抽 1 张牌（最多 2 张）。"},"s21":{"k":"S","id":"s21","n":"维度投射","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"snipeDraw","v":1}],"text":"破坏对方场上 1 张盖放的魔法·陷阱卡，自己抽 1 张牌。"},"s22":{"k":"S","id":"s22","n":"参数拟合","r":"ultra","t":"normal","rar":"R","fx":[{"k":"discardOpp","v":1}],"text":"对方随机丢弃 1 张手牌。"},"s23":{"k":"S","id":"s23","n":"净世之路","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"sweepWeak","v":1500}],"text":"场上攻击力不高于 1500 的怪兽全部破坏（双方）。"},"s24":{"k":"S","id":"s24","n":"界外之音","r":"ultra","t":"cont","rar":"SR","fx":[{"k":"extraDraw","v":1}],"text":"永续：自己每次抽卡阶段多抽 1 张牌。"},"s25":{"k":"S","id":"s25","n":"空间折叠","r":"ultra","t":"quick","rar":"R","fx":[{"k":"quickDirect","v":1}],"text":"速攻：自己场上攻击力最高的 1 只怪兽本回合可以直接攻击。"},"s26":{"k":"S","id":"s26","n":"观测者之眼","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"search","f":"monster","max":4,"v":1}],"text":"从卡组把 1 只等级 4 以下的怪兽加入手牌。"},"t01":{"k":"T","id":"t01","n":"融蚀之槛","r":"any","t":"normal","rar":"SR","fx":[{"k":"destroyAttacker"}],"text":"对方怪兽攻击宣言时：破坏那只怪兽。"},"t02":{"k":"T","id":"t02","n":"忘却的代价","r":"any","t":"normal","rar":"SR","fx":[{"k":"reflect","v":1000}],"text":"对方直接攻击宣言时：那次战斗伤害变成 0，给予对方 1000 点伤害。"},"t03":{"k":"T","id":"t03","n":"缄默之壁","r":"any","t":"normal","rar":"R","fx":[{"k":"negateAttack"}],"text":"对方怪兽攻击宣言时：那次攻击无效。"},"t04":{"k":"T","id":"t04","n":"逆流之忆","r":"any","t":"normal","rar":"N","fx":[{"k":"draw","v":2}],"text":"自己抽 2 张牌。"},"t05":{"k":"T","id":"t05","n":"索魂链","r":"any","t":"cont","rar":"R","fx":[{"k":"contPunish","v":300}],"text":"永续：对方每次攻击宣言时，自己回复 500 点生命值，给予对方 300 点伤害。"},"t06":{"k":"T","id":"t06","n":"悖论","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSpell"}],"text":"反击：对方魔法卡的发动无效并破坏。"},"t07":{"k":"T","id":"t07","n":"圣所钟声","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSummon"}],"text":"反击：对方 1 次召唤无效，那只怪兽破坏。"},"t08":{"k":"T","id":"t08","n":"猎手的陷阱","r":"any","t":"normal","rar":"R","fx":[{"k":"destroySummon","v":2000}],"text":"对方召唤成功时：若那只怪兽攻击力不高于 2000，破坏它。"},"t09":{"k":"T","id":"t09","n":"银芯蒸发","r":"any","t":"normal","rar":"N","fx":[{"k":"tradeDraw"}],"text":"对方抽 1 张牌，自己抽 2 张牌。"},"t10":{"k":"T","id":"t10","n":"记忆碎屑","r":"any","t":"normal","rar":"R","fx":[{"k":"discardOpp","v":2}],"text":"对方随机丢弃 2 张手牌。"},"t11":{"k":"T","id":"t11","n":"终天之诗","r":"any","t":"cont","rar":"SR","fx":[{"k":"contBurn","v":500}],"text":"永续：对方每个回合结束时受到 500 点伤害。"},"t12":{"k":"T","id":"t12","n":"血之誓约","r":"any","t":"normal","rar":"N","fx":[{"k":"healDraw","v":1000}],"text":"自己回复 1000 点生命值并抽 1 张牌。"},"t13":{"k":"T","id":"t13","n":"深渊之口","r":"any","t":"normal","rar":"R","fx":[{"k":"bounce","v":1}],"text":"对方场上攻击力最高的 1 只怪兽回到手牌。"},"t14":{"k":"T","id":"t14","n":"维度囚笼","r":"any","t":"normal","rar":"R","fx":[{"k":"weakenEnemyAll","v":500}],"text":"对方场上全部怪兽攻击力直到回合结束时下降 500。"},"t15":{"k":"T","id":"t15","n":"王权之令","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSpellSnipe"}],"text":"反击：对方魔法卡的发动无效并破坏，然后破坏对方 1 张盖放的卡。"},"t16":{"k":"T","id":"t16","n":"校猫的恶作剧","r":"any","t":"normal","rar":"SR","fx":[{"k":"snipeDraw","v":1}],"text":"破坏对方场上 1 张盖放的魔法·陷阱卡，自己抽 1 张牌。"},"t17":{"k":"T","id":"t17","n":"无光之夜","r":"any","t":"normal","rar":"R","fx":[{"k":"weakenHighest","v":1000}],"text":"对方场上攻击力最高的 1 只怪兽攻击力直到回合结束时下降 1000。"},"t18":{"k":"T","id":"t18","n":"巡夜人的灯","r":"any","t":"normal","rar":"R","fx":[{"k":"battleBoost","v":1000}],"text":"对方怪兽攻击宣言时：自己场上全部怪兽攻击力直到回合结束时上升 1000。"},"t19":{"k":"T","id":"t19","n":"契约反噬","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateTrap"}],"text":"反击：对方陷阱卡的发动无效并破坏。"},"t20":{"k":"T","id":"t20","n":"弥萨格的黄昏","r":"any","t":"cont","rar":"SR","fx":[{"k":"contBoth","v":300}],"text":"永续：自己每个回合开始时回复 300 点生命值，给予对方 300 点伤害。"},"e01":{"k":"E","id":"e01","n":"终末·噬血链球","r":"chaos","rar":"UR","lv":8,"atk":3500,"def":2500,"role":"伤害型","mat":["血链·希洛","凯蒂古拉"],"fx":[{"k":"pierce"},{"k":"burn","v":1000}],"text":"「血链·希洛」＋「凯蒂古拉」。①：此卡觉醒召唤成功时，给予对方 1000 点伤害。②：此卡攻击守备表示怪兽时给予贯穿伤害。"},"e02":{"k":"E","id":"e02","n":"夜巡·弥萨格之眼","r":"ultra","rar":"UR","lv":8,"atk":3200,"def":2400,"role":"伤害型","mat":["波吕克斯","詹金"],"fx":[{"k":"negateTrapOnce"},{"k":"pierce"}],"text":"「波吕克斯」＋「詹金」。①：此卡可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。②：此卡攻击守备表示怪兽时给予贯穿伤害。"},"e03":{"k":"E","id":"e03","n":"深潜·诞妄回响","r":"aqua","rar":"UR","lv":8,"atk":3000,"def":2600,"role":"辅助型","mat":["墨菲","法洛思"],"fx":[{"k":"draw","v":2},{"k":"turnHeal","v":300}],"text":"「墨菲」＋「法洛思」。①：此卡觉醒召唤成功时，自己抽 2 张牌。②：自己回合开始时回复 300 点生命值。"},"e04":{"k":"E","id":"e04","n":"熵王·熔毁之冠","r":"chaos","rar":"UR","lv":8,"atk":3300,"def":2500,"role":"伤害型","mat":["熔毁·朵尔","24"],"fx":[{"k":"destroyStrongest","v":1},{"k":"pierce"}],"text":"「熔毁·朵尔」＋「24」。①：此卡觉醒召唤成功时，破坏对方攻击力最高的 1 只怪兽。②：此卡攻击守备表示怪兽时给予贯穿伤害。"},"e05":{"k":"E","id":"e05","n":"净世·破晓投枪","r":"ultra","rar":"UR","lv":8,"atk":3100,"def":2300,"role":"伤害型","mat":["达芙黛尔","莉兹"],"fx":[{"k":"snipeAttack","v":1},{"k":"onKillDraw","v":1}],"text":"「达芙黛尔」＋「莉兹」。①：此卡攻击宣言时，破坏对方 1 张盖放的魔法·陷阱卡。②：此卡战斗破坏对方怪兽时，自己抽 1 张牌。"},"e06":{"k":"E","id":"e06","n":"王权·终焉图鲁","r":"aqua","rar":"GR","lv":10,"atk":3800,"def":3000,"role":"伤害型","mat":["神王·图鲁","威廉"],"art":"图鲁","fx":[{"k":"pierce"},{"k":"guard"}],"text":"「神王·图鲁」＋「威廉」。①：此卡攻击守备表示怪兽时给予贯穿伤害。②：只要此卡在场上，对方不能攻击其他怪兽。"},"e07":{"k":"E","id":"e07","n":"悖论·无解之环","r":"ultra","rar":"UR","lv":8,"atk":3400,"def":2600,"role":"辅助型","mat":["N","汀克特"],"fx":[{"k":"discardOpp","v":1},{"k":"draw","v":1},{"k":"negateTrapOnce"}],"text":"「N」＋「汀克特」。①：此卡觉醒召唤成功时，对方随机丢弃 1 张手牌，自己抽 1 张牌。②：此卡可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。"},"e08":{"k":"E","id":"e08","n":"血月·杜勒赛因","r":"caro","rar":"UR","lv":8,"atk":3300,"def":2400,"role":"伤害型","mat":["杜勒赛因","索蕾尔"],"fx":[{"k":"drain","v":100},{"k":"onKillAtk","v":300}],"text":"「杜勒赛因」＋「索蕾尔」。①：此卡给予对方战斗伤害时，自己回复那个数值的生命值。②：此卡战斗破坏对方怪兽时，攻击力永久上升 300。"},"e09":{"k":"E","id":"e09","n":"灰烬·萝坦双刃","r":"chaos","rar":"UR","lv":8,"atk":3000,"def":2200,"role":"伤害型","mat":["蚀灭·萝坦","珈伦"],"fx":[{"k":"twin"},{"k":"onKillAtk","v":200}],"text":"「蚀灭·萝坦」＋「珈伦」。①：此卡在同一个战斗阶段中可以攻击 2 次。②：此卡战斗破坏对方怪兽时，攻击力永久上升 200。"},"e10":{"k":"E","id":"e10","n":"圣所·负誓之壁","r":"caro","rar":"SR","lv":8,"atk":2700,"def":3400,"role":"防御型","mat":["负誓·奥吉尔","萨尔瓦多"],"fx":[{"k":"guard"},{"k":"auraDef","v":400}],"text":"「负誓·奥吉尔」＋「萨尔瓦多」。①：只要此卡在场上，对方不能攻击其他怪兽。②：自己场上其他怪兽守备力上升 400。"},"e11":{"k":"E","id":"e11","n":"环行·无限回廊","r":"chaos","rar":"SR","lv":8,"atk":3000,"def":2500,"role":"辅助型","mat":["环行·拉蒙娜","薇薇安"],"fx":[{"k":"draw","v":1},{"k":"recall","f":"spell","v":1}],"text":"「环行·拉蒙娜」＋「薇薇安」。①：此卡觉醒召唤成功时，自己抽 1 张牌，并从墓地选 1 张魔法卡加入手牌。"},"e12":{"k":"E","id":"e12","n":"弥萨格校猫","r":"any","rar":"GR","lv":6,"atk":2600,"def":2000,"role":"辅助型","matRealm":"any","matN":2,"fx":[{"k":"draw","v":1},{"k":"discardOpp","v":1},{"k":"revive"}],"text":"自己场上 2 只界域不同的怪兽。①：此卡觉醒召唤成功时，自己抽 1 张牌，对方随机丢弃 1 张手牌。②：此卡被破坏时回到手牌（每场决斗限 1 次）。"}};
const PACKS = [{"id":"bp01","n":"初醒之轮","en":"AWAKENING WHEEL","sub":"混沌 · 血肉","desc":"第一批被守密人记起来的东西。牌面还是热的：混沌的熵、血肉的誓，以及一批还没学会害怕的唤醒体。","cards":["m01","m02","m03","m04","m05","m06","m07","m08","m09","m10","m11","m12","m13","m14","m15","m16","m17","m18","m19","m20","m21","m22","m24","m25","s01","s02","s03","s04","s05","s06","s09","s10","s11","s13","s14","s15","t01","t02","t04","t12"]},{"id":"bp02","n":"深潜回响","en":"ECHOES BELOW","sub":"深海","desc":"往弥萨格的地基下面走四十层，能听见水声。深海界域的记忆是咸的：它们不喊救命，只把人慢慢往下拉。","cards":["m29","m30","m31","m32","m33","m34","m35","m36","m37","m38","m39","m40","m41","m42","s17","s18","s19","s20","s01","s06","t05","t13","t01","t03","t04"]},{"id":"bp03","n":"超维裂隙","en":"RIFT OF ULTRA","sub":"超维","desc":"从裂隙里看出去，弥萨格只是纸上的一行注脚。超维界域的人擅长把「已经发生的事」改写成一纸参数。","cards":["m43","m44","m45","m46","m47","m48","m49","m50","m51","m52","m53","m54","m55","m56","s21","s22","s23","s24","s25","s26","t06","t07","t14","t17","t18","t19"]},{"id":"bp04","n":"忘却之诗","en":"POEM OF OBLIVION","sub":"觉醒体 · 反击","desc":"把两个人的名字叠在同一张牌上，命轮会替他们给出一个答案——通常不是他们想要的答案。","cards":["e01","e02","e03","e04","e05","e06","e07","e08","e09","e10","e11","s05","s07","s08","t06","t07","t08","t09","t10","t11","t15","t19","t20"]},{"id":"sp01","n":"校猫的私藏","en":"THE CAT'S DRAWER","sub":"彩蛋 · 混编","desc":"没人知道这只猫把东西藏在哪里。抽出来的牌常常不属于任何一个卡包，甚至不属于任何一个界域。","cards":["e12","t16","m55","m56","m42","m12","m18","m36","m51","m01","e07","s03","s21","s26"]}];
const BONDS = [{"id":"b1","n":"终天三席","need":["24","熔毁·朵尔","凯蒂古拉"],"fx":[{"k":"atkNames","list":["24","熔毁·朵尔","凯蒂古拉"],"v":300},{"k":"draw","v":1}],"text":"「24」「熔毁·朵尔」「凯蒂古拉」同时在卡组中：开局抽 1 张，这三只怪兽攻击力 +300。"},{"id":"b2","n":"熵之回响","need":["凯蒂古拉","潘狄娅"],"fx":[{"k":"burnBonus","v":200}],"text":"「凯蒂古拉」「潘狄娅」同时在卡组中：自己卡的效果给予对方的伤害 +200。"},{"id":"b3","n":"净世巡夜","need":["波吕克斯","詹金"],"fx":[{"k":"atkRealm","r":"ultra","v":300}],"text":"「波吕克斯」「詹金」同时在卡组中：自己场上「超维」怪兽攻击力 +300。"},{"id":"b4","n":"猫与灯","need":["汀克特","卡茜亚"],"fx":[{"k":"searchTrap","v":1}],"text":"「汀克特」「卡茜亚」同时在卡组中：开局从卡组把 1 张陷阱卡加入手牌。"},{"id":"b5","n":"观测者的证词","need":["卡茜亚","卡斯托尔"],"fx":[{"k":"defRealm","r":"ultra","v":500}],"text":"「卡茜亚」「卡斯托尔」同时在卡组中：自己场上「超维」怪兽守备力 +500。"},{"id":"b6","n":"深潜三重奏","need":["墨菲","法洛思","奥瑞塔"],"fx":[{"k":"draw","v":1},{"k":"defRealm","r":"aqua","v":400}],"text":"「墨菲」「法洛思」「奥瑞塔」同时在卡组中：开局抽 1 张，自己场上「深海」怪兽守备力 +400。"},{"id":"b7","n":"血脉同源","need":["希洛","血链·希洛","杜勒赛因"],"fx":[{"k":"atkRealm","r":"caro","v":300},{"k":"lp","v":1000}],"text":"「希洛」「血链·希洛」「杜勒赛因」同时在卡组中：生命值 +1000，自己场上「血肉」怪兽攻击力 +300。"},{"id":"b8","n":"誓约之血","need":["索蕾尔","雷娅"],"fx":[{"k":"healBonus","v":300}],"text":"「索蕾尔」「雷娅」同时在卡组中：自己每次回复生命值时多回复 300。"},{"id":"b9","n":"缄默者","need":["诺缔拉","莉莉","旺达"],"fx":[{"k":"draw","v":1},{"k":"healPerTurn","v":200}],"text":"「诺缔拉」「莉莉」「旺达」同时在卡组中：开局抽 1 张，自己每个回合结束回复 200。"},{"id":"b10","n":"四界混编","cond":"realms4","fx":[{"k":"atkAll","v":200}],"text":"主卡组里四个界域都有卡：自己场上全部怪兽攻击力 +200。"},{"id":"b11","n":"王权","need":["神王·图鲁","N"],"fx":[{"k":"lp","v":500},{"k":"draw","v":1}],"text":"「神王·图鲁」「N」同时在卡组中：生命值 +500，开局抽 1 张。"},{"id":"b12","n":"校猫的偏爱","cond":"hasCard:t16","fx":[{"k":"draw","v":1},{"k":"lp","v":500}],"text":"卡组里有「校猫的恶作剧」：生命值 +500，开局抽 1 张。"}];
const DECKS = [{"id":"d1","n":"终天教团 · 熵火","en":"ENTROPY PYRE","r":"chaos","desc":"用命换速度。召唤即伤害，伤害即抽牌；血条是自己点的火，烧到对面先熄。","cards":[["m01",2],["m02",2],["m03",2],["m04",1],["m05",1],["m06",2],["m07",1],["m09",1],["m11",1],["m12",1],["m13",1],["m14",1],["s09",1],["s10",2],["s11",1],["s12",1],["s06",2],["s01",1],["s05",1],["t01",2],["t02",1],["t06",1],["t10",1]],"extra":["e04","e09"],"combo":["「24」或「潘狄娅」先落地，一张牌换一次抽牌或 500 点直伤。","「猩红邀约」贴在「凯蒂古拉」上，2100 变 3100，贯穿直接打穿守备。","「熔毁·朵尔」＋「24」＝「熵王·熔毁之冠」：3300 贯穿，登场再拆一只。"],"tips":"不要省血。这套牌的生命值是资源，6000 里有 2000 是拿来烧的；但要留在 1500 以上，否则一张「融蚀风暴」就结束了。"},{"id":"d2","n":"弥萨格夜巡","en":"NIGHT WATCH","r":"ultra","desc":"不抢血，抢节奏。用反击陷阱把对方的每一步都变成一次无效，最后让波吕克斯收场。","cards":[["m51",2],["m49",2],["m43",2],["m44",1],["m46",1],["m47",2],["m48",1],["m50",2],["m52",1],["m53",1],["s26",2],["s24",2],["s21",1],["s23",1],["s01",1],["s06",1],["s03",1],["t06",2],["t07",1],["t03",1],["t14",1],["t16",1]],"extra":["e02","e05"],"combo":["「卡茜亚」「珈伦」这类检索卡先找齐反击：「悖论」管魔法，「圣所钟声」管召唤。","「界外之音」在场后每回合多抽 1，反击牌永远比对手多一张。","「波吕克斯」＋「詹金」＝「夜巡·弥萨格之眼」，3200 贯穿，还能封一张陷阱。"],"tips":"盖牌顺序有讲究：先盖「圣所钟声」再盖「悖论」，对手往往会先试魔法、被你换掉一张。"},{"id":"d3","n":"深潜回响","en":"DEEP ECHO","r":"aqua","desc":"把对手的场面一张张弹回手牌，用抽牌把资源差距拉到对手看不懂的地方。","cards":[["m29",2],["m30",2],["m32",1],["m33",2],["m34",2],["m35",2],["m36",1],["m37",1],["m39",1],["m40",1],["s17",2],["s18",2],["s19",1],["s20",1],["s01",1],["s02",1],["s08",1],["t13",2],["t01",1],["t02",1],["t04",1],["t12",1]],"extra":["e03"],"combo":["「奥瑞塔」落地抽 1，「海祭典仪」在两只深海站住后再开，一次两张。","「潮汐逆转」＋「深渊之口」＝ 两次弹回，对方的祭品永远凑不齐。","「墨菲」＋「法洛思」＝「深潜·诞妄回响」，3000 守备 2600，登场抽 2。"],"tips":"这套牌不怕拖。牌差一旦到 3 张以上，就用「沉于深渊」让对手每次召唤都要丢牌。"},{"id":"d4","n":"血肉之诺","en":"COVENANT OF FLESH","r":"caro","desc":"不追求一波打死。每回合回一点、每只怪兽多站一会儿，等「血链·希洛」把差距连本带利收回来。","cards":[["m15",2],["m16",2],["m17",1],["m18",1],["m19",1],["m20",2],["m21",2],["m24",1],["m25",2],["m26",1],["m28",1],["s13",2],["s14",2],["s15",1],["s16",1],["s07",1],["s05",1],["s01",1],["t12",2],["t01",1],["t05",1],["t18",1]],"extra":["e08","e10"],"combo":["「菲茵特」＋「无尽星光」：每个回合结束回 800，两回合就把一张「融蚀风暴」赚回来。","「索蕾尔」付 500 换 500 攻，配「再生之躯」变成 2500 攻 / 2900 守的双面怪。","「杜勒赛因」＋「索蕾尔」＝「血月·杜勒赛因」：3300，打一下回一次。"],"tips":"血量领先时不要急着进攻。这套牌的胜点常在对手牌库见底那两回合。"},{"id":"d5","n":"虚无教义","en":"DOCTRINE OF NOTHING","r":"any","desc":"终天教团的另一种传教方式：不主动进攻，只让对手每一次出手都付出代价。十张陷阱，四界齐备。","cards":[["m04",2],["m05",2],["m16",1],["m39",2],["m43",2],["m47",2],["m48",1],["m53",2],["s01",2],["s02",1],["s08",2],["s06",1],["t01",2],["t02",2],["t03",2],["t06",1],["t07",1],["t19",1],["t20",1]],"extra":["e12"],"combo":["「诺缔拉」「莉莉」「旺达」三个守备怪站满，对手只能先拆墙。","「弥萨格的黄昏」＋「终天之诗」：每回合净赚 300 血差，十回合就是 3000。","四界齐备触发「四界混编」，一堵 1200 攻的墙也能咬人。"],"tips":"盖牌不要一次盖满。留一格空位，对手会误判你没有第二张「融蚀之槛」。"},{"id":"d6","n":"校猫的私藏","en":"THE CAT'S DRAWER","r":"any","desc":"四界混编的杂牌，靠觉醒体翻盘。没人知道下一张是什么——包括你自己。","cards":[["m01",2],["m09",2],["m12",1],["m18",1],["m36",1],["m40",1],["m42",1],["m48",2],["m51",1],["m52",1],["m55",1],["m56",1],["s01",2],["s03",1],["s05",1],["s06",2],["s21",1],["s23",1],["s26",1],["t01",1],["t04",1],["t06",1],["t11",1],["t16",2]],"extra":["e12","e07","e06","e04"],"combo":["「校猫的恶作剧」拆掉对手唯一一张盖牌，然后「弥萨格校猫」登场：抽 1、对手弃 1。","「神王·图鲁」＋「威廉」＝「王权·终焉图鲁」，3800 攻还带守备嘲讽。","「N」＋「汀克特」＝「悖论·无解之环」，一次弃牌、一次抽牌、一次封陷阱。"],"tips":"这套牌什么都有，什么都不精。觉醒体是唯一的赢法：留好素材，别把它们当祭品吃掉。"}];
const LORE = {"_note":"《忘却前夜·命轮对决》的世界观与设定。术语沿用原作，卡牌规则与「命轮对决」这套玩法是本作私设。","intro":"这不是一场战争。战争会留下废墟，而这里连废墟都不会留下——被忘掉的东西不会变成灰，它只是从来没有存在过。","realms":[{"id":"chaos","n":"混沌","en":"CHAOS","color":"#e8656f","motto":"用身体换一个答案","desc":"熵的界域。这里的记忆是烧起来的：越是想记住什么，越要先把自己点着。混沌的唤醒体多半不在意代价，她们只在意那把火烧到谁身上。","style":"直伤 · 自损换攻 · 破坏"},{"id":"caro","n":"血肉","en":"CARO","color":"#d98b6a","motto":"伤口是可以谈条件的","desc":"血肉的界域。这里的规则很朴素：欠了就还。血可以当钱、当誓、当契约的墨水。血肉的唤醒体擅长把已经付出的东西再要回来一次。","style":"回复 · 墓地回收 · 耐战"},{"id":"aqua","n":"深海","en":"AEQUOR","color":"#5b9bd5","motto":"往下走，别回头","desc":"深海的界域。水会冲掉名字，也会把冲掉的东西堆在更深的地方。深海的唤醒体不急着杀你，她们只是让你的牌一张张离开该在的位置。","style":"抽牌 · 弹手 · 资源压制"},{"id":"ultra","n":"超维","en":"ULTRA","color":"#e3b341","motto":"已经发生的事，可以重写","desc":"维度的界域。这里的人看弥萨格像看一行注脚：既然只是注脚，就可以改。超维的唤醒体最擅长的不是进攻，是让对方的进攻「没有发生过」。","style":"无效 · 反击 · 检索"}],"chapters":[{"id":"c1","t":"一 · 忘却前夜","sub":"THE NIGHT BEFORE FORGETTING","quote":"那一夜没有火光，也没有喊声。第二天早上，少了一条街。","ps":["人们后来把那一夜叫做「忘却前夜」：不是遗忘的开始，而是遗忘被人们发现的那一晚。在那之前，融蚀已经吃了很多东西，只是没有人察觉——因为被吃掉的东西，连「少了什么」这个念头都一起没了。","融蚀不摧毁，它撤回。一栋楼不是倒塌，是从来没有人盖过；一个人不是死去，是户口本上从来没有这一行。世界上只剩下最后一座还在「记得」的城市：弥萨格。","弥萨格之所以还在，是因为城里有一群人自愿承担了全部的记忆。他们记得每一条被撤掉的街、每一个被撤掉的名字，代价是这些记忆会像石头一样压在他们身上，一天比一天重。"]},{"id":"c2","t":"二 · 守密人","sub":"THE KEEPER","quote":"我不打架。我只是记得你打过。","ps":["守密人不是战士。他们的能力只有一项：记住。别人忘掉的东西，他们替世界记着；替世界记着的东西，他们不能忘，也忘不掉。","弥萨格给每位守密人配一间没有窗的房间，房间里堆满卡片。每一张卡片上写着一个名字、一段残存的记忆、一句那个人最后说过的话。守密人每天要做的事就是重新读一遍——不读，那些东西就会重新滑进融蚀里。","读得久了，卡片会开始回应。你会发现某一张牌的边角是热的，某一张在你手里轻轻动了一下，像有人在里面翻身。那不是错觉：被记住得足够久的东西，会想要回来。"]},{"id":"c3","t":"三 · 唤醒与命轮","sub":"AWAKENING & THE WHEEL","quote":"命轮不是命运。命运不会给你第二次抽牌的机会。","ps":["把一张卡片读到足够熟，卡片上的人就会「醒」。这个过程叫唤醒：不是复活，复活需要尸体；唤醒只需要有人还在想她。醒过来的存在被称为唤醒体，她们有自己的脾气、自己的旧账，以及一个共同的处境——世界已经不记得她们了。","唤醒体不能长期停留在现实里。她们需要一个载体，那就是命轮：一枚刻满刻痕的环。每一道刻痕是一段记忆，每一张卡是一道刻痕的投影。所以牌组不是武器库，是一个人的全部履历。你把谁放进牌组，就等于承认「我记得她」。","命轮也有代价。唤醒体每次被召唤，都要从守密人身上借走一点「确定的记忆」——不是忘掉某件事，而是对某件事不再确定。老练的守密人会把不重要的东西排在前面：今天的天气、昨天的晚饭、自己的生日。"]},{"id":"c4","t":"四 · 四界域","sub":"THE FOUR REALMS","quote":"四个界域，四种还债的方式。","ps":["唤醒体按记忆的质地分成四个界域。这不是地理，是「她属于哪一种遗忘」。","混沌的记忆是烧的，血肉的记忆是疼的，深海的记忆是沉的，超维的记忆是冷的。两个界域的人站在一起，命轮上的刻痕会互相咬合——这就是为什么有些组合一上手就顺，有些怎么打都别扭。","守密人把这种咬合叫做「羁绊」。它不是感情，是结构：两段记忆接得上，力量就会从接缝里漏出来。老守密人带新人时只说一句：先配人，再配牌。"]},{"id":"c5","t":"五 · 命轮对决","sub":"THE DUEL","quote":"输的人不是死。输的人要交出一张牌。","ps":["两个守密人之间的冲突，很少用拳头解决。他们把自己的命轮接上同一台仪器，让两套记忆在中间对撞——这就是命轮对决。","对决里的一切都有对应的现实代价：生命值是你还能维持「确定」的总量；祭品是你把两段记忆叠在一起，让位给更强的那个；觉醒召唤是把两个人放进同一张牌，让命轮替她们给出一个答案。答案通常不是她们想要的。","输掉对决的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡，下次唤醒她会更难。所以弥萨格的守密人从不轻易开局，也从不轻易认输。","先手不抽牌，是因为先手已经拿到了「先说话」的权利。这条规矩写在弥萨格第一版规程的第一页，据说是被某个守密人用血改上去的。"]},{"id":"c6","t":"六 · 终天教团","sub":"THE ORDER OF THE LAST DAY","quote":"既然都会被忘掉，为什么还要记得？","ps":["终天教团不认为融蚀是灾难，他们认为那是「清洗」。世界之所以痛苦，是因为所有人都在拼命记着不该记的东西；只要全部忘掉，就没有人会被失去弄疼。","教团的守密人也做命轮对决，只是他们的牌组里塞满了「虚无」：不进攻、只拖延、只让对方的每一步都付出代价。他们不追求赢，他们追求让你觉得「记得」这件事很累。","弥萨格官方不承认教团的存在。但档案室里少了一批卡片，少的那批全是「终天」相关的人——这件事没人敢往上报。"]},{"id":"c7","t":"七 · 弥萨格的猫","sub":"THE CAT OF MISAG","quote":"它不属于任何界域。它属于所有界域。","ps":["校猫在弥萨格的地位很奇怪：它不是唤醒体，不在任何一册档案里，也没有人记得它是哪一天出现在走廊上的。它想出现就出现，想消失就消失，四个界域的门对它都是开着的。","有守密人试过把它写进卡片。卡片上确实出现了猫，但那张牌每次打出来的效果都不一样——有时抽牌，有时让对手丢牌，有时什么都没发生，只是猫在牌面上打了一个哈欠。","规程里有一条专门为它加的附注：若对决中出现无法归类的现象，先确认附近有没有猫。"]},{"id":"c8","t":"八 · 卡包的来历","sub":"WHERE THE PACKS COME FROM","quote":"每一包都是一次清点：这些人，我还记得。","ps":["弥萨格的卡片不是印出来的，是「清点」出来的。档案室每隔一段时间要把积压的记忆整理成册，整理完的残页会被压成一套卡包。所以卡包的名字听起来都像档案编号。","「初醒之轮」是最早的一批，混沌与血肉，牌面还是热的；「深潜回响」来自地基下面的四十层，纸是咸的；「超维裂隙」是从裂隙里捞出来的，编号经常对不上；「忘却之诗」全是觉醒体，每一张都写着两个名字。","「校猫的私藏」没有编号，也没有收录记录。它是从校猫睡觉的那个抽屉里掉出来的，一共十四张，其中有一张不是任何人的牌。"]}],"terms":[{"n":"融蚀","d":"一种「撤回」现象。被融蚀的东西不是被毁掉，而是从来没有存在过；连「少了什么」的念头都会一起消失。"},{"n":"弥萨格","d":"最后一座还在「记得」的城市。融蚀在这里推进得最慢，因为有一群人在替世界记着。"},{"n":"守密人","d":"以「记住」为能力的人。玩家在对决中扮演的角色。不战斗，只记得。"},{"n":"唤醒体","d":"被守密人读到「醒」过来的存在。不是复活，是有人还在想她。"},{"n":"命轮","d":"唤醒体的载体，一枚刻满刻痕的环。每一道刻痕是一段记忆，每一张卡是一道刻痕的投影。"},{"n":"界域","d":"按记忆质地划分的四类：混沌（烧）、血肉（疼）、深海（沉）、超维（冷）。"},{"n":"羁绊","d":"两段接得上的记忆。不是感情，是结构；接缝里会漏出力量。"},{"n":"祭品","d":"把两段记忆叠在一起，让位给更强的那个。等级 5–6 需要 1 只，7 以上需要 2 只。"},{"n":"觉醒召唤","d":"把两个人放进同一张牌，从额外卡组召唤觉醒体。素材送墓，不占通常召唤。"},{"n":"命轮值","d":"本作对「生命值」的叫法。归零不是死，是「不再确定自己是谁」。"},{"n":"银芯","d":"弥萨格的流通物，也是开卡包的代价。赢一场对决能拿到一些。"},{"n":"终天教团","d":"认为忘却才是救赎的教团。牌组以陷阱与拖延为主，不追求赢，只让你觉得「记得」很累。"},{"n":"校猫","d":"不属于任何界域的猫。没有档案，没有编号，四个界域的门对它都开着。"}]};
const FACES = "data:image/webp;base64,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";
const BACK = "data:image/webp;base64,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";
const ART = {"cell":88,"cols":8,"rows":7,"w":704,"h":616,"index":{"24":0,"凯蒂古拉":1,"潘狄娅":2,"诺缔拉":3,"莉莉":4,"哈姆林":5,"珈伦":6,"塔薇":7,"莱克":8,"宁菲亚":9,"薇薇安":10,"熔毁·朵尔":11,"蚀灭·萝坦":12,"环行·拉蒙娜":13,"阿格里帕":14,"艾继丝":15,"杜勒赛因":16,"血链·希洛":17,"希洛":18,"菲茵特":19,"索蕾尔":20,"尤乌哈希":21,"皮克曼":22,"雷娅":23,"萨尔瓦多":24,"徐":25,"卡拉布":26,"负誓·奥吉尔":27,"奥瑞塔":28,"凯刻斯":29,"希莱斯特":30,"克珀珊特":31,"法洛思":32,"戈利亚":33,"墨菲":34,"诞妄·墨菲":35,"弥利亚姆":36,"珊":37,"莫丝":38,"图鲁":39,"庞托斯":40,"威廉":41,"卡茜亚":42,"卡斯托尔":43,"克莱门汀":44,"达芙黛尔":45,"艾瑞卡":46,"奥尔拉":47,"詹金":48,"莉兹":49,"波吕克斯":50,"汀克特":51,"旺达":52,"阿拉克涅":53,"N":54,"弥萨格校猫":55}};
return { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART };
})();

// ---- js/duel/engine.js
const m_engine = await (async () => {
const { CARDS, BONDS } = m_gen;
// 《忘却前夜 · 命轮对决》规则引擎。
//
// 这一层不碰 DOM：所有操作都是 (状态, 参数) → 改状态 + 往 G.log 追加日志，
// 返回 { ok, err }。网页（view.js）和 AI（ai.js）都只是调用它，
// 所以同一套规则可以被人和机器共用，也方便在 node 里无头跑自测。


const LP_MAX = 8000;
const ZONES = 3;
const HAND_MAX = 7;
const REALM = {
  chaos: { n: '混沌', en: 'CHAOS', c: '#e8656f' },
  caro: { n: '血肉', en: 'CARO', c: '#d98b6a' },
  aqua: { n: '深海', en: 'AQUOR', c: '#5b9bd5' },
  ultra: { n: '超维', en: 'ULTRA', c: '#e3b341' },
  any: { n: '无界', en: 'NONE', c: '#8a93a8' },
};

// 怪兽卡里「召唤成功时」才结算的效果；其余（贯穿、守备、光环……）是静态的，
// 只要在场就一直生效，不在召唤时执行。
const SUMMON_FX = new Set([
  'draw', 'burn', 'heal', 'discardOpp', 'recall', 'search', 'bounce',
  'snipe', 'weaken', 'pumpSelf', 'costLp', 'destroyStrongest', 'bothDraw',
]);

const ok = () => ({ ok: true });
const fail = (msg) => ({ ok: false, err: msg });

function fx(card) { return (card && card.fx) || []; }
function pname(p) { return p.idx === 0 ? '你' : '对手'; }
function realmOf(id) { const d = CARDS[id]; return d ? d.r : 'any'; }

// 线性同余不够随机（同种子下开手牌会重复得太明显），用 mulberry32：
// 同样的种子能复现同一局，调试时省事。
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(G, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(G.rng() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

function log(G, text, kind) {
  G.log.push({ text, kind: kind || 'info', turn: G.turn });
  if (G.log.length > 120) G.log.shift();
}

// ------------------------------------------------------------------ 建局
function mkPlayer(G, idx, def) {
  const p = {
    idx, lp: LP_MAX, lpMax: LP_MAX,
    deck: [], hand: [], mons: [null, null, null], spells: [null, null, null],
    grave: [], extra: [], bonds: [], normalUsed: false,
  };
  for (const pair of def.cards || []) {
    for (let i = 0; i < pair[1]; i++) p.deck.push(pair[0]);
  }
  shuffle(G, p.deck);
  p.extra = (def.extra || []).slice();
  return p;
}

// 羁绊判定：只看主卡组（额外卡组的觉醒体不算「卡组里有这个人」，
// 否则玩家把素材全塞额外就能白拿羁绊）。
function evalBonds(deckCardIds) {
  const names = new Set();
  const ids = new Set(deckCardIds);
  const realms = new Set();
  for (const id of deckCardIds) {
    const d = CARDS[id];
    if (!d) continue;
    if (d.k === 'M' && d.n) names.add(d.n);
    if (d.r && d.r !== 'any') realms.add(d.r);
  }
  return BONDS.filter((b) => {
    if (b.need) return b.need.every((n) => names.has(n));
    if (b.cond === 'realms4') return realms.size >= 4;
    if (b.cond && b.cond.indexOf('hasCard:') === 0) return ids.has(b.cond.slice(8));
    return false;
  });
}

function bondNum(p, k) {
  let v = 0;
  for (const b of p.bonds) for (const f of b.fx || []) if (f.k === k && f.v) v += f.v;
  return v;
}

function createGame(userDeck, aiDeck, opts) {
  const o = opts || {};
  const G = {
    turn: 0, active: 1, phase: 'main', over: false, winner: -1,
    uid: 1, rng: makeRng((o.seed || Date.now()) >>> 0), log: [], players: [],
    stats: { turns: 0, damage: [0, 0] },
  };
  G.players.push(mkPlayer(G, 0, userDeck));
  G.players.push(mkPlayer(G, 1, aiDeck));
  if (o.aiLp) { G.players[1].lp = o.aiLp; G.players[1].lpMax = o.aiLp; }

  for (const p of G.players) {
    p.bonds = evalBonds(p.deck.slice());
    for (const b of p.bonds) log(G, `${pname(p)}触发羁绊「${b.n}」`, 'bond');
  }

  // 起手 5 张
  for (const p of G.players) drawCards(G, p, 5, true);

  // 羁绊的开局效果：加血 / 抽牌 / 检索陷阱
  for (const p of G.players) {
    for (const b of p.bonds) {
      for (const f of b.fx || []) {
        if (f.k === 'lp') { p.lp += f.v; p.lpMax += f.v; log(G, `${pname(p)}的羁绊让命轮值上限 +${f.v}`, 'bond'); }
        if (f.k === 'draw') drawCards(G, p, f.v);
        if (f.k === 'searchTrap') {
          const i = p.deck.findIndex((id) => CARDS[id] && CARDS[id].k === 'T');
          if (i >= 0) {
            const id = p.deck.splice(i, 1)[0];
            p.hand.push({ uid: G.uid++, id });
            log(G, `${pname(p)}用羁绊把「${CARDS[id].n}」放进了手牌`, 'bond');
          }
        }
      }
    }
  }

  G.turn = 1;
  G.active = 0;
  beginTurn(G);
  return G;
}

// ------------------------------------------------------------------ 抽牌
function drawCards(G, p, n, silent) {
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) {
      p.lp -= 1000;
      log(G, `${pname(p)}的卡组已空，命轮反噬 1000`, 'damage');
      checkOver(G);
      continue;
    }
    const id = p.deck.pop();
    if (p.hand.length >= HAND_MAX) {
      p.grave.push(id);
      log(G, `${pname(p)}手牌已满，「${CARDS[id].n}」被挤进墓地`, 'info');
    } else {
      p.hand.push({ uid: G.uid++, id });
      if (!silent) log(G, `${pname(p)}抽了 1 张牌`, 'draw');
    }
  }
}

function heal(G, p, v) {
  const add = v + bondNum(p, 'healBonus');
  p.lp = Math.min(p.lpMax, p.lp + add);
  log(G, `${pname(p)}回复 ${add} 点命轮值`, 'heal');
}

function damagePlayer(G, p, v, kind) {
  if (v <= 0) return;
  p.lp -= v;
  G.stats.damage[p.idx] += v;
  log(G, `${pname(p)}受到 ${v} 点伤害`, kind || 'damage');
  checkOver(G);
}

function checkOver(G) {
  if (G.over) return;
  const dead = G.players.findIndex((p) => p.lp <= 0);
  if (dead >= 0) {
    G.over = true;
    G.winner = 1 - dead;
    log(G, `${pname(G.players[dead])}的命轮断了。${pname(G.players[G.winner])}赢下这场对决。`, 'over');
  }
}

// ------------------------------------------------------------------ 攻守
function eachFx(card, fn) {
  for (const f of fx(card)) fn(f);
}

function atkOf(G, p, m) {
  if (!m) return 0;
  const d = CARDS[m.id];
  let v = m.atk;
  for (const o of p.mons) {
    if (!o || o === m) continue;
    eachFx(CARDS[o.id], (f) => {
      if (f.k === 'aura' && (f.r === 'any' || f.r === d.r)) v += f.v;
    });
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    eachFx(CARDS[s.id], (f) => {
      if (f.k === 'aura' && (f.r === 'any' || f.r === d.r)) v += f.v;
    });
  }
  for (const b of p.bonds) {
    for (const f of b.fx || []) {
      if (f.k === 'atkRealm' && f.r === d.r) v += f.v;
      else if (f.k === 'atkAll') v += f.v;
      else if (f.k === 'atkNames' && (f.list || []).indexOf(d.n) >= 0) v += f.v;
    }
  }
  v += (m.equipAtk || 0) + (m.tmpAtk || 0);
  return Math.max(0, v);
}

function defOf(G, p, m) {
  if (!m) return 0;
  const d = CARDS[m.id];
  let v = m.def;
  for (const o of p.mons) {
    if (!o || o === m) continue;
    eachFx(CARDS[o.id], (f) => { if (f.k === 'auraDef') v += f.v; });
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    eachFx(CARDS[s.id], (f) => { if (f.k === 'auraDef') v += f.v; });
  }
  for (const b of p.bonds) {
    for (const f of b.fx || []) {
      if (f.k === 'defRealm' && f.r === d.r) v += f.v;
      else if (f.k === 'defAll') v += f.v;
    }
  }
  v += (m.equipDef || 0) + (m.tmpDef || 0);
  return Math.max(0, v);
}

function hasFx(m, k) {
  return (CARDS[m.id].fx || []).some((f) => f.k === k);
}
function fxV(m, k) {
  const f = (CARDS[m.id].fx || []).find((x) => x.k === k);
  return f ? f.v : 0;
}

function maxAttacks(m) { return hasFx(m, 'twin') ? 2 : 1; }
function canAttack(G, p, m) {
  return !!m && m.pos === 'atk' && !m.set && m.atkCount < maxAttacks(m) && !G.over;
}

function guardOf(p) {
  return p.mons.find((m) => m && !m.set && m.pos === 'def' && hasFx(m, 'guard'));
}

// ------------------------------------------------------------------ 召唤
function tributeNeed(id) {
  const d = CARDS[id];
  if (!d || d.k !== 'M') return 0;
  if (d.lv >= 7) return 2;
  if (d.lv >= 5) return 1;
  return 0;
}

function freeSlot(arr) { return arr.indexOf(null); }

function canSummon(G, p, id) {
  if (G.over || G.active !== p.idx || G.phase !== 'main') return false;
  if (p.normalUsed) return false;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return false;
  const need = tributeNeed(id);
  const own = p.mons.filter(Boolean).length;
  if (own < need) return false;
  if (need === 0 && freeSlot(p.mons) < 0) return false;
  return true;
}

function summon(G, side, uid, tribUids) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段召唤');
  if (p.normalUsed) return fail('本回合已经通常召唤过了');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return fail('通常召唤只能放怪兽');
  const need = tributeNeed(id);
  const tribs = (tribUids || []).map((u) => p.mons.find((m) => m && m.uid === u)).filter(Boolean);
  if (tribs.length !== need) return fail(need ? `等级 ${d.lv} 需要 ${need} 只祭品` : '这张牌不需要祭品');
  if (need === 0 && freeSlot(p.mons) < 0) return fail('怪兽区已经满了');

  for (const t of tribs) {
    const zi = p.mons.indexOf(t);
    p.mons[zi] = null;
    toGrave(G, p, t, '祭品');
  }
  p.hand.splice(hi, 1);
  p.normalUsed = true;
  const mon = mkMon(G, id, side);
  const slot = freeSlot(p.mons);
  p.mons[slot < 0 ? 0 : slot] = mon;
  log(G, `${pname(p)}召唤「${d.n}」（${REALM[d.r].n} · ${atkOf(G, p, mon)}/${defOf(G, p, mon)}）`, 'summon');

  // 对方召唤时的陷阱（先响应，被破坏了就不结算召唤效果）
  const killed = summonTraps(G, p, mon);
  if (!killed && !mon.set) triggerSummonFx(G, p, mon);
  return ok();
}

function setMonster(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段盖放');
  if (p.normalUsed) return fail('本回合已经通常召唤过了');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'M') return fail('只能盖放怪兽');
  if (tributeNeed(id) > 0) return fail('等级 5 以上的怪兽不能盖放');
  const slot = freeSlot(p.mons);
  if (slot < 0) return fail('怪兽区已经满了');
  p.hand.splice(hi, 1);
  p.normalUsed = true;
  const mon = mkMon(G, id, side);
  mon.pos = 'def';
  mon.set = true;
  p.mons[slot] = mon;
  log(G, `${pname(p)}盖放了一只怪兽`, 'summon');
  summonTraps(G, p, mon);
  return ok();
}

function mkMon(G, id, side) {
  const d = CARDS[id];
  return {
    uid: G.uid++, id, atk: d.atk, def: d.def, pos: 'atk', set: false,
    atkCount: 0, tmpAtk: 0, tmpDef: 0, equipAtk: 0, equipDef: 0,
    owner: side, used: {},
  };
}

function triggerSummonFx(G, p, mon) {
  const d = CARDS[mon.id];
  for (const f of fx(d)) {
    if (SUMMON_FX.has(f.k)) applyFx(G, p, f, { mon });
  }
}

// ------------------------------------------------------------------ 效果
function applyFx(G, p, f, ctx) {
  const o = G.players[1 - p.idx];
  const mon = ctx && ctx.mon;
  switch (f.k) {
    case 'draw': drawCards(G, p, f.v || 1); break;
    case 'burn': damagePlayer(G, o, (f.v || 0) + bondNum(p, 'burnBonus'), 'effect'); break;
    case 'heal': heal(G, p, f.v || 0); break;
    case 'costLp': damagePlayer(G, p, f.v || 0, 'cost'); break;
    case 'bothDraw': drawCards(G, p, f.v || 1); drawCards(G, o, f.v || 1); break;
    case 'discardOpp': discardRandom(G, o, f.v || 1); break;
    case 'recall': {
      const want = f.f || 'monster';
      const kk = want === 'monster' ? 'M' : want === 'spell' ? 'S' : 'T';
      for (let i = p.grave.length - 1; i >= 0; i--) {
        const d = CARDS[p.grave[i]];
        if (d && d.k === kk) {
          const id = p.grave.splice(i, 1)[0];
          if (p.hand.length < HAND_MAX) p.hand.push({ uid: G.uid++, id });
          log(G, `${pname(p)}从墓地取回「${d.n}」`, 'spell');
          break;
        }
      }
      break;
    }
    case 'search': {
      const want = f.f || 'spell';
      const i = p.deck.findIndex((id) => {
        const d = CARDS[id];
        if (!d) return false;
        if (want === 'spell' && d.k !== 'S') return false;
        if (want === 'trap' && d.k !== 'T') return false;
        if (want === 'monster' && d.k !== 'M') return false;
        if (f.r && f.r !== 'any' && d.r !== f.r) return false;
        if (f.max && d.lv && d.lv > f.max) return false;
        return true;
      });
      if (i >= 0) {
        const id = p.deck.splice(i, 1)[0];
        if (p.hand.length < HAND_MAX) p.hand.push({ uid: G.uid++, id });
        log(G, `${pname(p)}检索了「${CARDS[id].n}」`, 'spell');
      } else {
        log(G, `${pname(p)}想检索，但卡组里没有符合条件的牌`, 'info');
      }
      break;
    }
    case 'bounce': {
      const t = strongest(o);
      if (t) {
        removeMon(G, o, t);
        if (o.hand.length < HAND_MAX) o.hand.push({ uid: G.uid++, id: t.id });
        log(G, `「${CARDS[t.id].n}」被弹回${pname(o)}的手牌`, 'spell');
      }
      break;
    }
    case 'snipe':
    case 'snipeDraw': {
      const s = o.spells.find((x) => x && x.set);
      if (s) {
        o.spells[o.spells.indexOf(s)] = null;
        o.grave.push(s.id);
        log(G, `${pname(p)}破坏了${pname(o)}盖放的「${CARDS[s.id].n}」`, 'spell');
      }
      if (f.k === 'snipeDraw') drawCards(G, p, 1);
      break;
    }
    case 'weaken': {
      const t = strongest(o);
      if (t) {
        t.atk = Math.max(0, t.atk - (f.v || 0));
        log(G, `「${CARDS[t.id].n}」攻击力下降 ${f.v}`, 'spell');
      }
      break;
    }
    case 'pumpSelf': if (mon) { mon.atk += f.v || 0; log(G, `「${CARDS[mon.id].n}」攻击力永久 +${f.v}`, 'buff'); } break;
    case 'destroyStrongest': {
      const t = strongest(o);
      if (t) destroyMon(G, o, t, '效果破坏');
      break;
    }
    case 'destroyWeak': {
      const t = strongest(o);
      if (t && atkOf(G, o, t) <= (f.v || 0)) destroyMon(G, o, t, '效果破坏');
      else log(G, `「忘却之楔」没能破坏任何怪兽`, 'info');
      break;
    }
    case 'pumpHighest': {
      const t = strongest(p);
      if (t) { t.atk += f.v || 0; log(G, `「${CARDS[t.id].n}」攻击力永久 +${f.v}`, 'buff'); }
      break;
    }
    case 'quickAtkAll': {
      for (const m of p.mons) if (m) m.tmpAtk += f.v || 0;
      log(G, `${pname(p)}的全部怪兽本回合攻击力 +${f.v}`, 'buff');
      break;
    }
    case 'quickDef': {
      for (const m of p.mons) if (m) m.tmpDef += f.v || 0;
      log(G, `${pname(p)}的全部怪兽本回合守备力 +${f.v}`, 'buff');
      break;
    }
    case 'quickDirect': {
      const t = p.mons.filter(Boolean).sort((a, b) => atkOf(G, p, b) - atkOf(G, p, a))[0];
      if (t) { t.direct = true; log(G, `「${CARDS[t.id].n}」本回合可以直接攻击`, 'buff'); }
      break;
    }
    case 'weakenEnemyAll': {
      for (const m of o.mons) if (m) m.tmpAtk -= f.v || 0;
      log(G, `${pname(o)}的全部怪兽本回合攻击力 -${f.v}`, 'spell');
      break;
    }
    case 'weakenHighest': {
      const t = strongest(o);
      if (t) { t.tmpAtk -= f.v || 0; log(G, `「${CARDS[t.id].n}」本回合攻击力 -${f.v}`, 'spell'); }
      break;
    }
    case 'battleBoost': {
      for (const m of p.mons) if (m) m.tmpAtk += f.v || 0;
      log(G, `「巡夜人的灯」：${pname(p)}全部怪兽本回合攻击力 +${f.v}`, 'buff');
      break;
    }
    case 'graveBurn': {
      const n = Math.min(f.max || 5, p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'M' && (!f.r || CARDS[id].r === f.r)).length);
      damagePlayer(G, o, n * (f.v || 0), 'effect');
      break;
    }
    case 'graveHeal': {
      const n = p.grave.filter((id) => CARDS[id] && CARDS[id].k === 'M').length;
      if (n) heal(G, p, n * (f.v || 0));
      break;
    }
    case 'realmDraw': {
      const n = Math.min(f.v || 2, p.mons.filter((m) => m && realmOf(m.id) === f.r).length);
      if (n) drawCards(G, p, n);
      break;
    }
    case 'echoDraw': drawCards(G, p, 1); drawCards(G, o, 1); drawCards(G, p, 1); break;
    case 'selfBurnDraw': damagePlayer(G, p, f.v || 1000, 'cost'); drawCards(G, p, 2); break;
    case 'lpDraw': damagePlayer(G, p, f.v || 1000, 'cost'); drawCards(G, p, 2); break;
    case 'sacrificeHeal': {
      const t = weakest(p);
      if (t) {
        destroyMon(G, p, t, '祭品');
        heal(G, p, f.v || 1500);
        drawCards(G, p, 1);
      }
      break;
    }
    case 'sweepWeak': {
      for (let s = 0; s < 2; s++) {
        const pl = G.players[s];
        for (const m of pl.mons.slice()) {
          if (m && atkOf(G, pl, m) <= (f.v || 1500)) destroyMon(G, pl, m, '效果破坏');
        }
      }
      break;
    }
    case 'discardOpp2': discardRandom(G, o, 2); break;
    case 'tradeDraw': drawCards(G, o, 1); drawCards(G, p, 2); break;
    case 'healDraw': heal(G, p, f.v || 1000); drawCards(G, p, 1); break;
    case 'reflect': break; // 由战斗流程处理
    case 'contHeal': case 'contBurn': case 'contBoth': case 'contPunish':
    case 'summonTaxDiscard': case 'extraDraw': case 'equipAtk': case 'equipDef':
    case 'turnHeal': case 'atkUpTurn': case 'onKillAtk': case 'onKillDraw':
    case 'onDestroyDraw': case 'onDestroyBurn': case 'revive': case 'lastStand':
    case 'pierce': case 'guard': case 'aura': case 'auraDef': case 'drain':
    case 'directDiscard': case 'snipeAttack': case 'negateTrapOnce': case 'spellShield':
    case 'twin': case 'destroyAttacker': case 'negateAttack': case 'negateSpell':
    case 'negateSummon': case 'destroySummon': case 'negateSpellSnipe': case 'negateTrap':
      break;
    default:
      log(G, `[未实现的效果 ${f.k}]`, 'warn');
      break;
  }
}

function strongest(p) {
  return p.mons.filter(Boolean).sort((a, b) => b.atk - a.atk)[0] || null;
}
function weakest(p) {
  return p.mons.filter(Boolean).sort((a, b) => a.atk - b.atk)[0] || null;
}

function discardRandom(G, p, n) {
  for (let i = 0; i < n; i++) {
    if (!p.hand.length) { log(G, `${pname(p)}没有手牌可弃`, 'info'); return; }
    const j = Math.floor(G.rng() * p.hand.length);
    const h = p.hand.splice(j, 1)[0];
    p.grave.push(h.id);
    log(G, `${pname(p)}丢弃了「${CARDS[h.id].n}」`, 'discard');
  }
}

// ------------------------------------------------------------------ 破坏
function toGrave(G, p, mon, reason) {
  const d = CARDS[mon.id];
  // 装备卡跟着走
  for (let i = 0; i < p.spells.length; i++) {
    const s = p.spells[i];
    if (s && s.equipOn === mon.uid) { p.spells[i] = null; p.grave.push(s.id); }
  }
  p.grave.push(mon.id);
  log(G, `「${d.n}」${reason || '被破坏'}，送去墓地`, 'grave');
}

function removeMon(G, p, mon) {
  const i = p.mons.indexOf(mon);
  if (i >= 0) p.mons[i] = null;
}

function destroyMon(G, p, mon, reason) {
  if (!mon) return;
  const d = CARDS[mon.id];
  if (hasFx(mon, 'lastStand') && !mon.used.stand) {
    mon.used.stand = true;
    log(G, `「${d.n}」扛住了这一击，没有被战斗破坏`, 'buff');
    return;
  }
  if (hasFx(mon, 'revive') && !mon.used.revive) {
    mon.used.revive = true;
    removeMon(G, p, mon);
    if (p.hand.length < HAND_MAX) p.hand.push({ uid: G.uid++, id: mon.id });
    log(G, `「${d.n}」回到${pname(p)}的手牌`, 'buff');
    return;
  }
  removeMon(G, p, mon);
  toGrave(G, p, mon, reason);
  for (const f of fx(d)) {
    if (f.k === 'onDestroyDraw') drawCards(G, p, f.v || 1);
    if (f.k === 'onDestroyBurn') damagePlayer(G, G.players[1 - p.idx], f.v || 0, 'effect');
  }
}

// ------------------------------------------------------------------ 魔法 / 陷阱
function activateSpell(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段发动魔法');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'S') return fail('这不是魔法卡');
  const isCont = d.t === 'cont' || d.t === 'equip';
  if (isCont && freeSlot(p.spells) < 0) return fail('魔法·陷阱区已经满了');

  // 对方的反击陷阱
  if (counterTrap(G, 1 - side, 'spell')) {
    p.hand.splice(hi, 1);
    p.grave.push(id);
    return ok();
  }

  p.hand.splice(hi, 1);
  log(G, `${pname(p)}发动魔法「${d.n}」`, 'spell');

  if (isCont) {
    const slot = freeSlot(p.spells);
    const card = { uid: G.uid++, id, set: false, turnSet: G.turn, equipOn: 0 };
    if (d.t === 'equip') {
      const t = strongest(p);
      if (!t) { p.grave.push(id); log(G, `没有可以装备的怪兽，「${d.n}」落空`, 'info'); return ok(); }
      card.equipOn = t.uid;
      for (const f of fx(d)) {
        if (f.k === 'equipAtk') t.atk += f.v || 0;
        if (f.k === 'equipDef') { t.def += f.v || 0; t.equipDef += f.v || 0; }
      }
      log(G, `「${d.n}」装备在「${CARDS[t.id].n}」上`, 'buff');
    }
    p.spells[slot] = card;
    if (d.t === 'cont') {
      for (const f of fx(d)) {
        if (f.k === 'extraDraw') log(G, `「${d.n}」生效：每回合多抽 ${f.v} 张`, 'buff');
      }
    }
  } else {
    for (const f of fx(d)) applyFx(G, p, f, {});
    p.grave.push(id);
  }
  return ok();
}

function setTrap(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段盖放');
  const hi = p.hand.findIndex((h) => h.uid === uid);
  if (hi < 0) return fail('这张牌不在手牌里');
  const id = p.hand[hi].id;
  const d = CARDS[id];
  if (!d || d.k !== 'T') return fail('只能盖放陷阱卡');
  const slot = freeSlot(p.spells);
  if (slot < 0) return fail('魔法·陷阱区已经满了');
  p.hand.splice(hi, 1);
  p.spells[slot] = { uid: G.uid++, id, set: true, turnSet: G.turn, equipOn: 0 };
  log(G, `${pname(p)}盖放了一张陷阱`, 'trap');
  return ok();
}

function canUse(G, side, uid) {
  const p = G.players[side];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return null;
  const d = CARDS[h.id];
  if (!d) return null;
  if (d.k === 'M') return canSummon(G, p, h.id) ? 'summon' : null;
  if (d.k === 'S') return 'spell';
  if (d.k === 'T') return 'trap';
  return null;
}

// ---- 陷阱的自动迎击：本作的陷阱不设「是否发动」的询问，
// 满足条件就开（规则页里写明了）。这样玩家不用在每个时点被弹窗打断，
// AI 也不用模拟对手的犹豫。
function trapActive(p) {
  return p.spells.filter((s) => s && !s.set && CARDS[s.id] && CARDS[s.id].k === 'T');
}
function fire(G, owner, s, keep) {
  const d = CARDS[s.id];
  log(G, `${pname(owner)}发动陷阱「${d.n}」`, 'trap');
  if (!keep) {
    owner.spells[owner.spells.indexOf(s)] = null;
    owner.grave.push(s.id);
  } else {
    s.set = false;
  }
  return d;
}

function counterTrap(G, side, trigger) {
  const p = G.players[side];
  for (const s of p.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T' || d.t !== 'counter') continue;
    const hit = fx(d).some((f) => (
      (trigger === 'spell' && (f.k === 'negateSpell' || f.k === 'negateSpellSnipe'))
      || (trigger === 'trap' && f.k === 'negateTrap')
      || (trigger === 'summon' && f.k === 'negateSummon')
    ));
    if (!hit) continue;
    fire(G, p, s, false);
    for (const f of fx(d)) {
      if (f.k === 'negateSpellSnipe') {
        const o = G.players[1 - side];
        const t = o.spells.find((x) => x && x.set);
        if (t) { o.spells[o.spells.indexOf(t)] = null; o.grave.push(t.id); log(G, `「${CARDS[t.id].n}」被连带破坏`, 'trap'); }
      }
    }
    return true;
  }
  return false;
}

function summonTraps(G, p, mon) {
  const o = G.players[1 - p.idx];
  for (const s of o.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    const f = fx(d);
    const neg = f.find((x) => x.k === 'negateSummon');
    const dst = f.find((x) => x.k === 'destroySummon');
    if (neg) {
      fire(G, o, s, false);
      log(G, `「${CARDS[mon.id].n}」的召唤被无效`, 'trap');
      removeMon(G, p, mon);
      p.grave.push(mon.id);
      return true;
    }
    if (dst && atkOf(G, p, mon) <= (dst.v || 2000)) {
      fire(G, o, s, false);
      destroyMon(G, p, mon, '被陷阱破坏');
      return true;
    }
  }
  // 永续魔法「沉于深渊」：对方每次召唤都要丢牌
  for (const s of o.spells) {
    if (!s || s.set) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'S') continue;
    for (const f of fx(d)) if (f.k === 'summonTaxDiscard') discardRandom(G, p, f.v || 1);
  }
  return false;
}

// 攻击宣言时点：先结算已发动的永续陷阱，再结算盖放的陷阱。
// 返回值：'destroyed'（攻击者没了）/ 'negated'（攻击无效）/ 'reflect'（伤害反弹）/ null
function attackTraps(G, atkSide, atkMon, direct) {
  const defSide = 1 - atkSide;
  const def = G.players[defSide];

  for (const s of trapActive(def)) {
    const d = CARDS[s.id];
    for (const f of fx(d)) {
      if (f.k === 'contPunish') {
        heal(G, def, 500);
        damagePlayer(G, G.players[atkSide], f.v || 300, 'trap');
      }
    }
  }

  for (const s of def.spells.slice()) {
    if (!s || !s.set || s.turnSet >= G.turn) continue;
    const d = CARDS[s.id];
    if (!d || d.k !== 'T') continue;
    const list = fx(d);
    const neg = list.find((x) => x.k === 'negateAttack');
    const dst = list.find((x) => x.k === 'destroyAttacker');
    const ref = list.find((x) => x.k === 'reflect');
    const boost = list.find((x) => x.k === 'battleBoost');
    if (neg) { fire(G, def, s, false); log(G, '那次攻击被无效了', 'trap'); return 'negated'; }
    if (dst) {
      fire(G, def, s, false);
      destroyMon(G, G.players[atkSide], atkMon, '被陷阱破坏');
      return 'destroyed';
    }
    if (ref && direct) { fire(G, def, s, false); damagePlayer(G, G.players[atkSide], ref.v || 1000, 'trap'); return 'reflect'; }
    if (boost) { fire(G, def, s, false); applyFx(G, def, boost, {}); }
  }
  return null;
}

// ------------------------------------------------------------------ 战斗
function attack(G, side, monUid, targetUid) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'battle') return fail('现在不是战斗阶段');
  const a = p.mons.find((m) => m && m.uid === monUid);
  if (!a) return fail('找不到这只怪兽');
  if (!canAttack(G, p, a)) return fail('这只怪兽这个回合不能再攻击了');

  const guard = guardOf(o);
  const target = targetUid ? o.mons.find((m) => m && m.uid === targetUid) : null;
  if (guard && (!target || target !== guard)) return fail('「' + CARDS[guard.id].n + '」挡在前面，必须先打它');
  if (!target && o.mons.filter(Boolean).length && !a.direct) return fail('对方场上有怪兽，不能直接攻击');
  if (target && guard && target !== guard) return fail('必须先处理守备的怪兽');

  a.atkCount++;
  const av = atkOf(G, p, a);
  const direct = !target;

  // 攻击宣言效果（达芙黛尔之类）
  if (hasFx(a, 'snipeAttack')) {
    const s = o.spells.find((x) => x && x.set);
    if (s) { o.spells[o.spells.indexOf(s)] = null; o.grave.push(s.id); log(G, `「${CARDS[a.id].n}」破坏了盖放的「${CARDS[s.id].n}」`, 'monster'); }
  }

  const stop = attackTraps(G, side, a, direct);
  if (stop === 'destroyed' || G.over) return ok();

  if (direct) {
    if (stop === 'reflect') { log(G, `${pname(p)}的直接攻击被「忘却的代价」弹了回去`, 'trap'); return ok(); }
    if (stop === 'negated') return ok();
    log(G, `${pname(p)}直接攻击`, 'battle');
    damagePlayer(G, o, av, 'battle');
    if (hasFx(a, 'directDiscard') && fxV(a, 'directDiscard')) discardRandom(G, o, fxV(a, 'directDiscard'));
    afterBattleDamage(G, p, o, a, av);
    return ok();
  }

  if (stop === 'negated') return ok();
  if (stop === 'reflect') { log(G, '那次攻击被「忘却的代价」弹了回去', 'trap'); return ok(); }

  const wasSet = target.set;
  if (wasSet) {
    target.set = false;
    log(G, `盖放的「${CARDS[target.id].n}」被翻开了`, 'info');
  }
  const dv = target.pos === 'atk' ? atkOf(G, o, target) : defOf(G, o, target);

  if (target.pos === 'atk') {
    // 攻击表示互殴
    if (av > dv) {
      const diff = av - dv;
      destroyMon(G, o, target, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」破坏了「${CARDS[target.id].n}」`, 'battle');
      damagePlayer(G, o, diff, 'battle');
      afterKill(G, p, o, a);
      afterBattleDamage(G, p, o, a, diff);
    } else if (av < dv) {
      const diff = dv - av;
      destroyMon(G, p, a, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」被「${CARDS[target.id].n}」击破`, 'battle');
      damagePlayer(G, p, diff, 'battle');
    } else {
      destroyMon(G, o, target, '同归于尽');
      destroyMon(G, p, a, '同归于尽');
      log(G, '两只怪兽同归于尽', 'battle');
    }
  } else {
    // 打守备
    if (av > dv) {
      const diff = av - dv;
      destroyMon(G, o, target, '被战斗破坏');
      log(G, `「${CARDS[a.id].n}」破坏了守备的「${CARDS[target.id].n}」`, 'battle');
      if (hasFx(a, 'pierce')) {
        log(G, '贯穿！', 'battle');
        damagePlayer(G, o, diff, 'battle');
        afterBattleDamage(G, p, o, a, diff);
      }
      afterKill(G, p, o, a);
    } else if (av < dv) {
      const diff = dv - av;
      log(G, '攻击被挡下了', 'battle');
      damagePlayer(G, p, diff, 'battle');
    } else {
      log(G, '攻击力与守备力相同，什么也没发生', 'info');
    }
  }
  return ok();
}

function afterKill(G, p, o, a) {
  if (hasFx(a, 'onKillAtk')) { a.atk += fxV(a, 'onKillAtk'); log(G, `「${CARDS[a.id].n}」攻击力永久 +${fxV(a, 'onKillAtk')}`, 'buff'); }
  if (hasFx(a, 'onKillDraw')) drawCards(G, p, fxV(a, 'onKillDraw'));
}

function afterBattleDamage(G, p, o, a, dmg) {
  if (hasFx(a, 'drain')) {
    const pct = fxV(a, 'drain') || 100;
    const h = Math.floor(dmg * pct / 100);
    if (h > 0) { heal(G, p, h); }
  }
}

// ------------------------------------------------------------------ 觉醒召唤
function canAwaken(G, p, extraId) {
  const d = CARDS[extraId];
  if (!d || d.k !== 'E') return null;
  if (p.extra.indexOf(extraId) < 0) return null;
  if (G.active !== p.idx || G.phase !== 'main' || G.over) return null;
  const own = p.mons.filter(Boolean);
  if (d.matRealm === 'any') {
    // 需要两只界域不同的怪兽
    for (let i = 0; i < own.length; i++) {
      for (let j = i + 1; j < own.length; j++) {
        if (realmOf(own[i].id) !== realmOf(own[j].id)) return [own[i].uid, own[j].uid];
      }
    }
    return null;
  }
  const need = (d.mat || []).slice();
  const picked = [];
  for (const name of need) {
    const m = own.find((x) => CARDS[x.id].n === name && picked.indexOf(x) < 0);
    if (!m) return null;
    picked.push(m);
  }
  return picked.map((x) => x.uid);
}

function awaken(G, side, extraId) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  const mats = canAwaken(G, p, extraId);
  if (!mats) return fail('素材还没凑齐');
  const d = CARDS[extraId];
  // 素材本身就是位置：先把它们送墓，再拿空位（满场也能觉醒）
  for (const u of mats) {
    const m = p.mons.find((x) => x && x.uid === u);
    if (!m) continue;
    removeMon(G, p, m);
    toGrave(G, p, m, '觉醒素材');
  }
  const slot = freeSlot(p.mons);
  if (slot < 0) return fail('怪兽区已经满了，先腾一个位置');
  p.extra.splice(p.extra.indexOf(extraId), 1);
  const mon = mkMon(G, extraId, side);
  p.mons[slot] = mon;
  log(G, `${pname(p)}觉醒召唤「${d.n}」！`, 'awaken');
  if (d.matRealm === 'any') {
    // 校猫：登场时猫叫一声，抽一张、对手丢一张，已经在 fx 里
  }
  triggerSummonFx(G, p, mon);
  return ok();
}

// ------------------------------------------------------------------ 回合
function beginTurn(G) {
  const p = G.players[G.active];
  G.phase = 'main';
  p.normalUsed = false;
  for (const m of p.mons) if (m) { m.atkCount = 0; m.tmpAtk = 0; m.tmpDef = 0; m.direct = false; }

  // 回合开始效果
  for (const m of p.mons) {
    if (!m) continue;
    if (hasFx(m, 'turnHeal')) heal(G, p, fxV(m, 'turnHeal'));
    if (hasFx(m, 'atkUpTurn')) { m.atk += fxV(m, 'atkUpTurn'); log(G, `「${CARDS[m.id].n}」攻击力 +${fxV(m, 'atkUpTurn')}`, 'buff'); }
  }
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) {
      if (f.k === 'contBoth') { heal(G, p, f.v || 300); damagePlayer(G, G.players[1 - p.idx], f.v || 300, 'effect'); }
    }
  }

  // 抽卡（先手第一回合不抽）
  let n = 1;
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'extraDraw') n += f.v || 0;
  }
  if (!(G.turn === 1 && G.active === 0)) drawCards(G, p, n);
  log(G, `—— 第 ${Math.ceil(G.turn / 2)} 回合 · ${pname(p)} ——`, 'turn');
  checkOver(G);
}

function endTurn(G) {
  if (G.over) return fail('对决已经结束了');
  const p = G.players[G.active];
  const o = G.players[1 - G.active];

  // 结束阶段：永续回复 / 持续伤害
  for (const s of p.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'contHeal') heal(G, p, f.v || 0);
  }
  for (const b of p.bonds) for (const f of b.fx || []) if (f.k === 'healPerTurn') heal(G, p, f.v || 0);
  // 对方的「终天之诗」在自己的回合结束时烧人
  for (const s of o.spells) {
    if (!s || s.set) continue;
    for (const f of fx(CARDS[s.id])) if (f.k === 'contBurn') damagePlayer(G, p, f.v || 0, 'trap');
  }
  if (G.over) return ok();

  G.turn++;
  G.active = 1 - G.active;
  beginTurn(G);
  return ok();
}

function toBattle(G, side) {
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('现在不是主要阶段');
  G.phase = 'battle';
  log(G, `${pname(G.players[side])}进入战斗阶段`, 'info');
  return ok();
}

function toMain2(G, side) {
  if (G.active !== side) return fail('现在不是你的回合');
  G.phase = 'main';
  return ok();
}

function changePos(G, side, uid) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段改变表示');
  const m = p.mons.find((x) => x && x.uid === uid);
  if (!m) return fail('找不到这只怪兽');
  if (m.set) { m.set = false; m.pos = 'def'; log(G, `「${CARDS[m.id].n}」翻开了`, 'info'); return ok(); }
  m.pos = m.pos === 'atk' ? 'def' : 'atk';
  log(G, `「${CARDS[m.id].n}」改为${m.pos === 'atk' ? '攻击' : '守备'}表示`, 'info');
  return ok();
}

// 给 UI 用：这一页能看的信息（对手盖放的怪兽不暴露身份）
function publicView(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  const mons = (pl, hide) => pl.mons.map((m) => {
    if (!m) return null;
    const hidden = hide && m.set;
    return {
      uid: m.uid, id: hidden ? null : m.id, pos: m.pos, set: m.set,
      atk: hidden ? null : atkOf(G, pl, m),
      def: hidden ? null : defOf(G, pl, m),
      canAtk: !hide && canAttack(G, pl, m),
      guard: hidden ? false : hasFx(m, 'guard'),
    };
  });
  return {
    turn: G.turn, phase: G.phase, active: G.active, over: G.over, winner: G.winner,
    me: { lp: p.lp, lpMax: p.lpMax, deck: p.deck.length, hand: p.hand, mons: mons(p, false), spells: p.spells, grave: p.grave.length, extra: p.extra, bonds: p.bonds, normalUsed: p.normalUsed },
    op: {
      lp: o.lp, lpMax: o.lpMax, deck: o.deck.length, hand: o.hand.length,
      mons: mons(o, true),
      spells: o.spells.map((s) => (s ? { uid: s.uid, id: s.set ? null : s.id, set: s.set } : null)),
      grave: o.grave.length, extra: o.extra.length, bonds: o.bonds,
    },
    log: G.log.slice(-40),
  };
}
return { LP_MAX, ZONES, HAND_MAX, REALM, log, evalBonds, createGame, drawCards, atkOf, defOf, maxAttacks, canAttack, tributeNeed, canSummon, summon, setMonster, toGrave, removeMon, destroyMon, activateSpell, setTrap, canUse, attack, canAwaken, awaken, beginTurn, endTurn, toBattle, toMain2, changePos, publicView };
})();

// ---- js/duel/ai.js
const m_ai = await (async () => {
const { CARDS } = m_gen;
const { atkOf, defOf, canAttack, canSummon, canAwaken, tributeNeed } = m_engine;
// 对手 AI。它不直接改状态：每一拍返回「下一步想做什么」，
// 由页面（view.js）执行 + 等待一下再问下一拍，这样玩家能看清对手在干什么。
//
// 设计取向：会算数值，但不算未来的牌。它的强度来自「不浪费」——
// 不做亏本交换、不在能斩杀的时候去盖牌、该打脸的时候不打墙。



function d(id) { return CARDS[id]; }

// 这张魔法现在值不值得开？返回分数，0 表示不该开。
function scoreSpell(G, p, o, card) {
  const def = d(card.id);
  let s = 0;
  for (const f of def.fx || []) {
    if (f.k === 'draw') s += 6;
    if (f.k === 'echoDraw') s += 5;
    if (f.k === 'tradeDraw') s += 4;
    if (f.k === 'lpDraw') s += p.lp > 2500 ? 5 : -20;
    if (f.k === 'selfBurnDraw') s += p.lp > 2500 ? 5 : -20;
    if (f.k === 'realmDraw') s += 4;
    if (f.k === 'burn') s += (f.v || 0) >= o.lp ? 20 : (f.v || 600) / 200;
    if (f.k === 'graveBurn') s += p.grave.length >= 3 ? 4 : 1;
    if (f.k === 'destroyWeak') {
      const t = o.mons.filter(Boolean).sort((a, b) => b.atk - a.atk)[0];
      s += t && atkOf(G, o, t) <= 1800 ? 8 : -5;
    }
    if (f.k === 'bounce' || f.k === 'bounce' ) s += o.mons.filter(Boolean).length ? 6 : -5;
    if (f.k === 'snipeDraw' || f.k === 'snipe') s += o.spells.some((x) => x && x.set) ? 7 : 1;
    if (f.k === 'pumpHighest') s += p.mons.filter(Boolean).length ? 5 : -5;
    if (f.k === 'quickAtkAll') s += p.mons.filter(Boolean).length >= 2 ? 5 : 1;
    if (f.k === 'quickDef') s += p.mons.filter(Boolean).length ? 3 : 0;
    if (f.k === 'quickDirect') s += p.mons.filter(Boolean).length ? 6 : 0;
    if (f.k === 'heal' || f.k === 'healDraw') s += p.lp < 3000 ? 5 : 1;
    if (f.k === 'graveHeal') s += p.lp < 3500 && p.grave.length >= 2 ? 5 : 0;
    if (f.k === 'sacrificeHeal') s += p.mons.filter(Boolean).length >= 2 ? 3 : -10;
    if (f.k === 'discardOpp') s += o.hand.length ? 5 : -2;
    if (f.k === 'sweepWeak') {
      const mine = p.mons.filter(Boolean).filter((m) => atkOf(G, p, m) <= 1500).length;
      const theirs = o.mons.filter(Boolean).filter((m) => atkOf(G, o, m) <= 1500).length;
      s += theirs > mine ? 6 : -10;
    }
    if (f.k === 'weakenEnemyAll' || f.k === 'weakenHighest') s += o.mons.filter(Boolean).length ? 4 : -5;
    if (f.k === 'equipAtk' || f.k === 'equipDef') s += p.mons.filter(Boolean).length ? 4 : -5;
    if (f.k === 'contHeal' || f.k === 'contBoth') s += p.lp < 4500 ? 5 : 2;
    if (f.k === 'contBurn') s += 4;
    if (f.k === 'extraDraw') s += 7;
    if (f.k === 'summonTaxDiscard') s += 4;
    if (f.k === 'searchMonster' || f.k === 'search') s += 5;
    if (f.k === 'bothDraw') s += 1;
  }
  // 开局手牌多的时候先铺场，别一上来就把资源全换成抽牌
  if (p.mons.filter(Boolean).length === 0 && def.k === 'S' && def.t !== 'cont' && s <= 6) s -= 2;
  return s;
}

function bestSpell(G, p, o) {
  let best = null;
  let bestScore = 0;
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'S') continue;
    const isCont = def.t === 'cont' || def.t === 'equip';
    if (isCont && p.spells.indexOf(null) < 0) continue;
    const s = scoreSpell(G, p, o, h);
    if (s > bestScore) { bestScore = s; best = h; }
  }
  return bestScore >= 4 ? best : null;
}

function summonOptions(G, p) {
  const out = [];
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'M') continue;
    if (!canSummon(G, p, h.id)) continue;
    const need = tributeNeed(h.id);
    let tribs = [];
    if (need > 0) {
      const own = p.mons.filter(Boolean).sort((a, b) => atkOf(G, p, a) - atkOf(G, p, b));
      if (own.length < need) continue;
      tribs = own.slice(0, need).map((m) => m.uid);
    }
    out.push({ uid: h.uid, id: h.id, need, tribs, atk: def.atk });
  }
  return out;
}

function bestSummon(G, p) {
  const opts = summonOptions(G, p);
  if (!opts.length) return null;
  // 有祭品的选项要先算「亏不亏」：献出去的攻击力总和不能超过新怪兽带来的提升太多
  const scored = opts.map((x) => {
    const lost = x.tribs.reduce((s, u) => {
      const m = p.mons.find((y) => y && y.uid === u);
      return s + (m ? atkOf(G, p, m) : 0);
    }, 0);
    const gain = x.atk - lost;
    return { ...x, score: gain + (x.tribs.length ? 0 : 300) };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  // 献祭召唤只有在明显更强时才做（否则宁可留着墙）
  if (top.tribs.length && top.score < 400) return null;
  return top;
}

function bestAttack(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  let best = null;
  let bestScore = 0;
  const guard = o.mons.find((m) => m && !m.set && m.pos === 'def' && (d(m.id).fx || []).some((f) => f.k === 'guard'));

  for (const a of p.mons) {
    if (!a || !canAttack(G, p, a)) continue;
    const av = atkOf(G, p, a);
    const pierce = (d(a.id).fx || []).some((f) => f.k === 'pierce');
    const targets = guard ? [guard] : o.mons.filter(Boolean);

    if (!targets.length) {
      const sc = av + (o.lp <= av ? 100 : 0);
      if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: null }; }
      continue;
    }
    for (const t of targets) {
      if (t.set) {
        // 盖放的怪：只能赌它的守备力，低攻怪不去撞
        if (av >= 1500) {
          const sc = av - 1200 + (pierce ? 400 : 0);
          if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: t.uid }; }
        }
        continue;
      }
      const tv = t.pos === 'atk' ? atkOf(G, o, t) : defOf(G, o, t);
      if (av > tv) {
        const dmg = t.pos === 'atk' ? av - tv : (pierce ? av - tv : 0);
        const sc = tv + dmg * 2 + (t.pos === 'atk' ? 200 : 0);
        if (sc > bestScore) { bestScore = sc; best = { uid: a.uid, target: t.uid }; }
      } else if (av === tv && t.pos === 'atk') {
        if (300 > bestScore) { bestScore = 300; best = { uid: a.uid, target: t.uid }; }
      }
    }
  }
  return bestScore > 0 ? best : null;
}

// 返回「下一步」：{ t: 'awaken'|'spell'|'summon'|'setMon'|'trap'|'pos'|'battle'|'attack'|'end', ... }
function nextAction(G, side, skill) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return null;
  const sloppy = skill === 'easy' ? 0.35 : skill === 'hard' ? 0 : 0.12;

  if (G.phase === 'main') {
    // 1. 觉醒体优先：素材已经站住了就别再拖
    for (const id of p.extra) {
      if (canAwaken(G, p, id)) return { t: 'awaken', id };
    }
    // 2. 该斩杀了就直接烧
    for (const h of p.hand) {
      const def = d(h.id);
      if (!def || def.k !== 'S') continue;
      for (const f of def.fx || []) {
        if (f.k === 'burn' && (f.v || 0) >= o.lp) return { t: 'spell', uid: h.uid };
      }
    }
    // 3. 魔法
    if (G.rng() >= sloppy) {
      const sp = bestSpell(G, p, o);
      if (sp) return { t: 'spell', uid: sp.uid };
    }
    // 4. 召唤
    const sum = bestSummon(G, p);
    if (sum) return { t: 'summon', uid: sum.uid, tribs: sum.tribs };
    // 5. 盖一只守备怪（手里有高守备、场上又空的时候）
    if (p.mons.filter(Boolean).length < 2) {
      const cand = p.hand.filter((h) => {
        const def = d(h.id);
        return def && def.k === 'M' && tributeNeed(h.id) === 0;
      }).sort((a, b) => d(b.id).def - d(a.id).def)[0];
      if (cand && d(cand.id).def >= 1800 && !p.normalUsed) return { t: 'setMon', uid: cand.uid };
    }
    // 6. 盖陷阱（最多两张，别把手牌全变成盖牌）
    const traps = p.hand.filter((h) => d(h.id) && d(h.id).k === 'T');
    const setCount = p.spells.filter((s) => s && s.set).length;
    if (traps.length && setCount < 2 && p.spells.indexOf(null) >= 0) {
      return { t: 'trap', uid: traps[0].uid };
    }
    // 7. 低攻怪兽转守备
    const weakAtk = p.mons.find((m) => m && m.pos === 'atk' && !m.set && atkOf(G, p, m) < 1600);
    if (weakAtk && o.mons.filter(Boolean).some((m) => m.pos === 'atk' && atkOf(G, o, m) > atkOf(G, p, weakAtk))) {
      return { t: 'pos', uid: weakAtk.uid };
    }
    return { t: 'battle' };
  }

  if (G.phase === 'battle') {
    const atk = bestAttack(G, side);
    if (atk && G.rng() >= sloppy * 0.5) return { t: 'attack', uid: atk.uid, target: atk.target };
    return { t: 'end' };
  }
  return { t: 'end' };
}
return { nextAction };
})();

// ---- js/duel/store.js
const m_store = await (async () => {

// 对战页的存档：银芯、收藏、战绩。
// 只写 localStorage，不碰云端档案（云端字段是给「九个游戏」的分数用的，
// 这里的东西换设备靠加密存档整包搬，和挂机版同一套思路）。
const KEY = 'zjtt:duel:v1';

const DEFAULT = { silver: 180, coll: {}, opened: 0, wins: 0, losses: 0, deck: 'd1', diff: 'normal' };

function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return Object.assign({}, DEFAULT);
    const o = JSON.parse(raw);
    return Object.assign({}, DEFAULT, o, { coll: (o && o.coll) || {} });
  } catch (e) {
    return Object.assign({}, DEFAULT);
  }
}

function saveSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 隐私模式里写不进去，不影响玩 */ }
}

function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 同上 */ }
}
return { loadSave, saveSave, resetSave };
})();

// ---- js/duel/view.js
const m_view = await (async () => {
const { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART } = m_gen;
const E = m_engine;
const { nextAction } = m_ai;
const { loadSave, saveSave } = m_store;
// 页面层：首页 / 对战 / 卡包 / 卡表 / 世界观。
// 所有规则判断都走 engine.js，这里只负责「把状态画出来」和「把点击翻译成操作」。





const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PACK_PRICE = 60;

const REALM_TXT = { chaos: '混沌', caro: '血肉', aqua: '深海', ultra: '超维', any: '无界' };
const KIND_TXT = { M: '怪兽', S: '魔法', T: '陷阱', E: '觉醒体' };
const RAR_ORDER = ['N', 'R', 'SR', 'UR', 'GR'];

const S = {
  save: loadSave(),
  view: 'home',
  deckId: 'd1',
  diff: 'normal',
  G: null,
  sel: null,        // { type:'hand'|'mon', uid }
  mode: 'idle',     // idle | act | tribute | attack | extra
  tribute: [],
  busy: false,
  result: false,
  codex: { k: 'all', r: 'all' },
};

// ------------------------------------------------------------------ 工具
function toast(msg) {
  const d = document.createElement('div');
  d.textContent = msg;
  d.style.cssText = 'position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:99;'
    + 'background:rgba(12,16,24,.94);color:#e8ecf5;border:1px solid #354053;border-radius:10px;'
    + 'padding:8px 14px;font-size:12.5px;box-shadow:0 12px 30px -18px #000;transition:opacity .3s';
  document.body.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; }, 1500);
  setTimeout(() => { d.remove(); }, 1900);
}

function show(id) {
  S.view = id;
  $$('#stage .scr').forEach((s) => s.classList.toggle('on', s.id === 'scr-' + id));
  if (id === 'home') renderHome();
  if (id === 'packs') renderPacks();
  if (id === 'codex') renderCodex();
  if (id === 'lore') renderLore();
}

function silverBar() {
  const n = $('#silver');
  if (n) n.textContent = S.save.silver;
}

// ------------------------------------------------------------------ 卡面
function facePos(name) {
  const i = ART.index[name];
  if (i == null) return '';
  const col = i % ART.cols;
  const row = Math.floor(i / ART.cols);
  const px = ART.cols > 1 ? (col * 100) / (ART.cols - 1) : 0;
  const py = ART.rows > 1 ? (row * 100) / (ART.rows - 1) : 0;
  return `background-position:${px}% ${py}%`;
}

function cardHTML(id, opt) {
  const o = opt || {};
  const c = typeof id === 'string' ? CARDS[id] : id;
  if (!c) return '';
  const cls = ['card'];
  if (o.mini) cls.push('mini');
  if (o.big) cls.push('big');
  if (o.set) cls.push('set');
  if (o.on) cls.push('on');
  if (o.dim) cls.push('dim');
  if (o.def) cls.push('def');
  if (o.used) cls.push('used');
  const rb = c.rar || 'N';
  const realm = c.r || 'any';
  const name = o.set ? '盖放' : c.n;
  const face = o.set ? '' : `style="${facePos(c.art || c.n)}"`;
  let tail = '';
  if (c.k === 'M' || c.k === 'E') {
    tail = `<div class="pt"><b>${c.atk}</b><span>/</span><b>${c.def}</b></div>`;
  } else {
    const t = { normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '';
    tail = `<div class="pt">${c.k === 'S' ? '魔法' : '陷阱'} · ${t}</div>`;
  }
  const lv = c.k === 'M' || c.k === 'E' ? `<span class="lv">${c.lv >= 8 ? '★8' : 'Lv' + c.lv}</span>` : '';
  return `<div class="${cls.join(' ')}" data-r="${realm}" data-rar="${rb}" data-id="${c.id}"`
    + `${o.uid != null ? ` data-uid="${o.uid}"` : ''}>`
    + `<span class="rm"></span>`
    + `<div class="face" ${face}></div>`
    + `<span class="rb">${rb}</span>${lv}`
    + `<div class="ct"><b class="nm">${name}</b>${tail}</div>`
    + `${o.tag ? `<span class="tagp">${o.tag}</span>` : ''}`
    + `</div>`;
}

// ------------------------------------------------------------------ 首页
function renderHome() {
  const decks = DECKS.map((d) => {
    const bonds = E.evalBonds(deckList(d));
    const total = d.cards.reduce((s, p) => s + p[1], 0);
    return `<button class="deck ${d.id === S.deckId ? 'on' : ''}" data-deck="${d.id}" style="--rc:${
      (E.REALM[d.r] || E.REALM.any).c}">
      <div class="dh"><b>${d.n}</b><span class="rm">${(E.REALM[d.r] || E.REALM.any).n}</span></div>
      <div class="ds">${d.desc}</div>
      <div class="db">${bonds.map((b) => `<span class="bond">${b.n}</span>`).join('') || '<span class="bond" style="opacity:.5">无羁绊</span>'}</div>
      <div class="dm">主卡组 ${total} 张 · 额外 ${d.extra.length} 张 · 羁绊 ${bonds.length} 条</div>
    </button>`;
  }).join('');

  const sel = DECKS.find((d) => d.id === S.deckId) || DECKS[0];
  const bonds = E.evalBonds(deckList(sel));

  $('#scr-home').innerHTML = `
    <div class="hero">
      <p class="kicker">FORGETTING EVE · DUEL OF THE WHEEL</p>
      <h1>命轮对决</h1>
      <p class="lead">你是守密人，桌上摊着两套记忆。每一张卡都是一个<strong>你还记得的人</strong>：
        召唤她是承认她存在，把她当祭品是承认有更重要的东西。命轮值归零不是死，是<strong>不再确定自己是谁</strong>。</p>
      <div class="hr"></div>
    </div>

    <div class="sec-h"><h2>选一套卡组</h2><span class="r">共 ${DECKS.length} 套 · 每套 30 张 + 觉醒体</span></div>
    <div class="decks">${decks}</div>

    <div class="sec-h"><h2>这套牌的羁绊</h2><span class="r">${bonds.length} 条已触发</span></div>
    <div class="row" style="gap:6px">${bonds.map((b) => `<span class="bond" title="${b.text}">${b.n}</span>`).join('') || '<span class="note">这套牌凑不出羁绊——它只是三十张牌。</span>'}</div>
    <ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>

    <div class="sec-h"><h2>开始</h2><span class="r">对手从其余五套里随机</span></div>
    <div class="row">
      <div class="seg" id="diff">
        <button data-d="easy" class="${S.diff === 'easy' ? 'on' : ''}">轻松</button>
        <button data-d="normal" class="${S.diff === 'normal' ? 'on' : ''}">普通</button>
        <button data-d="hard" class="${S.diff === 'hard' ? 'on' : ''}">认真</button>
      </div>
      <button class="btn pri" data-act="start">开始对决</button>
      <button class="btn ghost" data-act="howto">规则</button>
    </div>

    <div class="nav-tiles">
      <button class="tile" data-act="go-packs"><span class="ti">✦</span><span><span class="tn">卡包</span><br><span class="td">开包、收集 · ${Object.keys(S.save.coll).length} 种已收录</span></span></button>
      <button class="tile" data-act="go-codex"><span class="ti">▤</span><span><span class="tn">卡表</span><br><span class="td">${Object.keys(CARDS).length} 张 · 效果全文</span></span></button>
      <button class="tile" data-act="go-lore"><span class="ti">◈</span><span><span class="tn">世界观</span><br><span class="td">弥萨格、守密人与四界域</span></span></button>
    </div>
    <p class="note" style="margin-top:12px">战绩：${S.save.wins} 胜 ${S.save.losses} 负 · 已开 ${S.save.opened} 包。银芯赢一场 +120、输一场 +40，开一包 -${PACK_PRICE}。</p>
  `;
}

function deckList(def) {
  const out = [];
  for (const p of def.cards) for (let i = 0; i < p[1]; i++) out.push(p[0]);
  return out;
}

// ------------------------------------------------------------------ 对战
function startDuel() {
  const mine = DECKS.find((d) => d.id === S.deckId) || DECKS[0];
  const others = DECKS.filter((d) => d.id !== mine.id);
  const foe = others[Math.floor(Math.random() * others.length)];
  S.G = E.createGame(
    { cards: mine.cards, extra: mine.extra },
    { cards: foe.cards, extra: foe.extra },
    { seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, aiLp: S.diff === 'easy' ? 6000 : 8000 },
  );
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.result = false; S.busy = false;
  show('duel');
  renderDuel();
}

function phaseText(G) {
  if (G.phase === 'battle') return '战斗阶段';
  return G.active === 0 ? '你的主要阶段' : '对手的主要阶段';
}

function lpBar(p) {
  const pct = Math.max(0, Math.min(100, (p.lp / p.lpMax) * 100));
  return `<div class="lp ${pct < 30 ? 'low' : ''}"><i style="width:${pct}%"></i>`
    + `<span class="lpn">${Math.max(0, p.lp)} / ${p.lpMax}</span></div>`;
}

function bondsDots(bonds) {
  if (!bonds || !bonds.length) return '';
  return `<div class="bonds">${bonds.map((b) => `<span title="羁绊：${b.n}"></span>`).join('')}</div>`;
}

function slotHTML(m, i, side, hot) {
  if (!m) return `<div class="slot empty ${hot ? 'hot' : ''}" data-slot="${side}-${i}" data-l="空位"></div>`;
  if (!m.id) {
    return `<div class="slot" data-slot="${side}-${i}">`
      + cardHTML({ id: 'back', n: '盖放', k: 'M', r: 'any', rar: 'N', lv: 0, atk: 0, def: 0 }, { set: true, uid: m.uid })
      + '</div>';
  }
  const c = CARDS[m.id];
  const tag = c.k === 'E' ? '觉醒' : (m.pos === 'def' ? '守备' : '攻击');
  return `<div class="slot" data-slot="${side}-${i}">`
    + cardHTML(c, { uid: m.uid, def: m.pos === 'def', tag, used: side === 'me' && m.canAtk === false })
    + '</div>';
}

function spellSlotHTML(s, i, side, hot) {
  if (!s) return `<div class="slot sp empty ${hot ? 'hot' : ''}" data-slot="${side}-sp-${i}"></div>`;
  const c = s.id ? CARDS[s.id] : null;
  const card = c && !s.set
    ? cardHTML(c, { mini: true, tag: '发动' })
    : cardHTML({ id: 'back', n: '盖放', k: 'T', r: 'any', rar: 'N', lv: 0, atk: 0, def: 0 }, { mini: true, set: true });
  return `<div class="slot sp" data-slot="${side}-sp-${i}">${card}</div>`;
}

function renderDuel() {
  const G = S.G;
  if (!G) { show('home'); return; }
  const v = E.publicView(G, 0);
  const myTurn = v.active === 0 && !v.over;
  const canAct = myTurn && !S.busy;

  const logHTML = v.log.map((l) => `<li data-k="${l.kind}">${l.text}</li>`).join('');

  const hotAttack = S.mode === 'attack';
  const guard = v.op.mons.find((m) => m && m.guard);
  const opSlots = v.op.mons.map((m, i) => {
    const hot = hotAttack && (m ? (!guard || m.guard) : false);
    return slotHTML(m, i, 'op', hot);
  }).join('');
  const mySlots = v.me.mons.map((m, i) => slotHTML(m, i, 'me', S.mode === 'tribute' && !!m)).join('');
  const opSp = v.op.spells.map((s, i) => spellSlotHTML(s, i, 'op', false)).join('');
  const mySp = v.me.spells.map((s, i) => spellSlotHTML(s, i, 'me', false)).join('');

  const extraLeft = v.me.extra.length;
  const awakenable = v.me.extra.filter((id) => E.canAwaken(G, G.players[0], id)).length;

  const hand = v.me.hand.map((h) => {
    const c = CARDS[h.id];
    const usable = canAct && (c.k === 'M' ? E.canSummon(G, G.players[0], h.id) : true);
    return cardHTML(c, {
      uid: h.uid,
      on: S.sel && S.sel.type === 'hand' && S.sel.uid === h.uid,
      dim: canAct && !usable,
    });
  }).join('');

  $('#scr-duel').innerHTML = `
    <div class="duelbar">
      <span class="turn">第 ${Math.ceil(v.turn / 2)} 回合</span>
      <span class="ph">${phaseText(G)}</span>
      <span class="sp">
        ${canAct && v.phase === 'main' && extraLeft ? `<button class="btn sm" data-act="extra">觉醒 ${awakenable}/${extraLeft}</button>` : ''}
        ${canAct && v.phase === 'main' ? '<button class="btn sm" data-act="battle">战斗阶段</button>' : ''}
        ${canAct ? '<button class="btn sm pri" data-act="end">结束回合</button>' : ''}
      </span>
    </div>

    <div class="side">
      <div class="pinfo">
        <span class="who">对手</span>
        ${lpBar(v.op)}
        <span class="meta"><span>手 ${v.op.hand}</span><span>组 ${v.op.deck}</span></span>
        ${bondsDots(v.op.bonds)}
      </div>
      <div class="field">${opSp}</div>
      <div class="field">${opSlots}</div>
    </div>

    <div class="mid"><ul class="log" id="log">${logHTML}</ul></div>

    <div class="side">
      <div class="field">${mySlots}</div>
      <div class="field">${mySp}</div>
      <div class="pinfo">
        <span class="who">你</span>
        ${lpBar(v.me)}
        <span class="meta"><span>手 ${v.me.hand.length}</span><span>组 ${v.me.deck}</span></span>
        ${bondsDots(v.me.bonds)}
      </div>
    </div>

    <div class="acts">
      ${S.mode === 'attack'
        ? '<button class="btn" data-act="direct">直接攻击</button><button class="btn ghost" data-act="cancel">取消</button>'
        : '<span class="note">' + (myTurn ? '点手牌出牌，点场上的怪兽看它能做什么。' : (v.over ? '对决结束。' : '对手正在想牌。')) + '</span>'}
    </div>

    <div class="hand ${hand ? '' : 'empty-h'}">${hand || '手牌空了'}</div>
  `;

  const log = $('#log');
  if (log) log.scrollTop = log.scrollHeight;
  renderActbar();
  if (v.over && !S.result) showResult(v);
}

function renderActbar() {
  const bar = $('#actbar');
  const G = S.G;
  if (!bar) return;
  if (!G || S.view !== 'duel' || !S.sel || S.mode === 'attack' || S.mode === 'extra') {
    bar.classList.remove('on');
    bar.innerHTML = '';
    return;
  }
  const p = G.players[0];
  const isHand = S.sel.type === 'hand';
  const h = isHand ? p.hand.find((x) => x.uid === S.sel.uid) : null;
  const c = isHand ? CARDS[h && h.id] : null;
  if (isHand && !c) { bar.classList.remove('on'); return; }
  if (!isHand) {
    const m = p.mons.find((x) => x && x.uid === S.sel.uid);
    if (!m) { bar.classList.remove('on'); return; }
    const d = CARDS[m.id];
    const canFight = G.phase === 'battle' && E.canAttack(G, p, m) && G.active === 0;
    bar.innerHTML = `
      <div class="ah"><b>${d.n}</b><span class="note">${d.atk} / ${d.def}</span>
        <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
      <div class="ab">
        ${canFight ? '<button class="btn pri" data-act="pick-target">攻击</button>' : ''}
        ${G.phase === 'main' && G.active === 0 ? '<button class="btn" data-act="flip">切换表示</button>' : ''}
        <button class="btn ghost" data-act="read">效果</button>
      </div>
      <div class="hint">${m.set ? '盖放的怪兽：翻开后按守备表示。' : (m.pos === 'def' ? '守备表示，不会受到战斗伤害（对方打过来时反过来算）。' : (canFight ? '点它再选目标；对方有守备的「嘲讽」怪兽时必须先打它。' : '本回合它已经攻击过了，或者现在不是战斗阶段。'))}</div>`;
    bar.classList.add('on');
    return;
  }

  const opts = [];
  if (c.k === 'M') {
    const canS = E.canSummon(G, p, c.id);
    const need = E.tributeNeed(c.id);
    if (canS) opts.push('<button class="btn pri" data-act="summon">召唤</button>');
    if (need === 0) opts.push('<button class="btn" data-act="setmon">里侧守备</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  } else if (c.k === 'S') {
    opts.push('<button class="btn pri" data-act="spell">发动</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  } else if (c.k === 'T') {
    opts.push('<button class="btn pri" data-act="trap">盖放</button>');
    opts.push('<button class="btn ghost" data-act="read">效果</button>');
  }
  const hint = c.k === 'M'
    ? (E.canSummon(G, p, c.id)
      ? `等级 ${c.lv}：${E.tributeNeed(c.id) ? '需要 ' + E.tributeNeed(c.id) + ' 只祭品' : '可以直接召唤'}`
      : (p.normalUsed ? '本回合已经通常召唤过了' : '现在不能召唤它'))
    : (c.k === 'S' ? '魔法只能在自己的主要阶段从手牌发动；永续与装备留在场上。' : '陷阱盖放后，对方满足条件时自动发动。');
  bar.innerHTML = `
    <div class="ah"><b>${c.n}</b><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}</span>
      <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
    <div class="ab">${opts.join('')}</div>
    <div class="hint">${hint}</div>`;
  bar.classList.add('on');
}

function showResult(v) {
  S.result = true;
  const win = v.winner === 0;
  const gain = win ? 120 : 40;
  S.save.silver += gain;
  if (win) S.save.wins++; else S.save.losses++;
  saveSave(S.save);
  silverBar();
  const rounds = Math.ceil(v.turn / 2);
  openModal(`
    <div class="mtitle"><h3>${win ? '你赢下了这场对决' : '命轮断了'}</h3></div>
    <p class="sub">${rounds} 回合 · ${win ? '对手交出一张牌' : '你从此不再确定一张牌'}</p>
    <p class="note">${win
      ? '输的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡。'
      : '命轮值归零不是死，是「不再确定自己是谁」。再摆一次就好——弥萨格的守密人从不轻易认输。'}</p>
    <div class="row" style="margin-top:10px"><span class="bond">银芯 +${gain}</span>
      <span class="note">累计 ${S.save.wins} 胜 ${S.save.losses} 负</span></div>
    <div class="mb">
      <button class="btn ghost" data-modal="close">留在这</button>
      <button class="btn" data-modal="again">再打一场</button>
      <button class="btn pri" data-modal="home">回首页</button>
    </div>
  `);
}

function openModal(html) {
  $('#modal').innerHTML = html;
  $('#mask').classList.add('on');
}
function closeModal() {
  $('#mask').classList.remove('on');
  $('#modal').innerHTML = '';
}

// ------------------------------------------------------------------ AI 回合
async function runAI() {
  const G = S.G;
  S.busy = true;
  renderDuel();
  let steps = 0;
  while (!G.over && G.active === 1 && steps < 80) {
    steps++;
    const act = nextAction(G, 1, S.diff);
    if (!act) break;
    if (act.t === 'awaken') E.awaken(G, 1, act.id);
    else if (act.t === 'spell') E.activateSpell(G, 1, act.uid);
    else if (act.t === 'summon') E.summon(G, 1, act.uid, act.tribs);
    else if (act.t === 'setMon') E.setMonster(G, 1, act.uid);
    else if (act.t === 'trap') E.setTrap(G, 1, act.uid);
    else if (act.t === 'pos') E.changePos(G, 1, act.uid);
    else if (act.t === 'battle') E.toBattle(G, 1);
    else if (act.t === 'attack') E.attack(G, 1, act.uid, act.target);
    else if (act.t === 'end') { E.endTurn(G); break; }
    renderDuel();
    await sleep(steps > 24 ? 90 : 460);
  }
  // 兜底：AI 要是想不出动作，也别把回合卡死在那里
  if (!G.over && G.active === 1) E.endTurn(G);
  S.busy = false;
  S.sel = null; S.mode = 'idle';
  renderDuel();
}

function playerEndTurn() {
  if (!S.G || S.busy || S.G.active !== 0) return;
  S.sel = null; S.mode = 'idle';
  E.endTurn(S.G);
  renderDuel();
  if (!S.G.over && S.G.active === 1) runAI();
}

// ------------------------------------------------------------------ 操作
function doSummon(uid, tribs) {
  const r = E.summon(S.G, 0, uid, tribs);
  if (!r.ok) { toast(r.err); return false; }
  S.sel = null; S.mode = 'idle'; S.tribute = [];
  renderDuel();
  return true;
}

function onHandAct(action) {
  const G = S.G;
  if (!G || !S.sel) return;
  const uid = S.sel.uid;
  const p = G.players[0];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return;
  const c = CARDS[h.id];
  if (action === 'summon') {
    const need = E.tributeNeed(c.id);
    if (!need) { doSummon(uid, []); return; }
    S.mode = 'tribute';
    S.tribute = [];
    S.pendingSummon = { uid, need };
    renderDuel();
    const bar = $('#actbar');
    bar.innerHTML = `<div class="ah"><b>召唤「${c.n}」</b><span class="note">等级 ${c.lv}</span>
      <button class="btn sm ghost x" data-act="cancel">取消</button></div>
      <div class="hint">需要 ${need} 只祭品：点击自己场上的怪兽（会送进墓地）。已选 ${S.tribute.length}/${need}。</div>`;
    bar.classList.add('on');
    return;
  }
  if (action === 'setmon') {
    const r = E.setMonster(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
  if (action === 'spell') {
    const r = E.activateSpell(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
  if (action === 'trap') {
    const r = E.setTrap(G, 0, uid);
    if (!r.ok) return toast(r.err);
    S.sel = null; renderDuel(); return;
  }
}

function onSlotClick(side, idx, isSpell) {
  const G = S.G;
  if (!G || S.busy) return;
  if (isSpell) return;
  if (side === 'me') {
    if (S.mode === 'tribute') {
      const m = G.players[0].mons[idx];
      if (!m) return;
      if (S.tribute.indexOf(m.uid) >= 0) return;
      S.tribute.push(m.uid);
      const need = (S.pendingSummon && S.pendingSummon.need) || 1;
      if (S.tribute.length >= need) {
        const uid = S.pendingSummon.uid;
        S.pendingSummon = null;
        doSummon(uid, S.tribute);
        return;
      }
      renderDuel();
      return;
    }
    if (S.mode === 'attack') return;
    const m = G.players[0].mons[idx];
    if (!m) return;
    S.sel = { type: 'mon', uid: m.uid };
    S.mode = 'act';
    renderActbar();
    return;
  }
  // 点对方场地
  if (S.mode === 'attack') {
    const t = G.players[1].mons[idx];
    if (!t) return;
    const r = E.attack(G, 0, S.sel.uid, t.uid);
    if (!r.ok) return toast(r.err);
    S.mode = 'idle'; S.sel = null;
    renderDuel();
    if (!G.over && G.active === 1) runAI();
    return;
  }
  const m = G.players[1].mons[idx];
  if (m && !m.set) {
    const c = CARDS[m.id];
    openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r]}</span>
      <button class="btn sm ghost x" data-modal="close">关闭</button></div>
      <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ''}</p>
      <p class="note">${c.text}</p>`);
  }
}

function onExtra() {
  const G = S.G;
  const p = G.players[0];
  const list = p.extra.map((id) => {
    const ok = E.canAwaken(G, p, id);
    const c = CARDS[id];
    const mats = c.mat ? c.mat.join(' ＋ ') : '任意 2 只界域不同的怪兽';
    return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)">
      ${cardHTML(c, { mini: true, dim: !ok })}
      <div style="min-width:0">
        <b style="font-size:12.5px">${c.n}</b>
        <p class="note" style="margin:2px 0">${c.atk} / ${c.def} · 素材：${mats}</p>
      </div>
      <button class="btn sm ${ok ? 'pri' : ''}" style="margin-left:auto" data-awaken="${id}" ${ok ? '' : 'disabled'}>觉醒</button>
    </div>`;
  }).join('');
  openModal(`<div class="mtitle"><h3>额外卡组</h3><span class="note">不占通常召唤</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">觉醒召唤：把素材送进墓地，从额外卡组特召。素材必须已经在场上。</p>
    ${list || '<p class="empty">额外卡组是空的。</p>'}`);
}

// ------------------------------------------------------------------ 卡包
function drawFromPack(pack) {
  const pool = pack.cards.map((id) => CARDS[id]).filter(Boolean);
  const byRar = {};
  for (const c of pool) (byRar[c.rar || 'N'] = byRar[c.rar || 'N'] || []).push(c.id);
  const out = [];
  const pick = (list) => {
    const cands = [];
    for (const r of list) for (const id of byRar[r] || []) cands.push(id);
    if (!cands.length) return null;
    const left = cands.filter((id) => out.indexOf(id) < 0);
    const arr = left.length ? left : cands;
    return arr[Math.floor(Math.random() * arr.length)];
  };
  out.push(pick(['GR', 'UR', 'SR']));
  const roll = () => {
    const r = Math.random();
    return r < 0.45 ? 'N' : r < 0.80 ? 'R' : r < 0.96 ? 'SR' : r < 0.99 ? 'UR' : 'GR';
  };
  for (let i = 0; i < 4; i++) {
    let id = null;
    for (let t = 0; t < 8 && !id; t++) id = pick([roll()]);
    out.push(id || pick(['N', 'R']));
  }
  return out;
}

function renderPacks() {
  const packs = PACKS.map((pk) => {
    const have = pk.cards.filter((id) => S.save.coll[id]).length;
    const total = pk.cards.length;
    const pct = Math.round((have / total) * 100);
    const rar = {};
    for (const id of pk.cards) { const c = CARDS[id]; if (c) rar[c.rar] = (rar[c.rar] || 0) + 1; }
    const rarTxt = RAR_ORDER.filter((r) => rar[r]).map((r) => `${r}×${rar[r]}`).join(' · ');
    return `<div class="pack" data-pack="${pk.id}">
      <div><div class="pn">${pk.n}</div><div class="pe">${pk.en}</div></div>
      <div class="ps">${pk.sub}</div>
      <div class="pd">${pk.desc}</div>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <div class="pf"><span style="white-space:nowrap">收录 ${have}/${total}</span>
        <button class="btn sm pri" data-buy="${pk.id}">开包 ${PACK_PRICE}</button>
      </div>
      <div class="note" style="font-size:10px;margin-top:-2px">${rarTxt}</div>
      <button class="btn sm ghost" data-toggle="${pk.id}" style="align-self:flex-start">看这包里有什么</button>
      <div class="plist">${pk.cards.map((id) => {
        const c = CARDS[id];
        return `<span style="color:var(--dim)">${c.n}<span style="color:var(--dim2)">（${c.rar}）</span></span>`;
      }).join('、')}</div>
    </div>`;
  }).join('');

  $('#scr-packs').innerHTML = `
    <div class="sec-h"><h2>卡包</h2><span class="r">银芯 ${S.save.silver} · 一包 ${PACK_PRICE}</span></div>
    <p class="note" style="margin:0 0 10px">每包 5 张，第一张保底 SR 以上。开出来的卡进收藏，不影响预组卡组——对决用的是整套预组，收藏是「我还记得这些人」。</p>
    <div class="packs">${packs}</div>
    <p class="note" style="margin-top:12px">已收录 ${Object.keys(S.save.coll).length} / ${Object.keys(CARDS).length} 种。</p>
  `;
}

function buyPack(packId) {
  if (S.save.silver < PACK_PRICE) return toast(`银芯不够，还差 ${PACK_PRICE - S.save.silver}`);
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  S.save.silver -= PACK_PRICE;
  S.save.opened++;
  const ids = drawFromPack(pk);
  for (const id of ids) if (id) S.save.coll[id] = (S.save.coll[id] || 0) + 1;
  saveSave(S.save);
  silverBar();
  renderPacks();

  const cards = ids.map((id) => CARDS[id]).filter(Boolean);
  openModal(`<div class="mtitle"><h3>${pk.n}</h3><span class="note">${pk.sub}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">第 ${S.save.opened} 包 · 银芯 -${PACK_PRICE}</p>
    <div class="pull">${cards.map((c) => `<div>${cardHTML(c, {})}<div class="rar" style="color:var(--rc)">${c.rar}</div></div>`).join('')}</div>
    <div class="mb"><button class="btn ghost" data-modal="close">收下</button>
      <button class="btn pri" data-buy2="${pk.id}">再开一包</button></div>`);
}

// ------------------------------------------------------------------ 卡表
function renderCodex() {
  const kinds = [['all', '全部'], ['M', '怪兽'], ['S', '魔法'], ['T', '陷阱'], ['E', '觉醒体']];
  const realms = [['all', '全界域'], ['chaos', '混沌'], ['caro', '血肉'], ['aqua', '深海'], ['ultra', '超维'], ['any', '无界']];
  const list = Object.keys(CARDS).map((id) => CARDS[id]).filter((c) => {
    if (S.codex.k !== 'all' && c.k !== S.codex.k) return false;
    if (S.codex.r !== 'all' && (c.r || 'any') !== S.codex.r) return false;
    return true;
  });
  const order = { M: 0, S: 1, T: 2, E: 3 };
  list.sort((a, b) => (order[a.k] - order[b.k]) || (a.r || '').localeCompare(b.r || '') || (b.atk || 0) - (a.atk || 0));

  $('#scr-codex').innerHTML = `
    <div class="sec-h"><h2>卡表</h2><span class="r">${list.length} / ${Object.keys(CARDS).length} 张</span></div>
    <div class="filters">
      ${kinds.map(([k, n]) => `<button class="chip ${S.codex.k === k ? 'on' : ''}" data-ck="${k}">${n}</button>`).join('')}
    </div>
    <div class="filters">
      ${realms.map(([r, n]) => `<button class="chip ${S.codex.r === r ? 'on' : ''}" data-cr="${r}" data-r="${r}">${n}</button>`).join('')}
    </div>
    <div class="grid-cards">
      ${list.map((c) => `<div>${cardHTML(c, {})}<div style="text-align:center;font-size:9px;color:var(--dim2);margin-top:2px">${c.rar}</div></div>`).join('')}
    </div>
    <p class="note" style="margin-top:12px">点一张看完整效果。</p>
  `;
}

// ------------------------------------------------------------------ 世界观
function renderLore() {
  const realms = LORE.realms.map((r) => `<div class="realm" style="--rc:${r.color}">
    <div class="rn">${r.n}<span>${r.en}</span></div>
    <div class="rm2">${r.motto}</div>
    <div class="rd">${r.desc}</div>
    <div class="rs">打法：${r.style}</div>
  </div>`).join('');

  const chapters = LORE.chapters.map((c) => `<div class="chap">
    <h2>${c.t}</h2><div class="en">${c.sub}</div>
    <div class="q">「${c.quote}」</div>
    ${c.ps.map((p) => `<p>${p}</p>`).join('')}
  </div>`).join('');

  const terms = LORE.terms.map((t) => `<div class="term"><b>${t.n}</b><p>${t.d}</p></div>`).join('');

  $('#scr-lore').innerHTML = `<div class="lore">
    <p class="kicker" style="font-size:10px;letter-spacing:.3em;color:var(--dim2)">SETTING</p>
    <h1>忘却前夜 · 命轮对决</h1>
    <p class="intro">${LORE.intro}</p>
    <div class="realms">${realms}</div>
    ${chapters}
    <div class="sec-h"><h2>名词</h2><span class="r">照本作的口径</span></div>
    <div class="terms">${terms}</div>
    <p class="note" style="margin-top:14px">术语沿用原作，卡牌规则与「命轮对决」这套玩法是本作私设。卡面头像来自游戏原作素材，仅用于同人。</p>
  </div>`;
}

// ------------------------------------------------------------------ 规则
function showHowTo() {
  openModal(`<div class="mtitle"><h3>怎么打</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">目标是先把对方的命轮值打到 0。双方各 8000 点起手。</p>
    <ul class="tips">
      <li><b>场地</b>：怪兽 3 格、魔法·陷阱 3 格，卡组 30 张，起手 5 张。先手第一回合不抽牌。</li>
      <li><b>召唤</b>：每回合 1 次。等级 1–4 直接出，5–6 需要 1 只祭品，7 以上需要 2 只。祭品送墓。</li>
      <li><b>盖放</b>：怪兽可以里侧守备（等级 5 以上不行）；陷阱从手牌盖到魔陷区，盖放当回合不能发动。</li>
      <li><b>战斗</b>：攻击表示互殴，输的一方破坏、差值打脸；打守备怪兽时超过守备力就破坏它，没有贯穿就没有伤害；场上没有怪兽才能直接攻击。</li>
      <li><b>嘲讽</b>：带「守备时对方不能攻击其他怪兽」的怪兽挡在前面时，必须先打它。</li>
      <li><b>觉醒召唤</b>：额外卡组的觉醒体，把场上指定的两只素材送墓就能特召，<b>不占通常召唤</b>。</li>
      <li><b>陷阱</b>：本作的陷阱是「自动迎击」——满足条件就发动，不用你宣言。所以盖牌的顺序要考虑对手会先干什么。</li>
      <li><b>羁绊</b>：卡组里同时有指定角色就会在开局触发，加攻、加血、多抽牌。配队比单卡重要。</li>
    </ul>
    <div class="mb"><button class="btn pri" data-modal="close">知道了</button></div>`);
}

function readCard(id) {
  const c = CARDS[id];
  if (!c) return;
  const extra = c.k === 'E' ? `<p class="note">素材：${c.mat ? c.mat.join(' ＋ ') : '自己场上 2 只界域不同的怪兽'}</p>` : '';
  openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r} · ${c.rar}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '')}</p>
    ${extra}
    <p class="note" style="font-size:13px;line-height:1.9">${c.text}</p>`);
}

// ------------------------------------------------------------------ 事件
function bind() {
  document.addEventListener('click', (e) => {
    const gc = e.target.closest('.grid-cards .card');
    if (gc && gc.dataset.id) { readCard(gc.dataset.id); return; }
    const t = e.target.closest('[data-act],[data-deck],[data-buy],[data-buy2],[data-toggle],[data-modal],[data-awaken],[data-ck],[data-cr],[data-d]');
    if (!t) {
      // 点空白处收起操作条
      if (e.target.closest('#scr-duel') && !e.target.closest('.slot') && !e.target.closest('.card')) {
        S.sel = null; if (S.mode === 'act') S.mode = 'idle';
        renderActbar();
      }
      return;
    }

    if (t.dataset.deck) {
      S.deckId = t.dataset.deck;
      S.save.deck = S.deckId; saveSave(S.save);
      renderHome();
      return;
    }
    if (t.dataset.d) {
      S.diff = t.dataset.d; S.save.diff = S.diff; saveSave(S.save);
      $$('#diff button').forEach((b) => b.classList.toggle('on', b.dataset.d === S.diff));
      return;
    }
    if (t.dataset.modal) {
      const a = t.dataset.modal;
      if (a === 'close') closeModal();
      if (a === 'home') { closeModal(); show('home'); }
      if (a === 'again') { closeModal(); startDuel(); }
      return;
    }
    if (t.dataset.buy) { buyPack(t.dataset.buy); return; }
    if (t.dataset.buy2) { closeModal(); buyPack(t.dataset.buy2); return; }
    if (t.dataset.toggle) {
      const box = t.closest('.pack');
      if (box) box.classList.toggle('open');
      return;
    }
    if (t.dataset.awaken) {
      const r = E.awaken(S.G, 0, t.dataset.awaken);
      if (!r.ok) return toast(r.err);
      closeModal();
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (t.dataset.ck) { S.codex.k = t.dataset.ck; renderCodex(); return; }
    if (t.dataset.cr) { S.codex.r = t.dataset.cr; renderCodex(); return; }
    if (t.dataset.id && t.closest('.grid-cards')) { readCard(t.dataset.id); return; }

    const act = t.dataset.act;
    if (act === 'start') return startDuel();
    if (act === 'howto') return showHowTo();
    if (act === 'go-packs') return show('packs');
    if (act === 'go-codex') return show('codex');
    if (act === 'go-lore') return show('lore');
    if (act === 'end') return playerEndTurn();
    if (act === 'battle') {
      const r = E.toBattle(S.G, 0);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (act === 'extra') return onExtra();
    if (act === 'cancel') {
      S.sel = null; S.mode = 'idle'; S.tribute = [];
      renderDuel();
      return;
    }
    if (act === 'pick-target') {
      S.mode = 'attack';
      renderDuel();
      return;
    }
    if (act === 'direct') {
      const r = E.attack(S.G, 0, S.sel.uid, null);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      if (!S.G.over && S.G.active === 1) runAI();
      return;
    }
    if (act === 'flip') {
      const r = E.changePos(S.G, 0, S.sel.uid);
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (act === 'summon' || act === 'setmon' || act === 'spell' || act === 'trap') {
      return onHandAct(act);
    }
    if (act === 'read') {
      const c = S.sel && S.sel.type === 'hand'
        ? S.G.players[0].hand.find((x) => x.uid === S.sel.uid)
        : S.G.players[0].mons.find((x) => x && x.uid === S.sel.uid);
      if (c) readCard(c.id);
      return;
    }
  });

  // 手牌 / 场地
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.hand .card');
    if (card && S.G && !S.busy && S.G.active === 0 && !S.G.over) {
      S.sel = { type: 'hand', uid: Number(card.dataset.uid) };
      S.mode = 'act';
      renderDuel();
      return;
    }
    const slot = e.target.closest('.slot');
    if (slot && S.G && !S.busy) {
      const parts = slot.dataset.slot.split('-');
      const side = parts[0];
      const isSpell = parts[1] === 'sp';
      const idx = Number(parts[isSpell ? 2 : 1]);
      const mon = slot.querySelector('.card');
      if (mon && side === 'me' && !isSpell && S.mode !== 'tribute' && S.mode !== 'attack') {
        S.sel = { type: 'mon', uid: Number(mon.dataset.uid) };
        S.mode = 'act';
        renderDuel();
        return;
      }
      onSlotClick(side, idx, isSpell);
    }
  });

  $('#mask').addEventListener('click', (e) => {
    if (e.target.id === 'mask') closeModal();
  });
}

// ------------------------------------------------------------------ 启动
function boot() {
  document.documentElement.style.setProperty('--sheet', `url("${FACES}")`);
  document.documentElement.style.setProperty('--backimg', `url("${BACK}")`);
  document.documentElement.style.setProperty('--sheet-size', `${ART.cols * 100}% ${ART.rows * 100}%`);
  S.deckId = S.save.deck && DECKS.some((d) => d.id === S.save.deck) ? S.save.deck : DECKS[0].id;
  S.diff = S.save.diff || 'normal';
  silverBar();
  bind();
  show('home');
}
return { boot };
})();

// ---- js/duel.js
const m_duel = await (async () => {
const { boot } = m_view;
// 「命轮对决」的入口：只做一件事——把页面接上。
// 规则在 duel/engine.js，对手在 duel/ai.js，画面在 duel/view.js，
// 卡表与图集由 scripts/build.mjs 从 data/duel-*.json 生成到 duel/gen.js。


boot();
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

