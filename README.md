# 网站收藏管理器

一个支持「本地使用 + 登录云端同步」的网站收藏管理工具，提供分类管理、批量导入、搜索与多端同步等能力。

- 前端：React 18 / TypeScript / Vite / Tailwind CSS
- 后端：Node.js / Express / SQLite
- 认证与安全：JWT / bcrypt / express-rate-limit / helmet / cors

## 目录

- [项目简介](#项目简介)
- [功能特性](#功能特性)
- [系统要求](#系统要求)
- [快速开始（开发）](#快速开始开发)
- [生产部署（Linux）](#生产部署linux)
- [自动更新（Git push）](#自动更新git-push)
- [配置说明](#配置说明)
- [运维命令](#运维命令)
- [验证与排障](#验证与排障)
- [许可证](#许可证)

## 项目简介

本项目支持两种使用方式：

- 游客模式：不登录，数据仅保存在浏览器本地存储
- 登录同步：通过后端 API 登录与数据同步，数据持久化在 SQLite（`server/users.db`）

生产环境推荐形态为「一个 Node 服务同时提供页面与 API」：

- 页面：`/`
- API：`/api/*`

## 功能特性

- 分类管理：自定义分类名称、图标与颜色
- 书签管理：新增/编辑/删除、置顶、收藏、访问计数
- 搜索能力：站内搜索 + 多搜索引擎快捷检索
- 导入导出：支持 HTML 书签文件与 JSON 数据导入
- 登录与云端同步：跨设备同步分类与书签
- 管理员面板：用户管理（管理员权限控制）

## 系统要求

- Node.js：18+（建议 LTS）
- npm：随 Node.js 安装
- 操作系统：Linux（生产推荐 Ubuntu 22.04+/Debian 12+）

生产推荐组件：

- pm2：守护进程、日志与开机自启
- Nginx/Caddy：反向代理与 HTTPS

## 快速开始（开发）

```bash
npm install
```

启动后端（API）：

```bash
npm run server
```

另开终端启动前端（Vite 开发服务器）：

```bash
npm run dev
```

可选：运行 Auth API 测试脚本（需后端已启动）：

```bash
node tests/auth.test.js
```

## 生产部署（Linux）

下面默认将项目部署到 `/opt/bookmark-manager`，并由 pm2 守护 `server/index.js`（页面与 API 一体）。

### 1) 服务器准备（一次性）

安装基础软件：

```bash
sudo apt update
sudo apt install -y git curl
```

安装 Node.js 18+（nvm 示例）：

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v
npm -v
```

安装 pm2：

```bash
npm i -g pm2
pm2 -v
```

### 2) 拉取代码

```bash
sudo mkdir -p /opt/bookmark-manager
sudo chown -R $USER:$USER /opt/bookmark-manager
git clone <your-repo-url> /opt/bookmark-manager
cd /opt/bookmark-manager
```

### 3) 配置生产环境变量（推荐用 .env）

在服务器创建 `/opt/bookmark-manager/.env`（不要提交到仓库）：

```bash
cat > /opt/bookmark-manager/.env <<'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=change-me-in-production
DEFAULT_ADMIN_PASSWORD=change-me-in-production
EOF
```

### 4) 构建与启动

```bash
cd /opt/bookmark-manager
npm ci
npm run build
pm2 start server/index.js --name bookmark-manager --update-env
pm2 save
```

验证：

- 页面：`http://<host>:5000/`
- 健康检查：`http://<host>:5000/api/health`

数据库位置：

- SQLite：`/opt/bookmark-manager/server/users.db`（请做备份，确保目录可读写）

## 自动更新（Git push）

原理：在 GitHub 仓库开启 Actions；每次 push 到 `main` 分支，Actions 通过 SSH 登录服务器执行：

`git fetch/reset -> npm ci -> npm run build -> pm2 restart`

### 1) 准备部署 SSH Key

在你本地（或任意安全机器）生成一对 key：

```bash
ssh-keygen -t ed25519 -C "bookmark-manager-deploy" -f deploy_key
```

把公钥追加到服务器部署用户的 `authorized_keys`：

```bash
ssh-copy-id -i deploy_key.pub <user>@<host>
```

### 2) 配置 GitHub Actions Secrets

仓库 -> Settings -> Secrets and variables -> Actions -> New repository secret：

- `DEPLOY_HOST`：服务器 IP / 域名
- `DEPLOY_USER`：SSH 用户名
- `DEPLOY_SSH_KEY`：私钥内容（把 `deploy_key` 文件全文复制进去）
- `DEPLOY_PORT`：SSH 端口（默认 22，可不填）

### 3) 工作流说明

工作流文件：`.github/workflows/deploy-linux.yml`

默认行为：

- push 到 `main` 时部署到 `/opt/bookmark-manager`
- 通过 pm2 重启 `bookmark-manager`

如果服务器使用 nvm 安装 Node.js，工作流会在远端自动加载 nvm 环境，确保 `node/npm/pm2` 可用。

## 配置说明

生产环境建议最少配置：

- `NODE_ENV=production`
- `JWT_SECRET`：强随机值（生产必须设置）
- `DEFAULT_ADMIN_PASSWORD`：强密码（生产必须设置）

端口配置：

- `PORT`：默认 5000

## 运维命令

```bash
pm2 status
pm2 logs bookmark-manager
pm2 restart bookmark-manager --update-env
pm2 save
```

## 验证与排障

健康检查（必须通过）：

```bash
curl -sS http://localhost:5000/api/health
```

前端能打开但登录/接口报错：

- 确认后端进程：`pm2 status`
- 确认服务可达：`curl -sS http://localhost:5000/api/health`

生产启动提示缺少 `JWT_SECRET`：

- 确认 `/opt/bookmark-manager/.env` 存在且包含 `NODE_ENV=production` 与 `JWT_SECRET`
- 重启：`pm2 restart bookmark-manager --update-env`

## 许可证

MIT License，详见 `LICENSE`。
