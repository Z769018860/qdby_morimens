(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/duel/gen.js
const m_gen = await (async () => {

// 由 scripts/build.mjs 生成，请勿手改。
// 源：data/duel-cards.json + duel-packs.json + duel-lore.json + duel-art.json + assets/duel/*.webp
const CARDS = {"m01":{"k":"M","id":"m01","n":"24","r":"chaos","rar":"SR","lv":4,"atk":1800,"def":1200,"role":"伤害型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m02":{"k":"M","id":"m02","n":"凯蒂古拉","r":"chaos","rar":"SR","lv":5,"atk":2100,"def":1500,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m03":{"k":"M","id":"m03","n":"潘狄娅","r":"chaos","rar":"SR","lv":4,"atk":1700,"def":1000,"role":"伤害型","fx":[{"k":"burn","v":500}],"text":"①：此卡召唤成功时，给予对方 500 点伤害。"},"m04":{"k":"M","id":"m04","n":"诺缔拉","r":"chaos","rar":"R","lv":3,"atk":1200,"def":1900,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m05":{"k":"M","id":"m05","n":"莉莉","r":"chaos","rar":"R","lv":3,"atk":800,"def":2000,"role":"防御型","fx":[{"k":"onDestroyDraw","v":1}],"text":"①：此卡被战斗破坏送去墓地时，自己抽 1 张牌。"},"m06":{"k":"M","id":"m06","n":"哈姆林","r":"chaos","rar":"SR","lv":4,"atk":1600,"def":1400,"role":"辅助型","fx":[{"k":"aura","r":"chaos","v":300}],"text":"①：只要此卡在场上表侧表示，自己场上其他「混沌」怪兽攻击力上升 300。"},"m07":{"k":"M","id":"m07","n":"珈伦","r":"chaos","rar":"R","lv":3,"atk":1300,"def":1300,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"chaos","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「混沌」魔法卡加入手牌。"},"m08":{"k":"M","id":"m08","n":"塔薇","r":"chaos","rar":"SR","lv":5,"atk":2000,"def":1600,"role":"伤害型","fx":[{"k":"twin"}],"text":"①：此卡在同一个战斗阶段中可以攻击 2 次。"},"m09":{"k":"M","id":"m09","n":"莱克","r":"chaos","rar":"SR","lv":4,"atk":1500,"def":1500,"role":"辅助型","fx":[{"k":"discardOpp","v":1}],"text":"①：此卡召唤成功时，对方随机丢弃 1 张手牌。"},"m10":{"k":"M","id":"m10","n":"宁菲亚","r":"chaos","rar":"SR","lv":6,"atk":2400,"def":1800,"role":"伤害型","fx":[{"k":"drain","v":100}],"text":"①：此卡给予对方战斗伤害时，自己回复那个数值的生命值。"},"m11":{"k":"M","id":"m11","n":"薇薇安","r":"chaos","rar":"R","lv":4,"atk":1400,"def":1600,"role":"辅助型","fx":[{"k":"recall","f":"spell","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 张魔法卡加入手牌。"},"m12":{"k":"M","id":"m12","n":"熔毁·朵尔","r":"chaos","rar":"GR","lv":7,"atk":2700,"def":2100,"role":"辅助型","fx":[{"k":"burn","v":800},{"k":"costLp","v":400}],"text":"①：此卡召唤成功时，给予对方 800 点伤害，自己受到 400 点伤害。"},"m13":{"k":"M","id":"m13","n":"蚀灭·萝坦","r":"chaos","rar":"SR","lv":5,"atk":2000,"def":1400,"role":"伤害型","fx":[{"k":"onKillAtk","v":300}],"text":"①：此卡战斗破坏对方怪兽时，此卡攻击力永久上升 300。"},"m14":{"k":"M","id":"m14","n":"环行·拉蒙娜","r":"chaos","rar":"R","lv":4,"atk":1300,"def":1700,"role":"辅助型","fx":[{"k":"heal","v":800}],"text":"①：此卡召唤成功时，自己回复 800 点生命值。"},"m15":{"k":"M","id":"m15","n":"阿格里帕","r":"caro","rar":"SR","lv":4,"atk":1600,"def":2000,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m16":{"k":"M","id":"m16","n":"艾继丝","r":"caro","rar":"R","lv":3,"atk":1100,"def":1500,"role":"辅助型","fx":[{"k":"heal","v":800}],"text":"①：此卡召唤成功时，自己回复 800 点生命值。"},"m17":{"k":"M","id":"m17","n":"杜勒赛因","r":"caro","rar":"SR","lv":6,"atk":2500,"def":1800,"role":"伤害型","fx":[{"k":"onKillAtk","v":300}],"text":"①：此卡战斗破坏对方怪兽时，此卡攻击力永久上升 300。"},"m18":{"k":"M","id":"m18","n":"血链·希洛","r":"caro","rar":"GR","lv":7,"atk":2800,"def":2000,"role":"伤害型","fx":[{"k":"pierce"},{"k":"drain","v":100}],"text":"①：此卡攻击守备表示怪兽时给予贯穿伤害。②：此卡给予对方战斗伤害时，自己回复那个数值的生命值。"},"m19":{"k":"M","id":"m19","n":"希洛","r":"caro","rar":"SR","lv":5,"atk":2200,"def":1500,"role":"伤害型","fx":[{"k":"onDestroyBurn","v":1000}],"text":"①：此卡被破坏送去墓地时，给予对方 1000 点伤害。"},"m20":{"k":"M","id":"m20","n":"菲茵特","r":"caro","rar":"SR","lv":4,"atk":1700,"def":1900,"role":"防御型","fx":[{"k":"turnHeal","v":300}],"text":"①：自己回合开始时，自己回复 300 点生命值。"},"m21":{"k":"M","id":"m21","n":"索蕾尔","r":"caro","rar":"SR","lv":5,"atk":2000,"def":1700,"role":"伤害型","fx":[{"k":"costLp","v":500},{"k":"pumpSelf","v":500}],"text":"①：此卡召唤成功时，自己支付 500 点生命值，此卡攻击力永久上升 500。"},"m22":{"k":"M","id":"m22","n":"尤乌哈希","r":"caro","rar":"SR","lv":4,"atk":1800,"def":1400,"role":"伤害型","fx":[{"k":"burn","v":600},{"k":"costLp","v":300}],"text":"①：此卡召唤成功时，给予对方 600 点伤害，自己受到 300 点伤害。"},"m23":{"k":"M","id":"m23","n":"皮克曼","r":"caro","rar":"R","lv":3,"atk":1100,"def":1700,"role":"辅助型","fx":[{"k":"recall","f":"monster","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 只怪兽加入手牌。"},"m24":{"k":"M","id":"m24","n":"雷娅","r":"caro","rar":"SR","lv":4,"atk":1500,"def":1400,"role":"辅助型","fx":[{"k":"drain","v":50}],"text":"①：此卡给予对方战斗伤害时，自己回复那个数值一半的生命值。"},"m25":{"k":"M","id":"m25","n":"萨尔瓦多","r":"caro","rar":"SR","lv":4,"atk":1300,"def":2100,"role":"防御型","fx":[{"k":"auraDef","v":400}],"text":"①：只要此卡在场上表侧表示，自己场上其他怪兽守备力上升 400。"},"m26":{"k":"M","id":"m26","n":"徐","r":"caro","rar":"SR","lv":6,"atk":2300,"def":2200,"role":"辅助型","fx":[{"k":"lastStand"}],"text":"①：此卡不会被战斗破坏 1 次（每场决斗限 1 次）。"},"m27":{"k":"M","id":"m27","n":"卡拉布","r":"caro","rar":"R","lv":3,"atk":1400,"def":1000,"role":"防御型","fx":[{"k":"heal","v":400}],"text":"①：此卡召唤成功时，自己回复 400 点生命值。"},"m28":{"k":"M","id":"m28","n":"负誓·奥吉尔","r":"chaos","rar":"SR","lv":5,"atk":1700,"def":2400,"role":"防御型","fx":[{"k":"guard"},{"k":"auraDef","v":200}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。②：自己场上其他怪兽守备力上升 200。"},"m29":{"k":"M","id":"m29","n":"奥瑞塔","r":"aqua","rar":"SR","lv":4,"atk":1700,"def":1200,"role":"伤害型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m30":{"k":"M","id":"m30","n":"凯刻斯","r":"aqua","rar":"SR","lv":4,"atk":1400,"def":1900,"role":"防御型","fx":[{"k":"spellShield"}],"text":"①：此卡不会成为对方魔法卡的效果对象。"},"m31":{"k":"M","id":"m31","n":"希莱斯特","r":"aqua","rar":"R","lv":3,"atk":1100,"def":1700,"role":"辅助型","fx":[{"k":"heal","v":500},{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己回复 500 点生命值并抽 1 张牌。"},"m32":{"k":"M","id":"m32","n":"克珀珊特","r":"aqua","rar":"SR","lv":5,"atk":1900,"def":2200,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m33":{"k":"M","id":"m33","n":"法洛思","r":"aqua","rar":"SR","lv":4,"atk":1600,"def":1300,"role":"辅助型","fx":[{"k":"bounce","v":1}],"text":"①：此卡召唤成功时，对方场上攻击力最高的 1 只怪兽回到手牌。"},"m34":{"k":"M","id":"m34","n":"戈利亚","r":"aqua","rar":"SR","lv":6,"atk":2400,"def":1700,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m35":{"k":"M","id":"m35","n":"墨菲","r":"aqua","rar":"R","lv":4,"atk":1300,"def":1800,"role":"辅助型","fx":[{"k":"onDestroyDraw","v":1}],"text":"①：此卡被战斗破坏送去墓地时，自己抽 1 张牌。"},"m36":{"k":"M","id":"m36","n":"诞妄·墨菲","r":"aqua","rar":"GR","lv":7,"atk":2600,"def":2300,"role":"辅助型","fx":[{"k":"snipe","v":1}],"text":"①：此卡召唤成功时，破坏对方场上 1 张盖放的魔法·陷阱卡。"},"m37":{"k":"M","id":"m37","n":"弥利亚姆","r":"aqua","rar":"R","lv":3,"atk":1200,"def":1400,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"aqua","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「深海」魔法卡加入手牌。"},"m38":{"k":"M","id":"m38","n":"珊","r":"aqua","rar":"R","lv":4,"atk":1000,"def":2100,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m39":{"k":"M","id":"m39","n":"莫丝","r":"aqua","rar":"R","lv":3,"atk":1400,"def":1000,"role":"伤害型","fx":[{"k":"directDiscard","v":1}],"text":"①：此卡直接攻击给予对方战斗伤害时，对方随机丢弃 1 张手牌。"},"m40":{"k":"M","id":"m40","n":"图鲁","r":"aqua","rar":"SR","lv":5,"atk":2100,"def":1800,"role":"伤害型","fx":[{"k":"atkUpTurn","v":200}],"text":"①：自己回合开始时，此卡攻击力永久上升 200。"},"m41":{"k":"M","id":"m41","n":"庞托斯","r":"aqua","rar":"SR","lv":4,"atk":1500,"def":2000,"role":"防御型","fx":[{"k":"onDestroyBurn","v":600}],"text":"①：此卡被破坏送去墓地时，给予对方 600 点伤害。"},"m42":{"k":"M","id":"m42","n":"威廉","r":"aqua","rar":"UR","lv":7,"atk":2600,"def":2600,"role":"防御型","fx":[{"k":"guard"},{"k":"turnHeal","v":300}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。②：自己回合开始时，自己回复 300 点生命值。"},"m43":{"k":"M","id":"m43","n":"卡茜亚","r":"ultra","rar":"R","lv":3,"atk":1100,"def":1600,"role":"辅助型","fx":[{"k":"search","f":"spell","r":"ultra","v":1}],"text":"①：此卡召唤成功时，从卡组把 1 张「超维」魔法卡加入手牌。"},"m44":{"k":"M","id":"m44","n":"卡斯托尔","r":"ultra","rar":"SR","lv":4,"atk":1500,"def":1800,"role":"防御型","fx":[{"k":"aura","r":"ultra","v":300}],"text":"①：只要此卡在场上表侧表示，自己场上其他「超维」怪兽攻击力上升 300。"},"m45":{"k":"M","id":"m45","n":"克莱门汀","r":"ultra","rar":"R","lv":4,"atk":1400,"def":1500,"role":"辅助型","fx":[{"k":"draw","v":1}],"text":"①：此卡召唤成功时，自己抽 1 张牌。"},"m46":{"k":"M","id":"m46","n":"达芙黛尔","r":"ultra","rar":"SR","lv":5,"atk":2000,"def":1500,"role":"伤害型","fx":[{"k":"snipeAttack","v":1}],"text":"①：此卡攻击宣言时，破坏对方场上 1 张盖放的魔法·陷阱卡。"},"m47":{"k":"M","id":"m47","n":"艾瑞卡","r":"ultra","rar":"SR","lv":4,"atk":1300,"def":2000,"role":"防御型","fx":[{"k":"guard"}],"text":"①：只要此卡在场上表侧守备表示，对方不能攻击其他怪兽。"},"m48":{"k":"M","id":"m48","n":"奥尔拉","r":"ultra","rar":"R","lv":3,"atk":1000,"def":1500,"role":"辅助型","fx":[{"k":"recall","f":"trap","v":1}],"text":"①：此卡召唤成功时，从自己墓地选 1 张陷阱卡加入手牌。"},"m49":{"k":"M","id":"m49","n":"詹金","r":"ultra","rar":"SR","lv":5,"atk":2100,"def":1600,"role":"伤害型","fx":[{"k":"pierce"}],"text":"①：此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值的战斗伤害。"},"m50":{"k":"M","id":"m50","n":"莉兹","r":"ultra","rar":"SR","lv":4,"atk":1600,"def":1400,"role":"伤害型","fx":[{"k":"onKillDraw","v":1}],"text":"①：此卡战斗破坏对方怪兽时，自己抽 1 张牌。"},"m51":{"k":"M","id":"m51","n":"波吕克斯","r":"ultra","rar":"SR","lv":6,"atk":2300,"def":1900,"role":"伤害型","fx":[{"k":"negateTrapOnce"}],"text":"①：此卡在场上表侧表示期间，自己可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。"},"m52":{"k":"M","id":"m52","n":"汀克特","r":"ultra","rar":"R","lv":3,"atk":900,"def":1700,"role":"辅助型","fx":[{"k":"bothDraw","v":1}],"text":"①：此卡召唤成功时，双方各抽 1 张牌。"},"m53":{"k":"M","id":"m53","n":"旺达","r":"ultra","rar":"R","lv":4,"atk":1200,"def":1900,"role":"防御型","fx":[{"k":"revive"}],"text":"①：此卡被破坏时，可以回到自己手牌（每场决斗限 1 次）。"},"m54":{"k":"M","id":"m54","n":"阿拉克涅","r":"ultra","rar":"SR","lv":5,"atk":1800,"def":2000,"role":"辅助型","fx":[{"k":"weaken","v":800}],"text":"①：此卡召唤成功时，对方场上攻击力最高的 1 只怪兽攻击力永久下降 800。"},"m55":{"k":"M","id":"m55","n":"神王·图鲁","r":"ultra","rar":"UR","lv":8,"atk":3000,"def":2500,"role":"伤害型","art":"@shadow","fx":[{"k":"destroyStrongest","v":1}],"text":"①：此卡需要 2 只祭品。②：此卡召唤成功时，破坏对方场上攻击力最高的 1 只怪兽。"},"m56":{"k":"M","id":"m56","n":"N","r":"ultra","rar":"UR","lv":8,"atk":2800,"def":2800,"role":"辅助型","fx":[{"k":"discardOpp","v":1},{"k":"draw","v":1}],"text":"①：此卡需要 2 只祭品。②：此卡召唤成功时，对方随机丢弃 1 张手牌，自己抽 1 张牌。"},"s01":{"k":"S","id":"s01","n":"命轮占卜","r":"any","t":"normal","rar":"N","fx":[{"k":"draw","v":2}],"text":"抽 2 张牌。","art":"@spell"},"s02":{"k":"S","id":"s02","n":"记忆回溯","r":"any","t":"normal","rar":"R","fx":[{"k":"recall","f":"monster","v":1}],"text":"从自己墓地选 1 只怪兽加入手牌。","art":"@spell"},"s03":{"k":"S","id":"s03","n":"银芯交易","r":"any","t":"normal","rar":"R","fx":[{"k":"lpDraw","v":1000}],"text":"自己支付 1000 点生命值，抽 2 张牌。","art":"@spell"},"s04":{"k":"S","id":"s04","n":"忘却之楔","r":"any","t":"normal","rar":"SR","fx":[{"k":"destroyWeak","v":1800}],"text":"对方场上攻击力最高的怪兽，若其攻击力不高于 1800，则破坏它。","art":"@spell"},"s05":{"k":"S","id":"s05","n":"命轮共鸣","r":"any","t":"normal","rar":"R","fx":[{"k":"pumpHighest","v":800}],"text":"自己场上攻击力最高的 1 只怪兽攻击力永久上升 800。","art":"@spell"},"s06":{"k":"S","id":"s06","n":"融蚀风暴","r":"any","t":"normal","rar":"SR","fx":[{"k":"burn","v":1000}],"text":"给予对方 1000 点伤害。","art":"@spell"},"s07":{"k":"S","id":"s07","n":"缄默契约","r":"any","t":"cont","rar":"R","fx":[{"k":"contHeal","v":500}],"text":"永续：自己每个回合结束时回复 500 点生命值。","art":"@spell"},"s08":{"k":"S","id":"s08","n":"记忆防线","r":"any","t":"quick","rar":"N","fx":[{"k":"quickDef","v":1000}],"text":"速攻：自己场上全部怪兽守备力直到回合结束时上升 1000。","art":"@spell"},"s09":{"k":"S","id":"s09","n":"熵增逆转","r":"chaos","t":"normal","rar":"R","fx":[{"k":"selfBurnDraw","v":1000}],"text":"自己受到 1000 点伤害，抽 2 张牌。","art":"@spell"},"s10":{"k":"S","id":"s10","n":"猩红邀约","r":"chaos","t":"equip","rar":"SR","fx":[{"k":"equipAtk","v":1000}],"text":"装备：装备怪兽攻击力上升 1000。","art":"@spell"},"s11":{"k":"S","id":"s11","n":"业火重燃","r":"chaos","t":"normal","rar":"R","fx":[{"k":"graveBurn","r":"chaos","v":200,"max":5}],"text":"自己墓地每有 1 只「混沌」怪兽，给予对方 200 点伤害（最多 5 只）。","art":"@spell"},"s12":{"k":"S","id":"s12","n":"疯狂低语","r":"chaos","t":"quick","rar":"R","fx":[{"k":"quickAtkAll","v":500}],"text":"速攻：自己场上全部怪兽攻击力直到回合结束时上升 500。","art":"@spell"},"s13":{"k":"S","id":"s13","n":"血之偿还","r":"caro","t":"normal","rar":"R","fx":[{"k":"graveHeal","v":300}],"text":"自己墓地每有 1 只怪兽，自己回复 300 点生命值。","art":"@spell"},"s14":{"k":"S","id":"s14","n":"再生之躯","r":"caro","t":"equip","rar":"SR","fx":[{"k":"equipDef","v":1200},{"k":"turnHeal","v":300}],"text":"装备：装备怪兽守备力上升 1200；自己回合开始时回复 300 点生命值。","art":"@spell"},"s15":{"k":"S","id":"s15","n":"红祭礼","r":"caro","t":"normal","rar":"R","fx":[{"k":"sacrificeHeal","v":1500}],"text":"破坏自己场上攻击力最低的 1 只怪兽，自己回复 1500 点生命值并抽 1 张牌。","art":"@spell"},"s16":{"k":"S","id":"s16","n":"无尽星光","r":"caro","t":"cont","rar":"SR","fx":[{"k":"contHeal","v":500},{"k":"auraDef","v":300}],"text":"永续：自己每个回合结束时回复 500 点生命值；自己场上怪兽守备力上升 300。","art":"@spell"},"s17":{"k":"S","id":"s17","n":"深渊回响","r":"aqua","t":"normal","rar":"N","fx":[{"k":"echoDraw","v":1}],"text":"双方各抽 1 张牌，然后自己再抽 1 张牌。","art":"@spell"},"s18":{"k":"S","id":"s18","n":"潮汐逆转","r":"aqua","t":"normal","rar":"SR","fx":[{"k":"bounce","v":1}],"text":"对方场上攻击力最高的 1 只怪兽回到手牌。","art":"@spell"},"s19":{"k":"S","id":"s19","n":"沉于深渊","r":"aqua","t":"cont","rar":"SR","fx":[{"k":"summonTaxDiscard","v":1}],"text":"永续：对方每次召唤成功时，随机丢弃 1 张手牌。","art":"@spell"},"s20":{"k":"S","id":"s20","n":"海祭典仪","r":"aqua","t":"normal","rar":"R","fx":[{"k":"realmDraw","r":"aqua","v":2}],"text":"自己场上每有 1 只「深海」怪兽，自己抽 1 张牌（最多 2 张）。","art":"@spell"},"s21":{"k":"S","id":"s21","n":"维度投射","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"snipeDraw","v":1}],"text":"破坏对方场上 1 张盖放的魔法·陷阱卡，自己抽 1 张牌。","art":"@spell"},"s22":{"k":"S","id":"s22","n":"参数拟合","r":"ultra","t":"normal","rar":"R","fx":[{"k":"discardOpp","v":1}],"text":"对方随机丢弃 1 张手牌。","art":"@spell"},"s23":{"k":"S","id":"s23","n":"净世之路","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"sweepWeak","v":1500}],"text":"场上攻击力不高于 1500 的怪兽全部破坏（双方）。","art":"@spell"},"s24":{"k":"S","id":"s24","n":"界外之音","r":"ultra","t":"cont","rar":"SR","fx":[{"k":"extraDraw","v":1}],"text":"永续：自己每次抽卡阶段多抽 1 张牌。","art":"@spell"},"s25":{"k":"S","id":"s25","n":"空间折叠","r":"ultra","t":"quick","rar":"R","fx":[{"k":"quickDirect","v":1}],"text":"速攻：自己场上攻击力最高的 1 只怪兽本回合可以直接攻击。","art":"@spell"},"s26":{"k":"S","id":"s26","n":"观测者之眼","r":"ultra","t":"normal","rar":"SR","fx":[{"k":"search","f":"monster","max":4,"v":1}],"text":"从卡组把 1 只等级 4 以下的怪兽加入手牌。","art":"@spell"},"t01":{"k":"T","id":"t01","n":"融蚀之槛","r":"any","t":"normal","rar":"SR","fx":[{"k":"destroyAttacker"}],"text":"对方怪兽攻击宣言时：破坏那只怪兽。","art":"@trap"},"t02":{"k":"T","id":"t02","n":"忘却的代价","r":"any","t":"normal","rar":"SR","fx":[{"k":"reflect","v":1000}],"text":"对方直接攻击宣言时：那次战斗伤害变成 0，给予对方 1000 点伤害。","art":"@trap"},"t03":{"k":"T","id":"t03","n":"缄默之壁","r":"any","t":"normal","rar":"R","fx":[{"k":"negateAttack"}],"text":"对方怪兽攻击宣言时：那次攻击无效。","art":"@trap"},"t04":{"k":"T","id":"t04","n":"逆流之忆","r":"any","t":"normal","rar":"N","fx":[{"k":"draw","v":2}],"text":"自己抽 2 张牌。","art":"@trap"},"t05":{"k":"T","id":"t05","n":"索魂链","r":"any","t":"cont","rar":"R","fx":[{"k":"contPunish","v":300}],"text":"永续：对方每次攻击宣言时，自己回复 500 点生命值，给予对方 300 点伤害。","art":"@trap"},"t06":{"k":"T","id":"t06","n":"悖论","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSpell"}],"text":"反击：对方魔法卡的发动无效并破坏。","art":"@trap"},"t07":{"k":"T","id":"t07","n":"圣所钟声","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSummon"}],"text":"反击：对方 1 次召唤无效，那只怪兽破坏。","art":"@trap"},"t08":{"k":"T","id":"t08","n":"猎手的陷阱","r":"any","t":"normal","rar":"R","fx":[{"k":"destroySummon","v":2000}],"text":"对方召唤成功时：若那只怪兽攻击力不高于 2000，破坏它。","art":"@trap"},"t09":{"k":"T","id":"t09","n":"银芯蒸发","r":"any","t":"normal","rar":"N","fx":[{"k":"tradeDraw"}],"text":"对方抽 1 张牌，自己抽 2 张牌。","art":"@trap"},"t10":{"k":"T","id":"t10","n":"记忆碎屑","r":"any","t":"normal","rar":"R","fx":[{"k":"discardOpp","v":2}],"text":"对方随机丢弃 2 张手牌。","art":"@trap"},"t11":{"k":"T","id":"t11","n":"终天之诗","r":"any","t":"cont","rar":"SR","fx":[{"k":"contBurn","v":500}],"text":"永续：对方每个回合结束时受到 500 点伤害。","art":"@trap"},"t12":{"k":"T","id":"t12","n":"血之誓约","r":"any","t":"normal","rar":"N","fx":[{"k":"healDraw","v":1000}],"text":"自己回复 1000 点生命值并抽 1 张牌。","art":"@trap"},"t13":{"k":"T","id":"t13","n":"深渊之口","r":"any","t":"normal","rar":"R","fx":[{"k":"bounce","v":1}],"text":"对方场上攻击力最高的 1 只怪兽回到手牌。","art":"@trap"},"t14":{"k":"T","id":"t14","n":"维度囚笼","r":"any","t":"normal","rar":"R","fx":[{"k":"weakenEnemyAll","v":500}],"text":"对方场上全部怪兽攻击力直到回合结束时下降 500。","art":"@trap"},"t15":{"k":"T","id":"t15","n":"王权之令","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateSpellSnipe"}],"text":"反击：对方魔法卡的发动无效并破坏，然后破坏对方 1 张盖放的卡。","art":"@trap"},"t16":{"k":"T","id":"t16","n":"校猫的恶作剧","r":"any","t":"normal","rar":"SR","fx":[{"k":"snipeDraw","v":1}],"text":"破坏对方场上 1 张盖放的魔法·陷阱卡，自己抽 1 张牌。","art":"@trap"},"t17":{"k":"T","id":"t17","n":"无光之夜","r":"any","t":"normal","rar":"R","fx":[{"k":"weakenHighest","v":1000}],"text":"对方场上攻击力最高的 1 只怪兽攻击力直到回合结束时下降 1000。","art":"@trap"},"t18":{"k":"T","id":"t18","n":"巡夜人的灯","r":"any","t":"normal","rar":"R","fx":[{"k":"battleBoost","v":1000}],"text":"对方怪兽攻击宣言时：自己场上全部怪兽攻击力直到回合结束时上升 1000。","art":"@trap"},"t19":{"k":"T","id":"t19","n":"契约反噬","r":"any","t":"counter","rar":"SR","fx":[{"k":"negateTrap"}],"text":"反击：对方陷阱卡的发动无效并破坏。","art":"@trap"},"t20":{"k":"T","id":"t20","n":"弥萨格的黄昏","r":"any","t":"cont","rar":"SR","fx":[{"k":"contBoth","v":300}],"text":"永续：自己每个回合开始时回复 300 点生命值，给予对方 300 点伤害。","art":"@trap"},"e01":{"k":"E","id":"e01","n":"终末·噬血链球","r":"chaos","rar":"UR","lv":8,"atk":3500,"def":2500,"role":"伤害型","mat":["血链·希洛","凯蒂古拉"],"fx":[{"k":"pierce"},{"k":"burn","v":1000}],"text":"「血链·希洛」＋「凯蒂古拉」。①：此卡觉醒召唤成功时，给予对方 1000 点伤害。②：此卡攻击守备表示怪兽时给予贯穿伤害。","art":"血链·希洛"},"e02":{"k":"E","id":"e02","n":"夜巡·弥萨格之眼","r":"ultra","rar":"UR","lv":8,"atk":3200,"def":2400,"role":"伤害型","mat":["波吕克斯","詹金"],"fx":[{"k":"negateTrapOnce"},{"k":"pierce"}],"text":"「波吕克斯」＋「詹金」。①：此卡可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。②：此卡攻击守备表示怪兽时给予贯穿伤害。","art":"波吕克斯"},"e03":{"k":"E","id":"e03","n":"深潜·诞妄回响","r":"aqua","rar":"UR","lv":8,"atk":3000,"def":2600,"role":"辅助型","mat":["墨菲","法洛思"],"fx":[{"k":"draw","v":2},{"k":"turnHeal","v":300}],"text":"「墨菲」＋「法洛思」。①：此卡觉醒召唤成功时，自己抽 2 张牌。②：自己回合开始时回复 300 点生命值。","art":"诞妄·墨菲"},"e04":{"k":"E","id":"e04","n":"熵王·熔毁之冠","r":"chaos","rar":"UR","lv":8,"atk":3300,"def":2500,"role":"伤害型","mat":["熔毁·朵尔","24"],"fx":[{"k":"destroyStrongest","v":1},{"k":"pierce"}],"text":"「熔毁·朵尔」＋「24」。①：此卡觉醒召唤成功时，破坏对方攻击力最高的 1 只怪兽。②：此卡攻击守备表示怪兽时给予贯穿伤害。","art":"熔毁·朵尔"},"e05":{"k":"E","id":"e05","n":"净世·破晓投枪","r":"ultra","rar":"UR","lv":8,"atk":3100,"def":2300,"role":"伤害型","mat":["达芙黛尔","莉兹"],"fx":[{"k":"snipeAttack","v":1},{"k":"onKillDraw","v":1}],"text":"「达芙黛尔」＋「莉兹」。①：此卡攻击宣言时，破坏对方 1 张盖放的魔法·陷阱卡。②：此卡战斗破坏对方怪兽时，自己抽 1 张牌。","art":"达芙黛尔"},"e06":{"k":"E","id":"e06","n":"王权·终焉图鲁","r":"aqua","rar":"GR","lv":10,"atk":3800,"def":3000,"role":"伤害型","mat":["神王·图鲁","威廉"],"art":"@shadow2","fx":[{"k":"pierce"},{"k":"guard"}],"text":"「神王·图鲁」＋「威廉」。①：此卡攻击守备表示怪兽时给予贯穿伤害。②：只要此卡在场上，对方不能攻击其他怪兽。"},"e07":{"k":"E","id":"e07","n":"悖论·无解之环","r":"ultra","rar":"UR","lv":8,"atk":3400,"def":2600,"role":"辅助型","mat":["N","汀克特"],"fx":[{"k":"discardOpp","v":1},{"k":"draw","v":1},{"k":"negateTrapOnce"}],"text":"「N」＋「汀克特」。①：此卡觉醒召唤成功时，对方随机丢弃 1 张手牌，自己抽 1 张牌。②：此卡可以把对方发动的 1 张陷阱卡无效（每场决斗限 1 次）。","art":"N"},"e08":{"k":"E","id":"e08","n":"血月·杜勒赛因","r":"caro","rar":"UR","lv":8,"atk":3300,"def":2400,"role":"伤害型","mat":["杜勒赛因","索蕾尔"],"fx":[{"k":"drain","v":100},{"k":"onKillAtk","v":300}],"text":"「杜勒赛因」＋「索蕾尔」。①：此卡给予对方战斗伤害时，自己回复那个数值的生命值。②：此卡战斗破坏对方怪兽时，攻击力永久上升 300。","art":"杜勒赛因"},"e09":{"k":"E","id":"e09","n":"灰烬·萝坦双刃","r":"chaos","rar":"UR","lv":8,"atk":3000,"def":2200,"role":"伤害型","mat":["蚀灭·萝坦","珈伦"],"fx":[{"k":"twin"},{"k":"onKillAtk","v":200}],"text":"「蚀灭·萝坦」＋「珈伦」。①：此卡在同一个战斗阶段中可以攻击 2 次。②：此卡战斗破坏对方怪兽时，攻击力永久上升 200。","art":"蚀灭·萝坦"},"e10":{"k":"E","id":"e10","n":"圣所·负誓之壁","r":"caro","rar":"SR","lv":8,"atk":2700,"def":3400,"role":"防御型","mat":["负誓·奥吉尔","萨尔瓦多"],"fx":[{"k":"guard"},{"k":"auraDef","v":400}],"text":"「负誓·奥吉尔」＋「萨尔瓦多」。①：只要此卡在场上，对方不能攻击其他怪兽。②：自己场上其他怪兽守备力上升 400。","art":"负誓·奥吉尔"},"e11":{"k":"E","id":"e11","n":"环行·无限回廊","r":"chaos","rar":"SR","lv":8,"atk":3000,"def":2500,"role":"辅助型","mat":["环行·拉蒙娜","薇薇安"],"fx":[{"k":"draw","v":1},{"k":"recall","f":"spell","v":1}],"text":"「环行·拉蒙娜」＋「薇薇安」。①：此卡觉醒召唤成功时，自己抽 1 张牌，并从墓地选 1 张魔法卡加入手牌。","art":"环行·拉蒙娜"},"e12":{"k":"E","id":"e12","n":"弥萨格校猫","r":"any","rar":"GR","lv":6,"atk":2600,"def":2000,"role":"辅助型","matRealm":"any","matN":2,"fx":[{"k":"draw","v":1},{"k":"discardOpp","v":1},{"k":"revive"}],"text":"自己场上 2 只界域不同的怪兽。①：此卡觉醒召唤成功时，自己抽 1 张牌，对方随机丢弃 1 张手牌。②：此卡被破坏时回到手牌（每场决斗限 1 次）。","art":"弥萨格校猫"}};
const PACKS = [{"id":"bp01","n":"初醒之轮","en":"AWAKENING WHEEL","sub":"混沌 · 血肉","desc":"第一批被守密人记起来的东西。牌面还是热的：混沌的熵、血肉的誓，以及一批还没学会害怕的唤醒体。","cards":["m01","m02","m03","m04","m05","m06","m07","m08","m09","m10","m11","m12","m13","m14","m15","m16","m17","m18","m19","m20","m21","m22","m23","m24","m25","m26","m27","m28","s01","s02","s03","s04","s05","s06","s09","s10","s11","s12","s13","s14","s15","s16","t01","t02","t04","t12"]},{"id":"bp02","n":"深潜回响","en":"ECHOES BELOW","sub":"深海","desc":"往弥萨格的地基下面走四十层，能听见水声。深海界域的记忆是咸的：它们不喊救命，只把人慢慢往下拉。","cards":["m29","m30","m31","m32","m33","m34","m35","m36","m37","m38","m39","m40","m41","m42","s17","s18","s19","s20","s01","s06","t05","t13","t01","t03","t04"]},{"id":"bp03","n":"超维裂隙","en":"RIFT OF ULTRA","sub":"超维","desc":"从裂隙里看出去，弥萨格只是纸上的一行注脚。超维界域的人擅长把「已经发生的事」改写成一纸参数。","cards":["m43","m44","m45","m46","m47","m48","m49","m50","m51","m52","m53","m54","m55","m56","s21","s22","s23","s24","s25","s26","t06","t07","t14","t17","t18","t19"]},{"id":"bp04","n":"忘却之诗","en":"POEM OF OBLIVION","sub":"觉醒体 · 反击","desc":"把两个人的名字叠在同一张牌上，命轮会替他们给出一个答案——通常不是他们想要的答案。","cards":["e01","e02","e03","e04","e05","e06","e07","e08","e09","e10","e11","s05","s07","s08","t06","t07","t08","t09","t10","t11","t15","t19","t20"]},{"id":"sp01","n":"校猫的私藏","en":"THE CAT'S DRAWER","sub":"彩蛋 · 混编","desc":"没人知道这只猫把东西藏在哪里。抽出来的牌常常不属于任何一个卡包，甚至不属于任何一个界域。","cards":["e12","t16","m55","m56","m42","m12","m18","m36","m51","m01","e07","s03","s21","s26"]}];
const BONDS = [{"id":"b1","n":"终天三席","need":["24","熔毁·朵尔","凯蒂古拉"],"fx":[{"k":"atkNames","list":["24","熔毁·朵尔","凯蒂古拉"],"v":300},{"k":"draw","v":1}],"text":"「24」「熔毁·朵尔」「凯蒂古拉」同时在卡组中：开局抽 1 张，这三只怪兽攻击力 +300。"},{"id":"b2","n":"熵之回响","need":["凯蒂古拉","潘狄娅"],"fx":[{"k":"burnBonus","v":200}],"text":"「凯蒂古拉」「潘狄娅」同时在卡组中：自己卡的效果给予对方的伤害 +200。"},{"id":"b3","n":"净世巡夜","need":["波吕克斯","詹金"],"fx":[{"k":"atkRealm","r":"ultra","v":300}],"text":"「波吕克斯」「詹金」同时在卡组中：自己场上「超维」怪兽攻击力 +300。"},{"id":"b4","n":"猫与灯","need":["汀克特","卡茜亚"],"fx":[{"k":"searchTrap","v":1}],"text":"「汀克特」「卡茜亚」同时在卡组中：开局从卡组把 1 张陷阱卡加入手牌。"},{"id":"b5","n":"观测者的证词","need":["卡茜亚","卡斯托尔"],"fx":[{"k":"defRealm","r":"ultra","v":500}],"text":"「卡茜亚」「卡斯托尔」同时在卡组中：自己场上「超维」怪兽守备力 +500。"},{"id":"b6","n":"深潜三重奏","need":["墨菲","法洛思","奥瑞塔"],"fx":[{"k":"draw","v":1},{"k":"defRealm","r":"aqua","v":400}],"text":"「墨菲」「法洛思」「奥瑞塔」同时在卡组中：开局抽 1 张，自己场上「深海」怪兽守备力 +400。"},{"id":"b7","n":"血脉同源","need":["希洛","血链·希洛","杜勒赛因"],"fx":[{"k":"atkRealm","r":"caro","v":300},{"k":"lp","v":1000}],"text":"「希洛」「血链·希洛」「杜勒赛因」同时在卡组中：生命值 +1000，自己场上「血肉」怪兽攻击力 +300。"},{"id":"b8","n":"誓约之血","need":["索蕾尔","雷娅"],"fx":[{"k":"healBonus","v":300}],"text":"「索蕾尔」「雷娅」同时在卡组中：自己每次回复生命值时多回复 300。"},{"id":"b9","n":"缄默者","need":["诺缔拉","莉莉","旺达"],"fx":[{"k":"draw","v":1},{"k":"healPerTurn","v":200}],"text":"「诺缔拉」「莉莉」「旺达」同时在卡组中：开局抽 1 张，自己每个回合结束回复 200。"},{"id":"b10","n":"四界混编","cond":"realms4","fx":[{"k":"atkAll","v":200}],"text":"主卡组里四个界域都有卡：自己场上全部怪兽攻击力 +200。"},{"id":"b11","n":"王权","need":["神王·图鲁","N"],"fx":[{"k":"lp","v":500},{"k":"draw","v":1}],"text":"「神王·图鲁」「N」同时在卡组中：生命值 +500，开局抽 1 张。"},{"id":"b12","n":"校猫的偏爱","cond":"hasCard:t16","fx":[{"k":"draw","v":1},{"k":"lp","v":500}],"text":"卡组里有「校猫的恶作剧」：生命值 +500，开局抽 1 张。"}];
const DECKS = [{"id":"d1","n":"终天教团 · 熵火","en":"ENTROPY PYRE","r":"chaos","desc":"用命换速度。召唤即伤害，伤害即抽牌；血条是自己点的火，烧到对面先熄。","cards":[["m01",2],["m02",3],["m03",2],["m07",1],["m09",1],["m11",1],["m12",2],["m13",1],["m14",2],["s02",1],["s06",1],["s10",1],["s12",1],["s01",1],["t02",2],["t06",1],["t03",1],["t19",1],["s03",1],["s07",2],["t09",1],["s11",1]],"extra":["e04","e09"],"combo":["「24」或「潘狄娅」先落地，一张牌换一次抽牌或 500 点直伤。","「猩红邀约」贴在「凯蒂古拉」上，2100 变 3100，贯穿直接打穿守备。","「熔毁·朵尔」＋「24」＝「熵王·熔毁之冠」：3300 贯穿，登场再拆一只。"],"tips":"不要省血。这套牌的生命值是资源，6000 里有 2000 是拿来烧的；但要留在 1500 以上，否则一张「融蚀风暴」就结束了。"},{"id":"d2","n":"弥萨格夜巡","en":"NIGHT WATCH","r":"ultra","desc":"不抢血，抢节奏。用反击陷阱把对方的每一步都变成一次无效，最后让波吕克斯收场。","cards":[["m51",2],["m49",3],["m43",2],["m44",1],["m46",1],["m47",1],["m48",1],["m50",2],["m53",1],["s26",2],["s24",2],["s21",1],["s23",1],["s03",1],["t06",2],["t07",1],["t03",1],["t14",1],["t16",1],["m54",1],["s08",2]],"extra":["e02","e05"],"combo":["「卡茜亚」「珈伦」这类检索卡先找齐反击：「悖论」管魔法，「圣所钟声」管召唤。","「界外之音」在场后每回合多抽 1，反击牌永远比对手多一张。","「波吕克斯」＋「詹金」＝「夜巡·弥萨格之眼」，3200 贯穿，还能封一张陷阱。"],"tips":"盖牌顺序有讲究：先盖「圣所钟声」再盖「悖论」，对手往往会先试魔法、被你换掉一张。"},{"id":"d3","n":"深潜回响","en":"DEEP ECHO","r":"aqua","desc":"把对手的场面一张张弹回手牌，用抽牌把资源差距拉到对手看不懂的地方。","cards":[["m29",2],["m30",1],["m32",2],["m33",2],["m35",2],["m37",1],["m39",1],["m40",3],["s17",2],["s18",2],["s19",1],["s20",1],["s01",1],["s02",1],["s08",1],["t13",3],["t02",1],["t04",1],["t12",1],["m34",1]],"extra":["e03"],"combo":["「奥瑞塔」落地抽 1，「海祭典仪」在两只深海站住后再开，一次两张。","「潮汐逆转」＋「深渊之口」＝ 两次弹回，对方的祭品永远凑不齐。","「墨菲」＋「法洛思」＝「深潜·诞妄回响」，3000 守备 2600，登场抽 2。"],"tips":"这套牌不怕拖。牌差一旦到 3 张以上，就用「沉于深渊」让对手每次召唤都要丢牌。"},{"id":"d4","n":"血肉之诺","en":"COVENANT OF FLESH","r":"caro","desc":"不追求一波打死。每回合回一点、每只怪兽多站一会儿，等「血链·希洛」把差距连本带利收回来。","cards":[["m15",1],["m16",2],["m17",1],["m18",1],["m19",1],["m20",3],["m21",2],["m24",2],["m25",2],["m28",1],["s13",1],["s14",2],["s15",1],["s16",1],["s07",1],["s05",1],["s01",1],["t12",1],["t01",1],["t18",1],["s06",1],["t02",2]],"extra":["e08","e10"],"combo":["「菲茵特」＋「无尽星光」：每个回合结束回 800，两回合就把一张「融蚀风暴」赚回来。","「索蕾尔」付 500 换 500 攻，配「再生之躯」变成 2500 攻 / 2900 守的双面怪。","「杜勒赛因」＋「索蕾尔」＝「血月·杜勒赛因」：3300，打一下回一次。"],"tips":"血量领先时不要急着进攻。这套牌的胜点常在对手牌库见底那两回合。"},{"id":"d5","n":"虚无教义","en":"DOCTRINE OF NOTHING","r":"any","desc":"终天教团的另一种传教方式：不主动进攻，只让对手每一次出手都付出代价。十张陷阱，四界齐备。","cards":[["m04",2],["m05",2],["m16",1],["m39",2],["m43",2],["m47",2],["m48",1],["m53",2],["s01",1],["s02",1],["s08",3],["s06",1],["t01",2],["t02",1],["t03",2],["t06",1],["t07",1],["t19",1],["t20",1],["t11",1]],"extra":["e12"],"combo":["「诺缔拉」「莉莉」「旺达」三个守备怪站满，对手只能先拆墙。","「弥萨格的黄昏」＋「终天之诗」：每回合净赚 300 血差，十回合就是 3000。","四界齐备触发「四界混编」，一堵 1200 攻的墙也能咬人。"],"tips":"盖牌不要一次盖满。留一格空位，对手会误判你没有第二张「融蚀之槛」。"},{"id":"d6","n":"校猫的私藏","en":"THE CAT'S DRAWER","r":"any","desc":"四界混编的杂牌，靠觉醒体翻盘。没人知道下一张是什么——包括你自己。","cards":[["m09",2],["m12",1],["m18",2],["m40",1],["m42",1],["m48",2],["m51",1],["m52",1],["m55",1],["m56",1],["s01",1],["s06",2],["t01",1],["t11",1],["t14",1],["t16",2],["s14",1],["s09",1],["t12",2],["m38",1],["s02",1],["m54",1],["s23",1],["s18",1]],"extra":["e12","e07","e06"],"combo":["「校猫的恶作剧」拆掉对手唯一一张盖牌，然后「弥萨格校猫」登场：抽 1、对手弃 1。","「神王·图鲁」＋「威廉」＝「王权·终焉图鲁」，3800 攻还带守备嘲讽。","「N」＋「汀克特」＝「悖论·无解之环」，一次弃牌、一次抽牌、一次封陷阱。"],"tips":"这套牌什么都有，什么都不精。觉醒体是唯一的赢法：留好素材，别把它们当祭品吃掉。"},{"id":"d7","n":"超维观测所","en":"OBSERVATORY","r":"ultra","desc":"把「已经发生的事」改写成参数：检索、改写、无效，最后用一支净世投枪一次清算。","cards":[["m43",3],["m44",1],["m46",3],["m47",2],["m49",2],["m50",2],["m51",3],["m52",1],["m54",1],["s26",2],["s21",1],["s01",1],["s06",1],["t11",1],["m45",1],["s23",1],["t03",1],["t06",1],["m56",1],["m53",1]],"extra":["e05","e02"],"combo":["「观测者之眼」先从卡组把「达芙黛尔」或「莉兹」拿到手，凑齐净世投枪的两只素材。","「猫与灯」开局就给一张陷阱；「观测者的证词」让超维守备怪 +500，撑到觉醒那一步。","「净世之路」扫掉对方 1500 以下的杂兵，再让 3200 的「夜巡·弥萨格之眼」落地。"],"tips":"前期不该硬拼。反击陷阱留着等对手的关键魔法，别为了省 1000 点血把「悖论」用在便宜牌上。"},{"id":"d8","n":"圣所 · 负誓之壁","en":"SANCTUARY VOW","r":"caro","desc":"先靠守备与回复把场面拖住：等「血链·希洛」和「凯蒂古拉」同时到手，一张「终末·噬血链球」把前面攒的血一次收回来。","cards":[["m02",2],["m15",3],["m18",2],["m20",2],["m21",2],["m22",2],["m24",1],["m28",2],["m25",1],["s01",1],["s05",2],["s10",1],["s14",1],["s16",1],["t01",1],["t20",1],["t12",1],["m26",1],["t08",1],["s03",1],["t07",1]],"extra":["e01","e10"],"combo":["「圣所·负誓之壁」在场时对面只能打它：2700 / 3400 再贴「再生之躯」，几乎推不动。","「誓约之血」让每次回血多 300——一张「血之誓约」就变成 1300。","「血链·希洛」＋「凯蒂古拉」＝「终末·噬血链球」：3500 攻，登场再烧 1000。"],"tips":"素材可以一只手在场上、另一只从手牌来，所以别急着把「凯蒂古拉」当祭品用掉。血之偿还在墓地堆起来之后再用，900 点回血抵得上一张牌。"},{"id":"d9","n":"燃尽序曲","en":"PYRE OVERTURE","r":"chaos","desc":"全是小怪，全靠数量和直伤。三回合内没把对面压到 3000 以下，这套牌就没牌了。","cards":[["m01",2],["m02",1],["m03",2],["m06",2],["m07",2],["m08",1],["m09",2],["m11",2],["m13",3],["m14",2],["s01",1],["s05",1],["s06",1],["s09",2],["s11",2],["s12",2],["s04",1],["s02",1]],"extra":["e09","e11"],"combo":["「疯狂低语」给全场 +500：三只小怪站住时，一张牌就是 1500 的攻势。","「业火重燃」按墓地里混沌怪兽的数量烧脸，所以祭品在这里不是亏，是上膛。","「灰烬·萝坦双刃」一个战斗阶段打两次；「环行·无限回廊」登场还能从墓地捞回一张牌。"],"tips":"血也敢烧：「熵增逆转」用 1000 点血换 2 张牌，通常比多站一只 1300 的怪划算。"}];
const LORE = {"_note":"《忘却前夜·唤醒王：决斗链接》的世界观与设定。术语沿用原作，卡牌规则与「唤醒王：决斗链接」这套玩法是本作私设。","intro":"这不是一场战争。战争会留下废墟，而这里连废墟都不会留下——被忘掉的东西不会变成灰，它只是从来没有存在过。","realms":[{"id":"chaos","n":"混沌","en":"CHAOS","color":"#e8656f","motto":"用身体换一个答案","desc":"熵的界域。这里的记忆是烧起来的：越是想记住什么，越要先把自己点着。混沌的唤醒体多半不在意代价，她们只在意那把火烧到谁身上。","style":"直伤 · 自损换攻 · 破坏"},{"id":"caro","n":"血肉","en":"CARO","color":"#d98b6a","motto":"伤口是可以谈条件的","desc":"血肉的界域。这里的规则很朴素：欠了就还。血可以当钱、当誓、当契约的墨水。血肉的唤醒体擅长把已经付出的东西再要回来一次。","style":"回复 · 墓地回收 · 耐战"},{"id":"aqua","n":"深海","en":"AEQUOR","color":"#5b9bd5","motto":"往下走，别回头","desc":"深海的界域。水会冲掉名字，也会把冲掉的东西堆在更深的地方。深海的唤醒体不急着杀你，她们只是让你的牌一张张离开该在的位置。","style":"抽牌 · 弹手 · 资源压制"},{"id":"ultra","n":"超维","en":"ULTRA","color":"#e3b341","motto":"已经发生的事，可以重写","desc":"维度的界域。这里的人看弥萨格像看一行注脚：既然只是注脚，就可以改。超维的唤醒体最擅长的不是进攻，是让对方的进攻「没有发生过」。","style":"无效 · 反击 · 检索"}],"chapters":[{"id":"c1","t":"一 · 忘却前夜","sub":"THE NIGHT BEFORE FORGETTING","quote":"那一夜没有火光，也没有喊声。第二天早上，少了一条街。","ps":["人们后来把那一夜叫做「忘却前夜」：不是遗忘的开始，而是遗忘被人们发现的那一晚。在那之前，融蚀已经吃了很多东西，只是没有人察觉——因为被吃掉的东西，连「少了什么」这个念头都一起没了。","融蚀不摧毁，它撤回。一栋楼不是倒塌，是从来没有人盖过；一个人不是死去，是户口本上从来没有这一行。世界上只剩下最后一座还在「记得」的城市：弥萨格。","弥萨格之所以还在，是因为城里有一群人自愿承担了全部的记忆。他们记得每一条被撤掉的街、每一个被撤掉的名字，代价是这些记忆会像石头一样压在他们身上，一天比一天重。"]},{"id":"c2","t":"二 · 守密人","sub":"THE KEEPER","quote":"我不打架。我只是记得你打过。","ps":["守密人不是战士。他们的能力只有一项：记住。别人忘掉的东西，他们替世界记着；替世界记着的东西，他们不能忘，也忘不掉。","弥萨格给每位守密人配一间没有窗的房间，房间里堆满卡片。每一张卡片上写着一个名字、一段残存的记忆、一句那个人最后说过的话。守密人每天要做的事就是重新读一遍——不读，那些东西就会重新滑进融蚀里。","读得久了，卡片会开始回应。你会发现某一张牌的边角是热的，某一张在你手里轻轻动了一下，像有人在里面翻身。那不是错觉：被记住得足够久的东西，会想要回来。"]},{"id":"c3","t":"三 · 唤醒与命轮","sub":"AWAKENING & THE WHEEL","quote":"命轮不是命运。命运不会给你第二次抽牌的机会。","ps":["把一张卡片读到足够熟，卡片上的人就会「醒」。这个过程叫唤醒：不是复活，复活需要尸体；唤醒只需要有人还在想她。醒过来的存在被称为唤醒体，她们有自己的脾气、自己的旧账，以及一个共同的处境——世界已经不记得她们了。","唤醒体不能长期停留在现实里。她们需要一个载体，那就是命轮：一枚刻满刻痕的环。每一道刻痕是一段记忆，每一张卡是一道刻痕的投影。所以牌组不是武器库，是一个人的全部履历。你把谁放进牌组，就等于承认「我记得她」。","命轮也有代价。唤醒体每次被召唤，都要从守密人身上借走一点「确定的记忆」——不是忘掉某件事，而是对某件事不再确定。老练的守密人会把不重要的东西排在前面：今天的天气、昨天的晚饭、自己的生日。"]},{"id":"c4","t":"四 · 四界域","sub":"THE FOUR REALMS","quote":"四个界域，四种还债的方式。","ps":["唤醒体按记忆的质地分成四个界域。这不是地理，是「她属于哪一种遗忘」。","混沌的记忆是烧的，血肉的记忆是疼的，深海的记忆是沉的，超维的记忆是冷的。两个界域的人站在一起，命轮上的刻痕会互相咬合——这就是为什么有些组合一上手就顺，有些怎么打都别扭。","守密人把这种咬合叫做「羁绊」。它不是感情，是结构：两段记忆接得上，力量就会从接缝里漏出来。老守密人带新人时只说一句：先配人，再配牌。"]},{"id":"c5","t":"五 · 决斗链接","sub":"THE DUEL","quote":"输的人不是死。输的人要交出一张牌。","ps":["两个守密人之间的冲突，很少用拳头解决。他们把自己的命轮接上同一台仪器，让两套记忆在中间对撞——这就是「决斗链接」。","对决里的一切都有对应的现实代价：生命值是你还能维持「确定」的总量；祭品是你把两段记忆叠在一起，让位给更强的那个；觉醒召唤是把两个人放进同一张牌，让命轮替她们给出一个答案。答案通常不是她们想要的。","输掉对决的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡，下次唤醒她会更难。所以弥萨格的守密人从不轻易开局，也从不轻易认输。","先手不抽牌，是因为先手已经拿到了「先说话」的权利。这条规矩写在弥萨格第一版规程的第一页，据说是被某个守密人用血改上去的。"]},{"id":"c6","t":"六 · 终天教团","sub":"THE ORDER OF THE LAST DAY","quote":"既然都会被忘掉，为什么还要记得？","ps":["终天教团不认为融蚀是灾难，他们认为那是「清洗」。世界之所以痛苦，是因为所有人都在拼命记着不该记的东西；只要全部忘掉，就没有人会被失去弄疼。","教团的守密人也做决斗链接，只是他们的牌组里塞满了「虚无」：不进攻、只拖延、只让对方的每一步都付出代价。他们不追求赢，他们追求让你觉得「记得」这件事很累。","弥萨格官方不承认教团的存在。但档案室里少了一批卡片，少的那批全是「终天」相关的人——这件事没人敢往上报。"]},{"id":"c7","t":"七 · 弥萨格的猫","sub":"THE CAT OF MISAG","quote":"它不属于任何界域。它属于所有界域。","ps":["校猫在弥萨格的地位很奇怪：它不是唤醒体，不在任何一册档案里，也没有人记得它是哪一天出现在走廊上的。它想出现就出现，想消失就消失，四个界域的门对它都是开着的。","有守密人试过把它写进卡片。卡片上确实出现了猫，但那张牌每次打出来的效果都不一样——有时抽牌，有时让对手丢牌，有时什么都没发生，只是猫在牌面上打了一个哈欠。","规程里有一条专门为它加的附注：若对决中出现无法归类的现象，先确认附近有没有猫。"]},{"id":"c8","t":"八 · 卡包的来历","sub":"WHERE THE PACKS COME FROM","quote":"每一包都是一次清点：这些人，我还记得。","ps":["弥萨格的卡片不是印出来的，是「清点」出来的。档案室每隔一段时间要把积压的记忆整理成册，整理完的残页会被压成一套卡包。所以卡包的名字听起来都像档案编号。","「初醒之轮」是最早的一批，混沌与血肉，牌面还是热的；「深潜回响」来自地基下面的四十层，纸是咸的；「超维裂隙」是从裂隙里捞出来的，编号经常对不上；「忘却之诗」全是觉醒体，每一张都写着两个名字。","「校猫的私藏」没有编号，也没有收录记录。它是从校猫睡觉的那个抽屉里掉出来的，一共十四张，其中有一张不是任何人的牌。"]}],"terms":[{"n":"融蚀","d":"一种「撤回」现象。被融蚀的东西不是被毁掉，而是从来没有存在过；连「少了什么」的念头都会一起消失。"},{"n":"弥萨格","d":"最后一座还在「记得」的城市。融蚀在这里推进得最慢，因为有一群人在替世界记着。"},{"n":"守密人","d":"以「记住」为能力的人。玩家在对决中扮演的角色。不战斗，只记得。"},{"n":"唤醒体","d":"被守密人读到「醒」过来的存在。不是复活，是有人还在想她。"},{"n":"命轮","d":"唤醒体的载体，一枚刻满刻痕的环。每一道刻痕是一段记忆，每一张卡是一道刻痕的投影。"},{"n":"界域","d":"按记忆质地划分的四类：混沌（烧）、血肉（疼）、深海（沉）、超维（冷）。"},{"n":"羁绊","d":"两段接得上的记忆。不是感情，是结构；接缝里会漏出力量。"},{"n":"祭品","d":"把两段记忆叠在一起，让位给更强的那个。等级 5–6 需要 1 只，7 以上需要 2 只。"},{"n":"觉醒召唤","d":"把两个人放进同一张牌，从额外卡组召唤觉醒体。素材送墓（至少一只在场上，另一只可从手牌来），不占通常召唤；但刚醒过来的人那一回合还不能动手。"},{"n":"命轮值","d":"本作对「生命值」的叫法。归零不是死，是「不再确定自己是谁」。"},{"n":"银芯","d":"弥萨格的流通物，也是开卡包的代价。打赢人机能拿到一些，难度越高拿得越多——和其他小游戏共用一个钱包。"},{"n":"终天教团","d":"认为忘却才是救赎的教团。牌组以陷阱与拖延为主，不追求赢，只让你觉得「记得」很累。"},{"n":"校猫","d":"不属于任何界域的猫。没有档案，没有编号，四个界域的门对它都开着。"}]};
const FACES = "data:image/webp;base64,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";
const BACK = "data:image/webp;base64,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";
const ART = {"cell":160,"cols":8,"rows":8,"w":1280,"h":1280,"index":{"24":0,"凯蒂古拉":1,"潘狄娅":2,"诺缔拉":3,"莉莉":4,"哈姆林":5,"珈伦":6,"塔薇":7,"莱克":8,"宁菲亚":9,"薇薇安":10,"熔毁·朵尔":11,"蚀灭·萝坦":12,"环行·拉蒙娜":13,"阿格里帕":14,"艾继丝":15,"杜勒赛因":16,"血链·希洛":17,"希洛":18,"菲茵特":19,"索蕾尔":20,"尤乌哈希":21,"皮克曼":22,"雷娅":23,"萨尔瓦多":24,"徐":25,"卡拉布":26,"负誓·奥吉尔":27,"奥瑞塔":28,"凯刻斯":29,"希莱斯特":30,"克珀珊特":31,"法洛思":32,"戈利亚":33,"墨菲":34,"诞妄·墨菲":35,"弥利亚姆":36,"珊":37,"莫丝":38,"图鲁":39,"庞托斯":40,"威廉":41,"卡茜亚":42,"卡斯托尔":43,"克莱门汀":44,"达芙黛尔":45,"艾瑞卡":46,"奥尔拉":47,"詹金":48,"莉兹":49,"波吕克斯":50,"汀克特":51,"旺达":52,"阿拉克涅":53,"@shadow":54,"N":55,"@shadow2":56,"弥萨格校猫":57,"@spell":58,"@trap":59}};
return { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART };
})();

// ---- js/duel/engine.js
const m_engine = await (async () => {
const { CARDS, BONDS } = m_gen;
// 《忘却前夜 · 唤醒王：决斗链接》规则引擎。
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

// 把一张牌放进手牌；手牌满了就挤进墓地（和抽牌爆手牌同一条规则），而不是凭空消失。
// 以前检索 / 弹回 / 复活这几处写的是「手牌没满才 push」，满了牌就直接丢了：
// 对手的「潮汐逆转」把你的怪兽弹回满手牌，那只怪兽连墓地都没进，整副牌少一张。
function handAdd(G, p, id, why) {
  if (p.hand.length < HAND_MAX) { p.hand.push({ uid: G.uid++, id }); return true; }
  p.grave.push(id);
  log(G, `${pname(p)}手牌已满，「${CARDS[id].n}」被挤进墓地${why ? `（${why}）` : ''}`, 'info');
  return false;
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
          if (p.hand.length >= HAND_MAX) { log(G, `${pname(p)}手牌已满，没能从墓地取回「${d.n}」`, 'info'); break; }
          const id = p.grave.splice(i, 1)[0];
          p.hand.push({ uid: G.uid++, id });
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
        log(G, `${pname(p)}检索了「${CARDS[id].n}」`, 'spell');
        handAdd(G, p, id, '检索');
      } else {
        log(G, `${pname(p)}想检索，但卡组里没有符合条件的牌`, 'info');
      }
      break;
    }
    case 'bounce': {
      const t = strongest(o);
      if (t) {
        removeMon(G, o, t);
        log(G, `「${CARDS[t.id].n}」被弹回${pname(o)}的手牌`, 'spell');
        handAdd(G, o, t.id, '弹回');
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
    log(G, `「${d.n}」回到${pname(p)}的手牌`, 'buff');
    handAdd(G, p, mon.id, '复活');
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
// 素材可以从「场上」或「手牌」来。
// 只认场上的话：三格场地 + 30 张卡组，两只指定怪兽同时站住的概率低到可怜，
// 自测 200 局里只成功觉醒过 1 次——那等于额外卡组从来没有参与过对局。
function canAwaken(G, p, extraId) {
  const d = CARDS[extraId];
  if (!d || d.k !== 'E') return null;
  if (p.extra.indexOf(extraId) < 0) return null;
  if (G.active !== p.idx || G.phase !== 'main' || G.over) return null;
  const pool = [];
  for (const m of p.mons) if (m) pool.push({ uid: m.uid, id: m.id, hand: false });
  for (const h of p.hand) {
    const c = CARDS[h.id];
    if (c && c.k === 'M') pool.push({ uid: h.uid, id: h.id, hand: true });
  }
  const fit = (picked) => {
    // 至少要有一只素材已经在场上：全是手牌的话，等于凭空多出一只大怪，
    // 这样觉醒就变成「抽到两张牌就白赚」，场上怎么打都无所谓了。
    return picked.some((x) => !x.hand);
  };

  if (d.matRealm === 'any') {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        if (realmOf(pool[i].id) === realmOf(pool[j].id)) continue;
        const picked = [pool[i], pool[j]];
        if (fit(picked)) return picked.map((x) => x.uid);
      }
    }
    return null;
  }
  const need = (d.mat || []).slice();
  const picked = [];
  for (const name of need) {
    const m = pool.find((x) => CARDS[x.id].n === name && picked.indexOf(x) < 0);
    if (!m) return null;
    picked.push(m);
  }
  return fit(picked) ? picked.map((x) => x.uid) : null;
}

function awaken(G, side, extraId) {
  const p = G.players[side];
  if (G.over) return fail('对决已经结束了');
  if (G.active !== side) return fail('现在不是你的回合');
  if (G.phase !== 'main') return fail('只能在主要阶段觉醒召唤');
  const mats = canAwaken(G, p, extraId);
  if (!mats) return fail('素材还没凑齐');
  const d = CARDS[extraId];
  // 素材本身就是位置：先把它们送墓，再拿空位（满场也能觉醒）
  for (const u of mats) {
    const m = p.mons.find((x) => x && x.uid === u);
    if (m) {
      removeMon(G, p, m);
      toGrave(G, p, m, '觉醒素材');
      continue;
    }
    const hi = p.hand.findIndex((x) => x.uid === u);
    if (hi >= 0) {
      const card = p.hand.splice(hi, 1)[0];
      p.grave.push(card.id);
      log(G, `「${CARDS[card.id].n}」从手牌作为觉醒素材送去墓地`, 'grave');
    }
  }
  const slot = freeSlot(p.mons);
  if (slot < 0) return fail('怪兽区已经满了，先腾一个位置');
  p.extra.splice(p.extra.indexOf(extraId), 1);
  const mon = mkMon(G, extraId, side);
  // 刚醒过来的人这一回合还不能动手：否则 3300 的觉醒体落下来就能直接打脸，
  // 三格场地一清空，一回合 6000+ 的直伤把对局变成了「谁先抽到素材」。
  mon.atkCount = 9;
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

  // 回合横幅要排在回合开始效果前面，不然「+200」会记到上一回合名下
  log(G, `—— 第 ${Math.ceil(G.turn / 2)} 回合 · ${pname(p)} ——`, 'turn');
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
// ------------------------------------------------------------------ 动作
// 一套「可序列化的动作」。人机、同屏双人、好友房都从这一个入口进：
// 好友房把动作丢到房间里让对方重放，所以这里每个分支都必须只依赖 G 和参数
// （随机全部走 G.rng，seed 相同 + 动作序列相同 → 两边状态必然一致）。
function applyAction(G, side, a) {
  if (!G || !a || !a.t) return fail('空动作');
  if (G.over) return fail('对决已经结束了');
  if (a.t === 'end' && G.active !== side) return fail('现在不是你的回合');
  switch (a.t) {
    case 'summon': return summon(G, side, a.uid, a.tribs || []);
    case 'setMon': return setMonster(G, side, a.uid);
    case 'spell': return activateSpell(G, side, a.uid);
    case 'trap': return setTrap(G, side, a.uid);
    case 'pos': return changePos(G, side, a.uid);
    case 'battle': return toBattle(G, side);
    case 'attack': return attack(G, side, a.uid, a.target == null ? null : a.target);
    case 'awaken': return awaken(G, side, a.id);
    case 'end': return endTurn(G);
    default: return fail('未知动作：' + a.t);
  }
}

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
return { LP_MAX, ZONES, HAND_MAX, REALM, handAdd, log, evalBonds, createGame, drawCards, atkOf, defOf, maxAttacks, canAttack, tributeNeed, canSummon, summon, setMonster, toGrave, removeMon, destroyMon, activateSpell, setTrap, canUse, attack, canAwaken, awaken, beginTurn, endTurn, toBattle, toMain2, changePos, applyAction, publicView };
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
  // 觉醒体的素材别拿去当祭品：凑齐了就能换一只大的
  const matNames = {};
  for (const id of p.extra) for (const nm of (d(id).mat || [])) matNames[nm] = 1;
  const out = [];
  for (const h of p.hand) {
    const def = d(h.id);
    if (!def || def.k !== 'M') continue;
    if (!canSummon(G, p, h.id)) continue;
    const need = tributeNeed(h.id);
    let tribs = [];
    if (need > 0) {
      const own = p.mons.filter(Boolean).sort((a, b) => {
        const am = matNames[d(a.id).n] ? 1 : 0;
        const bm = matNames[d(b.id).n] ? 1 : 0;
        if (am !== bm) return am - bm;
        return atkOf(G, p, a) - atkOf(G, p, b);
      });
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

// sloppy＝「打错牌」的概率（0~0.8）。历史上只有 easy/normal/hard 三个字符串，
// 现在段位要把对手一级一级往上顶，所以也接受直接给数字（见 duel/rank.js 的 aiFor）。
function sloppyOf(skill) {
  if (typeof skill === 'number' && isFinite(skill)) return Math.max(0, Math.min(0.8, skill));
  return skill === 'easy' ? 0.4 : skill === 'hard' ? 0 : 0.16;
}

// 乱召唤：手里能直接上的怪里随便挑一只（不挑最能打的）。只在不需要祭品的里面挑，
// 免得它把场上的墙献祭掉换一只更弱的——那就不是「打得差」，是「不会玩」了。
function lazySummon(G, p) {
  const free = summonOptions(G, p).filter((x) => !x.need);
  if (!free.length) return null;
  return free[Math.floor(G.rng() * free.length)];
}

// 乱撞：挑一个「打不过还要撞」的目标。真正的弱手不是不打，是见谁撞谁。
// 返回 null 表示场上没有可撞的目标（那就直接打脸）。
function worstAttack(G, side) {
  const p = G.players[side];
  const o = G.players[1 - side];
  const mine = p.mons.filter((m) => m && canAttack(G, p, m));
  if (!mine.length) return null;
  // 拿攻击力最低的那只，去撞对面攻击力最高的那只
  const a = mine.sort((x, y) => atkOf(G, p, x) - atkOf(G, p, y))[0];
  const foes = o.mons.filter(Boolean);
  if (!foes.length) return { uid: a.uid, target: null };
  const t = foes.sort((x, y) => atkOf(G, o, y) - atkOf(G, o, x))[0];
  return { uid: a.uid, target: t.uid };
}

// 返回「下一步」：{ t: 'awaken'|'spell'|'summon'|'setMon'|'trap'|'pos'|'battle'|'attack'|'end', ... }
function nextAction(G, side, skill) {
  const p = G.players[side];
  const o = G.players[1 - side];
  if (G.over) return null;
  const sloppy = sloppyOf(skill);

  if (G.phase === 'main') {
    // 1. 觉醒体优先：素材已经站住了就别再拖（弱手会一直忘）
    if (G.rng() >= sloppy * 0.8) {
      for (const id of p.extra) {
        if (canAwaken(G, p, id)) return { t: 'awaken', id };
      }
    }
    // 2. 该斩杀了就直接烧（弱手偶尔也会漏掉这一手）
    if (G.rng() >= sloppy * 0.5) {
      for (const h of p.hand) {
        const def = d(h.id);
        if (!def || def.k !== 'S') continue;
        for (const f of def.fx || []) {
          if (f.k === 'burn' && (f.v || 0) >= o.lp) return { t: 'spell', uid: h.uid };
        }
      }
    }
    // 3. 魔法
    if (G.rng() >= sloppy) {
      const sp = bestSpell(G, p, o);
      if (sp) return { t: 'spell', uid: sp.uid };
    }
    // 4. 召唤：这里有两种错法——该上不上（空过），或者随手上一只小的
    if (G.rng() >= sloppy * 0.55) {
      if (G.rng() < sloppy) {
        const bad = lazySummon(G, p);
        if (bad) return { t: 'summon', uid: bad.uid, tribs: [] };
      } else {
        const sum = bestSummon(G, p);
        if (sum) return { t: 'summon', uid: sum.uid, tribs: sum.tribs };
      }
    }
    // 5. 盖一只守备怪（手里有高守备、场上又空的时候）。
    //    弱手会把它正面摊在攻击表示上——那不是「另一种打法」，是白送一个突破口。
    if (p.mons.filter(Boolean).length < 2) {
      const cand = p.hand.filter((h) => {
        const def = d(h.id);
        return def && def.k === 'M' && tributeNeed(h.id) === 0;
      }).sort((a, b) => d(b.id).def - d(a.id).def)[0];
      if (cand && d(cand.id).def >= 1800 && !p.normalUsed) {
        if (G.rng() < sloppy * 0.6) return { t: 'summon', uid: cand.uid, tribs: [] };
        return { t: 'setMon', uid: cand.uid };
      }
    }
    // 6. 盖陷阱（最多两张，别把手牌全变成盖牌）
    const traps = p.hand.filter((h) => d(h.id) && d(h.id).k === 'T');
    const setCount = p.spells.filter((s) => s && s.set).length;
    if (traps.length && setCount < 2 && p.spells.indexOf(null) >= 0) {
      if (G.rng() >= sloppy * 0.4) return { t: 'trap', uid: traps[0].uid };
    }
    // 6.5 守备的高攻怪翻回攻击：打得过对方全场就别一直缩着（守备卡组全靠这一步才有输出）
    //     弱手想不起来翻，整套牌就只会挨打
    const wall = p.mons.find((m) => m && m.pos === 'def' && !m.set && atkOf(G, p, m) >= 1700);
    if (wall && G.rng() >= sloppy) {
      const mine = atkOf(G, p, wall);
      const theirs = o.mons.filter(Boolean);
      const worst = theirs.length
        ? Math.max.apply(null, theirs.map((t) => (t.pos === 'atk' && !t.set ? atkOf(G, o, t) : 0)))
        : 0;
      if (mine > worst) return { t: 'pos', uid: wall.uid };
    }
    // 7. 低攻怪兽转守备（弱手会把一只小怪一直摊在场上挨打）
    const weakAtk = p.mons.find((m) => m && m.pos === 'atk' && !m.set && atkOf(G, p, m) < 1600);
    if (weakAtk && G.rng() >= sloppy
      && o.mons.filter(Boolean).some((m) => m.pos === 'atk' && atkOf(G, o, m) > atkOf(G, p, weakAtk))) {
      return { t: 'pos', uid: weakAtk.uid };
    }
    return { t: 'battle' };
  }

  if (G.phase === 'battle') {
    const atk = bestAttack(G, side);
    if (atk) {
      if (G.rng() >= sloppy * 0.5) return { t: 'attack', uid: atk.uid, target: atk.target };
      // 走神：明明有好目标，却拿最弱的那只去撞最硬的那只
      const bad = worstAttack(G, side);
      if (bad && G.rng() < 0.5) return { t: 'attack', uid: bad.uid, target: bad.target };
      return { t: 'end' };
    }
    // 没有好目标——弱手也会硬撞
    if (G.rng() < sloppy * 0.6) {
      const bad = worstAttack(G, side);
      if (bad) return { t: 'attack', uid: bad.uid, target: bad.target };
    }
    return { t: 'end' };
  }
  return { t: 'end' };
}
return { nextAction };
})();

// ---- js/duel/net.js
const m_net = await (async () => {

// 好友房：这个站没有自己的后端（GitHub Pages 只有静态文件），
// 所以房间用一个公共的 pub/sub 当信箱：双方订阅同一个「房间主题」，
// 自己发的消息自己也会收到，用 from 过滤掉。
//
// 选 ntfy.sh 的原因：GET/POST 都开 CORS（Access-Control-Allow-Origin: *），
// 支持 SSE 长连接（一条连接接收，不会像轮询那样把免费配额烧光），
// 消息在服务端留 12 小时，中途掉线重连还能补上。
//
// 协议（房间里的每条消息都是这层 JSON）：
//   { k:'hi',   role:'a'|'b', deck:'d1' }         握手，每 5 秒重发一次直到对方应答
//   { k:'open', seed:123, a:'d1', b:'d3' }        房主定种子与双方卡组（a=房主）
//   { k:'ack' }                                    客人收到 open
//   { k:'act',  n:1, a:{t:'summon',uid:3} }        动作，n 从 1 递增，双方按序重放
//   { k:'ping' }                                   心跳
//   { k:'bye' }                                    退出
const RELAY = 'https://ntfy.sh';
const PREFIX = 'mrd1-';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉 I O 0 1，念出来不会错

function makeCode() {
  let s = '';
  for (let i = 0; i < 5; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}

function normCode(v) {
  const s = String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return s.length === 5 ? s : '';
}

function roomUrl(code) {
  return RELAY + '/' + PREFIX + String(code).toLowerCase();
}

// onMsg(payload) / onState('on'|'err'|'closed')
function connect(code, onMsg, onState) {
  const url = roomUrl(code);
  const me = 'c' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  let es = null;
  let closed = false;

  function open() {
    try {
      es = new EventSource(url + '/sse');
    } catch (e) {
      if (onState) onState('err');
      return;
    }
    es.onopen = () => { if (onState) onState('on'); };
    es.onerror = () => { if (!closed && onState) onState('err'); }; // EventSource 自己会重连
    es.onmessage = (ev) => {
      let box = null;
      try { box = JSON.parse(ev.data); } catch (e) { return; }
      if (!box || box.event !== 'message' || !box.message) return; // keepalive / open 事件
      let p = null;
      try { p = JSON.parse(box.message); } catch (e) { return; }
      if (!p || p.from === me) return;
      if (onMsg) onMsg(p, box.time || 0);
    };
  }

  open();

  return {
    code,
    me,
    send(obj) {
      if (closed) return;
      const body = JSON.stringify(Object.assign({}, obj, { from: me }));
      // 关掉 keepalive 之外的权限：这里只要最简单的匿名发布
      fetch(url, { method: 'POST', body, headers: { 'X-Title': 'morimens-duel' } })
        .catch(() => { if (onState) onState('err'); });
    },
    close() {
      closed = true;
      try { if (es) es.close(); } catch (e) { /* 已经关了 */ }
    },
  };
}
return { makeCode, normCode, roomUrl, connect };
})();

// ---- js/duel/tiers.js
const m_tiers = await (async () => {

// 段位表与段内进度。
//
// 单独一个模块的原因：个人中心 / 排行榜要显示「这个分数是哪一段」，
// 于是 js/gamestats.js 也得引它，而 gamestats 被 account.js 带进了每一页。
// 对位表（rank.js 的 COUNTER）只在对战页用得上，不该跟着一起发到全站。
// 所以这里只放纯数据 + 三个纯函数。

// 九段。min 是进入该段所需的积分下限，t 是这一段的称号，c 是徽章配色。
//
// 命名走游戏王那套「段位阶梯」：第 2~5 段用信物的成色往上走（铜钥 → 银钥 → 金印 → 白夜），
// 后四段换成职阶（命轮师 → 界域传说 → 唤醒大师 → 唤醒王），顶端是王者。
// 铜钥 / 银钥 / 黑印（金印）/ 白夜 / 界域都是原作里就有的东西，别随便换成别的词。
const TIERS = [
  { n: '见习守密人', t: '第一次翻开那份档案', min: 0, c: '#8b94a6' },
  { n: '铜钥级', t: '匙环上挂着自己的第一枚钥匙', min: 300, c: '#b57a4f' },
  { n: '银钥级', t: '银钥充能够转得动一次命轮', min: 700, c: '#8294ab' },
  { n: '金印级', t: '掌心被刻印烫出一个记号', min: 1200, c: '#d8a93f' },
  { n: '白夜级', t: '见过白夜，人还清醒', min: 1800, c: '#7fa9d8' },
  { n: '命轮师', t: '命轮肯听你把话说完', min: 2600, c: '#8a7ce0' },
  { n: '界域传说', t: '四个界域都记得你的名字', min: 3600, c: '#b06fd0' },
  { n: '唤醒大师', t: '不用叫，她们自己就醒了', min: 4800, c: '#e0894a' },
  { n: '唤醒王', t: '这一轮命轮由你来转', min: 6000, c: '#e0554a' },
];

const TOP_RP = TIERS[TIERS.length - 1].min;

const DIFF_TXT = { easy: '轻松', normal: '普通', hard: '认真' };

function tierOf(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (v >= TIERS[k].min) i = k;
  return i;
}

// 这一段的进度：进了多少分、离下一段还差多少、百分比、以及段内的三颗小星。
// 到了最高段就没有「下一段」，进度条按满算。
function progress(rp) {
  const v = Math.max(0, Math.round(Number(rp) || 0));
  const idx = tierOf(v);
  const tier = TIERS[idx];
  const next = idx + 1 < TIERS.length ? TIERS[idx + 1] : null;
  const span = next ? next.min - tier.min : 1;
  const into = v - tier.min;
  const pct = next ? Math.max(0, Math.min(100, (into / span) * 100)) : 100;
  // 段内三颗星：刚进这一段就有一颗，走到三等分处点第二颗、再点第三颗
  const stars = next ? Math.min(3, Math.floor((into / span) * 3) + 1) : 3;
  return {
    rp: v, idx, tier, next, into, span, pct, stars,
    left: next ? Math.max(0, next.min - v) : 0,       // 还差多少分进下一段
  };
}
return { TIERS, TOP_RP, DIFF_TXT, tierOf, progress };
})();

// ---- js/duel/rank.js
const m_rank = await (async () => {
const { TIERS } = m_tiers;
// 段位与积分（只算人机对战）+ 人机难度。
//
// 为什么积分只增不减：云端档案同步是「逐项取大」（js/account.js 的 mergeDigest），
// 手机和电脑各打几局、合并时取高的那个；一旦允许扣分，两台设备就会互相把分数拉回去，
// 而且打输了掉段会让人不敢再开一局。水平差距靠两件事体现：
//   1. 连胜加成——赢得越连贯爬得越快，断一次就得重新攒；
//   2. 段位越高，人机本身越强（见下面的 AI_LV），高分不是靠磨局数磨出来的。
//
// 段位表本身在 tiers.js（个人中心也要用，别把对位表带进每一页）。


// 每局得分：基础分按难度、段位越高给得越多（对手更强，赢下来更值钱），连胜有额外加成。
// 输了给一点「读档分」，让新手不至于卡在第一段；给得不多，磨局数爬不快。
const WIN_BASE = { easy: 80, normal: 110, hard: 140 };
const LOSE_BASE = 15;

function gainFor(opt) {
  const o = opt || {};
  const diff = WIN_BASE[o.diff] != null ? o.diff : 'normal';
  const tier = Math.max(0, Math.min(TIERS.length - 1, Number(o.tier) || 0));
  const streak = Math.max(0, Number(o.streak) || 0);
  if (!o.win) return LOSE_BASE;
  return WIN_BASE[diff] + tier * 10 + Math.min(streak, 5) * 8;
}

// 人机档位：难度决定起点，段位往上抬档。九段 + 认真 = 顶格。
//
// 命轮值（血量）两边永远是 8000，抬高段位**不靠加血**。难度只来自两件事：
//   · sloppy —— 对手「打错牌」的概率：该召唤不召唤、随手上一只小的、把该盖的怪
//               摊在攻击表示上、有好目标却拿最弱的去撞最硬的（见 ai.js 的 nextAction）；
//   · pool   —— 挑对手牌组的偏袒程度：0 均匀抽，0.55 时明显偏向「克你这套」的预组。
// 八个档位。为什么是八档：难度分轻/普/认三档，起点分别在 1 / 3 / 5，
// 九段里每档最多抬 3~5 级，所以最高档要留到 8 才铺得开。
//
// sloppy 是主旋钮：对手越会打，玩家胜率从七成多一路掉到四成（d1 vs d2 实测
// 0→0.8 对应 65%→20%）。pool 只当配菜——段位高了顺便挑一套克你的预组，
// 但幅度压在 0.55 以内，免得难度变成「看谁牌组相克」。
const AI_LV = [
  { n: '心不在焉', sloppy: 0.72, pool: 0.00 },
  { n: '照本宣科', sloppy: 0.62, pool: 0.06 },
  { n: '有来有回', sloppy: 0.52, pool: 0.14 },
  { n: '初窥门径', sloppy: 0.42, pool: 0.22 },
  { n: '老练', sloppy: 0.30, pool: 0.30 },
  { n: '锋利', sloppy: 0.18, pool: 0.38 },
  { n: '步步紧逼', sloppy: 0.08, pool: 0.46 },
  { n: '命轮本身', sloppy: 0, pool: 0.55 },
];

// 对位胜率表：COUNTER[对手牌组][你的牌组] = 对手赢的概率。
//
// 这张表不是拍脑袋写的，是跑出来的：九套预组两两对打，每对 140 局、先手各占一半
// （只让同一方先手会偏 5~10 个百分点），两个方向互相校正后取平均压噪声。
// 为什么要它：九套牌的强弱差得不远（整体胜率 44~52），但克制关系很硬——
// d5 打 d2 有 70%、d3 打 d5 只有 33%，所以「按整体强弱挑对手」反而会挑错
// （以前固定给高段位发 d1/d2/d9/d8，结果 d3 这套玩家在高段位反而更好打）。
// 换成按这张表挑，同一套玩家牌组才会真的越往上越难。
const COUNTER = {
  d1: { d1: 50, d2: 52, d3: 54, d4: 55, d5: 47, d6: 47, d7: 55, d8: 48, d9: 56 },
  d2: { d1: 48, d2: 50, d3: 47, d4: 48, d5: 30, d6: 36, d7: 49, d8: 47, d9: 48 },
  d3: { d1: 46, d2: 53, d3: 50, d4: 40, d5: 67, d6: 68, d7: 48, d8: 40, d9: 47 },
  d4: { d1: 45, d2: 52, d3: 60, d4: 50, d5: 58, d6: 53, d7: 48, d8: 45, d9: 57 },
  d5: { d1: 53, d2: 70, d3: 33, d4: 42, d5: 50, d6: 65, d7: 47, d8: 61, d9: 48 },
  d6: { d1: 53, d2: 64, d3: 32, d4: 47, d5: 35, d6: 50, d7: 49, d8: 55, d9: 52 },
  d7: { d1: 45, d2: 51, d3: 53, d4: 53, d5: 53, d6: 51, d7: 50, d8: 55, d9: 50 },
  d8: { d1: 53, d2: 45, d3: 55, d4: 55, d5: 39, d6: 45, d7: 45, d8: 50, d9: 55 },
  d9: { d1: 44, d2: 53, d3: 53, d4: 43, d5: 53, d6: 48, d7: 50, d8: 45, d9: 50 },
};

// 这套对手打你这套的胜率（百分数）。表里没有的一律当五五开，别让新牌组炸掉选牌。
function foeWinRate(foeId, myId) {
  const row = COUNTER[foeId];
  const v = row ? row[myId] : null;
  return typeof v === 'number' ? v : 50;
}

// 挑一套对手牌组：pool=0 时九套里均匀抽（好打），pool=1 时几乎只挑最克你的那套。
//
// 最早试过「按强弱分三档各取三套」，问题是窗口只有几种取值，相邻档位会整批换对手，
// 实测中段出现「升了一段反而更好打」的凸起。改成加权抽样：每套的权重按它对你这套的
// 克制强度指数放大，pool 就是放大倍数。难度随段位连续上升，对手也不会总是那几套。
// ids 传全部预组 id，返回一个 id。
function foePick(pool, myId, ids) {
  const list = (ids || []).filter((id) => id !== myId);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const p = Math.max(0, Math.min(1, Number(pool) || 0));
  const t = p * 1.5;                                   // 0 = 均匀，1.5 = 几乎只挑最克的
  const ws = list.map((id) => Math.exp(t * (foeWinRate(id, myId) - 50) / 10));
  const total = ws.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < list.length; i++) {
    r -= ws[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

// 起点按难度：轻松 1 / 普通 3 / 认真 5；九段之内往上抬几档，三条线不一样：
//   · 轻松只爬到第 4 档（「轻松」就该一直轻松，不该在顶段突然变凶）；
//   · 普通 / 认真爬满五档，第 9 段都能碰到最顶的「命轮本身」。
// 这样每条难度线自己的九段都是完整的一条难度曲线，而不是爬到一半就封顶。
const CLIMB = { easy: 3, normal: 5, hard: 5 };

function aiFor(diff, tierIdx) {
  const key = CLIMB[diff] ? diff : 'normal';
  const base = key === 'easy' ? 1 : key === 'hard' ? 5 : 3;
  const t = Math.max(0, Math.min(TIERS.length - 1, Number(tierIdx) || 0));
  const add = Math.round((t / (TIERS.length - 1)) * CLIMB[key]);
  const lv = Math.max(1, Math.min(AI_LV.length, base + add));
  const row = AI_LV[lv - 1];
  return { lv, n: row.n, sloppy: row.sloppy, pool: row.pool, max: AI_LV.length };
}
return { gainFor, AI_LV, COUNTER, foeWinRate, foePick, aiFor };
})();

// ---- js/duel/store.js
const m_store = await (async () => {
const { gainFor } = m_rank;
const { tierOf, progress: rankProgress } = m_tiers;
// 对战页的存档：收藏、战绩、段位分、开包次数。
// 只写 localStorage，不碰云端档案（云端字段是给「九个游戏」的分数用的，
// 这里的东西换设备靠加密存档整包搬，和挂机版同一套思路）。



const KEY = 'zjtt:duel:v1';

// 卡包的钱有三个来源：每天一次白给的、打人机赢来的券、银芯。
const FREE_PER_DAY = 1;
const TICKET_PER_DAY = 3;
// 卡包钱包：直接用全站共用的银芯（zjtt:credits），开一包 20 枚
const PACK_PRICE = 20;

// 打人机的银芯：[赢, 输]，按难度走。输只在打满 4 回合后给一点辛苦费，开局投降不给。
const PVE_SILVER = { easy: [8, 2], normal: [14, 3], hard: [22, 4] };
const PVE_LOSS_MIN_ROUNDS = 4;

const DEFAULT = {
  silver: 0, coll: {}, opened: 0, wins: 0, losses: 0, deck: 'd1', diff: 'normal',
  tickets: 0,        // 开包券：打赢人机才有
  freeDay: '',       // 最近一次领免费包的日子（YYYY-MM-DD，本地时区）
  freeUsed: 0,       // 那天已经用掉几次免费
  pveDay: '',        // 券的日上限按天重置
  pveToday: 0,       // 今天已经发出几张券
  rp: 0,             // 段位分（人机对战，只增不减，见 duel/rank.js）
  streak: 0,         // 当前连胜：连赢才有加成，输一局清零
  bestStreak: 0,     // 历史最长连胜
};

function today() {
  const d = new Date();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

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

// 今天还剩几次免费包 / 今天还能拿到几张券
function freeLeft(s) {
  const t = today();
  if (s.freeDay !== t) return FREE_PER_DAY;
  return Math.max(0, FREE_PER_DAY - (s.freeUsed || 0));
}

function ticketDayLeft(s) {
  const t = today();
  if (s.pveDay !== t) return TICKET_PER_DAY;
  return Math.max(0, TICKET_PER_DAY - (s.pveToday || 0));
}

// 开包先扣什么：先免费、再券、最后银芯（返回 kind 由调用方决定提示文案）
function payPack(s) {
  const t = today();
  if (freeLeft(s) > 0) {
    if (s.freeDay !== t) { s.freeDay = t; s.freeUsed = 0; }
    s.freeUsed = (s.freeUsed || 0) + 1;
    return { ok: true, kind: 'free', price: 0 };
  }
  if ((s.tickets || 0) > 0) {
    s.tickets -= 1;
    return { ok: true, kind: 'ticket', price: 0 };
  }
  return { ok: true, kind: 'silver', price: PACK_PRICE };
}

// 打赢人机发一张券，每天最多 TICKET_PER_DAY 张
function grantPveTicket(s) {
  const t = today();
  if (s.pveDay !== t) { s.pveDay = t; s.pveToday = 0; }
  if (s.pveToday >= TICKET_PER_DAY) return { granted: false, left: 0 };
  s.pveToday += 1;
  s.tickets = (s.tickets || 0) + 1;
  return { granted: true, left: TICKET_PER_DAY - s.pveToday };
}

const RULES = { FREE_PER_DAY, TICKET_PER_DAY, PACK_PRICE };

// 结算段位分：只增不减（见 duel/rank.js 开头的说明）。返回这一局的变化，交给弹窗显示。
function addRank(s, win, diff) {
  const before = Math.max(0, Math.round(Number(s.rp) || 0));
  const tierBefore = tierOf(before);
  s.streak = win ? Math.max(0, Number(s.streak) || 0) + 1 : 0;
  if (win) s.bestStreak = Math.max(Number(s.bestStreak) || 0, s.streak);
  const gain = gainFor({ win, diff, tier: tierBefore, streak: s.streak });
  s.rp = before + gain;
  const after = s.rp;
  const tierAfter = tierOf(after);
  return {
    gain, before, after, streak: s.streak, bestStreak: s.bestStreak,
    tierBefore, tierAfter, up: tierAfter > tierBefore,
    progress: rankProgress(after),
  };
}
return { PVE_SILVER, PVE_LOSS_MIN_ROUNDS, loadSave, saveSave, resetSave, freeLeft, ticketDayLeft, payPack, grantPveTicket, RULES, addRank };
})();

// ---- js/duel/names.js
const m_names = await (async () => {

// 人机对手的名字：取自「融灾榜单」第 69 期的前 500 条（去重后 487 个）。
// 名单本身是公开榜单上的玩家名，这里只当名字用，不带任何战绩关联。
// 想让对手换一批名字：把新一期的榜单导出成 csv，重跑 scripts/build_duel_names.py。
const NAMES = [
  "杨枝甘钰",
  "茉莉奶柏",
  "柠檬红鼠",
  "潶糖乌龙",
  "Uxia",
  "筝筝纸鸢",
  "龢利不是河狸喵",
  "萨摩不耶",
  "leah1",
  "Angbak",
  "Mumei",
  "萨摩开播了",
  "梅贝尔",
  "Flares",
  "YANA",
  "火",
  "洛水",
  "Iceza",
  "瑪爾",
  "ぽん（接代打）",
  "梦里云泽",
  "루니안",
  "Anicillia",
  "Rukia(Draco)",
  "bb8612",
  "猪一只喵",
  "Stravaig",
  "传说之下",
  "明枝欢",
  "璃亓",
  "myls",
  "‎",
  "归还人海",
  "临",
  "雾汐Mistide",
  "苍姝姀",
  "阿柒",
  "心境",
  "天林",
  "上上签",
  "<#DCCS>安抚物",
  "Enjel",
  "T-rex",
  "Helleios",
  "0312",
  "Cinna",
  "枣儿",
  "Yorshka",
  "蜘蛛大人的紡輪",
  "静寂长夏",
  "Rozu",
  "银锁",
  "NoeL",
  "A奶龙批发朝朝",
  "볼빵빵판다곰",
  "앤농",
  "明渊",
  "LuffyOMG",
  "Sylvester",
  "飞鸟不在之夜",
  "白酒兰华",
  "Hymn",
  "倥偬",
  "я'аргул",
  "早春雪",
  "子夜微雪",
  "Bepis",
  "Coliner",
  "雅",
  "Koishi",
  "Jocolat",
  "我要玩深海啊啊",
  "久岛鸥",
  "舅舅",
  "是澜阿口牙！",
  "融寒",
  "梨子、藜藿",
  "龍肆",
  "Southpaw",
  "Kizuno",
  "星乃晝",
  "옆집왕",
  "露露汤",
  "Kinbote",
  "哦没事",
  "枯萎化身塔姆辛",
  "缪缪",
  "SchwarzGallert",
  "普里亚普斯",
  "Yoroha_NULL",
  "outsider",
  "薇娅",
  "GothGf",
  "Fen",
  "레오노라",
  "灵雨既零",
  "夜雨月明",
  "忒伊亚",
  "Doktah",
  "晴天雲",
  "艾瑞卡？",
  "摩卡小空",
  "John",
  "伊卡洛斯",
  "헌원빈",
  "护林",
  "不知尘世",
  "<#R34>Aurora",
  "西維斯特",
  "すごい!つよい!",
  "moonie",
  "容嬷嬷",
  "夜陨星河",
  "牢立誓",
  "晴海千花",
  "bian",
  "梦怯寒",
  "岛屿的奇幻漂流",
  "秋弥",
  "灰花",
  "봉이",
  "柒瑾年",
  "淸淸梓燃",
  "Maykia",
  "冬小麦长眠不醒",
  "门",
  "izayoi",
  "星见",
  "花岚",
  "轻珏AQA",
  "游世妄想",
  "无声铃鹿第一快",
  "莉奥诺拉",
  "由乃",
  "Reol",
  "馬鮫魚",
  "原盖就是区",
  "念生",
  "WhaleLeap",
  "邮宝得鉴",
  "sty",
  "Reimu",
  "哈根校猫该达斯",
  "Jad",
  "Zyocuh",
  "奶丝兔米球",
  "卿城",
  "黄金熊",
  "妃妮克丝",
  "表里如一",
  "胡桃",
  "井昔年",
  "理智溶解中",
  "明昭晞",
  "甜菜",
  "盲枭",
  "coffin",
  "Potatis土豆",
  "汐萍",
  "Mogoo",
  "惑星",
  "<#f8aq>千雪",
  "超辣犬犬",
  "Jarozin",
  "Buntou",
  "薄荷味的可可",
  "Tapiru",
  "叠嶂扶影",
  "Loe",
  "電気猫布",
  "盼",
  "tgtg",
  "儿波莉尔",
  "PolkaRain",
  "逹芙黛爾",
  "皮九",
  "two刀乐",
  "AbsK",
  "莱西",
  "37",
  "Alessia",
  "MythagDog",
  "Gazima",
  "夢遊",
  "机长sama",
  "狄法",
  "海蔷薇",
  "瓦伦 尼古拉斯",
  "早川秋泽日",
  "是你啊静静",
  "Yun",
  "天命斬白",
  "小涛",
  "박현",
  "浪里鱼人",
  "独涯小姐姐",
  "Exo",
  "苍响",
  "东",
  "小煤球二世",
  "KHeath",
  "蓝毛启动！",
  "Ryker",
  "Rainbow",
  "Noir",
  "姜酒",
  "Ester",
  "匂坂郁纪",
  "yoyi",
  "九天缘",
  "爱睡觉的觉皇",
  "浮生若梦",
  "氷室菫",
  "一条躺尸的咸鱼",
  "Kurisu",
  "小小娃娃",
  "苍崎橙子",
  "Boooluu",
  "灰泽螨Hazel",
  "Kaisa",
  "谁会赢啊",
  "黑天鹅",
  "莱克的主人",
  "HoumuraHana",
  "Shieru",
  "维C斯特",
  "@1Angy@2",
  "Yurann",
  "清野凛",
  "那一片银杏",
  "Tokuli.Li",
  "流砂",
  "400的MAN",
  "泠泠",
  "忘夜行PVP互刷",
  "Ten",
  "Player",
  "涅托",
  "踉蹌的二弟",
  "狮子原爽",
  "Sunless",
  "百洛晓",
  "尘埃",
  "kikyo.",
  "尖尖",
  "Aytheus",
  "玛卡巴卡",
  "C维斯特",
  "jimmy525521",
  "yxlepamplemous",
  "NOGOOD",
  "undifined",
  "世界",
  "燐舞曲",
  "Mellow",
  "成堇",
  "簌簌",
  "利奥诺拉",
  "琅琅",
  "“缪斯”",
  "Humphrey",
  "「N」",
  "酷酷kuku",
  "樱木冢",
  "晚上吃鱼",
  "雪乃qwq",
  "Bobice",
  "77",
  "AegisX",
  "OnE",
  "盼风归",
  "冬雪",
  "Camil",
  "维斯塔森",
  "莉奥诺拉123321",
  "修伊",
  "塞西莉亚",
  "ShanJoey",
  "早起咕咕头",
  "<#3afx>玄鸟",
  "<#f8ax>小四",
  "福哩",
  "西蒙II刘易斯",
  "Pachi",
  "Frowny",
  "酸素aqius",
  "我獨自非洲",
  "叶藏",
  "安哥拉兔",
  "Asator",
  "墨烨",
  "Violet",
  "落尘书生",
  "Silent",
  "南慌慌",
  "散华",
  "リオノーラ",
  "Amirganj",
  "Despair",
  "CIKI",
  "悲欢离荷包蛋",
  "雪莲：问了吗",
  "aiko",
  "Danchou",
  "露菲尔",
  "Kaly",
  "nutanonymous",
  "挽梦",
  "Meruru",
  "Urien",
  "風月鳴",
  "000",
  "Kyan",
  "向日葵",
  "Bocchi",
  "风语",
  "Maomaolei",
  "Lens",
  "青衫客（互刷）",
  "浜名八事",
  "末日指挥官",
  "龢利长眠于此",
  "콘치즈",
  "桃花茶叶蛋",
  "沈柏霜",
  "Yrumi",
  "防己",
  "x.",
  "Calamity",
  "乐仔",
  "蚂蚁",
  "焦糖布丁",
  "Uxie",
  "Augustus",
  "晨曦",
  "lutya",
  "冰狼",
  "慕旸",
  "坠岚",
  "冰鸩汐鸹丫",
  "无用之人",
  "陈老师好",
  "PraiseTheMoon",
  "Varino",
  "烏克蘭爆炸山羊",
  "Reisen乌冬",
  "BAPHO",
  "feko",
  "리오노라",
  "PAKA",
  "棺人痴",
  "Prophecy",
  "Irissimo",
  "高松灯",
  "Snakebones",
  "天邪",
  "莉奧諾拉",
  "芝士丁真",
  "Syro",
  "灵恒",
  "鏽雨",
  "CPU",
  "尔浮",
  "Nazoric",
  "유로파",
  "哈魯",
  "君云梵",
  "天天记叙文",
  "阿貓不想上班",
  "Twagave",
  "慕靈",
  "CruelValkyrie",
  "rikka",
  "希邇",
  "벨리아스",
  "Axilled",
  "调律者",
  "深海重度依赖",
  "Oliwia",
  "1123",
  "Name",
  "Yaxa",
  "ブリボン",
  "Ixyll",
  "别夏花",
  "主",
  "Metaphoriast",
  "amber",
  "三缄",
  "景清",
  "yog",
  "Apath'",
  "Askar",
  "查莉兹",
  "^_^",
  "RykerBF",
  "咕了个咕",
  "德普",
  "hello",
  "HakUwU",
  "Tomori",
  "弔澈",
  "克洛瓦",
  "Liny",
  "Aeriff",
  "Nelson",
  "微光",
  "Maxene",
  "루루",
  "Cuincle",
  "Lacie",
  "江枢衍",
  "安娜贝尔",
  "Enodia",
  "纲",
  "c_sun",
  "Fumizuk1",
  "从心",
  "Klau克劳",
  "ZulSoma",
  "幻渊",
  "OLogO",
  "伊特絲",
  "珀玛",
  "Ahri",
  "金色大萝卜",
  "fiesta",
  "利维娅",
  "Zheshon",
  "小菊兒",
  "Leonora",
  "квейтр",
  "藤田琴音",
  "Myrkvi",
  "大欢",
  "リオノラ",
  "一盏青灯",
  "啊米诺斯",
  "贺杰托斯",
  "망령",
  "Puro",
  "薇薇安",
  "suzu鈴",
  "NOUI",
  "目",
  "Lucas",
  "Boxeater",
  "Crowlov",
  "眭苜",
  "Taliesin",
  "Ninety",
  "Sanga ToT",
  "Dai",
  "暗魔師",
  "芙蕾·秋",
  "比你更帅的人",
  "Zera",
  "Ælegy",
  "泠塵",
  "亞當喵",
  "支离",
  "bchedans",
  "黎枫时",
  "Eko",
  "Asmodeus",
  "HILLER",
  "Leon",
  "白雲映水",
  "= DOOM =",
  "Makise",
  "저별님",
  "清风",
  "羽鸟智世",
  "Sophia",
  "入川之潼",
  "Censini",
  "Valentine",
  "高鸿冥",
  "沃恁蝶",
  "mon0moon",
  "91King",
  "Sabrina",
  "云影长歌",
  "TweighT",
  "受里受气小野寺",
  "冬银official",
  "Saphory",
];
return { NAMES };
})();

// ---- js/silver.js
const m_silver = await (async () => {

// 银芯钱包（所有小游戏共用的 zjtt:credits）的最小读写件。
//
// 不 import js/common.js：那一条链（common + i18n + auth + account）有 60 多 KB，
// 为了写一个数字把首屏翻几倍不值当。写入格式必须和 common.js 的 store.set() 一致
// （JSON.stringify 的数字），读的时候两种写法（"120" / 120）都认。
const KEY = 'zjtt:credits';

function walletGet() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const v = Number(JSON.parse(raw));
    return Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  } catch { return 0; }
}

// 入账。n 必须是正数；返回入账后的余额。zjtt:dirty 让 account.js（登录后）把这笔钱排队推上云，
// 没人听的时候事件白丢，但本机数字是对的。
function walletAdd(n) {
  const add = Math.round(Number(n) || 0);
  if (add <= 0) return walletGet();
  try {
    const v = walletGet() + add;
    localStorage.setItem(KEY, JSON.stringify(v));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return v;
  } catch { return walletGet(); }
}

// 扣钱：不够返回 false，不会扣成负数
function walletSpend(n) {
  const cost = Math.round(Number(n) || 0);
  if (cost <= 0) return true;
  if (walletGet() < cost) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(walletGet() - cost));
    document.dispatchEvent(new CustomEvent('zjtt:dirty', { detail: 'credits' }));
    return true;
  } catch { return false; }
}

// 原作的银芯图标（assets/ui/silvercore.webp），小图直接引用，不额外内联
const SC_SRC = 'assets/ui/silvercore.webp';
const scTag = (txt) => `<img src="${SC_SRC}" alt="银芯" width="16" height="16" decoding="async" style="vertical-align:-3px;margin-right:3px">${txt == null ? '' : `<b>${txt}</b>`}`;
return { walletGet, walletAdd, walletSpend, SC_SRC, scTag };
})();

// ---- js/duel/view.js
const m_view = await (async () => {
const { CARDS, PACKS, BONDS, DECKS, LORE, FACES, BACK, ART } = m_gen;
const E = m_engine;
const { nextAction } = m_ai;
const net = m_net;
const { loadSave, saveSave, freeLeft, ticketDayLeft, payPack, grantPveTicket, addRank, RULES, PVE_SILVER, PVE_LOSS_MIN_ROUNDS } = m_store;
const { progress: rankProgress, DIFF_TXT, TIERS } = m_tiers;
const { aiFor, foePick } = m_rank;
const { NAMES } = m_names;
const { walletGet, walletAdd, walletSpend, scTag } = m_silver;
// 页面层：首页 / 对战 / 房间 / 卡包 / 卡表 / 世界观（游戏名：唤醒王：决斗链接）。
// 所有规则判断都走 engine.js，这里只负责「把状态画出来」和「把点击翻译成操作」。
//
// 三种对局共用同一块棋盘：
//   pve   人机（B 边由 ai.js 走）
//   local 同屏双人（一台设备轮流，棋盘跟着当前回合翻面）
//   net   好友房（房间码，双方各自重放同一串动作）










const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PACK_PRICE = RULES.PACK_PRICE;

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
  bt: 'pve',        // pve | local | net
  side: 0,          // 我在哪一边（local 跟着回合走）
  seq: 0,           // 好友房动作序号
  ai: null,         // 本局人机档位 { lv, n, sloppy, pool }（随段位变强，见 duel/rank.js）
  foeName: '',      // 人机对手的名字（取自融灾榜单，见 names.js）
  foeDeck: '',      // 对手这套牌的名字（同一个名字永远同一套，见 nameDeck）
  room: null,       // { code, role, state, peerDeck }
  net: null,
  timers: [],
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
  if (id === 'room') renderRoom();
  if (id === 'packs') renderPacks();
  if (id === 'codex') renderCodex();
  if (id === 'lore') renderLore();
}

function silverBar() {
  const n = $('#silver');
  if (n) n.textContent = walletGet();
  const t = $('#tickets');
  if (t) t.textContent = S.save.tickets || 0;
}

// 现在轮到哪一边：同屏双人跟着回合走，其它两种固定
function SIDE() {
  if (!S.G) return 0;
  return S.bt === 'local' ? S.G.active : S.side;
}

// 名字直接写进 innerHTML，榜单里有人带尖括号（比如「<#R34>Aurora」），得转义
function escTxt(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 名字 → 牌组：同一个名字永远带同一套牌（换段位只是「打得更认真」，不会换牌）。
// 用名字的稳定哈希落位，所以不同名字的牌组天然分散在九套预组上。
function nameDeck(name) {
  let h = 2166136261;
  const t = String(name);
  for (let i = 0; i < t.length; i++) {
    h ^= t.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return DECKS[h % DECKS.length].id;
}

// 按牌组把名字分好桶，开局先按难度定「这局该用哪套牌」，再从这套牌的名字里抽一个人
const NAMES_BY_DECK = (() => {
  const map = {};
  for (const d of DECKS) map[d.id] = [];
  for (const n of NAMES) {
    const id = nameDeck(n);
    if (map[id]) map[id].push(n);
  }
  return map;
})();

// 这个牌组的「主人」们；空桶就退回全名单（新加牌组时不至于没人）
function namesOfDeck(deckId) {
  const list = NAMES_BY_DECK[deckId];
  return list && list.length ? list : NAMES;
}

function pickName(deckId) {
  const list = namesOfDeck(deckId);
  if (!list.length) return '对手';
  return list[Math.floor(Math.random() * list.length)];
}

function nameOf(idx) {
  if (S.bt === 'local') return idx === 0 ? '甲' : '乙';
  if (S.bt === 'net') return idx === S.side ? '你' : '好友';
  if (idx === 0) return '你';
  return escTxt(S.foeName || '对手');
}

// 引擎日志是按「0 号视角」写的（你 / 对手），换到 1 号视角要翻过来
function logText(t, side) {
  if (side === 0) return t;
  return t.replace(/你/g, '\u0001').replace(/对手/g, '你').replace(/\u0001/g, '对手');
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
    // 场上的怪兽要显示「现在的」攻守（回合开始成长、光环、羁绊、装备都算进去），涨了标绿、被压了标红；
    // 以前一直画卡表上的原始数值，图鲁每回合 +200 在界面上看不出来
    const a = o.atk != null ? o.atk : c.atk, df = o.defv != null ? o.defv : c.def;
    const cl = (v, base) => (v > base ? ' class="up"' : (v < base ? ' class="down"' : ''));
    tail = `<div class="pt"><b${cl(a, c.atk)}>${a}</b><span>/</span><b${cl(df, c.def)}>${df}</b></div>`;
  } else {
    const t = { normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '';
    tail = `<div class="pt">${c.k === 'S' ? '魔法' : '陷阱'} · ${t}</div>`;
  }
  const lv = c.k === 'M' || c.k === 'E' ? `<span class="lv">${c.lv >= 8 ? '★8' : 'Lv' + c.lv}</span>` : '';
  return `<div class="${cls.join(' ')}" data-r="${realm}" data-k="${c.k || 'M'}" data-rar="${rb}" data-id="${c.id}"`
    + `${o.uid != null ? ` data-uid="${o.uid}"` : ''}>`
    + `<span class="rm"></span>`
    + `<div class="face" ${face}></div>`
    + `<span class="rb">${rb}</span>${lv}`
    + `<div class="ct"><b class="nm">${name}</b>${tail}</div>`
    + `${o.tag ? `<span class="tagp">${o.tag}</span>` : ''}`
    + `</div>`;
}

// ------------------------------------------------------------------ 首页
function deckById(id) {
  return DECKS.find((d) => d.id === id) || DECKS[0];
}

function deckList(def) {
  const out = [];
  for (const p of def.cards) for (let i = 0; i < p[1]; i++) out.push(p[0]);
  return out;
}

function renderHome() {
  const decks = DECKS.map((d) => {
    const bonds = E.evalBonds(deckList(d));
    const total = d.cards.reduce((s, p) => s + p[1], 0);
    return `<div class="dwrap"><button class="deck ${d.id === S.deckId ? 'on' : ''}" data-deck="${d.id}" style="--rc:${
      (E.REALM[d.r] || E.REALM.any).c}">
      <div class="dh"><b>${d.n}</b><span class="rm">${(E.REALM[d.r] || E.REALM.any).n}</span></div>
      <div class="ds">${d.desc}</div>
      <div class="db">${bonds.map((b) => `<span class="bond">${b.n}</span>`).join('') || '<span class="bond" style="opacity:.5">无羁绊</span>'}</div>
      <div class="dm">主卡组 ${total} 张 · 额外 ${d.extra.length} 张 · 羁绊 ${bonds.length} 条</div>
    </button><button class="btn sm ghost dview" data-deckview="${d.id}">查看卡组内容</button></div>`;
  }).join('');

  const sel = deckById(S.deckId);
  const bonds = E.evalBonds(deckList(sel));
  const free = freeLeft(S.save);
  const tk = S.save.tickets || 0;
  const rk = rankProgress(S.save.rp);
  const ai = aiFor(S.diff, rk.idx);
  const stars = [0, 1, 2].map((i) => `<i class="${i < rk.stars ? 'on' : ''}">★</i>`).join('');

  $('#scr-home').innerHTML = `
    <div class="hero">
      <p class="kicker">FORGETTING EVE · DUEL OF THE WHEEL</p>
      <h1 class="longname">唤醒王：决斗链接</h1>
      <p class="lead">你是守密人，桌上摊着两套记忆。每一张卡都是一个<strong>你还记得的人</strong>：
        召唤她是承认她存在，把她当祭品是承认有更重要的东西。命轮值归零不是死，是<strong>不再确定自己是谁</strong>。</p>
      <div class="hr"></div>
    </div>

    <div class="sec-h"><h2>你的段位</h2><span class="r">${TIERS.length} 段 · 只靠人机对战计分</span></div>
    <div class="rankcard" style="--rc:${rk.tier.c}">
      <div class="rktop">
        <span class="rkb">${rk.idx + 1}</span>
        <span class="rkname">${rk.tier.n}<em>「${rk.tier.t}」</em></span>
        <span class="rksc">${rk.rp}<small>分</small></span>
      </div>
      <div class="rkbar"><i style="width:${rk.pct.toFixed(1)}%"></i></div>
      <div class="rkfoot">
        <span>${rk.next ? `距「${rk.next.n}」还差 <b>${rk.left}</b> 分` : '已经是最高段位——命轮由你来转'}</span>
        <span class="rkstars">${stars}</span>
      </div>
      <p class="note" style="margin:8px 0 0">下一局对手的档位：<b>Lv${ai.lv}／${ai.max}「${ai.n}」</b>。
        段位越高，对方越少打错牌——该召唤时会召唤、该盖的怪会盖、不会拿小的去撞大的；
        它还会挑一套偏向<b>克你这套</b>的预组。但两边命轮值永远是 8000，它不会靠多血赢你。
        对手是融灾榜单上的玩家名，一个人固定一套牌，同一个人换段位也不会换牌。
        ${S.save.bestStreak ? `你最长连胜过 ${S.save.bestStreak} 场。` : ''}</p>
    </div>

    <div class="sec-h"><h2>选一套卡组</h2><span class="r">共 ${DECKS.length} 套 · 每套 30 张 + 觉醒体</span></div>
    <div class="decks">${decks}</div>

    <div class="row" style="margin-top:8px"><button class="btn sm" data-deckview="${sel.id}">查看「${sel.n}」的 ${sel.cards.reduce((a, p) => a + p[1], 0)} 张卡与觉醒体</button></div>
    ${sel.tips ? `<p class="note" style="margin:8px 0 0"><b style="color:var(--gold2)">打法提示</b>：${sel.tips}</p>` : ''}

    <div class="sec-h"><h2>这套牌的羁绊</h2><span class="r">${bonds.length} 条已触发</span></div>
    <div class="row" style="gap:6px">${bonds.map((b) => `<span class="bond" title="${b.text}">${b.n}</span>`).join('') || '<span class="note">这套牌凑不出羁绊——它只是三十张牌。</span>'}</div>
    <ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>

    <div class="sec-h"><h2>开始</h2><span class="r">人机可选难度</span></div>
    <div class="row">
      <div class="seg" id="diff">
        <button data-d="easy" class="${S.diff === 'easy' ? 'on' : ''}">轻松</button>
        <button data-d="normal" class="${S.diff === 'normal' ? 'on' : ''}">普通</button>
        <button data-d="hard" class="${S.diff === 'hard' ? 'on' : ''}">认真</button>
      </div>
      <button class="btn pri" data-act="start">与人机对决</button>
      <button class="btn ghost" data-act="howto">规则</button>
    </div>

    <div class="sec-h"><h2>好友对战</h2><span class="r">房间码 / 一台设备轮流</span></div>
    <div class="row">
      <button class="btn" data-act="room-create">创建房间</button>
      <button class="btn" data-act="room-join">加入房间</button>
      <button class="btn ghost" data-act="local-duel">同屏双人</button>
    </div>
    <p class="note" style="margin:6px 0 0">房间码对战靠公共中继同步，双方各自开着这一页即可；同屏双人不需要网络。</p>

    <div class="nav-tiles">
      <button class="tile" data-act="go-packs"><span class="ti">✦</span><span><span class="tn">卡包</span><br><span class="td">今日免费 ${free} 次 · 券 ${tk} 张 · ${Object.keys(S.save.coll).length} 种已收录</span></span></button>
      <button class="tile" data-act="go-codex"><span class="ti">▤</span><span><span class="tn">卡表</span><br><span class="td">${Object.keys(CARDS).length} 张 · 效果全文</span></span></button>
      <button class="tile" data-act="go-lore"><span class="ti">◈</span><span><span class="tn">世界观</span><br><span class="td">弥萨格、守密人与四界域</span></span></button>
    </div>
    <p class="note" style="margin-top:12px">战绩：${S.save.wins} 胜 ${S.save.losses} 负 · 已开 ${S.save.opened} 包。银芯是全站共用的钱包：打人机赢一场 +8 / +14 / +22（轻松 / 普通 / 认真），打满 4 回合输了也有一点辛苦费；
      每天免费开一包，打赢人机再送开包券（每天最多 ${RULES.TICKET_PER_DAY} 张）。</p>
  `;
}

// ------------------------------------------------------------------ 开局
function newGame(bt, side, mine, foe, seed) {
  clearTimers();
  S.bt = bt;
  S.side = side;
  S.seq = 0;
  S.busy = false;
  S.result = false;
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
  // 两边命轮值都是 8000（羁绊加成各算各的）：段位只影响对手「会不会打、拿什么牌」，不改血量
  S.G = E.createGame({ cards: mine.cards, extra: mine.extra }, { cards: foe.cards, extra: foe.extra }, { seed });
  show('duel');
  renderDuel();
}

// 对手牌组：按 rank.js 的对位表抽，而不是按「整体谁强」。
// 九套预组的整体胜率只差 44~52，但克制关系很硬（d5 打 d2 七成、d3 打 d5 只有三成），
// 所以只有「打你这套顺不顺手」才是真的难度旋钮。
function startDuel() {
  const mine = deckById(S.deckId);
  // 段位越高，人机档位越高：难度定起点，段位往上抬
  const rk = rankProgress(S.save.rp);
  S.ai = aiFor(S.diff, rk.idx);
  // 先定这局对手用哪套牌（段位越高越偏向克你的那套），再挑一个「这套牌的主人」
  const foeId = foePick(S.ai.pool, S.deckId, DECKS.map((d) => d.id));
  const foe = deckById(foeId) || mine;
  S.foeName = pickName(foe.id);
  // 彩蛋：抽到「校猫的私藏」时，坐下来的可能是做这套牌的人。
  // 米酒是脑缸组的战斗设计师，校猫的牌是他设计的 —— 他不打牌，他来看你怎么打。
  if (foe.id === 'd6' && Math.random() < 0.3) S.foeName = '米酒';
  S.foeDeck = foe.n;
  newGame('pve', 0, mine, foe, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  toast(`${S.foeName}（Lv${S.ai.lv}「${S.ai.n}」）带着「${foe.n}」坐下了`);
}

function startLocal() {
  const mine = deckById(S.deckId);
  const others = DECKS.filter((d) => d.id !== mine.id);
  const foe = others[Math.floor(Math.random() * others.length)];
  newGame('local', 0, mine, foe, (Date.now() ^ (Math.random() * 1e9)) >>> 0);
  toast('同屏双人：' + mine.n + '（甲）对阵 ' + foe.n + '（乙）');
}

function phaseText(G, side) {
  if (G.phase === 'battle') return '战斗阶段';
  return G.active === side ? '你的主要阶段' : (S.bt === 'pve' ? '对手的主要阶段' : '等好友出牌');
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
    + cardHTML(c, { uid: m.uid, def: m.pos === 'def', tag, used: side === 'me' && m.canAtk === false, atk: m.atk, defv: m.def })
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
  const side = SIDE();
  const v = E.publicView(G, side);
  const myTurn = v.active === side && !v.over;
  const canAct = myTurn && !S.busy;

  const logHTML = v.log.map((l) => `<li data-k="${l.kind}">${logText(l.text, side)}</li>`).join('');

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
  const awakenable = v.me.extra.filter((id) => E.canAwaken(G, G.players[side], id)).length;

  const hand = v.me.hand.map((h) => {
    const c = CARDS[h.id];
    const usable = canAct && (c.k === 'M' ? E.canSummon(G, G.players[side], h.id) : true);
    return cardHTML(c, {
      uid: h.uid,
      on: S.sel && S.sel.type === 'hand' && S.sel.uid === h.uid,
      dim: canAct && !usable,
    });
  }).join('');

  const modeTag = S.bt === 'local' ? `<span class="btag">同屏 · 轮到${nameOf(G.active)}</span>`
    : (S.bt === 'net' ? `<span class="btag">房间 ${S.room ? S.room.code : '—'}</span>`
      : (S.ai ? `<span class="btag ai">Lv${S.ai.lv} · ${S.ai.n}</span>` : ''));

  const waitTxt = S.bt === 'net'
    ? (v.over ? '对决结束。' : '等好友出牌…')
    : (S.bt === 'local' ? '轮到' + nameOf(G.active) + '了。' : '对手正在想牌。');

  $('#scr-duel').innerHTML = `
    <div class="duelbar">
      <span class="turn">第 ${Math.ceil(v.turn / 2)} 回合</span>
      <span class="ph">${phaseText(G, side)}</span>
      ${modeTag}
      <span class="sp">
        ${canAct && v.phase === 'main' && extraLeft ? `<button class="btn sm" data-act="extra">觉醒 ${awakenable}/${extraLeft}</button>` : ''}
        ${canAct && v.phase === 'main' ? '<button class="btn sm" data-act="battle">战斗阶段</button>' : ''}
        ${canAct ? '<button class="btn sm pri" data-act="end">结束回合</button>' : ''}
        ${S.bt === 'pve' ? '' : '<button class="btn sm ghost" data-act="leave">离开</button>'}
      </span>
    </div>

    <div class="side op-side">
      <div class="pinfo">
        <span class="who">${nameOf(1 - side)}</span>
        ${S.bt === 'pve' && S.foeDeck ? `<i class="dv" title="对手这套牌">${S.foeDeck}</i>` : ''}
        ${lpBar(v.op)}
        <span class="meta"><span>手 ${v.op.hand}</span><span>组 ${v.op.deck}</span></span>
        ${bondsDots(v.op.bonds)}
      </div>
      <div class="field">${opSp}</div>
      <div class="field">${opSlots}</div>
    </div>

    <div class="mid"><ul class="log" id="log">${logHTML}</ul>
      <div class="acts">
        ${S.mode === 'attack'
          ? attackBar(G, side, v, guard)
          : '<span class="note">' + (myTurn ? '点手牌出牌，点场上的怪兽看它能做什么。' : waitTxt) + '</span>'}
      </div>
    </div>

    <div class="side me-side">
      <div class="field">${mySlots}</div>
      <div class="field">${mySp}</div>
      <div class="pinfo">
        <span class="who">${nameOf(side)}</span>
        ${lpBar(v.me)}
        <span class="meta"><span>手 ${v.me.hand.length}</span><span>组 ${v.me.deck}</span></span>
        ${bondsDots(v.me.bonds)}
      </div>
    </div>

    <div class="hand ${hand ? '' : 'empty-h'}">${hand || '手牌空了'}</div>
  `;

  const log = $('#log');
  if (log) log.scrollTop = log.scrollHeight;
  renderActbar();
  if (v.over && !S.result) showResult(v);
}

// 攻击模式的操作条：「直接攻击」只在真的能直接打的时候可点（对方场上没有怪兽，或者这只怪兽本回合带「可直接攻击」），
// 否则灰着并写明原因——以前按钮一直亮着、点了才弹一句提示，看起来像「按键没反应」。
function attackBar(G, side, v, guard) {
  const me = G.players[side];
  const m = S.sel ? me.mons.find((x) => x && x.uid === S.sel.uid) : null;
  const opMons = v.op.mons.filter(Boolean).length;
  const can = !!m && (opMons === 0 || m.direct);
  let tip;
  if (can) tip = opMons ? '这只怪兽本回合可以无视对方怪兽直接攻击。' : '对方场上没有怪兽，可以直接攻击。';
  else if (guard) tip = '对方有守备的「守护」怪兽挡着：必须先点它来打。';
  else tip = '对方场上有怪兽：点高亮的对方怪兽选择攻击目标，打光了才能直接攻击。';
  return `<div class="atkbar"><span class="note">${tip}</span>`
    + `<button class="btn ${can ? 'pri' : ''}" data-act="direct" ${can ? '' : 'disabled title="现在不能直接攻击"'}>直接攻击</button>`
    + '<button class="btn ghost" data-act="cancel">取消</button></div>';
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
  const side = SIDE();
  const p = G.players[side];
  const isHand = S.sel.type === 'hand';
  const h = isHand ? p.hand.find((x) => x.uid === S.sel.uid) : null;
  const c = isHand ? CARDS[h && h.id] : null;
  if (isHand && !c) { bar.classList.remove('on'); return; }
  if (!isHand) {
    const m = p.mons.find((x) => x && x.uid === S.sel.uid);
    if (!m) { bar.classList.remove('on'); return; }
    const d = CARDS[m.id];
    const canFight = G.phase === 'battle' && E.canAttack(G, p, m) && G.active === side;
    bar.innerHTML = `
      <div class="ah"><b>${d.n}</b><span class="note">${d.atk} / ${d.def}</span>
        <button class="btn sm ghost x" data-act="cancel">关闭</button></div>
      <div class="ab">
        ${canFight ? '<button class="btn pri" data-act="pick-target">攻击</button>' : ''}
        ${G.phase === 'main' && G.active === side && E.canAttack(G, p, m) ? '<button class="btn pri" data-act="battle">进入战斗阶段</button>' : ''}
        ${G.phase === 'main' && G.active === side ? '<button class="btn" data-act="flip">切换表示</button>' : ''}
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

// 结算里的段位条：本局 +多少分、现在第几段、离下一段还差多少，升段单独提一行
function rankBlock(rk) {
  const p = rk.progress;
  const stars = [0, 1, 2].map((i) => `<i class="${i < p.stars ? 'on' : ''}">★</i>`).join('');
  return `<div class="rankcard sm" style="--rc:${p.tier.c}">
    <div class="rktop">
      <span class="rkb">${p.idx + 1}</span>
      <span class="rkname">${p.tier.n}<em>「${p.tier.t}」</em></span>
      <span class="rksc">${p.rp}<small>分</small></span>
    </div>
    <div class="rkbar"><i style="width:${p.pct.toFixed(1)}%"></i></div>
    <div class="rkfoot">
      <span>段位 <b>+${rk.gain}</b>${rk.streak > 1 ? ` · 连胜 ${rk.streak}` : ''}</span>
      <span>${p.next ? `距「${p.next.n}」还差 <b>${p.left}</b> 分` : '已经是最高段位'}</span>
      <span class="rkstars">${stars}</span>
    </div>
    ${rk.up ? `<div class="rkup">升段 — ${p.tier.n}「${p.tier.t}」</div>` : ''}
  </div>`;
}

function showResult(v) {
  S.result = true;
  const side = SIDE();
  const win = v.winner === side;
  const rounds = Math.ceil(v.turn / 2);
  let reward = '';

  if (S.bt === 'pve') {
    const tier = PVE_SILVER[S.diff] || PVE_SILVER.normal;
    const gain = win ? tier[0] : (rounds >= PVE_LOSS_MIN_ROUNDS ? tier[1] : 0);
    if (gain > 0) walletAdd(gain);
    if (win) S.save.wins++; else S.save.losses++;
    let ticket = '';
    if (win) {
      const g = grantPveTicket(S.save);
      ticket = g.granted ? '<span class="bond">开包券 +1</span>' : '<span class="note">今天的券已经领满</span>';
    }
    // 段位分要和银芯一起落盘，再推一次云端档案（排行榜读的就是这份摘要）
    const rk = addRank(S.save, win, S.diff);
    saveSave(S.save);
    silverBar();
    pushCloud();
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${gain > 0 ? scTag('+' + gain) : '这局太短，没有银芯'}</span><span class="note">${DIFF_TXT[S.diff] || '普通'}难度 · 钱包 ${walletGet()}</span>${ticket}
      <span class="note">累计 ${S.save.wins} 胜 ${S.save.losses} 负</span></div>
      ${rankBlock(rk)}`;
  } else if (S.bt === 'local') {
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${nameOf(v.winner)} 赢下这场</span>
      <span class="note">同屏双人不计战绩</span></div>`;
  } else {
    reward = `<div class="row" style="margin-top:10px"><span class="bond">${win ? '你赢了' : '好友赢了'}</span>
      <span class="note">房间对局不计战绩</span></div>`;
  }

  openModal(`
    <div class="mtitle"><h3>${win
      ? (S.bt === 'local' ? nameOf(v.winner) + '赢下了这场对决' : '你赢下了这场对决')
      : (S.bt === 'pve' && S.foeName ? escTxt(S.foeName) + ' 赢下了这场对决' : '命轮断了')}</h3></div>
    <p class="sub">${rounds} 回合 · ${win ? '对手交出一张牌' : '你从此不再确定一张牌'}</p>
    <p class="note">${win
      ? '输的人要交出一张牌：不是丢掉，是「从此不再确定」。那张牌上的人会变淡。'
      : '命轮值归零不是死，是「不再确定自己是谁」。再摆一次就好——弥萨格的守密人从不轻易认输。'}</p>
    ${reward}
    <div class="mb">
      <button class="btn ghost" data-modal="close">留在这</button>
      ${S.bt === 'pve' ? '<button class="btn" data-modal="again">再打一场</button>' : ''}
      <button class="btn pri" data-modal="home">回首页</button>
    </div>
  `);
}

// 弹窗可以叠一层：卡池 / 拆包 / 卡组列表里点一张牌看详情，详情里点「返回」回到刚才那一屏
function openModal(html, push) {
  const m = $('#modal');
  if (push && $('#mask').classList.contains('on') && m.innerHTML) { (S.mstack || (S.mstack = [])).push(m.innerHTML); m.dataset.depth = S.mstack.length; }
  else { S.mstack = []; m.dataset.depth = 0; }
  m.innerHTML = html;
  m.scrollTop = 0;
  $('#mask').classList.add('on');
}
function backModal() {
  const prev = S.mstack && S.mstack.pop();
  if (prev == null) return closeModal();
  $('#modal').innerHTML = prev;
  $('#modal').dataset.depth = S.mstack.length;
}
function closeModal() {
  S.mstack = [];
  $('#mask').classList.remove('on');
  $('#modal').innerHTML = '';
}

// ------------------------------------------------------------------ 动作
// 玩家（或同屏的当前一方）的每个操作都走这里：好友房顺手把动作发给对面。
function act(a) {
  const G = S.G;
  if (!G) return { ok: false, err: '没有对局' };
  const r = E.applyAction(G, SIDE(), a);
  if (r.ok && S.bt === 'net' && S.net) {
    S.seq += 1;
    S.net.send({ k: 'act', n: S.seq, a });
  }
  return r;
}

function aiAction(a) {
  if (a.t === 'awaken') return { t: 'awaken', id: a.id };
  if (a.t === 'summon') return { t: 'summon', uid: a.uid, tribs: a.tribs };
  if (a.t === 'setMon') return { t: 'setMon', uid: a.uid };
  if (a.t === 'trap') return { t: 'trap', uid: a.uid };
  if (a.t === 'pos') return { t: 'pos', uid: a.uid };
  if (a.t === 'battle') return { t: 'battle' };
  if (a.t === 'attack') return { t: 'attack', uid: a.uid, target: a.target };
  if (a.t === 'spell') return { t: 'spell', uid: a.uid };
  return { t: 'end' };
}

// ------------------------------------------------------------------ AI 回合
async function runAI() {
  const G = S.G;
  S.busy = true;
  renderDuel();
  let steps = 0;
  while (!G.over && G.active === 1 && steps < 80) {
    steps++;
    const a = nextAction(G, 1, S.bt === 'pve' && S.ai ? S.ai.sloppy : S.diff);
    if (!a) break;
    const r = E.applyAction(G, 1, aiAction(a));
    if (!r.ok && a.t !== 'end') break;
    renderDuel();
    await sleep(steps > 24 ? 90 : 460);
    if (a.t === 'end') break;
  }
  // 兜底：AI 要是想不出动作，也别把回合卡死在那里
  if (!G.over && G.active === 1) E.endTurn(G);
  S.busy = false;
  S.sel = null; S.mode = 'idle';
  renderDuel();
}

function afterTurnEnd() {
  const G = S.G;
  S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
  renderDuel();
  if (S.bt === 'pve' && !G.over && G.active === 1) runAI();
}

function playerEndTurn() {
  if (!S.G || S.busy || S.G.active !== SIDE()) return;
  const r = act({ t: 'end' });
  if (!r.ok) { toast(r.err); return; }
  afterTurnEnd();
}

// ------------------------------------------------------------------ 操作
function onHandAct(action) {
  const G = S.G;
  if (!G || !S.sel) return;
  const uid = S.sel.uid;
  const p = G.players[SIDE()];
  const h = p.hand.find((x) => x.uid === uid);
  if (!h) return;
  const c = CARDS[h.id];
  if (action === 'summon') {
    const need = E.tributeNeed(c.id);
    if (!need) {
      const r = act({ t: 'summon', uid, tribs: [] });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
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
  const map = { setmon: 'setMon', spell: 'spell', trap: 'trap' };
  if (map[action]) {
    const r = act({ t: map[action], uid });
    if (!r.ok) return toast(r.err);
    S.sel = null; S.mode = 'idle'; renderDuel();
  }
}

function onSlotClick(side, idx, isSpell) {
  const G = S.G;
  if (!G || S.busy) return;
  if (isSpell) return;
  const me = SIDE();
  if (side === 'me') {
    if (S.mode === 'tribute') {
      const m = G.players[me].mons[idx];
      if (!m) return;
      if (S.tribute.indexOf(m.uid) >= 0) return;
      S.tribute.push(m.uid);
      const need = (S.pendingSummon && S.pendingSummon.need) || 1;
      if (S.tribute.length >= need) {
        const uid = S.pendingSummon.uid;
        S.pendingSummon = null;
        const r = act({ t: 'summon', uid, tribs: S.tribute });
        if (!r.ok) { toast(r.err); S.tribute = []; S.mode = 'idle'; renderDuel(); return; }
        S.tribute = []; S.mode = 'idle'; S.sel = null;
        renderDuel();
        return;
      }
      renderDuel();
      return;
    }
    if (S.mode === 'attack') return;
    const m = G.players[me].mons[idx];
    if (!m) return;
    S.sel = { type: 'mon', uid: m.uid };
    S.mode = 'act';
    renderActbar();
    return;
  }
  // 点对方场地
  if (S.mode === 'attack') {
    const tg = G.players[1 - me].mons[idx];
    if (!tg) return;
    const r = act({ t: 'attack', uid: S.sel.uid, target: tg.uid });
    if (!r.ok) return toast(r.err);
    S.mode = 'idle'; S.sel = null;
    renderDuel();
    return;
  }
  const m = G.players[1 - me].mons[idx];
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
  const me = SIDE();
  const p = G.players[me];
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
    <p class="sub">觉醒召唤：素材至少一只在自己场上，另一只可以从手牌来；两只都送进墓地，不占通常召唤。</p>
    ${list || '<p class="empty">额外卡组是空的。</p>'}`);
}

// ------------------------------------------------------------------ 好友房
function clearTimers() {
  for (const t of S.timers) clearInterval(t);
  S.timers = [];
}

function dropRoom(silent) {
  clearTimers();
  if (S.net) { try { S.net.send({ k: 'bye' }); } catch (e) { /* 已经断了 */ } S.net.close(); }
  S.net = null;
  S.room = null;
  if (!silent) toast('已离开房间');
}

function onNetState(st) {
  if (!S.room) return;
  if (st === 'on' && S.room.state === 'wait') S.room.state = 'live';
  if (st === 'err') S.room.state = 'err';
  if (S.view === 'room') renderRoom();
}

function renderRoom() {
  const r = S.room;
  const el = $('#scr-room');
  if (!el) return;
  if (!r) {
    el.innerHTML = '<div class="empty">还没有房间。回首页点「创建房间」或「加入房间」。</div>';
    return;
  }
  const stTxt = r.state === 'err' ? '中继连不上（网络被挡了？可以先玩同屏双人）'
    : (r.state === 'wait' ? '正在连中继…' : (r.state === 'playing' ? '已开局' : '已连上中继，等好友回应…'));
  el.innerHTML = `
    <div class="sec-h"><h2>好友房</h2><span class="r">${r.role === 'a' ? '你是房主' : '你是加入方'}</span></div>
    <div class="room">
      <div class="rcode" id="rcode">${r.code}</div>
      <p class="note" style="text-align:center">把上面 5 位房间码发给好友，让他在「加入房间」里填。</p>
      <div class="row" style="justify-content:center">
        <button class="btn" data-act="room-copy">复制房间码</button>
        <button class="btn ghost" data-act="leave">离开房间</button>
      </div>
      <div class="rstate"><i class="dot ${r.state === 'err' ? 'bad' : (r.state === 'wait' ? '' : 'ok')}"></i>${stTxt}</div>
      <p class="note" style="text-align:center">你的卡组：${deckById(S.deckId).n}${r.peerDeck ? ' · 好友选了：' + deckById(r.peerDeck).n : ''}</p>
    </div>
    <p class="note" style="margin-top:14px">房间靠公共中继转发动作：双方各自开着这一页，你出的每一手都会发到房间里，对面按同一串动作重放，
      所以两边看到的必然是同一局。中继不通时先玩「同屏双人」。</p>
  `;
}

function createRoom() {
  dropRoom(true);
  const code = net.makeCode();
  S.room = { code, role: 'a', state: 'wait', peerDeck: '' };
  S.net = net.connect(code, onNetMsg, onNetState);
  S.net.send({ k: 'hi', role: 'a', deck: S.deckId });
  S.timers.push(setInterval(() => {
    if (!S.net || !S.room || S.room.state === 'playing') return;
    S.net.send({ k: 'hi', role: 'a', deck: S.deckId });
  }, 5000));
  show('room');
}

function joinRoom(code) {
  dropRoom(true);
  S.room = { code, role: 'b', state: 'wait', peerDeck: '' };
  S.net = net.connect(code, onNetMsg, onNetState);
  S.net.send({ k: 'hi', role: 'b', deck: S.deckId });
  S.timers.push(setInterval(() => {
    if (!S.net || !S.room || S.room.state === 'playing') return;
    S.net.send({ k: 'hi', role: 'b', deck: S.deckId });
  }, 5000));
  show('room');
}

function askJoin() {
  openModal(`<div class="mtitle"><h3>加入房间</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">填好友给你的 5 位房间码（字母数字，不含 I O 0 1）。</p>
    <input class="rin" id="rin" maxlength="5" placeholder="例如 K7M2Q" autocapitalize="characters" autocomplete="off">
    <div class="mb"><button class="btn ghost" data-modal="close">算了</button>
      <button class="btn pri" data-act="room-go">进房间</button></div>`);
  setTimeout(() => { const i = $('#rin'); if (i) i.focus(); }, 60);
}

function startNetGame(side, seed, deckA, deckB) {
  if (S.room) S.room.state = 'playing';
  const a = deckById(deckA);
  const b = deckById(deckB);
  newGame('net', side, side === 0 ? a : b, side === 0 ? b : a, seed);
  toast(side === 0 ? '好友已加入，你先手' : '已进入房间，房主先手');
}

function onNetMsg(p) {
  const r = S.room;
  if (!r) return;
  if (p.k === 'hi') {
    // 已经开打了就不理会：对方的握手每 5 秒重发一次，中继又会把 12 小时内的旧消息补发给重连的人，
    // 不挡的话，房主每收到一次旧的「hi」就会换个种子重开一局
    if (r.state === 'playing') return;
    if (r.role === 'a' && p.role === 'b') {
      r.peerDeck = p.deck || 'd1';
      r.state = 'playing';
      const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0;
      const a = S.deckId;
      const b = r.peerDeck;
      S.net.send({ k: 'open', seed, a, b });
      startNetGame(0, seed, a, b);
    }
    return;
  }
  if (p.k === 'open' && r.role === 'b') {
    if (r.state === 'playing') return;       // 补发的旧开局消息，别把正在打的这局重开
    r.state = 'playing';
    S.net.send({ k: 'ack' });
    startNetGame(1, p.seed, p.a, p.b);
    return;
  }
  if (p.k === 'act') {
    const G = S.G;
    if (!G || S.bt !== 'net') return;
    if (p.n !== S.seq + 1) { toast('房间消息不连续，重开一局吧'); return; }
    // 只认「对方的回合里、对方发的动作」：中继是公共话题，别人也能往里发消息；引擎里除了「结束回合」不检查轮到谁
    if (G.over || G.active !== 1 - S.side || !p.a || typeof p.a !== 'object') return;
    const res = E.applyAction(G, 1 - S.side, p.a);
    S.seq = p.n;
    if (!res.ok) toast('同步失败：' + res.err);
    S.sel = null; S.mode = 'idle';
    renderDuel();
    return;
  }
  if (p.k === 'bye') {
    toast('好友离开了房间');
    if (S.bt === 'net' && S.G && !S.G.over) {
      S.room = null;
      show('home');
    }
  }
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

function packBtnLabel() {
  if (freeLeft(S.save) > 0) return '免费开包';
  if ((S.save.tickets || 0) > 0) return '用券开包';
  return '开包 ' + PACK_PRICE;
}

function renderPacks() {
  const free = freeLeft(S.save);
  const tk = S.save.tickets || 0;
  const canBySilver = walletGet() >= PACK_PRICE;
  const packs = PACKS.map((pk) => {
    const have = pk.cards.filter((id) => S.save.coll[id]).length;
    const total = pk.cards.length;
    const pct = Math.round((have / total) * 100);
    const rar = {};
    for (const id of pk.cards) { const c = CARDS[id]; if (c) rar[c.rar] = (rar[c.rar] || 0) + 1; }
    const rarTxt = RAR_ORDER.filter((r) => rar[r]).map((r) => `${r}×${rar[r]}`).join(' · ');
    const dis = (free > 0 || tk > 0 || canBySilver) ? '' : 'disabled';
    return `<div class="pack" data-pack="${pk.id}">
      <div><div class="pn">${pk.n}</div><div class="pe">${pk.en}</div></div>
      <div class="ps">${pk.sub}</div>
      <div class="pd">${pk.desc}</div>
      <div class="pbar"><i style="width:${pct}%"></i></div>
      <div class="pf"><span style="white-space:nowrap">收录 ${have}/${total}</span>
        <button class="btn sm pri" data-buy="${pk.id}" ${dis}>${packBtnLabel()}</button>
      </div>
      <div class="note" style="font-size:10px;margin-top:-2px">${rarTxt}</div>
      <button class="btn sm" data-pool="${pk.id}" style="align-self:flex-start">查看卡池 · 每张效果</button>
    </div>`;
  }).join('');

  $('#scr-packs').innerHTML = `
    <div class="sec-h"><h2>卡包</h2><span class="r">银芯 ${walletGet()} · 券 ${tk} · 今日免费 ${free}</span></div>
    <p class="note" style="margin:0 0 10px">每包 5 张，第一张保底 SR 以上。开包的顺序是：先用每天白给的那一次，再用打人机赢来的券，
      最后才扣银芯（${PACK_PRICE}，全站共用的那份）。开出来的卡进收藏，不影响预组卡组——对决用的是整套预组，收藏是「我还记得这些人」。</p>
    <div class="packs">${packs}</div>
    <p class="note" style="margin-top:12px">已收录 ${Object.keys(S.save.coll).length} / ${Object.keys(CARDS).length} 种。
      今天还能拿 ${ticketDayLeft(S.save)} 张开包券（打赢人机 +1）。</p>
  `;
}

function buyPack(packId) {
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  if (freeLeft(S.save) <= 0 && (S.save.tickets || 0) <= 0 && walletGet() < PACK_PRICE) {
    return toast(`银芯不够，还差 ${PACK_PRICE - walletGet()}；今天也没有免费次数和券了`);
  }
  const pay = payPack(S.save);
  if (pay.kind === 'silver' && !walletSpend(pay.price)) return toast('银芯不够');
  S.save.opened++;
  const ids = drawFromPack(pk);
  const isNew = {};
  for (const id of ids) if (id && !S.save.coll[id]) isNew[id] = true;
  const newN = Object.keys(isNew).length;
  for (const id of ids) if (id) S.save.coll[id] = (S.save.coll[id] || 0) + 1;
  saveSave(S.save);
  silverBar();
  renderPacks();

  const payTxt = pay.kind === 'free' ? '今日免费' : (pay.kind === 'ticket' ? '用掉 1 张开包券' : `银芯 -${pay.price}`);
  const cards = ids.map((id) => CARDS[id]).filter(Boolean);
  openModal(`<div class="mtitle"><h3>${pk.n}</h3><span class="note">${pk.sub}</span>
    <button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">第 ${S.save.opened} 包 · ${payTxt}</p>
    <p class="note" style="margin:0 0 4px">${newN ? `本次新收录 ${newN} 种。` : '这五张都已收录过。'}点任意一张看详细效果。</p>
    <div class="pull">${cards.map((c) => `<div class="pc" data-read="${c.id}">${cardHTML(c, { tag: isNew[c.id] ? 'NEW' : '' })}<div class="rar" style="color:var(--rc)">${c.rar}${isNew[c.id] ? '' : ` · ×${S.save.coll[c.id]}`}</div></div>`).join('')}</div>
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
      ${list.map((c) => `<div>${cardHTML(c, {})}<div style="text-align:center;font-size:9px;color:var(--dim2);margin-top:2px">${c.rar}${(S.save.coll || {})[c.id] ? ` · ×${S.save.coll[c.id]}` : ' · 未收录'}</div></div>`).join('')}
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
    <h1>忘却前夜 · 唤醒王：决斗链接</h1>
    <p class="intro">${LORE.intro}</p>
    <div class="realms">${realms}</div>
    ${chapters}
    <div class="sec-h"><h2>名词</h2><span class="r">照本作的口径</span></div>
    <div class="terms">${terms}</div>
    <p class="note" style="margin-top:14px">术语沿用原作，卡牌规则与「唤醒王：决斗链接」这套玩法是本作私设。卡面头像来自游戏原作素材，仅用于同人。</p>
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
      <li><b>觉醒召唤</b>：把指定的素材送进墓地，从额外卡组特召，<b>不占通常召唤</b>。素材至少有一只在自己场上，另一只可以直接从手牌来；<b>刚觉醒的那一回合它不能攻击</b>。</li>
      <li><b>陷阱</b>：本作的陷阱是「自动迎击」——满足条件就发动，不用你宣言。所以盖牌的顺序要考虑对手会先干什么。</li>
      <li><b>羁绊</b>：卡组里同时有指定角色就会在开局触发，加攻、加血、多抽牌。配队比单卡重要。</li>
      <li><b>好友对战</b>：创建房间拿到 5 位码，好友在同一页「加入房间」填码即可。房间靠公共中继转发动作，
        两边各自按同一串动作重放，所以看到的一定是同一局。中继不通时可以「同屏双人」。</li>
    </ul>
    <div class="mb"><button class="btn pri" data-modal="close">知道了</button></div>`);
}

const RAR_COL = { N: 'N 普通', R: 'R 稀有', SR: 'SR 超稀', UR: 'UR 极稀', GR: 'GR 传说' };
const ROLL_TXT = 'N 45% · R 35% · SR 16% · UR 3% · GR 1%；第一张保底 SR 以上';

function lineCard(id, n, own) {
  const c = CARDS[id];
  if (!c) return '';
  const st = c.k === 'M' || c.k === 'E' ? `${c.atk}/${c.def}` : ({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '');
  const have = (S.save.coll || {})[id];
  return `<div class="lc" data-read="${id}" data-rar="${c.rar}" style="--rc:${(E.REALM[c.r] || E.REALM.any).c}">
    <div class="lh"><b>${c.n}</b>${n > 1 ? `<i>×${n}</i>` : ''}<span class="lr">${c.rar}</span>${own && have === undefined ? '<span class="lo">未收录</span>' : ''}</div>
    <div class="ls">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r}${c.lv ? ` · Lv${c.lv}` : ''} · ${st}</div>
    <div class="lt">${c.text}</div></div>`;
}

function showPackPool(packId) {
  const pk = PACKS.find((p) => p.id === packId);
  if (!pk) return;
  const have = pk.cards.filter((id) => S.save.coll[id]).length;
  const groups = RAR_ORDER.slice().reverse().filter((r) => pk.cards.some((id) => CARDS[id] && CARDS[id].rar === r)).map((r) => {
    const ids = pk.cards.filter((id) => CARDS[id] && CARDS[id].rar === r);
    return `<h4 class="gh">${RAR_COL[r] || r} · ${ids.length} 种</h4><div class="lcs">${ids.map((id) => lineCard(id, 1, true)).join('')}</div>`;
  }).join('');
  openModal(`<div class="mtitle"><h3>${pk.n} · 卡池</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${pk.cards.length} 种，已收录 ${have} 种。${ROLL_TXT}。点任意一张看大图。</p>${groups}
    <div class="mb"><button class="btn ghost" data-modal="close">关闭</button>
      <button class="btn pri" data-buy2="${pk.id}">开一包</button></div>`);
}

function showDeck(deckId) {
  const d = deckById(deckId);
  const bonds = E.evalBonds(deckList(d));
  const total = d.cards.reduce((s, p) => s + p[1], 0);
  const kinds = [['M', '怪兽'], ['S', '魔法'], ['T', '陷阱']];
  const grp = kinds.map(([k, n]) => {
    const rows = d.cards.filter((p) => CARDS[p[0]] && CARDS[p[0]].k === k);
    if (!rows.length) return '';
    const cnt = rows.reduce((s, p) => s + p[1], 0);
    return `<h4 class="gh">${n} · ${cnt} 张</h4><div class="lcs">${rows.map((p) => lineCard(p[0], p[1])).join('')}</div>`;
  }).join('');
  const ex = d.extra.length ? `<h4 class="gh">觉醒体（额外卡组）· ${d.extra.length} 张</h4><div class="lcs">${d.extra.map((id) => lineCard(id, 1)
    + (CARDS[id] && CARDS[id].mat ? `<div class="lm">素材：${CARDS[id].mat.join(' ＋ ')}</div>` : '')).join('')}</div>` : '';
  openModal(`<div class="mtitle"><h3>${d.n}</h3><button class="btn sm ghost x" data-modal="close">关闭</button></div>
    <p class="sub">${(E.REALM[d.r] || E.REALM.any).n} · 主卡组 ${total} 张 · 点任意一张看详细效果</p>
    <p class="note" style="margin:0 0 8px">${d.desc}</p>
    ${bonds.length ? `<h4 class="gh">羁绊</h4><ul class="tips">${bonds.map((b) => `<li><b style="color:var(--gold2)">${b.n}</b>：${b.text}</li>`).join('')}</ul>` : ''}
    ${(d.combo || []).length ? `<h4 class="gh">连动</h4><ul class="tips">${d.combo.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
    ${d.tips ? `<h4 class="gh">打法提示</h4><p class="note">${d.tips}</p>` : ''}
    ${grp}${ex}
    <div class="mb"><button class="btn ghost" data-modal="close">关闭</button>
      <button class="btn pri" data-deck-use="${d.id}">用这套卡组</button></div>`);
}

function readCard(id, push) {
  const c = CARDS[id];
  if (!c) return;
  const extra = c.k === 'E' ? `<p class="note">素材：${c.mat ? c.mat.join(' ＋ ') : '自己场上 2 只界域不同的怪兽'}</p>` : '';
  const have = (S.save.coll || {})[id] || 0;
  const canBack = push && S.mstack && S.mstack.length >= 0 && $('#mask').classList.contains('on') && $('#modal').innerHTML;
  openModal(`<div class="mtitle"><h3>${c.n}</h3><span class="note">${KIND_TXT[c.k]} · ${REALM_TXT[c.r] || c.r} · ${c.rar} · ${have ? `已收录 ×${have}` : '未收录'}</span>
    ${canBack ? '<button class="btn sm ghost x" data-modal="back">← 返回</button>' : ''}
    <button class="btn sm ghost ${canBack ? '' : 'x'}" data-modal="close">关闭</button></div>
    <div class="readface">${cardHTML(c, {})}</div>
    <p class="sub">${c.k === 'M' || c.k === 'E' ? `${c.atk} / ${c.def} · 等级 ${c.lv}` : ({ normal: '通常', quick: '速攻', equip: '装备', cont: '永续', counter: '反击' }[c.t] || '')}</p>
    ${extra}
    <p class="note" style="font-size:13px;line-height:1.9">${c.text}</p>`, push);
}

// ------------------------------------------------------------------ 事件
function bind() {
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#mask').classList.contains('on')) closeModal(); });
  document.addEventListener('click', (e) => {
    const rd = e.target.closest('[data-read]');
    if (rd) { readCard(rd.dataset.read, true); return; }
    const gc = e.target.closest('.grid-cards .card');
    if (gc && gc.dataset.id) { readCard(gc.dataset.id); return; }
    const dv = e.target.closest('[data-deckview]');
    if (dv) { e.stopPropagation(); showDeck(dv.dataset.deckview); return; }
    const du = e.target.closest('[data-deck-use]');
    if (du) { S.deckId = du.dataset.deckUse; S.save.deck = S.deckId; saveSave(S.save); closeModal(); renderHome(); toast('已选用这套卡组'); return; }
    const pl = e.target.closest('[data-pool]');
    if (pl) { showPackPool(pl.dataset.pool); return; }
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
      if (a === 'back') backModal();
      if (a === 'home') { closeModal(); dropRoom(true); show('home'); }
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
      const r = act({ t: 'awaken', id: t.dataset.awaken });
      if (!r.ok) return toast(r.err);
      closeModal();
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (t.dataset.ck) { S.codex.k = t.dataset.ck; renderCodex(); return; }
    if (t.dataset.cr) { S.codex.r = t.dataset.cr; renderCodex(); return; }
    if (t.dataset.id && t.closest('.grid-cards')) { readCard(t.dataset.id); return; }

    const name = t.dataset.act;
    if (name === 'start') return startDuel();
    if (name === 'local-duel') return startLocal();
    if (name === 'howto') return showHowTo();
    if (name === 'go-packs') return show('packs');
    if (name === 'go-codex') return show('codex');
    if (name === 'go-lore') return show('lore');
    if (name === 'room-create') return createRoom();
    if (name === 'room-join') return askJoin();
    if (name === 'room-copy') {
      const code = S.room && S.room.code;
      if (!code) return;
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('房间码已复制'), () => toast('复制失败，手抄一下'));
      else toast('房间码：' + code);
      return;
    }
    if (name === 'room-go') {
      const box = $('#rin');
      const code = net.normCode(box && box.value);
      if (!code) return toast('房间码是 5 位字母数字');
      closeModal();
      joinRoom(code);
      return;
    }
    if (name === 'leave') {
      dropRoom();
      if (S.G) S.G.over = true;
      show('home');
      return;
    }
    if (name === 'end') return playerEndTurn();
    if (name === 'battle') {
      const r = act({ t: 'battle' });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'extra') return onExtra();
    if (name === 'cancel') {
      S.sel = null; S.mode = 'idle'; S.tribute = []; S.pendingSummon = null;
      renderDuel();
      return;
    }
    if (name === 'pick-target') {
      // 对方场上空空如也：不用再多点一步，直接打脸
      const gm = S.G.players[SIDE()], sm = S.sel && gm.mons.find((x) => x && x.uid === S.sel.uid);
      if (sm && S.G.players[1 - SIDE()].mons.filter(Boolean).length === 0) {
        const r = act({ t: 'attack', uid: sm.uid, target: null });
        if (!r.ok) return toast(r.err);
        S.sel = null; S.mode = 'idle';
        renderDuel();
        return;
      }
      S.mode = 'attack';
      renderDuel();
      return;
    }
    if (name === 'direct') {
      const r = act({ t: 'attack', uid: S.sel.uid, target: null });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'flip') {
      const r = act({ t: 'pos', uid: S.sel.uid });
      if (!r.ok) return toast(r.err);
      S.sel = null; S.mode = 'idle';
      renderDuel();
      return;
    }
    if (name === 'summon' || name === 'setmon' || name === 'spell' || name === 'trap') {
      return onHandAct(name);
    }
    if (name === 'read') {
      const side = SIDE();
      const c = S.sel && S.sel.type === 'hand'
        ? S.G.players[side].hand.find((x) => x.uid === S.sel.uid)
        : S.G.players[side].mons.find((x) => x && x.uid === S.sel.uid);
      if (c) readCard(c.id);
      return;
    }
  });

  // 手牌 / 场地
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.hand .card');
    if (card && S.G && !S.busy && S.G.active === SIDE() && !S.G.over) {
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

  // 好友房：定时报活
  setInterval(() => {
    if (S.bt !== 'net' || !S.net || !S.room) return;
    if (S.room.state !== 'playing') return;
    S.net.send({ k: 'ping' });
  }, 20000);
}

// ------------------------------------------------------------------ 启动
// opt.afterPve：结算之后的回调，由入口 js/duel.js 注入（把段位分推一份到云端档案）。
// 这一页自己不认识账号模块：对战逻辑不需要知道「登录没登录、往哪推」。
let afterPve = null;
function pushCloud() {
  try { if (afterPve) afterPve(); } catch (e) { /* 推送失败不影响结算 */ }
}

function boot(opt) {
  afterPve = (opt && opt.afterPve) || null;
  document.documentElement.style.setProperty('--sheet', `url("${FACES}")`);
  document.documentElement.style.setProperty('--backimg', `url("${BACK}")`);
  document.documentElement.style.setProperty('--sheet-size', `${ART.cols * 100}% ${ART.rows * 100}%`);
  S.deckId = S.save.deck && DECKS.some((d) => d.id === S.save.deck) ? S.save.deck : DECKS[0].id;
  S.diff = S.save.diff || 'normal';
  // 老存档里有一份只在这一页用的银芯：并进全站钱包（约 6:1，最多 40 枚），不再单独记
  if (S.save.silver > 0) { walletAdd(Math.min(40, Math.floor(S.save.silver / 6))); S.save.silver = 0; saveSave(S.save); }
  silverBar();
  bind();
  show('home');
}
return { boot };
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
  // 2048：局面（save）和最高分都值得跟着账号走，难度 / 侵蚀 / 音效是这台设备的偏好
  // （皮肤不同步：换设备一进来就得多拉四百来 KB 的换皮池，不值）
  g2048: {
    zh: '忘却 2048', prefix: ['zjtt:g2048'], skip: /:(snd|diff|rot|played|skin)/,
    trivial: (keys) => !keys['zjtt:g2048:save'] && !keys['zjtt:g2048:best'],
  },
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

// ---- js/duel.js
const m_duel = await (async () => {
const { boot } = m_view;
const { startGameCloud } = m_gamecloud;
// 「唤醒王：决斗链接」的入口：只做一件事——把页面接上。
// 规则在 duel/engine.js，对手在 duel/ai.js，段位在 duel/rank.js，画面在 duel/view.js，
// 卡表与图集由 scripts/build.mjs 从 data/duel-*.json 生成到 duel/gen.js。



// 段位分要出现在首页排行榜上，靠的是账号档案里的摘要（js/gamestats.js 的 digest）。
// 这条链几十 KB，浏览器空闲了再动态 import，不挡首屏（构建后是 js/b/duel-sync.js）。
let sync = null;
function syncMod() {
  if (!sync) sync = import('./duel-sync.js').catch(() => null);
  return sync;
}

boot({ afterPve: () => { syncMod().then((m) => { if (m) m.flush(); }); } });
setTimeout(() => { syncMod().then((m) => { if (m) m.pull(); }); }, 1500);

// 登录了本站账号就把收藏 / 战绩整份存档同步到云端（js/gamecloud.js）
startGameCloud('duel');
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

