# 忘却之夜·挂机录

《忘却前夜》（Morimens）**非官方同人**挂机自动战斗小游戏。免费、非商业。角色与美术素材版权归原权利方所有；数值与技能效果为本作自行设计。

当前进度：**M0–M2（网页可玩原型）**。

## 玩法
- 4 人小队全自动战斗：每人 7 个技能槽（攻击/防御/技能一/技能二/唤醒/共鸣/超共鸣），共鸣与超共鸣能量满后自动释放。
- 推图挂机（每 10 关一个 Boss），离线最多结算 8 小时。
- 62 名唤醒体、149 命轮、21 密契（套装 2/4 件）、310 造物，召唤带保底，重复获得提升星级。
- 战斗策略预设：均衡 / 强攻 / 稳守 / 集火强敌。存档在浏览器本地，可导入导出。

## 运行
```bash
python3 -m http.server 8765      # 然后打开 http://localhost:8765/
npm test                         # 核心逻辑测试
npm run sim                      # 平衡机器人：贪心玩 4000 场并打印进度曲线
```
纯静态，无需构建。推送到 `main` 后由 GitHub Pages 工作流自动部署。

## 数据管线
`public/data/game-data.json` 与 `public/img/` 由 `tools/build_data.py` 从 `qdby_chinese` 仓库生成（需要 Pillow）：
```bash
python3 tools/build_data.py --src ../qdby_chinese
```
图片已压缩为 webp 缩略图（总计约 5MB）。

## 目录
```
index.html / styles.css   页面
src/core/                 纯逻辑（无 DOM，可在 Node 与小程序复用）
  battle.js               回合制自动战斗引擎（种子随机、可回放事件流）
  skills.js               技能效果原型 + 7 槽技能组生成 + 招牌技能
  gear.js                 命轮/密契/造物数值
  enemies.js              关卡与敌人生成
  game.js                 存档、养成、召唤、掉落、离线收益
src/ui/                   网页界面
tools/                    数据管线、平衡机器人、浏览器冒烟脚本
tests/                    node:test
docs/DESIGN.md            设计文档
```
