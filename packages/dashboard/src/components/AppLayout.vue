<template>
  <el-container class="app-layout">
    <el-aside width="220px" class="sidebar">
      <div class="logo">
        <el-icon :size="24"><Monitor /></el-icon>
        <span>可观测性平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#fff"
      >
        <el-menu-item index="/errors">
          <el-icon><Warning /></el-icon>
          <span>错误监控</span>
        </el-menu-item>
        <el-menu-item index="/performance">
          <el-icon><TrendCharts /></el-icon>
          <span>性能分析</span>
        </el-menu-item>
        <el-menu-item index="/projects">
          <el-icon><Folder /></el-icon>
          <span>项目管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <h2>{{ pageTitle }}</h2>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Monitor, Warning, TrendCharts, Folder } from '@element-plus/icons-vue';

const route = useRoute();

const activeMenu = computed(() => {
  if (route.path.startsWith('/errors')) return '/errors';
  if (route.path.startsWith('/performance')) return '/performance';
  if (route.path.startsWith('/projects')) return '/projects';
  return route.path;
});

const pageTitle = computed(() => (route.meta.title as string) ?? '前端可观测性平台');
</script>

<style scoped>
.app-layout {
  height: 100vh;
}

.sidebar {
  background: #001529;
  overflow: hidden;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 60px;
  padding: 0 20px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #ffffff1a;
}

.sidebar :deep(.el-menu) {
  border-right: none;
}

.header {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.header h2 {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.main {
  padding: 20px;
  background: #f0f2f5;
  overflow-y: auto;
}
</style>
