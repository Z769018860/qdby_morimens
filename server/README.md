# 战报侦探后端

站点的账号档案、点赞、工坊题库都存在这里。之前这些东西借用 Waline 的评论表
（一条评论存 base64 文档、一个路径的评论数当赞数），读写既受发帖限频和格式约束，
「每人每天 10 次点赞」也只能在前端判，清一下 localStorage 就能绕过。

现在由服务端执行规则：

| 能力 | 表 | 规则 |
|---|---|---|
| 账号档案 | `accounts` | 一位用户一条，带版本号；版本对不上先合并再写，多端不互相覆盖 |
| 点赞 | `likes` | `(题目, 身份)` 主键唯一；每日 10 次按身份计数；自己的题不能赞；游客按 IP 兜底 |
| 作者结算 | `claims` | 每题已折成银芯的赞数只升不降，换设备/重装也领不到第二次 |
| 工坊题库 | `puzzles` | 自建题存服务端，别人按 id 直接拉，也可列最近/最热 |
| 登录缓存 | `sessions` | Waline token 校验一次后缓存 7 天，不用每个请求都回源 |

## 三种跑法，同一套规则

| 文件 | 跑在哪 | 存储 | 何时用 |
|---|---|---|---|
| `../edge-functions/api/[[default]].js` | 腾讯 EdgeOne Pages | KV | **线上在用**：和站点同域同证书，免费 |
| `node.js` | 任意有 Node 的机器 / Docker | 本地 SQLite | 有自己的服务器时 |
| `worker.js` | Cloudflare Workers | D1 | 有 Cloudflare 账号时 |

`node.js` 里写了约 40 行 D1 垫片（`prepare().bind().first()/.all()/.run()`），
所以 `worker.js` 一行不用改。改规则只改 `worker.js`，两边同时生效。

EdgeOne 版是**另写的**：那边只有 KV，没有 SQL，`WHERE / COUNT / ORDER BY` 全要换成
键设计。三条实现的路由、状态码、返回字段保持一致，前端只认地址，换实现不用改页面。
两边的回归口径也一致，改完任一份都跑一遍：

```bash
node scripts/test_edge_api.mjs     # EdgeOne 版（用 Map 假装 KV，61 条断言）
```

---

## 方式 A：EdgeOne Pages 边缘函数（线上在用，免费）

为什么选它：站点本身就部署在 EdgeOne Pages，接口和页面**同源同证书**，
既没有跨域配置，也没有「https 页面调 http 接口被 mixed content 拦掉」的问题；
免费额度 300 万次/月，KV 1GB，不用养服务器。

1. 控制台 → **存储 → KV** → 开通（免费 1GB）→ **创建命名空间**，名字随意，比如 `zjtt`
2. 回到项目 → **KV 存储 → Bind Namespace**，选刚建的命名空间，
   **变量名填 `zjtt_kv`**（代码里也认 `ZJTT_KV` / `KV`）
3. 仓库里已经有 `edge-functions/api/[[default]].js`，推到 `main` 后平台会自动重新部署
4. 验证：打开 `https://<你的域名>/api/health`，应返回
   `{"ok":true,"service":"zjtt","v":2,"runtime":"edgeone",...}`
5. 前端 `js/api.js` 的 `API_BASE` 指向 `https://<你的域名>/api`
   （`node scripts/set_api_base.mjs https://<你的域名>/api`）

**KV 的脾气，改数据模型时要顺着它**：

| 限制 | 影响 | 这里的处理 |
|---|---|---|
| 跨节点最终一致，最长 60 秒 | 别人的赞不会立刻看到 | 赞数用计数器，同节点读写立刻生效，正常使用无感 |
| 没有原子自增 | 并发读改写可能少记 | 量级小，偶尔差 1 个比上锁划算；结算用「只升不降」防重复发钱 |
| key 只能字母数字下划线，≤512B | 题目 id 里带 `-` 不能直接用 | 一律 `sha256('p:' + id)` 再拼前缀 |
| 单值 ≤1MB、请求体 ≤1MB、CPU 200ms | 大档案会被拒 | 超过 900KB 的题目直接 413，不静默截断 |

---

## 方式 B：自己的服务器 / NAS

要求：Node ≥ 22.5（推荐 24，SQLite 已转正、没有实验警告）。**不需要装任何依赖。**

```bash
# 1. 把仓库放到服务器上，然后
node server/node.js

# 起在 http://0.0.0.0:8787，数据库自动建在 server/data/zjtt.db
```

常用环境变量：

