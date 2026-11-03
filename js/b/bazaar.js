(async () => {
// 由 scripts/build.mjs 生成，请改 js/ 下的源文件后重新构建。
// 每个原模块被包进一个 async IIFE：作用域隔离 + 支持 await，顺序即依赖顺序。

// ---- js/bazaar-gen.js
const m_bazaar_gen = await (async () => {

// 《大巴扎：银钥》数据表 —— 由 scripts/build_bazaar_gen.py 从客户端数据生成，**别手改**。
// 唤醒体 73 / 造物 310 / 命轮 149 / 密契 21 / 怪物 537；图集见 SHEETS。

const SHEETS = {"hero":{"src":"assets/bazaar/sheet-hero.webp","cols":8,"rows":10,"cell":80,"n":73,"bytes":134504},"item":{"src":"assets/bazaar/sheet-item.webp","cols":19,"rows":21,"cell":56,"n":393,"bytes":465208},"wheel":{"src":"assets/bazaar/sheet-wheel.webp","cols":13,"rows":12,"cell":48,"n":149,"bytes":58336},"mon":{"src":"assets/bazaar/sheet-mon.webp","cols":20,"rows":27,"cell":56,"n":537,"bytes":610864}};

const HEROES = [{"id":"24","n":"24","en":"24","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:0","wheel":"0020","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":13.0}],"txt":"每 5 拍：产出 10 算力，并造成 13 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·24","spr":"item:331","k":"amp","v":0.093},"lore":"混沌·伤害｜24"},{"id":"agrippa","n":"阿格里帕","en":"Agrippa","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:1","wheel":"0007","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·阿格里帕","spr":"item:332","k":"gen","v":0.085},"lore":"血肉·防御｜Agrippa"},{"id":"aigis","n":"艾继丝","en":"Aigis","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:2","wheel":"0003","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·艾继丝","spr":"item:333","k":"gen","v":0.079},"lore":"血肉·辅助｜Aigis"},{"id":"alva","n":"艾尔瓦","en":"Alva","realm":"CHAOS","realmZh":"混沌","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:3","wheel":"0025","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·艾尔瓦","spr":"item:334","k":"amp","v":0.076},"lore":"混沌·防御｜Alva"},{"id":"aurita","n":"奥瑞塔","en":"Aurita","realm":"AEQUOR","realmZh":"深海","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:4","wheel":"0054","slots":1,"gen":3,"cd":3,"act":[{"k":"dmg","v":5.5}],"txt":"每 3 拍：产出 3 算力，并造成 5.5 点伤害。","aura":{"k":"pow","v":0.16},"auraTxt":"相邻唤醒体的动作效果 +16%","fate":{"n":"维度影像·奥瑞塔","spr":"item:335","k":"shcap","v":9},"lore":"深海·伤害｜Aurita"},{"id":"caecus","n":"凯刻斯","en":"Caecus","realm":"AEQUOR","realmZh":"深海","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:5","wheel":"0053","slots":3,"gen":10,"cd":5,"act":[{"k":"shield","v":18}],"txt":"每 5 拍：产出 10 算力，并架起 18 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·凯刻斯","spr":"item:336","k":"shcap","v":14},"lore":"深海·防御｜Caecus"},{"id":"casiah","n":"卡茜亚","en":"Casiah","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:6","wheel":"0038","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·卡茜亚","spr":"item:337","k":"crit","v":0.038},"lore":"超维·辅助｜Casiah"},{"id":"castor","n":"卡斯托尔","en":"Castor","realm":"ULTRA","realmZh":"超维","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:7","wheel":"0039","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·卡斯托尔","spr":"item:338","k":"crit","v":0.048},"lore":"超维·防御｜Castor"},{"id":"celeste","n":"希莱斯特","en":"Celeste","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:8","wheel":"0058","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.09}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +9%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·希莱斯特","spr":"item:339","k":"shcap","v":7},"lore":"深海·辅助｜Celeste"},{"id":"clementine","n":"克莱门汀","en":"Clementine","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:9","wheel":"0041","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·克莱门汀","spr":"item:340","k":"crit","v":0.047},"lore":"超维·辅助｜Clementine"},{"id":"corposant","n":"克珀珊特","en":"Corposant","realm":"AEQUOR","realmZh":"深海","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:10","wheel":"0059","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·克珀珊特","spr":"item:341","k":"shcap","v":12},"lore":"深海·防御｜Corposant"},{"id":"daffodil","n":"达芙黛尔","en":"Daffodil","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:11","wheel":"0031","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.6}],"txt":"每 5 拍：产出 10 算力，并造成 12.6 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·达芙黛尔","spr":"item:342","k":"crit","v":0.06},"lore":"超维·伤害｜Daffodil"},{"id":"doll","n":"朵尔","en":"Doll","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:12","wheel":"0015","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.1}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +10%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·朵尔","spr":"item:343","k":"amp","v":0.044},"lore":"混沌·辅助｜Doll"},{"id":"doresain","n":"杜勒赛因","en":"Doresain","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:13","wheel":"0011","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.0}],"txt":"每 5 拍：产出 10 算力，并造成 12 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·杜勒赛因","spr":"item:344","k":"gen","v":0.097},"lore":"血肉·伤害｜Doresain"},{"id":"erica","n":"艾瑞卡","en":"Erica","realm":"ULTRA","realmZh":"超维","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:14","wheel":"0037","slots":3,"gen":10,"cd":5,"act":[{"k":"shield","v":19}],"txt":"每 5 拍：产出 10 算力，并架起 19 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·艾瑞卡","spr":"item:345","k":"crit","v":0.061},"lore":"超维·防御｜Erica"},{"id":"faint","n":"菲茵特","en":"Faint","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:15","wheel":"0010","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":9}],"txt":"每 3 拍：产出 3 算力，并架起 9 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·菲茵特","spr":"item:346","k":"gen","v":0.064},"lore":"血肉·防御｜Faint"},{"id":"faros","n":"法洛思","en":"Faros","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:16","wheel":"0052","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·法洛思","spr":"item:347","k":"shcap","v":10},"lore":"深海·辅助｜Faros"},{"id":"doll-inferno","n":"熔毁·朵尔","en":"Doll: Inferno","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"Genesis","spr":"hero:17","wheel":"0016","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.1}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +10%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·熔毁·朵尔","spr":"item:348","k":"amp","v":0.044},"lore":"混沌·辅助｜Doll: Inferno"},{"id":"helot-catena","n":"血链·希洛","en":"Helot: Catena","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"Genesis","spr":"hero:18","wheel":"0006","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.5}],"txt":"每 4 拍：产出 6 算力，并造成 9.5 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·血链·希洛","spr":"item:349","k":"gen","v":0.094},"lore":"血肉·伤害｜Helot: Catena"},{"id":"ramona-timeworn","n":"环行·拉蒙娜","en":"Ramona: Timeworn","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"Genesis","spr":"hero:19","wheel":"0181","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·环行·拉蒙娜","spr":"item:350","k":"amp","v":0.069},"lore":"混沌·辅助｜Ramona: Timeworn"},{"id":"goliath","n":"戈利亚","en":"Goliath","realm":"AEQUOR","realmZh":"深海","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:20","wheel":"0055","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":13.6}],"txt":"每 5 拍：产出 10 算力，并造成 13.6 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·戈利亚","spr":"item:351","k":"shcap","v":18},"lore":"深海·伤害｜Goliath"},{"id":"hameln","n":"哈姆林","en":"Hameln","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:21","wheel":"0040","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·哈姆林","spr":"item:352","k":"amp","v":0.071},"lore":"混沌·辅助｜Hameln"},{"id":"helot","n":"希洛","en":"Helot","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:22","wheel":"0005","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.5}],"txt":"每 4 拍：产出 6 算力，并造成 9.5 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·希洛","spr":"item:353","k":"gen","v":0.094},"lore":"血肉·伤害｜Helot"},{"id":"horla","n":"奥尔拉","en":"Horla","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:23","wheel":"0035","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.11}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +11%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·奥尔拉","spr":"item:354","k":"crit","v":0.03},"lore":"超维·辅助｜Horla"},{"id":"jenkin","n":"詹金","en":"Jenkin","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:24","wheel":"0036","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.2}],"txt":"每 4 拍：产出 6 算力，并造成 9.2 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·詹金","spr":"item:355","k":"crit","v":0.048},"lore":"超维·伤害｜Jenkin"},{"id":"karen","n":"珈伦","en":"Karen","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:25","wheel":"0026","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.11}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +11%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·珈伦","spr":"item:356","k":"amp","v":0.057},"lore":"混沌·辅助｜Karen"},{"id":"kathigu-ra","n":"凯蒂古拉","en":"Kathigu-Ra","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:26","wheel":"0028","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.2}],"txt":"每 5 拍：产出 10 算力，并造成 12.2 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·凯蒂古拉","spr":"item:357","k":"amp","v":0.083},"lore":"混沌·伤害｜Kathigu-Ra"},{"id":"leigh","n":"雷娅","en":"Leigh","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:27","wheel":"0009","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.09}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +9%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·雷娅","spr":"item:358","k":"gen","v":0.05},"lore":"血肉·辅助｜Leigh"},{"id":"lily","n":"莉莉","en":"Lily","realm":"CHAOS","realmZh":"混沌","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:28","wheel":"0024","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·莉莉","spr":"item:359","k":"amp","v":0.07},"lore":"混沌·防御｜Lily"},{"id":"liz","n":"莉兹","en":"Liz","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:29","wheel":"0030","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.0}],"txt":"每 5 拍：产出 10 算力，并造成 12 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·莉兹","spr":"item:360","k":"crit","v":0.054},"lore":"超维·伤害｜Liz"},{"id":"lotan","n":"萝坦","en":"Lotan","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:30","wheel":"0018","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.3}],"txt":"每 4 拍：产出 6 算力，并造成 9.3 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·萝坦","spr":"item:361","k":"amp","v":0.075},"lore":"混沌·伤害｜Lotan"},{"id":"miryam","n":"弥利亚姆","en":"Miryam","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:31","wheel":"0056","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·弥利亚姆","spr":"item:362","k":"shcap","v":11},"lore":"深海·辅助｜Miryam"},{"id":"mouchette","n":"茉夏","en":"Mouchette","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:32","wheel":"0029","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.1}],"txt":"每 4 拍：产出 6 算力，并造成 9.1 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·茉夏","spr":"item:363","k":"amp","v":0.073},"lore":"混沌·伤害｜Mouchette"},{"id":"murphy","n":"墨菲","en":"Murphy","realm":"AEQUOR","realmZh":"深海","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:33","wheel":"0051","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·墨菲","spr":"item:364","k":"shcap","v":13},"lore":"深海·防御｜Murphy"},{"id":"murphy-fauxborn","n":"诞妄·墨菲","en":"Murphy: Fauxborn","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"Genesis","spr":"hero:34","wheel":"0111","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.11}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +11%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·诞妄·墨菲","spr":"item:365","k":"shcap","v":10},"lore":"深海·辅助｜Murphy: Fauxborn"},{"id":"nautila","n":"诺缔拉","en":"Nautila","realm":"CHAOS","realmZh":"混沌","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:35","wheel":"0021","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·诺缔拉","spr":"item:366","k":"amp","v":0.07},"lore":"混沌·防御｜Nautila"},{"id":"nymphaea","n":"宁菲亚","en":"Nymphaea","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:36","wheel":"0022","slots":1,"gen":3,"cd":3,"act":[{"k":"dmg","v":5.8}],"txt":"每 3 拍：产出 3 算力，并造成 5.8 点伤害。","aura":{"k":"pow","v":0.16},"auraTxt":"相邻唤醒体的动作效果 +16%","fate":{"n":"维度影像·宁菲亚","spr":"item:367","k":"amp","v":0.059},"lore":"混沌·伤害｜Nymphaea"},{"id":"ogier","n":"奥吉尔","en":"Ogier","realm":"CHAOS","realmZh":"混沌","type":"防御","typeKey":"WARDEN","rar":"SR","spr":"hero:37","wheel":"0017","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·奥吉尔","spr":"item:368","k":"amp","v":0.074},"lore":"混沌·防御｜Ogier"},{"id":"pandia","n":"潘狄娅","en":"Pandia","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:38","wheel":"0023","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":11.9}],"txt":"每 5 拍：产出 10 算力，并造成 11.9 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·潘狄娅","spr":"item:369","k":"amp","v":0.079},"lore":"混沌·伤害｜Pandia"},{"id":"pickman","n":"皮克曼","en":"Pickman","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:39","wheel":"0012","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·皮克曼","spr":"item:370","k":"gen","v":0.085},"lore":"血肉·辅助｜Pickman"},{"id":"pollux","n":"波吕克斯","en":"Pollux","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:40","wheel":"0042","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":11.9}],"txt":"每 5 拍：产出 10 算力，并造成 11.9 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·波吕克斯","spr":"item:371","k":"crit","v":0.053},"lore":"超维·伤害｜Pollux"},{"id":"ramona","n":"拉蒙娜","en":"Ramona","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:41","wheel":"0014","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·拉蒙娜","spr":"item:372","k":"amp","v":0.069},"lore":"混沌·辅助｜Ramona"},{"id":"ryker","n":"莱克","en":"Ryker","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:42","wheel":"0019","slots":3,"gen":10,"cd":5,"act":[{"k":"vuln","v":0.19}],"txt":"每 5 拍：产出 10 算力，并让对手易伤 +19%（3 拍）。","aura":{"k":"gen","v":3},"auraTxt":"相邻唤醒体每次多产 3 算力","fate":{"n":"维度影像·莱克","spr":"item:373","k":"amp","v":0.083},"lore":"混沌·辅助｜Ryker"},{"id":"salvador","n":"萨尔瓦多","en":"Salvador","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:43","wheel":"0002","slots":3,"gen":10,"cd":5,"act":[{"k":"shield","v":18}],"txt":"每 5 拍：产出 10 算力，并架起 18 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·萨尔瓦多","spr":"item:374","k":"gen","v":0.098},"lore":"血肉·防御｜Salvador"},{"id":"sanga","n":"珊","en":"Sanga","realm":"AEQUOR","realmZh":"深海","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:44","wheel":"0057","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":10}],"txt":"每 3 拍：产出 3 算力，并架起 10 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·珊","spr":"item:375","k":"shcap","v":11},"lore":"深海·防御｜Sanga"},{"id":"sorel","n":"索蕾尔","en":"Sorel","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:45","wheel":"0004","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.7}],"txt":"每 5 拍：产出 10 算力，并造成 12.7 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·索蕾尔","spr":"item:376","k":"gen","v":0.107},"lore":"血肉·伤害｜Sorel"},{"id":"tawil","n":"塔薇","en":"Tawil","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:46","wheel":"0027","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·塔薇","spr":"item:377","k":"amp","v":0.069},"lore":"混沌·辅助｜Tawil"},{"id":"thais","n":"泰旖丝","en":"Thais","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:47","wheel":"0001","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·泰旖丝","spr":"item:378","k":"gen","v":0.084},"lore":"血肉·辅助｜Thais"},{"id":"tinct","n":"汀克特","en":"Tinct","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:48","wheel":"0032","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.11}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +11%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·汀克特","spr":"item:379","k":"crit","v":0.032},"lore":"超维·辅助｜Tinct"},{"id":"tulu","n":"图鲁","en":"Tulu","realm":"AEQUOR","realmZh":"深海","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:49","wheel":"0050","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.6}],"txt":"每 5 拍：产出 10 算力，并造成 12.6 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·图鲁","spr":"item:380","k":"shcap","v":16},"lore":"深海·伤害｜Tulu"},{"id":"uvhash","n":"尤乌哈希","en":"Uvhash","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:50","wheel":"0008","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.0}],"txt":"每 5 拍：产出 10 算力，并造成 12 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·尤乌哈希","spr":"item:381","k":"gen","v":0.098},"lore":"血肉·伤害｜Uvhash"},{"id":"wanda","n":"旺达","en":"Wanda","realm":"ULTRA","realmZh":"超维","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:51","wheel":"0033","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":10}],"txt":"每 3 拍：产出 3 算力，并架起 10 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·旺达","spr":"item:382","k":"crit","v":0.043},"lore":"超维·防御｜Wanda"},{"id":"winkle","n":"温柯尔","en":"Winkle","realm":"ULTRA","realmZh":"超维","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:52","wheel":"0034","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":10}],"txt":"每 3 拍：产出 3 算力，并架起 10 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·温柯尔","spr":"item:383","k":"crit","v":0.038},"lore":"超维·防御｜Winkle"},{"id":"xu","n":"徐","en":"Xu","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:53","wheel":"0013","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.16}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +16%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·徐","spr":"item:384","k":"gen","v":0.089},"lore":"血肉·辅助｜Xu"},{"id":"vortice","n":"莫丝","en":"Vortice","realm":"AEQUOR","realmZh":"深海","type":"伤害","typeKey":"ASSAULT","rar":"SSR","spr":"hero:54","wheel":"0060","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.8}],"txt":"每 5 拍：产出 10 算力，并造成 12.8 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·莫丝","spr":"item:385","k":"shcap","v":16},"lore":"深海·伤害｜Vortice"},{"id":"arachne","n":"阿拉克涅","en":"Arachne","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:55","wheel":"0128","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·阿拉克涅","spr":"item:386","k":"crit","v":0.037},"lore":"超维·辅助｜Arachne"},{"id":"saya","n":"沙耶","en":"Saya","realm":"CARO","realmZh":"血肉","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:56","wheel":"0167","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.1}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +10%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·沙耶","spr":"item:387","k":"gen","v":0.062},"lore":"血肉·辅助｜Saya"},{"id":"pontos","n":"庞托斯","en":"Pontos","realm":"AEQUOR","realmZh":"深海","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:57","wheel":"0169","slots":3,"gen":10,"cd":5,"act":[{"k":"shield","v":18}],"txt":"每 5 拍：产出 10 算力，并架起 18 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·庞托斯","spr":"item:388","k":"shcap","v":14},"lore":"深海·防御｜Pontos"},{"id":"lotan-cetarchon","n":"蚀灭·萝坦","en":"Lotan: Cetarchon","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"Genesis","spr":"hero:58","wheel":"0172","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":13.6}],"txt":"每 5 拍：产出 10 算力，并造成 13.6 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·蚀灭·萝坦","spr":"item:389","k":"amp","v":0.1},"lore":"混沌·伤害｜Lotan: Cetarchon"},{"id":"caraboo","n":"卡拉布","en":"Caraboo","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SSR","spr":"hero:59","wheel":"0175","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":9}],"txt":"每 3 拍：产出 3 算力，并架起 9 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·卡拉布","spr":"item:390","k":"gen","v":0.069},"lore":"血肉·防御｜Caraboo"},{"id":"ogier-oathbound","n":"负誓·奥吉尔","en":"Ogier: Oathbound","realm":"CHAOS","realmZh":"混沌","type":"防御","typeKey":"WARDEN","rar":"Genesis","spr":"hero:60","wheel":"0178","slots":3,"gen":10,"cd":5,"act":[{"k":"shield","v":19}],"txt":"每 5 拍：产出 10 算力，并架起 19 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·负誓·奥吉尔","spr":"item:391","k":"amp","v":0.087},"lore":"混沌·防御｜Ogier: Oathbound"},{"id":"vivian","n":"薇薇安","en":"Vivian","realm":"CHAOS","realmZh":"混沌","type":"辅助","typeKey":"CHORUS","rar":"SSR","spr":"hero:61","wheel":"0181","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.11}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +11%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·薇薇安","spr":"item:392","k":"amp","v":0.054},"lore":"混沌·辅助｜Vivian"},{"id":"egg-samo","n":"萨摩不耶","en":"Samo","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:62","wheel":"0017","slots":3,"gen":10,"cd":5,"act":[{"k":"dmg","v":12.5}],"txt":"每 5 拍：产出 10 算力，并造成 12.5 点伤害。","aura":{"k":"pow","v":0.28},"auraTxt":"相邻唤醒体的动作效果 +28%","fate":{"n":"维度影像·节拍器","spr":"item:267","k":"amp","v":0.086},"egg":true,"lore":"主播｜B 站内容创作者 · 萨摩不耶"},{"id":"egg-susu","n":"梦依流苏","en":"Sue","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:63","wheel":"0057","slots":2,"gen":6,"cd":4,"act":[{"k":"vuln","v":0.15}],"txt":"每 4 拍：产出 6 算力，并让对手易伤 +15%（3 拍）。","aura":{"k":"gen","v":2},"auraTxt":"相邻唤醒体每次多产 2 算力","fate":{"n":"维度影像·不做梦的人","spr":"item:279","k":"shcap","v":12},"egg":true,"lore":"主播｜B 站内容创作者 · 梦依流苏"},{"id":"egg-alice","n":"爱丽丝","en":"Alice","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:64","wheel":"0035","slots":1,"gen":3,"cd":3,"act":[{"k":"dmg","v":5.7}],"txt":"每 3 拍：产出 3 算力，并造成 5.7 点伤害。","aura":{"k":"pow","v":0.16},"auraTxt":"相邻唤醒体的动作效果 +16%","fate":{"n":"维度影像·洞口的兔子","spr":"item:309","k":"crit","v":0.035},"egg":true,"lore":"主播｜B 站内容创作者 · 爱丽丝"},{"id":"egg-ratking","n":"鼠王","en":"Rat King","realm":"CARO","realmZh":"血肉","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:65","wheel":"0004","slots":1,"gen":3,"cd":3,"act":[{"k":"dmg","v":6.5}],"txt":"每 3 拍：产出 3 算力，并造成 6.5 点伤害。","aura":{"k":"pow","v":0.16},"auraTxt":"相邻唤醒体的动作效果 +16%","fate":{"n":"维度影像·数不清","spr":"item:308","k":"gen","v":0.082},"egg":true,"lore":"主播｜B 站内容创作者 · 鼠王"},{"id":"egg-dragon","n":"魔龙_D","en":"Dragon D","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SR","spr":"hero:66","wheel":"0013","slots":2,"gen":6,"cd":4,"act":[{"k":"shield","v":14}],"txt":"每 4 拍：产出 6 算力，并架起 14 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·逆鳞","spr":"item:280","k":"gen","v":0.087},"egg":true,"lore":"主播｜B 站内容创作者 · 魔龙_D"},{"id":"egg-zerokr","n":"立誓0氪","en":"Zero KR","realm":"CHAOS","realmZh":"混沌","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:67","wheel":"0025","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":8.7}],"txt":"每 4 拍：产出 6 算力，并造成 8.7 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·一分不花","spr":"item:294","k":"amp","v":0.068},"egg":true,"lore":"主播｜B 站内容创作者 · 立誓0氪"},{"id":"egg-moreen","n":"夏茉琳","en":"Moreen","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:68","wheel":"0057","slots":3,"gen":10,"cd":5,"act":[{"k":"vuln","v":0.18}],"txt":"每 5 拍：产出 10 算力，并让对手易伤 +18%（3 拍）。","aura":{"k":"gen","v":3},"auraTxt":"相邻唤醒体每次多产 3 算力","fate":{"n":"维度影像·花间行走","spr":"item:253","k":"shcap","v":14},"egg":true,"lore":"主播｜B 站内容创作者 · 夏茉琳"},{"id":"egg-chaoxing","n":"朝星","en":"Chaoxing","realm":"ULTRA","realmZh":"超维","type":"伤害","typeKey":"ASSAULT","rar":"SR","spr":"hero:69","wheel":"0030","slots":2,"gen":6,"cd":4,"act":[{"k":"dmg","v":9.2}],"txt":"每 4 拍：产出 6 算力，并造成 9.2 点伤害。","aura":{"k":"pow","v":0.22},"auraTxt":"相邻唤醒体的动作效果 +22%","fate":{"n":"维度影像·破晓","spr":"item:302","k":"crit","v":0.048},"egg":true,"lore":"主播｜B 站内容创作者 · 朝星"},{"id":"egg-maodie","n":"路过的耄耋","en":"Passing Maodie","realm":"CARO","realmZh":"血肉","type":"防御","typeKey":"WARDEN","rar":"SR","spr":"hero:70","wheel":"0012","slots":1,"gen":3,"cd":3,"act":[{"k":"shield","v":10}],"txt":"每 3 拍：产出 3 算力，并架起 10 点护盾。","aura":{"k":"cd","v":1},"auraTxt":"相邻唤醒体的节拍 -1","fate":{"n":"维度影像·我什么都没看","spr":"item:278","k":"gen","v":0.077},"egg":true,"lore":"主播｜B 站内容创作者 · 路过的耄耋"},{"id":"egg-baiyun","n":"白云出岫","en":"Baiyun Chuxiu","realm":"ULTRA","realmZh":"超维","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:71","wheel":"0042","slots":3,"gen":10,"cd":5,"act":[{"k":"vuln","v":0.19}],"txt":"每 5 拍：产出 10 算力，并让对手易伤 +19%（3 拍）。","aura":{"k":"gen","v":3},"auraTxt":"相邻唤醒体每次多产 3 算力","fate":{"n":"维度影像·复现","spr":"item:281","k":"crit","v":0.054},"egg":true,"lore":"主播｜B 站内容创作者 · 白云出岫"},{"id":"egg-banxing","n":"半醒的鱼","en":"Halfawake","realm":"AEQUOR","realmZh":"深海","type":"辅助","typeKey":"CHORUS","rar":"SR","spr":"hero:72","wheel":"0131","slots":1,"gen":3,"cd":3,"act":[{"k":"vuln","v":0.12}],"txt":"每 3 拍：产出 3 算力，并让对手易伤 +12%（3 拍）。","aura":{"k":"gen","v":1},"auraTxt":"相邻唤醒体每次多产 1 算力","fate":{"n":"维度影像·按需选用","spr":"item:274","k":"shcap","v":11},"egg":true,"lore":"主播｜B 站内容创作者 · 半醒的鱼"}];

