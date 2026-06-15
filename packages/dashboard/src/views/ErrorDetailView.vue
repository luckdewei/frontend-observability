<template>
  <div v-loading="eventsStore.loading" class="error-detail">
    <el-page-header @back="goBack">
      <template #content>
        <span class="page-title">错误详情</span>
      </template>
    </el-page-header>

    <template v-if="event">
      <el-row :gutter="16" class="info-row">
        <el-col :span="16">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <span>错误信息</span>
                <el-tag type="danger">{{ payload.type ?? 'Error' }}</el-tag>
              </div>
            </template>

            <el-descriptions :column="2" border>
              <el-descriptions-item label="错误消息" :span="2">
                <span class="error-text">{{ payload.message ?? '未知错误' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="项目">
                {{ event.project?.name ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="发生时间">
                {{ formatTime(event.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="文件名">
                {{ payload.filename ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="位置">
                {{ payload.lineno ? `第 ${payload.lineno} 行, 第 ${payload.colno ?? 0} 列` : '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="页面 URL" :span="2">
                <el-link v-if="event.url" :href="event.url" target="_blank" type="primary">
                  {{ event.url }}
                </el-link>
                <span v-else>-</span>
              </el-descriptions-item>
              <el-descriptions-item label="会话 ID">
                {{ event.sessionId ?? '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="用户 ID">
                {{ event.userId ?? '-' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <el-card shadow="never" class="stack-card">
            <template #header>
              <span>堆栈跟踪</span>
            </template>
            <pre v-if="payload.stack" class="stack-trace">{{ payload.stack }}</pre>
            <el-empty v-else description="无堆栈信息" :image-size="80" />
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never" class="breadcrumb-card">
            <template #header>
              <div class="card-header">
                <span>面包屑时间线</span>
                <el-tag size="small">{{ eventsStore.breadcrumbs.length }} 条</el-tag>
              </div>
            </template>

            <el-timeline v-if="eventsStore.breadcrumbs.length > 0">
              <el-timeline-item
                v-for="(crumb, index) in eventsStore.breadcrumbs"
                :key="index"
                :type="getTimelineType(crumb.level)"
                :timestamp="formatCrumbTime(crumb.timestamp)"
                placement="top"
              >
                <div class="crumb-item">
                  <el-tag size="small" :type="getCategoryTagType(crumb.category)">
                    {{ getCategoryLabel(crumb.category) }}
                  </el-tag>
                  <p class="crumb-message">{{ crumb.message }}</p>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无面包屑记录" :image-size="80" />
          </el-card>

          <div class="actions">
            <el-button
              v-if="event.sessionId"
              type="primary"
              :loading="replayLoading"
              @click="findReplay"
            >
              查看会话回放
            </el-button>
          </div>
        </el-col>
      </el-row>
    </template>

    <el-empty v-else-if="!eventsStore.loading" description="事件不存在" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useEventsStore } from '@/stores/events';
import type { ErrorPayload } from '@/types';
import client from '@/api/client';

const route = useRoute();
const router = useRouter();
const eventsStore = useEventsStore();
const replayLoading = ref(false);

const event = computed(() => eventsStore.currentEvent);
const payload = computed(() => (event.value?.payload ?? {}) as ErrorPayload);

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN');
}

function formatCrumbTime(timestamp?: number): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('zh-CN');
}

function getTimelineType(level: string): 'primary' | 'success' | 'warning' | 'danger' {
  if (level === 'error') return 'danger';
  if (level === 'warning') return 'warning';
  return 'primary';
}

function getCategoryTagType(category: string): 'primary' | 'success' | 'warning' | 'info' {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'info'> = {
    click: 'primary',
    navigation: 'success',
    xhr: 'warning',
    console: 'info',
    custom: 'info',
  };
  return map[category] ?? 'info';
}

function getCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    click: '点击',
    navigation: '导航',
    xhr: '请求',
    console: '控制台',
    custom: '自定义',
  };
  return map[category] ?? category;
}

function goBack() {
  router.push('/errors');
}

async function findReplay() {
  if (!event.value?.sessionId) return;

  replayLoading.value = true;
  try {
    const { data } = await client.get('/events', {
      params: {
        sessionId: event.value.sessionId,
        type: 'REPLAY',
        page: 1,
        pageSize: 1,
      },
    });

    const replayEvent = data.items?.[0];
    if (replayEvent) {
      router.push(`/replay/${replayEvent.id}`);
    } else {
      ElMessage.warning('未找到该会话的回放记录');
    }
  } catch {
    ElMessage.error('查找回放记录失败');
  } finally {
    replayLoading.value = false;
  }
}

onMounted(async () => {
  const id = route.params.id as string;
  try {
    await eventsStore.fetchEventById(id);
  } catch {
    ElMessage.error(eventsStore.error ?? '加载失败');
  }
});
</script>

<style scoped>
.error-detail {
  min-height: 400px;
}

.page-title {
  font-size: 16px;
  font-weight: 500;
}

.info-row {
  margin-top: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stack-card,
.breadcrumb-card {
  margin-top: 16px;
}

.error-text {
  color: #f56c6c;
  font-weight: 500;
}

.stack-trace {
  margin: 0;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.crumb-item {
  padding: 4px 0;
}

.crumb-message {
  margin: 6px 0 0;
  font-size: 13px;
  color: #606266;
}

.actions {
  margin-top: 16px;
}
</style>
