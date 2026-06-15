import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import {
  createVueErrorHandler,
  getMonitor,
  initMonitor,
} from '@frontend-observability/sdk';
import App from './App.vue';
import HomePage from './views/HomePage.vue';
import AboutPage from './views/AboutPage.vue';

// 初始化监控 SDK，连接本地 ingest 服务
const monitor = initMonitor({
  appKey: 'demo-app-key',
  dsn: 'http://localhost:3000/api/ingest',
  debug: true,
  flushInterval: 2_000,
  performance: {
    webVitals: true,
    longTask: true,
  },
});

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/about', name: 'about', component: AboutPage },
  ],
});

const app = createApp(App);

// 将 Vue 运行时错误接入监控
app.config.errorHandler = createVueErrorHandler(monitor);

app.use(router);
app.mount('#app');

// 供 E2E 测试手动触发 flush
if (import.meta.env.DEV) {
  (window as Window & { __monitor?: typeof monitor }).__monitor = getMonitor();
}
