# Memories Serves AI 快速对接文档

本文档面向 AI Agent、自动化脚本和第三方系统，提供最小但完整的 API 对接契约。

## 项目信息

- 服务名称：Memories Serves
- 仓库地址：https://github.com/idoknow/Memories_Serves
- 所属组织：idoknow
- 开发人员：MrWoods1692
- 版本：0.1.0
- 协议：HTTP JSON
- 默认 Base URL：http://127.0.0.1:3000

## 核心规则

- 所有请求和响应均使用 JSON，健康检查除外也返回 JSON。
- 图片 URL 只能逐条写入，不支持批量上传。
- 图片列表每次最多返回 20 条。
- 分页方式为 keyset：下一页传入上一次响应的 `next_after_id`。
- 管理员 key 首次使用时会被写入，之后必须使用同一个 key 获取 token。
- 管理员 token 有效期 10 分钟，有效期内重复获取会返回当前 token。
- 删除接口推荐使用 `POST /admin/images/delete` 并在 body 中携带 token。

## 推荐调用流程

1. 调用 `GET /health` 判断服务是否可用。
2. 调用 `POST /images` 写入单条图片 URL。
3. 调用 `GET /images?after_id=0` 读取第一页数据。
4. 如需管理操作，调用 `GET /admin/token?key=YOUR_KEY` 获取 token。
5. 使用 token 调用删除或 WebDAV 备份配置接口。

## 接口契约

### 健康检查

```http
GET /health
```

响应：

```json
{ "ok": true }
```

### 上传图片 URL

```http
POST /images
Content-Type: application/json
```

请求：

```json
{ "url": "https://example.com/a.jpg" }
```

响应：

```json
{
  "id": 1,
  "url": "https://example.com/a.jpg",
  "uploaded_at": 1782864000000
}
```

### 读取图片列表

```http
GET /images?after_id=0
```

响应：

```json
{
  "data": [
    {
      "id": 1,
      "url": "https://example.com/a.jpg",
      "uploaded_at": 1782864000000
    }
  ],
  "next_after_id": null,
  "limit": 20
}
```

分页策略：

- 首次读取使用 `after_id=0` 或省略参数。
- 如果 `next_after_id` 为数字，下一次请求使用该值。
- 如果 `next_after_id` 为 `null`，表示当前没有下一页。

### 获取管理员 token

```http
GET /admin/token?key=YOUR_SECRET_KEY
```

响应：

```json
{
  "token": "ADMIN_TOKEN",
  "expires_at": 1782864600000,
  "ttl_seconds": 600
}
```

注意：如果服务配置了自定义 `ADMIN_PATH`，请使用实际路径替代 `/admin/token`。

### POST 删除图片记录

```http
POST /admin/images/delete
Content-Type: application/json
```

请求：

```json
{ "token": "ADMIN_TOKEN", "id": 1 }
```

响应：

```json
{ "deleted": true, "id": 1 }
```

### DELETE 删除图片记录

```http
DELETE /images/1
Authorization: Bearer ADMIN_TOKEN
```

响应：

```json
{ "deleted": true, "id": 1 }
```

### 配置 WebDAV 备份

```http
POST /admin/backup
Content-Type: application/json
```

请求：

```json
{
  "token": "ADMIN_TOKEN",
  "enabled": true,
  "webdav_url": "https://dav.example.com/backups/",
  "username": "user",
  "password": "pass"
}
```

响应：

```json
{ "ok": true, "enabled": true }
```

关闭备份：

```json
{ "token": "ADMIN_TOKEN", "enabled": false }
```

## 错误处理

常见错误响应格式：

```json
{ "error": "message" }
```

建议 AI Agent 按 HTTP 状态码处理：

- `400`：请求参数、URL 或 JSON 格式错误。
- `401`：缺少管理员 token、token 错误或 token 过期。
- `404`：资源不存在或删除目标不存在。
- `500`：服务内部错误，可稍后重试或交给人工检查日志。

## 最小 JavaScript 示例

```js
const baseUrl = 'http://127.0.0.1:3000';

async function uploadImage(url) {
  const response = await fetch(`${baseUrl}/images`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function listImages(afterId = 0) {
  const response = await fetch(`${baseUrl}/images?after_id=${afterId}`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```