-- 战报侦探 后端数据库（Cloudflare D1 / SQLite）
-- 用法：wrangler d1 execute zjtt --remote --file=./schema.sql

-- 账号档案：一位用户一条 JSON 文档，ver 做乐观锁
CREATE TABLE IF NOT EXISTS accounts (
  uid   TEXT PRIMARY KEY,          -- Waline 用户 objectId
  doc   TEXT NOT NULL,             -- 档案 JSON
  ver   INTEGER NOT NULL DEFAULT 1,
  at    INTEGER NOT NULL
);

-- 点赞：一人一题一条，主键天然防重复
CREATE TABLE IF NOT EXISTS likes (
  puzzle TEXT NOT NULL,            -- 题目 id
  voter  TEXT NOT NULL,            -- u<uid> 登录用户 / d<devid> 游客
  uid    TEXT,                     -- 登录用户才有
  day    TEXT NOT NULL,            -- 东八区 YYYY-MM-DD
  at     INTEGER NOT NULL,
  ip     TEXT,                     -- 游客 IP，仅用于额度兜底
  PRIMARY KEY (puzzle, voter)
);
CREATE INDEX IF NOT EXISTS likes_voter_day ON likes (voter, day);
CREATE INDEX IF NOT EXISTS likes_puzzle ON likes (puzzle);
CREATE INDEX IF NOT EXISTS likes_ip_day ON likes (ip, day);

-- 工坊题库：别人能直接按 id 拉到的自建题
CREATE TABLE IF NOT EXISTS puzzles (
  id          TEXT PRIMARY KEY,
  author      TEXT,                -- 未登录上传的留空
  author_name TEXT,
  title       TEXT,
  payload     TEXT NOT NULL,       -- 题目 JSON
  at          INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS puzzles_author ON puzzles (author, updated_at DESC);
CREATE INDEX IF NOT EXISTS puzzles_new ON puzzles (updated_at DESC);

-- 作者结算基准：每题已经折过银芯的赞数，只升不降，防重复发钱
CREATE TABLE IF NOT EXISTS claims (
  author   TEXT NOT NULL,
  puzzle   TEXT NOT NULL,
  credited INTEGER NOT NULL,
  at       INTEGER NOT NULL,
  PRIMARY KEY (author, puzzle)
);

-- 登录 token 校验缓存，避免每个请求都回源 Waline
CREATE TABLE IF NOT EXISTS sessions (
  thash TEXT PRIMARY KEY,          -- sha256(token)
  uid   TEXT NOT NULL,
  name  TEXT,
  at    INTEGER NOT NULL
);

-- 首页：每个游戏一人一条评分（重复提交是改分）
CREATE TABLE IF NOT EXISTS home_ratings (
  game   TEXT NOT NULL,
  voter  TEXT NOT NULL,            -- u<uid> 登录用户 / d<device> 本机随机 id
  stars  INTEGER NOT NULL,         -- 1..5
  body   TEXT,                     -- 一句短评（可空）
  at     INTEGER NOT NULL,
  PRIMARY KEY (game, voter)
);

-- 首页：BUG 反馈（只有作者看，不做公开列表）
CREATE TABLE IF NOT EXISTS home_bugs (
  id      TEXT PRIMARY KEY,
  game    TEXT NOT NULL,
  body    TEXT NOT NULL,
  contact TEXT,
  ver     TEXT,
  ua      TEXT,
  at      INTEGER NOT NULL
);
