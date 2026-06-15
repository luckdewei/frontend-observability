# frontend-observability

前端可观测性（Frontend Observability）平台 —— 自托管的错误监控、性能分析与 rrweb 会话回放系统。

**GitHub 仓库：** https://github.com/luckdewei/frontend-observability

## 功能概览

| 模块 | 能力 |
|------|------|
| **SDK** (`packages/sdk`) | 错误采集、Web Vitals、长任务、面包屑、rrweb 环形缓冲回放 |
| **Server** (`packages/server`) | NestJS 上报与查询 API，PostgreSQL 持久化 |
| **Dashboard** (`packages/dashboard`) | Vue3 管理后台：错误列表、性能看板、会话回放 |
| **Demo** (`apps/demo`) | 集成演示站点，可手动触发各类异常 |

## 架构图

```
浏览器应用 ──SDK──▶ 上报服务(NestJS) ──▶ PostgreSQL
                         ▲
管理后台(Vue3) ──────────┘ 查询 API
```

详细设计见 [docs/architecture.md](./docs/architecture.md)。

## 快速开始

### 1. 启动数据库

```bash
docker compose up -d
```

### 2. 安装依赖

```bash
npm install
```

### 3. 初始化数据库

```bash
cd packages/server
cp .env.example .env
npx prisma db push
npx prisma db seed
cd ../..
```

默认种子项目 `appKey` 为 `demo-app-key`。

### 4. 启动开发环境

```bash
# 上报服务 + 演示站点
npm run dev

# 另开终端：管理后台
npm run dev:dashboard
```

| 服务 | 地址 |
|------|------|
| 上报 API | http://localhost:3000/api |
| 管理后台 | http://localhost:5173 |
| 演示站点 | http://localhost:5174 |

### 5. SDK 接入示例

```typescript
import { initMonitor } from '@frontend-observability/sdk';

initMonitor({
  appKey: 'demo-app-key',
  dsn: 'http://localhost:3000/api/ingest',
  sampleRate: 1,
  replay: { enabled: true, bufferSeconds: 30 },
  performance: { webVitals: true, longTask: true },
  privacy: { maskAllInputs: true },
});
```

详见 [docs/sdk-integration.md](./docs/sdk-integration.md)。

## 测试

```bash
# SDK 单元测试
npm run test -w @frontend-observability/sdk

# E2E 全链路（自动启动 server + demo）
npm run test:e2e
```

## 文档索引

- [架构设计](./docs/architecture.md)
- [API 文档](./docs/api.md)
- [SDK 接入指南](./docs/sdk-integration.md)
- [部署说明](./docs/deployment.md)
- [多 Agent 协作流程](./docs/agent-workflow.md)
- [Agent 角色规范](./AGENTS.md)

## 分支策略

每步功能在独立 `feat/*` 分支开发，测试通过后合并 `main`：

| 分支 | 内容 |
|------|------|
| `feat/01-scaffold` | Monorepo 脚手架 |
| `feat/02-sdk-core` | SDK 核心与传输层 |
| `feat/03-error-plugin` | 错误采集 |
| `feat/04-performance` | 性能监控 |
| `feat/05-rrweb` | 会话回放 |
| `feat/06-server` | NestJS 后端 |
| `feat/07-dashboard` | Vue 管理后台 |
| `feat/08-demo-e2e` | 演示站与 E2E |

## License

MIT
