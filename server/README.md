# 后端（Cloudflare Worker + D1）

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

## 部署

需要 Cloudflare 账号（免费额度足够：D1 每天 500 万次读、10 万次写）。

```bash
cd server
npm install                       # 只装 wrangler
npx wrangler login                # 浏览器里授权一次

npx wrangler d1 create zjtt       # 把输出的 database_id 填进 wrangler.toml
npx wrangler d1 execute zjtt --remote --file=./schema.sql
npx wrangler deploy               # 输出 https://zjtt-api.<子域>.workers.dev

cd ..
node scripts/set_api_base.mjs https://zjtt-api.<子域>.workers.dev
git commit -am "chore: point API_BASE at the deployed worker" && git push
```

`wrangler.toml` 里两处按需改：

- `WALINE_URL`：账号校验回源的地址，默认就是现在这套 `textbox.qingdengbuyi.top`
- `ALLOWED_ORIGINS`：允许跨域的站点来源（**Origin 不含路径**，GitHub Pages 只写到用户名这一层）。
  `localhost` / `127.0.0.1` 的任意端口已经自动放行，正式域名必须列进来，否则浏览器会拦。

## 本地开发

```bash
cd server
npx wrangler d1 execute zjtt --local --file=./schema.sql   # 本地库建表
npx wrangler dev --port 8791

# 另一个终端，站点照旧
PREVIEW_SITE_PORT=8899 node scripts/preview.mjs index workshop profile
```

`js/api.js` 在 `localhost` / `127.0.0.1` 下自动指向 `http://127.0.0.1:8791`，
所以本地站点不用改任何配置就能连上本地 Worker。
（`--port 8791` 是约定值，因为 `scripts/preview.mjs` 自己占着 8787。）

想在浏览器里连别的后端：控制台执行 `localStorage.setItem('zjtt:apiBase', JSON.stringify('https://…'))`，
或清掉这个键回到默认。

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
Worker 回源 `/api/user` 验一次后把 `sha256(token) → uid` 缓存进 `sessions`。
未登录也能点赞，用请求头 `X-Dev-Id`（本机随机 id）当身份，另按 IP 限每天 40 次。

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
