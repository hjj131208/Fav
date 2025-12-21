# 部署手册

本手册覆盖从环境准备、构建、配置到启动/停止的完整流程，适用于在服务器上部署本项目（前端 + 后端一体化，由 Node.js 服务同时提供页面与 API）。

## 1. 环境准备

### 系统要求

- Windows / Linux / macOS 均可
- 建议 1C2G 以上（数据量较大时建议更高）

### 软件版本要求

- Node.js：18+（建议使用 LTS）
- npm：随 Node.js 安装
- Git：用于拉取代码

可选：

- Docker：用于容器化部署
- pm2：用于后台守护进程与开机自启
- Nginx：用于反向代理与 HTTPS 终止

## 2. 获取代码

```bash
git clone <your-repo-url>
cd <project-root>
```

## 3. 安装依赖

```bash
npm install
```

## 4. 配置修改指南

### 4.1 环境变量

生产环境必须设置 `JWT_SECRET` 与 `DEFAULT_ADMIN_PASSWORD`。

Linux/macOS 示例：

```bash
export JWT_SECRET="change-me-in-production"
export DEFAULT_ADMIN_PASSWORD="change-me-in-production"
export PORT=5000
```

Windows PowerShell 示例：

```powershell
$env:JWT_SECRET="change-me-in-production"
$env:DEFAULT_ADMIN_PASSWORD="change-me-in-production"
$env:PORT="5000"
```

配置项说明见：`docs/configuration.md`

### 4.2 数据持久化（SQLite）

项目使用 SQLite 数据库文件保存用户与同步数据。

- 默认数据库文件：`server/users.db`
- 建议将该文件纳入备份，并确保进程对 `server/` 目录可读写

## 5. 构建

```bash
npm run build
```

构建产物输出到 `dist/client`，用于生产环境由后端服务直接提供静态文件。

## 6. 启动与停止

### 6.1 直接启动（前台）

```bash
npm run server
```

启动成功后访问：

- 页面：`http://<host>:<port>/`
- 健康检查：`http://<host>:<port>/api/health`

停止：在当前终端 `Ctrl + C`

### 6.2 pm2 启动（推荐）

安装 pm2：

```bash
npm install -g pm2
```

启动：

```bash
pm2 start server/index.js --name bookmark-manager
```

查看状态：

```bash
pm2 status
pm2 logs bookmark-manager
```

停止/重启：

```bash
pm2 stop bookmark-manager
pm2 restart bookmark-manager
```

开机自启：

```bash
pm2 startup
pm2 save
```

## 7. Docker 部署

### 7.1 构建镜像

```bash
docker build -t bookmark-manager .
```

### 7.2 运行容器

```bash
docker run -d \
  -p 5000:5000 \
  -e PORT=5000 \
  -e JWT_SECRET="change-me-in-production" \
  -e DEFAULT_ADMIN_PASSWORD="change-me-in-production" \
  --name bookmark-manager \
  bookmark-manager
```

### 7.3 持久化数据库（重要）

建议将数据库文件挂载到宿主机：

Linux/macOS：

```bash
docker run -d \
  -p 5000:5000 \
  -e PORT=5000 \
  -e JWT_SECRET="change-me-in-production" \
  -e DEFAULT_ADMIN_PASSWORD="change-me-in-production" \
  -v "$(pwd)/server/users.db:/app/server/users.db" \
  --name bookmark-manager \
  bookmark-manager
```

Windows PowerShell：

```powershell
docker run -d `
  -p 5000:5000 `
  -e PORT=5000 `
  -e JWT_SECRET="change-me-in-production" `
  -e DEFAULT_ADMIN_PASSWORD="change-me-in-production" `
  -v "${PWD}\server\users.db:/app/server/users.db" `
  --name bookmark-manager `
  bookmark-manager
```

## 8. 常见问题（FAQ）

### 8.1 启动后访问页面显示 “Client build not found”

原因：未执行构建或 `dist/client` 不存在。

解决：

```bash
npm run build
npm run server
```

### 8.2 端口被占用

修改 `PORT` 后重新启动：

```bash
PORT=8080 npm run server
```

### 8.3 登录/同步返回 “Too many requests”

原因：触发了服务端限流策略。

解决：

- 减少并发导入/同步频率
- 检查是否存在循环请求

### 8.4 数据库文件权限问题

确保运行用户对 `server/users.db` 拥有读写权限，必要时调整权限或将数据库路径挂载到可写目录。