```bash
PORT=8080                      # 端口，默认 8787
SERVER_PORT=27483              # Pterodactyl/Pelican 面板分配的端口，PORT 没设时用它
HOST=127.0.0.1                 # 只给本机（前面挂 Nginx 时用这个），默认 0.0.0.0
DATA_DIR=/var/lib/zjtt         # 数据库目录，默认 server/data
WALINE_URL=https://…           # 账号 token 回源校验地址
ALLOWED_ORIGINS=https://a.com,https://b.com   # 跨域白名单，* 全放行
SERVE_STATIC=1                 # 顺带把整站也发了（同源部署，不用配 CORS）
```

**最省事的部署形态**：一台机器同时发站点和 API。

```bash
SERVE_STATIC=1 PORT=80 node server/node.js
```

这样 `http://你的域名/` 是站点、`http://你的域名/likes` 是接口，同源，没有跨域问题，
也不需要在 GitHub Pages 和服务器之间来回配。前面套一层 Nginx/Caddy 上 HTTPS 即可。

### 开机自启（systemd）

```ini
# /etc/systemd/system/zjtt.service
[Unit]
Description=zjtt backend
After=network.target

[Service]
WorkingDirectory=/opt/qdby_morimens
ExecStart=/usr/bin/node server/node.js
Environment=PORT=8787
Environment=DATA_DIR=/var/lib/zjtt
Environment=SERVE_STATIC=1
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now zjtt && systemctl status zjtt
```

## 方式 C：Docker

```bash
cd server
docker build -t zjtt-api .
docker run -d --name zjtt -p 8787:8787 -v zjtt-data:/data zjtt-api
```

镜像只含 `server/`，**只提供 API**（不带 67MB 的站点资源）。
要连站点一起发，把 `Dockerfile` 的 `COPY . .` 换成仓库根、`WORKDIR` 改成 `/app`，
再设 `SERVE_STATIC=1`。

## 方式 D：免费托管（没有自己的服务器）

先说结论：**免费平台里能存住数据的只有「常驻进程 + 持久磁盘」这一种。**
Vercel / Netlify / Cloudflare Pages 那类函数是无状态的，容器里的文件一重启就没，
SQLite 丢上去等于每次清库。所以别把 `node.js` 往那类平台扔。

### 推荐：Waifly（免费、不用信用卡、1GB 持久盘、进程不睡眠）

Waifly 用的是 **Pterodactyl 面板**（<https://panel.waifly.com>，和 dash 账号密码分开），
没有 SSH，但有文件管理器、SFTP、在线控制台和 Startup 页。

1. 注册 <https://dash.waifly.com>（免费计划：300MB 内存 / 1GB 磁盘，无到期时间）
2. Servers → Create → 类型选 **NodeJS** → 区域 PAR1 或 PAR2
3. 面板 → 你的服务器 → **Startup** 页：
   - 启动命令填 `node node.js`（或保留 `npm start`，效果一样）
   - **Node 版本选 22 或 24**（低于 22.5 没有内置 `node:sqlite`，会直接报错退出）
4. **Files** 页 → 右上角 Upload 上传部署包 zip → 右键 zip → **Unarchive** 解压到当前目录
   （解压后根目录应有 `node.js` `worker.js` `schema.sql` `package.json` 四个文件）
5. 点 **Start**，控制台出现下面这样就是好了：

   ```
   [zjtt] 后端已启动  http://0.0.0.0:27483
   [zjtt] 数据库      /home/container/data/zjtt.db
   ```

6. 用 `curl http://<面板地址>/health` 验一下，应返回 `{"ok":true,...}`

**端口不用自己填。** 面板分配端口（形如 `node.waifly.com:27483`）会以 `SERVER_PORT`
注入容器，程序按 `PORT → SERVER_PORT → 8787` 依次取值，会自动监听对的那个。
如果控制台显示正在跑、外面却一直是 **502 / 连接被拒绝**，几乎都是这个原因：
程序听了 8787 而反代在等 27483。确认启动日志里打印的端口与面板 Network 页一致即可。

数据库就是 `data/zjtt.db`，落在那块 1GB 盘上，重启不丢。备份 = 把这个文件下载下来。
免费实例连续 3 天完全无请求会被暂停，有人用就不会。

### 其它选择（都要改存储层，不是零改动）

| 平台 | 免费额度 | 代价 |
|---|---|---|
| Render + Neon | Web Service + 0.5GB Postgres | 15 分钟无请求休眠，冷启动 30–50 秒；SQL 要改写成 Postgres 方言 |
| Deno Deploy + Deno KV | 100 万请求/月、1GB KV | 没有持久文件系统，5 张表要重写成 KV |
| Vercel / Netlify / Cloudflare Pages 函数 | 够用 | 无状态、无持久盘，SQLite 会被清空 |

