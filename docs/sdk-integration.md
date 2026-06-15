# SDK 接入指南

## 安装

在 Monorepo 内通过 workspace 引用：

```json
{
  "dependencies": {
    "@frontend-observability/sdk": "workspace:*"
  }
}
```

或构建后发布到 npm：

```bash
cd packages/sdk && npm run build
```

## 基础接入

```typescript
import { initMonitor } from '@frontend-observability/sdk';

initMonitor({
  appKey: 'your-app-key',          // 在管理后台创建项目后获取
  dsn: 'http://localhost:3000/api/ingest',
  sampleRate: 1,                    // 采样率 0~1
  flushInterval: 5000,              // 批量上报间隔（毫秒）
  replay: {
    enabled: true,
    bufferSeconds: 30,              // 回放缓冲秒数
  },
  performance: {
    webVitals: true,                // LCP / INP / CLS
    longTask: true,                 // 长任务监控
  },
  privacy: {
    maskAllInputs: true,            // 遮蔽所有输入框
    maskSelectors: ['.sensitive'], // 额外遮蔽选择器
    blockSelectors: ['.no-record'],// 不录制的元素
  },
});
```

## Vue 3 集成

```typescript
// main.ts
import { createApp } from 'vue';
import { initMonitor, createVueErrorHandler } from '@frontend-observability/sdk';
import App from './App.vue';

const monitor = initMonitor({
  appKey: 'demo-app-key',
  dsn: 'http://localhost:3000/api/ingest',
});

const app = createApp(App);

// 挂载 Vue 全局错误处理器
app.config.errorHandler = createVueErrorHandler(monitor);

app.mount('#app');
```

或使用插件方式：

```typescript
import { createVuePlugin } from '@frontend-observability/sdk';

const monitor = initMonitor({ /* ... */ });
app.use(createVuePlugin(monitor));
```

## React 集成

```typescript
// index.tsx
import { initMonitor } from '@frontend-observability/sdk';

initMonitor({
  appKey: 'demo-app-key',
  dsn: 'http://localhost:3000/api/ingest',
});

// React 18+ 错误边界
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const monitor = getMonitor();
    monitor?.capture({
      type: 'error',
      payload: {
        message: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
      },
    });
  }
  // ...
}
```

## 手动上报自定义事件

```typescript
import { getMonitor } from '@frontend-observability/sdk';

const monitor = getMonitor();
monitor?.capture({
  type: 'custom',
  payload: {
    action: 'checkout',
    orderId: '12345',
  },
});
```

## 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `appKey` | string | 必填 | 项目标识，用于鉴权 |
| `dsn` | string | 必填 | 上报地址 |
| `sampleRate` | number | `1` | 采样率，0 为不上报 |
| `flushInterval` | number | `5000` | 批量 flush 间隔（ms） |
| `maxBatchSize` | number | `20` | 单批最大事件数 |
| `replay.enabled` | boolean | `true` | 是否启用回放 |
| `replay.bufferSeconds` | number | `30` | 环形缓冲秒数 |
| `performance.webVitals` | boolean | `true` | Web Vitals 采集 |
| `performance.longTask` | boolean | `true` | 长任务采集 |
| `privacy.maskAllInputs` | boolean | `true` | 遮蔽输入框 |

## 上报数据格式

SDK 通过 `POST /api/ingest` 批量上报，请求头携带 `X-App-Key`。

每条事件包含：

```typescript
{
  type: 'error' | 'performance' | 'replay' | 'breadcrumb',
  sessionId: string,
  url: string,
  userAgent: string,
  timestamp: number,
  payload: Record<string, unknown>,
}
```

## 注意事项

1. **尽早初始化**：在应用入口最顶部调用 `initMonitor`
2. **生产 DSN**：将 `dsn` 指向你的上报服务域名
3. **采样率**：高流量站点建议设置 `sampleRate: 0.1`（10% 采样）
4. **隐私合规**：默认遮蔽输入框，敏感页面可增大 `blockSelectors`
5. **体积控制**：回放数据仅在异常时上报，正常运行不产生回放流量
