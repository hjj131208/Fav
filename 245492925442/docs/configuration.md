# 配置说明

本项目默认可直接运行，但生产环境建议通过环境变量进行必要配置。

## 环境变量

| 变量名 | 默认值 | 说明 |
|---|---:|---|
| `PORT` | `5000` | 服务监听端口 |
| `JWT_SECRET` | 内置默认值 | JWT 签名密钥。生产环境必须设置为强随机值 |
| `NODE_ENV` | 未强制 | 建议生产环境设置为 `production` |
| `DEFAULT_ADMIN_USERNAME` | `admin` | 首次初始化时创建的管理员用户名 |
| `DEFAULT_ADMIN_EMAIL` | `admin@example.com` | 首次初始化时创建的管理员邮箱 |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | 首次初始化时创建的管理员密码（生产环境必须设置） |

## 数据存储

- SQLite 数据库文件：`server/users.db`
- 建议：部署时将 `server/users.db` 做备份与持久化挂载（Docker 场景）

## 限流策略

- 登录接口 `POST /api/auth/login`：每 IP 15 分钟最多 10 次
- 其余 `/api/*`：每 IP 15 分钟最多 5000 次

如需调整限流参数，可修改 `server/index.js` 中的 `loginLimiter` 与 `apiLimiter` 配置。

## 跨域（开发环境）

开发模式下后端允许跨域请求（CORS），便于前端 `http://localhost:3000` 访问后端 `http://localhost:5000`。

生产环境建议配置为固定域名来源，并配合 Nginx 进行 HTTPS 与反向代理。
