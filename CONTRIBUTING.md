# 贡献指南

欢迎提交 Issue、Pull Request 来改进项目。

## 开发环境

- Node.js 18+

安装依赖：

```bash
npm install
```

启动后端（`http://localhost:5000`）：

```bash
npm run server
```

启动前端（`http://localhost:3000`）：

```bash
npm run dev
```

## 提交规范（建议）

- 一个 PR 只做一类改动（例如：修复 Bug / 新功能 / 重构 / 文档）
- 提交信息建议使用简洁的动词开头（如：`fix:`、`feat:`、`docs:`）
- 不提交构建产物（如 `dist/`）、依赖目录（如 `node_modules/`）、数据库文件（如 `server/users.db`）

## 代码风格

- TypeScript/React：保持现有代码风格与目录分组
- 新增组件放在 `src/components/` 下，尽量保持组件粒度清晰
- 与后端交互统一使用现有的 `fetch` 调用方式

## 安全

- 不要提交任何密钥、Token、账号密码等敏感信息
- 生产环境必须配置 `JWT_SECRET`

