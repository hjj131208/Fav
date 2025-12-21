# 网站收藏管理器

一个支持「本地使用 + 登录云端同步」的网站收藏管理工具，提供分类管理、批量导入、搜索与多端同步等能力。

## 核心功能

- 分类管理：自定义分类名称、图标与颜色
- 书签管理：新增/编辑/删除、置顶、收藏、访问计数
- 搜索能力：站内搜索 + 多搜索引擎快捷检索
- 导入导出：支持 HTML 书签文件与 JSON 数据导入
- 登录与云端同步：JWT + SQLite 存储，跨设备同步分类与书签
- 管理员面板：用户列表、创建/编辑/删除用户（管理员权限控制）

## 技术栈

- 前端：React 18、TypeScript、Vite、Tailwind CSS
- 后端：Node.js、Express、SQLite
- 认证：JWT、bcrypt、express-rate-limit、helmet、cors

## 目录结构

```
.
├─ public/               # 静态资源
├─ server/               # 后端 API 与数据库逻辑
├─ src/                  # 前端源码
├─ tests/                # 简单测试脚本
├─ docs/                 # 文档（部署、API、配置等）
└─ package.json
```

## 快速开始（开发环境）

### 1) 安装依赖

```bash
npm install
```

### 2) 启动后端

```bash
npm run server
```

默认监听：`http://localhost:5000`

### 3) 启动前端（开发服务器）

另开一个终端运行：

```bash
npm run dev
```

访问：`http://localhost:3000`

## 生产构建与运行

### 1) 构建前端

```bash
npm run build
```

产物目录：`dist/client`

### 2) 启动服务

```bash
npm run server
```

服务会同时提供：

- 前端页面（静态文件）：`/`
- 后端 API：`/api/*`

## 配置

配置参数与说明见：`docs/configuration.md`

最重要的环境变量：

- `PORT`：服务端口（默认 5000）
- `JWT_SECRET`：JWT 密钥（生产环境必须设置）
- `DEFAULT_ADMIN_PASSWORD`：首次初始化管理员密码（生产环境必须设置）

## API 文档

API 与示例请求见：`docs/api.md`

## 部署指南

分步骤部署手册见：`docs/deployment.md`

## 贡献指南

见：`CONTRIBUTING.md`

## 许可证

本项目采用 MIT License，详见 `LICENSE`。
