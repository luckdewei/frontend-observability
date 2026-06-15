# API 文档

基础 URL：`http://localhost:3000/api`

所有响应均为 JSON。错误响应格式：

```json
{
  "statusCode": 400,
  "message": "错误描述",
  "error": "Bad Request"
}
```

---

## 鉴权

### SDK 上报鉴权

上报接口需在请求头携带：

```
X-App-Key: <项目的 appKey>
```

### 管理端

当前 MVP 版本管理端 API 无额外鉴权（本地开发）。生产环境建议增加 JWT 或 API Key。

---

## 事件上报

### POST /api/ingest

单条事件上报（SDK Transport 默认路径）。

**请求头：**

```
Content-Type: application/json
X-App-Key: demo-app-key
```

**请求体：**

```json
{
  "events": [
    {
      "type": "error",
      "sessionId": "uuid",
      "url": "http://localhost:5174/",
      "userAgent": "Mozilla/5.0 ...",
      "payload": {
        "message": "Test error",
        "stack": "Error: Test error\n    at ..."
      },
      "timestamp": 1718000000000
    }
  ]
}
```

**响应：**

```json
{
  "accepted": 1,
  "message": "成功接收 1 条事件"
}
```

### POST /api/ingest/batch

批量上报，请求格式与 `/api/ingest` 相同。

---

## 事件查询

### GET /api/events

分页查询监控事件。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | 按项目筛选 |
| `type` | string | 事件类型：`ERROR` / `PERFORMANCE` / `REPLAY` |
| `sessionId` | string | 按会话筛选 |
| `page` | number | 页码，默认 1 |
| `pageSize` | number | 每页条数，默认 20 |

**响应：**

```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "type": "ERROR",
      "payload": { "message": "...", "stack": "..." },
      "sessionId": "uuid",
      "url": "http://localhost:5174/",
      "userAgent": "Mozilla/5.0 ...",
      "createdAt": "2026-06-15T12:00:00.000Z"
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 20
}
```

### GET /api/events/:id

获取单条事件详情（含完整 payload，用于回放）。

**响应：** 单个 `MonitorEvent` 对象。

---

## 性能聚合

### GET /api/performance/summary

获取 Web Vitals 分位数统计。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `projectId` | string | 项目 ID（可选） |
| `days` | number | 统计天数，默认 7 |

**响应：**

```json
{
  "lcp": { "p50": 1200, "p75": 1800, "p95": 3200 },
  "inp": { "p50": 80, "p75": 150, "p95": 300 },
  "cls": { "p50": 0.05, "p75": 0.12, "p95": 0.25 },
  "totalEvents": 156
}
```

---

## 项目管理

### GET /api/projects

获取所有项目列表。

### POST /api/projects

创建项目。

**请求体：**

```json
{
  "name": "我的前端应用"
}
```

**响应：** 包含自动生成的 `appKey`。

### GET /api/projects/:id

获取单个项目详情。

### PUT /api/projects/:id

更新项目名称。

### DELETE /api/projects/:id

删除项目及其所有关联事件。

---

## SDK 事件类型映射

| SDK type | 数据库 EventType |
|----------|------------------|
| `error` | `ERROR` |
| `performance` | `PERFORMANCE` |
| `replay` | `REPLAY` |
