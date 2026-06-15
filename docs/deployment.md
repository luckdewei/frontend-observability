# 部署说明

## 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | >= 18 |
| PostgreSQL | >= 14 |
| Docker（可选） | >= 20 |

## 本地开发部署

### 1. 数据库

使用 Docker Compose 一键启动：

```bash
docker compose up -d
```

连接信息：

```
postgresql://postgres:postgres@localhost:5432/frontend_observability
```

### 2. 环境变量

复制服务端环境变量模板：

```bash
cp packages/server/.env.example packages/server/.env
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | 见 `.env.example` |
| `PORT` | 服务端口 | `3000` |

### 3. 数据库迁移与种子

```bash
cd packages/server
npx prisma db push
npx prisma db seed
```

### 4. 构建与启动

```bash
# 根目录
npm install
npm run build

# 启动上报服务
npm run dev:server

# 启动管理后台
npm run dev:dashboard

# 启动演示站点
npm run dev:demo
```

## 生产部署建议

### 上报服务

```bash
cd packages/server
npm run build
NODE_ENV=production node dist/src/main.js
```

建议使用 PM2 或 Docker 容器化：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY packages/server/dist ./dist
COPY packages/server/node_modules ./node_modules
COPY packages/server/prisma ./prisma
ENV DATABASE_URL=postgresql://...
ENV PORT=3000
CMD ["node", "dist/src/main.js"]
```

### 管理后台

```bash
cd packages/dashboard
npm run build
# 将 dist/ 部署到 Nginx 或 CDN
```

Nginx 反向代理示例：

```nginx
server {
    listen 80;
    server_name monitor.example.com;

    location / {
        root /var/www/dashboard/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
    }
}
```

### SDK 分发

```bash
cd packages/sdk
npm run build
# dist/ 目录包含 ESM + CJS 产物
# 可发布到私有 npm 或通过 CDN 引入
```

## 安全 checklist

- [ ] 修改默认数据库密码
- [ ] 为管理端 API 增加认证（JWT / API Key）
- [ ] 配置 HTTPS
- [ ] 限制上报请求体大小
- [ ] 配置 CORS 白名单（仅允许已知域名）
- [ ] 定期清理过期事件数据

## 数据清理

可通过 Prisma 或 SQL 定期清理旧数据：

```sql
DELETE FROM "MonitorEvent"
WHERE "createdAt" < NOW() - INTERVAL '90 days';
```

建议配合 PostgreSQL 分区表或定时任务（cron）使用。
