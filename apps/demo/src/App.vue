<script setup lang="ts">
import { useRouter } from 'vue-router';
import { getMonitor } from '@frontend-observability/sdk';

const router = useRouter();

/** 主动抛出 JS 运行时错误，测试 error 插件采集 */
function throwJsError() {
  throw new Error('Demo: 主动抛出的 JS 错误');
}

/** 触发未处理的 Promise 拒绝 */
function triggerPromiseRejection() {
  void Promise.reject(new Error('Demo: 未处理的 Promise 拒绝'));
}

/** 模拟慢请求，用于触发性能/面包屑相关采集 */
async function simulateSlowRequest() {
  const monitor = getMonitor();
  const start = performance.now();

  monitor.addBreadcrumb({
    category: 'xhr',
    level: 'info',
    message: '开始模拟慢请求',
  });

  await new Promise((resolve) => setTimeout(resolve, 1_500));

  monitor.captureEvent('performance', {
    name: 'slow-request',
    value: performance.now() - start,
    detail: { endpoint: '/api/mock-slow' },
  });

  await monitor.flush();
}

/** 路由跳转，测试 navigation 面包屑 */
function navigateToAbout() {
  void router.push('/about');
}

function navigateToHome() {
  void router.push('/');
}
</script>

<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>前端可观测性 Demo</h1>
      <p>点击下方按钮触发各类监控事件，数据将上报至本地 ingest 服务。</p>
    </header>

    <nav class="demo-nav">
      <button type="button" data-testid="nav-home" @click="navigateToHome">首页</button>
      <button type="button" data-testid="nav-about" @click="navigateToAbout">关于页</button>
    </nav>

    <section class="demo-actions">
      <button type="button" data-testid="throw-error" @click="throwJsError">
        抛出 JS 错误
      </button>
      <button type="button" data-testid="promise-rejection" @click="triggerPromiseRejection">
        触发 Promise 拒绝
      </button>
      <button type="button" data-testid="slow-request" @click="simulateSlowRequest">
        模拟慢请求
      </button>
    </section>

    <main class="demo-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.demo-app {
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1f2937;
}

.demo-header h1 {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
}

.demo-header p {
  margin: 0;
  color: #6b7280;
}

.demo-nav,
.demo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

button {
  padding: 0.6rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  cursor: pointer;
}

button:hover {
  background: #f9fafb;
}

.demo-content {
  margin-top: 2rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fafafa;
}
</style>
