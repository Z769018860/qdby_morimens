# 战报侦探（忘却前夜融灾推理 · 同人原型）

给你一份匿名的融灾战报（回合数、出牌数、单回合最高伤害，以及队内每人的伤害/格挡/治疗），
还原出这支队伍：唤醒体、命轮、密契、钥令、潜能进阶、造物。附带全量图鉴。

- `index.html` 推理游戏：每日一题 / 随机一题，4 档难度（入门 → 大师），Wordle 式反馈
- `codex.html` 图鉴：62 唤醒体 · 149 命轮 · 21 密契 · 64 钥令 · 390 造物 · 622 怪物，可搜索/筛选/按使用率排序
- `about.html` 玩法说明

## 运行

纯静态站，需要用 HTTP 服务器打开（`fetch` 读取 JSON）：

```
python3 -m http.server 8000   # 然后访问 http://localhost:8000
```

## 数据

数据由 [qdby_chinese](https://github.com/Z769018860/qdby_chinese) 生成：

```
python3 scripts/build_data.py /path/to/qdby_chinese [--seasons 71 72] [--per-season 500]
```

生成 `data/dictionary.json`（图鉴与选择器）、`data/puzzles.json`（题库，含答案）和 `assets/`（仅被引用的图片，已缩小为 webp）。
依赖：Python 3 + Pillow。题目来自第 71、72 期融灾榜单；玩家 UID 已去除，每人每区域只取一场。

## 已知限制（原型）

- 答案随页面一起下发，不防翻看。
- 辅助位在数据上无法唯一确定，评分按字段命中率计算。
- 唤醒体技能说明暂无数据源，图鉴只展示阵营/定位/稀有度与使用率。
- 第 71 期没有区域 Boss 信息，战报里不显示。
- 同人作品，与官方无关；素材版权归原权利人所有。
