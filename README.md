# Memories Serves

轻量图片 URL API 服务，使用 Rust、Axum、SQLx 和高性能 SQLite。程序启动脚本会在缺少 Rust 环境时自动安装 rustup，再编译 release 版本运行，适合 2c2g 小服务器单实例稳定运行。

## 启动

推荐 Linux 服务器直接运行启动脚本：

```bash
chmod +x scripts/bootstrap.sh
./scripts/bootstrap.sh
```

默认监听 `0.0.0.0:3000`，数据库位于 `data/images.sqlite`。

可用环境变量：

```bash
PORT=3000
HOST=0.0.0.0
DATA_DIR=./data
DB_PATH=./data/images.sqlite
ADMIN_PATH=/admin/token
RATE_LIMIT_MAX=600
DB_MAX_CONNECTIONS=8
RUST_LOG=info
```

开发环境可直接运行：

```bash
cargo run
```

## 图片 API

### 上传单条 URL

```bash
curl -X POST http://127.0.0.1:3000/images \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/a.jpg"}'
```

返回：

```json
{
  "id": 1,
  "url": "https://example.com/a.jpg",
  "uploaded_at": 1782864000000
}
```

### 读取图片列表

每次固定返回最多 20 条，使用 `after_id` 做高性能分页。

```bash
curl 'http://127.0.0.1:3000/images?after_id=0'
```

返回字段包含图片链接和上传日期时间戳：

```json
{
  "data": [
    { "id": 1, "url": "https://example.com/a.jpg", "uploaded_at": 1782864000000 }
  ],
  "next_after_id": null,
  "limit": 20
}
```

## 管理员

### 获取管理员 token

指定管理接口位置发送 `key` 参数即可获取 token。首次请求时，如果系统没有管理员 key，该请求中的 key 会被写入为管理员 key。

```bash
curl 'http://127.0.0.1:3000/admin/token?key=your-secret-key'
```

token 有效期 10 分钟。有效期内用正确 key 请求会返回当前 token；10 分钟后旧 token 自动失效，再用正确 key 请求会生成新 token。

### 删除某条数据

POST 删除接口需要携带 token：

```bash
curl -X POST http://127.0.0.1:3000/admin/images/delete \
  -H 'content-type: application/json' \
  -d '{"token":"ADMIN_TOKEN","id":1}'
```

也支持标准 Bearer 方式：

```bash
curl -X DELETE http://127.0.0.1:3000/images/1 \
  -H 'authorization: Bearer ADMIN_TOKEN'
```

## WebDAV 备份配置

修改备份配置需要管理员 token。

```bash
curl -X POST http://127.0.0.1:3000/admin/backup \
  -H 'content-type: application/json' \
  -d '{
    "token":"ADMIN_TOKEN",
    "enabled":true,
    "webdav_url":"https://dav.example.com/backups/",
    "username":"user",
    "password":"pass"
  }'
```

服务每天 1 点自动备份 SQLite 数据库到 WebDAV。关闭备份：

```bash
curl -X POST http://127.0.0.1:3000/admin/backup \
  -H 'content-type: application/json' \
  -d '{"token":"ADMIN_TOKEN","enabled":false}'
```

## 自动顺序请求

每天 0 点到 6 点之间，服务会顺序请求数据库里的 URL。请求速率控制为约每秒 1 次，满足 5 秒内最多 5 次。每次请求完成后记录当前 ID，第二天从记录位置继续；如果全部请求完成，则从头开始。

## 性能说明

- SQLite 使用 WAL、NORMAL synchronous、busy timeout、连接池和 SQLx 参数化查询。
- 写入接口每次只写入一条 URL，避免大批量请求拖垮小机器。
- 读取接口使用 `id > after_id` 的 keyset 分页，每页 20 条。
- 请求体限制为 64KB，默认数据库连接池最大 8 个连接，可通过 `DB_MAX_CONNECTIONS` 调整。
- 建议用 systemd 保持单实例运行；SQLite 写入密集场景不要启动多个进程同时写同一个数据库。

## 健康检查

```bash
curl http://127.0.0.1:3000/health
```