## 方式 E：Cloudflare Worker + D1

`worker.js` + `wrangler.toml` 这套仍然可用，适合不想自己维护机器的情况：

```bash
cd server
npm install
npx wrangler login                # 浏览器授权
npx wrangler d1 create zjtt       # 把 database_id 填进 wrangler.toml
npx wrangler d1 execute zjtt --remote --file=./schema.sql
npx wrangler deploy               # 输出 https://zjtt-api.<子域>.workers.dev
```

`wrangler.toml` 里两处按需改：

- `WALINE_URL`：账号校验回源的地址，默认就是现在这套 `textbox.qingdengbuyi.top`
- `ALLOWED_ORIGINS`：允许跨域的站点来源（**Origin 不含路径**，GitHub Pages 只写到用户名这一层）

---

## 部署完，把前端指过来

只改一处，前端所有模块（点赞、档案、题库）都会跟着走：

```bash
node scripts/set_api_base.mjs https://你的域名
git commit -am "chore: point API_BASE at the backend" && git push
```

临时试一个地址不用改代码：浏览器控制台执行

```js
localStorage.setItem('zjtt:apiBase', JSON.stringify('https://your-api.example.com'))
// 清掉就回默认：localStorage.removeItem('zjtt:apiBase')
```

后端连不上时：点赞退回本机模式、账号档案退回 Waline 老路径，页面不会白屏。

## 本地开发

```bash
# 终端 1：后端
PORT=8795 DB_FILE=./.tmp-syn/dev.db node server/node.js

# 终端 2：站点
PREVIEW_SITE_PORT=8899 node scripts/preview.mjs index workshop profile
```

`js/api.js` 在 `localhost` / `127.0.0.1` 下自动指向 `http://127.0.0.1:8795`，
本地站点不用改配置。换端口就改 `js/api.js` 里的 `LOCAL`，或用上面的 `apiBase` 覆盖。

## 接口

所有响应都是 `{ ok, ... }`；出错时 `ok:false` + `error` 字段 + 非 2xx 状态码。

```
GET    /health                        健康检查
GET    /likes?ids=a,b,c               赞数 + 我赞过谁 + 今日剩余额度
POST   /like     { puzzle }           点赞（需 X-Dev-Id 或登录）
POST   /claim    { puzzles: [] }      作者领赞换银芯（需登录，幂等）
GET    /account                       拉档案（需登录）
PUT    /account  { doc, ver }         写档案；版本过期返回 409 + 服务端最新 doc
GET    /puzzles?sort=new|likes&author=&limit=&offset=
POST   /puzzle   { id?, payload }     上传/更新题目（需登录，只能改自己的）
GET    /puzzle/:id                    单题 + 赞数
DELETE /puzzle/:id                    删自己的题
```

身份沿用 Waline：前端把 `Authorization: Bearer <waline token>` 带上来，
后端回源 `/api/user` 验一次后把 `sha256(token) → uid` 缓存进 `sessions`。
未登录也能点赞，用请求头 `X-Dev-Id`（本机随机 id）当身份，另按 IP 限每天 40 次。

## 备份

整个库就是一个文件（`server/data/zjtt.db`，WAL 模式下还有 `-wal` / `-shm` 两个伴生文件）。
停服务后直接拷走，或在线备份：

```bash
sqlite3 server/data/zjtt.db ".backup '/backup/zjtt-$(date +%F).db'"
```

## 老数据怎么办

老用户档案还在 Waline 的评论里。`js/account.js` 的 `pull()` 发现新库里没有记录时，
会自动从老路径读一次，随后的 `push()` 就落到新库——**只搬一次，不需要手工迁移**。
点赞的老数据（Waline 评论数）不会迁：赞数从上线那天重新计。

## 已知取舍

- **银芯本身防不住**：它最后落在账号档案的 `doc.cr` 里，用户改本地 localStorage 照样能改。
  能保证的是「赞数不可伪造」，不能保证「余额可信」。要真正锁住余额，得让所有加币都走服务端，
  那是另一笔改造。
- **游客的每日额度靠 `X-Dev-Id` + IP**：换设备 + 换网络仍能多领几次。登录用户的额度是稳的。
- **本地题没有归属记录**：只在浏览器里、没上传的题，`claim` 时服务端查不到作者，
  只做「赞数只升不降」的幂等保护。
- **`SERVE_STATIC` 只发白名单**：6 个 `.html`、`css/`、`js/`、`assets/`、`data/`、`favicon.svg`。
  `server/`（含数据库）、`.git/`、`scripts/` 一律 404，别把仓库根直接暴露出去。
