# Linux 部署手册（含 Git 推送自动更新）

本手册仅覆盖 Linux（推荐 Ubuntu 22.04+/Debian 12+）：前端+后端一体化部署，由 Node.js 服务同时提供页面与 API，并支持“推送到 Git 仓库后自动部署更新”。

## 1. 服务器准备（一次性）

### 1.1 安装基础软件

```bash
sudo apt update
sudo apt install -y git curl
```

安装 Node.js 18+（用 nvm 示例）：

```bash
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
node -v
npm -v
```

安装 pm2（用于守护与重启）：

```bash
npm i -g pm2
pm2 -v
```

### 1.2 拉取代码到服务器

```bash
sudo mkdir -p /opt/bookmark-manager
sudo chown -R $USER:$USER /opt/bookmark-manager
git clone <your-repo-url> /opt/bookmark-manager
cd /opt/bookmark-manager
```

### 1.3 配置生产环境变量（推荐用 .env）

在服务器创建 `/opt/bookmark-manager/.env`（不要提交到仓库）：

```bash
cat > /opt/bookmark-manager/.env <<'EOF'
NODE_ENV=production
PORT=5000
JWT_SECRET=change-me-in-production
DEFAULT_ADMIN_PASSWORD=change-me-in-production
EOF
```

### 1.4 首次构建与启动

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

SQLite 数据库默认位于：`/opt/bookmark-manager/server/users.db`（请做备份，确保该目录可读写）。

## 2. 自动更新（Git push 自动部署）

原理：在 GitHub 仓库开启 Actions；每次 push 到 `main` 分支，Actions 通过 SSH 登录服务器执行：

`git pull -> npm ci -> npm run build -> pm2 restart`

### 2.1 服务器创建部署用 SSH Key（推荐单独用户/密钥）

在你本地（或任意安全机器）生成一对 key：

```bash
ssh-keygen -t ed25519 -C "bookmark-manager-deploy" -f deploy_key
```

把公钥追加到服务器的部署用户（例如当前用户）的 `authorized_keys`：

```bash
ssh-copy-id -i deploy_key.pub <user>@<host>
```

### 2.2 在 GitHub 仓库添加 Secrets

仓库 -> Settings -> Secrets and variables -> Actions -> New repository secret：

- `DEPLOY_HOST`：服务器 IP / 域名
- `DEPLOY_USER`：SSH 用户名
- `DEPLOY_SSH_KEY`：私钥内容（把 `deploy_key` 文件全文复制进去）
- `DEPLOY_PORT`：SSH 端口（默认 22，可不填）

### 2.3 工作流文件

仓库已提供工作流文件：`.github/workflows/deploy-linux.yml`

默认行为：push 到 `main` 时，部署到服务器 `/opt/bookmark-manager`，并重启 pm2 进程 `bookmark-manager`。

## 3. 常用运维命令

查看服务状态与日志：

```bash
pm2 status
pm2 logs bookmark-manager
```

手动更新（不走自动部署）：

```bash
cd /opt/bookmark-manager
git pull
npm ci
npm run build
pm2 restart bookmark-manager --update-env
pm2 save
```

## 4. 常见问题

### 4.1 前端能打开但登录接口报错

确认后端端口与进程：

```bash
pm2 status
curl -sS http://localhost:5000/api/health
```

### 4.2 提示缺少 JWT_SECRET

确认 `.env` 存在且包含 `NODE_ENV=production` 与 `JWT_SECRET`，然后重启：

```bash
cd /opt/bookmark-manager
pm2 restart bookmark-manager --update-env
```
