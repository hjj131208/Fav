# API 文档

所有 API 默认前缀为 `/api`。需要登录的接口必须携带 Header：

`Authorization: Bearer <token>`

## 1. 健康检查

### `GET /api/health`

响应：

```json
{ "ok": true, "ts": 1730000000000 }
```

## 2. 认证（Auth）

### 2.1 注册

`POST /api/auth/register`

请求体：

```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "password123"
}
```

成功响应（201）：

```json
{
  "message": "User created",
  "user": { "id": 1, "username": "user123", "email": "user@example.com" }
}
```

### 2.2 登录

`POST /api/auth/login`

请求体：

```json
{
  "usernameOrEmail": "user123",
  "password": "password123"
}
```

成功响应（200）：

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "user": { "id": 1, "username": "user123", "email": "user@example.com", "role": "user" }
}
```

### 2.3 获取当前用户

`GET /api/auth/me`

成功响应（200）：

```json
{ "id": 1, "username": "user123", "email": "user@example.com", "role": "user", "created_at": "..." }
```

## 3. 用户数据同步

### 3.1 拉取云端数据

`GET /api/user/data`

成功响应（200）：

```json
{
  "categories": [],
  "bookmarks": []
}
```

### 3.2 全量同步数据（导入/批量操作适用）

`POST /api/user/sync`

请求体：

```json
{
  "categories": [],
  "bookmarks": []
}
```

成功响应（200）：

```json
{ "success": true }
```

## 4. 分类（Categories）

### 4.1 新增分类

`POST /api/categories`

请求体示例：

```json
{
  "id": "uuid",
  "name": "学习",
  "icon": "fa-folder",
  "color": "#6366f1",
  "sortOrder": 0
}
```

### 4.2 更新分类

`PUT /api/categories/:id`

请求体示例：

```json
{ "name": "学习资源", "icon": "fa-book", "color": "#22c55e" }
```

### 4.3 删除分类

`DELETE /api/categories/:id`

## 5. 书签（Bookmarks）

### 5.1 新增书签

`POST /api/bookmarks`

请求体示例：

```json
{
  "id": "uuid",
  "title": "示例站点",
  "url": "https://example.com",
  "categoryId": "uuid",
  "description": "可选",
  "favicon": "data:image/png;base64,...",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "visitCount": 0
}
```

### 5.2 更新书签

`PUT /api/bookmarks/:id`

请求体示例：

```json
{ "title": "新标题", "isPinned": true }
```

### 5.3 删除书签

`DELETE /api/bookmarks/:id`

## 6. 管理员接口（Admin）

管理员接口需要同时满足：

- 已登录（携带 JWT）
- `role === "admin"`

### 6.1 获取用户列表

`GET /api/admin/users`

### 6.2 创建用户

`POST /api/admin/users`

请求体示例：

```json
{ "username": "newuser", "email": "new@x.com", "password": "password123", "role": "user" }
```

### 6.3 更新用户

`PUT /api/admin/users/:id`

请求体示例：

```json
{ "username": "rename", "password": "newpassword123" }
```

### 6.4 删除用户

`DELETE /api/admin/users/:id`

## 7. 链接健康检查

### `GET /api/link-health?url=<url>&mode=auto|http|tcp&timeoutMs=6000`

用于检测链接状态（HTTP / TCP），响应会给出 `status`（如 `ok` / `dead` / `unknown`）等信息。