const ITEMS = [{"id":"0059","n":"深渊通信","spr":"item:0","r":"SSR","cost":8,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0060","n":"深海戒指","spr":"item:1","r":"SSR","cost":9,"m":{"k":"cap","v":12},"arch":"aura"},{"id":"0061","n":"阿方索之器","spr":"item:2","r":"N","cost":5,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0062","n":"异形之心","spr":"item:3","r":"N","cost":4,"m":{"k":"amp","v":0.081},"arch":"str"},{"id":"0063","n":"老旧拼图","spr":"item:4","r":"SSR","cost":8,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0064","n":"阿尔卡纳记录","spr":"item:5","r":"N","cost":4,"m":{"k":"amp","v":0.081},"arch":"aura"},{"id":"0065","n":"阿尔卡纳遗物","spr":"item:6","r":"N","cost":6,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0066","n":"魔术手套","spr":"item:7","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0067","n":"Argent Return","spr":"item:8","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"dmg"},{"id":"0074","n":"渔叉","spr":"item:9","r":"N","cost":5,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0075","n":"大嘴纽扣","spr":"item:10","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"dmg"},{"id":"0076","n":"黑烛","spr":"item:11","r":"SR","cost":8,"m":{"k":"cdmg","v":0.198},"arch":"burn"},{"id":"0077","n":"黑星燃烧之烬","spr":"item:12","r":"SR","cost":7,"m":{"k":"cdmg","v":0.22},"arch":"burn"},{"id":"0078","n":"恩赐之血","spr":"item:13","r":"N","cost":6,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0079","n":"染血鹅卵石","spr":"item:14","r":"N","cost":5,"m":{"k":"cap","v":7},"arch":"regen"},{"id":"0080","n":"骸骨杯盏","spr":"item:15","r":"SSR","cost":9,"m":{"k":"cdmg","v":0.32},"arch":"str"},{"id":"0081","n":"崭新的钱包","spr":"item:16","r":"N","cost":4,"m":{"k":"start","v":5},"arch":"gold"},{"id":"0082","n":"Brass Censer","spr":"item:17","r":"SSR","cost":10,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0083","n":"残缺面孔","spr":"item:18","r":"SR","cost":8,"m":{"k":"crit","v":0.06},"arch":"dmg"},{"id":"0084","n":"血肉戒指","spr":"item:19","r":"SSR","cost":9,"m":{"k":"cap","v":12},"arch":"aura"},{"id":"0085","n":"猫的宝藏","spr":"item:20","r":"SR","cost":7,"m":{"k":"start","v":8},"arch":"gold"},{"id":"0086","n":"秘典星象仪","spr":"item:21","r":"N","cost":4,"m":{"k":"cdmg","v":0.172},"arch":"crit"},{"id":"0087","n":"锡兰红茶","spr":"item:22","r":"N","cost":4,"m":{"k":"shcap","v":14},"arch":"heal"},{"id":"0088","n":"海眷歌谣","spr":"item:23","r":"N","cost":4,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0089","n":"混沌戒指","spr":"item:24","r":"SSR","cost":8,"m":{"k":"cap","v":15},"arch":"aura"},{"id":"0090","n":"时灵摆「回噬」","spr":"item:25","r":"SR","cost":7,"m":{"k":"cdmg","v":0.22},"arch":"str"},{"id":"0091","n":"时灵摆「均衡」","spr":"item:26","r":"SR","cost":6,"m":{"k":"shcap","v":21},"arch":"shield"},{"id":"0092","n":"时灵摆「赐福」","spr":"item:27","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"heal"},{"id":"0093","n":"时灵摆「温床」","spr":"item:28","r":"SR","cost":6,"m":{"k":"cap","v":9},"arch":"regen"},{"id":"0094","n":"Chrono Pendulum \"Buildup\"","spr":"item:29","r":"SR","cost":6,"m":{"k":"cdmg","v":0.198},"arch":"str"},{"id":"0095","n":"时灵摆「混沌馈赠」","spr":"item:30","r":"SR","cost":8,"m":{"k":"cdmg","v":0.22},"arch":"crit"},{"id":"0096","n":"时灵摆「蓄力！」","spr":"item:31","r":"SR","cost":8,"m":{"k":"amp","v":0.115},"arch":"str"},{"id":"0097","n":"时灵摆「深化」","spr":"item:32","r":"SR","cost":8,"m":{"k":"amp","v":0.09},"arch":"poison"},{"id":"0098","n":"时灵摆「窃梦」","spr":"item:33","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"vuln"},{"id":"0099","n":"时灵摆「回响」","spr":"item:34","r":"SR","cost":7,"m":{"k":"amp","v":0.09},"arch":"aura"},{"id":"0100","n":"时灵摆「演绎」","spr":"item:35","r":"SR","cost":7,"m":{"k":"cdmg","v":0.22},"arch":"crit"},{"id":"0101","n":"时灵摆「终结」","spr":"item:36","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"dmg"},{"id":"0102","n":"时灵摆「衍化」","spr":"item:37","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"regen"},{"id":"0103","n":"时灵摆「眼」","spr":"item:38","r":"SR","cost":7,"m":{"k":"crit","v":0.069},"arch":"crit"},{"id":"0104","n":"时灵摆「迷梦」","spr":"item:39","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"vuln"},{"id":"0105","n":"时灵摆「间隙」","spr":"item:40","r":"SR","cost":7,"m":{"k":"cap","v":8},"arch":"haste"},{"id":"0106","n":"时灵摆「迷失」","spr":"item:41","r":"SR","cost":8,"m":{"k":"amp","v":0.115},"arch":"slow"},{"id":"0107","n":"时灵摆「冥想」","spr":"item:42","r":"SR","cost":8,"m":{"k":"shcap","v":18},"arch":"heal"},{"id":"0108","n":"时灵摆「月亮」","spr":"item:43","r":"SR","cost":7,"m":{"k":"cap","v":8},"arch":"regen"},{"id":"0109","n":"时灵摆「梦魇」","spr":"item:44","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"vuln"},{"id":"0110","n":"时灵摆「隐秘」","spr":"item:45","r":"SR","cost":8,"m":{"k":"cdmg","v":0.253},"arch":"crit"},{"id":"0111","n":"时灵摆「解析」","spr":"item:46","r":"SR","cost":8,"m":{"k":"cdmg","v":0.198},"arch":"crit"},{"id":"0112","n":"时灵摆「疫症」","spr":"item:47","r":"SR","cost":7,"m":{"k":"amp","v":0.1},"arch":"poison"},{"id":"0113","n":"时灵摆「校长寄语」","spr":"item:48","r":"SR","cost":6,"m":{"k":"cap","v":10},"arch":"gold"},{"id":"0114","n":"时灵摆「投射」","spr":"item:49","r":"SR","cost":7,"m":{"k":"crit","v":0.06},"arch":"dmg"},{"id":"0115","n":"时灵摆「增殖」","spr":"item:50","r":"SR","cost":6,"m":{"k":"amp","v":0.09},"arch":"poison"},{"id":"0116","n":"Chrono Pendulum \"Reciprocate\"","spr":"item:51","r":"SR","cost":8,"m":{"k":"thorns","v":3},"arch":"thorns"},{"id":"0117","n":"时灵摆「复苏」","spr":"item:52","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"heal"},{"id":"0118","n":"时灵摆「不眠」","spr":"item:53","r":"SR","cost":7,"m":{"k":"wcd","v":1},"arch":"haste"},{"id":"0119","n":"时灵摆「浅眠」","spr":"item:54","r":"SR","cost":6,"m":{"k":"regen","v":2},"arch":"shield"},{"id":"0120","n":"时灵摆「群星」","spr":"item:55","r":"SR","cost":6,"m":{"k":"crit","v":0.054},"arch":"crit"},{"id":"0121","n":"时灵摆「惊梦」","spr":"item:56","r":"SR","cost":8,"m":{"k":"crit","v":0.054},"arch":"vuln"},{"id":"0122","n":"时灵摆「执拗」","spr":"item:57","r":"SR","cost":8,"m":{"k":"shcap","v":18},"arch":"thorns"},{"id":"0123","n":"时灵摆「潜游」","spr":"item:58","r":"SR","cost":6,"m":{"k":"regen","v":2},"arch":"shield"},{"id":"0124","n":"时灵摆「沉船秘宝」","spr":"item:59","r":"SR","cost":6,"m":{"k":"cap","v":8},"arch":"gold"},{"id":"0125","n":"时灵摆「涌动」","spr":"item:60","r":"SR","cost":7,"m":{"k":"cap","v":9},"arch":"haste"},{"id":"0126","n":"时灵摆「潮涌」","spr":"item:61","r":"SR","cost":6,"m":{"k":"crit","v":0.06},"arch":"dmg"},{"id":"0127","n":"时灵摆「入迷」","spr":"item:62","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"vuln"},{"id":"0128","n":"时灵摆「秘宝α」","spr":"item:63","r":"SR","cost":6,"m":{"k":"cap","v":9},"arch":"gold"},{"id":"0129","n":"时灵摆「双生」","spr":"item:64","r":"SR","cost":7,"m":{"k":"crit","v":0.054},"arch":"dmg"},{"id":"0130","n":"时灵摆「不洁」","spr":"item:65","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"poison"},{"id":"0131","n":"Chrono Pendulum \"Wings\"","spr":"item:66","r":"SR","cost":8,"m":{"k":"cap","v":10},"arch":"haste"},{"id":"0132","n":"时灵摆「祈愿」","spr":"item:67","r":"SR","cost":6,"m":{"k":"cap","v":10},"arch":"gold"},{"id":"0133","n":"精密计时器","spr":"item:68","r":"N","cost":6,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0134","n":"Coalsie II","spr":"item:69","r":"SSR","cost":8,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0135","n":"Concubines' Conceit","spr":"item:70","r":"SSR","cost":9,"m":{"k":"amp","v":0.172},"arch":"dmg"},{"id":"0136","n":"乐团指挥棒","spr":"item:71","r":"SR","cost":8,"m":{"k":"amp","v":0.1},"arch":"dmg"},{"id":"0137","n":"红宝石胸针","spr":"item:72","r":"N","cost":5,"m":{"k":"shcap","v":11},"arch":"thorns"},{"id":"0138","n":"诅咒石碑","spr":"item:73","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"vuln"},{"id":"0139","n":"亲爱的宝贝","spr":"item:74","r":"N","cost":6,"m":{"k":"cap","v":6},"arch":"gold"},{"id":"0140","n":"故人的怀表","spr":"item:75","r":"N","cost":6,"m":{"k":"cap","v":6},"arch":"haste"},{"id":"0141","n":"Destiny Spindle","spr":"item:76","r":"SSR","cost":8,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0142","n":"奉献精神","spr":"item:77","r":"N","cost":6,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0143","n":"银白差分机","spr":"item:78","r":"N","cost":5,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0144","n":"Dimension Pendulum-Alert","spr":"item:79","r":"SR","cost":7,"m":{"k":"cdmg","v":0.198},"arch":"crit"},{"id":"0145","n":"Dimension Pendulum-Confuse","spr":"item:80","r":"SR","cost":6,"m":{"k":"cap","v":10},"arch":"slow"},{"id":"0146","n":"Dimension Pendulum-Duel","spr":"item:81","r":"SR","cost":7,"m":{"k":"crit","v":0.054},"arch":"dmg"},{"id":"0147","n":"Dimension Pendulum-Lurk","spr":"item:82","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"shield"},{"id":"0148","n":"Dimension Pendulum-Scare","spr":"item:83","r":"SR","cost":6,"m":{"k":"crit","v":0.069},"arch":"vuln"},{"id":"0149","n":"Dimension Pendulum-Voodoo","spr":"item:84","r":"SR","cost":7,"m":{"k":"crit","v":0.069},"arch":"vuln"},{"id":"0150","n":"神母的庇护","spr":"item:85","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"shield"},{"id":"0151","n":"祂的神谕","spr":"item:86","r":"SSR","cost":10,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0152","n":"医生手提箱","spr":"item:87","r":"N","cost":5,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0153","n":"档案夹","spr":"item:88","r":"N","cost":5,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0154","n":"鸽羽扇","spr":"item:89","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0155","n":"彩蛋时间","spr":"item:90","r":"N","cost":5,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0156","n":"Echoes from Beyond","spr":"item:91","r":"SSR","cost":8,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0157","n":"古怪钩爪","spr":"item:92","r":"SR","cost":6,"m":{"k":"thorns","v":3},"arch":"thorns"},{"id":"0158","n":"蛊惑风铃","spr":"item:93","r":"SR","cost":6,"m":{"k":"amp","v":0.1},"arch":"poison"},{"id":"0159","n":"须臾的火","spr":"item:94","r":"N","cost":4,"m":{"k":"amp","v":0.07},"arch":"burn"},{"id":"0160","n":"科考团","spr":"item:95","r":"SR","cost":8,"m":{"k":"crit","v":0.069},"arch":"dmg"},{"id":"0161","n":"褪色照片","spr":"item:96","r":"N","cost":6,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0163","n":"节日祝福","spr":"item:97","r":"N","cost":5,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0164","n":"缠丝玛瑙","spr":"item:98","r":"N","cost":6,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0165","n":"终末科研手稿","spr":"item:99","r":"SSR","cost":8,"m":{"k":"amp","v":0.15},"arch":"aura"},{"id":"0166","n":"美丽瞬间","spr":"item:100","r":"N","cost":6,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0167","n":"异乡邮票夹","spr":"item:101","r":"N","cost":6,"m":{"k":"start","v":6},"arch":"gold"},{"id":"0168","n":"蒙尘缝纫机","spr":"item:102","r":"N","cost":6,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0169","n":"先贤断章","spr":"item:103","r":"N","cost":4,"m":{"k":"amp","v":0.081},"arch":"aura"},{"id":"0170","n":"被遗忘者之血","spr":"item:104","r":"N","cost":5,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0171","n":"「万象门扉α」","spr":"item:105","r":"SR","cost":6,"m":{"k":"crit","v":0.054},"arch":"dmg"},{"id":"0172","n":"沉重画框","spr":"item:106","r":"SSR","cost":9,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0173","n":"黄金向导","spr":"item:107","r":"N","cost":5,"m":{"k":"cap","v":7},"arch":"gold"},{"id":"0174","n":"金色梦乡","spr":"item:108","r":"N","cost":5,"m":{"k":"start","v":4},"arch":"gold"},{"id":"0175","n":"万象灵知秘仪","spr":"item:109","r":"SSR","cost":9,"m":{"k":"amp","v":0.135},"arch":"aura"},{"id":"0176","n":"守护之手","spr":"item:110","r":"N","cost":6,"m":{"k":"shcap","v":14},"arch":"shield"},{"id":"0177","n":"伊拉斯莫的指引","spr":"item:111","r":"SSR","cost":10,"m":{"k":"amp","v":0.172},"arch":"dmg"},{"id":"0178","n":"哈福德灵药","spr":"item:112","r":"N","cost":6,"m":{"k":"shcap","v":11},"arch":"heal"},{"id":"0179","n":"止血钳","spr":"item:113","r":"N","cost":6,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0180","n":"祭司权杖","spr":"item:114","r":"N","cost":5,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0181","n":"无上荣宠","spr":"item:115","r":"N","cost":6,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0182","n":"甜蜜墨水","spr":"item:116","r":"N","cost":4,"m":{"k":"shcap","v":12},"arch":"heal"},{"id":"0183","n":"超弦海渊制剂","spr":"item:117","r":"SSR","cost":9,"m":{"k":"shcap","v":23},"arch":"heal"},{"id":"0184","n":"超弦腐血制剂","spr":"item:118","r":"SSR","cost":9,"m":{"k":"amp","v":0.172},"arch":"poison"},{"id":"0185","n":"超弦怀表","spr":"item:119","r":"N","cost":5,"m":{"k":"cap","v":6},"arch":"haste"},{"id":"0186","n":"在夕光里","spr":"item:120","r":"N","cost":4,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0187","n":"逆向观赏","spr":"item:121","r":"SSR","cost":9,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0188","n":"重锁","spr":"item:122","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"slow"},{"id":"0189","n":"白鸦喙","spr":"item:123","r":"N","cost":6,"m":{"k":"cdmg","v":0.15},"arch":"str"},{"id":"0190","n":"翠玉拓印","spr":"item:124","r":"SR","cost":8,"m":{"k":"cap","v":10},"arch":"aura"},{"id":"0191","n":"快乐唱片","spr":"item:125","r":"SR","cost":8,"m":{"k":"amp","v":0.09},"arch":"dmg"},{"id":"0192","n":"万花筒","spr":"item:126","r":"N","cost":4,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0193","n":"求知读书轮","spr":"item:127","r":"SSR","cost":8,"m":{"k":"wcd","v":1},"arch":"haste"},{"id":"0194","n":"Lamp of Salvation","spr":"item:128","r":"SSR","cost":8,"m":{"k":"amp","v":0.15},"arch":"dmg"},{"id":"0195","n":"七鳃鳗之吻","spr":"item:129","r":"SR","cost":6,"m":{"k":"amp","v":0.1},"arch":"poison"},{"id":"0196","n":"桂叶袖扣","spr":"item:130","r":"N","cost":5,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0197","n":"螺湮的欢愉","spr":"item:131","r":"N","cost":6,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0198","n":"人工呼吸","spr":"item:132","r":"N","cost":4,"m":{"k":"shcap","v":14},"arch":"heal"},{"id":"0199","n":"文明之光","spr":"item:133","r":"N","cost":4,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0200","n":"Little N's Camera","spr":"item:134","r":"SR","cost":8,"m":{"k":"crit","v":0.069},"arch":"dmg"},{"id":"0203","n":"独行者之徽","spr":"item:135","r":"SR","cost":6,"m":{"k":"start","v":6},"arch":"gold"},{"id":"0204","n":"幸运兔脚","spr":"item:136","r":"N","cost":6,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0205","n":"幸运风衣","spr":"item:137","r":"SR","cost":7,"m":{"k":"regen","v":2},"arch":"shield"},{"id":"0206","n":"辉光沙漏","spr":"item:138","r":"N","cost":4,"m":{"k":"cap","v":6},"arch":"haste"},{"id":"0207","n":"恶童","spr":"item:139","r":"N","cost":6,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0208","n":"纯真玛丽","spr":"item:140","r":"SSR","cost":9,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0209","n":"Medal of Rescue","spr":"item:141","r":"SR","cost":6,"m":{"k":"crit","v":0.06},"arch":"dmg"},{"id":"0214","n":"「记忆」与「梦」","spr":"item:142","r":"SSR","cost":10,"m":{"k":"crit","v":0.09},"arch":"vuln"},{"id":"0215","n":"孟菲斯仪式镜","spr":"item:143","r":"SSR","cost":10,"m":{"k":"cdmg","v":0.368},"arch":"crit"},{"id":"0216","n":"意识铭刻","spr":"item:144","r":"SR","cost":7,"m":{"k":"crit","v":0.069},"arch":"dmg"},{"id":"0217","n":"群氓之歌","spr":"item:145","r":"SSR","cost":9,"m":{"k":"crit","v":0.09},"arch":"dmg"},{"id":"0218","n":"新式轮轴","spr":"item:146","r":"N","cost":5,"m":{"k":"cap","v":7},"arch":"haste"},{"id":"0219","n":"母亲造像","spr":"item:147","r":"N","cost":4,"m":{"k":"cap","v":5},"arch":"regen"},{"id":"0220","n":"失声唱机","spr":"item:148","r":"N","cost":4,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0221","n":"缄默手套","spr":"item:149","r":"N","cost":5,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0222","n":"弥萨格徽章","spr":"item:150","r":"N","cost":5,"m":{"k":"cap","v":7},"arch":"gold"},{"id":"0223","n":"无名附肢","spr":"item:151","r":"N","cost":6,"m":{"k":"cdmg","v":0.135},"arch":"str"},{"id":"0224","n":"刺荨麻背心","spr":"item:152","r":"N","cost":6,"m":{"k":"shcap","v":14},"arch":"thorns"},{"id":"0225","n":"神经毒素","spr":"item:153","r":"N","cost":6,"m":{"k":"amp","v":0.07},"arch":"poison"},{"id":"0226","n":"噩梦表象","spr":"item:154","r":"SR","cost":8,"m":{"k":"wcd","v":1},"arch":"haste"},{"id":"0227","n":"偏方骰子","spr":"item:155","r":"SR","cost":8,"m":{"k":"amp","v":0.1},"arch":"dmg"},{"id":"0228","n":"Ogai's Notes","spr":"item:156","r":"SSR","cost":10,"m":{"k":"amp","v":0.15},"arch":"dmg"},{"id":"0229","n":"厄运仪式鸟","spr":"item:157","r":"SR","cost":7,"m":{"k":"amp","v":0.09},"arch":"vuln"},{"id":"0230","n":"「全知之眼」","spr":"item:158","r":"SR","cost":6,"m":{"k":"cdmg","v":0.198},"arch":"crit"},{"id":"0231","n":"异种喉舌","spr":"item:159","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"regen"},{"id":"0232","n":"我们的家","spr":"item:160","r":"N","cost":4,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0233","n":"Pallid Egg","spr":"item:161","r":"SSR","cost":8,"m":{"k":"crit","v":0.09},"arch":"dmg"},{"id":"0234","n":"行道之骸","spr":"item:162","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"dmg"},{"id":"0235","n":"妙手空空","spr":"item:163","r":"N","cost":6,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0236","n":"瘟疫诊断书","spr":"item:164","r":"N","cost":6,"m":{"k":"amp","v":0.081},"arch":"poison"},{"id":"0237","n":"怀表镜","spr":"item:165","r":"N","cost":6,"m":{"k":"cdmg","v":0.172},"arch":"crit"},{"id":"0238","n":"普拉斯诺镜","spr":"item:166","r":"SSR","cost":8,"m":{"k":"cdmg","v":0.288},"arch":"crit"},{"id":"0239","n":"蝴蝶标本","spr":"item:167","r":"N","cost":5,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0240","n":"美学原理","spr":"item:168","r":"N","cost":5,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0241","n":"先知的许愿灯","spr":"item:169","r":"N","cost":4,"m":{"k":"amp","v":0.081},"arch":"burn"},{"id":"0242","n":"原型电池","spr":"item:170","r":"N","cost":4,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0243","n":"Psyche Analysis","spr":"item:171","r":"SSR","cost":10,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0244","n":"Pure Silver Core","spr":"item:172","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"dmg"},{"id":"0251","n":"普特尼晨报","spr":"item:173","r":"N","cost":4,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0252","n":"镭射颌骨","spr":"item:174","r":"N","cost":5,"m":{"k":"shcap","v":12},"arch":"thorns"},{"id":"0253","n":"过往的贡物","spr":"item:175","r":"N","cost":5,"m":{"k":"cap","v":7},"arch":"gold"},{"id":"0254","n":"莱茵德纸草书","spr":"item:176","r":"N","cost":5,"m":{"k":"cap","v":6},"arch":"aura"},{"id":"0255","n":"春之祭","spr":"item:177","r":"N","cost":4,"m":{"k":"cap","v":7},"arch":"regen"},{"id":"0256","n":"遗落的祭祀刀","spr":"item:178","r":"N","cost":5,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0257","n":"腐血海渊制剂","spr":"item:179","r":"SSR","cost":9,"m":{"k":"amp","v":0.135},"arch":"poison"},{"id":"0258","n":"锈蚀钢锯","spr":"item:180","r":"N","cost":5,"m":{"k":"thorns","v":2},"arch":"thorns"},{"id":"0259","n":"锈蚀柳叶刀","spr":"item:181","r":"N","cost":4,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0260","n":"苦痛圣腕","spr":"item:182","r":"SR","cost":7,"m":{"k":"cdmg","v":0.253},"arch":"str"},{"id":"0261","n":"安全出口","spr":"item:183","r":"N","cost":4,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0262","n":"水手哨","spr":"item:184","r":"N","cost":6,"m":{"k":"crit","v":0.046},"arch":"dmg"},{"id":"0263","n":"救济之肢","spr":"item:185","r":"SR","cost":6,"m":{"k":"regen","v":2},"arch":"heal"},{"id":"0264","n":"怪蛇残蜕","spr":"item:186","r":"N","cost":5,"m":{"k":"crit","v":0.046},"arch":"poison"},{"id":"0265","n":"Sparganum","spr":"item:187","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0266","n":"Shapeshifter's Invitation","spr":"item:188","r":"SSR","cost":9,"m":{"k":"crit","v":0.081},"arch":"dmg"},{"id":"0267","n":"变色拘束服","spr":"item:189","r":"N","cost":5,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0268","n":"通讯设备","spr":"item:190","r":"N","cost":6,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0269","n":"寂静序曲","spr":"item:191","r":"N","cost":6,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0270","n":"银色方扣缎带","spr":"item:192","r":"N","cost":4,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0271","n":"伶牙俐齿","spr":"item:193","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"str"},{"id":"0272","n":"人鱼泪珠","spr":"item:194","r":"N","cost":4,"m":{"k":"shcap","v":12},"arch":"heal"},{"id":"0273","n":"日月轮盘","spr":"item:195","r":"N","cost":6,"m":{"k":"cap","v":5},"arch":"haste"},{"id":"0274","n":"求救信号","spr":"item:196","r":"SSR","cost":8,"m":{"k":"amp","v":0.15},"arch":"dmg"},{"id":"0275","n":"神王的权能","spr":"item:197","r":"SR","cost":7,"m":{"k":"crit","v":0.06},"arch":"dmg"},{"id":"0276","n":"空间偏折仪","spr":"item:198","r":"N","cost":4,"m":{"k":"amp","v":0.07},"arch":"aura"},{"id":"0277","n":"替身玩偶","spr":"item:199","r":"SSR","cost":9,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0278","n":"群星之酒","spr":"item:200","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"heal"},{"id":"0279","n":"潜水头盔","spr":"item:201","r":"N","cost":5,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0280","n":"偶然谬误","spr":"item:202","r":"SSR","cost":9,"m":{"k":"amp","v":0.172},"arch":"dmg"},{"id":"0281","n":"虫群意识","spr":"item:203","r":"SR","cost":7,"m":{"k":"crit","v":0.069},"arch":"poison"},{"id":"0282","n":"The Futile Travail","spr":"item:204","r":"SSR","cost":9,"m":{"k":"crit","v":0.09},"arch":"dmg"},{"id":"0283","n":"失衡的天平","spr":"item:205","r":"N","cost":4,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0284","n":"Time Scarab","spr":"item:206","r":"N","cost":5,"m":{"k":"crit","v":0.04},"arch":"dmg"},{"id":"0285","n":"小小襁褓","spr":"item:207","r":"SSR","cost":8,"m":{"k":"regen","v":3},"arch":"shield"},{"id":"0286","n":"小八音盒","spr":"item:208","r":"N","cost":4,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0287","n":"诡术礼帽","spr":"item:209","r":"SR","cost":8,"m":{"k":"amp","v":0.1},"arch":"dmg"},{"id":"0288","n":"三棱镜","spr":"item:210","r":"N","cost":5,"m":{"k":"cdmg","v":0.15},"arch":"crit"},{"id":"0289","n":"定向罗盘","spr":"item:211","r":"N","cost":6,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0290","n":"知无不言","spr":"item:212","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0291","n":"双生人偶","spr":"item:213","r":"N","cost":4,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0292","n":"Twisted Palette","spr":"item:214","r":"SSR","cost":8,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0293","n":"超维戒指","spr":"item:215","r":"SSR","cost":8,"m":{"k":"amp","v":0.135},"arch":"aura"},{"id":"0294","n":"可疑的药膏","spr":"item:216","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"heal"},{"id":"0295","n":"统合衍化制剂","spr":"item:217","r":"SSR","cost":9,"m":{"k":"regen","v":3},"arch":"heal"},{"id":"0296","n":"无名之神的面纱","spr":"item:218","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0297","n":"视力矫正器","spr":"item:219","r":"N","cost":5,"m":{"k":"cdmg","v":0.172},"arch":"crit"},{"id":"0298","n":"活性注射器","spr":"item:220","r":"N","cost":6,"m":{"k":"regen","v":1},"arch":"heal"},{"id":"0299","n":"旅行阳伞","spr":"item:221","r":"N","cost":4,"m":{"k":"regen","v":1},"arch":"shield"},{"id":"0300","n":"哀嚎摇铃","spr":"item:222","r":"SR","cost":7,"m":{"k":"amp","v":0.115},"arch":"dmg"},{"id":"0301","n":"跃迁装置","spr":"item:223","r":"SSR","cost":9,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0302","n":"哭泣烟斗","spr":"item:224","r":"N","cost":6,"m":{"k":"amp","v":0.063},"arch":"vuln"},{"id":"0303","n":"Winner's Cup","spr":"item:225","r":"SSR","cost":10,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0304","n":"蠕动的脐带","spr":"item:226","r":"SR","cost":8,"m":{"k":"regen","v":2},"arch":"regen"},{"id":"0305","n":"小黄螺","spr":"item:227","r":"N","cost":6,"m":{"k":"amp","v":0.07},"arch":"dmg"},{"id":"0307","n":"☆应急食品☆","spr":"item:228","r":"N","cost":6,"m":{"k":"shcap","v":11},"arch":"heal"},{"id":"0308","n":"☆失落之美☆","spr":"item:229","r":"SSR","cost":9,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0309","n":"☆六分仪☆","spr":"item:230","r":"SSR","cost":9,"m":{"k":"amp","v":0.172},"arch":"aura"},{"id":"0310","n":"☆美好回忆☆","spr":"item:231","r":"SSR","cost":10,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0311","n":"☆逃生平面图☆","spr":"item:232","r":"N","cost":5,"m":{"k":"amp","v":0.063},"arch":"dmg"},{"id":"0312","n":"☆淑女小包☆","spr":"item:233","r":"N","cost":5,"m":{"k":"amp","v":0.081},"arch":"dmg"},{"id":"0313","n":"Armor of Whalebone","spr":"item:234","r":"SSR","cost":8,"m":{"k":"crit","v":0.09},"arch":"dmg"},{"id":"0315","n":"水晶球","spr":"item:235","r":"SSR","cost":9,"m":{"k":"amp","v":0.135},"arch":"dmg"},{"id":"0316","n":"Pistoles de Marie","spr":"item:236","r":"SSR","cost":10,"m":{"k":"amp","v":0.15},"arch":"dmg"},{"id":"0317","n":"☆枯竭的瞳孔☆","spr":"item:237","r":"N","cost":6,"m":{"k":"crit","v":0.04},"arch":"crit"},{"id":"0318","n":"☆镇痛药片☆","spr":"item:238","r":"N","cost":5,"m":{"k":"shcap","v":14},"arch":"heal"},{"id":"0319","n":"☆长生者血肉☆","spr":"item:239","r":"SR","cost":8,"m":{"k":"amp","v":0.1},"arch":"dmg"},{"id":"0320","n":"☆旧船锚☆","spr":"item:240","r":"N","cost":6,"m":{"k":"crit","v":0.036},"arch":"dmg"},{"id":"0321","n":"☆精制义眼☆","spr":"item:241","r":"N","cost":4,"m":{"k":"cdmg","v":0.15},"arch":"crit"},{"id":"0322","n":"☆噩梦魂灯☆","spr":"item:242","r":"SSR","cost":8,"m":{"k":"amp","v":0.172},"arch":"burn"},{"id":"0323","n":"☆商会勋章☆","spr":"item:243","r":"SSR","cost":8,"m":{"k":"start","v":12},"arch":"gold"},{"id":"0324","n":"Blackened Flame","spr":"item:244","r":"SSR","cost":10,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0325","n":"受诅的羽毛","spr":"item:245","r":"SSR","cost":8,"m":{"k":"amp","v":0.172},"arch":"vuln"},{"id":"0328","n":"Sheriff Badge","spr":"item:246","r":"SSR","cost":10,"m":{"k":"crit","v":0.103},"arch":"dmg"},{"id":"0329","n":"Ceremonial Spur","spr":"item:247","r":"SSR","cost":9,"m":{"k":"amp","v":0.172},"arch":"dmg"},{"id":"0001","n":"维度影像·「24」","spr":"item:248","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"「24」"},{"id":"0002","n":"维度影像·阿格里帕","spr":"item:249","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"阿格里帕"},{"id":"0003","n":"维度影像·艾继丝","spr":"item:250","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"艾继丝"},{"id":"0004","n":"维度影像·艾尔瓦","spr":"item:251","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"艾尔瓦"},{"id":"0005","n":"维度影像·奥瑞塔","spr":"item:252","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"奥瑞塔"},{"id":"0006","n":"维度影像·凯刻斯","spr":"item:253","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"凯刻斯"},{"id":"0007","n":"维度影像·卡茜亚","spr":"item:254","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"卡茜亚"},{"id":"0008","n":"维度影像·卡斯托尔","spr":"item:255","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"卡斯托尔"},{"id":"0009","n":"维度影像·希莱斯特","spr":"item:256","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"希莱斯特"},{"id":"0010","n":"维度影像·克莱门汀","spr":"item:257","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"克莱门汀"},{"id":"0011","n":"维度影像·克珀珊特","spr":"item:258","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"克珀珊特"},{"id":"0012","n":"维度影像·达芙黛尔","spr":"item:259","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"达芙黛尔"},{"id":"0013","n":"维度影像·朵尔","spr":"item:260","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"朵尔"},{"id":"0014","n":"维度影像·杜勒赛因","spr":"item:261","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"杜勒赛因"},{"id":"0015","n":"维度影像·艾瑞卡","spr":"item:262","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"艾瑞卡"},{"id":"0016","n":"维度影像·菲茵特","spr":"item:263","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"菲茵特"},{"id":"0017","n":"维度影像·法洛思","spr":"item:264","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"法洛思"},{"id":"0018","n":"维度影像·熔毁·朵尔","spr":"item:265","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"熔毁·朵尔"},{"id":"0019","n":"维度影像·血链·希洛","spr":"item:266","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"血链·希洛"},{"id":"0020","n":"维度影像·环行·拉蒙娜","spr":"item:267","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"环行·拉蒙娜"},{"id":"0021","n":"维度影像·戈利亚","spr":"item:268","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"戈利亚"},{"id":"0022","n":"维度影像·哈姆林","spr":"item:269","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"哈姆林"},{"id":"0023","n":"维度影像·希洛","spr":"item:270","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"希洛"},{"id":"0024","n":"维度影像·奥尔拉","spr":"item:271","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"奥尔拉"},{"id":"0025","n":"维度影像·詹金","spr":"item:272","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"詹金"},{"id":"0026","n":"维度影像·珈伦","spr":"item:273","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"珈伦"},{"id":"0027","n":"维度影像·凯蒂古拉","spr":"item:274","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"凯蒂古拉"},{"id":"0028","n":"维度影像·雷娅","spr":"item:275","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"雷娅"},{"id":"0029","n":"维度影像·莉莉","spr":"item:276","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"莉莉"},{"id":"0030","n":"维度影像·莉兹","spr":"item:277","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"莉兹"},{"id":"0031","n":"维度影像·萝坦","spr":"item:278","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"萝坦"},{"id":"0032","n":"维度影像·弥利亚姆","spr":"item:279","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"弥利亚姆"},{"id":"0033","n":"维度影像·茉夏","spr":"item:280","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"茉夏"},{"id":"0034","n":"维度影像·墨菲","spr":"item:281","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"墨菲"},{"id":"0035","n":"维度影像·诞妄·墨菲","spr":"item:282","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"诞妄·墨菲"},{"id":"0036","n":"维度影像·诺缔拉","spr":"item:283","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"诺缔拉"},{"id":"0037","n":"维度影像·宁菲亚","spr":"item:284","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"宁菲亚"},{"id":"0038","n":"维度影像·奥吉尔","spr":"item:285","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"奥吉尔"},{"id":"0039","n":"维度影像·潘狄娅","spr":"item:286","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"潘狄娅"},{"id":"0040","n":"维度影像·皮克曼","spr":"item:287","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"皮克曼"},{"id":"0041","n":"维度影像·波吕克斯","spr":"item:288","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"波吕克斯"},{"id":"0042","n":"维度影像·拉蒙娜","spr":"item:289","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"拉蒙娜"},{"id":"0043","n":"维度影像·莱克","spr":"item:290","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"莱克"},{"id":"0044","n":"维度影像·萨尔瓦多","spr":"item:291","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"萨尔瓦多"},{"id":"0045","n":"维度影像·珊","spr":"item:292","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"珊"},{"id":"0046","n":"维度影像·索蕾尔","spr":"item:293","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"索蕾尔"},{"id":"0047","n":"维度影像·塔薇","spr":"item:294","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"塔薇"},{"id":"0048","n":"维度影像·泰旖丝","spr":"item:295","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"泰旖丝"},{"id":"0049","n":"维度影像·汀克特","spr":"item:296","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"汀克特"},{"id":"0050","n":"维度影像·图鲁","spr":"item:297","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"图鲁"},{"id":"0051","n":"维度影像·尤乌哈希","spr":"item:298","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"尤乌哈希"},{"id":"0052","n":"维度影像·旺达","spr":"item:299","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"旺达"},{"id":"0053","n":"维度影像·温柯尔","spr":"item:300","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"温柯尔"},{"id":"0054","n":"维度影像·徐","spr":"item:301","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"徐"},{"id":"0055","n":"维度影像·莫丝","spr":"item:302","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"莫丝"},{"id":"0056","n":"维度影像·阿拉克涅","spr":"item:303","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"阿拉克涅"},{"id":"0057","n":"维度影像·沙耶","spr":"item:304","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"沙耶"},{"id":"0058","n":"维度影像·庞托斯","spr":"item:305","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"庞托斯"},{"id":"0306","n":"维度影像·蚀灭·萝坦","spr":"item:306","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"蚀灭·萝坦"},{"id":"0314","n":"维度影像·卡拉布","spr":"item:307","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"卡拉布"},{"id":"0326","n":"维度影像·负誓·奥吉尔","spr":"item:308","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"负誓·奥吉尔"},{"id":"0327","n":"维度影像·薇薇安","spr":"item:309","r":"FATE","cost":0,"m":{"k":"cap","v":6},"arch":"fate","fate":"薇薇安"}];

const WHEELS = [{"id":"0001","n":"慈悲的哺育","spr":"wheel:0","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0048"},{"id":"0002","n":"神言石板","spr":"wheel:1","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0044"},{"id":"0003","n":"冬夜追忆","spr":"wheel:2","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0003"},{"id":"0004","n":"以蔷薇之名","spr":"wheel:3","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0046"},{"id":"0005","n":"挣脱锁链之日","spr":"wheel:4","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0023"},{"id":"0006","n":"沉入殷红","spr":"wheel:5","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0019"},{"id":"0007","n":"苍白后裔","spr":"wheel:6","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0002"},{"id":"0008","n":"血肉狂宴","spr":"wheel:7","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0051"},{"id":"0009","n":"饕餮寓言","spr":"wheel:8","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0028"},{"id":"0010","n":"吞噬摇篮曲","spr":"wheel:9","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0016"},{"id":"0011","n":"安息之吻","spr":"wheel:10","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0014"},{"id":"0012","n":"写实主义悖谬","spr":"wheel:11","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0040"},{"id":"0013","n":"枉蹙眉","spr":"wheel:12","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0054"},{"id":"0014","n":"溯洄时计","spr":"wheel:13","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":19.9,"pierce":1}],"owner":"awakener-0042"},{"id":"0015","n":"超越死亡","spr":"wheel:14","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":19.0,"pierce":1}],"owner":"awakener-0013"},{"id":"0016","n":"坠入虚无的人偶","spr":"wheel:15","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":19.0,"pierce":1}],"owner":"awakener-0018"},{"id":"0017","n":"骑士之心","spr":"wheel:16","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":19.0,"pierce":1}],"owner":"awakener-0038"},{"id":"0018","n":"星天之兽","spr":"wheel:17","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":19.0,"pierce":1}],"owner":"awakener-0031"},{"id":"0019","n":"好运时间","spr":"wheel:18","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0043"},{"id":"0020","n":"畸体回噬","spr":"wheel:19","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0001"},{"id":"0021","n":"记忆螺旋","spr":"wheel:20","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0036"},{"id":"0022","n":"腐朽赠礼","spr":"wheel:21","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0037"},{"id":"0023","n":"欲海浮沉","spr":"wheel:22","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0039"},{"id":"0024","n":"跨越疼痛","spr":"wheel:23","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0029"},{"id":"0025","n":"坚韧意志","spr":"wheel:24","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0004"},{"id":"0026","n":"无声欢宴","spr":"wheel:25","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0026"},{"id":"0027","n":"隐世的转轮","spr":"wheel:26","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0047"},{"id":"0028","n":"琥珀色的死亡","spr":"wheel:27","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0027"},{"id":"0029","n":"狂戮至世界尽头","spr":"wheel:28","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0033"},{"id":"0030","n":"旋转，旋转","spr":"wheel:29","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":"awakener-0030"},{"id":"0031","n":"至为珍贵的藏品","spr":"wheel:30","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":"awakener-0012"},{"id":"0032","n":"被缚的歌谣","spr":"wheel:31","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":6.7,"hits":3}],"owner":"awakener-0049"},{"id":"0033","n":"女王的戒律","spr":"wheel:32","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":"awakener-0052"},{"id":"0034","n":"无法完成的演算","spr":"wheel:33","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0053"},{"id":"0035","n":"诗笺的句尾","spr":"wheel:34","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":"awakener-0024"},{"id":"0036","n":"迷失的道路","spr":"wheel:35","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0025"},{"id":"0037","n":"核心熔解","spr":"wheel:36","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":7.0,"hits":3}],"owner":"awakener-0015"},{"id":"0038","n":"快乐魔法秀","spr":"wheel:37","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0007"},{"id":"0039","n":"不可承受的自由","spr":"wheel:38","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0008"},{"id":"0040","n":"永恒安魂曲","spr":"wheel:39","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0022"},{"id":"0041","n":"隐没的痛楚","spr":"wheel:40","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0010"},{"id":"0042","n":"扭曲的骑士诗","spr":"wheel:41","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":"awakener-0041"},{"id":"0043","n":"搭档特训","spr":"wheel:42","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0044","n":"开学日","spr":"wheel:43","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0045","n":"盒中童趣","spr":"wheel:44","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0046","n":"倒数时刻","spr":"wheel:45","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0047","n":"豪赌的智慧","spr":"wheel:46","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0048","n":"未送出的花","spr":"wheel:47","r":"N","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":10,"wcd":4,"op":[{"k":"dmg","v":3.3,"hits":3}],"owner":null},{"id":"0049","n":"踏过泥泞的玫瑰","spr":"wheel:48","r":"N","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0050","n":"神王的颂歌","spr":"wheel:49","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0050"},{"id":"0051","n":"隐秘的诞生","spr":"wheel:50","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0034"},{"id":"0052","n":"于暴雨之中","spr":"wheel:51","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0017"},{"id":"0053","n":"伤痛之鳍","spr":"wheel:52","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0006"},{"id":"0054","n":"海之梦","spr":"wheel:53","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0005"},{"id":"0055","n":"巨人之刃","spr":"wheel:54","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0021"},{"id":"0056","n":"虔诚的伟力","spr":"wheel:55","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0032"},{"id":"0057","n":"珊瑚女之死","spr":"wheel:56","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0045"},{"id":"0058","n":"引舵之帆","spr":"wheel:57","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0009"},{"id":"0059","n":"圣火中的指引","spr":"wheel:58","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0011"},{"id":"0060","n":"渺远的伊甸园","spr":"wheel:59","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0055"},{"id":"0061","n":"暴食","spr":"wheel:60","r":"R","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":3,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":6.0,"hits":2}],"owner":null},{"id":"0062","n":"狂乱","spr":"wheel:61","r":"R","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":4.0,"hits":3}],"owner":null},{"id":"0063","n":"宠爱","spr":"wheel:62","r":"R","main":"CRIT_RATE","mainZh":"暴击率","v":0.04,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0064","n":"涌现","spr":"wheel:63","r":"R","main":"SIGIL_YIELD","mainZh":"印记收益","v":2.0,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0065","n":"谵妄","spr":"wheel:64","r":"R","main":"DMG_AMP","mainZh":"伤害加成","v":0.03,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":6.0,"hits":2}],"owner":null},{"id":"0066","n":"呢喃","spr":"wheel:65","r":"R","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":7,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0067","n":"希冀","spr":"wheel:66","r":"R","main":"CRIT_RATE","mainZh":"暴击率","v":0.04,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0068","n":"明悟","spr":"wheel:67","r":"R","main":"REALM_MASTERY","mainZh":"领域精通","v":1,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":4.0,"hits":3}],"owner":null},{"id":"0069","n":"惩戒","spr":"wheel:68","r":"R","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":7,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":6.0,"hits":2}],"owner":null},{"id":"0070","n":"眷顾","spr":"wheel:69","r":"R","main":"DMG_AMP","mainZh":"伤害加成","v":0.03,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0071","n":"活性","spr":"wheel:70","r":"R","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":6.0,"hits":2}],"owner":null},{"id":"0072","n":"放逐","spr":"wheel:71","r":"R","main":"REALM_MASTERY","mainZh":"领域精通","v":1,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0073","n":"吮吸","spr":"wheel:72","r":"R","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.18,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0074","n":"熟成","spr":"wheel:73","r":"R","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.18,"realm":"NEUTRAL","perk":null,"cost":4,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":4.0,"hits":3}],"owner":null},{"id":"0076","n":"洞悉","spr":"wheel:74","r":"R","main":"SIGIL_YIELD","mainZh":"印记收益","v":2.0,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":11,"wcd":4,"op":[{"k":"dmg","v":5.5,"hits":2}],"owner":null},{"id":"0077","n":"职责所在","spr":"wheel:75","r":"SR","main":"REALM_MASTERY","mainZh":"领域精通","v":2.2,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":null},{"id":"0078","n":"专注精神","spr":"wheel:76","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":null},{"id":"0079","n":"苦咒缚","spr":"wheel:77","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":null},{"id":"0080","n":"切割与伤害","spr":"wheel:78","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":null},{"id":"0081","n":"伏于夜色","spr":"wheel:79","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":null},{"id":"0082","n":"冒险的行囊","spr":"wheel:80","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":null},{"id":"0083","n":"死亡的剖析","spr":"wheel:81","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":null},{"id":"0084","n":"致挚友","spr":"wheel:82","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":null},{"id":"0085","n":"记忆症候","spr":"wheel:83","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":null},{"id":"0086","n":"心之壁垒","spr":"wheel:84","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":null},{"id":"0087","n":"临界点","spr":"wheel:85","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":null},{"id":"0088","n":"勋爵手杖","spr":"wheel:86","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":null},{"id":"0089","n":"信息就是生命","spr":"wheel:87","r":"SR","main":"REALM_MASTERY","mainZh":"领域精通","v":2.2,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":null},{"id":"0090","n":"聚首时刻","spr":"wheel:88","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":null},{"id":"0091","n":"不存在之地","spr":"wheel:89","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":null},{"id":"0092","n":"遗忘之手","spr":"wheel:90","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":null},{"id":"0093","n":"35mm的魔法","spr":"wheel:91","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0029"},{"id":"0094","n":"伊萨拉乌的目光","spr":"wheel:92","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0052"},{"id":"0095","n":"镜中人","spr":"wheel:93","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0044"},{"id":"0096","n":"银鳕鱼的决心","spr":"wheel:94","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0001"},{"id":"0097","n":"待到雪山消融","spr":"wheel:95","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0019"},{"id":"0098","n":"深海的呼唤","spr":"wheel:96","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0032"},{"id":"0099","n":"灼热的吻别","spr":"wheel:97","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":"awakener-0048"},{"id":"0100","n":"往昔的花与诗","spr":"wheel:98","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":"awakener-0024"},{"id":"0101","n":"百万蒙宠之眼","spr":"wheel:99","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0046"},{"id":"0102","n":"冰川下的沉眠","spr":"wheel:100","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0034"},{"id":"0103","n":"命运轮盘赌","spr":"wheel:101","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0043"},{"id":"0104","n":"真理之门","spr":"wheel:102","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0047"},{"id":"0105","n":"永不停歇的演奏","spr":"wheel:103","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0022"},{"id":"0106","n":"牧羊人的手杖","spr":"wheel:104","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0018"},{"id":"0107","n":"青石王座","spr":"wheel:105","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0050"},{"id":"0109","n":"珍馐","spr":"wheel:106","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0014"},{"id":"0110","n":"魔女宽檐帽","spr":"wheel:107","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0012"},{"id":"0111","n":"蓝环毒素","spr":"wheel:108","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0035"},{"id":"0112","n":"孤羽","spr":"wheel:109","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0008"},{"id":"0113","n":"圣子尊容","spr":"wheel:110","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0041"},{"id":"0114","n":"海上领航者","spr":"wheel:111","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0011"},{"id":"0115","n":"渴求的画笔","spr":"wheel:112","r":"SR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":6,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0040"},{"id":"0116","n":"迫近的太阳","spr":"wheel:113","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0027"},{"id":"0117","n":"理智明灯","spr":"wheel:114","r":"SR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":14,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0033"},{"id":"0118","n":"玉兰之饵","spr":"wheel:115","r":"SR","main":"DMG_AMP","mainZh":"伤害加成","v":0.06,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0054"},{"id":"0119","n":"被囚禁的疯狂","spr":"wheel:116","r":"SR","main":"REALM_MASTERY","mainZh":"领域精通","v":2.2,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0055"},{"id":"0120","n":"阿库特之春","spr":"wheel:117","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":7.0,"hits":3}],"owner":null},{"id":"0121","n":"陨日","spr":"wheel:118","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0122","n":"灵魂诞生","spr":"wheel:119","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0123","n":"极夜与破晓","spr":"wheel:120","r":"SSR","main":"DEATH_RESISTANCE","mainZh":"死亡抗性","v":18,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":6.7,"hits":3}],"owner":null},{"id":"0124","n":"纯银的初心","spr":"wheel:121","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0125","n":"重生于湮土","spr":"wheel:122","r":"SSR","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":8,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0126","n":"你我终将重逢","spr":"wheel:123","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":7.0,"hits":3}],"owner":null},{"id":"0128","n":"永世编织之网","spr":"wheel:124","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"ULTRA","perk":{"k":"crit","v":0.02,"txt":"超维：暴击率 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":6.7,"hits":3}],"owner":"awakener-0056"},{"id":"0130","n":"私密午歇时间","spr":"wheel:125","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0131","n":"黑暗中的安眠","spr":"wheel:126","r":"SSR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":2,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.8},{"k":"shield","v":8}],"owner":"awakener-0035"},{"id":"0132","n":"宿命纺轮","spr":"wheel:127","r":"SR","main":"REALM_MASTERY","mainZh":"领域精通","v":2.2,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":"awakener-0056"},{"id":"0136","n":"贪婪","spr":"wheel:128","r":"R","main":"ALIEMUS_REGEN","mainZh":"阿利穆斯回响","v":3,"realm":"NEUTRAL","perk":null,"cost":5,"cpu":12,"wcd":4,"op":[{"k":"dmg","v":6.0,"hits":2}],"owner":null},{"id":"0137","n":"催眠灵摆","spr":"wheel:129","r":"SR","main":"KEYFLARE_REGEN","mainZh":"钥焰回生","v":1,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":8.0,"hits":2}],"owner":"awakener-0010"},{"id":"0165","n":"樱花下的迷思","spr":"wheel:130","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0166","n":"致群星","spr":"wheel:131","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null},{"id":"0167","n":"愿世界化作芬芳","spr":"wheel:132","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":14.4},{"k":"poison","v":3.6}],"owner":"awakener-0057"},{"id":"0168","n":"淤泥里的童话","spr":"wheel:133","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":5.7,"hits":3}],"owner":"awakener-0057"},{"id":"0169","n":"指向歧路的罗盘","spr":"wheel:134","r":"SR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.35,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0058"},{"id":"0170","n":"梦游仙境","spr":"wheel:135","r":"SSR","main":"DMG_AMP","mainZh":"伤害加成","v":0.08,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":7.0,"hits":3}],"owner":"awakener-0029"},{"id":"0171","n":"活囚笼","spr":"wheel:136","r":"SSR","main":"CRIT_DMG","mainZh":"暴击伤害","v":0.45,"realm":"AEQUOR","perk":{"k":"shield","v":5,"txt":"深海：开战获得 5 点护盾"},"cost":7,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":15.0},{"k":"shield","v":8}],"owner":"awakener-0058"},{"id":"0172","n":"天之陨","spr":"wheel:137","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":22.1}],"owner":"awakener-0059"},{"id":"0173","n":"不灭的饥骨","spr":"wheel:138","r":"SR","main":"SIGIL_YIELD","mainZh":"印记收益","v":4.0,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0059"},{"id":"0174","n":"向上坠落","spr":"wheel:139","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":7.0,"hits":3}],"owner":null},{"id":"0175","n":"蜜果的谎言","spr":"wheel:140","r":"SSR","main":"REALM_MASTERY","mainZh":"领域精通","v":3,"realm":"CARO","perk":{"k":"poison","v":0.2,"txt":"血肉：中毒 +20%"},"cost":8,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":15.1},{"k":"poison","v":3.8}],"owner":"awakener-0060"},{"id":"0176","n":"恬美真相","spr":"wheel:141","r":"SR","main":"REALM_MASTERY","mainZh":"领域精通","v":2.2,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":16,"wcd":5,"op":[{"k":"dmg","v":5.3,"hits":3}],"owner":"awakener-0060"},{"id":"0177","n":"魂灵同调","spr":"wheel:142","r":"SSR","main":"SIGIL_YIELD","mainZh":"印记收益","v":5.0,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0178","n":"向阳而生","spr":"wheel:143","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0061"},{"id":"0179","n":"往日如影随形","spr":"wheel:144","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0061"},{"id":"0180","n":"从黑暗到黑暗","spr":"wheel:145","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"NEUTRAL","perk":null,"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":10.0,"hits":2}],"owner":null},{"id":"0181","n":"先知的难题","spr":"wheel:146","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"CHAOS","perk":{"k":"amp","v":0.02,"txt":"混沌：命轮伤害 +2%"},"cost":8,"cpu":20,"wcd":5,"op":[{"k":"dmg","v":21.0}],"owner":"awakener-0062"},{"id":"0182","n":"她和她的树洞","spr":"wheel:147","r":"SR","main":"CRIT_RATE","mainZh":"暴击率","v":0.07,"realm":"NEUTRAL","perk":null,"cost":6,"cpu":17,"wcd":5,"op":[{"k":"dmg","v":8.5,"hits":2}],"owner":"awakener-0062"},{"id":"0183","n":"伊玛戈的诊室","spr":"wheel:148","r":"SSR","main":"CRIT_RATE","mainZh":"暴击率","v":0.09,"realm":"NEUTRAL","perk":null,"cost":7,"cpu":21,"wcd":5,"op":[{"k":"dmg","v":10.5,"hits":2}],"owner":null}];

const PACTS = [{"id":"0001","n":"机械降神","spr":"item:310","k":"cddown","v":1,"txt":"所有命轮的出手节拍 -1 拍（最低 3 拍）。"},{"id":"0002","n":"再衍化","spr":"item:311","k":"dupfirst","v":1,"txt":"每场第一次开火的命轮，再打一发。"},{"id":"0003","n":"猩红之拥","spr":"item:312","k":"openshield","v":20,"txt":"每场战斗开始获得 20 点护盾。"},{"id":"0004","n":"猩红之悸","spr":"item:313","k":"lowleech","v":0.35,"txt":"生命低于一半时，造成的伤害 35% 转化为生命。"},{"id":"0005","n":"扭曲双子·黑","spr":"item:314","k":"glass","v":0.18,"txt":"命轮伤害 +18%，但生命上限 -12。"},{"id":"0006","n":"埋骨地絮语","spr":"item:315","k":"save","v":45,"txt":"每场战斗第一次生命归零时，留下 1 点并回复 45 点。"},{"id":"0007","n":"扭曲双子·白","spr":"item:316","k":"bulwark2","v":40,"txt":"护盾上限 +40，每场开战自带 15 点护盾。"},{"id":"0008","n":"诅咒兔","spr":"item:317","k":"discount","v":0.2,"txt":"集市所有标价 -20%。"},{"id":"0009","n":"二律背反","spr":"item:318","k":"firstcrit","v":1,"txt":"每场第一发命轮必定暴击，且伤害翻倍。"},{"id":"0010","n":"光合祭礼","spr":"item:319","k":"grow","v":8,"txt":"每赢一场，生命上限 +8。"},{"id":"0011","n":"海归线","spr":"item:320","k":"weaken","v":0.1,"txt":"敌方生命上限 -10%。"},{"id":"0012","n":"36室之环","spr":"item:321","k":"freereroll","v":1,"txt":"每天第一次刷新不花金币。"},{"id":"0013","n":"生机榨取","spr":"item:322","k":"leech","v":0.15,"txt":"造成伤害的 15% 转化为生命。"},{"id":"0014","n":"四月礼赞","spr":"item:323","k":"headstart","v":8,"txt":"开战时算力 +8。"},{"id":"0015","n":"有机形态","spr":"item:324","k":"tank","v":30,"txt":"生命上限 +30，但每场收入 -15%。"},{"id":"0016","n":"甜蜜蛞蝓","spr":"item:325","k":"greed","v":0.15,"txt":"标价 +15%，但命轮伤害 +20%。"},{"id":"0017","n":"入药之梦","spr":"item:326","k":"venom","v":0.8,"txt":"中毒伤害 +80%，每次施加中毒额外 +1 层。"},{"id":"0018","n":"远方的欢宴","spr":"item:327","k":"feast","v":7,"txt":"每赢一场，回复 7 点生命上限的伤。"},{"id":"0019","n":"无垢启示录","spr":"item:328","k":"fear","v":0.12,"txt":"敌方每次伤害 -12%。"},{"id":"0020","n":"荒原狼","spr":"item:329","k":"wolf","v":0.22,"txt":"命轮伤害 +22%，但护盾上限 -30。"},{"id":"0021","n":"少女之蛹","spr":"item:330","k":"rich","v":8,"txt":"开局多 8 金币，第一天集市 +1 个摊位。"}];

const FOES = [{"id":"13950","n":"提灯教牧","spr":"mon:0","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"提灯教会内负责传递提灯旨意的教牧，指挥各堂教众在融蚀区域活动。","skills":[{"n":"出血","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1},{"k":"poison","v":3.6}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13951","n":"「海伦」","spr":"mon:1","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":25.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":11.0,"hits":1}]}]},{"id":"13952","n":"「破链者」","spr":"mon:2","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"迅捷如风的唤醒体杀手，自称希洛。她和莉莉之间似乎有什么微妙的联系……","skills":[{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"13953","n":"失控萝坦","spr":"mon:3","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"被融蚀激发的萝坦，陷入癫狂的战斗欲望中。","skills":[{"n":"桀骜之刃","cd":3,"op":[{"k":"dmg","v":7.0,"hits":3}]},{"n":"恣睢之浪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"13954","n":"创痛疯马","spr":"mon:4","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"满身是融蚀创口的疯马。体型较大，生命力顽强，但融蚀创口也使其更容易受伤。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":40.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"垂死之挣","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"13955","n":"疯狂碎石工","spr":"mon:5","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"他也曾有过家人，现在却只剩下癫狂。会使用重击，攻击能使其退缩。","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"13956","n":"「守灯人」","spr":"mon:6","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。","skills":[{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"出血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13957","n":"融蚀人型","spr":"mon:7","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的人类，形貌凄惨。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"13958","n":"「劳伦斯先生」","spr":"mon:8","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"他早已被繁重的任务压弯了背脊。工作、工作、工作——这就是他现在的生活！","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"强力强化","cd":4,"op":[{"k":"str","v":2.0}]},{"n":"撕裂打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]}]},{"id":"13959","n":"莉莉","spr":"mon:9","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"因怪异的低语声而陷入疯狂的少女莉莉。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"报偿打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13960","n":"「替代品」","spr":"mon:10","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"小乔治的无数个前身之一。再悉心的保存也经不住长期磨损。","skills":[{"n":"召唤和强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"13961","n":"「嘉尔姆？」","spr":"mon:11","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"游离的维度碎片拼合而成的异兽，与祂的战利品和谐相处。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":5.6}]}]},{"id":"13962","n":"融蚀野犬","spr":"mon:12","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"身上满是融蚀痕的流浪犬，它的攻击迅猛而连续。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"连续撕咬","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13963","n":"大裙摆","spr":"mon:13","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"身着过气礼装的傲慢淑女，千万别给她看最新款的穿搭杂志。","skills":[{"n":"隆重的接待","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]}]},{"id":"13964","n":"「波纳佩颂歌」","spr":"mon:14","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"深受主祭信任的高级祭者，祂们匍匐主祭足边，对她俯首称臣。","skills":[{"n":"群蛇撕裂","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"迟滞入骨","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":6.4},{"k":"dmg","v":6.4}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"13965","n":"双生脓疱","spr":"mon:15","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"双生的命运纠缠于一体，相互牵扯，相互裹挟，无处可逃。","skills":[{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"捶打","cd":4,"op":[{"k":"dmg","v":13.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":64.0},{"k":"dmg","v":5.6}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":4.8}]}]},{"id":"13966","n":"吞噬之吠","spr":"mon:16","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"因融蚀加深而变得狂躁的流浪犬，它的攻击迅猛而连续，让人难以招架。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"连续撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":4,"op":[{"k":"str","v":1.0}]}]},{"id":"13967","n":"「永恒助祭」","spr":"mon:17","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"永恒之国的低级祭司，在得到主祭首肯前，祂们不被允许踏入神殿。","skills":[{"n":"噬咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"迟缓迷毒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":6.4}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"13969","n":"蜡像绅士","spr":"mon:18","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"垂头丧气的新派绅士，厌恶一切柔软的东西，包括他自己。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"13970","n":"提灯教众","spr":"mon:19","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。","skills":[{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"出血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13971","n":"「斯特里戈伊之心？」","spr":"mon:20","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"祂被认为拥有两颗共同搏动的心脏，但无人知晓刺穿其中一颗的结果。","skills":[{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"捶打","cd":4,"op":[{"k":"dmg","v":13.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":64.0},{"k":"dmg","v":5.6}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":3}]}]},{"id":"13972","n":"「垂死嘶鸣」","spr":"mon:21","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"满身是融蚀创口的疯马。体型较大，生命力顽强，但融蚀创口也使其更容易受伤。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":40.0},{"k":"dmg","v":8.0}]},{"n":"践踏","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"垂死之挣","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"13973","n":"「聆听启示」","spr":"mon:22","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"怀揣执念渴望启示的改造人。会呼唤信徒并对其强化。","skills":[{"n":"分裂打击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"全体强化","cd":4,"op":[{"k":"shield","v":3.2}]}]},{"id":"13974","n":"协作型融蚀体","spr":"mon:23","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀浆中诞生的小型怪物，威胁性较低。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":4.0}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13975","n":"协作型融蚀体","spr":"mon:24","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀浆中诞生的小型怪物，威胁性较低。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":4.0}]}]},{"id":"13976","n":"「万物寂灭」","spr":"mon:25","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"融蚀浆平等地赐予万物死亡。万物寂灭合一。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":4}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"13977","n":"第▼▼号奴隶","spr":"mon:26","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"潘狄娅钟爱的奴隶猫之一。她的奴隶不分种族与信仰，只有一个标准：足够可爱。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":3}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"13978","n":"手术医生","spr":"mon:27","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"医生的刀刃本应切除伤病，他们却用其带来疼痛。攻击力很高的个体。","skills":[{"n":"手术准备","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"手术切割","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"全体力量","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"13979","n":"诊疗医生","spr":"mon:28","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"他们的诊断即是你的死亡。会保护其他友方的个体。","skills":[{"n":"毒素","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"防御","cd":3,"op":[{"k":"shield","v":16.0}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]}]},{"id":"13980","n":"暴走猎颅者","spr":"mon:29","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"滑滑的、黏黏的。头颅们温暖的家。","skills":[{"n":"裂颅一击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"割喉挥砍","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"隐匿突袭","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":4.8}]}]},{"id":"13981","n":"「镇痛剂」","spr":"mon:30","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"深呼吸，数到十，疼痛很快会消失。会保护其他友方的个体。","skills":[{"n":"毒素","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":20.0},{"k":"dmg","v":4.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"13984","n":"融蚀人型","spr":"mon:31","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的人类，形貌凄惨。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"13985","n":"蜡像淑女","spr":"mon:32","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"恪守礼仪的老派淑女，即使成为蜡像也不会错过每日下午茶。","skills":[{"n":"蜡像登场","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"隆重的接待","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]}]},{"id":"13986","n":"「以眼还眼」","spr":"mon:33","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"群聚在地下的蜡像弃儿。时刻准备着，为罗杰斯大人的艺术献出一切！","skills":[{"n":"召唤和强化","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"13987","n":"「求诸己身」","spr":"mon:34","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"雕塑家协会的改造产物，受过洗脑而充满信念，越战越勇。","skills":[{"n":"狂气吸收","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"远古的呼唤","cd":4,"op":[{"k":"str","v":0.5}]}]},{"id":"13988","n":"奔袭之足","spr":"mon:35","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"自其他维度撕裂缝隙而来的追逐之足，捕捉每个冒失的灵魂。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"追猎","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]}]},{"id":"13990","n":"固守之执妄","spr":"mon:36","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"怀揣执念固守于此的改造人。会呼唤自己的信徒并对其强化。","skills":[{"n":"分裂打击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":20.0},{"k":"dmg","v":8.8}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"全体强化","cd":4,"op":[{"k":"shield","v":16.0}]}]},{"id":"13991","n":"裁缝","spr":"mon:37","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"裁缝被融蚀侵蚀了理智，剪刀剪开的不再是布料，而是血肉。攻击频率较高。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"13992","n":"碎石工","spr":"mon:38","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"碎石工被融蚀侵蚀了理智，手里的铁镐成了伤人的利器。会积蓄力！量，在第三回合使用超重击。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":64.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"13993","n":"融蚀鼠王","spr":"mon:39","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"13994","n":"「渴血患者」","spr":"mon:40","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"隐匿在角落的苍白少女，似乎对鲜血情有独钟……？","skills":[{"n":"苦痛","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"欢愉","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"血","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"13996","n":"萝坦","spr":"mon:41","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"旅途无聊的萝坦，陷入癫狂的战斗欲望中。","skills":[{"n":"桀骜之刃","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"恣睢之浪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"13997","n":"「艾米丽」","spr":"mon:42","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":25.0,"hits":1}]}]},{"id":"13998","n":"复合型融蚀体","spr":"mon:43","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"大量融蚀浆聚合成的异变体，生命较低时会分裂。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"维度雾气","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"13999","n":"蹈海者","spr":"mon:44","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"忠仆，孝子，虔信者。你可以用任何代表忠诚的词汇形容他们。","skills":[{"n":"猎物标记","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"虚弱一击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"猎矛突刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"刺击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"14000","n":"「手术利刃」","spr":"mon:45","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"躺下来，放轻松，医生将为你切除所有烦恼。攻击力很高的个体。","skills":[{"n":"手术准备","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"全体力量","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14001","n":"「窜行者」詹金","spr":"mon:46","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她神出鬼没，对东区的每一个街巷都了若指掌，她就是「窜行者」。","skills":[{"n":"致伤打击","cd":4,"op":[{"k":"dmg","v":10.0,"hits":3}]},{"n":"鼠群冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"布朗出动！","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14002","n":"「潘狄娅」","spr":"mon:47","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"擅长调教的活泼少女。已经拥有102个奴隶，正在寻觅命中注定的下一位。","skills":[{"n":"施与受","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"灼燃蜡滴之欲","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"14003","n":"先锋艺术","spr":"mon:48","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"将蜡像与融蚀结合的艺术。曾在西岱博览会展出，因引起巨大恐慌而被撤回。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14007","n":"提灯","spr":"mon:49","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"提灯教会象征物的具象化。请勿追究其灵知的来源。","skills":[{"n":"出血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]}]},{"id":"14008","n":"「镇痛剂」","spr":"mon:50","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"深呼吸，数到十，疼痛很快会消失。会保护其他友方的个体。","skills":[{"n":"毒素","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":20.0},{"k":"dmg","v":4.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14009","n":"自爆脓疱","spr":"mon:51","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"眼球状的黑色脓泡怪物，总感觉要爆裂开来。","skills":[{"n":"BOOM！","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14010","n":"「灯芯侍者」","spr":"mon:52","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"提灯教会内负责传递提灯旨意的教牧，指挥各堂教众在融蚀区域活动。","skills":[{"n":"出血","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1},{"k":"poison","v":3.6}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14011","n":"「石之眼」","spr":"mon:53","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"为了希望守护的人，她也可以变得坚强。请确保有足够的算力来应对其凝滞诅咒。","skills":[{"n":"凝滞诅咒","cd":4,"op":[{"k":"dmg","v":6.5,"hits":2}]},{"n":"小小愿望","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14012","n":"反叛宿命之子","spr":"mon:54","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"祂曾抗拒被奴役的命运。","skills":[{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"捶打","cd":4,"op":[{"k":"dmg","v":13.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":64.0},{"k":"dmg","v":5.6}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":4.8}]}]},{"id":"14013","n":"「手术利刃」","spr":"mon:55","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"躺下来，放轻松，医生将为你切除所有烦恼。攻击力很高的个体。","skills":[{"n":"手术准备","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"全体力量","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14014","n":"猎犬之足","spr":"mon:56","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"自其他维度撕裂缝隙而来的追逐之足，捕捉每个冒失的灵魂。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"追猎","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]}]},{"id":"14015","n":"撕裂维度之足","spr":"mon:57","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"自其他维度撕裂缝隙而来的追逐之足，捕捉每个冒失的灵魂。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"追猎","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]}]},{"id":"14016","n":"无垢之孔","spr":"mon:58","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14017","n":"「鲸跃」","spr":"mon:59","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"旅途无聊的萝坦，陷入癫狂的战斗欲望中。当心其觉醒后的不竭战意，能够每回合移除多层虚弱和易伤状态。","skills":[{"n":"桀骜之刃","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"恣睢之浪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14018","n":"无垢之孔","spr":"mon:60","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14019","n":"无垢之孔","spr":"mon:61","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14020","n":"无垢之孔","spr":"mon:62","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14021","n":"无垢之孔","spr":"mon:63","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14022","n":"虔心教众","spr":"mon:64","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。","skills":[{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"出血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14023","n":"超脱之俯仰","spr":"mon:65","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"雕塑家协会的改造产物，受过洗脑而充满信念，越战越勇。","skills":[{"n":"狂气吸收","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"远古的呼唤","cd":4,"op":[{"k":"str","v":0.5}]}]},{"id":"14025","n":"俯仰者","spr":"mon:66","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"雕塑家协会的改造产物，受过洗脑而充满信念，越战越勇。","skills":[{"n":"远古的呼唤","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14026","n":"宣言者","spr":"mon:67","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"雕塑家协会的改造产物，受过洗脑而充满信念，越战越勇。","skills":[{"n":"远古的呼唤","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14027","n":"希洛","spr":"mon:68","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"迅捷如风的唤醒体杀手，自称希洛。她和莉莉之间似乎有什么微妙的联系……","skills":[{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14030","n":"无垢之孔","spr":"mon:69","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆与蜡像的结合体，心地善良，不可直视。生命力很低的时候会分裂。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14031","n":"艾继丝","spr":"mon:70","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"为了希望守护的人，她也可以变得坚强。","skills":[{"n":"凝滞诅咒","cd":4,"op":[{"k":"dmg","v":6.5,"hits":2}]},{"n":"小小愿望","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"石质分解","cd":4,"op":[{"k":"dmg","v":10.0,"hits":2}]}]},{"id":"14032","n":"「维度之孔」","spr":"mon:71","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆聚合成的异变体，生命较低时会分裂。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"维度雾气","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14033","n":"「终末泥淖」","spr":"mon:72","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"融蚀浆平等地赐予万物终点。我们终为一体。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14034","n":"快步跑","spr":"mon:73","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"身手敏捷的东区街童。开场就会展开迅捷的攻击。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"削弱","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14035","n":"大力气","spr":"mon:74","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"强壮有力的东区街童。攻击能够削弱敌方，并会展开护盾保护自己。","skills":[{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14036","n":"孩子王","spr":"mon:75","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"身经百战的孩子王。手里的酒瓶会造成伤口。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14037","n":"「甜蜜恶鬼」","spr":"mon:76","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"擅长调教的活泼少女。已经拥有102个奴隶，正在寻觅命中注定的下一位。","skills":[{"n":"狂气使役之鞭","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"灼燃蜡滴之欲","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"14038","n":"实验习作Ⅱ","spr":"mon:77","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"前沿的蜡像习作。充满了蜡像师对融蚀的无尽想象与探索。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御","cd":3,"op":[{"k":"shield","v":24.0}]},{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14039","n":"「睡莲」","spr":"mon:78","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她曾经是孤独的漂流落花，如今是拉伊精神疗养院的居民和屏障。","skills":[{"n":"疾病缠身","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"丧钟遥鸣","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":5.6}]}]},{"id":"14040","n":"简单习作Ⅰ","spr":"mon:79","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"简单的蜡像习作。它们被扭曲成不可思议的形状，却毫无怨言。","skills":[{"n":"屏障","cd":3,"op":[{"k":"shield","v":8}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14041","n":"「塔薇」","spr":"mon:80","rank":"boss","rankZh":"首领","size":"Huge","bt":"Boss","desc":"自弥萨格黑池中涌现出的银色六翼怪物。有种熟悉的感觉。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"展翼","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"14042","n":"「分裂患者」","spr":"mon:81","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"自蜡像中爬出的神秘女士。她的大脑十分拥挤，疑似歇斯底里症晚期患者。","skills":[{"n":"救救我","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"纷乱切割","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"14043","n":"核心教牧","spr":"mon:82","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"提灯教会内负责传递提灯旨意的教牧，指挥各堂教众在融蚀区域活动。","skills":[{"n":"出血","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1},{"k":"poison","v":3.6}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14044","n":"「24」","spr":"mon:83","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"自蜡像中爬出的神秘女士。她的大脑十分拥挤，疑似歇斯底里症晚期患者。","skills":[{"n":"救救我","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"纷乱切割","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"14046","n":"融蚀鼠王","spr":"mon:84","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14047","n":"「查泰德夫人」","spr":"mon:85","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"红酒、甜品、美好的恋爱都已离她远去。站在你面前的，是一位充满怨念的失意者。","skills":[{"n":"隆重的接待","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]}]},{"id":"14049","n":"脓疱","spr":"mon:86","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"眼球状的黑色脓疱怪物。","skills":[{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":7.2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"14050","n":"脓疱","spr":"mon:87","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"眼球状的黑色脓疱怪物。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":7.2}]}]},{"id":"14051","n":"融蚀疯马","spr":"mon:88","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"满身是融蚀创口的疯马。体型较大，生命力顽强，但融蚀创口也使其更容易受伤。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":40.0},{"k":"dmg","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"垂死之挣","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14052","n":"「渴血患者」","spr":"mon:89","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"隐匿在角落的苍白少女，似乎对鲜血情有独钟……？","skills":[{"n":"苦痛","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"欢愉","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"血","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14053","n":"蹈海者少年","spr":"mon:90","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"与蹈海者同行的神秘少年。嶙峋的棘刺，似鱼的耳鳍，一切都暗示着他并非常人。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"破碎沉戟","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14054","n":"库姆","spr":"mon:91","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"体型巨大的类犬怪物……为何会留下人类的啃咬痕迹呢？","skills":[{"n":"警戒","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"试探","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"14055","n":"维度碎片","spr":"mon:92","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"脆弱、游弋的维度碎片，当维度的罅隙被撕裂，它们便会四处飘荡。","skills":[{"n":"封印","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]}]},{"id":"14056","n":"高礼帽","spr":"mon:93","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"总是弯着腰的沉默绅士，只在需要时为女伴献上溢美之词。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"强力强化","cd":4,"op":[{"k":"str","v":1.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14057","n":"水手的恸哭","spr":"mon:94","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"曾随着货轮一同沉入深海的水手，这滴痛苦的眼泪与船融为一体，永不分离。","skills":[{"n":"遗恨围捕","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"航海料理","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"意外身故","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"14058","n":"水手的哀恸","spr":"mon:95","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"曾随着货轮一同沉入深海的水手，这份哀伤的记忆永远刻印在了船上，永不消散。","skills":[{"n":"溺毙之怨","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"清扫","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"呼啸","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"14059","n":"提灯","spr":"mon:96","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"提灯教会象征物的具象化。请勿追究其灵知的来源。","skills":[{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"出血","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]}]},{"id":"14060","n":"「灯芯侍者」","spr":"mon:97","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"提灯教会内负责传递提灯旨意的教牧，指挥各堂教众在融蚀区域活动。","skills":[{"n":"出血","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1},{"k":"poison","v":3.6}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14061","n":"「铁镐」卢森","spr":"mon:98","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"他也曾有过家人，现在却只剩下癫狂。会使用重击，攻击能使其退缩。","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"颅骨猛击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"14062","n":"「对不起」","spr":"mon:99","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"她的理智被愧疚淹没。","skills":[{"n":"蹒跚","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"14063","n":"「窜行者」","spr":"mon:100","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她神出鬼没，对东区的每一个街巷都了若指掌，她就是「窜行者」。","skills":[{"n":"鼠群冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"布朗出动！","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14064","n":"「复仇巨刃」","spr":"mon:101","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"以巨人之力挥动重刃的强大战士。","skills":[{"n":"斩首重创","cd":3,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"强者为尊","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"海渊之力","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"巨刃之威-血","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1},{"k":"poison","v":2.4}]}]},{"id":"14065","n":"融蚀浆","spr":"mon:102","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"这肯定只是融蚀浆而已。别去思考其中包含着什么。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14066","n":"「万物寂灭」","spr":"mon:103","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"融蚀浆平等地赐予万物死亡。万物寂灭合一。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"14067","n":"「院长」莎拉","spr":"mon:104","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"对不起……都是我的错……","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"14068","n":"「前辈」玛丽","spr":"mon:105","rank":"normal","rankZh":"普通","size":"Big","bt":"Elite","desc":"哀泣的黑色怪物表面浮现出似曾相识的脸……","skills":[{"n":"黑泥冲蚀","cd":4,"op":[{"k":"dmg","v":5.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":1}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"14069","n":"库姆","spr":"mon:106","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"体型巨大的类犬怪物……为何会留下人类的啃咬痕迹呢？","skills":[{"n":"警戒","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"试探","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"14070","n":"求告者","spr":"mon:107","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"雕塑家协会的改造产物，融蚀症状在逐渐加深……","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"14071","n":"「淤泥之花」","spr":"mon:108","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"因怪异的低语声而陷入疯狂的少女莉莉。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"报偿打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14072","n":"「蜡像潘狄娅」","spr":"mon:109","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"擅长调教的活泼少女。已经拥有102个奴隶，正在寻觅命中注定的下一位。","skills":[{"n":"狂气使役之鞭","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"灼燃蜡滴之欲","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"14073","n":"「永恒狂热者」","spr":"mon:110","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"杀戮、诵经、献祭……为了永恒之国，祂们将献出一切。","skills":[{"n":"猎物标记","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"附骨侵蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"猎矛突刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"刺击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"14074","n":"超变融蚀体","spr":"mon:111","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"大量融蚀浆聚合成的异变体，生命较低时会分裂。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"维度雾气","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14075","n":"融蚀鼠王","spr":"mon:112","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"14076","n":"蹈海者亲卫","spr":"mon:113","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"血的纽带赋予了祂们傲然亲族的权力，祂发誓永远为神明的降临而生。","skills":[{"n":"深潜标记","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"附骨侵蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"猎矛突刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"刺击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"14077","n":"融蚀鼠王","spr":"mon:114","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"14078","n":"吞噬之吠","spr":"mon:115","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"因融蚀加深而变得狂躁的流浪犬，它的攻击迅猛而连续，让人难以招架。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"连续撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":4,"op":[{"k":"str","v":1.0}]}]},{"id":"14079","n":"实验习作Ⅰ","spr":"mon:116","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"前沿的蜡像习作。充满了蜡像师对融蚀的无尽想象与探索。","skills":[{"n":"蜡油","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御","cd":3,"op":[{"k":"shield","v":24.0}]}]},{"id":"14080","n":"简单习作Ⅱ","spr":"mon:117","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"简单的蜡像习作。它们被扭曲成不可思议的形状，却毫无怨言。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":7.0,"hits":2}]},{"n":"屏障","cd":3,"op":[{"k":"shield","v":8}]}]},{"id":"14081","n":"吟诵者","spr":"mon:118","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"永恒之国的虔信者，神王最忠实的仆人。","skills":[{"n":"噬咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"迟缓迷毒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":6.4}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"14084","n":"维度猎手","spr":"mon:119","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"游离的维度碎片拼合而成的异兽，与祂的战利品和谐相处。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":8.0}]}]},{"id":"14085","n":"蜡像护工","spr":"mon:120","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"曾有56人在她的悉心照料下死亡。会保护其他友方个体。","skills":[{"n":"毒素","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"全体屏障","cd":3,"op":[{"k":"shield","v":8}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]}]},{"id":"14086","n":"宁菲亚","spr":"mon:121","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她曾经是孤独的漂流落花，如今是拉伊精神疗养院的居民和屏障。","skills":[{"n":"疾病缠身","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"丧钟遥鸣","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":5.6}]}]},{"id":"14087","n":"「守灯人」","spr":"mon:122","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"提灯教会的一般教众，盲目地崇拜着教义宣传的毁灭。","skills":[{"n":"出血","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1},{"k":"poison","v":3.6}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"明灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14088","n":"融蚀鼠王","spr":"mon:123","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14090","n":"「远洋回忆」","spr":"mon:124","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"为了生活奔赴大海，可成为一段记忆的现在，他早已遗失了那个故乡。","skills":[{"n":"溺毙之怨","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"意外身故","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"遗恨","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]},{"n":"航海料理","cd":4,"op":[{"k":"shield","v":12.0}]}]},{"id":"14091","n":"海中之物","spr":"mon:125","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"变形者们选择了这副躯壳，久远而恒常。当心它们的寄生攻击。","skills":[{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"14092","n":"海中之物","spr":"mon:126","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"变形者们选择了这副躯壳，灵活而坚韧。当心它们的寄生攻击。","skills":[{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14093","n":"维度碎片","spr":"mon:127","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"脆弱、游弋的维度碎片，当维度的罅隙被撕裂，它们便会四处飘荡。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]},{"n":"封印","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"14094","n":"干涉型融蚀体","spr":"mon:128","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"融蚀浆中诞生的中型怪物，攻击时会对敌人的心智进行干扰。","skills":[{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"14095","n":"干涉型融蚀体","spr":"mon:129","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"融蚀浆中诞生的中型怪物，攻击时会对敌人的心智进行干扰。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]}]},{"id":"14096","n":"蜡像医生","spr":"mon:130","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"如同手术刀一般精准、冷酷。攻击力很高的个体。","skills":[{"n":"手术准备","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"全体力量","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14098","n":"执妄者","spr":"mon:131","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"怀揣执念渴望启示的改造人。会呼唤信徒并对其强化。","skills":[{"n":"分裂打击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":20.0},{"k":"dmg","v":8.0}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"全体强化","cd":4,"op":[{"k":"shield","v":3.2}]}]},{"id":"14099","n":"维度异兽","spr":"mon:132","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"游离的维度碎片拼合而成的异兽，与祂的战利品和谐相处。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":8.0}]}]},{"id":"14100","n":"「新生」","spr":"mon:133","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"变形者啜饮生命，为自己带来永恒的新生。","skills":[{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14101","n":"协作型融蚀体","spr":"mon:134","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀浆中诞生的小型怪物，威胁性较低。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"护盾","cd":3,"op":[{"k":"shield","v":12.0}]}]},{"id":"14103","n":"融蚀鼠王","spr":"mon:135","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14104","n":"融蚀鼠王","spr":"mon:136","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"沾满融蚀的尾巴将它们粘合在一起，痛苦却无法分离。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"14106","n":"「维度之孔」","spr":"mon:137","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大量融蚀浆聚合成的异变体，生命较低时会分裂。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"维度雾气","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"14107","n":"「垂死嘶鸣」","spr":"mon:138","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"满身是融蚀创口的疯马。体型较大，生命力顽强，但融蚀创口也使其更容易受伤。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":40.0},{"k":"dmg","v":8.0}]},{"n":"践踏","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"垂死之挣","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14108","n":"「刻耳柏洛斯」","spr":"mon:139","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"贪婪的猎犬之颅，威压之瞳盯上了你……","skills":[{"n":"异维瞪视","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"双重啃咬","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"14110","n":"狂躁野犬","spr":"mon:140","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"因为融蚀而变得狂躁的流浪犬，它的攻击迅猛而连续。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"连续撕咬","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"疯狂","cd":4,"op":[{"k":"str","v":0.5}]}]},{"id":"14111","n":"提灯","spr":"mon:141","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"提灯教会象征物的具象化。请勿追究其灵知的来源。","skills":[{"n":"惊厥","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"出血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]}]},{"id":"14112","n":"死者No.12","spr":"mon:142","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"吧唧，吧唧。它能一口吃掉你的记忆。","skills":[{"n":"蓄力！回响","cd":4,"op":[{"k":"shield","v":3.2}]}]},{"id":"14113","n":"蜡像家猫","spr":"mon:143","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"如果可以的话，它更愿意被称作「小甜饼」。","skills":[{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"14114","n":"库姆","spr":"mon:144","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"体型巨大的类犬怪物……为何会留下人类的啃咬痕迹呢？","skills":[{"n":"警戒","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"试探","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"试探","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"14115","n":"蜡像野猫","spr":"mon:145","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它曾像风一样自由。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":3}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"14116","n":"扳手杰克逊","spr":"mon:146","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"他的橄榄球护具看起来很不合身，但生满铁锈的扳手却不乏威力，能造成大量伤口。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":9.0,"hits":2}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":4}]}]},{"id":"20789","n":"「贪玩的夏洛特」","spr":"mon:147","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"20790","n":"「无聊的夏洛特」","spr":"mon:148","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"20791","n":"「悲伤的夏洛特」","spr":"mon:149","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"20792","n":"「夏洛特」","spr":"mon:150","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"哀泣的黑色怪物表面浮现出似曾相识的脸……","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"20804","n":"「猩红」","spr":"mon:151","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"自遥远的群星而来，现今世上最早的魔像。","skills":[{"n":"沸腾吧！血","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"尖啸吧！血","cd":4,"op":[{"k":"shield","v":24.0}]}]},{"id":"21380","n":"「生物拟态溶浆-二重」","spr":"mon:152","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"学院用来测试唤醒体战斗能力的生物拟态生物，纯天然无融蚀污染。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"22037","n":"莉莉","spr":"mon:153","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"因怪异的低语声而陷入疯狂的少女莉莉。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"报偿打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"22057","n":"希洛","spr":"mon:154","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"迅捷如风的唤醒体杀手，自称希洛。她和莉莉之间似乎有什么微妙的联系……","skills":[{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"22159","n":"深海型复合异变体","spr":"mon:155","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"受深海之力影响的复合型融蚀异变体。诃勒特专门提醒过不要给祂们取过于花哨的名字。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"深海呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"22163","n":"深海型超变异变体","spr":"mon:156","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"受深海之力影响的超变型融蚀异变体。诃勒特专门提醒过不要给祂们取过于花哨的名字。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"深海呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"22201","n":"「海洋之星」","spr":"mon:157","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"受深海之力影响的「维度之孔」，思虑再三，诃勒特还是决定给祂取一个华丽的名字。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"深海呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"22219","n":"纯白鼠王","spr":"mon:158","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀与寒冷，伦蒂尼恩深冬的两大死神。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寒气打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"22220","n":"纯白鼠王","spr":"mon:159","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀与寒冷，伦蒂尼恩深冬的两大死神。","skills":[{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寒气打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"22221","n":"纯白鼠王","spr":"mon:160","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"融蚀与寒冷，伦蒂尼恩深冬的两大死神。","skills":[{"n":"寒气打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":8.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"22235","n":"多维者","spr":"mon:161","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"误入维度间隙，形体受空间撕扯的求告之人。对雕塑家协会的忠心未曾有变。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"维度封锁","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"22307","n":"渴雪之芽","spr":"mon:162","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"看起来有些眼熟的眼球状白色脓疱怪物，居然真的不怕冷啊！","skills":[{"n":"冰盾打击","cd":4,"op":[{"k":"shield","v":48.0},{"k":"dmg","v":3.2}]},{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"22308","n":"覆雪之芽","spr":"mon:163","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"看起来有些眼熟的眼球状白色脓疱怪物，是不是被冻住了？","skills":[{"n":"毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"冰盾打击","cd":4,"op":[{"k":"shield","v":48.0},{"k":"dmg","v":3.2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"22335","n":"「歇斯底里患者」","spr":"mon:164","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"曾饱读苏格拉底，曾信仰弗洛伊德。可惜的是，现在脑子里只剩尖叫的歇斯底里。","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"创伤猛击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":2}]}]},{"id":"22336","n":"谵妄之人","spr":"mon:165","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"主动离开的歇斯底里患者，已经分不清现实与记忆的区别。","skills":[{"n":"创伤重击","cd":4,"op":[{"k":"dmg","v":13.0,"hits":2}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":80.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"22337","n":"离弃之人","spr":"mon:166","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"被挚爱抛弃的歇斯底里患者，已经分不清现实与记忆的区别。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":80.0}]},{"n":"创伤重击","cd":4,"op":[{"k":"dmg","v":13.0,"hits":2}]}]},{"id":"22339","n":"蹈海者近卫","spr":"mon:167","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"血的纽带赋予了祂们傲然亲族的权力，祂发誓永远为主人的命令而动。","skills":[{"n":"怒涛牵引","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"巨刃斩击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"附骨侵蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"挥砍","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"23417","n":"「沉渊者」","spr":"mon:168","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"与蹈海者同行的神秘少年。嶙峋的棘刺，似鱼的耳鳍，一切都暗示着他并非常人。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"破碎沉戟","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"23537","n":"「猎颅魔女」","spr":"mon:169","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"来自过去的神秘商人，喜欢通过交易丈量一切。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"断颈一击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御","cd":3,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"23773","n":"「奇术师」","spr":"mon:170","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"天哪！我的《伦蒂尼恩犯罪实录》放哪了？！这可是我千辛万苦才从警局借来的——在图书管理员的哀嚎中，魔术大师卡茜亚正从知识的海洋中，汲取新的「情绪」。","skills":[{"n":"魔术嘉年华","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"魔术牌：衰弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"统统消失！","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"魔术牌：穿破","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"23774","n":"「大魔术师霍迪妮」","spr":"mon:171","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"大魔术师霍迪妮闪亮登场！根据海报上的自我介绍，曾有41人在她的演出现场失踪。","skills":[{"n":"特技飞牌","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"无中生有","cd":4,"op":[{"k":"dmg","v":8.5,"hits":1}]},{"n":"魔术连打","cd":3,"op":[{"k":"dmg","v":4.5,"hits":2}]}]},{"id":"24592","n":"「N」","spr":"mon:172","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"伏行世间的混沌之雾，祂因人类的痛苦与绝望而愉悦。","skills":[{"n":"伏行之雾","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"盲目契约","cd":4,"op":[{"k":"dmg","v":4.5,"hits":1}]}]},{"id":"24742","n":"「塔薇」","spr":"mon:173","rank":"boss","rankZh":"首领","size":"Huge","bt":"Boss","desc":"自弥萨格黑池中涌现出的银色六翼怪物。有种熟悉的感觉。","skills":[{"n":"展翼","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双翼初张","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"四翼渐生","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"六翼满开","cd":4,"op":[{"k":"dmg","v":4.0,"hits":6}]}]},{"id":"24743","n":"「凸月侍女」","spr":"mon:174","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"索蕾尔最亲近的女仆，沉迷各种美白秘方。","skills":[{"n":"食物中毒","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"女仆魔法","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"静默守望","cd":4,"op":[{"k":"shield","v":3.2}]},{"n":"蟾蜍炖菜","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"25133","n":"「艾米丽」","spr":"mon:175","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"25134","n":"「海伦」","spr":"mon:176","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被融蚀浆蚀化的弥萨格学生，形貌凄惨。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.4}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"25135","n":"「前辈」玛丽","spr":"mon:177","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"哀泣的黑色怪物表面浮现出似曾相识的脸……","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"25162","n":"「千面@2」","spr":"mon:178","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"萦绕歌剧院内的幻影。祂的落败亦是故事的一部分。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"伏行之雾","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"黑色混沌","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"30363","n":"「奇术师」的分身","spr":"mon:179","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"魔术大师卡茜亚的助手——或者说，魔术道具。","skills":[{"n":"惊喜！","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"34678","n":"「洋流」","spr":"mon:180","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受深海之力影响的干涉型融蚀体，有着不逊于热带珊瑚的美丽。","skills":[{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"34679","n":"「几何体」","spr":"mon:181","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受维度之力影响的干涉型融蚀体，滴落的融蚀浆或许能扭曲光线。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]}]},{"id":"34680","n":"「立体」","spr":"mon:182","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受维度之力影响的干涉型融蚀体，滴落的融蚀浆或许能扭曲光线。","skills":[{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"34681","n":"「潮汐」","spr":"mon:183","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受深海之力影响的干涉型融蚀体，有着不逊于热带珊瑚的美丽。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御·削弱","cd":4,"op":[{"k":"shield","v":12.0}]}]},{"id":"35525","n":"「鲜花守卫」@2","spr":"mon:184","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"曾为瑞尼镇花店店主的@1，现在已经分不清百合和马蒂莲。","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"颅骨猛击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"35579","n":"「塞勒菲斯的倒影」","spr":"mon:185","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"珊瑚、寄生物……不同的赘生物是否来自同一灾厄的源头？我们无从知晓。","skills":[{"n":"礁化","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"深海洗礼","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"35580","n":"「养育者」","spr":"mon:186","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"它的模样大变，只令人隐约感到熟悉。数次对视后，你才意识到这是无法抵抗「灾厄」影响的蹈海者助祭。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":6.4}]},{"n":"眷族！","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"35581","n":"「佩因」","spr":"mon:187","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"在潜入大洋，越过深海前，它记得佩因街是通向广场的一条窄路。","skills":[{"n":"虔诚","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"礁化","cd":3,"op":[{"k":"dmg","v":5.5,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"35584","n":"「寄生种」","spr":"mon:188","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"因「灾厄」影响而异变的蹈海者，赘生物自内向外生长，将它蚕食成一具空壳。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"虔诚","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"标记猎物","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"35585","n":"灵觉之子","spr":"mon:189","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它脑子里那些疯狂的想法，注定胎死腹中。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"36007","n":"「奥格诺茨」","spr":"mon:190","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受「未知」影响后，发生异变的某种海洋生物。软化的外壳与皮肉紧密粘连，强行剥离，只会让它永远失去抵达彼岸的能力。","skills":[{"n":"蜕变","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"蛸吻","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1},{"k":"poison","v":2.0}]}]},{"id":"36008","n":"「阿戈纳斯」","spr":"mon:191","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"受「未知」影响后，发生异变的某种海洋生物。软化的外壳与皮肉紧密粘连，让它不再能像风帆般舒展。","skills":[{"n":"蛸吻","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1},{"k":"poison","v":2.0}]},{"n":"蜕变","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"36065","n":"「永恒寄主」","spr":"mon:192","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"它不受控制地向未知奉献出自己的肉身，没有人在意它的意志。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4},{"k":"poison","v":1.6}]},{"n":"虔诚","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"标记猎物","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"36112","n":"睡梦之子","spr":"mon:193","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"如果可以，它也不愿醒来。","skills":[{"n":"初生之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"殉身","cd":4,"op":[{"k":"dmg","v":25.0,"hits":1}]}]},{"id":"36113","n":"睡梦之子","spr":"mon:194","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"如果可以，它也不愿醒来。","skills":[{"n":"初生之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"36114","n":"「寄主」","spr":"mon:195","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"它不受控制地向未知奉献出自己的肉身，没有人在意它的意志。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4},{"k":"poison","v":1.6}]},{"n":"虔诚","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"标记猎物","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"36115","n":"水之子","spr":"mon:196","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"与常识相悖，它讨厌水。","skills":[{"n":"脆弱毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"36116","n":"灵觉之子","spr":"mon:197","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它脑子里那些疯狂的想法，注定胎死腹中。","skills":[{"n":"裂伤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"殉身","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"36117","n":"「瓦拉几亚」","spr":"mon:198","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"在潜入大洋，越过深海前，它曾以为自己不会流淌着这样的血脉。","skills":[{"n":"虔诚","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"加速礁化","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"36118","n":"「伊恩斯莫的守卫」","spr":"mon:199","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"它与赘生物融合得是如此恰到好处，美丽到几乎让人以为它本该如此。","skills":[{"n":"恶诞","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"深海洗礼","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"离散","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"36119","n":"水之子","spr":"mon:200","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"与常识相悖，它讨厌水。","skills":[{"n":"脆弱毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"殉身","cd":4,"op":[{"k":"dmg","v":25.0,"hits":1}]}]},{"id":"36120","n":"「恩瑟雷的回音」","spr":"mon:201","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"珊瑚、寄生物……不同的赘生物是否来自同一灾厄的源头？我们无从知晓。","skills":[{"n":"恶诞","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"深海洗礼","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"36369","n":"「受控者」","spr":"mon:202","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"出于生命的本能，它心甘情愿供养着寄生物。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":6.4}]},{"n":"眷族！","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"36658","n":"「海之@2」","spr":"mon:203","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她放弃了抵抗「灾厄」的侵蚀，精神维度的污染，让曾经矜贵强大的唤醒体，染上了彻头彻尾的疯狂。","skills":[{"n":"无上生祭","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"神眷之刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":2.4}]},{"n":"应选之人","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"36868","n":"「泼尼」","spr":"mon:204","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"婆婆曾经答应奥瑞塔，等奥瑞塔长大，长大到能够着马背了，就带她一起去伦蒂尼恩旅行。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":40.0},{"k":"dmg","v":8.0}]},{"n":"践踏","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"垂死之挣","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"36869","n":"「维特」","spr":"mon:205","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"曾是一个多愁善感的小孩，但这并不妨碍他成为奥瑞塔的朋友。爬树下海，他们无所不能。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"36870","n":"「白雪」","spr":"mon:206","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"曾是奥瑞塔最好的朋友（之一），具体表现在它会在奥瑞塔靠近时撕心裂肺地哀嚎。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"连续撕咬","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"疯狂","cd":4,"op":[{"k":"str","v":0.5}]}]},{"id":"43794","n":"「涅弗鲁瑞」","spr":"mon:207","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"睡吧，涅弗鲁瑞。睡吧，我的乖孩子。睡吧，在太过短暂的童年，在迎风而长的梦中。","skills":[{"n":"利齿撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"延续血缘","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"惩戒","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"「失序撕咬」","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"44456","n":"孳乳·努比亚幼崽","spr":"mon:208","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表遍布着神秘的纹路。受到致命伤后会立刻消失。","skills":[{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"44479","n":"「索菲亚」","spr":"mon:209","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"悲苦的命运将她扭曲。一切都是仇恨，一切都是不公。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4},{"k":"poison","v":1.6}]},{"n":"罚罪","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"爪击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"44480","n":"「审判」的使徒","spr":"mon:210","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她抛却人形，抛却人性，只为带来虚幻的幸福。但极端的善举是否还能被称为善举？","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"「镜中审视」","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"惩戒","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"「失序撕咬」","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"44630","n":"「乐善好施」肯尼","spr":"mon:211","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"他曾经是个好人，愿意一天工作20个小时，只为「抚养」邻居家的孤儿。","skills":[{"n":"倒打一耙","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"犯罪预告","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"拐卖","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"44631","n":"「助人为乐」杰克逊","spr":"mon:212","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"他曾经是个好人，愿意在雨夜守护每一个路人，只为能让所有人「平安归家」。","skills":[{"n":"雨夜屠戮","cd":4,"op":[{"k":"dmg","v":4.5,"hits":2}]},{"n":"暗巷劫道","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"隐于黑暗","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"44632","n":"「心地善良」弗里曼","spr":"mon:213","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"他曾经是个好人，愿意一天打扫20条街道，只为能让更多人「窥视」到伦蒂尼恩的平静。","skills":[{"n":"扬尘","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"清扫","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"敲竹杠","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"46083","n":"「以图存续」","spr":"mon:214","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"这里充斥着对存续的渴望，他探求如逐火的灯蛾。","skills":[{"n":"维度分形","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"维度防壁","cd":4,"op":[{"k":"shield","v":3.2}]}]},{"id":"46084","n":"窥视者","spr":"mon:215","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"笨拙的窃取者，在废弃的厂房中徘徊。","skills":[{"n":"维度分形","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"维度防壁","cd":4,"op":[{"k":"shield","v":3.2}]},{"n":"维度分形","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"47981","n":"影子「24」","spr":"mon:216","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"诞生自阴影的「24」。痛恨一切弱小的事物，包括老鼠。","skills":[{"n":"救救我","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"纷乱切割","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"48861","n":"孳乳·努比亚幼崽","spr":"mon:217","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表遍布着神秘的纹路。受到致命伤后会立刻消失。","skills":[{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"48862","n":"孳乳·努比亚幼崽","spr":"mon:218","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表遍布着神秘的纹路。受到致命伤后会立刻消失。","skills":[{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"48866","n":"胎动·努比亚幼崽","spr":"mon:219","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表纠缠着异常的血肉。受到致命伤后会立刻消失。","skills":[{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1},{"k":"poison","v":3.2}]},{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"48867","n":"胎动·努比亚幼崽","spr":"mon:220","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表纠缠着异常的血肉。受到致命伤后会立刻消失。","skills":[{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1},{"k":"poison","v":3.2}]}]},{"id":"48881","n":"亚兰卫队长","spr":"mon:221","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"每代篝火晚会后，最杰出的种子都会成长为新的卫队长。","skills":[{"n":"无畏掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":6.5,"hits":1}]},{"n":"蓄势猛袭","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"48892","n":"亚兰圣鹭","spr":"mon:222","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"造就自身者，自圣树之火中诞生，引领诸位前往死之领域。","skills":[{"n":"飞沙走石","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"啄食","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"鼓翼","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":9.6}]},{"n":"鼓翼","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":9.6}]}]},{"id":"49156","n":"努比亚幼崽","spr":"mon:223","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它长着羊的蹄子，位于体表中央的瞳孔被刺穿后会立刻消失。","skills":[{"n":"咒毒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"破甲针刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"血之棘","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]}]},{"id":"49157","n":"努比亚幼崽","spr":"mon:224","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它长着羊的蹄子，位于体表中央的瞳孔被刺穿后会立刻消失。","skills":[{"n":"破甲针刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"血之棘","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"咒毒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]}]},{"id":"49237","n":"亚兰战士","spr":"mon:225","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"亚兰人拥有异常的繁衍能力，但亚兰的战士依然是某人的儿子，某人的父亲。","skills":[{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"49238","n":"亚兰行灯","spr":"mon:226","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"提灯教会象征物的具象化。请勿追究其灵知的来源。","skills":[{"n":"千针","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"畸变扩散","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"扬尘","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"祷言","cd":4,"op":[{"k":"shield","v":24.0}]}]},{"id":"49239","n":"亚兰行灯","spr":"mon:227","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"提灯教会象征物的具象化。请勿追究其灵知的来源。","skills":[{"n":"扬尘","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"畸变扩散","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"祷言","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"千针","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"49240","n":"亚兰战士","spr":"mon:228","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"亚兰人拥有异常的繁衍能力，但亚兰的战士依然是某人的儿子，某人的父亲。","skills":[{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"49283","n":"努比亚","spr":"mon:229","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade2","desc":"小心勒姆瓦希的每一束枯藤，小心它睁开的血色的方形眼瞳。","skills":[{"n":"血棘喷射","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"污秽降生","cd":4,"op":[{"k":"dmg","v":5.5,"hits":1}]},{"n":"黯蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"冲击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"49479","n":"圣河努比亚","spr":"mon:230","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"小心勒姆瓦希的每一束枯藤，它跃动的心脏将鼓动你化作圣河的水脉。","skills":[{"n":"血棘喷射","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"黯蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"匿踪呼唤","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"匿踪突袭","cd":4,"op":[{"k":"dmg","v":13.0,"hits":2}]}]},{"id":"49480","n":"长明·努比亚巨木","spr":"mon:231","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"祂不再隐藏自己的内核。「愿提灯长明。」","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"畸生千针","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"鲜血祈祷","cd":3,"op":[{"k":"str","v":3.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"49481","n":"「塞尔凯特」","spr":"mon:232","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"小心勒姆瓦希的每一束枯藤，小心它睁开的血色的方形眼瞳。","skills":[{"n":"血棘喷射","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"污秽降生","cd":4,"op":[{"k":"dmg","v":5.5,"hits":1}]},{"n":"黯蚀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"匿踪呼唤","cd":4,"op":[{"k":"str","v":0.5}]}]},{"id":"49482","n":"「海窟特」","spr":"mon:233","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"有一天种子会发芽，新芽会长成巨树——如果它不曾被污染的话。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"畸生千针","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"鲜血祈祷","cd":3,"op":[{"k":"str","v":3.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"49483","n":"努比亚巨木","spr":"mon:234","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"有一天种子会发芽，新芽会长成巨树——如果它不曾被污染的话。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"畸生千针","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"鲜血祈祷","cd":3,"op":[{"k":"str","v":2.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"49534","n":"精英亚兰护卫","spr":"mon:235","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"他守卫亚兰的未来，但从未过问那未来究竟是什么模样。","skills":[{"n":"鼓舞","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"护卫","cd":3,"op":[{"k":"shield","v":120.0}]}]},{"id":"49535","n":"精英亚兰护卫","spr":"mon:236","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"他守卫亚兰的未来，但从未过问那未来究竟是什么模样。","skills":[{"n":"护卫","cd":3,"op":[{"k":"shield","v":120.0}]},{"n":"鼓舞","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"49592","n":"「空想利刃」","spr":"mon:237","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"亚兰族族长，她将以自身为旗、为刃、为盾，指引亚兰的子民，开辟未来的道路，守候她的归来。","skills":[{"n":"心眼利刃","cd":4,"op":[{"k":"dmg","v":14.0,"hits":1}]},{"n":"增幅打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"临战体势","cd":4,"op":[{"k":"shield","v":4.0}]}]},{"id":"49598","n":"亚兰战士幻影","spr":"mon:238","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"母树的意识之海中，漂浮着葬于往昔的幻影。","skills":[{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]}]},{"id":"49599","n":"亚兰战士幻影","spr":"mon:239","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"母树的意识之海中，漂浮着葬于往昔的幻影。","skills":[{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"49629","n":"胎动·努比亚幼崽","spr":"mon:240","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"长着羊蹄的小型怪物，体表纠缠着异常的血肉。受到致命伤后会立刻消失。","skills":[{"n":"胎动","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"血棘喷射","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1},{"k":"poison","v":3.2}]}]},{"id":"50376","n":"维度异兽","spr":"mon:241","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"游离的维度碎片拼合而成的异兽，与祂的战利品和谐相处。","skills":[{"n":"封印","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":8.0}]}]},{"id":"51385","n":"苏醒者","spr":"mon:242","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"雕塑家协会的改造产物，受过洗脑而充满信念，越战越勇。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"远古的呼唤","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"51698","n":"「海之使徒」","spr":"mon:243","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她放弃了抵抗「灾厄」的侵蚀，精神维度的污染，让曾经矜贵强大的唤醒体，染上了彻头彻尾的疯狂。","skills":[{"n":"无上生祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"神眷之刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":4.0},{"k":"dmg","v":2.4}]},{"n":"应选之人","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"52080","n":"「致奥尔拉」","spr":"mon:244","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"在自己所写的唯一一首诗中，她描述花园、阳光、欢笑。她用花瓣埋葬挚友的身躯。在诗中，她良善如同玫瑰。","skills":[{"n":"分断之缘","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"融蚀墨染","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"禁绝贪念","cd":4,"op":[{"k":"shield","v":24.0}]}]},{"id":"52491","n":"亚兰战士","spr":"mon:245","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"亚兰人拥有异常的繁衍能力，但亚兰的战士依然是某人的儿子，某人的父亲。","skills":[{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]},{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"53763","n":"大裙摆","spr":"mon:246","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"身着过气礼装的傲慢淑女，千万别给她看最新款的穿搭杂志。","skills":[{"n":"隆重的接待","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":24.0},{"k":"dmg","v":8.0}]}]},{"id":"53764","n":"高礼帽","spr":"mon:247","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"总是弯着腰的沉默绅士，只在需要时为女伴献上溢美之词。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"强力强化","cd":4,"op":[{"k":"str","v":1.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"53768","n":"亚兰战士","spr":"mon:248","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"亚兰人拥有异常的繁衍能力，但亚兰的战士依然是某人的儿子，某人的父亲。","skills":[{"n":"穿心一击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"蓄势突袭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"殊死一搏","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"掩护","cd":3,"op":[{"k":"shield","v":64.0}]}]},{"id":"54102","n":"欲之花","spr":"mon:249","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"往昔的花园中，欲望是仅有的养分。","skills":[{"n":"裁剪","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"贪念","cd":4,"op":[{"k":"shield","v":40.0}]},{"n":"墨染","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"54103","n":"婪之花","spr":"mon:250","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"贪婪是人生唯一的意象。不是吗？","skills":[{"n":"墨染","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"裁剪","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"贪念","cd":4,"op":[{"k":"shield","v":40.0}]}]},{"id":"54465","n":"荆棘侍从","spr":"mon:251","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"「在我们渺小的王国里，我会为你，撑起所有荆棘」","skills":[{"n":"浇灌","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"供养","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"54466","n":"荆棘侍从","spr":"mon:252","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"「在我们渺小的王国里，我会为你，撑起所有荆棘」","skills":[{"n":"供养","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"浇灌","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"56169","n":"诗中人","spr":"mon:253","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"坚定的拥护者，这是她能写出的全部意象。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":5.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"56170","n":"伯爵夫人","spr":"mon:254","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"「亲爱的伯爵夫人，我曾经的渴望。而如今，你已成为了我忠实的侍卫。替我向她，献上一首诗吧。」","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"56172","n":"追随者","spr":"mon:255","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们追随柯蕾特的身影。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.0}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]}]},{"id":"56173","n":"渴求者","spr":"mon:256","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们渴求柯蕾特的恩典。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.0}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"57143","n":"亚弗姆扎","spr":"mon:257","rank":"boss","rankZh":"首领","size":"Huge","bt":"Boss","desc":"艾尔沃斯的神祇，提灯的改造之物，为雪山的重生燃起永恒不灭的冰焰。","skills":[{"n":"霜棱","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1}]},{"n":"寒焰","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"冷冽之灵","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"57954","n":"「沉睡之主」","spr":"mon:258","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"群星正位之刻，他将结束亿万年的沉眠，荣归祂的王座。而这是否是他心中所愿，便无人知晓了。","skills":[{"n":"撕咬","cd":3,"op":[{"k":"dmg","v":6}]}]},{"id":"59741","n":"「绅士」","spr":"mon:259","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade2","desc":"雕塑家协会通过这组雕像获得了于丽埃特的认可。提灯教会从不浪费任何一个遗产。","skills":[{"n":"蜡像登场","cd":3,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"59742","n":"「淑女」","spr":"mon:260","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade2","desc":"雕塑家协会通过这组雕像获得了于丽埃特的认可。提灯教会从不浪费任何一个遗产。","skills":[{"n":"蜡像登场","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"隆重的接待","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":8.0}]}]},{"id":"59743","n":"作战员","spr":"mon:261","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"越底层的成员，越为这场难得一见的重大行动感到亢奋。","skills":[{"n":"破甲","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"出血","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"剑势","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"幻影剑","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]}]},{"id":"59744","n":"搜查猫","spr":"mon:262","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"某些工作不止犬科能做。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"出血爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"低吼","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"59745","n":"陆战猫","spr":"mon:263","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"审查会的试验性产物，迄今已伤害了七任训练员。","skills":[{"n":"出血爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"低吼","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]}]},{"id":"59746","n":"「小马蜂」","spr":"mon:264","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"最让训练员头疼的成员。生性易怒，小心它的刺。","skills":[{"n":"振翅","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"尾针！","cd":4,"op":[{"k":"dmg","v":30.0,"hits":1}]}]},{"id":"59747","n":"异维学子","spr":"mon:265","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"从这些来自异维的怪物身上，你看到了属于弥萨格的标志。","skills":[{"n":"狂气窃取","cd":4,"op":[{"k":"dmg","v":5.5,"hits":2}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]}]},{"id":"59748","n":"探员","spr":"mon:266","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"越底层的成员，越为这场难得一见的重大行动感到亢奋。","skills":[{"n":"重创","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"试探剑招","cd":4,"op":[{"k":"dmg","v":6.5,"hits":1}]},{"n":"蚀血剑招","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"剑意","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"59749","n":"异维学子","spr":"mon:267","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"从这些来自异维的怪物身上，你看到了属于弥萨格的标志。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":8.0}]},{"n":"狂气窃取","cd":4,"op":[{"k":"dmg","v":5.5,"hits":2}]}]},{"id":"59750","n":"「小蜜蜂」","spr":"mon:268","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"训练员这样称呼它。虽然性情相对温顺，但也请小心它的刺。","skills":[{"n":"啼鸣","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"振翅","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"尾针！","cd":4,"op":[{"k":"dmg","v":30.0,"hits":1}]}]},{"id":"59880","n":"「N」","spr":"mon:269","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"伏行世间的混沌之雾，祂因人类的痛苦与绝望而愉悦。","skills":[{"n":"伏行之雾","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"盲目契约","cd":4,"op":[{"k":"dmg","v":4.5,"hits":1}]}]},{"id":"60006","n":"谦和女士","spr":"mon:270","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"灯光快要晒化她的脸……为什么没有人替她打伞？","skills":[{"n":"蜡像登场","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"隆重的接待","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":8.0}]}]},{"id":"60007","n":"军士长","spr":"mon:271","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"审查会初级指挥人员，通常为作战小队队长。","skills":[{"n":"「重创」飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"豢养","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"归巢","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"制裁","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]}]},{"id":"60008","n":"少校","spr":"mon:272","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"审查会高级指挥人员，帝国勋章获得者，曾在数次对抗融蚀的行动中立下功勋。","skills":[{"n":"「重创」飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"豢养","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1}]},{"n":"群鸟归巢","cd":4,"op":[{"k":"str","v":1.0}]},{"n":"制裁","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]}]},{"id":"60009","n":"正直先生","spr":"mon:273","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"灯芯快要压断他的腰……为什么没有人搀他的肩？","skills":[{"n":"蜡像登场","cd":4,"op":[{"k":"dmg","v":12.5,"hits":1}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"60090","n":"上尉","spr":"mon:274","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"审查会中级指挥人员，拥有良好的个人能力与指挥素养。","skills":[{"n":"「重创」飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"豢养","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"归巢","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"制裁","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]}]},{"id":"60091","n":"高级探员","spr":"mon:275","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"更少的退路，更少的回报。更多的风险，更多的烦恼。","skills":[{"n":"重创","cd":4,"op":[{"k":"dmg","v":7.0,"hits":3}]},{"n":"试探剑招","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"蚀血剑招","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"剑意","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"60092","n":"「丰穰之息」","spr":"mon:276","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「击溃它们，安抚它们，即使你窥见我的幻影，也在所不惜。」","skills":[{"n":"古老的爱抚","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"60094","n":"提灯·卫道士","spr":"mon:277","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"被提灯选中的前审查会成员，她匍匐于提灯的控制，渴望光芒照亮自己的衣衫。","skills":[{"n":"污染","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"飞刃","cd":3,"op":[{"k":"dmg","v":7.5,"hits":1},{"k":"poison","v":3.0}]},{"n":"血红誓言","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"降罪灯火","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"60095","n":"高级作战员","spr":"mon:278","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"更少的退路，更少的回报。更多的风险，更多的烦恼。","skills":[{"n":"破甲","cd":4,"op":[{"k":"dmg","v":6.0,"hits":3}]},{"n":"出血","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"剑势","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"幻影剑","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]}]},{"id":"60096","n":"「@2奏者」","spr":"mon:279","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"指挥棒的轨迹之下，究竟隐藏着什么样的乐曲？","skills":[{"n":"追忆回旋曲\n算力 ≥2","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"下行音\n算力 1","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"灵魂序曲\n算力 0","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"上行音\n算力 3","cd":4,"op":[{"k":"dmg","v":10.0,"hits":15}]}]},{"id":"60097","n":"阴影的忠犬","spr":"mon:280","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"他不介意为于丽埃特的光明而伏于阴影。能成为于丽埃特的犬，是他一生中最崇高的荣耀。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3},{"k":"poison","v":1.6}]},{"n":"蜕变","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"惩戒","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"「失序撕咬」","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"60099","n":"「嘀嗒人」","spr":"mon:281","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"艾瑞卡已经完全失去了自我的意识……是受黑池的影响吗？","skills":[{"n":"机械武装-放","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"机能过载","cd":4,"op":[{"k":"shield","v":3.2},{"k":"dmg","v":2.4}]},{"n":"打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"60100","n":"「N？」","spr":"mon:282","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"一个玩笑。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"伏行之雾","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"黑色混沌","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"60101","n":"提灯·指挥官","spr":"mon:283","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"审查会的优秀指挥，提灯的护卫队长。她守望灯火，直到光芒传播到每一个角落。","skills":[{"n":"污染","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"飞刃","cd":3,"op":[{"k":"dmg","v":7.5,"hits":1},{"k":"poison","v":3.0}]},{"n":"血红誓言","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"降罪灯火","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"60102","n":"「塔薇」","spr":"mon:284","rank":"boss","rankZh":"首领","size":"Huge","bt":"Boss","desc":"智之质体的代行者。知识权柄的拥有者。弥萨格的指引者。令人恐惧的敌人。","skills":[{"n":"展翼","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双翼初张","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"四翼渐生","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"六翼满开","cd":4,"op":[{"k":"dmg","v":4.0,"hits":6}]}]},{"id":"60103","n":"「灯罩」阿依莎","spr":"mon:285","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"曾经的英雄，如今守护在于丽埃特身边。她们一同等待，等待那个长明的未来。","skills":[{"n":"污染","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"败血","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1},{"k":"poison","v":4.0}]},{"n":"血红誓言","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"降罪灯火","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"60494","n":"「拟态-渴血患者」","spr":"mon:286","rank":"normal","rankZh":"普通","size":"Middle","bt":"Elite","desc":"隐匿在角落的苍白少女，似乎对鲜血情有独钟……？","skills":[{"n":"苦痛","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"60495","n":"「拟态-破链者」","spr":"mon:287","rank":"normal","rankZh":"普通","size":"Middle","bt":"Elite","desc":"迅捷如风的唤醒体杀手，自称希洛。她和莉莉之间似乎有什么微妙的联系……","skills":[{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"60496","n":"「拟态-石之眼」","spr":"mon:288","rank":"normal","rankZh":"普通","size":"Middle","bt":"Elite","desc":"为了希望守护的人，她也可以变得坚强。请确保有足够的算力来应对其凝滞诅咒。","skills":[{"n":"凝滞诅咒","cd":4,"op":[{"k":"dmg","v":4.5,"hits":2}]},{"n":"石质分解","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]}]},{"id":"60497","n":"「拟态-猩红」","spr":"mon:289","rank":"normal","rankZh":"普通","size":"Middle","bt":"Elite","desc":"自遥远的群星而来，现今世上最早的魔像。","skills":[{"n":"沸腾吧！血","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"尖啸吧！血","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"血与沙之歌","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"65527","n":"雪山之蛹","spr":"mon:290","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"充满勇气与力量的考察队员。艾尔沃斯最钟爱的祭品。","skills":[{"n":"霜冻之咏","cd":4,"op":[{"k":"dmg","v":9.0,"hits":3}]},{"n":"急冻复苏","cd":3,"op":[{"k":"str","v":5.0}]},{"n":"碎冰飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"65528","n":"雪之祭品","spr":"mon:291","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"雪山舔舐了他的血肉。雪山吞噬了他的枯骨。雪山奴役着他的魂灵，为自己寻觅下一个祭品。","skills":[{"n":"霜冻之咏","cd":4,"op":[{"k":"dmg","v":9.0,"hits":3}]},{"n":"急冻复苏","cd":3,"op":[{"k":"str","v":5.0}]},{"n":"碎冰飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"65530","n":"遇难探险队","spr":"mon:292","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"雪山吞噬了那些勇敢无知的人类，他们在死后亦不得安宁。","skills":[{"n":"风雪挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"警备","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"碎冰猛凿","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"刺骨挥击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"65531","n":"遇难探险队","spr":"mon:293","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"雪山吞噬了那些勇敢无知的人类，他们在死后亦不得安宁。","skills":[{"n":"刺骨挥击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"碎冰猛凿","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"风雪挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"警备","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"65532","n":"异化企鹅","spr":"mon:294","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"当融蚀与冰焰降临这片土地，宁静对艾尔沃斯的生物来说便成为奢望。","skills":[{"n":"冰霜尖啸","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"65533","n":"探险者领队","spr":"mon:295","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"他不愿舍弃那些被群山淹没的队员们。他勇敢折返。他如愿以偿。","skills":[{"n":"风雪挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"警备","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"碎冰猛凿","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"刺骨挥击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]}]},{"id":"65534","n":"异化企鹅","spr":"mon:296","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"当融蚀与冰焰降临这片土地，宁静对艾尔沃斯的生物来说便成为奢望。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"冰霜尖啸","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"67097","n":"「知者」","spr":"mon:297","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"无需任何词汇描述她。她是拉蒙娜。斩断与她的链接吧。","skills":[{"n":"弱点打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻势推演","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"女王之剑","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"67100","n":"「腐坏之脑」","spr":"mon:298","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她跨入门扉，终于看清宇宙盲目混沌的真相。痴愚之人啊，躬身迎接毁灭，才是唯一存在的未来。","skills":[{"n":"呼唤终末","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"呼唤终末","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"67102","n":"「美德骑士」","spr":"mon:299","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"年幼的骑士曾向你宣誓效忠，他从未背弃他的誓言。","skills":[{"n":"盾裂冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"穿刺之枪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"不定壁垒","cd":4,"op":[{"k":"shield","v":8.0}]}]},{"id":"67103","n":"「缸中之脑」","spr":"mon:300","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她的声音从通讯器中响起时，是你任务中最安心的时刻。卓越的智慧，你已依赖得够多。","skills":[{"n":"打击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"外域手术","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"等价交换","cd":4,"op":[{"k":"dmg","v":5.0,"hits":20}]}]},{"id":"67259","n":"复制体","spr":"mon:301","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"卓越大脑制作出的复制体。看起来柔弱的外表下，是避无可避的陷阱。","skills":[{"n":"自毁程序","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"67342","n":"「美德骑士」","spr":"mon:302","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"年幼的骑士曾向你宣誓效忠，他从未背弃他的誓言。斩断与他的链接吧。","skills":[{"n":"盾裂冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"穿刺之枪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"不定壁垒","cd":4,"op":[{"k":"shield","v":8.0}]}]},{"id":"67343","n":"「鲸跃」","spr":"mon:303","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"你的剑术老师，你的第一位一往无前的战士。斩断与她的链接吧。","skills":[{"n":"桀骜之刃","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"恣睢之浪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"67344","n":"「缸中之脑」","spr":"mon:304","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"她的声音从通讯器中响起时，是你任务中最安心的时刻。卓越的智慧，你已依赖得够多。斩断与她的链接吧。","skills":[{"n":"打击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"外域手术","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"等价交换","cd":4,"op":[{"k":"dmg","v":5.0,"hits":5}]}]},{"id":"72141","n":"失联之人","spr":"mon:305","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"末日已至，残余的灵性相互呼告：请与我产生联络。","skills":[{"n":"物理修复","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"屏蔽","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"72142","n":"灰烬融蚀体","spr":"mon:306","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"诞生于灰烬之中，已经被融蚀磨灭大部分灵性。","skills":[{"n":"流逝","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"没入火烬","cd":4,"op":[{"k":"shield","v":8}]},{"n":"再流逝","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"无火之灰","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]}]},{"id":"72143","n":"「@2银芯@1一体」","spr":"mon:307","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"扭曲的肢体绞缠在一处。","skills":[{"n":"融蚀赘生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"银芯交融","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双螺旋","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"异体排斥","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"72144","n":"灰烬融蚀体","spr":"mon:308","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"诞生于灰烬之中，已经被融蚀磨灭大部分灵性。","skills":[{"n":"再流逝","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"无火之灰","cd":4,"op":[{"k":"dmg","v":11.0,"hits":1}]},{"n":"流逝","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"没入火烬","cd":4,"op":[{"k":"shield","v":8}]}]},{"id":"72145","n":"融合你我","spr":"mon:309","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"末日已至，残余的灵性相互呼告：请与我的灵性融为一体。","skills":[{"n":"银芯交融","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双螺旋","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"异体排斥","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"融蚀赘生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"72149","n":"「@2无法@1传递」","spr":"mon:310","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"讯号飘散在灰雾笼罩的空中。","skills":[{"n":"物理修复","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"屏蔽","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"触达","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"72150","n":"紧急联络","spr":"mon:311","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「姐姐啊，我好想好想再听一次你的声音。」","skills":[{"n":"屏蔽","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"物理修复","cd":4,"op":[{"k":"dmg","v":14.0,"hits":1}]},{"n":"呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"72151","n":"拥抱你我","spr":"mon:312","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"「亲爱的，我还能和你再次拥抱吗？」","skills":[{"n":"银芯交融","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双螺旋","cd":3,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"异体排斥","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"融蚀赘生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"72152","n":"紧急联络","spr":"mon:313","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「姐姐啊，我好想好想再听一次你的声音。」","skills":[{"n":"物理修复","cd":4,"op":[{"k":"dmg","v":14.0,"hits":1}]},{"n":"呼唤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"屏蔽","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"73521","n":"「催眠妖虫」","spr":"mon:314","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"总是十分温柔的心理医生，无论何时都保持着得体的微笑。","skills":[{"n":"心理绞杀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"痛苦榨取","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"精神抚慰","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"73523","n":"「不会吧…」","spr":"mon:315","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"「不会的不会的不会的，我们已经很努力地活下去了…」","skills":[{"n":"自毁","cd":4,"op":[{"k":"dmg","v":4.5,"hits":1}]}]},{"id":"73524","n":"「熔毁·朵尔」","spr":"mon:316","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"她开启深渊，她带来末日。","skills":[{"n":"呼唤终末","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"呼唤终末","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"74035","n":"「院长」莎拉","spr":"mon:317","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"无法自控陷入癫狂的莎拉，额角的伤疤透露出一丝银色的瘢痕。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"79933","n":"感受进化","spr":"mon:318","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"世界在燃烧，唯有聆听宇宙嗡鸣之人才可获得救赎。","skills":[{"n":"幼虫繁育","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"毒刺散射","cd":4,"op":[{"k":"dmg","v":15.0,"hits":10}]},{"n":"蛰伏","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"79934","n":"融为一体","spr":"mon:319","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"融合的仪式中，已分不清那一块属于「你」，那一块属于「我」。","skills":[{"n":"幼虫繁育","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"毒刺散射","cd":4,"op":[{"k":"dmg","v":15.0,"hits":8}]},{"n":"蛰伏","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"79935","n":"初变者","spr":"mon:320","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"「@2仪式 」初期的人类，正跨越自身的层次，迈入生命进化的门槛。","skills":[{"n":"失控追击","cd":4,"op":[{"k":"dmg","v":5.0,"hits":2}]},{"n":"咬噬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"戳刺","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"79941","n":"蜕化者","spr":"mon:321","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「@2仪式 」后期的人类。血肉消融的痛苦里，它必将超脱人类的极限。","skills":[{"n":"毒牙","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"螫针","cd":3,"op":[{"k":"dmg","v":6.5,"hits":3}]},{"n":"认知汲取","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"79942","n":"蜕化者","spr":"mon:322","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「@2仪式 」后期的人类。血肉消融的痛苦里，它必将超脱人类的极限。","skills":[{"n":"认知汲取","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"螫针","cd":3,"op":[{"k":"dmg","v":6.5,"hits":3}]},{"n":"毒牙","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"79943","n":"「@2赐福者」","spr":"mon:323","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"爪牙所到之处，巢群意志无所不在。","skills":[{"n":"幼虫繁育","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"毒刺散射","cd":4,"op":[{"k":"dmg","v":15.0,"hits":10}]},{"n":"蛰伏","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"79944","n":"初变者","spr":"mon:324","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"「@2仪式 」初期的人类，正跨越自身的层次，迈入生命进化的门槛。","skills":[{"n":"戳刺","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"迈向新生","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"咬噬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"80576","n":"残酷的「父亲」","spr":"mon:325","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"实验品没有父母，但仍渴望有人承担「父亲」的身份。哪怕他并不称职。","skills":[{"n":"蜡像登场","cd":4,"op":[{"k":"dmg","v":12.5,"hits":1}]},{"n":"祈祷","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"灯芯长明","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"80577","n":"沉默的「母亲」","spr":"mon:326","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"实验品没有父母，但仍渴望有人承担「母亲」的身份。哪怕她并不称职。","skills":[{"n":"蜡像登场","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"隆重的接待","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":16.0},{"k":"dmg","v":8.0}]}]},{"id":"80795","n":"精神分裂患者","spr":"mon:327","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「医生、医生！你明明说过我已经痊愈，为什么我的幻视和幻听仍旧存在？」","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"创伤猛击","cd":4,"op":[{"k":"dmg","v":15.0,"hits":2}]}]},{"id":"80816","n":"至善至美","spr":"mon:328","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"扭曲的新生中，它超越自身，获得了最完美的生命形态。","skills":[{"n":"狩猎时刻","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"神经毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"80817","n":"至善至美","spr":"mon:329","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"扭曲的新生中，它超越自身，获得了最完美的生命形态。","skills":[{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"狩猎时刻","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"神经毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"80818","n":"「@2庇护者」","spr":"mon:330","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"眼目所在之处，巢群意志无所不知，","skills":[{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"狩猎时刻·破甲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"狩猎时刻·重创","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"80819","n":"拥抱进化","spr":"mon:331","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"世界在燃烧，唯有觉悟抛弃一切之人才可获得救赎。","skills":[{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"狩猎时刻·破甲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"神经毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狩猎时刻·重创","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"80957","n":"孩子王","spr":"mon:332","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"身经百战的孩子王。手里的酒瓶会造成伤口。","skills":[{"n":"强化","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":12.0,"hits":1}]}]},{"id":"81020","n":"大搜查猫","spr":"mon:333","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"某些工作不止犬科能做。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"出血爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"低吼","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"81053","n":"蜡像@2猫","spr":"mon:334","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它比犬科生物还要凶猛。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"防御·强化","cd":4,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":3}]}]},{"id":"81279","n":"「知者」","spr":"mon:335","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"从你的记忆中提取的虚无幻影，你知道那并不是真实。","skills":[{"n":"弱点打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻势推演","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"女王之剑","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"81358","n":"蜕化者","spr":"mon:336","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「@2仪式 」后期的人类。血肉消融的痛苦里，它必将超脱人类的极限。","skills":[{"n":"螫针","cd":3,"op":[{"k":"dmg","v":6.5,"hits":3}]},{"n":"认知汲取","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"毒牙","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"81361","n":"至善至美","spr":"mon:337","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"扭曲的新生中，它超越自身，获得了最完美的生命形态。","skills":[{"n":"心智寄生","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"狩猎时刻","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"神经毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"81366","n":"蜕化者","spr":"mon:338","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"「@2仪式 」后期的人类。血肉消融的痛苦里，它必将超脱人类的极限。","skills":[{"n":"螫针","cd":3,"op":[{"k":"dmg","v":6.5,"hits":3}]},{"n":"认知汲取","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"毒牙","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"84437","n":"「冷光」","spr":"mon:339","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"测算、规划、挥舞旗帜。她会不计一切代价，完成自己的使命！","skills":[{"n":"惩戒雷霆","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"混沌旗语","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"89528","n":"剑术教官","spr":"mon:340","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"从所有协定国中选拔出的剑术精英，请小心应对。","skills":[{"n":"败血","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"剑势","cd":4,"op":[{"k":"str","v":1.0}]},{"n":"割裂之刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5},{"k":"poison","v":1.6}]},{"n":"破甲之刃","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]}]},{"id":"91739","n":"「圣子·黑羽」","spr":"mon:341","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「我会夺回我们的自由，波吕克斯……」","skills":[{"n":"黑羽","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"蔽日之羽","cd":3,"op":[{"k":"shield","v":12.0}]}]},{"id":"94654","n":"腐尸分殖体","spr":"mon:342","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"葬骸城秘术制造出的产物。一位一往无前的战士，一道差强人意的甜点。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"诅咒","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"钉刺","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]}]},{"id":"94679","n":"腐尸分殖体","spr":"mon:343","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"葬骸城秘术制造出的产物。一位一往无前的战士，一道差强人意的甜点。","skills":[{"n":"钉刺","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"诅咒","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"94680","n":"腐尸分殖体","spr":"mon:344","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"葬骸城秘术制造出的产物。一位一往无前的战士，一道差强人意的甜点。","skills":[{"n":"诅咒","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"钉刺","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"94700","n":"深海分殖体","spr":"mon:345","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蹈海者用葬骸城秘术制造出的产物，拥有蹈海者需要的一切……除了信仰。","skills":[{"n":"海祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"污浊","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"94701","n":"深海分殖体","spr":"mon:346","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蹈海者用葬骸城秘术制造出的产物，拥有蹈海者需要的一切……除了信仰。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"海祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"污浊","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"94702","n":"深海分殖体","spr":"mon:347","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蹈海者用葬骸城秘术制造出的产物，拥有蹈海者需要的一切……除了信仰。","skills":[{"n":"污浊","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"海祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"自爆","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"94715","n":"食尸鬼侍从","spr":"mon:348","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"葬骸城随处可见的居民，拙劣的食客，粗粝的食材。","skills":[{"n":"尸染","cd":4,"op":[{"k":"dmg","v":4.0,"hits":15}]},{"n":"掘墓","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"盛宴","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"94716","n":"食尸鬼卫队长","spr":"mon:349","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"没有任何可为人称道的天赋，只有甘愿为王城献身的勇气。","skills":[{"n":"尸染","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"墓碑之嚎","cd":4,"op":[{"k":"dmg","v":15.0,"hits":3}]},{"n":"盛宴","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"94717","n":"食尸鬼护卫","spr":"mon:350","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"他为看护王邸、也为看护王邸中的餐点而战。","skills":[{"n":"尸染","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"掘墓","cd":4,"op":[{"k":"dmg","v":15.0,"hits":2}]},{"n":"墓群的召唤","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"盛宴","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"94718","n":"食尸鬼侍从","spr":"mon:351","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"葬骸城随处可见的居民，拙劣的食客，粗粝的食材。","skills":[{"n":"盛宴","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"尸染","cd":4,"op":[{"k":"dmg","v":4.0,"hits":15}]},{"n":"掘墓","cd":4,"op":[{"k":"dmg","v":15.0,"hits":2}]}]},{"id":"94940","n":"「王邸管家」弗兰","spr":"mon:352","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"长相厮守的誓言，早在竭诚尽忠之前。","skills":[{"n":"灵魂封存","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"蚀灵","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"噬骨之刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"94941","n":"蹈海者之骸","spr":"mon:353","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"他们仍活着，他们已死去。他们苦难的大脑中仅剩唯一的记忆——唯有吾主的目光，能将痛苦驱离。","skills":[{"n":"灵魂侵吞","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]},{"n":"海洋的召唤","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"贪欲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"怒海狂涛","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"94942","n":"殉道者","spr":"mon:354","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"他们执行神明的意志，没有人在意生存与毁灭，没有人在意错误与正确。","skills":[{"n":"灵魂侵吞","cd":4,"op":[{"k":"dmg","v":8.0,"hits":20}]},{"n":"海洋的召唤","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"贪欲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"94943","n":"「瞑海祭司」","spr":"mon:355","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"聆听吾主。归依……吾主！","skills":[{"n":"灵魂侵吞","cd":4,"op":[{"k":"dmg","v":8.0,"hits":30}]},{"n":"深海的呼唤","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"贪欲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"94944","n":"墓穴督工","spr":"mon:356","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"天赋出众的食尸鬼，承担着王邸的期许——有什么工作比制作精良的食物储存地更加重要？","skills":[{"n":"撕裂之爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"蚀灵","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"刺骨","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"饥饿意志","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"94945","n":"骸骨哨卫","spr":"mon:357","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"他守护族人腐朽的尸骨。他守护同伴不舍的魂灵。","skills":[{"n":"撕裂之爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"蚀灵","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"刺骨","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"饥饿意志","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"95784","n":"「葬骸之主」","spr":"mon:358","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「粗鲁的动作可不符合客人应有的礼仪，守密人阁下。」","skills":[{"n":"残骸收取","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"亡骸祭礼","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"冥府之路","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"96000","n":"倒错的画作","spr":"mon:359","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"艺术，是疯狂的书面用语。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"96324","n":"「无尽饥渊」","spr":"mon:360","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"王邸祭坛的祭司，为亡故的尸骸安葬。依悲鸣的记忆所愿，将他们献予葬骸城的王。","skills":[{"n":"撕裂之爪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"蚀灵","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"刺骨","cd":4,"op":[{"k":"dmg","v":4.0,"hits":35}]}]},{"id":"96656","n":"追随者","spr":"mon:361","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们追随柯蕾特的身影。","skills":[{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.0}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]}]},{"id":"96657","n":"伯爵夫人","spr":"mon:362","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"「亲爱的伯爵夫人，我曾经的渴望。而如今，你已成为了我忠实的侍卫。替我向她，献上一首诗吧。」","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"96658","n":"渴求者","spr":"mon:363","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们渴求柯蕾特的恩典。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]},{"n":"攻防兼备","cd":4,"op":[{"k":"shield","v":12.0},{"k":"dmg","v":6.0}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"96659","n":"诗中人","spr":"mon:364","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"坚定的拥护者，这是她能写出的全部意象。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":5.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"98056","n":"「沉睡之主」","spr":"mon:365","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"群星正位之刻，他将结束亿万年的沉眠，荣归祂的王座。而这是否是他心中所愿，便无人知晓了。","skills":[{"n":"撕咬","cd":3,"op":[{"k":"dmg","v":6}]}]},{"id":"98118","n":"「爆燃之主」","spr":"mon:366","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「统御无数炎精的爆燃之主，会伴随琥珀色的火焰从极天坠下。当祂降临之时，所有的一切都会迎来平等的死亡。」","skills":[{"n":"千兆耀斑","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"末路枪声","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"98702","n":"「迷宫蛛」","spr":"mon:367","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"踏入蜘蛛领地的人类终将在无数通道和入口中迷失方向。","skills":[{"n":"苍白回旋","cd":3,"op":[{"k":"dmg","v":4.0,"hits":20}]},{"n":"不耐的施舍","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"打击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":50}]}]},{"id":"99114","n":"「绘者」","spr":"mon:368","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"我会向你展现这世界的真相……","skills":[{"n":"蚀骨色彩","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"绘影摹形","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"117855","n":"恶咒幼鱼","spr":"mon:369","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"受祭仪影响发生畸变，散播厄运不幸的幼鱼。","skills":[{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"117856","n":"秽血幼鱼","spr":"mon:370","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"受祭仪影响发生畸变，传承污秽血脉的幼鱼。","skills":[{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"117857","n":"腐溃幼鱼","spr":"mon:371","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"受祭仪影响发生畸变，通体腐烂溃败的幼鱼。","skills":[{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"117858","n":"腐溃鱼潮","spr":"mon:372","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"腐溃的幼鱼聚集，形成恶臭糜烂的鱼潮。","skills":[{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"117859","n":"秽血鱼潮","spr":"mon:373","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"秽血的幼鱼聚集，形成污秽亵渎的鱼潮。","skills":[{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"117860","n":"恶咒鱼潮","spr":"mon:374","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"恶咒的幼鱼聚集，形成散播灾厄的鱼潮。","skills":[{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"118019","n":"提灯信徒","spr":"mon:375","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"提灯教会的普通教众，因信仰而远离家乡，来到此处。","skills":[{"n":"提灯明照","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]},{"n":"灵智污染","cd":4,"op":[{"k":"dmg","v":15.0,"hits":1}]},{"n":"燃已灯芯","cd":3,"op":[{"k":"str","v":4.0}]},{"n":"罪孽鞭挞","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]}]},{"id":"118020","n":"「祭品」","spr":"mon:376","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"无论它之前是何身份，现在都只是等待「神使」附身的祭仪道具。","skills":[{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]}]},{"id":"118021","n":"布道者","spr":"mon:377","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"由「主祭」创造的畸形存在，实力弱小，随处可见。","skills":[{"n":"噬咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"乞灵之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"怨毒复仇","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"绞杀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118022","n":"「护灯尊者」","spr":"mon:378","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「愿提灯长明……」","skills":[{"n":"提灯明照","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"燃已灯芯","cd":3,"op":[{"k":"str","v":10.0}]},{"n":"深海助祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"罪孽鞭挞","cd":4,"op":[{"k":"dmg","v":16.0,"hits":3}]}]},{"id":"118023","n":"神选者","spr":"mon:379","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"由「主祭」创造的畸形存在，因其绝对的忠诚而受到「主祭」驱使。","skills":[{"n":"群蛇噬魂","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"乞灵之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"怨毒复仇","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"绞杀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118024","n":"「祝圣司铎」","spr":"mon:380","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"由「主祭」创造的畸形存在，实力强大，深受「主祭」信赖。","skills":[{"n":"群蛇噬魂","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"乞灵之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"怨毒复仇","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"绞杀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118025","n":"贴身管家","spr":"mon:381","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"为了更接近「神母」意志而改变自身形态的仆从，愿意为「神母」献出一切。","skills":[{"n":"腐骨重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"触足壁垒","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"触腕捕食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"蓝环毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118026","n":"「谕令神官」","spr":"mon:382","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"为了更接近「神母」意志而改变自身形态的仆从，职责是确保「神母」的谕令得以传达与执行。","skills":[{"n":"腐骨重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"触足壁垒","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"触腕捕食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"蓝环毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118027","n":"普通仆役","spr":"mon:383","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"为了更接近「神母」意志而改变自身形态的仆从，以自身的使命为荣。","skills":[{"n":"腐骨重击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"触足壁垒","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"触腕捕食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"蓝环毒素","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"118029","n":"「深海淑女」","spr":"mon:384","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"「我不是第一个被献祭的母体，也不是最后的一个……但是，我想活下去！」","skills":[{"n":"圣女作成","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"螺湮逆流","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"118030","n":"提灯虔诚者","spr":"mon:385","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"信奉「燃己的灯芯必定得到救赎」的虔诚者，因信仰而无所畏惧。","skills":[{"n":"提灯明照","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"重创刺骨","cd":4,"op":[{"k":"dmg","v":15.0,"hits":2}]},{"n":"燃已灯芯","cd":3,"op":[{"k":"str","v":6.0}]},{"n":"深海助祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]}]},{"id":"118031","n":"「海之使徒」","spr":"mon:386","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"此刻，她的所作所为并非出于精神维度感染的疯狂，而是出于对神明最为虔诚的信仰。","skills":[{"n":"无上生祭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"神眷之刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"试探","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":2.4}]},{"n":"应选之人","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"118032","n":"「海嗣神母」","spr":"mon:387","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"曾经软弱天真的「她」已经死去，现在的她，是尊贵的「神母」，是不可违抗的「天后」。","skills":[{"n":"深海圣咏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"螺湮圆舞","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"118033","n":"「祭品」","spr":"mon:388","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"无论它之前是何身份，现在都只是等待「神使」附身的祭仪道具。","skills":[{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"118644","n":"恶咒鱼潮","spr":"mon:389","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"恶咒的幼鱼聚集，形成散播灾厄的鱼潮。","skills":[{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"118645","n":"腐溃鱼潮","spr":"mon:390","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"腐溃的幼鱼聚集，形成恶臭糜烂的鱼潮。","skills":[{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"118646","n":"秽血鱼潮","spr":"mon:391","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"秽血的幼鱼聚集，形成污秽亵渎的鱼潮。","skills":[{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"118647","n":"「神使？」","spr":"mon:392","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"可悲的失败品。它孱弱的躯壳不足以承载「神使」的力量。","skills":[{"n":"母体搜寻","cd":4,"op":[{"k":"shield","v":8.0},{"k":"dmg","v":11.2}]},{"n":"创口撕扯","cd":3,"op":[{"k":"dmg","v":8.0,"hits":2}]},{"n":"寄生","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"119068","n":"「巨刃之影」","spr":"mon:393","rank":"normal","rankZh":"普通","size":"Middle","bt":"Boss","desc":"以巨人之力挥动重刃的强大战士，因自身的野心，追随着「主祭」的步伐。","skills":[{"n":"巨刃之威-血","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1},{"k":"poison","v":2.4}]},{"n":"巨刃之威-力","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"巨刃之威-终","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"119069","n":"「沉渊之影」","spr":"mon:394","rank":"normal","rankZh":"普通","size":"Middle","bt":"Boss","desc":"现在，就是昭示深海血脉力量的时刻。他会让戈利亚大人看到自己的实力。","skills":[{"n":"破碎沉戟","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"119849","n":"「沉渊者」","spr":"mon:395","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"现在，就是昭示深海血脉力量的时刻。他会让戈利亚大人看到自己的实力。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"破碎沉戟","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"119850","n":"「原初信徒」","spr":"mon:396","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"一切，都是为了筑成通往神国的道路。","skills":[{"n":"狂热之海","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"深邃暗流","cd":3,"op":[{"k":"str","v":1.0}]}]},{"id":"119851","n":"「复仇巨刃」","spr":"mon:397","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"以巨人之力挥动重刃的强大战士，因自身的野心，追随着「主祭」的步伐。","skills":[{"n":"斩首重创","cd":3,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"强者为尊","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"海渊之力","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"巨刃之威-血","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1},{"k":"poison","v":2.4}]}]},{"id":"119852","n":"恶咒胎群","spr":"mon:398","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"裂伤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"殉身","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"119853","n":"腐溃胎群","spr":"mon:399","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"脆弱毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"119854","n":"秽血胎群","spr":"mon:400","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"初生之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"119953","n":"腐溃胎群","spr":"mon:401","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"脆弱毒素","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"119954","n":"恶咒胎群","spr":"mon:402","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"裂伤","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"殉身","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"119955","n":"秽血胎群","spr":"mon:403","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"偶尔，弥利亚姆也会思考这究竟是轮回的赘生物，还是神明承认她虔诚的证明？","skills":[{"n":"初生之咒","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":20.0,"hits":1}]}]},{"id":"120305","n":"恶咒鱼王","spr":"mon:404","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，总有一日，不幸与灾厄将遍布世界。","skills":[{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"120306","n":"恶咒鱼王","spr":"mon:405","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，总有一日，不幸与灾厄将遍布世界。","skills":[{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"120307","n":"腐溃鱼王","spr":"mon:406","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，这溃烂的身躯因信仰而不朽。","skills":[{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"120308","n":"秽血鱼王","spr":"mon:407","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，这污秽的血脉日渐茁壮。","skills":[{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"120309","n":"秽血鱼王","spr":"mon:408","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，这污秽的血脉日渐茁壮。","skills":[{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]}]},{"id":"120310","n":"腐溃鱼王","spr":"mon:409","rank":"boss","rankZh":"首领","size":"Mini","bt":"Boss","desc":"幼鱼已经成王，这溃烂的身躯因信仰而不朽。","skills":[{"n":"挥击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"污秽血祭","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"深渊祝告","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"120341","n":"水手的哀恸","spr":"mon:410","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"曾随着货轮一同沉入深海的水手，这份哀伤的记忆永远刻印在了船上，永不消散。","skills":[{"n":"溺毙之怨","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"清扫","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"呼啸","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"120342","n":"水手的恸哭","spr":"mon:411","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade1","desc":"曾随着货轮一同沉入深海的水手，这滴痛苦的眼泪与船融为一体，永不分离。","skills":[{"n":"遗恨围捕","cd":3,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"航海料理","cd":4,"op":[{"k":"shield","v":12.0}]},{"n":"意外身故","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"120904","n":"「原初信徒」","spr":"mon:412","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"驻守永恒之国入口之人，指引归乡者的灯塔。","skills":[{"n":"狂热之海","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"深邃暗流","cd":3,"op":[{"k":"str","v":1.0}]}]},{"id":"120905","n":"「信徒之影」","spr":"mon:413","rank":"normal","rankZh":"普通","size":"Middle","bt":"Boss","desc":"一切，都是为了筑成通往神国的道路。","skills":[{"n":"狂热之海","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]}]},{"id":"120935","n":"「福音执事」","spr":"mon:414","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"将自身一切都献于神明的祭祀，其意志不可动摇，其信仰坚不可摧。","skills":[{"n":"灵魂侵吞","cd":4,"op":[{"k":"dmg","v":8.0,"hits":30}]},{"n":"深海的呼唤","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"贪欲","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"122412","n":"「雾中骇兽」","spr":"mon:415","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"被「繁星黎明会」召唤来的异世界少女，可爱的外表之下埋藏着凡人难以理解的疯狂。","skills":[{"n":"风暴冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"人间爆破","cd":4,"op":[{"k":"dmg","v":4.0,"hits":4}]}]},{"id":"125901","n":"「门之钥」","spr":"mon:416","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"穷极之门的守护者，时空之外的存在，绝对智识的象征。","skills":[{"n":"纵贯时序之翼","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"双翼初张","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"126444","n":"「青炎舞者」","spr":"mon:417","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"对芭蕾的爱，对艺术的崇敬……舞者将以焚尽污浊的绿焰尽数诉说。","skills":[{"n":"诱蛾之火","cd":4,"op":[{"k":"shield","v":24.0}]},{"n":"绿炎","cd":4,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"告死之舞","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"127225","n":"吞噬之吠","spr":"mon:418","rank":"boss","rankZh":"首领","size":"Middle","bt":"Boss","desc":"因融蚀加深而变得狂躁的流浪犬，它的攻击迅猛而连续，让人难以招架。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":4}]},{"n":"连续撕咬","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"疯狂","cd":4,"op":[{"k":"str","v":1.0}]}]},{"id":"127695","n":"渊狱之蛛","spr":"mon:419","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"127696","n":"渊狱之蛛","spr":"mon:420","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"127697","n":"渊狱之蛛","spr":"mon:421","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]}]},{"id":"128017","n":"冷蛛","spr":"mon:422","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]}]},{"id":"128018","n":"冷蛛","spr":"mon:423","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"128019","n":"冷蛛","spr":"mon:424","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"128045","n":"冷蛛侍女","spr":"mon:425","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"被赐予人形外壳的冷蛛，穿戴整洁地穿行于命运剧院的舞台之间。命运的操控者从不强迫木偶成为她的侍女，但她们总是心甘情愿地选择这条属于自己的道路。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"128047","n":"量体师","spr":"mon:426","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"侍女中被授权「度量」命运的个体。她丈量每一段命运的分量，向命运的操控者报告那些线缕的错乱。至于之后将发生的，她从不关心。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"128223","n":"剪裁师","spr":"mon:427","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"渊狱中的并没有可供剪断之物。她与她疯狂的主人一同等待，等待能够亲手剪断命运的那一天。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"128224","n":"渊狱侍从","spr":"mon:428","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"坠入渊狱的侍女，依然保持着侍女的姿势，在苦痛的虚空中重复擦拭、整理、微笑，侍奉一座早已不复存在的舞台。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"128551","n":"迷途之人","spr":"mon:429","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"每一张脸，都曾是某个世界、某个人的一生。","skills":[{"n":"哀悯之茧","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂喜之茧","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"暴怒之茧","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"惊惧之茧","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"129602","n":"噬线集群","spr":"mon:430","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"大量破碎的命运汇聚在一起，互相撕咬、吞噬，拧成一团无法辨认原貌的风暴。每一根丝线都在试图成为唯一的正确命运，每一根都注定失败。","skills":[{"n":"哀悯之茧","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂喜之茧","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"暴怒之茧","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"惊惧之茧","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"129776","n":"「复仇巨刃」","spr":"mon:431","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"以巨人之力挥动重刃的强大战士。","skills":[{"n":"斩首重创","cd":3,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"强者为尊","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"海渊之力","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"巨刃之威-血","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1},{"k":"poison","v":2.4}]}]},{"id":"129777","n":"「美德骑士」","spr":"mon:432","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"年幼的骑士曾向你宣誓效忠，他从未背弃他的誓言。","skills":[{"n":"盾裂冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"穿刺之枪","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"不定壁垒","cd":4,"op":[{"k":"shield","v":8.0}]}]},{"id":"129778","n":"「知者」","spr":"mon:433","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"无需任何词汇描述她。她是拉蒙娜。斩断与她的链接吧。","skills":[{"n":"弱点打击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"攻势推演","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"女王之剑","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"129779","n":"「海嗣神母」","spr":"mon:434","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"曾经软弱天真的「她」已经死去，现在的她，是尊贵的「神母」，是不可违抗的「天后」。","skills":[{"n":"深海圣咏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"螺湮圆舞","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"129780","n":"「缸中之脑」","spr":"mon:435","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"她的声音从通讯器中响起时，是你任务中最安心的时刻。卓越的智慧，你已依赖得够多。","skills":[{"n":"打击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"外域手术","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"等价交换","cd":4,"op":[{"k":"dmg","v":5.0,"hits":20}]}]},{"id":"129781","n":"「沉睡之主」","spr":"mon:436","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"群星正位之刻，他将结束亿万年的沉眠，荣归祂的王座。而这是否是他心中所愿，便无人知晓了。","skills":[{"n":"撕咬","cd":3,"op":[{"k":"dmg","v":6}]}]},{"id":"129782","n":"「嘀嗒人」","spr":"mon:437","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"艾瑞卡已经完全失去了自我的意识……是受黑池的影响吗？","skills":[{"n":"机械武装-放","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"机能过载","cd":4,"op":[{"k":"shield","v":3.2},{"k":"dmg","v":2.4}]},{"n":"打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"129783","n":"「猎颅魔女」","spr":"mon:438","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"来自过去的神秘商人，喜欢通过交易丈量一切。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"断颈一击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"防御","cd":3,"op":[{"k":"shield","v":16.0}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"129784","n":"「甜蜜恶鬼」","spr":"mon:439","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"擅长调教的活泼少女。已经拥有102个奴隶，正在寻觅命中注定的下一位。","skills":[{"n":"狂气使役之鞭","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"灼燃蜡滴之欲","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"129785","n":"「葬骸之主」","spr":"mon:440","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"「粗鲁的动作可不符合客人应有的礼仪，守密人阁下。」","skills":[{"n":"残骸收取","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"亡骸祭礼","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"冥府之路","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"129786","n":"「原初信徒」","spr":"mon:441","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"驻守永恒之国入口之人，指引归乡者的灯塔。","skills":[{"n":"狂热之海","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"深邃暗流","cd":3,"op":[{"k":"str","v":1.0}]}]},{"id":"129787","n":"「窜行者」","spr":"mon:442","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"她神出鬼没，对东区的每一个街巷都了若指掌，她就是「窜行者」。","skills":[{"n":"鼠群冲击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"布朗出动！","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"129788","n":"「24」","spr":"mon:443","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"自蜡像中爬出的神秘女士。她的大脑十分拥挤，疑似歇斯底里症晚期患者。","skills":[{"n":"救救我","cd":3,"op":[{"k":"dmg","v":5.0,"hits":1}]},{"n":"纷乱切割","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"129789","n":"「@2奏者」","spr":"mon:444","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"指挥棒的轨迹之下，究竟隐藏着什么样的乐曲？","skills":[{"n":"追忆回旋曲\n算力 ≥2","cd":4,"op":[{"k":"str","v":0.5}]},{"n":"下行音\n算力 1","cd":4,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"灵魂序曲\n算力 0","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"上行音\n算力 3","cd":4,"op":[{"k":"dmg","v":10.0,"hits":15}]}]},{"id":"129790","n":"「沉渊者」","spr":"mon:445","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"与蹈海者同行的神秘少年。嶙峋的棘刺，似鱼的耳鳍，一切都暗示着他并非常人。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"破碎沉戟","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"129791","n":"「丰穰之息」","spr":"mon:446","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"「击溃它们，安抚它们，即使你窥见我的幻影，也在所不惜。」","skills":[{"n":"古老的爱抚","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"129792","n":"「破链者」","spr":"mon:447","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"迅捷如风的唤醒体杀手，自称希洛。她和莉莉之间似乎有什么微妙的联系……","skills":[{"n":"绵长恨怨","cd":3,"op":[{"k":"dmg","v":10.0,"hits":1}]},{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"129793","n":"「石之眼」","spr":"mon:448","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"为了希望守护的人，她也可以变得坚强。请确保有足够的算力来应对其凝滞诅咒。","skills":[{"n":"凝滞诅咒","cd":4,"op":[{"k":"dmg","v":6.5,"hits":2}]},{"n":"小小愿望","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"129794","n":"「空想利刃」","spr":"mon:449","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"亚兰族族长，她将以自身为旗、为刃、为盾，指引亚兰的子民，开辟未来的道路，守候她的归来。","skills":[{"n":"心眼利刃","cd":4,"op":[{"k":"dmg","v":14.0,"hits":1}]},{"n":"增幅打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"临战体势","cd":4,"op":[{"k":"shield","v":4.0}]}]},{"id":"129795","n":"「绘者」","spr":"mon:450","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"我会向你展现这世界的真相……","skills":[{"n":"蚀骨色彩","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"绘影摹形","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"129796","n":"「淤泥之花」","spr":"mon:451","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"因怪异的低语声而陷入疯狂的少女莉莉。","skills":[{"n":"攻击","cd":3,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"报偿打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"129797","n":"「深海淑女」","spr":"mon:452","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"「我不是第一个被献祭的母体，也不是最后的一个……但是，我想活下去！」","skills":[{"n":"圣女作成","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"打击","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"螺湮逆流","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"129798","n":"「催眠妖虫」","spr":"mon:453","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"总是十分温柔的心理医生，无论何时都保持着得体的微笑。","skills":[{"n":"心理绞杀","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"痛苦榨取","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"精神抚慰","cd":5,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"129799","n":"「奇术师」","spr":"mon:454","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"天哪！我的《伦蒂尼恩犯罪实录》放哪了？！这可是我千辛万苦才从警局借来的——在图书管理员的哀嚎中，魔术大师卡茜亚正从知识的海洋中，汲取新的「情绪」。","skills":[{"n":"魔术嘉年华","cd":4,"op":[{"k":"dmg","v":4.0,"hits":5}]},{"n":"魔术牌：衰弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"统统消失！","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"魔术牌：穿破","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"129821","n":"「永恒之网」","spr":"mon:455","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"网的主人。网的囚徒。","skills":[{"n":"永恒织造","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"无尽线缕","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"缚命罗网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131179","n":"冷蛛","spr":"mon:456","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131180","n":"冷蛛","spr":"mon:457","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131181","n":"渊狱之蛛","spr":"mon:458","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131182","n":"渊狱之蛛","spr":"mon:459","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]}]},{"id":"131183","n":"冷蛛","spr":"mon:460","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"由人类转化而成，阿拉克涅侍女的蜘蛛形态。它们挂载着命运的丝缕，为阿拉克涅编织那张无垠的巨网。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]}]},{"id":"131184","n":"渊狱之蛛","spr":"mon:461","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"被丢入渊狱的错误命运的残片，在涅芙蕾亚的意志下凝结成了蜘蛛的形态。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":12.0,"hits":2}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131420","n":"冷蛛群","spr":"mon:462","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131421","n":"渊狱蜘群","spr":"mon:463","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131422","n":"冷蛛群","spr":"mon:464","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131423","n":"渊狱蜘群","spr":"mon:465","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131424","n":"冷蛛群","spr":"mon:466","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131425","n":"冷蛛群","spr":"mon:467","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131426","n":"渊狱蜘群","spr":"mon:468","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131427","n":"冷蛛群","spr":"mon:469","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131428","n":"渊狱蜘群","spr":"mon:470","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131429","n":"渊狱蜘群","spr":"mon:471","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131430","n":"冷蛛群","spr":"mon:472","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131431","n":"渊狱蜘群","spr":"mon:473","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131440","n":"缠丝母体","spr":"mon:474","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131441","n":"碎相母体","spr":"mon:475","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131442","n":"「缚命人」","spr":"mon:476","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"一位曾经的织幕者，阿拉克涅身边最亲近的侍女。她或许曾理解命运女神的决定，而在渊狱中的无数年里，残留在这具躯壳中的，只剩疯狂与仇恨。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"131443","n":"「命运残兆」","spr":"mon:477","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"渊狱的梦境里，被遗弃的命运们看到了自己的丝线。它们哀嚎着，沿着那条脆弱的丝线，蠕动向它们的来处。亲爱的命运母亲啊……您可有听见我们的呼唤？","skills":[{"n":"哀悯之茧","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂喜之茧","cd":3,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"暴怒之茧","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"惊惧之茧","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"131445","n":"缠丝母体","spr":"mon:478","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131446","n":"碎相母体","spr":"mon:479","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131447","n":"「织幕者」","spr":"mon:480","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"命运女神的亲侍。她亲手为舞台织造幕布，帮助命运的女神，为一个世界编写开场与落幕。每一座她经手的舞台都运行得精确而冷酷，如同她主人的意志本身。","skills":[{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"131448","n":"缠丝母体","spr":"mon:481","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131449","n":"碎相母体","spr":"mon:482","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131629","n":"缠丝母体","spr":"mon:483","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131630","n":"碎相母体","spr":"mon:484","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131631","n":"缠丝母体","spr":"mon:485","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131632","n":"碎相母体","spr":"mon:486","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131633","n":"碎相母体","spr":"mon:487","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131634","n":"缠丝母体","spr":"mon:488","rank":"elite","rankZh":"精英","size":"Mini","bt":"Elite","desc":"冷蛛群的核心，以自身为锚点吸收着周围散落的维度余烬，产出新的冷蛛个体。阿拉克涅偶尔会将一段完整的命运丝线赐予它——这是一只冷蛛所能触及的最高恩赏。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131822","n":"「门之钥」","spr":"mon:489","rank":"elite","rankZh":"精英","size":"Big","bt":"Elite","desc":"穷极之门的守护者，时空之外的存在，绝对智识的象征。","skills":[{"n":"纵贯时序之翼","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"双翼初张","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2}]}]},{"id":"131839","n":"渊狱蜘群","spr":"mon:490","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131840","n":"冷蛛群","spr":"mon:491","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131841","n":"渊狱蜘群","spr":"mon:492","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"131842","n":"冷蛛群","spr":"mon:493","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]},{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]}]},{"id":"131843","n":"渊狱蜘群","spr":"mon:494","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"它们模仿着冷蛛的姿态行走，却没有丝线可供攀附。无主的仆从，侍奉着一个已被删除的未来。","skills":[{"n":"黑死之吻","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"裂解","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131844","n":"冷蛛群","spr":"mon:495","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"冷蛛的集群，命运之网的分子。那诸多蛛体凝集而成的，便是命运本身。","skills":[{"n":"幻毒侵蚀","cd":4,"op":[{"k":"dmg","v":16.0,"hits":1}]},{"n":"暗影缠丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"淬毒涎液","cd":4,"op":[{"k":"dmg","v":5.0,"hits":10}]}]},{"id":"131883","n":"「织幕者」","spr":"mon:496","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"命运女神的亲侍。她亲手为舞台织造幕布，帮助命运的女神，为一个世界编写开场与落幕。每一座她经手的舞台都运行得精确而冷酷，如同她主人的意志本身。","skills":[{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"131884","n":"量体师","spr":"mon:497","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"侍女中被授权「度量」命运的个体。她丈量每一段命运的分量，向命运的操控者报告那些线缕的错乱。至于之后将发生的，她从不关心。","skills":[{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"131885","n":"剪裁师","spr":"mon:498","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"渊狱中的并没有可供剪断之物。她与她疯狂的主人一同等待，等待能够亲手剪断命运的那一天。","skills":[{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"131886","n":"渊狱侍从","spr":"mon:499","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"坠入渊狱的侍女，依然保持着侍女的姿势，在苦痛的虚空中重复擦拭、整理、微笑，侍奉一座早已不复存在的舞台。","skills":[{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"131887","n":"冷蛛侍女","spr":"mon:500","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"被赐予人形外壳的冷蛛，穿戴整洁地穿行于命运剧院的舞台之间。命运的操控者从不强迫木偶成为她的侍女，但她们总是心甘情愿地选择这条属于自己的道路。","skills":[{"n":"束缚之网","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"衰朽","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]}]},{"id":"131888","n":"「缚命人」","spr":"mon:501","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"一位曾经的织幕者，阿拉克涅身边最亲近的侍女。她或许曾理解命运女神的决定，而在渊狱中的无数年里，残留在这具躯壳中的，只剩疯狂与仇恨。","skills":[{"n":"崩解之丝","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]},{"n":"狂热凿击","cd":4,"op":[{"k":"dmg","v":8.0,"hits":4}]},{"n":"坏灭","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"140572","n":"融蚀-诗中人","spr":"mon:502","rank":"normal","rankZh":"普通","size":"Big","bt":"MonsterGrade2","desc":"坚定的拥护者，这是她能写出的全部意象。","skills":[{"n":"攻击·强化","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":5.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":3}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"140581","n":"融蚀-追随者","spr":"mon:503","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们追随柯蕾特的身影。","skills":[{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]}]},{"id":"140582","n":"融蚀-渴求者","spr":"mon:504","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"在诗中的西岱，他们渴求柯蕾特的恩典。","skills":[{"n":"重击","cd":4,"op":[{"k":"dmg","v":13.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":7.5,"hits":1}]},{"n":"攻击·削弱","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"140713","n":"榖ｦ圣7ﾋ肉ｸk塊Q","spr":"mon:505","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"难ﾃ以ｨ分A辨ﾑ爨轮9廓ｴ的ﾅ肉ｷ块z,ﾉ散ｲ发驫出8令ﾃP人ｬ厌ﾗ憎ｸ的ﾎ靇恶ﾑ臭w味ｦ。 不J知ﾒ为ｩ何ﾇ,ｯ对7你ﾘ表L现ﾝ出Q亲ｱ近ﾏ。","skills":[{"n":"觅ｦ人良ﾋ","cd":3,"op":[{"k":"dmg","v":4.0,"hits":2}]},{"n":"応ｸkQ","cd":4,"op":[{"k":"weaken","v":0.18,"t":3}]}]},{"id":"141068","n":"「@2：万象门扉」","spr":"mon:506","rank":"boss","rankZh":"首领","size":"Huge","bt":"Boss","desc":"智之质体的代行者。知识权柄的拥有者。弥萨格的指引者。令人恐惧的敌人。","skills":[{"n":"展翼","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"双翼初张","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"四翼渐生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"六翼满开","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"147675","n":"「白雪仙女」","spr":"mon:507","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"别被她楚楚可怜的模样骗了——所谓「赐福」，从来都是她精心编织的又一场谎言。","skills":[{"n":"粉雪魔咒","cd":4,"op":[{"k":"dmg","v":12.0,"hits":1}]},{"n":"打击","cd":4,"op":[{"k":"dmg","v":6.0,"hits":1}]}]},{"id":"147935","n":"「圣子·白夜」","spr":"mon:508","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"稚龄的雏鸟啊，尚未学会飞翔，就已被囚笼标记了信号。","skills":[{"n":"圣心","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"离垢的审判","cd":4,"op":[{"k":"dmg","v":6.0,"hits":2}]},{"n":"明灯灼魂","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"148007","n":"「索魂者」","spr":"mon:509","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"嗜血之物啊，挣脱锁链之时，她将许下向举世「复仇」的心愿。","skills":[{"n":"鲜血链条","cd":4,"op":[{"k":"dmg","v":12.5,"hits":1},{"k":"poison","v":5.0}]},{"n":"恨意宣泄","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"149048","n":"献予女神之物","spr":"mon:510","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"他因目睹真相而执迷，他因叙述真相而葬身。","skills":[{"n":"霜冻之咏","cd":4,"op":[{"k":"dmg","v":9.0,"hits":3}]},{"n":"急冻复苏","cd":3,"op":[{"k":"str","v":5.0}]},{"n":"碎冰飞刃","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"149068","n":"哈提","spr":"mon:511","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"追逐月亮的猛犬，祂将被冰雪封冻。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149069","n":"斯库尔","spr":"mon:512","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"追逐太阳的猛犬，祂将被烈日灼伤。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149070","n":"哈提","spr":"mon:513","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"追逐月亮的猛犬，祂将被冰雪封冻。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"149071","n":"斯库尔","spr":"mon:514","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"追逐太阳的猛犬，祂将被烈日灼伤。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"149096","n":"雪域温迪戈","spr":"mon:515","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"无论如何坚持呼唤，也无法寻回旧日温情。 它带来的仅是恐惧。","skills":[{"n":"冰刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]},{"n":"割喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]},{"n":"永冬意志","cd":3,"op":[{"k":"str","v":50.0}]}]},{"id":"149097","n":"燃灯温迪戈","spr":"mon:516","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"无论如何坚持追索，也无法点燃旧日余烬。 它进奉的仅是谎言。","skills":[{"n":"封喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]},{"n":"燃灯意志","cd":3,"op":[{"k":"str","v":50.0}]},{"n":"咒刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":35},{"k":"poison","v":1.6}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]}]},{"id":"149098","n":"斯库尔猎群","spr":"mon:517","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着巨人的血。在太阳被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"149099","n":"亡雪者集群","spr":"mon:518","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"刺穿同伴的心脏，撕咬同伴的喉咙，啃食同伴的血肉。 然后，去吞噬你们看到的一切。","skills":[{"n":"冰刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":15}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]},{"n":"割喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":20}]},{"n":"永冬意志","cd":3,"op":[{"k":"str","v":62.5}]}]},{"id":"149100","n":"哈提猎群","spr":"mon:519","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着神明的血。在月亮被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"149101","n":"斯库尔猎群","spr":"mon:520","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着巨人的血。在太阳被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]},{"id":"149102","n":"赤心圣徒","spr":"mon:521","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"她的赤心献予无心者。 挚爱世人者，永失对现世苦难的知觉。","skills":[{"n":"灯焰灼魂","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"倒映圣容","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"拥抱新生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]},{"n":"离散","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]}]},{"id":"149103","n":"怜爱世人者","spr":"mon:522","rank":"elite","rankZh":"精英","size":"Big","bt":"MonsterGrade2","desc":"神以她之手怜爱世人。神以她之手埋葬世人。","skills":[{"n":"离散","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"灯焰灼魂","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"倒映圣容","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"拥抱新生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"149104","n":"斯库尔猎群","spr":"mon:523","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着巨人的血。在太阳被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149105","n":"噬灯者集群","spr":"mon:524","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"献上心脏作灯芯，献上喉咙作灯座，献上血肉作灯油。 啊，虔诚的旅人，温迪戈们将以此灯为你祈祷。","skills":[{"n":"封喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":20}]},{"n":"燃灯意志","cd":3,"op":[{"k":"str","v":62.5}]},{"n":"咒刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":50},{"k":"poison","v":1.6}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]}]},{"id":"149106","n":"无瑕的怜心","spr":"mon:525","rank":"boss","rankZh":"首领","size":"Big","bt":"MonsterGrade2","desc":"不必害怕，信徒。一切现世的苦难，都是通往神国的台阶。","skills":[{"n":"离散","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"灯焰灼魂","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"倒映圣容","cd":3,"op":[{"k":"str","v":1.0}]},{"n":"拥抱新生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"149107","n":"斯库尔猎群","spr":"mon:526","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着巨人的血。在太阳被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":2},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149108","n":"终夜之主","spr":"mon:527","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"一切的灯火都照不出黎明——无尽的终夜，已降临你身前。","skills":[{"n":"封喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":25}]},{"n":"燃灯意志","cd":3,"op":[{"k":"str","v":75.0}]},{"n":"咒刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":100},{"k":"poison","v":1.6}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]}]},{"id":"149109","n":"赤心圣徒","spr":"mon:528","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"她的赤心献予无心者。 挚爱世人者，永失对现世苦难的知觉。","skills":[{"n":"离散","cd":4,"op":[{"k":"dmg","v":9.0,"hits":1}]},{"n":"灯焰灼魂","cd":4,"op":[{"k":"dmg","v":7.0,"hits":1},{"k":"poison","v":2.8}]},{"n":"倒映圣容","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"拥抱新生","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1}]}]},{"id":"149110","n":"亡雪者集群","spr":"mon:529","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"刺穿同伴的心脏，撕咬同伴的喉咙，啃食同伴的血肉。 然后，去吞噬你们看到的一切。","skills":[{"n":"割喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":20}]},{"n":"永冬意志","cd":3,"op":[{"k":"str","v":62.5}]},{"n":"冰刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":15}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]}]},{"id":"149111","n":"雪域温迪戈","spr":"mon:530","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"无论如何坚持呼唤，也无法寻回旧日温情。 它带来的仅是恐惧。","skills":[{"n":"割喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]},{"n":"永冬意志","cd":3,"op":[{"k":"str","v":50.0}]},{"n":"冰刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":10}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]}]},{"id":"149112","n":"燃灯温迪戈","spr":"mon:531","rank":"normal","rankZh":"普通","size":"Middle","bt":"MonsterGrade2","desc":"无论如何坚持追索，也无法点燃旧日余烬。 它进奉的仅是谎言。","skills":[{"n":"咒刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":35},{"k":"poison","v":1.6}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]},{"n":"封喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]},{"n":"燃灯意志","cd":3,"op":[{"k":"str","v":50.0}]}]},{"id":"149113","n":"噬灯者集群","spr":"mon:532","rank":"elite","rankZh":"精英","size":"Middle","bt":"Elite","desc":"献上心脏作灯芯，献上喉咙作灯座，献上血肉作灯油。 啊，虔诚的旅人，温迪戈们将以此灯为你祈祷。","skills":[{"n":"咒刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":50},{"k":"poison","v":1.6}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":10}]},{"n":"封喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":20}]},{"n":"燃灯意志","cd":3,"op":[{"k":"str","v":62.5}]}]},{"id":"149114","n":"哈提猎群","spr":"mon:533","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着神明的血。在月亮被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149115","n":"永冬之主","spr":"mon:534","rank":"boss","rankZh":"首领","size":"Big","bt":"Boss","desc":"向所有的生命与希望告别——永恒的冬天，已降临你身前。","skills":[{"n":"割喉","cd":4,"op":[{"k":"dmg","v":8.0,"hits":25}]},{"n":"永冬意志","cd":3,"op":[{"k":"str","v":75.0}]},{"n":"冰刺","cd":4,"op":[{"k":"dmg","v":4.0,"hits":25}]},{"n":"吸血噬咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":15}]}]},{"id":"149116","n":"哈提猎群","spr":"mon:535","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着神明的血。在月亮被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]},{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]}]},{"id":"149117","n":"哈提猎群","spr":"mon:536","rank":"normal","rankZh":"普通","size":"Mini","bt":"MonsterGrade1","desc":"蛮荒的身体中流淌着神明的血。在月亮被吞噬之时，众神迎来祂们的黄昏。","skills":[{"n":"吞食","cd":4,"op":[{"k":"dmg","v":4.0,"hits":1},{"k":"poison","v":1.6}]},{"n":"潜伏","cd":3,"op":[{"k":"str","v":0.5}]},{"n":"撕咬","cd":4,"op":[{"k":"dmg","v":8.0,"hits":1}]}]}];
return { SHEETS, HEROES, ITEMS, WHEELS, PACTS, FOES };
})();

// ---- js/bazaar-data.js
const m_bazaar_data = await (async () => {
const { HEROES: G_HEROES, ITEMS: G_ITEMS, WHEELS: G_WHEELS, PACTS: G_PACTS, FOES: G_FOES, SHEETS: G_SHEETS } = m_bazaar_gen;
// 《大巴扎：银钥》的数据层 —— 大表在 js/bazaar-gen.js（由 scripts/build_bazaar_gen.py 生成），
// 这里只放「规则常数」「地形」和「按难度拼出来的关卡排期」。
//
// 之所以分成两份：三百多 KB 的客户端表是生成物，别手改；难度、曲线、地形这些是设计，要能一眼看见。



const SHEETS = G_SHEETS;
const HEROES = G_HEROES;
const ITEMS = G_ITEMS;
const WHEELS = G_WHEELS;
const PACTS = G_PACTS;
const FOES = G_FOES;
// 集市里能刷出来的只有普通造物：维度影像（r='FATE'）是唤醒体随身带的本命造物，不外售
const SHOP_ITEMS = ITEMS.filter((x) => x.r !== 'FATE');

const TUNING = {
  beats: 40,          // 每场固定 40 拍
  beatMs: 480,        // 一拍的实际时长（×1/×2/×3 倍速）
  startHp: 130,
  startGold: 32,
  fieldSlots: 10,     // 战场十格
  draftSlots: 8,      // 开局只能带 8 格的（大约三个）
  wheelSlots: 3,      // 命轮槽
  relicSlots: 4,      // 造物槽
  cpuBase: 26,        // 算力上限（扩容前）
  coreCost: 6,        // 扩容一次的价格（每次 +3）
  coreGain: 5,        // 扩容一次加多少上限
  rerollCost: 2,
  sellRate: 0.5,
  cdMin: 2,
  wcdMin: 3,
  // 每天的血量预算 / 目标强度 / 收入。以 12 天为基准调出来，后面按同一斜率外推。
  dayHp: [0, 72, 115, 155, 220, 305, 410, 490, 610, 706, 800, 868, 1014, 1065, 1118, 1174, 1233, 1295, 1360],
  dayDps: [0, 2.8, 3.7, 4.5, 5.3, 5.7, 6.5, 7.0, 7.2, 7.6, 8.0, 8.1, 8.6, 8.9, 9.2, 9.5, 9.8, 10.1, 10.4],
  income: [0, 14, 14, 13, 12, 12, 12, 12, 12, 12, 12, 13, 14, 14, 15, 15, 16, 16, 17],
};

// 四档难度：dps/hp 是乘在每天曲线上的，sane 是理智，pole 越大强敌来得越早
const DIFFS = [
  { id: 'normal', n: '寻常', days: 12, dps: 1.0, hp: 1.0, income: 1.0, sane: 3, pole: 0,
    desc: '12 天，3 点理智。前四天只有普通怪，首领从第九天开始露面。' },
  { id: 'hard', n: '艰难', days: 12, dps: 1.02, hp: 1.0, income: 1.0, sane: 2, pole: 1,
    desc: '12 天，2 点理智。精英提前到第三天，第七天就有首领。' },
  { id: 'nightmare', n: '噩梦', days: 15, dps: 0.95, hp: 0.96, income: 0.92, sane: 2, pole: 1.5,
    desc: '15 天，2 点理智，收入 -8%。第二天起就会撞上精英。' },
  { id: 'abyss', n: '深渊', days: 18, dps: 0.94, hp: 0.94, income: 0.82, sane: 2, pole: 2,
    desc: '18 天，2 点理智，收入 -18%。精英从第三天就露头，第十天之后全是首领。' },
];

const REALM_ZH = { CHAOS: '混沌', CARO: '血肉', AEQUOR: '深海', ULTRA: '超维' };
const TYPE_ZH = { ASSAULT: '伤害', CHORUS: '辅助', WARDEN: '防御' };
const RANK_ZH = { normal: '普通', elite: '精英', boss: '首领' };
const REALM_COLOR = { 混沌: '#c4708f', 血肉: '#b8873f', 深海: '#4f9bb5', 超维: '#8f7fc4' };

const ARCH_ZH = {
  dmg: '直伤', poison: '中毒', burn: '灼烧', shield: '护盾', heal: '回复', gold: '金币',
  crit: '暴击', haste: '节拍', regen: '回血', slow: '滞缓', vuln: '易伤', aura: '光环',
  str: '力量', thorns: '反伤', fate: '本命',
};

// 造物加成 → 文案（数值带符号，前端只负责贴上去）
const MOD_ZH = {
  cap: ['算力上限', '+', ''],
  gen: ['算力产出', '+', '%'],
  amp: ['命轮伤害', '+', '%'],
  crit: ['暴击率', '+', '%'],
  cdmg: ['暴击伤害', '+', '%'],
  shcap: ['护盾上限', '+', ''],
  regen: ['每拍回复', '+', ''],
  start: ['开战算力', '+', ''],
  wcd: ['命轮节拍', '-', ' 拍'],
  thorns: ['反伤', '+', ''],
  gold: ['每场金币', '+', ''],
};

const AURA_ZH = { gen: '供能', cd: '加速', pow: '增幅' };

// ---------------------------------------------------------------- 地形
// 对双方同时生效：敌我都在同一片地上打，所以没有「只坑玩家」的地形。
const TERRAINS = [
  { id: 'plain', n: '平常', txt: '没有额外地形。' },
  { id: 'amp', n: '共鸣', txt: '双方造成的伤害 +20%。', k: 'amp', v: 0.2 },
  { id: 'drain', n: '熔岩', txt: '每 3 拍，双方各受 7 点伤害（无视护盾）。', k: 'drain', v: 7, every: 3 },
  { id: 'slow', n: '迟滞', txt: '双方所有技能节拍 +1（唤醒体、命轮、怪物）。', k: 'slow', v: 1 },
  { id: 'thorns', n: '荆棘', txt: '双方受到伤害时反弹 3 点。', k: 'thorns', v: 3 },
  { id: 'mist', n: '雾障', txt: '每 3 拍，双方各得 9 点护盾。', k: 'shield', v: 9, every: 3 },
  { id: 'spring', n: '涌泉', txt: '每 3 拍，双方各回复 7 点生命。', k: 'heal', v: 7, every: 3 },
  { id: 'brittle', n: '脆裂', txt: '双方生命上限 -12%；同理，对面也更好杀。', k: 'hp', v: -0.12 },
  { id: 'gale', n: '疾风', txt: '双方技能节拍 -1（最低 2 拍）。', k: 'fast', v: 1 },
];

// ---------------------------------------------------------------- 关卡排期
// 按「第几天 + 难度推移」决定这一天的对手等级配比，再从该等级里随机抽一只。
function bandOf(day, pole) {
  // 强敌提前的幅度也按天渐入：第一天不该直接撞精英，否则高难度开局就没得玩。
  const d = day + pole * 1.6 * Math.min(1, (day - 1) / 3);
  if (d <= 3.2) return ['normal'];
  if (d <= 5.5) return ['normal', 'normal', 'elite'];
  if (d <= 8.5) return ['normal', 'elite', 'elite'];
  if (d <= 11.5) return ['elite', 'elite', 'boss'];
  if (d <= 14.5) return ['elite', 'boss', 'boss'];
  return ['boss', 'boss', 'boss'];
}

const BY_RANK = { normal: [], elite: [], boss: [] };
for (const f of FOES) (BY_RANK[f.rank] || BY_RANK.normal).push(f.id);

function buildSchedule() {
  const out = [];
  const maxDays = Math.max(...DIFFS.map((d) => d.days));
  for (let day = 1; day <= maxDays; day++) {
    const bands = {};
    for (const diff of DIFFS) {
      const ranks = bandOf(day, diff.pole);
      const pool = [];
      for (const r of ranks) for (const id of BY_RANK[r]) if (pool.indexOf(id) < 0) pool.push(id);
      bands[diff.id] = { ranks, pool, boss: ranks.indexOf('boss') >= 0 };
    }
    out.push({ day, bands });
  }
  return out;
}

const SCHEDULE = buildSchedule();

// 某一天、某难度用哪一排
function rowFor(day, diffId) {
  const row = SCHEDULE[Math.min(day, SCHEDULE.length) - 1] || SCHEDULE[SCHEDULE.length - 1];
  return row.bands[diffId] || row.bands.normal;
}
return { SHEETS, HEROES, ITEMS, WHEELS, PACTS, FOES, SHOP_ITEMS, TUNING, DIFFS, REALM_ZH, TYPE_ZH, RANK_ZH, REALM_COLOR, ARCH_ZH, MOD_ZH, AURA_ZH, TERRAINS, SCHEDULE, rowFor };
})();

// ---- js/bazaar-core.js
const m_bazaar_core = await (async () => {
const DATA = m_bazaar_data;
// 《大巴扎：银钥》核心逻辑：商店、十格战场、自动战斗。
// 不碰 DOM，node 里能直接跑（scripts/bazaar-sim.mjs 就是拿它做平衡实测的）。
//
// 一场战斗的心跳是「拍」（beat），四个东西同时走：
//   唤酲体 —— 每 cd 拍产出 gen 点算力（顺手打一下 / 架盾 / 挂易伤），并对左右两家放光环；
//   命轮　 —— 攒够 cpu 算力就在自己的节拍上开一炮，主要输出；
//   造物　 —— 不占出手，纯静态加成（算力上限、产出、增伤、暴击……）；
//   地形　 —— 敌我同吃，熔岩掉血、雾障加盾、疾风加速、脆裂削血。
// 40 拍打不完按剩余血量比例判。难度、当天曲线、地形表都在 js/bazaar-data.js。



// 这里的 build.mjs 只认 export const/let/function/class（没有 export {...} 重导出），
// 所以对外重新声明一遍，模拟脚本和界面都从这里拿。
const TUNING = DATA.TUNING;
const HEROES = DATA.HEROES;
const ITEMS = DATA.ITEMS;
const SHOP_ITEMS = DATA.SHOP_ITEMS;
const WHEELS = DATA.WHEELS;
const PACTS = DATA.PACTS;
const FOES = DATA.FOES;
const DIFFS = DATA.DIFFS;
const SCHEDULE = DATA.SCHEDULE;
const TERRAINS = DATA.TERRAINS;
const MOD_ZH = DATA.MOD_ZH;
const AURA_ZH = DATA.AURA_ZH;
const REALM_COLOR = DATA.REALM_COLOR;
const ARCH_ZH = DATA.ARCH_ZH;

const DOT_TURNS = 3;
const ITEM_BY_ID = new Map(ITEMS.map((x) => [x.id, x]));
const WHEEL_BY_ID = new Map(WHEELS.map((x) => [x.id, x]));
const FOE_BY_ID = new Map(FOES.map((x) => [x.id, x]));
const HERO_BY_ID = new Map(HEROES.map((x) => [x.id, x]));
const PACT_BY_ID = new Map(PACTS.map((x) => [x.id, x]));
const TER_BY_ID = new Map(TERRAINS.map((x) => [x.id, x]));

const itemOf = (id) => ITEM_BY_ID.get(id);
const wheelOf = (id) => WHEEL_BY_ID.get(id);
const foeOf = (id) => FOE_BY_ID.get(id);
const heroOf = (id) => HERO_BY_ID.get(id);
const pactOf = (id) => PACT_BY_ID.get(id);
const terrainOf = (id) => TER_BY_ID.get(id) || TERRAINS[0];
const diffOf = (id) => DIFFS.find((d) => d.id === id) || DIFFS[0];

function rngFrom(seed) {
  let a = seed >>> 0;
  return function rnd() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ru = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];

let UID = 1;
const uid = () => UID++;

// ---------------------------------------------------------------- 开局
function heroPrice(def) {
  return 9 + (def.slots || 1) * 5;
}
function wheelPrice(def) {
  return 7 + Math.round((def.cpu || 12) / 2);
}
function relicPrice(def) {
  return 4 + (def.r === 'SSR' ? 6 : def.r === 'SR' ? 3 : 0) + (def.cost || 0) % 2;
}
function sellPrice(kind, def) {
  const base = kind === 'hero' ? heroPrice(def) : kind === 'wheel' ? wheelPrice(def) : relicPrice(def);
  return Math.max(1, Math.floor(base * TUNING.sellRate));
}

function newRun({ seed = Date.now() >>> 0, pactId, diffId = 'normal' } = {}) {
  const diff = diffOf(diffId);
  const pact = pactOf(pactId) || PACTS[0];
  const run = {
    seed, rnd: rngFrom(seed), pact, diff, totalDays: diff.days,
    day: 1, sane: diff.sane, gold: TUNING.startGold,
    squad: [], wheels: [], relics: [], cores: 0,
    shop: [], rerolls: 0, freeReroll: 0,
    foeId: null, terrain: 'plain',
    wins: 0, losses: 0, bonusHp: 0,
    over: false, cleared: false, history: [],
  };
  if (pact.k === 'rich') run.gold += pact.v;
  // 开局不自选：战场上空的，靠集市里用固定金币把队伍凑起来。
  // 第一个唤醒体的本命命轮白送（见 buy），其余靠买。
  pickFoe(run);
  rollShop(run, { free: true });
  return run;
}

// ---------------------------------------------------------------- 战场（十格）
function usedSlots(run) {
  let n = 0;
  for (const h of run.squad) n += (heroOf(h.key) || {}).slots || 1;
  return n;
}
function freeSlots(run) {
  return TUNING.fieldSlots - usedSlots(run);
}
// 队伍顺序即站位：0 号在最左，往后依次排开，每人占 slots 格
function layoutOf(run) {
  let at = 0;
  return run.squad.map((h) => {
    const def = heroOf(h.key);
    const rec = { uid: h.uid, key: h.key, def, start: at, len: def.slots || 1 };
    at += rec.len;
    return rec;
  });
}
function canAddHero(run, id) {
  const def = heroOf(id);
  return !!def && usedSlots(run) + def.slots <= TUNING.fieldSlots;
}
function addHero(run, id) {
  if (!canAddHero(run, id)) return null;
  const rec = { uid: uid(), key: id };
  run.squad.push(rec);
  return rec;
}
function moveHero(run, hid, to) {
  const from = run.squad.findIndex((h) => h.uid === hid);
  if (from < 0) return false;
  const t = Math.max(0, Math.min(run.squad.length - 1, to));
  if (t === from) return false;
  const [x] = run.squad.splice(from, 1);
  run.squad.splice(t, 0, x);
  return true;
}
function removeHero(run, hid) {
  if (run.squad.length <= 1) return false;
  const i = run.squad.findIndex((h) => h.uid === hid);
  if (i < 0) return false;
  run.squad.splice(i, 1);
  return true;
}

// 面板上的「每拍产出 / 每拍消耗」——和 createFight 用同一套规则，免得显示和实际对不上
function planOf(run) {
  const mod = modsOf(run);
  const ter = terrainOf(run.terrain);
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);
  const units = run.squad.map((h) => {
    const d = heroOf(h.key);
    return { gen: d.gen, cd: d.cd, pow: 1, aura: d.aura };
  });
  units.forEach((u, i) => {
    for (const j of [i - 1, i + 1]) {
      const nb = units[j];
      if (!nb || !nb.aura) continue;
      const a = nb.aura;
      if (a.k === 'gen') u.gen += a.v;
      else if (a.k === 'cd') u.cd -= a.v;
      else if (a.k === 'pow') u.pow += a.v;
    }
  });
  let gen = 0;
  for (const u of units) {
    const cd = Math.max(TUNING.cdMin, u.cd + cdTer);
    const g = Math.max(1, Math.round(u.gen * (1 + mod.gen)));
    gen += g / cd;
  }
  let need = 0;
  for (const w of run.wheels) {
    const d = wheelOf(w.key);
    if (d) need += d.cpu / Math.max(TUNING.wcdMin, d.wcd + cdTer - mod.wcdDown);
  }
  return {
    gen: Math.round(gen * 10) / 10,
    need: Math.round(need * 10) / 10,
    cap: TUNING.cpuBase + mod.cap + run.cores * TUNING.coreGain,
    slots: usedSlots(run),
  };
}

// ---------------------------------------------------------------- 商店
function priceOf(run, base) {
  let p = 1;
  if (run.pact.k === 'discount') p -= run.pact.v;
  if (run.pact.k === 'greed') p += run.pact.v;
  return Math.max(1, Math.round(base * p));
}

function pickRarity(run, rnd) {
  const d = run.day;
  const wN = Math.max(1.2, 10 - d * 1.1);
  const wSR = 2 + d * 0.8;
  const wSSR = Math.max(0, d - 2.5) * 1.0;
  const tot = wN + wSR + wSSR;
  const x = rnd() * tot;
  if (x < wSSR) return 'SSR';
  if (x < wSSR + wSR) return 'SR';
  return 'N';
}

// 商店配比：前面几天先把「人 + 命轮」凑出来，造物只是调剂；第 5 天往后造物才慢慢变成主角。
// 这不是数值平衡，是体感——开局四条摊位全摆造物，玩家连一次「换人 / 换轮」的选择都做不了。
// 槽位满了 / 战场挤不进人时，对应那一类自动降权，免得刷出一堆买不了的东西。
function shopMix(run) {
  const d = run.day;
  let hero = d <= 2 ? 0.46 : d <= 4 ? 0.36 : d <= 7 ? 0.28 : 0.22;
  let wheel = d <= 2 ? 0.40 : d <= 4 ? 0.36 : d <= 7 ? 0.32 : 0.28;
  // 队伍还不够三个人时，人再往上提一点（三个人刚好能吃到光环）
  if (run.squad.length < 3) hero += 0.06;
  // 命轮不足两条时，先把命轮补起来——没有命轮这局根本打不出伤害
  if (run.wheels.length < 2) wheel += 0.08;
  if (run.relics.length >= TUNING.relicSlots) hero += 0.05;
  if (run.wheels.length >= TUNING.wheelSlots) { wheel *= 0.25; hero += 0.05; }
  if (freeSlots(run) < 1) { hero *= 0.3; wheel += 0.04; }
  let relic = Math.max(0.06, 1 - hero - wheel);
  if (run.relics.length >= TUNING.relicSlots) relic *= 0.12;
  const sum = hero + wheel + relic;
  return { hero: hero / sum, wheel: wheel / sum, relic: relic / sum };
}

function rollShop(run, { free = false } = {}) {
  const rnd = run.rnd;
  if (!free) {
    const cost = TUNING.rerollCost + run.rerolls;
    if (run.pact.k === 'freereroll' && run.freeReroll < 1) {
      run.freeReroll += 1;
    } else {
      if (run.gold < cost) return false;
      run.gold -= cost;
      run.rerolls += 1;
    }
  }
  const n = 4 + (run.pact.k === 'rich' && run.day === 1 ? 1 : 0);
  const out = [];
  const used = new Set();
  const ownHeroes = new Set(run.squad.map((h) => h.key));
  const ownWheels = new Set(run.wheels.map((w) => w.key));

  // 造一件指定类型的东西；造不出来（池子抽空 / 没槽位）返回 null
  const make = (kind, cheap = false) => {
    if (kind === 'hero') {
      const pool = HEROES.filter((h) => !ownHeroes.has(h.id) && h.slots <= freeSlots(run) && (!cheap || h.slots <= 1));   // 只摆装得下的：摊位上看到的，买了就能上场
      if (!pool.length) return null;
      const h = ru(rnd, pool);
      if (!h || used.has('h' + h.id)) return null;
      used.add('h' + h.id);
      return { kind: 'hero', key: h.id, price: priceOf(run, heroPrice(h)) };
    }
    if (kind === 'wheel') {
      if (run.wheels.length >= TUNING.wheelSlots) return null;
      const w = ru(rnd, WHEELS);
      if (used.has('w' + w.id) || ownWheels.has(w.id)) return null;
      used.add('w' + w.id);
      return { kind: 'wheel', key: w.id, price: priceOf(run, wheelPrice(w)) };
    }
    const r = pickRarity(run, rnd);
    const pool = SHOP_ITEMS.filter((x) => x.r === r);
    if (!pool.length) return null;
    const it = ru(rnd, pool);
    if (used.has(it.id)) return null;
    used.add(it.id);
    return { kind: 'relic', key: it.id, price: priceOf(run, relicPrice(it)) };
  };

  const mix = shopMix(run);
  for (let i = 0; i < n; i++) {
    let offer = null;
    for (let tries = 0; tries < 24 && !offer; tries++) {
      const roll = rnd();
      offer = make(roll < mix.hero ? 'hero' : roll < mix.hero + mix.wheel ? 'wheel' : 'relic');
    }
    if (offer) { offer.sold = false; out.push(offer); }
  }

  // 头三天保底：至少一条命轮、一个能上场的人。凑不齐构筑的前期最难玩，
  // 而造物这一层只是加成，晚两天拿不会死人。
  if (run.day <= 3) {
    const has = (k) => out.some((o) => o.kind === k);
    const swap = (kind, cheap = false) => {
      for (let i = out.length - 1; i >= 0; i--) {
        if (out[i].kind !== 'relic') continue;
        const o = make(kind, cheap);
        if (o) { o.sold = false; out[i] = o; return true; }
      }
      return false;
    };
    if (!has('wheel')) swap('wheel');
    // 开局战场上没人：起手金币只够「两个 1 格的人」或「一人一轮」，所以摊位里保底摆两个买得起的 1 格唤醒体。
    if (run.day === 1 && run.squad.length === 0) {
      const cheap = () => out.filter((o) => o.kind === 'hero' && heroOf(o.key).slots <= 1).length;
      const rank = (o) => (o.kind === 'relic' ? 0 : o.kind === 'hero' ? 1 : 2);     // 先换造物，再换贵人，最后才动命轮
      while (cheap() < 2) {
        const i = out.map((o, k) => ({ o, k })).filter(({ o }) => !(o.kind === 'hero' && heroOf(o.key).slots <= 1) && !(o.kind === 'wheel' && out.filter((x) => x.kind === 'wheel').length <= 1))
          .sort((x, y) => rank(x.o) - rank(y.o))[0];
        const o = make('hero', true);
        if (!i || !o) break;
        o.sold = false; out[i.k] = o;
      }
    } else if (!has('hero') && freeSlots(run) >= 1) swap('hero');
  }

  run.shop = out;
  run.rerolls = 0;
  return true;
}

function defOf(offer) {
  if (offer.kind === 'hero') return heroOf(offer.key);
  if (offer.kind === 'wheel') return wheelOf(offer.key);
  return itemOf(offer.key);
}

function canBuy(run, idx) {
  const o = run.shop[idx];
  if (!o || o.sold) return false;
  if (run.gold < o.price) return false;
  if (o.kind === 'hero') return canAddHero(run, o.key);
  if (o.kind === 'wheel') return run.wheels.length < TUNING.wheelSlots;
  return run.relics.length < TUNING.relicSlots;
}

function buy(run, idx) {
  if (!canBuy(run, idx)) return false;
  const o = run.shop[idx];
  run.gold -= o.price;
  o.sold = true;
  if (o.kind === 'hero') {
    const first = run.squad.length === 0;
    addHero(run, o.key);
    // 第一个唤醒体的本命命轮白送：开局没钱买齐命轮，先让领队能开出第一枪。
    if (first && run.wheels.length < TUNING.wheelSlots) {
      const d = heroOf(o.key);
      const nw = d && wheelOf(d.wheel);
      if (nw) run.wheels.push({ uid: uid(), key: nw.id, native: true });
    }
  } else if (o.kind === 'wheel') run.wheels.push({ uid: uid(), key: o.key });
  else run.relics.push({ uid: uid(), key: o.key });
  return true;
}

// uid 在三种东西里都可能，统一按 uid 找
function owned(run, id) {
  const h = run.squad.find((x) => x.uid === id);
  if (h) return { kind: 'hero', rec: h, def: heroOf(h.key) };
  const w = run.wheels.find((x) => x.uid === id);
  if (w) return { kind: 'wheel', rec: w, def: wheelOf(w.key) };
  const r = run.relics.find((x) => x.uid === id);
  if (r) return { kind: 'relic', rec: r, def: itemOf(r.key) };
  return null;
}

function sell(run, id) {
  const o = owned(run, id);
  if (!o) return 0;
  if (o.kind === 'hero') {
    if (run.squad.length <= 1) return 0;
    const back = sellPrice('hero', o.def);
    removeHero(run, id);
    run.gold += back;
    return back;
  }
  if (o.kind === 'wheel') {
    if (o.rec.native) return 0;
    const i = run.wheels.indexOf(o.rec);
    run.wheels.splice(i, 1);
    const back = sellPrice('wheel', o.def);
    run.gold += back;
    return back;
  }
  const i = run.relics.indexOf(o.rec);
  run.relics.splice(i, 1);
  const back = sellPrice('relic', o.def);
  run.gold += back;
  return back;
}

function coreCostOf(run) {
  return TUNING.coreCost + run.cores * 3;
}
function expandCore(run) {
  const c = coreCostOf(run);
  if (run.gold < c) return false;
  run.gold -= c;
  run.cores += 1;
  return true;
}

// ---------------------------------------------------------------- 对手与地形
function rowOf(run, day = run.day) {
  return DATA.rowFor(day, run.diff.id);
}

function pickFoe(run, day = run.day) {
  const row = rowOf(run, day);
  run.foeId = ru(run.rnd, row.pool);
  run.terrain = ru(run.rnd, TERRAINS).id;
  return FOE_BY_ID.get(run.foeId);
}

// 一只怪技能表折算出来的「每拍输出」（不含当天系数），用来把同一天的不同怪拉到同一档。
function rawDps(foe) {
  let d = 0;
  for (const s of foe.skills) {
    let per = 0;
    for (const op of s.op) {
      if (op.k === 'dmg') per += (op.v || 0) * (op.hits || 1);
      else if (op.k === 'poison' || op.k === 'burn') per += (op.v || 0) * 3;
      else if (op.k === 'str') per += (op.v || 0) * 0.9;
    }
    d += per / Math.max(1, s.cd);
  }
  return Math.max(0.6, d);
}

const supDps = (foe) => {
  let d = 0;
  for (const s of foe.skills) {
    let per = 0;
    for (const op of s.op) {
      if (op.k === 'heal') per += op.v * 0.9;
      else if (op.k === 'shield') per += op.v * 0.7;
    }
    d += per / Math.max(1, s.cd);
  }
  return d;
};

function foeStats(run, day = run.day) {
  const foe = FOE_BY_ID.get(run.foeId) || FOES[0];
  const row = rowOf(run, day);
  const diff = run.diff;
  const ter = terrainOf(run.terrain);
  const weaken = run.pact.k === 'weaken' ? 1 - run.pact.v : 1;
  const rankMul = row.boss && foe.rank !== 'boss' ? 1.06 : 1;
  const hpMul = foe.rank === 'boss' ? 1.12 : foe.rank === 'elite' ? 1.04 : 1;
  const sup = 1 + (day - 1) * 0.2;
  const t = Math.min(day, TUNING.dayHp.length - 1);
  // 难度的数值加成按天渐入：第一天只给四成，第五天给全。
  // 开局手里只有一两条命轮，高难度如果第一天就全量加成，等于开局抛硬币。
  const ramp = day >= 5 ? 1 : 0.4 + (day - 1) * 0.15;
  const hpDiff = 1 + (diff.hp - 1) * ramp;
  const dpsDiff = 1 + (diff.dps - 1) * ramp;
  const terHp = 1 + (ter.k === 'hp' ? ter.v : 0);
  const budget = TUNING.dayHp[t] * hpDiff * terHp * weaken * rankMul * hpMul;
  const sustain = supDps(foe) * sup * 22;
  return {
    foe,
    maxHp: Math.round(Math.max(budget * 0.55, budget - sustain)),
    atk: (TUNING.dayDps[t] * dpsDiff / rawDps(foe)) * 1.38,
    sup,
    boss: foe.rank === 'boss',
    elite: foe.rank === 'elite',
  };
}

// ---------------------------------------------------------------- 战斗
const MOD_KEYS = ['cap', 'gen', 'amp', 'crit', 'cdmg', 'shcap', 'regen', 'start', 'wcd', 'thorns', 'gold'];

function addMod(mod, k, v) {
  if (MOD_KEYS.indexOf(k) < 0) return;
  if (k === 'shcap') mod.shieldCap += v;
  else if (k === 'start') mod.startCpu += v;
  else if (k === 'wcd') mod.wcdDown += v;
  else mod[k] += v;
}

function addWheelMod(mod, w) {
  if (!w) return;
  const v = w.v || 0;
  switch (w.main) {
    case 'CRIT_RATE': mod.crit += v; break;
    case 'CRIT_DMG': mod.cdmg += v; break;
    case 'DMG_AMP': mod.amp += v; break;
    case 'KEYFLARE_REGEN': mod.regen += v; break;
    case 'SIGIL_YIELD': mod.gold += v; break;
    case 'REALM_MASTERY': mod.flat += v; break;
    case 'DEATH_RESISTANCE': mod.hp += v; break;
    case 'ALIEMUS_REGEN': mod.ward += v; break;
    default: break;
  }
  const p = w.perk;
  if (p) addMod(mod, p.k, p.v);
}

// 一局当前的所有加成（造物 / 命轮 / 本命 / 契约）。createFight 和 planOf 共用——
// 以前面板上的「产 / 耗 / 上限」只算了裸数，造物给的算力上限、产出加成、地形加减拍都没算，
// 买的和实际上场的对不上。
function modsOf(run) {
  const pact = run.pact;
  const mod = {
    amp: 0, crit: 0.08, cdmg: 0.5, regen: 0, gold: 0, flat: 0, hp: 0, ward: 0,
    leech: 0, wcdDown: 0, openShield: 0, pierce: 0, thorns: 0, venom: 0, fear: 0,
    save: 0, dupFirst: 0, lowLeech: 0, startCpu: 0, shieldCap: 60,
    gen: 0, cap: 0,
  };
  for (const r of run.relics) addMod(mod, itemOf(r.key).m.k, itemOf(r.key).m.v);
  for (const w of run.wheels) addWheelMod(mod, wheelOf(w.key));
  for (const h of run.squad) {
    const f = heroOf(h.key).fate;
    if (f) addMod(mod, f.k, f.v);
  }

  switch (pact.k) {
    case 'cddown': mod.wcdDown += pact.v; break;
    case 'dupfirst': mod.dupFirst = 1; break;
    case 'openshield': mod.openShield += pact.v; break;
    case 'lowleech': mod.lowLeech = pact.v; break;
    case 'glass': mod.amp += pact.v; mod.hp -= 12; break;
    case 'save': mod.save = pact.v; break;
    case 'bulwark2': mod.shieldCap += pact.v; mod.openShield += 15; break;
    case 'leech': mod.leech += pact.v; break;
    case 'headstart': mod.startCpu += pact.v; break;
    case 'tank': mod.hp += pact.v; break;
    case 'greed': mod.amp += 0.2; break;
    case 'venom': mod.venom += pact.v; break;
    case 'fear': mod.fear = pact.v; break;
    case 'wolf': mod.amp += pact.v; mod.shieldCap -= 30; break;
    default: break;
  }

  return mod;
}

function createFight(run) {
  const { foe, maxHp, atk, sup } = foeStats(run);
  const pact = run.pact;
  const ter = terrainOf(run.terrain);

  const mod = modsOf(run);

  const terAmp = ter.k === 'amp' ? ter.v : 0;
  const terHp = ter.k === 'hp' ? ter.v : 0;
  const cdTer = (ter.k === 'slow' ? ter.v : 0) - (ter.k === 'fast' ? ter.v : 0);

  const maxHP = Math.max(40, Math.round((TUNING.startHp + mod.hp + run.bonusHp) * (1 + terHp)));
  const cpuCap = TUNING.cpuBase + mod.cap + run.cores * TUNING.coreGain;

  // 唤醒体（含左右光环）
  const units = run.squad.map((h) => {
    const d = heroOf(h.key);
    return { uid: h.uid, def: d, cd: d.cd, timer: 0, gen: d.gen, pow: 1, act: d.act, aura: d.aura, fired: 0 };
  });
  units.forEach((u, i) => {
    for (const j of [i - 1, i + 1]) {
      const nb = units[j];
      if (!nb || !nb.aura) continue;
      if (nb.aura.k === 'gen') u.gen += nb.aura.v;
      else if (nb.aura.k === 'cd') u.cd -= nb.aura.v;
      else if (nb.aura.k === 'pow') u.pow += nb.aura.v;
    }
  });
  for (const u of units) {
    u.cd = Math.max(TUNING.cdMin, u.cd + cdTer);
    u.gen = Math.max(1, Math.round(u.gen * (1 + mod.gen)));
  }

  // 命轮
  const wheels = run.wheels.map((w) => {
    const d = wheelOf(w.key);
    return { uid: w.uid, def: d, cost: d.cpu, wcd: d.wcd, timer: 0, native: !!w.native, waiting: false };
  });
  for (const w of wheels) w.wcd = Math.max(TUNING.wcdMin, w.wcd + cdTer - mod.wcdDown);

  const f = {
    t: 0, over: null, win: false,
    p: {
      hp: maxHP, maxHp: maxHP, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0,
      str: 0, weak: 0, weakT: 0,
    },
    e: {
      hp: maxHp, maxHp, shield: 0, poison: 0, poisonT: 0, burn: 0, burnT: 0,
      str: 0, vuln: 0, vulnT: 0, slow: 0,
      name: foe.n, spr: foe.spr, rank: foe.rank, desc: foe.desc,
      skills: foe.skills.map((s) => ({ n: s.n, cd: Math.max(2, s.cd + cdTer), timer: 0, op: s.op })),
    },
    units, wheels, cpu: 0, cpuCap, cpuGain: 0, cpuSpent: 0, gold: 0,
    mod, pact, foe, diff: run.diff, ter, terAmp,
    atkMul: atk, supMul: sup, rnd: run.rnd,
    shieldCap: Math.max(10, mod.shieldCap), wheelAmp: 1 + mod.amp + terAmp,
    surgeT: 0, saveUsed: false, dupUsed: false, firstWheel: true,
    dealt: 0, taken: 0,
  };

  f.cpu = Math.min(cpuCap, mod.startCpu);
  if (mod.openShield) f.p.shield = Math.min(f.shieldCap, mod.openShield);
  return f;
}

// 护盾吸收；pierce 是「有这一份比例的伤害绕过护盾」
function damageTo(target, amount, pierce = 0) {
  let through = 0;
  if (pierce > 0) {
    through = amount * Math.min(1, pierce);
    amount -= through;
  }
  const sh = Math.min(target.shield, amount);
  target.shield -= sh;
  const hpLoss = amount - sh + through;
  target.hp -= hpLoss;
  return hpLoss;
}

function hurt(f, target, amount, pierce = 0) {
  const isPlayer = target === f.p;
  if (isPlayer) {
    f.taken += amount;
  }
  const lost = damageTo(target, amount, pierce);
  const back = isPlayer ? f.mod.thorns + (f.ter.k === 'thorns' ? f.ter.v : 0)
    : (f.ter.k === 'thorns' ? f.ter.v : 0);
  if (lost > 0 && back > 0 && !f.over) {
    const other = isPlayer ? f.e : f.p;
    const v = Math.min(back, Math.max(1, Math.round(amount * 0.4)));
    other.hp -= v;
    if (isPlayer) f.dealt += v;
  }
  if (isPlayer && f.p.hp <= 0 && f.mod.save && !f.saveUsed) {
    f.saveUsed = true;
    f.p.hp = Math.min(f.p.maxHp, f.mod.save);
  }
  return lost;
}

// 我方伤害：kind='wheel' 才吃「命轮增伤」
function rollDamage(f, base, kind) {
  let raw = base + f.mod.flat + f.p.str * 0.5;
  raw *= 1 + (kind === 'wheel' ? f.mod.amp : 0) + f.terAmp;
  if (f.p.weakT > 0) raw *= 1 - f.p.weak;
  const crit = f.rnd() < Math.min(0.65, f.mod.crit);
  if (crit) raw *= 1.5 + f.mod.cdmg;
  if (f.e.vulnT > 0) raw *= 1 + f.e.vuln;
  return { raw, crit };
}

function applyOp(f, side, op, mul, ctx = {}) {
  const ev = [];
  const src = ctx.src || {};
  const target = side === 'p' ? f.e : f.p;
  const self = side === 'p' ? f.p : f.e;

  switch (op.k) {
    case 'dmg': {
      const hits = op.hits || 1;
      let total = 0;
      let anyCrit = false;
      for (let h = 0; h < hits; h++) {
        let raw;
        let crit = false;
        if (side === 'p') {
          const r = rollDamage(f, op.v * mul, ctx.kind);
          raw = r.raw; crit = r.crit;
          hurt(f, target, raw, ctx.kind === 'wheel' ? f.mod.pierce : 0);
        } else {
          raw = op.v * mul * (1 + f.e.str * 0.02) * (1 + f.terAmp);
          if (f.mod.fear) raw *= 1 - f.mod.fear;
          hurt(f, target, raw);
        }
        total += raw;
        anyCrit = anyCrit || crit;
      }
      if (op.vsPoison && target.poison > 0) {
        const extra = op.vsPoison * mul;
        hurt(f, target, extra);
        total += extra;
      }
      if (side === 'p') {
        f.dealt += total;
        let leech = (op.leech || 0) + f.mod.leech;
        if (f.mod.lowLeech && f.p.hp < f.p.maxHp * 0.5) leech += f.mod.lowLeech;
        if (leech > 0) {
          const h = Math.round(total * leech);
          if (h > 0) { self.hp = Math.min(self.maxHp, self.hp + h); ev.push({ s: 'p', k: 'heal', v: h }); }
        }
      }
      ev.push({ s: side, k: 'dmg', v: Math.round(total), hits, crit: anyCrit, src: ctx.srcId });
      break;
    }
    case 'poison': {
      let v = op.v * mul;
      if (side === 'p' && f.mod.venom) { v *= 1 + f.mod.venom; v += 1; }
      target.poison = Math.max(target.poison, Math.round(v));
      target.poisonT = DOT_TURNS;
      ev.push({ s: side, k: 'poison', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'burn': {
      const v = Math.round(op.v * mul);
      target.burn = Math.max(target.burn, v);
      target.burnT = DOT_TURNS;
      ev.push({ s: side, k: 'burn', v, src: ctx.srcId });
      break;
    }
    case 'shield': {
      const v = op.v * mul;
      const cap = side === 'p' ? f.shieldCap : 60;
      self.shield = Math.min(cap, self.shield + v);
      ev.push({ s: side, k: 'shield', v: Math.round(v), src: ctx.srcId });
      break;
    }
    case 'heal': {
      const v = Math.round(op.v * mul);
      self.hp = Math.min(self.maxHp, self.hp + v);
      ev.push({ s: side, k: 'heal', v, src: ctx.srcId });
      break;
    }
    case 'gold': {
      if (side === 'p') { f.gold += Math.round(op.v * mul); ev.push({ s: 'p', k: 'gold', v: Math.round(op.v * mul) }); }
      break;
    }
    case 'str': {
      self.str += op.v * mul;
      ev.push({ s: side, k: 'str', v: Math.round(op.v * mul * 10) / 10, src: ctx.srcId });
      break;
    }
    case 'vuln': {
      if (side === 'p') {
        target.vuln = Math.max(target.vuln, op.v * mul);
        target.vulnT = DOT_TURNS;
        ev.push({ s: 'p', k: 'vuln', v: op.v * mul, src: ctx.srcId });
      }
      break;
    }
    case 'slow': {
      if (side === 'p') {
        const add = Math.min(3 - f.e.slow, op.v * mul);
        if (add > 0) {
          f.e.slow += add;
          for (const s of f.e.skills) s.cd += add;
          ev.push({ s: 'p', k: 'slow', v: add });
        }
      }
      break;
    }
    case 'weaken': {
      if (side === 'e') {
        f.p.weak = Math.max(f.p.weak, op.v);
        f.p.weakT = op.t || 3;
        ev.push({ s: 'e', k: 'weaken', v: op.v });
      }
      break;
    }
    case 'stun': {
      if (side === 'e') {
        const n = op.v || 1;
        for (const u of f.units) u.timer = Math.max(0, u.timer - n);
        for (const w of f.wheels) w.timer = Math.max(0, w.timer - n);
        ev.push({ s: 'e', k: 'stun', v: n });
      }
      break;
    }
    case 'regen': {
      if (side === 'p') {
        f.mod.regen += op.v * mul;
        ev.push({ s: 'p', k: 'regen', v: Math.round(op.v * mul) });
      }
      break;
    }
    default: break;
  }
  return ev;
}

// 走一拍，返回这一拍的动画事件
function stepFight(f) {
  const ev = [];
  if (f.over) return ev;
  f.t += 1;
  const ter = f.ter;

  // 1) 地形：敌我同吃
  if (ter.every && f.t % ter.every === 0) {
    if (ter.k === 'drain') {
      f.p.hp -= ter.v; f.e.hp -= ter.v;
      ev.push({ s: 'p', k: 'dmg', v: ter.v, ter: 1 });
      ev.push({ s: 'e', k: 'dmg', v: ter.v, ter: 1 });
    } else if (ter.k === 'heal') {
      f.p.hp = Math.min(f.p.maxHp, f.p.hp + ter.v);
      f.e.hp = Math.min(f.e.maxHp, f.e.hp + ter.v);
      ev.push({ s: 'p', k: 'heal', v: ter.v, ter: 1 });
    } else if (ter.k === 'shield') {
      f.p.shield = Math.min(f.shieldCap, f.p.shield + ter.v);
      f.e.shield = Math.min(60, f.e.shield + ter.v);
      ev.push({ s: 'p', k: 'shield', v: ter.v, ter: 1 });
    }
  }

  // 2) 每拍回血
  if (f.mod.regen) {
    f.p.hp = Math.min(f.p.maxHp, f.p.hp + f.mod.regen);
    if (f.mod.regen >= 1) ev.push({ s: 'p', k: 'heal', v: Math.round(f.mod.regen), pas: 1 });
  }
  if (f.mod.ward && f.t % 4 === 0) {
    f.p.shield = Math.min(f.shieldCap, f.p.shield + f.mod.ward);
  }

  // 3) 状态结算
  for (const [side, obj] of [['p', f.p], ['e', f.e]]) {
    if (obj.poisonT > 0) {
      obj.hp -= obj.poison;
      obj.poisonT -= 1;
      ev.push({ s: side, k: 'poisonTick', v: obj.poison });
      if (!obj.poisonT) obj.poison = 0;
    }
    if (obj.burnT > 0) {
      hurt(f, obj, obj.burn);
      obj.burnT -= 1;
      ev.push({ s: side, k: 'burnTick', v: obj.burn });
      if (!obj.burnT) obj.burn = 0;
    }
    if (obj.vulnT > 0) obj.vulnT -= 1;
    if (obj.weakT > 0) obj.weakT -= 1;
  }
  if (checkOver(f)) return ev;

  // 4) 唤醒体出手：产算力 + 副效果
  f.cpuGain = 0;
  for (const u of f.units) {
    u.timer += 1;
    if (u.timer < u.cd) continue;
    u.timer = 0;
    const room = Math.max(0, f.cpuCap - f.cpu);
    const got = Math.min(room, u.gen);
    f.cpu += got;
    f.cpuGain += got;
    ev.push({ s: 'p', k: 'cpu', v: got, waste: u.gen - got, uid: u.uid });
    for (const op of u.act) ev.push(...applyOp(f, 'p', op, u.pow, { srcId: u.uid }));
    if (checkOver(f)) return ev;
  }

  // 5) 命轮开火：攒够算力才放
  for (const w of f.wheels) {
    if (w.timer < w.wcd) w.timer += 1;
    if (w.timer < w.wcd) { w.waiting = false; continue; }
    if (f.cpu < w.cost) { w.waiting = true; continue; }
    w.waiting = false;
    f.cpu -= w.cost;
    f.cpuSpent += w.cost;
    w.timer = 0;
    for (const op of w.def.op) ev.push(...applyOp(f, 'p', op, 1, { kind: 'wheel', srcId: w.uid }));
    // 再衍化：每场第一发命轮再打一次
    if (f.firstWheel && f.mod.dupFirst && !f.dupUsed) {
      f.dupUsed = true;
      for (const op of w.def.op) {
        if (op.k !== 'dmg') continue;
        const extra = Math.round(op.v * (op.hits || 1));
        f.e.hp -= extra;
        f.dealt += extra;
        ev.push({ s: 'p', k: 'dmg', v: extra });
      }
    }
    f.firstWheel = false;
    if (checkOver(f)) return ev;
  }

  // 6) 敌方技能
  for (const s of f.e.skills) {
    s.timer += 1;
    if (s.timer >= s.cd) {
      s.timer = 0;
      for (const op of s.op) {
        const isDmg = op.k === 'dmg' || op.k === 'poison' || op.k === 'burn';
        ev.push(...applyOp(f, 'e', op, isDmg ? f.atkMul : f.supMul, { src: {} }));
      }
    }
  }
  checkOver(f);
  return ev;
}

function checkOver(f) {
  if (f.over) return true;
  if (f.e.hp <= 0) { f.over = 'win'; f.win = true; return true; }
  if (f.p.hp <= 0) { f.over = 'lose'; f.win = false; return true; }
  if (f.t >= TUNING.beats) {
    const pr = f.p.hp / f.p.maxHp, er = f.e.hp / f.e.maxHp;
    f.win = pr >= er;
    f.over = f.win ? 'win' : 'lose';
    f.timeout = true;
    return true;
  }
  return false;
}

function autoFight(f) {
  let guard = 0;
  while (!f.over && guard++ < TUNING.beats + 2) stepFight(f);
  return f;
}

function settle(run, f) {
  const income = Math.round((TUNING.income[Math.min(run.day, TUNING.income.length - 1)] || 0) * run.diff.income);
  let goldGain = f.gold + f.mod.gold + (f.win ? income : 0);
  if (run.pact.k === 'tank' && f.win) goldGain = Math.round(goldGain * 0.85);
  run.gold += goldGain;
  run.history.push({ day: run.day, foe: f.foe.n, win: f.win, hp: Math.max(0, Math.round(f.p.hp)) });
  let cleared = false;
  if (f.win) {
    run.wins += 1;
    if (run.pact.k === 'grow') run.bonusHp += run.pact.v;
    run.day += 1;
    run.freeReroll = 0;
    if (run.day > run.totalDays) { run.cleared = true; run.over = true; }
    else { pickFoe(run); rollShop(run, { free: true }); }
  } else {
    run.losses += 1;
    run.sane -= 1;
    if (run.sane <= 0 || run.day >= run.totalDays) {
      run.over = true;
    } else {
      run.day += 1;
      run.freeReroll = 0;
      pickFoe(run);
      rollShop(run, { free: true });
    }
  }
  return { goldGain, cleared };
}

function scoreOf(run) {
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  const diffMul = run.diff.id === 'normal' ? 1 : run.diff.id === 'hard' ? 1.35 : run.diff.id === 'nightmare' ? 1.8 : 2.4;
  return Math.round((day * 120 + Math.max(0, run.sane) * 60 + run.gold * 2 + (run.cleared ? 400 : 0)) * diffMul);
}

// ---------------------------------------------------------------- 卡面文本（和数值同源，保证一致）
const num = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(Math.round(v * 10) / 10));
const pctv = (v) => Math.round(v * 100) + '%';

function opText(op, mul = 1) {
  switch (op.k) {
    case 'dmg': {
      let t = `造成 ${num(op.v * mul)} 点伤害`;
      if (op.hits > 1) t += `，共 ${op.hits} 段`;
      if (op.pierce) t += '，无视护盾';
      if (op.leech) t += '，并吸取 30%';
      if (op.vsPoison) t += `，对中毒目标追加 ${num(op.vsPoison * mul)} 点`;
      return t;
    }
    case 'poison': return `施加 ${num(op.v * mul)} 层中毒（3 拍内每拍掉等量血，无视护盾）`;
    case 'burn': return `施加 ${num(op.v * mul)} 层灼烧（3 拍内每拍掉等量血）`;
    case 'shield': return `获得 ${num(Math.round(op.v * mul))} 点护盾`;
    case 'heal': return `回复 ${num(Math.round(op.v * mul))} 点生命`;
    case 'gold': return `战斗结束额外获得 ${num(Math.round(op.v * mul))} 金币`;
    case 'slow': return `对手所有技能延后 ${num(op.v * mul)} 拍`;
    case 'str': return `本场每次伤害 +${num(op.v * mul)}（可叠加）`;
    case 'vuln': return `目标受到的伤害 +${pctv(op.v * mul)}（3 拍）`;
    case 'regen': return `本场每拍回复 ${num(op.v * mul)} 点生命`;
    case 'thorns': return `受到伤害时反弹 ${num(op.v * mul)} 点`;
    case 'weaken': return `你的伤害 -${pctv(op.v)}（${op.t || 3} 拍）`;
    case 'stun': return '打断：所有唤醒体与命轮延后一拍';
    default: return '';
  }
}

// 造物的一条加成 → 文案
function modText(k, v) {
  const z = MOD_ZH[k];
  if (!z) return '';
  const pctK = k === 'gen' || k === 'amp' || k === 'crit' || k === 'cdmg';
  const show = pctK ? String(Math.round(v * 100))
    : k === 'wcd' ? String(Math.round(v)) : num(v);
  return `${z[0]} ${z[1]}${show}${z[2]}`;
}

function itemText(def) {
  if (!def || !def.m) return '';
  return modText(def.m.k, def.m.v);
}

function wheelFireText(def) {
  return def.op.map((o) => opText(o, 1)).join('；');
}
return { TUNING, HEROES, ITEMS, SHOP_ITEMS, WHEELS, PACTS, FOES, DIFFS, SCHEDULE, TERRAINS, MOD_ZH, AURA_ZH, REALM_COLOR, ARCH_ZH, itemOf, wheelOf, foeOf, heroOf, pactOf, terrainOf, diffOf, rngFrom, heroPrice, wheelPrice, relicPrice, sellPrice, newRun, usedSlots, freeSlots, layoutOf, canAddHero, addHero, moveHero, removeHero, planOf, priceOf, shopMix, rollShop, defOf, canBuy, buy, owned, sell, coreCostOf, expandCore, rowOf, pickFoe, rawDps, foeStats, modsOf, createFight, stepFight, autoFight, settle, scoreOf, opText, modText, itemText, wheelFireText };
})();

// ---- js/bazaar-sfx.js
const m_bazaar_sfx = await (async () => {

// 《大巴扎：银钥》的音效：全部用 WebAudio 现场合成，一个音频文件都不下。
//
// 这站每个静态请求在边缘要 1~2 秒，一个 20KB 的 mp3 就是一个额外来回；
// 而这一局需要的声音全是短促的「叮、咚、擦」，合成出来既不占请求也随手能调。
//
// 约定：
//   · 第一次真实交互（pointerdown / keydown）才创建 AudioContext，否则会被自动播放策略挂起；
//   · 同一个音效 30ms 内只响一次（战斗一拍里三个唤醒体同时产算力，不压一下就是噪音）；
//   · 静音开关存在 zjtt:bazaar:sfx，默认开；
//   · 所有音都过 master，静音就是 master.gain = 0，不逐个判断。
const KEY = 'zjtt:bazaar:sfx';

let ac = null;
let master = null;
let noiseBuf = null;
let on = true;
try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { on = true; }

const lastAt = Object.create(null);
let voices = 0;

function boot() {
  if (ac) return ac;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ac = new AC(); } catch (e) { return null; }
  master = ac.createGain();
  master.gain.value = on ? 0.5 : 0;
  master.connect(ac.destination);
  return ac;
}

function unlock() {
  const c = boot();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

const isOn = () => on;
function setOn(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* 无痕模式 */ }
  if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ac.currentTime, 0.02);
  if (on) unlock();
  return on;
}
function toggle() { return setOn(!on); }

// 一个带包络的振荡器：sweep 是滑到的频率（Hz），不写就是定音
function tone(f, { to = 0, dur = 0.12, type = 'triangle', gain = 0.18, at = 0, curve = 'exp' } = {}) {
  const c = boot();
  if (!c || !master) return;
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur * 0.25));
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
  voices += 1;
  osc.onended = () => { voices -= 1; };
}

function noise({ dur = 0.1, gain = 0.14, lp = 1400, hp = 120, at = 0 } = {}) {
  const c = boot();
  if (!c || !master) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t0 = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f1 = c.createBiquadFilter();
  f1.type = 'lowpass';
  f1.frequency.value = lp;
  const f2 = c.createBiquadFilter();
  f2.type = 'highpass';
  f2.frequency.value = hp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

// 同一个名字 30ms 内只响一次；voice 太多（连点刷新）就丢，别把 AudioContext 堆爆
function gate(name, gap = 30) {
  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  if (lastAt[name] && now - lastAt[name] < gap) return false;
  lastAt[name] = now;
  return voices < 24;
}

const sfx = {
  // 界面
  tap() { if (gate('tap', 40)) tone(760, { to: 620, dur: 0.05, type: 'square', gain: 0.07 }); },
  open() { if (gate('open')) { tone(520, { to: 780, dur: 0.1, type: 'triangle', gain: 0.1 }); } },
  close() { if (gate('close')) tone(700, { to: 420, dur: 0.09, type: 'triangle', gain: 0.09 }); },
  error() { if (gate('error', 120)) { tone(220, { dur: 0.08, type: 'square', gain: 0.09 }); tone(180, { dur: 0.12, type: 'square', gain: 0.08, at: 0.07 }); } },
  // 集市
  buy() {
    if (!gate('buy', 90)) return;
    tone(523, { dur: 0.08, type: 'triangle', gain: 0.14 });
    tone(784, { dur: 0.12, type: 'triangle', gain: 0.13, at: 0.06 });
  },
  sell() {
    if (!gate('sell', 90)) return;
    tone(660, { dur: 0.08, type: 'triangle', gain: 0.12 });
    tone(440, { dur: 0.12, type: 'triangle', gain: 0.11, at: 0.06 });
  },
  coin() { if (gate('coin', 70)) { tone(1180, { dur: 0.06, type: 'sine', gain: 0.08 }); tone(1560, { dur: 0.07, type: 'sine', gain: 0.06, at: 0.03 }); } },
  // 战斗
  gen() {
    // 产算力：一局里响得最频繁，压到很轻，音高按 uid 错开一点
    if (!gate('gen', 45)) return;
    tone(520 + Math.random() * 90, { to: 700, dur: 0.09, type: 'sine', gain: 0.05 });
  },
  fire() {
    if (!gate('fire', 60)) return;
    noise({ dur: 0.09, gain: 0.1, lp: 2600, hp: 400 });
    tone(300, { to: 120, dur: 0.12, type: 'sawtooth', gain: 0.09 });
  },
  crit() {
    if (!gate('crit', 60)) return;
    noise({ dur: 0.12, gain: 0.14, lp: 4200, hp: 700 });
    tone(880, { to: 1320, dur: 0.1, type: 'square', gain: 0.09 });
  },
  hit() {
    if (!gate('hit', 55)) return;
    noise({ dur: 0.1, gain: 0.11, lp: 1200, hp: 90 });
    tone(150, { to: 80, dur: 0.1, type: 'sine', gain: 0.1 });
  },
  shield() {
    if (!gate('shield', 70)) return;
    tone(300, { to: 420, dur: 0.14, type: 'sine', gain: 0.09 });
    tone(600, { dur: 0.1, type: 'sine', gain: 0.05, at: 0.04 });
  },
  heal() { if (gate('heal', 90)) tone(440, { to: 660, dur: 0.16, type: 'sine', gain: 0.08 }); },
  poison() { if (gate('poison', 90)) tone(240, { to: 180, dur: 0.16, type: 'triangle', gain: 0.07 }); },
  // 节拍
  beat() { if (gate('beat', 90)) tone(1320, { dur: 0.03, type: 'square', gain: 0.03 }); },
  // 胜负
  win() {
    if (!gate('win', 400)) return;
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => tone(f, { dur: 0.2, type: 'triangle', gain: 0.13, at: i * 0.09 }));
    tone(131, { dur: 0.5, type: 'sine', gain: 0.08, at: 0.1 });
  },
  lose() {
    if (!gate('lose', 400)) return;
    [392, 330, 262].forEach((f, i) => tone(f, { dur: 0.26, type: 'triangle', gain: 0.12, at: i * 0.14 }));
    noise({ dur: 0.4, gain: 0.05, lp: 500, at: 0.1 });
  },
  start() {
    if (!gate('start', 300)) return;
    tone(392, { to: 784, dur: 0.24, type: 'triangle', gain: 0.12 });
    noise({ dur: 0.2, gain: 0.06, lp: 1800, at: 0.02 });
  },
};

// 第一次交互把 AudioContext 唤醒：iOS / Chrome 都要求有用户手势
if (typeof document !== 'undefined') {
  const kick = () => { unlock(); };
  document.addEventListener('pointerdown', kick, { once: true, passive: true });
  document.addEventListener('keydown', kick, { once: true });
}
return { unlock, isOn, setOn, toggle, sfx };
})();

// ---- js/bazaar.js
const m_bazaar = await (async () => {
const C = m_bazaar_core;
const { TUNING, HEROES, WHEELS, PACTS, DIFFS, SHEETS, ARCH_ZH, RANK_ZH, AURA_ZH } = m_bazaar_data;
const { sfx, toggle: sfxToggle, isOn: sfxIsOn } = m_bazaar_sfx;
// 《大巴扎：银钥》界面层：布阵、集市、十格战场、自动战斗的表现。
// 规则本身全在 js/bazaar-core.js（node 里能跑，scripts/bazaar-sim.mjs 就是拿它做平衡的），
// 这里只负责把状态画出来、把点击/拖动翻译成动作。
//
// 图片全部走雪碧图（assets/bazaar/sheet-*.webp）：一千多张图各发一个请求，
// 在本站「每个请求 1~2 秒」的边缘上开局就要等半分钟，所以拼四张大图 + 百分比定位。
// 唤醒体的待机立绘是单独的动图文件（每个约 14KB），用到谁才请求谁。





const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.round(n).toLocaleString('zh-CN');
const pct = (a, b) => Math.max(0, Math.min(100, (a / b) * 100));

const BEST_KEY = 'zjtt:bazaar:best';
const STATS_KEY = 'zjtt:bazaar:v1';

let run = null;
let fight = null;
let speed = 1;
let timer = 0;
let last = 0;
let playing = false;
let sheetId = 0;
const pick = { diff: 'normal', heroes: [], pact: null, realm: '', focus: null };

// ---------------------------------------------------------------- 雪碧图
const SHEET_CACHE = {};
function sheetOf(kind) {
  if (!SHEET_CACHE[kind]) SHEET_CACHE[kind] = SHEETS[kind];
  return SHEET_CACHE[kind];
}
function sprStyle(spr) {
  if (!spr) return '';
  const [kind, idx] = String(spr).split(':');
  const s = sheetOf(kind);
  if (!s) return '';
  const i = Number(idx) || 0;
  const col = i % s.cols, row = Math.floor(i / s.cols);
  const px = s.cols > 1 ? (col / (s.cols - 1)) * 100 : 0;
  const py = s.rows > 1 ? (row / (s.rows - 1)) * 100 : 0;
  return `background-image:url(${s.src});background-size:${s.cols * 100}% ${s.rows * 100}%;background-position:${px}% ${py}%`;
}
const sp = (spr, cls = '') => `<span class="sp ${cls}" style="${sprStyle(spr)}"></span>`;
function paintSp(el, spr) {
  if (!el) return;
  el.setAttribute('style', sprStyle(spr));
}

// 待机立绘：每个唤醒体一个动图文件（约 14KB），用到谁才下谁
const REALM_VAR = { CHAOS: '--chaos', CARO: '--caro', AEQUOR: '--aqua', ULTRA: '--ultra' };
const REALM_CLS = { CHAOS: 'CH', CARO: 'CA', AEQUOR: 'AE', ULTRA: 'UL' };
const idleUrl = (h) => `assets/bazaar/idle/${h.id}.webp`;
const artHTML = (h) => (h ? `<img src="${idleUrl(h)}" alt="${h.n}" decoding="async">` : '');
function setRealm(h, els) {
  const v = h ? `var(${REALM_VAR[h.realm] || '--accent'})` : 'var(--accent)';
  for (const el of els) if (el) el.style.setProperty('--realm', v);
}
function preload(h) {
  if (!h) return;
  const im = new Image();
  im.src = idleUrl(h);
}

// ---------------------------------------------------------------- 小工具
let toastTimer = 0;
function toast(msg) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), 1700);
}

function wheelPassive(w) {
  const v = w.v || 0;
  const map = {
    CRIT_RATE: `暴击率 +${Math.round(v * 100)}%`,
    CRIT_DMG: `暴击伤害 +${Math.round(v * 100)}%`,
    DMG_AMP: `命轮伤害 +${Math.round(v * 100)}%`,
    KEYFLARE_REGEN: `每拍回血 +${v}`,
    SIGIL_YIELD: `每场 +${v} 金`,
    REALM_MASTERY: `每段伤害 +${Math.round(v * 10) / 10}`,
    DEATH_RESISTANCE: `生命上限 +${Math.round(v)}`,
    ALIEMUS_REGEN: `每 4 拍 +${Math.round(v)} 护盾`,
  };
  return map[w.main] || w.mainZh;
}
const wheelFire = (w) => w.op.map((o) => C.opText(o, 1)).join('；');

// ---------------------------------------------------------------- 选人（只选难度 + 密契；唤醒体靠开局金币在集市里买）
function renderSetup() {
  $('diffPick').innerHTML = DIFFS.map((d) => `
    <button class="diff ${pick.diff === d.id ? 'on' : ''}" type="button" data-diff="${d.id}">
      <b>${d.n}</b><span>${d.days} 天 · ${d.sane} 理智</span>
    </button>`).join('');
  $('diffPick').onclick = (e) => {
    const el = e.target.closest('[data-diff]');
    if (!el) return;
    pick.diff = el.dataset.diff;
    renderSetup();
  };
  const diff = DIFFS.find((d) => d.id === pick.diff) || DIFFS[0];
  $('diffTip').textContent = diff.desc;
  if ($('introGold')) $('introGold').textContent = TUNING.startGold;

  $('pactPick').innerHTML = PACTS.map((p) => `
    <button class="pcard ${pick.pact === p.id ? 'on' : ''}" type="button" data-pact="${p.id}">
      ${sp(p.spr)}<span class="pw"><span class="pn">${p.n}</span><span class="pt">${p.txt}</span></span>
    </button>`).join('');
  $('pactPick').onclick = (e) => {
    const el = e.target.closest('[data-pact]');
    if (!el) return;
    pick.pact = pick.pact === el.dataset.pact ? null : el.dataset.pact;
    renderSetup();
  };

  $('btnStart').disabled = false;
  $('btnStart').textContent = '开张';
}

function startRun() {
  run = C.newRun({ seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0, pactId: pick.pact, diffId: pick.diff });
  $('setup').classList.remove('on');
  $('app').hidden = false;
  // 开局战场是空的（靠金币去集市招人）， realm 先用默认强调色，招到第一个人再跟着变
  setRealm(null, [$('app')]);
  renderAll();
  toast(`第 1 天：${run.foeId ? C.foeOf(run.foeId).n : ''} · 去集市招个唤醒体`);
}

// ---------------------------------------------------------------- 集市
function renderHud() {
  $('hDay').textContent = `第 ${Math.min(run.day, run.totalDays)} 天`;
  $('hDayMax').textContent = `/ ${run.totalDays}`;
  $('hDiff').textContent = run.diff.n;
  $('hSane').innerHTML = Array.from({ length: run.diff.sane }, (_, i) => `<i class="${i < run.sane ? '' : 'off'}">❤</i>`).join('');
  $('hGold').textContent = fmt(run.gold);
}

function skillText(st, s) {
  return s.op.map((op) => {
    const isDmg = op.k === 'dmg' || op.k === 'poison' || op.k === 'burn' || op.k === 'str';
    return C.opText(op, isDmg ? st.atk : st.sup);
  }).filter(Boolean).join('；');
}

function renderFoe() {
  const st = C.foeStats(run);
  const foe = st.foe;
  $('foeBar').innerHTML = `
    ${sp(foe.spr, 'fp')}
    <div class="fi">
      <div class="fn"><b>${foe.n}</b><em class="${foe.rank}">${RANK_ZH[foe.rank] || '普通'}</em></div>
      <div class="fhp"><span>生命 ${fmt(st.maxHp)}</span><div class="bar"><i style="width:100%"></i></div></div>
      <div class="fsk">${foe.skills.map((s) => `<span title="${skillText(st, s)}">${s.n} · ${s.cd} 拍</span>`).join('')}</div>
    </div>`;
}

function renderTerrain() {
  const t = C.terrainOf(run.terrain);
  $('terBar').innerHTML = `<b>地形 · ${t.n}</b><span>${t.txt}</span>`;
}

function unitHTML(u, inBattle) {
  const d = u.def;
  // 角上的环 = 还差几拍出手。数字比进度条直观，环本身给「快到了」的感觉。
  // 战斗单位带 timer/cd（会跳动），布局单位没有 —— 没有就按满 cd 算。
  const cd = u.cd != null ? u.cd : d.cd;
  const timer = u.timer != null ? u.timer : 0;
  const left = inBattle ? Math.max(0, cd - timer) : d.cd;
  return `<div class="unit r-${REALM_CLS[d.realm]}" data-uid="${u.uid}" style="--at:${u.start};--len:${u.len};--realm:var(${REALM_VAR[d.realm]})">
    <img src="${idleUrl(d)}" alt="${d.n}" decoding="async">
    <span class="ucd${inBattle && left <= 1 ? ' now' : ''}" id="ucd${u.uid}" style="--p:${inBattle ? Math.round((timer / cd) * 100) : 0}"><i>${left}</i></span>
    <span class="ut">${d.n}</span>
    <span class="um">产 ${d.gen}${d.egg ? ' · 主播' : ''}</span>
    <span class="ub"><i id="ub${u.uid}"></i></span>
  </div>`;
}

function renderTrack(host, inBattle) {
  const lay = C.layoutOf(run);
  // 战斗页：战斗单位有 timer/cd 但没 start/len，把布局的位置补进去再渲染。
  const units = inBattle && fight
    ? fight.units.map((u) => {
        const rec = lay.find((x) => x.uid === u.uid);
        return rec ? { ...u, start: rec.start, len: rec.len } : u;
      })
    : lay;
  const used = lay.reduce((s, u) => s + u.len, 0);
  const cells = Array.from({ length: TUNING.fieldSlots }, (_, i) => `<i class="cell ${i < used ? 'on' : ''}"></i>`).join('');
  host.innerHTML = `<div class="cells">${cells}</div><div class="units">${units.map((u) => unitHTML(u, inBattle)).join('')}</div>`
    + (units.length ? '' : '<div class="empty">战场空着 —— 打开集市招个唤醒体</div>');
  if (!inBattle) bindTrack(host);
}

function renderCpu() {
  const plan = C.planOf(run);
  $('cpuNow').textContent = plan.cap;
  $('cpuCap').textContent = ' 算力上限';
  $('cpuFill').style.width = '100%';
  const gap = plan.gen - plan.need;
  $('cpuRate').innerHTML = `产 ${plan.gen} · 耗 ${plan.need} <em class="${gap >= 0 ? 'ok' : ''}">${gap >= 0 ? '+' : ''}${Math.round(gap * 10) / 10}</em>`;
}

function renderWheels() {
  const parts = ['<span class="lab">命轮</span>'];
  for (const w of run.wheels) {
    const d = C.wheelOf(w.key);
    parts.push(`<button class="wh" type="button" data-wid="${w.uid}" title="${wheelFire(d)}">
      ${sp(d.spr)}<span class="wi"><b>${d.n}</b><i>耗 ${d.cpu} · ${d.wcd} 拍</i></span>
      <span class="wp"><i></i></span></button>`);
  }
  for (let i = run.wheels.length; i < TUNING.wheelSlots; i++) parts.push('<span class="wh empty">空槽</span>');
  $('wheels').innerHTML = parts.join('');
  $('wheels').onclick = (e) => {
    const el = e.target.closest('[data-wid]');
    if (el) openDetail('wheel', Number(el.dataset.wid));
  };
}

function renderRelics() {
  const parts = ['<span class="lab">造物</span>'];
  for (const r of run.relics) {
    const d = C.itemOf(r.key);
    parts.push(`<button class="rs" type="button" data-rid="${r.uid}" title="${C.itemText(d)}">
      ${sp(d.spr)}<b>${C.modText(d.m.k, d.m.v)}</b></button>`);
  }
  if (!run.relics.length) parts.push('<span class="rs empty">还没造物</span>');
  $('relics').innerHTML = parts.join('');
  $('relics').onclick = (e) => {
    const el = e.target.closest('[data-rid]');
    if (el) openDetail('relic', Number(el.dataset.rid));
  };
}

function offerText(o, def) {
  if (o.kind === 'hero') return `占 ${def.slots} 格 · 每 ${def.cd} 拍产 ${def.gen} 算力`;
  if (o.kind === 'wheel') return `耗 ${def.cpu} 算力 · ${wheelFire(def)}（${def.wcd} 拍）`;
  return C.itemText(def);
}

function renderShop() {
  const s = $('shop');
  if (!run.shop.length) { s.innerHTML = '<div class="tipbox">今天的摊位收完了，开战吧。</div>'; return; }
  s.innerHTML = run.shop.map((o, i) => {
    const def = C.defOf(o);
    const can = C.canBuy(run, i);
    const rar = o.kind === 'relic' ? def.r : def.r || 'SSR';
    // 图标那一块单独可点：看详情，不买。手机上一张卡就是「买」，误触的代价太大。
    return `<button class="card k-${o.kind} r-${rar} ${o.sold ? 'sold' : ''} ${!can && !o.sold ? 'poor' : ''}" type="button" data-offer="${i}">
      <span class="ci" data-info="${i}">${sp(def.spr)}</span>
      ${o.kind === 'hero' ? `<span class="ca" style="background-image:url(${idleUrl(def)})"></span>` : ''}
      <span class="cp ${run.gold < o.price ? 'no' : ''}">${o.price}</span>
      <span class="cn">${def.n}</span>
      <span class="ct">${offerText(o, def)}</span>
      <span class="r">${o.kind === 'hero' ? (def.egg ? '主播' : '唤醒体') : o.kind === 'wheel' ? '命轮' : (ARCH_ZH[def.arch] || def.r)}</span>
    </button>`;
  }).join('');
  $('shopHint').textContent = `还剩 ${run.shop.filter((x) => !x.sold).length} 个摊位`;
}

function renderShopClick() {
  $('shop').onclick = (e) => {
    // 先看图标：点图标 = 看详情（详情里也能买），点其它地方 = 直接买
    const info = e.target.closest('[data-info]');
    if (info) {
      const oi = Number(info.dataset.info);
      const of = run.shop[oi];
      if (of) openDetail(of.kind, of.key, { offer: oi });
      return;
    }
    const el = e.target.closest('[data-offer]');
    if (!el) return;
    const i = Number(el.dataset.offer);
    const o = run.shop[i];
    if (!o || o.sold) return;
    if (!C.canBuy(run, i)) {
      sfx.error();
      if (run.gold < o.price) toast('金币不够');
      else if (o.kind === 'hero') toast(`战场只剩 ${C.freeSlots(run)} 格，装不下他`);
      else if (o.kind === 'wheel') toast('命轮最多戴三条，先卖一条');
      else toast('造物槽满了，先卖一件');
      return;
    }
    C.buy(run, i);
    sfx.buy();
    renderAll();
  };
}

function renderTrail() {
  const total = run.totalDays;
  const done = run.history;
  $('trail').innerHTML = Array.from({ length: total }, (_, i) => {
    const h = done[i];
    const cls = h ? (h.win ? 'win' : 'lose') : (i === run.day - 1 ? 'now' : '');
    return `<i class="dot ${cls}">${h ? (h.win ? '✓' : '✗') : i + 1}</i>`;
  }).join('');
}

function renderAll() {
  if (!run) return;
  renderHud();
  renderFoe();
  renderTerrain();
  renderTrack($('track'), false);
  renderCpu();
  renderWheels();
  renderRelics();
  renderShop();
  renderTrail();
  $('btnCore').textContent = `扩容 ${C.coreCostOf(run)}`;
  $('btnCore').disabled = run.gold < C.coreCostOf(run);
  const cost = TUNING.rerollCost + run.rerolls;
  const free = run.pact.k === 'freereroll' && run.freeReroll < 1;
  $('btnReroll').textContent = free ? '刷新 免费' : `刷新 ${cost}`;
  $('btnReroll').disabled = !free && run.gold < cost;
  // 战场上一个人都没有时，开战没意义（startFight 也会拦），先把按钮置灰提示去集市
  $('btnFight').disabled = run.squad.length === 0;
}

// ---------------------------------------------------------------- 拖动排位
let drag = null;

function bindTrack(host) {
  host.onpointerdown = (e) => {
    const el = e.target.closest('.unit');
    if (!el || !run) return;
    e.preventDefault();
    const lay = C.layoutOf(run);
    const r = host.getBoundingClientRect();
    drag = { uid: Number(el.dataset.uid), el, pid: e.pointerId, x0: e.clientX, dx: 0, moved: false, w: r.width, left: r.left, lay };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器 */ }
    el.classList.add('dragging');
  };
}

window.addEventListener('pointermove', (e) => {
  if (!drag) return;
  drag.dx = e.clientX - drag.x0;
  if (Math.abs(drag.dx) > 5) drag.moved = true;
  if (drag.moved) drag.el.style.transform = `translateX(${drag.dx}px)`;
});

window.addEventListener('pointerup', () => {
  if (!drag) return;
  const d = drag;
  drag = null;
  // 先把指针捕获放掉再重渲染：元素被换掉时捕获还挂在旧节点上，后续点击会被吞掉
  try { d.el.releasePointerCapture(d.pid); } catch (err) { /* 已经释放 */ }
  d.el.classList.remove('dragging');
  d.el.style.transform = '';
  if (!d.moved) { openDetail('hero', d.uid); return; }
  const px = d.x0 + d.dx;
  let idx = 0;
  for (const u of d.lay) {
    if (u.uid === d.uid) continue;
    const c = d.left + ((u.start + u.len / 2) / TUNING.fieldSlots) * d.w;
    if (px > c) idx += 1;
  }
  if (C.moveHero(run, d.uid, idx)) { renderAll(); toast('站好位了'); }
});
window.addEventListener('pointercancel', () => {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  drag.el.style.transform = '';
  drag = null;
});

// ---------------------------------------------------------------- 详情
// 详情面板：三条信息源共用一块 DOM —— 队伍里的东西（可卖）、集市里的东西（可买）、战斗中的东西（只看）
function sheetHero(d) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n;
  $('sMeta').textContent = `${d.realmZh} · ${d.type} · 占 ${d.slots} 格 · 每 ${d.cd} 拍产 ${d.gen}`;
  $('sTxt').innerHTML = [
    `<b>${d.txt}</b>`,
    `光环：${d.auraTxt}（只喂左右相邻的两家）`,
    `本命：${d.fate.n}　${C.modText(d.fate.k, d.fate.v)}`,
    `本命命轮：${(C.wheelOf(d.wheel) || {}).n || '—'}`,
  ].join('<br>');
  $('sArt').innerHTML = artHTML(d);
}
function sheetWheel(d, native) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n + (native ? '（本命）' : '');
  $('sMeta').textContent = `命轮 · 耗 ${d.cpu} 算力 · ${d.wcd} 拍一次`;
  $('sTxt').innerHTML = [
    `<b>${wheelFire(d)}</b>`,
    `主词条：${wheelPassive(d)}`,
    d.perk ? `<em>${d.perk.txt}</em>` : '',
    '算力不够就会卡在「等算力」，先把产出跟上。',
  ].filter(Boolean).join('<br>');
}
function sheetRelic(d) {
  paintSp($('sImg'), d.spr);
  $('sName').textContent = d.n;
  $('sMeta').textContent = `造物 · ${d.r}`;
  $('sTxt').innerHTML = `<b>${C.itemText(d)}</b><br>造物不占出手，只要装在身上就一直生效。`;
}

// 打开方式二：own = uid（队伍 / 战场上的），offer = 集市第 i 个摊位（可以在这里直接买）
function openDetail(kind, id, opt) {
  const isOffer = opt && typeof opt.offer === 'number';
  const o = isOffer ? null : C.owned(run, id);
  if (!isOffer && !o) return;
  const offer = isOffer ? run.shop[opt.offer] : null;
  if (isOffer && !offer) return;
  sheetId = isOffer ? opt.offer : id;
  $('sArt').innerHTML = '';
  const own = !!o;

  if (kind === 'hero') {
    const d = own ? o.def : C.heroOf(offer.key);
    sheetHero(d);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者战场装不下'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 上场`);
      };
    } else {
      const back = C.sellPrice('hero', d);
      $('sSell').textContent = `移出队伍 +${back}`;
      $('sSell').disabled = run.squad.length <= 1;
      $('sSell').onclick = () => {
        if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); toast(`腾出 ${d.slots} 格，+${back} 金`); }
        else { sfx.error(); toast('至少留一个人守摊'); }
      };
    }
  } else if (kind === 'wheel') {
    const d = own ? o.def : C.wheelOf(offer.key);
    sheetWheel(d, own ? o.rec.native : false);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者三条命轮已满'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 上膛`);
      };
    } else {
      const back = C.sellPrice('wheel', d);
      $('sSell').textContent = o.rec.native ? '本命，卖不了' : `卖出 +${back}`;
      $('sSell').disabled = !!o.rec.native;
      $('sSell').onclick = () => { if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); } };
    }
  } else {
    const d = own ? o.def : C.itemOf(offer.key);
    sheetRelic(d);
    if (isOffer) {
      $('sSell').textContent = offer.sold ? '已经买下了' : `买下 ${offer.price} 金`;
      $('sSell').disabled = offer.sold || !C.canBuy(run, opt.offer);
      $('sSell').onclick = () => {
        if (!C.buy(run, opt.offer)) { sfx.error(); toast('买不了：钱不够或者四个造物槽满了'); return; }
        sfx.buy(); closeSheet(); renderAll(); toast(`${d.n} 已装好`);
      };
    } else {
      const back = C.sellPrice('relic', d);
      $('sSell').textContent = `卖出 +${back}`;
      $('sSell').disabled = false;
      $('sSell').onclick = () => { if (C.sell(run, id)) { sfx.sell(); closeSheet(); renderAll(); } };
    }
  }
  $('sheet').classList.add('on');
  sheetAt = Date.now();
  sfx.open();
}

let sheetAt = 0;
function closeSheet() {
  const el = $('sheet');
  if (!el.classList.contains('on')) return;
  el.classList.remove('on');
  $('sSell').disabled = false;
  if (Date.now() - sheetAt > 120) sfx.close();
}

// ---------------------------------------------------------------- 战斗
function startFight() {
  if (!run.squad.length) { toast('战场上一个人都没有'); return; }
  if (!run.wheels.length) { toast('没有命轮就打不出伤害，先去集市买一条'); return; }
  fight = C.createFight(run);
  closeSheet();
  sfx.start();
  setRealm(C.heroOf(run.squad[0].key), [$('battle')]);
  $('battle').classList.add('on');
  paintFight();
  playing = true;
  speed = 1;
  $('btnSpeed').textContent = '×1';
  last = performance.now();
  timer = 0;
  requestAnimationFrame(loop);
}

function paintFight() {
  const f = fight;
  $('bFoeImg').setAttribute('style', sprStyle(f.foe.spr));
  $('bFoeName').innerHTML = `${f.foe.n}<em class="${f.foe.rank}">${RANK_ZH[f.foe.rank] || '普通'}</em>`;
  $('bFoeHp').style.width = '100%';
  $('bFoeHpTxt').textContent = `${fmt(f.e.maxHp)} / ${fmt(f.e.maxHp)}`;
  $('bFoeSkills').innerHTML = f.e.skills.map((s, i) => `
    <span class="skill" id="sk${i}" title="${skillText(C.foeStats(run), s)}">${s.n}<i id="skb${i}"></i></span>`).join('');
  renderTrack($('bTrack'), true);
  $('bTrack').onclick = (e) => {
    const el = e.target.closest('.unit');
    if (el) openDetail('hero', Number(el.dataset.uid));
  };
  $('bWheels').innerHTML = ['<span class="lab">命轮</span>'].concat(f.wheels.map((w) => `
    <span class="wh" data-bw="${w.uid}" title="${wheelFire(w.def)}">
      ${sp(w.def.spr)}<span class="wi"><b>${w.def.n}</b><i id="wst${w.uid}">耗 ${w.cost} · ${w.wcd} 拍</i></span>
      <span class="wp"><i id="wp${w.uid}"></i></span>
    </span>`)).join('');
  $('bWheels').onclick = (e) => {
    const el = e.target.closest('[data-bw]');
    if (el) openDetail('wheel', Number(el.dataset.bw));
  };
  paintBars();
  resetLog(`地形 · ${f.ter.n}：${f.ter.txt}`);
  const plan = C.planOf(run);
  pushLog(`我方 ${f.units.length} 名：每轮共 +${plan.gen} 算力，上限 ${f.cpuCap}`, '', '·');
  pushLog(`对面 ${f.foe.n}：${fmt(f.e.maxHp)} 血，${f.e.skills.map((s) => s.n).join(' / ')}`, '', '·');
  pushLog(`命轮 ${f.wheels.length} 条：${f.wheels.map((w) => `${w.def.n}（耗 ${w.cost} · ${w.wcd} 拍）`).join('、')}`, '', '·');
}

function dotText(o) {
  const a = [];
  if (o.poisonT > 0) a.push(`毒 ${fmt(o.poison)}`);
  if (o.burnT > 0) a.push(`烧 ${fmt(o.burn)}`);
  if (o.vulnT > 0) a.push(`易伤 ${Math.round(o.vuln * 100)}%`);
  if (o.weakT > 0) a.push(`削弱 ${Math.round(o.weak * 100)}%`);
  return a.join(' · ');
}

function paintBars() {
  const f = fight;
  $('bFoeHp').style.width = pct(Math.max(0, f.e.hp), f.e.maxHp) + '%';
  $('bFoeHpTxt').textContent = `${fmt(Math.max(0, f.e.hp))} / ${fmt(f.e.maxHp)}`;
  $('bFoeShield').textContent = f.e.shield > 0 ? `盾 ${fmt(f.e.shield)}` : '';
  $('bFoeDot').textContent = dotText(f.e);
  $('bMyHp').style.width = pct(Math.max(0, f.p.hp), f.p.maxHp) + '%';
  $('bMyHpTxt').textContent = `${fmt(Math.max(0, f.p.hp))}/${fmt(f.p.maxHp)}`;
  $('bMyDot').textContent = [f.p.shield > 0 ? `盾 ${fmt(f.p.shield)}` : '', dotText(f.p)].filter(Boolean).join(' · ');
  // 算力
  $('bCpuNow').textContent = Math.floor(f.cpu);
  $('bCpuCap').textContent = `/${f.cpuCap}`;
  $('bCpuFill').style.width = pct(f.cpu, f.cpuCap) + '%';
  $('bCpuRate').textContent = `产 ${f.cpuGain || 0} · 剩 ${f.cpuCap - Math.floor(f.cpu)} 空间`;
  const ls = $('logSum');
  if (ls) ls.textContent = `第 ${Math.min(f.t, TUNING.beats)} / ${TUNING.beats} 拍`;
  for (const u of f.units) {
    const el = $(`ub${u.uid}`);
    if (el) el.style.width = pct(u.timer, u.cd) + '%';
    const ring = $(`ucd${u.uid}`);
    if (ring) {
      const left = Math.max(0, u.cd - u.timer);
      ring.style.setProperty('--p', String(Math.round(pct(u.timer, u.cd))));
      const num = ring.firstElementChild;
      if (num && num.textContent !== String(left)) num.textContent = left;
      ring.classList.toggle('now', left <= 1);
    }
  }
  for (const w of f.wheels) {
    const el = $(`wp${w.uid}`);
    if (el) el.style.width = pct(w.timer, w.wcd) + '%';
    const st = $(`wst${w.uid}`);
    if (st) st.textContent = w.waiting ? '等算力' : `耗 ${w.cost} · ${w.wcd} 拍`;
    const card = document.querySelector(`[data-bw="${w.uid}"]`);
    if (card) {
      card.classList.toggle('wait', w.waiting);
      card.classList.toggle('ready', !w.waiting && w.timer >= w.wcd - 0.01);
    }
  }
  f.e.skills.forEach((s, i) => {
    const el = $(`skb${i}`);
    if (el) el.style.width = pct(s.timer, s.cd) + '%';
  });
}

function float(side, text, color, atEl) {
  const host = atEl || (side === 'e' ? $('bFoeImg') : $('bMyHp'));
  const r0 = host.getBoundingClientRect();
  const el = document.createElement('span');
  el.className = 'fx';
  el.textContent = text;
  el.style.color = color;
  document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  el.style.position = 'fixed';
  el.style.left = Math.max(8, Math.min(window.innerWidth - r.width - 8, r0.left + r0.width / 2 - r.width / 2)) + 'px';
  el.style.top = Math.max(52, r0.top) + 'px';
  setTimeout(() => el.remove(), 720);
}

function flash(id) {
  const el = document.querySelector(`[data-uid="${id}"]`) || document.querySelector(`[data-bw="${id}"]`);
  if (!el) return;
  el.classList.remove('fire');
  void el.offsetWidth;
  el.classList.add('fire');
}

function pushLog(line, cls, lab) {
  const el = $('log');
  if (!el || !line) return;
  const d = document.createElement('div');
  d.className = 'l' + (cls ? ' ' + cls : '');
  const tag = lab != null ? lab : (fight && fight.t > 0 ? '#' + fight.t : '开局');
  d.innerHTML = `<i>${tag}</i><b>${line}</b>`;
  el.appendChild(d);
  while (el.childElementCount > 60) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}

function resetLog(line) {
  const el = $('log');
  if (!el) return;
  el.innerHTML = '';
  if (line) pushLog(line);
}

function applyEvents(ev) {
  const parts = [];
  let cls = '';
  const f = fight;
  for (const e of ev) {
    if (e.k === 'dmg') {
      if (e.s === 'p') {
        float('e', `${e.crit ? '暴击 ' : ''}${fmt(e.v)}`, e.crit ? '#ffd166' : '#ff8f7a');
        if (e.src != null) flash(e.src);
        if (e.crit) sfx.crit(); else sfx.fire();
        parts.push(`${e.ter ? '地形' : '命轮'}打掉 ${fmt(e.v)} 点${e.crit ? '（暴击）' : ''}`);
        cls = 'hi';
      } else {
        float('p', `-${fmt(e.v)}`, '#e8695f');
        sfx.hit();
        parts.push(`${f.foe.n} 打掉你 ${fmt(e.v)} 点`);
        cls = 'bad';
      }
    } else if (e.k === 'cpu') {
      if (e.v > 0) {
        const el = document.querySelector(`[data-uid="${e.uid}"]`);
        if (el) float('p', `+${e.v} 算力`, '#8fb6ff', el);
        flash(e.uid);
        sfx.gen();
      } else if (e.waste > 0) {
        parts.push('算力满了溢出，该扩容了');
      }
    } else if (e.k === 'shield') {
      float(e.s === 'p' ? 'p' : 'e', `+盾 ${fmt(e.v)}`, '#7fb2ff');
      if (e.src != null) flash(e.src);
      sfx.shield();
      parts.push(e.s === 'p' ? `架起 ${fmt(e.v)} 点护盾` : `${f.foe.n} 架盾 ${fmt(e.v)}`);
    } else if (e.k === 'heal') {
      float(e.s === 'p' ? 'p' : 'e', `+${fmt(e.v)}`, '#6fd39a');
      sfx.heal();
      parts.push(e.s === 'p' ? `回复 ${fmt(e.v)} 点` : `${f.foe.n} 回了 ${fmt(e.v)} 点`);
    } else if (e.k === 'poison') {
      float(e.s === 'p' ? 'e' : 'p', `毒 ${fmt(e.v)}`, '#a98cff');
      if (e.src != null) flash(e.src);
      parts.push(`灌了 ${fmt(e.v)} 层中毒`);
    } else if (e.k === 'vuln') {
      float('e', `易伤 +${Math.round(e.v * 100)}%`, '#ffb36b');
      if (e.src != null) flash(e.src);
      parts.push(`对面易伤 +${Math.round(e.v * 100)}%`);
    } else if (e.k === 'weaken') {
      parts.push(`你的伤害被压了 ${Math.round(e.v * 100)}%`);
    } else if (e.k === 'str') {
      float(e.s === 'p' ? 'p' : 'e', `力 +${fmt(e.v)}`, '#ffd166');
      parts.push(e.s === 'p' ? `力量 +${fmt(e.v)}` : `${f.foe.n} 强化了 ${fmt(e.v)}`);
      if (e.s !== 'p') cls = 'bad';
    } else if (e.k === 'stun') {
      parts.push('被打断了：唤醒体和命轮都慢了一拍');
      cls = 'bad';
    } else if (e.k === 'gold') {
      parts.push(`摸走 ${fmt(e.v)} 金币`);
    } else if (e.k === 'poisonTick' || e.k === 'burnTick') {
      if (e.v >= 1) float(e.s === 'p' ? 'e' : 'p', `-${fmt(e.v)}`, e.k === 'poisonTick' ? '#a98cff' : '#ff9a5c');
    }
  }
  if (parts.length) pushLog(parts.join(' · '), cls);
  paintBars();
}

function loop(now) {
  if (!playing) return;
  const dt = Math.min(120, now - last);
  last = now;
  timer += dt * speed;
  if (timer >= TUNING.beatMs) {
    timer -= TUNING.beatMs;
    const ev = C.stepFight(fight);
    if (ev.length) applyEvents(ev);
    else paintBars();
    if (fight.over) { endFight(); return; }
  }
  requestAnimationFrame(loop);
}

function endFight() {
  playing = false;
  const win = fight.win;
  const timeout = fight.timeout;
  paintBars();
  pushLog(win ? (timeout ? '四十拍打满，按剩血比例算你赢' : '对面撑不住了') : (timeout ? '四十拍打满，你的血更少' : '你被打趴下了'), win ? 'hi' : 'bad');
  if (win) sfx.win(); else sfx.lose();
  setTimeout(() => {
    const gain = C.settle(run, fight);
    $('battle').classList.remove('on');
    if (run.over) { showResult(); return; }
    renderAll();
    toast(win ? `赢了：+${gain.goldGain} 金` : `输了一场，理智 ${run.sane}/${run.diff.sane}`);
  }, win ? 700 : 900);
}

function skipFight() {
  if (!fight || fight.over) return;
  let guard = 0;
  while (!fight.over && guard++ < TUNING.beats + 2) C.stepFight(fight);
  playing = false;
  endFight();
}

// ---------------------------------------------------------------- 结算
function loadBest() {
  try { return Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* 无痕模式 */ }
}
// 存档摘要给 js/gamestats.js 读：只增不减的几个数
function recordStats(score) {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { s = {}; }
  const day = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  const wheelsOwned = Object.assign({}, (s.wheels && typeof s.wheels === 'object') ? s.wheels : {});
  for (const w of run.wheels) wheelsOwned[w.key] = 1;
  const heroesOwned = Object.assign({}, (s.heroes && typeof s.heroes === 'object') ? s.heroes : {});
  for (const h of run.squad) heroesOwned[h.key] = 1;
  const out = {
    best: Math.max(Number(s.best) || 0, score),
    day: Math.max(Number(s.day) || 0, day),
    runs: (Number(s.runs) || 0) + 1,
    wins: (Number(s.wins) || 0) + (run.cleared ? 1 : 0),
    pacts: Object.assign({}, (s.pacts && typeof s.pacts === 'object') ? s.pacts : {}, { [run.pact.id]: 1 }),
    heroes: heroesOwned,
    wheels: wheelsOwned,
  };
  try { localStorage.setItem(STATS_KEY, JSON.stringify(out)); } catch (e) { /* 无痕模式 */ }
  // 榜单同步：本机先落盘（立刻生效），云端那条链按需加载、后台推，失败也不影响玩。
  // 只有成绩真的有变化才推，否则每局都白跑一次 PUT。
  if (score > (Number(s.best) || 0) || run.cleared || day > (Number(s.day) || 0)) {
    import('./bazaar-sync.js').then((m) => m.pushScore()).catch(() => {});
  }
}

function showResult() {
  const score = C.scoreOf(run);
  const best = Math.max(loadBest(), score);
  saveBest(best);
  recordStats(score);
  const d = run.diff;
  const lead = C.heroOf(run.squad[0].key);
  $('rTitle').textContent = run.cleared ? '摊子开到最后' : '散场';
  $('rSub').innerHTML = run.cleared
    ? `${d.n}难度 ${run.totalDays} 天走完，理智还剩 ${run.sane} 点。<br>${lead.n} 带着 ${run.squad.length} 个人收摊回家。`
    : `${d.n}难度第 ${Math.min(run.day, run.totalDays)} 天散场，理智见底。<br>${lead.n} 的摊子被人搬空了。`;
  $('rScore').textContent = fmt(score);
  $('rDays').textContent = Math.min(run.cleared ? run.totalDays : run.day - 1, run.totalDays);
  $('rGold').textContent = fmt(run.gold);
  $('rBest').textContent = fmt(best);
  $('result').classList.add('on');
}

function again() {
  $('result').classList.remove('on');
  $('app').hidden = true;
  $('setup').classList.add('on');
  run = null;
  pick.pact = null;
  pick.heroes = [];
  pick.focus = null;
  renderSetup();
}

// ---------------------------------------------------------------- 榜单
// 服务端 /board 会把每个玩家云端档案里的摘要排出来（js/gamestats.js 的 digest 里有 bz 这一项）。
// 游戏页本身不引 account / auth 那两百来 KB，点开榜单才动态 import 一次：
// 断了 / 没登录 / 后端没起来，都只影响这一屏，不影响玩。
let boardLoading = false;
function paintBoard(g) {
  const listEl = $('bListB');
  const items = (g && g.items) || [];
  const mine = loadBest();
  $('bNote').innerHTML = items.length
    ? `共 ${items.length} 位摊主上榜 · 每局结束自动同步一次（服务端缓存 3 分钟）`
    : '还没有人上榜。登录后打一局，成绩会跟着云端档案走。';
  if (!items.length) {
    listEl.innerHTML = `<li class="bempty">${mine > 0 ? `你的最好成绩 ${fmt(mine)} 分，登录后就能上榜` : '还没有人上榜'}</li>`;
    return;
  }
  listEl.innerHTML = items.map((it, i) => `
    <li>
      <span class="rk">${i + 1}</span>
      <span class="nm">${it.name}${it.sub ? `<small>${it.sub}</small>` : ''}</span>
      <span class="sc">${fmt(it.score)}<small>${it.unit || '分'}</small></span>
    </li>`).join('') + (mine > 0
    ? `<li class="me"><span class="rk">你</span><span class="nm">本机最好成绩<small>登录后随云端档案同步</small></span><span class="sc">${fmt(mine)}<small>分</small></span></li>`
    : '');
}
function openBoard() {
  $('board').classList.add('on');
  sfx.open();
  if (boardLoading) return;
  boardLoading = true;
  $('bListB').innerHTML = '<li class="bempty">正在连线…</li>';
  import('./bazaar-sync.js')
    .then((m) => m.fetchBoard())
    .then((g) => paintBoard(g))
    .catch(() => {
      $('bNote').textContent = '榜单连不上（离线 / 后端没起来）。本机成绩照样记。';
      $('bListB').innerHTML = loadBest() > 0
        ? `<li class="me"><span class="rk">你</span><span class="nm">本机最好成绩</span><span class="sc">${fmt(loadBest())}<small>分</small></span></li>`
        : '<li class="bempty">还没有本机成绩</li>';
    })
    .then(() => { boardLoading = false; });
}

// ---------------------------------------------------------------- 绑定
$('btnReroll').onclick = () => {
  if (!C.rollShop(run)) { sfx.error(); toast('金币不够刷新'); return; }
  sfx.tap();
  renderAll();
};
$('btnCore').onclick = () => {
  if (!C.expandCore(run)) { sfx.error(); toast('金币不够扩容'); return; }
  sfx.coin();
  renderAll();
  toast(`算力上限 +${TUNING.coreGain}`);
};
$('btnFight').onclick = startFight;
$('btnSpeed').onclick = () => {
  speed = speed === 1 ? 2 : speed === 2 ? 3 : 1;
  $('btnSpeed').textContent = 'x' + speed;
  sfx.tap();
};
$('btnSkip').onclick = skipFight;
$('btnAgain').onclick = again;
$('btnStart').onclick = startRun;
$('btnHelp').onclick = () => { $('help').classList.add('on'); sfx.open(); };
$('setupHelp').onclick = () => { $('help').classList.add('on'); sfx.open(); };
$('helpClose').onclick = () => { $('help').classList.remove('on'); sfx.close(); };
$('btnBoard').onclick = openBoard;
$('btnBoardB').onclick = openBoard;
$('bClose').onclick = () => { $('board').classList.remove('on'); sfx.close(); };
$('btnBoardC').onclick = () => { $('board').classList.remove('on'); sfx.close(); };

// 音效开关：图标本身的字形就说明状态，不额外占一行
function paintSfx() {
  const el = $('btnSfx');
  if (!el) return;
  const on = sfxIsOn();
  el.textContent = '♪';
  el.classList.toggle('off', !on);
  el.setAttribute('aria-label', on ? '关闭音效' : '打开音效');
}
if ($('btnSfx')) {
  paintSfx();
  $('btnSfx').onclick = () => { sfxToggle(); paintSfx(); if (sfxIsOn()) sfx.tap(); };
}

$('sClose').onclick = closeSheet;
// 点面板外面也关：面板只占屏幕下半截，点上面任意地方都该收起来
document.addEventListener('click', (e) => {
  const sheet = $('sheet');
  if (!sheet.classList.contains('on')) return;
  if (Date.now() - sheetAt < 240) return;
  if (e.target.closest('#sheet')) return;
  if (e.target.closest('.ci') || e.target.closest('.unit') || e.target.closest('[data-wid]') || e.target.closest('[data-bw]') || e.target.closest('[data-rid]')) return;
  closeSheet();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if ($('board').classList.contains('on')) { $('board').classList.remove('on'); return; }
  closeSheet();
});
renderShopClick();

// 选人界面默认打开
renderSetup();
$('setup').classList.add('on');
$('boot').classList.add('off');
return {  };
})();

})().catch(function (e) {
  if (window.__bootFailed) window.__bootFailed((e && e.message) || String(e));
  else if (window.console) console.error(e);
});
// 主脚本已经跑起来了（给 HTML 里的看门狗一个准信号，替代原来的顶层 await 探测）
window.__bootMain = 1;

