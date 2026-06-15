import { createRouter, createWebHistory } from 'vue-router';
import AppLayout from '@/components/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      redirect: '/errors',
      children: [
        {
          path: 'errors',
          name: 'errors',
          component: () => import('@/views/ErrorListView.vue'),
          meta: { title: '错误监控' },
        },
        {
          path: 'errors/:id',
          name: 'error-detail',
          component: () => import('@/views/ErrorDetailView.vue'),
          meta: { title: '错误详情' },
        },
        {
          path: 'performance',
          name: 'performance',
          component: () => import('@/views/PerformanceView.vue'),
          meta: { title: '性能分析' },
        },
        {
          path: 'projects',
          name: 'projects',
          component: () => import('@/views/ProjectsView.vue'),
          meta: { title: '项目管理' },
        },
        {
          path: 'replay/:id',
          name: 'replay',
          component: () => import('@/views/ReplayView.vue'),
          meta: { title: '会话回放' },
        },
      ],
    },
  ],
});

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? '前端可观测性平台';
  document.title = `${title} - 前端可观测性平台`;
});

export default router;
